import { formatDisplayDate, formatDisplayDateTime } from "../../../shared/utils/dateFormat";
import { useState, useEffect, useRef, createElement } from "react";
import { MODULES_LIST, ModuleIcons } from "../../../shared/layout/modulesData";

// Keeps a flyout inside the window: its top is clamped and its height fills only the space below it.
const fitTop = (desired, min = 72) => Math.max(min, Math.min(desired, window.innerHeight - 260));
const fitMaxHeight = (top) => `${Math.max(240, window.innerHeight - top - 16)}px`;

export function SilverBrainLandingPage({
  onNavigateToPage,
  hideHeader = false,
  hideSidebar = false
}) {
  const [hoveredModule, setHoveredModule] = useState(null);
  const [drawerCoords, setDrawerCoords] = useState({ top: 0, left: 240 });
  const [currentTime, setCurrentTime] = useState(new Date());
  // The backend has no notifications service yet, so there is nothing unread to count.
  const notificationCount = 0;
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const closeTimerRef = useRef(null);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Live ticking date and time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseEnter = (mod, event) => {
    cancelClose();
    const rect = event.currentTarget.getBoundingClientRect();
    setDrawerCoords({ top: rect.top, left: rect.right });
    setHoveredModule(mod);
  };

  const handleMouseLeave = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setHoveredModule(null);
    }, 250);
  };

  const handleSubmoduleClick = (submod, modName) => {
    let target = submod.targetPage;
    if (!target && submod.name) {
      const lower = submod.name.toLowerCase();
      if (lower.includes("purchase requisition")) target = "purchase-requisition";
    }

    if (target && onNavigateToPage) {
      onNavigateToPage(target);
    } else {
      setToastMessage(`${submod.name} is not available yet.`);
    }
  };

  // Formatted date and time strings
  const dayName = currentTime.toLocaleDateString("en-IN", { weekday: "short" });
  const dateStr = formatDisplayDate(currentTime);
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
            width: 260,
            minWidth: 260,
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
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0
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
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: "clamp(6px, 1.2vh, 11px)",
              padding: "10px 0 14px",
              overflowY: "auto",
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
                    margin: "0 8px"
                  }}
                >
                  <button
                    onClick={() => {
                      const firstTarget =
                        mod.submodules?.[0]?.targetPage ||
                        mod.submodules?.[0]?.children?.[0]?.targetPage;
                      if (firstTarget) {
                        onNavigateToPage(firstTarget);
                      }
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9.5px 12px",
                      borderRadius: 8,
                      background: isHovered
                        ? "linear-gradient(90deg, rgba(197,31,40,0.2) 0%, rgba(30,41,59,0.9) 100%)"
                        : "transparent",
                      color: isHovered ? "#ffffff" : "#cbd5e1",
                      border: "none",
                      borderLeft: isHovered ? "3px solid #c51f28" : "3px solid transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: isHovered ? 700 : 500,
                      textAlign: "left",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span style={{ color: isHovered ? "#ef4444" : "#94a3b8", display: "flex", alignItems: "center" }}>
                        {createElement(ModuleIcons[mod.iconKey] || ModuleIcons.Engineering)}
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
                          transform: isHovered ? "translateX(2px)" : "none",
                          display: "flex",
                          alignItems: "center"
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
            onMouseEnter={() => {
              cancelClose();
              setHoveredModule(hoveredModule);
            }}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "fixed",
              top: fitTop(drawerCoords.top - 10, 74),
              left: drawerCoords.left + 4,
              width: 280,
              maxHeight: fitMaxHeight(fitTop(drawerCoords.top - 10, 74)),
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
              {hoveredModule.submodules.map((sub, sIdx) => {
                if (sub.children && sub.children.length > 0) {
                  // Groups list their screens inline, so every screen under this module is visible at once.
                  return (
                    <div key={sIdx} style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: sIdx > 0 ? 8 : 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 10px" }}>
                        {sub.name}
                      </div>
                      {sub.children.map((child, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => {
                            if (!child.ready) return; // screen not built yet
                            handleSubmoduleClick(child, hoveredModule.name);
                          }}
                          onMouseEnter={(e) => {
                            if (!child.ready) return;
                            e.currentTarget.style.background = "rgba(197,31,40,0.25)";
                            e.currentTarget.style.borderColor = "rgba(197,31,40,0.5)";
                            e.currentTarget.style.color = "#ffffff";
                            e.currentTarget.style.transform = "translateX(4px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                            e.currentTarget.style.color = child.ready ? "#f1f5f9" : "#64748b";
                            e.currentTarget.style.transform = "none";
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px 6px 18px",
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.04)",
                            color: child.ready ? "#f1f5f9" : "#64748b",
                            fontSize: 11.5,
                            fontWeight: 500,
                            cursor: child.ready ? "pointer" : "default",
                            textAlign: "left",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <span>{child.name}</span>
                          {child.ready && (
                            <span style={{ fontSize: 8.5, background: "rgba(16,185,129,0.18)", color: "#34d399", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                              READY
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                }


                return (
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
                      if (!sub.ready) return;
                      e.currentTarget.style.background = "rgba(197,31,40,0.25)";
                      e.currentTarget.style.borderColor = "rgba(197,31,40,0.5)";
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = sub.ready ? "#f1f5f9" : "#64748b";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    <span>{sub.name}</span>
                    {sub.ready && (
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
                );
              })}
            </div>

            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9.5, color: "#64748b" }}>Click to open workspace</span>
              <button
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
