package com.silvermuller.seals.modules.purchase.servicepo;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Backend-only monetary calculation for Service POs. The frontend never decides totals.
 * All money is scaled to 2 decimals (HALF_UP). Tax rates must come from hsn_tax_master.
 */
public final class ServicePoCalculator {

    public enum PricingMethod {
        FIXED_PRICE, HOURLY, DAILY, PER_VISIT, QUANTITY_RATE, MILESTONE, TIME_AND_MATERIAL;

        public boolean isQuantityBased() {
            return this == HOURLY || this == DAILY || this == PER_VISIT
                    || this == QUANTITY_RATE || this == TIME_AND_MATERIAL;
        }

        public static PricingMethod parse(String value) {
            if (value == null) {
                throw new IllegalArgumentException("Pricing method is required.");
            }
            try {
                return PricingMethod.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Unknown pricing method: " + value);
            }
        }
    }

    public record Input(
            PricingMethod method,
            BigDecimal quantity,
            BigDecimal rate,
            BigDecimal fixedAmount,
            String discountType,
            BigDecimal discountValue,
            BigDecimal additionalCharges,
            BigDecimal gstRate,
            BigDecimal cessRate,
            boolean intraState,
            BigDecimal advancePercent,
            BigDecimal retentionPercent,
            BigDecimal tdsRate
    ) {}

    public record Result(
            BigDecimal basicAmount,
            BigDecimal discountAmount,
            BigDecimal additionalCharges,
            BigDecimal taxableAmount,
            BigDecimal gstRate,
            BigDecimal cgstRate,
            BigDecimal cgstAmount,
            BigDecimal sgstRate,
            BigDecimal sgstAmount,
            BigDecimal igstRate,
            BigDecimal igstAmount,
            BigDecimal cessRate,
            BigDecimal cessAmount,
            BigDecimal taxAmount,
            BigDecimal totalAmount,
            BigDecimal advanceAmount,
            BigDecimal retentionAmount,
            BigDecimal tdsAmount
    ) {}

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal TWO = new BigDecimal("2");

    private ServicePoCalculator() {}

    public static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    public static Result calculate(Input in) {
        if (in.method() == null) {
            throw new IllegalArgumentException("Pricing method is required.");
        }

        BigDecimal basic;
        if (in.method().isQuantityBased()) {
            if (in.quantity() == null || in.quantity().signum() <= 0) {
                throw new IllegalArgumentException("Quantity / hours / days / visits must be greater than zero.");
            }
            if (in.rate() == null || in.rate().signum() <= 0) {
                throw new IllegalArgumentException("Rate per unit must be greater than zero.");
            }
            basic = money(in.quantity().multiply(in.rate()));
        } else {
            // FIXED_PRICE and MILESTONE: the agreed contract value is entered directly.
            if (in.fixedAmount() == null || in.fixedAmount().signum() <= 0) {
                throw new IllegalArgumentException("Fixed / contract amount must be greater than zero.");
            }
            basic = money(in.fixedAmount());
        }

        BigDecimal discount = calculateDiscount(in.discountType(), orZero(in.discountValue()), basic);
        BigDecimal additional = money(orZero(in.additionalCharges()));
        if (additional.signum() < 0) {
            throw new IllegalArgumentException("Additional charges cannot be negative.");
        }

        BigDecimal taxable = money(basic.subtract(discount).add(additional));

        BigDecimal gst = money(orZero(in.gstRate()));
        BigDecimal cess = money(orZero(in.cessRate()));
        if (gst.signum() < 0 || gst.compareTo(HUNDRED) > 0 || cess.signum() < 0 || cess.compareTo(HUNDRED) > 0) {
            throw new IllegalArgumentException("GST / cess rate is out of range.");
        }

        BigDecimal cgstRate = ZERO, cgst = ZERO;
        BigDecimal sgstRate = ZERO, sgst = ZERO;
        BigDecimal igstRate = ZERO, igst = ZERO;
        if (in.intraState()) {
            cgstRate = gst.divide(TWO, 2, RoundingMode.HALF_UP);
            sgstRate = cgstRate;
            cgst = money(taxable.multiply(cgstRate).divide(HUNDRED, 4, RoundingMode.HALF_UP));
            sgst = money(taxable.multiply(sgstRate).divide(HUNDRED, 4, RoundingMode.HALF_UP));
        } else {
            igstRate = gst;
            igst = money(taxable.multiply(igstRate).divide(HUNDRED, 4, RoundingMode.HALF_UP));
        }
        BigDecimal cessAmount = money(taxable.multiply(cess).divide(HUNDRED, 4, RoundingMode.HALF_UP));

        BigDecimal tax = cgst.add(sgst).add(igst).add(cessAmount);
        BigDecimal total = money(taxable.add(tax));

        BigDecimal advance = percentOf(total, in.advancePercent(), "Advance percentage");
        BigDecimal retention = percentOf(total, in.retentionPercent(), "Retention percentage");
        BigDecimal tds = percentOf(taxable, in.tdsRate(), "TDS rate");

        return new Result(basic, discount, additional, taxable,
                gst, cgstRate, cgst, sgstRate, sgst, igstRate, igst, cess, cessAmount,
                tax, total, advance, retention, tds);
    }

    static BigDecimal calculateDiscount(String type, BigDecimal value, BigDecimal basic) {
        String t = type == null ? "NONE" : type.trim().toUpperCase();
        if (value.signum() < 0) {
            throw new IllegalArgumentException("Discount value cannot be negative.");
        }
        switch (t) {
            case "NONE":
                return ZERO;
            case "PERCENT":
                if (value.compareTo(HUNDRED) > 0) {
                    throw new IllegalArgumentException("Discount percentage cannot exceed 100.");
                }
                return money(basic.multiply(value).divide(HUNDRED, 4, RoundingMode.HALF_UP));
            case "AMOUNT":
                if (value.compareTo(basic) > 0) {
                    throw new IllegalArgumentException("Discount amount cannot exceed the basic amount.");
                }
                return money(value);
            default:
                throw new IllegalArgumentException("Discount type must be NONE, PERCENT or AMOUNT.");
        }
    }

    private static BigDecimal percentOf(BigDecimal base, BigDecimal pct, String label) {
        BigDecimal p = orZero(pct);
        if (p.signum() < 0 || p.compareTo(HUNDRED) > 0) {
            throw new IllegalArgumentException(label + " must be between 0 and 100.");
        }
        return money(base.multiply(p).divide(HUNDRED, 4, RoundingMode.HALF_UP));
    }
}
