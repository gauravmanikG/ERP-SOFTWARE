import React, { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import DateInput from "../../../shared/components/DateInput";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";

// ============================================================================
// Job Work (subcontracting). Company stock moves through the inventory engine.
// Job-worker balances come from the job work ledger. Every screen calls the real API.
// ============================================================================

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";
const JW = `${API_ROOT}/job-work`;
const USER_KEY = "SMS_CURRENT_USER";
const ROLES = ["CREATOR", "APPROVER", "STORE", "QUALITY", "ADMIN"];
const SCREENS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "workers", label: "Job Workers" },
  { key: "indents", label: "Indents" },
  { key: "orders", label: "Job Work Orders" },
  { key: "challans", label: "Challans" },
  { key: "receipts", label: "Receipts & Inspection" },
  { key: "ledger", label: "Worker Stock Ledger" },
  { key: "recon", label: "Reconciliation & Scrap" },
  { key: "reports", label: "Reports" }
];
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
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.name) return { name: u.name, role: ROLES.includes(u.role) ? u.role : "CREATOR" };
    }
  } catch (e) { /* storage unavailable */ }
  return { name: "Current User", role: "CREATOR" };
}
function saveUser(u) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) { /* ignore */ }
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
  background: variant === "primary" ? "#2563eb" : variant === "danger" ? "#dc2626" : "#fff",
  color: variant === "ghost" ? "#334155" : "#fff",
  borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
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

