package com.silvermuller.seals.modules.admin.security;

import com.silvermuller.seals.modules.admin.rbac.PermissionCatalog;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiAccessInterceptorTest {

    @Test
    void onlyHealthLoginAndReadingSettingsAreOpen() {
        assertTrue(ApiAccessInterceptor.isOpen("GET", "/api/health"));
        assertTrue(ApiAccessInterceptor.isOpen("GET", "/api/health/live"));
        assertFalse(ApiAccessInterceptor.isOpen("GET", "/api/health/anything-else"));
        assertTrue(ApiAccessInterceptor.isOpen("POST", "/api/auth/login"));
        assertTrue(ApiAccessInterceptor.isOpen("GET", "/api/settings"));
        assertFalse(ApiAccessInterceptor.isOpen("PUT", "/api/settings/theme"));
        assertFalse(ApiAccessInterceptor.isOpen("GET", "/api/auth/me"));
        assertFalse(ApiAccessInterceptor.isOpen("GET", "/api/customers"));
    }

    @Test
    void everyRuleNamesARealPermission() {
        Set<String> unknown = new TreeSet<>();
        for (ActionRules.Rule r : ActionRules.all()) {
            for (String k : r.anyOf()) if (!PermissionCatalog.isValidKey(k)) unknown.add(k);
            assertTrue(r.inController() || !r.anyOf().isEmpty(), "rule without permissions: " + r.path());
        }
        assertTrue(unknown.isEmpty(), "Rules use keys that do not exist in PermissionCatalog: " + unknown);
    }

    @Test
    void approveAndRejectNeedTheirOwnPermission() {
        assertEquals(List.of("purchase.capital_po:approve"), ActionRules.match("POST", "/api/capital-pos/7/approve").orElseThrow().anyOf());
        assertEquals(List.of("purchase.capital_po:reject"), ActionRules.match("POST", "/api/capital-pos/7/reject").orElseThrow().anyOf());
        assertEquals(List.of("purchase.jw_indent:approve"), ActionRules.match("POST", "/api/job-work/indents/3/approve").orElseThrow().anyOf());
        assertEquals(List.of("purchase.service_po:submit"), ActionRules.match("POST", "/api/service-pos/9/submit").orElseThrow().anyOf());
        // PR status carries the action in the body: the controller decides (approve / reject / submit / cancel)
        assertTrue(ActionRules.match("PUT", "/api/purchase/requisitions/PR-2026-00001/status").orElseThrow().inController());
        assertEquals(List.of("purchase.pr:delete"), ActionRules.match("DELETE", "/api/purchase/requisitions/PR-2026-00001").orElseThrow().anyOf());
    }

    @Test
    void routesMapToTheEntityThatOwnsTheScreen() {
        // URL prefix and module disagree here; the explicit rules must win
        assertTrue(ActionRules.match("DELETE", "/api/inventory/items/12").orElseThrow().anyOf().contains("engineering.item_fg:delete"));
        assertEquals(List.of("engineering.hsn:edit"), ActionRules.match("PUT", "/api/purchase/hsn-master/8471").orElseThrow().anyOf());
        assertEquals(List.of("purchase.supplier:create"), ActionRules.match("POST", "/api/inventory/suppliers").orElseThrow().anyOf());
        assertEquals(List.of("settings.department:delete"), ActionRules.match("DELETE", "/api/departments/3").orElseThrow().anyOf());
        assertEquals(List.of("crm.customer:create"), ActionRules.match("POST", "/api/customers").orElseThrow().anyOf());
    }

    @Test
    void moduleRuledActionsNeedTheApproverPermission() {
        // Capital / Service PO decide these by their own role model (ModuleRoles): approver-level tasks there.
        assertEquals(List.of("purchase.capital_po:approve"), ActionRules.match("POST", "/api/capital-pos/categories").orElseThrow().anyOf());
        assertEquals(List.of("purchase.capital_po:approve"), ActionRules.match("POST", "/api/capital-pos/7/validity/extend").orElseThrow().anyOf());
        assertEquals(List.of("purchase.service_po:approve"), ActionRules.match("POST", "/api/service-pos/categories").orElseThrow().anyOf());
        assertEquals(List.of("purchase.service_po:approve"), ActionRules.match("POST", "/api/service-pos/9/amend").orElseThrow().anyOf());
        assertEquals(List.of("purchase.service_po:receive"), ActionRules.match("POST", "/api/service-pos/9/invoices").orElseThrow().anyOf());
    }

    @Test
    void unlistedWritesAreNotMatchedSoTheyAreDenied() {
        assertTrue(ActionRules.match("POST", "/api/purchase/requisitions/PR-1/approve").isEmpty());
        assertTrue(ActionRules.match("DELETE", "/api/capital-pos/7").isEmpty());
        assertTrue(ActionRules.match("POST", "/api/hsnfoo").isEmpty());
        assertTrue(ActionRules.match("GET", "/api/customers").isEmpty()); // reads are not write rules
    }
}
