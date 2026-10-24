import React, { useState, useEffect, useMemo } from "react";
import DateInput from "../../../shared/components/DateInput";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import SearchSelect from "./SearchSelect";
import { lookupApi, poByPrApi } from "./api";
import { inp, label, btn, card, errorBox, th, thFor, td, money, qty, todayIso } from "./ui";
import PoTermsSection, { EMPTY_TERMS, termsToRequest, freightAmountOf } from "./PoTermsSection";
import DeliverySchedule, { scheduleProblem, scheduleRequest } from "./DeliverySchedule";

const vendorOption = (v) => ({ key: v.supplier_code, label: v.supplier_name, sub: v.supplier_code });
// Items that are present on at least one approved PR with outstanding quantity (from the PR lines only).
const itemOption = (r) => ({
  key: r.item_code,
  label: r.item_code,
  sub: `${r.item_name || ""} · ${r.pr_count} PR${r.pr_count === 1 ? "" : "s"} · ${qty(r.outstanding_qty)} outstanding`,
  itemName: r.item_name || "",
  prCount: Number(r.pr_count)
});

const FULL = "FULL";
const PARTIAL = "PARTIAL";

export default function PoByPrScreen({ user, flash, onCreated }) {
  const [vendor, setVendor] = useState(null);
  const [poDate, setPoDate] = useState(todayIso());
  // The number the PO will get when it is saved (read-only preview; the real one is reserved at save)
  const [poNumber, setPoNumber] = useState("");

  const loadPoNumber = () => {
    poByPrApi.nextPoNumber()
      .then((r) => setPoNumber(r.poNumber))
      .catch(() => setPoNumber("Not available"));
  };
  useEffect(() => { loadPoNumber(); }, []);
  const [mode, setMode] = useState(FULL);
  const [item, setItem] = useState(null);

  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [linesError, setLinesError] = useState("");
  const [selected, setSelected] = useState({});
  const [qtyInput, setQtyInput] = useState({});

  const [basket, setBasket] = useState([]);
  const [addError, setAddError] = useState("");
  const [basketError, setBasketError] = useState("");
  // PO-level charges and remark, sent with every preview and create.
  const [header, setHeader] = useState(EMPTY_HEADER);
  const [terms, setTerms] = useState(EMPTY_TERMS);

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load the outstanding lines of the chosen item, priced for this vendor on the PO date.
  useEffect(() => {
    if (!vendor || !item) {
      setLines([]);
      setSelected({});
      return;
    }
    setLinesLoading(true);
    setLinesError("");
    setAddError("");
    setSelected({});
    poByPrApi.eligibleLines(item.key, vendor.key, poDate)
      .then((rows) => {
        // PR lines already on this PO are not offered again; the rest of the item's PR lines still are
        const inBasket = new Set(basket.map((b) => b.prItemId));
        const open = rows.filter((r) => !inBasket.has(r.prItemId));
        setLines(open);
        setQtyInput(Object.fromEntries(open.map((r) => [r.prItemId, String(r.remainingQty)])));
        // Auto-select the open lines that have a valid vendor rate
        const eligible = open.filter((r) => r.unitPrice != null);
        setSelected(Object.fromEntries(eligible.map((r) => [String(r.prItemId), true])));
      })
      .catch((e) => setLinesError(e.message))
      .finally(() => setLinesLoading(false));
  }, [vendor, item, poDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-price the whole basket on the server whenever it changes.
  useEffect(() => {
    if (!vendor || basket.length === 0) {
      setPreview(null);
      setPreviewError("");
      return;
    }
    poByPrApi.preview(buildRequest(vendor, poDate, basket, header, terms))
      .then((p) => { setPreview(p); setPreviewError(""); })
      .catch((e) => { setPreview(null); setPreviewError(e.message); });
  }, [vendor, poDate, basket, header, terms]);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const hasNoRate = lines.length > 0 && lines.every((l) => l.unitPrice == null);

  const addSelected = () => {
    setAddError("");
    if (!item) return setAddError("Choose an item to add.");
    if (selectedIds.length === 0) return setAddError("Tick at least one PR line to add.");
    const next = [...basket];
    for (const id of selectedIds) {
      const line = lines.find((l) => String(l.prItemId) === id);
      if (!line) continue;
      if (line.unitPrice == null) {
        return setAddError(`PR ${line.prNumber} / ${line.itemCode}: no vendor rate for ${vendor ? vendor.label : "this vendor"} is effective on ${formatDisplayDate(poDate)}. Add the rate in Vendor Rate Master, then try again.`);
      }
      if (next.some((b) => b.prItemId === line.prItemId)) {
        return setAddError(`PR ${line.prNumber} / ${line.itemCode} is already on this PO.`);
      }
      let quantity = line.remainingQty;
      if (mode === PARTIAL) {
        const typed = Number(qtyInput[id]);
        if (!(typed > 0)) return setAddError(`Enter a purchase quantity above zero for ${line.prNumber}.`);
        if (typed > line.remainingQty) return setAddError(`${line.prNumber}: ${qty(typed)} is more than the remaining ${qty(line.remainingQty)}.`);
        quantity = typed;
      }
      next.push({ ...line, mode, quantity, discountPercent: "", manualDiscount: "", remarks: "" });
    }
    const addedCount = selectedIds.length;
    const addedItemKey = item.key;
    setBasket(next);
    setSelected({});
    setLines([]);
    // Clear item so user can add another item immediately just like in Direct PO
    setItem(null);
    flash(`Added ${addedItemKey} (${addedCount} PR line${addedCount === 1 ? "" : "s"}) to the PO. Add more items or create the PO.`);
  };

  const changeVendor = (v) => {
    setVendor(v);
    setBasket([]);
    setSchedules({});
    setItem(null);
    setPreview(null);
  };

  const removeLine = (prItemId) => {
    setBasket(basket.filter((x) => x.prItemId !== prItemId));
  };

  // Discount and remark for one PR line in the PO. The preview re-prices the PO after each change.
  const updateBasket = (prItemId, patch) => {
    setBasket(basket.map((x) => (x.prItemId === prItemId ? { ...x, ...patch } : x)));
  };

  // Only Partial lines have an editable quantity. It can never be more than "Still to order" on the PR line.
  // Editing never changes the line's mode: Full stays Full, Partial stays Partial.
  const changeBasketQty = (b, value) => {
    const remaining = Number(b.remainingQty);
    let next = value;
    if (value !== "" && Number(value) > remaining) {
      next = remaining;
      setBasketError(`${b.prNumber} / ${b.itemCode}: you can order at most ${qty(remaining)} (still to order). The quantity was set to ${qty(remaining)}.`);
    } else {
      setBasketError("");
    }
    const numNext = next === "" ? "" : Number(next);
    const newMode = (numNext !== "" && numNext < remaining) ? PARTIAL : FULL;
    updateBasket(b.prItemId, { quantity: numNext, mode: newMode });
  };

  const toggleSelectAll = (e) => {
    const checked = e.target.checked;
    const inBasket = new Set(basket.map((b) => b.prItemId));
    const next = {};
    lines.forEach((l) => {
      if (l.unitPrice != null && !inBasket.has(l.prItemId)) {
        next[String(l.prItemId)] = checked;
      }
    });
    setSelected(next);
  };

  const save = async () => {
    if (!vendor || basket.length === 0 || saving) return;
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
      const request = { ...buildRequest(vendor, poDate, basket, header, terms), schedules: scheduleRequest(scheduleItems, schedules) };
      const created = await poByPrApi.create(user, request);
      flash(`${created.poNumber} created for ${created.po.vendorName}. Grand total ${money(created.po.grandTotal)}.`);
      if (onCreated) onCreated(created.poNumber);
      setBasket([]);
      setSchedules({});
      setHeader(EMPTY_HEADER);
      setTerms(EMPTY_TERMS);
      setPreview(null);
      setSelected({});
      setItem(null);
      loadPoNumber();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const grand = useMemo(() => (preview ? preview.grandTotal : null), [preview]);
  const itemsOnPo = useMemo(() => [...new Set(basket.map((b) => b.itemCode))], [basket]);
  // Delivery schedule per item: the item's PO quantity is the sum of its PR lines on this PO
  const [schedules, setSchedules] = useState({});
  const scheduleItems = useMemo(() => itemsOnPo.map((code) => {
    const rows = basket.filter((b) => b.itemCode === code);
    return { itemCode: code, itemName: rows[0]?.itemName || "", poQty: rows.reduce((s, b) => s + Number(b.quantity || 0), 0) };
  }), [basket, itemsOnPo]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* 1. PO Header (Vendor & Date) */}
      <div style={{ ...card, display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 1fr) 180px", alignItems: "end" }}>
        <div>
          <span style={label}>1. Vendor</span>
          <SearchSelect
            placeholder="Search vendor name or code"
            search={lookupApi.vendors}
            toOption={vendorOption}
            value={vendor}
            onChange={changeVendor}
            disabled={basket.length > 0}
          />
          {basket.length > 0 && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Clear or remove the items below to change vendor.
            </div>
          )}
        </div>
        <div>
          <span style={label}>PO date</span>
          <DateInput style={inp} value={poDate} min={todayIso()} onChange={(e) => setPoDate(e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={label}>PO number</span>
          <div style={{ ...inp, background: "#f1f5f9", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
            <span>{poNumber || "Loading…"}</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}>
              Generated automatically and unique. It is saved when the PO is created.
            </span>
          </div>
        </div>
      </div>

      {/* 2. Items Section (Add item & Items on PO) */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
          Items (from approved PRs)
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
          Choose an item with approved PR lines, review or adjust quantities, and click <b>Add item</b>. You can add multiple items into one PO.
        </div>

        {/* Add item control row matching Direct PO */}
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(260px, 1fr) 220px auto", alignItems: "end" }}>
          <div>
            <span style={label}>Item (present on approved PRs)</span>
            <SearchSelect
              placeholder={vendor ? "Search item code or name to add..." : "Select a vendor first"}
              search={(q) => poByPrApi.eligibleItems(q, basket.map((b) => b.prItemId))}
              toOption={itemOption}
              value={item}
              onChange={(it) => { setItem(it); setAddError(""); }}
              disabled={!vendor}
            />
          </div>
          <div>
            <span style={label}>Order mode</span>
            <div style={{ display: "flex", gap: 14, alignItems: "center", height: 38, padding: "0 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #cbd5e1" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input type="radio" name="po-mode" checked={mode === FULL} onChange={() => setMode(FULL)} /> Purchase fully
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input type="radio" name="po-mode" checked={mode === PARTIAL} onChange={() => setMode(PARTIAL)} /> Partial
              </label>
            </div>
          </div>
          <button
            type="button"
            style={btn(true)}
            onClick={addSelected}
            disabled={!vendor || !item || selectedIds.length === 0 || hasNoRate}
          >
            Add item
          </button>
        </div>

        {addError && <div style={{ ...errorBox, marginTop: 10 }}>{addError}</div>}

        {/* PR lines drawer when an item is chosen */}
        {item && (
          <div style={{ marginTop: 14, padding: 12, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1e3a8a" }}>
                  PR lines for {item.key}
                </span>
                <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>
                  {item.sub || `${item.prCount} PRs`}
                </span>
              </div>
              <button
                type="button"
                style={{ ...btn(false), padding: "2px 8px", fontSize: 11 }}
                onClick={() => { setItem(null); setLines([]); setSelected({}); }}
              >
                Cancel / Choose another item
              </button>
            </div>

            {linesError && <div style={{ ...errorBox, marginBottom: 8 }}>{linesError}</div>}
            {lines.length > 0 && hasNoRate && (
              <div style={{ ...errorBox, marginBottom: 8 }}>
                {item.key} has no vendor rate for {vendor ? vendor.label : "this vendor"} on {formatDisplayDate(poDate)}, so its PR lines cannot be added to the PO. Add the rate in Vendor Rate Master first.
              </div>
            )}
            {lines.some((l) => Number(l.orderedOutsidePoByPrQty) > 0) && (
              <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px", marginBottom: 8 }}>
                Some of the ordered quantity on these lines was raised outside PO by PR (legacy purchase orders). It counts against the remaining quantity but cannot be received against a PR line here.
              </div>
            )}

            <div style={{ fontSize: 12, color: "#475569", marginBottom: 8, lineHeight: 1.5 }}>
              <b>Requested qty</b> is the quantity on the PR. <b>Already ordered</b> is what is already on purchase orders.
              <b> Still to order</b> = Requested − Already ordered, and it is the most you can order on this PO.
            </div>
            <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff" }}>
              <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 12 }}>
                <colgroup>
                  <col style={{ width: 40 }} />
                  <col style={{ width: "calc((100% - 40px) / 6)" }} />
                  <col style={{ width: "calc((100% - 40px) / 6)" }} />
                  <col style={{ width: "calc((100% - 40px) / 6)" }} />
                  <col style={{ width: "calc((100% - 40px) / 6)" }} />
                  <col style={{ width: "calc((100% - 40px) / 6)" }} />
                  <col style={{ width: "calc((100% - 40px) / 6)" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 40, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={lines.length > 0 && lines.filter((l) => l.unitPrice != null && !basket.some((b) => b.prItemId === l.prItemId)).every((l) => !!selected[String(l.prItemId)])}
                        onChange={toggleSelectAll}
                        disabled={linesLoading || hasNoRate}
                      />
                    </th>
                    {["PR number", "Item", "Purchase UOM", "Balance Quantity", "PO Quantity", "Amount"].map((h) => (
                      <th key={h} style={{ ...th, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linesLoading && (
                    <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "#64748b", padding: 14 }}>Loading PR lines…</td></tr>
                  )}
                  {!linesLoading && !linesError && lines.length === 0 && (
                    <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "#64748b", padding: 14 }}>No outstanding approved PR lines for this item.</td></tr>
                  )}
                  {!linesLoading && lines.map((l) => {
                    const id = String(l.prItemId);
                    const alreadyIn = basket.some((b) => b.prItemId === l.prItemId);
                    const typed = Number(qtyInput[id]);
                    const purchaseQty = mode === FULL ? l.remainingQty : (typed || 0);
                    const amount = l.unitPrice == null ? null : purchaseQty * Number(l.unitPrice);
                    return (
                      <tr key={l.prItemId} style={{ background: alreadyIn ? "#f1f5f9" : "transparent" }}>
                        <td style={{ ...td, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!selected[id]}
                            disabled={alreadyIn || l.unitPrice == null}
                            onChange={(e) => setSelected({ ...selected, [id]: e.target.checked })}
                          />
                        </td>
                        <td style={{ ...td, fontWeight: 700, textAlign: "left" }}>
                          {l.prNumber}
                          {alreadyIn && <span style={{ fontSize: 10, color: "#2563eb", fontWeight: 700, display: "block" }}>Already in PO</span>}
                        </td>
                        <td style={{ ...td, textAlign: "left" }}>
                          <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.itemCode}</div>
                          <div style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.itemName}</div>
                        </td>
                        <td style={{ ...td, textAlign: "left" }}>{l.uom || "—"}</td>
                        <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{qty(l.remainingQty)}</td>
                        <td style={{ ...td, textAlign: "left" }}>
                          {mode === FULL ? (
                            qty(l.remainingQty)
                          ) : (
                            <input
                              style={{ ...inp, width: "100%", maxWidth: 110, textAlign: "left", padding: "4px 8px" }}
                              type="number"
                              min="0"
                              step="0.01"
                              max={l.remainingQty}
                              value={qtyInput[id] ?? ""}
                              onChange={(e) => setQtyInput({ ...qtyInput, [id]: e.target.value })}
                            />
                          )}
                        </td>
                        <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>
                          {amount == null ? <span style={{ color: "#b45309", fontWeight: 700 }}>No rate</span> : money(amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {selectedIds.length > 0 ? (
                  <span><b>{selectedIds.length}</b> line{selectedIds.length === 1 ? "" : "s"} selected for {item.key}</span>
                ) : (
                  <span>Select at least one PR line to add.</span>
                )}
              </div>
              <button
                type="button"
                style={btn(true)}
                onClick={addSelected}
                disabled={selectedIds.length === 0 || hasNoRate}
              >
                Add item to PO
              </button>
            </div>
          </div>
        )}

        {/* Table of items added to this PO */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
              Items on this PO ({itemsOnPo.length} item{itemsOnPo.length === 1 ? "" : "s"} · {basket.length} PR line{basket.length === 1 ? "" : "s"})
            </div>
            {basket.length > 0 && (
              <div style={{ fontSize: 12, color: "#475569" }}>
                Items: <b>{itemsOnPo.join(", ")}</b>
              </div>
            )}
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["PR number", "Item", "HSN", "UOM", "Quantity purchasing", "Rate per unit", "Discount %", "Discount amount", "Taxable value", "GST %", "GST amount", "Line total", "Remark", ""].map((h) => (
                    <th key={h} style={thFor(h)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {basket.length === 0 && (
                  <tr>
                    <td colSpan={14} style={{ ...td, textAlign: "center", color: "#64748b", padding: 18 }}>
                      No items added yet. Choose an item above and click <b>Add item</b>.
                    </td>
                  </tr>
                )}
                {basket.map((b) => {
                  const planned = preview?.lines?.find((p) => p.itemCode === b.itemCode);
                  const taxPct = planned?.taxPercent != null ? Number(planned.taxPercent) : 0;
                  const gross = b.unitPrice != null ? b.quantity * Number(b.unitPrice) : 0;
                  const lineDisc = Math.min(gross, gross * (num(b.discountPercent) || 0) / 100 + (num(b.manualDiscount) || 0));
                  const lineTaxable = gross - lineDisc;
                  const lineTax = lineTaxable * (taxPct / 100);
                  const lineTotal = lineTaxable + lineTax;
                  return (
                    <tr key={b.prItemId}>
                      <td style={{ ...td, fontWeight: 700 }}>{b.prNumber}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{b.itemCode}</div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{b.itemName}</div>
                      </td>
                      <td style={td}>{planned?.hsnCode || b.hsnCode || "—"}</td>
                      <td style={td}>{b.uom || "—"}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <input
                          style={{ ...inp, width: 90, textAlign: "right", padding: "4px 6px", fontWeight: 700 }}
                          type="number" min="0.01" max={b.remainingQty} step="0.01"
                          value={b.quantity}
                          onChange={(e) => changeBasketQty(b, e.target.value)}
                          title={`Quantity purchasing on this PO (max remaining on PR: ${qty(b.remainingQty)})`}
                        />
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{money(b.unitPrice)}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <input
                          style={{ ...inp, width: 70, textAlign: "right", padding: "4px 6px" }}
                          type="number" min="0" max="100" step="0.01"
                          value={b.discountPercent}
                          onChange={(e) => updateBasket(b.prItemId, { discountPercent: e.target.value })}
                        />
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <input
                          style={{ ...inp, width: 90, textAlign: "right", padding: "4px 6px" }}
                          type="number" min="0" step="0.01"
                          value={b.manualDiscount}
                          onChange={(e) => updateBasket(b.prItemId, { manualDiscount: e.target.value })}
                        />
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{planned ? money(lineTaxable) : "…"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{planned ? `${qty(planned.taxPercent)}%` : "…"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{planned ? money(lineTax) : "…"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{planned ? money(lineTotal) : "…"}</td>
                      <td style={td}>
                        <input
                          style={{ ...inp, width: 170, padding: "4px 6px" }}
                          value={b.remarks}
                          placeholder="Remark for this PR line"
                          onChange={(e) => updateBasket(b.prItemId, { remarks: e.target.value })}
                        />
                      </td>
                      <td style={td}>
                        <button
                          type="button"
                          style={{ ...btn(false), padding: "2px 8px", fontSize: 11 }}
                          onClick={() => removeLine(b.prItemId)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {basket.length > 0 && (
          <DeliverySchedule items={scheduleItems} schedules={schedules} onChange={setSchedules} poDate={poDate} />
        )}

        {basketError && <div style={{ ...errorBox, marginTop: 10 }}>{basketError}</div>}
        {previewError && <div style={{ ...errorBox, marginTop: 10 }}>{previewError}</div>}
        {saveError && <div style={{ ...errorBox, marginTop: 10 }}>{saveError}</div>}

        {basket.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <PoTermsSection terms={terms} onChange={setTerms} />
          </div>
        )}

        {/* PO-level other charges, round off and remark */}
        {(
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: 14 }}>
            <div>
              <span style={label}>Other charges</span>
              <input style={inp} type="number" min="0" step="0.01" value={header.otherCharges}
                onChange={(e) => setHeader({ ...header, otherCharges: e.target.value })} />
            </div>
            <div>
              <span style={label}>Round off</span>
              <input style={inp} type="number" step="0.01" value={header.roundOff}
                onChange={(e) => setHeader({ ...header, roundOff: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={label}>PO remark</span>
              <input style={inp} value={header.remarks} placeholder="Remark for the whole PO"
                onChange={(e) => setHeader({ ...header, remarks: e.target.value })} />
            </div>
          </div>
        )}

        {/* Totals & Grand total preview */}
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

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            style={btn(false)}
            onClick={() => setBasket([])}
            disabled={basket.length === 0 || saving}
          >
            Clear PO
          </button>
          <button
            type="button"
            style={btn(true)}
            onClick={save}
            disabled={!preview || saving || !!previewError}
          >
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

const EMPTY_HEADER = { otherCharges: "", roundOff: "", remarks: "" };

// Empty input means "not entered" (null), so the server applies its default of zero.
function num(v) {
  return v === "" || v == null ? null : Number(v);
}

// Basket to request body. The PO is a single PURCHASE FULL only if every line was added in full mode.
function buildRequest(vendor, poDate, basket, header, terms) {
  const allFull = basket.every((b) => b.mode === FULL);
  return {
    vendorCode: vendor.key,
    poDate,
    mode: allFull ? FULL : PARTIAL,
    remarks: header.remarks.trim() || null,
    deliveryFreight: freightAmountOf(terms),
    terms: termsToRequest(terms),
    otherCharges: num(header.otherCharges),
    roundOff: num(header.roundOff),
    lines: basket.map((b) => ({
      prItemId: b.prItemId,
      quantity: b.quantity,
      discountPercent: num(b.discountPercent),
      manualDiscount: num(b.manualDiscount),
      remarks: b.remarks.trim() || null
    }))
  };
}

