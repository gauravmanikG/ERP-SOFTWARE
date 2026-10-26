package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.config.SeedRegistry;
import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Item master groups and subgroups, stored in PostgreSQL (item_group, item_subgroup).
 * The defaults below are the starting configuration: seeded once per database at startup, restored on request by reset.
 */
@Service
@Order(10)
public class ItemGroupService implements ApplicationRunner {

    private record DefaultSubgroup(String name, String code) {}

    private record DefaultGroup(String name, String code, List<DefaultSubgroup> subgroups) {}

    private static final List<DefaultGroup> DEFAULTS = List.of(
        new DefaultGroup("Assets", "AST", List.of(
            new DefaultSubgroup("High Valued Assets", "AST01"),
            new DefaultSubgroup("Die", "AST02"),
            new DefaultSubgroup("Low Valued Assets - Material Handling Objects", "AST03"),
            new DefaultSubgroup("Low Valued Assets - Equipment", "AST04"))),
        new DefaultGroup("Bought-Out Parts", "BOP", List.of(
            new DefaultSubgroup("Mechanical Assemblies", "BOP01"),
            new DefaultSubgroup("Electrical Components", "BOP02"),
            new DefaultSubgroup("Electronic Modules", "BOP03"),
            new DefaultSubgroup("Supporting/Accessory for FG/SFG", "BOP04"))),
        new DefaultGroup("Consumables", "CON", List.of(
            new DefaultSubgroup("Production Consumables", "CON01"),
            new DefaultSubgroup("Maintenance Consumables", "CON02"),
            new DefaultSubgroup("Quality & Lab Consumables", "CON03"),
            new DefaultSubgroup("Tool Room Consumables", "CON04"),
            new DefaultSubgroup("Office Consumables / Furniture & Fixture", "CON05"))),
        new DefaultGroup("IT & Communication", "IT", List.of(
            new DefaultSubgroup("Fresh IT Gadgets", "IT01"),
            new DefaultSubgroup("Used IT Gadgets", "IT02"),
            new DefaultSubgroup("Networking Devices", "IT03"),
            new DefaultSubgroup("Repaired Items", "IT04"))),
        new DefaultGroup("Maintenance, Repair & Operations", "MR", List.of(
            new DefaultSubgroup("Mechanical Items", "MR01"),
            new DefaultSubgroup("Electrical Maintenance Items", "MR03"),
            new DefaultSubgroup("General Maintenance Item/Assets", "MR04"),
            new DefaultSubgroup("HVAC & Air Handling Components / Air Conditioning Components", "MR06"),
            new DefaultSubgroup("Utilities Spares", "MR08"))),
        new DefaultGroup("Office & Administration", "OS", List.of(
            new DefaultSubgroup("Housekeeping Supplies", "HK01"),
            new DefaultSubgroup("Office Stationery", "OS01"),
            new DefaultSubgroup("Pantry & Refreshment Items", "PN01"))),
        new DefaultGroup("Packing Materials", "PM", List.of(
            new DefaultSubgroup("Primary Packaging", "PM01"),
            new DefaultSubgroup("Secondary Packaging", "PM02"),
            new DefaultSubgroup("Packaging Raw Materials", "PM03"),
            new DefaultSubgroup("Used Packaging", "PM04"))),
        new DefaultGroup("Production", "PROD", List.of(
            new DefaultSubgroup("Die Export", "PROD-01"),
            new DefaultSubgroup("Die Domestic", "PROD-02"))),
        new DefaultGroup("Raw Material", "RM", List.of(
            new DefaultSubgroup("Primary Raw Materials - Tool Room", "RM01"),
            new DefaultSubgroup("Primary Raw Material Compound Chemical", "RM02"),
            new DefaultSubgroup("Primary Raw Material Compound Rubber", "RM03"),
            new DefaultSubgroup("Primary Raw Material Finishing Spring", "RM04"),
            new DefaultSubgroup("Primary Raw Material Final Part Paint", "RM05"),
            new DefaultSubgroup("Primary Raw Material", "RM06"),
            new DefaultSubgroup("Primary Raw Material - Sand", "RM07"),
            new DefaultSubgroup("Secondary Raw Materials", "RM09"),
            new DefaultSubgroup("Imported Raw Materials", "RM10"),
            new DefaultSubgroup("Processed Raw Materials", "RM11"),
            new DefaultSubgroup("Hazardous Raw Materials", "RM12"),
            new DefaultSubgroup("Recycled Raw Materials", "RM13"),
            new DefaultSubgroup("Seasonal / Project-Specific Raw Materials", "RM14"),
            new DefaultSubgroup("Customer Supplied Materials", "RM15"))),
        new DefaultGroup("Safety & PPE", "PPE", List.of(
            new DefaultSubgroup("Personal Protective Equipment", "PPE01"))),
        new DefaultGroup("Services", "SRV", List.of(
            new DefaultSubgroup("Contractual/Facility Services", "SRV01"),
            new DefaultSubgroup("Technical Services", "SRV02"),
            new DefaultSubgroup("Professional Services", "SRV03"))),
        new DefaultGroup("SFG", "SFG", List.of(
            new DefaultSubgroup("OUTER METAL SHELL", "B01"),
            new DefaultSubgroup("INNER METAL SHELL", "B02"),
            new DefaultSubgroup("SPRING", "B03"),
            new DefaultSubgroup("MIDDLE METAL SHELL", "B04"),
            new DefaultSubgroup("FELT", "B05"),
            new DefaultSubgroup("PTFE", "B06"),
            new DefaultSubgroup("TPU/PU", "B07"),
            new DefaultSubgroup("Brass Washer", "B08"),
            new DefaultSubgroup("Silver Washer", "B09"),
            new DefaultSubgroup("Big Washer", "B10"),
            new DefaultSubgroup("Gasket", "B11"),
            new DefaultSubgroup("O-Ring", "B12"),
            new DefaultSubgroup("OUTER MOULDED", "M01"),
            new DefaultSubgroup("INNER MOULDED", "M02"),
            new DefaultSubgroup("OTHER", "M04"),
            new DefaultSubgroup("SFG-TOOL ROOM", "SF01"))),
        new DefaultGroup("Uniforms & Linen", "UNI", List.of(
            new DefaultSubgroup("Uniforms & Textiles", "UNI01")))
    );

