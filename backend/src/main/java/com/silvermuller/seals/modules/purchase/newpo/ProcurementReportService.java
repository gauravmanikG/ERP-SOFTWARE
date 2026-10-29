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

    // ------------------------------------------------------------------ PR -> draft -> PO -> GRN traceability

    /**
     * One row per PR line with its line-level balances, and under it every draft, PO and GRN it went through.
     * Line totals are computed once per line, so a line on several POs or GRNs is never counted twice.
     *
     *   readyForSourcing  = requested - ordered - drafted (approved PRs only)
     *   inDraft           = drafted_qty (reserved in open drafts, not yet on a PO)
     *   remainingToOrder  = requested - ordered (includes what is still in drafts)
     *   awaitingReceipt   = ordered through PO by PR - accepted receipts
     *
     * Filters are optional: department (exact), vendorCode (any draft or PO of the line), item (code or name),
     * docNumber (PR, draft, PO or GRN number, partial match), status (approvalStage, orderingStatus,
     * receivingStatus or stage value).
     */
    public List<Map<String, Object>> traceability(String department, String vendorCode, String item, String docNumber, String status) {
        String itemLike = item == null ? null : "%" + item + "%";
        String docLike = docNumber == null ? null : "%" + docNumber + "%";
        List<Map<String, Object>> lines = jdbc.queryForList(
                "SELECT pri.id, pri.pr_number, pr.pr_date, pr.status AS pr_status, pr.department, pr.requisitioner, " +
                "pri.item_code, pri.item_name, pri.uom, pri.req_qty, pri.ordered_qty, pri.drafted_qty, pri.required_by_date " +
                "FROM public.purchase_requisition_items pri JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id " +
                "WHERE (CAST(? AS VARCHAR) IS NULL OR pr.department = ?) " +
                "AND (CAST(? AS VARCHAR) IS NULL OR pri.item_code ILIKE ? OR pri.item_name ILIKE ?) " +
                "AND (CAST(? AS VARCHAR) IS NULL " +
                "     OR EXISTS (SELECT 1 FROM public.po_draft_allocations da JOIN public.po_drafts d ON d.id = da.draft_id WHERE da.pr_item_id = pri.id AND d.vendor_code = ?) " +
                "     OR EXISTS (SELECT 1 FROM public.po_pr_allocations a JOIN public.purchase_orders p ON p.po_number = a.po_number WHERE a.pr_item_id = pri.id AND p.vendor_code = ?)) " +
                "AND (CAST(? AS VARCHAR) IS NULL OR pri.pr_number ILIKE ? " +
                "     OR EXISTS (SELECT 1 FROM public.po_draft_allocations da JOIN public.po_drafts d ON d.id = da.draft_id WHERE da.pr_item_id = pri.id AND d.draft_number ILIKE ?) " +
                "     OR EXISTS (SELECT 1 FROM public.po_pr_allocations a WHERE a.pr_item_id = pri.id AND a.po_number ILIKE ?) " +
                "     OR EXISTS (SELECT 1 FROM public.po_pr_allocations a JOIN public.grn_item_allocations g ON g.allocation_id = a.id " +
                "                JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                "                WHERE a.pr_item_id = pri.id AND n.grn_number ILIKE ?)) " +
                "ORDER BY pr.pr_date DESC, pri.pr_number DESC, pri.id LIMIT 2000",
                department, department, itemLike, itemLike, itemLike, vendorCode, vendorCode, vendorCode,
                docLike, docLike, docLike, docLike, docLike);
        if (lines.isEmpty()) return List.of();

        List<Long> ids = lines.stream().map(l -> ((Number) l.get("id")).longValue()).toList();
        String in = String.join(",", Collections.nCopies(ids.size(), "?"));

        Map<Long, List<Map<String, Object>>> draftsByLine = new HashMap<>();
        for (Map<String, Object> d : jdbc.queryForList(
                "SELECT da.pr_item_id, d.draft_number, d.status AS draft_status, d.vendor_code, s.supplier_name, " +
                "da.reserved_qty, da.converted_qty, da.released_qty, da.reserved_qty - da.converted_qty - da.released_qty AS open_qty " +
                "FROM public.po_draft_allocations da JOIN public.po_drafts d ON d.id = da.draft_id " +
                "JOIN public.supplier_master s ON s.supplier_code = d.vendor_code WHERE da.pr_item_id IN (" + in + ") ORDER BY da.id",
                ids.toArray())) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("draftNumber", d.get("draft_number"));
            o.put("draftStatus", d.get("draft_status"));
            o.put("vendorCode", d.get("vendor_code"));
            o.put("vendorName", d.get("supplier_name"));
            o.put("reservedQty", num(d.get("reserved_qty")));
            o.put("convertedQty", num(d.get("converted_qty")));
            o.put("releasedQty", num(d.get("released_qty")));
            o.put("openQty", num(d.get("open_qty")));
            draftsByLine.computeIfAbsent(((Number) d.get("pr_item_id")).longValue(), k -> new ArrayList<>()).add(o);
        }

        List<Map<String, Object>> allocs = jdbc.queryForList(
                "SELECT a.id, a.pr_item_id, a.po_number, p.po_date, p.status AS po_status, p.vendor_code, p.vendor_name, a.unit_price, " +
                "a.allocated_qty - a.released_qty AS net_qty, d.draft_number " +
                "FROM public.po_pr_allocations a JOIN public.purchase_orders p ON p.po_number = a.po_number " +
                "LEFT JOIN public.po_draft_allocations da ON da.id = a.draft_allocation_id LEFT JOIN public.po_drafts d ON d.id = da.draft_id " +
                "WHERE a.pr_item_id IN (" + in + ") ORDER BY a.id", ids.toArray());
        Map<Long, List<Map<String, Object>>> grnsByAlloc = new HashMap<>();
        if (!allocs.isEmpty()) {
            List<Long> allocIds = allocs.stream().map(a -> ((Number) a.get("id")).longValue()).toList();
            for (Map<String, Object> g : jdbc.queryForList(
                    "SELECT g.allocation_id, n.grn_number, n.grn_date, SUM(g.accepted_qty) AS accepted_qty " +
                    "FROM public.grn_item_allocations g JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id " +
                    "JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                    "WHERE n.status = 'POSTED' AND g.allocation_id IN (" + String.join(",", Collections.nCopies(allocIds.size(), "?")) + ") " +
                    "GROUP BY g.allocation_id, n.grn_number, n.grn_date ORDER BY n.grn_date, n.grn_number", allocIds.toArray())) {
                Map<String, Object> o = new LinkedHashMap<>();
                o.put("grnNumber", g.get("grn_number"));
                o.put("grnDate", g.get("grn_date"));
                o.put("receivedQty", num(g.get("accepted_qty")));
                grnsByAlloc.computeIfAbsent(((Number) g.get("allocation_id")).longValue(), k -> new ArrayList<>()).add(o);
            }
        }
        Map<Long, List<Map<String, Object>>> posByLine = new HashMap<>();
        for (Map<String, Object> a : allocs) {
            List<Map<String, Object>> grns = grnsByAlloc.getOrDefault(((Number) a.get("id")).longValue(), List.of());
            BigDecimal net = num(a.get("net_qty"));
            BigDecimal received = grns.stream().map(g -> num(g.get("receivedQty"))).reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("poNumber", a.get("po_number"));
            o.put("poDate", a.get("po_date"));
            o.put("poStatus", a.get("po_status"));
            o.put("vendorCode", a.get("vendor_code"));
            o.put("vendorName", a.get("vendor_name"));
            o.put("draftNumber", a.get("draft_number"));
            o.put("unitPrice", a.get("unit_price"));
            o.put("orderedQty", net);
            o.put("receivedQty", received);
            o.put("awaitingReceiptQty", net.subtract(received).max(BigDecimal.ZERO));
            o.put("grns", grns);
            posByLine.computeIfAbsent(((Number) a.get("pr_item_id")).longValue(), k -> new ArrayList<>()).add(o);
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> l : lines) {
            long id = ((Number) l.get("id")).longValue();
            String prStatus = String.valueOf(l.get("pr_status"));
            BigDecimal req = num(l.get("req_qty")), ordered = num(l.get("ordered_qty")), drafted = num(l.get("drafted_qty"));
            List<Map<String, Object>> pos = posByLine.getOrDefault(id, List.of());
            BigDecimal orderedOnPos = pos.stream().map(p -> num(p.get("orderedQty"))).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal received = pos.stream().map(p -> num(p.get("receivedQty"))).reduce(BigDecimal.ZERO, BigDecimal::add);

            String approval = switch (prStatus) {
                case "Draft", "Pending Approval", "Submitted" -> "AWAITING_APPROVAL";
                case "Rejected" -> "REJECTED";
                case "Cancelled" -> "CANCELLED";
                default -> "APPROVED";
            };
            boolean approved = "APPROVED".equals(approval);
            BigDecimal ready = approved ? req.subtract(ordered).subtract(drafted).max(BigDecimal.ZERO) : BigDecimal.ZERO;
            String ordering = ordered.signum() == 0 ? "YET_TO_ORDER" : ordered.compareTo(req) < 0 ? "PARTIALLY_ORDERED" : "FULLY_ORDERED";
            String receiving = received.signum() == 0 ? "NOT_RECEIVED"
                    : received.compareTo(orderedOnPos) < 0 ? "PARTIALLY_RECEIVED" : "FULLY_RECEIVED";
            BigDecimal awaiting = orderedOnPos.subtract(received).max(BigDecimal.ZERO);

            String stage, nextAction;
            if (!approved) {
                stage = approval;
                nextAction = "AWAITING_APPROVAL".equals(approval) ? "Approve the PR." : "No action: the PR is " + prStatus + ".";
            } else if (ready.signum() > 0) {
                stage = "READY_FOR_SOURCING";
                nextAction = "Choose a vendor in Clubbed Demand.";
            } else if (drafted.signum() > 0) {
                stage = "IN_DRAFT";
                nextAction = "Convert the vendor draft to a PO.";
            } else if (awaiting.signum() > 0) {
                stage = "AWAITING_RECEIPT";
                nextAction = "Receive goods (GRN) against the PO.";
            } else if (ordered.subtract(orderedOnPos).signum() > 0) {
                // Ordered through an older flow with no PR allocation: its receipts cannot be linked to this line,
                // so it is never reported as completed.
                stage = "ORDERED_UNTRACKED";
                nextAction = "Ordered through an older PO flow; receipts are not linked to this PR line. Check the PO directly.";
            } else {
                stage = "COMPLETED";
                nextAction = "Nothing pending.";
            }

            Map<String, Object> o = new LinkedHashMap<>();
            o.put("prItemId", id);
            o.put("department", l.get("department"));
            o.put("prNumber", l.get("pr_number"));
            o.put("prDate", l.get("pr_date"));
            o.put("prStatus", prStatus);
            o.put("requisitioner", l.get("requisitioner"));
            o.put("itemCode", l.get("item_code"));
            o.put("itemName", l.get("item_name"));
            o.put("uom", l.get("uom"));
            o.put("requiredByDate", l.get("required_by_date"));
            o.put("requestedQty", req);
            o.put("readyForSourcingQty", ready);
            o.put("inDraftQty", drafted);
            o.put("orderedQty", ordered);
            o.put("orderedOutsidePoByPrQty", ordered.subtract(orderedOnPos).max(BigDecimal.ZERO));
            o.put("remainingToOrderQty", req.subtract(ordered).max(BigDecimal.ZERO));
            o.put("receivedQty", received);
            o.put("awaitingReceiptQty", awaiting);
            o.put("approvalStage", approval);
            o.put("orderingStatus", ordering);
            o.put("receivingStatus", receiving);
            o.put("stage", stage);
            o.put("nextAction", nextAction);
            o.put("drafts", draftsByLine.getOrDefault(id, List.of()));
            o.put("purchaseOrders", pos);
            if (status == null || status.equalsIgnoreCase(approval) || status.equalsIgnoreCase(ordering)
                    || status.equalsIgnoreCase(receiving) || status.equalsIgnoreCase(stage)) {
                out.add(o);
            }
        }
        return out;
    }

    /**
     * The same report flattened for export, with the report's columns. A PR line produces one row per open draft,
     * one row per GRN of each PO (or one row for a PO with no GRN yet), and one row if it has neither. Line-level
     * quantities (requested, remaining to order) are filled on the line's first row only, so column totals are exact.
     */
    public List<Map<String, Object>> traceabilityFlat(String department, String vendorCode, String item, String docNumber, String status) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> line : traceability(department, vendorCode, item, docNumber, status)) {
            List<Map<String, Object>> rows = new ArrayList<>();
            @SuppressWarnings("unchecked") List<Map<String, Object>> drafts = (List<Map<String, Object>>) line.get("drafts");
            for (Map<String, Object> d : drafts) {
                if (num(d.get("openQty")).signum() <= 0) continue;
                Map<String, Object> r = flatRow(line);
                r.put("draftReference", d.get("draftNumber"));
                r.put("vendorName", d.get("vendorName"));
                r.put("qtyReservedInDraft", d.get("openQty"));
                rows.add(r);
            }
            @SuppressWarnings("unchecked") List<Map<String, Object>> pos = (List<Map<String, Object>>) line.get("purchaseOrders");
            for (Map<String, Object> p : pos) {
                @SuppressWarnings("unchecked") List<Map<String, Object>> grns = (List<Map<String, Object>>) p.get("grns");
                boolean firstOfPo = true;
                for (Map<String, Object> g : grns.isEmpty() ? Collections.<Map<String, Object>>singletonList(null) : grns) {
                    Map<String, Object> r = flatRow(line);
                    r.put("draftReference", p.get("draftNumber"));
                    r.put("vendorName", p.get("vendorName"));
                    r.put("poNumber", p.get("poNumber"));
                    r.put("orderedQty", firstOfPo ? p.get("orderedQty") : null);
                    r.put("qtyAwaitingReceipt", firstOfPo ? p.get("awaitingReceiptQty") : null);
                    if (g != null) {
                        r.put("grnNumber", g.get("grnNumber"));
                        r.put("receivedQty", g.get("receivedQty"));
                    }
                    rows.add(r);
                    firstOfPo = false;
                }
            }
            if (rows.isEmpty()) rows.add(flatRow(line));
            rows.get(0).put("requestedQty", line.get("requestedQty"));
            rows.get(0).put("remainingQtyToOrder", line.get("remainingToOrderQty"));
            out.addAll(rows);
        }
        return out;
    }

    private static Map<String, Object> flatRow(Map<String, Object> line) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("department", line.get("department"));
        r.put("prNumber", line.get("prNumber"));
        r.put("itemCode", line.get("itemCode"));
        r.put("itemName", line.get("itemName"));
        r.put("uom", line.get("uom"));
        r.put("requestedQty", null);
        r.put("draftReference", null);
        r.put("qtyReservedInDraft", null);
        r.put("vendorName", null);
        r.put("poNumber", null);
        r.put("orderedQty", null);
        r.put("remainingQtyToOrder", null);
        r.put("grnNumber", null);
        r.put("receivedQty", null);
        r.put("qtyAwaitingReceipt", null);
        r.put("status", line.get("stage"));
        r.put("orderingStatus", line.get("orderingStatus"));
        r.put("receivingStatus", line.get("receivingStatus"));
        return r;
    }

    /** Item-level and overall status of one PR. Ordering and receiving are reported separately. */
    public Map<String, Object> prStatus(String prNumber) {
        List<Map<String, Object>> header = jdbc.queryForList(
                "SELECT pr_number, pr_date, status, department, requisitioner, approved_by, approved_at, rejection_reason " +
                "FROM public.purchase_requisitions WHERE pr_number = ?", prNumber);
        if (header.isEmpty()) {
            throw new VendorRateService.NewPoException(org.springframework.http.HttpStatus.NOT_FOUND, "PR " + prNumber + " was not found.");
        }
        List<Map<String, Object>> lines = traceability(null, null, null, prNumber, null).stream()
                .filter(l -> prNumber.equals(l.get("prNumber"))).toList();
        BigDecimal req = BigDecimal.ZERO, ordered = BigDecimal.ZERO, onPos = BigDecimal.ZERO, received = BigDecimal.ZERO;
        for (Map<String, Object> l : lines) {
            req = req.add(num(l.get("requestedQty")));
            ordered = ordered.add(num(l.get("orderedQty")));
            onPos = onPos.add(num(l.get("orderedQty")).subtract(num(l.get("orderedOutsidePoByPrQty"))));
            received = received.add(num(l.get("receivedQty")));
        }
        Map<String, Object> h = header.get(0);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("prNumber", h.get("pr_number"));
        out.put("prDate", h.get("pr_date"));
        out.put("prStatus", h.get("status"));
        out.put("department", h.get("department"));
        out.put("requisitioner", h.get("requisitioner"));
        out.put("approvedBy", h.get("approved_by"));
        out.put("approvedAt", h.get("approved_at"));
        out.put("rejectionReason", h.get("rejection_reason"));
        out.put("overallOrderingStatus", ordered.signum() == 0 ? "YET_TO_ORDER" : ordered.compareTo(req) < 0 ? "PARTIALLY_ORDERED" : "FULLY_ORDERED");
        out.put("overallReceivingStatus", received.signum() == 0 ? "NOT_RECEIVED" : received.compareTo(onPos) < 0 ? "PARTIALLY_RECEIVED" : "FULLY_RECEIVED");
        out.put("lines", lines);
        return out;
    }

    /**
     * Every standard purchase order, whatever created it (PO by PR, Direct PO or an older PO), newest first.
     * origin is PO_BY_PR, DIRECT or LEGACY; prNumbers lists the PRs its lines came from (empty for direct and legacy POs).
     */
    public List<Map<String, Object>> allPurchaseOrders() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT p.po_number, p.po_date, p.vendor_code, p.vendor_name, p.status, p.grand_total, p.po_origin, " +
                "p.reference_no, p.voucher_no, p.created_at, " +
                "(SELECT COUNT(*) FROM public.po_pr_allocations a WHERE a.po_number = p.po_number) AS allocation_count, " +
                "(SELECT string_agg(DISTINCT a.pr_number, ', ' ORDER BY a.pr_number) FROM public.po_pr_allocations a WHERE a.po_number = p.po_number) AS pr_numbers " +
                "FROM public.purchase_orders p ORDER BY p.created_at DESC, p.po_number DESC LIMIT 2000");
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("po_number", r.get("po_number"));
            o.put("po_date", r.get("po_date"));
            o.put("vendor_code", r.get("vendor_code"));
            o.put("vendor_name", r.get("vendor_name"));
            o.put("status", r.get("status"));
            o.put("grand_total", r.get("grand_total"));
            o.put("origin", PoByPrService.originOf(r.get("po_origin"), ((Number) r.get("allocation_count")).longValue() == 0));
            o.put("pr_numbers", r.get("pr_numbers") == null ? "" : r.get("pr_numbers"));
            o.put("reference_no", r.get("reference_no"));
            o.put("voucher_no", r.get("voucher_no"));
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
