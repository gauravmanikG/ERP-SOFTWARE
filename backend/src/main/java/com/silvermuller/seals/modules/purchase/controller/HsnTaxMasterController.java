package com.silvermuller.seals.modules.purchase.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@CrossOrigin(origins = "*")
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
            @RequestParam(required = false) String type) {
        
        StringBuilder sql = new StringBuilder("SELECT id, hsn_sac_code AS \"hsnSacCode\", hsn_sac_code AS \"hsnCode\", description, type, " +
                "gst_rate AS \"gstRate\", cgst_rate AS \"cgstRate\", sgst_rate AS \"sgstRate\", igst_rate AS \"igstRate\", " +
                "cess_rate AS \"cessRate\", chapter, is_active AS \"isActive\" " +
                "FROM public.hsn_tax_master WHERE is_active = TRUE ");
        
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

        BigDecimal gstRate = new BigDecimal("18.00");
        if (body.get("gstRate") != null) {
            try {
                gstRate = new BigDecimal(body.get("gstRate").toString().trim());
            } catch (Exception ignored) {}
        }

        BigDecimal halfRate = gstRate.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
        String chapter = code.length() >= 2 ? code.substring(0, 2) : "99";

        try {
            jdbc.update(
                "INSERT INTO public.hsn_tax_master (hsn_sac_code, description, type, gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, chapter, is_active) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, ?, TRUE) " +
                "ON CONFLICT (hsn_sac_code) DO UPDATE SET " +
                "description = EXCLUDED.description, gst_rate = EXCLUDED.gst_rate, cgst_rate = EXCLUDED.cgst_rate, " +
                "sgst_rate = EXCLUDED.sgst_rate, igst_rate = EXCLUDED.igst_rate, type = EXCLUDED.type",
                code, desc, type, gstRate, halfRate, halfRate, gstRate, chapter
            );

            Map<String, Object> result = new HashMap<>();
            result.put("hsnSacCode", code);
            result.put("description", desc);
            result.put("type", type);
            result.put("gstRate", gstRate);
            result.put("cgstRate", halfRate);
            result.put("sgstRate", halfRate);
            result.put("igstRate", gstRate);
            result.put("chapter", chapter);

            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save HSN code: " + e.getMessage()));
        }
    }
}
