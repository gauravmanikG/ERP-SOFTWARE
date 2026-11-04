import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, ChevronLeft, Menu, Save, RotateCcw } from "lucide-react";
import * as api from "../admin/api";

// key helper: module.entity:action
const keyOf = (moduleName, entity, action) => `${moduleName.toLowerCase()}.${entity}:${action}`;

export function RbacPage({ user, dark = false, onBack, onBackToHome, onOpenSidebar }) {
  const [catalog, setCatalog] = useState(null);
  const [data, setData] = useState(null);       // userPermissions response
  const [checked, setChecked] = useState(new Set());
  const [roleKeys, setRoleKeys] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [moduleFilter, setModuleFilter] = useState("ALL");

  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const text = dark ? "#e2e8f0" : "#0f172a";
  const sub = dark ? "#94a3b8" : "#64748b";
  const border = dark ? "#1f2937" : "#e2e8f0";
  const accent = "#0f766e";

  const flash = (message, kind = "ok") => { setToast({ message, kind }); setTimeout(() => setToast(null), 3000); };

  const wildcard = data?.wildcard === true;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cat, perms] = await Promise.all([api.rbacCatalog(), api.userPermissions(user.id)]);
        setCatalog(cat);
        setData(perms);
        setRoleKeys(new Set(perms.roleKeys || []));
        setChecked(new Set(perms.effective || []));
      } catch (e) {
        flash(e.message || "Failed to load permissions.", "err");
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const actionLabel = useMemo(() => {
    const m = {};
    (catalog?.columns || []).forEach((c) => { m[c.action] = c.label; });
    return m;
  }, [catalog]);

  const modules = catalog?.modules || [];
  const visibleModules = moduleFilter === "ALL" ? modules : modules.filter((m) => m.module === moduleFilter);

  const toggle = (k) => {
    if (wildcard) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  // all actions used within a module, in catalog column order
  const moduleActions = (mod) => {
    const used = new Set();
    mod.entities.forEach((e) => e.actions.forEach((a) => used.add(a)));
    return (catalog.columns || []).map((c) => c.action).filter((a) => used.has(a));
  };

  const toggleRow = (mod, entity, on) => {
    if (wildcard) return;
    setChecked((prev) => {
      const next = new Set(prev);
      entity.actions.forEach((a) => {
        const k = keyOf(mod.module, entity.entity, a);
        if (on) next.add(k); else next.delete(k);
      });
      return next;
    });
  };

  const resetToRole = () => { if (!wildcard) setChecked(new Set(roleKeys)); };

  const save = async () => {
    if (wildcard) return;
    setSaving(true);
    try {
      const permissions = {};
      checked.forEach((k) => { permissions[k] = true; });
      const res = await api.savePermissions(user.id, permissions);
      setData(res);
      setRoleKeys(new Set(res.roleKeys || []));
      setChecked(new Set(res.effective || []));
      flash("Permissions saved.");
    } catch (e) {
      flash(e.message || "Save failed.", "err");
    } finally {
      setSaving(false);
    }
  };

  const overrideCount = useMemo(() => {
    let n = 0;
    const all = new Set([...checked, ...roleKeys]);
    all.forEach((k) => { if (checked.has(k) !== roleKeys.has(k)) n++; });
    return n;
  }, [checked, roleKeys]);

  return (
    <div style={{ height: "100%", background: bg, color: text, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: cardBg, borderBottom: `1px solid ${border}`, position: "sticky", top: 0, zIndex: 5 }}>
        {onOpenSidebar && <button onClick={onOpenSidebar} style={iconBtn(border, text)}><Menu size={18} /></button>}
        <button onClick={onBack} title="Back to Users" style={iconBtn(border, text)}><ChevronLeft size={18} /></button>
        <ShieldCheck size={20} color={accent} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Access Permissions for: {user.name}</div>
          <div style={{ color: sub, fontSize: 12.5 }}>
            Role: {data?.user?.role_name || "—"}
            {wildcard && <b style={{ color: "#5b21b6" }}> · Full access (not editable)</b>}
            {!wildcard && <> · {overrideCount} override{overrideCount === 1 ? "" : "s"} from role</>}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={input(border, cardBg, text)}>
            <option value="ALL">All modules</option>
            {modules.map((m) => <option key={m.module} value={m.module}>{m.module}</option>)}
          </select>
          {!wildcard && <button onClick={resetToRole} style={ghostBtn(border, text)}><RotateCcw size={15} /> Reset to role</button>}
          {!wildcard && <button onClick={save} disabled={saving} style={{ ...primaryBtn(accent), opacity: saving ? 0.7 : 1 }}><Save size={15} /> {saving ? "Saving…" : "Save"}</button>}
        </div>
      </div>

      <div style={{ padding: 20, flex: 1 }}>
        {loading && <div style={{ color: sub }}>Loading permissions…</div>}
        {wildcard && !loading && (
          <div style={{ padding: 14, borderRadius: 10, background: dark ? "#2e1065" : "#f3e8ff", color: dark ? "#e9d5ff" : "#5b21b6", marginBottom: 16, fontSize: 13.5 }}>
            This user's role has full access to every operation. The grid is shown for reference and cannot be changed here.
          </div>
        )}
        {!loading && visibleModules.map((mod) => {
          const cols = moduleActions(mod);
          return (
            <div key={mod.module} style={{ marginBottom: 22 }}>
              <div style={{ fontWeight: 800, fontSize: 14, margin: "6px 2px 8px", color: accent }}>{mod.module}</div>
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: dark ? "#0b1324" : "#f8fafc", color: sub }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: `1px solid ${border}`, minWidth: 220, position: "sticky", left: 0, background: dark ? "#0b1324" : "#f8fafc" }}>Entity / Screen</th>
                      {cols.map((a) => <th key={a} style={{ padding: "10px 8px", borderBottom: `1px solid ${border}`, textAlign: "center", whiteSpace: "nowrap", fontWeight: 700 }}>{actionLabel[a] || a}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {mod.entities.map((e) => {
                      const supported = new Set(e.actions);
                      const rowKeys = e.actions.map((a) => keyOf(mod.module, e.entity, a));
                      const allOn = rowKeys.every((k) => checked.has(k) || wildcard);
                      return (
                        <tr key={e.entity} style={{ borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: "9px 14px", fontWeight: 600, position: "sticky", left: 0, background: cardBg }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: wildcard ? "default" : "pointer" }}>
                              <input type="checkbox" disabled={wildcard} checked={allOn} onChange={(ev) => toggleRow(mod, e, ev.target.checked)} />
                              {e.label}
                            </label>
                          </td>
                          {cols.map((a) => {
                            if (!supported.has(a)) return <td key={a} style={{ textAlign: "center", color: dark ? "#334155" : "#cbd5e1" }}>—</td>;
                            const k = keyOf(mod.module, e.entity, a);
                            const on = wildcard || checked.has(k);
                            const isOverride = !wildcard && (checked.has(k) !== roleKeys.has(k));
                            return (
                              <td key={a} style={{ textAlign: "center", padding: "7px 8px", background: isOverride ? (dark ? "#422006" : "#fef9c3") : "transparent" }}>
                                <input type="checkbox" disabled={wildcard} checked={on} onChange={() => toggle(k)} title={isOverride ? "Differs from role default" : ""} />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {!loading && (
          <div style={{ color: sub, fontSize: 12, marginTop: 8 }}>
            Highlighted cells differ from the role default. Saving stores only those differences, so later changes to the role still apply.
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 60, padding: "12px 18px", borderRadius: 10, background: toast.kind === "err" ? "#b91c1c" : "#0f766e", color: "#fff", fontWeight: 600, maxWidth: 420, boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>{toast.message}</div>
      )}
    </div>
  );
}

const iconBtn = (border, color) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color, cursor: "pointer" });
const primaryBtn = (accent) => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "none", background: accent, color: "#fff", fontWeight: 700, cursor: "pointer" });
const ghostBtn = (border, color) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: `1px solid ${border}`, background: "transparent", color, fontWeight: 600, cursor: "pointer" });
const input = (border, bg, color) => ({ padding: "8px 11px", borderRadius: 8, border: `1px solid ${border}`, background: bg, color, fontSize: 13 });
