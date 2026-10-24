import React, { useEffect, useMemo, useState } from "react";
import { masterApi } from "./api";
import { inp, label, btn, card, errorBox, th, td } from "../purchase/newpo/ui";

// One code-and-name master: add, rename, delete (deactivate) and restore entries.
// A code is generated when none is typed. Names are unique among active entries.
export default function CodeNameMasterScreen({ masterKey, title, flash }) {
  const [rows, setRows] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ code: "", name: "" });
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    masterApi.list(masterKey, showDeleted)
      .then((r) => { setRows(r); setLoadError(""); })
      .catch((e) => setLoadError(e.message));

  useEffect(() => {
    setEditing(null);
    setFormError("");
    load();
  }, [masterKey, showDeleted]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const run = async (action, message) => {
    setBusy(true);
    setFormError("");
    try {
      await action();
      flash(message);
      await load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const add = () => run(async () => {
    await masterApi.create(masterKey, { code: form.code.trim(), name: form.name.trim() });
    setForm({ code: "", name: "" });
  }, `${title}: entry added.`);

  const saveEdit = () => run(async () => {
    await masterApi.update(masterKey, editing.id, { name: editing.name.trim() });
    setEditing(null);
  }, `${title}: entry updated.`);

  const remove = (row) => {
    if (!window.confirm(`Delete "${row.name}" from ${title}? It will be hidden from new entries. Existing records keep it.`)) return;
    run(() => masterApi.remove(masterKey, row.id), `${title}: entry deleted.`);
  };

  const restore = (row) => run(() => masterApi.update(masterKey, row.id, { isActive: true }), `${title}: entry restored.`);

  const smallBtn = { ...btn(false), padding: "3px 10px", fontSize: 11 };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={card}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "160px minmax(260px, 1fr) auto", alignItems: "end" }}>
          <div>
            <span style={label}>Code</span>
            <input style={inp} value={form.code} placeholder="Leave blank for auto"
              onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <span style={label}>Name</span>
            <input style={inp} value={form.name} placeholder={`New ${title.toLowerCase()} entry`}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter" && form.name.trim()) add(); }} />
          </div>
          <button type="button" style={btn(true)} onClick={add} disabled={busy || !form.name.trim()}>Add entry</button>
        </div>
        {formError && <div style={{ ...errorBox, marginTop: 10 }}>{formError}</div>}
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{title} ({visible.length})</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input style={{ ...inp, width: 240 }} placeholder="Search code or name" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} /> Show deleted
            </label>
          </div>
        </div>

        {loadError && <div style={errorBox}>{loadError}</div>}

        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{["Code", "Name", "Status", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "#64748b", padding: 16 }}>No entries yet. Add one above.</td></tr>
              )}
              {visible.map((r) => {
                const isEditing = editing && editing.id === r.id;
                return (
                  <tr key={r.id} style={{ opacity: r.isActive ? 1 : 0.6 }}>
                    <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{r.code}</td>
                    <td style={td}>
                      {isEditing ? (
                        <input style={inp} value={editing.name} autoFocus
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editing.name.trim()) saveEdit();
                            if (e.key === "Escape") setEditing(null);
                          }} />
                      ) : r.name}
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                        background: r.isActive ? "rgba(16,185,129,0.12)" : "#f1f5f9", color: r.isActive ? "#047857" : "#64748b" }}>
                        {r.isActive ? "Active" : "Deleted"}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {isEditing ? (
                        <>
                          <button type="button" style={{ ...btn(true), padding: "3px 10px", fontSize: 11, marginRight: 6 }}
                            onClick={saveEdit} disabled={busy || !editing.name.trim()}>Save</button>
                          <button type="button" style={smallBtn} onClick={() => setEditing(null)}>Cancel</button>
                        </>
                      ) : r.isActive ? (
                        <>
                          <button type="button" style={{ ...smallBtn, marginRight: 6 }} onClick={() => setEditing({ id: r.id, name: r.name })}>Edit</button>
                          <button type="button" style={{ ...smallBtn, color: "#b91c1c" }} onClick={() => remove(r)} disabled={busy}>Delete</button>
                        </>
                      ) : (
                        <button type="button" style={smallBtn} onClick={() => restore(r)} disabled={busy}>Restore</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
