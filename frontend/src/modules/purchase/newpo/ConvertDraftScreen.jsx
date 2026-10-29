import React, { useEffect, useMemo, useState } from "react";
import DateInput from "../../../shared/components/DateInput";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { sourcingApi, poRegisterApi } from "./api";
import { money, qty, qtyStep, isCountedUnit, todayIso, COMPANY_BLOCK } from "./ui";
import { Frame, Chip, Empty, ErrorLine, toolBtn, smallBtn, thS, thR, tdS, tdR, numInput, fieldInput } from "./frame";
import PoTermsSection, { EMPTY_TERMS, termsToRequest, freightAmountOf } from "./PoTermsSection";
import DeliverySchedule, { scheduleProblem, scheduleRequest } from "./DeliverySchedule";
import { printPo } from "./printPo";

const EMPTY_HEADER = { otherCharges: "", roundOff: "", remarks: "" };
const num = (v) => (v === "" || v == null ? null : Number(v));

// Convert a vendor draft into a PO. The buyer chooses, per PR allocation, how much to purchase now: all of it, part of it,
// or none (left in the draft for a later PO). All PO fields (terms, freight, other charges, discounts, remarks,
// delivery schedule) are the same as before; only the way the PO is started has changed.
export default function ConvertDraftScreen({ draftNumber, user, flash, onBack, onNavigate }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [poDate, setPoDate] = useState(todayIso());

  const [checked, setChecked] = useState({});   // allocationId -> bool (default true)
  const [qtyIn, setQtyIn] = useState({});       // allocationId -> text (default = available draft qty)
  const [discPct, setDiscPct] = useState({});
  const [discAmt, setDiscAmt] = useState({});
  const [remark, setRemark] = useState({});
  const [header, setHeader] = useState(EMPTY_HEADER);
  const [terms, setTerms] = useState(EMPTY_TERMS);
  const [schedules, setSchedules] = useState({});
  // Printed PO header. Invoice To and Ship To start as our company block; the voucher number starts as the PO number.
  const [head, setHead] = useState({ invoiceTo: COMPANY_BLOCK, shipTo: COMPANY_BLOCK, voucherNo: "", referenceNo: "" });
  const [dueIn, setDueIn] = useState({});       // allocationId -> Due On (ISO); defaults to the PO date
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    if (data && !head.voucherNo && data.nextPoNumber) setHead((h) => ({ ...h, voucherNo: data.nextPoNumber, referenceNo: h.referenceNo || data.nextPoNumber }));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [created, setCreated] = useState(null);

  // Lines are priced with the vendor rate effective on the PO date, so they are read again when the date changes.
  useEffect(() => {
    setLoadError("");
    sourcingApi.conversionLines(draftNumber, poDate).then(setData).catch((e) => setLoadError(e.message));
  }, [draftNumber, poDate]);

  const lines = data ? data.lines : [];

  const state = (l) => {
    const id = l.allocationId;
    const isOn = l.unitRate != null && !l.taxIssue && (checked[id] ?? true);
    const text = qtyIn[id] ?? String(l.availableDraftQty);
    const q = isOn ? Number(text) || 0 : 0;
    let problem = "";
    if (isOn) {
      if (!(q > 0)) problem = "Enter a quantity above zero, or untick the line";
      else if (q > Number(l.availableDraftQty) + 1e-9) problem = `At most ${qty(l.availableDraftQty)} is available in the draft`;
      else if (isCountedUnit(l.uom) && !Number.isInteger(q) && Math.abs(q - Number(l.availableDraftQty)) > 1e-9) problem = `${l.uom} must be whole numbers`;
      else if (Math.round(q * 100) / 100 !== q) problem = "At most 2 decimals";
    }
    return { isOn, text, q, problem };
  };

  const plannedByItem = useMemo(() => {
    const m = {};
    (preview?.lines || []).forEach((p) => { m[p.itemCode] = p; });
    return m;
  }, [preview]);

  const rows = lines.map((l) => {
    const s = state(l);
    const id = l.allocationId;
    const taxPct = plannedByItem[l.itemCode]?.taxPercent ?? l.gstRatePercent ?? 0;
    const gross = s.q * Number(l.unitRate || 0);
    const disc = Math.min(gross, gross * ((num(discPct[id]) || 0) / 100) + (num(discAmt[id]) || 0));
    const taxable = gross - disc;
    const total = taxable + taxable * (Number(taxPct) / 100);
    return { l, s, taxPct, total };
  });

  const buying = rows.filter((r) => r.s.isOn && r.s.q > 0);
  const anyProblem = rows.find((r) => r.s.problem);
  const leftInDraft = rows.reduce((sum, r) => sum + (Number(r.l.availableDraftQty) - r.s.q), 0);

  const scheduleItems = useMemo(() => {
    const byItem = new Map();
    buying.forEach((r) => {
      const cur = byItem.get(r.l.itemCode) || { itemCode: r.l.itemCode, itemName: r.l.itemName, poQty: 0 };
      cur.poQty += r.s.q;
      byItem.set(r.l.itemCode, cur);
    });
    return [...byItem.values()];
  }, [buying.map((r) => `${r.l.itemCode}:${r.s.q}`).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const dueOf = (r) => dueIn[r.l.allocationId] || poDate;

  const buildRequest = () => ({
    poDate,
    remarks: header.remarks.trim() || null,
    deliveryFreight: freightAmountOf(terms),
    otherCharges: num(header.otherCharges),
    roundOff: num(header.roundOff),
    terms: termsToRequest(terms),
    schedules: scheduleRequest(scheduleItems, schedules),
    invoiceTo: head.invoiceTo.trim(),
    shipTo: head.shipTo.trim(),
    voucherNo: head.voucherNo.trim() || null,
    referenceNo: head.referenceNo.trim(),
    referenceDate: poDate,
    lines: buying.map((r) => ({
      allocationId: r.l.allocationId,
      quantity: r.s.q,
      discountPercent: num(discPct[r.l.allocationId]),
      manualDiscount: num(discAmt[r.l.allocationId]),
      remarks: (remark[r.l.allocationId] || "").trim() || null,
      dueOn: dueOf(r)
    }))
  });

  const headerProblem = !head.invoiceTo.trim() ? "Invoice To is required."
    : !head.shipTo.trim() ? "Ship To is required."
    : !head.referenceNo.trim() ? "Reference No is required."
    : "";
  const scheduleIssue = scheduleProblem(scheduleItems, schedules, poDate);
  const requestKey = JSON.stringify(buildRequest());
  const canPrice = !!data && buying.length > 0 && !anyProblem && poDate >= todayIso() && !scheduleIssue && !headerProblem;

  // Exact pricing and tax from the server. The preview saves nothing and moves no quantity.
  useEffect(() => {
    if (!canPrice) { setPreview(null); setPreviewError(""); return undefined; }
    const t = setTimeout(() => {
      sourcingApi.preview(draftNumber, JSON.parse(requestKey))
        .then((p) => { setPreview(p); setPreviewError(""); })
        .catch((e) => { setPreview(null); setPreviewError(e.message); });
    }, 450);
    return () => clearTimeout(t);
  }, [canPrice, requestKey, draftNumber]);

  const setAll = (on) => {
    const c = {}, qd = {};
    lines.forEach((l) => { c[l.allocationId] = on && l.unitRate != null && !l.taxIssue; qd[l.allocationId] = String(l.availableDraftQty); });
    setChecked(c);
    setQtyIn(qd);
  };

  const create = async () => {
    if (saving || !canPrice) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await sourcingApi.convert(user, draftNumber, buildRequest());
      setCreated(res);
      flash(`${res.poNumber} created for ${res.po.vendorName}. Grand total ${money(res.po.grandTotal)}.`);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const crumb = [
    { label: "Purchase" },
    { label: "Draft Purchase Orders", onClick: onBack },
    { label: `Convert ${draftNumber}` }
  ];

  // ------------------------------------------------------------ after the PO is created
  if (created) {
    const d = created.draft;
    const remaining = Number(d.openQty);
    return (
      <Frame user={user} crumb={crumb} actions={<button type="button" style={toolBtn(false)} onClick={onBack}>← Back to Draft POs</button>}>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 24, background: "#f4f6fb" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 28 }}>
            <div style={{ fontSize: 13, color: "#059669", fontWeight: 800, marginBottom: 4 }}>✓ Purchase order created</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{created.poNumber}</div>
            <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>
              {created.po.vendorName} · {created.po.lines.length} item{created.po.lines.length === 1 ? "" : "s"} · grand total <b>{money(created.po.grandTotal)}</b>
            </div>

            <div style={{ marginTop: 18, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ ...thS, position: "static" }}>PR allocation</th><th style={{ ...thS, position: "static" }}>Item</th><th style={{ ...thR, position: "static" }}>Ordered on this PO</th></tr></thead>
                <tbody>
                  {created.po.allocations.map((a) => (
                    <tr key={a.prItemId}><td style={{ ...tdS, fontWeight: 700 }}>{a.prNumber}</td><td style={tdS}>{a.itemCode}</td><td style={tdR}>{qty(a.allocatedQty)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: remaining > 0 ? "#f5f3ff" : "#f0fdf4", border: `1px solid ${remaining > 0 ? "#ddd6fe" : "#bbf7d0"}`, fontSize: 13, color: remaining > 0 ? "#5b21b6" : "#166534" }}>
              {remaining > 0
                ? <><b>{qty(remaining)}</b> is still in {d.draftNumber}. Convert it later, or release it to sourcing to choose a different vendor.</>
                : <>{d.draftNumber} is now closed: everything in it has been ordered.</>}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
              {remaining > 0 && <button type="button" style={toolBtn(false)} onClick={onBack}>Back to Draft POs</button>}
              <button type="button" style={toolBtn(false)} onClick={async () => {
                try { printPo(await poRegisterApi.detail(created.poNumber)); } catch (e) { flash(e.message, true); }
              }}>Print PO</button>
              <button type="button" style={toolBtn(false)} onClick={() => onNavigate && onNavigate("new-po-po-register")}>View in PO Register</button>
              <button type="button" style={toolBtn(true)} onClick={() => onNavigate && onNavigate("grn")}>Receive goods (GRN) →</button>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  // ------------------------------------------------------------ the conversion screen
  const v = data?.vendor;
  const total = preview ? preview.grandTotal : null;

  return (
    <Frame
      user={user}
      crumb={crumb}
      actions={(
        <>
          <button type="button" style={toolBtn(false)} onClick={onBack}>← Back</button>
          <button type="button" style={{ ...toolBtn(true), opacity: !canPrice || saving || !!previewError || !preview ? 0.55 : 1 }} disabled={!canPrice || saving || !!previewError || !preview} onClick={create}>
            {saving ? "Creating PO…" : "Create purchase order"}
          </button>
          <span style={{ color: "#e2e8f0", margin: "0 4px", fontSize: 18 }}>|</span>
          <button type="button" style={toolBtn(false)} onClick={() => setAll(true)} disabled={!data}>Purchase all available</button>
          <button type="button" style={toolBtn(false)} onClick={() => setAll(false)} disabled={!data}>Select none</button>
        </>
      )}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16, background: "#f4f6fb", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, alignContent: "start" }}>
        {loadError && <ErrorLine>{loadError}</ErrorLine>}
        {!data && !loadError && <Empty>Loading {draftNumber}…</Empty>}

        {data && (
          <>
            {/* Vendor, prominent at the top */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: "5px solid #1e293b", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>Vendor</div>
                <div style={{ fontSize: 21, fontWeight: 900, color: "#0f172a", lineHeight: 1.2 }}>{v.vendorName}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  {v.vendorCode}{v.gstin ? ` · GSTIN ${v.gstin}` : ""}{v.state ? ` · ${v.state}` : ""}{v.paymentTerms ? ` · Payment ${v.paymentTerms}` : ""}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{[v.address, v.city, v.contactPerson, v.phone, v.email].filter(Boolean).join(" · ")}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>PO number</div>
                <div style={{ fontSize: 21, fontWeight: 900, color: "#1e3a8a", lineHeight: 1.2 }}>{data.nextPoNumber}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>From draft {data.draftNumber} · assigned when saved</div>
              </div>
            </div>

            {data.draftStatus !== "OPEN" && <ErrorLine>This draft is closed. Nothing is left in it to convert.</ErrorLine>}
            {data.missingRates.length > 0 && (
              <ErrorLine>
                No rate for {data.missingRates.join(", ")} from {v.vendorName} is effective on {formatDisplayDate(poDate)}. Add it in Vendor Rate Master first; those lines cannot be purchased.
              </ErrorLine>
            )}

            {lines.filter((l) => l.taxIssue).length > 0 && (
              <ErrorLine>
                {[...new Set(lines.filter((l) => l.taxIssue).map((l) => `${l.itemCode}: ${l.taxIssue}`))].join(". ")}.
                These lines cannot be purchased until the item or HSN master is fixed.
              </ErrorLine>
            )}

            {/* PR allocations */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>PR allocations in this draft</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Tick what to purchase now and set the quantity. A line left unticked, or at zero, stays in the draft for a later PO.
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#475569", textAlign: "right" }}>
                  Purchasing now <b>{buying.length}</b> of {lines.length} lines · staying in draft <b>{qty(Math.max(0, leftInDraft))}</b>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1500 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thS, position: "static", width: 36 }}>Select</th>
                      {["PR number", "Department", "Item"].map((h) => <th key={h} style={{ ...thS, position: "static" }}>{h}</th>)}
                      {["Original PR qty", "Remaining to order", "Available in draft", "Purchasing qty"].map((h) => <th key={h} style={{ ...thR, position: "static" }}>{h}</th>)}
                      {["Unit", "HSN"].map((h) => <th key={h} style={{ ...thS, position: "static" }}>{h}</th>)}
                      {["Unit rate", "Tax", "Total", "Discount %", "Discount amt"].map((h) => <th key={h} style={{ ...thR, position: "static" }}>{h}</th>)}
                      <th style={{ ...thS, position: "static" }}>Due on</th>
                      <th style={{ ...thS, position: "static" }}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={16}><Empty>Nothing open in this draft.</Empty></td></tr>}
                    {rows.map(({ l, s, taxPct, total: lineTotal }) => {
                      const id = l.allocationId;
                      const noRate = l.unitRate == null;
                      const blocked = noRate || !!l.taxIssue;
                      return (
                        <tr key={id} style={{ background: s.isOn ? "#ffffff" : "#f8fafc", opacity: blocked ? 0.6 : 1 }}>
                          <td style={{ ...tdS, textAlign: "center" }}>
                            <input type="checkbox" checked={s.isOn} disabled={blocked} onChange={(e) => setChecked({ ...checked, [id]: e.target.checked })} />
                          </td>
                          <td style={{ ...tdS, fontWeight: 700, whiteSpace: "nowrap" }}>{l.prNumber}</td>
                          <td style={{ ...tdS, whiteSpace: "nowrap" }}>{l.department || "—"}</td>
                          <td style={{ ...tdS, minWidth: 190 }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{l.itemCode}</div>
                            <div style={{ fontSize: 11.5, color: "#64748b" }}>{l.itemName}</div>
                          </td>
                          <td style={tdR}>{qty(l.originalPrQty)}</td>
                          <td style={tdR}>{qty(l.remainingToOrderQty)}</td>
                          <td style={{ ...tdR, fontWeight: 700 }}>{qty(l.availableDraftQty)}</td>
                          <td style={tdR}>
                            <input
                              type="number" min="0" step={qtyStep(l.uom)} max={l.availableDraftQty}
                              disabled={!s.isOn} value={s.isOn ? s.text : "0"}
                              onChange={(e) => setQtyIn({ ...qtyIn, [id]: e.target.value })}
                              style={{ ...numInput, borderColor: s.problem ? "#ef4444" : "#cbd5e1", background: s.isOn ? "#fff" : "#f1f5f9" }}
                            />
                            {s.problem && <div style={{ fontSize: 10.5, color: "#dc2626", marginTop: 2, maxWidth: 150, marginLeft: "auto" }}>{s.problem}</div>}
                          </td>
                          <td style={tdS}>{l.uom}</td>
                          <td style={tdS}>{l.hsnCode || "—"}</td>
                          <td style={tdR}>{noRate ? <Chip tone="amber">No rate</Chip> : money(l.unitRate)}</td>
                          <td style={tdR}>{l.taxIssue ? <Chip tone="red" title={l.taxIssue}>No HSN/GST</Chip> : noRate ? "—" : `${qty(taxPct)}%`}</td>
                          <td style={{ ...tdR, fontWeight: 800 }}>{s.q > 0 ? money(lineTotal) : "—"}</td>
                          <td style={tdR}>
                            <input type="number" min="0" max="100" step="0.01" disabled={!s.isOn} value={discPct[id] ?? ""} onChange={(e) => setDiscPct({ ...discPct, [id]: e.target.value })} style={{ ...numInput, width: 70, fontWeight: 500 }} />
                          </td>
                          <td style={tdR}>
                            <input type="number" min="0" step="0.01" disabled={!s.isOn} value={discAmt[id] ?? ""} onChange={(e) => setDiscAmt({ ...discAmt, [id]: e.target.value })} style={{ ...numInput, width: 84, fontWeight: 500 }} />
                          </td>
                          <td style={{ ...tdS, whiteSpace: "nowrap" }}>
                            <DateInput disabled={!s.isOn} style={{ ...fieldInput, width: 130, padding: "5px 8px" }} value={dueOf({ l })} min={poDate}
                              onChange={(e) => e.target.value && setDueIn({ ...dueIn, [id]: e.target.value })} />
                          </td>
                          <td style={tdS}>
                            <input disabled={!s.isOn} value={remark[id] ?? ""} placeholder="Remark" onChange={(e) => setRemark({ ...remark, [id]: e.target.value })} style={{ ...fieldInput, width: 160, padding: "5px 8px" }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {buying.length > 0 && <DeliverySchedule items={scheduleItems} schedules={schedules} onChange={setSchedules} poDate={poDate} />}

            {/* PO Terms: hidden until the arrow is opened. Invoice To, Ship To, voucher, reference and the other PO details live here. */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
              <button type="button" onClick={() => setTermsOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                {termsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>PO Terms</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>Invoice to, ship to, voucher, reference, payment and freight terms, other charges</span>
              </button>
              {termsOpen && (
                <div style={{ padding: "0 16px 16px", display: "grid", gap: 14 }}>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    <div>
                      <div style={labelStyle}>Invoice To *</div>
                      <textarea style={{ ...fieldInput, minHeight: 110, fontFamily: "inherit" }} value={head.invoiceTo} onChange={(e) => setHead({ ...head, invoiceTo: e.target.value })} />
                    </div>
                    <div>
                      <div style={labelStyle}>Ship To *</div>
                      <textarea style={{ ...fieldInput, minHeight: 110, fontFamily: "inherit" }} value={head.shipTo} onChange={(e) => setHead({ ...head, shipTo: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                    <div>
                      <div style={labelStyle}>Voucher No *</div>
                      <input style={fieldInput} value={head.voucherNo} onChange={(e) => setHead({ ...head, voucherNo: e.target.value })} />
                    </div>
                    <div>
                      <div style={labelStyle}>Dated (PO date) *</div>
                      <DateInput style={fieldInput} value={poDate} min={todayIso()} onChange={(e) => e.target.value && setPoDate(e.target.value)} />
                    </div>
                    <div>
                      <div style={labelStyle}>Reference No *</div>
                      <input style={fieldInput} value={head.referenceNo} placeholder="Customer or quotation reference" onChange={(e) => setHead({ ...head, referenceNo: e.target.value })} />
                    </div>
                  </div>

                  <PoTermsSection terms={terms} onChange={setTerms} embedded />

                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    <div>
                      <div style={labelStyle}>Other charges</div>
                      <input style={fieldInput} type="number" min="0" step="0.01" value={header.otherCharges} onChange={(e) => setHeader({ ...header, otherCharges: e.target.value })} />
                    </div>
                    <div>
                      <div style={labelStyle}>Round off</div>
                      <input style={fieldInput} type="number" step="0.01" value={header.roundOff} onChange={(e) => setHeader({ ...header, roundOff: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>PO remark</div>
                    <input style={fieldInput} placeholder="Remark for the whole PO" value={header.remarks} onChange={(e) => setHeader({ ...header, remarks: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            {headerProblem && <ErrorLine>{headerProblem}</ErrorLine>}
            {anyProblem && <ErrorLine>{anyProblem.l.prNumber} / {anyProblem.l.itemCode}: {anyProblem.s.problem}.</ErrorLine>}
            {poDate < todayIso() && <ErrorLine>PO date cannot be in the past.</ErrorLine>}
            {scheduleIssue && <ErrorLine>{scheduleIssue}</ErrorLine>}
            {previewError && <ErrorLine>{previewError}</ErrorLine>}
            {saveError && <ErrorLine>{saveError}</ErrorLine>}

            {preview && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, minWidth: 340, display: "grid", gap: 5, fontSize: 12.5 }}>
                  <Total k="Items (gross)" v={money(preview.itemsGross)} />
                  <Total k="Discount" v={money(preview.totalDiscount)} />
                  <Total k="Taxable amount" v={money(preview.taxableAmount)} />
                  <Total k="Total GST" v={money(preview.totalTax)} />
                  <Total k="Delivery charges" v={money(preview.deliveryCharges)} />
                  <Total k="Other charges" v={money(preview.otherCharges)} />
                  <Total k="Round off" v={money(preview.roundOff)} />
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: 7, marginTop: 3, fontSize: 15, fontWeight: 900 }}>
                    <span>Grand total</span><span>{money(total)}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingBottom: 8 }}>
              <button type="button" style={toolBtn(false)} onClick={onBack} disabled={saving}>Cancel</button>
              <button type="button" style={{ ...toolBtn(true), opacity: !canPrice || saving || !!previewError || !preview ? 0.55 : 1 }} disabled={!canPrice || saving || !!previewError || !preview} onClick={create}>
                {saving ? "Creating PO…" : "Create purchase order"}
              </button>
            </div>
          </>
        )}
      </div>
    </Frame>
  );
}

const labelStyle = { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 };

function Total({ k, v }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}><span style={{ color: "#475569" }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span></div>;
}