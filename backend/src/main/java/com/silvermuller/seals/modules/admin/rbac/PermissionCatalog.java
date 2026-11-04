package com.silvermuller.seals.modules.admin.rbac;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * The canonical list of ERP operations that can be access-controlled, grouped as a
 * module -> entity -> actions grid. This is the single source of truth for the RBAC
 * screen columns/rows and for the permission keys stored in role_permission /
 * user_permission.
 *
 * Entities and their applicable actions are grounded in the real backend endpoints
 * (see the controllers under modules/*). A permission key is "module.entity:action",
 * e.g. "purchase.pr:approve".
 *
 * Nothing here enforces anything on its own; enforcement is a separate, opt-in step.
 */
public final class PermissionCatalog {

    private PermissionCatalog() {}

    /** Fixed display order of the action columns in the grid. */
    public enum Action {
        VIEW, CREATE, EDIT, DELETE, SUBMIT, APPROVE, REJECT, CANCEL, POST, ISSUE,
        RECEIVE, INSPECT, IMPORT, EXPORT, PRINT, ASSIGN, DEACTIVATE, RESET_PASSWORD;

        public String key() { return name().toLowerCase(Locale.ROOT); }

        /** Short, human label for the column header. */
        public String label() {
            return switch (this) {
                case RESET_PASSWORD -> "Reset Pwd";
                default -> name().charAt(0) + name().substring(1).toLowerCase(Locale.ROOT);
            };
        }
    }

    /** How an entity behaves, used to derive sensible default role templates. */
    public enum Kind { MASTER, TXN, RECEIVING, REPORT, ADMIN }

    public record Entity(String module, String key, String label, Kind kind, List<Action> actions) {
        public String permissionKey(Action a) {
            return module.toLowerCase(Locale.ROOT) + "." + key + ":" + a.key();
        }
    }

    private static final List<Entity> ENTITIES = new ArrayList<>();

    private static void add(String module, String key, String label, Kind kind, Action... actions) {
        ENTITIES.add(new Entity(module, key, label, kind, List.of(actions)));
    }

    static {
        // ---------------- Engineering ----------------
        add("Engineering", "item_fg", "Item Master (FG)", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE);
        add("Engineering", "item_other", "Item Master (Other)", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE);
        add("Engineering", "payment_master", "Payment & Freight Masters", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE);
        add("Engineering", "hsn", "HSN / Tax Master", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE);

        // ---------------- Purchase ----------------
        add("Purchase", "supplier", "Suppliers (Vendor Master)", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE, Action.EXPORT);
        add("Purchase", "vendor_rate", "Vendor Rate Master", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT);
        add("Purchase", "pr", "Purchase Requisition", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE, Action.SUBMIT,
                Action.APPROVE, Action.REJECT, Action.CANCEL, Action.EXPORT);
        add("Purchase", "rfq", "RFQ", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.EDIT);
        add("Purchase", "quotation", "Vendor Quotations", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE, Action.SUBMIT,
                Action.APPROVE, Action.REJECT, Action.EXPORT);
        add("Purchase", "clubbed_demand", "Clubbed Demand", Kind.TXN,
                Action.VIEW, Action.ASSIGN);
        add("Purchase", "draft_po", "Draft POs", Kind.TXN,
                Action.VIEW, Action.EDIT, Action.SUBMIT, Action.ISSUE);
        add("Purchase", "direct_po", "Direct PO", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.CANCEL, Action.PRINT, Action.EXPORT);
        add("Purchase", "po", "Purchase Order (from PR)", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.CANCEL, Action.PRINT, Action.EXPORT);
        add("Purchase", "po_register", "PO Register", Kind.REPORT,
                Action.VIEW, Action.EXPORT, Action.PRINT);
        add("Purchase", "grn", "GRN (Goods Receipt Note)", Kind.RECEIVING,
                Action.VIEW, Action.CREATE, Action.POST);
        add("Purchase", "purchase_report", "Procurement Reports", Kind.REPORT,
                Action.VIEW, Action.EXPORT);
        add("Purchase", "capital_po", "Capital PO", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.SUBMIT, Action.APPROVE, Action.REJECT,
                Action.ISSUE, Action.CANCEL, Action.RECEIVE, Action.INSPECT, Action.EXPORT, Action.PRINT);
        add("Purchase", "service_po", "Service PO", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.SUBMIT, Action.APPROVE, Action.REJECT,
                Action.ISSUE, Action.CANCEL, Action.RECEIVE, Action.EXPORT, Action.PRINT);
        add("Purchase", "jw_indent", "Job Work Indent", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.SUBMIT, Action.APPROVE, Action.REJECT, Action.CANCEL);
        add("Purchase", "jw_order", "Job Work Order", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.SUBMIT, Action.APPROVE, Action.REJECT, Action.CANCEL);
        add("Purchase", "jw_challan", "Job Work Challan", Kind.RECEIVING,
                Action.VIEW, Action.CREATE, Action.CANCEL, Action.PRINT);
        add("Purchase", "jw_receipt", "Job Work Receipt", Kind.RECEIVING,
                Action.VIEW, Action.CREATE, Action.INSPECT);
        add("Purchase", "jw_worker", "Job Workers", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT);
        add("Purchase", "jw_recon", "Job Work Reconciliation & Scrap", Kind.TXN,
                Action.VIEW, Action.CREATE, Action.APPROVE, Action.REJECT);
        add("Purchase", "jw_report", "Job Work Reports & Compliance", Kind.REPORT,
                Action.VIEW, Action.EXPORT);
        add("Purchase", "jw_operation", "Job Work Operations Master", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT);

        // ---------------- Inventory ----------------
        add("Inventory", "category", "Item Categories", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.DELETE);
        add("Inventory", "item_group", "Item Groups & Subgroups", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE, Action.IMPORT);
        add("Inventory", "process", "Process Master", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.DELETE);
        add("Inventory", "procurement", "Procurement Master", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.DELETE);
        add("Inventory", "operation", "Operations Master", Kind.MASTER,
                Action.VIEW, Action.CREATE);

        // ---------------- Maintenance ----------------
        add("Maintenance", "machine", "Machine Master", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE);

        // ---------------- CRM ----------------
        add("CRM", "customer", "Customer Master", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE);

        // ---------------- Settings ----------------
        add("Settings", "department", "Department Master", Kind.MASTER,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE);
        add("Settings", "system_setting", "System Settings", Kind.ADMIN,
                Action.VIEW, Action.EDIT);
        add("Settings", "user_admin", "Users", Kind.ADMIN,
                Action.VIEW, Action.CREATE, Action.EDIT, Action.DEACTIVATE, Action.RESET_PASSWORD);
        add("Settings", "rbac_admin", "Access Control (RBAC)", Kind.ADMIN,
                Action.VIEW, Action.ASSIGN);
    }

    public static List<Entity> entities() {
        return List.copyOf(ENTITIES);
    }

    /** Every valid permission key in the system. */
    public static Set<String> allKeys() {
        Set<String> keys = new TreeSet<>();
        for (Entity e : ENTITIES) {
            for (Action a : e.actions()) keys.add(e.permissionKey(a));
        }
        return keys;
    }

    public static boolean isValidKey(String key) {
        return allKeys().contains(key);
    }

    /**
     * The default permission template for a role code. Wildcard roles (developer,
     * super_admin) return the empty set because the resolver grants them everything.
     * These are starting points the client refines on the RBAC screen.
     */
    public static Set<String> defaultKeysForRole(String roleCode) {
        Set<String> keys = new TreeSet<>();
        for (Entity e : ENTITIES) {
            for (Action a : e.actions()) {
                if (roleAllows(roleCode, e, a)) keys.add(e.permissionKey(a));
            }
        }
        return keys;
    }

    private static boolean in(Action a, Action... set) {
        for (Action x : set) if (x == a) return true;
        return false;
    }

    private static final Action[] READ_ONLY = { Action.VIEW, Action.EXPORT, Action.PRINT };

    private static boolean roleAllows(String role, Entity e, Action a) {
        Kind k = e.kind();
        return switch (role) {
            // Maker: prepares purchase documents; view-only on masters.
            case "purchase_executive" -> switch (k) {
                case TXN -> in(a, Action.VIEW, Action.CREATE, Action.EDIT, Action.SUBMIT,
                        Action.ASSIGN, Action.ISSUE, Action.EXPORT, Action.PRINT);
                case REPORT -> in(a, Action.VIEW, Action.EXPORT, Action.PRINT);
                case MASTER -> a == Action.VIEW || (e.key().equals("vendor_rate") && in(a, Action.CREATE, Action.EDIT));
                default -> false;
            };
            // Approval authority for spend; does not create the documents it approves.
            case "purchase_manager" -> switch (k) {
                case TXN -> in(a, Action.VIEW, Action.SUBMIT, Action.APPROVE, Action.REJECT, Action.CANCEL,
                        Action.ISSUE, Action.EXPORT, Action.PRINT);
                case REPORT -> in(a, Action.VIEW, Action.EXPORT, Action.PRINT);
                case MASTER -> a == Action.VIEW;
                default -> false;
            };
            // Department requester: only PRs and job-work indents.
            case "department_user" -> (e.key().equals("pr") || e.key().equals("jw_indent"))
                    && in(a, Action.VIEW, Action.CREATE, Action.EDIT, Action.SUBMIT);
            // Physical receipt and dispatch of goods.
            case "store_operator" -> switch (e.key()) {
                case "grn" -> in(a, Action.VIEW, Action.CREATE, Action.POST);
                case "jw_challan" -> in(a, Action.VIEW, Action.CREATE, Action.CANCEL, Action.PRINT);
                case "jw_receipt" -> in(a, Action.VIEW, Action.CREATE);
                case "capital_po", "service_po" -> in(a, Action.VIEW, Action.RECEIVE);
                case "supplier", "item_fg", "item_other" -> a == Action.VIEW;
                default -> false;
            };
            // Inspects received goods and job-work returns.
            case "quality_inspector" -> switch (e.key()) {
                case "jw_receipt", "capital_po" -> in(a, Action.VIEW, Action.INSPECT);
                case "jw_recon", "grn" -> a == Action.VIEW;
                default -> false;
            };
            // Confirms delivery / installation / commissioning / acceptance.
            case "site_acceptor" -> switch (e.key()) {
                case "capital_po" -> in(a, Action.VIEW, Action.RECEIVE, Action.INSPECT);
                case "service_po" -> in(a, Action.VIEW, Action.RECEIVE);
                default -> false;
            };
            // Supplier invoices and financial review.
            case "accounts_user" -> switch (k) {
                case REPORT -> in(a, Action.VIEW, Action.EXPORT);
                case TXN -> e.key().equals("service_po") || e.key().equals("capital_po")
                        ? in(a, Action.VIEW, Action.EXPORT) : false;
                default -> false;
            };
            // Owns all master data.
            case "master_data_officer" -> k == Kind.MASTER
                    && in(a, Action.VIEW, Action.CREATE, Action.EDIT, Action.DELETE, Action.IMPORT);
            // Read-only review across everything.
            case "auditor" -> in(a, READ_ONLY);
            // Wildcard roles: resolver grants all; no stored template.
            default -> false;
        };
    }

    /** Grid structure for the frontend: modules in order, each with its entities and action columns. */
    public static List<Map<String, Object>> gridModel() {
        Map<String, List<Map<String, Object>>> byModule = new LinkedHashMap<>();
        for (Entity e : ENTITIES) {
            List<Map<String, Object>> rows = byModule.computeIfAbsent(e.module(), m -> new ArrayList<>());
            List<String> acts = new ArrayList<>();
            for (Action a : e.actions()) acts.add(a.key());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("entity", e.key());
            row.put("label", e.label());
            row.put("kind", e.kind().name());
            row.put("actions", acts);
            rows.add(row);
        }
        List<Map<String, Object>> columns = new ArrayList<>();
        for (Action a : Action.values()) {
            Map<String, Object> col = new LinkedHashMap<>();
            col.put("action", a.key());
            col.put("label", a.label());
            columns.add(col);
        }
        List<Map<String, Object>> modules = new ArrayList<>();
        for (Map.Entry<String, List<Map<String, Object>>> en : byModule.entrySet()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("module", en.getKey());
            m.put("entities", en.getValue());
            modules.add(m);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        Map<String, Object> wrapper = new LinkedHashMap<>();
        wrapper.put("columns", columns);
        wrapper.put("modules", modules);
        result.add(wrapper);
        return result;
    }
}
