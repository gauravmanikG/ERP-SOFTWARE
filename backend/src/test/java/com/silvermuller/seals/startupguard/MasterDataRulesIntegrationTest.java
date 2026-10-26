package com.silvermuller.seals.startupguard;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.service.ItemGroupService;
import com.silvermuller.seals.modules.inventory.service.ItemMasterService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.AnnotationAwareOrderComparator;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Item and group rules against a DISPOSABLE PostgreSQL database (same gate as StartupIdempotencyIntegrationTest):
 * what a user deletes stays deleted, saves never overwrite another record, and groups in use are protected.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@EnabledIfEnvironmentVariable(named = "SMS_INIT_TEST_DATABASE_URL", matches = ".+")
class MasterDataRulesIntegrationTest {

    @DynamicPropertySource
    static void disposableDatabase(DynamicPropertyRegistry r) {
        String url = System.getenv("SMS_INIT_TEST_DATABASE_URL");
        if (url.matches("(?i).*/sms_seals(\\?.*)?$")) {
            throw new IllegalStateException("Refusing to run destructive tests against the live sms_seals database");
        }
        r.add("spring.datasource.url", () -> url);
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("SMS_INIT_TEST_DATABASE_USERNAME", "postgres"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("SMS_INIT_TEST_DATABASE_PASSWORD", "postgres"));
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired ApplicationContext context;
    @Autowired ItemMasterService items;
    @Autowired ItemGroupService groups;

    private final String tag = UUID.randomUUID().toString().substring(0, 6).toUpperCase();

    /** Everything an ordinary restart executes against an existing database. */
    private void restart() throws Exception {
        ResourceDatabasePopulator scripts = new ResourceDatabasePopulator(
                new ClassPathResource("schema.sql"), new ClassPathResource("seed-data.sql"));
        scripts.setSqlScriptEncoding("UTF-8");
        scripts.setContinueOnError(false);
        scripts.execute(dataSource);
        List<Object> runners = new ArrayList<>(context.getBeansOfType(ApplicationRunner.class).values());
        runners.addAll(context.getBeansOfType(CommandLineRunner.class).values());
        AnnotationAwareOrderComparator.sort(runners);
        ApplicationArguments args = new DefaultApplicationArguments();
        for (Object r : runners) {
            if (r instanceof ApplicationRunner a) a.run(args);
            else ((CommandLineRunner) r).run();
        }
    }

    private int count(String sql, Object... args) {
        Integer n = jdbc.queryForObject(sql, Integer.class, args);
        return n == null ? 0 : n;
    }

    private Map<String, Object> item(String code, String group, String subgroup) {
        Map<String, Object> body = new HashMap<>();
        body.put("item_code", code);
        body.put("item_name", "Test item " + code);
        body.put("category", group);
        body.put("subgroup", subgroup);
        body.put("price", "12.50");
        return body;
    }

    private long save(Map<String, Object> body) {
        return ((Number) items.save(body).item().get("id")).longValue();
    }

    private long groupId(String name) {
        return jdbc.queryForObject("SELECT id FROM public.item_group WHERE name = ?", Long.class, name);
    }

    @Test
    void aDeletedItemStaysDeletedAndCannotBeDeletedTwice() throws Exception {
        long id = save(item("DEL-" + tag, "Consumables", "Production Consumables"));
        items.delete(id);
        restart();
        restart();
        assertEquals(0, count("SELECT COUNT(*) FROM public.item_master WHERE id = ?", id));
        assertThrows(ResourceNotFoundException.class, () -> items.delete(id), "a second delete reports not found, not success");
    }

    @Test
    void creatingNeverOverwritesAnExistingItem() {
        long id = save(item("DUP-" + tag, "Consumables", ""));
        Map<String, Object> again = item("dup-" + tag.toLowerCase(), "Consumables", "");
        again.put("item_name", "Would overwrite");
        assertThrows(ConflictException.class, () -> items.save(again), "same code, any case");
        assertEquals("Test item DUP-" + tag, jdbc.queryForObject("SELECT description_size FROM public.item_master WHERE id = ?", String.class, id));

        long other = save(item("OTHER-" + tag, "Consumables", ""));
        Map<String, Object> rename = item("DUP-" + tag, "Consumables", "");
        rename.put("id", other);
        assertThrows(ConflictException.class, () -> items.save(rename), "changing a code to one already in use");

        Map<String, Object> edit = item("DUP-" + tag, "Consumables", "");
        edit.put("id", id);
        edit.put("item_name", "Edited");
        items.save(edit);
        assertEquals("Edited", jdbc.queryForObject("SELECT description_size FROM public.item_master WHERE id = ?", String.class, id));
    }

    @Test
    void itemsWithDuplicateCodesFromOldImportsStayEditable() {
        jdbc.update("INSERT INTO public.item_master (sms_new_part_no, description_size, group_name, category) VALUES (?, 'a', 'FG', 'FG'), (?, 'b', 'FG', 'FG')",
                "OLD-" + tag, "OLD-" + tag);
        long first = jdbc.queryForObject("SELECT MIN(id) FROM public.item_master WHERE sms_new_part_no = ?", Long.class, "OLD-" + tag);
        Map<String, Object> edit = item("OLD-" + tag, "FG", "");
        edit.put("id", first);
        edit.put("item_name", "edited");
        items.save(edit);
        assertEquals("edited", jdbc.queryForObject("SELECT description_size FROM public.item_master WHERE id = ?", String.class, first));
        assertThrows(ConflictException.class, () -> items.deleteByCode("OLD-" + tag), "ambiguous code: delete by id instead");
    }

    @Test
    void anOtherItemMustUseAnExistingGroupAndOneOfItsSubgroups() {
        assertThrows(IllegalArgumentException.class, () -> items.save(item("G1-" + tag, "No Such Group " + tag, "")));
        assertThrows(IllegalArgumentException.class, () -> items.save(item("G2-" + tag, "Consumables", "Primary Raw Material")),
                "a subgroup of a different group");
        long id = save(item("G3-" + tag, "consumables", "production consumables"));
        assertEquals("Consumables|Production Consumables", jdbc.queryForObject(
                "SELECT group_name || '|' || subgroup FROM public.item_master WHERE id = ?", String.class, id), "stored as the group is named");
        save(item("FG-" + tag, "FG", "OIL SEAL")); // finished goods carry their product type, not an Item Group subgroup
    }

    @Test
    void badNumbersAreRejectedInsteadOfSavedAsZero() {
        Map<String, Object> text = item("N1-" + tag, "Consumables", "");
        text.put("price", "twelve");
        assertThrows(IllegalArgumentException.class, () -> items.save(text));
        Map<String, Object> negative = item("N2-" + tag, "Consumables", "");
        negative.put("safety_lead_time", "-1");
        assertThrows(IllegalArgumentException.class, () -> items.save(negative));
        Map<String, Object> huge = item("N3-" + tag, "Consumables", "");
        huge.put("price", "1e20");
        assertThrows(IllegalArgumentException.class, () -> items.save(huge));
        assertEquals(0, count("SELECT COUNT(*) FROM public.item_master WHERE sms_new_part_no LIKE ?", "N_-" + tag));
    }

    @Test
    void renamingAGroupOrSubgroupRenamesItOnItsItems() {
        Map<String, Object> g = groups.createGroup("Ren " + tag, null, null);
        long gid = ((Number) g.get("id")).longValue();
        Map<String, Object> s = groups.createSubgroup(gid, "Sub " + tag, null, null);
        long id = save(item("REN-" + tag, "Ren " + tag, "Sub " + tag));

        groups.updateGroup(gid, "Renamed " + tag, null, null);
        groups.updateSubgroup(((Number) s.get("id")).longValue(), null, "Resub " + tag, null, null);

        assertEquals("Renamed " + tag + "|Resub " + tag, jdbc.queryForObject(
                "SELECT group_name || '|' || subgroup FROM public.item_master WHERE id = ?", String.class, id));
    }

    @Test
    void aGroupOrSubgroupInUseCannotBeDeletedAndADeletedOneStaysDeleted() throws Exception {
        Map<String, Object> g = groups.createGroup("Use " + tag, null, null);
        long gid = ((Number) g.get("id")).longValue();
        long sid = ((Number) groups.createSubgroup(gid, "Used " + tag, null, null).get("id")).longValue();
        long id = save(item("USE-" + tag, "Use " + tag, "Used " + tag));

        assertThrows(ConflictException.class, () -> groups.deleteGroup(gid));
        assertThrows(ConflictException.class, () -> groups.deleteSubgroup(sid));

        items.delete(id);
        groups.deleteSubgroup(sid);
        groups.deleteGroup(gid);
        restart();
        restart();
        assertEquals(0, count("SELECT COUNT(*) FROM public.item_group WHERE name = ?", "Use " + tag));
        assertThrows(ResourceNotFoundException.class, () -> groups.deleteGroup(gid));
    }

    @Test
    void resetToDefaultsKeepsGroupsItemsUse() {
        groups.createGroup("Unused " + tag, null, null);
        long gid = ((Number) groups.createGroup("Kept " + tag, null, null).get("id")).longValue();
        groups.createSubgroup(gid, "Kept sub " + tag, null, null);
        save(item("RST-" + tag, "Kept " + tag, "Kept sub " + tag));

        groups.resetToDefaults();

        assertEquals(0, count("SELECT COUNT(*) FROM public.item_group WHERE name = ?", "Unused " + tag));
        assertEquals(1, count("SELECT COUNT(*) FROM public.item_subgroup s JOIN public.item_group g ON g.id = s.group_id "
                + "WHERE g.name = ? AND s.name = ?", "Kept " + tag, "Kept sub " + tag), "no item is left pointing at a removed group");
        assertTrue(count("SELECT COUNT(*) FROM public.item_group WHERE name = 'Assets'") == 1, "defaults restored");
    }

    @Test
    void anOldBrowserCopyOfGroupsIsImportedOnlyOnce() {
        String name = "Legacy " + tag;
        List<Map<String, Object>> copy = List.of(Map.of("name", name, "subgroups", List.of()));
        groups.importGroups(copy);
        if (count("SELECT COUNT(*) FROM public.item_group WHERE name = ?", name) == 1) {
            groups.deleteGroup(groupId(name)); // first import on this database added it; the user then deletes it
        }
        assertEquals(0, groups.importGroups(copy));
        assertEquals(0, count("SELECT COUNT(*) FROM public.item_group WHERE name = ?", name), "a deleted group is not brought back");
    }
}
