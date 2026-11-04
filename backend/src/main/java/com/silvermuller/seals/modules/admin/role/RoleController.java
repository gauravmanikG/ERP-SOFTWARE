package com.silvermuller.seals.modules.admin.role;

import com.silvermuller.seals.modules.admin.security.AdminGuard;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Role master CRUD, used by the Users screen. Roles are labels only; they do not grant
 * permissions, so these endpoints are guarded with the existing user-admin permission keys.
 */
@RestController
@RequestMapping("/api/admin/roles")
public class RoleController {

    private static final String VIEW = "settings.user_admin:view";
    private static final String CREATE = "settings.user_admin:create";
    private static final String EDIT = "settings.user_admin:edit";

    private final RoleService roles;
    private final AdminGuard guard;

    public RoleController(RoleService roles, AdminGuard guard) {
        this.roles = roles;
        this.guard = guard;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestHeader(value = "Authorization", required = false) String authz) {
        guard.require(authz, VIEW);
        return ResponseEntity.ok(roles.list());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @RequestHeader(value = "Authorization", required = false) String authz,
            @RequestBody Map<String, Object> body) {
        guard.require(authz, CREATE);
        return ResponseEntity.status(HttpStatus.CREATED).body(roles.create(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(
            @RequestHeader(value = "Authorization", required = false) String authz,
            @PathVariable long id, @RequestBody Map<String, Object> body) {
        guard.require(authz, EDIT);
        return ResponseEntity.ok(roles.update(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader(value = "Authorization", required = false) String authz,
            @PathVariable long id) {
        guard.require(authz, EDIT);
        roles.delete(id);
        return ResponseEntity.ok(Map.of("message", "Role deleted."));
    }
}
