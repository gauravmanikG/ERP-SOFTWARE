import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import { useState, useRef, useEffect, useMemo } from "react";
import { Eye, Pencil, Trash2, Search, X } from "lucide-react";

// Master lists extracted directly from the reference sheet
const GROUP_OPTIONS = [
  { no: 9, name: "OIL SEAL", label: "OIL SEAL" },
  { no: 9, name: "VALVE STEAM SEAL", label: "VALVE STEAM SEAL" },
  { no: 8, name: "O-RING", label: "O-RING" },
  { no: 8, name: "O-RING KIT", label: "O-RING KIT" },
  { no: 7, name: "METAL PARTS", label: "METAL PARTS" },
  { no: 7, name: "ABS RING", label: "ABS RING" },
  { no: 6, name: "PU", label: "PU" },
  { no: 5, name: "REPAIR KIT", label: "REPAIR KIT" },
  { no: 4, name: "GASKET/WHEEL HUB", label: "GASKET/WHEEL HUB" }
];

const SUBGROUP_OPTIONS = [
  { no: 9, name: "Trucks / HCV", label: "Trucks / HCV" },
  { no: 8, name: "LCV/SCV", label: "LCV/SCV" },
  { no: 7, name: "Automotive/Passenger/4W", label: "Automotive/Passenger/4W" },
  { no: 6, name: "AGRICULTURAL/Tractor", label: "AGRICULTURAL/Tractor" },
  { no: 5, name: "Construction", label: "Construction" },
  { no: 4, name: "INDUS.", label: "INDUS." },
  { no: 3, name: "3 W", label: "3 W" },
  { no: 2, name: "2 W", label: "2 W" }
];

const SUBSUBGROUP_OPTIONS = [
  { no: 9, name: "EUROPEAN", label: "EUROPEAN" },
  { no: 8, name: "AMERICAN", label: "AMERICAN" },
  { no: 7, name: "JAPANESE", label: "JAPANESE" },
  { no: 6, name: "CHINESE", label: "CHINESE" },
  { no: 5, name: "IND", label: "IND" },
  { no: 4, name: "CIS", label: "CIS" }
];

// Aliases for compatibility
const PRODUCT_OPTIONS = GROUP_OPTIONS;
const SEGMENT_OPTIONS = SUBGROUP_OPTIONS;
const REGION_OPTIONS = SUBSUBGROUP_OPTIONS;

const INITIAL_ITEM_FORM = {
  // Core Classification (Row 1)
  group: "",
  subgroup: "",
  sub_subgroup: "",
  product: "",
  segment: "",
  region: "",

  // Codes (Row 2 & 3)
  main_group_code: "FG",
  group_code: "",
  sms_new_part_no: "",
  old_code: "",
  sms_old_part_no: "",

  // Description
  description_size: "",
  item_description: "",

  // Dimensions (Row 4)
  inner_diameter: "",
  outer_diameter: "",
  height: "",
  thickness: "",

  // Physical & Style (Row 5)
  color: "",
  material: "",
  style: "",
  drawing_no: "",
  drawing_image: null,

  // UOM & Image (Row 6)
  purchased_uom: "",
  consumption_uom: "",
  uom: "",
  image: null,
  file_name: "",

  // Weights & Opening (Row 7)
  gross_wt: "",
  net_wt: "",
  opening_balance: "",
  item_class: "",

  // Procurement & Process (Row 8)
  procurement_type: "",
  process_type: "",
  min_stock_lvl: "",
  max_stock_lvl: "",

  // Stock Levels & Tolerance (Row 9)
  reorder_stock_lvl: "",
  rej_tolerance: "",
  hsn_code: "",

  // Financials (Row 10)
  mrp: "",
  price: "",
  rate: "",

  // Hierarchy & Groups (Tab 2)
  group_name: "",
  product_type: "",
  category: "",
  domestic_exports: "",
  application: "",
  ref_no: "",
  oem: "",
  corteco_no: "",
  cross_reference: "",
  main_fg_code: "",
  remark: "",
  fitting_position: "",
  swirl_type: "",
  fg_outsource: "",
  sfg_outsource: "",
  outsource_combo_fg_sfg: "",

  // Lead Time (Tab 1)
  safety_lead_time: "",
  procurement_lead_time: ""
};

// Helper functions to extract digits for group, subgroup, subsubgroup and generate part number
function getGroupDigit(groupStr) {
  if (!groupStr) return "";
  const str = String(groupStr).trim().toLowerCase();
  const found = GROUP_OPTIONS.find(
    (g) =>
      g.name.toLowerCase() === str ||
      g.label.toLowerCase() === str ||
      str.includes(g.name.toLowerCase())
  );
  if (found) return String(found.no);
  const leadingMatch = str.match(/^(\d+)/);
  if (leadingMatch) return leadingMatch[1];
  return "";
}

function getSubGroupDigit(subgroupStr) {
  if (!subgroupStr) return "";
  const str = String(subgroupStr).trim().toLowerCase();
  const found = SUBGROUP_OPTIONS.find(
    (s) =>
      s.name.toLowerCase() === str ||
      s.label.toLowerCase() === str ||
      str.includes(s.name.toLowerCase())
  );
  if (found) return String(found.no);
  const leadingMatch = str.match(/^(\d+)/);
  if (leadingMatch) return leadingMatch[1];
  return "";
}

