package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatePoRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatedPo;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.LineRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedPo;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.AssignLine;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.AssignRequest;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ConvertLine;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ConvertRequest;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ReleaseLine;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ReleaseRequest;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import com.silvermuller.seals.modules.purchase.service.ProcurementAudit;
import com.silvermuller.seals.modules.purchase.service.PurchaseRequisitionService;
import com.silvermuller.seals.modules.purchase.service.QuantityRules;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Sourcing: approved PR demand clubbed by item, vendor suggestions from the Supplier Master item links and the
 * Vendor Rate Master, vendor-wise draft POs that reserve PR quantity, and conversion of a draft into a PO by PR.
 *
 * Quantities for one PR line (purchase_requisition_items):
 *   ready for sourcing = req_qty - ordered_qty - drafted_qty   (only on Approved / Partially Ordered PRs)
 *   remaining to order = req_qty - ordered_qty                  (includes what is still in drafts)
 * drafted_qty is changed only through PurchaseRequisitionService.reserveDrafted / releaseDrafted, which lock the
 * PR line, so the same quantity can never be in two drafts, or in a draft and on a PO.
 *
 * Lock order (every write): vendor advisory lock (assign only) -> draft row -> draft lines -> PR lines by id.
 * PO by PR create, called during conversion, then locks the same PR lines again in the same transaction.
 *
 * A draft never becomes a PO by itself: the buyer converts it, choosing per PR line how much to purchase now.
 */
@Service
public class SourcingService {

    private static final String ORDERABLE_SQL = "pr.status IN ('Approved', 'Partially Ordered')";
    private static final Set<String> ORDERABLE = Set.of("Approved", "Partially Ordered");

    private final JdbcTemplate jdbc;
    private final PurchaseRequisitionService prService;
    private final PoByPrService poByPr;
    private final VendorRateService rates;

    public SourcingService(JdbcTemplate jdbc, PurchaseRequisitionService prService, PoByPrService poByPr, VendorRateService rates) {
        this.jdbc = jdbc;
        this.prService = prService;
        this.poByPr = poByPr;
        this.rates = rates;
    }

    // ================================================================== clubbed demand

    /**
     * Approved demand that is ready for sourcing, one row per item code + unit. PR lines are only grouped for
     * display; every source PR line stays a separate record and is listed under its item.
     */
    public List<Map<String, Object>> clubbedDemand(String q, String department) {
        String like = blank(q) ? null : "%" + q.trim() + "%";
        String dept = blank(department) ? null : department.trim();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT pri.id, pri.pr_number, pr.pr_date, pr.department, pr.requisitioner, pri.item_code, pri.item_name, " +
                "TRIM(pri.uom) AS uom, pri.hsn_code, pri.req_qty, pri.ordered_qty, pri.drafted_qty, pri.required_by_date " +
                "FROM public.purchase_requisition_items pri JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id " +
                "WHERE " + ORDERABLE_SQL + " AND pri.req_qty - pri.ordered_qty - pri.drafted_qty > 0 " +
                "AND (CAST(? AS VARCHAR) IS NULL OR pri.item_code ILIKE ? OR pri.item_name ILIKE ?) " +
                "AND (CAST(? AS VARCHAR) IS NULL OR pr.department = ?) " +
                "ORDER BY pri.item_code, UPPER(TRIM(pri.uom)), pr.pr_date, pri.id LIMIT 5000",
                like, like, like, dept, dept);

