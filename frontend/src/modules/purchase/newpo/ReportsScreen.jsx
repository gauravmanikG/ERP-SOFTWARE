import React, { useState, useEffect, useMemo } from "react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import DateInput from "../../../shared/components/DateInput";
import { reportApi } from "./api";
import { inp, btn, card, errorBox, td, money, qty } from "./ui";
import { useColumnFilters, filterRows, FilterCells, filterInputStyle } from "./ColumnFilters";

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

      {!loading && tab === "pr-vs-po" && <DataTable columns={PR_VS_PO_COLUMNS} rows={rows} empty="No PR lines with a PO match these dates." />}
      {!loading && tab === "pr-vs-po-grn" && <DataTable columns={PR_VS_PO_GRN_COLUMNS} rows={rows} empty="No PO-by-PR allocations match these filters." />}
      {!loading && tab === "summary" && itemSummary && <DataTable columns={SUMMARY_COLUMNS} rows={itemSummary} empty="No purchase orders with PRs in these dates." />}
      {!loading && tab === "summary" && !itemSummary && <div style={{ color: "#64748b", fontSize: 13 }}>Choose From and To dates, then Show summary.</div>}
      {!loading && tab === "legacy" && legacy && <LegacyView data={legacy} />}
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

// A table defined by its columns. Each column has a label, the text used for filtering, and how it is drawn.
// Every column gets a filter box under its header, like the Item Master grid.
function DataTable({ columns, rows, empty }) {
  const { filters, setFilter, clearFilters, active } = useColumnFilters();
  const shown = useMemo(() => filterRows(rows, columns, filters), [rows, columns, filters]);
  const align = (c) => (c.align === "right" ? "right" : c.align === "center" ? "center" : "left");
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 12, alignItems: "center" }}>
        <span>Showing <b>{shown.length}</b> of {rows.length} rows</span>
        {active && <button type="button" onClick={clearFilters} style={{ ...btn(false), padding: "2px 8px", fontSize: 11 }}>Clear column filters</button>}
      </div>
      <div style={{ ...card, padding: 0, overflow: "auto", maxHeight: "65vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ padding: "8px 10px", fontWeight: 700, color: "#475569", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: align(c), whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 3 }}>
                  {c.label}
                </th>
              ))}
            </tr>
            <tr>
              <FilterCells columns={columns} filters={filters} setFilter={setFilter} top={33}
                style={{ borderBottom: "1px solid #cbd5e1" }} inputStyle={filterInputStyle} />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={columns.length} style={{ ...td, textAlign: "center", color: "#64748b", padding: 16 }}>{rows.length === 0 ? empty : "No rows match the column filters."}</td></tr>
            )}
            {shown.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} style={{ ...td, textAlign: align(c), whiteSpace: c.nowrap ? "nowrap" : undefined, fontWeight: c.bold ? 700 : undefined, color: c.color ? c.color(r) : undefined }}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const sub = (main, detail) => (
  <>
    <div style={{ fontWeight: 700 }}>{main}</div>
    {detail && <div style={{ color: "#64748b", fontSize: 11 }}>{detail}</div>}
  </>
);

const PR_VS_PO_COLUMNS = [
  { key: "prNumber", label: "PR number", text: (r) => r.prNumber, cell: (r) => r.prNumber, bold: true, nowrap: true },
  { key: "poNumber", label: "PO number", text: (r) => r.poNumber, cell: (r) => r.poNumber, bold: true, nowrap: true },
  { key: "prDate", label: "PR date", text: (r) => formatDisplayDate(r.prDate), cell: (r) => formatDisplayDate(r.prDate), nowrap: true },
  { key: "poDate", label: "PO date", text: (r) => formatDisplayDate(r.poDate), cell: (r) => formatDisplayDate(r.poDate), nowrap: true },
  { key: "daysGap", label: "Days gap", align: "center", text: (r) => r.daysGap ?? "", cell: (r) => r.daysGap ?? "—" },
  { key: "item", label: "Item", text: (r) => `${r.itemCode} ${r.itemName || ""}`, cell: (r) => sub(r.itemCode, r.itemName) },
  { key: "department", label: "Department", text: (r) => `${r.department || ""} ${r.requisitioner || ""}`, cell: (r) => sub(r.department || "—", r.requisitioner || "—") },
  { key: "uom", label: "UOM", text: (r) => r.uom || "", cell: (r) => r.uom || "—" },
  { key: "rate", label: "Rate", align: "right", text: (r) => money(r.rate), cell: (r) => money(r.rate) },
  { key: "prQty", label: "PR quantity", align: "right", text: (r) => qty(r.prQty), cell: (r) => qty(r.prQty) },
  { key: "poQty", label: "PO quantity", align: "right", text: (r) => qty(r.poQty), cell: (r) => qty(r.poQty) },
  { key: "balanceQty", label: "Balance quantity", align: "right", text: (r) => qty(r.balanceQty), cell: (r) => qty(r.balanceQty), bold: true }
];

