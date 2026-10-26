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
  Building2,
  ShieldCheck,
  MapPin,
  UserCheck,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  CreditCard,
  Briefcase,
  Globe,
  Share2
} from "lucide-react";

const INITIAL_CUSTOMER_FORM = {
  // Tab 1: All 22 Excel Sheet Attributes
  checkByAccounts: false,
  customerCode: "", // Code
  checkBySales: true,
  customerName: "",
  billToAddress: "",
  customerAlias: "", // Customer Alias Short Name
  state: "",
  country: "India",
  shipToAddress: "", // Ship To on Address
  billingSource: "Direct",
  gstin: "", // GST
  city: "",
  domesticExport: "Domestic", // Domestic / Export
  supplierCodeSms: "",
  salesPerson: "", // Sale Person
  salesContact: "", // Sale Contact
  salesEmail: "", // Sale Email
  modeOfPaymentReminder: "E-Mail",
  accountsContactDetails: "", // Accounts Person Name - Contact No. -Mail id
  creditDays: 30, // Credit Days
  scm: "", // SCM
  customerAddress: "", // Customer Address

  // Tab 2: Rest of System Attributes (Point 2)
  customerId: "",
  companyId: "COMP-001",
  marketType: "Domestic",
  customerCategory: "OEM",
  customerGroup: "Automotive",
  customerType: "OEM",
  pan: "",
  gstRegistrationType: "REGISTERED",
  udyamNo: "",
  msmeCategory: "NOT_MSME",
  paymentTermsId: "PT-30",
  currency: "INR",
  creditLimit: "500000.00",
  status: "Active",
  stateCode: "",
  pincode: "",
  address: ""
};

const MARKET_TYPE_OPTIONS = [
  { value: "Domestic", label: "Domestic" },
  { value: "Export", label: "Export" }
];

const CUSTOMER_CATEGORY_OPTIONS = [
  { value: "OEM", label: "OEM" },
  { value: "Market", label: "Market" },
  { value: "Distributor", label: "Distributor" },
  { value: "Dealer", label: "Dealer" }
];

const CUSTOMER_GROUP_OPTIONS = [
  { value: "Automotive", label: "Automotive" },
  { value: "Industrial", label: "Industrial" },
  { value: "Agriculture", label: "Agriculture" },
  { value: "Other", label: "Other" }
];

const CUSTOMER_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Blocked", label: "Blocked" }
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "OEM", label: "OEM Manufacturer" },
  { value: "DOMESTIC", label: "Domestic Tier-1 / Dealer" },
  { value: "EXPORT", label: "Overseas / Export Customer" },
  { value: "DISTRIBUTOR", label: "Regional Distributor" },
  { value: "WHOLESALE", label: "Wholesale Supplier" },
  { value: "RETAIL", label: "Retail Dealer" }
];

const DOMESTIC_EXPORT_OPTIONS = [
  { value: "Domestic", label: "Domestic" },
  { value: "Export", label: "Export" }
];

const GST_TYPE_OPTIONS = [
  { value: "REGISTERED", label: "Registered Business" },
  { value: "UNREGISTERED", label: "Unregistered Business" },
  { value: "COMPOSITION", label: "Composition Scheme" },
  { value: "SEZ", label: "SEZ / Export Unit" }
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "PT-15", label: "15 Days" },
  { value: "PT-30", label: "30 Days" },
  { value: "PT-45", label: "45 Days" },
  { value: "PT-60", label: "60 Days" },
  { value: "IMMEDIATE", label: "Advance / Immediate" }
];

