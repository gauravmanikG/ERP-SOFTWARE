-- startup-guard: bulk-seed-when-empty public.hsn_tax_master
-- HSN / SAC tax codes for Silver Muller Seals.
-- Loaded by DataInitializer ONLY when public.hsn_tax_master is empty. Data rows only: the table,
-- columns and indexes are defined in schema.sql. Enforced by StartupSafetyGuardTest.

-- Seed Manufacturing HSN / SAC codes for Silver Muller Seals
INSERT INTO public.hsn_tax_master (hsn_sac_code, description, type, gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, chapter)
VALUES 
    -- Rubber Products & Seals (Chapter 40)
    ('40169320', 'Rubber seals, oil seals, gaskets, washers', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40169330', 'Rubber O-rings & moulded rubber components', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40169340', 'Gaskets, washers and other seals of vulcanised rubber', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40169990', 'Other articles of vulcanised rubber (bellows, grommets, boots)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40021990', 'Synthetic rubber compound (NBR, SBR, EPDM, FKM Viton)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40051000', 'Compounded rubber with carbon black or silica, unvulcanised', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40027000', 'Ethylene-propylene-non-conjugated diene rubber (EPDM)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40029990', 'Fluorocarbon elastomers (FKM Viton, FFKM)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),
    ('40082110', 'Non-cellular rubber sheets for gasket cutting', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '40'),

    -- Plastics & PTFE / Teflon (Chapter 39)
    ('39269099', 'PTFE backup rings, guide rings, wear strips, plastic seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),
    ('39046100', 'Polytetrafluoroethylene (PTFE) raw resin powder', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),
    ('39232990', 'Packaging polythene bags & packing wraps for seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '39'),

    -- Iron, Steel, Springs & Fasteners (Chapters 72 & 73)
    ('73202000', 'Helical & garter springs for rotary shaft oil seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('73209090', 'Flat springs, Belleville washers, wave springs', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('73182100', 'Spring washers and other lock washers', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('73181500', 'Screws, bolts, nuts, rivets, studs for tooling & assemblies', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('73269099', 'Deep draw outer metal shells & metal casing inserts', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '73'),
    ('72283000', 'Alloy steel bars / rods (EN8, EN24, EN31) for tooling', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),
    ('72091600', 'Cold-rolled steel coils / sheets for stamping outer casings', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),
    ('72104900', 'Galvanized / zinc coated steel sheets for corrosion resistance', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '72'),

    -- Tooling, Moulds, Dies & Machinery Spares (Chapter 84)
    ('84807100', 'Injection moulds for rubber or plastics', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84807900', 'Compression moulding dies & transfer moulds for seals', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84841000', 'Gaskets of metal sheeting combined with other material', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84842000', 'Mechanical face seals for pumps and agitators', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84821011', 'Ball bearings & roller bearings for CNC & hydraulic presses', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('84669390', 'Parts and accessories for machine tools / CNC chucks & collets', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '84'),
    ('82073000', 'Press tools, punches, blanking dies for power presses', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '82'),

    -- Industrial Chemicals, Lubricants & Consumables (Chapters 27, 34, 38)
    ('34039900', 'Mould release agents, silicone sprays & anti-stick sprays', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '34'),
    ('27101980', 'Hydraulic oils (VG 68, VG 46), spindle oils, turbine oils', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '27'),
    ('27101990', 'Industrial lubricating greases (Lithium, synthetic high-temp)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '27'),
    ('38249990', 'Rubber bonding agents (Chemlok / Megum adhesive primers)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '38'),
    ('28030010', 'Carbon black for rubber compounding', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '28'),
    ('28170010', 'Zinc oxide (rubber grade vulcanizing activator)', 'GOODS', 18.00, 9.00, 9.00, 18.00, 0.00, '28'),
    ('28020010', 'Sulphur powder (rubber vulcanization agent)', 'GOODS', 5.00, 2.50, 2.50, 5.00, 0.00, '28'),

    -- Services & Subcontracting (SAC Chapter 99)
    ('998821', 'Job work / Subcontracting (rubber moulding & trimming services)', 'SERVICE', 12.00, 6.00, 6.00, 12.00, 0.00, '99'),
    ('998822', 'Job work (metal stamping, casing phosphating, zinc plating)', 'SERVICE', 12.00, 6.00, 6.00, 12.00, 0.00, '99'),
    ('998719', 'Maintenance, calibration and repair of production machinery', 'SERVICE', 18.00, 9.00, 9.00, 18.00, 0.00, '99'),
    ('998314', 'Testing, lab analysis & metallurgical inspection services', 'SERVICE', 18.00, 9.00, 9.00, 18.00, 0.00, '99'),
    ('996511', 'Road freight transportation (GTA / Goods Transport Agency)', 'SERVICE', 5.00, 2.50, 2.50, 5.00, 0.00, '99')
ON CONFLICT (hsn_sac_code) DO UPDATE SET 
    description = EXCLUDED.description,
    gst_rate = EXCLUDED.gst_rate,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    type = EXCLUDED.type,
    chapter = EXCLUDED.chapter;
