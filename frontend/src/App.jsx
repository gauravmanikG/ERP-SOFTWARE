import { useState } from "react";
import { GlobalTopHeader } from "./shared/layout/GlobalTopHeader";
import { GlobalMoveableSidebar } from "./shared/layout/GlobalMoveableSidebar";
import { SilverBrainLandingPage } from "./modules/home/pages/SilverBrainLandingPage";
import { ERPDashboard } from "./modules/erp/pages/ERPDashboard";
import { ItemMasterFormPage } from "./modules/engineering/pages/ItemMasterFormPage";
import { SupplierMasterPage } from "./modules/purchase/pages/SupplierMasterPage";
import { CustomerMasterPage } from "./modules/crm/pages/CustomerMasterPage";

export default function App() {
  const [currentView, setCurrentView] = useState("home"); // "home" | "item-master" | "supplier-master" | "operations"
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
    } else if (targetPage === "supplier-master") {
      setCurrentView("supplier-master");
      setSidebarOpen(false);
    } else if (targetPage === "customer-master") {
      setCurrentView("customer-master");
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

  const isFullscreenMaster = currentView === "item-master" || currentView === "supplier-master" || currentView === "customer-master";

  return (
    <div
      style={{
        height: isFullscreenMaster ? "100vh" : "auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        overflow: isFullscreenMaster ? "hidden" : "visible"
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

      {/* 2. Global Moveable Sidebar (active on Item Master, Supplier Master & Operations) */}
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
      <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: isFullscreenMaster ? "hidden" : "visible" }}>
        {currentView === "item-master" && (
          <ItemMasterFormPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        )}

        {currentView === "supplier-master" && (
          <SupplierMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            setPage={handleNavigateToPage}
          />
        )}

        {currentView === "customer-master" && (
          <CustomerMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            setPage={handleNavigateToPage}
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
