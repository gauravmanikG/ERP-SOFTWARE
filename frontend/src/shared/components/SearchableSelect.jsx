import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

const PANEL_MAX = 280;

// Drop-down with a search box, for lists that can run to hundreds of entries (items, HSN codes, vendors, masters).
//   options:    [{ value, label, sub?, group? }]. sub and group are searched too.
//   emptyLabel: when set, the first row clears the choice (for example "All vendors").
// Opening the box shows the whole list. Typing narrows it to options that contain every word typed, in any order,
// so a whole item name, part number, description or HSN code all find the row.
// onChange receives a select-like event ({ target: { value } }), so a native select can be swapped for this
// without touching the handler behind it.
export default function SearchableSelect({ value, onChange, options = [], placeholder = "Select", emptyLabel, disabled, style, maxShown = 300 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const panelRef = useRef(null);
  // Where the list sits on screen. It opens above the box when there is more room above than below.
  const [pos, setPos] = useState(null);

  const current = options.find((o) => String(o.value) === String(value ?? ""));

  const rows = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matched = words.length === 0
      ? options
      : options.filter((o) => {
          const text = `${o.label} ${o.sub || ""} ${o.group || ""}`.toLowerCase();
          return words.every((w) => text.includes(w));
        });
    return emptyLabel && words.length === 0 ? [{ value: "", label: emptyLabel, empty: true }, ...matched] : matched;
  }, [options, q, emptyLabel]);

  const shown = rows.slice(0, maxShown);

  useEffect(() => { setActive(0); }, [q]);

  // Work out where the list goes: below the box, or above it when the screen has more room above.
  const place = () => {
    if (!boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const placeAbove = below < Math.min(PANEL_MAX, 200) && above > below;
    const maxHeight = Math.max(120, Math.min(PANEL_MAX, placeAbove ? above : below));
    setPos({
      left: r.left,
      width: r.width,
      maxHeight,
      top: placeAbove ? r.top - maxHeight - 2 : r.bottom + 2
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close when the user clicks anywhere outside the box and its list.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const inBox = boxRef.current && boxRef.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!inBox && !inPanel) { setOpen(false); setQ(""); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (row) => {
    onChange({ target: { value: row.value } });
    setOpen(false);
    setQ("");
  };

  const onKeyDown = (e) => {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === "Escape") { setOpen(false); setQ(""); }
  };

  const inputText = open ? q : (current ? current.label : "");

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%", minWidth: 0, ...style }}>
      <input
        value={inputText}
        placeholder={current ? current.label : placeholder}
        disabled={disabled}
        onFocus={() => { if (!disabled) setOpen(true); }}
        onClick={() => { if (!disabled) setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        title={current ? `${current.label}${current.sub ? ` (${current.sub})` : ""}` : undefined}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 30px 6px 9px",
          borderRadius: 6,
          border: "1px solid #cbd5e1",
          fontSize: 13,
          background: disabled ? "#f1f5f9" : "#fff",
          color: "#0f172a",
          fontWeight: current && !open ? 600 : 400,
          outline: "none"
        }}
      />
      <ChevronDown size={14} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
      {current && !disabled && !open && (
        <button
          type="button"
          title="Clear"
          onMouseDown={(e) => { e.preventDefault(); onChange({ target: { value: "" } }); }}
          style={{ position: "absolute", right: 26, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex" }}
        >
          <X size={13} />
        </button>
      )}
      {open && pos && createPortal(
        <div ref={panelRef} style={{ position: "fixed", zIndex: 100000, top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, overflowY: "auto", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, boxShadow: "0 8px 24px rgba(15,23,42,0.15)" }}>
          {shown.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "#64748b" }}>No matches for “{q.trim()}”.</div>}
          {shown.map((o, i) => {
            const isSelected = !o.empty && String(o.value) === String(value ?? "");
            const header = o.group && (i === 0 || shown[i - 1].group !== o.group);
            return (
              <React.Fragment key={`${o.value}-${i}`}>
                {header && <div style={{ padding: "5px 10px", fontSize: 10.5, fontWeight: 800, color: "#64748b", background: "#f8fafc", textTransform: "uppercase", letterSpacing: 0.3 }}>{o.group}</div>}
                <div
                  onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    padding: "6px 10px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                    background: i === active ? "#eff6ff" : isSelected ? "#f0fdf4" : "#fff",
                    fontStyle: o.empty ? "italic" : "normal"
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: o.empty ? "#64748b" : "#0f172a" }}>{o.label}</div>
                  {o.sub && <div style={{ fontSize: 11, color: "#64748b" }}>{o.sub}</div>}
                </div>
              </React.Fragment>
            );
          })}
          {rows.length > shown.length && (
            <div style={{ padding: 8, fontSize: 11, color: "#64748b", textAlign: "center" }}>
              Showing {shown.length} of {rows.length}. Type more of the name or code to narrow the list.
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
