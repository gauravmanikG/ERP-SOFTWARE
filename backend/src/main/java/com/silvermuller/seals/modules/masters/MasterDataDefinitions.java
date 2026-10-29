package com.silvermuller.seals.modules.masters;

import java.util.List;
import java.util.Map;

/**
 * The code-and-name masters the Masters screens manage. Keys are the only values that reach the API, and the
 * table names here are the only tables it touches, so no request value ever becomes part of a table name.
 *
 * Only a code and a name are stored. Explanations of an entry are not stored here; the screens do not show them.
 */
public final class MasterDataDefinitions {

    public record Definition(String key, String table, String codePrefix, String label, List<String> seedNames) {}

    public static final Map<String, Definition> ALL = Map.of(
            "mode-of-payment", new Definition("mode-of-payment", "master_mode_of_payment", "MOP", "Mode of Payment", List.of(
                    "Bank Transfer / NEFT", "RTGS", "IMPS", "Cheque", "Cash, where legally permitted",
                    "Letter of Credit (LC)", "Bill of Exchange", "Other")),
            "credit-period-basis", new Definition("credit-period-basis", "master_credit_period_basis", "CPB",
                    "Credit Period Calculation From", List.of(
                    "Invoice Date", "Material Receipt Date", "Invoice Approval Date", "GRN Date (Goods Receipt Note)")),
            "payment-terms", new Definition("payment-terms", "master_payment_terms", "PT", "Payment Terms", List.of(
                    "100% Advance", "Partial Advance", "Against Proforma Invoice", "Against Delivery",
                    "7 Days Credit", "15 Days Credit", "30 Days Credit", "45 Days Credit", "60 Days Credit",
                    "90 Days Credit", "Milestone-Based", "As Per Agreement")),
            "freight-options", new Definition("freight-options", "master_freight_options", "FRE", "Freight Options", List.of(
                    "Included in Basic Price", "FOR Our Works", "Freight Paid by Supplier", "Freight To Pay",
                    "Ex-Works", "FOR Destination", "Actual Freight Extra", "Fixed Freight", "Free Delivery",
                    "Collect by Buyer", "Third-Party Transport", "As Per Agreement"))
    );

    private MasterDataDefinitions() {}
}
