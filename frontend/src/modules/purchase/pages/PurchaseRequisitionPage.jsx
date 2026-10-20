import { formatDisplayDate, formatDisplayDateTime } from "../../../shared/utils/dateFormat";
import DateInput from "../../../shared/components/DateInput";
import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  CheckCircle2,
  XCircle,
  Printer,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  ShoppingCart,
  Building,
  User,
  Calendar,
  Layers,
  Tag,
  Store,
  History,
  Send,
  RotateCcw,
  Ban,
  Check,
  Package,
  Filter,
  RefreshCw,
  Download
} from "lucide-react";

// 1. Direct Import of REAL 1,582 Item Master records from Engineering
import { REAL_ITEM_MASTER_DATA } from "../../engineering/data/realItemMasterData";

// 2. Direct Import of REAL 14 Groups from Other Item Master
import { INITIAL_GROUPS_DATA } from "../../engineering/pages/OtherItemMasterPage";
import { PrClubbingTab } from "../components/PrClubbingTab";

// =============================================================================
// REAL MASTER DATASETS (Exact matches with Silver Muller Seals Master Tables)
// =============================================================================

// Real 18 Departments from Department Master (public.department_master)
export const REAL_DEPARTMENTS_LIST = [
  "Store",
  "Power Press Die Making",
  "Power Press Rubber Die Making",
  "Power Press Circle Cutting",
  "LASER",
  "CNC",
  "Moulding",
  "Finishing",
  "Tambling",
  "Sand",
  "Burning",
  "T/Room",
  "Packing",
  "FG STORE",
  "Dispatch",
  "Rejection Store",
  "Rework-Burning",
  "Gate"
];

// Real Categories / Groups from Category Master (14 Standard Groups)
export const REAL_CATEGORIES_LIST = [
  "Assets",
  "Bought-Out Parts 🛠",
  "Consumables 🧪",
  "FG",
  "IT & Communication 💻",
  "Maintenance, Repair & Operations ⚙️",
  "Office & Administration 🖇",
  "Packing Materials 📦",
  "Production",
  "Raw Material",
  "Safety & PPE 🧤",
  "Services 🔧",
  "SFG",
  "Uniforms & Linen 👕"
];

// Real Stores List from Store / Warehouse Master
export const REAL_STORES_LIST = [
  "Raw Material Store",
  "Moulding Store",
  "Bought-Out Stores",
  "Maintenance & MRO Store",
  "FG STORE",
  "Rejection Store",
  "General Store"
];

export const REQUIREMENT_TYPES_LIST = [
  "Production Requirement",
  "Maintenance & Repair",
  "General Plant Operations",
  "Stock Reorder Level Depletion",
  "New Project / Trial Run",
  "Other"
];

export const PRIORITY_LIST = ["Low", "Normal", "High", "Urgent"];

export const PROCUREMENT_METHODS_LIST = [
  "Competitive Quotation",
  "Direct Purchase",
  "Existing Contract",
  "Emergency Purchase"
];

export const PR_TYPES_LIST = [
  "Direct Material",
  "Indirect Material",
  "Capital Goods / Asset",
  "Service / Subcontract",
  "MRO / Consumables"
];

export const COST_CENTERS_LIST = [
  "Moulding Press 01",
  "Trimming Line A",
  "Assembly Cell 02",
  "Tool Room & Die Shop",
  "Maintenance & Utilities",
  "Quality Control Lab",
  "Warehouse & Logistics",
  "Administration"
];

// Initial realistic PRs covering full competitive quotation and direct purchase workflows
export const formatAuditDateTime = (val) => {
  if (!val) return null;
  return formatDisplayDateTime(val);
};

export const INITIAL_PR_DATA = [];

const PR_MAIN_COLUMNS = [
  { key: "checkbox", width: 36, min: 32 },
  { key: "sr", width: 60 },
  { key: "item", width: 240 },
  { key: "department", width: 150 },
  { key: "quantity", width: 95 },
  { key: "uom", width: 70 },
  { key: "requiredBy", width: 130 },
  { key: "priority", width: 90 },
  { key: "status", width: 110 },
  { key: "actions", width: 140 },
];

const PURCHASE_REQUISITION_PAGE_2_COLUMNS = [
  { key: "sr", width: 30 },
  { key: "item_selection", width: 260 },
  { key: "category", width: 130 },
  { key: "hsn_sac", width: 95 },
  { key: "drawing_spec", width: 100 },
  { key: "make_brand", width: 95 },
  { key: "req_qty", width: 75 },
  { key: "uom", width: 50 },
  { key: "est_rate", width: 85 },
  { key: "line_total", width: 95 },
  { key: "need_date", width: 95 },
  { key: "act", width: 35 },
];

const PURCHASE_REQUISITION_PAGE_3_COLUMNS = [
  { key: "sr", width: 30 },
  { key: "item_code", width: 103 },
  { key: "description_amp_size", width: 194 },
  { key: "category", width: 96 },
  { key: "hsn_sac", width: 103 },
  { key: "drawing_spec", width: 124 },
  { key: "make_brand", width: 110 },
  { key: "req_qty", width: 89 },
  { key: "ordered", width: 89 },
  { key: "balance", width: 89 },
  { key: "uom", width: 80 },
  { key: "est_rate", width: 96 },
  { key: "line_total", width: 110 },
  { key: "need_date", width: 103 },
];

const PURCHASE_REQUISITION_PAGE_4_COLUMNS = [
  { key: "quote", width: 89 },
  { key: "vendor_name", width: 117 },
  { key: "items", width: 80 },
  { key: "total_amount", width: 124 },
  { key: "status", width: 82 },
  { key: "action", width: 82 },
];

const PURCHASE_REQUISITION_PAGE_5_COLUMNS = [
  { key: "po", width: 80 },
  { key: "po_date", width: 89 },
  { key: "vendor", width: 82 },
  { key: "grand_total", width: 117 },
  { key: "status", width: 82 },
  { key: "action", width: 82 },
];

const PURCHASE_REQUISITION_PAGE_6_COLUMNS = [
  { key: "timestamp", width: 103 },
  { key: "user", width: 80 },
  { key: "action", width: 82 },
  { key: "status", width: 82 },
  { key: "remarks", width: 89 },
];

