package com.silvermuller.seals.modules.admin.user;

import com.silvermuller.seals.modules.admin.security.AdminGuard;
import com.silvermuller.seals.modules.admin.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class UserController {

    private static final String VIEW = "settings.user_admin:view";
    private static final String CREATE = "settings.user_admin:create";
    private static final String EDIT = "settings.user_admin:edit";
    private static final String DEACTIVATE = "settings.user_admin:deactivate";
    private static final String RESET = "settings.user_admin:reset_password";

    private final UserService users;
    private final AdminGuard guard;

    public UserController(UserService users, AdminGuard guard) {
        this.users = users;
        this.guard = guard;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestHeader(value = "Authorization", required = false) String authz) {
        guard.require(authz, VIEW);
        return ResponseEntity.ok(users.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@RequestHeader(value = "Authorization", required = false) String authz,
                                                    @PathVariable long id) {
        guard.require(authz, VIEW);
        return ResponseEntity.ok(users.get(id));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestHeader(value = "Authorization", required = false) String authz,
                                                       @RequestBody Map<String, Object> body) {
        CurrentUser actor = guard.require(authz, CREATE);
        return ResponseEntity.status(HttpStatus.CREATED).body(users.create(body, actor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@RequestHeader(value = "Authorization", required = false) String authz,
                                                       @PathVariable long id, @RequestBody Map<String, Object> body) {
        CurrentUser actor = guard.require(authz, EDIT);
        return ResponseEntity.ok(users.update(id, body, actor));
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> setStatus(@RequestHeader(value = "Authorization", required = false) String authz,
                                                          @PathVariable long id, @RequestBody Map<String, String> body) {
        CurrentUser actor = guard.require(authz, DEACTIVATE);
        return ResponseEntity.ok(users.setStatus(id, body.get("status"), actor));
    }

    /** Roles allowed to see a user's current password, and to delete users. */
    private static final java.util.Set<String> PASSWORD_VIEWERS = java.util.Set.of("super_admin", "developer");
    private static final java.util.Set<String> DELETERS = java.util.Set.of("super_admin", "developer");

    /** Permanently deletes a user (Super Admin or Developer only). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@RequestHeader(value = "Authorization", required = false) String authz,
                                                      @PathVariable long id) {
        CurrentUser actor = guard.require(authz);
        if (!actor.isActive() || !DELETERS.contains(actor.roleCode())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Super Admin or Developer can delete users.");
        }
        users.delete(id, actor);
        return ResponseEntity.ok(Map.of("message", "User deleted."));
    }

    /** Only Super Admin and Developer may see a user's current password; each view is written to permission_audit. */
    @GetMapping("/{id}/password")
    public ResponseEntity<Map<String, Object>> viewPassword(@RequestHeader(value = "Authorization", required = false) String authz,
                                                            @PathVariable long id) {
        CurrentUser actor = guard.require(authz);
        if (!actor.isActive() || !PASSWORD_VIEWERS.contains(actor.roleCode())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Super Admin or Developer can view passwords.");
        }
        return ResponseEntity.ok(users.revealPassword(id, actor));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestHeader(value = "Authorization", required = false) String authz,
                                                              @PathVariable long id, @RequestBody Map<String, String> body) {
        CurrentUser actor = guard.require(authz, RESET);
        users.resetPassword(id, body.get("newPassword"), actor);
        return ResponseEntity.ok(Map.of("message", "Password reset. The user must change it at next sign-in."));
    }
}
