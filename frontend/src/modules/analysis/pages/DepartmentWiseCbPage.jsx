import { useState, useEffect, useRef, useMemo } from "react";
import { Search, RefreshCw, Building2, Package } from "lucide-react";

const BASE = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? ""
    : "https://silver-muller-seals-backend-deploy.onrender.com"
);

function ItemCodeSelect({ value, onChange, masterItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 420, maxHeight: 420, openUp: false });
  const inputRef = useRef(null);
  const selectedMaster = masterItems.find((m) => String(m.id) === String(value));

  useEffect(() => {
    setQuery(selectedMaster ? selectedMaster.code : "");
  }, [value, selectedMaster]);

  const updateCoords = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const gap = 6;
    const width = Math.min(Math.max(rect.width, 420), Math.max(320, window.innerWidth - 24));
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(260, Math.min(available - gap, 480));
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12);
    setCoords({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left,
      width,
      maxHeight,
      openUp,
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) && !e.target.closest(".item-code-dropdown-portal")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const newestFirst = [...masterItems].sort((a, b) => Number(b.id) - Number(a.id));
    if (!query.trim()) return newestFirst.slice(0, 200);
    const q = query.toLowerCase().trim();
    const starts = [];
    const codeHas = [];
    const descHas = [];
    for (const m of masterItems) {
      const code = String(m.code ?? "").toLowerCase();
      const desc = String(m.description ?? "").toLowerCase();
      if (code.startsWith(q)) starts.push(m);
      else if (code.includes(q)) codeHas.push(m);
      else if (desc.includes(q)) descHas.push(m);
    }
    starts.sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true, sensitivity: "base" }));
    return [...starts, ...codeHas, ...descHas].slice(0, 200);
  }, [query, masterItems]);

  const handleSelect = (itemObj) => {
    if (!itemObj) {
      onChange(null);
      setQuery("");
    } else {
      onChange(itemObj);
      setQuery(itemObj.code);
    }
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Type to search item code..."
          onClick={() => { updateCoords(); setIsOpen(true); }}
          onFocus={() => { updateCoords(); setIsOpen(true); }}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            updateCoords();
            setIsOpen(true);
            if (!val.trim()) onChange(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredItems[0]) {
              e.preventDefault();
              handleSelect(filteredItems[0]);
            }
            if (e.key === "Escape") setIsOpen(false);
          }}
          className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl pl-3.5 pr-8 py-2.5 text-slate-900 text-sm focus:outline-none font-medium placeholder:text-slate-400"
        />
        <Search className="w-4 h-4 absolute right-3 text-slate-400 pointer-events-none" />
      </div>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: coords.openUp ? "auto" : `${coords.top}px`,
            bottom: coords.openUp ? `${window.innerHeight - coords.top}px` : "auto",
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
          }}
          className="item-code-dropdown-portal z-[9999] flex flex-col overflow-hidden bg-white border border-slate-200 rounded-xl shadow-[0_16px_48px_rgba(15,23,42,0.18)] text-sm"
        >
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Item codes</span>
            <span className="text-[11px] font-medium text-sky-700">{filteredItems.length} shown</span>
          </div>
          <div onClick={() => handleSelect(null)} className="px-3 py-2 hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer border-b border-slate-100">
            No item selected
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            {filteredItems.length === 0 && (
              <div className="px-3 py-3 text-slate-500 text-sm">No item code starts with “{query.trim()}”.</div>
            )}
            {filteredItems.map((m) => (
              <div
                key={m.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(m)}
                className={`px-3 py-2 cursor-pointer border-b border-slate-50 grid grid-cols-[minmax(72px,0.4fr)_1fr] gap-3 ${
                  String(m.id) === String(value) ? "bg-sky-50 font-bold text-sky-900" : "hover:bg-sky-50/80"
                }`}
              >
                <span className="font-semibold tabular-nums">{m.code}</span>
                <span className="text-xs text-slate-500 truncate">{m.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "0.00";
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DepartmentWiseCbPage({ dark = false, isActive = true }) {
  const [masterItems, setMasterItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [category, setCategory] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      try {
        const [masterRes, catRes] = await Promise.all([
          fetch(`${BASE}/api/inventory/master`),
          fetch(`${BASE}/api/inventory/categories`),
        ]);
        const masters = masterRes.ok ? await masterRes.json() : [];
        const cats = catRes.ok ? await catRes.json() : [];
        if (!cancelled) {
          const list = Array.isArray(masters) ? masters : [];
          setMasterItems(list);
          setCategories(Array.isArray(cats) ? cats : []);
          setSelectedItem((prev) => {
            if (!prev?.id) return prev;
            return list.find((m) => String(m.id) === String(prev.id)) || prev;
          });
        }
      } catch {
        if (!cancelled) setError("Failed to load item / category lists.");
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isActive]);

  const loadReport = async (item, cat) => {
    if (!item?.code || !cat) {
      setReport(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE}/api/inventory/analysis/department-wise-cb?code=${encodeURIComponent(item.code)}&category=${encodeURIComponent(cat)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReport(null);
        setError(data.message || data.error || "Could not load department balances.");
        return;
      }
      setReport(data);
    } catch {
      setError("Could not load department balances.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    if (selectedItem?.code && category) {
      loadReport(selectedItem, category);
    } else {
      setReport(null);
    }
  }, [isActive, selectedItem?.id, selectedItem?.code, category]);

  const card = dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const title = dark ? "text-slate-100" : "text-slate-900";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className={`text-xl font-extrabold ${title} flex items-center gap-2`}>
          <Building2 className="w-5 h-5 text-sky-500" />
          Item wise CB
        </h2>
        <p className={`text-sm ${muted} mt-1`}>
          Select an item code and category. Only departments that actually hold that item + category are listed.
          Closing balance cannot go below zero.
        </p>
      </div>

      <div className={`border rounded-2xl p-5 shadow-sm ${card}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-slate-300" : "text-slate-700"}`}>
              Item Code <span className="text-sky-500">*</span>
            </label>
            <ItemCodeSelect
              value={selectedItem?.id || ""}
              onChange={(item) => {
                setSelectedItem(item && item.id ? item : null);
              }}
              masterItems={masterItems}
            />
            {bootLoading && <p className="text-xs text-slate-400 mt-1">Loading item codes…</p>}
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-slate-300" : "text-slate-700"}`}>
              Category <span className="text-sky-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id || c.categoryName} value={c.categoryName}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={!selectedItem?.code || !category || loading}
              onClick={() => loadReport(selectedItem, category)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-sky-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        {selectedItem && (
          <p className={`text-sm mt-3 ${muted}`}>
            <Package className="w-4 h-4 inline mr-1" />
            <span className="font-semibold text-slate-800">{selectedItem.code}</span>
            {" — "}
            {selectedItem.description}
            {selectedItem.unitOfMeasurement ? ` (${selectedItem.unitOfMeasurement})` : ""}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading && !report && (
        <p className={`text-sm ${muted}`}>Calculating department balances…</p>
      )}

      {report && (
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${card}`}>
          <div className={`px-5 py-3 border-b ${dark ? "border-slate-700" : "border-slate-200"} flex justify-between items-center`}>
            <p className={`text-sm font-bold ${title}`}>
              {report.itemCode} · {report.category}
            </p>
            {report.unitOfMeasurement && (
              <span className={`text-xs font-semibold ${muted}`}>UOM: {report.unitOfMeasurement}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">Department</th>
                  <th className="py-3 px-5 text-right">Opening Balance</th>
                  <th className="py-3 px-5 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(report.departments || []).map((row) => (
                  <tr key={row.departmentName} className="hover:bg-slate-50">
                    <td className="py-2.5 px-5 font-semibold text-slate-800">{row.departmentName}</td>
                    <td className="py-2.5 px-5 text-right tabular-nums text-slate-700">{fmt(row.openingBalance)}</td>
                    <td className="py-2.5 px-5 text-right tabular-nums font-bold text-sky-800">{fmt(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-extrabold text-slate-900 border-t-2 border-slate-200">
                  <td className="py-3 px-5">Total</td>
                  <td className="py-3 px-5 text-right tabular-nums">{fmt(report.totalOpening)}</td>
                  <td className="py-3 px-5 text-right tabular-nums text-sky-800">{fmt(report.totalClosing)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!loading && !report && selectedItem && !category && (
        <p className={`text-sm ${muted}`}>Select a category to see opening and closing balance in every department.</p>
      )}
    </div>
  );
}
