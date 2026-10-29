import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";

// Building blocks for the sourcing screens, matching the Item Master FG / Supplier Master layout:
// a static toolbar with a breadcrumb, a filter row with metric tiles, a scrolling table, and a paging footer.

export const FONT = "'Inter', system-ui, sans-serif";

// Table cell styles (same header colours as the FG table)
export const thS = { padding: "10px 12px", fontWeight: 700, color: "#334155", background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", textAlign: "left", whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 5 };
export const thR = { ...thS, textAlign: "right" };
export const tdS = { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", fontSize: 12.5, color: "#334155" };
export const tdR = { ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums" };

export const toolBtn = (primary) => ({
  background: primary ? "#1e293b" : "#ffffff",
  color: primary ? "#ffffff" : "#334155",
  border: primary ? "none" : "1px solid #cbd5e1",
  borderRadius: 6,
  padding: primary ? "7px 18px" : "7px 16px",
  fontSize: 13,
  fontWeight: primary ? 700 : 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  boxShadow: primary ? "0 2px 4px rgba(30, 41, 59, 0.25)" : "none",
  opacity: 1
});

export const smallBtn = (tone = "plain") => {
  const tones = {
    plain: { background: "#ffffff", color: "#334155", border: "1px solid #cbd5e1" },
    primary: { background: "#1e293b", color: "#ffffff", border: "1px solid #1e293b" },
    danger: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
    ok: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }
  };
  return { ...tones[tone], borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
};

export const fieldInput = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "7px 10px", fontSize: 13, background: "#fff", boxSizing: "border-box", outline: "none" };
export const numInput = { ...fieldInput, width: 96, padding: "5px 8px", textAlign: "right", fontWeight: 700 };

/** Full-height screen: toolbar (left actions + right breadcrumb) above a scrolling body. */
export function Frame({ actions, crumb, user, banner, children }) {
  return (
    <div style={{ height: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#f4f6fb", fontFamily: FONT }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#ffffff", overflow: "hidden" }}>
        <div style={{ flexShrink: 0, background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "9px 18px 9px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{actions}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: 14 }}>
            <span>
              {crumb.map((c, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ margin: "0 6px" }}>›</span>}
                  {c.onClick ? (
                    <span onClick={c.onClick} style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline" }}>{c.label}</span>
                  ) : (
                    <span style={i === crumb.length - 1 ? { color: "#0f172a", fontWeight: 700 } : undefined}>{c.label}</span>
                  )}
                </span>
              ))}
            </span>
            {user && <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Acting as {user.name}</span>}
          </div>
        </div>
        {banner}
        {children}
      </div>
    </div>
  );
}

/** Search + filter pills on the left, metric tiles on the right. */
export function FilterRow({ left, tiles }) {
  return (
    <div style={{ flexShrink: 0, background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 280, flexWrap: "wrap" }}>{left}</div>
      {tiles && <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>{tiles}</div>}
    </div>
  );
}

export function Pill({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: "nowrap", cursor: "pointer",
        border: active ? "1px solid #1e293b" : "1px solid #e2e8f0",
        background: active ? "#1e293b" : "#f1f5f9",
        color: active ? "#ffffff" : "#475569"
      }}
    >
      {children}
      {count !== undefined && <span style={{ marginLeft: 6, opacity: 0.75 }}>{count}</span>}
    </button>
  );
}

export function Metric({ label, value, color = "#0f172a" }) {
  return (
    <div style={{ background: "#f8fafc", padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "right", minWidth: 92 }}>
      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>{label}</span>
      <span style={{ fontSize: 15, color, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, width = 320 }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ width, maxWidth: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#f8fafc" }}
    />
  );
}

const CHIP_TONES = {
  green: ["#dcfce7", "#15803d"],
  blue: ["#dbeafe", "#1e40af"],
  amber: ["#fef3c7", "#92400e"],
  red: ["#fee2e2", "#b91c1c"],
  violet: ["#ede9fe", "#5b21b6"],
  slate: ["#f1f5f9", "#475569"]
};

export function Chip({ tone = "slate", children, title }) {
  const [bg, fg] = CHIP_TONES[tone] || CHIP_TONES.slate;
  return <span title={title} style={{ background: bg, color: fg, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}

export const STAGE_META = {
  AWAITING_APPROVAL: { label: "Awaiting approval", tone: "slate" },
  READY_FOR_SOURCING: { label: "Ready for sourcing", tone: "blue" },
  IN_DRAFT: { label: "In draft", tone: "violet" },
  AWAITING_RECEIPT: { label: "Awaiting receipt", tone: "amber" },
  COMPLETED: { label: "Completed", tone: "green" },
  ORDERED_UNTRACKED: { label: "Ordered (older flow)", tone: "slate" },
  REJECTED: { label: "Rejected", tone: "red" },
  CANCELLED: { label: "Cancelled", tone: "red" }
};

export function Empty({ children }) {
  return <div style={{ padding: 36, textAlign: "center", color: "#64748b", fontSize: 13 }}>{children}</div>;
}

export function ErrorLine({ children }) {
  if (!children) return null;
  return <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, color: "#b91c1c", fontWeight: 600 }}>{children}</div>;
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 99999, background: toast.isError ? "#dc2626" : "#10b981", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", maxWidth: 480, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span>{toast.isError ? "!" : "✓"}</span><span>{toast.message}</span>
    </div>
  );
}

/** Client-side paging for a list that is already in memory. */
export function usePaging(rows, initialSize = 25) {
  const [size, setSize] = useState(initialSize);
  const [page, setPage] = useState(1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, totalPages);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const start = (current - 1) * size;
  const slice = useMemo(() => rows.slice(start, start + size), [rows, start, size]);
  return { size, setSize: (n) => { setSize(n); setPage(1); }, page: current, setPage, total, totalPages, start, slice };
}

const navBtn = (disabled) => ({ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, display: "flex", alignItems: "center" });

/** "Showing 1 to 15 of 17 entries | 15 per page | Page 1 of 2", the footer used on the item master screens. */
export function PagingFooter({ paging, noun = "entries", sizes = [10, 15, 25, 50, 100] }) {
  const { size, setSize, page, setPage, total, totalPages, start } = paging;
  return (
    <div style={{ flexShrink: 0, background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "8px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#64748b" }}>
        <span>Showing {total > 0 ? start + 1 : 0} to {Math.min(start + size, total)} of {total} {noun}</span>
        <select value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}>
          {sizes.map((n) => <option key={n} value={n}>{n} per page</option>)}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button type="button" onClick={() => setPage(1)} disabled={page === 1} style={navBtn(page === 1)}><ChevronsLeft size={14} /></button>
        <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={navBtn(page === 1)}><ChevronLeft size={14} /></button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "0 8px" }}>Page {page} of {totalPages}</span>
        <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={navBtn(page === totalPages)}><ChevronRight size={14} /></button>
        <button type="button" onClick={() => setPage(totalPages)} disabled={page === totalPages} style={navBtn(page === totalPages)}><ChevronsRight size={14} /></button>
      </div>
    </div>
  );
}

/** Centered dialog with a dark header, like the Supplier Master modals. */
export function Modal({ title, subtitle, onClose, children, footer, width = 760 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width, maxHeight: "90vh", background: "#ffffff", borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT }}>
        <div style={{ padding: "14px 22px", background: "#1e293b", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "12px 22px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}
