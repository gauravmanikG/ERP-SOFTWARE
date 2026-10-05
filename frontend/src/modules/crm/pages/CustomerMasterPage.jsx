import { useState, useRef, useEffect, useMemo } from "react";
import { Eye, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Building2, ShieldCheck, MapPin, UserCheck, DollarSign } from "lucide-react";

const INITIAL_CUSTOMER_FORM = {
  customerCode: "",
  customerId: "",
  customerName: "",
  companyId: "COMP-001",
  customerType: "OEM", // OEM, WHOLESALE, RETAIL, DISTRIBUTOR, EXPORT
  gstin: "",
  pan: "",
  udyamNo: "",
  msmeCategory: "NOT_MSME",
  gstRegistrationType: "REGISTERED", // REGISTERED, UNREGISTERED, COMPOSITION, SEZ
  contactPerson: "",
  email: "",
  phone: "",
  paymentTermsId: "PT-30",
  creditLimit: "500000.00",
  currency: "INR",
  status: "ACTIVE", // ACTIVE, INACTIVE, BLOCKED
  address: "",
  city: "",
  state: "",
  stateCode: "",
  pincode: ""
};

const CUSTOMER_TYPE_OPTIONS = [
  { value: "OEM", label: "OEM Manufacturer" },
  { value: "WHOLESALE", label: "Wholesale Distributor" },
  { value: "RETAIL", label: "Retail Dealer" },
  { value: "DISTRIBUTOR", label: "Regional Distributor" },
  { value: "EXPORT", label: "Overseas / Export Customer" }
];

const GST_TYPE_OPTIONS = [
  { value: "REGISTERED", label: "Registered Business" },
  { value: "UNREGISTERED", label: "Unregistered Business" },
  { value: "COMPOSITION", label: "Composition Scheme" },
  { value: "SEZ", label: "SEZ / Export Unit" }
];

const MSME_CATEGORY_OPTIONS = [
  { value: "NOT_MSME", label: "Not MSME Registered" },
  { value: "MICRO", label: "Micro Enterprise" },
  { value: "SMALL", label: "Small Enterprise" },
  { value: "MEDIUM", label: "Medium Enterprise" }
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "PT-15", label: "15 Days" },
  { value: "PT-30", label: "30 Days" },
  { value: "PT-45", label: "45 Days" },
  { value: "PT-60", label: "60 Days" },
  { value: "IMMEDIATE", label: "Advance / Immediate" }
];

