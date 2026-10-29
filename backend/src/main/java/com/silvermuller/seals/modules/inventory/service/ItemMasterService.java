package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Item Master (public.item_master). Every write to items goes through here.
 *
 * Rules: an item code is unique (case-insensitive) for new and changed items; creating never overwrites an existing
 * item; a non-FG item must use a group from Item Groups and, if given, one of that group's subgroups; an item that
 * other records use cannot be deleted.
 */
@Service
public class ItemMasterService {

    private static final String SELECT_ITEMS = "SELECT id, sms_new_part_no, old_code, main_fg_code, description_size, "
            + "group_name, subgroup, group_code, category, purchased_uom, consumption_uom, inner_diameter, outer_diameter, "
            + "width, thickness, segment, region, material, color, uom, COALESCE(price, 0.00) AS price, image, application, "
            + "ref_no, oem, corteco_no, type, fitting_position, swirl_type, file_name, domestic_exports, cross_reference, "
            + "hsn_code, drawing_image, safety_lead_time, procurement_lead_time, total_lead_time, created_at, updated_at, "
            + "sub_subgroup, style, drawing_no, item_class, procurement_type, process_type, COALESCE(status, 'Active') AS status, "
            + "opening_balance, gross_wt, net_wt, rej_tolerance, min_stock_lvl, max_stock_lvl, reorder_stock_lvl, mrp, "
            + "fg_outsource, sfg_outsource, outsource_combo_fg_sfg, "
            + "COALESCE(NULLIF(sms_new_part_no, ''), NULLIF(main_fg_code, ''), NULLIF(old_code, ''), 'ITM-' || id) AS item_code, "
            + "COALESCE(NULLIF(description_size, ''), NULLIF(subgroup, ''), 'Item ' || id) AS item_name, "
            + "COALESCE(NULLIF(purchased_uom, ''), NULLIF(uom, ''), 'PCS') AS uom_clean, "
            + "COALESCE(price, 0.00) AS est_rate, "
            + "CASE WHEN " + isFg("") + " THEN 'FG' ELSE 'OTHER' END AS item_type "
            + "FROM public.item_master WHERE 1=1 ";

    /** Column limits: price NUMERIC(15,2), lead times NUMERIC(10,2), quantities and weights NUMERIC(15,3). */
    private static final BigDecimal PRICE_MAX = new BigDecimal("10000000000000");
    private static final BigDecimal LEAD_TIME_MAX = new BigDecimal("100000000");
    private static final BigDecimal QTY_MAX = new BigDecimal("1000000000000");
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private static final String CORE_COLUMNS = "sms_new_part_no, old_code, description_size, category, group_name, subgroup, "
            + "segment, region, uom, purchased_uom, consumption_uom, price, material, color, inner_diameter, "
            + "outer_diameter, width, thickness, image, main_fg_code, oem, hsn_code, drawing_image, "
            + "safety_lead_time, procurement_lead_time, total_lead_time";

    /** A field one item form shows and the other does not. Text when max is null, otherwise a number below max. */
    private record Extra(String column, String label, Integer maxLength, BigDecimal max) {}

