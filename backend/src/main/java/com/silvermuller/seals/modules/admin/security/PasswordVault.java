package com.silvermuller.seals.modules.admin.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Keeps a reversible copy of each newly set password so a Super Admin can view it
 * (requested by the client). The copy is pgcrypto pgp_sym_encrypt'ed with
 * APP_PASSWORD_VIEW_KEY; login never uses it — it still verifies the bcrypt hash only.
 * With no key configured the feature is off: nothing is stored and nothing can be shown.
 */
@Component
public class PasswordVault {

    private final JdbcTemplate jdbc;
    private final String key;

    public PasswordVault(JdbcTemplate jdbc, @Value("${app.security.password-view-key:}") String key) {
        this.jdbc = jdbc;
        this.key = key == null ? "" : key.trim();
    }

    public boolean enabled() {
        return !key.isEmpty();
    }

    /** Stores the encrypted copy for a user (or clears it when the feature is off). */
    public void store(long userId, String plainPassword) {
        if (enabled()) {
            jdbc.update("UPDATE public.app_user SET password_enc = pgp_sym_encrypt(?, ?) WHERE id = ?",
                    plainPassword, key, userId);
        } else {
            jdbc.update("UPDATE public.app_user SET password_enc = NULL WHERE id = ?", userId);
        }
    }

    /** The current password, or null when no viewable copy exists (set before the feature, or key missing). */
    public String reveal(long userId) {
        if (!enabled()) return null;
        return jdbc.query("SELECT CASE WHEN password_enc IS NULL THEN NULL ELSE pgp_sym_decrypt(password_enc, ?) END "
                        + "FROM public.app_user WHERE id = ?",
                rs -> rs.next() ? rs.getString(1) : null, key, userId);
    }
}
