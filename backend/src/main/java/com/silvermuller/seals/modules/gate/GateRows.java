package com.silvermuller.seals.modules.gate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** Small row helpers shared by the gate services: snake_case rows to camelCase JSON, null-safe reads. */
final class GateRows {

    private GateRows() {}

    /** The plant's day: "today", dwell time and turnaround are measured in India time, whatever the server zone. */
    static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    static Map<String, Object> camel(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : row.entrySet()) {
            if (e.getValue() instanceof byte[]) continue;
            out.put(camelKey(e.getKey()), json(e.getValue()));
        }
        return out;
    }

    static List<Map<String, Object>> camelList(List<Map<String, Object>> rows) {
        return rows.stream().map(GateRows::camel).collect(Collectors.toList());
    }

    static Object json(Object v) {
        if (v instanceof java.sql.Date d) return d.toLocalDate().toString();
        if (v instanceof Timestamp t) return t.toInstant().toString();
        return v;
    }

    static String camelKey(String k) {
        StringBuilder sb = new StringBuilder();
        boolean up = false;
        for (char c : k.toCharArray()) {
            if (c == '_') { up = true; continue; }
            sb.append(up ? Character.toUpperCase(c) : c);
            up = false;
        }
        return sb.toString();
    }

    static String str(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v == null ? null : String.valueOf(v);
    }

    static BigDecimal dec(Map<String, Object> row, String key) {
        Object v = row.get(key);
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal b) return b;
        return new BigDecimal(String.valueOf(v));
    }

    static long lng(Map<String, Object> row, String key) {
        return ((Number) row.get(key)).longValue();
    }

    static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    static String blank(String s) {
        return s == null || s.trim().isEmpty() ? null : s.trim();
    }

    static String upper(String s) {
        String b = blank(s);
        return b == null ? null : b.toUpperCase(Locale.ROOT);
    }

    static String plain(BigDecimal v) {
        return v == null ? "0" : v.stripTrailingZeros().toPlainString();
    }

    /** Vehicle numbers are compared without spaces, dashes or case: "hr 55 ab-1234" and "HR55AB1234" are one truck. */
    static String normaliseVehicle(String raw) {
        return raw == null ? "" : raw.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }
}
