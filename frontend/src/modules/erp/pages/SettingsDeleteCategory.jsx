import { useEffect, useState } from "react";
import { Tags, Trash2, AlertTriangle, CheckCircle2, ChevronLeft } from "lucide-react";
import { SETTINGS_API, settingsTheme, parseApiError } from "./settingsTheme";

export function SettingsDeleteCategory({ dark, onBack }) {
  const t = settingsTheme(dark);
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [usage, setUsage] = useState(null);
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected = categories.find((c) => String(c.id) === String(selectedId));

  const loadCategories = async () => {
    const res = await fetch(`${SETTINGS_API}/api/inventory/categories`);
    const data = await res.json().catch(() => []);
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadCategories().catch(() => setError("Could not load categories."));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setUsage(null);
      setConfirmName("");
      return;
    }
    setLoading(true);
    setError("");
    fetch(`${SETTINGS_API}/api/inventory/categories/${selectedId}/usage`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setUsage(null);
          setError(parseApiError(data, "Could not check if this category is in use."));
          return;
        }
        setUsage(data);
      })
      .catch(() => {
        setUsage(null);
        setError("Could not check if this category is in use.");
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleDelete = async () => {
    if (!selected) return;
    setError("");
    setSuccess("");
    if (confirmName.trim().toLowerCase() !== String(selected.categoryName).trim().toLowerCase()) {
      setError("Type the category name exactly to confirm delete.");
      return;
    }
    if (!window.confirm(
      `Delete category ${selected.categoryName}? Openings for this category will be removed. Items that only used this category and have no inventory movements will also be removed.`
    )) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${SETTINGS_API}/api/inventory/categories/${selected.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not delete category."));
        if (selectedId) {
          const usageRes = await fetch(`${SETTINGS_API}/api/inventory/categories/${selectedId}/usage`);
          if (usageRes.ok) setUsage(await usageRes.json());
        }
        return;
      }
      setSuccess(data.message || `Deleted ${selected.categoryName}.`);
      setSelectedId("");
      setUsage(null);
      setConfirmName("");
      await loadCategories();
    } catch {
      setError("Could not delete category.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820, paddingBottom: 40 }}>
      <div>
        <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", padding: 0, marginBottom: 10, color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <ChevronLeft size={16} /> Back to Settings
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Delete Category</h2>
        <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>
          Remove a category. Blocked only if inventory transactions still use it. If the category has items or openings but no movements, those openings are removed with it. Items that existed only in this category (and have no movements) are removed too.
        </p>
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(14,165,233,0.12)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Tags size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Select category</h3>
            <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>This removes the category name. Openings for this category go with it when there are no movements.</p>
          </div>
        </div>
        <label>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.txtPrimary }}>Category <span style={{ color: "#0ea5e9" }}>*</span></span>
          <select
            style={t.input}
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setConfirmName(""); setError(""); setSuccess(""); }}
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.categoryName}</option>
            ))}
          </select>
        </label>
      </div>

      {selected && (
        <div style={{ background: t.bgCard, border: `1px solid ${dark ? "rgba(239,68,68,0.25)" : "#fecaca"}`, borderRadius: 20, padding: 22 }}>
          {loading ? <p style={{ fontSize: 13, color: t.txtMuted, margin: 0 }}>Checking usage…</p> : usage && (
            <div style={{ marginBottom: 16, fontSize: 13, color: t.txtPrimary, lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700 }}>{usage.message}</p>
              <p style={{ margin: 0, color: t.txtMuted }}>
                Items: {usage.masterCount} · Opening balances: {usage.openingCount} · Transactions: {usage.transactionCount}
              </p>
            </div>
          )}
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#b91c1c", margin: "0 0 6px" }}>Delete {selected.categoryName}</h3>
          <p style={{ fontSize: 12, color: t.txtMuted, margin: "0 0 12px" }}>Type the category name to confirm.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ flex: "1 1 200px" }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: t.txtMuted }}>Type {selected.categoryName}</span>
              <input
                type="text"
                autoComplete="off"
                style={t.input}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={selected.categoryName}
              />
            </label>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "#b91c1c", color: "#fff", fontWeight: 700, fontSize: 13, cursor: deleting ? "wait" : "pointer", height: 42, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete category"}
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}><AlertTriangle size={16} /><span>{error}</span></div>}
      {success && <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8 }}><CheckCircle2 size={16} /><span>{success}</span></div>}
    </div>
  );
}
