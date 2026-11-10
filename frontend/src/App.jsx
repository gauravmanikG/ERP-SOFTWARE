import { useState } from "react";
import { lazyPage } from "./shared/utils/lazyPage";
import { ScreenBoundary } from "./shared/components/ScreenBoundary";
import { GlobalTopHeader } from "./shared/layout/GlobalTopHeader";
import { GlobalMoveableSidebar } from "./shared/layout/GlobalMoveableSidebar";
import { SilverBrainLandingPage } from "./modules/home/pages/SilverBrainLandingPage";
import { useCurrentUser } from "./modules/auth/AuthGate";
import { canOpenPage } from "./modules/auth/access";
import { AccessDenied } from "./modules/auth/AccessDenied";

// Every screen except Home loads on first open (see shared/utils/lazyPage.js).
const ItemMasterFormPage = lazyPage(() => import("./modules/engineering/pages/ItemMasterFormPage"), "ItemMasterFormPage");
const OtherItemMasterPage = lazyPage(() => import("./modules/engineering/pages/OtherItemMasterPage"), "OtherItemMasterPage");
const SupplierMasterPage = lazyPage(() => import("./modules/purchase/pages/SupplierMasterPage"), "SupplierMasterPage");
const CustomerMasterPage = lazyPage(() => import("./modules/crm/pages/CustomerMasterPage"), "CustomerMasterPage");
const DepartmentMasterPage = lazyPage(() => import("./modules/settings/pages/DepartmentMasterPage"), "DepartmentMasterPage");
const UsersPage = lazyPage(() => import("./modules/settings/pages/UsersPage"), "UsersPage");
const RbacPage = lazyPage(() => import("./modules/settings/pages/RbacPage"), "RbacPage");
const MachineMasterPage = lazyPage(() => import("./modules/maintenance/pages/MachineMasterPage"), "MachineMasterPage");
const PurchaseRequisitionPage = lazyPage(() => import("./modules/purchase/pages/PurchaseRequisitionPage"), "PurchaseRequisitionPage");
const ServicePurchaseOrderPage = lazyPage(() => import("./modules/purchase/pages/ServicePurchaseOrderPage"), "ServicePurchaseOrderPage");
const CapitalPurchaseOrderPage = lazyPage(() => import("./modules/purchase/pages/CapitalPurchaseOrderPage"), "CapitalPurchaseOrderPage");
const JobWorkPage = lazyPage(() => import("./modules/purchase/pages/JobWorkPage"), "JobWorkPage");
const NewPurchaseOrderPage = lazyPage(() => import("./modules/purchase/newpo/NewPurchaseOrderPage"), "NewPurchaseOrderPage");
const MastersPage = lazyPage(() => import("./modules/masters/MastersPage"), "MastersPage");
const VendorQuotationsPage = lazyPage(() => import("./modules/purchase/pages/VendorQuotationsPage"), "VendorQuotationsPage");
const GoodsReceiptNotePage = lazyPage(() => import("./modules/purchase/pages/GoodsReceiptNotePage"), "GoodsReceiptNotePage");
const RequestForQuotationPage = lazyPage(() => import("./modules/purchase/pages/RequestForQuotationPage"), "RequestForQuotationPage");
const DocumentationPage = lazyPage(() => import("./modules/documentation/DocumentationPage"), "DocumentationPage");

