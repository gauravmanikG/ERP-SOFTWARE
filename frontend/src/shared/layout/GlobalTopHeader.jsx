import { useState, useEffect, useRef } from "react";
import { LogOut, Camera, ArrowLeft, Home } from "lucide-react";
import * as adminApi from "../../modules/settings/admin/api";
import { fileToProfilePhoto } from "../../modules/auth/profilePhoto";
import { formatDisplayDate, formatDisplayDateTime } from "../utils/dateFormat";
import { ModuleIcons } from "./modulesData";
import ThemeToggle from "../components/ThemeToggle";
import { useCurrentUser } from "../../modules/auth/AuthGate";

// A stable color for a user's initials avatar, picked from their name so the same
// person always gets the same color (no per-user photo exists in this system).
const AVATAR_PALETTE = ["#c51f28", "#0f766e", "#1d4ed8", "#7c3aed", "#b45309", "#0e7490"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function initialsOf(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function GlobalTopHeader({
  sidebarOpen,
  onToggleSidebar,
  currentView,
  erpSlot,
  onNavigateHome,
  canGoBack,
  onGoBack,
  onNavigateNotifications
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  // The backend has no notifications service yet, so there is nothing unread to count.
  const notificationCount = 0;
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const me = useCurrentUser();
  const displayName = me?.name || "—";
  const displayRole = me?.roleName || me?.roleCode || "—";
  const photoInputRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again later
    if (!file) return;
    setPhotoBusy(true);
    try {
      const photo = await fileToProfilePhoto(file);
      const saved = await adminApi.updateMyPhoto(photo);
      me?.updateUser?.({ photo: saved?.photo ?? photo });
    } catch (err) {
      window.alert(err.message || "Could not update the profile picture.");
    } finally {
      setPhotoBusy(false);
    }
  };

  // Live ticking date and time every 1 second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Formatted date and time strings
  const dayName = currentTime.toLocaleDateString("en-IN", { weekday: "short" });
  const dateStr = formatDisplayDate(currentTime);
  const timeStr = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  // Dynamic breadcrumb label based on active screen
  const getScreenBreadcrumb = () => {
    if (currentView === "item-master") {
      return { module: "Engineering", screen: "Item Master · FG (Finished Goods)" };
    }
    if (currentView === "item-master-other") {
      return { module: "Engineering", screen: "Item Master · Other (Non-FG)" };
    }
    if (currentView === "supplier-master") {
      return { module: "Purchase", screen: "Supplier Master Directory" };
    }
    if (currentView === "vendor-quotations") {
      return { module: "Purchase Module", screen: "Vendor Quotations (RFQ & Rates)" };
    }
    if (currentView === "purchase-requisition") {
      return { module: "Purchase Module", screen: "Purchase Requisition (PR) Management" };
    }
    if (currentView === "rfq") {
      return { module: "Purchase Module", screen: "Request for Quotation (RFQ)" };
    }
    if (currentView === "grn") {
      return { module: "Purchase Module", screen: "Goods Receipt Note (GRN)" };
    }
    if (currentView === "customer-master") {
      return { module: "CRM & Sales", screen: "Customer Master Directory" };
    }
    if (currentView === "documentation") {
      return { module: "Documentation", screen: "Guides, Backend, Flowcharts & Live System" };
    }
    if (currentView === "department-master") {
      return { module: "Settings & Administration", screen: "Department Master Directory" };
    }
    if (currentView === "operations") {
      const slotMap = {
        dashboard: "Dashboard Overview",
        notifications: "Plant & System Alerts",
        docs: "User Documentation",
        "ai-chatbot": "AI Plant Assistant",
        "entry-forms": "Entry Forms · Screen 1",
        "vendor-quotations": "Vendor Quotations (RFQ & Rates)",
        quotations: "Vendor Quotations (RFQ & Rates)",
        rfq: "Request for Quotation (RFQ)",
        grn: "Goods Receipt Note (GRN)",
        "supplier-master": "Supplier Master Directory",
        inventory: "Inventory Management",
        "dept-wise-cb": "Department Stock Ledger",
        "item-wise-cb": "Item Wise Closing Balance",
        users: "Users & Security Roles",
        settings: "System Settings"
      };
      return { module: "Plant Operations", screen: slotMap[erpSlot] || erpSlot || "ERP Dashboard" };
    }
    return { module: "Silver Brain", screen: "Intelligence Systems · ERP" };
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
        background: "#f8fafc",
        color: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
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
                background: sidebarOpen ? "#fee2e2" : "#ffffff",
                color: sidebarOpen ? "#c51f28" : "#475569",
                border: sidebarOpen ? "1.5px solid #c51f28" : "1px solid #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.15s ease",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fee2e2";
                e.currentTarget.style.color = "#c51f28";
                e.currentTarget.style.borderColor = "#c51f28";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = sidebarOpen ? "#fee2e2" : "#ffffff";
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

        {/* Back (previous screen) and Home (landing page), on every screen */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <HeaderNavButton
            id="btn-header-back"
            title={canGoBack ? "Back to the previous screen (Alt+Left)" : "No previous screen"}
            disabled={!canGoBack}
            onClick={onGoBack}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </HeaderNavButton>
          <HeaderNavButton
            id="btn-header-home"
            title={currentView === "home" ? "You are on Home" : "Home"}
            active={currentView === "home"}
            onClick={onNavigateHome}
          >
            <Home size={18} strokeWidth={2.3} />
          </HeaderNavButton>
        </div>
        <div style={{ width: 1, height: 26, background: "#e2e8f0" }} />

        {/* Silver Brain Logo (Clickable to return Home) */}
        <div
          onClick={onNavigateHome}
          title="Click to return to Silver Brain Home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            userSelect: "none",
            flexShrink: 0
          }}
        >
          {/* Brain icon — tightly cropped to edges, fills header height */}
          <img
            src="/silver-brain-icon.png?v=4"
            alt="Silver Brain"
            style={{
              height: 62,
              width: "auto",
              display: "block",
              flexShrink: 0,
              objectFit: "contain"
            }}
          />

          {/* Wordmark */}
          <div style={{ lineHeight: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontSize: 21.5,
                  fontWeight: 800,
                  color: "#1e293b",
                  letterSpacing: "-0.5px",
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
                }}
              >
                Silver
              </span>
              <span
                style={{
                  fontSize: 21.5,
                  fontWeight: 900,
                  color: "#c51f28",
                  letterSpacing: "-0.5px",
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
                }}
              >
                Brain
              </span>
            </div>
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "#64748b",
                textTransform: "uppercase",
                marginTop: 2
              }}
            >
              Intelligence Systems
            </div>
          </div>
        </div>


      </div>

      {/* ========================================================= */}
      {/* RIGHT: USER PROFILE | NOTIFICATIONS | DATE & TIME         */}
      {/* ========================================================= */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        
        {/* 1. USER PROFILE: the signed-in user, read from the session (AuthGate) */}
        <div
          title={me?.email || ""}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "5px 12px",
            borderRadius: 10,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
          }}
        >
          <div style={{ position: "relative" }}>
            {/* Click the avatar to change your own profile picture */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoBusy}
              title="Change profile picture"
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
                cursor: photoBusy ? "wait" : "pointer",
                background: me?.photo ? "#ffffff" : avatarColor(displayName),
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 800,
                border: "2px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                userSelect: "none"
              }}
            >
              {me?.photo
                ? <img src={me.photo} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : initialsOf(displayName)}
              {(avatarHover || photoBusy) && (
                <span style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={14} color="#ffffff" />
                </span>
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={onPickPhoto}
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
                lineHeight: 1.2,
                maxWidth: 150,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {displayName}
            </p>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#64748b",
                margin: 0
              }}
            >
              {displayRole} &bull;{" "}
              <span style={{ color: "#10b981", fontWeight: 700 }}>Online</span>
            </p>
          </div>
          {me?.signOut && (
            <button
              onClick={me.signOut}
              title="Sign out"
              style={{
                border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer",
                display: "flex", alignItems: "center", padding: 4, marginLeft: 2, borderRadius: 6
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#c51f28"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>

        {/* Divider | */}
        <div style={{ width: 1, height: 26, background: "#e2e8f0" }} />

        {/* 2. DAY / NIGHT VIEW SWITCH */}
        <ThemeToggle />

        {/* 3. NOTIFICATION ICON & POPUP */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotificationPopup((v) => !v)}
            title="System Notifications"
            id="btn-global-notifications"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              cursor: "pointer",
              transition: "all 0.15s",
              position: "relative",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fee2e2";
              e.currentTarget.style.color = "#c51f28";
              e.currentTarget.style.borderColor = "#c51f28";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.borderColor = "#e2e8f0";
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
                  boxShadow: "0 2px 6px rgba(197,31,40,0.4)"
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
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
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
        <div style={{ width: 1, height: 26, background: "#e2e8f0" }} />

        {/* 3. DATE AND TIME (IN THE TOP RIGHT CORNER) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "6px 14px",
            borderRadius: 10,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
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

// A square icon button in the header's left group (Back, Home).
function HeaderNavButton({ id, title, disabled, active, onClick, children }) {
  const rest = { background: active ? "#fee2e2" : "#ffffff", color: active ? "#c51f28" : "#475569", borderColor: active ? "#c51f28" : "#cbd5e1" };
  return (
    <button
      type="button"
      id={id}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        background: rest.background,
        color: rest.color,
        border: `1px solid ${rest.borderColor}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        padding: 0,
        transition: "all 0.15s ease",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)"
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "#fee2e2";
        e.currentTarget.style.color = "#c51f28";
        e.currentTarget.style.borderColor = "#c51f28";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = rest.background;
        e.currentTarget.style.color = rest.color;
        e.currentTarget.style.borderColor = rest.borderColor;
      }}
    >
      {children}
    </button>
  );
}