export function CustomerMasterPage({
  dark = false,
  onBackToHome,
  onOpenSidebar,
  sidebarOpen = false,
  setPage
}) {
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tab1"); // "tab1" or "tab2"
  const [formData, setFormData] = useState(INITIAL_CUSTOMER_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [quickPickerMode, setQuickPickerMode] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Table selection & column filter state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [colFilters, setColFilters] = useState({
    customerCode: "",
    customerName: "",
    gstin: "",
    pan: "",
    contactPerson: "",
    phone: "",
    city: "",
    state: "",
    gstType: "",
    status: ""
  });

  const [customers, setCustomers] = useState([]);
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

  // Fetch Customers from API on component mount
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/customers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCustomers(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch customers from backend API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Styling theme tokens matching ItemMasterFormPage & SupplierMasterPage
  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const textPrimary = dark ? "#f8fafc" : "#0f172a";
  const textSecondary = dark ? "#94a3b8" : "#64748b";
  const borderCol = dark ? "rgba(148, 163, 184, 0.14)" : "#e2e8f0";

  // Auto-generate code when opening new modal
  const handleOpenNewModal = () => {
    setEditingId(null);
    const nextNum = customers.length + 1;
    const generatedCode = `CUST-${String(nextNum).padStart(3, "0")}`;

    setFormData({
      ...INITIAL_CUSTOMER_FORM,
      customerCode: generatedCode,
      customerId: generatedCode
    });
    setActiveTab("tab1");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (customer) => {
    setEditingId(customer.id);
    setFormData({
      ...INITIAL_CUSTOMER_FORM,
      ...customer
    });
    setActiveTab("tab1");
    if (detailItem) setDetailItem(null);
    setIsModalOpen(true);
  };

  // Delete handlers
  const handleRequestDelete = (customer) => {
    setDeleteTarget(customer);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.customerName || "Customer";
    try {
      const res = await fetch(`${getApiUrl()}/api/customers/${deleteTarget.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setCustomers((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        if (detailItem?.id === deleteTarget.id) setDetailItem(null);
        setToastMessage(`Customer "${deletedName}" deleted successfully!`);
      } else {
        setToastMessage(`Failed to delete customer "${deletedName}"`);
      }
    } catch (e) {
      setCustomers((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setToastMessage(`Customer "${deletedName}" deleted locally.`);
    } finally {
      setDeleteTarget(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Handle Form field changes with smart GSTIN auto-derive (PAN and State Code)
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Smart auto-derivation from GSTIN
      if (field === "gstin" && value) {
        const cleanedGst = value.trim().toUpperCase();
        if (cleanedGst.length >= 15 && /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}$/.test(cleanedGst)) {
          if (!prev.pan) {
            updated.pan = cleanedGst.substring(2, 12);
          }
          if (!prev.stateCode) {
            updated.stateCode = cleanedGst.substring(0, 2);
          }
        }
      }

      return updated;
    });
  };

  // Save Customer (POST / PUT)
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      alert("Please enter the Customer Name - Required");
      return;
    }

    try {
      const isEdit = !!editingId;
      const url = isEdit ? `${getApiUrl()}/api/customers/${editingId}` : `${getApiUrl()}/api/customers`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const savedData = await res.json();
        if (isEdit) {
          setCustomers((prev) => prev.map((item) => (item.id === editingId ? savedData : item)));
          setToastMessage(`Customer "${savedData.customerName}" updated successfully!`);
        } else {
          setCustomers((prev) => [savedData, ...prev]);
          setToastMessage(`Customer "${savedData.customerName}" created successfully!`);
        }
      } else {
        // Fallback local update if backend offline
        const localObj = { ...formData, id: editingId || Date.now() };
        if (isEdit) {
          setCustomers((prev) => prev.map((item) => (item.id === editingId ? localObj : item)));
        } else {
          setCustomers((prev) => [localObj, ...prev]);
        }
        setToastMessage(`Customer saved locally.`);
      }
    } catch (err) {
      console.error("Save customer failed:", err);
      const localObj = { ...formData, id: editingId || Date.now() };
      if (editingId) {
        setCustomers((prev) => prev.map((item) => (item.id === editingId ? localObj : item)));
      } else {
        setCustomers((prev) => [localObj, ...prev]);
      }
      setToastMessage(`Saved to local state.`);
    } finally {
      setIsModalOpen(false);
      setEditingId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTypeFilter, colFilters]);

  // Filtering matching search, type pills, and per-column filters
  const filteredCustomers = useMemo(() => {
    const sTerm = searchTerm.trim().toLowerCase();
    const typeTerm = selectedTypeFilter;
    const fCode = colFilters.customerCode.trim().toLowerCase();
    const fName = colFilters.customerName.trim().toLowerCase();
    const fGst = colFilters.gstin.trim().toLowerCase();
    const fPan = colFilters.pan.trim().toLowerCase();
    const fContact = colFilters.contactPerson.trim().toLowerCase();
    const fPhone = colFilters.phone.trim().toLowerCase();
    const fCity = colFilters.city.trim().toLowerCase();
    const fState = colFilters.state.trim().toLowerCase();
    const fGstType = colFilters.gstType.trim().toLowerCase();
    const fStatus = colFilters.status.trim().toLowerCase();

    return customers.filter((item) => {
      // 1. Top Search
      if (sTerm) {
        const inSearch =
          (item.customerCode && item.customerCode.toLowerCase().includes(sTerm)) ||
          (item.customerName && item.customerName.toLowerCase().includes(sTerm)) ||
          (item.gstin && item.gstin.toLowerCase().includes(sTerm)) ||
          (item.pan && item.pan.toLowerCase().includes(sTerm)) ||
          (item.contactPerson && item.contactPerson.toLowerCase().includes(sTerm)) ||
          (item.city && item.city.toLowerCase().includes(sTerm)) ||
          (item.state && item.state.toLowerCase().includes(sTerm));
        if (!inSearch) return false;
      }

      // 2. Type Pill Filter
      if (typeTerm !== "ALL") {
        const inType =
          (item.customerType && item.customerType.toLowerCase() === typeTerm.toLowerCase()) ||
          (item.gstRegistrationType && item.gstRegistrationType.toLowerCase() === typeTerm.toLowerCase());
        if (!inType) return false;
      }

      // 3. Per-Column Filters
      if (fCode && (!item.customerCode || !item.customerCode.toLowerCase().includes(fCode))) return false;
      if (fName && (!item.customerName || !item.customerName.toLowerCase().includes(fName))) return false;
      if (fGst && (!item.gstin || !item.gstin.toLowerCase().includes(fGst))) return false;
      if (fPan && (!item.pan || !item.pan.toLowerCase().includes(fPan))) return false;
      if (fContact && (!item.contactPerson || !item.contactPerson.toLowerCase().includes(fContact))) return false;
      if (fPhone && (!item.phone || !item.phone.toLowerCase().includes(fPhone)) && (!item.email || !item.email.toLowerCase().includes(fPhone))) return false;
      if (fCity && (!item.city || !item.city.toLowerCase().includes(fCity))) return false;
      if (fState && (!item.state || !item.state.toLowerCase().includes(fState))) return false;
      if (fGstType && (!item.gstRegistrationType || !item.gstRegistrationType.toLowerCase().includes(fGstType))) return false;
      if (fStatus && (!item.status || !item.status.toLowerCase().includes(fStatus))) return false;

      return true;
    });
  }, [customers, searchTerm, selectedTypeFilter, colFilters]);

  // Pagination calculation
  const totalRecords = filteredCustomers.length;
  const isAllPages = pageSize === "ALL";
  const numPageSize = isAllPages ? totalRecords : Number(pageSize);
  const totalPages = isAllPages ? 1 : Math.ceil(totalRecords / numPageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = isAllPages ? 0 : (clampedPage - 1) * numPageSize;
  const endIndex = isAllPages ? totalRecords : Math.min(startIndex + numPageSize, totalRecords);
  const paginatedCustomers = isAllPages ? filteredCustomers : filteredCustomers.slice(startIndex, endIndex);

  // Live Summary Metrics
  const totalCount = customers.length;
  const registeredGstCount = customers.filter((i) => i.gstin && i.gstin.trim().length > 5).length;
  const activeCount = customers.filter((i) => !i.status || i.status.toUpperCase() === "ACTIVE").length;

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map((i) => i.id)));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toolbar Actions
  const handleEditSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToEdit = customers.find((i) => i.id === selectedId);
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
      const itemToView = customers.find((i) => i.id === selectedId);
      if (itemToView) {
        setDetailItem(itemToView);
        return;
      }
    }
    if (filteredCustomers.length > 0) {
      setDetailItem(filteredCustomers[0]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToDelete = customers.find((i) => i.id === selectedId);
      if (itemToDelete) {
        setDeleteTarget(itemToDelete);
        return;
      }
    }
    setQuickPickerMode("delete");
  };

  const handleRefresh = () => {
    fetchCustomers();
    setSearchTerm("");
    setSelectedTypeFilter("ALL");
    setColFilters({
      customerCode: "",
      customerName: "",
      gstin: "",
      pan: "",
      contactPerson: "",
      phone: "",
      city: "",
      state: "",
      gstType: "",
      status: ""
    });
    setSelectedIds(new Set());
    setToastMessage("Customer data refreshed!");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleExportData = () => {
    const dataToExport = filteredCustomers.map((item) => ({
      "Customer Code": item.customerCode,
      "Customer Name": item.customerName,
      "GSTIN": item.gstin || "-",
      "PAN": item.pan || "-",
      "Customer Type": item.customerType,
      "GST Registration": item.gstRegistrationType,
      "Contact Person": item.contactPerson || "-",
      "Phone": item.phone || "-",
      "Email": item.email || "-",
      "City": item.city || "-",
      "State": item.state || "-",
      "Credit Limit": item.creditLimit || "-",
      "Status": item.status
    }));
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Customer_Master_Export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage("Customer directory exported!");
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
        padding: "12px 20px 42px 20px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          width: "100%",
          margin: "0 auto",
          height: "100%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
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
            {/* + New Customer Button */}
            <button
              onClick={handleOpenNewModal}
              id="btn-new-customer-master"
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
              <span>New Customer</span>
            </button>

            {/* Edit Customer Button */}
            <button
              onClick={handleEditSelected}
              id="btn-edit-customer-master"
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
              Edit Customer
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

            {/* Delete Customer Button */}
            <button
              onClick={handleDeleteSelected}
              id="btn-delete-customer-master"
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
              Delete Customer
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

          {/* Right Breadcrumb */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            {onBackToHome ? (
              <span
                onClick={onBackToHome}
                style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline", marginRight: 4 }}
              >
                CRM & Sales
              </span>
            ) : (
              <span>CRM & Sales</span>
            )}
            <span style={{ margin: "0 4px" }}>›</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>Customer Master Directory</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: SEARCH INPUT, FILTER PILLS & REAL-TIME SUMMARY METRICS (STATIC)    */}
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
          {/* Search Input */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 280 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
              <input
                type="text"
                placeholder="Search customer name, code, GSTIN, PAN, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 34px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#f8fafc"
                }}
              />
              <Search
                size={16}
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
              />
            </div>

            {/* Category/Type Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto" }}>
              {["ALL", "OEM", "WHOLESALE", "RETAIL", "DISTRIBUTOR", "REGISTERED", "UNREGISTERED"].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setSelectedTypeFilter(pill)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: selectedTypeFilter === pill ? 700 : 500,
                    border: selectedTypeFilter === pill ? "1px solid #1e293b" : "1px solid #e2e8f0",
                    background: selectedTypeFilter === pill ? "#1e293b" : "#f1f5f9",
                    color: selectedTypeFilter === pill ? "#ffffff" : "#475569",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease"
                  }}
                >
                  {pill === "ALL" ? "All Customers" : pill}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Summary Metrics */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <div style={{ background: "#f8fafc", padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>Total Customers</span>
              <span style={{ fontSize: 15, color: "#0f172a", fontWeight: 800 }}>{totalCount}</span>
            </div>
            <div style={{ background: "#f8fafc", padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>Registered GSTIN</span>
              <span style={{ fontSize: 15, color: "#0284c7", fontWeight: 800 }}>{registeredGstCount}</span>
            </div>
            <div style={{ background: "#f8fafc", padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>Active Accounts</span>
              <span style={{ fontSize: 15, color: "#10b981", fontWeight: 800 }}>{activeCount}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: MAIN DATA TABLE WITH PER-COLUMN FILTERING (ONLY DATA SCROLLS)      */}
        {/* ========================================================================= */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 12.5,
                textAlign: "left"
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  background: "#f8fafc"
                }}
              >
                {/* Column Headers */}
                <tr style={{ background: "#f1f5f9", color: "#334155", fontWeight: 700, borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "10px 12px", width: 38, borderBottom: "1px solid #cbd5e1" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: "10px 12px", minWidth: 110, borderBottom: "1px solid #cbd5e1" }}>Customer Code</th>
                  <th style={{ padding: "10px 12px", minWidth: 200, borderBottom: "1px solid #cbd5e1" }}>Customer Name</th>
                  <th style={{ padding: "10px 12px", minWidth: 140, borderBottom: "1px solid #cbd5e1" }}>GSTIN</th>
                  <th style={{ padding: "10px 12px", minWidth: 110, borderBottom: "1px solid #cbd5e1" }}>PAN</th>
                  <th style={{ padding: "10px 12px", minWidth: 140, borderBottom: "1px solid #cbd5e1" }}>Contact Person</th>
                  <th style={{ padding: "10px 12px", minWidth: 130, borderBottom: "1px solid #cbd5e1" }}>Phone / Email</th>
                  <th style={{ padding: "10px 12px", minWidth: 110, borderBottom: "1px solid #cbd5e1" }}>City</th>
                  <th style={{ padding: "10px 12px", minWidth: 120, borderBottom: "1px solid #cbd5e1" }}>State</th>
                  <th style={{ padding: "10px 12px", minWidth: 120, borderBottom: "1px solid #cbd5e1" }}>GST Type</th>
                  <th style={{ padding: "10px 12px", minWidth: 90, borderBottom: "1px solid #cbd5e1" }}>Status</th>
                  <th style={{ padding: "10px 12px", width: 70, borderBottom: "1px solid #cbd5e1", textAlign: "center" }}>Action</th>
                </tr>

                {/* Per-Column Filter Inputs (STATIC HEADER ROW) */}
                <tr style={{ background: "#ffffff", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "4px 8px" }} />
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter Code"
                      value={colFilters.customerCode}
                      onChange={(e) => setColFilters({ ...colFilters, customerCode: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter Name"
                      value={colFilters.customerName}
                      onChange={(e) => setColFilters({ ...colFilters, customerName: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter GSTIN"
                      value={colFilters.gstin}
                      onChange={(e) => setColFilters({ ...colFilters, gstin: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter PAN"
                      value={colFilters.pan}
                      onChange={(e) => setColFilters({ ...colFilters, pan: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter Contact"
                      value={colFilters.contactPerson}
                      onChange={(e) => setColFilters({ ...colFilters, contactPerson: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter Phone/Email"
                      value={colFilters.phone}
                      onChange={(e) => setColFilters({ ...colFilters, phone: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter City"
                      value={colFilters.city}
                      onChange={(e) => setColFilters({ ...colFilters, city: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter State"
                      value={colFilters.state}
                      onChange={(e) => setColFilters({ ...colFilters, state: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter GST Type"
                      value={colFilters.gstType}
                      onChange={(e) => setColFilters({ ...colFilters, gstType: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }}>
                    <input
                      type="text"
                      placeholder="Filter Status"
                      value={colFilters.status}
                      onChange={(e) => setColFilters({ ...colFilters, status: e.target.value })}
                      style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    />
                  </th>
                  <th style={{ padding: "4px 8px" }} />
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                      Loading customers data from database...
                    </td>
                  </tr>
                ) : paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                      No matching customer records found.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => {
                    const isSelected = selectedIds.has(customer.id);
                    return (
                      <tr
                        key={customer.id || customer.customerCode}
                        style={{
                          background: isSelected ? "#eff6ff" : "#ffffff",
                          borderBottom: "1px solid #e2e8f0",
                          transition: "background 0.1s ease"
                        }}
                      >
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(customer.id)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>

                        {/* Customer Code */}
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e293b", borderBottom: "1px solid #f1f5f9" }}>
                          {customer.customerCode || customer.customerId || "-"}
                        </td>

                        {/* Customer Name */}
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>
                          {customer.customerName || "-"}
                        </td>

                        {/* GSTIN */}
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 600, color: "#0284c7", borderBottom: "1px solid #f1f5f9" }}>
                          {customer.gstin || "-"}
                        </td>

                        {/* PAN */}
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                          {customer.pan || "-"}
                        </td>

                        {/* Contact Person */}
                        <td style={{ padding: "8px 12px", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>
                          {customer.contactPerson || "-"}
                        </td>

                        {/* Phone / Email */}
                        <td style={{ padding: "8px 12px", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>
                          <div>{customer.phone || "-"}</div>
                          {customer.email && <div style={{ fontSize: 11, color: "#64748b" }}>{customer.email}</div>}
                        </td>

                        {/* City */}
                        <td style={{ padding: "8px 12px", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>
                          {customer.city || "-"}
                        </td>

                        {/* State */}
                        <td style={{ padding: "8px 12px", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>
                          {customer.state ? `${customer.state} (${customer.stateCode || "-"})` : "-"}
                        </td>

                        {/* GST Registration Type */}
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              background: customer.gstRegistrationType === "REGISTERED" ? "#dbeafe" : "#f1f5f9",
                              color: customer.gstRegistrationType === "REGISTERED" ? "#1e40af" : "#475569"
                            }}
                          >
                            {customer.gstRegistrationType || "REGISTERED"}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              background: (!customer.status || customer.status === "ACTIVE") ? "#dcfce7" : "#fee2e2",
                              color: (!customer.status || customer.status === "ACTIVE") ? "#15803d" : "#b91c1c"
                            }}
                          >
                            {customer.status || "ACTIVE"}
                          </span>
                        </td>

                        {/* Action Icons (LAST COLUMN) */}
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <button
                              onClick={() => setDetailItem(customer)}
                              title="View Details"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: 2 }}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(customer)}
                              title="Edit Customer"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#059669", padding: 2 }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleRequestDelete(customer)}
                              title="Delete Customer"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 2 }}
                            >
                              <Trash2 size={15} />
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
          {/* BOTTOM PAGINATION BAR (STATIC AT BOTTOM OF TABLE CONTAINER) */}
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
              gap: 12
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRecords} customers
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Page Size Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                <span>Page Size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12,
                    fontWeight: 600,
                    outline: "none"
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="ALL">ALL</option>
                </select>
              </div>

              {/* Page Controls */}
              {!isAllPages && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    disabled={clampedPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: clampedPage <= 1 ? "not-allowed" : "pointer", opacity: clampedPage <= 1 ? 0.5 : 1 }}
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    disabled={clampedPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: clampedPage <= 1 ? "not-allowed" : "pointer", opacity: clampedPage <= 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "0 8px", color: "#0f172a" }}>
                    Page {clampedPage} of {totalPages}
                  </span>
                  <button
                    disabled={clampedPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: clampedPage >= totalPages ? "not-allowed" : "pointer", opacity: clampedPage >= totalPages ? 0.5 : 1 }}
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    disabled={clampedPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: clampedPage >= totalPages ? "not-allowed" : "pointer", opacity: clampedPage >= totalPages ? 0.5 : 1 }}
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NEW / EDIT CUSTOMER MODAL DIALOG                                         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 820,
              maxHeight: "90vh",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 24px",
                background: "#1e293b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                  {editingId ? "Edit Customer Master Record" : "+ Create New Customer Master"}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Fill customer attributes for billing, credit terms, location & contact details.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", padding: "0 24px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("tab1")}
                style={{
                  padding: "12px 20px",
                  fontSize: 13,
                  fontWeight: activeTab === "tab1" ? 700 : 500,
                  border: "none",
                  borderBottom: activeTab === "tab1" ? "3px solid #1e293b" : "3px solid transparent",
                  background: "transparent",
                  color: activeTab === "tab1" ? "#1e293b" : "#64748b",
                  cursor: "pointer"
                }}
              >
                1. Basic & Registration
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tab2")}
                style={{
                  padding: "12px 20px",
                  fontSize: 13,
                  fontWeight: activeTab === "tab2" ? 700 : 500,
                  border: "none",
                  borderBottom: activeTab === "tab2" ? "3px solid #1e293b" : "3px solid transparent",
                  background: "transparent",
                  color: activeTab === "tab2" ? "#1e293b" : "#64748b",
                  cursor: "pointer"
                }}
              >
                2. Contact, Address & Credit
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveCustomer} style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {activeTab === "tab1" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {/* Customer Code */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Customer Code <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerCode}
                      onChange={(e) => handleInputChange("customerCode", e.target.value)}
                      placeholder="e.g. CUST-001"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        boxSizing: "border-box",
                        background: "#f8fafc",
                        fontWeight: 700
                      }}
                    />
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Customer Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange("customerName", e.target.value)}
                      placeholder="Enter legal client/company name"
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

                  {/* Customer Type */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Customer Type
                    </label>
                    <select
                      value={formData.customerType}
                      onChange={(e) => handleInputChange("customerType", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        boxSizing: "border-box"
                      }}
                    >
                      {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* GST Registration Type */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      GST Registration Type
                    </label>
                    <select
                      value={formData.gstRegistrationType}
                      onChange={(e) => handleInputChange("gstRegistrationType", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        boxSizing: "border-box"
                      }}
                    >
                      {GST_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* GSTIN */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      GSTIN (15-Digit Tax Code)
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => handleInputChange("gstin", e.target.value.toUpperCase())}
                      placeholder="e.g. 07AABCS1429B1Z2"
                      maxLength={15}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        fontFamily: "monospace",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* PAN */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      PAN (10-Digit)
                    </label>
                    <input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => handleInputChange("pan", e.target.value.toUpperCase())}
                      placeholder="e.g. AABCS1429B"
                      maxLength={10}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        fontFamily: "monospace",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Udyam No */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Udyam Registration No.
                    </label>
                    <input
                      type="text"
                      value={formData.udyamNo}
                      onChange={(e) => handleInputChange("udyamNo", e.target.value)}
                      placeholder="e.g. UDYAM-DL-01-0012345"
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

                  {/* Credit Limit */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Credit Limit (INR)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={formData.creditLimit}
                      onChange={(e) => handleInputChange("creditLimit", e.target.value)}
                      placeholder="e.g. 500000"
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
              )}

              {activeTab === "tab2" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {/* Contact Person */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                      placeholder="Primary contact name"
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

                  {/* Phone */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Phone / Mobile
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+91 9876543210"
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

                  {/* Email */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="client@company.com"
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

                  {/* Payment Terms */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Payment Terms
                    </label>
                    <select
                      value={formData.paymentTermsId}
                      onChange={(e) => handleInputChange("paymentTermsId", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        boxSizing: "border-box"
                      }}
                    >
                      {PAYMENT_TERMS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Address (Full Span) */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Billing / Dispatch Address
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Enter street, plot no, industrial area..."
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        boxSizing: "border-box",
                        resize: "vertical"
                      }}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="City / District"
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

                  {/* State */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      placeholder="State name (e.g. Haryana)"
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

                  {/* State Code */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      State Code (2-Digit)
                    </label>
                    <input
                      type="text"
                      value={formData.stateCode}
                      onChange={(e) => handleInputChange("stateCode", e.target.value)}
                      placeholder="e.g. 06"
                      maxLength={2}
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

                  {/* Pincode */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => handleInputChange("pincode", e.target.value)}
                      placeholder="6-digit postal code"
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

                  {/* Status */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Customer Account Status
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
                        boxSizing: "border-box"
                      }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="BLOCKED">BLOCKED / ON HOLD</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 12
                }}
              >
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
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                  }}
                >
                  {editingId ? "Update Customer" : "Save Customer Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG                                                */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#ffffff",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Confirm Deletion</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              Are you sure you want to delete customer record <strong>"{deleteTarget.customerName}"</strong> ({deleteTarget.customerCode})?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#dc2626", color: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAIL VIEW MODAL                                                         */}
      {/* ========================================================================= */}
      {detailItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 600,
              background: "#ffffff",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
            }}
          >
            <div style={{ padding: "16px 20px", background: "#1e293b", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Customer Specifications</h3>
              <button onClick={() => setDetailItem(null)} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, fontSize: 13, color: "#334155", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><strong>Customer Code:</strong> <div>{detailItem.customerCode || detailItem.customerId || "-"}</div></div>
              <div><strong>Customer Name:</strong> <div>{detailItem.customerName || "-"}</div></div>
              <div><strong>GSTIN:</strong> <div>{detailItem.gstin || "-"}</div></div>
              <div><strong>PAN:</strong> <div>{detailItem.pan || "-"}</div></div>
              <div><strong>Contact Person:</strong> <div>{detailItem.contactPerson || "-"}</div></div>
              <div><strong>Phone:</strong> <div>{detailItem.phone || "-"}</div></div>
              <div><strong>Email:</strong> <div>{detailItem.email || "-"}</div></div>
              <div><strong>Customer Type:</strong> <div>{detailItem.customerType || "-"}</div></div>
              <div><strong>GST Registration:</strong> <div>{detailItem.gstRegistrationType || "-"}</div></div>
              <div><strong>Credit Limit:</strong> <div>₹ {detailItem.creditLimit ? Number(detailItem.creditLimit).toLocaleString('en-IN') : "5,00,000"}</div></div>
              <div><strong>Payment Terms:</strong> <div>{detailItem.paymentTermsId || "-"}</div></div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Address:</strong> <div>{detailItem.address || "-"}</div></div>
              <div><strong>City:</strong> <div>{detailItem.city || "-"}</div></div>
              <div><strong>State:</strong> <div>{detailItem.state ? `${detailItem.state} (${detailItem.stateCode || "-"})` : "-"}</div></div>
            </div>
            <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => {
                  const toEdit = detailItem;
                  setDetailItem(null);
                  handleOpenEditModal(toEdit);
                }}
                style={{ padding: "7px 16px", borderRadius: 6, background: "#10b981", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
              >
                Edit
              </button>
              <button
                onClick={() => setDetailItem(null)}
                style={{ padding: "7px 16px", borderRadius: 6, background: "#cbd5e1", color: "#0f172a", border: "none", fontWeight: 600, cursor: "pointer" }}
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
