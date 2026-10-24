import React, { useState, useEffect } from "react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import DateInput from "../../../shared/components/DateInput";
import { reportApi } from "./api";
import { inp, btn, card, errorBox, thFor, td, money, qty } from "./ui";

const TABS = [
  { key: "pr-vs-po", label: "PR vs PO" },
  { key: "pr-vs-po-grn", label: "PR vs PO vs GRN" },
  { key: "summary", label: "Summary" },
  { key: "legacy", label: "Legacy reconciliation" }
];

// Purchase reports. Each tab calls one read-only endpoint; no figures are computed in the browser.
export default function ReportsScreen({ initialTab = "pr-vs-po" }) {
  const [tab, setTab] = useState(initialTab);
  const [filters, setFilters] = useState({ prNumber: "", poNumber: "", vendorCode: "" });
  const [dates, setDates] = useState({ from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [legacy, setLegacy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Summary tab: every item over a PR date range
  const [sumDates, setSumDates] = useState({ from: "", to: "" });
  const [itemSummary, setItemSummary] = useState(null);

  const load = (f = filters, d = dates) => {
    setLoading(true);
    setError("");
    let req;
    if (tab === "pr-vs-po") req = reportApi.prVsPo({ from: d.from, to: d.to });
    else if (tab === "pr-vs-po-grn") req = reportApi.poVsPrVsGrn(f);
    else req = reportApi.legacyReconciliation();
    req.then((data) => {
      if (tab === "legacy") { setLegacy(data); setRows([]); } else { setRows(data); setLegacy(null); }
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab !== "summary") load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSummary = () => {
    setError("");
    if (!sumDates.from || !sumDates.to) return setError("Choose both From Date and To Date.");
    if (sumDates.to < sumDates.from) return setError("To Date cannot be before From Date.");
    setLoading(true);
    reportApi.prVsPoItemSummary({ from: sumDates.from, to: sumDates.to })
      .then(setItemSummary)
      .catch((e) => { setItemSummary(null); setError(e.message); })
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{ ...btn(tab === t.key), padding: "6px 12px" }}>{t.label}</button>
        ))}
      </div>

      {tab === "pr-vs-po" && (
        <div style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <DateFilter label="From" value={dates.from} onChange={(v) => setDates({ ...dates, from: v })} />
          <DateFilter label="To" value={dates.to} onChange={(v) => setDates({ ...dates, to: v })} />
          <button type="button" style={btn(true)} onClick={() => load()} disabled={loading}>Apply</button>
          <button type="button" style={btn(false)} onClick={() => { const cleared = { from: "", to: "" }; setDates(cleared); load(filters, cleared); }}>Clear</button>
        </div>
      )}

      {tab === "pr-vs-po-grn" && (
        <div style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <Filter label="PR number" value={filters.prNumber} onChange={(v) => setFilters({ ...filters, prNumber: v })} />
          <Filter label="PO number" value={filters.poNumber} onChange={(v) => setFilters({ ...filters, poNumber: v })} />
          <Filter label="Vendor code" value={filters.vendorCode} onChange={(v) => setFilters({ ...filters, vendorCode: v })} />
          <button type="button" style={btn(true)} onClick={() => load()} disabled={loading}>Apply</button>
          <button type="button" style={btn(false)} onClick={() => { const cleared = { prNumber: "", poNumber: "", vendorCode: "" }; setFilters(cleared); load(cleared); }}>Clear</button>
        </div>
      )}

      {tab === "summary" && (
        <div style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <DateFilter label="From date" value={sumDates.from} onChange={(v) => setSumDates({ ...sumDates, from: v })} />
          <DateFilter label="To date" value={sumDates.to} onChange={(v) => setSumDates({ ...sumDates, to: v })} />
          <button type="button" style={btn(true)} onClick={showSummary} disabled={loading}>Show summary</button>
        </div>
      )}

      {error && <div style={errorBox}>{error}</div>}
      {loading && <div style={{ color: "#64748b", fontSize: 13 }}>Loading…</div>}

      {!loading && tab === "pr-vs-po" && <PrVsPoTable rows={rows} />}
      {!loading && tab === "pr-vs-po-grn" && <PrVsPoVsGrnTable rows={rows} />}
      {!loading && tab === "summary" && itemSummary && <ItemSummaryTable rows={itemSummary} />}
      {!loading && tab === "summary" && !itemSummary && <div style={{ color: "#64748b", fontSize: 13 }}>Choose From and To dates, then Show summary.</div>}
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

function DateFilter({ label, value, onChange }) {
  return (
    <div style={{ width: 170 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      <DateInput style={inp} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// The header row stays in place while the rows scroll.
function Table({ headers, children, empty }) {
  return (
    <div style={{ ...card, padding: 0, overflow: "auto", maxHeight: "65vh" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ ...thFor(h), position: "sticky", top: 0, zIndex: 2, background: "#f8fafc", boxShadow: "inset 0 -1px 0 #e2e8f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children.length ? children : <tr><td colSpan={headers.length} style={{ ...td, textAlign: "center", color: "#64748b", padding: 16 }}>{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
}

function PrVsPoTable({ rows }) {
  return (
    <Table empty="No PR lines with a PO match these dates."
      headers={["PR number", "PO number", "PR date", "PO date", "Days gap", "Item", "Department", "UOM", "Rate", "PR quantity", "PO quantity", "Balance quantity"]}>
      {rows.map((r, i) => (
        <tr key={i}>
          <td style={{ ...td, fontWeight: 700 }}>{r.prNumber}</td>
          <td style={{ ...td, fontWeight: 700 }}>{r.poNumber}</td>
          <td style={{ ...td, whiteSpace: "nowrap" }}>{formatDisplayDate(r.prDate)}</td>
          <td style={{ ...td, whiteSpace: "nowrap" }}>{formatDisplayDate(r.poDate)}</td>
          <td style={{ ...td, textAlign: "center" }}>{r.daysGap ?? "—"}</td>
          <td style={td}>
            <div style={{ fontWeight: 700 }}>{r.itemCode}</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>{r.itemName}</div>
          </td>
          <td style={td}>
            <div style={{ fontWeight: 700 }}>{r.department || "—"}</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>{r.requisitioner || "—"}</div>
          </td>
          <td style={td}>{r.uom || "—"}</td>
          <td style={{ ...td, textAlign: "right" }}>{money(r.rate)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.prQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.poQty)}</td>
          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{qty(r.balanceQty)}</td>
        </tr>
      ))}
    </Table>
  );
}

// One row per item. Amount is the sum of each PO's quantity x that PO's rate.
function ItemSummaryTable({ rows }) {
  return (
    <Table empty="No purchase orders with PRs in these dates."
      headers={["Item", "UOM", "PR quantity", "PO quantity", "Balance quantity", "Amount"]}>
      {rows.map((r) => (
        <tr key={r.itemCode}>
          <td style={td}>
            <div style={{ fontWeight: 700 }}>{r.itemCode}</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>{r.itemName}</div>
          </td>
          <td style={td}>{r.uom || "—"}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.prQty)}</td>
          <td style={{ ...td, textAlign: "right" }}>{qty(r.poQty)}</td>
          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{qty(r.balanceQty)}</td>
          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(r.amount)}</td>
        </tr>
      ))}
    </Table>
  );
}

function PrVsPoVsGrnTable({ rows }) {
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
