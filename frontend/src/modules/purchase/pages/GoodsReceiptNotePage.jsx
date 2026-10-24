import { formatDisplayDate, formatDisplayDateTime } from "../../../shared/utils/dateFormat";
import DateInput from "../../../shared/components/DateInput";
import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import React, { useState, useEffect, useMemo } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Standard audit date/time formatter
function formatAuditDateTime(val) {
  if (!val) return "Not Recorded";
  return formatDisplayDateTime(val);
}

const GOODS_RECEIPT_NOTE_PAGE_1_COLUMNS = [
  { key: "po_number", width: 103 },
  { key: "date", width: 80 },
  { key: "vendor", width: 82 },
  { key: "department", width: 110 },
  { key: "ordered", width: 89 },
  { key: "received", width: 96 },
  { key: "balance_due", width: 117 },
  { key: "status", width: 82 },
  { key: "action", width: 82 },
];

const GOODS_RECEIPT_NOTE_PAGE_2_COLUMNS = [
  { key: "grn_number", width: 110 },
  { key: "grn_date", width: 96 },
  { key: "po_ref", width: 82 },
  { key: "vendor", width: 82 },
  { key: "challan_no_amp_date", width: 187 },
  { key: "received", width: 96 },
  { key: "accepted", width: 96 },
  { key: "rejected", width: 96 },
  { key: "store", width: 80 },
  { key: "status", width: 82 },
  { key: "actions", width: 89 },
];

const GOODS_RECEIPT_NOTE_PAGE_3_COLUMNS = [
  { key: "item_code", width: 150 },
  { key: "description", width: 170 },
  { key: "po_qty", width: 70 },
  { key: "po_balance", width: 80 },
  { key: "challan", width: 85 },
  { key: "received", width: 85 },
  { key: "accepted", width: 85 },
  { key: "rejected", width: 75 },
  { key: "rejection_reason", width: 130 },
  { key: "bin", width: 80 },
  { key: "accepted_value", width: 90 },
  { key: "col11", width: 40 },
];

