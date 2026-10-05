import { useState, useRef, useEffect, useMemo } from "react";
import { Eye, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { REAL_ITEM_MASTER_DATA } from "../data/realItemMasterData";

// Master lists extracted directly from the reference sheet
const PRODUCT_OPTIONS = [
  { no: 9, name: "OIL SEAL", label: "9 - OIL SEAL" },
  { no: 9, name: "VALVE STEAM SEAL", label: "9 - VALVE STEAM SEAL" },
  { no: 8, name: "O-RING", label: "8 - O-RING" },
  { no: 8, name: "O-RING KIT", label: "8 - O-RING KIT" },
  { no: 7, name: "METAL PARTS", label: "7 - METAL PARTS" },
  { no: 7, name: "ABS RING", label: "7 - ABS RING" },
  { no: 6, name: "PU", label: "6 - PU" },
  { no: 5, name: "REPAIR KIT", label: "5 - REPAIR KIT" },
  { no: 4, name: "GASKET/WHEEL HUB", label: "4 - GASKET/WHEEL HUB" }
];

const SEGMENT_OPTIONS = [
  { no: 9, name: "Trucks / HCV", label: "9 - Trucks / HCV" },
  { no: 8, name: "LCV/SCV", label: "8 - LCV/SCV" },
  { no: 7, name: "Automotive/Passenger/4W", label: "7 - Automotive/Passenger/4W" },
  { no: 6, name: "AGRICULTURAL/Tractor", label: "6 - AGRICULTURAL/Tractor" },
  { no: 5, name: "Construction", label: "5 - Construction" },
  { no: 4, name: "INDUS.", label: "4 - INDUS." },
  { no: 3, name: "3 W", label: "3 - 3 W" },
  { no: 2, name: "2 W", label: "2 - 2 W" }
];

const REGION_OPTIONS = [
  { no: 9, name: "EUROPEAN", label: "9 - EUROPEAN" },
  { no: 8, name: "AMERICAN", label: "8 - AMERICAN" },
  { no: 7, name: "JAPANESE", label: "7 - JAPANESE" },
  { no: 6, name: "CHINESE", label: "6 - CHINESE" },
  { no: 5, name: "IND", label: "5 - IND" },
  { no: 4, name: "CIS", label: "4 - CIS" }
];

const INITIAL_ITEM_FORM = {
  // Core Classification
  product: "9 - OIL SEAL",
  segment: "9 - Trucks / HCV",
  region: "5 - IND",

  // Hierarchy & Groups
  group_name: "FG",
  subgroup: "Oil Seal",
  sub_subgroup: "Rotary Shaft Seal",

  // Part Codes
  sms_new_part_no: "", // New Code
  old_code: "",        // Old Code

  // Dimensions
  inner_diameter: "",  // ID
  outer_diameter: "",  // OD
  height: "",          // Height
  thickness: "",       // Thickness

  // Description & Unit
  description_size: "", // Product Description
  uom: "PCS",           // UOM

  // Product Variant
  product_type: "Rotary Oil Seal - Double Lip",

  // Extended Attributes
  category: "Oil Seal",
  domestic_exports: "Domestic",
  application: "",
  ref_no: "",
  oem: "",
  corteco_no: "",
  cross_reference: "",
  group_code: "945",
  main_fg_code: "",
  material: "NBR",
  color: "Black",
  fitting_position: "",
  swirl_type: "None",
  price: "",
  purchased_uom: "Pc",
  consumption_uom: "Pc",
  file_name: "",
  image: null,
  fg_outsource: "IH",
  sfg_outsource: "IH",
  outsource_combo_fg_sfg: "IH"
};

// Helper functions to extract digits for product, segment, region and generate part number
function getProductDigit(productStr) {
  if (!productStr) return "9";
  const leadingMatch = String(productStr).match(/^(\d+)/);
  if (leadingMatch) return leadingMatch[1];
  const found = PRODUCT_OPTIONS.find(
    (p) =>
      p.name.toLowerCase() === String(productStr).toLowerCase() ||
      p.label.toLowerCase() === String(productStr).toLowerCase()
  );
  return found ? String(found.no) : "9";
}

function getSegmentDigit(segmentStr) {
  if (!segmentStr) return "9";
  const leadingMatch = String(segmentStr).match(/^(\d+)/);
  if (leadingMatch) return leadingMatch[1];
  const found = SEGMENT_OPTIONS.find(
    (s) =>
      s.name.toLowerCase() === String(segmentStr).toLowerCase() ||
      s.label.toLowerCase() === String(segmentStr).toLowerCase()
  );
  return found ? String(found.no) : "9";
}

function getRegionDigit(regionStr) {
  if (!regionStr) return "5";
  const leadingMatch = String(regionStr).match(/^(\d+)/);
  if (leadingMatch) return leadingMatch[1];
  const found = REGION_OPTIONS.find(
    (r) =>
      r.name.toLowerCase() === String(regionStr).toLowerCase() ||
      r.label.toLowerCase() === String(regionStr).toLowerCase()
  );
  return found ? String(found.no) : "5";
}

function generatePartNumberPrefix(product, segment, region) {
  const p = getProductDigit(product);
  const s = getSegmentDigit(segment);
  const r = getRegionDigit(region);
  return `${p}${s}${r}`;
}

function getHighestPartNumberSuffix(savedItems = []) {
  let highest = 0;
  if (Array.isArray(savedItems)) {
    for (const item of savedItems) {
      if (item && item.sms_new_part_no) {
        const match = String(item.sms_new_part_no).match(/-([0-9]+)/);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > highest) {
            highest = val;
          }
        }
      }
    }
  }
  return highest;
}

