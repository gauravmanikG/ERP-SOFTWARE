import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, Search } from "lucide-react";
import { SETTINGS_API, settingsTheme, parseApiError } from "./settingsTheme";

const UOM_OPTIONS = ["PCS", "KG", "LTR", "G", "MT", "MTR", "SET", "NOS", "BOX", "PAIR"];

function fmt(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "0.00";
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SettingsEditDepartment({ dark, onBack }) {
  const t = settingsTheme(dark);
  const [departments, setDepartments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [deptName, setDeptName] = useState("");
  const [processSequence, setProcessSequence] = useState("");
  const [items, setItems] = useState([]);
  const [masters, setMasters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingDept, setSavingDept] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [addMode, setAddMode] = useState("existing");
  const [existingCode, setExistingCode] = useState("");
  const [existingCategory, setExistingCategory] = useState("");
  const [existingOpening, setExistingOpening] = useState("0");
  const [newForm, setNewForm] = useState({
    itemName: "",
    itemCode: "",
    category: "",
    description: "",
    unitOfMeasurement: "PCS",
    openingBalance: "0",
  });

  const selected = departments.find((d) => String(d.id) === String(selectedId));

  const loadDepartments = async () => {
    const res = await fetch(`${SETTINGS_API}/api/inventory/departments`);
    const data = await res.json().catch(() => []);
    setDepartments(Array.isArray(data) ? data : []);
  };

  const loadLookups = async () => {
    const [mRes, cRes] = await Promise.all([
      fetch(`${SETTINGS_API}/api/inventory/master`),
      fetch(`${SETTINGS_API}/api/inventory/categories`),
    ]);
    const m = await mRes.json().catch(() => []);
    const c = await cRes.json().catch(() => []);
    setMasters(Array.isArray(m) ? m : []);
    setCategories(Array.isArray(c) ? c : []);
  };

  const loadDeptItems = async (dept) => {
    if (!dept) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const [obRes, stockRes] = await Promise.all([
        fetch(`${SETTINGS_API}/api/inventory/opening-balances?department=${encodeURIComponent(dept.name)}`),
        fetch(`${SETTINGS_API}/api/inventory/analysis/department-stock?departmentId=${encodeURIComponent(dept.id)}`),
      ]);
      const obs = obRes.ok ? await obRes.json() : [];
      const stock = stockRes.ok ? await stockRes.json() : { items: [] };
      const cbMap = {};
      (stock.items || []).forEach((row) => {
        cbMap[`${String(row.itemCode || "").toLowerCase()}::${String(row.category || "").toLowerCase()}`] = row;
      });
      const nameMap = {};
      masters.forEach((m) => { nameMap[String(m.code || "").toUpperCase()] = m; });
      const rows = (Array.isArray(obs) ? obs : []).map((ob) => {
        const key = `${String(ob.itemCode || "").toLowerCase()}::${String(ob.categoryName || "").toLowerCase()}`;
        const stockRow = cbMap[key];
        const master = nameMap[String(ob.itemCode || "").toUpperCase()];
        return {
          itemCode: ob.itemCode,
          itemName: stockRow?.itemName || master?.description || ob.itemCode,
          category: ob.categoryName,
          unitOfMeasurement: stockRow?.unitOfMeasurement || master?.unitOfMeasurement || "",
          openingBalance: ob.openingBalance,
          closingBalance: stockRow?.quantity ?? ob.openingBalance,
        };
      });
      setItems(rows);
    } catch {
      setError("Could not load items in this department.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments().catch(() => setError("Could not load departments."));
    loadLookups().catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDeptName("");
      setProcessSequence("");
      setItems([]);
      setConfirmDelete("");
      return;
    }
    const dept = departments.find((d) => String(d.id) === String(selectedId));
    if (!dept) return;
    setDeptName(dept.name || "");
    setProcessSequence(dept.processSequence == null ? "" : String(dept.processSequence));
    setConfirmDelete("");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const dept = departments.find((d) => String(d.id) === String(selectedId));
    if (!dept) return;
    loadDeptItems(dept);
  }, [selectedId, departments, masters]);

  const uniqueMasters = useMemo(() => {
    const seen = new Set();
    return masters.filter((m) => {
      const code = String(m.code || "").toUpperCase();
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    });
  }, [masters]);

  useEffect(() => {
    if (!existingCode) return;
    const master = uniqueMasters.find((m) => String(m.code).toUpperCase() === existingCode.toUpperCase());
    const fromMaster = master?.category || "";
    if (fromMaster) setExistingCategory(fromMaster);
    fetch(`${SETTINGS_API}/api/inventory/opening-balances/categories-for-item?code=${encodeURIComponent(existingCode)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!Array.isArray(list) || list.length === 0) return;
        const match = list.find((c) => String(c).toLowerCase() === fromMaster.toLowerCase());
        setExistingCategory(match || list[0]);
      })
      .catch(() => {});
  }, [existingCode, uniqueMasters]);

  const usedKeys = new Set(items.map((r) => `${String(r.itemCode).toLowerCase()}::${String(r.category).toLowerCase()}`));

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      `${r.itemCode} ${r.itemName} ${r.category}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setError("");
    setSuccess("");
    const seq = Number(processSequence);
    if (!deptName.trim()) { setError("Department name is required."); return; }
    if (processSequence === "" || Number.isNaN(seq)) { setError("Process sequence is required."); return; }
    setSavingDept(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/departments/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentName: deptName.trim(), processSequence: seq }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not update department."));
        return;
      }
      setSuccess(`Department saved as "${data.name}".`);
      await loadDepartments();
    } catch {
      setError("Could not update department.");
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDept = async () => {
    if (!selected) return;
    setError("");
    setSuccess("");
    if (confirmDelete.trim().toLowerCase() !== String(selected.name).trim().toLowerCase()) {
      setError("Type the department name exactly to confirm delete.");
      return;
    }
    if (!window.confirm(`Delete department ${selected.name}? Items assigned only here will lose this department's opening balance. Transactions that used this department block delete.`)) {
      return;
    }
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/departments/${selected.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not delete department."));
        return;
      }
      setSuccess(data.message || "Department deleted.");
      setSelectedId("");
      await loadDepartments();
    } catch {
      setError("Could not delete department.");
    }
  };

  const handleAddExisting = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setError("");
    setSuccess("");
    if (!existingCode) { setError("Select an item code."); return; }
    if (!existingCategory) { setError("Category is required."); return; }
    const ob = Number(existingOpening);
    if (existingOpening === "" || Number.isNaN(ob) || ob < 0) { setError("Opening balance cannot be negative."); return; }
    const key = `${existingCode.toLowerCase()}::${existingCategory.toLowerCase()}`;
    if (usedKeys.has(key)) {
      setError(`${existingCode} / ${existingCategory} is already in ${selected.name}.`);
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/opening-balances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemCode: existingCode,
          category: existingCategory,
          departmentName: selected.name,
          openingBalance: ob,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not add item to this department."));
        return;
      }
      setSuccess(`Added ${existingCode} (${existingCategory}) to ${selected.name}.`);
      setExistingCode("");
      setExistingCategory("");
      setExistingOpening("0");
      await loadLookups();
      await loadDeptItems(selected);
    } catch {
      setError("Could not add item to this department.");
    } finally {
      setAdding(false);
    }
  };

  const handleAddNew = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setError("");
    setSuccess("");
    if (!newForm.itemName.trim()) { setError("Item name is required."); return; }
    if (!newForm.itemCode.trim()) { setError("Item code is required."); return; }
    if (!newForm.category) { setError("Category is required. Create it under Add a Category first if needed."); return; }
    if (!newForm.description.trim()) { setError("Description is required."); return; }
    const ob = Number(newForm.openingBalance);
    if (newForm.openingBalance === "" || Number.isNaN(ob) || ob < 0) { setError("Opening balance cannot be negative."); return; }
    setAdding(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/master`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: newForm.itemName.trim(),
          itemCode: newForm.itemCode.trim(),
          category: newForm.category,
          description: newForm.description.trim(),
          unitOfMeasurement: newForm.unitOfMeasurement,
          departmentOpenings: [{ departmentName: selected.name, openingBalance: ob }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not create item in this department."));
        return;
      }
      setSuccess(`Created ${data.code} in ${selected.name}.`);
      setNewForm({ itemName: "", itemCode: "", category: newForm.category, description: "", unitOfMeasurement: "PCS", openingBalance: "0" });
      await loadLookups();
      await loadDeptItems(selected);
    } catch {
      setError("Could not create item in this department.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (row) => {
    if (!selected) return;
    if (!window.confirm(`Remove ${row.itemCode} (${row.category}) from ${selected.name}? The item stays in master; only this department's opening is removed.`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `${SETTINGS_API}/api/inventory/opening-balances?itemCode=${encodeURIComponent(row.itemCode)}&category=${encodeURIComponent(row.category)}&department=${encodeURIComponent(selected.name)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not remove item from this department."));
        return;
      }
      setSuccess(data.message || `Removed ${row.itemCode} from ${selected.name}.`);
      await loadDeptItems(selected);
    } catch {
      setError("Could not remove item from this department.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920, paddingBottom: 40 }}>
      <div>
        <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", padding: 0, marginBottom: 10, color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <ChevronLeft size={16} /> Back to Settings
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Edit &amp; Delete Department</h2>
        <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>
          Select a department. Change its name or sequence, add items into it (existing or new), or remove an item from this department only.
        </p>
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
        <label>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Department <span style={{ color: "#0ea5e9" }}>*</span></span>
          <select style={t.input} value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setError(""); setSuccess(""); }}>
            <option value="">Select a department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>

      {selected && (
        <form onSubmit={handleSaveDept} style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(14,165,233,0.12)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Department details</h3>
              <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>Name is what appears in From / To Department.</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 14 }}>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Department name</span>
              <input style={t.input} value={deptName} onChange={(e) => setDeptName(e.target.value)} />
            </label>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Process sequence</span>
              <input style={t.input} type="number" step="any" value={processSequence} onChange={(e) => setProcessSequence(e.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={savingDept} style={{ marginTop: 14, padding: "10px 18px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {savingDept ? "Saving…" : "Save department"}
          </button>
        </form>
      )}

      {selected && (
        <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: t.txtPrimary, margin: "0 0 6px" }}>Items in {selected.name}</h3>
          <p style={{ fontSize: 12, color: t.txtMuted, margin: "0 0 12px" }}>Remove takes the item out of this department only. It is not deleted from material master.</p>
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}><Search size={14} /> Search items</span>
            <input style={t.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code, name, or category" />
          </label>
          {loading ? <p style={{ fontSize: 13, color: t.txtMuted }}>Loading items…</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: t.txtPrimary }}>
                <thead>
                  <tr style={{ textAlign: "left", color: t.txtMuted }}>
                    <th style={{ padding: "8px 6px" }}>Item code</th>
                    <th style={{ padding: "8px 6px" }}>Name</th>
                    <th style={{ padding: "8px 6px" }}>Category</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Opening</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Closing</th>
                    <th style={{ padding: "8px 6px" }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 14, color: t.txtMuted }}>No items assigned to this department yet.</td></tr>
                  )}
                  {filteredItems.map((row) => (
                    <tr key={`${row.itemCode}-${row.category}`} style={{ borderTop: `1px solid ${t.bdr}` }}>
                      <td style={{ padding: "8px 6px", fontWeight: 800 }}>{row.itemCode}</td>
                      <td style={{ padding: "8px 6px" }}>{row.itemName}</td>
                      <td style={{ padding: "8px 6px" }}>{row.category}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmt(row.openingBalance)}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>{fmt(row.closingBalance)}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <button type="button" onClick={() => handleRemove(row)} style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 12 }}>
                          <Trash2 size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: t.txtPrimary, margin: "0 0 12px" }}>Add item to {selected.name}</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => setAddMode("existing")} style={{ padding: "8px 12px", borderRadius: 10, border: addMode === "existing" ? "none" : `1px solid ${t.bdr}`, background: addMode === "existing" ? "#0284c7" : "transparent", color: addMode === "existing" ? "#fff" : t.txtMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Existing item</button>
            <button type="button" onClick={() => setAddMode("new")} style={{ padding: "8px 12px", borderRadius: 10, border: addMode === "new" ? "none" : `1px solid ${t.bdr}`, background: addMode === "new" ? "#0284c7" : "transparent", color: addMode === "new" ? "#fff" : t.txtMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>New item</button>
          </div>

          {addMode === "existing" ? (
            <form onSubmit={handleAddExisting} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px auto", gap: 10, alignItems: "end" }}>
              <label>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Item code</span>
                <select style={t.input} value={existingCode} onChange={(e) => setExistingCode(e.target.value)}>
                  <option value="">Select item</option>
                  {uniqueMasters.map((m) => (
                    <option key={m.id} value={m.code}>{m.code} — {m.description}</option>
                  ))}
                </select>
              </label>
              <label>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Category</span>
                <select style={t.input} value={existingCategory} onChange={(e) => setExistingCategory(e.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.categoryName}>{c.categoryName}</option>
                  ))}
                </select>
              </label>
              <label>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Opening</span>
                <input style={t.input} type="number" min="0" step="any" value={existingOpening} onChange={(e) => setExistingOpening(e.target.value)} />
              </label>
              <button type="submit" disabled={adding} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", height: 42 }}>
                <Plus size={14} /> {adding ? "Adding…" : "Add"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddNew} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Item name</span>
                  <input style={t.input} value={newForm.itemName} onChange={(e) => setNewForm((f) => ({ ...f, itemName: e.target.value }))} />
                </label>
                <label>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Item code</span>
                  <input style={t.input} value={newForm.itemCode} onChange={(e) => setNewForm((f) => ({ ...f, itemCode: e.target.value }))} />
                </label>
                <label>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Category</span>
                  <select style={t.input} value={newForm.category} onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.categoryName}>{c.categoryName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>UOM</span>
                  <select style={t.input} value={newForm.unitOfMeasurement} onChange={(e) => setNewForm((f) => ({ ...f, unitOfMeasurement: e.target.value }))}>
                    {UOM_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Description</span>
                  <input style={t.input} value={newForm.description} onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))} />
                </label>
                <label>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Opening in {selected.name}</span>
                  <input style={t.input} type="number" min="0" step="any" value={newForm.openingBalance} onChange={(e) => setNewForm((f) => ({ ...f, openingBalance: e.target.value }))} />
                </label>
              </div>
              <button type="submit" disabled={adding} style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                <Plus size={14} /> {adding ? "Saving…" : "Create item in this department"}
              </button>
            </form>
          )}
        </div>
      )}

      {selected && (
        <div style={{ background: t.bgCard, border: `1px solid ${dark ? "rgba(239,68,68,0.25)" : "#fecaca"}`, borderRadius: 20, padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#b91c1c", margin: "0 0 6px" }}>Delete this department</h3>
          <p style={{ fontSize: 12, color: t.txtMuted, margin: "0 0 12px" }}>Blocked if inventory transactions still use it. Opening balances for this department are removed. Type the name to confirm.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ flex: "1 1 200px" }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Type {selected.name}</span>
              <input type="text" autoComplete="off" style={t.input} value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={selected.name} />
            </label>
            <button type="button" onClick={handleDeleteDept} style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "#b91c1c", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", height: 42, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Trash2 size={14} /> Delete department
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}><AlertTriangle size={16} /><span>{error}</span></div>}
      {success && <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8 }}><CheckCircle2 size={16} /><span>{success}</span></div>}
    </div>
  );
}
