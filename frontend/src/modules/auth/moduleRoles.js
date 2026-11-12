// The role the signed-in user plays inside the screens that keep their own role model — Capital PO, Service PO and
// Job Work. The SERVER decides it from the user's permissions (backend ModuleRoles) and returns it from
// GET /api/auth/me as `moduleRoles`; these screens only display it and show or hide buttons with it. Nothing the
// browser sends can change it: the API ignores the old X-User-Name / X-User-Role headers.
//
//   sessionActor(me, "capitalPo") -> { name: "Kiran", role: "APPROVER", roles: ["APPROVER", "RECEIVER"] }
//
// `role` is the first (most responsible) role, the one the server records in a document's history;
// `roles` is everything the user may do in that module. ADMIN is only ever a Super Admin / Developer account.

export const MODULES = { capitalPo: "capitalPo", servicePo: "servicePo", jobWork: "jobWork" };

export function sessionActor(me, module) {
  const roles = Array.isArray(me?.moduleRoles?.[module]) ? me.moduleRoles[module] : [];
  return { name: me?.name || "", role: roles[0] || "VIEWER", roles };
}

/** True when the user holds any of the wanted roles in that module (ADMIN holds them all). */
export function hasRole(user, ...wanted) {
  const roles = user?.roles || [];
  return roles.includes("ADMIN") || wanted.some((r) => roles.includes(r));
}

/** "APPROVER · RECEIVER", or "view only" for a user with no role in the module. */
export function rolesLabel(user) {
  const roles = user?.roles || [];
  return roles.length ? roles.join(" · ") : "view only";
}
