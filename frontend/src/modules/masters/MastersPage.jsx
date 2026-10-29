import React, { useCallback, useEffect, useRef, useState } from "react";
import CodeNameMasterScreen from "./CodeNameMasterScreen";
import HsnMasterScreen from "./HsnMasterScreen";

// Engineering > Masters. Each screen maps to one menu target in shared/layout/modulesData.jsx.
const SCREENS = {
  "mode-of-payment": { title: "Mode of Payment", masterKey: "mode-of-payment" },
  "credit-period-basis": { title: "Credit Period Calculation From", masterKey: "credit-period-basis" },
  "payment-terms": { title: "Payment Terms", masterKey: "payment-terms" },
  "freight-options": { title: "Freight Options", masterKey: "freight-options" },
  "hsn-code": { title: "HSN Code", hsn: true }
};

export function MastersPage({ screen = "mode-of-payment", onBackToHome, onOpenSidebar, sidebarOpen }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const flash = useCallback((message, isError = false) => {
    setToast({ message, isError });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const current = SCREENS[screen] || SCREENS["mode-of-payment"];

  return (
    <div style={{ height: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#f1f5f9", borderRadius: 0, border: "none" }}>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: toast.isError ? "#dc2626" : "#10b981", color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", maxWidth: 460 }}>
          {toast.message}
        </div>
      )}

      <div style={{ flexShrink: 0, background: "#1e293b", borderBottom: "1px solid #334155", padding: "8px 18px 8px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "#2563eb", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11 }}>MST</div>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Masters</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>/ {current.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
          <button onClick={onOpenSidebar} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>{sidebarOpen ? "Hide menu" : "Menu"}</button>
          <span onClick={onBackToHome} style={{ cursor: "pointer", color: "#60a5fa", textDecoration: "underline" }}>Home</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>{current.title}</div>
        {current.hsn
          ? <HsnMasterScreen flash={flash} />
          : <CodeNameMasterScreen key={current.masterKey} masterKey={current.masterKey} title={current.title} flash={flash} />}
      </div>
    </div>
  );
}

export default MastersPage;