    // Written only when the request carries the key (the JSON key is the column name), so saving from the FG form
    // never clears a field only the Other form shows, and the reverse.
    private static final List<Extra> EXTRAS = List.of(
            new Extra("sub_subgroup", "Sub-subgroup", 255, null),
            new Extra("style", "Style", 255, null),
            new Extra("drawing_no", "Drawing no.", 255, null),
            new Extra("item_class", "Class", 255, null),
            new Extra("procurement_type", "Procurement type", 255, null),
            new Extra("process_type", "Process type", 255, null),
            new Extra("status", "Status", 30, null),
            new Extra("domestic_exports", "Domestic / exports", 255, null),
            new Extra("application", "Application", 255, null),
            new Extra("ref_no", "Ref. no.", 255, null),
            new Extra("corteco_no", "Corteco no.", 255, null),
            new Extra("cross_reference", "Cross reference", 255, null),
            new Extra("fitting_position", "Fitting position", 255, null),
            new Extra("swirl_type", "Swirl type", 255, null),
            new Extra("file_name", "File name", 255, null),
            new Extra("fg_outsource", "FG outsource", 255, null),
            new Extra("sfg_outsource", "SFG outsource", 255, null),
            new Extra("outsource_combo_fg_sfg", "Outsource combo FG & SFG", 255, null),
            new Extra("opening_balance", "Opening balance", null, QTY_MAX),
            new Extra("gross_wt", "Gross weight", null, QTY_MAX),
            new Extra("net_wt", "Net weight", null, QTY_MAX),
            new Extra("rej_tolerance", "Rejection tolerance %", null, new BigDecimal("1000")),
            new Extra("min_stock_lvl", "Min stock level", null, QTY_MAX),
            new Extra("max_stock_lvl", "Max stock level", null, QTY_MAX),
            new Extra("reorder_stock_lvl", "Reorder stock level", null, QTY_MAX),
            new Extra("mrp", "MRP", null, PRICE_MAX));

    private final JdbcTemplate jdbc;

    public ItemMasterService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static String isFg(String alias) {
        return "(UPPER(COALESCE(" + alias + "group_name, '')) = 'FG' OR UPPER(COALESCE(" + alias + "category, '')) = 'FG')";
    }

