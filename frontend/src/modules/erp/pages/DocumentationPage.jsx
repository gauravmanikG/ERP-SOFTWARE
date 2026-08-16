import React, { useState } from "react";
import { BookOpen, FileText, CheckCircle2, AlertTriangle, HelpCircle, Layers, Building2, Package, Search, ExternalLink } from "lucide-react";

export function DocumentationPage({ dark = false, setPage }) {
  const [activeSection, setActiveSection] = useState("getting-started");

  const bgCard = dark ? "#1e293b" : "#ffffff";
  const bdrCard = dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)";
  const txtPrimary = dark ? "#f1f5f9" : "#0f172a";
  const txtMuted = dark ? "#94a3b8" : "#64748b";

  const sections = [
    { id: "getting-started", title: "🚀 Getting Started", icon: <BookOpen size={16} /> },
    { id: "company-master", title: "🏢 Company Master (Screen 1 & 2)", icon: <Building2 size={16} /> },
    { id: "inventory-mgmt", title: "📦 Inventory Management", icon: <Package size={16} /> },
    { id: "validation-rules", title: "⚖️ Validation Rules & Constraints", icon: <CheckCircle2 size={16} /> },
    { id: "excel-schemas", title: "📊 Excel Import Specifications", icon: <FileText size={16} /> },
    { id: "faq", title: "❓ Frequently Asked Questions", icon: <HelpCircle size={16} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1040, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header Banner */}
      <div style={{
        borderRadius: 20,
        padding: "26px 32px",
        background: dark ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        color: "#fff",
        boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 30px rgba(14,165,233,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26
          }}>
            📖
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: "-0.3px" }}>System Documentation & User Manual</h1>
            <p style={{ fontSize: 13, opacity: 0.85, margin: "4px 0 0" }}>
              Comprehensive guide to operating the Silver Muller Seals ERP System.
            </p>
          </div>
        </div>

        {setPage && (
          <button
            onClick={() => setPage("ai-chatbot")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            🤖 Ask AI Chatbot
          </button>
        )}
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        {/* Navigation Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sections.map(s => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${active ? (dark ? "#0ea5e9" : "#0284c7") : bdrCard}`,
                  background: active ? (dark ? "rgba(14,165,233,0.18)" : "#f0f9ff") : bgCard,
                  color: active ? (dark ? "#38bdf8" : "#0284c7") : txtMuted,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s"
                }}
              >
                {s.title}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ background: bgCard, border: `1px solid ${bdrCard}`, borderRadius: 20, padding: 28 }}>
          {activeSection === "getting-started" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>🚀 Getting Started</h2>
              <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.6 }}>
                Welcome to the <strong>Silver Muller Seals Manufacturing ERP System</strong>. This software coordinates Plant 01 operations, company master records, material movements, and real-time inventory tracking.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
                <div style={{ padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>🏢 Company Master</h3>
                  <p style={{ fontSize: 12, color: txtMuted, margin: 0, lineHeight: 1.5 }}>
                    Manage company profiles, legal identity (GSTIN, PAN, CIN, IEC), addresses, and Excel batch uploads.
                  </p>
                </div>
                <div style={{ padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>📦 Inventory Management</h3>
                  <p style={{ fontSize: 12, color: txtMuted, margin: 0, lineHeight: 1.5 }}>
                    Process Issue slips (`ISSUE`), Inward receipts (`RECEIPT`), Reversals (`REVERSE`), multi-item transactions, and balance history.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "company-master" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>🏢 Company Master Module</h2>

              <div style={{ padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>Screen 1 — Entry Form & Excel Import</h3>
                <ul style={{ fontSize: 13, color: txtMuted, paddingLeft: 20, margin: 0, lineHeight: 1.7 }}>
                  <li><strong>Company Code</strong>: Auto-generated sequential code (e.g. <code>CMP-001</code>, <code>CMP-002</code>).</li>
                  <li><strong>Basic Info</strong>: Company Name (Required), Legal Name, Short Name, Industry, Business Type.</li>
                  <li><strong>Legal Info Tab</strong>: PAN No (10 chars), GSTIN (15 chars), CIN/LLPIN, TAN, MSME Registration, License numbers.</li>
                  <li><strong>Address Tab</strong>: Registered Office, Country (India/Other), State (dropdown), City, PIN Code.</li>
                  <li><strong>Excel Import</strong>: Upload batch <code>.xlsx</code> or <code>.csv</code> files using the standard template.</li>
                </ul>
              </div>

              <div style={{ padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>Screen 2 — Records Table & Actions</h3>
                <ul style={{ fontSize: 13, color: txtMuted, paddingLeft: 20, margin: 0, lineHeight: 1.7 }}>
                  <li>Filter records instantly by company name or code.</li>
                  <li>Export records to Excel spreadsheet.</li>
                  <li>View full detail drawer, edit existing records, or delete company records.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === "inventory-mgmt" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>📦 Inventory Management</h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 12, borderLeft: "4px solid #f59e0b", background: dark ? "rgba(245,158,11,0.08)" : "#fef3c7" }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: txtPrimary, margin: 0 }}>1. Material Issue Slip (ISSUE)</h4>
                  <p style={{ fontSize: 12, color: txtMuted, margin: "4px 0 0" }}>
                    Transfers material from a source department to a target department (e.g. Stores → Production).
                  </p>
                </div>
                <div style={{ padding: 14, borderRadius: 12, borderLeft: "4px solid #10b981", background: dark ? "rgba(16,185,129,0.08)" : "#d1fae5" }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: txtPrimary, margin: 0 }}>2. Stock Inward / Receipt (RECEIPT)</h4>
                  <p style={{ fontSize: 12, color: txtMuted, margin: "4px 0 0" }}>
                    Records inward raw material or supplier deliveries directly into department inventory.
                  </p>
                </div>
                <div style={{ padding: 14, borderRadius: 12, borderLeft: "4px solid #8b5cf6", background: dark ? "rgba(139,92,246,0.08)" : "#ede9fe" }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: txtPrimary, margin: 0 }}>3. Transaction Reversal (REVERSE)</h4>
                  <p style={{ fontSize: 12, color: txtMuted, margin: "4px 0 0" }}>
                    Reverses an erroneous transaction slip and restores/deducts stock balance accordingly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "validation-rules" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>⚖️ Business Rules & Validation System</h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0ea5e9", margin: "0 0 6px" }}>Stock Balance Validation</h3>
                  <p style={{ fontSize: 13, color: txtMuted, margin: 0, lineHeight: 1.6 }}>
                    For <code>ISSUE</code> transactions, the requested quantity <strong>cannot exceed the closing balance</strong> in the source department. Attempting to issue more than available stock triggers an <code>InsufficientStockException</code>.
                  </p>
                </div>

                <div style={{ padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0ea5e9", margin: "0 0 6px" }}>Reversal Constraints</h3>
                  <p style={{ fontSize: 13, color: txtMuted, margin: 0, lineHeight: 1.6 }}>
                    Reversing a <code>RECEIPT</code> requires that current available balance &ge; receipt quantity. Reversing an already reversed transaction is strictly blocked.
                  </p>
                </div>

                <div style={{ padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0ea5e9", margin: "0 0 6px" }}>Legal Identification Rules</h3>
                  <p style={{ fontSize: 13, color: txtMuted, margin: 0, lineHeight: 1.6 }}>
                    <strong>PAN No</strong> must be exactly 10 alphanumeric characters (e.g. <code>ABCDE1234F</code>).<br />
                    <strong>GSTIN</strong> must be 15 characters matching standard Indian GST structure (e.g. <code>27AAAAA0000A1Z5</code>).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "excel-schemas" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>📊 Excel Batch File Formats</h2>

              <div style={{ padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 8px" }}>Inventory Batch Import Header Standard</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", color: txtPrimary }}>
                    <thead>
                      <tr style={{ background: dark ? "rgba(148,163,184,0.1)" : "#e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px" }}>Column Header</th>
                        <th style={{ padding: "8px 12px" }}>Required</th>
                        <th style={{ padding: "8px 12px" }}>Example Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: `1px solid ${bdrCard}` }}>
                        <td style={{ padding: "8px 12px" }}><code>type</code></td>
                        <td style={{ padding: "8px 12px", color: "#10b981", fontWeight: 700 }}>Yes</td>
                        <td style={{ padding: "8px 12px" }}>ISSUE / RECEIPT</td>
                      </tr>
                      <tr style={{ borderBottom: `1px solid ${bdrCard}` }}>
                        <td style={{ padding: "8px 12px" }}><code>fromDept</code></td>
                        <td style={{ padding: "8px 12px", color: "#10b981", fontWeight: 700 }}>Yes</td>
                        <td style={{ padding: "8px 12px" }}>Stores / Production</td>
                      </tr>
                      <tr style={{ borderBottom: `1px solid ${bdrCard}` }}>
                        <td style={{ padding: "8px 12px" }}><code>itemCode</code></td>
                        <td style={{ padding: "8px 12px", color: "#10b981", fontWeight: 700 }}>Yes</td>
                        <td style={{ padding: "8px 12px" }}>MAT-001</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 12px" }}><code>quantity</code></td>
                        <td style={{ padding: "8px 12px", color: "#10b981", fontWeight: 700 }}>Yes</td>
                        <td style={{ padding: "8px 12px" }}>250.5</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === "faq" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>❓ Frequently Asked Questions</h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ padding: 14, borderRadius: 12, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: txtPrimary, margin: "0 0 4px" }}>Q: How do I switch between Light and Dark mode?</h4>
                  <p style={{ fontSize: 12, color: txtMuted, margin: 0 }}>A: Toggle the Moon/Sun mode switch at the bottom of the left sidebar.</p>
                </div>
                <div style={{ padding: 14, borderRadius: 12, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: txtPrimary, margin: "0 0 4px" }}>Q: How do I open the AI Assistant for help?</h4>
                  <p style={{ fontSize: 12, color: txtMuted, margin: 0 }}>A: Click on "AI Chatbot 🤖✨" in the sidebar under Help & Support or click the floating AI icon at the bottom-right of the screen.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
