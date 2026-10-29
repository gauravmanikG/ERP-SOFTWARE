import { useState, useEffect, useRef } from "react";
import { MODULES_LIST, ModuleIcons } from "./modulesData";

// Keeps a flyout inside the window: its top is clamped and its height fills only the space below it.
const fitTop = (desired, min = 72) => Math.max(min, Math.min(desired, window.innerHeight - 260));
const fitMaxHeight = (top) => `${Math.max(240, window.innerHeight - top - 16)}px`;

export function GlobalMoveableSidebar({
  isOpen,
  onClose,
  onOpen,
  currentView,
  erpSlot,
  onNavigate
}) {
  const [hoveredModule, setHoveredModule] = useState(null);
  const [drawerCoords, setDrawerCoords] = useState({ top: 0, left: 260 });
  const [searchQuery, setSearchQuery] = useState("");
  const closeTimerRef = useRef(null);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Listen to Escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    setHoveredModule(null);
    let target = submod.targetPage;
    if (!target && submod.name) {
      const lower = submod.name.toLowerCase();
      if (lower.includes("purchase requisition")) target = "purchase-requisition";
      else if (lower.includes("quotation")) target = "vendor-quotations";
      else if (lower.includes("customer")) target = "customer-master";
    }
    if (target) {
      onNavigate(target, modName);
    } else {
      onNavigate("dashboard", modName);
    }
    onClose();
  };

  // Filter modules based on search input
  const filteredModules = MODULES_LIST.filter((mod) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      mod.name.toLowerCase().includes(q) ||
      (mod.submodules || []).some((sub) => {
        if (sub.name.toLowerCase().includes(q)) return true;
        if (sub.children && sub.children.some((c) => c.name.toLowerCase().includes(q))) return true;
        return false;
      })
    );
  });

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. SMALL FLOATING ARROW TAB (NO CAPTION) - VISIBLE WHEN CLOSED            */}
      {/* ========================================================================= */}
      {!isOpen && (
        <button
          onClick={onOpen}
          id="btn-floating-sidebar-arrow"
          title="Open navigation sidebar"
          aria-label="Open sidebar"
          style={{
            position: "fixed",
            left: 0,
            top: 86,
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1e293b",
            color: "#ffffff",
            border: "1px solid #334155",
            borderLeft: "none",
            borderRadius: "0 8px 8px 0",
            width: 26,
            height: 44,
            cursor: "pointer",
            boxShadow: "2px 2px 10px rgba(0, 0, 0, 0.35)",
            padding: 0,
            transition: "all 0.15s ease",
            userSelect: "none"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#c51f28";
            e.currentTarget.style.width = "30px";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1e293b";
            e.currentTarget.style.width = "26px";
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* ========================================================================= */}
      {/* 2. BACKDROP OVERLAY                                                       */}
      {/* ========================================================================= */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          top: 68,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(2px)",
          zIndex: 1400,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.22s ease"
        }}
      />

      {/* ========================================================================= */}
      {/* 3. MOVEABLE SLIDE-OUT SIDEBAR                                             */}
      {/* ========================================================================= */}
      <aside
        id="global-moveable-sidebar"
        style={{
          position: "fixed",
          top: 68,
          left: 0,
          bottom: 0,
          width: 250,
          background: "#1e293b",
          borderRight: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: isOpen ? "8px 0 32px rgba(0,0,0,0.45)" : "none",
          zIndex: 1500,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "#f8fafc"
        }}
      >
        {/* Top Header of Sidebar: Section Name + Small Arrow Button (NO CAPTION) */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#172033"
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: "#94a3b8",
              textTransform: "uppercase"
            }}
          >
            ERP Navigation
          </span>

          {/* Small Arrow Button with NO CAPTION to close sidebar */}
          <button
            onClick={onClose}
            id="btn-sidebar-collapse-arrow"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.08)",
              color: "#cbd5e1",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#c51f28";
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.borderColor = "#c51f28";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.color = "#cbd5e1";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Search input inside sidebar */}
        <div style={{ padding: "10px 12px 6px" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 28px",
                borderRadius: 7,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(15, 23, 42, 0.6)",
                color: "#f8fafc",
                fontSize: 11.5,
                outline: "none",
                boxSizing: "border-box"
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
                fontSize: 12
              }}
            >
              &#128269;
            </span>
          </div>
        </div>

        {/* Modules List (Hovering opens submodules FROM LEFT TO RIGHT) */}
        <nav
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "6px 0",
            scrollbarWidth: "thin"
          }}
        >
          {filteredModules.map((mod) => {
            const isHovered = hoveredModule?.id === mod.id;
            const IconComponent = ModuleIcons[mod.iconKey] || ModuleIcons.Engineering;
            const hasSubmodules = mod.submodules && mod.submodules.length > 0;

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
                    const firstTarget =
                      mod.submodules?.[0]?.targetPage ||
                      mod.submodules?.[0]?.children?.[0]?.targetPage;
                    if (firstTarget) {
                      onNavigate(firstTarget, mod.name);
                      onClose();
                    }
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 7,
                    background: isHovered
                      ? "linear-gradient(90deg, rgba(197,31,40,0.2) 0%, rgba(30,41,59,0.9) 100%)"
                      : "transparent",
                    color: isHovered ? "#ffffff" : "#cbd5e1",
                    border: "none",
                    borderLeft: isHovered ? "3px solid #c51f28" : "3px solid transparent",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: isHovered ? 700 : 500,
                    textAlign: "left",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ color: isHovered ? "#ef4444" : "#94a3b8", display: "flex" }}>
                      <IconComponent />
                    </span>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {mod.name}
                    </span>
                  </div>

                  {hasSubmodules && (
                    <span
                      style={{
                        color: isHovered ? "#ef4444" : "#64748b",
                        display: "flex",
                        transition: "transform 0.15s",
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
            padding: "10px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "#172033",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#f8fafc", margin: 0 }}>
              Silver Muller Seals
            </p>
            <p style={{ fontSize: 9, color: "#94a3b8", margin: 0 }}>Plant Operations v2.5</p>
          </div>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 6px #10b981"
            }}
            title="System Connected"
          />
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 4. SUBMODULES FLYOUT DRAWER (OPENS FROM LEFT TO RIGHT)                    */}
      {/* ========================================================================= */}
      {isOpen && hoveredModule && hoveredModule.submodules && (
        <div
          onMouseEnter={() => {
            cancelClose();
            setHoveredModule(hoveredModule);
          }}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "fixed",
            top: fitTop(drawerCoords.top - 6),
            left: drawerCoords.left + 4,
            width: 270,
            maxHeight: fitMaxHeight(fitTop(drawerCoords.top - 6)),
            overflowY: "auto",
            scrollbarWidth: "thin",
            background: "#1e293b",
            borderRadius: 12,
            padding: "12px",
            boxShadow: "0 14px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12)",
            zIndex: 2200,
            borderLeft: "3px solid #c51f28",
            animation: "slideLeftToRight 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {/* Header */}
          <div style={{ paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: "#f87171",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: 0
              }}
            >
              {hoveredModule.name}
            </p>
            <p style={{ fontSize: 10.5, color: "#94a3b8", margin: "2px 0 0" }}>
              Select department action:
            </p>
          </div>

          {/* Submodules list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {hoveredModule.submodules.map((sub, sIdx) => {
              // If submodule has children (e.g. Item Master -> FG, Other)
              if (sub.children && sub.children.length > 0) {
                // Groups list their screens inline, so every screen under this module is visible at once.
                return (
                  <div key={sIdx} style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: sIdx > 0 ? 8 : 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 10px" }}>
                      {sub.name}
                    </div>
                    {sub.children.map((child, cIdx) => {
                      const isActive =
                        (child.targetPage === "item-master" && currentView === "item-master") ||
                        (child.targetPage === "item-master-other" && currentView === "item-master-other");
                      return (
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
                            background: isActive ? "rgba(197,31,40,0.3)" : "rgba(255,255,255,0.03)",
                            border: isActive ? "1px solid rgba(197,31,40,0.6)" : "1px solid transparent",
                            color: isActive ? "#ffffff" : child.ready ? "#cbd5e1" : "#64748b",
                            fontSize: 11.5,
                            fontWeight: isActive ? 700 : 500,
                            cursor: child.ready ? "pointer" : "default",
                            textAlign: "left",
                            transition: "all 0.12s ease"
                          }}
                        >
                          <span>{child.name}</span>
                          {child.ready && (
                            <span style={{ fontSize: 8.5, background: "rgba(16,185,129,0.18)", color: "#34d399", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
                              READY
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              }
              const isItemMasterActive =
                sub.targetPage === "item-master" && currentView === "item-master";
              const isOtherItemMasterActive =
                sub.targetPage === "item-master-other" && currentView === "item-master-other";
              const isSupplierMasterActive =
                sub.targetPage === "supplier-master" && currentView === "supplier-master";
              const isCustomerMasterActive =
                sub.targetPage === "customer-master" && currentView === "customer-master";
              const isDeptMasterActive =
                sub.targetPage === "department-master" && currentView === "department-master";
              const isMachineMasterActive =
                sub.targetPage === "machine-master" && currentView === "machine-master";
              const isPrActive =
                sub.targetPage === "purchase-requisition" && currentView === "purchase-requisition";
              const isQuotationActive =
                (sub.targetPage === "vendor-quotations" || (sub.name && sub.name.toLowerCase().includes("quotation"))) &&
                (currentView === "vendor-quotations" || (currentView === "operations" && (erpSlot === "vendor-quotations" || erpSlot === "quotations")));
              const isErpActive =
                currentView === "operations" && sub.targetPage && erpSlot === sub.targetPage;
              const isSelected =
                isItemMasterActive ||
                isOtherItemMasterActive ||
                isSupplierMasterActive ||
                isCustomerMasterActive ||
                isDeptMasterActive ||
                isMachineMasterActive ||
                isPrActive ||
                isQuotationActive ||
                isErpActive;

              return (
                <button
                  key={sIdx}
                  onClick={() => handleSubmoduleClick(sub, hoveredModule.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    borderRadius: 6,
                    background: isSelected ? "rgba(197,31,40,0.25)" : "rgba(255,255,255,0.02)",
                    border: isSelected ? "1px solid rgba(197,31,40,0.5)" : "1px solid transparent",
                    color: isSelected ? "#ffffff" : sub.ready ? "#cbd5e1" : "#64748b",
                    fontSize: 11.5,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.12s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!sub.ready) return;
                    e.currentTarget.style.background = "rgba(197,31,40,0.2)";
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "translateX(3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected
                      ? "rgba(197,31,40,0.25)"
                      : "rgba(255,255,255,0.02)";
                    e.currentTarget.style.color = isSelected ? "#ffffff" : sub.ready ? "#cbd5e1" : "#64748b";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <span>{sub.name}</span>
                  {isSelected ? (
                    <span
                      style={{
                        fontSize: 9,
                        background: "#c51f28",
                        color: "#ffffff",
                        padding: "1px 5px",
                        borderRadius: 3,
                        fontWeight: 800
                      }}
                    >
                      ACTIVE
                    </span>
                  ) : sub.ready ? (
                    <span
                      style={{
                        fontSize: 8.5,
                        background: "rgba(16,185,129,0.18)",
                        color: "#34d399",
                        padding: "1px 4px",
                        borderRadius: 3,
                        fontWeight: 700
                      }}
                    >
                      READY
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyframe for Left to Right animation */}
      <style>{`
        @keyframes slideLeftToRight {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