function getSubSubGroupDigit(subsubgroupStr) {
  if (!subsubgroupStr) return "";
  const str = String(subsubgroupStr).trim().toLowerCase();
  const found = SUBSUBGROUP_OPTIONS.find(
    (r) =>
      r.name.toLowerCase() === str ||
      r.label.toLowerCase() === str ||
      str.includes(r.name.toLowerCase())
  );
  if (found) return String(found.no);
  const leadingMatch = str.match(/^(\d+)/);
  if (leadingMatch) return leadingMatch[1];
  return "";
}

// Aliases
const getProductDigit = getGroupDigit;
const getSegmentDigit = getSubGroupDigit;
const getRegionDigit = getSubSubGroupDigit;

function generatePartNumberPrefix(group, subgroup, subsubgroup) {
  const p = getGroupDigit(group);
  const s = getSubGroupDigit(subgroup);
  const r = getSubSubGroupDigit(subsubgroup);
  if (!p && !s && !r) return "";
  return `${p || "0"}${s || "0"}${r || "0"}`;
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


const STORAGE_KEY = "sms_engineering_item_master_v3";

const ITEM_MASTER_FORM_PAGE_1_COLUMNS = [
  { key: "select", width: 36, min: 32 },
  { key: "photo", width: 80 },
  { key: "new_code_sms_final", width: 180 },
  { key: "old_code", width: 96 },
  { key: "description_amp_size", width: 200 },
  { key: "group", width: 80 },
  { key: "sub_group", width: 103 },
  { key: "sub_subgroup", width: 124 },
  { key: "dimensions_id_od_h", width: 200 },
  { key: "material", width: 96 },
  { key: "price", width: 80 },
];

export function ItemMasterFormPage({
  dark = false,
  onBackToHome,
  onOpenSidebar,
  sidebarOpen = false,
  onNavigate
}) {
  const itemMasterFormPage1Resize = useResizableColumns("item-master-form-page-1", ITEM_MASTER_FORM_PAGE_1_COLUMNS);
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

  // Master dataset stored in state directly from PostgreSQL database (no localStorage)
  const [savedItems, setSavedItems] = useState([]);

  // Uniqueness check for item description (case-insensitive)
  const isDuplicateDescription = useMemo(() => {
    const desc = (formData?.description_size || "").trim().toLowerCase();
    if (!desc) return false;
    return (savedItems || []).some((it) => {
      if (editingId !== null && it.id === editingId) return false;
      const itDesc = (it.description_size || it.item_name || it.item_description || "").trim().toLowerCase();
      return itDesc === desc;
    });
  }, [formData?.description_size, savedItems, editingId]);


  // Fetch all FG items directly from backend PostgreSQL item_master table
  const fetchDbItems = () => {
    fetch("http://localhost:4000/api/inventory/items?type=FG")
      .then((res) => (res.ok ? res.json() : null))
      .then((dbItems) => {
        if (Array.isArray(dbItems)) {
          const mapped = dbItems.map((it) => {
            const code = it.sms_new_part_no || it.item_code || "";
            return {
              ...it,
              id: it.id,
              sms_new_part_no: code,
              sms_old_part_no: it.old_code || "",
              old_code: it.old_code || "",
              description_size: it.description_size || it.item_name || "",
              item_name: it.description_size || it.item_name || "",
              product_group: it.subgroup || it.group_name || "FG",
              group: it.group_name || "FG",
              group_name: it.group_name || "FG",
              subgroup: it.subgroup || "",
              product: it.subgroup || "",
              segment: it.segment || "",
              region: it.region || "",
              sub_subgroup: it.region || "",
              material: it.material || "",
              color: it.color || "",
              inner_diameter: it.inner_diameter || "",
              outer_diameter: it.outer_diameter || "",
              height: it.width || it.height || "",
              width: it.width || it.height || "",
              thickness: it.thickness || "",
              price: it.price || 0,
              purchased_uom: it.purchased_uom || it.uom || "PCS",
              consumption_uom: it.consumption_uom || it.purchased_uom || it.uom || "PCS",
              image: it.image || null,
              drawing_image: it.drawing_image || null,
              safety_lead_time: it.safety_lead_time ?? "",
              procurement_lead_time: it.procurement_lead_time ?? "",
              total_lead_time: it.total_lead_time ?? 0,
              main_fg_code: it.main_fg_code || "",
              remark: it.main_fg_code || "",
              oem: it.oem || ""
            };
          });
          setSavedItems(mapped);
        }
      })
      .catch((err) => console.warn("Could not fetch DB FG items:", err));
  };

  useEffect(() => {
    fetchDbItems();
  }, []);

  const [toastMessage, setToastMessage] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  const fileInputRef = useRef(null);
  const drawingFileInputRef = useRef(null);

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
  const fieldInputStyle = {
    width: "100%",
    height: 28,
    padding: "2px 8px",
    borderRadius: 6,
    border: `1px solid ${borderCol}`,
    background: inputBg,
    color: textPrimary,
    fontSize: 11
  };

  // Master lists come only from PostgreSQL, so an entry deleted in its master never shows here
  const [procurementList, setProcurementList] = useState([]);
  const [processList, setProcessList] = useState([]);
  const [hsnList, setHsnList] = useState([]);

  useEffect(() => {
    fetch("http://localhost:4000/api/inventory/procurement-master")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setProcurementList(Array.from(new Set(data.map((d) => d.procurementType || d.procurementName).filter(Boolean))));
        }
      })
      .catch((err) => console.warn("Could not fetch procurement master:", err));

    fetch("http://localhost:4000/api/inventory/process-master")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setProcessList(data.map((p) => ({ code: p.processCode, label: `${p.processCode} : ${p.processDescription || ""}` })));
        }
      })
      .catch((err) => console.warn("Could not fetch process master:", err));

    fetch("http://localhost:4000/api/purchase/hsn-master")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setHsnList(data.map((h) => ({ code: h.hsnSacCode || h.hsnCode, desc: h.description || "" })).filter((h) => Boolean(h.code)));
        }
      })
      .catch((err) => console.warn("Could not fetch HSN master:", err));
  }, []);

  // Open "New Item" Modal with unique auto-generated code
  const handleOpenNewModal = () => {
    setEditingId(null);
    setActiveTab("tab1");
    const sfx = getNextIncrementalSuffix(savedItems);
    setFormData({
      ...INITIAL_ITEM_FORM,
      main_group_code: "FG",
      group_code: "",
      sms_new_part_no: `FG-${sfx}`
    });
    setIsModalOpen(true);
  };

  // Open "Edit Item" Modal
  const handleOpenEditModal = (item) => {
    setEditingId(item.id);
    setActiveTab("tab1");
    const code = item.sms_new_part_no || item.item_code || "";
    setFormData({
      ...INITIAL_ITEM_FORM,
      ...item,
      sms_new_part_no: code,
      old_code: item.old_code || item.sms_old_part_no || "",
      description_size: item.description_size || item.item_name || item.item_description || "",
      purchased_uom: item.purchased_uom || item.uom || "",
      consumption_uom: item.consumption_uom || item.purchased_uom || "",
      price: item.price || item.rate || "",
      rate: item.rate || item.price || "",
      group: item.group || item.product || item.product_group || "",
      subgroup: item.subgroup || item.segment || "",
      sub_subgroup: item.sub_subgroup || item.region || "",
      product: item.product || item.group || item.product_group || "",
      segment: item.segment || item.subgroup || "",
      region: item.region || item.sub_subgroup || ""
    });
    if (detailItem) setDetailItem(null);
    setIsModalOpen(true);
  };

  // Request Delete confirmation
  const handleRequestDelete = (item) => {
    setDeleteTarget(item);
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const deletedPartNo = target.sms_new_part_no || "Item";
    setDeleteTarget(null);
    let message;
    try {
      const res = await fetch(`http://localhost:4000/api/inventory/items/${target.id}`, { method: "DELETE" });
      if (res.ok) {
        if (detailItem?.id === target.id) setDetailItem(null);
        window.dispatchEvent(new CustomEvent("SMS_ITEM_MASTER_UPDATED"));
        message = `Item "${deletedPartNo}" deleted.`;
      } else {
        const err = await res.json().catch(() => ({}));
        message = err.message || `Item "${deletedPartNo}" could not be deleted (HTTP ${res.status}).`;
      }
    } catch (e) {
      message = `Item "${deletedPartNo}" was not deleted: the server could not be reached.`;
    }
    fetchDbItems();
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Keep group, subgroup, sub_subgroup synced with product, segment, region
      if (field === "group" || field === "product") {
        updated.group = value;
        updated.product = value;
        updated.group_name = value;
      }
      if (field === "subgroup" || field === "segment") {
        updated.subgroup = value;
        updated.segment = value;
      }
      if (field === "sub_subgroup" || field === "region") {
        updated.sub_subgroup = value;
        updated.region = value;
      }

      // Sync remark and main_fg_code
      if (field === "remark" || field === "main_fg_code") {
        updated.remark = value;
        updated.main_fg_code = value;
      }

      // Sanitize numeric dimension fields (ID, OD, Height, Thickness) - accept only numbers & decimals
      if (["inner_diameter", "outer_diameter", "height", "thickness"].includes(field)) {
        const clean = String(value).replace(/[^0-9.]/g, "");
        const parts = clean.split(".");
        const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : clean;
        updated[field] = sanitized;
      }

      // Auto-generate part number when group, subgroup, or sub_subgroup changes (during item creation)
      if (
        editingId === null &&
        (field === "group" ||
          field === "product" ||
          field === "subgroup" ||
          field === "segment" ||
          field === "sub_subgroup" ||
          field === "region")
      ) {
        const grp = updated.group || updated.product;
        const sub = updated.subgroup || updated.segment;
        const subsub = updated.sub_subgroup || updated.region;
        const p = getGroupDigit(grp);
        const s = getSubGroupDigit(sub);
        const r = getSubSubGroupDigit(subsub);
        const newPrefix = (p || s || r) ? `${p || "0"}${s || "0"}${r || "0"}` : "";

        let currentSuffix = "";
        const parts = String(prev.sms_new_part_no || "").split("-");
        const lastPart = parts[parts.length - 1];
        if (lastPart && /^\d+$/.test(lastPart)) {
          currentSuffix = lastPart;
        } else {
          currentSuffix = getNextIncrementalSuffix(savedItems);
        }

        updated.group_code = newPrefix;
        updated.sms_new_part_no = newPrefix ? `FG-${newPrefix}-${currentSuffix}` : `FG-${currentSuffix}`;
      }

      return updated;
    });
  };

  // Image Upload handler supporting JPG, JPEG, PNG
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload an image file (JPG, PNG, WEBP).");
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
    setFormData((prev) => ({ ...prev, image: null, file_name: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrawingImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload an image file (JPG, PNG, WEBP).");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({ ...prev, drawing_image: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveDrawingImage = () => {
    setFormData((prev) => ({ ...prev, drawing_image: null }));
    if (drawingFileInputRef.current) {
      drawingFileInputRef.current.value = "";
    }
  };

  // Save Item (handles both Create and Update)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.sms_new_part_no.trim()) {
      alert("Please enter the Item Code (SMS Part No.) - Required");
      return;
    }

    const desc = (formData.description_size || "").trim().toLowerCase();
    if (!desc) {
      alert("Please enter the Item Description - Required");
      return;
    }

    if (editingId === null && !formData.hsn_code) {
      alert("Please select the HSN / SAC Code - Required");
      return;
    }

    // Uniqueness validation for Item Description (case-insensitive)
    const duplicate = savedItems.find((it) => {
      if (editingId !== null && it.id === editingId) return false;
      const itDesc = (it.description_size || it.item_name || it.item_description || "").trim().toLowerCase();
      return itDesc === desc;
    });

    if (duplicate) {
      alert(`Item Description "${formData.description_size.trim()}" already exists in record ${duplicate.sms_new_part_no}. Item description must be unique.`);
      return;
    }

    const payload = {
      item_code: formData.sms_new_part_no.trim(),
      sms_new_part_no: formData.sms_new_part_no.trim(),
      old_code: formData.old_code || formData.sms_old_part_no || "",
      description_size: formData.description_size || "",
      item_description: formData.description_size || "",
      group_name: "FG",
      category: "FG",
      item_type: "FG",
      subgroup: formData.product || "FG",
      uom: formData.purchased_uom || "PCS",
      purchased_uom: formData.purchased_uom || "PCS",
      consumption_uom: formData.consumption_uom || formData.purchased_uom || "PCS",
      price: formData.price || formData.rate || 0,
      material: formData.material || "",
      color: formData.color || "",
      segment: formData.segment || "",
      region: formData.region || "",
      style: formData.style || "",
      procurement_type: formData.procurement_type || "",
      process_type: formData.process_type || "",
      item_class: formData.item_class || "",
      hsn_code: formData.hsn_code || "",
      mrp: formData.mrp || "",
      drawing_no: formData.drawing_no || "",
      drawing_image: formData.drawing_image || null,
      safety_lead_time: formData.safety_lead_time || "",
      procurement_lead_time: formData.procurement_lead_time || "",
      total_lead_time: (Number(formData.safety_lead_time) || 0) + (Number(formData.procurement_lead_time) || 0),
      remark: formData.remark || formData.main_fg_code || "",
      main_fg_code: formData.remark || formData.main_fg_code || "",
      inner_diameter: formData.inner_diameter || "",
      outer_diameter: formData.outer_diameter || "",
      height: formData.height || "",
      thickness: formData.thickness || "",
      gross_wt: formData.gross_wt || "",
      net_wt: formData.net_wt || "",
      opening_balance: formData.opening_balance || "",
      min_stock_lvl: formData.min_stock_lvl || "",
      max_stock_lvl: formData.max_stock_lvl || "",
      reorder_stock_lvl: formData.reorder_stock_lvl || "",
      rej_tolerance: formData.rej_tolerance || "",
      image: formData.image || null,
      id: editingId || null
    };

    // The list only changes once the server has saved the item; a refused save keeps the form open with the reason.
    let res;
    try {
      res = await fetch("http://localhost:4000/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      alert("The item was not saved: the server could not be reached.");
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || `The item was not saved (HTTP ${res.status}).`);
      return;
    }
    const saved = await res.json().catch(() => null);
    window.dispatchEvent(new CustomEvent("SMS_ITEM_MASTER_UPDATED", { detail: saved || payload }));
    fetchDbItems();
    setIsModalOpen(false);
    setEditingId(null);
    setToastMessage(`Item "${formData.sms_new_part_no}" ${editingId ? "updated" : "created"}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  const totalRecords = filteredItems.length;

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
      Group: item.product,
      "sub-Group": item.segment,
      "Sub-SubGroup": item.region,
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
            <span>Item Master</span>
            <span style={{ margin: "0 4px" }}>›</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>FG</span>
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
              placeholder="Search by Part No, Old Code, Description, Group, OEM..."
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
          <table className="resizable-table"
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 12,
              textAlign: "left",
              ...itemMasterFormPage1Resize.tableStyle,
            }}
          >
            <ResizableColGroup columns={ITEM_MASTER_FORM_PAGE_1_COLUMNS} widths={itemMasterFormPage1Resize.widths} />
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
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Photo<ColumnResizeHandle colKey="photo" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>New Code (SMS FINAL)<ColumnResizeHandle colKey="new_code_sms_final" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Old Code<ColumnResizeHandle colKey="old_code" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 200, whiteSpace: "nowrap" }}>Description &amp; Size<ColumnResizeHandle colKey="description_amp_size" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Group<ColumnResizeHandle colKey="group" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Sub-Group<ColumnResizeHandle colKey="sub_group" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Sub-SubGroup<ColumnResizeHandle colKey="sub_subgroup" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Dimensions (ID × OD × H)<ColumnResizeHandle colKey="dimensions_id_od_h" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Material<ColumnResizeHandle colKey="material" resize={itemMasterFormPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Price<ColumnResizeHandle colKey="price" resize={itemMasterFormPage1Resize} /></th>
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
                filteredItems.map((item) => {
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
              <strong>{totalRecords.toLocaleString()}</strong> items
            </span>
          </div>
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
        </div>
        <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>
          Compression Moulding Line &middot; Active in Production Catalog
        </div>
      </div>

      {/* ========================================================================= */}
      {/* "NEW ITEM MASTER" CONCISE SPREADSHEET MODAL (SINGLE-SCREEN VIEW) */}
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
            padding: "12px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1140,
              maxHeight: "96vh",
              background: cardBg,
              border: `1px solid ${borderCol}`,
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.55)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "8px 16px",
                borderBottom: `1px solid ${borderCol}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: dark ? "rgba(30, 41, 59, 0.95)" : "#ffffff"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  {editingId ? "Edit Item" : "New Item Creation"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                  Item Master &bull; Finished Goods (FG)
                </span>
                <span style={{ fontSize: 11, color: textSecondary, fontWeight: 500 }}>
                  ({formData.sms_new_part_no || "New Record"})
                </span>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  color: textSecondary,
                  cursor: "pointer",
                  padding: "2px 6px",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* TAB SELECTOR HEADER */}
            <div
              style={{
                display: "flex",
                borderBottom: `1px solid ${borderCol}`,
                background: dark ? "rgba(15, 23, 42, 0.6)" : "#f8fafc"
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("tab1")}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  border: "none",
                  borderBottom: activeTab === "tab1" ? "3px solid #c51f28" : "3px solid transparent",
                  background: activeTab === "tab1" ? cardBg : "transparent",
                  color: activeTab === "tab1" ? "#c51f28" : textSecondary,
                  fontWeight: activeTab === "tab1" ? 800 : 600,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                1. Primary Specifications
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tab2")}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  border: "none",
                  borderBottom: activeTab === "tab2" ? "3px solid #c51f28" : "3px solid transparent",
                  background: activeTab === "tab2" ? cardBg : "transparent",
                  color: activeTab === "tab2" ? "#c51f28" : textSecondary,
                  fontWeight: activeTab === "tab2" ? 800 : 600,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                2. Extended Attributes (OEM, References, Applications &amp; Outsource)
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSaveItem}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: activeTab === "tab1" ? "10px 16px" : "18px 24px",
                display: "flex",
                flexDirection: "column",
                gap: activeTab === "tab1" ? 6 : 16
              }}
            >
              {/* ========================================================================= */}
              {/* TAB 1: CONCISE SPREADSHEET VIEW (10 COMPACT ROWS) */}
              {/* ========================================================================= */}
              {activeTab === "tab1" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* ROW 1: Group Classification (Clean, No Colored Background) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12,
                      background: "transparent",
                      border: "none",
                      borderRadius: 6,
                      padding: "2px 0"
                    }}
                  >
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Group *
                      </label>
                      <select
                        value={formData.group || formData.product}
                        onChange={(e) => handleInputChange("group", e.target.value)}
                        style={{
                          width: "100%",
                          height: 28,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        <option value="">-- Select Group --</option>
                        {GROUP_OPTIONS.map((opt, idx) => (
                          <option key={idx} value={opt.name}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Sub-Group *
                      </label>
                      <select
                        value={formData.subgroup || formData.segment}
                        onChange={(e) => handleInputChange("subgroup", e.target.value)}
                        style={{
                          width: "100%",
                          height: 28,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        <option value="">-- Select Sub-Group --</option>
                        {SUBGROUP_OPTIONS.map((opt, idx) => (
                          <option key={idx} value={opt.name}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Sub-SubGroup *
                      </label>
                      <select
                        value={formData.sub_subgroup || formData.region}
                        onChange={(e) => handleInputChange("sub_subgroup", e.target.value)}
                        style={{
                          width: "100%",
                          height: 28,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        <option value="">-- Select Sub-SubGroup --</option>
                        {SUBSUBGROUP_OPTIONS.map((opt, idx) => (
                          <option key={idx} value={opt.name}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ROW 2: Code Hierarchy (Clean, No Colored Background) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 12,
                      background: "transparent",
                      border: "none",
                      borderRadius: 6,
                      padding: "2px 0"
                    }}
                  >
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Main Group Code
                      </label>
                      <div
                        style={{
                          height: 26,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 8px",
                          background: inputBg,
                          border: `1px solid ${borderCol}`,
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: 11,
                          color: textPrimary
                        }}
                      >
                        FG
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Group Code
                      </label>
                      <div
                        style={{
                          height: 26,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 8px",
                          background: inputBg,
                          border: `1px solid ${borderCol}`,
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: 11,
                          color: textPrimary
                        }}
                      >
                        {getGroupDigit(formData.group || formData.product) || "-"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Sub Group Code
                      </label>
                      <div
                        style={{
                          height: 26,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 8px",
                          background: inputBg,
                          border: `1px solid ${borderCol}`,
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: 11,
                          color: textPrimary
                        }}
                      >
                        {getSubGroupDigit(formData.subgroup || formData.segment) || "-"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Sub Sub Group Code
                      </label>
                      <div
                        style={{
                          height: 26,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 8px",
                          background: inputBg,
                          border: `1px solid ${borderCol}`,
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: 11,
                          color: textPrimary
                        }}
                      >
                        {getSubSubGroupDigit(formData.sub_subgroup || formData.region) || "-"}
                      </div>
                    </div>
                  </div>

                  {/* ROW 3: ITEM Code, Old Code, Item Description */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        ITEM Code *
                      </label>
                      <input
                        type="text"
                        value={formData.sms_new_part_no}
                        readOnly
                        style={{
                          width: "100%",
                          height: 28,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: dark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                          color: textPrimary,
                          fontWeight: 800,
                          fontSize: 11,
                          cursor: "not-allowed"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Old Code
                      </label>
                      <input
                        type="text"
                        value={formData.old_code}
                        onChange={(e) => handleInputChange("old_code", e.target.value)}
                        placeholder="e.g. 12015"
                        style={fieldInputStyle}
                      />
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase" }}>
                          Item Description *
                        </label>
                        {isDuplicateDescription && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444" }}>
                            &bull; Already exists (must be unique)
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formData.description_size}
                        onChange={(e) => handleInputChange("description_size", e.target.value)}
                        placeholder="e.g. OIL SEAL 35*50*8 NBR"
                        style={{
                          ...fieldInputStyle,
                          borderColor: isDuplicateDescription ? "#ef4444" : borderCol,
                          background: isDuplicateDescription ? (dark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2") : inputBg
                        }}
                      />
                    </div>
                  </div>

                  {/* ROW 4: Dimensions (ID, OD, Height, Thickness) - Numeric & Decimal only */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        ID (in mm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.inner_diameter}
                        onChange={(e) => handleInputChange("inner_diameter", e.target.value)}
                        placeholder="35"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        OD (in mm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.outer_diameter}
                        onChange={(e) => handleInputChange("outer_diameter", e.target.value)}
                        placeholder="50"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Height (in mm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.height}
                        onChange={(e) => handleInputChange("height", e.target.value)}
                        placeholder="8"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Thickness (in mm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.thickness}
                        onChange={(e) => handleInputChange("thickness", e.target.value)}
                        placeholder="0"
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>

                  {/* ROW 5: COLOR, MTRL, STYLE */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Color
                      </label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => handleInputChange("color", e.target.value)}
                        placeholder="Black"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Mtrl
                      </label>
                      <input
                        type="text"
                        value={formData.material}
                        onChange={(e) => handleInputChange("material", e.target.value)}
                        placeholder="NBR"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Style
                      </label>
                      <select
                        value={formData.style}
                        onChange={(e) => handleInputChange("style", e.target.value)}
                        style={fieldInputStyle}
                      >
                        <option value="">-- Select Style --</option>
                        <option value="Rubber">1. Rubber</option>
                        <option value="Metal">2. Metal</option>
                        <option value="Other">3. Other</option>
                      </select>
                    </div>
                  </div>

                  {/* ROW 5B: DRAWING NO., DRAWING IMAGE, IMAGE */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Drawing No.
                      </label>
                      <input
                        type="text"
                        value={formData.drawing_no}
                        onChange={(e) => handleInputChange("drawing_no", e.target.value)}
                        placeholder="DWG-001"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Drawing Image
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, height: 28 }}>
                        <input
                          ref={drawingFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDrawingImageUpload}
                          style={{ display: "none" }}
                          id="drawing-file-upload-input"
                        />
                        <label
                          htmlFor="drawing-file-upload-input"
                          style={{
                            cursor: "pointer",
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                            border: `1px solid ${borderCol}`,
                            fontSize: 11,
                            fontWeight: 700,
                            color: textPrimary,
                            whiteSpace: "nowrap"
                          }}
                        >
                          &#128247; {formData.drawing_image ? "Change" : "Browse File"}
                        </label>
                        {formData.drawing_image && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <img
                              src={formData.drawing_image}
                              alt="drawing thumb"
                              style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover", border: "1px solid #10b981" }}
                            />
                            <button
                              type="button"
                              onClick={handleRemoveDrawingImage}
                              title="Remove drawing image"
                              style={{
                                background: "#ef4444",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                                width: 16,
                                height: 16,
                                fontSize: 10,
                                cursor: "pointer",
                                lineHeight: 1
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Image
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, height: 28 }}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: "none" }}
                          id="item-file-upload-input"
                        />
                        <label
                          htmlFor="item-file-upload-input"
                          style={{
                            cursor: "pointer",
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                            border: `1px solid ${borderCol}`,
                            fontSize: 11,
                            fontWeight: 700,
                            color: textPrimary,
                            whiteSpace: "nowrap"
                          }}
                        >
                          &#128247; {formData.image ? "Change" : "Browse File"}
                        </label>
                        {formData.image && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <img
                              src={formData.image}
                              alt="thumb"
                              style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover", border: "1px solid #10b981" }}
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              title="Remove image"
                              style={{
                                background: "#ef4444",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                                width: 16,
                                height: 16,
                                fontSize: 10,
                                cursor: "pointer",
                                lineHeight: 1
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ROW 5C: SAFETY, PROCUREMENT & TOTAL LEAD TIME */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Safety Lead Time
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.safety_lead_time}
                        onChange={(e) => handleInputChange("safety_lead_time", e.target.value)}
                        placeholder="0"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Procurement Lead Time
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.procurement_lead_time}
                        onChange={(e) => handleInputChange("procurement_lead_time", e.target.value)}
                        placeholder="0"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Total Lead Time
                      </label>
                      <input
                        type="number"
                        readOnly
                        value={(Number(formData.safety_lead_time) || 0) + (Number(formData.procurement_lead_time) || 0)}
                        style={{ ...fieldInputStyle, background: dark ? "#0f172a" : "#f1f5f9", cursor: "not-allowed", fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  {/* ROW 6: PURCHASE UOM, CONSUMED UOM, OPENING BALANCE */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Purchase UOM
                      </label>
                      <select
                        value={formData.purchased_uom}
                        onChange={(e) => handleInputChange("purchased_uom", e.target.value)}
                        style={fieldInputStyle}
                      >
                        <option value="">-- Select UOM --</option>
                        <option value="PCS">PCS</option>
                        <option value="NOS">NOS</option>
                        <option value="SET">SET</option>
                        <option value="MTR">MTR</option>
                        <option value="KGS">KGS</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Consumed UOM
                      </label>
                      <select
                        value={formData.consumption_uom}
                        onChange={(e) => handleInputChange("consumption_uom", e.target.value)}
                        style={fieldInputStyle}
                      >
                        <option value="">-- Select UOM --</option>
                        <option value="PCS">PCS</option>
                        <option value="NOS">NOS</option>
                        <option value="SET">SET</option>
                        <option value="MTR">MTR</option>
                        <option value="KGS">KGS</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Opening Balance
                      </label>
                      <input
                        type="number"
                        value={formData.opening_balance}
                        onChange={(e) => handleInputChange("opening_balance", e.target.value)}
                        placeholder="0"
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>

                  {/* ROW 7: GROSS WT, NET WT, CLASS, Rej % Tolerance */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Gross Wt (in gram)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.gross_wt}
                        onChange={(e) => handleInputChange("gross_wt", e.target.value)}
                        placeholder="0.00"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Net Wt (in gram)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.net_wt}
                        onChange={(e) => handleInputChange("net_wt", e.target.value)}
                        placeholder="0.00"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Class
                      </label>
                      <select
                        value={formData.item_class}
                        onChange={(e) => handleInputChange("item_class", e.target.value)}
                        style={fieldInputStyle}
                      >
                        <option value="">-- Select Class --</option>
                        <option value="High">1. High</option>
                        <option value="Medium">2. Medium</option>
                        <option value="Low">3. Low</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Rej % Tolerance
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.rej_tolerance}
                        onChange={(e) => handleInputChange("rej_tolerance", e.target.value)}
                        placeholder="0%"
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>

                  {/* ROW 8: PROCUREMENT TYPE, PROCESS TYPE (span 2), MIN STOCK LVL */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Procurement Type
                      </label>
                      <select
                        value={formData.procurement_type}
                        onChange={(e) => handleInputChange("procurement_type", e.target.value)}
                        style={fieldInputStyle}
                      >
                        <option value="">-- Select Procurement --</option>
                        {procurementList.map((pt, idx) => (
                          <option key={idx} value={pt}>
                            {pt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Process Type
                      </label>
                      <select
                        value={formData.process_type}
                        onChange={(e) => handleInputChange("process_type", e.target.value)}
                        style={fieldInputStyle}
                      >
                        <option value="">-- Select Process --</option>
                        {processList.map((proc, idx) => (
                          <option key={idx} value={proc.code || proc.label}>
                            {proc.label || proc.desc || proc.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Min Stock Lvl
                      </label>
                      <input
                        type="number"
                        value={formData.min_stock_lvl}
                        onChange={(e) => handleInputChange("min_stock_lvl", e.target.value)}
                        placeholder="100"
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>

                  {/* ROW 9: MAX STOCK LVL, REORDER STOCK LVL, HSN / SAC CODE */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Max Stock Lvl
                      </label>
                      <input
                        type="number"
                        value={formData.max_stock_lvl}
                        onChange={(e) => handleInputChange("max_stock_lvl", e.target.value)}
                        placeholder="1000"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Reorder Stock Lvl
                      </label>
                      <input
                        type="number"
                        value={formData.reorder_stock_lvl}
                        onChange={(e) => handleInputChange("reorder_stock_lvl", e.target.value)}
                        placeholder="200"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        HSN / SAC Code{editingId === null && " *"}
                      </label>
                      <select
                        value={formData.hsn_code}
                        onChange={(e) => handleInputChange("hsn_code", e.target.value)}
                        style={fieldInputStyle}
                      >
                        <option value="">-- Select HSN --</option>
                        {hsnList.map((h, idx) => (
                          <option key={idx} value={h.code}>
                            {h.code} {h.desc ? `- ${h.desc.substring(0, 24)}...` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ROW 10: MRP, RATE, and Actions */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px", alignItems: "flex-end" }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        MRP
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.mrp}
                        onChange={(e) => handleInputChange("mrp", e.target.value)}
                        placeholder="0.00"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Rate
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.price}
                        onChange={(e) => {
                          handleInputChange("price", e.target.value);
                          handleInputChange("rate", e.target.value);
                        }}
                        placeholder="0.00"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        style={{
                          background: "transparent",
                          border: `1px solid ${borderCol}`,
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: textSecondary,
                          cursor: "pointer"
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...INITIAL_ITEM_FORM,
                          sms_new_part_no: prev.sms_new_part_no,
                          main_group_code: "FG"
                        }))}
                        style={{
                          background: "transparent",
                          border: `1px solid ${borderCol}`,
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: textSecondary,
                          cursor: "pointer"
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("tab2")}
                        style={{
                          background: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                          border: `1px solid ${borderCol}`,
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: textPrimary,
                          cursor: "pointer"
                        }}
                      >
                        Next: Extended &rarr;
                      </button>
                      <button
                        type="submit"
                        style={{
                          background: editingId
                            ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                            : "linear-gradient(135deg, #c51f28 0%, #991b1b 100%)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 18px",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: editingId
                            ? "0 2px 8px rgba(5, 150, 105, 0.35)"
                            : "0 2px 8px rgba(197, 31, 40, 0.35)"
                        }}
                      >
                        &#10003; {editingId ? "Update Item" : "Save Item"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: EXTENDED ATTRIBUTES (UNIQUE FIELDS NOT IN TAB 1) */}
              {activeTab === "tab2" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Category, Domestic/Export & Application */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Market &amp; Application
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                      {/* Category */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          Category
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Oil Seal, O-Ring, Gasket"
                          value={formData.category}
                          onChange={(e) => handleInputChange("category", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>

                      {/* Domestic / Exports */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          Domestic / Exports
                        </label>
                        <select
                          value={formData.domestic_exports}
                          onChange={(e) => handleInputChange("domestic_exports", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        >
                          <option value="">-- Select --</option>
                          <option value="Domestic">Domestic</option>
                          <option value="Export">Export</option>
                          <option value="Both">Both (Domestic &amp; Export)</option>
                        </select>
                      </div>

                      {/* Application */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          Application
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Engine Crankshaft, Wheel Hub, Pinion"
                          value={formData.application}
                          onChange={(e) => handleInputChange("application", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* OEM, Corteco, Ref No, Cross Reference */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      References &amp; Cross Catalog
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                      {/* REF. NO. */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          REF. NO.
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Drawing / Catalog Ref"
                          value={formData.ref_no}
                          onChange={(e) => handleInputChange("ref_no", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>

                      {/* OEM */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          OEM Reference
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tata, Mahindra, Ashok Leyland"
                          value={formData.oem}
                          onChange={(e) => handleInputChange("oem", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>

                      {/* CORTECO NO */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          CORTECO NO
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 12011145B"
                          value={formData.corteco_no}
                          onChange={(e) => handleInputChange("corteco_no", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>

                      {/* CROSS Reference */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          CROSS Reference
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SKF, Parker, National, CR"
                          value={formData.cross_reference}
                          onChange={(e) => handleInputChange("cross_reference", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>

                      {/* Remark */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          Remark
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Special remarks or notes"
                          value={formData.remark || formData.main_fg_code || ""}
                          onChange={(e) => {
                            handleInputChange("remark", e.target.value);
                            handleInputChange("main_fg_code", e.target.value);
                          }}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamics & Technical Details */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Dynamics &amp; Technical Details
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                      {/* Fitting Position */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          Fitting Position
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Front Axle, Rear Hub, Crankcase"
                          value={formData.fitting_position}
                          onChange={(e) => handleInputChange("fitting_position", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>

                      {/* Swirl Type */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          Swirl Type
                        </label>
                        <select
                          value={formData.swirl_type}
                          onChange={(e) => handleInputChange("swirl_type", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        >
                          <option value="">-- Select Swirl --</option>
                          <option value="None">None (Plain Lip)</option>
                          <option value="Right Hand (RH)">Right Hand (RH)</option>
                          <option value="Left Hand (LH)">Left Hand (LH)</option>
                          <option value="Bi-Directional">Bi-Directional (Dual)</option>
                        </select>
                      </div>

                      {/* File Name */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          File Name (CAD / Drawing)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SMS-DWG-945-05745.dwg"
                          value={formData.file_name}
                          onChange={(e) => handleInputChange("file_name", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Outsourcing & Sourcing Workflow */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                      Outsourcing &amp; Manufacturing
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                      {/* FG Outsource */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          FG Outsource
                        </label>
                        <select
                          value={formData.fg_outsource}
                          onChange={(e) => handleInputChange("fg_outsource", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        >
                          <option value="">-- Select --</option>
                          <option value="IH">IH (In-House)</option>
                          <option value="RING OS">RING OS (Ring Outsource)</option>
                          <option value="MOULDED OS">MOULDED OS (Moulded Outsource)</option>
                          <option value="FULL OS">FULL OS (Full Outsource)</option>
                        </select>
                      </div>

                      {/* SFG Outsource */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          SFG Outsource
                        </label>
                        <select
                          value={formData.sfg_outsource}
                          onChange={(e) => handleInputChange("sfg_outsource", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        >
                          <option value="">-- Select --</option>
                          <option value="IH">IH (In-House)</option>
                          <option value="RING OS">RING OS</option>
                          <option value="MOULDED OS">MOULDED OS</option>
                          <option value="JOBWORK">JOBWORK</option>
                        </select>
                      </div>

                      {/* Outsource Combo FG & SFG */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 4 }}>
                          Outsource Combo FG &amp; SFG
                        </label>
                        <select
                          value={formData.outsource_combo_fg_sfg}
                          onChange={(e) => handleInputChange("outsource_combo_fg_sfg", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, fontSize: 11 }}
                        >
                          <option value="">-- Select --</option>
                          <option value="IH">IH (In-House)</option>
                          <option value="RING OS">RING OS</option>
                          <option value="MOULDED OS">MOULDED OS</option>
                          <option value="COMBO OS">COMBO OS</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* TAB 2 ACTION BUTTONS */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: `1px solid ${borderCol}`
                    }}
                  >
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setActiveTab("tab1")}
                        style={{
                          background: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                          border: `1px solid ${borderCol}`,
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: textPrimary,
                          cursor: "pointer"
                        }}
                      >
                        &larr; Back to Primary Specs
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...INITIAL_ITEM_FORM,
                          sms_new_part_no: prev.sms_new_part_no,
                          main_group_code: "FG"
                        }))}
                        style={{
                          background: "transparent",
                          border: `1px solid ${borderCol}`,
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: textSecondary,
                          cursor: "pointer"
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        style={{
                          background: "transparent",
                          border: `1px solid ${borderCol}`,
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: textSecondary,
                          cursor: "pointer"
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <button
                      type="submit"
                      style={{
                        background: editingId
                          ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                          : "linear-gradient(135deg, #c51f28 0%, #991b1b 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 18px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: editingId
                          ? "0 2px 8px rgba(5, 150, 105, 0.35)"
                          : "0 2px 8px rgba(197, 31, 40, 0.35)"
                      }}
                    >
                      &#10003; {editingId ? "Update Item" : "Save Item"}
                    </button>
                  </div>
                </div>
              )}
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
                <div><strong>Group:</strong> {detailItem.group || detailItem.product || "-"}</div>
                <div><strong>Sub-Group:</strong> {detailItem.subgroup || detailItem.segment || "-"}</div>
                <div><strong>Sub-SubGroup:</strong> {detailItem.sub_subgroup || detailItem.region || "-"}</div>
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
