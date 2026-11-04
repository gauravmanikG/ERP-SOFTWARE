package com.silvermuller.seals.modules.admin.rbac;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Resolves a user's effective permissions: the role template, with per-user overrides
 * applied on top. Wildcard roles (Developer, Super Admin) and inactive accounts are
 * handled first. This is the authority a future enforcement layer would call; it does
 * not enforce anything by itself.
 */
@Service
public class PermissionService {

    private final JdbcTemplate jdbc;

    public PermissionService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Role template keys for a user (empty for wildcard roles). */
    public Set<String> roleKeys(long userId) {
        Set<String> keys = new TreeSet<>();
        jdbc.query("SELECT rp.permission_key FROM public.app_user u "
                + "JOIN public.role_permission rp ON rp.role_id = u.role_id WHERE u.id = ?",
                rs -> { keys.add(rs.getString(1)); }, userId);
        return keys;
    }

    /** Per-user overrides: key -> allowed. */
    public Map<String, Boolean> overrides(long userId) {
        Map<String, Boolean> map = new LinkedHashMap<>();
        jdbc.query("SELECT permission_key, allowed FROM public.user_permission WHERE user_id = ?",
                rs -> { map.put(rs.getString("permission_key"), rs.getBoolean("allowed")); }, userId);
        return map;
    }

    private Map<String, Object> userRow(long userId) {
        try {
            return jdbc.queryForMap("SELECT u.status, COALESCE(r.wildcard, FALSE) AS wildcard "
                    + "FROM public.app_user u LEFT JOIN public.app_role r ON r.id = u.role_id WHERE u.id = ?", userId);
        } catch (RuntimeException e) {
            return null;
        }
    }

    public boolean isWildcard(long userId) {
        Map<String, Object> row = userRow(userId);
        return row != null && Boolean.TRUE.equals(row.get("wildcard"));
    }

    /** Effective permission keys. Wildcard -> all keys; inactive -> none. */
    public Set<String> effectiveKeys(long userId) {
        Map<String, Object> row = userRow(userId);
        if (row == null) return Set.of();
        if (!"ACTIVE".equalsIgnoreCase(String.valueOf(row.get("status")))) return Set.of();
        if (Boolean.TRUE.equals(row.get("wildcard"))) return PermissionCatalog.allKeys();

        Set<String> keys = new TreeSet<>(roleKeys(userId));
        overrides(userId).forEach((key, allowed) -> {
            if (allowed) keys.add(key); else keys.remove(key);
        });
        return keys;
    }

    /** Whether the user may perform one operation. */
    public boolean can(long userId, String permissionKey) {
        Map<String, Object> row = userRow(userId);
        if (row == null || !"ACTIVE".equalsIgnoreCase(String.valueOf(row.get("status")))) return false;
        if (Boolean.TRUE.equals(row.get("wildcard"))) return true;
        return effectiveKeys(userId).contains(permissionKey);
    }
}
