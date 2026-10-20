import { formatDisplayDate, formatDisplayDateTime } from "../../../shared/utils/dateFormat";
import DateInput from "../../../shared/components/DateInput";
import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import React, { useState, useEffect, useMemo } from "react";

const BASE_URL = "http://localhost:4000";

// Standard date formatter
function formatDate(val) {
  if (!val) return "—";
  return formatDisplayDate(val);
}

function formatAuditDateTime(val) {
  if (!val) return "—";
  return formatDisplayDateTime(val);
}

const REQUEST_FOR_QUOTATION_PAGE_1_COLUMNS = [
  { key: "rfq", width: 80 },
  { key: "dates", width: 80 },
  { key: "pr_ref", width: 82 },
  { key: "title_subject", width: 145 },
  { key: "invited_suppliers_bids", width: 200 },
  { key: "items", width: 80 },
  { key: "status", width: 82 },
  { key: "actions", width: 89 },
];

const REQUEST_FOR_QUOTATION_PAGE_2_COLUMNS = [
  { key: "pr", width: 80 },
  { key: "date", width: 80 },
  { key: "department", width: 110 },
  { key: "purpose", width: 89 },
  { key: "items", width: 80 },
  { key: "status", width: 82 },
  { key: "action", width: 82 },
];

const REQUEST_FOR_QUOTATION_PAGE_3_COLUMNS = [
  { key: "rank", width: 50 },
  { key: "supplier_name", width: 131 },
  { key: "quote_ref", width: 117 },
  { key: "basic_rate", width: 138 },
  { key: "gst", width: 80 },
  { key: "total_amount", width: 152 },
  { key: "lead_time", width: 103 },
  { key: "action", width: 82 },
];

const REQUEST_FOR_QUOTATION_PAGE_4_COLUMNS = [
  { key: "sr", width: 40 },
  { key: "item_code", width: 103 },
  { key: "description", width: 117 },
  { key: "uom", width: 80 },
  { key: "req_qty", width: 89 },
  { key: "technical_notes", width: 145 },
];

const REQUEST_FOR_QUOTATION_PAGE_5_COLUMNS = [
  { key: "sr", width: 40 },
  { key: "item_code_item_master", width: 280 },
  { key: "item_description_name", width: 240 },
  { key: "uom", width: 95 },
  { key: "req_qty", width: 95 },
  { key: "technical_specs_notes", width: 200 },
  { key: "action", width: 95 },
];

const REQUEST_FOR_QUOTATION_PAGE_6_COLUMNS = [
  { key: "sr", width: 35 },
  { key: "item_code", width: 120 },
  { key: "description_specificatio", width: 200 },
  { key: "uom", width: 60 },
  { key: "req_qty", width: 80 },
  { key: "quoted_rate", width: 100 },
];

