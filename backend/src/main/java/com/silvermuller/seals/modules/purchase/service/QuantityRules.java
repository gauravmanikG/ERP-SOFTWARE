package com.silvermuller.seals.modules.purchase.service;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;

/**
 * Quantity rules shared by PR entry, draft allocation and PO conversion.
 *
 * Every quantity must be greater than zero with at most 2 decimals (the column scale). Units that count whole
 * things must be whole numbers. There is no UoM master in the database yet, so the counted units are listed here;
 * move this list to a UoM master (with an "allows decimals" flag) when one is created.
 */
public final class QuantityRules {

    private static final Set<String> COUNTED_UNITS = Set.of(
            "PCS", "PC", "NOS", "NO", "EA", "EACH", "UNIT", "UNITS", "SET", "SETS", "PAIR", "PAIRS",
            "BOX", "BOXES", "PKT", "PACK", "PACKS", "ROLL", "ROLLS", "REAM", "REAMS", "BAG", "BAGS", "BOTTLE", "BOTTLES");

    private QuantityRules() {}

    public static boolean isCountedUnit(String uom) {
        return uom != null && COUNTED_UNITS.contains(uom.trim().toUpperCase(Locale.ROOT));
    }

    /**
     * Returns an error message, or null when the quantity is acceptable for the unit.
     * wholeQuantityExempt lets a line's exact open balance through even if a legacy record holds a fraction of
     * a counted unit, so old data never gets stuck; any other split of it must still be whole.
     */
    public static String check(BigDecimal qty, String uom, String label, boolean wholeQuantityExempt) {
        if (qty == null || qty.signum() <= 0) return "Quantity for " + label + " must be greater than zero.";
        if (qty.stripTrailingZeros().scale() > 2) return "Quantity for " + label + " can have at most 2 decimal places.";
        if (!wholeQuantityExempt && isCountedUnit(uom) && qty.stripTrailingZeros().scale() > 0) {
            return "Quantity for " + label + " must be a whole number because its unit is " + uom.trim() + ".";
        }
        return null;
    }

    public static String plain(BigDecimal qty) {
        return qty == null ? "0" : qty.stripTrailingZeros().toPlainString();
    }
}
