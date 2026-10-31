import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import DateInput from "../../../shared/components/DateInput";
import SearchableSelect from "../../../shared/components/SearchableSelect";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { isNumericHeader } from "../newpo/ui";

// ============================================================================
// Job Work (subcontracting). Store stock is not checked here (there is no inventory engine).
// Job-worker balances come from the job work ledger. Every screen calls the real API.
// ============================================================================

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";
const JW = `${API_ROOT}/job-work`;
import { getSetting, setSetting } from "../../../shared/utils/settingsStore";

const USER_KEY = "SMS_CURRENT_USER";
const ROLES = ["CREATOR", "APPROVER", "STORE", "QUALITY", "ADMIN"];
const STEP_SCREENS = [
  { key: "dashboard", label: "Home" },
  { key: "indents", label: "1 · Indents" },
  { key: "orders", label: "2 · Orders" },
  { key: "send", label: "3 · Send material" },
  { key: "receive", label: "4 · Receive material" },
  { key: "receipts", label: "5 · Inspection" }
];
const OTHER_SCREENS = [
  { key: "challans", label: "Challan register" },
  { key: "workers", label: "Job Workers" },
  { key: "ledger", label: "Worker Stock Ledger" },
  { key: "recon", label: "Reconciliation & Scrap" },
  { key: "reports", label: "Reports" },
  { key: "operations", label: "Operations Master" }
];
const SCREENS = [...STEP_SCREENS, ...OTHER_SCREENS];
const RATE_BASIS = ["PER_PIECE", "PER_KG", "PER_BATCH", "PER_HOUR"];
const DEFECTS_NOTE = "Give a defect code for rejected, rework or scrap quantities.";

const ORDER_STYLE = {
  DRAFT: { bg: "#f1f5f9", fg: "#334155", label: "Draft" },
  PENDING_APPROVAL: { bg: "#fef3c7", fg: "#92400e", label: "Pending approval" },
  APPROVED: { bg: "#dbeafe", fg: "#1e40af", label: "Approved" },
  REJECTED: { bg: "#fee2e2", fg: "#991b1b", label: "Rejected" },
  IN_PROGRESS: { bg: "#e0e7ff", fg: "#3730a3", label: "In progress" },
  PARTIALLY_RECEIVED: { bg: "#fef9c3", fg: "#854d0e", label: "Partially received" },
  COMPLETED: { bg: "#dcfce7", fg: "#166534", label: "Completed" },
  CLOSED: { bg: "#e2e8f0", fg: "#0f172a", label: "Closed" },
  CANCELLED: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelled" }
};
const INDENT_STYLE = {
  DRAFT: { bg: "#f1f5f9", fg: "#334155", label: "Draft" },
  SUBMITTED: { bg: "#fef3c7", fg: "#92400e", label: "Submitted" },
  APPROVED: { bg: "#dcfce7", fg: "#166534", label: "Approved" },
  REJECTED: { bg: "#fee2e2", fg: "#991b1b", label: "Rejected" },
  CANCELLED: { bg: "#e2e8f0", fg: "#0f172a", label: "Cancelled" }
};
const CHALLAN_STYLE = {
  POSTED: { bg: "#e0e7ff", fg: "#3730a3", label: "Dispatched" },
  CANCELLED: { bg: "#fee2e2", fg: "#991b1b", label: "Reversed" }
};
const WORKER_STYLE = {
  ACTIVE: { bg: "#dcfce7", fg: "#166534", label: "Active" },
  INACTIVE: { bg: "#f1f5f9", fg: "#475569", label: "Inactive" },
  BLOCKED: { bg: "#fee2e2", fg: "#991b1b", label: "Blocked" }
};

// ----------------------------------------------------------------------------
// helpers
// ----------------------------------------------------------------------------

const TODAY = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dateText = (v) => (v ? formatDisplayDate(v) : "—");
const num = (v) => { const n = Number(v); return Number.isNaN(n) ? 0 : n; };
const qty = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const money = (v) => num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const newKey = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function loadUser() {
  const u = getSetting(USER_KEY, null);
  if (u && u.name) return { name: u.name, role: ROLES.includes(u.role) ? u.role : "CREATOR" };
  return { name: "Current User", role: "CREATOR" };
}
function saveUser(u) {
  setSetting(USER_KEY, u);
}

async function api(method, path, user, body) {
  const res = await fetch(`${JW}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-User-Name": user.name, "X-User-Role": user.role },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) throw new Error((data && (data.message || data.error)) || `Request failed (HTTP ${res.status})`);
  return data;
}

async function plainGet(path) {
  try {
    const res = await fetch(`${API_ROOT}${path}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
}

async function openBlob(path, user, mime) {
  const res = await fetch(`${JW}${path}`, { headers: { "X-User-Name": user.name, "X-User-Role": user.role } });
  if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
  return URL.createObjectURL(new Blob([await res.arrayBuffer()], { type: mime }));
}

// ----------------------------------------------------------------------------
// UI pieces (same look as the other purchase screens)
// ----------------------------------------------------------------------------

const inp = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 6, padding: "7px 9px", fontSize: 13, color: "#0f172a", background: "#fff", outline: "none" };
const labelStyle = { fontSize: 12, fontWeight: 700, color: "#334155" };
const btn = (variant = "ghost") => ({
  border: variant === "ghost" ? "1px solid #cbd5e1" : "none",
  background: variant === "primary" ? "#1e293b" : variant === "danger" ? "#dc2626" : "#fff",
  color: variant === "ghost" ? "#334155" : "#fff",
  borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: variant === "ghost" ? 600 : 700, cursor: "pointer", whiteSpace: "nowrap",
  boxShadow: variant === "primary" ? "0 2px 4px rgba(30, 41, 59, 0.25)" : "none"
});
const h4 = { fontSize: 13, fontWeight: 800, color: "#0f172a", margin: "18px 0 8px", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 };
const grid4 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 };

function Badge({ map, value }) {
  const s = map[value] || { bg: "#f1f5f9", fg: "#334155", label: value || "—" };
  return <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Field({ label, required, error, hint, span = 1, children }) {
  return (
    <div style={{ gridColumn: span > 1 ? `span ${span}` : undefined, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <label style={labelStyle}>{label}{required && <span style={{ color: "#dc2626" }}> *</span>}</label>
      {children}
      {error ? <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span> : hint ? <span style={{ fontSize: 11, color: "#64748b" }}>{hint}</span> : null}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", marginBottom: 14 }}>
      <header style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: "10px 10px 0 0" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: "#64748b" }}>{subtitle}</div>}
      </header>
      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>{children}</div>
    </section>
  );
}

function Banner({ kind = "error", children }) {
  const c = kind === "error" ? ["#fef2f2", "#991b1b", "#fecaca"] : kind === "warn" ? ["#fffbeb", "#92400e", "#fde68a"] : ["#ecfdf5", "#065f46", "#a7f3d0"];
  return <div style={{ background: c[0], color: c[1], border: `1px solid ${c[2]}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>{children}</div>;
}

function Modal({ title, onClose, children, footer, width = 760, zIndex = 1000, page, badge, backLabel = "Back" }) {
  // page = a full screen inside the Job Work area with a Back button, so a form or a record is one thing on one screen.
  if (page) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "#f1f5f9", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "9px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={onClose} style={{ ...btn(), fontSize: 13, padding: "7px 16px" }}>← {backLabel}</button>
          <span style={{ color: "#e2e8f0", fontSize: 18 }}>|</span>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{title}</div>
          {badge}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 18 }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
        </div>
        {footer && (
          <div style={{ background: "#fff", borderTop: "1px solid #e2e8f0", padding: "10px 18px", display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>{footer}</div>
        )}
      </div>
    );
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: width, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{title}</div>
          <button onClick={onClose} style={{ ...btn(), padding: "2px 10px" }} aria-label="Close">×</button>
        </div>
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "10px 16px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#0f172a", wordBreak: "break-word" }}>{value === null || value === undefined || value === "" ? "—" : value}</span>
    </div>
  );
}

function Table({ headers, children, minWidth }) {
  // A header takes the alignment of the cells under it (Td right), so the two can never disagree. Guessing from the
  // header text (isNumericHeader) is only the fallback while the table has no plain data row to read.
  const bodyRef = useRef(null);
  const [bodyAligns, setBodyAligns] = useState([]);
  useLayoutEffect(() => {
    const row = Array.from(bodyRef.current ? bodyRef.current.rows : [])
      .find((r) => r.cells.length === headers.length && Array.from(r.cells).every((c) => c.colSpan === 1));
    if (!row) return;
    const next = Array.from(row.cells).map((c) => (c.style.textAlign === "right" ? "right" : "left"));
    setBodyAligns((prev) => (prev.length === next.length && prev.every((a, i) => a === next[i]) ? prev : next));
  });
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
      <table style={{ width: "100%", minWidth, borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {headers.map((h, i) => {
              const label = typeof h === "string" ? h : (h && h.label) || "";
              const align = bodyAligns.length === headers.length ? bodyAligns[i] : (isNumericHeader(label) ? "right" : "left");
              return (
                <th key={label} style={{ textAlign: align, padding: "7px 8px", borderBottom: "1px solid #e2e8f0", color: "#334155", whiteSpace: "nowrap" }}>
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody ref={bodyRef}>{children}</tbody>
      </table>
    </div>
  );
}
const Td =({ children, right }) => <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: right ? "right" : "left", verticalAlign: "top" }}>{children}</td>;
const Empty = ({ text }) => <div style={{ fontSize: 12, color: "#64748b", padding: "8px 0" }}>{text}</div>;

// Tabs inside a record page: one topic at a time.
function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e2e8f0", margin: "18px 0 14px", flexWrap: "wrap" }}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            style={{ border: "none", background: on ? "#fff" : "transparent", color: on ? "#0f172a" : "#475569", fontWeight: 800, fontSize: 13, padding: "9px 16px", cursor: "pointer",
              borderBottom: on ? "3px solid #1e293b" : "3px solid transparent", marginBottom: -2, borderRadius: "8px 8px 0 0" }}>
            {t.label}{t.count !== undefined && t.count !== null && <span style={{ marginLeft: 6, background: on ? "#dbeafe" : "#e2e8f0", borderRadius: 999, padding: "1px 8px", fontSize: 11 }}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// A big number with a plain label.
function Tile({ label, value, tone = "#0f172a", hint, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", minWidth: 0, cursor: onClick ? "pointer" : "default" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: tone, lineHeight: 1.2 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "#94a3b8" }}>{hint}</div>}
    </div>
  );
}
const tileGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };

function Bar({ value, total, color = "#2563eb", height = 8 }) {
  const pct = num(total) > 0 ? Math.min(100, Math.max(0, (num(value) / num(total)) * 100)) : 0;
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 999, height, overflow: "hidden", minWidth: 60 }}>
      <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 999 }} />
    </div>
  );
}

// Queue filter: one button per status with how many records are in it.
function Chips({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key || "all"} onClick={() => onChange(o.key)}
            style={{ border: on ? "1px solid #1e293b" : "1px solid #cbd5e1", background: on ? "#1e293b" : "#fff", color: on ? "#fff" : "#334155", borderRadius: 999,
              padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {o.label}{o.count !== undefined && o.count !== null && <span style={{ marginLeft: 6, color: on ? "#fff" : (o.tone || "#64748b"), fontWeight: 800 }}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Page title for a list screen: what this screen is for, in one line.
function ScreenIntro({ title, text, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{title}</span>
        <span style={{ fontSize: 12, color: "#64748b", marginLeft: 10 }}>{text}</span>
      </div>
      {action}
    </div>
  );
}

// ============================================================================
// Dashboard
// ============================================================================

function DashboardScreen({ user, goTo, flash }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("GET", "/dashboard", user).then(setD).catch((e) => setError(e.message));
  }, [user]);
  if (error) return <Banner kind="error">{error}</Banner>;
  if (!d) return <Empty text="Loading dashboard…" />;
  const byStatus = d.ordersByStatus || {};
  const card = (label, value, onClick, tone = "#0f172a", hint) => (
    <div onClick={onClick} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", background: "#fff", cursor: onClick ? "pointer" : "default", minWidth: 0 }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = "#2563eb"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone }}>{value}</div>
      {hint && <div style={{ fontSize: 10, color: "#94a3b8" }}>{hint}</div>}
    </div>
  );
  const steps = [
    { n: 1, title: "Indents", count: d.pendingIndentApprovals, text: "waiting for approval", go: "indents", f: { status: "SUBMITTED" }, cta: "Open indents" },
    { n: 2, title: "Job work orders", count: d.ordersPendingApproval, text: "waiting for approval", go: "orders", f: { status: "PENDING_APPROVAL" }, cta: "Open orders" },
    { n: 3, title: "Send material", count: byStatus.APPROVED || 0, text: "approved orders waiting to be sent", go: "send", cta: "Send material" },
    { n: 4, title: "Receive material", count: d.pendingReturnOrders, text: "orders with material at the job worker", go: "receive", cta: "Receive material" },
    { n: 5, title: "Inspection", count: d.receiptsAwaitingInspection, text: "receipts waiting for inspection", go: "receipts", f: { inspection: "PENDING" }, cta: "Inspect" }
  ];
  return (
    <div>
      <ScreenIntro title="Job Work" text="Material goes out to a job worker, comes back processed, and is inspected. Work through the five steps in order; the number shows what is waiting for you." />
      {num(d.overdueOrders) > 0 && (
        <div onClick={() => goTo("orders", { overdue: "true" })} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 12, cursor: "pointer" }}>
          {d.overdueOrders} order{d.overdueOrders > 1 ? "s are" : " is"} past the return date. Click to see {d.overdueOrders > 1 ? "them" : "it"}.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        {steps.map((st) => (
          <div key={st.n} style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: st.count > 0 ? "3px solid #1e293b" : "3px solid #e2e8f0", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "#1e293b", color: "#fff", borderRadius: 999, width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{st.n}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{st.title}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: st.count > 0 ? "#0f172a" : "#94a3b8", lineHeight: 1.1 }}>{st.count}</div>
            <div style={{ fontSize: 12, color: "#64748b", minHeight: 30 }}>{st.text}</div>
            <button style={{ ...btn(st.count > 0 ? "primary" : "ghost"), padding: "8px 12px" }} onClick={() => goTo(st.go, st.f || {})}>{st.cta} →</button>
          </div>
        ))}
      </div>
      <h4 style={{ ...h4, marginTop: 26, fontSize: 15 }}>All job work orders by status</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {card("Total orders", d.totalOrders, () => goTo("orders", {}))}
        {Object.entries(ORDER_STYLE).map(([k, v]) => <React.Fragment key={k}>{card(v.label, byStatus[k] || 0, () => goTo("orders", { status: k }), v.fg)}</React.Fragment>)}
      </div>
      <h4 style={h4}>Action needed</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        {card("Indents awaiting approval", d.pendingIndentApprovals, () => goTo("indents", { status: "SUBMITTED" }), "#92400e")}
        {card("Orders awaiting approval", d.ordersPendingApproval, () => goTo("orders", { status: "PENDING_APPROVAL" }), "#92400e")}
        {card("Overdue orders", d.overdueOrders, () => goTo("orders", { overdue: "true" }), "#991b1b", "return date passed")}
        {card("Orders with material out (in progress)", d.pendingReturnOrders, () => goTo("orders", { status: "IN_PROGRESS" }), "#854d0e")}
        {card("Challans open (not fully back)", d.openChallans, () => goTo("challans", {}), "#3730a3")}
        {card("Receipts awaiting inspection", d.receiptsAwaitingInspection, () => goTo("receipts", { inspection: "PENDING" }), "#854d0e")}
      </div>
      <h4 style={h4}>Material and quality</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        {card("Material with job workers (qty)", qty(d.materialWithWorkersQty), () => goTo("ledger", {}))}
        {card("Rejected qty", qty(d.rejectedQty), () => goTo("receipts", { inspection: "DONE" }), "#991b1b")}
        {card("Rework qty (generated)", qty(d.reworkQty), null, "#854d0e")}
        {card("Rework still pending re-dispatch", qty(d.reworkPendingQty), () => goTo("challans", {}))}
        {card("Scrap qty", qty(d.scrapQty), null, "#475569", "approval workflow comes with reconciliation")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <div>
          <h4 style={h4}>Job work cost by job worker</h4>
          {(d.costByWorker || []).length === 0 ? <Empty text="No orders yet." /> : (
            <Table headers={["Job worker", "Orders", "Estimated cost"]}>
              {d.costByWorker.map((r) => <tr key={r.name}><Td>{r.name}</Td><Td right>{r.orders}</Td><Td right>{money(r.amount)}</Td></tr>)}
            </Table>
          )}
        </div>
        <div>
          <h4 style={h4}>Job work cost by department</h4>
          {(d.costByDepartment || []).length === 0 ? <Empty text="No orders yet." /> : (
            <Table headers={["Department", "Orders", "Estimated cost"]}>
              {d.costByDepartment.map((r) => <tr key={r.name}><Td>{r.name}</Td><Td right>{r.orders}</Td><Td right>{money(r.amount)}</Td></tr>)}
            </Table>
          )}
        </div>
        <div>
          <h4 style={h4}>Job worker turnaround</h4>
          {(d.turnaroundByWorker || []).length === 0 ? <Empty text="No completed returns yet." /> : (
            <Table headers={["Job worker", "Avg days challan→receipt", "Receipts"]}>
              {d.turnaroundByWorker.map((r) => <tr key={r.name}><Td>{r.name}</Td><Td right>{r.avgDays}</Td><Td right>{r.receipts}</Td></tr>)}
            </Table>
          )}
        </div>
      </div>
      {flash && null}
    </div>
  );
}

// ============================================================================
// Job workers
// ============================================================================

// Same rules as the server: phone exactly 10 digits, a valid e-mail, GSTIN / PAN formats and a PAN that matches the GSTIN.
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const digitsOnly = (v, max) => String(v || "").replace(/\D/g, "").slice(0, max);
const vendorPhone = (v) => { const d = String(v || "").replace(/\D/g, ""); return d.length === 10 ? d : ""; };

function workerDetailsError(f) {
  if (f.phone && !/^\d{10}$/.test(f.phone)) return "Phone must be exactly 10 digits.";
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return "Enter a valid e-mail address, for example name@company.com.";
  const gstin = (f.gstin || "").trim().toUpperCase();
  const pan = (f.pan || "").trim().toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) return "GSTIN is not valid. It has 15 characters, for example 27AABCU9603R1ZX.";
  if (pan && !PAN_RE.test(pan)) return "PAN is not valid. It has 10 characters, for example AABCU9603R.";
  if (gstin && pan && gstin.slice(2, 12) !== pan) return "PAN does not match the PAN inside the GSTIN.";
  const credit = Number(f.creditDays);
  if (f.creditDays === "" || Number.isNaN(credit) || credit < 0 || credit > 365) return "Credit days must be between 0 and 365.";
  return "";
}

/** Payment terms from Masters > Payment Terms. */
function usePaymentTerms() {
  const [terms, setTerms] = useState([]);
  useEffect(() => { plainGet("/masters/payment-terms").then((rows) => setTerms(rows.filter((t) => t.isActive !== false))).catch(() => setTerms([])); }, []);
  return terms;
}

function PaymentTermsSelect({ value, onChange, terms, emptyLabel = "-- Select payment terms --" }) {
  const known = terms.some((t) => t.name === value);
  return (
    <select style={inp} value={value || ""} onChange={onChange}>
      <option value="">{emptyLabel}</option>
      {value && !known && <option value={value}>{value}</option>}
      {terms.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
    </select>
  );
}

function WorkerDetailFields({ f, set, terms }) {
  return (
    <>
      <Field label="GSTIN" hint="From the Vendor Master; check it"><input style={inp} maxLength={15} value={f.gstin} onChange={(e) => set("gstin")({ target: { value: e.target.value.toUpperCase() } })} /></Field>
      <Field label="PAN" hint="Characters 3–12 of the GSTIN"><input style={inp} maxLength={10} value={f.pan} onChange={(e) => set("pan")({ target: { value: e.target.value.toUpperCase() } })} /></Field>
      <Field label="Registered address" span={2}><input style={inp} value={f.registeredAddress} onChange={set("registeredAddress")} /></Field>
      <Field label="Contact person"><input style={inp} maxLength={255} value={f.contactPerson} onChange={set("contactPerson")} /></Field>
      <Field label="Phone" hint="10 digits"><input style={inp} inputMode="numeric" maxLength={10} placeholder="9876543210" value={f.phone} onChange={(e) => set("phone")({ target: { value: digitsOnly(e.target.value, 10) } })} /></Field>
      <Field label="Email"><input style={inp} type="email" maxLength={255} value={f.email} onChange={set("email")} /></Field>
      <Field label="Work location"><input style={inp} value={f.workLocation} onChange={set("workLocation")} /></Field>
      <Field label="Payment terms" hint="From Masters > Payment Terms"><PaymentTermsSelect value={f.paymentTerms} onChange={set("paymentTerms")} terms={terms} /></Field>
      <Field label="Credit days"><input type="number" min="0" max="365" style={inp} value={f.creditDays} onChange={set("creditDays")} /></Field>
    </>
  );
}

const workerBody = (f) => ({
  contactPerson: f.contactPerson.trim() || null, phone: f.phone || null, email: f.email.trim() || null,
  workLocation: f.workLocation.trim() || null, paymentTerms: f.paymentTerms || null, creditDays: Number(f.creditDays),
  gstin: f.gstin.trim().toUpperCase() || null, pan: f.pan.trim().toUpperCase() || null, registeredAddress: f.registeredAddress.trim() || null
});

const EMPTY_WORKER = { supplierCode: "", operationIds: [], gstin: "", pan: "", registeredAddress: "", contactPerson: "", phone: "", email: "", workLocation: "", paymentTerms: "", creditDays: "30" };

function WorkerForm({ user, onSaved, onClose }) {
  const [candidates, setCandidates] = useState([]);
  const [ops, setOps] = useState([]);
  const terms = usePaymentTerms();
  const [f, setF] = useState(EMPTY_WORKER);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("GET", "/vendor-candidates", user).then(setCandidates).catch((e) => setError(e.message));
    api("GET", "/operations", user).then(setOps).catch((e) => setError(e.message));
  }, [user]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  // Picking a vendor fills the form from the Vendor Master; nothing is saved that is not shown here.
  const pickVendor = (e) => {
    const code = e && e.target ? e.target.value : e;
    const v = candidates.find((c) => c.supplierCode === code);
    setF((x) => ({ ...x, supplierCode: code, gstin: v?.gstin || "", pan: v?.pan || "", registeredAddress: v?.registeredAddress || "",
      contactPerson: v?.contactPerson || "", phone: vendorPhone(v?.phone), email: v?.email || "" }));
  };
  const toggleOp = (id) => setF((x) => ({ ...x, operationIds: x.operationIds.includes(id) ? x.operationIds.filter((o) => o !== id) : [...x.operationIds, id] }));
  const save = async () => {
    setError("");
    if (!f.supplierCode) { setError("Select a vendor from the Vendor Master."); return; }
    if (f.operationIds.length === 0) { setError("Select at least one approved job work operation."); return; }
    const bad = workerDetailsError(f);
    if (bad) { setError(bad); return; }
    setBusy(true);
    try {
      const w = await api("POST", "/workers", user, { supplierCode: f.supplierCode, operationIds: f.operationIds, ...workerBody(f) });
      onSaved(w, `${w.workerCode} onboarded as job worker.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal page title="Onboard job worker" onClose={onClose} width={860}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn("primary")} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save job worker"}</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Vendor" subtitle="Pick a vendor from the Vendor Master. Its details fill in below for you to check or correct. A vendor can be onboarded only once.">
        <Field label="Vendor" required span={2}>
          <SearchableSelect options={candidates.map((c) => ({ value: c.supplierCode, label: `${c.supplierName} (${c.supplierCode})`, sub: [c.gstin, c.state].filter(Boolean).join(" · ") }))}
            value={f.supplierCode} placeholder="Search vendor" onChange={pickVendor} />
        </Field>
        <Field label="Approved operations" required span={3} hint="From the Job Work Operations master. Rates can only be added for these operations">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ops.map((o) => (
              <label key={o.id} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px" }}>
                <input type="checkbox" checked={f.operationIds.includes(o.id)} onChange={() => toggleOp(o.id)} /> {o.operationName}
              </label>
            ))}
          </div>
        </Field>
      </Section>
      {f.supplierCode && (
        <Section title="Job worker details" subtitle="Filled from the Vendor Master. A phone that is not 10 digits there is left blank.">
          <WorkerDetailFields f={f} set={set} terms={terms} />
        </Section>
      )}
    </Modal>
  );
}

