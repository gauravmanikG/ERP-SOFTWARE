import React, { useState } from "react";
import { BookOpen, FileText, CheckCircle2, HelpCircle, Package, Building2, LayoutDashboard, Bell, BarChart3, Sparkles, Layers } from "lucide-react";

function Rule({ children, dark, kind = "must" }) {
  const styles = {
    must: { border: "#0ea5e9", bg: dark ? "rgba(14,165,233,0.1)" : "#f0f9ff", label: "Must" },
    stop: { border: "#ef4444", bg: dark ? "rgba(239,68,68,0.1)" : "#fef2f2", label: "Blocked" },
    ok: { border: "#10b981", bg: dark ? "rgba(16,185,129,0.1)" : "#ecfdf5", label: "Allowed" },
    tip: { border: "#f59e0b", bg: dark ? "rgba(245,158,11,0.1)" : "#fffbeb", label: "Tip" },
  };
  const s = styles[kind] || styles.must;
  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, borderLeft: `4px solid ${s.border}`, background: s.bg }}>
      <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: s.border, margin: "0 0 4px" }}>{s.label}</p>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: dark ? "#cbd5e1" : "#334155" }}>{children}</div>
    </div>
  );
}

function FieldTable({ rows, dark, bdr, txtPrimary }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", color: txtPrimary }}>
        <thead>
          <tr style={{ background: dark ? "rgba(148,163,184,0.1)" : "#e2e8f0", textAlign: "left" }}>
            <th style={{ padding: "8px 12px" }}>Field</th>
            <th style={{ padding: "8px 12px" }}>Required?</th>
            <th style={{ padding: "8px 12px" }}>Rule (plain English)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field} style={{ borderBottom: `1px solid ${bdr}` }}>
              <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.field}</td>
              <td style={{ padding: "8px 12px", color: r.req ? "#059669" : "#64748b", fontWeight: r.req ? 700 : 500 }}>
                {r.req ? "Yes" : "Optional"}
              </td>
              <td style={{ padding: "8px 12px" }}>{r.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocumentationPage({ dark = false, setPage }) {
  const [activeSection, setActiveSection] = useState("getting-started");

  const bgCard = dark ? "#1e293b" : "#ffffff";
  const bdrCard = dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)" ;
  const txtPrimary = dark ? "#f1f5f9" : "#0f172a";
  const txtMuted = dark ? "#94a3b8" : "#64748b";
  const box = { padding: 16, borderRadius: 14, background: dark ? "rgba(148,163,184,0.06)" : "#f8fafc", border: `1px solid ${bdrCard}` };

  const go = (id) => setPage && setPage(id);

  const sections = [
    { id: "getting-started", title: "Getting started", icon: <BookOpen size={16} /> },
    { id: "dashboard", title: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { id: "notifications", title: "Notifications", icon: <Bell size={16} /> },
    { id: "entry-forms", title: "Entry Forms (Company)", icon: <Building2 size={16} /> },
    { id: "inventory-mgmt", title: "Inventory Management", icon: <Package size={16} /> },
    { id: "bom-moulding", title: "BOM Moulding & FG Transfer", icon: <Layers size={16} /> },
    { id: "analysis", title: "Analysis (CB reports)", icon: <BarChart3 size={16} /> },
    { id: "excel", title: "Excel import rules", icon: <FileText size={16} /> },
    { id: "other-pages", title: "Other menu pages", icon: <Sparkles size={16} /> },
    { id: "faq", title: "FAQ", icon: <HelpCircle size={16} /> },
  ];

  const OpenBtn = ({ page, label }) =>
    setPage ? (
      <button
        type="button"
        onClick={() => go(page)}
        style={{
          marginTop: 10,
          padding: "8px 14px",
          borderRadius: 10,
          border: "none",
          background: "#0284c7",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1080, margin: "0 auto", paddingBottom: 40 }}>
      <div
        style={{
          borderRadius: 20,
          padding: "26px 32px",
          background: dark ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
          color: "#fff",
          boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 30px rgba(14,165,233,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            📖
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: "-0.3px" }}>How to use this ERP</h1>
            <p style={{ fontSize: 13, opacity: 0.85, margin: "4px 0 0" }}>
              Beginner guide. Rules below match what the software actually checks today — not old ISSUE / RECEIPT types.
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
            }}
          >
            Ask AI Chatbot
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sections.map((s) => {
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
                }}
              >
                {s.icon}
                {s.title}
              </button>
            );
          })}
        </div>

        <div style={{ background: bgCard, border: `1px solid ${bdrCard}`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          {activeSection === "getting-started" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Getting started</h2>
              <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: 0 }}>
                This is the Silver Muller Seals plant ERP. Use the left sidebar to open a page. A star (<span style={{ color: "#0ea5e9" }}>*</span>) on a form means the field is required. Light / Dark mode is the switch at the bottom of the sidebar.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  ["Overview", "Dashboard, Reports (coming soon), Notifications"],
                  ["Operations", "Company Entry Forms, Inventory Management, BOM Moulding Transfer"],
                  ["Analysis", "Department wise CB, Item wise CB"],
                  ["Help", "This documentation and the AI Chatbot"],
                ].map(([t, d]) => (
                  <div key={t} style={box}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: txtPrimary, margin: "0 0 4px" }}>{t}</h3>
                    <p style={{ fontSize: 12, color: txtMuted, margin: 0 }}>{d}</p>
                  </div>
                ))}
              </div>
              <Rule dark={dark} kind="tip">
                Transaction types are no longer ISSUE / RECEIPT / REVERSE. They come from <strong>operation_master</strong> (for example Material Transfer, Customer Rejection Receipt, Rework). Departments come from <strong>department_master</strong>. Categories come from <strong>category_master</strong>.
              </Rule>
            </>
          )}

          {activeSection === "dashboard" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Dashboard</h2>
              <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: 0 }}>
                Home overview of plant KPIs and shortcuts. Charts and sample transactions on this screen are display snapshots, not live stock.
              </p>
              <Rule dark={dark}>There is nothing you must fill in here. Use the shortcut buttons to jump to Entry Forms or Inventory.</Rule>
              <OpenBtn page="dashboard" label="Open Dashboard" />
            </>
          )}

          {activeSection === "notifications" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Notifications</h2>
              <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: 0 }}>
                Create rules in <strong>Settings → Generate Notification</strong>. Change or remove them in <strong>Settings → Edit &amp; Delete Notification</strong>. Item code and category are required. Set a minimum, a maximum, or both. Pick one or more departments (each can have its own min/max) or All departments. This inbox shows live alerts when closing balance goes below min or above max. 20 alerts per page, with Gmail-style page numbers at the bottom. Bulk delete is at the bottom of the page. Mark read, delete, or jump to Item wise CB.
              </p>
              <Rule dark={dark} kind="must">Alerts use the same closing balance as Analysis (opening plus movements, never shown negative).</Rule>
              <OpenBtn page="notifications" label="Open Notifications" />
            </>
          )}

          {activeSection === "entry-forms" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Entry Forms — Company Master</h2>
              <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: 0 }}>
                Two screens: <strong>Screen 1</strong> is the form (and Excel upload). <strong>Screen 2</strong> is the saved records table. Fix every red error before Save will work.
              </p>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 8px" }}>Screen 1 — what you fill</h3>
                <FieldTable
                  dark={dark}
                  bdr={bdrCard}
                  txtPrimary={txtPrimary}
                  rows={[
                    { field: "Company Code", req: true, rule: "Created for you (CMP-001, CMP-002…). You cannot type it." },
                    { field: "Company Name", req: true, rule: "Cannot be blank." },
                    { field: "Legal / Short name, Industry, Business Type", req: false, rule: "Business Type defaults to Manufacturing if you leave it empty on Excel import." },
                    { field: "PAN No.", req: true, rule: "Exactly 10 characters: 5 letters, 4 digits, 1 letter. Example: ABCDE1234F." },
                    { field: "GSTIN", req: true, rule: "Exactly 15 characters. All zeros (000…) is rejected." },
                    { field: "Registered Office", req: true, rule: "Cannot be blank." },
                    { field: "Country", req: true, rule: "India or Other. If Other, you must type the country name." },
                    { field: "State", req: true, rule: "For India, pick from the official States/UTs list. For Other, type a province." },
                    { field: "City", req: true, rule: "Cannot be blank." },
                    { field: "PIN Code", req: false, rule: "If Country is India and you enter a PIN, it must be 6 digits and not start with 0." },
                    { field: "CIN, TAN, MSME, IEC, and other legal IDs", req: false, rule: "Optional extra identifiers." },
                  ]}
                />
              </div>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 8px" }}>Screen 2 — records table</h3>
                <ul style={{ fontSize: 13, color: txtMuted, paddingLeft: 20, margin: 0, lineHeight: 1.7 }}>
                  <li>Search by company name or code.</li>
                  <li>View, edit, or delete a row. Export selected or all records to Excel.</li>
                  <li>Excel import on Screen 1 validates the same required fields, then saves only if every row is clean.</li>
                </ul>
              </div>
              <OpenBtn page="entry-forms" label="Open Entry Forms" />
            </>
          )}

          {activeSection === "inventory-mgmt" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Inventory Management</h2>
              <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: 0 }}>
                Record material movements. Types, departments, items, and categories all come from the database — pick them from the dropdowns; do not invent new names on the form.
              </p>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 8px" }}>Header fields</h3>
                <FieldTable
                  dark={dark}
                  bdr={bdrCard}
                  txtPrimary={txtPrimary}
                  rows={[
                    { field: "Date", req: true, rule: "Today’s date. Shown automatically; you cannot change it." },
                    { field: "Type of Transaction", req: true, rule: "Must be one name from operation_master (the dropdown). Example: Material Transfer, Customer Rejection Receipt, Rework." },
                    { field: "Transaction Number", req: false, rule: "Previewed automatically. A real number is assigned when you save." },
                    { field: "Slip Number", req: false, rule: "Your own reference if you want one." },
                    { field: "From Department", req: true, rule: "Must be a department from the dropdown (department_master)." },
                    { field: "To Department", req: true, rule: "Must pick a department from the dropdown (department_master). Same as Excel." },
                  ]}
                />
              </div>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 8px" }}>Each item row</h3>
                <FieldTable
                  dark={dark}
                  bdr={bdrCard}
                  txtPrimary={txtPrimary}
                  rows={[
                    { field: "Item Code", req: true, rule: "Must exist in the material master. Search by code or description." },
                    { field: "Category of Item", req: true, rule: "Must pick a name from category_master. Empty is not allowed; the item’s master category is not used as a fallback." },
                    { field: "Quantity", req: true, rule: "Must be a number greater than 0." },
                    { field: "Remarks", req: false, rule: "Optional note on the line or on the whole slip." },
                  ]}
                />
                <p style={{ fontSize: 13, color: txtMuted, margin: "10px 0 0" }}>You need at least one item row.</p>
              </div>

              <Rule dark={dark}>
                <strong>Quantity vs closing balance (most types):</strong> Quantity must be greater than 0 and must not be more than the From Department closing balance for that item + category. If the From Department has no stock (balance 0 or less), the screen will not save the line.
              </Rule>
              <Rule dark={dark} kind="ok">
                <strong>Exception — Customer Rejection Receipt:</strong> This type is inbound. The screen does not check From Department stock. Stock is added; other types move stock out of From Dept (and into To Dept when you set one).
              </Rule>
              <Rule dark={dark} kind="stop">
                The server will also refuse a save if quantity is greater than that department’s closing balance for the same item and category (same rule, except inbound).
              </Rule>
              <Rule dark={dark} kind="tip">
                Closing balance is opening balance (item + category + department) plus later movements of that same item and category. Two categories of the same item code are tracked separately.
              </Rule>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 8px" }}>History tab</h3>
                <ul style={{ fontSize: 13, color: txtMuted, paddingLeft: 20, margin: 0, lineHeight: 1.7 }}>
                  <li>Shows saved movements from the database.</li>
                  <li>Export to Excel or CSV.</li>
                  <li>Clear all history asks for confirmation, then deletes every inventory transaction in PostgreSQL. Use with care.</li>
                </ul>
              </div>
              <OpenBtn page="inventory" label="Open Inventory Management" />
            </>
          )}

          {activeSection === "bom-moulding" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: txtPrimary, margin: 0, letterSpacing: "-0.3px" }}>
                    BOM Moulding &amp; FG Assembly Transfer
                  </h2>
                  <p style={{ fontSize: 13, color: txtMuted, margin: "4px 0 0" }}>
                    Rule-based manufacturing movement engine. Automatically decomposes multi-component bills of materials, validates department stock, and enforces metal shell bonding rules.
                  </p>
                </div>
                <OpenBtn page="moulding-bom" label="Open BOM Moulding Transfer" />
              </div>

              {/* High-level Overview Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ ...box, borderLeft: "4px solid #7c3aed" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#7c3aed", letterSpacing: "0.05em" }}>
                    ENGINE 1 — FINISHING OPERATIONS
                  </span>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: txtPrimary, margin: "4px 0 6px" }}>
                    Finishing — FG Sheet Assembly BOM
                  </h3>
                  <p style={{ fontSize: 12, color: txtMuted, lineHeight: 1.6, margin: 0 }}>
                    Triggered when <strong>Source = FINISHING</strong> and <strong>Category = FG</strong>. Decomposes finished goods into up to 29 sub-components (springs, moulded parts, hardware) using recipes in <code>fg_bom</code>. Applies the <strong>Metal Shell Exclusion Rule</strong>.
                  </p>
                </div>

                <div style={{ ...box, borderLeft: "4px solid #0284c7" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#0284c7", letterSpacing: "0.05em" }}>
                    ENGINE 2 — MOULDING OPERATIONS
                  </span>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: txtPrimary, margin: "4px 0 6px" }}>
                    Moulding BOM Transfer
                  </h3>
                  <p style={{ fontSize: 12, color: txtMuted, lineHeight: 1.6, margin: 0 }}>
                    Triggered when <strong>Source = Moulding</strong> (or Category ≠ FG). Deducts raw metal shells when transferring rubber moulded components, passes O-Rings with zero deduction, and handles standard items 1-to-1.
                  </p>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 1: FINISHING - FG SHEET ASSEMBLY BOM RULES (DEEP DIVE) */}
              {/* ========================================================================= */}
              <div style={{ ...box, background: dark ? "rgba(124,58,237,0.06)" : "#faf5ff", borderColor: dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ background: "#7c3aed", color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900 }}>
                    SPECIAL DEEP-DIVE
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: txtPrimary, margin: 0 }}>
                    Finishing — FG Sheet Rules: What Will Subtract If We Transfer What
                  </h3>
                </div>

                <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.7, margin: "0 0 14px" }}>
                  When oil seals and kits reach the final assembly stage in <strong>Finishing</strong>, they are transferred as <strong>FG (Finished Goods)</strong> to downstream departments (such as <strong>Gate</strong>, <strong>Store</strong>, or <strong>Dispatch</strong>). 
                  Because the FG seal is an assembly of multiple sub-components, the software automatically retrieves the exact engineering recipe from the plant's <strong>FG BOM Sheet</strong> (the <code>fg_bom</code> table).
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <Rule dark={dark} kind="must">
                    <strong>The Fundamental Subtraction Formula:</strong> For every component defined in the FG BOM recipe with ratio &gt; 0, the software calculates:<br />
                    <code style={{ fontSize: 13, fontWeight: 800, color: "#0ea5e9" }}>Deduction Quantity = BOM Ratio × Transferred FG Quantity</code><br />
                    This exact quantity is deducted from the <strong>FINISHING</strong> closing balance for that component.
                  </Rule>

                  <Rule dark={dark} kind="stop">
                    <strong>THE METAL SHELL EXCLUSION RULE (CRITICAL RULE):</strong><br />
                    In rubber oil seal manufacturing, if a rubber moulded component (<code>OUTER MOULDED</code>, <code>INNER MOULDED</code>, or <code>MIDDLE MOULDED</code>) is used in the seal, the corresponding raw metal shell was <em>already bonded inside the rubber during the Moulding press operation</em>.<br />
                    Finishing received the already-moulded component. Therefore, to prevent duplicate stock subtraction:
                    <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                      <li>If <strong>OUTER MOULDED &gt; 0</strong> and <strong>OUTER METAL SHELL &gt; 0</strong>: <strong>OUTER METAL SHELL is EXCLUDED (0 deducted)</strong>.</li>
                      <li>If <strong>INNER MOULDED &gt; 0</strong> and <strong>INNER METAL SHELL &gt; 0</strong>: <strong>INNER METAL SHELL is EXCLUDED (0 deducted)</strong>.</li>
                      <li>If <strong>MIDDLE MOULDED &gt; 0</strong> and <strong>MIDDLE METAL SHELL &gt; 0</strong>: <strong>MIDDLE METAL SHELL is EXCLUDED (0 deducted)</strong>.</li>
                    </ul>
                  </Rule>

                  <Rule dark={dark} kind="ok">
                    <strong>When is a Metal Shell NOT Excluded?</strong><br />
                    If a seal's BOM recipe contains a metal shell but <strong>has NO corresponding moulded part</strong> (its moulded ratio is 0), that metal shell is an unbonded, loose component assembled directly in Finishing. In this case, <strong>it IS subtracted</strong> from Finishing per its BOM ratio!
                  </Rule>

                  <Rule dark={dark} kind="tip">
                    <strong>Destination Department Addition:</strong> Exactly <strong>+Quantity</strong> of the selected item in category <strong>FG</strong> is credited to the Destination Department using transaction type <code>BOM FG Transfer Receipt</code> with transaction number prefix <code>FGB-xxxx</code>.
                  </Rule>
                </div>

                {/* The 29 Component Categories Table */}
                <h4 style={{ fontSize: 13, fontWeight: 800, color: txtPrimary, margin: "16px 0 8px" }}>
                  All 29 Component Categories Supported in the FG BOM Recipe:
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6, marginBottom: 16 }}>
                  {[
                    "OUTER METAL SHELL", "INNER METAL SHELL", "SPRING", "MIDDLE METAL SHELL",
                    "OUTER MOULDED", "INNER MOULDED", "MIDDLE MOULDED",
                    "FELT", "PTFE", "TPU/PU", "BRASS WASHER", "NUT", "PLASTIC",
                    "TOOTED DISC", "FOAM", "GASKET", "O-RING", "LOCK WASHER",
                    "ALUMINIUM WASHER", "SFG", "BIG SHIM-THIN", "SMALL SHIM-THIN",
                    "BIG SHIM-THICK", "SMALL SHIM-THICK", "SPLIT PIN", "COTTON PIN",
                    "SILICON RUBBER", "O RING MOULDED", "JALI"
                  ].map((cat) => (
                    <div
                      key={cat}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        background: dark ? "rgba(148,163,184,0.08)" : "#ffffff",
                        border: `1px solid ${bdrCard}`,
                        fontSize: 11,
                        fontWeight: 700,
                        color: txtPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.includes("MOULDED") ? "#0ea5e9" : cat.includes("SHELL") ? "#f59e0b" : "#10b981" }}></span>
                      {cat}
                    </div>
                  ))}
                </div>

                {/* Concrete Examples Table: Transfer What -> Subtracts What */}
                <h4 style={{ fontSize: 14, fontWeight: 800, color: txtPrimary, margin: "20px 0 8px" }}>
                  Detailed Concrete Examples: "If We Transfer What → What Will Subtract"
                </h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", color: txtPrimary }}>
                    <thead>
                      <tr style={{ background: dark ? "rgba(124,58,237,0.2)" : "#ede9fe", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px" }}>FG Item Code &amp; Name</th>
                        <th style={{ padding: "10px 12px" }}>Transfer Qty</th>
                        <th style={{ padding: "10px 12px" }}>What SUBTRACTS from Finishing</th>
                        <th style={{ padding: "10px 12px" }}>What is EXCLUDED (0 Deducted)</th>
                        <th style={{ padding: "10px 12px" }}>What ADDS to Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: `1px solid ${bdrCard}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 800 }}>
                          103 [FG]<br />
                          <span style={{ fontSize: 11, fontWeight: 400, color: txtMuted }}>Tata 1210 Rear Inner Hub</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>100 NOS</td>
                        <td style={{ padding: "10px 12px", color: "#ef4444", fontWeight: 700 }}>
                          • -100 OUTER MOULDED<br />
                          • -100 INNER METAL SHELL (no inner moulded)<br />
                          • -100 SPRING
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>
                          🔒 <strong>OUTER METAL SHELL: 0</strong><br />
                          <span style={{ fontSize: 10 }}>Covered by Outer Moulded</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#10b981", fontWeight: 800 }}>
                          +100 103 [FG] (at Gate/Store)
                        </td>
                      </tr>

                      <tr style={{ borderBottom: `1px solid ${bdrCard}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 800 }}>
                          314 [FG]<br />
                          <span style={{ fontSize: 11, fontWeight: 400, color: txtMuted }}>105x125x12/16 Oil Seal</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>50 NOS</td>
                        <td style={{ padding: "10px 12px", color: "#ef4444", fontWeight: 700 }}>
                          • -50 OUTER MOULDED<br />
                          • -50 SPRING
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>
                          🔒 <strong>OUTER METAL SHELL: 0</strong><br />
                          <span style={{ fontSize: 10 }}>Covered by Outer Moulded</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#10b981", fontWeight: 800 }}>
                          +50 314 [FG]
                        </td>
                      </tr>

                      <tr style={{ borderBottom: `1px solid ${bdrCard}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 800 }}>
                          310 [FG]<br />
                          <span style={{ fontSize: 11, fontWeight: 400, color: txtMuted }}>Rear Inner Hub 170x202x24</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>20 NOS</td>
                        <td style={{ padding: "10px 12px", color: "#ef4444", fontWeight: 700 }}>
                          • -20 OUTER METAL SHELL (not excluded, outer moulded=0)<br />
                          • -20 INNER METAL SHELL (not excluded, inner moulded=0)<br />
                          • -20 SPRING<br />
                          • -20 MIDDLE MOULDED
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>
                          🔒 <strong>MIDDLE METAL SHELL: 0</strong><br />
                          <span style={{ fontSize: 10 }}>Covered by Middle Moulded</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#10b981", fontWeight: 800 }}>
                          +20 310 [FG]
                        </td>
                      </tr>

                      <tr style={{ borderBottom: `1px solid ${bdrCard}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 800 }}>
                          191 [FG]<br />
                          <span style={{ fontSize: 11, fontWeight: 400, color: txtMuted }}>Wheel Seal Kit with Shims &amp; Gaskets</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>10 KITS</td>
                        <td style={{ padding: "10px 12px", color: "#ef4444", fontWeight: 700 }}>
                          • -20 GASKET (ratio 2 × 10)<br />
                          • -20 FELT (ratio 2 × 10)<br />
                          • -40 BIG SHIM-THIN (ratio 4 × 10)<br />
                          • -20 SMALL SHIM-THIN (ratio 2 × 10)<br />
                          • -40 BIG SHIM-THICK (ratio 4 × 10)<br />
                          • -20 SMALL SHIM-THICK (ratio 2 × 10)
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>
                          None (Kit uses loose shims and gaskets)
                        </td>
                        <td style={{ padding: "10px 12px", color: "#10b981", fontWeight: 800 }}>
                          +10 191 [FG]
                        </td>
                      </tr>

                      <tr style={{ borderBottom: `1px solid ${bdrCard}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 800 }}>
                          651 [FG]<br />
                          <span style={{ fontSize: 11, fontWeight: 400, color: txtMuted }}>48x61x8 with Silicon Rubber</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>100 NOS</td>
                        <td style={{ padding: "10px 12px", color: "#ef4444", fontWeight: 700 }}>
                          • -100 OUTER MOULDED<br />
                          • -100 INNER METAL SHELL<br />
                          • -100 SPRING<br />
                          • -100 SILICON RUBBER
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>
                          🔒 <strong>OUTER METAL SHELL: 0</strong><br />
                          <span style={{ fontSize: 10 }}>Covered by Outer Moulded</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#10b981", fontWeight: 800 }}>
                          +100 651 [FG]
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 2: MOULDING OPERATIONS RULES */}
              {/* ========================================================================= */}
              <div style={box}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: txtPrimary, margin: "0 0 10px" }}>
                  Moulding Operations (Moulding BOM Transfer Rules)
                </h3>
                <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: "0 0 14px" }}>
                  When moving parts produced in the Moulding department, the software automatically classifies the item's category into one of 3 distinct operational modes:
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 12, borderLeft: "4px solid #0ea5e9", background: dark ? "rgba(14,165,233,0.08)" : "#f0f9ff" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0ea5e9" }}>1. MOULDED CATEGORY</span>
                      <span style={{ fontSize: 10, fontWeight: 800, background: "#0ea5e9", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>SHELL DEDUCTION</span>
                    </div>
                    <p style={{ fontSize: 12, color: txtPrimary, margin: "0 0 6px", lineHeight: 1.6 }}>
                      Applies to any category containing <strong>MOULDED</strong> (e.g. <code>OUTER MOULDED</code>, <code>INNER MOULDED</code>, <code>MIDDLE MOULDED</code>, <code>OMLD</code>, <code>IMLD</code>).
                    </p>
                    <ul style={{ fontSize: 12, color: txtMuted, margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                      <li><strong>What Subtracts from Moulding:</strong> The corresponding <strong>Metal Shell</strong> is deducted from Moulding stock! For example, transferring <code>OUTER MOULDED</code> deducts <code>OUTER METAL SHELL</code>.</li>
                      <li><strong>Metal Shell Resolution Hierarchy:</strong> First checks explicit mapping table <code>moulding_bom_mapping</code>; second checks pattern matches in <code>master</code>; third falls back to same master item with derived shell category.</li>
                      <li><strong>What Adds to Destination:</strong> The selected <strong>Moulded</strong> item is credited to the Destination Department using transaction type <code>BOM Moulding Receipt</code>.</li>
                      <li><strong>Stock Validation:</strong> Moulding department MUST have sufficient stock of the Metal Shell (Available &ge; Requested Qty). If not, the save is blocked.</li>
                    </ul>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, borderLeft: "4px solid #10b981", background: dark ? "rgba(16,185,129,0.08)" : "#ecfdf5" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>2. O-RING CATEGORY</span>
                      <span style={{ fontSize: 10, fontWeight: 800, background: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>ZERO DEDUCTION</span>
                    </div>
                    <p style={{ fontSize: 12, color: txtPrimary, margin: "0 0 6px", lineHeight: 1.6 }}>
                      Applies to categories containing <strong>O-RING</strong>, <strong>ORING</strong>, or <strong>O_RING</strong>.
                    </p>
                    <ul style={{ fontSize: 12, color: txtMuted, margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                      <li><strong>What Subtracts from Moulding:</strong> <strong>NOTHING (0 stock deducted)</strong>. Rubber O-rings are moulded without metal shells.</li>
                      <li><strong>What Adds to Destination:</strong> The selected O-Ring is credited to the Destination Department using <code>BOM Moulding Receipt</code>.</li>
                    </ul>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, borderLeft: "4px solid #64748b", background: dark ? "rgba(148,163,184,0.08)" : "#f8fafc" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#64748b" }}>3. STANDARD CATEGORIES</span>
                      <span style={{ fontSize: 10, fontWeight: 800, background: "#64748b", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>DIRECT 1-TO-1</span>
                    </div>
                    <p style={{ fontSize: 12, color: txtPrimary, margin: "0 0 6px", lineHeight: 1.6 }}>
                      Applies to any standard category (e.g. raw metal shells, springs, hardware, SFG).
                    </p>
                    <ul style={{ fontSize: 12, color: txtMuted, margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                      <li>Standard 1-to-1 material transfer: Deducts quantity from Source, adds same quantity to Destination.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 3: SYSTEM SAFEGUARDS, VALIDATION, AND AUDIT TRAIL */}
              {/* ========================================================================= */}
              <div style={box}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: txtPrimary, margin: "0 0 8px" }}>
                  System Safeguards, Validation &amp; Database Integrity
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Rule dark={dark} kind="must">
                    <strong>Pre-Flight Stock Verification:</strong> Both the frontend Live Impact Preview and the backend transaction service simulate the transfer before executing. If any single component lacks adequate stock, the entire transaction is atomically aborted and a bulleted list of missing quantities is displayed.
                  </Rule>
                  <Rule dark={dark} kind="ok">
                    <strong>Auto-Initialized Opening Balances:</strong> When a component or finished good arrives at a destination department for the first time, the system automatically runs <code>ensureOpeningBalanceExists</code> to insert an opening balance of 0 in PostgreSQL. This guarantees that Department wise CB and Item wise CB reports never fail or throw null errors.
                  </Rule>
                  <Rule dark={dark} kind="tip">
                    <strong>Audit Trail &amp; Numbering:</strong> Transfers generate unique, auditable sequence numbers:
                    <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                      <li><code>MBD-xxxx</code> for Moulding BOM Transfers</li>
                      <li><code>FGB-xxxx</code> for Finishing FG BOM Transfers</li>
                    </ul>
                    All transactions can be searched, reviewed, and verified in the <strong>Transfer History</strong> tab.
                  </Rule>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 4: HOW TO USE THE BOM TRANSFER SCREEN (STEP-BY-STEP) */}
              {/* ========================================================================= */}
              <div style={box}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: txtPrimary, margin: "0 0 10px" }}>
                  Step-by-Step Operator Guide
                </h3>
                <ol style={{ fontSize: 13, color: txtMuted, paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                  <li>Open <strong>BOM Moulding Transfer</strong> from the sidebar under <strong>OPERATIONS</strong>.</li>
                  <li>
                    Select <strong>Source Department</strong> and <strong>Destination Department</strong>. Notice that if you select <strong>FINISHING</strong> and category <strong>FG</strong>, the header banner transitions to purple "Finishing Operations" mode.
                  </li>
                  <li>Search and select the <strong>Item Code</strong> from the master search combobox (searches across codes and descriptions).</li>
                  <li>Confirm or select the <strong>Category of Item</strong> from the dropdown.</li>
                  <li>Enter the <strong>Quantity</strong> to transfer.</li>
                  <li>
                    Inspect the <strong>Live Impact Preview</strong> card on the right:
                    <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
                      <li><span style={{ color: "#ef4444", fontWeight: 700 }}>Red (-) rows</span>: Stock being subtracted from the source department.</li>
                      <li><span style={{ color: "#10b981", fontWeight: 700 }}>Green (+) rows</span>: Stock being added to the destination department.</li>
                      <li><span style={{ color: "#94a3b8", fontWeight: 700 }}>Gray line-through (🔒 EXCLUDED)</span>: Metal shells covered by rubber moulded parts.</li>
                    </ul>
                  </li>
                  <li>Click <strong>Submit Transfer</strong>. A green confirmation banner will display the generated transaction reference.</li>
                  <li>Switch to the <strong>Transfer History</strong> tab to view and audit all past records.</li>
                </ol>
                <div style={{ marginTop: 14 }}>
                  <OpenBtn page="moulding-bom" label="Open BOM Moulding Transfer" />
                </div>
              </div>
            </>
          )}

          {activeSection === "analysis" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Analysis — closing balance reports</h2>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>Department wise CB</h3>
                <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: 0 }}>
                  Pick <strong>one department</strong>. The report lists only items whose closing balance in that department is greater than zero (what it currently holds). Other categories of the same item code, and departments that only show a negative leftover from a transfer, are not listed.
                </p>
                <Rule dark={dark}>Department is required. Nothing loads until you choose one from the list.</Rule>
                <OpenBtn page="dept-wise-cb" label="Open Department wise CB" />
              </div>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>Item wise CB</h3>
                <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: 0 }}>
                  Pick an <strong>item code</strong> and a <strong>category</strong>. Only departments that actually hold that pair (opening or closing greater than zero) are listed. Closing is never negative. Example: 651 FG at Gate only — not SPRING/Store or a negative Moulding row.
                </p>
                <Rule dark={dark}>Both Item Code and Category are required. Refresh stays disabled until both are selected.</Rule>
                <OpenBtn page="item-wise-cb" label="Open Item wise CB" />
              </div>
            </>
          )}

          {activeSection === "excel" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Excel import rules</h2>
              <p style={{ fontSize: 13, color: txtMuted, lineHeight: 1.65, margin: 0 }}>
                Always download a fresh sample template from the page. Extra words in headers such as (Required) or * are ignored. Column names can vary slightly (Qty, From Department, Type of Transaction, Slip No.). To Department and Category are required on the form, in Excel, and on the server.
              </p>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 8px" }}>Inventory Excel (Inventory Management)</h3>
                <FieldTable
                  dark={dark}
                  bdr={bdrCard}
                  txtPrimary={txtPrimary}
                  rows={[
                    { field: "Type", req: true, rule: "Must match an operation_master name (any capitalisation). Not ISSUE/RECEIPT/REVERSE." },
                    { field: "From Dept", req: true, rule: "Must match a department name from the backend list." },
                    { field: "To Dept", req: true, rule: "Required. Must match a department name from the backend list (same as the form)." },
                    { field: "Item Code", req: true, rule: "Must exist in material master. Compared in uppercase." },
                    { field: "Quantity", req: true, rule: "Number greater than 0." },
                    { field: "Category", req: true, rule: "Must match category_master. Empty is not filled from the item master." },
                    { field: "Description", req: false, rule: "If empty, taken from the item master." },
                    { field: "Slip No., Timestamp, Remarks", req: false, rule: "Optional." },
                  ]}
                />
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Rule dark={dark}>
                    Stock (Excel): for every type except Customer Rejection Receipt, if From Dept has a known closing balance greater than 0, quantity cannot exceed that balance (item + category).
                  </Rule>
                  <Rule dark={dark} kind="tip">
                    The sample workbook includes Field Guidelines plus Valid Operations, Valid Departments, Valid Categories, and Valid Master Items from the lists currently loaded in the app.
                  </Rule>
                </div>
              </div>

              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 8px" }}>Company Excel (Entry Forms)</h3>
                <FieldTable
                  dark={dark}
                  bdr={bdrCard}
                  txtPrimary={txtPrimary}
                  rows={[
                    { field: "Company Name", req: true, rule: "Cannot be blank." },
                    { field: "PAN No.", req: true, rule: "10-character PAN pattern (ABCDE1234F)." },
                    { field: "GSTIN", req: true, rule: "Exactly 15 characters; not all zeros." },
                    { field: "Registered Office", req: true, rule: "Cannot be blank." },
                    { field: "Country", req: true, rule: "Required. India uses the States list." },
                    { field: "State", req: true, rule: "Required. For India must be a recognised State/UT." },
                    { field: "City", req: true, rule: "Cannot be blank." },
                    { field: "Company Code", req: false, rule: "Assigned automatically if missing." },
                    { field: "PIN Code", req: false, rule: "If India, 6 digits not starting with 0." },
                  ]}
                />
                <p style={{ fontSize: 13, color: txtMuted, margin: "10px 0 0" }}>
                  If any row fails, the whole file is rejected until you fix those rows. No duplicates of already-saved companies should be imported.
                </p>
              </div>
            </>
          )}

          {activeSection === "other-pages" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Other menu pages</h2>
              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>Reports &amp; Analytics, Users &amp; Roles</h3>
                <p style={{ fontSize: 13, color: txtMuted, margin: 0, lineHeight: 1.65 }}>
                  These screens currently show “Coming soon”. There are no save rules yet. Use Analysis (CB) for live stock views.
                </p>
              </div>
              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>Settings — Add a Department</h3>
                <p style={{ fontSize: 13, color: txtMuted, margin: 0, lineHeight: 1.65 }}>
                  Click <strong>Settings</strong>. Options are grouped as <strong>Department</strong>, <strong>Item</strong>, <strong>Category</strong>, and <strong>Notification</strong>.
                  Under each: <strong>Generate</strong> or <strong>Edit &amp; Delete</strong> (Category has Generate and Delete).
                  Edit &amp; Delete Department: select a department, add an existing or new item into it (code, category, opening), or remove an item from that department only. You can rename the department or delete it if no inventory transactions use it.
                  Delete Category: select an unused category name and type it to confirm. Blocked if items, openings, or transactions still use it.
                  If the item needs a category that is not in the list, create the category first, then add the item. Item fields: name, code, category, description, unit. Then add opening balance per department (you can add Store, Moulding, … without repeating the item).
                  To change an existing item (including opening and closing balances) or remove it entirely, use Edit &amp; Delete Item. Closing is not stored on its own: it is opening plus later movements. Changing closing updates opening so the new closing is kept. Delete removes the item, opening balances for that code, and all inventory movements for that item.
                </p>
                <OpenBtn page="settings" label="Open Settings" />
              </div>
              <div style={box}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 6px" }}>Documentation &amp; AI Chatbot</h3>
                <p style={{ fontSize: 13, color: txtMuted, margin: 0, lineHeight: 1.65 }}>
                  This page is the written rulebook. The chatbot answers with the same latest rules (operations, stock, Excel). You may paste a Gemini API key locally if you want live answers; that key is stored only in your browser.
                </p>
                <OpenBtn page="ai-chatbot" label="Open AI Chatbot" />
              </div>
              <Rule dark={dark} kind="tip">
                <CheckCircle2 size={14} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 6 }} />
                If a printed SOP still says ISSUE / RECEIPT / REVERSE, ignore it. Use the operation names in the Type dropdown.
              </Rule>
            </>
          )}

          {activeSection === "faq" && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: txtPrimary, margin: 0 }}>Frequently asked questions</h2>
              {[
                ["Why was my quantity rejected?", "For types other than Customer Rejection Receipt, quantity must be > 0 and ≤ From Department closing balance for that item and category. Zero stock in From Dept also blocks the form."],
                ["Why must I pick To Dept and Category?", "Both are required on the form, in Excel, and on the server. Stock is tracked per item + category, and every movement needs a destination department."],
                ["What is the difference between Inventory Management and BOM Moulding Transfer?", "Standard Inventory Management records 1-to-1 material movements between departments. BOM Moulding Transfer is a multi-level BOM engine: it decomposes finished goods or moulded items, automatically deducting their underlying components (shells, springs, moulded parts) according to engineering BOM recipes."],
                ["In Finishing FG transfer, why does Outer Metal Shell show 0 / line-through?", "Because of the Metal Shell Exclusion Rule! If a seal's recipe has Outer Moulded, the metal shell was already bonded inside the rubber during the Moulding press operation. Finishing received the moulded part, so deducting the raw metal shell again would be a double deduction."],
                ["Can I add a new department?", "Yes. Administration → Settings → Add a Department. Fill Department name (unique) and Process sequence (sort order). It then appears in Inventory From Department and To Department."],
                ["How do I add or remove items in a department?", "Settings → Edit & Delete Department. Select the department. Add an existing item (code, category, opening) or a new item with name, code, category, description, UOM, and opening. Remove takes the item out of that department only. Rename or delete the department there; delete is blocked if inventory transactions still use it."],
                ["How do I delete a category?", "Settings → Delete Category. Select the name and type it to confirm. It is blocked if any item, opening, or transaction still uses it. Reassign those on Edit & Delete Item first. There is no edit-category screen."],
                ["How do I switch Light and Dark mode?", "Use the toggle at the bottom of the left sidebar."],
                ["Where is live stock, not the dashboard chart?", "Use Inventory Management (history) or Analysis: Department wise CB / Item wise CB."],
              ].map(([q, a]) => (
                <div key={q} style={box}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: txtPrimary, margin: "0 0 4px" }}>{q}</h4>
                  <p style={{ fontSize: 12, color: txtMuted, margin: 0, lineHeight: 1.6 }}>{a}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
