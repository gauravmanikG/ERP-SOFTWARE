package com.silvermuller.seals.modules.gate;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNoteItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static com.silvermuller.seals.modules.gate.GateRows.*;

/**
 * Connects the existing GRN to the gate. A GRN made from a gate entry may only receive quantity that was accepted at
 * gate verification and is not yet on a posted GRN. The gate-entry lines are locked after the PO row (the GRN's first
 * lock), and the database refuses grn_posted_qty above accepted_qty, so two GRNs at once can never over-receive.
 * GRN numbering, PO status, delivery lots, PR attribution and the audit log stay in GoodsReceiptNoteService as before.
 */
@Service
public class GateGrnLink {

    private final JdbcTemplate jdbc;
    private final GateSettings settings;

    public GateGrnLink(JdbcTemplate jdbc, GateSettings settings) {
        this.jdbc = jdbc;
        this.settings = settings;
    }

    /** True when every GRN must come from a verified gate entry (Gate Settings: "required"). */
    public boolean required() {
        return settings.get().required();
    }

    public BigDecimal tolerancePct() {
        return settings.get().overDeliveryTolerancePct();
    }

    /**
     * Checks a GRN against its gate entry and fills the delivery details from it. Called with the PO row locked.
     * Returns true when the GRN is linked to a gate entry. With the gate required, an unlinked GRN is refused.
     */
    public boolean prepare(GoodsReceiptNote grn) {
        boolean linked = grn.getGateEntryId() != null
                || grn.getItems().stream().anyMatch(it -> it != null && it.getGateEntryLineId() != null);
        if (!linked) {
            if (required()) {
                throw new ConflictException("A GRN is made from a verified gate entry. Record the delivery at the gate (Gate Entry, unloading, "
                        + "verification) and create the GRN from Pending GRN. The GRN was not saved.");
            }
            return false;
        }
        if (grn.getGateEntryId() == null) throw new IllegalArgumentException("The GRN names gate-entry lines but not their gate entry.");
        List<Map<String, Object>> entries = jdbc.queryForList("SELECT * FROM public.gate_entries WHERE id = ?", grn.getGateEntryId());
        if (entries.isEmpty()) throw new IllegalArgumentException("Gate entry " + grn.getGateEntryId() + " was not found.");
        Map<String, Object> e = entries.get(0);
        String no = str(e, "gate_entry_number");
        String stage = str(e, "stage");
        if (!"VERIFIED".equals(stage) && !"EXITED".equals(stage)) {
            throw new ConflictException("Gate entry " + no + " is " + stage + ". Its quantities can be received only after verification.");
        }
        grn.setGateEntryNumber(no);
        Map<Long, Map<String, Object>> lines = new HashMap<>();
        for (Map<String, Object> l : jdbc.queryForList(
                "SELECT * FROM public.gate_entry_lines WHERE gate_entry_id = ? ORDER BY id FOR UPDATE", grn.getGateEntryId())) {
            lines.put(lng(l, "id"), l);
        }
        Set<Long> used = new HashSet<>();
        for (GoodsReceiptNoteItem it : grn.getItems()) {
            Long lineId = it.getGateEntryLineId();
            if (lineId == null) throw new IllegalArgumentException("Item " + it.getItemCode() + " has no gate-entry line. Every line of a gate GRN comes from its gate entry.");
            Map<String, Object> l = lines.get(lineId);
            if (l == null) throw new IllegalArgumentException("Gate-entry line " + lineId + " is not on gate entry " + no + ".");
            if (!used.add(lineId)) throw new IllegalArgumentException("Gate-entry line " + lineId + " is on the GRN twice.");
            if (!grn.getPoNumber().equals(str(l, "po_number")) || !str(l, "item_code").equals(it.getItemCode())) {
                throw new IllegalArgumentException("Gate-entry line " + lineId + " is " + str(l, "item_code") + " of PO " + str(l, "po_number")
                        + ", not " + it.getItemCode() + " of PO " + grn.getPoNumber() + ".");
            }
            if (nz(it.getRejectedQty()).signum() > 0 || nz(it.getPendingInspectionQty()).signum() > 0) {
                throw new IllegalArgumentException("Item " + it.getItemCode() + ": rejected and hold quantities were decided at gate verification. "
                        + "Enter only the accepted quantity to receive.");
            }
            BigDecimal qty = nz(it.getAcceptedQty());
            BigDecimal pending = dec(l, "accepted_qty").subtract(dec(l, "grn_posted_qty"));
            if (qty.compareTo(pending) > 0) {
                throw new IllegalArgumentException("Item " + it.getItemCode() + ": GRN quantity " + plain(qty) + " is more than the " + plain(pending)
                        + " accepted at gate entry " + no + " and not yet received. The GRN was not saved.");
            }
            it.setReceivedQty(qty);
            if (nz(it.getChallanQty()).signum() == 0) it.setChallanQty(dec(l, "declared_qty"));
        }
        // The delivery documents are the gate's: the GRN repeats them so its register and print stay as they were.
        if (blank(grn.getVendorChallanNo()) == null) {
            grn.setVendorChallanNo(blank(str(e, "challan_no")) != null ? str(e, "challan_no") : str(e, "invoice_no"));
        }
        if (blank(grn.getVendorInvoiceNo()) == null) grn.setVendorInvoiceNo(str(e, "invoice_no"));
        if (grn.getVendorInvoiceDate() == null && e.get("invoice_date") instanceof java.sql.Date d) grn.setVendorInvoiceDate(d.toLocalDate());
        if (grn.getVendorChallanDate() == null && e.get("challan_date") instanceof java.sql.Date d) grn.setVendorChallanDate(d.toLocalDate());
        if (blank(grn.getVehicleNumber()) == null) grn.setVehicleNumber(str(e, "vehicle_number"));
        if (blank(grn.getTransporterName()) == null) grn.setTransporterName(str(e, "transporter"));
        return true;
    }

