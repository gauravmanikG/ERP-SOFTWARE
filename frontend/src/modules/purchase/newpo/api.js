// All network calls for the New Purchase Order module. Components import from here and never call fetch directly.

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";
export const NPO = `${API_ROOT}/new-po`;

import { getSetting } from "../../../shared/utils/settingsStore";

const USER_KEY = "SMS_CURRENT_USER";

// The acting user is a UI setting used for the X-User-Name header; it is stored in PostgreSQL.
export function loadUser() {
  const u = getSetting(USER_KEY, null);
  if (u && u.name) return { name: u.name, role: u.role || "CREATOR" };
  return { name: "Current User", role: "CREATOR" };
}

// `user` is omitted for read-only lookups, which do not need the acting-user headers.
export async function request(method, path, user, body) {
  const headers = { "Content-Type": "application/json" };
  if (user) { headers["X-User-Name"] = user.name; headers["X-User-Role"] = user.role; }
  const res = await fetch(`${NPO}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  // New PO endpoints answer {error}; the shared handler answers {message, error: "Conflict" | "Bad Request"}.
  if (!res.ok) throw new Error((data && (data.message || data.error)) || `Request failed (${res.status})`);
  return data;
}

const enc = encodeURIComponent;

export const lookupApi = {
  vendors: (q) => request("GET", `/lookups/vendors?q=${enc(q || "")}`, null),
  items: (q) => request("GET", `/lookups/items?q=${enc(q || "")}`, null)
};

export const vendorRateApi = {
  history: (user, filters) => {
    const qs = new URLSearchParams();
    if (filters.supplierCode) qs.set("supplierCode", filters.supplierCode);
    if (filters.itemId) qs.set("itemId", filters.itemId);
    return request("GET", `/vendor-rates?${qs.toString()}`, user);
  },
  effective: (user, supplierCode, itemId, on) =>
    request("GET", `/vendor-rates/effective?supplierCode=${enc(supplierCode)}&itemId=${itemId}&on=${on}`, user),
  create: (user, body) => request("POST", "/vendor-rates", user, body)
};

// Sourcing: clubbed demand -> vendor drafts -> PO. Rules and quantity checks live on the server.
export const sourcingApi = {
  demand: () => request("GET", "/sourcing/demand", null),
  assignBatch: (user, items) => request("POST", "/sourcing/drafts/assign-batch", user, items),
  drafts: (filters) => request("GET", `/sourcing/drafts${query(filters)}`, null),
  release: (user, draftNumber, body) => request("POST", `/sourcing/drafts/${enc(draftNumber)}/release`, user, body),
  conversionLines: (draftNumber, poDate) =>
    request("GET", `/sourcing/drafts/${enc(draftNumber)}/conversion-lines${query({ poDate })}`, null),
  preview: (draftNumber, body) => request("POST", `/sourcing/drafts/${enc(draftNumber)}/preview`, null, body),
  convert: (user, draftNumber, body) => request("POST", `/sourcing/drafts/${enc(draftNumber)}/convert`, user, body),
  audit: (ref) => request("GET", `/sourcing/audit${query({ ref })}`, null)
};

// PR -> draft -> PO -> GRN tracking report. `flat` returns export rows.
export const trackingApi = {
  report: (filters) => request("GET", `/reports/traceability${query(filters)}`, null),
  flat: (filters) => request("GET", `/reports/traceability${query({ ...filters, flat: "true" })}`, null)
};

// Department Master names, for filters. (The PR form reads the same master.)
export const departmentApi = {
  list: async () => {
    const res = await fetch(`${API_ROOT}/inventory/departments`);
    if (!res.ok) throw new Error(`Departments could not be loaded (${res.status})`);
    const rows = await res.json();
    return rows.map((d) => d.departmentName || d.name).filter(Boolean);
  }
};

export const poRegisterApi = {
  orders: () => request("GET", "/reports/all-purchase-orders", null),
  detail: (poNumber) => request("GET", `/pr/purchase-orders/${enc(poNumber)}`, null),
  cancel: (user, poNumber, reason) => request("POST", `/pr/purchase-orders/${enc(poNumber)}/cancel`, user, { reason })
};

export const reportApi = {
  poVsPr: (filters) => request("GET", `/reports/po-vs-pr${query(filters)}`, null),
  poVsPrVsGrn: (filters) => request("GET", `/reports/po-vs-pr-vs-grn${query(filters)}`, null),
  prVsPo: (filters) => request("GET", `/reports/pr-vs-po${query(filters)}`, null),
  prVsPoItemSummary: (filters) => request("GET", `/reports/pr-vs-po/item-summary${query(filters)}`, null),
  legacyReconciliation: () => request("GET", "/reports/legacy-reconciliation", null)
};

function query(filters) {
  const qs = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