const REMINDER_MODE_OPTIONS = [
  { value: "E-Mail", label: "E-Mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "Phone Call", label: "Phone Call" },
  { value: "Both (Email & WhatsApp)", label: "Both (Email & WhatsApp)" }
];

const CUSTOMER_MASTER_PAGE_1_COLUMNS = [
  { key: "select", width: 36, min: 32 },
  { key: "code", width: 95 },
  { key: "customer_name", width: 220 },
  { key: "customer_alias_short_nam", width: 170 },
  { key: "gst", width: 140 },
  { key: "city", width: 100 },
  { key: "state", width: 100 },
  { key: "country", width: 90 },
  { key: "domestic_export", width: 130 },
  { key: "sale_person", width: 160 },
  { key: "sale_contact", width: 130 },
  { key: "sale_email", width: 200 },
  { key: "credit_days", width: 95 },
  { key: "billing_source", width: 120 },
  { key: "supplier_code_of_sms", width: 150 },
  { key: "accounts_person_name_con", width: 190 },
  { key: "mode_of_payment_reminder", width: 160 },
  { key: "scm", width: 100 },
  { key: "check_by_sales", width: 120 },
  { key: "check_by_accounts", width: 130 },
  { key: "bill_to_address", width: 220 },
  { key: "ship_to_on_address", width: 220 },
  { key: "customer_address", width: 220 },
];

export function CustomerMasterPage({
  dark = false,
  onBackToHome,
  onOpenSidebar,
  sidebarOpen = false,
  setPage
}) {
  const customerMasterPage1Resize = useResizableColumns("customer-master-page-standard-v2", CUSTOMER_MASTER_PAGE_1_COLUMNS);
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tab1"); // "tab1" = Excel Sheet Attributes, "tab2" = Rest Attributes
  const [formData, setFormData] = useState(INITIAL_CUSTOMER_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");
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
    checkAccounts: "",
    customerCode: "",
    checkSales: "",
    customerName: "",
    billToAddress: "",
    customerAlias: "",
    state: "",
    country: "",
    shipToAddress: "",
    billingSource: "",
    gstin: "",
    city: "",
    domesticExport: "",
    supplierCodeSms: "",
    salesPerson: "",
    salesContact: "",
    salesEmail: "",
    modeOfPaymentReminder: "",
    accountsContactDetails: "",
    creditDays: "",
    scm: "",
    customerAddress: ""
  });


  // Customers come only from PostgreSQL, so a deleted customer never reappears from a bundled copy
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
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

  // Fetch Customers directly from PostgreSQL database via API
  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/customers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((c, idx) => ({
            ...c,
            id: c.id ?? (idx + 1),
            checkByAccounts: c.checkByAccounts !== undefined ? Boolean(c.checkByAccounts) : Boolean(c.check_by_accounts),
            customerCode: c.customerCode || c.customer_code || "",
            checkBySales: c.checkBySales !== undefined ? Boolean(c.checkBySales) : Boolean(c.check_by_sales),
            customerName: c.customerName || c.customer_name || "",
            billToAddress: c.billToAddress || c.bill_to_address || c.address || "",
            customerAlias: c.customerAlias || c.customer_alias || "",
            state: c.state || "",
            country: c.country || "India",
            shipToAddress: c.shipToAddress || c.ship_to_address || c.address || "",
            billingSource: c.billingSource || c.billing_source || "Direct",
            gstin: c.gstin || "",
            city: c.city || "",
            domesticExport: c.domesticExport || c.domestic_export || c.customerType || c.customer_type || "Domestic",
            supplierCodeSms: c.supplierCodeSms || c.supplier_code_sms || "",
            salesPerson: c.salesPerson || c.sales_person || c.contactPerson || c.contact_person || "",
            salesContact: c.salesContact || c.sales_contact || c.phone || "",
            salesEmail: c.salesEmail || c.sales_email || c.email || "",
            modeOfPaymentReminder: c.modeOfPaymentReminder || c.mode_of_payment_reminder || "",
            accountsContactDetails: c.accountsContactDetails || c.accounts_contact_details || "",
            creditDays: c.creditDays !== undefined ? c.creditDays : (c.credit_days !== undefined ? c.credit_days : 30),
            scm: c.scm || "",
            customerAddress: c.customerAddress || c.customer_address || c.address || "",
            customerId: c.customerId || c.customer_id || c.customerCode || c.customer_code || "",
            companyId: c.companyId || c.company_id || "COMP-001",
            marketType: c.marketType || c.market_type || c.domesticExport || c.domestic_export || "Domestic",
            customerCategory: c.customerCategory || c.customer_category || c.customerType || c.customer_type || "OEM",
            customerGroup: c.customerGroup || c.customer_group || "Automotive",
            customerType: c.customerCategory || c.customer_category || c.customerType || c.customer_type || "OEM",
            pan: c.pan || "",
            gstRegistrationType: c.gstRegistrationType || c.gst_registration_type || (c.gstin ? "REGISTERED" : "UNREGISTERED"),
            paymentTermsId: c.paymentTermsId || c.payment_terms_id || "PT-30",
            currency: c.currency || "INR",
            creditLimit: c.creditLimit !== undefined ? c.creditLimit : (c.credit_limit !== undefined ? c.credit_limit : "500000.00"),
            status: (c.status?.toUpperCase() === "INACTIVE" ? "Inactive" : c.status?.toUpperCase() === "BLOCKED" ? "Blocked" : "Active"),
            stateCode: c.stateCode || c.state_code || "",
            pincode: c.pincode || ""
          }));
          setCustomers(mapped);
        }
      }
    } catch (err) {
      console.warn("API not reachable yet, using database snapshot:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // UI styling theme tokens matching ItemMasterFormPage & MachineMasterPage
  const bg = dark ? "#0a0f1d" : "#f4f6fb";
  const cardBg = dark ? "#111827" : "#ffffff";
  const textPrimary = dark ? "#f8fafc" : "#0f172a";
  const textSecondary = dark ? "#94a3b8" : "#64748b";
  const borderCol = dark ? "rgba(148, 163, 184, 0.14)" : "#e2e8f0";
  const inputBg = dark ? "#0b1329" : "#ffffff";

  // Calculate next auto-generated unique customer code (e.g. CUST-00034)
  const getNextCustomerCode = (list) => {
    let maxNum = 0;
    (list || []).forEach((c) => {
      const match = String(c.customerCode || "").match(/CUST-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `CUST-${String(maxNum + 1).padStart(5, "0")}`;
  };

  // Open new modal with clean uneditable, autogenerated unique code (MAX + 1)
  const handleOpenNewModal = async () => {
    setEditingId(null);
    let autoCode = getNextCustomerCode(customers);
    try {
      const res = await fetch(`${getApiUrl()}/api/customers/next-code`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.nextCode) {
          autoCode = data.nextCode;
        }
      }
    } catch {
      // fallback to locally computed autoCode
    }

    setFormData({
      ...INITIAL_CUSTOMER_FORM,
      customerCode: autoCode,
      customerId: autoCode
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
        setToastMessage(`Customer "${deletedName}" deleted.`);
      } else {
        const err = await res.json().catch(() => ({}));
        setToastMessage(err.message || `Customer "${deletedName}" could not be deleted (HTTP ${res.status}).`);
      }
    } catch (e) {
      setToastMessage(`Customer "${deletedName}" was not deleted: the server could not be reached.`);
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

      // Sync sales person and contact person
      if (field === "salesPerson") updated.contactPerson = value;
      if (field === "contactPerson") updated.salesPerson = value;
      if (field === "salesContact") updated.phone = value;
      if (field === "phone") updated.salesContact = value;
      if (field === "salesEmail") updated.email = value;
      if (field === "email") updated.salesEmail = value;

      // Sync Market Type and Domestic/Export
      if (field === "marketType") updated.domesticExport = value;
      if (field === "domesticExport") updated.marketType = value;

      // Sync Customer Category and Customer Type
      if (field === "customerCategory") updated.customerType = value;
      if (field === "customerType") updated.customerCategory = value;

      return updated;
    });
  };

  // Save Customer (POST / PUT directly to PostgreSQL database)
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      alert("Please enter the Customer Name - Required");
      return;
    }

    const assignedCode = formData.customerCode.trim() || getNextCustomerCode(customers);
    const payload = {
      ...formData,
      customerName: formData.customerName.trim(),
      customerCode: assignedCode,
      customerId: assignedCode,
      companyId: formData.companyId || "COMP-001",
      customerCategory: formData.customerCategory || formData.customerType || "OEM",
      customerType: formData.customerCategory || formData.customerType || "OEM",
      customerGroup: formData.customerGroup || "Automotive",
      marketType: formData.marketType || formData.domesticExport || "Domestic",
      domesticExport: formData.marketType || formData.domesticExport || (formData.country && formData.country !== "India" ? "Export" : "Domestic"),
      status: formData.status || "Active",
      gstin: formData.gstin ? formData.gstin.trim().toUpperCase() : "",
      pan: formData.pan ? formData.pan.trim().toUpperCase() : "",
      gstRegistrationType: formData.gstin ? "REGISTERED" : "UNREGISTERED",
      checkByAccounts: Boolean(formData.checkByAccounts),
      checkBySales: Boolean(formData.checkBySales),
      billingSource: formData.billingSource || "Direct",
      supplierCodeSms: formData.supplierCodeSms || "",
      contactPerson: formData.contactPerson || formData.salesPerson || "",
      salesPerson: formData.salesPerson || formData.contactPerson || "",
      phone: formData.phone || formData.salesContact || "",
      salesContact: formData.salesContact || formData.phone || "",
      email: formData.email || formData.salesEmail || "",
      salesEmail: formData.salesEmail || formData.email || "",
      modeOfPaymentReminder: formData.modeOfPaymentReminder || "E-Mail",
      accountsContactDetails: formData.accountsContactDetails || "",
      paymentTermsId: formData.paymentTermsId || "PT-30",
      creditDays: Number(formData.creditDays) || 30,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 500000.0,
      currency: formData.currency || "INR",
      scm: formData.scm || "",
      billToAddress: formData.billToAddress || formData.customerAddress || formData.address || "",
      shipToAddress: formData.shipToAddress || formData.billToAddress || formData.address || "",
      customerAddress: formData.customerAddress || formData.billToAddress || formData.address || "",
      address: formData.customerAddress || formData.billToAddress || formData.shipToAddress || "",
      city: formData.city || "",
      state: formData.state || "",
      stateCode: formData.stateCode || "",
      country: formData.country || "India",
      pincode: formData.pincode || ""
    };

    try {
      if (editingId) {
        const res = await fetch(`${getApiUrl()}/api/customers/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) return await showSaveError(res);
        const updated = await res.json();
        setCustomers((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...updated } : item)));
        setToastMessage(`Customer "${payload.customerName}" updated.`);
      } else {
        const res = await fetch(`${getApiUrl()}/api/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) return await showSaveError(res);
        const created = await res.json();
        setCustomers((prev) => [created, ...prev]);
        setToastMessage(`Customer "${payload.customerName}" saved.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Save error:", err);
      alert("The customer was not saved: the server could not be reached.");
    }
  };

  // A refused save keeps the form open and shows the server's reason; nothing is added to the list.
  const showSaveError = async (res) => {
    const err = await res.json().catch(() => ({}));
    alert(err.message || err.error || `The customer was not saved (HTTP ${res.status}).`);
  };

  // Header Toolbar actions matching ItemMasterFormPage & MachineMasterPage
  const handleEditSelected = () => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const itemToEdit = customers.find((i) => i.id === selectedId);
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
    setQuickSearch("");
    setQuickPickerMode("delete");
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedTypeFilter("ALL");
    setColFilters({
      checkAccounts: "",
      customerCode: "",
      checkSales: "",
      customerName: "",
      billToAddress: "",
      customerAlias: "",
      state: "",
      country: "",
      shipToAddress: "",
      billingSource: "",
      gstin: "",
      city: "",
      domesticExport: "",
      supplierCodeSms: "",
      salesPerson: "",
      salesContact: "",
      salesEmail: "",
      modeOfPaymentReminder: "",
      accountsContactDetails: "",
      creditDays: "",
      scm: "",
      customerAddress: ""
    });
    setSelectedIds(new Set());
    fetchCustomers();
    setToastMessage("Data refreshed from PostgreSQL database!");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleExportData = () => {
    const dataToExport = filteredCustomers.map((c, idx) => ({
      "Sr No": idx + 1,
      "Check by Accounts": c.checkByAccounts ? "TRUE" : "FALSE",
      "Code": c.customerCode,
      "Check by Sales": c.checkBySales ? "TRUE" : "FALSE",
      "Customer Name": c.customerName,
      "Bill TO Address": c.billToAddress || c.address || "",
      "Customer Alias Short Name": c.customerAlias || "",
      "State": c.state || "",
      "Country": c.country || "India",
      "Ship To on Address": c.shipToAddress || c.address || "",
      "Billing Source": c.billingSource || "",
      "GST": c.gstin || "",
      "City": c.city || "",
      "Domestic / Export": c.domesticExport || c.customerType || "",
      "Supplier Code of SMS": c.supplierCodeSms || "",
      "Sale Person": c.salesPerson || c.contactPerson || "",
      "Sale Contact": c.salesContact || c.phone || "",
      "Sale Email": c.salesEmail || c.email || "",
      "Mode of Payment Reminder": c.modeOfPaymentReminder || "",
      "Accounts Person Name - Contact No. -Mail id": c.accountsContactDetails || "",
      "Credit Days": c.creditDays ?? 30,
      "SCM": c.scm || "",
      "Customer Address": c.customerAddress || c.address || ""
    }));

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Customer_Master_Export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage("Customer catalog exported successfully!");
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Quick picker helpers
  const handleQuickPickerSelect = (customer) => {
    if (quickPickerMode === "edit") {
      setQuickPickerMode(null);
      handleOpenEditModal(customer);
    } else if (quickPickerMode === "delete") {
      setQuickPickerMode(null);
      handleRequestDelete(customer);
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
    if (selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    }
  };

  // Filter logic (Global Search + Pill Filter + Column Filters)
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Global search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesGlobal =
          (cust.customerName && cust.customerName.toLowerCase().includes(q)) ||
          (cust.customerCode && cust.customerCode.toLowerCase().includes(q)) ||
          (cust.customerAlias && cust.customerAlias.toLowerCase().includes(q)) ||
          (cust.gstin && cust.gstin.toLowerCase().includes(q)) ||
          (cust.pan && cust.pan.toLowerCase().includes(q)) ||
          (cust.city && cust.city.toLowerCase().includes(q)) ||
          (cust.state && cust.state.toLowerCase().includes(q)) ||
          (cust.salesPerson && cust.salesPerson.toLowerCase().includes(q)) ||
          (cust.contactPerson && cust.contactPerson.toLowerCase().includes(q)) ||
          (cust.salesEmail && cust.salesEmail.toLowerCase().includes(q)) ||
          (cust.billingSource && cust.billingSource.toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      // Pill filter
      if (selectedTypeFilter !== "ALL") {
        if (selectedTypeFilter === "DOMESTIC") {
          const isDom =
            (cust.domesticExport && cust.domesticExport.toUpperCase() === "DOMESTIC") ||
            (cust.customerType && cust.customerType.toUpperCase() === "DOMESTIC") ||
            (!cust.domesticExport && cust.country === "India");
          if (!isDom) return false;
        } else if (selectedTypeFilter === "EXPORT") {
          const isExp =
            (cust.domesticExport && cust.domesticExport.toUpperCase() === "EXPORT") ||
            (cust.customerType && cust.customerType.toUpperCase() === "EXPORT") ||
            ["Dubai", "Germany", "UAE", "Russia"].includes(cust.country);
          if (!isExp) return false;
        } else if (selectedTypeFilter === "OEM") {
          const isOem = (cust.customerType && cust.customerType.toUpperCase() === "OEM");
          if (!isOem) return false;
        } else if (selectedTypeFilter === "REGISTERED") {
          if (!cust.gstin || cust.gstin.trim() === "") return false;
        }
      }

      // Per-column filters matching Excel attributes
      if (colFilters.customerCode && !cust.customerCode?.toLowerCase().includes(colFilters.customerCode.toLowerCase())) return false;
      if (colFilters.customerName && !cust.customerName?.toLowerCase().includes(colFilters.customerName.toLowerCase())) return false;
      if (colFilters.billToAddress && !(cust.billToAddress || cust.address)?.toLowerCase().includes(colFilters.billToAddress.toLowerCase())) return false;
      if (colFilters.customerAlias && !cust.customerAlias?.toLowerCase().includes(colFilters.customerAlias.toLowerCase())) return false;
      if (colFilters.state && !cust.state?.toLowerCase().includes(colFilters.state.toLowerCase())) return false;
      if (colFilters.country && !cust.country?.toLowerCase().includes(colFilters.country.toLowerCase())) return false;
      if (colFilters.shipToAddress && !(cust.shipToAddress || cust.address)?.toLowerCase().includes(colFilters.shipToAddress.toLowerCase())) return false;
      if (colFilters.billingSource && !cust.billingSource?.toLowerCase().includes(colFilters.billingSource.toLowerCase())) return false;
      if (colFilters.gstin && !cust.gstin?.toLowerCase().includes(colFilters.gstin.toLowerCase())) return false;
      if (colFilters.city && !cust.city?.toLowerCase().includes(colFilters.city.toLowerCase())) return false;
      if (colFilters.domesticExport && !(cust.domesticExport || cust.customerType)?.toLowerCase().includes(colFilters.domesticExport.toLowerCase())) return false;
      if (colFilters.supplierCodeSms && !cust.supplierCodeSms?.toLowerCase().includes(colFilters.supplierCodeSms.toLowerCase())) return false;
      if (colFilters.salesPerson && !(cust.salesPerson || cust.contactPerson)?.toLowerCase().includes(colFilters.salesPerson.toLowerCase())) return false;
      if (colFilters.salesContact && !(cust.salesContact || cust.phone)?.toLowerCase().includes(colFilters.salesContact.toLowerCase())) return false;
      if (colFilters.salesEmail && !(cust.salesEmail || cust.email)?.toLowerCase().includes(colFilters.salesEmail.toLowerCase())) return false;
      if (colFilters.modeOfPaymentReminder && !cust.modeOfPaymentReminder?.toLowerCase().includes(colFilters.modeOfPaymentReminder.toLowerCase())) return false;
      if (colFilters.accountsContactDetails && !cust.accountsContactDetails?.toLowerCase().includes(colFilters.accountsContactDetails.toLowerCase())) return false;
      if (colFilters.creditDays && !String(cust.creditDays ?? "").includes(colFilters.creditDays)) return false;
      if (colFilters.scm && !cust.scm?.toLowerCase().includes(colFilters.scm.toLowerCase())) return false;
      if (colFilters.customerAddress && !(cust.customerAddress || cust.address)?.toLowerCase().includes(colFilters.customerAddress.toLowerCase())) return false;

      return true;
    });
  }, [customers, searchTerm, selectedTypeFilter, colFilters]);

  // Pagination calculation
  const totalRecords = filteredCustomers.length;
  const isAllPages = pageSize === "ALL";
  const effectivePageSize = isAllPages ? Math.max(1, totalRecords) : pageSize;
  const totalPages = isAllPages ? 1 : Math.ceil(totalRecords / effectivePageSize);
  const clampedPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIndex = (clampedPage - 1) * effectivePageSize;
  const endIndex = isAllPages ? totalRecords : Math.min(startIndex + effectivePageSize, totalRecords);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Summary Metrics
  const totalCount = customers.length;
  const domesticCount = customers.filter((c) => (c.domesticExport?.toUpperCase() === "DOMESTIC" || c.country === "India")).length;
  const exportCount = customers.filter((c) => (c.domesticExport?.toUpperCase() === "EXPORT" || ["Dubai", "Germany", "UAE", "Russia"].includes(c.country))).length;
  const registeredGstCount = customers.filter((c) => Boolean(c.gstin && c.gstin.trim())).length;

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
          background: cardBg
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
        {/* TOP TOOLBAR & BREADCRUMB HEADER (STATIC - NEVER SCROLLS)                  */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: cardBg,
            borderBottom: `1px solid ${borderCol}`,
            padding: "9px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }}
        >
          {/* Left Action Buttons matching Item Master & Machine Master */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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

            <button
              onClick={handleViewSelected}
              id="btn-view-customer-master"
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
          <div style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
            {onBackToHome ? (
              <span
                onClick={onBackToHome}
                style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline", marginRight: 4 }}
              >
                CRM &amp; Order Management
              </span>
            ) : (
              <span>CRM &amp; Order Management</span>
            )}
            <span style={{ margin: "0 4px" }}>›</span>
            <span>Customer</span>
            <span style={{ margin: "0 4px" }}>›</span>
            <span style={{ color: textPrimary, fontWeight: 700 }}>Customer Master</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: SEARCH INPUT, CATEGORY PILLS & REAL-TIME SUMMARY METRICS           */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: cardBg,
            borderBottom: `1px solid ${borderCol}`,
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
              placeholder="Search by Code, Customer Name, Alias, GST, City, Person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: inputBg,
                color: textPrimary,
                fontSize: 13,
                fontWeight: 500,
                outline: "none"
              }}
            />
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { label: "All Customers", key: "ALL" },
              { label: "Domestic", key: "DOMESTIC" },
              { label: "Export", key: "EXPORT" },
              { label: "OEM", key: "OEM" },
              { label: "Registered GST", key: "REGISTERED" }
            ].map((pill) => {
              const isActive = selectedTypeFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setSelectedTypeFilter(pill.key)}
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
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 13, color: textSecondary }}>
            <div>
              Total <strong style={{ color: textPrimary, fontSize: 14 }}>{totalCount}</strong>
            </div>
            <div>
              Domestic <strong style={{ color: textPrimary, fontSize: 14 }}>{domesticCount}</strong>
            </div>
            <div>
              Export <strong style={{ color: textPrimary, fontSize: 14 }}>{exportCount}</strong>
            </div>
            <div>
              GST Registered <strong style={{ color: textPrimary, fontSize: 14 }}>{registeredGstCount}</strong>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DATA TABLE CONTAINER (STICKY 2-ROW HEADER WITH ALL 22 EXCEL COLUMNS)       */}
        {/* ========================================================================= */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "auto",
            background: cardBg,
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
              ...customerMasterPage1Resize.tableStyle,
            }}
          >
            <ResizableColGroup columns={CUSTOMER_MASTER_PAGE_1_COLUMNS} widths={customerMasterPage1Resize.widths} />
            <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
              {/* Header Row 1: Exact Column Titles from Excel Sheet */}
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
                    checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Code<ColumnResizeHandle colKey="code" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 200, whiteSpace: "nowrap" }}>Customer Name<ColumnResizeHandle colKey="customer_name" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Customer Alias Short Name<ColumnResizeHandle colKey="customer_alias_short_nam" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>GST<ColumnResizeHandle colKey="gst" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>City<ColumnResizeHandle colKey="city" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>State<ColumnResizeHandle colKey="state" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Country<ColumnResizeHandle colKey="country" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Domestic / Export<ColumnResizeHandle colKey="domestic_export" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 160, whiteSpace: "nowrap" }}>Sale Person<ColumnResizeHandle colKey="sale_person" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Sale Contact<ColumnResizeHandle colKey="sale_contact" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 190, whiteSpace: "nowrap" }}>Sale Email<ColumnResizeHandle colKey="sale_email" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Credit Days<ColumnResizeHandle colKey="credit_days" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Billing Source<ColumnResizeHandle colKey="billing_source" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Supplier Code of SMS<ColumnResizeHandle colKey="supplier_code_of_sms" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 180, whiteSpace: "nowrap" }}>Accounts Person Name - Contact No. -Mail id<ColumnResizeHandle colKey="accounts_person_name_con" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Mode of Payment Reminder<ColumnResizeHandle colKey="mode_of_payment_reminder" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>SCM<ColumnResizeHandle colKey="scm" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Check by Sales<ColumnResizeHandle colKey="check_by_sales" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Check by Accounts<ColumnResizeHandle colKey="check_by_accounts" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 200, whiteSpace: "nowrap" }}>Bill TO Address<ColumnResizeHandle colKey="bill_to_address" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 200, whiteSpace: "nowrap" }}>Ship To on Address<ColumnResizeHandle colKey="ship_to_on_address" resize={customerMasterPage1Resize} /></th>
                <th style={{ position: "sticky", top: 0, zIndex: 22, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700, color: "#334155", minWidth: 200, whiteSpace: "nowrap" }}>Customer Address<ColumnResizeHandle colKey="customer_address" resize={customerMasterPage1Resize} /></th>
              </tr>

              {/* Header Row 2: Per-Column Filter Input Boxes */}
              <tr style={{ background: "#f8fafc", height: 38 }}>
                {/* 0. select */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 12px", textAlign: "center" }}></td>
                {/* 1. code */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Code..."
                    value={colFilters.customerCode}
                    onChange={(e) => setColFilters({ ...colFilters, customerCode: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 2. customer_name */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Name..."
                    value={colFilters.customerName}
                    onChange={(e) => setColFilters({ ...colFilters, customerName: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 3. customer_alias_short_nam */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Alias..."
                    value={colFilters.customerAlias}
                    onChange={(e) => setColFilters({ ...colFilters, customerAlias: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 4. gst */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="GST..."
                    value={colFilters.gstin}
                    onChange={(e) => setColFilters({ ...colFilters, gstin: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 5. city */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="City..."
                    value={colFilters.city}
                    onChange={(e) => setColFilters({ ...colFilters, city: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 6. state */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="State..."
                    value={colFilters.state}
                    onChange={(e) => setColFilters({ ...colFilters, state: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 7. country */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Country..."
                    value={colFilters.country}
                    onChange={(e) => setColFilters({ ...colFilters, country: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 8. domestic_export */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Type..."
                    value={colFilters.domesticExport}
                    onChange={(e) => setColFilters({ ...colFilters, domesticExport: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 9. sale_person */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Person..."
                    value={colFilters.salesPerson}
                    onChange={(e) => setColFilters({ ...colFilters, salesPerson: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 10. sale_contact */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Contact..."
                    value={colFilters.salesContact}
                    onChange={(e) => setColFilters({ ...colFilters, salesContact: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 11. sale_email */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Email..."
                    value={colFilters.salesEmail}
                    onChange={(e) => setColFilters({ ...colFilters, salesEmail: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 12. credit_days */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Days..."
                    value={colFilters.creditDays}
                    onChange={(e) => setColFilters({ ...colFilters, creditDays: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 13. billing_source */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Source..."
                    value={colFilters.billingSource}
                    onChange={(e) => setColFilters({ ...colFilters, billingSource: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 14. supplier_code_of_sms */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="SMS Code..."
                    value={colFilters.supplierCodeSms}
                    onChange={(e) => setColFilters({ ...colFilters, supplierCodeSms: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 15. accounts_person_name_con */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Accounts..."
                    value={colFilters.accountsContactDetails}
                    onChange={(e) => setColFilters({ ...colFilters, accountsContactDetails: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 16. mode_of_payment_reminder */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Reminder..."
                    value={colFilters.modeOfPaymentReminder}
                    onChange={(e) => setColFilters({ ...colFilters, modeOfPaymentReminder: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 17. scm */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="SCM..."
                    value={colFilters.scm}
                    onChange={(e) => setColFilters({ ...colFilters, scm: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 18. check_by_sales */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}></td>
                {/* 19. check_by_accounts */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}></td>
                {/* 20. bill_to_address */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Bill To..."
                    value={colFilters.billToAddress}
                    onChange={(e) => setColFilters({ ...colFilters, billToAddress: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 21. ship_to_on_address */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Ship To..."
                    value={colFilters.shipToAddress}
                    onChange={(e) => setColFilters({ ...colFilters, shipToAddress: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
                {/* 22. customer_address */}
                <td style={{ position: "sticky", top: 37, zIndex: 21, background: "#f8fafc", borderBottom: "2px solid #cbd5e1", padding: "4px 8px" }}>
                  <input
                    type="text"
                    placeholder="Address..."
                    value={colFilters.customerAddress}
                    onChange={(e) => setColFilters({ ...colFilters, customerAddress: e.target.value })}
                    style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                  />
                </td>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={23} style={{ padding: "48px 0", textAlign: "center", color: textSecondary }}>
                    No customer records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer, idx) => {
                  const isSelected = selectedIds.has(customer.id);
                  const isEven = idx % 2 === 0;
                  const rowBg = isSelected
                    ? (dark ? "rgba(37,99,235,0.18)" : "rgba(37,99,235,0.08)")
                    : (isEven ? cardBg : (dark ? "#0f172a" : "#fcfdfe"));

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => toggleSelectRow(customer.id)}
                      onDoubleClick={() => setDetailItem(customer)}
                      style={{
                        background: rowBg,
                        borderBottom: `1px solid ${borderCol}`,
                        cursor: "pointer",
                        transition: "background 0.15s ease"
                      }}
                    >
                      {/* 0. Selection Checkbox */}
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "center",
                          borderBottom: `1px solid ${borderCol}`
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(customer.id)}
                          style={{ cursor: "pointer", accentColor: "#2563eb" }}
                        />
                      </td>

                      {/* 1. Code */}
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#2563eb", whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.customerCode || "-"}
                      </td>

                      {/* 2. Customer Name */}
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: textPrimary, borderBottom: `1px solid ${borderCol}`, whiteSpace: "nowrap" }}>
                        {customer.customerName}
                      </td>

                      {/* 3. Customer Alias Short Name */}
                      <td style={{ padding: "10px 12px", color: textSecondary, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.customerAlias || "-"}
                      </td>

                      {/* 4. GST */}
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: customer.gstin ? (dark ? "#60a5fa" : "#1d4ed8") : textSecondary, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.gstin || "-"}
                      </td>

                      {/* 5. City */}
                      <td style={{ padding: "10px 12px", color: textPrimary, fontWeight: 500, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.city || "-"}
                      </td>

                      {/* 6. State */}
                      <td style={{ padding: "10px 12px", color: textPrimary, fontWeight: 500, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.state || "-"}
                      </td>

                      {/* 7. Country */}
                      <td style={{ padding: "10px 12px", color: textPrimary, fontWeight: 500, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.country || "India"}
                      </td>

                      {/* 8. Domestic / Export */}
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background:
                              (customer.domesticExport === "Export" || customer.customerType === "EXPORT")
                                ? "rgba(168,85,247,0.14)"
                                : "rgba(37,99,235,0.12)",
                            color:
                              (customer.domesticExport === "Export" || customer.customerType === "EXPORT")
                                ? "#9333ea"
                                : "#2563eb"
                          }}
                        >
                          {customer.domesticExport || "Domestic"}
                        </span>
                      </td>

                      {/* 9. Sale Person */}
                      <td style={{ padding: "10px 12px", color: textPrimary, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.salesPerson || customer.contactPerson || "-"}
                      </td>

                      {/* 10. Sale Contact */}
                      <td style={{ padding: "10px 12px", color: textSecondary, fontWeight: 500, whiteSpace: "pre-wrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.salesContact || customer.phone || "-"}
                      </td>

                      {/* 11. Sale Email */}
                      <td
                        style={{
                          padding: "10px 12px",
                          color: textSecondary,
                          fontWeight: 500,
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${borderCol}`
                        }}
                        title={customer.salesEmail || customer.email}
                      >
                        {customer.salesEmail || customer.email || "-"}
                      </td>

                      {/* 12. Credit Days */}
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: textPrimary, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.creditDays ?? 30}
                      </td>

                      {/* 13. Billing Source */}
                      <td style={{ padding: "10px 12px", color: textSecondary, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.billingSource || "Direct"}
                      </td>

                      {/* 14. Supplier Code of SMS */}
                      <td style={{ padding: "10px 12px", color: textSecondary, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.supplierCodeSms || "-"}
                      </td>

                      {/* 15. Accounts Person Name - Contact No. -Mail id */}
                      <td
                        style={{
                          padding: "10px 12px",
                          color: textSecondary,
                          fontWeight: 500,
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${borderCol}`
                        }}
                        title={customer.accountsContactDetails}
                      >
                        {customer.accountsContactDetails || "-"}
                      </td>

                      {/* 16. Mode of Payment Reminder */}
                      <td style={{ padding: "10px 12px", color: textSecondary, fontWeight: 500, whiteSpace: "nowrap", borderBottom: `1px solid ${borderCol}` }}>
                        {customer.modeOfPaymentReminder || "-"}
                      </td>

                      {/* 17. SCM */}
                      <td
                        style={{
                          padding: "10px 12px",
                          color: textSecondary,
                          fontWeight: 500,
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${borderCol}`
                        }}
                        title={customer.scm}
                      >
                        {customer.scm || "-"}
                      </td>

                      {/* 18. Check by Sales */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${borderCol}`, textAlign: "center" }}>
                        {customer.checkBySales ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(16,185,129,0.12)", color: "#059669", padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                            <CheckCircle2 size={12} /> TRUE
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(239,68,68,0.1)", color: "#dc2626", padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 10 }}>
                            <XCircle size={12} /> FALSE
                          </span>
                        )}
                      </td>

                      {/* 19. Check by Accounts */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${borderCol}`, textAlign: "center" }}>
                        {customer.checkByAccounts ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(16,185,129,0.12)", color: "#059669", padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                            <CheckCircle2 size={12} /> TRUE
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(239,68,68,0.1)", color: "#dc2626", padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 10 }}>
                            <XCircle size={12} /> FALSE
                          </span>
                        )}
                      </td>

                      {/* 20. Bill TO Address */}
                      <td
                        style={{
                          padding: "10px 12px",
                          color: textSecondary,
                          fontWeight: 500,
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${borderCol}`
                        }}
                        title={customer.billToAddress || customer.address}
                      >
                        {customer.billToAddress || customer.address || "-"}
                      </td>

                      {/* 21. Ship To on Address */}
                      <td
                        style={{
                          padding: "10px 12px",
                          color: textSecondary,
                          fontWeight: 500,
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${borderCol}`
                        }}
                        title={customer.shipToAddress || customer.address}
                      >
                        {customer.shipToAddress || customer.address || "-"}
                      </td>

                      {/* 22. Customer Address */}
                      <td
                        style={{
                          padding: "10px 12px",
                          color: textSecondary,
                          fontWeight: 500,
                          maxWidth: 260,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${borderCol}`
                        }}
                        title={customer.customerAddress || customer.address}
                      >
                        {customer.customerAddress || customer.address || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* PAGINATION TOOLBAR (STATIC AT BOTTOM OF CARD)                             */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: cardBg,
            borderTop: `1px solid ${borderCol}`,
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
            color: textSecondary
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span>
              Showing{" "}
              <strong style={{ color: textPrimary }}>
                {totalRecords === 0 ? 0 : (startIndex + 1).toLocaleString()} &ndash;{" "}
                {endIndex.toLocaleString()}
              </strong>{" "}
              of <strong style={{ color: textPrimary }}>{totalRecords.toLocaleString()}</strong> customers
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: textSecondary }}>Rows per page:</span>
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
                  background: inputBg,
                  color: textPrimary
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
                  background: clampedPage <= 1 ? (dark ? "#1e293b" : "#f8fafc") : cardBg,
                  color: clampedPage <= 1 ? "#94a3b8" : textPrimary,
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
                  background: clampedPage <= 1 ? (dark ? "#1e293b" : "#f8fafc") : cardBg,
                  color: clampedPage <= 1 ? "#94a3b8" : textPrimary,
                  cursor: clampedPage <= 1 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronLeft size={14} />
              </button>

              <span style={{ margin: "0 8px", fontWeight: 700, fontSize: 12, color: textPrimary }}>
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
                  background: clampedPage >= totalPages ? (dark ? "#1e293b" : "#f8fafc") : cardBg,
                  color: clampedPage >= totalPages ? "#94a3b8" : textPrimary,
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
                  background: clampedPage >= totalPages ? (dark ? "#1e293b" : "#f8fafc") : cardBg,
                  color: clampedPage >= totalPages ? "#94a3b8" : textPrimary,
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
      {/* BOTTOM DARK STATUS BAR (MATCHING REFERENCE UI)                            */}
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
          <span>{totalRecords.toLocaleString()} customers</span>
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
          CRM &amp; Order Management &middot; PostgreSQL Connected &middot; Live Database
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK PICKER MODAL (EDIT / DELETE WHEN NO SELECTION)                      */}
      {/* ========================================================================= */}
      {quickPickerMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setQuickPickerMode(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 540,
              background: cardBg,
              borderRadius: 12,
              border: `1px solid ${borderCol}`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${borderCol}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: dark ? "rgba(30,41,59,0.95)" : "#f8fafc"
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>
                {quickPickerMode === "edit" ? "Select Customer to Edit" : "Select Customer to Delete"}
              </div>
              <button
                onClick={() => setQuickPickerMode(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: textSecondary }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${borderCol}` }}>
              <input
                type="text"
                placeholder="Search by code, customer name or alias..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: `1px solid ${borderCol}`,
                  background: inputBg,
                  color: textPrimary,
                  fontSize: 12
                }}
              />
            </div>

            <div style={{ maxHeight: 340, overflowY: "auto", padding: "6px" }}>
              {customers
                .filter(
                  (c) =>
                    !quickSearch ||
                    c.customerName?.toLowerCase().includes(quickSearch.toLowerCase()) ||
                    c.customerCode?.toLowerCase().includes(quickSearch.toLowerCase()) ||
                    c.customerAlias?.toLowerCase().includes(quickSearch.toLowerCase())
                )
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleQuickPickerSelect(c)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: `1px solid ${borderCol}`
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "#f1f5f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: "#2563eb", marginRight: 8 }}>{c.customerCode}</span>
                      <span style={{ fontWeight: 600, color: textPrimary }}>{c.customerName}</span>
                      {c.customerAlias && <span style={{ color: textSecondary, fontSize: 11, marginLeft: 6 }}>({c.customerAlias})</span>}
                    </div>
                    <span style={{ fontSize: 11, color: textSecondary }}>{c.city || c.state || "Active"}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              background: cardBg,
              borderRadius: 12,
              border: `1px solid ${borderCol}`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
              padding: 20
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ef4444", marginBottom: 12 }}>
              <Trash2 size={24} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Confirm Customer Deletion</h3>
            </div>
            <p style={{ fontSize: 13, color: textPrimary, margin: "0 0 16px" }}>
              Are you sure you want to delete customer <strong>"{deleteTarget.customerName}"</strong> (Code: {deleteTarget.customerCode}) from the PostgreSQL database? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 6,
                  border: `1px solid ${borderCol}`,
                  background: "transparent",
                  color: textPrimary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOMER MASTER FORM MODAL                                                */}
      {/* TAB 1: ALL 22 ATTRIBUTES FROM THE EXCEL SHEET                             */}
      {/* TAB 2: REST OF ALL SYSTEM ATTRIBUTES                                      */}
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
                padding: "10px 18px",
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
                  {editingId ? "Edit Customer" : "New Customer"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                  Customer Master &bull; CRM &amp; Order Management
                </span>
                <span style={{ fontSize: 11, color: textSecondary, fontWeight: 500 }}>
                  ({formData.customerCode || "New Record"})
                </span>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
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
                  padding: "9px 16px",
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
                1. Tab 1: Excel Sheet Attributes (All 22 Attributes)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tab2")}
                style={{
                  flex: 1,
                  padding: "9px 16px",
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
                2. Tab 2: Rest of Attributes (System & Audit)
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSaveCustomer}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 14
              }}
            >
              {/* ========================================================================= */}
              {/* TAB 1: ALL 22 ATTRIBUTES FROM THE EXCEL SHEET                             */}
              {/* ========================================================================= */}
              {activeTab === "tab1" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Row 1: Code, Customer Name, Customer Alias Short Name */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2.5fr 1.5fr", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase" }}>
                          Code *
                        </label>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.12)", padding: "1px 6px", borderRadius: 4 }}>
                          Auto-generated
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={formData.customerCode}
                        placeholder="e.g. CUST-00034"
                        title="Customer Code is unique and automatically generated"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: dark ? "rgba(30, 41, 59, 0.55)" : "#f1f5f9",
                          color: textPrimary,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "not-allowed"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customerName}
                        onChange={(e) => handleInputChange("customerName", e.target.value)}
                        placeholder="e.g. Ashok Leyland"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Customer Alias Short Name
                      </label>
                      <input
                        type="text"
                        value={formData.customerAlias}
                        onChange={(e) => handleInputChange("customerAlias", e.target.value)}
                        placeholder="e.g. Ashok Ley"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Check by Accounts, Check by Sales, Billing Source, Supplier Code of SMS */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.5fr 1.5fr", gap: 12, background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc", padding: "10px 14px", borderRadius: 8, border: `1px solid ${borderCol}` }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                        Check by Accounts
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: textPrimary, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={formData.checkByAccounts}
                          onChange={(e) => handleInputChange("checkByAccounts", e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: "#10b981", cursor: "pointer" }}
                        />
                        <span>{formData.checkByAccounts ? "TRUE (Verified)" : "FALSE"}</span>
                      </label>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                        Check by Sales
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: textPrimary, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={formData.checkBySales}
                          onChange={(e) => handleInputChange("checkBySales", e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: "#10b981", cursor: "pointer" }}
                        />
                        <span>{formData.checkBySales ? "TRUE (Verified)" : "FALSE"}</span>
                      </label>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Billing Source
                      </label>
                      <input
                        type="text"
                        value={formData.billingSource}
                        onChange={(e) => handleInputChange("billingSource", e.target.value)}
                        placeholder="SMRL-443, Direct, etc."
                        style={{
                          width: "100%",
                          height: 30,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Supplier Code of SMS
                      </label>
                      <input
                        type="text"
                        value={formData.supplierCodeSms}
                        onChange={(e) => handleInputChange("supplierCodeSms", e.target.value)}
                        placeholder="e.g. 7205808, 232513"
                        style={{
                          width: "100%",
                          height: 30,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 3: State, Country, City, Domestic / Export, GST */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.2fr 1.2fr 1.8fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        placeholder="e.g. Haryana"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleInputChange("country", e.target.value)}
                        placeholder="India"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        placeholder="e.g. Sonipat, Pune"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Domestic / Export
                      </label>
                      <select
                        value={formData.domesticExport}
                        onChange={(e) => handleInputChange("domesticExport", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      >
                        {DOMESTIC_EXPORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        GST (GSTIN)
                      </label>
                      <input
                        type="text"
                        value={formData.gstin}
                        onChange={(e) => handleInputChange("gstin", e.target.value)}
                        placeholder="e.g. 06AARCS3816N1ZQ"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontFamily: "monospace"
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 4: Sale Person, Sale Contact, Sale Email */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 2fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Sale Person
                      </label>
                      <input
                        type="text"
                        value={formData.salesPerson}
                        onChange={(e) => handleInputChange("salesPerson", e.target.value)}
                        placeholder="e.g. Prabhakaran : HCV"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Sale Contact
                      </label>
                      <input
                        type="text"
                        value={formData.salesContact}
                        onChange={(e) => handleInputChange("salesContact", e.target.value)}
                        placeholder="e.g. 73390 00868"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Sale Email
                      </label>
                      <input
                        type="text"
                        value={formData.salesEmail}
                        onChange={(e) => handleInputChange("salesEmail", e.target.value)}
                        placeholder="e.g. Deependra.Choubey@ashokleyland.com"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 5: Mode of Payment Reminder, Accounts Person Name - Contact No. -Mail id, Credit Days, SCM */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1.5fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Mode of Payment Reminder
                      </label>
                      <select
                        value={formData.modeOfPaymentReminder}
                        onChange={(e) => handleInputChange("modeOfPaymentReminder", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      >
                        {REMINDER_MODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Accounts Person Name - Contact No. -Mail id
                      </label>
                      <input
                        type="text"
                        value={formData.accountsContactDetails}
                        onChange={(e) => handleInputChange("accountsContactDetails", e.target.value)}
                        placeholder="e.g. K.Kothandaraman: Sprbills@jkfenner.com"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Credit Days
                      </label>
                      <input
                        type="number"
                        value={formData.creditDays}
                        onChange={(e) => handleInputChange("creditDays", e.target.value)}
                        placeholder="30"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontWeight: 700
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        SCM
                      </label>
                      <input
                        type="text"
                        value={formData.scm}
                        onChange={(e) => handleInputChange("scm", e.target.value)}
                        placeholder="Supply chain manager details"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 6: Addresses from Excel (Bill TO Address, Ship To on Address, Customer Address) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Bill TO Address
                      </label>
                      <textarea
                        rows={3}
                        value={formData.billToAddress}
                        onChange={(e) => handleInputChange("billToAddress", e.target.value)}
                        placeholder="Silver Muller Rubber Ltd.(Sales) PHASE-III, PLOT NO.443..."
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 11.5,
                          resize: "vertical"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Ship To on Address
                      </label>
                      <textarea
                        rows={3}
                        value={formData.shipToAddress}
                        onChange={(e) => handleInputChange("shipToAddress", e.target.value)}
                        placeholder="Shipping address..."
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 11.5,
                          resize: "vertical"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Customer Address
                      </label>
                      <textarea
                        rows={3}
                        value={formData.customerAddress}
                        onChange={(e) => handleInputChange("customerAddress", e.target.value)}
                        placeholder="Registered customer address..."
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 11.5,
                          resize: "vertical"
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: REST ALL ATTRIBUTES (POINT 2)                                      */}
              {/* ========================================================================= */}
              {activeTab === "tab2" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ padding: "8px 12px", background: dark ? "rgba(37,99,235,0.12)" : "#eff6ff", borderRadius: 6, border: "1px solid #bfdbfe", fontSize: 12, color: "#1d4ed8" }}>
                    <strong>Extended System Attributes:</strong> These attributes complete the organizational, MSME classification, currency, and commercial ledger limits.
                  </div>

                  {/* Identification & Organization */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase" }}>
                          Customer ID
                        </label>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.12)", padding: "1px 6px", borderRadius: 4 }}>
                          Auto
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={formData.customerId || formData.customerCode}
                        placeholder="Customer ID"
                        title="Customer ID is locked to unique Customer Code"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: dark ? "rgba(30, 41, 59, 0.55)" : "#f1f5f9",
                          color: textPrimary,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "not-allowed"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Company ID
                      </label>
                      <input
                        type="text"
                        value={formData.companyId}
                        onChange={(e) => handleInputChange("companyId", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>
                  </div>

                  {/* Customer Classification & Market Segmentation - 4 Relatable Attributes in 1 Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Market Type
                      </label>
                      <select
                        value={formData.marketType || formData.domesticExport || "Domestic"}
                        onChange={(e) => handleInputChange("marketType", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        {MARKET_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Customer Category
                      </label>
                      <select
                        value={formData.customerCategory || formData.customerType || "OEM"}
                        onChange={(e) => handleInputChange("customerCategory", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        {CUSTOMER_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Customer Group
                      </label>
                      <select
                        value={formData.customerGroup || "Automotive"}
                        onChange={(e) => handleInputChange("customerGroup", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        {CUSTOMER_GROUP_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Customer Status
                      </label>
                      <select
                        value={formData.status || "Active"}
                        onChange={(e) => handleInputChange("status", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: formData.status === "Active" || formData.status === "ACTIVE" ? "#059669" : formData.status === "Inactive" || formData.status === "INACTIVE" ? "#d97706" : "#dc2626",
                          fontSize: 12,
                          fontWeight: 700
                        }}
                      >
                        {CUSTOMER_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tax & Government Details */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        PAN
                      </label>
                      <input
                        type="text"
                        value={formData.pan}
                        onChange={(e) => handleInputChange("pan", e.target.value)}
                        placeholder="e.g. AARCS3816N"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontFamily: "monospace"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        GST Registration Type
                      </label>
                      <select
                        value={formData.gstRegistrationType}
                        onChange={(e) => handleInputChange("gstRegistrationType", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      >
                        {GST_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        State Code
                      </label>
                      <input
                        type="text"
                        value={formData.stateCode}
                        onChange={(e) => handleInputChange("stateCode", e.target.value)}
                        placeholder="06, 27, etc."
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontFamily: "monospace"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Pincode
                      </label>
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => handleInputChange("pincode", e.target.value)}
                        placeholder="131028"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>
                  </div>

                  {/* Commercial Terms & Limits */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Payment Terms ID
                      </label>
                      <select
                        value={formData.paymentTermsId}
                        onChange={(e) => handleInputChange("paymentTermsId", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      >
                        {PAYMENT_TERMS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Credit Limit (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.creditLimit}
                        onChange={(e) => handleInputChange("creditLimit", e.target.value)}
                        placeholder="500000.00"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Currency
                      </label>
                      <input
                        type="text"
                        value={formData.currency}
                        onChange={(e) => handleInputChange("currency", e.target.value)}
                        placeholder="INR"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12,
                          fontWeight: 700
                        }}
                      />
                    </div>
                  </div>

                  {/* MSME Details */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        Udyam Registration No.
                      </label>
                      <input
                        type="text"
                        value={formData.udyamNo}
                        onChange={(e) => handleInputChange("udyamNo", e.target.value)}
                        placeholder="UDYAM-XX-00-0000000"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                        MSME Category
                      </label>
                      <select
                        value={formData.msmeCategory}
                        onChange={(e) => handleInputChange("msmeCategory", e.target.value)}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `1px solid ${borderCol}`,
                          background: inputBg,
                          color: textPrimary,
                          fontSize: 12
                        }}
                      >
                        <option value="NOT_MSME">Not MSME</option>
                        <option value="MICRO">Micro Enterprise</option>
                        <option value="SMALL">Small Enterprise</option>
                        <option value="MEDIUM">Medium Enterprise</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Action Buttons Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 10,
                  paddingTop: 12,
                  borderTop: `1px solid ${borderCol}`
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: `1px solid ${borderCol}`,
                    background: "transparent",
                    color: textPrimary,
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
                    padding: "7px 24px",
                    borderRadius: 6,
                    border: "none",
                    background: "#c51f28",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(197, 31, 40, 0.3)"
                  }}
                >
                  {editingId ? "Update Customer in PostgreSQL" : "Save Customer to PostgreSQL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW DETAILS DRAWER (SLIDES IN ON DOUBLE CLICK OR VIEW BUTTON)            */}
      {/* ========================================================================= */}
      {detailItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "flex-end"
          }}
          onClick={() => setDetailItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 600,
              height: "100%",
              background: cardBg,
              boxShadow: "-10px 0 30px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              borderLeft: `1px solid ${borderCol}`
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${borderCol}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: dark ? "rgba(30,41,59,0.95)" : "#f8fafc"
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    background: "#2563eb",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: 4,
                    textTransform: "uppercase"
                  }}
                >
                  {detailItem.customerCode}
                </span>
                <h2 style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 700, color: textPrimary }}>
                  {detailItem.customerName}
                </h2>
                {detailItem.customerAlias && (
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: textSecondary }}>
                    Alias: {detailItem.customerAlias}
                  </p>
                )}
              </div>
              <button
                onClick={() => setDetailItem(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: textSecondary
                }}
              >
                &times;
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Approval status banner */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: dark ? "rgba(255,255,255,0.02)" : "#f1f5f9", padding: "10px 14px", borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: 10, color: textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Check by Accounts</span>
                  <div style={{ marginTop: 2, fontWeight: 700, fontSize: 12, color: detailItem.checkByAccounts ? "#059669" : "#dc2626" }}>
                    {detailItem.checkByAccounts ? "Verified / Approved (TRUE)" : "Pending Check (FALSE)"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Check by Sales</span>
                  <div style={{ marginTop: 2, fontWeight: 700, fontSize: 12, color: detailItem.checkBySales ? "#059669" : "#dc2626" }}>
                    {detailItem.checkBySales ? "Verified / Approved (TRUE)" : "Pending Check (FALSE)"}
                  </div>
                </div>
              </div>

              {/* Excel Sheet Primary Identifiers */}
              <div style={{ border: `1px solid ${borderCol}`, borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                  Primary Business Identifiers
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Code:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, color: "#2563eb" }}>{detailItem.customerCode || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>GST (GSTIN):</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, fontFamily: "monospace", color: textPrimary }}>{detailItem.gstin || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Billing Source:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary }}>{detailItem.billingSource || "Direct"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Supplier Code of SMS:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary }}>{detailItem.supplierCodeSms || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Domestic / Export:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, color: "#2563eb" }}>{detailItem.domesticExport || "Domestic"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Credit Days:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, color: textPrimary }}>{detailItem.creditDays ?? 30} Days</p>
                  </div>
                </div>
              </div>

              {/* Contacts */}
              <div style={{ border: `1px solid ${borderCol}`, borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                  Contact Information (Excel)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Sale Person:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, color: textPrimary }}>{detailItem.salesPerson || detailItem.contactPerson || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Sale Contact:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary, whiteSpace: "pre-wrap" }}>{detailItem.salesContact || detailItem.phone || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Sale Email:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary, wordBreak: "break-all" }}>{detailItem.salesEmail || detailItem.email || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Mode of Payment Reminder:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary }}>{detailItem.modeOfPaymentReminder || "-"}</p>
                  </div>
                  {detailItem.accountsContactDetails && (
                    <div>
                      <span style={{ color: textSecondary, fontSize: 11 }}>Accounts Person Name - Contact No. -Mail id:</span>
                      <p style={{ margin: "2px 0 0", fontWeight: 500, color: textPrimary, background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc", padding: "6px 8px", borderRadius: 4 }}>
                        {detailItem.accountsContactDetails}
                      </p>
                    </div>
                  )}
                  {detailItem.scm && (
                    <div>
                      <span style={{ color: textSecondary, fontSize: 11 }}>SCM:</span>
                      <p style={{ margin: "2px 0 0", fontWeight: 500, color: textPrimary }}>{detailItem.scm}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Addresses from Excel */}
              <div style={{ border: `1px solid ${borderCol}`, borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                  Addresses (Excel Sheet)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11, fontWeight: 700 }}>BILL TO ADDRESS:</span>
                    <p style={{ margin: "2px 0 0", color: textPrimary, whiteSpace: "pre-wrap" }}>{detailItem.billToAddress || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11, fontWeight: 700 }}>SHIP TO ON ADDRESS:</span>
                    <p style={{ margin: "2px 0 0", color: textPrimary, whiteSpace: "pre-wrap" }}>{detailItem.shipToAddress || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11, fontWeight: 700 }}>CUSTOMER ADDRESS:</span>
                    <p style={{ margin: "2px 0 0", color: textPrimary, whiteSpace: "pre-wrap" }}>{detailItem.customerAddress || detailItem.address || "-"}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
                    <div>
                      <span style={{ color: textSecondary, fontSize: 10 }}>City:</span>
                      <p style={{ margin: 0, fontWeight: 600, color: textPrimary }}>{detailItem.city || "-"}</p>
                    </div>
                    <div>
                      <span style={{ color: textSecondary, fontSize: 10 }}>State:</span>
                      <p style={{ margin: 0, fontWeight: 600, color: textPrimary }}>{detailItem.state || "-"}</p>
                    </div>
                    <div>
                      <span style={{ color: textSecondary, fontSize: 10 }}>Country:</span>
                      <p style={{ margin: 0, fontWeight: 600, color: textPrimary }}>{detailItem.country || "India"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab 2 System Attributes */}
              <div style={{ border: `1px solid ${borderCol}`, borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: textSecondary, textTransform: "uppercase" }}>
                  System Attributes (Tab 2)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Customer ID:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary }}>{detailItem.customerId || detailItem.customerCode}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Company ID:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary }}>{detailItem.companyId || "COMP-001"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Market Type:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary }}>{detailItem.marketType || detailItem.domesticExport || "Domestic"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Customer Category:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary }}>{detailItem.customerCategory || detailItem.customerType || "OEM"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Customer Group:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: textPrimary }}>{detailItem.customerGroup || "Automotive"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Customer Status:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, color: (detailItem.status === "ACTIVE" || detailItem.status === "Active") ? "#059669" : (detailItem.status === "BLOCKED" || detailItem.status === "Blocked") ? "#dc2626" : "#d97706" }}>{detailItem.status || "Active"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>PAN:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, fontFamily: "monospace", color: textPrimary }}>{detailItem.pan || "-"}</p>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, fontSize: 11 }}>Credit Limit:</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, color: textPrimary }}>₹{Number(detailItem.creditLimit || 500000).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: `1px solid ${borderCol}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                background: dark ? "rgba(30,41,59,0.95)" : "#f8fafc"
              }}
            >
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: `1px solid ${borderCol}`,
                  background: "transparent",
                  color: textPrimary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = detailItem;
                  setDetailItem(null);
                  handleOpenEditModal(item);
                }}
                style={{
                  padding: "7px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
