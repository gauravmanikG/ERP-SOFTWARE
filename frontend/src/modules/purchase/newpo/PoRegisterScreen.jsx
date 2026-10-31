import React, { useState, useEffect, useCallback, useMemo } from "react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { poRegisterApi } from "./api";
import { inp, btn, card, errorBox, th, thFor, td, money, qty } from "./ui";
import { printPo } from "./printPo";
import { useColumnFilters, filterRows, FilterCells, filterInputStyle } from "./ColumnFilters";

const ORIGIN_LABEL = { PO_BY_PR: "PR based", DIRECT: "Direct", LEGACY: "Older PO" };

// Every purchase order, whatever created it. Column filters narrow the list; the detail shows the same
// information for every origin, and only PR based POs can be cancelled here.
const LIST_COLUMNS = [
  { key: "po", label: "PO", text: (o) => o.po_number },
  { key: "date", label: "Date", text: (o) => formatDisplayDate(o.po_date) },
  { key: "vendor", label: "Vendor", text: (o) => o.vendor_name },
  { key: "origin", label: "Origin", text: (o) => ORIGIN_LABEL[o.origin] || o.origin },
  { key: "pr", label: "PR", text: (o) => o.pr_numbers || "" },
  { key: "status", label: "Status", text: (o) => o.status },
  { key: "total", label: "Total", text: (o) => money(o.grand_total) }
];

