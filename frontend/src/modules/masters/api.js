// Network calls for the Masters screens. Components import from here and never call fetch directly.

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";

async function call(method, path, body) {
  const res = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

// Code-and-name masters: payment modes, credit period bases, payment terms, freight options.
export const masterApi = {
  list: (key, includeInactive) => call("GET", `/masters/${key}?includeInactive=${includeInactive}`),
  create: (key, body) => call("POST", `/masters/${key}`, body),
  update: (key, id, body) => call("PUT", `/masters/${key}/${id}`, body),
  remove: (key, id) => call("DELETE", `/masters/${key}/${id}`)
};

// HSN/SAC codes live in the existing HSN tax master, which purchase orders also use.
export const hsnApi = {
  list: (includeInactive) => call("GET", `/purchase/hsn-master?includeInactive=${includeInactive}`),
  create: (body) => call("POST", "/purchase/hsn-master", body),
  update: (code, body) => call("PUT", `/purchase/hsn-master/${encodeURIComponent(code)}`, body),
  remove: (code) => call("DELETE", `/purchase/hsn-master/${encodeURIComponent(code)}`)
};