    /** After a posted GRN is stored: adds its quantities to the gate lines (in the same transaction) and logs it. */
    public void recordPosted(long grnId, String grnNumber, String actor) {
        int updated = jdbc.update(
                "UPDATE public.gate_entry_lines gl SET grn_posted_qty = gl.grn_posted_qty + gi.accepted_qty "
                        + "FROM public.goods_receipt_note_items gi WHERE gi.grn_id = ? AND gi.gate_entry_line_id = gl.id", grnId);
        if (updated == 0) return;
        for (Map<String, Object> e : jdbc.queryForList(
                "SELECT e.id, e.stage FROM public.gate_entries e JOIN public.goods_receipt_notes g ON g.gate_entry_id = e.id WHERE g.id = ?", grnId)) {
            jdbc.update("INSERT INTO public.gate_entry_events (gate_entry_id, action, from_stage, to_stage, actor, remarks) VALUES (?,?,?,?,?,?)",
                    lng(e, "id"), "GRN_POSTED", str(e, "stage"), str(e, "stage"), actor == null ? "system" : actor, "GRN " + grnNumber);
        }
    }

    /**
     * Pending GRN from the gate: one row per (gate entry, PO) that still has accepted quantity not on a posted GRN.
     * Shaped like the older pending-PO list (poNumber, items, balanceQty...) plus the gate fields, so the GRN screen
     * reads both the same way.
     */
    public List<Map<String, Object>> pendingForGrn() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT e.id AS gate_entry_id, e.gate_entry_number, e.vehicle_number, e.invoice_no, e.invoice_date, e.challan_no, e.challan_date, "
                        + "e.transporter, e.entry_at, e.verified_at, e.stage AS gate_stage, p.id AS po_id, p.po_number, p.po_date, p.pr_number, p.vendor_code, "
                        + "p.vendor_name, p.vendor_gstin, p.vendor_pan, p.status, p.validity_date, p.delivery_location, p.payment_terms, p.grand_total, "
                        + "l.id AS gate_entry_line_id, l.line_no, l.item_code, l.item_name, l.uom, l.declared_qty, l.unloaded_qty, l.accepted_qty, "
                        + "l.rejected_qty, l.hold_qty, l.grn_posted_qty, (l.accepted_qty - l.grn_posted_qty) AS pending_grn_qty, "
                        + "i.quantity AS ordered_qty, i.unit_rate, i.taxable_amount, i.tax_amount, "
                        + "(SELECT COALESCE(SUM(gi.accepted_qty), 0) FROM public.goods_receipt_note_items gi JOIN public.goods_receipt_notes g ON g.id = gi.grn_id "
                        + "  WHERE g.status = 'POSTED' AND gi.po_number = l.po_number AND gi.item_code = l.item_code) AS po_received_qty, "
                        + "(SELECT STRING_AGG(DISTINCT a.pr_number, ', ') FROM public.po_pr_allocations a WHERE a.po_number = p.po_number) AS pr_numbers "
                        + "FROM public.gate_entry_lines l JOIN public.gate_entries e ON e.id = l.gate_entry_id "
                        + "JOIN public.purchase_orders p ON p.po_number = l.po_number "
                        + "JOIN public.purchase_order_items i ON i.po_number = l.po_number AND i.item_code = l.item_code "
                        + "WHERE e.stage IN ('VERIFIED','EXITED') AND l.accepted_qty > l.grn_posted_qty AND UPPER(p.status) <> 'CANCELLED' "
                        + "ORDER BY e.verified_at, e.id, p.po_number, l.line_no");
        Map<String, Map<String, Object>> groups = new LinkedHashMap<>();
        for (Map<String, Object> r : rows) {
            String key = r.get("gate_entry_id") + "\u0000" + str(r, "po_number");
            Map<String, Object> g = groups.computeIfAbsent(key, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", r.get("po_id"));
                m.put("poNumber", str(r, "po_number"));
                m.put("poDate", str(r, "po_date"));
                m.put("prNumber", str(r, "pr_number"));
                m.put("prNumbers", r.get("pr_numbers") != null ? str(r, "pr_numbers") : str(r, "pr_number"));
                m.put("vendorCode", str(r, "vendor_code"));
                m.put("vendorName", str(r, "vendor_name"));
                m.put("vendorGstin", str(r, "vendor_gstin"));
                m.put("vendorPan", str(r, "vendor_pan"));
                m.put("status", str(r, "status"));
                m.put("validityDate", json(r.get("validity_date")));
                m.put("deliveryLocation", str(r, "delivery_location"));
                m.put("paymentTerms", str(r, "payment_terms"));
                m.put("grandTotal", r.get("grand_total"));
                m.put("gateEntryId", r.get("gate_entry_id"));
                m.put("gateEntryNumber", str(r, "gate_entry_number"));
                m.put("gateStage", str(r, "gate_stage"));
                m.put("vehicleNumber", str(r, "vehicle_number"));
                m.put("invoiceNo", str(r, "invoice_no"));
                m.put("invoiceDate", json(r.get("invoice_date")));
                m.put("challanNo", str(r, "challan_no"));
                m.put("challanDate", json(r.get("challan_date")));
                m.put("transporter", str(r, "transporter"));
                m.put("entryAt", json(r.get("entry_at")));
                m.put("verifiedAt", json(r.get("verified_at")));
                m.put("totalOrderedQty", BigDecimal.ZERO);
                m.put("totalReceivedQty", BigDecimal.ZERO);
                m.put("totalBalanceQty", BigDecimal.ZERO);
                m.put("items", new ArrayList<Map<String, Object>>());
                return m;
            });
            BigDecimal taxable = dec(r, "taxable_amount");
            BigDecimal taxPct = taxable.signum() == 0 ? BigDecimal.ZERO
                    : dec(r, "tax_amount").multiply(BigDecimal.valueOf(100)).divide(taxable, 2, RoundingMode.HALF_UP);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("gateEntryLineId", r.get("gate_entry_line_id"));
            item.put("itemCode", str(r, "item_code"));
            item.put("itemName", str(r, "item_name"));
            item.put("uom", str(r, "uom") == null ? "PCS" : str(r, "uom"));
            item.put("unitRate", r.get("unit_rate"));
            item.put("taxPercent", taxPct);
            item.put("orderedQty", dec(r, "ordered_qty"));
            item.put("receivedQty", dec(r, "po_received_qty"));
            item.put("declaredQty", dec(r, "declared_qty"));
            item.put("unloadedQty", dec(r, "unloaded_qty"));
            item.put("acceptedQty", dec(r, "accepted_qty"));
            item.put("rejectedQty", dec(r, "rejected_qty"));
            item.put("holdQty", dec(r, "hold_qty"));
            item.put("grnPostedQty", dec(r, "grn_posted_qty"));
            item.put("pendingGrnQty", dec(r, "pending_grn_qty"));
            item.put("balanceQty", dec(r, "pending_grn_qty"));
            @SuppressWarnings("unchecked") List<Map<String, Object>> items = (List<Map<String, Object>>) g.get("items");
            items.add(item);
            g.put("totalOrderedQty", ((BigDecimal) g.get("totalOrderedQty")).add(dec(r, "ordered_qty")));
            g.put("totalReceivedQty", ((BigDecimal) g.get("totalReceivedQty")).add(dec(r, "po_received_qty")));
            g.put("totalBalanceQty", ((BigDecimal) g.get("totalBalanceQty")).add(dec(r, "pending_grn_qty")));
        }
        return new ArrayList<>(groups.values());
    }

    /**
     * Refuses to cancel a PO while material for it is at the gate: a vehicle with its lines is inside and not yet
     * verified, or verified quantity is still waiting for GRN or on hold. Called by both PO cancellation paths with
     * the PO row locked.
     */
    public static void assertNoOpenGateWork(JdbcTemplate jdbc, String poNumber) {
        List<String> open = jdbc.queryForList(
                "SELECT DISTINCT e.gate_entry_number FROM public.gate_entry_lines l JOIN public.gate_entries e ON e.id = l.gate_entry_id "
                        + "WHERE l.po_number = ? AND (e.stage IN ('GATE_IN','UNLOADING','UNLOADED') "
                        + "OR (e.stage IN ('VERIFIED','EXITED') AND (l.accepted_qty > l.grn_posted_qty OR l.hold_qty > 0))) ORDER BY 1",
                String.class, poNumber);
        if (!open.isEmpty()) {
            throw new ConflictException("PO " + poNumber + " has material at the gate (" + String.join(", ", open)
                    + "). Finish or turn back those gate entries, and post or reject their quantities, before cancelling the PO.");
        }
    }
}
