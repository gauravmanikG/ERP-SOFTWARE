package com.silvermuller.seals.modules.admin.rbac;

import com.silvermuller.seals.modules.admin.security.AdminGuard;
import com.silvermuller.seals.modules.admin.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/rbac")
public class RbacController {

    private static final String VIEW = "settings.rbac_admin:view";
    private static final String ASSIGN = "settings.rbac_admin:assign";

    private final RbacService rbac;
    private final AdminGuard guard;

    public RbacController(RbacService rbac, AdminGuard guard) {
        this.rbac = rbac;
        this.guard = guard;
    }

    @GetMapping("/catalog")
    public ResponseEntity<Map<String, Object>> catalog(@RequestHeader(value = "Authorization", required = false) String authz) {
        guard.require(authz, VIEW);
        return ResponseEntity.ok(rbac.catalog());
    }

    @GetMapping("/roles")
    public ResponseEntity<List<Map<String, Object>>> roles(@RequestHeader(value = "Authorization", required = false) String authz) {
        guard.require(authz, VIEW);
        return ResponseEntity.ok(rbac.roles());
    }

    @GetMapping("/users/{id}/permissions")
    public ResponseEntity<Map<String, Object>> userPermissions(
            @RequestHeader(value = "Authorization", required = false) String authz, @PathVariable long id) {
        guard.require(authz, VIEW);
        return ResponseEntity.ok(rbac.userPermissions(id));
    }

    @PutMapping("/users/{id}/permissions")
    public ResponseEntity<Map<String, Object>> savePermissions(
            @RequestHeader(value = "Authorization", required = false) String authz,
            @PathVariable long id, @RequestBody Map<String, Object> body) {
        CurrentUser actor = guard.require(authz, ASSIGN);
        @SuppressWarnings("unchecked")
        Map<String, Object> permissions = (Map<String, Object>) body.getOrDefault("permissions", Map.of());
        return ResponseEntity.ok(rbac.savePermissions(id, permissions, actor));
    }
}
