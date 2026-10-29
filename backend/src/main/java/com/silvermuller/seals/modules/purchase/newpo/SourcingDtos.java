package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.masters.PurchaseOrderTerms;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Request shapes for sourcing: clubbed demand -> vendor drafts -> PO. */
public final class SourcingDtos {

    private SourcingDtos() {}

    /** One PR line to put in the vendor's draft. quantity null = everything ready for sourcing on that line. */
    public record AssignLine(Long prItemId, BigDecimal quantity) {}

    /**
     * Gives the clubbed demand for one item (item code + unit) to one vendor. lines null or empty = every PR line
     * of that item that is ready for sourcing, each with its full ready quantity.
     */
    public record AssignRequest(String itemCode, String uom, String vendorCode, List<AssignLine> lines) {}

    /** One draft line to send back to sourcing. quantity null = its whole open quantity. */
    public record ReleaseLine(Long allocationId, BigDecimal quantity) {}

    /** lines null or empty = release every open line of the draft. */
    public record ReleaseRequest(List<ReleaseLine> lines, String reason) {}

    /** One draft line on the PO. quantity null or 0 = not purchased now (stays in the draft). dueOn = the date this line is due. */
    public record ConvertLine(Long allocationId, BigDecimal quantity, BigDecimal discountPercent, BigDecimal manualDiscount, String remarks, LocalDate dueOn) {
        public ConvertLine(Long allocationId, BigDecimal quantity, BigDecimal discountPercent, BigDecimal manualDiscount, String remarks) {
            this(allocationId, quantity, discountPercent, manualDiscount, remarks, null);
        }
    }

    /**
     * PO header fields are the same as PO by PR: freight, other charges, round off, terms and delivery schedules.
     * The printed PO also carries invoiceTo, shipTo, voucherNo, referenceNo and referenceDate; these are required
     * (voucherNo defaults to the PO number when left blank).
     */
    public record ConvertRequest(LocalDate poDate, List<ConvertLine> lines, String remarks,
                                 BigDecimal deliveryFreight, BigDecimal otherCharges, BigDecimal roundOff,
                                 PurchaseOrderTerms terms, List<DeliveryLots.Lot> schedules,
                                 String invoiceTo, String shipTo, String voucherNo, String referenceNo, LocalDate referenceDate) {}
}
