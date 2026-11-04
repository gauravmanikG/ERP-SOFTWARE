package com.silvermuller.seals.modules.admin.security;

/** The authenticated caller resolved from a session token. */
public record CurrentUser(long id, String name, String email, String roleCode, String roleName, boolean wildcard,
                           String status, boolean mustChangePassword) {
    public boolean isActive() { return "ACTIVE".equalsIgnoreCase(status); }
}
