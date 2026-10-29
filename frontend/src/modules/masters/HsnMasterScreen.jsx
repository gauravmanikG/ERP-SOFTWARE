import React, { useEffect, useMemo, useState } from "react";
import { hsnApi } from "./api";
import { inp, label, btn, card, errorBox, th, thFor, td, qty } from "../purchase/newpo/ui";

const TYPES = ["GOODS", "SERVICE"];
const EMPTY_FORM = { code: "", type: "GOODS", description: "", gstRate: "", cgstRate: "", sgstRate: "", igstRate: "" };

// Returns a message when the four rates do not agree, or null when they do.
// The user types all four. CGST + SGST must equal GST, and IGST must equal GST.
function rateProblem(r) {
  const values = [r.gstRate, r.cgstRate, r.sgstRate, r.igstRate].map((v) => (v === "" || v == null ? NaN : Number(v)));
  if (values.some((v) => Number.isNaN(v) || v < 0)) return "Enter GST %, CGST %, SGST % and IGST % (0 or more).";
  const [gst, cgst, sgst, igst] = values;
  if (Math.abs(cgst + sgst - gst) > 0.001) return "CGST % + SGST % must equal GST %.";
  if (Math.abs(igst - gst) > 0.001) return "IGST % must equal GST %.";
  return null;
}

// HSN/SAC codes. The user enters GST, CGST, SGST and IGST for each code; the screen does not derive them.
export default function HsnMasterScreen({ flash }) {
  const [rows, setRows] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  // Every code is loaded once, deleted ones included, so a duplicate can be caught before saving.
  const load = () =>
    hsnApi.list(true)
      .then((r) => { setRows(r); setLoadError(""); })
      .catch((e) => setLoadError(e.message));

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => showDeleted || r.isActive)
      .filter((r) => !q || r.hsnSacCode.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [rows, search, showDeleted]);

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

  const formCheck = rateProblem(form);
  const formValid = form.code.trim() && form.description.trim() && !formCheck;

  const ratesBody = (r) => ({
    gstRate: Number(r.gstRate),
    cgstRate: Number(r.cgstRate),
    sgstRate: Number(r.sgstRate),
    igstRate: Number(r.igstRate)
  });

  const add = () => {
    const code = form.code.trim();
    if (rows.some((r) => r.hsnSacCode === code)) {
      setFormError(`HSN/SAC code ${code} already exists. Edit it in the list below instead.`);
      return;
    }
    run(async () => {
      await hsnApi.create({ hsnSacCode: code, type: form.type, description: form.description.trim(), ...ratesBody(form) });
      setForm(EMPTY_FORM);
    }, `HSN/SAC ${code} added.`);
  };

  const editProblem = editing ? rateProblem(editing) : null;

  const saveEdit = () => run(async () => {
    await hsnApi.update(editing.code, { description: editing.description.trim(), type: editing.type, ...ratesBody(editing) });
    setEditing(null);
  }, `HSN/SAC ${editing.code} updated.`);

  const remove = (row) => {
    if (!window.confirm(`Delete HSN/SAC ${row.hsnSacCode}? It will be hidden from new purchase orders. Existing POs keep it.`)) return;
    run(() => hsnApi.remove(row.hsnSacCode), `HSN/SAC ${row.hsnSacCode} deleted.`);
  };

  const restore = (row) => run(() => hsnApi.update(row.hsnSacCode, { isActive: true }), `HSN/SAC ${row.hsnSacCode} restored.`);

  const smallBtn = { ...btn(false), padding: "3px 10px", fontSize: 11 };
  const pct = { ...inp, width: 90, textAlign: "right" };
  const set = (patch) => setForm({ ...form, ...patch });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={card}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "140px 120px minmax(200px, 1fr)", alignItems: "end" }}>
          <div>
            <span style={label}>HSN / SAC code</span>
            <input style={inp} value={form.code} onChange={(e) => set({ code: e.target.value })} />
          </div>
          <div>
            <span style={label}>Type</span>
            <select style={inp} value={form.type} onChange={(e) => set({ type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Description</span>
            <input style={inp} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(4, 110px) auto", alignItems: "end", marginTop: 10 }}>
          <div>
            <span style={label}>GST %</span>
            <input style={pct} type="number" min="0" step="0.01" value={form.gstRate} onChange={(e) => set({ gstRate: e.target.value })} />
          </div>
          <div>
            <span style={label}>CGST %</span>
            <input style={pct} type="number" min="0" step="0.01" value={form.cgstRate} onChange={(e) => set({ cgstRate: e.target.value })} />
          </div>
          <div>
            <span style={label}>SGST %</span>
            <input style={pct} type="number" min="0" step="0.01" value={form.sgstRate} onChange={(e) => set({ sgstRate: e.target.value })} />
          </div>
          <div>
            <span style={label}>IGST %</span>
            <input style={pct} type="number" min="0" step="0.01" value={form.igstRate} onChange={(e) => set({ igstRate: e.target.value })} />
          </div>
          <button type="button" style={btn(true)} onClick={add} disabled={busy || !formValid}>Add HSN code</button>
        </div>
        {(formError || (form.gstRate !== "" && formCheck)) && (
          <div style={{ ...errorBox, marginTop: 10 }}>{formError || formCheck}</div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>HSN / SAC codes ({visible.length})</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input style={{ ...inp, width: 240 }} placeholder="Search code or description" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} /> Show deleted
            </label>
          </div>
        </div>

        {loadError && <div style={errorBox}>{loadError}</div>}

        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{["HSN / SAC", "Type", "Description", "GST %", "CGST %", "SGST %", "IGST %", "Status", ""].map((h) => <th key={h} style={thFor(h)}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: "#64748b", padding: 16 }}>No HSN codes match.</td></tr>
              )}
              {visible.map((r) => {
                const isEditing = editing && editing.code === r.hsnSacCode;
                return (
                  <tr key={r.hsnSacCode} style={{ opacity: r.isActive ? 1 : 0.6, verticalAlign: "top" }}>
                    <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{r.hsnSacCode}</td>
                    <td style={td}>
                      {isEditing ? (
                        <select style={inp} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : r.type}
                    </td>
                    <td style={td}>
                      {isEditing ? (
                        <input style={inp} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                      ) : r.description}
                    </td>
                    {["gstRate", "cgstRate", "sgstRate", "igstRate"].map((field) => (
                      <td key={field} style={{ ...td, textAlign: "right" }}>
                        {isEditing ? (
                          <input style={{ ...pct, width: 80 }} type="number" min="0" step="0.01" value={editing[field]}
                            onChange={(e) => setEditing({ ...editing, [field]: e.target.value })} />
                        ) : qty(r[field])}
                      </td>
                    ))}
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
                            onClick={saveEdit} disabled={busy || !editing.description.trim() || !!editProblem}>Save</button>
                          <button type="button" style={smallBtn} onClick={() => setEditing(null)}>Cancel</button>
                          {editProblem && <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 4 }}>{editProblem}</div>}
                        </>
                      ) : r.isActive ? (
                        <>
                          <button type="button" style={{ ...smallBtn, marginRight: 6 }}
                            onClick={() => setEditing({
                              code: r.hsnSacCode, type: r.type, description: r.description,
                              gstRate: String(r.gstRate), cgstRate: String(r.cgstRate), sgstRate: String(r.sgstRate), igstRate: String(r.igstRate)
                            })}>Edit</button>
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
