package com.silvermuller.seals.modules.purchase.newpo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silvermuller.seals.modules.purchase.dto.PurchaseCalculationRequest;
import com.silvermuller.seals.modules.purchase.dto.PurchaseCalculationResponse;
import com.silvermuller.seals.modules.purchase.dto.PurchaseItemLine;
import com.silvermuller.seals.modules.purchase.dto.VendorExtraCharges;
import com.silvermuller.seals.modules.purchase.dto.VendorSummaryGroup;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatePoRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatedPo;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.EligiblePrLine;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.LineRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.Mode;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedAllocation;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedLine;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedPo;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService;
import com.silvermuller.seals.modules.purchase.service.PurchaseRequisitionService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * PO by PR. Orders PR lines (approved PRs only) against one vendor, prices them from Vendor Rate Master,
 * taxes them through the existing purchase calculator, and saves the PO together with the PR allocations.
 *
 * Concurrency: the PR lines are locked (SELECT ... FOR UPDATE, in id order) before they are validated,
 * so two POs cannot both take the same remaining quantity. The quantity written to PR lines is the same
 * purchase_requisition_items.ordered_qty the existing PO flows use, so both flows see each other's orders.
 */
@Service
public class PoByPrService {

    /** PR statuses whose lines can still be ordered. "Draft", "Cancelled" and "Fully Ordered" cannot. */
    private static final List<String> ORDERABLE_PR_STATUSES = List.of("Approved", "Partially Ordered");
    private static final String ORDERABLE_SQL = "pr.status IN ('Approved', 'Partially Ordered')";

    private static final String PR_LINE_SQL =
            "SELECT pri.id, pri.pr_number, pr.pr_date, pri.item_code, pri.item_name, pri.uom, pri.category, pri.hsn_code, " +
            "pri.req_qty, pri.ordered_qty, pri.required_by_date, pr.status AS pr_status, pr.department, pr.requisitioner " +
            "FROM public.purchase_requisition_items pri " +
            "JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id ";

    /** A PR line as read from the database. */
    private record PrLine(long id, String prNumber, LocalDate prDate, String itemCode, String itemName, String uom,
                          String category, String hsnCode, BigDecimal reqQty, BigDecimal orderedQty,
                          String requiredBy, String prStatus, String department, String requisitioner) {
        BigDecimal remaining() {
            return reqQty.subtract(orderedQty);
        }
    }

    /** One allocation to be written: a PR line's share of a consolidated PO line, with its discount and remarks. */
    private record AllocRow(long prItemId, String prNumber, String itemCode, BigDecimal qty, BigDecimal price, long rateId,
                            BigDecimal discountPercent, BigDecimal manualDiscount, String remarks) {}

    /** Everything the create step needs, produced by the same validation that preview uses. */
    private record Plan(PlannedPo po, List<AllocRow> allocs, List<PurchaseItemLine> calcItems,
                        VendorSummaryGroup group, String headerPrNumber, String headerPrDate,
                        String department, String requisitioner, String remarks) {}

    private final JdbcTemplate jdbc;
    private final PurchaseProcessingService purchaseProcessing;
    private final PurchaseRequisitionService prService;
    private final VendorRateService rates;
    private final ObjectMapper objectMapper;
    private final com.silvermuller.seals.modules.masters.PurchaseOrderTermsService poTerms;

    public PoByPrService(JdbcTemplate jdbc, PurchaseProcessingService purchaseProcessing,
                         PurchaseRequisitionService prService, VendorRateService rates, ObjectMapper objectMapper,
                         com.silvermuller.seals.modules.masters.PurchaseOrderTermsService poTerms) {
        this.poTerms = poTerms;
        this.jdbc = jdbc;
        this.purchaseProcessing = purchaseProcessing;
        this.prService = prService;
        this.rates = rates;
        this.objectMapper = objectMapper;
    }

    // ------------------------------------------------------------------ eligible items and lines

    /** Items that have outstanding quantity on an orderable PR, with how many PRs and lines they appear on. */
    /** The PO number the next PO will be given, shown on the screen before the PO is saved. */
    public Map<String, Object> nextPoNumber() {
        return Map.of("poNumber", purchaseProcessing.peekPoNumber());
    }

    /**
     * Items with at least one outstanding PR line that is not in {@code exclude}, a comma-separated list of PR line ids
     * already on the PO being built. An item whose lines are all on that PO is left out; one with lines still open stays.
     */
    public List<Map<String, Object>> eligibleItems(String q, String exclude) {
        String like = "%" + (q == null ? "" : q.trim()) + "%";
        List<Object> args = new ArrayList<>(List.of(like, like));
        String notIn = "";
        List<Long> excluded = new ArrayList<>();
        if (exclude != null) {
            for (String part : exclude.split(",")) {
                if (part.isBlank()) continue;
                try {
                    excluded.add(Long.parseLong(part.trim()));
                } catch (NumberFormatException ignored) {
                    // not a PR line id: nothing to exclude
                }
            }
        }
        if (!excluded.isEmpty()) {
            notIn = "AND pri.id NOT IN (" + String.join(",", Collections.nCopies(excluded.size(), "?")) + ") ";
            args.addAll(excluded);
        }
        return jdbc.queryForList(
                "SELECT pri.item_code, MAX(pri.item_name) AS item_name, COUNT(DISTINCT pri.pr_number) AS pr_count, " +
                "COUNT(*) AS line_count, SUM(pri.req_qty - pri.ordered_qty) AS outstanding_qty " +
                "FROM public.purchase_requisition_items pri " +
                "JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id " +
                "WHERE " + ORDERABLE_SQL + " AND pri.req_qty - pri.ordered_qty > 0 " +
                "AND (pri.item_code ILIKE ? OR pri.item_name ILIKE ?) " + notIn +
                "GROUP BY pri.item_code ORDER BY pri.item_code LIMIT 200",
                args.toArray());
    }

