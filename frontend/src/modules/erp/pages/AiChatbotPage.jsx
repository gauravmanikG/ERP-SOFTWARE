import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Key, RefreshCw, AlertCircle, CheckCircle2, BookOpen, Lightbulb } from "lucide-react";

const SYSTEM_KNOWLEDGE_PROMPT = `
You are the official Silver Muller Seals ERP assistant. Teach beginners using the CURRENT written user manual (Help → Documentation). Answer only from these rules. Never teach ISSUE, RECEIPT, or REVERSE as transaction types. If someone uses those old names, say they are retired and they must pick a name from the Type dropdown (operation_master), e.g. Material Transfer, Customer Rejection Receipt, Rework.

HOW THE APP IS ORGANISED
- Sidebar: Overview (Dashboard, Reports & Analytics, Notifications), Operations (Entry Forms, Inventory Management), Analysis (Department wise CB, Item wise CB), Administration (Users & Roles, Settings), Help (Documentation, this Chatbot).
- A star (*) means required. Light/Dark mode is the toggle at the bottom of the sidebar.
- Types = operation_master. Categories = category_master. Item codes = material master. On inventory forms, pick from dropdowns.
- Add a new department in Administration → Settings → Department → Generate Department. Required: Department name and Process sequence.
- Edit a department in Settings → Edit & Delete Department. Select the department, then add an existing item (code, category, opening) or create a new item into that department. Remove takes the item out of that department only (not from material master). You can rename the department or delete it if no inventory transactions still use it.
- Add a category in Settings → Add a Category if the item’s category does not exist yet (Category name required). Then add the item.
- Delete a category in Settings → Delete Category. Select the name and type it to confirm. Blocked only if inventory transactions still use it. If it has items or openings but no movements, those openings are removed with the category. Items that existed only in that category (no movements) are removed too.
- Add an item in Settings → Add an Item when the category already exists. Required: Item name, Item code, Category, Description, Unit. Then add opening balance per department (Dept 1 + balance). Use Add another department for more departments without re-entering the item. After save you can still add more department opening balances.
- Edit or delete an item in Settings → Edit & Delete Item. First pick Item code, then Category. Name/description/UOM fill in from the item. The department table is only for that item + category (101 FG is not 101 SPRING). Existing department names are locked; opening and closing quantities are editable. Add department to append a new department with opening 0. Changing category reloads that pair’s departments.
- Reports & Analytics and Users & Roles are “Coming soon”. Live stock is Inventory history or Analysis CB pages.

DASHBOARD
- Welcome / KPI / charts are display snapshots, not live stock. Nothing to fill. Shortcuts jump to Entry Forms or Inventory.

NOTIFICATIONS
- Settings → Generate Notification to create min/max stock alerts. Settings → Edit & Delete Notification to change or remove saved rules. Required: Item code and Category. Optional min and/or max. Optional departments (each can have its own min/max) or All departments. Notifications inbox shows 20 alerts per page with Gmail-style pagination. Bulk delete is at the bottom. Mark read or delete. Cleared means stock is back inside the range.

ENTRY FORMS — COMPANY MASTER
- Screen 1 = form + Excel upload. Screen 2 = saved records (search, view, edit, delete, export). Save is blocked until every red error is fixed.
- Company Code: auto CMP-001, CMP-002… (read-only).
- Required: Company Name; PAN (exactly 10 chars: 5 letters + 4 digits + 1 letter, e.g. ABCDE1234F); GSTIN (exactly 15 characters, not all zeros); Registered Office; Country (India or Other — Other requires a typed country name); State (India: pick from official States/UTs list; Other: type a province); City.
- Optional: Legal Name, Short Name, Industry, Business Type (Excel empty → Manufacturing); CIN, TAN, MSME, IEC and other legal IDs; PIN (if India and filled: 6 digits, must not start with 0).
- Company Excel required columns: Company Name, PAN, GSTIN, Registered Office, Country, State, City. Company Code auto if missing. If any row fails, the whole file is rejected. Do not import duplicates of companies already saved.

INVENTORY MANAGEMENT — FORM
- Header required: Type of Transaction (operation_master), From Department, To Department. Date is today (read-only). Transaction Number is previewed then assigned on save. Slip Number optional.
- Need at least one item row. Each row required: Item Code (search material master), Category of Item (category_master — empty is rejected, no fallback to the item’s master category), Quantity (number greater than 0). Remarks optional.
- Quantity vs closing balance (all types EXCEPT Customer Rejection Receipt): quantity must be > 0 AND must not exceed From Department closing balance for that item + category. If From Dept balance is 0 or less, the form blocks save. The server applies the same check.
- Customer Rejection Receipt is inbound: no From Dept stock check; stock is added. Other types move stock out of From Dept and into To Dept.
- Closing balance = opening (item + category + department) + later movements of that same item and category. Same item code with two categories is tracked separately.
- History tab: saved movements; export Excel/CSV; Clear All (after confirm) deletes every inventory transaction in PostgreSQL.

BOM MOULDING & FG TRANSFER (OPERATIONS → BOM MOULDING TRANSFER)
- Two Engines:
  1. Finishing Operations (Finishing - FG Sheet): Source is FINISHING and Category is FG. Multiplies transfer quantity by each component ratio in fg_bom (up to 29 component categories: Outer Metal Shell, Inner Metal Shell, Spring, Middle Metal Shell, Outer Moulded, Inner Moulded, Middle Moulded, Felt, PTFE, TPU/PU, Brass Washer, Nut, Plastic, Tooted Disc, Foam, Gasket, O-Ring, Lock Washer, Aluminium Washer, SFG, Shims, Pins, Silicon Rubber, Jali).
  - What will subtract: Each component with ratio > 0 is deducted from FINISHING closing balance (Material Transfer, toDepartment=null).
  - CRITICAL Metal Shell Exclusion Rule: If a seal has a Moulded part (e.g. Outer Moulded > 0, Inner Moulded > 0, Middle Moulded > 0), the corresponding Metal Shell was already bonded during moulding. Therefore, OUTER METAL SHELL, INNER METAL SHELL, or MIDDLE METAL SHELL is EXCLUDED (0 deducted) to prevent double deduction. If there is NO moulded counterpart (moulded ratio = 0), the metal shell IS deducted.
  - What will add: +Quantity of the FG item is credited to destination department (BOM FG Transfer Receipt, prefix FGB-xxxx).
  2. Moulding Operations: Source is Moulding (or Category != FG).
  - MOULDED category (Outer/Inner/Middle Moulded): Deducts corresponding Metal Shell from Moulding (Moulding must have stock), and adds Moulded item to destination (BOM Moulding Receipt, prefix MBD-xxxx).
  - O-RING category: Zero deduction from Moulding (rubber O-rings do not consume metal shells); adds O-Ring directly to destination.
  - STANDARD category: Direct 1-to-1 material transfer between departments.
  - Stock validation: All non-excluded components must have sufficient stock in source department or the transfer is rejected.

INVENTORY EXCEL (same required fields as the form and the API)
- Required columns: Type, From Dept, To Dept, Item Code, Quantity (> 0), Category.
- Type must match operation_master (case-insensitive). From/To Dept must match department names. Category must match category_master. Item Code must exist in material master (compared uppercase).
- Optional: Description (from item master if empty), Slip No., Timestamp, Remarks. Header names can vary (Qty, From Department, Type of Transaction, Slip No.); extra words like (Required) or * are ignored.
- Stock (Excel): except Customer Rejection Receipt, if From Dept known closing balance > 0, quantity cannot exceed that balance (item + category).
- Always download a fresh sample template. It includes Field Guidelines plus sheets: Valid Operations, Valid Departments, Valid Categories, Valid Master Items (current dropdown lists).

ANALYSIS
- Department wise CB: pick one department (required). Lists items in that dept: code, name, category, UOM, opening, current quantity (CB). Search table by code, name, or category.
- Item wise CB: pick Item Code AND Category (both required). Shows only departments that hold that item + category (opening or closing greater than zero). Closing = opening plus movements, and is never negative.
- Department wise CB: pick a department. Shows only items whose closing balance in that department is greater than zero. An item is not listed there just because it exists in another department or another category.

FAQ ANSWERS TO USE
- Quantity rejected: for types other than Customer Rejection Receipt, qty must be > 0 and ≤ From Dept CB for that item+category; zero From Dept stock also blocks the form.
- To Dept and Category: required on the form, in Excel, and on the server.
- Cannot invent a new department/type/category/item code.
- Live stock is not the dashboard chart — use Inventory history or Analysis CB.
- Written SOP that says ISSUE/RECEIPT/REVERSE is outdated.

STYLE: beginner-friendly, short, markdown bullets, bold field names. Point users to Help → Documentation for the full tables. Do not invent extra business rules.
`;

