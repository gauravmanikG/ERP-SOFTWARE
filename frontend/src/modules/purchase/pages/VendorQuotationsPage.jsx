import { setHandoff, getHandoff, removeHandoff } from "../../../shared/utils/handoffStore";
import SearchableSelect from "../../../shared/components/SearchableSelect";
import { formatDisplayDate, formatDisplayDateTime } from "../../../shared/utils/dateFormat";
import DateInput from "../../../shared/components/DateInput";
import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText, Plus, Eye, Pencil, Trash2, Printer, Download, RefreshCw,
  Search, CheckCircle2, AlertTriangle, Clock, TrendingUp, Users,
  Building, ChevronRight, X, ArrowUpDown, Calendar, DollarSign,
  FileCheck, ShieldAlert, Sparkles, Filter, Copy, MessageSquare,
  History, ArrowRight, Check, AlertCircle, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import { INITIAL_PR_DATA } from "./PurchaseRequisitionPage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const formatAuditDateTime = (val) => {
  if (!val) return null;
  return formatDisplayDateTime(val);
};

const VENDOR_QUOTATIONS_PAGE_1_COLUMNS = [
  { key: "select", width: 36, min: 32 },
  { key: "quotation", width: 117 },
  { key: "source_pr", width: 103 },
  { key: "vendor_name", width: 160 },
  { key: "vendor_ref", width: 124 },
  { key: "received_date", width: 131 },
  { key: "valid_until", width: 117 },
  { key: "items", width: 80 },
  { key: "subtotal", width: 124 },
  { key: "tax", width: 89 },
  { key: "delivery", width: 124 },
  { key: "final_amount", width: 152 },
  { key: "payment_terms", width: 131 },
  { key: "delivery_x", width: 96 },
  { key: "status", width: 82 },
  { key: "actions", width: 140 },
];

const VENDOR_QUOTATIONS_PAGE_2_COLUMNS = [
  { key: "select", width: 36 },
  { key: "vendor_name", width: 117 },
  { key: "quotation", width: 117 },
  { key: "quotation_date", width: 138 },
  { key: "quoted_qty", width: 110 },
  { key: "unit_rate", width: 131 },
  { key: "disc", width: 96 },
  { key: "tax", width: 89 },
  { key: "delivery", width: 124 },
  { key: "effective_unit_cost", width: 200 },
  { key: "total_for_req_qty", width: 187 },
  { key: "prev_purchase_rate", width: 194 },
  { key: "diff_from_lowest", width: 200 },
  { key: "delivery_time", width: 131 },
  { key: "payment_terms", width: 131 },
  { key: "actions", width: 89 },
];

const VENDOR_QUOTATIONS_PAGE_3_COLUMNS = [
  { key: "quotation", width: 117 },
  { key: "vendor", width: 82 },
  { key: "quotation_date", width: 138 },
  { key: "unit_rate", width: 131 },
  { key: "tax", width: 89 },
  { key: "effective_unit_cost", width: 200 },
  { key: "status", width: 82 },
  { key: "related_po", width: 124 },
  { key: "actual_purchase_rate", width: 180 },
];

const VENDOR_QUOTATIONS_PAGE_4_COLUMNS = [
  { key: "item_code", width: 160 },
  { key: "description", width: 200 },
  { key: "uom", width: 60 },
  { key: "qty", width: 80 },
  { key: "rate", width: 90 },
  { key: "disc", width: 70 },
  { key: "tax_type", width: 100 },
  { key: "tax", width: 80 },
  { key: "addl_chgs", width: 80 },
  { key: "line_total", width: 100 },
  { key: "col10", width: 40 },
];

const VENDOR_QUOTATIONS_PAGE_5_COLUMNS = [
  { key: "item_code", width: 103 },
  { key: "description", width: 117 },
  { key: "qty", width: 80 },
  { key: "rate", width: 96 },
  { key: "disc", width: 96 },
  { key: "tax", width: 89 },
  { key: "total", width: 103 },
  { key: "eff_cost", width: 131 },
];

const VENDOR_QUOTATIONS_PAGE_6_COLUMNS = [
  { key: "criteria", width: 180 },
  { key: "lowest_price", width: 180 },
];

// Non-FG items first, then FG, so the searchable list shows its two groups in order.
const catalogOptions = (items) => [...items.filter((c) => c.item_type !== "FG"), ...items.filter((c) => c.item_type === "FG")].map((c) => {
  const code = c.item_code || c.sms_new_part_no;
  return {
    value: code,
    label: code,
    sub: [c.item_description || c.description_size || c.item_name, c.item_type !== "FG" && c.category && `[${c.category}]`].filter(Boolean).join(" "),
    group: c.item_type === "FG" ? "Finished Goods (FG - Oil Seals)" : "Non-FG / Raw Materials, Bought-Out & Other Items"
  };
});

