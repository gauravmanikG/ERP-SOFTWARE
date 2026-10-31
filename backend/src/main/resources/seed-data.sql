-- =============================================================================
-- seed-data.sql: default rows. Runs on every startup AFTER schema.sql. Never changes or deletes a row.
-- Every default row is created ONCE per database (docs/startup-data-rules.md):
--   seed-policy: once    Inserted only if its key is not yet in public.app_seed_registry, then registered.
--                        A row the user renames or deletes is never put back by a restart.
-- (seed-policy: system, which re-created missing rows on every start, is no longer used here.)
-- To change existing data deliberately, add a migration to StartupDataMigrations.
-- Enforced by StartupSafetyGuardTest.
-- =============================================================================

-- Databases created before these five locations were "seed once" already contain them (or deliberately no longer
-- do). Register their keys so that this start does not put a renamed or deleted one back. A brand-new database has
-- an empty registry at this point, so it is skipped here and gets the defaults from the statements below.
-- seed-policy: once adopts the existing database: records the keys of rows that were seeded before the registry covered them
WITH seed (seed_key) AS (VALUES
  ('department_master:Store'),
  ('department_master:Rejection Store'),
  ('department_master:External Job Work'),
  ('department_master:Quality Hold'),
  ('department_master:Scrap Yard')
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT s.seed_key, 'once' FROM seed s
WHERE EXISTS (SELECT 1 FROM public.app_seed_registry)
  AND NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = s.seed_key)
ON CONFLICT (seed_key) DO NOTHING;

-- seed-policy: once user-managed defaults: seeded once per database, a row the user renames or deletes is not put back
-- (department_name and dept_code are both unique: a default whose name or code is already taken is skipped)
WITH seed (dept_code, dept_number, department_name, process_sequence, category, status) AS (VALUES
  ('DPT-001', 1, 'Store', 1.0, 'Material Store', 'ACTIVE'),
  ('DPT-016', 16, 'Rejection Store', 16.0, 'Rejection', 'ACTIVE'),
  ('DPT-002', 2, 'Power Press Die Making', 2.0, 'Process', 'ACTIVE'),
  ('DPT-003', 3, 'Power Press Rubber Die Making', 3.0, 'Process', 'ACTIVE'),
  ('DPT-004', 4, 'Power Press Circle Cutting', 4.0, 'Process', 'ACTIVE'),
  ('DPT-005', 5, 'LASER', 5.0, 'Process', 'ACTIVE'),
  ('DPT-006', 6, 'CNC', 6.0, 'Process', 'ACTIVE'),
  ('DPT-007', 7, 'Moulding', 7.0, 'Process', 'ACTIVE'),
  ('DPT-008', 8, 'Finishing', 8.0, 'Process', 'ACTIVE'),
  ('DPT-009', 9, 'Tambling', 9.0, 'Process', 'ACTIVE'),
  ('DPT-010', 10, 'Sand', 10.0, 'Process', 'ACTIVE'),
  ('DPT-011', 11, 'Burning', 11.0, 'Process', 'ACTIVE'),
  ('DPT-012', 12, 'T/Room', 12.0, 'Process', 'ACTIVE'),
  ('DPT-013', 13, 'Packing', 13.0, 'Process', 'ACTIVE'),
  ('DPT-014', 14, 'FG STORE', 14.0, 'Finished Goods Store', 'ACTIVE'),
  ('DPT-015', 15, 'Dispatch', 15.0, 'Outward', 'ACTIVE'),
  ('DPT-017', 17, 'Rework-Burning', 17.0, 'Rework', 'ACTIVE'),
  ('DPT-018', 18, 'Gate', 18.0, 'Movement/Control', 'ACTIVE')
),
added AS (
  INSERT INTO public.department_master (dept_code, dept_number, department_name, process_sequence, category, status)
  SELECT s.dept_code, s.dept_number, s.department_name, s.process_sequence, s.category, s.status FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'department_master:' || s.department_name::text)
  ON CONFLICT DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'department_master:' || s.department_name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- seed-policy: once user-managed defaults: seeded once per database, a row the user deletes stays deleted
