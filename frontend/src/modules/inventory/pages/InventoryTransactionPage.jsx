import { useState, useEffect, useRef } from "react";
import {
  FileText,
  ArrowRightLeft,
  History,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Building2,
  PlusCircle,
  Search,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  X,
  FileCheck,
} from "lucide-react";
import { useInventoryTransactions } from "../hooks/useInventoryTransactions";
import {
  downloadInventorySampleExcel,
  parseAndValidateInventoryExcel,
  exportTransactionsToExcel,
} from "../../../shared/utils/inventoryExcel";

export function InventoryTransactionPage({ defaultTab = "form" }) {
  const inv = useInventoryTransactions();
  const [activeTab, setActiveTab] = useState(defaultTab); // 'form' | 'history'

  // Excel Import State
  const excelInputRef = useRef(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState(null);
  const [isSavingExcel, setIsSavingExcel] = useState(false);

  // Format today's date e.g. "09-Aug-2026"
  const formattedToday = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, "-");

  // Form State
  const [txType, setTxType] = useState("ISSUE");
  const [manualSlipNumber, setManualSlipNumber] = useState("");
  const [fromDeptId, setFromDeptId] = useState("");
  const [toDeptId, setToDeptId] = useState("");
  const [remarks, setRemarks] = useState("");

  // Item Rows State for Multi-Item Slip
  const [items, setItems] = useState([
    { id: 1, category: "", masterId: "", quantity: "", remarks: "" }
  ]);

  // Feedback State
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: string }
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item-specific categories map for custom sub-categories per item code
  const itemCategoryMap = {
    "MAT-001": ["Raw Material - Prime Steel", "Raw Material - Coated Sheet", "Raw Material - Scrap Grade"],
    "MAT-002": ["Raw Material - Stainless Rod 304", "Raw Material - Stainless Rod 316", "Raw Material - Alloy Rod"],
    "MAT-003": ["Spare Parts - Deep Groove Bearing", "Spare Parts - Roller Bearing", "Spare Parts - Precision Seal Bearing"],
    "MAT-004": ["Consumables - High Temp Oil", "Consumables - Hydraulic Fluid", "Consumables - Gearbox Lubricant"],
    "MAT-005": ["Consumables - E6013 Electrode", "Consumables - E7018 Electrode", "Consumables - Stainless Electrode"]
  };

  // Helper to get categories available for a given item code / object
  const getCategoriesForItem = (masterObj) => {
    if (!masterObj) return ["Raw Material", "Spare Parts", "Consumables", "Finished Goods", "Sub-Assembly"];
    const code = masterObj.code;
    const customList = itemCategoryMap[code];
    if (customList && customList.length > 0) {
      return customList;
    }
    // Fallback: Primary category + variations
    const primary = masterObj.category || "General";
    return [primary, `${primary} - Standard`, `${primary} - Premium`, `${primary} - Grade B`];
  };

  // History Search & Filter State
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");

  // Automatically update preview transaction number when txType changes
  useEffect(() => {
    inv.fetchPreviewTransactionNumber(txType);
  }, [txType, inv.fetchPreviewTransactionNumber]);

  // Item Row Handlers
  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), category: "", masterId: "", quantity: "", remarks: "" },
    ]);
  };

  const handleRemoveItemRow = (id) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === "category") {
          return {
            ...item,
            category: value,
          };
        }

        if (field === "masterId") {
          // When item is selected, pick the first specific category from its dedicated list
          const selectedMaster = inv.masterItems.find((m) => String(m.id) === String(value));
          const availableCats = getCategoriesForItem(selectedMaster);
          return {
            ...item,
            masterId: value,
            category: availableCats.length > 0 ? availableCats[0] : (selectedMaster ? selectedMaster.category : ""),
          };
        }

        return { ...item, [field]: value };
      })
    );
  };

  // Find master item object by ID
  const getMasterItem = (masterId) => {
    if (!masterId) return null;
    return inv.masterItems.find((m) => String(m.id) === String(masterId)) || null;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!txType) {
      setAlert({ type: "error", message: "Please select a Transaction Type." });
      return;
    }
    if (!fromDeptId) {
      setAlert({ type: "error", message: "Please select a From Department." });
      return;
    }

    if (items.length === 0) {
      setAlert({ type: "error", message: "Please add at least one item row." });
      return;
    }

    // Validate item rows
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const sr = i + 1;
      if (!row.masterId) {
        setAlert({ type: "error", message: `Row ${sr}: Please select an Item Code.` });
        return;
      }
      const qty = Number(row.quantity);
      if (isNaN(qty) || qty <= 0) {
        setAlert({ type: "error", message: `Row ${sr}: Please enter a valid quantity greater than 0.` });
        return;
      }

      const masterObj = getMasterItem(row.masterId);
      if (masterObj && txType === "ISSUE") {
        const fromDeptBal = Number(inv.getDeptBalance(row.masterId, fromDeptId)) || 0;
        const fromDeptObj = inv.departments.find((d) => String(d.id) === String(fromDeptId));
        const fromDeptName = fromDeptObj ? fromDeptObj.name : "From Department";

        if (qty > fromDeptBal) {
          setAlert({
            type: "error",
            message: `Row ${sr} (${masterObj.code}): Transaction quantity (${qty} ${masterObj.unitOfMeasurement}) cannot be greater than closing balance in '${fromDeptName}' (${fromDeptBal} ${masterObj.unitOfMeasurement}).`,
          });
          return;
        }
      }
    }

    setIsSubmitting(true);
    const res = await inv.submitBatchTransaction({
      transactionType: txType,
      fromDepartmentId: fromDeptId,
      toDepartmentId: toDeptId || null,
      slipNumber: manualSlipNumber,
      items: items.map((it) => ({
        masterId: it.masterId,
        quantity: it.quantity,
        remarks: it.remarks,
      })),
      remarks,
    });
    setIsSubmitting(false);

    if (res.success) {
      setAlert({ type: "success", message: res.message });
      // Reset form state
      setManualSlipNumber("");
      setItems([{ id: Date.now(), masterId: "", quantity: "", remarks: "" }]);
      setRemarks("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setAlert({ type: "error", message: res.error });
    }
  };

  // Export History to CSV
  const handleExportCSV = () => {
    if (inv.transactions.length === 0) return;

    const headers = [
      "Transaction No",
      "Slip No",
      "Type",
      "From Dept",
      "To Dept",
      "Item Code",
      "Description",
      "Category",
      "Quantity",
      "UOM",
      "Timestamp",
      "Remarks",
    ];

    const rows = inv.transactions.map((tx) => [
      tx.transactionNumber || tx.slipNumber,
      `"${tx.slipNumber || '-'}"`,
      tx.transactionType,
      `"${tx.fromDepartmentName || '-'}"`,
      `"${tx.toDepartmentName || '-'}"`,
      tx.masterCode,
      `"${tx.masterDescription}"`,
      `"${tx.category || (getCategoriesForItem(getMasterItem(tx.masterId))[0]) || '-'}"`,
      tx.quantity,
      tx.unitOfMeasurement,
      `"${tx.transactionDate}"`,
      `"${tx.remarks || '-'}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ERP_Inventory_Transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Upload & Validation Handler
  const handleExcelFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelLoading(true);
    try {
      const result = await parseAndValidateInventoryExcel(file, {
        departments: inv.departments,
        masterItems: inv.masterItems,
        getDeptBalance: inv.getDeptBalance,
      });
      setExcelPreviewData(result);
      setShowExcelModal(true);
    } catch (err) {
      setAlert({
        type: "error",
        message: `Failed to process Excel file: ${err.message}`,
      });
    } finally {
      setExcelLoading(false);
      // Reset input value so same file can be uploaded again if needed
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!excelPreviewData || !excelPreviewData.records) return;

    // Filter out rows that had validation errors
    const validRecords = excelPreviewData.records.filter(
      (r) => !r._errors || r._errors.length === 0
    );

    if (validRecords.length === 0) {
      setAlert({
        type: "error",
        message: "No valid rows to import. Please resolve validation errors.",
      });
      return;
    }

    setIsSavingExcel(true);
    try {
      const res = await inv.submitExcelTransactions(validRecords);
      if (res.success) {
        setAlert({
          type: "success",
          message: res.message || `Successfully imported ${validRecords.length} transaction item(s)!`,
        });
        setShowExcelModal(false);
        setExcelPreviewData(null);
        setActiveTab("history"); // Switch to history tab to view imported transactions
      } else {
        setAlert({
          type: "error",
          message: res.error || "Failed to save Excel transactions to database.",
        });
      }
    } catch (err) {
      setAlert({
        type: "error",
        message: err.message || "An unexpected error occurred during Excel import.",
      });
    } finally {
      setIsSavingExcel(false);
    }
  };

  // Filtered transactions for history table
  const filteredHistory = inv.transactions.filter((tx) => {
    const txNum = (tx.transactionNumber || tx.slipNumber || "").toLowerCase();
    const slipNum = (tx.slipNumber || "").toLowerCase();
    const code = (tx.masterCode || "").toLowerCase();
    const desc = (tx.masterDescription || "").toLowerCase();
    const cat = (tx.category || "").toLowerCase();
    const search = historySearch.toLowerCase();

    const matchSearch =
      historySearch === "" ||
      txNum.includes(search) ||
      slipNum.includes(search) ||
      code.includes(search) ||
      desc.includes(search) ||
      cat.includes(search);

    const matchType =
      historyTypeFilter === "all" ||
      tx.transactionType.toLowerCase() === historyTypeFilter.toLowerCase();

    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={excelInputRef}
        onChange={handleExcelFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-xl bg-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
              <ArrowRightLeft className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  PostgreSQL Driven
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                  ERP Module
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Material Inventory Transaction
              </h1>
              <p className="text-slate-600 text-sm">
                Issue, Receipt & Stock Movement with Real-Time Database Validation
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download Sample Template */}
            <button
              onClick={() => downloadInventorySampleExcel(inv.departments, inv.masterItems)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-semibold transition border border-slate-300 shadow-2xs"
              title="Download Sample Excel Template (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Sample Template</span>
            </button>

            {/* Upload Excel Button */}
            <button
              onClick={() => excelInputRef.current?.click()}
              disabled={excelLoading}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 text-xs md:text-sm font-bold transition border border-sky-300 shadow-2xs"
              title="Upload & Import Excel Transactions"
            >
              {excelLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                  <span>Reading Excel...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-sky-600" />
                  <span>Import Excel</span>
                </>
              )}
            </button>

            {/* Refresh Data */}
            <button
              onClick={() => inv.reloadAll()}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-semibold transition border border-slate-300"
              title="Refresh Data from PostgreSQL"
            >
              <RefreshCw className={`w-4 h-4 ${inv.loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            {/* Database System Date */}
            <div className="bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-1.5 text-right hidden sm:block">
              <span className="text-[10px] text-slate-500 block font-medium">Database System Date</span>
              <span className="text-xs md:text-sm font-bold text-sky-700">{formattedToday}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 space-x-2">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex items-center space-x-2 px-5 py-3 font-bold text-sm transition-all border-b-2 ${
              activeTab === "form"
                ? "border-sky-500 text-sky-600 bg-white rounded-t-lg shadow-xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>New Transaction Form</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center space-x-2 px-5 py-3 font-bold text-sm transition-all border-b-2 ${
              activeTab === "history"
                ? "border-sky-500 text-sky-600 bg-white rounded-t-lg shadow-xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Transaction History ({inv.transactions.length})</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto">
        {/* Alert Notifications */}
        {alert && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start space-x-3 shadow-sm ${
              alert.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-sm">
                {alert.type === "success" ? "Transaction Saved" : "Validation / Error Warning"}
              </h4>
              <p className="text-sm mt-0.5 opacity-90">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="text-xs font-semibold opacity-70 hover:opacity-100 text-slate-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Top Section Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-sky-500" />
                  <span>Transaction Header Details</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select transaction type, departments, and optionally enter manual Slip Number.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* A. DATE */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date
                  </label>
                  <input
                    type="text"
                    value={formattedToday}
                    disabled
                    readOnly
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-700 text-sm font-semibold cursor-not-allowed"
                  />
                </div>

                {/* B. TYPE OF TRANSACTION */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Type of Transaction <span className="text-sky-500">*</span>
                  </label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    {inv.transactionTypes.map((tt) => (
                      <option key={tt.id} value={tt.type}>
                        {tt.type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* C. TRANSACTION NUMBER */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Transaction Number (Auto)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inv.previewTransactionNumber}
                      disabled
                      readOnly
                      className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3.5 py-2.5 text-sky-800 text-sm font-bold tracking-wider cursor-not-allowed shadow-inner"
                    />
                  </div>
                </div>

                {/* D. SLIP NUMBER (OPTIONAL MANUAL INPUT) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Slip Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Slip No..."
                    value={manualSlipNumber}
                    onChange={(e) => setManualSlipNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium"
                  />
                </div>

                {/* E. FROM DEPARTMENT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    From Department <span className="text-sky-500">*</span>
                  </label>
                  <select
                    value={fromDeptId}
                    onChange={(e) => setFromDeptId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium"
                  >
                    <option value="">-- Select From Department --</option>
                    {inv.departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* F. TO DEPARTMENT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    To Department
                  </label>
                  <select
                    value={toDeptId}
                    onChange={(e) => setToDeptId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium"
                  >
                    <option value="">-- Select To Department (Optional) --</option>
                    {inv.departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Item Transaction Table Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <Package className="w-5 h-5 text-sky-500" />
                    <span>Item Transaction Details</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Multiple items under Transaction Number <strong className="text-sky-600">{inv.previewTransactionNumber}</strong>
                    {manualSlipNumber ? (
                      <span> (Manual Slip No: <strong className="text-slate-800">{manualSlipNumber}</strong>)</span>
                    ) : null}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Add Item</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-800">
                  <thead className="bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 w-16 text-center">SR No.</th>
                      <th className="py-3.5 px-4 min-w-[160px]">Item Code</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Item Description</th>
                      <th className="py-3.5 px-4 min-w-[140px]">Category of Item</th>
                      <th className="py-3.5 px-4 min-w-[120px]">Unit & Measurement</th>
                      <th className="py-3.5 px-4 min-w-[140px] text-right">Closing Balance</th>
                      <th className="py-3.5 px-4 min-w-[160px]">Transaction Quantity</th>
                      <th className="py-3.5 px-4 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {items.map((row, index) => {
                      const masterObj = getMasterItem(row.masterId);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          {/* 1. SR NO. */}
                          <td className="py-3 px-4 text-center font-bold text-slate-500">
                            {index + 1}
                          </td>

                          {/* 2. ITEM CODE */}
                          <td className="py-3 px-4">
                            <select
                              value={row.masterId}
                              onChange={(e) => handleItemChange(row.id, "masterId", e.target.value)}
                              className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none font-medium"
                            >
                              <option value="">Select Item Code</option>
                              {inv.masterItems.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.code} ({m.description})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 3. ITEM DESCRIPTION */}
                          <td className="py-3 px-4 text-slate-800">
                            {masterObj ? (
                              <span className="font-semibold text-slate-900">{masterObj.description}</span>
                            ) : (
                              <span className="text-slate-400 italic">Select an item...</span>
                            )}
                          </td>

                          {/* 4. CATEGORY OF ITEM */}
                          <td className="py-3 px-4">
                            {!masterObj ? (
                              <select
                                disabled
                                value=""
                                className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-400 text-sm focus:outline-none cursor-not-allowed italic"
                              >
                                <option value="">Select an item code...</option>
                              </select>
                            ) : (
                              (() => {
                                const itemCategories = getCategoriesForItem(masterObj);
                                return (
                                  <select
                                    value={row.category || (itemCategories[0] || "")}
                                    onChange={(e) => handleItemChange(row.id, "category", e.target.value)}
                                    className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none font-medium"
                                  >
                                    {itemCategories.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()
                            )}
                          </td>

                          {/* 5. UNIT & MEASUREMENT */}
                          <td className="py-3 px-4 text-slate-800 font-semibold">
                            {masterObj ? masterObj.unitOfMeasurement : "-"}
                          </td>

                          {/* 6. CLOSING BALANCE */}
                          <td className="py-3 px-4 text-right font-bold">
                            {masterObj ? (() => {
                              const deptBal = Number(inv.getDeptBalance(row.masterId, fromDeptId)) || 0;
                              const fromDeptObj = inv.departments.find((d) => String(d.id) === String(fromDeptId));
                              const deptLabel = fromDeptObj ? fromDeptObj.name : "From Dept";
                              return (
                                <div>
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                                      deptBal > 0
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                    }`}
                                  >
                                    {deptBal.toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                  <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                                    in {deptLabel}
                                  </span>
                                </div>
                              );
                            })() : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>

                          {/* 7. TRANSACTION QUANTITY */}
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="Enter quantity"
                              value={row.quantity}
                              onChange={(e) => handleItemChange(row.id, "quantity", e.target.value)}
                              className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-lg px-3 py-2 text-slate-900 text-sm font-semibold focus:outline-none"
                            />
                          </td>

                          {/* 8. ACTION (REMOVE ROW) */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(row.id)}
                              disabled={items.length <= 1}
                              className={`p-1.5 rounded-lg transition ${
                                items.length > 1
                                  ? "text-rose-600 hover:bg-rose-100"
                                  : "text-slate-300 cursor-not-allowed"
                              }`}
                              title="Remove item row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Remarks & Save Transaction Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <div className="flex-1 max-w-lg">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Optional transaction reference or notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-base shadow-md transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Processing Database Transaction...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Save Transaction</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-sky-500" />
                  <span>PostgreSQL Transaction Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Complete list of all persistent inventory movements and stock adjustments.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => exportTransactionsToExcel(inv.transactions)}
                  disabled={inv.transactions.length === 0}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs md:text-sm transition border border-sky-300 shadow-2xs disabled:opacity-50"
                  title="Export full transaction history to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={inv.transactions.length === 0}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs md:text-sm transition border border-slate-300 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Transaction No, Slip No, Item Code, or Description..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="all">All Transaction Types</option>
                  <option value="issue">ISSUE</option>
                  <option value="receipt">RECEIPT</option>
                  <option value="reverse">REVERSE</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Transaction No.</th>
                    <th className="py-3.5 px-4">Slip No.</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">From Dept</th>
                    <th className="py-3.5 px-4">To Dept</th>
                    <th className="py-3.5 px-4">Item Code</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Quantity</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((tx) => {
                      const masterObj = inv.masterItems.find((m) => String(m.id) === String(tx.masterId));
                      const itemCategory = masterObj ? masterObj.category : null;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-sky-700">
                            {tx.transactionNumber || tx.slipNumber}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {tx.slipNumber ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800">
                                {tx.slipNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                tx.transactionType === "ISSUE"
                                  ? "bg-amber-50 text-amber-800 border-amber-300"
                                  : tx.transactionType === "RECEIPT"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-purple-50 text-purple-800 border-purple-300"
                              }`}
                            >
                              {tx.transactionType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{tx.fromDepartmentName || "-"}</td>
                          <td className="py-3 px-4 text-slate-700">{tx.toDepartmentName || "-"}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{tx.masterCode}</td>
                          <td className="py-3 px-4 text-slate-700">{tx.masterDescription}</td>
                          <td className="py-3 px-4 text-slate-700">
                            {(() => {
                              const displayCat = tx.category || (itemCategory ? (getCategoriesForItem(masterObj)[0] || itemCategory) : null);
                              return displayCat ? (
                                <span className="inline-block px-2.5 py-1 rounded-md bg-sky-50 text-xs font-bold text-sky-800 border border-sky-200">
                                  {displayCat}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-xs">-</span>
                              );
                            })()}
                          </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {tx.quantity} {tx.unitOfMeasurement}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {new Date(tx.transactionDate).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">{tx.remarks || "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                    <tr>
                      <td colSpan="11" className="py-8 text-center text-slate-500 text-sm">
                        No transaction records match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Excel Import & Validation Preview Modal */}
      {showExcelModal && excelPreviewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="max-w-5xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-6 py-4 flex items-center justify-between text-white shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Bulk Excel Transactions Import & Validation</h3>
                  <p className="text-xs text-sky-100">
                    Verify row-by-row item codes, department routes, and real-time stock balances before saving.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelPreviewData(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                  <span className="text-xs text-slate-500 font-semibold block">Total Rows In Sheet</span>
                  <span className="text-xl font-extrabold text-slate-800">
                    {excelPreviewData.records.length}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
                  <span className="text-xs text-emerald-700 font-semibold block">Valid Ready to Save</span>
                  <span className="text-xl font-extrabold text-emerald-800">
                    {excelPreviewData.validCount || 0}
                  </span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 shadow-2xs">
                  <span className="text-xs text-rose-700 font-semibold block">Validation Errors</span>
                  <span className="text-xl font-extrabold text-rose-800">
                    {excelPreviewData.errorCount || 0}
                  </span>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 shadow-2xs">
                  <span className="text-xs text-sky-700 font-semibold block">Auto-Numbering</span>
                  <span className="text-xs font-bold text-sky-800 block mt-1">
                    Auto-Generated on Save
                  </span>
                </div>
              </div>

              {/* Error Alert Box (if any errors found) */}
              {excelPreviewData.errors && excelPreviewData.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 shadow-2xs space-y-2">
                  <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>Please fix the following {excelPreviewData.errors.length} issue(s) before importing:</span>
                  </div>
                  <ul className="text-xs space-y-1 pl-6 list-disc text-rose-700 max-h-32 overflow-y-auto">
                    {excelPreviewData.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Excel Rows Preview ({excelPreviewData.records.length} items)
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Green = Valid &amp; Stock Verified | Red = Needs Correction
                  </span>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Slip No.</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">From Dept</th>
                        <th className="py-2.5 px-3">To Dept</th>
                        <th className="py-2.5 px-3">Item Code</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3">Validation Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {excelPreviewData.records.map((r, i) => {
                        const hasErrors = r._errors && r._errors.length > 0;
                        return (
                          <tr
                            key={i}
                            className={`transition ${
                              hasErrors ? "bg-rose-50/70 hover:bg-rose-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              {hasErrors ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                  Invalid
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Ready
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-500">#{r.rowNumber}</td>
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                              {r.slipNumber || <span className="text-slate-400 italic">Auto</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                  r.type === "ISSUE"
                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                    : r.type === "RECEIPT"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : "bg-purple-50 text-purple-800 border-purple-300"
                                }`}
                              >
                                {r.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{r.fromDepartmentName || r.fromDept}</td>
                            <td className="py-2.5 px-3 text-slate-600">{r.toDepartmentName || r.toDept || "-"}</td>
                            <td className="py-2.5 px-3 font-bold text-sky-700">{r.masterCode || r.itemCode}</td>
                            <td className="py-2.5 px-3 text-slate-700">{r.category}</td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                              {r.quantity} {r.unitOfMeasurement || ""}
                            </td>
                            <td className="py-2.5 px-3">
                              {hasErrors ? (
                                <span className="text-rose-700 font-semibold">{r._errors.join(", ")}</span>
                              ) : (
                                <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                                  <span>Passed All Validations</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                onClick={() => downloadInventorySampleExcel(inv.departments, inv.masterItems)}
                className="flex items-center space-x-1.5 text-xs text-sky-700 font-semibold hover:underline"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Need Excel format template? Download here (.xlsx)</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowExcelModal(false);
                    setExcelPreviewData(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-semibold transition border border-slate-300"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmExcelImport}
                  disabled={isSavingExcel || (excelPreviewData.validCount || 0) === 0}
                  className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs md:text-sm font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSavingExcel ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Transactions to Database...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>
                        Import &amp; Save {excelPreviewData.validCount || 0} Valid Transaction(s)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
