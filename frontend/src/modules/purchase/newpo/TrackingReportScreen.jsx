import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { trackingApi, departmentApi, lookupApi } from "./api";
import { qty, money, downloadCsv, todayIso } from "./ui";
import SearchableSelect from "../../../shared/components/SearchableSelect";
import SearchSelect from "./SearchSelect";
import { Frame, FilterRow, Pill, Metric, SearchBox, Chip, Empty, ErrorLine, PagingFooter, usePaging, toolBtn, smallBtn, thS, thR, tdS, tdR, fieldInput, STAGE_META } from "./frame";
import { useColumnFilters, filterRows, FilterCells, filterInputStyle } from "./ColumnFilters";

const STAGES = ["READY_FOR_SOURCING", "IN_DRAFT", "AWAITING_RECEIPT", "COMPLETED", "AWAITING_APPROVAL", "ORDERED_UNTRACKED"];

const EXPORT_COLUMNS = [
  { key: "department", label: "Department" },
  { key: "prNumber", label: "PR number" },
  { key: "itemCode", label: "Item code" },
  { key: "itemName", label: "Item" },
  { key: "uom", label: "UoM" },
  { key: "requestedQty", label: "Requested quantity" },
  { key: "draftReference", label: "Draft reference" },
  { key: "qtyReservedInDraft", label: "Quantity reserved in draft" },
  { key: "vendorName", label: "Vendor" },
  { key: "poNumber", label: "PO number" },
  { key: "orderedQty", label: "Ordered quantity" },
  { key: "remainingQtyToOrder", label: "Remaining quantity to order" },
  { key: "grnNumber", label: "GRN number" },
  { key: "receivedQty", label: "Received quantity" },
  { key: "qtyAwaitingReceipt", label: "Quantity awaiting receipt" },
  { key: "status", label: "Status" },
  { key: "orderingStatus", label: "Ordering status" },
  { key: "receivingStatus", label: "Receiving status" }
];

// Text each main-table column is filtered on (what the column shows).
const TRACKING_COLUMNS = [
  { key: "department", label: "Department", text: (r) => r.department || "" },
  { key: "prNumber", label: "PR number", text: (r) => `${r.prNumber} ${r.prStatus || ""}` },
  { key: "item", label: "Item", text: (r) => `${r.itemCode} ${r.itemName || ""} ${r.uom || ""}` },
  { key: "requested", label: "Requested", text: (r) => qty(r.requestedQty) },
  { key: "draftRef", label: "Draft ref.", text: (r) => r.drafts.map((d) => d.draftNumber).join(" ") },
  { key: "inDraft", label: "In draft", text: (r) => qty(r.inDraftQty) },
  { key: "po", label: "PO number", text: (r) => r.purchaseOrders.map((p) => p.poNumber).join(" ") },
  { key: "ordered", label: "Ordered", text: (r) => qty(r.orderedQty) },
  { key: "remaining", label: "Remaining to order", text: (r) => qty(r.remainingToOrderQty) },
  { key: "grn", label: "GRN number", text: (r) => r.purchaseOrders.flatMap((p) => p.grns.map((g) => g.grnNumber)).join(" ") },
  { key: "received", label: "Received", text: (r) => qty(r.receivedQty) },
  { key: "awaiting", label: "Awaiting receipt", text: (r) => qty(r.awaitingReceiptQty) },
  { key: "status", label: "Status", text: (r) => `${(STAGE_META[r.stage] || { label: r.stage }).label} ${ORDERING[r.orderingStatus] || ""} ${RECEIVING[r.receivingStatus] || ""}` },
  { key: "nextAction", label: "Next action", text: (r) => r.nextAction || "" }
];

// Compact cells for the 15-column main table (the drill-down tables keep the standard cells).
const hS = { ...thS, padding: "9px 8px", fontSize: 12 };
const hR = { ...thR, padding: "9px 8px", fontSize: 12 };
const cS = { ...tdS, padding: "7px 8px", fontSize: 12, whiteSpace: "nowrap" };
const cR = { ...tdR, padding: "7px 8px", fontSize: 12, whiteSpace: "nowrap" };

const ORDERING = { YET_TO_ORDER: "Yet to order", PARTIALLY_ORDERED: "Partially ordered", FULLY_ORDERED: "Fully ordered" };
const RECEIVING = { NOT_RECEIVED: "Not received", PARTIALLY_RECEIVED: "Partially received", FULLY_RECEIVED: "Fully received" };

