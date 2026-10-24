import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import { useState, useRef, useEffect, useMemo } from "react";
import { Eye, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, RefreshCw, Download, Printer, Building2, ShieldCheck, Layers, Boxes } from "lucide-react";

const INITIAL_DEPARTMENT_FORM = {
  deptCode: "",
  deptNumber: "",
  departmentName: "",
  processSequence: "1.0",
  category: "Production",
  status: "ACTIVE",
  notes: ""
};

const CATEGORY_OPTIONS = [
  "Material Store",
  "Process",
  "Finished Goods Store",
  "Outward",
  "Rejection",
  "Rework",
  "Movement/Control",
  "Production",
  "Machining",
  "Finishing",
  "Logistics",
  "Cutting",
  "Moulding",
  "Packaging",
  "Storage",
  "Casting",
  "Tool Room",
  "Shipping",
  "General"
];

const DEPARTMENT_MASTER_PAGE_1_COLUMNS = [
  { key: "select", width: 36, min: 32 },
  { key: "handlesort_deptnumber_st", width: 200 },
  { key: "handlesort_deptcode_styl", width: 200 },
  { key: "handlesort_departmentnam", width: 200 },
  { key: "handlesort_processsequen", width: 200 },
  { key: "handlesort_category_styl", width: 200 },
  { key: "handlesort_status_style_", width: 200 },
  { key: "action", width: 120 },
];

