import React, { useEffect, useState } from "react";
import { masterApi } from "../../masters/api";
import { inp, label, card, errorBox } from "./ui";

// Terms that can be set on a PO. Everything here is optional.
export const EMPTY_TERMS = {
  modeOfPaymentCode: "",
  paymentTermsCode: "",
  creditPeriodBasisCode: "",
  freightOptionCode: "",
  freightAmount: "",
  dispatchThrough: "",
  deliveryRequired: "",
  currency: "INR",
  conversionRate: "1",
  insurance: "",
  termsConditions: "",
  testCertificate: "",
  packingInstructions: "",
  transporter: "",
  bankers: "",
  warranty: "",
  kindAttention: "",
  dispatchTo: "",
  billTo: ""
};

// The four dropdowns and the master each one reads from. Options show their name only, never a meaning.
const DROPDOWNS = [
  { key: "modeOfPaymentCode", label: "Mode of payment", master: "mode-of-payment" },
  { key: "paymentTermsCode", label: "Payment terms", master: "payment-terms" },
  { key: "creditPeriodBasisCode", label: "Credit period calculation from", master: "credit-period-basis" },
  { key: "freightOptionCode", label: "Freight", master: "freight-options" }
];

const SHORT_FIELDS = [
  { key: "dispatchThrough", label: "Dispatch through" },
  { key: "deliveryRequired", label: "Delivery required", type: "date" },
  { key: "currency", label: "Currency" },
  { key: "conversionRate", label: "Conversion rate", type: "number" },
  { key: "insurance", label: "Insurance" },
  { key: "testCertificate", label: "Test certificate" },
  { key: "transporter", label: "Transporter" },
  { key: "bankers", label: "Bankers" },
  { key: "warranty", label: "Warranty" },
  { key: "kindAttention", label: "Kind attention" }
];

const LONG_FIELDS = [
  { key: "termsConditions", label: "Terms & conditions" },
  { key: "packingInstructions", label: "Packing instructions" },
  { key: "dispatchTo", label: "Dispatch to" },
  { key: "billTo", label: "Bill to" }
];

// Form values to request fields. Blank means "not given", so it is sent as null.
export function termsToRequest(t) {
  const text = (v) => (v && v.trim() ? v.trim() : null);
  const number = (v) => (v === "" || v == null ? null : Number(v));
  return {
    modeOfPaymentCode: text(t.modeOfPaymentCode),
    paymentTermsCode: text(t.paymentTermsCode),
    creditPeriodBasisCode: text(t.creditPeriodBasisCode),
    freightOptionCode: text(t.freightOptionCode),
    dispatchThrough: text(t.dispatchThrough),
    deliveryRequired: t.deliveryRequired || null,
    currency: text(t.currency),
    conversionRate: number(t.conversionRate),
    insurance: text(t.insurance),
    termsConditions: text(t.termsConditions),
    testCertificate: text(t.testCertificate),
    packingInstructions: text(t.packingInstructions),
    transporter: text(t.transporter),
    bankers: text(t.bankers),
    warranty: text(t.warranty),
    kindAttention: text(t.kindAttention),
    dispatchTo: text(t.dispatchTo),
    billTo: text(t.billTo)
  };
}

// The freight amount only applies when a freight option is chosen.
export function freightAmountOf(t) {
  return t.freightOptionCode && t.freightAmount !== "" ? Number(t.freightAmount) : null;
}

export default function PoTermsSection({ terms, onChange }) {
  const [options, setOptions] = useState({});
  const [optionError, setOptionError] = useState("");

  useEffect(() => {
    Promise.all(DROPDOWNS.map((d) => masterApi.list(d.master, false).then((rows) => [d.key, rows])))
      .then((pairs) => setOptions(Object.fromEntries(pairs)))
      .catch((e) => setOptionError(e.message));
  }, []);

  const set = (key, value) => onChange({ ...terms, [key]: value });
  const noMasterEntries = !optionError && DROPDOWNS.every((d) => (options[d.key] || []).length === 0) && Object.keys(options).length > 0;

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>PO terms</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        All optional. Choices come from Engineering &gt; Masters.
      </div>

      {optionError && <div style={{ ...errorBox, marginBottom: 10 }}>{optionError}</div>}
      {noMasterEntries && (
        <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
          The masters have no entries yet. Add them in Engineering &gt; Masters.
        </div>
      )}

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", alignItems: "end" }}>
        {DROPDOWNS.map((d) => (
          <div key={d.key}>
            <span style={label}>{d.label}</span>
            <select style={inp} value={terms[d.key]} onChange={(e) => set(d.key, e.target.value)}>
              <option value="">— Not selected —</option>
              {(options[d.key] || []).map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
            </select>
          </div>
        ))}
        {terms.freightOptionCode && (
          <div>
            <span style={label}>Freight amount</span>
            <input style={inp} type="number" min="0" step="0.01" placeholder="Optional" value={terms.freightAmount}
              onChange={(e) => set("freightAmount", e.target.value)} />
          </div>
        )}
      </div>

      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>More terms (optional)</summary>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginTop: 10 }}>
          {SHORT_FIELDS.map((f) => (
            <div key={f.key}>
              <span style={label}>{f.label}</span>
              <input style={inp} type={f.type || "text"} step={f.type === "number" ? "0.0001" : undefined} value={terms[f.key]}
                onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 10 }}>
          {LONG_FIELDS.map((f) => (
            <div key={f.key}>
              <span style={label}>{f.label}</span>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={terms[f.key]}
                onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
