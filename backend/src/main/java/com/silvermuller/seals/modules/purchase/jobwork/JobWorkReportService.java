package com.silvermuller.seals.modules.purchase.jobwork;

import com.silvermuller.seals.modules.purchase.jobwork.JobWorkService.Actor;
import com.silvermuller.seals.modules.purchase.jobwork.JobWorkService.JobWorkException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * Job work reports. Each report returns its columns and rows, so the screen and the Excel export
 * use the same data. Reports are read-only.
 */
@Service
public class JobWorkReportService {

    private final JdbcTemplate jdbc;

    public JobWorkReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Report catalogue shown on the Reports screen. Invoice register and GST/ITC-04 reports wait for later phases. */
    public List<Map<String, Object>> catalogue() {
        return List.of(
                cat("order-register", "Job Work Order Register", "Orders with quantities and status", true),
                cat("challan-register", "Challan Register", "Every dispatch challan", true),
                cat("challan-pending", "Challan-wise Pending Material", "Material still with the worker, per order line", false),
                cat("material-outside", "Material Outside Factory", "Quantity with each job worker, per item", false),
                cat("ledger", "Job Worker Stock Ledger", "Every movement, per job worker", true),
                cat("receipt-register", "Job Work Receipt Register", "Every receipt", true),
                cat("quality", "Quality Rejection and Rework", "Inspection results per receipt line", true),
                cat("scrap-wastage", "Scrap and Wastage", "Scrap, losses and permissible loss per line", true),
                cat("adjustments", "Reconciliation Adjustments", "Scrap disposals, shortages and process losses", true),
                cat("cost-item-operation", "Job Work Cost by Item and Operation", "Estimated charges grouped by item and operation", true),
                cat("rate-comparison", "Vendor Rate Comparison", "Active rate contracts per operation and category", false),
                cat("turnaround", "Job Worker Turnaround", "Days from challan to receipt", true),
                cat("order-history", "Order Transaction History", "Full trail of one order (enter the order number in Search)", false));
    }