function WorkerEditForm({ user, w, onSaved, onClose }) {
  const terms = usePaymentTerms();
  const [ops, setOps] = useState([]);
  const [f, setF] = useState({ ...EMPTY_WORKER, gstin: w.gstin || "", pan: w.pan || "", registeredAddress: w.registeredAddress || "",
    contactPerson: w.contactPerson || "", phone: w.phone || "", email: w.email || "", workLocation: w.workLocation || "",
    paymentTerms: w.paymentTerms || "", creditDays: String(w.creditDays ?? 30), operationIds: (w.operations || []).map((o) => o.id) });
  const [error, setError] = useState("");
  useEffect(() => { api("GET", "/operations", user).then(setOps).catch((e) => setError(e.message)); }, [user]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  const toggleOp = (id) => setF((x) => ({ ...x, operationIds: x.operationIds.includes(id) ? x.operationIds.filter((o) => o !== id) : [...x.operationIds, id] }));
  const save = async () => {
    setError("");
    if (f.operationIds.length === 0) return setError("Keep at least one approved operation.");
    const bad = workerDetailsError(f);
    if (bad) return setError(bad);
    try {
      await api("PUT", `/workers/${w.id}`, user, { ...workerBody(f), operationIds: f.operationIds, status: w.status, blockedReason: w.blockedReason || null });
      onSaved();
    } catch (e) { setError(e.message); }
  };
  return (
    <Section title="Edit job worker details">
      {error && <div style={{ gridColumn: "1 / -1" }}><Banner kind="error">{error}</Banner></div>}
      <WorkerDetailFields f={f} set={set} terms={terms} />
      <Field label="Approved operations" required span={3}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ops.map((o) => (
            <label key={o.id} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px" }}>
              <input type="checkbox" checked={f.operationIds.includes(o.id)} onChange={() => toggleOp(o.id)} /> {o.operationName}
            </label>
          ))}
        </div>
      </Field>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={btn()} onClick={onClose}>Close</button>
        <button style={btn("primary")} onClick={save}>Save details</button>
      </div>
    </Section>
  );
}

function RateForm({ user, workerId, ops, onSaved, onClose }) {
  const [f, setF] = useState({ operationId: "", itemCategory: "", rateBasis: "PER_PIECE", rate: "", minQty: "0", effectiveFrom: TODAY(), validUntil: addDays(365) });
  const [cats, setCats] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { plainGet("/job-work/categories").then(setCats); }, []);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  const save = async () => {
    setError("");
    try {
      const res = await api("POST", `/workers/${workerId}/rate-contracts`, user, {
        operationId: Number(f.operationId), itemCategory: f.itemCategory || null, rateBasis: f.rateBasis, rate: Number(f.rate),
        minQty: Number(f.minQty || 0), effectiveFrom: f.effectiveFrom, validUntil: f.validUntil
      });
      onSaved(res, "Rate contract added.");
    } catch (e) { setError(e.message); }
  };
  return (
    <Section title="Add rate contract" subtitle="A new rate for the same operation and category must follow revocation of the old one.">
      {error && <div style={{ gridColumn: "1 / -1" }}><Banner kind="error">{error}</Banner></div>}
      <Field label="Operation" required><SearchableSelect value={f.operationId} onChange={set("operationId")} placeholder="Select operation" options={ops.map((o) => ({ value: o.id, label: o.operationName }))} /></Field>
      <Field label="Item category" hint="Blank = all categories"><SearchableSelect value={f.itemCategory} onChange={set("itemCategory")} emptyLabel="All categories" options={cats.map((c) => ({ value: c.categoryName, label: c.categoryName }))} /></Field>
      <Field label="Rate basis" required><select style={inp} value={f.rateBasis} onChange={set("rateBasis")}>{RATE_BASIS.map((b) => <option key={b} value={b}>{b.replace("_", " ").toLowerCase()}</option>)}</select></Field>
      <Field label="Rate" required><input type="number" min="0" step="0.01" style={inp} value={f.rate} onChange={set("rate")} /></Field>
      <Field label="Minimum qty per order"><input type="number" min="0" style={inp} value={f.minQty} onChange={set("minQty")} /></Field>
      <Field label="Effective from" required><DateInput value={f.effectiveFrom} onChange={set("effectiveFrom")} style={inp} /></Field>
      <Field label="Valid until" required><DateInput value={f.validUntil} onChange={set("validUntil")} style={inp} /></Field>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={btn()} onClick={onClose}>Close</button>
        <button style={btn("primary")} onClick={save}>Add rate</button>
      </div>
    </Section>
  );
}

function WorkerDetail({ id, user, onClose, flash, onChanged }) {
  const [w, setW] = useState(null);
  const [error, setError] = useState("");
  const [addRate, setAddRate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [ops, setOps] = useState([]);
  const load = useCallback(() => api("GET", `/workers/${id}`, user).then(setW).catch((e) => setError(e.message)), [id, user]);
  useEffect(() => { load(); plainGet("/job-work/operations").then(setOps); }, [load]);
  const setStatus = async (status) => {
    try {
      await api("PUT", `/workers/${id}`, user, { status, blockedReason: status === "BLOCKED" ? blockReason : null, reason: blockReason || null });
      flash(`Job worker ${status.toLowerCase()}.`); load(); onChanged();
    } catch (e) { setError(e.message); }
  };
  const revoke = async (c) => {
    const reason = window.prompt("Reason for revoking this rate contract?");
    if (!reason) return;
    try { await api("POST", `/rate-contracts/${c.id}/revoke`, user, { comments: reason }); flash("Rate contract revoked."); load(); } catch (e) { flash(e.message, true); }
  };
  if (!w) return <Modal page title="Job worker" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  return (
    <Modal page title={`${w.workerCode} · ${w.legalName}`} onClose={onClose} width={980}>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <Badge map={WORKER_STYLE} value={w.status} />
        <span style={{ fontSize: 12, color: "#64748b" }}>Open orders: {w.openOrders}</span>
      </div>
      <h4 style={h4}>Master details</h4>
      <div style={grid4}>
        <KV label="Vendor code" value={w.supplierCode} />
        <KV label="GSTIN" value={w.gstin} />
        <KV label="PAN" value={w.pan} />
        <KV label="Registered address" value={w.registeredAddress} />
        <KV label="Work location" value={w.workLocation} />
        <KV label="Contact" value={[w.contactPerson, w.phone, w.email].filter(Boolean).join(" · ")} />
        <KV label="Payment terms / credit days" value={`${w.paymentTerms || "—"} / ${w.creditDays}`} />
        <KV label="Approved operations" value={(w.operations || []).map((o) => o.operationName).join(", ")} />
      </div>
      <div style={{ marginTop: 10 }}>
        {!editing ? <button style={btn()} onClick={() => setEditing(true)}>Edit details</button>
          : <WorkerEditForm user={user} w={w} onClose={() => setEditing(false)}
              onSaved={() => { setEditing(false); flash("Job worker details saved."); load(); onChanged(); }} />}
      </div>
      <h4 style={h4}>Rate contracts</h4>
      {(w.rateContracts || []).length === 0 ? <Empty text="No rate contracts. Orders cannot be raised until one is added." /> : (
        <Table headers={["Operation", "Category", "Basis", "Rate", "Min qty", "Valid", "Status", ""]} minWidth={720}>
          {w.rateContracts.map((c) => (
            <tr key={c.id}>
              <Td>{c.operationName}</Td><Td>{c.itemCategory || "All"}</Td><Td>{c.rateBasis}</Td><Td right>{money(c.rate)}</Td><Td right>{qty(c.minQty)}</Td>
              <Td>{dateText(c.effectiveFrom)} → {dateText(c.validUntil)}</Td><Td>{c.status}</Td>
              <Td>{c.status === "ACTIVE" && <button style={{ ...btn(), padding: "2px 8px" }} onClick={() => revoke(c)}>Revoke</button>}</Td>
            </tr>
          ))}
        </Table>
      )}
      <div style={{ marginTop: 10 }}>
        {!addRate ? <button style={btn()} onClick={() => setAddRate(true)}>+ Add rate contract</button>
          : <RateForm user={user} workerId={id} ops={w.operations || ops} onSaved={() => { setAddRate(false); flash("Rate contract added."); load(); }} onClose={() => setAddRate(false)} />}
      </div>
      <h4 style={h4}>Material with this worker (ledger balance)</h4>
      <WorkerBalances user={user} workerId={id} />
      <h4 style={h4}>Status</h4>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button style={btn()} onClick={() => setStatus("ACTIVE")}>Set active</button>
        <button style={btn()} onClick={() => setStatus("INACTIVE")}>Set inactive</button>
        <input style={{ ...inp, width: 260 }} placeholder="Reason for blocking" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
        <button style={btn("danger")} onClick={() => setStatus("BLOCKED")}>Block worker</button>
      </div>
      {w.blockedReason && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 6 }}>Blocked: {w.blockedReason}</div>}
      <h4 style={h4}>History</h4>
      {(w.history || []).length === 0 ? <Empty text="No history." /> : (
        <Table headers={["When", "Action", "By", "Detail"]} minWidth={560}>
          {w.history.map((h) => <tr key={h.id}><Td>{formatDisplayDate(h.actedAt)}</Td><Td>{h.action}</Td><Td>{h.actor} ({h.actorRole})</Td><Td>{h.comments || (h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : "—")}</Td></tr>)}
        </Table>
      )}
    </Modal>
  );
}

function WorkerBalances({ user, workerId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api("GET", `/workers/${workerId}/balances`, user).then(setRows).catch(() => setRows([])); }, [user, workerId]);
  if (!rows) return <Empty text="Loading…" />;
  if (rows.length === 0) return <Empty text="Nothing is with this worker right now." />;
  return (
    <Table headers={["Item", "Category", "Qty with worker"]} minWidth={420}>
      {rows.map((r) => <tr key={`${r.itemMasterId}-${r.category}`}><Td>{r.itemCode}</Td><Td>{r.category}</Td><Td right>{qty(r.balanceQty)}</Td></tr>)}
    </Table>
  );
}

