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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  list: (search) => request(`/companies${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  create: (record) => request(`/companies`, { method: "POST", body: JSON.stringify(record) }),
  update: (id, record) => request(`/companies/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  remove: (id) => request(`/companies/${id}`, { method: "DELETE" }),
};
