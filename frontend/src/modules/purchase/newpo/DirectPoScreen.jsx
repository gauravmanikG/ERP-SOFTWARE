import React, { useState, useEffect } from "react";
import DateInput from "../../../shared/components/DateInput";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import SearchSelect from "./SearchSelect";
import { lookupApi, request } from "./api";
import { inp, label, btn, card, errorBox, th, thFor, td, money, qty, todayIso } from "./ui";
import PoTermsSection, { EMPTY_TERMS, termsToRequest, freightAmountOf } from "./PoTermsSection";
import DeliverySchedule, { scheduleProblem, scheduleRequest } from "./DeliverySchedule";

// Direct PO: items bought without a PR. These calls never read or change PR quantities.
const directPoApi = {
  preview: (body) => request("POST", "/direct/preview", null, body),
  create: (user, body) => request("POST", "/direct/purchase-orders", user, body),
  list: () => request("GET", "/direct/purchase-orders", null)
};

const vendorOption = (v) => ({ key: v.supplier_code, label: v.supplier_name, sub: v.supplier_code });
const itemOption = (i) => ({
  key: i.sms_new_part_no || `#${i.id}`,
  label: i.sms_new_part_no || `Item #${i.id}`,
  sub: `${i.item_type === "FG" ? "FG" : "Other"} · ${i.description_size || ""}`,
  hsn: i.hsn_code || ""
});