        Map<String, Map<String, Object>> groups = new LinkedHashMap<>();
        for (Map<String, Object> r : rows) {
            String code = str(r.get("item_code"));
            String uom = str(r.get("uom"));
            Map<String, Object> g = groups.computeIfAbsent(code + "\u0000" + uom.toUpperCase(Locale.ROOT), k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("itemCode", code);
                m.put("itemName", r.get("item_name"));
                m.put("uom", uom);
                m.put("hsnCode", r.get("hsn_code"));
                m.put("clubbedQty", BigDecimal.ZERO);
                m.put("requestedQty", BigDecimal.ZERO);
                m.put("sources", new ArrayList<Map<String, Object>>());
                return m;
            });
            BigDecimal req = num(r.get("req_qty")), ordered = num(r.get("ordered_qty")), drafted = num(r.get("drafted_qty"));
            BigDecimal ready = req.subtract(ordered).subtract(drafted);
            g.put("clubbedQty", num(g.get("clubbedQty")).add(ready));
            g.put("requestedQty", num(g.get("requestedQty")).add(req));
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("prItemId", ((Number) r.get("id")).longValue());
            s.put("prNumber", r.get("pr_number"));
            s.put("prDate", r.get("pr_date"));
            s.put("department", r.get("department"));
            s.put("requisitioner", r.get("requisitioner"));
            s.put("requiredByDate", r.get("required_by_date"));
            s.put("requestedQty", req);
            s.put("orderedQty", ordered);
            s.put("draftedQty", drafted);
            s.put("readyQty", ready);
            sourcesOf(g).add(s);
        }

        Map<String, Map<String, Object>> items = resolveItems(groups.values().stream().map(g -> str(g.get("itemCode"))).toList());
        List<Long> itemIds = items.values().stream().map(i -> ((Number) i.get("id")).longValue()).distinct().toList();
        Map<Long, List<Map<String, Object>>> options = vendorOptions(itemIds, LocalDate.now());
        Map<String, String> openDrafts = openDraftsByVendor();
        Map<String, BigDecimal> gstByHsn = gstRates(groups.values().stream()
                .map(g -> hsnOfGroup(g, items)).filter(h -> !h.isEmpty()).distinct().toList());

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> g : groups.values()) {
            List<Map<String, Object>> sources = sourcesOf(g);
            Set<String> prs = new LinkedHashSet<>(), depts = new LinkedHashSet<>();
            for (Map<String, Object> s : sources) {
                prs.add(str(s.get("prNumber")));
                if (s.get("department") != null) depts.add(str(s.get("department")));
            }
            g.put("prCount", prs.size());
            g.put("prNumbers", new ArrayList<>(prs));
            g.put("departments", new ArrayList<>(depts));

            Map<String, Object> item = items.get(str(g.get("itemCode")));
            g.put("inItemMaster", item != null);
            List<Map<String, Object>> vendors = item == null ? List.of() : options.getOrDefault(((Number) item.get("id")).longValue(), List.of());
            g.put("vendorCount", vendors.size());
            String hsn = hsnOfGroup(g, items);
            g.put("gstRatePercent", gstByHsn.get(hsn));
            g.put("vendors", item == null ? List.of() : vendorList(item, hsn, vendors, openDrafts, gstByHsn.get(hsn)));
            Map<String, Object> best = vendors.stream().filter(v -> v.get("offered_unit_price") != null).findFirst().orElse(null);
            if (best != null) {
                BigDecimal price = num(best.get("offered_unit_price"));
                Map<String, Object> sv = new LinkedHashMap<>();
                sv.put("vendorCode", best.get("supplier_code"));
                sv.put("vendorName", best.get("supplier_name"));
                sv.put("unitPrice", price);
                sv.put("rateEffectiveFrom", best.get("effective_from"));
                g.put("suggestedVendor", sv);
                g.put("estimatedValue", price.multiply(num(g.get("clubbedQty"))).setScale(2, RoundingMode.HALF_UP));
            } else {
                g.put("suggestedVendor", null);
                g.put("estimatedValue", null);
            }
            g.put("nextAction", item == null ? "Item is not in the Item Master; it cannot be sourced."
                    : vendors.isEmpty() ? "Link a vendor to this item in the Supplier Master."
                    : best == null ? "Add a vendor rate in the Vendor Rate Master."
                    : "Choose a vendor and add to its draft PO.");
            out.add(g);
        }
        return out;
    }

    /**
     * Vendors for one item: every active vendor linked to the item in the Supplier Master, with its rate from the
     * Vendor Rate Master effective today. Cheapest vendor with a rate first; it is marked recommended. Suggestions
     * never create anything.
     */
    public Map<String, Object> vendorSuggestions(String itemCode, String uom) {
        String code = required(itemCode, "Select an item.");
        Map<String, Object> item = resolveItems(List.of(code)).get(code);
        if (item == null) throw new NewPoException(HttpStatus.NOT_FOUND, "Item " + code + " is not in the Item Master.");
        long itemId = ((Number) item.get("id")).longValue();
        String hsn = str(item.get("hsn_code"));
        BigDecimal gst = hsn.isEmpty() ? null : gstRates(List.of(hsn)).get(hsn);

        List<Map<String, Object>> options = vendorOptions(List.of(itemId), LocalDate.now()).getOrDefault(itemId, List.of());
        List<Map<String, Object>> vendors = vendorList(item, hsn, options, openDraftsByVendor(), gst);

        BigDecimal ready = BigDecimal.ZERO;
        if (!blank(uom)) {
            ready = jdbc.queryForObject(
                    "SELECT COALESCE(SUM(pri.req_qty - pri.ordered_qty - pri.drafted_qty), 0) FROM public.purchase_requisition_items pri " +
                    "JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id WHERE " + ORDERABLE_SQL +
                    " AND pri.item_code = ? AND UPPER(TRIM(pri.uom)) = UPPER(TRIM(?)) AND pri.req_qty - pri.ordered_qty - pri.drafted_qty > 0",
                    BigDecimal.class, code, uom);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("itemCode", code);
        out.put("itemName", item.get("description_size"));
        out.put("itemMasterId", itemId);
        out.put("uom", blank(uom) ? item.get("uom") : uom.trim());
        out.put("hsnCode", hsn.isEmpty() ? null : hsn);
        out.put("gstRatePercent", gst);
        out.put("readyQty", ready);
        out.put("vendors", vendors);
        out.put("message", vendors.isEmpty() ? "No active vendor is linked to this item in the Supplier Master." : null);
        return out;
    }

    /**
     * Vendor comparison rows for one item, in the order vendorOptions returns them (rated vendors cheapest first, then
     * unrated). The first rated vendor is marked recommended.
     */
    private List<Map<String, Object>> vendorList(Map<String, Object> item, String hsn, List<Map<String, Object>> options,
                                                 Map<String, String> openDrafts, BigDecimal gst) {
        // A lead time of 0 is the empty default, not a real lead time.
        BigDecimal leadTime = positive(item.get("procurement_lead_time"));
        if (leadTime == null) leadTime = positive(item.get("total_lead_time"));
        List<Map<String, Object>> vendors = new ArrayList<>();
        boolean recommendedSet = false;
        for (Map<String, Object> o : options) {
            BigDecimal price = o.get("offered_unit_price") == null ? null : num(o.get("offered_unit_price"));
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("vendorCode", o.get("supplier_code"));
            v.put("vendorName", o.get("supplier_name"));
            v.put("vendorGstin", o.get("gstin"));
            v.put("vendorState", o.get("state"));
            v.put("paymentTerms", o.get("payment_terms_id"));
            v.put("hasRate", price != null);
            v.put("unitPrice", price);
            v.put("rateId", o.get("rate_id"));
            v.put("rateEffectiveFrom", o.get("effective_from"));
            v.put("rateRecordedAt", o.get("rate_created_at"));
            v.put("uom", item.get("uom"));
            v.put("hsnCode", hsn.isEmpty() ? null : hsn);
            v.put("gstRatePercent", gst);
            v.put("unitPriceWithGst", price == null || gst == null ? null
                    : price.multiply(BigDecimal.ONE.add(gst.divide(new BigDecimal("100")))).setScale(2, RoundingMode.HALF_UP));
            v.put("itemLeadTimeDays", leadTime);
            v.put("openDraftNumber", openDrafts.get(str(o.get("supplier_code"))));
            boolean recommended = price != null && !recommendedSet;
            if (recommended) recommendedSet = true;
            v.put("recommended", recommended);
            vendors.add(v);
        }
        return vendors;
    }

    private Map<String, String> openDraftsByVendor() {
        Map<String, String> out = new HashMap<>();
        for (Map<String, Object> d : jdbc.queryForList("SELECT vendor_code, draft_number FROM public.po_drafts WHERE status = 'OPEN'")) {
            out.put(str(d.get("vendor_code")), str(d.get("draft_number")));
        }
        return out;
    }

    /** HSN for a clubbed group: the PR line's HSN first (as PO by PR does), then the Item Master's. */
    private static String hsnOfGroup(Map<String, Object> group, Map<String, Map<String, Object>> items) {
        String hsn = str(group.get("hsnCode"));
        if (!hsn.isEmpty()) return hsn;
        Map<String, Object> im = items.get(str(group.get("itemCode")));
        return im == null ? "" : str(im.get("hsn_code"));
    }

    // ================================================================== drafts

    /**
     * Adds several items to vendor drafts in ONE transaction: either every item is drafted or none is. Requests are
     * processed in vendor / item order so concurrent batches take their locks in the same order.
     */
    @Transactional
    public List<Map<String, Object>> assignBatch(List<AssignRequest> requests, String actor) {
        requireActor(actor);
        if (requests == null || requests.isEmpty()) throw bad("Select at least one item to add to a draft.");
        List<AssignRequest> ordered = new ArrayList<>(requests);
        ordered.sort(Comparator.comparing((AssignRequest r) -> r == null ? "" : str(r.vendorCode()))
                .thenComparing(r -> r == null ? "" : str(r.itemCode())));
        Map<String, Map<String, Object>> byDraft = new LinkedHashMap<>();
        for (AssignRequest r : ordered) {
            Map<String, Object> d = assign(r, actor);
            byDraft.put(str(d.get("draftNumber")), d);
        }
        return new ArrayList<>(byDraft.values());
    }

    /**
     * Puts ready PR quantity for one item into the vendor's open draft (creating the draft if the vendor has none).
     * The vendor must be active, linked to the item in the Supplier Master, and have a rate effective today.
     */
    @Transactional
    public Map<String, Object> assign(AssignRequest r, String actor) {
        requireActor(actor);
        if (r == null) throw bad("Request body is required.");
        String vendorCode = required(r.vendorCode(), "Select a vendor.");
        String itemCode = required(r.itemCode(), "Select an item.");
        String uom = required(r.uom(), "Unit of measurement is required.");

        Map<String, Object> vendor = activeVendor(vendorCode);
        Map<String, Object> item = resolveItems(List.of(itemCode)).get(itemCode);
        if (item == null) throw unprocessable("Item " + itemCode + " is not in the Item Master.");
        long itemId = ((Number) item.get("id")).longValue();
        Integer linked = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.supplier_item WHERE supplier_id = ? AND item_id = ?", Integer.class,
                ((Number) vendor.get("id")).longValue(), itemId);
        if (linked == null || linked == 0) {
            throw unprocessable(vendor.get("supplier_name") + " is not linked to " + itemCode
                    + " in the Supplier Master. Add the item to the vendor's supplied items first.");
        }
        if (rates.effectiveRate(vendorCode, itemId, LocalDate.now()) == null) {
            throw unprocessable("No rate for " + itemCode + " from " + vendor.get("supplier_name")
                    + " is effective today. Add it in the Vendor Rate Master first.");
        }

        Map<String, Object> draft = lockOrCreateOpenDraft(vendorCode, actor);
        long draftId = ((Number) draft.get("id")).longValue();
        String draftNumber = str(draft.get("draft_number"));

        Map<Long, BigDecimal> requestedQty = new HashMap<>();
        List<Long> ids;
        if (r.lines() == null || r.lines().isEmpty()) {
            ids = jdbc.queryForList(
                    "SELECT pri.id FROM public.purchase_requisition_items pri JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id " +
                    "WHERE " + ORDERABLE_SQL + " AND pri.item_code = ? AND UPPER(TRIM(pri.uom)) = UPPER(TRIM(?)) " +
                    "AND pri.req_qty - pri.ordered_qty - pri.drafted_qty > 0 ORDER BY pri.id",
                    Long.class, itemCode, uom);
        } else {
            ids = new ArrayList<>();
            for (AssignLine l : r.lines()) {
                if (l == null || l.prItemId() == null) throw bad("Every line must reference a PR line.");
                if (requestedQty.containsKey(l.prItemId()) || ids.contains(l.prItemId())) {
                    throw bad("PR line " + l.prItemId() + " is listed more than once.");
                }
                ids.add(l.prItemId());
                requestedQty.put(l.prItemId(), l.quantity());
            }
            Collections.sort(ids);
        }
        if (ids.isEmpty()) throw conflict("No approved PR quantity for " + itemCode + " (" + uom + ") is ready for sourcing.");

        Map<Long, Map<String, Object>> lines = lockPrLines(ids);
        List<Map<String, Object>> assigned = new ArrayList<>();
        for (Long id : ids) {
            Map<String, Object> pl = lines.get(id);
            if (pl == null) throw new NewPoException(HttpStatus.NOT_FOUND, "PR line " + id + " was not found.");
            String label = pl.get("pr_number") + " / " + pl.get("item_code");
            if (!itemCode.equals(str(pl.get("item_code"))) || !uom.equalsIgnoreCase(str(pl.get("uom")))) {
                throw bad("PR line " + label + " (" + str(pl.get("uom")) + ") is not for " + itemCode + " (" + uom + ").");
            }
            if (!ORDERABLE.contains(str(pl.get("pr_status")))) {
                throw conflict("PR " + pl.get("pr_number") + " is " + pl.get("pr_status") + ". Only approved PRs can be sourced.");
            }
            BigDecimal ready = num(pl.get("req_qty")).subtract(num(pl.get("ordered_qty"))).subtract(num(pl.get("drafted_qty")));
            if (ready.signum() <= 0) throw conflict(label + " has nothing ready for sourcing.");
            BigDecimal qty = requestedQty.get(id) == null ? ready : requestedQty.get(id);
            String error = QuantityRules.check(qty, uom, label, qty.compareTo(ready) == 0);
            if (error != null) throw bad(error);
            if (qty.compareTo(ready) > 0) {
                throw conflict("Quantity " + QuantityRules.plain(qty) + " for " + label + " is more than the "
                        + QuantityRules.plain(ready) + " ready for sourcing.");
            }
            jdbc.update(
                    "INSERT INTO public.po_draft_allocations (draft_id, pr_item_id, pr_number, item_code, uom, reserved_qty, created_by) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (draft_id, pr_item_id) DO UPDATE " +
                    "SET reserved_qty = public.po_draft_allocations.reserved_qty + EXCLUDED.reserved_qty, updated_at = NOW()",
                    draftId, id, pl.get("pr_number"), itemCode, str(pl.get("uom")), qty, actor.trim());
            prService.reserveDrafted(id, qty);
            assigned.add(Map.of("prNumber", str(pl.get("pr_number")), "prItemId", id, "qty", qty));
        }
        jdbc.update("UPDATE public.po_drafts SET updated_at = NOW() WHERE id = ?", draftId);
        ProcurementAudit.record(jdbc, "DRAFT", draftNumber, "ASSIGNED", actor,
                Map.of("vendorCode", vendorCode, "itemCode", itemCode, "uom", uom, "lines", assigned));
        return draftDetail(draftNumber);
    }

    /** Drafts with their items and PR allocations. status: OPEN (default), CLOSED or ALL. */
    public List<Map<String, Object>> listDrafts(String status, String vendorCode, String q) {
        String st = blank(status) ? "OPEN" : status.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("OPEN", "CLOSED", "ALL").contains(st)) throw bad("Status must be OPEN, CLOSED or ALL.");
        String like = blank(q) ? null : "%" + q.trim() + "%";
        String vendor = blank(vendorCode) ? null : vendorCode.trim();
        List<Map<String, Object>> headers = jdbc.queryForList(
                DRAFT_HEADER_SQL + "WHERE (? = 'ALL' OR d.status = ?) AND (CAST(? AS VARCHAR) IS NULL OR d.vendor_code = ?) " +
                "AND (CAST(? AS VARCHAR) IS NULL OR d.draft_number ILIKE ? OR s.supplier_name ILIKE ? OR EXISTS (" +
                "  SELECT 1 FROM public.po_draft_allocations a WHERE a.draft_id = d.id AND (a.item_code ILIKE ? OR a.pr_number ILIKE ?))) " +
                "ORDER BY d.status, d.updated_at DESC LIMIT 200",
                st, st, vendor, vendor, like, like, like, like, like);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> h : headers) out.add(buildDraft(h));
        return out;
    }

    public Map<String, Object> draftDetail(String draftNumber) {
        return buildDraft(draftHeader(draftNumber, false));
    }

    /** Sends draft quantity back to sourcing, so it can be given to another vendor. */
    @Transactional
    public Map<String, Object> release(String draftNumber, ReleaseRequest r, String actor) {
        requireActor(actor);
        Map<String, Object> draft = draftHeader(draftNumber, true);
        requireOpen(draft);
        long draftId = ((Number) draft.get("id")).longValue();
        Map<Long, Map<String, Object>> allocs = lockDraftLines(draftId);

        List<Object[]> targets = new ArrayList<>();   // {allocation row, qty}
        if (r == null || r.lines() == null || r.lines().isEmpty()) {
            for (Map<String, Object> a : allocs.values()) {
                BigDecimal open = openOf(a);
                if (open.signum() > 0) targets.add(new Object[] {a, open});
            }
        } else {
            Set<Long> seen = new HashSet<>();
            for (ReleaseLine l : r.lines()) {
                if (l == null || l.allocationId() == null) throw bad("Every line must reference a draft line.");
                if (!seen.add(l.allocationId())) throw bad("Draft line " + l.allocationId() + " is listed more than once.");
                Map<String, Object> a = allocs.get(l.allocationId());
                if (a == null) throw bad("Line " + l.allocationId() + " is not part of draft " + draftNumber + ".");
                BigDecimal open = openOf(a);
                BigDecimal qty = l.quantity() == null ? open : l.quantity();
                String label = a.get("pr_number") + " / " + a.get("item_code");
                if (open.signum() <= 0) throw conflict(label + " has nothing open in this draft.");
                String error = QuantityRules.check(qty, str(a.get("uom")), label, qty.compareTo(open) == 0);
                if (error != null) throw bad(error);
                if (qty.compareTo(open) > 0) {
                    throw conflict("Cannot release " + QuantityRules.plain(qty) + " of " + label + ": only " + QuantityRules.plain(open) + " is open in the draft.");
                }
                targets.add(new Object[] {a, qty});
            }
        }
        if (targets.isEmpty()) throw conflict("Nothing is open in draft " + draftNumber + " to release.");

        targets.sort(Comparator.comparingLong(t -> ((Number) ((Map<?, ?>) t[0]).get("pr_item_id")).longValue()));
        List<Map<String, Object>> released = new ArrayList<>();
        for (Object[] t : targets) {
            @SuppressWarnings("unchecked") Map<String, Object> a = (Map<String, Object>) t[0];
            BigDecimal qty = (BigDecimal) t[1];
            jdbc.update("UPDATE public.po_draft_allocations SET released_qty = released_qty + ?, updated_at = NOW() WHERE id = ?",
                    qty, ((Number) a.get("id")).longValue());
            prService.releaseDrafted(((Number) a.get("pr_item_id")).longValue(), qty);
            released.add(Map.of("prNumber", str(a.get("pr_number")), "itemCode", str(a.get("item_code")), "qty", qty));
        }
        closeIfEmpty(draftId);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("lines", released);
        if (r != null && !blank(r.reason())) details.put("reason", r.reason().trim());
        ProcurementAudit.record(jdbc, "DRAFT", draftNumber, "RELEASED_TO_SOURCING", actor, details);
        return draftDetail(draftNumber);
    }

    // ================================================================== draft -> PO

    /**
     * The PO creation table for one draft: every open PR allocation with its original, remaining and draft
     * quantities, priced with the vendor rate effective on the PO date. Purchasing quantity defaults to the draft quantity.
     */
    public Map<String, Object> conversionLines(String draftNumber, LocalDate poDate) {
        Map<String, Object> h = draftHeader(draftNumber, false);
        LocalDate asOf = poDate == null ? LocalDate.now() : poDate;
        String vendorCode = str(h.get("vendor_code"));
        List<Map<String, Object>> allocs = draftLines(((Number) h.get("id")).longValue());

        Map<String, Map<String, Object>> items = resolveItems(allocs.stream().map(a -> str(a.get("item_code"))).distinct().toList());
        Map<String, BigDecimal> gst = gstRates(allocs.stream().map(a -> hsnOf(a, items)).filter(s -> !s.isEmpty()).distinct().toList());
        Map<String, Map<String, Object>> rateByItem = new HashMap<>();

        List<Map<String, Object>> lines = new ArrayList<>();
        List<String> missingRates = new ArrayList<>();
        for (Map<String, Object> a : allocs) {
            BigDecimal open = openOf(a);
            if (open.signum() <= 0) continue;
            String code = str(a.get("item_code"));
            Map<String, Object> rate = rateByItem.computeIfAbsent(code, c -> {
                Map<String, Object> im = items.get(c);
                return im == null ? null : rates.effectiveRate(vendorCode, ((Number) im.get("id")).longValue(), asOf);
            });
            if (rate == null && !missingRates.contains(code)) missingRates.add(code);
            BigDecimal price = rate == null ? null : num(rate.get("offered_unit_price"));
            String hsn = hsnOf(a, items);
            BigDecimal gstPct = gst.get(hsn);
            BigDecimal req = num(a.get("req_qty")), ordered = num(a.get("ordered_qty"));

            Map<String, Object> l = new LinkedHashMap<>();
            l.put("allocationId", ((Number) a.get("id")).longValue());
            l.put("prItemId", ((Number) a.get("pr_item_id")).longValue());
            l.put("prNumber", a.get("pr_number"));
            l.put("prDate", a.get("pr_date"));
            l.put("department", a.get("department"));
            l.put("requisitioner", a.get("requisitioner"));
            l.put("itemCode", code);
            l.put("itemName", a.get("item_name"));
            l.put("uom", a.get("uom"));
            l.put("hsnCode", hsn.isEmpty() ? null : hsn);
            l.put("taxIssue", hsn.isEmpty() ? "HSN code is missing in the Item Master"
                    : gstPct == null ? "HSN " + hsn + " has no active GST rate in the HSN Tax Master" : null);
            l.put("originalPrQty", req);
            l.put("orderedQty", ordered);
            l.put("remainingToOrderQty", req.subtract(ordered).max(BigDecimal.ZERO));
            l.put("availableDraftQty", open);
            l.put("purchasingQty", open);
            l.put("unitRate", price);
            l.put("rateEffectiveFrom", rate == null ? null : rate.get("effective_from"));
            l.put("gstRatePercent", gstPct);
            if (price != null) {
                BigDecimal taxable = open.multiply(price).setScale(2, RoundingMode.HALF_UP);
                BigDecimal tax = gstPct == null ? BigDecimal.ZERO : taxable.multiply(gstPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                l.put("estimatedTaxable", taxable);
                l.put("estimatedTax", tax);
                l.put("estimatedTotal", taxable.add(tax));
            }
            lines.add(l);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("draftNumber", h.get("draft_number"));
        out.put("draftStatus", h.get("status"));
        out.put("vendor", vendorHeader(h));
        out.put("poDate", asOf);
        out.put("nextPoNumber", poByPr.nextPoNumber().get("poNumber"));
        out.put("lines", lines);
        out.put("missingRates", missingRates);
        return out;
    }

    /**
     * Prices and taxes the PO exactly as conversion would, using the same steps inside a transaction that is
     * always rolled back. Nothing is saved, and no draft or PR quantity changes.
     */
    @Transactional
    public PlannedPo preview(String draftNumber, ConvertRequest r) {
        try {
            Staged staged = stage(draftNumber, r);
            return poByPr.preview(staged.request());
        } finally {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
    }

    /**
     * Creates PO-YYYY-NNNNN from the chosen draft lines. Each chosen quantity leaves the draft and is ordered on the
     * PO in one transaction; lines left at zero stay in the draft for a later PO. The PO's allocations record the
     * draft line they came from, so PR -> draft -> PO -> GRN stays traceable.
     */
    @Transactional
    public Map<String, Object> convert(String draftNumber, ConvertRequest r, String actor) {
        requireActor(actor);
        Staged staged = stage(draftNumber, r);
        CreatedPo created = poByPr.create(staged.request(), actor);
        jdbc.update("UPDATE public.purchase_orders SET invoice_to = ?, ship_to = ?, voucher_no = ?, reference_no = ?, reference_date = ? WHERE po_number = ?",
                r.invoiceTo().trim(), r.shipTo().trim(), blank(r.voucherNo()) ? created.poNumber() : r.voucherNo().trim(),
                r.referenceNo().trim(), java.sql.Date.valueOf(r.referenceDate()), created.poNumber());

        List<Map<String, Object>> lines = new ArrayList<>();
        for (Selected s : staged.selected()) {
            int linked = jdbc.update("UPDATE public.po_pr_allocations SET draft_allocation_id = ? WHERE po_number = ? AND pr_item_id = ?",
                    s.allocationId(), created.poNumber(), s.prItemId());
            if (linked != 1) {
                throw new NewPoException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "PO " + created.poNumber() + " has no allocation for PR line " + s.prItemId() + "; nothing was saved.");
            }
            lines.add(Map.of("prNumber", s.prNumber(), "itemCode", s.itemCode(), "qty", s.qty()));
        }
        closeIfEmpty(staged.draftId());
        ProcurementAudit.record(jdbc, "DRAFT", staged.draftNumber(), "CONVERTED_TO_PO", actor,
                Map.of("poNumber", created.poNumber(), "lines", lines));
        ProcurementAudit.record(jdbc, "PO", created.poNumber(), "CREATED_FROM_DRAFT", actor,
                Map.of("draftNumber", staged.draftNumber(), "lines", lines));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("poNumber", created.poNumber());
        out.put("poId", created.poId());
        out.put("po", created.po());
        out.put("draft", draftDetail(staged.draftNumber()));
        return out;
    }

    private record Selected(long allocationId, long prItemId, String prNumber, String itemCode, BigDecimal qty,
                            BigDecimal discountPercent, BigDecimal manualDiscount, String remarks, LocalDate dueOn) {}

    private record Staged(long draftId, String draftNumber, List<Selected> selected, CreatePoRequest request) {}

    /**
     * Shared by preview and convert: locks the draft and its lines, validates the purchasing quantities, moves them
     * out of the draft (converted_qty, drafted_qty) and builds the PO by PR request.
     */
    private Staged stage(String draftNumber, ConvertRequest r) {
        if (r == null) throw bad("Request body is required.");
        if (blank(r.invoiceTo())) throw bad("Invoice To is required.");
        if (blank(r.shipTo())) throw bad("Ship To is required.");
        if (blank(r.referenceNo())) throw bad("Reference No is required.");
        if (r.referenceDate() == null) throw bad("Reference Date is required.");
        Map<String, Object> draft = draftHeader(draftNumber, true);
        requireOpen(draft);
        long draftId = ((Number) draft.get("id")).longValue();
        String number = str(draft.get("draft_number"));
        Map<Long, Map<String, Object>> allocs = lockDraftLines(draftId);
        if (r.lines() == null || r.lines().isEmpty()) throw bad("Select the PR lines to purchase.");

        List<Selected> selected = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        for (ConvertLine l : r.lines()) {
            if (l == null || l.allocationId() == null) throw bad("Every PO line must reference a draft line.");
            if (!seen.add(l.allocationId())) throw bad("Draft line " + l.allocationId() + " is listed more than once.");
            Map<String, Object> a = allocs.get(l.allocationId());
            if (a == null) throw bad("Line " + l.allocationId() + " is not part of draft " + number + ".");
            BigDecimal qty = l.quantity();
            if (qty == null || qty.signum() == 0) continue;   // not purchased now; stays in the draft
            String label = a.get("pr_number") + " / " + a.get("item_code");
            if (qty.signum() < 0) throw bad("Purchasing quantity for " + label + " cannot be negative.");
            BigDecimal open = openOf(a);
            if (qty.compareTo(open) > 0) {
                throw conflict("Purchasing quantity " + QuantityRules.plain(qty) + " for " + label + " is more than the "
                        + QuantityRules.plain(open) + " available in this draft.");
            }
            String error = QuantityRules.check(qty, str(a.get("uom")), label, qty.compareTo(open) == 0);
            if (error != null) throw bad(error);
            LocalDate due = l.dueOn() != null ? l.dueOn() : (r.poDate() != null ? r.poDate() : LocalDate.now());
            selected.add(new Selected(((Number) a.get("id")).longValue(), ((Number) a.get("pr_item_id")).longValue(),
                    str(a.get("pr_number")), str(a.get("item_code")), qty, l.discountPercent(), l.manualDiscount(), l.remarks(), due));
        }
        if (selected.isEmpty()) {
            throw bad("Enter a purchasing quantity greater than zero on at least one PR line. Lines left at zero stay in the draft.");
        }
        selected.sort(Comparator.comparingLong(Selected::prItemId));

        List<LineRequest> poLines = new ArrayList<>();
        for (Selected s : selected) {
            jdbc.update("UPDATE public.po_draft_allocations SET converted_qty = converted_qty + ?, updated_at = NOW() WHERE id = ?",
                    s.qty(), s.allocationId());
            prService.releaseDrafted(s.prItemId(), s.qty());
            poLines.add(new LineRequest(s.prItemId(), s.qty(), s.discountPercent(), s.manualDiscount(), s.remarks(), s.dueOn()));
        }
        CreatePoRequest request = new CreatePoRequest(str(draft.get("vendor_code")), r.poDate(), "PARTIAL", poLines, blank(r.remarks()) ? null : r.remarks().trim(),
                r.deliveryFreight(), r.otherCharges(), r.roundOff(), r.terms(), r.schedules());
        return new Staged(draftId, number, selected, request);
    }

    // ================================================================== audit

    public List<Map<String, Object>> audit(String ref) {
        return jdbc.queryForList(
                "SELECT entity_type, entity_ref, action, actor, details_json, created_at FROM public.procurement_audit_log " +
                "WHERE (CAST(? AS VARCHAR) IS NULL OR entity_ref = ?) ORDER BY created_at DESC, id DESC LIMIT 500",
                blank(ref) ? null : ref.trim(), blank(ref) ? null : ref.trim());
    }

    // ================================================================== draft helpers

    private static final String DRAFT_HEADER_SQL =
            "SELECT d.id, d.draft_number, d.vendor_code, d.status, d.created_by, d.created_at, d.updated_at, d.closed_at, " +
            "s.supplier_name, s.gstin, s.state, s.payment_terms_id, s.contact_person, s.phone, s.email, s.address, s.city " +
            "FROM public.po_drafts d JOIN public.supplier_master s ON s.supplier_code = d.vendor_code ";

    private Map<String, Object> draftHeader(String draftNumber, boolean lock) {
        String number = required(draftNumber, "Draft number is required.");
        List<Map<String, Object>> rows = jdbc.queryForList(
                DRAFT_HEADER_SQL + "WHERE d.draft_number = ?" + (lock ? " FOR UPDATE OF d" : ""), number);
        if (rows.isEmpty()) throw new NewPoException(HttpStatus.NOT_FOUND, "Draft " + number + " was not found.");
        return rows.get(0);
    }

    private static void requireOpen(Map<String, Object> draft) {
        if (!"OPEN".equals(str(draft.get("status")))) {
            throw new NewPoException(HttpStatus.CONFLICT, "Draft " + draft.get("draft_number") + " is closed: everything in it was converted or released.");
        }
    }

    private Map<String, Object> lockOrCreateOpenDraft(String vendorCode, String actor) {
        // Serialises draft creation per vendor, so two buyers cannot open two drafts for the same vendor.
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtext(?))", Object.class, "po_draft:" + vendorCode);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, draft_number FROM public.po_drafts WHERE vendor_code = ? AND status = 'OPEN' FOR UPDATE", vendorCode);
        if (!rows.isEmpty()) return rows.get(0);
        String number = com.silvermuller.seals.modules.purchase.service.DocumentNumbers.next(
                jdbc, com.silvermuller.seals.modules.purchase.service.DocumentNumbers.Doc.DRAFT);
        Long id = jdbc.queryForObject(
                "INSERT INTO public.po_drafts (draft_number, vendor_code, created_by) VALUES (?, ?, ?) RETURNING id",
                Long.class, number, vendorCode, actor.trim());
        ProcurementAudit.record(jdbc, "DRAFT", number, "CREATED", actor, Map.of("vendorCode", vendorCode));
        Map<String, Object> created = new HashMap<>();
        created.put("id", id);
        created.put("draft_number", number);
        return created;
    }

    private static final String DRAFT_LINE_SQL =
            "SELECT a.id, a.draft_id, a.pr_item_id, a.pr_number, a.item_code, a.uom, a.reserved_qty, a.converted_qty, a.released_qty, " +
            "a.created_at, pri.item_name, pri.hsn_code, pri.req_qty, pri.ordered_qty, pr.department, pr.pr_date, pr.requisitioner " +
            "FROM public.po_draft_allocations a " +
            "JOIN public.purchase_requisition_items pri ON pri.id = a.pr_item_id " +
            "JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id ";

    private List<Map<String, Object>> draftLines(long draftId) {
        return jdbc.queryForList(DRAFT_LINE_SQL + "WHERE a.draft_id = ? ORDER BY a.item_code, pr.pr_date, a.id", draftId);
    }

    /** Draft lines locked in PR-line order (the lock order every reservation uses). Keyed by allocation id. */
    private Map<Long, Map<String, Object>> lockDraftLines(long draftId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                DRAFT_LINE_SQL + "WHERE a.draft_id = ? ORDER BY a.pr_item_id FOR UPDATE OF a", draftId);
        Map<Long, Map<String, Object>> byId = new LinkedHashMap<>();
        for (Map<String, Object> r : rows) byId.put(((Number) r.get("id")).longValue(), r);
        return byId;
    }

    private void closeIfEmpty(long draftId) {
        BigDecimal open = jdbc.queryForObject(
                "SELECT COALESCE(SUM(reserved_qty - converted_qty - released_qty), 0) FROM public.po_draft_allocations WHERE draft_id = ?",
                BigDecimal.class, draftId);
        if (open == null || open.signum() == 0) {
            jdbc.update("UPDATE public.po_drafts SET status = 'CLOSED', closed_at = NOW(), updated_at = NOW() WHERE id = ? AND status = 'OPEN'", draftId);
        } else {
            jdbc.update("UPDATE public.po_drafts SET updated_at = NOW() WHERE id = ?", draftId);
        }
    }

    /** A draft as the Draft Purchase Orders screen shows it: header, totals, items, and PR allocations under each item. */
    private Map<String, Object> buildDraft(Map<String, Object> h) {
        long draftId = ((Number) h.get("id")).longValue();
        String vendorCode = str(h.get("vendor_code"));
        List<Map<String, Object>> allocs = draftLines(draftId);

        Map<Long, String> posByAlloc = new HashMap<>();
        if (!allocs.isEmpty()) {
            List<Long> ids = allocs.stream().map(a -> ((Number) a.get("id")).longValue()).toList();
            for (Map<String, Object> p : jdbc.queryForList(
                    "SELECT draft_allocation_id, string_agg(DISTINCT po_number, ', ') AS pos FROM public.po_pr_allocations " +
                    "WHERE draft_allocation_id IN (" + marks(ids.size()) + ") GROUP BY draft_allocation_id", ids.toArray())) {
                posByAlloc.put(((Number) p.get("draft_allocation_id")).longValue(), str(p.get("pos")));
            }
        }
        Map<String, Map<String, Object>> items = resolveItems(allocs.stream().map(a -> str(a.get("item_code"))).distinct().toList());
        Map<String, BigDecimal> gst = gstRates(allocs.stream().map(a -> hsnOf(a, items)).filter(s -> !s.isEmpty()).distinct().toList());
        LocalDate today = LocalDate.now();

        Map<String, Map<String, Object>> byItem = new LinkedHashMap<>();
        for (Map<String, Object> a : allocs) {
            String code = str(a.get("item_code"));
            String uom = str(a.get("uom"));
            Map<String, Object> it = byItem.computeIfAbsent(code + "\u0000" + uom.toUpperCase(Locale.ROOT), k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                Map<String, Object> im = items.get(code);
                Map<String, Object> rate = im == null ? null : rates.effectiveRate(vendorCode, ((Number) im.get("id")).longValue(), today);
                String hsn = hsnOf(a, items);
                m.put("itemCode", code);
                m.put("itemName", a.get("item_name"));
                m.put("uom", uom);
                m.put("hsnCode", hsn.isEmpty() ? null : hsn);
                m.put("gstRatePercent", gst.get(hsn));
                m.put("unitPrice", rate == null ? null : num(rate.get("offered_unit_price")));
                m.put("rateEffectiveFrom", rate == null ? null : rate.get("effective_from"));
                m.put("openQty", BigDecimal.ZERO);
                m.put("convertedQty", BigDecimal.ZERO);
                m.put("releasedQty", BigDecimal.ZERO);
                m.put("allocations", new ArrayList<Map<String, Object>>());
                return m;
            });
            BigDecimal open = openOf(a);
            it.put("openQty", num(it.get("openQty")).add(open));
            it.put("convertedQty", num(it.get("convertedQty")).add(num(a.get("converted_qty"))));
            it.put("releasedQty", num(it.get("releasedQty")).add(num(a.get("released_qty"))));
            Map<String, Object> al = new LinkedHashMap<>();
            long allocationId = ((Number) a.get("id")).longValue();
            al.put("allocationId", allocationId);
            al.put("prItemId", ((Number) a.get("pr_item_id")).longValue());
            al.put("prNumber", a.get("pr_number"));
            al.put("prDate", a.get("pr_date"));
            al.put("department", a.get("department"));
            al.put("requisitioner", a.get("requisitioner"));
            al.put("requestedQty", num(a.get("req_qty")));
            al.put("reservedQty", num(a.get("reserved_qty")));
            al.put("convertedQty", num(a.get("converted_qty")));
            al.put("releasedQty", num(a.get("released_qty")));
            al.put("openQty", open);
            al.put("poNumbers", posByAlloc.get(allocationId));
            sourcesOf(it, "allocations").add(al);
        }

        BigDecimal total = BigDecimal.ZERO, totalWithGst = BigDecimal.ZERO, openQty = BigDecimal.ZERO;
        int openItems = 0;
        List<String> missingRates = new ArrayList<>();
        List<String> missingTax = new ArrayList<>();
        for (Map<String, Object> it : byItem.values()) {
            BigDecimal open = num(it.get("openQty"));
            openQty = openQty.add(open);
            if (open.signum() > 0) openItems++;
            if (open.signum() > 0 && it.get("gstRatePercent") == null) missingTax.add(str(it.get("itemCode")));
            BigDecimal price = it.get("unitPrice") == null ? null : num(it.get("unitPrice"));
            if (price == null) {
                if (open.signum() > 0) missingRates.add(str(it.get("itemCode")));
                it.put("estimatedValue", null);
                continue;
            }
            BigDecimal value = open.multiply(price).setScale(2, RoundingMode.HALF_UP);
            BigDecimal gstPct = it.get("gstRatePercent") == null ? BigDecimal.ZERO : num(it.get("gstRatePercent"));
            BigDecimal withGst = value.add(value.multiply(gstPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
            it.put("estimatedValue", value);
            it.put("estimatedValueWithGst", withGst);
            total = total.add(value);
            totalWithGst = totalWithGst.add(withGst);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("draftNumber", h.get("draft_number"));
        out.put("status", h.get("status"));
        out.put("vendor", vendorHeader(h));
        out.put("createdBy", h.get("created_by"));
        out.put("createdAt", h.get("created_at"));
        out.put("updatedAt", h.get("updated_at"));
        out.put("closedAt", h.get("closed_at"));
        out.put("itemCount", openItems);
        out.put("openQty", openQty);
        out.put("estimatedTotal", total);
        out.put("estimatedTotalWithGst", totalWithGst);
        out.put("missingRates", missingRates);
        out.put("missingTax", missingTax);
        String nextAction;
        if (!"OPEN".equals(str(h.get("status")))) nextAction = "Closed. Nothing left in this draft.";
        else if (!missingRates.isEmpty()) nextAction = "Add today's vendor rate for " + String.join(", ", missingRates) + " before converting.";
        else if (!missingTax.isEmpty()) nextAction = "Convert to PO. " + String.join(", ", missingTax)
                + " has no active HSN/GST rate and cannot be purchased until it is fixed in the Item Master or HSN Tax Master.";
        else nextAction = "Convert to PO.";
        out.put("nextAction", nextAction);
        out.put("items", new ArrayList<>(byItem.values()));
        return out;
    }

    private static Map<String, Object> vendorHeader(Map<String, Object> h) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("vendorCode", h.get("vendor_code"));
        v.put("vendorName", h.get("supplier_name"));
        v.put("gstin", h.get("gstin"));
        v.put("state", h.get("state"));
        v.put("city", h.get("city"));
        v.put("address", h.get("address"));
        v.put("contactPerson", h.get("contact_person"));
        v.put("phone", h.get("phone"));
        v.put("email", h.get("email"));
        v.put("paymentTerms", h.get("payment_terms_id"));
        return v;
    }

    // ================================================================== master lookups

    private Map<String, Object> activeVendor(String vendorCode) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, supplier_code, supplier_name, status FROM public.supplier_master WHERE supplier_code = ?", vendorCode);
        if (rows.isEmpty()) throw bad("Vendor " + vendorCode + " was not found in the Vendor Master.");
        if (!"ACTIVE".equalsIgnoreCase(str(rows.get(0).get("status")))) throw bad("Vendor " + vendorCode + " is not active.");
        return rows.get(0);
    }

    /**
     * Item Master row for each PR item code, using the same rule as PO by PR: the part number (sms_new_part_no)
     * wins over the old code, then the lowest id.
     */
    private Map<String, Map<String, Object>> resolveItems(Collection<String> codes) {
        List<String> list = codes.stream().filter(c -> c != null && !c.isBlank()).distinct().toList();
        Map<String, Map<String, Object>> out = new HashMap<>();
        if (list.isEmpty()) return out;
        String in = marks(list.size());
        List<Object> args = new ArrayList<>(list);
        args.addAll(list);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, sms_new_part_no, old_code, description_size, hsn_code, procurement_lead_time, total_lead_time, " +
                "COALESCE(NULLIF(purchased_uom, ''), NULLIF(uom, ''), 'PCS') AS uom FROM public.item_master " +
                "WHERE sms_new_part_no IN (" + in + ") OR old_code IN (" + in + ") ORDER BY id", args.toArray());
        for (String code : list) {
            Map<String, Object> byPart = null, byOld = null;
            for (Map<String, Object> r : rows) {
                if (byPart == null && code.equals(r.get("sms_new_part_no"))) byPart = r;
                if (byOld == null && code.equals(r.get("old_code"))) byOld = r;
            }
            Map<String, Object> chosen = byPart != null ? byPart : byOld;
            if (chosen != null) out.put(code, chosen);
        }
        return out;
    }

    private Map<String, BigDecimal> gstRates(Collection<String> hsns) {
        Map<String, BigDecimal> out = new HashMap<>();
        List<String> list = hsns.stream().filter(h -> h != null && !h.isBlank()).distinct().toList();
        if (list.isEmpty()) return out;
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT hsn_sac_code, gst_rate FROM public.hsn_tax_master WHERE is_active = TRUE AND hsn_sac_code IN (" + marks(list.size()) + ")",
                list.toArray())) {
            out.put(str(r.get("hsn_sac_code")), num(r.get("gst_rate")));
        }
        return out;
    }

    /** PR line HSN first (as PO by PR does), then the Item Master's. */
    private static String hsnOf(Map<String, Object> line, Map<String, Map<String, Object>> items) {
        String hsn = str(line.get("hsn_code"));
        if (!hsn.isEmpty()) return hsn;
        Map<String, Object> im = items.get(str(line.get("item_code")));
        return im == null ? "" : str(im.get("hsn_code"));
    }

    /**
     * Active vendors linked to each item in the Supplier Master, with the rate effective on asOf (null if none).
     * Per item: vendors with a rate first, cheapest first, then vendors without a rate by name.
     */
    private Map<Long, List<Map<String, Object>>> vendorOptions(List<Long> itemIds, LocalDate asOf) {
        Map<Long, List<Map<String, Object>>> out = new HashMap<>();
        if (itemIds.isEmpty()) return out;
        List<Object> args = new ArrayList<>();
        args.add(java.sql.Date.valueOf(asOf));
        args.addAll(itemIds);
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT si.item_id, s.supplier_code, s.supplier_name, s.gstin, s.state, s.payment_terms_id, " +
                "r.id AS rate_id, r.offered_unit_price, r.effective_from, r.created_at AS rate_created_at " +
                "FROM public.supplier_item si JOIN public.supplier_master s ON s.id = si.supplier_id " +
                "LEFT JOIN LATERAL (SELECT v.id, v.offered_unit_price, v.effective_from, v.created_at FROM public.vendor_item_rates v " +
                "  WHERE v.supplier_code = s.supplier_code AND v.item_id = si.item_id AND v.effective_from <= ? " +
                "  ORDER BY v.effective_from DESC, v.created_at DESC LIMIT 1) r ON TRUE " +
                "WHERE s.status = 'ACTIVE' AND si.item_id IN (" + marks(itemIds.size()) + ") " +
                "ORDER BY si.item_id, (r.offered_unit_price IS NULL), r.offered_unit_price, s.supplier_name",
                args.toArray())) {
            out.computeIfAbsent(((Number) r.get("item_id")).longValue(), k -> new ArrayList<>()).add(r);
        }
        return out;
    }

    /** PR lines locked in id order (FOR UPDATE), with their PR status. */
    private Map<Long, Map<String, Object>> lockPrLines(List<Long> ids) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT pri.id, pri.pr_number, pri.item_code, TRIM(pri.uom) AS uom, pri.req_qty, pri.ordered_qty, pri.drafted_qty, " +
                "pr.status AS pr_status FROM public.purchase_requisition_items pri JOIN public.purchase_requisitions pr ON pr.id = pri.pr_id " +
                "WHERE pri.id IN (" + marks(ids.size()) + ") ORDER BY pri.id FOR UPDATE OF pri", ids.toArray());
        Map<Long, Map<String, Object>> byId = new HashMap<>();
        for (Map<String, Object> r : rows) byId.put(((Number) r.get("id")).longValue(), r);
        return byId;
    }

    // ================================================================== small helpers

    private static BigDecimal positive(Object v) {
        if (v == null) return null;
        BigDecimal n = num(v);
        return n.signum() > 0 ? n : null;
    }

    private static BigDecimal openOf(Map<String, Object> a) {
        return num(a.get("reserved_qty")).subtract(num(a.get("converted_qty"))).subtract(num(a.get("released_qty")));
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> sourcesOf(Map<String, Object> g) {
        return (List<Map<String, Object>>) g.get("sources");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> sourcesOf(Map<String, Object> g, String key) {
        return (List<Map<String, Object>>) g.get(key);
    }

    private static String marks(int n) {
        return String.join(",", Collections.nCopies(n, "?"));
    }

    private static void requireActor(String actor) {
        if (actor == null || actor.isBlank()) {
            throw new NewPoException(HttpStatus.UNAUTHORIZED, "Missing current user (X-User-Name header).");
        }
    }

    private static String required(String value, String message) {
        if (value == null || value.isBlank()) throw bad(message);
        return value.trim();
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private static BigDecimal num(Object v) {
        if (v == null) return BigDecimal.ZERO;
        return v instanceof BigDecimal b ? b : new BigDecimal(v.toString());
    }

    private static NewPoException bad(String message) {
        return new NewPoException(HttpStatus.BAD_REQUEST, message);
    }

    private static NewPoException conflict(String message) {
        return new NewPoException(HttpStatus.CONFLICT, message);
    }

    private static NewPoException unprocessable(String message) {
        return new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}
