import { useEffect, useMemo, useState } from "react";
import {
  Users as UsersIcon, Plus, Pencil, KeyRound, ShieldCheck, Power, Search, X, LogOut, Menu, ChevronLeft,
  Tags, Trash2, Lock, Camera, Copy
} from "lucide-react";
import * as api from "../admin/api";
import { fileToProfilePhoto } from "../../auth/profilePhoto";
import { useCurrentUser } from "../../auth/AuthGate";
import { CompanyEmailInput } from "../../../shared/components/CompanyEmailInput";

const EMPTY_FORM = {
  name: "", email: "", password: "", roleId: "", status: "ACTIVE",
  department: "", designation: "", employeeId: "", phone: "", approvalLimit: "", photo: ""
};

export function UsersPage({ dark = false, onBackToHome, onOpenSidebar, sidebarOpen = false, onOpenAccess }) {
  const session = useCurrentUser(); // the app-wide signed-in user (header), kept in sync when editing yourself
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState(null);

  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', form }
  const [resetPwd, setResetPwd] = useState(""); // new password typed in the Password dialog
  const [rolesOpen, setRolesOpen] = useState(false); // role master modal

  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const text = dark ? "#e2e8f0" : "#0f172a";
  const sub = dark ? "#94a3b8" : "#64748b";
  const border = dark ? "#1f2937" : "#e2e8f0";
  const accent = "#0f766e";

  const flash = (message, kind = "ok") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    (async () => {
      if (!api.getToken()) { setChecking(false); return; }
      try {
        const u = await api.me();
        setMe(u);
        setAuthed(true);
      } catch {
        api.clearToken();
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roleList, list] = await Promise.all([api.listRoles(), api.listUsers()]);
      setRoles(roleList || []);
      setUsers(list || []);
    } catch (e) {
      flash(e.message || "Failed to load users.", "err");
    } finally {
      setLoading(false);
    }
  };

  const reloadRoles = async () => {
    try { setRoles((await api.listRoles()) || []); } catch { /* keep current list */ }
  };

  useEffect(() => { if (authed) loadData(); }, [authed]);

  const roleName = (id) => (roles.find((r) => Number(r.id) === Number(id)) || {}).name || "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.designation, u.department, u.role_name].some((v) => (v || "").toLowerCase().includes(q)));
  }, [users, search]);

  const openCreate = () => setModal({ mode: "create", form: { ...EMPTY_FORM } });
  const openEdit = (u) => setModal({
    mode: "edit", id: u.id,
    form: {
      name: u.name || "", email: u.email || "", password: "", roleId: u.role_id || "",
      status: u.status || "ACTIVE", department: u.department || "", designation: u.designation || "",
      employeeId: u.employee_id || "", phone: u.phone || "", approvalLimit: u.approval_limit ?? "",
      photo: u.photo || ""
    }
  });

  // Super Admin and Developer may see current passwords and delete users.
  const canViewPasswords = me?.roleCode === "super_admin" || me?.roleCode === "developer";
  const canDelete = canViewPasswords;
  // One dialog per user: current password (if viewable) + set a new one + delete.
  const [pwdView, setPwdView] = useState(null); // { user, password, reason, loading }
  const [delArmed, setDelArmed] = useState(false); // second click confirms a delete

  const openPasswordDialog = async (u) => {
    setResetPwd("");
    setDelArmed(false);
    setPwdView({ user: u, password: null, reason: null, loading: canViewPasswords });
    if (!canViewPasswords) return;
    try {
      const res = await api.viewPassword(u.id);
      setPwdView((v) => (v && v.user.id === u.id ? { ...v, password: res.password, reason: res.reason, loading: false } : v));
    } catch (e) {
      setPwdView(null);
      flash(e.message || "Could not load the password.", "err");
    }
  };

  const pickFormPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const photo = await fileToProfilePhoto(file);
      setModal((m) => ({ ...m, form: { ...m.form, photo } }));
    } catch (err) {
      flash(err.message, "err");
    }
  };

  const saveUser = async () => {
    const f = modal.form;
    try {
      if (modal.mode === "create") {
        await api.createUser(f);
        flash(`User "${f.name}" created. Temporary password set — they must change it at first sign-in.`);
      } else {
        await api.updateUser(modal.id, f);
        if (session && Number(session.id) === Number(modal.id)) session.updateUser?.({ name: f.name, photo: f.photo || null });
        flash(`User "${f.name}" updated.`);
      }
      setModal(null);
      loadData();
    } catch (e) {
      flash(e.message || "Save failed.", "err");
    }
  };

  const toggleStatus = async (u) => {
    try {
      await api.setUserStatus(u.id, u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      flash(`"${u.name}" is now ${u.status === "ACTIVE" ? "inactive" : "active"}.`);
      loadData();
    } catch (e) {
      flash(e.message || "Could not change status.", "err");
    }
  };

  const doReset = async () => {
    const u = pwdView.user;
    try {
      await api.resetPassword(u.id, resetPwd);
      flash(`Password reset for "${u.name}". They must change it at next sign-in.`);
      setResetPwd("");
      if (canViewPasswords) openPasswordDialog(u); // show the new current password straight away
    } catch (e) {
      flash(e.message || "Reset failed.", "err");
    }
  };

  const doDelete = async () => {
    const u = pwdView.user;
    try {
      await api.deleteUser(u.id);
      flash(`User "${u.name}" deleted.`);
      setPwdView(null);
      setDelArmed(false);
      loadData();
    } catch (e) {
      flash(e.message || "Could not delete user.", "err");
    }
  };

  const signOut = async () => { await api.logout(); setAuthed(false); setMe(null); };

  // ---- shell ----
  const shell = (children) => (
    <div style={{ height: "100%", background: bg, color: text, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: cardBg, borderBottom: `1px solid ${border}` }}>
        {onOpenSidebar && (
          <button onClick={onOpenSidebar} title="Menu" style={iconBtn(border, text)}><Menu size={18} /></button>
        )}
        <button onClick={onBackToHome} title="Home" style={iconBtn(border, text)}><ChevronLeft size={18} /></button>
        <UsersIcon size={20} color={accent} />
        <div style={{ fontWeight: 800, fontSize: 18 }}>Users</div>
        <div style={{ color: sub, fontSize: 13 }}>Settings / Users</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {me && <span style={{ fontSize: 13, color: sub }}>Signed in as <b style={{ color: text }}>{me.name}</b></span>}
          {authed && <button onClick={signOut} style={ghostBtn(border, text)}><LogOut size={15} /> Sign out</button>}
        </div>
      </div>
      <div style={{ padding: 20, flex: 1 }}>{children}</div>
      {toast && (
        <div style={{
          position: "fixed", bottom: 22, right: 22, zIndex: 60, padding: "12px 18px", borderRadius: 10,
          background: toast.kind === "err" ? "#b91c1c" : "#0f766e", color: "#fff", fontWeight: 600,
          maxWidth: 420, boxShadow: "0 10px 30px rgba(0,0,0,.25)"
        }}>{toast.message}</div>
      )}
    </div>
  );

  if (checking) return shell(<div style={{ color: sub }}>Checking session…</div>);
  if (!authed) return shell(<LoginCard dark={dark} onSignedIn={async () => { setChecking(true); try { setMe(await api.me()); setAuthed(true); } finally { setChecking(false); } }} flash={flash} />);

  return shell(
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={openCreate} style={primaryBtn(accent)}><Plus size={16} /> Create User</button>
        <button onClick={() => setRolesOpen(true)} style={ghostBtn(border, text)}><Tags size={16} /> Manage Roles</button>
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: sub }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, role…"
            style={{ ...input(border, cardBg, text), paddingLeft: 32, width: 280 }} />
        </div>
      </div>

      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: dark ? "#0b1324" : "#f8fafc", textAlign: "left", color: sub }}>
              {["Name", "Email (login)", "Role", "Department", "Designation", "Status", "Last Login", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", borderBottom: `1px solid ${border}`, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 24, color: sub }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 24, color: sub }}>No users.</td></tr>}
            {!loading && filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                <td style={{ padding: "8px 14px", fontWeight: 700 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={u.name} photo={u.photo} size={30} />
                    {u.name}
                  </span>
                </td>
                <td style={{ padding: "11px 14px", color: sub }}>{u.email}</td>
                <td style={{ padding: "11px 14px" }}>
                  {u.role_name || "—"}{u.wildcard && <span style={badge("#5b21b6")}>FULL</span>}
                </td>
                <td style={{ padding: "11px 14px" }}>{u.department || "—"}</td>
                <td style={{ padding: "11px 14px" }}>{u.designation || "—"}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={badge(u.status === "ACTIVE" ? "#15803d" : "#64748b")}>{u.status}</span>
                </td>
                <td style={{ padding: "11px 14px", color: sub, whiteSpace: "nowrap" }}>{fmtDate(u.last_login_at)}</td>
                <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
                  <button title="Edit" onClick={() => openEdit(u)} style={iconBtn(border, text)}><Pencil size={15} /></button>
                  <button title="Access (RBAC)" onClick={() => onOpenAccess && onOpenAccess(u)} style={{ ...iconBtn(border, accent), marginLeft: 6 }}><ShieldCheck size={15} /></button>
                  <button title={u.status === "ACTIVE" ? "Deactivate" : "Activate"} onClick={() => toggleStatus(u)} style={{ ...iconBtn(border, u.status === "ACTIVE" ? "#b45309" : "#15803d"), marginLeft: 6 }}><Power size={15} /></button>
                  <button title="Password (current / new)" onClick={() => openPasswordDialog(u)} style={{ ...iconBtn(border, text), marginLeft: 6 }}><KeyRound size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === "create" ? "Create User" : `Edit User — ${modal.form.name}`} onClose={() => setModal(null)} dark={dark}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <Avatar name={modal.form.name || "?"} photo={modal.form.photo} size={64} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.85, marginBottom: 6 }}>Profile picture (optional)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ ...ghostBtn(border, text), cursor: "pointer" }}>
                  <Camera size={15} /> {modal.form.photo ? "Change" : "Upload"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={pickFormPhoto} />
                </label>
                {modal.form.photo && (
                  <button type="button" onClick={() => setModal({ ...modal, form: { ...modal.form, photo: "" } })} style={ghostBtn(border, "#b91c1c")}>
                    <Trash2 size={15} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Full Name *"><input style={input(border, cardBg, text)} value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} /></Field>
            <Field label="Email (login) *">
              <CompanyEmailInput
                value={modal.form.email} border={border} bg={cardBg} text={text} sub={sub} placeholder="name"
                onChange={(email) => setModal((m) => ({ ...m, form: { ...m.form, email } }))}
              />
            </Field>
            {modal.mode === "create" && (
              <Field label="Temporary Password * (min 8)"><input type="text" style={input(border, cardBg, text)} value={modal.form.password} onChange={(e) => setModal({ ...modal, form: { ...modal.form, password: e.target.value } })} /></Field>
            )}
            <Field label="Role *">
              <select style={input(border, cardBg, text)} value={modal.form.roleId} onChange={(e) => setModal({ ...modal, form: { ...modal.form, roleId: e.target.value } })}>
                <option value="">— select —</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.wildcard ? " (full access)" : ""}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select style={input(border, cardBg, text)} value={modal.form.status} onChange={(e) => setModal({ ...modal, form: { ...modal.form, status: e.target.value } })}>
                <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
              </select>
            </Field>
            <Field label="Department"><input style={input(border, cardBg, text)} value={modal.form.department} onChange={(e) => setModal({ ...modal, form: { ...modal.form, department: e.target.value } })} /></Field>
            <Field label="Designation"><input style={input(border, cardBg, text)} value={modal.form.designation} onChange={(e) => setModal({ ...modal, form: { ...modal.form, designation: e.target.value } })} /></Field>
            <Field label="Employee ID"><input style={input(border, cardBg, text)} value={modal.form.employeeId} onChange={(e) => setModal({ ...modal, form: { ...modal.form, employeeId: e.target.value } })} /></Field>
            <Field label="Phone"><input style={input(border, cardBg, text)} value={modal.form.phone} onChange={(e) => setModal({ ...modal, form: { ...modal.form, phone: e.target.value } })} /></Field>
            <Field label="Approval Limit (₹)"><input style={input(border, cardBg, text)} value={modal.form.approvalLimit} onChange={(e) => setModal({ ...modal, form: { ...modal.form, approvalLimit: e.target.value } })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button onClick={() => setModal(null)} style={ghostBtn(border, text)}>Cancel</button>
            <button onClick={saveUser} style={primaryBtn(accent)}>{modal.mode === "create" ? "Create" : "Save"}</button>
          </div>
        </Modal>
      )}

      {pwdView && (
        <Modal title={`Password — ${pwdView.user.name}`} onClose={() => setPwdView(null)} dark={dark}>
          {canViewPasswords && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current password</div>
              {pwdView.loading ? (
                <div style={{ color: sub, fontSize: 13.5 }}>Loading…</div>
              ) : pwdView.password ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, border: `1px solid ${border}`, background: dark ? "#0b1324" : "#f8fafc", fontFamily: "Consolas, 'Courier New', monospace", fontSize: 16, fontWeight: 700, wordBreak: "break-all" }}>
                    <span style={{ flex: 1 }}>{pwdView.password}</span>
                    <button title="Copy" onClick={() => { navigator.clipboard?.writeText(pwdView.password); flash("Password copied."); }} style={iconBtn(border, text)}><Copy size={15} /></button>
                  </div>
                  <p style={{ color: sub, fontSize: 12, marginTop: 8 }}>Viewing is recorded in the audit log.</p>
                </>
              ) : (
                <p style={{ color: sub, fontSize: 13.5, margin: 0 }}>{pwdView.reason || "No viewable password is stored for this user."}</p>
              )}
            </div>
          )}

          <div style={{ borderTop: canViewPasswords ? `1px solid ${border}` : "none", paddingTop: canViewPasswords ? 16 : 0 }}>
            <Field label="Set a new password (min 8)">
              <input type="text" style={input(border, cardBg, text)} value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} placeholder="New temporary password" />
            </Field>
            <p style={{ color: sub, fontSize: 12, marginTop: 8 }}>The user must change it at next sign-in. Their active sessions are ended.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={doReset} disabled={resetPwd.length < 8} style={{ ...primaryBtn(accent), opacity: resetPwd.length < 8 ? 0.5 : 1 }}>Set password</button>
            </div>
          </div>

          {canDelete && session && Number(session.id) !== Number(pwdView.user.id) && (
            <div style={{ borderTop: `1px solid ${border}`, marginTop: 18, paddingTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: sub, marginRight: "auto" }}>Delete this user permanently? Their history stays in the audit log.</span>
              {!delArmed ? (
                <button onClick={() => setDelArmed(true)} style={ghostBtn(border, "#b91c1c")}><Trash2 size={15} /> Delete user</button>
              ) : (
                <>
                  <button onClick={() => setDelArmed(false)} style={ghostBtn(border, text)}>Cancel</button>
                  <button onClick={doDelete} style={{ ...primaryBtn("#b91c1c") }}><Trash2 size={15} /> Confirm delete</button>
                </>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={() => setPwdView(null)} style={ghostBtn(border, text)}>Close</button>
          </div>
        </Modal>
      )}

      {rolesOpen && (
        <RoleMaster
          dark={dark}
          onClose={() => setRolesOpen(false)}
          onChanged={reloadRoles}
          flash={flash}
        />
      )}

    </>
  );
}

