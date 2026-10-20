// All network calls for the New Purchase Order module. Components import from here and never call fetch directly.

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";
export const NPO = `${API_ROOT}/new-po`;

const USER_KEY = "SMS_CURRENT_USER";

// The acting user is a UI preference used for the X-User-Name header, not business data.
export function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.name) return { name: u.name, role: u.role || "CREATOR" };
    }
  } catch (e) { /* storage unavailable */ }
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
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
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

export const poByPrApi = {
  eligibleItems: (q) => request("GET", `/pr/eligible-items?q=${enc(q || "")}`, null),
  eligibleLines: (itemCode, vendorCode, poDate) =>
    request("GET", `/pr/eligible-lines?itemCode=${enc(itemCode)}&vendorCode=${enc(vendorCode)}&poDate=${poDate}`, null),
  preview: (body) => request("POST", "/pr/preview", null, body),
  create: (user, body) => request("POST", "/pr/purchase-orders", user, body)
};

export const poRegisterApi = {
  orders: () => request("GET", "/pr/purchase-orders", null),
  detail: (poNumber) => request("GET", `/pr/purchase-orders/${enc(poNumber)}`, null),
  cancel: (user, poNumber, reason) => request("POST", `/pr/purchase-orders/${enc(poNumber)}/cancel`, user, { reason })
};

export const reportApi = {
  poVsPr: (filters) => request("GET", `/reports/po-vs-pr${query(filters)}`, null),
  poVsPrVsGrn: (filters) => request("GET", `/reports/po-vs-pr-vs-grn${query(filters)}`, null),
  legacyReconciliation: () => request("GET", "/reports/legacy-reconciliation", null)
};

function query(filters) {
  const qs = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const prFirstApi = {
  eligiblePrs: (q) => request("GET", `/pr/eligible-prs?q=${enc(q || "")}`, null),
  outstandingLines: (prNumber, vendorCode, poDate) =>
    request("GET", `/pr/prs/${enc(prNumber)}/outstanding-lines?vendorCode=${enc(vendorCode)}&poDate=${poDate}`, null)
};
