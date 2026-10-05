import { useState, useEffect, useMemo } from "react";
import { Building2, RefreshCw, Search } from "lucide-react";

const BASE = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? ""
    : "https://silver-muller-seals-backend-deploy.onrender.com"
);

function fmt(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "0.00";
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DepartmentStockPage({ dark = false, isActive = true }) {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/inventory/departments`);
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setDepartments(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("Failed to load departments.");
      }
    })();
    return () => { cancelled = true; };
  }, [isActive]);

  const loadReport = async (id) => {
    if (!id) {
      setReport(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/inventory/analysis/department-stock?departmentId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReport(null);
        setError(data.message || "Could not load department stock.");
        return;
      }
      setReport(data);
    } catch {
      setError("Could not load department stock.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    if (departmentId) loadReport(departmentId);
    else {
      setReport(null);
      setSearch("");
    }
  }, [departmentId, isActive]);

  const filteredItems = useMemo(() => {
    const items = report?.items || [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) =>
      String(row.itemCode || "").toLowerCase().includes(q) ||
      String(row.itemName || "").toLowerCase().includes(q) ||
      String(row.category || "").toLowerCase().includes(q)
    );
  }, [report, search]);

  const filteredOpening = filteredItems.reduce((s, r) => s + (Number(r.openingBalance) || 0), 0);
  const filteredQty = filteredItems.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  const title = dark ? "text-slate-100" : "text-slate-900";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const card = dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className={`text-xl font-extrabold ${title} flex items-center gap-2`}>
          <Building2 className="w-5 h-5 text-sky-500" />
          Department wise CB
        </h2>
        <p className={`text-sm ${muted} mt-1`}>
          Select a department to see which items it currently holds (closing balance greater than zero), with item code, name, and quantity.
        </p>
      </div>

      <div className={`border rounded-2xl p-5 shadow-sm ${card}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-slate-300" : "text-slate-700"}`}>
              Department <span className="text-sky-500">*</span>
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-slate-300" : "text-slate-700"}`}>
              Search item
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!report}
                placeholder="Search item code or name..."
                className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={!departmentId || loading}
              onClick={() => loadReport(departmentId)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-sky-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm font-medium">{error}</div>
      )}

      {loading && !report && <p className={`text-sm ${muted}`}>Loading items in this department…</p>}

      {report && (
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${card}`}>
          <div className={`px-5 py-3 border-b ${dark ? "border-slate-700" : "border-slate-200"} flex justify-between items-center`}>
            <p className={`text-sm font-bold ${title}`}>{report.departmentName}</p>
            <span className={`text-xs font-semibold ${muted}`}>
              {filteredItems.length} of {(report.items || []).length} item(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">Item Code</th>
                  <th className="py-3 px-5">Item Name</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">UOM</th>
                  <th className="py-3 px-5 text-right">Opening</th>
                  <th className="py-3 px-5 text-right">Quantity (CB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(report.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-5 text-center text-slate-400 italic">
                      No items with stock in this department.
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-5 text-center text-slate-400 italic">
                      No item matching “{search}”.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row) => (
                    <tr key={`${row.itemCode}-${row.category}`} className="hover:bg-slate-50">
                      <td className="py-2.5 px-5 font-bold text-sky-800 tabular-nums">{row.itemCode}</td>
                      <td className="py-2.5 px-5 font-medium text-slate-800">{row.itemName}</td>
                      <td className="py-2.5 px-5 text-slate-600">{row.category || "-"}</td>
                      <td className="py-2.5 px-5 text-slate-600">{row.unitOfMeasurement || "-"}</td>
                      <td className="py-2.5 px-5 text-right tabular-nums text-slate-700">{fmt(row.openingBalance)}</td>
                      <td className="py-2.5 px-5 text-right tabular-nums font-bold text-sky-800">{fmt(row.quantity)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-extrabold text-slate-900 border-t-2 border-slate-200">
                    <td className="py-3 px-5" colSpan={4}>{search.trim() ? "Total (filtered)" : "Total"}</td>
                    <td className="py-3 px-5 text-right tabular-nums">{fmt(filteredOpening)}</td>
                    <td className="py-3 px-5 text-right tabular-nums text-sky-800">{fmt(filteredQty)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