    private static final String LEGACY_IMPORT_KEY = "item_group:legacy-browser-import";

    private final JdbcTemplate jdbc;
    private final SeedRegistry seeds;

    public ItemGroupService(JdbcTemplate jdbc, SeedRegistry seeds) {
        this.jdbc = jdbc;
        this.seeds = seeds;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedDefaultsOnce();
    }

    /**
     * Startup: seeds each default group and subgroup once per database (public.app_seed_registry). A default the
     * user deleted stays deleted after a restart; "Reset to defaults" still brings them all back on request.
     */
    @Transactional
    public void seedDefaultsOnce() {
        for (DefaultGroup g : DEFAULTS) {
            seeds.seedOnce("item_group:" + g.name(), () -> insertGroup(g));
            List<Long> ids = jdbc.queryForList("SELECT id FROM public.item_group WHERE name = ?", Long.class, g.name());
            if (ids.isEmpty()) {
                continue; // the user deleted this group; its subgroups went with it and stay deleted
            }
            for (DefaultSubgroup sg : g.subgroups()) {
                seeds.seedOnce("item_subgroup:" + g.name() + "|" + sg.name(), () -> insertSubgroup(ids.get(0), sg));
            }
        }
    }

    /** Inserts every default group or subgroup that is missing (used by "Reset to defaults"). Existing rows are left alone. */
    @Transactional
    public void seedMissingDefaults() {
        for (DefaultGroup g : DEFAULTS) {
            insertGroup(g);
            Long groupId = jdbc.queryForObject("SELECT id FROM public.item_group WHERE name = ?", Long.class, g.name());
            for (DefaultSubgroup sg : g.subgroups()) {
                insertSubgroup(groupId, sg);
            }
        }
    }

    private void insertGroup(DefaultGroup g) {
        // seed-policy: once (startup reaches this only through SeedRegistry.seedOnce)
        jdbc.update(
            "INSERT INTO public.item_group (name, code, description, sort_order) VALUES (?, ?, ?, " +
            "COALESCE((SELECT MAX(sort_order) FROM public.item_group), 0) + 1) ON CONFLICT (name) DO NOTHING",
            g.name(), g.code(), g.name() + " items and inventory categories");
    }

    private void insertSubgroup(Long groupId, DefaultSubgroup sg) {
        // seed-policy: once (startup reaches this only through SeedRegistry.seedOnce)
        jdbc.update(
            "INSERT INTO public.item_subgroup (group_id, name, code, description, sort_order) VALUES (?, ?, ?, ?, " +
            "COALESCE((SELECT MAX(sort_order) FROM public.item_subgroup WHERE group_id = ?), 0) + 1) " +
            "ON CONFLICT (group_id, name) DO NOTHING",
            groupId, sg.name(), sg.code(), sg.name() + " (" + sg.code() + ")", groupId);
    }

