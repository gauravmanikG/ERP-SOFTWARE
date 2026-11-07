package com.silvermuller.seals.common.docs;

import com.silvermuller.seals.modules.admin.rbac.PermissionCatalog;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Documentation module, live section: facts about the running system that are read from the system itself on every
 * request, so this part of the documentation can never go out of date.
 *
 * GET /api/docs/system returns
 *  - every REST endpoint actually registered in Spring (method, path, controller), grouped by API area,
 *  - every database table with its column count and approximate row count (PostgreSQL statistics),
 *  - the access-control catalog (modules, entities, actions) from {@link PermissionCatalog},
 *  - the one-time data migrations already applied to this database.
 *
 * Read-only. Any signed-in user may call it (GET requests pass the access interceptor once signed in).
 */
@RestController
public class DocsController {

    // Looked up per request, not injected: contexts started without a web layer (some integration tests) have no
    // request-mapping bean, and requiring it at construction would stop those contexts from starting.
    private final ApplicationContext context;
    private final JdbcTemplate jdbc;

    public DocsController(ApplicationContext context, JdbcTemplate jdbc) {
        this.context = context;
        this.jdbc = jdbc;
    }

    @GetMapping("/api/docs/system")
    public Map<String, Object> system() {
        Map<String, Object> out = new LinkedHashMap<>();
        List<Map<String, Object>> endpoints = endpoints();
        List<Map<String, Object>> tables = tables();

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("endpoints", endpoints.size());
        totals.put("controllers", endpoints.stream().map(e -> e.get("controller")).distinct().count());
        totals.put("tables", tables.size());
        totals.put("columns", tables.stream().mapToLong(t -> ((Number) t.get("columns")).longValue()).sum());
        totals.put("permissionEntities", PermissionCatalog.entities().size());
        totals.put("permissionKeys", PermissionCatalog.allKeys().size());

        out.put("generatedAt", java.time.OffsetDateTime.now().toString());
        out.put("totals", totals);
        out.put("endpointGroups", groupEndpoints(endpoints));
        out.put("tables", tables);
        out.put("permissions", permissions());
        out.put("migrations", migrations());
        return out;
    }

    // ------------------------------------------------------------------ API endpoints

    private List<Map<String, Object>> endpoints() {
        List<Map<String, Object>> list = new ArrayList<>();
        RequestMappingHandlerMapping mappings =
                context.getBean("requestMappingHandlerMapping", RequestMappingHandlerMapping.class);
        for (Map.Entry<RequestMappingInfo, HandlerMethod> e : mappings.getHandlerMethods().entrySet()) {
            RequestMappingInfo info = e.getKey();
            HandlerMethod hm = e.getValue();
            Set<String> paths = info.getPatternValues();
            Set<String> methods = new TreeSet<>();
            info.getMethodsCondition().getMethods().forEach(m -> methods.add(m.name()));
            if (methods.isEmpty()) methods.add("ANY");
            for (String path : paths) {
                if (!path.startsWith("/api/")) continue; // skip Spring's /error and the root page
                for (String method : methods) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("method", method);
                    row.put("path", path);
                    row.put("controller", hm.getBeanType().getSimpleName());
                    row.put("handler", hm.getMethod().getName());
                    row.put("area", area(path));
                    list.add(row);
                }
            }
        }
        list.sort(Comparator.comparing((Map<String, Object> r) -> (String) r.get("path"))
                .thenComparing(r -> (String) r.get("method")));
        return list;
    }

    /** "/api/new-po/sourcing/demand" -> "new-po"; "/api/health" -> "health". */
    private static String area(String path) {
        String rest = path.substring("/api/".length());
        int slash = rest.indexOf('/');
        return slash < 0 ? rest : rest.substring(0, slash);
    }

    private static List<Map<String, Object>> groupEndpoints(List<Map<String, Object>> endpoints) {
        Map<String, List<Map<String, Object>>> byArea = new TreeMap<>();
        for (Map<String, Object> e : endpoints) {
            byArea.computeIfAbsent((String) e.get("area"), k -> new ArrayList<>()).add(e);
        }
        List<Map<String, Object>> groups = new ArrayList<>();
        byArea.forEach((area, rows) -> {
            Map<String, Object> g = new LinkedHashMap<>();
            g.put("area", area);
            g.put("count", rows.size());
            g.put("endpoints", rows);
            groups.add(g);
        });
        return groups;
    }

    // ------------------------------------------------------------------ database

    private List<Map<String, Object>> tables() {
        return jdbc.queryForList(
                "SELECT t.table_name AS name, " +
                "       (SELECT COUNT(*) FROM information_schema.columns c " +
                "         WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS columns, " +
                "       COALESCE(s.n_live_tup, 0) AS approx_rows " +
                "FROM information_schema.tables t " +
                "LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.table_schema AND s.relname = t.table_name " +
                "WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE' " +
                "ORDER BY t.table_name");
    }

    private List<Map<String, Object>> migrations() {
        try {
            return jdbc.queryForList(
                    "SELECT migration_id AS id, description, rows_affected AS rows, applied_at AS \"appliedAt\" " +
                    "FROM public.app_data_migration ORDER BY applied_at, migration_id");
        } catch (RuntimeException e) {
            return List.of(); // table not created yet on a brand-new database
        }
    }

    // ------------------------------------------------------------------ access control

    private static List<Map<String, Object>> permissions() {
        Map<String, List<Map<String, Object>>> byModule = new LinkedHashMap<>();
        for (PermissionCatalog.Entity e : PermissionCatalog.entities()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("entity", e.key());
            row.put("label", e.label());
            row.put("kind", e.kind().name());
            row.put("actions", e.actions().stream().map(PermissionCatalog.Action::key).toList());
            byModule.computeIfAbsent(e.module(), k -> new ArrayList<>()).add(row);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        byModule.forEach((module, entities) -> out.add(Map.of("module", module, "entities", entities)));
        return out;
    }
}
