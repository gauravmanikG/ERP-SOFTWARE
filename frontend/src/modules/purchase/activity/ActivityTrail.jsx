// "Who did what" for a core-purchase document (PR, vendor draft, PO, GRN) and the documents linked to it.
// Data: GET /api/purchase/activity?ref=... — every name there is the signed-in user who performed the step,
// recorded by the server (never a name typed or sent by the browser).
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { History, X, User, Clock } from "lucide-react";
import { API_BASE } from "../../../shared/api/apiBase.js";

const API_ROOT = API_BASE + "/api";

export async function fetchActivity(ref) {
  const res = await fetch(`${API_ROOT}/purchase/activity?ref=${encodeURIComponent(ref)}`);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) throw new Error((data && (data.message || data.error)) || `Could not load activity (${res.status})`);
  return data;
}

const TYPE_LABEL = { PR: "PR", DRAFT: "Draft PO", PO: "PO", GRN: "GRN" };

// action -> [text, colour]
const ACTIONS = {
  "PR:CREATED": ["Created the PR", "#2563eb"],
  "PR:EDITED": ["Edited the PR", "#64748b"],
  "PR:STATUS_PENDING_APPROVAL": ["Submitted for approval", "#d97706"],
  "PR:STATUS_APPROVED": ["Approved the PR", "#16a34a"],
  "PR:STATUS_REJECTED": ["Rejected the PR", "#dc2626"],
  "PR:STATUS_CANCELLED": ["Cancelled the PR", "#dc2626"],
  "PR:DELETED": ["Deleted the PR", "#dc2626"],
  "DRAFT:CREATED": ["Opened a vendor draft PO", "#7c3aed"],
  "DRAFT:ASSIGNED": ["Selected the vendor (added to draft PO)", "#7c3aed"],
  "DRAFT:RELEASED_TO_SOURCING": ["Released back to clubbed demand", "#d97706"],
  "DRAFT:CONVERTED_TO_PO": ["Converted the draft to a PO", "#0f766e"],
  "PO:CREATED": ["Created the PO", "#0f766e"],
  "PO:CREATED_FROM_DRAFT": ["Created the PO from the draft", "#0f766e"],
  "PO:CANCELLED": ["Cancelled the PO", "#dc2626"],
  "GRN:SAVED_DRAFT": ["Saved the GRN as draft", "#64748b"],
  "GRN:DRAFT_UPDATED": ["Updated the draft GRN", "#64748b"],
  "GRN:POSTED": ["Posted the GRN (goods received)", "#16a34a"],
};

function describe(e) {
  const hit = ACTIONS[`${e.entityType}:${e.action}`];
  if (hit) return hit;
  const words = String(e.action || "").replace(/^STATUS_/, "").replace(/_/g, " ").toLowerCase();
  return [words.charAt(0).toUpperCase() + words.slice(1), "#475569"];
}

