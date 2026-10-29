import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { sourcingApi } from "./api";
import { money, qty, qtyStep } from "./ui";
import { Frame, FilterRow, Pill, Metric, SearchBox, Chip, Empty, ErrorLine, Modal, toolBtn, smallBtn, thS, thR, tdS, tdR, numInput } from "./frame";

// Draft Purchase Orders: PR quantity reserved for each vendor. One open draft per vendor, with every item given to
// that vendor and the original PR allocations under each item. A draft is never ordered by itself: "Convert to PO"
// opens the PO screen, where the buyer chooses how much of each PR allocation to purchase now.
export default function DraftPoScreen({ user, flash, onConvert, onNavigate }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(() => new Set());          // expanded drafts
  const [openItems, setOpenItems] = useState(() => new Set()); // expanded items (draft|item|uom)
  const [releasing, setReleasing] = useState(null);           // { draft, allocation?: {...}, qty, reason }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDrafts(await sourcingApi.drafts({ status: "ALL" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drafts.filter((d) => {
      if (status !== "ALL" && d.status !== status) return false;
      if (!q) return true;
      return `${d.draftNumber} ${d.vendor.vendorName} ${d.vendor.vendorCode}`.toLowerCase().includes(q)
        || d.items.some((i) => `${i.itemCode} ${i.itemName}`.toLowerCase().includes(q) || i.allocations.some((a) => a.prNumber.toLowerCase().includes(q)));
    });
  }, [drafts, status, search]);

  const openDrafts = drafts.filter((d) => d.status === "OPEN");
  const totalItems = openDrafts.reduce((n, d) => n + d.itemCount, 0);
  const totalValue = openDrafts.reduce((s, d) => s + Number(d.estimatedTotalWithGst || 0), 0);

  const toggle = (set, setSet, key) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSet(next);
  };

  const confirmRelease = async () => {
    const r = releasing;
    setBusy(true);
    try {
      const body = r.allocation
        ? { lines: [{ allocationId: r.allocation.allocationId, quantity: Number(r.qty) }], reason: r.reason || null }
        : { reason: r.reason || null };
      await sourcingApi.release(user, r.draft.draftNumber, body);
      flash(r.allocation
        ? `${qty(r.qty)} of ${r.allocation.prNumber} released from ${r.draft.draftNumber} back to sourcing.`
        : `Everything open in ${r.draft.draftNumber} was released back to sourcing.`);
      setReleasing(null);
      await load();
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame
      user={user}
      crumb={[{ label: "Purchase" }, { label: "Draft Purchase Orders" }]}
      actions={(
        <>
          <button type="button" style={toolBtn(true)} onClick={() => onNavigate && onNavigate("new-po-clubbed-demand")}>+ Add items from Clubbed Demand</button>
          <button type="button" style={toolBtn(false)} onClick={() => onNavigate && onNavigate("new-po-po-register")}>PO Register</button>
          <span style={{ color: "#e2e8f0", margin: "0 4px", fontSize: 18 }}>|</span>
          <button type="button" style={toolBtn(false)} onClick={load} disabled={loading}><RefreshCw size={14} />Refresh</button>
        </>
      )}
    >
      <FilterRow
        left={(
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Search draft, vendor, item or PR number..." />
            <Pill active={status === "OPEN"} onClick={() => setStatus("OPEN")} count={openDrafts.length}>Open</Pill>
            <Pill active={status === "CLOSED"} onClick={() => setStatus("CLOSED")} count={drafts.length - openDrafts.length}>Closed</Pill>
            <Pill active={status === "ALL"} onClick={() => setStatus("ALL")} count={drafts.length}>All</Pill>
          </>
        )}
        tiles={(
          <>
            <Metric label="Open drafts" value={openDrafts.length} />
            <Metric label="Items in drafts" value={totalItems} color="#0284c7" />
            <Metric label="Estimated (with GST)" value={money(totalValue)} color="#10b981" />
          </>
        )}
      />

      {error && <div style={{ padding: "10px 18px" }}><ErrorLine>{error}</ErrorLine></div>}

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16, background: "#f4f6fb" }}>
        {loading && <Empty>Loading drafts…</Empty>}
        {!loading && !error && visible.length === 0 && (
          <Empty>
            {drafts.length === 0
              ? "No vendor drafts yet. Choose a vendor for an item in Clubbed Demand and add it to a draft PO."
              : "No drafts match the filters."}
          </Empty>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {visible.map((d) => {
            const isOpen = open.has(d.draftNumber);
            const isDraftOpen = d.status === "OPEN";
            const blocked = d.missingRates.length > 0;
            const warn = blocked || (d.missingTax || []).length > 0;
            return (
              <div key={d.draftNumber} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", opacity: isDraftOpen ? 1 : 0.8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => toggle(open, setOpen, d.draftNumber)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#475569", display: "flex" }}>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div style={{ minWidth: 240, flex: "1 1 260px" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                      {d.draftNumber} — {d.vendor.vendorName}
                      <span style={{ marginLeft: 8 }}><Chip tone={isDraftOpen ? "violet" : "slate"}>{isDraftOpen ? "Open" : "Closed"}</Chip></span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                      {d.vendor.vendorCode}{d.vendor.gstin ? ` · ${d.vendor.gstin}` : ""}{d.vendor.paymentTerms ? ` · ${d.vendor.paymentTerms}` : ""} · created {formatDisplayDate(d.createdAt)} by {d.createdBy}
                    </div>
                  </div>
                  <Stat label="Items" value={d.itemCount} />
                  <Stat label="Open quantity" value={qty(d.openQty)} />
                  <Stat label="Estimated total" value={money(d.estimatedTotal)} sub={`${money(d.estimatedTotalWithGst)} with GST`} />
                  <div style={{ flex: "1 1 180px", fontSize: 11.5, color: warn ? "#b45309" : "#64748b", fontWeight: warn ? 700 : 500 }}>
                    Next: {d.nextAction}
                  </div>
                  {isDraftOpen && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" style={smallBtn("danger")} onClick={() => setReleasing({ draft: d, allocation: null, qty: "", reason: "" })}>Release all</button>
                      <button type="button" style={{ ...smallBtn("primary"), padding: "7px 16px", fontSize: 13, opacity: blocked || d.openQty <= 0 ? 0.5 : 1 }} disabled={blocked || d.openQty <= 0} onClick={() => onConvert(d.draftNumber)}>
                        Convert to PO
                      </button>
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid #e2e8f0", background: "#f8fafc", padding: "10px 16px 14px 48px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e2e8f0" }}>
                      <thead>
                        <tr>
                          <th style={{ ...thS, position: "static", width: 30 }} />
                          <th style={{ ...thS, position: "static" }}>Item</th>
                          <th style={{ ...thS, position: "static" }}>UoM</th>
                          <th style={{ ...thR, position: "static" }}>Open qty</th>
                          <th style={{ ...thR, position: "static" }}>Rate</th>
                          <th style={{ ...thR, position: "static" }}>GST</th>
                          <th style={{ ...thR, position: "static" }}>Estimated value</th>
                          <th style={{ ...thS, position: "static" }}>PR allocations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.items.map((it) => {
                          const ik = `${d.draftNumber}|${it.itemCode}|${it.uom}`;
                          const itemOpen = openItems.has(ik);
                          return (
                            <React.Fragment key={ik}>
                              <tr style={{ opacity: Number(it.openQty) > 0 ? 1 : 0.55 }}>
                                <td style={tdS}>
                                  <button type="button" onClick={() => toggle(openItems, setOpenItems, ik)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#475569", display: "flex" }}>
                                    {itemOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                  </button>
                                </td>
                                <td style={tdS}>
                                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{it.itemCode}</div>
                                  <div style={{ fontSize: 11.5, color: "#64748b" }}>{it.itemName}</div>
                                </td>
                                <td style={tdS}>{it.uom}</td>
                                <td style={{ ...tdR, fontWeight: 800 }}>{qty(it.openQty)}</td>
                                <td style={tdR}>{it.unitPrice != null ? money(it.unitPrice) : <Chip tone="amber">No rate today</Chip>}</td>
                                <td style={tdR}>{it.gstRatePercent != null ? `${qty(it.gstRatePercent)}%` : "—"}</td>
                                <td style={{ ...tdR, fontWeight: 700 }}>{it.estimatedValue != null ? money(it.estimatedValue) : "—"}</td>
                                <td style={tdS}>
                                  {it.allocations.filter((a) => Number(a.openQty) > 0).map((a) => <span key={a.allocationId} style={{ marginRight: 4 }}><Chip tone="blue">{a.prNumber}</Chip></span>)}
                                </td>
                              </tr>
                              {itemOpen && (
                                <tr>
                                  <td colSpan={8} style={{ padding: "8px 12px 12px 42px", background: "#fcfcfd", borderBottom: "1px solid #e2e8f0" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", background: "#fff" }}>
                                      <thead>
                                        <tr>
                                          {["PR number", "Department", "Requisitioner"].map((h) => <th key={h} style={{ ...thS, position: "static", padding: "6px 10px" }}>{h}</th>)}
                                          {["Requested", "Reserved", "Converted", "Released", "Open"].map((h) => <th key={h} style={{ ...thR, position: "static", padding: "6px 10px" }}>{h}</th>)}
                                          <th style={{ ...thS, position: "static", padding: "6px 10px" }}>PO</th>
                                          <th style={{ ...thS, position: "static", padding: "6px 10px" }} />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {it.allocations.map((a) => (
                                          <tr key={a.allocationId}>
                                            <td style={{ ...tdS, fontWeight: 700 }}>{a.prNumber}</td>
                                            <td style={tdS}>{a.department || "—"}</td>
                                            <td style={tdS}>{a.requisitioner || "—"}</td>
                                            <td style={tdR}>{qty(a.requestedQty)}</td>
                                            <td style={tdR}>{qty(a.reservedQty)}</td>
                                            <td style={tdR}>{qty(a.convertedQty)}</td>
                                            <td style={tdR}>{qty(a.releasedQty)}</td>
                                            <td style={{ ...tdR, fontWeight: 800 }}>{qty(a.openQty)}</td>
                                            <td style={tdS}>{a.poNumbers || "—"}</td>
                                            <td style={tdS}>
                                              {isDraftOpen && Number(a.openQty) > 0 && (
                                                <button type="button" style={smallBtn("danger")} onClick={() => setReleasing({ draft: d, allocation: { ...a, uom: it.uom }, qty: String(a.openQty), reason: "" })}>
                                                  Release
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
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
                )}
              </div>
            );
          })}
        </div>
      </div>

      {releasing && (
        <Modal
          title={releasing.allocation ? "Release quantity to sourcing" : `Release all of ${releasing.draft.draftNumber}`}
          subtitle={releasing.allocation ? `${releasing.allocation.prNumber} · ${releasing.draft.draftNumber}` : releasing.draft.vendor.vendorName}
          width={520}
          onClose={() => setReleasing(null)}
          footer={(
            <>
              <button type="button" style={smallBtn()} onClick={() => setReleasing(null)} disabled={busy}>Cancel</button>
              <button type="button" style={smallBtn("danger")} onClick={confirmRelease} disabled={busy || (releasing.allocation && !(Number(releasing.qty) > 0))}>
                {busy ? "Releasing…" : "Release to sourcing"}
              </button>
            </>
          )}
        >
          <div style={{ fontSize: 13, color: "#334155", marginBottom: 12, lineHeight: 1.5 }}>
            {releasing.allocation
              ? "The quantity goes back to Clubbed Demand, where it can be given to a different vendor. The PR itself is not changed."
              : `Every open quantity in this draft (${qty(releasing.draft.openQty)}) goes back to Clubbed Demand and the draft closes. The PR lines are not changed.`}
          </div>
          {releasing.allocation && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>
                Quantity to release (open: {qty(releasing.allocation.openQty)})
              </div>
              <input type="number" min="0" step={qtyStep(releasing.allocation.uom)} max={releasing.allocation.openQty} style={{ ...numInput, width: 140 }}
                value={releasing.qty} onChange={(e) => setReleasing({ ...releasing, qty: e.target.value })} />
            </div>
          )}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>Reason (optional)</div>
          <input style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }}
            placeholder="For example: cheaper vendor found" value={releasing.reason} onChange={(e) => setReleasing({ ...releasing, reason: e.target.value })} />
        </Modal>
      )}
    </Frame>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ textAlign: "right", minWidth: 96 }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
}
