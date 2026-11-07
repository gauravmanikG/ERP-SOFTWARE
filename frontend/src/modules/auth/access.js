import { MODULES_LIST } from "../../shared/layout/modulesData";

// Which permission entity (from the backend PermissionCatalog, "module.entity") lets a
// user open each screen. A screen opens when the user holds that entity's ":view" key —
// granted on Settings -> Access Control. Super Admin / Developer (wildcard) open everything.
// The backend re-checks every write (ApiAccessInterceptor), so this is not the only guard.
const EXACT = {
  "item-master": ["engineering.item_fg"],
  "item-master-other": ["engineering.item_other"],
  "masters-hsn-code": ["engineering.hsn"],
  "supplier-master": ["purchase.supplier"],
  "purchase-requisition": ["purchase.pr"],
  "new-po-vendor-rates": ["purchase.vendor_rate"],
  "new-po-clubbed-demand": ["purchase.clubbed_demand"],
  "new-po-draft-pos": ["purchase.draft_po"],
  "new-po-direct-po": ["purchase.direct_po"],
  "new-po-po-register": ["purchase.po_register"],
  "capital-po": ["purchase.capital_po"],
  "service-po": ["purchase.service_po"],
  grn: ["purchase.grn"],
  rfq: ["purchase.rfq"],
  "vendor-quotations": ["purchase.quotation"],
  "job-work-indents": ["purchase.jw_indent"],
  "job-work-orders": ["purchase.jw_order"],
  "job-work-send": ["purchase.jw_challan"],
  "job-work-challans": ["purchase.jw_challan"],
  "job-work-receive": ["purchase.jw_receipt"],
  "job-work-receipts": ["purchase.jw_receipt"],
  "job-work-workers": ["purchase.jw_worker"],
  "job-work-ledger": ["purchase.jw_worker"],
  "job-work-recon": ["purchase.jw_recon"],
  "job-work-reports": ["purchase.jw_report"],
  "job-work-operations": ["purchase.jw_operation"],
  "job-work-dashboard": ["purchase.jw_indent", "purchase.jw_order", "purchase.jw_challan", "purchase.jw_receipt",
    "purchase.jw_worker", "purchase.jw_recon", "purchase.jw_report", "purchase.jw_operation"],
  "customer-master": ["crm.customer"],
  "machine-master": ["maintenance.machine"],
  "department-master": ["settings.department"],
  users: ["settings.user_admin"],
  rbac: ["settings.rbac_admin"]
};

// Families of screens that share one permission.
const PREFIX = [
  ["masters-", ["engineering.payment_master"]],                       // payment / freight masters (HSN is exact above)
  ["new-po-tracking", ["purchase.purchase_report"]],
  ["new-po-report", ["purchase.purchase_report"]],
  ["new-po-reconciliation", ["purchase.purchase_report"]]
];

// Inventory stock screens have no entity of their own yet: any Inventory permission opens them.
const MODULE_WIDE = { inventory: "inventory", "item-wise-cb": "inventory", "dept-wise-cb": "inventory" };

// Pages every signed-in user may open (the home dashboard and its general panels).
const ALWAYS = new Set(["home", "dashboard", "notifications", "docs", "ai-chatbot", "entry-forms", "operations"]);

const aliases = { quotations: "vendor-quotations", quotation: "vendor-quotations", customer: "customer-master", customers: "customer-master" };

function entitiesFor(page) {
  if (EXACT[page]) return EXACT[page];
  const hit = PREFIX.find(([p]) => page.startsWith(p));
  return hit ? hit[1] : null;
}

/** Whether this user holds one exact permission, e.g. can(me, "purchase.pr:approve"). For hiding buttons;
 *  the server enforces the same rule on every write. */
export function can(user, key) {
  if (!user) return false;
  if (user.wildcard) return true;
  return (user.permissions || []).includes(key);
}

/** Whether this user may open a screen (a targetPage / view key from the navigation). */
export function canOpenPage(user, rawPage) {
  if (!user) return false;
  if (user.wildcard) return true;
  const page = aliases[rawPage] || rawPage;
  if (!page || ALWAYS.has(page)) return true;
  if (page.startsWith("docs-")) return true; // Documentation module: every signed-in user
  const keys = user.permissions || [];
  if (MODULE_WIDE[page]) return keys.some((k) => k.startsWith(`${MODULE_WIDE[page]}.`));
  const entities = entitiesFor(page);
  if (!entities) return false; // unknown / not-yet-built screen: only full-access roles
  return entities.some((e) => keys.includes(`${e}:view`));
}

/**
 * MODULES_LIST trimmed to what this user may open: built screens they lack access to are
 * removed, and a module or group with no openable screen disappears entirely. Not-yet-built
 * items (no targetPage) stay inside modules/groups the user can already see, as "coming soon".
 */
export function visibleModules(user) {
  if (user?.wildcard) return MODULES_LIST;
  const keepItem = (item) => !item.targetPage || canOpenPage(user, item.targetPage);
  const hasOpenable = (items) => items.some((i) => (i.children ? hasOpenable(i.children) : i.targetPage && canOpenPage(user, i.targetPage)));

  return MODULES_LIST
    .filter((mod) => hasOpenable(mod.submodules || []))
    .map((mod) => ({
      ...mod,
      submodules: (mod.submodules || [])
        .map((s) => (s.children ? { ...s, children: s.children.filter(keepItem) } : s))
        // a group survives only if it still holds a screen the user can open, not just "coming soon" items
        .filter((s) => (s.children ? hasOpenable(s.children) : keepItem(s)))
    }));
}
