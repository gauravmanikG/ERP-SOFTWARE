// Talks to the Express + PostgreSQL API in /backend. In dev, Vite proxies
// "/api" requests to http://localhost:4000 (see vite.config.js), so this
// works unchanged in both dev and a production build (as long as your
// production host also proxies /api to the backend, or you set
// VITE_API_URL to the backend's full URL).

const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = `Backend connection error (${res.status})`;
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => ({}));
      msg = body.message || body.error || msg;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  if (contentType.includes("application/json")) {
    return res.json();
  }
  throw new Error("Backend API returned non-JSON response.");
}

export const api = {
  list: (search) => request(`/companies${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  create: (record) => request(`/companies`, { method: "POST", body: JSON.stringify(record) }),
  update: (id, record) => request(`/companies/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  remove: (id) => request(`/companies/${id}`, { method: "DELETE" }),
};
