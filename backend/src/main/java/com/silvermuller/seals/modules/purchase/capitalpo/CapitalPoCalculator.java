package com.silvermuller.seals.modules.purchase.capitalpo;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Capital PO money rules. Everything is calculated on the backend, in 2-decimal money, HALF_UP.
 * GST rates are passed in from hsn_tax_master (never hardcoded here).
 */
public final class CapitalPoCalculator {

    public record LineCalc(BigDecimal gross, BigDecimal discount, BigDecimal taxable, BigDecimal gstRate,
                           BigDecimal cgst, BigDecimal sgst, BigDecimal igst, BigDecimal gstAmount, BigDecimal lineTotal) {}

    public record ChargeCalc(BigDecimal taxable, BigDecimal gstRate, BigDecimal cgst, BigDecimal sgst,
                             BigDecimal igst, BigDecimal gstAmount, BigDecimal total) {}

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal TWO_HUNDRED = new BigDecimal("200");

    private CapitalPoCalculator() {}

    public static BigDecimal money(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    /** quantity x unit price, less a line discount (NONE, PERCENT or AMOUNT), then GST split by supply type. */
    public static LineCalc line(BigDecimal qty, BigDecimal unitPrice, String discountType, BigDecimal discountValue,
                                BigDecimal gstRate, boolean intra) {
        if (qty == null || qty.signum() <= 0) throw new IllegalArgumentException("Quantity must be greater than zero.");
        if (unitPrice == null || unitPrice.signum() < 0) throw new IllegalArgumentException("Unit price cannot be negative.");
        validateRate(gstRate, "GST rate");
        BigDecimal gross = money(qty.multiply(unitPrice));
        BigDecimal dv = discountValue == null ? BigDecimal.ZERO : discountValue;
        if (dv.signum() < 0) throw new IllegalArgumentException("Discount cannot be negative.");
        String type = discountType == null ? "NONE" : discountType.trim().toUpperCase();
        BigDecimal discount;
        switch (type) {
            case "NONE" -> discount = BigDecimal.ZERO;
            case "PERCENT" -> {
                if (dv.compareTo(HUNDRED) > 0) throw new IllegalArgumentException("Discount percentage cannot exceed 100.");
                discount = money(gross.multiply(dv).divide(HUNDRED, 4, RoundingMode.HALF_UP));
            }
            case "AMOUNT" -> {
                if (dv.compareTo(gross) > 0) throw new IllegalArgumentException("Discount amount cannot exceed the line value " + gross + ".");
                discount = money(dv);
            }
            default -> throw new IllegalArgumentException("Discount type must be NONE, PERCENT or AMOUNT.");
        }
        BigDecimal taxable = money(gross.subtract(discount));
        BigDecimal[] split = split(taxable, gstRate, intra);
        BigDecimal gst = split[0].add(split[1]).add(split[2]);
        return new LineCalc(gross, discount, taxable, gstRate, split[0], split[1], split[2], gst, money(taxable.add(gst)));
    }

    /** Freight / installation / other charges, taxed at the rate of the SAC selected for them. */
    public static ChargeCalc charges(BigDecimal amount, BigDecimal gstRate, boolean intra) {
        BigDecimal taxable = money(amount == null ? BigDecimal.ZERO : amount);
        if (taxable.signum() < 0) throw new IllegalArgumentException("Charges cannot be negative.");
        validateRate(gstRate, "Charges GST rate");
        BigDecimal[] split = split(taxable, gstRate, intra);
        BigDecimal gst = split[0].add(split[1]).add(split[2]);
        return new ChargeCalc(taxable, gstRate, split[0], split[1], split[2], gst, money(taxable.add(gst)));
    }

    /** Returns {cgst, sgst, igst}. Intra-state splits the rate in two; inter-state uses IGST. */
    static BigDecimal[] split(BigDecimal taxable, BigDecimal gstRate, boolean intra) {
        if (intra) {
            BigDecimal half = money(taxable.multiply(gstRate).divide(TWO_HUNDRED, 4, RoundingMode.HALF_UP));
            return new BigDecimal[]{half, half, BigDecimal.ZERO.setScale(2)};
        }
        BigDecimal igst = money(taxable.multiply(gstRate).divide(HUNDRED, 4, RoundingMode.HALF_UP));
        return new BigDecimal[]{BigDecimal.ZERO.setScale(2), BigDecimal.ZERO.setScale(2), igst};
    }

    private static void validateRate(BigDecimal rate, String label) {
        if (rate == null || rate.signum() < 0 || rate.compareTo(HUNDRED) > 0) {
            throw new IllegalArgumentException(label + " must be between 0 and 100.");
        }
    }
}
