import { useState, useEffect } from "react";

// Icons for the 14 ERP Modules
const ModuleIcons = {
  Engineering: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
  ArrowRight: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
};

// Module definitions with exact requested submodules
const MODULES_LIST = [
  {
    id: "engineering",
    name: "Engineering",
    icon: <ModuleIcons.Engineering />,
    submodules: [
      { name: "Item Master", targetPage: "item-master" },
      { name: "BOM", targetPage: "moulding-bom" },
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
    icon: <ModuleIcons.Purchase />,
    submodules: [
      { name: "Suppliers", targetPage: "company-master-list" },
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
    icon: <ModuleIcons.Gate />,
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
    icon: <ModuleIcons.Inventory />,
    submodules: [
      { name: "Items", targetPage: "item-wise-cb" },
      { name: "Warehouses", targetPage: "dept-wise-cb" },
      { name: "Stock Receipt", targetPage: "inventory" },
      { name: "Stock Issue", targetPage: "inventory" },
      { name: "Stock Transfer", targetPage: "inventory" },
      { name: "Stock Adjustment" },
      { name: "Batch / Lot" },
      { name: "Stock Ledger", targetPage: "dept-wise-cb" },
      { name: "Physical Stock" },
      { name: "Stock Reconciliation" }
    ]
  },
  {
    id: "quality",
    name: "Quality",
    icon: <ModuleIcons.Quality />,
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
    icon: <ModuleIcons.PPC />,
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
    icon: <ModuleIcons.Production />,
    submodules: [
      { name: "Production Orders" },
      { name: "Job Cards" },
      { name: "Material Consumption", targetPage: "moulding-bom" },
      { name: "WIP" },
      { name: "SFG" },
      { name: "FG" },
      { name: "Scrap" },
      { name: "Rework" },
      { name: "Production Entry", targetPage: "moulding-bom" }
    ]
  },
  {
    id: "crm",
    name: "CRM & Order Management",
    icon: <ModuleIcons.CRM />,
    submodules: [
      { name: "Customers", targetPage: "company-master-list" },
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
    icon: <ModuleIcons.Sales />,
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
    icon: <ModuleIcons.Finance />,
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
    icon: <ModuleIcons.Maintenance />,
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
    icon: <ModuleIcons.Reports />,
    submodules: [
      { name: "Production", targetPage: "dashboard" },
      { name: "Inventory", targetPage: "dept-wise-cb" },
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
    icon: <ModuleIcons.Help />,
    submodules: [
      { name: "Help Center" },
      { name: "User Manual", targetPage: "docs" },
      { name: "Support Tickets" },
      { name: "FAQ" },
      { name: "AI Assistant", targetPage: "ai-chatbot" }
    ]
  },
  {
    id: "settings",
    name: "Settings",
    icon: <ModuleIcons.Settings />,
    submodules: [
      { name: "Company", targetPage: "company-master-form" },
      { name: "Departments", targetPage: "dept-wise-cb" },
      { name: "Users", targetPage: "users" },
      { name: "Roles & Permissions", targetPage: "users" },
      { name: "Approval Workflows" },
      { name: "Document Numbering" },
      { name: "Tax / GST" },
      { name: "Notifications", targetPage: "notifications" },
      { name: "Integrations" },
      { name: "Backup" },
      { name: "Audit Logs" }
    ]
  }
];

export function SilverBrainLandingPage({
  onEnterCurrentProject,
  onNavigateToPage,
  hideHeader = false,
  hideSidebar = false
}) {
  const [hoveredModule, setHoveredModule] = useState(null);
  const [drawerCoords, setDrawerCoords] = useState({ top: 0, left: 240 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Live ticking date and time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch unread notifications count from backend API if available
  useEffect(() => {
    const api = import.meta.env.VITE_API_URL || (
      typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? ""
        : "https://silver-muller-seals-backend-deploy.onrender.com"
    );
    fetch(`${api}/api/notifications/unread-count`)
      .then((r) => (r.ok ? r.json() : { count: 3 }))
      .then((d) => setNotificationCount(Number(d.count) || 3))
      .catch(() => setNotificationCount(3));
  }, []);

  const handleMouseEnter = (mod, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDrawerCoords({ top: rect.top, left: rect.right });
    setHoveredModule(mod);
  };

  const handleMouseLeave = () => {
    setHoveredModule(null);
  };

  const handleSubmoduleClick = (submod, modName) => {
    if (submod.targetPage && onNavigateToPage) {
      onNavigateToPage(submod.targetPage);
    } else {
      setToastMessage(`${submod.name} is scheduled for linkage. Opening ERP Operations...`);
      setTimeout(() => {
        onEnterCurrentProject();
      }, 900);
    }
  };

  // Formatted date and time strings
  const dayName = currentTime.toLocaleDateString("en-IN", { weekday: "short" });
  const dateStr = currentTime.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const timeStr = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div
      style={{
        width: "100%",
        height: hideHeader ? "calc(100vh - 68px)" : "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {/* ========================================================= */}
      {/* 1. TOP HEADER (FULL WIDTH LEFT TO RIGHT)                   */}
      {/* ========================================================= */}
      {!hideHeader && (
      <header
        style={{
          width: "100%",
          height: 68,
          background: "#ffffff",
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          zIndex: 100,
          flexShrink: 0
        }}
      >
        {/* Left: Silver Brain Logo & Tagline */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Logo Emblem Matching Attached Image */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <svg width="36" height="36" viewBox="0 0 60 60" fill="none">
              {/* Red upper wing / S curved top */}
              <path
                d="M14 12C14 7.58 17.58 4 22 4H34C40.63 4 46 9.37 46 16C46 21.6 42.15 26.3 37 27.6V20C37 17.79 35.21 16 33 16H24C21.79 16 20 17.79 20 20V23C16.69 24.38 14 27.87 14 32V12Z"
                fill="#c51f28"
              />
              {/* Slate Gray lower wing / S curved bottom */}
              <path
                d="M46 48C46 52.42 42.42 56 38 56H26C19.37 56 14 50.63 14 44C14 38.4 17.85 33.7 23 32.4V40C23 42.21 24.79 44 27 44H36C38.21 44 40 42.21 40 40V37C43.31 35.62 46 32.13 46 28V48Z"
                fill="#64748b"
              />
              {/* Central precision pin hole */}
              <circle cx="28" cy="30" r="3.5" fill="#ffffff" />
            </svg>

            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#64748b",
                    letterSpacing: "-0.5px",
                    fontFamily: "'Segoe UI', system-ui, sans-serif"
                  }}
                >
                  silver
                </span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#c51f28",
                    letterSpacing: "-0.5px",
                    fontFamily: "'Segoe UI', system-ui, sans-serif"
                  }}
                >
                  Brain
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", transform: "translateY(-6px)" }}>
                  &reg;
                </span>
              </div>
              <div
                style={{
                  fontSize: 8.5,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  color: "#475569",
                  textTransform: "uppercase",
                  marginTop: -2
                }}
              >
                SINCE 1967 &bull; OIL SEAL SOLUTIONS
              </div>
            </div>
          </div>
        </div>

        {/* Right Header: Exactly ordered as requested: */}
        {/* user profile | notification icon | date and time */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          
          {/* 1. USER PROFILE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 10px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0"
            }}
          >
            <div style={{ position: "relative" }}>
              <img
                src="/avatar-kiran-bhalla.jpg"
                alt="Kiran Bhalla"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "block",
                  border: "2px solid #e2e8f0",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                }}
              />
              {/* Online indicator dot */}
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#10b981",
                  border: "2px solid #ffffff"
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>
                Kiran Bhalla
              </p>
              <p style={{ fontSize: 11, fontWeight: 500, color: "#64748b", margin: 0 }}>
                Admin &bull; <span style={{ color: "#10b981", fontWeight: 600 }}>Online</span>
              </p>
            </div>
          </div>

          {/* Divider | */}
          <div style={{ width: 1, height: 26, background: "#cbd5e1" }} />

          {/* 2. NOTIFICATION ICON */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotificationPopup((v) => !v)}
              title="System Notifications"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.15s",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fee2e2";
                e.currentTarget.style.color = "#c51f28";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.color = "#475569";
              }}
            >
              <ModuleIcons.Bell />
              {notificationCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: "#c51f28",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    boxShadow: "0 2px 6px rgba(197,31,40,0.5)"
                  }}
                >
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Preview */}
            {showNotificationPopup && (
              <div
                style={{
                  position: "absolute",
                  top: 50,
                  right: 0,
                  width: 310,
                  background: "#ffffff",
                  borderRadius: 14,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                  border: "1px solid #e2e8f0",
                  padding: "14px 16px",
                  zIndex: 200
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Plant & Stock Alerts</span>
                  <span style={{ fontSize: 10, background: "#fee2e2", color: "#c51f28", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                    {notificationCount} New
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, padding: "8px 10px", background: "#f8fafc", borderRadius: 8, borderLeft: "3px solid #ef4444" }}>
                    <p style={{ fontWeight: 700, color: "#0f172a", margin: 0 }}>Moulding Compound Stock</p>
                    <p style={{ color: "#64748b", margin: "2px 0 0" }}>Outer metal shell batch #B01 running below threshold.</p>
                  </div>
                  <div style={{ fontSize: 11, padding: "8px 10px", background: "#f8fafc", borderRadius: 8, borderLeft: "3px solid #f59e0b" }}>
                    <p style={{ fontWeight: 700, color: "#0f172a", margin: 0 }}>BOM Moulding Transfer</p>
                    <p style={{ color: "#64748b", margin: "2px 0 0" }}>Line 04 transfer slip #TR-884 awaiting QC sign-off.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNotificationPopup(false);
                    onNavigateToPage("notifications");
                  }}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "7px 0",
                    background: "#c51f28",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Open All Notifications &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Divider | */}
          <div style={{ width: 1, height: 26, background: "#cbd5e1" }} />

          {/* 3. DATE AND TIME (IN THE TOP RIGHT CORNER) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "6px 14px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            {/* Calendar Icon */}
            <div style={{ color: "#c51f28" }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", letterSpacing: "0.02em" }}>
                {timeStr}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b" }}>
                {dayName}, {dateStr}
              </div>
            </div>
          </div>

        </div>
      </header>
      )}

      {/* ========================================================= */}
      {/* MAIN CONTAINER: LEFT SIDEBAR + RIGHT HERO PLANT PICTURE     */}
      {/* ========================================================= */}
      <div style={{ flex: 1, display: "flex", width: "100%", overflow: "hidden", position: "relative" }}>
        
        {/* ========================================================= */}
        {/* 2. THE SIDEBAR (LEFT SIDE - 14 MODULES)                    */}
        {/* ========================================================= */}
        {!hideSidebar && (
        <aside
          style={{
            width: 250,
            minWidth: 250,
            background: "#1e293b",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            zIndex: 40,
            boxShadow: "4px 0 20px rgba(0,0,0,0.25)"
          }}
        >
          {/* Sidebar Section Title */}
          <div
            style={{
              padding: "14px 18px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase" }}>
              ERP Modules &bull; 14 Departments
            </span>
            <span style={{ fontSize: 9, background: "rgba(197,31,40,0.25)", color: "#f87171", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
              Live
            </span>
          </div>

          {/* Module List with hover flyout drawer trigger */}
          <nav
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 0",
              scrollbarWidth: "none"
            }}
          >
            {MODULES_LIST.map((mod, idx) => {
              const isHovered = hoveredModule?.id === mod.id;
              return (
                <div
                  key={mod.id}
                  onMouseEnter={(e) => handleMouseEnter(mod, e)}
                  style={{
                    position: "relative",
                    margin: "1px 8px"
                  }}
                >
                  <button
                    onClick={() => {
                      if (mod.submodules?.[0]?.targetPage) {
                        onNavigateToPage(mod.submodules[0].targetPage);
                      } else {
                        onEnterCurrentProject();
                      }
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: isHovered
                        ? "linear-gradient(90deg, rgba(197,31,40,0.2) 0%, rgba(30,41,59,0.9) 100%)"
                        : "transparent",
                      color: isHovered ? "#ffffff" : "#cbd5e1",
                      border: "none",
                      borderLeft: isHovered ? "3px solid #c51f28" : "3px solid transparent",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: isHovered ? 700 : 500,
                      textAlign: "left",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: isHovered ? "#ef4444" : "#94a3b8", display: "flex" }}>
                        {mod.icon}
                      </span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {mod.name}
                      </span>
                    </div>

                    {/* Arrow indicator showing sub-modules exist */}
                    {mod.submodules && mod.submodules.length > 0 && (
                      <span
                        style={{
                          color: isHovered ? "#ef4444" : "#64748b",
                          transition: "transform 0.2s",
                          transform: isHovered ? "translateX(2px)" : "none"
                        }}
                      >
                        <ModuleIcons.ChevronRight />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "#172033",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#f8fafc", margin: 0 }}>Silver Muller Seals</p>
              <p style={{ fontSize: 9.5, color: "#94a3b8", margin: 0 }}>Plant Operations v2.5</p>
            </div>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981"
              }}
              title="System Connected"
            />
          </div>
        </aside>
        )}

        {/* ========================================================= */}
        {/* SUBMODULE HOVER DRAWER / FLYOUT MENU                      */}
        {/* ========================================================= */}
        {!hideSidebar && hoveredModule && hoveredModule.submodules && (
          <div
            onMouseEnter={() => setHoveredModule(hoveredModule)}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "fixed",
              top: Math.max(74, Math.min(drawerCoords.top - 10, window.innerHeight - 460)),
              left: drawerCoords.left + 4,
              width: 280,
              maxHeight: "calc(100vh - 90px)",
              overflowY: "auto",
              scrollbarWidth: "thin",
              background: "#1e293b",
              borderRadius: 12,
              padding: "12px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
              zIndex: 300,
              borderLeft: "3px solid #c51f28",
              animation: "fadeIn 0.15s ease-out"
            }}
          >
            {/* Drawer Header */}
            <div style={{ paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                {hoveredModule.name}
              </p>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: "2px 0 0" }}>
                Select department action:
              </p>
            </div>

            {/* Sub-modules list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {hoveredModule.submodules.map((sub, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => handleSubmoduleClick(sub, hoveredModule.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    color: "#f1f5f9",
                    fontSize: 11.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(197,31,40,0.25)";
                    e.currentTarget.style.borderColor = "rgba(197,31,40,0.5)";
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "#f1f5f9";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <span>{sub.name}</span>
                  {sub.targetPage && (
                    <span
                      style={{
                        fontSize: 9,
                        background: "#10b981",
                        color: "#ffffff",
                        padding: "1px 5px",
                        borderRadius: 3,
                        fontWeight: 700
                      }}
                    >
                      READY
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9.5, color: "#64748b" }}>Click to open workspace</span>
              <button
                onClick={onEnterCurrentProject}
                style={{
                  fontSize: 10,
                  color: "#ef4444",
                  fontWeight: 700,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3
                }}
              >
                Go &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. RIGHT MAIN AREA (ONLY THE PICTURE COVERING THE SCREEN)  */}
        {/* ========================================================= */}
        <main
          style={{
            flex: 1,
            height: "100%",
            position: "relative",
            background: "#090d16",
            overflow: "hidden",
            margin: 0,
            padding: 0
          }}
        >
          {/* The Picture Covering the Entire Area After Sidebar */}
          <img
            src="/silver-brain-factory.jpg?v=2"
            alt="Silver Brain Oil Seal Solutions - Factory Floor"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block"
            }}
          />

          {/* Small Arrow on Top Right Corner of the Image */}
          <button
            onClick={onEnterCurrentProject}
            title="Enter ERP Project"
            aria-label="Enter ERP Project"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(6px)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 50,
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#c51f28";
              e.currentTarget.style.borderColor = "#c51f28";
              e.currentTarget.style.transform = "scale(1.12) translateX(2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(197, 31, 40, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.72)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.4)";
            }}
          >
            <ModuleIcons.ArrowRight />
          </button>
        </main>
      </div>

      {/* Temporary Toast Banner if submodule clicked */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            border: "1px solid #c51f28",
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            gap: 10
          }}
        >
          <span style={{ color: "#ef4444" }}>&bull;</span>
          {toastMessage}
        </div>
      )}

      {/* Global Inline Keyframes */}
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: -4px 0 20px rgba(197,31,40,0.5); }
          50% { box-shadow: -6px 0 32px rgba(197,31,40,0.95); }
          100% { box-shadow: -4px 0 20px rgba(197,31,40,0.5); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
