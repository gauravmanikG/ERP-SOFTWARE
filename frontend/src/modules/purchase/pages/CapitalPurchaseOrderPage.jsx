import React, { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import DateInput from "../../../shared/components/DateInput";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";

// ============================================================================
// Capital Purchase Order (CAPEX). Uses capital_* tables and asset_master on the backend.
// Receiving, installation, commissioning and asset registration are separate steps.
// ============================================================================

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";
const CPO = `${API_ROOT}/capital-pos`;
const USER_KEY = "SMS_CURRENT_USER";
const ROLES = ["CREATOR", "APPROVER", "RECEIVER", "ASSET_MANAGER", "ADMIN"];
const CONDITIONS = ["GOOD", "DAMAGED", "PARTIAL"];
const INSPECTIONS = ["NOT_REQUIRED", "PENDING", "PASSED", "FAILED"];
const WARRANTY_START = ["DELIVERY", "INSTALLATION", "COMMISSIONING"];
const SCHEDULE_TYPES = ["DELIVERY", "INSTALLATION", "COMMISSIONING", "PAYMENT"];
const TRIGGERS = ["ADVANCE", "DELIVERY", "INSTALLATION", "COMMISSIONING", "FINAL"];
const DOC_TYPES = ["QUOTATION", "TECH_SPEC", "APPROVAL", "RECEIPT", "INSPECTION", "INSTALLATION_EVIDENCE", "COMMISSIONING_EVIDENCE", "OTHER"];

const STATUS_STYLE = {
  DRAFT: { bg: "#f1f5f9", fg: "#334155", label: "Draft" },
  PENDING_APPROVAL: { bg: "#fef3c7", fg: "#92400e", label: "Pending approval" },
  APPROVED: { bg: "#dbeafe", fg: "#1e40af", label: "Approved" },
  REJECTED: { bg: "#fee2e2", fg: "#991b1b", label: "Rejected" },
  SENT_TO_VENDOR: { bg: "#e0e7ff", fg: "#3730a3", label: "Sent to vendor" },
  CLOSED: { bg: "#e2e8f0", fg: "#0f172a", label: "Closed" },
  CANCELLED: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelled" }
};
const RECEIPT_STYLE = {
  NOT_RECEIVED: { bg: "#f1f5f9", fg: "#475569", label: "Not received" },
  PARTIALLY_RECEIVED: { bg: "#fef9c3", fg: "#854d0e", label: "Partially received" },
  FULLY_RECEIVED: { bg: "#dcfce7", fg: "#166534", label: "Fully received" }
};
const PROGRESS_STYLE = {
  NOT_REQUIRED: { bg: "#f1f5f9", fg: "#64748b", label: "Not required" },
  PENDING: { bg: "#fef3c7", fg: "#92400e", label: "Pending" },
  PARTIALLY_COMPLETED: { bg: "#fef9c3", fg: "#854d0e", label: "Partially completed" },
  COMPLETED: { bg: "#dcfce7", fg: "#166534", label: "Completed" }
};
const REG_STYLE = {
  NOT_REGISTERED: { bg: "#f1f5f9", fg: "#475569", label: "Not registered" },
  PARTIALLY_REGISTERED: { bg: "#fef9c3", fg: "#854d0e", label: "Partially registered" },
  REGISTERED: { bg: "#dcfce7", fg: "#166534", label: "Registered" }
};

const ACTION_LABEL = {
  EDIT: "Edit draft", SUBMIT: "Submit for approval", APPROVE: "Approve", REJECT: "Reject", ISSUE: "Send to vendor",
  CANCEL: "Cancel PO", CLOSE: "Close PO", EXTEND_VALIDITY: "Extend validity", PROPOSE_AMENDMENT: "Propose amendment",
  DECIDE_AMENDMENT: "Decide amendment", RECORD_RECEIPT: "Record receipt", RECORD_INSTALLATION: "Installation",
  RECORD_COMMISSIONING: "Commissioning", REGISTER_ASSET: "Register asset", MANAGE_SCHEDULE: "Schedule"
};
const REASON_REQUIRED = ["REJECT", "CANCEL", "CLOSE"];
const ACTION_PATH = { SUBMIT: "submit", APPROVE: "approve", REJECT: "reject", ISSUE: "issue", CANCEL: "cancel", CLOSE: "close", EXTEND_VALIDITY: "validity/extend" };

// ============================================================================
// Helpers
// ============================================================================

const TODAY = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dateText = (v) => (v ? formatDisplayDate(v) : "—");
const money = (v) => {
  if (v === null || v === undefined || v === "") return "0.00";
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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
  const res = await fetch(`${CPO}${path}`, {
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
  } catch (e) {
    return [];
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

async function openBlob(path, user, mime) {
  const res = await fetch(`${CPO}${path}`, { headers: { "X-User-Name": user.name, "X-User-Role": user.role } });
  if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
  return URL.createObjectURL(new Blob([await res.arrayBuffer()], { type: mime }));
}

const EMPTY_HEADER = {
  vendorCode: "", vendorSearch: "", departmentId: "", requester: "", companyGstin: "", companyStateCode: "",
  placeOfSupplyStateCode: "", plantLocation: "", deliveryAddress: "", prNumber: "", quotationReference: "",
  rfqReference: "", contractReference: "", currency: "INR", poDate: TODAY(), validityEnd: addDays(180),
  expectedDeliveryDate: addDays(60), paymentTerms: "", deliveryTerms: "", warrantyTerms: "", remarks: "",
  shippingInstallationCharges: "", freightOtherCharges: "", chargesSacCode: "", advancePercent: "", reason: ""
};
const EMPTY_LINE = {
  assetCategory: "", assetName: "", assetDescription: "", assetCodeRef: "", manufacturer: "", modelNumber: "",
  technicalSpecs: "", quantity: "1", uom: "NOS", unitPrice: "", discountType: "NONE", discountValue: "", hsnCode: "",
  expectedDeliveryDate: "", deliveryLocation: "", installationRequired: false, commissioningRequired: false,
  warrantyMonths: "0", warrantyStartCondition: "DELIVERY", amcRequired: false, usefulLifeYears: "", remarks: "",
  prItemId: "", responsibleTeam: ""
};
const EMPTY_SCHEDULE_ROW = { scheduleType: "DELIVERY", lineNo: "1", plannedDate: "", plannedQty: "", plannedAmount: "", triggerEvent: "ADVANCE", description: "", responsibleDepartment: "", responsibleContact: "" };

const HEADER_NUM = ["shippingInstallationCharges", "freightOtherCharges", "advancePercent"];
const LINE_NUM = ["quantity", "unitPrice", "discountValue", "warrantyMonths", "usefulLifeYears"];

function toPayload(h, lines, version) {
  const out = {};
  Object.entries(h).forEach(([k, v]) => {
    if (k === "vendorSearch") return;
    if (v === "" || v === null || v === undefined) out[k] = null;
    else if (k === "departmentId") out[k] = Number(v);
    else if (HEADER_NUM.includes(k)) out[k] = Number(v);
    else out[k] = v;
  });
  out.lines = lines.map((l, i) => {
    const o = { lineNo: i + 1 };
    Object.entries(l).forEach(([k, v]) => {
      if (v === "" || v === null || v === undefined) o[k] = null;
      else if (LINE_NUM.includes(k)) o[k] = Number(v);
      else if (k === "prItemId") o[k] = Number(v);
      else o[k] = v;
    });
    o.warrantyStartCondition = Number(l.warrantyMonths || 0) > 0 ? l.warrantyStartCondition : null;
    return o;
  });
  if (version !== undefined) out.version = version;
  return out;
}

function formFromDetail(d, departments) {
  const h = { ...EMPTY_HEADER };
  Object.keys(EMPTY_HEADER).forEach((k) => { if (d[k] !== undefined && d[k] !== null) h[k] = String(d[k]); });
  const dept = departments.find((x) => (x.departmentName || x.name) === d.departmentName);
  h.departmentId = dept ? String(dept.id) : "";
  h.vendorSearch = d.vendorName || "";
  h.reason = "";
  const lines = (d.lines || []).map((l) => {
    const o = { ...EMPTY_LINE };
    Object.keys(EMPTY_LINE).forEach((k) => { if (l[k] !== undefined && l[k] !== null) o[k] = typeof EMPTY_LINE[k] === "boolean" ? !!l[k] : String(l[k]); });
    o.lineNo = l.lineNo;
    return o;
  });
  return { header: h, lines, lineNos: (d.lines || []).map((l) => l.lineNo) };
}

function clientValidate(h, lines) {
  if (!h.vendorCode) return "Select a vendor from the Vendor Master.";
  if (!h.departmentId) return "Select the requesting department.";
  if (!/^\d{2}$/.test(h.companyStateCode || "")) return "Company state code must be a 2-digit GST state code (e.g. 06).";
  if (!h.plantLocation.trim()) return "Plant / location is required.";
  if (!h.validityEnd) return "PO validity date is required.";
  if (lines.length === 0) return "Add at least one asset line.";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const n = i + 1;
    if (!l.assetCategory) return `Line ${n}: select an asset category.`;
    if (!l.assetName.trim()) return `Line ${n}: asset name is required.`;
    if (!l.assetDescription.trim()) return `Line ${n}: detailed description is required.`;
    if (!(Number(l.quantity) > 0)) return `Line ${n}: quantity must be greater than zero.`;
    if (!l.uom.trim()) return `Line ${n}: unit of measurement is required.`;
    if (l.unitPrice === "") return `Line ${n}: enter the unit price.`;
    if (!l.hsnCode) return `Line ${n}: select the HSN code.`;
  }
  if ((Number(h.shippingInstallationCharges || 0) + Number(h.freightOtherCharges || 0)) > 0 && !h.chargesSacCode) {
    return "Select the SAC code for freight / installation charges so the correct GST applies.";
  }
  return "";
}

// ============================================================================
// Small UI
// ============================================================================

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

function Section({ title, subtitle, children, right }) {
  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", marginBottom: 14 }}>
      <header style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#f8fafc", borderRadius: "10px 10px 0 0" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#64748b" }}>{subtitle}</div>}
        </div>
        {right}
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
// Create / edit / amend form
// ============================================================================

function CreateForm({ user, refs, editing, amendMode, onSaved, onCancel, flash }) {
  const init = editing ? formFromDetail(editing, refs.departments) : { header: { ...EMPTY_HEADER }, lines: [{ ...EMPTY_LINE }], lineNos: [] };
  const [h, setH] = useState(init.header);
  const [lines, setLines] = useState(init.lines);
  const [schedOn, setSchedOn] = useState(!!(editing && editing.scheduleEnabled));
  const [schedRows, setSchedRows] = useState([{ ...EMPTY_SCHEDULE_ROW }]);
  const [schedTouched, setSchedTouched] = useState(false);
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState("QUOTATION");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const setHeader = (k) => (e) => setH((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  const setLine = (i, k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  };
  const toggleLine = (i, k) => (e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: e.target.checked } : l)));

  const vendor = refs.vendors.find((v) => v.supplierCode === h.vendorCode);
  const vendorOptions = refs.vendors.map((v) => ({ value: v.supplierCode, label: `${v.supplierName} (${v.supplierCode})` }));
  const eligible = refs.eligiblePrs.find((p) => p.prNumber === h.prNumber);
  const prItemOptions = eligible ? eligible.items.map((it) => ({ value: String(it.id), label: `${it.itemName || it.itemCode} — available ${it.availableQty} ${it.uom}` })) : [];
  const amountOnly = false;
  const canPreview = h.vendorCode && h.departmentId && /^\d{2}$/.test(h.companyStateCode || "") && lines.length && lines.every((l) => l.hsnCode && l.assetCategory && Number(l.quantity) > 0 && l.unitPrice !== "");

  // Totals come from the server: the form asks for a preview whenever the inputs change.
  useEffect(() => {
    if (!canPreview) { setPreview(null); return undefined; }
    const t = setTimeout(async () => {
      try {
        const body = toPayload(h, lines);
        const res = await fetch(`${CPO}/preview`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Name": user.name, "X-User-Role": user.role }, body: JSON.stringify(body) });
        if (res.ok) setPreview(await res.json()); else setPreview(null);
      } catch (e) { setPreview(null); }
    }, 500);
    return () => clearTimeout(t);
  }, [h, lines, user, canPreview]);

  const save = async (submit) => {
    setError("");
    if (amendMode && !h.reason.trim()) { setError("Enter the reason for this amendment."); return; }
    const problem = clientValidate(h, lines);
    if (problem) { setError(problem); return; }
    if (!editing && h.prNumber === "" && !refs.policy.allowDirectCreation) { setError("Direct Capital PO creation is not permitted; link an approved Capital PR."); return; }
    setSaving(true);
    try {
      let d;
      if (amendMode) {
        d = await api("POST", `/${editing.id}/amendments`, user, toPayload(h, lines));
      } else if (editing) {
        d = await api("PUT", `/${editing.id}`, user, toPayload(h, lines, editing.version));
      } else {
        // Duplicate-submission guard: one key per form instance, reused by the server if the request is retried.
        d = await api("POST", "", user, { ...toPayload(h, lines), clientRequestId: `cpo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      }
      if (!amendMode && schedTouched) {
        d = await api("PUT", `/${d.id}/schedule`, user, {
          enabled: schedOn,
          rows: schedOn ? schedRows.map((r) => ({
            scheduleType: r.scheduleType,
            lineNo: r.scheduleType === "PAYMENT" ? null : Number(r.lineNo),
            plannedDate: r.plannedDate || null,
            plannedQty: r.plannedQty === "" ? null : Number(r.plannedQty),
            plannedAmount: r.plannedAmount === "" ? null : Number(r.plannedAmount),
            triggerEvent: r.scheduleType === "PAYMENT" ? r.triggerEvent : null,
            description: r.description || null,
            responsibleDepartment: r.responsibleDepartment || null,
            responsibleContact: r.responsibleContact || null
          })) : []
        });
      }
      for (const f of files) {
        d = await api("POST", `/${d.id}/attachments`, user, { docType, fileName: f.name, contentType: f.type || "application/octet-stream", contentBase64: await fileToBase64(f) });
      }
      if (submit && !amendMode && d.status === "DRAFT") {
        d = await api("POST", `/${d.id}/submit`, user, { comments: "Submitted from Capital PO form" });
        onSaved(d, `${d.poNumber} submitted for approval.`);
      } else {
        onSaved(d, amendMode ? `Amendment ${d.poNumber} proposed for approval. Approved values are unchanged until it is approved.` : editing ? `${d.poNumber} draft updated.` : `${d.poNumber} draft created.`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => setLines((ls) => [...ls, { ...EMPTY_LINE }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, j) => j !== i));

  return (
    <div>
      {amendMode && <Banner kind="warn">Proposing an amendment to <b>{editing.poNumber}</b>. Approved values stay as they are until an approver accepts this revision.</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      <Section title="1. PO header" subtitle="Vendor and tax details come from the Vendor Master; the server re-reads them on save.">
        <Field label="Capital PO number" hint="Generated by the server on save">
          <input style={{ ...inp, background: "#f8fafc", color: "#64748b" }} disabled value={editing ? editing.poNumber : "Auto-generated"} />
        </Field>
        <Field label="PO date"><DateInput value={h.poDate} onChange={setHeader("poDate")} max={TODAY()} style={inp} /></Field>
        <Field label="Vendor / supplier" required span={2}>
          <select style={inp} value={h.vendorCode} onChange={(e) => setH((x) => ({ ...x, vendorCode: e.target.value }))}>
            <option value="">Select vendor</option>
            {vendorOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Vendor GSTIN"><input style={{ ...inp, background: "#f8fafc" }} disabled value={vendor ? vendor.gstin || "" : ""} /></Field>
        <Field label="Vendor state"><input style={{ ...inp, background: "#f8fafc" }} disabled value={vendor ? `${vendor.state || ""} ${vendor.stateCode ? `(${vendor.stateCode})` : ""}` : ""} /></Field>
        <Field label="Company GSTIN"><input style={inp} value={h.companyGstin} onChange={setHeader("companyGstin")} /></Field>
        <Field label="Company state code" required hint="2 digits, e.g. 06"><input style={inp} maxLength={2} value={h.companyStateCode} onChange={setHeader("companyStateCode")} /></Field>
        <Field label="Place of supply state code" hint="Blank = company state"><input style={inp} maxLength={2} value={h.placeOfSupplyStateCode} onChange={setHeader("placeOfSupplyStateCode")} /></Field>
        <Field label="Department" required>
          <select style={inp} value={h.departmentId} onChange={setHeader("departmentId")}>
            <option value="">Select department</option>
            {refs.departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName || d.name}</option>)}
          </select>
        </Field>
        <Field label="Requester" hint="Defaults to the signed-in user"><input style={inp} value={h.requester} placeholder={user.name} onChange={setHeader("requester")} /></Field>
        <Field label="Plant / location" required><input style={inp} value={h.plantLocation} onChange={setHeader("plantLocation")} /></Field>
        <Field label="Delivery address" span={2}><input style={inp} value={h.deliveryAddress} onChange={setHeader("deliveryAddress")} /></Field>
        <Field label="Related Capital PR" hint={refs.policy.allowDirectCreation ? "Optional: leave blank for direct creation (permitted by policy)" : "Required by company policy"}>
          <select style={inp} value={h.prNumber} onChange={(e) => setH((x) => ({ ...x, prNumber: e.target.value }))}>
            <option value="">No PR (direct)</option>
            {refs.eligiblePrs.map((p) => <option key={p.prNumber} value={p.prNumber}>{p.prNumber} · {p.department}</option>)}
          </select>
        </Field>
        <Field label="Quotation / RFQ reference"><input style={inp} value={h.quotationReference} onChange={setHeader("quotationReference")} /></Field>
        <Field label="Contract / agreement reference"><input style={inp} value={h.contractReference} onChange={setHeader("contractReference")} /></Field>
        <Field label="Currency"><input style={inp} value={h.currency} onChange={setHeader("currency")} /></Field>
        <Field label="PO validity date" required><DateInput value={h.validityEnd} onChange={setHeader("validityEnd")} style={inp} /></Field>
        <Field label="Expected delivery date"><DateInput value={h.expectedDeliveryDate} onChange={setHeader("expectedDeliveryDate")} style={inp} /></Field>
        <Field label="Payment terms" span={2}><input style={inp} value={h.paymentTerms} onChange={setHeader("paymentTerms")} placeholder="e.g. 30% advance, 60% on delivery, 10% on commissioning" /></Field>
        <Field label="Delivery terms"><input style={inp} value={h.deliveryTerms} onChange={setHeader("deliveryTerms")} placeholder="e.g. Ex-works / FOR destination" /></Field>
        <Field label="Warranty terms" span={2}><input style={inp} value={h.warrantyTerms} onChange={setHeader("warrantyTerms")} /></Field>
        <Field label="Advance payment %" hint="Shown in totals"><input type="number" min="0" max="100" step="0.01" style={inp} value={h.advancePercent} onChange={setHeader("advancePercent")} /></Field>
        <Field label="Remarks" span={3}><textarea style={{ ...inp, minHeight: 50 }} value={h.remarks} onChange={setHeader("remarks")} /></Field>
      </Section>

      <Section title="2. Asset lines" subtitle="Free-text asset names and descriptions. Linking an existing item is optional."
        right={<button style={btn()} onClick={addLine}>+ Add asset line</button>}>
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 12 }}>
          {lines.map((l, i) => {
            const lineGross = Number(l.quantity || 0) * Number(l.unitPrice || 0);
            return (
              <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#fcfdfe" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Line {i + 1} {lineGross > 0 && <span style={{ color: "#64748b", fontWeight: 500 }}>· gross {money(lineGross)}</span>}</div>
                  {lines.length > 1 && <button style={btn()} onClick={() => removeLine(i)}>Remove</button>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <Field label="Asset category" required>
                    <select style={inp} value={l.assetCategory} onChange={setLine(i, "assetCategory")}>
                      <option value="">Select category</option>
                      {refs.categories.map((c) => <option key={c.name} value={c.name}>{c.name}{c.treatment === "INVENTORY" ? " (inventory)" : ""}</option>)}
                    </select>
                  </Field>
                  <Field label="Asset name / title" required><input style={inp} value={l.assetName} onChange={setLine(i, "assetName")} /></Field>
                  <Field label="HSN code" required hint="Goods HSN from Tax Master">
                    <select style={inp} value={l.hsnCode} onChange={setLine(i, "hsnCode")}>
                      <option value="">Select HSN</option>
                      {refs.hsnGoods.map((x) => <option key={x.code} value={x.code}>{x.code} — {x.description} ({Number(x.gstRate).toFixed(0)}%)</option>)}
                    </select>
                  </Field>
                  <Field label="Detailed description" required span={2}><textarea style={{ ...inp, minHeight: 50 }} value={l.assetDescription} onChange={setLine(i, "assetDescription")} /></Field>
                  <Field label="Technical specifications" span={1}><textarea style={{ ...inp, minHeight: 50 }} value={l.technicalSpecs} onChange={setLine(i, "technicalSpecs")} /></Field>
                  <Field label="Manufacturer / brand"><input style={inp} value={l.manufacturer} onChange={setLine(i, "manufacturer")} /></Field>
                  <Field label="Model number"><input style={inp} value={l.modelNumber} onChange={setLine(i, "modelNumber")} /></Field>
                  <Field label="Asset code / reference" hint="Optional: if already in the Asset Master"><input style={inp} value={l.assetCodeRef} onChange={setLine(i, "assetCodeRef")} /></Field>
                  <Field label="Quantity" required><input type="number" min="0" step="0.001" style={inp} value={l.quantity} onChange={setLine(i, "quantity")} /></Field>
                  <Field label="Unit of measure" required><input style={inp} value={l.uom} onChange={setLine(i, "uom")} /></Field>
                  <Field label="Unit price" required><input type="number" min="0" step="0.01" style={inp} value={l.unitPrice} onChange={setLine(i, "unitPrice")} /></Field>
                  <Field label="Discount type">
                    <select style={inp} value={l.discountType} onChange={setLine(i, "discountType")}>
                      <option value="NONE">None</option><option value="PERCENT">Percent</option><option value="AMOUNT">Amount</option>
                    </select>
                  </Field>
                  <Field label="Discount value"><input type="number" min="0" step="0.01" style={inp} value={l.discountValue} onChange={setLine(i, "discountValue")} /></Field>
                  <Field label="Expected delivery date"><DateInput value={l.expectedDeliveryDate} onChange={setLine(i, "expectedDeliveryDate")} style={inp} /></Field>
                  <Field label="Delivery location / plant"><input style={inp} value={l.deliveryLocation} onChange={setLine(i, "deliveryLocation")} /></Field>
                  <Field label="Installation required">
                    <label style={{ fontSize: 13, display: "flex", gap: 6 }}><input type="checkbox" checked={l.installationRequired} onChange={toggleLine(i, "installationRequired")} /> Yes</label>
                  </Field>
                  <Field label="Commissioning required">
                    <label style={{ fontSize: 13, display: "flex", gap: 6 }}><input type="checkbox" checked={l.commissioningRequired} onChange={toggleLine(i, "commissioningRequired")} /> Yes</label>
                  </Field>
                  <Field label="Warranty (months)"><input type="number" min="0" max="240" style={inp} value={l.warrantyMonths} onChange={setLine(i, "warrantyMonths")} /></Field>
                  {Number(l.warrantyMonths || 0) > 0 && (
                    <Field label="Warranty starts on">
                      <select style={inp} value={l.warrantyStartCondition} onChange={setLine(i, "warrantyStartCondition")}>
                        {WARRANTY_START.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </Field>
                  )}
                  <Field label="AMC / service contract required">
                    <label style={{ fontSize: 13, display: "flex", gap: 6 }}><input type="checkbox" checked={l.amcRequired} onChange={toggleLine(i, "amcRequired")} /> Yes</label>
                  </Field>
                  <Field label="Useful life (years)"><input type="number" min="0" style={inp} value={l.usefulLifeYears} onChange={setLine(i, "usefulLifeYears")} /></Field>
                  <Field label="Linked PR item" hint={h.prNumber ? "From the selected PR" : "Select a PR in the header first"}>
                    <select style={inp} value={l.prItemId} onChange={setLine(i, "prItemId")} disabled={!h.prNumber}>
                      <option value="">Not linked</option>
                      {prItemOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Responsible team"><input style={inp} value={l.responsibleTeam} onChange={setLine(i, "responsibleTeam")} /></Field>
                  <Field label="Line remarks" span={2}><input style={inp} value={l.remarks} onChange={setLine(i, "remarks")} /></Field>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="3. Charges, tax and totals" subtitle="Taxed under the SAC selected here. Totals are calculated and checked by the server.">
        <Field label="Shipping / installation charges"><input type="number" min="0" step="0.01" style={inp} value={h.shippingInstallationCharges} onChange={setHeader("shippingInstallationCharges")} /></Field>
        <Field label="Freight and other charges"><input type="number" min="0" step="0.01" style={inp} value={h.freightOtherCharges} onChange={setHeader("freightOtherCharges")} /></Field>
        <Field label="SAC for charges" hint="Required when charges are entered">
          <select style={inp} value={h.chargesSacCode} onChange={setHeader("chargesSacCode")}>
            <option value="">Select SAC</option>
            {refs.sacCodes.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.description} ({Number(s.gstRate).toFixed(0)}%)</option>)}
          </select>
        </Field>
        <Field label="Totals (server)" span={3}><TotalsPanel preview={preview} canPreview={canPreview} /></Field>
      </Section>

      <Section title="4. Delivery, installation and payment schedule"
        subtitle="Optional. Entries are plans only: they never create extra POs, assets or payments."
        right={
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
            <input type="checkbox" checked={schedOn} onChange={(e) => { setSchedOn(e.target.checked); setSchedTouched(true); }} />
            Enable scheduling
          </label>
        }>
        {!schedOn && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#64748b" }}>Scheduling is off. The expected delivery date on the header and lines is used.</div>}
        {schedOn && (
          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
            {schedRows.map((r, i) => {
              const set = (k) => (e) => { setSchedTouched(true); setSchedRows((rs) => rs.map((x, j) => (j === i ? { ...x, [k]: e && e.target ? e.target.value : e } : x))); };
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 0.7fr 1fr 0.9fr 1fr 1fr auto", gap: 6, alignItems: "end" }}>
                  <select style={inp} value={r.scheduleType} onChange={set("scheduleType")}>{SCHEDULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  {r.scheduleType === "PAYMENT"
                    ? <select style={inp} value={r.triggerEvent} onChange={set("triggerEvent")}>{TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                    : <select style={inp} value={r.lineNo} onChange={set("lineNo")}>{lines.map((_, j) => <option key={j} value={j + 1}>Line {j + 1}</option>)}</select>}
                  <DateInput value={r.plannedDate} onChange={set("plannedDate")} style={inp} />
                  {r.scheduleType === "DELIVERY"
                    ? <input type="number" min="0" step="0.001" style={inp} placeholder="Planned qty" value={r.plannedQty} onChange={set("plannedQty")} />
                    : <input style={{ ...inp, background: "#f8fafc" }} disabled placeholder="Qty n/a" />}
                  <input type="number" min="0" step="0.01" style={inp} placeholder={r.scheduleType === "PAYMENT" ? "Amount" : "Amount (optional)"} value={r.plannedAmount} onChange={set("plannedAmount")} />
                  <input style={inp} placeholder="Responsible dept / contact" value={r.responsibleDepartment} onChange={set("responsibleDepartment")} />
                  <button style={btn()} onClick={() => { setSchedTouched(true); setSchedRows((rs) => rs.filter((_, j) => j !== i)); }} disabled={schedRows.length === 1}>✕</button>
                </div>
              );
            })}
            <div><button style={btn()} onClick={() => { setSchedTouched(true); setSchedRows((rs) => [...rs, { ...EMPTY_SCHEDULE_ROW }]); }}>+ Add schedule entry</button></div>
          </div>
        )}
      </Section>

      <Section title="5. Attachments" subtitle="Quotations, technical specifications and approvals. PDF, PNG, JPEG, XLSX or DOCX, up to 5 MB each.">
        <Field label="Document type">
          <select style={inp} value={docType} onChange={(e) => setDocType(e.target.value)}>{DOC_TYPES.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}</select>
        </Field>
        <Field label="Files" span={2}>
          <div>
            <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" style={{ display: "none" }} onChange={(e) => setFiles((fs) => [...fs, ...Array.from(e.target.files || [])])} />
            <button style={btn()} onClick={() => fileRef.current && fileRef.current.click()}>Choose files</button>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {files.map((f, i) => <span key={i} style={{ fontSize: 12, background: "#f1f5f9", borderRadius: 6, padding: "3px 8px" }}>{f.name}</span>)}
            </div>
          </div>
        </Field>
        {amendMode && (
          <Field label="Reason for amendment" required span={3}><textarea style={{ ...inp, minHeight: 56 }} value={h.reason} onChange={setHeader("reason")} /></Field>
        )}
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", paddingBottom: 24 }}>
        <button style={btn()} onClick={onCancel} disabled={saving}>Cancel</button>
        {!amendMode && <button style={btn()} onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>}
        {!amendMode && <button style={btn("primary")} onClick={() => save(true)} disabled={saving}>Save and submit for approval</button>}
        {amendMode && <button style={btn("primary")} onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Propose amendment"}</button>}
      </div>
    </div>
  );
}

function TotalsPanel({ preview, canPreview }) {
  if (!canPreview) return <div style={{ fontSize: 12, color: "#64748b" }}>Enter vendor, department, state, and each line's category, HSN, quantity and unit price to see totals.</div>;
  if (!preview) return <div style={{ fontSize: 12, color: "#64748b" }}>Calculating…</div>;
  const rows = [
    ["Lines gross", money(preview.linesGross)],
    ["Line discounts", money(preview.linesDiscount)],
    ["Taxable (lines)", money(preview.linesTaxable)],
    ["Taxable (charges)", money(preview.chargesTaxable)],
    ["Taxable total", money(preview.taxableTotal)],
    [preview.supplyType === "INTRA" ? "CGST + SGST" : "IGST", preview.supplyType === "INTRA" ? `${money(preview.cgstTotal)} + ${money(preview.sgstTotal)}` : money(preview.igstTotal)],
    ["Total GST", money(preview.taxTotal)],
    ["Grand total (payable)", money(preview.grandTotal)],
    ["Advance", money(preview.advanceAmount)]
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: k.startsWith("Grand") ? 800 : 500 }}>
          <span style={{ color: "#475569" }}>{k}</span><span>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Action dialogs: reasons, validity, receipt, inspection, installation/commissioning, registration, amendment decision
// ============================================================================

function ActionDialog({ state, user, onClose, onDone }) {
  const { action, po, receiptId, lineNo, kind, amendmentId } = state;
  const [detail, setDetail] = useState(null);
  const [comments, setComments] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [rcpt, setRcpt] = useState({ idempotencyKey: `rc-${Date.now()}`, receiptDate: TODAY(), deliveryChallanNo: "", invoiceReference: "", receivedCondition: "GOOD", inspectionStatus: "NOT_REQUIRED", remarks: "", qty: {} , serial: {} });
  const [ev, setEv] = useState({ status: "COMPLETED", eventDate: TODAY(), remarks: "", responsibleTeam: "" });
  const [reg, setReg] = useState({ receiptLineId: "", serialNumbers: "" });
  const [insp, setInsp] = useState({ inspectionStatus: "PASSED", remarks: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("GET", `/${po.id}`, user).then(setDetail).catch((e) => setError(e.message));
  }, [po.id, user]);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      let res;
      const linePath = action === "RECORD_INSTALLATION" ? "installation" : "commissioning";
      if (action === "RECORD_RECEIPT") {
        const lines = (detail.lines || []).map((l) => ({ l, q: rcpt.qty[l.lineNo] })).filter((x) => x.q && Number(x.q) > 0)
          .map((x) => ({ lineNo: x.l.lineNo, qtyReceived: Number(x.q), serialNumbers: rcpt.serial[x.l.lineNo] || null }));
        if (!rcpt.deliveryChallanNo.trim()) throw new Error("Enter the delivery challan number.");
        if (lines.length === 0) throw new Error("Enter the quantity received for at least one line.");
        res = await api("POST", `/${po.id}/receipts`, user, {
          idempotencyKey: rcpt.idempotencyKey, receiptDate: rcpt.receiptDate, deliveryChallanNo: rcpt.deliveryChallanNo,
          invoiceReference: rcpt.invoiceReference || null, receivedCondition: rcpt.receivedCondition,
          inspectionStatus: rcpt.inspectionStatus, remarks: rcpt.remarks || null, lines
        });
      } else if (action === "RECORD_INSPECTION") {
        res = await api("PUT", `/${po.id}/receipts/${receiptId}/inspection`, user, { inspectionStatus: insp.inspectionStatus, remarks: insp.remarks || null });
      } else if (action === "RECORD_INSTALLATION" || action === "RECORD_COMMISSIONING") {
        res = await api("PUT", `/${po.id}/lines/${lineNo}/${linePath}`, user, { status: ev.status, eventDate: ev.eventDate, remarks: ev.remarks || null, responsibleTeam: ev.responsibleTeam || null });
      } else if (action === "REGISTER_ASSET") {
        if (!reg.receiptLineId) throw new Error("Choose the received line to register.");
        res = await api("POST", `/${po.id}/assets/register`, user, { receiptLineId: Number(reg.receiptLineId), serialNumbers: reg.serialNumbers || null });
      } else if (action === "DECIDE_AMENDMENT") {
        res = await api("POST", `/${po.id}/amendments/${amendmentId}/decision`, user, { approve: true, comments: comments || null });
      } else if (action === "EXTEND_VALIDITY") {
        if (!newEnd) throw new Error("Choose the new validity date.");
        if (!comments.trim()) throw new Error("Enter the reason for extending validity.");
        res = await api("POST", `/${po.id}/validity/extend`, user, { comments, newValidityEnd: newEnd });
      } else {
        if (REASON_REQUIRED.includes(action) && !comments.trim()) throw new Error("A reason is required for this action.");
        res = await api("POST", `/${po.id}/${ACTION_PATH[action]}`, user, { comments: comments.trim() || null });
      }
      onDone(res, `${po.poNumber}: ${ACTION_LABEL[action] || action} saved.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const rejectAmendment = async () => {
    if (!comments.trim()) { setError("Enter the reason for rejecting the amendment."); return; }
    setBusy(true);
    try {
      const res = await api("POST", `/${po.id}/amendments/${amendmentId}/decision`, user, { approve: false, comments });
      onDone(res, `${po.poNumber}: amendment rejected.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const title = `${ACTION_LABEL[action] || action}${action === "RECORD_INSPECTION" ? " inspection" : ""} — ${po.poNumber}`;
  const receiptLines = detail ? detail.lines.filter((l) => Number(l.outstandingQty) > 0) : [];
  const receivedLines = detail ? (detail.receipts || []).flatMap((r) => (r.lines || []).map((x) => ({ ...x, receiptNumber: r.receiptNumber }))) : [];
  const danger = ["REJECT", "CANCEL"].includes(action);
  const confirmLabel = { RECORD_RECEIPT: "Record receipt", RECORD_INSPECTION: "Save inspection", RECORD_INSTALLATION: "Save installation", RECORD_COMMISSIONING: "Save commissioning", REGISTER_ASSET: "Register asset(s)", DECIDE_AMENDMENT: "Approve amendment", EXTEND_VALIDITY: "Extend validity", CANCEL: "Cancel PO", CLOSE: "Close PO", REJECT: "Reject", APPROVE: "Approve", ISSUE: "Send to vendor", SUBMIT: "Submit" }[action] || "Confirm";

  return (
    <Modal title={title} onClose={onClose} width={720} zIndex={1100}
      footer={<>
        <button style={btn()} onClick={onClose} disabled={busy}>Back</button>
        {action === "DECIDE_AMENDMENT" && <button style={btn("danger")} onClick={rejectAmendment} disabled={busy}>Reject amendment</button>}
        <button style={btn(danger ? "danger" : "primary")} onClick={submit} disabled={busy}>{busy ? "Working…" : confirmLabel}</button>
      </>}>
      {error && <Banner kind="error">{error}</Banner>}

      {action === "RECORD_RECEIPT" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Field label="Receipt date"><DateInput value={rcpt.receiptDate} onChange={(e) => setRcpt({ ...rcpt, receiptDate: e.target.value })} style={inp} /></Field>
          <Field label="Delivery challan no." required><input style={inp} value={rcpt.deliveryChallanNo} onChange={(e) => setRcpt({ ...rcpt, deliveryChallanNo: e.target.value })} /></Field>
          <Field label="Invoice / reference"><input style={inp} value={rcpt.invoiceReference} onChange={(e) => setRcpt({ ...rcpt, invoiceReference: e.target.value })} /></Field>
          <Field label="Received condition">
            <select style={inp} value={rcpt.receivedCondition} onChange={(e) => setRcpt({ ...rcpt, receivedCondition: e.target.value })}>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </Field>
          <Field label="Inspection">
            <select style={inp} value={rcpt.inspectionStatus} onChange={(e) => setRcpt({ ...rcpt, inspectionStatus: e.target.value })}>{INSPECTIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}</select>
          </Field>
          <Field label="Receiving remarks"><input style={inp} value={rcpt.remarks} onChange={(e) => setRcpt({ ...rcpt, remarks: e.target.value })} /></Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Table headers={["Line", "Asset", "Ordered", "Received", "Outstanding", "Receive now", "Serial numbers (one per unit)"]} minWidth={640}>
              {(detail ? detail.lines : []).map((l) => (
                <tr key={l.lineNo}>
                  <Td>{l.lineNo}</Td><Td>{l.assetName}</Td><Td right>{l.quantity}</Td><Td right>{l.receivedQty}</Td><Td right>{l.outstandingQty}</Td>
                  <Td><input type="number" min="0" step="0.001" max={l.outstandingQty} style={{ ...inp, width: 90 }} disabled={Number(l.outstandingQty) <= 0}
                    value={rcpt.qty[l.lineNo] || ""} onChange={(e) => setRcpt({ ...rcpt, qty: { ...rcpt.qty, [l.lineNo]: e.target.value } })} /></Td>
                  <Td><input style={{ ...inp, width: 200 }} placeholder="SN1, SN2" value={rcpt.serial[l.lineNo] || ""} onChange={(e) => setRcpt({ ...rcpt, serial: { ...rcpt.serial, [l.lineNo]: e.target.value } })} /></Td>
                </tr>
              ))}
            </Table>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Quantities above the outstanding amount are refused. Receipt does not change stock or the PO's approval status.</div>
          </div>
        </div>
      )}

      {action === "RECORD_INSPECTION" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Field label="Inspection result" required>
            <select style={inp} value={insp.inspectionStatus} onChange={(e) => setInsp({ ...insp, inspectionStatus: e.target.value })}>{INSPECTIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}</select>
          </Field>
          <Field label="Remarks" span={2}><input style={inp} value={insp.remarks} onChange={(e) => setInsp({ ...insp, remarks: e.target.value })} /></Field>
        </div>
      )}

      {(action === "RECORD_INSTALLATION" || action === "RECORD_COMMISSIONING") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#475569" }}>
            Line {lineNo}. Completion needs evidence uploaded on this PO as <b>{action === "RECORD_INSTALLATION" ? "INSTALLATION_EVIDENCE" : "COMMISSIONING_EVIDENCE"}</b> for this line. Receipt status is not affected.
          </div>
          <Field label="Status">
            <select style={inp} value={ev.status} onChange={(e) => setEv({ ...ev, status: e.target.value })}><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select>
          </Field>
          <Field label="Date"><DateInput value={ev.eventDate} onChange={(e) => setEv({ ...ev, eventDate: e.target.value })} style={inp} /></Field>
          <Field label="Responsible team"><input style={inp} value={ev.responsibleTeam} onChange={(e) => setEv({ ...ev, responsibleTeam: e.target.value })} /></Field>
          <Field label="Remarks" span={3}><input style={inp} value={ev.remarks} onChange={(e) => setEv({ ...ev, remarks: e.target.value })} /></Field>
        </div>
      )}

      {action === "REGISTER_ASSET" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Field label="Received line to register" required span={2}>
            <select style={inp} value={reg.receiptLineId} onChange={(e) => setReg({ ...reg, receiptLineId: e.target.value })}>
              <option value="">Select receipt line</option>
              {receivedLines.map((x) => <option key={x.receiptLineId} value={x.receiptLineId}>{x.receiptNumber} · line {x.lineNo} {x.assetName} · {x.qtyReceived} unit(s)</option>)}
            </select>
          </Field>
          <Field label="Serial numbers" hint="One per unit, comma separated (optional)" span={2}><input style={inp} value={reg.serialNumbers} onChange={(e) => setReg({ ...reg, serialNumbers: e.target.value })} /></Field>
          <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "#64748b" }}>
            Registration creates one Asset Master record per unit with a unique asset code. A receipt line can be registered only once. Blocked while inspection is pending or failed, or while required installation/commissioning is incomplete.
          </div>
        </div>
      )}

      {action === "DECIDE_AMENDMENT" && (
        <div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>Approving makes the proposed values the approved values of this PO. Rejecting keeps the current approved values.</div>
          <Field label="Comments"><textarea style={{ ...inp, minHeight: 60 }} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
        </div>
      )}

      {action === "EXTEND_VALIDITY" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#475569" }}>Current validity: <b>{dateText(po.validityEnd)}</b>. Only approvers can extend, and every extension is recorded.</div>
          <Field label="New validity date" required><DateInput value={newEnd} onChange={(e) => setNewEnd(e.target.value)} min={po.validityEnd} style={inp} /></Field>
          <Field label="Reason" required><textarea style={{ ...inp, minHeight: 60 }} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
        </div>
      )}

      {!["RECORD_RECEIPT", "RECORD_INSPECTION", "RECORD_INSTALLATION", "RECORD_COMMISSIONING", "REGISTER_ASSET", "DECIDE_AMENDMENT", "EXTEND_VALIDITY"].includes(action) && (
        <Field label={REASON_REQUIRED.includes(action) ? "Reason (required)" : "Comments (optional)"} required={REASON_REQUIRED.includes(action)}>
          <textarea style={{ ...inp, minHeight: 80 }} value={comments} onChange={(e) => setComments(e.target.value)} />
        </Field>
      )}
    </Modal>
  );
}

// ============================================================================
// Detail view
// ============================================================================

function DetailView({ id, user, onClose, onAction, onEdit, onAmend, onChanged, refreshToken, flash }) {
  const [d, setD] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("OTHER");
  const [lineForDoc, setLineForDoc] = useState("");
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try { setD(await api("GET", `/${id}`, user)); setLoadError(""); } catch (e) { setLoadError(e.message); }
  }, [id, user]);
  useEffect(() => { load(); }, [load, refreshToken]);

  const print = async () => {
    try { window.open(await openBlob(`/${id}/print`, user, "text/html"), "_blank"); } catch (e) { flash(e.message, true); }
  };
  const download = async (a) => {
    try {
      const res = await fetch(`${CPO}/${id}/attachments/${a.id}`, { headers: { "X-User-Name": user.name, "X-User-Role": user.role } });
      if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url; link.download = a.fileName; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { flash(e.message, true); }
  };
  const upload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await api("POST", `/${id}/attachments`, user, {
        docType, lineNo: lineForDoc ? Number(lineForDoc) : null, fileName: file.name,
        contentType: file.type || "application/octet-stream", contentBase64: await fileToBase64(file)
      });
      flash("Document uploaded.");
      await load();
      onChanged();
    } catch (err) { flash(err.message, true); } finally { setUploading(false); }
  };

  if (loadError) return <Modal title="Capital PO" onClose={onClose}><Banner kind="error">{loadError}</Banner></Modal>;
  if (!d) return <Modal title="Loading Capital PO…" onClose={onClose}><div style={{ fontSize: 13 }}>Loading…</div></Modal>;

  const actions = (d.allowedActions || []).filter((a) => !["ATTACH", "MANAGE_SCHEDULE", "EDIT", "PROPOSE_AMENDMENT", "REGISTER_ASSET", "RECORD_RECEIPT", "RECORD_INSTALLATION", "RECORD_COMMISSIONING", "DECIDE_AMENDMENT"].includes(a));
  const approvals = (d.history || []).filter((x) => ["SUBMITTED", "APPROVE", "REJECT", "SENT_TO_VENDOR", "CANCEL", "CLOSE", "AMENDMENT_PROPOSED", "AMENDMENT_APPROVED", "AMENDMENT_REJECTED", "VALIDITY_EXTENDED"].includes(x.action));
  const pendingAmendment = (d.amendments || []).find((a) => a.status === "PENDING");
  const requiringLines = (d.lines || []).filter((l) => l.installationRequired || l.commissioningRequired);

  return (
    <Modal title={`${d.poNumber} · ${d.vendorName}`} onClose={onClose} width={1040}
      footer={<>
        <button style={btn()} onClick={print}>Print / PDF</button>
        {(d.allowedActions || []).includes("EDIT") && <button style={btn()} onClick={() => onEdit(d)}>Edit draft</button>}
        {(d.allowedActions || []).includes("PROPOSE_AMENDMENT") && <button style={btn()} onClick={() => onAmend(d)}>Propose amendment</button>}
        {(d.allowedActions || []).includes("RECORD_RECEIPT") && <button style={btn("primary")} onClick={() => onAction(d, "RECORD_RECEIPT")}>Record receipt</button>}
        {(d.allowedActions || []).includes("REGISTER_ASSET") && <button style={btn("primary")} onClick={() => onAction(d, "REGISTER_ASSET")}>Register asset</button>}
        {pendingAmendment && (d.allowedActions || []).includes("DECIDE_AMENDMENT") && <button style={btn("primary")} onClick={() => onAction(d, "DECIDE_AMENDMENT", { amendmentId: pendingAmendment.id })}>Decide amendment</button>}
        {actions.map((a) => <button key={a} style={btn(["REJECT", "CANCEL"].includes(a) ? "danger" : "primary")} onClick={() => onAction(d, a)}>{ACTION_LABEL[a] || a}</button>)}
      </>}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <Badge map={STATUS_STYLE} value={d.status} />
        <Badge map={RECEIPT_STYLE} value={d.receiptStatus} />
        <span style={{ fontSize: 11, fontWeight: 700 }}>Install: <Badge map={PROGRESS_STYLE} value={d.installationStatus} /></span>
        <span style={{ fontSize: 11, fontWeight: 700 }}>Commission: <Badge map={PROGRESS_STYLE} value={d.commissioningStatus} /></span>
        <span style={{ fontSize: 11, fontWeight: 700 }}>Assets: <Badge map={REG_STYLE} value={d.assetRegistrationStatus} /></span>
        {d.validityExpired && <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", borderRadius: 999, padding: "2px 9px" }}>Validity expired: receipts blocked</span>}
        <span style={{ fontSize: 12, color: "#64748b" }}>Created by {d.createdBy} · version {d.version}</span>
      </div>

      <h4 style={h4}>Header</h4>
      <div style={grid4}>
        <KV label="PO date" value={dateText(d.poDate)} />
        <KV label="Validity" value={dateText(d.validityEnd)} />
        <KV label="Expected delivery" value={dateText(d.expectedDeliveryDate)} />
        <KV label="Vendor GSTIN / state" value={`${d.vendorGstin || "—"} · ${d.vendorStateCode || ""}`} />
        <KV label="Department" value={d.departmentName} />
        <KV label="Plant / location" value={d.plantLocation} />
        <KV label="PR reference" value={d.prNumber || "Direct PO"} />
        <KV label="Supply" value={`${d.supplyType} (${d.placeOfSupplyStateCode})`} />
        <KV label="Payment terms" value={d.paymentTerms} />
        <KV label="Delivery terms" value={d.deliveryTerms} />
        <KV label="Warranty terms" value={d.warrantyTerms} />
        <KV label="Remarks" value={d.remarks} />
      </div>

      <h4 style={h4}>Asset lines</h4>
      <Table headers={["#", "Category", "Asset / description", "Qty", "Unit price", "Discount", "Taxable", "GST", "Line total", "Received", "Install", "Commission", "Warranty"]} minWidth={1100}>
        {(d.lines || []).map((l) => (
          <tr key={l.id}>
            <Td>{l.lineNo}</Td><Td>{l.assetCategory}</Td>
            <Td><b>{l.assetName}</b><div style={{ color: "#64748b" }}>{l.assetDescription}</div>{l.manufacturer && <div style={{ fontSize: 11 }}>{l.manufacturer} {l.modelNumber || ""}</div>}</Td>
            <Td right>{l.quantity} {l.uom}</Td><Td right>{money(l.unitPrice)}</Td><Td right>{money(l.discountAmount)}</Td>
            <Td right>{money(l.taxableValue)}</Td><Td right>{money(l.gstAmount)} <div style={{ fontSize: 10, color: "#64748b" }}>{l.gstRate}%</div></Td>
            <Td right>{money(l.lineTotal)}</Td>
            <Td right>{l.receivedQty} / {l.quantity}</Td>
            <Td><Badge map={PROGRESS_STYLE} value={l.installationStatus} /></Td>
            <Td><Badge map={PROGRESS_STYLE} value={l.commissioningStatus} /></Td>
            <Td>{l.warrantyMonths ? `${l.warrantyMonths} mo from ${String(l.warrantyStartCondition || "").toLowerCase()}` : "—"}</Td>
          </tr>
        ))}
      </Table>
      <div style={{ ...grid4, marginTop: 10 }}>
        <KV label="Taxable total" value={money(d.taxableTotal)} />
        <KV label="CGST / SGST / IGST" value={`${money(d.cgstTotal)} / ${money(d.sgstTotal)} / ${money(d.igstTotal)}`} />
        <KV label="Charges (taxable / GST)" value={`${money(d.chargesTaxable)} / ${money(d.chargesGstAmount)}`} />
        <KV label="Grand total" value={<b>{money(d.grandTotal)} {d.currency}</b>} />
        <KV label="Advance" value={`${money(d.advanceAmount)} (${d.advancePercent}%)`} />
        <KV label="Received / outstanding qty" value={`${d.totals ? d.totals.receivedQty : "—"} / ${d.totals ? d.totals.outstandingQty : "—"}`} />
      </div>

      <h4 style={h4}>Schedule {d.scheduleEnabled ? "" : "(off: header and line dates are used)"}</h4>
      {(d.schedules || []).length === 0 ? <Empty text="No schedule entries." /> : (
        <Table headers={["Type", "Line", "Date", "Planned qty", "Planned amount", "Trigger", "Responsible"]} minWidth={700}>
          {d.schedules.map((s) => (
            <tr key={s.id}>
              <Td>{s.scheduleType}</Td><Td>{s.lineId ? (d.lines.find((l) => l.id === s.lineId) || {}).lineNo : "PO"}</Td><Td>{dateText(s.plannedDate)}</Td>
              <Td right>{s.plannedQty ?? "—"}</Td><Td right>{money(s.plannedAmount)}</Td><Td>{s.triggerEvent || "—"}</Td>
              <Td>{[s.responsibleDepartment, s.responsibleContact].filter(Boolean).join(" · ") || "—"}</Td>
            </tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Receipts (physical, against this PO)</h4>
      {(d.receipts || []).length === 0 ? <Empty text="Nothing received yet." /> : (
        <Table headers={["Receipt", "Date", "Challan / invoice", "Condition", "Inspection", "Lines", "Received by"]} minWidth={760}>
          {d.receipts.map((r) => (
            <tr key={r.id}>
              <Td>{r.receiptNumber}</Td><Td>{dateText(r.receiptDate)}</Td><Td>{r.deliveryChallanNo}{r.invoiceReference ? ` / ${r.invoiceReference}` : ""}</Td>
              <Td>{r.receivedCondition}</Td>
              <Td>{r.inspectionStatus}</Td>
              <Td>{(r.lines || []).map((x) => `L${x.lineNo}: ${x.qtyReceived}${x.serialNumbers ? ` [${x.serialNumbers}]` : ""}`).join("; ")}</Td>
              <Td>{r.receivedBy}</Td>
            </tr>
          ))}
        </Table>
      )}
      {(d.receipts || []).length > 0 && ["RECEIVER", "ASSET_MANAGER", "ADMIN"].includes(user.role) && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(d.receipts || []).map((r) => (
            <button key={r.id} style={btn()} onClick={() => onAction(d, "RECORD_INSPECTION", { receiptId: r.id })}>Inspection: {r.receiptNumber}</button>
          ))}
        </div>
      )}

      <h4 style={h4}>Installation and commissioning (tracked separately from receipt)</h4>
      {requiringLines.length === 0 ? <Empty text="No line requires installation or commissioning." /> : (
        <Table headers={["Line", "Asset", "Installation", "Install date", "Commissioning", "Commission date", "Team", "Actions"]} minWidth={860}>
          {requiringLines.map((l) => (
            <tr key={l.id}>
              <Td>{l.lineNo}</Td><Td>{l.assetName}</Td>
              <Td>{l.installationRequired ? <Badge map={PROGRESS_STYLE} value={l.installationStatus} /> : "Not required"}</Td>
              <Td>{dateText(l.installationDate)}</Td>
              <Td>{l.commissioningRequired ? <Badge map={PROGRESS_STYLE} value={l.commissioningStatus} /> : "Not required"}</Td>
              <Td>{dateText(l.commissioningDate)}</Td>
              <Td>{l.responsibleTeam || "—"}</Td>
              <Td>
                {l.installationRequired && l.installationStatus !== "COMPLETED" && (d.allowedActions || []).includes("RECORD_INSTALLATION") && <button style={{ ...btn(), padding: "3px 8px" }} onClick={() => onAction(d, "RECORD_INSTALLATION", { lineNo: l.lineNo })}>Installation</button>}
                {l.commissioningRequired && l.commissioningStatus !== "COMPLETED" && (d.allowedActions || []).includes("RECORD_COMMISSIONING") && <button style={{ ...btn(), padding: "3px 8px", marginLeft: 4 }} onClick={() => onAction(d, "RECORD_COMMISSIONING", { lineNo: l.lineNo })}>Commissioning</button>}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Asset register (Asset Master records created by controlled registration)</h4>
      {(d.assets || []).length === 0 ? <Empty text="No assets registered yet." /> : (
        <Table headers={["Asset code", "Name", "Serial", "Unit", "Capitalised", "Warranty", "Status"]} minWidth={700}>
          {d.assets.map((a) => (
            <tr key={a.id}><Td>{a.assetCode}</Td><Td>{a.assetName}</Td><Td>{a.serialNumber || "—"}</Td><Td>{a.unitNo}</Td><Td>{dateText(a.capitalizationDate)}</Td><Td>{a.warrantyMonths || 0} mo</Td><Td>{a.status}</Td></tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Amendments (proposed and decided)</h4>
      {(d.amendments || []).length === 0 ? <Empty text="No amendments." /> : (
        <Table headers={["Rev", "Status", "Reason", "Proposed by", "Decided by", "Changes"]} minWidth={700}>
          {d.amendments.map((a) => (
            <tr key={a.id}><Td>{a.revisionNo}</Td><Td>{a.status}</Td><Td>{a.reason}</Td><Td>{a.proposedBy}</Td><Td>{a.decidedBy || "—"}</Td>
              <Td><code style={{ fontSize: 11 }}>{a.changesJson}</code></Td></tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Approval and status history</h4>
      {approvals.length === 0 ? <Empty text="No approval activity yet." /> : (
        <Table headers={["When", "Action", "From → To", "By (role)", "Comments"]} minWidth={640}>
          {approvals.map((x) => (
            <tr key={x.id}><Td>{formatDisplayDate(x.actedAt)}</Td><Td>{x.action}</Td><Td>{x.fromStatus || "—"} → {x.toStatus || "—"}</Td><Td>{x.actor} ({x.actorRole})</Td><Td>{x.comments || "—"}</Td></tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Validity extensions</h4>
      {(d.validityHistory || []).length === 0 ? <Empty text="Validity has not been extended." /> : (
        <Table headers={["Changed", "Old end", "New end", "By", "Reason"]} minWidth={600}>
          {d.validityHistory.map((v) => <tr key={v.id}><Td>{formatDisplayDate(v.changedAt)}</Td><Td>{dateText(v.oldValidityEnd)}</Td><Td>{dateText(v.newValidityEnd)}</Td><Td>{v.changedBy}</Td><Td>{v.reason}</Td></tr>)}
        </Table>
      )}

      <h4 style={h4}>Documents</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(d.attachments || []).length === 0 && <Empty text="No documents." />}
        {(d.attachments || []).map((a) => (
          <div key={a.id} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
            <button style={{ ...btn(), padding: "3px 8px" }} onClick={() => download(a)}>Download</button>
            <span>{a.fileName}</span>
            <span style={{ color: "#64748b", fontSize: 11 }}>{a.docType}{a.lineId ? ` · line ${(d.lines.find((l) => l.id === a.lineId) || {}).lineNo || ""}` : ""} · {Math.round(a.sizeBytes / 1024)} KB · {a.uploadedBy}</span>
          </div>
        ))}
        {(d.allowedActions || []).includes("ATTACH") && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select style={{ ...inp, width: 220 }} value={docType} onChange={(e) => setDocType(e.target.value)}>{DOC_TYPES.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}</select>
            <select style={{ ...inp, width: 160 }} value={lineForDoc} onChange={(e) => setLineForDoc(e.target.value)}>
              <option value="">PO level</option>
              {(d.lines || []).map((l) => <option key={l.id} value={l.lineNo}>Line {l.lineNo}</option>)}
            </select>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" style={{ display: "none" }} onChange={upload} />
            <button style={btn()} disabled={uploading} onClick={() => fileRef.current && fileRef.current.click()}>{uploading ? "Uploading…" : "+ Upload document"}</button>
          </div>
        )}
      </div>

      <h4 style={h4}>Terms and remarks</h4>
      <div style={grid4}>
        <KV label="Cancel reason" value={d.cancelReason} />
        <KV label="Modified" value={`${d.modifiedBy || ""} ${dateText(d.modifiedAt)}`} />
      </div>
    </Modal>
  );
}

// ============================================================================
// Register
// ============================================================================

const SORTABLE = ["poNumber", "poDate", "vendorName", "grandTotal", "expectedDeliveryDate", "validityEnd", "status"];
const EMPTY_FILTERS = { poNumber: "", vendor: "", assetCategory: "", department: "", plant: "", poFrom: "", poTo: "", deliveryFrom: "", deliveryTo: "", status: "", receiptStatus: "", installationStatus: "", commissioningStatus: "", registrationStatus: "" };

function RegisterTab({ user, refs, refreshToken, onView, onAction, onEdit, onAmend, onPrint, flash }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedNo, setDebouncedNo] = useState("");
  const [sort, setSort] = useState({ key: "poDate", dir: "desc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => { const t = setTimeout(() => setDebouncedNo(filters.poNumber), 300); return () => clearTimeout(t); }, [filters.poNumber]);
  useEffect(() => { setPage(0); }, [debouncedNo, filters, sort]);
  useEffect(() => {
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const buildQuery = useCallback((p, size) => {
    const params = new URLSearchParams();
    Object.entries({ ...filters, poNumber: debouncedNo }).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set("page", String(p)); params.set("size", String(size));
    params.set("sort", sort.key); params.set("dir", sort.dir);
    return `?${params.toString()}`;
  }, [filters, debouncedNo, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api("GET", buildQuery(page, pageSize), user)); setError(""); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [buildQuery, page, pageSize, user]);
  useEffect(() => { load(); }, [load, refreshToken]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const exportExcel = async () => {
    try {
      const rows = [];
      for (let p = 0; p < 50; p++) {
        const chunk = await api("GET", buildQuery(p, 100), user);
        rows.push(...chunk.content);
        if (chunk.content.length < 100) break;
      }
      const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
        "Capital PO No": r.poNumber, "PO Date": dateText(r.poDate), "Vendor": r.vendorName, "Asset Category": r.assetCategories,
        "Asset Summary": r.assetSummary, "Department": r.departmentName, "Plant": r.plantLocation, "Related PR": r.prNumber || "",
        "Expected Delivery": dateText(r.expectedDeliveryDate), "Validity": dateText(r.validityEnd), "PO Amount": Number(r.grandTotal),
        "Approval Status": r.status, "Receipt Status": r.receiptStatus, "Installation": r.installationStatus,
        "Commissioning": r.commissioningStatus, "Asset Registration": r.assetRegistrationStatus, "Created By": r.createdBy, "Created": dateText(r.createdAt)
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Capital POs");
      XLSX.writeFile(wb, `Capital_POs_${TODAY()}.xlsx`);
      flash(`Exported ${rows.length} Capital PO(s).`);
    } catch (e) { flash(e.message, true); }
  };

  const statusOpts = (map) => Object.entries(map).map(([k, v]) => <option key={k} value={k}>{v.label}</option>);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 10 }}>
        <Field label="PO number"><input style={inp} value={filters.poNumber} onChange={setF("poNumber")} placeholder="CPO-…" /></Field>
        <Field label="Vendor">
          <select style={inp} value={filters.vendor} onChange={setF("vendor")}><option value="">All vendors</option>{refs.vendors.map((v) => <option key={v.supplierCode} value={v.supplierCode}>{v.supplierName}</option>)}</select>
        </Field>
        <Field label="Asset category">
          <select style={inp} value={filters.assetCategory} onChange={setF("assetCategory")}><option value="">All categories</option>{refs.categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
        </Field>
        <Field label="Department">
          <select style={inp} value={filters.department} onChange={setF("department")}><option value="">All departments</option>{refs.departments.map((d) => <option key={d.id} value={d.departmentName || d.name}>{d.departmentName || d.name}</option>)}</select>
        </Field>
        <Field label="Plant / location"><input style={inp} value={filters.plant} onChange={setF("plant")} /></Field>
        <Field label="Approval status"><select style={inp} value={filters.status} onChange={setF("status")}><option value="">All</option>{statusOpts(STATUS_STYLE)}</select></Field>
        <Field label="Receipt status"><select style={inp} value={filters.receiptStatus} onChange={setF("receiptStatus")}><option value="">All</option>{statusOpts(RECEIPT_STYLE)}</select></Field>
        <Field label="Installation"><select style={inp} value={filters.installationStatus} onChange={setF("installationStatus")}><option value="">All</option>{statusOpts(PROGRESS_STYLE)}</select></Field>
        <Field label="Commissioning"><select style={inp} value={filters.commissioningStatus} onChange={setF("commissioningStatus")}><option value="">All</option>{statusOpts(PROGRESS_STYLE)}</select></Field>
        <Field label="Asset registration"><select style={inp} value={filters.registrationStatus} onChange={setF("registrationStatus")}><option value="">All</option>{statusOpts(REG_STYLE)}</select></Field>
        <Field label="PO date from"><DateInput value={filters.poFrom} onChange={setF("poFrom")} style={inp} /></Field>
        <Field label="PO date to"><DateInput value={filters.poTo} onChange={setF("poTo")} style={inp} /></Field>
        <Field label="Expected delivery from"><DateInput value={filters.deliveryFrom} onChange={setF("deliveryFrom")} style={inp} /></Field>
        <Field label="Expected delivery to"><DateInput value={filters.deliveryTo} onChange={setF("deliveryTo")} style={inp} /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 12, color: "#64748b" }}>
        <span>{loading ? "Loading…" : `${data.totalElements} Capital PO(s)`} · <button style={{ ...btn(), padding: "2px 8px" }} onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button></span>
        <span style={{ display: "flex", gap: 8 }}><button style={btn()} onClick={load}>Refresh</button><button style={btn()} onClick={exportExcel}>Export Excel</button></span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <table style={{ width: "100%", minWidth: 1900, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[["poNumber", "Capital PO no."], ["poDate", "PO date"], ["vendorName", "Vendor"], [null, "Asset category"], [null, "Asset / description summary"], [null, "Department"], [null, "Plant / location"], [null, "Related PR"], ["expectedDeliveryDate", "Expected delivery"], ["validityEnd", "Validity"], ["grandTotal", "PO amount"], ["status", "Approval status"], [null, "Receipt"], [null, "Installation"], [null, "Commissioning"], [null, "Asset registration"], [null, "Created by"], [null, "Created"], [null, "Actions"]].map(([key, label]) => (
                <th key={label} onClick={key && SORTABLE.includes(key) ? () => toggleSort(key) : undefined} style={{ textAlign: label === "PO amount" ? "right" : "left", padding: 8, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", cursor: key ? "pointer" : "default", color: "#334155" }}>
                  {label}{key && sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.content.length === 0 && (
              <tr><td colSpan={19} style={{ padding: 28, textAlign: "center", color: "#64748b" }}>{loading ? "Loading…" : "No Capital POs match. Create one from the Create Capital PO tab."}</td></tr>
            )}
            {data.content.map((r) => {
              const actions = (r.allowedActions || []).filter((a) => a !== "ATTACH" && a !== "MANAGE_SCHEDULE");
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <Td><button onClick={() => onView(r.id)} style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0 }}>{r.poNumber}</button></Td>
                  <Td>{dateText(r.poDate)}</Td>
                  <Td>{r.vendorName}</Td>
                  <Td>{r.assetCategories}</Td>
                  <Td>{r.assetSummary}{r.lineCount > 1 && <div style={{ color: "#64748b", fontSize: 10 }}>{r.lineCount} lines</div>}</Td>
                  <Td>{r.departmentName}</Td>
                  <Td>{r.plantLocation}</Td>
                  <Td>{r.prNumber || "Direct"}</Td>
                  <Td>{dateText(r.expectedDeliveryDate)}</Td>
                  <Td>{dateText(r.validityEnd)}{r.validityExpired && <div style={{ color: "#991b1b", fontSize: 10, fontWeight: 700 }}>Expired</div>}</Td>
                  <Td right><b>{money(r.grandTotal)}</b></Td>
                  <Td><Badge map={STATUS_STYLE} value={r.status} /></Td>
                  <Td><Badge map={RECEIPT_STYLE} value={r.receiptStatus} /></Td>
                  <Td><Badge map={PROGRESS_STYLE} value={r.installationStatus} /></Td>
                  <Td><Badge map={PROGRESS_STYLE} value={r.commissioningStatus} /></Td>
                  <Td><Badge map={REG_STYLE} value={r.assetRegistrationStatus} /></Td>
                  <Td>{r.createdBy}</Td>
                  <Td>{dateText(r.createdAt)}</Td>
                  <Td>
                    <div style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
                      <button style={btn()} onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}>Actions ▾</button>
                      {openMenu === r.id && (
                        <div style={{ position: "absolute", right: 0, top: "110%", zIndex: 80, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 10px 24px rgba(15,23,42,0.18)", minWidth: 230, padding: 4 }}>
                          <MenuItem onClick={() => { setOpenMenu(null); onView(r.id); }}>View details</MenuItem>
                          <MenuItem onClick={() => { setOpenMenu(null); onPrint(r.id); }}>Print / download PDF</MenuItem>
                          {actions.length > 0 && <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />}
                          {actions.filter((a) => !["RECORD_INSTALLATION", "RECORD_COMMISSIONING", "DECIDE_AMENDMENT"].includes(a)).map((a) => (
                            <MenuItem key={a} danger={["REJECT", "CANCEL"].includes(a)} onClick={() => {
                              setOpenMenu(null);
                              if (a === "EDIT") onEdit(r.id);
                              else if (a === "PROPOSE_AMENDMENT") onAmend(r.id);
                              else onAction(r, a);
                            }}>{ACTION_LABEL[a] || a}</MenuItem>
                          ))}
                          <MenuItem onClick={() => { setOpenMenu(null); onView(r.id); }}>View approval history</MenuItem>
                        </div>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8, fontSize: 12 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>Rows per page
          <select style={{ ...inp, width: "auto" }} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>{[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={btn()} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {data.totalPages === 0 ? 0 : page + 1} of {data.totalPages}</span>
          <button style={btn()} disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <div onClick={onClick} style={{ padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 6, color: danger ? "#b91c1c" : "#0f172a" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      {children}
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export function CapitalPurchaseOrderPage({ onBackToHome, onOpenSidebar, sidebarOpen }) {
  const [user, setUserState] = useState(loadUser);
  const [tab, setTab] = useState("register");
  const [formState, setFormState] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailFocus, setDetailFocus] = useState(null);
  const [actionState, setActionState] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refs, setRefs] = useState({ vendors: [], departments: [], categories: [], hsnGoods: [], sacCodes: [], eligiblePrs: [], policy: { allowDirectCreation: true, approvalLimit: "" } });
  const [toast, setToast] = useState(null);

  const setUser = (u) => { setUserState(u); saveUser(u); };
  const flash = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3400);
  }, []);

  const reloadRefs = useCallback(async () => {
    const [vendors, departments, categories, hsnGoods, sacCodes, eligiblePrs] = await Promise.all([
      plainGet("/vendors"), plainGet("/departments"),
      plainGet("/capital-pos/categories"), plainGet("/capital-pos/hsn-goods"), plainGet("/capital-pos/sac-codes"),
      plainGet("/capital-pos/eligible-prs")
    ]);
    let policy = { allowDirectCreation: true, approvalLimit: "" };
    try { const r = await fetch(`${CPO}/policy`); if (r.ok) policy = await r.json(); } catch (e) { /* keep default */ }
    setRefs({ vendors, departments, categories, hsnGoods, sacCodes, eligiblePrs, policy });
  }, []);
  useEffect(() => { reloadRefs(); }, [reloadRefs]);

  const bump = () => setRefreshToken((t) => t + 1);

  const openForm = async (editingId, amendMode) => {
    try {
      const d = editingId ? await api("GET", `/${editingId}`, user) : null;
      setFormState({ editing: d, amendMode });
      setDetailId(null);
      setTab("create");
    } catch (e) { flash(e.message, true); }
  };

  const openAction = (po, action, extra = {}) => {
    if (action === "EDIT") return openForm(po.id, false);
    if (action === "PROPOSE_AMENDMENT") return openForm(po.id, true);
    setActionState({ action, po, ...extra });
    return undefined;
  };

  const onPrint = async (id) => {
    try { window.open(await openBlob(`/${id}/print`, user, "text/html"), "_blank"); } catch (e) { flash(e.message, true); }
  };

  const tabBtn = (key, label) => (
    <button onClick={() => { if (key === "create" && !formState) setFormState({ editing: null, amendMode: false }); setTab(key); }}
      style={{ background: tab === key ? "#3b82f6" : "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
      {label}
    </button>
  );

  return (
    <div style={{ height: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#f1f5f9", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: toast.isError ? "#dc2626" : "#10b981", color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", maxWidth: 440 }}>{toast.message}</div>
      )}

      <div style={{ flexShrink: 0, background: "#1e293b", borderBottom: "1px solid #334155", padding: "8px 18px 8px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
            <div style={{ background: "#7c3aed", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11 }}>CPO</div>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Capital Purchase Order</span>
          </div>
          {tabBtn("create", formState && formState.editing ? "Edit Capital PO" : formState && formState.amendMode ? "Propose amendment" : "Create Capital PO")}
          {tabBtn("register", "Capital PO Register")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ color: "#94a3b8" }}>Acting as</span>
          <input style={{ ...inp, width: 150, padding: "4px 8px" }} value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} title="Current user (sent as X-User-Name)" />
          <select style={{ ...inp, width: 150, padding: "4px 8px" }} value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })} title="Role (sent as X-User-Role)">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={onOpenSidebar} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>{sidebarOpen ? "Hide menu" : "Menu"}</button>
          <span onClick={onBackToHome} style={{ cursor: "pointer", color: "#60a5fa", textDecoration: "underline", marginLeft: 6 }}>Home</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 18, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1440, width: "100%", margin: "0 auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", boxSizing: "border-box", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, overflowY: tab === "create" ? "auto" : "hidden" }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
            Purchase › Purchase Order › <b style={{ color: "#0f172a" }}>Capital PO</b>
            <span style={{ marginLeft: 12 }}>Physical receipt, installation, commissioning and asset registration are recorded separately from approval.</span>
          </div>

          {tab === "create" && (formState ? (
            <CreateForm
              key={`${formState.editing ? formState.editing.id : "new"}-${formState.amendMode ? "amend" : "form"}`}
              user={user} refs={refs} editing={formState.editing} amendMode={formState.amendMode} flash={flash}
              onSaved={(d, message) => { setFormState(null); setTab("register"); flash(message); bump(); setDetailId(null); void d; }}
              onCancel={() => { setFormState(null); setTab("register"); }}
            />
          ) : (
            <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
              <button style={btn("primary")} onClick={() => setFormState({ editing: null, amendMode: false })}>Start a new Capital PO</button>
            </div>
          ))}

          {tab === "register" && (
            <RegisterTab user={user} refs={refs} refreshToken={refreshToken} flash={flash}
              onView={(id, focus) => { setDetailId(id); setDetailFocus(focus || null); }}
              onAction={openAction} onEdit={(id) => openForm(id, false)} onAmend={(id) => openForm(id, true)} onPrint={onPrint} />
          )}
        </div>
      </div>

      {detailId && (
        <DetailView id={detailId} user={user} refreshToken={refreshToken} flash={flash}
          onClose={() => { setDetailId(null); setDetailFocus(null); }}
          onAction={(d, action, extra) => openAction(d, action, extra)}
          onEdit={(d) => openForm(d.id, false)} onAmend={(d) => openForm(d.id, true)} onChanged={bump} />
      )}

      {actionState && (
        <ActionDialog state={actionState} user={user}
          onClose={() => setActionState(null)}
          onDone={(updated, message) => { setActionState(null); flash(message); bump(); void updated; }} />
      )}
    </div>
  );
}

export default CapitalPurchaseOrderPage;
