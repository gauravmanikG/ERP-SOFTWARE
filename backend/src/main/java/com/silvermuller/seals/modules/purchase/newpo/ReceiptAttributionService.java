package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.common.exception.ConflictException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Records which PO-by-PR allocation each posted GRN line fulfils.
 *
 * Business rule: only ACCEPTED quantity fulfils a PO. Rejected quantity is not fulfilment, is not attributed
 * to any PR line, and stays on the GRN line (its disposition is reported as outstanding, not returned).
 * Pending-inspection quantity is neither accepted nor rejected yet and is not attributed either.
 *
 * The split is decided once, when the GRN is posted, inside the GRN's transaction, and stored in
 * grn_item_allocations (received_qty and accepted_qty both hold the accepted share written for that allocation).
 * Stored rows are never recomputed later.
 *
 * Locking: the PO row is locked first (FOR UPDATE). Cancellation locks the same row.
 */
@Service
public class ReceiptAttributionService {

    private final JdbcTemplate jdbc;

    public ReceiptAttributionService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Attributes the accepted quantity of one posted GRN to the PO's allocations, oldest allocation first.
     * No-op for a PO without allocations (legacy receipts stay unattributed).
     * Throws ConflictException, which rolls the GRN back, when the PO is cancelled or the accepted quantity
     * exceeds what is still open on the PO. Exception: an older PO (po_origin LEGACY) whose lines were linked to PR
     * lines afterwards may hold more than its PR lines needed; the excess is received unattributed, as before.
     */
    public void attributePostedGrn(long grnId, String poNumber) {
        List<Map<String, Object>> po = jdbc.queryForList(
                "SELECT status, po_origin FROM public.purchase_orders WHERE po_number = ? FOR UPDATE", poNumber);
        if (po.isEmpty()) {
            throw new ConflictException("PO " + poNumber + " was not found; the GRN was not posted.");
        }
        Integer allocationCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ?", Integer.class, poNumber);
        if (allocationCount == null || allocationCount == 0) {
            return; // legacy PO: receipts are not attributed to PR lines
        }
        boolean legacy = "LEGACY".equals(po.get(0).get("po_origin"));
        if ("CANCELLED".equalsIgnoreCase(String.valueOf(po.get(0).get("status")))) {
            throw new ConflictException("PO " + poNumber + " is cancelled; nothing can be received against it. The GRN was not posted.");
        }

        List<Map<String, Object>> lines = jdbc.queryForList(
                "SELECT id, item_code, accepted_qty FROM public.goods_receipt_note_items WHERE grn_id = ? ORDER BY id", grnId);
        for (Map<String, Object> line : lines) {
            BigDecimal accepted = (BigDecimal) line.get("accepted_qty");
            if (accepted == null || accepted.signum() <= 0) continue;
            long grnItemId = ((Number) line.get("id")).longValue();
            String itemCode = (String) line.get("item_code");

            List<Map<String, Object>> allocations = jdbc.queryForList(
                    "SELECT a.id, a.allocated_qty - a.released_qty AS net_qty, " +
                    "COALESCE((SELECT SUM(g.accepted_qty) FROM public.grn_item_allocations g " +
                    "          JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id " +
                    "          JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                    "          WHERE g.allocation_id = a.id AND n.status = 'POSTED'), 0) AS attributed_qty " +
                    "FROM public.po_pr_allocations a WHERE a.po_number = ? AND a.item_code = ? ORDER BY a.id",
                    poNumber, itemCode);

            BigDecimal capacity = BigDecimal.ZERO;
            for (Map<String, Object> a : allocations) {
                BigDecimal open = ((BigDecimal) a.get("net_qty")).subtract((BigDecimal) a.get("attributed_qty"));
                if (open.signum() > 0) capacity = capacity.add(open);
            }
            if (accepted.compareTo(capacity) > 0 && !legacy) {
                throw new ConflictException("Accepted quantity on PO " + poNumber + " / " + itemCode + " is "
                        + accepted.stripTrailingZeros().toPlainString() + " but only "
                        + capacity.stripTrailingZeros().toPlainString() + " is still open. The GRN was not posted.");
            }

            BigDecimal left = accepted;
            for (Map<String, Object> a : allocations) {
                if (left.signum() <= 0) break;
                BigDecimal open = ((BigDecimal) a.get("net_qty")).subtract((BigDecimal) a.get("attributed_qty"));
                if (open.signum() <= 0) continue;
                BigDecimal take = open.min(left);
                jdbc.update("INSERT INTO public.grn_item_allocations (grn_item_id, allocation_id, received_qty, accepted_qty) VALUES (?, ?, ?, ?)",
                        grnItemId, ((Number) a.get("id")).longValue(), take, take);
                left = left.subtract(take);
            }
        }
    }
}