    /** Every orderable PR line for one item, priced for this vendor on the PO date. */
    /**
     * Approved or partially ordered PRs that still have outstanding line quantity. Newest first.
     * Filter q matches the PR number or department.
     */
    public List<Map<String, Object>> eligiblePrs(String q) {
        String like = "%" + (q == null ? "" : q.trim()) + "%";
        return jdbc.queryForList(
                "SELECT pr.pr_number, pr.pr_date, pr.department, pr.requisitioner, pr.status, " +
                "COUNT(pri.id) AS outstanding_line_count, SUM(pri.req_qty - pri.ordered_qty) AS outstanding_qty " +
                "FROM public.purchase_requisitions pr JOIN public.purchase_requisition_items pri ON pri.pr_id = pr.id " +
                "WHERE " + ORDERABLE_SQL + " AND pri.req_qty - pri.ordered_qty > 0 " +
                "AND (pr.pr_number ILIKE ? OR COALESCE(pr.department, '') ILIKE ?) " +
                "GROUP BY pr.id, pr.pr_number, pr.pr_date, pr.department, pr.requisitioner, pr.status " +
                "ORDER BY pr.pr_date DESC, pr.pr_number DESC LIMIT 200",
                like, like);
    }

    /** Outstanding lines of one PR, each priced for this vendor on the PO date with its own item's rate. */
    public List<EligiblePrLine> eligibleLinesForPr(String prNumber, String vendorCode, LocalDate poDate) {
        if (prNumber == null || prNumber.isBlank()) {
            throw new NewPoException(HttpStatus.BAD_REQUEST, "Select a PR.");
        }
        List<PrLine> lines = jdbc.query(
                PR_LINE_SQL + "WHERE pr.pr_number = ? AND " + ORDERABLE_SQL + " AND pri.req_qty - pri.ordered_qty > 0 ORDER BY pri.id",
                (rs, n) -> toPrLine(rs), prNumber.trim());
        LocalDate asOf = poDate == null ? LocalDate.now() : poDate;
        List<EligiblePrLine> out = new ArrayList<>();
        for (PrLine l : lines) {
            Map<String, Object> rate = null;
            if (vendorCode != null && !vendorCode.isBlank()) {
                Optional<Long> itemMasterId = resolveItemMasterId(l.itemCode());
                if (itemMasterId.isPresent()) rate = rates.effectiveRate(vendorCode.trim(), itemMasterId.get(), asOf);
            }
            out.add(new EligiblePrLine(
                    l.id(), l.prNumber(), l.prDate() == null ? null : l.prDate().toString(), l.itemCode(), l.itemName(), l.uom(),
                    firstNonBlank(l.hsnCode(), null), l.reqQty(), l.orderedQty(), l.remaining(),
                    receivedForPrItem(l.id()), l.requiredBy(),
                    rate == null ? null : (BigDecimal) rate.get("offered_unit_price"),
                    rate == null ? null : ((java.sql.Date) rate.get("effective_from")).toLocalDate(),
                    orderedOutsidePoByPr(l)));
        }
        return out;
    }

    public List<EligiblePrLine> eligibleLines(String itemCode, String vendorCode, LocalDate poDate) {
        if (itemCode == null || itemCode.isBlank()) {
            throw new NewPoException(HttpStatus.BAD_REQUEST, "Select an item.");
        }
        List<PrLine> lines = jdbc.query(
                PR_LINE_SQL + "WHERE " + ORDERABLE_SQL + " AND pri.item_code = ? AND pri.req_qty - pri.ordered_qty > 0 " +
                "ORDER BY pr.pr_date, pri.id",
                (rs, n) -> toPrLine(rs), itemCode.trim());

        Optional<Long> itemMasterId = resolveItemMasterId(itemCode.trim());
        Map<String, Object> rate = null;
        if (vendorCode != null && !vendorCode.isBlank() && itemMasterId.isPresent()) {
            rate = rates.effectiveRate(vendorCode.trim(), itemMasterId.get(), poDate == null ? LocalDate.now() : poDate);
        }

        List<EligiblePrLine> out = new ArrayList<>();
        for (PrLine l : lines) {
            out.add(new EligiblePrLine(
                    l.id(), l.prNumber(), l.prDate() == null ? null : l.prDate().toString(), l.itemCode(), l.itemName(), l.uom(),
                    firstNonBlank(l.hsnCode(), null), l.reqQty(), l.orderedQty(), l.remaining(),
                    receivedForPrItem(l.id()), l.requiredBy(),
                    rate == null ? null : (BigDecimal) rate.get("offered_unit_price"),
                    rate == null ? null : ((java.sql.Date) rate.get("effective_from")).toLocalDate(),
                    orderedOutsidePoByPr(l)));
        }
        return out;
    }

