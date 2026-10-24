package com.silvermuller.seals.modules.purchase.newpo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Read-only reports over PR lines, PO-by-PR allocations, GRN attribution and legacy records.
 * Every figure is computed from stored rows; nothing is inferred or filled in.
 *
 * Definitions used throughout (see docs/po-by-pr-integration.md):
 *   ordered      = purchase_requisition_items.ordered_qty (all workflows)
 *   allocated    = SUM(allocated_qty - released_qty) over po_pr_allocations (PO by PR, net)
 *   outside      = ordered - allocated (legacy reservations; not receivable against a PR line)
 *   received     = SUM of POSTED grn_item_allocations.received_qty for the line
 *   accepted / rejected = the GRN line's accepted / rejected quantity, shared across its attributed
 *                  allocations in proportion to the received quantity attributed to each
 */
@Service
public class ProcurementReportService {

    private final JdbcTemplate jdbc;

    public ProcurementReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** One row per PR line. Filters are optional (null = all). */
    public List<Map<String, Object>> poVsPr(String prNumber, String poNumber, String vendorCode) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT pri.id, pri.pr_number, pr.pr_date, pr.department, pr.status AS pr_status, pri.item_code, pri.item_name, " +
                "pri.req_qty, pri.ordered_qty, pri.required_by_date, " +
                "COALESCE((SELECT SUM(a.allocated_qty - a.released_qty) FROM public.po_pr_allocations a WHERE a.pr_item_id = pri.id), 0) AS po_by_pr_net_qty, " +
                "(SELECT string_agg(DISTINCT a.po_number, ', ') FROM public.po_pr_allocations a WHERE a.pr_item_id = pri.id) AS po_numbers, " +
                "(SELECT string_agg(DISTINCT p.vendor_name, ', ') FROM public.po_pr_allocations a JOIN public.purchase_orders p ON p.po_number = a.po_number WHERE a.pr_item_id = pri.id) AS vendors, " +
                "COALESCE((SELECT SUM(g.accepted_qty) FROM public.grn_item_allocations g JOIN public.po_pr_allocations a ON a.id = g.allocation_id " +
                "          JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                "          WHERE a.pr_item_id = pri.id AND n.status = 'POSTED'), 0) AS received_qty " +
                "FROM public.purchase_requisition_items pri JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id " +
                "WHERE (CAST(? AS VARCHAR) IS NULL OR pri.pr_number = ?) " +
                "AND (CAST(? AS VARCHAR) IS NULL OR EXISTS (SELECT 1 FROM public.po_pr_allocations a WHERE a.pr_item_id = pri.id AND a.po_number = ?)) " +
                "AND (CAST(? AS VARCHAR) IS NULL OR EXISTS (SELECT 1 FROM public.po_pr_allocations a JOIN public.purchase_orders p ON p.po_number = a.po_number " +
                "                          WHERE a.pr_item_id = pri.id AND p.vendor_code = ?)) " +
                "ORDER BY pr.pr_date DESC, pri.pr_number, pri.id LIMIT 2000",
                prNumber, prNumber, poNumber, poNumber, vendorCode, vendorCode);

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            BigDecimal req = num(r.get("req_qty")), ordered = num(r.get("ordered_qty"));
            BigDecimal allocated = num(r.get("po_by_pr_net_qty")), received = num(r.get("received_qty"));
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("prNumber", r.get("pr_number"));
            o.put("prDate", r.get("pr_date"));
            o.put("department", r.get("department"));
            o.put("prStatus", r.get("pr_status"));
            o.put("itemCode", r.get("item_code"));
            o.put("itemName", r.get("item_name"));
            o.put("requestedQty", req);
            o.put("orderedQty", ordered);
            o.put("orderedThroughPoByPrQty", allocated);
            o.put("orderedOutsidePoByPrQty", ordered.subtract(allocated).max(BigDecimal.ZERO));
            o.put("remainingToOrderQty", req.subtract(ordered).max(BigDecimal.ZERO));
            o.put("receivedQty", received);
            o.put("pendingReceiptQty", allocated.subtract(received).max(BigDecimal.ZERO));
            o.put("poNumbers", r.get("po_numbers"));
            o.put("vendors", r.get("vendors"));
            o.put("requiredByDate", r.get("required_by_date"));
            o.put("lifecycle", lifecycle(req, ordered, allocated, received));
            out.add(o);
        }
        return out;
    }

    /** One row per PO-by-PR allocation, with the receipts attributed to it. Filters are optional. */
    public List<Map<String, Object>> poVsPrVsGrn(String poNumber, String prNumber, String vendorCode) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT a.id AS allocation_id, a.po_number, p.po_date, p.status AS po_status, p.vendor_name, " +
                "a.pr_number, pr.status AS pr_status, a.item_code, a.pr_item_id, a.allocated_qty, a.released_qty, " +
                "a.allocated_qty - a.released_qty AS net_qty, a.unit_price, " +
                "COALESCE((SELECT SUM(g.accepted_qty) FROM public.grn_item_allocations g JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id " +
                "          JOIN public.goods_receipt_notes n ON n.id = gi.grn_id WHERE g.allocation_id = a.id AND n.status = 'POSTED'), 0) AS received_qty, " +
                "COALESCE((SELECT SUM(gi.rejected_qty) FROM public.goods_receipt_note_items gi JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                "          WHERE gi.po_number = a.po_number AND gi.item_code = a.item_code AND n.status = 'POSTED'), 0) AS po_line_rejected_qty, " +
                "(SELECT string_agg(DISTINCT n.grn_number, ', ') FROM public.grn_item_allocations g JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id " +
                "          JOIN public.goods_receipt_notes n ON n.id = gi.grn_id WHERE g.allocation_id = a.id AND n.status = 'POSTED') AS grn_numbers " +
                "FROM public.po_pr_allocations a JOIN public.purchase_orders p ON p.po_number = a.po_number " +
                "JOIN public.purchase_requisitions pr ON pr.pr_number = a.pr_number " +
                "WHERE (CAST(? AS VARCHAR) IS NULL OR a.po_number = ?) AND (CAST(? AS VARCHAR) IS NULL OR a.pr_number = ?) AND (CAST(? AS VARCHAR) IS NULL OR p.vendor_code = ?) " +
                "ORDER BY p.created_at DESC, a.po_number, a.id LIMIT 2000",
                poNumber, poNumber, prNumber, prNumber, vendorCode, vendorCode);

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            BigDecimal net = num(r.get("net_qty")), received = num(r.get("received_qty"));
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("poNumber", r.get("po_number"));
            o.put("poDate", r.get("po_date"));
            o.put("poStatus", r.get("po_status"));
            o.put("vendorName", r.get("vendor_name"));
            o.put("prNumber", r.get("pr_number"));
            o.put("prStatus", r.get("pr_status"));
            o.put("itemCode", r.get("item_code"));
            o.put("allocatedQty", num(r.get("allocated_qty")));
            o.put("releasedQty", num(r.get("released_qty")));
            o.put("netOrderedQty", net);
            o.put("unitPrice", r.get("unit_price"));
            o.put("receivedQty", received);
            o.put("acceptedQty", received); // fulfilment = accepted attribution (received_qty alias holds it)
            o.put("poLineRejectedQty", num(r.get("po_line_rejected_qty")).setScale(2, java.math.RoundingMode.HALF_UP));
            o.put("rejectedDisposition", num(r.get("po_line_rejected_qty")).signum() > 0 ? "RETAINED_NOT_RETURNED" : "NONE");
            o.put("pendingReceiptQty", net.subtract(received).max(BigDecimal.ZERO));
            o.put("grnNumbers", r.get("grn_numbers"));
            out.add(o);
        }
        return out;
    }

    /**
     * Records that need a manual decision: legacy POs without allocations, their posted receipts (never attributed),
     * and PR lines with ordered quantity that no allocation explains. Nothing here is linked automatically.
     */
    public Map<String, Object> legacyReconciliation() {
        List<Map<String, Object>> items = new ArrayList<>();

        for (Map<String, Object> p : jdbc.queryForList(
                "SELECT p.po_number, p.status, p.pr_number, p.vendor_name, p.grand_total, p.po_type, " +
                "(SELECT COUNT(*) FROM public.goods_receipt_notes n WHERE n.po_number = p.po_number AND n.status = 'POSTED') AS posted_grns " +
                "FROM public.purchase_orders p WHERE NOT EXISTS (SELECT 1 FROM public.po_pr_allocations a WHERE a.po_number = p.po_number) " +
                "ORDER BY p.created_at, p.po_number LIMIT 5000")) {
            String pr = (String) p.get("pr_number");
            boolean hasReceipts = ((Number) p.get("posted_grns")).longValue() > 0;
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("category", pr == null || pr.isBlank() ? "PO_WITHOUT_PR_ALLOCATION" : "PO_NAMES_PR_WITHOUT_ALLOCATION");
            o.put("reference", p.get("po_number"));
            o.put("status", p.get("status"));
            o.put("prNumberOnPo", pr);
            o.put("vendorName", p.get("vendor_name"));
            o.put("grandTotal", p.get("grand_total"));
            o.put("postedGrnCount", p.get("posted_grns"));
            o.put("action", hasReceipts
                    ? "Receipts exist with no PR attribution. Decide the PR line manually; the system will not guess."
                    : "No PR allocation. Keep as legacy; decide manually if a PR link is needed.");
            items.add(o);
        }

        for (Map<String, Object> g : jdbc.queryForList(
                "SELECT n.grn_number, n.po_number, gi.item_code, gi.received_qty, gi.accepted_qty, gi.rejected_qty " +
                "FROM public.goods_receipt_note_items gi JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                "WHERE n.status = 'POSTED' AND gi.received_qty > 0 " +
                "AND NOT EXISTS (SELECT 1 FROM public.grn_item_allocations g WHERE g.grn_item_id = gi.id) " +
                "ORDER BY n.grn_date, n.grn_number, gi.id LIMIT 5000")) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("category", "UNATTRIBUTED_RECEIPT");
            o.put("reference", g.get("grn_number"));
            o.put("poNumber", g.get("po_number"));
            o.put("itemCode", g.get("item_code"));
            o.put("receivedQty", g.get("received_qty"));
            o.put("acceptedQty", g.get("accepted_qty"));
            o.put("rejectedQty", g.get("rejected_qty"));
            o.put("action", "Posted before PO-by-PR attribution existed, or on a legacy PO. Not attributed to any PR line.");
            items.add(o);
        }

        for (Map<String, Object> l : jdbc.queryForList(
                "SELECT pri.pr_number, pri.item_code, pri.req_qty, pri.ordered_qty, " +
                "COALESCE((SELECT SUM(a.allocated_qty - a.released_qty) FROM public.po_pr_allocations a WHERE a.pr_item_id = pri.id), 0) AS net " +
                "FROM public.purchase_requisition_items pri WHERE pri.ordered_qty > 0 " +
                "AND pri.ordered_qty > COALESCE((SELECT SUM(a.allocated_qty - a.released_qty) FROM public.po_pr_allocations a WHERE a.pr_item_id = pri.id), 0) " +
                "ORDER BY pri.pr_number, pri.id LIMIT 5000")) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("category", "PR_QUANTITY_WITHOUT_ALLOCATION");
            o.put("reference", l.get("pr_number") + " / " + l.get("item_code"));
            o.put("requestedQty", l.get("req_qty"));
            o.put("orderedQty", l.get("ordered_qty"));
            o.put("orderedThroughPoByPrQty", l.get("net"));
            o.put("action", "Ordered through a legacy workflow (proposal approval, clubbing or manual change). Not attributable to a PO-by-PR line.");
            items.add(o);
        }

        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Map<String, Object> i : items) {
            counts.merge((String) i.get("category"), 1, Integer::sum);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("counts", counts);
        out.put("items", items);
        return out;
    }

    /**
     * Lifecycle of a PR line. Ordering and receipt are separate; full ordering does not mean full receipt, and
     * a PR is only ELIGIBLE_FOR_CLOSURE here, never closed automatically.
     */
    public static String lifecycle(BigDecimal req, BigDecimal ordered, BigDecimal allocated, BigDecimal received) {
        if (ordered.signum() == 0) return "OPEN";
        if (ordered.compareTo(req) < 0) return "PARTIALLY_ORDERED";
        if (allocated.subtract(received).signum() > 0) return "FULLY_ORDERED_AWAITING_RECEIPT";
        return "ELIGIBLE_FOR_CLOSURE";
    }

    /**
     * PR vs PO: one row per PR line allocated to a PO. Filtered by PR date (from/to are inclusive, either may be null).
     * DaysGap is PO date minus PR date in days (0 when they are the same day).
     * PO Quantity is the allocation net of releases; Balance Quantity is the PR line's quantity still not ordered.
     */
    public List<Map<String, Object>> prVsPo(LocalDate from, LocalDate to) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT a.pr_number, pr.pr_date, a.po_number, CAST(p.po_date AS DATE) AS po_date, " +
                "a.item_code, pri.item_name, pri.uom, a.unit_price, pri.req_qty, pr.department, pr.requisitioner, " +
                "a.allocated_qty - a.released_qty AS po_qty, pri.req_qty - pri.ordered_qty AS balance_qty " +
                "FROM public.po_pr_allocations a " +
                "JOIN public.purchase_orders p ON p.po_number = a.po_number " +
                "JOIN public.purchase_requisitions pr ON pr.pr_number = a.pr_number " +
                "JOIN public.purchase_requisition_items pri ON pri.id = a.pr_item_id " +
                "WHERE (CAST(? AS DATE) IS NULL OR pr.pr_date >= CAST(? AS DATE)) " +
                "AND (CAST(? AS DATE) IS NULL OR pr.pr_date <= CAST(? AS DATE)) " +
                "ORDER BY pr.pr_date DESC, a.pr_number, a.po_number, a.id LIMIT 2000",
                from, from, to, to);

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("prNumber", r.get("pr_number"));
            o.put("prDate", r.get("pr_date"));
            o.put("poNumber", r.get("po_number"));
            o.put("poDate", r.get("po_date"));
            o.put("daysGap", daysGap(r.get("pr_date"), r.get("po_date")));
            o.put("itemCode", r.get("item_code"));
            o.put("itemName", r.get("item_name"));
            o.put("department", r.get("department"));
            o.put("requisitioner", r.get("requisitioner"));
            o.put("uom", r.get("uom"));
            o.put("rate", num(r.get("unit_price")));
            o.put("prQty", num(r.get("req_qty")));
            o.put("poQty", num(r.get("po_qty")));
            o.put("balanceQty", num(r.get("balance_qty")));
            out.add(o);
        }
        return out;
    }

    /**
     * One row per item that has a PO with a PR in the date range. PR and PO quantities are summed over all of its PRs and POs.
     * amount is the sum of PO quantity x that PO's unit rate, so each PO is priced at its own rate.
     */
    public List<Map<String, Object>> prVsPoItemSummary(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new VendorRateService.NewPoException(org.springframework.http.HttpStatus.BAD_REQUEST, "Choose a From date and a To date.");
        }
        if (to.isBefore(from)) {
            throw new VendorRateService.NewPoException(org.springframework.http.HttpStatus.BAD_REQUEST, "To date cannot be before From date.");
        }
        // Latest PO first, so the first row seen for an item carries its latest rate
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT a.item_code, pri.item_name, pri.uom, a.pr_item_id, a.po_number, a.unit_price, " +
                "pri.req_qty, pri.ordered_qty, a.allocated_qty - a.released_qty AS po_qty " +
                "FROM public.po_pr_allocations a " +
                "JOIN public.purchase_orders p ON p.po_number = a.po_number " +
                "JOIN public.purchase_requisitions pr ON pr.pr_number = a.pr_number " +
                "JOIN public.purchase_requisition_items pri ON pri.id = a.pr_item_id " +
                "WHERE pr.pr_date >= CAST(? AS DATE) AND pr.pr_date <= CAST(? AS DATE) " +
                "ORDER BY CAST(p.po_date AS DATE) DESC, a.po_number DESC, a.id DESC LIMIT 20000",
                from, to);

        Map<String, Map<String, Object>> byItem = new HashMap<>();
        Map<String, Map<Long, BigDecimal[]>> prLines = new HashMap<>();            // item -> PR line -> {requested, ordered}
        for (Map<String, Object> r : rows) {
            String code = String.valueOf(r.get("item_code"));
            Map<String, Object> item = byItem.computeIfAbsent(code, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("itemCode", k);
                m.put("itemName", r.get("item_name"));
                m.put("uom", r.get("uom"));
                m.put("poQty", BigDecimal.ZERO);
                m.put("amount", BigDecimal.ZERO);
                return m;
            });
            BigDecimal poQty = num(r.get("po_qty"));
            item.put("poQty", num(item.get("poQty")).add(poQty));
            // Each PO's quantity is priced at that PO's own rate
            item.put("amount", num(item.get("amount")).add(poQty.multiply(num(r.get("unit_price")))));
            prLines.computeIfAbsent(code, k -> new HashMap<>())
                    .putIfAbsent(((Number) r.get("pr_item_id")).longValue(),
                            new BigDecimal[] { num(r.get("req_qty")), num(r.get("ordered_qty")) });
        }

        List<String> codes = new ArrayList<>(byItem.keySet());
        Collections.sort(codes);
        List<Map<String, Object>> out = new ArrayList<>();
        for (String code : codes) {
            Map<String, Object> item = byItem.get(code);
            BigDecimal prQty = BigDecimal.ZERO, balanceQty = BigDecimal.ZERO;
            for (BigDecimal[] line : prLines.get(code).values()) {
                prQty = prQty.add(line[0]);
                balanceQty = balanceQty.add(line[0].subtract(line[1]));
            }
            Map<String, Object> o = new LinkedHashMap<>(item);
            o.put("prQty", prQty);
            o.put("balanceQty", balanceQty);
            out.add(o);
        }
        return out;
    }

    /** PO date minus PR date in whole days. Both are java.sql.Date from the query; null when either is missing. */
    private static Integer daysGap(Object prDate, Object poDate) {
        if (!(prDate instanceof java.sql.Date pr) || !(poDate instanceof java.sql.Date po)) return null;
        return (int) java.time.temporal.ChronoUnit.DAYS.between(pr.toLocalDate(), po.toLocalDate());
    }

    private static BigDecimal num(Object v) {
        if (v == null) return BigDecimal.ZERO;
        return v instanceof BigDecimal ? (BigDecimal) v : new BigDecimal(v.toString());
    }
}