export default function DirectPoScreen({ user, flash, onCreated }) {
  const [vendor, setVendor] = useState(null);
  const [poDate, setPoDate] = useState(todayIso());
  const [expected, setExpected] = useState("");
  const [terms, setTerms] = useState(EMPTY_TERMS);
  const [item, setItem] = useState(null);
  const [itemQty, setItemQty] = useState("");
  const [hsn, setHsn] = useState("");
  const [lines, setLines] = useState([]);
  // Delivery schedule per item; the item's PO quantity is its line quantity
  const [schedules, setSchedules] = useState({});
  const scheduleItems = lines.map((l) => ({ itemCode: l.itemCode, itemName: l.sub || "", poQty: l.quantity }));
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [orders, setOrders] = useState([]);
  const [listError, setListError] = useState("");

  const loadOrders = () => directPoApi.list().then(setOrders).catch((e) => setListError(e.message));
  useEffect(() => { loadOrders(); }, []);

  const body = () => ({
    vendorCode: vendor.key,
    poDate,
    expectedDeliveryDate: expected || null,
    deliveryFreight: freightAmountOf(terms),
    terms: termsToRequest(terms),
    lines: lines.map((l) => ({ itemCode: l.itemCode, quantity: l.quantity, hsnCode: l.hsnCode || null }))
  });

  // Price on the server whenever the PO content changes.
  useEffect(() => {
    if (!vendor || lines.length === 0) { setPreview(null); setPreviewError(""); return; }
    directPoApi.preview(body())
      .then((p) => { setPreview(p); setPreviewError(""); })
      .catch((e) => { setPreview(null); setPreviewError(e.message); });
  }, [vendor, poDate, expected, lines, terms]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLine = () => {
    setAddError("");
    if (!item) return setAddError("Choose an item.");
    const q = Number(itemQty);
    if (!(q > 0)) return setAddError("Enter a quantity above zero.");
    if (lines.some((l) => l.itemCode === item.key)) return setAddError(`${item.key} is already on this PO.`);
    if (!hsn.trim()) return setAddError("Enter the HSN code for this item, or add it in Item Master.");
    setLines([...lines, { itemCode: item.key, sub: item.sub, quantity: q, hsnCode: hsn.trim() }]);
    setItem(null);
    setItemQty("");
    setHsn("");
  };

  const save = async () => {
    if (!vendor || lines.length === 0 || saving) return;
    if (poDate < todayIso()) {
      setSaveError("PO date cannot be in the past. Select today or a future date.");
      return;
    }
    const problem = scheduleProblem(scheduleItems, schedules, poDate);
    if (problem) {
      setSaveError(problem);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const created = await directPoApi.create(user, { ...body(), schedules: scheduleRequest(scheduleItems, schedules) });
      flash(`${created.poNumber} created for ${created.po.vendorName}. Grand total ${money(created.po.grandTotal)}.`);
      if (onCreated) onCreated(created.poNumber);
      setLines([]);
      setSchedules({});
      setTerms(EMPTY_TERMS);
      setPreview(null);
      loadOrders();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...card, display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 1fr) 160px 160px", alignItems: "end" }}>
        <div>
          <span style={label}>Vendor</span>
          <SearchSelect placeholder="Search vendor name or code" search={lookupApi.vendors} toOption={vendorOption}
            value={vendor} onChange={(v) => { setVendor(v); setLines([]); setSchedules({}); }} disabled={lines.length > 0} />
        </div>
        <div><span style={label}>PO date</span><DateInput style={inp} value={poDate} min={todayIso()} onChange={(e) => setPoDate(e.target.value)} /></div>
        <div><span style={label}>Expected delivery</span><DateInput style={inp} value={expected} onChange={(e) => setExpected(e.target.value)} /></div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Items (not linked to any PR)</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
          Every item in the Item Master, FG and other. The rate comes from Vendor Rate Master for this vendor on the PO date.
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(260px, 1fr) 140px 140px auto", alignItems: "end" }}>
          <div>
            <span style={label}>Item</span>
            <SearchSelect placeholder={vendor ? "Search part no. or description" : "Select a vendor first"} search={lookupApi.items}
              toOption={itemOption} value={item} onChange={(it) => { setItem(it); setHsn(it ? it.hsn : ""); }} disabled={!vendor} />
          </div>
          <div>
            <span style={label}>HSN</span>
            <input style={inp} value={hsn} onChange={(e) => setHsn(e.target.value)} disabled={!vendor} placeholder="HSN code" />
          </div>
          <div>
            <span style={label}>Quantity</span>
            <input style={inp} type="number" min="0" step="0.01" value={itemQty} onChange={(e) => setItemQty(e.target.value)} disabled={!vendor} />
          </div>
          <button type="button" style={btn(true)} onClick={addLine} disabled={!vendor}>Add item</button>
        </div>
        {addError && <div style={{ ...errorBox, marginTop: 10 }}>{addError}</div>}

        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["Item", "Description", "HSN", "Quantity", "Rate", "GST %", "Taxable", "GST", "Line total", ""].map((h) => <th key={h} style={thFor(h)}>{h}</th>)}</tr></thead>
            <tbody>
              {lines.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: "center", color: "#64748b", padding: 14 }}>No items added yet.</td></tr>}
              {lines.map((l) => {
                const p = preview && preview.lines.find((x) => x.itemCode === l.itemCode);
                return (
                  <tr key={l.itemCode}>
                    <td style={{ ...td, fontWeight: 700 }}>{l.itemCode}</td>
                    <td style={td}>{l.sub}</td>
                    <td style={td}>{l.hsnCode}</td>
                    <td style={{ ...td, textAlign: "right" }}>{qty(l.quantity)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{p ? money(p.unitRate) : "…"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{p ? `${qty(p.taxPercent)}%` : "…"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{p ? money(p.taxableAmount) : "…"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{p ? money(p.taxAmount) : "…"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{p ? money(p.itemTotal) : "…"}</td>
                    <td style={td}>
                      <button type="button" style={{ ...btn(false), padding: "2px 8px", fontSize: 11 }}
                        onClick={() => setLines(lines.filter((x) => x.itemCode !== l.itemCode))}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {lines.length > 0 && (
          <DeliverySchedule items={scheduleItems} schedules={schedules} onChange={setSchedules} poDate={poDate} />
        )}

        {lines.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <PoTermsSection terms={terms} onChange={setTerms} />
          </div>
        )}

        {previewError && <div style={{ ...errorBox, marginTop: 10 }}>{previewError}</div>}
        {preview && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, fontSize: 13, fontWeight: 800 }}>
            Grand total: {money(preview.grandTotal)}
          </div>
        )}
        {saveError && <div style={{ ...errorBox, marginTop: 10 }}>{saveError}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button type="button" style={btn(false)} onClick={() => { setLines([]); setSchedules({}); }} disabled={lines.length === 0 || saving}>Clear</button>
          <button type="button" style={btn(true)} onClick={save} disabled={!preview || saving || !!previewError}>
            {saving ? "Creating PO…" : "Create Direct PO"}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Direct POs</div>
        {listError && <div style={errorBox}>{listError}</div>}
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["PO", "Date", "Vendor", "Expected delivery", "Status", "Total"].map((h) => <th key={h} style={thFor(h)}>{h}</th>)}</tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#64748b" }}>No Direct POs yet.</td></tr>}
              {orders.map((o) => (
                <tr key={o.po_number}>
                  <td style={{ ...td, fontWeight: 700 }}>{o.po_number}</td>
                  <td style={td}>{formatDisplayDate(o.po_date)}</td>
                  <td style={td}>{o.vendor_name}</td>
                  <td style={td}>{o.expected_delivery ? formatDisplayDate(o.expected_delivery) : "—"}</td>
                  <td style={td}>{o.status}</td>
                  <td style={{ ...td, textAlign: "right" }}>{money(o.grand_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
