import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SETTINGS_API, settingsTheme, parseApiError } from "./settingsTheme";

const emptyDeptRow = () => ({ departmentName: "", minQuantity: "", maxQuantity: "" });

export function NotificationRuleForm({ dark, initialRule = null, onSaved, onCancel }) {
  const t = settingsTheme(dark);
  const editingId = initialRule?.id ?? null;
  const [masters, setMasters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [itemCode, setItemCode] = useState("");
  const [category, setCategory] = useState("");
  const [itemCats, setItemCats] = useState([]);
  const [allDepartments, setAllDepartments] = useState(false);
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [deptRows, setDeptRows] = useState([emptyDeptRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const uniqueMasters = useMemo(() => {
    const seen = new Set();
    return masters.filter((m) => {
      const code = String(m.code || "").toUpperCase();
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    });
  }, [masters]);

  const qtyToInput = (v) => (v == null || v === "" ? "" : String(v));

  const applyRule = (rule) => {
    setError("");
    setSuccess("");
    if (!rule) {
      setItemCode("");
      setCategory("");
      setAllDepartments(false);
      setMinQty("");
      setMaxQty("");
      setDeptRows([emptyDeptRow()]);
      return;
    }
    setItemCode(rule.itemCode || "");
    setCategory(rule.category || "");
    if (rule.allDepartments) {
      setAllDepartments(true);
      setMinQty(qtyToInput(rule.minQuantity));
      setMaxQty(qtyToInput(rule.maxQuantity));
      setDeptRows([emptyDeptRow()]);
    } else {
      setAllDepartments(false);
      setMinQty("");
      setMaxQty("");
      setDeptRows([{
        departmentName: rule.departmentName || "",
        minQuantity: qtyToInput(rule.minQuantity),
        maxQuantity: qtyToInput(rule.maxQuantity),
      }]);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(`${SETTINGS_API}/api/inventory/master`),
      fetch(`${SETTINGS_API}/api/inventory/categories`),
      fetch(`${SETTINGS_API}/api/inventory/departments`),
    ]).then(async ([mRes, cRes, dRes]) => {
      const m = await mRes.json().catch(() => []);
      const c = await cRes.json().catch(() => []);
      const d = await dRes.json().catch(() => []);
      setMasters(Array.isArray(m) ? m : []);
      setCategories(Array.isArray(c) ? c : []);
      setDepartments(Array.isArray(d) ? d : []);
    }).catch(() => setError("Could not load lists."));
  }, []);

  useEffect(() => {
    applyRule(initialRule);
  }, [initialRule?.id]);

  useEffect(() => {
    if (!itemCode) {
      setItemCats([]);
      return;
    }
    const master = uniqueMasters.find((m) => String(m.code).toUpperCase() === itemCode.toUpperCase());
    if (master?.category) setCategory(master.category);
    fetch(`${SETTINGS_API}/api/inventory/opening-balances/categories-for-item?code=${encodeURIComponent(itemCode)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const names = Array.isArray(list) ? list : [];
        setItemCats(names);
        if (names.length && !names.some((n) => n.toLowerCase() === String(category).toLowerCase())) {
          setCategory(names[0]);
        }
      })
      .catch(() => {});
  }, [itemCode, uniqueMasters]);

  const categoryOptions = useMemo(() => {
    const names = new Set(itemCats);
    categories.forEach((c) => { if (c.categoryName) names.add(c.categoryName); });
    return Array.from(names);
  }, [itemCats, categories]);

  const addDeptRow = () => {
    setDeptRows((rows) => [...rows, emptyDeptRow()]);
  };

  const updateDeptRow = (idx, key, value) => {
    setDeptRows((rows) => rows.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  };

  const removeDeptRow = (idx) => {
    setDeptRows((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)));
  };

  const parseOptionalQty = (raw) => {
    if (raw === "" || raw == null) return null;
    const n = Number(raw);
    if (Number.isNaN(n)) return NaN;
    return n;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!itemCode) { setError("Item code is required."); return; }
    if (!category) { setError("Category is required."); return; }

    let body;
    if (allDepartments) {
      const min = parseOptionalQty(minQty);
      const max = parseOptionalQty(maxQty);
      if (minQty !== "" && Number.isNaN(min)) { setError("Minimum quantity must be a number."); return; }
      if (maxQty !== "" && Number.isNaN(max)) { setError("Maximum quantity must be a number."); return; }
      if (min == null && max == null) { setError("Set a minimum, a maximum, or both."); return; }
      if (min != null && min < 0) { setError("Minimum quantity cannot be negative."); return; }
      if (max != null && max < 0) { setError("Maximum quantity cannot be negative."); return; }
      if (min != null && max != null && min > max) { setError("Minimum cannot be greater than maximum."); return; }
      body = { itemCode, category, allDepartments: true, minQuantity: min, maxQuantity: max };
    } else {
      const departmentsPayload = [];
      for (const row of deptRows) {
        if (!row.departmentName) { setError("Select a department on every row, or choose All departments."); return; }
        const min = parseOptionalQty(row.minQuantity);
        const max = parseOptionalQty(row.maxQuantity);
        if (row.minQuantity !== "" && Number.isNaN(min)) { setError("Minimum quantity must be a number."); return; }
        if (row.maxQuantity !== "" && Number.isNaN(max)) { setError("Maximum quantity must be a number."); return; }
        if (min == null && max == null) { setError(`Set min, max, or both for ${row.departmentName}.`); return; }
        if (min != null && min < 0) { setError("Minimum quantity cannot be negative."); return; }
        if (max != null && max < 0) { setError("Maximum quantity cannot be negative."); return; }
        if (min != null && max != null && min > max) { setError(`Minimum cannot be greater than maximum for ${row.departmentName}.`); return; }
        departmentsPayload.push({ departmentName: row.departmentName, minQuantity: min, maxQuantity: max });
      }
      body = { itemCode, category, allDepartments: false, departments: departmentsPayload };
    }

    setSaving(true);
    try {
      const url = editingId
        ? `${SETTINGS_API}/api/notifications/rules/${editingId}`
        : `${SETTINGS_API}/api/notifications/rules`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data) ? "Could not save notification rule." : parseApiError(data, "Could not save notification rule.");
        setError(msg);
        return;
      }
      setSuccess(editingId
        ? "Notification rule updated. Alerts will use the new min / max."
        : "Notification rule saved. The inbox will show an alert if closing balance is outside the range.");
      if (!editingId) applyRule(null);
      onSaved?.();
    } catch {
      setError("Could not save notification rule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSave} style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(14,165,233,0.12)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>{editingId ? "Edit stock range" : "Stock range"}</h3>
            <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>{editingId ? "Change min / max or department for this item, then save." : "Alert when closing balance goes below min or above max."}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label>
            <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Item code <span style={{ color: "#0ea5e9" }}>*</span></span>
            <select style={t.input} value={itemCode} onChange={(e) => { setItemCode(e.target.value); setError(""); setSuccess(""); }}>
              <option value="">Select item</option>
              {uniqueMasters.map((m) => (
                <option key={m.id} value={m.code}>{m.code} — {m.description}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Category <span style={{ color: "#0ea5e9" }}>*</span></span>
            <select style={t.input} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select category</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", fontSize: 13, fontWeight: 700, color: t.txtPrimary, cursor: "pointer" }}>
          <input type="checkbox" checked={allDepartments} onChange={(e) => setAllDepartments(e.target.checked)} />
          All departments (same min / max for every department)
        </label>

        {allDepartments ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Minimum quantity</span>
              <input style={t.input} type="number" min="0" step="any" value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="Optional" />
            </label>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Maximum quantity</span>
              <input style={t.input} type="number" min="0" step="any" value={maxQty} onChange={(e) => setMaxQty(e.target.value)} placeholder="Optional" />
            </label>
          </div>
        ) : (
          <div>
            {deptRows.map((row, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 10, marginBottom: 10, alignItems: "end" }}>
                <label>
                  {idx === 0 && <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Department</span>}
                  <select style={t.input} value={row.departmentName} onChange={(e) => updateDeptRow(idx, "departmentName", e.target.value)}>
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {idx === 0 && <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Min</span>}
                  <input style={t.input} type="number" min="0" step="any" value={row.minQuantity} onChange={(e) => updateDeptRow(idx, "minQuantity", e.target.value)} placeholder="Optional" />
                </label>
                <label>
                  {idx === 0 && <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Max</span>}
                  <input style={t.input} type="number" min="0" step="any" value={row.maxQuantity} onChange={(e) => updateDeptRow(idx, "maxQuantity", e.target.value)} placeholder="Optional" />
                </label>
                <button type="button" onClick={() => removeDeptRow(idx)} style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", height: 42, display: "inline-flex", alignItems: "center" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addDeptRow} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}>
              <Plus size={14} /> Add another department
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button type="submit" disabled={saving} style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {saving ? "Saving…" : editingId ? "Update notification" : "Save notification rule"}
          </button>
          {editingId && onCancel && (
            <button type="button" onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 12, border: `1px solid ${t.bdr}`, background: "transparent", color: t.txtMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {error && <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}><AlertTriangle size={16} /><span>{error}</span></div>}
      {success && <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8 }}><CheckCircle2 size={16} /><span>{success}</span></div>}
    </>
  );
}
