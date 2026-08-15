import { useState } from "react";
import { Search, ListChecks, Building2, Pencil, Trash2, FileSpreadsheet, Download, ExternalLink, Check, X, CheckSquare, Square, Eye, FileText } from "lucide-react";
import { C } from "../../../shared/constants/constants";
import { PageHero } from "../../../shared/components/PageHero";
import { Section } from "../../../shared/components/Section";
import { CompanyMasterSubNav } from "../components/CompanyMasterSubNav";
import { exportRecordsToExcel, ALL_FIELDS_CONFIG } from "../../../shared/utils/excel";

export function CompanyMasterListPage({ cm, page, setPage }) {
  const { records, loading, loadError, search, setSearch, confirmId, setConfirmId, handleEdit, handleViewRecord, handleDelete, filtered, toast } = cm;

  // Excel Export & View State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState("all"); // "all" | "manual"
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [generatedRecords, setGeneratedRecords] = useState(null);
  const [showGeneratedOptions, setShowGeneratedOptions] = useState(false);
  const [openSheetModal, setOpenSheetModal] = useState(false);
  const [viewerSearch, setViewerSearch] = useState("");
  const [viewChoiceRecord, setViewChoiceRecord] = useState(null);

  const onEdit = (rec) => {
    handleEdit(rec);
    setPage("company-master-form");
  };

  const onRecordClick = (rec) => {
    if (exportMode === "manual") {
      toggleSelectRecord(rec.id);
    } else {
      setViewChoiceRecord(rec);
    }
  };

  const openRecordInForm = () => {
    if (!viewChoiceRecord) return;
    handleViewRecord(viewChoiceRecord);
    setViewChoiceRecord(null);
    setPage("company-master-form");
  };

  const openRecordInExcelSheet = () => {
    if (!viewChoiceRecord) return;
    setGeneratedRecords([viewChoiceRecord]);
    setViewChoiceRecord(null);
    setOpenSheetModal(true);
  };

  const toggleSelectRecord = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const openExportDialog = () => {
    setExportModalOpen(true);
    setShowGeneratedOptions(false);
    setGeneratedRecords(null);
  };

  const handleGenerateSheet = () => {
    let recordsToExport = [];
    if (exportMode === "all") {
      recordsToExport = records;
    } else {
      recordsToExport = records.filter((r) => selectedIds.has(r.id));
    }

    if (recordsToExport.length === 0) {
      alert("Please select at least 1 company record to generate the Excel sheet.");
      return;
    }

    setGeneratedRecords(recordsToExport);
    setShowGeneratedOptions(true);
  };

  const handleDownloadSheet = () => {
    if (!generatedRecords || generatedRecords.length === 0) return;
    const filename = `Company_Master_Records_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportRecordsToExcel(generatedRecords, filename);
  };

  const handleOpenSheet = () => {
    setOpenSheetModal(true);
  };

  // Filter records in the Open Sheet viewer
  const viewerFilteredRecords = (generatedRecords || []).filter((r) =>
    `${r.companyName || ""} ${r.companyCode || ""} ${r.city || ""} ${r.state || ""}`
      .toLowerCase()
      .includes(viewerSearch.toLowerCase())
  );

  return (
    <>
      <PageHero title="Company Master — Records" subtitle="Screen 2: every company entered on Screen 1, to date. Edit, delete, or export to Excel." />
      <Section>
        <CompanyMasterSubNav page={page} setPage={setPage} recordCount={records.length} />

        {loadError && (
          <div className="mb-5 px-4 py-3 rounded-lg border text-sm" style={{ borderColor: "#fecaca", backgroundColor: "#fef2f2", color: "#b91c1c" }}>
            Couldn't reach the backend/database ({loadError}). Make sure the API server in <code>/backend</code> is running
            (<code>npm run dev</code> inside that folder) and PostgreSQL is up.
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-16 text-sm">Loading…</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: C.line }}>
            {/* Search & Export Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b" style={{ borderColor: C.line, backgroundColor: "#FCFBF9" }}>
              <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md bg-white border rounded px-3 py-1.5" style={{ borderColor: C.line }}>
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by company name or code…"
                  className="w-full text-sm outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                {exportMode === "manual" && (
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border bg-white text-slate-700 hover:bg-slate-50 transition"
                    style={{ borderColor: C.line }}
                  >
                    {selectedIds.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare size={14} className="text-emerald-600" />
                    ) : (
                      <Square size={14} className="text-slate-400" />
                    )}
                    Select All ({selectedIds.size}/{filtered.length})
                  </button>
                )}

                <button
                  onClick={openExportDialog}
                  disabled={records.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs transition bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
                >
                  <FileSpreadsheet size={15} />
                  Export to Excel
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <ListChecks className="mx-auto mb-2 opacity-40" size={28} />
                No company records yet — save one from Screen 1, the Entry Form.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: C.line }}>
                {filtered.map((r) => {
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => onRecordClick(r)}
                      className={`flex items-center justify-between px-5 py-3 transition cursor-pointer ${
                        isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {exportMode === "manual" && (
                          <div className="shrink-0 text-emerald-600">
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300" />}
                          </div>
                        )}

                        {r.logo ? (
                          <img src={r.logo} alt="" className="w-9 h-9 rounded object-cover border" style={{ borderColor: C.line }} />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-sky-50 border border-sky-100 text-sky-600">
                            <Building2 size={16} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="font-medium text-sm text-slate-800 truncate">
                            {r.companyName} <span className="text-slate-400 font-normal">· {r.companyCode}</span>
                          </div>
                          <div className="text-xs text-slate-500 truncate flex items-center gap-2">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: r.status === "Active" ? "#16a34a" : "#94a3b8" }}
                            />
                            {r.status} · {r.industry || "No industry set"} · PAN: {r.panNo || "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onEdit(r)} className="p-1.5 rounded text-slate-500 hover:bg-slate-100" style={{ "--hover": C.red }}>
                          <Pencil size={15} />
                        </button>
                        {confirmId === r.id ? (
                          <>
                            <button onClick={() => handleDelete(r.id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Confirm</button>
                            <button onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 rounded text-slate-500">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmId(r.id)} className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Export Options Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2.5 font-bold text-slate-800 text-sm">
                <FileSpreadsheet size={20} className="text-emerald-600" />
                <span>Export Stored Company Records to Excel</span>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {!showGeneratedOptions ? (
                <>
                  <p className="text-xs text-slate-600">
                    Choose how you want to select company records for generating the Excel sheet:
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Add All Option */}
                    <button
                      type="button"
                      onClick={() => setExportMode("all")}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                        exportMode === "all"
                          ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-400/40"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">Add All</span>
                        {exportMode === "all" && <Check size={16} className="text-emerald-700 font-bold" />}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Export every record ({records.length} total) present in the database.
                      </p>
                    </button>

                    {/* Add Manually Option */}
                    <button
                      type="button"
                      onClick={() => setExportMode("manual")}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                        exportMode === "manual"
                          ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-400/40"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">Add Manually</span>
                        {exportMode === "manual" && <Check size={16} className="text-emerald-700 font-bold" />}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Manually pick/checkbox specific companies from Screen 2 list.
                      </p>
                    </button>
                  </div>

                  {exportMode === "manual" && (
                    <div className="p-3 rounded-lg border bg-amber-50/60 border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                      <span>Click checkboxes on Screen 2 list items to select records.</span>
                      <span className="font-bold text-emerald-800">{selectedIds.size} selected</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerateSheet}
                      className="px-5 py-2 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
                    >
                      Submit & Generate Sheet
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-900 text-xs flex items-center gap-3">
                    <FileSpreadsheet size={24} className="text-emerald-700 shrink-0" />
                    <div>
                      <h5 className="font-bold text-sm">Excel Sheet Generated Successfully!</h5>
                      <p className="text-slate-600 mt-0.5">
                        Contains {generatedRecords?.length} company record(s). Select an action below:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Download Sheet Option */}
                    <button
                      type="button"
                      onClick={handleDownloadSheet}
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition group text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition">
                        <Download size={20} />
                      </div>
                      <span className="font-bold text-xs text-slate-800">Download Sheet</span>
                      <span className="text-[10px] text-slate-500">Saves .xlsx to your PC Downloads folder</span>
                    </button>

                    {/* Open Sheet Option */}
                    <button
                      type="button"
                      onClick={handleOpenSheet}
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 transition group text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition">
                        <ExternalLink size={20} />
                      </div>
                      <span className="font-bold text-xs text-slate-800">Open Sheet</span>
                      <span className="text-[10px] text-slate-500">View spreadsheet inside website</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-Website Spreadsheet Viewer Modal ("Open Sheet") */}
      {openSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-6xl w-full h-[85vh] border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={22} className="text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    Company Master — Excel Sheet Viewer
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {viewerFilteredRecords.length} records
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Interactive spreadsheet preview inside website</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadSheet}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  <Download size={14} /> Download Excel (.xlsx)
                </button>

                <button onClick={() => setOpenSheetModal(false)} className="p-1 rounded text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Viewer Search Bar */}
            <div className="p-3 border-b bg-slate-50 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded text-xs flex-1 max-w-md" style={{ borderColor: C.line }}>
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  value={viewerSearch}
                  onChange={(e) => setViewerSearch(e.target.value)}
                  placeholder="Filter grid by company, code, city or state…"
                  className="w-full outline-none bg-transparent"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Showing {viewerFilteredRecords.length} of {generatedRecords?.length} rows
              </span>
            </div>

            {/* Spreadsheet Table Grid */}
            <div className="flex-1 overflow-auto bg-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-200 text-slate-700 font-bold z-10 shadow-xs">
                  <tr>
                    <th className="p-2.5 border-b border-r text-center w-12 bg-slate-300">#</th>
                    {ALL_FIELDS_CONFIG.map((f) => (
                      <th key={f.key} className="p-2.5 border-b border-r whitespace-nowrap bg-slate-200">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {viewerFilteredRecords.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-amber-50/50 transition font-mono text-[11px]">
                      <td className="p-2 border-r text-center text-slate-400 bg-slate-50 font-sans font-medium">{idx + 1}</td>
                      {ALL_FIELDS_CONFIG.map((f) => (
                        <td key={f.key} className="p-2 border-r whitespace-nowrap text-slate-700 max-w-[200px] truncate">
                          {r[f.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Ready for download or export.</span>
              <button
                onClick={() => setOpenSheetModal(false)}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record View Choice Modal */}
      {viewChoiceRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2.5 font-bold text-slate-800 text-sm truncate">
                <Building2 size={18} className="shrink-0 text-sky-600" />
                <span className="truncate">{viewChoiceRecord.companyName} ({viewChoiceRecord.companyCode})</span>
              </div>
              <button onClick={() => setViewChoiceRecord(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                How would you like to view this company record?
              </p>

              <div className="space-y-3">
                {/* Open Record in Form */}
                <button
                  type="button"
                  onClick={openRecordInForm}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 group-hover:text-blue-700">Open record in form</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Opens Screen 1 Entry Form in Read-Only view mode (editing disabled).
                    </p>
                  </div>
                </button>

                {/* Open Record in Excel Sheet */}
                <button
                  type="button"
                  onClick={openRecordInExcelSheet}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition group text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 group-hover:text-emerald-700">Open record in excel sheet</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Opens this record inside the in-website tabular Excel sheet viewer.
                    </p>
                  </div>
                </button>
              </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewChoiceRecord(null)}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-white text-sm px-4 py-2 rounded-lg shadow-lg" style={{ backgroundColor: C.ink }}>
          {toast}
        </div>
      )}
    </>
  );
}

