package com.silvermuller.seals.modules.admin.security;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Which permission every write endpoint needs (method + path -> permission keys, any of
 * which is enough). ApiAccessInterceptor checks these before the controller runs.
 *
 * Deny by default: a non-full-access user calling a write endpoint that is not listed here
 * is refused, so a new endpoint cannot slip through unchecked — add its rule here.
 *
 * Rules marked {@link #inController} are endpoints whose action is in the request body
 * (e.g. PR status: Approved vs Rejected); the interceptor lets them through and the
 * controller itself checks the exact permission once it has read the body.
 */
public final class ActionRules {

    private ActionRules() {}

    public record Rule(String method, Pattern path, List<String> anyOf, boolean inController) {}

    private static final List<Rule> RULES = new ArrayList<>();
    private static final String SEG = "[^/]+";

    /** A path like "/api/x/{id}/approve" -> regex; {anything} matches one path segment. */
    private static Pattern compile(String path) {
        return Pattern.compile("^" + path.replaceAll("\\{[^/}]+}", SEG) + "/?$");
    }

    private static void rule(String method, List<String> bases, String sub, String... anyOf) {
        for (String b : bases) RULES.add(new Rule(method, compile(b + sub), List.of(anyOf), false));
    }

    private static void rule(String method, String path, String... anyOf) {
        rule(method, List.of(path), "", anyOf);
    }

    private static void inController(String method, String path) {
        RULES.add(new Rule(method, compile(path), List.of(), true));
    }

    static {
        // ---------------- Engineering ----------------
        List<String> items = List.of("/api/inventory/items", "/api/items");
        rule("POST", items, "", "engineering.item_fg:create", "engineering.item_fg:edit",
                "engineering.item_other:create", "engineering.item_other:edit");
        rule("DELETE", items, "/{id}", "engineering.item_fg:delete", "engineering.item_other:delete");
        rule("DELETE", items, "/by-code/{code}", "engineering.item_fg:delete", "engineering.item_other:delete");

        List<String> hsn = List.of("/api/purchase/hsn-master", "/api/hsn-master", "/api/hsn", "/api/inventory/hsn-master");
        rule("POST", hsn, "", "engineering.hsn:create");
        rule("PUT", hsn, "/{code}", "engineering.hsn:edit");
        rule("DELETE", hsn, "/{code}", "engineering.hsn:delete");

        rule("POST", "/api/masters/{key}", "engineering.payment_master:create");
        rule("PUT", "/api/masters/{key}/{id}", "engineering.payment_master:edit");
        rule("DELETE", "/api/masters/{key}/{id}", "engineering.payment_master:delete");

        // ---------------- Inventory lookups (also maintained from Item Master) ----------------
        String[] itemEditors = { "engineering.item_fg:create", "engineering.item_fg:edit",
                "engineering.item_other:create", "engineering.item_other:edit" };
        rule("POST", "/api/inventory/categories", with("inventory.category:create", itemEditors));
        rule("DELETE", "/api/inventory/categories/{id}", "inventory.category:delete");
        rule("POST", "/api/inventory/item-groups", with("inventory.item_group:create", itemEditors));
        rule("PUT", "/api/inventory/item-groups/{id}", with("inventory.item_group:edit", itemEditors));
        rule("DELETE", "/api/inventory/item-groups/{id}", "inventory.item_group:delete");
        rule("POST", "/api/inventory/item-groups/{groupId}/subgroups", with("inventory.item_group:create", itemEditors));
        rule("PUT", "/api/inventory/item-groups/subgroups/{id}", with("inventory.item_group:edit", itemEditors));
        rule("DELETE", "/api/inventory/item-groups/subgroups/{id}", "inventory.item_group:delete");
        rule("POST", "/api/inventory/item-groups/import", "inventory.item_group:import");
        rule("POST", "/api/inventory/item-groups/reset", "inventory.item_group:delete");
        rule("POST", "/api/inventory/operations", with("inventory.operation:create", itemEditors));
        rule("POST", "/api/inventory/process-master", with("inventory.process:create", itemEditors));
        rule("DELETE", "/api/inventory/process-master/{id}", "inventory.process:delete");
        rule("POST", "/api/inventory/procurement-master", with("inventory.procurement:create", itemEditors));
        rule("DELETE", "/api/inventory/procurement-master/{id}", "inventory.procurement:delete");

        // ---------------- Purchase: masters ----------------
        List<String> sup = List.of("/api/inventory/suppliers", "/api/suppliers", "/api/vendors");
        rule("POST", sup, "", "purchase.supplier:create");
        rule("PUT", sup, "/{id}", "purchase.supplier:edit");
        rule("DELETE", sup, "/{id}", "purchase.supplier:delete");
        rule("POST", sup, "/{id}/items", "purchase.supplier:edit");
        rule("POST", sup, "/{id}/items/{itemId}", "purchase.supplier:edit");
        rule("DELETE", sup, "/{id}/items/{itemId}", "purchase.supplier:edit");
        rule("POST", "/api/new-po/vendor-rates", "purchase.vendor_rate:create", "purchase.vendor_rate:edit");

        // ---------------- Purchase Requisition ----------------
        inController("POST", "/api/purchase/requisitions");                 // create vs edit vs submit
        inController("PUT", "/api/purchase/requisitions/{prNumber}/status"); // submit / approve / reject / cancel
        rule("DELETE", "/api/purchase/requisitions/{prNumber}", "purchase.pr:delete");

        // ---------------- RFQ and Quotations ----------------
        rule("POST", "/api/purchase/rfq", "purchase.rfq:create");
        rule("PATCH", "/api/purchase/rfq/{id}/status", "purchase.rfq:edit");
        rule("POST", "/api/purchase/quotations", "purchase.quotation:create");
        rule("PUT", "/api/purchase/quotations/{id}", "purchase.quotation:edit");
        inController("POST", "/api/purchase/quotations/{id}/status");        // submit / approve / reject
        rule("POST", "/api/purchase/quotations/{id}/revisions", "purchase.quotation:edit");
        rule("POST", "/api/purchase/quotations/{id}/comments", "purchase.quotation:edit",
                "purchase.quotation:submit", "purchase.quotation:approve", "purchase.quotation:reject");
        rule("DELETE", "/api/purchase/quotations/{id}", "purchase.quotation:delete");
        rule("POST", "/api/purchase/quotations/sync-dates", "purchase.quotation:edit");

        // ---------------- Clubbed demand, Draft POs, PO from PR, Direct PO, GRN ----------------
        rule("POST", "/api/new-po/sourcing/drafts/assign", "purchase.clubbed_demand:assign");
        rule("POST", "/api/new-po/sourcing/drafts/assign-batch", "purchase.clubbed_demand:assign");
        rule("POST", "/api/new-po/sourcing/drafts/{draftNumber}/release", "purchase.draft_po:edit");
        rule("POST", "/api/new-po/sourcing/drafts/{draftNumber}/preview", "purchase.draft_po:view");
        rule("POST", "/api/new-po/sourcing/drafts/{draftNumber}/convert", "purchase.draft_po:issue");
        rule("POST", "/api/new-po/pr/preview", "purchase.po:view");
        rule("POST", "/api/new-po/pr/purchase-orders", "purchase.po:create");
        rule("POST", "/api/new-po/pr/purchase-orders/{poNumber}/cancel", "purchase.po:cancel");
        rule("POST", "/api/purchase/orders/{poNumber}/schedules", "purchase.po:create");
        rule("POST", "/api/new-po/direct/preview", "purchase.direct_po:view");
        rule("POST", "/api/new-po/direct/purchase-orders", "purchase.direct_po:create");
        rule("POST", "/api/new-po/direct/purchase-orders/{poNumber}/cancel", "purchase.direct_po:cancel");
        rule("POST", "/api/purchase/grn", "purchase.grn:create");
        rule("POST", "/api/purchase/grn/{id}/post", "purchase.grn:post");

        // ---------------- Capital PO ----------------
        String cap = "/api/capital-pos";
        // Capital PO keeps its own role model (ModuleRoles): adding a category and extending validity are approver tasks there.
        rule("POST", cap + "/categories", "purchase.capital_po:approve");
        rule("POST", cap + "/preview", "purchase.capital_po:view");
        rule("POST", cap, "purchase.capital_po:create");
        rule("PUT", cap + "/{id}", "purchase.capital_po:edit");
        rule("POST", cap + "/{id}/submit", "purchase.capital_po:submit");
        rule("POST", cap + "/{id}/approve", "purchase.capital_po:approve");
        rule("POST", cap + "/{id}/reject", "purchase.capital_po:reject");
        rule("POST", cap + "/{id}/issue", "purchase.capital_po:issue");
        rule("POST", cap + "/{id}/cancel", "purchase.capital_po:cancel");
        rule("POST", cap + "/{id}/close", "purchase.capital_po:approve");
        rule("POST", cap + "/{id}/validity/extend", "purchase.capital_po:approve");
        rule("POST", cap + "/{id}/amendments", "purchase.capital_po:edit");
        rule("POST", cap + "/{id}/amendments/{amendmentId}/decision", "purchase.capital_po:approve", "purchase.capital_po:reject");
        rule("PUT", cap + "/{id}/schedule", "purchase.capital_po:edit");
        rule("POST", cap + "/{id}/receipts", "purchase.capital_po:receive");
        rule("PUT", cap + "/{id}/receipts/{receiptId}/inspection", "purchase.capital_po:inspect");
        rule("PUT", cap + "/{id}/lines/{lineNo}/installation", "purchase.capital_po:receive", "purchase.capital_po:inspect");
        rule("PUT", cap + "/{id}/lines/{lineNo}/commissioning", "purchase.capital_po:receive", "purchase.capital_po:inspect");
        rule("POST", cap + "/{id}/assets/register", "purchase.capital_po:receive");
        rule("POST", cap + "/{id}/attachments", "purchase.capital_po:create", "purchase.capital_po:edit", "purchase.capital_po:receive");

        // ---------------- Service PO ----------------
        String svc = "/api/service-pos";
        // Service PO keeps its own role model (ModuleRoles): categories, validity extensions and amendments are approver
        // tasks there, and invoices are recorded by finance / acceptance (receive) users.
        rule("POST", svc + "/categories", "purchase.service_po:approve");
        rule("POST", svc + "/preview", "purchase.service_po:view");
        rule("POST", svc, "purchase.service_po:create");
        rule("PUT", svc + "/{id}", "purchase.service_po:edit");
        rule("POST", svc + "/{id}/submit", "purchase.service_po:submit");
        rule("POST", svc + "/{id}/approve", "purchase.service_po:approve");
        rule("POST", svc + "/{id}/reject", "purchase.service_po:reject");
        rule("POST", svc + "/{id}/issue", "purchase.service_po:issue");
        rule("POST", svc + "/{id}/hold", "purchase.service_po:approve");
        rule("POST", svc + "/{id}/release", "purchase.service_po:approve");
        rule("POST", svc + "/{id}/close", "purchase.service_po:approve");
        rule("POST", svc + "/{id}/cancel", "purchase.service_po:cancel");
        rule("POST", svc + "/{id}/validity/extend", "purchase.service_po:approve");
        rule("POST", svc + "/{id}/amend", "purchase.service_po:approve");
        rule("PUT", svc + "/{id}/schedule", "purchase.service_po:edit");
        rule("POST", svc + "/{id}/acceptances", "purchase.service_po:receive");
        rule("POST", svc + "/{id}/invoices", "purchase.service_po:receive");
        rule("POST", svc + "/{id}/attachments", "purchase.service_po:create", "purchase.service_po:edit", "purchase.service_po:receive");

        // ---------------- Job Work ----------------
        String jw = "/api/job-work";
        rule("POST", jw + "/operations", "purchase.jw_operation:create");
        rule("PUT", jw + "/operations/{id}", "purchase.jw_operation:edit");
        rule("POST", jw + "/workers", "purchase.jw_worker:create");
        rule("PUT", jw + "/workers/{id}", "purchase.jw_worker:edit");
        rule("POST", jw + "/workers/{id}/rate-contracts", "purchase.jw_worker:edit");
        rule("POST", jw + "/rate-contracts/{id}/revoke", "purchase.jw_worker:edit");
        rule("POST", jw + "/indents", "purchase.jw_indent:create");
        rule("PUT", jw + "/indents/{id}", "purchase.jw_indent:edit");
        rule("POST", jw + "/indents/{id}/submit", "purchase.jw_indent:submit");
        rule("POST", jw + "/indents/{id}/approve", "purchase.jw_indent:approve");
        rule("POST", jw + "/indents/{id}/reject", "purchase.jw_indent:reject");
        rule("POST", jw + "/indents/{id}/cancel", "purchase.jw_indent:cancel");
        rule("POST", jw + "/orders", "purchase.jw_order:create");
        rule("PUT", jw + "/orders/{id}", "purchase.jw_order:edit");
        rule("POST", jw + "/orders/{id}/submit", "purchase.jw_order:submit");
        rule("POST", jw + "/orders/{id}/approve", "purchase.jw_order:approve");
        rule("POST", jw + "/orders/{id}/reject", "purchase.jw_order:reject");
        rule("POST", jw + "/orders/{id}/cancel", "purchase.jw_order:cancel");
        rule("POST", jw + "/orders/{id}/close", "purchase.jw_order:approve");
        rule("POST", jw + "/challans", "purchase.jw_challan:create");
        rule("POST", jw + "/challans/{id}/cancel", "purchase.jw_challan:cancel");
        rule("POST", jw + "/receipts", "purchase.jw_receipt:create");
        rule("POST", jw + "/receipt-lines/{id}/inspect", "purchase.jw_receipt:inspect");
        rule("POST", jw + "/attachments", "purchase.jw_indent:create", "purchase.jw_indent:edit", "purchase.jw_order:create",
                "purchase.jw_order:edit", "purchase.jw_challan:create", "purchase.jw_receipt:create");
        rule("POST", jw + "/reconciliation/adjustments", "purchase.jw_recon:create");
        rule("POST", jw + "/reconciliation/adjustments/{id}/decision", "purchase.jw_recon:approve", "purchase.jw_recon:reject");
        rule("POST", jw + "/reconciliation/loss-policies", "purchase.jw_recon:approve");

        // ---------------- CRM, Maintenance, Settings ----------------
        List<String> cust = List.of("/api/crm/customers", "/api/customers");
        rule("POST", cust, "", "crm.customer:create");
        rule("PUT", cust, "/{id}", "crm.customer:edit");
        rule("DELETE", cust, "/{id}", "crm.customer:delete");
        rule("POST", "/api/maintenance/machines", "maintenance.machine:create");
        rule("PUT", "/api/maintenance/machines/{id}", "maintenance.machine:edit");
        rule("DELETE", "/api/maintenance/machines/{id}", "maintenance.machine:delete");
        List<String> dept = List.of("/api/inventory/departments", "/api/departments");
        rule("POST", dept, "", "settings.department:create");
        rule("PUT", dept, "/{id}", "settings.department:edit");
        rule("DELETE", dept, "/{id}", "settings.department:delete");
    }

    private static String[] with(String first, String... rest) {
        String[] out = new String[rest.length + 1];
        out[0] = first;
        System.arraycopy(rest, 0, out, 1, rest.length);
        return out;
    }

    /** The rule for a write request, or empty when the endpoint is not listed (deny by default). */
    public static Optional<Rule> match(String method, String path) {
        for (Rule r : RULES) {
            if (r.method().equals(method) && r.path().matcher(path).matches()) return Optional.of(r);
        }
        return Optional.empty();
    }

    static List<Rule> all() {
        return List.copyOf(RULES);
    }
}
