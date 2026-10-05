import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, ChevronLeft, Pencil, Search, Trash2 } from "lucide-react";
import { SETTINGS_API, settingsTheme, parseApiError } from "./settingsTheme";
import { NotificationRuleForm } from "./NotificationRuleForm";

export function SettingsEditNotification({ dark, onBack }) {
  const t = settingsTheme(dark);
  const [rules, setRules] = useState([]);
  const [query, setQuery] = useState("");
  const [editingRule, setEditingRule] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRules = async () => {
    const res = await fetch(`${SETTINGS_API}/api/notifications/rules`);
    const data = await res.json().catch(() => []);
    setRules(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadRules().catch(() => setError("Could not load notification rules."));
  }, []);

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Delete this notification rule?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${SETTINGS_API}/api/notifications/rules/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not delete rule."));
        return;
      }
      setSuccess("Rule deleted.");
      if (editingRule?.id === id) setEditingRule(null);
      await loadRules();
    } catch {
      setError("Could not delete rule.");
    }
  };

  const fmtBound = (v) => (v == null || v === "" ? "—" : Number(v).toLocaleString("en-IN"));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((rule) =>
      `${rule.itemCode || ""} ${rule.category || ""} ${rule.departmentName || ""}`.toLowerCase().includes(q)
    );
  }, [rules, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920, paddingBottom: 40 }}>
      <div>
        <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", padding: 0, marginBottom: 10, color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <ChevronLeft size={16} /> Back to Settings
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Edit & Delete Notification</h2>
        <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>
          Saved min / max rules. Edit a rule to change its range, or delete it. New rules are created under Generate Notification.
        </p>
      </div>

      {error && <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}><AlertTriangle size={16} /><span>{error}</span></div>}
      {success && <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8 }}><CheckCircle2 size={16} /><span>{success}</span></div>}

      {editingRule && (
        <NotificationRuleForm
          dark={dark}
          initialRule={editingRule}
          onCancel={() => setEditingRule(null)}
          onSaved={async () => {
            await loadRules();
            setEditingRule(null);
          }}
        />
      )}

      <div style={{ background: t.bgCard, border: `1px solid ${t.bdr}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${t.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={16} color="#0284c7" />
            <span style={{ fontSize: 13, fontWeight: 800, color: t.txtPrimary }}>
              Saved rules ({query.trim() ? `${filtered.length} of ${rules.length}` : rules.length})
            </span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", maxWidth: 360 }}>
            <Search size={16} color={t.txtMuted} />
            <input
              style={{ ...t.input, padding: "8px 12px" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item, category, or department…"
            />
          </label>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: t.txtPrimary }}>
            <thead>
              <tr style={{ textAlign: "left", color: t.txtMuted }}>
                <th style={{ padding: "10px 16px" }}>Item</th>
                <th style={{ padding: "10px 16px" }}>Category</th>
                <th style={{ padding: "10px 16px" }}>Department</th>
                <th style={{ padding: "10px 16px", textAlign: "right" }}>Min</th>
                <th style={{ padding: "10px 16px", textAlign: "right" }}>Max</th>
                <th style={{ padding: "10px 16px" }} />
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 16, color: t.txtMuted }}>No rules yet. Create one under Generate Notification.</td></tr>
              )}
              {rules.length > 0 && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 16, color: t.txtMuted }}>No rules match “{query.trim()}”.</td></tr>
              )}
              {filtered.map((rule) => (
                <tr key={rule.id} style={{ borderTop: `1px solid ${t.bdr}`, background: editingRule?.id === rule.id ? (dark ? "rgba(14,165,233,0.08)" : "#f0f9ff") : "transparent" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 800 }}>{rule.itemCode}</td>
                  <td style={{ padding: "10px 16px" }}>{rule.category}</td>
                  <td style={{ padding: "10px 16px" }}>{rule.departmentName}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>{fmtBound(rule.minQuantity)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>{fmtBound(rule.maxQuantity)}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => { setError(""); setSuccess(""); setEditingRule(rule); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ border: "none", background: "none", color: "#0284c7", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 12 }}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button type="button" onClick={() => handleDeleteRule(rule.id)} style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 12 }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
