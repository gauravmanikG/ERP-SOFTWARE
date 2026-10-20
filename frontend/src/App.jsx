import { useState } from "react";
import { GlobalTopHeader } from "./shared/layout/GlobalTopHeader";
import { GlobalMoveableSidebar } from "./shared/layout/GlobalMoveableSidebar";
import { SilverBrainLandingPage } from "./modules/home/pages/SilverBrainLandingPage";
import { ItemMasterFormPage } from "./modules/engineering/pages/ItemMasterFormPage";
import { OtherItemMasterPage } from "./modules/engineering/pages/OtherItemMasterPage";
import { SupplierMasterPage } from "./modules/purchase/pages/SupplierMasterPage";
import { CustomerMasterPage } from "./modules/crm/pages/CustomerMasterPage";
import { DepartmentMasterPage } from "./modules/settings/pages/DepartmentMasterPage";
import { MachineMasterPage } from "./modules/maintenance/pages/MachineMasterPage";
import { PurchaseRequisitionPage } from "./modules/purchase/pages/PurchaseRequisitionPage";
import { PurchaseOrderPage } from "./modules/purchase/pages/PurchaseOrderPage";
import { ServicePurchaseOrderPage } from "./modules/purchase/pages/ServicePurchaseOrderPage";
import { CapitalPurchaseOrderPage } from "./modules/purchase/pages/CapitalPurchaseOrderPage";
import { JobWorkPage } from "./modules/purchase/pages/JobWorkPage";
import { NewPurchaseOrderPage } from "./modules/purchase/newpo/NewPurchaseOrderPage";
import { VendorQuotationsPage } from "./modules/purchase/pages/VendorQuotationsPage";
import { GoodsReceiptNotePage } from "./modules/purchase/pages/GoodsReceiptNotePage";
import { RequestForQuotationPage } from "./modules/purchase/pages/RequestForQuotationPage";

export default function App() {
  const [currentView, setCurrentView] = useState("home"); // "home" | "item-master" | "item-master-other" | "supplier-master" | "customer-master" | "department-master" | "machine-master" | "purchase-requisition" | "purchase-orders" | "purchase-processing" | "po-approval" | "vendor-quotations" | "rfq" | "grn" | "operations"
  const [erpSlot, setErpSlot] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobWorkScreen, setJobWorkScreen] = useState("dashboard");
  const [newPoScreen, setNewPoScreen] = useState("vendor-rates");

  const handleNavigateToPage = (targetPage) => {
    let page = targetPage;
    if (page === "purchase-order") page = "purchase-orders";
    if (page === "quotations" || page === "quotation") page = "vendor-quotations";

    if (page === "home") {
      setCurrentView("home");
    } else if (page === "item-master") {
      setCurrentView("item-master");
      setSidebarOpen(false);
    } else if (page === "item-master-other") {
      setCurrentView("item-master-other");
      setSidebarOpen(false);
    } else if (page === "supplier-master") {
      setCurrentView("supplier-master");
      setSidebarOpen(false);
    } else if (page === "customer-master" || page === "customer" || page === "customers") {
      setCurrentView("customer-master");
      setSidebarOpen(false);
    } else if (page === "department-master") {
      setCurrentView("department-master");
      setSidebarOpen(false);
    } else if (page === "machine-master") {
      setCurrentView("machine-master");
      setSidebarOpen(false);
    } else if (page === "purchase-requisition") {
      setCurrentView("purchase-requisition");
      setSidebarOpen(false);
    } else if (
      page === "vendor-quotations" ||
      page === "quotations" ||
      page === "quotation"
    ) {
      setCurrentView("vendor-quotations");
      setSidebarOpen(false);
    } else if (
      page === "purchase-orders" ||
      page === "purchase-processing" ||
      page === "po-approval"
    ) {
      setCurrentView(page);
    } else if (page && page.startsWith("new-po-")) {
      setNewPoScreen(page.replace("new-po-", ""));
      setCurrentView("new-po");
      setSidebarOpen(false);
    } else if (page && page.startsWith("job-work-")) {
      setJobWorkScreen(page.replace("job-work-", ""));
      setCurrentView("job-work");
      setSidebarOpen(false);
    } else if (page === "capital-po") {
      setCurrentView("capital-po");
      setSidebarOpen(false);
    } else if (page === "service-po") {
      setCurrentView("service-po");
      setSidebarOpen(false);
    } else if (page === "rfq") {
      setCurrentView("rfq");
      setSidebarOpen(false);
    } else if (page === "grn") {
      setCurrentView("grn");
      setSidebarOpen(false);
    } else if (page) {
      setCurrentView("home");
      setErpSlot(page);
      setSidebarOpen(false);
    } else {
      setCurrentView("home");
      setErpSlot(page);
      setSidebarOpen(false);
    }
  };

  const handleBackToHome = () => {
    setCurrentView("home");
  };

  const isFullscreenMaster =
    currentView === "item-master" ||
    currentView === "item-master-other" ||
    currentView === "supplier-master" ||
    currentView === "customer-master" ||
    currentView === "department-master" ||
    currentView === "machine-master" ||
    currentView === "purchase-requisition" ||
    currentView === "purchase-orders" ||
    currentView === "purchase-processing" ||
    currentView === "po-approval" ||
    currentView === "vendor-quotations" ||
    currentView === "rfq" ||
    currentView === "grn" ||
    currentView === "service-po" ||
    currentView === "capital-po" ||
    currentView === "job-work" ||
    currentView === "new-po";

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
          setCurrentView("home");
          setErpSlot("notifications");
        }}
      />

      {/* 2. Global Moveable Sidebar (active on Item Master, Supplier Master, Customer Master, Dept Master & Operations) */}
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
            onNavigate={handleNavigateToPage}
          />
        )}

        {currentView === "item-master-other" && (
          <OtherItemMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
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

        {currentView === "department-master" && (
          <DepartmentMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            setPage={handleNavigateToPage}
          />
        )}

        {currentView === "machine-master" && (
          <MachineMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            setPage={handleNavigateToPage}
          />
        )}

        {currentView === "purchase-requisition" && (
          <PurchaseRequisitionPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {(currentView === "purchase-orders" ||
          currentView === "purchase-processing" ||
          currentView === "po-approval") && (
          <PurchaseOrderPage
            initialTab={
              currentView === "po-approval"
                ? "approval"
                : currentView === "purchase-orders"
                ? "orders"
                : "processing"
            }
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {currentView === "job-work" && (
          <JobWorkPage
            screen={jobWorkScreen}
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        )}
        {currentView === "new-po" && (
          <NewPurchaseOrderPage
            screen={newPoScreen}
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        )}

        {currentView === "capital-po" && (
          <CapitalPurchaseOrderPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {currentView === "service-po" && (
          <ServicePurchaseOrderPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {currentView === "vendor-quotations" && (
          <VendorQuotationsPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {currentView === "rfq" && (
          <RequestForQuotationPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {currentView === "grn" && (
          <GoodsReceiptNotePage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {currentView === "home" && (
          <SilverBrainLandingPage
            onNavigateToPage={handleNavigateToPage}
            hideHeader={true}
            hideSidebar={false}
          />
        )}
      </div>
    </div>
  );
}