    /** All groups with their subgroups, in sort order. */
    public List<Map<String, Object>> getTree() {
        List<Map<String, Object>> groups = jdbc.queryForList(
            "SELECT id, name, code, description FROM public.item_group ORDER BY sort_order, id");
        for (Map<String, Object> g : groups) {
            g.put("subgroups", jdbc.queryForList(
                "SELECT id, name, code, description FROM public.item_subgroup WHERE group_id = ? ORDER BY sort_order, id",
                g.get("id")));
        }
        return groups;
    }

    @Transactional
    public Map<String, Object> createGroup(String name, String code, String description) {
        String n = requireName(name);
        if (exists("SELECT COUNT(*) FROM public.item_group WHERE LOWER(name) = LOWER(?)", n)) {
            throw new ConflictException("Group '" + n + "' already exists");
        }
        jdbc.update(
            "INSERT INTO public.item_group (name, code, description, sort_order) VALUES (?, ?, ?, " +
            "COALESCE((SELECT MAX(sort_order) FROM public.item_group), 0) + 1)",
            n, clean(code), clean(description));
        return jdbc.queryForMap("SELECT id, name, code, description FROM public.item_group WHERE name = ?", n);
    }

    /** Renames are carried over to every item that uses the group, in the same transaction. */
    @Transactional
    public void updateGroup(Long id, String name, String code, String description) {
        String n = requireName(name);
        String old = lockGroup(id);
        if (exists("SELECT COUNT(*) FROM public.item_group WHERE LOWER(name) = LOWER(?) AND id <> ?", n, id)) {
            throw new ConflictException("Group '" + n + "' already exists");
        }
        jdbc.update(
            "UPDATE public.item_group SET name = ?, code = ?, description = ?, updated_at = now() WHERE id = ?",
            n, clean(code), clean(description), id);
        if (!old.equals(n)) {
            jdbc.update("UPDATE public.item_master SET group_name = ?, updated_at = now() WHERE LOWER(group_name) = LOWER(?)", n, old);
        }
    }

    /** A group that items still use cannot be deleted. */
    @Transactional
    public void deleteGroup(Long id) {
        String name = lockGroup(id);
        long used = count("SELECT COUNT(*) FROM public.item_master WHERE LOWER(group_name) = LOWER(?)", name);
        if (used > 0) {
            throw new ConflictException("Group '" + name + "' is used by " + used + " item(s). Move or delete those items first.");
        }
        jdbc.update("DELETE FROM public.item_group WHERE id = ?", id);
    }

    @Transactional
    public Map<String, Object> createSubgroup(Long groupId, String name, String code, String description) {
        String n = requireName(name);
        if (!exists("SELECT COUNT(*) FROM public.item_group WHERE id = ?", groupId)) {
            throw new ResourceNotFoundException("Group not found: " + groupId);
        }
        if (exists("SELECT COUNT(*) FROM public.item_subgroup WHERE group_id = ? AND LOWER(name) = LOWER(?)", groupId, n)) {
            throw new ConflictException("Subgroup '" + n + "' already exists in this group");
        }
        jdbc.update(
            "INSERT INTO public.item_subgroup (group_id, name, code, description, sort_order) VALUES (?, ?, ?, ?, " +
            "COALESCE((SELECT MAX(sort_order) FROM public.item_subgroup WHERE group_id = ?), 0) + 1)",
            groupId, n, clean(code), clean(description), groupId);
        return jdbc.queryForMap(
            "SELECT id, name, code, description FROM public.item_subgroup WHERE group_id = ? AND name = ?", groupId, n);
    }

    /** Updates a subgroup. A non-null groupId moves it to that group. Items using it follow the rename or move. */
    @Transactional
    public void updateSubgroup(Long id, Long groupId, String name, String code, String description) {
        String n = requireName(name);
        Map<String, Object> current = lockSubgroup(id);
        Long target = groupId != null ? groupId : ((Number) current.get("group_id")).longValue();
        String targetName = lockGroup(target);
        if (exists("SELECT COUNT(*) FROM public.item_subgroup WHERE group_id = ? AND LOWER(name) = LOWER(?) AND id <> ?", target, n, id)) {
            throw new ConflictException("Subgroup '" + n + "' already exists in this group");
        }
        jdbc.update(
            "UPDATE public.item_subgroup SET group_id = ?, name = ?, code = ?, description = ?, updated_at = now() WHERE id = ?",
            target, n, clean(code), clean(description), id);
        jdbc.update("UPDATE public.item_master SET group_name = ?, subgroup = ?, updated_at = now() "
                + "WHERE LOWER(group_name) = LOWER(?) AND LOWER(subgroup) = LOWER(?)",
                targetName, n, current.get("group_name"), current.get("name"));
    }

