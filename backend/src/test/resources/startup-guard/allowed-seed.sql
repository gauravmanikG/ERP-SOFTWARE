-- Fixture: the documented exception mechanism. StartupSafetyGuardSelfTest expects exactly 2 violations.

-- startup-guard: allow removes the duplicate row created by the 1.2 import bug; reviewed in PR 123
DELETE FROM fixture_t WHERE id = 3;

-- startup-guard: allow short
UPDATE fixture_t SET name = 'x' WHERE id = 4;

-- startup-guard: allow a marker separated by an empty line does not count

UPDATE fixture_t SET name = 'y' WHERE id = 5;