export function GoodsReceiptNotePage({ dark = false, onBackToHome, onNavigate, onOpenSidebar, sidebarOpen }) {
  const goodsReceiptNotePage3Resize = useResizableColumns("goods-receipt-note-page-3", GOODS_RECEIPT_NOTE_PAGE_3_COLUMNS);
  const goodsReceiptNotePage2Resize = useResizableColumns("goods-receipt-note-page-2", GOODS_RECEIPT_NOTE_PAGE_2_COLUMNS);
  const goodsReceiptNotePage1Resize = useResizableColumns("goods-receipt-note-page-1", GOODS_RECEIPT_NOTE_PAGE_1_COLUMNS);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "register"
  const [loading, setLoading] = useState(false);
  const [pendingPos, setPendingPos] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");

  // Modal states
  const [inwardModalOpen, setInwardModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  // PO from the pending list opened read-only, before a GRN is created against it
  const [poViewTarget, setPoViewTarget] = useState(null);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Inward Form State
  const [selectedPo, setSelectedPo] = useState(null);
  const [formGrnNumber, setFormGrnNumber] = useState("");
  const [formGrnDate, setFormGrnDate] = useState(new Date().toISOString().split("T")[0]);
  const [formChallanNo, setFormChallanNo] = useState("");
  const [formChallanDate, setFormChallanDate] = useState(new Date().toISOString().split("T")[0]);
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formInvoiceDate, setFormInvoiceDate] = useState("");
  const [formTransporter, setFormTransporter] = useState("");
  const [formVehicleNo, setFormVehicleNo] = useState("");
  const [formStoreLocation, setFormStoreLocation] = useState("Raw Material Store, Silvassa");
  const [formReceivedBy, setFormReceivedBy] = useState("Store Inward Officer");
  const [formInspectedBy, setFormInspectedBy] = useState("Quality Control Inspector");
  const [formRemarks, setFormRemarks] = useState("");
  const [formItems, setFormItems] = useState([]);
  const [poDeliverySchedules, setPoDeliverySchedules] = useState([]);
  const [selectedLotNumber, setSelectedLotNumber] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Fetch pending POs from backend
  const fetchPendingPos = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/grn/pending-pos`);
      if (res.ok) {
        const data = await res.json();
        setPendingPos(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load pending POs:", e);
    }
  };

  // Fetch all GRNs from backend
  const fetchGrns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/grn`);
      if (res.ok) {
        const data = await res.json();
        setGrnList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load GRNs:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch store/departments master
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/inventory/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load departments:", e);
    }
  };

  useEffect(() => {
    fetchPendingPos();
    fetchGrns();
    fetchDepartments();
  }, []);

  // Handle ESC key to return to software from any open modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (viewModalOpen) setViewModalOpen(false);
        if (inwardModalOpen) setInwardModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewModalOpen, inwardModalOpen]);

  const handlePrintGrn = () => {
    const originalTitle = document.title;
    document.title = `GRN_Voucher_${selectedGrn?.grnNumber || "Document"}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Fetch next suggested GRN number when opening modal
  const fetchNextNumber = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/grn/next-number`);
      if (res.ok) {
        const data = await res.json();
        setFormGrnNumber(data.grnNumber || "");
      }
    } catch (e) {
      setFormGrnNumber("GRN-2026-00001");
    }
  };

  // Open Inward Form for a specific PO
  const handleOpenInwardForPo = async (po) => {
    setSelectedPo(po);
    await fetchNextNumber();
    setFormGrnDate(new Date().toISOString().split("T")[0]);
    setFormChallanNo("");
    setFormChallanDate(new Date().toISOString().split("T")[0]);
    setFormInvoiceNo("");
    setFormInvoiceDate("");
    setFormTransporter("");
    setFormVehicleNo("");
    setFormStoreLocation(po.deliveryLocation || "Raw Material Store, Silvassa");
    setFormReceivedBy("Store Inward Officer");
    setFormInspectedBy("Quality Control Inspector");
    setFormRemarks(`Material received against PO #${po.poNumber}`);

    // Map PO items to GRN items with balance as default received
    const lines = (po.items || []).map((it) => {
      const bal = Number(it.balanceQty !== undefined ? it.balanceQty : it.orderedQty) || 0;
      return {
        itemCode: it.itemCode,
        itemName: it.itemName,
        description: it.description || "",
        category: it.category || "RAW_MATERIAL",
        uom: it.uom || "PCS",
        poOrderedQty: Number(it.orderedQty) || 0,
        priorReceivedQty: Number(it.receivedQty) || 0,
        balanceExpectedQty: bal,
        challanQty: bal,
        receivedQty: bal,
        acceptedQty: bal,
        rejectedQty: 0,
        pendingInspectionQty: 0,
        rejectionReason: "",
        storageBin: "BIN-A1",
        unitRate: Number(it.unitRate) || 0,
        taxPercent: Number(it.taxPercent) || 18,
        itemTotal: (Number(it.unitRate) || 0) * bal,
        remarks: ""
      };
    });

    setFormItems(lines);
    setSelectedLotNumber(null);

    // Fetch delivery schedules if this is a planned / scheduled PO
    try {
      const schedRes = await fetch(`${BASE_URL}/api/purchase/orders/${encodeURIComponent(po.poNumber)}/schedules`);
      if (schedRes.ok) {
        const schedData = await schedRes.json();
        setPoDeliverySchedules(Array.isArray(schedData) ? schedData : []);
      } else {
        setPoDeliverySchedules([]);
      }
    } catch (e) {
      setPoDeliverySchedules([]);
    }

    setInwardModalOpen(true);
  };

  // Handler for selecting a specific delivery lot / consignment to inward
  const handleSelectDeliveryLot = (selectionKey) => {
    setSelectedLotNumber(selectionKey);
    if (!selectedPo) return;

    if (!selectionKey || selectionKey === "ALL") {
      // Revert to full PO items
      const lines = (selectedPo.items || []).map((it) => {
        const bal = Number(it.balanceQty !== undefined ? it.balanceQty : it.orderedQty) || 0;
        return {
          itemCode: it.itemCode,
          itemName: it.itemName,
          description: it.description || "",
          category: it.category || "RAW_MATERIAL",
          uom: it.uom || "PCS",
          poOrderedQty: Number(it.orderedQty) || 0,
          priorReceivedQty: Number(it.receivedQty) || 0,
          balanceExpectedQty: bal,
          challanQty: bal,
          receivedQty: bal,
          acceptedQty: bal,
          rejectedQty: 0,
          pendingInspectionQty: 0,
          rejectionReason: "",
          storageBin: "BIN-A1",
          unitRate: Number(it.unitRate) || 0,
          taxPercent: Number(it.taxPercent) || 18,
          itemTotal: (Number(it.unitRate) || 0) * bal,
          remarks: ""
        };
      });
      setFormItems(lines);
      return;
    }

    let lotSchedules = [];
    if (String(selectionKey).startsWith("DATE_")) {
      const targetDate = String(selectionKey).replace("DATE_", "");
      lotSchedules = poDeliverySchedules.filter((s) => s.scheduledDate === targetDate);
    } else if (String(selectionKey).startsWith("SCHED_")) {
      const schedId = Number(String(selectionKey).replace("SCHED_", ""));
      lotSchedules = poDeliverySchedules.filter((s) => s.id === schedId);
    } else {
      lotSchedules = poDeliverySchedules.filter((s) => String(s.id) === String(selectionKey) || s.lotNumber === Number(selectionKey));
    }

    // Populate lines specifically for selected schedule(s)
    const lines = lotSchedules.map((ls) => {
      const origItem = (selectedPo.items || []).find((it) => it.itemCode === ls.itemCode) || {};
      const bal = Number(ls.balanceQty !== undefined ? ls.balanceQty : ls.scheduledQty) || 0;
      return {
        scheduleId: ls.id,
        lotNumber: ls.lotNumber,
        scheduledDate: ls.scheduledDate,
        itemCode: ls.itemCode,
        itemName: origItem.itemName || ls.itemCode,
        description: origItem.description || "",
        category: origItem.category || "RAW_MATERIAL",
        uom: origItem.uom || "PCS",
        poOrderedQty: Number(ls.scheduledQty) || 0,
        priorReceivedQty: Number(ls.receivedQty) || 0,
        balanceExpectedQty: bal,
        challanQty: bal,
        receivedQty: bal,
        acceptedQty: bal,
        rejectedQty: 0,
        pendingInspectionQty: 0,
        rejectionReason: "",
        storageBin: "BIN-A1",
        unitRate: Number(origItem.unitRate) || 0,
        taxPercent: Number(origItem.taxPercent) || 18,
        itemTotal: (Number(origItem.unitRate) || 0) * bal,
        remarks: `Inward for Lot #${ls.lotNumber} (Due: ${formatDisplayDate(ls.scheduledDate)})`
      };
    });
    setFormItems(lines);
    if (lotSchedules.length > 0 && lotSchedules[0].destinationStore) {
      setFormStoreLocation(lotSchedules[0].destinationStore);
    }
  };

  // Handle item change in Inward Grid
  const handleItemFieldChange = (idx, field, value) => {
    setFormItems((prev) => {
      const next = [...prev];
      const it = { ...next[idx] };

      if (["challanQty", "receivedQty", "acceptedQty", "rejectedQty", "pendingInspectionQty"].includes(field)) {
        const numVal = Math.max(0, Number(value) || 0);
        it[field] = numVal;

        if (field === "acceptedQty" || field === "rejectedQty" || field === "pendingInspectionQty") {
          // Keep receivedQty synchronized: Received = Accepted + Rejected + Pending
          const acc = field === "acceptedQty" ? numVal : (it.acceptedQty || 0);
          const rej = field === "rejectedQty" ? numVal : (it.rejectedQty || 0);
          const pend = field === "pendingInspectionQty" ? numVal : (it.pendingInspectionQty || 0);
          it.receivedQty = acc + rej + pend;
        } else if (field === "receivedQty") {
          // If receivedQty changed directly, allocate to acceptedQty by default if no rejected
          it.acceptedQty = Math.max(0, numVal - (it.rejectedQty || 0) - (it.pendingInspectionQty || 0));
        }

        it.itemTotal = (it.acceptedQty || 0) * (it.unitRate || 0);
      } else {
        it[field] = value;
      }

      next[idx] = it;
      return next;
    });
  };

  // Submit Inward Form (Draft or Post)
  const handleSubmitGrn = async (isPost) => {
    if (!formChallanNo.trim()) {
      alert("Vendor Challan Number is mandatory.");
      return;
    }
    if (!formStoreLocation.trim()) {
      alert("Store Location is mandatory.");
      return;
    }
    if (!formReceivedBy.trim()) {
      alert("Received By (personnel name) is mandatory.");
      return;
    }
    if (formItems.length === 0) {
      alert("No line items to receive.");
      return;
    }

    // Over-receipt validation
    if (isPost) {
      for (const it of formItems) {
        // Only accepted goods fulfil the PO, so the balance check uses accepted quantity (rejected goods do not consume it).
        if (Number(it.acceptedQty) > Number(it.balanceExpectedQty)) {
          alert(`Accepted quantity (${it.acceptedQty}) for item '${it.itemCode}' exceeds the PO balance (${it.balanceExpectedQty} PCS). Over-acceptance is blocked.`);
          return;
        }
        if (it.rejectedQty > 0 && !it.rejectionReason) {
          alert(`Please select a rejection reason for rejected units of '${it.itemCode}'.`);
          return;
        }
      }
    }

    const payload = {
      grnNumber: formGrnNumber,
      grnDate: formGrnDate,
      poNumber: selectedPo.poNumber,
      poDate: selectedPo.poDate,
      prNumber: selectedPo.prNumber,
      vendorCode: selectedPo.vendorCode,
      vendorName: selectedPo.vendorName,
      vendorGstin: selectedPo.vendorGstin,
      vendorChallanNo: formChallanNo.trim(),
      vendorChallanDate: formChallanDate || null,
      vendorInvoiceNo: formInvoiceNo.trim() || null,
      vendorInvoiceDate: formInvoiceDate || null,
      transporterName: formTransporter.trim() || null,
      vehicleNumber: formVehicleNo.trim() || null,
      storeLocation: formStoreLocation.trim(),
      receivedBy: formReceivedBy.trim(),
      inspectedBy: formInspectedBy.trim() || null,
      remarks: formRemarks.trim() || null,
      items: formItems
    };

    setActionInProgress(true);
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/grn?post=${isPost}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save GRN");
        return;
      }

      const saved = await res.json();

      // If inwarding against specific delivery lot(s), record receipt in backend lot schedule
      if (poDeliverySchedules.length > 0) {
        for (const it of formItems) {
          if (it.lotNumber !== undefined && it.lotNumber !== null) {
            try {
              await fetch(`${BASE_URL}/api/purchase/orders/${encodeURIComponent(selectedPo.poNumber)}/receipt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  itemCode: it.itemCode,
                  lotNumber: Number(it.lotNumber),
                  receivedQty: Number(it.acceptedQty !== undefined ? it.acceptedQty : it.receivedQty) || 0
                })
              });
            } catch (e) {
              console.warn("Could not sync lot receipt:", e);
            }
          }
        }
      }

      showToast(isPost ? `GRN #${saved.grnNumber} posted successfully! PO & delivery lot balances updated.` : `GRN Draft #${saved.grnNumber} saved.`);
      setInwardModalOpen(false);
      fetchPendingPos();
      fetchGrns();
      setActiveTab("register");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Post an existing Draft GRN
  const handlePostDraft = async (grnId) => {
    if (!window.confirm("Are you sure you want to officially post this GRN? This will update PO received balances.")) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/grn/${grnId}/post`, { method: "POST" });
      if (res.ok) {
        showToast("GRN posted successfully!");
        fetchGrns();
        fetchPendingPos();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to post GRN");
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Pending POs, latest first (PO date, then PO number)
  const sortedPendingPos = useMemo(() => {
    return [...pendingPos].sort((a, b) =>
      String(b.poDate || "").localeCompare(String(a.poDate || "")) ||
      String(b.poNumber || "").localeCompare(String(a.poNumber || ""))
    );
  }, [pendingPos]);

  // Filtered GRNs
  const filteredGrns = useMemo(() => {
    return grnList.filter((g) => {
      if (statusFilter !== "ALL" && g.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchGrn = (g.grnNumber || "").toLowerCase().includes(term);
        const matchPo = (g.poNumber || "").toLowerCase().includes(term);
        const matchVendor = (g.vendorName || "").toLowerCase().includes(term);
        const matchChallan = (g.vendorChallanNo || "").toLowerCase().includes(term);
        return matchGrn || matchPo || matchVendor || matchChallan;
      }
      return true;
    });
  }, [grnList, statusFilter, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalGrns = grnList.length;
    const pendingPoCount = pendingPos.length;
    const totalAccepted = grnList.reduce((acc, g) => acc + (Number(g.totalAcceptedQty) || 0), 0);
    const totalRejected = grnList.reduce((acc, g) => acc + (Number(g.totalRejectedQty) || 0), 0);
    return { totalGrns, pendingPoCount, totalAccepted, totalRejected };
  }, [grnList, pendingPos]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: dark ? "#0f172a" : "#f8fafc", color: dark ? "#f1f5f9" : "#0f172a", fontFamily: "inherit" }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 9999, background: "#059669", color: "#fff", padding: "12px 20px", borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,0.2)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ background: dark ? "#1e293b" : "#ffffff", borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: dark ? "#f8fafc" : "#0f172a" }}>
              Goods Receipt Note (GRN)
            </h1>
            <span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 12, border: "1px solid #86efac" }}>
              ● Live PostgreSQL
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: 12, color: dark ? "#94a3b8" : "#64748b" }}>
            Material Inward Verification, Challan Audit & PO Quantity Reconciliation
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              style={{
                background: dark ? "#334155" : "#f1f5f9",
                border: `1px solid ${dark ? "#475569" : "#cbd5e1"}`,
                borderRadius: 6,
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                color: dark ? "#f8fafc" : "#0f172a"
              }}
              title="Toggle Navigation Menu"
            >
              <span>☰</span>
              <span>Modules</span>
            </button>
          )}
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              style={{ background: "transparent", border: `1px solid ${dark ? "#475569" : "#cbd5e1"}`, color: dark ? "#cbd5e1" : "#475569", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Dashboard
            </button>
          )}
          <button
            onClick={() => { fetchPendingPos(); fetchGrns(); showToast("Refreshed from database"); }}
            style={{ background: "#0284c7", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)" }}
          >
            <span>⟳ Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats KPI Ribbon */}
      <div style={{ padding: "14px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#1e293b" : "#ffffff" }}>
        <div style={{ background: dark ? "#0f172a" : "#f1f5f9", padding: "10px 16px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>PENDING INWARD POs</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#0284c7", marginTop: 2 }}>{stats.pendingPoCount} Orders</div>
        </div>
        <div style={{ background: dark ? "#0f172a" : "#f1f5f9", padding: "10px 16px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>PROCESSED GRNs</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", marginTop: 2 }}>{stats.totalGrns} Receipts</div>
        </div>
        <div style={{ background: dark ? "#0f172a" : "#f1f5f9", padding: "10px 16px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>TOTAL ACCEPTED MATERIAL</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#16a34a", marginTop: 2 }}>{stats.totalAccepted.toLocaleString("en-IN")} PCS</div>
        </div>
        <div style={{ background: dark ? "#0f172a" : "#f1f5f9", padding: "10px 16px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>TOTAL REJECTED MATERIAL</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: stats.totalRejected > 0 ? "#dc2626" : "#64748b", marginTop: 2 }}>{stats.totalRejected.toLocaleString("en-IN")} PCS</div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div style={{ padding: "14px 24px 0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveTab("pending")}
            style={{
              padding: "8px 18px",
              borderRadius: "6px 6px 0 0",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              borderBottom: activeTab === "pending" ? "3px solid #0284c7" : "3px solid transparent",
              background: activeTab === "pending" ? (dark ? "#1e293b" : "#ffffff") : "transparent",
              color: activeTab === "pending" ? "#0284c7" : (dark ? "#94a3b8" : "#64748b")
            }}
          >
            Pending POs for Receipt ({pendingPos.length})
          </button>
          <button
            onClick={() => setActiveTab("register")}
            style={{
              padding: "8px 18px",
              borderRadius: "6px 6px 0 0",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              borderBottom: activeTab === "register" ? "3px solid #0284c7" : "3px solid transparent",
              background: activeTab === "register" ? (dark ? "#1e293b" : "#ffffff") : "transparent",
              color: activeTab === "register" ? "#0284c7" : (dark ? "#94a3b8" : "#64748b")
            }}
          >
            GRN Register ({grnList.length})
          </button>
        </div>

        {activeTab === "register" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search GRN #, PO #, Vendor, Challan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "6px 12px", fontSize: 12, borderRadius: 6, border: `1px solid ${dark ? "#475569" : "#cbd5e1"}`, background: dark ? "#1e293b" : "#ffffff", color: "inherit", width: 250 }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, border: `1px solid ${dark ? "#475569" : "#cbd5e1"}`, background: dark ? "#1e293b" : "#ffffff", color: "inherit" }}
            >
              <option value="ALL">All Status</option>
              <option value="POSTED">POSTED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "0 24px 24px 24px", overflowY: "auto" }}>
        {activeTab === "pending" ? (
          /* TAB 1: PENDING POs FOR RECEIPT */
          <div style={{ background: dark ? "#1e293b" : "#ffffff", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, overflow: "hidden", marginTop: 8 }}>
            <div style={{ padding: "12px 18px", background: dark ? "#0f172a" : "#f8fafc", borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, fontWeight: 800, fontSize: 13, color: dark ? "#94a3b8" : "#475569" }}>
              Active Purchase Orders Waiting for Inward Consignment Delivery
            </div>

            {pendingPos.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>No Pending POs Waiting for Receipt</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>All approved Purchase Orders have been fully received or no new POs are issued.</div>
              </div>
            ) : (
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left", ...goodsReceiptNotePage1Resize.tableStyle }}>
                <ResizableColGroup columns={GOODS_RECEIPT_NOTE_PAGE_1_COLUMNS} widths={goodsReceiptNotePage1Resize.widths} />
                <thead style={{ background: dark ? "#0f172a" : "#f1f5f9", borderBottom: `1px solid ${dark ? "#334155" : "#cbd5e1"}` }}>
                  <tr>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>PO NUMBER<ColumnResizeHandle colKey="po_number" resize={goodsReceiptNotePage1Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>DATE<ColumnResizeHandle colKey="date" resize={goodsReceiptNotePage1Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>VENDOR<ColumnResizeHandle colKey="vendor" resize={goodsReceiptNotePage1Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>DEPARTMENT<ColumnResizeHandle colKey="department" resize={goodsReceiptNotePage1Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>ORDERED<ColumnResizeHandle colKey="ordered" resize={goodsReceiptNotePage1Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>RECEIVED<ColumnResizeHandle colKey="received" resize={goodsReceiptNotePage1Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>BALANCE DUE<ColumnResizeHandle colKey="balance_due" resize={goodsReceiptNotePage1Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>STATUS<ColumnResizeHandle colKey="status" resize={goodsReceiptNotePage1Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>ACTION<ColumnResizeHandle colKey="action" resize={goodsReceiptNotePage1Resize} /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPendingPos.map((po, idx) => (
                    <tr key={po.poNumber || idx} style={{ borderBottom: `1px solid ${dark ? "#334155" : "#f1f5f9"}` }}>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#0284c7" }}>
                        {po.poNumber}
                        {po.prNumber && <span style={{ display: "block", fontSize: 10, color: "#64748b", fontWeight: 500 }}>PR: {po.prNumber}</span>}
                      </td>
                      <td style={{ padding: "12px 14px", color: dark ? "#cbd5e1" : "#475569" }}>{formatDisplayDate(po.poDate) || "-"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <strong style={{ display: "block", color: dark ? "#f8fafc" : "#0f172a" }}>{po.vendorName}</strong>
                        <span style={{ fontSize: 10, color: "#64748b" }}>Code: {po.vendorCode}</span>
                      </td>
                      <td style={{ padding: "12px 14px", color: dark ? "#cbd5e1" : "#475569" }}>{po.department || "Purchase"}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                        {Number(po.totalOrderedQty || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: Number(po.totalReceivedQty || 0) > 0 ? "#2563eb" : "#94a3b8", fontWeight: 700 }}>
                        {Number(po.totalReceivedQty || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                        {Number(po.totalBalanceQty || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          background: po.status === "PARTIALLY RECEIVED" ? "#fef3c7" : "#e0f2fe",
                          color: po.status === "PARTIALLY RECEIVED" ? "#92400e" : "#0369a1",
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: 12
                        }}>
                          {po.status || "APPROVED"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                          onClick={() => setPoViewTarget(po)}
                          title="Open this PO to check its items before creating the GRN"
                          style={{
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: 5,
                            padding: "6px 12px",
                            fontSize: 11.5,
                            fontWeight: 800,
                            cursor: "pointer",
                            color: "#334155"
                          }}
                        >
                          👁 View PO
                        </button>
                        <button
                          onClick={() => handleOpenInwardForPo(po)}
                          style={{
                            background: "#0284c7",
                            color: "#fff",
                            border: "none",
                            borderRadius: 5,
                            padding: "6px 14px",
                            fontSize: 11.5,
                            fontWeight: 800,
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(2, 132, 199, 0.3)"
                          }}
                        >
                          + Create GRN
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* TAB 2: GRN REGISTER */
          <div style={{ background: dark ? "#1e293b" : "#ffffff", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, overflow: "hidden", marginTop: 8 }}>
            {filteredGrns.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>No Goods Receipt Notes Found</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Go to the Pending POs tab to create your first GRN.</div>
              </div>
            ) : (
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left", ...goodsReceiptNotePage2Resize.tableStyle }}>
                <ResizableColGroup columns={GOODS_RECEIPT_NOTE_PAGE_2_COLUMNS} widths={goodsReceiptNotePage2Resize.widths} />
                <thead style={{ background: dark ? "#0f172a" : "#f1f5f9", borderBottom: `1px solid ${dark ? "#334155" : "#cbd5e1"}` }}>
                  <tr>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>GRN NUMBER<ColumnResizeHandle colKey="grn_number" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>GRN DATE<ColumnResizeHandle colKey="grn_date" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>PO REF<ColumnResizeHandle colKey="po_ref" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>VENDOR<ColumnResizeHandle colKey="vendor" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>CHALLAN NO &amp; DATE<ColumnResizeHandle colKey="challan_no_amp_date" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>RECEIVED<ColumnResizeHandle colKey="received" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>ACCEPTED<ColumnResizeHandle colKey="accepted" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>REJECTED<ColumnResizeHandle colKey="rejected" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800 }}>STORE<ColumnResizeHandle colKey="store" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>STATUS<ColumnResizeHandle colKey="status" resize={goodsReceiptNotePage2Resize} /></th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>ACTIONS<ColumnResizeHandle colKey="actions" resize={goodsReceiptNotePage2Resize} /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrns.map((g, idx) => (
                    <tr key={g.id || idx} style={{ borderBottom: `1px solid ${dark ? "#334155" : "#f1f5f9"}` }}>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#0284c7" }}>
                        {g.grnNumber}
                        <span style={{ display: "block", fontSize: 10, color: "#64748b", fontWeight: 500 }}>
                          {formatAuditDateTime(g.createdAt)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>{formatDisplayDate(g.grnDate) || "-"}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: dark ? "#f8fafc" : "#0f172a" }}>
                        {g.poNumber}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <strong style={{ display: "block", color: dark ? "#f8fafc" : "#0f172a" }}>{g.vendorName}</strong>
                        <span style={{ fontSize: 10, color: "#64748b" }}>{g.vendorCode}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <strong>{g.vendorChallanNo || "-"}</strong>
                        {g.vendorChallanDate && <span style={{ display: "block", fontSize: 10, color: "#64748b" }}>Dt: {formatDisplayDate(g.vendorChallanDate)}</span>}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                        {Number(g.totalReceivedQty || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                        {Number(g.totalAcceptedQty || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: Number(g.totalRejectedQty || 0) > 0 ? "#dc2626" : "#64748b" }}>
                        {Number(g.totalRejectedQty || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 14px", color: dark ? "#cbd5e1" : "#475569" }}>
                        {g.storeLocation || "-"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span style={{
                          background: g.status === "POSTED" ? "#dcfce7" : "#fef3c7",
                          color: g.status === "POSTED" ? "#166534" : "#92400e",
                          border: g.status === "POSTED" ? "1px solid #86efac" : "1px solid #fde68a",
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 800
                        }}>
                          {g.status || "POSTED"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            onClick={() => { setSelectedGrn(g); setViewModalOpen(true); }}
                            style={{
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              borderRadius: 4,
                              padding: "5px 10px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              color: "#334155"
                            }}
                          >
                            👁 View
                          </button>
                          {g.status === "DRAFT" && (
                            <button
                              onClick={() => handlePostDraft(g.id)}
                              style={{
                                background: "#16a34a",
                                border: "none",
                                borderRadius: 4,
                                padding: "5px 10px",
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                                color: "#ffffff"
                              }}
                            >
                              ✓ Post
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE / INWARD MATERIAL MODAL */}
      {inwardModalOpen && selectedPo && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setInwardModalOpen(false);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 12px", overflowY: "auto" }}
        >
          <div style={{ background: dark ? "#1e293b" : "#ffffff", width: "98%", maxWidth: 1250, maxHeight: "94vh", borderRadius: 10, display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", overflow: "hidden" }}>
            {/* Modal Header */}
            <div style={{ padding: "14px 20px", background: "#0284c7", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setInwardModalOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                  title="Return to Goods Receipt Note software (Esc)"
                >
                  <span>← Back to Software</span>
                </button>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                    Generate Goods Receipt Note (GRN) · {formGrnNumber}
                  </h2>
                  <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                    Inward Consignment Verification against Purchase Order #{selectedPo.poNumber}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInwardModalOpen(false)}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontWeight: 900 }}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              {selectedPo.validityStatus === "EXPIRED" && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>
                  PO {selectedPo.poNumber} expired on {formatDisplayDate(selectedPo.validityDate)}. GRN cannot be saved or posted against it.
                  The PO validity must be extended from the Purchase Orders register before goods can be received.
                </div>
              )}

              {/* Reference Header Banner */}
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#0369a1", fontWeight: 700, display: "block" }}>PO REFERENCE</span>
                  <strong style={{ fontSize: 14 }}>{selectedPo.poNumber}</strong>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Dated: {formatDisplayDate(selectedPo.poDate) || "-"}</span>
                </div>
                <div>
                  <span style={{ color: "#0369a1", fontWeight: 700, display: "block" }}>SUPPLIER / VENDOR</span>
                  <strong style={{ fontSize: 14 }}>{selectedPo.vendorName}</strong>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Code: {selectedPo.vendorCode} | GSTIN: {selectedPo.vendorGstin || "N/A"}</span>
                </div>
                <div>
                  <span style={{ color: "#0369a1", fontWeight: 700, display: "block" }}>DEPARTMENT / REQUISITION</span>
                  <strong style={{ fontSize: 14 }}>{selectedPo.department || "Stores"}</strong>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>PR: {selectedPo.prNumber || "Direct"}</span>
                </div>
              </div>

              {/* Staggered Delivery Lot Selector (if Planned PO) */}
              {poDeliverySchedules.length > 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>
                      📅 Staggered Delivery Lot Inwarding (Planned PO)
                    </div>
                    <div style={{ fontSize: 11, color: "#15803d", fontWeight: 700 }}>
                      Total {poDeliverySchedules.length} Lot(s) Configured
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "#166534" }}>Select Consignment Lot:</span>
                    <select
                      value={selectedLotNumber || ""}
                      onChange={(e) => handleSelectDeliveryLot(e.target.value || null)}
                      style={{ padding: "6px 12px", borderRadius: 5, border: "1px solid #22c55e", background: "#ffffff", fontWeight: 700, color: "#166534" }}
                    >
                      <option value="">Full Inward / All Pending Items</option>
                      <optgroup label="Single Item Lot (Receive Only Selected Item Lot)">
                        {poDeliverySchedules.map((s) => (
                          <option key={s.id} value={`SCHED_${s.id}`}>
                            Item {s.itemCode} — Lot #{s.lotNumber} ({s.balanceQty !== undefined ? s.balanceQty : s.scheduledQty} PCS, Due: {formatDisplayDate(s.scheduledDate)}) [{s.status}]
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Delivery Date Consignment (All items due on date)">
                        {Array.from(new Set(poDeliverySchedules.map((s) => s.scheduledDate).filter(Boolean))).map((dt) => {
                          const schedsOnDate = poDeliverySchedules.filter((s) => s.scheduledDate === dt);
                          const totalQty = schedsOnDate.reduce((sum, s) => sum + (Number(s.balanceQty !== undefined ? s.balanceQty : s.scheduledQty) || 0), 0);
                          return (
                            <option key={dt} value={`DATE_${dt}`}>
                              Consignment Date: {dt} ({schedsOnDate.length} item(s), {totalQty} PCS total)
                            </option>
                          );
                        })}
                      </optgroup>
                    </select>
                    {selectedLotNumber && (
                      <span style={{ fontSize: 11, background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>
                        ⚡ {String(selectedLotNumber).startsWith("SCHED_") ? "Single Lot Isolated" : String(selectedLotNumber).startsWith("DATE_") ? "Date Consignment Isolated" : "Lot Filter Active"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Inward Paperwork & Gate Details Form */}
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 14, background: dark ? "#0f172a" : "#ffffff" }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, color: "#0f172a", borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>
                  Delivery Paperwork &amp; Gate Inward Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, fontSize: 11.5 }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Vendor Challan No *</label>
                    <input
                      type="text"
                      placeholder="e.g. DC-2026-991"
                      value={formChallanNo}
                      onChange={(e) => setFormChallanNo(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #cbd5e1", fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Challan Date *</label>
                    <DateInput
                      value={formChallanDate}
                      onChange={(e) => setFormChallanDate(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: 5, border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Vendor Invoice No (If attached)</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-4821"
                      value={formInvoiceNo}
                      onChange={(e) => setFormInvoiceNo(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Vehicle / Transporter</label>
                    <input
                      type="text"
                      placeholder="e.g. GJ-15-XX-1234 (V-Trans)"
                      value={formVehicleNo}
                      onChange={(e) => setFormVehicleNo(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Receiving Store Location *</label>
                    <select
                      value={formStoreLocation}
                      onChange={(e) => setFormStoreLocation(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #cbd5e1", fontWeight: 600 }}
                    >
                      <option value="Raw Material Store, Silvassa">Raw Material Store, Silvassa</option>
                      <option value="Bought-Out Parts Store, Plant 1">Bought-Out Parts Store, Plant 1</option>
                      <option value="FG Store, Silvassa">FG Store, Silvassa</option>
                      <option value="Tool Room & Die Store">Tool Room &amp; Die Store</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Received By (Personnel) *</label>
                    <input
                      type="text"
                      value={formReceivedBy}
                      onChange={(e) => setFormReceivedBy(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #cbd5e1", fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>

              {/* Items Inward Verification Grid */}
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#ffffff", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#1e293b" }}>
                    Item Physical Verification &amp; Inspection Breakdown
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Enforced: Received = Accepted + Rejected + Pending Inspection
                  </span>
                </div>
                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "380px", WebkitOverflowScrolling: "touch" }}>
                  <table className="resizable-table" style={{ width: "100%", minWidth: 1050, borderCollapse: "collapse", fontSize: 11.5, textAlign: "left", ...goodsReceiptNotePage3Resize.tableStyle }}>
                    <ResizableColGroup columns={GOODS_RECEIPT_NOTE_PAGE_3_COLUMNS} widths={goodsReceiptNotePage3Resize.widths} />
                    <thead style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: "9px 10px", width: 150, background: "#f1f5f9" }}>ITEM CODE<ColumnResizeHandle colKey="item_code" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 170, background: "#f1f5f9" }}>DESCRIPTION<ColumnResizeHandle colKey="description" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 70, textAlign: "right", background: "#f1f5f9" }}>PO QTY<ColumnResizeHandle colKey="po_qty" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 80, textAlign: "right", background: "#f1f5f9" }}>PO BALANCE<ColumnResizeHandle colKey="po_balance" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 85, textAlign: "right", background: "#f1f5f9" }}>CHALLAN<ColumnResizeHandle colKey="challan" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 85, textAlign: "right", background: "#f1f5f9" }}>RECEIVED<ColumnResizeHandle colKey="received" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 85, textAlign: "right", background: "#f1f5f9" }}>ACCEPTED<ColumnResizeHandle colKey="accepted" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 75, textAlign: "right", background: "#f1f5f9" }}>REJECTED<ColumnResizeHandle colKey="rejected" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 130, background: "#f1f5f9" }}>REJECTION REASON<ColumnResizeHandle colKey="rejection_reason" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 80, background: "#f1f5f9" }}>BIN<ColumnResizeHandle colKey="bin" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 90, textAlign: "right", background: "#f1f5f9" }}>ACCEPTED VALUE<ColumnResizeHandle colKey="accepted_value" resize={goodsReceiptNotePage3Resize} /></th>
                        <th style={{ padding: "9px 10px", width: 40, textAlign: "center", background: "#f1f5f9" }}><ColumnResizeHandle colKey="col11" resize={goodsReceiptNotePage3Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((it, idx) => (
                        <tr key={it.scheduleId ? `sched-${it.scheduleId}` : (it.itemCode || idx)} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 800, color: "#0284c7" }}>
                            {it.itemCode}
                            <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>{it.uom}</span>
                              {it.lotNumber !== undefined && it.lotNumber !== null && (
                                <span style={{ fontSize: 9.5, background: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                                  Lot #{it.lotNumber}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "9px 10px", color: "#334155" }}>
                            <strong>{it.itemName}</strong>
                            {it.description && <span style={{ display: "block", fontSize: 10, color: "#64748b" }}>{it.description}</span>}
                          </td>
                          <td style={{ padding: "9px 10px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>
                            {it.poOrderedQty}
                          </td>
                          <td style={{ padding: "9px 10px", textAlign: "right", color: "#059669", fontWeight: 800 }}>
                            {it.balanceExpectedQty}
                          </td>
                          {/* Challan Qty */}
                          <td style={{ padding: "9px 10px", textAlign: "right" }}>
                            <input
                              type="number"
                              value={it.challanQty}
                              onChange={(e) => handleItemFieldChange(idx, "challanQty", e.target.value)}
                              style={{ width: 65, padding: "4px", textAlign: "right", borderRadius: 4, border: "1px solid #cbd5e1", fontWeight: 700 }}
                            />
                          </td>
                          {/* Received Qty */}
                          <td style={{ padding: "9px 10px", textAlign: "right" }}>
                            <input
                              type="number"
                              value={it.receivedQty}
                              onChange={(e) => handleItemFieldChange(idx, "receivedQty", e.target.value)}
                              style={{ width: 65, padding: "4px", textAlign: "right", borderRadius: 4, border: it.acceptedQty > it.balanceExpectedQty ? "2px solid #ef4444" : "1px solid #cbd5e1", fontWeight: 800 }}
                            />
                          </td>
                          {/* Accepted Qty */}
                          <td style={{ padding: "9px 10px", textAlign: "right" }}>
                            <input
                              type="number"
                              value={it.acceptedQty}
                              onChange={(e) => handleItemFieldChange(idx, "acceptedQty", e.target.value)}
                              style={{ width: 65, padding: "4px", textAlign: "right", borderRadius: 4, border: "1px solid #86efac", background: "#f0fdf4", fontWeight: 800, color: "#166534" }}
                            />
                          </td>
                          {/* Rejected Qty */}
                          <td style={{ padding: "9px 10px", textAlign: "right" }}>
                            <input
                              type="number"
                              value={it.rejectedQty}
                              onChange={(e) => handleItemFieldChange(idx, "rejectedQty", e.target.value)}
                              style={{ width: 60, padding: "4px", textAlign: "right", borderRadius: 4, border: it.rejectedQty > 0 ? "1px solid #fca5a5" : "1px solid #cbd5e1", background: it.rejectedQty > 0 ? "#fef2f2" : "#ffffff", fontWeight: 700, color: it.rejectedQty > 0 ? "#dc2626" : "inherit" }}
                            />
                          </td>
                          {/* Rejection Reason */}
                          <td style={{ padding: "9px 10px" }}>
                            <select
                              value={it.rejectionReason || ""}
                              onChange={(e) => handleItemFieldChange(idx, "rejectionReason", e.target.value)}
                              disabled={it.rejectedQty <= 0}
                              style={{ width: "100%", padding: "4px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11 }}
                            >
                              <option value="">-- Reason --</option>
                              <option value="Defective Dimensions">Defective Dimensions</option>
                              <option value="Surface Damage / Cracks">Surface Damage / Cracks</option>
                              <option value="Packaging Ruptured">Packaging Ruptured</option>
                              <option value="Rust / Moisture Stain">Rust / Moisture Stain</option>
                              <option value="Wrong Grade / Spec">Wrong Grade / Spec</option>
                              <option value="Excess Shipped by Vendor">Excess Shipped by Vendor</option>
                            </select>
                          </td>
                          {/* Bin */}
                          <td style={{ padding: "9px 10px" }}>
                            <input
                              type="text"
                              value={it.storageBin || ""}
                              onChange={(e) => handleItemFieldChange(idx, "storageBin", e.target.value)}
                              style={{ width: "100%", padding: "4px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11 }}
                            />
                          </td>
                          {/* Line Value */}
                          <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                            ₹{Number(it.itemTotal || 0).toLocaleString("en-IN")}
                          </td>
                          {/* Remove row */}
                          <td style={{ padding: "9px 10px", textAlign: "center" }}>
                            {formItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                                title="Exclude this item from this GRN"
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: "bold", fontSize: 13 }}
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

              {/* Remarks */}
              <div>
                <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Inward Remarks &amp; Gate Observations</label>
                <textarea
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Note down box condition, seal verification, driver remarks..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setInwardModalOpen(false)}
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                ← Back to Software
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  disabled={actionInProgress}
                  onClick={() => handleSubmitGrn(false)}
                  style={{ background: "#ffffff", border: "1px solid #0284c7", color: "#0284c7", borderRadius: 6, padding: "8px 18px", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                >
                  Save Draft (Unposted)
                </button>
                <button
                  disabled={actionInProgress}
                  onClick={() => handleSubmitGrn(true)}
                  style={{ background: "#16a34a", border: "none", color: "#ffffff", borderRadius: 6, padding: "8px 22px", fontWeight: 800, fontSize: 12, cursor: "pointer", boxShadow: "0 2px 4px rgba(22, 163, 74, 0.3)" }}
                >
                  ✓ Post Official GRN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1b: READ-ONLY PO DETAILS FROM THE PENDING LIST (before a GRN is created) */}
      {poViewTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPoViewTarget(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            background: "rgba(15, 23, 42, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <div style={{ background: dark ? "#1e293b" : "#ffffff", color: dark ? "#f8fafc" : "#0f172a", borderRadius: 10, width: "min(1000px, 100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{poViewTarget.poNumber}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Purchase order · read only</div>
              </div>
              <button onClick={() => setPoViewTarget(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>×</button>
            </div>

            <div style={{ padding: 18, overflowY: "auto", display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, fontSize: 12 }}>
                {[
                  ["PO date", formatDisplayDate(poViewTarget.poDate) || "-"],
                  ["PR number", poViewTarget.prNumber || "-"],
                  ["Status", poViewTarget.status || "APPROVED"],
                  ["Vendor", `${poViewTarget.vendorName || "-"} (${poViewTarget.vendorCode || "-"})`],
                  ["Vendor GSTIN", poViewTarget.vendorGstin || "-"],
                  ["Department", poViewTarget.department || "Purchase"],
                  ["Requested by", poViewTarget.requestedBy || "-"],
                  ["Payment terms", poViewTarget.paymentTerms || "-"],
                  ["Delivery date", formatDisplayDate(poViewTarget.deliveryDate) || "-"],
                  ["Delivery location", poViewTarget.deliveryLocation || "-"],
                  ["Valid until", formatDisplayDate(poViewTarget.validityDate) || "-"],
                  ["Grand total", `₹${Number(poViewTarget.grandTotal || 0).toLocaleString("en-IN")}`]
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{k}</div>
                    <div style={{ fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ overflowX: "auto", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead style={{ background: dark ? "#0f172a" : "#f1f5f9" }}>
                    <tr>
                      {["Item code", "Description", "UOM", "Ordered", "Received", "Balance", "Rate", "Tax %", "Expected delivery"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: ["Ordered", "Received", "Balance", "Rate", "Tax %"].includes(h) ? "right" : "left", fontWeight: 800 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(poViewTarget.items || []).map((it, i) => (
                      <tr key={`${it.itemCode}-${i}`} style={{ borderTop: `1px solid ${dark ? "#334155" : "#f1f5f9"}` }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700 }}>{it.itemCode}</td>
                        <td style={{ padding: "8px 10px" }}>{it.itemName || it.description || "-"}</td>
                        <td style={{ padding: "8px 10px" }}>{it.uom || "-"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>{Number(it.orderedQty || 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#2563eb" }}>{Number(it.receivedQty || 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>{Number(it.balanceQty || 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>₹{Number(it.unitRate || 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>{it.taxPercent ?? "-"}</td>
                        <td style={{ padding: "8px 10px" }}>{formatDisplayDate(it.expectedDeliveryDate) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: "12px 18px", borderTop: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setPoViewTarget(null)} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 5, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#334155" }}>
                Close
              </button>
              <button
                onClick={() => { const po = poViewTarget; setPoViewTarget(null); handleOpenInwardForPo(po); }}
                style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 5, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
              >
                + Create GRN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW GRN DOCUMENT MODAL */}
      {viewModalOpen && selectedGrn && (
        <div
          className="grn-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewModalOpen(false);
          }}
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
        >
          {/* Dynamic Print Stylesheet to guarantee 1-Page print without clipping or scrolling artifacts */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 6mm 8mm;
              }

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

              .grn-modal-overlay {
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

              .grn-modal-container {
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

              .grn-screen-only {
                display: none !important;
                visibility: hidden !important;
              }

              #grn-printable-area, #grn-printable-area * {
                visibility: visible !important;
              }

              #grn-printable-area {
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

              .grn-print-table tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>

          <div
            className="grn-modal-container"
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: 920,
              maxHeight: "96vh",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
              overflow: "hidden"
            }}
          >
            {/* Top Action Strip (Screen Only) */}
            <div
              className="grn-screen-only"
              style={{
                padding: "10px 18px",
                background: "#0f172a",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #334155"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setViewModalOpen(false)}
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
                  title="Return to Goods Receipt Note software (Esc)"
                >
                  <span>← Back to Software</span>
                </button>
                <div>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Goods Receipt Note Voucher · {selectedGrn.grnNumber}</h2>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Official Store Material Inward Acknowledgment</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={handlePrintGrn}
                  style={{
                    background: "#0284c7",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 16px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)"
                  }}
                >
                  <span>🖨 Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewModalOpen(false)}
                  style={{
                    background: "#334155",
                    border: "none",
                    color: "#fff",
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    fontSize: 15,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Voucher Area */}
            <div
              id="grn-printable-area"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "18px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}
            >
              {/* Header Letterhead */}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>SILVER MULLER SEALS PVT. LTD.</h3>
                  <div style={{ fontSize: 10.5, color: "#475569", marginTop: 2 }}>Plot 42, Industrial Sector, Silvassa, D&amp;NH - 396230</div>
                  <div style={{ fontSize: 10.5, color: "#475569" }}>GSTIN: 26AAACS1234F1Z9 &bull; CIN: U28999DN2005PTC000123</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>GOODS RECEIPT NOTE</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: "#0284c7" }}>{selectedGrn.grnNumber}</div>
                  <div style={{ fontSize: 10.5, color: "#475569" }}>GRN Date: <strong>{formatDisplayDate(selectedGrn.grnDate)}</strong></div>
                  <span style={{ display: "inline-block", marginTop: 3, background: selectedGrn.status === "POSTED" ? "#dcfce7" : "#fef3c7", color: selectedGrn.status === "POSTED" ? "#166534" : "#92400e", fontSize: 9.5, fontWeight: 800, padding: "2px 8px", borderRadius: 10 }}>
                    STATUS: {selectedGrn.status}
                  </span>
                </div>
              </div>

              {/* Vendor & PO Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr", gap: 16, fontSize: 11, background: "#f8fafc", padding: "10px 14px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "#0284c7", marginBottom: 3, fontSize: 10, textTransform: "uppercase" }}>SUPPLIER DETAILS</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{selectedGrn.vendorName}</div>
                  <div style={{ color: "#64748b" }}>Vendor Code: {selectedGrn.vendorCode}</div>
                  <div style={{ color: "#64748b" }}>GSTIN: {selectedGrn.vendorGstin || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#0284c7", marginBottom: 3, fontSize: 10, textTransform: "uppercase" }}>DELIVERY &amp; PO REFERENCE</div>
                  <div>PO Number: <strong style={{ color: "#0f172a" }}>{selectedGrn.poNumber}</strong></div>
                  <div>Challan No: <strong>{selectedGrn.vendorChallanNo}</strong> {selectedGrn.vendorChallanDate ? `(Dt: ${formatDisplayDate(selectedGrn.vendorChallanDate)})` : ""}</div>
                  {selectedGrn.vendorInvoiceNo && <div>Invoice No: <strong>{selectedGrn.vendorInvoiceNo}</strong></div>}
                  <div style={{ color: "#475569" }}>Vehicle: {selectedGrn.vehicleNumber || "N/A"} | Store: {selectedGrn.storeLocation}</div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="grn-print-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                <thead style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
                  <tr>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: 25 }}>#</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: 110 }}>ITEM CODE</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>DESCRIPTION</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 65 }}>CHALLAN</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 65 }}>RECEIVED</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 65 }}>ACCEPTED</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 65 }}>REJECTED</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 85 }}>RATE (₹)</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", width: 95 }}>LINE TOTAL (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedGrn.items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 8px", color: "#64748b" }}>{idx + 1}</td>
                      <td style={{ padding: "6px 8px", fontWeight: 800, color: "#0284c7" }}>{it.itemCode}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <strong style={{ color: "#0f172a" }}>{it.itemName}</strong>
                        {it.rejectionReason && <span style={{ display: "block", color: "#dc2626", fontSize: 9.5 }}>Reason: {it.rejectionReason}</span>}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{it.challanQty}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>{it.receivedQty}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>{it.acceptedQty}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: it.rejectedQty > 0 ? "#dc2626" : "#64748b" }}>{it.rejectedQty}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>₹{Number(it.unitRate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 800 }}>₹{Number(it.itemTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                    <td colSpan={5} style={{ padding: "8px", fontWeight: 800, fontSize: 11 }}>TOTAL MATERIAL CONSIGNMENT</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 900, color: "#16a34a" }}>{selectedGrn.totalAcceptedQty}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 900, color: Number(selectedGrn.totalRejectedQty || 0) > 0 ? "#dc2626" : "#64748b" }}>{selectedGrn.totalRejectedQty}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 800 }}>Passed Value:</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 900, fontSize: 12, color: "#0f172a" }}>₹{Number(selectedGrn.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Mandatory Timestamps & Audit Signoff Card */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "10px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 10.5 }}>
                <div>
                  <span style={{ color: "#1e40af", fontWeight: 800, display: "block", fontSize: 9.5 }}>RECORDED / CREATED AT:</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatAuditDateTime(selectedGrn.createdAt)}</span>
                </div>
                <div>
                  <span style={{ color: "#1e40af", fontWeight: 800, display: "block", fontSize: 9.5 }}>RECEIVED BY (STORE):</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{selectedGrn.receivedBy || "Store Officer"}</span>
                </div>
                <div>
                  <span style={{ color: "#1e40af", fontWeight: 800, display: "block", fontSize: 9.5 }}>INSPECTED BY (QA):</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{selectedGrn.inspectedBy || "Quality Inspector"}</span>
                </div>
                <div>
                  <span style={{ color: "#1e40af", fontWeight: 800, display: "block", fontSize: 9.5 }}>STORE DESTINATION:</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{selectedGrn.storeLocation || "Raw Material Store"}</span>
                </div>
              </div>
            </div>

            {/* Modal Sticky Bottom Bar (Screen Only) */}
            <div
              className="grn-screen-only"
              style={{
                padding: "10px 20px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
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
                title="Return to Goods Receipt Note software"
              >
                <span>← Back to Software</span>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Tip: Press <kbd style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Esc</kbd> or click outside to return
                </span>
                <button
                  type="button"
                  onClick={handlePrintGrn}
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
                  <span>🖨 Print Voucher</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoodsReceiptNotePage;
