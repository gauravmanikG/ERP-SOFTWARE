-- Spring Boot runs this automatically on every startup (spring.sql.init.mode=always
-- in application.properties). Safe to re-run — everything is IF NOT EXISTS.
-- You can also run it by hand with psql if you prefer.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS companies (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Company Information
  company_code             TEXT NOT NULL,
  company_name             TEXT NOT NULL,
  legal_name                TEXT DEFAULT '',
  short_name                TEXT DEFAULT '',
  business_type              TEXT DEFAULT 'Manufacturing',
  industry                  TEXT DEFAULT '',
  logo                      TEXT DEFAULT '',        -- base64 data URL of the uploaded logo
  status                    TEXT DEFAULT 'Active',

  -- Legal Information
  pan_no                    TEXT DEFAULT '',
  gstin                     TEXT DEFAULT '',
  cin_llpin                 TEXT DEFAULT '',
  tan                       TEXT DEFAULT '',
  msme_registration         TEXT DEFAULT '',
  factory_license_no        TEXT DEFAULT '',
  iec                       TEXT DEFAULT '',
  pf_establishment_code     TEXT DEFAULT '',
  esi_code                  TEXT DEFAULT '',
  professional_tax_no       TEXT DEFAULT '',
  pollution_certificate_no  TEXT DEFAULT '',

  -- Address Details
  registered_office         TEXT DEFAULT '',
  factory_address           TEXT DEFAULT '',
  branch_address             TEXT DEFAULT '',
  city                      TEXT DEFAULT '',
  state                     TEXT DEFAULT '',
  country                   TEXT DEFAULT 'India',
  pin_code                  TEXT DEFAULT '',

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_search_idx
  ON companies USING gin (to_tsvector('simple', company_name || ' ' || company_code));
