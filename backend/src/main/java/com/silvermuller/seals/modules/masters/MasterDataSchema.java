package com.silvermuller.seals.modules.masters;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Creates the master tables and loads their starting entries. Idempotent: existing rows are never changed, so an
 * entry the user renamed or deactivated stays that way after a restart.
 */
@Component
@Order(0)
public class MasterDataSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public MasterDataSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (MasterDataDefinitions.Definition def : MasterDataDefinitions.ALL.values()) {
            jdbc.execute(
                "CREATE TABLE IF NOT EXISTS public." + def.table() + " (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "code VARCHAR(20) NOT NULL UNIQUE, " +
                "name VARCHAR(200) NOT NULL, " +
                "is_active BOOLEAN NOT NULL DEFAULT TRUE, " +
                "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
                "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
            for (int i = 0; i < def.seedNames().size(); i++) {
                // startup-guard: allow the app only soft-deletes these entries (is_active = FALSE), so the row stays and DO NOTHING never re-creates one
                jdbc.update(
                    "INSERT INTO public." + def.table() + " (code, name) VALUES (?, ?) ON CONFLICT (code) DO NOTHING",
                    String.format("%s%03d", def.codePrefix(), i + 1), def.seedNames().get(i));
            }
        }
    }
}
