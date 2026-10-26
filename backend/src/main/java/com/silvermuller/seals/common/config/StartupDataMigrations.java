package com.silvermuller.seals.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/**
 * One-time, versioned data migrations. This is the ONLY startup path allowed to change or delete existing rows
 * (see docs/startup-data-rules.md).
 *
 * Each migration runs at most once per database. It is recorded in public.app_data_migration together with a
 * checksum of its SQL and skipped on every later start. Never edit or remove a migration once it has shipped:
 * startup fails if an applied migration's SQL changes. To change data again, append a new migration.
 */
@Component
@Order(5)
public class StartupDataMigrations implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupDataMigrations.class);

    /**
     * id: "YYYY-MM-DD-NN-short-name"; description: what it changes and why it is safe.
     * retired: the SQL refers to tables or columns that no longer exist. Databases that already ran it still verify its
     * checksum; a database that never ran it records it as skipped instead of executing it.
     */
    public record Migration(String id, String description, String sql, boolean retired) {
        public Migration(String id, String description, String sql) {
            this(id, description, sql, false);
        }
    }

    /** "Bought-Out Parts " followed by the U+1F6E0 hammer-and-wrench emoji, as UTF-8 bytes. */
    static final String BOUGHT_OUT_PARTS_HEX = "426f756768742d4f757420506172747320f09f9ba0";
    /** The same text after its UTF-8 bytes were mis-read as cp1252 and stored again as UTF-8. */
    static final String GARBLED_BOUGHT_OUT_PARTS_HEX = "426f756768742d4f757420506172747320c3b0c5b8e280bac2a0";

    /** Every column that stores a category by name (categories have no ID references or foreign keys). */
    static final List<String> CATEGORY_NAME_COLUMNS = List.of(
            "item_master.category", "item_master.group_name", "item_master.subgroup", "master.category",
            "opening_balance.category_name", "inventory_transaction.category", "job_work_stock_ledger.category",
            "goods_receipt_note_items.category", "purchase_requisition_items.category", "rfq_items.category",
            "vendor_quotation_items.category", "job_work_adjustments.category", "job_work_challan_lines.category",
            "job_work_indent_lines.category", "job_work_loss_policy.category", "job_work_order_lines.category",
            "job_work_receipt_lines.category", "job_work_rate_contracts.item_category", "machine_master.category",
            "department_master.category", "asset_master.asset_category", "capital_po_lines.asset_category",
            "service_purchase_orders.service_category", "item_group.name", "item_subgroup.name");

    public static final List<Migration> MIGRATIONS = List.of(
            new Migration("2026-10-24-03-normalize-machine-numbers",
                    "Rewrites machine numbers such as 'm/c-5' to the standard 'M/C -5' format, only where the value actually changes. "
                            + "Previously ran on every start from DataInitializer; the machine master screen now produces this format itself.",
                    "UPDATE public.machine_master SET machine_no = REGEXP_REPLACE(machine_no, '(?i)m/c\\s*-?\\s*', 'M/C -') "
                            + "WHERE machine_no ~* 'm/c' AND machine_no <> REGEXP_REPLACE(machine_no, '(?i)m/c\\s*-?\\s*', 'M/C -')"),
            new Migration("2026-10-24-04-remove-garbled-bought-out-parts-category",
                    "Deletes the duplicate category 'Bought-Out Parts' whose emoji was stored garbled (UTF-8 bytes "
                            + GARBLED_BOUGHT_OUT_PARTS_HEX + ") because Windows read seed SQL as cp1252. Identified by exact bytes. "
                            + "Deletes it only if the correctly encoded category exists and no record uses the garbled name in any category column.",
                    "DELETE FROM public.category_master bad "
                            + "WHERE convert_to(bad.category_name, 'UTF8') = decode('" + GARBLED_BOUGHT_OUT_PARTS_HEX + "', 'hex') "
                            + "AND EXISTS (SELECT 1 FROM public.category_master good "
                            + "WHERE convert_to(good.category_name, 'UTF8') = decode('" + BOUGHT_OUT_PARTS_HEX + "', 'hex')) "
                            + notUsedAnywhere("bad.category_name"),
                    true), // retired: reads master, opening_balance and inventory_transaction, which were removed
            new Migration("2026-10-25-05-normalize-item-grouping",
                    "Populated item_group_id and item_subgroup_id from the group_name and subgroup text. "
                            + "Retired: those columns were removed again by 2026-10-25-06.",
                    "UPDATE public.item_master i SET item_group_id = g.id FROM public.item_group g "
                            + "WHERE i.group_name = g.name AND i.item_group_id IS NULL; "
                            + "UPDATE public.item_master i SET item_subgroup_id = s.id FROM public.item_subgroup s "
                            + "WHERE i.subgroup = s.name AND i.item_subgroup_id IS NULL",
                    true),
            new Migration("2026-10-25-06-repoint-job-work-to-item-master",
                    "Brings databases created before the master -> item_master consolidation in line with schema.sql. "
                            + "(1) Drops item_master.item_group_id / item_subgroup_id: nothing read them, FG items (no FG group) "
                            + "could never be linked, subgroups were matched by name across groups, and the foreign keys "
                            + "blocked deleting a group. group_name / subgroup text stays the item's grouping. "
                            + "(2) Renames job-work master_id columns to item_master_id and points their foreign keys at "
                            + "item_master instead of the old master table; stops if any row holds an id that is not an "
                            + "item_master id, so no row is silently re-linked to a different item. "
                            + "(3) Drops job-work foreign keys to the removed inventory_transaction table.",
                    """
                    DO $$
                    DECLARE
                      t text;
                      c record;
                      bad bigint;
                    BEGIN
                      ALTER TABLE public.item_master DROP COLUMN IF EXISTS item_subgroup_id;
                      ALTER TABLE public.item_master DROP COLUMN IF EXISTS item_group_id;

                      FOREACH t IN ARRAY ARRAY['job_work_indent_lines', 'job_work_order_lines', 'job_work_challan_lines',
                                               'job_work_receipt_lines', 'job_work_stock_ledger', 'job_work_adjustments'] LOOP
                        IF EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_schema = 'public' AND table_name = t AND column_name = 'master_id') THEN
                          EXECUTE format('ALTER TABLE public.%I RENAME COLUMN master_id TO item_master_id', t);
                        END IF;

                        FOR c IN SELECT con.conname FROM pg_constraint con
                                 JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
                                 WHERE con.conrelid = format('public.%I', t)::regclass AND con.contype = 'f'
                                   AND a.attname = 'item_master_id' AND con.confrelid <> 'public.item_master'::regclass LOOP
                          EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c.conname);
                        END LOOP;

                        EXECUTE format('SELECT COUNT(*) FROM public.%I x WHERE NOT EXISTS '
                                       '(SELECT 1 FROM public.item_master im WHERE im.id = x.item_master_id)', t) INTO bad;
                        IF bad > 0 THEN
                          RAISE EXCEPTION '% row(s) in public.% hold an item id that is not in item_master (old master ids). '
                                          'Map them to item_master ids by hand, then restart.', bad, t;
                        END IF;

                        IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                                       JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
                                       WHERE con.conrelid = format('public.%I', t)::regclass AND con.contype = 'f'
                                         AND a.attname = 'item_master_id') THEN
                          EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (item_master_id) '
                                         'REFERENCES public.item_master(id)', t, t || '_item_master_id_fkey');
                        END IF;
                      END LOOP;

                      FOR c IN SELECT con.conrelid::regclass AS tbl, con.conname FROM pg_constraint con
                               WHERE con.contype = 'f' AND con.confrelid = to_regclass('public.inventory_transaction')
                                 AND con.conrelid::regclass::text LIKE 'job_work%' LOOP
                        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
                      END LOOP;
                    END $$"""),
            new Migration("2026-10-25-07-drop-removed-feature-tables",
                    "Drops the tables of removed features: master and department (replaced by item_master and "
                            + "department_master), inventory_transaction, transaction_type, opening_balance and companies, "
                            + "plus their app_seed_registry keys. Nothing reads them; after 2026-10-25-06 no other table "
                            + "references them. No CASCADE, so an unexpected dependency stops startup instead of being dropped.",
                    """
                    DO $$
                    BEGIN
                      DROP TABLE IF EXISTS public.inventory_transaction, public.opening_balance, public.transaction_type,
                                           public.master, public.department, public.companies;
                      DELETE FROM public.app_seed_registry
                      WHERE split_part(seed_key, ':', 1) IN ('master', 'department', 'transaction_type', 'opening_balance', 'companies');
                    END $$""")
    );

    private static String notUsedAnywhere(String nameExpr) {
        StringBuilder sql = new StringBuilder();
        for (String column : CATEGORY_NAME_COLUMNS) {
            String[] tc = column.split("\\.");
            sql.append("AND NOT EXISTS (SELECT 1 FROM public.").append(tc[0]).append(" x WHERE x.").append(tc[1])
                    .append(" = ").append(nameExpr).append(") ");
        }
        return sql.toString().trim();
    }

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;

    public StartupDataMigrations(JdbcTemplate jdbc, PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.tx = new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(ApplicationArguments args) {
        applyPending();
    }

    /** Applies every migration not yet recorded for this database. Returns how many were applied now. */
    public int applyPending() {
        int applied = 0;
        for (Migration m : MIGRATIONS) {
            if (applyOnce(m)) {
                applied++;
            }
        }
        return applied;
    }

    private boolean applyOnce(Migration m) {
        String checksum = checksum(m.sql());
        Boolean ran = tx.execute(status -> {
            // Serialises concurrent instances; the second one sees the row and skips.
            jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtext(?))", Object.class, m.id());
            List<String> stored = jdbc.queryForList(
                    "SELECT checksum FROM public.app_data_migration WHERE migration_id = ?", String.class, m.id());
            if (!stored.isEmpty()) {
                if (!stored.get(0).equals(checksum)) {
                    throw new IllegalStateException("Data migration " + m.id() + " was edited after it was applied. "
                            + "Applied migrations must never change; add a new migration instead.");
                }
                return false;
            }
            if (m.retired()) {
                jdbc.update("INSERT INTO public.app_data_migration (migration_id, description, checksum, rows_affected) "
                        + "VALUES (?, ?, ?, 0)", m.id(), "[skipped: retired before it ran here] " + m.description(), checksum);
                log.info("Recorded retired data migration {} as skipped.", m.id());
                return true;
            }
            int rows = jdbc.update(m.sql());
            jdbc.update("INSERT INTO public.app_data_migration (migration_id, description, checksum, rows_affected) "
                    + "VALUES (?, ?, ?, ?)", m.id(), m.description(), checksum, rows);
            log.info("Applied data migration {} ({} rows).", m.id(), rows);
            return true;
        });
        return Boolean.TRUE.equals(ran);
    }

    static String checksum(String sql) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(sql.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
