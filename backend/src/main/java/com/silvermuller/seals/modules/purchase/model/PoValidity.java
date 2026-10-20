package com.silvermuller.seals.modules.purchase.model;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * PO validity rules shared by PO creation, extension, GRN save/post and the receipt endpoint.
 *
 * A PO is VALID up to and including its validity date, and EXPIRED from the following day.
 * POs created before this feature have no validity date (NOT_SET) and are never blocked.
 */
public final class PoValidity {

    public static final String VALID = "VALID";
    public static final String EXPIRED = "EXPIRED";
    public static final String NOT_SET = "NOT_SET";

    private PoValidity() {}

    /** Date as shown to users, in the application master format (DD-MM-YYYY, same as the frontend DATE_FORMAT). */
    static String display(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
    }

    /** Parses a yyyy-MM-dd value. Blank or null means "not set" and returns null. */
    public static LocalDate parse(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return LocalDate.parse(value.trim());
    }

    /** Parses a required validity date and rejects blank or malformed input. */
    public static LocalDate parseRequired(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("PO Validity Date is mandatory.");
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            throw new IllegalArgumentException("PO Validity Date must be a valid date (yyyy-MM-dd).");
        }
    }

    public static String status(LocalDate validity, LocalDate today) {
        if (validity == null) return NOT_SET;
        return isExpired(validity, today) ? EXPIRED : VALID;
    }

    public static boolean isExpired(LocalDate validity, LocalDate today) {
        return validity != null && today.isAfter(validity);
    }

    /** Validates a new PO Validity Date for a PO creation or extension. */
    public static void validateNewDate(LocalDate proposed, LocalDate today) {
        if (proposed == null) {
            throw new IllegalArgumentException("PO Validity Date is mandatory.");
        }
        if (proposed.isBefore(today)) {
            throw new IllegalArgumentException("PO Validity Date cannot be in the past.");
        }
    }

    /**
     * Validates an extension. The new date must be today or later and strictly after the current
     * validity date. A PO with no current date may be given its first validity date.
     */
    public static void validateExtension(LocalDate current, LocalDate proposed, LocalDate today) {
        validateNewDate(proposed, today);
        if (current != null && !proposed.isAfter(current)) {
            throw new IllegalArgumentException(
                "New validity date must be later than the current validity date (" + display(current) + ").");
        }
    }

    /** Throws if the PO has an expired validity date. Used before any GRN write or stock-affecting step. */
    public static void assertNotExpired(String poNumber, String validityDate, LocalDate today) {
        LocalDate validity = parse(validityDate);
        if (isExpired(validity, today)) {
            throw new IllegalArgumentException(
                "PO " + poNumber + " expired on " + display(validity) + ". GRN cannot be saved or posted against an expired PO. "
                + "Its validity must be extended (Extend Validity on the PO) before receiving goods.");
        }
    }
}
