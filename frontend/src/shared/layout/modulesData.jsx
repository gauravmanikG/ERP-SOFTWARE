// 14 ERP Modules and Department definitions for Silver Muller Seals
export const ModuleIcons = {
  Engineering: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Purchase: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Gate: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-8 5h8m-8 5h8M5 3v18M19 3v18" />
    </svg>
  ),
  Inventory: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m8 4v10M4 7l8 4 8-4" />
    </svg>
  ),
  Quality: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  PPC: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Production: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  CRM: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Sales: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Finance: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Maintenance: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ),
  Reports: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Help: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Bell: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
};

export const MODULES_LIST = [
  {
    id: "engineering",
    name: "Engineering",
    iconKey: "Engineering",
    submodules: [
      { name: "Item Master", targetPage: "item-master", ready: true },
      { name: "BOM", targetPage: "moulding-bom", ready: true },
      { name: "Routing" },
      { name: "Operations" },
      { name: "Work Centers" },
      { name: "Machines" },
      { name: "Drawings & Documents" },
      { name: "Engineering Changes" }
    ]
  },
  {
    id: "purchase",
    name: "Purchase",
    iconKey: "Purchase",
    submodules: [
      { name: "Suppliers", targetPage: "supplier-master", ready: true },
      { name: "Purchase Requisition" },
      { name: "RFQ" },
      { name: "Quotations" },
      { name: "Purchase Orders" },
      { name: "GRN" },
      { name: "Purchase Returns" },
      { name: "Purchase Invoices" }
    ]
  },
  {
    id: "gate",
    name: "Gate",
    iconKey: "Gate",
    submodules: [
      { name: "Gate Entry" },
      { name: "Material Inward" },
      { name: "Material Outward" },
      { name: "Vehicle Entry" },
      { name: "Gate Pass" },
      { name: "Gate Exit" }
    ]
  },
  {
    id: "inventory",
    name: "Inventory",
    iconKey: "Inventory",
    submodules: [
      { name: "Items", targetPage: "item-wise-cb", ready: true },
      { name: "Warehouses", targetPage: "dept-wise-cb", ready: true },
      { name: "Stock Receipt", targetPage: "inventory", ready: true },
      { name: "Stock Issue", targetPage: "inventory", ready: true },
      { name: "Stock Transfer", targetPage: "inventory", ready: true },
      { name: "Stock Adjustment" },
      { name: "Batch / Lot" },
      { name: "Stock Ledger", targetPage: "dept-wise-cb", ready: true },
      { name: "Physical Stock" },
      { name: "Stock Reconciliation" }
    ]
  },
  {
    id: "quality",
    name: "Quality",
    iconKey: "Quality",
    submodules: [
      { name: "Inspection Plans" },
      { name: "Incoming Inspection" },
      { name: "In-Process Inspection" },
      { name: "Final Inspection" },
      { name: "NCR" },
      { name: "Rework" },
      { name: "Rejection" },
      { name: "CAPA" }
    ]
  },
  {
    id: "ppc",
    name: "PPC",
    iconKey: "PPC",
    submodules: [
      { name: "Demand" },
      { name: "Production Planning" },
      { name: "MRP" },
      { name: "Capacity Planning" },
      { name: "Production Orders" },
      { name: "Scheduling" },
      { name: "Material Shortage" }
    ]
  },
  {
    id: "production",
    name: "Production",
    iconKey: "Production",
    submodules: [
      { name: "Production Orders" },
      { name: "Job Cards" },
      { name: "Material Consumption", targetPage: "moulding-bom", ready: true },
      { name: "WIP" },
      { name: "SFG" },
      { name: "FG" },
      { name: "Scrap" },
      { name: "Rework" },
      { name: "Production Entry", targetPage: "moulding-bom", ready: true }
    ]
  },
  {
    id: "crm",
    name: "CRM & Order Management",
    iconKey: "CRM",
    submodules: [
      { name: "Customers", targetPage: "customer-master", ready: true },
      { name: "Leads" },
      { name: "Enquiries" },
      { name: "Quotations" },
      { name: "Sales Orders" },
      { name: "Follow-ups" },
      { name: "Customer Complaints" }
    ]
  },
  {
    id: "sales",
    name: "Sales & Dispatch",
    iconKey: "Sales",
    submodules: [
      { name: "Sales Orders" },
      { name: "Pick List" },
      { name: "Packing" },
      { name: "Delivery Challan" },
      { name: "E-Invoice" },
      { name: "E-Way Bill" },
      { name: "Dispatch" },
      { name: "Sales Return" }
    ]
  },
  {
    id: "finance",
    name: "Finance / Accounts",
    iconKey: "Finance",
    submodules: [
      { name: "Chart of Accounts" },
      { name: "Journal" },
      { name: "Receivables" },
      { name: "Payables" },
      { name: "Payments" },
      { name: "Receipts" },
      { name: "GST" },
      { name: "Bank Reconciliation" },
      { name: "Fixed Assets" },
      { name: "Financial Statements" }
    ]
  },
  {
    id: "maintenance",
    name: "Maintenance",
    iconKey: "Maintenance",
    submodules: [
      { name: "Machines" },
      { name: "Maintenance Requests" },
      { name: "Preventive Maintenance" },
      { name: "Breakdown" },
      { name: "Work Orders" },
      { name: "Spare Parts" },
      { name: "Downtime" },
      { name: "MTTR / MTBF" },
      { name: "Maintenance Cost" }
    ]
  },
  {
    id: "reports",
    name: "Reports & Analysis",
    iconKey: "Reports",
    submodules: [
      { name: "Production", targetPage: "dashboard", ready: true },
      { name: "Inventory", targetPage: "dept-wise-cb", ready: true },
      { name: "Purchase" },
      { name: "Sales" },
      { name: "Quality" },
      { name: "Maintenance" },
      { name: "Finance" }
    ]
  },
  {
    id: "help",
    name: "Help & Support",
    iconKey: "Help",
    submodules: [
      { name: "Help Center" },
      { name: "User Manual", targetPage: "docs", ready: true },
      { name: "Support Tickets" },
      { name: "FAQ" },
      { name: "AI Assistant", targetPage: "ai-chatbot", ready: true }
    ]
  },
  {
    id: "settings",
    name: "Settings",
    iconKey: "Settings",
    submodules: [
      { name: "Company", targetPage: "company-master-form", ready: true },
      { name: "Departments", targetPage: "dept-wise-cb", ready: true },
      { name: "Users", targetPage: "users", ready: true },
      { name: "Roles & Permissions", targetPage: "users", ready: true },
      { name: "Approval Workflows" },
      { name: "Document Numbering" },
      { name: "Tax / GST" },
      { name: "Notifications", targetPage: "notifications", ready: true },
      { name: "Integrations" },
      { name: "Backup" },
      { name: "Audit Logs" }
    ]
  }
];
