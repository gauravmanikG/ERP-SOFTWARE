import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useInventoryTransactions } from "../hooks/useInventoryTransactions";

export function InventoryTransactionPage({ defaultTab = "form" }) {
  const inv = useInventoryTransactions();
  const [activeTab, setActiveTab] = useState(defaultTab); // 'form' | 'history'

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
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
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

          <div className="flex items-center space-x-3">
            <button
              onClick={() => inv.reloadAll()}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition border border-slate-300"
              title="Refresh Data from PostgreSQL"
            >
              <RefreshCw className={`w-4 h-4 ${inv.loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-2 text-right">
              <span className="text-xs text-slate-500 block font-medium">Database System Date</span>
              <span className="text-sm font-bold text-sky-700">{formattedToday}</span>
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
                  onClick={handleExportCSV}
                  disabled={inv.transactions.length === 0}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition border border-slate-300 disabled:opacity-50"
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
                      <td colSpan="10" className="py-8 text-center text-slate-500 text-sm">
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
    </div>
  );
}
