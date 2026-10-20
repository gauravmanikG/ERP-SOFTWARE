import { useCallback, useEffect, useRef, useState } from "react";

// Excel-like column resizing for the ERP's data tables.
//
// Usage:
//   const COLUMNS = [{ key: "item", width: 240 }, { key: "qty", width: 90, min: 60 }];
//   const resize = useResizableColumns("pr-main-table", COLUMNS);
//   <table className="resizable-table" style={{ ...existingStyle, ...resize.tableStyle }}>
//     <ResizableColGroup columns={COLUMNS} widths={resize.widths} />
//     <thead><tr><th>Item<ColumnResizeHandle colKey="item" resize={resize} /></th>...</tr></thead>
//
// The <colgroup> is the single source of column widths, so header and body cells
// stay aligned by construction. Widths are saved per browser in localStorage.

export const MIN_COL_WIDTH = 48;
const STORAGE_PREFIX = "sms_table_widths:";

const readSavedWidths = (tableId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_PREFIX + tableId) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const buildInitialWidths = (tableId, columns) => {
  const saved = readSavedWidths(tableId);
  const widths = {};
  columns.forEach((col) => {
    const min = col.min ?? MIN_COL_WIDTH;
    const savedWidth = saved[col.key];
    widths[col.key] = typeof savedWidth === "number" && savedWidth >= min ? savedWidth : col.width;
  });
  return widths;
};

export function useResizableColumns(tableId, columns) {
  const [widths, setWidths] = useState(() => buildInitialWidths(tableId, columns));

  // Latest column config, read inside pointer handlers so they never go stale.
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const dragCleanupRef = useRef(null);

  // Persist whenever the committed widths change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + tableId, JSON.stringify(widths));
    } catch {
      // Storage full or disabled: resizing still works for this session.
    }
  }, [tableId, widths]);

  // Stop any in-progress drag if the table unmounts mid-drag.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  // Dragging updates the <col> and <table> DOM directly for smooth feedback without
  // re-rendering the whole page on every pointer move. The final width is committed to
  // React state on pointer up.
  const startResize = useCallback((event, colKey) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const table = event.currentTarget.closest("table");
    const colEls = table ? table.querySelectorAll(":scope > colgroup > col") : [];
    const colIndex = columnsRef.current.findIndex((c) => c.key === colKey);
    const colEl = colEls[colIndex];
    if (!colEl) return;

    const col = columnsRef.current[colIndex];
    const min = col.min ?? MIN_COL_WIDTH;
    const startX = event.clientX;
    const startWidth = colEl.getBoundingClientRect().width;
    let latestWidth = startWidth;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (moveEvent) => {
      latestWidth = Math.max(min, Math.round(startWidth + moveEvent.clientX - startX));
      colEl.style.width = `${latestWidth}px`;
      if (table) {
        // Keep the table at least as wide as its columns (so dragging wider scrolls),
        // but never narrower than the screen area it is in
        const total = Array.from(colEls).reduce((sum, el) => sum + parseFloat(el.style.width || 0), 0);
        table.style.minWidth = `${total}px`;
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragCleanupRef.current = null;
    };

    const onUp = () => {
      cleanup();
      const finalWidth = latestWidth;
      setWidths((prev) => (prev[colKey] === finalWidth ? prev : { ...prev, [colKey]: finalWidth }));
      // The click that follows a drag lands on the header cell (the handle moved with it),
      // which would toggle the column sort. Swallow that one click.
      const swallowClick = (clickEvent) => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
      };
      window.addEventListener("click", swallowClick, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallowClick, { capture: true }), 0);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    dragCleanupRef.current = cleanup;
  }, []);

  // Double-clicking a handle restores that column's default width.
  const resetColumn = useCallback((colKey) => {
    const col = columnsRef.current.find((c) => c.key === colKey);
    if (col) setWidths((prev) => ({ ...prev, [colKey]: col.width }));
  }, []);

  const tableWidth = columns.reduce((sum, col) => sum + (widths[col.key] ?? col.width), 0);

  return {
    widths,
    startResize,
    resetColumn,
    // Fixed layout makes the <colgroup> widths authoritative. The table fills the available
    // width at its standard column sizes, and never becomes narrower than the sum of its columns,
    // so dragging a column wider only extends the table.
    tableStyle: { tableLayout: "fixed", width: "100%", minWidth: tableWidth },
  };
}

export function ResizableColGroup({ columns, widths }) {
  return (
    <colgroup>
      {columns.map((col) => (
        <col key={col.key} style={{ width: widths[col.key] }} />
      ))}
    </colgroup>
  );
}

export function ColumnResizeHandle({ colKey, resize }) {
  return (
    <span
      className="col-resize-handle"
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => resize.startResize(e, colKey)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        resize.resetColumn(colKey);
      }}
    />
  );
}
