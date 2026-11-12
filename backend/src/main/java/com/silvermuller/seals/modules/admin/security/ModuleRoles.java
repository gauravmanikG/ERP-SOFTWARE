package com.silvermuller.seals.modules.admin.security;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The role a signed-in user plays inside the modules that keep their own role model (Capital PO, Service PO, Job
 * Work), derived from the user's RBAC permissions. Before this, those modules read the role from the browser's
 * X-User-Role header, so any user could pick ADMIN or APPROVER and skip the approval limit and the
 * "cannot approve your own document" rule. Now:
 *
 * <ul>
 *   <li>ADMIN is only ever a wildcard account (Super Admin, Developer);</li>
 *   <li>every other module role follows from the permission keys in {@link #MAPPINGS}, e.g. a user who holds
 *       purchase.capital_po:approve acts as APPROVER in Capital PO;</li>
 *   <li>a user may hold several roles at once (approve + receive), and none at all (view only).</li>
 * </ul>
 *
 * The interceptor still checks the exact permission of every write ({@link ActionRules}); the module role is the
 * module's own second gate and decides what the screen offers.
 */
public final class ModuleRoles {

    private ModuleRoles() {}

    public static final String CAPITAL_PO = "capitalPo";
    public static final String SERVICE_PO = "servicePo";
    public static final String JOB_WORK = "jobWork";

    /** Module -> role -> permission keys, any of which grants the role. Order gives the "primary" role recorded in history. */
    static final Map<String, Map<String, List<String>>> MAPPINGS = new LinkedHashMap<>();

    static {
        Map<String, List<String>> capital = new LinkedHashMap<>();
        capital.put("APPROVER", List.of("purchase.capital_po:approve", "purchase.capital_po:reject",
                "purchase.capital_po:issue", "purchase.capital_po:cancel"));
        capital.put("ASSET_MANAGER", List.of("purchase.capital_po:receive"));
        capital.put("RECEIVER", List.of("purchase.capital_po:receive", "purchase.capital_po:inspect"));
        capital.put("CREATOR", List.of("purchase.capital_po:create", "purchase.capital_po:edit", "purchase.capital_po:submit"));
        MAPPINGS.put(CAPITAL_PO, capital);

        Map<String, List<String>> service = new LinkedHashMap<>();
        service.put("APPROVER", List.of("purchase.service_po:approve", "purchase.service_po:reject",
                "purchase.service_po:issue", "purchase.service_po:cancel"));
        service.put("FINANCE", List.of("purchase.service_po:receive"));
        service.put("ACCEPTOR", List.of("purchase.service_po:receive"));
        service.put("CREATOR", List.of("purchase.service_po:create", "purchase.service_po:edit", "purchase.service_po:submit"));
        MAPPINGS.put(SERVICE_PO, service);

        Map<String, List<String>> jobWork = new LinkedHashMap<>();
        // Job-work masters (operations, workers, rate contracts) are approver-level tasks in that module.
        jobWork.put("APPROVER", List.of("purchase.jw_indent:approve", "purchase.jw_indent:reject", "purchase.jw_indent:cancel",
                "purchase.jw_order:approve", "purchase.jw_order:reject", "purchase.jw_order:cancel",
                "purchase.jw_challan:cancel", "purchase.jw_recon:approve", "purchase.jw_recon:reject",
                "purchase.jw_operation:create", "purchase.jw_operation:edit",
                "purchase.jw_worker:create", "purchase.jw_worker:edit"));
        jobWork.put("QUALITY", List.of("purchase.jw_receipt:inspect", "purchase.jw_recon:create"));
        jobWork.put("STORE", List.of("purchase.jw_challan:create", "purchase.jw_receipt:create", "purchase.jw_recon:create"));
        jobWork.put("CREATOR", List.of("purchase.jw_indent:create", "purchase.jw_indent:edit", "purchase.jw_indent:submit",
                "purchase.jw_order:create", "purchase.jw_order:edit", "purchase.jw_order:submit"));
        MAPPINGS.put(JOB_WORK, jobWork);
    }

    /** The roles a user plays in one module. ADMIN for wildcard accounts, otherwise derived from the permission keys. */
    public static Set<String> derive(String module, boolean wildcard, Set<String> permissionKeys) {
        Set<String> roles = new LinkedHashSet<>();
        if (wildcard) {
            roles.add("ADMIN");
            return roles;
        }
        Map<String, List<String>> mapping = MAPPINGS.getOrDefault(module, Map.of());
        mapping.forEach((role, keys) -> {
            for (String k : keys) {
                if (permissionKeys.contains(k)) { roles.add(role); break; }
            }
        });
        return roles;
    }

    /** All modules at once, for the sign-in response (the screens show the user what they may do). */
    public static Map<String, List<String>> all(boolean wildcard, Set<String> permissionKeys) {
        Map<String, List<String>> out = new LinkedHashMap<>();
        for (String module : MAPPINGS.keySet()) out.put(module, List.copyOf(derive(module, wildcard, permissionKeys)));
        return out;
    }

    /** The one role recorded in a document's history: the first in mapping order, or VIEWER with no role at all. */
    public static String primary(Set<String> roles) {
        if (roles.contains("ADMIN")) return "ADMIN";
        for (Map<String, List<String>> mapping : MAPPINGS.values()) {
            for (String role : mapping.keySet()) if (roles.contains(role)) return role;
        }
        return roles.isEmpty() ? "VIEWER" : roles.iterator().next();
    }

    /** A resolved session actor: the signed-in user's name and module roles. */
    public record Resolved(String name, Set<String> roles) {
        public String primaryRole() { return primary(roles); }
    }

    /** The signed-in user as an actor of one module; empty outside a web request (startup, unit tests). */
    public static Optional<Resolved> fromSession(String module) {
        return RequestActor.current().map(u ->
                new Resolved(u.name(), derive(module, u.wildcard(), RequestActor.permissions())));
    }
}