export function RequestForQuotationPage({ dark = false, onBackToHome, onNavigate, onOpenSidebar, sidebarOpen }) {
  const requestForQuotationPage6Resize = useResizableColumns("request-for-quotation-page-6", REQUEST_FOR_QUOTATION_PAGE_6_COLUMNS);
  const requestForQuotationPage5Resize = useResizableColumns("request-for-quotation-page-5", REQUEST_FOR_QUOTATION_PAGE_5_COLUMNS);
  const requestForQuotationPage4Resize = useResizableColumns("request-for-quotation-page-4", REQUEST_FOR_QUOTATION_PAGE_4_COLUMNS);
  const requestForQuotationPage3Resize = useResizableColumns("request-for-quotation-page-3", REQUEST_FOR_QUOTATION_PAGE_3_COLUMNS);
  const requestForQuotationPage2Resize = useResizableColumns("request-for-quotation-page-2", REQUEST_FOR_QUOTATION_PAGE_2_COLUMNS);
  const requestForQuotationPage1Resize = useResizableColumns("request-for-quotation-page-1", REQUEST_FOR_QUOTATION_PAGE_1_COLUMNS);
  const [activeTab, setActiveTab] = useState("register"); // "register" | "pending_pr"
  const [loading, setLoading] = useState(false);
  const [rfqList, setRfqList] = useState([]);
  const [approvedPrs, setApprovedPrs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [quotationsList, setQuotationsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");

  // Modal & Workspace states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [logBidModalOpen, setLogBidModalOpen] = useState(false);
  const [viewVoucherModalOpen, setViewVoucherModalOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // RFQ Creation Form State
  const [formRfqNumber, setFormRfqNumber] = useState("");
  const [formRfqDate, setFormRfqDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [formPrNumber, setFormPrNumber] = useState("");
  const [formPrDate, setFormPrDate] = useState("");
  const [formDepartment, setFormDepartment] = useState("Purchase");
  const [formTitle, setFormTitle] = useState("");
  const [formDeliveryLocation, setFormDeliveryLocation] = useState("Silver Muller Seals Plant 1 - Plot 42, Sector 8, IMT Manesar, Gurugram, Haryana - 122050");
  const [formPaymentTerms, setFormPaymentTerms] = useState("30 Days Credit after delivery & QC clearance");
  const [formTermsConditions, setFormTermsConditions] = useState(
    "1. Quotation must specify basic rate, GST percentage, and freight terms.\n" +
    "2. Delivery timeline commitment is strictly required.\n" +
    "3. Quality test reports / MTC mandatory with supply.\n" +
    "4. Rate validity should be at least 30 days from RFQ closing date."
  );
  const [formRemarks, setFormRemarks] = useState("");
  const [formSelectedVendors, setFormSelectedVendors] = useState([]);
  const [formItems, setFormItems] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");

  // Item Master search and dropdown states for Create RFQ
  const [catalogSearchFilter, setCatalogSearchFilter] = useState("");
  const [activeItemPickerRow, setActiveItemPickerRow] = useState(null);
  const [pickerSearchTerm, setPickerSearchTerm] = useState("");
  const [pickerCategoryTab, setPickerCategoryTab] = useState("ALL");
  const [rowSearchOpenIdx, setRowSearchOpenIdx] = useState(null);
  const [rowSearchQueries, setRowSearchQueries] = useState({});

  // Log Bid Form State (Direct Quote Logging inside RFQ)
  const [bidVendorId, setBidVendorId] = useState("");
  const [bidVendorCode, setBidVendorCode] = useState("");
  const [bidVendorName, setBidVendorName] = useState("");
  const [bidQuoteRef, setBidQuoteRef] = useState("");
  const [bidUnitRate, setBidUnitRate] = useState("");
  const [bidDiscountPct, setBidDiscountPct] = useState("0");
  const [bidTaxPct, setBidTaxPct] = useState("18");
  const [bidLeadDays, setBidLeadDays] = useState("7");
  const [bidRemarks, setBidRemarks] = useState("");

  // Theme styling tokens
  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const borderCol = dark ? "#334155" : "#e2e8f0";
  const textMain = dark ? "#f8fafc" : "#0f172a";
  const textSub = dark ? "#94a3b8" : "#64748b";
  const toolbarBg = dark ? "#1e293b" : "#ffffff";
  const tableHeadBg = dark ? "#1e293b" : "#f8fafc";
  const tableHeadText = dark ? "#94a3b8" : "#475569";
  const hoverRowBg = dark ? "#1e293b" : "#f8fafc";
  const inputBg = dark ? "#1e293b" : "#ffffff";
  const inputBorder = dark ? "#334155" : "#cbd5e1";
  const modalBoxBg = dark ? "#0f172a" : "#ffffff";

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4500);
  };

  // 1. Fetch RFQs from PostgreSQL
  const fetchRfqs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/rfq`);
      if (res.ok) {
        const data = await res.json();
        setRfqList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load RFQs:", e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Requisitions from PostgreSQL
  const fetchApprovedPrs = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/requisitions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const approved = data.filter((p) => {
            const st = (p.status || "").toLowerCase();
            return st === "approved" || st === "partially ordered" || st === "po generated";
          });
          setApprovedPrs(approved);
        }
      }
    } catch (e) {
      console.error("Failed to load approved PRs:", e);
    }
  };

  // 3. Fetch Suppliers
  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/suppliers`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load suppliers:", e);
    }
  };

  // 4. Fetch Item Master Catalog (PostgreSQL + LocalStorage)
  const fetchItemsCatalog = async () => {
    try {
      let combined = [];
      const res = await fetch(`${BASE_URL}/api/inventory/items`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) combined = data;
      }
      if (combined.length === 0) {
        const res2 = await fetch(`${BASE_URL}/api/items`);
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2)) combined = data2;
        }
      }
      try {
        const savedOther = localStorage.getItem("SMS_OTHER_ITEM_MASTER_DATA_REAL");
        if (savedOther) {
          const parsed = JSON.parse(savedOther);
          if (Array.isArray(parsed)) {
            parsed.forEach((it) => {
              if (it && it.item_code) {
                const idx = combined.findIndex((c) => (c.item_code || c.itemCode) === it.item_code);
                const itemObj = {
                  id: it.id || it.item_code,
                  item_code: it.item_code,
                  item_name: it.item_name || it.description || it.item_code,
                  category: it.category || "Raw Material",
                  uom: it.uom || "PCS",
                  price: Number(it.unit_price || it.est_rate) || 0,
                  est_rate: Number(it.unit_price || it.est_rate) || 0,
                  item_type: "OTHER"
                };
                if (idx !== -1) combined[idx] = { ...combined[idx], ...itemObj };
                else combined.unshift(itemObj);
              }
            });
          }
        }
      } catch (err) {
        // ignore
      }

      // Normalize all items
      const normalized = combined
        .map((it) => ({
          id: it.id || it.item_code || it.code,
          item_code: it.item_code || it.code || it.sms_new_part_no || "",
          item_name: it.item_name || it.description_size || it.name || it.description || it.item_code || "",
          category: it.category || it.group_name || "General",
          uom: it.uom || "PCS",
          price: Number(it.price || it.est_rate || it.unit_price) || 0,
          item_type: it.item_type || (String(it.category).toUpperCase() === "FG" ? "FG" : "OTHER")
        }))
        .filter((it) => it.item_code);

      setItemsCatalog(normalized);
    } catch (e) {
      console.error("Failed to load items catalog:", e);
    }
  };

  // 5. Fetch Quotations to match with RFQs
  const fetchQuotations = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/quotations`);
      if (res.ok) {
        const data = await res.json();
        setQuotationsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load quotations:", e);
    }
  };

  useEffect(() => {
    fetchRfqs();
    fetchApprovedPrs();
    fetchSuppliers();
    fetchItemsCatalog();
    fetchQuotations();
  }, []);

  // Fetch next suggested RFQ number
  const fetchNextNumber = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/purchase/rfq/next-number`);
      if (res.ok) {
        const data = await res.json();
        setFormRfqNumber(data.rfqNumber || "");
      }
    } catch (e) {
      setFormRfqNumber(`RFQ-${new Date().getFullYear()}-00001`);
    }
  };

  // Auto-load PR from sessionStorage if navigated from PR screen
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("SMS_SELECTED_PR_FOR_RFQ");
      if (raw) {
        sessionStorage.removeItem("SMS_SELECTED_PR_FOR_RFQ");
        const pr = JSON.parse(raw);
        if (pr) {
          handleInitCreateFromPr(pr);
        }
      }
    } catch (e) {
      console.error("Error reading sessionStorage for RFQ:", e);
    }
  }, [suppliers]);

  // Handler to initialize Create RFQ Modal from a PR
  const handleInitCreateFromPr = async (pr) => {
    await fetchNextNumber();
    setFormPrNumber(pr.pr_number || pr.prNumber || "");
    setFormPrDate(pr.pr_date || pr.prDate || new Date().toISOString().split("T")[0]);
    setFormDepartment(pr.department || "Purchase");
    setFormTitle(`Request for Quotation for PR #${pr.pr_number || pr.prNumber} (${pr.purpose || "Materials Purchase"})`);
    setFormRemarks(pr.remarks || `Inquiry against requisition #${pr.pr_number || pr.prNumber}`);

    const prItems = (pr.items || []).map((it) => {
      const req = Number(it.req_qty || it.required_qty || it.qty || 0);
      const ord = Number(it.ordered_qty || 0);
      const rem = it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, req - ord);
      const qty = rem > 0 ? rem : req || 1;
      return {
        itemCode: it.item_code || it.itemCode || "",
        itemName: it.item_name || it.itemName || it.description || "",
        description: it.description || it.specification || "",
        category: it.category || "RAW_MATERIAL",
        uom: it.uom || "PCS",
        requiredQty: qty,
        targetDate: it.target_date || it.required_date || "",
        remarks: it.remarks || ""
      };
    });

    if (prItems.length === 0) {
      setFormItems([{
        itemCode: "",
        itemName: "",
        description: "",
        category: "RAW_MATERIAL",
        uom: "PCS",
        requiredQty: 1,
        targetDate: "",
        remarks: ""
      }]);
    } else {
      setFormItems(prItems);
    }

    setFormSelectedVendors([]);
    setCreateModalOpen(true);
    showToast(`Loaded Requisition #${pr.pr_number || pr.prNumber}. Select vendors to invite.`);
  };

  // Handler to open blank RFQ modal
  const handleOpenBlankCreateModal = async () => {
    await fetchNextNumber();
    setFormPrNumber("");
    setFormPrDate("");
    setFormDepartment("Purchase");
    setFormTitle("");
    setFormRemarks("");
    setFormSelectedVendors([]);
    setFormItems([
      {
        itemCode: "",
        itemName: "",
        description: "",
        category: "RAW_MATERIAL",
        uom: "PCS",
        requiredQty: 1,
        targetDate: "",
        remarks: ""
      }
    ]);
    setCreateModalOpen(true);
  };

  // Toggle vendor selection for RFQ
  const handleToggleVendor = (vendor) => {
    setFormSelectedVendors((prev) => {
      const exists = prev.some((v) => v.id === vendor.id);
      if (exists) {
        return prev.filter((v) => v.id !== vendor.id);
      } else {
        return [
          ...prev,
          {
            id: vendor.id,
            code: vendor.supplier_code || vendor.supplierCode || "",
            name: vendor.supplier_name || vendor.supplierName || "",
            email: vendor.email || "",
            phone: vendor.mobile_number || vendor.phone || vendor.contact_number || "",
            city: vendor.city || ""
          }
        ];
      }
    });
  };

  // Add Item Row
  const handleAddItemRow = () => {
    setFormItems((prev) => [
      ...prev,
      {
        itemCode: "",
        itemName: "",
        description: "",
        category: "RAW_MATERIAL",
        uom: "PCS",
        requiredQty: 1,
        targetDate: "",
        remarks: ""
      }
    ]);
  };

  // Remove Item Row (deletes row or resets if last remaining row)
  const handleRemoveItemRow = (index) => {
    setFormItems((prev) => {
      if (prev.length <= 1) {
        showToast("Cleared item row details.");
        return [
          {
            itemCode: "",
            itemName: "",
            description: "",
            category: "RAW_MATERIAL",
            uom: "PCS",
            requiredQty: 1,
            targetDate: "",
            remarks: ""
          }
        ];
      }
      showToast(`Removed item row #${index + 1}`);
      return prev.filter((_, i) => i !== index);
    });
    setRowSearchQueries((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    if (rowSearchOpenIdx === index) {
      setRowSearchOpenIdx(null);
    }
  };

  // Select item from Item Master
  const handleSelectItemForLine = (index, masterItem) => {
    if (!masterItem) return;
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        itemCode: masterItem.item_code || masterItem.code || "",
        itemName: masterItem.item_name || masterItem.name || masterItem.description || "",
        description: masterItem.item_name || masterItem.description || "",
        category: masterItem.category || updated[index]?.category || "RAW_MATERIAL",
        uom: masterItem.uom || updated[index]?.uom || "PCS"
      };
      return updated;
    });
  };

  // Change Item Fields
  const handleItemChange = (index, field, value) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "itemCode") {
        const found = itemsCatalog.find((it) => (it.item_code || it.code) === value);
        if (found) {
          updated[index].itemName = found.item_name || found.name || updated[index].itemName;
          updated[index].description = found.description || found.item_name || updated[index].description;
          updated[index].category = found.category || updated[index].category;
          updated[index].uom = found.uom || updated[index].uom;
        }
      }
      return updated;
    });
  };

  // Categorize Item Master Catalog into Non-FG and Finished Goods
  const categorizedMasterItems = useMemo(() => {
    const rawAndOther = [];
    const finishedGoods = [];

    (itemsCatalog || []).forEach((it) => {
      const code = it.item_code || it.code || "";
      const name = it.item_name || it.name || it.description || code;
      const cat = it.category || "General";
      const uom = it.uom || "PCS";
      const type = it.item_type || (String(cat).toUpperCase() === "FG" ? "FG" : "OTHER");

      const itemObj = {
        item_code: code,
        item_name: name,
        category: cat,
        uom: uom,
        item_type: type
      };

      if (type === "FG" || String(cat).toUpperCase() === "FG") {
        finishedGoods.push(itemObj);
      } else {
        rawAndOther.push(itemObj);
      }
    });

    return { rawAndOther, finishedGoods };
  }, [itemsCatalog]);

  // Filter dropdown items based on live search filter
  const filteredItemsForDropdown = useMemo(() => {
    const term = catalogSearchFilter.trim().toLowerCase();
    if (!term) return categorizedMasterItems;

    return {
      rawAndOther: categorizedMasterItems.rawAndOther.filter(
        (it) =>
          it.item_code.toLowerCase().includes(term) ||
          it.item_name.toLowerCase().includes(term) ||
          it.category.toLowerCase().includes(term)
      ),
      finishedGoods: categorizedMasterItems.finishedGoods.filter(
        (it) =>
          it.item_code.toLowerCase().includes(term) ||
          it.item_name.toLowerCase().includes(term) ||
          it.category.toLowerCase().includes(term)
      )
    };
  }, [categorizedMasterItems, catalogSearchFilter]);

  // Filter items in the Searchable Item Master Dialog
  const pickerFilteredItems = useMemo(() => {
    let list = itemsCatalog || [];
    if (pickerCategoryTab === "RAW") {
      list = list.filter((it) => it.item_type !== "FG" && String(it.category).toUpperCase() !== "FG");
    } else if (pickerCategoryTab === "FG") {
      list = list.filter((it) => it.item_type === "FG" || String(it.category).toUpperCase() === "FG");
    }

    const term = pickerSearchTerm.trim().toLowerCase();
    if (!term) return list.slice(0, 100);

    return list
      .filter((it) => {
        const code = (it.item_code || it.code || "").toLowerCase();
        const name = (it.item_name || it.name || it.description || "").toLowerCase();
        const cat = (it.category || "").toLowerCase();
        return code.includes(term) || name.includes(term) || cat.includes(term);
      })
      .slice(0, 100);
  }, [itemsCatalog, pickerSearchTerm, pickerCategoryTab]);

  // Save RFQ to PostgreSQL
  const handleSaveRfq = async (issueDirectly = false) => {
    if (!formRfqNumber.trim()) {
      alert("RFQ Number is required.");
      return;
    }
    if (formSelectedVendors.length === 0) {
      alert("Please select at least one supplier to invite.");
      return;
    }
    if (formItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    setActionInProgress(true);
    try {
      const payload = {
        rfqNumber: formRfqNumber,
        rfqDate: formRfqDate,
        dueDate: formDueDate,
        prNumber: formPrNumber || null,
        prDate: formPrDate || null,
        department: formDepartment,
        title: formTitle || `RFQ #${formRfqNumber}`,
        status: issueDirectly ? "SENT" : "OPEN",
        selectedVendorsJson: JSON.stringify(formSelectedVendors),
        deliveryLocation: formDeliveryLocation,
        paymentTerms: formPaymentTerms,
        termsConditions: formTermsConditions,
        remarks: formRemarks,
        createdBy: "Purchase Officer",
        items: formItems.map((it) => ({
          itemCode: it.itemCode || "",
          itemName: it.itemName || "",
          description: it.description || "",
          category: it.category || "RAW_MATERIAL",
          uom: it.uom || "PCS",
          requiredQty: Number(it.requiredQty) || 1,
          targetDate: it.targetDate || null,
          remarks: it.remarks || ""
        }))
      };

      const res = await fetch(`${BASE_URL}/api/purchase/rfq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        showToast(`✅ RFQ #${saved.rfqNumber} successfully created with ${formSelectedVendors.length} invited supplier(s)!`);
        setCreateModalOpen(false);
        fetchRfqs();
        setActiveTab("register");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save RFQ: ${err.message || "Server error"}`);
      }
    } catch (e) {
      console.error("Save RFQ Error:", e);
      alert("Error saving RFQ.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Open Workspace for an RFQ
  const handleOpenWorkspace = (rfq) => {
    let vendors = [];
    try {
      if (rfq.selectedVendorsJson) {
        vendors = JSON.parse(rfq.selectedVendorsJson);
      }
    } catch (e) {
      vendors = [];
    }
    setSelectedRfq({ ...rfq, selectedVendors: vendors });
    setWorkspaceModalOpen(true);
  };

  // Open Log Bid Modal for a specific vendor or the RFQ
  const handleOpenLogBidModal = (rfq, preSelectedVendor = null) => {
    let vendors = [];
    try {
      if (rfq.selectedVendorsJson) {
        vendors = JSON.parse(rfq.selectedVendorsJson);
      }
    } catch (e) {
      vendors = [];
    }
    setSelectedRfq({ ...rfq, selectedVendors: vendors });

    if (preSelectedVendor) {
      setBidVendorId(preSelectedVendor.id || "");
      setBidVendorName(preSelectedVendor.name || preSelectedVendor.supplier_name || "");
      setBidVendorCode(preSelectedVendor.code || preSelectedVendor.supplier_code || preSelectedVendor.supplierCode || "VEND-001");
    } else if (vendors.length > 0) {
      setBidVendorId(vendors[0].id || "");
      setBidVendorName(vendors[0].name || vendors[0].supplier_name || "");
      setBidVendorCode(vendors[0].code || vendors[0].supplier_code || vendors[0].supplierCode || "VEND-001");
    } else {
      setBidVendorId("");
      setBidVendorName("");
      setBidVendorCode("");
    }

    setBidQuoteRef(`QT-${Math.floor(1000 + Math.random() * 9000)}`);
    setBidUnitRate("");
    setBidDiscountPct("0");
    setBidTaxPct("18");
    setBidLeadDays("7");
    setBidRemarks("Standard quotation terms received");
    setLogBidModalOpen(true);
  };

  // Save Logged Bid (Quotation) directly linked to RFQ
  const handleSaveLoggedBid = async () => {
    if (!bidVendorName) {
      alert("Please select a vendor.");
      return;
    }
    if (!bidUnitRate || Number(bidUnitRate) <= 0) {
      alert("Please enter a valid quoted unit rate.");
      return;
    }

    setActionInProgress(true);
    try {
      const rate = Number(bidUnitRate);
      const discPct = Number(bidDiscountPct) || 0;
      const taxPct = Number(bidTaxPct) || 18;

      const rfqItems = (selectedRfq.items && selectedRfq.items.length > 0) ? selectedRfq.items : [{ requiredQty: 1 }];
      let subtotalSum = 0;
      let taxSum = 0;
      let finalSum = 0;

      const computedItems = rfqItems.map((it) => {
        const itemQty = Number(it.requiredQty) || 1;
        const lineBase = rate * itemQty;
        const lineDisc = (lineBase * discPct) / 100;
        const lineTaxable = Math.max(0, lineBase - lineDisc);
        const lineTax = (lineTaxable * taxPct) / 100;
        const lineTotal = lineTaxable + lineTax;
        const effCost = itemQty > 0 ? lineTotal / itemQty : 0;

        subtotalSum += lineTaxable;
        taxSum += lineTax;
        finalSum += lineTotal;

        return {
          itemCode: it.itemCode || "ITEM",
          itemDescription: it.itemName || it.description || "",
          category: it.category || "RAW_MATERIAL",
          uom: it.uom || "PCS",
          quotedQuantity: itemQty,
          unitRate: rate,
          discountPercent: discPct,
          discountAmount: lineDisc,
          taxType: `GST ${taxPct}%`,
          taxPercent: taxPct,
          taxAmount: lineTax,
          additionalCharges: 0,
          lineTotal: lineTotal,
          effectiveUnitCost: effCost
        };
      });

      // Determine reliable vendorCode
      let resolvedCode = bidVendorCode;
      if (!resolvedCode) {
        const foundInvited = (selectedRfq.selectedVendors || []).find(
          (v) => (v.name || v.supplier_name) === bidVendorName
        );
        if (foundInvited) resolvedCode = foundInvited.code || foundInvited.supplier_code;
        if (!resolvedCode) {
          const foundMaster = suppliers.find((s) => (s.supplier_name || s.supplierName) === bidVendorName);
          if (foundMaster) resolvedCode = foundMaster.supplier_code || foundMaster.supplierCode;
        }
        if (!resolvedCode) resolvedCode = `VEND-${Math.floor(100 + Math.random() * 900)}`;
      }

      const quotePayload = {
        quotationNumber: `QT-${Date.now().toString().slice(-6)}`,
        vendorRefNo: bidQuoteRef || selectedRfq.rfqNumber,
        vendorId: bidVendorId || null,
        vendorCode: resolvedCode,
        vendorName: bidVendorName,
        quotationDate: new Date().toISOString().split("T")[0],
        validUntil: selectedRfq.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        validityDate: selectedRfq.dueDate || new Date().toISOString().split("T")[0],
        prNumber: selectedRfq.prNumber || null,
        subtotalAmount: subtotalSum,
        taxAmount: taxSum,
        finalAmount: finalSum,
        currency: "INR",
        paymentTerms: selectedRfq.paymentTerms || "30 Days Credit",
        deliveryDays: Number(bidLeadDays) || 7,
        remarks: `Logged against RFQ #${selectedRfq.rfqNumber} • ${bidRemarks}`,
        items: computedItems
      };

      const res = await fetch(`${BASE_URL}/api/purchase/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotePayload)
      });

      if (res.ok) {
        showToast(`✅ Bid of ₹${rate}/unit recorded for ${bidVendorName}!`);
        // Update RFQ status to QUOTES_RECEIVED
        try {
          await fetch(`${BASE_URL}/api/purchase/rfq/status?id=${selectedRfq.id}&status=QUOTES_RECEIVED`, {
            method: "PUT"
          });
        } catch (stErr) {
          console.warn("Could not update RFQ status:", stErr);
        }
        setLogBidModalOpen(false);
        fetchRfqs();
        fetchQuotations();
      } else {
        let errMsg = "Failed to save quotation.";
        try {
          const errData = await res.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (jErr) {}
        alert(`Failed to save quotation: ${errMsg}`);
      }
    } catch (e) {
      console.error("Save Bid Error:", e);
      alert("Error saving bid.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Award RFQ to L1 / Selected Vendor and Navigate Directly to PO Creation
  const handleAwardAndGeneratePo = async (rfq, winningQuote) => {
    if (!winningQuote) {
      alert("No quotation selected for award.");
      return;
    }

    try {
      // 1. Mark RFQ as CLOSED / AWARDED
      await fetch(`${BASE_URL}/api/purchase/rfq/status?id=${rfq.id}&status=CLOSED`, {
        method: "PUT"
      });

      // 2. Prepare handoff data for PO Processing
      const prData = {
        pr_number: rfq.prNumber || "DIRECT-PR",
        department: rfq.department || "Purchase",
        purpose: rfq.title || "Materials Purchase",
        preferred_vendor: winningQuote.vendorName,
        items: (rfq.items || []).map((it) => ({
          item_code: it.itemCode,
          item_name: it.itemName,
          description: it.description,
          uom: it.uom || "PCS",
          req_qty: it.requiredQty,
          remaining_qty: it.requiredQty,
          ordered_qty: 0,
          est_rate: winningQuote.items && winningQuote.items[0] ? winningQuote.items[0].unitRate : winningQuote.finalAmount
        }))
      };

      sessionStorage.setItem("SMS_SELECTED_PR_FOR_PO", JSON.stringify(prData));
      sessionStorage.setItem("SMS_SELECTED_QUOTATION_FOR_PO", JSON.stringify(winningQuote));

      showToast(`🏆 Awarded RFQ #${rfq.rfqNumber} to ${winningQuote.vendorName}! Navigating to PO Processing...`);
      setWorkspaceModalOpen(false);
      if (onNavigate) {
        onNavigate("purchase-processing");
      }
    } catch (e) {
      console.error("Award Error:", e);
    }
  };

  // Copy WhatsApp / Email RFQ Inquiry Template
  const handleCopyInquiryText = (rfq) => {
    const itemsText = (rfq.items || [])
      .map((it, idx) => `${idx + 1}. ${it.itemName} (${it.itemCode}) — Qty: ${it.requiredQty} ${it.uom}`)
      .join("\n");

    const message =
      `*REQUEST FOR QUOTATION (RFQ) — Silver Muller Seals*\n` +
      `--------------------------------------------------\n` +
      `RFQ Ref: ${rfq.rfqNumber}\n` +
      `Issue Date: ${formatDate(rfq.rfqDate)}\n` +
      `Submission Deadline: ${formatDate(rfq.dueDate)}\n` +
      `Delivery Location: ${rfq.deliveryLocation || "Plant 1, IMT Manesar"}\n\n` +
      `*REQUIRED MATERIALS & SPECIFICATIONS:*\n${itemsText}\n\n` +
      `*TERMS & INSTRUCTIONS:*\n` +
      `- Please quote basic unit rate, GST percentage, and freight terms.\n` +
      `- Confirm minimum delivery lead time.\n` +
      `- Send reply quotation to: purchase@silvermullerseals.com\n\n` +
      `Thank you,\n` +
      `Purchase Department | Silver Muller Seals`;

    navigator.clipboard.writeText(message);
    showToast("📋 Copied RFQ enquiry message to clipboard! You can paste it into WhatsApp or Email.");
  };

  // Calculate matching quotes for selected RFQ
  const activeRfqQuotes = useMemo(() => {
    if (!selectedRfq) return [];
    return quotationsList.filter((q) => {
      const matchRfq = (q.vendorRefNo && q.vendorRefNo === selectedRfq.rfqNumber) || (q.remarks && q.remarks.includes(selectedRfq.rfqNumber));
      const matchPr = selectedRfq.prNumber && q.prNumber === selectedRfq.prNumber;
      return matchRfq || matchPr;
    });
  }, [selectedRfq, quotationsList]);

  // Find L1 (Lowest) Quote
  const l1Quote = useMemo(() => {
    if (activeRfqQuotes.length === 0) return null;
    return [...activeRfqQuotes].sort((a, b) => {
      const rateA = a.items && a.items[0] ? Number(a.items[0].unitRate) : Number(a.finalAmount || 999999);
      const rateB = b.items && b.items[0] ? Number(b.items[0].unitRate) : Number(b.finalAmount || 999999);
      return rateA - rateB;
    })[0];
  }, [activeRfqQuotes]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = rfqList.length;
    const openCount = rfqList.filter((r) => r.status === "OPEN" || r.status === "DRAFT").length;
    const sentCount = rfqList.filter((r) => r.status === "SENT").length;
    const quotesReceivedCount = rfqList.filter((r) => r.status === "QUOTES_RECEIVED").length;
    const closedCount = rfqList.filter((r) => r.status === "CLOSED").length;
    return {
      total,
      openCount,
      sentCount,
      quotesReceivedCount,
      closedCount,
      pendingPrsCount: approvedPrs.length
    };
  }, [rfqList, approvedPrs]);

  // Filtered RFQs for table
  const filteredRfqs = useMemo(() => {
    return rfqList.filter((rfq) => {
      if (statusFilter !== "ALL" && rfq.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const numMatch = (rfq.rfqNumber || "").toLowerCase().includes(term);
      const prMatch = (rfq.prNumber || "").toLowerCase().includes(term);
      const titleMatch = (rfq.title || "").toLowerCase().includes(term);
      const deptMatch = (rfq.department || "").toLowerCase().includes(term);
      const vendorMatch = (rfq.selectedVendorsJson || "").toLowerCase().includes(term);
      return numMatch || prMatch || titleMatch || deptMatch || vendorMatch;
    });
  }, [rfqList, statusFilter, searchTerm]);

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
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 999999,
            background: "#10b981",
            color: "#ffffff",
            padding: "12px 22px",
            borderRadius: 10,
            boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "slideIn 0.2s ease-out"
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          {toastMsg}
        </div>
      )}

      {/* Main Outer Card Container */}
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
          border: `1px solid ${borderCol}`,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          background: cardBg
        }}
      >
        {/* ROW 1: TOP TOOLBAR HEADER */}
        <div
          style={{
            flexShrink: 0,
            background: toolbarBg,
            borderBottom: `1px solid ${borderCol}`,
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }}
        >
          {/* Left Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  cursor: "pointer",
                  padding: "7px 12px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600
                }}
                title="Toggle Modules Navigation"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Modules</span>
              </button>
            )}

            {/* + Create RFQ Button */}
            <button
              onClick={handleOpenBlankCreateModal}
              id="btn-create-rfq-new"
              style={{
                background: "#1e293b",
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
                boxShadow: "0 2px 4px rgba(30, 41, 59, 0.25)"
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 900 }}>+</span>
              <span>Create RFQ</span>
            </button>

            {/* Approved PR Queue Switch Button */}
            <button
              onClick={() => setActiveTab("pending_pr")}
              style={{
                background: activeTab === "pending_pr" ? "#eff6ff" : "#ffffff",
                border: activeTab === "pending_pr" ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                color: activeTab === "pending_pr" ? "#1d4ed8" : "#334155",
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
              <span>Approved PR Queue</span>
              {metrics.pendingPrsCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 10
                  }}
                >
                  {metrics.pendingPrsCount}
                </span>
              )}
            </button>

            {/* RFQ Register Tab Button */}
            <button
              onClick={() => setActiveTab("register")}
              style={{
                background: activeTab === "register" ? "#eff6ff" : "#ffffff",
                border: activeTab === "register" ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                color: activeTab === "register" ? "#1d4ed8" : "#334155",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              RFQ Register ({metrics.total})
            </button>

            <span style={{ color: "#cbd5e1", margin: "0 4px", fontSize: 18 }}>|</span>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchRfqs();
                fetchApprovedPrs();
                fetchQuotations();
                showToast("Refreshed latest RFQs and bids from PostgreSQL.");
              }}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Refresh
            </button>
          </div>

          {/* Right Breadcrumbs */}
          <div style={{ fontSize: 13, fontWeight: 600, color: textSub }}>
            {onBackToHome ? (
              <span
                onClick={onBackToHome}
                style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline", marginRight: 4 }}
              >
                Purchase
              </span>
            ) : (
              <span style={{ marginRight: 4 }}>Purchase</span>
            )}
            <span style={{ margin: "0 6px", color: "#94a3b8" }}>&rsaquo;</span>
            <span style={{ color: textMain, fontWeight: 700 }}>Request for Quotation (RFQ)</span>
          </div>
        </div>

        {/* ROW 2: PURPOSE BANNER */}
        <div
          style={{
            background: "#eff6ff",
            borderBottom: "1px solid #bfdbfe",
            padding: "8px 18px",
            fontSize: 12,
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span>
              <strong>RFQ Purpose:</strong> Invite multiple suppliers to submit competitive rates for required materials. Log bids, compare in the L1 Matrix, and click <strong>"Award & Generate PO"</strong> to issue the order.
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, background: "#dbeafe", padding: "2px 8px", borderRadius: 12 }}>
            Competitive Bidding Engine
          </span>
        </div>

        {/* ROW 3: METRIC KPI TILES BANNER */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 12,
            padding: "12px 18px",
            background: dark ? "#0a0f1d" : "#f8fafc",
            borderBottom: `1px solid ${borderCol}`,
            flexShrink: 0
          }}
        >
          <div
            onClick={() => { setActiveTab("register"); setStatusFilter("ALL"); }}
            style={{
              background: cardBg,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${borderCol}`,
              cursor: "pointer",
              borderLeft: statusFilter === "ALL" && activeTab === "register" ? "3px solid #2563eb" : `1px solid ${borderCol}`
            }}
          >
            <div style={{ fontSize: 11, color: textSub, fontWeight: 700, letterSpacing: "0.02em" }}>TOTAL RFQS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: textMain, marginTop: 2 }}>{metrics.total}</div>
          </div>

          <div
            onClick={() => { setActiveTab("register"); setStatusFilter("OPEN"); }}
            style={{
              background: cardBg,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${borderCol}`,
              cursor: "pointer",
              borderLeft: statusFilter === "OPEN" ? "3px solid #d97706" : `1px solid ${borderCol}`
            }}
          >
            <div style={{ fontSize: 11, color: "#b45309", fontWeight: 700 }}>DRAFT / OPEN</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#92400e", marginTop: 2 }}>{metrics.openCount}</div>
          </div>

          <div
            onClick={() => { setActiveTab("register"); setStatusFilter("SENT"); }}
            style={{
              background: cardBg,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${borderCol}`,
              cursor: "pointer",
              borderLeft: statusFilter === "SENT" ? "3px solid #0284c7" : `1px solid ${borderCol}`
            }}
          >
            <div style={{ fontSize: 11, color: "#0369a1", fontWeight: 700 }}>ISSUED TO VENDORS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#075985", marginTop: 2 }}>{metrics.sentCount}</div>
          </div>

          <div
            onClick={() => { setActiveTab("register"); setStatusFilter("QUOTES_RECEIVED"); }}
            style={{
              background: cardBg,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${borderCol}`,
              cursor: "pointer",
              borderLeft: statusFilter === "QUOTES_RECEIVED" ? "3px solid #059669" : `1px solid ${borderCol}`
            }}
          >
            <div style={{ fontSize: 11, color: "#047857", fontWeight: 700 }}>BIDS LOGGED</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#065f46", marginTop: 2 }}>{metrics.quotesReceivedCount}</div>
          </div>

          <div
            onClick={() => { setActiveTab("register"); setStatusFilter("CLOSED"); }}
            style={{
              background: cardBg,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${borderCol}`,
              cursor: "pointer",
              borderLeft: statusFilter === "CLOSED" ? "3px solid #64748b" : `1px solid ${borderCol}`
            }}
          >
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>AWARDED / CLOSED</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#334155", marginTop: 2 }}>{metrics.closedCount}</div>
          </div>

          <div
            onClick={() => setActiveTab("pending_pr")}
            style={{
              background: dark ? "#1e1b4b" : "#f5f3ff",
              padding: "10px 14px",
              borderRadius: 8,
              border: dark ? "1px solid #3730a3" : "1px solid #ddd6fe",
              cursor: "pointer",
              borderLeft: activeTab === "pending_pr" ? "3px solid #6366f1" : "1px solid #ddd6fe"
            }}
          >
            <div style={{ fontSize: 11, color: "#6d28d9", fontWeight: 700 }}>PRS AWAITING RFQ</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#4c1d95", marginTop: 2 }}>{metrics.pendingPrsCount}</div>
          </div>
        </div>

        {/* ROW 4: SEARCH CONTROLS */}
        {activeTab === "register" && (
          <div
            style={{
              padding: "9px 18px",
              background: toolbarBg,
              borderBottom: `1px solid ${borderCol}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", width: 320 }}>
                <input
                  type="text"
                  placeholder="Search RFQ #, PR #, Supplier, Title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: inputBg,
                    border: `1px solid ${inputBorder}`,
                    borderRadius: 6,
                    color: textMain,
                    padding: "6px 12px 6px 32px",
                    fontSize: 12.5,
                    outline: "none"
                  }}
                />
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#94a3b8"
                  style={{ position: "absolute", left: 10, top: 9 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  borderRadius: 6,
                  color: textMain,
                  padding: "6px 10px",
                  fontSize: 12.5,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="ALL">All Statuses ({rfqList.length})</option>
                <option value="OPEN">Draft / Open ({metrics.openCount})</option>
                <option value="SENT">Issued / Sent ({metrics.sentCount})</option>
                <option value="QUOTES_RECEIVED">Bids Logged ({metrics.quotesReceivedCount})</option>
                <option value="CLOSED">Closed ({metrics.closedCount})</option>
              </select>
            </div>

            <div style={{ fontSize: 12, color: textSub }}>
              Showing <strong>{filteredRfqs.length}</strong> of {rfqList.length} inquiries
            </div>
          </div>
        )}

        {/* MAIN BODY TABLE */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: cardBg }}>
          {activeTab === "register" ? (
            <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, ...requestForQuotationPage1Resize.tableStyle }}>
              <ResizableColGroup columns={REQUEST_FOR_QUOTATION_PAGE_1_COLUMNS} widths={requestForQuotationPage1Resize.widths} />
              <thead>
                <tr style={{ background: tableHeadBg, color: tableHeadText, borderBottom: `1px solid ${borderCol}` }}>
                  <th style={{ padding: "10px 16px", fontWeight: 700 }}>RFQ #<ColumnResizeHandle colKey="rfq" resize={requestForQuotationPage1Resize} /></th>
                  <th style={{ padding: "10px 16px", fontWeight: 700 }}>Dates<ColumnResizeHandle colKey="dates" resize={requestForQuotationPage1Resize} /></th>
                  <th style={{ padding: "10px 16px", fontWeight: 700 }}>PR Ref<ColumnResizeHandle colKey="pr_ref" resize={requestForQuotationPage1Resize} /></th>
                  <th style={{ padding: "10px 16px", fontWeight: 700 }}>Title / Subject<ColumnResizeHandle colKey="title_subject" resize={requestForQuotationPage1Resize} /></th>
                  <th style={{ padding: "10px 16px", fontWeight: 700 }}>Invited Suppliers & Bids<ColumnResizeHandle colKey="invited_suppliers_bids" resize={requestForQuotationPage1Resize} /></th>
                  <th style={{ padding: "10px 16px", fontWeight: 700 }}>Items<ColumnResizeHandle colKey="items" resize={requestForQuotationPage1Resize} /></th>
                  <th style={{ padding: "10px 16px", fontWeight: 700 }}>Status<ColumnResizeHandle colKey="status" resize={requestForQuotationPage1Resize} /></th>
                  <th style={{ padding: "10px 16px", fontWeight: 700, textAlign: "right" }}>Actions<ColumnResizeHandle colKey="actions" resize={requestForQuotationPage1Resize} /></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: "center", color: textSub }}>
                      Loading RFQs from PostgreSQL...
                    </td>
                  </tr>
                ) : filteredRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 60, textAlign: "center" }}>
                      <div style={{ color: textMain, fontWeight: 700, fontSize: 15 }}>No Request for Quotations found.</div>
                      <div style={{ color: textSub, fontSize: 13, marginTop: 4 }}>
                        Click "+ Create RFQ" or select from the Approved PR Queue to issue supplier inquiries.
                      </div>
                      <button
                        onClick={handleOpenBlankCreateModal}
                        style={{
                          marginTop: 16,
                          background: "#1e293b",
                          color: "#ffffff",
                          border: "none",
                          padding: "8px 18px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        + Create First RFQ
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredRfqs.map((rfq) => {
                    let vendors = [];
                    try {
                      if (rfq.selectedVendorsJson) {
                        vendors = JSON.parse(rfq.selectedVendorsJson);
                      }
                    } catch (e) {
                      vendors = [];
                    }

                    const itemsCount = Array.isArray(rfq.items) ? rfq.items.length : 0;
                    const rfqBids = quotationsList.filter(
                      (q) => (q.vendorRefNo && q.vendorRefNo === rfq.rfqNumber) || (q.remarks && q.remarks.includes(rfq.rfqNumber))
                    );

                    return (
                      <tr
                        key={rfq.id}
                        style={{
                          borderBottom: `1px solid ${borderCol}`,
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = hoverRowBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* RFQ Number */}
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#2563eb" }}>
                          <span
                            onClick={() => handleOpenWorkspace(rfq)}
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                            title="Click to open full RFQ Workspace & Bidding Matrix"
                          >
                            {rfq.rfqNumber}
                          </span>
                          <div style={{ fontSize: 11, color: textSub, fontWeight: 400, marginTop: 1 }}>
                            {formatAuditDateTime(rfq.createdAt)}
                          </div>
                        </td>

                        {/* Date & Due Date */}
                        <td style={{ padding: "12px 16px", color: textMain }}>
                          <div>{formatDate(rfq.rfqDate)}</div>
                          <div style={{ fontSize: 11, color: "#d97706", fontWeight: 600, marginTop: 2 }}>
                            Due: {formatDate(rfq.dueDate)}
                          </div>
                        </td>

                        {/* PR Reference */}
                        <td style={{ padding: "12px 16px" }}>
                          {rfq.prNumber ? (
                            <div>
                              <span
                                style={{
                                  background: "#f1f5f9",
                                  color: "#1e293b",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  border: "1px solid #cbd5e1"
                                }}
                              >
                                {rfq.prNumber}
                              </span>
                              <div style={{ fontSize: 11, color: textSub, marginTop: 2 }}>
                                {rfq.department || "Purchase"}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: textSub, fontSize: 12 }}>Direct RFQ</span>
                          )}
                        </td>

                        {/* Title */}
                        <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                          <div style={{ fontWeight: 600, color: textMain, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {rfq.title || "Material RFQ"}
                          </div>
                          {rfq.remarks && (
                            <div style={{ fontSize: 11, color: textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {rfq.remarks}
                            </div>
                          )}
                        </td>

                        {/* Invited Suppliers & Bids */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 260 }}>
                            {vendors.map((v, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  border: "1px solid #cbd5e1"
                                }}
                              >
                                {v.name || v.code}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: rfqBids.length > 0 ? "#059669" : "#64748b", fontWeight: 600, marginTop: 3 }}>
                            {rfqBids.length > 0 ? `✅ ${rfqBids.length} Bid(s) Received` : `⏳ 0 Bids (${vendors.length} Invited)`}
                          </div>
                        </td>

                        {/* Items */}
                        <td style={{ padding: "12px 16px", color: textMain }}>
                          <span style={{ fontWeight: 700 }}>{itemsCount}</span> line item(s)
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background:
                                rfq.status === "CLOSED"
                                  ? "#f1f5f9"
                                  : rfq.status === "QUOTES_RECEIVED"
                                  ? "#ecfdf5"
                                  : rfq.status === "SENT"
                                  ? "#eff6ff"
                                  : "#fffbeb",
                              color:
                                rfq.status === "CLOSED"
                                  ? "#475569"
                                  : rfq.status === "QUOTES_RECEIVED"
                                  ? "#059669"
                                  : rfq.status === "SENT"
                                  ? "#2563eb"
                                  : "#d97706",
                              border:
                                rfq.status === "CLOSED"
                                  ? "1px solid #cbd5e1"
                                  : rfq.status === "QUOTES_RECEIVED"
                                  ? "1px solid #a7f3d0"
                                  : rfq.status === "SENT"
                                  ? "1px solid #bfdbfe"
                                  : "1px solid #fde68a"
                            }}
                          >
                            {rfq.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                            {/* Open Workspace / Manage Bids */}
                            <button
                              onClick={() => handleOpenWorkspace(rfq)}
                              style={{
                                background: "#1e293b",
                                border: "none",
                                color: "#ffffff",
                                padding: "6px 12px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 4
                              }}
                              title="Open Bidding Workspace, Compare Quotes & Award PO"
                            >
                              <span>⚡ Manage & Bids</span>
                            </button>

                            {/* Log Supplier Bid */}
                            <button
                              onClick={() => handleOpenLogBidModal(rfq)}
                              style={{
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                                color: "#1d4ed8",
                                padding: "5px 9px",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                              title="Record a supplier quotation against this RFQ"
                            >
                              + Log Bid
                            </button>

                            {/* View Voucher / Print */}
                            <button
                              onClick={() => {
                                setSelectedRfq({ ...rfq, selectedVendors: vendors });
                                setViewVoucherModalOpen(true);
                              }}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                color: "#0284c7",
                                padding: "5px 9px",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                              title="View Official RFQ Voucher"
                            >
                              Voucher
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* TAB 2: APPROVED PR QUEUE */
            <div>
              <div style={{ padding: "14px 18px", background: tableHeadBg, borderBottom: `1px solid ${borderCol}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: textMain }}>
                  Approved Requisitions Awaiting RFQ / Quotation
                </div>
                <div style={{ fontSize: 12, color: textSub, marginTop: 2 }}>
                  These Purchase Requisitions have passed operational approval and need supplier inquiries to obtain pricing.
                </div>
              </div>

              <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, ...requestForQuotationPage2Resize.tableStyle }}>
                <ResizableColGroup columns={REQUEST_FOR_QUOTATION_PAGE_2_COLUMNS} widths={requestForQuotationPage2Resize.widths} />
                <thead>
                  <tr style={{ background: tableHeadBg, color: tableHeadText, borderBottom: `1px solid ${borderCol}` }}>
                    <th style={{ padding: "10px 16px", fontWeight: 700 }}>PR #<ColumnResizeHandle colKey="pr" resize={requestForQuotationPage2Resize} /></th>
                    <th style={{ padding: "10px 16px", fontWeight: 700 }}>Date<ColumnResizeHandle colKey="date" resize={requestForQuotationPage2Resize} /></th>
                    <th style={{ padding: "10px 16px", fontWeight: 700 }}>Department<ColumnResizeHandle colKey="department" resize={requestForQuotationPage2Resize} /></th>
                    <th style={{ padding: "10px 16px", fontWeight: 700 }}>Purpose<ColumnResizeHandle colKey="purpose" resize={requestForQuotationPage2Resize} /></th>
                    <th style={{ padding: "10px 16px", fontWeight: 700 }}>Items<ColumnResizeHandle colKey="items" resize={requestForQuotationPage2Resize} /></th>
                    <th style={{ padding: "10px 16px", fontWeight: 700 }}>Status<ColumnResizeHandle colKey="status" resize={requestForQuotationPage2Resize} /></th>
                    <th style={{ padding: "10px 16px", fontWeight: 700, textAlign: "right" }}>Action<ColumnResizeHandle colKey="action" resize={requestForQuotationPage2Resize} /></th>
                  </tr>
                </thead>
                <tbody>
                  {approvedPrs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: "center", color: textSub }}>
                        No pending approved Purchase Requisitions found.
                      </td>
                    </tr>
                  ) : (
                    approvedPrs.map((pr) => {
                      const prNumber = pr.pr_number || pr.prNumber;
                      const items = pr.items || [];
                      return (
                        <tr
                          key={pr.id}
                          style={{ borderBottom: `1px solid ${borderCol}` }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = hoverRowBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#4f46e5" }}>
                            {prNumber}
                          </td>
                          <td style={{ padding: "12px 16px", color: textMain }}>
                            {formatDate(pr.pr_date || pr.prDate || pr.created_at)}
                          </td>
                          <td style={{ padding: "12px 16px", color: textMain }}>
                            {pr.department || "Operations"}
                          </td>
                          <td style={{ padding: "12px 16px", color: textMain }}>
                            {pr.purpose || pr.requirement_type || "Production raw materials"}
                          </td>
                          <td style={{ padding: "12px 16px", color: textMain }}>
                            <span style={{ fontWeight: 700 }}>{items.length}</span> item(s)
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                background: "#ecfdf5",
                                color: "#059669",
                                border: "1px solid #a7f3d0",
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700
                              }}
                            >
                              {pr.status || "APPROVED"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => handleInitCreateFromPr(pr)}
                              style={{
                                background: "#1e293b",
                                border: "none",
                                color: "#ffffff",
                                padding: "6px 14px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6
                              }}
                            >
                              <span>Generate RFQ</span>
                              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: INTERACTIVE RFQ WORKSPACE & L1 COMPARATIVE MATRIX                */}
      {/* ========================================================================= */}
      {workspaceModalOpen && selectedRfq && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(3px)",
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
              border: `1px solid ${borderCol}`,
              borderRadius: 12,
              width: "100%",
              maxWidth: 1060,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderBottom: `1px solid ${borderCol}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    RFQ Workspace &bull; {selectedRfq.rfqNumber}
                  </span>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12
                    }}
                  >
                    STATUS: {selectedRfq.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  {selectedRfq.title} &bull; Due Date: <strong>{formatDate(selectedRfq.dueDate)}</strong> &bull; {selectedRfq.prNumber ? `Linked to PR #${selectedRfq.prNumber}` : "Direct Enquiry"}
                </div>
              </div>

              {/* Quick Header Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => handleCopyInquiryText(selectedRfq)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                  title="Copy formatted RFQ text to send to suppliers via WhatsApp/Email"
                >
                  <span>📋 Copy WhatsApp/Email Text</span>
                </button>

                <button
                  onClick={() => {
                    setViewVoucherModalOpen(true);
                  }}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#0284c7",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Print Voucher
                </button>

                <button
                  onClick={() => setWorkspaceModalOpen(false)}
                  style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
                >
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* SECTION 1: L1 COMPARATIVE STATEMENT */}
              <div style={{ background: "#f8fafc", padding: 18, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                      Competitive Quotations Received ({activeRfqQuotes.length})
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Live rate comparison of all bids submitted by invited vendors for this RFQ.
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenLogBidModal(selectedRfq)}
                    style={{
                      background: "#2563eb",
                      border: "none",
                      color: "#ffffff",
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 2px 4px rgba(37, 99, 235, 0.3)"
                    }}
                  >
                    <span>+ Log Supplier Bid / Quote</span>
                  </button>
                </div>

                {activeRfqQuotes.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", background: "#ffffff", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>No quotes logged for this RFQ yet.</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      When vendors respond via email/WhatsApp, click <strong>"+ Log Supplier Bid / Quote"</strong> to record their pricing.
                    </div>
                    <button
                      onClick={() => handleOpenLogBidModal(selectedRfq)}
                      style={{
                        marginTop: 12,
                        background: "#1e293b",
                        color: "#fff",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Record First Bid Now
                    </button>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#ffffff", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", ...requestForQuotationPage3Resize.tableStyle }}>
                      <ResizableColGroup columns={REQUEST_FOR_QUOTATION_PAGE_3_COLUMNS} widths={requestForQuotationPage3Resize.widths} />
                      <thead>
                        <tr style={{ background: "#f1f5f9", color: "#475569", textAlign: "left" }}>
                          <th style={{ padding: "9px 12px", width: 50 }}>Rank<ColumnResizeHandle colKey="rank" resize={requestForQuotationPage3Resize} /></th>
                          <th style={{ padding: "9px 12px" }}>Supplier Name<ColumnResizeHandle colKey="supplier_name" resize={requestForQuotationPage3Resize} /></th>
                          <th style={{ padding: "9px 12px" }}>Quote Ref #<ColumnResizeHandle colKey="quote_ref" resize={requestForQuotationPage3Resize} /></th>
                          <th style={{ padding: "9px 12px", textAlign: "right" }}>Basic Rate (₹)<ColumnResizeHandle colKey="basic_rate" resize={requestForQuotationPage3Resize} /></th>
                          <th style={{ padding: "9px 12px", textAlign: "center" }}>GST %<ColumnResizeHandle colKey="gst" resize={requestForQuotationPage3Resize} /></th>
                          <th style={{ padding: "9px 12px", textAlign: "right" }}>Total Amount (₹)<ColumnResizeHandle colKey="total_amount" resize={requestForQuotationPage3Resize} /></th>
                          <th style={{ padding: "9px 12px", textAlign: "center" }}>Lead Time<ColumnResizeHandle colKey="lead_time" resize={requestForQuotationPage3Resize} /></th>
                          <th style={{ padding: "9px 12px", textAlign: "right" }}>Action<ColumnResizeHandle colKey="action" resize={requestForQuotationPage3Resize} /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...activeRfqQuotes]
                          .sort((a, b) => {
                            const rA = a.items && a.items[0] ? Number(a.items[0].unitRate) : Number(a.finalAmount);
                            const rB = b.items && b.items[0] ? Number(b.items[0].unitRate) : Number(b.finalAmount);
                            return rA - rB;
                          })
                          .map((quote, idx) => {
                            const isL1 = idx === 0;
                            const firstItem = (quote.items && quote.items[0]) || {};
                            const unitRate = firstItem.unitRate || (quote.finalAmount / (selectedRfq.items[0]?.requiredQty || 1));

                            return (
                              <tr
                                key={quote.id || idx}
                                style={{
                                  borderBottom: "1px solid #e2e8f0",
                                  background: isL1 ? "#f0fdf4" : "#ffffff"
                                }}
                              >
                                <td style={{ padding: "10px 12px", fontWeight: 800 }}>
                                  {isL1 ? (
                                    <span style={{ background: "#16a34a", color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>
                                      L1 WINNER
                                    </span>
                                  ) : (
                                    <span style={{ color: "#64748b" }}>L{idx + 1}</span>
                                  )}
                                </td>
                                <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                                  {quote.vendorName}
                                </td>
                                <td style={{ padding: "10px 12px", color: "#475569" }}>
                                  {quote.quotationNumber || quote.vendorRefNo}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: isL1 ? "#15803d" : "#0f172a" }}>
                                  ₹ {Number(unitRate).toFixed(2)}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569" }}>
                                  {firstItem.taxPercent || 18}%
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>
                                  ₹ {Number(quote.finalAmount || (unitRate * (selectedRfq.items[0]?.requiredQty || 1) * 1.18)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569" }}>
                                  {quote.deliveryDays || 7} Days
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                  <button
                                    onClick={() => handleAwardAndGeneratePo(selectedRfq, quote)}
                                    style={{
                                      background: isL1 ? "#16a34a" : "#2563eb",
                                      border: "none",
                                      color: "#ffffff",
                                      padding: "5px 12px",
                                      borderRadius: 5,
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      boxShadow: isL1 ? "0 2px 4px rgba(22, 163, 74, 0.3)" : "none"
                                    }}
                                  >
                                    {isL1 ? "Award & Create PO ➔" : "Award This Quote"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 2: INVITED SUPPLIERS STATUS */}
              <div style={{ background: "#ffffff", padding: 18, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                  Invited Suppliers Roster ({(selectedRfq.selectedVendors || []).length})
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                  Vendors invited to quote for this requirement:
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {(selectedRfq.selectedVendors || []).map((vendor, idx) => {
                    const hasQuoted = activeRfqQuotes.some(
                      (q) => q.vendorName === (vendor.name || vendor.supplier_name) || String(q.vendorId) === String(vendor.id)
                    );

                    return (
                      <div
                        key={idx}
                        style={{
                          background: hasQuoted ? "#f0fdf4" : "#f8fafc",
                          border: hasQuoted ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                            {vendor.name || vendor.supplier_name}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            {vendor.code} {vendor.city ? `• ${vendor.city}` : ""}
                          </div>
                        </div>

                        <div>
                          {hasQuoted ? (
                            <span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                              ✓ Quoted
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenLogBidModal(selectedRfq, vendor)}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                color: "#2563eb",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 4,
                                cursor: "pointer"
                              }}
                            >
                              Log Bid
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: ITEMS & SPECIFICATIONS */}
              <div style={{ background: "#ffffff", padding: 18, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                  Items Schedule & Requirements ({(selectedRfq.items || []).length})
                </div>

                <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, ...requestForQuotationPage4Resize.tableStyle }}>
                  <ResizableColGroup columns={REQUEST_FOR_QUOTATION_PAGE_4_COLUMNS} widths={requestForQuotationPage4Resize.widths} />
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "8px 10px", width: 40 }}>#<ColumnResizeHandle colKey="sr" resize={requestForQuotationPage4Resize} /></th>
                      <th style={{ padding: "8px 10px" }}>Item Code<ColumnResizeHandle colKey="item_code" resize={requestForQuotationPage4Resize} /></th>
                      <th style={{ padding: "8px 10px" }}>Description<ColumnResizeHandle colKey="description" resize={requestForQuotationPage4Resize} /></th>
                      <th style={{ padding: "8px 10px", textAlign: "center" }}>UOM<ColumnResizeHandle colKey="uom" resize={requestForQuotationPage4Resize} /></th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Req Qty<ColumnResizeHandle colKey="req_qty" resize={requestForQuotationPage4Resize} /></th>
                      <th style={{ padding: "8px 10px" }}>Technical Notes<ColumnResizeHandle colKey="technical_notes" resize={requestForQuotationPage4Resize} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRfq.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0f172a" }}>{it.itemCode}</td>
                        <td style={{ padding: "8px 10px" }}>{it.itemName}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.uom}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>{it.requiredQty}</td>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{it.remarks || "Standard specifications"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 24px",
                background: "#f8fafc",
                borderTop: `1px solid ${borderCol}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <button
                onClick={() => setWorkspaceModalOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {l1Quote && (
                  <button
                    onClick={() => handleAwardAndGeneratePo(selectedRfq, l1Quote)}
                    style={{
                      background: "#16a34a",
                      border: "none",
                      color: "#ffffff",
                      padding: "8px 20px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(22, 163, 74, 0.4)"
                    }}
                  >
                    🏆 Award to L1 ({l1Quote.vendorName}) &amp; Create PO ➔
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LOG SUPPLIER BID / QUOTATION MODAL                              */}
      {/* ========================================================================= */}
      {logBidModalOpen && selectedRfq && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110000,
            padding: 20
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              width: "100%",
              maxWidth: 580,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              overflow: "hidden"
            }}
          >
            <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Log Supplier Bid</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Record quotation rates for RFQ #{selectedRfq.rfqNumber}</div>
              </div>
              <button onClick={() => setLogBidModalOpen(false)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
                &times;
              </button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                  SELECT SUPPLIER *
                </label>
                <select
                  value={bidVendorName}
                  onChange={(e) => {
                    const selName = e.target.value;
                    setBidVendorName(selName);
                    const foundInvited = (selectedRfq.selectedVendors || []).find(
                      (v) => (v.name || v.supplier_name) === selName
                    );
                    if (foundInvited) {
                      setBidVendorId(foundInvited.id || "");
                      setBidVendorCode(foundInvited.code || foundInvited.supplier_code || "VEND-001");
                      return;
                    }
                    const foundMaster = suppliers.find((s) => (s.supplier_name || s.supplierName) === selName);
                    if (foundMaster) {
                      setBidVendorId(foundMaster.id || "");
                      setBidVendorCode(foundMaster.supplier_code || foundMaster.supplierCode || "VEND-001");
                    } else {
                      setBidVendorCode("VEND-" + Math.floor(100 + Math.random() * 900));
                    }
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none"
                  }}
                >
                  <option value="">-- Choose Supplier --</option>
                  {(selectedRfq.selectedVendors || []).map((v) => (
                    <option key={v.id} value={v.name || v.supplier_name}>
                      [Invited] {v.name || v.supplier_name} ({v.code})
                    </option>
                  ))}
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.supplier_name || s.supplierName}>
                      {s.supplier_name || s.supplierName} ({s.supplier_code || s.supplierCode})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                    QUOTED BASIC RATE (₹/Unit) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 24.50"
                    value={bidUnitRate}
                    onChange={(e) => setBidUnitRate(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid #3b82f6",
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#1d4ed8",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                    VENDOR QUOTE REF #
                  </label>
                  <input
                    type="text"
                    value={bidQuoteRef}
                    onChange={(e) => setBidQuoteRef(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                    DISCOUNT %
                  </label>
                  <input
                    type="number"
                    value={bidDiscountPct}
                    onChange={(e) => setBidDiscountPct(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "7px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                    GST %
                  </label>
                  <select
                    value={bidTaxPct}
                    onChange={(e) => setBidTaxPct(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "7px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                  >
                    <option value="18">18% GST</option>
                    <option value="12">12% GST</option>
                    <option value="5">5% GST</option>
                    <option value="28">28% GST</option>
                    <option value="0">0% Exempt</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                    LEAD TIME (Days)
                  </label>
                  <input
                    type="number"
                    value={bidLeadDays}
                    onChange={(e) => setBidLeadDays(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "7px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                  REMARKS / COMMERCIAL CONDITIONS
                </label>
                <input
                  type="text"
                  placeholder="Freight paid, test certificate included..."
                  value={bidRemarks}
                  onChange={(e) => setBidRemarks(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setLogBidModalOpen(false)}
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", padding: "7px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                disabled={actionInProgress}
                onClick={handleSaveLoggedBid}
                style={{ background: "#2563eb", border: "none", color: "#fff", padding: "7px 18px", borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >
                {actionInProgress ? "Saving..." : "Save Bid & Update Matrix ➔"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE RFQ MODAL                                                */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
            padding: 20
          }}
        >
          <div
            style={{
              background: modalBoxBg,
              border: `1px solid ${borderCol}`,
              borderRadius: 12,
              width: "96vw",
              maxWidth: 1180,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                padding: "14px 22px",
                background: "#f8fafc",
                borderBottom: `1px solid ${borderCol}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Create Request for Quotation (RFQ)
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {formPrNumber ? `Linked to Requisition #${formPrNumber}` : "Direct Material Inquiry"} &bull; Saves directly into PostgreSQL
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: 22, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    RFQ NUMBER *
                  </label>
                  <input
                    type="text"
                    value={formRfqNumber}
                    onChange={(e) => setFormRfqNumber(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, color: "#0f172a", fontWeight: 700, padding: "8px 10px", fontSize: 13, outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    ISSUE DATE *
                  </label>
                  <DateInput
                    value={formRfqDate}
                    onChange={(e) => setFormRfqDate(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, color: "#0f172a", padding: "8px 10px", fontSize: 13, outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    SUBMISSION DUE DATE *
                  </label>
                  <DateInput
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid #f59e0b", borderRadius: 6, color: "#b45309", fontWeight: 700, padding: "8px 10px", fontSize: 13, outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    REQUISITION (PR) REF
                  </label>
                  <input
                    type="text"
                    placeholder="Optional PR-xxx"
                    value={formPrNumber}
                    onChange={(e) => setFormPrNumber(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, color: "#4f46e5", fontWeight: 600, padding: "8px 10px", fontSize: 13, outline: "none" }}
                  />
                </div>
              </div>

              {/* Title & Dept */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    INQUIRY TITLE / SUBJECT *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Inquiring best rates for Rubber & Steel Rod raw materials"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, color: "#0f172a", padding: "8px 10px", fontSize: 13, outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    DEPARTMENT
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, color: "#0f172a", padding: "8px 10px", fontSize: 13, outline: "none" }}
                  />
                </div>
              </div>

              {/* Suppliers Multi-Select */}
              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                      Invite Suppliers from Supplier Master ({formSelectedVendors.length} selected)
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>
                      Select which registered vendors will receive this inquiry quotation request.
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Search supplier name, code, city..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    style={{ width: 250, boxSizing: "border-box", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, color: "#0f172a", padding: "5px 10px", fontSize: 11.5, outline: "none" }}
                  />
                </div>

                <div style={{ maxHeight: 140, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, background: "#ffffff", padding: 10, borderRadius: 6, border: "1px solid #cbd5e1" }}>
                  {suppliers
                    .filter((s) => {
                      if (!vendorSearch) return true;
                      const term = vendorSearch.toLowerCase();
                      const name = (s.supplier_name || s.supplierName || "").toLowerCase();
                      const code = (s.supplier_code || s.supplierCode || "").toLowerCase();
                      return name.includes(term) || code.includes(term);
                    })
                    .map((vendor) => {
                      const isSelected = formSelectedVendors.some((v) => v.id === vendor.id);
                      const code = vendor.supplier_code || vendor.supplierCode || `SUP-${vendor.id}`;
                      const name = vendor.supplier_name || vendor.supplierName || "Supplier";
                      return (
                        <div
                          key={vendor.id}
                          onClick={() => handleToggleVendor(vendor)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 10px",
                            borderRadius: 4,
                            background: isSelected ? "#eff6ff" : "#ffffff",
                            border: isSelected ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                            cursor: "pointer"
                          }}
                        >
                          <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ cursor: "pointer" }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#1d4ed8" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {name}
                            </div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{code} {vendor.city ? `• ${vendor.city}` : ""}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Items Table with Item Master Dropdown & Search Dialog */}
              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                      Requested Items &amp; Specifications ({formItems.length})
                    </div>
                    <span style={{ fontSize: 11, background: "#e0f2fe", color: "#0284c7", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                      Connected to Item Master ({itemsCatalog.length} items)
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Search filter for Item Master dropdowns */}
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="🔍 Filter Item Master items..."
                        value={catalogSearchFilter}
                        onChange={(e) => setCatalogSearchFilter(e.target.value)}
                        style={{
                          width: 230,
                          boxSizing: "border-box",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          color: "#0f172a",
                          padding: "5px 24px 5px 9px",
                          fontSize: 11.5,
                          outline: "none"
                        }}
                      />
                      {catalogSearchFilter && (
                        <span
                          onClick={() => setCatalogSearchFilter("")}
                          style={{
                            position: "absolute",
                            right: 7,
                            top: "50%",
                            transform: "translateY(-50%)",
                            cursor: "pointer",
                            color: "#64748b",
                            fontSize: 13,
                            fontWeight: 700
                          }}
                        >
                          &times;
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      style={{
                        background: "#1e293b",
                        border: "none",
                        color: "#ffffff",
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <span>+ Add Item Row</span>
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: 6, background: "#ffffff" }}>
                  <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 980, ...requestForQuotationPage5Resize.tableStyle }}>
                    <ResizableColGroup columns={REQUEST_FOR_QUOTATION_PAGE_5_COLUMNS} widths={requestForQuotationPage5Resize.widths} />
                    <thead>
                      <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "2px solid #cbd5e1", textAlign: "left" }}>
                        <th style={{ padding: "10px 8px", width: 40, textAlign: "center", fontWeight: 700 }}>#<ColumnResizeHandle colKey="sr" resize={requestForQuotationPage5Resize} /></th>
                        <th style={{ padding: "10px 8px", width: 280, fontWeight: 700 }}>Item Code (Item Master) *<ColumnResizeHandle colKey="item_code_item_master" resize={requestForQuotationPage5Resize} /></th>
                        <th style={{ padding: "10px 8px", minWidth: 240, fontWeight: 700 }}>Item Description / Name *<ColumnResizeHandle colKey="item_description_name" resize={requestForQuotationPage5Resize} /></th>
                        <th style={{ padding: "10px 8px", width: 95, fontWeight: 700, textAlign: "center" }}>UOM *<ColumnResizeHandle colKey="uom" resize={requestForQuotationPage5Resize} /></th>
                        <th style={{ padding: "10px 8px", width: 95, fontWeight: 700, textAlign: "right" }}>Req Qty *<ColumnResizeHandle colKey="req_qty" resize={requestForQuotationPage5Resize} /></th>
                        <th style={{ padding: "10px 8px", minWidth: 160, fontWeight: 700 }}>Technical Specs / Notes<ColumnResizeHandle colKey="technical_specs_notes" resize={requestForQuotationPage5Resize} /></th>
                        <th style={{ padding: "10px 8px", width: 95, textAlign: "center", fontWeight: 700 }}>Action<ColumnResizeHandle colKey="action" resize={requestForQuotationPage5Resize} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item, idx) => {
                        const currentSearchText = rowSearchQueries[idx] !== undefined ? rowSearchQueries[idx] : "";
                        const isDropdownOpen = rowSearchOpenIdx === idx;
                        
                        // Filter catalog items for this row's search query
                        const matchingItems = (itemsCatalog || []).filter((it) => {
                          if (!currentSearchText.trim()) return true;
                          const q = currentSearchText.toLowerCase();
                          const c = (it.item_code || it.code || "").toLowerCase();
                          const n = (it.item_name || it.description || "").toLowerCase();
                          const cat = (it.category || "").toLowerCase();
                          return c.includes(q) || n.includes(q) || cat.includes(q);
                        }).slice(0, 50);

                        const allUoms = ["PCS", "NOS", "KGS", "MTR", "SET", "LTR", "ROLL", "BOX", "PKT", "PAIR", "DOZ", "BAG", "EA", "MTRS", "KG", "MTR."];
                        const uomValue = item.uom || "PCS";
                        const showCustomUom = !allUoms.includes(uomValue);

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe" }}>
                            <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 800, color: "#64748b" }}>
                              {idx + 1}
                            </td>

                            {/* 1. Item Code Dropdown & Searchable Combobox from Item Master */}
                            <td style={{ padding: "8px", verticalAlign: "top", overflow: "visible" }}>
                              <div style={{ position: "relative" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <input
                                    type="text"
                                    placeholder="🔍 Search code or name..."
                                    value={rowSearchQueries[idx] !== undefined ? rowSearchQueries[idx] : (item.itemCode || "")}
                                    onFocus={() => {
                                      setRowSearchOpenIdx(idx);
                                      if (rowSearchQueries[idx] === undefined) {
                                        setRowSearchQueries((prev) => ({ ...prev, [idx]: item.itemCode || "" }));
                                      }
                                    }}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setRowSearchQueries((prev) => ({ ...prev, [idx]: val }));
                                      handleItemChange(idx, "itemCode", val);
                                      setRowSearchOpenIdx(idx);
                                    }}
                                    style={{
                                      width: "100%",
                                      boxSizing: "border-box",
                                      background: "#ffffff",
                                      border: item.itemCode ? "1px solid #3b82f6" : "2px solid #f59e0b",
                                      borderRadius: 5,
                                      color: "#0f172a",
                                      padding: "7px 9px",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      outline: "none"
                                    }}
                                  />

                                  {/* Toggle dropdown button */}
                                  <button
                                    type="button"
                                    title="Browse Item Master"
                                    onClick={() => setRowSearchOpenIdx((prev) => (prev === idx ? null : idx))}
                                    style={{
                                      background: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: 5,
                                      padding: "6px 8px",
                                      cursor: "pointer",
                                      color: "#475569",
                                      fontSize: 11,
                                      flexShrink: 0
                                    }}
                                  >
                                    ▼
                                  </button>

                                  {/* Full Search Dialog Modal Trigger */}
                                  <button
                                    type="button"
                                    title="Open Full Item Master Catalog Dialog"
                                    onClick={() => {
                                      setActiveItemPickerRow(idx);
                                      setPickerSearchTerm(item.itemCode || item.itemName || "");
                                      setPickerCategoryTab("ALL");
                                    }}
                                    style={{
                                      background: "#eff6ff",
                                      border: "1px solid #bfdbfe",
                                      borderRadius: 5,
                                      padding: "6px 8px",
                                      color: "#2563eb",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}
                                  >
                                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                  </button>
                                </div>

                                {/* Floating Dropdown Menu */}
                                {isDropdownOpen && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      left: 0,
                                      right: 0,
                                      zIndex: 99999,
                                      marginTop: 3,
                                      maxHeight: 250,
                                      overflowY: "auto",
                                      background: "#ffffff",
                                      border: "1px solid #3b82f6",
                                      borderRadius: 6,
                                      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                                      padding: 0
                                    }}
                                  >
                                    <div style={{ padding: "6px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b" }}>
                                        Item Master ({matchingItems.length} found)
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setRowSearchOpenIdx(null)}
                                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                                      >
                                        &times;
                                      </button>
                                    </div>

                                    {matchingItems.length === 0 ? (
                                      <div style={{ padding: "12px 14px", fontSize: 12, color: "#64748b", textAlign: "center" }}>
                                        No items found matching "{currentSearchText}".
                                        <div style={{ marginTop: 4, fontSize: 11, color: "#0284c7" }}>
                                          You can enter a custom item code or click 🔍 to view all items.
                                        </div>
                                      </div>
                                    ) : (
                                      matchingItems.map((masterIt) => (
                                        <div
                                          key={masterIt.id || masterIt.item_code}
                                          onClick={() => {
                                            handleSelectItemForLine(idx, masterIt);
                                            setRowSearchQueries((prev) => ({ ...prev, [idx]: undefined }));
                                            setRowSearchOpenIdx(null);
                                          }}
                                          style={{
                                            padding: "8px 10px",
                                            cursor: "pointer",
                                            borderBottom: "1px solid #f1f5f9",
                                            transition: "background 0.1s ease"
                                          }}
                                          onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                                          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                                        >
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                            <span style={{ fontWeight: 800, fontSize: 12, color: "#0284c7" }}>
                                              {masterIt.item_code}
                                            </span>
                                            <span style={{ fontSize: 10, background: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                              {masterIt.category || "Item"}
                                            </span>
                                          </div>
                                          <div style={{ fontSize: 11, color: "#334155", marginTop: 2, fontWeight: 600 }}>
                                            {masterIt.item_name}
                                          </div>
                                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                                            UOM: {masterIt.uom || "PCS"}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 2. Item Description / Name (Editable) */}
                            <td style={{ padding: "8px", verticalAlign: "top" }}>
                              <input
                                type="text"
                                placeholder="Item description / name *"
                                value={item.itemName || item.description || ""}
                                onChange={(e) => {
                                  handleItemChange(idx, "itemName", e.target.value);
                                  handleItemChange(idx, "description", e.target.value);
                                }}
                                style={{
                                  width: "100%",
                                  boxSizing: "border-box",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 5,
                                  color: "#0f172a",
                                  padding: "7px 9px",
                                  fontSize: 12,
                                  outline: "none"
                                }}
                              />
                              {item.category && (
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>
                                  Category: <span style={{ fontWeight: 700, color: "#0284c7" }}>{item.category}</span>
                                </div>
                              )}
                            </td>

                            {/* 3. UOM (Editable) */}
                            <td style={{ padding: "8px", verticalAlign: "top" }}>
                              <select
                                value={uomValue}
                                onChange={(e) => handleItemChange(idx, "uom", e.target.value)}
                                style={{
                                  width: "100%",
                                  boxSizing: "border-box",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 5,
                                  color: "#0f172a",
                                  padding: "7px 6px",
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  textAlign: "center",
                                  outline: "none"
                                }}
                              >
                                {showCustomUom && <option value={uomValue}>{uomValue}</option>}
                                {allUoms.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>

                            {/* 4. Req Qty (Editable) */}
                            <td style={{ padding: "8px", verticalAlign: "top" }}>
                              <input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={item.requiredQty !== undefined ? item.requiredQty : 1}
                                onChange={(e) => handleItemChange(idx, "requiredQty", e.target.value)}
                                style={{
                                  width: "100%",
                                  boxSizing: "border-box",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 5,
                                  color: "#0284c7",
                                  fontWeight: 800,
                                  padding: "7px 9px",
                                  fontSize: 13,
                                  textAlign: "right",
                                  outline: "none"
                                }}
                              />
                            </td>

                            {/* 5. Technical Specs / Notes (Editable) */}
                            <td style={{ padding: "8px", verticalAlign: "top" }}>
                              <input
                                type="text"
                                placeholder="Tolerance, grade, finish, MTC..."
                                value={item.remarks || ""}
                                onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                                style={{
                                  width: "100%",
                                  boxSizing: "border-box",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 5,
                                  color: "#0f172a",
                                  padding: "7px 9px",
                                  fontSize: 12,
                                  outline: "none"
                                }}
                              />
                            </td>

                            {/* 6. Action: Delete / Remove Button */}
                            <td style={{ padding: "8px", textAlign: "center", verticalAlign: "top" }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                title="Remove this item row"
                                style={{
                                  background: "#fee2e2",
                                  border: "1px solid #f87171",
                                  color: "#b91c1c",
                                  borderRadius: 6,
                                  padding: "6px 12px",
                                  cursor: "pointer",
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  whiteSpace: "nowrap",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fecaca")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#fee2e2")}
                              >
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Remove</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ padding: "14px 22px", background: "#f8fafc", borderTop: `1px solid ${borderCol}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  disabled={actionInProgress}
                  onClick={() => handleSaveRfq(false)}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#1e293b", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: actionInProgress ? "not-allowed" : "pointer" }}
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={actionInProgress}
                  onClick={() => handleSaveRfq(true)}
                  style={{ background: "#1e293b", border: "none", color: "#ffffff", padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: actionInProgress ? "not-allowed" : "pointer", boxShadow: "0 2px 4px rgba(30, 41, 59, 0.25)" }}
                >
                  {actionInProgress ? "Saving..." : "Save & Mark Issued ➔"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEARCHABLE ITEM MASTER DIALOG MODAL                                      */}
      {/* ========================================================================= */}
      {activeItemPickerRow !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200000,
            padding: 20
          }}
          onClick={() => setActiveItemPickerRow(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: "100%",
              maxWidth: 750,
              maxHeight: "86vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
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
                  Item Master Searchable Catalog
                </div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  Select Item for Line #{activeItemPickerRow + 1}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveItemPickerRow(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer", fontWeight: 700, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Search Bar & Category Filter Tabs */}
            <div style={{ padding: "14px 22px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="🔍 Type Item Code or Description (e.g. STEEL, 945, BOLT, NBR, SHELL)..."
                  value={pickerSearchTerm}
                  onChange={(e) => setPickerSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 36px 10px 14px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0f172a",
                    outline: "none"
                  }}
                />
                {pickerSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setPickerSearchTerm("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      fontSize: 16,
                      fontWeight: 700
                    }}
                  >
                    &times;
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { id: "ALL", label: `All Items (${itemsCatalog.length})` },
                    { id: "RAW", label: `📦 Raw Materials & Parts (${categorizedMasterItems.rawAndOther.length})` },
                    { id: "FG", label: `⚙️ Oil Seals (${categorizedMasterItems.finishedGoods.length})` }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPickerCategoryTab(tab.id)}
                      style={{
                        background: pickerCategoryTab === tab.id ? "#1e293b" : "#ffffff",
                        color: pickerCategoryTab === tab.id ? "#ffffff" : "#475569",
                        border: pickerCategoryTab === tab.id ? "1px solid #1e293b" : "1px solid #cbd5e1",
                        borderRadius: 4,
                        padding: "5px 12px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  Showing <strong>{pickerFilteredItems.length}</strong> matching item(s)
                </div>
              </div>
            </div>

            {/* Results List */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12 }}>
              {pickerFilteredItems.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>No matching items found in Item Master</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Try typing a partial code like "STEEL", "945", "NBR", "HEX", or "SHELL"</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {pickerFilteredItems.map((it) => (
                    <div
                      key={it.item_code}
                      onClick={() => {
                        handleSelectItemForLine(activeItemPickerRow, it);
                        setActiveItemPickerRow(null);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#eff6ff";
                        e.currentTarget.style.borderColor = "#93c5fd";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ffffff";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 800, color: "#0f172a", fontFamily: "monospace", fontSize: 13 }}>
                            {it.item_code}
                          </span>
                          <span style={{ fontSize: 10.5, background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                            {it.category || "General"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>
                          {it.item_name}
                        </div>
                      </div>

                      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0284c7", background: "#f0f9ff", padding: "3px 8px", borderRadius: 4 }}>
                          {it.uom || "PCS"}
                        </span>
                        <button
                          type="button"
                          style={{
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 4,
                            padding: "6px 14px",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Select ➔
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 22px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setActiveItemPickerRow(null)}
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VIEW VOUCHER / PRINT                                            */}
      {/* ========================================================================= */}
      {viewVoucherModalOpen && selectedRfq && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120000,
            padding: 20
          }}
        >
          <div style={{ background: "#ffffff", color: "#0f172a", borderRadius: 12, width: "100%", maxWidth: 860, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)", overflow: "hidden" }}>
            <div className="no-print" style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>RFQ Inquiry Letter &bull; #{selectedRfq.rfqNumber}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => window.print()} style={{ background: "#1e293b", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Print Voucher
                </button>
                <button onClick={() => setViewVoucherModalOpen(false)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
                  &times;
                </button>
              </div>
            </div>

            <div style={{ padding: 32, overflowY: "auto", flex: 1, fontSize: 12, color: "#1e293b", lineHeight: 1.5, background: "#ffffff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>SILVER MULLER SEALS</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Plot 42, Sector 8, IMT Manesar, Gurugram, Haryana - 122050</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>Email: purchase@silvermullerseals.com | Tel: +91 124 4567890</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#2563eb" }}>REQUEST FOR QUOTATION (RFQ)</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>RFQ No: {selectedRfq.rfqNumber}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>Date: {formatDate(selectedRfq.rfqDate)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>Submission Due: {formatDate(selectedRfq.dueDate)}</div>
                </div>
              </div>

              <div style={{ margin: "16px 0", background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Subject: {selectedRfq.title}</div>
                {selectedRfq.prNumber && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>PR Reference: <strong>{selectedRfq.prNumber}</strong> ({selectedRfq.department})</div>}
              </div>

              <div style={{ margin: "18px 0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 6 }}>SCHEDULE OF REQUIREMENTS:</div>
                <table className="resizable-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, ...requestForQuotationPage6Resize.tableStyle }}>
                  <ResizableColGroup columns={REQUEST_FOR_QUOTATION_PAGE_6_COLUMNS} widths={requestForQuotationPage6Resize.widths} />
                  <thead>
                    <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", width: 35 }}>#<ColumnResizeHandle colKey="sr" resize={requestForQuotationPage6Resize} /></th>
                      <th style={{ padding: "8px 10px", textAlign: "left", width: 120 }}>Item Code<ColumnResizeHandle colKey="item_code" resize={requestForQuotationPage6Resize} /></th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Description & Specifications<ColumnResizeHandle colKey="description_specificatio" resize={requestForQuotationPage6Resize} /></th>
                      <th style={{ padding: "8px 10px", textAlign: "center", width: 60 }}>UOM<ColumnResizeHandle colKey="uom" resize={requestForQuotationPage6Resize} /></th>
                      <th style={{ padding: "8px 10px", textAlign: "right", width: 80 }}>Req Qty<ColumnResizeHandle colKey="req_qty" resize={requestForQuotationPage6Resize} /></th>
                      <th style={{ padding: "8px 10px", textAlign: "right", width: 100 }}>Quoted Rate (₹)<ColumnResizeHandle colKey="quoted_rate" resize={requestForQuotationPage6Resize} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRfq.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 10px" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700 }}>{it.itemCode}</td>
                        <td style={{ padding: "8px 10px" }}>{it.itemName}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.uom}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>{it.requiredQty}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#94a3b8" }}>[ Fill ]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ margin: "16px 0", background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>TERMS & INSTRUCTIONS:</div>
                <div style={{ fontSize: 11, color: "#334155", marginTop: 4, whiteSpace: "pre-line" }}>{selectedRfq.termsConditions || "Standard terms apply."}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 16 }}>
                <div style={{ borderTop: "1px solid #0f172a", width: 180, paddingTop: 6, textAlign: "center", fontWeight: 600, fontSize: 11 }}>
                  Prepared By<br /><span style={{ fontSize: 10, color: "#64748b" }}>Purchase Officer</span>
                </div>
                <div style={{ borderTop: "1px solid #0f172a", width: 180, paddingTop: 6, textAlign: "center", fontWeight: 600, fontSize: 11 }}>
                  Authorized Signatory<br /><span style={{ fontSize: 10, color: "#64748b" }}>Head of Materials</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestForQuotationPage;
