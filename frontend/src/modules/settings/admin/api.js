// Network calls for the Users and Access Control (RBAC) screens, plus session-token handling.
// The token is kept in sessionStorage so an accidental refresh does not sign the admin out mid-task;
// it is never written to the shared app settings. Every call sends Authorization: Bearer <token>.

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";
const TOKEN_KEY = "SMS_ADMIN_TOKEN";

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private window / storage blocked: calls just re-prompt for sign-in */
  }
}

export function clearToken() {
  setToken(null);
}

// Every ERP screen calls the API with plain fetch(). Rather than edit each screen, attach
// the session token to any request aimed at this API, and announce a 401 (expired or
// revoked session) so AuthGate can return to the login screen.
const isApiUrl = (url) => typeof url === "string" && (url.startsWith(API_ROOT) || url.startsWith("/api/"));
if (typeof window !== "undefined" && !window.__smsAuthFetch) {
  const nativeFetch = window.fetch.bind(window);
  window.__smsAuthFetch = true;
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    let opts = init;
    const token = getToken();
    if (token && isApiUrl(url)) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      opts = { ...(init || {}), headers };
    }
    const res = await nativeFetch(input, opts);
    if (res.status === 401 && token && isApiUrl(url)) window.dispatchEvent(new Event("sms:session-expired"));
    return res;
  };
}

async function call(method, path, body, { auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_ROOT}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error((data && (data.message || data.error)) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---- auth ----
export async function login(email, password) {
  const out = await call("POST", "/auth/login", { email, password }, { auth: false });
  if (out && out.token) setToken(out.token);
  return out;
}
export async function me() {
  return call("GET", "/auth/me");
}
export async function logout() {
  try {
    await call("POST", "/auth/logout", {});
  } finally {
    clearToken();
  }
}
export async function changePassword(currentPassword, newPassword) {
  return call("POST", "/auth/change-password", { currentPassword, newPassword });
}
export const updateMyPhoto = (photo) => call("PUT", "/auth/me/photo", { photo });

// ---- users ----
export const listUsers = () => call("GET", "/admin/users");
export const getUser = (id) => call("GET", `/admin/users/${id}`);
export const createUser = (body) => call("POST", "/admin/users", body);
export const updateUser = (id, body) => call("PUT", `/admin/users/${id}`, body);
export const setUserStatus = (id, status) => call("POST", `/admin/users/${id}/status`, { status });
export const resetPassword = (id, newPassword) => call("POST", `/admin/users/${id}/reset-password`, { newPassword });
export const viewPassword = (id) => call("GET", `/admin/users/${id}/password`);
export const deleteUser = (id) => call("DELETE", `/admin/users/${id}`);

// ---- roles (role master: labels only, no permissions) ----
export const listRoles = () => call("GET", "/admin/roles");
export const createRole = (body) => call("POST", "/admin/roles", body);
export const updateRole = (id, body) => call("PUT", `/admin/roles/${id}`, body);
export const deleteRole = (id) => call("DELETE", `/admin/roles/${id}`);

// ---- rbac ----
export const rbacCatalog = () => call("GET", "/admin/rbac/catalog");
export const userPermissions = (id) => call("GET", `/admin/rbac/users/${id}/permissions`);
export const savePermissions = (id, permissions) => call("PUT", `/admin/rbac/users/${id}/permissions`, { permissions });
