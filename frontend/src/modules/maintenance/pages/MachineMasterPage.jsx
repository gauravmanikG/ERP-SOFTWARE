import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import { useState, useRef, useEffect, useMemo } from "react";
import { Eye, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import fallbackMachines from "../data/machinesData.json";

const INITIAL_MACHINE_FORM = {
  sNo: "",
  machineNo: "",
  description: "",
  department: "Tool Room",
  location: "",
  specification: "",
  capacity: "",
  make: "",
  remarks: "",
  category: "Tool Room & Machining",
  status: "ACTIVE"
};

const DEPARTMENT_PILLS = [
  { label: "All Machines", key: "ALL" },
  { label: "Tool Room", key: "T/Room" },
  { label: "Moulding", key: "Moulding" },
  { label: "Finishing", key: "Finishing" },
  { label: "Rubber Compound", key: "Rubber Compound" },
  { label: "Packing", key: "Packing" },
  { label: "Sand Blast", key: "Sand Blast" },
  { label: "Utility", key: "Utility" }
];

const MACHINE_MASTER_PAGE_1_COLUMNS = [
  { key: "select", width: 36, min: 32 },
  { key: "sr_no", width: 60 },
  { key: "m_c_no", width: 110 },
  { key: "description_of_machine", width: 220 },
  { key: "department", width: 140 },
  { key: "location", width: 140 },
  { key: "capacity", width: 130 },
  { key: "make_manufacturer", width: 173 },
  { key: "status", width: 90 },
  { key: "action", width: 110 },
];

export function MachineMasterPage({
  dark = false,
  onBackToHome,
  onOpenSidebar,
  sidebarOpen = false,
  setPage
}) {
  const machineMasterPage1Resize = useResizableColumns("machine-master-page-1", MACHINE_MASTER_PAGE_1_COLUMNS);
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_MACHINE_FORM);
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
    sNo: "",
    machineNo: "",
    description: "",
    department: "",
    location: "",
    capacity: "",
    make: "",
    status: ""
  });

  // Standardize machineNo format in data to "M/C -X"
  const standardizeCode = (code) => {
    if (!code) return "";
    return String(code).replace(/m\/c\s*-?\s*(\d+)/i, "M/C -$1");
  };

  const initialList = (fallbackMachines || []).map((m, idx) => ({
    ...m,
    sNo: m.sNo ?? m.sno ?? m.serialNo ?? (idx + 1),
    machineNo: standardizeCode(m.machineNo)
  }));

  const [machines, setMachines] = useState(initialList);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  // Determine API base URL
  const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return "http://localhost:4000";
    }
    return "https://silver-muller-seals-backend-deploy.onrender.com";
  };

  // Fetch Machines from API on component mount
  const fetchMachines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/maintenance/machines`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMachines(
            data.map((m, idx) => ({
              ...m,
              sNo: m.sNo ?? m.sno ?? m.serialNo ?? (idx + 1),
              machineNo: standardizeCode(m.machineNo)
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Using local machine data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const bg = dark ? "#0a0f1d" : "#f4f6fb";

  // Auto-generate next M/C No in uppercase "M/C -X" format
  const handleOpenNewModal = () => {
    setEditingId(null);
    const nextSNo = machines.length + 1;
    const generatedCode = `M/C -${nextSNo}`;

    setFormData({
      ...INITIAL_MACHINE_FORM,
      sNo: nextSNo,
      machineNo: generatedCode
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (machine) => {
    setEditingId(machine.id);
    setFormData({
      sNo: machine.sNo ?? machine.sno ?? machine.serialNo ?? "",
      machineNo: standardizeCode(machine.machineNo),
      description: machine.description || "",
      department: machine.department || "Tool Room",
      location: machine.location || "",
      specification: machine.specification || "",
      capacity: machine.capacity || "",
      make: machine.make || "",
      remarks: machine.remarks || "",
      category: machine.category || "Tool Room & Machining",
      status: machine.status || "ACTIVE"
    });
    if (detailItem) setDetailItem(null);
    setIsModalOpen(true);
  };

  // Delete handlers
  const handleRequestDelete = (machine) => {
    setDeleteTarget(machine);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.machineNo || deleteTarget.description || "Machine";
    try {
      const res = await fetch(`${getApiUrl()}/api/maintenance/machines/${deleteTarget.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMachines((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        if (detailItem?.id === deleteTarget.id) setDetailItem(null);
        setToastMessage(`Machine "${deletedName}" deleted successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setToastMessage(errJson.message || `Failed to delete machine "${deletedName}"`);
      }
    } catch {
      setMachines((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setToastMessage(`Machine "${deletedName}" removed locally.`);
    } finally {
      setDeleteTarget(null);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Form Submission
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.machineNo.trim() || !formData.description.trim()) {
      alert("Machine number and description are required.");
      return;
    }

    const payload = {
      sNo: formData.sNo ? Number(formData.sNo) : undefined,
      machineNo: standardizeCode(formData.machineNo.trim()),
      description: formData.description.trim(),
      department: formData.department.trim(),
      location: formData.location.trim(),
      specification: formData.specification,
      capacity: formData.capacity.trim(),
      make: formData.make.trim(),
      remarks: formData.remarks,
      category: formData.category,
      status: formData.status
    };

    try {
      if (editingId) {
        const res = await fetch(`${getApiUrl()}/api/maintenance/machines/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const updated = await res.json();
          setMachines((prev) => prev.map((m) => (m.id === editingId ? { ...updated, machineNo: standardizeCode(updated.machineNo) } : m)));
          setToastMessage(`Machine "${payload.machineNo}" updated successfully!`);
        } else {
          setMachines((prev) => prev.map((m) => (m.id === editingId ? { ...m, ...payload } : m)));
          setToastMessage(`Machine "${payload.machineNo}" updated.`);
        }
      } else {
        const res = await fetch(`${getApiUrl()}/api/maintenance/machines`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          setMachines((prev) => [...prev, { ...created, machineNo: standardizeCode(created.machineNo) }]);
          setToastMessage(`New Machine "${payload.machineNo}" registered successfully!`);
        } else {
          const newObj = { ...payload, id: Date.now() };
          setMachines((prev) => [...prev, newObj]);
          setToastMessage(`New Machine "${payload.machineNo}" registered.`);
        }
      }
      setIsModalOpen(false);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setIsModalOpen(false);
    }
  };

  // Header Toolbar actions matching ItemMasterFormPage
  const handleEditSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToEdit = machines.find((i) => i.id === selectedId);
      if (itemToEdit) {
        handleOpenEditModal(itemToEdit);
        return;
      }
    }
    setQuickSearch("");
    setQuickPickerMode("edit");
  };

  const handleViewSelected = () => {
    if (selectedIds.size >= 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToView = machines.find((i) => i.id === selectedId);
      if (itemToView) {
        setDetailItem(itemToView);
        return;
      }
    }
    if (filteredMachines.length > 0) {
      setDetailItem(filteredMachines[0]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToDelete = machines.find((i) => i.id === selectedId);
      if (itemToDelete) {
        setDeleteTarget(itemToDelete);
        return;
      }
    }
    setQuickSearch("");
    setQuickPickerMode("delete");
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCategoryFilter("ALL");
    setColFilters({
      sNo: "",
      machineNo: "",
      description: "",
      department: "",
      location: "",
      capacity: "",
      make: "",
      status: ""
    });
    setSelectedIds(new Set());
    fetchMachines();
    setToastMessage("Data refreshed!");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleExportData = () => {
    const dataToExport = filteredMachines.map((item, idx) => ({
      "Sr. No": item.sNo ?? item.sno ?? item.serialNo ?? (idx + 1),
      "Machine Code": item.machineNo,
      "Description of Machine": item.description,
      "Department": item.department,
      "Location": item.location,
      "Capacity": item.capacity,
      "Make": item.make,
      "Specification": item.specification,
      "Status": item.status,
      "Remarks": item.remarks
    }));
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Machine_Master_Export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage("Catalog exported successfully!");
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Quick picker helpers
  const handleQuickPickerSelect = (machine) => {
    if (quickPickerMode === "edit") {
      setQuickPickerMode(null);
      handleOpenEditModal(machine);
    } else if (quickPickerMode === "delete") {
      setQuickPickerMode(null);
      handleRequestDelete(machine);
    }
  };

  // Row selection toggle
  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMachines.length && filteredMachines.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMachines.map((m) => m.id)));
    }
  };

  // Filtered Machines
  const filteredMachines = useMemo(() => {
    const sTerm = searchTerm.trim().toLowerCase();
    const catTerm = selectedCategoryFilter;

    return machines.filter((item) => {
      // 1. Top Search
      if (sTerm) {
        const inSearch =
          (item.machineNo && item.machineNo.toLowerCase().includes(sTerm)) ||
          (item.description && item.description.toLowerCase().includes(sTerm)) ||
          (item.department && item.department.toLowerCase().includes(sTerm)) ||
          (item.location && item.location.toLowerCase().includes(sTerm)) ||
          (item.capacity && item.capacity.toLowerCase().includes(sTerm)) ||
          (item.make && item.make.toLowerCase().includes(sTerm)) ||
          (item.specification && item.specification.toLowerCase().includes(sTerm));
        if (!inSearch) return false;
      }

      // 2. Category Pill Filter
      if (catTerm !== "ALL") {
        if (!item.department || !item.department.toLowerCase().includes(catTerm.toLowerCase())) {
          return false;
        }
      }

      // 3. Per-Column Filters
      if (colFilters.sNo && !String(item.sNo ?? item.sno ?? item.serialNo ?? "").toLowerCase().includes(colFilters.sNo.toLowerCase())) return false;
      if (colFilters.machineNo && !String(item.machineNo || "").toLowerCase().includes(colFilters.machineNo.toLowerCase())) return false;
      if (colFilters.description && !String(item.description || "").toLowerCase().includes(colFilters.description.toLowerCase())) return false;
      if (colFilters.department && !String(item.department || "").toLowerCase().includes(colFilters.department.toLowerCase())) return false;
      if (colFilters.location && !String(item.location || "").toLowerCase().includes(colFilters.location.toLowerCase())) return false;
      if (colFilters.capacity && !String(item.capacity || "").toLowerCase().includes(colFilters.capacity.toLowerCase())) return false;
      if (colFilters.make && !String(item.make || "").toLowerCase().includes(colFilters.make.toLowerCase())) return false;
      if (colFilters.status && !String(item.status || "").toLowerCase().includes(colFilters.status.toLowerCase())) return false;

      return true;
    });
  }, [machines, searchTerm, selectedCategoryFilter, colFilters]);

  // Pagination calculation
  const totalRecords = filteredMachines.length;
  const isAllPages = pageSize === "ALL";
  const numPageSize = isAllPages ? totalRecords : Number(pageSize);
  const totalPages = isAllPages ? 1 : Math.ceil(totalRecords / numPageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = isAllPages ? 0 : (clampedPage - 1) * numPageSize;
  const endIndex = isAllPages ? totalRecords : Math.min(startIndex + numPageSize, totalRecords);
  const paginatedMachines = isAllPages ? filteredMachines : filteredMachines.slice(startIndex, endIndex);

  // Summary Metrics
  const totalCount = machines.length;
  const activeCount = machines.filter((m) => m.status === "ACTIVE").length;
  const toolRoomCount = machines.filter((m) => m.department?.includes("T/Room")).length;
  const mouldingCount = machines.filter((m) => m.department?.includes("Moulding")).length;

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
        {/* ROW 1: TOP TOOLBAR & BREADCRUMB HEADER (STATIC - NEVER SCROLLS)           */}
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
            {/* + New Machine Button (exact style as + New Item Master) */}
            <button
              onClick={handleOpenNewModal}
              id="btn-new-machine-master"
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
              <span>New Machine</span>
            </button>

            {/* Edit Machine Button */}
            <button
              onClick={handleEditSelected}
              id="btn-edit-machine-master"
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
              Edit Machine
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

            {/* Delete Machine Button */}
            <button
              onClick={handleDeleteSelected}
              id="btn-delete-machine-master"
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
              Delete Machine
            </button>

            <span style={{ color: "#e2e8f0", margin: "0 4px", fontSize: 18 }}>|</span>

            {/* Utility Buttons: Refresh, Export, Print */}
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

          {/* Right Breadcrumb */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            {onBackToHome ? (
              <span
                onClick={onBackToHome}
                style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline", marginRight: 4 }}
              >
                Maintenance
              </span>
            ) : (
              <span>Maintenance</span>
            )}
            <span style={{ margin: "0 4px" }}>›</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>Machine Master Catalog</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: SEARCH INPUT, DEPARTMENT PILLS & SUMMARY METRICS (STATIC)         */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14
          }}
        >
          {/* Main Search Input */}
          <div style={{ width: 340, maxWidth: "100%", position: "relative" }}>
            <input
              type="text"
              placeholder="Search by M/C No, Description, Dept, Location, Make..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: 13,
                fontWeight: 500,
                outline: "none"
              }}
            />
          </div>

          {/* Department Filter Pills (exact same design as Item Master pills: #2b3d52 active, white inactive) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
            {DEPARTMENT_PILLS.map((pill) => {
              const isActive = selectedCategoryFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setSelectedCategoryFilter(pill.key)}
                  style={{
                    padding: "6px 18px",
                    borderRadius: 20,
                    border: isActive ? "none" : "1px solid #cbd5e1",
                    background: isActive ? "#2b3d52" : "#ffffff",
                    color: isActive ? "#ffffff" : "#334155",
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease"
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Right Side Summary Metrics */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 13, color: "#475569" }}>
            <div>
              Total <strong style={{ color: "#0f172a", fontSize: 14 }}>{totalCount}</strong>
            </div>
            <div>
              Active <strong style={{ color: "#0f172a", fontSize: 14 }}>{activeCount}</strong>
            </div>
            <div>
              Tool Room <strong style={{ color: "#0f172a", fontSize: 14 }}>{toolRoomCount}</strong>
            </div>
            <div>
              In-service <strong style={{ color: "#0f172a", fontSize: 14 }}>100%</strong>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DATA TABLE CONTAINER (ONLY DATA ROWS SCROLL VERTICALLY)                   */}
        {/* ========================================================================= */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "auto",
            background: "#ffffff",
            position: "relative"
          }}
        >
          <table className="resizable-table"
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 12,
              textAlign: "left",
              ...machineMasterPage1Resize.tableStyle,
            }}
          >
            <ResizableColGroup columns={MACHINE_MASTER_PAGE_1_COLUMNS} widths={machineMasterPage1Resize.widths} />
            <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
              {/* Header Row 1: Column Titles (STICKY AT TOP 0) */}
              <tr style={{ background: "#f1f5f9", height: 38 }}>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    width: 36,
                    textAlign: "center"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredMachines.length && filteredMachines.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", width: 60, whiteSpace: "nowrap" }}>
                  Sr.No
                  <ColumnResizeHandle colKey="sr_no" resize={machineMasterPage1Resize} />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", width: 110, whiteSpace: "nowrap" }}>
                  M/C No
                  <ColumnResizeHandle colKey="m_c_no" resize={machineMasterPage1Resize} />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 220, whiteSpace: "nowrap" }}>
                  Description of Machine
                  <ColumnResizeHandle colKey="description_of_machine" resize={machineMasterPage1Resize} />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", width: 140, whiteSpace: "nowrap" }}>
                  Department
                  <ColumnResizeHandle colKey="department" resize={machineMasterPage1Resize} />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", width: 140, whiteSpace: "nowrap" }}>
                  Location
                  <ColumnResizeHandle colKey="location" resize={machineMasterPage1Resize} />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", width: 130, whiteSpace: "nowrap" }}>
                  Capacity
                  <ColumnResizeHandle colKey="capacity" resize={machineMasterPage1Resize} />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 170, whiteSpace: "nowrap" }}>
                  Make / Manufacturer
                  <ColumnResizeHandle colKey="make_manufacturer" resize={machineMasterPage1Resize} />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", width: 90, whiteSpace: "nowrap" }}>
                  Status
                  <ColumnResizeHandle colKey="status" resize={machineMasterPage1Resize} />
                </th>
                {/* ACTION COLUMN - FIXED AS LAST COLUMN */}
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", width: 110, textAlign: "center", whiteSpace: "nowrap" }}>
                  Action
                  <ColumnResizeHandle colKey="action" resize={machineMasterPage1Resize} />
                </th>
              </tr>

              {/* Header Row 2: Per-Column Filter Input Boxes (STICKY AT TOP 37) */}
              <tr style={{ background: "#f8fafc", height: 38 }}>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 12px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}></td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.sNo}
                    onChange={(e) => setColFilters({ ...colFilters, sNo: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.machineNo}
                    onChange={(e) => setColFilters({ ...colFilters, machineNo: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.description}
                    onChange={(e) => setColFilters({ ...colFilters, description: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.department}
                    onChange={(e) => setColFilters({ ...colFilters, department: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.location}
                    onChange={(e) => setColFilters({ ...colFilters, location: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.capacity}
                    onChange={(e) => setColFilters({ ...colFilters, capacity: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.make}
                    onChange={(e) => setColFilters({ ...colFilters, make: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.status}
                    onChange={(e) => setColFilters({ ...colFilters, status: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  {(colFilters.sNo || colFilters.machineNo || colFilters.description || colFilters.department || colFilters.location || colFilters.capacity || colFilters.make || colFilters.status) && (
                    <button
                      onClick={() => setColFilters({ sNo: "", machineNo: "", description: "", department: "", location: "", capacity: "", make: "", status: "" })}
                      style={{ background: "none", border: "none", color: "#2563eb", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  )}
                </td>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody>
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>No machine records found</p>
                    <button
                      onClick={handleOpenNewModal}
                      style={{
                        background: "#1e293b",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 18px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 12
                      }}
                    >
                      + Add New Machine
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedMachines.map((item, idx) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      onDoubleClick={() => handleOpenEditModal(item)}
                      onClick={() => toggleSelectRow(item.id)}
                      style={{
                        background: isSelected ? "#ebf8ff" : "#ffffff",
                        borderBottom: "1px solid #e2e8f0",
                        cursor: "pointer",
                        transition: "background 0.1s ease"
                      }}
                    >
                      {/* Checkbox Column */}
                      <td style={{ padding: "10px 12px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.id)}
                          style={{ cursor: "pointer", accentColor: "#2563eb" }}
                        />
                      </td>

                      {/* Sr.No */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {item.sNo ?? item.sno ?? item.serialNo ?? (startIndex + idx + 1)}
                      </td>

                      {/* M/C No (Formatted as M/C -X in capital letters) */}
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {item.machineNo}
                      </td>

                      {/* Description of Machine */}
                      <td
                        style={{
                          padding: "10px 12px",
                          color: "#334155",
                          fontWeight: 600,
                          maxWidth: 280,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                        title={item.description}
                      >
                        {item.description}
                      </td>

                      {/* Department */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {item.department || "-"}
                      </td>

                      {/* Location */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {item.location || "-"}
                      </td>

                      {/* Capacity */}
                      <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {item.capacity || "-"}
                      </td>

                      {/* Make / Manufacturer */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {item.make || "-"}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          color: item.status === "ACTIVE" ? "#059669" : "#d97706"
                        }}>
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: item.status === "ACTIVE" ? "#10b981" : "#f59e0b"
                          }} />
                          {item.status || "ACTIVE"}
                        </span>
                      </td>

                      {/* ACTION COLUMN (ALWAYS LAST) */}
                      <td style={{ padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <button
                            onClick={() => setDetailItem(item)}
                            title="View"
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#64748b",
                              borderRadius: 4,
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit"
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#0284c7",
                              borderRadius: 4,
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleRequestDelete(item)}
                            title="Delete"
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#ef4444",
                              borderRadius: 4,
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            <Trash2 size={13} />
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
        {/* PAGINATION TOOLBAR (STATIC AT BOTTOM OF CARD - EXACT ITEM MASTER DESIGN)   */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
            color: "#475569"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span>
              Showing{" "}
              <strong>
                {totalRecords === 0 ? 0 : (startIndex + 1).toLocaleString()} &ndash;{" "}
                {endIndex.toLocaleString()}
              </strong>{" "}
              of <strong>{totalRecords.toLocaleString()}</strong> items
            </span>

            {selectedIds.size > 0 && (
              <span
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {selectedIds.size} selected
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Page Size Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: "3px 6px",
                  fontSize: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  background: "#ffffff",
                  color: "#0f172a",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="ALL">All</option>
              </select>
            </div>

            {/* Pagination Controls */}
            {!isAllPages && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={clampedPage <= 1}
                  title="First Page"
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: 4,
                    cursor: clampedPage <= 1 ? "not-allowed" : "pointer",
                    color: clampedPage <= 1 ? "#94a3b8" : "#334155",
                    fontSize: 11
                  }}
                >
                  <ChevronsLeft size={13} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={clampedPage <= 1}
                  title="Previous Page"
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: 4,
                    cursor: clampedPage <= 1 ? "not-allowed" : "pointer",
                    color: clampedPage <= 1 ? "#94a3b8" : "#334155",
                    fontSize: 11
                  }}
                >
                  <ChevronLeft size={13} />
                </button>

                <span style={{ padding: "0 6px", fontWeight: 700, color: "#0f172a" }}>
                  {clampedPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={clampedPage >= totalPages}
                  title="Next Page"
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: 4,
                    cursor: clampedPage >= totalPages ? "not-allowed" : "pointer",
                    color: clampedPage >= totalPages ? "#94a3b8" : "#334155",
                    fontSize: 11
                  }}
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={clampedPage >= totalPages}
                  title="Last Page"
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: 4,
                    cursor: clampedPage >= totalPages ? "not-allowed" : "pointer",
                    color: clampedPage >= totalPages ? "#94a3b8" : "#334155",
                    fontSize: 11
                  }}
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT MACHINE FORM                                       */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 22px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  {editingId ? "Edit Machine" : "New Machine"}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                  {editingId ? "Update machinery technical specifications" : "Register new equipment in plant registry"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Machine Code (M/C No) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M/C -55"
                    value={formData.machineNo}
                    onChange={(e) => setFormData({ ...formData, machineNo: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Serial # (Sr.No)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 55"
                    value={formData.sNo}
                    onChange={(e) => setFormData({ ...formData, sNo: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Description of Machine *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CNC ENGRAVING KAE 321"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: 13,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. T/Room, Moulding, Finishing..."
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Location / Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TOOL ROOM, MOULDING AREA"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Capacity
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100 TON, 160 KVA, 35 LTR"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Make / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SANTEC EXIM PVT. LTD. 2023"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Technical Specifications
                </label>
                <textarea
                  rows={3}
                  placeholder="Voltage, power (HP/KW), dimensions, motor rpm, stroke..."
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: 13,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                    <option value="BREAKDOWN">BREAKDOWN</option>
                    <option value="STANDBY">STANDBY</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 13,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "7px 18px",
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
                  {editingId ? "Save Changes" : "Save Machine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW MACHINE DETAILS SHEET                                       */}
      {/* ========================================================================= */}
      {detailItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                padding: "16px 22px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  {detailItem.machineNo} — {detailItem.description}
                </h2>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Sr #{detailItem.sNo ?? detailItem.sno ?? detailItem.serialNo ?? ""} • {detailItem.department}
                </span>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: "10px 14px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Location / Area</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                    {detailItem.location || "-"}
                  </div>
                </div>

                <div style={{ padding: "10px 14px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Operational Status</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: detailItem.status === "ACTIVE" ? "#059669" : "#d97706", marginTop: 4 }}>
                    {detailItem.status || "ACTIVE"}
                  </div>
                </div>

                <div style={{ padding: "10px 14px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Capacity</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                    {detailItem.capacity || "-"}
                  </div>
                </div>

                <div style={{ padding: "10px 14px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Make / Manufacturer</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                    {detailItem.make || "-"}
                  </div>
                </div>
              </div>

              <div style={{ padding: "12px 14px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                  Technical Specifications
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: "#1e293b",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  background: "#ffffff",
                  padding: "10px 12px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1"
                }}>
                  {detailItem.specification || "No specifications recorded."}
                </div>
              </div>

              {detailItem.remarks && (
                <div style={{ padding: "10px 14px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Remarks</div>
                  <div style={{ fontSize: 13, color: "#0f172a" }}>{detailItem.remarks}</div>
                </div>
              )}
            </div>

            <div style={{ padding: "12px 22px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => {
                  handleOpenEditModal(detailItem);
                }}
                style={{
                  background: "#1e293b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Edit Machine
              </button>
              <button
                onClick={() => setDetailItem(null)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              width: "100%",
              maxWidth: 420,
              padding: 22,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: 14
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              Delete Machine
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              Are you sure you want to delete <strong>{deleteTarget.machineNo}</strong> ({deleteTarget.description})?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
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
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: "7px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QUICK PICKER (FOR TOP BAR EDIT/DELETE BUTTONS)                    */}
      {/* ========================================================================= */}
      {quickPickerMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              width: "100%",
              maxWidth: 500,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                  {quickPickerMode === "edit" ? "Select Machine to Edit" : "Select Machine to Delete"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                  Click a machine from the catalog below
                </p>
              </div>
              <button
                onClick={() => setQuickPickerMode(null)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "10px 18px", borderBottom: "1px solid #e2e8f0" }}>
              <input
                type="text"
                placeholder="Filter machines..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
              {machines
                .filter((m) => {
                  if (!quickSearch) return true;
                  const q = quickSearch.toLowerCase();
                  return (
                    (m.machineNo && m.machineNo.toLowerCase().includes(q)) ||
                    (m.description && m.description.toLowerCase().includes(q)) ||
                    (m.department && m.department.toLowerCase().includes(q))
                  );
                })
                .map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleQuickPickerSelect(m)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      background: "#ffffff",
                      transition: "background 0.1s ease"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    <div>
                      <span style={{ fontWeight: 800, color: "#0f172a", marginRight: 8 }}>{m.machineNo}</span>
                      <span style={{ fontSize: 13, color: "#334155" }}>{m.description}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{m.department}</span>
                  </div>
                ))}
            </div>

            <div style={{ padding: "10px 18px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setQuickPickerMode(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
