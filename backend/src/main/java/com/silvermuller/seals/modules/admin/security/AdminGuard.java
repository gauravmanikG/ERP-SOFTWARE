package com.silvermuller.seals.modules.admin.security;

import com.silvermuller.seals.modules.admin.auth.AuthService;
import com.silvermuller.seals.modules.admin.rbac.PermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Authorises the admin (Users / RBAC) endpoints only. This is scoped to the new admin
 * screens; it does not gate the rest of the ERP, which stays open until a global
 * enforcement layer is switched on separately.
 */
@Component
public class AdminGuard {

    private final AuthService auth;
    private final PermissionService permissions;

    public AdminGuard(AuthService auth, PermissionService permissions) {
        this.auth = auth;
        this.permissions = permissions;
    }

    /** Resolves the caller or throws 401. */
    public CurrentUser require(String authorizationHeader) {
        return auth.resolve(authorizationHeader)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required."));
    }

    /** Resolves the caller and checks one permission key (wildcard roles always pass), or throws 401/403. */
    public CurrentUser require(String authorizationHeader, String permissionKey) {
        CurrentUser user = require(authorizationHeader);
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive.");
        }
        if (user.wildcard() || permissions.can(user.id(), permissionKey)) {
            return user;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this action.");
    }

    /** Resolves the caller and requires at least one of the permission keys (wildcard roles always pass). */
    public CurrentUser requireAny(String authorizationHeader, String... permissionKeys) {
        CurrentUser user = require(authorizationHeader);
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive.");
        }
        if (user.wildcard()) return user;
        for (String key : permissionKeys) {
            if (permissions.can(user.id(), key)) return user;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You do not have permission for this action (" + String.join(" or ", permissionKeys) + ").");
    }
}
