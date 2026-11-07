package com.silvermuller.seals.modules.admin.user;

import com.silvermuller.seals.modules.admin.security.CurrentUser;
import com.silvermuller.seals.modules.admin.security.PasswordVault;
import com.silvermuller.seals.modules.admin.security.ProfilePhoto;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** CRUD for ERP users. Passwords are hashed with pgcrypto; changes are written to permission_audit. */
@Service
public class UserService {

    private final JdbcTemplate jdbc;
    private final PasswordVault vault;

    public UserService(JdbcTemplate jdbc, PasswordVault vault) {
        this.jdbc = jdbc;
        this.vault = vault;
    }

    private static final String SELECT = "SELECT u.id, u.name, u.email, u.status, u.department, u.designation, "
            + "u.employee_id, u.phone, u.approval_limit, u.must_change_password, u.created_at, u.last_login_at, "
            + "u.photo, (u.password_enc IS NOT NULL) AS password_viewable, "
            + "u.role_id, r.code AS role_code, r.name AS role_name, COALESCE(r.wildcard, FALSE) AS wildcard "
            + "FROM public.app_user u LEFT JOIN public.app_role r ON r.id = u.role_id ";

    public List<Map<String, Object>> list() {
        return jdbc.queryForList(SELECT + "ORDER BY u.name");
    }

    public Map<String, Object> get(long id) {
        return jdbc.queryForMap(SELECT + "WHERE u.id = ?", id);
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, CurrentUser actor) {
        String name = str(body, "name");
        String email = str(body, "email");
        String password = str(body, "password");
        if (name.isBlank() || email.isBlank()) throw new IllegalArgumentException("Name and email are required.");
        requireCompanyEmail(email);
        if (password.length() < 8) throw new IllegalArgumentException("Password must be at least 8 characters.");
        requireUniqueName(name, null);

        Long roleId = num(body, "roleId");
        try {
            jdbc.update("INSERT INTO public.app_user (name, email, password_hash, role_id, status, department, "
                    + "designation, employee_id, phone, approval_limit, must_change_password, photo) "
                    + "VALUES (?, ?, crypt(?, gen_salt('bf')), ?, ?, ?, ?, ?, ?, ?, TRUE, ?)",
                    name, email.trim().toLowerCase(), password, roleId,
                    statusOr(body, "ACTIVE"), str(body, "department"), str(body, "designation"),
                    str(body, "employeeId"), str(body, "phone"), decimal(body, "approvalLimit"),
                    ProfilePhoto.validated(rawStr(body, "photo")));
        } catch (DuplicateKeyException e) {
            throw duplicate(e, name, "A user with email '" + email + "' already exists.");
        }
        Long id = jdbc.queryForObject("SELECT id FROM public.app_user WHERE lower(email) = lower(?)", Long.class, email.trim());
        vault.store(id, password);
        audit(actor, id, name, "USER_CREATED", "Role id: " + roleId);
        return get(id);
    }

    @Transactional
    public Map<String, Object> update(long id, Map<String, Object> body, CurrentUser actor) {
        String name = str(body, "name");
        String email = str(body, "email");
        if (name.isBlank() || email.isBlank()) throw new IllegalArgumentException("Name and email are required.");
        requireCompanyEmail(email);
        requireUniqueName(name, id);
        try {
            jdbc.update("UPDATE public.app_user SET name = ?, email = ?, role_id = ?, status = ?, department = ?, "
                    + "designation = ?, employee_id = ?, phone = ?, approval_limit = ?, updated_at = now() WHERE id = ?",
                    name, email.trim().toLowerCase(), num(body, "roleId"), statusOr(body, "ACTIVE"),
                    str(body, "department"), str(body, "designation"), str(body, "employeeId"),
                    str(body, "phone"), decimal(body, "approvalLimit"), id);
        } catch (DuplicateKeyException e) {
            throw duplicate(e, name, "Another user already uses email '" + email + "'.");
        }
        if (body.containsKey("photo")) { // absent = keep the current picture; null/"" = remove it
            jdbc.update("UPDATE public.app_user SET photo = ? WHERE id = ?",
                    ProfilePhoto.validated(rawStr(body, "photo")), id);
        }
        audit(actor, id, name, "USER_UPDATED", null);
        return get(id);
    }

    @Transactional
    public Map<String, Object> setStatus(long id, String status, CurrentUser actor) {
        String s = "INACTIVE".equalsIgnoreCase(status) ? "INACTIVE" : "ACTIVE";
        jdbc.update("UPDATE public.app_user SET status = ?, updated_at = now() WHERE id = ?", s, id);
        if ("INACTIVE".equals(s)) {
            // ending a user's access also ends their live sessions
            jdbc.update("DELETE FROM public.app_user_session WHERE user_id = ?", id);
        }
        audit(actor, id, null, "STATUS_CHANGED", "-> " + s);
        return get(id);
    }

