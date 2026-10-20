import React, { useState, useEffect, useCallback } from "react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { poRegisterApi } from "./api";
import { inp, btn, card, errorBox, th, td, money, qty } from "./ui";

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

  // Cancellation is offered only when nothing has been received against this PO.
  const receivedTotal = detail ? detail.allocations.reduce((s, a) => s + Number(a.receivedQty || 0), 0) : 0;
  const cancellable = detail && detail.status !== "CANCELLED" && receivedTotal === 0;
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
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.3fr)", alignItems: "start" }}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>PO by PR orders</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Newest first. Read from the database.</div>
          </div>
          <button type="button" style={btn(false)} onClick={loadOrders} disabled={loading}>Refresh</button>
        </div>
        {listError && <div style={errorBox}>{listError}</div>}
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["PO", "Date", "Vendor", "Status", "Total"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#64748b" }}>Loading…</td></tr>}
              {!loading && !listError && orders.length === 0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#64748b" }}>No purchase orders have been raised through PO by PR yet.</td></tr>
              )}
              {!loading && orders.map((o) => (
                <tr key={o.po_number} onClick={() => open(o.po_number)}
                  style={{ cursor: "pointer", background: selected === o.po_number ? "#eff6ff" : "#fff" }}>
                  <td style={{ ...td, fontWeight: 700 }}>{o.po_number}</td>
                  <td style={td}>{formatDisplayDate(o.po_date)}</td>
                  <td style={td}>{o.vendor_name}</td>
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
              <StatusBadge status={detail.status} />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Allocations to PR lines</div>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{["PR", "Item", "Allocated", "Released", "Received", "Rate"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {detail.allocations.map((a) => (
                      <tr key={a.id}>
                        <td style={td}>{a.pr_number}</td>
                        <td style={td}>{a.item_code}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty(a.allocated_qty)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty(a.released_qty)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty(a.receivedQty)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{money(a.unit_price)}</td>
                      </tr>
                    ))}
                    {detail.allocations.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#64748b" }}>No PR allocations (legacy PO).</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>PO lines and tax</div>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{["Item", "HSN", "GST %", "Qty", "Rate", "Taxable", "Tax", "Total"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