    /** A subgroup that items still use cannot be deleted. */
    @Transactional
    public void deleteSubgroup(Long id) {
        Map<String, Object> sub = lockSubgroup(id);
        long used = count("SELECT COUNT(*) FROM public.item_master WHERE LOWER(group_name) = LOWER(?) AND LOWER(subgroup) = LOWER(?)",
                sub.get("group_name"), sub.get("name"));
        if (used > 0) {
            throw new ConflictException("Subgroup '" + sub.get("name") + "' is used by " + used
                    + " item(s). Move or delete those items first.");
        }
        jdbc.update("DELETE FROM public.item_subgroup WHERE id = ?", id);
    }

    private String lockGroup(Long id) {
        return jdbc.queryForList("SELECT name FROM public.item_group WHERE id = ? FOR UPDATE", String.class, id)
                .stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Group " + id + " was not found. Refresh the list."));
    }

    private Map<String, Object> lockSubgroup(Long id) {
        return jdbc.queryForList("SELECT s.name, s.group_id, g.name AS group_name FROM public.item_subgroup s "
                        + "JOIN public.item_group g ON g.id = s.group_id WHERE s.id = ? FOR UPDATE OF s", id)
                .stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Subgroup " + id + " was not found. Refresh the list."));
    }

    /**
     * One-time move of a browser copy left by an old frontend version (name-based, existing rows are kept). Runs once
     * per database: a later browser still holding an old copy must not bring back groups the user has deleted.
     */
    @Transactional
    public int importGroups(List<Map<String, Object>> groups) {
        if (seeds.isSeeded(LEGACY_IMPORT_KEY)) return 0;
        seeds.markSeeded(LEGACY_IMPORT_KEY);
        int added = 0;
        for (Map<String, Object> g : groups) {
            String name = requireName(text(g.get("name")));
            jdbc.update(
                "INSERT INTO public.item_group (name, code, description, sort_order) VALUES (?, ?, ?, " +
                "COALESCE((SELECT MAX(sort_order) FROM public.item_group), 0) + 1) ON CONFLICT (name) DO NOTHING",
                name, clean(text(g.get("code"))), clean(text(g.get("description"))));
            Long groupId = jdbc.queryForObject("SELECT id FROM public.item_group WHERE name = ?", Long.class, name);
            if (!(g.get("subgroups") instanceof List<?> subList)) continue;
            for (Object o : subList) {
                if (!(o instanceof Map<?, ?> sg)) continue;
                String sn = requireName(text(sg.get("name")));
                added += jdbc.update(
                    "INSERT INTO public.item_subgroup (group_id, name, code, description, sort_order) VALUES (?, ?, ?, ?, " +
                    "COALESCE((SELECT MAX(sort_order) FROM public.item_subgroup WHERE group_id = ?), 0) + 1) " +
                    "ON CONFLICT (group_id, name) DO NOTHING",
                    groupId, sn, clean(text(sg.get("code"))), clean(text(sg.get("description"))), groupId);
            }
        }
        return added;
    }

    /**
     * Removes every group and subgroup no item uses, then restores the missing defaults. Groups and subgroups that
     * items still use are kept, so no item is left pointing at a group that no longer exists.
     */
    @Transactional
    public List<Map<String, Object>> resetToDefaults() {
        jdbc.update("DELETE FROM public.item_subgroup s USING public.item_group g WHERE g.id = s.group_id AND NOT EXISTS "
                + "(SELECT 1 FROM public.item_master i WHERE LOWER(i.group_name) = LOWER(g.name) AND LOWER(i.subgroup) = LOWER(s.name))");
        jdbc.update("DELETE FROM public.item_group g WHERE NOT EXISTS "
                + "(SELECT 1 FROM public.item_master i WHERE LOWER(i.group_name) = LOWER(g.name))");
        seedMissingDefaults();
        return getTree();
    }

    private boolean exists(String sql, Object... args) {
        return count(sql, args) > 0;
    }

    private long count(String sql, Object... args) {
        Long n = jdbc.queryForObject(sql, Long.class, args);
        return n == null ? 0 : n;
    }

    private static String requireName(String name) {
        if (name == null || name.trim().isEmpty()) throw new IllegalArgumentException("Name is required");
        return name.trim();
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    private static String clean(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }
}