    @Transactional
    public void resetPassword(long id, String newPassword, CurrentUser actor) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
        jdbc.update("UPDATE public.app_user SET password_hash = crypt(?, gen_salt('bf')), "
                + "must_change_password = TRUE, updated_at = now() WHERE id = ?", newPassword, id);
        jdbc.update("DELETE FROM public.app_user_session WHERE user_id = ?", id);
        vault.store(id, newPassword);
        audit(actor, id, null, "PASSWORD_RESET", null);
    }

    /**
     * Permanently removes a user. Sessions and per-user permissions cascade; the audit log keeps the record.
     * Guards: you cannot delete yourself, and the last active Super Admin cannot be removed.
     */
    @Transactional
    public void delete(long id, CurrentUser actor) {
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM public.app_user WHERE id = ?", Integer.class, id);
        if (exists == null || exists == 0) {
            throw new com.silvermuller.seals.common.exception.ResourceNotFoundException("User not found.");
        }
        Map<String, Object> target = get(id);
        if (actor != null && actor.id() == id) {
            throw new IllegalArgumentException("You cannot delete your own account.");
        }
        if ("super_admin".equals(target.get("role_code"))) {
            Integer activeSuperAdmins = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM public.app_user u JOIN public.app_role r ON r.id = u.role_id "
                            + "WHERE r.code = 'super_admin' AND u.status = 'ACTIVE' AND u.id <> ?", Integer.class, id);
            if (activeSuperAdmins == null || activeSuperAdmins == 0) {
                throw new IllegalArgumentException("This is the last active Super Admin; it cannot be deleted.");
            }
        }
        audit(actor, id, String.valueOf(target.get("name")), "USER_DELETED", "Email: " + target.get("email"));
        jdbc.update("DELETE FROM public.app_user WHERE id = ?", id);
    }

    /** Super Admin / Developer only (checked by the controller): the user's current password, with every view audited. */
    @Transactional
    public Map<String, Object> revealPassword(long id, CurrentUser actor) {
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM public.app_user WHERE id = ?", Integer.class, id);
        if (exists == null || exists == 0) {
            throw new com.silvermuller.seals.common.exception.ResourceNotFoundException("User not found.");
        }
        Map<String, Object> out = new java.util.HashMap<>();
        if (!vault.enabled()) {
            out.put("password", null);
            out.put("reason", "Password viewing is not configured on the server (APP_PASSWORD_VIEW_KEY is not set).");
            return out;
        }
        String pwd = vault.reveal(id);
        out.put("password", pwd);
        if (pwd == null) {
            out.put("reason", "This password was set before password viewing existed. Reset it (or have the user change it) "
                    + "and it becomes viewable.");
        } else {
            audit(actor, id, null, "PASSWORD_VIEWED", null);
        }
        return out;
    }

    private void audit(CurrentUser actor, Long targetId, String targetName, String action, String detail) {
        jdbc.update("INSERT INTO public.permission_audit (actor_user_id, actor_name, target_user_id, target_name, action, detail) "
                + "VALUES (?, ?, ?, ?, ?, ?)",
                actor == null ? null : actor.id(), actor == null ? "system" : actor.name(),
                targetId, targetName, action, detail);
    }

    /** User names are unique (case-insensitive) because the activity trail records each step under the name. */
    private void requireUniqueName(String name, Long excludeId) {
        Boolean taken = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM public.app_user WHERE lower(btrim(name)) = lower(btrim(?)) "
                + "AND (?::bigint IS NULL OR id <> ?::bigint))", Boolean.class, name, excludeId, excludeId);
        if (Boolean.TRUE.equals(taken)) {
            throw new IllegalArgumentException("Another user is already named '" + name + "'. User names must be unique.");
        }
    }

    /** A save that raced past requireUniqueName hits uq_app_user_name_ci; any other duplicate is the email. */
    private static IllegalArgumentException duplicate(DuplicateKeyException e, String name, String emailMessage) {
        String msg = String.valueOf(e.getMostSpecificCause().getMessage());
        return new IllegalArgumentException(msg.contains("uq_app_user_name_ci")
                ? "Another user is already named '" + name + "'. User names must be unique." : emailMessage);
    }

    private static String str(Map<String, Object> m, String k) {
        Object v = m.get(k);
        return v == null ? "" : v.toString().trim();
    }

    /** Company login ids: a simple local part, then exactly @silverseals.com (case-insensitive). */
    private static final java.util.regex.Pattern COMPANY_EMAIL =
            java.util.regex.Pattern.compile("^[a-z0-9._-]+@silverseals\\.com$", java.util.regex.Pattern.CASE_INSENSITIVE);

    static void requireCompanyEmail(String email) {
        if (email == null || !COMPANY_EMAIL.matcher(email.trim()).matches()) {
            throw new IllegalArgumentException("Email must end with @silverseals.com (for example developer@silverseals.com).");
        }
    }

    private static String rawStr(Map<String, Object> m, String k) {
        Object v = m.get(k);
        return v == null ? null : v.toString();
    }

    private static String statusOr(Map<String, Object> m, String def) {
        String s = str(m, "status");
        return s.isBlank() ? def : s.toUpperCase();
    }

    private static Long num(Map<String, Object> m, String k) {
        Object v = m.get(k);
        if (v == null || v.toString().isBlank()) return null;
        return Long.valueOf(v.toString().trim());
    }

    private static BigDecimal decimal(Map<String, Object> m, String k) {
        Object v = m.get(k);
        if (v == null || v.toString().isBlank()) return null;
        try { return new BigDecimal(v.toString().trim()); } catch (NumberFormatException e) { return null; }
    }
}
