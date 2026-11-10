package com.silvermuller.seals.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.StdSerializer;

/**
 * JSON output rules for every API response. Spring Boot adds any Jackson module bean to its JSON mapper.
 *
 * <p>DATE columns read through JdbcTemplate arrive as {@link java.sql.Date}. Jackson 2 wrote them as the plain
 * calendar date ({@code "2026-11-06"}); Jackson 3 writes a UTC timestamp instead ({@code "2026-11-05T18:30:00.000+00:00"}
 * on an IST server), which would show the day before on every PR, PO, GRN and vendor-rate date. This keeps the plain
 * {@code yyyy-MM-dd} the frontend expects.
 */
@Configuration
public class JsonConfig {

    @Bean
    public SimpleModule sqlDateAsCalendarDateModule() {
        SimpleModule module = new SimpleModule("SqlDateAsCalendarDate");
        module.addSerializer(java.sql.Date.class, new StdSerializer<>(java.sql.Date.class) {
            @Override
            public void serialize(java.sql.Date value, JsonGenerator gen, SerializationContext ctx) {
                gen.writeString(value.toLocalDate().toString());
            }
        });
        return module;
    }
}
