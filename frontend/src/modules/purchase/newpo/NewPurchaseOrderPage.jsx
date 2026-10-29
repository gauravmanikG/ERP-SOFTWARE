// "New Purchase Order" submodule shell. Routes between its screens and shows toasts. Screens call the backend
// through ./api.js. The sourcing screens (Clubbed Demand, Draft POs, Convert to PO, PR Tracking) draw their own
// toolbar in the Item Master style; the older screens keep the dark module bar.
// To retire this flow, delete this folder, its nav entries in shared/layout/modulesData.jsx and its branch in App.jsx.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadUser } from "./api";
import VendorRateMasterScreen from "./VendorRateMasterScreen";
import PoRegisterScreen from "./PoRegisterScreen";
import ReportsScreen from "./ReportsScreen";
import DirectPoScreen from "./DirectPoScreen";
import ClubbedDemandScreen from "./ClubbedDemandScreen";
import DraftPoScreen from "./DraftPoScreen";
import ConvertDraftScreen from "./ConvertDraftScreen";
import TrackingReportScreen from "./TrackingReportScreen";
import { Toast } from "./frame";

const SCREEN_TITLES = {
  "vendor-rates": "Vendor Rate Master",
  "clubbed-demand": "Clubbed Demand",
  "draft-pos": "Draft Purchase Orders",
  "tracking": "PR Tracking",
  "po-register": "PO Register",
  "report-po-vs-pr": "PR vs PO Report",
  "report-po-vs-pr-grn": "PR vs PO vs GRN Report",
  "reconciliation": "Legacy Reconciliation",
  "direct-po": "Direct PO"
};

// Screens that draw their own toolbar and use the whole area.
const FULL_SCREENS = new Set(["clubbed-demand", "draft-pos", "tracking"]);

export function NewPurchaseOrderPage({ screen = "vendor-rates", onBackToHome, onOpenSidebar, sidebarOpen, onNavigate }) {
  const [user] = useState(loadUser);
  const [toast, setToast] = useState(null);
  const [convertDraft, setConvertDraft] = useState(null);   // draft number being converted to a PO
  const timer = useRef(null);

  const flash = useCallback((message, isError = false) => {
    setToast({ message, isError });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), isError ? 6000 : 4200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  // Choosing anything in the menu leaves the conversion screen.
  useEffect(() => { setConvertDraft(null); }, [screen]);

  // The old "PO by PR" menu entry now opens Clubbed Demand, where the PO flow starts.
  const current = screen === "po-by-pr" ? "clubbed-demand" : screen;
  const converting = convertDraft && current === "draft-pos";

  if (FULL_SCREENS.has(current) || converting) {
    return (
      <div style={{ height: "100%", maxHeight: "100%", position: "relative", minHeight: 0, overflow: "hidden" }}>
        <Toast toast={toast} />
        {converting ? (
          <ConvertDraftScreen
            key={convertDraft}
            draftNumber={convertDraft}
            user={user}
            flash={flash}
            onBack={() => setConvertDraft(null)}
            onNavigate={onNavigate}
          />
        ) : (
          <>
            {current === "clubbed-demand" && <ClubbedDemandScreen user={user} flash={flash} onNavigate={onNavigate} />}
            {current === "draft-pos" && <DraftPoScreen user={user} flash={flash} onConvert={setConvertDraft} onNavigate={onNavigate} />}
            {current === "tracking" && <TrackingReportScreen user={user} flash={flash} />}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#f1f5f9", borderRadius: 0, border: "none" }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: toast.isError ? "#dc2626" : "#10b981", color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", maxWidth: 460 }}>{toast.message}</div>}

      <div style={{ flexShrink: 0, background: "#1e293b", borderBottom: "1px solid #334155", padding: "8px 18px 8px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "#2563eb", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11 }}>NPO</div>
          <span style={{ fontSize: 14, fontWeight: 800 }}>New Purchase Order</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>/ {SCREEN_TITLES[current] || SCREEN_TITLES["vendor-rates"]}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
          <span style={{ color: "#94a3b8" }}>Acting as {user.name}</span>
          <button onClick={onOpenSidebar} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>{sidebarOpen ? "Hide menu" : "Menu"}</button>
          <span onClick={onBackToHome} style={{ cursor: "pointer", color: "#60a5fa", textDecoration: "underline" }}>Home</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
        {current === "vendor-rates" && <VendorRateMasterScreen user={user} flash={flash} />}
        {current === "po-register" && <PoRegisterScreen user={user} flash={flash} />}
        {current === "report-po-vs-pr" && <ReportsScreen initialTab="pr-vs-po" />}
        {current === "report-po-vs-pr-grn" && <ReportsScreen initialTab="pr-vs-po-grn" />}
        {current === "reconciliation" && <ReportsScreen initialTab="legacy" />}
        {current === "direct-po" && <DirectPoScreen user={user} flash={flash} onCreated={() => onNavigate && onNavigate("grn")} />}
        {!SCREEN_TITLES[current] && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 24, color: "#64748b", fontSize: 13 }}>
            This screen is not available yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default NewPurchaseOrderPage;
