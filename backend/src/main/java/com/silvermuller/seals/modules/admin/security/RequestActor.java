package com.silvermuller.seals.modules.admin.security;

import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.Optional;
import java.util.Set;

/**
 * The signed-in user of the current HTTP request, stored by {@link ApiAccessInterceptor} once it has checked the
 * session. Services use it to record WHO performed a step (created, approved, rejected, converted, received...)
 * from the session itself, so a name typed or sent by the browser can never be recorded instead.
 *
 * <p>The interceptor also stores the user's effective permission keys, so a module can derive the user's role inside
 * that module ({@link ModuleRoles}) without trusting a role sent by the browser.
 *
 * Outside a web request (startup jobs, unit tests) there is no signed-in user and the caller's fallback is used.
 */
public final class RequestActor {

    static final String ATTRIBUTE = RequestActor.class.getName() + ".user";
    static final String PERMISSIONS_ATTRIBUTE = RequestActor.class.getName() + ".permissions";

    private RequestActor() {}

    /** Called by the interceptor for every authenticated request. */
    static void set(jakarta.servlet.http.HttpServletRequest req, CurrentUser user, Set<String> permissionKeys) {
        req.setAttribute(ATTRIBUTE, user);
        req.setAttribute(PERMISSIONS_ATTRIBUTE, permissionKeys == null ? Set.<String>of() : Set.copyOf(permissionKeys));
    }

    public static Optional<CurrentUser> current() {
        Object u = attribute(ATTRIBUTE);
        return u instanceof CurrentUser cu ? Optional.of(cu) : Optional.empty();
    }

    /** The signed-in user's effective permission keys (every key for wildcard roles); empty outside a request. */
    @SuppressWarnings("unchecked")
    public static Set<String> permissions() {
        Object p = attribute(PERMISSIONS_ATTRIBUTE);
        return p instanceof Set<?> s ? (Set<String>) s : Set.of();
    }

    /** The signed-in user's name; {@code fallback} only when there is no signed-in user (startup, tests). */
    public static String nameOr(String fallback) {
        return current().map(CurrentUser::name).filter(n -> !n.isBlank()).orElse(fallback);
    }

    private static Object attribute(String name) {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs == null) return null;
        return attrs.getAttribute(name, RequestAttributes.SCOPE_REQUEST);
    }
}
