import { useState, useEffect } from "react";
import { ModuleIcons } from "./modulesData";

export function GlobalTopHeader({
  sidebarOpen,
  onToggleSidebar,
  currentView,
  erpSlot,
  onNavigateHome,
  onNavigateNotifications
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  // Live ticking date and time every 1 second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch unread notifications count from backend API if available
  useEffect(() => {
    const api =
      import.meta.env.VITE_API_URL ||
      (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? ""
        : "https://silver-muller-seals-backend-deploy.onrender.com");
    fetch(`${api}/api/notifications/unread-count`)
      .then((r) => (r.ok ? r.json() : { count: 3 }))
      .then((d) => setNotificationCount(Number(d.count) || 3))
      .catch(() => setNotificationCount(3));
  }, []);

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

  // Dynamic breadcrumb label based on active screen
  const getScreenBreadcrumb = () => {
    if (currentView === "item-master") {
      return { module: "Engineering", screen: "Item Master Specifications" };
    }
    if (currentView === "operations") {
      const slotMap = {
        dashboard: "Dashboard Overview",
        notifications: "Plant & System Alerts",
        docs: "User Documentation",
        "ai-chatbot": "AI Plant Assistant",
        "entry-forms": "Entry Forms · Screen 1",
        "company-master-form": "Company & Supplier Master",
        "company-master-list": "Company Master List",
        inventory: "Inventory Management",
        "moulding-bom": "BOM Moulding Transfer",
        "dept-wise-cb": "Department Stock Ledger",
        "item-wise-cb": "Item Wise Closing Balance",
        users: "Users & Security Roles",
        settings: "System Settings"
      };
      return { module: "Plant Operations", screen: slotMap[erpSlot] || erpSlot || "ERP Dashboard" };
    }
    return { module: "Silver Muller Seals", screen: "Plant Operations v2.5" };
  };

  const breadcrumb = getScreenBreadcrumb();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        right: 0,
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
        zIndex: 1000,
        flexShrink: 0,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        boxSizing: "border-box"
      }}
    >
      {/* ========================================================= */}
      {/* LEFT: SIDEBAR TOGGLE BUTTON + SILVER BRAIN LOGO + BADGE   */}
      {/* ========================================================= */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        
        {/* Small arrow for opening/closing sidebar on workspace pages (NO caption) */}
        {currentView !== "home" && onToggleSidebar && (
          <>
            <button
              onClick={onToggleSidebar}
              id="btn-header-sidebar-arrow"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: sidebarOpen ? "#fee2e2" : "#f8fafc",
                color: sidebarOpen ? "#c51f28" : "#475569",
                border: sidebarOpen ? "1.5px solid #c51f28" : "1px solid #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fee2e2";
                e.currentTarget.style.color = "#c51f28";
                e.currentTarget.style.borderColor = "#c51f28";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = sidebarOpen ? "#fee2e2" : "#f8fafc";
                e.currentTarget.style.color = sidebarOpen ? "#c51f28" : "#475569";
                e.currentTarget.style.borderColor = sidebarOpen ? "#c51f28" : "#cbd5e1";
              }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                )}
              </svg>
            </button>
            <div style={{ width: 1, height: 26, background: "#e2e8f0" }} />
          </>
        )}

        {/* Silver Brain Logo & Tagline (Clickable to return Home) */}
        <div
          onClick={onNavigateHome}
          title="Click to return to Silver Brain Home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          {/* Logo Emblem Matching Attached Image */}
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span
                style={{
                  fontSize: 23,
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
                  fontSize: 25,
                  fontWeight: 900,
                  color: "#c51f28",
                  letterSpacing: "-0.5px",
                  fontFamily: "'Segoe UI', system-ui, sans-serif"
                }}
              >
                Brain
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#64748b",
                  transform: "translateY(-6px)"
                }}
              >
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

        {/* Current Screen Breadcrumb Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "4px 10px",
            marginLeft: 8
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
            {breadcrumb.module}
          </span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>&rsaquo;</span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "#0f172a" }}>
            {breadcrumb.screen}
          </span>
        </div>

      </div>

      {/* ========================================================= */}
      {/* RIGHT: USER PROFILE | NOTIFICATIONS | DATE & TIME         */}
      {/* ========================================================= */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        
        {/* 1. USER PROFILE: KIRAN BHALLA */}
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
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                lineHeight: 1.2
              }}
            >
              Kiran Bhalla
            </p>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#64748b",
                margin: 0
              }}
            >
              Admin &bull;{" "}
              <span style={{ color: "#10b981", fontWeight: 700 }}>Online</span>
            </p>
          </div>
        </div>

        {/* Divider | */}
        <div style={{ width: 1, height: 26, background: "#cbd5e1" }} />

        {/* 2. NOTIFICATION ICON & POPUP */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotificationPopup((v) => !v)}
            title="System Notifications"
            id="btn-global-notifications"
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
                width: 320,
                background: "#ffffff",
                borderRadius: 14,
                boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                border: "1px solid #e2e8f0",
                padding: "14px 16px",
                zIndex: 2000
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#0f172a"
                  }}
                >
                  Plant & Stock Alerts
                </span>
                <span
                  style={{
                    fontSize: 10,
                    background: "#fee2e2",
                    color: "#c51f28",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4
                  }}
                >
                  {notificationCount} New
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    padding: "8px 10px",
                    background: "#f8fafc",
                    borderRadius: 8,
                    borderLeft: "3px solid #ef4444"
                  }}
                >
                  <p style={{ fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Moulding Compound Stock
                  </p>
                  <p style={{ color: "#64748b", margin: "2px 0 0" }}>
                    Outer metal shell batch #B01 running below threshold.
                  </p>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    padding: "8px 10px",
                    background: "#f8fafc",
                    borderRadius: 8,
                    borderLeft: "3px solid #f59e0b"
                  }}
                >
                  <p style={{ fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    BOM Moulding Transfer
                  </p>
                  <p style={{ color: "#64748b", margin: "2px 0 0" }}>
                    Line 04 transfer slip #TR-884 awaiting QC sign-off.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNotificationPopup(false);
                  if (onNavigateNotifications) onNavigateNotifications();
                }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "8px 0",
                  background: "#c51f28",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 11.5,
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
          {/* Calendar Icon in Brand Red */}
          <div style={{ color: "#c51f28" }}>
            <svg
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "0.02em"
              }}
            >
              {timeStr}
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#64748b"
              }}
            >
              {dayName}, {dateStr}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
