
CREATE SCHEMA IF NOT EXISTS sms_inventory;

-- Table 4: category_master
CREATE TABLE IF NOT EXISTS sms_inventory.category_master (
  id               BIGSERIAL PRIMARY KEY,
  category_name    VARCHAR(255) NOT NULL UNIQUE,
  bom_consumption VARCHAR(255) DEFAULT '',
  category_code    VARCHAR(100) DEFAULT '',
  short_code       VARCHAR(100) DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.category_master (
  id               BIGSERIAL PRIMARY KEY,
  category_name    VARCHAR(255) NOT NULL UNIQUE,
  bom_consumption VARCHAR(255) DEFAULT '',
  category_code    VARCHAR(100) DEFAULT '',
  short_code       VARCHAR(100) DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sms_inventory.category_master (category_name, bom_consumption, category_code, short_code) VALUES
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
  ('FG',                  '',                   '',    '')
ON CONFLICT (category_name) DO UPDATE SET
  bom_consumption = EXCLUDED.bom_consumption,
  category_code   = EXCLUDED.category_code,
  short_code      = EXCLUDED.short_code;

INSERT INTO public.category_master (category_name, bom_consumption, category_code, short_code) VALUES
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
  ('FG',                  '',                   '',    '')
ON CONFLICT (category_name) DO UPDATE SET
  bom_consumption = EXCLUDED.bom_consumption,
  category_code   = EXCLUDED.category_code,
  short_code      = EXCLUDED.short_code;