export function DepartmentMasterPage({
  dark = false,
  onBackToHome,
  onOpenSidebar,
  sidebarOpen = false,
  setPage
}) {
  const departmentMasterPage1Resize = useResizableColumns("department-master-page-1", DEPARTMENT_MASTER_PAGE_1_COLUMNS);
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_DEPARTMENT_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [quickPickerMode, setQuickPickerMode] = useState(null); // 'edit' | 'delete' | null
  const [quickSearch, setQuickSearch] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Table selection & column filter state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [colFilters, setColFilters] = useState({
    deptNumber: "",
    deptCode: "",
    departmentName: "",
    processSequence: "",
    category: "",
    status: ""
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  // Sorting state
  const [sortField, setSortField] = useState("deptNumber");
  const [sortOrder, setSortOrder] = useState("asc");

  // Determine API base URL
  const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return "http://localhost:4000";
    }
    return "https://silver-muller-seals-backend-deploy.onrender.com";
  };

  // Fetch Departments from API on component mount
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/inventory/departments`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDepartments(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch departments from backend API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Styling theme tokens matching ItemMasterFormPage, CustomerMasterPage & SupplierMasterPage
  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const textPrimary = dark ? "#f8fafc" : "#0f172a";
  const textSecondary = dark ? "#94a3b8" : "#64748b";
  const borderCol = dark ? "rgba(148, 163, 184, 0.14)" : "#e2e8f0";

  // Auto-generate code when opening new modal
  const handleOpenNewModal = () => {
    setEditingId(null);
    const nextNum = departments.length + 1;
    const generatedCode = `DPT-${String(nextNum).padStart(3, "0")}`;

    setFormData({
      ...INITIAL_DEPARTMENT_FORM,
      deptNumber: nextNum,
      deptCode: generatedCode,
      processSequence: `${nextNum}.0`
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (department) => {
    setEditingId(department.id);
    setFormData({
      deptCode: department.deptCode || `DPT-${String(department.deptNumber || department.id).padStart(3, "0")}`,
      deptNumber: department.deptNumber || "",
      departmentName: department.departmentName || department.name || "",
      processSequence: department.processSequence != null ? String(department.processSequence) : "1.0",
      category: department.category || "Production",
      status: department.status || "ACTIVE",
      notes: department.notes || ""
    });
    if (detailItem) setDetailItem(null);
    setIsModalOpen(true);
  };

  // Delete handlers
  const handleRequestDelete = (department) => {
    setDeleteTarget(department);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.departmentName || deleteTarget.name || "Department";
    try {
      const res = await fetch(`${getApiUrl()}/api/inventory/departments/${deleteTarget.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setDepartments((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        if (detailItem?.id === deleteTarget.id) setDetailItem(null);
        setToastMessage(`Department "${deletedName}" deleted successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setToastMessage(errJson.message || `Failed to delete department "${deletedName}"`);
      }
    } catch (e) {
      setDepartments((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setToastMessage(`Department "${deletedName}" deleted locally.`);
    } finally {
      setDeleteTarget(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Handle Form field changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Save Department (POST / PUT)
  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!formData.departmentName.trim()) {
      alert("Please enter the Department Name - Required");
      return;
    }
    if (formData.processSequence === "" || isNaN(Number(formData.processSequence))) {
      alert("Please enter a valid numeric Process Sequence - Required");
      return;
    }

    try {
      const isEdit = !!editingId;
      const url = isEdit ? `${getApiUrl()}/api/inventory/departments/${editingId}` : `${getApiUrl()}/api/inventory/departments`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        deptCode: formData.deptCode.trim() || undefined,
        deptNumber: formData.deptNumber ? Number(formData.deptNumber) : undefined,
        departmentName: formData.departmentName.trim(),
        processSequence: Number(formData.processSequence),
        category: formData.category,
        status: formData.status,
        notes: formData.notes.trim()
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedData = await res.json();
        if (isEdit) {
          setDepartments((prev) => prev.map((item) => (item.id === editingId ? savedData : item)));
          setToastMessage(`Department "${savedData.departmentName || savedData.name}" updated successfully!`);
        } else {
          setDepartments((prev) => [...prev, savedData]);
          setToastMessage(`Department "${savedData.departmentName || savedData.name}" created successfully!`);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to save department on server.");
      }
    } catch (err) {
      console.error("Save department failed:", err);
      // Fallback local update
      const localObj = {
        ...formData,
        id: editingId || Date.now(),
        deptNumber: formData.deptNumber ? Number(formData.deptNumber) : departments.length + 1,
        processSequence: Number(formData.processSequence)
      };
      if (editingId) {
        setDepartments((prev) => prev.map((item) => (item.id === editingId ? localObj : item)));
      } else {
        setDepartments((prev) => [...prev, localObj]);
      }
      setToastMessage(`Saved to local state: ${err.message}`);
    } finally {
      setIsModalOpen(false);
      setEditingId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategoryFilter, colFilters]);

  // Filtering matching search, category pills, and per-column filters
  const filteredDepartments = useMemo(() => {
    const sTerm = searchTerm.trim().toLowerCase();
    const catTerm = selectedCategoryFilter;
    const fNum = colFilters.deptNumber.trim().toLowerCase();
    const fCode = colFilters.deptCode.trim().toLowerCase();
    const fName = colFilters.departmentName.trim().toLowerCase();
    const fSeq = colFilters.processSequence.trim().toLowerCase();
    const fCat = colFilters.category.trim().toLowerCase();
    const fStatus = colFilters.status.trim().toLowerCase();

    return departments.filter((item) => {
      const name = item.departmentName || item.name || "";
      const code = item.deptCode || "";
      const numStr = String(item.deptNumber || "");
      const cat = item.category || "Production";
      const seqStr = String(item.processSequence ?? "");
      const stat = item.status || "ACTIVE";

      // 1. Top Search
      if (sTerm) {
        const inSearch =
          code.toLowerCase().includes(sTerm) ||
          name.toLowerCase().includes(sTerm) ||
          numStr.toLowerCase().includes(sTerm) ||
          cat.toLowerCase().includes(sTerm);
        if (!inSearch) return false;
      }

      // 2. Category Pill Filter
      if (catTerm !== "ALL") {
        if (cat.toLowerCase() !== catTerm.toLowerCase()) return false;
      }

      // 3. Per-Column Filters
      if (fNum && !numStr.toLowerCase().includes(fNum)) return false;
      if (fCode && !code.toLowerCase().includes(fCode)) return false;
      if (fName && !name.toLowerCase().includes(fName)) return false;
      if (fSeq && !seqStr.toLowerCase().includes(fSeq)) return false;
      if (fCat && !cat.toLowerCase().includes(fCat)) return false;
      if (fStatus && !stat.toLowerCase().includes(fStatus)) return false;

      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "departmentName") {
        valA = a.departmentName || a.name || "";
        valB = b.departmentName || b.name || "";
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA ?? "").toLowerCase();
      const strB = String(valB ?? "").toLowerCase();
      if (strA < strB) return sortOrder === "asc" ? -1 : 1;
      if (strA > strB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [departments, searchTerm, selectedCategoryFilter, colFilters, sortField, sortOrder]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredDepartments.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDepartments.slice(start, start + pageSize);
  }, [filteredDepartments, currentPage, pageSize]);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(paginatedData.map((i) => i.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Quick Action Buttons
  const handleEditSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToEdit = departments.find((i) => i.id === selectedId);
      if (itemToEdit) {
        handleOpenEditModal(itemToEdit);
        return;
      }
    }
    setQuickPickerMode("edit");
  };

  const handleViewSelected = () => {
    if (selectedIds.size >= 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToView = departments.find((i) => i.id === selectedId);
      if (itemToView) {
        setDetailItem(itemToView);
        return;
      }
    }
    if (filteredDepartments.length > 0) {
      setDetailItem(filteredDepartments[0]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToDelete = departments.find((i) => i.id === selectedId);
      if (itemToDelete) {
        setDeleteTarget(itemToDelete);
        return;
      }
    }
    setQuickPickerMode("delete");
  };

  const handleRefresh = () => {
    fetchDepartments();
    setSearchTerm("");
    setSelectedCategoryFilter("ALL");
    setColFilters({
      deptNumber: "",
      deptCode: "",
      departmentName: "",
      processSequence: "",
      category: "",
      status: ""
    });
    setSelectedIds(new Set());
    setToastMessage("Department data refreshed!");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleExportData = () => {
    const dataToExport = filteredDepartments.map((item, idx) => ({
      "Unique Number": item.deptNumber || idx + 1,
      "Department Code": item.deptCode || `DPT-${String(item.deptNumber || idx + 1).padStart(3, "0")}`,
      "Department Name": item.departmentName || item.name,
      "Process Sequence": item.processSequence ?? "-",
      "Category": item.category || "Production",
      "Status": item.status || "ACTIVE",
      "Notes": item.notes || "-"
    }));
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Department_Master_Export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage("Department directory exported!");
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        height: "calc(100vh - 68px)",
        maxHeight: "calc(100vh - 68px)",
        overflow: "hidden",
        background: bg,
        padding: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          borderRadius: 0,
          border: "none",
          boxShadow: "none",
          background: "#ffffff"
        }}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              top: 24,
              right: 24,
              zIndex: 99999,
              background: "#10b981",
              color: "#ffffff",
              padding: "14px 22px",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(16, 185, 129, 0.4)",
              fontWeight: 800,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 12,
              animation: "fadeIn 0.2s ease"
            }}
          >
            <span style={{ fontSize: 16 }}>&#10003;</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TOP TOOLBAR & BREADCRUMB HEADER (STATIC - NEVER SCROLLS) */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "9px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }}
        >
          {/* Left Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* + New Department Button */}
            <button
              onClick={handleOpenNewModal}
              id="btn-new-dept-master"
              style={{
                background: "#1e293b",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 4px rgba(30, 41, 59, 0.25)",
                transition: "all 0.15s ease"
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 900 }}>+</span>
              <span>New Department</span>
            </button>

            {/* Edit Department Button */}
            <button
              onClick={handleEditSelected}
              id="btn-edit-dept-master"
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Edit Department
            </button>

            {/* View Button */}
            <button
              onClick={handleViewSelected}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              View
            </button>

            {/* Delete Department Button */}
            <button
              onClick={handleDeleteSelected}
              id="btn-delete-dept-master"
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Delete Department
            </button>

            <span style={{ color: "#e2e8f0", margin: "0 4px", fontSize: 18 }}>|</span>

            {/* Utility Buttons */}
            <button
              onClick={handleRefresh}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Refresh
            </button>
            <button
              onClick={handleExportData}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Export
            </button>
            <button
              onClick={handlePrint}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Print
            </button>
          </div>

          {/* Right Search Input Box */}
          <div style={{ position: "relative", minWidth: 260 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                fontSize: 13,
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                outline: "none",
                background: "#ffffff",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
            {searchTerm && (
              <X
                size={14}
                onClick={() => setSearchTerm("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", cursor: "pointer" }}
              />
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CATEGORY FILTER PILLS & SUMMARY STATS BAR */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }}
        >
          {/* Category Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>
              Category:
            </span>
            <button
              onClick={() => setSelectedCategoryFilter("ALL")}
              style={{
                padding: "4px 10px",
                borderRadius: 16,
                fontSize: 11.5,
                fontWeight: 700,
                border: selectedCategoryFilter === "ALL" ? "1px solid #0284c7" : "1px solid #e2e8f0",
                background: selectedCategoryFilter === "ALL" ? "#0284c7" : "#ffffff",
                color: selectedCategoryFilter === "ALL" ? "#ffffff" : "#475569",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              All ({departments.length})
            </button>
            {CATEGORY_OPTIONS.map((cat) => {
              const count = departments.filter((d) => (d.category || "Production").toLowerCase() === cat.toLowerCase()).length;
              if (count === 0) return null;
              const isSelected = selectedCategoryFilter.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 16,
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: isSelected ? "1px solid #0284c7" : "1px solid #e2e8f0",
                    background: isSelected ? "#0284c7" : "#ffffff",
                    color: isSelected ? "#ffffff" : "#475569",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap"
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Right Metrics / Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Total: <strong style={{ color: "#0f172a" }}>{departments.length}</strong>
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Active: <strong style={{ color: "#10b981" }}>{departments.filter((d) => (d.status || "ACTIVE") === "ACTIVE").length}</strong>
            </span>
            {selectedIds.size > 0 && (
              <span style={{ fontSize: 12, color: "#0284c7", fontWeight: 700 }}>
                Selected: {selectedIds.size}
              </span>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN DATA TABLE CONTAINER (SCROLLABLE TABLE BODY) */}
        {/* ========================================================================= */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", position: "relative" }}>
          <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left", ...departmentMasterPage1Resize.tableStyle }}>
            <ResizableColGroup columns={DEPARTMENT_MASTER_PAGE_1_COLUMNS} widths={departmentMasterPage1Resize.widths} />
            {/* Table Header with sort and per-column filters */}
            <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ width: 36, padding: "9px 10px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={paginatedData.length > 0 && paginatedData.every((i) => selectedIds.has(i.id))}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th onClick={() => handleSort("deptNumber")} style={{ padding: "9px 12px", color: "#475569", fontWeight: 700, cursor: "pointer", width: 60 }}>
                  # {sortField === "deptNumber" && (sortOrder === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="handlesort_deptnumber_st" resize={departmentMasterPage1Resize} />
                </th>
                <th onClick={() => handleSort("deptCode")} style={{ padding: "9px 12px", color: "#475569", fontWeight: 700, cursor: "pointer", width: 110 }}>
                  Dept Code {sortField === "deptCode" && (sortOrder === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="handlesort_deptcode_styl" resize={departmentMasterPage1Resize} />
                </th>
                <th onClick={() => handleSort("departmentName")} style={{ padding: "9px 12px", color: "#475569", fontWeight: 700, cursor: "pointer" }}>
                  Department Name {sortField === "departmentName" && (sortOrder === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="handlesort_departmentnam" resize={departmentMasterPage1Resize} />
                </th>
                <th onClick={() => handleSort("processSequence")} style={{ padding: "9px 12px", color: "#475569", fontWeight: 700, cursor: "pointer", width: 120 }}>
                  Process Seq {sortField === "processSequence" && (sortOrder === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="handlesort_processsequen" resize={departmentMasterPage1Resize} />
                </th>
                <th onClick={() => handleSort("category")} style={{ padding: "9px 12px", color: "#475569", fontWeight: 700, cursor: "pointer", width: 140 }}>
                  Category / Group {sortField === "category" && (sortOrder === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="handlesort_category_styl" resize={departmentMasterPage1Resize} />
                </th>
                <th onClick={() => handleSort("status")} style={{ padding: "9px 12px", color: "#475569", fontWeight: 700, cursor: "pointer", width: 100, textAlign: "center" }}>
                  Status {sortField === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="handlesort_status_style_" resize={departmentMasterPage1Resize} />
                </th>
                {/* ACTION COLUMN MUST BE LAST */}
                <th style={{ padding: "9px 12px", color: "#475569", fontWeight: 700, width: 120, textAlign: "center" }}>
                  Action
                  <ColumnResizeHandle colKey="action" resize={departmentMasterPage1Resize} />
                </th>
              </tr>

              {/* Per-column filter row */}
              <tr style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "4px 8px" }}></th>
                <th style={{ padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Filter #"
                    value={colFilters.deptNumber}
                    onChange={(e) => setColFilters((prev) => ({ ...prev, deptNumber: e.target.value }))}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }}
                  />
                </th>
                <th style={{ padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Filter Code"
                    value={colFilters.deptCode}
                    onChange={(e) => setColFilters((prev) => ({ ...prev, deptCode: e.target.value }))}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }}
                  />
                </th>
                <th style={{ padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Filter Department Name"
                    value={colFilters.departmentName}
                    onChange={(e) => setColFilters((prev) => ({ ...prev, departmentName: e.target.value }))}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }}
                  />
                </th>
                <th style={{ padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Filter Seq"
                    value={colFilters.processSequence}
                    onChange={(e) => setColFilters((prev) => ({ ...prev, processSequence: e.target.value }))}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }}
                  />
                </th>
                <th style={{ padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Filter Category"
                    value={colFilters.category}
                    onChange={(e) => setColFilters((prev) => ({ ...prev, category: e.target.value }))}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }}
                  />
                </th>
                <th style={{ padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Status"
                    value={colFilters.status}
                    onChange={(e) => setColFilters((prev) => ({ ...prev, status: e.target.value }))}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }}
                  />
                </th>
                <th style={{ padding: "4px 8px" }}></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: "50px 20px", textAlign: "center", color: "#64748b" }}>
                    <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px", color: "#0284c7" }} />
                    <div style={{ fontWeight: 600 }}>Loading departments from server...</div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
                    No department records match your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((dept, idx) => {
                  const isSelected = selectedIds.has(dept.id);
                  const name = dept.departmentName || dept.name || "-";
                  const num = dept.deptNumber || idx + 1;
                  const code = dept.deptCode || `DPT-${String(num).padStart(3, "0")}`;
                  const category = dept.category || "Production";
                  const status = dept.status || "ACTIVE";

                  return (
                    <tr
                      key={dept.id || idx}
                      onClick={() => handleSelectRow(dept.id)}
                      onDoubleClick={() => setDetailItem(dept)}
                      style={{
                        background: isSelected ? "#f0f9ff" : idx % 2 === 0 ? "#ffffff" : "#fcfdfd",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        transition: "background 0.12s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#fcfdfd";
                      }}
                    >
                      <td style={{ padding: "9px 10px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(dept.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>

                      {/* Unique # Badge */}
                      <td style={{ padding: "9px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "#e0f2fe",
                            color: "#0369a1",
                            fontSize: 11.5,
                            fontWeight: 800
                          }}
                        >
                          #{num}
                        </span>
                      </td>

                      {/* Dept Code */}
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0f172a" }}>
                        {code}
                      </td>

                      {/* Department Name */}
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#1e293b" }}>
                        {name}
                      </td>

                      {/* Process Sequence */}
                      <td style={{ padding: "9px 12px", color: "#475569", fontWeight: 600 }}>
                        {dept.processSequence != null ? Number(dept.processSequence).toFixed(2) : "-"}
                      </td>

                      {/* Category */}
                      <td style={{ padding: "9px 12px" }}>
                        <span
                          style={{
                            padding: "3px 9px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: "#f1f5f9",
                            color: "#334155",
                            border: "1px solid #e2e8f0"
                          }}
                        >
                          {category}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                            color: status === "ACTIVE" ? "#15803d" : "#b91c1c"
                          }}
                        >
                          {status}
                        </span>
                      </td>

                      {/* ACTION COLUMN - MUST BE LAST */}
                      <td style={{ padding: "9px 12px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <button
                            onClick={() => setDetailItem(dept)}
                            title="View Department Details"
                            style={{
                              padding: "5px",
                              borderRadius: 4,
                              border: "1px solid #e2e8f0",
                              background: "#ffffff",
                              color: "#0284c7",
                              cursor: "pointer"
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(dept)}
                            title="Edit Department"
                            style={{
                              padding: "5px",
                              borderRadius: 4,
                              border: "1px solid #e2e8f0",
                              background: "#ffffff",
                              color: "#d97706",
                              cursor: "pointer"
                            }}
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={() => handleRequestDelete(dept)}
                            title="Delete Department"
                            style={{
                              padding: "5px",
                              borderRadius: 4,
                              border: "1px solid #e2e8f0",
                              background: "#ffffff",
                              color: "#dc2626",
                              cursor: "pointer"
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM PAGINATION FOOTER */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "9px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#64748b"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>
              Showing {filteredDepartments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredDepartments.length)} of {filteredDepartments.length} entries
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                borderRadius: 4,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.4 : 1
              }}
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                borderRadius: 4,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.4 : 1
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: "0 8px", fontWeight: 700, color: "#0f172a" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                borderRadius: 4,
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.4 : 1
              }}
            >
              <ChevronRight size={14} />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                borderRadius: 4,
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.4 : 1
              }}
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NEW / EDIT DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 580,
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #cbd5e1"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 22px",
                background: "#1e293b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Building2 size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {editingId ? `Edit Department - ${formData.deptCode}` : "Create New Department"}
                </h3>
              </div>
              <X
                size={18}
                onClick={() => setIsModalOpen(false)}
                style={{ cursor: "pointer", color: "#94a3b8" }}
              />
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDepartment} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Unique Dept Number *
                  </label>
                  <input
                    type="number"
                    value={formData.deptNumber}
                    onChange={(e) => handleInputChange("deptNumber", e.target.value)}
                    placeholder="e.g. 1"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Department Code
                  </label>
                  <input
                    type="text"
                    value={formData.deptCode}
                    onChange={(e) => handleInputChange("deptCode", e.target.value)}
                    placeholder="e.g. DPT-001"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Department Name *
                </label>
                <input
                  type="text"
                  value={formData.departmentName}
                  onChange={(e) => handleInputChange("departmentName", e.target.value)}
                  placeholder="e.g. Burning, CNC, Finishing, Gate, LASER, Moulding..."
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Process Sequence *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.processSequence}
                    onChange={(e) => handleInputChange("processSequence", e.target.value)}
                    placeholder="e.g. 1.0"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Category / Group
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange("category", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box",
                      background: "#ffffff"
                    }}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Operational Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                    background: "#ffffff"
                  }}
                >
                  <option value="ACTIVE">Active (Operational)</option>
                  <option value="INACTIVE">Inactive (Disabled)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Notes / Description
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Optional operational details, location, supervisor..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                    resize: "none"
                  }}
                />
              </div>

              {/* Form Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: "8px 22px",
                    borderRadius: 6,
                    border: "none",
                    background: "#1e293b",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(30, 41, 59, 0.25)"
                  }}
                >
                  {editingId ? "Update Department" : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK PICKER MODAL (when clicking Edit or Delete from Top Toolbar) */}
      {/* ========================================================================= */}
      {quickPickerMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #cbd5e1"
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: "#1e293b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                Select Department to {quickPickerMode === "edit" ? "Edit" : "Delete"}
              </h3>
              <X size={18} onClick={() => setQuickPickerMode(null)} style={{ cursor: "pointer", color: "#94a3b8" }} />
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search department..."
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 12px 7px 32px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {departments
                  .filter((d) => (d.departmentName || d.name || "").toLowerCase().includes(quickSearch.toLowerCase()))
                  .map((dept, idx) => (
                    <div
                      key={dept.id || idx}
                      onClick={() => {
                        setQuickPickerMode(null);
                        if (quickPickerMode === "edit") {
                          handleOpenEditModal(dept);
                        } else {
                          handleRequestDelete(dept);
                        }
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "background 0.12s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                          #{dept.deptNumber || idx + 1} - {dept.departmentName || dept.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>
                          Code: {dept.deptCode || `DPT-${String(dept.deptNumber || idx + 1).padStart(3, "0")}`} | Seq: {dept.processSequence}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: "#e0f2fe",
                          color: "#0369a1"
                        }}
                      >
                        {dept.category || "Production"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW DEPARTMENT DETAIL MODAL */}
      {/* ========================================================================= */}
      {detailItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 500,
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #cbd5e1"
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: "#1e293b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Building2 size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Department Details</h3>
              </div>
              <X size={18} onClick={() => setDetailItem(null)} style={{ cursor: "pointer", color: "#94a3b8" }} />
            </div>

            <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Unique Number</span>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#0284c7", marginTop: 2 }}>
                    #{detailItem.deptNumber || detailItem.id}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Dept Code</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                    {detailItem.deptCode || `DPT-${String(detailItem.deptNumber || detailItem.id).padStart(3, "0")}`}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Status</span>
                  <div style={{ marginTop: 2 }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: (detailItem.status || "ACTIVE") === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                        color: (detailItem.status || "ACTIVE") === "ACTIVE" ? "#15803d" : "#b91c1c"
                      }}
                    >
                      {detailItem.status || "ACTIVE"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Department Name</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>
                  {detailItem.departmentName || detailItem.name}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Process Sequence</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#334155", marginTop: 3 }}>
                    {detailItem.processSequence != null ? Number(detailItem.processSequence).toFixed(2) : "-"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Category / Group</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0284c7", marginTop: 3 }}>
                    {detailItem.category || "Production"}
                  </div>
                </div>
              </div>

              {detailItem.notes && (
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                  <span style={{ fontSize: 11.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Notes / Remarks</span>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>{detailItem.notes}</div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => {
                    const item = detailItem;
                    setDetailItem(null);
                    handleOpenEditModal(item);
                  }}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Edit This Department
                </button>
                <button
                  onClick={() => setDetailItem(null)}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#1e293b",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #fecaca",
              padding: 24,
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
              Delete Department?
            </h3>

            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              Are you sure you want to delete department{" "}
              <strong style={{ color: "#0f172a" }}>"{deleteTarget.departmentName || deleteTarget.name}"</strong>?
              This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(220, 38, 38, 0.3)"
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
