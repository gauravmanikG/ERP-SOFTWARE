package com.silvermuller.seals.modules.admin.role;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Role master: plain create / edit / delete of roles that are used only as a label on a
 * user. Roles here carry no permissions and are not tied to the RBAC grid — access is
 * granted per user on the Access screen. The two built-in roles (Super Admin, Developer)
 * are system roles and cannot be edited or deleted from here.
 *
 * This is an ordinary request-scoped service (not a startup hook), so its INSERT/DELETE
 * statements run only when an admin acts, never at application startup.
 */
@Service
public class RoleService {

    private final JdbcTemplate jdbc;

    public RoleService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** All roles, built-in ones first, each with the number of users currently assigned. */
    public List<Map<String, Object>> list() {
        return jdbc.queryForList(
                "SELECT r.id, r.code, r.name, r.description, r.is_system, r.wildcard, "
                        + "(SELECT COUNT(*) FROM public.app_user u WHERE u.role_id = r.id) AS user_count "
                        + "FROM public.app_role r ORDER BY r.is_system DESC, r.name");
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        String name = str(body, "name");
        if (name.isBlank()) throw new IllegalArgumentException("Role name is required.");
        if (nameTaken(name, -1)) throw new IllegalArgumentException("A role named '" + name + "' already exists.");
        String description = str(body, "description");
        String code = uniqueCode(name);
        try {
            jdbc.update("INSERT INTO public.app_role (code, name, description, is_system, wildcard) "
                            + "VALUES (?, ?, ?, FALSE, FALSE)",
                    code, name, description.isBlank() ? null : description);
        } catch (DuplicateKeyException e) {
            throw new IllegalArgumentException("A role named '" + name + "' already exists.");
        }
        return byCode(code);
    }

    @Transactional
    public Map<String, Object> update(long id, Map<String, Object> body) {
        Map<String, Object> role = role(id);
        if (Boolean.TRUE.equals(role.get("is_system"))) {
            throw new IllegalArgumentException("Built-in roles (Super Admin, Developer) cannot be edited.");
        }
        String name = str(body, "name");
        if (name.isBlank()) throw new IllegalArgumentException("Role name is required.");
        if (nameTaken(name, id)) throw new IllegalArgumentException("Another role named '" + name + "' already exists.");
        String description = str(body, "description");
        jdbc.update("UPDATE public.app_role SET name = ?, description = ? WHERE id = ?",
                name, description.isBlank() ? null : description, id);
        return role(id);
    }

    @Transactional
    public void delete(long id) {
        Map<String, Object> role = role(id);
        if (Boolean.TRUE.equals(role.get("is_system"))) {
            throw new IllegalArgumentException("Built-in roles (Super Admin, Developer) cannot be deleted.");
        }
        Integer inUse = jdbc.queryForObject("SELECT COUNT(*) FROM public.app_user WHERE role_id = ?", Integer.class, id);
        if (inUse != null && inUse > 0) {
            throw new IllegalArgumentException("This role is assigned to " + inUse + " user"
                    + (inUse == 1 ? "" : "s") + ". Reassign them to another role before deleting it.");
        }
        jdbc.update("DELETE FROM public.app_role WHERE id = ?", id); // any role_permission rows cascade
    }

    private Map<String, Object> role(long id) {
        try {
            return jdbc.queryForMap(
                    "SELECT id, code, name, description, is_system, wildcard FROM public.app_role WHERE id = ?", id);
        } catch (EmptyResultDataAccessException e) {
            throw new IllegalArgumentException("Role not found.");
        }
    }

    private Map<String, Object> byCode(String code) {
        return jdbc.queryForMap(
                "SELECT id, code, name, description, is_system, wildcard FROM public.app_role WHERE code = ?", code);
    }

    /** Whether another role already uses this display name (case-insensitive); excludeId is skipped. */
    private boolean nameTaken(String name, long excludeId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM public.app_role WHERE lower(name) = lower(?) AND id <> ?)",
                Boolean.class, name, excludeId));
    }

    /** Builds a stable, unique code from a display name, e.g. "Site Engineer" -> "site_engineer". */
    private String uniqueCode(String name) {
        String base = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (base.isBlank()) base = "role";
        if (base.length() > 46) base = base.substring(0, 46);
        String code = base;
        int n = 2;
        while (Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM public.app_role WHERE code = ?)", Boolean.class, code))) {
            code = base + "_" + n++;
        }
        return code;
    }

    private static String str(Map<String, Object> m, String k) {
        Object v = m.get(k);
        return v == null ? "" : v.toString().trim();
    }
}
