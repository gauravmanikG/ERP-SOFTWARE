package com.silvermuller.seals.common.docs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silvermuller.seals.modules.admin.auth.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Documentation module (live section) and health checks, against a DISPOSABLE PostgreSQL database
 * (run through backend/test-db.ps1; refuses the live sms_seals database).
 *
 * Proves: /api/docs/system needs a session, works for ANY signed-in user (even one without a role), and reports the
 * real system (its own endpoint, real tables, the permission catalog); /api/health/live and /api/health are open and
 * /api/health reports a reachable database.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "SMS_INIT_TEST_DATABASE_URL", matches = ".+")
class DocsSystemIntegrationTest {

    @DynamicPropertySource
    static void disposableDatabase(DynamicPropertyRegistry r) {
        String url = System.getenv("SMS_INIT_TEST_DATABASE_URL");
        if (url.matches("(?i).*/sms_seals(\\?.*)?$")) {
            throw new IllegalStateException("Refusing to run tests against the live sms_seals database");
        }
        r.add("spring.datasource.url", () -> url);
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("SMS_INIT_TEST_DATABASE_USERNAME", "postgres"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("SMS_INIT_TEST_DATABASE_PASSWORD", "postgres"));
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AuthService auth;
    @Autowired ObjectMapper json;

    /** A plain signed-in user with no role and no permissions: documentation must still be readable. */
    private String signInWithoutRole() {
        String email = "docs-test-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String password = "Docs-Test-" + UUID.randomUUID();
        jdbc.update("INSERT INTO public.app_user (name, email, password_hash, status, must_change_password) "
                + "VALUES ('Docs Test', ?, crypt(?, gen_salt('bf')), 'ACTIVE', FALSE)", email, password);
        return (String) auth.login(email, password).orElseThrow().get("token");
    }

    @Test
    void docsSystemNeedsASession() throws Exception {
        mvc.perform(get("/api/docs/system")).andExpect(status().isUnauthorized());
    }

    @Test
    void anySignedInUserGetsTheLiveSystemDescription() throws Exception {
        String token = signInWithoutRole();
        String body = mvc.perform(get("/api/docs/system").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode root = json.readTree(body);

        JsonNode totals = root.get("totals");
        assertTrue(totals.get("endpoints").asInt() > 100, "expected the real endpoint list, got " + totals);
        assertTrue(totals.get("tables").asInt() > 50, "expected the real table list, got " + totals);
        assertTrue(totals.get("permissionKeys").asInt() > 50, "expected the permission catalog, got " + totals);

        boolean listsItself = false;
        for (JsonNode g : root.get("endpointGroups")) {
            for (JsonNode e : g.get("endpoints")) {
                if ("/api/docs/system".equals(e.get("path").asText()) && "GET".equals(e.get("method").asText())) listsItself = true;
            }
        }
        assertTrue(listsItself, "the endpoint list must include GET /api/docs/system");

        boolean hasPrTable = false;
        for (JsonNode t : root.get("tables")) if ("purchase_requisitions".equals(t.get("name").asText())) hasPrTable = true;
        assertTrue(hasPrTable, "the table list must include purchase_requisitions");
        assertTrue(root.get("permissions").size() >= 5, "permission catalog grouped by module");
    }

    @Test
    void healthEndpointsAreOpenAndReal() throws Exception {
        mvc.perform(get("/api/health/live")).andExpect(status().isOk());
        String body = mvc.perform(get("/api/health")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode h = json.readTree(body);
        assertTrue(h.get("ok").asBoolean());
        assertEquals("connected", h.get("db").asText());
    }
}
