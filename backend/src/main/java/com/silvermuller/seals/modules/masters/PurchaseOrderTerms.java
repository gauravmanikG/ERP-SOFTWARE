package com.silvermuller.seals.modules.masters;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Optional terms a user can set on a PO. The four codes are chosen from the Masters screens; the rest are free text.
 * Freight amount is not part of this record: it is the PO's delivery freight, saved with the PO totals.
 */
public record PurchaseOrderTerms(
        String modeOfPaymentCode,
        String paymentTermsCode,
        String creditPeriodBasisCode,
        String freightOptionCode,
        String dispatchThrough,
        LocalDate deliveryRequired,
        String currency,
        BigDecimal conversionRate,
        String insurance,
        String termsConditions,
        String testCertificate,
        String packingInstructions,
        String transporter,
        String bankers,
        String warranty,
        String kindAttention,
        String dispatchTo,
        String billTo) {

    /** Used when a request carries no terms. Every field is optional. */
    public static final PurchaseOrderTerms NONE = new PurchaseOrderTerms(
            null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
}
