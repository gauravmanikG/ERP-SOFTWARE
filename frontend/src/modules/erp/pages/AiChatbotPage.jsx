import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Key, RefreshCw, AlertCircle, CheckCircle2, BookOpen, Lightbulb } from "lucide-react";

const SYSTEM_KNOWLEDGE_PROMPT = `
You are the official AI Assistant for the Silver Muller Seals ERP System (Manufacturing & Inventory Software).
Your role is to guide users, teach them how to use every feature, and explain all system rules and validation constraints clearly.

KEY SYSTEM RULES & KNOWLEDGE BASE:

1. INVENTORY & STOCK TRANSACTION RULES (from InventoryTransactionService.java):
- Transaction Types:
  * ISSUE: Transfers stock from a department to another department (e.g. Stores to Production).
    - CRITICAL RULE: For ISSUE transactions, the requested quantity CANNOT BE GREATER than the item's current closing balance in the source department (itemReq.quantity <= fromDeptBalance). Attempting to issue more than closing balance throws an InsufficientStockException.
  * RECEIPT: Inward stock delivery from vendors or suppliers directly into department inventory.
  * REVERSE: Reverses a prior transaction slip and adjusts stock balance back.
    - CRITICAL RULE 1: Cannot reverse an already reversed transaction (throws InvalidTransactionException).
    - CRITICAL RULE 2: For RECEIPT reversal, current available balance must be >= receipt quantity.
- Slip Numbering: Auto-generated sequential numbers (TX-ISSUE-2026-001) or custom manual slip numbers.
- Department Closing Balance = Opening Balance + Receipts + Inward Transfers - Issues - Outward Transfers.

2. COMPANY MASTER RULES (from CompanyMaster & companyMasterFields.js):
- Company Code: Auto-generated sequential format CMP-001, CMP-002, CMP-003...
- Required Basic Fields: Company Name (Required), Legal Name, Short Name, Industry, Business Type (default: Manufacturing).
- Required Legal Info:
  * PAN No: Exactly 10 uppercase alphanumeric characters (regex: ^[A-Z]{5}[0-9]{4}[A-Z]{1}$).
  * GSTIN: Exactly 15 characters matching Indian GST standard (regex: ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$).
- Required Address Info: Registered Office, Country (India/Other), State (from 36 Indian States/UTs), City, PIN Code.
  * If Country = "Other", "Specify Country Name" text field is mandatory.
- Screen 1: Form Entry & Excel Batch Upload.
- Screen 2: Records Grid (Filter, Search, Export to Excel, Edit, View Drawer, Delete).

3. EXCEL BATCH IMPORT SPECIFICATIONS:
- Inventory Excel Headers: Must include columns for 'Type' (ISSUE/RECEIPT), 'From Dept', 'Item Code', 'Quantity'.
- Company Master Excel Headers: Must include columns for 'Company Name', 'PAN No', 'GSTIN', 'Registered Office', 'Country', 'State', 'City'.

4. UI & NAVIGATION:
- Sidebar menu: Overview (Dashboard, Reports & Analytics, Notifications), Operations (Entry Forms, Inventory Management), Administration (Users & Roles, Settings), Help & Support (Documentation 📖, AI Chatbot 🤖✨).
- Theme: Supports Light and Dark mode via the sidebar toggle switch.

Always answer concisely, politely, and structure your responses with markdown bullet points and bold text where appropriate.
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
      text: "Hello! I am your **Silver Muller Seals ERP AI Assistant** 🤖✨.\n\nI know all the rules, validation constraints, and workflows of this software. How can I help you today?",
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
    "Why did my material stock issue get rejected?",
    "What are the GSTIN & PAN validation rules?",
    "How do I import Company Master via Excel?",
    "Can I reverse a reversed transaction slip?",
    "How to record a stock inward (RECEIPT)?"
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
            <p style={{ fontSize: 12, opacity: 0.85, margin: "2px 0 0" }}>Powered by Google Gemini &bull; Trained on SMS ERP Rules & Constraints</p>
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
            placeholder="Ask anything about Silver Muller ERP, validation rules, inventory slips..."
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
