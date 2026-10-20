import React, { useState, useEffect } from "react";
import { inp, btn } from "./ui";

// Searchable picker backed by a lookup API. Results come from the database as the user types, so large
// lists (1,600+ items) are never loaded into the browser in full.
//   search:   (query) => Promise<rows[]>
//   toOption: row => { key, label, sub?, ...extra }
//   value:    the selected option or null; onChange(option | null)
export default function SearchSelect({ placeholder, search, toOption, value, onChange, disabled }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    const t = setTimeout(() => {
      search(q)
        .then((rows) => setResults(rows.map(toOption)))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 9px", background: "#eff6ff" }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1e3a8a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value.label}
          {value.sub && <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 8 }}>{value.sub}</span>}
        </span>
        {!disabled && <button type="button" onClick={() => onChange(null)} style={{ ...btn(false), padding: "2px 8px", fontSize: 11 }}>Change</button>}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        style={inp}
        placeholder={placeholder}
        value={q}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
      />
      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: "100%", left: 0, right: 0, marginTop: 2, maxHeight: 240, overflowY: "auto", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, boxShadow: "0 8px 24px rgba(15,23,42,0.15)" }}>
          {loading && <div style={{ padding: 10, fontSize: 12, color: "#64748b" }}>Searching…</div>}
          {!loading && results.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "#64748b" }}>No matches.</div>}
          {!loading && results.map((o) => (
            <div
              key={o.key}
              onMouseDown={(e) => { e.preventDefault(); onChange(o); setQ(""); setOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              style={{ padding: "7px 10px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#fff" }}
            >
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{o.label}</div>
              {o.sub && <div style={{ color: "#64748b", fontSize: 11 }}>{o.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