function Modal({ title, onClose, children, footer, width = 760, zIndex = 1000 }) {
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

function SearchableSelect({ options, value, onChange, placeholder, disabled }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.value) === String(value));
  const shown = open ? q : selected ? selected.label : "";
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 80);
  return (
    <div style={{ position: "relative" }}>
      <input style={inp} value={shown} placeholder={placeholder} disabled={disabled}
        onFocus={() => { setOpen(true); setQ(""); }} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60, maxHeight: 240, overflowY: "auto", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, boxShadow: "0 10px 24px rgba(15,23,42,0.15)" }}>
          {filtered.length === 0 && <div style={{ padding: 8, fontSize: 12, color: "#64748b" }}>No matches</div>}
          {filtered.map((o) => (
            <div key={String(o.value)} onMouseDown={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: "7px 10px", fontSize: 12, cursor: "pointer", background: String(o.value) === String(value) ? "#eff6ff" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 600 }}>{o.label}</div>
              {o.sub && <div style={{ fontSize: 11, color: "#64748b" }}>{o.sub}</div>}
            </div>
          ))}
        </div>
      )}
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
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
      <table style={{ width: "100%", minWidth, borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr style={{ background: "#f8fafc" }}>{headers.map((h) => <th key={h} style={{ textAlign: "left", padding: "7px 8px", borderBottom: "1px solid #e2e8f0", color: "#334155", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
const Td = ({ children, right }) => <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: right ? "right" : "left", verticalAlign: "top" }}>{children}</td>;
const Empty = ({ text }) => <div style={{ fontSize: 12, color: "#64748b", padding: "8px 0" }}>{text}</div>;

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
  return (
    <div>
      <h4 style={h4}>Job work orders by status</h4>
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

function WorkerForm({ user, onSaved, onClose, flash }) {
  const [candidates, setCandidates] = useState([]);
  const [ops, setOps] = useState([]);
  const [f, setF] = useState({ supplierCode: "", operationIds: [], contactPerson: "", phone: "", email: "", workLocation: "", paymentTerms: "", creditDays: "30" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("GET", "/vendor-candidates", user).then(setCandidates).catch((e) => setError(e.message));
    api("GET", "/operations", user).then(setOps).catch((e) => setError(e.message));
  }, [user]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  const toggleOp = (id) => setF((x) => ({ ...x, operationIds: x.operationIds.includes(id) ? x.operationIds.filter((o) => o !== id) : [...x.operationIds, id] }));
  const save = async () => {
    setError("");
    if (!f.supplierCode) { setError("Select a vendor from the Vendor Master."); return; }
    if (f.operationIds.length === 0) { setError("Select at least one approved job work operation."); return; }
    setBusy(true);
    try {
      const w = await api("POST", "/workers", user, {
        supplierCode: f.supplierCode, operationIds: f.operationIds, contactPerson: f.contactPerson || null, phone: f.phone || null,
        email: f.email || null, workLocation: f.workLocation || null, paymentTerms: f.paymentTerms || null, creditDays: Number(f.creditDays || 0)
      });
      onSaved(w, `${w.workerCode} onboarded as job worker.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Onboard job worker" onClose={onClose} width={760}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn("primary")} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save job worker"}</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Vendor" subtitle="Company details, GSTIN and PAN are copied from the Vendor Master. A vendor can be onboarded only once.">
        <Field label="Vendor" required span={2}>
          <SearchableSelect options={candidates.map((c) => ({ value: c.supplierCode, label: `${c.supplierName} (${c.supplierCode})`, sub: [c.gstin, c.state].filter(Boolean).join(" · ") }))}
            value={f.supplierCode} placeholder="Search vendor" onChange={set("supplierCode")} />
        </Field>
        <Field label="Credit days"><input type="number" min="0" style={inp} value={f.creditDays} onChange={set("creditDays")} /></Field>
        <Field label="Approved operations" required span={3} hint="Rates can only be added for these operations">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ops.map((o) => (
              <label key={o.id} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px" }}>
                <input type="checkbox" checked={f.operationIds.includes(o.id)} onChange={() => toggleOp(o.id)} /> {o.operationName}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Contact person"><input style={inp} value={f.contactPerson} onChange={set("contactPerson")} /></Field>
        <Field label="Phone"><input style={inp} value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Email"><input style={inp} value={f.email} onChange={set("email")} /></Field>
        <Field label="Work location"><input style={inp} value={f.workLocation} onChange={set("workLocation")} /></Field>
        <Field label="Payment terms" hint="Blank = vendor's terms"><input style={inp} value={f.paymentTerms} onChange={set("paymentTerms")} /></Field>
      </Section>
    </Modal>
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
      <Field label="Operation" required><select style={inp} value={f.operationId} onChange={set("operationId")}><option value="">Select</option>{ops.map((o) => <option key={o.id} value={o.id}>{o.operationName}</option>)}</select></Field>
      <Field label="Item category" hint="Blank = all categories"><select style={inp} value={f.itemCategory} onChange={set("itemCategory")}><option value="">All categories</option>{cats.map((c) => <option key={c.categoryName} value={c.categoryName}>{c.categoryName}</option>)}</select></Field>
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
  if (!w) return <Modal title="Job worker" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  return (
    <Modal title={`${w.workerCode} · ${w.legalName}`} onClose={onClose} width={980}>
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
      {rows.map((r) => <tr key={`${r.masterId}-${r.category}`}><Td>{r.itemCode}</Td><Td>{r.category}</Td><Td right>{qty(r.balanceQty)}</Td></tr>)}
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

function IndentForm({ user, locations, operations, categories, items, editing, onSaved, onClose }) {
  const init = editing ? {
    requestingDepartmentId: String(editing.requestingDepartmentId), sourceDepartmentId: String(editing.sourceDepartmentId),
    reason: editing.reason || "", requiredDispatchDate: editing.requiredDispatchDate || "", requiredReturnDate: editing.requiredReturnDate || "",
    productionRef: editing.productionRef || "", estimatedCost: String(editing.estimatedCost || ""), remarks: editing.remarks || "",
    lines: editing.lines.map((l) => ({ masterId: String(l.masterId), category: l.category, operationId: String(l.operationId), requiredQty: String(l.requiredQty), remarks: l.remarks || "" }))
  } : { requestingDepartmentId: "", sourceDepartmentId: "", reason: "", requiredDispatchDate: TODAY(), requiredReturnDate: addDays(20), productionRef: "", estimatedCost: "", remarks: "",
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
    if (!f.sourceDepartmentId) return setError("Select the source store / warehouse.");
    if (!f.reason.trim()) return setError("Give the reason for outsourcing this work.");
    if (f.lines.length === 0 || f.lines.some((l) => !l.masterId || !l.operationId || !(Number(l.requiredQty) > 0))) return setError("Every line needs an item, an operation and a quantity above zero.");
    setBusy(true);
    try {
      const body = {
        clientRequestId: editing ? null : newKey("ind"), indentDate: TODAY(), requestingDepartmentId: Number(f.requestingDepartmentId), sourceDepartmentId: Number(f.sourceDepartmentId),
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
    <Modal title={editing ? `Edit ${editing.indentNumber}` : "New job work indent"} onClose={onClose} width={1000}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn()} disabled={busy} onClick={() => save(false)}>Save draft</button><button style={btn("primary")} disabled={busy} onClick={() => save(true)}>Save and submit</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Request">
        <Field label="Requesting department" required><select style={inp} value={f.requestingDepartmentId} onChange={set("requestingDepartmentId")}><option value="">Select</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.departmentName}</option>)}</select></Field>
        <Field label="Source store / warehouse" required hint="Stock is checked here before dispatch"><select style={inp} value={f.sourceDepartmentId} onChange={set("sourceDepartmentId")}><option value="">Select</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.departmentName}</option>)}</select></Field>
        <Field label="Reason for outsourcing" required span={2}><input style={inp} value={f.reason} onChange={set("reason")} /></Field>
        <Field label="Required dispatch date"><DateInput value={f.requiredDispatchDate} onChange={set("requiredDispatchDate")} style={inp} /></Field>
        <Field label="Required return date"><DateInput value={f.requiredReturnDate} onChange={set("requiredReturnDate")} style={inp} /></Field>
        <Field label="Production order / BOM reference"><input style={inp} value={f.productionRef} onChange={set("productionRef")} /></Field>
        <Field label="Estimated processing cost"><input type="number" min="0" step="0.01" style={inp} value={f.estimatedCost} onChange={set("estimatedCost")} /></Field>
        <Field label="Remarks" span={2}><input style={inp} value={f.remarks} onChange={set("remarks")} /></Field>
      </Section>
      <Section title="Items" subtitle="The store's available quantity is shown on the register and checked again when material is dispatched.">
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
          {f.lines.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr 1fr auto", gap: 6, alignItems: "end" }}>
              <SearchableSelect options={itemOptions} value={l.masterId} placeholder="Item code / description"
                onChange={(id) => { const m = items.find((x) => String(x.id) === String(id)); setF((x) => ({ ...x, lines: x.lines.map((y, j) => j === i ? { ...y, masterId: String(id), category: m ? m.category : "" } : y) })); }} />
              <select style={inp} value={l.category} onChange={(e) => setLine(i, "category", e.target.value)} title="Stock category the material is held under">
                <option value="">Category</option>{categories.map((c) => <option key={c.categoryName} value={c.categoryName}>{c.categoryName}</option>)}
              </select>
              <select style={inp} value={l.operationId} onChange={(e) => setLine(i, "operationId", e.target.value)}><option value="">Operation</option>{operations.map((o) => <option key={o.id} value={o.id}>{o.operationName}</option>)}</select>
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
  DRAFT: "Submit for approval (creator)",
  PENDING_APPROVAL: "Waiting for an approver",
  APPROVED: "Dispatch material to the job worker (store)",
  IN_PROGRESS: "Dispatch more material, or record a receipt (store)",
  PARTIALLY_RECEIVED: "Record the remaining receipts and inspections (store)",
  COMPLETED: "Approver closes the order",
  REJECTED: "Edit and resubmit (creator)",
  CLOSED: "Nothing: the order is closed",
  CANCELLED: "Nothing: the order is cancelled"
};
const INDENT_NEXT_STEP = {
  DRAFT: "Submit for approval (creator)",
  SUBMITTED: "Waiting for an approver",
  APPROVED: "Create a job work order from this indent",
  REJECTED: "Edit and resubmit (creator)",
  CANCELLED: "Nothing: the indent is cancelled"
};
// Who may use each order action and in which statuses. Mirrors the server rules.
const ORDER_RULES = {
  EDIT: { label: "Edit draft", statuses: ["DRAFT", "REJECTED"], roles: ["CREATOR", "APPROVER"], variant: "ghost", unsupported: "Editing an order is not available yet. Cancel it and create a new one." },
  SUBMIT: { label: "Submit for approval", statuses: ["DRAFT", "REJECTED"], roles: ["CREATOR", "APPROVER"], variant: "primary" },
  APPROVE: { label: "Approve", statuses: ["PENDING_APPROVAL"], roles: ["APPROVER"], variant: "primary", note: "The person who created the order cannot approve it" },
  REJECT: { label: "Reject", statuses: ["PENDING_APPROVAL"], roles: ["APPROVER"], variant: "danger" },
  CANCEL: { label: "Cancel order", statuses: ["DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED"], roles: ["CREATOR", "APPROVER"], variant: "danger" },
  CREATE_CHALLAN: { label: "Dispatch material", statuses: ["APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED"], roles: ["STORE"], variant: "primary" },
  CREATE_RECEIPT: { label: "Record receipt", statuses: ["APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED"], roles: ["STORE"], variant: "primary" },
  CLOSE: { label: "Close order", statuses: ["COMPLETED"], roles: ["APPROVER"], variant: "primary" }
};
const INDENT_RULES = {
  EDIT: { label: "Edit", statuses: ["DRAFT", "REJECTED"], roles: ["CREATOR", "APPROVER"], variant: "ghost" },
  SUBMIT: { label: "Submit for approval", statuses: ["DRAFT", "REJECTED"], roles: ["CREATOR", "APPROVER"], variant: "primary" },
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
              background: current ? "#2563eb" : done ? "#dcfce7" : "#f1f5f9", color: current ? "#fff" : done ? "#166534" : "#64748b" }}>
              {done ? "✓ " : current ? "● " : ""}{s.label}
            </span>
            {i < stages.length - 1 && <span style={{ color: "#94a3b8", fontSize: 12 }}>→</span>}
          </span>
        );
      })}
    </div>
  );
}

// Shows every action for the record: enabled ones as buttons, the rest greyed out with the reason.
function ActionPanel({ title, rules, acts, handlers, status, role, styleMap, nextStep }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 12, background: "#f8fafc" }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{title}</div>
      <div style={{ fontSize: 12, color: "#334155", margin: "4px 0 10px" }}>Next step: {nextStep}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {Object.entries(rules).map(([key, rule]) => {
          const on = acts.includes(key) && !rule.unsupported;
          return (
            <div key={key} style={{ flex: "1 1 180px", minWidth: 180, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
              <button style={{ ...btn(on ? rule.variant : "ghost"), width: "100%", opacity: on ? 1 : 0.5, cursor: on ? "pointer" : "not-allowed" }}
                disabled={!on} onClick={() => on && handlers[key]()}>{rule.label}</button>
              <div style={{ fontSize: 11, marginTop: 4, color: on ? "#166534" : "#64748b" }}>{on ? "Available now" : actionReason(rule, status, role, styleMap)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IndentDetail({ id, user, locations, operations, categories, items, onClose, onChanged, flash, onOpenOrder }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const load = useCallback(() => api("GET", `/indents/${id}`, user).then(setD).catch((e) => setError(e.message)), [id, user]);
  useEffect(() => { load(); }, [load]);
  const act = async (action, label) => {
    let comments = null;
    if (["reject", "cancel"].includes(action)) { comments = window.prompt(`Reason to ${label.toLowerCase()}?`); if (!comments) return; }
    try { await api("POST", `/indents/${id}/${action}`, user, { comments }); flash(`Indent ${label.toLowerCase()}d.`); load(); onChanged(); } catch (e) { flash(e.message, true); }
  };
  if (editing && d) return <IndentForm user={user} locations={locations} operations={operations} categories={categories} items={items} editing={d}
    onSaved={(x, msg) => { setEditing(false); flash(msg); load(); onChanged(); }} onClose={() => setEditing(false)} />;
  if (!d) return <Modal title="Indent" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  const acts = d.allowedActions || [];
  return (
    <Modal title={`${d.indentNumber} · ${d.reason}`} onClose={onClose} width={1000}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><Badge map={INDENT_STYLE} value={d.status} /><span style={{ fontSize: 12, color: "#64748b" }}>by {d.createdBy} on {dateText(d.indentDate)}</span></div>
      {indentStageIndex(d) >= 0 && <StageTracker stages={INDENT_STAGES} currentIndex={indentStageIndex(d)} />}
      <ActionPanel title="Actions on this indent" rules={INDENT_RULES} acts={acts} status={d.status} role={user.role} styleMap={INDENT_STYLE}
        nextStep={INDENT_NEXT_STEP[d.status] && !(d.status === "APPROVED" && (d.orders || []).length > 0) ? INDENT_NEXT_STEP[d.status] : d.status === "APPROVED" ? "Job work order raised" : "—"}
        handlers={{ EDIT: () => setEditing(true), SUBMIT: () => act("submit", "Submit"), APPROVE: () => act("approve", "Approve"), REJECT: () => act("reject", "Reject"),
          CANCEL: () => act("cancel", "Cancel"), CREATE_ORDER: () => onOpenOrder(d) }} />
      {d.rejectionReason && <Banner kind="error">Rejected: {d.rejectionReason}</Banner>}
      <div style={grid4}>
        <KV label="Requesting department" value={d.requestingDepartment} />
        <KV label="Source store" value={d.sourceDepartment} />
        <KV label="Required dispatch / return" value={`${dateText(d.requiredDispatchDate)} / ${dateText(d.requiredReturnDate)}`} />
        <KV label="Production reference" value={d.productionRef} />
        <KV label="Preferred job worker" value={d.preferredWorker} />
        <KV label="Estimated cost" value={money(d.estimatedCost)} />
      </div>
      <h4 style={h4}>Items</h4>
      <Table headers={["#", "Item", "Category", "Operation", "Required", "Available at store", ""]} minWidth={700}>
        {(d.lines || []).map((l) => (
          <tr key={l.id}><Td>{l.lineNo}</Td><Td>{l.itemCode} <span style={{ color: "#64748b" }}>{l.itemName}</span></Td><Td>{l.category}</Td><Td>{l.operationName}</Td><Td right>{qty(l.requiredQty)} {l.uom}</Td>
            <Td right>{qty(l.availableQty)}</Td><Td>{l.stockShortfall && <span style={{ color: "#b45309", fontSize: 11, fontWeight: 700 }}>Short at store now</span>}</Td></tr>
        ))}
      </Table>
      <h4 style={h4}>Job work orders from this indent</h4>
      {(d.orders || []).length === 0 ? <Empty text="None yet." /> : d.orders.map((o) => <div key={o.id} style={{ fontSize: 13 }}>{o.jwoNumber} · <Badge map={ORDER_STYLE} value={o.status} /></div>)}
      <h4 style={h4}>Approval history</h4>
      {(d.history || []).length === 0 ? <Empty text="No activity." /> : (
        <Table headers={["When", "Action", "From → To", "By (role)", "Comments"]} minWidth={600}>
          {d.history.map((h) => <tr key={h.id}><Td>{formatDisplayDate(h.actedAt)}</Td><Td>{h.action}</Td><Td>{h.fromStatus || "—"} → {h.toStatus || "—"}</Td><Td>{h.actor} ({h.actorRole})</Td><Td>{h.comments || "—"}</Td></tr>)}
        </Table>
      )}
    </Modal>
  );
}

function IndentsScreen({ user, filter, locations, operations, categories, items, flash, onOpenOrder }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(filter.status || "");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setStatus(filter.status || ""); }, [filter]);
  useEffect(() => { setPage(0); }, [q, status]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    api("GET", `/indents?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, q, status, page, tick]);
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "flex-end" }}>
        <div style={{ width: 280 }}><Field label="Search"><input style={inp} placeholder="Indent no., reason or item" value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <div style={{ width: 180 }}><Field label="Status"><select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{Object.entries(INDENT_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field></div>
        <div style={{ marginLeft: "auto" }}><button style={btn("primary")} onClick={() => setCreating(true)}>+ New indent</button></div>
      </div>
      <Table headers={["Indent no.", "Date", "Items", "Reason", "Est. cost", "Orders", "Status", "Next step", "Raised by"]} minWidth={1000}>
        {data.content.length === 0 && <tr><Td>No indents match.</Td></tr>}
        {data.content.map((r) => (
          <tr key={r.id}>
            <Td><button onClick={() => setDetailId(r.id)} style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0 }}>{r.indentNumber}</button></Td>
            <Td>{dateText(r.indentDate)}</Td><Td>{r.items}</Td><Td>{r.reason}</Td><Td right>{money(r.estimatedCost)}</Td><Td right>{r.orderCount}</Td>
            <Td><Badge map={INDENT_STYLE} value={r.status} /></Td>
            <Td>{r.status === "APPROVED" && r.orderCount > 0 ? "Job work order raised" : INDENT_NEXT_STEP[r.status] || "—"}</Td><Td>{r.createdBy}</Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />
      {creating && <IndentForm user={user} locations={locations} operations={operations} categories={categories} items={items}
        onSaved={(d, msg) => { setCreating(false); flash(msg); setTick((t) => t + 1); setDetailId(d.id); }} onClose={() => setCreating(false)} />}
      {detailId && <IndentDetail id={detailId} user={user} locations={locations} operations={operations} categories={categories} items={items} flash={flash}
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
  useEffect(() => {
    api("GET", "/indents?status=APPROVED&size=200", user).then((d) => setApprovedIndents(d.content || [])).catch(() => setApprovedIndents([]));
  }, [user]);
  const [f, setF] = useState({ jobWorkerId: "", jwoDate: TODAY(), requestingDepartmentId: fromIndent ? String(fromIndent.requestingDepartmentId) : "",
    sourceDepartmentId: fromIndent ? String(fromIndent.sourceDepartmentId) : "", expectedReturnDate: addDays(20), expectedCompletionDate: addDays(15),
    paymentTerms: "", qualitySpecs: "", deliveryTerms: "", rejectionTerms: "", remarks: "" });
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  useEffect(() => {
    if (!indentId) return;
    api("GET", `/indents/${indentId}`, user).then((d) => {
      setF((x) => ({ ...x, requestingDepartmentId: String(d.requestingDepartmentId), sourceDepartmentId: String(d.sourceDepartmentId) }));
      setLines(d.lines.map((l) => ({ indentLineNo: l.lineNo, masterId: String(l.masterId), category: l.category, operationId: String(l.operationId), inputQty: String(l.requiredQty), remarks: "" })));
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
  const workerOpts = workers.filter((w) => w.status === "ACTIVE").map((w) => ({ value: w.id, label: `${w.legalName} (${w.workerCode})` }));
  return (
    <Modal title="New job work order" onClose={onClose} width={1000}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn()} disabled={busy} onClick={() => save(false)}>Save draft</button><button style={btn("primary")} disabled={busy} onClick={() => save(true)}>Save and submit</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Order">
        <Field label="From approved indent" hint="Optional: lines and quantities are copied from the indent">
          <select style={inp} value={indentId} onChange={(e) => setIndentId(e.target.value)}><option value="">Direct order (no indent)</option>{approvedIndents.map((i) => <option key={i.id} value={i.id}>{i.indentNumber} · {i.reason}</option>)}</select>
        </Field>
        <Field label="Job worker" required><SearchableSelect options={workerOpts} value={f.jobWorkerId} placeholder="Search job worker" onChange={set("jobWorkerId")} /></Field>
        <Field label="Order date"><DateInput value={f.jwoDate} onChange={set("jwoDate")} style={inp} /></Field>
        <Field label="Source store" required><select style={inp} value={f.sourceDepartmentId} onChange={set("sourceDepartmentId")}><option value="">Select</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.departmentName}</option>)}</select></Field>
        <Field label="Requesting department"><select style={inp} value={f.requestingDepartmentId} onChange={set("requestingDepartmentId")}><option value="">Select</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.departmentName}</option>)}</select></Field>
        <Field label="Expected completion"><DateInput value={f.expectedCompletionDate} onChange={set("expectedCompletionDate")} style={inp} /></Field>
        <Field label="Expected return date"><DateInput value={f.expectedReturnDate} onChange={set("expectedReturnDate")} style={inp} /></Field>
        <Field label="Payment terms" hint="Blank = worker's terms"><input style={inp} value={f.paymentTerms} onChange={set("paymentTerms")} /></Field>
        <Field label="Quality specifications / acceptance" span={2}><input style={inp} value={f.qualitySpecs} onChange={set("qualitySpecs")} /></Field>
        <Field label="Delivery and rejection terms" span={2}><input style={inp} value={f.deliveryTerms} onChange={set("deliveryTerms")} /></Field>
      </Section>
      <Section title="Items and operations" subtitle="The agreed rate comes from the worker's active rate contract on the order date. Rates are not typed in.">
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr auto", gap: 6, alignItems: "end" }}>
              <SearchableSelect options={items.map((m) => ({ value: m.id, label: `${m.code} — ${m.description || ""}`, sub: m.category }))} value={l.masterId} placeholder="Item"
                onChange={(id) => { const m = items.find((x) => String(x.id) === String(id)); setLines((ls) => ls.map((y, j) => j === i ? { ...y, masterId: String(id), category: m ? m.category : "" } : y)); }} />
              <select style={inp} value={l.category} onChange={(e) => setLine(i, "category", e.target.value)}><option value="">Category</option>{categories.map((c) => <option key={c.categoryName} value={c.categoryName}>{c.categoryName}</option>)}</select>
              <select style={inp} value={l.operationId} onChange={(e) => setLine(i, "operationId", e.target.value)}><option value="">Operation</option>{operations.map((o) => <option key={o.id} value={o.id}>{o.operationName}</option>)}</select>
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
  const save = async () => {
    setError("");
    const lines = rows.map(({ l }) => ({ jwoLineId: l.id, qty: Number(qtys[l.id] || 0), batchNo: null })).filter((x) => x.qty > 0);
    if (lines.length === 0) return setError("Enter the quantity to dispatch on at least one line.");
    if (!f.authorizedBy.trim()) return setError("Enter the authorised person for this dispatch.");
    setBusy(true);
    try {
      const d = await api("POST", "/challans", user, { clientRequestId: newKey("ch"), jwoId: order.id, challanDate: f.challanDate, reworkDispatch: f.reworkDispatch,
        destinationLocation: f.destinationLocation || null, transporter: f.transporter || null, vehicleNo: f.vehicleNo || null, ewayBillNo: f.ewayBillNo || null,
        purpose: f.purpose, authorizedBy: f.authorizedBy, remarks: f.remarks || null, lines });
      onSaved(d, `${d.challanNumber} posted: stock moved to External Job Work.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Dispatch material — ${order.jwoNumber}`} onClose={onClose} width={900}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn("primary")} disabled={busy} onClick={save}>{busy ? "Posting…" : "Post challan"}</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Challan details" subtitle="Posting moves the stock out of the store into External Job Work and records it against the job worker.">
        <Field label="Challan date"><DateInput value={f.challanDate} onChange={set("challanDate")} style={inp} /></Field>
        <Field label="Authorised by" required><input style={inp} value={f.authorizedBy} onChange={set("authorizedBy")} /></Field>
        <Field label="Transporter"><input style={inp} value={f.transporter} onChange={set("transporter")} /></Field>
        <Field label="Vehicle number"><input style={inp} value={f.vehicleNo} onChange={set("vehicleNo")} /></Field>
        <Field label="E-way bill number" hint="Enter if your transport rules require it"><input style={inp} value={f.ewayBillNo} onChange={set("ewayBillNo")} /></Field>
        <Field label="Purpose"><input style={inp} value={f.purpose} onChange={set("purpose")} /></Field>
        <Field label="Dispatch type">
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.reworkDispatch} onChange={set("reworkDispatch")} /> Re-dispatch rework material from Rework-Burning</label>
        </Field>
        <Field label="Remarks" span={2}><input style={inp} value={f.remarks} onChange={set("remarks")} /></Field>
      </Section>
      <h4 style={h4}>Lines</h4>
      {rows.length === 0 ? <Empty text={f.reworkDispatch ? "No rework material is pending re-dispatch." : "Nothing left to dispatch on this order."} /> : (
        <Table headers={["Item", "Category", "Operation", "Balance to dispatch", "Dispatch qty"]} minWidth={640}>
          {rows.map(({ l, avail }) => (
            <tr key={l.id}>
              <Td>{l.itemCode} <span style={{ color: "#64748b" }}>{l.itemName}</span></Td><Td>{l.category}</Td><Td>{l.operationName}</Td><Td right>{qty(avail)} {l.uom}</Td>
              <Td><input type="number" min="0" step="0.01" max={avail} style={{ ...inp, width: 120 }} value={qtys[l.id] || ""} onChange={(e) => setQtys((q) => ({ ...q, [l.id]: e.target.value }))} /></Td>
            </tr>
          ))}
        </Table>
      )}
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Dispatch cannot exceed the approved balance or the stock available at the source store; the server checks both.</div>
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
  const save = async () => {
    setError("");
    const lines = rows.map((l) => ({ jwoLineId: l.id, qtyReceived: num(got[l.id]), unusedReturnedQty: num(unused[l.id]) }))
      .filter((x) => x.qtyReceived > 0 || x.unusedReturnedQty > 0);
    if (lines.length === 0) return setError("Enter what came back on at least one line.");
    setBusy(true);
    try {
      const d = await api("POST", "/receipts", user, { idempotencyKey: key, jwoId: order.id, challanId: f.challanId ? Number(f.challanId) : null,
        receiptDate: f.receiptDate, deliveryNoteNo: f.deliveryNoteNo || null, remarks: f.remarks || null, lines });
      onSaved(d, `${d.receiptNumber} recorded: material is in Quality Hold awaiting inspection.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Record receipt — ${order.jwoNumber}`} onClose={onClose} width={960}
      footer={<><button style={btn()} onClick={onClose}>Cancel</button><button style={btn("primary")} disabled={busy} onClick={save}>{busy ? "Posting…" : "Record receipt"}</button></>}>
      {error && <Banner kind="error">{error}</Banner>}
      <Section title="Receipt">
        <Field label="Receipt date"><DateInput value={f.receiptDate} onChange={set("receiptDate")} style={inp} /></Field>
        <Field label="Against challan" hint="Optional"><select style={inp} value={f.challanId} onChange={set("challanId")}><option value="">Not linked</option>{challans.filter((c) => c.status === "POSTED").map((c) => <option key={c.id} value={c.id}>{c.challanNumber}</option>)}</select></Field>
        <Field label="Job worker's delivery note"><input style={inp} value={f.deliveryNoteNo} onChange={set("deliveryNoteNo")} /></Field>
        <Field label="Remarks" span={3}><input style={inp} value={f.remarks} onChange={set("remarks")} /></Field>
      </Section>
      <h4 style={h4}>What came back</h4>
      {rows.length === 0 ? <Empty text="Nothing is with the job worker on this order." /> : (
        <Table headers={["Item", "With worker", "Processed qty back", "Unused raw material back"]} minWidth={640}>
          {rows.map((l) => (
            <tr key={l.id}>
              <Td>{l.itemCode} <span style={{ color: "#64748b" }}>{l.itemName}</span></Td><Td right>{qty(l.pendingWithWorker)} {l.uom}</Td>
              <Td><input type="number" min="0" step="0.01" style={{ ...inp, width: 120 }} value={got[l.id] || ""} onChange={(e) => setGot((g) => ({ ...g, [l.id]: e.target.value }))} /></Td>
              <Td><input type="number" min="0" step="0.01" style={{ ...inp, width: 120 }} value={unused[l.id] || ""} onChange={(e) => setUnused((g) => ({ ...g, [l.id]: e.target.value }))} /></Td>
            </tr>
          ))}
        </Table>
      )}
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Quantities above what the worker holds are refused. Processed material goes to Quality Hold; it is not available for use until inspected.</div>
    </Modal>
  );
}

function OrderDetail({ id, user, onClose, flash, onChanged, locations, workers, operations, categories, items, indents }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [screenForm, setScreenForm] = useState(null);
  const [printing, setPrinting] = useState(false);
  const load = useCallback(() => api("GET", `/orders/${id}`, user).then(setD).catch((e) => setError(e.message)), [id, user]);
  useEffect(() => { load(); }, [load]);
  const act = async (action, label, needsReason) => {
    let comments = null;
    if (needsReason) { comments = window.prompt(`Reason to ${label.toLowerCase()}?`); if (!comments) return; }
    try { await api("POST", `/orders/${id}/${action}`, user, { comments }); flash(`Order ${label.toLowerCase()} done.`); load(); onChanged(); } catch (e) { flash(e.message, true); }
  };
  const cancelChallan = async (c) => {
    const reason = window.prompt(`Reason to reverse ${c.challanNumber}?`);
    if (!reason) return;
    try { await api("POST", `/challans/${c.id}/cancel`, user, { comments: reason }); flash(`${c.challanNumber} reversed; stock returned to the store.`); load(); onChanged(); }
    catch (e) { flash(e.message, true); }
  };
  if (!d) return <Modal title="Job work order" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  const acts = d.allowedActions || [];
  const openPrint = async (cid) => {
    setPrinting(true);
    try { window.open(await openBlob(`/challans/${cid}/print`, user, "text/html"), "_blank"); } catch (e) { flash(e.message, true); } finally { setPrinting(false); }
  };
  return (
    <Modal title={`${d.jwoNumber} · ${d.workerName}`} onClose={onClose} width={1040}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <Badge map={ORDER_STYLE} value={d.status} />
        {d.overdue && <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>Overdue for return</span>}
        <span style={{ fontSize: 12, color: "#64748b" }}>Created by {d.createdBy} · {d.indentId ? "from indent" : "direct order"}</span>
      </div>
      {orderStageIndex(d) >= 0 && <StageTracker stages={ORDER_STAGES} currentIndex={orderStageIndex(d)} />}
      <ActionPanel title="Actions on this order" rules={ORDER_RULES} acts={acts} status={d.status} role={user.role} styleMap={ORDER_STYLE}
        nextStep={ORDER_NEXT_STEP[d.status] || "—"}
        handlers={{ SUBMIT: () => act("submit", "Submit"), APPROVE: () => act("approve", "Approve"), REJECT: () => act("reject", "Reject", true),
          CANCEL: () => act("cancel", "Cancel", true), CREATE_CHALLAN: () => setScreenForm("challan"), CREATE_RECEIPT: () => setScreenForm("receipt"),
          CLOSE: () => act("close", "Close", false) }} />
      {d.rejectionReason && <Banner kind="error">Rejected: {d.rejectionReason}</Banner>}
      <div style={grid4}>
        <KV label="Order date" value={dateText(d.jwoDate)} />
        <KV label="Expected return" value={dateText(d.expectedReturnDate)} />
        <KV label="Source store" value={d.sourceDepartment} />
        <KV label="Requesting department" value={d.requestingDepartment} />
        <KV label="Estimated charges (per contract)" value={money(d.estimatedCharges)} />
        <KV label="Payment terms" value={d.paymentTerms} />
      </div>
      <h4 style={h4}>Items and progress</h4>
      <Table headers={["#", "Item", "Operation", "Rate", "Input", "Sent", "With worker", "Back (processed)", "Accepted", "Rejected", "Rework", "Scrap"]} minWidth={1000}>
        {d.lines.map((l) => (
          <tr key={l.id}>
            <Td>{l.lineNo}</Td><Td>{l.itemCode}<div style={{ fontSize: 11, color: "#64748b" }}>{l.category}</div></Td><Td>{l.operationName}</Td>
            <Td right>{money(l.rate)} <div style={{ fontSize: 10, color: "#64748b" }}>{l.rateBasis}</div></Td>
            <Td right>{qty(l.inputQty)}</Td><Td right>{qty(l.dispatchedQty)}</Td><Td right>{qty(l.pendingWithWorker)}</Td><Td right>{qty(l.receivedQty)}</Td>
            <Td right>{qty(l.acceptedQty)}</Td><Td right>{qty(l.rejectedQty)}</Td><Td right>{qty(l.reworkQty)} <div style={{ fontSize: 10, color: "#64748b" }}>pending {qty(l.reworkPending)}</div></Td><Td right>{qty(l.scrapQty)}</Td>
          </tr>
        ))}
      </Table>
      <h4 style={h4}>Challans (dispatch)</h4>
      {d.challans.length === 0 ? <Empty text="Nothing dispatched yet." /> : (
        <Table headers={["Challan", "Date", "Qty", "Returned", "Status", "E-way bill", "Actions"]} minWidth={700}>
          {d.challans.map((c) => (
            <tr key={c.id}>
              <Td>{c.challanNumber}{c.reworkDispatch && <div style={{ fontSize: 10, color: "#854d0e" }}>rework</div>}</Td><Td>{dateText(c.challanDate)}</Td><Td right>{qty(c.totalQty)}</Td><Td right>{qty(c.returnedQty)}</Td>
              <Td><Badge map={CHALLAN_STYLE} value={c.status} /></Td><Td>{c.ewayBillNo || "—"}</Td>
              <Td><button style={{ ...btn(), padding: "2px 8px" }} onClick={() => openPrint(c.id)}>Print</button>
                {c.status === "POSTED" && ["APPROVER", "ADMIN"].includes(user.role) && <button style={{ ...btn(), padding: "2px 8px", marginLeft: 4 }} onClick={() => cancelChallan(c)}>Reverse</button>}</Td>
            </tr>
          ))}
        </Table>
      )}
      <h4 style={h4}>Receipts</h4>
      {d.receipts.length === 0 ? <Empty text="No receipts yet." /> : (
        <Table headers={["Receipt", "Date", "Delivery note", "Quantity", "Inspection"]} minWidth={600}>
          {d.receipts.map((r) => <tr key={r.id}><Td>{r.receiptNumber}</Td><Td>{dateText(r.receiptDate)}</Td><Td>{r.deliveryNoteNo || "—"}</Td><Td right>{qty(r.receivedQty)}</Td>
            <Td>{num(r.pendingInspectionLines) > 0 ? `${r.pendingInspectionLines} line(s) pending` : "Done"}</Td></tr>)}
        </Table>
      )}
      <h4 style={h4}>Stock ledger for this order</h4>
      {d.ledger.length === 0 ? <Empty text="No movements yet." /> : (
        <Table headers={["When", "Item", "Movement", "Qty (+ out / − back)", "Balance with worker", "Reference"]} minWidth={700}>
          {d.ledger.map((x) => <tr key={x.id}><Td>{formatDisplayDate(x.createdAt)}</Td><Td>{x.category}</Td><Td>{x.movementType}</Td><Td right>{qty(x.qty)}</Td><Td right>{qty(x.balanceAfter)}</Td><Td>{x.referenceNo}</Td></tr>)}
        </Table>
      )}
      <h4 style={h4}>Approval history</h4>
      {(d.history || []).length === 0 ? <Empty text="No activity." /> : (
        <Table headers={["When", "Action", "From → To", "By (role)", "Comments"]} minWidth={600}>
          {d.history.map((h) => <tr key={h.id}><Td>{formatDisplayDate(h.actedAt)}</Td><Td>{h.action}</Td><Td>{h.fromStatus || "—"} → {h.toStatus || "—"}</Td><Td>{h.actor} ({h.actorRole})</Td><Td>{h.comments || "—"}</Td></tr>)}
        </Table>
      )}
      {printing && <div style={{ fontSize: 11, color: "#64748b" }}>Opening print view…</div>}
      {screenForm === "challan" && <ChallanForm user={user} order={d} onClose={() => setScreenForm(null)}
        onSaved={(c, msg) => { setScreenForm(null); flash(msg); load(); onChanged(); }} />}
      {screenForm === "receipt" && <ReceiptForm user={user} order={d} challans={d.challans} onClose={() => setScreenForm(null)}
        onSaved={(r, msg) => { setScreenForm(null); flash(msg); load(); onChanged(); }} />}
    </Modal>
  );
}

function OrdersScreen({ user, filter, workers, locations, operations, categories, items, indents, flash }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(filter.status || "");
  const [overdue, setOverdue] = useState(filter.overdue || "");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setStatus(filter.status || ""); setOverdue(filter.overdue || ""); }, [filter]);
  useEffect(() => { setPage(0); }, [q, status, overdue]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (overdue) params.set("overdue", overdue);
    api("GET", `/orders?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, q, status, overdue, page, tick]);
  const onChanged = () => setTick((t) => t + 1);
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "flex-end" }}>
        <div style={{ width: 260 }}><Field label="Search"><input style={inp} placeholder="Order no., worker or item" value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <div style={{ width: 200 }}><Field label="Status"><select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{Object.entries(ORDER_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field></div>
        <div style={{ width: 170 }}><Field label="Overdue"><select style={inp} value={overdue} onChange={(e) => setOverdue(e.target.value)}><option value="">All</option><option value="true">Past return date</option></select></Field></div>
        <div style={{ marginLeft: "auto" }}><button style={btn("primary")} onClick={() => setCreating({ indent: null })}>+ New job work order</button></div>
      </div>
      <Table headers={["Order no.", "Date", "Job worker", "Items", "Input qty", "With worker", "Est. charges", "Return by", "Status", "Next step"]} minWidth={1150}>
        {data.content.length === 0 && <tr><Td>No orders match.</Td></tr>}
        {data.content.map((r) => (
          <tr key={r.id} style={{ background: r.overdue ? "#fef2f2" : "transparent" }}>
            <Td><button onClick={() => setDetailId(r.id)} style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0 }}>{r.jwoNumber}</button></Td>
            <Td>{dateText(r.jwoDate)}</Td><Td>{r.workerName}</Td><Td>{r.items}</Td><Td right>{qty(r.inputTotal)}</Td><Td right>{qty(r.pendingWithWorker)}</Td>
            <Td right>{money(r.estimatedCharges)}</Td><Td>{dateText(r.expectedReturnDate)}{r.overdue && <div style={{ fontSize: 10, color: "#991b1b", fontWeight: 700 }}>Overdue</div>}</Td>
            <Td><Badge map={ORDER_STYLE} value={r.status} /></Td><Td>{ORDER_NEXT_STEP[r.status] || "—"}</Td>
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
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>Challans are created from an order: open the order and choose Dispatch material.</div>
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
      flash(`Line ${line.lineNo} inspected: accepted stock released to store, rejects to Rejection Store.`);
      load(); onChanged();
    } catch (e) { flash(e.message, true); }
  };
  if (!d) return <Modal title="Receipt" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  return (
    <Modal title={`${d.receiptNumber} · ${d.jwoNumber}`} onClose={onClose} width={1000}>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={grid4}>
        <KV label="Receipt date" value={dateText(d.receiptDate)} />
        <KV label="Job worker" value={d.workerName} />
        <KV label="Delivery note" value={d.deliveryNoteNo} />
        <KV label="Challan" value={d.challanNumber} />
        <KV label="Received by" value={d.receivedBy} />
      </div>
      <h4 style={h4}>Inspection (Quality Hold → store / rejection store / rework)</h4>
      <Table headers={["Line", "Item", "Received", "Inspection", "Accepted", "Rejected", "Rework", "Scrap", "Defect / remarks", ""]} minWidth={1000}>
        {d.lines.map((l) => {
          const f = forms[l.receiptLineId] || {};
          const setF = (k, v) => setForms((x) => ({ ...x, [l.receiptLineId]: { ...(x[l.receiptLineId] || {}), [k]: v } }));
          const pending = l.inspectionStatus === "PENDING";
          return (
            <tr key={l.receiptLineId}>
              <Td>{l.lineNo}</Td><Td>{l.itemCode}</Td><Td right>{qty(l.qtyReceived)}</Td>
              <Td>{l.inspectionStatus === "INSPECTED" ? <span style={{ color: "#166534", fontWeight: 700 }}>Inspected</span> : <span style={{ color: "#854d0e", fontWeight: 700 }}>Pending</span>}</Td>
              {pending ? (
                <>
                  <Td><input type="number" min="0" step="0.01" style={{ ...inp, width: 80 }} value={f.acc || ""} onChange={(e) => setF("acc", e.target.value)} /></Td>
                  <Td><input type="number" min="0" step="0.01" style={{ ...inp, width: 80 }} value={f.rej || ""} onChange={(e) => setF("rej", e.target.value)} /></Td>
                  <Td><input type="number" min="0" step="0.01" style={{ ...inp, width: 80 }} value={f.rew || ""} onChange={(e) => setF("rew", e.target.value)} /></Td>
                  <Td><input type="number" min="0" step="0.01" style={{ ...inp, width: 80 }} value={f.scr || ""} onChange={(e) => setF("scr", e.target.value)} /></Td>
                  <Td><input style={{ ...inp, width: 150 }} placeholder="Defect code" value={f.defect || ""} onChange={(e) => setF("defect", e.target.value)} />
                    <input style={{ ...inp, width: 150, marginTop: 4 }} placeholder="Remarks" value={f.remarks || ""} onChange={(e) => setF("remarks", e.target.value)} /></Td>
                  <Td><button style={btn("primary")} onClick={() => inspect(l)}>Save</button></Td>
                </>
              ) : (
                <>
                  <Td right>{qty(l.acceptedQty)}</Td><Td right>{qty(l.rejectedQty)}</Td><Td right>{qty(l.reworkQty)}</Td><Td right>{qty(l.scrapQty)}</Td>
                  <Td>{l.defectCode || "—"} {l.inspectionRemarks ? `· ${l.inspectionRemarks}` : ""}<div style={{ fontSize: 10, color: "#64748b" }}>{l.inspectedBy || ""}</div></Td><Td>—</Td>
                </>
              )}
            </tr>
          );
        })}
      </Table>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Accepted + rejected + rework + scrap must equal the received quantity. A line can be inspected once.</div>
      <h4 style={h4}>History</h4>
      {(d.history || []).length === 0 ? <Empty text="No activity." /> : (
        <Table headers={["When", "Action", "By (role)", "Detail"]} minWidth={500}>
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
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setInspection(filter.inspection || ""); }, [filter]);
  useEffect(() => { setPage(0); }, [q, inspection]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (q) params.set("q", q);
    if (inspection) params.set("inspection", inspection);
    api("GET", `/receipts?${params}`, user).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [user, q, inspection, page, tick]);
  return (
    <div>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "flex-end" }}>
        <div style={{ width: 280 }}><Field label="Search"><input style={inp} placeholder="Receipt no., order or worker" value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <div style={{ width: 200 }}><Field label="Inspection"><select style={inp} value={inspection} onChange={(e) => setInspection(e.target.value)}><option value="">All</option><option value="PENDING">Awaiting inspection</option><option value="DONE">Inspected</option></select></Field></div>
      </div>
      <Table headers={["Receipt no.", "Date", "Order", "Job worker", "Qty received", "Awaiting inspection", "Received by"]} minWidth={860}>
        {data.content.length === 0 && <tr><Td>No receipts match.</Td></tr>}
        {data.content.map((r) => (
          <tr key={r.id}>
            <Td><button onClick={() => setDetailId(r.id)} style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0 }}>{r.receiptNumber}</button></Td>
            <Td>{dateText(r.receiptDate)}</Td><Td>{r.jwoNumber}</Td><Td>{r.workerName}</Td><Td right>{qty(r.receivedQty)}</Td>
            <Td>{num(r.pendingInspectionLines) > 0 ? <span style={{ color: "#854d0e", fontWeight: 700 }}>{r.pendingInspectionLines} line(s)</span> : <span style={{ color: "#166534" }}>Done</span>}</Td>
            <Td>{r.receivedBy}</Td>
          </tr>
        ))}
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
        <div style={{ width: 280 }}><Field label="Job worker"><select style={inp} value={workerId} onChange={(e) => setWorkerId(e.target.value)}><option value="">All job workers</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.legalName}</option>)}</select></Field></div>
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
          <select style={inp} value={lineId} onChange={(e) => setLineId(e.target.value)}>
            {order.lines.map((l) => <option key={l.jwoLineId} value={l.jwoLineId}>{l.lineNo} · {l.itemCode} ({l.category})</option>)}
          </select>
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
  if (!d) return <Modal title="Reconciliation" onClose={onClose}>{error ? <Banner kind="error">{error}</Banner> : <Empty text="Loading…" />}</Modal>;
  return (
    <Modal title={`Reconciliation — ${d.jwoNumber} · ${d.workerName}`} onClose={onClose} width={1200}
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
        <Field label="Operation" required><select style={inp} value={f.operationId} onChange={(e) => setF({ ...f, operationId: e.target.value })}><option value="">Select</option>{ops.map((o) => <option key={o.id} value={o.id}>{o.operationName}</option>)}</select></Field>
        <Field label="Category"><select style={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">All categories</option>{cats.map((c) => <option key={c.categoryName} value={c.categoryName}>{c.categoryName}</option>)}</select></Field>
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
          <div style={{ width: 220 }}><Field label="Job worker"><select style={inp} value={workerId} onChange={(e) => setWorkerId(e.target.value)}><option value="">All</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.legalName}</option>)}</select></Field></div>
          <div style={{ width: 240 }}><Field label={key === "order-history" ? "Order number (exact)" : "Search"} hint={key === "order-history" ? "e.g. JWO-2026-00001" : ""}><input style={inp} value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
          <button style={btn("primary")} onClick={run} disabled={loading}>{loading ? "Running…" : "Run report"}</button>
          <button style={btn()} onClick={exportExcel} disabled={!report}>Export Excel</button>
        </div>
        {!report && !error && <Empty text={`Choose a report and press Run. ${current ? current.hint : ""}`} />}
        {report && (report.rows.length === 0 ? <Empty text="No rows for these filters." /> : (
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#64748b", padding: "6px 8px" }}>{report.rows.length} row(s)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#f8fafc" }}>{report.columns.map((c) => <th key={c} style={{ textAlign: "left", padding: "7px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{c}</th>)}</tr></thead>
              <tbody>{report.rows.map((r, i) => <tr key={i}>{report.columns.map((c) => <Td key={c} right={typeof r[c] === "number"}>{typeof r[c] === "number" ? qty(r[c]) : typeof r[c] === "boolean" ? (r[c] ? "Yes" : "No") : (r[c] === null || r[c] === undefined || r[c] === "" ? "—" : String(r[c]))}</Td>)}</tr>)}</tbody>
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
      plainGet("/inventory/master"),
      api("GET", "/indents?size=200", user).then((d) => d.content).catch(() => [])
    ]);
    setRefs({ workers, locations, operations, categories, items: items.map((m) => ({ id: m.id, code: m.code, description: m.description, category: m.category, unitOfMeasurement: m.unitOfMeasurement })), indents });
  }, [user]);
  useEffect(() => { loadRefs(); }, [loadRefs]);

  const goTo = (key, f) => { setFilter(f || {}); setCurrent(key); };
  const openOrderFromIndent = (indent) => { setOrderFromIndent(indent); setOrderForm(true); };

  const tabBtn = (key, label) => (
    <button onClick={() => goTo(key, {})}
      style={{ background: current === key ? "#3b82f6" : "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
      {label}
    </button>
  );

  return (
    <div style={{ height: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#f1f5f9", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: toast.isError ? "#dc2626" : "#10b981", color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", maxWidth: 460 }}>{toast.message}</div>}

      <div style={{ flexShrink: 0, background: "#1e293b", borderBottom: "1px solid #334155", padding: "8px 18px 8px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
            <div style={{ background: "#b45309", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11 }}>JW</div>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Job Work</span>
          </div>
          {SCREENS.map((s) => <React.Fragment key={s.key}>{tabBtn(s.key, s.label)}</React.Fragment>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ color: "#94a3b8" }}>Acting as</span>
          <input style={{ ...inp, width: 150, padding: "4px 8px" }} value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
          <select style={{ ...inp, width: 130, padding: "4px 8px" }} value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          <button onClick={onOpenSidebar} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>{sidebarOpen ? "Hide menu" : "Menu"}</button>
          <span onClick={onBackToHome} style={{ cursor: "pointer", color: "#60a5fa", textDecoration: "underline", marginLeft: 6 }}>Home</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 18, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1440, width: "100%", margin: "0 auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", boxSizing: "border-box", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, overflowY: "auto" }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
            Purchase › Job Work › <b style={{ color: "#0f172a" }}>{SCREENS.find((s) => s.key === current)?.label}</b>
            <span style={{ marginLeft: 12 }}>Company stock moves through the Inventory engine; job worker balances are tracked in the worker ledger.</span>
          </div>
          {current === "dashboard" && <DashboardScreen user={user} goTo={goTo} flash={flash} />}
          {current === "workers" && <WorkersScreen user={user} flash={flash} />}
          {current === "indents" && <IndentsScreen user={user} filter={filter} locations={refs.locations} operations={refs.operations} categories={refs.categories} items={refs.items} flash={flash} onOpenOrder={openOrderFromIndent} />}
          {current === "orders" && <OrdersScreen user={user} filter={filter} workers={refs.workers} locations={refs.locations} operations={refs.operations} categories={refs.categories} items={refs.items} indents={refs.indents} flash={flash} />}
          {current === "challans" && <ChallansScreen user={user} flash={flash} refs={refs} />}
          {current === "receipts" && <ReceiptsScreen user={user} filter={filter} flash={flash} />}
          {current === "ledger" && <LedgerScreen user={user} workers={refs.workers} />}
          {current === "recon" && <ReconScreen user={user} flash={flash} />}
          {current === "reports" && <ReportsScreen user={user} flash={flash} />}
        </div>
      </div>

      {orderForm && <OrderForm user={user} workers={refs.workers} locations={refs.locations} operations={refs.operations} categories={refs.categories} items={refs.items} indents={refs.indents}
        fromIndent={orderFromIndent} onClose={() => { setOrderForm(false); setOrderFromIndent(null); }}
        onSaved={(d, msg) => { setOrderForm(false); setOrderFromIndent(null); flash(msg); setFilter({}); setCurrent("orders"); }} />}
    </div>
  );
}

export default JobWorkPage;
