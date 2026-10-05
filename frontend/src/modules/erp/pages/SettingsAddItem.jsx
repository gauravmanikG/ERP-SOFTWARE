import { useEffect, useState } from "react";
import { Package, Plus, RefreshCw, CheckCircle2, AlertTriangle, ChevronLeft, Tags, ArrowRight, Trash2 } from "lucide-react";
import { SETTINGS_API, settingsTheme, parseApiError } from "./settingsTheme";

const UOM_OPTIONS = ["PCS", "KG", "LTR", "G", "MT", "MTR", "SET", "NOS", "BOX", "PAIR"];

function emptyDeptRow(departments) {
  const store = departments.find((d) => (d.name || "").toLowerCase() === "store");
  return { id: Date.now() + Math.random(), departmentName: store?.name || departments[0]?.name || "", openingBalance: "0" };
}

export function SettingsAddItem({ dark, onBack, onGoAddCategory, setPage }) {
  const t = settingsTheme(dark);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingOb, setAddingOb] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedItem, setSavedItem] = useState(null);
  const [savedOpenings, setSavedOpenings] = useState([]);
  const [extraDept, setExtraDept] = useState("");
  const [extraBal, setExtraBal] = useState("0");
  const [form, setForm] = useState({
    itemName: "",
    itemCode: "",
    category: "",
    description: "",
    unitOfMeasurement: "PCS",
  });
  const [deptRows, setDeptRows] = useState([]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const loadOpenings = async (code, category) => {
    if (!code || !category) return;
    const res = await fetch(`${SETTINGS_API}/api/inventory/opening-balances?itemCode=${encodeURIComponent(code)}&category=${encodeURIComponent(category)}`);
    const data = await res.json().catch(() => []);
    setSavedOpenings(Array.isArray(data) ? data : []);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, dRes, iRes] = await Promise.all([
        fetch(`${SETTINGS_API}/api/inventory/categories`),
        fetch(`${SETTINGS_API}/api/inventory/departments`),
        fetch(`${SETTINGS_API}/api/inventory/master`),
      ]);
      const cats = await cRes.json().catch(() => []);
      const depts = await dRes.json().catch(() => []);
      const masters = await iRes.json().catch(() => []);
      setCategories(Array.isArray(cats) ? cats : []);
      setDepartments(Array.isArray(depts) ? depts : []);
      setItems(Array.isArray(masters) ? masters : []);
    } catch {
      setError("Could not load item lists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openForm = () => {
    setShowForm(true);
    setSavedItem(null);
    setSavedOpenings([]);
    setError("");
    setSuccess("");
    setForm({
      itemName: "",
      itemCode: "",
      category: "",
      description: "",
      unitOfMeasurement: "PCS",
    });
    setDeptRows([emptyDeptRow(departments)]);
  };

  const updateDeptRow = (id, key, value) => {
    setDeptRows((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.itemName.trim()) { setError("Item name is required."); return; }
    if (!form.itemCode.trim()) { setError("Item code is required."); return; }
    if (!form.category) { setError("Category is required. If it is not in the list, create the category first."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    if (!form.unitOfMeasurement.trim()) { setError("Unit of measurement is required (e.g. PCS, KG, LTR)."); return; }
    if (!deptRows.length) { setError("Add at least one department opening balance."); return; }

    const departmentOpenings = [];
    const seen = new Set();
    for (let i = 0; i < deptRows.length; i++) {
      const row = deptRows[i];
      if (!row.departmentName) { setError(`Row ${i + 1}: select a department.`); return; }
      const key = row.departmentName.toLowerCase();
      if (seen.has(key)) { setError(`Department "${row.departmentName}" is listed twice. Use Add another department for a different department.`); return; }
      seen.add(key);
      const ob = Number(row.openingBalance);
      if (row.openingBalance === "" || Number.isNaN(ob) || ob < 0) {
        setError(`Row ${i + 1}: opening balance is required and cannot be negative.`);
        return;
      }
      departmentOpenings.push({ departmentName: row.departmentName, openingBalance: ob });
    }

    setSaving(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/master`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: form.itemName.trim(),
          itemCode: form.itemCode.trim(),
          category: form.category,
          description: form.description.trim(),
          unitOfMeasurement: form.unitOfMeasurement.trim(),
          departmentOpenings,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not save item."));
        return;
      }
      setSavedItem({ code: data.code, category: form.category, name: data.description });
      setSuccess(`Item ${data.code} saved. Add opening balance for more departments below if needed.`);
      setShowForm(false);
      setExtraDept("");
      setExtraBal("0");
      await load();
      await loadOpenings(data.code, form.category);
    } catch {
      setError("Could not save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMoreDept = async (e) => {
    e.preventDefault();
    if (!savedItem) return;
    if (!extraDept) { setError("Select a department for the extra opening balance."); return; }
    const ob = Number(extraBal);
    if (extraBal === "" || Number.isNaN(ob) || ob < 0) { setError("Opening balance is required and cannot be negative."); return; }
    setError("");
    setAddingOb(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/opening-balances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemCode: savedItem.code,
          category: savedItem.category,
          departmentName: extraDept,
          openingBalance: ob,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not add department opening balance."));
        return;
      }
      setSuccess(`Opening balance added for ${extraDept}. You can add another department.`);
      setExtraDept("");
      setExtraBal("0");
      await loadOpenings(savedItem.code, savedItem.category);
    } catch {
      setError("Could not add department opening balance.");
    } finally {
      setAddingOb(false);
    }
  };

  const usedDepts = new Set(savedOpenings.map((o) => (o.departmentName || "").toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860, paddingBottom: 40 }}>
      <div>
        <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", padding: 0, marginBottom: 10, color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <ChevronLeft size={16} /> Back to Settings
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Generate Item</h2>
        <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>
          Enter the item once, then set opening balance per department. Use Add another department for Store, Moulding, and so on — you do not re-enter the item.
        </p>
      </div>

      <div style={{ padding: 14, borderRadius: 16, background: dark ? "rgba(14,165,233,0.1)" : "#f0f9ff", border: `1px solid ${t.bdr}`, fontSize: 13, color: t.txtPrimary, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span>New category needed? Create it under Settings → Add a Category, then add the item.</span>
        <button type="button" onClick={onGoAddCategory} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "#0284c7", color: "#fff", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          <Tags size={14} /> Add a Category
        </button>
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(14,165,233,0.12)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>New material item</h3>
              <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>Item fields first, then one or more department + opening balance rows.</p>
            </div>
          </div>
          {!showForm && (
            <button type="button" onClick={openForm} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Plus size={16} /> New item
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSave} style={{ marginTop: 20, padding: 18, borderRadius: 16, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${t.bdr}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label style={{ gridColumn: "1 / -1" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Item name <span style={{ color: "#0ea5e9" }}>*</span></span>
                <input style={t.input} value={form.itemName} onChange={(e) => setField("itemName", e.target.value)} placeholder="e.g. Steel Sheet" autoFocus />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Item code <span style={{ color: "#0ea5e9" }}>*</span></span>
                <input style={t.input} value={form.itemCode} onChange={(e) => setField("itemCode", e.target.value)} placeholder="e.g. MAT-010" />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Category <span style={{ color: "#0ea5e9" }}>*</span></span>
                <select style={t.input} value={form.category} onChange={(e) => setField("category", e.target.value)}>
                  <option value="">Select existing category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.categoryName}>{c.categoryName}</option>
                  ))}
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Description <span style={{ color: "#0ea5e9" }}>*</span></span>
                <input style={t.input} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="What this item is (shown on Inventory)" />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Unit &amp; measurement <span style={{ color: "#0ea5e9" }}>*</span></span>
                <select style={t.input} value={form.unitOfMeasurement} onChange={(e) => setField("unitOfMeasurement", e.target.value)}>
                  {UOM_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
            </div>

            <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${t.bdr}` }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: t.txtPrimary, margin: "0 0 6px" }}>Opening balance by department <span style={{ color: "#0ea5e9" }}>*</span></p>
              <p style={{ fontSize: 12, color: t.txtMuted, margin: "0 0 12px" }}>Dept 1 + balance, then Add another department for Dept 2 + balance, and so on.</p>
              {deptRows.map((row, idx) => (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 40px", gap: 10, marginBottom: 10, alignItems: "end" }}>
                  <label>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Department {idx + 1}</span>
                    <select style={t.input} value={row.departmentName} onChange={(e) => updateDeptRow(row.id, "departmentName", e.target.value)}>
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Balance</span>
                    <input style={t.input} type="number" min="0" step="any" value={row.openingBalance} onChange={(e) => updateDeptRow(row.id, "openingBalance", e.target.value)} />
                  </label>
                  {deptRows.length > 1 && (
                    <button type="button" onClick={() => setDeptRows((rows) => rows.filter((r) => r.id !== row.id))} style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", height: 42 }} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDeptRows((rows) => [...rows, emptyDeptRow(departments)])}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px dashed ${t.bdr}`, background: "transparent", color: "#0284c7", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                <Plus size={14} /> Add another department
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="submit" disabled={saving} style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{saving ? "Saving…" : "Save item"}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "10px 18px", borderRadius: 12, border: `1px solid ${t.bdr}`, background: "transparent", color: t.txtMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </form>
        )}

        {savedItem && (
          <div style={{ marginTop: 20, padding: 18, borderRadius: 16, background: dark ? "rgba(16,185,129,0.08)" : "#ecfdf5", border: `1px solid ${t.bdr}` }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: t.txtPrimary, margin: "0 0 6px" }}>Item {savedItem.code} saved — add more department opening balances</p>
            <p style={{ fontSize: 12, color: t.txtMuted, margin: "0 0 12px" }}>{savedItem.name} · {savedItem.category}. You do not need to enter the item again.</p>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", color: t.txtPrimary, marginBottom: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", color: t.txtMuted }}>
                  <th style={{ padding: "6px 8px" }}>Department</th>
                  <th style={{ padding: "6px 8px" }}>Opening balance</th>
                </tr>
              </thead>
              <tbody>
                {savedOpenings.map((o) => (
                  <tr key={o.id} style={{ borderTop: `1px solid ${t.bdr}` }}>
                    <td style={{ padding: "6px 8px", fontWeight: 700 }}>{o.departmentName}</td>
                    <td style={{ padding: "6px 8px" }}>{o.openingBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form onSubmit={handleAddMoreDept} style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 10, alignItems: "end" }}>
              <label>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Another department</span>
                <select style={t.input} value={extraDept} onChange={(e) => setExtraDept(e.target.value)}>
                  <option value="">Select department</option>
                  {departments.filter((d) => !usedDepts.has((d.name || "").toLowerCase())).map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Balance</span>
                <input style={t.input} type="number" min="0" step="any" value={extraBal} onChange={(e) => setExtraBal(e.target.value)} />
              </label>
              <button type="submit" disabled={addingOb} style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", height: 42 }}>
                {addingOb ? "Adding…" : "Add department"}
              </button>
            </form>
          </div>
        )}

        {error && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}><AlertTriangle size={16} /><span>{error}</span></div>}
        {success && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
            <span style={{ display: "flex", gap: 8 }}><CheckCircle2 size={16} />{success}</span>
            {setPage && (
              <button type="button" onClick={() => setPage("inventory")} style={{ border: "none", background: "none", color: "#0284c7", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                Open Inventory <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${t.bdr}`, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: t.txtPrimary }}>Items in material master ({items.length})</span>
          <button type="button" onClick={load} style={{ border: "none", background: "none", color: "#0284c7", cursor: "pointer" }}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
        </div>
        <div style={{ maxHeight: 320, overflow: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", color: t.txtPrimary }}>
            <thead>
              <tr style={{ textAlign: "left", color: t.txtMuted, background: dark ? "rgba(148,163,184,0.08)" : "#f8fafc", position: "sticky", top: 0 }}>
                <th style={{ padding: "10px 16px" }}>Code</th>
                <th style={{ padding: "10px 16px" }}>Name / description</th>
                <th style={{ padding: "10px 16px" }}>Category</th>
                <th style={{ padding: "10px 16px" }}>UOM</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(-25).reverse().map((m) => (
                <tr key={m.id} style={{ borderTop: `1px solid ${t.bdr}` }}>
                  <td style={{ padding: "8px 16px", fontWeight: 700 }}>{m.code}</td>
                  <td style={{ padding: "8px 16px" }}>{m.description}</td>
                  <td style={{ padding: "8px 16px" }}>{m.category}</td>
                  <td style={{ padding: "8px 16px" }}>{m.unitOfMeasurement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
