import { useState } from "react";
import { GlobalTopHeader } from "./shared/layout/GlobalTopHeader";
import { GlobalMoveableSidebar } from "./shared/layout/GlobalMoveableSidebar";
import { SilverBrainLandingPage } from "./modules/home/pages/SilverBrainLandingPage";
import { ERPDashboard } from "./modules/erp/pages/ERPDashboard";
import { ItemMasterFormPage } from "./modules/engineering/pages/ItemMasterFormPage";

export default function App() {
  const [currentView, setCurrentView] = useState("home"); // "home" | "item-master" | "operations"
  const [erpSlot, setErpSlot] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleEnterCurrentProject = () => {
    setCurrentView("operations");
    setErpSlot("dashboard");
  };

  const handleNavigateToPage = (targetPage) => {
    if (targetPage === "home") {
      setCurrentView("home");
    } else if (targetPage === "item-master") {
      setCurrentView("item-master");
      setSidebarOpen(false);
    } else if (targetPage) {
      setCurrentView("operations");
      setErpSlot(targetPage);
      setSidebarOpen(false);
    } else {
      setCurrentView("operations");
      setErpSlot("dashboard");
      setSidebarOpen(false);
    }
  };

  const handleBackToHome = () => {
    setCurrentView("home");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a"
      }}
    >
      {/* 1. Global Static Header (pinned across all screens) */}
      <GlobalTopHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        currentView={currentView}
        erpSlot={erpSlot}
        onNavigateHome={handleBackToHome}
        onNavigateNotifications={() => {
          setCurrentView("operations");
          setErpSlot("notifications");
        }}
      />

      {/* 2. Global Moveable Sidebar (active on Item Master & Operations) */}
      {currentView !== "home" && (
        <GlobalMoveableSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpen={() => setSidebarOpen(true)}
          currentView={currentView}
          erpSlot={erpSlot}
          onNavigate={handleNavigateToPage}
        />
      )}

      {/* 3. Main Screen View Area */}
      <div style={{ flex: 1, position: "relative" }}>
        {currentView === "item-master" && (
          <ItemMasterFormPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        )}

        {currentView === "operations" && (
          <ERPDashboard
            onBackToHome={handleBackToHome}
            activePage={erpSlot}
            onPageChange={(p) => setErpSlot(p)}
          />
        )}

        {currentView === "home" && (
          <SilverBrainLandingPage
            onEnterCurrentProject={handleEnterCurrentProject}
            onNavigateToPage={handleNavigateToPage}
            hideHeader={true}
            hideSidebar={false}
          />
        )}
      </div>
    </div>
  );
}