WITH seed (operation_name) AS (VALUES
  ('Material Transfer'),
  ('Internal Material Return'),
  ('Rejection Tfd to Burning'),
  ('Rejection tfd to Scrap Yard'),
  ('Recycle Material Issue'),
  ('Material Send for Job work'),
  ('Customer Rejection Receipt'),
  ('Customer Rejection Dismentle & SFG Recover'),
  ('FG Dismantling & SFG Recovery'),
  ('Rework'),
  ('BOM Moulding Receipt')
),
added AS (
  INSERT INTO public.operation_master (operation_name)
  SELECT s.operation_name FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'operation_master:' || s.operation_name::text)
  ON CONFLICT (operation_name) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'operation_master:' || s.operation_name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- seed-policy: once user-managed defaults: seeded once per database, a row the user deletes stays deleted
WITH seed (category_name, bom_consumption, category_code, short_code) AS (VALUES
  ('OUTER METAL SHELL',   '',                   'B01', 'OTSHL'),
  ('INNER METAL SHELL',   '',                   'B02', 'INSHL'),
  ('SPRING',              '',                   'B03', 'Spring'),
  ('MIDDLE METAL SHELL',  '',                   'B04', 'MDLSHL'),
  ('OUTER MOULDED',       'OUTER METAL SHELL', 'M01', 'OMLD'),
  ('INNER MOULDED',       'INNER METAL SHELL', 'M02', 'IMLD'),
  ('MIDDLE MOULDED',      'MIDDLE METAL SHELL', 'M04', 'OTHER'),
  ('FELT',                '',                   'B05', 'FELT'),
  ('PTFE',                '',                   'B06', 'PTFE'),
  ('TPU/PU',              '',                   'B07', 'TPU/PU'),
  ('Brass Washer',        '',                   'B08', 'Brass Washer'),
  ('Silver Washer',       '',                   'B09', 'Silver Washer'),
  ('Big Washer',          '',                   'B10', 'Big Washer'),
  ('Gasket',              '',                   'B11', 'Gasket'),
  ('O-Ring',              '',                   'B12', 'O-Ring'),
  ('O-RING-A',            '',                   '',    ''),
  ('O-RING-B',            '',                   '',    ''),
  ('O-RING-C',            '',                   '',    ''),
  ('O-RING-D',            '',                   '',    ''),
  ('FG',                  '',                   '',    ''),
  ('Spare Parts',         '',                   '',    ''),
  ('Consumables',         '',                   '',    ''),
  ('Raw Material',        '',                   '',    ''),
  ('Bought-Out Parts 🛠',  '',                   '',    '')
),
added AS (
  INSERT INTO public.category_master (category_name, bom_consumption, category_code, short_code)
  SELECT s.category_name, s.bom_consumption, s.category_code, s.short_code FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'category_master:' || s.category_name::text)
  ON CONFLICT (category_name) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'category_master:' || s.category_name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- seed-policy: once user-managed defaults: seeded once per database, a row the user deletes stays deleted
