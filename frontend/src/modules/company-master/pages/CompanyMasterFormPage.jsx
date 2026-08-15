import { useState, useRef } from "react";
import { Building2, Upload, Plus, Save, X, AlertTriangle, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Eye, Pencil, ArrowLeft } from "lucide-react";
import { C } from "../../../shared/constants/constants";
import { CM_BASIC_FIELDS, CM_TABS } from "../data/companyMasterFields";
import { PageHero } from "../../../shared/components/PageHero";
import { Section } from "../../../shared/components/Section";
import { MasterField } from "../components/MasterField";
import { CompanyMasterSubNav } from "../components/CompanyMasterSubNav";
import { downloadSampleExcel } from "../../../shared/utils/excel";

export function CompanyMasterFormPage({ cm, page, setPage }) {
  const { form, editingId, isReadOnly, setIsReadOnly, activeTab, setActiveTab, toast, handleChange, handleLogo, handleNew, handleSave, handleImportExcel, records, loading, loadError, errors } = cm;

  const [excelFile, setExcelFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const fileInputRef = useRef(null);

  const onSave = async () => {
    const ok = await handleSave();
    if (ok) setPage("company-master-list");
  };

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      setImportErrors([]);
    }
  };

  const onImportExcel = async () => {
    if (!excelFile) return;
    setImporting(true);
    setImportErrors([]);

    const res = await handleImportExcel(excelFile);
    setImporting(false);

    if (res.success) {
      setExcelFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPage("company-master-list");
    } else {
      setImportErrors(res.errors || ["Validation failed."]);
      setShowErrorModal(true);
    }
  };

  return (
    <>
      <PageHero title="Company Master — Entry Form" subtitle="Screen 1: enter or update a company's core, legal and address details, or import via Excel." />
      <Section>
        <CompanyMasterSubNav page={page} setPage={setPage} recordCount={records.length} onNew={handleNew} />

        {/* Read Only Banner */}
        {isReadOnly && (
          <div className="mb-5 p-3.5 rounded-xl border bg-blue-50/80 border-blue-200 text-blue-900 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <span className="flex items-center gap-2">
              <Eye size={18} className="text-blue-600 shrink-0" />
              <span><strong>View Record Mode</strong> — You are viewing this record in read-only format. Editing is currently disabled.</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNew}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs"
              >
                <Plus size={13} /> Create New Record
              </button>
              <button
                type="button"
                onClick={() => setIsReadOnly(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
              >
                <Pencil size={13} /> Switch to Edit Mode
              </button>
              <button
                type="button"
                onClick={() => setPage("company-master-list")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-slate-700 border hover:bg-slate-50 transition"
                style={{ borderColor: C.line }}
              >
                <ArrowLeft size={13} /> Back to Records
              </button>
            </div>
          </div>
        )}

        {/* Excel Import Card */}
        {!isReadOnly && (
          <div className="mb-6 p-5 rounded-2xl border shadow-sm transition-all duration-200 bg-gradient-to-r from-sky-50/70 via-white to-cyan-50/40 border-sky-200/80 dark:from-slate-800/90 dark:via-slate-800/90 dark:to-sky-950/30 dark:border-sky-800/40 dark:shadow-slate-950/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-400 font-bold shrink-0 shadow-xs border border-sky-200/60 dark:border-sky-800/50">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Import Companies from Excel Sheet
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                      Bulk Import
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload an <code>.xlsx</code> / <code>.csv</code> file. Validates required fields & ensures no duplicate records before auto-saving to database.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={downloadSampleExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700/80 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-600 transition shadow-2xs"
                >
                  <Download size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Download Excel Sheet Template</span>
                </button>

                <label className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border bg-white hover:bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-600 cursor-pointer transition shadow-2xs">
                  <Upload size={14} className="text-sky-600 dark:text-sky-400" />
                  <span>{excelFile ? excelFile.name : "Select Excel File"}</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={onFileSelect}
                  />
                </label>

                {excelFile && (
                  <button
                    type="button"
                    onClick={onImportExcel}
                    disabled={importing}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-xl text-white transition shadow-md bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
                  >
                    {importing ? (
                      "Validating & Importing…"
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Import & Save
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loadError && (
          <div className="mb-5 px-4 py-3 rounded-xl border text-sm bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300">
            Couldn't reach the backend/database ({loadError}). Make sure the API server in <code>/backend</code> is running
            (<code>npm run dev</code> inside that folder) and PostgreSQL is up.
          </div>
        )}

        {errors?._global && (
          <div className="mb-5 px-4 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2.5 shadow-sm bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300">
            <AlertTriangle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errors._global}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-16 text-sm font-semibold">Loading…</div>
        ) : (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
            {/* Basic Company Information — static top section */}
            <div className="p-6 border-b border-sky-100 dark:border-slate-700/80 bg-sky-50/40 dark:bg-slate-850/60">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h3 className="text-base font-extrabold flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                    <Building2 size={18} />
                  </div>
                  <span>Basic Company Information</span>
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    (<span className="text-red-500 font-bold">*</span> indicates required field)
                  </span>
                  {editingId && (
                    <span className="text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {isReadOnly ? <Eye size={13} /> : <Pencil size={13} />}
                      {isReadOnly ? "Read-Only View" : "Editing existing record"}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                {CM_BASIC_FIELDS.map((f) => (
                  <MasterField key={f.key} f={f} value={form[f.key]} onChange={handleChange} error={errors?.[f.key]} disabled={isReadOnly} />
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Company Logo</label>
                  <label className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm transition ${isReadOnly ? 'bg-slate-100/90 dark:bg-slate-950/70 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer hover:border-sky-400'}`}>
                    <Upload size={14} className="text-sky-600 dark:text-sky-400" />
                    <span>{form.logo ? (isReadOnly ? "Logo attached" : "Replace logo") : "Upload logo"}</span>
                    <input type="file" accept="image/*" disabled={isReadOnly} className="hidden" onChange={handleLogo} />
                  </label>
                </div>
                {form.logo && (
                  <div className="flex items-end">
                    <img src={form.logo} alt="Company logo preview" className="h-12 rounded-lg border border-slate-300 dark:border-slate-700 shadow-xs" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Status</label>
                  <select
                    value={form.status}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className={`border rounded-lg px-3 py-2 text-sm transition ${isReadOnly ? 'bg-slate-100/90 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800 font-semibold' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400'}`}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Legal Information / Address Details — dynamic tabs */}
            <div>
              <div className="flex border-b overflow-x-auto border-slate-200">
                {CM_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className="px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition"
                    style={activeTab === t.id ? { borderColor: "#0EA5E9", color: "#0EA5E9" } : { borderColor: "transparent", color: "#64748b" }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="p-5 grid sm:grid-cols-3 gap-4 min-h-[140px]">
                {CM_TABS.find((t) => t.id === activeTab).fields.map((f) => {
                  // Hide specify country field unless Country is "Other"
                  if (f.key === "otherCountry" && form.country !== "Other") {
                    return null;
                  }

                  // Dynamically configure State field based on selected Country
                  let effectiveField = { ...f };
                  if (f.key === "state") {
                    if (form.country === "Other") {
                      effectiveField = {
                        key: "state",
                        label: "State / Province",
                        type: "text",
                        required: true,
                        placeholder: "e.g. California, Ontario, Bavaria",
                      };
                    } else {
                      effectiveField = {
                        ...f,
                        label: "State",
                        type: "select",
                        required: true,
                      };
                    }
                  }

                  return (
                    <MasterField
                      key={f.key}
                      f={effectiveField}
                      value={form[f.key]}
                      onChange={handleChange}
                      error={errors?.[f.key]}
                      disabled={isReadOnly}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/70">
              <button
                onClick={handleNew}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg border bg-white hover:bg-slate-50 transition shadow-xs text-slate-800"
                style={{ borderColor: "#cbd5e1" }}
              >
                <Plus size={15} /> New / Create New Record
              </button>

              {!isReadOnly ? (
                <button
                  onClick={onSave}
                  className="flex items-center gap-1.5 px-6 py-2 text-sm font-bold rounded-lg text-white transition shadow-sm bg-[#0EA5E9] hover:bg-[#0284C7]"
                >
                  <Save size={15} /> Save
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsReadOnly(false)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded text-white bg-[#0EA5E9] hover:bg-[#0284C7] transition"
                  >
                    <Pencil size={15} /> Edit Record
                  </button>
                  <button
                    onClick={() => setPage("company-master-list")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded border bg-white text-slate-700 hover:bg-slate-50 transition"
                    style={{ borderColor: C.line }}
                  >
                    <ArrowLeft size={15} /> Back to Records List
                  </button>
                </>
              )}

              {editingId && !isReadOnly && (
                <button onClick={handleNew} className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded text-slate-500 ml-auto hover:text-slate-700">
                  <X size={15} /> Cancel edit
                </button>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Excel Import Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-red-50/50" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2.5 text-red-700 font-bold text-sm">
                <AlertCircle size={20} className="text-red-600 shrink-0" />
                <span>Excel Import Validation Failed ({importErrors.length} errors)</span>
              </div>
              <button onClick={() => setShowErrorModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
              <p className="text-xs text-slate-600 mb-3">
                The uploaded Excel file could not be imported because it violated one or more constraints or duplicate checks:
              </p>
              {importErrors.map((err, i) => (
                <div key={i} className="p-2.5 rounded text-xs border bg-red-50/60 border-red-200 text-red-800 font-medium">
                  {err}
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={downloadSampleExcel}
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Download size={13} /> Download Sample Template
              </button>
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-700"
              >
                Close & Fix Excel
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


