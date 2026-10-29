import React, { useState, useEffect, useCallback } from "react";
import DateInput from "../../../shared/components/DateInput";
import { formatDisplayDate, formatDisplayDateTime } from "../../../shared/utils/dateFormat";
import SearchSelect from "./SearchSelect";
import { lookupApi, vendorRateApi } from "./api";
import { inp, label, btn, card, errorBox, th, thFor, td, money } from "./ui";

const searchVendors = lookupApi.vendors;
const searchItems = lookupApi.items;
const vendorOption = (v) => ({ key: v.supplier_code, label: v.supplier_name, sub: v.supplier_code });
const itemOption = (i) => ({ key: i.id, label: i.sms_new_part_no || `Item #${i.id}`, sub: `${i.item_type === "FG" ? "FG" : "Other"} · ${i.description_size || ""}` });

export default function VendorRateMasterScreen({ user, flash }) {
  const [vendor, setVendor] = useState(null);
  const [item, setItem] = useState(null);
  const [price, setPrice] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [applicable, setApplicable] = useState(null);

  const [filterVendor, setFilterVendor] = useState(null);
  const [filterItem, setFilterItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    setHistoryError("");
    vendorRateApi.history(user, { supplierCode: filterVendor?.key, itemId: filterItem?.key })
      .then(setHistory)
      .catch((e) => setHistoryError(e.message))
      .finally(() => setHistoryLoading(false));
  }, [user, filterVendor, filterItem]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Show the rate that would apply on the chosen effective date before the user saves.
  useEffect(() => {
    if (!vendor || !item || !effectiveFrom) { setApplicable(null); return; }
    vendorRateApi.effective(user, vendor.key, item.key, effectiveFrom)
      .then(setApplicable)
      .catch(() => setApplicable(null));
  }, [vendor, item, effectiveFrom, user]);

  const reset = () => { setItem(null); setPrice(""); setEffectiveFrom(""); setFormError(""); };

  const save = async () => {
    setFormError("");
    const p = Number(price);
    if (!vendor) return setFormError("Select a vendor.");
    if (!item) return setFormError("Select an item.");
    if (!price || !(p > 0)) return setFormError("Offered unit price must be greater than zero.");
    if (!effectiveFrom) return setFormError("Effective From date is required.");
    setSaving(true);
    try {
      await vendorRateApi.create(user, { supplierCode: vendor.key, itemId: item.key, offeredUnitPrice: p, effectiveFrom });
      flash(`Rate ${money(p)} saved for ${vendor.label} / ${item.label} from ${formatDisplayDate(effectiveFrom)}.`);
      reset();
      loadHistory();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(300px, 360px) minmax(0, 1fr)", alignItems: "start", minWidth: 0, width: "100%", boxSizing: "border-box" }}>
      <div style={{ ...card, minWidth: 0, boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Add vendor rate</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
          Each save creates a new historical rate. Earlier rates are never changed or removed.
        </div>

        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <span style={label}>Vendor</span>
            <SearchSelect placeholder="Search vendor name or code" search={searchVendors} toOption={vendorOption} value={vendor} onChange={setVendor} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={label}>Item</span>
            <SearchSelect placeholder="Search part no. or description" search={searchItems} toOption={itemOption} value={item} onChange={setItem} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={label}>Offered unit price (₹)</span>
            <input style={{ ...inp, width: "100%", boxSizing: "border-box" }} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={label}>Effective from</span>
            <DateInput style={{ ...inp, width: "100%", boxSizing: "border-box" }} value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>

          {applicable && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#166534", minWidth: 0, wordBreak: "break-word" }}>
              {applicable.found
                ? <>Rate in force on {formatDisplayDate(effectiveFrom)}: <b>{money(applicable.rate.offered_unit_price)}</b> (effective {formatDisplayDate(applicable.rate.effective_from)})</>
                : <>No rate is effective for this vendor and item on {formatDisplayDate(effectiveFrom)}.</>}
            </div>
          )}

          {formError && <div style={{ ...errorBox, minWidth: 0, wordBreak: "break-word" }}>{formError}</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={reset} style={btn(false)} disabled={saving}>Clear</button>
            <button type="button" onClick={save} style={btn(true)} disabled={saving}>{saving ? "Saving…" : "Save rate"}</button>
          </div>
        </div>
      </div>

      <div style={{ ...card, minWidth: 0, boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Rate history</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Newest effective date first.</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
            <div style={{ width: 220, minWidth: 0, maxWidth: "100%" }}>
              <span style={label}>Vendor</span>
              <SearchSelect placeholder="All vendors" search={searchVendors} toOption={vendorOption} value={filterVendor} onChange={setFilterVendor} />
            </div>
            <div style={{ width: 220, minWidth: 0, maxWidth: "100%" }}>
              <span style={label}>Item</span>
              <SearchSelect placeholder="All items" search={searchItems} toOption={itemOption} value={filterItem} onChange={setFilterItem} />
            </div>
            {(filterVendor || filterItem) && <button type="button" style={btn(false)} onClick={() => { setFilterVendor(null); setFilterItem(null); }}>Clear filters</button>}
          </div>
        </div>

        {historyError && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{historyError}</div>}

        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Vendor", "Item", "Unit price", "Effective from", "Entered by", "Entered at"].map((h) => (
                  <th key={h} style={thFor(h)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyLoading && <tr><td colSpan={6} style={{ ...td, padding: 16, textAlign: "center", color: "#64748b" }}>Loading rate history…</td></tr>}
              {!historyLoading && !historyError && history.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, padding: 16, textAlign: "center", color: "#64748b" }}>No vendor rates recorded yet{filterVendor || filterItem ? " for these filters" : ""}.</td></tr>
              )}
              {!historyLoading && history.map((r) => (
                <tr key={r.id}>
                  <td style={td}><div style={{ fontWeight: 700, color: "#0f172a" }}>{r.supplier_name}</div><div style={{ color: "#64748b" }}>{r.supplier_code}</div></td>
                  <td style={td}><div style={{ fontWeight: 700, color: "#0f172a" }}>{r.sms_new_part_no || `Item #${r.item_id}`}</div><div style={{ color: "#64748b" }}>{r.description_size}</div></td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(r.offered_unit_price)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{formatDisplayDate(r.effective_from)}</td>
                  <td style={td}>{r.created_by}</td>
                  <td style={{ ...td, whiteSpace: "nowrap", color: "#64748b" }}>{formatDisplayDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