WITH seed (hsn_sac_code, description, type, gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, chapter) AS (VALUES
  ('40169320', 'Rubber seals, oil seals, gaskets, washers', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('40169330', 'Rubber O-rings & moulded rubber components', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('40169340', 'Gaskets, washers and other seals of vulcanised rubber', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('40169990', 'Other articles of vulcanised rubber (bellows, grommets, boots)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('40021990', 'Synthetic rubber compound (NBR, SBR, EPDM, FKM Viton)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('40051000', 'Compounded rubber with carbon black or silica, unvulcanised', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('40027000', 'Ethylene-propylene-non-conjugated diene rubber (EPDM)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('40029990', 'Fluorocarbon elastomers (FKM Viton, FFKM)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('40082110', 'Non-cellular rubber sheets for gasket cutting', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
  ('39269099', 'PTFE backup rings, guide rings, wear strips, plastic seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),
  ('39046100', 'Polytetrafluoroethylene (PTFE) raw resin powder', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),
  ('39232990', 'Packaging polythene bags & packing wraps for seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),
  ('73202000', 'Helical & garter springs for rotary shaft oil seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
  ('73209090', 'Flat springs, Belleville washers, wave springs', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
  ('73182100', 'Spring washers and other lock washers', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
  ('73181500', 'Screws, bolts, nuts, rivets, studs for tooling & assemblies', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
  ('73269099', 'Deep draw outer metal shells & metal casing inserts', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
  ('72283000', 'Alloy steel bars / rods (EN8, EN24, EN31) for tooling', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),
  ('72091600', 'Cold-rolled steel coils / sheets for stamping outer casings', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),
  ('72104900', 'Galvanized / zinc coated steel sheets for corrosion resistance', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),
  ('84807100', 'Injection moulds for rubber or plastics', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
  ('84807900', 'Compression moulding dies & transfer moulds for seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
  ('84841000', 'Gaskets of metal sheeting combined with other material', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
  ('84842000', 'Mechanical face seals for pumps and agitators', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
  ('84821011', 'Ball bearings & roller bearings for CNC & hydraulic presses', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
  ('84669390', 'Parts and accessories for machine tools / CNC chucks & collets', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
  ('82073000', 'Press tools, punches, blanking dies for power presses', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '82'),
  ('34039900', 'Mould release agents, silicone sprays & anti-stick sprays', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '34'),
  ('27101980', 'Hydraulic oils (VG 68, VG 46), spindle oils, turbine oils', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '27'),
  ('27101990', 'Industrial lubricating greases (Lithium, synthetic high-temp)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '27'),
  ('38249990', 'Rubber bonding agents (Chemlok / Megum adhesive primers)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '38'),
  ('28030010', 'Carbon black for rubber compounding', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '28'),
  ('28170010', 'Zinc oxide (rubber grade vulcanizing activator)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '28'),
  ('28020010', 'Sulphur powder (rubber vulcanization agent)', 'GOODS', 5.00, 2.50, 2.50, 5.00, 0.00, '28'),
  ('998821', 'Job work / Subcontracting (rubber moulding & trimming services)', 'SERVICE', 12.00, 6.00, 6.00, 12.00, 0.00, '99'),
  ('998822', 'Job work (metal stamping, casing phosphating, zinc plating)', 'SERVICE', 12.00, 6.00, 6.00, 12.00, 0.00, '99'),
  ('998719', 'Maintenance, calibration and repair of production machinery', 'SERVICE', 18.00, 9.00, 9.00, 18.00, 0.00, '99'),
  ('998314', 'Testing, lab analysis & metallurgical inspection services', 'SERVICE', 18.00, 9.00, 9.00, 18.00, 0.00, '99'),
  ('996511', 'Road freight transportation (GTA / Goods Transport Agency)', 'SERVICE', 5.00, 2.50, 2.50, 5.00, 0.00, '99')
),
added AS (
  INSERT INTO public.hsn_tax_master (hsn_sac_code, description, type, gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, chapter)
  SELECT s.hsn_sac_code, s.description, s.type, s.gst_rate, s.cgst_rate, s.sgst_rate, s.igst_rate, s.cess_rate, s.chapter FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'hsn_tax_master:' || s.hsn_sac_code::text)
  ON CONFLICT (hsn_sac_code) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'hsn_tax_master:' || s.hsn_sac_code::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- seed-policy: once user-managed defaults: seeded once per database, a row the user deletes stays deleted
WITH seed (procurement_type, procurement_name) AS (VALUES
  ('IN HOUSE', 'IN HOUSE'),
  ('OUTSOURCE', 'OUTSOURCE'),
  ('BUY/INHOUSE', 'BUY/INHOUSE'),
  ('IMPORTED', 'IMPORTED')
),
added AS (
  INSERT INTO public.procurement_master (procurement_type, procurement_name)
  SELECT s.procurement_type, s.procurement_name FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'procurement_master:' || s.procurement_type::text)
  ON CONFLICT (procurement_type) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'procurement_master:' || s.procurement_type::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- seed-policy: once user-managed defaults: seeded once per database, a row the user deletes stays deleted
WITH seed (process_code, process_description) AS (VALUES
  ('PR-1', '1 : Metal Open Type : In-house'),
  ('PR-2', '2 : Metal Close Type : In-house'),
  ('PR-3', '5 : Half Rubber : Open'),
  ('PR-4', '6 : Half Rubber : Close'),
  ('PR-5', '7 : Full Rubber : Open'),
  ('PR-7', '8 : Full Rubber : Close'),
  ('PR-8', '9 : Cassette Seal'),
  ('PR-9', '10 : Combi Seal'),
  ('PR-10', '11 : PTFE Moulded (no inner shell)'),
  ('PR-11', '12 : PTFE Moulded (with inner shell)'),
  ('PR-12', '13 : PTFE Fitted'),
  ('PR-13', '14 : Hub Seal SKF'),
  ('PR-14', '15 : Hub Seal National'),
  ('PR-15', '3: ABS SEAL'),
  ('PR-51', '16 : PTFE Moulded (no inner shell ) Half Rubber'),
  ('PR-16', 'NA')
),
added AS (
  INSERT INTO public.process_master (process_code, process_description)
  SELECT s.process_code, s.process_description FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'process_master:' || s.process_code::text)
  ON CONFLICT (process_code) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'process_master:' || s.process_code::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- seed-policy: once user-managed defaults: seeded once per database, a row the user deletes stays deleted
WITH seed (parent_group, name, sort_order) AS (VALUES
  ('Service', 'Machine Maintenance', 1),
  ('Service', 'Quality Services', 2),
  ('Service', 'Transportation', 3),
  ('Service', 'Facility Services', 4),
  ('Service', 'IT Services', 5),
  ('Service', 'Professional Services', 6),
  ('Service', 'Utilities', 7)
),
added AS (
  INSERT INTO public.service_po_categories (parent_group, name, sort_order)
  SELECT s.parent_group, s.name, s.sort_order FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'service_po_categories:' || s.parent_group::text || '|' || s.name::text)
  ON CONFLICT (parent_group, name) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'service_po_categories:' || s.parent_group::text || '|' || s.name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- seed-policy: once user-managed defaults: seeded once per database, a row the user deletes stays deleted
WITH seed (parent_group, name, sort_order) AS (VALUES
  ('Assets', 'Plant & Machinery', 1),
  ('Assets', 'Moulds & Dies', 2),
  ('Assets', 'Electrical Equipment', 3),
  ('Assets', 'IT Equipment', 4),
  ('Assets', 'Low Valued Assets', 5),
  ('Assets', 'Low Valued - Lab Equipment', 6)
),
added AS (
  INSERT INTO public.capital_po_asset_categories (parent_group, name, sort_order)
  SELECT s.parent_group, s.name, s.sort_order FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'capital_po_asset_categories:' || s.parent_group::text || '|' || s.name::text)
  ON CONFLICT (parent_group, name) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'capital_po_asset_categories:' || s.parent_group::text || '|' || s.name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- =============================================================================
-- JOB WORK (subcontracting) — Phase 1
-- Company stock moves through the existing inventory engine (inventory_transaction).
-- Virtual locations: "External Job Work" (material with outside workers) and "Quality Hold"
-- (received material awaiting inspection). Existing Store, Rejection Store and Rework-Burning
-- departments receive inspected material. The job-worker-wise ledger below sits on top.
-- =============================================================================

-- seed-policy: once user-managed defaults: seeded once per database, a row the user renames or deletes is not put back
WITH seed (dept_code, department_name, category, notes) AS (VALUES
  ('JW-EXT', 'External Job Work', 'JOB WORK', 'Virtual location: material held by external job workers'),
  ('QH-HOLD', 'Quality Hold', 'QUALITY', 'Virtual location: received job work material awaiting inspection')
),
added AS (
  INSERT INTO public.department_master (dept_code, dept_number, department_name, process_sequence, category, status, notes)
  SELECT s.dept_code, NULL, s.department_name, 0, s.category, 'ACTIVE', s.notes FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'department_master:' || s.department_name::text)
  ON CONFLICT DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'department_master:' || s.department_name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;

-- seed-policy: once user-managed defaults: seeded once per database, a row the user deletes stays deleted
WITH seed (operation_name) AS (VALUES
  ('CNC'),
  ('Machining'),
  ('Grinding'),
  ('Moulding'),
  ('Coating'),
  ('Heat Treatment'),
  ('Finishing'),
  ('Turning'),
  ('Plating'),
  ('Other')
),
added AS (
  INSERT INTO public.job_work_operations (operation_name)
  SELECT s.operation_name FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'job_work_operations:' || s.operation_name::text)
  ON CONFLICT (operation_name) DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'job_work_operations:' || s.operation_name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;


-- =============================================================================
-- JOB WORK — Phase 2: reconciliation, scrap disposal, write-offs, permissible loss
-- =============================================================================

-- seed-policy: once user-managed defaults: seeded once per database, a row the user renames or deletes is not put back
WITH seed (dept_code, department_name, category, notes) AS (VALUES
  ('SCRAP-YD', 'Scrap Yard', 'SCRAP', 'Location for disposed scrap (after approval)')
),
added AS (
  INSERT INTO public.department_master (dept_code, dept_number, department_name, process_sequence, category, status, notes)
  SELECT s.dept_code, NULL, s.department_name, 0, s.category, 'ACTIVE', s.notes FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.app_seed_registry r WHERE r.seed_key = 'department_master:' || s.department_name::text)
  ON CONFLICT DO NOTHING
)
INSERT INTO public.app_seed_registry (seed_key, policy)
SELECT 'department_master:' || s.department_name::text, 'once' FROM seed s
ON CONFLICT (seed_key) DO NOTHING;
