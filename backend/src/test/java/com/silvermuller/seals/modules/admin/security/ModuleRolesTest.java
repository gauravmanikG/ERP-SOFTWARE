package com.silvermuller.seals.modules.admin.security;

import com.silvermuller.seals.modules.admin.rbac.PermissionCatalog;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Module roles (Capital PO, Service PO, Job Work) come from permissions, never from the browser. */
class ModuleRolesTest {

    @Test
    void everyMappedKeyIsARealPermission() {
        Set<String> unknown = new TreeSet<>();
        for (Map<String, List<String>> module : ModuleRoles.MAPPINGS.values()) {
            for (List<String> keys : module.values()) {
                for (String k : keys) if (!PermissionCatalog.isValidKey(k)) unknown.add(k);
            }
        }
        assertTrue(unknown.isEmpty(), "ModuleRoles uses keys that do not exist in PermissionCatalog: " + unknown);
    }

    @Test
    void adminIsOnlyEverAWildcardAccount() {
        assertEquals(Set.of("ADMIN"), ModuleRoles.derive(ModuleRoles.CAPITAL_PO, true, Set.of()));
        Set<String> everything = PermissionCatalog.allKeys();
        for (String module : List.of(ModuleRoles.CAPITAL_PO, ModuleRoles.SERVICE_PO, ModuleRoles.JOB_WORK)) {
            assertFalse(ModuleRoles.derive(module, false, everything).contains("ADMIN"),
                    module + ": a non-wildcard user with every permission must still not be ADMIN");
        }
    }

    @Test
    void rolesFollowThePermissions() {
        assertEquals(Set.of("APPROVER"), ModuleRoles.derive(ModuleRoles.CAPITAL_PO, false, Set.of("purchase.capital_po:approve")));
        assertEquals(Set.of("CREATOR"), ModuleRoles.derive(ModuleRoles.CAPITAL_PO, false, Set.of("purchase.capital_po:create", "purchase.pr:approve")));
        assertEquals(Set.of("ASSET_MANAGER", "RECEIVER"), ModuleRoles.derive(ModuleRoles.CAPITAL_PO, false, Set.of("purchase.capital_po:receive")));
        assertEquals(Set.of("FINANCE", "ACCEPTOR"), ModuleRoles.derive(ModuleRoles.SERVICE_PO, false, Set.of("purchase.service_po:receive")));
        assertEquals(Set.of("STORE"), ModuleRoles.derive(ModuleRoles.JOB_WORK, false, Set.of("purchase.jw_challan:create")));
        assertEquals(Set.of("QUALITY"), ModuleRoles.derive(ModuleRoles.JOB_WORK, false, Set.of("purchase.jw_receipt:inspect")));
        // a view-only user plays no role; the screen only shows
        assertEquals(Set.of(), ModuleRoles.derive(ModuleRoles.SERVICE_PO, false, Set.of("purchase.service_po:view")));
        assertEquals("VIEWER", ModuleRoles.primary(Set.of()));
    }

    @Test
    void primaryRoleRecordedInHistoryPrefersTheMostResponsibleOne() {
        assertEquals("ADMIN", ModuleRoles.primary(Set.of("ADMIN")));
        assertEquals("APPROVER", ModuleRoles.primary(Set.of("CREATOR", "APPROVER")));
        assertEquals("RECEIVER", ModuleRoles.primary(Set.of("RECEIVER", "CREATOR")));
    }

    @Test
    void outsideAWebRequestThereIsNoSessionActor() {
        assertTrue(ModuleRoles.fromSession(ModuleRoles.JOB_WORK).isEmpty());
        assertTrue(RequestActor.permissions().isEmpty());
    }
}
