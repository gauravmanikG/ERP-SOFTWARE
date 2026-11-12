package com.silvermuller.seals.modules.admin.auth;

import com.silvermuller.seals.modules.admin.rbac.PermissionService;
import com.silvermuller.seals.modules.admin.security.CurrentUser;
import com.silvermuller.seals.modules.admin.security.ModuleRoles;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final PermissionService permissions;

    public AuthController(AuthService auth, PermissionService permissions) {
        this.auth = auth;
        this.permissions = permissions;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        return auth.login(body.get("email"), body.get("password"))
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Invalid email or password, or the account is inactive.")));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authz) {
        Optional<CurrentUser> u = auth.resolve(authz);
        if (u.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not signed in."));
        }
        CurrentUser c = u.get();
        Map<String, Object> body = new HashMap<>();
        body.put("id", c.id());
        body.put("name", c.name());
        body.put("email", c.email());
        body.put("roleCode", c.roleCode() == null ? "" : c.roleCode());
        body.put("roleName", c.roleName() == null ? "" : c.roleName());
        body.put("wildcard", c.wildcard());
        body.put("mustChangePassword", c.mustChangePassword());
        body.put("photo", auth.photoOf(c.id()));
        // effective permission keys, used by the browser to show only the screens this user may open
        java.util.Set<String> keys = permissions.effectiveKeys(c.id());
        body.put("permissions", new ArrayList<>(keys));
        // the role this user plays inside Capital PO, Service PO and Job Work (derived on the server, see ModuleRoles)
        body.put("moduleRoles", ModuleRoles.all(c.wildcard(), keys));
        return ResponseEntity.ok(body);
    }

    /** Any signed-in user may set or remove their own profile picture ({"photo": dataUrl | null}). */
    @PutMapping("/me/photo")
    public ResponseEntity<?> updateMyPhoto(@RequestHeader(value = "Authorization", required = false) String authz,
                                           @RequestBody Map<String, String> body) {
        Optional<CurrentUser> u = auth.resolve(authz);
        if (u.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not signed in."));
        }
        auth.updatePhoto(u.get().id(), body.get("photo"));
        Map<String, Object> out = new HashMap<>();
        out.put("photo", auth.photoOf(u.get().id()));
        return ResponseEntity.ok(out);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authz) {
        auth.logout(authz);
        return ResponseEntity.ok(Map.of("message", "Signed out."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestHeader(value = "Authorization", required = false) String authz,
                                            @RequestBody Map<String, String> body) {
        Optional<CurrentUser> u = auth.resolve(authz);
        if (u.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not signed in."));
        }
        boolean ok = auth.changePassword(u.get().id(), body.get("currentPassword"), body.get("newPassword"));
        if (!ok) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Current password is wrong, or the new password is shorter than 8 characters."));
        }
        return ResponseEntity.ok(Map.of("message", "Password changed."));
    }
}
