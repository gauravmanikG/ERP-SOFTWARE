-- Fixture: a DDL-only script that breaks the rules. StartupSafetyGuardSelfTest expects 4 violations.
CREATE TABLE IF NOT EXISTS fixture_t (id INT PRIMARY KEY, name TEXT);

INSERT INTO fixture_t (id, name) VALUES (1, 'seed in schema');

DROP TABLE fixture_old;

ALTER TABLE fixture_t DROP COLUMN name;

ALTER TABLE fixture_t ADD COLUMN IF NOT EXISTS code VARCHAR(10);

DO $$ BEGIN RAISE NOTICE 'x'; END $$;
