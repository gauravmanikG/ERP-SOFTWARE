-- startup-guard: bulk-seed-when-empty public.wrong_table
-- Fixture: wrong marker table, plus DDL and a delete. StartupSafetyGuardSelfTest expects 3 violations.
ALTER TABLE public.fixture_t ALTER COLUMN name TYPE TEXT;
TRUNCATE TABLE public.fixture_t;
INSERT INTO public.fixture_t (id, name) VALUES (1, 'row') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
SELECT setval('public.fixture_t_id_seq', 2, true);