// One row per item. Amount is the sum of each PO's quantity x that PO's rate.
const SUMMARY_COLUMNS = [
  { key: "item", label: "Item", text: (r) => `${r.itemCode} ${r.itemName || ""}`, cell: (r) => sub(r.itemCode, r.itemName) },
  { key: "uom", label: "UOM", text: (r) => r.uom || "", cell: (r) => r.uom || "—" },
  { key: "prQty", label: "PR quantity", align: "right", text: (r) => qty(r.prQty), cell: (r) => qty(r.prQty) },
  { key: "poQty", label: "PO quantity", align: "right", text: (r) => qty(r.poQty), cell: (r) => qty(r.poQty) },
  { key: "balanceQty", label: "Balance quantity", align: "right", text: (r) => qty(r.balanceQty), cell: (r) => qty(r.balanceQty), bold: true },
  { key: "amount", label: "Amount", align: "right", text: (r) => money(r.amount), cell: (r) => money(r.amount), bold: true }
];

const PR_VS_PO_GRN_COLUMNS = [
  { key: "poNumber", label: "PO", text: (r) => r.poNumber, cell: (r) => r.poNumber, bold: true, nowrap: true },
  { key: "poStatus", label: "PO status", text: (r) => r.poStatus, cell: (r) => r.poStatus },
  { key: "vendor", label: "Vendor", text: (r) => r.vendorName, cell: (r) => r.vendorName },
  { key: "prNumber", label: "PR", text: (r) => r.prNumber, cell: (r) => r.prNumber, nowrap: true },
  { key: "itemCode", label: "Item", text: (r) => r.itemCode, cell: (r) => r.itemCode },
  { key: "netOrderedQty", label: "Net ordered", align: "right", text: (r) => qty(r.netOrderedQty), cell: (r) => qty(r.netOrderedQty) },
  { key: "receivedQty", label: "Received", align: "right", text: (r) => qty(r.receivedQty), cell: (r) => qty(r.receivedQty) },
  { key: "acceptedQty", label: "Accepted", align: "right", text: (r) => qty(r.acceptedQty), cell: (r) => qty(r.acceptedQty) },
  { key: "rejectedQty", label: "Rejected", align: "right", text: (r) => qty(r.rejectedQty), cell: (r) => qty(r.rejectedQty), color: (r) => (Number(r.rejectedQty) > 0 ? "#b91c1c" : undefined) },
  { key: "pendingReceiptQty", label: "Pending", align: "right", text: (r) => qty(r.pendingReceiptQty), cell: (r) => qty(r.pendingReceiptQty) },
  { key: "grnNumbers", label: "GRNs", text: (r) => r.grnNumbers || "", cell: (r) => r.grnNumbers || "—" }
];

const CATEGORY_LABEL = {
  PO_WITHOUT_PR_ALLOCATION: "PO with no PR link",
  PO_NAMES_PR_WITHOUT_ALLOCATION: "PO names a PR but has no allocation",
  UNATTRIBUTED_RECEIPT: "Receipt not attributed to a PR line",
  PR_QUANTITY_WITHOUT_ALLOCATION: "PR quantity ordered outside PO by PR"
};

function LegacyView({ data }) {
  const columns = [
    { key: "issue", label: "Issue", text: (r) => CATEGORY_LABEL[r.category] || r.category, cell: (r) => CATEGORY_LABEL[r.category] || r.category },
    { key: "reference", label: "Reference", text: (r) => r.reference, cell: (r) => r.reference, bold: true },
    { key: "detail", label: "Detail", text: (r) => detailOf(r), cell: (r) => detailOf(r) },
    { key: "action", label: "Action", text: (r) => r.action || "", cell: (r) => <span style={{ color: "#475569" }}>{r.action}</span> }
  ];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ ...card, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
        {Object.entries(data.counts).length === 0 && <span style={{ color: "#166534", fontWeight: 700 }}>No records need manual reconciliation.</span>}
        {Object.entries(data.counts).map(([k, v]) => (
          <span key={k}><b>{v}</b> {CATEGORY_LABEL[k] || k}</span>
        ))}
      </div>
      <DataTable columns={columns} rows={data.items} empty="Nothing to reconcile." />
    </div>
  );
}

function detailOf(r) {
  if (r.category === "UNATTRIBUTED_RECEIPT") return `PO ${r.poNumber} · ${r.itemCode} · received ${qty(r.receivedQty)}`;
  if (r.category === "PR_QUANTITY_WITHOUT_ALLOCATION") return `ordered ${qty(r.orderedQty)} of ${qty(r.requestedQty)}; allocated ${qty(r.orderedThroughPoByPrQty)}`;
  return `${r.status || ""} · vendor ${r.vendorName || "—"} · PR on PO ${r.prNumberOnPo || "—"} · posted GRNs ${r.postedGrnCount}`;
}
