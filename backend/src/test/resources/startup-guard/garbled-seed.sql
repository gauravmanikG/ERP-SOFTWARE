-- Fixture: text that was read as cp1252 and saved again as UTF-8. StartupSafetyGuardSelfTest expects 2 violations.
-- seed-policy: system the inventory screen looks this row up by name
INSERT INTO fixture_t (id, name) VALUES (1, 'Bought-Out Parts ðŸ› ') ON CONFLICT (id) DO NOTHING;
-- seed-policy: system the inventory screen looks this row up by name
INSERT INTO fixture_t (id, name) VALUES (2, 'Temp.range-5Â°C to 250°C') ON CONFLICT (id) DO NOTHING;
-- seed-policy: system the inventory screen looks this row up by name
INSERT INTO fixture_t (id, name) VALUES (3, 'Bought-Out Parts 🛠 and 25°C are fine') ON CONFLICT (id) DO NOTHING;