export function VendorQuotationsPage({ onBackToHome, onOpenSidebar, sidebarOpen, onNavigate }) {
  const vendorQuotationsPage6Resize = useResizableColumns("vendor-quotations-page-6", VENDOR_QUOTATIONS_PAGE_6_COLUMNS);
  const vendorQuotationsPage5Resize = useResizableColumns("vendor-quotations-page-5", VENDOR_QUOTATIONS_PAGE_5_COLUMNS);
  const vendorQuotationsPage4Resize = useResizableColumns("vendor-quotations-page-4", VENDOR_QUOTATIONS_PAGE_4_COLUMNS);
  const vendorQuotationsPage3Resize = useResizableColumns("vendor-quotations-page-3", VENDOR_QUOTATIONS_PAGE_3_COLUMNS);
  const vendorQuotationsPage2Resize = useResizableColumns("vendor-quotations-page-2", VENDOR_QUOTATIONS_PAGE_2_COLUMNS);
  const vendorQuotationsPage1Resize = useResizableColumns("vendor-quotations-page-1", VENDOR_QUOTATIONS_PAGE_1_COLUMNS);
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState("all-quotations"); // "overview" | "all-quotations" | "rate-comparison" | "price-history" | "vendor-analysis"

  // Data states
  const [summary, setSummary] = useState({
    totalQuotations: 0,
    awaitingReviewCount: 0,
    approvedCount: 0,
    expiringSoonCount: 0,
    activeVendorsCount: 0,
    recentlyReceivedCount: 0
  });
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Dropdown reference data
  const [vendorsList, setVendorsList] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);

  // Search & Filters for All Quotations
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [filterVendorCode, setFilterVendorCode] = useState("");
  const [filterItemCode, setFilterItemCode] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");

  // Column Filters
  const [colFilters, setColFilters] = useState({
    quotationNumber: "",
    prNumber: "",
    vendorName: "",
    vendorRefNo: "",
    quotationDate: "",
    validUntil: "",
    paymentTerms: "",
    deliveryTime: "",
    status: ""
  });

  // Table Selection & Sorting & Pagination
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortField, setSortField] = useState("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeQuotationDetail, setActiveQuotationDetail] = useState(null);
  const [isRfqPrPickerOpen, setIsRfqPrPickerOpen] = useState(false);

  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvalJustification, setApprovalJustification] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [newCommentText, setNewCommentText] = useState("");

  // Rate Comparison tab state
  const [compareItemCode, setCompareItemCode] = useState("945-05745");
  const [compareQuantity, setCompareQuantity] = useState("500");
  const [compareDate, setCompareDate] = useState("");
  const [comparisonResults, setComparisonResults] = useState([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [selectedVendorsForSideBySide, setSelectedVendorsForSideBySide] = useState([]);
  const [isSideBySideModalOpen, setIsSideBySideModalOpen] = useState(false);

  // Price History tab state
  const [historyItemCode, setHistoryItemCode] = useState("945-05745");
  const [historyVendorCode, setHistoryVendorCode] = useState("ALL");
  const [priceHistoryData, setPriceHistoryData] = useState([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);

  // Vendor Analysis tab state
  const [vendorAnalysisData, setVendorAnalysisData] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Live ticking system date and time (ticks every second for real-time expiry countdown)
  const [currentSystemTime, setCurrentSystemTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const liveDateStr = formatDisplayDate(currentSystemTime);
  const liveTimeStr = currentSystemTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const handleSyncDatesWithToday = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/purchase/quotations/sync-dates`, { method: "POST" });
      if (res.ok) {
        showToast("Synchronized quotation dates relative to today's date!");
        fetchQuotations();
        fetchSummary();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quotation Add/Edit Form State
  const initialFormState = {
    quotationNumber: "",
    prId: null,
    prNumber: "",
    vendorId: null,
    vendorCode: "",
    vendorName: "",
    vendorRefNo: "",
    quotationDate: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    contactPerson: "",
    paymentTerms: "Net 30 Days",
    deliveryTime: "7-10 Days",
    deliveryLocation: "SMS Main Stores, Faridabad",
    deliveryCharges: 0,
    otherCharges: 0,
    notes: "",
    documentName: "",
    documentUrl: "",
    items: [
      {
        itemCode: "945-05745",
        itemDescription: "Oil Seal-NBR (Size:95x130x13)",
        uom: "PCS",
        quotedQuantity: 500,
        unitRate: 150,
        discountPercent: 0,
        discountAmount: 0,
        taxType: "GST 18%",
        taxPercent: 18,
        taxAmount: 0,
        additionalCharges: 0,
        lineTotal: 0,
        effectiveUnitCost: 0,
        prItemId: null
      }
    ]
  };
  const [formData, setFormData] = useState(initialFormState);

  // Show Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [backendPrs, setBackendPrs] = useState([]);

  const fetchPrs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/purchase/requisitions`);
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
            items: (pr.items || []).map((it) => ({
              id: it.id,
              item_code: it.itemCode || it.item_code,
              item_name: it.itemName || it.item_name,
              description: it.description,
              category: it.category || "Bought-Out Parts 🛠",
              req_qty: Number(it.reqQty !== undefined ? it.reqQty : it.req_qty) || 0,
              ordered_qty: Number(it.orderedQty !== undefined ? it.orderedQty : it.ordered_qty) || 0,
              remaining_qty: it.remainingQty !== undefined ? Number(it.remainingQty) : (it.remaining_qty !== undefined ? Number(it.remaining_qty) : 0),
              uom: it.uom || "PCS",
              est_rate: Number(it.estRate !== undefined ? it.estRate : it.est_rate) || 0
            }))
          }));
          setBackendPrs(normalized);
        }
      }
    } catch (e) {
      console.warn("Could not fetch requisitions in VendorQuotationsPage:", e);
    }
  };

  // Helper to load approved PRs from the backend for RFQ Picker
  const getApprovedPrsForPicker = () => {
    if (backendPrs.length > 0) {
      const valid = backendPrs.filter((p) => p.status === "Approved" || p.status === "Partially Ordered");
      if (valid.length > 0) return valid;
    }
    return (INITIAL_PR_DATA || []).filter((p) => p.status === "Approved" || p.status === "Partially Ordered");
  };

  // Pre-load PR into Quotation Form / Navigate to RFQ
  const loadPrIntoRfqForm = (pr) => {
    try {
      setHandoff("SMS_SELECTED_PR_FOR_RFQ", JSON.stringify(pr));
    } catch (e) {
      console.error(e);
    }

    if (onNavigate) {
      setIsRfqPrPickerOpen(false);
      showToast(`Selected PR #${pr.pr_number || pr.prNumber}. Opening Request for Quotation (RFQ)...`);
      onNavigate("rfq");
      return;
    }

    const prItems = (pr.items || []).map((it) => {
      const req = Number(it.req_qty) || 0;
      const ord = Number(it.ordered_qty) || 0;
      const rem = it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, req - ord);
      const qty = rem > 0 ? rem : (req || 100);
      const rate = Number(it.est_rate) || 0;
      return {
        itemCode: it.item_code,
        itemDescription: it.item_name || it.description || "",
        uom: it.uom || "PCS",
        quotedQuantity: qty,
        unitRate: rate,
        discountPercent: 0,
        discountAmount: 0,
        taxType: "GST 18%",
        taxPercent: 18,
        taxAmount: (qty * rate * 0.18),
        additionalCharges: 0,
        lineTotal: (qty * rate * 1.18),
        effectiveUnitCost: rate * 1.18,
        prItemId: it.id
      };
    });

    setFormData({
      ...initialFormState,
      prId: pr.id,
      prNumber: pr.pr_number,
      notes: `RFQ for Requisition #${pr.pr_number} &bull; ${pr.department} &bull; ${pr.purpose || pr.requirement_type || ""}`,
      items: prItems.length > 0 ? prItems : initialFormState.items
    });
    setEditingQuotationId(null);
    setIsRfqPrPickerOpen(false);
    setIsAddEditModalOpen(true);
    showToast(`Loaded PR #${pr.pr_number} with ${prItems.length} items. Select vendor and record quotation.`);
  };

  // Pre-load RFQ into Quotation Form
  const loadRfqIntoQuoteForm = (rfq) => {
    const rfqItems = (rfq.items || []).map((it) => {
      const qty = Number(it.requiredQty || it.required_qty || 1);
      return {
        itemCode: it.itemCode || it.item_code || "",
        itemDescription: it.itemName || it.item_name || it.description || "",
        uom: it.uom || "PCS",
        quotedQuantity: qty,
        unitRate: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxType: "GST 18%",
        taxPercent: 18,
        taxAmount: 0,
        additionalCharges: 0,
        lineTotal: 0,
        effectiveUnitCost: 0
      };
    });

    setFormData({
      ...initialFormState,
      prNumber: rfq.prNumber || "",
      vendorRefNo: rfq.rfqNumber || "",
      vendorId: rfq.selectedVendor ? rfq.selectedVendor.id : "",
      vendorName: rfq.selectedVendor ? (rfq.selectedVendor.name || rfq.selectedVendor.supplier_name || "") : "",
      notes: `Quotation against RFQ #${rfq.rfqNumber} • Requisition #${rfq.prNumber || "N/A"}`,
      items: rfqItems.length > 0 ? rfqItems : initialFormState.items
    });
    setEditingQuotationId(null);
    setIsRfqPrPickerOpen(false);
    setIsAddEditModalOpen(true);
    showToast(`Loaded RFQ #${rfq.rfqNumber}. Enter supplier quotation rates and terms.`);
  };

  // Connection 1: Check if navigated from PR or RFQ screen
  useEffect(() => {
    try {
      const rawRfq = getHandoff("SMS_SELECTED_RFQ_FOR_QUOTATION");
      if (rawRfq) {
        removeHandoff("SMS_SELECTED_RFQ_FOR_QUOTATION");
        const rfq = JSON.parse(rawRfq);
        if (rfq) {
          loadRfqIntoQuoteForm(rfq);
        }
      }

      const raw = getHandoff("SMS_SELECTED_PR_FOR_RFQ");
      if (raw) {
        removeHandoff("SMS_SELECTED_PR_FOR_RFQ");
        const pr = JSON.parse(raw);
        if (pr) {
          loadPrIntoRfqForm(pr);
        }
      }

      const selectedQuoteNum = getHandoff("SMS_SELECTED_QUOTATION_NUMBER");
      if (selectedQuoteNum) {
        removeHandoff("SMS_SELECTED_QUOTATION_NUMBER");
        setSearchTerm(selectedQuoteNum);
      }
    } catch (err) {
      console.warn("Error reading handoff in VendorQuotationsPage:", err);
    }
  }, []);

  // 1. Initial Load: Summary, Quotations, Vendors, Catalog
  useEffect(() => {
    fetchSummary();
    fetchQuotations();
    fetchVendors();
    fetchCatalogItems();
    fetchPrs();

    const handleItemMasterUpdate = () => {
      fetchCatalogItems();
    };
    window.addEventListener("SMS_ITEM_MASTER_UPDATED", handleItemMasterUpdate);
    return () => window.removeEventListener("SMS_ITEM_MASTER_UPDATED", handleItemMasterUpdate);
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/purchase/quotations/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.warn("Could not fetch quotation summary:", err);
    }
  };

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/purchase/quotations?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (filterVendorCode && filterVendorCode !== "ALL") url += `vendorCode=${encodeURIComponent(filterVendorCode)}&`;
      if (filterItemCode) url += `itemCode=${encodeURIComponent(filterItemCode)}&`;
      if (selectedStatusFilter && selectedStatusFilter !== "ALL") url += `status=${encodeURIComponent(selectedStatusFilter)}&`;
      if (filterStartDate) url += `startDate=${encodeURIComponent(filterStartDate)}&`;
      if (filterEndDate) url += `endDate=${encodeURIComponent(filterEndDate)}&`;
      if (filterMinAmount) url += `minAmount=${encodeURIComponent(filterMinAmount)}&`;
      if (filterMaxAmount) url += `maxAmount=${encodeURIComponent(filterMaxAmount)}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuotations(data);
      }
    } catch (err) {
      console.error("Error fetching quotations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/suppliers`);
      if (res.ok) {
        const data = await res.json();
        setVendorsList(data);
      }
    } catch (err) {
      console.warn("Could not fetch suppliers from backend:", err);
    }
  };

  const fetchCatalogItems = async (q = "") => {
    try {
      let data = [];
      const res = await fetch(`${API_BASE}/api/inventory/items?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        data = await res.json();
      } else {
        const fallbackRes = await fetch(`${API_BASE}/api/purchase/quotations/items-catalog?query=${encodeURIComponent(q)}`);
        if (fallbackRes.ok) data = await fallbackRes.json();
      }

      let combined = Array.isArray(data) ? [...data] : [];

      if (combined.length > 0) {
        setCatalogItems(combined);
      }
    } catch (err) {
      console.warn("Could not fetch item catalog:", err);
    }
  };

  // Fetch Rate Comparison data when tab active
  const fetchRateComparison = async () => {
    if (!compareItemCode) return;
    setComparisonLoading(true);
    try {
      let url = `${API_BASE}/api/purchase/quotations/comparison?itemCode=${encodeURIComponent(compareItemCode)}&quantity=${encodeURIComponent(compareQuantity || "100")}`;
      if (compareDate) url += `&comparisonDate=${encodeURIComponent(compareDate)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComparisonResults(data);
      }
    } catch (err) {
      console.error("Error fetching comparison:", err);
    } finally {
      setComparisonLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "rate-comparison") {
      fetchRateComparison();
    } else if (activeTab === "price-history") {
      fetchPriceHistory();
    } else if (activeTab === "vendor-analysis") {
      fetchVendorAnalysis();
    }
  }, [activeTab, compareItemCode, compareQuantity, compareDate, historyItemCode, historyVendorCode]);

  const fetchPriceHistory = async () => {
    if (!historyItemCode) return;
    setPriceHistoryLoading(true);
    try {
      let url = `${API_BASE}/api/purchase/quotations/price-history?itemCode=${encodeURIComponent(historyItemCode)}`;
      if (historyVendorCode && historyVendorCode !== "ALL") {
        url += `&vendorCode=${encodeURIComponent(historyVendorCode)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPriceHistoryData(data);
      }
    } catch (err) {
      console.error("Error fetching price history:", err);
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  const fetchVendorAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/purchase/quotations/vendor-analysis`);
      if (res.ok) {
        const data = await res.json();
        setVendorAnalysisData(data);
      }
    } catch (err) {
      console.error("Error fetching vendor analysis:", err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Quotation calculations on the fly
  const calculateTotals = (items, deliveryCharges = 0, otherCharges = 0) => {
    let subtotal = 0;
    let totalTax = 0;

    const computedItems = items.map((it) => {
      const qty = parseFloat(it.quotedQuantity) || 1;
      const rate = parseFloat(it.unitRate) || 0;
      const discPct = parseFloat(it.discountPercent) || 0;
      const lineBase = rate * qty;
      let discAmt = 0;
      if (discPct > 0) {
        discAmt = (lineBase * discPct) / 100;
      } else if (parseFloat(it.discountAmount) > 0) {
        discAmt = parseFloat(it.discountAmount);
      }
      const lineTaxable = Math.max(0, lineBase - discAmt);
      const taxPct = parseFloat(it.taxPercent) !== undefined && !isNaN(parseFloat(it.taxPercent)) ? parseFloat(it.taxPercent) : 18;
      const taxAmt = (lineTaxable * taxPct) / 100;
      const addCharges = parseFloat(it.additionalCharges) || 0;
      const lineTotal = lineTaxable + taxAmt + addCharges;
      const effCost = qty > 0 ? (lineTotal / qty) : 0;

      subtotal += lineTaxable;
      totalTax += taxAmt;

      return {
        ...it,
        discountPercent: discPct,
        discountAmount: discAmt,
        taxPercent: taxPct,
        taxAmount: taxAmt,
        lineTotal,
        effectiveUnitCost: effCost
      };
    });

    const finalAmount = subtotal + totalTax + (parseFloat(deliveryCharges) || 0) + (parseFloat(otherCharges) || 0);

    return {
      computedItems,
      subtotalAmount: subtotal,
      taxAmount: totalTax,
      finalAmount
    };
  };

  // Form Handlers
  const handleVendorSelect = (vendorCode) => {
    const v = vendorsList.find((vend) => (vend.supplier_code || vend.supplierCode) === vendorCode);
    if (v) {
      setFormData((prev) => ({
        ...prev,
        vendorId: v.id,
        vendorCode: v.supplier_code || v.supplierCode,
        vendorName: v.supplier_name || v.supplierName,
        contactPerson: v.contact_person || v.contactPerson || "",
        paymentTerms: v.payment_terms_id === "PT-30" ? "Net 30 Days" : (v.payment_terms_id || prev.paymentTerms),
        deliveryLocation: prev.deliveryLocation || "SMS Main Stores, Faridabad"
      }));
    }
  };

  const handleItemSelect = (index, itemCode) => {
    const item = catalogItems.find((cat) => (cat.item_code || cat.sms_new_part_no) === itemCode);
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        itemCode: itemCode,
        itemDescription: item ? (item.item_description || item.description_size || "") : updated[index].itemDescription,
        uom: item ? (item.uom || item.purchased_uom || "PCS") : "PCS",
        unitRate: item && item.price ? parseFloat(item.price) : updated[index].unitRate
      };
      const { computedItems } = calculateTotals(updated, prev.deliveryCharges, prev.otherCharges);
      return { ...prev, items: computedItems };
    });
  };

  const handleItemFieldChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };

      // Handle tax type percentage mapping
      if (field === "taxType") {
        if (value === "GST 18%" || value === "IGST 18%") updated[index].taxPercent = 18;
        else if (value === "GST 12%") updated[index].taxPercent = 12;
        else if (value === "GST 5%") updated[index].taxPercent = 5;
        else if (value === "GST 28%") updated[index].taxPercent = 28;
        else if (value === "Exempt 0%") updated[index].taxPercent = 0;
      }

      const { computedItems } = calculateTotals(updated, prev.deliveryCharges, prev.otherCharges);
      return { ...prev, items: computedItems };
    });
  };

  const handleAddItemRow = () => {
    setFormData((prev) => {
      const newItem = {
        itemCode: catalogItems[0]?.item_code || "945-05745",
        itemDescription: catalogItems[0]?.item_description || "Oil Seal Component",
        uom: "PCS",
        quotedQuantity: 100,
        unitRate: 100,
        discountPercent: 0,
        discountAmount: 0,
        taxType: "GST 18%",
        taxPercent: 18,
        taxAmount: 0,
        additionalCharges: 0,
        lineTotal: 0,
        effectiveUnitCost: 0
      };
      const updated = [...prev.items, newItem];
      const { computedItems } = calculateTotals(updated, prev.deliveryCharges, prev.otherCharges);
      return { ...prev, items: computedItems };
    });
  };

  const handleRemoveItemRow = (index) => {
    if (formData.items.length <= 1) {
      alert("A quotation must have at least one line item.");
      return;
    }
    setFormData((prev) => {
      const updated = prev.items.filter((_, idx) => idx !== index);
      const { computedItems } = calculateTotals(updated, prev.deliveryCharges, prev.otherCharges);
      return { ...prev, items: computedItems };
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        documentName: file.name
      }));
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, documentUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Save or Draft
  const handleSaveQuotation = async (submitForReview) => {
    if (!formData.vendorName) {
      alert("Please select a vendor.");
      return;
    }
    if (new Date(formData.validUntil) < new Date(formData.quotationDate)) {
      alert("Quotation Valid Until date must be on or after Quotation Received Date.");
      return;
    }
    for (let it of formData.items) {
      if (!it.itemCode) {
        alert("Please ensure all line items have an item code selected.");
        return;
      }
      if (parseFloat(it.quotedQuantity) <= 0) {
        alert(`Quoted quantity for item ${it.itemCode} must be greater than 0.`);
        return;
      }
      if (parseFloat(it.unitRate) < 0) {
        alert(`Unit rate for item ${it.itemCode} cannot be negative.`);
        return;
      }
    }

    try {
      const { computedItems, subtotalAmount, taxAmount, finalAmount } = calculateTotals(
        formData.items, formData.deliveryCharges, formData.otherCharges
      );

      const payload = {
        ...formData,
        items: computedItems,
        subtotalAmount,
        taxAmount,
        finalAmount
      };

      const url = editingQuotationId
        ? `${API_BASE}/api/purchase/quotations/${editingQuotationId}?submit=${submitForReview}`
        : `${API_BASE}/api/purchase/quotations?submit=${submitForReview}`;

      const method = editingQuotationId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save quotation");
      }

      const saved = await res.json();
      showToast(
        `Quotation ${saved.quotationNumber} ${submitForReview ? "submitted for review" : "saved as Draft"}!`
      );
      setIsAddEditModalOpen(false);
      setEditingQuotationId(null);
      setFormData(initialFormState);
      fetchSummary();
      fetchQuotations();
    } catch (err) {
      alert("Error saving quotation: " + err.message);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (quotation) => {
    setEditingQuotationId(quotation.id);
    setFormData({
      quotationNumber: quotation.quotationNumber || "",
      vendorId: quotation.vendorId || null,
      vendorCode: quotation.vendorCode || "",
      vendorName: quotation.vendorName || "",
      vendorRefNo: quotation.vendorRefNo || "",
      quotationDate: quotation.quotationDate || new Date().toISOString().slice(0, 10),
      validUntil: quotation.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      contactPerson: quotation.contactPerson || "",
      paymentTerms: quotation.paymentTerms || "Net 30 Days",
      deliveryTime: quotation.deliveryTime || "7-10 Days",
      deliveryLocation: quotation.deliveryLocation || "SMS Main Stores, Faridabad",
      deliveryCharges: quotation.deliveryCharges || 0,
      otherCharges: quotation.otherCharges || 0,
      notes: quotation.notes || "",
      documentName: quotation.documentName || "",
      documentUrl: quotation.documentUrl || "",
      items: quotation.items && quotation.items.length > 0 ? quotation.items : initialFormState.items
    });
    setIsAddEditModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetailsModal = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/purchase/quotations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveQuotationDetail(data);
        setIsDetailsModalOpen(true);
      }
    } catch (err) {
      alert("Failed to load quotation details: " + err.message);
    }
  };

  // Create Revision
  const handleCreateRevision = async (id) => {
    if (!window.confirm("Create a new revision of this quotation? The current version will remain permanently archived in the audit history.")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/purchase/quotations/${id}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "Purchase Officer" })
      });
      if (res.ok) {
        const rev = await res.json();
        showToast(`Created new Revision ${rev.quotationNumber}!`);
        fetchQuotations();
        fetchSummary();
        handleOpenEditModal(rev);
      } else {
        const errJson = await res.json();
        alert(errJson.error || "Failed to create revision");
      }
    } catch (err) {
      alert("Error creating revision: " + err.message);
    }
  };

  // Status Change Workflow
  const handleUpdateStatus = async (status, justification = "", evalNotes = "") => {
    if (!activeQuotationDetail) return;
    try {
      const res = await fetch(`${API_BASE}/api/purchase/quotations/${activeQuotationDetail.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          justification,
          evaluationNotes: evalNotes,
          user: "HOD / General Manager (SCM)"
        })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Status update failed");
      }
      const updated = await res.json();
      setActiveQuotationDetail(updated);
      showToast(`Quotation status changed to "${status}"!`);
      setIsApproveModalOpen(false);
      setIsRejectModalOpen(false);
      fetchQuotations();
      fetchSummary();
    } catch (err) {
      alert(err.message);
    }
  };

  // Add Comment
  const handleAddComment = async () => {
    if (!newCommentText.trim() || !activeQuotationDetail) return;
    try {
      const res = await fetch(`${API_BASE}/api/purchase/quotations/${activeQuotationDetail.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: newCommentText.trim(),
          author: "Purchase Reviewer"
        })
      });
      if (res.ok) {
        const c = await res.json();
        setActiveQuotationDetail((prev) => ({
          ...prev,
          comments: [...(prev.comments || []), c]
        }));
        setNewCommentText("");
        showToast("Note added successfully!");
      }
    } catch (err) {
      alert("Failed to add note: " + err.message);
    }
  };

  // Delete Quotation
  const handleDeleteQuotation = async (id, quotNum) => {
    if (!window.confirm(`Are you sure you want to delete quotation "${quotNum}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/purchase/quotations/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`Quotation "${quotNum}" deleted successfully.`);
        fetchQuotations();
        fetchSummary();
        setSelectedIds(new Set());
      } else {
        const errJson = await res.json();
        alert(errJson.error || "Failed to delete quotation");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (filteredQuotations.length === 0) {
      alert("No data available to export.");
      return;
    }
    const exportRows = filteredQuotations.map((q) => ({
      "Quotation Number": q.quotationNumber,
      "Vendor Code": q.vendorCode,
      "Vendor Name": q.vendorName,
      "Vendor Ref #": q.vendorRefNo || "-",
      "Received Date": q.quotationDate,
      "Valid Until": q.validUntil,
      "No of Items": q.items ? q.items.length : 0,
      "Subtotal (₹)": q.subtotalAmount,
      "Tax Amount (₹)": q.taxAmount,
      "Delivery Charges (₹)": q.deliveryCharges,
      "Final Amount (₹)": q.finalAmount,
      "Payment Terms": q.paymentTerms || "-",
      "Delivery Time": q.deliveryTime || "-",
      "Status": q.status,
      "Revision": `R${q.revisionNumber || 1}`
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotations");
    XLSX.writeFile(wb, `SMS_Vendor_Quotations_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Exported quotations to Excel!");
  };

  // Print Quotation
  const handlePrintQuotation = () => {
    window.print();
  };

  // Dynamic Expiry Calculation Helper (Live-updates countdown based on currentSystemTime)
  const getExpiryInfo = (validUntil) => {
    if (!validUntil) return null;
    const parts = String(validUntil).split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const now = new Date(currentSystemTime);
    now.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const past = Math.abs(diffDays);
      return {
        status: "EXPIRED",
        diffDays,
        text: `Expired (${past}d ago)`,
        shortText: `Expired (${past}d ago)`,
        badgeText: "Expired",
        color: "#dc2626",
        bg: "#fee2e2",
        border: "#fca5a5",
        urgent: true,
        isExpired: true,
        isExpiringSoon: false
      };
    } else if (diffDays === 0) {
      return {
        status: "EXPIRES_TODAY",
        diffDays: 0,
        text: "Expires Today!",
        shortText: "Expires Today",
        badgeText: "Today",
        color: "#b91c1c",
        bg: "#fef2f2",
        border: "#f87171",
        urgent: true,
        isExpired: false,
        isExpiringSoon: true
      };
    } else if (diffDays === 1) {
      return {
        status: "EXPIRES_TOMORROW",
        diffDays: 1,
        text: "Expires Tomorrow (1d left)",
        shortText: "1d left",
        badgeText: "1d left",
        color: "#c2410c",
        bg: "#fff7ed",
        border: "#fdba74",
        urgent: true,
        isExpired: false,
        isExpiringSoon: true
      };
    } else if (diffDays <= 7) {
      return {
        status: "EXPIRING_SOON",
        diffDays,
        text: `${diffDays} days left`,
        shortText: `${diffDays}d left`,
        badgeText: `${diffDays}d left`,
        color: "#d97706",
        bg: "#fffbeb",
        border: "#fcd34d",
        urgent: true,
        isExpired: false,
        isExpiringSoon: true
      };
    } else {
      return {
        status: "VALID",
        diffDays,
        text: `${diffDays} days left`,
        shortText: `${diffDays}d left`,
        badgeText: `${diffDays}d left`,
        color: "#059669",
        bg: "#ecfdf5",
        border: "#a7f3d0",
        urgent: false,
        isExpired: false,
        isExpiringSoon: false
      };
    }
  };

  // Comprehensive Table Filtering
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // Status Pill
      if (selectedStatusFilter !== "ALL") {
        if (selectedStatusFilter === "EXPIRING_SOON") {
          const exp = getExpiryInfo(q.validUntil);
          if (!exp || !exp.isExpiringSoon || q.status === "Rejected" || q.status === "Expired") return false;
        } else if (q.status !== selectedStatusFilter) {
          return false;
        }
      }

      // Column filters
      if (colFilters.quotationNumber && !q.quotationNumber?.toLowerCase().includes(colFilters.quotationNumber.toLowerCase())) return false;
      if (colFilters.prNumber && !q.prNumber?.toLowerCase().includes(colFilters.prNumber.toLowerCase())) return false;
      if (colFilters.vendorName && !q.vendorName?.toLowerCase().includes(colFilters.vendorName.toLowerCase())) return false;
      if (colFilters.vendorRefNo && !q.vendorRefNo?.toLowerCase().includes(colFilters.vendorRefNo.toLowerCase())) return false;
      if (colFilters.quotationDate && !q.quotationDate?.includes(colFilters.quotationDate)) return false;
      if (colFilters.validUntil && !q.validUntil?.includes(colFilters.validUntil)) return false;
      if (colFilters.paymentTerms && !q.paymentTerms?.toLowerCase().includes(colFilters.paymentTerms.toLowerCase())) return false;
      if (colFilters.deliveryTime && !q.deliveryTime?.toLowerCase().includes(colFilters.deliveryTime.toLowerCase())) return false;
      if (colFilters.status && !q.status?.toLowerCase().includes(colFilters.status.toLowerCase())) return false;

      return true;
    });
  }, [quotations, selectedStatusFilter, colFilters, currentSystemTime]);

  // Sorting
  const sortedQuotations = useMemo(() => {
    const sorted = [...filteredQuotations];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return sorted;
  }, [filteredQuotations, sortField, sortAsc]);

  // Pagination
  const totalRecords = sortedQuotations.length;
  const isAllPages = pageSize === "ALL";
  const numPageSize = isAllPages ? totalRecords : Number(pageSize);
  const totalPages = isAllPages ? 1 : Math.ceil(totalRecords / numPageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = isAllPages ? 0 : (clampedPage - 1) * numPageSize;
  const endIndex = isAllPages ? totalRecords : Math.min(startIndex + numPageSize, totalRecords);
  const paginatedQuotations = isAllPages ? sortedQuotations : sortedQuotations.slice(startIndex, endIndex);

  // Status Badge Helper
  const getStatusBadge = (status, validUntil) => {
    const exp = getExpiryInfo(validUntil);
    const showExpiringBadge = exp && exp.isExpiringSoon && status !== "Selected for Purchase" && status !== "Rejected";

    let bg = "#f1f5f9";
    let color = "#475569";
    let border = "#cbd5e1";

    if (status === "Selected for Purchase") {
      bg = "#ecfdf5"; color = "#059669"; border = "#a7f3d0";
    } else if (status === "Submitted for Review") {
      bg = "#eff6ff"; color = "#2563eb"; border = "#bfdbfe";
    } else if (status === "Under Evaluation") {
      bg = "#fef3c7"; color = "#d97706"; border = "#fde68a";
    } else if (status === "Rejected") {
      bg = "#fee2e2"; color = "#dc2626"; border = "#fecaca";
    } else if (status === "Expired") {
      bg = "#f3f4f6"; color = "#6b7280"; border = "#e5e7eb";
    }

    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
            background: bg,
            color: color,
            border: `1px solid ${border}`,
            whiteSpace: "nowrap"
          }}
        >
          {status}
        </span>
        {showExpiringBadge && (
          <span
            title={`Expiring: ${exp.text}`}
            style={{
              padding: "2px 6px",
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 800,
              background: exp.bg,
              color: exp.color,
              border: `1px solid ${exp.border}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 3
            }}
          >
            <AlertTriangle size={10} /> {exp.badgeText}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: "#0f172a",
        position: "relative"
      }}
    >
      {/* ========================================================================= */}
      {/* ROW 1: PRIMARY ACTION TOOLBAR & BREADCRUMB (FG SCREEN STYLE) */}
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
        {/* Left Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* + Add Quotation Button */}
          <button
            onClick={() => {
              setEditingQuotationId(null);
              setFormData(initialFormState);
              setIsAddEditModalOpen(true);
            }}
            id="btn-new-quotation"
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
            <Plus size={16} />
            <span>Add Quotation</span>
          </button>

          {/* Connection 1: Create RFQ from Approved PR Button */}
          <button
            onClick={() => setIsRfqPrPickerOpen(true)}
            id="btn-rfq-from-pr"
            style={{
              background: "#0284c7",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)",
              transition: "all 0.15s ease"
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Create RFQ from Approved PR</span>
          </button>

          {/* Edit Button */}
          <button
            onClick={() => {
              if (selectedIds.size === 1) {
                const id = Array.from(selectedIds)[0];
                const q = quotations.find((it) => it.id === id);
                if (q) handleOpenEditModal(q);
              } else {
                alert("Please select exactly one quotation to edit.");
              }
            }}
            disabled={selectedIds.size !== 1}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: selectedIds.size === 1 ? "#334155" : "#94a3b8",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedIds.size === 1 ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>

          {/* View Details Button */}
          <button
            onClick={() => {
              if (selectedIds.size === 1) {
                const id = Array.from(selectedIds)[0];
                handleOpenDetailsModal(id);
              } else {
                alert("Please select one quotation to view details.");
              }
            }}
            disabled={selectedIds.size !== 1}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: selectedIds.size === 1 ? "#334155" : "#94a3b8",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedIds.size === 1 ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <Eye size={14} />
            <span>View Details</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (selectedIds.size === 1) {
                const id = Array.from(selectedIds)[0];
                const q = quotations.find((it) => it.id === id);
                if (q) handleDeleteQuotation(id, q.quotationNumber);
              } else {
                alert("Please select one quotation to delete.");
              }
            }}
            disabled={selectedIds.size !== 1}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: selectedIds.size === 1 ? "#ef4444" : "#94a3b8",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedIds.size === 1 ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>

          <span style={{ color: "#e2e8f0", margin: "0 4px", fontSize: 18 }}>|</span>

          {/* Utility Buttons: Refresh, Export, Print */}
          <button
            onClick={() => {
              fetchSummary();
              fetchQuotations();
              showToast("Quotations list refreshed.");
            }}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#059669",
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <Download size={13} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrintQuotation}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>

        {/* Right Breadcrumb & Live System Time */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Live System Time & Date Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "#334155"
            }}
            title="Live system date and time used for automatic quotation expiry countdown"
          >
            <Clock size={13} color="#2563eb" />
            <span>Today: {liveDateStr}</span>
            <span style={{ color: "#94a3b8" }}>•</span>
            <span style={{ color: "#2563eb", fontFamily: "monospace" }}>{liveTimeStr}</span>
          </div>

          {/* Sync Demo Dates to Today Button */}
          <button
            onClick={handleSyncDatesWithToday}
            title="Align demo quotations relative to today's date so you can test countdown (e.g. 7 days left -> 6 days left tomorrow)"
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <Sparkles size={12} color="#2563eb" />
            <span>Sync Demo Dates</span>
          </button>

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
            <span>Quotations</span>
            <span style={{ margin: "0 4px" }}>›</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>Vendor Quotations</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: MODERN TAB NAVIGATION BAR */}
      {/* ========================================================================= */}
      <div
        style={{
          flexShrink: 0,
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          gap: 4
        }}
      >
        {[
          { key: "overview", label: "Overview & Dashboard", icon: TrendingUp },
          { key: "all-quotations", label: "All Quotations", icon: FileText, count: quotations.length },
          { key: "rate-comparison", label: "Rate Comparison", icon: ArrowUpDown },
          { key: "price-history", label: "Price History & Trends", icon: History },
          { key: "vendor-analysis", label: "Vendor Analysis", icon: Building }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "11px 18px",
                border: "none",
                borderBottom: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                background: isActive ? "#0f172a" : "transparent",
                color: isActive ? "#ffffff" : "#94a3b8",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <Icon size={15} color={isActive ? "#60a5fa" : "#94a3b8"} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    background: isActive ? "#2563eb" : "#334155",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUMMARY CARDS SECTION (VISIBLE IN OVERVIEW & ALL QUOTATIONS TABS) */}
      {/* ========================================================================= */}
      {(activeTab === "overview" || activeTab === "all-quotations") && (
        <div
          style={{
            flexShrink: 0,
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            padding: "12px 18px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12
          }}
        >
          {/* Card 1: Total Quotations */}
          <div
            onClick={() => setSelectedStatusFilter("ALL")}
            style={{
              background: "#ffffff",
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Quotations</span>
              <FileText size={16} color="#3b82f6" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {summary.totalQuotations}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>From all vendors</div>
          </div>

          {/* Card 2: Awaiting Review */}
          <div
            onClick={() => setSelectedStatusFilter("Submitted for Review")}
            style={{
              background: "#ffffff",
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>Awaiting Review</span>
              <Clock size={16} color="#2563eb" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>
              {summary.awaitingReviewCount}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Pending evaluation</div>
          </div>

          {/* Card 3: Approved / Selected */}
          <div
            onClick={() => setSelectedStatusFilter("Selected for Purchase")}
            style={{
              background: "#ffffff",
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>Approved for Purchase</span>
              <CheckCircle2 size={16} color="#059669" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#047857", marginTop: 4 }}>
              {summary.approvedCount}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Ready for PO issue</div>
          </div>

          {/* Card 4: Expiring Soon */}
          <div
            onClick={() => setSelectedStatusFilter("EXPIRING_SOON")}
            style={{
              background: "#ffffff",
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #fed7aa",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase" }}>Expiring Soon</span>
              <AlertTriangle size={16} color="#ea580c" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#c2410c", marginTop: 4 }}>
              {summary.expiringSoonCount}
            </div>
            <div style={{ fontSize: 11, color: "#ea580c", marginTop: 2 }}>Next 7 Days (Live Countdown)</div>
          </div>

          {/* Card 5: Active Vendors */}
          <div
            style={{
              background: "#ffffff",
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Active Vendors</span>
              <Users size={16} color="#6366f1" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#4338ca", marginTop: 4 }}>
              {summary.activeVendorsCount}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Submitting quotes</div>
          </div>

          {/* Card 6: Recently Received */}
          <div
            style={{
              background: "#ffffff",
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Recent (14 Days)</span>
              <Sparkles size={16} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#6d28d9", marginTop: 4 }}>
              {summary.recentlyReceivedCount}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>New proposals</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA BY TAB */}
      {/* ========================================================================= */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#ffffff", overflow: "hidden" }}>
        
        {/* ----------------------------------------------------------------------- */}
        {/* TAB 1: ALL QUOTATIONS TABLE */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "all-quotations" && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {/* Filter and Search Bar */}
            <div
              style={{
                flexShrink: 0,
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10
              }}
            >
              {/* Search input */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260, maxWidth: 450 }}>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type="text"
                    placeholder="Search Quotation #, Vendor, Ref #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") fetchQuotations(); }}
                    style={{
                      width: "100%",
                      padding: "6px 12px 6px 30px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 12,
                      outline: "none"
                    }}
                  />
                  <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 9, top: 9 }} />
                </div>
                <button
                  onClick={fetchQuotations}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Search
                </button>
              </div>

              {/* Status Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {[
                  { label: "All", key: "ALL" },
                  { label: "Draft", key: "Draft" },
                  { label: "Submitted", key: "Submitted for Review" },
                  { label: "Evaluation", key: "Under Evaluation" },
                  { label: "Selected", key: "Selected for Purchase" },
                  { label: "Expiring 7d", key: "EXPIRING_SOON" }
                ].map((pill) => {
                  const isActive = selectedStatusFilter === pill.key;
                  return (
                    <button
                      key={pill.key}
                      onClick={() => setSelectedStatusFilter(pill.key)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 16,
                        border: isActive ? "none" : "1px solid #cbd5e1",
                        background: isActive ? "#1e293b" : "#f8fafc",
                        color: isActive ? "#ffffff" : "#475569",
                        fontSize: 11,
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer"
                      }}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              {/* Amount range filters */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Amount ₹:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filterMinAmount}
                  onChange={(e) => setFilterMinAmount(e.target.value)}
                  style={{ width: 70, padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filterMaxAmount}
                  onChange={(e) => setFilterMaxAmount(e.target.value)}
                  style={{ width: 70, padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                />
                <button
                  onClick={fetchQuotations}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "4px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Table Container (Scrolls vertically & horizontally) */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", position: "relative" }}>
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12, textAlign: "left", ...vendorQuotationsPage1Resize.tableStyle }}>
                <ResizableColGroup columns={VENDOR_QUOTATIONS_PAGE_1_COLUMNS} widths={vendorQuotationsPage1Resize.widths} />
                <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
                  <tr style={{ background: "#f1f5f9", height: 38 }}>
                    <th style={{ width: 36, textAlign: "center", borderBottom: "1px solid #cbd5e1", padding: "6px 8px" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === paginatedQuotations.length && paginatedQuotations.length > 0}
                        onChange={() => {
                          if (selectedIds.size === paginatedQuotations.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(paginatedQuotations.map((q) => q.id)));
                        }}
                      />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                      Quotation #
                      <ColumnResizeHandle colKey="quotation" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                      Source PR
                      <ColumnResizeHandle colKey="source_pr" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", minWidth: 160 }}>
                      Vendor Name
                      <ColumnResizeHandle colKey="vendor_name" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                      Vendor Ref #
                      <ColumnResizeHandle colKey="vendor_ref" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                      Received Date
                      <ColumnResizeHandle colKey="received_date" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                      Valid Until
                      <ColumnResizeHandle colKey="valid_until" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "center" }}>
                      Items
                      <ColumnResizeHandle colKey="items" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right", whiteSpace: "nowrap" }}>
                      Subtotal (₹)
                      <ColumnResizeHandle colKey="subtotal" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right", whiteSpace: "nowrap" }}>
                      Tax (₹)
                      <ColumnResizeHandle colKey="tax" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right", whiteSpace: "nowrap" }}>
                      Delivery (₹)
                      <ColumnResizeHandle colKey="delivery" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#0f172a", textAlign: "right", whiteSpace: "nowrap" }}>
                      Final Amount (₹)
                      <ColumnResizeHandle colKey="final_amount" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                      Payment Terms
                      <ColumnResizeHandle colKey="payment_terms" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                      Delivery
                      <ColumnResizeHandle colKey="delivery_x" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "center" }}>
                      Status
                      <ColumnResizeHandle colKey="status" resize={vendorQuotationsPage1Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "center", width: 140 }}>
                      Actions
                      <ColumnResizeHandle colKey="actions" resize={vendorQuotationsPage1Resize} />
                    </th>
                  </tr>

                  {/* Header Row 2: Per-column filters */}
                  <tr style={{ background: "#f8fafc", height: 32 }}>
                    <th style={{ borderBottom: "1px solid #cbd5e1" }}></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "2px 4px" }}>
                      <input
                        type="text"
                        placeholder="Filter #"
                        value={colFilters.quotationNumber}
                        onChange={(e) => setColFilters((p) => ({ ...p, quotationNumber: e.target.value }))}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                      />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "2px 4px" }}>
                      <input
                        type="text"
                        placeholder="Filter PR"
                        value={colFilters.prNumber}
                        onChange={(e) => setColFilters((p) => ({ ...p, prNumber: e.target.value }))}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                      />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "2px 4px" }}>
                      <input
                        type="text"
                        placeholder="Filter Vendor"
                        value={colFilters.vendorName}
                        onChange={(e) => setColFilters((p) => ({ ...p, vendorName: e.target.value }))}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                      />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "2px 4px" }}>
                      <input
                        type="text"
                        placeholder="Filter Ref"
                        value={colFilters.vendorRefNo}
                        onChange={(e) => setColFilters((p) => ({ ...p, vendorRefNo: e.target.value }))}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                      />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "2px 4px" }}>
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        value={colFilters.quotationDate}
                        onChange={(e) => setColFilters((p) => ({ ...p, quotationDate: e.target.value }))}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                      />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "2px 4px" }}>
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        value={colFilters.validUntil}
                        onChange={(e) => setColFilters((p) => ({ ...p, validUntil: e.target.value }))}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                      />
                    </th>
                    <th colSpan={5} style={{ borderBottom: "1px solid #cbd5e1" }}></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "2px 4px" }}>
                      <input
                        type="text"
                        placeholder="Terms"
                        value={colFilters.paymentTerms}
                        onChange={(e) => setColFilters((p) => ({ ...p, paymentTerms: e.target.value }))}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                      />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "2px 4px" }}>
                      <input
                        type="text"
                        placeholder="Time"
                        value={colFilters.deliveryTime}
                        onChange={(e) => setColFilters((p) => ({ ...p, deliveryTime: e.target.value }))}
                        style={{ width: "100%", padding: "2px 4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 3 }}
                      />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1" }}></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1" }}></th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
                        <div>Loading vendor quotations...</div>
                      </td>
                    </tr>
                  ) : paginatedQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: "center", padding: 50, color: "#64748b" }}>
                        <FileText size={36} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>No Quotations Found</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          {searchTerm || selectedStatusFilter !== "ALL"
                            ? "Try clearing filters to see more results."
                            : "Click '+ Add Quotation' to register your first vendor quotation."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedQuotations.map((q) => {
                      const isSelected = selectedIds.has(q.id);
                      return (
                        <tr
                          key={q.id}
                          style={{
                            background: isSelected ? "#f0fdf4" : "#ffffff",
                            borderBottom: "1px solid #e2e8f0",
                            transition: "background 0.1s"
                          }}
                        >
                          <td style={{ textAlign: "center", padding: "8px 6px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(q.id)) next.delete(q.id);
                                  else next.add(q.id);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563eb", whiteSpace: "nowrap" }}>
                            <span
                              onClick={() => handleOpenDetailsModal(q.id)}
                              style={{ cursor: "pointer", textDecoration: "underline" }}
                            >
                              {q.quotationNumber}
                            </span>
                            {q.revisionNumber > 1 && (
                              <span style={{ fontSize: 10, background: "#e2e8f0", padding: "1px 5px", borderRadius: 4, marginLeft: 5, color: "#475569" }}>
                                Rev {q.revisionNumber}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                            {q.prNumber ? (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHandoff("SMS_SELECTED_PR_NUMBER", q.prNumber);
                                  if (onNavigate) onNavigate("purchase-requisition");
                                }}
                                style={{
                                  cursor: "pointer",
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  border: "1px solid #bfdbfe",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3
                                }}
                                title="Click to view Source PR in Requisition Screen"
                              >
                                {q.prNumber} ➔
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{q.vendorName}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{q.vendorCode}</div>
                          </td>
                          <td style={{ padding: "8px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                            {q.vendorRefNo || "-"}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                            {formatDisplayDate(q.quotationDate)}
                          </td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 12 }}>{q.validUntil}</div>
                            {(() => {
                              const exp = getExpiryInfo(q.validUntil);
                              if (!exp) return null;
                              return (
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    marginTop: 2,
                                    background: exp.bg,
                                    color: exp.color,
                                    border: `1px solid ${exp.border}`
                                  }}
                                  title={`As of today (${liveDateStr}): ${exp.text}`}
                                >
                                  {exp.urgent && <AlertTriangle size={9} />}
                                  {exp.text}
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600 }}>
                            {q.items ? q.items.length : 0}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#475569" }}>
                            ₹{Number(q.subtotalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#475569" }}>
                            ₹{Number(q.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#475569" }}>
                            ₹{Number(q.deliveryCharges || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, fontFamily: "monospace", color: "#0f172a" }}>
                            ₹{Number(q.finalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                            {q.paymentTerms || "Net 30 Days"}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                            {q.deliveryTime || "7 Days"}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            {getStatusBadge(q.status, q.validUntil)}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <button
                                title="View Details"
                                onClick={() => handleOpenDetailsModal(q.id)}
                                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, color: "#2563eb" }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                title="Edit Quotation"
                                onClick={() => handleOpenEditModal(q)}
                                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, color: "#475569" }}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                title="Add Notes / Comments"
                                onClick={() => {
                                  setActiveQuotationDetail(q);
                                  setIsCommentsModalOpen(true);
                                }}
                                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, color: "#059669" }}
                              >
                                <MessageSquare size={15} />
                              </button>
                              <button
                                title="Create Revision"
                                onClick={() => handleCreateRevision(q.id)}
                                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, color: "#8b5cf6" }}
                              >
                                <Copy size={15} />
                              </button>
                              <button
                                title="View History"
                                onClick={async () => {
                                  await handleOpenDetailsModal(q.id);
                                  setIsHistoryModalOpen(true);
                                }}
                                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, color: "#d97706" }}
                              >
                                <History size={15} />
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

            {/* Pagination Bar */}
            <div
              style={{
                flexShrink: 0,
                background: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#64748b"
              }}
            >
              <div>
                Showing <strong>{totalRecords === 0 ? 0 : startIndex + 1}</strong> to{" "}
                <strong>{endIndex}</strong> of <strong>{totalRecords}</strong> quotations
                {selectedIds.size > 0 && (
                  <span style={{ marginLeft: 12, color: "#2563eb", fontWeight: 700 }}>
                    ({selectedIds.size} selected)
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="ALL">All</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1 || isAllPages}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: currentPage > 1 ? "pointer" : "not-allowed" }}
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isAllPages}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: currentPage > 1 ? "pointer" : "not-allowed" }}
                  >
                    ‹
                  </button>
                  <span style={{ margin: "0 6px" }}>
                    Page <strong>{clampedPage}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isAllPages}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: currentPage < totalPages ? "pointer" : "not-allowed" }}
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages || isAllPages}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: currentPage < totalPages ? "pointer" : "not-allowed" }}
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 2: OVERVIEW & DASHBOARD */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "overview" && (
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 24, background: "#f8fafc" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Quick Actions & Recent Highlights */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
                {/* Recent Quotations Card */}
                <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Recently Received Quotations</div>
                    <button
                      onClick={() => setActiveTab("all-quotations")}
                      style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                    >
                      View All Quotations →
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {quotations.slice(0, 5).map((q) => (
                      <div
                        key={q.id}
                        onClick={() => handleOpenDetailsModal(q.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderRadius: 6,
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                          transition: "background 0.15s ease"
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, color: "#2563eb" }}>{q.quotationNumber}</span>
                            <span style={{ fontSize: 11, color: "#64748b" }}>• {formatDisplayDate(q.quotationDate)}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{q.vendorName}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>
                            ₹{Number(q.finalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ marginTop: 2 }}>{getStatusBadge(q.status, q.validUntil)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick SCM Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>SCM Quick Action</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button
                        onClick={() => {
                          setEditingQuotationId(null);
                          setFormData(initialFormState);
                          setIsAddEditModalOpen(true);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 6,
                          border: "none",
                          background: "#1e293b",
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8
                        }}
                      >
                        <Plus size={16} /> + New Vendor Quotation
                      </button>
                      <button
                        onClick={() => setActiveTab("rate-comparison")}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#334155",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8
                        }}
                      >
                        <ArrowUpDown size={16} color="#2563eb" /> Run Item Rate Comparison
                      </button>
                      <button
                        onClick={() => setActiveTab("vendor-analysis")}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#334155",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8
                        }}
                      >
                        <Building size={16} color="#059669" /> View Vendor Performance
                      </button>
                    </div>
                  </div>

                  {/* Expiring Soon Notice */}
                  {summary.expiringSoonCount > 0 && (
                    <div style={{ background: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa", padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#c2410c", fontWeight: 700, fontSize: 13 }}>
                        <AlertTriangle size={18} /> Expiring Quotations Alert
                      </div>
                      <div style={{ fontSize: 12, color: "#9a3412", marginTop: 4 }}>
                        {summary.expiringSoonCount} quotation(s) are expiring in the next 7 days. Review them now to lock current raw material rates.
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStatusFilter("EXPIRING_SOON");
                          setActiveTab("all-quotations");
                        }}
                        style={{
                          marginTop: 8,
                          background: "#c2410c",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 4,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Filter Expiring Quotes →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 3: ITEM RATE COMPARISON */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "rate-comparison" && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {/* Top Filter Controls */}
            <div
              style={{
                flexShrink: 0,
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>
                    Item Code / Description:
                  </label>
                  <SearchableSelect
                    value={compareItemCode}
                    onChange={(e) => setCompareItemCode(e.target.value)}
                    placeholder="Select item to compare"
                    options={catalogOptions(catalogItems)}
                    style={{ minWidth: 260 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>
                    Required Purchase Qty:
                  </label>
                  <input
                    type="number"
                    value={compareQuantity}
                    onChange={(e) => setCompareQuantity(e.target.value)}
                    placeholder="e.g. 500"
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, width: 110 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>
                    Comparison Date:
                  </label>
                  <DateInput
                    value={compareDate}
                    onChange={(e) => setCompareDate(e.target.value)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                  />
                </div>

                <button
                  onClick={fetchRateComparison}
                  style={{
                    marginTop: 18,
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <RefreshCw size={13} />
                  <span>Run Comparison</span>
                </button>
              </div>

              {/* Side-by-Side compare button */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => {
                    if (selectedVendorsForSideBySide.length < 2) {
                      alert("Please select at least 2 vendor quotations using the checkboxes to compare side-by-side.");
                      return;
                    }
                    setIsSideBySideModalOpen(true);
                  }}
                  disabled={selectedVendorsForSideBySide.length < 2}
                  style={{
                    background: selectedVendorsForSideBySide.length >= 2 ? "#059669" : "#f1f5f9",
                    color: selectedVendorsForSideBySide.length >= 2 ? "#ffffff" : "#94a3b8",
                    border: "none",
                    borderRadius: 6,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: selectedVendorsForSideBySide.length >= 2 ? "pointer" : "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <ArrowUpDown size={14} />
                  <span>Side-by-Side Matrix ({selectedVendorsForSideBySide.length})</span>
                </button>

                <button
                  onClick={() => {
                    if (comparisonResults.length === 0) return;
                    const ws = XLSX.utils.json_to_sheet(comparisonResults);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "RateComparison");
                    XLSX.writeFile(wb, `SMS_Rate_Comparison_${compareItemCode}.xlsx`);
                    showToast("Exported Rate Comparison to Excel!");
                  }}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#059669",
                    borderRadius: 6,
                    padding: "7px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5
                  }}
                >
                  <Download size={13} /> Export
                </button>
              </div>
            </div>

            {/* Comparison Table */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", position: "relative" }}>
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12, textAlign: "left", ...vendorQuotationsPage2Resize.tableStyle }}>
                <ResizableColGroup columns={VENDOR_QUOTATIONS_PAGE_2_COLUMNS} widths={vendorQuotationsPage2Resize.widths} />
                <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
                  <tr style={{ background: "#f1f5f9", height: 38 }}>
                    <th style={{ width: 36, textAlign: "center", borderBottom: "1px solid #cbd5e1", padding: "6px 8px" }}>
                      Select
                      <ColumnResizeHandle colKey="select" resize={vendorQuotationsPage2Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155" }}>Vendor Name<ColumnResizeHandle colKey="vendor_name" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155" }}>Quotation #<ColumnResizeHandle colKey="quotation" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155" }}>Quotation Date<ColumnResizeHandle colKey="quotation_date" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Quoted Qty<ColumnResizeHandle colKey="quoted_qty" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Unit Rate (₹)<ColumnResizeHandle colKey="unit_rate" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Disc (%)<ColumnResizeHandle colKey="disc" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Tax (%)<ColumnResizeHandle colKey="tax" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Delivery (₹)<ColumnResizeHandle colKey="delivery" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 800, color: "#0f172a", textAlign: "right", background: "#fef3c7" }}>
                      Effective Unit Cost (₹)
                      <ColumnResizeHandle colKey="effective_unit_cost" resize={vendorQuotationsPage2Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#0f172a", textAlign: "right" }}>
                      Total For Req Qty (₹)
                      <ColumnResizeHandle colKey="total_for_req_qty" resize={vendorQuotationsPage2Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right" }}>
                      Prev Purchase Rate (₹)
                      <ColumnResizeHandle colKey="prev_purchase_rate" resize={vendorQuotationsPage2Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "right" }}>
                      Diff from Lowest (₹ / %)
                      <ColumnResizeHandle colKey="diff_from_lowest" resize={vendorQuotationsPage2Resize} />
                    </th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155" }}>Delivery Time<ColumnResizeHandle colKey="delivery_time" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155" }}>Payment Terms<ColumnResizeHandle colKey="payment_terms" resize={vendorQuotationsPage2Resize} /></th>
                    <th style={{ borderBottom: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 700, color: "#334155", textAlign: "center" }}>Actions<ColumnResizeHandle colKey="actions" resize={vendorQuotationsPage2Resize} /></th>
                  </tr>
                </thead>

                <tbody>
                  {comparisonLoading ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
                        <div>Computing equivalent vendor quotation costs...</div>
                      </td>
                    </tr>
                  ) : comparisonResults.length === 0 ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: "center", padding: 50, color: "#64748b" }}>
                        <AlertCircle size={36} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>No Vendor Quotations for Item "{compareItemCode}"</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          We do not fabricate fake prices. Select another item or register a quotation for this item.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    comparisonResults.map((row) => {
                      const isSelected = selectedVendorsForSideBySide.some((v) => v.quotationId === row.quotationId);
                      const isPriceIncreased = row.previousPurchaseRate && row.unitRate > row.previousPurchaseRate;

                      return (
                        <tr
                          key={row.quotationId}
                          style={{
                            background: row.isLowestPrice ? "#ecfdf5" : isSelected ? "#f0fdf4" : "#ffffff",
                            borderBottom: "1px solid #e2e8f0"
                          }}
                        >
                          <td style={{ textAlign: "center", padding: "8px 6px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedVendorsForSideBySide((prev) => {
                                  if (prev.some((v) => v.quotationId === row.quotationId)) {
                                    return prev.filter((v) => v.quotationId !== row.quotationId);
                                  } else {
                                    return [...prev, row];
                                  }
                                });
                              }}
                            />
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0f172a" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span>{row.vendorName}</span>
                              {row.isLowestPrice && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    background: "#059669",
                                    color: "#ffffff",
                                    padding: "1px 6px",
                                    borderRadius: 10
                                  }}
                                >
                                  LOWEST PRICE
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{row.vendorCode}</div>
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: "#2563eb" }}>
                            <span
                              onClick={() => handleOpenDetailsModal(row.quotationId)}
                              style={{ cursor: "pointer", textDecoration: "underline" }}
                            >
                              {row.quotationNumber}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px", color: "#475569" }}>{formatDisplayDate(row.quotationDate)}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.quotedQuantity}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                            ₹{Number(row.unitRate).toFixed(2)}
                            {isPriceIncreased && (
                              <span
                                title="Warning: Quoted price is higher than previous purchase rate!"
                                style={{ display: "inline-block", marginLeft: 4, color: "#dc2626" }}
                              >
                                ⚠
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.discountPercent}%</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.taxPercent}%</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                            ₹{Number(row.quotationDeliveryCharges || 0).toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              textAlign: "right",
                              fontFamily: "monospace",
                              fontWeight: 800,
                              fontSize: 13,
                              background: row.isLowestPrice ? "#d1fae5" : "#fef9c3",
                              color: row.isLowestPrice ? "#065f46" : "#854d0e"
                            }}
                          >
                            ₹{Number(row.effectiveUnitCost).toFixed(4)}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                            ₹{Number(row.calculatedTotalForRequestedQty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#64748b" }}>
                            {row.previousPurchaseRate ? `₹${Number(row.previousPurchaseRate).toFixed(2)}` : "-"}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                            {row.isLowestPrice ? (
                              <span style={{ color: "#059669", fontWeight: 700 }}>0 (Baseline)</span>
                            ) : (
                              <span style={{ color: "#dc2626", fontWeight: 600 }}>
                                +₹{Number(row.diffFromLowestPrice).toFixed(2)} (+{row.diffPercentFromLowest}%)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#475569" }}>{row.deliveryTime}</td>
                          <td style={{ padding: "8px 10px", color: "#475569" }}>{row.paymentTerms}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <button
                              onClick={() => handleOpenDetailsModal(row.quotationId)}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              Evaluate
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 4: VENDOR PRICE HISTORY & TRENDS */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "price-history" && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: 18, overflow: "auto", background: "#f8fafc" }}>
            <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header Filters */}
              <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: "12px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>Select Item:</label>
                  <SearchableSelect
                    value={historyItemCode}
                    onChange={(e) => setHistoryItemCode(e.target.value)}
                    placeholder="Select item for history"
                    options={catalogOptions(catalogItems)}
                    style={{ minWidth: 260 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>Select Vendor (Optional):</label>
                  <select
                    value={historyVendorCode}
                    onChange={(e) => setHistoryVendorCode(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, minWidth: 220 }}
                  >
                    <option value="ALL">All Quoting Vendors</option>
                    <option value="SUP-002">SUP-002 — A.V.SALES CORPORATION</option>
                    <option value="SUP-003">SUP-003 — AATOMIZE MANUFACTURING PRIVATE LIMITED</option>
                    <option value="SUP-005">SUP-005 — ACCURATE STEELS</option>
                  </select>
                </div>

                <button
                  onClick={fetchPriceHistory}
                  style={{
                    marginTop: 18,
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Refresh History
                </button>
              </div>

              {/* Price Trend Chart (SVG) */}
              <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
                  Quoted Unit Rate Trend Over Time — {historyItemCode}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                  Visualizing price variations across historical quotation submissions
                </div>

                {priceHistoryData.length > 0 ? (
                  <div style={{ width: "100%", height: 200, background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", position: "relative", padding: 20 }}>
                    <svg viewBox="0 0 800 160" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                      {/* Grid Lines */}
                      <line x1="50" y1="20" x2="750" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="50" y1="70" x2="750" y2="70" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="50" y1="120" x2="750" y2="120" stroke="#e2e8f0" strokeDasharray="3,3" />

                      {/* Line & Points */}
                      {(() => {
                        const rates = priceHistoryData.map((d) => parseFloat(d.unitRate));
                        const min = Math.min(...rates) * 0.9;
                        const max = Math.max(...rates) * 1.1 || 200;
                        const range = max - min || 1;

                        const pts = priceHistoryData.map((d, i) => {
                          const x = 70 + (i * (680 / Math.max(1, priceHistoryData.length - 1)));
                          const y = 130 - (((parseFloat(d.unitRate) - min) / range) * 110);
                          return { x, y, d };
                        });

                        const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(" ");

                        return (
                          <>
                            <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={polylinePoints} />
                            {pts.map((p, idx) => (
                              <g key={idx}>
                                <circle cx={p.x} cy={p.y} r="6" fill="#1e293b" stroke="#ffffff" strokeWidth="2" />
                                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
                                  ₹{p.d.unitRate}
                                </text>
                                <text x={p.x} y={150} textAnchor="middle" fontSize="10" fill="#64748b">
                                  {formatDisplayDate(p.d.quotationDate)} ({p.d.vendorCode})
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                    No historical prices recorded for this item yet.
                  </div>
                )}
              </div>

              {/* Price History Table */}
              <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 13 }}>
                  Historical Quotations Log
                </div>
                <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left", ...vendorQuotationsPage3Resize.tableStyle }}>
                  <ResizableColGroup columns={VENDOR_QUOTATIONS_PAGE_3_COLUMNS} widths={vendorQuotationsPage3Resize.widths} />
                  <thead style={{ background: "#f1f5f9" }}>
                    <tr>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1" }}>Quotation #<ColumnResizeHandle colKey="quotation" resize={vendorQuotationsPage3Resize} /></th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1" }}>Vendor<ColumnResizeHandle colKey="vendor" resize={vendorQuotationsPage3Resize} /></th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1" }}>Quotation Date<ColumnResizeHandle colKey="quotation_date" resize={vendorQuotationsPage3Resize} /></th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Unit Rate (₹)<ColumnResizeHandle colKey="unit_rate" resize={vendorQuotationsPage3Resize} /></th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Tax (₹)<ColumnResizeHandle colKey="tax" resize={vendorQuotationsPage3Resize} /></th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Effective Unit Cost (₹)<ColumnResizeHandle colKey="effective_unit_cost" resize={vendorQuotationsPage3Resize} /></th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1", textAlign: "center" }}>Status<ColumnResizeHandle colKey="status" resize={vendorQuotationsPage3Resize} /></th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1" }}>Related PO #<ColumnResizeHandle colKey="related_po" resize={vendorQuotationsPage3Resize} /></th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Actual Purchase Rate<ColumnResizeHandle colKey="actual_purchase_rate" resize={vendorQuotationsPage3Resize} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistoryData.map((h, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#2563eb" }}>{h.quotationNumber}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ fontWeight: 600 }}>{h.vendorName}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{h.vendorCode}</div>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#475569" }}>{formatDisplayDate(h.quotationDate)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                          ₹{Number(h.unitRate).toFixed(2)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace" }}>
                          ₹{Number(h.taxAmount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                          ₹{Number(h.effectiveUnitCost).toFixed(4)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          {getStatusBadge(h.status)}
                        </td>
                        <td style={{ padding: "8px 12px", color: "#475569" }}>
                          {h.relatedPoNumber || "-"}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", color: "#059669", fontWeight: 700 }}>
                          {h.actualPurchaseRate ? `₹${Number(h.actualPurchaseRate).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 5: VENDOR ANALYSIS */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "vendor-analysis" && (
          <div style={{ flex: 1, minHeight: 0, padding: 20, overflow: "auto", background: "#f8fafc" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                Vendor Quotation Performance &amp; Evaluation Matrix
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Comprehensive tracking of vendor response, pricing changes, win rate, and agreed terms.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
                {vendorAnalysisData.map((va) => (
                  <div
                    key={va.vendorCode}
                    style={{
                      background: "#ffffff",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      padding: 18,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{va.vendorName}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Code: {va.vendorCode}</div>
                      </div>
                      <span
                        style={{
                          background: va.selectionRatePercent > 0 ? "#ecfdf5" : "#f1f5f9",
                          color: va.selectionRatePercent > 0 ? "#059669" : "#64748b",
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 12
                        }}
                      >
                        {va.selectionRatePercent}% Win Rate
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, fontSize: 12 }}>
                      <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                        <div style={{ color: "#64748b", fontSize: 11 }}>Quotations Submitted</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{va.quotationsSubmittedCount}</div>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                        <div style={{ color: "#64748b", fontSize: 11 }}>Selected for Purchase</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>{va.quotationsSelectedCount}</div>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                        <div style={{ color: "#64748b", fontSize: 11 }}>Avg Delivery Time</div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{va.avgDeliveryTime || "7-10 Days"}</div>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                        <div style={{ color: "#64748b", fontSize: 11 }}>Payment Terms</div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{va.commonPaymentTerms || "Net 30"}</div>
                      </div>
                    </div>

                    {/* Quoted Items Preview */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>
                        Quoted Items &amp; Latest Rates:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {va.items?.map((it, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: 11,
                              background: "#f1f5f9",
                              padding: "4px 8px",
                              borderRadius: 4
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{it.itemCode}</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>₹{it.latestQuotedPrice}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT QUOTATION */}
      {/* ========================================================================= */}
      {isAddEditModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 1050,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#1e293b",
                color: "#ffffff",
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                {editingQuotationId ? `Edit Vendor Quotation: ${formData.quotationNumber}` : "New Vendor Quotation"}
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 20 }}>
              {/* Section 1: Vendor Information */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 16, marginBottom: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Building size={16} color="#2563eb" /> Vendor Information
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Select Existing Vendor: <span style={{ color: "red" }}>*</span>
                    </label>
                    <SearchableSelect
                      value={formData.vendorCode}
                      onChange={(e) => handleVendorSelect(e.target.value)}
                      placeholder="Choose vendor from master"
                      options={vendorsList.map((v) => ({ value: v.supplier_code || v.supplierCode, label: v.supplier_code || v.supplierCode, sub: v.supplier_name || v.supplierName }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Vendor Quotation Ref #:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AVS/QT/2026/91"
                      value={formData.vendorRefNo}
                      onChange={(e) => setFormData((p) => ({ ...p, vendorRefNo: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Quotation Received Date: <span style={{ color: "red" }}>*</span>
                    </label>
                    <DateInput
                      value={formData.quotationDate}
                      onChange={(e) => setFormData((p) => ({ ...p, quotationDate: e.target.value }))}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Valid Until Date: <span style={{ color: "red" }}>*</span>
                    </label>
                    <DateInput
                      value={formData.validUntil}
                      onChange={(e) => setFormData((p) => ({ ...p, validUntil: e.target.value }))}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Vendor Contact Person:
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData((p) => ({ ...p, contactPerson: e.target.value }))}
                      placeholder="Contact name or phone"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Payment Terms:
                    </label>
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData((p) => ({ ...p, paymentTerms: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    >
                      <option value="Net 30 Days">Net 30 Days</option>
                      <option value="Net 45 Days">Net 45 Days</option>
                      <option value="Net 60 Days">Net 60 Days</option>
                      <option value="Advance 50%">Advance 50%</option>
                      <option value="Advance 100%">Advance 100%</option>
                      <option value="Immediate / COD">Immediate / COD</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Expected Delivery Time:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 7 Days / 2 Weeks"
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData((p) => ({ ...p, deliveryTime: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Delivery Location:
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryLocation}
                      onChange={(e) => setFormData((p) => ({ ...p, deliveryLocation: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Upload Original Quotation Document:
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={handleFileUpload}
                      style={{ fontSize: 11 }}
                    />
                    {formData.documentName && (
                      <div style={{ fontSize: 11, color: "#059669", marginTop: 2 }}>
                        Attached: {formData.documentName}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Line Items */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                    <FileText size={16} color="#059669" /> Quoted Item Details
                  </div>
                  <button
                    onClick={handleAddItemRow}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 4,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <Plus size={14} /> + Add Item Row
                  </button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left", ...vendorQuotationsPage4Resize.tableStyle }}>
                    <ResizableColGroup columns={VENDOR_QUOTATIONS_PAGE_4_COLUMNS} widths={vendorQuotationsPage4Resize.widths} />
                    <thead style={{ background: "#f1f5f9" }}>
                      <tr>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", minWidth: 160 }}>Item Code<ColumnResizeHandle colKey="item_code" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", minWidth: 200 }}>Description<ColumnResizeHandle colKey="description" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 60 }}>UOM<ColumnResizeHandle colKey="uom" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 80, textAlign: "right" }}>Qty<ColumnResizeHandle colKey="qty" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 90, textAlign: "right" }}>Rate (₹)<ColumnResizeHandle colKey="rate" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 70, textAlign: "right" }}>Disc %<ColumnResizeHandle colKey="disc" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 100 }}>Tax Type<ColumnResizeHandle colKey="tax_type" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 80, textAlign: "right" }}>Tax (₹)<ColumnResizeHandle colKey="tax" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 80, textAlign: "right" }}>Addl Chgs<ColumnResizeHandle colKey="addl_chgs" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 100, textAlign: "right" }}>Line Total<ColumnResizeHandle colKey="line_total" resize={vendorQuotationsPage4Resize} /></th>
                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", width: 40, textAlign: "center" }}><ColumnResizeHandle colKey="col10" resize={vendorQuotationsPage4Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "6px 8px" }}>
                            <SearchableSelect
                              value={row.itemCode}
                              onChange={(e) => handleItemSelect(idx, e.target.value)}
                              placeholder="Select item code"
                              options={[
                                ...(row.itemCode && !catalogItems.some((c) => (c.item_code || c.sms_new_part_no) === row.itemCode)
                                  ? [{ value: row.itemCode, label: row.itemCode, sub: row.itemDescription || row.itemCode }]
                                  : []),
                                ...catalogOptions(catalogItems)
                              ]}
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="text"
                              value={row.itemDescription}
                              onChange={(e) => handleItemFieldChange(idx, "itemDescription", e.target.value)}
                              style={{ width: "100%", padding: "4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="text"
                              value={row.uom}
                              onChange={(e) => handleItemFieldChange(idx, "uom", e.target.value)}
                              style={{ width: "100%", padding: "4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="number"
                              value={row.quotedQuantity}
                              onChange={(e) => handleItemFieldChange(idx, "quotedQuantity", e.target.value)}
                              style={{ width: "100%", padding: "4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="number"
                              value={row.unitRate}
                              onChange={(e) => handleItemFieldChange(idx, "unitRate", e.target.value)}
                              style={{ width: "100%", padding: "4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="number"
                              value={row.discountPercent}
                              onChange={(e) => handleItemFieldChange(idx, "discountPercent", e.target.value)}
                              style={{ width: "100%", padding: "4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <select
                              value={row.taxType}
                              onChange={(e) => handleItemFieldChange(idx, "taxType", e.target.value)}
                              style={{ width: "100%", padding: "4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4 }}
                            >
                              <option value="GST 18%">GST 18%</option>
                              <option value="GST 12%">GST 12%</option>
                              <option value="GST 5%">GST 5%</option>
                              <option value="GST 28%">GST 28%</option>
                              <option value="IGST 18%">IGST 18%</option>
                              <option value="Exempt 0%">Exempt 0%</option>
                            </select>
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>
                            ₹{Number(row.taxAmount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="number"
                              value={row.additionalCharges}
                              onChange={(e) => handleItemFieldChange(idx, "additionalCharges", e.target.value)}
                              style={{ width: "100%", padding: "4px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                            />
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontFamily: "monospace" }}>
                            ₹{Number(row.lineTotal || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>
                            <button
                              onClick={() => handleRemoveItemRow(idx)}
                              style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Quotation-level Charges & Totals Box */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    Quotation Remarks / Evaluation Notes:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter any supplier guarantees, warranty terms, or special conditions..."
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                  />
                </div>

                <div style={{ background: "#f8fafc", padding: 14, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span>Subtotal Before Tax:</span>
                    <span style={{ fontWeight: 700, fontFamily: "monospace" }}>
                      ₹{calculateTotals(formData.items, formData.deliveryCharges, formData.otherCharges).subtotalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span>Total Tax Amount:</span>
                    <span style={{ fontWeight: 700, fontFamily: "monospace" }}>
                      ₹{calculateTotals(formData.items, formData.deliveryCharges, formData.otherCharges).taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span>Delivery &amp; Freight Charges:</span>
                    <input
                      type="number"
                      value={formData.deliveryCharges}
                      onChange={(e) => setFormData((p) => ({ ...p, deliveryCharges: parseFloat(e.target.value) || 0 }))}
                      style={{ width: 100, padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                    <span>Other Charges / Packaging:</span>
                    <input
                      type="number"
                      value={formData.otherCharges}
                      onChange={(e) => setFormData((p) => ({ ...p, otherCharges: parseFloat(e.target.value) || 0 }))}
                      style={{ width: 100, padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                    />
                  </div>
                  <div
                    style={{
                      borderTop: "2px solid #cbd5e1",
                      paddingTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#0f172a"
                    }}
                  >
                    <span>Final Quotation Amount:</span>
                    <span style={{ color: "#2563eb", fontFamily: "monospace" }}>
                      ₹{calculateTotals(formData.items, formData.deliveryCharges, formData.otherCharges).finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 10,
                background: "#f8fafc"
              }}
            >
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveQuotation(false)}
                style={{
                  background: "#64748b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSaveQuotation(true)}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUOTATION FULL DETAILS & REVIEW WORKFLOW */}
      {/* ========================================================================= */}
      {isDetailsModalOpen && activeQuotationDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 960,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)"
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#0f172a",
                color: "#ffffff",
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  Quotation Details: {activeQuotationDetail.quotationNumber}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  Vendor: {activeQuotationDetail.vendorName} ({activeQuotationDetail.vendorCode})
                </div>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 20 }}>
              {/* Connection 1: Source PR Reference Banner with Clickable Jump */}
              {activeQuotationDetail.prNumber && (
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    padding: "10px 14px",
                    borderRadius: 6,
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <Sparkles size={15} color="#2563eb" />
                    <span style={{ color: "#1e40af", fontWeight: 700 }}>Source Purchase Requisition:</span>
                    <strong style={{ color: "#1d4ed8" }}>#{activeQuotationDetail.prNumber}</strong>
                  </div>
                  <button
                    onClick={() => {
                      setHandoff("SMS_SELECTED_PR_NUMBER", activeQuotationDetail.prNumber);
                      setIsDetailsModalOpen(false);
                      if (onNavigate) onNavigate("purchase-requisition");
                    }}
                    style={{
                      background: "#1d4ed8",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Open Source PR ➔
                  </button>
                </div>
              )}

              {/* Status & Highlights */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#f8fafc",
                  padding: "12px 16px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  marginBottom: 16
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Current Workflow Status:</div>
                  <div style={{ marginTop: 4 }}>
                    {getStatusBadge(activeQuotationDetail.status, activeQuotationDetail.validUntil)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Received Date:</div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{formatDisplayDate(activeQuotationDetail.quotationDate)}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Valid Until:</div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{activeQuotationDetail.validUntil}</div>
                  {(() => {
                    const exp = getExpiryInfo(activeQuotationDetail.validUntil);
                    if (!exp) return null;
                    return (
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: exp.color, marginTop: 2 }}>
                        {exp.text}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Payment Terms:</div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{activeQuotationDetail.paymentTerms}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Final Quotation Value:</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#2563eb", fontFamily: "monospace" }}>
                    ₹{Number(activeQuotationDetail.finalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Mandatory Generation & Approval Timestamps Audit Card */}
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
                  <strong style={{ color: "#334155", display: "block" }}>🕒 Quotation Generated / Recorded:</strong>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 12.5 }}>
                    {formatAuditDateTime(activeQuotationDetail.createdAt) || activeQuotationDetail.quotationDate || "Recorded"}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "#334155", display: "block" }}>👤 Created By:</strong>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    {activeQuotationDetail.createdBy || "Purchase Officer"}
                  </span>
                </div>

                {activeQuotationDetail.approvedAt || activeQuotationDetail.approvedBy ? (
                  <>
                    <div style={{ background: "#ecfdf5", padding: "6px 10px", borderRadius: 6, border: "1px solid #a7f3d0" }}>
                      <strong style={{ color: "#065f46", display: "block" }}>✓ Approval / Selection Timestamp:</strong>
                      <span style={{ fontWeight: 800, color: "#047857", fontSize: 12.5 }}>
                        {formatAuditDateTime(activeQuotationDetail.approvedAt) || activeQuotationDetail.approvedAt}
                      </span>
                    </div>
                    <div style={{ background: "#ecfdf5", padding: "6px 10px", borderRadius: 6, border: "1px solid #a7f3d0" }}>
                      <strong style={{ color: "#065f46", display: "block" }}>✓ Approved / Selected By:</strong>
                      <span style={{ fontWeight: 800, color: "#047857" }}>
                        {activeQuotationDetail.approvedBy || "HOD / General Manager (SCM)"}
                      </span>
                    </div>
                  </>
                ) : null}

                {activeQuotationDetail.updatedAt && (
                  <div>
                    <strong style={{ color: "#475569", display: "block" }}>🔄 Last Updated Timestamp:</strong>
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      {formatAuditDateTime(activeQuotationDetail.updatedAt) || activeQuotationDetail.updatedAt}
                    </span>
                  </div>
                )}
                {activeQuotationDetail.updatedBy && (
                  <div>
                    <strong style={{ color: "#475569", display: "block" }}>Last Updated By:</strong>
                    <span style={{ fontWeight: 600, color: "#334155" }}>{activeQuotationDetail.updatedBy}</span>
                  </div>
                )}
              </div>

              {/* Live Expiry / Validity Alert Banner */}
              {(() => {
                const exp = getExpiryInfo(activeQuotationDetail.validUntil);
                if (!exp) return null;
                if (exp.isExpired) {
                  return (
                    <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                      <AlertTriangle size={15} color="#dc2626" />
                      <span>This quotation expired on {activeQuotationDetail.validUntil} ({exp.text}). Vendor price re-validation or revision is required.</span>
                    </div>
                  );
                }
                if (exp.isExpiringSoon && activeQuotationDetail.status !== "Selected for Purchase" && activeQuotationDetail.status !== "Rejected") {
                  return (
                    <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                      <AlertTriangle size={15} color="#d97706" />
                      <span><strong>Expiring Soon ({exp.text}):</strong> Valid until {activeQuotationDetail.validUntil}. Evaluate and decide before rates expire.</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Justification if selected */}
              {activeQuotationDetail.selectionJustification && (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "10px 14px", borderRadius: 6, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#065f46" }}>SELECTION JUSTIFICATION:</div>
                  <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>{activeQuotationDetail.selectionJustification}</div>
                </div>
              )}

              {/* Items Table */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
                  Quoted Line Items ({activeQuotationDetail.items?.length || 0})
                </div>
                <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, ...vendorQuotationsPage5Resize.tableStyle }}>
                  <ResizableColGroup columns={VENDOR_QUOTATIONS_PAGE_5_COLUMNS} widths={vendorQuotationsPage5Resize.widths} />
                  <thead style={{ background: "#f1f5f9" }}>
                    <tr>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1" }}>Item Code<ColumnResizeHandle colKey="item_code" resize={vendorQuotationsPage5Resize} /></th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1" }}>Description<ColumnResizeHandle colKey="description" resize={vendorQuotationsPage5Resize} /></th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Qty<ColumnResizeHandle colKey="qty" resize={vendorQuotationsPage5Resize} /></th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Rate (₹)<ColumnResizeHandle colKey="rate" resize={vendorQuotationsPage5Resize} /></th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Disc (%)<ColumnResizeHandle colKey="disc" resize={vendorQuotationsPage5Resize} /></th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Tax (₹)<ColumnResizeHandle colKey="tax" resize={vendorQuotationsPage5Resize} /></th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Total (₹)<ColumnResizeHandle colKey="total" resize={vendorQuotationsPage5Resize} /></th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Eff. Cost (₹)<ColumnResizeHandle colKey="eff_cost" resize={vendorQuotationsPage5Resize} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQuotationDetail.items?.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 700 }}>{it.itemCode}</td>
                        <td style={{ padding: "6px 8px" }}>{it.itemDescription}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>{it.quotedQuantity} {it.uom}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>₹{Number(it.unitRate).toFixed(2)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>{it.discountPercent}%</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>₹{Number(it.taxAmount).toFixed(2)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>₹{Number(it.lineTotal).toFixed(2)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#2563eb" }}>₹{Number(it.effectiveUnitCost).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Review & Evaluation Actions */}
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
                  Quotation Evaluation Actions
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {activeQuotationDetail.status === "Draft" && (
                    <button
                      onClick={() => handleUpdateStatus("Submitted for Review")}
                      style={{ background: "#2563eb", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Submit for HOD Review
                    </button>
                  )}

                  {activeQuotationDetail.status === "Submitted for Review" && (
                    <button
                      onClick={() => handleUpdateStatus("Under Evaluation")}
                      style={{ background: "#d97706", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Mark Under Evaluation
                    </button>
                  )}

                  {activeQuotationDetail.status !== "Selected for Purchase" && (
                    <button
                      onClick={() => {
                        const isExpired = (activeQuotationDetail.status === "Expired") ||
                          (activeQuotationDetail.validUntil && new Date(activeQuotationDetail.validUntil + "T23:59:59") < new Date());
                        if (isExpired) {
                          alert("Quotation has expired and cannot be used for purchase processing.");
                          return;
                        }
                        setIsApproveModalOpen(true);
                      }}
                      style={{ background: "#059669", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      ✓ Select for Purchase Consideration
                    </button>
                  )}

                  {/* Connection 3 & 4: Process PO Proposal from Selected Quotation */}
                  {activeQuotationDetail.status === "Selected for Purchase" && (
                    <button
                      onClick={() => {
                        const isExpired = (activeQuotationDetail.status === "Expired") ||
                          (activeQuotationDetail.validUntil && new Date(activeQuotationDetail.validUntil + "T23:59:59") < new Date());
                        if (isExpired) {
                          alert("Quotation has expired and cannot be used for purchase processing.");
                          return;
                        }
                        setHandoff("SMS_SELECTED_QUOTATION_FOR_PO", JSON.stringify(activeQuotationDetail));
                        if (activeQuotationDetail.prNumber) {
                          setHandoff("SMS_SELECTED_PR_NUMBER", activeQuotationDetail.prNumber);
                        }
                        setIsDetailsModalOpen(false);
                        showToast(`Selected Quotation #${activeQuotationDetail.quotationNumber}. Opening Purchase Processing...`);
                        if (onNavigate) onNavigate("purchase-requisition");
                      }}
                      style={{
                        background: "#059669",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        padding: "7px 18px",
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)"
                      }}
                    >
                      <Sparkles size={14} />
                      <span>➔ Process Purchase Order from this Quotation</span>
                    </button>
                  )}

                  {activeQuotationDetail.status !== "Rejected" && (
                    <button
                      onClick={() => setIsRejectModalOpen(true)}
                      style={{ background: "#ef4444", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      ✕ Reject Quotation
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleCreateRevision(activeQuotationDetail.id);
                    }}
                    style={{ background: "#8b5cf6", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    + Create Revision
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "10px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                style={{ background: "#1e293b", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SELECT APPROVED PR FOR VENDOR RFQ                                  */}
      {/* ========================================================================= */}
      {isRfqPrPickerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 100010,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
          onClick={() => setIsRfqPrPickerOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 10,
              width: "100%",
              maxWidth: 760,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "14px 20px",
                background: "#0284c7",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Create RFQ from Approved Purchase Requisition</div>
                <div style={{ fontSize: 11.5, color: "#e0f2fe", marginTop: 2 }}>
                  Select an approved requisition to automatically populate items, quantities and UOMs
                </div>
              </div>
              <button
                onClick={() => setIsRfqPrPickerOpen(false)}
                style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
              {(() => {
                const prs = getApprovedPrsForPicker();
                if (prs.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                      <AlertTriangle size={32} color="#f59e0b" style={{ margin: "0 auto 10px" }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>No Approved Purchase Requisitions Found</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Approve pending PRs in the Purchase Requisition screen first, then return here to invite vendor quotations.
                      </div>
                    </div>
                  );
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {prs.map((pr) => (
                      <div
                        key={pr.id}
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          background: "#f8fafc",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <strong style={{ color: "#0284c7", fontSize: 13 }}>#{pr.pr_number}</strong>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "2px 7px",
                                borderRadius: 10,
                                background: pr.procurement_method === "Competitive Quotation" ? "#eff6ff" : "#f1f5f9",
                                color: pr.procurement_method === "Competitive Quotation" ? "#1d4ed8" : "#475569"
                              }}
                            >
                              {pr.procurement_method || "Competitive Quotation"}
                            </span>
                            <span style={{ fontSize: 11, color: "#64748b" }}>{pr.department}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>
                            {pr.purpose || pr.requirement_type || "Production batch"}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                            Items: {(pr.items || []).map((i) => `${i.item_code} (${i.remaining_qty || i.req_qty} ${i.uom})`).join(", ")}
                          </div>
                        </div>

                        <button
                          onClick={() => loadPrIntoRfqForm(pr)}
                          style={{
                            background: "#0284c7",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 6,
                            padding: "8px 16px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          Select &amp; Create RFQ ➔
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setIsRfqPrPickerOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "6px 16px",
                  fontSize: 12,
                  fontWeight: 600,
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
      {/* MODAL 3: APPROVE / SELECT JUSTIFICATION MODAL */}
      {/* ========================================================================= */}
      {isApproveModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#ffffff", borderRadius: 8, maxWidth: 500, width: "100%", padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#065f46", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={18} /> Select Quotation for Purchase
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
              Note: Approval of a quotation qualifies it for procurement consideration but does <strong>not</strong> automatically issue a Purchase Order.
            </div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Selection Justification (Mandatory if not lowest priced):
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Lowest compliant bidder / superior quality rating / fastest delivery schedule..."
              value={approvalJustification}
              onChange={(e) => setApprovalJustification(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setIsApproveModalOpen(false)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus("Selected for Purchase", approvalJustification)}
                style={{ background: "#059669", color: "#ffffff", border: "none", padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REJECT MODAL */}
      {/* ========================================================================= */}
      {isRejectModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#ffffff", borderRadius: 8, maxWidth: 500, width: "100%", padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#dc2626", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldAlert size={18} /> Reject Quotation
            </div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Rejection Reason:
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Price too high compared to market baseline / non-compliant delivery schedule..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus("Rejected", "", rejectReason)}
                style={{ background: "#dc2626", color: "#ffffff", border: "none", padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: COMMENTS / INTERNAL NOTES */}
      {/* ========================================================================= */}
      {isCommentsModalOpen && activeQuotationDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#ffffff", borderRadius: 8, maxWidth: 560, width: "100%", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                <MessageSquare size={16} color="#059669" /> Internal Team Notes: {activeQuotationDetail.quotationNumber}
              </div>
              <button onClick={() => setIsCommentsModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ maxHeight: 250, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {activeQuotationDetail.comments?.length > 0 ? (
                activeQuotationDetail.comments.map((c, i) => (
                  <div key={i} style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#475569" }}>
                      <span>{c.author}</span>
                      <span>{formatDisplayDate(c.createdAt || Date.now())}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#0f172a", marginTop: 3 }}>{c.comment}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: 20 }}>
                  No internal notes recorded yet.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Write an internal note..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
              />
              <button
                onClick={handleAddComment}
                style={{ background: "#059669", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: AUDIT TRAIL / REVISION HISTORY */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && activeQuotationDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#ffffff", borderRadius: 8, maxWidth: 600, width: "100%", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                <History size={16} color="#d97706" /> Audit History: {activeQuotationDetail.quotationNumber}
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {activeQuotationDetail.history?.length > 0 ? (
                activeQuotationDetail.history.map((h, i) => (
                  <div key={i} style={{ borderLeft: "3px solid #3b82f6", paddingLeft: 10, paddingBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#1e293b", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                        {h.action}
                      </span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>by {h.actionBy}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#334155", marginTop: 3 }}>{h.comments}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: 20 }}>
                  No audit history records available.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                style={{ background: "#1e293b", color: "#ffffff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: SIDE-BY-SIDE MATRIX COMPARISON */}
      {/* ========================================================================= */}
      {isSideBySideModalOpen && selectedVendorsForSideBySide.length >= 2 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#ffffff", borderRadius: 8, maxWidth: 950, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                Multi-Vendor Side-by-Side Comparison: {compareItemCode}
              </div>
              <button onClick={() => setIsSideBySideModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, ...vendorQuotationsPage6Resize.tableStyle }}>
                <ResizableColGroup columns={VENDOR_QUOTATIONS_PAGE_6_COLUMNS} widths={vendorQuotationsPage6Resize.widths} />
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px", borderBottom: "2px solid #cbd5e1", width: 180 }}>Criteria<ColumnResizeHandle colKey="criteria" resize={vendorQuotationsPage6Resize} /></th>
                    {selectedVendorsForSideBySide.map((v) => (
                      <th
                        key={v.quotationId}
                        style={{
                          padding: "10px",
                          borderBottom: "2px solid #cbd5e1",
                          textAlign: "center",
                          background: v.isLowestPrice ? "#ecfdf5" : "#ffffff"
                        }}
                      >
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{v.vendorName}</div>
                        <div style={{ fontSize: 11, color: "#2563eb" }}>{v.quotationNumber}</div>
                        {v.isLowestPrice && (
                          <span style={{ fontSize: 10, background: "#059669", color: "#ffffff", padding: "1px 6px", borderRadius: 10, marginTop: 4, display: "inline-block" }}>
                            ★ LOWEST PRICE
                          </span>
                        )}
                        <ColumnResizeHandle colKey="lowest_price" resize={vendorQuotationsPage6Resize} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Unit Rate", render: (v) => `₹${Number(v.unitRate).toFixed(2)}` },
                    { label: "Discount", render: (v) => `${v.discountPercent}%` },
                    { label: "GST / Tax Rate", render: (v) => `${v.taxPercent}% (${v.taxType})` },
                    { label: "Delivery Charges", render: (v) => `₹${Number(v.quotationDeliveryCharges || 0).toFixed(2)}` },
                    { label: "Effective Unit Cost", render: (v) => <strong style={{ color: "#2563eb" }}>₹{Number(v.effectiveUnitCost).toFixed(4)}</strong> },
                    { label: `Total for ${compareQuantity} Qty`, render: (v) => <strong style={{ color: "#0f172a" }}>₹{Number(v.calculatedTotalForRequestedQty).toLocaleString("en-IN")}</strong> },
                    { label: "Delivery Lead Time", render: (v) => v.deliveryTime },
                    { label: "Payment Terms", render: (v) => v.paymentTerms },
                    { label: "Quotation Validity", render: (v) => v.validUntil },
                    { label: "Price Difference", render: (v) => v.isLowestPrice ? "Baseline (0%)" : `+₹${Number(v.diffFromLowestPrice).toFixed(2)} (+${v.diffPercentFromLowest}%)` }
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#475569", background: "#f8fafc" }}>
                        {row.label}
                      </td>
                      {selectedVendorsForSideBySide.map((v) => (
                        <td
                          key={v.quotationId}
                          style={{
                            padding: "8px 10px",
                            textAlign: "center",
                            background: v.isLowestPrice ? "#f0fdf4" : "#ffffff"
                          }}
                        >
                          {row.render(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setIsSideBySideModalOpen(false)}
                style={{ background: "#1e293b", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 6,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            border: "1px solid #334155"
          }}
        >
          <Check size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
