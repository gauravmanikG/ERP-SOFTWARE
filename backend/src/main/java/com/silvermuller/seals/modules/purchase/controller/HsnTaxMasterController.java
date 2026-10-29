package com.silvermuller.seals.modules.purchase.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@RequestMapping({"/api/purchase/hsn-master", "/api/hsn-master", "/api/hsn", "/api/inventory/hsn-master"})
public class HsnTaxMasterController {

    private final JdbcTemplate jdbc;

    public HsnTaxMasterController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * List all active HSN / SAC codes with optional search by code or description.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listHsn(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "false") boolean includeInactive) {

        StringBuilder sql = new StringBuilder("SELECT id, hsn_sac_code AS \"hsnSacCode\", hsn_sac_code AS \"hsnCode\", description, type, " +
                "gst_rate AS \"gstRate\", cgst_rate AS \"cgstRate\", sgst_rate AS \"sgstRate\", igst_rate AS \"igstRate\", " +
                "cess_rate AS \"cessRate\", chapter, is_active AS \"isActive\" " +
                "FROM public.hsn_tax_master WHERE 1 = 1 ");
        if (!includeInactive) sql.append("AND is_active = TRUE ");

        List<Object> params = new ArrayList<>();
        if (search != null && !search.trim().isEmpty()) {
            sql.append("AND (hsn_sac_code ILIKE ? OR description ILIKE ?) ");
            String q = "%" + search.trim() + "%";
            params.add(q);
            params.add(q);
        }
        if (type != null && !type.trim().isEmpty()) {
            sql.append("AND type = ? ");
            params.add(type.trim().toUpperCase());
        }

        sql.append("ORDER BY chapter ASC NULLS LAST, hsn_sac_code ASC");

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), params.toArray());
        return ResponseEntity.ok(rows);
    }

    /**
     * Lookup a single HSN/SAC code details.
     */
    @GetMapping("/{code}")
    public ResponseEntity<?> getByCode(@PathVariable String code) {
        String sql = "SELECT id, hsn_sac_code AS \"hsnSacCode\", hsn_sac_code AS \"hsnCode\", description, type, " +
                "gst_rate AS \"gstRate\", cgst_rate AS \"cgstRate\", sgst_rate AS \"sgstRate\", igst_rate AS \"igstRate\", " +
                "cess_rate AS \"cessRate\", chapter, is_active AS \"isActive\" " +
                "FROM public.hsn_tax_master WHERE hsn_sac_code = ? AND is_active = TRUE LIMIT 1";
        
        List<Map<String, Object>> rows = jdbc.queryForList(sql, code.trim());
        if (rows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "HSN code not found"));
        }
        return ResponseEntity.ok(rows.get(0));
    }

    /**
     * Add a new HSN/SAC code on-the-fly.
     */
    @PostMapping
    public ResponseEntity<?> createHsn(@RequestBody Map<String, Object> body) {
        String code = body.get("hsnSacCode") != null ? body.get("hsnSacCode").toString().trim() : null;
        String desc = body.get("description") != null ? body.get("description").toString().trim() : null;
        String type = body.get("type") != null ? body.get("type").toString().trim().toUpperCase() : "GOODS";

        if (code == null || code.isEmpty() || desc == null || desc.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "hsnSacCode and description are required"));
        }

        BigDecimal[] rates;
        try {
            rates = requiredRates(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
        BigDecimal gstRate = rates[0];
        BigDecimal cgstRate = rates[1];
        BigDecimal sgstRate = rates[2];
        BigDecimal igstRate = rates[3];
        String chapter = code.length() >= 2 ? code.substring(0, 2) : "99";

        // An active code is never overwritten from "Add"; adding a code that was deleted restores it with these values.
        int added = jdbc.update(
            "INSERT INTO public.hsn_tax_master (hsn_sac_code, description, type, gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, chapter, is_active) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, ?, TRUE) " +
            "ON CONFLICT (hsn_sac_code) DO UPDATE SET " +
            "description = EXCLUDED.description, gst_rate = EXCLUDED.gst_rate, cgst_rate = EXCLUDED.cgst_rate, " +
            "sgst_rate = EXCLUDED.sgst_rate, igst_rate = EXCLUDED.igst_rate, type = EXCLUDED.type, is_active = TRUE " +
            "WHERE public.hsn_tax_master.is_active = FALSE",
            code, desc, type, gstRate, cgstRate, sgstRate, igstRate, chapter
        );
        if (added == 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "HSN code " + code + " already exists. Edit it instead."));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("hsnSacCode", code);
        result.put("description", desc);
        result.put("type", type);
        result.put("gstRate", gstRate);
        result.put("cgstRate", cgstRate);
        result.put("sgstRate", sgstRate);
        result.put("igstRate", igstRate);
        result.put("chapter", chapter);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Update an HSN/SAC code's description, type, GST rate and active flag. The code itself is the key and does not change.
     * Setting isActive=false is a soft delete; isActive=true restores it.
     */
    @PutMapping("/{code}")
    public ResponseEntity<?> updateHsn(@PathVariable String code, @RequestBody Map<String, Object> body) {
        List<Map<String, Object>> current = jdbc.queryForList(
                "SELECT description, type, gst_rate, cgst_rate, sgst_rate, igst_rate, is_active " +
                "FROM public.hsn_tax_master WHERE hsn_sac_code = ?", code.trim());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "HSN code not found"));
        }
        Map<String, Object> cur = current.get(0);

        String desc = body.containsKey("description") && body.get("description") != null
                ? body.get("description").toString().trim() : (String) cur.get("description");
        if (desc == null || desc.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Description is required."));
        }
        String type = body.get("type") != null ? body.get("type").toString().trim().toUpperCase() : (String) cur.get("type");

        // Rates are replaced as a set when any of them is sent; otherwise the stored set is kept.
        boolean ratesSent = body.containsKey("gstRate") || body.containsKey("cgstRate")
                || body.containsKey("sgstRate") || body.containsKey("igstRate");
        BigDecimal[] rates;
        if (ratesSent) {
            try {
                rates = requiredRates(body);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        } else {
            rates = new BigDecimal[] {
                (BigDecimal) cur.get("gst_rate"), (BigDecimal) cur.get("cgst_rate"),
                (BigDecimal) cur.get("sgst_rate"), (BigDecimal) cur.get("igst_rate")
            };
        }
        boolean active = body.get("isActive") instanceof Boolean b ? b : (Boolean) cur.get("is_active");

        jdbc.update(
                "UPDATE public.hsn_tax_master SET description = ?, type = ?, gst_rate = ?, cgst_rate = ?, sgst_rate = ?, " +
                "igst_rate = ?, is_active = ? WHERE hsn_sac_code = ?",
                desc, type, rates[0], rates[1], rates[2], rates[3], active, code.trim());
        // Read back without the active filter, so a code deactivated just now still returns its row.
        return ResponseEntity.ok(jdbc.queryForList(
                "SELECT id, hsn_sac_code AS \"hsnSacCode\", description, type, gst_rate AS \"gstRate\", cgst_rate AS \"cgstRate\", " +
                "sgst_rate AS \"sgstRate\", igst_rate AS \"igstRate\", chapter, is_active AS \"isActive\" " +
                "FROM public.hsn_tax_master WHERE hsn_sac_code = ?", code.trim()).get(0));
    }

    /**
     * GST, CGST, SGST and IGST as typed in. All four are required, none is derived from another, and they must agree:
     * CGST + SGST = GST and IGST = GST. The purchase calculator uses the GST rate, so a mismatch would show two different
     * tax figures for one code.
     * Returns {gst, cgst, sgst, igst}; throws IllegalArgumentException with a message for the user.
     */
    static BigDecimal[] requiredRates(Map<String, Object> body) {
        String[] names = {"gstRate", "cgstRate", "sgstRate", "igstRate"};
        String[] labels = {"GST %", "CGST %", "SGST %", "IGST %"};
        BigDecimal[] out = new BigDecimal[4];
        for (int i = 0; i < 4; i++) {
            Object v = body.get(names[i]);
            if (v == null || v.toString().isBlank()) {
                throw new IllegalArgumentException("GST %, CGST %, SGST % and IGST % are all required.");
            }
            try {
                out[i] = new BigDecimal(v.toString().trim()).setScale(2, RoundingMode.HALF_UP);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException(labels[i] + " must be a number.");
            }
            if (out[i].signum() < 0) throw new IllegalArgumentException(labels[i] + " cannot be negative.");
        }
        if (out[1].add(out[2]).compareTo(out[0]) != 0) {
            throw new IllegalArgumentException("CGST % + SGST % must equal GST %.");
        }
        if (out[3].compareTo(out[0]) != 0) {
            throw new IllegalArgumentException("IGST % must equal GST %.");
        }
        return out;
    }

    /** Soft delete: the code stays on existing POs and is hidden from the list. Use PUT with isActive=true to restore. */
    @DeleteMapping("/{code}")
    public ResponseEntity<?> deleteHsn(@PathVariable String code) {
        int changed = jdbc.update("UPDATE public.hsn_tax_master SET is_active = FALSE WHERE hsn_sac_code = ?", code.trim());
        if (changed == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "HSN code not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "hsnSacCode", code.trim()));
    }
}
