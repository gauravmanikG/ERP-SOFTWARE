import { useCallback, useState } from "react";

// Per-column filters for report tables, in the same style as the Item Master FG grid: one small filter box under
// each header. A row is kept when, for every filled box, the column's displayed text contains what was typed
// (case-insensitive). Filters only narrow the rows already on screen; they never change the data.

export function useColumnFilters() {
  const [filters, setFilters] = useState({});
  const setFilter = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value })), []);
  const clearFilters = useCallback(() => setFilters({}), []);
  const active = Object.values(filters).some((v) => v && String(v).trim());
  return { filters, setFilter, clearFilters, active };
}

// columns: [{ key, label, text: (row) => string }]. A column with filterable: false has no box.
export function filterRows(rows, columns, filters) {
  const active = columns.filter((c) => c.filterable !== false && filters[c.key] && String(filters[c.key]).trim());
  if (active.length === 0) return rows;
  return rows.filter((r) =>
    active.every((c) => String(c.text(r) ?? "").toLowerCase().includes(String(filters[c.key]).trim().toLowerCase()))
  );
}

// The filter boxes, one cell per column. Place inside a <tr> below the header row.
export function FilterCells({ columns, filters, setFilter, style, inputStyle, top = 0 }) {
  return columns.map((c) => (
    <th key={c.key} style={{ ...style, position: "sticky", top, zIndex: 2, background: "#ffffff", padding: "4px 6px", fontWeight: 400 }}>
      {c.filterable === false ? null : (
        <input
          value={filters[c.key] || ""}
          placeholder={`Filter ${c.label}`}
          onChange={(e) => setFilter(c.key, e.target.value)}
          style={inputStyle}
        />
      )}
    </th>
  ));
}

export const filterInputStyle = {
  width: "100%", minWidth: 60, boxSizing: "border-box", padding: "4px 6px", fontSize: 11,
  borderRadius: 4, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 400, color: "#0f172a"
};