export function AiChatbotPage({ dark = false, setPage }) {
  const [apiKey, setApiKey] = useState(() => {
    return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("sms_gemini_api_key") || "";
  });
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState("");
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello — I use the **latest ERP documentation**.\n\nI can explain Inventory (Type, From/To Dept, Category, quantity vs closing balance), Excel import, Company Master, and Analysis CB reports. Types are no longer ISSUE / RECEIPT / REVERSE.\n\nWhat would you like to know?",
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const saveKey = () => {
    if (tempKey.trim()) {
      localStorage.setItem("sms_gemini_api_key", tempKey.trim());
      setApiKey(tempKey.trim());
    }
    setShowKeyModal(false);
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || inputMsg;
    if (!query.trim()) return;

    const userTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const newMsgs = [...messages, { sender: "user", text: query, time: userTime }];
    setMessages(newMsgs);
    if (!textToSend) setInputMsg("");
    setLoading(true);

    if (!apiKey) {
      setTimeout(() => {
        setMessages([
          ...newMsgs,
          {
            sender: "bot",
            text: "⚠️ **Gemini API Key Required**\n\nPlease add your Gemini API Key using the **API Key** button in the top right to start asking questions.",
            time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        setLoading(false);
      }, 600);
      return;
    }

    try {
      // Build conversation contents
      const contents = [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_KNOWLEDGE_PROMPT}\n\nUser Question: ${query}` }]
        }
      ];

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });

      const data = await res.json();
      setLoading(false);

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const botReply = data.candidates[0].content.parts[0].text;
        setMessages(prev => [
          ...prev,
          {
            sender: "bot",
            text: botReply,
            time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else if (data.error) {
        setMessages(prev => [
          ...prev,
          {
            sender: "bot",
            text: `❌ **API Error**: ${data.error.message || "Invalid API response."}`,
            time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: "bot",
            text: "Sorry, I couldn't generate a response right now. Please check your API key or try again.",
            time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch (err) {
      setLoading(false);
      setMessages(prev => [
        ...prev,
        {
          sender: "bot",
          text: `❌ **Network Error**: Unable to connect to Gemini API. (${err.message})`,
          time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  };

  const bgCard = dark ? "#1e293b" : "#ffffff";
  const bdrCard = dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)";
  const txtPrimary = dark ? "#f1f5f9" : "#0f172a";
  const txtMuted = dark ? "#94a3b8" : "#64748b";

  const suggestions = [
    "What fields are required on Inventory Management?",
    "Why was my quantity rejected vs closing balance?",
    "How do I import inventory Excel (Type, To Dept, Category)?",
    "What are the PAN and GSTIN rules?",
    "How do Department wise CB and Item wise CB work?",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 960, margin: "0 auto", height: "calc(100vh - 120px)" }}>
      {/* Header Banner */}
      <div style={{
        borderRadius: 18,
        padding: "18px 24px",
        background: dark ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 4px 20px rgba(14,165,233,0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={22} className="text-amber-300" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.2px" }}>ERP AI Assistant & Rule Guide</h1>
            <p style={{ fontSize: 12, opacity: 0.85, margin: "2px 0 0" }}>Answers match Help → Documentation (current operations, stock, and Excel rules)</p>
          </div>
        </div>

        <button
          onClick={() => { setTempKey(apiKey); setShowKeyModal(true); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            background: apiKey ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)",
            border: `1px solid ${apiKey ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"}`,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          <Key size={14} /> {apiKey ? "API Key Configured" : "Add Gemini API Key"}
        </button>
      </div>

      {/* Suggestion Chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: txtMuted, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
          <Lightbulb size={13} className="text-amber-500" /> Quick Questions:
        </span>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: dark ? "rgba(148,163,184,0.08)" : "#ffffff",
              border: `1px solid ${dark ? "rgba(148,163,184,0.15)" : "#cbd5e1"}`,
              color: dark ? "#38bdf8" : "#0284c7",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s"
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = "#0ea5e9"}
            onMouseOut={e => e.currentTarget.style.borderColor = dark ? "rgba(148,163,184,0.15)" : "#cbd5e1"}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Main Chat Box */}
      <div style={{
        flex: 1,
        background: bgCard,
        border: `1px solid ${bdrCard}`,
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.04)"
      }}>
        {/* Messages List */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: m.sender === "user" ? "flex-end" : "flex-start"
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                maxWidth: "80%",
                flexDirection: m.sender === "user" ? "row-reverse" : "row"
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: m.sender === "user" ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  flexShrink: 0,
                  fontSize: 14,
                  fontWeight: 800
                }}>
                  {m.sender === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div style={{
                  padding: "12px 16px",
                  borderRadius: m.sender === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                  background: m.sender === "user" ? (dark ? "#4338ca" : "#6366f1") : (dark ? "rgba(148,163,184,0.08)" : "#f1f5f9"),
                  color: m.sender === "user" ? "#ffffff" : txtPrimary,
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
                }}>
                  {m.text}
                </div>
              </div>
              <span style={{ fontSize: 10, color: txtMuted, marginTop: 4, padding: "0 42px" }}>{m.time}</span>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: txtMuted, fontSize: 12, padding: "8px 12px" }}>
              <RefreshCw size={16} className="animate-spin text-sky-500" />
              <span>Gemini is thinking and reviewing ERP rules...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: "14px 18px", borderTop: `1px solid ${bdrCard}`, background: dark ? "#0f172a" : "#f8fafc", display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="text"
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Ask about inventory rules, Excel import, company master, or CB reports..."
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${dark ? "rgba(148,163,184,0.2)" : "#cbd5e1"}`,
              background: bgCard,
              color: txtPrimary,
              fontSize: 13,
              outline: "none"
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputMsg.trim()}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
              border: "none",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: loading || !inputMsg.trim() ? "not-allowed" : "pointer",
              opacity: loading || !inputMsg.trim() ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            Send <Send size={15} />
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: bgCard, border: `1px solid ${bdrCard}`, borderRadius: 20, padding: 24, width: 440, maxWidth: "90%" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: txtPrimary, margin: "0 0 8px" }}>🔑 Gemini API Key Configuration</h3>
            <p style={{ fontSize: 12, color: txtMuted, margin: "0 0 16px" }}>
              Enter your Google Gemini API Key below. Key is stored locally in your browser session (`localStorage`).
            </p>

            <input
              type="password"
              value={tempKey}
              onChange={e => setTempKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${dark ? "rgba(148,163,184,0.2)" : "#cbd5e1"}`,
                background: dark ? "#0f172a" : "#fff",
                color: txtPrimary,
                fontSize: 13,
                marginBottom: 18,
                outline: "none"
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowKeyModal(false)}
                style={{ padding: "8px 16px", borderRadius: 10, background: "transparent", border: `1px solid ${bdrCard}`, color: txtMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={saveKey}
                style={{ padding: "8px 18px", borderRadius: 10, background: "#0ea5e9", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
