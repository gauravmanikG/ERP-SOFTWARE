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

    /** id: "YYYY-MM-DD-NN-short-name"; description: what it changes and why it is safe. */
    public record Migration(String id, String description, String sql) {}

    /** "Bought-Out Parts " followed by the U+1F6E0 hammer-and-wrench emoji, as UTF-8 bytes. */
    static final String BOUGHT_OUT_PARTS_HEX = "426f756768742d4f757420506172747320f09f9ba0";
    /** The same text after its UTF-8 bytes were mis-read as cp1252 and stored again as UTF-8. */
    static final String GARBLED_BOUGHT_OUT_PARTS_HEX = "426f756768742d4f757420506172747320c3b0c5b8e280bac2a0";

    /** Every column that stores a category by name (categories have no ID references or foreign keys). */
    static final List<String> CATEGORY_NAME_COLUMNS = List.of(
            "item_master.category", "item_master.group_name", "item_master.subgroup", "master.category",
            "job_work_stock_ledger.category",
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
                            + notUsedAnywhere("bad.category_name"))
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
