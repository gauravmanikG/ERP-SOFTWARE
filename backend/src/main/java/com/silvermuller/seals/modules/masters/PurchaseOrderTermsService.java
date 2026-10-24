package com.silvermuller.seals.modules.masters;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Stores the optional PO terms in purchase_order_terms, one row per PO. Used by both PO by PR and Direct PO inside
 * their create transactions, so a PO and its terms are saved together or not at all.
 */
@Service
public class PurchaseOrderTermsService implements ApplicationRunner {

    /** The four dropdowns and the master table each one must match. */
    private static final List<Object[]> CODE_FIELDS = List.of(
            new Object[] {"Mode of payment", "master_mode_of_payment"},
            new Object[] {"Payment terms", "master_payment_terms"},
            new Object[] {"Credit period calculation from", "master_credit_period_basis"},
            new Object[] {"Freight option", "master_freight_options"});

    private final JdbcTemplate jdbc;

    public PurchaseOrderTermsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute(
            "CREATE TABLE IF NOT EXISTS public.purchase_order_terms (" +
            "po_number VARCHAR(50) PRIMARY KEY, " +
            "mode_of_payment_code VARCHAR(20), payment_terms_code VARCHAR(20), " +
            "credit_period_basis_code VARCHAR(20), freight_option_code VARCHAR(20), " +
            "freight_amount NUMERIC(15,2), dispatch_through TEXT, delivery_required DATE, " +
            "currency VARCHAR(10), conversion_rate NUMERIC(12,4), insurance TEXT, " +
            "terms_conditions TEXT, test_certificate TEXT, packing_instructions TEXT, " +
            "transporter TEXT, bankers TEXT, warranty TEXT, kind_attention TEXT, " +
            "dispatch_to TEXT, bill_to TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    }

    /**
     * Checks the terms before anything is written. Returns a message for the user, or null when everything is valid.
     * A code must exist and be active in its master; an inactive or unknown code is refused.
     */
    public String validate(PurchaseOrderTerms t) {
        if (t == null) return null;
        String[] codes = {t.modeOfPaymentCode(), t.paymentTermsCode(), t.creditPeriodBasisCode(), t.freightOptionCode()};
        for (int i = 0; i < CODE_FIELDS.size(); i++) {
            String code = clean(codes[i]);
            if (code == null) continue;
            String label = (String) CODE_FIELDS.get(i)[0];
            String table = (String) CODE_FIELDS.get(i)[1];
            Integer found = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM public." + table + " WHERE code = ? AND is_active = TRUE", Integer.class, code);
            if (found == null || found == 0) return label + " \"" + code + "\" is not an active entry in its master.";
        }
        if (t.conversionRate() != null && t.conversionRate().signum() <= 0) {
            return "Conversion rate must be above zero.";
        }
        return null;
    }

    /** Saves the terms for one PO. Call only after validate() has passed. Blank fields are stored as empty. */
    public void save(String poNumber, PurchaseOrderTerms t, BigDecimal freightAmount) {
        PurchaseOrderTerms x = t == null ? PurchaseOrderTerms.NONE : t;
        jdbc.update(
            "INSERT INTO public.purchase_order_terms (po_number, mode_of_payment_code, payment_terms_code, credit_period_basis_code, " +
            "freight_option_code, freight_amount, dispatch_through, delivery_required, currency, conversion_rate, insurance, " +
            "terms_conditions, test_certificate, packing_instructions, transporter, bankers, warranty, kind_attention, dispatch_to, bill_to) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            poNumber,
            clean(x.modeOfPaymentCode()), clean(x.paymentTermsCode()), clean(x.creditPeriodBasisCode()), clean(x.freightOptionCode()),
            freightAmount,
            clean(x.dispatchThrough()), x.deliveryRequired() == null ? null : java.sql.Date.valueOf(x.deliveryRequired()),
            clean(x.currency()), x.conversionRate(),
            clean(x.insurance()), clean(x.termsConditions()), clean(x.testCertificate()), clean(x.packingInstructions()),
            clean(x.transporter()), clean(x.bankers()), clean(x.warranty()), clean(x.kindAttention()),
            clean(x.dispatchTo()), clean(x.billTo()));
    }

    /** The saved terms of one PO, with their column names. Empty when the PO has none. */
    public Map<String, Object> find(String poNumber) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT mode_of_payment_code, payment_terms_code, credit_period_basis_code, freight_option_code, freight_amount, " +
                "dispatch_through, delivery_required, currency, conversion_rate, insurance, terms_conditions, test_certificate, " +
                "packing_instructions, transporter, bankers, warranty, kind_attention, dispatch_to, bill_to " +
                "FROM public.purchase_order_terms WHERE po_number = ?", poNumber);
        return rows.isEmpty() ? new LinkedHashMap<>() : rows.get(0);
    }

    private static String clean(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
