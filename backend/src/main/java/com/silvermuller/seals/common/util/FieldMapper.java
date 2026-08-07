package com.silvermuller.seals.common.util;

import java.util.*;

/**
 * The frontend form works with camelCase keys (companyCode, panNo, ...) that
 * match src/data/companyMasterFields.js. Postgres columns are snake_case.
 * This class translates between the two so neither side has to change its
 * naming convention. Direct port of the old backend/mapRecord.js.
 */
public class FieldMapper {

    private static final LinkedHashMap<String, String> COLUMN_MAP = new LinkedHashMap<>();
    static {
        COLUMN_MAP.put("companyCode", "company_code");
        COLUMN_MAP.put("companyName", "company_name");
        COLUMN_MAP.put("legalName", "legal_name");
        COLUMN_MAP.put("shortName", "short_name");
        COLUMN_MAP.put("businessType", "business_type");
        COLUMN_MAP.put("industry", "industry");
        COLUMN_MAP.put("logo", "logo");
        COLUMN_MAP.put("status", "status");
        COLUMN_MAP.put("panNo", "pan_no");
        COLUMN_MAP.put("gstin", "gstin");
        COLUMN_MAP.put("cinLlpin", "cin_llpin");
        COLUMN_MAP.put("tan", "tan");
        COLUMN_MAP.put("msmeRegistration", "msme_registration");
        COLUMN_MAP.put("factoryLicenseNo", "factory_license_no");
        COLUMN_MAP.put("iec", "iec");
        COLUMN_MAP.put("pfEstablishmentCode", "pf_establishment_code");
        COLUMN_MAP.put("esiCode", "esi_code");
        COLUMN_MAP.put("professionalTaxNo", "professional_tax_no");
        COLUMN_MAP.put("pollutionCertificateNo", "pollution_certificate_no");
        COLUMN_MAP.put("registeredOffice", "registered_office");
        COLUMN_MAP.put("factoryAddress", "factory_address");
        COLUMN_MAP.put("branchAddress", "branch_address");
        COLUMN_MAP.put("city", "city");
        COLUMN_MAP.put("state", "state");
        COLUMN_MAP.put("country", "country");
        COLUMN_MAP.put("pinCode", "pin_code");
    }

    public static Set<String> editableKeys() {
        return COLUMN_MAP.keySet();
    }

    public record Columns(List<String> columns, List<Object> values) {}

    /** camelCase request body -> ordered (columns, values) for INSERT/UPDATE. Only keys present in the body are included. */
    public static Columns toColumns(Map<String, Object> record) {
        List<String> columns = new ArrayList<>();
        List<Object> values = new ArrayList<>();
        for (Map.Entry<String, String> entry : COLUMN_MAP.entrySet()) {
            String camelKey = entry.getKey();
            if (record.containsKey(camelKey)) {
                columns.add(entry.getValue());
                values.add(record.get(camelKey));
            }
        }
        return new Columns(columns, values);
    }

    /** DB row (snake_case column names as keys) -> camelCase map for the frontend. */
    public static Map<String, Object> toCamel(Map<String, Object> row) {
        if (row == null) return null;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", row.get("id"));
        for (Map.Entry<String, String> entry : COLUMN_MAP.entrySet()) {
            out.put(entry.getKey(), row.get(entry.getValue()));
        }
        out.put("createdAt", row.get("created_at"));
        out.put("updatedAt", row.get("updated_at"));
        return out;
    }
}
