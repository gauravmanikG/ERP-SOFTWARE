package com.silvermuller.seals.common.settings;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/** Application settings (theme, table column widths, current user), stored as JSON in app_setting. */
@Service
public class AppSettingService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public AppSettingService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> getAll() {
        Map<String, Object> out = new LinkedHashMap<>();
        jdbc.query("SELECT setting_key, setting_value::text AS value FROM public.app_setting ORDER BY setting_key", rs -> {
            out.put(rs.getString("setting_key"), parse(rs.getString("value")));
        });
        return out;
    }

    public void put(String key, Object value) {
        try {
            String json = objectMapper.writeValueAsString(value);
            jdbc.update(
                "INSERT INTO public.app_setting (setting_key, setting_value, updated_at) VALUES (?, CAST(? AS JSONB), now()) " +
                "ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()",
                key, json);
        } catch (Exception e) {
            throw new IllegalArgumentException("Setting value is not valid JSON: " + e.getMessage());
        }
    }

    private Object parse(String json) {
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (Exception e) {
            return json;
        }
    }
}
