package com.silvermuller.seals.startupguard;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Proves the guard actually catches deliberately unsafe startup code, so a green StartupSafetyGuardTest means something. */
class StartupSafetyGuardSelfTest {

    private static final Path FIXTURES = Path.of("src/test/resources/startup-guard");

    private static String fixture(String name) throws IOException {
        return Files.readString(FIXTURES.resolve(name), StandardCharsets.UTF_8);
    }

    private static String describe(List<StartupSafetyGuard.Violation> v) {
        return String.join("\n", v.stream().map(Object::toString).toList());
    }

    @Test
    void flagsSeedsDropsAndDoBlocksInSchemaScript() throws IOException {
        var v = StartupSafetyGuard.checkSchemaScript("unsafe-schema.sql", fixture("unsafe-schema.sql"));
        assertEquals(4, v.size(), describe(v));
        String all = describe(v);
        assertTrue(all.contains("move it to seed-data.sql"), all);
        assertTrue(all.contains("DROP TABLE fixture_old"), all);
        assertTrue(all.contains("DROP COLUMN"), all);
        assertTrue(all.contains("DO $$"), all);
    }

    @Test
    void flagsOverwritingDeletingAndReCreatingSeeds() throws IOException {
        var v = StartupSafetyGuard.checkSeedScript("unsafe-seed.sql", fixture("unsafe-seed.sql"));
        assertEquals(7, v.size(), describe(v));
        String all = describe(v);
        assertTrue(all.contains("declare '-- seed-policy:"), "missing policy: " + all);
        assertTrue(all.contains("must use ON CONFLICT"), all);
        assertTrue(all.contains("system seed needs a reason"), all);
        assertTrue(all.contains("DO UPDATE overwrites"), all);
        assertTrue(all.contains("a row the user deleted is re-created"), "insert-if-missing marked once: " + all);
        assertTrue(all.contains("DELETE FROM fixture_t"), all);
        assertTrue(all.contains("UPDATE fixture_t"), all);
    }

    @Test
    void flagsGarbledTextThatCreatedTheDuplicateCategory() throws IOException {
        byte[] bytes = Files.readAllBytes(FIXTURES.resolve("garbled-seed.sql"));
        var v = StartupSafetyGuard.checkEncoding("garbled-seed.sql", bytes);
        assertEquals(2, v.size(), describe(v));
        assertTrue(describe(v).contains("garbled-seed.sql:3"), describe(v));
        assertTrue(describe(v).contains("garbled-seed.sql:5"), describe(v));
        var invalid = StartupSafetyGuard.checkEncoding("bad.sql", new byte[] {(byte) 0xC3, (byte) 0x28});
        assertEquals(1, invalid.size(), describe(invalid));
    }

    @Test
    void acceptsOnlyJustifiedAndAttachedExceptions() throws IOException {
        var v = StartupSafetyGuard.checkSeedScript("allowed-seed.sql", fixture("allowed-seed.sql"));
        assertEquals(2, v.size(), describe(v));
        String all = describe(v);
        assertTrue(all.contains("allow reason too short"), all);
        assertTrue(all.contains("WHERE id = 5"), "a detached marker must not count:\n" + all);
    }

    @Test
    void flagsDdlDeletesAndWrongTableInBulkSeed() throws IOException {
        var v = StartupSafetyGuard.checkBulkSeedScript("unsafe-bulk-seed.sql", fixture("unsafe-bulk-seed.sql"), "public.fixture_t");
        assertEquals(3, v.size(), describe(v));
        String all = describe(v);
        assertTrue(all.contains("first line must be"), all);
        assertTrue(all.contains("ALTER TABLE"), all);
        assertTrue(all.contains("TRUNCATE"), all);
    }

    @Test
    void flagsResetsAndDeletesReachableFromAStartupRunner() throws IOException {
        var v = StartupSafetyGuard.checkStartupJava("UnsafeRunner", fixture("java/UnsafeRunner.java.txt"));
        String all = describe(v);
        assertEquals(6, v.size(), all);
        assertTrue(all.contains("INSERT INTO public.category_master (category_name) VALUES ('FELT')"),
                "insert-if-missing at startup re-creates deleted defaults: " + all);
        assertTrue(all.contains("UPDATE public.department_master SET process_sequence"), "concatenated literal: " + all);
        assertTrue(all.contains("INSERT INTO public.category_master"), "text block with ON CONFLICT DO UPDATE: " + all);
        assertTrue(all.contains(".deleteAll("), all);
        assertTrue(all.contains("allow reason too short"), all);
        assertTrue(!all.contains("public.anything"), "methods not reached from startup must not be flagged: " + all);
    }

    @Test
    void acceptsJustifiedStartupStatements() throws IOException {
        var v = StartupSafetyGuard.checkStartupJava("AllowedRunner", fixture("java/AllowedRunner.java.txt"));
        assertTrue(v.isEmpty(), describe(v));
    }

    @Test
    void discoversNewStartupHooksSoTheyMustBeReviewed() throws IOException {
        Set<String> hooks = StartupSafetyGuard.discoverStartupHooks(FIXTURES.resolve("java"));
        assertEquals(Set.of("AllowedRunner.java.txt", "UnsafeRunner.java.txt"), hooks);
        assertTrue(!StartupSafetyGuardTest.REVIEWED_STARTUP_HOOKS.keySet().containsAll(hooks),
                "an unreviewed hook must not pass the registry check");
    }
}