export function PurchaseRequisitionPage({
  dark = false,
  onBackToHome,
  onOpenSidebar,
  sidebarOpen,
  onNavigate
}) {
  const purchaseRequisitionPage6Resize = useResizableColumns("purchase-requisition-page-6", PURCHASE_REQUISITION_PAGE_6_COLUMNS);
  const purchaseRequisitionPage5Resize = useResizableColumns("purchase-requisition-page-5", PURCHASE_REQUISITION_PAGE_5_COLUMNS);
  const purchaseRequisitionPage4Resize = useResizableColumns("purchase-requisition-page-4", PURCHASE_REQUISITION_PAGE_4_COLUMNS);
  const purchaseRequisitionPage3Resize = useResizableColumns("purchase-requisition-page-3", PURCHASE_REQUISITION_PAGE_3_COLUMNS);
  const purchaseRequisitionPage2Resize = useResizableColumns("purchase-requisition-page-2", PURCHASE_REQUISITION_PAGE_2_COLUMNS);
  const prMainResize = useResizableColumns("purchase-requisition-list", PR_MAIN_COLUMNS);
  // Theme tokens matching ItemMasterFormPage.jsx
  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const textPrimary = dark ? "#f8fafc" : "#0f172a";
  const textSecondary = dark ? "#94a3b8" : "#64748b";
  const borderCol = dark ? "rgba(148, 163, 184, 0.14)" : "#e2e8f0";
  const rowHover = dark ? "rgba(255,255,255,0.02)" : "rgba(241,245,249,0.7)";

  // ===========================================================================
  // REAL MASTER DATA INTEGRATION (Item Master, Category Master & Dept Master)
  // ===========================================================================
  const [masterItems, setMasterItems] = useState([]);
  const [masterCategories, setMasterCategories] = useState(REAL_CATEGORIES_LIST);
  const [masterDepartments, setMasterDepartments] = useState(REAL_DEPARTMENTS_LIST);

  // Load Real Items (Both FG & Other from PostgreSQL database & LocalStorage), Categories, and Departments
  useEffect(() => {
    const loadAllItems = async () => {
      let combined = [];

      // 1. Fetch from PostgreSQL item_master table via backend API
      try {
        const res = await fetch("http://localhost:4000/api/inventory/items");
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData) && apiData.length > 0) {
            combined = apiData.map((it) => ({
              item_code: it.item_code || it.sms_new_part_no,
              item_name: it.item_name || it.description_size || it.item_code,
              category: it.category || "Raw Material",
              uom: it.uom || "PCS",
              current_stock: Number(it.current_stock || 0),
              reorder_level: Number(it.reorder_level || 50),
              est_rate: Number(it.price || it.est_rate || 0),
              hsn_code: it.hsn_code || it.hsnCode || "",
              item_type: it.item_type || (String(it.category).toUpperCase() === "FG" ? "FG" : "OTHER")
            }));
          }
        }
      } catch (err) {
        console.warn("Could not fetch items from backend API, using local storage fallback:", err);
      }

      // 2. Merge user-created Non-FG items from localStorage (NO PURGING!)
      try {
        const savedOther = localStorage.getItem("SMS_OTHER_ITEM_MASTER_DATA_REAL");
        if (savedOther) {
          const parsedOther = JSON.parse(savedOther);
          if (Array.isArray(parsedOther)) {
            parsedOther.forEach((it) => {
              if (it && it.item_code) {
                const existingIdx = combined.findIndex((c) => c.item_code === it.item_code);
                const itemObj = {
                  item_code: it.item_code,
                  item_name: it.item_name || it.description || it.item_code,
                  category: it.category || "Raw Material",
                  uom: it.uom || "PCS",
                  current_stock: Number(it.current_stock) || 0,
                  reorder_level: Number(it.min_stock || it.reorder_qty) || 10,
                  est_rate: Number(it.unit_price) || 0,
                  hsn_code: it.hsn_code || it.hsnCode || "",
                  item_type: "OTHER"
                };
                if (existingIdx !== -1) {
                  combined[existingIdx] = { ...combined[existingIdx], ...itemObj };
                } else {
                  // Prepend so user's newly created other items appear right at top
                  combined.unshift(itemObj);
                }
              }
            });
          }
        }
      } catch (e) {
        console.error("Error reading Other Item Master from localStorage:", e);
      }

      // 3. Fallback to bundled FG data if database was empty
      if (combined.length === 0 && Array.isArray(REAL_ITEM_MASTER_DATA)) {
        REAL_ITEM_MASTER_DATA.forEach((it) => {
          combined.push({
            item_code: it.sms_new_part_no || (it.old_code ? `FG-${it.old_code}` : `ITM-${it.id}`),
            item_name: it.description_size || it.product || "Oil Seal",
            category: it.group_name || "FG",
            uom: it.uom || "PCS",
            current_stock: 0,
            reorder_level: 50,
            est_rate: Number(it.price) || 0,
            item_type: "FG"
          });
        });
      }

      setMasterItems(combined);
    };

    loadAllItems();

    // 2. Real Categories from Group Master
    try {
      const savedGroups = localStorage.getItem("SMS_OTHER_ITEM_GROUPS_DATA_USER");
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed.map((g) => g.name || g.group_name).filter(Boolean);
          if (names.length > 0) {
            setMasterCategories(names);
          }
        }
      }
    } catch (e) {
      console.error("Error reading Category Master:", e);
    }

    // 3. Real Departments from Department Master backend API or fallback
    const fetchRealDepts = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/inventory/departments");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const depts = data.map((d) => d.departmentName || d.name).filter(Boolean);
            if (depts.length > 0) {
              setMasterDepartments(depts);
            }
          }
        }
      } catch (e) {
        // Fallback to real 18 departments already set
      }
    };
    fetchRealDepts();

    // Listen for real-time item creation events from Item Master screens
    const handleItemCreated = () => {
      loadAllItems();
    };
    window.addEventListener("SMS_ITEM_MASTER_UPDATED", handleItemCreated);
    return () => {
      window.removeEventListener("SMS_ITEM_MASTER_UPDATED", handleItemCreated);
    };
  }, []);

  // PR Dataset stored in state directly from PostgreSQL database (no localStorage)
  const [prList, setPrList] = useState([]);

  const fetchRequisitions = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/purchase/requisitions");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((pr) => ({
            id: pr.id || pr.prNumber,
            pr_number: pr.prNumber || pr.pr_number,
            pr_date: pr.prDate || pr.pr_date,
            required_date: pr.requiredDate || pr.required_date,
            requisitioner: pr.requisitioner,
            department: pr.department,
            store: pr.store,
            preferred_vendor: pr.preferredVendor || pr.preferred_vendor,
            priority: pr.priority,
            requirement_type: pr.requirementType || pr.requirement_type,
            procurement_method: pr.procurementMethod || pr.procurement_method || "Competitive Quotation",
            purpose: pr.purpose,
            remarks: pr.remarks,
            status: pr.status,
            pr_type: pr.prType || pr.pr_type || "Direct Material",
            cost_center: pr.costCenter || pr.cost_center || "Moulding Press 01",
            project_reference: pr.projectReference || pr.project_reference || "",
            cancellation_reason: pr.cancellationReason || pr.cancellation_reason || "",
            created_by: pr.createdBy || pr.created_by,
            created_at: pr.createdAt || pr.created_at,
            approved_by: pr.approvedBy || pr.approved_by,
            approved_at: pr.approvedAt || pr.approved_at,
            updated_at: pr.updatedAt || pr.updated_at,
            updated_by: pr.updatedBy || pr.updated_by,
            rejection_reason: pr.rejectionReason || pr.rejection_reason,
            generated_pos: pr.generatedPos || pr.generated_pos || [],
            estimated_amount: pr.items ? pr.items.reduce((s, it) => s + (Number(it.estTotal || it.line_total) || 0), 0) : 0,
            items: (pr.items || []).map((it) => {
              const req = Number(it.reqQty !== undefined ? it.reqQty : it.req_qty) || 0;
              const ord = Number(it.orderedQty !== undefined ? it.orderedQty : it.ordered_qty) || 0;
              const rem = it.remainingQty !== undefined ? Number(it.remainingQty) : (it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, req - ord));
              const rate = Number(it.estRate !== undefined ? it.estRate : it.est_rate) || 0;
              return {
                id: it.id,
                item_code: it.itemCode || it.item_code,
                item_name: it.itemName || it.item_name,
                description: it.description,
                category: it.category || "Bought-Out Parts 🛠",
                req_qty: req,
                ordered_qty: ord,
                remaining_qty: rem,
                uom: it.uom || "PCS",
                est_rate: rate,
                line_total: Number(it.estTotal !== undefined ? it.estTotal : it.line_total) || (req * rate),
                required_date: it.requiredDate || it.required_date || pr.requiredDate || pr.required_date,
                hsn_code: it.hsnCode || it.hsn_code || "",
                drawing_no: it.drawingNo || it.drawing_no || "",
                manufacturer_brand: it.manufacturerBrand || it.manufacturer_brand || "",
                required_by_date: it.requiredByDate || it.required_by_date || it.requiredDate || it.required_date || pr.requiredDate || "",
                remarks: it.remarks
              };
            })
          }));
          setPrList(normalized);
        }
      }
    } catch (err) {
      console.warn("Could not fetch requisitions from backend:", err);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  // Direct database source (no localStorage dependency)
  useEffect(() => {
    try {
      localStorage.removeItem("SMS_PURCHASE_REQUISITION_DATA_REAL_V2");
      localStorage.removeItem("SMS_PURCHASE_REQUISITIONS_DATA_V1");
      localStorage.removeItem("SMS_PURCHASE_REQUISITIONS_DATA_V2");
      localStorage.removeItem("SMS_PURCHASE_REQUISITION_DATA_V1");
      localStorage.removeItem("SMS_PURCHASE_REQUISITION_DATA_V2");
      localStorage.removeItem("SMS_PURCHASE_REQUISITION_DATA_REAL_V1");
    } catch {}
  }, []);

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Main Module Tab: "all-prs" | "pr-clubbing"
  const [activeMainTab, setActiveMainTab] = useState("all-prs");
  const [eligibleClubbingCount, setEligibleClubbingCount] = useState(0);

  // HSN Master list for PR line item classification
  const [hsnMasterList, setHsnMasterList] = useState([]);
  useEffect(() => {
    fetch("http://localhost:4000/api/purchase/hsn-master")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setHsnMasterList(data);
      })
      .catch((e) => console.warn("Could not load HSN codes in PR page:", e));
  }, []);

  useEffect(() => {
    const checkEligible = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/purchase/clubbing/eligible-items");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setEligibleClubbingCount(data.length);
        }
      } catch (e) {
        // ignore
      }
    };
    checkEligible();
  }, [prList]);

  // Selected PR IDs for bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Search input & status filter pills
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Per-column filter inputs (matching ItemMasterFormPage sticky header row 2)
  const [colFilters, setColFilters] = useState({
    item: "",
    department: "",
    quantity: "",
    uom: "",
    required_by: "",
    priority: "",
    status: ""
  });

  // Pagination state (matching ItemMasterFormPage)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPrId, setEditingPrId] = useState(null);
  const [detailPr, setDetailPr] = useState(null);
  const [deletePrTarget, setDeletePrTarget] = useState(null);

  // Rejection Modal state
  const [rejectingPrTarget, setRejectingPrTarget] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  // Item Selector search filter inside PR Modal
  const [itemSearchFilter, setItemSearchFilter] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    pr_number: "",
    pr_date: new Date().toISOString().slice(0, 10),
    required_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    requisitioner: "Kiran Bhalla",
    department: REAL_DEPARTMENTS_LIST[0] || "Store",
    store: REAL_STORES_LIST[0] || "Raw Material Store",
    preferred_vendor: "",
    priority: "Normal",
    requirement_type: "Production Requirement",
    procurement_method: "Competitive Quotation",
    pr_type: "Direct Material",
    cost_center: "Moulding Press 01",
    project_reference: "",
    remarks: "",
    items: []
  });
  const [formErrors, setFormErrors] = useState({});

  // Related Quotations & Orders for Two-Way Navigation in Details Modal
  const [relatedQuotes, setRelatedQuotes] = useState([]);
  const [relatedOrders, setRelatedOrders] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    if (!detailPr) {
      setRelatedQuotes([]);
      setRelatedOrders([]);
      return;
    }
    const fetchRelated = async () => {
      setRelatedLoading(true);
      try {
        const qRes = await fetch("http://localhost:4000/api/purchase/quotations");
        if (qRes.ok) {
          const qData = await qRes.json();
          if (Array.isArray(qData)) {
            const matched = qData.filter(
              (q) => q.prNumber === detailPr.pr_number || (detailPr.id && String(q.prId) === String(detailPr.id))
            );
            setRelatedQuotes(matched);
          }
        }
        const oRes = await fetch("http://localhost:4000/api/purchase/orders");
        if (oRes.ok) {
          const oData = await oRes.json();
          if (Array.isArray(oData)) {
            const matched = oData.filter(
              (o) => o.prNumber === detailPr.pr_number || (detailPr.generated_pos && detailPr.generated_pos.includes(o.poNumber))
            );
            setRelatedOrders(matched);
          }
        }
      } catch (err) {
        console.warn("Could not load related quotations/orders:", err);
      } finally {
        setRelatedLoading(false);
      }
    };
    fetchRelated();
  }, [detailPr]);

  // Watch for navigation from Quotation or PO screen via sessionStorage
  useEffect(() => {
    try {
      const selectedPrNum = sessionStorage.getItem("SMS_SELECTED_PR_NUMBER");
      if (selectedPrNum && prList.length > 0) {
        sessionStorage.removeItem("SMS_SELECTED_PR_NUMBER");
        setSearchTerm(selectedPrNum);
        const match = prList.find((p) => p.pr_number === selectedPrNum || p.id === selectedPrNum);
        if (match) {
          setDetailPr(match);
        }
      }
    } catch (err) {
      console.warn("Error reading SMS_SELECTED_PR_NUMBER in PR page:", err);
    }
  }, [prList]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, colFilters]);

  // Comprehensive Filtered PRs
  const filteredPrs = useMemo(() => {
    return prList.filter((pr) => {
      // 1. Status Pill Filter
      if (statusFilter !== "ALL" && pr.status !== statusFilter) return false;

      // 2. Global Top Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesGlobal =
          (pr.pr_number && pr.pr_number.toLowerCase().includes(q)) ||
          (pr.requisitioner && pr.requisitioner.toLowerCase().includes(q)) ||
          (pr.department && pr.department.toLowerCase().includes(q)) ||
          (pr.requirement_type && pr.requirement_type.toLowerCase().includes(q)) ||
          (pr.remarks && pr.remarks.toLowerCase().includes(q)) ||
          (pr.items &&
            pr.items.some(
              (i) =>
                (i.item_code && i.item_code.toLowerCase().includes(q)) ||
                (i.item_name && i.item_name.toLowerCase().includes(q))
            ));

        if (!matchesGlobal) return false;
      }

      // 3. Per-Column Filters (matching Item Master)
      const primaryItem = pr.items && pr.items.length > 0 ? pr.items[0] : null;

      if (colFilters.item.trim()) {
        const fi = colFilters.item.toLowerCase();
        const matchesItem =
          primaryItem &&
          ((primaryItem.item_code && primaryItem.item_code.toLowerCase().includes(fi)) ||
            (primaryItem.item_name && primaryItem.item_name.toLowerCase().includes(fi)));
        if (!matchesItem) return false;
      }

      if (colFilters.department.trim()) {
        const fd = colFilters.department.toLowerCase();
        if (!pr.department || !pr.department.toLowerCase().includes(fd)) return false;
      }

      if (colFilters.quantity.trim()) {
        const fq = colFilters.quantity.trim();
        const matchesQty = primaryItem && String(primaryItem.req_qty).includes(fq);
        if (!matchesQty) return false;
      }

      if (colFilters.uom.trim()) {
        const fu = colFilters.uom.toLowerCase();
        const matchesUom = primaryItem && primaryItem.uom && primaryItem.uom.toLowerCase().includes(fu);
        if (!matchesUom) return false;
      }

      if (colFilters.required_by.trim()) {
        const fr = colFilters.required_by.toLowerCase();
        const matchesReq =
          (pr.requisitioner && pr.requisitioner.toLowerCase().includes(fr)) ||
          (pr.required_date && pr.required_date.toLowerCase().includes(fr));
        if (!matchesReq) return false;
      }

      if (colFilters.priority.trim()) {
        const fp = colFilters.priority.toLowerCase();
        if (!pr.priority || !pr.priority.toLowerCase().includes(fp)) return false;
      }

      if (colFilters.status.trim()) {
        const fs = colFilters.status.toLowerCase();
        if (!pr.status || !pr.status.toLowerCase().includes(fs)) return false;
      }

      return true;
    });
  }, [prList, statusFilter, searchTerm, colFilters]);

  // Sorting
  const sortedPrs = useMemo(() => {
    return [...filteredPrs].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "item") {
        aVal = a.items && a.items.length > 0 ? a.items[0].item_name : "";
        bVal = b.items && b.items.length > 0 ? b.items[0].item_name : "";
      } else if (sortField === "quantity") {
        aVal = a.items && a.items.length > 0 ? Number(a.items[0].req_qty || 0) : 0;
        bVal = b.items && b.items.length > 0 ? Number(b.items[0].req_qty || 0) : 0;
      } else if (sortField === "uom") {
        aVal = a.items && a.items.length > 0 ? a.items[0].uom : "";
        bVal = b.items && b.items.length > 0 ? b.items[0].uom : "";
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredPrs, sortField, sortDirection]);

  // Pagination calculation matching ItemMasterFormPage
  const totalRecords = sortedPrs.length;
  const isAllPages = pageSize === "ALL";
  const numPageSize = isAllPages ? totalRecords : Number(pageSize);
  const totalPages = isAllPages ? 1 : Math.ceil(totalRecords / numPageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = isAllPages ? 0 : (clampedPage - 1) * numPageSize;
  const endIndex = isAllPages ? totalRecords : Math.min(startIndex + numPageSize, totalRecords);
  const paginatedPrs = isAllPages ? sortedPrs : sortedPrs.slice(startIndex, endIndex);

  // Statistics counters
  const totalPrCount = prList.length;
  const pendingApprovalCount = prList.filter((p) => p.status === "Pending Approval").length;
  const approvedCount = prList.filter((p) => p.status === "Approved").length;
  const convertedPoCount = prList.filter((p) => p.status === "Converted to PO").length;
  const totalIndentValue = prList.reduce((sum, p) => sum + (Number(p.estimated_amount) || 0), 0);

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPrs.length && filteredPrs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPrs.map((p) => p.id)));
    }
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Open Create PR Modal (starts clean with real Item Master 945-05745)
  const handleOpenCreateModal = () => {
    setEditingPrId(null);
    const targetReqDate = new Date();
    targetReqDate.setDate(targetReqDate.getDate() + 7);
    const prDateStr = new Date().toISOString().slice(0, 10);
    const reqDateStr = targetReqDate.toISOString().slice(0, 10);

    const firstRealItem = masterItems[0] || {
      item_code: "945-05745",
      item_name: "Oil Seal-NBR (Size:95x130x13)",
      category: "FG",
      uom: "PCS",
      current_stock: 0,
      reorder_level: 50,
      est_rate: 0
    };

    const firstDept = masterDepartments[0] || "Store";

    // Dynamically calculate the highest sequence number in prList
    let maxSeq = 20;
    (prList || []).forEach((p) => {
      const num = p.pr_number || p.prNumber;
      if (num) {
        const match = num.match(/PR-\d+-(\d+)/);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSeq) {
            maxSeq = val;
          }
        }
      }
    });
    const curYear = new Date().getFullYear();
    const generatedPrNumber = `PR-${curYear}-${String(maxSeq + 1).padStart(5, "0")}`;

    setFormData({
      pr_number: generatedPrNumber,
      pr_date: prDateStr,
      required_date: reqDateStr,
      requisitioner: "Kiran Bhalla",
      department: firstDept,
      store: "Raw Material Store",
      preferred_vendor: "",
      priority: "Normal",
      requirement_type: "Production Requirement",
      procurement_method: "Competitive Quotation",
      pr_type: "Direct Material",
      cost_center: "Moulding Press 01",
      project_reference: "",
      remarks: "",
      items: [
        {
          id: Date.now(),
          item_code: firstRealItem.item_code,
          item_name: firstRealItem.item_name,
          category: firstRealItem.category || "FG",
          req_qty: 1,
          ordered_qty: 0,
          remaining_qty: 1,
          uom: firstRealItem.uom || "PCS",
          current_stock: firstRealItem.current_stock || 0,
          reorder_level: firstRealItem.reorder_level || 50,
          est_rate: firstRealItem.est_rate || 0,
          line_total: 1 * (firstRealItem.est_rate || 0),
          drawing_no: "",
          manufacturer_brand: "",
          hsn_code: firstRealItem.hsn_code || "",
          required_by_date: reqDateStr,
          required_date: reqDateStr,
          remarks: ""
        }
      ]
    });
    setFormErrors({});
    setItemSearchFilter("");
    if (detailPr) setDetailPr(null);
    setIsCreateModalOpen(true);

    // Synchronize with authoritative next number from PostgreSQL database
    fetch("http://localhost:4000/api/purchase/requisitions/next-number")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.prNumber) {
          setFormData((prev) => ({ ...prev, pr_number: data.prNumber }));
        }
      })
      .catch(() => {});
  };

  // Open Edit PR Modal
  const handleOpenEditModal = (pr) => {
    if (pr.status === "Converted to PO" || pr.status === "Fully Ordered") {
      alert(`PR "${pr.pr_number}" has already been converted to a Purchase Order (${pr.status}) and cannot be edited directly.`);
      return;
    }
    setEditingPrId(pr.id);
    setFormData({
      ...pr,
      items: (pr.items || []).map((it) => ({ ...it }))
    });
    setFormErrors({});
    setItemSearchFilter("");
    if (detailPr) setDetailPr(null);
    setIsCreateModalOpen(true);
  };

  // Toolbar Actions based on selection
  const handleEditSelected = () => {
    if (selectedIds.size === 0) {
      alert("Please select a PR from the table to edit.");
      return;
    }
    const firstId = Array.from(selectedIds)[0];
    const target = prList.find((p) => p.id === firstId);
    if (target) handleOpenEditModal(target);
  };

  const handleViewSelected = () => {
    if (selectedIds.size === 0) {
      alert("Please select a PR from the table to view.");
      return;
    }
    const firstId = Array.from(selectedIds)[0];
    const target = prList.find((p) => p.id === firstId);
    if (target) setDetailPr(target);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      alert("Please select a PR from the table to delete.");
      return;
    }
    const firstId = Array.from(selectedIds)[0];
    const target = prList.find((p) => p.id === firstId);
    if (target) {
      if (target.status !== "Draft" && target.status !== "Rejected") {
        alert(`Only Draft or Rejected PRs can be deleted. "${target.pr_number}" is currently "${target.status}".`);
        return;
      }
      setDeletePrTarget(target);
    }
  };

  // Add Item Line to PR Form
  const handleAddFormItemRow = () => {
    const itemToAdd = masterItems[0] || {
      item_code: "945-05745",
      item_name: "Oil Seal-NBR (Size:95x130x13)",
      category: "FG",
      uom: "PCS",
      current_stock: 0,
      reorder_level: 50,
      est_rate: 0
    };
    const defaultDate = formData.required_date || new Date().toISOString().slice(0, 10);

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now() + Math.random(),
          item_code: itemToAdd.item_code,
          item_name: itemToAdd.item_name,
          category: itemToAdd.category || "FG",
          req_qty: 1,
          ordered_qty: 0,
          remaining_qty: 1,
          uom: itemToAdd.uom || "PCS",
          current_stock: itemToAdd.current_stock || 0,
          reorder_level: itemToAdd.reorder_level || 50,
          est_rate: itemToAdd.est_rate || 0,
          line_total: 1 * (itemToAdd.est_rate || 0),
          drawing_no: "",
          manufacturer_brand: "",
          hsn_code: itemToAdd.hsn_code || "",
          required_by_date: defaultDate,
          required_date: defaultDate,
          remarks: ""
        }
      ]
    }));
  };

  const handleRemoveFormItemRow = (id) => {
    if (formData.items.length <= 1) {
      alert("At least one item line is required for a Purchase Requisition.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id)
    }));
  };

  // Select Item from Item Master in row
  const handleSelectMasterItemInRow = (id, masterCode) => {
    const master = masterItems.find((m) => m.item_code === masterCode);
    if (!master) return;

    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item;
        const qty = item.req_qty > 0 ? item.req_qty : 1;
        return {
          ...item,
          item_code: master.item_code,
          item_name: master.item_name,
          category: master.category,
          uom: master.uom,
          current_stock: master.current_stock,
          reorder_level: master.reorder_level,
          est_rate: master.est_rate,
          line_total: qty * master.est_rate,
          hsn_code: master.hsn_code || ""
        };
      })
    }));
  };

  const handleItemLineChange = (id, field, value) => {
    setFormData((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };
        if (field === "req_qty" || field === "est_rate") {
          const qty = Number(field === "req_qty" ? value : updated.req_qty) || 0;
          const rate = Number(field === "est_rate" ? value : updated.est_rate) || 0;
          updated.line_total = qty * rate;
          if (field === "req_qty") {
            updated.remaining_qty = Math.max(0, qty - (updated.ordered_qty || 0));
          }
        }
        return updated;
      });
      return { ...prev, items: updatedItems };
    });
  };

  // Submit PR Form (Action: "DRAFT" or "SUBMIT")
  const handleSavePrWithAction = (actionType = "SUBMIT") => {
    const errors = {};
    if (!formData.requisitioner.trim()) errors.requisitioner = "Requisitioner Name is required";
    if (!formData.department.trim()) errors.department = "Department is required";
    if (!formData.required_date) errors.required_date = "Required Date is required";
    if (formData.required_date < formData.pr_date) {
      errors.required_date = "Required Date cannot be earlier than PR Date";
    }

    // Validate item quantities
    let invalidQtyFound = false;
    formData.items.forEach((item) => {
      if (Number(item.req_qty) <= 0) {
        invalidQtyFound = true;
      }
    });

    if (invalidQtyFound) {
      errors.items = "All PR item quantities must be greater than 0.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const calculatedTotalAmount = formData.items.reduce((sum, i) => sum + (Number(i.line_total) || 0), 0);
    const nowFormatted = formatDisplayDateTime(new Date());

    const existingPr = editingPrId !== null ? prList.find((p) => p.id === editingPrId) : null;
    let targetStatus = "Pending Approval";
    if (actionType === "DRAFT") {
      targetStatus = "Draft";
    } else if (actionType === "SAVE") {
      targetStatus = existingPr?.status || "Pending Approval";
    } else {
      // actionType === "SUBMIT"
      targetStatus = "Pending Approval";
    }

    const actionLabel = actionType === "DRAFT"
      ? "Saved as Draft"
      : actionType === "SAVE"
      ? `PR updated (Status: ${targetStatus})`
      : (editingPrId ? "Resubmitted for HOD Approval" : "Submitted for HOD Approval");

    if (editingPrId !== null) {
      // Edit / Resubmit
      setPrList((prev) =>
        prev.map((pr) => {
          if (pr.id !== editingPrId) return pr;

          const history = pr.approval_history || [];
          const newHistory = [
            ...history,
            {
              timestamp: nowFormatted,
              user: formData.requisitioner,
              action: actionLabel,
              status: targetStatus,
              remarks: formData.remarks || "PR updated"
            }
          ];

          return {
            ...pr,
            ...formData,
            status: targetStatus,
            estimated_amount: calculatedTotalAmount,
            updated_at: nowFormatted,
            updated_by: formData.requisitioner,
            rejection_reason: targetStatus === "Pending Approval" ? "" : pr.rejection_reason,
            approval_history: newHistory,
            items: (formData.items || []).map((it) => {
              const reqQty = Number(it.req_qty) || 0;
              const ordQty = Number(it.ordered_qty) || 0;
              return {
                ...it,
                req_qty: reqQty,
                ordered_qty: ordQty,
                remaining_qty: Math.max(0, reqQty - ordQty)
              };
            })
          };
        })
      );
      showToast(`Purchase Requisition "${formData.pr_number}" updated successfully.`);
    } else {
      // New PR Creation
      const newId = Date.now();
      const newHistory = [
        {
          timestamp: nowFormatted,
          user: formData.requisitioner,
          action: actionLabel,
          status: targetStatus,
          remarks: formData.remarks || "Initial creation"
        }
      ];

      const newPr = {
        ...formData,
        id: newId,
        status: targetStatus,
        po_number: "",
        generated_pos: [],
        estimated_amount: calculatedTotalAmount,
        created_at: nowFormatted,
        created_by: formData.requisitioner,
        updated_at: nowFormatted,
        updated_by: formData.requisitioner,
        approval_history: newHistory,
        items: (formData.items || []).map((it) => ({
          ...it,
          ordered_qty: 0,
          remaining_qty: Number(it.req_qty) || 0
        }))
      };
      setPrList((prev) => [newPr, ...prev]);
      showToast(`Purchase Requisition "${newPr.pr_number}" ${actionType === "DRAFT" ? "saved as Draft" : "submitted for HOD Approval"}.`);
    }

    // Persist directly to PostgreSQL database table purchase_requisitions & purchase_requisition_items
    try {
      const dbPayload = {
        id: editingPrId !== null ? editingPrId : null,
        prNumber: formData.pr_number,
        prDate: formData.pr_date,
        requiredDate: formData.required_date,
        requisitioner: formData.requisitioner,
        department: formData.department,
        store: formData.store,
        preferredVendor: formData.preferred_vendor,
        priority: formData.priority,
        requirementType: formData.requirement_type,
        procurementMethod: formData.procurement_method,
        prType: formData.pr_type || "Direct Material",
        costCenter: formData.cost_center || "Moulding Press 01",
        projectReference: formData.project_reference || "",
        cancellationReason: formData.cancellation_reason || "",
        purpose: formData.purpose,
        remarks: formData.remarks,
        status: targetStatus,
        createdBy: formData.requisitioner,
        items: (formData.items || []).map((it) => ({
          itemCode: it.item_code,
          itemName: it.item_name,
          description: it.item_name || it.item_code,
          category: it.category,
          uom: it.uom,
          reqQty: Number(it.req_qty) || 0,
          orderedQty: Number(it.ordered_qty) || 0,
          remainingQty: Math.max(0, (Number(it.req_qty) || 0) - (Number(it.ordered_qty) || 0)),
          estRate: Number(it.est_rate) || 0,
          estTotal: (Number(it.req_qty) || 0) * (Number(it.est_rate) || 0),
          hsnCode: it.hsn_code || null,
          drawingNo: it.drawing_no || null,
          manufacturerBrand: it.manufacturer_brand || null,
          requiredByDate: it.required_by_date || it.required_date || formData.required_date || null,
          remarks: it.remarks || ""
        }))
      };

      fetch("http://localhost:4000/api/purchase/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbPayload)
      })
        .then(() => fetchRequisitions())
        .catch((e) => console.warn("Backend PR sync warning:", e));
    } catch (err) {
      console.warn("Could not sync PR to backend database:", err);
    }

    setIsCreateModalOpen(false);
  };

  // Approve PR Action
  const handleApprovePr = async (pr) => {
    const prNum = pr.pr_number || pr.prNumber;
    try {
      await fetch(`http://localhost:4000/api/purchase/requisitions/${prNum}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved", user: "VP Operations" })
      });
    } catch (e) {
      console.warn("Backend approval sync error:", e);
    }

    const nowFormatted = formatDisplayDateTime(new Date());

    setPrList((prev) =>
      prev.map((p) => {
        if ((p.pr_number || p.prNumber) !== prNum && p.id !== pr.id) return p;

        const history = p.approval_history || [];
        return {
          ...p,
          status: "Approved",
          updated_at: nowFormatted,
          updated_by: "HOD Approver",
          approval_history: [
            ...history,
            {
              timestamp: nowFormatted,
              user: "HOD Approver",
              action: "Approved PR",
              status: "Approved",
              remarks: "Approved for procurement processing"
            }
          ]
        };
      })
    );

    showToast(`PR "${prNum}" approved successfully.`);
    if (detailPr && ((detailPr.pr_number || detailPr.prNumber) === prNum || detailPr.id === pr.id)) {
      setDetailPr((prev) => ({ ...prev, status: "Approved" }));
    }
  };

  // Reject PR Action
  const handleConfirmRejectPr = async () => {
    if (!rejectingPrTarget) return;
    if (!rejectionReasonText.trim()) {
      alert("A reason for rejection is mandatory.");
      return;
    }

    const pr = rejectingPrTarget;
    const prNum = pr.pr_number || pr.prNumber;
    try {
      await fetch(`http://localhost:4000/api/purchase/requisitions/${prNum}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Rejected", reason: rejectionReasonText.trim(), user: "HOD Approver" })
      });
    } catch (e) {
      console.warn("Backend rejection sync error:", e);
    }

    const nowFormatted = formatDisplayDateTime(new Date());

    setPrList((prev) =>
      prev.map((p) => {
        if ((p.pr_number || p.prNumber) !== prNum && p.id !== pr.id) return p;

        const history = p.approval_history || [];
        return {
          ...p,
          status: "Rejected",
          rejection_reason: rejectionReasonText.trim(),
          updated_at: nowFormatted,
          updated_by: "Approver",
          approval_history: [
            ...history,
            {
              timestamp: nowFormatted,
              user: "Approver",
              action: "Rejected PR",
              status: "Rejected",
              remarks: `Reason: ${rejectionReasonText.trim()}`
            }
          ]
        };
      })
    );

    showToast(`PR "${prNum}" marked as Rejected.`);
    setRejectingPrTarget(null);
    if (detailPr && ((detailPr.pr_number || detailPr.prNumber) === prNum || detailPr.id === pr.id)) {
      setDetailPr(null);
    }
  };

  // Connection 1: PR -> Request for Quotation (Create RFQ from Approved PR)
  const handleCreateRfqFromPr = (pr) => {
    try {
      sessionStorage.setItem("SMS_SELECTED_PR_FOR_RFQ", JSON.stringify(pr));
      showToast(`Selected PR "${pr.pr_number}". Opening Request for Quotation (RFQ)...`);
      if (detailPr) setDetailPr(null);
      if (onNavigate) onNavigate("rfq");
    } catch (e) {
      console.error(e);
    }
  };

  // Connection 2: PR -> PO Processing (Approved PR with remaining qty)
  const handleProcessPoFromPr = (pr) => {
    try {
      sessionStorage.setItem("SMS_SELECTED_PR_FOR_PO", JSON.stringify(pr));
      showToast(`Selected PR "${pr.pr_number}". Opening PO Processing screen...`);
      if (detailPr) setDetailPr(null);
      if (onNavigate) onNavigate("purchase-processing");
    } catch (e) {
      console.error(e);
    }
  };

  // Delete PR Action
  const handleConfirmDeletePr = () => {
    if (!deletePrTarget) return;

    if (deletePrTarget.status !== "Draft" && deletePrTarget.status !== "Rejected") {
      alert(`Only Draft or Rejected PRs can be deleted. "${deletePrTarget.pr_number}" is currently "${deletePrTarget.status}".`);
      setDeletePrTarget(null);
      return;
    }

    const prNum = deletePrTarget.pr_number || deletePrTarget.prNumber;
    try {
      fetch(`http://localhost:4000/api/purchase/requisitions/${prNum}`, {
        method: "DELETE"
      })
        .then(() => fetchRequisitions())
        .catch(console.warn);
    } catch (e) {}

    setPrList((prev) => prev.filter((p) => p.id !== deletePrTarget.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deletePrTarget.id);
      return next;
    });
    showToast(`Purchase Requisition "${deletePrTarget.pr_number}" deleted.`);
    setDeletePrTarget(null);
    if (detailPr && detailPr.id === deletePrTarget.id) {
      setDetailPr(null);
    }
  };

  // Filter master items for selection inside PR modal (both FG and Other items guaranteed)
  const filteredMasterItemsForDropdown = useMemo(() => {
    const q = itemSearchFilter.trim().toLowerCase();
    const otherItems = masterItems.filter((i) => i.item_type !== "FG");
    const fgItems = masterItems.filter((i) => i.item_type === "FG");

    if (!q) {
      return {
        otherItems,
        fgItems: fgItems.slice(0, 100)
      };
    }

    const filterFn = (it) =>
      (it.item_code && it.item_code.toLowerCase().includes(q)) ||
      (it.item_name && it.item_name.toLowerCase().includes(q)) ||
      (it.category && it.category.toLowerCase().includes(q));

    return {
      otherItems: otherItems.filter(filterFn),
      fgItems: fgItems.filter(filterFn).slice(0, 150)
    };
  }, [masterItems, itemSearchFilter]);

  // Export PR Dataset to CSV
  const handleExportCSV = () => {
    const headers = [
      "PR Number",
      "PR Date",
      "Requisitioner",
      "Department",
      "Store",
      "Requirement Type",
      "Priority",
      "Status",
      "Total Amount (INR)",
      "Created At",
      "Created By",
      "Items Summary"
    ];
    const rows = filteredPrs.map((pr) => {
      const itemsSummary = pr.items
        ? pr.items.map((i) => `${i.item_code} (${i.req_qty} ${i.uom})`).join(" | ")
        : "";
      return [
        `"${pr.pr_number}"`,
        `"${formatDisplayDate(pr.pr_date)}"`,
        `"${pr.requisitioner}"`,
        `"${pr.department}"`,
        `"${pr.store || ""}"`,
        `"${pr.requirement_type || ""}"`,
        `"${pr.priority}"`,
        `"${pr.status}"`,
        `"${pr.estimated_amount}"`,
        `"${formatDisplayDateTime(pr.created_at)}"`,
        `"${pr.created_by || ""}"`,
        `"${itemsSummary}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SMS_Purchase_Requisitions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported Purchase Requisitions dataset to CSV.");
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setColFilters({
      item: "",
      department: "",
      quantity: "",
      uom: "",
      required_by: "",
      priority: "",
      status: ""
    });
    setSelectedIds(new Set());
    showToast("Data refreshed!");
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
        {/* Toast Alert Notification */}
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
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 1: TOP TOOLBAR & BREADCRUMB HEADER (STATIC - NEVER SCROLLS)          */}
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
            {/* + New Purchase Requisition Button */}
            <button
              onClick={handleOpenCreateModal}
              id="btn-new-pr"
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
              <span>New Purchase Requisition</span>
            </button>

            {/* Edit PR Button */}
            <button
              onClick={handleEditSelected}
              id="btn-edit-pr"
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
              Edit PR
            </button>

            {/* View Detail Button */}
            <button
              onClick={handleViewSelected}
              id="btn-view-pr"
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
              View Specs
            </button>

            {/* Delete PR Button */}
            <button
              onClick={handleDeleteSelected}
              id="btn-delete-pr"
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
              Delete PR
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
              onClick={handleExportCSV}
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
              Export CSV
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

          {/* Right Breadcrumb Header */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            {onBackToHome ? (
              <span
                onClick={onBackToHome}
                style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline", marginRight: 4 }}
              >
                Purchase
              </span>
            ) : (
              <span>Purchase</span>
            )}
            <span style={{ margin: "0 4px" }}>›</span>
            <span>Procurement</span>
            <span style={{ margin: "0 4px" }}>›</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>Purchase Requisition (PR)</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODULE TABS: ALL REQUISITIONS vs PR CLUBBING & CONSOLIDATION             */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            gap: 20
          }}
        >
          <button
            onClick={() => setActiveMainTab("all-prs")}
            id="tab-all-prs"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeMainTab === "all-prs" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeMainTab === "all-prs" ? "#2563eb" : "#64748b",
              padding: "11px 8px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease"
            }}
          >
            <Layers size={14} />
            <span>All Requisitions (PR)</span>
            <span
              style={{
                background: activeMainTab === "all-prs" ? "#eff6ff" : "#f1f5f9",
                color: activeMainTab === "all-prs" ? "#2563eb" : "#64748b",
                padding: "2px 7px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700
              }}
            >
              {prList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab("pr-clubbing")}
            id="tab-pr-clubbing"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeMainTab === "pr-clubbing" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeMainTab === "pr-clubbing" ? "#2563eb" : "#64748b",
              padding: "11px 8px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease"
            }}
          >
            <Package size={14} />
            <span>PR Clubbing &amp; Consolidation</span>
            <span
              style={{
                background: activeMainTab === "pr-clubbing" ? "#2563eb" : "#059669",
                color: "#ffffff",
                padding: "2px 7px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 800
              }}
            >
              {eligibleClubbingCount > 0 ? `${eligibleClubbingCount} Eligible` : "Clubbing"}
            </span>
          </button>
        </div>

        {activeMainTab === "pr-clubbing" ? (
          <PrClubbingTab
            dark={dark}
            onNavigate={onNavigate}
            showToast={showToast}
          />
        ) : (
          <>

        {/* ========================================================================= */}
        {/* ROW 2: SEARCH INPUT, STATUS PILLS & REAL-TIME SUMMARY METRICS (STATIC)   */}
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
              placeholder="Search by PR #, Item, Dept, Requisitioner..."
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

          {/* Status Filter Pills (matching ItemMasterFormPage category pills) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { label: "All PRs", key: "ALL" },
              { label: "Draft", key: "Draft" },
              { label: "Pending Approval", key: "Pending Approval" },
              { label: "Approved", key: "Approved" },
              { label: "Converted to PO", key: "Converted to PO" },
              { label: "Rejected", key: "Rejected" }
            ].map((pill) => {
              const isActive = statusFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setStatusFilter(pill.key)}
                  style={{
                    padding: "6px 16px",
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
              Total <strong style={{ color: "#0f172a", fontSize: 14 }}>{totalPrCount}</strong>
            </div>
            <div>
              Pending <strong style={{ color: "#d97706", fontSize: 14 }}>{pendingApprovalCount}</strong>
            </div>
            <div>
              Approved <strong style={{ color: "#059669", fontSize: 14 }}>{approvedCount}</strong>
            </div>
            <div>
              PO Converted <strong style={{ color: "#2563eb", fontSize: 14 }}>{convertedPoCount}</strong>
            </div>
            <div>
              Total Indent <strong style={{ color: "#0f172a", fontSize: 14 }}>₹{totalIndentValue.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: DATA TABLE CONTAINER (ONLY DATA ROWS SCROLL VERTICALLY)            */}
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
              ...prMainResize.tableStyle,
            }}
          >
            <ResizableColGroup columns={PR_MAIN_COLUMNS} widths={prMainResize.widths} />
            <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
              {/* Header Row 1: Column Titles (STICKY AT TOP 0 - STRICT COLUMN ORDER) */}
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
                    checked={selectedIds.size === filteredPrs.length && filteredPrs.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    width: 60,
                    textAlign: "center",
                    cursor: "pointer"
                  }}
                  onClick={() => handleSort("id")}
                >
                  Sr. No. {sortField === "id" && (sortDirection === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="sr" resize={prMainResize} />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    minWidth: 240,
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }}
                  onClick={() => handleSort("item")}
                >
                  Item {sortField === "item" && (sortDirection === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="item" resize={prMainResize} />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }}
                  onClick={() => handleSort("department")}
                >
                  Department {sortField === "department" && (sortDirection === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="department" resize={prMainResize} />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    width: 95,
                    cursor: "pointer"
                  }}
                  onClick={() => handleSort("quantity")}
                >
                  Quantity {sortField === "quantity" && (sortDirection === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="quantity" resize={prMainResize} />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    width: 70,
                    cursor: "pointer"
                  }}
                  onClick={() => handleSort("uom")}
                >
                  UOM {sortField === "uom" && (sortDirection === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="uom" resize={prMainResize} />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }}
                  onClick={() => handleSort("requisitioner")}
                >
                  Required By {sortField === "requisitioner" && (sortDirection === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="requiredBy" resize={prMainResize} />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }}
                  onClick={() => handleSort("priority")}
                >
                  Priority {sortField === "priority" && (sortDirection === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="priority" resize={prMainResize} />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }}
                  onClick={() => handleSort("status")}
                >
                  Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  <ColumnResizeHandle colKey="status" resize={prMainResize} />
                </th>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 22,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: "#334155",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    width: 140
                  }}
                >
                  Actions
                  <ColumnResizeHandle colKey="actions" resize={prMainResize} />
                </th>
              </tr>

              {/* Header Row 2: Per-Column Filter Input Boxes (STICKY AT TOP 37) */}
              <tr style={{ background: "#f8fafc", height: 38 }}>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 12px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}></td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}></td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter Item..."
                    value={colFilters.item}
                    onChange={(e) => setColFilters({ ...colFilters, item: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Filter Dept..."
                    value={colFilters.department}
                    onChange={(e) => setColFilters({ ...colFilters, department: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Qty..."
                    value={colFilters.quantity}
                    onChange={(e) => setColFilters({ ...colFilters, quantity: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box", textAlign: "right" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="UOM..."
                    value={colFilters.uom}
                    onChange={(e) => setColFilters({ ...colFilters, uom: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box", textAlign: "center" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Req By..."
                    value={colFilters.required_by}
                    onChange={(e) => setColFilters({ ...colFilters, required_by: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Priority..."
                    value={colFilters.priority}
                    onChange={(e) => setColFilters({ ...colFilters, priority: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  <input
                    type="text"
                    placeholder="Status..."
                    value={colFilters.status}
                    onChange={(e) => setColFilters({ ...colFilters, status: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}></td>
              </tr>
            </thead>

            {/* Table Rows (Matching ItemMasterFormPage look & feel) */}
            <tbody>
              {filteredPrs.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px", color: "#0f172a" }}>
                      No Purchase Requisitions found
                    </p>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px" }}>
                      Connected to real Item Master ({masterItems.length} records), Category Master &amp; Department Master.
                    </p>
                    <button
                      onClick={handleOpenCreateModal}
                      style={{
                        background: "#1e293b",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 18px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 12,
                        boxShadow: "0 2px 4px rgba(30, 41, 59, 0.25)"
                      }}
                    >
                      + Add New Purchase Requisition
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedPrs.map((pr, idx) => {
                  const isSelected = selectedIds.has(pr.id);
                  const primaryItem = pr.items && pr.items.length > 0 ? pr.items[0] : null;
                  const srNo = isAllPages ? idx + 1 : (clampedPage - 1) * numPageSize + idx + 1;

                  // Status badge styling
                  let statusBg = "rgba(100,116,139,0.12)";
                  let statusColor = "#475569";
                  if (pr.status === "Draft") {
                    statusBg = "#f1f5f9";
                    statusColor = "#475569";
                  } else if (pr.status === "Pending Approval" || pr.status === "Submitted") {
                    statusBg = "#fef3c7";
                    statusColor = "#b45309";
                  } else if (pr.status === "Approved") {
                    statusBg = "#dcfce7";
                    statusColor = "#15803d";
                  } else if (pr.status === "Partially Ordered") {
                    statusBg = "#e0f2fe";
                    statusColor = "#0369a1";
                  } else if (pr.status === "Fully Ordered" || pr.status === "Converted to PO") {
                    statusBg = "#dbeafe";
                    statusColor = "#1d4ed8";
                  } else if (pr.status === "Rejected") {
                    statusBg = "#fee2e2";
                    statusColor = "#b91c1c";
                  }

                  // Procurement Method styling
                  const method = pr.procurement_method || "Competitive Quotation";
                  let methodBg = "#f3e8ff";
                  let methodColor = "#7e22ce";
                  if (method === "Direct Purchase") {
                    methodBg = "#ecfdf5";
                    methodColor = "#047857";
                  } else if (method === "Existing Contract") {
                    methodBg = "#eff6ff";
                    methodColor = "#1d4ed8";
                  } else if (method === "Emergency Purchase") {
                    methodBg = "#fff7ed";
                    methodColor = "#c2410c";
                  }

                  // Priority badge color
                  let priorityColor = "#2563eb";
                  if (pr.priority === "High" || pr.priority === "Urgent") priorityColor = "#d97706";

                  // Total items balance calculation
                  const totalReq = (pr.items || []).reduce((s, it) => s + (Number(it.req_qty) || 0), 0);
                  const totalOrd = (pr.items || []).reduce((s, it) => s + (Number(it.ordered_qty) || 0), 0);
                  const totalRem = (pr.items || []).reduce((s, it) => s + (Number(it.remaining_qty !== undefined ? it.remaining_qty : it.req_qty) || 0), 0);

                  return (
                    <tr
                      key={pr.id}
                      onDoubleClick={() => setDetailPr(pr)}
                      onClick={() => toggleSelectRow(pr.id)}
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
                          onChange={() => toggleSelectRow(pr.id)}
                          style={{ cursor: "pointer", accentColor: "#2563eb" }}
                        />
                      </td>

                      {/* 1. Sr. No. */}
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                        {srNo}
                      </td>

                      {/* 2. Item (Item Name + Part No + Procurement Method) */}
                      <td style={{ padding: "10px 12px", color: "#0f172a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailPr(pr);
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#0284c7",
                              textDecoration: "underline",
                              cursor: "pointer"
                            }}
                            title="Click to view PR specifications & linkages"
                          >
                            {pr.pr_number}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              background: methodBg,
                              color: methodColor,
                              padding: "1px 6px",
                              borderRadius: 4,
                              fontWeight: 700,
                              border: `1px solid ${methodColor}20`
                            }}
                          >
                            {method}
                          </span>
                        </div>
                        {primaryItem ? (
                          <div>
                            <div style={{ fontWeight: 800, color: "#0f172a" }}>
                              {primaryItem.item_name}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 700, color: "#c51f28" }}>{primaryItem.item_code}</span>
                              <span style={{ color: "#94a3b8" }}>&bull; {primaryItem.category || "FG"}</span>
                              {pr.items.length > 1 && (
                                <span style={{ fontSize: 10, background: "#f1f5f9", color: "#1e293b", padding: "1px 5px", borderRadius: 3, fontWeight: 800, border: "1px solid #cbd5e1" }}>
                                  +{pr.items.length - 1} More Items
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>No items</span>
                        )}
                      </td>

                      {/* 3. Department */}
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {pr.department}
                      </td>

                      {/* 4. Quantity & Balance Breakdown */}
                      <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 12 }}>
                          {totalReq.toLocaleString("en-IN")} {primaryItem ? primaryItem.uom : "PCS"}
                        </div>
                        <div style={{ fontSize: 10.5, marginTop: 2, display: "flex", justifyContent: "flex-end", gap: 4, fontWeight: 700 }}>
                          <span style={{ color: totalOrd > 0 ? "#16a34a" : "#94a3b8" }}>Ord: {totalOrd}</span>
                          <span style={{ color: "#cbd5e1" }}>|</span>
                          <span style={{ color: totalRem > 0 ? "#0284c7" : "#16a34a" }}>
                            Bal: {totalRem}
                          </span>
                        </div>
                      </td>

                      {/* 5. UOM */}
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>
                        {primaryItem ? primaryItem.uom : "PCS"}
                      </td>

                      {/* 6. Required By (Requisitioner + Req Date) */}
                      <td style={{ padding: "10px 12px", color: "#334155", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{pr.requisitioner}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{formatDisplayDate(pr.required_date || pr.pr_date)}</div>
                      </td>

                      {/* 7. Priority */}
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: priorityColor, fontSize: 11.5 }}>
                          &bull; {pr.priority}
                        </span>
                      </td>

                      {/* 8. Status Badge */}
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background: statusBg,
                            color: statusColor,
                            display: "inline-block"
                          }}
                        >
                          {pr.status}
                        </span>
                        {pr.generated_pos && pr.generated_pos.length > 0 && (
                          <div style={{ fontSize: 10, color: "#2563eb", fontWeight: 700, marginTop: 2 }}>
                            {pr.generated_pos.join(", ")}
                          </div>
                        )}
                      </td>

                      {/* 9. Actions Column */}
                      <td style={{ padding: "10px 12px", textAlign: "center", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {/* View Detail Action */}
                          <button
                            onClick={() => setDetailPr(pr)}
                            title="View Full Specifications & Linked Quotations/POs"
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#0284c7",
                              borderRadius: 4,
                              padding: "4px 7px",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            <Eye size={13} />
                          </button>

                          {/* Edit Action (Editable if not fully converted to PO) */}
                          {pr.status !== "Converted to PO" && pr.status !== "Fully Ordered" && (
                            <button
                              onClick={() => handleOpenEditModal(pr)}
                              title="Edit Requisition"
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                color: "#2563eb",
                                borderRadius: 4,
                                padding: "4px 7px",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                            >
                              <Pencil size={13} />
                            </button>
                          )}

                          {/* Delete Action (Draft or Rejected) */}
                          {(pr.status === "Draft" || pr.status === "Rejected") && (
                            <button
                              onClick={() => setDeletePrTarget(pr)}
                              title="Delete Requisition"
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#dc2626",
                                borderRadius: 4,
                                padding: "4px 7px",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          {/* Pending Approval: Quick Approve / Reject */}
                          {pr.status === "Pending Approval" && (
                            <>
                              <button
                                onClick={() => handleApprovePr(pr)}
                                title="Approve PR"
                                style={{
                                  background: "#ecfdf5",
                                  border: "1px solid #a7f3d0",
                                  color: "#059669",
                                  borderRadius: 4,
                                  padding: "4px 7px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center"
                                }}
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingPrTarget(pr);
                                  setRejectionReasonText("");
                                }}
                                title="Reject PR"
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                  borderRadius: 4,
                                  padding: "4px 7px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center"
                                }}
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}

                          {/* Connection 1 & 2: Approved / Partially Ordered Actions */}
                          {(pr.status === "Approved" || pr.status === "Partially Ordered") && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              {method === "Competitive Quotation" && (
                                <button
                                  onClick={() => handleCreateRfqFromPr(pr)}
                                  title="Create RFQ / Request Quotations from Vendors"
                                  style={{
                                    background: "#7c3aed",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: 4,
                                    padding: "4px 8px",
                                    cursor: "pointer",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3
                                  }}
                                >
                                  <Tag size={12} />
                                  <span>RFQ</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleProcessPoFromPr(pr)}
                                title="Process Purchase Order Proposal"
                                style={{
                                  background: "#0284c7",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: 4,
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3
                                }}
                              >
                                <ShoppingCart size={12} />
                                <span>PO</span>
                              </button>
                            </div>
                          )}
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
        {/* ROW 4: PAGINATION TOOLBAR (STATIC AT BOTTOM OF CARD)                      */}
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
              of <strong>{totalRecords.toLocaleString()}</strong> PR records
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
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="ALL">All ({totalRecords})</option>
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
        </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM DARK STATUS BAR (MATCHING ITEM MASTER FG REFERENCE UI)             */}
      {/* ========================================================================= */}
      {activeMainTab === "all-prs" && (
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
            <span>{totalRecords.toLocaleString()} PR records</span>
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
            Silver Muller Seals &bull; Procurement &amp; Requisition Workflow System
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT PURCHASE REQUISITION                               */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            style={{
              width: 1180,
              maxWidth: "100%",
              maxHeight: "92vh",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header (Dark Slate #1e293b, matching Item Master) */}
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
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  {editingPrId ? "Procurement Requisition Modification" : "New Procurement Requisition"}
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                  {editingPrId ? `Edit PR: ${formData.pr_number}` : `Create Purchase Requisition: ${formData.pr_number}`}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 20,
                  fontWeight: 700,
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingPrId) {
                  handleSavePrWithAction("SAVE");
                } else {
                  handleSavePrWithAction("SUBMIT");
                }
              }}
              style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
            >
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {/* SECTION 1: PR HEADER ATTRIBUTES */}
                <div style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                  1. Requisition Header Information
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      PR Number
                    </label>
                    <input
                      type="text"
                      value={formData.pr_number}
                      readOnly
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        fontWeight: 800,
                        color: "#0f172a",
                        fontSize: 12,
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      PR Date *
                    </label>
                    <DateInput
                      value={formData.pr_date}
                      onChange={(e) => setFormData({ ...formData, pr_date: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Department (Department Master) *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        fontWeight: 600,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    >
                      {masterDepartments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Required By Date *
                    </label>
                    <DateInput
                      value={formData.required_date}
                      onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: formErrors.required_date ? "1px solid #ef4444" : "1px solid #cbd5e1",
                        fontSize: 12,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    />
                    {formErrors.required_date && (
                      <span style={{ fontSize: 10.5, color: "#ef4444" }}>{formErrors.required_date}</span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Requested By *
                    </label>
                    <input
                      type="text"
                      value={formData.requisitioner}
                      onChange={(e) => setFormData({ ...formData, requisitioner: e.target.value })}
                      placeholder="Full Name"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: formErrors.requisitioner ? "1px solid #ef4444" : "1px solid #cbd5e1",
                        fontSize: 12,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Requirement Type / Purpose
                    </label>
                    <select
                      value={formData.requirement_type}
                      onChange={(e) => setFormData({ ...formData, requirement_type: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    >
                      {REQUIREMENT_TYPES_LIST.map((rt) => (
                        <option key={rt} value={rt}>
                          {rt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Procurement Method <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={formData.procurement_method || "Competitive Quotation"}
                      onChange={(e) => setFormData({ ...formData, procurement_method: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#0f172a",
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    >
                      {PROCUREMENT_METHODS_LIST.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        fontWeight: 700,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    >
                      {PRIORITY_LIST.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      PR Type
                    </label>
                    <select
                      value={formData.pr_type || "Direct Material"}
                      onChange={(e) => setFormData({ ...formData, pr_type: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        fontWeight: 600,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    >
                      {PR_TYPES_LIST.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Cost Center
                    </label>
                    <select
                      value={formData.cost_center || "Moulding Press 01"}
                      onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        fontWeight: 600,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    >
                      {COST_CENTERS_LIST.map((cc) => (
                        <option key={cc} value={cc}>
                          {cc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Project / Work-Order Ref
                    </label>
                    <input
                      type="text"
                      value={formData.project_reference || ""}
                      onChange={(e) => setFormData({ ...formData, project_reference: e.target.value })}
                      placeholder="e.g. PRJ-2026-SEAL-01"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: "span 4" }}>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      Header Remarks / Justification
                    </label>
                    <input
                      type="text"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="e.g. Production requirement for scheduled shift"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    />
                  </div>
                </div>

                {/* SECTION 2: LINE ITEMS BREAKDOWN */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    2. Indented Items Breakdown ({formData.items.length})
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Item Master Search Filter Box */}
                    <div style={{ position: "relative", width: 240 }}>
                      <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                      <input
                        type="text"
                        value={itemSearchFilter}
                        onChange={(e) => setItemSearchFilter(e.target.value)}
                        placeholder="Search Item Master..."
                        style={{
                          width: "100%",
                          padding: "5px 8px 5px 26px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          fontSize: 11.5,
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                      {itemSearchFilter && (
                        <X
                          size={12}
                          onClick={() => setItemSearchFilter("")}
                          style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#64748b" }}
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddFormItemRow()}
                      style={{
                        background: "#1e293b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Item Line</span>
                    </button>
                  </div>
                </div>

                <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 16, ...purchaseRequisitionPage2Resize.tableStyle }}>
                  <ResizableColGroup columns={PURCHASE_REQUISITION_PAGE_2_COLUMNS} widths={purchaseRequisitionPage2Resize.widths} />
                  <thead>
                    <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "8px 6px", textAlign: "center", width: 30, fontWeight: 700 }}>#<ColumnResizeHandle colKey="sr" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "left", width: 260, fontWeight: 700 }}>Item Selection<ColumnResizeHandle colKey="item_selection" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "left", width: 130, fontWeight: 700 }}>Category<ColumnResizeHandle colKey="category" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "left", width: 95, fontWeight: 700 }}>HSN / SAC<ColumnResizeHandle colKey="hsn_sac" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "left", width: 100, fontWeight: 700 }}>Drawing/Spec<ColumnResizeHandle colKey="drawing_spec" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "left", width: 95, fontWeight: 700 }}>Make/Brand<ColumnResizeHandle colKey="make_brand" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "right", width: 75, fontWeight: 700 }}>Req Qty *<ColumnResizeHandle colKey="req_qty" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "center", width: 50, fontWeight: 700 }}>UOM<ColumnResizeHandle colKey="uom" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "right", width: 85, fontWeight: 700 }}>Est Rate (₹)<ColumnResizeHandle colKey="est_rate" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "right", width: 95, fontWeight: 700 }}>Line Total<ColumnResizeHandle colKey="line_total" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "center", width: 95, fontWeight: 700 }}>Need Date<ColumnResizeHandle colKey="need_date" resize={purchaseRequisitionPage2Resize} /></th>
                      <th style={{ padding: "8px 6px", textAlign: "center", width: 35, fontWeight: 700 }}>Act<ColumnResizeHandle colKey="act" resize={purchaseRequisitionPage2Resize} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, iIdx) => {
                      const isQtyValid = Number(item.req_qty) > 0;
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", background: iIdx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                            {iIdx + 1}
                          </td>

                          {/* Item Master Select */}
                          <td style={{ padding: "6px" }}>
                            <select
                              value={item.item_code}
                              onChange={(e) => handleSelectMasterItemInRow(item.id, e.target.value)}
                              style={{
                                width: "100%",
                                padding: "5px 6px",
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#0f172a",
                                outline: "none"
                              }}
                            >
                              {item.item_code &&
                                !(filteredMasterItemsForDropdown.otherItems || []).some((m) => m.item_code === item.item_code) &&
                                !(filteredMasterItemsForDropdown.fgItems || []).some((m) => m.item_code === item.item_code) && (
                                  <option value={item.item_code}>
                                    {item.item_code} &bull; {item.item_name || item.item_code}
                                  </option>
                                )}

                              {(filteredMasterItemsForDropdown.otherItems || []).length > 0 && (
                                <optgroup label="📦 Non-FG / Raw Materials, Bought-Out & Other Items">
                                  {(filteredMasterItemsForDropdown.otherItems || []).map((m) => (
                                    <option key={m.item_code} value={m.item_code}>
                                      {m.item_code} &bull; {m.item_name} [{m.category}]
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                              {(filteredMasterItemsForDropdown.fgItems || []).length > 0 && (
                                <optgroup label="⚙️ Finished Goods (FG - Oil Seals)">
                                  {(filteredMasterItemsForDropdown.fgItems || []).map((m) => (
                                    <option key={m.item_code} value={m.item_code}>
                                      {m.item_code} &bull; {m.item_name}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, fontWeight: 600 }}>
                              {item.item_name}
                            </div>
                          </td>

                          {/* Category and HSN come from the Item Master (entered when the item is created) */}
                          <td style={{ padding: "6px" }}>
                            <span title="Auto-filled from Item Master" style={{ display: "block", padding: "5px 6px", fontSize: 10.5, fontWeight: 600, color: "#334155" }}>
                              {item.category || "—"}
                            </span>
                          </td>

                          <td style={{ padding: "6px" }}>
                            <span title="Auto-filled from Item Master" style={{ display: "block", padding: "5px 6px", fontSize: 11, fontWeight: 700, color: "#0369a1" }}>
                              {item.hsn_code || "—"}
                            </span>
                          </td>

                          {/* Drawing No / Spec */}
                          <td style={{ padding: "6px" }}>
                            <input
                              type="text"
                              value={item.drawing_no || ""}
                              placeholder="DWG-001"
                              onChange={(e) => handleItemLineChange(item.id, "drawing_no", e.target.value)}
                              style={{
                                width: "100%",
                                padding: "5px 6px",
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                                fontSize: 11,
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                            />
                          </td>

                          {/* Make / Brand */}
                          <td style={{ padding: "6px" }}>
                            <input
                              type="text"
                              value={item.manufacturer_brand || ""}
                              placeholder="Brand"
                              onChange={(e) => handleItemLineChange(item.id, "manufacturer_brand", e.target.value)}
                              style={{
                                width: "100%",
                                padding: "5px 6px",
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                                fontSize: 11,
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                            />
                          </td>

                          {/* Required Quantity */}
                          <td style={{ padding: "6px", textAlign: "right" }}>
                            <input
                              type="number"
                              min="1"
                              value={item.req_qty}
                              onChange={(e) => handleItemLineChange(item.id, "req_qty", e.target.value)}
                              style={{
                                width: "100%",
                                padding: "5px 4px",
                                borderRadius: 4,
                                border: isQtyValid ? "1px solid #cbd5e1" : "2px solid #ef4444",
                                background: isQtyValid ? "#ffffff" : "#fef2f2",
                                fontSize: 11.5,
                                fontWeight: 700,
                                textAlign: "right",
                                outline: "none"
                              }}
                            />
                          </td>

                          {/* UOM */}
                          <td style={{ padding: "6px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                            {item.uom}
                          </td>

                          {/* Est Rate */}
                          <td style={{ padding: "6px", textAlign: "right" }}>
                            <input
                              type="number"
                              value={item.est_rate}
                              onChange={(e) => handleItemLineChange(item.id, "est_rate", e.target.value)}
                              style={{
                                width: "100%",
                                padding: "5px 4px",
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                                fontSize: 11.5,
                                textAlign: "right",
                                outline: "none"
                              }}
                            />
                          </td>

                          {/* Line Total */}
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                            ₹{Number(item.line_total || 0).toLocaleString("en-IN")}
                          </td>

                          {/* Required By Date */}
                          <td style={{ padding: "6px" }}>
                            <DateInput
                              value={item.required_by_date || item.required_date || formData.required_date || ""}
                              onChange={(e) => handleItemLineChange(item.id, "required_by_date", e.target.value)}
                              style={{
                                width: "100%",
                                padding: "4px 4px",
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                                fontSize: 10.5,
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                            />
                          </td>

                          {/* Remove Action */}
                          <td style={{ padding: "6px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveFormItemRow(item.id)}
                              title="Remove item line"
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#dc2626",
                                borderRadius: 4,
                                width: 24,
                                height: 24,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                      <td colSpan={9} style={{ padding: "10px", textAlign: "right", fontWeight: 800, color: "#334155" }}>
                        Total Estimated Requisition Value:
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", fontWeight: 900, fontSize: 13.5, color: "#0f172a" }}>
                        ₹{formData.items.reduce((sum, i) => sum + (Number(i.line_total) || 0), 0).toLocaleString("en-IN")}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>

                {formErrors.items && (
                  <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                    &bull; {formErrors.items}
                  </div>
                )}
              </div>

              {/* Modal Footer (matching ItemMasterFormPage action buttons) */}
              <div
                style={{
                  padding: "14px 24px",
                  background: "#ffffff",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {(!editingPrId || formData.status === "Draft") && (
                    <button
                      type="button"
                      onClick={() => handleSavePrWithAction("DRAFT")}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        color: "#1e293b",
                        borderRadius: 6,
                        padding: "8px 18px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Save as Draft
                    </button>
                  )}

                  {editingPrId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSavePrWithAction("SAVE")}
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 20px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)"
                        }}
                      >
                        Save Changes
                      </button>
                      {formData.status !== "Approved" && (
                        <button
                          type="button"
                          onClick={() => handleSavePrWithAction("SUBMIT")}
                          style={{
                            background: "#1e293b",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 6,
                            padding: "8px 22px",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(30, 41, 59, 0.25)"
                          }}
                        >
                          {formData.status === "Rejected" ? "Resubmit for Approval →" : "Submit for Approval →"}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="submit"
                      style={{
                        background: "#1e293b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 22px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(30, 41, 59, 0.25)"
                      }}
                    >
                      Submit for HOD Approval &rarr;
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PR FULL SPECIFICATIONS & DETAILS MODAL (VIEW PR)                 */}
      {/* ========================================================================= */}
      {detailPr && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setDetailPr(null)}
        >
          <div
            style={{
              width: 960,
              maxWidth: "100%",
              maxHeight: "92vh",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
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
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  Procurement Requisition Specification Slip
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                  {detailPr.pr_number} &bull; {detailPr.department}
                </h3>
              </div>
              <button
                onClick={() => setDetailPr(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20, fontWeight: 700 }}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {/* Header Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                  padding: "14px 18px",
                  background: "#f8fafc",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  marginBottom: 16,
                  fontSize: 12
                }}
              >
                <div><strong>PR Number:</strong> {detailPr.pr_number}</div>
                <div><strong>PR Date:</strong> {formatDisplayDate(detailPr.pr_date)}</div>
                <div><strong>Department:</strong> {detailPr.department}</div>
                <div><strong>Requested By:</strong> {detailPr.requisitioner}</div>
                <div><strong>Required By Date:</strong> {formatDisplayDate(detailPr.required_date)}</div>
                <div><strong>Priority:</strong> {detailPr.priority}</div>
                <div><strong>Target Store:</strong> {detailPr.store || "Store"}</div>
                <div><strong>Requirement Type:</strong> {detailPr.requirement_type}</div>
                <div><strong>PR Type:</strong> <span style={{ fontWeight: 700, color: "#1e40af" }}>{detailPr.pr_type || "Direct Material"}</span></div>
                <div><strong>Cost Center:</strong> <span style={{ fontWeight: 700, color: "#065f46" }}>{detailPr.cost_center || "Moulding Press 01"}</span></div>
                <div><strong>Project / WO Ref:</strong> {detailPr.project_reference || "—"}</div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>{detailPr.status}</span>
                </div>
              </div>

              {/* Mandatory Creation & Approval Timestamps Audit Card */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                  padding: "14px 18px",
                  background: "#f8fafc",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 16,
                  fontSize: 12
                }}
              >
                <div>
                  <strong style={{ color: "#334155", display: "block" }}>🕒 Generation Timestamp:</strong>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 12.5 }}>
                    {formatAuditDateTime(detailPr.created_at) || detailPr.created_at || "Recorded on creation"}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "#334155", display: "block" }}>👤 Created By:</strong>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    {detailPr.created_by || detailPr.requisitioner || "User"}
                  </span>
                </div>

                {detailPr.approved_at || detailPr.approved_by ? (
                  <>
                    <div style={{ background: "#ecfdf5", padding: "6px 10px", borderRadius: 6, border: "1px solid #a7f3d0" }}>
                      <strong style={{ color: "#065f46", display: "block" }}>✓ Approved Timestamp:</strong>
                      <span style={{ fontWeight: 800, color: "#047857", fontSize: 12.5 }}>
                        {formatAuditDateTime(detailPr.approved_at) || detailPr.approved_at || "Approved"}
                      </span>
                    </div>
                    <div style={{ background: "#ecfdf5", padding: "6px 10px", borderRadius: 6, border: "1px solid #a7f3d0" }}>
                      <strong style={{ color: "#065f46", display: "block" }}>✓ Approved By:</strong>
                      <span style={{ fontWeight: 800, color: "#047857" }}>
                        {detailPr.approved_by || "VP Operations"}
                      </span>
                    </div>
                  </>
                ) : null}

                {detailPr.updated_at && (
                  <div>
                    <strong style={{ color: "#475569", display: "block" }}>🔄 Last Updated Timestamp:</strong>
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      {formatAuditDateTime(detailPr.updated_at) || detailPr.updated_at}
                    </span>
                  </div>
                )}
                {detailPr.updated_by && (
                  <div>
                    <strong style={{ color: "#475569", display: "block" }}>Last Updated By:</strong>
                    <span style={{ fontWeight: 600, color: "#334155" }}>{detailPr.updated_by}</span>
                  </div>
                )}
              </div>

              {/* Rejection Alert if applicable */}
              {detailPr.status === "Rejected" && detailPr.rejection_reason && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    color: "#991b1b",
                    marginBottom: 16,
                    fontSize: 12.5
                  }}
                >
                  <strong>Rejection Reason:</strong> {detailPr.rejection_reason}
                </div>
              )}

              {/* Line Items Table */}
              <div style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Indented Items Breakdown ({detailPr.items ? detailPr.items.length : 0})
              </div>

              <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 16, ...purchaseRequisitionPage3Resize.tableStyle }}>
                <ResizableColGroup columns={PURCHASE_REQUISITION_PAGE_3_COLUMNS} widths={purchaseRequisitionPage3Resize.widths} />
                <thead>
                  <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "1px solid #cbd5e1" }}>
                    <th style={{ padding: "8px 6px", textAlign: "center", width: 30, fontWeight: 700 }}>#<ColumnResizeHandle colKey="sr" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700 }}>Item Code<ColumnResizeHandle colKey="item_code" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700 }}>Description &amp; Size<ColumnResizeHandle colKey="description_amp_size" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700 }}>Category<ColumnResizeHandle colKey="category" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700 }}>HSN / SAC<ColumnResizeHandle colKey="hsn_sac" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700 }}>Drawing/Spec<ColumnResizeHandle colKey="drawing_spec" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700 }}>Make/Brand<ColumnResizeHandle colKey="make_brand" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>Req Qty<ColumnResizeHandle colKey="req_qty" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>Ordered<ColumnResizeHandle colKey="ordered" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>Balance<ColumnResizeHandle colKey="balance" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700 }}>UOM<ColumnResizeHandle colKey="uom" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>Est Rate<ColumnResizeHandle colKey="est_rate" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>Line Total<ColumnResizeHandle colKey="line_total" resize={purchaseRequisitionPage3Resize} /></th>
                    <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700 }}>Need Date<ColumnResizeHandle colKey="need_date" resize={purchaseRequisitionPage3Resize} /></th>
                  </tr>
                </thead>
                <tbody>
                  {detailPr.items &&
                    detailPr.items.map((item, idx) => {
                      const req = Number(item.req_qty) || 0;
                      const ord = Number(item.ordered_qty) || 0;
                      const rem = item.remaining_qty !== undefined ? Number(item.remaining_qty) : Math.max(0, req - ord);
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                          <td style={{ padding: "6px", fontWeight: 800, color: "#0f172a" }}>{item.item_code}</td>
                          <td style={{ padding: "6px", color: "#334155" }}>{item.item_name}</td>
                          <td style={{ padding: "6px", color: "#475569" }}>{item.category}</td>
                          <td style={{ padding: "6px", color: "#0369a1", fontWeight: 700 }}>{item.hsn_code || "—"}</td>
                          <td style={{ padding: "6px", color: "#64748b" }}>{item.drawing_no || "—"}</td>
                          <td style={{ padding: "6px", color: "#64748b" }}>{item.manufacturer_brand || "—"}</td>
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                            {req.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 600, color: ord > 0 ? "#2563eb" : "#64748b" }}>
                            {ord.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 800, color: rem > 0 ? "#16a34a" : "#64748b" }}>
                            {rem.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "6px", textAlign: "center", fontWeight: 700, color: "#475569" }}>{item.uom}</td>
                          <td style={{ padding: "6px", textAlign: "right" }}>₹{Number(item.est_rate || 0).toLocaleString("en-IN")}</td>
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                            ₹{Number(item.line_total || 0).toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "6px", textAlign: "center", color: "#475569", fontSize: 11 }}>
                            {formatDisplayDate(item.required_by_date || item.required_date || detailPr.required_date) || "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                    <td colSpan={12} style={{ padding: "10px", textAlign: "right", fontWeight: 800, color: "#334155" }}>
                      Total Estimated Amount:
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: 900, fontSize: 13, color: "#0f172a" }}>
                      ₹{Number(detailPr.estimated_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>

              {/* Remarks */}
              {detailPr.remarks && (
                <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", marginBottom: 16, fontSize: 12 }}>
                  <strong>Remarks:</strong> {detailPr.remarks}
                </div>
              )}

              {/* TWO-WAY TRACEABILITY: RELATED VENDOR QUOTATIONS */}
              <div style={{ marginTop: 14, marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "8px 14px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🔗 Connected Vendor Quotations (RFQs) &bull; {relatedQuotes.length}
                  </div>
                  <button
                    onClick={() => handleCreateRfqFromPr(detailPr)}
                    style={{
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <Plus size={11} />
                    <span>Create RFQ from this PR</span>
                  </button>
                </div>
                {relatedLoading ? (
                  <div style={{ padding: 12, fontSize: 12, color: "#64748b", textAlign: "center" }}>Loading related quotations...</div>
                ) : relatedQuotes.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 12, color: "#64748b", textAlign: "center" }}>
                    No vendor quotations linked to PR #{detailPr.pr_number} yet. Click "Create RFQ from this PR" to invite vendor rates.
                  </div>
                ) : (
                  <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, ...purchaseRequisitionPage4Resize.tableStyle }}>
                    <ResizableColGroup columns={PURCHASE_REQUISITION_PAGE_4_COLUMNS} widths={purchaseRequisitionPage4Resize.widths} />
                    <thead>
                      <tr style={{ background: "#f1f5f9", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Quote #<ColumnResizeHandle colKey="quote" resize={purchaseRequisitionPage4Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Vendor Name<ColumnResizeHandle colKey="vendor_name" resize={purchaseRequisitionPage4Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "center" }}>Items<ColumnResizeHandle colKey="items" resize={purchaseRequisitionPage4Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Total Amount<ColumnResizeHandle colKey="total_amount" resize={purchaseRequisitionPage4Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "center" }}>Status<ColumnResizeHandle colKey="status" resize={purchaseRequisitionPage4Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "center" }}>Action<ColumnResizeHandle colKey="action" resize={purchaseRequisitionPage4Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedQuotes.map((q) => (
                        <tr key={q.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 800, color: "#0284c7" }}>{q.quotationNumber}</td>
                          <td style={{ padding: "6px 10px", fontWeight: 600, color: "#0f172a" }}>{q.vendorName}</td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>{(q.items || []).length}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>₹{Number(q.finalAmount || 0).toLocaleString("en-IN")}</td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: q.status === "Selected for Purchase" ? "#dcfce7" : "#e0f2fe",
                              color: q.status === "Selected for Purchase" ? "#166534" : "#0369a1"
                            }}>
                              {q.status}
                            </span>
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <button
                              onClick={() => {
                                sessionStorage.setItem("SMS_SELECTED_QUOTATION_NUMBER", q.quotationNumber);
                                if (onNavigate) onNavigate("vendor-quotations");
                              }}
                              style={{
                                background: "#1e293b",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "3px 8px",
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              Open Quote ➔
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* TWO-WAY TRACEABILITY: RELATED PURCHASE ORDERS */}
              <div style={{ marginTop: 14, marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "8px 14px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    📦 Connected Purchase Orders &bull; {relatedOrders.length}
                  </div>
                  {(detailPr.status === "Approved" || detailPr.status === "Partially Ordered") && (
                    <button
                      onClick={() => handleProcessPoFromPr(detailPr)}
                      style={{
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <ShoppingCart size={11} />
                      <span>Process PO for Balance</span>
                    </button>
                  )}
                </div>
                {relatedLoading ? (
                  <div style={{ padding: 12, fontSize: 12, color: "#64748b", textAlign: "center" }}>Loading related orders...</div>
                ) : relatedOrders.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 12, color: "#64748b", textAlign: "center" }}>
                    No Purchase Orders generated yet for PR #{detailPr.pr_number}.
                  </div>
                ) : (
                  <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, ...purchaseRequisitionPage5Resize.tableStyle }}>
                    <ResizableColGroup columns={PURCHASE_REQUISITION_PAGE_5_COLUMNS} widths={purchaseRequisitionPage5Resize.widths} />
                    <thead>
                      <tr style={{ background: "#f1f5f9", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>PO #<ColumnResizeHandle colKey="po" resize={purchaseRequisitionPage5Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>PO Date<ColumnResizeHandle colKey="po_date" resize={purchaseRequisitionPage5Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Vendor<ColumnResizeHandle colKey="vendor" resize={purchaseRequisitionPage5Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Grand Total<ColumnResizeHandle colKey="grand_total" resize={purchaseRequisitionPage5Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "center" }}>Status<ColumnResizeHandle colKey="status" resize={purchaseRequisitionPage5Resize} /></th>
                        <th style={{ padding: "6px 10px", textAlign: "center" }}>Action<ColumnResizeHandle colKey="action" resize={purchaseRequisitionPage5Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedOrders.map((o) => (
                        <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 800, color: "#0284c7" }}>{o.poNumber}</td>
                          <td style={{ padding: "6px 10px", color: "#334155" }}>{formatDisplayDate(o.poDate)}</td>
                          <td style={{ padding: "6px 10px", fontWeight: 600, color: "#0f172a" }}>{o.vendorName}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800 }}>₹{Number(o.grandTotal || 0).toLocaleString("en-IN")}</td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: "#dcfce7",
                              color: "#166534"
                            }}>
                              {o.status || "APPROVED"}
                            </span>
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <button
                              onClick={() => {
                                sessionStorage.setItem("SMS_SELECTED_PO_NUMBER", o.poNumber);
                                if (onNavigate) onNavigate("purchase-orders");
                              }}
                              style={{
                                background: "#1e293b",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "3px 8px",
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              Open PO ➔
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Approval History Timeline */}
              {detailPr.approval_history && detailPr.approval_history.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    Audit &amp; Approval Timeline History
                  </div>
                  <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 16, ...purchaseRequisitionPage6Resize.tableStyle }}>
                    <ResizableColGroup columns={PURCHASE_REQUISITION_PAGE_6_COLUMNS} widths={purchaseRequisitionPage6Resize.widths} />
                    <thead>
                      <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "1px solid #cbd5e1" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Timestamp<ColumnResizeHandle colKey="timestamp" resize={purchaseRequisitionPage6Resize} /></th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>User<ColumnResizeHandle colKey="user" resize={purchaseRequisitionPage6Resize} /></th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Action<ColumnResizeHandle colKey="action" resize={purchaseRequisitionPage6Resize} /></th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Status<ColumnResizeHandle colKey="status" resize={purchaseRequisitionPage6Resize} /></th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Remarks<ColumnResizeHandle colKey="remarks" resize={purchaseRequisitionPage6Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailPr.approval_history.map((hist, hIdx) => (
                        <tr key={hIdx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "6px 8px", color: "#64748b" }}>{hist.timestamp}</td>
                          <td style={{ padding: "6px 8px", fontWeight: 700, color: "#0f172a" }}>{hist.user}</td>
                          <td style={{ padding: "6px 8px", color: "#334155" }}>{hist.action}</td>
                          <td style={{ padding: "6px 8px", fontWeight: 700 }}>{hist.status}</td>
                          <td style={{ padding: "6px 8px", color: "#64748b" }}>{hist.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                padding: "14px 24px",
                background: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <button
                onClick={handlePrint}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Printer size={14} />
                <span>Print Slip</span>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {detailPr.status !== "Converted to PO" && detailPr.status !== "Fully Ordered" && (
                  <button
                    onClick={() => handleOpenEditModal(detailPr)}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      color: "#1e293b",
                      borderRadius: 6,
                      padding: "8px 16px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <Pencil size={14} />
                    <span>Edit PR</span>
                  </button>
                )}
                {detailPr.status === "Pending Approval" && (
                  <>
                    <button
                      onClick={() => handleApprovePr(detailPr)}
                      style={{
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 18px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Approve PR
                    </button>
                    <button
                      onClick={() => {
                        setRejectingPrTarget(detailPr);
                        setRejectionReasonText("");
                      }}
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 18px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Reject PR
                    </button>
                  </>
                )}

                {(detailPr.status === "Approved" || detailPr.status === "Partially Ordered") && (
                  <>
                    <button
                      onClick={() => handleCreateRfqFromPr(detailPr)}
                      style={{
                        background: "#0284c7",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <FileSpreadsheet size={14} />
                      <span>Create RFQ / Quote</span>
                    </button>
                    <button
                      onClick={() => handleProcessPoFromPr(detailPr)}
                      style={{
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <ShoppingCart size={14} />
                      <span>Process PO</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setDetailPr(null)}
                  style={{
                    background: "#1e293b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 20px",
                    fontSize: 12.5,
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
      {/* MODAL 3: REJECTION REASON MODAL                                           */}
      {/* ========================================================================= */}
      {rejectingPrTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setRejectingPrTarget(null)}
        >
          <div
            style={{
              width: 480,
              maxWidth: "100%",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", background: "#991b1b", color: "#ffffff" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Reject Purchase Requisition</h3>
              <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#fecaca" }}>
                PR #{rejectingPrTarget.pr_number} &bull; Mandatory Justification
              </p>
            </div>

            <div style={{ padding: "20px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Reason for Rejection *
              </label>
              <textarea
                rows={4}
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="e.g. Existing stock sufficient in central store. Please verify before requesting..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div
              style={{
                padding: "12px 20px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10
              }}
            >
              <button
                type="button"
                onClick={() => setRejectingPrTarget(null)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectPr}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 18px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      {deletePrTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setDeletePrTarget(null)}
        >
          <div
            style={{
              width: 440,
              maxWidth: "100%",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
              padding: "20px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              Confirm Delete PR?
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
              Are you sure you want to permanently delete Requisition <strong>"{deletePrTarget.pr_number}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setDeletePrTarget(null)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeletePr}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 18px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Delete PR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
