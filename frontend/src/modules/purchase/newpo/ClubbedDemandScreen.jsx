import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { getHandoff, removeHandoff } from "../../../shared/utils/handoffStore";
import { sourcingApi, departmentApi } from "./api";
import { money, qty, qtyStep, isCountedUnit, shortDate } from "./ui";
import SearchableSelect from "../../../shared/components/SearchableSelect";
import { Frame, FilterRow, Pill, Metric, SearchBox, Chip, Empty, ErrorLine, Modal, PagingFooter, usePaging, toolBtn, smallBtn, thS, thR, tdS, tdR, numInput, fieldInput } from "./frame";

const keyOf = (g) => `${g.itemCode}\u0000${g.uom}`;

// Clubbed Demand: approved PR quantity grouped by item, with vendor suggestions from the Supplier Master
// (items linked to a vendor) and prices from the Vendor Rate Master. Adding an item only reserves its PR
// quantity in that vendor's draft PO; nothing is ordered here.
export default function ClubbedDemandScreen({ user, flash, onNavigate }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [view, setView] = useState("ALL");

  const [expanded, setExpanded] = useState(() => new Set());
  const [picked, setPicked] = useState(() => new Set());
  const [vendorChoice, setVendorChoice] = useState({});   // rowKey -> vendorCode
  const [lineEdit, setLineEdit] = useState({});           // prItemId -> { checked, qty }
  const [compare, setCompare] = useState(null);           // clubbed group shown in the comparison dialog
  const [hover, setHover] = useState(null);               // { vendor, uom, rect }
  const [busy, setBusy] = useState(false);
  const [lastDrafts, setLastDrafts] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await sourcingApi.demand());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { departmentApi.list().then(setDepartments).catch(() => setDepartments([])); }, []);

  // Arriving from a PR ("Process PO"): show the demand of that PR first.
  useEffect(() => {
    const raw = getHandoff("SMS_SELECTED_PR_FOR_PO");
    if (!raw) return;
    removeHandoff("SMS_SELECTED_PR_FOR_PO");
    try {
      const pr = JSON.parse(raw);
      if (pr && (pr.pr_number || pr.prNumber)) setSearch(pr.pr_number || pr.prNumber);
    } catch (e) { /* not a PR object: ignore */ }
  }, []);

  // ---------------------------------------------------------------- derived values
  const chosenVendor = useCallback((g) => {
    const wanted = vendorChoice[keyOf(g)];
    const vendors = g.vendors || [];
    return vendors.find((v) => v.vendorCode === wanted && v.hasRate) || vendors.find((v) => v.recommended) || null;
  }, [vendorChoice]);

  const lineState = (s) => {
    const e = lineEdit[s.prItemId];
    return { checked: e ? e.checked : true, qty: e && e.qty !== undefined ? e.qty : String(s.readyQty) };
  };

  const lineProblem = (s, uom) => {
    const st = lineState(s);
    if (!st.checked) return "";
    const n = Number(st.qty);
    if (!(n > 0)) return "Enter a quantity above zero";
    if (n > Number(s.readyQty) + 1e-9) return `At most ${qty(s.readyQty)}`;
    if (isCountedUnit(uom) && !Number.isInteger(n) && Math.abs(n - Number(s.readyQty)) > 1e-9) return `${uom} must be whole numbers`;
    if (Math.round(n * 100) / 100 !== n) return "At most 2 decimals";
    return "";
  };

  const assignment = useCallback((g) => {
    const vendor = chosenVendor(g);
    const chosen = g.sources.filter((s) => lineState(s).checked);
    const problem = g.sources.map((s) => lineProblem(s, g.uom)).find(Boolean) || "";
    const total = chosen.reduce((sum, s) => sum + (Number(lineState(s).qty) || 0), 0);
    const price = vendor ? Number(vendor.unitPrice) : null;
    return {
      vendor, chosen, problem, total,
      value: price == null ? null : total * price,
      ok: !!vendor && chosen.length > 0 && !problem && total > 0
    };
  }, [chosenVendor, lineEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((g) => {
      if (view === "READY" && !(g.vendors || []).some((v) => v.hasRate)) return false;
      if (view === "ATTENTION" && (g.vendors || []).some((v) => v.hasRate)) return false;
      if (department && !g.sources.some((s) => s.department === department)) return false;
      if (!q) return true;
      return `${g.itemCode} ${g.itemName}`.toLowerCase().includes(q)
        || g.sources.some((s) => `${s.prNumber} ${s.department || ""}`.toLowerCase().includes(q));
    });
  }, [rows, search, department, view]);

  const paging = usePaging(filtered, 25);

  const withVendor = rows.filter((g) => (g.vendors || []).some((v) => v.hasRate)).length;
  const lineCount = rows.reduce((n, g) => n + g.sources.length, 0);
  const suggestedValue = rows.reduce((sum, g) => sum + (g.estimatedValue ? Number(g.estimatedValue) : 0), 0);

  // ---------------------------------------------------------------- actions
  const toggle = (set, setSet, key) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSet(next);
  };

  const setLine = (s, patch) => setLineEdit((prev) => ({ ...prev, [s.prItemId]: { ...lineState(s), ...prev[s.prItemId], ...patch } }));

  const submit = async (groups) => {
    const items = groups.map((g) => {
      const a = assignment(g);
      return {
        itemCode: g.itemCode,
        uom: g.uom,
        vendorCode: a.vendor.vendorCode,
        lines: a.chosen.map((s) => ({ prItemId: s.prItemId, quantity: Number(lineState(s).qty) }))
      };
    });
    setBusy(true);
    try {
      const drafts = await sourcingApi.assignBatch(user, items);
      const names = drafts.map((d) => `${d.draftNumber} (${d.vendor.vendorName})`);
      flash(`${items.length} item${items.length === 1 ? "" : "s"} added to ${names.join(", ")}.`);
      setLastDrafts(drafts.map((d) => d.draftNumber));
      setPicked(new Set());
      setLineEdit({});
      await load();
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusy(false);
    }
  };

  const pickedGroups = rows.filter((g) => picked.has(keyOf(g)));
  const pickedReady = pickedGroups.filter((g) => assignment(g).ok);
  const pickedValue = pickedReady.reduce((sum, g) => sum + (assignment(g).value || 0), 0);

  const showHover = (e, vendor, uom) => setHover({ vendor, uom, rect: e.currentTarget.getBoundingClientRect() });

  const allOnPagePicked = paging.slice.length > 0 && paging.slice.every((g) => picked.has(keyOf(g)));
  const togglePage = () => {
    const next = new Set(picked);
    paging.slice.forEach((g) => { if (allOnPagePicked) next.delete(keyOf(g)); else next.add(keyOf(g)); });
    setPicked(next);
  };

  // ---------------------------------------------------------------- render
  const banner = lastDrafts && (
    <div style={{ flexShrink: 0, background: "#ecfdf5", borderBottom: "1px solid #a7f3d0", padding: "8px 18px 8px 44px", fontSize: 13, color: "#065f46", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <b>Added to {lastDrafts.join(", ")}.</b>
      <span>Review the vendor drafts and convert them to POs.</span>
      <button type="button" style={smallBtn("ok")} onClick={() => onNavigate && onNavigate("new-po-draft-pos")}>Open Draft POs →</button>
      <button type="button" style={{ ...smallBtn(), marginLeft: "auto" }} onClick={() => setLastDrafts(null)}>Dismiss</button>
    </div>
  );

  return (
    <Frame
      user={user}
      crumb={[{ label: "Purchase" }, { label: "Clubbed Demand" }]}
      banner={banner}
      actions={(
        <>
          <button type="button" style={{ ...toolBtn(true), opacity: pickedReady.length === 0 || busy ? 0.55 : 1 }} disabled={pickedReady.length === 0 || busy} onClick={() => submit(pickedReady)}>
            + Add selected to draft POs{pickedReady.length > 0 ? ` (${pickedReady.length})` : ""}
          </button>
          <button type="button" style={toolBtn(false)} onClick={() => onNavigate && onNavigate("new-po-draft-pos")}>Draft POs</button>
          <span style={{ color: "#e2e8f0", margin: "0 4px", fontSize: 18 }}>|</span>
          <button type="button" style={toolBtn(false)} onClick={load} disabled={loading}><RefreshCw size={14} />Refresh</button>
          {pickedReady.length > 0 && (
            <span style={{ fontSize: 12, color: "#475569", marginLeft: 6 }}>
              {pickedReady.length} of {picked.size} selected ready · est. {money(pickedValue)}
            </span>
          )}
        </>
      )}
    >
      <FilterRow
        left={(
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Search item, PR or department..." width={230} />
            <div style={{ width: 160 }}>
              <SearchableSelect value={department} onChange={(e) => setDepartment(e.target.value)} emptyLabel="All departments"
                options={departments.map((d) => ({ value: d, label: d }))} />
            </div>
            <Pill active={view === "ALL"} onClick={() => setView("ALL")} count={rows.length}>All items</Pill>
            <Pill active={view === "READY"} onClick={() => setView("READY")} count={withVendor}>Vendor ready</Pill>
            <Pill active={view === "ATTENTION"} onClick={() => setView("ATTENTION")} count={rows.length - withVendor}>Needs vendor / rate</Pill>
          </>
        )}
        tiles={(
          <>
            <Metric label="Items to source" value={rows.length} />
            <Metric label="PR lines" value={lineCount} color="#0284c7" />
            <Metric label="Without vendor / rate" value={rows.length - withVendor} color={rows.length - withVendor > 0 ? "#dc2626" : "#10b981"} />
            <Metric label="Suggested value" value={money(suggestedValue)} color="#10b981" />
          </>
        )}
      />

      {error && <div style={{ padding: "10px 18px" }}><ErrorLine>{error}</ErrorLine></div>}

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ ...thS, width: 38 }}><input type="checkbox" checked={allOnPagePicked} onChange={togglePage} /></th>
              <th style={{ ...thS, width: 30 }} />
              <th style={thS}>Item</th>
              <th style={thS}>UoM</th>
              <th style={thR}>Clubbed qty</th>
              <th style={thS}>Source PRs</th>
              <th style={{ ...thS, minWidth: 250 }}>Suggested vendor</th>
              <th style={thR}>Unit price</th>
              <th style={thR}>Estimated value</th>
              <th style={thS}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10}><Empty>Loading approved demand…</Empty></td></tr>}
            {!loading && !error && filtered.length === 0 && (
              <tr><td colSpan={10}>
                <Empty>
                  {rows.length === 0
                    ? "No approved PR demand is waiting for sourcing. Approve PRs in Purchase Requisition, or open Draft POs for quantity already assigned to vendors."
                    : "No items match the filters."}
                </Empty>
              </td></tr>
            )}
            {!loading && paging.slice.map((g) => {
              const key = keyOf(g);
              const open = expanded.has(key);
              const a = assignment(g);
              const vendors = g.vendors || [];
              const noVendor = !vendors.some((v) => v.hasRate);
              return (
                <React.Fragment key={key}>
                  <tr style={{ background: picked.has(key) ? "#eff6ff" : "#ffffff" }}>
                    <td style={tdS}><input type="checkbox" checked={picked.has(key)} disabled={noVendor} onChange={() => toggle(picked, setPicked, key)} title={noVendor ? g.nextAction : ""} /></td>
                    <td style={tdS}>
                      <button type="button" onClick={() => toggle(expanded, setExpanded, key)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#475569", display: "flex" }} title="Show department-wise PR allocations">
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td style={tdS}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{g.itemCode}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b" }}>{g.itemName}</div>
                    </td>
                    <td style={tdS}>{g.uom}</td>
                    <td style={{ ...tdR, fontWeight: 800, color: "#0f172a" }}>{qty(g.clubbedQty)}</td>
                    <td style={tdS}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 260 }}>
                        {g.prNumbers.slice(0, 3).map((p) => <Chip key={p} tone="blue">{p}</Chip>)}
                        {g.prNumbers.length > 3 && <Chip tone="slate" title={g.prNumbers.join(", ")}>+{g.prNumbers.length - 3} more</Chip>}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{g.departments.join(", ")}</div>
                    </td>
                    <td style={tdS}>
                      {noVendor ? (
                        <span style={{ color: "#b45309", fontWeight: 700, fontSize: 12 }}>{vendors.length === 0 ? "No vendor linked" : "No vendor rate"}</span>
                      ) : (
                        <div>
                          <div
                            onMouseEnter={(e) => a.vendor && showHover(e, a.vendor, g.uom)}
                            onMouseLeave={() => setHover(null)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "help", fontWeight: 700, color: "#1e3a8a", borderBottom: "1px dotted #94a3b8" }}
                          >
                            {a.vendor.recommended && <span style={{ color: "#f59e0b" }} title="Lowest rate">★</span>}
                            {a.vendor.vendorName}
                          </div>
                          <div style={{ fontSize: 11, marginTop: 3 }}>
                            <button type="button" onClick={() => setCompare(g)} style={{ background: "none", border: "none", padding: 0, color: "#2563eb", cursor: "pointer", fontSize: 11, fontWeight: 700, textDecoration: "underline" }}>
                              Compare {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={tdR}>{a.vendor ? money(a.vendor.unitPrice) : "—"}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{a.value != null ? money(a.value) : "—"}</td>
                    <td style={tdS}>
                      {noVendor ? (
                        <span style={{ fontSize: 11.5, color: "#92400e" }}>{g.nextAction}</span>
                      ) : (
                        <button type="button" style={{ ...smallBtn("primary"), opacity: !a.ok || busy ? 0.5 : 1 }} disabled={!a.ok || busy} onClick={() => submit([g])} title={a.problem || ""}>
                          Add to draft PO
                        </button>
                      )}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={10} style={{ background: "#f8fafc", padding: "10px 18px 14px 56px", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 6 }}>
                          Department-wise PR allocations for {g.itemCode}
                          <span style={{ fontWeight: 500, color: "#64748b" }}> · untick a line or lower its quantity to leave the rest for later</span>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e2e8f0" }}>
                          <thead>
                            <tr>
                              {["", "PR number", "Department", "Requisitioner", "Required by"].map((h) => <th key={h} style={{ ...thS, position: "static", padding: "7px 10px" }}>{h}</th>)}
                              {["Requested", "Ordered", "In draft", "Ready", "Assign qty"].map((h) => <th key={h} style={{ ...thR, position: "static", padding: "7px 10px" }}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {g.sources.map((s) => {
                              const st = lineState(s);
                              const problem = lineProblem(s, g.uom);
                              return (
                                <tr key={s.prItemId}>
                                  <td style={tdS}><input type="checkbox" checked={st.checked} onChange={(e) => setLine(s, { checked: e.target.checked })} /></td>
                                  <td style={{ ...tdS, fontWeight: 700 }}>{s.prNumber}</td>
                                  <td style={tdS}>{s.department || "—"}</td>
                                  <td style={tdS}>{s.requisitioner || "—"}</td>
                                  <td style={tdS}>{shortDate(s.requiredByDate)}</td>
                                  <td style={tdR}>{qty(s.requestedQty)}</td>
                                  <td style={tdR}>{qty(s.orderedQty)}</td>
                                  <td style={tdR}>{qty(s.draftedQty)}</td>
                                  <td style={{ ...tdR, fontWeight: 700 }}>{qty(s.readyQty)}</td>
                                  <td style={tdR}>
                                    <input
                                      type="number" min="0" step={qtyStep(g.uom)} max={s.readyQty}
                                      disabled={!st.checked}
                                      value={st.qty}
                                      onChange={(e) => setLine(s, { qty: e.target.value })}
                                      style={{ ...numInput, borderColor: problem ? "#ef4444" : "#cbd5e1", background: st.checked ? "#fff" : "#f1f5f9" }}
                                    />
                                    {problem && <div style={{ fontSize: 10.5, color: "#dc2626", marginTop: 2 }}>{problem}</div>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <PagingFooter paging={paging} noun="items" />

      {hover && <VendorHoverCard hover={hover} />}

      {compare && (
        <CompareDialog
          group={compare}
          current={chosenVendor(compare)}
          onClose={() => setCompare(null)}
          onUse={(code) => { setVendorChoice((prev) => ({ ...prev, [keyOf(compare)]: code })); setCompare(null); }}
        />
      )}
    </Frame>
  );
}

function VendorHoverCard({ hover }) {
  const { vendor: v, uom, rect } = hover;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 360));
  const below = rect.bottom + 8 + 250 < window.innerHeight;
  const style = { position: "fixed", left, width: 340, zIndex: 20000, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 12px 32px rgba(15,23,42,0.22)", padding: 14, pointerEvents: "none", fontSize: 12 };
  if (below) style.top = rect.bottom + 8; else style.bottom = window.innerHeight - rect.top + 8;
  const line = (k, val) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "3px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b" }}>{k}</span><span style={{ fontWeight: 700, color: "#0f172a", textAlign: "right" }}>{val}</span>
    </div>
  );
  return (
    <div style={style}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{v.vendorName}</div>
        {v.recommended && <Chip tone="amber">Lowest rate</Chip>}
      </div>
      <div style={{ color: "#94a3b8", marginBottom: 6 }}>{v.vendorCode}{v.vendorState ? ` · ${v.vendorState}` : ""}</div>
      {line("Rate for this item", `${money(v.unitPrice)} / ${uom}`)}
      {line("Rate last updated", v.rateEffectiveFrom ? formatDisplayDate(v.rateEffectiveFrom) : "—")}
      {line("Unit of measurement", uom)}
      {line("Tax", v.gstRatePercent != null ? `GST ${qty(v.gstRatePercent)}%${v.hsnCode ? ` · HSN ${v.hsnCode}` : ""}` : "Not available")}
      {v.unitPriceWithGst != null && line("Price with GST", money(v.unitPriceWithGst))}
      {line("Lead time", v.itemLeadTimeDays != null ? `${qty(v.itemLeadTimeDays)} days` : "Not recorded")}
      {line("Payment terms", v.paymentTerms || "Not recorded")}
      {v.openDraftNumber && line("Open draft", v.openDraftNumber)}
    </div>
  );
}

function CompareDialog({ group, current, onClose, onUse }) {
  const [pick, setPick] = useState(current ? current.vendorCode : null);
  const vendors = group.vendors || [];
  const cheapest = vendors.find((v) => v.hasRate);
  return (
    <Modal
      title={`Compare vendors · ${group.itemCode}`}
      subtitle={`${group.itemName} · ${qty(group.clubbedQty)} ${group.uom} to source`}
      width={980}
      onClose={onClose}
      footer={(
        <>
          <button type="button" style={smallBtn()} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...smallBtn("primary"), opacity: pick ? 1 : 0.5 }} disabled={!pick} onClick={() => onUse(pick)}>Use selected vendor</button>
        </>
      )}
    >
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        Vendors linked to this item in the Supplier Master, with their current rate from the Vendor Rate Master. Choosing a vendor here does not create a PO.
      </div>
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thS, position: "static" }} />
              <th style={{ ...thS, position: "static" }}>Vendor</th>
              <th style={{ ...thR, position: "static" }}>Rate</th>
              <th style={{ ...thS, position: "static" }}>Rate updated</th>
              <th style={{ ...thS, position: "static" }}>UoM</th>
              <th style={{ ...thR, position: "static" }}>GST</th>
              <th style={{ ...thR, position: "static" }}>Price with GST</th>
              <th style={{ ...thR, position: "static" }}>Estimated total</th>
              <th style={{ ...thS, position: "static" }}>Lead time</th>
              <th style={{ ...thS, position: "static" }}>Payment terms</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => {
              const total = v.hasRate ? Number(v.unitPrice) * Number(group.clubbedQty) : null;
              const extra = v.hasRate && cheapest && total != null ? total - Number(cheapest.unitPrice) * Number(group.clubbedQty) : null;
              return (
                <tr key={v.vendorCode} style={{ background: pick === v.vendorCode ? "#eff6ff" : "#fff", opacity: v.hasRate ? 1 : 0.6 }}>
                  <td style={tdS}><input type="radio" name="vendor-pick" disabled={!v.hasRate} checked={pick === v.vendorCode} onChange={() => setPick(v.vendorCode)} /></td>
                  <td style={tdS}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{v.vendorName} {v.recommended && <Chip tone="amber">Lowest</Chip>}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{v.vendorCode}{v.openDraftNumber ? ` · open ${v.openDraftNumber}` : ""}</div>
                  </td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{v.hasRate ? money(v.unitPrice) : <Chip tone="amber">No rate</Chip>}</td>
                  <td style={tdS}>{v.rateEffectiveFrom ? formatDisplayDate(v.rateEffectiveFrom) : "—"}</td>
                  <td style={tdS}>{group.uom}</td>
                  <td style={tdR}>{v.gstRatePercent != null ? `${qty(v.gstRatePercent)}%` : "—"}</td>
                  <td style={tdR}>{v.unitPriceWithGst != null ? money(v.unitPriceWithGst) : "—"}</td>
                  <td style={tdR}>
                    {total != null ? money(total) : "—"}
                    {extra != null && extra > 0 && <div style={{ fontSize: 10.5, color: "#b45309" }}>+{money(extra)}</div>}
                  </td>
                  <td style={tdS}>{v.itemLeadTimeDays != null ? `${qty(v.itemLeadTimeDays)} days` : "—"}</td>
                  <td style={tdS}>{v.paymentTerms || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
