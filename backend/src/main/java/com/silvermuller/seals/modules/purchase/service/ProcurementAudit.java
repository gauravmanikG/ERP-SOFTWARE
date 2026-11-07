package com.silvermuller.seals.modules.purchase.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silvermuller.seals.modules.admin.security.RequestActor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

/** Writes one row to procurement_audit_log in the caller's transaction, so the record rolls back with the action. */
public final class ProcurementAudit {

    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();

    private ProcurementAudit() {}

    /**
     * The actor is always the signed-in user of the current request when there is one; {@code actor} is only the
     * fallback outside a web request (startup jobs, tests). A browser-sent name is never recorded.
     */
    public static void record(JdbcTemplate jdbc, String entityType, String entityRef, String action, String actor, Map<String, ?> details) {
        actor = RequestActor.nameOr(actor);
        String json;
        try {
            json = details == null || details.isEmpty() ? null : JSON.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not write the audit record for " + entityRef + ".", e);
        }
        jdbc.update("INSERT INTO public.procurement_audit_log (entity_type, entity_ref, action, actor, details_json) VALUES (?, ?, ?, ?, ?)",
                entityType, entityRef, action, actor == null || actor.isBlank() ? "SYSTEM" : actor.trim(), json);
    }
}
