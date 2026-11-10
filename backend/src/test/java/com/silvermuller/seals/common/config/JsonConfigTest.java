package com.silvermuller.seals.common.config;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.util.Map;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** DATE columns must reach the browser as the plain calendar date, whatever the server's time zone. */
class JsonConfigTest {

    @Test
    void sqlDateIsWrittenAsCalendarDateNotUtcTimestamp() {
        TimeZone before = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
            JsonMapper mapper = JsonMapper.builder().addModule(new JsonConfig().sqlDateAsCalendarDateModule()).build();
            String json = mapper.writeValueAsString(Map.of("prDate", java.sql.Date.valueOf(LocalDate.of(2026, 11, 6))));
            assertEquals("{\"prDate\":\"2026-11-06\"}", json);
        } finally {
            TimeZone.setDefault(before);
        }
    }
}