function getNextIncrementalSuffix(savedItems = [], baseOffset = 0) {
  let highest = getHighestPartNumberSuffix(savedItems);
  if (highest === 0) {
    highest = 7326;
  }
  if (baseOffset > 0 && baseOffset > highest) {
    highest = baseOffset;
  }
  const nextVal = highest + 1;
  return String(nextVal).padStart(5, "0");
}

const DEFAULT_SAVED_ITEMS = REAL_ITEM_MASTER_DATA;

const STORAGE_KEY = "sms_engineering_item_master_v3";

export function ItemMasterFormPage({
  dark = false,
  onBackToHome,
  onOpenSidebar,
  sidebarOpen = false
}) {
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tab1"); // "tab1" or "tab2"
  const [formData, setFormData] = useState(INITIAL_ITEM_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [editingId, setEditingId] = useState(null); // When editing an existing item
  const [deleteTarget, setDeleteTarget] = useState(null); // When confirming deletion
  const [quickPickerMode, setQuickPickerMode] = useState(null); // 'edit' | 'delete' | null
  const [quickSearch, setQuickSearch] = useState("");

  // Pagination State (for fast, responsive browsing of all 1,582 records)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Table selection & column filter state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [colFilters, setColFilters] = useState({
    photo: "",
    newCode: "",
    oldCode: "",
    description: "",
    product: "",
    segment: "",
    region: "",
    dimensions: "",
    material: "",
    price: ""
  });

  // Persistent records via localStorage (defaulting to the 1,582 real master records)
  const [savedItems, setSavedItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 50) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading item master from localStorage", e);
    }
    return REAL_ITEM_MASTER_DATA;
  });

  // Keep localStorage synchronized
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems));
    } catch (e) {
      console.error("Error saving item master to localStorage", e);
    }
  }, [savedItems]);

  const [toastMessage, setToastMessage] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  const fileInputRef = useRef(null);

  // Modern UI theme variables
  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const headerCardBg = dark
    ? "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e293b 100%)"
    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%)";
  const textPrimary = dark ? "#f8fafc" : "#0f172a";
  const textSecondary = dark ? "#94a3b8" : "#64748b";
  const borderCol = dark ? "rgba(148, 163, 184, 0.14)" : "#e2e8f0";
  const inputBg = dark ? "#0b1329" : "#ffffff";
  const rowHover = dark ? "rgba(255,255,255,0.02)" : "rgba(241,245,249,0.7)";

  // Open "New Item" Modal with unique auto-generated code
  const handleOpenNewModal = () => {
    setEditingId(null);
    const pfx = generatePartNumberPrefix(INITIAL_ITEM_FORM.product, INITIAL_ITEM_FORM.segment, INITIAL_ITEM_FORM.region);
    const sfx = getNextIncrementalSuffix(savedItems);
    setFormData({
      ...INITIAL_ITEM_FORM,
      group_code: pfx,
      sms_new_part_no: `${pfx}-${sfx}`
    });
    setActiveTab("tab1");
    setIsModalOpen(true);
  };

  // Open "Edit Item" Modal
  const handleOpenEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      ...INITIAL_ITEM_FORM,
      ...item
    });
    setActiveTab("tab1");
    if (detailItem) setDetailItem(null);
    setIsModalOpen(true);
  };

  // Request Delete confirmation
  const handleRequestDelete = (item) => {
    setDeleteTarget(item);
  };

  // Execute Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const deletedPartNo = deleteTarget.sms_new_part_no || "Item";
    setSavedItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    if (detailItem?.id === deleteTarget.id) {
      setDetailItem(null);
    }
    setDeleteTarget(null);
    setToastMessage(`Item "${deletedPartNo}" deleted successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate part number when product, segment, or region changes (during item creation)
      if (editingId === null && (field === "product" || field === "segment" || field === "region")) {
        const prod = field === "product" ? value : prev.product;
        const seg = field === "segment" ? value : prev.segment;
        const reg = field === "region" ? value : prev.region;
        const newPrefix = generatePartNumberPrefix(prod, seg, reg);

        // Keep current suffix if already set, or calculate next
        let currentSuffix = "";
        const match = prev.sms_new_part_no ? String(prev.sms_new_part_no).match(/-([0-9]+)/) : null;
        if (match) {
          currentSuffix = match[1];
        } else {
          currentSuffix = getNextIncrementalSuffix(savedItems);
        }

        updated.group_code = newPrefix;
        updated.sms_new_part_no = `${newPrefix}-${currentSuffix}`;
      }

      return updated;
    });
  };

  // Image Upload handler supporting JPG, JPEG, PNG
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload an image file in JPG or PNG format only.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          image: event.target.result,
          file_name: prev.file_name || file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save Item (handles both Create and Update)
  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!formData.sms_new_part_no.trim()) {
      alert("Please enter the New Code (SMS FINAL Part No.) - Required");
      return;
    }

    if (editingId) {
      // Update existing item
      setSavedItems((prev) =>
        prev.map((item) => (item.id === editingId ? { ...formData, id: editingId } : item))
      );
      setIsModalOpen(false);
      setEditingId(null);
      setToastMessage(`Item "${formData.sms_new_part_no}" updated successfully!`);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      // Create new item
      const newItem = {
        ...formData,
        id: Date.now()
      };
      setSavedItems((prev) => [newItem, ...prev]);
      setIsModalOpen(false);
      setToastMessage(`Item "${newItem.sms_new_part_no}" created successfully!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategoryFilter, colFilters]);

  // Comprehensive filtering matching top search, category pills, and per-column filters
  const filteredItems = useMemo(() => {
    const sTerm = searchTerm.trim().toLowerCase();
    const catTerm = selectedCategoryFilter;
    const fNewCode = colFilters.newCode.trim().toLowerCase();
    const fOldCode = colFilters.oldCode.trim().toLowerCase();
    const fDesc = colFilters.description.trim().toLowerCase();
    const fProd = colFilters.product.trim().toLowerCase();
    const fSeg = colFilters.segment.trim().toLowerCase();
    const fReg = colFilters.region.trim().toLowerCase();
    const fDims = colFilters.dimensions.trim().toLowerCase();
    const fMat = colFilters.material.trim().toLowerCase();
    const fPrice = colFilters.price.trim().toLowerCase();

    return savedItems.filter((item) => {
      // 1. Top Search
      if (sTerm) {
        const inSearch =
          (item.sms_new_part_no && item.sms_new_part_no.toLowerCase().includes(sTerm)) ||
          (item.old_code && item.old_code.toLowerCase().includes(sTerm)) ||
          (item.description_size && item.description_size.toLowerCase().includes(sTerm)) ||
          (item.product && item.product.toLowerCase().includes(sTerm)) ||
          (item.subgroup && item.subgroup.toLowerCase().includes(sTerm)) ||
          (item.oem && item.oem.toLowerCase().includes(sTerm));
        if (!inSearch) return false;
      }

      // 2. Category Pill Filter
      if (catTerm !== "ALL") {
        const inCat =
          (item.product && item.product.toLowerCase().includes(catTerm.toLowerCase())) ||
          (item.category && item.category.toLowerCase().includes(catTerm.toLowerCase())) ||
          (item.subgroup && item.subgroup.toLowerCase().includes(catTerm.toLowerCase()));
        if (!inCat) return false;
      }

      // 3. Per-Column Filters
      if (fNewCode && (!item.sms_new_part_no || !item.sms_new_part_no.toLowerCase().includes(fNewCode))) return false;
      if (fOldCode && (!item.old_code || !item.old_code.toLowerCase().includes(fOldCode))) return false;
      if (fDesc && (!item.description_size || !item.description_size.toLowerCase().includes(fDesc))) return false;
      if (fProd && (!item.product || !item.product.toLowerCase().includes(fProd)) && (!item.subgroup || !item.subgroup.toLowerCase().includes(fProd))) return false;
      if (fSeg && (!item.segment || !item.segment.toLowerCase().includes(fSeg))) return false;
      if (fReg && (!item.region || !item.region.toLowerCase().includes(fReg))) return false;
      if (fDims) {
        const dimsStr = `${item.inner_diameter || ""} ${item.outer_diameter || ""} ${item.height || item.thickness || ""}`.toLowerCase();
        if (!dimsStr.includes(fDims)) return false;
      }
      if (fMat) {
        const matStr = `${item.material || ""} ${item.color || ""}`.toLowerCase();
        if (!matStr.includes(fMat)) return false;
      }
      if (fPrice && (!item.price || !String(item.price).toLowerCase().includes(fPrice))) return false;

      return true;
    });
  }, [savedItems, searchTerm, selectedCategoryFilter, colFilters]);

  // Pagination calculation
  const totalRecords = filteredItems.length;
  const isAllPages = pageSize === "ALL";
  const numPageSize = isAllPages ? totalRecords : Number(pageSize);
  const totalPages = isAllPages ? 1 : Math.ceil(totalRecords / numPageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = isAllPages ? 0 : (clampedPage - 1) * numPageSize;
  const endIndex = isAllPages ? totalRecords : Math.min(startIndex + numPageSize, totalRecords);
  const paginatedItems = isAllPages ? filteredItems : filteredItems.slice(startIndex, endIndex);

  // Calculate live summary metrics
  const totalCount = savedItems.length;
  const oilSealsCount = savedItems.filter((i) => i.product?.toLowerCase().includes("oil seal")).length;
  const oRingsAndKitsCount = savedItems.filter(
    (i) => i.product?.toLowerCase().includes("o-ring") || i.product?.toLowerCase().includes("kit")
  ).length;

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
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

  // Header Actions
  const handleEditSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToEdit = savedItems.find((i) => i.id === selectedId);
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
      const itemToView = savedItems.find((i) => i.id === selectedId);
      if (itemToView) {
        setDetailItem(itemToView);
        return;
      }
    }
    if (filteredItems.length > 0) {
      setDetailItem(filteredItems[0]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToDelete = savedItems.find((i) => i.id === selectedId);
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
      photo: "",
      newCode: "",
      oldCode: "",
      product: "",
      segment: "",
      region: "",
      dimensions: "",
      material: "",
      price: ""
    });
    setSelectedIds(new Set());
    setToastMessage("Data refreshed!");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleExportData = () => {
    const dataToExport = filteredItems.map((item) => ({
      "New Code": item.sms_new_part_no,
      "Old Code": item.old_code,
      Product: item.product,
      Segment: item.segment,
      Region: item.region,
      Dimensions: `${item.inner_diameter || "-"} x ${item.outer_diameter || "-"} x ${item.height || "-"} mm`,
      Material: `${item.material || ""} ${item.color || ""}`,
      Price: item.price
    }));
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Item_Master_Export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage("Catalog exported successfully!");
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
            {/* + New Item Master Button */}
            <button
              onClick={handleOpenNewModal}
              id="btn-new-item-master"
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
              <span>New Item Master</span>
            </button>

            {/* Edit Item Button */}
            <button
              onClick={handleEditSelected}
              id="btn-edit-item-master"
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
              Edit Item
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

            {/* Delete Item Button */}
            <button
              onClick={handleDeleteSelected}
              id="btn-delete-item-master"
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
              Delete Item
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
                Engineering
              </span>
            ) : (
              <span>Engineering</span>
            )}
            <span style={{ margin: "0 4px" }}>›</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>Item Master Catalog</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: SEARCH INPUT, CATEGORY PILLS & REAL-TIME SUMMARY METRICS (STATIC) */}
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
              placeholder="Search by Part No, Old Code, Description, Product, OEM..."
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

          {/* Category Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { label: "All Items", key: "ALL" },
              { label: "Oil Seals", key: "OIL SEAL" },
              { label: "O-Rings", key: "O-RING" },
              { label: "Kits", key: "KIT" }
            ].map((pill) => {
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
              Oil Seals <strong style={{ color: "#0f172a", fontSize: 14 }}>{oilSealsCount}</strong>
            </div>
            <div>
              O-Rings &amp; Kits <strong style={{ color: "#0f172a", fontSize: 14 }}>{oRingsAndKitsCount}</strong>
            </div>
            <div>
              In-house <strong style={{ color: "#0f172a", fontSize: 14 }}>100%</strong>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DATA TABLE CONTAINER (ONLY DATA ROWS SCROLL VERTICALLY) */}
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
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 12,
              textAlign: "left"
            }}
          >
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
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Photo</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>New Code (SMS FINAL)</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Old Code</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 200, whiteSpace: "nowrap" }}>Description &amp; Size</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Product</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Segment</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Region</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Dimensions (ID × OD × H)</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Material</th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Price</th>
              </tr>

              {/* Header Row 2: Per-Column Filter Input Boxes (STICKY AT TOP 37) */}
              <tr style={{ background: "#f8fafc", height: 38 }}>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 12px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}></td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.photo}
                    onChange={(e) => setColFilters({ ...colFilters, photo: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.newCode}
                    onChange={(e) => setColFilters({ ...colFilters, newCode: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.oldCode}
                    onChange={(e) => setColFilters({ ...colFilters, oldCode: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter desc..."
                    value={colFilters.description}
                    onChange={(e) => setColFilters({ ...colFilters, description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.product}
                    onChange={(e) => setColFilters({ ...colFilters, product: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.segment}
                    onChange={(e) => setColFilters({ ...colFilters, segment: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.region}
                    onChange={(e) => setColFilters({ ...colFilters, region: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.dimensions}
                    onChange={(e) => setColFilters({ ...colFilters, dimensions: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.material}
                    onChange={(e) => setColFilters({ ...colFilters, material: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={colFilters.price}
                    onChange={(e) => setColFilters({ ...colFilters, price: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "3px 6px",
                      fontSize: 11,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </td>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>No item master records found</p>
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
                      + Add New Item Master
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
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

                      {/* Photo */}
                      <td style={{ padding: "10px 12px" }}>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt="Seal"
                            style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid #cbd5e1" }}
                          />
                        ) : (
                          <span style={{ fontSize: 11, color: "#64748b" }}>No Img</span>
                        )}
                      </td>

                      {/* New Code (SMS FINAL) */}
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {item.sms_new_part_no}
                      </td>

                      {/* Old Code */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {item.old_code || "-"}
                      </td>

                      {/* Description & Size */}
                      <td
                        style={{
                          padding: "10px 12px",
                          color: "#334155",
                          fontWeight: 500,
                          maxWidth: 280,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                        title={item.description_size}
                      >
                        {item.description_size || "-"}
                      </td>

                      {/* Product */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {item.product}
                      </td>

                      {/* Segment */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {item.segment}
                      </td>

                      {/* Region */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {item.region}
                      </td>

                      {/* Dimensions (ID x OD x H) */}
                      <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {item.inner_diameter || "-"} &times; {item.outer_diameter || "-"} &times; {item.height || item.thickness || "-"} mm
                      </td>

                      {/* Material */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {item.material || "NBR"} {item.color ? `· ${item.color}` : ""}
                      </td>

                      {/* Price */}
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {item.price ? `₹${item.price}` : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar (STATIC AT BOTTOM OF CARD) */}
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

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 11.5,
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                  background: "#ffffff"
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value="ALL">All (1,582)</option>
              </select>
            </div>
          </div>

          {!isAllPages && totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={clampedPage <= 1}
                title="First Page"
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: clampedPage <= 1 ? "#f8fafc" : "#ffffff",
                  color: clampedPage <= 1 ? "#94a3b8" : "#1e293b",
                  cursor: clampedPage <= 1 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={clampedPage <= 1}
                title="Previous Page"
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: clampedPage <= 1 ? "#f8fafc" : "#ffffff",
                  color: clampedPage <= 1 ? "#94a3b8" : "#1e293b",
                  cursor: clampedPage <= 1 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronLeft size={14} />
              </button>

              <span style={{ margin: "0 8px", fontWeight: 700, fontSize: 12 }}>
                Page {clampedPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={clampedPage >= totalPages}
                title="Next Page"
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: clampedPage >= totalPages ? "#f8fafc" : "#ffffff",
                  color: clampedPage >= totalPages ? "#94a3b8" : "#1e293b",
                  cursor: clampedPage >= totalPages ? "not-allowed" : "pointer"
                }}
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={clampedPage >= totalPages}
                title="Last Page"
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: clampedPage >= totalPages ? "#f8fafc" : "#ffffff",
                  color: clampedPage >= totalPages ? "#94a3b8" : "#1e293b",
                  cursor: clampedPage >= totalPages ? "not-allowed" : "pointer"
                }}
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM DARK STATUS BAR (MATCHING REFERENCE UI) */}
      {/* ========================================================================= */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 34,
          background: "#0f172a",
          color: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          fontSize: 12,
          fontWeight: 600,
          zIndex: 90,
          boxShadow: "0 -2px 10px rgba(0,0,0,0.2)"
        }}
      >
        <div>
          <span>{totalRecords.toLocaleString()} records</span>
          <span style={{ margin: "0 6px", color: "#64748b" }}>|</span>
          <span>{selectedIds.size} selected</span>
          {!isAllPages && (
            <>
              <span style={{ margin: "0 6px", color: "#64748b" }}>|</span>
              <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                Page {clampedPage} of {totalPages}
              </span>
            </>
          )}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>
          Compression Moulding Line &middot; Active in Production Catalog
        </div>
      </div>

      {/* ========================================================================= */}
      {/* "NEW ITEM MASTER" MODAL (EXACTLY 2 TABS - STRICT LINE-BY-LINE TAB 1) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 960,
              maxHeight: "92vh",
              background: cardBg,
              border: `1px solid ${borderCol}`,
              borderRadius: 22,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.55)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Modal Top Header */}
            <div
              style={{
                padding: "18px 26px",
                borderBottom: `1px solid ${borderCol}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: dark ? "rgba(30, 41, 59, 0.95)" : "#ffffff"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span
                    style={{
                      background: editingId ? "#059669" : "#c51f28",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 4,
                      textTransform: "uppercase"
                    }}
                  >
                    {editingId ? "Engineering • Edit Item" : "Engineering • Item Master"}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>
                    {editingId ? `Editing Part #${formData.sms_new_part_no || "Current"}` : "New Item Specification"}
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>
                  {editingId ? "Edit Item Master Record" : "Create New Item Master Record"}
                </h2>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  color: textSecondary,
                  cursor: "pointer",
                  padding: "4px 8px",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Exactly 2 Tabs as Requested */}
            <div
              style={{
                display: "flex",
                background: dark ? "#0f172a" : "#f1f5f9",
                borderBottom: `1px solid ${borderCol}`
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("tab1")}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  border: "none",
                  borderBottom: activeTab === "tab1" ? "3px solid #c51f28" : "3px solid transparent",
                  background: activeTab === "tab1" ? cardBg : "transparent",
                  color: activeTab === "tab1" ? "#c51f28" : textSecondary,
                  fontWeight: activeTab === "tab1" ? 800 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                1. Core Specifications (Product, Codes, Dimensions)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tab2")}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  border: "none",
                  borderBottom: activeTab === "tab2" ? "3px solid #c51f28" : "3px solid transparent",
                  background: activeTab === "tab2" ? cardBg : "transparent",
                  color: activeTab === "tab2" ? "#c51f28" : textSecondary,
                  fontWeight: activeTab === "tab2" ? 800 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                2. Extended Attributes &amp; Media (OEM, Material, Image, Outsource)
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveItem} style={{ flex: 1, overflowY: "auto", padding: "26px 30px" }}>
              
              {/* ========================================================================= */}
              {/* TAB 1: CORE SPECIFICATIONS (MATCHING TAB 2 THEME & PATTERN) */}
              {/* ========================================================================= */}
              {activeTab === "tab1" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  
                  {/* Core Classification: product | segment | region */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Core Classification
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                      {/* Product */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Product *
                        </label>
                        <select
                          value={formData.product}
                          onChange={(e) => handleInputChange("product", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        >
                          {PRODUCT_OPTIONS.map((opt, idx) => (
                            <option key={idx} value={opt.label}>
                              {opt.no} - {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Segment */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Segment *
                        </label>
                        <select
                          value={formData.segment}
                          onChange={(e) => handleInputChange("segment", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        >
                          {SEGMENT_OPTIONS.map((opt, idx) => (
                            <option key={idx} value={opt.label}>
                              {opt.no} - {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Region */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Region *
                        </label>
                        <select
                          value={formData.region}
                          onChange={(e) => handleInputChange("region", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        >
                          {REGION_OPTIONS.map((opt, idx) => (
                            <option key={idx} value={opt.label}>
                              {opt.no} - {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Hierarchy & Groups: group | subgroup | sub-subgroup */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Hierarchy &amp; Groups
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                      {/* Group */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Group
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. FG, SFG, Raw Material"
                          value={formData.group_name}
                          onChange={(e) => handleInputChange("group_name", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>

                      {/* Subgroup */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Subgroup
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Oil Seal, O-Ring, Gasket"
                          value={formData.subgroup}
                          onChange={(e) => handleInputChange("subgroup", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>

                      {/* Sub-subgroup */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Sub-subgroup
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rotary Shaft Seal, Hub Seal"
                          value={formData.sub_subgroup}
                          onChange={(e) => handleInputChange("sub_subgroup", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Part Codes: new code | old code */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Part Codes &amp; Identification
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                      {/* New Code */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, margin: 0 }}>
                            New Code (SMS FINAL Part No.) *
                          </label>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: dark ? "rgba(148, 163, 184, 0.15)" : "#f1f5f9",
                              color: dark ? "#94a3b8" : "#64748b",
                              padding: "2px 8px",
                              borderRadius: 4,
                              letterSpacing: "0.04em"
                            }}
                          >
                            AUTO-GENERATED
                          </span>
                        </div>

                        <input
                          type="text"
                          readOnly
                          value={formData.sms_new_part_no}
                          title="Auto-generated part code (non-editable)"
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1.5px solid ${borderCol}`,
                            background: dark ? "rgba(15, 23, 42, 0.65)" : "#f8fafc",
                            color: dark ? "#38bdf8" : "#0284c7",
                            fontSize: 13,
                            fontWeight: 800,
                            letterSpacing: "0.05em",
                            cursor: "not-allowed",
                            userSelect: "all"
                          }}
                        />
                      </div>

                      {/* Old Code */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Old Code (SMS Old Part)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 101, 102"
                          value={formData.old_code}
                          onChange={(e) => handleInputChange("old_code", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dimensions [mm]: ID | OD | height | thickness */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Dimensions (mm)
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16 }}>
                      {/* ID */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          ID (Inner Diameter)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 95"
                          value={formData.inner_diameter}
                          onChange={(e) => handleInputChange("inner_diameter", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>

                      {/* OD */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          OD (Outer Diameter)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 130"
                          value={formData.outer_diameter}
                          onChange={(e) => handleInputChange("outer_diameter", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>

                      {/* Height */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Height
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 13"
                          value={formData.height}
                          onChange={(e) => handleInputChange("height", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>

                      {/* Thickness */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Thickness
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 13"
                          value={formData.thickness}
                          onChange={(e) => handleInputChange("thickness", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description & Unit: product description | UOM */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Description &amp; Unit
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                      {/* Product Description */}
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Product Description
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Oil Seal-NBR (Size:95x130x13) Double Lip with Garter Spring"
                          value={formData.description_size}
                          onChange={(e) => handleInputChange("description_size", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>

                      {/* UOM */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          UOM
                        </label>
                        <select
                          value={formData.uom}
                          onChange={(e) => handleInputChange("uom", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        >
                          <option value="PCS">PCS (Pieces)</option>
                          <option value="NOS">NOS (Numbers)</option>
                          <option value="SET">SET (Kits / Sets)</option>
                          <option value="MTR">MTR (Meters)</option>
                          <option value="KGS">KGS (Kilograms)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Product Variant */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Product Variant
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                      {/* Product Type */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Product Type
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rotary Oil Seal - TC Double Lip / Hydraulic Rod Seal"
                          value={formData.product_type}
                          onChange={(e) => handleInputChange("product_type", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: `1px solid ${borderCol}`,
                            background: inputBg,
                            color: textPrimary,
                            fontSize: 12
                          }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: REST OF ALL ATTRIBUTES */}
              {/* ========================================================================= */}
              {activeTab === "tab2" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  
                  {/* Category, Domestic/Export & Application */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Market &amp; Application
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                      {/* Category */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Category
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Oil Seal, O-Ring, Gasket"
                          value={formData.category}
                          onChange={(e) => handleInputChange("category", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* Domestic / Exports */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Domestic / Exports
                        </label>
                        <select
                          value={formData.domestic_exports}
                          onChange={(e) => handleInputChange("domestic_exports", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        >
                          <option value="Domestic">Domestic</option>
                          <option value="Export">Export</option>
                          <option value="Both">Both (Domestic &amp; Export)</option>
                        </select>
                      </div>

                      {/* Application */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Application
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Engine Crankshaft, Wheel Hub, Pinion"
                          value={formData.application}
                          onChange={(e) => handleInputChange("application", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* OEM, Corteco, Ref No, Cross Reference */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      References &amp; Cross Catalog
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                      {/* REF. NO. */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          REF. NO.
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Drawing / Catalog Ref"
                          value={formData.ref_no}
                          onChange={(e) => handleInputChange("ref_no", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* OEM */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          OEM Reference
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tata, Mahindra, Ashok Leyland"
                          value={formData.oem}
                          onChange={(e) => handleInputChange("oem", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* CORTECO NO */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          CORTECO NO
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 12011145B"
                          value={formData.corteco_no}
                          onChange={(e) => handleInputChange("corteco_no", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* CROSS Reference */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          CROSS Reference
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SKF, Parker, National, CR"
                          value={formData.cross_reference}
                          onChange={(e) => handleInputChange("cross_reference", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* Group Code */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Group Code
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 945, 985"
                          value={formData.group_code}
                          onChange={(e) => handleInputChange("group_code", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* Main FG Code */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Main FG Code
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. FG-945-05745"
                          value={formData.main_fg_code}
                          onChange={(e) => handleInputChange("main_fg_code", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Material, Color, Fitting Position, Swirl, Price */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Material, Dynamics &amp; Commercial
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                      {/* Material */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Material
                        </label>
                        <select
                          value={formData.material}
                          onChange={(e) => handleInputChange("material", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        >
                          <option value="NBR">NBR (Nitrile Butadiene Rubber)</option>
                          <option value="FKM">FKM / Viton</option>
                          <option value="Silicone">Silicone (VMQ)</option>
                          <option value="Polyacrylate">Polyacrylate (ACM)</option>
                          <option value="EPDM">EPDM</option>
                          <option value="PTFE">PTFE (Teflon)</option>
                          <option value="PU">PU (Polyurethane)</option>
                        </select>
                      </div>

                      {/* Color */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Color
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Black, Brown, Red, Blue"
                          value={formData.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* Fitting Position */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Fitting Position
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Front Axle, Rear Hub, Crankcase"
                          value={formData.fitting_position}
                          onChange={(e) => handleInputChange("fitting_position", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* Swirl Type */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Swirl Type
                        </label>
                        <select
                          value={formData.swirl_type}
                          onChange={(e) => handleInputChange("swirl_type", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        >
                          <option value="None">None (Plain Lip)</option>
                          <option value="Right Hand (RH)">Right Hand (RH)</option>
                          <option value="Left Hand (LH)">Left Hand (LH)</option>
                          <option value="Bi-Directional">Bi-Directional (Dual)</option>
                        </select>
                      </div>

                      {/* Standard Unit Price */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Standard Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 185.00"
                          value={formData.price}
                          onChange={(e) => handleInputChange("price", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* Purchased UOM */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Purchased UOM
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Pc, Box"
                          value={formData.purchased_uom}
                          onChange={(e) => handleInputChange("purchased_uom", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* Consumption UOM */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Consumption UOM
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Pc"
                          value={formData.consumption_uom}
                          onChange={(e) => handleInputChange("consumption_uom", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>

                      {/* File Name */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          File Name (CAD / Drawing)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SMS-DWG-945-05745.dwg"
                          value={formData.file_name}
                          onChange={(e) => handleInputChange("file_name", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Outsourcing & Sourcing Workflow */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Outsourcing &amp; Manufacturing
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                      {/* FG Outsource */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          FG Outsource
                        </label>
                        <select
                          value={formData.fg_outsource}
                          onChange={(e) => handleInputChange("fg_outsource", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        >
                          <option value="IH">IH (In-House)</option>
                          <option value="RING OS">RING OS (Ring Outsource)</option>
                          <option value="MOULDED OS">MOULDED OS (Moulded Outsource)</option>
                          <option value="FULL OS">FULL OS (Full Outsource)</option>
                        </select>
                      </div>

                      {/* SFG Outsource */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          SFG Outsource
                        </label>
                        <select
                          value={formData.sfg_outsource}
                          onChange={(e) => handleInputChange("sfg_outsource", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        >
                          <option value="IH">IH (In-House)</option>
                          <option value="RING OS">RING OS</option>
                          <option value="MOULDED OS">MOULDED OS</option>
                          <option value="JOBWORK">JOBWORK</option>
                        </select>
                      </div>

                      {/* Outsource Combo FG & SFG */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>
                          Outsource Combo FG &amp; SFG
                        </label>
                        <select
                          value={formData.outsource_combo_fg_sfg}
                          onChange={(e) => handleInputChange("outsource_combo_fg_sfg", e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 12 }}
                        >
                          <option value="IH">IH (In-House)</option>
                          <option value="RING OS">RING OS</option>
                          <option value="MOULDED OS">MOULDED OS</option>
                          <option value="COMBO OS">COMBO OS</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Image Upload (JPG & PNG) */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Item Image Upload (JPG / PNG)
                    </span>
                    <div
                      style={{
                        border: `2px dashed ${borderCol}`,
                        borderRadius: 14,
                        padding: "20px",
                        background: dark ? "rgba(15, 23, 42, 0.4)" : "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        gap: 20
                      }}
                    >
                      {formData.image ? (
                        <div style={{ position: "relative" }}>
                          <img
                            src={formData.image}
                            alt="Item Preview"
                            style={{
                              width: 90,
                              height: 90,
                              objectFit: "cover",
                              borderRadius: 12,
                              border: `2px solid #10b981`
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            title="Remove image"
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: 90,
                            height: 90,
                            borderRadius: 12,
                            background: dark ? "#1e293b" : "#e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: textSecondary,
                            fontSize: 11,
                            fontWeight: 700,
                            textAlign: "center",
                            padding: 8
                          }}
                        >
                          No Image Uploaded
                        </div>
                      )}

                      <div style={{ flex: 1 }}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg, image/png, image/jpg"
                          onChange={handleImageUpload}
                          style={{ display: "none" }}
                          id="item-image-upload"
                        />
                        <label
                          htmlFor="item-image-upload"
                          style={{
                            display: "inline-block",
                            padding: "9px 18px",
                            borderRadius: 10,
                            background: dark ? "rgba(197, 31, 40, 0.2)" : "#fee2e2",
                            color: "#c51f28",
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: "pointer",
                            border: "1px solid rgba(197, 31, 40, 0.35)",
                            marginBottom: 6
                          }}
                        >
                          &#128247; Choose JPG / PNG File
                        </label>
                        <p style={{ fontSize: 11, color: textSecondary, margin: 0 }}>
                          Select high-resolution JPG or PNG seal profile photo. Renders immediate thumbnail preview.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Modal Footer / Submit & Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 28,
                  paddingTop: 18,
                  borderTop: `1px solid ${borderCol}`
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setFormData(INITIAL_ITEM_FORM)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${borderCol}`,
                      borderRadius: 10,
                      padding: "8px 16px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: textSecondary,
                      cursor: "pointer"
                    }}
                  >
                    Clear Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: textSecondary,
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {activeTab === "tab1" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("tab2")}
                      style={{
                        background: dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                        color: textPrimary,
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 20px",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      Next: Extended Attributes &rarr;
                    </button>
                  )}

                  <button
                    type="submit"
                    style={{
                      background: editingId
                        ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                        : "linear-gradient(135deg, #c51f28 0%, #991b1b 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 24px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: editingId
                        ? "0 4px 14px rgba(5, 150, 105, 0.4)"
                        : "0 4px 14px rgba(197, 31, 40, 0.4)"
                    }}
                  >
                    &#10003; {editingId ? "Update Item Master" : "Save to Item Master"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL SPECS VIEW MODAL */}
      {/* ========================================================================= */}
      {detailItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 780,
              background: cardBg,
              border: `1px solid ${borderCol}`,
              borderRadius: 22,
              padding: "26px 30px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.55)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#c51f28", textTransform: "uppercase" }}>
                  Engineering Master Specification
                </span>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: textPrimary, margin: "2px 0 0" }}>
                  {detailItem.sms_new_part_no}
                </h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                style={{ background: "none", border: "none", fontSize: 24, color: textSecondary, cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 22 }}>
              <div>
                {detailItem.image ? (
                  <img
                    src={detailItem.image}
                    alt="Product"
                    style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 14, border: `1.5px solid ${borderCol}` }}
                  />
                ) : (
                  <div
                    style={{
                      height: 180,
                      borderRadius: 14,
                      background: dark ? "#1e293b" : "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: textSecondary,
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    No Photo Uploaded
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                <div><strong>New Code:</strong> <span style={{ color: "#c51f28", fontWeight: 800 }}>{detailItem.sms_new_part_no}</span></div>
                <div><strong>Old Code:</strong> {detailItem.old_code || "-"}</div>
                <div><strong>Product:</strong> {detailItem.product || "-"}</div>
                <div><strong>Segment:</strong> {detailItem.segment || "-"}</div>
                <div><strong>Region:</strong> {detailItem.region || "-"}</div>
                <div><strong>Group:</strong> {detailItem.group_name || "-"} / {detailItem.subgroup || "-"}</div>
                <div><strong>Sub-subgroup:</strong> {detailItem.sub_subgroup || "-"}</div>
                <div><strong>Product Type:</strong> {detailItem.product_type || "-"}</div>
                <div><strong>Dimensions (ID &times; OD &times; H):</strong> {detailItem.inner_diameter || "-"} &times; {detailItem.outer_diameter || "-"} &times; {detailItem.height || detailItem.width || "-"} mm</div>
                <div><strong>Thickness:</strong> {detailItem.thickness || "-"} mm</div>
                <div><strong>UOM:</strong> {detailItem.uom || "-"}</div>
                <div><strong>Material / Color:</strong> {detailItem.material || "-"} / {detailItem.color || "-"}</div>
                <div><strong>Price:</strong> {detailItem.price ? `₹${detailItem.price}` : "-"}</div>
                <div><strong>OEM:</strong> {detailItem.oem || "-"}</div>
                <div><strong>CORTECO NO:</strong> {detailItem.corteco_no || "-"}</div>
                <div><strong>Application:</strong> {detailItem.application || "-"}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${borderCol}`, paddingTop: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(detailItem)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: dark ? "rgba(16, 185, 129, 0.18)" : "#d1fae5",
                    color: "#059669",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  <Pencil size={14} />
                  <span>Edit Specification</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestDelete(detailItem)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: dark ? "rgba(239, 68, 68, 0.18)" : "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Record</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDetailItem(null)}
                style={{
                  background: "#c51f28",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 20px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Close Specification
              </button>
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
            zIndex: 100000,
            background: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: cardBg,
              border: `1px solid ${borderCol}`,
              borderRadius: 20,
              padding: "26px 28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.55)"
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: dark ? "rgba(239, 68, 68, 0.18)" : "#fee2e2",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <Trash2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: "0 0 6px" }}>
                  Delete Item Master Record
                </h3>
                <p style={{ fontSize: 13, color: textSecondary, margin: 0, lineHeight: 1.5 }}>
                  Are you sure you want to permanently delete part number{" "}
                  <strong style={{ color: "#c51f28" }}>{deleteTarget.sms_new_part_no}</strong>
                  {deleteTarget.description_size ? ` (${deleteTarget.description_size})` : ""}?
                </p>
                <p style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, margin: "8px 0 0" }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 14, borderTop: `1px solid ${borderCol}` }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  background: "transparent",
                  border: `1px solid ${borderCol}`,
                  borderRadius: 10,
                  padding: "9px 18px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: textSecondary,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 20px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
                  transition: "all 0.15s"
                }}
              >
                Yes, Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* QUICK PICKER MODAL (EDIT OR DELETE ITEM FROM TOP BAR) */}
      {/* ========================================================================= */}
      {quickPickerMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "85vh",
              background: cardBg,
              border: `1px solid ${borderCol}`,
              borderRadius: 22,
              padding: "26px 28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.55)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <span
                  style={{
                    background: quickPickerMode === "edit" ? "#059669" : "#dc2626",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 4,
                    textTransform: "uppercase"
                  }}
                >
                  {quickPickerMode === "edit" ? "Edit Mode" : "Delete Mode"}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: textPrimary, margin: "4px 0 0" }}>
                  {quickPickerMode === "edit" ? "Select an Item to Edit" : "Select an Item to Delete"}
                </h3>
              </div>
              <button
                onClick={() => setQuickPickerMode(null)}
                style={{ background: "none", border: "none", fontSize: 24, color: textSecondary, cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                type="text"
                autoFocus
                placeholder="Type part number, old code, description to filter..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 38px",
                  borderRadius: 10,
                  border: `1.5px solid ${borderCol}`,
                  background: inputBg,
                  color: textPrimary,
                  fontSize: 12,
                  fontWeight: 600,
                  outline: "none"
                }}
              />
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: textSecondary
                }}
              />
            </div>

            {/* Items List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, paddingRight: 4 }}>
              {savedItems
                .filter((item) => {
                  const q = quickSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    item.sms_new_part_no?.toLowerCase().includes(q) ||
                    item.old_code?.toLowerCase().includes(q) ||
                    item.description_size?.toLowerCase().includes(q) ||
                    item.product?.toLowerCase().includes(q)
                  );
                })
                .map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: `1px solid ${borderCol}`,
                      background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, color: "#c51f28", fontSize: 13 }}>
                          {item.sms_new_part_no}
                        </span>
                        {item.old_code && (
                          <span style={{ fontSize: 11, color: textSecondary }}>
                            (Old: {item.old_code})
                          </span>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: dark ? "rgba(148,163,184,0.15)" : "#e2e8f0", color: textPrimary }}>
                          {item.product}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: textSecondary }}>
                        {item.description_size || "No description"} {item.material ? `• ${item.material}` : ""}
                      </p>
                    </div>

                    {quickPickerMode === "edit" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPickerMode(null);
                          handleOpenEditModal(item);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#059669",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "7px 14px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)"
                        }}
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPickerMode(null);
                          handleRequestDelete(item);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#dc2626",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "7px 14px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)"
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                ))}
            </div>

            <div style={{ paddingTop: 14, borderTop: `1px solid ${borderCol}`, textAlign: "right", marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setQuickPickerMode(null)}
                style={{
                  background: "transparent",
                  border: `1px solid ${borderCol}`,
                  borderRadius: 8,
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: textSecondary,
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