function LoginCard({ dark, onSignedIn, flash }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const cardBg = dark ? "#111827" : "#ffffff";
  const text = dark ? "#e2e8f0" : "#0f172a";
  const border = dark ? "#1f2937" : "#e2e8f0";
  const sub = dark ? "#94a3b8" : "#64748b";
  const submit = async () => {
    setBusy(true);
    try { await api.login(email, password); await onSignedIn(); }
    catch (e) { flash(e.message || "Sign-in failed.", "err"); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ maxWidth: 380, margin: "8vh auto", background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 28, color: text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <ShieldCheck size={22} color="#0f766e" /><h2 style={{ margin: 0, fontSize: 20 }}>Admin sign-in</h2>
      </div>
      <p style={{ color: sub, fontSize: 13, marginTop: 0 }}>Managing users and access requires an Admin or Developer account.</p>
      <Field label="Email"><input style={input(border, cardBg, text)} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></Field>
      <div style={{ height: 10 }} />
      <Field label="Password"><input type="password" style={input(border, cardBg, text)} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></Field>
      <button onClick={submit} disabled={busy} style={{ ...primaryBtn("#0f766e"), width: "100%", marginTop: 16, justifyContent: "center", opacity: busy ? 0.7 : 1 }}>{busy ? "Signing in…" : "Sign in"}</button>
    </div>
  );
}

function RoleMaster({ dark, onClose, onChanged, flash }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState({ id: null, name: "", description: "" }); // id null = create
  const [confirmId, setConfirmId] = useState(null);

  const cardBg = dark ? "#111827" : "#ffffff";
  const text = dark ? "#e2e8f0" : "#0f172a";
  const sub = dark ? "#94a3b8" : "#64748b";
  const border = dark ? "#1f2937" : "#e2e8f0";
  const accent = "#0f766e";

  const load = async () => {
    setLoading(true);
    try { setList((await api.listRoles()) || []); }
    catch (e) { flash(e.message || "Failed to load roles.", "err"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => setEdit({ id: null, name: "", description: "" });

  const save = async () => {
    const name = edit.name.trim();
    if (!name) { flash("Role name is required.", "err"); return; }
    setBusy(true);
    try {
      if (edit.id == null) {
        await api.createRole({ name, description: edit.description });
        flash(`Role "${name}" created.`);
      } else {
        await api.updateRole(edit.id, { name, description: edit.description });
        flash(`Role "${name}" updated.`);
      }
      resetForm();
      await load();
      onChanged && onChanged();
    } catch (e) {
      flash(e.message || "Could not save role.", "err");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    setBusy(true);
    try {
      await api.deleteRole(r.id);
      flash(`Role "${r.name}" deleted.`);
      setConfirmId(null);
      if (edit.id === r.id) resetForm();
      await load();
      onChanged && onChanged();
    } catch (e) {
      flash(e.message || "Could not delete role.", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Role Master" onClose={onClose} dark={dark}>
      <p style={{ color: sub, fontSize: 12.5, marginTop: 0 }}>
        Roles are labels only — they do not grant any access. Set each user's actual permissions from the
        Access button on the Users list. Super Admin and Developer are built in and cannot be changed here.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 10, alignItems: "end", margin: "6px 0 16px" }}>
        <Field label={edit.id == null ? "New role name *" : "Role name *"}>
          <input style={input(border, cardBg, text)} value={edit.name}
            placeholder="e.g. Site Engineer"
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()} />
        </Field>
        <Field label="Description (optional)">
          <input style={input(border, cardBg, text)} value={edit.description}
            placeholder="A short note about this role"
            onChange={(e) => setEdit({ ...edit, description: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()} />
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          {edit.id != null && <button onClick={resetForm} style={ghostBtn(border, text)}>Cancel</button>}
          <button onClick={save} disabled={busy} style={{ ...primaryBtn(accent), opacity: busy ? 0.7 : 1 }}>
            {edit.id == null ? <><Plus size={15} /> Add</> : <><Pencil size={15} /> Save</>}
          </button>
        </div>
      </div>

      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: dark ? "#0b1324" : "#f8fafc", textAlign: "left", color: sub }}>
              {["Role", "Description", "Users", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${border}`, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} style={{ padding: 20, color: sub }}>Loading…</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={4} style={{ padding: 20, color: sub }}>No roles yet.</td></tr>}
            {!loading && list.map((r) => {
              const builtIn = r.is_system === true;
              const count = Number(r.user_count || 0);
              return (
                <tr key={r.id} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>
                    {r.name}
                    {builtIn && <span style={badge("#5b21b6")}><Lock size={9} style={{ verticalAlign: "-1px", marginRight: 3 }} />BUILT-IN</span>}
                  </td>
                  <td style={{ padding: "10px 14px", color: sub }}>{r.description || "—"}</td>
                  <td style={{ padding: "10px 14px", color: sub }}>{count}</td>
                  <td style={{ padding: "8px 14px", whiteSpace: "nowrap", textAlign: "right" }}>
                    {builtIn ? (
                      <span style={{ color: sub, fontSize: 12 }}>—</span>
                    ) : confirmId === r.id ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: sub, fontSize: 12 }}>Delete?</span>
                        <button onClick={() => remove(r)} disabled={busy} style={{ ...iconBtn(border, "#b91c1c") }} title="Confirm delete"><Trash2 size={15} /></button>
                        <button onClick={() => setConfirmId(null)} style={iconBtn(border, text)} title="Cancel"><X size={15} /></button>
                      </span>
                    ) : (
                      <>
                        <button title="Edit" onClick={() => setEdit({ id: r.id, name: r.name, description: r.description || "" })} style={iconBtn(border, text)}><Pencil size={15} /></button>
                        <button title={count > 0 ? "In use — reassign users first" : "Delete"} onClick={() => setConfirmId(r.id)} style={{ ...iconBtn(border, "#b45309"), marginLeft: 6 }}><Trash2 size={15} /></button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={ghostBtn(border, text)}>Done</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose, dark }) {
  const cardBg = dark ? "#111827" : "#ffffff";
  const text = dark ? "#e2e8f0" : "#0f172a";
  const border = dark ? "#1f2937" : "#e2e8f0";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 16px", overflow: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(680px, 100%)", background: cardBg, color: text, border: `1px solid ${border}`, borderRadius: 14, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ ...iconBtn(border, text), marginLeft: "auto" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const AVATAR_PALETTE = ["#c51f28", "#0f766e", "#1d4ed8", "#7c3aed", "#b45309", "#0e7490"];
function Avatar({ name, photo, size = 32 }) {
  if (photo) {
    return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #e2e8f0" }} />;
  }
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const initials = parts.length ? (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase() : "?";
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: AVATAR_PALETTE[h % AVATAR_PALETTE.length], color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.38) }}>
      {initials}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>
      <span style={{ display: "block", marginBottom: 5, opacity: 0.85 }}>{label}</span>
      {children}
    </label>
  );
}

const fmtDate = (v) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return String(v); }
};
const iconBtn = (border, color) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color, cursor: "pointer" });
const primaryBtn = (accent) => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "none", background: accent, color: "#fff", fontWeight: 700, cursor: "pointer" });
const ghostBtn = (border, color) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: `1px solid ${border}`, background: "transparent", color, fontWeight: 600, cursor: "pointer" });
const input = (border, bg, color) => ({ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${border}`, background: bg, color, fontSize: 13.5, boxSizing: "border-box" });
const badge = (color) => ({ display: "inline-block", marginLeft: 6, padding: "2px 8px", borderRadius: 999, background: color, color: "#fff", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3, verticalAlign: "middle" });