export default function App() {
  const [currentView, setCurrentView] = useState("home"); // "home" | "item-master" | "item-master-other" | "supplier-master" | "customer-master" | "department-master" | "machine-master" | "purchase-requisition" | "purchase-orders" | "purchase-processing" | "po-approval" | "vendor-quotations" | "rfq" | "grn" | "operations"
  const [erpSlot, setErpSlot] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobWorkScreen, setJobWorkScreen] = useState("dashboard");
  const [newPoScreen, setNewPoScreen] = useState("vendor-rates");
  const [mastersScreen, setMastersScreen] = useState("mode-of-payment");
  const [docsScreen, setDocsScreen] = useState("overview");
  const [rbacUser, setRbacUser] = useState(null); // user selected on the Users screen for Access Control

  const handleNavigateToPage = (targetPage) => {
    let page = targetPage;
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
    } else if (page === "users") {
      setCurrentView("users");
      setSidebarOpen(false);
    } else if (page === "rbac") {
      setCurrentView("rbac");
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
    } else if (page && page.startsWith("masters-")) {
      setMastersScreen(page.replace("masters-", ""));
      setCurrentView("masters");
      setSidebarOpen(false);
    } else if (page && page.startsWith("docs-")) {
      setDocsScreen(page.replace("docs-", ""));
      setCurrentView("documentation");
      setSidebarOpen(false);
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

  // Screen-level access: whatever route led here, a screen this user may not open is never mounted.
  const me = useCurrentUser();
  const pageKey =
    currentView === "masters" ? `masters-${mastersScreen}`
      : currentView === "new-po" ? `new-po-${newPoScreen}`
        : currentView === "job-work" ? `job-work-${jobWorkScreen}`
          : currentView === "documentation" ? `docs-${docsScreen}`
            : currentView;
  const view = canOpenPage(me, pageKey) ? currentView : "denied";

  const isFullscreenMaster =
    currentView === "item-master" ||
    currentView === "item-master-other" ||
    currentView === "supplier-master" ||
    currentView === "customer-master" ||
    currentView === "department-master" ||
    currentView === "users" ||
    currentView === "rbac" ||
    currentView === "machine-master" ||
    currentView === "purchase-requisition" ||
    currentView === "vendor-quotations" ||
    currentView === "rfq" ||
    currentView === "grn" ||
    currentView === "service-po" ||
    currentView === "capital-po" ||
    currentView === "job-work" ||
    currentView === "new-po" ||
    currentView === "masters" ||
    currentView === "documentation";

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
        <ScreenBoundary resetKey={`${view}:${pageKey}`} onHome={handleBackToHome}>
        {view === "item-master" && (
          <ItemMasterFormPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {view === "item-master-other" && (
          <OtherItemMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {view === "supplier-master" && (
          <SupplierMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            setPage={handleNavigateToPage}
          />
        )}

        {view === "customer-master" && (
          <CustomerMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            setPage={handleNavigateToPage}
          />
        )}

        {view === "department-master" && (
          <DepartmentMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            setPage={handleNavigateToPage}
          />
        )}

        {view === "users" && (
          <UsersPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onOpenAccess={(u) => {
              setRbacUser({ id: u.id, name: u.name });
              setCurrentView("rbac");
              setSidebarOpen(false);
            }}
          />
        )}

        {view === "rbac" && rbacUser && (
          <RbacPage
            user={rbacUser}
            onBack={() => setCurrentView("users")}
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
          />
        )}

        {view === "rbac" && !rbacUser && (
          <UsersPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onOpenAccess={(u) => {
              setRbacUser({ id: u.id, name: u.name });
              setCurrentView("rbac");
              setSidebarOpen(false);
            }}
          />
        )}

        {view === "machine-master" && (
          <MachineMasterPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            setPage={handleNavigateToPage}
          />
        )}

        {view === "purchase-requisition" && (
          <PurchaseRequisitionPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {view === "job-work" && (
          <JobWorkPage
            screen={jobWorkScreen}
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        )}
        {view === "new-po" && (
          <NewPurchaseOrderPage
            screen={newPoScreen}
            onNavigate={handleNavigateToPage}
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        )}

        {view === "masters" && (
          <MastersPage
            screen={mastersScreen}
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        )}

        {view === "capital-po" && (
          <CapitalPurchaseOrderPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {view === "service-po" && (
          <ServicePurchaseOrderPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {view === "vendor-quotations" && (
          <VendorQuotationsPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {view === "rfq" && (
          <RequestForQuotationPage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {view === "grn" && (
          <GoodsReceiptNotePage
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigateToPage}
          />
        )}

        {view === "documentation" && (
          <DocumentationPage
            screen={docsScreen}
            onNavigate={handleNavigateToPage}
            onBackToHome={handleBackToHome}
            onOpenSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        )}

        {view === "denied" && <AccessDenied onBackToHome={handleBackToHome} />}

        {view === "home" && (
          <SilverBrainLandingPage
            onNavigateToPage={handleNavigateToPage}
            hideHeader={true}
            hideSidebar={false}
          />
        )}
        </ScreenBoundary>
      </div>
    </div>
  );
}
