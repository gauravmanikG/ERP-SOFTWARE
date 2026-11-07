package com.silvermuller.seals.modules.purchase.activity;

import com.silvermuller.seals.modules.admin.rbac.PermissionService;
import com.silvermuller.seals.modules.admin.security.CurrentUser;
import com.silvermuller.seals.modules.admin.security.RequestActor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Read-only activity trail ("who did each step") for a PR, vendor draft, PO or GRN.
 * Scoped by module: only users who can open at least one Purchase screen (any purchase.*:view) may read it.
 * Other modules will get their own trail with their own module check.
 */
@RestController
@RequestMapping("/api/purchase/activity")
public class ProcurementActivityController {

    static final String MODULE_PREFIX = "purchase.";

    private final ProcurementActivityService service;
    private final PermissionService permissions;

    public ProcurementActivityController(ProcurementActivityService service, PermissionService permissions) {
        this.service = service;
        this.permissions = permissions;
    }

    @GetMapping
    public Map<String, Object> trail(@RequestParam String ref) {
        CurrentUser user = RequestActor.current().orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required."));
        if (!user.wildcard() && permissions.effectiveKeys(user.id()).stream()
                .noneMatch(k -> k.startsWith(MODULE_PREFIX) && k.endsWith(":view"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to the Purchase module's activity.");
        }
        return service.trail(ref);
    }
}
