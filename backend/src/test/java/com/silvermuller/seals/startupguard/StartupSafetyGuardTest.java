package com.silvermuller.seals.startupguard;

import com.silvermuller.seals.common.config.DataInitializer;
import com.silvermuller.seals.common.config.StartupDataMigrations;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Build-time guard: ordinary startup must never reset or delete existing data. Runs in every "mvn test" without a
 * database. If this fails, read docs/startup-data-rules.md before "fixing" the test.
 */
class StartupSafetyGuardTest {

    private static final Path MAIN_JAVA = Path.of("src/main/java/com/silvermuller/seals");
    private static final Path RESOURCES = Path.of("src/main/resources");

    /**
     * Every class that runs code at startup, with the reviewed reason it is safe. A new startup hook fails the build
     * until someone has checked it against docs/startup-data-rules.md and added it here.
     */
    static final Map<String, String> REVIEWED_STARTUP_HOOKS = Map.of(
            "common/config/DataInitializer.java", "Loads bulk seed files only into empty tables.",
            "common/config/StartupDataMigrations.java", "Versioned one-time data migrations, recorded per database.",
            "modules/purchase/newpo/ProcurementMigrations.java",
            "State-checked DDL, fill-NULL backfill and a forward-only sequence; never overwrites values.",
            "modules/masters/MasterDataSchema.java",
            "CREATE TABLE IF NOT EXISTS and DO NOTHING defaults; the app only soft-deletes these entries, so none reappears.",
            "modules/inventory/service/ItemGroupService.java",
            "Default groups/subgroups seeded once per database through SeedRegistry; deleted ones stay deleted.",
            "modules/purchase/service/PurchaseRequisitionService.java", "Demo PR seeding is disabled (returns immediately).",
            "modules/purchase/service/VendorQuotationService.java",
            "Business rule: marks quotations past valid_until as Expired; demo seeding is disabled.");

    @Test
    void everyStartupHookHasBeenReviewed() throws IOException {
        Set<String> found = StartupSafetyGuard.discoverStartupHooks(MAIN_JAVA);
        Set<String> unreviewed = new TreeSet<>(found);
        unreviewed.removeAll(REVIEWED_STARTUP_HOOKS.keySet());
        Set<String> stale = new TreeSet<>(REVIEWED_STARTUP_HOOKS.keySet());
        stale.removeAll(found);
        assertTrue(unreviewed.isEmpty(), "New startup hook(s) " + unreviewed + ". Check them against "
                + "docs/startup-data-rules.md, then add them to REVIEWED_STARTUP_HOOKS with the reason they are safe.");
        assertTrue(stale.isEmpty(), "No longer startup hooks, remove from REVIEWED_STARTUP_HOOKS: " + stale);
    }

    @Test
    void startupJavaNeverResetsOrDeletesDataWithoutAReviewedException() throws IOException {
        List<StartupSafetyGuard.Violation> all = new ArrayList<>();
        for (String hook : StartupSafetyGuard.discoverStartupHooks(MAIN_JAVA)) {
            String src = Files.readString(MAIN_JAVA.resolve(hook), StandardCharsets.UTF_8);
            all.addAll(StartupSafetyGuard.checkStartupJava(hook, src));
        }
        assertTrue(all.isEmpty(), "Unsafe startup code:\n" + String.join("\n", all.stream().map(Object::toString).toList()));
    }

    @Test
    void schemaScriptIsDdlOnly() throws IOException {
        var v = StartupSafetyGuard.checkSchemaScript("schema.sql", read("schema.sql"));
        assertTrue(v.isEmpty(), "schema.sql problems:\n" + String.join("\n", v.stream().map(Object::toString).toList()));
    }

    @Test
    void seedScriptOnlyAddsMissingRows() throws IOException {
        var v = StartupSafetyGuard.checkSeedScript("seed-data.sql", read("seed-data.sql"));
        assertTrue(v.isEmpty(), "seed-data.sql problems:\n" + String.join("\n", v.stream().map(Object::toString).toList()));
    }

    @Test
    void bulkSeedFilesOnlyInsertAndDeclareTheirTable() throws IOException {
        List<StartupSafetyGuard.Violation> all = new ArrayList<>();
        for (DataInitializer.BulkSeed s : DataInitializer.BULK_SEEDS) {
            all.addAll(StartupSafetyGuard.checkBulkSeedScript(s.file(), read(s.file()), s.table()));
        }
        assertTrue(all.isEmpty(), "Bulk seed problems:\n" + String.join("\n", all.stream().map(Object::toString).toList()));
    }

    @Test
    void startupScriptsAreCleanUtf8() throws IOException {
        List<String> files = new ArrayList<>(List.of("schema.sql", "seed-data.sql"));
        for (DataInitializer.BulkSeed s : DataInitializer.BULK_SEEDS) files.add(s.file());
        List<StartupSafetyGuard.Violation> all = new ArrayList<>();
        for (String f : files) all.addAll(StartupSafetyGuard.checkEncoding(f, Files.readAllBytes(RESOURCES.resolve(f))));
        assertTrue(all.isEmpty(), "Garbled text in startup scripts:\n" + String.join("\n", all.stream().map(Object::toString).toList()));
    }

    @Test
    void springRunsOnlyTheGuardedScriptsAndFailsFast() throws IOException {
        Properties p = new Properties();
        try (var in = Files.newBufferedReader(RESOURCES.resolve("application.properties"), StandardCharsets.UTF_8)) {
            p.load(in);
        }
        assertEquals("classpath:schema.sql", p.getProperty("spring.sql.init.schema-locations"));
        assertEquals("classpath:seed-data.sql", p.getProperty("spring.sql.init.data-locations"));
        assertEquals("false", p.getProperty("spring.sql.init.continue-on-error"), "schema failures must stop startup");
        assertEquals("UTF-8", p.getProperty("spring.sql.init.encoding"), "scripts contain non-ASCII text");
        String ddl = p.getProperty("spring.jpa.hibernate.ddl-auto");
        assertTrue(Set.of("update", "validate", "none").contains(ddl), "ddl-auto=" + ddl + " can drop or recreate tables");
    }

    @Test
    void migrationRegistryIsWellFormed() {
        Set<String> ids = new HashSet<>();
        for (StartupDataMigrations.Migration m : StartupDataMigrations.MIGRATIONS) {
            assertTrue(m.id().matches("\\d{4}-\\d{2}-\\d{2}-\\d{2}-[a-z0-9-]+"), "bad migration id " + m.id());
            assertTrue(ids.add(m.id()), "duplicate migration id " + m.id());
            assertTrue(m.description().length() >= 40, m.id() + ": describe what it changes and why it is safe");
            assertFalse(m.sql().isBlank(), m.id() + ": empty SQL");
            if (m.retired()) continue; // its SQL is frozen by the checksum and never executed on a new database
            // one statement per migration; a single DO $$ ... $$ block counts as one statement
            String outsideDoBlock = m.sql().strip().matches("(?s)DO \\$\\$.*\\$\\$") ? "" : m.sql();
            assertFalse(outsideDoBlock.contains(";"), m.id() + ": one statement per migration");
        }
    }

    private static String read(String file) throws IOException {
        return Files.readString(RESOURCES.resolve(file), StandardCharsets.UTF_8);
    }
}
