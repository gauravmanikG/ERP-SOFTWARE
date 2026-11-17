package com.silvermuller.seals.modules.gate;

import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

/**
 * The one definition of "how much can still be accepted" on a PO line, used by gate verification, hold release and
 * GRN posting. Per PO line:
 * <pre>
 *   ceiling           = PO quantity + over-delivery tolerance (GateSettings.ceilingWithTolerance)
 *   posted            = accepted quantity of POSTED GRNs (any GRN, from the gate or older)
 *   open at gate      = accepted - GRN posted, on gate lines of live entries (not draft, not cancelled)
 *   max for a line L  = ceiling - (posted - L.grnPosted) - open at gate excluding L
 * </pre>
 * Callers lock the PO rows first ({@link #lockPos}), so two verifications or a verification and a GRN cannot both use
 * the same remaining quantity.
 */
final class GateQuantities {

    private GateQuantities() {}

    static final String LIVE_STAGES = "('GATE_IN','UNLOADING','UNLOADED','VERIFIED','TURNED_BACK','EXITED')";

    /** Locks the PO header rows in a fixed order (by PO number), the same first lock a GRN takes. */
    static void lockPos(JdbcTemplate jdbc, Collection<String> poNumbers) {
        for (String po : new TreeSet<>(poNumbers)) {
            jdbc.queryForList("SELECT po_number FROM public.purchase_orders WHERE po_number = ? FOR UPDATE", po);
        }
    }

    static BigDecimal postedGrn(JdbcTemplate jdbc, String po, String item) {
        BigDecimal v = jdbc.queryForObject(
                "SELECT COALESCE(SUM(gi.accepted_qty), 0) FROM public.goods_receipt_note_items gi "
                        + "JOIN public.goods_receipt_notes g ON g.id = gi.grn_id "
                        + "WHERE g.status = 'POSTED' AND gi.po_number = ? AND gi.item_code = ?",
                BigDecimal.class, po, item);
        return GateRows.nz(v);
    }

    static BigDecimal openAtGate(JdbcTemplate jdbc, String po, String item, Long excludeLineId) {
        BigDecimal v = jdbc.queryForObject(
                "SELECT COALESCE(SUM(l.accepted_qty - l.grn_posted_qty), 0) FROM public.gate_entry_lines l "
                        + "JOIN public.gate_entries e ON e.id = l.gate_entry_id "
                        + "WHERE l.po_number = ? AND l.item_code = ? AND e.stage IN " + LIVE_STAGES + " AND l.id <> ?",
                BigDecimal.class, po, item, excludeLineId == null ? -1L : excludeLineId);
        return GateRows.nz(v);
    }

    /** Declared quantity on entries that are inside but not yet verified: on its way in, not yet counted. */
    static BigDecimal declaredInProcess(JdbcTemplate jdbc, String po, String item) {
        BigDecimal v = jdbc.queryForObject(
                "SELECT COALESCE(SUM(l.declared_qty), 0) FROM public.gate_entry_lines l "
                        + "JOIN public.gate_entries e ON e.id = l.gate_entry_id "
                        + "WHERE l.po_number = ? AND l.item_code = ? AND e.stage IN ('GATE_IN','UNLOADING','UNLOADED')",
                BigDecimal.class, po, item);
        return GateRows.nz(v);
    }

    /** PO line facts: quantity, uom, item name. Throws if the item is not on the PO. */
    static Map<String, Object> poLine(JdbcTemplate jdbc, String po, String item) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT quantity, uom, item_name, item_id FROM public.purchase_order_items WHERE po_number = ? AND item_code = ?", po, item);
        if (rows.isEmpty()) throw new IllegalArgumentException("Item " + item + " is not on PO " + po + ".");
        return rows.get(0);
    }

    /** The most line L may have accepted in total, given everything else already accepted on its PO line. */
    static BigDecimal maxAcceptable(JdbcTemplate jdbc, String po, String item, BigDecimal tolerancePct,
                                    Long lineId, BigDecimal lineGrnPosted) {
        Map<String, Object> pl = poLine(jdbc, po, item);
        BigDecimal ceiling = GateSettings.ceilingWithTolerance(GateRows.dec(pl, "quantity"), GateRows.str(pl, "uom"), tolerancePct);
        BigDecimal usedElsewhere = postedGrn(jdbc, po, item).subtract(GateRows.nz(lineGrnPosted)).add(openAtGate(jdbc, po, item, lineId));
        BigDecimal max = ceiling.subtract(usedElsewhere);
        return max.signum() < 0 ? BigDecimal.ZERO : max;
    }
}
