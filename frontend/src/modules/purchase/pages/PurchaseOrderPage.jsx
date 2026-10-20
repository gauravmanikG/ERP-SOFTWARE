import { formatDisplayDate, formatDisplayDateTime } from "../../../shared/utils/dateFormat";
import DateInput from "../../../shared/components/DateInput";
import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { INITIAL_PR_DATA, formatAuditDateTime } from "./PurchaseRequisitionPage";

// ============================================================================
// ICONS (Custom SVG icons matching Silver Muller ERP style)
// ============================================================================
const Icons = {
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  Cross: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
  FileText: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  Printer: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  ),
  Building: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
      <path d="M9 22v-4h6v4"></path>
      <path d="M8 6h.01"></path>
      <path d="M16 6h.01"></path>
      <path d="M8 10h.01"></path>
      <path d="M16 10h.01"></path>
      <path d="M8 14h.01"></path>
      <path d="M16 14h.01"></path>
    </svg>
  ),
  AlertCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  ),
  CheckCircle2: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  )
};

// ============================================================================
// SEED DEFAULT APPROVED PR IF LOCALSTORAGE IS EMPTY
// ============================================================================
const DEFAULT_SEED_APPROVED_PR = {
  id: "PR-2026-00001",
  pr_number: "PR-2026-00001",
  pr_date: "2026-10-06",
  required_date: "2026-10-15",
  requisitioner: "Rahul Sharma",
  department: "Moulding",
  store: "Raw Material Store",
  priority: "High",
  requirement_type: "Production Requirement",
  purpose: "High-volume batch manufacturing requirement for automotive OEM seals",
  remarks: "Raw material grades tested and approved by QA lab",
  status: "Approved",
  created_by: "Rahul Sharma",
  created_at: "06-Oct-2026 10:15 AM",
  approved_by: "VP Operations",
  approved_at: "06-Oct-2026 11:30 AM",
  items: [
    {
      id: 101,
      item_code: "100000000005",
      item_name: "10X22X7 TTO TC OIL SEAL",
      description: "10X22X7 TTO TC Oil Seal NBR Black Standard",
      category: "Oil Seal",
      req_qty: 1000,
      ordered_qty: 0,
      remaining_qty: 1000,
      uom: "PCS",
      required_date: "2026-10-15",
      est_rate: 22.5,
      remarks: "Batch trial requirement"
    },
    {
      id: 102,
      item_code: "100000000006",
      item_name: "10X22X8 NBR OIL SEAL",
      description: "10X22X8 Rotary Shaft Oil Seal NBR 70 Shore",
      category: "Oil Seal",
      req_qty: 500,
      ordered_qty: 0,
      remaining_qty: 500,
      uom: "PCS",
      required_date: "2026-10-14",
      est_rate: 26.0,
      remarks: "Critical assembly line component"
    },
    {
      id: 103,
      item_code: "100000000007",
      item_name: "10X24X7 TTO TC DOUBLE LIP",
      description: "10X24X7 Double Lip Oil Seal Metal Insert",
      category: "Oil Seal",
      req_qty: 250,
      ordered_qty: 0,
      remaining_qty: 250,
      uom: "PCS",
      required_date: "2026-10-16",
      est_rate: 34.0,
      remarks: "Export batch component"
    }
  ]
};

