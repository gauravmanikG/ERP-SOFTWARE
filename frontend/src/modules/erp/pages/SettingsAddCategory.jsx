import { useEffect, useState } from "react";
import { Tags, Plus, RefreshCw, CheckCircle2, AlertTriangle, ChevronLeft, Package } from "lucide-react";
import { SETTINGS_API, settingsTheme, parseApiError } from "./settingsTheme";

export function SettingsAddCategory({ dark, onBack, onGoAddItem }) {
  const t = settingsTheme(dark);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [bomConsumption, setBomConsumption] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/categories`);
      const data = await res.json().catch(() => []);
      setRows(Array.isArray(data) ? data : []);
      if (!res.ok) setError(data.message || "Could not load categories.");
    } catch {
      setError("Could not load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!categoryName.trim()) {
      setError("Category name is required. Create this first if your new item uses a category that is not in the list.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryName: categoryName.trim(),
          categoryCode: categoryCode.trim(),
          shortCode: shortCode.trim(),
          bomConsumption: bomConsumption.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not save category."));
        return;
      }
      setSuccess(`Category "${data.categoryName}" saved. You can now add an item that uses it.`);
      setShowForm(false);
      setCategoryName("");
      setCategoryCode("");
      setShortCode("");
      setBomConsumption("");
      await load();
    } catch {
      setError("Could not save category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820, paddingBottom: 40 }}>
      <div>
        <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", padding: 0, marginBottom: 10, color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <ChevronLeft size={16} /> Back to Settings
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Generate Category</h2>
        <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>
          If your new item needs a category that is not in the dropdown yet, create the category here first, then add the item.
        </p>
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(14,165,233,0.12)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Tags size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>New category</h3>
              <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>Required: <strong>Category name</strong> (unique). Other fields are optional extras stored on category_master.</p>
            </div>
          </div>
          {!showForm && (
            <button type="button" onClick={() => { setShowForm(true); setError(""); setSuccess(""); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Plus size={16} /> New category
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSave} style={{ marginTop: 20, padding: 18, borderRadius: 16, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${t.bdr}` }}>
            <div style={{ display: "grid", gap: 14 }}>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.txtPrimary, marginBottom: 6 }}>Category name <span style={{ color: "#0ea5e9" }}>*</span></span>
                <input style={t.input} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. OUTER METAL SHELL, FG" autoFocus />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.txtPrimary, marginBottom: 6 }}>Category code</span>
                <input style={t.input} value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} placeholder="e.g. B01 (optional)" />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.txtPrimary, marginBottom: 6 }}>Short code</span>
                <input style={t.input} value={shortCode} onChange={(e) => setShortCode(e.target.value)} placeholder="e.g. OTSHL (optional)" />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.txtPrimary, marginBottom: 6 }}>BOM consumption</span>
                <input style={t.input} value={bomConsumption} onChange={(e) => setBomConsumption(e.target.value)} placeholder="Related category name if used in BOM (optional)" />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="submit" disabled={saving} style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{saving ? "Saving…" : "Save category"}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "10px 18px", borderRadius: 12, border: `1px solid ${t.bdr}`, background: "transparent", color: t.txtMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </form>
        )}

        {error && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}><AlertTriangle size={16} /><span>{error}</span></div>}
        {success && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
            <span style={{ display: "flex", gap: 8 }}><CheckCircle2 size={16} />{success}</span>
            {onGoAddItem && (
              <button type="button" onClick={onGoAddItem} style={{ border: "none", background: "none", color: "#0284c7", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Package size={14} /> Add an item now
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${t.bdr}`, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: t.txtPrimary }}>Existing categories ({rows.length})</span>
          <button type="button" onClick={load} style={{ border: "none", background: "none", color: "#0284c7", cursor: "pointer" }}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
        </div>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", color: t.txtPrimary }}>
          <thead>
            <tr style={{ textAlign: "left", color: t.txtMuted, background: dark ? "rgba(148,163,184,0.08)" : "#f8fafc" }}>
              <th style={{ padding: "10px 16px" }}>Name</th>
              <th style={{ padding: "10px 16px" }}>Code</th>
              <th style={{ padding: "10px 16px" }}>Short code</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${t.bdr}` }}>
                <td style={{ padding: "10px 16px", fontWeight: 700 }}>{c.categoryName}</td>
                <td style={{ padding: "10px 16px" }}>{c.categoryCode || "—"}</td>
                <td style={{ padding: "10px 16px" }}>{c.shortCode || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