export function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtQty(v) {
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

/** Short, human detail line for one step (reason, vendor, lines, challan ...). */
function detailText(e) {
  const d = e.details || {};
  const parts = [];
  if (d.from && d.to) parts.push(`${d.from} → ${d.to}`);
  if (d.reason) parts.push(`Reason: ${d.reason}`);
  if (d.vendorCode) parts.push(`Vendor ${d.vendorCode}`);
  if (d.itemCode) parts.push(`Item ${d.itemCode}`);
  if (Array.isArray(d.lines) && d.lines.length) {
    parts.push(d.lines.map((l) => `${l.prNumber || ""}${l.itemCode ? " / " + l.itemCode : ""} × ${fmtQty(l.qty)}`).join(", "));
  }
  if (d.poNumber && e.entityType !== "PO") parts.push(`PO ${d.poNumber}`);
  if (d.draftNumber) parts.push(`Draft ${d.draftNumber}`);
  if (d.challan) parts.push(`Challan ${d.challan}`);
  if (d.accepted != null) parts.push(`Accepted ${fmtQty(d.accepted)}`);
  if (d.rejected != null && Number(d.rejected) > 0) parts.push(`Rejected ${fmtQty(d.rejected)}`);
  if (d.receivedBy) parts.push(`Received by (store) ${d.receivedBy}`);
  if (d.releasedQty && Number(d.releasedQty) > 0) parts.push(`Released qty ${fmtQty(d.releasedQty)}`);
  if (d.lineCount != null && e.action === "CREATED") parts.push(`${d.lineCount} line(s)`);
  return parts.join(" · ");
}

const S = {
  btn: {
    background: "#ffffff", border: "1px solid #cbd5e1", color: "#7c3aed", borderRadius: 4, padding: "4px 7px",
    cursor: "pointer", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4,
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 10000, display: "flex",
    alignItems: "center", justifyContent: "center", padding: 16,
  },
  panel: {
    background: "#ffffff", borderRadius: 10, width: "min(760px, 100%)", maxHeight: "88vh", display: "flex",
    flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", color: "#0f172a", textAlign: "left",
  },
};

/** Small button for table rows / detail headers that opens the activity trail of `docRef`. */
export function ActivityButton({ docRef, label = "Activity", title, style }) {
  const [open, setOpen] = useState(false);
  if (!docRef) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={title || `Who did what on ${docRef}`}
        data-testid="activity-button"
        style={{ ...S.btn, ...style }}
      >
        <History size={13} />
        {label ? <span>{label}</span> : null}
      </button>
      {open && <ActivityModal docRef={docRef} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ActivityModal({ docRef, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    fetchActivity(docRef).then((d) => live && setData(d)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [docRef]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div style={S.overlay} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div style={S.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Activity for ${docRef}`}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <History size={16} color="#7c3aed" /> Activity — {docRef}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Who performed each step, with the linked PR / draft PO / PO / GRN</div>
          </div>
          <button type="button" onClick={onClose} title="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "14px 18px", overflowY: "auto" }}>
          {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
          {!error && !data && <div style={{ color: "#64748b", fontSize: 13 }}>Loading…</div>}
          {data && <ActivityBody data={data} />}
        </div>
      </div>
    </div>,
    document.body
  );
}

function SummaryChip({ label, who, when, color }) {
  if (!who) return null;
  return (
    <div style={{ border: "1px solid #e2e8f0", borderLeft: `3px solid ${color}`, borderRadius: 6, padding: "6px 10px", minWidth: 150 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800 }} data-testid={`summary-${label.toLowerCase().replace(/\s+/g, "-")}`}>{who}</div>
      <div style={{ fontSize: 10, color: "#64748b" }}>{formatWhen(when)}</div>
    </div>
  );
}

function ActivityBody({ data }) {
  const s = data.summary || {};
  const events = data.events || [];
  const linked = data.linked || {};
  const linkGroups = [["PR", linked.prs], ["Draft PO", linked.drafts], ["PO", linked.pos], ["GRN", linked.grns]]
    .filter(([, list]) => list && list.length);
  const lastText = s.lastAction ? describe({ entityType: data.type, action: s.lastAction })[0] : "";

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <SummaryChip label="Created by" who={s.createdBy} when={s.createdAt} color="#2563eb" />
        <SummaryChip label="Approved by" who={s.approvedBy} when={s.approvedAt} color="#16a34a" />
        <SummaryChip label="Rejected by" who={s.rejectedBy} when={s.rejectedAt} color="#dc2626" />
        {s.lastActionBy && (
          <SummaryChip label="Last action by" who={s.lastActionBy} when={s.lastActionAt} color="#7c3aed" />
        )}
      </div>
      {lastText && <div style={{ fontSize: 11, color: "#64748b", marginTop: -6, marginBottom: 10 }}>Last action: {lastText}</div>}

      {linkGroups.length > 0 && (
        <div style={{ fontSize: 11, color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", marginBottom: 12 }}>
          {linkGroups.map(([label, list]) => (
            <span key={label} style={{ marginRight: 14 }}><strong>{label}:</strong> {list.join(", ")}</span>
          ))}
        </div>
      )}

      {events.length === 0 && <div style={{ fontSize: 13, color: "#64748b" }}>No steps recorded yet.</div>}
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }} data-testid="activity-events">
        {events.map((e, i) => {
          const [text, color] = describe(e);
          const detail = detailText(e);
          const own = e.entityType === data.type && e.entityRef === data.ref;
          return (
            <li key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < events.length - 1 ? "1px dashed #e2e8f0" : "none" }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontWeight: 800, color }}>{text}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: own ? "#ede9fe" : "#f1f5f9", color: own ? "#6d28d9" : "#475569" }}>
                    {TYPE_LABEL[e.entityType] || e.entityType} {e.entityRef}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#0f172a", display: "flex", flexWrap: "wrap", gap: 12, marginTop: 2 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }} data-testid="activity-actor">
                    <User size={12} color="#64748b" /> <strong>{e.actor}</strong>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#64748b" }}>
                    <Clock size={12} /> {formatWhen(e.at)}
                  </span>
                  {e.source === "record" && (
                    <span style={{ color: "#94a3b8", fontStyle: "italic" }} title="Recorded before step-by-step tracking started; taken from the document itself">from document</span>
                  )}
                </div>
                {detail && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, overflowWrap: "anywhere" }}>{detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
