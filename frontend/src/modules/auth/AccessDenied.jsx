import { ShieldOff, Home } from "lucide-react";

/** Shown in place of a screen the signed-in user has not been given access to. */
export function AccessDenied({ onBackToHome }) {
  return (
    <div style={{ minHeight: "calc(100vh - 68px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f6fb", padding: 20, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "32px 28px", boxShadow: "0 10px 30px rgba(15,23,42,0.06)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", color: "#c51f28", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <ShieldOff size={26} />
        </div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#0f172a" }}>You don't have access to this screen</h2>
        <p style={{ margin: "10px 0 20px", fontSize: 13.5, color: "#64748b", lineHeight: 1.5 }}>
          Ask your administrator to grant it on Settings &rarr; Access Control.
        </p>
        <button
          onClick={onBackToHome}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: "#c51f28", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
        >
          <Home size={15} /> Back to Home
        </button>
      </div>
    </div>
  );
}
