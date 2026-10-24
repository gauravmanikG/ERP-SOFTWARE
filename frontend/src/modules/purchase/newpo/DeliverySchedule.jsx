import React, { useState } from "react";
import DateInput from "../../../shared/components/DateInput";
import { inp, btn, card, td, qty } from "./ui";

// Delivery schedule for the items on a PO. Each item's quantity can be split into lots, each with a date.
// The lots of one item may not add up to more than the item's PO quantity.
//   items:     [{ itemCode, itemName, poQty }]
//   schedules: { [itemCode]: [{ id, date, qty }] }
//   onChange:  (nextSchedules) => void

const num = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));
export const scheduledTotal = (lots) => (lots || []).reduce((s, l) => s + num(l.qty), 0);

// First problem with the schedules, or "" when they can be saved.
export function scheduleProblem(items, schedules, poDate) {
  for (const it of items) {
    const lots = schedules[it.itemCode] || [];
    for (const l of lots) {
      if (!l.date) return `${it.itemCode}: every delivery lot needs a date.`;
      if (l.date < poDate) return `${it.itemCode}: a delivery date is before the PO date.`;
      if (!(num(l.qty) > 0)) return `${it.itemCode}: every delivery lot needs a quantity above zero.`;
    }
    if (scheduledTotal(lots) > Number(it.poQty) + 1e-9) {
      return `${it.itemCode}: scheduled quantity (${qty(scheduledTotal(lots))}) is more than the PO quantity (${qty(it.poQty)}).`;
    }
  }
  return "";
}

// Lots for the request. Only items still on the PO are sent.
export function scheduleRequest(items, schedules) {
  return items.flatMap((it) =>
    (schedules[it.itemCode] || []).map((l) => ({ itemCode: it.itemCode, date: l.date, qty: num(l.qty) }))
  );
}

export default function DeliverySchedule({ items, schedules, onChange, poDate }) {
  const [open, setOpen] = useState({});
  if (items.length === 0) return null;

  const setLots = (code, lots) => onChange({ ...schedules, [code]: lots });
  const toggle = (it) => {
    const next = !open[it.itemCode];
    setOpen({ ...open, [it.itemCode]: next });
    // Opening an item with no lots starts with one lot for the full PO quantity on the PO date
    if (next && (schedules[it.itemCode] || []).length === 0) {
      setLots(it.itemCode, [{ id: Date.now() + Math.random(), date: poDate, qty: it.poQty }]);
    }
  };

  const cell = { ...td, verticalAlign: "middle" };
  const numCell = { ...cell, textAlign: "right" };
  const lotInput = { ...inp, padding: "4px 6px", fontSize: 12 };

  return (
    <div style={{ ...card, marginTop: 14 }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
          Delivery schedule <span style={{ fontWeight: 400, color: "#64748b" }}>(optional)</span>
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          Split an item into delivery dates. The quantities for an item can't add up to more than its PO quantity.
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Item", "PO qty", "Scheduled", "Not yet scheduled", ""].map((h) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: h === "Item" || h === "" ? "left" : "right", fontWeight: 700, color: "#475569", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const lots = schedules[it.itemCode] || [];
              const total = scheduledTotal(lots);
              const left = Number(it.poQty) - total;
              const over = left < -1e-9;
              const isOpen = !!open[it.itemCode];
              return (
                <React.Fragment key={it.itemCode}>
                  <tr>
                    <td style={cell}>
                      <div style={{ fontWeight: 700 }}>{it.itemCode}</div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>{it.itemName}</div>
                    </td>
                    <td style={numCell}>{qty(it.poQty)}</td>
                    <td style={{ ...numCell, fontWeight: 700, color: over ? "#b91c1c" : "#0f172a" }}>{qty(total)}</td>
                    <td style={{ ...numCell, color: over ? "#b91c1c" : "#16a34a", fontWeight: 700 }}>{qty(left)}</td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      <button type="button" style={{ ...btn(false), padding: "3px 10px", fontSize: 11 }} onClick={() => toggle(it)}>
                        {isOpen ? "Hide" : "Schedule"}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} style={{ ...td, background: "#f8fafc" }}>
                        {lots.map((l, idx) => (
                          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "#64748b", width: 52 }}>Lot {idx + 1}</span>
                            <div style={{ width: 150 }}>
                              <DateInput
                                style={lotInput}
                                value={l.date}
                                min={poDate}
                                onChange={(e) => setLots(it.itemCode, lots.map((x) => (x.id === l.id ? { ...x, date: e.target.value } : x)))}
                              />
                            </div>
                            <input
                              style={{ ...lotInput, width: 110, textAlign: "right" }}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Qty"
                              value={l.qty}
                              onChange={(e) => setLots(it.itemCode, lots.map((x) => (x.id === l.id ? { ...x, qty: e.target.value } : x)))}
                            />
                            <button
                              type="button"
                              style={{ ...btn(false), padding: "2px 8px", fontSize: 11 }}
                              onClick={() => setLots(it.itemCode, lots.filter((x) => x.id !== l.id))}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          disabled={left <= 0}
                          style={{ ...btn(false), padding: "3px 10px", fontSize: 11, opacity: left <= 0 ? 0.5 : 1 }}
                          onClick={() => setLots(it.itemCode, [...lots, { id: Date.now() + Math.random(), date: poDate, qty: left > 0 ? left : "" }])}
                        >
                          + Add delivery lot
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
