package com.silvermuller.seals.modules.purchase.newpo;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Vendor Rate Master for the New Purchase Order module.
 *
 * Insert-only history: a new price is always a new row with its own effective date. Older rows are
 * never updated or deleted, so historical POs can always be traced to the rate that was in force.
 */
@Service
public class VendorRateService {

    public static class NewPoException extends RuntimeException {
        private final HttpStatus status;

        public NewPoException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }

        public HttpStatus getStatus() {
            return status;
        }
    }

    public record RateRequest(String supplierCode, Long itemId, BigDecimal offeredUnitPrice, LocalDate effectiveFrom) {}

    private final JdbcTemplate jdbc;

    public VendorRateService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ------------------------------------------------------------------ lookups

    public List<Map<String, Object>> vendorLookup(String q) {
        String like = "%" + (q == null ? "" : q.trim()) + "%";
        return jdbc.queryForList(
                "SELECT supplier_code, supplier_name FROM public.supplier_master " +
                "WHERE status = 'ACTIVE' AND (supplier_name ILIKE ? OR supplier_code ILIKE ?) " +
                "ORDER BY supplier_name LIMIT 200",
                like, like);
    }

    /**
     * Item Master lookup: every item, FG and other, matched on part number, description, old code, main FG code or HSN code.
     * item_type tells the two groups apart (FG when group_name or category is FG, OTHER otherwise).
     */
    public List<Map<String, Object>> itemLookup(String q) {
        String like = "%" + (q == null ? "" : q.trim()) + "%";
        return jdbc.queryForList(
                "SELECT id, sms_new_part_no, description_size, uom, hsn_code, " +
                "CASE WHEN UPPER(COALESCE(group_name, '')) = 'FG' OR UPPER(COALESCE(category, '')) = 'FG' THEN 'FG' ELSE 'OTHER' END AS item_type " +
                "FROM public.item_master " +
                "WHERE sms_new_part_no ILIKE ? OR description_size ILIKE ? OR old_code ILIKE ? OR main_fg_code ILIKE ? OR hsn_code ILIKE ? " +
                "ORDER BY sms_new_part_no NULLS LAST, id LIMIT 500",
                like, like, like, like, like);
    }

    // ------------------------------------------------------------------ rates

    /** Full history, newest effective date first. Either filter may be null. */
    public List<Map<String, Object>> history(String supplierCode, Long itemId) {
        StringBuilder sql = new StringBuilder(
                "SELECT r.id, r.supplier_code, s.supplier_name, r.item_id, i.sms_new_part_no, i.description_size, " +
                "r.offered_unit_price, r.effective_from, r.created_by, r.created_at " +
                "FROM public.vendor_item_rates r " +
                "JOIN public.supplier_master s ON s.supplier_code = r.supplier_code " +
                "JOIN public.item_master i ON i.id = r.item_id WHERE 1 = 1");
        Object[] args = new Object[2];
        int n = 0;
        if (supplierCode != null && !supplierCode.isBlank()) {
            sql.append(" AND r.supplier_code = ?");
            args[n++] = supplierCode.trim();
        }
        if (itemId != null) {
            sql.append(" AND r.item_id = ?");
            args[n++] = itemId;
        }
        sql.append(" ORDER BY r.effective_from DESC, r.created_at DESC LIMIT 1000");
        return jdbc.queryForList(sql.toString(), java.util.Arrays.copyOf(args, n));
    }

    /**
     * The rate that applies on {@code onDate}: the latest row whose effective date is on or before it.
     * Future-effective rows are ignored until their date arrives. Returns null when none applies.
     */
    public Map<String, Object> effectiveRate(String supplierCode, Long itemId, LocalDate onDate) {
        if (supplierCode == null || supplierCode.isBlank() || itemId == null) {
            throw new NewPoException(HttpStatus.BAD_REQUEST, "Vendor and item are required to find a rate.");
        }
        LocalDate asOf = onDate == null ? LocalDate.now() : onDate;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, supplier_code, item_id, offered_unit_price, effective_from, created_by, created_at " +
                "FROM public.vendor_item_rates " +
                "WHERE supplier_code = ? AND item_id = ? AND effective_from <= ? " +
                "ORDER BY effective_from DESC, created_at DESC LIMIT 1",
                supplierCode.trim(), itemId, java.sql.Date.valueOf(asOf));
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Insert-only. Duplicate (vendor, item, effective date) is refused, never overwritten. */
    @Transactional
    public Map<String, Object> create(RateRequest r, String actor) {
        if (actor == null || actor.isBlank()) {
            throw new NewPoException(HttpStatus.UNAUTHORIZED, "Missing current user (X-User-Name header).");
        }
        String supplierCode = r.supplierCode() == null ? "" : r.supplierCode().trim();
        if (supplierCode.isEmpty()) throw bad("Select a vendor from the Vendor Master.");
        if (r.itemId() == null) throw bad("Select an item from the Item Master.");
        if (r.offeredUnitPrice() == null || r.offeredUnitPrice().signum() <= 0) {
            throw bad("Offered unit price must be greater than zero.");
        }
        if (r.offeredUnitPrice().scale() > 2) throw bad("Offered unit price can have at most 2 decimal places.");
        if (r.effectiveFrom() == null) throw bad("Effective From date is required.");

        List<Map<String, Object>> sup = jdbc.queryForList(
                "SELECT status FROM public.supplier_master WHERE supplier_code = ?", supplierCode);
        if (sup.isEmpty()) throw bad("Vendor " + supplierCode + " was not found in the Vendor Master.");
        if (!"ACTIVE".equalsIgnoreCase(String.valueOf(sup.get(0).get("status")))) {
            throw bad("Vendor " + supplierCode + " is not active.");
        }
        Integer items = jdbc.queryForObject("SELECT COUNT(*) FROM public.item_master WHERE id = ?", Integer.class, r.itemId());
        if (items == null || items == 0) throw bad("Item " + r.itemId() + " was not found in the Item Master.");

        Integer duplicate = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.vendor_item_rates WHERE supplier_code = ? AND item_id = ? AND effective_from = ?",
                Integer.class, supplierCode, r.itemId(), java.sql.Date.valueOf(r.effectiveFrom()));
        if (duplicate != null && duplicate > 0) {
            throw new NewPoException(HttpStatus.CONFLICT,
                    "A rate for this vendor and item already exists on " + r.effectiveFrom() + ". Use a different effective date.");
        }

        Long id;
        try {
            id = jdbc.queryForObject(
                    "INSERT INTO public.vendor_item_rates (supplier_code, item_id, offered_unit_price, effective_from, created_by) " +
                    "VALUES (?, ?, ?, ?, ?) RETURNING id",
                    Long.class, supplierCode, r.itemId(), r.offeredUnitPrice(), java.sql.Date.valueOf(r.effectiveFrom()), actor.trim());
        } catch (DataIntegrityViolationException ex) {
            // A concurrent request inserted the same vendor/item/date between the check and the insert.
            throw new NewPoException(HttpStatus.CONFLICT, "A rate for this vendor and item already exists on " + r.effectiveFrom() + ".");
        }
        return jdbc.queryForMap(
                "SELECT id, supplier_code, item_id, offered_unit_price, effective_from, created_by, created_at " +
                "FROM public.vendor_item_rates WHERE id = ?", id);
    }

    private static NewPoException bad(String message) {
        return new NewPoException(HttpStatus.BAD_REQUEST, message);
    }
}
