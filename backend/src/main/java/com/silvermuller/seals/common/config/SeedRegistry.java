package com.silvermuller.seals.common.config;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Remembers which user-managed defaults have already been seeded into this database (public.app_seed_registry).
 * A registered default is never seeded again, so a row the user deleted on purpose stays deleted after a restart.
 * seed-data.sql uses the same table directly in SQL. See docs/startup-data-rules.md.
 */
@Component
public class SeedRegistry {

    private final JdbcTemplate jdbc;

    public SeedRegistry(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isSeeded(String seedKey) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM public.app_seed_registry WHERE seed_key = ?", Integer.class, seedKey);
        return n != null && n > 0;
    }

    public void markSeeded(String seedKey) {
        jdbc.update("INSERT INTO public.app_seed_registry (seed_key, policy) VALUES (?, 'once') ON CONFLICT (seed_key) DO NOTHING", seedKey);
    }

    /** Runs the seeding action only the first time this key is seen in this database, then records the key. */
    public boolean seedOnce(String seedKey, Runnable seed) {
        if (isSeeded(seedKey)) {
            return false;
        }
        seed.run();
        markSeeded(seedKey);
        return true;
    }
}
