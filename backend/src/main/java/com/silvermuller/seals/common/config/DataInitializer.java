package com.silvermuller.seals.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import java.util.List;
import java.util.Objects;

/**
 * Loads the bulk master-data seed files once per database, and only into an empty table, so an ordinary restart
 * never touches existing rows and a table the user has emptied on purpose is not refilled.
 *
 * Startup data responsibilities (see docs/startup-data-rules.md):
 *   schema.sql             DDL only, every start.
 *   seed-data.sql          default rows: system rows restored if missing, user-managed rows seeded once.
 *   this class             bulk seed files, once per database, only into an empty table.
 *   StartupDataMigrations  deliberate one-time data changes, recorded per database.
 * StartupSafetyGuardTest fails the build if any of these rules is broken.
 */
@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    /** A seed file and the table it fills. The file's first line must be "-- startup-guard: bulk-seed-when-empty TABLE". */
    public record BulkSeed(String table, String file) {}

    public static final List<BulkSeed> BULK_SEEDS = List.of(
            new BulkSeed("public.supplier_master", "vendor_master.sql"),
            new BulkSeed("public.customer_master", "customer_master.sql"),
            new BulkSeed("public.machine_master", "machine_master.sql"),
            new BulkSeed("public.hsn_tax_master", "init_hsn_and_phase15.sql"));

    @Bean
    public CommandLineRunner initDatabase(JdbcTemplate jdbc, SeedRegistry registry) {
        return args -> {
            for (BulkSeed seed : BULK_SEEDS) {
                seedOnce(jdbc, registry, seed);
            }
        };
    }

    /**
     * First start on a database: loads the file if the table is empty, and records it as seeded either way (an
     * existing table's rows are adopted as-is). Later starts do nothing, even if every row has since been deleted.
     */
    public static boolean seedOnce(JdbcTemplate jdbc, SeedRegistry registry, BulkSeed seed) {
        boolean[] loaded = {false};
        registry.seedOnce("bulk:" + seed.file(), () -> loaded[0] = loadIfEmpty(jdbc, seed));
        return loaded[0];
    }

    /** Runs the seed file only when the table has no rows. A failing seed stops startup instead of being ignored. */
    static boolean loadIfEmpty(JdbcTemplate jdbc, BulkSeed seed) {
        Long rows = jdbc.queryForObject("SELECT count(*) FROM " + seed.table(), Long.class);
        if (rows != null && rows > 0) {
            return false;
        }
        ClassPathResource res = new ClassPathResource(seed.file());
        if (!res.exists()) {
            throw new IllegalStateException("Seed file not found on the classpath: " + seed.file());
        }
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(res);
        populator.setSqlScriptEncoding("UTF-8");
        populator.execute(Objects.requireNonNull(jdbc.getDataSource()));
        log.info("Seeded {} from {}.", seed.table(), seed.file());
        return true;
    }
}
