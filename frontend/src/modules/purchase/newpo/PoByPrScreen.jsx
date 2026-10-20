import React, { useState, useEffect, useMemo } from "react";
import DateInput from "../../../shared/components/DateInput";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import SearchSelect from "./SearchSelect";
import { lookupApi, poByPrApi } from "./api";
import { inp, label, btn, card, errorBox, th, td, money, qty, todayIso } from "./ui";

const vendorOption = (v) => ({ key: v.supplier_code, label: v.supplier_name, sub: v.supplier_code });
// Items that are present on at least one approved PR with outstanding quantity (from the PR lines only).
const itemOption = (r) => ({
  key: r.item_code,
  label: r.item_code,
  sub: `${r.item_name || ""} · ${r.pr_count} PR${r.pr_count === 1 ? "" : "s"} · ${qty(r.outstanding_qty)} outstanding`,
  prCount: Number(r.pr_count)
});

const FULL = "FULL";
const PARTIAL = "PARTIAL";

// Only the server decides quantities, prices and tax. The screen collects choices and displays results.
export default function PoByPrScreen({ user, flash }) {
  const [vendor, setVendor] = useState(null);
  const [poDate, setPoDate] = useState(todayIso());
  const [mode, setMode] = useState(FULL);
  const [item, setItem] = useState(null);

  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [linesError, setLinesError] = useState("");
  const [selected, setSelected] = useState({});
  const [qtyInput, setQtyInput] = useState({});

  const [basket, setBasket] = useState([]);
  const [addError, setAddError] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load the outstanding lines of the chosen PR, priced for this vendor on the PO date.
  useEffect(() => {
    if (!vendor || !item) { setLines([]); return; }
    setLinesLoading(true);
    setLinesError("");
    setSelected({});
    poByPrApi.eligibleLines(item.key, vendor.key, poDate)
      .then((rows) => {
        setLines(rows);
        setQtyInput(Object.fromEntries(rows.map((r) => [r.prItemId, String(r.remainingQty)])));
      })
      .catch((e) => setLinesError(e.message))
      .finally(() => setLinesLoading(false));
  }, [vendor, item, poDate]);

  // Re-price the whole basket on the server whenever it changes.
  useEffect(() => {
    if (!vendor || basket.length === 0) { setPreview(null); setPreviewError(""); return; }
    poByPrApi.preview(buildRequest(vendor, poDate, basket))
      .then((p) => { setPreview(p); setPreviewError(""); })
      .catch((e) => { setPreview(null); setPreviewError(e.message); });
  }, [vendor, poDate, basket]);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const addSelected = () => {
    setAddError("");
    if (selectedIds.length === 0) return setAddError("Tick at least one PR line to add.");
    const next = [...basket];
    for (const id of selectedIds) {
      const line = lines.find((l) => String(l.prItemId) === id);
      if (!line) continue;
      if (line.unitPrice == null) {
        return setAddError(`PR ${line.prNumber} / ${line.itemCode}: no vendor rate for ${vendor ? vendor.label : "this vendor"} is effective on ${formatDisplayDate(poDate)}. Add the rate in Vendor Rate Master, then try again.`);
      }
      if (next.some((b) => b.prItemId === line.prItemId)) {
        return setAddError(`PR ${line.prNumber} / ${line.itemCode} is already in this PO.`);
      }
      let quantity = line.remainingQty;
      if (mode === PARTIAL) {
        const typed = Number(qtyInput[id]);
        if (!(typed > 0)) return setAddError(`Enter a purchase quantity above zero for ${line.prNumber}.`);
        if (typed > line.remainingQty) return setAddError(`${line.prNumber}: ${qty(typed)} is more than the remaining ${qty(line.remainingQty)}.`);
        quantity = typed;
      }
      next.push({ ...line, mode, quantity });
    }
    setBasket(next);
    setSelected({});
    // Clear the item picker so the next item can be chosen straight away; the PO keeps every item added so far.
    setItem(null);
    flash(`${selectedIds.length} PR line${selectedIds.length === 1 ? "" : "s"} added to the PO. Choose the next item to add more, or create the PO.`);
  };

  const changeVendor = (v) => { setVendor(v); setBasket([]); setItem(null); setPreview(null); };

  const save = async () => {
    if (!vendor || basket.length === 0 || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const created = await poByPrApi.create(user, buildRequest(vendor, poDate, basket));
      flash(`${created.poNumber} created for ${created.po.vendorName}. Grand total ${money(created.po.grandTotal)}.`);
      setBasket([]);
      setPreview(null);
      setSelected({});
      // Reload the lines so ordered quantities and remaining quantities reflect the saved PO.
      poByPrApi.eligibleLines(item.key, vendor.key, poDate).then(setLines).catch(() => {});
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const grand = useMemo(() => (preview ? preview.grandTotal : null), [preview]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...card, display: "grid", gap: 12, gridTemplateColumns: "minmax(220px, 1fr) 160px minmax(260px, 1fr)", alignItems: "end" }}>
        <div>
          <span style={label}>1. Vendor</span>
          <SearchSelect placeholder="Search vendor name or code" search={lookupApi.vendors} toOption={vendorOption} value={vendor} onChange={changeVendor} disabled={basket.length > 0} />
          {basket.length > 0 && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Remove the PR lines below to change vendor.</div>}
        </div>
        <div>
          <span style={label}>PO date</span>
          <DateInput style={inp} value={poDate} onChange={(e) => setPoDate(e.target.value)} />
        </div>
        <div>
          <span style={label}>2. Item (present on approved PRs)</span>
          <SearchSelect placeholder={vendor ? "Search item code or name" : "Select a vendor first"} search={poByPrApi.eligibleItems} toOption={itemOption}
            value={item} onChange={setItem} disabled={!vendor} />
          {item && <div style={{ fontSize: 12, color: "#1e3a8a", marginTop: 4, fontWeight: 700 }}>Associated PR count: {item.prCount}</div>}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>3. PR lines for {item ? item.key : "…"}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Only lines on approved PRs with outstanding quantity are shown. Prices are from Vendor Rate Master for this vendor on the PO date.</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
              <input type="radio" name="po-mode" checked={mode === FULL} onChange={() => setMode(FULL)} /> Purchase fully
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
              <input type="radio" name="po-mode" checked={mode === PARTIAL} onChange={() => setMode(PARTIAL)} /> Partially ordered
            </label>
          </div>
        </div>

        {linesError && <div style={errorBox}>{linesError}</div>}
        {lines.length > 0 && lines.every((l) => l.unitPrice == null) && (
          <div style={{ ...errorBox, marginBottom: 10 }}>
            {item ? item.key : "This item"} has no vendor rate for {vendor ? vendor.label : "this vendor"} on {formatDisplayDate(poDate)}, so its PR lines cannot be added to the PO. Add the rate in Vendor Rate Master first.
          </div>
        )}
        {lines.some((l) => Number(l.orderedOutsidePoByPrQty) > 0) && (
          <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
            Some of the ordered quantity on these lines was raised outside PO by PR (legacy purchase orders). It counts against the remaining quantity but cannot be received against a PR line here.
          </div>
        )}
        {!vendor || !item ? (
          <div style={{ padding: 18, textAlign: "center", color: "#64748b", fontSize: 13, border: "1px dashed #cbd5e1", borderRadius: 8 }}>
            Choose a vendor and an item to see its PR lines.
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={th}></th>
                  {["PR number", "Item", "Requested", "Previously ordered", "Remaining", "Received", "Required by", "Unit price", "Purchase qty", "Amount (pre-GST)"].map((h) => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {linesLoading && <tr><td colSpan={11} style={{ ...td, textAlign: "center", color: "#64748b", padding: 14 }}>Loading PR lines…</td></tr>}
                {!linesLoading && !linesError && lines.length === 0 && (
                  <tr><td colSpan={11} style={{ ...td, textAlign: "center", color: "#64748b", padding: 14 }}>No outstanding approved PR lines for this item.</td></tr>
                )}
                {!linesLoading && lines.map((l) => {
                  const id = String(l.prItemId);
                  const typed = Number(qtyInput[id]);
                  const amount = l.unitPrice == null ? null : (mode === FULL ? l.remainingQty : typed || 0) * Number(l.unitPrice);
                  return (
                    <tr key={l.prItemId}>
                      <td style={td}>
                        <input type="checkbox" checked={!!selected[id]}
                          onChange={(e) => setSelected({ ...selected, [id]: e.target.checked })} />
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>{l.prNumber}<div style={{ color: "#64748b", fontWeight: 400 }}>{formatDisplayDate(l.prDate)}</div></td>
                      <td style={td}><div style={{ fontWeight: 700 }}>{l.itemCode}</div><div style={{ color: "#64748b" }}>{l.itemName}</div></td>
                      <td style={{ ...td, textAlign: "right" }}>{qty(l.requestedQty)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{qty(l.previouslyOrderedQty)}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{qty(l.remainingQty)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{qty(l.receivedQty)}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{l.requiredByDate ? formatDisplayDate(l.requiredByDate.slice(0, 10)) : "—"}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {l.unitPrice == null
                          ? <span style={{ color: "#b45309", fontWeight: 700 }}>No rate on this date</span>
                          : <>{money(l.unitPrice)}<div style={{ color: "#64748b" }}>from {formatDisplayDate(l.rateEffectiveFrom)}</div></>}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {mode === FULL
                          ? qty(l.remainingQty)
                          : <input style={{ ...inp, width: 110, textAlign: "right" }} type="number" min="0" step="0.01" max={l.remainingQty}
                              value={qtyInput[id] ?? ""} onChange={(e) => setQtyInput({ ...qtyInput, [id]: e.target.value })} />}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{amount == null ? "—" : money(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {mode === FULL ? "Purchase fully: every ticked line is ordered for its full remaining quantity." : "Partially ordered: enter the quantity for each line (up to its remaining quantity)."}
          </div>
          <button type="button" style={btn(true)} onClick={addSelected} disabled={selectedIds.length === 0}>
            {selectedIds.length ? `Add ${selectedIds.length} selected to PO` : "Add selected to PO"}
          </button>
        </div>
        {addError && <div style={{ ...errorBox, marginTop: 10 }}>{addError}</div>}
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>4. PO lines and tax</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
          {vendor ? <>Vendor: <b>{vendor.label}</b> · PO date {formatDisplayDate(poDate)}</> : "Choose a vendor to begin."}
        </div>

        {basket.length === 0 ? (
          <div style={{ padding: 18, textAlign: "center", color: "#64748b", fontSize: 13, border: "1px dashed #cbd5e1", borderRadius: 8 }}>
            No PR lines added yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["PR number", "Item", "Mode", "Quantity", "Remaining before", "Unit price", "HSN", "GST %", "Taxable", "GST", "Line total", ""].map((h) => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {basket.map((b) => {
                  const planned = preview?.lines?.find((p) => p.itemCode === b.itemCode);
                  return (
                    <tr key={b.prItemId}>
                      <td style={{ ...td, fontWeight: 700 }}>{b.prNumber}</td>
                      <td style={td}>{b.itemCode}</td>
                      <td style={td}>{b.mode === FULL ? "Full" : "Partial"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{qty(b.quantity)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{qty(b.remainingQty)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{money(b.unitPrice)}</td>
                      <td style={td}>{planned?.hsnCode || "…"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{planned ? `${qty(planned.taxPercent)}%` : "…"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{planned ? money(planned.taxableAmount) : "…"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{planned ? money(planned.taxAmount) : "…"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{planned ? money(planned.itemTotal) : "…"}</td>
                      <td style={td}><button type="button" style={{ ...btn(false), padding: "2px 8px", fontSize: 11 }} onClick={() => setBasket(basket.filter((x) => x.prItemId !== b.prItemId))}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {previewError && <div style={{ ...errorBox, marginTop: 10 }}>{previewError}</div>}
        {saveError && <div style={{ ...errorBox, marginTop: 10 }}>{saveError}</div>}

        {preview && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <div style={{ minWidth: 320, fontSize: 12, display: "grid", gap: 4 }}>
              <Row k="Items (gross)" v={money(preview.itemsGross)} />
              <Row k="Discount" v={money(preview.totalDiscount)} />
              <Row k="Taxable amount" v={money(preview.taxableAmount)} />
              <Row k="Total GST" v={money(preview.totalTax)} />
              <Row k="Delivery charges" v={money(preview.deliveryCharges)} />
              <Row k="Other charges" v={money(preview.otherCharges)} />
              <Row k="Round off" v={money(preview.roundOff)} />
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: 6, fontSize: 14, fontWeight: 800 }}>
                <span>Grand total</span><span>{money(grand)}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button type="button" style={btn(false)} onClick={() => setBasket([])} disabled={basket.length === 0 || saving}>Clear PO</button>
          <button type="button" style={btn(true)} onClick={save} disabled={!preview || saving || !!previewError}>
            {saving ? "Creating PO…" : "Create purchase order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
      <span style={{ color: "#475569" }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
    </div>
  );
}

// Basket to request body. The PO is a single PURCHASE FULL only if every line was added in full mode.
function buildRequest(vendor, poDate, basket) {
  const allFull = basket.every((b) => b.mode === FULL);
  return {
    vendorCode: vendor.key,
    poDate,
    mode: allFull ? FULL : PARTIAL,
    lines: basket.map((b) => ({ prItemId: b.prItemId, quantity: b.quantity }))
  };
}
