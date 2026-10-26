package com.silvermuller.seals.startupguard;

import com.silvermuller.seals.common.config.DataInitializer;
import com.silvermuller.seals.common.config.SeedRegistry;
import com.silvermuller.seals.common.config.StartupDataMigrations;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.AnnotationAwareOrderComparator;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.jdbc.datasource.init.ScriptException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Restart behaviour against a DISPOSABLE PostgreSQL database (it edits and deletes rows). Set
 * SMS_INIT_TEST_DATABASE_URL to an empty or throwaway database; it refuses the live sms_seals database.
 *
 * The context starts with ddl-auto=validate, so a green run also proves schema.sql defines every column the
 * entities need. A "restart" re-runs everything ordinary startup runs: schema.sql, seed-data.sql and every
 * ApplicationRunner / CommandLineRunner. Policy under test: docs/startup-data-rules.md.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@EnabledIfEnvironmentVariable(named = "SMS_INIT_TEST_DATABASE_URL", matches = ".+")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class StartupIdempotencyIntegrationTest {

    private static final String GARBLED_HEX = "426f756768742d4f757420506172747320c3b0c5b8e280bac2a0";
    private static final String CORRECT_HEX = "426f756768742d4f757420506172747320f09f9ba0";
    private static final String MIGRATION_3111 = "2026-10-24-04-remove-garbled-bought-out-parts-category";
    private static final String MIGRATION_REPOINT = "2026-10-25-06-repoint-job-work-to-item-master";
    private static final List<String> JOB_WORK_ITEM_TABLES = List.of("job_work_indent_lines", "job_work_order_lines",
            "job_work_challan_lines", "job_work_receipt_lines", "job_work_stock_ledger", "job_work_adjustments");

    @DynamicPropertySource
    static void disposableDatabase(DynamicPropertyRegistry r) {
        String url = System.getenv("SMS_INIT_TEST_DATABASE_URL");
        if (url.matches("(?i).*/sms_seals(\\?.*)?$")) {
            throw new IllegalStateException("Refusing to run destructive restart tests against the live sms_seals database");
        }
        r.add("spring.datasource.url", () -> url);
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("SMS_INIT_TEST_DATABASE_USERNAME", "postgres"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("SMS_INIT_TEST_DATABASE_PASSWORD", "postgres"));
        r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired ApplicationContext context;
    @Autowired StartupDataMigrations migrations;
    @Autowired SeedRegistry seeds;
    @Autowired Environment environment;

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

    private String str(String sql, Object... args) {
        return jdbc.queryForObject(sql, String.class, args);
    }

    private int count(String sql, Object... args) {
        Integer n = jdbc.queryForObject(sql, Integer.class, args);
        return n == null ? 0 : n;
    }

    private int jobWorkForeignKeysToItemMaster() {
        return count("SELECT COUNT(DISTINCT con.conrelid) FROM pg_constraint con "
                + "JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey) "
                + "WHERE con.contype = 'f' AND con.confrelid = 'public.item_master'::regclass AND a.attname = 'item_master_id' "
                + "AND con.conrelid::regclass::text = ANY (?)", (Object) JOB_WORK_ITEM_TABLES.toArray(new String[0]));
    }

    private int categoryRowsWithBytes(String hex) {
        return count("SELECT COUNT(*) FROM public.category_master WHERE convert_to(category_name, 'UTF8') = decode(?, 'hex')", hex);
    }

    // 1. a fresh database receives its initial defaults --------------------------------------------------------

    @Test
    @Order(1) // inspects the database as the first startup left it, before other tests edit or delete rows
    void freshDatabaseGetsRequiredDefaultsAndSchemaSatisfiesEveryEntity() {
        // reaching this line means Hibernate validated every entity against the schema built by schema.sql
        assertEquals("validate", environment.getProperty("spring.jpa.hibernate.ddl-auto"));
        assertEquals("false", environment.getProperty("spring.sql.init.continue-on-error"));
        assertEquals(StartupDataMigrations.MIGRATIONS.size(), count("SELECT COUNT(*) FROM public.app_data_migration"));
        assertTrue(count("SELECT COUNT(*) FROM public.category_master") >= 24);
        assertEquals(1, categoryRowsWithBytes(CORRECT_HEX), "the correctly encoded Bought-Out Parts category is seeded");
        assertTrue(count("SELECT COUNT(*) FROM public.department_master WHERE department_name IN "
                + "('Store', 'Rejection Store', 'External Job Work', 'Quality Hold', 'Scrap Yard')") == 5);
        assertTrue(count("SELECT COUNT(*) FROM public.machine_master") > 0, "bulk seed loaded");
        assertTrue(count("SELECT COUNT(*) FROM public.item_group") > 0, "default item groups seeded");
        assertTrue(seeds.isSeeded("category_master:FELT"));
        assertTrue(seeds.isSeeded("bulk:machine_master.sql"));
        assertEquals(JOB_WORK_ITEM_TABLES.size(), jobWorkForeignKeysToItemMaster(), "every job-work item column references item_master");
        assertEquals(0, count("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' "
                + "AND table_name IN ('master', 'department', 'inventory_transaction', 'opening_balance', 'transaction_type', 'companies')"),
                "removed tables are not re-created");
    }

    // 2. edits survive ----------------------------------------------------------------------------------------

    @Test
    void restartKeepsValuesEditedInTheApplication() throws Exception {
        if (count("SELECT COUNT(*) FROM public.machine_master") == 0) { // another test may have emptied it on purpose
            jdbc.update("INSERT INTO public.machine_master (s_no, machine_no, description) VALUES (1, 'M/C -1', 'probe machine')");
        }
        jdbc.update("UPDATE public.department_master SET process_sequence = 99.5, category = 'Edited by user', dept_code = 'EDIT-18' "
                + "WHERE department_name = 'Gate'");
        jdbc.update("UPDATE public.department_master SET process_sequence = 77, notes = 'Edited system row' WHERE department_name = 'Store'");
        jdbc.update("UPDATE public.category_master SET short_code = 'EDITED', category_code = 'E99' WHERE category_name = 'SPRING'");
        jdbc.update("UPDATE public.procurement_master SET procurement_name = 'Edited by user' WHERE procurement_type = 'IMPORTED'");
        jdbc.update("UPDATE public.process_master SET process_description = 'Edited by user' WHERE process_code = 'PR-1'");
        jdbc.update("UPDATE public.customer_master SET customer_name = 'Edited Customer' WHERE customer_code = 'CUST-00001'");
        String supplier = str("SELECT MIN(supplier_code) FROM public.supplier_master");
        jdbc.update("UPDATE public.supplier_master SET supplier_name = 'Edited Supplier' WHERE supplier_code = ?", supplier);
        String hsn = str("SELECT MIN(hsn_sac_code) FROM public.hsn_tax_master");
        jdbc.update("UPDATE public.hsn_tax_master SET description = 'Edited by user' WHERE hsn_sac_code = ?", hsn);
        jdbc.update("UPDATE public.machine_master SET machine_no = 'm/c-901' WHERE id = (SELECT MIN(id) FROM public.machine_master)");
        jdbc.update("UPDATE public.item_group SET description = 'Edited group' WHERE name = 'Assets'");

        restart();
        restart();

        assertEquals(0, new BigDecimal("99.5").compareTo(
                jdbc.queryForObject("SELECT process_sequence FROM public.department_master WHERE department_name = 'Gate'", BigDecimal.class)));
        assertEquals("Edited by user", str("SELECT category FROM public.department_master WHERE department_name = 'Gate'"));
        assertEquals("EDIT-18", str("SELECT dept_code FROM public.department_master WHERE department_name = 'Gate'"));
        assertEquals("Edited system row", str("SELECT notes FROM public.department_master WHERE department_name = 'Store'"),
                "a default row is never overwritten");
        assertEquals("EDITED", str("SELECT short_code FROM public.category_master WHERE category_name = 'SPRING'"));
        assertEquals("E99", str("SELECT category_code FROM public.category_master WHERE category_name = 'SPRING'"));
        assertEquals("Edited by user", str("SELECT procurement_name FROM public.procurement_master WHERE procurement_type = 'IMPORTED'"));
        assertEquals("Edited by user", str("SELECT process_description FROM public.process_master WHERE process_code = 'PR-1'"));
        assertEquals("Edited Customer", str("SELECT customer_name FROM public.customer_master WHERE customer_code = 'CUST-00001'"));
        assertEquals("Edited Supplier", str("SELECT supplier_name FROM public.supplier_master WHERE supplier_code = ?", supplier));
        assertEquals("Edited by user", str("SELECT description FROM public.hsn_tax_master WHERE hsn_sac_code = ?", hsn));
        assertEquals("Edited group", str("SELECT description FROM public.item_group WHERE name = 'Assets'"));
        assertEquals("m/c-901", str("SELECT machine_no FROM public.machine_master WHERE id = (SELECT MIN(id) FROM public.machine_master)"),
                "an applied one-time migration must not run again on restart");
    }

    // 3. a deleted user-managed default stays deleted ---------------------------------------------------------

    @Test
    void deletedUserManagedDefaultsStayDeletedAcrossRestarts() throws Exception {
        jdbc.update("DELETE FROM public.category_master WHERE category_name = 'FELT'");
        jdbc.update("DELETE FROM public.process_master WHERE process_code = 'PR-16'");
        jdbc.update("DELETE FROM public.procurement_master WHERE procurement_type = 'OUTSOURCE'");
        jdbc.update("DELETE FROM public.operation_master WHERE operation_name = 'Rework'");
        jdbc.update("DELETE FROM public.item_group WHERE name = 'Uniforms & Linen'");

        restart();
        restart();
        restart();

        assertEquals(0, count("SELECT COUNT(*) FROM public.category_master WHERE category_name = 'FELT'"));
        assertEquals(0, count("SELECT COUNT(*) FROM public.process_master WHERE process_code = 'PR-16'"));
        assertEquals(0, count("SELECT COUNT(*) FROM public.procurement_master WHERE procurement_type = 'OUTSOURCE'"));
        assertEquals(0, count("SELECT COUNT(*) FROM public.operation_master WHERE operation_name = 'Rework'"));
        assertEquals(0, count("SELECT COUNT(*) FROM public.item_group WHERE name = 'Uniforms & Linen'"));
        assertEquals(0, count("SELECT COUNT(*) FROM public.item_subgroup s JOIN public.item_group g ON g.id = s.group_id "
                + "WHERE g.name = 'Uniforms & Linen'"));
    }

    @Test
    void anEmptiedBulkSeededTableIsNotRefilled() throws Exception {
        int seeded = count("SELECT COUNT(*) FROM public.machine_master");
        assertTrue(seeded > 0);
        jdbc.update("DELETE FROM public.machine_master WHERE id = (SELECT MAX(id) FROM public.machine_master)");
        restart();
        assertEquals(seeded - 1, count("SELECT COUNT(*) FROM public.machine_master"), "a non-empty table is never re-seeded");

        jdbc.update("DELETE FROM public.machine_master");
        restart();
        restart();
        assertEquals(0, count("SELECT COUNT(*) FROM public.machine_master"), "the user emptied it on purpose; it stays empty");
    }

    // 4. the departments the job-work code looks up by name are also seeded only once ---------------------------

    @Test
    void renamedOrDeletedJobWorkDepartmentsAreNotPutBack() throws Exception {
        jdbc.update("DELETE FROM public.department_master WHERE department_name = 'Quality Hold'");
        jdbc.update("UPDATE public.department_master SET department_name = 'Renamed Scrap Yard' WHERE department_name = 'Scrap Yard'");

        restart();
        restart();

        assertEquals(0, count("SELECT COUNT(*) FROM public.department_master WHERE department_name = 'Quality Hold'"),
                "a deleted default must not come back on restart");
        assertEquals(0, count("SELECT COUNT(*) FROM public.department_master WHERE department_name = 'Scrap Yard'"),
                "a renamed default must not be re-created under its old name");
        assertEquals(1, count("SELECT COUNT(*) FROM public.department_master WHERE department_name = 'Renamed Scrap Yard'"));
    }

    // 5. retired migrations are recorded on a new database but never executed -------------------------------

    @Test
    void retiredMigrationsAreRecordedAsSkippedAndNeverRun() throws Exception {
        for (StartupDataMigrations.Migration m : StartupDataMigrations.MIGRATIONS) {
            if (!m.retired()) continue;
            assertEquals(1, count("SELECT COUNT(*) FROM public.app_data_migration WHERE migration_id = ? AND rows_affected = 0 "
                    + "AND description LIKE '[skipped%'", m.id()), m.id());
        }
        // 3111 reads tables that no longer exist; running it would stop startup. Pending again, it is still only recorded.
        jdbc.update("INSERT INTO public.category_master (category_name) VALUES (convert_from(decode(?, 'hex'), 'UTF8'))", GARBLED_HEX);
        jdbc.update("DELETE FROM public.app_data_migration WHERE migration_id = ?", MIGRATION_3111);
        try {
            restart();
            assertEquals(1, categoryRowsWithBytes(GARBLED_HEX), "a retired migration never executes");
            assertEquals(1, categoryRowsWithBytes(CORRECT_HEX));
            assertEquals(1, count("SELECT COUNT(*) FROM public.app_data_migration WHERE migration_id = ?", MIGRATION_3111));
        } finally {
            jdbc.update("DELETE FROM public.category_master WHERE convert_to(category_name, 'UTF8') = decode(?, 'hex')", GARBLED_HEX);
        }
    }

    // 6. a database from before the master -> item_master consolidation is brought in line -------------------

    @Test
    void legacyJobWorkItemColumnIsRenamedAndRepointedToItemMaster() throws Exception {
        jdbc.execute("CREATE TABLE IF NOT EXISTS public.master (id BIGSERIAL PRIMARY KEY, code VARCHAR(100))");
        jdbc.execute("ALTER TABLE public.job_work_adjustments DROP CONSTRAINT job_work_adjustments_item_master_id_fkey");
        jdbc.execute("ALTER TABLE public.job_work_adjustments RENAME COLUMN item_master_id TO master_id");
        jdbc.execute("ALTER TABLE public.job_work_adjustments ADD CONSTRAINT job_work_adjustments_master_id_fkey "
                + "FOREIGN KEY (master_id) REFERENCES public.master(id)");
        jdbc.execute("ALTER TABLE public.item_master ADD COLUMN item_group_id BIGINT REFERENCES public.item_group(id)");
        jdbc.update("DELETE FROM public.app_data_migration WHERE migration_id = ?", MIGRATION_REPOINT);
        try {
            restart();
            restart();

            assertEquals(0, count("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' "
                    + "AND table_name = 'job_work_adjustments' AND column_name = 'master_id'"));
            assertEquals(JOB_WORK_ITEM_TABLES.size(), jobWorkForeignKeysToItemMaster());
            assertEquals(0, count("SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.master'::regclass"));
            assertEquals(0, count("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' "
                    + "AND table_name = 'item_master' AND column_name = 'item_group_id'"));
            assertEquals(1, count("SELECT COUNT(*) FROM public.app_data_migration WHERE migration_id = ?", MIGRATION_REPOINT));
        } finally {
            jdbc.execute("DROP TABLE IF EXISTS public.master CASCADE");
        }
    }

    // 7. failures are reported, not ignored -----------------------------------------------------------------

    @Test
    void aFailingStartupStatementIsNotIgnored() {
        ResourceDatabasePopulator broken = new ResourceDatabasePopulator(new ByteArrayResource(
                "CREATE TABLE IF NOT EXISTS public.startup_guard_probe (id INT);\nSELECT * FROM public.table_that_does_not_exist;"
                        .getBytes(StandardCharsets.UTF_8)));
        broken.setContinueOnError(false);
        assertThrows(ScriptException.class, () -> broken.execute(dataSource));
        jdbc.execute("DROP TABLE IF EXISTS public.startup_guard_probe");
    }

    @Test
    void aMissingBulkSeedFileStopsStartupAndIsRetried() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS public.startup_guard_probe (id INT)");
        try {
            var seed = new DataInitializer.BulkSeed("public.startup_guard_probe", "no-such-seed-file.sql");
            IllegalStateException e = assertThrows(IllegalStateException.class, () -> DataInitializer.seedOnce(jdbc, seeds, seed));
            assertTrue(e.getMessage().contains("no-such-seed-file.sql"), e.getMessage());
            assertFalse(seeds.isSeeded("bulk:no-such-seed-file.sql"), "a failed seed is not recorded, so it runs again next start");
        } finally {
            jdbc.execute("DROP TABLE IF EXISTS public.startup_guard_probe");
        }
    }

    @Test
    void editingAnAppliedMigrationStopsStartup() {
        String id = StartupDataMigrations.MIGRATIONS.get(0).id();
        String real = str("SELECT checksum FROM public.app_data_migration WHERE migration_id = ?", id);
        jdbc.update("UPDATE public.app_data_migration SET checksum = 'tampered' WHERE migration_id = ?", id);
        try {
            IllegalStateException e = assertThrows(IllegalStateException.class, migrations::applyPending);
            assertTrue(e.getMessage().contains("edited after it was applied"), e.getMessage());
        } finally {
            jdbc.update("UPDATE public.app_data_migration SET checksum = ? WHERE migration_id = ?", real, id);
        }
    }

    @Test
    void oneTimeMigrationRunsOnceAndChangesOnlyItsTarget() throws Exception {
        String id = "2026-10-24-03-normalize-machine-numbers";
        if (count("SELECT COUNT(*) FROM public.machine_master") == 0) {
            jdbc.update("INSERT INTO public.machine_master (s_no, machine_no, description) VALUES (1, 'M/C -1', 'probe machine')");
        }
        assertEquals(1, count("SELECT COUNT(*) FROM public.app_data_migration WHERE migration_id = ?", id));
        jdbc.update("UPDATE public.machine_master SET machine_no = 'm/c - 77', description = 'Keep this text' "
                + "WHERE id = (SELECT MAX(id) FROM public.machine_master)");

        restart();
        assertEquals("m/c - 77", str("SELECT machine_no FROM public.machine_master WHERE description = 'Keep this text'"));

        jdbc.update("DELETE FROM public.app_data_migration WHERE migration_id = ?", id);
        restart();
        assertEquals("M/C -77", str("SELECT machine_no FROM public.machine_master WHERE description = 'Keep this text'"),
                "a pending migration is applied");
        assertEquals(1, count("SELECT COUNT(*) FROM public.app_data_migration WHERE migration_id = ? AND rows_affected >= 1", id));
    }
}
