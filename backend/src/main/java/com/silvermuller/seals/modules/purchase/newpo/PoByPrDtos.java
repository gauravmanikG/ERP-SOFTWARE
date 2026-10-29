package com.silvermuller.seals.modules.purchase.newpo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Request and response shapes for the PO by PR workflow. */
public final class PoByPrDtos {

    private PoByPrDtos() {}

    public enum Mode { FULL, PARTIAL }

    /**
     * One PR line the user is ordering. Quantity is ignored in FULL mode (the server uses the remaining quantity).
     * discountPercent and manualDiscount apply to this PR line's share of the item's price; remarks are kept with it.
     */
    public record LineRequest(Long prItemId, BigDecimal quantity, BigDecimal discountPercent, BigDecimal manualDiscount, String remarks, LocalDate dueOn) {
        public LineRequest(Long prItemId, BigDecimal quantity) {
            this(prItemId, quantity, null, null, null, null);
        }
        public LineRequest(Long prItemId, BigDecimal quantity, BigDecimal discountPercent, BigDecimal manualDiscount, String remarks) {
            this(prItemId, quantity, discountPercent, manualDiscount, remarks, null);
        }
    }

    /** PO-level charges (vendor freight, other charges, round off) and remarks, on top of the line totals. */
    /** terms is optional: payment, freight and dispatch details chosen from the Masters screens and free text. */
    /** schedules is optional: delivery lots per item (see DeliveryLots). */
    public record CreatePoRequest(String vendorCode, LocalDate poDate, String mode, List<LineRequest> lines, String remarks,
                                  BigDecimal deliveryFreight, BigDecimal otherCharges, BigDecimal roundOff,
                                  com.silvermuller.seals.modules.masters.PurchaseOrderTerms terms,
                                  List<DeliveryLots.Lot> schedules) {
        public CreatePoRequest(String vendorCode, LocalDate poDate, String mode, List<LineRequest> lines, String remarks) {
            this(vendorCode, poDate, mode, lines, remarks, null, null, null, null, null);
        }
    }

    /** One eligible PR line for the selected item, with the vendor's rate on the PO date and receipts so far. */
    public record EligiblePrLine(
            Long prItemId,
            String prNumber,
            String prDate,
            String itemCode,
            String itemName,
            String uom,
            String hsnCode,
            BigDecimal requestedQty,
            BigDecimal previouslyOrderedQty,
            BigDecimal remainingQty,
            BigDecimal receivedQty,
            String requiredByDate,
            BigDecimal unitPrice,
            LocalDate rateEffectiveFrom,
            BigDecimal orderedOutsidePoByPrQty) {}

    /**
     * Quantities for every line of one PR. Ordering and receiving are tracked separately: a PR line can be
     * fully received while the PR stays open because other lines are still not ordered.
     */
    public record PrLineStatus(
            Long prItemId,
            String itemCode,
            String itemName,
            BigDecimal requestedQty,
            BigDecimal orderedQty,
            BigDecimal orderedThroughPoByPrQty,
            BigDecimal orderedOutsidePoByPrQty,
            BigDecimal remainingToOrderQty,
            BigDecimal receivedQty,
            BigDecimal pendingReceiptQty,
            String orderingStatus,
            String receivingStatus,
            String lifecycleStatus) {}

    /** A PO line as it will be (or was) saved: one per item, with discount and GST from the existing calculator. */
    public record PlannedLine(
            String itemCode,
            String itemName,
            String uom,
            String hsnCode,
            BigDecimal quantity,
            BigDecimal unitRate,
            BigDecimal taxPercent,
            String taxType,
            BigDecimal discountAmount,
            BigDecimal taxableAmount,
            BigDecimal cgstAmount,
            BigDecimal sgstAmount,
            BigDecimal igstAmount,
            BigDecimal taxAmount,
            BigDecimal itemTotal,
            String remarks) {}

    /** Which PR line quantity goes into the PO line. */
    public record PlannedAllocation(Long prItemId, String prNumber, String itemCode, BigDecimal allocatedQty, BigDecimal unitPrice) {}

    public record PlannedPo(
            String vendorCode,
            String vendorName,
            String vendorGstin,
            LocalDate poDate,
            List<PlannedLine> lines,
            List<PlannedAllocation> allocations,
            BigDecimal itemsGross,
            BigDecimal totalDiscount,
            BigDecimal taxableAmount,
            BigDecimal totalTax,
            BigDecimal deliveryCharges,
            BigDecimal otherCharges,
            BigDecimal roundOff,
            BigDecimal grandTotal) {}

    public record CreatedPo(String poNumber, String poId, PlannedPo po) {}
}
