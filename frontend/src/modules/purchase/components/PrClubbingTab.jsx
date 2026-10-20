import { formatDisplayDate, formatDisplayDateTime } from "../../../shared/utils/dateFormat";
import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Search,
  RefreshCw,
  Plus,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Eye,
  Trash2,
  X,
  Building,
  User,
  Calendar,
  Store,
  Tag,
  ShieldCheck,
  TrendingUp,
  Package
} from "lucide-react";

const PR_CLUBBING_TAB_1_COLUMNS = [
  { key: "select", width: 44, min: 32 },
  { key: "col1", width: 36 },
  { key: "item_code", width: 103 },
  { key: "item_description_categor", width: 200 },
  { key: "uom", width: 80 },
  { key: "combined_eligible_qty", width: 187 },
  { key: "source_prs", width: 110 },
  { key: "avg_est_rate", width: 131 },
  { key: "est_total", width: 110 },
  { key: "actions", width: 89 },
];

const PR_CLUBBING_TAB_2_COLUMNS = [
  { key: "pr_number", width: 103 },
  { key: "pr_date", width: 89 },
  { key: "dept_store", width: 124 },
  { key: "requester", width: 103 },
  { key: "priority", width: 96 },
  { key: "required_date", width: 131 },
  { key: "req_qty", width: 96 },
  { key: "ordered_qty", width: 117 },
  { key: "eligible_qty", width: 124 },
  { key: "est_rate", width: 103 },
  { key: "line_remarks", width: 124 },
];

const PR_CLUBBING_TAB_3_COLUMNS = [
  { key: "batch_number", width: 124 },
  { key: "batch_name_notes", width: 166 },
  { key: "status", width: 82 },
  { key: "items_count", width: 117 },
  { key: "total_clubbed_qty", width: 159 },
  { key: "purchased_qty", width: 131 },
  { key: "remaining_qty", width: 131 },
  { key: "created_by_date", width: 159 },
  { key: "actions", width: 89 },
];

const PR_CLUBBING_TAB_4_COLUMNS = [
  { key: "item_code", width: 103 },
  { key: "item_name", width: 103 },
  { key: "uom", width: 80 },
  { key: "max_eligible", width: 124 },
  { key: "batch_qty", width: 140 },
];

const PR_CLUBBING_TAB_5_COLUMNS = [
  { key: "item_code", width: 103 },
  { key: "item_name", width: 103 },
  { key: "uom", width: 80 },
  { key: "clubbed_qty", width: 117 },
  { key: "purchased_qty", width: 131 },
  { key: "remaining_qty", width: 131 },
  { key: "item_status", width: 117 },
];

const PR_CLUBBING_TAB_6_COLUMNS = [
  { key: "source_pr", width: 117 },
  { key: "item_code", width: 103 },
  { key: "allocated_qty", width: 131 },
  { key: "purchased_qty", width: 131 },
  { key: "remaining_qty", width: 131 },
  { key: "po_number", width: 103 },
  { key: "allocation_status", width: 159 },
];

