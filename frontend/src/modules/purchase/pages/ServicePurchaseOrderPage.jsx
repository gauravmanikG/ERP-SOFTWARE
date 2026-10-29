import React, { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import DateInput from "../../../shared/components/DateInput";
import SearchableSelect from "../../../shared/components/SearchableSelect";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { isNumericHeader } from "../newpo/ui";

// ============================================================================
// Service Purchase Order (Service PO)
// Service POs use service_* tables on the backend. They never create a GRN and never change stock.
// ============================================================================

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";
const SPO = `${API_ROOT}/service-pos`;
import { getSetting, setSetting } from "../../../shared/utils/settingsStore";

const USER_KEY = "SMS_CURRENT_USER";
const ROLES = ["CREATOR", "APPROVER", "ACCEPTOR", "FINANCE", "ADMIN"];

const PRICING_METHODS = [
  { value: "FIXED_PRICE", label: "Fixed price for entire job" },
  { value: "HOURLY", label: "Hourly rate" },
  { value: "DAILY", label: "Daily rate" },
  { value: "PER_VISIT", label: "Per visit" },
  { value: "QUANTITY_RATE", label: "Quantity-based rate" },
  { value: "MILESTONE", label: "Milestone-based payment" },
  { value: "TIME_AND_MATERIAL", label: "Time and materials" }
];
const AMOUNT_ONLY_METHODS = ["FIXED_PRICE", "MILESTONE"];
const FREQUENCIES = ["ONE_TIME", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"];
const RECURRENCE = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"];
const TAXABILITY = ["TAXABLE", "EXEMPT", "NIL_RATED", "NON_GST"];
const RESULTS = ["ACCEPTED", "PARTIALLY_ACCEPTED", "REJECTED"];

const STATUS_STYLE = {
  DRAFT: { bg: "#f1f5f9", fg: "#334155", label: "Draft" },
  PENDING_APPROVAL: { bg: "#fef3c7", fg: "#92400e", label: "Pending approval" },
  APPROVED: { bg: "#dbeafe", fg: "#1e40af", label: "Approved" },
  ISSUED: { bg: "#e0e7ff", fg: "#3730a3", label: "Issued" },
  PARTIALLY_FULFILLED: { bg: "#ecfccb", fg: "#3f6212", label: "Partially fulfilled" },
  FULFILLED: { bg: "#dcfce7", fg: "#166534", label: "Fulfilled" },
  ON_HOLD: { bg: "#fde68a", fg: "#78350f", label: "On hold" },
  CANCELLED: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelled" },
  CLOSED: { bg: "#e2e8f0", fg: "#0f172a", label: "Closed" }
};
const INVOICE_STYLE = {
  NOT_INVOICED: { bg: "#f1f5f9", fg: "#475569", label: "Not invoiced" },
  PARTIALLY_INVOICED: { bg: "#fef9c3", fg: "#854d0e", label: "Partly invoiced" },
  INVOICED: { bg: "#dcfce7", fg: "#166534", label: "Invoiced" }
};

const ACTION_LABEL = {
  EDIT: "Edit draft",
  SUBMIT: "Submit for approval",
  APPROVE: "Approve",
  REJECT: "Reject",
  ISSUE: "Issue to vendor",
  HOLD: "Put on hold",
  RELEASE: "Release hold",
  CLOSE: "Close PO",
  CANCEL: "Cancel PO",
  EXTEND_VALIDITY: "Extend validity",
  AMEND: "Amend (revision)",
  RECORD_ACCEPTANCE: "Record service acceptance",
  RECORD_INVOICE: "Record invoice"
};
const REASON_REQUIRED = ["REJECT", "HOLD", "CLOSE", "CANCEL"];
const ACTION_CONFIRM = {
  SUBMIT: "Submit", APPROVE: "Approve", REJECT: "Reject", ISSUE: "Issue", HOLD: "Put on hold",
  RELEASE: "Release", CLOSE: "Close", CANCEL: "Cancel PO"
};
const ACTION_PATH = {
  SUBMIT: "submit", APPROVE: "approve", REJECT: "reject", ISSUE: "issue", HOLD: "hold",
  RELEASE: "release", CLOSE: "close", CANCEL: "cancel", EXTEND_VALIDITY: "validity/extend",
  RECORD_ACCEPTANCE: "acceptances", RECORD_INVOICE: "invoices"
};

// ============================================================================
// Helpers
// ============================================================================

const TODAY = () => new Date().toISOString().slice(0, 10);

function loadUser() {
  const u = getSetting(USER_KEY, null);
  if (u && u.name) return { name: u.name, role: ROLES.includes(u.role) ? u.role : "CREATOR" };
  return { name: "Current User", role: "CREATOR" };
}

function saveUser(u) {
  setSetting(USER_KEY, u);
}

async function api(method, path, user, body) {
  const res = await fetch(`${SPO}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-User-Name": user.name,
      "X-User-Role": user.role
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) {
    throw new Error((data && (data.message || data.error)) || `Request failed (HTTP ${res.status})`);
  }
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

async function authedBlob(path, user) {
  const res = await fetch(`${SPO}${path}`, { headers: { "X-User-Name": user.name, "X-User-Role": user.role } });
  if (!res.ok) throw new Error(`Could not load file (HTTP ${res.status})`);
  return res.blob();
}

function money(v) {
  if (v === null || v === undefined || v === "") return "0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const dateText = (v) => (v ? formatDisplayDate(v) : "—");

const NUMERIC_FIELDS = ["quantity", "rate", "fixedAmount", "discountValue", "additionalCharges", "advancePercent",
  "retentionPercent", "tdsRate", "estimatedBudget"];

function toPayload(form, version) {
  const out = {};
  Object.entries(form).forEach(([k, v]) => {
    if (k === "vendorSearch" || k === "milestones") return;
    if (v === "" || v === undefined || v === null) { out[k] = null; return; }
    if (NUMERIC_FIELDS.includes(k) || k === "departmentId") out[k] = Number(v);
    else if (k === "numberOfVisits") out[k] = parseInt(v, 10);
    else out[k] = v;
  });
  if (version !== undefined) out.version = version;
  return out;
}

const EMPTY_FORM = {
  vendorCode: "", vendorSearch: "", departmentId: "", requester: "", companyName: "", companyGstin: "",
  companyStateCode: "", placeOfSupplyStateCode: "", businessUnit: "", serviceLocation: "", prNumber: "",
  quotationReference: "", contractReference: "", currency: "INR", poDate: TODAY(), validityStart: "",
  validityEnd: "", serviceStartDate: "", serviceCompletionDate: "", paymentTerms: "", internalRemarks: "",
  costCentre: "", estimatedBudget: "", serviceCategory: "", serviceTitle: "", scopeOfWork: "", deliverables: "",
  acceptanceCriteria: "", slaTerms: "", warrantyTerms: "", exclusions: "", specialInstructions: "",
  relatedAssetId: "", serviceFrequency: "ONE_TIME", numberOfVisits: "", cancellationTerms: "",
  termsAndConditions: "", pricingMethod: "FIXED_PRICE", quantity: "", unitOfMeasure: "", rate: "",
  fixedAmount: "", discountType: "NONE", discountValue: "", additionalCharges: "", sacCode: "",
  gstTaxability: "TAXABLE", nonGstReason: "", reverseCharge: false, advancePercent: "", retentionPercent: "",
  tdsApplicable: false, tdsSection: "", tdsRate: "", reason: ""
};

const EMPTY_SCHEDULE = {
  enabled: false, scheduleType: "ONE_TIME", frequency: "MONTHLY", intervalCount: "1", startDate: "",
  endDate: "", occurrences: "", plannedQuantity: "", perOccurrenceAmount: "",
  milestones: [{ description: "", dueDate: "", amount: "" }]
};

function formFromDetail(d, departments) {
  const f = { ...EMPTY_FORM };
  Object.keys(EMPTY_FORM).forEach((k) => {
    if (d[k] !== undefined && d[k] !== null) f[k] = String(d[k]);
  });
  const dept = departments.find((x) => (x.departmentName || x.name) === d.departmentName);
  f.departmentId = dept ? String(dept.id) : "";
  f.vendorSearch = d.vendorName || "";
  f.reverseCharge = !!d.reverseCharge;
  f.tdsApplicable = !!d.tdsApplicable;
  f.reason = "";
  return f;
}

function canPreview(f) {
  if (!f.vendorCode || !f.departmentId || !f.sacCode || !f.validityEnd || !f.serviceCategory) return false;
  if (!/^\d{2}$/.test(f.companyStateCode || "")) return false;
  if (AMOUNT_ONLY_METHODS.includes(f.pricingMethod)) return f.fixedAmount !== "";
  return f.quantity !== "" && f.rate !== "";
}

function clientValidate(f, scheduleOn, schedule) {
  if (!f.vendorCode) return "Select a vendor from the Vendor Master.";
  if (!f.departmentId) return "Select the requesting department.";
  if (!/^\d{2}$/.test(f.companyStateCode || "")) return "Company state code must be a 2-digit GST state code (e.g. 06).";
  if (!f.validityEnd) return "PO validity end date is required.";
  if (!f.serviceCategory) return "Select a service category.";
  if (!f.serviceTitle.trim()) return "Service title / description is required.";
  if (!f.scopeOfWork.trim()) return "Detailed scope of work is required.";
  if (!f.sacCode) return "Select a SAC code.";
  if (AMOUNT_ONLY_METHODS.includes(f.pricingMethod)) {
    if (f.fixedAmount === "") return "Enter the contract amount.";
  } else if (f.quantity === "" || f.rate === "") {
    return "Enter quantity and rate for this pricing method.";
  }
  if (f.gstTaxability !== "TAXABLE" && !f.nonGstReason.trim()) return "Give the reason for the non-taxable supply.";
  if (f.tdsApplicable && (!f.tdsSection || f.tdsRate === "")) return "TDS section and rate are required when TDS applies.";
  if (scheduleOn) {
    if (schedule.scheduleType === "RECURRING" && !schedule.startDate) return "Schedule start date is required.";
  }
  return "";
}

function schedulePayload(s) {
  return {
    enabled: s.enabled,
    scheduleType: s.scheduleType,
    frequency: s.scheduleType === "RECURRING" ? s.frequency : null,
    intervalCount: s.intervalCount ? parseInt(s.intervalCount, 10) : 1,
    startDate: s.startDate || null,
    endDate: s.endDate || null,
    occurrences: s.occurrences ? parseInt(s.occurrences, 10) : null,
    plannedQuantity: s.plannedQuantity === "" ? null : Number(s.plannedQuantity),
    perOccurrenceAmount: s.perOccurrenceAmount === "" ? null : Number(s.perOccurrenceAmount),
    milestones: s.milestones
      .filter((m) => m.description || m.amount)
      .map((m) => ({ description: m.description, dueDate: m.dueDate || null, amount: Number(m.amount) }))
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

// ============================================================================
// Small UI pieces
// ============================================================================

const inp = {
  width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 6, padding: "7px 9px",
  fontSize: 13, color: "#0f172a", background: "#fff", outline: "none"
};
const labelStyle = { fontSize: 12, fontWeight: 700, color: "#334155" };
const btn = (variant = "ghost") => ({
  border: variant === "ghost" ? "1px solid #cbd5e1" : "none",
  background: variant === "primary" ? "#2563eb" : variant === "danger" ? "#dc2626" : variant === "success" ? "#059669" : "#fff",
  color: variant === "ghost" ? "#334155" : "#fff",
  borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
});

function Badge({ map, value }) {
  const s = map[value] || { bg: "#f1f5f9", fg: "#334155", label: value || "—" };
  return (
    <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Field({ label, required, error, hint, span = 1, children }) {
  return (
    <div style={{ gridColumn: span > 1 ? `span ${span}` : undefined, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {children}
      {error ? <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>
        : hint ? <span style={{ fontSize: 11, color: "#64748b" }}>{hint}</span> : null}
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
      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
        {children}
      </div>
    </section>
  );
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

function Banner({ kind = "error", children }) {
  const colors = kind === "error" ? ["#fef2f2", "#991b1b", "#fecaca"] : kind === "warn" ? ["#fffbeb", "#92400e", "#fde68a"] : ["#ecfdf5", "#065f46", "#a7f3d0"];
  return (
    <div style={{ background: colors[0], color: colors[1], border: `1px solid ${colors[2]}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>
      {children}
    </div>
  );
}

// ============================================================================
// Create / edit / amend form
// ============================================================================

function CreateForm({ user, refs, reloadRefs, editing, amendMode, onSaved, onCancel, flash }) {
  const [form, setForm] = useState(() => (editing ? formFromDetail(editing, refs.departments) : { ...EMPTY_FORM }));
  const [schedule, setSchedule] = useState(EMPTY_SCHEDULE);
  const [scheduleTouched, setScheduleTouched] = useState(false);
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const fileRef = useRef(null);

  const set = (key) => (e) => {
    const v = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: v }));
  };
  const setSched = (key) => (e) => {
    setScheduleTouched(true);
    setSchedule((s) => ({ ...s, [key]: e && e.target ? e.target.value : e }));
  };

  const vendorOptions = refs.vendors.map((v) => ({
    value: v.supplierCode,
    label: `${v.supplierName} (${v.supplierCode})`,
    sub: [v.gstin, v.state].filter(Boolean).join(" · ")
  }));
  const deptOptions = refs.departments.map((d) => ({ value: String(d.id), label: d.departmentName || d.name }));
  const sacOptions = refs.sacCodes.map((s) => ({
    value: s.code,
    label: `${s.code} — ${s.description}`,
    sub: `GST ${Number(s.gstRate).toFixed(2)}%`
  }));
  const vendor = refs.vendors.find((v) => v.supplierCode === form.vendorCode);
  const vendorState = vendor ? [vendor.state, vendor.stateCode].filter(Boolean).join(" (") + (vendor.stateCode ? ")" : "") : "";
  const vendorAddress = vendor ? [vendor.address, vendor.city, vendor.pincode].filter(Boolean).join(", ") : "";
  const amountOnly = AMOUNT_ONLY_METHODS.includes(form.pricingMethod);
  const canAddCategory = ["APPROVER", "ADMIN"].includes(user.role);

  // Live totals: the server validates and calculates; nothing is saved by a preview.
  useEffect(() => {
    if (!canPreview(form)) { setPreview(null); setPreviewError(""); return undefined; }
    const t = setTimeout(async () => {
      try {
        setPreview(await api("POST", "/preview", user, toPayload(form)));
        setPreviewError("");
      } catch (e) {
        setPreview(null);
        setPreviewError(e.message);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [form, user]);

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      await api("POST", "/categories", user, { name });
      await reloadRefs();
      setForm((f) => ({ ...f, serviceCategory: name }));
      setNewCategory("");
      setShowNewCategory(false);
      flash(`Sub-group "${name}" added to the Service group.`);
    } catch (e) {
      setServerError(e.message);
    }
  };

  const save = async (submit) => {
    setServerError("");
    const problem = clientValidate(form, scheduleTouched && schedule.enabled, schedule);
    if (problem) { setServerError(problem); return; }
    if (amendMode && !form.reason.trim()) { setServerError("Enter the reason for this amendment."); return; }
    setSaving(true);
    try {
      let d;
      if (amendMode) {
        d = await api("POST", `/${editing.id}/amend`, user, toPayload(form));
      } else if (editing) {
        d = await api("PUT", `/${editing.id}`, user, toPayload(form, editing.version));
      } else {
        d = await api("POST", "", user, toPayload(form));
      }
      if (!amendMode && scheduleTouched) {
        d = await api("PUT", `/${d.id}/schedule`, user, schedulePayload(schedule));
      }
      for (const file of files) {
        const contentBase64 = await fileToBase64(file);
        d = await api("POST", `/${d.id}/attachments`, user, {
          docType: "SUPPORTING", fileName: file.name, contentType: file.type || "application/octet-stream", contentBase64
        });
      }
      let message = amendMode ? `Revision saved for ${d.poNumber}.` : editing ? `Draft ${d.poNumber} updated.` : `Draft ${d.poNumber} created.`;
      if (submit && !amendMode && d.status === "DRAFT") {
        d = await api("POST", `/${d.id}/submit`, user, { comments: "Submitted from Service PO form" });
        message = `${d.poNumber} submitted for approval.`;
      }
      onSaved(d, message);
    } catch (e) {
      setServerError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = (i) => setFiles((fs) => fs.filter((_, idx) => idx !== i));

  return (
    <div>
      {amendMode && (
        <Banner kind="warn">
          Amending <b>{editing.poNumber}</b>. Changes re-price the PO, are recorded as a revision, and cannot take the
          PO below the value already accepted or invoiced.
        </Banner>
      )}
      {serverError && <Banner kind="error">{serverError}</Banner>}

      <Section title="1. PO header" subtitle="Vendor details are read from the Vendor Master; the backend re-reads them when saving.">
        <Field label="Service PO number" hint="Generated by the server on save (sequential and unique)">
          <input style={{ ...inp, background: "#f8fafc", color: "#64748b" }} value={editing ? editing.poNumber : "Auto-generated"} disabled />
        </Field>
        <Field label="PO date" required>
          <DateInput value={form.poDate} onChange={set("poDate")} max={TODAY()} style={inp} />
        </Field>
        <Field label="Vendor / supplier" required span={2}>
          <SearchableSelect
            options={vendorOptions}
            value={form.vendorCode}
            placeholder="Search vendor by name, code or GSTIN"
            onChange={(e) => setForm((f) => ({ ...f, vendorCode: e.target.value, vendorSearch: e.target.value }))}
          />
        </Field>
        <Field label="Vendor legal name">
          <input style={{ ...inp, background: "#f8fafc" }} value={vendor ? vendor.supplierName : ""} disabled />
        </Field>
        <Field label="Vendor address" span={2}>
          <input style={{ ...inp, background: "#f8fafc" }} value={vendorAddress} disabled />
        </Field>
        <Field label="Vendor GSTIN">
          <input style={{ ...inp, background: "#f8fafc" }} value={vendor ? vendor.gstin || "" : ""} disabled />
        </Field>
        <Field label="Vendor state">
          <input style={{ ...inp, background: "#f8fafc" }} value={vendorState} disabled />
        </Field>
        <Field label="Requesting department" required>
          <SearchableSelect options={deptOptions} value={form.departmentId} placeholder="Select department"
            onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} />
        </Field>
        <Field label="Requester" hint="Defaults to the signed-in user">
          <input style={inp} value={form.requester} placeholder={user.name} onChange={set("requester")} />
        </Field>
        <Field label="Company / business unit">
          <input style={inp} value={form.companyName} onChange={set("companyName")} placeholder="Silver Muller Seals" />
        </Field>
        <Field label="Business unit">
          <input style={inp} value={form.businessUnit} onChange={set("businessUnit")} />
        </Field>
        <Field label="Company GSTIN">
          <input style={inp} value={form.companyGstin} onChange={set("companyGstin")} />
        </Field>
        <Field label="Company state code" required hint="2-digit GST code, e.g. 06">
          <input style={inp} maxLength={2} value={form.companyStateCode} onChange={set("companyStateCode")} />
        </Field>
        <Field label="Place of supply state code" hint="Blank = company state">
          <input style={inp} maxLength={2} value={form.placeOfSupplyStateCode} onChange={set("placeOfSupplyStateCode")} />
        </Field>
        <Field label="Service location / factory" span={2}>
          <input style={inp} value={form.serviceLocation} onChange={set("serviceLocation")} />
        </Field>
        <Field label="Reference PR number" hint="Optional. Leave blank for direct Service PO.">
          <input style={inp} value={form.prNumber} onChange={set("prNumber")} />
        </Field>
        <Field label="Quotation reference"><input style={inp} value={form.quotationReference} onChange={set("quotationReference")} /></Field>
        <Field label="Contract reference"><input style={inp} value={form.contractReference} onChange={set("contractReference")} /></Field>
        <Field label="Currency"><input style={inp} value={form.currency} onChange={set("currency")} /></Field>
        <Field label="Validity start"><DateInput value={form.validityStart} onChange={set("validityStart")} style={inp} /></Field>
        <Field label="Validity end" required><DateInput value={form.validityEnd} onChange={set("validityEnd")} style={inp} /></Field>
        <Field label="Expected service start"><DateInput value={form.serviceStartDate} onChange={set("serviceStartDate")} style={inp} /></Field>
        <Field label="Expected completion"><DateInput value={form.serviceCompletionDate} onChange={set("serviceCompletionDate")} style={inp} /></Field>
        <Field label="Payment terms" span={2}><input style={inp} value={form.paymentTerms} onChange={set("paymentTerms")} placeholder="e.g. 30 days from invoice" /></Field>
        <Field label="Internal remarks" span={3}><textarea style={{ ...inp, minHeight: 56 }} value={form.internalRemarks} onChange={set("internalRemarks")} /></Field>
      </Section>

      <Section title="2. Service category" subtitle="Classification only. Sub-groups of the Service group; new ones appear here automatically."
        right={canAddCategory && (
          <button style={btn()} onClick={() => setShowNewCategory((v) => !v)}>+ New sub-group</button>
        )}>
        <Field label="Service category" required>
          <SearchableSelect value={form.serviceCategory} onChange={set("serviceCategory")} placeholder="Select category"
            options={refs.categories.map((c) => ({ value: c, label: c }))} />
        </Field>
        {showNewCategory && (
          <Field label="New sub-group name" span={2}>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={inp} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
              <button style={btn("primary")} onClick={addCategory}>Add</button>
            </div>
          </Field>
        )}
      </Section>

      <Section title="3. Service description and scope" subtitle="Free text. No Item Master selection is needed.">
        <Field label="Service title / description" required span={2}>
          <input style={inp} value={form.serviceTitle} onChange={set("serviceTitle")} />
        </Field>
        <Field label="Related machine / equipment / asset ID">
          <input style={inp} value={form.relatedAssetId} onChange={set("relatedAssetId")} />
        </Field>
        <Field label="Detailed scope of work" required span={3}>
          <textarea style={{ ...inp, minHeight: 80 }} value={form.scopeOfWork} onChange={set("scopeOfWork")} />
        </Field>
        <Field label="Deliverables / expected outcome" span={2}>
          <textarea style={{ ...inp, minHeight: 60 }} value={form.deliverables} onChange={set("deliverables")} />
        </Field>
        <Field label="Completion / acceptance criteria">
          <textarea style={{ ...inp, minHeight: 60 }} value={form.acceptanceCriteria} onChange={set("acceptanceCriteria")} />
        </Field>
        <Field label="Service frequency">
          <select style={inp} value={form.serviceFrequency} onChange={set("serviceFrequency")}>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Number of visits / occurrences"><input type="number" min="0" style={inp} value={form.numberOfVisits} onChange={set("numberOfVisits")} /></Field>
        <Field label="SLA / response / resolution time" span={2}>
          <input style={inp} value={form.slaTerms} onChange={set("slaTerms")} />
        </Field>
        <Field label="Warranty / service guarantee"><input style={inp} value={form.warrantyTerms} onChange={set("warrantyTerms")} /></Field>
        <Field label="Exclusions and special instructions" span={2}>
          <textarea style={{ ...inp, minHeight: 56 }} value={form.exclusions} onChange={set("exclusions")} />
        </Field>
        <Field label="Special instructions"><textarea style={{ ...inp, minHeight: 56 }} value={form.specialInstructions} onChange={set("specialInstructions")} /></Field>
      </Section>

      <Section title="4. Commercial and pricing" subtitle="Fields change with the pricing method. Totals below come from the server.">
        <Field label="Pricing method" required>
          <select style={inp} value={form.pricingMethod} onChange={set("pricingMethod")}>
            {PRICING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        {amountOnly ? (
          <Field label={form.pricingMethod === "MILESTONE" ? "Total contract value" : "Fixed price for the job"} required>
            <input type="number" min="0" step="0.01" style={inp} value={form.fixedAmount} onChange={set("fixedAmount")} />
          </Field>
        ) : (
          <>
            <Field label={form.pricingMethod === "HOURLY" ? "Hours" : form.pricingMethod === "DAILY" ? "Days" : form.pricingMethod === "PER_VISIT" ? "Visits" : "Quantity"} required>
              <input type="number" min="0" step="0.001" style={inp} value={form.quantity} onChange={set("quantity")} />
            </Field>
            <Field label="Unit of measure"><input style={inp} value={form.unitOfMeasure} onChange={set("unitOfMeasure")} placeholder="HRS / DAY / VISIT / NOS" /></Field>
            <Field label="Rate per unit" required><input type="number" min="0" step="0.01" style={inp} value={form.rate} onChange={set("rate")} /></Field>
          </>
        )}
        <Field label="Discount type">
          <select style={inp} value={form.discountType} onChange={set("discountType")}>
            <option value="NONE">None</option>
            <option value="PERCENT">Percent</option>
            <option value="AMOUNT">Amount</option>
          </select>
        </Field>
        <Field label="Discount value" hint={form.discountType === "PERCENT" ? "0 – 100" : ""}>
          <input type="number" min="0" step="0.01" style={inp} value={form.discountValue} onChange={set("discountValue")} />
        </Field>
        <Field label="Additional charges (freight / travel / other)">
          <input type="number" min="0" step="0.01" style={inp} value={form.additionalCharges} onChange={set("additionalCharges")} />
        </Field>
        <Field label="Advance payment %"><input type="number" min="0" max="100" step="0.01" style={inp} value={form.advancePercent} onChange={set("advancePercent")} /></Field>
        <Field label="Retention %"><input type="number" min="0" max="100" step="0.01" style={inp} value={form.retentionPercent} onChange={set("retentionPercent")} /></Field>
        <Field label="Estimated budget"><input type="number" min="0" step="0.01" style={inp} value={form.estimatedBudget} onChange={set("estimatedBudget")} /></Field>
        <Field label="Cost centre / project code"><input style={inp} value={form.costCentre} onChange={set("costCentre")} /></Field>
        <Field label="TDS applies?">
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={form.tdsApplicable} onChange={set("tdsApplicable")} /> Yes (rate set by Finance)
          </label>
        </Field>
        {form.tdsApplicable && (
          <>
            <Field label="TDS section (Finance)" required><input style={inp} value={form.tdsSection} onChange={set("tdsSection")} /></Field>
            <Field label="TDS rate % (Finance)" required><input type="number" min="0" max="100" step="0.01" style={inp} value={form.tdsRate} onChange={set("tdsRate")} /></Field>
          </>
        )}
        <Field label="Live totals" span={3}>
          <TotalsPanel preview={preview} error={previewError} waiting={!canPreview(form)} />
        </Field>
      </Section>

      <Section title="5. GST, SAC and statutory" subtitle="Rates come from the Tax Master for the selected SAC. Nothing is hardcoded.">
        <Field label="SAC code" required span={2}>
          <SearchableSelect options={sacOptions} value={form.sacCode} placeholder="Search SAC code or description"
            onChange={(e) => setForm((f) => ({ ...f, sacCode: e.target.value }))} />
        </Field>
        <Field label="GST taxability / supply type">
          <select style={inp} value={form.gstTaxability} onChange={set("gstTaxability")}>
            {TAXABILITY.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </Field>
        {form.gstTaxability !== "TAXABLE" && (
          <Field label="Reason (exempt / nil-rated / non-GST)" required span={3}>
            <input style={inp} value={form.nonGstReason} onChange={set("nonGstReason")} />
          </Field>
        )}
        <Field label="Reverse charge applicable">
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={form.reverseCharge} onChange={set("reverseCharge")} /> Yes
          </label>
        </Field>
        <Field label="Supply type (from server)">
          <input style={{ ...inp, background: "#f8fafc" }} value={preview ? `${preview.supplyType} · GST ${preview.gstRate}%` : "—"} disabled />
        </Field>
      </Section>

      <Section title="6. Optional schedule and recurring services"
        subtitle="Planned occurrences only. No duplicate POs or invoices are created. Pricing method is not changed.">
        <Field label="Enable schedule">
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={schedule.enabled} onChange={(e) => { setScheduleTouched(true); setSchedule((s) => ({ ...s, enabled: e.target.checked })); }} />
            {schedule.enabled ? "On" : "Off: PO uses its normal service dates"}
          </label>
        </Field>
        {schedule.enabled && (
          <>
            <Field label="Schedule type">
              <select style={inp} value={schedule.scheduleType} onChange={setSched("scheduleType")}>
                <option value="ONE_TIME">One-time</option>
                <option value="RECURRING">Recurring</option>
                <option value="MILESTONE">Milestone-based</option>
              </select>
            </Field>
            {schedule.scheduleType === "RECURRING" && (
              <>
                <Field label="Frequency">
                  <select style={inp} value={schedule.frequency} onChange={setSched("frequency")}>
                    {RECURRENCE.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Every (interval)"><input type="number" min="1" style={inp} value={schedule.intervalCount} onChange={setSched("intervalCount")} /></Field>
                <Field label="Start date" required><DateInput value={schedule.startDate} onChange={setSched("startDate")} style={inp} /></Field>
                <Field label="End date" hint="Or give a number of occurrences"><DateInput value={schedule.endDate} onChange={setSched("endDate")} style={inp} /></Field>
                <Field label="Number of occurrences"><input type="number" min="1" style={inp} value={schedule.occurrences} onChange={setSched("occurrences")} /></Field>
                <Field label="Expected quantity / hours / visits per occurrence"><input type="number" min="0" style={inp} value={schedule.plannedQuantity} onChange={setSched("plannedQuantity")} /></Field>
                <Field label="Planned amount per occurrence" hint="Blank = PO value split evenly">
                  <input type="number" min="0" step="0.01" style={inp} value={schedule.perOccurrenceAmount} onChange={setSched("perOccurrenceAmount")} />
                </Field>
              </>
            )}
            {schedule.scheduleType === "ONE_TIME" && (
              <Field label="Scheduled service date" required><DateInput value={schedule.startDate} onChange={setSched("startDate")} style={inp} /></Field>
            )}
            {schedule.scheduleType === "MILESTONE" && (
              <Field label="Milestones" span={3}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {schedule.milestones.map((m, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 6 }}>
                      <input style={inp} placeholder="Milestone description" value={m.description}
                        onChange={(e) => setSchedule((s) => ({ ...s, milestones: s.milestones.map((x, j) => j === i ? { ...x, description: e.target.value } : x) }))} />
                      <DateInput value={m.dueDate} onChange={(e) => setSchedule((s) => ({ ...s, milestones: s.milestones.map((x, j) => j === i ? { ...x, dueDate: e.target.value } : x) }))} style={inp} />
                      <input type="number" min="0" step="0.01" style={inp} placeholder="Amount" value={m.amount}
                        onChange={(e) => setSchedule((s) => ({ ...s, milestones: s.milestones.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) }))} />
                      <button style={btn()} onClick={() => setSchedule((s) => ({ ...s, milestones: s.milestones.filter((_, j) => j !== i) }))}>✕</button>
                    </div>
                  ))}
                  <div><button style={btn()} onClick={() => setSchedule((s) => ({ ...s, milestones: [...s.milestones, { description: "", dueDate: "", amount: "" }] }))}>+ Add milestone</button></div>
                </div>
              </Field>
            )}
          </>
        )}
      </Section>

      <Section title="7. Terms, attachments and remarks">
        <Field label="Terms and conditions" span={3}><textarea style={{ ...inp, minHeight: 70 }} value={form.termsAndConditions} onChange={set("termsAndConditions")} /></Field>
        <Field label="Cancellation / termination terms" span={3}><textarea style={{ ...inp, minHeight: 56 }} value={form.cancellationTerms} onChange={set("cancellationTerms")} /></Field>
        <Field label="Supporting documents" span={3} hint="PDF, PNG, JPEG, XLSX or DOCX, up to 5 MB each. Uploaded when the PO is saved.">
          <div>
            <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" style={{ display: "none" }}
              onChange={(e) => setFiles((fs) => [...fs, ...Array.from(e.target.files || [])])} />
            <button style={btn()} onClick={() => fileRef.current && fileRef.current.click()}>Choose files</button>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {files.map((f, i) => (
                <span key={`${f.name}-${i}`} style={{ fontSize: 12, background: "#f1f5f9", borderRadius: 6, padding: "3px 8px" }}>
                  {f.name} ({Math.round(f.size / 1024)} KB) <button onClick={() => remove(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626" }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        </Field>
        {amendMode && (
          <Field label="Reason for amendment" required span={3}>
            <textarea style={{ ...inp, minHeight: 56 }} value={form.reason} onChange={set("reason")} />
          </Field>
        )}
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", paddingBottom: 24 }}>
        <button style={btn()} onClick={onCancel} disabled={saving}>Cancel</button>
        {!amendMode && <button style={btn()} onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>}
        {!amendMode && <button style={btn("primary")} onClick={() => save(true)} disabled={saving}>Save and submit for approval</button>}
        {amendMode && <button style={btn("primary")} onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Save revision"}</button>}
      </div>
    </div>
  );
}

function TotalsPanel({ preview, error, waiting }) {
  if (waiting) return <div style={{ fontSize: 12, color: "#64748b" }}>Fill vendor, department, state, validity, category, SAC and pricing to see totals.</div>;
  if (error) return <Banner kind="warn">{error}</Banner>;
  if (!preview) return <div style={{ fontSize: 12, color: "#64748b" }}>Calculating…</div>;
  const rows = [
    ["Basic amount", money(preview.basicAmount)],
    ["Discount", money(preview.discountAmount)],
    ["Additional charges", money(preview.additionalCharges)],
    ["Taxable value", money(preview.taxableAmount)],
    [preview.supplyType === "INTRA" ? `CGST ${preview.cgstRate}%` : "CGST", preview.supplyType === "INTRA" ? money(preview.cgstAmount) : "—"],
    [preview.supplyType === "INTRA" ? `SGST ${preview.sgstRate}%` : "SGST", preview.supplyType === "INTRA" ? money(preview.sgstAmount) : "—"],
    [preview.supplyType === "INTER" ? `IGST ${preview.igstRate}%` : "IGST", preview.supplyType === "INTER" ? money(preview.igstAmount) : "—"],
    ["Cess", money(preview.cessAmount)],
    ["Total GST", money(preview.taxAmount)],
    ["Total PO value", money(preview.totalAmount)],
    ["Advance", money(preview.advanceAmount)],
    ["Retention", money(preview.retentionAmount)],
    ["TDS (on taxable)", money(preview.tdsAmount)]
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: k.startsWith("Total PO") ? 800 : 500, color: "#0f172a" }}>
          <span style={{ color: "#475569" }}>{k}</span><span>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Action dialog: reasons, validity extension, acceptance, invoice
// ============================================================================

function ActionDialog({ state, user, onClose, onDone }) {
  const { action, po } = state;
  const [detail, setDetail] = useState(null);
  const [comments, setComments] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [acc, setAcc] = useState({
    scheduleId: "", acceptanceDate: TODAY(), serviceSummary: "", completedQuantity: "", completedHours: "",
    completedVisits: "", result: "ACCEPTED", acceptedAmount: "", rejectedAmount: "", remarks: ""
  });
  const [inv, setInv] = useState({ acceptanceId: "", invoiceNumber: "", invoiceDate: TODAY(), taxableAmount: "", taxAmount: "", totalAmount: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (action === "RECORD_ACCEPTANCE" || action === "RECORD_INVOICE") {
      api("GET", `/${po.id}`, user).then(setDetail).catch((e) => setError(e.message));
    }
  }, [action, po.id, user]);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      let body;
      if (action === "EXTEND_VALIDITY") {
        if (!newEnd) throw new Error("Choose the new validity end date.");
        if (!comments.trim()) throw new Error("Enter the reason for extending validity.");
        body = { comments, newValidityEnd: newEnd };
      } else if (action === "RECORD_ACCEPTANCE") {
        if (!acc.serviceSummary.trim()) throw new Error("Describe the service performed.");
        body = {
          scheduleId: acc.scheduleId ? Number(acc.scheduleId) : null,
          acceptanceDate: acc.acceptanceDate,
          serviceSummary: acc.serviceSummary,
          completedQuantity: acc.completedQuantity === "" ? null : Number(acc.completedQuantity),
          completedHours: acc.completedHours === "" ? null : Number(acc.completedHours),
          completedVisits: acc.completedVisits === "" ? null : parseInt(acc.completedVisits, 10),
          result: acc.result,
          acceptedAmount: acc.acceptedAmount === "" ? null : Number(acc.acceptedAmount),
          rejectedAmount: acc.rejectedAmount === "" ? null : Number(acc.rejectedAmount),
          remarks: acc.remarks || null
        };
      } else if (action === "RECORD_INVOICE") {
        body = {
          acceptanceId: inv.acceptanceId ? Number(inv.acceptanceId) : null,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          taxableAmount: Number(inv.taxableAmount),
          taxAmount: inv.taxAmount === "" ? null : Number(inv.taxAmount),
          totalAmount: inv.totalAmount === "" ? null : Number(inv.totalAmount)
        };
      } else {
        if (REASON_REQUIRED.includes(action) && !comments.trim()) throw new Error("A reason is required for this action.");
        body = { comments: comments.trim() || null };
      }
      const updated = await api("POST", `/${po.id}/${ACTION_PATH[action]}`, user, body);
      onDone(updated, `${po.poNumber}: ${ACTION_LABEL[action] || action} done.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const title = `${ACTION_LABEL[action] || action} — ${po.poNumber}`;
  const plannedSchedules = detail ? detail.schedules.filter((s) => s.status === "PLANNED") : [];
  const acceptances = detail ? detail.acceptances.filter((a) => a.result !== "REJECTED") : [];
  const submitLabel = ACTION_CONFIRM[action] || { RECORD_ACCEPTANCE: "Record acceptance", RECORD_INVOICE: "Record invoice", EXTEND_VALIDITY: "Extend validity" }[action] || "Confirm";
  const danger = ["REJECT", "CANCEL"].includes(action);

  return (
    <Modal title={title} onClose={onClose} width={640} zIndex={1100}
      footer={<>
        <button style={btn()} onClick={onClose} disabled={busy}>Back</button>
        <button style={btn(danger ? "danger" : "primary")} onClick={submit} disabled={busy}>{busy ? "Working…" : submitLabel}</button>
      </>}>
      {error && <Banner kind="error">{error}</Banner>}

      {action === "RECORD_ACCEPTANCE" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Field label="Occurrence / milestone" hint="Pick a planned row, or leave blank for PO-level acceptance">
            <select style={inp} value={acc.scheduleId} onChange={(e) => setAcc({ ...acc, scheduleId: e.target.value })}>
              <option value="">No schedule (PO-level)</option>
              {plannedSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.scheduleType === "MILESTONE" ? s.milestoneDescription : `#${s.sequenceNo} ${s.scheduledDate || s.dueDate || ""}`} — {money(s.plannedAmount)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Acceptance date" required><DateInput value={acc.acceptanceDate} onChange={(e) => setAcc({ ...acc, acceptanceDate: e.target.value })} style={inp} /></Field>
          <Field label="Result" required>
            <select style={inp} value={acc.result} onChange={(e) => setAcc({ ...acc, result: e.target.value })}>
              {RESULTS.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Service performed" required span={2}>
            <textarea style={{ ...inp, minHeight: 56 }} value={acc.serviceSummary} onChange={(e) => setAcc({ ...acc, serviceSummary: e.target.value })} />
          </Field>
          <Field label="Completed quantity"><input type="number" min="0" style={inp} value={acc.completedQuantity} onChange={(e) => setAcc({ ...acc, completedQuantity: e.target.value })} /></Field>
          <Field label="Completed hours"><input type="number" min="0" style={inp} value={acc.completedHours} onChange={(e) => setAcc({ ...acc, completedHours: e.target.value })} /></Field>
          <Field label="Completed visits"><input type="number" min="0" style={inp} value={acc.completedVisits} onChange={(e) => setAcc({ ...acc, completedVisits: e.target.value })} /></Field>
          <Field label="Accepted amount" hint={detail ? `Remaining to accept: ${money(detail.remainingToAccept)}` : ""}>
            <input type="number" min="0" step="0.01" style={inp} value={acc.acceptedAmount} onChange={(e) => setAcc({ ...acc, acceptedAmount: e.target.value })} />
          </Field>
          <Field label="Rejected amount"><input type="number" min="0" step="0.01" style={inp} value={acc.rejectedAmount} onChange={(e) => setAcc({ ...acc, rejectedAmount: e.target.value })} /></Field>
          <Field label="Remarks" hint="Required for partial acceptance or rejection" span={2}>
            <textarea style={{ ...inp, minHeight: 50 }} value={acc.remarks} onChange={(e) => setAcc({ ...acc, remarks: e.target.value })} />
          </Field>
          <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "#64748b" }}>
            Recording a service acceptance does not create a GRN and does not change stock.
            {acceptances.length > 0 && ` ${acceptances.length} accepted record(s) so far.`}
          </div>
        </div>
      )}

      {action === "RECORD_INVOICE" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Field label="Against accepted service" hint={detail ? `Un-invoiced accepted value: ${money(detail.remainingToInvoice)}` : ""} span={2}>
            <select style={inp} value={inv.acceptanceId} onChange={(e) => setInv({ ...inv, acceptanceId: e.target.value })}>
              <option value="">PO level</option>
              {acceptances.map((a) => <option key={a.id} value={a.id}>{a.acceptanceNumber} — {money(a.acceptedAmount)}</option>)}
            </select>
          </Field>
          <Field label="Vendor invoice number" required><input style={inp} value={inv.invoiceNumber} onChange={(e) => setInv({ ...inv, invoiceNumber: e.target.value })} /></Field>
          <Field label="Invoice date" required><DateInput value={inv.invoiceDate} onChange={(e) => setInv({ ...inv, invoiceDate: e.target.value })} style={inp} /></Field>
          <Field label="Taxable value" required hint="Checked against accepted, un-invoiced value">
            <input type="number" min="0" step="0.01" style={inp} value={inv.taxableAmount} onChange={(e) => setInv({ ...inv, taxableAmount: e.target.value })} />
          </Field>
          <Field label="GST amount" hint="Blank = calculated at the PO GST rate">
            <input type="number" min="0" step="0.01" style={inp} value={inv.taxAmount} onChange={(e) => setInv({ ...inv, taxAmount: e.target.value })} />
          </Field>
          <Field label="Invoice total" hint="Optional: must equal taxable + GST"><input type="number" min="0" step="0.01" style={inp} value={inv.totalAmount} onChange={(e) => setInv({ ...inv, totalAmount: e.target.value })} /></Field>
        </div>
      )}

      {action === "EXTEND_VALIDITY" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#475569" }}>Current validity end: <b>{dateText(po.validityEnd)}</b>. Only approvers can extend, and every extension is kept in the history.</div>
          <Field label="New validity end" required><DateInput value={newEnd} onChange={(e) => setNewEnd(e.target.value)} min={po.validityEnd} style={inp} /></Field>
          <Field label="Reason for extension" required><textarea style={{ ...inp, minHeight: 60 }} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
        </div>
      )}

      {!["RECORD_ACCEPTANCE", "RECORD_INVOICE", "EXTEND_VALIDITY"].includes(action) && (
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

function DetailView({ id, user, departments, onClose, onAction, onEdit, onAmend, onChanged, refreshToken, flash }) {
  const [d, setD] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setD(await api("GET", `/${id}`, user));
      setLoadError("");
    } catch (e) {
      setLoadError(e.message);
    }
  }, [id, user]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const print = async () => {
    try {
      const res = await fetch(`${SPO}/${id}/print`, { headers: { "X-User-Name": user.name, "X-User-Role": user.role } });
      if (!res.ok) throw new Error(`Print failed (HTTP ${res.status})`);
      const url = URL.createObjectURL(new Blob([await res.text()], { type: "text/html" }));
      window.open(url, "_blank");
    } catch (e) {
      flash(e.message, true);
    }
  };

  const download = async (att) => {
    try {
      const blob = await authedBlob(`/${id}/attachments/${att.id}`, user);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      flash(e.message, true);
    }
  };

  const upload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await api("POST", `/${id}/attachments`, user, {
        docType: "SERVICE_REPORT", fileName: file.name, contentType: file.type || "application/octet-stream", contentBase64
      });
      flash("Attachment uploaded.");
      await load();
      onChanged();
    } catch (err) {
      flash(err.message, true);
    } finally {
      setUploading(false);
    }
  };

  if (loadError) return <Modal title="Service PO" onClose={onClose}><Banner kind="error">{loadError}</Banner></Modal>;
  if (!d) return <Modal title="Loading Service PO…" onClose={onClose}><div style={{ fontSize: 13 }}>Loading…</div></Modal>;

  const actions = (d.allowedActions || []).filter((a) => a !== "ATTACH" && a !== "MANAGE_SCHEDULE");
  const approvals = (d.history || []).filter((h) => ["SUBMITTED", "APPROVE", "REJECT", "ISSUED", "HOLD", "RELEASE", "CLOSE", "CANCEL", "AMENDED", "VALIDITY_EXTENDED"].includes(h.action));
  const deptName = d.departmentName;

  return (
    <Modal title={`${d.poNumber} · ${d.serviceTitle}`} onClose={onClose} width={960}
      footer={<>
        <button style={btn()} onClick={print}>Print / PDF</button>
        {(d.allowedActions || []).includes("EDIT") && <button style={btn()} onClick={() => onEdit(d)}>Edit draft</button>}
        {(d.allowedActions || []).includes("AMEND") && <button style={btn()} onClick={() => onAmend(d)}>Amend</button>}
        {actions.filter((a) => !["EDIT", "AMEND"].includes(a)).map((a) => (
          <button key={a} style={btn(["REJECT", "CANCEL"].includes(a) ? "danger" : "primary")} onClick={() => onAction(d, a)}>{ACTION_LABEL[a] || a}</button>
        ))}
      </>}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <Badge map={STATUS_STYLE} value={d.status} />
        <Badge map={INVOICE_STYLE} value={d.invoiceStatus} />
        {d.validityExpired && <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", borderRadius: 999, padding: "2px 9px" }}>Validity expired</span>}
        <span style={{ fontSize: 12, color: "#64748b" }}>Created by {d.createdBy} · version {d.version}</span>
      </div>

      <h4 style={h4}>Header</h4>
      <div style={grid4}>
        <KV label="PO date" value={dateText(d.poDate)} />
        <KV label="Validity" value={`${dateText(d.validityStart)} → ${dateText(d.validityEnd)}`} />
        <KV label="Vendor" value={`${d.vendorName} (${d.vendorCode})`} />
        <KV label="Vendor GSTIN / state" value={`${d.vendorGstin || "—"} · ${d.vendorState || ""} ${d.vendorStateCode || ""}`} />
        <KV label="Department" value={deptName} />
        <KV label="Requester" value={d.requester} />
        <KV label="Company GSTIN / state" value={`${d.companyGstin || "—"} · ${d.companyStateCode}`} />
        <KV label="Place of supply" value={`${d.placeOfSupplyStateCode} (${d.supplyType})`} />
        <KV label="PR / quotation / contract" value={[d.prNumber, d.quotationReference, d.contractReference].filter(Boolean).join(" / ") || "Direct PO"} />
        <KV label="Service location" value={d.serviceLocation} />
        <KV label="Payment terms" value={d.paymentTerms} />
        <KV label="Currency" value={d.currency} />
      </div>

      <h4 style={h4}>Service scope</h4>
      <div style={grid4}>
        <KV label="Category" value={d.serviceCategory} />
        <KV label="Frequency / visits" value={`${(d.serviceFrequency || "").replace("_", " ")} · ${d.numberOfVisits ?? "—"}`} />
        <KV label="Service period" value={`${dateText(d.serviceStartDate)} → ${dateText(d.serviceCompletionDate)}`} />
        <KV label="Related asset" value={d.relatedAssetId} />
        <KV label="Scope of work" value={<span style={{ whiteSpace: "pre-wrap" }}>{d.scopeOfWork}</span>} />
        <KV label="Deliverables" value={<span style={{ whiteSpace: "pre-wrap" }}>{d.deliverables}</span>} />
        <KV label="Acceptance criteria" value={<span style={{ whiteSpace: "pre-wrap" }}>{d.acceptanceCriteria}</span>} />
        <KV label="SLA" value={<span style={{ whiteSpace: "pre-wrap" }}>{d.slaTerms}</span>} />
        <KV label="Warranty" value={d.warrantyTerms} />
        <KV label="Exclusions" value={d.exclusions} />
        <KV label="Special instructions" value={d.specialInstructions} />
      </div>

      <h4 style={h4}>Pricing and taxes</h4>
      <div style={grid4}>
        <KV label="Pricing method" value={(d.pricingMethod || "").replace(/_/g, " ")} />
        <KV label="Quantity × rate" value={d.quantity ? `${d.quantity} ${d.unitOfMeasure || ""} × ${money(d.rate)}` : "—"} />
        <KV label="Basic amount" value={money(d.basicAmount)} />
        <KV label="Discount" value={`${money(d.discountAmount)} (${d.discountType})`} />
        <KV label="Additional charges" value={money(d.additionalCharges)} />
        <KV label="Taxable value" value={money(d.taxableAmount)} />
        <KV label="SAC" value={`${d.sacCode} ${d.sacDescription || ""}`} />
        <KV label="GST taxability" value={`${d.gstTaxability}${d.reverseCharge ? " · reverse charge" : ""}`} />
        <KV label="CGST / SGST / IGST" value={d.supplyType === "INTRA" ? `${money(d.cgstAmount)} / ${money(d.sgstAmount)}` : money(d.igstAmount)} />
        <KV label="Cess" value={money(d.cessAmount)} />
        <KV label="Total GST" value={money(d.taxAmount)} />
        <KV label="Total PO value" value={<b>{money(d.totalAmount)} {d.currency}</b>} />
        <KV label="Advance / retention" value={`${money(d.advanceAmount)} / ${money(d.retentionAmount)}`} />
        <KV label="TDS" value={d.tdsApplicable ? `${d.tdsSection} @ ${d.tdsRate}% = ${money(d.tdsAmount)}` : "Not applicable"} />
        <KV label="Accepted (taxable)" value={money(d.acceptedAmount)} />
        <KV label="Invoiced (taxable)" value={money(d.invoicedAmount)} />
        <KV label="Remaining to accept / invoice" value={`${money(d.remainingToAccept)} / ${money(d.remainingToInvoice)}`} />
      </div>

      <h4 style={h4}>Schedule {d.scheduleEnabled ? `(${d.scheduleType})` : "(off: normal service dates)"}</h4>
      {d.schedules.length === 0 ? <Empty text="No planned occurrences or milestones." /> : (
        <Table headers={["#", "Date / due", "Planned qty", "Planned amount", "Description", "Schedule status", "Acceptance"]}>
          {d.schedules.map((s) => (
            <tr key={s.id}>
              <Td>{s.sequenceNo}</Td><Td>{dateText(s.scheduledDate || s.dueDate)}</Td><Td>{s.plannedQuantity ?? "—"}</Td>
              <Td right>{money(s.plannedAmount)}</Td><Td>{s.milestoneDescription || "—"}</Td><Td>{s.status}</Td><Td>{s.acceptanceStatus}</Td>
            </tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Service acceptance records</h4>
      {d.acceptances.length === 0 ? <Empty text="No service accepted yet." /> : (
        <Table headers={["Number", "Date", "Service performed", "Qty / hrs / visits", "Result", "Accepted", "Rejected", "By", "Remarks"]}>
          {d.acceptances.map((a) => (
            <tr key={a.id}>
              <Td>{a.acceptanceNumber}</Td><Td>{dateText(a.acceptanceDate)}</Td><Td>{a.servicePerformed}</Td>
              <Td>{[a.completedQuantity, a.completedHours, a.completedVisits].map((x) => x ?? "–").join(" / ")}</Td>
              <Td>{a.result}</Td><Td right>{money(a.acceptedAmount)}</Td><Td right>{money(a.rejectedAmount)}</Td>
              <Td>{a.acceptedBy}</Td><Td>{a.remarks || "—"}</Td>
            </tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Invoices (verified against PO and acceptance)</h4>
      {d.invoices.length === 0 ? <Empty text="No invoices recorded." /> : (
        <Table headers={["Invoice no.", "Date", "Taxable", "GST", "Total", "Recorded by"]}>
          {d.invoices.map((i) => (
            <tr key={i.id}>
              <Td>{i.invoiceNumber}</Td><Td>{dateText(i.invoiceDate)}</Td><Td right>{money(i.taxableAmount)}</Td>
              <Td right>{money(i.taxAmount)}</Td><Td right>{money(i.totalAmount)}</Td><Td>{i.recordedBy}</Td>
            </tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Terms</h4>
      <div style={grid4}>
        <KV label="Terms and conditions" value={<span style={{ whiteSpace: "pre-wrap" }}>{d.termsAndConditions}</span>} />
        <KV label="Cancellation / termination" value={<span style={{ whiteSpace: "pre-wrap" }}>{d.cancellationTerms}</span>} />
        <KV label="Internal remarks" value={d.internalRemarks} />
        <KV label="Cancel reason" value={d.cancelReason} />
      </div>

      <h4 style={h4}>Approval and status history</h4>
      {approvals.length === 0 ? <Empty text="No approval activity yet." /> : (
        <Table headers={["When", "Action", "From → To", "By (role)", "Comments"]}>
          {approvals.map((h) => (
            <tr key={h.id}>
              <Td>{formatDisplayDate(h.actedAt)}</Td><Td>{h.action}</Td>
              <Td>{h.fromStatus || "—"} → {h.toStatus || "—"}</Td>
              <Td>{h.actor} ({h.actorRole})</Td><Td>{h.comments || "—"}</Td>
            </tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Validity extensions</h4>
      {d.validityHistory.length === 0 ? <Empty text="Validity has not been extended." /> : (
        <Table headers={["Changed", "Old end", "New end", "By", "Reason"]}>
          {d.validityHistory.map((v) => (
            <tr key={v.id}><Td>{formatDisplayDate(v.changedAt)}</Td><Td>{dateText(v.oldValidityEnd)}</Td><Td>{dateText(v.newValidityEnd)}</Td><Td>{v.changedBy}</Td><Td>{v.reason}</Td></tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Amendment history</h4>
      {d.revisions.length === 0 ? <Empty text="No amendments." /> : (
        <Table headers={["Rev", "By", "Reason", "Changes"]}>
          {d.revisions.map((r) => (
            <tr key={r.id}><Td>{r.revisionNumber}</Td><Td>{r.changedBy}</Td><Td>{r.reason}</Td>
              <Td><code style={{ fontSize: 11 }}>{r.changesJson}</code></Td></tr>
          ))}
        </Table>
      )}

      <h4 style={h4}>Supporting documents</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {d.attachments.length === 0 && <Empty text="No attachments." />}
        {d.attachments.map((a) => (
          <div key={a.id} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
            <button style={{ ...btn(), padding: "3px 8px" }} onClick={() => download(a)}>Download</button>
            <span>{a.fileName}</span><span style={{ color: "#64748b", fontSize: 11 }}>{a.docType} · {Math.round(a.sizeBytes / 1024)} KB · {a.uploadedBy}</span>
          </div>
        ))}
        {(d.allowedActions || []).includes("ATTACH") && (
          <div>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" style={{ display: "none" }} onChange={upload} />
            <button style={btn()} disabled={uploading} onClick={() => fileRef.current && fileRef.current.click()}>{uploading ? "Uploading…" : "+ Attach service report / document"}</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

const h4 = { fontSize: 13, fontWeight: 800, color: "#0f172a", margin: "18px 0 8px", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 };
const grid4 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 };

function Empty({ text }) {
  return <div style={{ fontSize: 12, color: "#64748b", padding: "8px 0" }}>{text}</div>;
}

function Table({ headers, children }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {headers.map((h) => {
              const label = typeof h === "string" ? h : (h && h.label) || "";
              const align = isNumericHeader(label) ? "right" : "left";
              return (
                <th key={label} style={{ textAlign: align, padding: "7px 8px", borderBottom: "1px solid #e2e8f0", color: "#334155", whiteSpace: "nowrap" }}>
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, right }) {
  return <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: right ? "right" : "left", verticalAlign: "top" }}>{children}</td>;
}

// ============================================================================
// Register tab
// ============================================================================

const SORTABLE = [
  { key: "poNumber", label: "PO number" },
  { key: "poDate", label: "PO date" },
  { key: "vendorName", label: "Vendor" },
  { key: "serviceCategory", label: "Category" },
  { key: "validityEnd", label: "Validity end" },
  { key: "totalAmount", label: "Total PO amount" },
  { key: "status", label: "Status" }
];

const EMPTY_FILTERS = { q: "", vendorCode: "", department: "", category: "", status: "", invoiceStatus: "", fromDate: "", toDate: "" };

function RegisterTab({ user, refs, refreshToken, onView, onAction, onEdit, onAmend, onPrint, flash }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState({ key: "poDate", dir: "desc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const query = useCallback((p, size) => {
    const params = new URLSearchParams();
    const f = { ...filters, q: debouncedQ };
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set("page", String(p));
    params.set("size", String(size));
    params.set("sort", sort.key);
    params.set("dir", sort.dir);
    return `?${params.toString()}`;
  }, [filters, debouncedQ, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api("GET", query(page, pageSize), user));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize, user]);

  useEffect(() => { load(); }, [load, refreshToken]);
  useEffect(() => { setPage(0); }, [debouncedQ, filters.vendorCode, filters.department, filters.category, filters.status, filters.invoiceStatus, filters.fromDate, filters.toDate, sort]);
  useEffect(() => {
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const exportExcel = async () => {
    try {
      const rows = [];
      for (let p = 0; p < 50; p++) {
        const chunk = await api("GET", query(p, 100), user);
        rows.push(...chunk.content);
        if (chunk.content.length < 100) break;
      }
      const sheet = rows.map((r) => ({
        "PO Number": r.poNumber, "PO Date": dateText(r.poDate), "Vendor": r.vendorName,
        "Service Category": r.serviceCategory, "Service Description": r.serviceTitle,
        "Department": r.departmentName, "Service Start": dateText(r.serviceStartDate),
        "Expected Completion": dateText(r.serviceCompletionDate), "Validity End": dateText(r.validityEnd),
        "Basic Amount": Number(r.basicAmount), "Tax Amount": Number(r.taxAmount), "Total PO Amount": Number(r.totalAmount),
        "Accepted Amount (taxable)": Number(r.acceptedAmount), "Invoiced Amount (taxable)": Number(r.invoicedAmount),
        "Invoice / Payment Status": r.invoiceStatus, "PO Status": r.status, "Created By": r.createdBy
      }));
      const ws = XLSX.utils.json_to_sheet(sheet);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Service POs");
      XLSX.writeFile(wb, `Service_POs_${TODAY()}.xlsx`);
      flash(`Exported ${rows.length} Service PO(s).`);
    } catch (e) {
      flash(e.message, true);
    }
  };

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {error && <Banner kind="error">{error}</Banner>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 }}>
        <Field label="Search">
          <input style={inp} placeholder="PO no., vendor, description, category" value={filters.q} onChange={setF("q")} />
        </Field>
        <Field label="Vendor">
          <SearchableSelect value={filters.vendorCode} onChange={setF("vendorCode")} emptyLabel="All vendors"
            options={refs.vendors.map((v) => ({ value: v.supplierCode, label: v.supplierName, sub: v.supplierCode }))} />
        </Field>
        <Field label="Department">
          <SearchableSelect value={filters.department} onChange={setF("department")} emptyLabel="All departments"
            options={refs.departments.map((d) => ({ value: d.departmentName || d.name, label: d.departmentName || d.name }))} />
        </Field>
        <Field label="Category">
          <SearchableSelect value={filters.category} onChange={setF("category")} emptyLabel="All categories"
            options={refs.categories.map((c) => ({ value: c, label: c }))} />
        </Field>
        <Field label="PO status">
          <select style={inp} value={filters.status} onChange={setF("status")}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Payment / invoice status">
          <select style={inp} value={filters.invoiceStatus} onChange={setF("invoiceStatus")}>
            <option value="">All</option>
            {Object.entries(INVOICE_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="PO date from"><DateInput value={filters.fromDate} onChange={setF("fromDate")} style={inp} /></Field>
        <Field label="PO date to"><DateInput value={filters.toDate} onChange={setF("toDate")} style={inp} /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {loading ? "Loading…" : `${data.totalElements} Service PO(s)`}
          {" · "}
          <button style={{ ...btn(), padding: "2px 8px" }} onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn()} onClick={load}>Refresh</button>
          <button style={btn()} onClick={exportExcel}>Export Excel</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <table style={{ width: "100%", minWidth: 1500, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                ["poNumber", "PO number"], ["poDate", "PO date"], ["vendorName", "Vendor"], ["serviceCategory", "Category"],
                [null, "Service description"], [null, "Department"], [null, "Service start"], [null, "Expected completion"],
                ["validityEnd", "Validity end"], [null, "Basic"], [null, "Tax"], ["totalAmount", "Total PO amount"],
                [null, "Accepted (taxable)"], [null, "Invoiced (taxable)"], [null, "Payment status"], ["status", "PO status"],
                [null, "Created by"], [null, "Actions"]
              ].map(([key, label]) => (
                <th key={label} onClick={key ? () => toggleSort(key) : undefined}
                  style={{ textAlign: label.match(/Basic|Tax|amount|Accepted|Invoiced/) ? "right" : "left", padding: "8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", cursor: key ? "pointer" : "default", color: "#334155" }}>
                  {label}{key && sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.content.length === 0 && (
              <tr><td colSpan={18} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                {loading ? "Loading…" : "No Service POs match. Create one from the Create Service PO tab."}
              </td></tr>
            )}
            {data.content.map((r) => {
              const actions = (r.allowedActions || []).filter((a) => a !== "ATTACH" && a !== "MANAGE_SCHEDULE");
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <Td><button onClick={() => onView(r.id)} style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0 }}>{r.poNumber}</button></Td>
                  <Td>{dateText(r.poDate)}</Td>
                  <Td>{r.vendorName}</Td>
                  <Td>{r.serviceCategory}</Td>
                  <Td>{r.serviceTitle}</Td>
                  <Td>{r.departmentName}</Td>
                  <Td>{dateText(r.serviceStartDate)}</Td>
                  <Td>{dateText(r.serviceCompletionDate)}</Td>
                  <Td>
                    {dateText(r.validityEnd)}
                    {r.validityExpired && <div style={{ color: "#991b1b", fontSize: 10, fontWeight: 700 }}>Expired</div>}
                  </Td>
                  <Td right>{money(r.basicAmount)}</Td>
                  <Td right>{money(r.taxAmount)}</Td>
                  <Td right><b>{money(r.totalAmount)}</b></Td>
                  <Td right>{money(r.acceptedAmount)}</Td>
                  <Td right>{money(r.invoicedAmount)}</Td>
                  <Td><Badge map={INVOICE_STYLE} value={r.invoiceStatus} /></Td>
                  <Td><Badge map={STATUS_STYLE} value={r.status} /></Td>
                  <Td>{r.createdBy}</Td>
                  <Td>
                    <div style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
                      <button style={btn()} onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}>Actions ▾</button>
                      {openMenu === r.id && (
                        <div style={{ position: "absolute", right: 0, top: "110%", zIndex: 80, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 10px 24px rgba(15,23,42,0.18)", minWidth: 210, padding: 4 }}>
                          <MenuItem onClick={() => { setOpenMenu(null); onView(r.id); }}>View details</MenuItem>
                          <MenuItem onClick={() => { setOpenMenu(null); onPrint(r.id); }}>Print / download PDF</MenuItem>
                          {actions.length > 0 && <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />}
                          {actions.map((a) => (
                            <MenuItem key={a} danger={["REJECT", "CANCEL"].includes(a)}
                              onClick={() => {
                                setOpenMenu(null);
                                if (a === "EDIT") onEdit(r.id);
                                else if (a === "AMEND") onAmend(r.id);
                                else onAction(r, a);
                              }}>
                              {ACTION_LABEL[a] || a}
                            </MenuItem>
                          ))}
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
        <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#334155" }}>
          Rows per page
          <select style={{ ...inp, width: "auto" }} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
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
    <div onClick={onClick}
      style={{ padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 6, color: danger ? "#b91c1c" : "#0f172a" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      {children}
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export function ServicePurchaseOrderPage({ onBackToHome, onOpenSidebar, sidebarOpen, onNavigate }) {
  const [user, setUserState] = useState(loadUser);
  const [tab, setTab] = useState("register");
  const [formState, setFormState] = useState(null); // { editing, amendMode }
  const [detailId, setDetailId] = useState(null);
  const [actionState, setActionState] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refs, setRefs] = useState({ vendors: [], departments: [], categories: [], sacCodes: [] });
  const [toast, setToast] = useState(null);

  const setUser = (u) => { setUserState(u); saveUser(u); };

  const flash = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const reloadRefs = useCallback(async () => {
    const [vendors, departments, categories, sacCodes] = await Promise.all([
      plainGet("/vendors"),
      plainGet("/departments"),
      plainGet("/service-pos/categories"),
      plainGet("/service-pos/sac-codes")
    ]);
    setRefs({ vendors, departments, categories, sacCodes });
  }, []);

  useEffect(() => { reloadRefs(); }, [reloadRefs]);

  const bump = () => setRefreshToken((t) => t + 1);

  const openForm = async (editingId, amendMode) => {
    try {
      const d = editingId ? await api("GET", `/${editingId}`, user) : null;
      setFormState({ editing: d, amendMode });
      setDetailId(null);
      setTab("create");
    } catch (e) {
      flash(e.message, true);
    }
  };

  const openAction = (po, action) => {
    if (action === "EDIT") return openForm(po.id ?? po, false);
    if (action === "AMEND") return openForm(po.id ?? po, true);
    setActionState({ action, po });
    return undefined;
  };

  const handleAction = async (updated, message) => {
    setActionState(null);
    flash(message);
    bump();
    if (detailId) setDetailId(updated && updated.id ? updated.id : detailId);
  };

  const handleSaved = (d, message) => {
    setFormState(null);
    setTab("register");
    flash(message);
    bump();
    setDetailId(null);
  };

  const onPrint = async (id) => {
    try {
      const res = await fetch(`${SPO}/${id}/print`, { headers: { "X-User-Name": user.name, "X-User-Role": user.role } });
      if (!res.ok) throw new Error(`Print failed (HTTP ${res.status})`);
      const url = URL.createObjectURL(new Blob([await res.text()], { type: "text/html" }));
      window.open(url, "_blank");
    } catch (e) {
      flash(e.message, true);
    }
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => { if (key === "create" && !formState) setFormState({ editing: null, amendMode: false }); setTab(key); }}
      style={{
        background: tab === key ? "#3b82f6" : "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6,
        padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer"
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ height: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#f1f5f9", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: toast.isError ? "#dc2626" : "#10b981", color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", maxWidth: 420 }}>
          {toast.message}
        </div>
      )}

      {/* Header bar: tabs at the top, content below. Tabs switch in place. */}
      <div style={{ flexShrink: 0, background: "#1e293b", borderBottom: "1px solid #334155", padding: "8px 18px 8px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
            <div style={{ background: "#0284c7", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12 }}>SPO</div>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Service Purchase Order</span>
          </div>
          {tabBtn("create", formState && formState.editing ? "Edit Service PO" : formState && formState.amendMode ? "Amend Service PO" : "Create Service PO")}
          {tabBtn("register", "Service PO Register")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ color: "#94a3b8" }}>Acting as</span>
          <input style={{ ...inp, width: 150, padding: "4px 8px" }} value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} title="Current user (sent as X-User-Name)" />
          <select style={{ ...inp, width: 130, padding: "4px 8px" }} value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })} title="Role (sent as X-User-Role)">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={onOpenSidebar} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>{sidebarOpen ? "Hide menu" : "Menu"}</button>
          <span onClick={onBackToHome} style={{ cursor: "pointer", color: "#60a5fa", textDecoration: "underline", marginLeft: 6 }}>Home</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 0, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", boxSizing: "border-box", background: "#fff", border: "none", borderRadius: 0, padding: 16, overflowY: tab === "create" ? "auto" : "hidden" }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
            Purchase › Purchase Order › <b style={{ color: "#0f172a" }}>Service PO</b>
            <span style={{ marginLeft: 12 }}>No GRN is raised for a Service PO. Services are recorded through Service Acceptance.</span>
          </div>

          {tab === "create" && (
            formState ? (
              <CreateForm
                key={`${formState.editing ? formState.editing.id : "new"}-${formState.amendMode ? "amend" : "form"}`}
                user={user}
                refs={refs}
                reloadRefs={reloadRefs}
                editing={formState.editing}
                amendMode={formState.amendMode}
                flash={flash}
                onSaved={handleSaved}
                onCancel={() => { setFormState(null); setTab("register"); }}
              />
            ) : (
              <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                <button style={btn("primary")} onClick={() => setFormState({ editing: null, amendMode: false })}>Start a new Service PO</button>
              </div>
            )
          )}

          {tab === "register" && (
            <RegisterTab
              user={user}
              refs={refs}
              refreshToken={refreshToken}
              flash={flash}
              onView={(id) => setDetailId(id)}
              onAction={openAction}
              onEdit={(id) => openForm(id, false)}
              onAmend={(id) => openForm(id, true)}
              onPrint={onPrint}
            />
          )}
        </div>
      </div>

      {detailId && (
        <DetailView
          id={detailId}
          user={user}
          departments={refs.departments}
          flash={flash}
          onClose={() => setDetailId(null)}
          onAction={(d, action) => openAction(d, action)}
          onEdit={(d) => openForm(d.id, false)}
          onAmend={(d) => openForm(d.id, true)}
          onChanged={bump}
          refreshToken={refreshToken}
        />
      )}

      {actionState && (
        <ActionDialog
          state={actionState}
          user={user}
          onClose={() => setActionState(null)}
          onDone={(updated, message) => handleAction(updated, message)}
        />
      )}
    </div>
  );
}

export default ServicePurchaseOrderPage;