    public List<Map<String, Object>> list(String search, String category, String type) {
        StringBuilder sql = new StringBuilder(SELECT_ITEMS);
        List<Object> params = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            sql.append("AND (sms_new_part_no ILIKE ? OR description_size ILIKE ? OR old_code ILIKE ? OR main_fg_code ILIKE ?) ");
            String q = "%" + search.trim() + "%";
            params.addAll(List.of(q, q, q, q));
        }
        if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
            sql.append("AND (category ILIKE ? OR group_name ILIKE ?) ");
            String c = "%" + category.trim() + "%";
            params.addAll(List.of(c, c));
        }
        if ("FG".equalsIgnoreCase(type)) {
            sql.append("AND ").append(isFg("")).append(' ');
        } else if ("OTHER".equalsIgnoreCase(type) || "NON-FG".equalsIgnoreCase(type)) {
            sql.append("AND NOT ").append(isFg("")).append(' ');
        }
        // Other / Non-FG items first, then newest first
        sql.append("ORDER BY CASE WHEN ").append(isFg("")).append(" THEN 2 ELSE 1 END, id DESC");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    /** Creates an item (no id) or updates the item with that id. Returns the saved values. */
    @Transactional
    public Saved save(Map<String, Object> body) {
        String code = text(body, 255, "Item code", "item_code", "sms_new_part_no", "code");
        if (code == null) throw new IllegalArgumentException("Item code is required.");
        String name = text(body, null, "Item name", "item_name", "description", "description_size");
        if (name == null) name = code;
        String category = orDefault(text(body, 255, "Category", "category"), "Raw Material");
        String groupName = orDefault(text(body, 255, "Group", "group_name", "group"), "FG".equalsIgnoreCase(category) ? "FG" : category);
        String subgroup = orDefault(text(body, 255, "Subgroup", "subgroup", "sub_category", "product"), "");
        String uom = orDefault(text(body, 100, "UOM", "uom", "purchased_uom"), "PCS");
        String purchasedUom = orDefault(text(body, 100, "Purchased UOM", "purchased_uom"), uom);
        String consumptionUom = orDefault(text(body, 100, "Consumption UOM", "consumption_uom"), purchasedUom);
        Map<String, Object> extras = extras(body);

        if ("FG".equalsIgnoreCase(groupName)) {
            groupName = "FG"; // finished goods: product type in subgroup, not governed by Item Groups
        } else {
            String subSubgroup = (String) extras.get("sub_subgroup");
            String[] canonical = groupAndSubgroups(groupName, subgroup, subSubgroup == null ? "" : subSubgroup);
            groupName = canonical[0];
            subgroup = canonical[1];
            if (subSubgroup != null) extras.put("sub_subgroup", canonical[2]);
        }

        BigDecimal safety = number(body, LEAD_TIME_MAX, "Safety lead time", "safety_lead_time");
        BigDecimal procurement = number(body, LEAD_TIME_MAX, "Procurement lead time", "procurement_lead_time");
        BigDecimal total = (safety != null ? safety : BigDecimal.ZERO).add(procurement != null ? procurement : BigDecimal.ZERO);
        BigDecimal price = number(body, PRICE_MAX, "Price", "unit_price", "price", "rate", "est_rate");
        if (price == null) price = BigDecimal.ZERO;

        Object[] values = {
                code,
                orDefault(text(body, 255, "Old code", "old_code", "sms_old_part_no"), ""),
                name, category, groupName, subgroup,
                orDefault(text(body, 255, "Segment", "segment"), ""),
                orDefault(text(body, 255, "Region", "region"), ""),
                uom, purchasedUom, consumptionUom, price,
                orDefault(text(body, 255, "Material", "material", "material_grade"), ""),
                orDefault(text(body, 255, "Color", "color"), ""),
                orDefault(text(body, 255, "Inner diameter", "inner_diameter"), ""),
                orDefault(text(body, 255, "Outer diameter", "outer_diameter"), ""),
                orDefault(text(body, 255, "Width", "width", "height"), ""),
                orDefault(text(body, 255, "Thickness", "thickness"), ""),
                raw(body, "image"),
                orDefault(text(body, 255, "Main FG code", "main_fg_code", "remark"), ""),
                orDefault(text(body, 255, "OEM", "oem"), ""),
                orDefault(text(body, 50, "HSN code", "hsn_code"), ""),
                raw(body, "drawing_image"),
                safety, procurement, total
        };

        // Serialises saves of the same code so two users cannot create it twice at the same moment.
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtext(?))", Object.class, "item_master:" + code.toUpperCase(Locale.ROOT));

        Long id = id(body);
        boolean created = id == null;
        boolean codeChanges = created;
        if (!created) {
            List<String> current = jdbc.queryForList("SELECT COALESCE(sms_new_part_no, '') FROM public.item_master WHERE id = ? FOR UPDATE",
                    String.class, id);
            if (current.isEmpty()) throw new ResourceNotFoundException("Item " + id + " no longer exists. Refresh the list.");
            codeChanges = !current.get(0).trim().equalsIgnoreCase(code);
        }
        if (codeChanges) {
            // Older imports contain duplicate codes; those items stay editable as long as their code is not changed.
            List<Long> other = jdbc.queryForList("SELECT id FROM public.item_master WHERE UPPER(TRIM(sms_new_part_no)) = UPPER(?) "
                    + "ORDER BY id LIMIT 1", Long.class, code);
            if (!other.isEmpty()) {
                throw new ConflictException("Item code '" + code + "' is already used by another item (id " + other.get(0) + ").");
            }
        }

        // Extra column names come from EXTRAS only, never from the request, so they are safe to put in the SQL text.
        List<String> extraColumns = new ArrayList<>(extras.keySet());
        Object[] args = java.util.Arrays.copyOf(values, values.length + extraColumns.size() + 1);
        for (int i = 0; i < extraColumns.size(); i++) args[values.length + i] = extras.get(extraColumns.get(i));
        if (created) {
            StringBuilder columns = new StringBuilder(CORE_COLUMNS);
            extraColumns.forEach(c -> columns.append(", ").append(c));
            String marks = String.join(", ", java.util.Collections.nCopies(values.length + extraColumns.size(), "?"));
            id = jdbc.queryForObject(
                    "INSERT INTO public.item_master (" + columns + ", created_at, updated_at) VALUES (" + marks
                            + ", NOW(), NOW()) RETURNING id",
                    Long.class, java.util.Arrays.copyOf(args, args.length - 1));
        } else {
            StringBuilder extraSet = new StringBuilder();
            extraColumns.forEach(c -> extraSet.append(c).append(" = ?, "));
            args[args.length - 1] = id;
            int rows = jdbc.update(
                    "UPDATE public.item_master SET sms_new_part_no = ?, old_code = ?, description_size = ?, category = ?, "
                            + "group_name = ?, subgroup = ?, segment = ?, region = ?, uom = ?, purchased_uom = ?, consumption_uom = ?, "
                            + "price = ?, material = ?, color = ?, inner_diameter = ?, outer_diameter = ?, width = ?, thickness = ?, "
                            + "image = COALESCE(?, image), main_fg_code = ?, oem = ?, hsn_code = ?, drawing_image = COALESCE(?, drawing_image), "
                            + "safety_lead_time = ?, procurement_lead_time = ?, total_lead_time = ?, " + extraSet
                            + "updated_at = NOW() WHERE id = ?",
                    args);
            if (rows == 0) throw new ResourceNotFoundException("Item " + id + " no longer exists. Refresh the list.");
        }

        Map<String, Object> out = new HashMap<>();
        out.put("id", id);
        out.put("item_code", code);
        out.put("sms_new_part_no", code);
        out.put("old_code", values[1]);
        out.put("item_name", name);
        out.put("description_size", name);
        out.put("category", category);
        out.put("group_name", groupName);
        out.put("subgroup", subgroup);
        out.put("segment", values[6]);
        out.put("region", values[7]);
        out.put("uom", uom);
        out.put("purchased_uom", purchasedUom);
        out.put("consumption_uom", consumptionUom);
        out.put("price", price);
        out.put("est_rate", price);
        out.put("material", values[12]);
        out.put("color", values[13]);
        out.put("inner_diameter", values[14]);
        out.put("outer_diameter", values[15]);
        out.put("width", values[16]);
        out.put("thickness", values[17]);
        out.put("image", values[18]);
        out.put("main_fg_code", values[19]);
        out.put("oem", values[20]);
        out.put("hsn_code", values[21]);
        out.put("drawing_image", values[22]);
        out.put("safety_lead_time", safety);
        out.put("procurement_lead_time", procurement);
        out.put("total_lead_time", total);
        out.putAll(extras);
        out.put("item_type", "FG".equals(groupName) ? "FG" : "OTHER");
        return new Saved(out, created);
    }

    public record Saved(Map<String, Object> item, boolean created) {}

    @Transactional
    public void delete(long id) {
        List<String> codes = jdbc.queryForList("SELECT COALESCE(sms_new_part_no, '') FROM public.item_master WHERE id = ? FOR UPDATE",
                String.class, id);
        if (codes.isEmpty()) throw new ResourceNotFoundException("Item " + id + " was not found. It may already be deleted.");
        try {
            jdbc.update("DELETE FROM public.item_master WHERE id = ?", id);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Item '" + codes.get(0) + "' is used by other records (for example vendor rates or "
                    + "job work) and cannot be deleted.");
        }
    }

    /** Deletes the single item with this code. Several items sharing the code must be deleted one at a time by id. */
    @Transactional
    public void deleteByCode(String code) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM public.item_master WHERE sms_new_part_no = ? OR old_code = ?",
                Long.class, code, code);
        if (ids.isEmpty()) throw new ResourceNotFoundException("No item with code '" + code + "'. It may already be deleted.");
        if (ids.size() > 1) {
            throw new ConflictException(ids.size() + " items share the code '" + code + "'. Delete them one at a time by id.");
        }
        delete(ids.get(0));
    }

    /** The extra fields the request carries, checked; blank text is stored as "" and a blank number as null. */
    private static Map<String, Object> extras(Map<String, Object> body) {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        for (Extra e : EXTRAS) {
            if (!body.containsKey(e.column())) continue;
            out.put(e.column(), e.max() == null
                    ? orDefault(text(body, e.maxLength(), e.label(), e.column()), "")
                    : number(body, e.max(), e.label(), e.column()));
        }
        if ("".equals(out.get("status"))) out.put("status", "Active");
        if (out.get("rej_tolerance") instanceof BigDecimal rej && rej.compareTo(HUNDRED) > 0) {
            throw new IllegalArgumentException("Rejection tolerance % cannot be above 100.");
        }
        if (out.get("min_stock_lvl") instanceof BigDecimal min && out.get("max_stock_lvl") instanceof BigDecimal max
                && min.compareTo(max) > 0) {
            throw new IllegalArgumentException("Min stock level cannot be above max stock level.");
        }
        return out;
    }

    /**
     * Canonical group name and subgroup names (subgroup, sub-subgroup) from Item Groups; each given subgroup must belong
     * to the group. Locks the rows so a rename or delete cannot interleave.
     */
    private String[] groupAndSubgroups(String groupName, String... subgroups) {
        List<Map<String, Object>> groups = jdbc.queryForList(
                "SELECT id, name FROM public.item_group WHERE LOWER(name) = LOWER(?) FOR SHARE", groupName);
        if (groups.isEmpty()) {
            throw new IllegalArgumentException("Group '" + groupName + "' is not in Item Groups. Select an existing group.");
        }
        String group = (String) groups.get(0).get("name");
        String[] out = new String[subgroups.length + 1];
        out[0] = group;
        for (int i = 0; i < subgroups.length; i++) {
            String subgroup = subgroups[i];
            if (subgroup.isEmpty()) {
                out[i + 1] = "";
                continue;
            }
            List<String> subs = jdbc.queryForList(
                    "SELECT name FROM public.item_subgroup WHERE group_id = ? AND LOWER(name) = LOWER(?) FOR SHARE",
                    String.class, groups.get(0).get("id"), subgroup);
            if (subs.isEmpty()) {
                throw new IllegalArgumentException("Subgroup '" + subgroup + "' is not a subgroup of '" + group + "'.");
            }
            out[i + 1] = subs.get(0);
        }
        return out;
    }

    private static Long id(Map<String, Object> body) {
        Object v = body.get("id");
        if (v == null || v.toString().isBlank()) return null;
        try {
            return Long.valueOf(v.toString().trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Item id '" + v + "' is not valid.");
        }
    }

    /** First non-blank value among the keys, trimmed; null if none. Rejects values longer than max. */
    private static String text(Map<String, Object> body, Integer max, String label, String... keys) {
        for (String k : keys) {
            Object v = body.get(k);
            if (v == null) continue;
            String s = v.toString().trim();
            if (s.isEmpty()) continue;
            if (max != null && s.length() > max) {
                throw new IllegalArgumentException(label + " is too long (maximum " + max + " characters).");
            }
            return s;
        }
        return null;
    }

    private static String raw(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v == null ? null : v.toString();
    }

    private static String orDefault(String value, String fallback) {
        return value != null ? value : fallback;
    }

    /** Optional non-negative number below max; blank means not given. */
    private static BigDecimal number(Map<String, Object> body, BigDecimal max, String label, String... keys) {
        for (String k : keys) {
            Object v = body.get(k);
            if (v == null || v.toString().isBlank()) continue;
            BigDecimal n;
            try {
                n = new BigDecimal(v.toString().trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException(label + " must be a number (got '" + v + "').");
            }
            if (n.signum() < 0) throw new IllegalArgumentException(label + " cannot be negative.");
            if (n.compareTo(max) >= 0) throw new IllegalArgumentException(label + " is too large (must be below " + max.toPlainString() + ").");
            return n;
        }
        return null;
    }
}