    /**
     * Every line of one PR with its ordering and receiving status. Lines are never closed by another line's
     * status, and the PR status itself stays with the existing PR workflow.
     */
    public List<PoByPrDtos.PrLineStatus> prLineStatuses(String prNumber) {
        if (prNumber == null || prNumber.isBlank()) {
            throw bad("PR number is required.");
        }
        List<PrLine> lines = jdbc.query(PR_LINE_SQL + "WHERE pri.pr_number = ? ORDER BY pri.id",
                (rs, n) -> toPrLine(rs), prNumber.trim());
        List<PoByPrDtos.PrLineStatus> out = new ArrayList<>();
        for (PrLine l : lines) {
            BigDecimal received = receivedForPrItem(l.id());
            BigDecimal allocated = allocatedForPrItem(l.id());
            BigDecimal outside = orderedOutsidePoByPr(l);
            BigDecimal remaining = l.remaining().max(BigDecimal.ZERO);
            String ordering = l.orderedQty().signum() == 0 ? "NOT_ORDERED"
                    : remaining.signum() == 0 ? "FULLY_ORDERED" : "PARTIALLY_ORDERED";
            String receiving = received.signum() == 0 ? "NOT_RECEIVED"
                    : received.compareTo(allocated) >= 0 ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED";
            out.add(new PoByPrDtos.PrLineStatus(l.id(), l.itemCode(), l.itemName(), l.reqQty(), l.orderedQty(),
                    allocated, outside, remaining, received, allocated.subtract(received).max(BigDecimal.ZERO), ordering, receiving,
                    ProcurementReportService.lifecycle(l.reqQty(), l.orderedQty(), allocated, received)));
        }
        return out;
    }


