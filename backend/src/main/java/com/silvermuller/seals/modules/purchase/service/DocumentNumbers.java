package com.silvermuller.seals.modules.purchase.service;

import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/**
 * Document numbers for the purchase flow: PREFIX-YEAR-NNNNN, for example PR-2026-00043, PO-2026-00219,
 * GRN-2026-00025, DRAFT-2026-001, JWO-2026-00001. The year is the year the document is created in, and the counter starts again at 1
 * every new year (PO-2027-00001).
 *
 * The counter for (document type, year) lives in document_number_counters and is incremented with one atomic
 * INSERT ... ON CONFLICT DO UPDATE, so concurrent requests never get the same number. Each call also moves the counter
 * past the highest number of that year already stored, so numbers written before this counter existed (or by
 * another path) are never issued again. Inside a transaction the counter row stays locked until commit; a rolled-back
 * document gives its number back.
 */
public final class DocumentNumbers {

    public enum Doc {
        PR("PR", "purchase_requisitions", "pr_number", 5),
        PO("PO", "purchase_orders", "po_number", 5),
        GRN("GRN", "goods_receipt_notes", "grn_number", 5),
        DRAFT("DRAFT", "po_drafts", "draft_number", 3),
        // Job work documents
        JWI("JWI", "job_work_indents", "indent_number", 5),
        JWO("JWO", "job_work_orders", "jwo_number", 5),
        JWC("JWC", "job_work_challans", "challan_number", 5),
        JWR("JWR", "job_work_receipts", "receipt_number", 5),
        ADJ("ADJ", "job_work_adjustments", "adjustment_number", 5);

        final String prefix;
        final String table;
        final String column;
        final int width;

        Doc(String prefix, String table, String column, int width) {
            this.prefix = prefix;
            this.table = table;
            this.column = column;
            this.width = width;
        }
    }

    private DocumentNumbers() {}

    /** Takes the next number of the current year. */
    public static String next(JdbcTemplate jdbc, Doc doc) {
        return next(jdbc, doc, LocalDate.now().getYear());
    }

    /** Takes the next number of the given year (each year has its own counter). */
    public static String next(JdbcTemplate jdbc, Doc doc, int year) {
        long floor = highestStored(jdbc, doc, year);
        Long value = jdbc.queryForObject(
                "INSERT INTO public.document_number_counters (doc_type, year, last_value) VALUES (?, ?, ?) " +
                "ON CONFLICT (doc_type, year) DO UPDATE SET last_value = GREATEST(public.document_number_counters.last_value, EXCLUDED.last_value - 1) + 1 " +
                "RETURNING last_value",
                Long.class, doc.name(), year, floor + 1);
        return format(doc, year, value == null ? floor + 1 : value);
    }

    /** The number the next document will get, for showing on a form. Nothing is reserved. */
    public static String peek(JdbcTemplate jdbc, Doc doc) {
        int year = LocalDate.now().getYear();
        List<Long> last = jdbc.queryForList(
                "SELECT last_value FROM public.document_number_counters WHERE doc_type = ? AND year = ?", Long.class, doc.name(), year);
        long counter = last.isEmpty() || last.get(0) == null ? 0 : last.get(0);
        return format(doc, year, Math.max(counter, highestStored(jdbc, doc, year)) + 1);
    }

    public static String format(Doc doc, int year, long n) {
        return String.format(Locale.ROOT, "%s-%d-%0" + doc.width + "d", doc.prefix, year, n);
    }

    private static long highestStored(JdbcTemplate jdbc, Doc doc, int year) {
        String head = doc.prefix + "-" + year + "-";
        Long max = jdbc.queryForObject(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(" + doc.column + " FROM ?) AS BIGINT)), 0) FROM public." + doc.table +
                " WHERE " + doc.column + " ~ ?",
                Long.class, "^" + head + "([0-9]+)$", "^" + head + "[0-9]+$");
        return max == null ? 0 : max;
    }
}
