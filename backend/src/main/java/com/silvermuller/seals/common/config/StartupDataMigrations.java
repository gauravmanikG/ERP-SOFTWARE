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
                    END $$"""),
            new Migration("2026-10-29-08-job-work-indent-optional-source-store",
                    "Makes job_work_indents.source_department_id nullable: the source store is chosen on the job work order, "
                            + "not on the indent. Schema-only change to an existing column; no rows are read or changed. "
                            + "Safe to re-run on an already nullable column, and fresh databases already create it nullable.",
                    "ALTER TABLE public.job_work_indents ALTER COLUMN source_department_id DROP NOT NULL"),
            new Migration("2026-10-29-09-job-work-line-received-includes-rework-and-write-off",
                    "Brings job_work_order_lines.ck_jwo_line_received to the definition in schema.sql: received + unused returned "
                            + "+ written off <= dispatched + re-dispatched rework. schema.sql used to drop and re-add it on every "
                            + "start, locking the table each time. Replaces it only if it does not already cover rework and "
                            + "write-offs; no rows are changed. If an existing row breaks the rule, startup stops instead of "
                            + "dropping the check.",
                    """
                    DO $$
                    BEGIN
                      IF NOT EXISTS (SELECT 1 FROM pg_constraint
                                     WHERE conrelid = 'public.job_work_order_lines'::regclass
                                       AND conname = 'ck_jwo_line_received'
                                       AND pg_get_constraintdef(oid) LIKE '%written_off_qty%'
                                       AND pg_get_constraintdef(oid) LIKE '%rework_redispatched_qty%') THEN
                        ALTER TABLE public.job_work_order_lines DROP CONSTRAINT IF EXISTS ck_jwo_line_received;
                        ALTER TABLE public.job_work_order_lines ADD CONSTRAINT ck_jwo_line_received
                          CHECK (received_qty >= 0 AND unused_returned_qty >= 0 AND written_off_qty >= 0
                                 AND received_qty + unused_returned_qty + written_off_qty <= dispatched_qty + rework_redispatched_qty);
                      END IF;
                    END $$"""),
            new Migration("2026-10-31-10-purchase-order-items-from-details-json",
                    "Gives every PO line a row in purchase_order_items so other tables can reference it with a foreign key. "
                            + "Creates item_master_id_for_code (the item resolution rule: part number first, then old code, then "
                            + "lowest id), purchase_order_lines (reads one PO's details_json, one row per item code) and the "
                            + "trigger trg_purchase_order_items_sync, which keeps purchase_order_items identical to details_json "
                            + "on every insert or details_json update by any PO screen. Then fills the table from the existing "
                            + "POs. purchase_orders itself is not changed.",
                    """
                    DO $$
                    BEGIN
                      CREATE OR REPLACE FUNCTION public.item_master_id_for_code(code TEXT) RETURNS BIGINT
                      LANGUAGE sql STABLE AS $fn$
                        SELECT im.id FROM public.item_master im
                        WHERE im.sms_new_part_no = code OR im.old_code = code
                        ORDER BY (im.sms_new_part_no IS NOT DISTINCT FROM code) DESC, im.id
                        LIMIT 1
                      $fn$;

                      CREATE OR REPLACE FUNCTION public.purchase_order_lines(details TEXT)
                      RETURNS TABLE (line_no INT, item_code VARCHAR, item_id_hint BIGINT, item_name TEXT, uom VARCHAR,
                                     hsn_code VARCHAR, quantity NUMERIC, unit_rate NUMERIC, taxable_amount NUMERIC,
                                     tax_amount NUMERIC, line_total NUMERIC)
                      LANGUAGE sql IMMUTABLE AS $fn$
                        SELECT MIN(e.ord)::INT,
                               TRIM(e.v->>'itemCode')::VARCHAR,
                               MAX(CASE WHEN e.v->>'itemId' ~ '^[0-9]+$' THEN (e.v->>'itemId')::BIGINT END),
                               MAX(e.v->>'itemName'),
                               MAX(e.v->>'uom')::VARCHAR,
                               MAX(e.v->>'hsnCode')::VARCHAR,
                               COALESCE(SUM(NULLIF(e.v->>'quantity', '')::NUMERIC), 0),
                               MAX(NULLIF(e.v->>'unitRate', '')::NUMERIC),
                               SUM(NULLIF(e.v->>'taxableAmount', '')::NUMERIC),
                               SUM(NULLIF(e.v->>'taxAmount', '')::NUMERIC),
                               SUM(NULLIF(e.v->>'itemTotal', '')::NUMERIC)
                        FROM jsonb_array_elements(CASE WHEN details IS JSON ARRAY THEN details::jsonb ELSE '[]'::jsonb END)
                             WITH ORDINALITY AS e(v, ord)
                        WHERE NULLIF(TRIM(e.v->>'itemCode'), '') IS NOT NULL
                        GROUP BY TRIM(e.v->>'itemCode')
                      $fn$;

                      CREATE OR REPLACE FUNCTION public.sync_purchase_order_items() RETURNS trigger
                      LANGUAGE plpgsql AS $fn$
                      BEGIN
                        -- A line that left the PO is removed; a GRN line or PR allocation still pointing at it stops the change.
                        DELETE FROM public.purchase_order_items poi
                        WHERE poi.po_number = NEW.po_number
                          AND NOT EXISTS (SELECT 1 FROM public.purchase_order_lines(NEW.details_json) l WHERE l.item_code = poi.item_code);
                        INSERT INTO public.purchase_order_items (po_number, line_no, item_code, item_id, item_name, uom, hsn_code,
                                                                 quantity, unit_rate, taxable_amount, tax_amount, line_total)
                        SELECT NEW.po_number, l.line_no, l.item_code,
                               COALESCE((SELECT im.id FROM public.item_master im WHERE im.id = l.item_id_hint),
                                        public.item_master_id_for_code(l.item_code)),
                               l.item_name, l.uom, l.hsn_code, l.quantity, l.unit_rate, l.taxable_amount, l.tax_amount, l.line_total
                        FROM public.purchase_order_lines(NEW.details_json) l
                        ON CONFLICT (po_number, item_code) DO UPDATE SET
                          line_no = EXCLUDED.line_no, item_id = EXCLUDED.item_id, item_name = EXCLUDED.item_name,
                          uom = EXCLUDED.uom, hsn_code = EXCLUDED.hsn_code, quantity = EXCLUDED.quantity,
                          unit_rate = EXCLUDED.unit_rate, taxable_amount = EXCLUDED.taxable_amount,
                          tax_amount = EXCLUDED.tax_amount, line_total = EXCLUDED.line_total;
                        RETURN NULL;
                      END
                      $fn$;

                      CREATE OR REPLACE TRIGGER trg_purchase_order_items_sync
                        AFTER INSERT OR UPDATE OF details_json ON public.purchase_orders
                        FOR EACH ROW EXECUTE FUNCTION public.sync_purchase_order_items();

                      INSERT INTO public.purchase_order_items (po_number, line_no, item_code, item_id, item_name, uom, hsn_code,
                                                               quantity, unit_rate, taxable_amount, tax_amount, line_total)
                      SELECT p.po_number, l.line_no, l.item_code,
                             COALESCE((SELECT im.id FROM public.item_master im WHERE im.id = l.item_id_hint),
                                      public.item_master_id_for_code(l.item_code)),
                             l.item_name, l.uom, l.hsn_code, l.quantity, l.unit_rate, l.taxable_amount, l.tax_amount, l.line_total
                      FROM public.purchase_orders p CROSS JOIN LATERAL public.purchase_order_lines(p.details_json) l
                      ON CONFLICT (po_number, item_code) DO NOTHING;
                    END $$"""),
            new Migration("2026-10-31-11-purchase-foreign-keys",
                    "Adds the foreign keys the purchase tables were missing: GRN lines, PR allocations and delivery lots to "
                            + "their PO line; GRN headers, PO revisions, payment milestones, validity history and PO terms to "
                            + "the PO; PO term codes to their masters; quotation and RFQ links to vendors, PRs, PR lines, items "
                            + "and parent quotation; PO header to vendor, PR and source quotation. Each key is added only when "
                            + "every existing row matches; otherwise startup stops and names the table. Two exceptions, for "
                            + "POs made before the Vendor Master and PR checks existed: purchase_orders.vendor_code and "
                            + "pr_number are added NOT VALID when old rows do not match, so new and changed rows are still "
                            + "checked and the old rows are reported. Dead source_quotation_id values (0, or a quotation that "
                            + "no longer exists) are cleared first; source_quotation_number is kept.",
                    """
                    DO $$
                    DECLARE
                      fk RECORD;
                      bad BIGINT;
                    BEGIN
                      UPDATE public.purchase_orders p SET source_quotation_id = NULL
                      WHERE p.source_quotation_id IS NOT NULL
                        AND NOT EXISTS (SELECT 1 FROM public.vendor_quotations q WHERE q.id = p.source_quotation_id);

                      FOR fk IN SELECT * FROM (VALUES
                        ('goods_receipt_note_items', 'fk_grn_items_po_line',
                         '(po_number, item_code) REFERENCES public.purchase_order_items(po_number, item_code)',
                         'x.po_number IS NOT NULL AND x.item_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.purchase_order_items p WHERE p.po_number = x.po_number AND p.item_code = x.item_code)', FALSE),
                        ('po_pr_allocations', 'fk_po_pr_alloc_po_line',
                         '(po_number, item_code) REFERENCES public.purchase_order_items(po_number, item_code)',
                         'NOT EXISTS (SELECT 1 FROM public.purchase_order_items p WHERE p.po_number = x.po_number AND p.item_code = x.item_code)', FALSE),
                        ('purchase_order_delivery_schedules', 'fk_po_sched_po_line',
                         '(po_number, item_code) REFERENCES public.purchase_order_items(po_number, item_code) ON DELETE CASCADE',
                         'NOT EXISTS (SELECT 1 FROM public.purchase_order_items p WHERE p.po_number = x.po_number AND p.item_code = x.item_code)', FALSE),
                        ('goods_receipt_notes', 'fk_grn_po',
                         '(po_number) REFERENCES public.purchase_orders(po_number)',
                         'NOT EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.po_number = x.po_number)', FALSE),
                        ('po_revisions', 'fk_po_revisions_po',
                         '(po_number) REFERENCES public.purchase_orders(po_number) ON DELETE CASCADE',
                         'NOT EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.po_number = x.po_number)', FALSE),
                        ('purchase_order_payment_milestones', 'fk_po_milestones_po',
                         '(po_number) REFERENCES public.purchase_orders(po_number) ON DELETE CASCADE',
                         'NOT EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.po_number = x.po_number)', FALSE),
                        ('purchase_order_validity_history', 'fk_po_validity_hist_po',
                         '(po_number) REFERENCES public.purchase_orders(po_number) ON DELETE CASCADE',
                         'NOT EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.po_number = x.po_number)', FALSE),
                        ('purchase_order_terms', 'fk_po_terms_po',
                         '(po_number) REFERENCES public.purchase_orders(po_number) ON DELETE CASCADE',
                         'NOT EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.po_number = x.po_number)', FALSE),
                        ('purchase_order_terms', 'fk_po_terms_mode_of_payment',
                         '(mode_of_payment_code) REFERENCES public.master_mode_of_payment(code)',
                         'x.mode_of_payment_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.master_mode_of_payment m WHERE m.code = x.mode_of_payment_code)', FALSE),
                        ('purchase_order_terms', 'fk_po_terms_payment_terms',
                         '(payment_terms_code) REFERENCES public.master_payment_terms(code)',
                         'x.payment_terms_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.master_payment_terms m WHERE m.code = x.payment_terms_code)', FALSE),
                        ('purchase_order_terms', 'fk_po_terms_credit_basis',
                         '(credit_period_basis_code) REFERENCES public.master_credit_period_basis(code)',
                         'x.credit_period_basis_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.master_credit_period_basis m WHERE m.code = x.credit_period_basis_code)', FALSE),
                        ('purchase_order_terms', 'fk_po_terms_freight',
                         '(freight_option_code) REFERENCES public.master_freight_options(code)',
                         'x.freight_option_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.master_freight_options m WHERE m.code = x.freight_option_code)', FALSE),
                        ('vendor_quotations', 'fk_vquot_vendor_id',
                         '(vendor_id) REFERENCES public.supplier_master(id)',
                         'x.vendor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.supplier_master s WHERE s.id = x.vendor_id)', FALSE),
                        ('vendor_quotations', 'fk_vquot_vendor_code',
                         '(vendor_code) REFERENCES public.supplier_master(supplier_code)',
                         'x.vendor_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.supplier_master s WHERE s.supplier_code = x.vendor_code)', FALSE),
                        ('vendor_quotations', 'fk_vquot_pr',
                         '(pr_id) REFERENCES public.purchase_requisitions(id)',
                         'x.pr_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.purchase_requisitions r WHERE r.id = x.pr_id)', FALSE),
                        ('vendor_quotations', 'fk_vquot_parent',
                         '(parent_quotation_id) REFERENCES public.vendor_quotations(id) ON DELETE SET NULL',
                         'x.parent_quotation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vendor_quotations q WHERE q.id = x.parent_quotation_id)', FALSE),
                        ('vendor_quotation_items', 'fk_vquot_items_pr_item',
                         '(pr_item_id) REFERENCES public.purchase_requisition_items(id) ON DELETE SET NULL',
                         'x.pr_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.purchase_requisition_items r WHERE r.id = x.pr_item_id)', FALSE),
                        ('vendor_quotation_items', 'fk_vquot_items_item',
                         '(item_id) REFERENCES public.item_master(id)',
                         'x.item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.item_master i WHERE i.id = x.item_id)', FALSE),
                        ('rfq_headers', 'fk_rfq_pr',
                         '(pr_number) REFERENCES public.purchase_requisitions(pr_number)',
                         'x.pr_number IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.purchase_requisitions r WHERE r.pr_number = x.pr_number)', FALSE),
                        ('rfq_items', 'fk_rfq_items_pr',
                         '(pr_number) REFERENCES public.purchase_requisitions(pr_number)',
                         'x.pr_number IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.purchase_requisitions r WHERE r.pr_number = x.pr_number)', FALSE),
                        ('purchase_orders', 'fk_po_source_quotation',
                         '(source_quotation_id) REFERENCES public.vendor_quotations(id) ON DELETE SET NULL',
                         'x.source_quotation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vendor_quotations q WHERE q.id = x.source_quotation_id)', FALSE),
                        ('purchase_orders', 'fk_po_vendor',
                         '(vendor_code) REFERENCES public.supplier_master(supplier_code)',
                         'x.vendor_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.supplier_master s WHERE s.supplier_code = x.vendor_code)', TRUE),
                        ('purchase_orders', 'fk_po_pr',
                         '(pr_number) REFERENCES public.purchase_requisitions(pr_number)',
                         'x.pr_number IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.purchase_requisitions r WHERE r.pr_number = x.pr_number)', TRUE)
                      ) AS t(tbl, name, def, orphan, old_rows_allowed) LOOP
                        CONTINUE WHEN EXISTS (SELECT 1 FROM pg_constraint
                                              WHERE conname = fk.name AND conrelid = format('public.%I', fk.tbl)::regclass);
                        EXECUTE format('SELECT COUNT(*) FROM public.%I x WHERE %s', fk.tbl, fk.orphan) INTO bad;
                        IF bad = 0 THEN
                          EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY %s', fk.tbl, fk.name, fk.def);
                        ELSIF fk.old_rows_allowed THEN
                          EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY %s NOT VALID', fk.tbl, fk.name, fk.def);
                          RAISE WARNING '% older row(s) in public.% do not match foreign key %; it checks new and changed rows only.',
                                        bad, fk.tbl, fk.name;
                        ELSE
                          RAISE EXCEPTION '% row(s) in public.% would break foreign key % (%). Correct them, then restart.',
                                          bad, fk.tbl, fk.name, fk.def;
                        END IF;
                      END LOOP;
                    END $$"""),
            new Migration("2026-10-31-12-pr-item-and-department-ids",
                    "Fills the new purchase_requisition_items.item_id and purchase_requisitions.department_id on existing PRs, "
                            + "which until now linked to the Item Master and Department Master by text only. item_id uses the "
                            + "rule the PR form and PO by PR already applied (item_master_id_for_code). department_id matches the "
                            + "exact department name; two older PR names are matched to their master entry: 'ERP' to "
                            + "'ERP Department' and 'Maintenance' to 'Maintainance' (spelling in the master), only when no "
                            + "department has the exact name. Only NULL ids are filled; the stored item code and department name "
                            + "are not changed. Lines and PRs with no match keep NULL.",
                    """
                    DO $$
                    BEGIN
                      UPDATE public.purchase_requisition_items pri SET item_id = public.item_master_id_for_code(pri.item_code)
                      WHERE pri.item_id IS NULL AND public.item_master_id_for_code(pri.item_code) IS NOT NULL;

                      UPDATE public.purchase_requisitions pr SET department_id = COALESCE(
                          (SELECT d.id FROM public.department_master d WHERE d.department_name = TRIM(pr.department)),
                          (SELECT d.id FROM public.department_master d
                           WHERE d.department_name = CASE TRIM(pr.department) WHEN 'ERP' THEN 'ERP Department'
                                                                               WHEN 'Maintenance' THEN 'Maintainance' END))
                      WHERE pr.department_id IS NULL AND pr.department IS NOT NULL;
                    END $$"""),
            new Migration("2026-10-31-13-unique-department-codes",
                    "Makes department_master.dept_code unique. The Department Master gave a new department the code "
                            + "DPT-<count + 1>, which repeats an existing code after a delete (four codes were each held by two "
                            + "departments). For each repeated code the oldest department keeps it and every later one gets the "
                            + "next unused DPT-NNN number. Stops instead if a Capital PO, Service PO or asset references a code "
                            + "that would be renumbered, so no document is re-linked to another department.",
                    """
                    DO $$
                    DECLARE
                      r RECORD;
                      next_no INT;
                    BEGIN
                      SELECT COALESCE(MAX(CAST(SUBSTRING(dept_code FROM '^DPT-([0-9]+)$') AS INT)), 0) INTO next_no
                      FROM public.department_master;
                      FOR r IN SELECT d.id, d.dept_code, d.department_name FROM public.department_master d
                               WHERE EXISTS (SELECT 1 FROM public.department_master o WHERE o.dept_code = d.dept_code AND o.id < d.id)
                               ORDER BY d.id LOOP
                        IF EXISTS (SELECT 1 FROM public.capital_purchase_orders WHERE department_code = r.dept_code)
                           OR EXISTS (SELECT 1 FROM public.service_purchase_orders WHERE department_code = r.dept_code)
                           OR EXISTS (SELECT 1 FROM public.asset_master WHERE department_code = r.dept_code) THEN
                          RAISE EXCEPTION 'Department code % is used by two departments and by Capital/Service POs or assets. '
                                          'Decide which department those documents belong to, then restart.', r.dept_code;
                        END IF;
                        next_no := next_no + 1;
                        UPDATE public.department_master SET dept_code = 'DPT-' || LPAD(next_no::TEXT, 3, '0') WHERE id = r.id;
                        RAISE NOTICE 'Department % changed from code % to DPT-%', r.department_name, r.dept_code, LPAD(next_no::TEXT, 3, '0');
                      END LOOP;
                      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_department_master_dept_code') THEN
                        ALTER TABLE public.department_master ADD CONSTRAINT uq_department_master_dept_code UNIQUE (dept_code);
                      END IF;
                    END $$"""),
            new Migration("2026-10-31-14-link-older-pos-to-pr-lines",
                    "Links POs raised before PO by PR existed to the PR lines they ordered, so ordered_qty on every PR line "
                            + "equals its PO allocations and receipts of those POs count against the PR. Marks such POs "
                            + "po_origin = 'LEGACY'. For each open older PO line, oldest PO first, it allocates PR quantity that "
                            + "is ordered but on no PO: first PR lines of the PR named on the PO line, then (clubbed or unnamed "
                            + "lines) any PR line of the same item, lowest id first, never more than the PO line or the PR "
                            + "line's untracked quantity. The rows are flagged legacy and have no vendor rate (rate_id may be "
                            + "NULL only on legacy rows). Posted GRNs of these POs are then attributed to the new allocations, "
                            + "oldest allocation first, exactly as GRN posting does. PR quantities, POs and GRNs are not changed.",
                    """
                    DO $$
                    DECLARE
                      pass INT;
                      po_line RECORD;
                      pr_line RECORD;
                      grn_line RECORD;
                      alloc RECORD;
                      left_qty NUMERIC;
                      take NUMERIC;
                      drift BIGINT;
                    BEGIN
                      ALTER TABLE public.po_pr_allocations ALTER COLUMN rate_id DROP NOT NULL;
                      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_po_pr_alloc_rate') THEN
                        ALTER TABLE public.po_pr_allocations ADD CONSTRAINT ck_po_pr_alloc_rate CHECK (legacy OR rate_id IS NOT NULL);
                      END IF;

                      UPDATE public.purchase_orders p SET po_origin = CASE WHEN EXISTS
                          (SELECT 1 FROM public.po_pr_allocations a WHERE a.po_number = p.po_number) THEN 'PO_BY_PR' ELSE 'LEGACY' END
                      WHERE p.po_origin IS NULL;

                      FOR pass IN 1..2 LOOP
                        FOR po_line IN SELECT poi.po_number, poi.item_code, poi.quantity, poi.unit_rate, x.pr_number AS line_pr
                                 FROM public.purchase_orders p
                                 JOIN public.purchase_order_items poi ON poi.po_number = p.po_number
                                 LEFT JOIN LATERAL (
                                   SELECT MAX(TRIM(e->>'prNumber')) AS pr_number
                                   FROM jsonb_array_elements(CASE WHEN p.details_json IS JSON ARRAY THEN p.details_json::jsonb ELSE '[]'::jsonb END) e
                                   WHERE TRIM(e->>'itemCode') = poi.item_code) x ON TRUE
                                 WHERE p.po_origin = 'LEGACY' AND p.status <> 'CANCELLED' AND ROUND(poi.unit_rate, 2) > 0
                                   AND (pass = 1) = EXISTS (SELECT 1 FROM public.purchase_requisitions r WHERE r.pr_number = x.pr_number)
                                 ORDER BY p.created_at, p.po_number, poi.line_no LOOP
                          left_qty := po_line.quantity - COALESCE((SELECT SUM(a.allocated_qty) FROM public.po_pr_allocations a
                                                             WHERE a.po_number = po_line.po_number AND a.item_code = po_line.item_code), 0);
                          FOR pr_line IN SELECT pri.id, pri.pr_number,
                                          pri.ordered_qty - COALESCE((SELECT SUM(a.allocated_qty - a.released_qty)
                                                                      FROM public.po_pr_allocations a WHERE a.pr_item_id = pri.id), 0) AS untracked
                                   FROM public.purchase_requisition_items pri
                                   WHERE pri.item_code = po_line.item_code AND (pass = 2 OR pri.pr_number = po_line.line_pr)
                                     AND NOT EXISTS (SELECT 1 FROM public.po_pr_allocations a
                                                     WHERE a.po_number = po_line.po_number AND a.pr_item_id = pri.id)
                                   ORDER BY pri.id LOOP
                            EXIT WHEN left_qty <= 0;
                            CONTINUE WHEN pr_line.untracked <= 0;
                            take := LEAST(left_qty, pr_line.untracked);
                            INSERT INTO public.po_pr_allocations (po_number, pr_item_id, pr_number, item_code, allocated_qty,
                                                                  unit_price, rate_id, created_by, legacy)
                            VALUES (po_line.po_number, pr_line.id, pr_line.pr_number, po_line.item_code, take, ROUND(po_line.unit_rate, 2), NULL,
                                    'Migration 2026-10-31-14 (older PO)', TRUE);
                            left_qty := left_qty - take;
                          END LOOP;
                        END LOOP;
                      END LOOP;

                      FOR grn_line IN SELECT gi.id, gi.po_number, gi.item_code, gi.accepted_qty
                               FROM public.goods_receipt_note_items gi JOIN public.goods_receipt_notes n ON n.id = gi.grn_id
                               WHERE n.status = 'POSTED' AND gi.accepted_qty > 0
                                 AND EXISTS (SELECT 1 FROM public.po_pr_allocations a
                                             WHERE a.po_number = gi.po_number AND a.item_code = gi.item_code AND a.legacy)
                                 AND NOT EXISTS (SELECT 1 FROM public.grn_item_allocations x WHERE x.grn_item_id = gi.id)
                               ORDER BY n.grn_date, gi.id LOOP
                        left_qty := grn_line.accepted_qty;
                        FOR alloc IN SELECT al.id, al.allocated_qty - al.released_qty - COALESCE((
                                          SELECT SUM(x.accepted_qty) FROM public.grn_item_allocations x
                                          JOIN public.goods_receipt_note_items xi ON xi.id = x.grn_item_id
                                          JOIN public.goods_receipt_notes xn ON xn.id = xi.grn_id
                                          WHERE x.allocation_id = al.id AND xn.status = 'POSTED'), 0) AS open_qty
                                 FROM public.po_pr_allocations al
                                 WHERE al.po_number = grn_line.po_number AND al.item_code = grn_line.item_code ORDER BY al.id LOOP
                          EXIT WHEN left_qty <= 0;
                          CONTINUE WHEN alloc.open_qty <= 0;
                          take := LEAST(left_qty, alloc.open_qty);
                          INSERT INTO public.grn_item_allocations (grn_item_id, allocation_id, received_qty, accepted_qty)
                          VALUES (grn_line.id, alloc.id, take, take);
                          left_qty := left_qty - take;
                        END LOOP;
                      END LOOP;

                      SELECT COUNT(*) INTO drift FROM public.purchase_requisition_items pri
                      WHERE pri.ordered_qty <> COALESCE((SELECT SUM(a.allocated_qty - a.released_qty)
                                                         FROM public.po_pr_allocations a WHERE a.pr_item_id = pri.id), 0);
                      IF drift > 0 THEN
                        RAISE WARNING '% PR line(s) still have ordered_qty different from their PO allocations; see the Exceptions report.', drift;
                      END IF;
                    END $$"""),
            new Migration("2026-10-31-15-drop-unused-po-id-columns",
                    "Drops po_id from purchase_order_delivery_schedules and purchase_order_payment_milestones. No code ever "
                            + "wrote it, and it could not reference a PO: it is BIGINT while purchase_orders.id is VARCHAR. "
                            + "The rows are linked by po_number (and item_code), which now have foreign keys. Stops instead if "
                            + "any row holds a po_id value, so nothing is lost.",
                    """
                    DO $$
                    BEGIN
                      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                                 AND table_name = 'purchase_order_delivery_schedules' AND column_name = 'po_id') THEN
                        IF EXISTS (SELECT 1 FROM public.purchase_order_delivery_schedules WHERE po_id IS NOT NULL) THEN
                          RAISE EXCEPTION 'purchase_order_delivery_schedules.po_id holds values; review them before it is dropped.';
                        END IF;
                        ALTER TABLE public.purchase_order_delivery_schedules DROP COLUMN po_id;
                      END IF;
                      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                                 AND table_name = 'purchase_order_payment_milestones' AND column_name = 'po_id') THEN
                        IF EXISTS (SELECT 1 FROM public.purchase_order_payment_milestones WHERE po_id IS NOT NULL) THEN
                          RAISE EXCEPTION 'purchase_order_payment_milestones.po_id holds values; review them before it is dropped.';
                        END IF;
                        ALTER TABLE public.purchase_order_payment_milestones DROP COLUMN po_id;
                      END IF;
                    END $$"""),
            new Migration("2026-10-31-16-delivery-lots-from-grns-and-quantity-rules",
                    "Recomputes the received quantity of every PO delivery lot from posted GRNs (per item, accepted "
                            + "quantity fills lots in lot order), because lots were only updated by a separate endpoint "
                            + "and several had drifted from their GRNs. Then adds database rules: GRN line quantities "
                            + "cannot be negative, an item appears once per GRN, lot quantities are above zero with "
                            + "received between zero and scheduled, and lot numbers are unique per PO item.",
                    """
                    DO $$
                    BEGIN
                      WITH accepted AS (
                          SELECT gi.po_number, gi.item_code, SUM(gi.accepted_qty) AS qty
                          FROM public.goods_receipt_note_items gi
                          JOIN public.goods_receipt_notes g ON g.id = gi.grn_id
                          WHERE g.status = 'POSTED'
                          GROUP BY gi.po_number, gi.item_code
                      ), filled AS (
                          SELECT s.id, s.scheduled_qty,
                                 LEAST(s.scheduled_qty, GREATEST(0, COALESCE(a.qty, 0) - COALESCE(SUM(s.scheduled_qty) OVER (
                                     PARTITION BY s.po_number, s.item_code ORDER BY s.lot_number, s.id
                                     ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0))) AS received
                          FROM public.purchase_order_delivery_schedules s
                          LEFT JOIN accepted a ON a.po_number = s.po_number AND a.item_code = s.item_code
                      ), target AS (
                          SELECT id, received, scheduled_qty - received AS balance,
                                 CASE WHEN received = 0 THEN 'SCHEDULED'
                                      WHEN received >= scheduled_qty THEN 'COMPLETED'
                                      ELSE 'PARTIALLY_RECEIVED' END AS status
                          FROM filled
                      )
                      UPDATE public.purchase_order_delivery_schedules s
                      SET received_qty = t.received, balance_qty = t.balance, status = t.status, updated_at = NOW()
                      FROM target t
                      WHERE s.id = t.id
                        AND (s.received_qty IS DISTINCT FROM t.received OR s.balance_qty IS DISTINCT FROM t.balance
                             OR s.status IS DISTINCT FROM t.status);

                      UPDATE public.purchase_order_payment_milestones m SET payment_status = 'DUE'
                      WHERE m.payment_status IN ('PENDING', 'UPCOMING')
                        AND EXISTS (SELECT 1 FROM public.purchase_order_delivery_schedules s
                                    WHERE s.po_number = m.po_number AND s.lot_number = m.linked_lot_number AND s.received_qty > 0);

                      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_grn_items_qty_non_negative') THEN
                        ALTER TABLE public.goods_receipt_note_items ADD CONSTRAINT ck_grn_items_qty_non_negative
                          CHECK (challan_qty >= 0 AND received_qty >= 0 AND accepted_qty >= 0 AND rejected_qty >= 0
                                 AND pending_inspection_qty >= 0);
                      END IF;
                      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_grn_items_grn_item') THEN
                        ALTER TABLE public.goods_receipt_note_items ADD CONSTRAINT uq_grn_items_grn_item UNIQUE (grn_id, item_code);
                      END IF;
                      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_po_sched_qty') THEN
                        ALTER TABLE public.purchase_order_delivery_schedules ADD CONSTRAINT ck_po_sched_qty
                          CHECK (scheduled_qty > 0 AND received_qty >= 0 AND received_qty <= scheduled_qty);
                      END IF;
                      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_po_sched_lot') THEN
                        ALTER TABLE public.purchase_order_delivery_schedules ADD CONSTRAINT uq_po_sched_lot
                          UNIQUE (po_number, item_code, lot_number);
                      END IF;
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