    /**
     * Per PO item: ordered, physically received, accepted (fulfilment), rejected, pending inspection, and the
     * accepted quantity still outstanding. Rejected goods are never counted as accepted and are never shown as
     * returned: they stay on the GRN lines with disposition RETAINED_NOT_RETURNED until a return workflow exists.
     */
    public List<Map<String, Object>> receiptPosition(String poNumber, List<PurchaseItemLine> lines) {
        Map<String, BigDecimal> ordered = new LinkedHashMap<>();
        for (PurchaseItemLine l : lines) {
            ordered.merge(l.getItemCode(), l.getQuantity() == null ? BigDecimal.ZERO : l.getQuantity(), BigDecimal::add);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> e : ordered.entrySet()) {
            Map<String, Object> t = jdbc.queryForMap(
                    "SELECT COALESCE(SUM(gi.received_qty), 0) AS received, COALESCE(SUM(gi.accepted_qty), 0) AS accepted, " +
                    "COALESCE(SUM(gi.rejected_qty), 0) AS rejected, COALESCE(SUM(gi.pending_inspection_qty), 0) AS pending " +
                    "FROM public.goods_receipt_note_items gi JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                    "WHERE n.status = 'POSTED' AND gi.po_number = ? AND gi.item_code = ?", poNumber, e.getKey());
            BigDecimal accepted = (BigDecimal) t.get("accepted");
            BigDecimal rejected = (BigDecimal) t.get("rejected");
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("itemCode", e.getKey());
            row.put("orderedQty", e.getValue());
            row.put("physicallyReceivedQty", t.get("received"));
            row.put("acceptedQty", accepted);
            row.put("rejectedQty", rejected);
            row.put("pendingInspectionQty", t.get("pending"));
            row.put("outstandingAcceptedQty", e.getValue().subtract(accepted).max(BigDecimal.ZERO));
            row.put("rejectedDisposition", rejected.signum() > 0 ? "RETAINED_NOT_RETURNED" : "NONE");
            out.add(row);
        }
        return out;
    }

    /** PO origin: DIRECT and PO_BY_PR come from the stored marker; older rows are PO_BY_PR when allocations exist, else LEGACY. */
    public static String originOf(Object storedMarker, boolean noAllocations) {
        if (storedMarker != null && !String.valueOf(storedMarker).isBlank()) return String.valueOf(storedMarker);
        return noAllocations ? "LEGACY" : "PO_BY_PR";
    }
    private List<PurchaseItemLine> linesOf(Object detailsJson) {
        if (detailsJson == null) return List.of();
        try {
            return Arrays.asList(objectMapper.readValue(detailsJson.toString(), PurchaseItemLine[].class));
        } catch (Exception e) {
            throw new NewPoException(HttpStatus.INTERNAL_SERVER_ERROR, "PO lines could not be read from the database.");
        }
    }

    /** Quantity recorded through PO by PR against this PR line. */
    private BigDecimal allocatedForPrItem(long prItemId) {
        BigDecimal total = jdbc.queryForObject(
                "SELECT COALESCE(SUM(allocated_qty - released_qty), 0) FROM public.po_pr_allocations WHERE pr_item_id = ?", BigDecimal.class, prItemId);
        return total == null ? BigDecimal.ZERO : total;
    }

    /**
     * Ordered quantity on the PR line that did not come through PO by PR (legacy proposal approval, clubbing,
     * manual adjustment). It counts against the remaining quantity, but it has no PO line or allocation to
     * receive against, so it is reported separately.
     */
    private BigDecimal orderedOutsidePoByPr(PrLine l) {
        return l.orderedQty().subtract(allocatedForPrItem(l.id())).max(BigDecimal.ZERO);
    }

    /** Purchase orders raised through PO by PR, with their status read from purchase_orders (not from memory). */
    public List<Map<String, Object>> poByPrOrders() {
        return jdbc.queryForList(
                "SELECT p.po_number, p.po_date, p.vendor_code, p.vendor_name, p.status, p.grand_total, COUNT(a.id) AS allocation_count " +
                "FROM public.purchase_orders p JOIN public.po_pr_allocations a ON a.po_number = p.po_number " +
                "GROUP BY p.po_number, p.po_date, p.vendor_code, p.vendor_name, p.status, p.grand_total, p.created_at " +
                "ORDER BY p.created_at DESC, p.po_number DESC LIMIT 500");
    }

    /**
     * One PO from the database. origin is PO_BY_PR when allocation records exist; otherwise it is LEGACY, and
     * its receipts are not attributed to PR lines because there is nothing to attribute them to.
     */
    public Map<String, Object> poDetail(String poNumber) {
        List<Map<String, Object>> header = jdbc.queryForList(
                "SELECT po_number, po_date, vendor_code, vendor_name, status, grand_total, taxable_amount, total_tax, details_json, created_at, po_origin " +
                "FROM public.purchase_orders WHERE po_number = ?", poNumber.trim());
        if (header.isEmpty()) throw new NewPoException(HttpStatus.NOT_FOUND, "PO " + poNumber + " was not found.");
        Map<String, Object> h = header.get(0);

        List<Map<String, Object>> allocations = jdbc.queryForList(
                "SELECT id, pr_item_id, pr_number, item_code, allocated_qty, unit_price, rate_id FROM public.po_pr_allocations " +
                "WHERE po_number = ? ORDER BY id", poNumber.trim());
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map<String, Object> a : allocations) {
            BigDecimal received = jdbc.queryForObject(
                    "SELECT COALESCE(SUM(g.accepted_qty), 0) FROM public.grn_item_allocations g " +
                    "JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id " +
                    "JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                    "WHERE g.allocation_id = ? AND n.status = 'POSTED'",
                    BigDecimal.class, ((Number) a.get("id")).longValue());
            Map<String, Object> row = new LinkedHashMap<>(a);
            row.put("receivedQty", received == null ? BigDecimal.ZERO : received);
            rows.add(row);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("poNumber", h.get("po_number"));
        out.put("poDate", h.get("po_date"));
        out.put("vendorCode", h.get("vendor_code"));
        out.put("vendorName", h.get("vendor_name"));
        out.put("status", h.get("status"));
        out.put("grandTotal", h.get("grand_total"));
        out.put("origin", originOf(h.get("po_origin"), rows.isEmpty()));
        out.put("allocations", rows);
        List<PurchaseItemLine> lines = linesOf(h.get("details_json"));
        out.put("lines", lines);
        out.put("terms", poTerms.find(poNumber.trim()));
        out.put("receiptPosition", receiptPosition(poNumber.trim(), lines));
        return out;
    }

    /** Receipts recorded against this PR line, attributed from the POSTED GRNs of every PO it was ordered on. */
    public BigDecimal receivedForPrItem(long prItemId) {
        BigDecimal total = jdbc.queryForObject(
                "SELECT COALESCE(SUM(g.accepted_qty), 0) FROM public.grn_item_allocations g " +
                "JOIN public.po_pr_allocations a ON a.id = g.allocation_id " +
                "JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id " +
                "JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                "WHERE a.pr_item_id = ? AND n.status = 'POSTED'", BigDecimal.class, prItemId);
        return total == null ? BigDecimal.ZERO : total;
    }

    // ------------------------------------------------------------------ cancellation

    /**
     * Cancels a PO raised through PO by PR. Releases exactly the quantity each allocation still reserves, in the
     * same transaction, and writes an audit row to po_revisions.
     *
     * Rules: the PO row is locked first, so a retry or a concurrent cancel waits and then sees CANCELLED (409,
     * nothing released twice). A PO with any posted receipt is refused (409): receipts are never released
     * automatically, and receipt reversal is not supported yet.
     */
    @Transactional
    public Map<String, Object> cancel(String poNumber, String actor, String reason) {
        if (actor == null || actor.isBlank()) {
            throw new NewPoException(HttpStatus.UNAUTHORIZED, "Missing current user (X-User-Name header).");
        }
        String po = poNumber == null ? "" : poNumber.trim();
        List<Map<String, Object>> header = jdbc.queryForList(
                "SELECT status FROM public.purchase_orders WHERE po_number = ? FOR UPDATE", po);
        if (header.isEmpty()) {
            throw new NewPoException(HttpStatus.NOT_FOUND, "PO " + po + " was not found.");
        }
        String status = String.valueOf(header.get(0).get("status"));
        if ("CANCELLED".equalsIgnoreCase(status)) {
            throw conflict("PO " + po + " is already cancelled. Nothing was released again.");
        }
        // Lock allocations in PR-line order (the same order every other reservation uses) to avoid deadlocks.
        List<Map<String, Object>> allocs = jdbc.queryForList(
                "SELECT id, pr_item_id, allocated_qty, released_qty FROM public.po_pr_allocations WHERE po_number = ? ORDER BY pr_item_id FOR UPDATE", po);
        if (allocs.isEmpty()) {
            throw new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "PO " + po + " was not raised through PO by PR, so this cancellation does not apply to it.");
        }
        // Any physical receipt (accepted or rejected) blocks cancellation: a rejected delivery is still in the store.
        BigDecimal received = jdbc.queryForObject(
                "SELECT COALESCE(SUM(gi.received_qty), 0) FROM public.goods_receipt_note_items gi " +
                "JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                "WHERE gi.po_number = ? AND n.status = 'POSTED'", BigDecimal.class, po);
        if (received != null && received.signum() > 0) {
            throw conflict("PO " + po + " has " + received.stripTrailingZeros().toPlainString()
                    + " received. It cannot be cancelled: receipts are never released automatically, and receipt reversal is not supported yet.");
        }

        BigDecimal releasedTotal = BigDecimal.ZERO;
        for (Map<String, Object> a : allocs) {
            long allocationId = ((Number) a.get("id")).longValue();
            long prItemId = ((Number) a.get("pr_item_id")).longValue();
            BigDecimal net = ((BigDecimal) a.get("allocated_qty")).subtract((BigDecimal) a.get("released_qty"));
            if (net.signum() > 0) {
                prService.releaseOrdered(prItemId, net);
                releasedTotal = releasedTotal.add(net);
            }
            jdbc.update("UPDATE public.po_pr_allocations SET released_qty = allocated_qty WHERE id = ?", allocationId);
        }

        String cancelledBy = actor.trim();
        String why = reason == null || reason.isBlank() ? "Cancelled" : reason.trim();
        jdbc.update("UPDATE public.purchase_orders SET status = 'CANCELLED', remarks = COALESCE(remarks, '') || ?, updated_at = NOW() WHERE po_number = ?",
                " | Cancelled by " + cancelledBy + ": " + why, po);

        Integer rev = jdbc.queryForObject(
                "SELECT COALESCE(MAX(revision_number), 0) + 1 FROM public.po_revisions WHERE po_number = ?", Integer.class, po);
        String changes;
        try {
            changes = objectMapper.writeValueAsString(Map.of("fromStatus", status, "toStatus", "CANCELLED",
                    "releasedQty", releasedTotal.toPlainString()));
        } catch (Exception e) {
            throw new NewPoException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not write the cancellation audit record.");
        }
        jdbc.update("INSERT INTO public.po_revisions (po_number, revision_number, changed_by, change_reason, changes_json) VALUES (?, ?, ?, ?, ?)",
                po, rev == null ? 1 : rev, cancelledBy, why, changes);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                purchaseProcessing.loadOrdersFromDb();
            }
        });
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("poNumber", po);
        result.put("status", "CANCELLED");
        result.put("releasedQty", releasedTotal);
        return result;
    }

    // ------------------------------------------------------------------ preview and create

    /** Validates and prices the order exactly as create would, without writing anything. */
    public PlannedPo preview(CreatePoRequest request) {
        return plan(request, false).po();
    }

    /**
     * Creates the PO, its PR allocations and the PR quantity updates in one transaction. Any failure
     * rolls all of them back, so a PR line is never ordered without its PO or the reverse.
     */
    @Transactional
    public CreatedPo create(CreatePoRequest request, String actor) {
        if (actor == null || actor.isBlank()) {
            throw new NewPoException(HttpStatus.UNAUTHORIZED, "Missing current user (X-User-Name header).");
        }
        Plan plan = plan(request, true);

        String poNumber = purchaseProcessing.reservePoNumber();
        String poId = "PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        insertPurchaseOrder(poId, poNumber, plan, actor);
        poTerms.save(poNumber, request.terms(), request.deliveryFreight());
        purchaseProcessing.saveDeliverySchedules(poNumber, DeliveryLots.toRows(poNumber, request.schedules()));

        for (AllocRow a : plan.allocs()) {
            jdbc.update(
                    "INSERT INTO public.po_pr_allocations (po_number, pr_item_id, pr_number, item_code, allocated_qty, unit_price, rate_id, created_by) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    poNumber, a.prItemId(), a.prNumber(), a.itemCode(), a.qty(), a.price(), a.rateId(), actor.trim());
            // Same rule as every other reservation: the PR line is locked and checked, then the quantity is reserved.
            prService.reserveOrdered(a.prItemId(), a.qty());
        }

        // The existing PO screens read an in-memory copy of purchase_orders. Refresh it once the
        // transaction has committed, so the new PO is visible there and to GRN.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                purchaseProcessing.loadOrdersFromDb();
            }
        });
        return new CreatedPo(poNumber, poId, plan.po());
    }

    // ------------------------------------------------------------------ validation and pricing

    private Plan plan(CreatePoRequest r, boolean lockRows) {
        String vendorCode = r.vendorCode() == null ? "" : r.vendorCode().trim();
        if (vendorCode.isEmpty()) throw bad("Select a vendor from the Vendor Master.");
        List<Map<String, Object>> sup = jdbc.queryForList(
                "SELECT status FROM public.supplier_master WHERE supplier_code = ?", vendorCode);
        if (sup.isEmpty()) throw bad("Vendor " + vendorCode + " was not found in the Vendor Master.");
        if (!"ACTIVE".equalsIgnoreCase(String.valueOf(sup.get(0).get("status")))) {
            throw bad("Vendor " + vendorCode + " is not active.");
        }

        LocalDate poDate = r.poDate() == null ? LocalDate.now() : r.poDate();
        if (poDate.isBefore(LocalDate.now())) throw bad("PO date cannot be in the past. Select today or a future date.");
        Mode mode = parseMode(r.mode());
        String termsError = poTerms.validate(r.terms());
        if (termsError != null) throw bad(termsError);
        for (BigDecimal charge : Arrays.asList(r.deliveryFreight(), r.otherCharges())) {
            if (charge != null && charge.signum() < 0) throw bad("Freight and other charges cannot be negative.");
        }
        List<LineRequest> requested = r.lines();
        if (requested == null || requested.isEmpty()) throw bad("Add at least one PR line to the PO.");

        Set<Long> seen = new HashSet<>();
        for (LineRequest l : requested) {
            if (l == null || l.prItemId() == null) throw bad("Every PO line must reference a PR line.");
            if (!seen.add(l.prItemId())) throw bad("PR line " + l.prItemId() + " is listed more than once.");
        }

        Map<Long, PrLine> prLines = loadPrLines(seen, lockRows);
        List<AllocRow> allocs = new ArrayList<>();
        Map<String, BigDecimal> qtyByItem = new LinkedHashMap<>();
        Map<String, PrLine> firstLineByItem = new LinkedHashMap<>();

        for (LineRequest l : requested) {
            PrLine pl = prLines.get(l.prItemId());
            if (pl == null) throw new NewPoException(HttpStatus.NOT_FOUND, "PR line " + l.prItemId() + " was not found.");
            if (!ORDERABLE_PR_STATUSES.contains(pl.prStatus())) {
                throw conflict("PR " + pl.prNumber() + " is " + pl.prStatus() + " and cannot be ordered. Only approved PRs can be ordered.");
            }
            BigDecimal remaining = pl.remaining();
            if (remaining.signum() <= 0) {
                throw conflict("PR " + pl.prNumber() + " / " + pl.itemCode() + " is already fully ordered.");
            }
            BigDecimal qty;
            if (mode == Mode.FULL) {
                qty = remaining;
            } else {
                qty = l.quantity();
                if (qty == null || qty.signum() <= 0) throw bad("Purchase quantity for " + pl.prNumber() + " / " + pl.itemCode() + " must be greater than zero.");
                if (qty.scale() > 2) throw bad("Purchase quantity can have at most 2 decimal places.");
                if (qty.compareTo(remaining) > 0) {
                    throw conflict("Purchase quantity " + qty.stripTrailingZeros().toPlainString() + " for " + pl.prNumber() + " / " + pl.itemCode()
                            + " exceeds the remaining " + remaining.stripTrailingZeros().toPlainString() + ".");
                }
            }
            BigDecimal discountPct = l.discountPercent() == null ? BigDecimal.ZERO : l.discountPercent();
            BigDecimal manualDisc = l.manualDiscount() == null ? BigDecimal.ZERO : l.manualDiscount();
            if (discountPct.signum() < 0 || discountPct.compareTo(new BigDecimal("100")) > 0) {
                throw bad("Discount % for " + pl.prNumber() + " / " + pl.itemCode() + " must be between 0 and 100.");
            }
            if (manualDisc.signum() < 0) throw bad("Discount amount for " + pl.prNumber() + " / " + pl.itemCode() + " cannot be negative.");
            allocs.add(new AllocRow(pl.id(), pl.prNumber(), pl.itemCode(), qty, null, 0L, discountPct, manualDisc, trimOrNull(l.remarks())));
            qtyByItem.merge(pl.itemCode(), qty, BigDecimal::add);
            firstLineByItem.putIfAbsent(pl.itemCode(), pl);
        }

        // One PO line per item, so GRN (which receives by PO and item) counts every receipt once.
        List<PurchaseItemLine> calcItems = new ArrayList<>();
        Map<String, Long> rateIdByItem = new HashMap<>();
        Map<String, BigDecimal> priceByItem = new HashMap<>();
        for (Map.Entry<String, BigDecimal> e : qtyByItem.entrySet()) {
            String itemCode = e.getKey();
            PrLine any = firstLineByItem.get(itemCode);
            Long itemMasterId = resolveItemMasterId(itemCode).orElseThrow(() ->
                    new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY, "Item " + itemCode + " is not in the Item Master."));

            Map<String, Object> rate = rates.effectiveRate(vendorCode, itemMasterId, poDate);
            if (rate == null) {
                throw new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "No vendor rate for " + itemCode + " from " + vendorCode + " is effective on " + poDate
                        + ". Add the rate in Vendor Rate Master first.");
            }
            BigDecimal price = (BigDecimal) rate.get("offered_unit_price");
            rateIdByItem.put(itemCode, ((Number) rate.get("id")).longValue());
            priceByItem.put(itemCode, price);

            String hsn = firstNonBlank(any.hsnCode(), itemMasterHsn(itemMasterId));
            if (hsn == null) {
                throw new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "HSN code is missing for " + itemCode + ". Add it in Item Master before ordering.");
            }
            Integer activeHsn = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM public.hsn_tax_master WHERE hsn_sac_code = ? AND is_active = TRUE", Integer.class, hsn);
            if (activeHsn == null || activeHsn == 0) {
                throw new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "HSN " + hsn + " for " + itemCode + " has no active GST rate in HSN Tax Master.");
            }

            PurchaseItemLine line = new PurchaseItemLine();
            line.setItemCode(itemCode);
            line.setItemName(any.itemName());
            line.setDescription(any.itemName());
            line.setCategory(any.category());
            line.setUom(any.uom());
            line.setVendorCode(vendorCode);
            line.setQuantity(e.getValue());
            line.setUnitRate(price);
            line.setHsnCode(hsn);

            // Discounts entered on each PR line become one discount amount on the item's PO line.
            BigDecimal itemDiscount = BigDecimal.ZERO;
            List<String> remarkParts = new ArrayList<>();
            for (AllocRow a : allocs) {
                if (!a.itemCode().equals(itemCode)) continue;
                if (a.discountPercent().signum() > 0) {
                    itemDiscount = itemDiscount.add(a.qty().multiply(price).multiply(a.discountPercent())
                            .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
                }
                itemDiscount = itemDiscount.add(a.manualDiscount());
                if (a.remarks() != null) remarkParts.add(a.prNumber() + ": " + a.remarks());
            }
            line.setDiscountPercent(null);
            line.setManualDiscount(itemDiscount);
            line.setRemarks(remarkParts.isEmpty() ? null : String.join(" | ", remarkParts));
            calcItems.add(line);
        }

        // The existing calculator does HSN and GST lookup, CGST/SGST vs IGST by vendor state, and line totals.
        PurchaseCalculationRequest calcRequest = new PurchaseCalculationRequest();
        calcRequest.setItems(calcItems);
        // PO-level freight, other charges and round off go to the vendor group, as the existing PO flows do.
        Map<String, VendorExtraCharges> vendorCharges = new HashMap<>();
        vendorCharges.put(vendorCode, new VendorExtraCharges(r.deliveryFreight(), r.otherCharges(), r.roundOff()));
        calcRequest.setVendorCharges(vendorCharges);
        PurchaseCalculationResponse calc = purchaseProcessing.calculate(calcRequest);
        if (calc.getVendorGroups() == null || calc.getVendorGroups().isEmpty()) {
            throw new NewPoException(HttpStatus.INTERNAL_SERVER_ERROR, "GST calculation returned no vendor summary.");
        }
        VendorSummaryGroup group = calc.getVendorGroups().get(0);

        List<PlannedLine> plannedLines = new ArrayList<>();
        for (PurchaseItemLine l : calc.getItems()) {
            plannedLines.add(new PlannedLine(l.getItemCode(), l.getItemName(), l.getUom(), l.getHsnCode(), l.getQuantity(),
                    l.getUnitRate(), l.getTaxPercent(), l.getTaxType(), l.getDiscountAmount(), l.getTaxableAmount(), l.getCgstAmount(),
                    l.getSgstAmount(), l.getIgstAmount(), l.getTaxAmount(), l.getItemTotal(), l.getRemarks()));
        }

        List<AllocRow> finalAllocs = new ArrayList<>();
        List<PlannedAllocation> plannedAllocs = new ArrayList<>();
        for (AllocRow a : allocs) {
            AllocRow priced = new AllocRow(a.prItemId(), a.prNumber(), a.itemCode(), a.qty(),
                    priceByItem.get(a.itemCode()), rateIdByItem.get(a.itemCode()), a.discountPercent(), a.manualDiscount(), a.remarks());
            finalAllocs.add(priced);
            plannedAllocs.add(new PlannedAllocation(a.prItemId(), a.prNumber(), a.itemCode(), a.qty(), priced.price()));
        }

        PlannedPo po = new PlannedPo(vendorCode, group.getVendorName(), group.getVendorGstin(), poDate, plannedLines,
                plannedAllocs, group.getItemsGross(), group.getTotalDiscount(), group.getTaxableAmount(), group.getTotalTax(),
                group.getDeliveryFreight(), group.getOtherCharges(), group.getRoundOff(), group.getVendorTotal());

        Map<String, BigDecimal> poQtyByItem = new HashMap<>();
        for (AllocRow a : finalAllocs) poQtyByItem.merge(a.itemCode(), a.qty(), BigDecimal::add);
        DeliveryLots.validate(r.schedules(), poQtyByItem, poDate);

        Set<String> prNumbers = new LinkedHashSet<>();
        for (AllocRow a : finalAllocs) prNumbers.add(a.prNumber());
        PrLine firstPr = prLines.get(requested.get(0).prItemId());
        String headerPr = prNumbers.size() == 1 ? prNumbers.iterator().next() : null;
        String headerPrDate = headerPr == null || firstPr.prDate() == null ? null : firstPr.prDate().toString();

        return new Plan(po, finalAllocs, calc.getItems(), group, headerPr, headerPrDate,
                firstPr.department(), firstPr.requisitioner(), trimOrNull(r.remarks()));
    }

    private Map<Long, PrLine> loadPrLines(Set<Long> ids, boolean lock) {
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        List<PrLine> rows = jdbc.query(
                PR_LINE_SQL + "WHERE pri.id IN (" + placeholders + ") ORDER BY pri.id" + (lock ? " FOR UPDATE OF pri" : ""),
                (rs, n) -> toPrLine(rs), ids.toArray());
        Map<Long, PrLine> byId = new HashMap<>();
        for (PrLine r : rows) byId.put(r.id(), r);
        return byId;
    }

    private void insertPurchaseOrder(String poId, String poNumber, Plan plan, String actor) {
        PlannedPo po = plan.po();
        VendorSummaryGroup g = plan.group();
        String detailsJson;
        try {
            detailsJson = objectMapper.writeValueAsString(plan.calcItems());
        } catch (Exception e) {
            throw new NewPoException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not serialise PO lines: " + e.getMessage());
        }
        String poDate = po.poDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
        try {
            jdbc.update(
                    "INSERT INTO public.purchase_orders (id, po_number, po_date, pr_number, pr_date, department, requested_by, " +
                    "vendor_code, vendor_name, vendor_gstin, vendor_pan, contact_person, phone, email, billing_address, shipping_address, " +
                    "payment_terms, status, items_gross, total_discount, taxable_amount, total_tax, delivery_charges, other_charges, " +
                    "round_off, grand_total, remarks, approved_by, approved_at, details_json, po_type, created_at, updated_at, po_origin) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'STANDARD', NOW(), NOW(), 'PO_BY_PR')",
                    poId, poNumber, poDate, plan.headerPrNumber(), plan.headerPrDate(), plan.department(), plan.requisitioner(),
                    po.vendorCode(), po.vendorName(), po.vendorGstin(), g.getVendorPan(), g.getContactPerson(), g.getPhone(), g.getEmail(),
                    PurchaseProcessingService.COMPANY_BILLING_ADDRESS,
                    g.getAddress() != null ? g.getAddress() : "Silver Muller Central Warehouse, Plant 1, Silvassa",
                    g.getPaymentTerms() != null ? g.getPaymentTerms() : "Net 30 Days from MRN",
                    po.itemsGross(), po.totalDiscount(), po.taxableAmount(), po.totalTax(), po.deliveryCharges(), po.otherCharges(),
                    po.roundOff(), po.grandTotal(), "Generated from PO by PR" + (plan.remarks() == null ? "" : " | " + plan.remarks()), actor.trim(),
                    LocalDate.now().toString(), detailsJson);
        } catch (DataIntegrityViolationException e) {
            throw new NewPoException(HttpStatus.CONFLICT, "PO number " + poNumber + " was already used. Try again.");
        }
    }

    // ------------------------------------------------------------------ helpers

    private PrLine toPrLine(java.sql.ResultSet rs) throws java.sql.SQLException {
        java.sql.Date d = rs.getDate("pr_date");
        return new PrLine(rs.getLong("id"), rs.getString("pr_number"), d == null ? null : d.toLocalDate(),
                rs.getString("item_code"), rs.getString("item_name"), rs.getString("uom"), rs.getString("category"),
                rs.getString("hsn_code"), rs.getBigDecimal("req_qty"), rs.getBigDecimal("ordered_qty"),
                rs.getString("required_by_date"), rs.getString("pr_status"), rs.getString("department"),
                rs.getString("requisitioner"));
    }

    private Optional<Long> resolveItemMasterId(String itemCode) {
        List<Long> ids = jdbc.queryForList(
                "SELECT id FROM public.item_master WHERE sms_new_part_no = ? OR old_code = ? " +
                "ORDER BY (sms_new_part_no = ?) DESC, id LIMIT 1", Long.class, itemCode, itemCode, itemCode);
        return ids.isEmpty() ? Optional.empty() : Optional.of(ids.get(0));
    }

    private String itemMasterHsn(long itemMasterId) {
        List<String> rows = jdbc.queryForList("SELECT hsn_code FROM public.item_master WHERE id = ?", String.class, itemMasterId);
        return rows.isEmpty() ? null : firstNonBlank(rows.get(0), null);
    }

    private static Mode parseMode(String mode) {
        if (mode == null) throw bad("Choose Purchase Fully or Partially Ordered.");
        try {
            return Mode.valueOf(mode.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw bad("Mode must be FULL or PARTIAL.");
        }
    }

    private static String trimOrNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
        return null;
    }

    private static NewPoException bad(String message) {
        return new NewPoException(HttpStatus.BAD_REQUEST, message);
    }

    private static NewPoException conflict(String message) {
        return new NewPoException(HttpStatus.CONFLICT, message);
    }
}