// PO register for orders raised through PO by PR. Every figure is read from PostgreSQL on each refresh.
export default function PoRegisterScreen({ user, flash }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const { filters: colFilters, setFilter: setColFilter, clearFilters: clearColFilters, active: colFiltersOn } = useColumnFilters();
  const shownOrders = useMemo(() => filterRows(orders, LIST_COLUMNS, colFilters), [orders, colFilters]);

  const loadOrders = useCallback(() => {
    setLoading(true);
    setListError("");
    poRegisterApi.orders()
      .then(setOrders)
      .catch((e) => setListError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback((poNumber) => {
    setDetail(null);
    setDetailError("");
    setCancelError("");
    poRegisterApi.detail(poNumber)
      .then(setDetail)
      .catch((e) => setDetailError(e.message));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const open = (poNumber) => {
    setSelected(poNumber);
    setReason("");
    loadDetail(poNumber);
  };

  // Cancellation is offered only when nothing has been received against this PO. Older POs linked to their PR lines
  // are cancelled the same way, releasing exactly what their allocations hold.
  const receivedTotal = detail ? detail.allocations.reduce((s, a) => s + Number(a.receivedQty || 0), 0) : 0;
  const linkedToPr = detail && (detail.origin === "PO_BY_PR" || (detail.origin === "LEGACY" && detail.allocations.length > 0));
  const cancellable = linkedToPr && detail.status !== "CANCELLED" && receivedTotal === 0;
  const cancelBlockedReason = !detail ? "" : detail.status === "CANCELLED"
    ? "This PO is already cancelled."
    : receivedTotal > 0
      ? `Receipts of ${qty(receivedTotal)} are posted against this PO. It cannot be cancelled.`
      : "";

  const confirmCancel = async () => {
    setCancelError("");
    if (!reason.trim()) return setCancelError("Enter a reason for the cancellation.");
    setCancelling(true);
    try {
      const res = await poRegisterApi.cancel(user, selected, reason.trim());
      flash(`${res.poNumber} cancelled. ${qty(res.releasedQty)} released back to the PR lines.`);
      setReason("");
      loadDetail(selected);
      loadOrders();
    } catch (e) {
      // The API's own message explains the refusal (already cancelled, receipts posted, and so on).
      setCancelError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(620px, 1.25fr) minmax(360px, 1fr)", alignItems: "start" }}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>All purchase orders</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {orders.length} PO{orders.length === 1 ? "" : "s"} · PR based, direct and older orders · newest first
              {colFiltersOn && <> · showing <b>{shownOrders.length}</b> <button type="button" onClick={clearColFilters} style={{ ...btn(false), padding: "1px 6px", fontSize: 11, marginLeft: 6 }}>Clear filters</button></>}
            </div>
          </div>
          <button type="button" style={btn(false)} onClick={loadOrders} disabled={loading}>Refresh</button>
        </div>
        {listError && <div style={errorBox}>{listError}</div>}
        <div style={{ overflow: "auto", maxHeight: "70vh", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{LIST_COLUMNS.map((c) => <th key={c.key} style={{ ...thFor(c.label), position: "sticky", top: 0, zIndex: 3, background: "#f8fafc" }}>{c.label}</th>)}</tr>
              <tr><FilterCells columns={LIST_COLUMNS} filters={colFilters} setFilter={setColFilter} top={33} style={{ borderBottom: "1px solid #cbd5e1" }} inputStyle={filterInputStyle} /></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={LIST_COLUMNS.length} style={{ ...td, textAlign: "center", color: "#64748b" }}>Loading…</td></tr>}
              {!loading && !listError && orders.length === 0 && (
                <tr><td colSpan={LIST_COLUMNS.length} style={{ ...td, textAlign: "center", color: "#64748b" }}>No purchase orders yet.</td></tr>
              )}
              {!loading && orders.length > 0 && shownOrders.length === 0 && (
                <tr><td colSpan={LIST_COLUMNS.length} style={{ ...td, textAlign: "center", color: "#64748b" }}>No orders match the column filters.</td></tr>
              )}
              {!loading && shownOrders.map((o) => (
                <tr key={o.po_number} onClick={() => open(o.po_number)}
                  style={{ cursor: "pointer", background: selected === o.po_number ? "#eff6ff" : "#fff" }}>
                  <td style={{ ...td, fontWeight: 700 }}>{o.po_number}</td>
                  <td style={td}>{formatDisplayDate(o.po_date)}</td>
                  <td style={td}>{o.vendor_name}</td>
                  <td style={td}>{ORIGIN_LABEL[o.origin] || o.origin}</td>
                  <td style={td}>{o.pr_numbers || "—"}</td>
                  <td style={td}><StatusBadge status={o.status} /></td>
                  <td style={{ ...td, textAlign: "right" }}>{money(o.grand_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={card}>
        {!selected && <div style={{ color: "#64748b", fontSize: 13, padding: 12 }}>Select a PO to see its lines, allocations and receipts.</div>}
        {selected && detailError && <div style={errorBox}>{detailError}</div>}
        {selected && !detail && !detailError && <div style={{ color: "#64748b", fontSize: 13 }}>Loading {selected}…</div>}
        {detail && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{detail.poNumber}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{detail.vendorName} · {formatDisplayDate(detail.poDate)} · origin {detail.origin}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" style={btn(false)} onClick={() => { try { printPo(detail); } catch (e) { flash(e.message, true); } }}>Print PO</button>
                <StatusBadge status={detail.status} />
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", fontSize: 12 }}>
              {[
                ["Voucher No.", detail.voucherNo || detail.poNumber],
                ["Dated", formatDisplayDate(detail.poDate)],
                ["Reference No. & Date", `${detail.referenceNo || "—"}${detail.referenceDate ? ` · ${formatDisplayDate(detail.referenceDate)}` : ""}`],
                ["Mode of payment", detail.termNames?.modeOfPayment || "—"],
                ["Payment terms", detail.termNames?.paymentTerms || "—"],
                ["Credit period from", detail.termNames?.creditPeriodFrom || "—"],
                ["Freight", detail.termNames?.freight || "—"]
              ].map(([k, v]) => (
                <div key={k} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{k}</div>
                  <div style={{ color: "#0f172a", fontWeight: 600 }}>{v}</div>
                </div>
              ))}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", whiteSpace: "pre-line" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Invoice To</div>
                <div style={{ color: "#0f172a" }}>{detail.invoiceTo || "—"}</div>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", whiteSpace: "pre-line" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Ship To</div>
                <div style={{ color: "#0f172a" }}>{detail.shipTo || "—"}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Allocations to PR lines</div>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{["PR", "Department", "Draft", "Item", "Allocated", "Released", "Received", "Rate"].map((h) => <th key={h} style={thFor(h)}>{h}</th>)}</tr></thead>
                  <tbody>
                    {detail.allocations.map((a) => (
                      <tr key={a.id}>
                        <td style={td}>{a.pr_number}</td>
                        <td style={td}>{a.department || "—"}</td>
                        <td style={td}>{a.draft_number || "—"}</td>
                        <td style={td}>{a.item_code}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty(a.allocated_qty)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty(a.released_qty)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty(a.receivedQty)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{money(a.unit_price)}</td>
                      </tr>
                    ))}
                    {detail.allocations.length === 0 && <tr><td colSpan={8}style={{ ...td, textAlign: "center", color: "#64748b" }}>No PR allocations (legacy PO).</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>PO lines and tax</div>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{["Item", "HSN", "GST %", "Qty", "Rate", "Taxable", "Tax", "Total", "Due on"].map((h) => <th key={h} style={thFor(h)}>{h}</th>)}</tr></thead>
                  <tbody>
                    {detail.lines.map((l, i) => (
                      <tr key={`${l.itemCode}-${i}`}>
                        <td style={td}>{l.itemCode}</td>
                        <td style={td}>{l.hsnCode}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty(l.taxPercent)}%</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty(l.quantity)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{money(l.unitRate)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{money(l.taxableAmount)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{money(l.taxAmount)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(l.itemTotal)}</td>
                        <td style={td}>{l.expectedDeliveryDate ? formatDisplayDate(l.expectedDeliveryDate) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Cancellation</div>
              {cancellable ? (
                <>
                  <input style={inp} placeholder="Reason for cancelling this PO" value={reason} onChange={(e) => setReason(e.target.value)} disabled={cancelling} />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" style={btn(true)} onClick={confirmCancel} disabled={cancelling}>
                      {cancelling ? "Cancelling…" : "Cancel PO and release quantities"}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Only the quantity this PO reserved is released. Retrying a cancellation releases nothing more.</div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#64748b" }}>{cancelBlockedReason}</div>
              )}
              {cancelError && <div style={errorBox}>{cancelError}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colours = {
    APPROVED: ["#dcfce7", "#166534"],
    CANCELLED: ["#fee2e2", "#991b1b"],
    COMPLETED: ["#dbeafe", "#1e40af"],
    "PARTIALLY RECEIVED": ["#fef3c7", "#92400e"]
  };
  const [bg, fg] = colours[status] || ["#e2e8f0", "#334155"];
  return <span style={{ background: bg, color: fg, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{status}</span>;
}