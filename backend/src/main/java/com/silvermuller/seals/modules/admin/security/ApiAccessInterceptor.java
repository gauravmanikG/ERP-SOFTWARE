package com.silvermuller.seals.modules.admin.security;

import com.silvermuller.seals.modules.admin.auth.AuthService;
import com.silvermuller.seals.modules.admin.rbac.PermissionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

/**
 * Server-side access rule for every /api request, so hiding buttons in the browser is
 * never the only protection:
 *
 *  1. Every call needs a valid, active session (401 / 403 otherwise). Open: health,
 *     login, and GET /api/settings (theme is loaded before the login screen).
 *  2. A session still on a temporary password may only use /api/auth/** until it is changed.
 *  3. Every write (POST/PUT/PATCH/DELETE) needs the exact permission for that action,
 *     looked up in {@link ActionRules} (e.g. approving a PR needs purchase.pr:approve).
 *     Writes not listed there are refused. Reads only need a session, because screens
 *     legitimately look up other modules' reference data (a PR reads items and suppliers).
 *
 * Wildcard roles (Super Admin, Developer) pass every check. /api/admin/** is guarded per
 * action by AdminGuard.
 */
@Component
public class ApiAccessInterceptor implements HandlerInterceptor {

    private final AuthService auth;
    private final PermissionService permissions;

    public ApiAccessInterceptor(AuthService auth, PermissionService permissions) {
        this.auth = auth;
        this.permissions = permissions;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        String method = req.getMethod();
        String path = req.getRequestURI();
        if ("OPTIONS".equals(method) || isOpen(method, path)) return true;

        CurrentUser user = auth.resolve(req.getHeader("Authorization"))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required."));
        if (!user.isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive.");
        RequestActor.set(req, user); // services record "who did this step" from the session, never from the browser
        if (path.startsWith("/api/auth/")) return true;
        if (user.mustChangePassword()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Change your temporary password first.");
        }
        if (user.wildcard() || "GET".equals(method) || "HEAD".equals(method)) return true;

        // Admin screens check each action themselves (AdminGuard); settings are per-screen display preferences.
        if (path.startsWith("/api/admin/") || path.equals("/api/settings") || path.startsWith("/api/settings/")) return true;

        ActionRules.Rule rule = ActionRules.match(method, path).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.FORBIDDEN, "This action is not permitted for your account."));
        if (rule.inController()) return true; // the controller checks the exact action once it has read the body
        Set<String> keys = permissions.effectiveKeys(user.id());
        if (rule.anyOf().stream().anyMatch(keys::contains)) return true;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You do not have permission for this action (" + String.join(" or ", rule.anyOf()) + ").");
    }

    static boolean isOpen(String method, String path) {
        return path.equals("/api/health")
                || path.equals("/api/health/live")
                || path.equals("/api/auth/login")
                || (path.equals("/api/settings") && "GET".equals(method));
    }
}
