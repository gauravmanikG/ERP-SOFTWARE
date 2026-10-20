import React, { useState, useEffect } from "react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { reportApi } from "./api";
import { inp, btn, card, errorBox, th, td, money, qty } from "./ui";

const TABS = [
  { key: "po-vs-pr", label: "PO vs PR" },
  { key: "po-vs-pr-grn", label: "PO vs PR vs GRN" },
  { key: "legacy", label: "Legacy reconciliation" }
];

// Purchase reports. Each tab calls one read-only endpoint; no figures are computed in the browser.
export default function ReportsScreen({ initialTab = "po-vs-pr" }) {
  const [tab, setTab] = useState(initialTab);
  const [filters, setFilters] = useState({ prNumber: "", poNumber: "", vendorCode: "" });
  const [rows, setRows] = useState([]);
  const [legacy, setLegacy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = (f = filters) => {
    setLoading(true);
    setError("");
    const req = tab === "po-vs-pr" ? reportApi.poVsPr(f)
      : tab === "po-vs-pr-grn" ? reportApi.poVsPrVsGrn(f)
      : reportApi.legacyReconciliation();
    req.then((data) => {
      if (tab === "legacy") { setLegacy(data); setRows([]); } else { setRows(data); setLegacy(null); }
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{ ...btn(tab === t.key), padding: "6px 12px" }}>{t.label}</button>
        ))}
      </div>

      {tab !== "legacy" && (
        <div style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <Filter label="PR number" value={filters.prNumber} onChange={(v) => setFilters({ ...filters, prNumber: v })} />
          <Filter label="PO number" value={filters.poNumber} onChange={(v) => setFilters({ ...filters, poNumber: v })} />
          <Filter label="Vendor code" value={filters.vendorCode} onChange={(v) => setFilters({ ...filters, vendorCode: v })} />
          <button type="button" style={btn(true)} onClick={load} disabled={loading}>Apply</button>
          <button type="button" style={btn(false)} onClick={() => { const cleared = { prNumber: "", poNumber: "", vendorCode: "" }; setFilters(cleared); load(cleared); }}>Clear</button>
        </div>
      )}

      {error && <div style={errorBox}>{error}</div>}
      {loading && <div style={{ color: "#64748b", fontSize: 13 }}>Loading…</div>}

      {!loading && tab === "po-vs-pr" && <PoVsPrTable rows={rows} />}
      {!loading && tab === "po-vs-pr-grn" && <PoVsPrVsGrnTable rows={rows} />}
      {!loading && tab === "legacy" && legacy && <LegacyTable data={legacy} />}
    </div>
  );
}

function Filter({ label, value, onChange }) {
  return (
    <div style={{ width: 180 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      <input style={inp} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Table({ headers, children, empty }) {
  return (
    <div style={{ ...card, padding: 0, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr>{headers.map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{children.length ? children : <tr><td colSpan={headers.length} style={{ ...td, textAlign: "center", color: "#64748b", padding: 16 }}>{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
}

function PoVsPrTable({ rows }) {
  return (
    <Table empty="No PR lines match these filters."
      headers={["PR", "Date", "Department", "PR status", "Item", "Requested", "Ordered", "via PO-by-PR", "Outside", "Remaining", "Received", "Lifecycle", "POs", "Vendors"]}>
      {rows.map((r, i) => (
        <tr key={i}>
          <td style={{ ...td, fontWeight: 700 }}>{r.prNumber}</td>
          <td style={td}>{formatDisplayDate(r.prDate)}</td>
          <td style={td}>{r.department}</td>
          <td style={td}>{r.prStatus}</td>
          <td style={td}>{r.itemCode}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.requestedQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.orderedQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.orderedThroughPoByPrQty)}</td>
          <td style={{ ...td, textAlign: "right", color: Number(r.orderedOutsidePoByPrQty) > 0 ? "#92400e" : undefined }}>{qty(r.orderedOutsidePoByPrQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.remainingToOrderQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.receivedQty)}</td>
          <td style={td}>{r.lifecycle}</td>
          <td style={td}>{r.poNumbers || "—"}</td>
          <td style={td}>{r.vendors || "—"}</td>
        </tr>
      ))}
    </Table>
  );
}

function PoVsPrVsGrnTable({ rows }) {
  return (
    <Table empty="No PO-by-PR allocations match these filters."
      headers={["PO", "PO status", "Vendor", "PR", "Item", "Net ordered", "Received", "Accepted", "Rejected", "Pending", "GRNs"]}>
      {rows.map((r, i) => (
        <tr key={i}>
          <td style={{ ...td, fontWeight: 700 }}>{r.poNumber}</td>
          <td style={td}>{r.poStatus}</td>
          <td style={td}>{r.vendorName}</td>
          <td style={td}>{r.prNumber}</td>
          <td style={td}>{r.itemCode}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.netOrderedQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.receivedQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.acceptedQty)}</td>
          <td style={{ ...td, textAlign: "right", color: Number(r.rejectedQty) > 0 ? "#b91c1c" : undefined }}>{qty(r.rejectedQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.pendingReceiptQty)}</td>
          <td style={td}>{r.grnNumbers || "—"}</td>
        </tr>
      ))}
    </Table>
  );
}

const CATEGORY_LABEL = {
  PO_WITHOUT_PR_ALLOCATION: "PO with no PR link",
  PO_NAMES_PR_WITHOUT_ALLOCATION: "PO names a PR but has no allocation",
  UNATTRIBUTED_RECEIPT: "Receipt not attributed to a PR line",
  PR_QUANTITY_WITHOUT_ALLOCATION: "PR quantity ordered outside PO by PR"
};

function LegacyTable({ data }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ ...card, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
        {Object.entries(data.counts).length === 0 && <span style={{ color: "#166534", fontWeight: 700 }}>No records need manual reconciliation.</span>}
        {Object.entries(data.counts).map(([k, v]) => (
          <span key={k}><b>{v}</b> {CATEGORY_LABEL[k] || k}</span>
        ))}
      </div>
      <Table empty="Nothing to reconcile."
        headers={["Issue", "Reference", "Detail", "Action"]}>
        {data.items.map((r, i) => (
          <tr key={i}>
            <td style={td}>{CATEGORY_LABEL[r.category] || r.category}</td>
            <td style={{ ...td, fontWeight: 700 }}>{r.reference}</td>
            <td style={td}>{detailOf(r)}</td>
            <td style={{ ...td, color: "#475569" }}>{r.action}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function detailOf(r) {
  if (r.category === "UNATTRIBUTED_RECEIPT") return `PO ${r.poNumber} · ${r.itemCode} · received ${qty(r.receivedQty)}`;
  if (r.category === "PR_QUANTITY_WITHOUT_ALLOCATION") return `ordered ${qty(r.orderedQty)} of ${qty(r.requestedQty)}; allocated ${qty(r.orderedThroughPoByPrQty)}`;
  return `${r.status || ""} · vendor ${r.vendorName || "—"} · PR on PO ${r.prNumberOnPo || "—"} · posted GRNs ${r.postedGrnCount}`;
}
