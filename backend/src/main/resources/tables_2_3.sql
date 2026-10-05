
CREATE SCHEMA IF NOT EXISTS sms_inventory;

-- Table 2: department_master
CREATE TABLE IF NOT EXISTS sms_inventory.department_master (
  id               BIGSERIAL PRIMARY KEY,
  department_name  VARCHAR(255) NOT NULL UNIQUE,
  process_sequence NUMERIC(10, 2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.department_master (
  id               BIGSERIAL PRIMARY KEY,
  department_name  VARCHAR(255) NOT NULL UNIQUE,
  process_sequence NUMERIC(10, 2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sms_inventory.department_master (department_name, process_sequence) VALUES
  ('Gate', 0),
  ('LASER', 0.1),
  ('T/Room', 1),
  ('Store', 2),
  ('Sand', 3),
  ('Tambling', 4),
  ('Moulding', 5),
  ('Finishing', 6),
  ('CNC', 7),
  ('Burning', 8),
  ('Packing', 9),
  ('Rejection Store', 10)
ON CONFLICT (department_name) DO UPDATE SET process_sequence = EXCLUDED.process_sequence;

INSERT INTO public.department_master (department_name, process_sequence) VALUES
  ('Gate', 0),
  ('LASER', 0.1),
  ('T/Room', 1),
  ('Store', 2),
  ('Sand', 3),
  ('Tambling', 4),
  ('Moulding', 5),
  ('Finishing', 6),
  ('CNC', 7),
  ('Burning', 8),
  ('Packing', 9),
  ('Rejection Store', 10)
ON CONFLICT (department_name) DO UPDATE SET process_sequence = EXCLUDED.process_sequence;

-- Table 3: operation_master / operation_name
CREATE TABLE IF NOT EXISTS sms_inventory.operation_master (
  id             BIGSERIAL PRIMARY KEY,
  operation_name VARCHAR(255) NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operation_master (
  id             BIGSERIAL PRIMARY KEY,
  operation_name VARCHAR(255) NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sms_inventory.operation_master (operation_name) VALUES
  ('Material Transfer'),
  ('Internal Material Return'),
  ('Rejection Tfd to Burning'),
  ('Rejection tfd to Scrap Yard'),
  ('Recycle Material Issue'),
  ('Material Send for Job work'),
  ('Customer Rejection Receipt'),
  ('Customer Rejection Dismentle & SFG Recover'),
  ('FG Dismantling & SFG Recovery'),
  ('Rework')
ON CONFLICT (operation_name) DO NOTHING;

INSERT INTO public.operation_master (operation_name) VALUES
  ('Material Transfer'),
  ('Internal Material Return'),
  ('Rejection Tfd to Burning'),
  ('Rejection tfd to Scrap Yard'),
  ('Recycle Material Issue'),
  ('Material Send for Job work'),
  ('Customer Rejection Receipt'),
  ('Customer Rejection Dismentle & SFG Recover'),
  ('FG Dismantling & SFG Recovery'),
  ('Rework')
ON CONFLICT (operation_name) DO NOTHING;
