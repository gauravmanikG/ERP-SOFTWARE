package com.silvermuller.seals.modules.admin.auth;

import com.silvermuller.seals.modules.admin.security.CurrentUser;
import com.silvermuller.seals.modules.admin.security.PasswordVault;
import com.silvermuller.seals.modules.admin.security.ProfilePhoto;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Login, logout and session resolution. Passwords are verified by pgcrypto
 * (password_hash = crypt(input, password_hash)); plaintext is never read back.
 * Sessions are opaque tokens stored in app_user_session, sent by the client as
 * "Authorization: Bearer <token>".
 */
@Service
public class AuthService {

    private static final SecureRandom RNG = new SecureRandom();
    private static final int SESSION_HOURS = 12;

    private final JdbcTemplate jdbc;
    private final PasswordVault vault;

    public AuthService(JdbcTemplate jdbc, PasswordVault vault) {
        this.jdbc = jdbc;
        this.vault = vault;
    }

    /** Returns a token + user summary on success, or empty on bad credentials / inactive account. */
    @Transactional
    public Optional<Map<String, Object>> login(String email, String password) {
        if (email == null || password == null || email.isBlank() || password.isBlank()) {
            return Optional.empty();
        }
        Map<String, Object> user;
        try {
            user = jdbc.queryForMap(
                    "SELECT u.id, u.name, u.email, u.must_change_password, "
                            + "       r.code AS role_code, r.name AS role_name, COALESCE(r.wildcard, FALSE) AS wildcard "
                            + "FROM public.app_user u LEFT JOIN public.app_role r ON r.id = u.role_id "
                            + "WHERE lower(u.email) = lower(?) AND u.status = 'ACTIVE' "
                            + "      AND u.password_hash = crypt(?, u.password_hash)",
                    email.trim(), password);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }

        long userId = ((Number) user.get("id")).longValue();
        String token = HexFormat.of().formatHex(randomBytes());
        jdbc.update("INSERT INTO public.app_user_session (token, user_id, expires_at) "
                + "VALUES (?, ?, now() + (? || ' hours')::interval)", token, userId, SESSION_HOURS);
        jdbc.update("UPDATE public.app_user SET last_login_at = now() WHERE id = ?", userId);
        jdbc.update("INSERT INTO public.permission_audit (actor_user_id, actor_name, target_user_id, target_name, action) "
                + "VALUES (?, ?, ?, ?, 'LOGIN')", userId, user.get("name"), userId, user.get("name"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("token", token);
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", userId);
        u.put("name", user.get("name"));
        u.put("email", user.get("email"));
        u.put("roleCode", user.get("role_code"));
        u.put("roleName", user.get("role_name"));
        u.put("wildcard", user.get("wildcard"));
        u.put("mustChangePassword", user.get("must_change_password"));
        out.put("user", u);
        return Optional.of(out);
    }

    /** Resolves the caller from a raw Authorization header value ("Bearer <token>") or a bare token. */
    public Optional<CurrentUser> resolve(String authorizationHeader) {
        String token = stripBearer(authorizationHeader);
        if (token == null) return Optional.empty();
        try {
            Map<String, Object> row = jdbc.queryForMap(
                    "SELECT u.id, u.name, u.email, u.status, u.must_change_password, r.code AS role_code, "
                            + "r.name AS role_name, COALESCE(r.wildcard, FALSE) AS wildcard "
                            + "FROM public.app_user_session s JOIN public.app_user u ON u.id = s.user_id "
                            + "LEFT JOIN public.app_role r ON r.id = u.role_id "
                            + "WHERE s.token = ? AND s.expires_at > now()", token);
            return Optional.of(new CurrentUser(
                    ((Number) row.get("id")).longValue(),
                    (String) row.get("name"),
                    (String) row.get("email"),
                    (String) row.get("role_code"),
                    (String) row.get("role_name"),
                    Boolean.TRUE.equals(row.get("wildcard")),
                    (String) row.get("status"),
                    Boolean.TRUE.equals(row.get("must_change_password"))));
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Transactional
    public void logout(String authorizationHeader) {
        String token = stripBearer(authorizationHeader);
        if (token != null) {
            jdbc.update("DELETE FROM public.app_user_session WHERE token = ?", token);
        }
    }

    /** Changes the caller's own password and clears the must-change flag. */
    @Transactional
    public boolean changePassword(long userId, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) return false;
        Integer ok = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.app_user WHERE id = ? AND password_hash = crypt(?, password_hash)",
                Integer.class, userId, currentPassword);
        if (ok == null || ok == 0) return false;
        jdbc.update("UPDATE public.app_user SET password_hash = crypt(?, gen_salt('bf')), "
                + "must_change_password = FALSE, updated_at = now() WHERE id = ?", newPassword, userId);
        vault.store(userId, newPassword);
        return true;
    }

    /** The user's profile picture as a data URL, or null. Kept out of resolve(), which runs on every request. */
    public String photoOf(long userId) {
        return jdbc.query("SELECT photo FROM public.app_user WHERE id = ?",
                rs -> rs.next() ? rs.getString(1) : null, userId);
    }

    /** Sets (or clears, when null/blank) a user's own profile picture. */
    @Transactional
    public void updatePhoto(long userId, String photo) {
        jdbc.update("UPDATE public.app_user SET photo = ?, updated_at = now() WHERE id = ?",
                ProfilePhoto.validated(photo), userId);
    }

    private static String stripBearer(String header) {
        if (header == null || header.isBlank()) return null;
        String h = header.trim();
        if (h.regionMatches(true, 0, "Bearer ", 0, 7)) h = h.substring(7).trim();
        return h.isEmpty() ? null : h;
    }

    private static byte[] randomBytes() {
        byte[] b = new byte[32];
        RNG.nextBytes(b);
        return b;
    }
}