function WorkersScreen({ user, flash }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setPage(0); }, [q, status]);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    api("GET", `/workers?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [user, q, status, page, tick]);
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "flex-end" }}>
        <div style={{ width: 280 }}><Field label="Search"><input style={inp} placeholder="Name, code or GSTIN" value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <div style={{ width: 180 }}><Field label="Status"><select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{Object.entries(WORKER_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field></div>
        <div style={{ marginLeft: "auto" }}><button style={btn("primary")} onClick={() => setCreating(true)}>+ Onboard job worker</button></div>
      </div>
      <Table headers={["Code", "Legal name", "GSTIN", "Location", "Payment terms", "Status", ""]} minWidth={900}>
        {loading && <tr><Td>Loading…</Td></tr>}
        {!loading && data.content.length === 0 && <tr><Td>No job workers yet. Onboard a vendor to start.</Td></tr>}
        {data.content.map((w) => (
          <tr key={w.id}>
            <Td><button onClick={() => setDetailId(w.id)} style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0 }}>{w.workerCode}</button></Td>
            <Td>{w.legalName}</Td><Td>{w.gstin || "—"}</Td><Td>{w.workLocation || "—"}</Td>
            <Td>{w.paymentTerms || "—"} · {w.creditDays}d</Td><Td><Badge map={WORKER_STYLE} value={w.status} /></Td>
            <Td><button style={{ ...btn(), padding: "3px 8px" }} onClick={() => setDetailId(w.id)}>Open</button></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
      {creating && <WorkerForm user={user} flash={flash} onClose={() => setCreating(false)}
        onSaved={(w, msg) => { setCreating(false); flash(msg); setTick((t) => t + 1); setDetailId(w.id); }} />}
      {detailId && <WorkerDetail id={detailId} user={user} flash={flash} onClose={() => setDetailId(null)} onChanged={() => setTick((t) => t + 1)} />}
    </div>
  );
}

// Job Work Operations master: the operations offered on job workers, rate contracts, indents and orders.
function OperationsScreen({ user, flash, onChanged }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const load = useCallback(() => api("GET", "/operations?includeInactive=true", user).then((d) => { setRows(d); setError(""); }).catch((e) => setError(e.message)), [user]);
  useEffect(() => { load(); }, [load]);
  const done = (msg) => { flash(msg); load(); onChanged(); };
  const add = async () => {
    if (!name.trim()) return setError("Enter the operation name.");
    try { await api("POST", "/operations", user, { operationName: name.trim() }); setName(""); done("Operation added."); } catch (e) { setError(e.message); }
  };
  const update = async (o, body, msg) => {
    try { await api("PUT", `/operations/${o.id}`, user, body); setRenaming(null); done(msg); } catch (e) { setError(e.message); }
  };
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        These are the operations offered when onboarding a job worker, adding a rate contract, and on indents and orders. Only an approver can change them.
        An operation in use is deactivated instead of deleted, so old records keep their history.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, maxWidth: 520 }}>
        <input style={inp} placeholder="New operation, e.g. Deburring" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        <button style={btn("primary")} onClick={add}>Add operation</button>
      </div>
      <Table headers={["Operation", "Status", "Job workers approved", ""]} minWidth={600}>
        {rows.length === 0 && <tr><Td>No operations.</Td></tr>}
        {rows.map((o) => (
          <tr key={o.id}>
            <Td>{renaming?.id === o.id
              ? <input style={inp} value={renaming.name} maxLength={100} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} />
              : o.operationName}</Td>
            <Td><Badge map={WORKER_STYLE} value={o.status} /></Td>
            <Td right>{o.workerCount}</Td>
            <Td>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {renaming?.id === o.id ? (
                  <>
                    <button style={btn("primary")} onClick={() => update(o, { operationName: renaming.name }, "Operation renamed.")}>Save</button>
                    <button style={btn()} onClick={() => setRenaming(null)}>Cancel</button>
                  </>
                ) : <button style={btn()} onClick={() => setRenaming({ id: o.id, name: o.operationName })}>Rename</button>}
                {o.status === "ACTIVE"
                  ? <button style={btn("danger")} onClick={() => update(o, { status: "INACTIVE" }, "Operation deactivated.")}>Deactivate</button>
                  : <button style={btn()} onClick={() => update(o, { status: "ACTIVE" }, "Operation reactivated.")}>Reactivate</button>}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function Pager({ page, totalPages, total, onPage }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 12 }}>
      <span style={{ color: "#64748b" }}>{total} record(s)</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button style={btn()} disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
        <span>Page {totalPages === 0 ? 0 : page + 1} of {totalPages}</span>
        <button style={btn()} disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

// ============================================================================
// Indents
// ============================================================================

function IndentForm({ user, locations, operations, categories, items, workers = [], editing, onSaved, onClose }) {
  const init = editing ? {
    requestingDepartmentId: String(editing.requestingDepartmentId), preferredJobWorkerId: editing.preferredJobWorkerId ? String(editing.preferredJobWorkerId) : "",
    reason: editing.reason || "", requiredDispatchDate: editing.requiredDispatchDate || "", requiredReturnDate: editing.requiredReturnDate || "",
    productionRef: editing.productionRef || "", estimatedCost: String(editing.estimatedCost || ""), remarks: editing.remarks || "",
    lines: editing.lines.map((l) => ({ masterId: String(l.itemMasterId), category: l.category, operationId: String(l.operationId), requiredQty: String(l.requiredQty), remarks: l.remarks || "" }))
  } : { requestingDepartmentId: "", preferredJobWorkerId: "", reason: "", requiredDispatchDate: TODAY(), requiredReturnDate: addDays(20), productionRef: "", estimatedCost: "", remarks: "",
    lines: [{ masterId: "", category: "", operationId: "", requiredQty: "", remarks: "" }] };
  const [f, setF] = useState(init);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  const setLine = (i, k, v) => setF((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const itemOptions = items.map((m) => ({ value: m.id, label: `${m.code} — ${m.description || ""}`, sub: `${m.category} · ${m.unitOfMeasurement || ""}` }));
  const save = async (submit) => {
    setError("");
    if (!f.requestingDepartmentId) return setError("Select the requesting department.");
    if (!f.reason.trim()) return setError("Give the reason for outsourcing this work.");
    if (f.lines.length === 0 || f.lines.some((l) => !l.masterId || !l.operationId || !(Number(l.requiredQty) > 0))) return setError("Every line needs an item, an operation and a quantity above zero.");
    setBusy(true);
    try {
      const body = {
        clientRequestId: editing ? null : newKey("ind"), indentDate: TODAY(), requestingDepartmentId: Number(f.requestingDepartmentId),
        preferredJobWorkerId: f.preferredJobWorkerId ? Number(f.preferredJobWorkerId) : null,
        reason: f.reason, requiredDispatchDate: f.requiredDispatchDate || null, requiredReturnDate: f.requiredReturnDate || null, productionRef: f.productionRef || null,
        estimatedCost: f.estimatedCost === "" ? null : Number(f.estimatedCost), remarks: f.remarks || null, version: editing ? editing.version : undefined,
        lines: f.lines.map((l) => ({ masterId: Number(l.masterId), category: l.category || null, operationId: Number(l.operationId), requiredQty: Number(l.requiredQty), remarks: l.remarks || null }))
      };
      let d = editing ? await api("PUT", `/indents/${editing.id}`, user, body) : await api("POST", "/indents", user, body);
      if (submit) d = await api("POST", `/indents/${d.id}/submit`, user, { comments: "Submitted" });
      onSaved(d, submit ? `${d.indentNumber} submitted for approval.` : `${d.indentNumber} saved as draft.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal page title={editing ? `Edit ${editing.indentNumber}` : "New job work indent"} onClose={onClose} width={1000}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn()} disabled={busy} onClick={() => save(false)}>Save draft</button><button style={btn("primary")} disabled={busy} onClick={() => save(true)}>Save and submit</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Request">
        <Field label="Requesting department" required><SearchableSelect value={f.requestingDepartmentId} onChange={set("requestingDepartmentId")} placeholder="Select department" options={locations.map((l) => ({ value: l.id, label: l.departmentName }))} /></Field>
        <Field label="Preferred job worker" hint="Optional; filled in on the job work order"><SearchableSelect value={f.preferredJobWorkerId} onChange={set("preferredJobWorkerId")} emptyLabel="No preference" placeholder="Search job worker"
          options={workers.filter((w) => w.status === "ACTIVE").map((w) => ({ value: w.id, label: `${w.legalName} (${w.workerCode})` }))} /></Field>
        <Field label="Reason for outsourcing" required span={2}><input style={inp} value={f.reason} onChange={set("reason")} /></Field>
        <Field label="Required dispatch date"><DateInput value={f.requiredDispatchDate} onChange={set("requiredDispatchDate")} style={inp} /></Field>
        <Field label="Required return date"><DateInput value={f.requiredReturnDate} onChange={set("requiredReturnDate")} style={inp} /></Field>
        <Field label="Production order / BOM reference"><input style={inp} value={f.productionRef} onChange={set("productionRef")} /></Field>
        <Field label="Estimated processing cost"><input type="number" min="0" step="0.01" style={inp} value={f.estimatedCost} onChange={set("estimatedCost")} /></Field>
        <Field label="Remarks" span={2}><input style={inp} value={f.remarks} onChange={set("remarks")} /></Field>
      </Section>
      <Section title="Items" subtitle="Items come from the Item Master, categories from the Category Master and operations from the Job Work Operations master.">
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
          {f.lines.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr 1fr auto", gap: 6, alignItems: "end" }}>
              <SearchableSelect options={itemOptions} value={l.masterId} placeholder="Item code / description"
                onChange={(e) => { const id = e.target.value; const m = items.find((x) => String(x.id) === String(id)); setF((x) => ({ ...x, lines: x.lines.map((y, j) => j === i ? { ...y, masterId: String(id), category: m ? m.category : "" } : y) })); }} />
              <SearchableSelect value={l.category} onChange={(e) => setLine(i, "category", e.target.value)} emptyLabel="Category" placeholder="Category"
                options={categories.map((c) => ({ value: c.categoryName, label: c.categoryName }))} />
              <SearchableSelect value={l.operationId} onChange={(e) => setLine(i, "operationId", e.target.value)} emptyLabel="Operation" placeholder="Operation"
                options={operations.map((o) => ({ value: o.id, label: o.operationName }))} />
              <input type="number" min="0" step="0.01" style={inp} placeholder="Qty" value={l.requiredQty} onChange={(e) => setLine(i, "requiredQty", e.target.value)} />
              <input style={inp} placeholder="Remarks" value={l.remarks} onChange={(e) => setLine(i, "remarks", e.target.value)} />
              <button style={btn()} disabled={f.lines.length === 1} onClick={() => setF((x) => ({ ...x, lines: x.lines.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
          <div><button style={btn()} onClick={() => setF((x) => ({ ...x, lines: [...x.lines, { masterId: "", category: "", operationId: "", requiredQty: "", remarks: "" }] }))}>+ Add item</button></div>
        </div>
      </Section>
    </Modal>
  );
}

// ============================================================================
// Workflow visibility: stage tracker, action panel and next-step text
// ============================================================================

const ORDER_STAGES = [
  { key: "DRAFT", label: "Created" },
  { key: "PENDING_APPROVAL", label: "Submitted" },
  { key: "APPROVED", label: "Approved" },
  { key: "IN_PROGRESS", label: "Dispatched" },
  { key: "PARTIALLY_RECEIVED", label: "Received" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CLOSED", label: "Closed" }
];
const INDENT_STAGES = [
  { key: "DRAFT", label: "Created" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "APPROVED", label: "Approved" },
  { key: "ORDER", label: "Job work order raised" }
];
const ORDER_NEXT_STEP = {
  DRAFT: "Check the order, then send it for approval.",
  PENDING_APPROVAL: "Waiting for an approver to approve or reject this order.",
  APPROVED: "Approved. Send the material to the job worker.",
  IN_PROGRESS: "Material is with the job worker. Send more, or record what came back.",
  PARTIALLY_RECEIVED: "Some material is back. Receive the rest and get it inspected.",
  COMPLETED: "Everything is back. An approver can now close the order.",
  REJECTED: "This order was rejected. Fix it and send it again.",
  CLOSED: "Nothing more to do. The order is closed.",
  CANCELLED: "Nothing more to do. The order is cancelled."
};
const INDENT_NEXT_STEP = {
  DRAFT: "Check the indent, then send it for approval.",
  SUBMITTED: "Waiting for an approver to approve or reject this indent.",
  APPROVED: "Approved. Create the job work order from it.",
  REJECTED: "This indent was rejected. Fix it and send it again.",
  CANCELLED: "Nothing more to do. The indent is cancelled."
};
// Who has to act next, shown beside the status so nobody has to guess.
const ORDER_WHO = {
  DRAFT: "Creator", PENDING_APPROVAL: "Approver", APPROVED: "Store", IN_PROGRESS: "Store", PARTIALLY_RECEIVED: "Store / Quality",
  COMPLETED: "Approver", REJECTED: "Creator", CLOSED: "—", CANCELLED: "—"
};
const INDENT_WHO = { DRAFT: "Creator", SUBMITTED: "Approver", APPROVED: "Creator", REJECTED: "Creator", CANCELLED: "—" };
// The buttons that matter at each status. Everything else goes under "Other actions".
const ORDER_MAIN = {
  DRAFT: ["SUBMIT"], REJECTED: ["SUBMIT"], PENDING_APPROVAL: ["APPROVE", "REJECT"], APPROVED: ["CREATE_CHALLAN"],
  IN_PROGRESS: ["CREATE_CHALLAN", "CREATE_RECEIPT"], PARTIALLY_RECEIVED: ["CREATE_CHALLAN", "CREATE_RECEIPT"], COMPLETED: ["CLOSE"]
};
const INDENT_MAIN = { DRAFT: ["SUBMIT"], REJECTED: ["SUBMIT"], SUBMITTED: ["APPROVE", "REJECT"], APPROVED: ["CREATE_ORDER"] };
// Who may use each order action and in which statuses. Mirrors the server rules.
const ORDER_RULES = {
  EDIT: { label: "Edit draft", statuses: ["DRAFT", "REJECTED"], roles: ["CREATOR", "APPROVER"], variant: "ghost", unsupported: "Editing an order is not available yet. Cancel it and create a new one." },
  SUBMIT: { label: "Send for approval", statuses: ["DRAFT", "REJECTED"], roles: ["CREATOR", "APPROVER"], variant: "primary" },
  APPROVE: { label: "Approve", statuses: ["PENDING_APPROVAL"], roles: ["APPROVER"], variant: "primary", note: "The person who created the order cannot approve it" },
  REJECT: { label: "Reject", statuses: ["PENDING_APPROVAL"], roles: ["APPROVER"], variant: "danger" },
  CANCEL: { label: "Cancel order", statuses: ["DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED"], roles: ["CREATOR", "APPROVER"], variant: "danger" },
  CREATE_CHALLAN: { label: "Send material to worker", statuses: ["APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED"], roles: ["STORE"], variant: "primary" },
  CREATE_RECEIPT: { label: "Receive material back", statuses: ["APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED"], roles: ["STORE"], variant: "primary" },
  CLOSE: { label: "Close order", statuses: ["COMPLETED"], roles: ["APPROVER"], variant: "primary" }
};
const INDENT_RULES = {
  EDIT: { label: "Edit", statuses: ["DRAFT", "REJECTED"], roles: ["CREATOR", "APPROVER"], variant: "ghost" },
  SUBMIT: { label: "Send for approval", statuses: ["DRAFT", "REJECTED"], roles: ["CREATOR", "APPROVER"], variant: "primary" },
  APPROVE: { label: "Approve", statuses: ["SUBMITTED"], roles: ["APPROVER"], variant: "primary", note: "The person who raised the indent cannot approve it" },
  REJECT: { label: "Reject", statuses: ["SUBMITTED"], roles: ["APPROVER"], variant: "danger" },
  CANCEL: { label: "Cancel indent", statuses: ["DRAFT", "SUBMITTED"], roles: ["CREATOR", "APPROVER"], variant: "danger" },
  CREATE_ORDER: { label: "Create job work order", statuses: ["APPROVED"], roles: ["CREATOR", "APPROVER"], variant: "primary" }
};

const orderStageIndex = (d) => ORDER_STAGES.findIndex((s) => s.key === d.status);
const indentStageIndex = (d) => {
  if (d.status === "APPROVED") return (d.orders || []).length > 0 ? 3 : 2;
  return INDENT_STAGES.findIndex((s) => s.key === d.status);
};

function actionReason(rule, status, role, styleMap) {
  if (rule.unsupported) return rule.unsupported;
  if (!rule.statuses.includes(status)) return `Available when the status is: ${rule.statuses.map((s) => styleMap[s].label).join(", ")}`;
  if (role !== "ADMIN" && !rule.roles.includes(role)) return `Needs the ${rule.roles.join(" or ")} role. You are signed in as ${role}.`;
  return rule.note || "Not available right now";
}

function StageTracker({ stages, currentIndex }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      {stages.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: current ? "#1e293b" : done ? "#dcfce7" : "#f1f5f9", color: current ? "#fff" : done ? "#166534" : "#64748b" }}>
              {done ? "✓ " : current ? "● " : ""}{s.label}
            </span>
            {i < stages.length - 1 && <span style={{ color: "#94a3b8", fontSize: 12 }}>→</span>}
          </span>
        );
      })}
    </div>
  );
}

