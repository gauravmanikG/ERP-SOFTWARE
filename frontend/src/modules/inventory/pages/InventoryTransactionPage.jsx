import { useState } from "react";
import {
  FileText,
  ArrowRightLeft,
  History,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Building2,
  Scale,
  PlusCircle,
  Search,
  Download,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { C } from "../../../shared/constants/constants";
import { useInventoryTransactions } from "../hooks/useInventoryTransactions";

export function InventoryTransactionPage() {
  const inv = useInventoryTransactions();
  const [activeTab, setActiveTab] = useState("form"); // 'form' | 'history' | 'master'

  // Form State
  const [txType, setTxType] = useState("issue"); // 'issue' | 'receipt' | 'reverse'
  const [fromDept, setFromDept] = useState("Store Department");
  const [toDept, setToDept] = useState("Assembly Department");
  const [selectedMainCode, setSelectedMainCode] = useState("MC-1001");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Feedback State
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: string }
  const [copied, setCopied] = useState(false);

  // History Filter State
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");

  // Master Data Add Form State
  const [newDeptName, setNewDeptName] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newGrpName, setNewGrpName] = useState("");
  const [newUomName, setNewUomName] = useState("");

  const [newMc, setNewMc] = useState({
    code: "",
    description: "",
    category: inv.categories[0] || "",
    group: inv.groups[0] || "",
    uom: inv.uoms[0] || "",
    initialDept: inv.departments[0] || "Store Department",
    openingBalance: 100,
  });

  // Selected Main Code Details & Dept Stock
  const activeItem = inv.mainCodes.find((m) => m.code === selectedMainCode) || null;
  const currentSlipNo = inv.getSlipNumber(txType);

  const fromDeptStock = inv.getDeptStock(selectedMainCode, fromDept);
  const toDeptStock = inv.getDeptStock(selectedMainCode, toDept);
  const totalCompanyStock = inv.getTotalCompanyStock(selectedMainCode);

  // Transfer Quantity Calculation & Validation
  const parsedQty = Number(quantity) || 0;
  let isQtyValid = false;
  let validationMessage = "";

  if (activeItem) {
    if (fromDept === toDept) {
      validationMessage = "'From Department' and 'To Department' cannot be identical.";
    } else if (fromDeptStock <= 0 && txType !== "receipt") {
      validationMessage = `'${fromDept}' currently has 0 ${activeItem.uom} of ${activeItem.code}. Stock unavailable to transfer.`;
    } else if (parsedQty <= 0) {
      validationMessage = "Please enter a transfer quantity greater than 0.";
    } else if (parsedQty > fromDeptStock && txType !== "receipt") {
      validationMessage = `Entered quantity (${parsedQty} ${activeItem.uom}) exceeds available stock in '${fromDept}' (${fromDeptStock} ${activeItem.uom}).`;
    } else {
      isQtyValid = true;
    }
  }

  // Handle Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setAlert(null);

    const res = inv.submitTransaction({
      type: txType,
      fromDept,
      toDept,
      mainCode: selectedMainCode,
      quantity,
      notes,
    });

    if (res.success) {
      setAlert({ type: "success", message: res.message });
      setQuantity("");
      setNotes("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setAlert({ type: "error", message: res.error });
    }
  };

  // Copy Slip No to Clipboard
  const handleCopySlip = () => {
    navigator.clipboard.writeText(currentSlipNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export History to CSV
  const handleExportCSV = () => {
    if (inv.transactions.length === 0) return;

    const headers = [
      "Slip No",
      "Type",
      "From Dept",
      "From Stock Before",
      "From Stock After",
      "To Dept",
      "To Stock Before",
      "To Stock After",
      "Main Code",
      "Description",
      "Quantity",
      "UOM",
      "Company Total Stock",
      "Timestamp",
    ];

    const rows = inv.transactions.map((tx) => [
      tx.slipNo,
      tx.type.toUpperCase(),
      `"${tx.fromDept}"`,
      tx.fromDeptStockBefore,
      tx.fromDeptStockAfter,
      `"${tx.toDept}"`,
      tx.toDeptStockBefore,
      tx.toDeptStockAfter,
      tx.mainCode,
      `"${tx.description}"`,
      tx.quantity,
      tx.uom,
      tx.totalCompanyStock,
      `"${tx.timestamp}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Transactions
  const filteredTransactions = inv.transactions.filter((tx) => {
    const matchesType = historyTypeFilter === "all" || tx.type === historyTypeFilter;
    const query = historySearch.toLowerCase();
    const matchesSearch =
      !query ||
      tx.slipNo.toLowerCase().includes(query) ||
      tx.mainCode.toLowerCase().includes(query) ||
      tx.description.toLowerCase().includes(query) ||
      tx.fromDept.toLowerCase().includes(query) ||
      tx.toDept.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border" style={{ borderColor: C.line }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                <Package size={16} style={{ color: C.red }} />
                Inventory & Materials Management
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: C.ink }}>
                Part Slip Transaction Master
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Transfer inventory between departments without losing total company stock. Department-wise balance updates automatically.
              </p>
            </div>

            {/* Top Navigation Mode Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 self-start sm:self-auto">
              <button
                onClick={() => setActiveTab("form")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "form"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText size={16} style={{ color: activeTab === "form" ? C.red : undefined }} />
                New Slip Entry
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "history"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <History size={16} style={{ color: activeTab === "history" ? C.red : undefined }} />
                History ({inv.transactions.length})
              </button>
              <button
                onClick={() => setActiveTab("master")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "master"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Settings size={16} style={{ color: activeTab === "master" ? C.red : undefined }} />
                Master Setup
              </button>
            </div>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {alert && (
          <div
            className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${
              alert.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm font-medium">{alert.message}</div>
            <button
              onClick={() => setAlert(null)}
              className="text-xs font-semibold opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: NEW SLIP TRANSACTION FORM */}
        {activeTab === "form" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Form Controls */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border space-y-6" style={{ borderColor: C.line }}>
                
                {/* Step 1: Select Transaction Type */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-3 text-slate-700">
                    1. Select Transaction Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setTxType("issue")}
                      className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between h-28 ${
                        txType === "issue"
                          ? "border-rose-600 bg-rose-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                          Issue
                        </span>
                        {txType === "issue" && <CheckCircle2 size={18} className="text-rose-600" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">Issue Slip</div>
                        <div className="text-xs text-slate-500">Format: ISSUE001</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxType("receipt")}
                      className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between h-28 ${
                        txType === "receipt"
                          ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          Receipt
                        </span>
                        {txType === "receipt" && <CheckCircle2 size={18} className="text-emerald-600" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">Receipt Slip</div>
                        <div className="text-xs text-slate-500">Format: RECEIPT001</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxType("reverse")}
                      className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between h-28 ${
                        txType === "reverse"
                          ? "border-purple-600 bg-purple-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          Reverse
                        </span>
                        {txType === "reverse" && <CheckCircle2 size={18} className="text-purple-600" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">Reverse Slip</div>
                        <div className="text-xs text-slate-500">Format: REV001</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Auto Generated Slip Number Badge */}
                <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10 text-amber-400 font-mono font-bold text-lg">
                      {currentSlipNo}
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Auto-Generated Slip Number</div>
                      <div className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                        {txType} Slip • Unique Identifier
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySlip}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                {/* Step 2: From and To Department Selection */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-3 text-slate-700">
                    2. Select Department Movement
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        From Department (Source) <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={fromDept}
                        onChange={(e) => setFromDept(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        {inv.departments.map((d) => (
                          <option key={d} value={d}>
                            {d} (Stock: {inv.getDeptStock(selectedMainCode, d)} {activeItem?.uom || "Pcs"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        To Department (Destination) <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={toDept}
                        onChange={(e) => setToDept(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        {inv.departments.map((d) => (
                          <option key={d} value={d}>
                            {d} (Stock: {inv.getDeptStock(selectedMainCode, d)} {activeItem?.uom || "Pcs"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {fromDept === toDept && (
                    <div className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      'From' and 'To' departments cannot be identical.
                    </div>
                  )}
                </div>

                {/* Step 3: Select Main Code */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-3 text-slate-700">
                    3. Select Main Code & Material
                  </label>
                  <select
                    value={selectedMainCode}
                    onChange={(e) => setSelectedMainCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {inv.mainCodes.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.code} — {m.description} (Company Total: {inv.getTotalCompanyStock(m.code)} {m.uom})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 4: Transfer Quantity */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-3 text-slate-700">
                    4. Enter Shift / Transfer Quantity
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="sm:col-span-2">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 25"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 p-3 text-lg font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 pr-16"
                        />
                        <span className="absolute right-4 top-3.5 text-sm font-bold text-slate-500">
                          {activeItem?.uom || "Pcs"}
                        </span>
                      </div>
                    </div>

                    <div>
                      {activeItem && (
                        <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
                          <div className="text-xs text-slate-500 font-semibold">{toDept} After</div>
                          <div className="text-base font-extrabold text-emerald-700">
                            {toDeptStock + parsedQty} <span className="text-xs font-semibold">{activeItem.uom}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Validation Feedback Message */}
                  {validationMessage && (
                    <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0" />
                      {validationMessage}
                    </div>
                  )}
                </div>

                {/* Remarks / Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Transaction Remarks / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shifting 25 seals to Assembly line for batch #409"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!isQtyValid || fromDept === toDept}
                    className="w-full py-4 px-6 rounded-xl font-extrabold text-white shadow-lg transition flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: C.red }}
                  >
                    <ArrowRightLeft size={20} />
                    Confirm Transfer & Generate {currentSlipNo}
                  </button>
                </div>
              </form>
            </div>

            {/* Right 1 Column: Department-Wise Stock Breakdown & Visual Movement Preview */}
            <div className="space-y-6">
              {activeItem ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-5 sticky top-6" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      <Package size={16} style={{ color: C.red }} />
                      Material Specification
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 font-mono">
                      {activeItem.code}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Part Description
                    </div>
                    <div className="font-extrabold text-slate-900 text-base leading-snug">
                      {activeItem.description}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Category</div>
                      <div className="font-extrabold text-slate-800 mt-0.5">{activeItem.category}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Group</div>
                      <div className="font-extrabold text-slate-800 mt-0.5">{activeItem.group}</div>
                    </div>
                  </div>

                  {/* Live Department Stock Gauges */}
                  <div className="space-y-3">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>Department Stock Status</span>
                      <span className="text-[11px] font-bold text-slate-400 font-mono">UOM: {activeItem.uom}</span>
                    </div>

                    {/* From Dept Stock Card */}
                    <div className="p-3.5 rounded-xl border bg-rose-50/60 border-rose-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-rose-800">FROM: {fromDept}</div>
                        <div className="text-[11px] text-rose-600 font-medium">Source Department</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-rose-700 font-mono">
                          {fromDeptStock} <span className="text-xs">{activeItem.uom}</span>
                        </div>
                        {parsedQty > 0 && isQtyValid && (
                          <div className="text-[11px] font-extrabold text-rose-800">
                            ➔ {fromDeptStock - parsedQty} {activeItem.uom} after
                          </div>
                        )}
                      </div>
                    </div>

                    {/* To Dept Stock Card */}
                    <div className="p-3.5 rounded-xl border bg-emerald-50/60 border-emerald-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-emerald-800">TO: {toDept}</div>
                        <div className="text-[11px] text-emerald-600 font-medium">Destination Department</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-700 font-mono">
                          {toDeptStock} <span className="text-xs">{activeItem.uom}</span>
                        </div>
                        {parsedQty > 0 && isQtyValid && (
                          <div className="text-[11px] font-extrabold text-emerald-800">
                            ➔ {toDeptStock + parsedQty} {activeItem.uom} after
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Company Stock Preservation Card */}
                    <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">Total Company Stock</div>
                          <div className="text-[10px] text-slate-400">Preserved Across All Depts</div>
                        </div>
                      </div>
                      <div className="text-xl font-black text-amber-400 font-mono">
                        {totalCompanyStock} <span className="text-xs font-normal text-white">{activeItem.uom}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border text-center text-slate-400 text-sm">
                  Select a Main Code to view department stock breakdown.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TRANSACTION HISTORY & LOGS */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Top Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm" style={{ borderColor: C.line }}>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Slips</div>
                <div className="text-2xl font-black mt-1" style={{ color: C.ink }}>
                  {inv.transactions.length}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm" style={{ borderColor: C.line }}>
                <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Issues Generated</div>
                <div className="text-2xl font-black mt-1 text-rose-700">
                  {inv.transactions.filter((t) => t.type === "issue").length}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm" style={{ borderColor: C.line }}>
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Receipts Processed</div>
                <div className="text-2xl font-black mt-1 text-emerald-700">
                  {inv.transactions.filter((t) => t.type === "receipt").length}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm" style={{ borderColor: C.line }}>
                <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">Reversals Recorded</div>
                <div className="text-2xl font-black mt-1 text-purple-700">
                  {inv.transactions.filter((t) => t.type === "reverse").length}
                </div>
              </div>
            </div>

            {/* Filter Controls & Search */}
            <div className="bg-white rounded-2xl p-5 border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: C.line }}>
              <div className="relative w-full sm:w-80">
                <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Slip No, Main Code, Dept..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                {["all", "issue", "receipt", "reverse"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setHistoryTypeFilter(t)}
                    className={`px-3.5 py-2 text-xs font-extrabold uppercase rounded-lg transition whitespace-nowrap ${
                      historyTypeFilter === t
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shrink-0 ml-auto sm:ml-2"
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: C.line }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b text-xs uppercase font-extrabold text-slate-500 tracking-wider" style={{ borderColor: C.line }}>
                    <tr>
                      <th className="px-6 py-4">Slip No</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">From ➔ To Department Shift</th>
                      <th className="px-6 py-4">Main Code & Material</th>
                      <th className="px-6 py-4 text-right">Transfer Qty</th>
                      <th className="px-6 py-4 text-center font-mono">Company Total</th>
                      <th className="px-6 py-4 text-center">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: C.line }}>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-6 py-4 font-mono font-extrabold text-slate-900">
                            {tx.slipNo}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded text-[11px] font-extrabold uppercase ${
                                tx.type === "issue"
                                  ? "bg-rose-100 text-rose-800"
                                  : tx.type === "receipt"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-900 font-semibold">{tx.fromDept}</span>
                              <span className="text-slate-400">➔</span>
                              <span className="text-slate-900 font-semibold">{tx.toDept}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {tx.fromDept}: {tx.fromDeptStockAfter} | {tx.toDept}: {tx.toDeptStockAfter}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-900">{tx.mainCode}</div>
                            <div className="text-xs text-slate-500 max-w-xs truncate">{tx.description}</div>
                          </td>
                          <td className="px-6 py-4 text-right font-extrabold text-slate-900 font-mono">
                            {tx.quantity} <span className="text-xs text-slate-500 font-normal">{tx.uom}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-extrabold text-slate-900 font-mono">
                            {tx.totalCompanyStock} <span className="text-xs text-slate-500 font-normal">{tx.uom}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs text-slate-500 font-medium">
                            {tx.timestamp}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-semibold">
                          No transaction records found matching filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MASTER DATA CONFIGURATION */}
        {activeTab === "master" && (
          <div className="space-y-8">
            {/* Intro */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <div>
                <strong>Master Configuration Mode:</strong> Manually add new Departments, Categories, Groups, Units of Measurement, or Main Code records with initial department stock.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Manage Departments */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <Building2 size={18} style={{ color: C.red }} />
                  Departments Master
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New Department Name"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    onClick={() => {
                      if (inv.addDepartment(newDeptName)) setNewDeptName("");
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shrink-0"
                  >
                    Add Dept
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {inv.departments.map((d) => (
                    <span key={d} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. Manage Units of Measurement (UOM) */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <Scale size={18} style={{ color: C.red }} />
                  Unit & Measurement (UOM)
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New Unit (e.g. Kg, Box)"
                    value={newUomName}
                    onChange={(e) => setNewUomName(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    onClick={() => {
                      if (inv.addUom(newUomName)) setNewUomName("");
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shrink-0"
                  >
                    Add Unit
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {inv.uoms.map((u) => (
                    <span key={u} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                      {u}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. Manage Categories */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <Layers size={18} style={{ color: C.red }} />
                  Part Categories
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New Category Name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    onClick={() => {
                      if (inv.addCategory(newCatName)) setNewCatName("");
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shrink-0"
                  >
                    Add Category
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {inv.categories.map((c) => (
                    <span key={c} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* 4. Manage Groups */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <Package size={18} style={{ color: C.red }} />
                  Part Groups
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New Group Name"
                    value={newGrpName}
                    onChange={(e) => setNewGrpName(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    onClick={() => {
                      if (inv.addGroup(newGrpName)) setNewGrpName("");
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shrink-0"
                  >
                    Add Group
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {inv.groups.map((g) => (
                    <span key={g} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Main Code Master & Opening Balance Entry */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-lg">
                <PlusCircle size={20} style={{ color: C.red }} />
                Add New Main Code Record & Department Stock
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Main Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MC-1007"
                    value={newMc.code}
                    onChange={(e) => setNewMc({ ...newMc, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold uppercase focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Part Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Viton Shaft Seal 25x35x7"
                    value={newMc.description}
                    onChange={(e) => setNewMc({ ...newMc, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                  <select
                    value={newMc.category}
                    onChange={(e) => setNewMc({ ...newMc, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white"
                  >
                    {inv.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Group</label>
                  <select
                    value={newMc.group}
                    onChange={(e) => setNewMc({ ...newMc, group: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white"
                  >
                    {inv.groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">UOM</label>
                  <select
                    value={newMc.uom}
                    onChange={(e) => setNewMc({ ...newMc, uom: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white"
                  >
                    {inv.uoms.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Initial Department</label>
                  <select
                    value={newMc.initialDept}
                    onChange={(e) => setNewMc({ ...newMc, initialDept: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white"
                  >
                    {inv.departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Opening Stock in Initial Department</label>
                <input
                  type="number"
                  min="0"
                  value={newMc.openingBalance}
                  onChange={(e) => setNewMc({ ...newMc, openingBalance: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-extrabold text-slate-900 max-w-xs"
                />
              </div>

              <button
                onClick={() => {
                  if (inv.addMainCodeItem(newMc)) {
                    setNewMc({
                      code: "",
                      description: "",
                      category: inv.categories[0] || "",
                      group: inv.groups[0] || "",
                      uom: inv.uoms[0] || "",
                      initialDept: inv.departments[0] || "Store Department",
                      openingBalance: 100,
                    });
                  }
                }}
                className="w-full py-3 px-4 rounded-xl font-bold text-white transition flex items-center justify-center gap-2"
                style={{ backgroundColor: C.red }}
              >
                <PlusCircle size={18} />
                Save Main Code Record
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
