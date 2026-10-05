import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, ChevronRight, ChevronLeft, Tags, Package, Pencil, Warehouse, Trash2, Bell } from "lucide-react";
import { SettingsAddCategory } from "./SettingsAddCategory";
import { SettingsAddItem } from "./SettingsAddItem";
import { SettingsEditItem } from "./SettingsEditItem";
import { SettingsEditDepartment } from "./SettingsEditDepartment";
import { SettingsDeleteCategory } from "./SettingsDeleteCategory";
import { GenerateNotificationPage } from "./GenerateNotificationPage";
import { SettingsEditNotification } from "./SettingsEditNotification";

const BASE = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? ""
    : "https://silver-muller-seals-backend-deploy.onrender.com"
);

const SETTINGS_SECTIONS = [
  {
    id: "department",
    title: "Department",
    icon: Building2,
    items: [
      {
        id: "add-department",
        title: "Generate Department",
        subtitle: "Create a plant department for Inventory From / To Department lists",
        icon: Plus,
      },
      {
        id: "edit-department",
        title: "Edit & Delete Department",
        subtitle: "Select a department, add or remove items in it, or rename / delete the department",
        icon: Warehouse,
      },
    ],
  },
  {
    id: "item",
    title: "Item",
    icon: Package,
    items: [
      {
        id: "add-item",
        title: "Generate Item",
        subtitle: "Add a material item (code, name, category, UOM, opening balance) for Inventory",
        icon: Plus,
      },
      {
        id: "edit-item",
        title: "Edit & Delete Item",
        subtitle: "Select an item to change its details, opening and closing balances, or delete it",
        icon: Pencil,
      },
    ],
  },
  {
    id: "category",
    title: "Category",
    icon: Tags,
    items: [
      {
        id: "add-category",
        title: "Generate Category",
        subtitle: "Create a category first if your new item is not in the existing category list",
        icon: Plus,
      },
      {
        id: "delete-category",
        title: "Delete Category",
        subtitle: "Remove an unused category name from the list (blocked if items still use it)",
        icon: Trash2,
      },
    ],
  },
  {
    id: "notification",
    title: "Notification",
    icon: Bell,
    items: [
      {
        id: "generate-notification",
        title: "Generate Notification",
        subtitle: "Set min / max closing balance alerts for an item and category, by department or all departments",
        icon: Plus,
      },
      {
        id: "edit-notification",
        title: "Edit & Delete Notification",
        subtitle: "View saved alert rules, change min / max or department, or delete a rule",
        icon: Pencil,
      },
    ],
  },
];

