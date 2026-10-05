import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, Search, ArrowRight } from "lucide-react";
import { SETTINGS_API, settingsTheme, parseApiError } from "./settingsTheme";

const UOM_OPTIONS = ["PCS", "KG", "LTR", "G", "MT", "MTR", "SET", "NOS", "BOX", "PAIR"];

function num(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function lockedInput(base) {
  return { ...base, background: base.background, opacity: 0.85, cursor: "not-allowed" };
}

export function SettingsEditItem({ dark, onBack, setPage }) {
  const t = settingsTheme(dark);
  const [items, setItems] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [viewCategory, setViewCategory] = useState("");
  const [itemCategories, setItemCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(null);
  const [deptRows, setDeptRows] = useState([]);
  const [newDept, setNewDept] = useState("");
  const [newOpening, setNewOpening] = useState("0");
  const [confirmCode, setConfirmCode] = useState("");

  const setField = (key, value) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const loadLists = async () => {
    const [iRes, cRes, dRes] = await Promise.all([
      fetch(`${SETTINGS_API}/api/inventory/master`),
      fetch(`${SETTINGS_API}/api/inventory/categories`),
      fetch(`${SETTINGS_API}/api/inventory/departments`),
    ]);
    const masters = await iRes.json().catch(() => []);
    const cats = await cRes.json().catch(() => []);
    const depts = await dRes.json().catch(() => []);
    setItems(Array.isArray(masters) ? masters : []);
    setAllCategories(Array.isArray(cats) ? cats : []);
    setDepartments(Array.isArray(depts) ? depts : []);
  };

  useEffect(() => {
    loadLists().catch(() => setError("Could not load items."));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) =>
      `${m.code || ""} ${m.description || ""} ${m.category || ""}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  const categoryOptions = useMemo(() => {
    const names = new Set();
    itemCategories.forEach((c) => { if (c) names.add(c); });
    allCategories.forEach((c) => { if (c.categoryName) names.add(c.categoryName); });
    return Array.from(names);
  }, [itemCategories, allCategories]);

  const applyEditPayload = (data) => {
    setForm({
      id: data.id,
      itemName: data.itemName || "",
      itemCode: data.itemCode || "",
      description: data.description || "",
      unitOfMeasurement: data.unitOfMeasurement || "PCS",
    });
    setItemCategories(Array.isArray(data.availableCategories) ? data.availableCategories : []);
    setViewCategory(data.category || "");
    const rows = (data.departmentOpenings || []).map((line, idx) => {
      const ob = line.openingBalance == null ? 0 : Number(line.openingBalance);
      const cb = line.closingBalance == null ? ob : Number(line.closingBalance);
      return {
        id: `existing-${idx}-${line.departmentName}`,
        departmentName: line.departmentName || "",
        openingBalance: String(ob),
        closingBalance: String(cb),
        netTx: cb - ob,
        locked: true,
      };
    });
    setDeptRows(rows);
    setNewDept("");
    setNewOpening("0");
  };

  const loadItem = async (id, category) => {
    if (!id) {
      setForm(null);
      setDeptRows([]);
      setItemCategories([]);
      setViewCategory("");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    setConfirmCode("");
    try {
      const qs = category ? `?category=${encodeURIComponent(category)}` : "";
      const res = await fetch(`${SETTINGS_API}/api/inventory/master/${id}/edit${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not load item."));
        setForm(null);
        setDeptRows([]);
        return;
      }
      applyEditPayload(data);
    } catch {
      setError("Could not load item.");
      setForm(null);
      setDeptRows([]);
    } finally {
      setLoading(false);
    }
  };

  const onSelectItem = (id) => {
    setSelectedId(id);
    loadItem(id);
  };

  const onSelectCategory = (cat) => {
    setViewCategory(cat);
    if (selectedId && cat) loadItem(selectedId, cat);
  };

  const updateQty = (id, key, value) => {
    setDeptRows((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [key]: value };
        if (key === "openingBalance") next.closingBalance = String(num(value) + r.netTx);
        if (key === "closingBalance") next.openingBalance = String(Math.max(0, num(value) - r.netTx));
        return next;
      })
    );
  };

  const usedDepts = new Set(deptRows.map((r) => (r.departmentName || "").toLowerCase()).filter(Boolean));
  const unusedDepartments = departments.filter((d) => !usedDepts.has((d.name || "").toLowerCase()));

  const addDepartment = () => {
    if (!newDept) {
      setError("Select a department to add.");
      return;
    }
    if (usedDepts.has(newDept.toLowerCase())) {
      setError(`Department "${newDept}" is already in the list.`);
      return;
    }
    const ob = Number(newOpening);
    if (newOpening === "" || Number.isNaN(ob) || ob < 0) {
      setError("Opening balance is required and cannot be negative.");
      return;
    }
    setError("");
    setDeptRows((rows) => [
      ...rows,
      {
        id: Date.now() + Math.random(),
        departmentName: newDept,
        openingBalance: String(ob),
        closingBalance: String(ob),
        netTx: 0,
        locked: false,
      },
    ]);
    setNewDept("");
    setNewOpening("0");
  };

  const uomOptions = form && form.unitOfMeasurement && !UOM_OPTIONS.includes(form.unitOfMeasurement)
    ? [form.unitOfMeasurement, ...UOM_OPTIONS]
    : UOM_OPTIONS;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form) return;
    setError("");
    setSuccess("");
    if (!form.itemName.trim()) { setError("Item name is required."); return; }
    if (!form.itemCode.trim()) { setError("Item code is required."); return; }
    if (!viewCategory) { setError("Select a category first."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    if (!form.unitOfMeasurement.trim()) { setError("Unit of measurement is required."); return; }

    const departmentOpenings = [];
    const seen = new Set();
    for (let i = 0; i < deptRows.length; i++) {
      const row = deptRows[i];
      if (!row.departmentName) { setError(`Row ${i + 1}: department is missing.`); return; }
      const key = row.departmentName.toLowerCase();
      if (seen.has(key)) { setError(`Department "${row.departmentName}" is listed twice.`); return; }
      seen.add(key);
      const ob = Number(row.openingBalance);
      const cb = Number(row.closingBalance);
      if (row.openingBalance === "" || Number.isNaN(ob) || ob < 0) {
        setError(`${row.departmentName}: opening balance cannot be negative.`);
        return;
      }
      if (row.closingBalance === "" || Number.isNaN(cb) || cb < 0) {
        setError(`${row.departmentName}: closing balance cannot be negative.`);
        return;
      }
      departmentOpenings.push({
        departmentName: row.departmentName,
        openingBalance: ob,
        closingBalance: cb,
      });
    }

    setSaving(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/master/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: form.itemName.trim(),
          itemCode: form.itemCode.trim(),
          category: viewCategory,
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
      setSuccess(`Saved ${data.itemCode} / ${viewCategory}. Department balances are for this category only.`);
      await loadLists();
      applyEditPayload(data);
    } catch {
      setError("Could not save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form) return;
    setError("");
    setSuccess("");
    if (confirmCode.trim().toUpperCase() !== String(form.itemCode).trim().toUpperCase()) {
      setError("Type the item code exactly to confirm delete.");
      return;
    }
    if (!window.confirm(`Delete item ${form.itemCode}? This removes the item, all category opening balances, and all inventory movements.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/master/${form.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not delete item."));
        return;
      }
      setSuccess(data.message || `Item ${form.itemCode} deleted.`);
      setSelectedId("");
      setForm(null);
      setDeptRows([]);
      setViewCategory("");
      setConfirmCode("");
      await loadLists();
    } catch {
      setError("Could not delete item.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860, paddingBottom: 40 }}>
      <div>
        <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", padding: 0, marginBottom: 10, color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <ChevronLeft size={16} /> Back to Settings
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Edit &amp; Delete Item</h2>
        <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>
          Select item code, then category. Department opening and closing are for that pair only (example: 101 + FG is not the same as 101 + SPRING). Existing department names cannot be changed; quantities can.
        </p>
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(14,165,233,0.12)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Pencil size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>1. Item code, then category</h3>
            <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>Name, description and UOM fill in after you pick the item. The department table reloads when you change category.</p>
          </div>
        </div>
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>
            <Search size={14} /> Search
          </span>
          <input style={t.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type code or name…" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label>
            <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Item code <span style={{ color: "#0ea5e9" }}>*</span></span>
            <select style={t.input} value={selectedId} onChange={(e) => onSelectItem(e.target.value)}>
              <option value="">Select an item</option>
              {filtered.map((m) => (
                <option key={m.id} value={m.id}>{m.code} — {m.description}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Category <span style={{ color: "#0ea5e9" }}>*</span></span>
            <select
              style={t.input}
              value={viewCategory}
              disabled={!selectedId}
              onChange={(e) => onSelectCategory(e.target.value)}
            >
              <option value="">{selectedId ? "Select category" : "Pick item code first"}</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading && <p style={{ fontSize: 13, color: t.txtMuted }}>Loading {viewCategory ? `${form?.itemCode || ""} / ${viewCategory}` : "item"}…</p>}

      {form && viewCategory && (
        <form onSubmit={handleSave} style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: t.txtPrimary, margin: "0 0 14px" }}>
            2. Item details for {form.itemCode}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ gridColumn: "1 / -1" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Item name</span>
              <input style={t.input} value={form.itemName} onChange={(e) => setField("itemName", e.target.value)} />
            </label>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Item code</span>
              <input style={t.input} value={form.itemCode} onChange={(e) => setField("itemCode", e.target.value)} />
            </label>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Unit &amp; measurement</span>
              <select style={t.input} value={form.unitOfMeasurement} onChange={(e) => setField("unitOfMeasurement", e.target.value)}>
                {uomOptions.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Description</span>
              <input style={t.input} value={form.description} onChange={(e) => setField("description", e.target.value)} />
            </label>
          </div>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${t.bdr}` }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: t.txtPrimary, margin: "0 0 6px" }}>
              3. Departments for {form.itemCode} : {viewCategory}
            </p>
            <p style={{ fontSize: 12, color: t.txtMuted, margin: "0 0 12px" }}>
              Department name is locked for rows already on this pair. Change opening or closing quantity. Add another department below.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: t.txtPrimary }}>
                <thead>
                  <tr style={{ textAlign: "left", color: t.txtMuted }}>
                    <th style={{ padding: "8px 6px" }}>Department</th>
                    <th style={{ padding: "8px 6px", width: 140 }}>Opening balance</th>
                    <th style={{ padding: "8px 6px", width: 140 }}>Closing balance</th>
                    <th style={{ padding: "8px 6px", width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {deptRows.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "12px 6px", color: t.txtMuted }}>
                        No department stock for this item + category yet. Use Add department.
                      </td>
                    </tr>
                  )}
                  {deptRows.map((row) => (
                    <tr key={row.id} style={{ borderTop: `1px solid ${t.bdr}` }}>
                      <td style={{ padding: "8px 6px" }}>
                        <input style={lockedInput(t.input)} value={row.departmentName} readOnly disabled />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input style={t.input} type="number" min="0" step="any" value={row.openingBalance} onChange={(e) => updateQty(row.id, "openingBalance", e.target.value)} />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input style={t.input} type="number" min="0" step="any" value={row.closingBalance} onChange={(e) => updateQty(row.id, "closingBalance", e.target.value)} />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {!row.locked && (
                          <button type="button" onClick={() => setDeptRows((rows) => rows.filter((r) => r.id !== row.id))} style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer" }} title="Remove added department">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: `1px dashed ${t.bdr}` }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: t.txtPrimary, margin: "0 0 10px" }}>Add department</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 10, alignItems: "end" }}>
                <label>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Select department</span>
                  <select style={t.input} value={newDept} onChange={(e) => setNewDept(e.target.value)}>
                    <option value="">Select department</option>
                    {unusedDepartments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Opening balance</span>
                  <input style={t.input} type="number" min="0" step="any" value={newOpening} onChange={(e) => setNewOpening(e.target.value)} />
                </label>
                <button type="button" onClick={addDepartment} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", height: 42 }}>
                  <Plus size={14} /> Add department
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button type="submit" disabled={saving} style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {form && (
        <div style={{ background: t.bgCard, border: `1px solid ${dark ? "rgba(239,68,68,0.25)" : "#fecaca"}`, borderRadius: 20, padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#b91c1c", margin: "0 0 6px" }}>Delete this item</h3>
          <p style={{ fontSize: 12, color: t.txtMuted, margin: "0 0 12px", lineHeight: 1.55 }}>
            Removes the material master row, opening balances for every category of this code, and all inventory transactions. Type the item code to confirm.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ flex: "1 1 200px" }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Type {form.itemCode} to confirm</span>
              <input type="text" autoComplete="off" style={t.input} value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder={form.itemCode} />
            </label>
            <button type="button" disabled={deleting} onClick={handleDelete} style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "#b91c1c", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, height: 42 }}>
              <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete item"}
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}><AlertTriangle size={16} /><span>{error}</span></div>}
      {success && (
        <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
          <span style={{ display: "flex", gap: 8 }}><CheckCircle2 size={16} />{success}</span>
          {setPage && (
            <button type="button" onClick={() => setPage("inventory")} style={{ border: "none", background: "none", color: "#0284c7", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
              Open Inventory <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