export function PrClubbingTab({ dark = false, onNavigate, showToast }) {
  const prClubbingTab6Resize = useResizableColumns("pr-clubbing-tab-6", PR_CLUBBING_TAB_6_COLUMNS);
  const prClubbingTab5Resize = useResizableColumns("pr-clubbing-tab-5", PR_CLUBBING_TAB_5_COLUMNS);
  const prClubbingTab4Resize = useResizableColumns("pr-clubbing-tab-4", PR_CLUBBING_TAB_4_COLUMNS);
  const prClubbingTab3Resize = useResizableColumns("pr-clubbing-tab-3", PR_CLUBBING_TAB_3_COLUMNS);
  const prClubbingTab2Resize = useResizableColumns("pr-clubbing-tab-2", PR_CLUBBING_TAB_2_COLUMNS);
  const prClubbingTab1Resize = useResizableColumns("pr-clubbing-tab-1", PR_CLUBBING_TAB_1_COLUMNS);
  // Sub-tabs: "consolidated" (Eligible Requirements) | "batches" (Clubbing Batches)
  const [subTab, setSubTab] = useState("consolidated");

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [eligibleItems, setEligibleItems] = useState([]);
  const [batches, setBatches] = useState([]);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedUom, setSelectedUom] = useState("ALL");
  const [batchStatusFilter, setBatchStatusFilter] = useState("ALL");

  // Expanded accordion rows for item source PRs
  const [expandedItemKeys, setExpandedItemKeys] = useState(new Set());

  // Selected item keys for batch creation (composite key: itemCode + ":::" + uom)
  const [selectedItemKeys, setSelectedItemKeys] = useState(new Set());

  // Create Batch Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [batchFormData, setBatchFormData] = useState({
    batchName: "",
    notes: "",
    items: []
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Batch Detail Modal State
  const [selectedBatchDetail, setSelectedBatchDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch Eligible Consolidated Items
  const fetchEligibleItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:4000/api/purchase/clubbing/eligible-items");
      if (!res.ok) throw new Error("Failed to fetch eligible items");
      const data = await res.json();
      setEligibleItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching eligible items:", err);
      setError(err.message || "Failed to load eligible items");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Clubbing Batches
  const fetchBatches = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/purchase/clubbing/batches");
      if (!res.ok) throw new Error("Failed to fetch batches");
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  useEffect(() => {
    fetchEligibleItems();
    fetchBatches();
  }, []);

  const handleRefresh = () => {
    fetchEligibleItems();
    fetchBatches();
    if (showToast) showToast("Consolidation data refreshed!");
  };

  // Extract unique categories & UOMs for filter dropdowns
  const categoriesList = useMemo(() => {
    const set = new Set();
    eligibleItems.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [eligibleItems]);

  const uomList = useMemo(() => {
    const set = new Set();
    eligibleItems.forEach((it) => {
      if (it.uom) set.add(it.uom);
    });
    return Array.from(set);
  }, [eligibleItems]);

  // Filtered eligible items
  const filteredEligibleItems = useMemo(() => {
    return eligibleItems.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (item.itemCode || "").toLowerCase().includes(q);
        const nameMatch = (item.itemName || "").toLowerCase().includes(q);
        const descMatch = (item.description || "").toLowerCase().includes(q);
        const prMatch = (item.sourcePrNumbers || []).some((pr) => pr.toLowerCase().includes(q));
        if (!codeMatch && !nameMatch && !descMatch && !prMatch) return false;
      }
      // Category filter
      if (selectedCategory !== "ALL" && (item.category || "Unassigned") !== selectedCategory) {
        return false;
      }
      // UOM filter
      if (selectedUom !== "ALL" && item.uom !== selectedUom) {
        return false;
      }
      return true;
    });
  }, [eligibleItems, searchQuery, selectedCategory, selectedUom]);

  // Summary Metrics for Eligible Items
  const eligibleMetrics = useMemo(() => {
    const totalLines = eligibleItems.length;
    const totalQty = eligibleItems.reduce((acc, it) => acc + (Number(it.combinedEligibleQty) || 0), 0);
    const totalValue = eligibleItems.reduce((acc, it) => acc + (Number(it.totalEstAmount) || 0), 0);
    const distinctPrs = new Set();
    eligibleItems.forEach((it) => {
      (it.sourcePrNumbers || []).forEach((pr) => distinctPrs.add(pr));
    });
    return {
      totalLines,
      totalQty,
      totalValue,
      distinctPrCount: distinctPrs.size
    };
  }, [eligibleItems]);

  // Batch Summary Metrics
  const batchMetrics = useMemo(() => {
    const total = batches.length;
    const ready = batches.filter((b) => b.status === "READY_FOR_PURCHASE").length;
    const partially = batches.filter((b) => b.status === "PARTIALLY_PURCHASED").length;
    const fully = batches.filter((b) => b.status === "FULLY_PURCHASED").length;
    const draft = batches.filter((b) => b.status === "DRAFT").length;
    return { total, ready, partially, fully, draft };
  }, [batches]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (batchStatusFilter !== "ALL" && b.status !== batchStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = (b.batchNumber || "").toLowerCase().includes(q);
        const nameMatch = (b.batchName || "").toLowerCase().includes(q);
        const byMatch = (b.createdBy || "").toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !byMatch) return false;
      }
      return true;
    });
  }, [batches, batchStatusFilter, searchQuery]);

  // Toggle item row expansion
  const toggleExpandItem = (key) => {
    setExpandedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Toggle item selection
  const toggleSelectItem = (key) => {
    setSelectedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Select all / Deselect all
  const toggleSelectAll = () => {
    if (selectedItemKeys.size === filteredEligibleItems.length && filteredEligibleItems.length > 0) {
      setSelectedItemKeys(new Set());
    } else {
      const allKeys = new Set(filteredEligibleItems.map((it) => `${it.itemCode}:::${it.uom}`));
      setSelectedItemKeys(allKeys);
    }
  };

  // Open Create Batch Modal
  // Open Create Batch Modal
  const handleOpenCreateBatch = async () => {
    if (selectedItemKeys.size === 0) {
      alert("Please select at least one eligible item to create a clubbing batch.");
      return;
    }
    // Refresh to get latest eligible quantities from database
    let latestEligible = eligibleItems;
    try {
      const res = await fetch("http://localhost:4000/api/purchase/clubbing/eligible-items");
      if (res.ok) {
        const fresh = await res.json();
        if (Array.isArray(fresh)) {
          latestEligible = fresh;
          setEligibleItems(fresh);
        }
      }
    } catch (e) {
      // ignore
    }

    const selected = latestEligible.filter((it) => selectedItemKeys.has(`${it.itemCode}:::${it.uom}`));
    const dateStr = new Date().toISOString().slice(0, 10);
    setBatchFormData({
      batchName: `PR Batch - ${dateStr}`,
      notes: "Consolidated requirement from approved requisitions",
      items: selected.map((it) => ({
        itemCode: it.itemCode,
        itemName: it.itemName,
        description: it.description,
        category: it.category,
        uom: it.uom,
        maxEligibleQty: Number(it.combinedEligibleQty),
        requestedQty: Number(it.combinedEligibleQty),
        estRate: Number(it.avgEstRate) || 0,
        sourceAllocations: it.sourceAllocations || []
      }))
    });
    setIsCreateModalOpen(true);
  };

  // Direct "Purchase Now" for selected items (instant batch creation + handoff to PO)
  const handleDirectPurchaseNow = async (specificItem = null) => {
    let itemsToProcess = [];
    if (specificItem) {
      itemsToProcess = [specificItem];
    } else {
      if (selectedItemKeys.size === 0) {
        alert("Please select at least one item to purchase.");
        return;
      }
      itemsToProcess = eligibleItems.filter((it) => selectedItemKeys.has(`${it.itemCode}:::${it.uom}`));
    }

    if (itemsToProcess.length === 0) return;

    try {
      setLoading(true);
      // Create batch directly in READY_FOR_PURCHASE status
      const payload = {
        batchName: `Direct PO Batch - ${new Date().toISOString().slice(0, 10)}`,
        notes: `Immediate purchase handoff for ${itemsToProcess.length} consolidated item(s)`,
        createdBy: "Purchasing Officer",
        items: itemsToProcess.map((it) => ({
          itemCode: it.itemCode,
          itemName: it.itemName,
          description: it.description,
          category: it.category,
          uom: it.uom,
          clubbedQty: Number(it.combinedEligibleQty),
          requestedQty: Number(it.combinedEligibleQty),
          allocations: (it.sourceAllocations || []).map((sa) => ({
            prId: sa.prId,
            prNumber: sa.prNumber,
            prItemId: sa.prItemId,
            itemCode: sa.itemCode || it.itemCode,
            allocateQty: Number(sa.remainingQty)
          }))
        }))
      };

      const res = await fetch("http://localhost:4000/api/purchase/clubbing/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to create clubbing batch for PO");
      }

      const createdBatch = await res.json();

      // Retrieve handoff payload
      const handoffRes = await fetch(
        `http://localhost:4000/api/purchase/clubbing/batches/${createdBatch.id}/handoff`
      );
      if (!handoffRes.ok) throw new Error("Failed to generate PO handoff payload");
      const handoffData = await handoffRes.json();

      // Set session storage for PO Processing
      sessionStorage.setItem("SMS_SELECTED_PR_FOR_PO", JSON.stringify(handoffData));

      if (showToast) showToast(`Batch #${createdBatch.batchNumber} created! Redirecting to PO creation...`);

      // Navigate to PO Processing screen
      if (onNavigate) {
        onNavigate("purchase-processing");
      }
    } catch (err) {
      console.error("Direct purchase error:", err);
      alert(err.message || "Failed to initiate purchase for selected items");
    } finally {
      setLoading(false);
    }
  };

  // Submit Create Batch Form
  const handleSubmitCreateBatch = async (status = "READY_FOR_PURCHASE") => {
    if (!batchFormData.batchName.trim()) {
      alert("Please provide a Batch Name.");
      return;
    }
    for (const it of batchFormData.items) {
      if (!it.requestedQty || Number(it.requestedQty) <= 0) {
        alert(`Please specify a valid quantity greater than 0 for item "${it.itemName || it.itemCode}".`);
        return;
      }
      if (Number(it.requestedQty) > Number(it.maxEligibleQty)) {
        alert(`Requested quantity (${it.requestedQty}) exceeds eligible balance (${it.maxEligibleQty}) for "${it.itemCode}".`);
        return;
      }
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        batchName: batchFormData.batchName,
        notes: batchFormData.notes,
        createdBy: "Purchasing Officer",
        items: batchFormData.items.map((it) => ({
          itemCode: it.itemCode,
          itemName: it.itemName,
          description: it.description,
          category: it.category,
          uom: it.uom,
          clubbedQty: Number(it.requestedQty),
          requestedQty: Number(it.requestedQty),
          allocations: (it.sourceAllocations || []).map((sa) => ({
            prId: sa.prId,
            prNumber: sa.prNumber,
            prItemId: sa.prItemId,
            itemCode: sa.itemCode || it.itemCode,
            allocateQty: Number(sa.remainingQty)
          }))
        }))
      };

      const res = await fetch("http://localhost:4000/api/purchase/clubbing/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to create batch");
      }

      const created = await res.json();

      // If status requested is DRAFT, update status
      if (status === "DRAFT") {
        await fetch(`http://localhost:4000/api/purchase/clubbing/batches/${created.id}/status?status=DRAFT`, {
          method: "PUT"
        });
      }

      setIsCreateModalOpen(false);
      setSelectedItemKeys(new Set());
      fetchEligibleItems();
      fetchBatches();
      setSubTab("batches");
      if (showToast) showToast(`Clubbing Batch #${created.batchNumber} created successfully!`);
    } catch (err) {
      console.error("Error creating batch:", err);
      alert(err.message || "Failed to create clubbing batch");
      fetchEligibleItems();
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Batch "Purchase Now" Action
  const handleBatchPurchaseNow = async (batch) => {
    try {
      const res = await fetch(`http://localhost:4000/api/purchase/clubbing/batches/${batch.id}/handoff`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to prepare batch for PO");
      }
      const handoffData = await res.json();

      sessionStorage.setItem("SMS_SELECTED_PR_FOR_PO", JSON.stringify(handoffData));

      if (showToast) showToast(`Batch #${batch.batchNumber} ready! Opening Purchase Order screen...`);

      if (onNavigate) {
        onNavigate("purchase-processing");
      }
    } catch (err) {
      console.error("Purchase Now error:", err);
      alert(err.message || "Failed to initiate PO creation from this batch");
    }
  };

  // Open Batch Details Drawer / Modal
  const handleOpenBatchDetails = async (batchId) => {
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/purchase/clubbing/batches/${batchId}`);
      if (!res.ok) throw new Error("Failed to load batch details");
      const data = await res.json();
      setSelectedBatchDetail(data);
    } catch (err) {
      console.error("Error loading batch detail:", err);
      alert("Failed to load batch details");
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Cancel Batch (Releases locked PR quantities)
  const handleCancelBatch = async (batchId) => {
    if (!confirm("Are you sure you want to cancel this batch? Any unpurchased PR quantities will be released back to the eligible pool.")) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/purchase/clubbing/batches/${batchId}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to cancel batch");
      }
      fetchEligibleItems();
      fetchBatches();
      if (showToast) showToast("Clubbing batch cancelled successfully!");
    } catch (err) {
      console.error("Error cancelling batch:", err);
      alert(err.message || "Failed to cancel batch");
    }
  };

  // Format currency in Indian numbering format
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Render status badge
  const renderStatusBadge = (st) => {
    switch (st) {
      case "READY_FOR_PURCHASE":
        return (
          <span style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            Ready for Purchase
          </span>
        );
      case "PARTIALLY_PURCHASED":
        return (
          <span style={{ background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0284c7" }} />
            Partially Purchased
          </span>
        );
      case "FULLY_PURCHASED":
        return (
          <span style={{ background: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff", padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7" }} />
            Fully Purchased
          </span>
        );
      case "DRAFT":
        return (
          <span style={{ background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a", padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} />
            Draft
          </span>
        );
      case "CANCELLED":
        return (
          <span style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1", padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            Cancelled
          </span>
        );
      default:
        return <span>{st}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", background: "#f8fafc" }}>
      {/* ========================================================================= */}
      {/* 1. TOP SUB-NAV BAR: SWITCH BETWEEN CONSOLIDATION VIEW & BATCHES           */}
      {/* ========================================================================= */}
      <div
        style={{
          flexShrink: 0,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Sub-Tab 1: Consolidated Requirements */}
          <button
            onClick={() => setSubTab("consolidated")}
            style={{
              background: subTab === "consolidated" ? "#1e293b" : "#f1f5f9",
              color: subTab === "consolidated" ? "#ffffff" : "#475569",
              border: subTab === "consolidated" ? "none" : "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "7px 16px",
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
            <span>1. Consolidated Requirements</span>
            <span
              style={{
                background: subTab === "consolidated" ? "rgba(255,255,255,0.2)" : "#cbd5e1",
                color: subTab === "consolidated" ? "#ffffff" : "#1e293b",
                padding: "2px 7px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 800
              }}
            >
              {eligibleItems.length}
            </span>
          </button>

          {/* Sub-Tab 2: Clubbing Batches */}
          <button
            onClick={() => setSubTab("batches")}
            style={{
              background: subTab === "batches" ? "#1e293b" : "#f1f5f9",
              color: subTab === "batches" ? "#ffffff" : "#475569",
              border: subTab === "batches" ? "none" : "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "7px 16px",
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
            <span>2. Clubbing Batches</span>
            <span
              style={{
                background: subTab === "batches" ? "rgba(255,255,255,0.2)" : "#cbd5e1",
                color: subTab === "batches" ? "#ffffff" : "#1e293b",
                padding: "2px 7px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 800
              }}
            >
              {batches.length}
            </span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          {subTab === "consolidated" && (
            <>
              <button
                onClick={handleOpenCreateBatch}
                disabled={selectedItemKeys.size === 0}
                style={{
                  background: selectedItemKeys.size > 0 ? "#1e293b" : "#cbd5e1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: selectedItemKeys.size > 0 ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: selectedItemKeys.size > 0 ? "0 2px 4px rgba(30,41,59,0.2)" : "none"
                }}
              >
                <Plus size={14} />
                <span>Create Batch ({selectedItemKeys.size})</span>
              </button>

              <button
                onClick={() => handleDirectPurchaseNow(null)}
                disabled={selectedItemKeys.size === 0}
                style={{
                  background: selectedItemKeys.size > 0 ? "#0284c7" : "#cbd5e1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: selectedItemKeys.size > 0 ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: selectedItemKeys.size > 0 ? "0 2px 4px rgba(2,132,199,0.3)" : "none"
                }}
              >
                <ShoppingCart size={14} />
                <span>Purchase Now</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS SUMMARY CARDS                                                   */}
      {/* ========================================================================= */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        {subTab === "consolidated" ? (
          <>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Layers size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Eligible Items</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#0f172a" }}>{eligibleMetrics.totalLines}</div>
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Combined Quantity</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#059669" }}>{eligibleMetrics.totalQty.toLocaleString("en-IN")}</div>
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Source Requisitions</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#d97706" }}>{eligibleMetrics.distinctPrCount} PRs</div>
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f5f3ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Est. Total Value</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#7c3aed" }}>{formatCurrency(eligibleMetrics.totalValue)}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Package size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Batches</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#0f172a" }}>{batchMetrics.total}</div>
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Ready for PO</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#059669" }}>{batchMetrics.ready}</div>
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingCart size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>In Progress</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#0284c7" }}>{batchMetrics.partially}</div>
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#faf5ff", color: "#7e22ce", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Completed</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#7e22ce" }}>{batchMetrics.fully}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTER TOOLBAR                                               */}
      {/* ========================================================================= */}
      <div
        style={{
          flexShrink: 0,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
          {/* Search box */}
          <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder={subTab === "consolidated" ? "Search item code, description, source PR #..." : "Search batch number, name, created by..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                fontSize: 13,
                outline: "none"
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sub-tab 1 specific filters */}
          {subTab === "consolidated" && (
            <>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: "7px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, background: "#fff", outline: "none" }}
              >
                <option value="ALL">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={selectedUom}
                onChange={(e) => setSelectedUom(e.target.value)}
                style={{ padding: "7px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, background: "#fff", outline: "none" }}
              >
                <option value="ALL">All UOMs</option>
                {uomList.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </>
          )}

          {/* Sub-tab 2 specific status filter pills */}
          {subTab === "batches" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {["ALL", "READY_FOR_PURCHASE", "PARTIALLY_PURCHASED", "FULLY_PURCHASED", "DRAFT"].map((st) => (
                <button
                  key={st}
                  onClick={() => setBatchStatusFilter(st)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 14,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: batchStatusFilter === st ? "#1e293b" : "#f1f5f9",
                    color: batchStatusFilter === st ? "#ffffff" : "#475569"
                  }}
                >
                  {st === "ALL" ? "All Statuses" : st.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}
        </div>

        {subTab === "consolidated" && (
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            Showing <strong>{filteredEligibleItems.length}</strong> consolidated items ({selectedItemKeys.size} selected)
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA (TABLES & ACCORDIONS)                                */}
      {/* ========================================================================= */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 20px" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px auto", color: "#2563eb" }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Aggregating eligible approved PR line items...</div>
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c" }}>
            <AlertCircle size={32} style={{ margin: "0 auto 10px auto" }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>{error}</div>
            <button onClick={fetchEligibleItems} style={{ marginTop: 12, padding: "6px 14px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              Retry
            </button>
          </div>
        ) : subTab === "consolidated" ? (
          /* ===================================================================== */
          /* VIEW 1: CONSOLIDATED REQUIREMENTS TABLE                               */
          /* ===================================================================== */
          filteredEligibleItems.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#64748b" }}>
              <Layers size={40} style={{ margin: "0 auto 14px auto", color: "#94a3b8" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>No Eligible Requisitions Found</div>
              <p style={{ fontSize: 13, color: "#64748b", maxWidth: 450, margin: "6px auto 16px auto" }}>
                All approved PR items have already been purchased or locked in active batches, or there are no approved PRs pending procurement.
              </p>
              <button
                onClick={fetchEligibleItems}
                style={{ padding: "8px 18px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Refresh Requisitions
              </button>
            </div>
          ) : (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left", ...prClubbingTab1Resize.tableStyle }}>
                <ResizableColGroup columns={PR_CLUBBING_TAB_1_COLUMNS} widths={prClubbingTab1Resize.widths} />
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 700, fontSize: 12 }}>
                    <th style={{ width: 44, padding: "10px 12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedItemKeys.size === filteredEligibleItems.length && filteredEligibleItems.length > 0}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th style={{ width: 36, padding: "10px 4px", textAlign: "center" }}><ColumnResizeHandle colKey="col1" resize={prClubbingTab1Resize} /></th>
                    <th style={{ padding: "10px 14px" }}>Item Code<ColumnResizeHandle colKey="item_code" resize={prClubbingTab1Resize} /></th>
                    <th style={{ padding: "10px 14px" }}>Item Description & Category<ColumnResizeHandle colKey="item_description_categor" resize={prClubbingTab1Resize} /></th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>UOM<ColumnResizeHandle colKey="uom" resize={prClubbingTab1Resize} /></th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Combined Eligible Qty<ColumnResizeHandle colKey="combined_eligible_qty" resize={prClubbingTab1Resize} /></th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Source PRs<ColumnResizeHandle colKey="source_prs" resize={prClubbingTab1Resize} /></th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Avg. Est Rate<ColumnResizeHandle colKey="avg_est_rate" resize={prClubbingTab1Resize} /></th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Est. Total<ColumnResizeHandle colKey="est_total" resize={prClubbingTab1Resize} /></th>
                    <th style={{ padding: "10px 16px", textAlign: "center" }}>Actions<ColumnResizeHandle colKey="actions" resize={prClubbingTab1Resize} /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEligibleItems.map((item, idx) => {
                    const itemKey = `${item.itemCode}:::${item.uom}`;
                    const isExpanded = expandedItemKeys.has(itemKey);
                    const isSelected = selectedItemKeys.has(itemKey);

                    return (
                      <React.Fragment key={itemKey}>
                        <tr
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isSelected ? "#f0f9ff" : idx % 2 === 0 ? "#ffffff" : "#fafafa",
                            transition: "background 0.15s ease"
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(itemKey)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>

                          {/* Expand chevron */}
                          <td style={{ padding: "10px 4px", textAlign: "center" }}>
                            <button
                              onClick={() => toggleExpandItem(itemKey)}
                              title={isExpanded ? "Collapse source details" : "Expand source details"}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2, display: "inline-flex" }}
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>

                          {/* Item Code */}
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>
                            <div style={{ display: "inline-block", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>
                              {item.itemCode}
                            </div>
                          </td>

                          {/* Item Name & Category */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.itemName}</div>
                            {item.description && (
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{item.description}</div>
                            )}
                            {item.category && (
                              <span style={{ display: "inline-block", marginTop: 4, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>
                                {item.category}
                              </span>
                            )}
                          </td>

                          {/* UOM */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "3px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                              {item.uom}
                            </span>
                          </td>

                          {/* Combined Eligible Qty */}
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#059669" }}>
                              {Number(item.combinedEligibleQty).toLocaleString("en-IN")}
                            </div>
                          </td>

                          {/* Source PRs Badge & references */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <button
                              onClick={() => toggleExpandItem(itemKey)}
                              style={{
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                color: "#166534",
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4
                              }}
                            >
                              <span>{item.sourcePrCount} PR{item.sourcePrCount > 1 ? "s" : ""}</span>
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                              {(item.sourcePrNumbers || []).slice(0, 3).join(", ")}
                              {(item.sourcePrNumbers || []).length > 3 ? "..." : ""}
                            </div>
                          </td>

                          {/* Avg. Est Rate */}
                          <td style={{ padding: "10px 14px", textAlign: "right", color: "#475569" }}>
                            {formatCurrency(item.avgEstRate)}
                          </td>

                          {/* Est. Total Amount */}
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                            {formatCurrency(item.totalEstAmount)}
                          </td>

                          {/* Row Actions */}
                          <td style={{ padding: "10px 16px", textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <button
                                onClick={() => handleDirectPurchaseNow(item)}
                                title="Purchase Now: Handoff this consolidated item into PO Entry"
                                style={{
                                  background: "#0284c7",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: 5,
                                  padding: "5px 10px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                <ShoppingCart size={12} />
                                <span>Purchase</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ================================================================= */}
                        {/* EXPANDABLE ACCORDION: SOURCE PR BREAKDOWN TABLE                   */}
                        {/* ================================================================= */}
                        {isExpanded && (
                          <tr style={{ background: "#f8fafc" }}>
                            <td colSpan={10} style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
                              <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                                    <FileText size={15} style={{ color: "#2563eb" }} />
                                    <span>Contributing Approved Requisitions for {item.itemName} ({item.itemCode})</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: "#64748b" }}>
                                    All PR quantities verified eligible (remaining &gt; 0, approved status)
                                  </div>
                                </div>

                                <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, ...prClubbingTab2Resize.tableStyle }}>
                                  <ResizableColGroup columns={PR_CLUBBING_TAB_2_COLUMNS} widths={prClubbingTab2Resize.widths} />
                                  <thead>
                                    <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", color: "#475569", fontWeight: 700 }}>
                                      <th style={{ padding: "8px 10px", textAlign: "left" }}>PR Number<ColumnResizeHandle colKey="pr_number" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "left" }}>PR Date<ColumnResizeHandle colKey="pr_date" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Dept / Store<ColumnResizeHandle colKey="dept_store" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Requester<ColumnResizeHandle colKey="requester" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "center" }}>Priority<ColumnResizeHandle colKey="priority" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "center" }}>Required Date<ColumnResizeHandle colKey="required_date" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Req. Qty<ColumnResizeHandle colKey="req_qty" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Ordered Qty<ColumnResizeHandle colKey="ordered_qty" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "right", color: "#059669" }}>Eligible Qty<ColumnResizeHandle colKey="eligible_qty" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Est. Rate<ColumnResizeHandle colKey="est_rate" resize={prClubbingTab2Resize} /></th>
                                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Line Remarks<ColumnResizeHandle colKey="line_remarks" resize={prClubbingTab2Resize} /></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(item.sourceAllocations || []).map((alloc, aIdx) => (
                                      <tr key={aIdx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563eb" }}>
                                          {alloc.prNumber}
                                        </td>
                                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{formatDisplayDate(alloc.prDate) || "—"}</td>
                                        <td style={{ padding: "8px 10px" }}>
                                          <div>{alloc.department}</div>
                                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{alloc.store}</div>
                                        </td>
                                        <td style={{ padding: "8px 10px", color: "#334155" }}>{alloc.requisitioner}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                          <span
                                            style={{
                                              padding: "2px 7px",
                                              borderRadius: 10,
                                              fontSize: 10,
                                              fontWeight: 700,
                                              background: alloc.priority === "Urgent" ? "#fef2f2" : alloc.priority === "High" ? "#fffbeb" : "#f1f5f9",
                                              color: alloc.priority === "Urgent" ? "#b91c1c" : alloc.priority === "High" ? "#b45309" : "#475569"
                                            }}
                                          >
                                            {alloc.priority || "Normal"}
                                          </span>
                                        </td>
                                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748b" }}>{formatDisplayDate(alloc.requiredDate) || "—"}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{alloc.reqQty}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#94a3b8" }}>{alloc.orderedQty}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#059669" }}>
                                          {alloc.remainingQty} {item.uom}
                                        </td>
                                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#475569" }}>
                                          {formatCurrency(alloc.estRate)}
                                        </td>
                                        <td style={{ padding: "8px 10px", color: "#64748b", fontStyle: "italic", maxWidth: 160 }}>
                                          {alloc.remarks || "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ===================================================================== */
          /* VIEW 2: CLUBBING BATCHES LIST                                         */
          /* ===================================================================== */
          filteredBatches.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#64748b" }}>
              <Package size={40} style={{ margin: "0 auto 14px auto", color: "#94a3b8" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>No Clubbing Batches Created Yet</div>
              <p style={{ fontSize: 13, color: "#64748b", maxWidth: 450, margin: "6px auto 16px auto" }}>
                Select items from the "Consolidated Requirements" tab and click "+ Create Batch" to form batches for purchasing.
              </p>
              <button
                onClick={() => setSubTab("consolidated")}
                style={{ padding: "8px 18px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Go to Consolidated Requirements
              </button>
            </div>
          ) : (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left", ...prClubbingTab3Resize.tableStyle }}>
                <ResizableColGroup columns={PR_CLUBBING_TAB_3_COLUMNS} widths={prClubbingTab3Resize.widths} />
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 700, fontSize: 12 }}>
                    <th style={{ padding: "10px 16px" }}>Batch Number<ColumnResizeHandle colKey="batch_number" resize={prClubbingTab3Resize} /></th>
                    <th style={{ padding: "10px 16px" }}>Batch Name & Notes<ColumnResizeHandle colKey="batch_name_notes" resize={prClubbingTab3Resize} /></th>
                    <th style={{ padding: "10px 16px", textAlign: "center" }}>Status<ColumnResizeHandle colKey="status" resize={prClubbingTab3Resize} /></th>
                    <th style={{ padding: "10px 16px", textAlign: "center" }}>Items Count<ColumnResizeHandle colKey="items_count" resize={prClubbingTab3Resize} /></th>
                    <th style={{ padding: "10px 16px", textAlign: "right" }}>Total Clubbed Qty<ColumnResizeHandle colKey="total_clubbed_qty" resize={prClubbingTab3Resize} /></th>
                    <th style={{ padding: "10px 16px", textAlign: "right" }}>Purchased Qty<ColumnResizeHandle colKey="purchased_qty" resize={prClubbingTab3Resize} /></th>
                    <th style={{ padding: "10px 16px", textAlign: "right" }}>Remaining Qty<ColumnResizeHandle colKey="remaining_qty" resize={prClubbingTab3Resize} /></th>
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>Created By & Date<ColumnResizeHandle colKey="created_by_date" resize={prClubbingTab3Resize} /></th>
                    <th style={{ padding: "10px 16px", textAlign: "center" }}>Actions<ColumnResizeHandle colKey="actions" resize={prClubbingTab3Resize} /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch, bIdx) => (
                    <tr
                      key={batch.id || bIdx}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: bIdx % 2 === 0 ? "#ffffff" : "#fafafa",
                        transition: "background 0.15s ease"
                      }}
                    >
                      <td style={{ padding: "10px 16px", fontWeight: 800, color: "#1e293b" }}>
                        <div style={{ display: "inline-block", background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>
                          {batch.batchNumber}
                        </div>
                      </td>

                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{batch.batchName}</div>
                        {batch.notes && (
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{batch.notes}</div>
                        )}
                      </td>

                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        {renderStatusBadge(batch.status)}
                      </td>

                      <td style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                        {batch.totalItemsCount}
                      </td>

                      <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700 }}>
                        {Number(batch.totalClubbedQty).toLocaleString("en-IN")}
                      </td>

                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#0284c7", fontWeight: 700 }}>
                        {Number(batch.purchasedQty || 0).toLocaleString("en-IN")}
                      </td>

                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#059669", fontWeight: 800 }}>
                        {Number(batch.remainingQty || batch.totalClubbedQty).toLocaleString("en-IN")}
                      </td>

                      <td style={{ padding: "10px 16px", color: "#64748b" }}>
                        <div style={{ fontWeight: 600, color: "#334155" }}>{batch.createdBy}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{batch.createdAt ? formatDisplayDate(batch.createdAt) : "—"}</div>
                      </td>

                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {/* Purchase Now Action */}
                          {(batch.status === "READY_FOR_PURCHASE" || batch.status === "PARTIALLY_PURCHASED") && (
                            <button
                              onClick={() => handleBatchPurchaseNow(batch)}
                              title="Purchase Now: Handoff this batch directly to PO Processing"
                              style={{
                                background: "#0284c7",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: 5,
                                padding: "5px 11px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4
                              }}
                            >
                              <ShoppingCart size={12} />
                              <span>Purchase Now</span>
                            </button>
                          )}

                          {/* View Specs & Allocations */}
                          <button
                            onClick={() => handleOpenBatchDetails(batch.id)}
                            title="View batch breakdown & source allocations"
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#334155",
                              borderRadius: 5,
                              padding: "5px 9px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>

                          {/* Cancel Batch if not fully purchased */}
                          {batch.status !== "FULLY_PURCHASED" && batch.status !== "CANCELLED" && (
                            <button
                              onClick={() => handleCancelBatch(batch.id)}
                              title="Cancel batch and release PR quantities"
                              style={{
                                background: "#ffffff",
                                border: "1px solid #fca5a5",
                                color: "#dc2626",
                                borderRadius: 5,
                                padding: "5px 8px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL: CREATE CLUBBING BATCH                                           */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: "100%",
              maxWidth: 780,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
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
                justifyContent: "space-between",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1e293b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Create PR Clubbing Batch</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Consolidate {batchFormData.items.length} selected item requirements</div>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Batch Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={batchFormData.batchName}
                    onChange={(e) => setBatchFormData({ ...batchFormData, batchName: e.target.value })}
                    placeholder="e.g. Raw Material Batch Q4"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Internal Procurement Notes
                  </label>
                  <input
                    type="text"
                    value={batchFormData.notes}
                    onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                    placeholder="e.g. Clubbed for volume discount negotiation"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
                Selected Items & Quantities to Club:
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left", ...prClubbingTab4Resize.tableStyle }}>
                  <ResizableColGroup columns={PR_CLUBBING_TAB_4_COLUMNS} widths={prClubbingTab4Resize.widths} />
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#475569", fontWeight: 700 }}>
                      <th style={{ padding: "8px 12px" }}>Item Code<ColumnResizeHandle colKey="item_code" resize={prClubbingTab4Resize} /></th>
                      <th style={{ padding: "8px 12px" }}>Item Name<ColumnResizeHandle colKey="item_name" resize={prClubbingTab4Resize} /></th>
                      <th style={{ padding: "8px 12px", textAlign: "center" }}>UOM<ColumnResizeHandle colKey="uom" resize={prClubbingTab4Resize} /></th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Max Eligible<ColumnResizeHandle colKey="max_eligible" resize={prClubbingTab4Resize} /></th>
                      <th style={{ padding: "8px 12px", textAlign: "right", width: 140 }}>Batch Qty<ColumnResizeHandle colKey="batch_qty" resize={prClubbingTab4Resize} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchFormData.items.map((it, idx) => (
                      <tr key={it.itemCode} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e293b" }}>{it.itemCode}</td>
                        <td style={{ padding: "8px 12px" }}>{it.itemName}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                            {it.uom}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#059669", fontWeight: 700 }}>
                          {it.maxEligibleQty}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <input
                            type="number"
                            min="1"
                            max={it.maxEligibleQty}
                            value={it.requestedQty}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...batchFormData.items];
                              updated[idx].requestedQty = val;
                              setBatchFormData({ ...batchFormData, items: updated });
                            }}
                            style={{
                              width: 100,
                              padding: "4px 8px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 4,
                              textAlign: "right",
                              fontSize: 12,
                              fontWeight: 700,
                              outline: "none"
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 22px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc"
              }}
            >
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => handleSubmitCreateBatch("DRAFT")}
                  disabled={createSubmitting}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Save as Draft
                </button>

                <button
                  onClick={() => handleSubmitCreateBatch("READY_FOR_PURCHASE")}
                  disabled={createSubmitting}
                  style={{ background: "#1e293b", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {createSubmitting ? "Creating..." : "Create & Ready for Purchase"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL / DRAWER: BATCH BREAKDOWN DETAILS & ALLOCATION AUDIT              */}
      {/* ========================================================================= */}
      {isDetailModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: "100%",
              maxWidth: 900,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              overflow: "hidden"
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    Batch Specs: {selectedBatchDetail?.batchNumber || "Loading..."}
                  </div>
                  {selectedBatchDetail && renderStatusBadge(selectedBatchDetail.status)}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {selectedBatchDetail?.batchName} • Created by {selectedBatchDetail?.createdBy}
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 22 }}>
              {detailLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px auto" }} />
                  <div>Loading batch audit breakdown...</div>
                </div>
              ) : selectedBatchDetail ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Items list */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
                      Consolidated Batch Items
                    </div>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                      <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, ...prClubbingTab5Resize.tableStyle }}>
                        <ResizableColGroup columns={PR_CLUBBING_TAB_5_COLUMNS} widths={prClubbingTab5Resize.widths} />
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#475569", fontWeight: 700 }}>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Item Code<ColumnResizeHandle colKey="item_code" resize={prClubbingTab5Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Item Name<ColumnResizeHandle colKey="item_name" resize={prClubbingTab5Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>UOM<ColumnResizeHandle colKey="uom" resize={prClubbingTab5Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Clubbed Qty<ColumnResizeHandle colKey="clubbed_qty" resize={prClubbingTab5Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Purchased Qty<ColumnResizeHandle colKey="purchased_qty" resize={prClubbingTab5Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Remaining Qty<ColumnResizeHandle colKey="remaining_qty" resize={prClubbingTab5Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Item Status<ColumnResizeHandle colKey="item_status" resize={prClubbingTab5Resize} /></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedBatchDetail.items || []).map((it) => (
                            <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e293b" }}>{it.itemCode}</td>
                              <td style={{ padding: "8px 12px" }}>{it.itemName}</td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                                  {it.uom}
                                </span>
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{it.totalClubbedQty}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#0284c7" }}>{it.purchasedQty || 0}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#059669", fontWeight: 800 }}>{it.remainingQty}</td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                <span style={{ padding: "2px 6px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "#f1f5f9" }}>
                                  {it.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Allocation Audit Table */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
                      Source PR Line Allocations Audit Trail
                    </div>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                      <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, ...prClubbingTab6Resize.tableStyle }}>
                        <ResizableColGroup columns={PR_CLUBBING_TAB_6_COLUMNS} widths={prClubbingTab6Resize.widths} />
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#475569", fontWeight: 700 }}>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Source PR #<ColumnResizeHandle colKey="source_pr" resize={prClubbingTab6Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Item Code<ColumnResizeHandle colKey="item_code" resize={prClubbingTab6Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Allocated Qty<ColumnResizeHandle colKey="allocated_qty" resize={prClubbingTab6Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Purchased Qty<ColumnResizeHandle colKey="purchased_qty" resize={prClubbingTab6Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Remaining Qty<ColumnResizeHandle colKey="remaining_qty" resize={prClubbingTab6Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>PO Number<ColumnResizeHandle colKey="po_number" resize={prClubbingTab6Resize} /></th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Allocation Status<ColumnResizeHandle colKey="allocation_status" resize={prClubbingTab6Resize} /></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedBatchDetail.allocations || []).map((al) => (
                            <tr key={al.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 700, color: "#2563eb" }}>{al.prNumber}</td>
                              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{al.itemCode}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{al.allocatedQty}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#0284c7" }}>{al.purchasedQty || 0}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#059669", fontWeight: 800 }}>{al.remainingQty}</td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                {al.poNumber ? (
                                  <span style={{ fontWeight: 700, color: "#0284c7" }}>{al.poNumber}</span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>Pending PO</span>
                                )}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: al.status === "PURCHASED" ? "#ecfdf5" : "#f1f5f9", color: al.status === "PURCHASED" ? "#059669" : "#475569" }}>
                                  {al.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc"
              }}
            >
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Close
              </button>

              {selectedBatchDetail && (selectedBatchDetail.status === "READY_FOR_PURCHASE" || selectedBatchDetail.status === "PARTIALLY_PURCHASED") && (
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleBatchPurchaseNow(selectedBatchDetail);
                  }}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "7px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <ShoppingCart size={14} />
                  <span>Purchase Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
