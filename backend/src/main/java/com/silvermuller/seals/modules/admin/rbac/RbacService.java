package com.silvermuller.seals.modules.admin.rbac;

import com.silvermuller.seals.modules.admin.security.CurrentUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Serves the RBAC grid and reads/writes per-user permissions as overrides on the role template. */
@Service
public class RbacService {

    private final JdbcTemplate jdbc;
    private final PermissionService permissions;

    public RbacService(JdbcTemplate jdbc, PermissionService permissions) {
        this.jdbc = jdbc;
        this.permissions = permissions;
    }

    public List<Map<String, Object>> roles() {
        return jdbc.queryForList("SELECT id, code, name, description, is_system, wildcard FROM public.app_role ORDER BY id");
    }

    /** The grid structure (columns + modules/entities) plus the list of roles. */
    public Map<String, Object> catalog() {
        Map<String, Object> out = new LinkedHashMap<>(PermissionCatalog.gridModel().get(0));
        out.put("roles", roles());
        return out;
    }

    /** A user's permissions: role template, overrides and the resulting effective set. */
    public Map<String, Object> userPermissions(long userId) {
        Map<String, Object> user = jdbc.queryForMap(
                "SELECT u.id, u.name, u.email, u.status, r.code AS role_code, r.name AS role_name, "
                        + "COALESCE(r.wildcard, FALSE) AS wildcard "
                        + "FROM public.app_user u LEFT JOIN public.app_role r ON r.id = u.role_id WHERE u.id = ?", userId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", user);
        out.put("wildcard", user.get("wildcard"));
        out.put("roleKeys", new ArrayList<>(permissions.roleKeys(userId)));
        out.put("overrides", permissions.overrides(userId));
        out.put("effective", new ArrayList<>(permissions.effectiveKeys(userId)));
        return out;
    }

    /**
     * Saves the desired effective permissions for a user. Stores only the differences
     * from the role template as overrides, so later changes to the role still flow
     * through. Wildcard users are not editable and are left untouched.
     */
    @Transactional
    public Map<String, Object> savePermissions(long userId, Map<String, Object> desired, CurrentUser actor) {
        if (permissions.isWildcard(userId)) {
            return userPermissions(userId); // full-access roles are not editable here
        }
        Set<String> roleTemplate = permissions.roleKeys(userId);
        Set<String> allKeys = PermissionCatalog.allKeys();

        jdbc.update("DELETE FROM public.user_permission WHERE user_id = ?", userId);
        int overrides = 0;
        for (String key : allKeys) {
            boolean want = Boolean.TRUE.equals(desired.get(key));
            boolean inRole = roleTemplate.contains(key);
            if (want != inRole) {
                jdbc.update("INSERT INTO public.user_permission (user_id, permission_key, allowed) VALUES (?, ?, ?)",
                        userId, key, want);
                overrides++;
            }
        }
        jdbc.update("INSERT INTO public.permission_audit (actor_user_id, actor_name, target_user_id, action, detail) "
                        + "VALUES (?, ?, ?, 'PERMISSIONS_SAVED', ?)",
                actor == null ? null : actor.id(), actor == null ? "system" : actor.name(), userId,
                overrides + " override(s) from role template");
        return userPermissions(userId);
    }
}
