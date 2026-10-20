// "New Purchase Order" submodule shell. Only routes between its screens and shows the acting user and
// toasts. Screens call the backend through ./api.js. To retire this flow, delete this folder, its nav
// entries in shared/layout/modulesData.jsx and modules/home/pages/SilverBrainLandingPage.jsx, and its branch in App.jsx.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadUser } from "./api";
import VendorRateMasterScreen from "./VendorRateMasterScreen";
import PoByPrScreen from "./PoByPrScreen";
import PoRegisterScreen from "./PoRegisterScreen";
import ReportsScreen from "./ReportsScreen";
import DirectPoScreen from "./DirectPoScreen";

const SCREEN_TITLES = {
  "vendor-rates": "Vendor Rate Master",
  "po-by-pr": "PO by PR",
  "po-register": "PO Register",
  "report-po-vs-pr": "PO vs PR Report",
  "report-po-vs-pr-grn": "PO vs PR vs GRN Report",
  "reconciliation": "Legacy Reconciliation",
  "direct-po": "Direct PO"
};

export function NewPurchaseOrderPage({ screen = "vendor-rates", onBackToHome, onOpenSidebar, sidebarOpen }) {
  const [user] = useState(loadUser);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const flash = useCallback((message, isError = false) => {
    setToast({ message, isError });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div style={{ height: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#f1f5f9", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: toast.isError ? "#dc2626" : "#10b981", color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", maxWidth: 460 }}>{toast.message}</div>}

      <div style={{ flexShrink: 0, background: "#1e293b", borderBottom: "1px solid #334155", padding: "8px 18px 8px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "#2563eb", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11 }}>NPO</div>
          <span style={{ fontSize: 14, fontWeight: 800 }}>New Purchase Order</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>/ {SCREEN_TITLES[screen] || SCREEN_TITLES["vendor-rates"]}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
          <span style={{ color: "#94a3b8" }}>Acting as {user.name}</span>
          <button onClick={onOpenSidebar} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>{sidebarOpen ? "Hide menu" : "Menu"}</button>
          <span onClick={onBackToHome} style={{ cursor: "pointer", color: "#60a5fa", textDecoration: "underline" }}>Home</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
        {screen === "vendor-rates" && <VendorRateMasterScreen user={user} flash={flash} />}
        {screen === "po-by-pr" && <PoByPrScreen user={user} flash={flash} />}
        {screen === "po-register" && <PoRegisterScreen user={user} flash={flash} />}
        {screen === "report-po-vs-pr" && <ReportsScreen initialTab="po-vs-pr" />}
        {screen === "report-po-vs-pr-grn" && <ReportsScreen initialTab="po-vs-pr-grn" />}
        {screen === "reconciliation" && <ReportsScreen initialTab="legacy" />}
        {screen === "direct-po" && <DirectPoScreen user={user} flash={flash} />}
        {!SCREEN_TITLES[screen] && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 24, color: "#64748b", fontSize: 13 }}>
            This screen is not available yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default NewPurchaseOrderPage;
