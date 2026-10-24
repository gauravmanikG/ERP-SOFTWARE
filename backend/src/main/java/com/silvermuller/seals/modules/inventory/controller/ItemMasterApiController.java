package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.common.exception.ConflictException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping({"/api/inventory/items", "/api/items"})
public class ItemMasterApiController {

    private final JdbcTemplate jdbc;

    public ItemMasterApiController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Get all items from Item Master (both Non-FG / Other and FG items).
     * Returns full specifications directly from PostgreSQL database.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllItems(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String type) {

        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ")
           .append("id, ")
           .append("sms_new_part_no, ")
           .append("old_code, ")
           .append("main_fg_code, ")
           .append("description_size, ")
           .append("group_name, ")
           .append("subgroup, ")
           .append("group_code, ")
           .append("category, ")
           .append("purchased_uom, ")
           .append("consumption_uom, ")
           .append("inner_diameter, ")
           .append("outer_diameter, ")
           .append("width, ")
           .append("thickness, ")
           .append("segment, ")
           .append("region, ")
           .append("material, ")
           .append("color, ")
           .append("uom, ")
           .append("COALESCE(price, 0.00) AS price, ")
           .append("image, ")
           .append("application, ")
           .append("ref_no, ")
           .append("oem, ")
           .append("corteco_no, ")
           .append("type, ")
           .append("fitting_position, ")
           .append("swirl_type, ")
           .append("file_name, ")
           .append("domestic_exports, ")
           .append("cross_reference, ")
           .append("hsn_code, ")
           .append("drawing_image, ")
           .append("safety_lead_time, ")
           .append("procurement_lead_time, ")
           .append("total_lead_time, ")
           .append("created_at, ")
           .append("updated_at, ")
           .append("COALESCE(NULLIF(sms_new_part_no, ''), NULLIF(main_fg_code, ''), NULLIF(old_code, ''), 'ITM-' || id) AS item_code, ")
           .append("COALESCE(NULLIF(description_size, ''), NULLIF(subgroup, ''), 'Item ' || id) AS item_name, ")
           .append("COALESCE(NULLIF(purchased_uom, ''), NULLIF(uom, ''), 'PCS') AS uom_clean, ")
           .append("COALESCE(price, 0.00) AS est_rate, ")
           .append("CASE WHEN UPPER(COALESCE(group_name, '')) = 'FG' OR UPPER(COALESCE(category, '')) = 'FG' THEN 'FG' ELSE 'OTHER' END AS item_type ")
           .append("FROM public.item_master WHERE 1=1 ");

        List<Object> params = new ArrayList<>();

        if (search != null && !search.trim().isEmpty()) {
            sql.append("AND (sms_new_part_no ILIKE ? OR description_size ILIKE ? OR old_code ILIKE ? OR main_fg_code ILIKE ?) ");
            String q = "%" + search.trim() + "%";
            params.add(q);
            params.add(q);
            params.add(q);
            params.add(q);
        }

        if (category != null && !category.trim().isEmpty() && !"ALL".equalsIgnoreCase(category)) {
            sql.append("AND (category ILIKE ? OR group_name ILIKE ?) ");
            params.add("%" + category.trim() + "%");
            params.add("%" + category.trim() + "%");
        }

        if (type != null && !type.trim().isEmpty()) {
            if ("FG".equalsIgnoreCase(type)) {
                sql.append("AND (UPPER(COALESCE(group_name, '')) = 'FG' OR UPPER(COALESCE(category, '')) = 'FG') ");
            } else if ("OTHER".equalsIgnoreCase(type) || "NON-FG".equalsIgnoreCase(type)) {
                sql.append("AND (UPPER(COALESCE(group_name, '')) != 'FG' AND UPPER(COALESCE(category, '')) != 'FG') ");
            }
        }

        // Other / Non-FG items first, then newly created by id DESC
        sql.append("ORDER BY CASE WHEN UPPER(COALESCE(group_name, '')) = 'FG' OR UPPER(COALESCE(category, '')) = 'FG' THEN 2 ELSE 1 END, id DESC");

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), params.toArray());
        return ResponseEntity.ok(rows);
    }

    /**
     * Create / Register / Update an item in Item Master (persists directly to PostgreSQL item_master & master).
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createItem(@RequestBody Map<String, Object> body) {
        String code = null;
        if (body.get("item_code") != null) code = body.get("item_code").toString().trim();
        else if (body.get("sms_new_part_no") != null) code = body.get("sms_new_part_no").toString().trim();
        else if (body.get("code") != null) code = body.get("code").toString().trim();

        if (code == null || code.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "item_code is required"));
        }

        String name = null;
        if (body.get("item_name") != null) name = body.get("item_name").toString().trim();
        else if (body.get("description") != null) name = body.get("description").toString().trim();
        else if (body.get("description_size") != null) name = body.get("description_size").toString().trim();
        if (name == null || name.isEmpty()) name = code;

        String oldCode = body.get("old_code") != null ? body.get("old_code").toString().trim() : (body.get("sms_old_part_no") != null ? body.get("sms_old_part_no").toString().trim() : "");
        String category = body.get("category") != null ? body.get("category").toString().trim() : "Raw Material";
        String groupName = body.get("group_name") != null ? body.get("group_name").toString().trim() : (body.get("group") != null ? body.get("group").toString().trim() : ("FG".equalsIgnoreCase(category) ? "FG" : category));
        String subgroup = body.get("subgroup") != null ? body.get("subgroup").toString().trim() : (body.get("sub_category") != null ? body.get("sub_category").toString().trim() : (body.get("product") != null ? body.get("product").toString().trim() : ""));
        String segment = body.get("segment") != null ? body.get("segment").toString().trim() : "";
        String region = body.get("region") != null ? body.get("region").toString().trim() : "";
        String uom = body.get("uom") != null ? body.get("uom").toString().trim() : (body.get("purchased_uom") != null ? body.get("purchased_uom").toString().trim() : "PCS");
        String purchasedUom = body.get("purchased_uom") != null ? body.get("purchased_uom").toString().trim() : uom;
        String consumptionUom = body.get("consumption_uom") != null ? body.get("consumption_uom").toString().trim() : purchasedUom;
        String material = body.get("material") != null ? body.get("material").toString().trim() : (body.get("material_grade") != null ? body.get("material_grade").toString().trim() : "");
        String color = body.get("color") != null ? body.get("color").toString().trim() : "";
        String innerDiameter = body.get("inner_diameter") != null ? body.get("inner_diameter").toString().trim() : "";
        String outerDiameter = body.get("outer_diameter") != null ? body.get("outer_diameter").toString().trim() : "";
        String width = body.get("width") != null ? body.get("width").toString().trim() : (body.get("height") != null ? body.get("height").toString().trim() : "");
        String thickness = body.get("thickness") != null ? body.get("thickness").toString().trim() : "";
        String image = body.get("image") != null ? body.get("image").toString() : null;
        String mainFgCode = body.get("main_fg_code") != null ? body.get("main_fg_code").toString().trim() : (body.get("remark") != null ? body.get("remark").toString().trim() : "");
        String oem = body.get("oem") != null ? body.get("oem").toString().trim() : "";
        String hsnCode = body.get("hsn_code") != null ? body.get("hsn_code").toString().trim() : "";
        String drawingImage = body.get("drawing_image") != null ? body.get("drawing_image").toString() : null;

        // Lead times are numeric; Total Lead Time is always derived here as Safety + Procurement
        BigDecimal safetyLeadTime = parseDecimal(body.get("safety_lead_time"));
        BigDecimal procurementLeadTime = parseDecimal(body.get("procurement_lead_time"));
        BigDecimal totalLeadTime = (safetyLeadTime != null ? safetyLeadTime : BigDecimal.ZERO)
                .add(procurementLeadTime != null ? procurementLeadTime : BigDecimal.ZERO);

        BigDecimal price = BigDecimal.ZERO;
        Object priceObj = body.get("unit_price") != null ? body.get("unit_price") : (body.get("price") != null ? body.get("price") : (body.get("rate") != null ? body.get("rate") : body.get("est_rate")));
        if (priceObj != null) {
            try {
                price = new BigDecimal(priceObj.toString().trim());
            } catch (Exception ignored) {}
        }

        // Check if item already exists by ID or code in item_master
        Long itemId = null;
        if (body.get("id") != null) {
            try {
                itemId = Long.valueOf(body.get("id").toString());
            } catch (Exception ignored) {}
        }

        boolean exists = false;
        if (itemId != null) {
            Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM public.item_master WHERE id = ?", Integer.class, itemId);
            exists = c != null && c > 0;
        }
        if (!exists) {
            List<Map<String, Object>> existing = jdbc.queryForList(
                    "SELECT id FROM public.item_master WHERE sms_new_part_no = ? ORDER BY id LIMIT 1", code);
            if (!existing.isEmpty()) {
                itemId = ((Number) existing.get(0).get("id")).longValue();
                exists = true;
            }
        }

        if (exists && itemId != null) {
            jdbc.update(
                    "UPDATE public.item_master SET sms_new_part_no = ?, old_code = ?, description_size = ?, category = ?, " +
                    "group_name = ?, subgroup = ?, segment = ?, region = ?, uom = ?, purchased_uom = ?, consumption_uom = ?, " +
                    "price = ?, material = ?, color = ?, inner_diameter = ?, outer_diameter = ?, width = ?, thickness = ?, " +
                    "image = COALESCE(?, image), main_fg_code = ?, oem = ?, hsn_code = ?, drawing_image = COALESCE(?, drawing_image), " +
                    "safety_lead_time = ?, procurement_lead_time = ?, total_lead_time = ?, updated_at = NOW() WHERE id = ?",
                    code, oldCode, name, category, groupName, subgroup, segment, region, uom, purchasedUom, consumptionUom,
                    price, material, color, innerDiameter, outerDiameter, width, thickness, image, mainFgCode, oem, hsnCode,
                    drawingImage, safetyLeadTime, procurementLeadTime, totalLeadTime, itemId);
        } else {
            Number newId = jdbc.queryForObject(
                    "INSERT INTO public.item_master (sms_new_part_no, old_code, description_size, category, group_name, " +
                    "subgroup, segment, region, uom, purchased_uom, consumption_uom, price, material, color, " +
                    "inner_diameter, outer_diameter, width, thickness, image, main_fg_code, oem, hsn_code, drawing_image, " +
                    "safety_lead_time, procurement_lead_time, total_lead_time, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id",
                    Long.class,
                    code, oldCode, name, category, groupName, subgroup, segment, region, uom, purchasedUom, consumptionUom,
                    price, material, color, innerDiameter, outerDiameter, width, thickness, image, mainFgCode, oem, hsnCode,
                    drawingImage, safetyLeadTime, procurementLeadTime, totalLeadTime);
            itemId = newId != null ? newId.longValue() : 0L;
        }

        // Also ensure record exists in master table so stock & opening balances stay linked
        try {
            Integer countInMaster = jdbc.queryForObject("SELECT COUNT(*) FROM public.master WHERE code = ?", Integer.class, code);
            if (countInMaster == null || countInMaster == 0) {
                jdbc.update(
                        "INSERT INTO public.master (code, description, category, unit_of_measurement, opening_balance, store_name) " +
                        "VALUES (?, ?, ?, ?, 0.00, 'Main Store')",
                        code, name, category, uom);
            }
        } catch (Exception ignored) {}

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", itemId);
        resp.put("item_code", code);
        resp.put("sms_new_part_no", code);
        resp.put("old_code", oldCode);
        resp.put("item_name", name);
        resp.put("description_size", name);
        resp.put("category", category);
        resp.put("group_name", groupName);
        resp.put("subgroup", subgroup);
        resp.put("segment", segment);
        resp.put("region", region);
        resp.put("uom", uom);
        resp.put("purchased_uom", purchasedUom);
        resp.put("consumption_uom", consumptionUom);
        resp.put("inner_diameter", innerDiameter);
        resp.put("outer_diameter", outerDiameter);
        resp.put("width", width);
        resp.put("thickness", thickness);
        resp.put("material", material);
        resp.put("color", color);
        resp.put("price", price);
        resp.put("est_rate", price);
        resp.put("image", image);
        resp.put("main_fg_code", mainFgCode);
        resp.put("oem", oem);
        resp.put("hsn_code", hsnCode);
        resp.put("drawing_image", drawingImage);
        resp.put("safety_lead_time", safetyLeadTime);
        resp.put("procurement_lead_time", procurementLeadTime);
        resp.put("total_lead_time", totalLeadTime);
        resp.put("item_type", "FG".equalsIgnoreCase(category) ? "FG" : "OTHER");

        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    /** Parses an optional numeric form value; blank or invalid input becomes null. */
    private static BigDecimal parseDecimal(Object value) {
        if (value == null) return null;
        try {
            String s = value.toString().trim();
            return s.isEmpty() ? null : new BigDecimal(s);
        } catch (Exception e) {
            return null;
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteItemById(@PathVariable Long id) {
        List<Map<String, Object>> items = jdbc.queryForList("SELECT sms_new_part_no FROM public.item_master WHERE id = ?", id);
        String code = items.isEmpty() ? null : (String) items.get(0).get("sms_new_part_no");
        jdbc.update("DELETE FROM public.item_master WHERE id = ?", id);
        if (code != null) {
            // The stock master row is keyed by code and may be shared with other items that have the same part number.
            try {
                jdbc.update("DELETE FROM public.master WHERE code = ? AND NOT EXISTS (SELECT 1 FROM public.item_master WHERE sms_new_part_no = ?)", code, code);
            } catch (Exception ignored) {}
        }
        return ResponseEntity.ok(Map.of("success", true, "id", id));
    }

    @DeleteMapping("/by-code/{code}")
    public ResponseEntity<Map<String, Object>> deleteItemByCode(@PathVariable String code) {
        Integer matches = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.item_master WHERE sms_new_part_no = ? OR old_code = ?", Integer.class, code, code);
        if (matches != null && matches > 1) {
            throw new ConflictException(matches + " items share the code '" + code + "'. Delete them one at a time by id.");
        }
        jdbc.update("DELETE FROM public.item_master WHERE sms_new_part_no = ? OR old_code = ?", code, code);
        try {
            jdbc.update("DELETE FROM public.master WHERE code = ? AND NOT EXISTS (SELECT 1 FROM public.item_master WHERE sms_new_part_no = ?)", code, code);
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("success", true, "code", code));
    }
}