export function PurchaseOrderPage({
  dark = false,
  initialTab = "processing", // "processing" | "approval" | "orders"
  onBackToHome,
  onOpenSidebar,
  sidebarOpen,
  onNavigate
}) {
  // Theme styling aligned with ItemMasterFormPage.jsx
  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const textPrimary = dark ? "#f8fafc" : "#0f172a";
  const textSecondary = dark ? "#94a3b8" : "#64748b";
  const borderCol = dark ? "rgba(148, 163, 184, 0.14)" : "#e2e8f0";

  // Active top-level workflow tab
  const [activeTab, setActiveTab] = useState(initialTab); // "processing" | "approval" | "orders"

  // Sync activeTab when initialTab prop changes from navigation
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ==========================================================================
  // REAL BACKEND VENDOR MASTER DATA (/api/suppliers)
  // ==========================================================================
  const [vendorList, setVendorList] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const fetchVendors = async () => {
    setVendorsLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        // Active vendors only as specified in prompt
        const activeOnly = Array.isArray(data)
          ? data.filter((v) => !v.status || v.status.toUpperCase() === "ACTIVE")
          : [];
        setVendorList(activeOnly);
      }
    } catch (err) {
      console.warn("Could not load vendors from backend:", err);
    } finally {
      setVendorsLoading(false);
    }
  };

  // ==========================================================================
  // HSN & SAC TAX MASTER DATA SOURCE (/api/purchase/hsn-master)
  // ==========================================================================
  const [hsnMasterList, setHsnMasterList] = useState([]);
  const [hsnLoading, setHsnLoading] = useState(false);
  const [isHsnModalOpen, setIsHsnModalOpen] = useState(false);

  const fetchHsnMaster = async () => {
    setHsnLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/purchase/hsn-master");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setHsnMasterList(data);
      }
    } catch (err) {
      console.warn("Could not load HSN master from backend:", err);
    } finally {
      setHsnLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchHsnMaster();
  }, []);

  // ==========================================================================
  // APPROVED PR DATA SOURCE (reads from localStorage & syncs)
  // Supports Statuses: Approved, Partially Ordered, PO Generated
  // ==========================================================================
  const getInitialApprovedPrs = () => {
    try {
      const saved = localStorage.getItem("SMS_PURCHASE_REQUISITION_DATA_REAL_V2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const onlyApproved = parsed.filter(
            (p) =>
              p.status &&
              (p.status.toLowerCase() === "approved" ||
                p.status.toLowerCase() === "partially ordered" ||
                p.status.toLowerCase() === "po generated" ||
                p.status.toLowerCase() === "fully ordered")
          );
          if (onlyApproved.length > 0) return onlyApproved;
        }
      }
    } catch {
      // ignore
    }
    return [];
  };

  const [approvedPrs, setApprovedPrs] = useState(getInitialApprovedPrs);

  const refreshApprovedPrs = async () => {
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
            purpose: pr.purpose,
            remarks: pr.remarks,
            status: pr.status,
            generated_pos: pr.generatedPos || pr.generated_pos || [],
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
                remarks: it.remarks
              };
            })
          }));

          const onlyApproved = normalized.filter(
            (p) =>
              p.status &&
              (p.status.toLowerCase() === "approved" ||
                p.status.toLowerCase() === "partially ordered" ||
                p.status.toLowerCase() === "po generated" ||
                p.status.toLowerCase() === "fully ordered")
          );

          setApprovedPrs(onlyApproved.length > 0 ? onlyApproved : normalized);
          localStorage.setItem("SMS_PURCHASE_REQUISITION_DATA_REAL_V2", JSON.stringify(normalized));
          return;
        }
      }
    } catch (e) {
      console.warn("Could not load PRs from backend:", e);
    }

    try {
      const saved = localStorage.getItem("SMS_PURCHASE_REQUISITION_DATA_REAL_V2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const onlyApproved = parsed.filter(
            (p) =>
              p.status &&
              (p.status.toLowerCase() === "approved" ||
                p.status.toLowerCase() === "partially ordered" ||
                p.status.toLowerCase() === "po generated" ||
                p.status.toLowerCase() === "fully ordered")
          );
          setApprovedPrs(onlyApproved);
          return;
        }
      }
    } catch {
      // ignore
    }
    setApprovedPrs([]);
  };

  // ==========================================================================
  // REAL BACKEND VENDOR QUOTATIONS STATE (/api/purchase/quotations)
  // ==========================================================================
  const [allQuotations, setAllQuotations] = useState([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);

  const fetchQuotations = async () => {
    setQuotationsLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/purchase/quotations");
      if (res.ok) {
        const data = await res.json();
        setAllQuotations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Could not load vendor quotations:", err);
    } finally {
      setQuotationsLoading(false);
    }
  };

  // ==========================================================================
  // BACKEND PURCHASE PROPOSALS & ORDERS STATE
  // ==========================================================================
  const [proposals, setProposals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);

  const fetchProposals = async () => {
    setProposalsLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/purchase/proposals");
      if (res.ok) {
        const data = await res.json();
        const seen = new Set();
        const unique = (Array.isArray(data) ? data : []).filter((p) => {
          const key = p.proposalNumber || p.id;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setProposals(unique);
      }
    } catch (err) {
      console.warn("Could not fetch purchase proposals:", err);
    } finally {
      setProposalsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/purchase/orders");
      if (res.ok) {
        const data = await res.json();
        const seen = new Set();
        const unique = (Array.isArray(data) ? data : []).filter((o) => {
          const key = o.poNumber || o.id;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setOrders(unique);
      }
    } catch (err) {
      console.warn("Could not fetch purchase orders:", err);
    }
  };

  useEffect(() => {
    refreshApprovedPrs();
    fetchProposals();
    fetchOrders();
    fetchQuotations();
  }, []);


  // ==========================================================================
  // SCREEN 1: PURCHASE PROCESSING WORKFLOW STATE
  // Mode: "PR_LIST" (Part A) | "PR_DETAILS" (Part B) | "PURCHASE_ENTRY" (Part C, D, E, F)
  // ==========================================================================
  const [processingMode, setProcessingMode] = useState("PR_LIST");
  const [activePr, setActivePr] = useState(null); // The currently opened approved PR
  const [selectedItemIds, setSelectedItemIds] = useState(new Set()); // Selected items for purchase now
  const [purchaseLines, setPurchaseLines] = useState([]); // Editable line items with vendor, rates, discounts, taxes
  const [vendorChargesMap, setVendorChargesMap] = useState({}); // Vendor-level freight, other charges, round-off
  const [selectedPoType, setSelectedPoType] = useState("Standard PO"); // Active PO type for current proposal (Standard, Planned, Blanket, etc.)
  const [backendCalculation, setBackendCalculation] = useState(null); // Result from POST /api/purchase/calculate
  const [calcLoading, setCalcLoading] = useState(false);

  // Search and column filters for Part A (Approved PR List)
  const [prSearchTerm, setPrSearchTerm] = useState("");
  const [prDeptFilter, setPrDeptFilter] = useState("ALL");
  const [prPriorityFilter, setPrPriorityFilter] = useState("ALL");
  const [prColFilters, setPrColFilters] = useState({
    prNumber: "",
    prDate: "",
    department: "",
    requestedBy: "",
    requiredDate: "",
    priority: ""
  });

  // Filtered Approved PR list
  const filteredApprovedPrs = useMemo(() => {
    return approvedPrs.filter((pr) => {
      // Global Search
      if (prSearchTerm.trim()) {
        const q = prSearchTerm.toLowerCase();
        const matchesGlobal =
          (pr.pr_number && pr.pr_number.toLowerCase().includes(q)) ||
          (pr.department && pr.department.toLowerCase().includes(q)) ||
          (pr.requisitioner && pr.requisitioner.toLowerCase().includes(q)) ||
          (pr.purpose && pr.purpose.toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      // Dept Pill
      if (prDeptFilter !== "ALL" && pr.department !== prDeptFilter) {
        return false;
      }

      // Priority Pill
      if (prPriorityFilter !== "ALL" && (pr.priority || "").toUpperCase() !== prPriorityFilter.toUpperCase()) {
        return false;
      }

      // Per-column filters
      if (prColFilters.prNumber && (!pr.pr_number || !pr.pr_number.toLowerCase().includes(prColFilters.prNumber.toLowerCase()))) return false;
      if (prColFilters.prDate && (!pr.pr_date || !pr.pr_date.toLowerCase().includes(prColFilters.prDate.toLowerCase()))) return false;
      if (prColFilters.department && (!pr.department || !pr.department.toLowerCase().includes(prColFilters.department.toLowerCase()))) return false;
      if (prColFilters.requestedBy && (!pr.requisitioner || !pr.requisitioner.toLowerCase().includes(prColFilters.requestedBy.toLowerCase()))) return false;
      if (prColFilters.requiredDate && (!pr.required_date || !pr.required_date.toLowerCase().includes(prColFilters.requiredDate.toLowerCase()))) return false;
      if (prColFilters.priority && (!pr.priority || !pr.priority.toLowerCase().includes(prColFilters.priority.toLowerCase()))) return false;

      return true;
    });
  }, [approvedPrs, prSearchTerm, prDeptFilter, prPriorityFilter, prColFilters]);

  // Handle opening an approved PR (Part B)
  const handleOpenPr = (pr) => {
    setActivePr(pr);
    // Pre-select all items that have remaining qty > 0
    const items = pr.items || [];
    const availableIds = new Set(
      items
        .filter((it) => {
          const rem = (it.req_qty || 0) - (it.ordered_qty || 0);
          return rem > 0;
        })
        .map((it) => it.id)
    );
    setSelectedItemIds(availableIds.size > 0 ? availableIds : new Set(items.map((it) => it.id)));
    setProcessingMode("PR_DETAILS");
  };

  // Connection 3 & Auto-Jump: Listen to sessionStorage for targeted PRs, Quotes, or POs
  useEffect(() => {
    // 1. PO Number jump (e.g. from PR detail jump to PO)
    const targetPoNum = sessionStorage.getItem("SMS_SELECTED_PO_NUMBER");
    if (targetPoNum && orders.length > 0) {
      sessionStorage.removeItem("SMS_SELECTED_PO_NUMBER");
      setActiveTab("orders");
      const foundPo = orders.find((o) => o.poNumber === targetPoNum);
      if (foundPo) setViewingPo(foundPo);
    }

    // 2. PR / Quote jump for PO Processing
    const targetPrRaw = sessionStorage.getItem("SMS_SELECTED_PR_FOR_PO") || sessionStorage.getItem("SMS_SELECTED_PR_NUMBER");
    const targetQuoteRaw = sessionStorage.getItem("SMS_SELECTED_QUOTATION_FOR_PO");

    if (targetPrRaw) {
      let prObj = null;
      let targetPrNum = "";
      try {
        const parsed = JSON.parse(targetPrRaw);
        if (typeof parsed === "object" && parsed !== null) {
          prObj = parsed;
          targetPrNum = parsed.pr_number || parsed.prNumber || parsed.id || "";
        } else {
          targetPrNum = String(parsed);
        }
      } catch {
        targetPrNum = targetPrRaw;
      }

      const matchingPr = approvedPrs.find(
        (p) =>
          (p.pr_number && p.pr_number === targetPrNum) ||
          (p.prNumber && p.prNumber === targetPrNum) ||
          String(p.id) === String(targetPrNum)
      ) || prObj;

      if (matchingPr) {
        sessionStorage.removeItem("SMS_SELECTED_PR_FOR_PO");
        sessionStorage.removeItem("SMS_SELECTED_PR_NUMBER");
        setActiveTab("processing");
        setApprovedPrs((prev) => {
          const num = matchingPr.pr_number || matchingPr.prNumber;
          if (prev.some((p) => (p.pr_number || p.prNumber) === num)) return prev;
          return [matchingPr, ...prev];
        });
        if (matchingPr.directToPurchaseEntry || matchingPr.isClubbingBatch) {
          handleProceedWithClubbingBatch(matchingPr);
        } else {
          handleOpenPr(matchingPr);
        }

        if (targetQuoteRaw) {
          try {
            const quoteObj = JSON.parse(targetQuoteRaw);
            sessionStorage.removeItem("SMS_SELECTED_QUOTATION_FOR_PO");
            setTimeout(() => {
              handleProceedWithQuotation(matchingPr, quoteObj);
            }, 100);
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }
  }, [approvedPrs, orders]);

  // Handle proceeding to purchase with an evaluated Quotation pre-applied
  const handleProceedWithQuotation = (targetPr, quote) => {
    setActivePr(targetPr);
    const items = targetPr.items || [];
    const availableIds = new Set(
      items
        .filter((it) => {
          const rem = (it.req_qty || 0) - (it.ordered_qty || 0);
          return rem > 0;
        })
        .map((it) => it.id)
    );
    setSelectedItemIds(availableIds.size > 0 ? availableIds : new Set(items.map((it) => it.id)));

    const selected = (targetPr.items || []).filter((it) =>
      availableIds.size > 0 ? availableIds.has(it.id) : true
    );

    const initialLines = selected.map((it) => {
      const remaining = Math.max(0, (it.req_qty || 0) - (it.ordered_qty || 0));
      const qItems = quote.items || [];
      const matchingQItem = qItems.find(
        (qi) => qi.itemCode === it.item_code || qi.itemName === it.item_name
      );

      const offeredRate = matchingQItem ? Number(matchingQItem.unitRate) : Number(quote.rate || it.est_rate || 0);
      const taxPct = matchingQItem ? Number(matchingQItem.taxPercent) : Number(quote.taxPercent || 18);
      const discPct = matchingQItem ? Number(matchingQItem.discountPercent) : Number(quote.discountPercent || 0);

      return {
        itemCode: it.item_code || "",
        itemName: it.item_name || "",
        description: it.description || "",
        category: it.category || "RAW_MATERIAL",
        uom: it.uom || "PCS",
        vendorCode: quote.vendorCode || "",
        vendorName: quote.vendorName || "",
        quantity: remaining > 0 ? remaining : it.req_qty || 1,
        unitRate: offeredRate,
        discountPercent: discPct,
        manualDiscount: 0,
        taxType: "GST",
        taxPercent: taxPct,
        deliveryCharges: 0,
        otherCharges: 0,
        expectedDeliveryDate: it.required_date || targetPr.required_date || "",
        deliveryLocation: "Main Plant Warehouse, Silvassa",
        remarks: `Applied quotation ${quote.quotationNumber}`,
        sourceQuotationNumber: quote.quotationNumber,
        sourceQuotationId: quote.id
      };
    });

    setPurchaseLines(initialLines);
    const quoteCharges = {
      [quote.vendorCode || "UNASSIGNED"]: { deliveryFreight: 0, otherCharges: 0, roundOff: 0, poType: selectedPoType || "Standard PO" }
    };
    setVendorChargesMap(quoteCharges);
    setProcessingMode("PURCHASE_ENTRY");
    triggerBackendCalculate(initialLines, quoteCharges);
    showToast(`Quotation #${quote.quotationNumber} from ${quote.vendorName} pre-populated!`);
  };

  // Handle proceeding to purchase with PR Clubbing Batch pre-applied
  const handleProceedWithClubbingBatch = (batchPr) => {
    setActivePr(batchPr);
    const items = batchPr.items || [];
    setSelectedItemIds(new Set(items.map((it) => it.id || it.item_code)));

    const initialLines = items.map((it) => {
      const remaining = Number(it.remaining_qty !== undefined ? it.remaining_qty : it.req_qty) || 1;
      return {
        itemCode: it.item_code || it.itemCode || "",
        itemName: it.item_name || it.itemName || "",
        description: it.description || "",
        category: it.category || "Raw Material",
        uom: it.uom || "PCS",
        vendorCode: "",
        vendorName: "",
        quantity: remaining,
        unitRate: Number(it.est_rate || it.estRate) || 0,
        discountPercent: 0,
        manualDiscount: 0,
        taxType: "GST",
        taxPercent: 18,
        deliveryCharges: 0,
        otherCharges: 0,
        expectedDeliveryDate: it.required_date || batchPr.required_date || "",
        deliveryLocation: "Main Plant Warehouse, Silvassa",
        remarks: it.remarks || `Consolidated from Batch ${batchPr.clubbingBatchNumber || batchPr.pr_number}`,
        prNumber: it.pr_number || batchPr.pr_number || "",
        clubbingBatchId: it.clubbingBatchId || batchPr.clubbingBatchId || null,
        clubbingBatchNumber: it.clubbingBatchNumber || batchPr.clubbingBatchNumber || null
      };
    });

    setPurchaseLines(initialLines);
    const batchCharges = {
      UNASSIGNED: { deliveryFreight: 0, otherCharges: 0, roundOff: 0, poType: selectedPoType || "Standard PO" }
    };
    setVendorChargesMap(batchCharges);
    setProcessingMode("PURCHASE_ENTRY");
    triggerBackendCalculate(initialLines, batchCharges);
    showToast(`Clubbing Batch #${batchPr.clubbingBatchNumber || batchPr.pr_number} loaded for PO creation!`);
  };

  // Toggle item selection checkbox in Part B
  const toggleItemSelection = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllItems = () => {
    if (!activePr || !activePr.items) return;
    if (selectedItemIds.size === activePr.items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(activePr.items.map((it) => it.id)));
    }
  };

  // Apply quotation snapshot to a specific line in Purchase Entry
  const handleApplyQuotationToLine = (lineIndex, quote, quoteItem) => {
    setPurchaseLines((prev) => {
      const updated = [...prev];
      const curr = { ...updated[lineIndex] };

      curr.vendorCode = quote.vendorCode || curr.vendorCode;
      curr.vendorName = quote.vendorName || curr.vendorName;

      if (quoteItem) {
        curr.unitRate = Number(quoteItem.unitRate) || curr.unitRate;
        if (quoteItem.taxPercent != null) curr.taxPercent = Number(quoteItem.taxPercent);
        if (quoteItem.discountPercent != null) curr.discountPercent = Number(quoteItem.discountPercent);
      } else if (quote.rate != null || quote.unitRate != null) {
        curr.unitRate = Number(quote.rate || quote.unitRate);
      }

      curr.sourceQuotationNumber = quote.quotationNumber;
      curr.sourceQuotationId = quote.id;
      curr.remarks = `Rate ₹${curr.unitRate} applied from quote ${quote.quotationNumber}`;

      updated[lineIndex] = curr;
      triggerBackendCalculate(updated, vendorChargesMap);
      return updated;
    });

    showToast(`Applied quotation ${quote.quotationNumber} (${quote.vendorName}) at ₹${quoteItem?.unitRate || quote.rate || 0}!`);
  };

  // Remove quotation snapshot from a specific line
  const handleClearQuotationFromLine = (lineIndex) => {
    setPurchaseLines((prev) => {
      const updated = [...prev];
      const curr = { ...updated[lineIndex] };
      curr.sourceQuotationNumber = null;
      curr.sourceQuotationId = null;
      updated[lineIndex] = curr;
      triggerBackendCalculate(updated, vendorChargesMap);
      return updated;
    });
    showToast("Quotation link removed from line item.");
  };


  // Proceed from Part B to Part C (Purchase Entry)
  const handleProceedToPurchase = () => {
    if (selectedItemIds.size === 0) {
      alert("Please select at least one item to proceed to purchase.");
      return;
    }
    const selected = (activePr.items || []).filter((it) => selectedItemIds.has(it.id));

    // Initialize purchase lines
    const initialLines = selected.map((it) => {
      const remaining = Math.max(0, (it.req_qty || 0) - (it.ordered_qty || 0));
      return {
        itemCode: it.item_code || "",
        itemName: it.item_name || "",
        description: it.description || "",
        category: it.category || "RAW_MATERIAL",
        uom: it.uom || "PCS",
        vendorCode: "", // User selects vendor from Vendor Master
        vendorName: "",
        quantity: remaining > 0 ? remaining : it.req_qty || 1,
        unitRate: it.est_rate || 0,
        discountPercent: 0,
        manualDiscount: 0,
        taxType: "GST",
        taxPercent: 18,
        hsnCode: it.hsn_code || it.hsnCode || "",
        deliveryCharges: 0,
        otherCharges: 0,
        expectedDeliveryDate: it.required_date || activePr.required_date || "",
        deliveryLocation: "Main Plant Warehouse, Silvassa",
        remarks: it.remarks || "",
        prNumber: it.pr_number || activePr.pr_number || "",
        clubbingBatchId: it.clubbingBatchId || activePr.clubbingBatchId || null,
        clubbingBatchNumber: it.clubbingBatchNumber || activePr.clubbingBatchNumber || null
      };
    });

    setPurchaseLines(initialLines);
    const initialCharges = {
      UNASSIGNED: { deliveryFreight: 0, otherCharges: 0, roundOff: 0, poType: selectedPoType || "Standard PO" }
    };
    setVendorChargesMap(initialCharges);
    setProcessingMode("PURCHASE_ENTRY");

    // Perform initial calculate
    triggerBackendCalculate(initialLines, initialCharges);
  };

  // Perform Automatic Monetary Calculation via Spring Boot backend (/api/purchase/calculate)
  const triggerBackendCalculate = async (lines, charges) => {
    setCalcLoading(true);
    try {
      const payload = {
        items: lines.map((l) => ({
          ...l,
          quantity: Number(l.quantity) || 0,
          unitRate: Number(l.unitRate) || 0,
          discountPercent: Number(l.discountPercent) || 0,
          manualDiscount: Number(l.manualDiscount) || 0,
          taxPercent: Number(l.taxPercent) || 0,
          hsnCode: l.hsnCode || ""
        })),
        vendorCharges: charges
      };

      const res = await fetch("http://localhost:4000/api/purchase/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setBackendCalculation(data);
      }
    } catch (err) {
      console.warn("Backend calculation error:", err);
    } finally {
      setCalcLoading(false);
    }
  };

  // Update a line field in Part D (rate, qty, discount, tax, vendor, etc.)
  const handleLineChange = (index, field, value) => {
    setPurchaseLines((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // If vendor code changed, find vendor in master and update vendor details
      if (field === "vendorCode") {
        const found = vendorList.find((v) => v.supplierCode === value);
        item.vendorName = found ? found.supplierName : "";

        // Inherit poType and extra charges from UNASSIGNED so user selection is NEVER wiped out
        setVendorChargesMap((prevCharges) => {
          if (value && !prevCharges[value]) {
            const inherited = prevCharges["UNASSIGNED"] || { deliveryFreight: 0, otherCharges: 0, roundOff: 0, poType: selectedPoType || "Standard PO" };
            return {
              ...prevCharges,
              [value]: {
                ...inherited,
                poType: selectedPoType || inherited.poType || "Standard PO"
              }
            };
          }
          return prevCharges;
        });
      }

      // If HSN code changed, auto-lookup HSN rate and update taxPercent
      if (field === "hsnCode") {
        const foundHsn = hsnMasterList.find((h) => h.hsnSacCode === value);
        if (foundHsn) {
          item.hsnDescription = foundHsn.description;
          item.taxPercent = Number(foundHsn.gstRate) || 18;
        }
      }

      updated[index] = item;
      triggerBackendCalculate(updated, vendorChargesMap);
      return updated;
    });
  };

  // Global handler for switching PO Type across the proposal workflow
  const handlePoTypeChange = (newPoType) => {
    setSelectedPoType(newPoType);
    setVendorChargesMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = { ...updated[key], poType: newPoType };
      });
      updated["UNASSIGNED"] = { ...(updated["UNASSIGNED"] || {}), poType: newPoType };
      return updated;
    });
  };

  // Update vendor extra charge (freight, other charges, round off, poType, deliverySchedules, paymentMilestones)
  const handleVendorChargeChange = (vCode, fieldOrUpdates, value) => {
    let nextCharges = null;
    let shouldRecalculateMonetary = false;

    setVendorChargesMap((prev) => {
      const curr = prev[vCode] || prev["UNASSIGNED"] || { deliveryFreight: 0, otherCharges: 0, roundOff: 0, poType: selectedPoType || "Standard PO" };
      let nextGroup = { ...curr };
      let newPoType = null;

      if (typeof fieldOrUpdates === "object" && fieldOrUpdates !== null) {
        nextGroup = { ...nextGroup, ...fieldOrUpdates };
        if (fieldOrUpdates.poType) newPoType = fieldOrUpdates.poType;
        if (fieldOrUpdates.deliveryFreight !== undefined || fieldOrUpdates.otherCharges !== undefined || fieldOrUpdates.roundOff !== undefined) {
          shouldRecalculateMonetary = true;
        }
      } else {
        const field = fieldOrUpdates;
        const parsedVal = (field === "poType" || field === "deliverySchedules" || field === "paymentMilestones")
          ? value
          : (Number(value) || 0);
        nextGroup[field] = parsedVal;
        if (field === "poType") newPoType = parsedVal;
        if (field === "deliveryFreight" || field === "otherCharges" || field === "roundOff") {
          shouldRecalculateMonetary = true;
        }
      }

      const updated = { ...prev, [vCode]: nextGroup };

      // Propagate poType to all vendors and UNASSIGNED so switching vendor never resets it
      const targetPoType = newPoType || nextGroup.poType || selectedPoType;
      if (targetPoType) {
        Object.keys(updated).forEach((k) => {
          updated[k] = { ...updated[k], poType: targetPoType };
        });
        updated["UNASSIGNED"] = { ...(updated["UNASSIGNED"] || {}), poType: targetPoType };
      }

      nextCharges = updated;
      return updated;
    });

    if (typeof fieldOrUpdates === "string" && fieldOrUpdates === "poType") {
      setSelectedPoType(value);
    } else if (typeof fieldOrUpdates === "object" && fieldOrUpdates?.poType) {
      setSelectedPoType(fieldOrUpdates.poType);
    }

    if (shouldRecalculateMonetary && nextCharges) {
      triggerBackendCalculate(purchaseLines, nextCharges);
    }
  };

  // Save Draft Proposal or Submit for PO Approval
  const handleSaveOrSubmitProposal = async (isSubmit) => {
    if (purchaseLines.length === 0) {
      alert("No items in purchase proposal.");
      return;
    }

    // Validation for submission
    if (isSubmit) {
      for (let i = 0; i < purchaseLines.length; i++) {
        const l = purchaseLines[i];
        if (!l.vendorCode) {
          alert(`Please select a vendor from Vendor Master for item "${l.itemName || l.itemCode}".`);
          return;
        }
        if (!l.unitRate || Number(l.unitRate) <= 0) {
          alert(`Please enter a valid vendor-offered Unit Rate greater than 0 for item "${l.itemName || l.itemCode}".`);
          return;
        }
        if (!l.quantity || Number(l.quantity) <= 0) {
          alert(`Please enter a valid Purchase Quantity for item "${l.itemName || l.itemCode}".`);
          return;
        }
        if (activePr && activePr.items) {
          const prItem = activePr.items.find((it) => it.item_code === l.itemCode);
          if (prItem) {
            const rem = prItem.remaining_qty !== undefined ? Number(prItem.remaining_qty) : Math.max(0, (prItem.req_qty || 0) - (prItem.ordered_qty || 0));
            if (Number(l.quantity) > rem) {
              alert(`Requested quantity exceeds available PR balance.`);
              return;
            }
          }
        }
      }
    }

    try {
      const payload = {
        prNumber: activePr.pr_number,
        prDate: activePr.pr_date,
        department: activePr.department,
        requestedBy: activePr.requisitioner,
        requiredByDate: activePr.required_date,
        priority: activePr.priority,
        purpose: activePr.purpose || activePr.requirement_type,
        remarks: activePr.remarks,
        clubbingBatchId: activePr.clubbingBatchId || null,
        clubbingBatchNumber: activePr.clubbingBatchNumber || null,
        items: purchaseLines,
        vendorCharges: vendorChargesMap,
        createdBy: "Purchasing Officer (Kiran B.)"
      };

      const res = await fetch(`http://localhost:4000/api/purchase/proposals?submit=${isSubmit}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.error || "Failed to save proposal.");
        return;
      }

      const savedProposal = await res.json();
      fetchProposals();

      if (isSubmit) {
        showToast(`Proposal ${savedProposal.proposalNumber} submitted for PO Approval!`);
        refreshApprovedPrs();
        // Return to proposal review or PO Approval screen
        setActiveTab("approval");
        setProcessingMode("PR_LIST");
        setActivePr(null);
      } else {
        showToast(`Proposal ${savedProposal.proposalNumber} saved as Draft.`);
      }
    } catch (err) {
      alert("Error saving proposal: " + err.message);
    }
  };

  // ==========================================================================
  // SCREEN 2: PO APPROVAL WORKFLOW STATE
  // ==========================================================================
  const [approvalFilterStatus, setApprovalFilterStatus] = useState("PENDING_PO_APPROVAL");
  const [selectedProposalForReview, setSelectedProposalForReview] = useState(null);
  const [approvalSearchTerm, setApprovalSearchTerm] = useState("");

  // Rejection & Change Request Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [changesComments, setChangesComments] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);

  // Filter proposals in PO Approval table
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (approvalFilterStatus !== "ALL" && p.status !== approvalFilterStatus) {
        return false;
      }
      if (approvalSearchTerm.trim()) {
        const q = approvalSearchTerm.toLowerCase();
        const matches =
          (p.proposalNumber && p.proposalNumber.toLowerCase().includes(q)) ||
          (p.prNumber && p.prNumber.toLowerCase().includes(q)) ||
          (p.department && p.department.toLowerCase().includes(q)) ||
          (p.requestedBy && p.requestedBy.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [proposals, approvalFilterStatus, approvalSearchTerm]);

  // Handle APPROVE Action (Connection 6: Proposal -> Official POs)
  const handleApproveProposal = async (proposalId, validityDate) => {
    if (!validityDate) {
      alert("PO Validity Date is mandatory.");
      return;
    }
    if (!window.confirm("Are you sure you want to approve this purchase proposal and generate final Purchase Order(s)?")) {
      return;
    }
    setActionInProgress(true);
    try {
      const res = await fetch(`http://localhost:4000/api/purchase/proposals/${proposalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approver: PO_APPROVER_NAME, validityDate })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Approval failed");
        return;
      }

      const data = await res.json();

      // Record newly issued PO numbers on the PR in localStorage
      try {
        const prStorageKey = "SMS_PURCHASE_REQUISITION_DATA_REAL_V2";
        const raw = localStorage.getItem(prStorageKey);
        let allPrs = raw ? JSON.parse(raw) : (INITIAL_PR_DATA || []);
        const targetProposal = proposals.find((p) => p.id === proposalId);
        if (targetProposal) {
          const targetIndex = allPrs.findIndex((p) => p.pr_number === targetProposal.prNumber);
          if (targetIndex !== -1) {
            const targetPr = { ...allPrs[targetIndex] };
            targetPr.generated_pos = Array.from(
              new Set([...(targetPr.generated_pos || []), ...(data.poNumbers || [])])
            );
            allPrs[targetIndex] = targetPr;
            localStorage.setItem(prStorageKey, JSON.stringify(allPrs));
            refreshApprovedPrs();
          }
        }
      } catch (e) {
        console.error("Could not link PO numbers to PR:", e);
      }

      showToast(`Proposal approved! Generated PO(s): ${data.poNumbers.join(", ")}`);
      fetchProposals();
      fetchOrders();
      setSelectedProposalForReview(null);
      setActiveTab("orders"); // Switch to Orders tab to view created PO
    } catch (err) {
      alert("Error approving proposal: " + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle REJECT Action (Connection 9: Reverse quantities back to PR)
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Rejection reason is mandatory.");
      return;
    }
    setActionInProgress(true);
    try {
      const res = await fetch(`http://localhost:4000/api/purchase/proposals/${selectedProposalForReview.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejector: "Approving Authority",
          reason: rejectionReason.trim()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Rejection failed");
        return;
      }

      // Connection 9: Release reserved quantities back to PR
      try {
        const prStorageKey = "SMS_PURCHASE_REQUISITION_DATA_REAL_V2";
        const raw = localStorage.getItem(prStorageKey);
        let allPrs = raw ? JSON.parse(raw) : (INITIAL_PR_DATA || []);
        const targetIndex = allPrs.findIndex((p) => p.pr_number === selectedProposalForReview.prNumber);
        if (targetIndex !== -1) {
          const targetPr = { ...allPrs[targetIndex] };
          const updatedItems = (targetPr.items || []).map((pItem) => {
            const matchedLine = (selectedProposalForReview.items || []).find(
              (pl) => pl.itemCode === pItem.item_code || pl.itemName === pItem.item_name
            );
            if (matchedLine) {
              const releaseQty = Number(matchedLine.quantity) || 0;
              const newOrdered = Math.max(0, (Number(pItem.ordered_qty) || 0) - releaseQty);
              const newRemaining = Math.max(0, (Number(pItem.req_qty) || 0) - newOrdered);
              return {
                ...pItem,
                ordered_qty: newOrdered,
                remaining_qty: newRemaining
              };
            }
            return pItem;
          });

          targetPr.items = updatedItems;
          const anyOrdered = updatedItems.some((it) => (it.ordered_qty || 0) > 0);
          targetPr.status = anyOrdered ? "Partially Ordered" : "Approved";
          allPrs[targetIndex] = targetPr;
          localStorage.setItem(prStorageKey, JSON.stringify(allPrs));
          refreshApprovedPrs();
        }
      } catch (e) {
        console.error("Could not release PR quantities on proposal rejection:", e);
      }

      showToast(`Purchase proposal rejected. Quantities released back to PR ${selectedProposalForReview.prNumber}!`);
      fetchProposals();
      setRejectModalOpen(false);
      setRejectionReason("");
      setSelectedProposalForReview(null);
    } catch (err) {
      alert("Error rejecting proposal: " + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Connection 9: Reverse/cancellation logic for PO in PO Register (Screen 3)
  const handleCancelOrder = async (po) => {
    const reason = window.prompt(
      `Mandatory: Enter cancellation reason for PO ${po.poNumber}:`,
      "Vendor rate mismatch / order withdrawn"
    );
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`http://localhost:4000/api/purchase/orders/${po.poNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: "Purchase Manager",
          reason: reason.trim()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "PO cancellation failed");
        return;
      }

      // Release cancelled PO quantities back to PR in localStorage
      try {
        const prStorageKey = "SMS_PURCHASE_REQUISITION_DATA_REAL_V2";
        const raw = localStorage.getItem(prStorageKey);
        let allPrs = raw ? JSON.parse(raw) : (INITIAL_PR_DATA || []);
        const targetIndex = allPrs.findIndex((p) => p.pr_number === po.prNumber);
        if (targetIndex !== -1) {
          const targetPr = { ...allPrs[targetIndex] };
          const updatedItems = (targetPr.items || []).map((pItem) => {
            const matchedLine = (po.items || []).find(
              (pl) => pl.itemCode === pItem.item_code || pl.itemName === pItem.item_name
            );
            if (matchedLine) {
              const releaseQty = Number(matchedLine.quantity) || 0;
              const newOrdered = Math.max(0, (Number(pItem.ordered_qty) || 0) - releaseQty);
              const newRemaining = Math.max(0, (Number(pItem.req_qty) || 0) - newOrdered);
              return {
                ...pItem,
                ordered_qty: newOrdered,
                remaining_qty: newRemaining
              };
            }
            return pItem;
          });

          targetPr.items = updatedItems;
          const anyOrdered = updatedItems.some((it) => (it.ordered_qty || 0) > 0);
          targetPr.status = anyOrdered ? "Partially Ordered" : "Approved";
          allPrs[targetIndex] = targetPr;
          localStorage.setItem(prStorageKey, JSON.stringify(allPrs));
          refreshApprovedPrs();
        }
      } catch (e) {
        console.error("Could not release PR quantities on PO cancel:", e);
      }

      showToast(`PO ${po.poNumber} cancelled! Quantities restored to PR ${po.prNumber}.`);
      fetchOrders();
    } catch (err) {
      alert("Error cancelling PO: " + err.message);
    }
  };


  // Handle REQUEST CHANGES Action
  const handleConfirmRequestChanges = async () => {
    if (!changesComments.trim()) {
      alert("Comments are mandatory when requesting changes.");
      return;
    }
    setActionInProgress(true);
    try {
      const res = await fetch(`http://localhost:4000/api/purchase/proposals/${selectedProposalForReview.id}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: "Approving Authority",
          comments: changesComments.trim()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Request changes failed");
        return;
      }

      showToast("Proposal returned with change requests.");
      fetchProposals();
      setChangesModalOpen(false);
      setChangesComments("");
      setSelectedProposalForReview(null);
    } catch (err) {
      alert("Error requesting changes: " + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // ==========================================================================
  // PURCHASE ORDER VIEWER, AMENDMENT & REVISION HISTORY STATE
  // ==========================================================================
  const [viewingPo, setViewingPo] = useState(null);
  const [amendingPo, setAmendingPo] = useState(null);
  const [revisionsPo, setRevisionsPo] = useState(null);
  const [validityPo, setValidityPo] = useState(null);
  const [revisionsList, setRevisionsList] = useState([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  const handleOpenAmendModal = (po) => {
    setAmendingPo(po);
  };

  const handleOpenRevisionsModal = async (po) => {
    setRevisionsPo(po);
    setRevisionsLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/purchase/orders/${po.poNumber}/revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisionsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn("Could not load PO revisions:", e);
    } finally {
      setRevisionsLoading(false);
    }
  };

  // Pagination for tables
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  return (
    <div
      style={{
        height: "100%",
        maxHeight: "100%",
        width: "100%",
        overflow: "hidden",
        background: bg,
        padding: "10px 16px",
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
            <Icons.Check />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 1: SLATE TOOLBAR HEADER (#1e293b) WITH TABS AND BREADCRUMBS */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#1e293b",
            borderBottom: "1px solid #334155",
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            color: "#ffffff"
          }}
        >
          {/* Left Title & Workflow Tab Selectors */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
              <div
                style={{
                  background: "#0284c7",
                  color: "#fff",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 13
                }}
              >
                PO
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" }}>
                Purchase Order Workflow
              </span>
            </div>

            {/* TAB 1: Purchase Processing */}
            <button
              onClick={() => {
                setActiveTab("processing");
                setProcessingMode("PR_LIST");
              }}
              style={{
                background: activeTab === "processing" ? "#3b82f6" : "rgba(255,255,255,0.08)",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease"
              }}
            >
              <span>1. Purchase Processing</span>
              <span
                style={{
                  background: "rgba(0,0,0,0.25)",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: 11
                }}
              >
                {filteredApprovedPrs.length} PRs
              </span>
            </button>

            {/* TAB 2: PO Approval */}
            <button
              onClick={() => setActiveTab("approval")}
              style={{
                background: activeTab === "approval" ? "#3b82f6" : "rgba(255,255,255,0.08)",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease"
              }}
            >
              <span>2. PO Approval</span>
              {proposals.filter((p) => p.status === "PENDING_PO_APPROVAL").length > 0 && (
                <span
                  style={{
                    background: "#f59e0b",
                    color: "#000",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontSize: 11
                  }}
                >
                  {proposals.filter((p) => p.status === "PENDING_PO_APPROVAL").length} Pending
                </span>
              )}
            </button>

            {/* TAB 3: Purchase Orders */}
            <button
              onClick={() => setActiveTab("orders")}
              style={{
                background: activeTab === "orders" ? "#3b82f6" : "rgba(255,255,255,0.08)",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease"
              }}
            >
              <span>3. Purchase Orders (PO)</span>
              <span
                style={{
                  background: "rgba(0,0,0,0.25)",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: 11
                }}
              >
                {orders.length}
              </span>
            </button>

            {/* TAB 4: Purchase Reports & Analytics */}
            <button
              onClick={() => setActiveTab("reports")}
              style={{
                background: activeTab === "reports" ? "#3b82f6" : "rgba(255,255,255,0.08)",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease"
              }}
            >
              <span>4. Reports &amp; Analytics</span>
            </button>

            <span style={{ color: "#475569", margin: "0 2px" }}>|</span>

            {/* HSN / SAC Tax Master button */}
            <button
              onClick={() => setIsHsnModalOpen(true)}
              title="Manage HSN / SAC Codes & GST Tax Rates"
              style={{
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(96, 165, 250, 0.35)",
                color: "#93c5fd",
                borderRadius: 6,
                padding: "6px 12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                transition: "all 0.15s ease"
              }}
            >
              <span>🏛️ HSN Tax Master ({hsnMasterList.length})</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={() => {
                fetchVendors();
                fetchHsnMaster();
                refreshApprovedPrs();
                fetchProposals();
                fetchOrders();
              }}
              title="Refresh Master and Proposals"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#94a3b8",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 600
              }}
            >
              <Icons.Refresh />
              <span>Refresh</span>
            </button>
          </div>

          {/* Right Breadcrumb */}
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
            <span
              onClick={onBackToHome}
              style={{ cursor: "pointer", color: "#60a5fa", textDecoration: "underline" }}
            >
              Home
            </span>
            <span style={{ margin: "0 5px" }}>›</span>
            <span>Purchase</span>
            <span style={{ margin: "0 5px" }}>›</span>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>
              {activeTab === "processing"
                ? "Purchase Processing (Screen 1)"
                : activeTab === "approval"
                ? "PO Approval (Screen 2)"
                : "Issued Purchase Orders"}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WORKFLOW VIEW DISPATCHER */}
        {/* ========================================================================= */}
        {activeTab === "processing" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {processingMode === "PR_LIST" && (
              <Screen1PartAApprovedPrList
                prs={filteredApprovedPrs}
                searchTerm={prSearchTerm}
                setSearchTerm={setPrSearchTerm}
                deptFilter={prDeptFilter}
                setDeptFilter={setPrDeptFilter}
                priorityFilter={prPriorityFilter}
                setPriorityFilter={setPrPriorityFilter}
                colFilters={prColFilters}
                setColFilters={setPrColFilters}
                onOpenPr={handleOpenPr}
                onRefreshPrs={refreshApprovedPrs}
                onNavigateToPR={() => onNavigate && onNavigate("purchase-requisition")}
              />
            )}

            {processingMode === "PR_DETAILS" && activePr && (
              <Screen1PartBPrDetails
                pr={activePr}
                allQuotations={allQuotations}
                selectedItemIds={selectedItemIds}
                toggleItemSelection={toggleItemSelection}
                toggleSelectAllItems={toggleSelectAllItems}
                onBack={() => setProcessingMode("PR_LIST")}
                onProceed={handleProceedToPurchase}
                onNavigate={onNavigate}
              />
            )}

            {processingMode === "PURCHASE_ENTRY" && activePr && (
              <Screen1PartsCtoFPurchaseEntry
                pr={activePr}
                lines={purchaseLines}
                vendorList={vendorList}
                hsnMasterList={hsnMasterList}
                allQuotations={allQuotations}
                vendorChargesMap={vendorChargesMap}
                selectedPoType={selectedPoType}
                onPoTypeChange={handlePoTypeChange}
                backendCalculation={backendCalculation}
                calcLoading={calcLoading}
                onLineChange={handleLineChange}
                onVendorChargeChange={handleVendorChargeChange}
                onApplyQuoteToLine={handleApplyQuotationToLine}
                onClearQuoteFromLine={handleClearQuotationFromLine}
                onBack={() => setProcessingMode("PR_DETAILS")}
                onSaveDraft={() => handleSaveOrSubmitProposal(false)}
                onSubmitApproval={() => handleSaveOrSubmitProposal(true)}
              />
            )}
          </div>
        )}

        {activeTab === "approval" && (
          <Screen2POApproval
            proposals={filteredProposals}
            allProposalsCount={proposals.length}
            filterStatus={approvalFilterStatus}
            setFilterStatus={setApprovalFilterStatus}
            searchTerm={approvalSearchTerm}
            setSearchTerm={setApprovalSearchTerm}
            onSelectProposal={(p) => setSelectedProposalForReview(p)}
            onApprove={handleApproveProposal}
            onOpenRejectModal={(p) => {
              setSelectedProposalForReview(p);
              setRejectModalOpen(true);
            }}
            onOpenChangesModal={(p) => {
              setSelectedProposalForReview(p);
              setChangesModalOpen(true);
            }}
            onViewPo={(poNum) => {
              const found = orders.find((o) => o.poNumber === poNum);
              if (found) setViewingPo(found);
              else showToast(`PO ${poNum} details loaded.`);
            }}
            onNavigate={onNavigate}
          />
        )}

        {activeTab === "orders" && (
          <Screen3PurchaseOrdersList
            orders={orders}
            onViewPo={(po) => setViewingPo(po)}
            onAmendPo={handleOpenAmendModal}
            onViewRevisions={handleOpenRevisionsModal}
            onExtendValidity={(po) => setValidityPo(po)}
            onCancelPo={handleCancelOrder}
            onRefresh={fetchOrders}
            onSwitchTab={setActiveTab}
            onNavigate={onNavigate}
          />
        )}

        {activeTab === "reports" && (
          <Screen4PurchaseReports
            orders={orders}
            approvedPrs={approvedPrs}
            proposals={proposals}
            onViewPo={(po) => setViewingPo(po)}
          />
        )}

        {/* ========================================================================= */}
        {/* BOTTOM STATUS BAR (DARK SLATE #0f172a) */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#0f172a",
            borderTop: "1px solid #1e293b",
            padding: "6px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
            fontWeight: 600,
            color: "#94a3b8"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }}></span>
              Backend API Connected (Port 4000)
            </span>
            <span>• Active Vendors: <strong style={{ color: "#f8fafc" }}>{vendorList.length}</strong></span>
            <span>• Approved PRs Available: <strong style={{ color: "#f8fafc" }}>{approvedPrs.length}</strong></span>
            <span>• Proposals: <strong style={{ color: "#f8fafc" }}>{proposals.length}</strong></span>
            <span>• Generated POs: <strong style={{ color: "#f8fafc" }}>{orders.length}</strong></span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Workflow: <strong style={{ color: "#93c5fd" }}>PR (Approved) → Purchase Processing → PO Approval → PO</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PO APPROVAL REVIEW & DECIDE MODAL */}
      {/* ========================================================================= */}
      {selectedProposalForReview && !rejectModalOpen && !changesModalOpen && (
        <POApprovalReviewModal
          proposal={selectedProposalForReview}
          onClose={() => setSelectedProposalForReview(null)}
          onApprove={(validityDate) => handleApproveProposal(selectedProposalForReview.id, validityDate)}
          onReject={() => setRejectModalOpen(true)}
          onRequestChanges={() => setChangesModalOpen(true)}
          onNavigate={onNavigate}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REJECT REASON MODAL (MANDATORY REASON) */}
      {/* ========================================================================= */}
      {rejectModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              overflow: "hidden",
              border: "1px solid #cbd5e1"
            }}
          >
            <div
              style={{
                background: "#dc2626",
                color: "#ffffff",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
                <Icons.AlertCircle />
                <span>Reject Purchase Proposal</span>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                <Icons.Cross />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}>
                You are rejecting proposal <strong>{selectedProposalForReview?.proposalNumber}</strong> against PR <strong>{selectedProposalForReview?.prNumber}</strong>. Please provide a mandatory reason explaining why this purchase proposal is rejected:
              </div>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter mandatory justification / rejection reason (e.g. Budget exceeded, Rate too high compared to historical purchases, Incorrect quantity)..."
                rows={4}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  padding: "10px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit"
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  onClick={() => setRejectModalOpen(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={actionInProgress || !rejectionReason.trim()}
                  style={{
                    background: !rejectionReason.trim() ? "#f87171" : "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 20px",
                    fontWeight: 700,
                    cursor: rejectionReason.trim() ? "pointer" : "not-allowed",
                    fontSize: 13
                  }}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REQUEST CHANGES MODAL (MANDATORY COMMENTS) */}
      {/* ========================================================================= */}
      {changesModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              overflow: "hidden",
              border: "1px solid #cbd5e1"
            }}
          >
            <div
              style={{
                background: "#d97706",
                color: "#ffffff",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
                <Icons.Clock />
                <span>Send Back / Request Changes</span>
              </div>
              <button
                onClick={() => setChangesModalOpen(false)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                <Icons.Cross />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}>
                Please specify the changes or clarifications needed for proposal <strong>{selectedProposalForReview?.proposalNumber}</strong>. The purchasing officer can review your remarks, modify the proposal, and resubmit it:
              </div>

              <textarea
                value={changesComments}
                onChange={(e) => setChangesComments(e.target.value)}
                placeholder="Enter instructions / requested modifications (e.g. Please negotiate 5% extra discount on line item 1, or change payment terms to 45 days)..."
                rows={4}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  padding: "10px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit"
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  onClick={() => setChangesModalOpen(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRequestChanges}
                  disabled={actionInProgress || !changesComments.trim()}
                  style={{
                    background: !changesComments.trim() ? "#fbbf24" : "#d97706",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 20px",
                    fontWeight: 700,
                    cursor: changesComments.trim() ? "pointer" : "not-allowed",
                    fontSize: 13
                  }}
                >
                  Send Back Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: OFFICIAL PURCHASE ORDER (PO) PRINT / DOCUMENT VIEW */}
      {/* ========================================================================= */}
      {viewingPo && (
        <PurchaseOrderDocumentModal
          po={viewingPo}
          onClose={() => setViewingPo(null)}
          onNavigate={onNavigate}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: HSN / SAC TAX MASTER & GST SLAB DIRECTORY */}
      {/* ========================================================================= */}
      {isHsnModalOpen && (
        <HsnMasterModal
          hsnList={hsnMasterList}
          onClose={() => setIsHsnModalOpen(false)}
          onRefresh={fetchHsnMaster}
          showToast={showToast}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PO AMENDMENT & RE-CALCULATION MODAL */}
      {/* ========================================================================= */}
      {amendingPo && (
        <PoAmendmentModal
          po={amendingPo}
          hsnList={hsnMasterList}
          onClose={() => setAmendingPo(null)}
          onSuccess={() => {
            setAmendingPo(null);
            fetchOrders();
            showToast(`Purchase Order ${amendingPo.poNumber} successfully amended.`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6B: PO VALIDITY (extend validity + audit history) */}
      {validityPo && (
        <PoValidityModal
          po={validityPo}
          onClose={() => setValidityPo(null)}
          onSuccess={(data, message) => {
            setValidityPo(null);
            showToast(message);
            fetchOrders();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: PO REVISION HISTORY & AUDIT TRAIL MODAL */}
      {/* ========================================================================= */}
      {revisionsPo && (
        <PoRevisionHistoryModal
          po={revisionsPo}
          revisions={revisionsList}
          loading={revisionsLoading}
          onClose={() => {
            setRevisionsPo(null);
            setRevisionsList([]);
          }}
        />
      )}
    </div>
  );
}

const PURCHASE_ORDER_PAGE_1_COLUMNS = [
  { key: "pr_number", width: 120 },
  { key: "pr_date", width: 100 },
  { key: "department", width: 130 },
  { key: "requested_by", width: 140 },
  { key: "required_by", width: 110 },
  { key: "priority", width: 90 },
  { key: "items", width: 100 },
  { key: "status", width: 110 },
  { key: "action", width: 170 },
];

// ============================================================================
// COMPONENT: SCREEN 1 PART A — APPROVED PR LIST
// ============================================================================
function Screen1PartAApprovedPrList({
  prs,
  searchTerm,
  setSearchTerm,
  deptFilter,
  setDeptFilter,
  priorityFilter,
  setPriorityFilter,
  colFilters,
  setColFilters,
  onOpenPr,
  onRefreshPrs,
  onNavigateToPR
}) {
  const purchaseOrderPage1Resize = useResizableColumns("purchase-order-page-1", PURCHASE_ORDER_PAGE_1_COLUMNS);
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* ROW 2: SEARCH INPUT, FILTER PILLS & METRICS */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Main Search Input */}
          <div style={{ width: 320, maxWidth: "100%", position: "relative" }}>
            <input
              type="text"
              placeholder="Search Approved PRs by PR No, Dept, Requester..."
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

          {/* Department Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Dept:</span>
            {["ALL", "Moulding", "Engineering", "Production", "Store"].map((dept) => {
              const active = deptFilter === dept;
              return (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  style={{
                    background: active ? "#2b3d52" : "#ffffff",
                    color: active ? "#ffffff" : "#475569",
                    border: active ? "1px solid #2b3d52" : "1px solid #cbd5e1",
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {dept}
                </button>
              );
            })}
          </div>

          {/* Priority Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Priority:</span>
            {["ALL", "High", "Urgent"].map((prio) => {
              const active = priorityFilter.toUpperCase() === prio.toUpperCase();
              return (
                <button
                  key={prio}
                  onClick={() => setPriorityFilter(prio)}
                  style={{
                    background: active ? "#2b3d52" : "#ffffff",
                    color: active ? "#ffffff" : "#475569",
                    border: active ? "1px solid #2b3d52" : "1px solid #cbd5e1",
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {prio}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Info and Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onNavigateToPR}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#2563eb",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <span>Go to PR Master</span>
            <Icons.ArrowRight />
          </button>
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 700
            }}
          >
            {prs.length} APPROVED PRs READY
          </div>
        </div>
      </div>

      {/* DOUBLE ROW STICKY HEADER TABLE */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12, ...purchaseOrderPage1Resize.tableStyle }}>
          <ResizableColGroup columns={PURCHASE_ORDER_PAGE_1_COLUMNS} widths={purchaseOrderPage1Resize.widths} />
          <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f1f5f9" }}>
            {/* Row 1: Titles */}
            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 120 }}>PR NUMBER<ColumnResizeHandle colKey="pr_number" resize={purchaseOrderPage1Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 100 }}>PR DATE<ColumnResizeHandle colKey="pr_date" resize={purchaseOrderPage1Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 130 }}>DEPARTMENT<ColumnResizeHandle colKey="department" resize={purchaseOrderPage1Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 140 }}>REQUESTED BY<ColumnResizeHandle colKey="requested_by" resize={purchaseOrderPage1Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 110 }}>REQUIRED BY<ColumnResizeHandle colKey="required_by" resize={purchaseOrderPage1Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 90 }}>PRIORITY<ColumnResizeHandle colKey="priority" resize={purchaseOrderPage1Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 100, textAlign: "center" }}>ITEMS<ColumnResizeHandle colKey="items" resize={purchaseOrderPage1Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 110, textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={purchaseOrderPage1Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 170, textAlign: "center" }}>ACTION<ColumnResizeHandle colKey="action" resize={purchaseOrderPage1Resize} /></th>
            </tr>
            {/* Row 2: Per-column Filter Inputs */}
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "4px 8px" }}>
                <input
                  type="text"
                  placeholder="Filter PR..."
                  value={colFilters.prNumber}
                  onChange={(e) => setColFilters({ ...colFilters, prNumber: e.target.value })}
                  style={{ width: "100%", padding: "4px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                />
              </th>
              <th style={{ padding: "4px 8px" }}>
                <input
                  type="text"
                  placeholder="Filter date..."
                  value={colFilters.prDate}
                  onChange={(e) => setColFilters({ ...colFilters, prDate: e.target.value })}
                  style={{ width: "100%", padding: "4px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                />
              </th>
              <th style={{ padding: "4px 8px" }}>
                <input
                  type="text"
                  placeholder="Filter dept..."
                  value={colFilters.department}
                  onChange={(e) => setColFilters({ ...colFilters, department: e.target.value })}
                  style={{ width: "100%", padding: "4px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                />
              </th>
              <th style={{ padding: "4px 8px" }}>
                <input
                  type="text"
                  placeholder="Filter requester..."
                  value={colFilters.requestedBy}
                  onChange={(e) => setColFilters({ ...colFilters, requestedBy: e.target.value })}
                  style={{ width: "100%", padding: "4px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                />
              </th>
              <th style={{ padding: "4px 8px" }}>
                <input
                  type="text"
                  placeholder="Filter req date..."
                  value={colFilters.requiredDate}
                  onChange={(e) => setColFilters({ ...colFilters, requiredDate: e.target.value })}
                  style={{ width: "100%", padding: "4px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                />
              </th>
              <th style={{ padding: "4px 8px" }}>
                <input
                  type="text"
                  placeholder="Filter prio..."
                  value={colFilters.priority}
                  onChange={(e) => setColFilters({ ...colFilters, priority: e.target.value })}
                  style={{ width: "100%", padding: "4px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                />
              </th>
              <th style={{ padding: "4px 8px" }}></th>
              <th style={{ padding: "4px 8px" }}></th>
              <th style={{ padding: "4px 8px" }}></th>
            </tr>
          </thead>
          <tbody>
            {prs.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    No APPROVED Purchase Requisitions found matching filters.
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    Only PRs with status = <strong>APPROVED</strong> appear in Purchase Processing.
                  </div>
                </td>
              </tr>
            ) : (
              prs.map((pr, index) => {
                const itemCount = (pr.items || []).length;
                const isUrgent = (pr.priority || "").toLowerCase() === "urgent";
                const isHigh = (pr.priority || "").toLowerCase() === "high";

                return (
                  <tr
                    key={pr.id || pr.pr_number}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: index % 2 === 0 ? "#ffffff" : "#fbfcfe"
                    }}
                  >
                    <td style={{ padding: "9px 12px", fontWeight: 700 }}>
                      <button
                        onClick={() => onOpenPr(pr)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: "#0284c7",
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: "pointer",
                          textDecoration: "underline",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}
                        title="Click to open PR in PO Processing"
                      >
                        {pr.pr_number}
                      </button>
                      {pr.procurement_method && (
                        <span
                          style={{
                            display: "block",
                            fontSize: 10,
                            fontWeight: 700,
                            color: pr.procurement_method === "Competitive Quotation" ? "#7c3aed" : "#0284c7",
                            marginTop: 2
                          }}
                        >
                          {pr.procurement_method}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#334155" }}>
                      {formatDisplayDate(pr.pr_date) || "-"}
                    </td>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1e293b" }}>
                      {pr.department || "General"}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#334155" }}>
                      {pr.requisitioner || "-"}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#64748b" }}>
                      {formatDisplayDate(pr.required_date) || "-"}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span
                        style={{
                          background: isUrgent ? "#fee2e2" : isHigh ? "#ffedd5" : "#f1f5f9",
                          color: isUrgent ? "#991b1b" : isHigh ? "#c2410c" : "#475569",
                          fontWeight: 700,
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4
                        }}
                      >
                        {pr.priority || "Normal"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>{itemCount}</span>
                      {(() => {
                        const totalReq = (pr.items || []).reduce((acc, it) => acc + (Number(it.req_qty) || 0), 0);
                        const totalOrd = (pr.items || []).reduce((acc, it) => acc + (Number(it.ordered_qty) || 0), 0);
                        const totalBal = Math.max(0, totalReq - totalOrd);
                        return (
                          <span style={{ display: "block", fontSize: 10, color: totalBal > 0 ? "#059669" : "#64748b", fontWeight: 600 }}>
                            Bal: {totalBal}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      {(() => {
                        const st = (pr.status || "Approved").toLowerCase();
                        if (st === "fully ordered") {
                          return (
                            <span style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>
                              FULLY ORDERED
                            </span>
                          );
                        }
                        if (st === "partially ordered") {
                          return (
                            <span style={{ background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>
                              PARTIALLY ORDERED
                            </span>
                          );
                        }
                        return (
                          <span
                            style={{
                              background: "#dcfce7",
                              color: "#15803d",
                              padding: "3px 8px",
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <Icons.Check />
                            <span>APPROVED</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          onClick={() => onOpenPr(pr)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#334155",
                            padding: "4px 10px",
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => onOpenPr(pr)}
                          style={{
                            background: "#1e293b",
                            border: "none",
                            color: "#ffffff",
                            padding: "4px 12px",
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          <span>Start Purchase</span>
                          <Icons.ArrowRight />
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
    </div>
  );
}

const PURCHASE_ORDER_PAGE_2_COLUMNS = [
  { key: "select", width: 40, min: 32 },
  { key: "item_code", width: 120 },
  { key: "item_name", width: 200 },
  { key: "description", width: 117 },
  { key: "category", width: 110 },
  { key: "req_qty", width: 80 },
  { key: "ordered", width: 80 },
  { key: "remaining", width: 80 },
  { key: "uom", width: 60 },
  { key: "req_date", width: 100 },
  { key: "remarks", width: 150 },
];

// ============================================================================
// COMPONENT: SCREEN 1 PART B — PR DETAILS & ITEM SELECTOR
// ============================================================================
function Screen1PartBPrDetails({
  pr,
  allQuotations = [],
  selectedItemIds,
  toggleItemSelection,
  toggleSelectAllItems,
  onBack,
  onProceed,
  onNavigate
}) {
  const purchaseOrderPage2Resize = useResizableColumns("purchase-order-page-2", PURCHASE_ORDER_PAGE_2_COLUMNS);
  const items = pr.items || [];
  const selectedCount = selectedItemIds.size;

  // Quotations linked to this PR
  const linkedQuotations = (allQuotations || []).filter(
    (q) => q.prNumber === pr.pr_number || q.prId === pr.id
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: 18, gap: 14 }}>
      {/* Top action header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={onBack}
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#334155",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <Icons.ArrowLeft />
          <span>Back to Approved PRs</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            <strong>{selectedCount}</strong> of <strong>{items.length}</strong> items selected for purchase
          </div>
          <button
            onClick={onProceed}
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
              gap: 8,
              boxShadow: "0 2px 4px rgba(30, 41, 59, 0.25)"
            }}
          >
            <span>Proceed to Purchase</span>
            <Icons.ArrowRight />
          </button>
        </div>
      </div>

      {/* PR HEADER CARD */}
      <div
        style={{
          flexShrink: 0,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "14px 18px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          fontSize: 12
        }}
      >
        <div>
          <span style={{ color: "#64748b", display: "block" }}>PR Number:</span>
          <strong style={{ color: "#0284c7", fontSize: 14 }}>{pr.pr_number}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block" }}>PR Date:</span>
          <strong style={{ color: "#1e293b" }}>{formatDisplayDate(pr.pr_date) || "-"}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block" }}>Department:</span>
          <strong style={{ color: "#1e293b" }}>{pr.department || "General"}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block" }}>Requested By:</span>
          <strong style={{ color: "#1e293b" }}>{pr.requisitioner || "-"}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block" }}>Required By Date:</span>
          <strong style={{ color: "#b91c1c" }}>{formatDisplayDate(pr.required_date) || "-"}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block" }}>Priority:</span>
          <span
            style={{
              background: (pr.priority || "").toLowerCase() === "high" ? "#ffedd5" : "#f1f5f9",
              color: (pr.priority || "").toLowerCase() === "high" ? "#c2410c" : "#334155",
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 4
            }}
          >
            {pr.priority || "Normal"}
          </span>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block" }}>Procurement Method:</span>
          <span style={{ fontWeight: 800, color: "#7c3aed" }}>
            {pr.procurement_method || "Competitive Quotation"}
          </span>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block" }}>Status:</span>
          <span
            style={{
              color: (pr.status || "").toLowerCase() === "fully ordered" ? "#1e40af" : "#15803d",
              fontWeight: 800
            }}
          >
            {(pr.status || "Approved").toUpperCase()}
          </span>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <span style={{ color: "#64748b", display: "block" }}>Purpose / Remarks:</span>
          <span style={{ color: "#334155" }}>{pr.purpose || pr.remarks || "Production Requirement"}</span>
        </div>
      </div>

      {/* CONNECTED VENDOR QUOTATIONS STRIP */}
      {linkedQuotations.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>
              ✓ {linkedQuotations.length} Quotation(s) Linked to {pr.pr_number}:
            </span>
            {linkedQuotations.map((q) => (
              <span
                key={q.quotationNumber}
                style={{
                  background: "#ffffff",
                  border: q.status === "Selected for Purchase" ? "1.5px solid #16a34a" : "1px solid #86efac",
                  padding: "3px 8px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#1e293b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span>{q.quotationNumber}</span>
                <span style={{ color: "#64748b" }}>•</span>
                <span>{q.vendorName}</span>
                <span style={{ color: "#059669" }}>
                  (₹{q.rate || q.totalAmount || "Quoted"})
                </span>
                {q.status === "Selected for Purchase" && (
                  <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 9.5, padding: "1px 5px", borderRadius: 3, fontWeight: 900 }}>
                    SELECTED
                  </span>
                )}
              </span>
            ))}
          </div>

          {onNavigate && (
            <button
              onClick={() => {
                sessionStorage.setItem("SMS_SELECTED_PR_NUMBER", pr.pr_number);
                onNavigate("vendor-quotations");
              }}
              style={{
                background: "#ffffff",
                border: "1px solid #86efac",
                color: "#166534",
                borderRadius: 5,
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Compare Rates in Quotations Screen ➔
            </button>
          )}
        </div>
      )}


      {/* PR ITEMS TABLE WITH CHECKBOXES */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <table className="resizable-table" style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", textAlign: "left", fontSize: 12, ...purchaseOrderPage2Resize.tableStyle }}>
          <ResizableColGroup columns={PURCHASE_ORDER_PAGE_2_COLUMNS} widths={purchaseOrderPage2Resize.widths} />
          <thead style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ padding: "8px 12px", width: 40, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedItemIds.size === items.length}
                  onChange={toggleSelectAllItems}
                  style={{ cursor: "pointer" }}
                />
              </th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 120 }}>ITEM CODE<ColumnResizeHandle colKey="item_code" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 200 }}>ITEM NAME<ColumnResizeHandle colKey="item_name" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b" }}>DESCRIPTION<ColumnResizeHandle colKey="description" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 110 }}>CATEGORY<ColumnResizeHandle colKey="category" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 80, textAlign: "right" }}>REQ QTY<ColumnResizeHandle colKey="req_qty" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 80, textAlign: "right" }}>ORDERED<ColumnResizeHandle colKey="ordered" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 80, textAlign: "right" }}>REMAINING<ColumnResizeHandle colKey="remaining" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 60 }}>UOM<ColumnResizeHandle colKey="uom" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 100 }}>REQ DATE<ColumnResizeHandle colKey="req_date" resize={purchaseOrderPage2Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 150 }}>REMARKS<ColumnResizeHandle colKey="remarks" resize={purchaseOrderPage2Resize} /></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const isChecked = selectedItemIds.has(it.id);
              const remaining = Math.max(0, (it.req_qty || 0) - (it.ordered_qty || 0));

              return (
                <tr
                  key={it.id || idx}
                  onClick={() => toggleItemSelection(it.id)}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: isChecked ? "#f0f9ff" : idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                    cursor: "pointer"
                  }}
                >
                  <td style={{ padding: "9px 12px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItemSelection(it.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0284c7" }}>
                    {it.item_code}
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>
                    {it.item_name}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#64748b" }}>
                    {it.description || "-"}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#475569" }}>
                    {it.category || "General"}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>
                    {it.req_qty}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#64748b" }}>
                    {it.ordered_qty || 0}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800, color: remaining > 0 ? "#059669" : "#94a3b8" }}>
                    {remaining}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#334155" }}>
                    {it.uom || "PCS"}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#64748b" }}>
                    {formatDisplayDate(it.required_date || pr.required_date) || "-"}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#64748b" }}>
                    {it.remarks || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PURCHASE_ORDER_PAGE_3_COLUMNS = [
  { key: "quotation", width: 117 },
  { key: "source_pr", width: 103 },
  { key: "vendor_name", width: 117 },
  { key: "offered_rate", width: 152 },
  { key: "gst", width: 80 },
  { key: "payment_terms", width: 131 },
  { key: "delivery", width: 96 },
  { key: "status", width: 82 },
  { key: "action", width: 82 },
];

// ============================================================================
// MODAL: QUOTATION PICKER MODAL (CONNECTION 3: QUOTATION -> PO PROCESSING)
// ============================================================================
function QuotationPickerModal({
  isOpen,
  onClose,
  targetLine,
  targetPr,
  quotations = [],
  onSelectQuote
}) {
  const purchaseOrderPage3Resize = useResizableColumns("purchase-order-page-3", PURCHASE_ORDER_PAGE_3_COLUMNS);
  if (!isOpen || !targetLine) return null;

  const [activeFilter, setActiveFilter] = useState("matching_pr"); // "matching_pr" | "matching_item" | "all"
  const [searchTerm, setSearchTerm] = useState("");

  const filteredQuotes = useMemo(() => {
    return quotations.filter((q) => {
      if (activeFilter === "matching_pr" && targetPr?.pr_number) {
        if (q.prNumber !== targetPr.pr_number) return false;
      }
      if (activeFilter === "matching_item" && targetLine?.itemCode) {
        const hasItem = (q.items || []).some(
          (it) => it.itemCode === targetLine.itemCode || it.itemName === targetLine.itemName
        );
        if (!hasItem) return false;
      }
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const m1 = q.quotationNumber?.toLowerCase().includes(s);
        const m2 = q.vendorName?.toLowerCase().includes(s);
        const m3 = q.prNumber?.toLowerCase().includes(s);
        const m4 = (q.items || []).some(
          (it) => it.itemName?.toLowerCase().includes(s) || it.itemCode?.toLowerCase().includes(s)
        );
        if (!m1 && !m2 && !m3 && !m4) return false;
      }
      return true;
    });
  }, [quotations, activeFilter, searchTerm, targetLine, targetPr]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: 20
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 960,
          maxHeight: "90vh",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #cbd5e1"
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: "#1e293b",
            color: "#ffffff",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>⚡ Select Quotation for PO Processing</span>
            <span style={{ background: "#0284c7", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
              Snapshot Commercial Values
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <Icons.Cross />
          </button>
        </div>

        {/* Target Item Banner */}
        <div style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <span style={{ color: "#64748b", fontSize: 11 }}>Target Item:</span>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
              <span style={{ color: "#0284c7" }}>{targetLine.itemCode}</span> — {targetLine.itemName}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#334155" }}>
            Quantity: <strong>{targetLine.quantity} {targetLine.uom}</strong> • Estimated Rate: <strong>₹{targetLine.unitRate || 0}</strong>
          </div>
        </div>

        {/* Filter Pills and Search */}
        <div style={{ padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setActiveFilter("matching_pr")}
              style={{
                background: activeFilter === "matching_pr" ? "#2b3d52" : "#f1f5f9",
                color: activeFilter === "matching_pr" ? "#fff" : "#334155",
                border: "none",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Matching PR ({targetPr?.pr_number || "None"})
            </button>
            <button
              onClick={() => setActiveFilter("matching_item")}
              style={{
                background: activeFilter === "matching_item" ? "#2b3d52" : "#f1f5f9",
                color: activeFilter === "matching_item" ? "#fff" : "#334155",
                border: "none",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Matching Item ({targetLine.itemCode})
            </button>
            <button
              onClick={() => setActiveFilter("all")}
              style={{
                background: activeFilter === "all" ? "#2b3d52" : "#f1f5f9",
                color: activeFilter === "all" ? "#fff" : "#334155",
                border: "none",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              All Available Quotations ({quotations.length})
            </button>
          </div>

          <input
            type="text"
            placeholder="Search vendor, quote #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "5px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", width: 220 }}
          />
        </div>

        {/* Table of Available Quotations */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 240 }}>
          <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 11.5, ...purchaseOrderPage3Resize.tableStyle }}>
            <ResizableColGroup columns={PURCHASE_ORDER_PAGE_3_COLUMNS} widths={purchaseOrderPage3Resize.widths} />
            <thead style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", position: "sticky", top: 0 }}>
              <tr>
                <th style={{ padding: "8px 12px" }}>QUOTATION #<ColumnResizeHandle colKey="quotation" resize={purchaseOrderPage3Resize} /></th>
                <th style={{ padding: "8px 12px" }}>SOURCE PR<ColumnResizeHandle colKey="source_pr" resize={purchaseOrderPage3Resize} /></th>
                <th style={{ padding: "8px 12px" }}>VENDOR NAME<ColumnResizeHandle colKey="vendor_name" resize={purchaseOrderPage3Resize} /></th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>OFFERED RATE (₹)<ColumnResizeHandle colKey="offered_rate" resize={purchaseOrderPage3Resize} /></th>
                <th style={{ padding: "8px 12px" }}>GST %<ColumnResizeHandle colKey="gst" resize={purchaseOrderPage3Resize} /></th>
                <th style={{ padding: "8px 12px" }}>PAYMENT TERMS<ColumnResizeHandle colKey="payment_terms" resize={purchaseOrderPage3Resize} /></th>
                <th style={{ padding: "8px 12px" }}>DELIVERY<ColumnResizeHandle colKey="delivery" resize={purchaseOrderPage3Resize} /></th>
                <th style={{ padding: "8px 12px", textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={purchaseOrderPage3Resize} /></th>
                <th style={{ padding: "8px 12px", textAlign: "center" }}>ACTION<ColumnResizeHandle colKey="action" resize={purchaseOrderPage3Resize} /></th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No quotations found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const matchingItem = (q.items || []).find(
                    (it) => it.itemCode === targetLine.itemCode || it.itemName === targetLine.itemName
                  );
                  const offeredRate = matchingItem ? matchingItem.unitRate : q.rate || 0;
                  const isSelectedForPurchase = q.status === "Selected for Purchase";

                  return (
                    <tr
                      key={q.id || q.quotationNumber}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isSelectedForPurchase ? "#f0fdf4" : "#ffffff"
                      }}
                    >
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0284c7" }}>
                        {q.quotationNumber}
                      </td>
                      <td style={{ padding: "9px 12px", color: "#64748b" }}>
                        {q.prNumber || "-"}
                      </td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#1e293b" }}>
                        {q.vendorName}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800, color: "#059669", fontSize: 13 }}>
                        ₹{Number(offeredRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        {q.taxPercent || matchingItem?.taxPercent || 18}%
                      </td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>
                        {q.paymentTerms || "Net 30 Days"}
                      </td>
                      <td style={{ padding: "9px 12px", color: "#475569" }}>
                        {q.deliveryTime || "7 Days"}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            background: isSelectedForPurchase ? "#dcfce7" : "#f1f5f9",
                            color: isSelectedForPurchase ? "#15803d" : "#475569",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontWeight: 800,
                            fontSize: 10
                          }}
                        >
                          {q.status || "Evaluated"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => onSelectQuote(q, matchingItem)}
                          style={{
                            background: isSelectedForPurchase ? "#16a34a" : "#0284c7",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 5,
                            padding: "5px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                          }}
                        >
                          Use This Quotation
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: "10px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            * Selecting quotation will snapshot its vendor, rate, tax, and terms onto this PO item line.
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: 5,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const PURCHASE_ORDER_PAGE_4_COLUMNS = [
  { key: "item", width: 140 },
  { key: "hsn_sac", width: 135 },
  { key: "vendor_master_select", width: 210 },
  { key: "qty", width: 75 },
  { key: "unit_rate", width: 85 },
  { key: "disc", width: 65 },
  { key: "taxable", width: 85 },
  { key: "gst", width: 75 },
  { key: "tax_split", width: 130 },
  { key: "item_total", width: 95 },
  { key: "exp_delivery", width: 105 },
  { key: "location", width: 115 },
];

// ============================================================================
// COMPONENT: SCREEN 1 PARTS C, D, E, F — VENDOR SELECTION, RATES, TOTALS & SUMMARY
// ============================================================================
function Screen1PartsCtoFPurchaseEntry({
  pr,
  lines,
  vendorList,
  hsnMasterList = [],
  allQuotations = [],
  vendorChargesMap,
  selectedPoType = "Standard PO",
  onPoTypeChange,
  backendCalculation,
  calcLoading,
  onLineChange,
  onVendorChargeChange,
  onApplyQuoteToLine,
  onClearQuoteFromLine,
  onBack,
  onSaveDraft,
  onSubmitApproval
}) {
  const purchaseOrderPage4Resize = useResizableColumns("purchase-order-page-4", PURCHASE_ORDER_PAGE_4_COLUMNS);
  const [pickerLineIdx, setPickerLineIdx] = useState(null);
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [schedulingVendorCode, setSchedulingVendorCode] = useState(null);
  const [schedulingGroup, setSchedulingGroup] = useState(null);

  // Bind handleVendorChargeChange to onVendorChargeChange prop safely
  const handleVendorChargeChange = (vendorCode, fieldOrUpdates, val) => {
    if (onVendorChargeChange) {
      onVendorChargeChange(vendorCode, fieldOrUpdates, val);
    }
  };

  // Group purchase lines by vendorCode
  const groups = useMemo(() => {
    const map = {};
    lines.forEach((l, idx) => {
      const vKey = l.vendorCode || "UNASSIGNED";
      if (!map[vKey]) {
        const vendorObj = vendorList.find((v) => v.supplierCode === vKey);
        map[vKey] = {
          vendorCode: vKey,
          vendor: vendorObj || null,
          items: []
        };
      }
      map[vKey].items.push({ line: l, originalIndex: idx });
    });
    return Object.values(map);
  }, [lines, vendorList]);


  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* Top Header with Save Draft and Submit for PO Approval */}
      <div
        style={{
          flexShrink: 0,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap"
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#334155",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <Icons.ArrowLeft />
          <span>Back to Item Selection</span>
        </button>

        {/* Global PO Type selector strip at the top */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0f9ff", border: "1.5px solid #0284c7", borderRadius: 7, padding: "5px 14px" }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: "#0369a1", display: "flex", alignItems: "center", gap: 6 }}>
            <span>📋</span> PO Type:
          </label>
          <select
            value={selectedPoType || "Standard PO"}
            onChange={(e) => {
              const val = e.target.value;
              if (onPoTypeChange) onPoTypeChange(val);
              groups.forEach((g) => handleVendorChargeChange(g.vendorCode, "poType", val));
            }}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid #0284c7",
              fontSize: 12,
              fontWeight: 700,
              background: "#ffffff",
              color: "#0369a1",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="Standard PO">Standard PO</option>
            <option value="Planned / Scheduled PO">Planned / Scheduled PO</option>
            <option value="Blanket Purchase Agreement">Blanket Purchase Agreement</option>
            <option value="Service & Subcontract PO">Service &amp; Subcontract PO</option>
            <option value="Capital Goods / CapEx PO">Capital Goods / CapEx PO</option>
            <option value="Emergency Spot PO">Emergency Spot PO</option>
          </select>

          {(selectedPoType === "Planned / Scheduled PO" || selectedPoType === "Blanket Purchase Agreement") && (
            <button
              type="button"
              onClick={() => {
                const targetGrp = groups[0] || { vendorCode: "UNASSIGNED", items: [] };
                setSchedulingVendorCode(targetGrp.vendorCode);
                setSchedulingGroup(targetGrp);
                setSchedulingModalOpen(true);
              }}
              style={{
                marginLeft: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                borderRadius: 4,
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(2, 132, 199, 0.25)"
              }}
            >
              <span>📅</span>
              <span>Configure Delivery Lots &amp; Milestones</span>
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onSaveDraft}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: 6,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Save Draft
          </button>

          <button
            onClick={onSubmitApproval}
            style={{
              background: "#0284c7",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "7px 20px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <span>Submit for PO Approval</span>
            <Icons.ArrowRight />
          </button>
        </div>
      </div>

      {/* Main Form scroll area — all cards and tables scroll here smoothly without any clipping or overlapping */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "14px 18px 24px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 18
        }}
      >
        {/* Banner indicating PR reference */}
        <div
          style={{
            flexShrink: 0,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            color: "#1e3a8a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8
          }}
        >
          <div>
            {pr.clubbingBatchNumber ? (
              <span>
                Clubbed Batch: <strong style={{ color: "#1d4ed8" }}>{pr.clubbingBatchNumber}</strong> ({pr.batchName || "PR Consolidation"} • {pr.items?.length || 0} Consolidated Lines)
              </span>
            ) : (
              <span>
                Converting Requisition: <strong>{pr.pr_number}</strong> ({pr.department} • Requester: {pr.requisitioner})
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
            {pr.clubbingBatchNumber
              ? "Multi-PR Consolidated Purchasing • Multi-Vendor PO Split Supported"
              : "Multiple Vendor Allocation Supported (1 PR → Multiple Vendor Proposals)"}
          </div>
        </div>

        {/* SECTION: SELECTED ITEMS WITH VENDOR AND RATE INPUTS */}
        <div
          style={{
            flexShrink: 0,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <div
            style={{
              background: "#f1f5f9",
              padding: "10px 16px",
              borderBottom: "1px solid #cbd5e1",
              borderTopLeftRadius: 7,
              borderTopRightRadius: 7,
              fontWeight: 800,
              fontSize: 13,
              color: "#1e293b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8
            }}
          >
            <span>Item-wise Vendor Selection & Offered Rates (Parts C & D)</span>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              Rates can be selected from Quotations or entered directly • Backend calculates monetary totals
            </span>
          </div>

          {/* HSN Master Datalist for autocomplete */}
          <datalist id="sms-hsn-datalist">
            {hsnMasterList.map((h) => (
              <option key={h.hsnSacCode} value={h.hsnSacCode}>
                {h.description} • {h.gstRate}% GST ({h.cgstRate}% CGST + {h.sgstRate}% SGST / {h.igstRate}% IGST)
              </option>
            ))}
          </datalist>

          <div style={{ overflowX: "auto", width: "100%" }}>
            <table className="resizable-table" style={{ width: "100%", minWidth: 1220, borderCollapse: "collapse", fontSize: 11, textAlign: "left", ...purchaseOrderPage4Resize.tableStyle }}>
              <ResizableColGroup columns={PURCHASE_ORDER_PAGE_4_COLUMNS} widths={purchaseOrderPage4Resize.widths} />
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "8px 10px", width: 140 }}>ITEM<ColumnResizeHandle colKey="item" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 135 }}>HSN / SAC<ColumnResizeHandle colKey="hsn_sac" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 210 }}>VENDOR MASTER (SELECT)<ColumnResizeHandle colKey="vendor_master_select" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 75, textAlign: "right" }}>QTY<ColumnResizeHandle colKey="qty" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 85, textAlign: "right" }}>UNIT RATE (₹)<ColumnResizeHandle colKey="unit_rate" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 65, textAlign: "right" }}>DISC %<ColumnResizeHandle colKey="disc" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 85, textAlign: "right" }}>TAXABLE (₹)<ColumnResizeHandle colKey="taxable" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 75 }}>GST %<ColumnResizeHandle colKey="gst" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 130, textAlign: "right" }}>TAX (₹) & SPLIT<ColumnResizeHandle colKey="tax_split" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 95, textAlign: "right" }}>ITEM TOTAL (₹)<ColumnResizeHandle colKey="item_total" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 105 }}>EXP DELIVERY<ColumnResizeHandle colKey="exp_delivery" resize={purchaseOrderPage4Resize} /></th>
                  <th style={{ padding: "8px 10px", width: 115 }}>LOCATION<ColumnResizeHandle colKey="location" resize={purchaseOrderPage4Resize} /></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((item, idx) => {
                  const calcItem = backendCalculation?.items?.[idx];
                  const gross = calcItem?.grossAmount ?? (item.quantity * item.unitRate);
                  const discAmt = calcItem?.discountAmount ?? 0;
                  const taxable = calcItem?.taxableAmount ?? (gross - discAmt);
                  const taxAmt = calcItem?.taxAmount ?? 0;
                  const total = calcItem?.itemTotal ?? (taxable + taxAmt);

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {/* Item */}
                      <td style={{ padding: "10px 10px" }}>
                        <strong style={{ color: "#0284c7", display: "block" }}>{item.itemCode}</strong>
                        <span style={{ color: "#334155" }}>{item.itemName}</span>
                      </td>

                      {/* HSN / SAC Code & Dynamic Description */}
                      <td style={{ padding: "10px 10px" }}>
                        <input
                          list="sms-hsn-datalist"
                          type="text"
                          placeholder="Type HSN..."
                          value={item.hsnCode || ""}
                          onChange={(e) => onLineChange(idx, "hsnCode", e.target.value)}
                          style={{
                            width: 110,
                            padding: "5px 6px",
                            borderRadius: 4,
                            border: item.hsnCode ? "1px solid #cbd5e1" : "1px dashed #f87171",
                            fontWeight: 700,
                            fontSize: 11,
                            color: "#0f172a",
                            background: item.hsnCode ? "#f8fafc" : "#fff"
                          }}
                        />
                        <div
                          style={{
                            fontSize: 9.5,
                            color: "#64748b",
                            marginTop: 3,
                            maxWidth: 125,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                          title={item.hsnDescription || calcItem?.hsnDescription || ""}
                        >
                          {item.hsnDescription || calcItem?.hsnDescription || "Standard GST Rate"}
                        </div>
                      </td>

                      {/* Vendor Master Select & Quotation Connection */}
                      <td style={{ padding: "10px 10px" }}>
                        <select
                          value={item.vendorCode}
                          onChange={(e) => onLineChange(idx, "vendorCode", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px",
                            borderRadius: 4,
                            border: item.vendorCode ? "1px solid #cbd5e1" : "1px solid #f87171",
                            background: item.vendorCode ? "#ffffff" : "#fff1f2",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#0f172a"
                          }}
                        >
                          <option value="">-- Select Active Vendor --</option>
                          {vendorList.map((v) => (
                            <option key={v.supplierCode} value={v.supplierCode}>
                              {v.supplierCode} - {v.supplierName} ({v.city || v.state || "HQ"})
                            </option>
                          ))}
                        </select>

                        {/* Connection 3: Use Selected Quotation Pill / Button */}
                        {item.sourceQuotationNumber ? (
                          <div
                            style={{
                              marginTop: 4,
                              background: "#f0fdf4",
                              border: "1px solid #86efac",
                              borderRadius: 4,
                              padding: "3px 6px",
                              fontSize: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 4
                            }}
                          >
                            <span style={{ color: "#166534", fontWeight: 700 }}>
                              Quote: {item.sourceQuotationNumber}
                            </span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => setPickerLineIdx(idx)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  cursor: "pointer",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textDecoration: "underline",
                                  padding: 0
                                }}
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={() => onClearQuoteFromLine(idx)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  padding: 0,
                                  lineHeight: 1
                                }}
                                title="Remove quotation reference"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPickerLineIdx(idx)}
                            style={{
                              marginTop: 4,
                              width: "100%",
                              background: "#f0f9ff",
                              border: "1px dashed #0284c7",
                              color: "#0369a1",
                              borderRadius: 4,
                              padding: "3px 6px",
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4
                            }}
                          >
                            <span>⚡ Use Selected Quotation</span>
                          </button>
                        )}
                      </td>


                      {/* Qty */}
                      <td style={{ padding: "10px 10px" }}>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => onLineChange(idx, "quantity", e.target.value)}
                          style={{
                            width: 65,
                            padding: "5px",
                            textAlign: "right",
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                            fontWeight: 700
                          }}
                        />
                      </td>

                      {/* Unit Rate */}
                      <td style={{ padding: "10px 10px" }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate ₹"
                          value={item.unitRate}
                          onChange={(e) => onLineChange(idx, "unitRate", e.target.value)}
                          style={{
                            width: 80,
                            padding: "5px",
                            textAlign: "right",
                            borderRadius: 4,
                            border: item.unitRate > 0 ? "1px solid #cbd5e1" : "1px solid #f87171",
                            fontWeight: 700
                          }}
                        />
                      </td>

                      {/* Discount % */}
                      <td style={{ padding: "10px 10px" }}>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="%"
                          value={item.discountPercent}
                          onChange={(e) => onLineChange(idx, "discountPercent", e.target.value)}
                          style={{
                            width: 55,
                            padding: "5px",
                            textAlign: "right",
                            borderRadius: 4,
                            border: "1px solid #cbd5e1"
                          }}
                        />
                      </td>

                      {/* Taxable */}
                      <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 600, color: "#334155" }}>
                        ₹{Number(taxable).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Tax % */}
                      <td style={{ padding: "10px 10px" }}>
                        <select
                          value={item.taxPercent}
                          onChange={(e) => onLineChange(idx, "taxPercent", Number(e.target.value))}
                          style={{
                            width: "100%",
                            padding: "5px",
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          <option value="0">0%</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST</option>
                          <option value="28">28% GST</option>
                        </select>
                      </td>

                      {/* Tax Amount & Sub-Tax Breakdown */}
                      <td style={{ padding: "10px 10px", textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: "#0284c7" }}>
                          ₹{Number(taxAmt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        {calcItem && Number(calcItem.igstAmount || 0) > 0 ? (
                          <div style={{ fontSize: 9.5, color: "#7c3aed", fontWeight: 700, marginTop: 2 }}>
                            IGST ₹{Number(calcItem.igstAmount).toFixed(2)} ({calcItem.igstRate}%)
                          </div>
                        ) : calcItem && Number(calcItem.cgstAmount || 0) > 0 ? (
                          <div style={{ fontSize: 9, color: "#059669", fontWeight: 600, marginTop: 2, lineHeight: 1.25 }}>
                            <div>CGST ₹{Number(calcItem.cgstAmount).toFixed(2)} ({calcItem.cgstRate}%)</div>
                            <div>SGST ₹{Number(calcItem.sgstAmount).toFixed(2)} ({calcItem.sgstRate}%)</div>
                          </div>
                        ) : null}
                      </td>

                      {/* Item Total */}
                      <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                        ₹{Number(total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Exp Delivery Date */}
                      <td style={{ padding: "10px 10px" }}>
                        <DateInput
                          value={item.expectedDeliveryDate}
                          onChange={(e) => onLineChange(idx, "expectedDeliveryDate", e.target.value)}
                          style={{
                            width: 105,
                            padding: "4px",
                            fontSize: 11,
                            borderRadius: 4,
                            border: "1px solid #cbd5e1"
                          }}
                        />
                      </td>

                      {/* Location */}
                      <td style={{ padding: "10px 10px" }}>
                        <input
                          type="text"
                          value={item.deliveryLocation}
                          onChange={(e) => onLineChange(idx, "deliveryLocation", e.target.value)}
                          style={{
                            width: 110,
                            padding: "4px",
                            fontSize: 11,
                            borderRadius: 4,
                            border: "1px solid #cbd5e1"
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION: VENDOR CARDS & VENDOR-LEVEL CHARGES (DELIVERY, OTHER, ROUND OFF) */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b" }}>
            Vendor-Grouped Purchase Commercials (Multiple Vendors)
          </div>

          {groups.map((grp) => {
            const vCode = grp.vendorCode;
            const vendor = grp.vendor;
            const charges = vendorChargesMap[vCode] || { deliveryFreight: 0, otherCharges: 0, roundOff: 0, poType: selectedPoType || "Standard PO" };
            const backendGrp = backendCalculation?.vendorGroups?.find((bg) => bg.vendorCode === vCode);
            const currentPoType = charges.poType || selectedPoType || backendGrp?.poType || "Standard PO";

            return (
              <div
                key={vCode}
                style={{
                  flexShrink: 0,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  background: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}
              >
                {/* Vendor Header Strip */}
                <div
                  style={{
                    background: "#1e293b",
                    color: "#ffffff",
                    padding: "10px 16px",
                    borderTopLeftRadius: 7,
                    borderTopRightRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icons.Building />
                    <span style={{ fontWeight: 800, fontSize: 13 }}>
                      {vCode === "UNASSIGNED" ? "UNASSIGNED VENDOR" : `${vCode} — ${vendor?.supplierName || "Selected Vendor"}`}
                    </span>
                    {vendor?.gstin && (
                      <span style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                        GSTIN: {vendor.gstin}
                      </span>
                    )}
                    {backendGrp && (
                      <span
                        style={{
                          background: backendGrp.isInterState ? "#7c3aed" : "#059669",
                          color: "#ffffff",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 800
                        }}
                      >
                        {backendGrp.taxSummaryText || (backendGrp.isInterState ? "Inter-State (IGST 100%)" : "Intra-State (CGST 50% + SGST 50%)")}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {grp.items.length} {grp.items.length === 1 ? "Item" : "Items"}
                  </div>
                </div>

                {/* Auto-populated Vendor Information Card (Part C) */}
                {vendor ? (
                  <div
                    style={{
                      background: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "10px 16px",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 10,
                      fontSize: 11,
                      color: "#334155"
                    }}
                  >
                    <div>
                      <span style={{ color: "#64748b" }}>Contact Person:</span>{" "}
                      <strong>{vendor.contactPerson || "-"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Phone / Mobile:</span>{" "}
                      <strong>{vendor.phone || "-"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Email:</span>{" "}
                      <strong>{vendor.email || "-"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>PAN:</span>{" "}
                      <strong>{vendor.pan || "-"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Payment Terms:</span>{" "}
                      <strong>{vendor.paymentTermsId || "Net 30 Days"}</strong>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#64748b" }}>Billing & Shipping Address:</span>{" "}
                      <span>{vendor.address ? `${vendor.address}, ${vendor.city || ""}, ${vendor.state || ""}` : "Registered Vendor Location"}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "8px 16px", background: "#fef2f2", color: "#991b1b", fontSize: 11, fontWeight: 600 }}>
                    ⚠️ Please select a vendor from Vendor Master above for these items.
                  </div>
                )}

                {/* Vendor Additional Commercial Charges (Delivery, Other, Round Off) */}
                <div
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 14,
                    background: "#ffffff",
                    borderBottomLeftRadius: 7,
                    borderBottomRightRadius: 7
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0369a1", marginBottom: 3 }}>
                        PO Type
                      </label>
                      <select
                        value={currentPoType}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (onPoTypeChange) onPoTypeChange(val);
                          handleVendorChargeChange(vCode, "poType", val);
                        }}
                        style={{ padding: "6px 12px", borderRadius: 5, border: "1.5px solid #0284c7", fontSize: 12, fontWeight: 700, background: "#f0f9ff", color: "#0369a1", outline: "none", cursor: "pointer" }}
                      >
                        <option value="Standard PO">Standard PO</option>
                        <option value="Planned / Scheduled PO">Planned / Scheduled PO</option>
                        <option value="Blanket Purchase Agreement">Blanket Purchase Agreement</option>
                        <option value="Service & Subcontract PO">Service &amp; Subcontract PO</option>
                        <option value="Capital Goods / CapEx PO">Capital Goods / CapEx PO</option>
                        <option value="Emergency Spot PO">Emergency Spot PO</option>
                      </select>
                    </div>

                    {(currentPoType === "Planned / Scheduled PO" || currentPoType === "Blanket Purchase Agreement") && (
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 3 }}>
                          Delivery &amp; Milestones
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setSchedulingVendorCode(vCode);
                            setSchedulingGroup(grp);
                            setSchedulingModalOpen(true);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 12px",
                            borderRadius: 4,
                            background: (charges.deliverySchedules && charges.deliverySchedules.length > 0) ? "#0284c7" : "#f0fdf4",
                            color: (charges.deliverySchedules && charges.deliverySchedules.length > 0) ? "#ffffff" : "#166534",
                            border: (charges.deliverySchedules && charges.deliverySchedules.length > 0) ? "1px solid #0284c7" : "1px solid #86efac",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                          }}
                        >
                          <span>📅</span>
                          <span>
                            {charges.deliverySchedules && charges.deliverySchedules.length > 0
                              ? `Configure Lots & Milestones (${charges.deliverySchedules.length} Lots, ${(charges.paymentMilestones || []).length} Milestones)`
                              : "📅 Configure Delivery Lots & Milestones"}
                          </span>
                        </button>
                      </div>
                    )}

                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 3 }}>
                        Delivery / Freight (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={charges.deliveryFreight || ""}
                        onChange={(e) => handleVendorChargeChange(vCode, "deliveryFreight", e.target.value)}
                        style={{ width: 110, padding: "5px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 3 }}>
                        Other Charges (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={charges.otherCharges || ""}
                        onChange={(e) => handleVendorChargeChange(vCode, "otherCharges", e.target.value)}
                        style={{ width: 110, padding: "5px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 3 }}>
                        Round Off (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={charges.roundOff || ""}
                        onChange={(e) => handleVendorChargeChange(vCode, "roundOff", e.target.value)}
                        style={{ width: 85, padding: "5px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}
                      />
                    </div>
                  </div>

                  {/* Vendor Tax Breakdown & Total Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    {backendGrp && (
                      <div style={{ textAlign: "right", background: "#f8fafc", padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", display: "block", fontWeight: 700, textTransform: "uppercase" }}>
                          Vendor Tax Breakdown
                        </span>
                        {backendGrp.isInterState ? (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#7c3aed" }}>
                            IGST: ₹{Number(backendGrp.igstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#059669", lineHeight: 1.25 }}>
                            <div>CGST: ₹{Number(backendGrp.cgstAmount || 0).toFixed(2)}</div>
                            <div>SGST: ₹{Number(backendGrp.sgstAmount || 0).toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Vendor Group Total</span>
                      <strong style={{ fontSize: 16, color: "#0f172a" }}>
                        ₹{Number(backendGrp?.vendorTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SECTION: PART F — PURCHASE PROCESSING COMPLETE SUMMARY */}
        <div
          style={{
            flexShrink: 0,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>
              Purchase Processing Financial Summary
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Calculations verified by Spring Boot backend calculation engine
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", fontSize: 12 }}>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Gross Amount:</span>
              <strong style={{ color: "#334155" }}>
                ₹{Number(backendCalculation?.grandGross || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block" }}>Total Discount:</span>
              <strong style={{ color: "#b91c1c" }}>
                -₹{Number(backendCalculation?.grandDiscount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block" }}>Taxable Amount:</span>
              <strong style={{ color: "#334155" }}>
                ₹{Number(backendCalculation?.grandTaxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block" }}>Total GST:</span>
              <strong style={{ color: "#0284c7" }}>
                +₹{Number(backendCalculation?.grandTax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
              <div style={{ fontSize: 10, marginTop: 2 }}>
                {Number(backendCalculation?.grandIgst || 0) > 0 && (
                  <span style={{ color: "#7c3aed", fontWeight: 700 }}>
                    IGST: ₹{Number(backendCalculation.grandIgst).toFixed(2)}{" "}
                  </span>
                )}
                {Number(backendCalculation?.grandCgst || 0) > 0 && (
                  <span style={{ color: "#059669", fontWeight: 700 }}>
                    CGST: ₹{Number(backendCalculation.grandCgst).toFixed(2)} | SGST: ₹{Number(backendCalculation.grandSgst).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block" }}>Delivery & Freight:</span>
              <strong style={{ color: "#334155" }}>
                ₹{Number(backendCalculation?.grandDelivery || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div
              style={{
                background: "#1e293b",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: 8,
                textAlign: "right"
              }}
            >
              <span style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>GRAND TOTAL (₹)</span>
              <strong style={{ fontSize: 18, color: "#38bdf8" }}>
                ₹{Number(backendCalculation?.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "12px 18px",
            gap: 12
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Icons.ArrowLeft />
            <span>Back to Item Selection</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={onSaveDraft}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Save Draft
            </button>
            <button
              onClick={onSubmitApproval}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "7px 20px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <span>Submit for PO Approval</span>
              <Icons.ArrowRight />
            </button>
          </div>
        </div>
      </div>

      {/* Connection 3 Modal: Quotation Picker */}
      {pickerLineIdx !== null && (
        <QuotationPickerModal
          isOpen={pickerLineIdx !== null}
          onClose={() => setPickerLineIdx(null)}
          targetLine={lines[pickerLineIdx]}
          targetPr={pr}
          quotations={allQuotations}
          onSelectQuote={(quote, quoteItem) => {
            onApplyQuoteToLine(pickerLineIdx, quote, quoteItem);
            setPickerLineIdx(null);
          }}
        />
      )}

      {/* Planned PO Delivery Lots & Commercial Milestones Builder Modal */}
      {schedulingModalOpen && schedulingGroup && (
        <PlannedPoScheduleModal
          vendor={schedulingGroup.vendor}
          vendorCode={schedulingGroup.vendorCode}
          items={schedulingGroup.items.map((it) => it.line)}
          charges={vendorChargesMap[schedulingGroup.vendorCode] || {}}
          vendorTotal={
            backendCalculation?.vendorGroups?.find((bg) => bg.vendorCode === schedulingGroup.vendorCode)?.vendorTotal ||
            schedulingGroup.items.reduce((acc, it) => acc + (Number(it.line.quantity * it.line.unitRate) || 0), 0)
          }
          onSave={(scheds, miles) => {
            const vCode = schedulingGroup.vendorCode;
            handleVendorChargeChange(vCode, {
              deliverySchedules: scheds,
              paymentMilestones: miles
            });
            setSchedulingModalOpen(false);
          }}
          onClose={() => setSchedulingModalOpen(false)}
        />
      )}
    </div>
  );
}


const PURCHASE_ORDER_PAGE_5_COLUMNS = [
  { key: "proposal_ref", width: 140 },
  { key: "pr_number", width: 120 },
  { key: "vendor_s", width: 220 },
  { key: "department", width: 120 },
  { key: "items", width: 80 },
  { key: "grand_total", width: 120 },
  { key: "requested_by", width: 130 },
  { key: "created_date", width: 110 },
  { key: "status", width: 140 },
  { key: "action", width: 180 },
];

// ============================================================================
// COMPONENT: SCREEN 2 — PO APPROVAL SCREEN
// ============================================================================
function Screen2POApproval({
  proposals,
  allProposalsCount,
  filterStatus,
  setFilterStatus,
  searchTerm,
  setSearchTerm,
  onSelectProposal,
  onApprove,
  onOpenRejectModal,
  onOpenChangesModal,
  onViewPo,
  onNavigate
}) {
  const purchaseOrderPage5Resize = useResizableColumns("purchase-order-page-5", PURCHASE_ORDER_PAGE_5_COLUMNS);
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* ROW 2: SEARCH INPUT & STATUS TABS */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Main Search Input */}
          <div style={{ width: 320, maxWidth: "100%", position: "relative" }}>
            <input
              type="text"
              placeholder="Search proposals by Proposal No, PR No, Dept..."
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

          {/* Status Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {[
              { label: "Pending PO Approval", key: "PENDING_PO_APPROVAL" },
              { label: "Approved", key: "APPROVED" },
              { label: "Changes Requested", key: "CHANGES_REQUESTED" },
              { label: "Rejected", key: "REJECTED" },
              { label: "All Proposals", key: "ALL" }
            ].map((st) => {
              const active = filterStatus === st.key;
              return (
                <button
                  key={st.key}
                  onClick={() => setFilterStatus(st.key)}
                  style={{
                    background: active ? "#2b3d52" : "#ffffff",
                    color: active ? "#ffffff" : "#475569",
                    border: active ? "1px solid #2b3d52" : "1px solid #cbd5e1",
                    borderRadius: 20,
                    padding: "3px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
          Showing <strong>{proposals.length}</strong> proposals
        </div>
      </div>

      {/* PROPOSALS TABLE */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12, ...purchaseOrderPage5Resize.tableStyle }}>
          <ResizableColGroup columns={PURCHASE_ORDER_PAGE_5_COLUMNS} widths={purchaseOrderPage5Resize.widths} />
          <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f1f5f9" }}>
            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 140 }}>PROPOSAL REF<ColumnResizeHandle colKey="proposal_ref" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 120 }}>PR NUMBER<ColumnResizeHandle colKey="pr_number" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 220 }}>VENDOR(S)<ColumnResizeHandle colKey="vendor_s" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 120 }}>DEPARTMENT<ColumnResizeHandle colKey="department" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 80, textAlign: "center" }}>ITEMS<ColumnResizeHandle colKey="items" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 120, textAlign: "right" }}>GRAND TOTAL<ColumnResizeHandle colKey="grand_total" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 130 }}>REQUESTED BY<ColumnResizeHandle colKey="requested_by" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 110 }}>CREATED DATE<ColumnResizeHandle colKey="created_date" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 140, textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={purchaseOrderPage5Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 180, textAlign: "center" }}>ACTION<ColumnResizeHandle colKey="action" resize={purchaseOrderPage5Resize} /></th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    No purchase proposals found for the selected status.
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    Proposals submitted in Screen 1 (Purchase Processing) appear here for manager review.
                  </div>
                </td>
              </tr>
            ) : (
              proposals.map((prop, idx) => {
                const vendorsStr = (prop.vendorGroups || [])
                  .map((vg) => vg.vendorName || vg.vendorCode)
                  .join(", ") || "Pending Vendor Assignment";

                const isPending = prop.status === "PENDING_PO_APPROVAL";
                const isApproved = prop.status === "APPROVED";
                const isRejected = prop.status === "REJECTED";
                const isChanges = prop.status === "CHANGES_REQUESTED";

                return (
                  <tr
                    key={prop.id || idx}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe"
                    }}
                  >
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0284c7" }}>
                      {prop.proposalNumber}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#334155", fontWeight: 600 }}>
                      {prop.prNumber ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigate) {
                              sessionStorage.setItem("SMS_SELECTED_PR_NUMBER", prop.prNumber);
                              onNavigate("purchase-requisition");
                            }
                          }}
                          title={`Open PR ${prop.prNumber}`}
                          style={{
                            cursor: onNavigate ? "pointer" : "default",
                            color: onNavigate ? "#0284c7" : "#334155",
                            textDecoration: onNavigate ? "underline" : "none",
                            fontWeight: 700
                          }}
                        >
                          {prop.prNumber} ↗
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#1e293b", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {vendorsStr}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>
                      {prop.department}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700 }}>
                      {(prop.items || []).length}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                      ₹{Number(prop.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>
                      {prop.requestedBy}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#64748b" }}>
                      {formatDisplayDate(prop.createdAt) || formatDisplayDate(prop.prDate) || "-"}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          background: isPending ? "#fef3c7" : isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef9c3",
                          color: isPending ? "#b45309" : isApproved ? "#15803d" : isRejected ? "#b91c1c" : "#854d0e",
                          fontWeight: 800,
                          fontSize: 10,
                          padding: "3px 8px",
                          borderRadius: 4
                        }}
                      >
                        {prop.status}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          onClick={() => onSelectProposal(prop)}
                          style={{
                            background: isPending ? "#1e293b" : "#ffffff",
                            border: isPending ? "none" : "1px solid #cbd5e1",
                            color: isPending ? "#ffffff" : "#334155",
                            padding: "4px 10px",
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          {isPending ? "Review & Decide" : "View Proposal"}
                        </button>

                        {isApproved && prop.generatedPoNumbers?.length > 0 && (
                          <button
                            onClick={() => onViewPo(prop.generatedPoNumbers[0])}
                            title="View Generated PO Document"
                            style={{
                              background: "#0284c7",
                              border: "none",
                              color: "#ffffff",
                              padding: "4px 8px",
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <Icons.Printer />
                            <span>PO</span>
                          </button>
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
    </div>
  );
}

const PURCHASE_ORDER_PAGE_6_COLUMNS = [
  { key: "item", width: 80 },
  { key: "hsn_sac", width: 89 },
  { key: "category", width: 96 },
  { key: "qty", width: 80 },
  { key: "uom", width: 80 },
  { key: "rate", width: 96 },
  { key: "disc", width: 96 },
  { key: "tax", width: 89 },
  { key: "item_total", width: 138 },
  { key: "delivery_date", width: 131 },
  { key: "location", width: 96 },
];

// ============================================================================
// COMPONENT: PO APPROVAL REVIEW & DECISION MODAL
// ============================================================================
function POApprovalReviewModal({
  proposal,
  onClose,
  onApprove,
  onReject,
  onRequestChanges,
  onNavigate
}) {
  const purchaseOrderPage6Resize = useResizableColumns("purchase-order-page-6", PURCHASE_ORDER_PAGE_6_COLUMNS);
  const isPending = proposal.status === "PENDING_PO_APPROVAL";
  const [approveValidityDate, setApproveValidityDate] = useState("");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: 20
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 1080,
          maxHeight: "92vh",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #cbd5e1"
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            background: "#1e293b",
            color: "#ffffff",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                background: "#0284c7",
                color: "#fff",
                padding: "3px 8px",
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 12
              }}
            >
              PROPOSAL REVIEW
            </div>
            <span style={{ fontSize: 16, fontWeight: 800 }}>
              {proposal.proposalNumber} (PR #{proposal.prNumber})
            </span>
            <span
              style={{
                background: isPending ? "#fef3c7" : "#dcfce7",
                color: isPending ? "#b45309" : "#15803d",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 11
              }}
            >
              {proposal.status}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <Icons.Cross />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* PR Information Strip */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "12px 16px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              fontSize: 12
            }}
          >
            <div>
              <span style={{ color: "#64748b", display: "block" }}>PR Number:</span>
              <span
                onClick={() => {
                  if (onNavigate && proposal.prNumber) {
                    sessionStorage.setItem("SMS_SELECTED_PR_NUMBER", proposal.prNumber);
                    onClose();
                    onNavigate("purchase-requisition");
                  }
                }}
                style={{
                  cursor: onNavigate ? "pointer" : "default",
                  color: "#0284c7",
                  fontWeight: 800,
                  textDecoration: onNavigate ? "underline" : "none"
                }}
                title="Open Purchase Requisition"
              >
                {proposal.prNumber} ↗
              </span>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>PR Date:</span>
              <strong style={{ color: "#1e293b" }}>{formatDisplayDate(proposal.prDate)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Department:</span>
              <strong style={{ color: "#1e293b" }}>{proposal.department}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Requested By:</span>
              <strong style={{ color: "#1e293b" }}>{proposal.requestedBy}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Required By Date:</span>
              <strong style={{ color: "#b91c1c" }}>{formatDisplayDate(proposal.requiredByDate)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Purpose:</span>
              <span>{proposal.purpose || "Production batch"}</span>
            </div>
          </div>

          {/* Vendors & Items Details */}
          {(proposal.vendorGroups || []).map((vg, vIdx) => (
            <div
              key={vIdx}
              style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}
            >
              {/* Vendor Header */}
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "8px 16px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <strong style={{ color: "#1e293b", fontSize: 13 }}>
                    {vg.vendorCode} — {vg.vendorName}
                  </strong>
                  {vg.vendorGstin && (
                    <span style={{ marginLeft: 10, fontSize: 11, color: "#64748b" }}>
                      GSTIN: {vg.vendorGstin}
                    </span>
                  )}
                  {vg.vendorGstin && (
                    <span
                      style={{
                        marginLeft: 8,
                        background: vg.vendorGstin.startsWith("27") ? "#059669" : "#7c3aed",
                        color: "#ffffff",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700
                      }}
                    >
                      {vg.vendorGstin.startsWith("27") ? "Intra-State (CGST + SGST)" : "Inter-State (IGST)"}
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: 8,
                      background: (vg.poType === "Planned / Scheduled PO" || vg.poType === "Blanket Purchase Agreement") ? "#dcfce7" : "#eff6ff",
                      color: (vg.poType === "Planned / Scheduled PO" || vg.poType === "Blanket Purchase Agreement") ? "#166534" : "#1e40af",
                      border: (vg.poType === "Planned / Scheduled PO" || vg.poType === "Blanket Purchase Agreement") ? "1px solid #86efac" : "1px solid #bfdbfe",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 800
                    }}
                  >
                    PO Type: {vg.poType || "Standard PO"}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                  Vendor Total: ₹{Number(vg.vendorTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Items Table */}
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left", ...purchaseOrderPage6Resize.tableStyle }}>
                <ResizableColGroup columns={PURCHASE_ORDER_PAGE_6_COLUMNS} widths={purchaseOrderPage6Resize.widths} />
                <thead style={{ background: "#ffffff", borderBottom: "1px solid #f1f5f9" }}>
                  <tr>
                    <th style={{ padding: "6px 12px" }}>ITEM<ColumnResizeHandle colKey="item" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px" }}>HSN/SAC<ColumnResizeHandle colKey="hsn_sac" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px" }}>CATEGORY<ColumnResizeHandle colKey="category" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px", textAlign: "right" }}>QTY<ColumnResizeHandle colKey="qty" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px" }}>UOM<ColumnResizeHandle colKey="uom" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px", textAlign: "right" }}>RATE (₹)<ColumnResizeHandle colKey="rate" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px", textAlign: "right" }}>DISC (₹)<ColumnResizeHandle colKey="disc" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px", textAlign: "right" }}>TAX (₹)<ColumnResizeHandle colKey="tax" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px", textAlign: "right" }}>ITEM TOTAL (₹)<ColumnResizeHandle colKey="item_total" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px" }}>DELIVERY DATE<ColumnResizeHandle colKey="delivery_date" resize={purchaseOrderPage6Resize} /></th>
                    <th style={{ padding: "6px 12px" }}>LOCATION<ColumnResizeHandle colKey="location" resize={purchaseOrderPage6Resize} /></th>
                  </tr>
                </thead>
                <tbody>
                  {(vg.items || []).map((it, iIdx) => (
                    <tr key={iIdx} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "6px 12px" }}>
                        <strong style={{ color: "#0284c7" }}>{it.itemCode}</strong> - {it.itemName}
                      </td>
                      <td style={{ padding: "6px 12px" }}>
                        <span style={{ fontWeight: 700, color: "#334155" }}>{it.hsnCode || "-"}</span>
                      </td>
                      <td style={{ padding: "6px 12px", color: "#64748b" }}>{it.category}</td>
                      <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700 }}>{it.quantity}</td>
                      <td style={{ padding: "6px 12px", color: "#64748b" }}>{it.uom}</td>
                      <td style={{ padding: "6px 12px", textAlign: "right" }}>₹{it.unitRate}</td>
                      <td style={{ padding: "6px 12px", textAlign: "right", color: "#b91c1c" }}>-₹{it.discountAmount}</td>
                      <td style={{ padding: "6px 12px", textAlign: "right", color: "#0284c7" }}>
                        <div>+₹{it.taxAmount}</div>
                        {Number(it.igstAmount || 0) > 0 ? (
                          <div style={{ fontSize: 9, color: "#7c3aed" }}>IGST ₹{it.igstAmount}</div>
                        ) : Number(it.cgstAmount || 0) > 0 ? (
                          <div style={{ fontSize: 9, color: "#059669" }}>C: ₹{it.cgstAmount} | S: ₹{it.sgstAmount}</div>
                        ) : null}
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700 }}>₹{it.itemTotal}</td>
                      <td style={{ padding: "6px 12px", color: "#64748b" }}>{formatDisplayDate(it.expectedDeliveryDate) || "-"}</td>
                      <td style={{ padding: "6px 12px", color: "#64748b" }}>{it.deliveryLocation || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Vendor freight/other charges line */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "6px 16px",
                  fontSize: 11,
                  color: "#64748b",
                  display: "flex",
                  gap: 16,
                  borderTop: "1px solid #f1f5f9"
                }}
              >
                <span>Freight: ₹{vg.deliveryFreight || 0}</span>
                <span>Other Charges: ₹{vg.otherCharges || 0}</span>
                <span>Round Off: ₹{vg.roundOff || 0}</span>
              </div>

              {/* Configured Planned Delivery Lots Display */}
              {vg.deliverySchedules && vg.deliverySchedules.length > 0 && (
                <div style={{ background: "#f0fdf4", borderTop: "1px solid #bbf7d0", padding: "10px 16px", fontSize: 11 }}>
                  <div style={{ fontWeight: 800, color: "#166534", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📅</span>
                    <span>Configured Planned Delivery Lots ({vg.deliverySchedules.length} Lots)</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                    {vg.deliverySchedules.map((lot, lIdx) => (
                      <div key={lIdx} style={{ background: "#ffffff", border: "1px solid #86efac", borderRadius: 6, padding: "6px 10px" }}>
                        <div style={{ fontWeight: 700, color: "#065f46" }}>Lot #{lot.lotNumber}: {lot.scheduledQty} PCS</div>
                        <div style={{ color: "#64748b", fontSize: 10 }}>Due: {formatDisplayDate(lot.scheduledDate)} • {lot.destinationStore || "Plant Store"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Configured Commercial Payment Milestones Display */}
              {vg.paymentMilestones && vg.paymentMilestones.length > 0 && (
                <div style={{ background: "#f0f9ff", borderTop: "1px solid #bae6fd", padding: "10px 16px", fontSize: 11 }}>
                  <div style={{ fontWeight: 800, color: "#0369a1", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>💰</span>
                    <span>Commercial Payment Milestones ({vg.paymentMilestones.length} Milestones)</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                    {vg.paymentMilestones.map((m, mIdx) => (
                      <div key={mIdx} style={{ background: "#ffffff", border: "1px solid #7dd3fc", borderRadius: 6, padding: "6px 10px" }}>
                        <div style={{ fontWeight: 700, color: "#0c4a6e" }}>#{m.milestoneSequence}: {m.milestoneTitle}</div>
                        <div style={{ color: "#0284c7", fontWeight: 800 }}>₹{Number(m.milestoneAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({m.percentage}%)</div>
                        <div style={{ color: "#64748b", fontSize: 10 }}>Trigger: {m.triggerEvent}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Financial Breakdown card */}
          <div
            style={{
              background: "#f1f5f9",
              borderRadius: 8,
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b" }}>Financial Summary</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>Validated & calculated on server</div>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Subtotal:</span>
                <strong>₹{Number(proposal.grandGross || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Discount:</span>
                <strong style={{ color: "#b91c1c" }}>-₹{Number(proposal.grandDiscount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Taxable:</span>
                <strong>₹{Number(proposal.grandTaxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Total GST:</span>
                <strong style={{ color: "#0284c7" }}>+₹{Number(proposal.grandTax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Delivery:</span>
                <strong>₹{Number(proposal.grandDelivery || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div
                style={{
                  background: "#1e293b",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: 6
                }}
              >
                <span style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>GRAND TOTAL</span>
                <strong style={{ fontSize: 18, color: "#38bdf8" }}>
                  ₹{Number(proposal.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>

          {/* Previous approver remarks / rejection reason if any */}
          {proposal.rejectionReason && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "#991b1b" }}>
              <strong>Rejection Reason:</strong> {proposal.rejectionReason} (Rejected by: {proposal.rejectedBy} on {formatDisplayDateTime(proposal.rejectedAt)})
            </div>
          )}
          {proposal.changesComments && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
              <strong>Change Requests:</strong> {proposal.changesComments} (Requested by: {proposal.changesRequestedBy} on {formatDisplayDateTime(proposal.changesRequestedAt)})
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Bar */}
        <div
          style={{
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Close
          </button>

          {isPending ? (
            <div style={{ display: "flex", gap: 10 }}>
              {/* REJECT */}
              <button
                onClick={onReject}
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fca5a5",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13
                }}
              >
                Reject Proposal
              </button>

              {/* REQUEST CHANGES */}
              <button
                onClick={onRequestChanges}
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fcd34d",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13
                }}
              >
                Request Changes
              </button>

              {/* PO VALIDITY DATE: mandatory for every PO generated from this proposal */}
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, fontWeight: 700, color: "#334155" }}>
                PO Validity Date *
                <DateInput
                  min={todayIso()}
                  value={approveValidityDate}
                  onChange={(e) => setApproveValidityDate(e.target.value)}
                  style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                />
              </label>

              {/* APPROVE */}
              <button
                onClick={() => onApprove(approveValidityDate)}
                disabled={!approveValidityDate}
                title={approveValidityDate ? "" : "Enter the PO Validity Date to approve"}
                style={{
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 22px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 13,
                  boxShadow: "0 2px 4px rgba(5, 150, 105, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Icons.Check />
                <span>APPROVE & GENERATE PO</span>
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              Status: {proposal.status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PURCHASE_ORDER_PAGE_7_COLUMNS = [
  { key: "po_number", width: 130 },
  { key: "po_date", width: 100 },
  { key: "po_validity", width: 150 },
  { key: "source_pr", width: 120 },
  { key: "source_quote", width: 135 },
  { key: "vendor_name", width: 200 },
  { key: "gstin", width: 130 },
  { key: "items", width: 65 },
  { key: "po_amount", width: 125 },
  { key: "status", width: 95 },
  { key: "actions", width: 150 },
];

// ============================================================================
// COMPONENT: SCREEN 3 — ISSUED PURCHASE ORDERS LIST
// ============================================================================
function Screen3PurchaseOrdersList({ orders, onViewPo, onAmendPo, onViewRevisions, onExtendValidity, onCancelPo, onRefresh, onSwitchTab, onNavigate }) {
  const purchaseOrderPage7Resize = useResizableColumns("purchase-order-page-7", PURCHASE_ORDER_PAGE_7_COLUMNS);
  const [poSearch, setPoSearch] = useState("");

  const filtered = orders.filter((o) => {
    if (!poSearch.trim()) return true;
    const q = poSearch.toLowerCase();
    return (
      (o.poNumber && o.poNumber.toLowerCase().includes(q)) ||
      (o.vendorName && o.vendorName.toLowerCase().includes(q)) ||
      (o.prNumber && o.prNumber.toLowerCase().includes(q)) ||
      (o.sourceQuotationNumber && o.sourceQuotationNumber.toLowerCase().includes(q)) ||
      (o.department && o.department.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* ROW 2: SEARCH INPUT */}
      <div
        style={{
          flexShrink: 0,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "9px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ width: 320, maxWidth: "100%" }}>
          <input
            type="text"
            placeholder="Search PO by Number, Vendor, PR, Quote..."
            value={poSearch}
            onChange={(e) => setPoSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              outline: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onSwitchTab && (
            <button
              onClick={() => onSwitchTab("processing")}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>+ Process Approved PR into PO</span>
            </button>
          )}
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            {filtered.length} Generated Purchase Orders
          </div>
        </div>
      </div>

      {/* PO TABLE */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12, ...purchaseOrderPage7Resize.tableStyle }}>
          <ResizableColGroup columns={PURCHASE_ORDER_PAGE_7_COLUMNS} widths={purchaseOrderPage7Resize.widths} />
          <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f1f5f9" }}>
            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 130 }}>PO NUMBER<ColumnResizeHandle colKey="po_number" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 100 }}>PO DATE<ColumnResizeHandle colKey="po_date" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 150 }}>PO VALIDITY<ColumnResizeHandle colKey="po_validity" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 120 }}>SOURCE PR<ColumnResizeHandle colKey="source_pr" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 135 }}>SOURCE QUOTE<ColumnResizeHandle colKey="source_quote" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 200 }}>VENDOR NAME<ColumnResizeHandle colKey="vendor_name" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 130 }}>GSTIN<ColumnResizeHandle colKey="gstin" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 65, textAlign: "center" }}>ITEMS<ColumnResizeHandle colKey="items" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 125, textAlign: "right" }}>PO AMOUNT (₹)<ColumnResizeHandle colKey="po_amount" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 95, textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={purchaseOrderPage7Resize} /></th>
              <th style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b", width: 150, textAlign: "center" }}>ACTIONS<ColumnResizeHandle colKey="actions" resize={purchaseOrderPage7Resize} /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                    No Purchase Orders generated yet
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                    Convert approved Purchase Requisitions into PO proposals in Screen 1, then approve them in Screen 2 to generate official Purchase Orders.
                  </div>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    <button
                      onClick={() => onSwitchTab && onSwitchTab("processing")}
                      style={{
                        padding: "8px 16px",
                        background: "#0284c7",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 8px rgba(2,132,199,0.25)"
                      }}
                    >
                      <span>➔ Go to Purchase Processing (Screen 1)</span>
                    </button>
                    <button
                      onClick={() => onSwitchTab && onSwitchTab("approval")}
                      style={{
                        padding: "8px 16px",
                        background: "#f1f5f9",
                        color: "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <span>Review Pending Approvals (Screen 2)</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((po, idx) => (
                <tr
                  key={po.id || idx}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe"
                  }}
                >
                  <td style={{ padding: "9px 12px", fontWeight: 800, color: "#0284c7" }}>
                    <div>{po.poNumber}</div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        marginTop: 2,
                        background: po.poType === "Planned / Scheduled PO" ? "#dcfce7" : "#f1f5f9",
                        color: po.poType === "Planned / Scheduled PO" ? "#166534" : "#475569",
                        border: po.poType === "Planned / Scheduled PO" ? "1px solid #86efac" : "1px solid #cbd5e1"
                      }}
                    >
                      {po.poType || "Standard PO"}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", color: "#334155" }}>
                    {formatDisplayDate(po.poDate)}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <PoValidityBadge status={po.validityStatus} date={po.validityDate} />
                  </td>
                  <td style={{ padding: "9px 12px", color: "#334155", fontWeight: 600 }}>
                    {po.prNumber ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigate) {
                            sessionStorage.setItem("SMS_SELECTED_PR_NUMBER", po.prNumber);
                            onNavigate("purchase-requisition");
                          }
                        }}
                        title={`Open PR ${po.prNumber}`}
                        style={{
                          cursor: onNavigate ? "pointer" : "default",
                          color: onNavigate ? "#0284c7" : "#334155",
                          textDecoration: onNavigate ? "underline" : "none",
                          fontWeight: 700
                        }}
                      >
                        {po.prNumber} ↗
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#334155" }}>
                    {po.sourceQuotationNumber ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigate) {
                            sessionStorage.setItem("SMS_SELECTED_QUOTATION_NUMBER", po.sourceQuotationNumber);
                            onNavigate("vendor-quotations");
                          }
                        }}
                        title={`Open Quotation ${po.sourceQuotationNumber}`}
                        style={{
                          cursor: onNavigate ? "pointer" : "default",
                          color: onNavigate ? "#059669" : "#334155",
                          textDecoration: onNavigate ? "underline" : "none",
                          fontWeight: 700
                        }}
                      >
                        {po.sourceQuotationNumber} ↗
                      </span>
                    ) : (
                      <span style={{ color: "#64748b", fontStyle: "italic", fontSize: 11 }}>
                        Direct Purchase
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>
                    {po.vendorName}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#475569" }}>
                    {po.vendorGstin || "-"}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700 }}>
                    {(po.items || []).length}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                    ₹{Number(po.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <span
                      style={{
                        background: po.status === "CANCELLED" ? "#fee2e2" : "#dcfce7",
                        color: po.status === "CANCELLED" ? "#b91c1c" : "#15803d",
                        fontWeight: 800,
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4
                      }}
                    >
                      {po.status || "APPROVED"}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <button
                        onClick={() => onViewPo(po)}
                        style={{
                          background: "#1e293b",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 5,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <Icons.FileText />
                        <span>View</span>
                      </button>

                      {po.status !== "CANCELLED" && onAmendPo && (
                        <button
                          onClick={() => onAmendPo(po)}
                          title="Amend line items, quantities, rates or discount on this PO"
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            borderRadius: 5,
                            padding: "5px 9px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Amend
                        </button>
                      )}

                      {po.status !== "CANCELLED" && onExtendValidity && (
                        <button
                          onClick={() => onExtendValidity(po)}
                          title="View validity, extend the PO validity date and see the audit history"
                          style={{
                            background: po.validityStatus === "EXPIRED" ? "#fee2e2" : "#f0fdf4",
                            color: po.validityStatus === "EXPIRED" ? "#b91c1c" : "#166534",
                            border: po.validityStatus === "EXPIRED" ? "1px solid #fca5a5" : "1px solid #86efac",
                            borderRadius: 5,
                            padding: "5px 9px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Validity
                        </button>
                      )}

                      {onViewRevisions && (
                        <button
                          onClick={() => onViewRevisions(po)}
                          title="View revision audit trail & change history"
                          style={{
                            background: Number(po.revisionNumber) > 0 ? "#fef3c7" : "#f8fafc",
                            color: Number(po.revisionNumber) > 0 ? "#92400e" : "#475569",
                            border: Number(po.revisionNumber) > 0 ? "1px solid #fde68a" : "1px solid #cbd5e1",
                            borderRadius: 5,
                            padding: "5px 8px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer"
                          }}
                        >
                          Rev {po.revisionNumber || 0}
                        </button>
                      )}

                      {po.status !== "CANCELLED" && onCancelPo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelPo(po);
                          }}
                          title="Cancel this PO and release quantities back to PR"
                          style={{
                            background: "#fee2e2",
                            color: "#b91c1c",
                            border: "1px solid #fca5a5",
                            borderRadius: 5,
                            padding: "5px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: OFFICIAL PRINTABLE PURCHASE ORDER (PO) DOCUMENT MODAL
// ============================================================================
// Helper: Convert Number to Indian Rupee Words for official commercial documents
function numberToWordsINR(num) {
  if (num === null || num === undefined || isNaN(num)) return "";
  const n = Math.round(Number(num));
  if (n === 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(val) {
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "");
    if (val < 1000) return a[Math.floor(val / 100)] + " Hundred" + (val % 100 !== 0 ? " and " + inWords(val % 100) : "");
    if (val < 100000) return inWords(Math.floor(val / 1000)) + " Thousand" + (val % 1000 !== 0 ? " " + inWords(val % 1000) : "");
    if (val < 10000000) return inWords(Math.floor(val / 100000)) + " Lakh" + (val % 100000 !== 0 ? " " + inWords(val % 100000) : "");
    return inWords(Math.floor(val / 10000000)) + " Crore" + (val % 10000000 !== 0 ? " " + inWords(val % 10000000) : "");
  }

  return "Rupees " + inWords(n) + " Only";
}

const PURCHASE_ORDER_PAGE_9_COLUMNS = [
  { key: "lot", width: 80 },
  { key: "item_code", width: 103 },
  { key: "scheduled_date", width: 138 },
  { key: "scheduled_qty", width: 131 },
  { key: "received_qty", width: 124 },
  { key: "balance_qty", width: 117 },
  { key: "status", width: 82 },
];

const PURCHASE_ORDER_PAGE_10_COLUMNS = [
  { key: "sr", width: 80 },
  { key: "tranche_title", width: 145 },
  { key: "trigger_event", width: 131 },
  { key: "col3", width: 80 },
  { key: "amount", width: 110 },
  { key: "credit_days", width: 117 },
  { key: "status", width: 82 },
];

const PURCHASE_ORDER_PAGE_11_COLUMNS = [
  { key: "grn_number", width: 110 },
  { key: "date", width: 80 },
  { key: "challan_no", width: 110 },
  { key: "received", width: 96 },
  { key: "accepted", width: 96 },
  { key: "rejected", width: 96 },
  { key: "status", width: 82 },
];

function PurchaseOrderDocumentModal({ po, onClose, onNavigate }) {
  const purchaseOrderPage11Resize = useResizableColumns("purchase-order-page-11", PURCHASE_ORDER_PAGE_11_COLUMNS);
  const purchaseOrderPage10Resize = useResizableColumns("purchase-order-page-10", PURCHASE_ORDER_PAGE_10_COLUMNS);
  const purchaseOrderPage9Resize = useResizableColumns("purchase-order-page-9", PURCHASE_ORDER_PAGE_9_COLUMNS);
  const [linkedGrns, setLinkedGrns] = useState([]);
  const [schedules, setSchedules] = useState(po?.deliverySchedules || []);
  const [milestones, setMilestones] = useState(po?.paymentMilestones || []);
  const [viewMode, setViewMode] = useState("po-1page"); // "po-1page" or "extended"

  useEffect(() => {
    if (po && po.poNumber) {
      fetch(`/api/purchase/grn/by-po/${encodeURIComponent(po.poNumber)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setLinkedGrns(Array.isArray(data) ? data : []))
        .catch(() => {});

      fetch(`/api/purchase/orders/${encodeURIComponent(po.poNumber)}/schedules`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setSchedules(Array.isArray(data) ? data : []))
        .catch(() => {});

      fetch(`/api/purchase/orders/${encodeURIComponent(po.poNumber)}/milestones`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setMilestones(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [po]);

  // Handle ESC key to return to software
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Purchase_Order_${po.poNumber || "Document"}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const hasExtraAudit = (schedules && schedules.length > 0) || (milestones && milestones.length > 0) || (linkedGrns && linkedGrns.length > 0);

  return (
    <div
      className="po-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: 16
      }}
    >
      {/* Dynamic Print Stylesheet to guarantee 1-Page print without clipping or scrolling artifacts */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }

          /* Hide everything except the printable PO */
          body * {
            visibility: hidden !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Reset all modal containers so they don't clip */
          .po-modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
            z-index: auto !important;
          }

          .po-modal-container {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .po-screen-only {
            display: none !important;
            visibility: hidden !important;
          }

          /* Make only the PO Printable Document visible and full-width */
          #po-printable-area, #po-printable-area * {
            visibility: visible !important;
          }

          #po-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            display: block !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }

          .po-print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .po-print-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div
        className="po-modal-container"
        style={{
          background: "#ffffff",
          borderRadius: 10,
          width: "100%",
          maxWidth: 920,
          maxHeight: "96vh",
          boxShadow: "0 25px 50px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Document Action Strip (Screen Only) */}
        <div
          className="po-screen-only"
          style={{
            background: "#1e293b",
            color: "#ffffff",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #334155"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Prominent Back to Software Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#334155",
                color: "#ffffff",
                border: "1px solid #475569",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
              }}
              title="Return to Purchase Order software (Esc)"
            >
              <span>← Back to Software</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
              <Icons.FileText />
              <span>Purchase Order — {po.poNumber}</span>
              <span
                style={{
                  fontSize: 10,
                  background: po.status === "APPROVED" ? "#166534" : "#0284c7",
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontWeight: 700,
                  textTransform: "uppercase"
                }}
              >
                {po.status || "APPROVED"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* View Mode Toggle */}
            {hasExtraAudit && (
              <div style={{ display: "flex", background: "#0f172a", borderRadius: 6, padding: 2, border: "1px solid #334155" }}>
                <button
                  type="button"
                  onClick={() => setViewMode("po-1page")}
                  style={{
                    background: viewMode === "po-1page" ? "#0284c7" : "transparent",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 9px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                  title="Official 1-page PO fit"
                >
                  📄 1-Page Official PO
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("extended")}
                  style={{
                    background: viewMode === "extended" ? "#0284c7" : "transparent",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 9px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                  title="Include delivery lot schedules & inward GRNs"
                >
                  📋 Extended Audit ({schedules.length + milestones.length + linkedGrns.length})
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 5,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
              title="Print full purchase order cleanly in one page"
            >
              <Icons.Printer />
              <span>Print PO</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: 5,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
              title="Close and return to software (Esc)"
            >
              <span>✕ Close</span>
            </button>
          </div>
        </div>

        {/* Printable PO Paper Container */}
        <div
          id="po-printable-area"
          style={{
            padding: "22px 28px",
            overflowY: "auto",
            flex: 1,
            background: "#ffffff",
            fontFamily: "'Inter', system-ui, sans-serif",
            color: "#0f172a"
          }}
        >
          {/* Company & Document Header */}
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em" }}>
                SILVER MULLER SEALS LTD
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2, fontWeight: 500 }}>
                Manufacturers of High Precision Automotive & Industrial Oil Seals
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                Plot No. 42, GIDC Sector 3, Silvassa, D&NH - 396230 • <strong>GSTIN:</strong> 24AAACS1234D1Z5
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>
                Email: purchase@silvermuller.com • Phone: +91 260 2640100
              </div>
            </div>

            <div style={{ textAlign: "right", minWidth: 220 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#0284c7", letterSpacing: "0.04em" }}>PURCHASE ORDER</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: "#0f172a" }}>PO No: {po.poNumber}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: (po.poType === "Planned / Scheduled PO" || po.poType === "Blanket Purchase Agreement") ? "#166534" : "#0284c7" }}>
                Type: {po.poType || "Standard PO"}
              </div>
              <div style={{ fontSize: 11, color: "#334155" }}>Date: {formatDisplayDate(po.poDate)}</div>
              <div style={{ fontSize: 11, color: po.validityStatus === "EXPIRED" ? "#b91c1c" : "#334155", fontWeight: po.validityStatus === "EXPIRED" ? 700 : 400 }}>
                {po.validityDate
                  ? `Valid Until: ${formatDisplayDate(po.validityDate)}${po.validityStatus === "EXPIRED" ? " (EXPIRED)" : ""}`
                  : "Validity: not set"}
              </div>
              {po.prNumber && (
                <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 1 }}>
                  PR Ref:{" "}
                  <span
                    onClick={() => {
                      if (onNavigate) {
                        sessionStorage.setItem("SMS_SELECTED_PR_NUMBER", po.prNumber);
                        onClose();
                        onNavigate("purchase-requisition");
                      }
                    }}
                    style={{
                      color: onNavigate ? "#0284c7" : "#0f172a",
                      cursor: onNavigate ? "pointer" : "default",
                      fontWeight: 700
                    }}
                    title="View Source PR"
                  >
                    {po.prNumber}
                  </span>
                </div>
              )}
              {po.sourceQuotationNumber && (
                <div style={{ fontSize: 10.5, color: "#64748b" }}>
                  Quote Ref:{" "}
                  <span
                    onClick={() => {
                      if (onNavigate) {
                        sessionStorage.setItem("SMS_SELECTED_QUOTATION_NUMBER", po.sourceQuotationNumber);
                        onClose();
                        onNavigate("vendor-quotations");
                      }
                    }}
                    style={{
                      color: onNavigate ? "#059669" : "#0f172a",
                      cursor: onNavigate ? "pointer" : "default",
                      fontWeight: 700
                    }}
                    title="View Source Quotation"
                  >
                    {po.sourceQuotationNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Timestamp Ribbon (Compact 1-Row) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 10,
              color: "#334155",
              marginBottom: 8
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>🕒 Created: </span>
              <strong>{formatAuditDateTime(po.createdAt || po.created_at) || po.poDate || "Recorded"}</strong>
              <span style={{ color: "#64748b" }}> by </span>
              <strong>{po.requestedBy || po.requested_by || "Purchase Team"}</strong>
            </div>
            <div>
              {po.approvedAt || po.approvedBy ? (
                <>
                  <span style={{ color: "#166534", fontWeight: 700 }}>✓ Approved: </span>
                  <strong>{formatAuditDateTime(po.approvedAt || po.approved_at) || po.approvedAt || "Approved"}</strong>
                  <span style={{ color: "#64748b" }}> by </span>
                  <strong style={{ color: "#166534" }}>{po.approvedBy || po.approved_by || "General Manager (SCM)"}</strong>
                </>
              ) : (
                <span style={{ color: "#0284c7", fontWeight: 700 }}>Status: {po.status || "APPROVED"}</span>
              )}
            </div>
          </div>

          {/* Vendor and Ship-To Address Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            {/* Vendor Details */}
            <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "6px 10px", fontSize: 10.5, lineHeight: 1.35 }}>
              <div style={{ fontWeight: 800, color: "#64748b", fontSize: 9.5, textTransform: "uppercase", marginBottom: 2 }}>
                Vendor / Supplier
              </div>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: "#0f172a" }}>{po.vendorName}</div>
              <div style={{ color: "#334155" }}>
                Code: <strong>{po.vendorCode}</strong>
                {po.vendorGstin ? <> • GSTIN: <strong>{po.vendorGstin}</strong></> : null}
                {po.vendorPan ? <> • PAN: <strong>{po.vendorPan}</strong></> : null}
              </div>
              {(po.contactPerson || po.phone) && (
                <div style={{ color: "#334155" }}>
                  {po.contactPerson ? <>Attn: <strong>{po.contactPerson}</strong></> : null}
                  {po.phone ? <> • Ph: {po.phone}</> : null}
                </div>
              )}
              {po.billingAddress && <div style={{ color: "#64748b", marginTop: 2, fontSize: 10 }}>{po.billingAddress}</div>}
            </div>

            {/* Ship-To Details */}
            <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "6px 10px", fontSize: 10.5, lineHeight: 1.35 }}>
              <div style={{ fontWeight: 800, color: "#64748b", fontSize: 9.5, textTransform: "uppercase", marginBottom: 2 }}>
                Delivery & Shipping Destination
              </div>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: "#0f172a" }}>SILVER MULLER SEALS LTD</div>
              <div style={{ color: "#334155" }}>
                Location: <strong>{po.deliveryLocation || "Main Raw Material Store, Silvassa"}</strong>
              </div>
              <div style={{ color: "#334155" }}>
                Department: {po.department || "Main Store"} • Delivery: <strong>{formatDisplayDate(po.deliveryDate) || "As Per Schedule"}</strong>
              </div>
              <div style={{ color: "#334155" }}>
                Payment Terms: <strong style={{ color: "#0284c7" }}>{po.paymentTerms || "Net 30 Days from MRN"}</strong>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="po-print-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, textAlign: "left", marginBottom: 8 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderTop: "1.5px solid #0f172a", borderBottom: "1.5px solid #0f172a" }}>
                <th style={{ padding: "4px 6px", width: 28 }}>#</th>
                <th style={{ padding: "4px 6px", width: 110 }}>ITEM CODE</th>
                <th style={{ padding: "4px 6px", width: 70 }}>HSN/SAC</th>
                <th style={{ padding: "4px 6px" }}>DESCRIPTION</th>
                <th style={{ padding: "4px 6px", width: 55, textAlign: "right" }}>QTY</th>
                <th style={{ padding: "4px 6px", width: 40 }}>UOM</th>
                <th style={{ padding: "4px 6px", width: 75, textAlign: "right" }}>RATE (₹)</th>
                <th style={{ padding: "4px 6px", width: 65, textAlign: "right" }}>DISC (₹)</th>
                <th style={{ padding: "4px 6px", width: 75, textAlign: "right" }}>GST (₹)</th>
                <th style={{ padding: "4px 6px", width: 85, textAlign: "right" }}>TOTAL (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "4px 6px" }}>{idx + 1}</td>
                  <td style={{ padding: "4px 6px", fontWeight: 700, color: "#0284c7" }}>{it.itemCode}</td>
                  <td style={{ padding: "4px 6px", fontWeight: 600, color: "#334155" }}>{it.hsnCode || "-"}</td>
                  <td style={{ padding: "4px 6px" }}>
                    <span style={{ fontWeight: 600 }}>{it.itemName}</span>
                    {it.description && it.description !== it.itemName && (
                      <span style={{ color: "#64748b", fontSize: 9.5, marginLeft: 4 }}>({it.description})</span>
                    )}
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{it.quantity}</td>
                  <td style={{ padding: "4px 6px" }}>{it.uom || "PCS"}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right" }}>₹{Number(it.unitRate || 0).toFixed(2)}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: it.discountAmount > 0 ? "#b91c1c" : "#64748b" }}>
                    {it.discountAmount > 0 ? `-₹${Number(it.discountAmount).toFixed(2)}` : "-"}
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#0284c7" }}>
                    +₹{Number(it.taxAmount || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 800 }}>
                    ₹{Number(it.itemTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Compact Annexure Notice (in 1-Page mode) */}
          {viewMode === "po-1page" && hasExtraAudit && (
            <div
              className="po-screen-only"
              style={{
                background: "#f0fdf4",
                border: "1px dashed #86efac",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 9.5,
                color: "#166534",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span>
                📅 <strong>Delivery Lots:</strong> {schedules.length} linked • 💰 <strong>Payment Milestones:</strong> {milestones.length} tranches • 📦 <strong>GRNs:</strong> {linkedGrns.length} records.
              </span>
              <button
                type="button"
                onClick={() => setViewMode("extended")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0284c7",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 9.5,
                  textDecoration: "underline"
                }}
              >
                Inspect Extended Audit ↗
              </button>
            </div>
          )}

          {/* Extended Sections (if user clicked Extended Mode) */}
          {viewMode === "extended" && (
            <div className="po-print-avoid-break">
              {/* Staggered Delivery Schedule Section */}
              {schedules.length > 0 && (
                <div style={{ marginTop: 10, marginBottom: 10, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>📅 Staggered Delivery Schedule ({schedules.length} Lots)</span>
                  </div>
                  <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, ...purchaseOrderPage9Resize.tableStyle }}>
                    <ResizableColGroup columns={PURCHASE_ORDER_PAGE_9_COLUMNS} widths={purchaseOrderPage9Resize.widths} />
                    <thead>
                      <tr style={{ borderBottom: "1px solid #cbd5e1", color: "#475569", textAlign: "left", background: "#f1f5f9" }}>
                        <th style={{ padding: "4px 6px" }}>LOT #<ColumnResizeHandle colKey="lot" resize={purchaseOrderPage9Resize} /></th>
                        <th style={{ padding: "4px 6px" }}>ITEM CODE<ColumnResizeHandle colKey="item_code" resize={purchaseOrderPage9Resize} /></th>
                        <th style={{ padding: "4px 6px" }}>SCHEDULED DATE<ColumnResizeHandle colKey="scheduled_date" resize={purchaseOrderPage9Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>SCHEDULED QTY<ColumnResizeHandle colKey="scheduled_qty" resize={purchaseOrderPage9Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>RECEIVED QTY<ColumnResizeHandle colKey="received_qty" resize={purchaseOrderPage9Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>BALANCE QTY<ColumnResizeHandle colKey="balance_qty" resize={purchaseOrderPage9Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={purchaseOrderPage9Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((s, sIdx) => (
                        <tr key={sIdx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "4px 6px", fontWeight: 800, color: "#0284c7" }}>Lot {s.lotNumber}</td>
                          <td style={{ padding: "4px 6px", fontWeight: 700 }}>{s.itemCode}</td>
                          <td style={{ padding: "4px 6px" }}>{formatDisplayDate(s.scheduledDate)}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{s.scheduledQty}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", color: "#16a34a", fontWeight: 700 }}>{s.receivedQty || 0}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 800 }}>{s.balanceQty}</td>
                          <td style={{ padding: "4px 6px", textAlign: "center" }}>
                            <span style={{ background: s.status === "COMPLETED" ? "#dcfce7" : "#e0f2fe", color: s.status === "COMPLETED" ? "#166534" : "#0369a1", padding: "1px 5px", borderRadius: 4, fontSize: 8.5, fontWeight: 800 }}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payment Milestones */}
              {milestones.length > 0 && (
                <div style={{ marginTop: 8, marginBottom: 10, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
                    💰 Commercial Payment Milestones ({milestones.length} Tranches)
                  </div>
                  <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, ...purchaseOrderPage10Resize.tableStyle }}>
                    <ResizableColGroup columns={PURCHASE_ORDER_PAGE_10_COLUMNS} widths={purchaseOrderPage10Resize.widths} />
                    <thead>
                      <tr style={{ borderBottom: "1px solid #cbd5e1", color: "#475569", textAlign: "left", background: "#f1f5f9" }}>
                        <th style={{ padding: "4px 6px" }}>#<ColumnResizeHandle colKey="sr" resize={purchaseOrderPage10Resize} /></th>
                        <th style={{ padding: "4px 6px" }}>TRANCHE / TITLE<ColumnResizeHandle colKey="tranche_title" resize={purchaseOrderPage10Resize} /></th>
                        <th style={{ padding: "4px 6px" }}>TRIGGER EVENT<ColumnResizeHandle colKey="trigger_event" resize={purchaseOrderPage10Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>%<ColumnResizeHandle colKey="col3" resize={purchaseOrderPage10Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>AMOUNT (₹)<ColumnResizeHandle colKey="amount" resize={purchaseOrderPage10Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>CREDIT DAYS<ColumnResizeHandle colKey="credit_days" resize={purchaseOrderPage10Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={purchaseOrderPage10Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m, mIdx) => (
                        <tr key={mIdx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "4px 6px", fontWeight: 800, color: "#0284c7" }}>{m.milestoneSequence}</td>
                          <td style={{ padding: "4px 6px", fontWeight: 700 }}>{m.milestoneTitle}</td>
                          <td style={{ padding: "4px 6px" }}>{m.triggerEvent}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right" }}>{m.percentage}%</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 800 }}>
                            ₹{Number(m.milestoneAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "4px 6px", textAlign: "right" }}>{m.creditDays} days</td>
                          <td style={{ padding: "4px 6px", textAlign: "center" }}>
                            <span style={{ background: m.paymentStatus === "PAID" ? "#dcfce7" : "#fef3c7", color: m.paymentStatus === "PAID" ? "#166534" : "#92400e", padding: "1px 5px", borderRadius: 4, fontSize: 8.5, fontWeight: 800 }}>
                              {m.paymentStatus || "UPCOMING"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Linked Goods Receipt Notes */}
              {linkedGrns.length > 0 && (
                <div style={{ marginTop: 8, marginBottom: 10, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", marginBottom: 6 }}>
                    📦 Physical Goods Receipt (GRN) History ({linkedGrns.length} Receipts)
                  </div>
                  <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, ...purchaseOrderPage11Resize.tableStyle }}>
                    <ResizableColGroup columns={PURCHASE_ORDER_PAGE_11_COLUMNS} widths={purchaseOrderPage11Resize.widths} />
                    <thead>
                      <tr style={{ borderBottom: "1px solid #bbf7d0", color: "#166534", textAlign: "left" }}>
                        <th style={{ padding: "4px 6px" }}>GRN NUMBER<ColumnResizeHandle colKey="grn_number" resize={purchaseOrderPage11Resize} /></th>
                        <th style={{ padding: "4px 6px" }}>DATE<ColumnResizeHandle colKey="date" resize={purchaseOrderPage11Resize} /></th>
                        <th style={{ padding: "4px 6px" }}>CHALLAN NO<ColumnResizeHandle colKey="challan_no" resize={purchaseOrderPage11Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>RECEIVED<ColumnResizeHandle colKey="received" resize={purchaseOrderPage11Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>ACCEPTED<ColumnResizeHandle colKey="accepted" resize={purchaseOrderPage11Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>REJECTED<ColumnResizeHandle colKey="rejected" resize={purchaseOrderPage11Resize} /></th>
                        <th style={{ padding: "4px 6px", textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={purchaseOrderPage11Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedGrns.map((g, gIdx) => (
                        <tr key={gIdx} style={{ borderBottom: "1px solid #dcfce7" }}>
                          <td style={{ padding: "4px 6px", fontWeight: 700, color: "#0284c7" }}>{g.grnNumber}</td>
                          <td style={{ padding: "4px 6px" }}>{formatDisplayDate(g.grnDate)}</td>
                          <td style={{ padding: "4px 6px" }}>{g.vendorChallanNo || "-"}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{g.totalReceivedQty}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>{g.totalAcceptedQty}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", color: g.totalRejectedQty > 0 ? "#dc2626" : "#64748b" }}>{g.totalRejectedQty}</td>
                          <td style={{ padding: "4px 6px", textAlign: "center" }}>
                            <span style={{ background: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: 4, fontSize: 8.5, fontWeight: 800 }}>{g.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bottom Section: Split Side-by-Side (Terms & Signatures on Left, Totals Breakdown on Right) */}
          <div className="po-print-avoid-break" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr", gap: 12, paddingTop: 6, borderTop: "1.5px solid #cbd5e1" }}>
            {/* Left Column: Terms & Conditions + Digital Signatures */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <strong style={{ display: "block", fontSize: 10, color: "#0f172a", marginBottom: 3 }}>
                  TERMS & CONDITIONS:
                </strong>
                <ol style={{ margin: 0, paddingLeft: 14, color: "#475569", fontSize: 9.5, lineHeight: 1.35 }}>
                  <li>Material must be delivered strictly as per approved specifications and drawings.</li>
                  <li>Manufacturer Test Certificate (MTC) / COA must accompany invoice & consignment.</li>
                  <li>Transit damage or non-conformance rejections will be solely on supplier's account.</li>
                  <li>Invoices & Delivery Challans must clearly cite PO Number: <strong>{po.poNumber}</strong>.</li>
                </ol>
              </div>

              {/* Digital Approval Stamp */}
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: 4,
                  padding: "5px 10px"
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: "#166534" }}>✓ DIGITALLY AUTHORIZED</div>
                  <div style={{ fontSize: 9, color: "#047857", fontWeight: 700 }}>
                    By: {po.approvedBy || po.approved_by || "General Manager (SCM)"}
                  </div>
                  <div style={{ fontSize: 8.5, color: "#334155" }}>
                    {formatAuditDateTime(po.approvedAt || po.approved_at) || po.approvedAt || po.poDate || "Recorded"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#334155" }}>Authorized Signatory</div>
                  <div style={{ fontSize: 8.5, color: "#64748b" }}>Silver Muller Seals Ltd</div>
                </div>
              </div>
            </div>

            {/* Right Column: Financial Summary Totals Card */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 10
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Subtotal (Gross):</span>
                <span>₹{Number(po.itemsGross || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(po.totalDiscount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Total Discount:</span>
                  <span style={{ color: "#b91c1c" }}>-₹{Number(po.totalDiscount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Taxable Value:</span>
                <span>₹{Number(po.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>
                  GST {po.vendorGstin && po.vendorGstin.startsWith("27") ? "(CGST+SGST)" : "(IGST)"}:
                </span>
                <span style={{ color: "#0284c7" }}>+₹{Number(po.totalTax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(po.deliveryCharges || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Delivery / Freight:</span>
                  <span>+₹{Number(po.deliveryCharges).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {Number(po.otherCharges || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Other Charges:</span>
                  <span>+₹{Number(po.otherCharges).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {Number(po.roundOff || 0) !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Round Off:</span>
                  <span>₹{Number(po.roundOff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0 2px 0",
                  borderTop: "1.5px solid #0f172a",
                  fontSize: 13,
                  fontWeight: 900
                }}
              >
                <span>Grand Total:</span>
                <span style={{ color: "#0284c7" }}>₹{Number(po.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ fontSize: 8.5, color: "#64748b", fontStyle: "italic", textAlign: "right", marginTop: 2 }}>
                {numberToWordsINR(po.grandTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Bottom Bar (Screen Only) */}
        <div
          className="po-screen-only"
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #cbd5e1",
            padding: "10px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#1e293b",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
            }}
            title="Return to Purchase Order software"
          >
            <span>← Back to Software</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Tip: Press <kbd style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Esc</kbd> or click outside to return
            </span>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)"
              }}
            >
              <Icons.Printer />
              <span>Print PO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PURCHASE_ORDER_PAGE_12_COLUMNS = [
  { key: "hsn_sac_code", width: 130 },
  { key: "description", width: 117 },
  { key: "category", width: 140 },
  { key: "total_gst", width: 100 },
  { key: "intra_state_split", width: 150 },
  { key: "inter_state_split", width: 130 },
];

// ============================================================================
// COMPONENT: HSN / SAC TAX MASTER & GST SLAB DIRECTORY MODAL
// ============================================================================
function HsnMasterModal({ hsnList = [], onClose, onRefresh, showToast }) {
  const purchaseOrderPage12Resize = useResizableColumns("purchase-order-page-12", PURCHASE_ORDER_PAGE_12_COLUMNS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New HSN Form State
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("RAW_MATERIAL");
  const [newRate, setNewRate] = useState("18");

  // Filtered HSN List
  const filtered = useMemo(() => {
    return (hsnList || []).filter((h) => {
      const q = (searchTerm || "").toLowerCase().trim();
      const matchesSearch =
        !q ||
        (h.hsnSacCode && h.hsnSacCode.toLowerCase().includes(q)) ||
        (h.description && h.description.toLowerCase().includes(q));
      const matchesCategory =
        filterCategory === "ALL" || (h.category || "").toUpperCase() === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [hsnList, searchTerm, filterCategory]);

  const handleCreateHsn = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) {
      alert("Please enter a valid HSN or SAC code.");
      return;
    }
    if (!newDesc.trim()) {
      alert("Please enter a description for this HSN code.");
      return;
    }

    const rateNum = Number(newRate) || 0;
    const halfRate = (rateNum / 2).toFixed(2);

    const payload = {
      hsnSacCode: newCode.trim(),
      description: newDesc.trim(),
      gstRate: rateNum,
      cgstRate: Number(halfRate),
      sgstRate: Number(halfRate),
      igstRate: rateNum,
      category: newCategory,
      isActive: true
    };

    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:4000/api/purchase/hsn-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to create HSN code.");
        return;
      }

      showToast(`HSN Code ${newCode.trim()} created successfully with ${rateNum}% GST!`);
      setNewCode("");
      setNewDesc("");
      setShowAddForm(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Error saving HSN Code: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    "ALL",
    "RAW_MATERIAL",
    "CONSUMABLE",
    "CAPITAL_GOODS",
    "SERVICES",
    "PACKAGING",
    "MRO",
    "ALLOY_STEEL"
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: 20
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 960,
          maxHeight: "92vh",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #cbd5e1"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "#1e293b",
            color: "#ffffff",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🏛️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>HSN & SAC Tax Master Directory</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                Active Indian GST Slabs & Manufacturing Codes ({hsnList.length} Registered Codes)
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                background: showAddForm ? "#475569" : "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>{showAddForm ? "Close Form" : "➕ Add HSN Code"}</span>
            </button>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
            >
              <Icons.Cross />
            </button>
          </div>
        </div>

        {/* Collapsible Add New HSN Code Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateHsn}
            style={{
              background: "#f8fafc",
              borderBottom: "2px solid #e2e8f0",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 12.5, color: "#0f172a" }}>
              Register New HSN / SAC Code in Master Directory
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px 110px auto", gap: 12, alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 3 }}>
                  HSN / SAC Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 40169330"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 3 }}>
                  Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Silicone & Viton Rotary Shaft Seals"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid #cbd5e1", fontSize: 12 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 3 }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid #cbd5e1", fontSize: 12 }}
                >
                  <option value="RAW_MATERIAL">RAW_MATERIAL</option>
                  <option value="CONSUMABLE">CONSUMABLE</option>
                  <option value="CAPITAL_GOODS">CAPITAL_GOODS</option>
                  <option value="SERVICES">SERVICES</option>
                  <option value="PACKAGING">PACKAGING</option>
                  <option value="MRO">MRO</option>
                  <option value="ALLOY_STEEL">ALLOY_STEEL</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 3 }}>
                  GST Slab
                </label>
                <select
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 700 }}
                >
                  <option value="0">0% (Nil)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: "#059669",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 5,
                    padding: "7px 16px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 3px rgba(5,150,105,0.3)"
                  }}
                >
                  {isSubmitting ? "Saving..." : "Save Code"}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#475569" }}>
              💡 Sub-tax split: <strong>CGST {(Number(newRate) / 2).toFixed(1)}% + SGST {(Number(newRate) / 2).toFixed(1)}%</strong> for Intra-state (Maharashtra), or <strong>IGST {newRate}%</strong> for Inter-state orders.
            </div>
          </form>
        )}

        {/* Filter and Search Bar */}
        <div
          style={{
            padding: "10px 20px",
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
            <Icons.Search />
            <input
              type="text"
              placeholder="Search by HSN/SAC code or description (e.g. 4016, rubber, seal, spring)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: 5,
                border: "1px solid #cbd5e1",
                fontSize: 12
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Category:</span>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCategory(c)}
                style={{
                  background: filterCategory === c ? "#1e293b" : "#f1f5f9",
                  color: filterCategory === c ? "#ffffff" : "#475569",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 8px",
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* HSN Table */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
          <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, textAlign: "left", ...purchaseOrderPage12Resize.tableStyle }}>
            <ResizableColGroup columns={PURCHASE_ORDER_PAGE_12_COLUMNS} widths={purchaseOrderPage12Resize.widths} />
            <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: "8px 14px", width: 130 }}>HSN / SAC CODE<ColumnResizeHandle colKey="hsn_sac_code" resize={purchaseOrderPage12Resize} /></th>
                <th style={{ padding: "8px 14px" }}>DESCRIPTION<ColumnResizeHandle colKey="description" resize={purchaseOrderPage12Resize} /></th>
                <th style={{ padding: "8px 14px", width: 140 }}>CATEGORY<ColumnResizeHandle colKey="category" resize={purchaseOrderPage12Resize} /></th>
                <th style={{ padding: "8px 14px", width: 100, textAlign: "center" }}>TOTAL GST<ColumnResizeHandle colKey="total_gst" resize={purchaseOrderPage12Resize} /></th>
                <th style={{ padding: "8px 14px", width: 150 }}>INTRA-STATE SPLIT<ColumnResizeHandle colKey="intra_state_split" resize={purchaseOrderPage12Resize} /></th>
                <th style={{ padding: "8px 14px", width: 130 }}>INTER-STATE SPLIT<ColumnResizeHandle colKey="inter_state_split" resize={purchaseOrderPage12Resize} /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No HSN / SAC codes match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((h, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>
                      <strong style={{ color: "#0284c7", fontSize: 12 }}>{h.hsnSacCode}</strong>
                    </td>
                    <td style={{ padding: "8px 14px", color: "#1e293b" }}>{h.description}</td>
                    <td style={{ padding: "8px 14px" }}>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700
                        }}
                      >
                        {h.category || "GENERAL"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 14px", textAlign: "center" }}>
                      <span
                        style={{
                          background: Number(h.gstRate) >= 18 ? "#fee2e2" : "#fef3c7",
                          color: Number(h.gstRate) >= 18 ? "#991b1b" : "#92400e",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 800
                        }}
                      >
                        {h.gstRate}%
                      </span>
                    </td>
                    <td style={{ padding: "8px 14px", color: "#059669", fontWeight: 600 }}>
                      CGST {h.cgstRate}% + SGST {h.sgstRate}%
                    </td>
                    <td style={{ padding: "8px 14px", color: "#7c3aed", fontWeight: 700 }}>
                      IGST {h.igstRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "10px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "#64748b"
          }}
        >
          <div>
            Showing <strong>{filtered.length}</strong> of <strong>{hsnList.length}</strong> HSN codes
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#1e293b",
              color: "#ffffff",
              border: "none",
              borderRadius: 5,
              padding: "6px 16px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 12
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const PURCHASE_ORDER_PAGE_13_COLUMNS = [
  { key: "lot", width: 70 },
  { key: "scheduled_date", width: 160 },
  { key: "lot_qty", width: 120 },
  { key: "destination_store_plant", width: 200 },
  { key: "status", width: 90 },
  { key: "action", width: 60 },
];

const PURCHASE_ORDER_PAGE_14_COLUMNS = [
  { key: "sr", width: 50 },
  { key: "tranche_title", width: 220 },
  { key: "trigger_event", width: 180 },
  { key: "linked_lot", width: 110 },
  { key: "share", width: 85 },
  { key: "amount", width: 120 },
  { key: "credit_days", width: 90 },
  { key: "est_due_date", width: 120 },
  { key: "action", width: 50 },
];

// ============================================================================
// COMPONENT: PLANNED PO DELIVERY LOTS & COMMERCIAL MILESTONES BUILDER MODAL
// ============================================================================
function PlannedPoScheduleModal({
  vendor,
  vendorCode,
  items = [],
  charges = {},
  vendorTotal = 0,
  onSave,
  onClose,
  showToast
}) {
  const purchaseOrderPage14Resize = useResizableColumns("purchase-order-page-14", PURCHASE_ORDER_PAGE_14_COLUMNS);
  const purchaseOrderPage13Resize = useResizableColumns("purchase-order-page-13", PURCHASE_ORDER_PAGE_13_COLUMNS);
  const [activeTab, setActiveTab] = useState("delivery"); // "delivery" | "milestones"

  // Delivery Schedules state
  const [schedules, setSchedules] = useState(() => {
    if (charges.deliverySchedules && charges.deliverySchedules.length > 0) {
      return charges.deliverySchedules.map((s, idx) => ({
        ...s,
        clientKey: s.id || `sched_${idx}_${Date.now()}`
      }));
    }
    const today = new Date();
    const defaultDate = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
    return items.map((it, idx) => ({
      clientKey: `sched_${idx}_${Date.now()}`,
      itemCode: it.itemCode,
      lotNumber: 1,
      scheduledDate: it.expectedDeliveryDate || defaultDate,
      scheduledQty: Number(it.quantity) || 0,
      balanceQty: Number(it.quantity) || 0,
      receivedQty: 0,
      destinationStore: it.deliveryLocation || "Silver Muller Central Warehouse, Plant 1",
      status: "PENDING"
    }));
  });

  // Payment Milestones state
  const [milestones, setMilestones] = useState(() => {
    if (charges.paymentMilestones && charges.paymentMilestones.length > 0) {
      return charges.paymentMilestones.map((m, idx) => ({
        ...m,
        clientKey: m.id || `mile_${idx}_${Date.now()}`
      }));
    }
    const vTotal = Number(vendorTotal) || 0;
    return [
      {
        clientKey: `mile_0_${Date.now()}`,
        milestoneSequence: 1,
        milestoneTitle: "100% Commercial Payment on Delivery & QC Acceptance",
        triggerEvent: "On Full Delivery Completion",
        linkedLotNumber: null,
        percentage: 100,
        milestoneAmount: vTotal,
        creditDays: 30,
        dueDate: "",
        paymentStatus: "UPCOMING",
        paidAmount: 0
      }
    ];
  });

  // Handler for adding a staggered lot for an item
  const handleAddLot = (itemCode) => {
    const itemLots = schedules.filter((s) => s.itemCode === itemCode);
    const nextLotNum = itemLots.length + 1;
    const targetItem = items.find((it) => it.itemCode === itemCode);
    const totalQty = Number(targetItem?.quantity) || 0;
    const allocated = itemLots.reduce((acc, l) => acc + (Number(l.scheduledQty) || 0), 0);
    const rem = Math.max(0, totalQty - allocated);

    let lastDate = new Date();
    if (itemLots.length > 0 && itemLots[itemLots.length - 1].scheduledDate) {
      const d = new Date(itemLots[itemLots.length - 1].scheduledDate);
      if (!isNaN(d.getTime())) lastDate = d;
    }
    const nextDate = new Date(lastDate.getTime() + 14 * 86400000).toISOString().split("T")[0];

    const newLot = {
      clientKey: `sched_${Date.now()}_${Math.random()}`,
      itemCode,
      lotNumber: nextLotNum,
      scheduledDate: nextDate,
      scheduledQty: rem > 0 ? rem : 0,
      balanceQty: rem > 0 ? rem : 0,
      receivedQty: 0,
      destinationStore: targetItem?.deliveryLocation || "Silver Muller Central Warehouse, Plant 1",
      status: "PENDING"
    };

    setSchedules((prev) => [...prev, newLot]);
  };

  // Handler for removing a lot
  const handleRemoveLot = (clientKey) => {
    setSchedules((prev) => {
      const filtered = prev.filter((s) => s.clientKey !== clientKey);
      const groups = {};
      filtered.forEach((s) => {
        if (!groups[s.itemCode]) groups[s.itemCode] = [];
        groups[s.itemCode].push(s);
      });
      const reindexed = [];
      Object.keys(groups).forEach((code) => {
        groups[code].forEach((s, idx) => {
          reindexed.push({ ...s, lotNumber: idx + 1 });
        });
      });
      return reindexed;
    });
  };

  // Handler for updating lot fields
  const handleUpdateLot = (clientKey, field, val) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.clientKey !== clientKey) return s;
        const updated = { ...s, [field]: val };
        if (field === "scheduledQty") {
          updated.balanceQty = Number(val) || 0;
        }
        return updated;
      })
    );
  };

  // Preset: Split All Items 50% / 50%
  const handlePresetSplit5050 = () => {
    const today = new Date();
    const date1 = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
    const date2 = new Date(today.getTime() + 21 * 86400000).toISOString().split("T")[0];

    const newScheds = [];
    items.forEach((it, idx) => {
      const q = Number(it.quantity) || 0;
      const q1 = Math.ceil(q / 2);
      const q2 = q - q1;
      newScheds.push({
        clientKey: `sched_${idx}_1_${Date.now()}`,
        itemCode: it.itemCode,
        lotNumber: 1,
        scheduledDate: it.expectedDeliveryDate || date1,
        scheduledQty: q1,
        balanceQty: q1,
        receivedQty: 0,
        destinationStore: it.deliveryLocation || "Silver Muller Central Warehouse, Plant 1",
        status: "PENDING"
      });
      newScheds.push({
        clientKey: `sched_${idx}_2_${Date.now()}`,
        itemCode: it.itemCode,
        lotNumber: 2,
        scheduledDate: date2,
        scheduledQty: q2,
        balanceQty: q2,
        receivedQty: 0,
        destinationStore: it.deliveryLocation || "Silver Muller Central Warehouse, Plant 1",
        status: "PENDING"
      });
    });
    setSchedules(newScheds);

    const vTotal = Number(vendorTotal) || 0;
    const half = Number((vTotal / 2).toFixed(2));
    const remainder = Number((vTotal - half).toFixed(2));
    setMilestones([
      {
        clientKey: `mile_1_${Date.now()}`,
        milestoneSequence: 1,
        milestoneTitle: "Tranche 1: 50% on Lot 1 Delivery & GRN Clearance",
        triggerEvent: "On Lot 1 Receipt & Inspection",
        linkedLotNumber: 1,
        percentage: 50,
        milestoneAmount: half,
        creditDays: 30,
        dueDate: "",
        paymentStatus: "UPCOMING",
        paidAmount: 0
      },
      {
        clientKey: `mile_2_${Date.now()}`,
        milestoneSequence: 2,
        milestoneTitle: "Tranche 2: 50% on Lot 2 Delivery & Final Acceptance",
        triggerEvent: "On Lot 2 Receipt & Inspection",
        linkedLotNumber: 2,
        percentage: 50,
        milestoneAmount: remainder,
        creditDays: 30,
        dueDate: "",
        paymentStatus: "UPCOMING",
        paidAmount: 0
      }
    ]);

    if (showToast) showToast("Split items into 2 Lots (50% / 50%) with corresponding 50/50 payment tranches!");
  };

  // Preset: Reset Single Lot
  const handlePresetSingleLot = () => {
    const today = new Date();
    const date1 = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
    const newScheds = items.map((it, idx) => ({
      clientKey: `sched_${idx}_${Date.now()}`,
      itemCode: it.itemCode,
      lotNumber: 1,
      scheduledDate: it.expectedDeliveryDate || date1,
      scheduledQty: Number(it.quantity) || 0,
      balanceQty: Number(it.quantity) || 0,
      receivedQty: 0,
      destinationStore: it.deliveryLocation || "Silver Muller Central Warehouse, Plant 1",
      status: "PENDING"
    }));
    setSchedules(newScheds);
    const vTotal = Number(vendorTotal) || 0;
    setMilestones([
      {
        clientKey: `mile_0_${Date.now()}`,
        milestoneSequence: 1,
        milestoneTitle: "100% Commercial Payment on Delivery & QC Acceptance",
        triggerEvent: "On Full Delivery Completion",
        linkedLotNumber: null,
        percentage: 100,
        milestoneAmount: vTotal,
        creditDays: 30,
        dueDate: "",
        paymentStatus: "UPCOMING",
        paidAmount: 0
      }
    ]);
  };

  // Milestone Handlers
  const handleAddMilestone = () => {
    const vTotal = Number(vendorTotal) || 0;
    const allocatedPct = milestones.reduce((a, m) => a + (Number(m.percentage) || 0), 0);
    const remPct = Math.max(0, 100 - allocatedPct);
    const remAmt = Math.max(0, Number(((remPct / 100) * vTotal).toFixed(2)));

    const newM = {
      clientKey: `mile_${Date.now()}_${Math.random()}`,
      milestoneSequence: milestones.length + 1,
      milestoneTitle: `Milestone ${milestones.length + 1} Payment`,
      triggerEvent: "On Lot Receipt & Inspection",
      linkedLotNumber: null,
      percentage: remPct,
      milestoneAmount: remAmt,
      creditDays: 30,
      dueDate: "",
      paymentStatus: "UPCOMING",
      paidAmount: 0
    };
    setMilestones((prev) => [...prev, newM]);
  };

  const handleRemoveMilestone = (clientKey) => {
    setMilestones((prev) => {
      const filtered = prev.filter((m) => m.clientKey !== clientKey);
      return filtered.map((m, idx) => ({ ...m, milestoneSequence: idx + 1 }));
    });
  };

  const handleUpdateMilestone = (clientKey, field, val) => {
    const vTotal = Number(vendorTotal) || 0;
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.clientKey !== clientKey) return m;
        const updated = { ...m, [field]: val };
        if (field === "percentage") {
          const pct = Number(val) || 0;
          updated.milestoneAmount = Number(((pct / 100) * vTotal).toFixed(2));
        } else if (field === "milestoneAmount") {
          const amt = Number(val) || 0;
          updated.percentage = vTotal > 0 ? Number(((amt / vTotal) * 100).toFixed(1)) : 0;
        }
        return updated;
      })
    );
  };

  // Preset: 20% Advance / 80% on Completion
  const handlePresetAdvance80 = () => {
    const vTotal = Number(vendorTotal) || 0;
    const advance = Number((vTotal * 0.2).toFixed(2));
    const remainder = Number((vTotal - advance).toFixed(2));
    setMilestones([
      {
        clientKey: `mile_1_${Date.now()}`,
        milestoneSequence: 1,
        milestoneTitle: "Tranche 1: 20% Commercial Advance with Order",
        triggerEvent: "Advance with Order",
        linkedLotNumber: null,
        percentage: 20,
        milestoneAmount: advance,
        creditDays: 0,
        dueDate: new Date().toISOString().split("T")[0],
        paymentStatus: "UPCOMING",
        paidAmount: 0
      },
      {
        clientKey: `mile_2_${Date.now()}`,
        milestoneSequence: 2,
        milestoneTitle: "Tranche 2: 80% on Full Delivery Acceptance",
        triggerEvent: "On Full Delivery Completion",
        linkedLotNumber: null,
        percentage: 80,
        milestoneAmount: remainder,
        creditDays: 30,
        dueDate: "",
        paymentStatus: "UPCOMING",
        paidAmount: 0
      }
    ]);
  };

  // Validation and Save
  const handleSaveAndApply = () => {
    for (const it of items) {
      const itLots = schedules.filter((s) => s.itemCode === it.itemCode);
      if (itLots.length === 0) {
        alert(`Item ${it.itemCode} (${it.itemName}) has no delivery lots configured.`);
        return;
      }
      for (const l of itLots) {
        if (!l.scheduledDate) {
          alert(`Please select a scheduled delivery date for Lot #${l.lotNumber} of item ${it.itemCode}.`);
          return;
        }
        if (Number(l.scheduledQty) <= 0) {
          alert(`Lot #${l.lotNumber} of item ${it.itemCode} must have scheduled quantity greater than 0.`);
          return;
        }
      }
      const totalSched = itLots.reduce((acc, l) => acc + Number(l.scheduledQty), 0);
      const req = Number(it.quantity) || 0;
      if (totalSched !== req) {
        const proceed = window.confirm(
          `Notice: Scheduled total (${totalSched} ${it.uom || "PCS"}) does not match ordered quantity (${req} ${it.uom || "PCS"}) for ${it.itemCode}.\n\nDo you want to proceed anyway?`
        );
        if (!proceed) return;
      }
    }

    const cleanedSchedules = schedules.map(({ clientKey, ...rest }) => rest);
    const cleanedMilestones = milestones.map(({ clientKey, ...rest }) => rest);

    onSave(cleanedSchedules, cleanedMilestones);
    onClose();
  };

  // Calculations for milestones summary
  const totalMilestoneAmt = milestones.reduce((a, m) => a + (Number(m.milestoneAmount) || 0), 0);
  const totalMilestonePct = milestones.reduce((a, m) => a + (Number(m.percentage) || 0), 0);
  const vTotal = Number(vendorTotal) || 0;
  const isMilestonesBalanced = Math.abs(totalMilestoneAmt - vTotal) < 1.0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100050,
        padding: 20
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 1060,
          maxHeight: "92vh",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "#0f172a",
            color: "#ffffff",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #334155"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" }}>
                Phased Delivery Scheduling & Commercial Milestones
              </span>
              <span
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 4
                }}
              >
                PLANNED PO
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              Vendor: <strong>{vendor?.name || vendorCode}</strong> ({vendorCode}) • Order Total: <strong>₹{vTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 18,
              padding: 4
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab & Preset Controls Bar */}
        <div
          style={{
            background: "#f8fafc",
            padding: "10px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab("delivery")}
              style={{
                background: activeTab === "delivery" ? "#0284c7" : "#ffffff",
                color: activeTab === "delivery" ? "#ffffff" : "#475569",
                border: "1px solid",
                borderColor: activeTab === "delivery" ? "#0284c7" : "#cbd5e1",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>📅</span>
              <span>1. Staggered Delivery Lots ({schedules.length} Lots)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("milestones")}
              style={{
                background: activeTab === "milestones" ? "#0284c7" : "#ffffff",
                color: activeTab === "milestones" ? "#ffffff" : "#475569",
                border: "1px solid",
                borderColor: activeTab === "milestones" ? "#0284c7" : "#cbd5e1",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>💰</span>
              <span>2. Commercial Payment Milestones ({milestones.length} Tranches)</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handlePresetSplit5050}
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                color: "#166534",
                borderRadius: 5,
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer"
              }}
              title="Split 50% Lot 1 & 50% Lot 2 with matching payment tranches"
            >
              ⚡ Split 50% / 50% Lots &amp; Pay
            </button>
            <button
              type="button"
              onClick={handlePresetAdvance80}
              style={{
                background: "#fdf4ff",
                border: "1px solid #f0abfc",
                color: "#86198f",
                borderRadius: 5,
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer"
              }}
              title="20% Commercial advance on PO, 80% upon final acceptance"
            >
              ⚡ 20% Advance / 80% Balance
            </button>
            <button
              type="button"
              onClick={handlePresetSingleLot}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#475569",
                borderRadius: 5,
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer"
              }}
              title="Reset to 100% single delivery"
            >
              Reset 100%
            </button>
          </div>
        </div>

        {/* Modal Scroll Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {activeTab === "delivery" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 11.5,
                  color: "#1e40af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>
                  💡 <strong>Staggered Phased Deliveries:</strong> Break down bulk order quantities across multiple delivery lots with specific scheduled dates and destination stores.
                </span>
                <span style={{ fontWeight: 700 }}>Total Items: {items.length}</span>
              </div>

              {items.map((it, itIdx) => {
                const itemLots = schedules.filter((s) => s.itemCode === it.itemCode);
                const reqQty = Number(it.quantity) || 0;
                const schedQty = itemLots.reduce((acc, l) => acc + (Number(l.scheduledQty) || 0), 0);
                const isBalanced = schedQty === reqQty;
                const isOver = schedQty > reqQty;

                return (
                  <div
                    key={it.itemCode}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#ffffff"
                    }}
                  >
                    {/* Item Card Header */}
                    <div
                      style={{
                        background: "#f1f5f9",
                        padding: "8px 14px",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            background: "#0284c7",
                            color: "#ffffff",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 800
                          }}
                        >
                          {it.itemCode}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                          {it.itemName}
                        </span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          Ordered: <strong>{reqQty} {it.uom || "PCS"}</strong> @ ₹{it.unitRate}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 12,
                            background: isBalanced ? "#dcfce7" : isOver ? "#fee2e2" : "#fef3c7",
                            color: isBalanced ? "#166534" : isOver ? "#991b1b" : "#92400e"
                          }}
                        >
                          {isBalanced
                            ? `✓ Fully Scheduled (${schedQty} / ${reqQty} ${it.uom || "PCS"})`
                            : isOver
                            ? `✖ Over-Scheduled (+${schedQty - reqQty} ${it.uom || "PCS"})`
                            : `⚠ Remaining: ${reqQty - schedQty} ${it.uom || "PCS"}`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAddLot(it.itemCode)}
                          style={{
                            background: "#0284c7",
                            color: "#ffffff",
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
                          <span>+</span>
                          <span>Add Staggered Lot</span>
                        </button>
                      </div>
                    </div>

                    {/* Lots Table for this item */}
                    <div style={{ overflowX: "auto" }}>
                      <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, ...purchaseOrderPage13Resize.tableStyle }}>
                        <ResizableColGroup columns={PURCHASE_ORDER_PAGE_13_COLUMNS} widths={purchaseOrderPage13Resize.widths} />
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", textAlign: "left" }}>
                            <th style={{ padding: "6px 12px", width: 70 }}>LOT #<ColumnResizeHandle colKey="lot" resize={purchaseOrderPage13Resize} /></th>
                            <th style={{ padding: "6px 12px", width: 160 }}>SCHEDULED DATE<ColumnResizeHandle colKey="scheduled_date" resize={purchaseOrderPage13Resize} /></th>
                            <th style={{ padding: "6px 12px", width: 120, textAlign: "right" }}>LOT QTY ({it.uom || "PCS"})<ColumnResizeHandle colKey="lot_qty" resize={purchaseOrderPage13Resize} /></th>
                            <th style={{ padding: "6px 12px" }}>DESTINATION STORE / PLANT<ColumnResizeHandle colKey="destination_store_plant" resize={purchaseOrderPage13Resize} /></th>
                            <th style={{ padding: "6px 12px", width: 90, textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={purchaseOrderPage13Resize} /></th>
                            <th style={{ padding: "6px 12px", width: 60, textAlign: "center" }}>ACTION<ColumnResizeHandle colKey="action" resize={purchaseOrderPage13Resize} /></th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemLots.map((lot) => (
                            <tr key={lot.clientKey} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 800, color: "#0284c7" }}>
                                Lot {lot.lotNumber}
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                <DateInput
                                  value={lot.scheduledDate || ""}
                                  onChange={(e) => handleUpdateLot(lot.clientKey, "scheduledDate", e.target.value)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    border: "1px solid #cbd5e1",
                                    fontSize: 12,
                                    width: "100%",
                                    outline: "none"
                                  }}
                                />
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                <input
                                  type="number"
                                  value={lot.scheduledQty}
                                  onChange={(e) => handleUpdateLot(lot.clientKey, "scheduledQty", Number(e.target.value) || 0)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    border: "1px solid #cbd5e1",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textAlign: "right",
                                    width: 90,
                                    outline: "none"
                                  }}
                                />
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                <input
                                  type="text"
                                  value={lot.destinationStore || ""}
                                  onChange={(e) => handleUpdateLot(lot.clientKey, "destinationStore", e.target.value)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    border: "1px solid #cbd5e1",
                                    fontSize: 11.5,
                                    width: "100%",
                                    outline: "none"
                                  }}
                                />
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                <span
                                  style={{
                                    background: "#e0f2fe",
                                    color: "#0369a1",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 700
                                  }}
                                >
                                  {lot.status || "PENDING"}
                                </span>
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                {itemLots.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLot(lot.clientKey)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      fontSize: 14,
                                      fontWeight: 800,
                                      padding: 2
                                    }}
                                    title="Remove this lot"
                                  >
                                    ✕
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "milestones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Financial Balance Strip */}
              <div
                style={{
                  background: isMilestonesBalanced ? "#f0fdf4" : "#fffbeb",
                  border: "1px solid",
                  borderColor: isMilestonesBalanced ? "#86efac" : "#fde68a",
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isMilestonesBalanced ? "#166534" : "#92400e" }}>
                    Commercial Payment Milestones &amp; Credit Terms
                  </div>
                  <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
                    Tie payments to phased delivery lot inspections, advance tokens, or completion events.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>PO Value:</span>{" "}
                    <strong>₹{vTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Allocated:</span>{" "}
                    <strong>₹{totalMilestoneAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong> ({totalMilestonePct.toFixed(1)}%)
                  </div>
                  <div>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 800,
                        background: isMilestonesBalanced ? "#dcfce7" : "#fee2e2",
                        color: isMilestonesBalanced ? "#166534" : "#991b1b"
                      }}
                    >
                      {isMilestonesBalanced
                        ? "✓ 100% Balanced"
                        : `⚠ Balance: ₹${(vTotal - totalMilestoneAmt).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Milestones Table */}
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#ffffff" }}>
                <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, ...purchaseOrderPage14Resize.tableStyle }}>
                  <ResizableColGroup columns={PURCHASE_ORDER_PAGE_14_COLUMNS} widths={purchaseOrderPage14Resize.widths} />
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px", width: 50 }}>#<ColumnResizeHandle colKey="sr" resize={purchaseOrderPage14Resize} /></th>
                      <th style={{ padding: "8px 12px", width: 220 }}>TRANCHE / TITLE<ColumnResizeHandle colKey="tranche_title" resize={purchaseOrderPage14Resize} /></th>
                      <th style={{ padding: "8px 12px", width: 180 }}>TRIGGER EVENT<ColumnResizeHandle colKey="trigger_event" resize={purchaseOrderPage14Resize} /></th>
                      <th style={{ padding: "8px 12px", width: 110 }}>LINKED LOT<ColumnResizeHandle colKey="linked_lot" resize={purchaseOrderPage14Resize} /></th>
                      <th style={{ padding: "8px 12px", width: 85, textAlign: "right" }}>% SHARE<ColumnResizeHandle colKey="share" resize={purchaseOrderPage14Resize} /></th>
                      <th style={{ padding: "8px 12px", width: 120, textAlign: "right" }}>AMOUNT (₹)<ColumnResizeHandle colKey="amount" resize={purchaseOrderPage14Resize} /></th>
                      <th style={{ padding: "8px 12px", width: 90, textAlign: "right" }}>CREDIT DAYS<ColumnResizeHandle colKey="credit_days" resize={purchaseOrderPage14Resize} /></th>
                      <th style={{ padding: "8px 12px", width: 120 }}>EST. DUE DATE<ColumnResizeHandle colKey="est_due_date" resize={purchaseOrderPage14Resize} /></th>
                      <th style={{ padding: "8px 12px", width: 50, textAlign: "center" }}>ACTION<ColumnResizeHandle colKey="action" resize={purchaseOrderPage14Resize} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m) => (
                      <tr key={m.clientKey} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 800, color: "#0284c7" }}>
                          {m.milestoneSequence}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <input
                            type="text"
                            value={m.milestoneTitle || ""}
                            onChange={(e) => handleUpdateMilestone(m.clientKey, "milestoneTitle", e.target.value)}
                            style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <select
                            value={m.triggerEvent || "On Lot 1 Receipt & Inspection"}
                            onChange={(e) => handleUpdateMilestone(m.clientKey, "triggerEvent", e.target.value)}
                            style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11.5, outline: "none" }}
                          >
                            <option value="Advance with Order">Advance with Order</option>
                            <option value="On Lot 1 Receipt & Inspection">On Lot 1 Receipt &amp; Inspection</option>
                            <option value="On Lot 2 Receipt & Inspection">On Lot 2 Receipt &amp; Inspection</option>
                            <option value="On Lot 3 Receipt & Inspection">On Lot 3 Receipt &amp; Inspection</option>
                            <option value="On Full Delivery Completion">On Full Delivery Completion</option>
                            <option value="Post-Acceptance Warranty Period">Post-Acceptance Warranty Period</option>
                            <option value="Other Commercial Milestone">Other Commercial Milestone</option>
                          </select>
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <select
                            value={m.linkedLotNumber || ""}
                            onChange={(e) => handleUpdateMilestone(m.clientKey, "linkedLotNumber", e.target.value ? Number(e.target.value) : null)}
                            style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11.5, outline: "none" }}
                          >
                            <option value="">None / All</option>
                            <option value="1">Lot 1</option>
                            <option value="2">Lot 2</option>
                            <option value="3">Lot 3</option>
                            <option value="4">Lot 4</option>
                          </select>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <input
                            type="number"
                            value={m.percentage}
                            onChange={(e) => handleUpdateMilestone(m.clientKey, "percentage", e.target.value)}
                            style={{ width: 65, padding: "4px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 700, textAlign: "right", outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <input
                            type="number"
                            value={m.milestoneAmount}
                            onChange={(e) => handleUpdateMilestone(m.clientKey, "milestoneAmount", e.target.value)}
                            style={{ width: 105, padding: "4px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 800, color: "#0f172a", textAlign: "right", outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <input
                            type="number"
                            value={m.creditDays}
                            onChange={(e) => handleUpdateMilestone(m.clientKey, "creditDays", Number(e.target.value) || 0)}
                            style={{ width: 65, padding: "4px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, textAlign: "right", outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <DateInput
                            value={m.dueDate || ""}
                            onChange={(e) => handleUpdateMilestone(m.clientKey, "dueDate", e.target.value)}
                            style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11.5, outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          {milestones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMilestone(m.clientKey)}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, fontWeight: 800 }}
                              title="Delete milestone"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  style={{
                    background: "#ffffff",
                    border: "1px dashed #0284c7",
                    color: "#0284c7",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>+</span>
                  <span>Add Commercial Payment Tranche</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ fontSize: 11.5, color: "#64748b" }}>
            Total Lots: <strong>{schedules.length}</strong> • Milestones: <strong>{milestones.length}</strong>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#475569",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "7px 20px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)"
              }}
            >
              Save &amp; Apply Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PURCHASE_ORDER_PAGE_15_COLUMNS = [
  { key: "sr", width: 30 },
  { key: "item", width: 220 },
  { key: "hsn", width: 90 },
  { key: "ordered_qty", width: 90 },
  { key: "uom", width: 50 },
  { key: "unit_rate", width: 100 },
  { key: "disc", width: 70 },
  { key: "taxable", width: 100 },
  { key: "tax_split", width: 130 },
  { key: "line_total", width: 110 },
];

// ============================================================================
// COMPONENT: PO AMENDMENT & DYNAMIC TAX RE-CALCULATION MODAL
// ============================================================================
function PoAmendmentModal({ po, hsnList = [], onClose, onSuccess }) {
  const purchaseOrderPage15Resize = useResizableColumns("purchase-order-page-15", PURCHASE_ORDER_PAGE_15_COLUMNS);
  const [changeReason, setChangeReason] = useState("");
  const [amendedBy, setAmendedBy] = useState("Purchase Manager (Gaurav M.)");
  const [items, setItems] = useState(() =>
    (po.items || []).map((it) => ({
      itemCode: it.itemCode,
      itemName: it.itemName || it.itemCode,
      uom: it.uom || "PCS",
      hsnCode: it.hsnCode || "8484",
      orderedQty: Number(it.quantity || it.orderedQty || 0),
      unitRate: Number(it.rate || it.unitRate || 0),
      discountPct: Number(it.discount || it.discountPct || 0)
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  // Vendor state intra vs inter check
  const isIntraState = useMemo(() => {
    const gstin = (po.vendorGstin || "").trim();
    if (!gstin) return true;
    return gstin.startsWith("27");
  }, [po.vendorGstin]);

  // Real-time tax calculations
  const { lineTotals, grandTaxable, grandCgst, grandSgst, grandIgst, grandTotal } = useMemo(() => {
    let totTaxable = 0;
    let totCgst = 0;
    let totSgst = 0;
    let totIgst = 0;

    const computed = items.map((it) => {
      const qty = Math.max(0, Number(it.orderedQty) || 0);
      const rate = Math.max(0, Number(it.unitRate) || 0);
      const disc = Math.max(0, Math.min(100, Number(it.discountPct) || 0));
      const taxable = qty * rate * (1 - disc / 100);

      // Find HSN
      const hsnObj = hsnList.find((h) => h.hsnCode === it.hsnCode);
      const gstRate = hsnObj ? Number(hsnObj.gstRate) || 18 : 18;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIntraState) {
        cgst = taxable * (gstRate / 2 / 100);
        sgst = taxable * (gstRate / 2 / 100);
      } else {
        igst = taxable * (gstRate / 100);
      }

      totTaxable += taxable;
      totCgst += cgst;
      totSgst += sgst;
      totIgst += igst;

      return {
        taxable,
        cgst,
        sgst,
        igst,
        lineTotal: taxable + cgst + sgst + igst,
        gstRate
      };
    });

    return {
      lineTotals: computed,
      grandTaxable: totTaxable,
      grandCgst: totCgst,
      grandSgst: totSgst,
      grandIgst: totIgst,
      grandTotal: totTaxable + totCgst + totSgst + totIgst
    };
  }, [items, hsnList, isIntraState]);

  const handleItemChange = (idx, field, val) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it))
    );
  };

  const handleSaveAmendment = async (e) => {
    e.preventDefault();
    if (!changeReason.trim()) {
      alert("Mandatory: Please provide a reason for amending this Purchase Order.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amendedBy: amendedBy.trim(),
        changeReason: changeReason.trim(),
        items: items.map((it) => ({
          itemCode: it.itemCode,
          orderedQty: Number(it.orderedQty) || 0,
          unitRate: Number(it.unitRate) || 0,
          discountPct: Number(it.discountPct) || 0,
          hsnCode: it.hsnCode || "8484"
        }))
      };

      const res = await fetch(`http://localhost:4000/api/purchase/orders/${po.poNumber}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.error || "Failed to amend Purchase Order.");
        return;
      }

      onSuccess();
    } catch (err) {
      alert("Error amending PO: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 1050,
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
        {/* Header */}
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
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Formal Purchase Order Amendment
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
              Amend {po.poNumber} &bull; Next Version: Rev {(Number(po.revisionNumber) || 0) + 1}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 22, fontWeight: 700 }}
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAmendment} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
            {/* Vendor & State Banner */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                marginBottom: 16,
                fontSize: 12
              }}
            >
              <div><strong>Vendor:</strong> {po.vendorName}</div>
              <div><strong>GSTIN:</strong> {po.vendorGstin || "Unregistered"}</div>
              <div>
                <strong>Tax Regime:</strong>{" "}
                <span
                  style={{
                    background: isIntraState ? "#ecfdf5" : "#f5f3ff",
                    color: isIntraState ? "#065f46" : "#5b21b6",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontWeight: 800,
                    fontSize: 11
                  }}
                >
                  {isIntraState ? "Intra-State (CGST + SGST)" : "Inter-State (IGST)"}
                </span>
              </div>
              <div><strong>Original Date:</strong> {formatDisplayDate(po.poDate)}</div>
            </div>

            {/* Mandatory Change Reason and Amended By */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  Amendment Justification / Change Reason <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Rate renegotiated as per vendor updated quote; quantity revised to 350 PCS"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12.5,
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  Authorized By
                </label>
                <input
                  type="text"
                  value={amendedBy}
                  onChange={(e) => setAmendedBy(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12.5,
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Revised Line Item Quantities, Rates &amp; Split Taxes
            </div>

            <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 16, ...purchaseOrderPage15Resize.tableStyle }}>
              <ResizableColGroup columns={PURCHASE_ORDER_PAGE_15_COLUMNS} widths={purchaseOrderPage15Resize.widths} />
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "8px 6px", textAlign: "center", width: 30, fontWeight: 700 }}>#<ColumnResizeHandle colKey="sr" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "left", width: 220, fontWeight: 700 }}>Item<ColumnResizeHandle colKey="item" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "left", width: 90, fontWeight: 700 }}>HSN<ColumnResizeHandle colKey="hsn" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: 90, fontWeight: 700 }}>Ordered Qty<ColumnResizeHandle colKey="ordered_qty" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "center", width: 50, fontWeight: 700 }}>UOM<ColumnResizeHandle colKey="uom" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: 100, fontWeight: 700 }}>Unit Rate (₹)<ColumnResizeHandle colKey="unit_rate" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: 70, fontWeight: 700 }}>Disc %<ColumnResizeHandle colKey="disc" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: 100, fontWeight: 700 }}>Taxable (₹)<ColumnResizeHandle colKey="taxable" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: 130, fontWeight: 700 }}>Tax Split (₹)<ColumnResizeHandle colKey="tax_split" resize={purchaseOrderPage15Resize} /></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: 110, fontWeight: 700 }}>Line Total (₹)<ColumnResizeHandle colKey="line_total" resize={purchaseOrderPage15Resize} /></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const comp = lineTotals[idx] || { taxable: 0, cgst: 0, sgst: 0, igst: 0, lineTotal: 0, gstRate: 18 };
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                      <td style={{ padding: "6px" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.itemCode}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{item.itemName}</div>
                      </td>
                      <td style={{ padding: "6px" }}>
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "4px 6px",
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#0369a1",
                            boxSizing: "border-box"
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px" }}>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={item.orderedQty}
                          onChange={(e) => handleItemChange(idx, "orderedQty", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "4px 6px",
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                            fontSize: 11.5,
                            fontWeight: 700,
                            textAlign: "right",
                            boxSizing: "border-box"
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px", textAlign: "center", fontWeight: 600, color: "#64748b" }}>
                        {item.uom}
                      </td>
                      <td style={{ padding: "6px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitRate}
                          onChange={(e) => handleItemChange(idx, "unitRate", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "4px 6px",
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                            fontSize: 11.5,
                            textAlign: "right",
                            boxSizing: "border-box"
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px" }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={item.discountPct}
                          onChange={(e) => handleItemChange(idx, "discountPct", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "4px 6px",
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                            fontSize: 11.5,
                            textAlign: "right",
                            boxSizing: "border-box"
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                        ₹{comp.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "6px", textAlign: "right", fontSize: 10.5 }}>
                        {isIntraState ? (
                          <>
                            <span style={{ color: "#047857", fontWeight: 700 }}>
                              CGST: ₹{comp.cgst.toFixed(2)}
                            </span>
                            <br />
                            <span style={{ color: "#047857", fontWeight: 700 }}>
                              SGST: ₹{comp.sgst.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#6d28d9", fontWeight: 700 }}>
                            IGST: ₹{comp.igst.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px", textAlign: "right", fontWeight: 800, color: "#0284c7" }}>
                        ₹{comp.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                  <td colSpan={7} style={{ padding: "10px", textAlign: "right", fontWeight: 800, color: "#334155" }}>
                    Revised Grand Totals:
                  </td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                    ₹{grandTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right", fontSize: 11, fontWeight: 700 }}>
                    {isIntraState ? (
                      <>
                        CGST: ₹{grandCgst.toFixed(2)} | SGST: ₹{grandSgst.toFixed(2)}
                      </>
                    ) : (
                      <>IGST: ₹{grandIgst.toFixed(2)}</>
                    )}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 900, fontSize: 13.5, color: "#0284c7" }}>
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 22px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 22px",
                fontSize: 13,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(37,99,235,0.25)"
              }}
            >
              {submitting ? "Applying Amendment..." : `Save & Issue PO Amendment (Rev ${(Number(po.revisionNumber) || 0) + 1}) →`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: PO REVISION HISTORY & AUDIT TRAIL MODAL
// ============================================================================
// ============================================================================
// PO VALIDITY: date helpers, status badge and Extend Validity modal
// ============================================================================
const PO_APPROVER_NAME = "General Manager (Purchases & SCM)";

function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso() {
  return isoFromDate(new Date());
}

function addDaysIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  return isoFromDate(new Date(y, m - 1, d + days));
}

function PoValidityBadge({ status, date }) {
  const styles = {
    VALID: { bg: "#dcfce7", fg: "#166534", border: "#86efac", label: "Valid" },
    EXPIRED: { bg: "#fee2e2", fg: "#b91c1c", border: "#fca5a5", label: "Expired" },
    NOT_SET: { bg: "#f1f5f9", fg: "#475569", border: "#cbd5e1", label: "Not set" }
  };
  const s = styles[status] || styles.NOT_SET;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontWeight: 600, color: "#334155" }}>{formatDisplayDate(date) || "-"}</span>
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          padding: "1px 6px",
          borderRadius: 4,
          width: "fit-content",
          background: s.bg,
          color: s.fg,
          border: `1px solid ${s.border}`
        }}
      >
        {s.label}
      </span>
    </div>
  );
}

function PoValidityModal({ po, onClose, onSuccess }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const today = todayIso();
  const currentDate = po.validityDate || "";
  // New date must be after the current validity date, and not in the past
  const minDate = currentDate && currentDate >= today ? addDaysIso(currentDate, 1) : today;

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    fetch(`http://localhost:4000/api/purchase/orders/${encodeURIComponent(po.poNumber)}/validity-history`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [po.poNumber]);

  const handleExtend = async () => {
    if (!newDate) {
      setError("Select the new validity date.");
      return;
    }
    if (newDate < minDate) {
      setError(`New validity date must be on or after ${formatDisplayDate(minDate)}.`);
      return;
    }
    if (!reason.trim()) {
      setError("Enter the reason for extending validity.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `http://localhost:4000/api/purchase/orders/${encodeURIComponent(po.poNumber)}/validity/extend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newValidityDate: newDate, reason: reason.trim(), user: PO_APPROVER_NAME })
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Validity could not be extended.");
        return;
      }
      onSuccess(data, `PO ${po.poNumber} validity extended to ${newDate}.`);
    } catch (e) {
      setError("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = { fontSize: 11, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 };
  const inputStyle = { width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 760,
          maxWidth: "100%",
          maxHeight: "90vh",
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px 22px", background: "#1e293b", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>PO Validity: {po.poNumber}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{po.vendorName}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: 20, cursor: "pointer" }}>&times;</button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={labelStyle}>Current validity</div>
              <PoValidityBadge status={po.validityStatus} date={po.validityDate} />
            </div>
            <div style={{ fontSize: 11, color: "#64748b", maxWidth: 380, lineHeight: 1.5 }}>
              A PO is valid through its validity date and expires the following day. While expired, no GRN can be saved or posted against it.
            </div>
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#f8fafc" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1e293b", marginBottom: 10 }}>Extend validity</div>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "start" }}>
              <div>
                <label style={labelStyle}>New validity date *</label>
                <DateInput  min={minDate} value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>On or after {formatDisplayDate(minDate)}</div>
              </div>
              <div>
                <label style={labelStyle}>Reason *</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Vendor agreed to extended delivery window"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>
            {error && (
              <div style={{ marginTop: 10, background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontWeight: 600 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={handleExtend}
                disabled={submitting}
                style={{
                  background: "#1d4ed8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 18px",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? "Saving..." : "Extend Validity"}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>Validity audit history</div>
            {loadingHistory ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>Loading...</div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>No validity changes recorded yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px" }}>Timestamp</th>
                    <th style={{ padding: "6px 8px" }}>Old date</th>
                    <th style={{ padding: "6px 8px" }}>New date</th>
                    <th style={{ padding: "6px 8px" }}>By</th>
                    <th style={{ padding: "6px 8px" }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} style={{ borderBottom: "1px solid #e2e8f0", verticalAlign: "top" }}>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{formatAuditDateTime(h.changed_at) || h.changed_at}</td>
                      <td style={{ padding: "6px 8px" }}>{formatDisplayDate(h.old_validity_date) || "Not set"}</td>
                      <td style={{ padding: "6px 8px", fontWeight: 700 }}>{formatDisplayDate(h.new_validity_date)}</td>
                      <td style={{ padding: "6px 8px" }}>{h.changed_by}</td>
                      <td style={{ padding: "6px 8px" }}>{h.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PoRevisionHistoryModal({ po, revisions = [], loading = false, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 820,
          maxWidth: "100%",
          maxHeight: "90vh",
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Immutable Amendment Log &amp; Snapshot History
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
              Audit History: {po.poNumber} &bull; Current Rev {po.revisionNumber || 0}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 22, fontWeight: 700 }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
              Loading revision timeline...
            </div>
          ) : revisions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", color: "#64748b" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                Original Revision (Rev 0)
              </div>
              <div>This Purchase Order is on its initial version. No formal amendments have been recorded yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {revisions.map((rev, idx) => {
                let parsedSnapshot = null;
                try {
                  if (rev.snapshotJson) parsedSnapshot = JSON.parse(rev.snapshotJson);
                } catch {}

                return (
                  <div
                    key={rev.id || idx}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "14px 18px",
                      background: "#f8fafc"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            background: "#0284c7",
                            color: "#ffffff",
                            padding: "3px 10px",
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: 11
                          }}
                        >
                          Rev {rev.revisionNumber}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                          Amended By: {rev.amendedBy || "Authorized Official"}
                        </span>
                      </div>
                      <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleString("en-IN") : "Recorded"}
                      </span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 6, border: "1px solid #e2e8f0", marginBottom: 10 }}>
                      <strong style={{ fontSize: 11.5, color: "#475569", display: "block", marginBottom: 2 }}>
                        Change Reason / Audit Justification:
                      </strong>
                      <span style={{ fontSize: 12.5, color: "#0f172a", fontWeight: 600 }}>
                        {rev.changeReason || "No change reason provided"}
                      </span>
                    </div>

                    {parsedSnapshot && (
                      <div style={{ fontSize: 11.5, color: "#64748b" }}>
                        <span>
                          Snapshot Total:{" "}
                          <strong style={{ color: "#0f172a" }}>
                            ₹{Number(parsedSnapshot.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </strong>
                        </span>
                        {parsedSnapshot.items && (
                          <span style={{ marginLeft: 12 }}>
                            &bull; Items count: <strong>{parsedSnapshot.items.length}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              background: "#1e293b",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const PURCHASE_ORDER_PAGE_16_COLUMNS = [
  { key: "vendor_name", width: 117 },
  { key: "gstin", width: 80 },
  { key: "tax_type", width: 96 },
  { key: "orders", width: 82 },
  { key: "taxable_val", width: 145 },
  { key: "cgst", width: 96 },
  { key: "sgst", width: 96 },
  { key: "igst", width: 96 },
  { key: "total_spend", width: 145 },
];

const PURCHASE_ORDER_PAGE_17_COLUMNS = [
  { key: "item_code", width: 103 },
  { key: "description", width: 117 },
  { key: "hsn", width: 80 },
  { key: "uom", width: 80 },
  { key: "latest_rate", width: 145 },
  { key: "min_rate", width: 124 },
  { key: "max_rate", width: 124 },
  { key: "variation", width: 103 },
  { key: "total_qty", width: 103 },
  { key: "latest_vendor", width: 131 },
];

const PURCHASE_ORDER_PAGE_18_COLUMNS = [
  { key: "pr_number", width: 103 },
  { key: "pr_date", width: 89 },
  { key: "department", width: 110 },
  { key: "item_code", width: 103 },
  { key: "description", width: 117 },
  { key: "balance_qty", width: 117 },
  { key: "uom", width: 80 },
  { key: "est_rate", width: 124 },
  { key: "backlog_val", width: 145 },
];

// ============================================================================
// COMPONENT: SCREEN 4 — PURCHASE REPORTS & OPERATIONAL ANALYTICS
// ============================================================================
function Screen4PurchaseReports({ orders = [], approvedPrs = [], proposals = [], onViewPo }) {
  const purchaseOrderPage18Resize = useResizableColumns("purchase-order-page-18", PURCHASE_ORDER_PAGE_18_COLUMNS);
  const purchaseOrderPage17Resize = useResizableColumns("purchase-order-page-17", PURCHASE_ORDER_PAGE_17_COLUMNS);
  const purchaseOrderPage16Resize = useResizableColumns("purchase-order-page-16", PURCHASE_ORDER_PAGE_16_COLUMNS);
  const [reportTab, setReportTab] = useState("VENDOR_SPEND"); // "VENDOR_SPEND" | "PRICE_HISTORY" | "PR_BACKLOG"
  const [reportSearch, setReportSearch] = useState("");

  // KPI Calculations
  const totalLifetimeSpend = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0),
    [orders]
  );
  const totalCgst = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.grandCgst) || 0), 0),
    [orders]
  );
  const totalSgst = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.grandSgst) || 0), 0),
    [orders]
  );
  const totalIgst = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.grandIgst) || 0), 0),
    [orders]
  );
  const uniqueVendorsCount = useMemo(() => {
    const s = new Set(orders.map((o) => o.vendorName).filter(Boolean));
    return s.size;
  }, [orders]);

  // Backlog Value
  const prBacklogValue = useMemo(() => {
    return approvedPrs.reduce((sum, pr) => {
      const items = pr.items || [];
      const prSum = items.reduce((iSum, it) => {
        const rem = Number(it.remaining_qty !== undefined ? it.remaining_qty : it.req_qty) || 0;
        const rate = Number(it.est_rate) || 0;
        return iSum + rem * rate;
      }, 0);
      return sum + prSum;
    }, 0);
  }, [approvedPrs]);

  // Report 1: Vendor Spend Breakdown
  const vendorSpendData = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const vName = o.vendorName || "Unknown Vendor";
      if (!map[vName]) {
        map[vName] = {
          vendorName: vName,
          gstin: o.vendorGstin || "—",
          isIntra: (o.vendorGstin || "").trim().startsWith("27"),
          orderCount: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          grandTotal: 0
        };
      }
      map[vName].orderCount += 1;
      map[vName].taxableValue += Number(o.subtotal) || 0;
      map[vName].cgst += Number(o.grandCgst) || 0;
      map[vName].sgst += Number(o.grandSgst) || 0;
      map[vName].igst += Number(o.grandIgst) || 0;
      map[vName].grandTotal += Number(o.grandTotal) || 0;
    });
    return Object.values(map).sort((a, b) => b.grandTotal - a.grandTotal);
  }, [orders]);

  // Report 2: Item Purchase Price History (Rate Register)
  const itemPriceHistoryData = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const code = it.itemCode || "UNKNOWN";
        if (!map[code]) {
          map[code] = {
            itemCode: code,
            itemName: it.itemName || code,
            uom: it.uom || "PCS",
            hsnCode: it.hsnCode || "8484",
            rates: [],
            totalQty: 0,
            latestRate: 0,
            latestPo: o.poNumber,
            latestVendor: o.vendorName
          };
        }
        const rate = Number(it.rate || it.unitRate || 0);
        const qty = Number(it.quantity || it.orderedQty || 0);
        map[code].rates.push(rate);
        map[code].totalQty += qty;
        map[code].latestRate = rate;
      });
    });

    return Object.values(map).map((row) => {
      const minRate = Math.min(...row.rates);
      const maxRate = Math.max(...row.rates);
      const variance = minRate > 0 ? (((maxRate - minRate) / minRate) * 100).toFixed(1) : "0.0";
      return {
        ...row,
        minRate,
        maxRate,
        variancePct: variance
      };
    }).sort((a, b) => b.totalQty - a.totalQty);
  }, [orders]);

  // Filtered Rows based on Search
  const filteredVendorSpend = vendorSpendData.filter((v) =>
    !reportSearch.trim() ||
    v.vendorName.toLowerCase().includes(reportSearch.toLowerCase()) ||
    v.gstin.toLowerCase().includes(reportSearch.toLowerCase())
  );

  const filteredPriceHistory = itemPriceHistoryData.filter((it) =>
    !reportSearch.trim() ||
    it.itemCode.toLowerCase().includes(reportSearch.toLowerCase()) ||
    it.itemName.toLowerCase().includes(reportSearch.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: "#f8fafc" }}>
      {/* 4 KPI Summary Cards */}
      <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Lifetime PO Spend</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
            ₹{totalLifetimeSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, marginTop: 4 }}>
            Across {orders.length} Purchase Orders
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Intra-State GST (CGST + SGST)</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#059669", marginTop: 4 }}>
            ₹{(totalCgst + totalSgst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 10.5, color: "#475569", fontWeight: 600, marginTop: 4 }}>
            CGST: ₹{totalCgst.toFixed(2)} | SGST: ₹{totalSgst.toFixed(2)}
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Inter-State GST (IGST)</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#7c3aed", marginTop: 4 }}>
            ₹{totalIgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: "#6d28d9", fontWeight: 700, marginTop: 4 }}>
            Inter-state suppliers out of MH
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>PR Backlog &amp; Suppliers</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#ea580c", marginTop: 4 }}>
            ₹{prBacklogValue.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginTop: 4 }}>
            {approvedPrs.length} Approved PRs &bull; {uniqueVendorsCount} Vendors
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div
        style={{
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0",
          padding: "8px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setReportTab("VENDOR_SPEND")}
            style={{
              background: reportTab === "VENDOR_SPEND" ? "#1e293b" : "#f1f5f9",
              color: reportTab === "VENDOR_SPEND" ? "#ffffff" : "#475569",
              border: "none",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Vendor Spending Register ({vendorSpendData.length})
          </button>

          <button
            onClick={() => setReportTab("PRICE_HISTORY")}
            style={{
              background: reportTab === "PRICE_HISTORY" ? "#1e293b" : "#f1f5f9",
              color: reportTab === "PRICE_HISTORY" ? "#ffffff" : "#475569",
              border: "none",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Item Purchase Rate History ({itemPriceHistoryData.length})
          </button>

          <button
            onClick={() => setReportTab("PR_BACKLOG")}
            style={{
              background: reportTab === "PR_BACKLOG" ? "#1e293b" : "#f1f5f9",
              color: reportTab === "PR_BACKLOG" ? "#ffffff" : "#475569",
              border: "none",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Open PR Backlog ({approvedPrs.length})
          </button>
        </div>

        <div style={{ width: 280 }}>
          <input
            type="text"
            placeholder="Filter report rows..."
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 12,
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* Report Content Table */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: 20 }}>
        {reportTab === "VENDOR_SPEND" && (
          <div style={{ background: "#ffffff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left", ...purchaseOrderPage16Resize.tableStyle }}>
              <ResizableColGroup columns={PURCHASE_ORDER_PAGE_16_COLUMNS} widths={purchaseOrderPage16Resize.widths} />
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                <tr>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>VENDOR NAME<ColumnResizeHandle colKey="vendor_name" resize={purchaseOrderPage16Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>GSTIN<ColumnResizeHandle colKey="gstin" resize={purchaseOrderPage16Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>TAX TYPE<ColumnResizeHandle colKey="tax_type" resize={purchaseOrderPage16Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>ORDERS<ColumnResizeHandle colKey="orders" resize={purchaseOrderPage16Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>TAXABLE VAL (₹)<ColumnResizeHandle colKey="taxable_val" resize={purchaseOrderPage16Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>CGST (₹)<ColumnResizeHandle colKey="cgst" resize={purchaseOrderPage16Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>SGST (₹)<ColumnResizeHandle colKey="sgst" resize={purchaseOrderPage16Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>IGST (₹)<ColumnResizeHandle colKey="igst" resize={purchaseOrderPage16Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>TOTAL SPEND (₹)<ColumnResizeHandle colKey="total_spend" resize={purchaseOrderPage16Resize} /></th>
                </tr>
              </thead>
              <tbody>
                {filteredVendorSpend.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                      No vendor spending records match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredVendorSpend.map((v, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#ffffff" : "#fbfcfe" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{v.vendorName}</td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{v.gstin}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            background: v.isIntra ? "#ecfdf5" : "#f5f3ff",
                            color: v.isIntra ? "#065f46" : "#5b21b6",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontWeight: 800,
                            fontSize: 10
                          }}
                        >
                          {v.isIntra ? "INTRA-STATE" : "INTER-STATE"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700 }}>{v.orderCount}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>
                        ₹{v.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#059669", fontWeight: 600 }}>
                        ₹{v.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#059669", fontWeight: 600 }}>
                        ₹{v.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#7c3aed", fontWeight: 600 }}>
                        ₹{v.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: "#0f172a" }}>
                        ₹{v.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {reportTab === "PRICE_HISTORY" && (
          <div style={{ background: "#ffffff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left", ...purchaseOrderPage17Resize.tableStyle }}>
              <ResizableColGroup columns={PURCHASE_ORDER_PAGE_17_COLUMNS} widths={purchaseOrderPage17Resize.widths} />
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                <tr>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>ITEM CODE<ColumnResizeHandle colKey="item_code" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>DESCRIPTION<ColumnResizeHandle colKey="description" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>HSN<ColumnResizeHandle colKey="hsn" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>UOM<ColumnResizeHandle colKey="uom" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>LATEST RATE (₹)<ColumnResizeHandle colKey="latest_rate" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>MIN RATE (₹)<ColumnResizeHandle colKey="min_rate" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>MAX RATE (₹)<ColumnResizeHandle colKey="max_rate" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>VARIATION<ColumnResizeHandle colKey="variation" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>TOTAL QTY<ColumnResizeHandle colKey="total_qty" resize={purchaseOrderPage17Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>LATEST VENDOR<ColumnResizeHandle colKey="latest_vendor" resize={purchaseOrderPage17Resize} /></th>
                </tr>
              </thead>
              <tbody>
                {filteredPriceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                      No item price history records found.
                    </td>
                  </tr>
                ) : (
                  filteredPriceHistory.map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#ffffff" : "#fbfcfe" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0284c7" }}>{it.itemCode}</td>
                      <td style={{ padding: "10px 14px", color: "#334155" }}>{it.itemName}</td>
                      <td style={{ padding: "10px 14px", color: "#0369a1", fontWeight: 700 }}>{it.hsnCode}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>{it.uom}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                        ₹{it.latestRate.toFixed(2)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#16a34a", fontWeight: 700 }}>
                        ₹{it.minRate.toFixed(2)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#dc2626", fontWeight: 700 }}>
                        ₹{it.maxRate.toFixed(2)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            background: Number(it.variancePct) > 10 ? "#fee2e2" : "#f1f5f9",
                            color: Number(it.variancePct) > 10 ? "#b91c1c" : "#475569",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 10.5
                          }}
                        >
                          +{it.variancePct}%
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800 }}>
                        {it.totalQty.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569", fontSize: 11 }}>
                        {it.latestVendor}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {reportTab === "PR_BACKLOG" && (
          <div style={{ background: "#ffffff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left", ...purchaseOrderPage18Resize.tableStyle }}>
              <ResizableColGroup columns={PURCHASE_ORDER_PAGE_18_COLUMNS} widths={purchaseOrderPage18Resize.widths} />
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                <tr>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>PR NUMBER<ColumnResizeHandle colKey="pr_number" resize={purchaseOrderPage18Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>PR DATE<ColumnResizeHandle colKey="pr_date" resize={purchaseOrderPage18Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>DEPARTMENT<ColumnResizeHandle colKey="department" resize={purchaseOrderPage18Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>ITEM CODE<ColumnResizeHandle colKey="item_code" resize={purchaseOrderPage18Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>DESCRIPTION<ColumnResizeHandle colKey="description" resize={purchaseOrderPage18Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>BALANCE QTY<ColumnResizeHandle colKey="balance_qty" resize={purchaseOrderPage18Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>UOM<ColumnResizeHandle colKey="uom" resize={purchaseOrderPage18Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>EST RATE (₹)<ColumnResizeHandle colKey="est_rate" resize={purchaseOrderPage18Resize} /></th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>BACKLOG VAL (₹)<ColumnResizeHandle colKey="backlog_val" resize={purchaseOrderPage18Resize} /></th>
                </tr>
              </thead>
              <tbody>
                {approvedPrs.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                      No open approved PR backlogs. All purchase requisitions have been processed!
                    </td>
                  </tr>
                ) : (
                  approvedPrs.flatMap((pr) =>
                    (pr.items || [])
                      .filter((it) => (it.remaining_qty !== undefined ? it.remaining_qty : it.req_qty) > 0)
                      .map((it, idx) => {
                        const rem = it.remaining_qty !== undefined ? it.remaining_qty : it.req_qty;
                        const rate = Number(it.est_rate) || 0;
                        const val = rem * rate;
                        return (
                          <tr key={`${pr.pr_number}-${idx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0284c7" }}>{pr.pr_number}</td>
                            <td style={{ padding: "10px 14px", color: "#475569" }}>{formatDisplayDate(pr.pr_date)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{pr.department}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{it.item_code}</td>
                            <td style={{ padding: "10px 14px", color: "#475569" }}>{it.item_name}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#ea580c" }}>
                              {rem.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>{it.uom}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right" }}>₹{rate.toFixed(2)}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                              ₹{val.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