    private static Map<String, Object> cat(String key, String title, String hint, boolean dated) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key); m.put("title", title); m.put("hint", hint); m.put("dated", dated);
        return m;
    }

    public Map<String, Object> run(String name, LocalDate from, LocalDate to, Long workerId, String q, Actor actor) {
        if (actor == null) throw new JobWorkException(HttpStatus.UNAUTHORIZED, "Missing current user.");
        String n = name == null ? "" : name.trim();
        String f = from == null ? "1900-01-01" : from.toString();
        String t = to == null ? "9999-12-31" : to.toString();
        String like = q == null || q.isBlank() ? "%" : "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        Long wid = workerId;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("key", n);
        switch (n) {
            case "order-register" -> {
                cols(out, "Order", "Date", "Job worker", "Status", "Input qty", "Dispatched", "Received", "Accepted", "Rejected", "Est. charges", "Return by", "Overdue");
                rows(out, jdbc.queryForList(
                        "SELECT o.jwo_number AS \"Order\", o.jwo_date AS \"Date\", w.legal_name AS \"Job worker\", o.status AS \"Status\", "
                                + "(SELECT COALESCE(SUM(l.input_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS \"Input qty\", "
                                + "(SELECT COALESCE(SUM(l.dispatched_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS \"Dispatched\", "
                                + "(SELECT COALESCE(SUM(l.received_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS \"Received\", "
                                + "(SELECT COALESCE(SUM(l.accepted_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS \"Accepted\", "
                                + "(SELECT COALESCE(SUM(l.rejected_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS \"Rejected\", "
                                + "o.estimated_charges AS \"Est. charges\", o.expected_return_date AS \"Return by\", "
                                + "(o.expected_return_date < CURRENT_DATE AND o.status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED')) AS \"Overdue\" "
                                + "FROM public.job_work_orders o JOIN public.job_workers w ON w.id = o.job_worker_id "
                                + "WHERE o.jwo_date BETWEEN ?::date AND ?::date AND (CAST(? AS BIGINT) IS NULL OR o.job_worker_id = ?) AND LOWER(o.jwo_number) LIKE ? ORDER BY o.jwo_date DESC",
                        f, t, wid, wid, like));
            }
            case "challan-register" -> {
                cols(out, "Challan", "Date", "Order", "Job worker", "Source", "Dispatched qty", "Transporter", "Vehicle", "E-way bill", "Status");
                rows(out, jdbc.queryForList(
                        "SELECT c.challan_number AS \"Challan\", c.challan_date AS \"Date\", o.jwo_number AS \"Order\", w.legal_name AS \"Job worker\", "
                                + "sd.department_name AS \"Source\", (SELECT COALESCE(SUM(cl.qty),0) FROM public.job_work_challan_lines cl WHERE cl.challan_id = c.id) AS \"Dispatched qty\", "
                                + "c.transporter AS \"Transporter\", c.vehicle_no AS \"Vehicle\", c.eway_bill_no AS \"E-way bill\", c.status AS \"Status\" "
                                + "FROM public.job_work_challans c JOIN public.job_work_orders o ON o.id = c.jwo_id JOIN public.job_workers w ON w.id = c.job_worker_id "
                                + "JOIN public.department_master sd ON sd.id = c.source_department_id "
                                + "WHERE c.challan_date BETWEEN ?::date AND ?::date AND (CAST(? AS BIGINT) IS NULL OR c.job_worker_id = ?) AND LOWER(c.challan_number) LIKE ? ORDER BY c.challan_date DESC",
                        f, t, wid, wid, like));
            }
            case "challan-pending" -> {
                cols(out, "Order", "Line", "Item", "Category", "Job worker", "Dispatched", "Back (processed)", "Unused back", "Written off", "Still with worker", "Return by");
                rows(out, jdbc.queryForList(
                        "SELECT o.jwo_number AS \"Order\", l.line_no AS \"Line\", l.item_code AS \"Item\", l.category AS \"Category\", w.legal_name AS \"Job worker\", "
                                + "(l.dispatched_qty + l.rework_redispatched_qty) AS \"Dispatched\", l.received_qty AS \"Back (processed)\", l.unused_returned_qty AS \"Unused back\", "
                                + "l.written_off_qty AS \"Written off\", (l.dispatched_qty + l.rework_redispatched_qty - l.received_qty - l.unused_returned_qty - l.written_off_qty) AS \"Still with worker\", "
                                + "o.expected_return_date AS \"Return by\" FROM public.job_work_order_lines l JOIN public.job_work_orders o ON o.id = l.jwo_id "
                                + "JOIN public.job_workers w ON w.id = o.job_worker_id "
                                + "WHERE (l.dispatched_qty + l.rework_redispatched_qty - l.received_qty - l.unused_returned_qty - l.written_off_qty) > 0 "
                                + "AND (CAST(? AS BIGINT) IS NULL OR o.job_worker_id = ?) AND LOWER(o.jwo_number) LIKE ? ORDER BY o.expected_return_date NULLS LAST, o.jwo_number, l.line_no",
                        wid, wid, like));
            }
            case "material-outside" -> {
                cols(out, "Job worker", "Item", "Category", "Qty with worker", "Last movement", "Overdue orders");
                rows(out, jdbc.queryForList(
                        "SELECT w.legal_name AS \"Job worker\", m.code AS \"Item\", l.category AS \"Category\", SUM(l.qty) AS \"Qty with worker\", "
                                + "MAX(l.created_at)::date AS \"Last movement\", "
                                + "(SELECT COUNT(DISTINCT o.id) FROM public.job_work_orders o WHERE o.job_worker_id = l.job_worker_id AND o.expected_return_date < CURRENT_DATE "
                                + "AND o.status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED')) AS \"Overdue orders\" "
                                + "FROM public.job_work_stock_ledger l JOIN public.job_workers w ON w.id = l.job_worker_id JOIN public.item_master_lookup m ON m.id = l.item_master_id "
                                + "WHERE (CAST(? AS BIGINT) IS NULL OR l.job_worker_id = ?) AND LOWER(m.code) LIKE ? "
                                + "GROUP BY w.legal_name, m.code, l.category, l.job_worker_id HAVING SUM(l.qty) <> 0 ORDER BY w.legal_name, m.code",
                        wid, wid, like));
            }
            case "ledger" -> {
                cols(out, "When", "Job worker", "Item", "Category", "Movement", "Qty", "Balance with worker", "Reference", "Order");
                rows(out, jdbc.queryForList(
                        "SELECT l.created_at AS \"When\", w.legal_name AS \"Job worker\", m.code AS \"Item\", l.category AS \"Category\", l.movement_type AS \"Movement\", "
                                + "l.qty AS \"Qty\", l.balance_after AS \"Balance with worker\", l.reference_no AS \"Reference\", o.jwo_number AS \"Order\" "
                                + "FROM public.job_work_stock_ledger l JOIN public.job_workers w ON w.id = l.job_worker_id JOIN public.item_master_lookup m ON m.id = l.item_master_id "
                                + "JOIN public.job_work_orders o ON o.id = l.jwo_id "
                                + "WHERE l.created_at::date BETWEEN ?::date AND ?::date AND (CAST(? AS BIGINT) IS NULL OR l.job_worker_id = ?) AND LOWER(l.reference_no) LIKE ? ORDER BY l.created_at DESC LIMIT 2000",
                        f, t, wid, wid, like));
            }
            case "receipt-register" -> {
                cols(out, "Receipt", "Date", "Order", "Job worker", "Challan", "Delivery note", "Processed qty", "Unused qty", "Awaiting inspection", "Received by");
                rows(out, jdbc.queryForList(
                        "SELECT r.receipt_number AS \"Receipt\", r.receipt_date AS \"Date\", o.jwo_number AS \"Order\", w.legal_name AS \"Job worker\", c.challan_number AS \"Challan\", "
                                + "r.delivery_note_no AS \"Delivery note\", (SELECT COALESCE(SUM(rl.qty_received),0) FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id) AS \"Processed qty\", "
                                + "(SELECT COALESCE(SUM(rl.unused_returned_qty),0) FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id) AS \"Unused qty\", "
                                + "(SELECT COUNT(*) FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id AND rl.inspection_status = 'PENDING') AS \"Awaiting inspection\", r.received_by AS \"Received by\" "
                                + "FROM public.job_work_receipts r JOIN public.job_work_orders o ON o.id = r.jwo_id JOIN public.job_workers w ON w.id = r.job_worker_id "
                                + "LEFT JOIN public.job_work_challans c ON c.id = r.challan_id "
                                + "WHERE r.receipt_date BETWEEN ?::date AND ?::date AND (CAST(? AS BIGINT) IS NULL OR r.job_worker_id = ?) AND LOWER(r.receipt_number) LIKE ? ORDER BY r.receipt_date DESC",
                        f, t, wid, wid, like));
            }
            case "quality" -> {
                cols(out, "Receipt", "Receipt date", "Order", "Job worker", "Item", "Received", "Accepted", "Rejected", "Rework", "Scrap", "Defect code", "Inspected by", "Inspected on", "Remarks");
                rows(out, jdbc.queryForList(
                        "SELECT r.receipt_number AS \"Receipt\", r.receipt_date AS \"Receipt date\", o.jwo_number AS \"Order\", w.legal_name AS \"Job worker\", rl.category AS \"Item\", "
                                + "rl.qty_received AS \"Received\", rl.accepted_qty AS \"Accepted\", rl.rejected_qty AS \"Rejected\", rl.rework_qty AS \"Rework\", rl.scrap_qty AS \"Scrap\", "
                                + "rl.defect_code AS \"Defect code\", rl.inspected_by AS \"Inspected by\", rl.inspected_at::date AS \"Inspected on\", rl.inspection_remarks AS \"Remarks\" "
                                + "FROM public.job_work_receipt_lines rl JOIN public.job_work_receipts r ON r.id = rl.receipt_id JOIN public.job_work_orders o ON o.id = r.jwo_id "
                                + "JOIN public.job_workers w ON w.id = r.job_worker_id "
                                + "WHERE rl.inspection_status = 'INSPECTED' AND r.receipt_date BETWEEN ?::date AND ?::date AND (CAST(? AS BIGINT) IS NULL OR r.job_worker_id = ?) AND LOWER(o.jwo_number) LIKE ? "
                                + "ORDER BY r.receipt_date DESC", f, t, wid, wid, like));
            }
            case "scrap-wastage" -> {
                cols(out, "Order", "Line", "Item", "Job worker", "Dispatched", "Scrap recorded", "Scrap disposed", "Process loss (approved)", "Shortage (approved)", "Permissible %", "Allowed loss", "Excess loss");
                List<Map<String, Object>> base = jdbc.queryForList(
                        "SELECT l.id, o.jwo_number AS \"Order\", l.line_no AS \"Line\", l.item_code AS \"Item\", w.legal_name AS \"Job worker\", "
                                + "(l.dispatched_qty + l.rework_redispatched_qty) AS \"Dispatched\", l.scrap_qty AS \"Scrap recorded\", "
                                + "COALESCE((SELECT SUM(a.qty) FROM public.job_work_adjustments a WHERE a.jwo_line_id = l.id AND a.adjustment_type = 'SCRAP_DISPOSAL' AND a.status = 'APPROVED'),0) AS \"Scrap disposed\", "
                                + "COALESCE((SELECT SUM(a.qty) FROM public.job_work_adjustments a WHERE a.jwo_line_id = l.id AND a.adjustment_type = 'PROCESS_LOSS' AND a.status = 'APPROVED'),0) AS \"Process loss (approved)\", "
                                + "COALESCE((SELECT SUM(a.qty) FROM public.job_work_adjustments a WHERE a.jwo_line_id = l.id AND a.adjustment_type = 'SHORTAGE' AND a.status = 'APPROVED'),0) AS \"Shortage (approved)\", "
                                + "l.operation_id, l.category "
                                + "FROM public.job_work_order_lines l JOIN public.job_work_orders o ON o.id = l.jwo_id JOIN public.job_workers w ON w.id = o.job_worker_id "
                                + "WHERE (l.scrap_qty > 0 OR l.written_off_qty > 0 OR EXISTS (SELECT 1 FROM public.job_work_adjustments a WHERE a.jwo_line_id = l.id)) "
                                + "AND (CAST(? AS BIGINT) IS NULL OR o.job_worker_id = ?) AND LOWER(o.jwo_number) LIKE ? ORDER BY o.jwo_number, l.line_no", wid, wid, like);
                List<Map<String, Object>> rows = new ArrayList<>();
                for (Map<String, Object> r : base) {
                    java.math.BigDecimal pct = permissible(((Number) r.get("operation_id")).longValue(), (String) r.get("category"));
                    java.math.BigDecimal allowed = ((java.math.BigDecimal) r.get("Dispatched")).multiply(pct).divide(new java.math.BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
                    java.math.BigDecimal actual = ((java.math.BigDecimal) r.get("Process loss (approved)")).add((java.math.BigDecimal) r.get("Shortage (approved)"));
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (String k : List.of("Order", "Line", "Item", "Job worker", "Dispatched", "Scrap recorded", "Scrap disposed", "Process loss (approved)", "Shortage (approved)")) row.put(k, r.get(k));
                    row.put("Permissible %", pct);
                    row.put("Allowed loss", allowed);
                    row.put("Excess loss", actual.subtract(allowed).max(java.math.BigDecimal.ZERO));
                    rows.add(row);
                }
                out.put("rows", rows);
            }
            case "adjustments" -> {
                cols(out, "Adjustment", "Requested on", "Order", "Job worker", "Item", "Type", "Qty", "Status", "Requested by", "Decided by", "Reason");
                rows(out, jdbc.queryForList(
                        "SELECT a.adjustment_number AS \"Adjustment\", a.requested_at::date AS \"Requested on\", o.jwo_number AS \"Order\", w.legal_name AS \"Job worker\", a.category AS \"Item\", "
                                + "a.adjustment_type AS \"Type\", a.qty AS \"Qty\", a.status AS \"Status\", a.requested_by AS \"Requested by\", a.decided_by AS \"Decided by\", a.reason AS \"Reason\" "
                                + "FROM public.job_work_adjustments a JOIN public.job_work_orders o ON o.id = a.jwo_id JOIN public.job_workers w ON w.id = a.job_worker_id "
                                + "WHERE a.requested_at::date BETWEEN ?::date AND ?::date AND (CAST(? AS BIGINT) IS NULL OR a.job_worker_id = ?) AND LOWER(a.adjustment_number) LIKE ? ORDER BY a.requested_at DESC",
                        f, t, wid, wid, like));
            }
            case "cost-item-operation" -> {
                cols(out, "Item", "Operation", "Orders", "Input qty", "Estimated charges", "Average rate");
                rows(out, jdbc.queryForList(
                        "SELECT l.item_code AS \"Item\", op.operation_name AS \"Operation\", COUNT(DISTINCT o.id) AS \"Orders\", SUM(l.input_qty) AS \"Input qty\", "
                                + "SUM(l.est_charges) AS \"Estimated charges\", ROUND(AVG(l.rate), 2) AS \"Average rate\" "
                                + "FROM public.job_work_order_lines l JOIN public.job_work_orders o ON o.id = l.jwo_id JOIN public.job_work_operations op ON op.id = l.operation_id "
                                + "WHERE o.status NOT IN ('DRAFT','PENDING_APPROVAL','REJECTED','CANCELLED') AND o.jwo_date BETWEEN ?::date AND ?::date "
                                + "AND (CAST(? AS BIGINT) IS NULL OR o.job_worker_id = ?) AND LOWER(l.item_code) LIKE ? GROUP BY l.item_code, op.operation_name ORDER BY \"Estimated charges\" DESC",
                        f, t, wid, wid, like));
            }
            case "rate-comparison" -> {
                cols(out, "Operation", "Category", "Job worker", "Rate", "Basis", "Minimum qty", "Valid from", "Valid until");
                rows(out, jdbc.queryForList(
                        "SELECT op.operation_name AS \"Operation\", COALESCE(rc.item_category, 'All categories') AS \"Category\", w.legal_name AS \"Job worker\", rc.rate AS \"Rate\", "
                                + "rc.rate_basis AS \"Basis\", rc.min_qty AS \"Minimum qty\", rc.effective_from AS \"Valid from\", rc.valid_until AS \"Valid until\" "
                                + "FROM public.job_work_rate_contracts rc JOIN public.job_work_operations op ON op.id = rc.operation_id JOIN public.job_workers w ON w.id = rc.job_worker_id "
                                + "WHERE rc.status = 'ACTIVE' AND CURRENT_DATE BETWEEN rc.effective_from AND rc.valid_until AND (CAST(? AS BIGINT) IS NULL OR rc.job_worker_id = ?) "
                                + "ORDER BY op.operation_name, rc.item_category NULLS FIRST, rc.rate", wid, wid));
            }
            case "turnaround" -> {
                cols(out, "Job worker", "Challan", "Challan date", "Receipt", "Receipt date", "Days");
                rows(out, jdbc.queryForList(
                        "SELECT w.legal_name AS \"Job worker\", c.challan_number AS \"Challan\", c.challan_date AS \"Challan date\", r.receipt_number AS \"Receipt\", "
                                + "r.receipt_date AS \"Receipt date\", (r.receipt_date - c.challan_date) AS \"Days\" "
                                + "FROM public.job_work_receipts r JOIN public.job_work_challans c ON c.id = r.challan_id JOIN public.job_workers w ON w.id = r.job_worker_id "
                                + "WHERE r.receipt_date BETWEEN ?::date AND ?::date AND (CAST(? AS BIGINT) IS NULL OR r.job_worker_id = ?) ORDER BY w.legal_name, r.receipt_date",
                        f, t, wid, wid));
            }
            case "order-history" -> {
                cols(out, "When", "Event", "Reference", "Detail", "By");
                String number = q == null ? "" : q.trim();
                List<Map<String, Object>> ev = new ArrayList<>();
                List<Map<String, Object>> ord = jdbc.queryForList("SELECT id FROM public.job_work_orders WHERE jwo_number = ?", number);
                if (ord.isEmpty()) throw new JobWorkException(HttpStatus.BAD_REQUEST, "Type the exact order number (e.g. JWO-2026-00001) in Search.");
                long jwoId = ((Number) ord.get(0).get("id")).longValue();
                ev.addAll(jdbc.queryForList("SELECT acted_at AS \"When\", action AS \"Event\", ? AS \"Reference\", COALESCE(comments, to_status) AS \"Detail\", actor AS \"By\" "
                        + "FROM public.job_work_history WHERE entity_type = 'JWO' AND entity_id = ?", number, jwoId));
                ev.addAll(jdbc.queryForList("SELECT c.created_at AS \"When\", 'CHALLAN' AS \"Event\", c.challan_number AS \"Reference\", "
                        + "CONCAT(c.status, ' · ', (SELECT COALESCE(SUM(cl.qty),0) FROM public.job_work_challan_lines cl WHERE cl.challan_id = c.id)) AS \"Detail\", c.created_by AS \"By\" "
                        + "FROM public.job_work_challans c WHERE c.jwo_id = ?", jwoId));
                ev.addAll(jdbc.queryForList("SELECT r.received_at AS \"When\", 'RECEIPT' AS \"Event\", r.receipt_number AS \"Reference\", "
                        + "CONCAT('processed ', (SELECT COALESCE(SUM(rl.qty_received),0) FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id)) AS \"Detail\", r.received_by AS \"By\" "
                        + "FROM public.job_work_receipts r WHERE r.jwo_id = ?", jwoId));
                ev.addAll(jdbc.queryForList("SELECT a.requested_at AS \"When\", 'ADJUSTMENT' AS \"Event\", a.adjustment_number AS \"Reference\", "
                        + "CONCAT(a.adjustment_type, ' ', a.qty, ' · ', a.status) AS \"Detail\", a.requested_by AS \"By\" FROM public.job_work_adjustments a WHERE a.jwo_id = ?", jwoId));
                ev.sort(Comparator.comparing(m -> String.valueOf(m.get("When"))));
                rows(out, ev);
            }
            default -> throw new JobWorkException(HttpStatus.NOT_FOUND, "Unknown report: " + name);
        }
        return out;
    }

    private java.math.BigDecimal permissible(long operationId, String category) {
        List<java.math.BigDecimal> rows = jdbc.queryForList(
                "SELECT permissible_pct FROM public.job_work_loss_policy WHERE operation_id = ? AND (category IS NULL OR category = ?) ORDER BY (category IS NULL) LIMIT 1",
                java.math.BigDecimal.class, operationId, category == null ? "" : category);
        return rows.isEmpty() ? java.math.BigDecimal.ZERO : rows.get(0);
    }

    private static void cols(Map<String, Object> out, String... labels) {
        List<String> c = new ArrayList<>(Arrays.asList(labels));
        out.put("columns", c);
    }

    /** Report rows keep their column labels; dates and timestamps become plain text for the screen and Excel. */
    static List<Map<String, Object>> plain(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            for (Map.Entry<String, Object> e : r.entrySet()) {
                Object v = e.getValue();
                if (v instanceof java.sql.Date d) v = d.toLocalDate().toString();
                else if (v instanceof java.sql.Timestamp t) v = t.toInstant().atZone(JobWorkService.zone()).toLocalDate().toString();
                m.put(e.getKey(), v);
            }
            out.add(m);
        }
        return out;
    }

    private static void rows(Map<String, Object> out, List<Map<String, Object>> rows) {
        out.put("rows", plain(rows));
    }
}
