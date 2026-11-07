package com.silvermuller.seals.modules.admin.security;

import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.Optional;

/**
 * The signed-in user of the current HTTP request, stored by {@link ApiAccessInterceptor} once it has checked the
 * session. Services use it to record WHO performed a step (created, approved, rejected, converted, received...)
 * from the session itself, so a name typed or sent by the browser can never be recorded instead.
 *
 * Outside a web request (startup jobs, unit tests) there is no signed-in user and the caller's fallback is used.
 */
public final class RequestActor {

    static final String ATTRIBUTE = RequestActor.class.getName() + ".user";

    private RequestActor() {}

    /** Called by the interceptor for every authenticated request. */
    static void set(jakarta.servlet.http.HttpServletRequest req, CurrentUser user) {
        req.setAttribute(ATTRIBUTE, user);
    }

    public static Optional<CurrentUser> current() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs == null) return Optional.empty();
        Object u = attrs.getAttribute(ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
        return u instanceof CurrentUser cu ? Optional.of(cu) : Optional.empty();
    }

    /** The signed-in user's name; {@code fallback} only when there is no signed-in user (startup, tests). */
    public static String nameOr(String fallback) {
        return current().map(CurrentUser::name).filter(n -> !n.isBlank()).orElse(fallback);
    }
}