export function SettingsPage({ dark = false, setPage }) {
  const [activeItem, setActiveItem] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [processSequence, setProcessSequence] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const txtPrimary = dark ? "#f1f5f9" : "#0f172a";
  const txtMuted = dark ? "#94a3b8" : "#64748b";
  const bgCard = dark ? "#1e293b" : "#ffffff";
  const bdr = dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)";

  const loadDepartments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/inventory/departments`);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setError(data.message || "Could not load departments.");
        setDepartments([]);
        return;
      }
      setDepartments(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load departments.");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeItem === "add-department") loadDepartments();
  }, [activeItem]);

  const suggestedSequence = useMemo(() => {
    const nums = departments
      .map((d) => Number(d.processSequence))
      .filter((n) => !Number.isNaN(n));
    if (!nums.length) return "11";
    return String(Math.floor(Math.max(...nums)) + 1);
  }, [departments]);

  const openForm = () => {
    setShowForm(true);
    setSuccess("");
    setError("");
    setDepartmentName("");
    setProcessSequence(suggestedSequence);
  };

  const goBackToList = () => {
    setActiveItem(null);
    setShowForm(false);
    setError("");
    setSuccess("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const name = departmentName.trim();
    const seq = Number(processSequence);
    if (!name) {
      setError("Department name is required. This is what appears in From Department and To Department.");
      return;
    }
    if (processSequence === "" || Number.isNaN(seq)) {
      setError("Process sequence is required. Enter a number (decimals allowed, e.g. 10.5).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/inventory/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentName: name, processSequence: seq }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = data.details ? Object.values(data.details).join(" ") : "";
        setError(data.message || details || "Could not save department.");
        return;
      }
      setSuccess(`Department "${data.name}" saved. It will appear in Inventory From / To Department lists.`);
      setShowForm(false);
      setDepartmentName("");
      await loadDepartments();
    } catch {
      setError("Could not save department.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    border: `1px solid ${dark ? "rgba(148,163,184,0.25)" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#fff",
    color: txtPrimary,
    fontSize: 14,
    outline: "none",
  };

  if (!activeItem) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640, paddingBottom: 40 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: txtPrimary, margin: 0 }}>Settings</h2>
          <p style={{ fontSize: 13, color: txtMuted, margin: "6px 0 0" }}>
            Department, Item, Category, and Notification. Open a section and pick Generate or Edit &amp; Delete.
          </p>
        </div>
        {SETTINGS_SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "0 2px" }}>
                <SectionIcon size={15} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: txtMuted }}>
                  {section.title}
                </h3>
              </div>
              <div
                role="listbox"
                aria-label={section.title}
                style={{
                  background: bgCard,
                  border: `1px solid ${bdr}`,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                {section.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        setActiveItem(item.id);
                        setShowForm(false);
                        setError("");
                        setSuccess("");
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 18px",
                        border: "none",
                        borderTop: idx === 0 ? "none" : `1px solid ${bdr}`,
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = dark ? "rgba(14,165,233,0.1)" : "#f0f9ff"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: "rgba(14,165,233,0.12)", color: "#0284c7",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: txtPrimary }}>{item.title}</p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: txtMuted }}>{item.subtitle}</p>
                      </div>
                      <ChevronRight size={18} color={txtMuted} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (activeItem === "add-category") {
    return (
      <SettingsAddCategory
        dark={dark}
        onBack={goBackToList}
        onGoAddItem={() => { setActiveItem("add-item"); setShowForm(false); setError(""); setSuccess(""); }}
      />
    );
  }

  if (activeItem === "delete-category") {
    return (
      <SettingsDeleteCategory
        dark={dark}
        onBack={goBackToList}
      />
    );
  }

  if (activeItem === "add-item") {
    return (
      <SettingsAddItem
        dark={dark}
        setPage={setPage}
        onBack={goBackToList}
        onGoAddCategory={() => { setActiveItem("add-category"); setShowForm(false); setError(""); setSuccess(""); }}
      />
    );
  }

  if (activeItem === "edit-item") {
    return (
      <SettingsEditItem
        dark={dark}
        setPage={setPage}
        onBack={goBackToList}
      />
    );
  }

  if (activeItem === "edit-department") {
    return (
      <SettingsEditDepartment
        dark={dark}
        onBack={goBackToList}
      />
    );
  }

  if (activeItem === "generate-notification") {
    return (
      <GenerateNotificationPage
        dark={dark}
        onBack={goBackToList}
        backLabel="Back to Settings"
      />
    );
  }

  if (activeItem === "edit-notification") {
    return (
      <SettingsEditNotification
        dark={dark}
        onBack={goBackToList}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820, paddingBottom: 40 }}>
      <div>
        <button
          type="button"
          onClick={goBackToList}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "none", background: "none", padding: 0, marginBottom: 10,
            color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          <ChevronLeft size={16} /> Back to Settings
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: txtPrimary, margin: 0 }}>Generate Department</h2>
        <p style={{ fontSize: 13, color: txtMuted, margin: "6px 0 0" }}>
          Fill the required department_master fields. The name appears in Inventory From Department and To Department.
        </p>
      </div>

      <div style={{ background: bgCard, border: `1px solid ${bdr}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "rgba(14,165,233,0.12)", color: "#0284c7",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: txtPrimary, margin: 0 }}>New department</h3>
              <p style={{ fontSize: 13, color: txtMuted, margin: "6px 0 0", lineHeight: 1.55, maxWidth: 520 }}>
                Required: <strong>Department name</strong> (unique) and <strong>Process sequence</strong> (sort order).
              </p>
            </div>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={openForm}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 16px", borderRadius: 12, border: "none",
                background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              <Plus size={16} /> New department
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSave} style={{ marginTop: 20, padding: 18, borderRadius: 16, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdr}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: txtMuted, margin: "0 0 14px" }}>Fill every required field below</p>
            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: txtPrimary, marginBottom: 6 }}>
                  Department name <span style={{ color: "#0ea5e9" }}>*</span>
                </span>
                <input
                  style={inputStyle}
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="e.g. Quality, Assembly, Dispatch"
                  autoFocus
                />
                <span style={{ display: "block", fontSize: 11, color: txtMuted, marginTop: 6 }}>
                  Must be unique. This exact name is listed in From Department and To Department.
                </span>
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: txtPrimary, marginBottom: 6 }}>
                  Process sequence <span style={{ color: "#0ea5e9" }}>*</span>
                </span>
                <input
                  style={inputStyle}
                  type="number"
                  step="any"
                  value={processSequence}
                  onChange={(e) => setProcessSequence(e.target.value)}
                  placeholder={suggestedSequence}
                />
                <span style={{ display: "block", fontSize: 11, color: txtMuted, marginTop: 6 }}>
                  Number that controls list order (smaller first). Existing last value is about {suggestedSequence}. Decimals are allowed (example: 10.5).
                </span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px 18px", borderRadius: 12, border: "none",
                  background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 13,
                  cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving…" : "Save department"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(""); }}
                style={{
                  padding: "10px 18px", borderRadius: 12,
                  border: `1px solid ${bdr}`, background: "transparent",
                  color: txtMuted, fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: dark ? "rgba(239,68,68,0.12)" : "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: dark ? "rgba(16,185,129,0.12)" : "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <span style={{ display: "flex", gap: 8 }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              {success}
            </span>
            {setPage && (
              <button
                type="button"
                onClick={() => setPage("inventory")}
                style={{ border: "none", background: "none", color: "#0284c7", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Open Inventory <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ background: bgCard, border: `1px solid ${bdr}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: txtPrimary }}>Departments currently in dropdowns ({departments.length})</span>
          <button type="button" onClick={loadDepartments} style={{ border: "none", background: "none", color: "#0284c7", cursor: "pointer" }} title="Refresh">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", color: txtPrimary }}>
            <thead>
              <tr style={{ textAlign: "left", background: dark ? "rgba(148,163,184,0.08)" : "#f8fafc", color: txtMuted }}>
                <th style={{ padding: "10px 16px" }}>Name</th>
                <th style={{ padding: "10px 16px" }}>Process sequence</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id} style={{ borderTop: `1px solid ${bdr}` }}>
                  <td style={{ padding: "10px 16px", fontWeight: 700 }}>{d.name}</td>
                  <td style={{ padding: "10px 16px" }}>{d.processSequence ?? "—"}</td>
                </tr>
              ))}
              {!loading && departments.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: 16, color: txtMuted }}>No departments loaded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
