-- Fixture: a seed script that breaks the rules. StartupSafetyGuardSelfTest expects exactly 7 violations.

INSERT INTO fixture_t (id, name) VALUES (1, 'no policy declared') ON CONFLICT (id) DO NOTHING;

-- seed-policy: system the inventory screen looks this row up by name
INSERT INTO fixture_t (id, name) VALUES (2, 'no conflict handling');

-- seed-policy: system short
INSERT INTO fixture_t (id, name) VALUES (3, 'reason too short') ON CONFLICT (id) DO NOTHING;

-- seed-policy: system the inventory screen looks this row up by name
INSERT INTO fixture_t (id, name) VALUES (4, 'reset on every start')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- seed-policy: once
INSERT INTO fixture_t (id, name) VALUES (5, 'insert-if-missing re-creates a deleted default') ON CONFLICT (id) DO NOTHING;

-- seed-policy: system the inventory screen looks this row up by name
DELETE FROM fixture_t WHERE name = 'Gaurav';

-- seed-policy: once
UPDATE fixture_t SET name = 'default' WHERE id = 6;

-- these two are fine
-- seed-policy: system the inventory screen looks this row up by name
INSERT INTO fixture_t (id, name) VALUES (7, 'ok') ON CONFLICT (id) DO NOTHING;

-- seed-policy: once user-managed default
WITH seed (id, name) AS (VALUES (8, 'ok')),
added AS (
  INSERT INTO fixture_t (id, name)
  SELECT s.id, s.name FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'fixture_t:' || s.id::text)
  ON CONFLICT (id) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'fixture_t:' || s.id::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;