// Live PR -> draft -> PO -> GRN tracking. One row per PR line. A line can be on several drafts, POs and GRNs; its
// quantities are counted once on the row, and the trail below it shows every document it went through.
export default function TrackingReportScreen({ user, flash }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);

  const [department, setDepartment] = useState("");
  const [vendor, setVendor] = useState(null);
  const [item, setItem] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [stage, setStage] = useState("ALL");
  const [expanded, setExpanded] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(() => ({ department, vendorCode: vendor ? vendor.key : "", item: item.trim(), docNumber: docNumber.trim() }), [department, vendor, item, docNumber]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return trackingApi.report(filters)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  // Text filters wait for a pause in typing; the others apply at once.
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { departmentApi.list().then(setDepartments).catch(() => setDepartments([])); }, []);

  const counts = useMemo(() => {
    const c = {};
    rows.forEach((r) => { c[r.stage] = (c[r.stage] || 0) + 1; });
    return c;
  }, [rows]);

  const { filters: colFilters, setFilter: setColFilter } = useColumnFilters();
  const shown = useMemo(
    () => filterRows(stage === "ALL" ? rows : rows.filter((r) => r.stage === stage), TRACKING_COLUMNS, colFilters),
    [rows, stage, colFilters]
  );
  const paging = usePaging(shown, 25);

  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const flat = await trackingApi.flat({ ...filters, status: stage === "ALL" ? "" : stage });
      downloadCsv(`PR_Tracking_${todayIso()}.csv`, EXPORT_COLUMNS, flat);
      flash(`Exported ${flat.length} row${flat.length === 1 ? "" : "s"}.`);
    } catch (e) {
      flash(e.message, true);
    } finally {
      setExporting(false);
    }
  };

  const reset = () => { setDepartment(""); setVendor(null); setItem(""); setDocNumber(""); setStage("ALL"); };
  const filtered = department || vendor || item || docNumber || stage !== "ALL";

  return (
    <Frame
      user={user}
      crumb={[{ label: "Purchase" }, { label: "PR Tracking" }]}
      actions={(
        <>
          <button type="button" style={toolBtn(false)} onClick={load} disabled={loading}><RefreshCw size={14} />Refresh</button>
          <button type="button" style={toolBtn(false)} onClick={exportCsv} disabled={exporting}>{exporting ? "Exporting…" : "Export CSV"}</button>
          <button type="button" style={toolBtn(false)} onClick={() => window.print()}>Print</button>
          {filtered && <button type="button" style={toolBtn(false)} onClick={reset}>Clear filters</button>}
        </>
      )}
    >
      <FilterRow
        left={(
          <>
            <SearchBox value={item} onChange={setItem} placeholder="Item code or name" width={200} />
            <SearchBox value={docNumber} onChange={setDocNumber} placeholder="PR / draft / PO / GRN number" width={230} />
            <div style={{ width: 180 }}>
              <SearchableSelect value={department} onChange={(e) => setDepartment(e.target.value)} emptyLabel="All departments"
                options={departments.map((d) => ({ value: d, label: d }))} />
            </div>
            <div style={{ width: 240 }}>
              <SearchSelect placeholder="Any vendor" search={lookupApi.vendors} toOption={(v) => ({ key: v.supplier_code, label: v.supplier_name, sub: v.supplier_code })} value={vendor} onChange={setVendor} />
            </div>
          </>
        )}
        tiles={(
          <>
            <Metric label="PR lines" value={rows.length} />
            <Metric label="Ready for sourcing" value={counts.READY_FOR_SOURCING || 0} color="#0284c7" />
            <Metric label="In draft" value={counts.IN_DRAFT || 0} color="#7c3aed" />
            <Metric label="Awaiting receipt" value={counts.AWAITING_RECEIPT || 0} color="#d97706" />
          </>
        )}
      />

      <div style={{ flexShrink: 0, padding: "8px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#fff" }}>
        <Pill active={stage === "ALL"} onClick={() => setStage("ALL")} count={rows.length}>All stages</Pill>
        {STAGES.map((s) => (
          <Pill key={s} active={stage === s} onClick={() => setStage(s)} count={counts[s] || 0}>{STAGE_META[s].label}</Pill>
        ))}
        <details style={{ marginLeft: "auto", fontSize: 12, color: "#475569" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "#1e3a8a" }}>What do these balances mean?</summary>
          <div style={{ position: "absolute", right: 18, zIndex: 30, marginTop: 6, width: 460, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 12px 32px rgba(15,23,42,0.18)", padding: 14, lineHeight: 1.55 }}>
            <div><b>Awaiting approval</b>: the PR is not approved yet, so it cannot be purchased.</div>
            <div><b>Ready for sourcing</b>: approved quantity not yet ordered or reserved in a vendor draft.</div>
            <div><b>In draft</b>: reserved for a vendor but not yet on a PO.</div>
            <div><b>Remaining to order</b>: requested minus ordered. It includes quantity still in drafts.</div>
            <div><b>Awaiting receipt</b>: ordered on POs minus accepted at GRN. This is a different balance from remaining to order.</div>
            <div style={{ color: "#94a3b8", marginTop: 4 }}>Ordering and receiving are tracked separately: a fully ordered PR is not necessarily received.</div>
          </div>
        </details>
      </div>

      {error && <div style={{ padding: "10px 18px" }}><ErrorLine>{error}</ErrorLine></div>}

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ ...hS, width: 26, padding: "9px 4px" }} />
              <th style={hS}>Department</th>
              <th style={hS}>PR number</th>
              <th style={{ ...hS, minWidth: 190 }}>Item</th>
              <th style={hR}>Requested</th>
              <th style={hS}>Draft ref.</th>
              <th style={hR}>In draft</th>
              <th style={hS}>PO number</th>
              <th style={hR}>Ordered</th>
              <th style={hR}>Remaining to order</th>
              <th style={hS}>GRN number</th>
              <th style={hR}>Received</th>
              <th style={hR}>Awaiting receipt</th>
              <th style={hS}>Status</th>
              <th style={hS}>Next action</th>
            </tr>
            <tr>
              <FilterCells columns={TRACKING_COLUMNS} filters={colFilters} setFilter={setColFilter} top={33}
                style={{ borderBottom: "1px solid #cbd5e1", background: "#fff" }} inputStyle={filterInputStyle} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={15}><Empty>Loading…</Empty></td></tr>}
            {!loading && !error && shown.length === 0 && <tr><td colSpan={15}><Empty>No PR lines match these filters.</Empty></td></tr>}
            {!loading && paging.slice.map((r) => {
              const open = expanded.has(r.prItemId);
              const stageMeta = STAGE_META[r.stage] || { label: r.stage, tone: "slate" };
              const draftRefs = [...new Set(r.drafts.filter((d) => Number(d.openQty) > 0).map((d) => d.draftNumber))];
              const grns = [...new Set(r.purchaseOrders.flatMap((p) => p.grns.map((g) => g.grnNumber)))];
              return (
                <React.Fragment key={r.prItemId}>
                  <tr style={{ background: open ? "#f8fafc" : "#fff" }}>
                    <td style={{ ...cS, padding: "7px 4px" }}>
                      <button type="button" onClick={() => toggle(r.prItemId)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#475569", display: "flex" }} title="Show drafts, POs and GRNs">
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td style={cS}>{r.department || "—"}</td>
                    <td style={{ ...cS, fontWeight: 700 }}>
                      {r.prNumber}
                      {r.approvalStage !== "APPROVED" && <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 500 }}>{r.prStatus}</div>}
                    </td>
                    <td style={{ ...cS, whiteSpace: "normal", minWidth: 190 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{r.itemCode}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{r.itemName} · {r.uom}</div>
                    </td>
                    <td style={{ ...cR, fontWeight: 700 }}>{qty(r.requestedQty)}</td>
                    <td style={cS}>{draftRefs.length ? draftRefs.map((d) => <div key={d}><Chip tone="violet">{d}</Chip></div>) : "—"}</td>
                    <td style={cR}>{Number(r.inDraftQty) > 0 ? qty(r.inDraftQty) : "—"}</td>
                    <td style={cS}>{r.purchaseOrders.length ? r.purchaseOrders.map((p) => <div key={p.poNumber}><Chip tone="blue">{p.poNumber}</Chip></div>) : "—"}</td>
                    <td style={cR}>{qty(r.orderedQty)}</td>
                    <td style={{ ...cR, fontWeight: 700 }}>{qty(r.remainingToOrderQty)}</td>
                    <td style={cS}>{grns.length ? grns.map((g) => <div key={g}><Chip tone="green">{g}</Chip></div>) : "—"}</td>
                    <td style={cR}>{qty(r.receivedQty)}</td>
                    <td style={{ ...cR, fontWeight: 700, color: Number(r.awaitingReceiptQty) > 0 ? "#b45309" : "#334155" }}>{qty(r.awaitingReceiptQty)}</td>
                    <td style={cS}>
                      <Chip tone={stageMeta.tone}>{stageMeta.label}</Chip>
                      <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 3 }}>{ORDERING[r.orderingStatus]} · {RECEIVING[r.receivingStatus]}</div>
                    </td>
                    <td style={{ ...cS, whiteSpace: "normal", fontSize: 11, color: "#475569", minWidth: 200 }}>{r.nextAction}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={15} style={{ background: "#f8fafc", padding: "10px 18px 16px 48px", borderBottom: "1px solid #e2e8f0" }}>
                        <Trail line={r} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <PagingFooter paging={paging} noun="PR lines" />
    </Frame>
  );
}

function Trail({ line: r }) {
  const tile = (label, value, tone) => (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", minWidth: 110 }}>
      <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: tone || "#0f172a" }}>{qty(value)}</div>
    </div>
  );
  const head = { ...thS, position: "static", padding: "6px 10px" };
  const headR = { ...thR, position: "static", padding: "6px 10px" };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tile("Requested", r.requestedQty)}
        {tile("Ready for sourcing", r.readyForSourcingQty, "#0284c7")}
        {tile("In draft", r.inDraftQty, "#7c3aed")}
        {tile("Ordered", r.orderedQty)}
        {tile("Remaining to order", r.remainingToOrderQty, "#0f172a")}
        {tile("Received", r.receivedQty, "#15803d")}
        {tile("Awaiting receipt", r.awaitingReceiptQty, "#b45309")}
      </div>
      {Number(r.orderedOutsidePoByPrQty) > 0 && (
        <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px" }}>
          {qty(r.orderedOutsidePoByPrQty)} of the ordered quantity was ordered through an older PO flow. It counts as ordered, but its receipts cannot be linked to this PR line.
        </div>
      )}

      {r.drafts.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 4 }}>Vendor drafts</div>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e2e8f0" }}>
            <thead><tr><th style={head}>Draft</th><th style={head}>Vendor</th><th style={head}>Status</th><th style={headR}>Reserved</th><th style={headR}>Converted to PO</th><th style={headR}>Released</th><th style={headR}>Still in draft</th></tr></thead>
            <tbody>
              {r.drafts.map((d, i) => (
                <tr key={`${d.draftNumber}-${i}`}>
                  <td style={{ ...tdS, fontWeight: 700 }}>{d.draftNumber}</td><td style={tdS}>{d.vendorName}</td>
                  <td style={tdS}><Chip tone={d.draftStatus === "OPEN" ? "violet" : "slate"}>{d.draftStatus === "OPEN" ? "Open" : "Closed"}</Chip></td>
                  <td style={tdR}>{qty(d.reservedQty)}</td><td style={tdR}>{qty(d.convertedQty)}</td><td style={tdR}>{qty(d.releasedQty)}</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{qty(d.openQty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {r.purchaseOrders.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 4 }}>Purchase orders and receipts</div>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e2e8f0" }}>
            <thead><tr><th style={head}>PO</th><th style={head}>PO date</th><th style={head}>Vendor</th><th style={head}>From draft</th><th style={head}>PO status</th><th style={headR}>Rate</th><th style={headR}>Ordered</th><th style={headR}>Received</th><th style={headR}>Awaiting receipt</th></tr></thead>
            <tbody>
              {r.purchaseOrders.map((p) => (
                <React.Fragment key={p.poNumber}>
                  <tr>
                    <td style={{ ...tdS, fontWeight: 700 }}>{p.poNumber}</td><td style={tdS}>{formatDisplayDate(p.poDate)}</td><td style={tdS}>{p.vendorName}</td>
                    <td style={tdS}>{p.draftNumber || "—"}</td><td style={tdS}>{p.poStatus}</td><td style={tdR}>{money(p.unitPrice)}</td>
                    <td style={tdR}>{qty(p.orderedQty)}</td><td style={tdR}>{qty(p.receivedQty)}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{qty(p.awaitingReceiptQty)}</td>
                  </tr>
                  {p.grns.map((g) => (
                    <tr key={`${p.poNumber}-${g.grnNumber}`} style={{ background: "#f0fdf4" }}>
                      <td style={{ ...tdS, paddingLeft: 28, color: "#15803d", fontWeight: 700 }}>↳ {g.grnNumber}</td>
                      <td style={tdS}>{formatDisplayDate(g.grnDate)}</td>
                      <td style={{ ...tdS, color: "#64748b" }} colSpan={5}>Goods receipt against {p.poNumber}</td>
                      <td style={{ ...tdR, fontWeight: 700 }}>{qty(g.receivedQty)}</td>
                      <td style={tdS} />
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.drafts.length === 0 && r.purchaseOrders.length === 0 && (
        <div style={{ fontSize: 12, color: "#64748b" }}>No draft or PO yet for this PR line. Next: {r.nextAction}</div>
      )}
    </div>
  );
}
