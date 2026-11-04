package com.silvermuller.seals.modules.admin;

import com.silvermuller.seals.common.config.SeedRegistry;
import com.silvermuller.seals.modules.admin.rbac.PermissionCatalog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

/**
 * Seeds the two built-in full-access roles and their bootstrap accounts (Super Admin,
 * Developer) the first time this database is set up. Other roles are created by the
 * client in the Role Master and carry no permission template.
 *
 * Idempotent and once-only: the whole block runs through SeedRegistry.seedOnce, so a
 * role the client later edits or a user they delete is never silently re-created on a
 * later start. Only INSERTs are issued (ON CONFLICT DO NOTHING); nothing is updated or
 * deleted at startup. See docs/startup-data-rules.md and StartupSafetyGuardTest.
 */
@Configuration
public class AdminSeeder {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    /** One-time default password for the bootstrap accounts; both are flagged must_change_password. */
    static final String BOOTSTRAP_PASSWORD = "ChangeMe@123";

    record RoleDef(String code, String name, boolean wildcard, String description) {}

    // Only the two built-in full-access roles are seeded. All other roles are created by
    // the client in the Role Master (Settings -> Users -> Manage Roles); they are plain
    // labels and carry no permission template.
    static final List<RoleDef> ROLES = List.of(
            new RoleDef("super_admin", "Super Admin", true,
                    "Business owner with unrestricted access. Pre-set to full access; not edited on the Access screen."),
            new RoleDef("developer", "Developer", true,
                    "Technical administrator with full access for support and maintenance."));

    @Bean
    CommandLineRunner seedAdminRbac(JdbcTemplate jdbc, SeedRegistry seedRegistry) {
        return args -> seedRegistry.seedOnce("admin-rbac-bootstrap-v1", () -> seed(jdbc));
    }

    private void seed(JdbcTemplate jdbc) {
        for (RoleDef r : ROLES) {
            // seed-policy: once built-in roles the RBAC screen starts from; seeded once per database
            jdbc.update("INSERT INTO public.app_role (code, name, description, is_system, wildcard) "
                    + "VALUES (?, ?, ?, TRUE, ?) ON CONFLICT (code) DO NOTHING",
                    r.code(), r.name(), r.description(), r.wildcard());

            Long roleId = jdbc.queryForObject("SELECT id FROM public.app_role WHERE code = ?", Long.class, r.code());
            if (roleId == null || r.wildcard()) {
                continue; // wildcard roles need no stored template; resolver grants everything
            }
            for (String key : PermissionCatalog.defaultKeysForRole(r.code())) {
                // seed-policy: once default role permission template; seeded once per database
                jdbc.update("INSERT INTO public.role_permission (role_id, permission_key) "
                        + "VALUES (?, ?) ON CONFLICT (role_id, permission_key) DO NOTHING", roleId, key);
            }
        }

        bootstrapUser(jdbc, "Super Admin", "superadmin@silverseals.com", "super_admin");
        bootstrapUser(jdbc, "Developer", "developer@silverseals.com", "developer");
        log.info("Admin/RBAC bootstrap complete: {} roles, bootstrap users seeded (temp password must be changed).",
                ROLES.size());
    }

    private void bootstrapUser(JdbcTemplate jdbc, String name, String email, String roleCode) {
        Long roleId = jdbc.queryForObject("SELECT id FROM public.app_role WHERE code = ?", Long.class, roleCode);
        // seed-policy: once bootstrap login accounts; password is a bcrypt hash, seeded once per database
        jdbc.update("INSERT INTO public.app_user (name, email, password_hash, role_id, status, must_change_password) "
                + "VALUES (?, ?, crypt(?, gen_salt('bf')), ?, 'ACTIVE', TRUE) ON CONFLICT (email) DO NOTHING",
                name, email, BOOTSTRAP_PASSWORD, roleId);
    }
}