// The one box that tells the user what to do now: a sentence, who acts, and the button(s). Buttons the user cannot press say why.
function NextStepCard({ rules, mainKeys = [], acts, handlers, status, role, styleMap, nextStep, who }) {
  const enabled = (k) => acts.includes(k) && !rules[k].unsupported;
  const mine = mainKeys.filter(enabled);
  const secondary = Object.keys(rules).filter((k) => !mainKeys.includes(k) && enabled(k));
  const waiting = mainKeys.length > 0 && mine.length === 0;
  const tone = mainKeys.length === 0 ? ["#f8fafc", "#e2e8f0", "#475569"] : waiting ? ["#fffbeb", "#fde68a", "#92400e"] : ["#eff6ff", "#93c5fd", "#1d4ed8"];
  return (
    <div style={{ background: tone[0], border: `1px solid ${tone[1]}`, borderLeft: `5px solid ${tone[1]}`, borderRadius: 8, padding: "12px 16px", margin: "10px 0 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: tone[2], letterSpacing: 0.6 }}>
        {mainKeys.length === 0 ? "NOTHING LEFT TO DO" : waiting ? "WAITING" : "YOUR TURN · WHAT TO DO NEXT"}{who && who !== "—" ? ` · Done by: ${who}` : ""}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "3px 0 10px" }}>{nextStep}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        {mainKeys.map((k) => {
          const on = enabled(k);
          return (
            <div key={k} style={{ maxWidth: 300 }}>
              <button disabled={!on} onClick={() => on && handlers[k]()}
                style={{ ...btn(on ? rules[k].variant : "ghost"), fontSize: 13, padding: "8px 20px", opacity: on ? 1 : 0.55, cursor: on ? "pointer" : "not-allowed" }}>{rules[k].label}</button>
              {!on && <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>{actionReason(rules[k], status, role, styleMap)}</div>}
            </div>
          );
        })}
        {secondary.length > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>Other actions:</span>
            {secondary.map((k) => <button key={k} style={btn(rules[k].variant === "danger" ? "danger" : "ghost")} onClick={() => handlers[k]()}>{rules[k].label}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function IndentDetail({ id, user, locations, operations, categories, items, workers, onClose, onChanged, flash, onOpenOrder }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("items");
  const load = useCallback(() => api("GET", `/indents/${id}`, user).then(setD).catch((e) => setError(e.message)), [id, user]);
  useEffect(() => { load(); }, [load]);
  const [ask, setAsk] = useState(null);
  const act = async (action, label) => {
    const run = async (comments) => {
      try { await api("POST", `/indents/${id}/${action}`, user, { comments }); flash(`Indent ${label.toLowerCase()}d.`); load(); onChanged(); } catch (e) { flash(e.message, true); }
    };
    if (["reject", "cancel"].includes(action)) setAsk({ title: `${label} this indent`, confirmLabel: label, run }); else run(null);
  };
  if (editing && d) return <IndentForm user={user} locations={locations} operations={operations} categories={categories} items={items} workers={workers} editing={d}
    onSaved={(x, msg) => { setEditing(false); flash(msg); load(); onChanged(); }} onClose={() => setEditing(false)} />;
  if (!d) return <Modal page title="Indent" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  const acts = d.allowedActions || [];
  const orders = d.orders || [];
  return (
    <Modal page title={`${d.indentNumber} · ${d.reason}`} onClose={onClose} backLabel="Back to indents" badge={<Badge map={INDENT_STYLE} value={d.status} />}>
      <div style={{ fontSize: 12, color: "#64748b" }}>Raised by {d.createdBy} on {dateText(d.indentDate)}</div>
      {indentStageIndex(d) >= 0 && <div style={{ marginTop: 10 }}><StageTracker stages={INDENT_STAGES} currentIndex={indentStageIndex(d)} /></div>}
      {d.rejectionReason && <Banner kind="error">Rejected: {d.rejectionReason}</Banner>}
      <NextStepCard rules={INDENT_RULES} mainKeys={INDENT_MAIN[d.status] && !(d.status === "APPROVED" && orders.length > 0) ? INDENT_MAIN[d.status] : []} acts={acts} status={d.status} role={user.role} styleMap={INDENT_STYLE}
        nextStep={d.status === "APPROVED" && orders.length > 0 ? "A job work order has been raised from this indent." : INDENT_NEXT_STEP[d.status] || "—"}
        who={d.status === "APPROVED" && orders.length > 0 ? "—" : INDENT_WHO[d.status]}
        handlers={{ EDIT: () => setEditing(true), SUBMIT: () => act("submit", "Submit"), APPROVE: () => act("approve", "Approve"), REJECT: () => act("reject", "Reject"),
          CANCEL: () => act("cancel", "Cancel"), CREATE_ORDER: () => onOpenOrder(d) }} />
      <div style={tileGrid}>
        <Tile label="Items" value={(d.lines || []).length} />
        <Tile label="Estimated cost" value={money(d.estimatedCost)} />
        <Tile label="Needed dispatch by" value={dateText(d.requiredDispatchDate)} />
        <Tile label="Needed back by" value={dateText(d.requiredReturnDate)} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "items", label: "Items" }, { key: "details", label: "Details" }, { key: "orders", label: "Job work orders", count: orders.length }, { key: "history", label: "History", count: (d.history || []).length }]} />
      {tab === "items" && (
        <Table headers={["#", "Item", "Category", "Operation", "Quantity needed", "Remarks"]} minWidth={700}>
          {(d.lines || []).map((l) => (
            <tr key={l.id}><Td>{l.lineNo}</Td><Td>{l.itemCode} <span style={{ color: "#64748b" }}>{l.itemName}</span></Td><Td>{l.category}</Td><Td>{l.operationName}</Td><Td right>{qty(l.requiredQty)} {l.uom}</Td>
              <Td>{l.remarks || "—"}</Td></tr>
          ))}
        </Table>
      )}
      {tab === "details" && (
        <div style={grid4}>
          <KV label="Requesting department" value={d.requestingDepartment} />
          <KV label="Production reference" value={d.productionRef} />
          <KV label="Preferred job worker" value={d.preferredWorker} />
        </div>
      )}
      {tab === "orders" && (orders.length === 0 ? <Empty text="No job work order has been raised from this indent yet." /> : (
        <Table headers={["Order", "Status"]} minWidth={300}>
          {orders.map((o) => <tr key={o.id}><Td>{o.jwoNumber}</Td><Td><Badge map={ORDER_STYLE} value={o.status} /></Td></tr>)}
        </Table>
      ))}
      {tab === "history" && ((d.history || []).length === 0 ? <Empty text="No activity yet." /> : (
        <Table headers={["When", "What happened", "Status change", "By (role)", "Comments"]} minWidth={600}>
          {d.history.map((h) => <tr key={h.id}><Td>{formatDisplayDate(h.actedAt)}</Td><Td>{h.action}</Td><Td>{h.fromStatus || "—"} → {h.toStatus || "—"}</Td><Td>{h.actor} ({h.actorRole})</Td><Td>{h.comments || "—"}</Td></tr>)}
        </Table>
      ))}
      {ask && <ReasonModal title={ask.title} confirmLabel={ask.confirmLabel} onCancel={() => setAsk(null)} onConfirm={(text) => { const run = ask.run; setAsk(null); run(text); }} />}
    </Modal>
  );
}

// Counts per status for the queue buttons (first 200 records is plenty for a count).
function useStatusCounts(path, user, tick) {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    api("GET", `${path}${path.includes("?") ? "&" : "?"}size=200`, user).then((d) => {
      const c = { _all: d.totalElements ?? (d.content || []).length };
      (d.content || []).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; if (r.overdue) c._overdue = (c._overdue || 0) + 1; });
      setCounts(c);
    }).catch(() => setCounts(null));
  }, [path, user, tick]);
  return counts;
}

