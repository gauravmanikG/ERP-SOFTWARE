import { useState, useEffect, useMemo, useRef } from "react";

export function MouldingBOMTransferPage({ dark, isActive }) {
  // Tabs: "form" | "history"
  const [activeTab, setActiveTab] = useState("form");

  // Core options
  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  // Form inputs
  const [fromDeptId, setFromDeptId] = useState("");
  const [toDeptId, setToDeptId] = useState("");
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [slipNumber, setSlipNumber] = useState("");
  const [remarks, setRemarks] = useState("");

  // Item Search Dropdown State
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const itemComboboxRef = useRef(null);

  // Live impact preview state
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', text: '' }

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || (
    typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? ""
      : "https://silver-muller-seals-backend-deploy.onrender.com"
  );

  // Load initial data: departments, categories, master items
  useEffect(() => {
    if (!isActive) return;

    // Load Departments
    fetch(`${apiBase}/api/inventory/departments`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDepartments(data);
        }
      })
      .catch(() => {});

    // Load Categories from category_master
    fetch(`${apiBase}/api/inventory/categories`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {});

    // Load Master Items (ALL items in master)
    fetch(`${apiBase}/api/inventory/master`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
        }
      })
      .catch(() => {});
  }, [isActive, apiBase]);

  // Load History
  const loadHistory = () => {
    setHistoryLoading(true);
    fetch(`${apiBase}/api/inventory/moulding-bom/history`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setHistory(data);
        }
        setHistoryLoading(false);
      })
      .catch(() => {
        setHistoryLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  // Click outside to close Item Combobox
  useEffect(() => {
    function handleClickOutside(e) {
      if (itemComboboxRef.current && !itemComboboxRef.current.contains(e.target)) {
        setIsItemDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered items for Item Search Combobox (Search across ALL item codes and descriptions)
  const filteredMasterItems = useMemo(() => {
    if (!itemSearchQuery.trim()) {
      return items.slice(0, 100);
    }
    const q = itemSearchQuery.toLowerCase().trim();
    const startsWithCode = [];
    const containsCode = [];
    const containsDesc = [];

    for (const item of items) {
      const code = String(item.code || "").toLowerCase();
      const desc = String(item.description || "").toLowerCase();
      if (code.startsWith(q)) {
        startsWithCode.push(item);
      } else if (code.includes(q)) {
        containsCode.push(item);
      } else if (desc.includes(q)) {
        containsDesc.push(item);
      }
    }

    return [...startsWithCode, ...containsCode, ...containsDesc].slice(0, 100);
  }, [itemSearchQuery, items]);

  // Selected item object
  const selectedItemObj = useMemo(() => {
    return items.find((i) => String(i.id) === String(selectedMasterId)) || null;
  }, [selectedMasterId, items]);

  // Handle Item Selection (Step 1: Select Item Code)
  const handleSelectItem = (item) => {
    if (!item) {
      setSelectedMasterId("");
      setItemSearchQuery("");
      setIsItemDropdownOpen(false);
      return;
    }

    setSelectedMasterId(String(item.id));
    setItemSearchQuery(item.code);
    setIsItemDropdownOpen(false);

    // Default category from item if available, or maintain current if valid
    if (item.category && item.category.trim()) {
      setSelectedCategory(item.category.trim());
    }
  };

  // Live impact preview API call
  useEffect(() => {
    if (!fromDeptId || !toDeptId || !selectedMasterId || !quantity || Number(quantity) <= 0) {
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    const payload = {
      fromDepartmentId: Number(fromDeptId),
      toDepartmentId: Number(toDeptId),
      masterId: Number(selectedMasterId),
      category: selectedCategory || (selectedItemObj ? selectedItemObj.category : ""),
      quantity: Number(quantity),
    };

    fetch(`${apiBase}/api/inventory/moulding-bom/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setPreview(data);
        setPreviewLoading(false);
      })
      .catch(() => {
        setPreviewLoading(false);
      });
  }, [fromDeptId, toDeptId, selectedMasterId, selectedCategory, quantity, selectedItemObj, apiBase]);

  // Handle Submit Transfer
  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!fromDeptId || !toDeptId) {
      setFeedback({ type: "error", text: "Please select both Source and Destination departments." });
      return;
    }

    if (fromDeptId === toDeptId) {
      setFeedback({ type: "error", text: "Source and Destination departments cannot be the same." });
      return;
    }

    if (!selectedMasterId) {
      setFeedback({ type: "error", text: "Please select an Item Code to transfer." });
      return;
    }

    if (!selectedCategory) {
      setFeedback({ type: "error", text: "Please select a Category of Item." });
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setFeedback({ type: "error", text: "Quantity must be greater than zero." });
      return;
    }

    setSubmitting(true);
    const payload = {
      fromDepartmentId: Number(fromDeptId),
      toDepartmentId: Number(toDeptId),
      masterId: Number(selectedMasterId),
      category: selectedCategory,
      quantity: Number(quantity),
      slipNumber: slipNumber.trim() || undefined,
      remarks: remarks.trim() || undefined,
    };

    fetch(`${apiBase}/api/inventory/moulding-bom/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) {
          throw new Error(body.message || "Transfer failed.");
        }
        return body;
      })
      .then((res) => {
        setSubmitting(false);
        setFeedback({
          type: "success",
          text: res.message || `Transfer ${res.transactionNumber} completed successfully!`,
          details: res,
        });

        // Reset inputs
        setQuantity("");
        setRemarks("");
        setPreview(null);
      })
      .catch((err) => {
        setSubmitting(false);
        setFeedback({ type: "error", text: err.message || "Failed to process transfer." });
      });
  };

  // Filtered History list
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase().trim();
    return history.filter((h) => {
      const txNum = String(h.transactionNumber || "").toLowerCase();
      const slipNum = String(h.slipNumber || "").toLowerCase();
      const code = String(h.masterCode || "").toLowerCase();
      const desc = String(h.masterDescription || "").toLowerCase();
      const cat = String(h.category || "").toLowerCase();
      const fromDept = String(h.fromDepartmentName || "").toLowerCase();
      const toDept = String(h.toDepartmentName || "").toLowerCase();
      const rem = String(h.remarks || "").toLowerCase();
      return (
        txNum.includes(q) ||
        slipNum.includes(q) ||
        code.includes(q) ||
        desc.includes(q) ||
        cat.includes(q) ||
        fromDept.includes(q) ||
        toDept.includes(q) ||
        rem.includes(q)
      );
    });
  }, [history, historySearch]);

  // Color theme helpers
  const cardBg = dark ? "#1e293b" : "#ffffff";
  const cardBorder = dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)";
  const textColor = dark ? "#f1f5f9" : "#0f172a";
  const subTextColor = dark ? "#94a3b8" : "#64748b";
  const inputBg = dark ? "#0f172a" : "#f8fafc";
  const inputBorder = dark ? "#334155" : "#cbd5e1";

  // Detect FG BOM mode: Source = Finishing and Category = FG
  const selectedFromDept = departments.find((d) => String(d.id) === fromDeptId);
  const fromDeptName = selectedFromDept ? (selectedFromDept.departmentName || selectedFromDept.name || "") : "";
  const isFgBomMode = fromDeptName.toUpperCase().includes("FINISHING") && selectedCategory.toUpperCase() === "FG";

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 50 }}>
      {/* Header Banner */}
      <div
        style={{
          background: isFgBomMode
            ? (dark ? "linear-gradient(135deg, #1e293b 0%, #1a1a2e 100%)" : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)")
            : (dark ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"),
          color: "#ffffff",
          borderRadius: 20,
          padding: "24px 30px",
          marginBottom: 20,
          boxShadow: isFgBomMode
            ? (dark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 24px rgba(124,58,237,0.25)")
            : (dark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 24px rgba(2,132,199,0.25)"),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          transition: "background 0.4s ease",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                background: "rgba(255,255,255,0.2)",
                padding: "3px 10px",
                borderRadius: 20,
                textTransform: "uppercase",
              }}
            >
              {isFgBomMode ? "Finishing Operations" : "Moulding Operations"}
            </span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>
              {isFgBomMode ? "FG Assembly BOM Consumption" : "Rule-based Inventory Allocation"}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
            {isFgBomMode ? "FG BOM Consumption Transfer" : "BOM Moulding Transfer"}
          </h1>
          <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4, maxWidth: 650 }}>
            {isFgBomMode
              ? "Transfer finished goods from Finishing with automatic component consumption (BOM breakdown with metal shell exclusion logic)."
              : "Transfer manufactured components from Moulding with automatic BOM metal shell deductions and item resolution."}
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.12)", padding: "12px 18px", borderRadius: 14, backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, margin: 0 }}>Active Source Dept</p>
          <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: isFgBomMode ? "#c4b5fd" : "#38bdf8" }}>
            {fromDeptName ? fromDeptName.toUpperCase() : "SELECT SOURCE"}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${cardBorder}`, paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setActiveTab("form")}
          style={{
            padding: "10px 22px",
            borderRadius: 12,
            border: "none",
            background: activeTab === "form" ? "#0284c7" : (dark ? "rgba(148,163,184,0.1)" : "#f1f5f9"),
            color: activeTab === "form" ? "#ffffff" : textColor,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s",
          }}
        >
          <span>📝</span>
          <span>BOM Transfer Form</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          style={{
            padding: "10px 22px",
            borderRadius: 12,
            border: "none",
            background: activeTab === "history" ? "#0284c7" : (dark ? "rgba(148,163,184,0.1)" : "#f1f5f9"),
            color: activeTab === "history" ? "#ffffff" : textColor,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s",
          }}
        >
          <span>📋</span>
          <span>Transfer History</span>
        </button>
      </div>

      {/* TAB 1: FORM & PREVIEW */}
      {activeTab === "form" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
          {/* Transfer Form Card */}
          <div
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 20,
              padding: 24,
              boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 800, color: textColor, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0ea5e9" }}></span>
              Transfer Configuration
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Department Selectors */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: subTextColor, display: "block", marginBottom: 6 }}>
                    Source Department
                  </label>
                  <select
                    value={fromDeptId}
                    onChange={(e) => setFromDeptId(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${inputBorder}`,
                      background: inputBg,
                      color: textColor,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <option value="">-- Select Source Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName || d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: subTextColor, display: "block", marginBottom: 6 }}>
                    Destination Department *
                  </label>
                  <select
                    value={toDeptId}
                    onChange={(e) => setToDeptId(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${inputBorder}`,
                      background: inputBg,
                      color: textColor,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <option value="">-- Select Destination --</option>
                    {departments
                      .filter((d) => String(d.id) !== fromDeptId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.departmentName || d.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* STEP 1: ITEM CODE SELECTION FIRST (Searchable Combobox) */}
              <div ref={itemComboboxRef} style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: subTextColor }}>
                    1. Select Item Code * <span style={{ fontSize: 11, fontWeight: 500, color: "#0ea5e9" }}>(Select item first)</span>
                  </label>
                  {selectedMasterId && (
                    <button
                      type="button"
                      onClick={() => handleSelectItem(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Type to search all item codes (e.g. 314, 40151)..."
                    value={itemSearchQuery}
                    onFocus={() => setIsItemDropdownOpen(true)}
                    onChange={(e) => {
                      setItemSearchQuery(e.target.value);
                      setIsItemDropdownOpen(true);
                      if (!e.target.value.trim()) {
                        setSelectedMasterId("");
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: 10,
                      border: `1px solid ${selectedMasterId ? "#0284c7" : inputBorder}`,
                      background: inputBg,
                      color: textColor,
                      fontSize: 13,
                      fontWeight: 600,
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: 0.6, pointerEvents: "none" }}>
                    🔍
                  </span>
                </div>

                {/* Dropdown Menu */}
                {isItemDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      marginTop: 4,
                      maxHeight: 250,
                      overflowY: "auto",
                      background: cardBg,
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 12,
                      boxShadow: dark ? "0 10px 25px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                  >
                    {filteredMasterItems.length === 0 ? (
                      <div style={{ padding: "12px 16px", fontSize: 12, color: subTextColor, textAlign: "center" }}>
                        No items found matching "{itemSearchQuery}"
                      </div>
                    ) : (
                      filteredMasterItems.map((item) => {
                        const isSelected = String(item.id) === String(selectedMasterId);
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: `1px solid ${dark ? "rgba(148,163,184,0.06)" : "#f1f5f9"}`,
                              background: isSelected
                                ? (dark ? "rgba(14,165,233,0.2)" : "rgba(14,165,233,0.1)")
                                : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: isSelected ? "#0ea5e9" : textColor }}>
                                {item.code}
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: subTextColor }}>
                                {item.description || "No description"}
                              </p>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: "2px 6px",
                                  borderRadius: 6,
                                  background: dark ? "rgba(148,163,184,0.15)" : "#e2e8f0",
                                  color: textColor,
                                }}
                              >
                                {item.category || "General"}
                              </span>
                              <p style={{ margin: "2px 0 0", fontSize: 10, color: subTextColor }}>
                                {item.unitOfMeasurement || "NOS"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Selected Item Details Pill */}
                {selectedItemObj && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: dark ? "rgba(14,165,233,0.1)" : "#f0f9ff",
                      border: "1px solid rgba(14,165,233,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, color: textColor }}>Description:</span>{" "}
                      <span style={{ color: subTextColor }}>{selectedItemObj.description}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, color: textColor }}>UOM:</span>{" "}
                      <span style={{ color: "#0ea5e9", fontWeight: 700 }}>{selectedItemObj.unitOfMeasurement || "NOS"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: CATEGORY SELECTION SECOND */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: subTextColor, display: "block", marginBottom: 6 }}>
                  2. Category of Item * <span style={{ fontSize: 11, fontWeight: 500, color: "#0ea5e9" }}>(Select / Confirm Category)</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: 10,
                    border: `1px solid ${selectedCategory ? "#0284c7" : inputBorder}`,
                    background: inputBg,
                    color: textColor,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <option value="">-- Select Category from category_master --</option>
                  {categories.map((c) => {
                    const catName = c.categoryName || c.name;
                    return (
                      <option key={c.id || catName} value={catName}>
                        {catName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity & Slip Number */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: subTextColor, display: "block", marginBottom: 6 }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="e.g. 798"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${inputBorder}`,
                      background: inputBg,
                      color: textColor,
                      fontSize: 13,
                      fontWeight: 700,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: subTextColor, display: "block", marginBottom: 6 }}>
                    Manual Slip Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto MBD-xxxx if blank"
                    value={slipNumber}
                    onChange={(e) => setSlipNumber(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${inputBorder}`,
                      background: inputBg,
                      color: textColor,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: subTextColor, display: "block", marginBottom: 6 }}>
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional transfer notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${inputBorder}`,
                    background: inputBg,
                    color: textColor,
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Feedback Banner */}
              {feedback && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    background: feedback.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                    color: feedback.type === "success" ? "#10b981" : "#ef4444",
                    border: `1px solid ${feedback.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  }}
                >
                  <p style={{ margin: 0 }}>{feedback.text}</p>
                  {feedback.details && feedback.details.transactionNumber && (
                    <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 11, opacity: 0.9 }}>
                      <span>Ref: <strong>{feedback.details.transactionNumber}</strong></span>
                      <span>Slip: <strong>{feedback.details.slipNumber}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || (preview && !preview.valid)}
                style={{
                  marginTop: 6,
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: submitting || (preview && !preview.valid)
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: submitting || (preview && !preview.valid) ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(14,165,233,0.35)",
                  transition: "all 0.2s",
                }}
              >
                {submitting ? "Processing Transfer..." : (isFgBomMode ? "Submit FG BOM Transfer" : "Submit Moulding BOM Transfer")}
              </button>
            </form>
          </div>

          {/* Live Impact Preview Card */}
          <div
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 20,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: textColor, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}></span>
                Live Impact Preview
              </h2>

              {previewLoading && (
                <span style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 700 }}>Calculating...</span>
              )}
            </div>

            {!preview ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 40,
                  textAlign: "center",
                  background: dark ? "rgba(15,231,255,0.02)" : "#f8fafc",
                  borderRadius: 14,
                  border: `1px dashed ${inputBorder}`,
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    background: "rgba(14,165,233,0.1)",
                    color: "#0ea5e9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    marginBottom: 12,
                  }}
                >
                  📊
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: textColor, marginBottom: 4 }}>
                  No Transfer Configured
                </p>
                <p style={{ fontSize: 12, color: subTextColor, maxWidth: 300, margin: 0 }}>
                  Select an Item Code, Category, Destination Department, and Quantity to view expected balance movements.
                </p>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Category Rule Badge */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: dark ? "rgba(14,165,233,0.12)" : "rgba(14,165,233,0.08)",
                    border: "1px solid rgba(14,165,233,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: preview.categoryClassification === "FG_BOM" ? "#7c3aed" : "#0ea5e9", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {preview.categoryClassification === "FG_BOM" ? "FG BOM Rule Applied" : "Category Rule Applied"}
                    </span>
                    <p style={{ fontSize: 13, fontWeight: 800, color: textColor, margin: "2px 0 0" }}>
                      {preview.categoryClassification === "MOULDED" && "MOULDED (Metal Shell Deduction from Moulding)"}
                      {preview.categoryClassification === "O_RING" && "O-RING (No deduction from Moulding)"}
                      {preview.categoryClassification === "STANDARD" && "STANDARD (Direct Item Transfer)"}
                      {preview.categoryClassification === "FG_BOM" && "FG BOM (Component Consumption from Finishing)"}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: preview.categoryClassification === "FG_BOM" ? "#7c3aed" : "#0ea5e9",
                      color: "#ffffff",
                    }}
                  >
                    {preview.categoryClassification}
                  </span>
                </div>

                {/* Validation Error Alert */}
                {!preview.valid && preview.validationError && (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ {preview.validationError}
                  </div>
                )}

                {/* Movements List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: subTextColor, margin: 0, textTransform: "uppercase" }}>
                    Expected Department Stock Adjustments:
                  </p>

                  {preview.movements && preview.movements.map((m, idx) => {
                    const isNegative = m.quantityChange < 0;
                    const isExcluded = m.role === "EXCLUDED";
                    const isDestination = m.role === "DESTINATION";

                    // Color scheme per role
                    let bgColor, borderColor, roleColor, qtyColor;
                    if (isExcluded) {
                      bgColor = dark ? "rgba(148,163,184,0.06)" : "#f8fafc";
                      borderColor = dark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.2)";
                      roleColor = "#94a3b8";
                      qtyColor = "#94a3b8";
                    } else if (isNegative) {
                      bgColor = dark ? "rgba(239,68,68,0.08)" : "#fef2f2";
                      borderColor = "rgba(239,68,68,0.2)";
                      roleColor = "#ef4444";
                      qtyColor = "#ef4444";
                    } else {
                      bgColor = dark ? "rgba(16,185,129,0.08)" : "#f0fdf4";
                      borderColor = "rgba(16,185,129,0.2)";
                      roleColor = "#10b981";
                      qtyColor = "#10b981";
                    }

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          background: bgColor,
                          border: `1px solid ${borderColor}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          opacity: isExcluded ? 0.6 : 1,
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 900,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: roleColor,
                                color: "#ffffff",
                              }}
                            >
                              {isExcluded ? "🔒 EXCLUDED" : m.role}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: isExcluded ? subTextColor : textColor }}>
                              {m.departmentName}
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 900,
                              color: qtyColor,
                              textDecoration: isExcluded ? "line-through" : "none",
                            }}
                          >
                            {isExcluded ? "0" : (isNegative ? "" : "+")}{isExcluded ? "" : m.quantityChange} {m.unitOfMeasurement}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                          <div>
                            <span style={{ fontWeight: 800, color: isExcluded ? subTextColor : textColor }}>{m.itemCode}</span>
                            <span style={{ color: subTextColor, marginLeft: 6 }}>[{m.category}]</span>
                          </div>

                          {!isExcluded && (
                            <div style={{ textAlign: "right" }}>
                              <span style={{ color: subTextColor, fontSize: 11 }}>
                                Stock: {m.availableBalanceBefore} →{" "}
                                <strong style={{ color: isNegative && m.availableBalanceAfter < 0 ? "#ef4444" : textColor }}>
                                  {m.availableBalanceAfter}
                                </strong>
                              </span>
                              {isNegative && m.availableBalanceAfter >= 0 && (
                                <span style={{ marginLeft: 6, fontSize: 10, color: "#10b981", fontWeight: 800 }}>✅</span>
                              )}
                              {isNegative && m.availableBalanceAfter < 0 && (
                                <span style={{ marginLeft: 6, fontSize: 10, color: "#ef4444", fontWeight: 800 }}>❌ Insufficient</span>
                              )}
                            </div>
                          )}
                        </div>

                        {m.note && (
                          <p style={{ fontSize: 11, color: isExcluded ? "#94a3b8" : subTextColor, margin: "2px 0 0", fontStyle: "italic" }}>
                            {m.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Rules Callout */}
                <div
                  style={{
                    marginTop: "auto",
                    padding: 12,
                    borderRadius: 12,
                    background: dark ? "rgba(148,163,184,0.06)" : "#f1f5f9",
                    fontSize: 11,
                    color: subTextColor,
                    lineHeight: 1.4,
                  }}
                >
                  💡 <strong>Rule Summary:</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {preview.categoryClassification === "FG_BOM" ? (
                      <>
                        <li><strong>FG BOM:</strong> Deducts all required components (per BOM ratio × quantity) from Finishing.</li>
                        <li><strong>Exclusion:</strong> If both Moulded and Metal Shell are in the BOM, Metal Shell is NOT deducted (covered by Moulding stage).</li>
                        <li><strong>FG Output:</strong> Adds the Finished Good item to the destination department.</li>
                      </>
                    ) : (
                      <>
                        <li><strong>MOULDED:</strong> Deducts corresponding Metal Shell from Moulding, adds Moulded item to destination.</li>
                        <li><strong>O-RING:</strong> Adds to destination without deducting from Moulding stock.</li>
                        <li><strong>STANDARD:</strong> Deducts selected item from Moulding and adds same item to destination.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRANSFER HISTORY */}
      {activeTab === "history" && (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 20,
            padding: 24,
            boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.05)",
          }}
        >
          {/* Top Bar: Search & Refresh */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: textColor, margin: 0 }}>
                BOM Transfer History
              </h2>
              <p style={{ fontSize: 12, color: subTextColor, margin: "2px 0 0" }}>
                Complete audit trail of all Moulding BOM and FG BOM transactions.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="text"
                placeholder="Search history (Tx#, Item, Dept)..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1px solid ${inputBorder}`,
                  background: inputBg,
                  color: textColor,
                  fontSize: 12,
                  minWidth: 260,
                }}
              />

              <button
                type="button"
                onClick={loadHistory}
                disabled={historyLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: dark ? "rgba(148,163,184,0.15)" : "#e2e8f0",
                  color: textColor,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {historyLoading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
          </div>

          {/* History Table */}
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: subTextColor, fontSize: 13 }}>
              Loading transfer history...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: subTextColor, fontSize: 13 }}>
              No BOM transfer transactions found.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid ${cardBorder}`,
                      color: subTextColor,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "10px 12px" }}>Transaction #</th>
                    <th style={{ padding: "10px 12px" }}>Slip #</th>
                    <th style={{ padding: "10px 12px" }}>Date & Time</th>
                    <th style={{ padding: "10px 12px" }}>From Dept</th>
                    <th style={{ padding: "10px 12px" }}>To Dept</th>
                    <th style={{ padding: "10px 12px" }}>Item Code</th>
                    <th style={{ padding: "10px 12px" }}>Category</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Quantity</th>
                    <th style={{ padding: "10px 12px" }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((tx) => {
                    const dateStr = tx.transactionDate
                      ? new Date(tx.transactionDate).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

                    return (
                      <tr
                        key={tx.id}
                        style={{
                          borderBottom: `1px solid ${dark ? "rgba(148,163,184,0.06)" : "#f1f5f9"}`,
                        }}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: 800, color: "#0ea5e9" }}>
                          {tx.transactionNumber}
                        </td>
                        <td style={{ padding: "10px 12px", color: textColor }}>
                          {tx.slipNumber || "-"}
                        </td>
                        <td style={{ padding: "10px 12px", color: subTextColor, whiteSpace: "nowrap" }}>
                          {dateStr}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: textColor }}>
                          {tx.fromDepartmentName || "-"}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: textColor }}>
                          {tx.toDepartmentName || <span style={{ color: "#ef4444", fontSize: 11 }}>Consumption</span>}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 800, color: textColor }}>
                          {tx.masterCode}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: dark ? "rgba(148,163,184,0.12)" : "#f1f5f9",
                              fontSize: 11,
                              fontWeight: 600,
                              color: textColor,
                            }}
                          >
                            {tx.category || "General"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 900, color: textColor }}>
                          {tx.quantity} {tx.unitOfMeasurement}
                        </td>
                        <td style={{ padding: "10px 12px", color: subTextColor, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.remarks || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