function IndentsScreen({ user, filter, locations, operations, categories, items, workers, flash, onOpenOrder }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(filter.status || "");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [tick, setTick] = useState(0);
  const counts = useStatusCounts("/indents", user, tick);
  useEffect(() => { setStatus(filter.status || ""); }, [filter]);
  useEffect(() => { setPage(0); }, [q, status]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    api("GET", `/indents?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, q, status, page, tick]);
  const chips = [{ key: "", label: "All", count: counts ? counts._all : null }, ...Object.entries(INDENT_STYLE).map(([k, v]) => ({ key: k, label: v.label, count: counts ? counts[k] || 0 : null, tone: v.fg }))];
  return (
    <div>
      <ScreenIntro title="Step 1 · Indents" text="An indent is a request to send material out for job work. It must be approved before a job work order is made."
        action={<button style={{ ...btn("primary"), fontSize: 13, padding: "7px 18px" }} onClick={() => setCreating(true)}>+ New indent</button>} />
      {error && <Banner kind="error">{error}</Banner>}
      <Chips options={chips} value={status} onChange={setStatus} />
      <div style={{ width: 320, marginBottom: 10 }}><input style={inp} placeholder="Search by indent no., reason or item" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Table headers={["Indent no.", "Date", "Items", "Reason", "Est. cost", "Orders", "Status", "What happens next", "Raised by", ""]} minWidth={1100}>
        {data.content.length === 0 && <tr><Td>No indents here.</Td></tr>}
        {data.content.map((r) => (
          <tr key={r.id} onClick={() => setDetailId(r.id)} style={{ cursor: "pointer" }}>
            <Td><b style={{ color: "#2563eb" }}>{r.indentNumber}</b></Td>
            <Td>{dateText(r.indentDate)}</Td><Td>{r.items}</Td><Td>{r.reason}</Td><Td right>{money(r.estimatedCost)}</Td><Td right>{r.orderCount}</Td>
            <Td><Badge map={INDENT_STYLE} value={r.status} /></Td>
            <Td>{r.status === "APPROVED" && r.orderCount > 0 ? "Job work order raised" : INDENT_NEXT_STEP[r.status] || "—"}</Td><Td>{r.createdBy}</Td>
            <Td><button style={{ ...btn("primary"), padding: "4px 12px" }} onClick={(e) => { e.stopPropagation(); setDetailId(r.id); }}>Open</button></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
      {creating && <IndentForm user={user} locations={locations} operations={operations} categories={categories} items={items} workers={workers}
        onSaved={(d, msg) => { setCreating(false); flash(msg); setTick((t) => t + 1); setDetailId(d.id); }} onClose={() => setCreating(false)} />}
      {detailId && <IndentDetail id={detailId} user={user} locations={locations} operations={operations} categories={categories} items={items} workers={workers} flash={flash}
        onClose={() => setDetailId(null)} onChanged={() => setTick((t) => t + 1)} onOpenOrder={(d) => { setDetailId(null); onOpenOrder(d); }} />}
    </div>
  );
}

// ============================================================================
// Job work orders
// ============================================================================

function OrderForm({ user, workers, locations, operations, categories, items, fromIndent, onSaved, onClose }) {
  const [indentId, setIndentId] = useState(fromIndent ? String(fromIndent.id) : "");
  const [approvedIndents, setApprovedIndents] = useState([]);
  // Load approved indents when the form opens, so indents approved after the page loaded still appear.
  // Job workers are loaded when the form opens, so a worker onboarded a moment ago is listed.
  const [freshWorkers, setFreshWorkers] = useState(null);
  const terms = usePaymentTerms();
  useEffect(() => {
    api("GET", "/indents?status=APPROVED&size=200", user).then((d) => setApprovedIndents(d.content || [])).catch(() => setApprovedIndents([]));
    api("GET", "/workers?status=ACTIVE&size=500", user).then((d) => setFreshWorkers(d.content || [])).catch(() => setFreshWorkers(null));
  }, [user]);
  const idOrBlank = (v) => (v === null || v === undefined || v === "" ? "" : String(v));
  const [f, setF] = useState({ jobWorkerId: fromIndent ? idOrBlank(fromIndent.preferredJobWorkerId) : "", jwoDate: TODAY(),
    requestingDepartmentId: fromIndent ? idOrBlank(fromIndent.requestingDepartmentId) : "",
    sourceDepartmentId: fromIndent ? idOrBlank(fromIndent.sourceDepartmentId) : "", expectedReturnDate: addDays(20), expectedCompletionDate: addDays(15),
    paymentTerms: "", qualitySpecs: "", deliveryTerms: "", rejectionTerms: "", remarks: "" });
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  useEffect(() => {
    if (!indentId) return;
    api("GET", `/indents/${indentId}`, user).then((d) => {
      setF((x) => ({ ...x, requestingDepartmentId: idOrBlank(d.requestingDepartmentId), sourceDepartmentId: idOrBlank(d.sourceDepartmentId) || x.sourceDepartmentId,
        jobWorkerId: x.jobWorkerId || idOrBlank(d.preferredJobWorkerId) }));
      setLines(d.lines.map((l) => ({ indentLineNo: l.lineNo, masterId: String(l.itemMasterId), category: l.category, operationId: String(l.operationId), inputQty: String(l.requiredQty), remarks: "" })));
    }).catch((e) => setError(e.message));
  }, [indentId, user]);
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const save = async (submit) => {
    setError("");
    if (!f.jobWorkerId) return setError("Select the job worker.");
    if (!f.sourceDepartmentId) return setError("Select the source store.");
    if (lines.length === 0) return setError("Add at least one item.");
    if (lines.some((l) => !l.masterId || !l.operationId || !(Number(l.inputQty) > 0))) return setError("Every line needs an item, an operation and a quantity above zero.");
    setBusy(true);
    try {
      let d = await api("POST", "/orders", user, {
        clientRequestId: newKey("jwo"), indentId: indentId ? Number(indentId) : null, jobWorkerId: Number(f.jobWorkerId), jwoDate: f.jwoDate,
        requestingDepartmentId: Number(f.requestingDepartmentId), sourceDepartmentId: Number(f.sourceDepartmentId),
        expectedStartDate: TODAY(), expectedCompletionDate: f.expectedCompletionDate || null, expectedReturnDate: f.expectedReturnDate || null,
        paymentTerms: f.paymentTerms || null, qualitySpecs: f.qualitySpecs || null, deliveryTerms: f.deliveryTerms || null, rejectionTerms: f.rejectionTerms || null, remarks: f.remarks || null,
        lines: lines.map((l) => ({ indentLineNo: l.indentLineNo || null, masterId: Number(l.masterId), operationId: Number(l.operationId), category: l.category || null,
          inputQty: Number(l.inputQty), expectedOutputQty: Number(l.inputQty), remarks: l.remarks || null }))
      });
      if (submit) d = await api("POST", `/orders/${d.id}/submit`, user, { comments: "Submitted" });
      onSaved(d, submit ? `${d.jwoNumber} submitted for approval.` : `${d.jwoNumber} saved as draft.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const workerOpts = (freshWorkers || workers).filter((w) => w.status === "ACTIVE").map((w) => ({ value: w.id, label: `${w.legalName} (${w.workerCode})` }));
  return (
    <Modal page title="New job work order" onClose={onClose} width={1000}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn()} disabled={busy} onClick={() => save(false)}>Save draft</button><button style={btn("primary")} disabled={busy} onClick={() => save(true)}>Save and submit</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Order">
        <Field label="From approved indent" hint="Optional: lines and quantities are copied from the indent">
          <SearchableSelect value={indentId} onChange={(e) => setIndentId(e.target.value)} emptyLabel="Direct order (no indent)" options={approvedIndents.map((i) => ({ value: i.id, label: i.indentNumber, sub: i.reason }))} />
        </Field>
        <Field label="Job worker" required><SearchableSelect options={workerOpts} value={f.jobWorkerId} placeholder="Search job worker" onChange={set("jobWorkerId")} /></Field>
        <Field label="Order date"><DateInput value={f.jwoDate} onChange={set("jwoDate")} style={inp} /></Field>
        <Field label="Source store" required><SearchableSelect value={f.sourceDepartmentId} onChange={set("sourceDepartmentId")} placeholder="Select store" options={locations.map((l) => ({ value: l.id, label: l.departmentName }))} /></Field>
        <Field label="Requesting department"><SearchableSelect value={f.requestingDepartmentId} onChange={set("requestingDepartmentId")} placeholder="Select department" options={locations.map((l) => ({ value: l.id, label: l.departmentName }))} /></Field>
        <Field label="Expected completion"><DateInput value={f.expectedCompletionDate} onChange={set("expectedCompletionDate")} style={inp} /></Field>
        <Field label="Expected return date"><DateInput value={f.expectedReturnDate} onChange={set("expectedReturnDate")} style={inp} /></Field>
        <Field label="Payment terms" hint="From Masters > Payment Terms. Blank = the job worker's terms"><PaymentTermsSelect value={f.paymentTerms} onChange={set("paymentTerms")} terms={terms} emptyLabel="Job worker's terms" /></Field>
        <Field label="Quality specifications / acceptance" span={2}><input style={inp} value={f.qualitySpecs} onChange={set("qualitySpecs")} /></Field>
        <Field label="Delivery and rejection terms" span={2}><input style={inp} value={f.deliveryTerms} onChange={set("deliveryTerms")} /></Field>
      </Section>
      <Section title="Items and operations" subtitle="The agreed rate comes from the worker's active rate contract on the order date. Rates are not typed in.">
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr auto", gap: 6, alignItems: "end" }}>
              <SearchableSelect options={items.map((m) => ({ value: m.id, label: `${m.code} — ${m.description || ""}`, sub: m.category }))} value={l.masterId} placeholder="Item"
                onChange={(e) => { const id = e.target.value; const m = items.find((x) => String(x.id) === String(id)); setLines((ls) => ls.map((y, j) => j === i ? { ...y, masterId: String(id), category: m ? m.category : "" } : y)); }} />
              <SearchableSelect value={l.category} onChange={(e) => setLine(i, "category", e.target.value)} emptyLabel="Category" placeholder="Category"
                options={categories.map((c) => ({ value: c.categoryName, label: c.categoryName }))} />
              <SearchableSelect value={l.operationId} onChange={(e) => setLine(i, "operationId", e.target.value)} emptyLabel="Operation" placeholder="Operation"
                options={operations.map((o) => ({ value: o.id, label: o.operationName }))} />
              <input type="number" min="0" step="0.01" style={inp} placeholder="Qty to send" value={l.inputQty} onChange={(e) => setLine(i, "inputQty", e.target.value)} />
              <button style={btn()} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div><button style={btn()} onClick={() => setLines((ls) => [...ls, { indentLineNo: null, masterId: "", category: "", operationId: "", inputQty: "", remarks: "" }])}>+ Add item</button></div>
        </div>
      </Section>
    </Modal>
  );
}

// Number box with a label above it and an optional "fill" shortcut. Used on the send / receive / inspect pages.
function QtyBox({ label, value, onChange, max, fill, fillLabel = "All", width = 130 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{label}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="number" min="0" step="0.01" max={max} style={{ ...inp, width, fontSize: 16, fontWeight: 700 }} value={value || ""} onChange={(e) => onChange(e.target.value)} />
        {fill !== undefined && <button type="button" style={{ ...btn(), padding: "6px 10px" }} onClick={() => onChange(String(fill))}>{fillLabel}</button>}
      </div>
    </div>
  );
}

// One line of an order as a card: the item, and read-only facts above the boxes the user fills.
function LineCard({ title, sub, facts = [], children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div><div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{title}</div>{sub && <div style={{ fontSize: 12, color: "#64748b" }}>{sub}</div>}</div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {facts.map((f) => (
            <div key={f.label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{f.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: f.tone || "#0f172a" }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>
      {children && <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px dashed #e2e8f0" }}>{children}</div>}
    </div>
  );
}

function ChallanForm({ user, order, onSaved, onClose }) {
  const [f, setF] = useState({ challanDate: TODAY(), transporter: "", vehicleNo: "", ewayBillNo: "", authorizedBy: "", destinationLocation: order.lines[0] ? "" : "", purpose: "Job work outward", remarks: "", reworkDispatch: false });
  const [qtys, setQtys] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));
  const rows = order.lines.map((l) => {
    const avail = f.reworkDispatch ? num(l.reworkPending) : num(l.toDispatch);
    return { l, avail };
  }).filter((x) => x.avail > 0);
  const hasRework = order.lines.some((l) => num(l.reworkPending) > 0);
  const total = rows.reduce((sum, { l }) => sum + num(qtys[l.id]), 0);
  const save = async () => {
    setError("");
    const lines = rows.map(({ l }) => ({ jwoLineId: l.id, qty: Number(qtys[l.id] || 0), batchNo: null })).filter((x) => x.qty > 0);
    if (lines.length === 0) return setError("Enter the quantity you are sending on at least one item.");
    if (!f.authorizedBy.trim()) return setError("Enter the name of the person who authorised this dispatch (step 2).");
    setBusy(true);
    try {
      const d = await api("POST", "/challans", user, { clientRequestId: newKey("ch"), jwoId: order.id, challanDate: f.challanDate, reworkDispatch: f.reworkDispatch,
        destinationLocation: f.destinationLocation || null, transporter: f.transporter || null, vehicleNo: f.vehicleNo || null, ewayBillNo: f.ewayBillNo || null,
        purpose: f.purpose, authorizedBy: f.authorizedBy, remarks: f.remarks || null, lines });
      onSaved(d, `${d.challanNumber} created: material recorded as sent to ${order.workerName}.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal page title={`Send material · ${order.jwoNumber}`} onClose={onClose} backLabel="Back to order"
      footer={<><span style={{ marginRight: "auto", alignSelf: "center", fontSize: 14, fontWeight: 700, color: "#334155" }}>Total to send: {qty(total)}</span>
        <button style={btn()} onClick={onClose}>Cancel</button><button style={{ ...btn("primary"), fontSize: 14, padding: "9px 22px" }} disabled={busy} onClick={save}>{busy ? "Saving…" : "Create challan and send"}</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ fontSize: 14, color: "#334155", marginBottom: 14 }}>You are sending material to <b>{order.workerName}</b>. This creates a delivery challan and records the material against the job worker.</div>
      <h4 style={{ ...h4, fontSize: 15 }}>Step 1 · How much are you sending?</h4>
      {hasRework && (
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <button style={f.reworkDispatch ? btn() : btn("primary")} onClick={() => { setF((x) => ({ ...x, reworkDispatch: false })); setQtys({}); }}>New material</button>
          <button style={f.reworkDispatch ? btn("primary") : btn()} onClick={() => { setF((x) => ({ ...x, reworkDispatch: true })); setQtys({}); }}>Rework material (sending again)</button>
        </div>
      )}
      {rows.length === 0 ? <Empty text={f.reworkDispatch ? "No rework material is waiting to be sent again." : "Everything on this order has already been sent."} /> : (
        <>
          <div style={{ marginBottom: 8 }}><button style={btn()} onClick={() => setQtys(Object.fromEntries(rows.map(({ l, avail }) => [l.id, String(avail)])))}>Fill every item with the full balance</button></div>
          {rows.map(({ l, avail }) => (
            <LineCard key={l.id} title={`${l.itemCode} ${l.itemName || ""}`} sub={`${l.operationName}${l.category ? " · " + l.category : ""}`}
              facts={[{ label: "Ordered", value: qty(l.inputQty) }, { label: "Already sent", value: qty(l.dispatchedQty) }, { label: "Left to send", value: `${qty(avail)} ${l.uom || ""}`, tone: "#1d4ed8" }]}>
              <QtyBox label="Quantity sending now" value={qtys[l.id]} max={avail} fill={avail} fillLabel="All" onChange={(v) => setQtys((q) => ({ ...q, [l.id]: v }))} />
            </LineCard>
          ))}
        </>
      )}
      <h4 style={{ ...h4, fontSize: 15 }}>Step 2 · Challan details</h4>
      <Section title="Who and how">
        <Field label="Authorised by" required hint="Person who approved this dispatch"><input style={inp} value={f.authorizedBy} onChange={set("authorizedBy")} /></Field>
        <Field label="Challan date"><DateInput value={f.challanDate} onChange={set("challanDate")} style={inp} /></Field>
        <Field label="Transporter"><input style={inp} value={f.transporter} onChange={set("transporter")} /></Field>
        <Field label="Vehicle number"><input style={inp} value={f.vehicleNo} onChange={set("vehicleNo")} /></Field>
        <Field label="E-way bill number" hint="Only if your transport rules need it"><input style={inp} value={f.ewayBillNo} onChange={set("ewayBillNo")} /></Field>
        <Field label="Purpose"><input style={inp} value={f.purpose} onChange={set("purpose")} /></Field>
        <Field label="Remarks" span={2}><input style={inp} value={f.remarks} onChange={set("remarks")} /></Field>
      </Section>
      <div style={{ fontSize: 12, color: "#64748b" }}>You cannot send more than the balance left on the order; the server checks this.</div>
    </Modal>
  );
}

function ReceiptForm({ user, order, challans, onSaved, onClose }) {
  const [f, setF] = useState({ receiptDate: TODAY(), deliveryNoteNo: "", remarks: "", challanId: "" });
  const [got, setGot] = useState({});
  const [unused, setUnused] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => newKey("rc"));
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  const rows = order.lines.filter((l) => num(l.pendingWithWorker) > 0);
  const total = rows.reduce((sum, l) => sum + num(got[l.id]) + num(unused[l.id]), 0);
  const save = async () => {
    setError("");
    const lines = rows.map((l) => ({ jwoLineId: l.id, qtyReceived: num(got[l.id]), unusedReturnedQty: num(unused[l.id]) }))
      .filter((x) => x.qtyReceived > 0 || x.unusedReturnedQty > 0);
    if (lines.length === 0) return setError("Enter what came back on at least one item.");
    setBusy(true);
    try {
      const d = await api("POST", "/receipts", user, { idempotencyKey: key, jwoId: order.id, challanId: f.challanId ? Number(f.challanId) : null,
        receiptDate: f.receiptDate, deliveryNoteNo: f.deliveryNoteNo || null, remarks: f.remarks || null, lines });
      onSaved(d, `${d.receiptNumber} recorded: the material now waits for inspection.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal page title={`Receive material · ${order.jwoNumber}`} onClose={onClose} backLabel="Back to order"
      footer={<><span style={{ marginRight: "auto", alignSelf: "center", fontSize: 14, fontWeight: 700, color: "#334155" }}>Total received: {qty(total)}</span>
        <button style={btn()} onClick={onClose}>Cancel</button><button style={{ ...btn("primary"), fontSize: 14, padding: "9px 22px" }} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save receipt"}</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ fontSize: 14, color: "#334155", marginBottom: 14 }}>You are recording material that came back from <b>{order.workerName}</b>. Next it goes to inspection, where it is accepted, rejected, sent for rework or scrapped.</div>
      <h4 style={{ ...h4, fontSize: 15 }}>Step 1 · What came back?</h4>
      {rows.length === 0 ? <Empty text="Nothing is with the job worker on this order." /> : (
        <>
          <div style={{ marginBottom: 8 }}><button style={btn()} onClick={() => setGot(Object.fromEntries(rows.map((l) => [l.id, String(num(l.pendingWithWorker))])))}>Everything came back as processed material</button></div>
          {rows.map((l) => (
            <LineCard key={l.id} title={`${l.itemCode} ${l.itemName || ""}`} sub={`${l.operationName}${l.category ? " · " + l.category : ""}`}
              facts={[{ label: "Sent", value: qty(l.dispatchedQty) }, { label: "Already back", value: qty(l.receivedQty) }, { label: "Still with worker", value: `${qty(l.pendingWithWorker)} ${l.uom || ""}`, tone: "#854d0e" }]}>
              <QtyBox label="Processed material back" value={got[l.id]} max={num(l.pendingWithWorker)} fill={num(l.pendingWithWorker)} fillLabel="All" onChange={(v) => setGot((g) => ({ ...g, [l.id]: v }))} />
              <QtyBox label="Unused raw material back" value={unused[l.id]} max={num(l.pendingWithWorker)} onChange={(v) => setUnused((g) => ({ ...g, [l.id]: v }))} />
            </LineCard>
          ))}
        </>
      )}
      <h4 style={{ ...h4, fontSize: 15 }}>Step 2 · Receipt details</h4>
      <Section title="Delivery">
        <Field label="Receipt date"><DateInput value={f.receiptDate} onChange={set("receiptDate")} style={inp} /></Field>
        <Field label="Against challan" hint="Optional"><SearchableSelect value={f.challanId} onChange={set("challanId")} emptyLabel="Not linked"
          options={challans.filter((c) => c.status === "POSTED").map((c) => ({ value: c.id, label: c.challanNumber }))} /></Field>
        <Field label="Job worker's delivery note"><input style={inp} value={f.deliveryNoteNo} onChange={set("deliveryNoteNo")} /></Field>
        <Field label="Remarks" span={2}><input style={inp} value={f.remarks} onChange={set("remarks")} /></Field>
      </Section>
      <div style={{ fontSize: 12, color: "#64748b" }}>You cannot enter more than the worker still holds; the server refuses it.</div>
    </Modal>
  );
}

const INSPECT_STYLE = {
  PENDING: { bg: "#fef3c7", fg: "#92400e", label: "Awaiting inspection" },
  DONE: { bg: "#dcfce7", fg: "#166534", label: "Inspected" }
};
const inspectionOf = (pendingLines) => (num(pendingLines) > 0 ? "PENDING" : "DONE");
const sumOf = (rows, key) => (rows || []).reduce((t, r) => t + num(r[key]), 0);

// Asks for a reason in a small box (instead of the browser's pop-up) before a reject / cancel / reverse.
function ReasonModal({ title, label = "Reason", confirmLabel = "Confirm", onCancel, onConfirm }) {
  const [text, setText] = useState("");
  return (
    <Modal title={title} onClose={onCancel} width={480} zIndex={3000}
      footer={<><button style={btn()} onClick={onCancel}>Go back</button><button style={btn("danger")} disabled={!text.trim()} onClick={() => onConfirm(text.trim())}>{confirmLabel}</button></>}>
      <Field label={label} required><textarea autoFocus style={{ ...inp, minHeight: 90, fontFamily: "inherit" }} value={text} onChange={(e) => setText(e.target.value)} /></Field>
    </Modal>
  );
}

function OrderDetail({ id, user, onClose, flash, onChanged, locations, workers, operations, categories, items, indents }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [screenForm, setScreenForm] = useState(null);
  const [inspectId, setInspectId] = useState(null);
  const [ask, setAsk] = useState(null);
  const [tab, setTab] = useState("items");
  const [printing, setPrinting] = useState(false);
  const load = useCallback(() => api("GET", `/orders/${id}`, user).then(setD).catch((e) => setError(e.message)), [id, user]);
  useEffect(() => { load(); }, [load]);
  const act = async (action, label, needsReason) => {
    const run = async (comments) => {
      try { await api("POST", `/orders/${id}/${action}`, user, { comments }); flash(`Order ${label.toLowerCase()} done.`); load(); onChanged(); } catch (e) { flash(e.message, true); }
    };
    if (needsReason) setAsk({ title: `${label} this order`, confirmLabel: label, run }); else run(null);
  };
  const cancelChallan = (c) => setAsk({
    title: `Reverse ${c.challanNumber}`, confirmLabel: "Reverse challan",
    run: async (reason) => {
      try { await api("POST", `/challans/${c.id}/cancel`, user, { comments: reason }); flash(`${c.challanNumber} reversed.`); load(); onChanged(); }
      catch (e) { flash(e.message, true); }
    }
  });
  if (!d) return <Modal page title="Job work order" onClose={onClose} backLabel="Back">{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  const acts = d.allowedActions || [];
  const openPrint = async (cid) => {
    setPrinting(true);
    try { window.open(await openBlob(`/challans/${cid}/print`, user, "text/html"), "_blank"); } catch (e) { flash(e.message, true); } finally { setPrinting(false); }
  };
  const lines = d.lines || [];
  const ordered = sumOf(lines, "inputQty");
  const sent = sumOf(lines, "dispatchedQty");
  const withWorker = sumOf(lines, "pendingWithWorker");
  const back = sumOf(lines, "receivedQty");
  const awaiting = (d.receipts || []).filter((r) => num(r.pendingInspectionLines) > 0).length;
  const canSend = acts.includes("CREATE_CHALLAN");
  const canReceive = acts.includes("CREATE_RECEIPT");
  return (
    <Modal page title={`${d.jwoNumber} · ${d.workerName}`} onClose={onClose} backLabel="Back to orders" badge={<Badge map={ORDER_STYLE} value={d.status} />}>
      <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span>Created by {d.createdBy} · {d.indentId ? "from an indent" : "direct order"}</span>
        <span>Order date {dateText(d.jwoDate)}</span>
        <span>Return by {dateText(d.expectedReturnDate)}</span>
        {d.overdue && <b style={{ color: "#991b1b" }}>Overdue for return</b>}
      </div>
      {orderStageIndex(d) >= 0 && <div style={{ marginTop: 10 }}><StageTracker stages={ORDER_STAGES} currentIndex={orderStageIndex(d)} /></div>}
      {d.rejectionReason && <Banner kind="error">Rejected: {d.rejectionReason}</Banner>}
      <NextStepCard rules={ORDER_RULES} mainKeys={ORDER_MAIN[d.status] || []} acts={acts} status={d.status} role={user.role} styleMap={ORDER_STYLE}
        nextStep={ORDER_NEXT_STEP[d.status] || "—"} who={ORDER_WHO[d.status]}
        handlers={{ SUBMIT: () => act("submit", "Submit"), APPROVE: () => act("approve", "Approve"), REJECT: () => act("reject", "Reject", true),
          CANCEL: () => act("cancel", "Cancel", true), CREATE_CHALLAN: () => setScreenForm("challan"), CREATE_RECEIPT: () => setScreenForm("receipt"),
          CLOSE: () => act("close", "Close", false) }} />
      <div style={tileGrid}>
        <Tile label="Ordered" value={qty(ordered)} />
        <Tile label="Sent to worker" value={qty(sent)} tone="#3730a3" hint={ordered > 0 ? `${Math.round((sent / ordered) * 100)}% of order` : undefined} />
        <Tile label="Still with worker" value={qty(withWorker)} tone="#854d0e" />
        <Tile label="Received back" value={qty(back)} tone="#166534" />
        <Tile label="Accepted" value={qty(sumOf(lines, "acceptedQty"))} tone="#166534" />
        <Tile label="Rejected / scrap" value={qty(sumOf(lines, "rejectedQty") + sumOf(lines, "scrapQty"))} tone="#991b1b" hint={`Rework ${qty(sumOf(lines, "reworkQty"))}`} />
      </div>
      {awaiting > 0 && (
        <div style={{ marginTop: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e" }}>
          {awaiting} receipt{awaiting > 1 ? "s are" : " is"} waiting for inspection. <button style={{ ...btn("primary"), marginLeft: 8 }} onClick={() => setTab("received")}>Go to received material</button>
        </div>
      )}
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: "items", label: "Items", count: lines.length },
        { key: "sent", label: "Sent to worker", count: d.challans.length },
        { key: "received", label: "Received & inspected", count: d.receipts.length },
        { key: "details", label: "Order details" },
        { key: "history", label: "History", count: (d.history || []).length + d.ledger.length }
      ]} />
      {tab === "items" && lines.map((l) => (
        <LineCard key={l.id} title={`${l.lineNo}. ${l.itemCode} ${l.itemName || ""}`} sub={`${l.operationName} · ${l.category || ""} · Rate ${money(l.rate)} ${l.rateBasis || ""}`}
          facts={[{ label: "Ordered", value: qty(l.inputQty) }, { label: "Sent", value: qty(l.dispatchedQty), tone: "#3730a3" }, { label: "With worker", value: qty(l.pendingWithWorker), tone: "#854d0e" },
            { label: "Received back", value: qty(l.receivedQty), tone: "#166534" }]}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Sent {qty(l.dispatchedQty)} of {qty(l.inputQty)}</div>
            <Bar value={l.dispatchedQty} total={l.inputQty} color="#6366f1" />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", margin: "8px 0 4px" }}>Back {qty(l.receivedQty)} of {qty(l.dispatchedQty)} sent</div>
            <Bar value={l.receivedQty} total={l.dispatchedQty} color="#16a34a" />
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Inspection result</div></div>
            {[["Accepted", l.acceptedQty, "#166534"], ["Rejected", l.rejectedQty, "#991b1b"], ["Rework", l.reworkQty, "#854d0e"], ["Scrap", l.scrapQty, "#475569"]].map(([label, v, tone]) => (
              <div key={label}><div style={{ fontSize: 11, color: "#64748b" }}>{label}</div><div style={{ fontSize: 15, fontWeight: 800, color: tone }}>{qty(v)}</div></div>
            ))}
            {num(l.reworkPending) > 0 && <div><div style={{ fontSize: 11, color: "#64748b" }}>Rework to re-send</div><div style={{ fontSize: 15, fontWeight: 800, color: "#854d0e" }}>{qty(l.reworkPending)}</div></div>}
          </div>
        </LineCard>
      ))}
      {tab === "sent" && (
        <>
          {canSend && <div style={{ marginBottom: 10 }}><button style={{ ...btn("primary"), fontSize: 14, padding: "9px 18px" }} onClick={() => setScreenForm("challan")}>+ Send more material</button></div>}
          {d.challans.length === 0 ? <Empty text="Nothing has been sent to the job worker yet." /> : (
            <Table headers={["Challan", "Date", "Quantity sent", "Came back", "Status", "E-way bill", ""]} minWidth={700}>
              {d.challans.map((c) => (
                <tr key={c.id}>
                  <Td><b>{c.challanNumber}</b>{c.reworkDispatch && <div style={{ fontSize: 10, color: "#854d0e" }}>rework</div>}</Td><Td>{dateText(c.challanDate)}</Td><Td right>{qty(c.totalQty)}</Td><Td right>{qty(c.returnedQty)}</Td>
                  <Td><Badge map={CHALLAN_STYLE} value={c.status} /></Td><Td>{c.ewayBillNo || "—"}</Td>
                  <Td><button style={{ ...btn(), padding: "3px 10px" }} onClick={() => openPrint(c.id)}>Print</button>
                    {c.status === "POSTED" && ["APPROVER", "ADMIN"].includes(user.role) && <button style={{ ...btn(), padding: "3px 10px", marginLeft: 4 }} onClick={() => cancelChallan(c)}>Reverse</button>}</Td>
                </tr>
              ))}
            </Table>
          )}
          {printing && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Opening print view…</div>}
        </>
      )}
      {tab === "received" && (
        <>
          {canReceive && <div style={{ marginBottom: 10 }}><button style={{ ...btn("primary"), fontSize: 14, padding: "9px 18px" }} onClick={() => setScreenForm("receipt")}>+ Receive material back</button></div>}
          {d.receipts.length === 0 ? <Empty text="Nothing has come back from the job worker yet." /> : (
            <Table headers={["Receipt", "Date", "Delivery note", "Quantity received", "Inspection", ""]} minWidth={650}>
              {d.receipts.map((r) => {
                const st = inspectionOf(r.pendingInspectionLines);
                return (
                  <tr key={r.id}>
                    <Td><b>{r.receiptNumber}</b></Td><Td>{dateText(r.receiptDate)}</Td><Td>{r.deliveryNoteNo || "—"}</Td><Td right>{qty(r.receivedQty)}</Td>
                    <Td><Badge map={INSPECT_STYLE} value={st} />{st === "PENDING" && <div style={{ fontSize: 10, color: "#92400e" }}>{r.pendingInspectionLines} line(s) left</div>}</Td>
                    <Td><button style={{ ...btn(st === "PENDING" ? "primary" : "ghost"), padding: "3px 12px" }} onClick={() => setInspectId(r.id)}>{st === "PENDING" ? "Inspect" : "View"}</button></Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </>
      )}
      {tab === "details" && (
        <div style={grid4}>
          <KV label="Job worker" value={d.workerName} />
          <KV label="Source store" value={d.sourceDepartment} />
          <KV label="Requesting department" value={d.requestingDepartment} />
          <KV label="Estimated charges (per rate contract)" value={money(d.estimatedCharges)} />
          <KV label="Payment terms" value={d.paymentTerms} />
          <KV label="Expected completion" value={dateText(d.expectedCompletionDate)} />
          <KV label="Quality specifications" value={d.qualitySpecs} />
          <KV label="Delivery terms" value={d.deliveryTerms} />
          <KV label="Remarks" value={d.remarks} />
        </div>
      )}
      {tab === "history" && (
        <>
          <h4 style={{ ...h4, marginTop: 0 }}>Approvals and actions</h4>
          {(d.history || []).length === 0 ? <Empty text="No activity yet." /> : (
            <Table headers={["When", "What happened", "Status change", "By (role)", "Comments"]} minWidth={600}>
              {d.history.map((h) => <tr key={h.id}><Td>{formatDisplayDate(h.actedAt)}</Td><Td>{h.action}</Td><Td>{h.fromStatus || "—"} → {h.toStatus || "—"}</Td><Td>{h.actor} ({h.actorRole})</Td><Td>{h.comments || "—"}</Td></tr>)}
            </Table>
          )}
          <h4 style={h4}>Material movements with the worker</h4>
          {d.ledger.length === 0 ? <Empty text="No movements yet." /> : (
            <Table headers={["When", "Item", "Movement", "Quantity", "Balance with worker", "Reference"]} minWidth={700}>
              {d.ledger.map((x) => <tr key={x.id}><Td>{formatDisplayDate(x.createdAt)}</Td><Td>{x.category}</Td><Td>{x.movementType}</Td><Td right>{qty(x.qty)}</Td><Td right>{qty(x.balanceAfter)}</Td><Td>{x.referenceNo}</Td></tr>)}
            </Table>
          )}
        </>
      )}
      {screenForm === "challan" && <ChallanForm user={user} order={d} onClose={() => setScreenForm(null)}
        onSaved={(c, msg) => { setScreenForm(null); setTab("sent"); flash(msg); load(); onChanged(); }} />}
      {screenForm === "receipt" && <ReceiptForm user={user} order={d} challans={d.challans} onClose={() => setScreenForm(null)}
        onSaved={(r, msg) => { setScreenForm(null); setTab("received"); flash(msg); load(); onChanged(); }} />}
      {inspectId && <ReceiptDetail id={inspectId} user={user} flash={flash} onClose={() => setInspectId(null)} onChanged={() => { load(); onChanged(); }} />}
      {ask && <ReasonModal title={ask.title} confirmLabel={ask.confirmLabel} onCancel={() => setAsk(null)} onConfirm={(text) => { const run = ask.run; setAsk(null); run(text); }} />}
    </Modal>
  );
}

function OrdersScreen({ user, filter, workers, locations, operations, categories, items, indents, flash }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(filter.overdue ? "OVERDUE" : filter.status || "");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [tick, setTick] = useState(0);
  const counts = useStatusCounts("/orders", user, tick);
  useEffect(() => { setStatus(filter.overdue ? "OVERDUE" : filter.status || ""); }, [filter]);
  useEffect(() => { setPage(0); }, [q, status]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (status === "OVERDUE") params.set("overdue", "true"); else if (status) params.set("status", status);
    api("GET", `/orders?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, q, status, page, tick]);
  const onChanged = () => setTick((t) => t + 1);
  const order = ["PENDING_APPROVAL", "APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED", "COMPLETED", "DRAFT", "REJECTED", "CLOSED", "CANCELLED"];
  const chips = [{ key: "", label: "All", count: counts ? counts._all : null },
    ...order.map((k) => ({ key: k, label: ORDER_STYLE[k].label, count: counts ? counts[k] || 0 : null, tone: ORDER_STYLE[k].fg })),
    { key: "OVERDUE", label: "Overdue", count: counts ? counts._overdue || 0 : null, tone: "#991b1b" }];
  return (
    <div>
      <ScreenIntro title="Step 2 · Job Work Orders" text="An order says which material goes to which job worker, for which operation. Open an order to send material, receive it back and inspect it."
        action={<button style={{ ...btn("primary"), fontSize: 13, padding: "7px 18px" }} onClick={() => setCreating({ indent: null })}>+ New job work order</button>} />
      {error && <Banner kind="error">{error}</Banner>}
      <Chips options={chips} value={status} onChange={setStatus} />
      <div style={{ width: 320, marginBottom: 10 }}><input style={inp} placeholder="Search by order no., job worker or item" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Table headers={["Order no.", "Date", "Job worker", "Items", "Progress", "Return by", "Status", "What happens next", ""]} minWidth={1150}>
        {data.content.length === 0 && <tr><Td>No orders here.</Td></tr>}
        {data.content.map((r) => (
          <tr key={r.id} onClick={() => setDetailId(r.id)} style={{ background: r.overdue ? "#fef2f2" : "transparent", cursor: "pointer" }}>
            <Td><b style={{ color: "#2563eb" }}>{r.jwoNumber}</b></Td>
            <Td>{dateText(r.jwoDate)}</Td><Td>{r.workerName}</Td><Td>{r.items}</Td>
            <Td>
              <div style={{ minWidth: 150 }}>
                <div style={{ fontSize: 10, color: "#64748b" }}>Sent {qty(r.dispatchedTotal)} of {qty(r.inputTotal)}</div><Bar value={r.dispatchedTotal} total={r.inputTotal} color="#6366f1" height={6} />
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Back {qty(r.receivedTotal)} of {qty(r.dispatchedTotal)}</div><Bar value={r.receivedTotal} total={r.dispatchedTotal} color="#16a34a" height={6} />
              </div>
            </Td>
            <Td>{dateText(r.expectedReturnDate)}{r.overdue && <div style={{ fontSize: 10, color: "#991b1b", fontWeight: 700 }}>Overdue</div>}</Td>
            <Td><Badge map={ORDER_STYLE} value={r.status} /></Td>
            <Td>{ORDER_NEXT_STEP[r.status] || "—"}<div style={{ fontSize: 10, color: "#64748b" }}>{ORDER_WHO[r.status] && ORDER_WHO[r.status] !== "—" ? `By: ${ORDER_WHO[r.status]}` : ""}</div></Td>
            <Td><button style={{ ...btn("primary"), padding: "4px 12px" }} onClick={(e) => { e.stopPropagation(); setDetailId(r.id); }}>Open</button></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
      {creating && <OrderForm user={user} workers={workers} locations={locations} operations={operations} categories={categories} items={items} indents={indents}
        fromIndent={creating.indent} onClose={() => setCreating(null)}
        onSaved={(d, msg) => { setCreating(null); flash(msg); onChanged(); setDetailId(d.id); }} />}
      {detailId && <OrderDetail id={detailId} user={user} flash={flash} onChanged={onChanged} onClose={() => setDetailId(null)}
        locations={locations} workers={workers} operations={operations} categories={categories} items={items} indents={indents} />}
    </div>
  );
}

// Loads one order and opens the send or receive page straight away (used by the Send and Receive work lists).
function QuickOrderForm({ id, kind, user, onClose, onDone }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("GET", `/orders/${id}`, user).then(setD).catch((e) => setError(e.message)); }, [id, user]);
  if (!d) return <Modal page title="Job work order" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  return kind === "send"
    ? <ChallanForm user={user} order={d} onClose={onClose} onSaved={onDone} />
    : <ReceiptForm user={user} order={d} challans={d.challans} onClose={onClose} onSaved={onDone} />;
}

// The orders that can be worked on today: approved or in progress, merged from the status lists.
function useOpenOrders(user, tick) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all(["APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED"].map((s) => api("GET", `/orders?status=${s}&size=200`, user).then((d) => d.content || [])))
      .then((parts) => { setRows(parts.flat().sort((a, b) => String(a.expectedReturnDate || "9999").localeCompare(String(b.expectedReturnDate || "9999")))); setError(""); })
      .catch((e) => setError(e.message));
  }, [user, tick]);
  return { rows, error };
}

function WorkList({ kind, user, flash }) {
  const [tick, setTick] = useState(0);
  const [openId, setOpenId] = useState(null);
  const { rows, error } = useOpenOrders(user, tick);
  const isSend = kind === "send";
  const canAct = ["STORE", "ADMIN"].includes(user.role);
  const list = (rows || []).filter((r) => (isSend ? num(r.inputTotal) - num(r.dispatchedTotal) > 0 || num(r.reworkPendingTotal) > 0 : num(r.pendingWithWorker) > 0));
  return (
    <div>
      <ScreenIntro title={isSend ? "Step 3 · Send Material" : "Step 4 · Receive Material"}
        text={isSend ? "Approved orders that still have material to send to a job worker. Press Send material, enter the quantity and a delivery challan is created."
          : "Orders where material is still with a job worker. Press Receive material when something comes back. It then goes to Step 5, Inspection."} />
      {error && <Banner kind="error">{error}</Banner>}
      {!canAct && <Banner kind="warn">You are acting as {user.role}. Only the STORE role can {isSend ? "send" : "receive"} material. Change the role at the top right.</Banner>}
      {!rows ? <Empty text="Loading…" /> : list.length === 0 ? (
        <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10, padding: 24, textAlign: "center", color: "#64748b", fontSize: 14 }}>
          {isSend ? "Nothing is waiting to be sent. Approve a job work order first." : "No material is with any job worker right now."}
        </div>
      ) : (
        <Table headers={isSend ? ["Order no.", "Job worker", "Items", "Ordered", "Already sent", "Left to send", "Return by", "Status", ""]
          : ["Order no.", "Job worker", "Items", "Sent", "Received back", "Still with worker", "Return by", "Status", ""]} minWidth={1000}>
          {list.map((r) => (
            <tr key={r.id} style={{ background: r.overdue ? "#fef2f2" : "transparent" }}>
              <Td><b>{r.jwoNumber}</b></Td><Td>{r.workerName}</Td><Td>{r.items}</Td>
              {isSend ? <><Td right>{qty(r.inputTotal)}</Td><Td right>{qty(r.dispatchedTotal)}</Td><Td right><b style={{ color: "#1d4ed8" }}>{qty(num(r.inputTotal) - num(r.dispatchedTotal))}</b></Td></>
                : <><Td right>{qty(r.dispatchedTotal)}</Td><Td right>{qty(r.receivedTotal)}</Td><Td right><b style={{ color: "#854d0e" }}>{qty(r.pendingWithWorker)}</b></Td></>}
              <Td>{dateText(r.expectedReturnDate)}{r.overdue && <div style={{ fontSize: 10, color: "#991b1b", fontWeight: 700 }}>Overdue</div>}</Td>
              <Td><Badge map={ORDER_STYLE} value={r.status} /></Td>
              <Td><button disabled={!canAct} title={canAct ? "" : "Needs the STORE role"} style={{ ...btn("primary"), padding: "6px 14px", opacity: canAct ? 1 : 0.5 }} onClick={() => setOpenId(r.id)}>{isSend ? "Send material" : "Receive material"}</button></Td>
            </tr>
          ))}
        </Table>
      )}
      {openId && <QuickOrderForm id={openId} kind={kind} user={user} onClose={() => setOpenId(null)} onDone={(x, msg) => { setOpenId(null); flash(msg); setTick((t) => t + 1); }} />}
    </div>
  );
}

// ============================================================================
// Challans and receipts (registers)
// ============================================================================

function ChallansScreen({ user, flash, refs, onChanged }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setPage(0); }, [q, status]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    api("GET", `/challans?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, q, status, page, tick]);
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "flex-end" }}>
        <div style={{ width: 280 }}><Field label="Search"><input style={inp} placeholder="Challan no., order or worker" value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <div style={{ width: 180 }}><Field label="Status"><select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{Object.entries(CHALLAN_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field></div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>This is a register. To make a challan, use Step 3 · Send Material.</div>
      </div>
      <Table headers={["Challan no.", "Date", "Order", "Job worker", "Qty", "Transporter / vehicle", "E-way bill", "Status"]} minWidth={900}>
        {data.content.length === 0 && <tr><Td>No challans match.</Td></tr>}
        {data.content.map((c) => (
          <tr key={c.id}>
            <Td>{c.challanNumber}</Td><Td>{dateText(c.challanDate)}</Td>
            <Td><button onClick={() => setOrderId(c.jwoId || c.id)} style={{ border: "none", background: "none", color: "#2563eb", cursor: "pointer", padding: 0 }}>{c.jwoNumber}</button></Td>
            <Td>{c.workerName}</Td><Td right>{qty(c.totalQty)}</Td><Td>{[c.transporter, c.vehicleNo].filter(Boolean).join(" / ") || "—"}</Td><Td>{c.ewayBillNo || "—"}</Td>
            <Td><Badge map={CHALLAN_STYLE} value={c.status} /></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
      {orderId && <OrderDetail id={orderId} user={user} flash={flash} onChanged={() => { setTick((t) => t + 1); onChanged && onChanged(); }} onClose={() => setOrderId(null)}
        locations={refs.locations} workers={refs.workers} operations={refs.operations} categories={refs.categories} items={refs.items} indents={refs.indents} />}
    </div>
  );
}

function ReceiptDetail({ id, user, onClose, flash, onChanged }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [forms, setForms] = useState({});
  const load = useCallback(() => api("GET", `/receipts/${id}`, user).then(setD).catch((e) => setError(e.message)), [id, user]);
  useEffect(() => { load(); }, [load]);
  const inspect = async (line) => {
    const f = forms[line.receiptLineId] || {};
    try {
      await api("POST", `/receipt-lines/${line.receiptLineId}/inspect`, user, {
        acceptedQty: num(f.acc), rejectedQty: num(f.rej), reworkQty: num(f.rew), scrapQty: num(f.scr), defectCode: f.defect || null, remarks: f.remarks || null
      });
      flash(`Item ${line.itemCode} inspected and saved.`);
      load(); onChanged();
    } catch (e) { flash(e.message, true); }
  };
  if (!d) return <Modal page title="Receipt" onClose={onClose} backLabel="Back">{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  const lines = d.lines || [];
  const pending = lines.filter((l) => l.inspectionStatus === "PENDING").length;
  return (
    <Modal page title={`${d.receiptNumber} · ${d.jwoNumber}`} onClose={onClose} backLabel="Back" badge={<Badge map={INSPECT_STYLE} value={pending > 0 ? "PENDING" : "DONE"} />}>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        From {d.workerName} · received {dateText(d.receiptDate)} by {d.receivedBy || "—"}{d.deliveryNoteNo ? ` · delivery note ${d.deliveryNoteNo}` : ""}{d.challanNumber ? ` · against ${d.challanNumber}` : ""}
      </div>
      <div style={{ background: pending > 0 ? "#eff6ff" : "#f0fdf4", border: `2px solid ${pending > 0 ? "#93c5fd" : "#86efac"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: pending > 0 ? "#1d4ed8" : "#166534", letterSpacing: 0.6 }}>{pending > 0 ? "YOUR TURN · INSPECTION" : "INSPECTION COMPLETE"}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
          {pending > 0 ? `${pending} item${pending > 1 ? "s" : ""} left to inspect. Split each received quantity into accepted, rejected, rework and scrap. The four must add up to the quantity received.`
            : "Every item on this receipt has been inspected."}
        </div>
      </div>
      <div style={tileGrid}>
        <Tile label="Received" value={qty(sumOf(lines, "qtyReceived"))} />
        <Tile label="Accepted" value={qty(sumOf(lines, "acceptedQty"))} tone="#166534" />
        <Tile label="Rejected" value={qty(sumOf(lines, "rejectedQty"))} tone="#991b1b" />
        <Tile label="Rework" value={qty(sumOf(lines, "reworkQty"))} tone="#854d0e" />
        <Tile label="Scrap" value={qty(sumOf(lines, "scrapQty"))} tone="#475569" />
      </div>
      <h4 style={{ ...h4, fontSize: 15 }}>Items</h4>
      {lines.map((l) => {
        const f = forms[l.receiptLineId] || {};
        const setF = (k) => (v) => setForms((x) => ({ ...x, [l.receiptLineId]: { ...(x[l.receiptLineId] || {}), [k]: v } }));
        const isPending = l.inspectionStatus === "PENDING";
        const received = num(l.qtyReceived);
        const used = num(f.acc) + num(f.rej) + num(f.rew) + num(f.scr);
        const left = Math.round((received - used) * 1000) / 1000;
        const needsDefect = num(f.rej) + num(f.rew) + num(f.scr) > 0;
        return (
          <LineCard key={l.receiptLineId} title={`${l.lineNo}. ${l.itemCode}`} sub={l.operationName || ""}
            facts={[{ label: "Received", value: qty(l.qtyReceived) }, { label: "Inspection", value: <Badge map={INSPECT_STYLE} value={isPending ? "PENDING" : "DONE"} /> }]}>
            {isPending ? (
              <>
                <QtyBox label="Accepted" value={f.acc} fill={Math.max(0, num(left) + num(f.acc))} fillLabel="Rest" onChange={setF("acc")} width={100} />
                <QtyBox label="Rejected" value={f.rej} onChange={setF("rej")} width={100} />
                <QtyBox label="Rework" value={f.rew} onChange={setF("rew")} width={100} />
                <QtyBox label="Scrap" value={f.scr} onChange={setF("scr")} width={100} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 190 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Defect code {needsDefect ? "(needed)" : "(if any)"}</span>
                  <input style={inp} placeholder="e.g. DIM-01" value={f.defect || ""} onChange={(e) => setF("defect")(e.target.value)} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 190 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Remarks</span>
                  <input style={inp} value={f.remarks || ""} onChange={(e) => setF("remarks")(e.target.value)} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: left === 0 ? "#166534" : "#92400e" }}>{left === 0 ? "✓ Adds up to the received quantity" : left > 0 ? `${qty(left)} still to allocate` : `${qty(-left)} too much`}</span>
                  <button style={{ ...btn("primary"), padding: "8px 18px", opacity: left === 0 ? 1 : 0.5 }} disabled={left !== 0} onClick={() => inspect(l)}>Save inspection</button>
                </div>
              </>
            ) : (
              <>
                {[["Accepted", l.acceptedQty, "#166534"], ["Rejected", l.rejectedQty, "#991b1b"], ["Rework", l.reworkQty, "#854d0e"], ["Scrap", l.scrapQty, "#475569"]].map(([label, v, tone]) => (
                  <div key={label}><div style={{ fontSize: 11, color: "#64748b" }}>{label}</div><div style={{ fontSize: 16, fontWeight: 800, color: tone }}>{qty(v)}</div></div>
                ))}
                <div><div style={{ fontSize: 11, color: "#64748b" }}>Defect / remarks</div><div style={{ fontSize: 13 }}>{l.defectCode || "—"}{l.inspectionRemarks ? ` · ${l.inspectionRemarks}` : ""}</div></div>
                <div><div style={{ fontSize: 11, color: "#64748b" }}>Inspected by</div><div style={{ fontSize: 13 }}>{l.inspectedBy || "—"}</div></div>
              </>
            )}
          </LineCard>
        );
      })}
      <div style={{ fontSize: 12, color: "#64748b" }}>{DEFECTS_NOTE} An item can be inspected only once.</div>
      <h4 style={{ ...h4, fontSize: 15 }}>History</h4>
      {(d.history || []).length === 0 ? <Empty text="No activity." /> : (
        <Table headers={["When", "What happened", "By (role)", "Detail"]} minWidth={500}>
          {d.history.map((h) => <tr key={h.id}><Td>{formatDisplayDate(h.actedAt)}</Td><Td>{h.action}</Td><Td>{h.actor} ({h.actorRole})</Td><Td>{h.comments || "—"}</Td></tr>)}
        </Table>
      )}
    </Modal>
  );
}

function ReceiptsScreen({ user, filter, flash }) {
  const [q, setQ] = useState("");
  const [inspection, setInspection] = useState(filter.inspection || "");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [all, setAll] = useState(null);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setInspection(filter.inspection || ""); }, [filter]);
  useEffect(() => { setPage(0); }, [q, inspection]);
  useEffect(() => {
    api("GET", "/receipts?size=200", user).then((d) => setAll(d.content || [])).catch(() => setAll(null));
  }, [user, tick]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (inspection) params.set("inspection", inspection);
    api("GET", `/receipts?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, q, inspection, page, tick]);
  const waiting = all ? all.filter((r) => num(r.pendingInspectionLines) > 0).length : null;
  const chips = [{ key: "", label: "All", count: all ? all.length : null },
    { key: "PENDING", label: "Awaiting inspection", count: waiting, tone: "#92400e" },
    { key: "DONE", label: "Inspected", count: all ? all.length - waiting : null, tone: "#166534" }];
  return (
    <div>
      <ScreenIntro title="Step 5 · Inspection" text="Material that came back from a job worker is checked here. Open a receipt and split each quantity into accepted, rejected, rework and scrap." />
      {error && <Banner kind="error">{error}</Banner>}
      <Chips options={chips} value={inspection} onChange={setInspection} />
      <div style={{ width: 320, marginBottom: 10 }}><input style={inp} placeholder="Search by receipt no., order or job worker" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Table headers={["Receipt no.", "Date", "Order", "Job worker", "Qty received", "Inspection", "Received by", ""]} minWidth={900}>
        {data.content.length === 0 && <tr><Td>No receipts here.</Td></tr>}
        {data.content.map((r) => {
          const st = inspectionOf(r.pendingInspectionLines);
          return (
            <tr key={r.id} onClick={() => setDetailId(r.id)} style={{ cursor: "pointer" }}>
              <Td><b style={{ color: "#2563eb" }}>{r.receiptNumber}</b></Td>
              <Td>{dateText(r.receiptDate)}</Td><Td>{r.jwoNumber}</Td><Td>{r.workerName}</Td><Td right>{qty(r.receivedQty)}</Td>
              <Td><Badge map={INSPECT_STYLE} value={st} />{st === "PENDING" && <div style={{ fontSize: 10, color: "#92400e" }}>{r.pendingInspectionLines} item(s) left</div>}</Td>
              <Td>{r.receivedBy}</Td>
              <Td><button style={{ ...btn(st === "PENDING" ? "primary" : "ghost"), padding: "4px 12px" }} onClick={(e) => { e.stopPropagation(); setDetailId(r.id); }}>{st === "PENDING" ? "Inspect" : "View"}</button></Td>
            </tr>
          );
        })}
      </Table>
      <Pager page={page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
      {detailId && <ReceiptDetail id={detailId} user={user} flash={flash} onClose={() => setDetailId(null)} onChanged={() => setTick((t) => t + 1)} />}
    </div>
  );
}

// ============================================================================
// Ledger
// ============================================================================

function LedgerScreen({ user, workers }) {
  const [workerId, setWorkerId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [error, setError] = useState("");
  useEffect(() => { setPage(0); }, [workerId, q]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "50" });
    if (workerId) params.set("workerId", workerId);
    if (q) params.set("q", q);
    api("GET", `/ledger?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, workerId, q, page]);
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.content.map((r) => ({ When: formatDisplayDate(r.createdAt), "Job worker": r.workerName, Item: r.itemCode, Category: r.category,
      Movement: r.movementType, Qty: Number(r.qty), "Balance with worker": Number(r.balanceAfter), Reference: r.referenceNo, Order: r.jwoNumber })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ledger"); XLSX.writeFile(wb, `Job_Work_Ledger_${TODAY()}.xlsx`);
  };
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "flex-end" }}>
        <div style={{ width: 280 }}><Field label="Job worker"><SearchableSelect value={workerId} onChange={(e) => setWorkerId(e.target.value)} emptyLabel="All job workers"
  options={workers.map((w) => ({ value: w.id, label: w.legalName }))} /></Field></div>
        <div style={{ width: 240 }}><Field label="Item or reference"><input style={inp} value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <div style={{ marginLeft: "auto" }}><button style={btn()} onClick={exportExcel}>Export Excel</button></div>
      </div>
      <Table headers={["When", "Job worker", "Item", "Category", "Movement", "Qty (+ out / − back)", "Balance with worker", "Reference", "Order"]} minWidth={1000}>
        {data.content.length === 0 && <tr><Td>No movements yet. Dispatch material from an order to start the ledger.</Td></tr>}
        {data.content.map((r) => (
          <tr key={r.id}><Td>{formatDisplayDate(r.createdAt)}</Td><Td>{r.workerName}</Td><Td>{r.itemCode}</Td><Td>{r.category}</Td><Td>{r.movementType}</Td>
            <Td right>{qty(r.qty)}</Td><Td right><b>{qty(r.balanceAfter)}</b></Td><Td>{r.referenceNo}</Td><Td>{r.jwoNumber}</Td></tr>
        ))}
      </Table>
      <Pager page={page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
    </div>
  );
}

// ============================================================================
// Reconciliation & Scrap
// ============================================================================

const ADJ_LABEL = { SCRAP_DISPOSAL: "Scrap disposal (to Scrap Yard)", SHORTAGE: "Shortage (write off, not received)", PROCESS_LOSS: "Process loss (write off)" };
const ADJ_STYLE = {
  PENDING: { bg: "#fef3c7", fg: "#92400e", label: "Awaiting approval" },
  APPROVED: { bg: "#dcfce7", fg: "#166534", label: "Approved" },
  REJECTED: { bg: "#fee2e2", fg: "#991b1b", label: "Rejected" }
};
const RECON_STATUS = {
  BALANCED: { bg: "#dcfce7", fg: "#166534", label: "Balanced" },
  OPEN: { bg: "#fef9c3", fg: "#854d0e", label: "Open" },
  EXCESS_LOSS: { bg: "#fee2e2", fg: "#991b1b", label: "Excess loss" }
};

function AdjustmentRequestForm({ user, order, onClose, onSaved }) {
  const [lineId, setLineId] = useState(order.lines[0] ? String(order.lines[0].jwoLineId) : "");
  const [type, setType] = useState("SHORTAGE");
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const line = order.lines.find((l) => String(l.jwoLineId) === String(lineId));
  const limit = line ? (type === "SCRAP_DISPOSAL" ? num(line.scrapRemaining) : num(line.maxWriteOff)) : 0;
  const save = async () => {
    setError("");
    if (!line) return setError("Select the order line.");
    if (!(num(q) > 0)) return setError("Quantity must be greater than zero.");
    if (!reason.trim()) return setError("Give the reason. Losses are never adjusted silently.");
    setBusy(true);
    try {
      const d = await api("POST", "/reconciliation/adjustments", user, { jwoLineId: Number(lineId), adjustmentType: type, qty: Number(q), reason });
      onSaved(d, `${d.adjustmentNumber} requested. An approver must approve it.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Request adjustment — ${order.jwoNumber}`} onClose={onClose} width={620}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn("primary")} disabled={busy} onClick={save}>{busy ? "Saving…" : "Submit request"}</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Adjustment" subtitle="Requests need approval by someone other than you. Nothing changes until it is approved.">
        <Field label="Order line" required>
          <SearchableSelect value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="Select order line"
            options={order.lines.map((l) => ({ value: l.jwoLineId, label: `${l.lineNo} · ${l.itemCode}`, sub: l.category }))} />
        </Field>
        <Field label="Type" required>
          <select style={inp} value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(ADJ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Quantity" required hint={line ? `Maximum now: ${qty(limit)}` : ""}>
          <input type="number" min="0" step="0.01" style={inp} value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Field label="Reason" required span={2}><textarea style={{ ...inp, minHeight: 70 }} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Section>
    </Modal>
  );
}

function ReconOrderDetail({ id, user, onClose, flash, onChanged }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const load = useCallback(() => api("GET", `/reconciliation/orders/${id}`, user).then(setD).catch((e) => setError(e.message)), [id, user]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Modal page title="Reconciliation" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  return (
    <Modal page title={`Reconciliation — ${d.jwoNumber} · ${d.workerName}`} onClose={onClose} width={1200}
      footer={<><button style={btn()} onClick={onClose}>Close</button><button style={btn("primary")} onClick={() => setRequesting(true)}>Request adjustment</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <Badge map={ORDER_STYLE} value={d.status} />
        {d.overdue && <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>Past return date</span>}
        <span style={{ fontSize: 12, color: "#64748b" }}>Still with worker: <b>{qty(d.totalWithWorker)}</b> · Excess loss: <b>{qty(d.totalExcessLoss)}</b></span>
      </div>
      <Table headers={["#", "Item", "Operation", "Dispatched", "Back processed", "Unused back", "With worker", "Accepted", "Rejected", "Scrap (left)", "Written off", "Allowed loss", "Excess", "Status"]} minWidth={1100}>
        {d.lines.map((l) => (
          <tr key={l.jwoLineId}>
            <Td>{l.lineNo}</Td><Td>{l.itemCode}<div style={{ fontSize: 10, color: "#64748b" }}>{l.category}</div></Td><Td>{l.operation}</Td>
            <Td right>{qty(l.dispatched)}</Td><Td right>{qty(l.processedBack)}</Td><Td right>{qty(l.unusedBack)}</Td><Td right><b>{qty(l.withWorker)}</b></Td>
            <Td right>{qty(l.accepted)}</Td><Td right>{qty(l.rejected)}</Td><Td right>{qty(l.scrapRemaining)} <div style={{ fontSize: 10, color: "#64748b" }}>of {qty(l.scrap)}</div></Td>
            <Td right>{qty(l.writtenOff)}{num(l.writeOffRequested) > 0 && <div style={{ fontSize: 10, color: "#854d0e" }}>{qty(l.writeOffRequested)} requested</div>}</Td>
            <Td right>{qty(l.allowedLoss)} <div style={{ fontSize: 10, color: "#64748b" }}>{qty(l.permissiblePct)}%</div></Td>
            <Td right>{num(l.excessLoss) > 0 ? <b style={{ color: "#991b1b" }}>{qty(l.excessLoss)}</b> : "0"}</Td>
            <Td><Badge map={RECON_STATUS} value={l.status} /></Td>
          </tr>
        ))}
      </Table>
      <h4 style={h4}>Adjustments on this order</h4>
      {(d.adjustments || []).length === 0 ? <Empty text="None yet." /> : (
        <Table headers={["Number", "Type", "Item", "Qty", "Status", "Requested by", "Decided by", "Reason"]} minWidth={800}>
          {d.adjustments.map((a) => <tr key={a.id}><Td>{a.adjustmentNumber}</Td><Td>{ADJ_LABEL[a.adjustmentType]}</Td><Td>{a.itemCode}</Td><Td right>{qty(a.qty)}</Td>
            <Td><Badge map={ADJ_STYLE} value={a.status} /></Td><Td>{a.requestedBy}</Td><Td>{a.decidedBy || "—"}</Td><Td>{a.reason}</Td></tr>)}
        </Table>
      )}
      {requesting && <AdjustmentRequestForm user={user} order={d} onClose={() => setRequesting(false)}
        onSaved={(x, msg) => { setRequesting(false); flash(msg); load(); onChanged(); }} />}
    </Modal>
  );
}

function ReconOrdersTab({ user, flash, onChanged }) {
  const [q, setQ] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setPage(0); }, [q, overdue]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (overdue) params.set("overdue", "true");
    api("GET", `/reconciliation/orders?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, q, overdue, page, tick]);
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "flex-end" }}>
        <div style={{ width: 280 }}><Field label="Search"><input style={inp} placeholder="Order no. or worker" value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", paddingBottom: 8 }}><input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Only past return date</label>
      </div>
      <Table headers={["Order", "Job worker", "Status", "Sent", "Processed back", "Unused back", "Still with worker", "Scrap", "Rejected", "Rework pending", "Written off", "Awaiting approval", ""]} minWidth={1100}>
        {data.content.length === 0 && <tr><Td>No orders with material out or returned yet.</Td></tr>}
        {data.content.map((r) => (
          <tr key={r.id} style={{ background: r.overdue ? "#fef2f2" : "transparent" }}>
            <Td>{r.jwoNumber}{r.overdue && <div style={{ fontSize: 10, color: "#991b1b", fontWeight: 700 }}>Overdue</div>}</Td><Td>{r.workerName}</Td><Td><Badge map={ORDER_STYLE} value={r.status} /></Td>
            <Td right>{qty(r.sent)}</Td><Td right>{qty(r.processedBack)}</Td><Td right>{qty(r.unusedBack)}</Td><Td right><b>{qty(r.withWorker)}</b></Td>
            <Td right>{qty(r.scrap)}</Td><Td right>{qty(r.rejected)}</Td><Td right>{qty(r.reworkPending)}</Td><Td right>{qty(r.writtenOff)}</Td>
            <Td right>{num(r.pendingAdjustments) > 0 ? <span style={{ color: "#854d0e", fontWeight: 700 }}>{r.pendingAdjustments}</span> : "0"}</Td>
            <Td><button style={{ ...btn(), padding: "3px 8px" }} onClick={() => setDetailId(r.id)}>Open</button></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
      {detailId && <ReconOrderDetail id={detailId} user={user} flash={flash} onClose={() => setDetailId(null)} onChanged={() => { setTick((t) => t + 1); onChanged && onChanged(); }} />}
    </div>
  );
}

function ReconApprovalsTab({ user, flash, onChanged }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    api("GET", `/reconciliation/adjustments${status ? `?status=${status}` : ""}`, user).then((d) => { setRows(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, status, tick]);
  const decide = async (a, approve) => {
    let comments = "";
    if (!approve) { comments = window.prompt("Reason for rejecting?"); if (!comments) return; }
    else { comments = window.prompt("Comment (optional)", "") || ""; }
    try {
      await api("POST", `/reconciliation/adjustments/${a.id}/decision`, user, { approve, comments: comments || null });
      flash(`${a.adjustmentNumber} ${approve ? "approved" : "rejected"}.`);
      setTick((t) => t + 1); onChanged && onChanged();
    } catch (e) { flash(e.message, true); }
  };
  const canDecide = ["APPROVER", "ADMIN"].includes(user.role);
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
        <div style={{ width: 220 }}><Field label="Status"><select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}><option value="PENDING">Awaiting approval</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="">All</option></select></Field></div>
        {!canDecide && <div style={{ fontSize: 12, color: "#64748b" }}>Only approvers can approve or reject. Switch your role to APPROVER at the top right to decide.</div>}
      </div>
      <Table headers={["Number", "Requested", "Order", "Job worker", "Type", "Item", "Qty", "Reason", "Requested by", "Status", ""]} minWidth={1100}>
        {rows.length === 0 && <tr><Td>Nothing here.</Td></tr>}
        {rows.map((a) => (
          <tr key={a.id}>
            <Td>{a.adjustmentNumber}</Td><Td>{dateText(a.requestedAt)}</Td><Td>{a.jwoNumber}</Td><Td>{a.workerName}</Td><Td>{ADJ_LABEL[a.adjustmentType]}</Td>
            <Td>{a.itemCode}</Td><Td right>{qty(a.qty)}</Td><Td>{a.reason}</Td><Td>{a.requestedBy}</Td>
            <Td><Badge map={ADJ_STYLE} value={a.status} /></Td>
            <Td>{a.status === "PENDING" && canDecide && <>
              <button style={{ ...btn("primary"), padding: "3px 8px" }} onClick={() => decide(a, true)}>Approve</button>{" "}
              <button style={{ ...btn("danger"), padding: "3px 8px" }} onClick={() => decide(a, false)}>Reject</button></>}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function ReconScrapTab({ user }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { api("GET", "/reconciliation/scrap", user).then(setRows).catch((e) => setError(e.message)); }, [user]);
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <Table headers={["Order", "Job worker", "Line", "Item", "Scrap recorded", "Disposed (approved)", "Disposal pending", "Left to dispose", "Defect codes"]} minWidth={900}>
        {rows.length === 0 && <tr><Td>No scrap recorded.</Td></tr>}
        {rows.map((r, i) => (
          <tr key={i}>
            <Td>{r.jwoNumber}</Td><Td>{r.workerName}</Td><Td>{r.lineNo}</Td><Td>{r.itemCode}</Td><Td right>{qty(r.scrapQty)}</Td><Td right>{qty(r.disposedQty)}</Td>
            <Td right>{qty(r.pendingDisposalQty)}</Td><Td right><b>{qty(num(r.scrapQty) - num(r.disposedQty) - num(r.pendingDisposalQty))}</b></Td><Td>{r.defectCodes || "—"}</Td>
          </tr>
        ))}
      </Table>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Scrap leaves the Rejection Store only through an approved disposal (Scrap Yard).</div>
    </div>
  );
}

function ReconAlertsTab({ user }) {
  const [a, setA] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("GET", "/reconciliation/alerts", user).then(setA).catch((e) => setError(e.message)); }, [user]);
  if (!a) return error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading alerts…" />;
  const block = (title, rows, cols) => (
    <div style={{ marginBottom: 14 }}>
      <h4 style={h4}>{title} <span style={{ color: rows.length ? "#991b1b" : "#166534" }}>({rows.length})</span></h4>
      {rows.length === 0 ? <Empty text="Nothing to report." /> : (
        <Table headers={cols.map((c) => c[1])} minWidth={600}>
          {rows.map((r, i) => <tr key={i}>{cols.map((c) => <Td key={c[0]} right={typeof r[c[0]] === "number"}>{typeof r[c[0]] === "number" ? qty(r[c[0]]) : (r[c[0]] ?? "—")}</Td>)}</tr>)}
        </Table>
      )}
    </div>
  );
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ marginBottom: 10, fontSize: 13 }}>Adjustments awaiting approval: <b>{a.pendingApprovals}</b></div>
      {block("Overdue returns (material still with the worker)", a.overdueWithWorker, [["jwoNumber", "Order"], ["workerName", "Job worker"], ["expectedReturnDate", "Return by"], ["withWorker", "Still with worker"]])}
      {block("Challans not yet fully reconciled", a.unreconciledChallans, [["challanNumber", "Challan"], ["jwoNumber", "Order"], ["workerName", "Job worker"], ["challanDate", "Dispatched"]])}
      {block("Rework pending re-dispatch", a.pendingReworkLines, [["jwoNumber", "Order"], ["lineNo", "Line"], ["itemCode", "Item"], ["reworkPending", "Qty"]])}
      {block("Excess loss above permissible", a.excessLoss, [["jwoNumber", "Order"], ["itemCode", "Item"], ["actualLoss", "Actual loss"], ["allowedLoss", "Allowed"], ["excess", "Excess"]])}
    </div>
  );
}

function ReconPolicyTab({ user, flash }) {
  const [rows, setRows] = useState([]);
  const [ops, setOps] = useState([]);
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ operationId: "", category: "", permissiblePct: "" });
  const [error, setError] = useState("");
  const load = useCallback(() => { api("GET", "/reconciliation/loss-policies", user).then(setRows).catch((e) => setError(e.message)); }, [user]);
  useEffect(() => { load(); plainGet("/job-work/operations").then(setOps); plainGet("/job-work/categories").then(setCats); }, [load]);
  const save = async () => {
    setError("");
    try {
      await api("POST", "/reconciliation/loss-policies", user, { operationId: Number(f.operationId), category: f.category || null, permissiblePct: Number(f.permissiblePct) });
      flash("Permissible loss saved."); setF({ operationId: "", category: "", permissiblePct: "" }); load();
    } catch (e) { setError(e.message); }
  };
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Permissible process loss" subtitle="Loss allowed for an operation, as a percentage of dispatched quantity. Approvers only. Blank category = all categories.">
        <Field label="Operation" required><SearchableSelect value={f.operationId} onChange={(e) => setF({ ...f, operationId: e.target.value })} placeholder="Select operation"
  options={ops.map((o) => ({ value: o.id, label: o.operationName }))} /></Field>
        <Field label="Category"><SearchableSelect value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} emptyLabel="All categories"
  options={cats.map((c) => ({ value: c.categoryName, label: c.categoryName }))} /></Field>
        <Field label="Permissible loss %" required><input type="number" min="0" max="100" step="0.01" style={inp} value={f.permissiblePct} onChange={(e) => setF({ ...f, permissiblePct: e.target.value })} /></Field>
        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}><button style={btn("primary")} onClick={save}>Save rule</button></div>
      </Section>
      <Table headers={["Operation", "Category", "Permissible %", "Effective from"]} minWidth={500}>
        {rows.length === 0 && <tr><Td>No rule set: every process loss is treated as excess until a rule is set.</Td></tr>}
        {rows.map((r) => <tr key={r.id}><Td>{r.operationName}</Td><Td>{r.category || "All"}</Td><Td right>{qty(r.permissiblePct)}</Td><Td>{dateText(r.effectiveFrom)}</Td></tr>)}
      </Table>
    </div>
  );
}

function ReconScreen({ user, flash }) {
  const [tab, setTab] = useState("orders");
  const [tick, setTick] = useState(0);
  const tabs = [["orders", "Orders"], ["approvals", "Adjustments & approvals"], ["scrap", "Scrap"], ["alerts", "Alerts"], ["policy", "Permissible loss"]];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ ...btn(tab === k ? "primary" : "ghost"), padding: "6px 12px" }}>{l}</button>)}
      </div>
      {tab === "orders" && <ReconOrdersTab key={tick} user={user} flash={flash} onChanged={() => setTick((t) => t + 1)} />}
      {tab === "approvals" && <ReconApprovalsTab user={user} flash={flash} onChanged={() => setTick((t) => t + 1)} />}
      {tab === "scrap" && <ReconScrapTab user={user} />}
      {tab === "alerts" && <ReconAlertsTab key={tick} user={user} />}
      {tab === "policy" && <ReconPolicyTab user={user} flash={flash} />}
    </div>
  );
}

// ============================================================================
// Reports
// ============================================================================

function ReportsScreen({ user, flash }) {
  const [catalogue, setCatalogue] = useState([]);
  const [key, setKey] = useState("order-register");
  const [from, setFrom] = useState(addDays(-90));
  const [to, setTo] = useState(TODAY());
  const [workerId, setWorkerId] = useState("");
  const [q, setQ] = useState("");
  const [workers, setWorkers] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    api("GET", "/reports", user).then(setCatalogue).catch((e) => setError(e.message));
    api("GET", "/workers?size=200", user).then((d) => setWorkers(d.content)).catch(() => {});
  }, [user]);
  const current = catalogue.find((c) => c.key === key);
  // A column is numeric when any row holds a number: header and every cell under it (even an empty "—") align right.
  const numericCols = new Set(report ? report.columns.filter((c) => report.rows.some((r) => typeof r[c] === "number")) : []);
  const run = async () => {
    setError(""); setLoading(true);
    try {
      const params = new URLSearchParams();
      if (current && current.dated) { params.set("from", from); params.set("to", to); }
      if (workerId) params.set("workerId", workerId);
      if (q) params.set("q", q);
      setReport(await api("GET", `/reports/${key}?${params}`, user));
    } catch (e) { setError(e.message); setReport(null); } finally { setLoading(false); }
  };
  useEffect(() => { setReport(null); }, [key]);
  const exportExcel = () => {
    if (!report) return;
    const sheet = report.rows.map((r) => {
      const o = {};
      report.columns.forEach((c) => { o[c] = r[c] === undefined ? "" : r[c]; });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(sheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${key}_${TODAY()}.xlsx`);
    flash(`Exported ${report.rows.length} row(s).`);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, alignItems: "start" }}>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {catalogue.map((c) => (
          <div key={c.key} onClick={() => setKey(c.key)} style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: key === c.key ? "#eff6ff" : "#fff" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: key === c.key ? "#1d4ed8" : "#0f172a" }}>{c.title}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{c.hint}</div>
          </div>
        ))}
      </div>
      <div>
        {error && <Banner kind="error">{error}</Banner>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
          {current && current.dated && <>
            <div style={{ width: 160 }}><Field label="From"><DateInput value={from} onChange={(e) => setFrom(e.target.value)} style={inp} /></Field></div>
            <div style={{ width: 160 }}><Field label="To"><DateInput value={to} onChange={(e) => setTo(e.target.value)} style={inp} /></Field></div>
          </>}
          <div style={{ width: 220 }}><Field label="Job worker"><SearchableSelect value={workerId} onChange={(e) => setWorkerId(e.target.value)} emptyLabel="All"
  options={workers.map((w) => ({ value: w.id, label: w.legalName }))} /></Field></div>
          <div style={{ width: 240 }}><Field label={key === "order-history" ? "Order number (exact)" : "Search"} hint={key === "order-history" ? "e.g. JWO-2026-00001" : ""}><input style={inp} value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
          <button style={btn("primary")} onClick={run} disabled={loading}>{loading ? "Running…" : "Run report"}</button>
          <button style={btn()} onClick={exportExcel} disabled={!report}>Export Excel</button>
        </div>
        {!report && !error && <Empty text={`Choose a report and press Run. ${current ? current.hint : ""}`} />}
        {report && (report.rows.length === 0 ? <Empty text="No rows for these filters." /> : (
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#64748b", padding: "6px 8px" }}>{report.rows.length} row(s)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#f8fafc" }}>{report.columns.map((c) => <th key={c} style={{ textAlign: numericCols.has(c) ? "right" : "left", padding: "7px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{c}</th>)}</tr></thead>
              <tbody>{report.rows.map((r, i) => <tr key={i}>{report.columns.map((c) => <Td key={c} right={numericCols.has(c)}>{typeof r[c] === "number" ? qty(r[c]) : typeof r[c] === "boolean" ? (r[c] ? "Yes" : "No") : (r[c] === null || r[c] === undefined || r[c] === "" ? "—" : String(r[c]))}</Td>)}</tr>)}</tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page: header with screens, screens below
// ============================================================================

export function JobWorkPage({ screen = "dashboard", onBackToHome, onOpenSidebar, sidebarOpen }) {
  const [user, setUserState] = useState(loadUser);
  const [current, setCurrent] = useState(screen);
  const [filter, setFilter] = useState({});
  const [toast, setToast] = useState(null);
  const [refs, setRefs] = useState({ workers: [], locations: [], operations: [], categories: [], items: [], indents: [] });
  const [orderFromIndent, setOrderFromIndent] = useState(null);
  const [orderForm, setOrderForm] = useState(false);
  const setUser = (u) => { setUserState(u); saveUser(u); };
  const flash = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3400);
  }, []);
  useEffect(() => { setCurrent(screen); setFilter({}); }, [screen]);

  const loadRefs = useCallback(async () => {
    const [workers, locations, operations, categories, items, indents] = await Promise.all([
      api("GET", "/workers?size=200", user).then((d) => d.content).catch(() => []),
      api("GET", "/locations", user).catch(() => []),
      api("GET", "/operations", user).catch(() => []),
      api("GET", "/categories", user).catch(() => []),
      plainGet("/inventory/items"),
      api("GET", "/indents?size=200", user).then((d) => d.content).catch(() => [])
    ]);
    // Same stock category the server uses: the item's category, or its group when it has none.
    setRefs({ workers, locations, operations, categories, items: items.map((m) => ({ id: m.id, code: m.item_code, description: m.item_name, category: m.category || m.group_name || "", unitOfMeasurement: m.uom_clean })), indents });
  }, [user]);
  // Reloaded on every tab change, so a job worker, indent or operation added on one tab is offered on the next.
  useEffect(() => { loadRefs(); }, [loadRefs, current]);

  const goTo = (key, f) => { setFilter(f || {}); setCurrent(key); };
  const openOrderFromIndent = (indent) => { setOrderFromIndent(indent); setOrderForm(true); };

  const tabBtn = (key, label) => (
    <button onClick={() => goTo(key, {})}
      style={{ ...btn(current === key ? "primary" : "ghost"), fontSize: 13, padding: "7px 12px" }}>
      {label}
    </button>
  );

  return (
    <div style={{ height: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#f1f5f9", borderRadius: 0, border: "none" }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: toast.isError ? "#dc2626" : "#10b981", color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", maxWidth: 460 }}>{toast.message}</div>}

      <div style={{ flexShrink: 0, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "9px 18px 9px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {STEP_SCREENS.map((s) => <React.Fragment key={s.key}>{tabBtn(s.key, s.label)}</React.Fragment>)}
          <span style={{ color: "#e2e8f0", margin: "0 4px", fontSize: 18 }}>|</span>
          <select value={OTHER_SCREENS.some((o) => o.key === current) ? current : ""} onChange={(e) => e.target.value && goTo(e.target.value, {})}
            style={{ ...btn(), padding: "7px 12px", fontSize: 13, background: OTHER_SCREENS.some((o) => o.key === current) ? "#1e293b" : "#fff", color: OTHER_SCREENS.some((o) => o.key === current) ? "#fff" : "#334155" }}>
            <option value="" style={{ color: "#0f172a" }}>More: workers, ledger, reports…</option>
            {OTHER_SCREENS.map((o) => <option key={o.key} value={o.key} style={{ color: "#0f172a" }}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#64748b", flexWrap: "wrap" }}>
          <span onClick={onBackToHome} style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline" }}>Purchase</span>
          <span>›</span><span>Job Work</span><span>›</span>
          <span style={{ color: "#0f172a", fontWeight: 700 }}>{SCREENS.find((s) => s.key === current)?.label}</span>
          <span style={{ color: "#e2e8f0", margin: "0 4px", fontSize: 18 }}>|</span>
          <input title="Your name" style={{ ...inp, width: 130, padding: "5px 8px" }} value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
          <select title="Your role" style={{ ...inp, width: 120, padding: "5px 8px" }} value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          <button onClick={onOpenSidebar} style={{ ...btn(), padding: "5px 12px" }}>{sidebarOpen ? "Hide menu" : "Menu"}</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 0, display: "flex", flexDirection: "column", boxSizing: "border-box", position: "relative" }}>
        <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", boxSizing: "border-box", background: "#fff", border: "none", borderRadius: 0, padding: "12px 18px", overflowY: "auto" }}>
          {current === "dashboard" && <DashboardScreen user={user} goTo={goTo} flash={flash} />}
          {current === "workers" && <WorkersScreen user={user} flash={flash} />}
          {current === "indents" && <IndentsScreen user={user} filter={filter} locations={refs.locations} operations={refs.operations} categories={refs.categories} items={refs.items} workers={refs.workers} flash={flash} onOpenOrder={openOrderFromIndent} />}
          {current === "orders" && <OrdersScreen user={user} filter={filter} workers={refs.workers} locations={refs.locations} operations={refs.operations} categories={refs.categories} items={refs.items} indents={refs.indents} flash={flash} />}
          {current === "send" && <WorkList kind="send" user={user} flash={flash} />}
          {current === "receive" && <WorkList kind="receive" user={user} flash={flash} />}
          {current === "challans" && <ChallansScreen user={user} flash={flash} refs={refs} />}
          {current === "receipts" && <ReceiptsScreen user={user} filter={filter} flash={flash} />}
          {current === "ledger" && <LedgerScreen user={user} workers={refs.workers} />}
          {current === "recon" && <ReconScreen user={user} flash={flash} />}
          {current === "reports" && <ReportsScreen user={user} flash={flash} />}
          {current === "operations" && <OperationsScreen user={user} flash={flash} onChanged={loadRefs} />}
        </div>
      {orderForm && <OrderForm user={user} workers={refs.workers} locations={refs.locations} operations={refs.operations} categories={refs.categories} items={refs.items} indents={refs.indents}
        fromIndent={orderFromIndent} onClose={() => { setOrderForm(false); setOrderFromIndent(null); }}
        onSaved={(d, msg) => { setOrderForm(false); setOrderFromIndent(null); flash(msg); setFilter({}); setCurrent("orders"); }} />}
      </div>
      <div style={{ flexShrink: 0, background: "#1e293b", color: "#cbd5e1", padding: "7px 18px", fontSize: 12, fontWeight: 600, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span>Job Work · {SCREENS.find((s) => s.key === current)?.label}</span>
        <span>Acting as {user.name} ({user.role})</span>
      </div>

    </div>
  );
}

export default JobWorkPage;
