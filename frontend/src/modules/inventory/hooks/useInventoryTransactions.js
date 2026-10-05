import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? ""
    : "https://silver-muller-seals-backend-deploy.onrender.com"
);

export function useInventoryTransactions(isActive = true) {
  const [departments, setDepartments] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openingBalancesMap, setOpeningBalancesMap] = useState({});
  const [masterItems, setMasterItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [previewTransactionNumber, setPreviewTransactionNumber] = useState("001");

  const fetchOpeningBalances = async () => {
    try {
      const res = await fetch(`${BASE}/api/inventory/opening-balances`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        const map = {};
        data.forEach((ob) => {
          if (ob.itemCode && ob.categoryName && ob.departmentName) {
            const key = `${ob.itemCode.trim().toLowerCase()}::${ob.categoryName.trim().toLowerCase()}::${ob.departmentName.trim().toLowerCase()}`;
            map[key] = Number(ob.openingBalance) || 0;
          }
        });
        setOpeningBalancesMap(map);
      }
    } catch (err) {
      console.error("Failed to fetch opening balances from database", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${BASE}/api/inventory/categories`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories from category_master", err);
    }
  };



  const fetchPreviewTransactionNumber = useCallback(async (typeName = "Material Transfer") => {
    try {
      const res = await fetch(`${BASE}/api/inventory/transactions/preview-transaction-number?type=${encodeURIComponent(typeName)}`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        const num = data.transactionNumber || data.slipNumber || "001";
        setPreviewTransactionNumber(num);
        return num;
      }
    } catch (err) {
      console.error("Failed to fetch preview transaction number", err);
    }
    return "001";
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${BASE}/api/inventory/departments`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchTransactionTypes = async () => {
    try {
      const res = await fetch(`${BASE}/api/inventory/operations`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map((op) => ({
          id: op.id,
          type: op.operationName || op.type,
        }));
        setTransactionTypes(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch operations from operation_master", err);
    }
  };


  const fetchMasterItems = async () => {
    try {
      const res = await fetch(`${BASE}/api/inventory/master`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setMasterItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch material master items", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${BASE}/api/inventory/transactions`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    }
  };


  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchDepartments(),
        fetchTransactionTypes(),
        fetchCategories(),
        fetchOpeningBalances(),
        fetchMasterItems(),
        fetchTransactions(),
        fetchPreviewTransactionNumber("Material Transfer"),
      ]);


    } catch (err) {
      setError("Failed to load inventory database records.");
    } finally {
      setLoading(false);
    }
  }, [fetchPreviewTransactionNumber]);

  useEffect(() => {
    if (!isActive) return;
    reloadAll();
  }, [reloadAll, isActive]);

  // Auto-retry once if a list is still empty after load finished (e.g. cold start)
  useEffect(() => {
    if (loading) return;
    if (departments.length === 0 || transactionTypes.length === 0 || masterItems.length === 0) {
      const timer = setTimeout(() => {
        reloadAll();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [loading, departments.length, transactionTypes.length, masterItems.length, reloadAll]);

  const submitBatchTransaction = async ({ transactionType, fromDepartmentId, toDepartmentId, slipNumber, items, remarks }) => {
    try {
      const payload = {
        transactionType,
        fromDepartmentId: Number(fromDepartmentId),
        toDepartmentId: toDepartmentId ? Number(toDepartmentId) : null,
        slipNumber: slipNumber ? slipNumber.trim() : null,
        remarks: remarks || "",
        items: items.map((it) => ({
          masterId: Number(it.masterId),
          quantity: Number(it.quantity),
          remarks: it.remarks || "",
          category: it.category || "",
        })),
      };

      const res = await fetch(`${BASE}/api/inventory/transactions/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.message || "Failed to create transaction.",
        };
      }

      const generatedTxNum = Array.isArray(data) && data.length > 0
        ? (data[0].transactionNumber || data[0].slipNumber)
        : "Transaction";

      // Refresh live balances, history logs, and transaction number preview
      await fetchMasterItems();
      await fetchTransactions();
      await fetchPreviewTransactionNumber(transactionType);

      return {
        success: true,
        transactionNumber: generatedTxNum,
        message: `Transaction ${generatedTxNum} created successfully! Saved ${items.length} item(s).`,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || "Server error while submitting transaction.",
      };
    }
  };

  const submitReverseTransaction = async ({ targetTransactionId, remarks }) => {
    try {
      const res = await fetch(`${BASE}/api/inventory/transactions/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTransactionId, remarks }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.message || "Failed to reverse transaction.",
        };
      }

      await fetchMasterItems();
      await fetchTransactions();
      await fetchPreviewTransactionNumber("Material Transfer");

      return {
        success: true,
        transactionNumber: data.transactionNumber || data.slipNumber,
        message: `Reversal ${data.transactionNumber || data.slipNumber} created successfully!`,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || "Server error while reversing transaction.",
      };
    }
  };

  const submitExcelTransactions = async (records) => {
    try {
      // Group records by slipNumber or (type + fromDept + toDept) to batch them cleanly
      const groups = {};
      records.forEach((rec, idx) => {
        const groupKey = rec.slipNumber && rec.slipNumber.trim()
          ? `slip_${rec.slipNumber.trim()}`
          : `grp_${rec.type}_${rec.fromDepartmentId}_${rec.toDepartmentId || 'null'}_${idx}`;

        if (!groups[groupKey]) {
          groups[groupKey] = {
            transactionType: rec.type,
            fromDepartmentId: rec.fromDepartmentId,
            toDepartmentId: rec.toDepartmentId || null,
            slipNumber: rec.slipNumber ? rec.slipNumber.trim() : null,
            remarks: rec.remarks || "Bulk Excel Import",
            items: [],
          };
        }
        groups[groupKey].items.push({
          masterId: rec.masterId,
          quantity: rec.quantity,
          remarks: rec.remarks || "",
          category: rec.category || "",
        });
      });

      let savedCount = 0;
      const createdTxNumbers = [];

      for (const group of Object.values(groups)) {
        const res = await fetch(`${BASE}/api/inventory/transactions/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(group),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || `Failed to process batch for ${group.transactionType}`);
        }
        savedCount += group.items.length;
        if (Array.isArray(data) && data.length > 0) {
          createdTxNumbers.push(data[0].transactionNumber || data[0].slipNumber);
        }
      }

      await reloadAll();

      return {
        success: true,
        count: savedCount,
        transactionNumbers: createdTxNumbers,
        message: `Successfully imported and saved ${savedCount} transaction item(s) to PostgreSQL database!`,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || "Failed to save Excel transactions to database.",
      };
    }
  };

  const getDeptBalance = (masterId, departmentId, categoryName) => {
    const item = masterItems.find((m) => String(m.id) === String(masterId));
    if (!item) return 0;

    const deptObj = departments.find((d) => String(d.id) === String(departmentId));
    const deptName = deptObj ? deptObj.name.trim().toLowerCase() : "";

    const code = item.code ? item.code.trim().toLowerCase() : "";
    // Use the EXACT category provided — do NOT fall back to item.category
    // so that each category's balance is tracked independently
    const cat = (categoryName || "").trim().toLowerCase();

    // 1. Base opening balance lookup from openingBalancesMap (keyed by code::category::deptname)
    const key = `${code}::${cat}::${deptName}`;
    let baseBal = openingBalancesMap[key];

    if (baseBal === undefined) {
      // Strict lookup only — no cross-category fallback
      baseBal = 0;
    }

    // 2. Net transactions stock changes — compare by DEPARTMENT NAME (not ID)
    // because transactions store public.department IDs (44=Store, 47=Moulding)
    // but departments dropdown uses department_master IDs (4=Store, 7=Moulding)
    // ALSO filter by category so item 651 FG and 651 OUTER METAL SHELL are tracked separately
    let netTx = 0;
    transactions.forEach((tx) => {
      if (String(tx.masterId) === String(masterId)) {
        // Only count transactions for the SAME category
        const txCat = (tx.category || "").trim().toLowerCase();
        if (cat && txCat && txCat !== cat) return; // skip different category transactions

        const type = (tx.transactionType || "").trim();
        const fromName = (tx.fromDepartmentName || "").trim().toLowerCase();
        const toName = (tx.toDepartmentName || "").trim().toLowerCase();
        const qty = Number(tx.quantity) || 0;

        const isTxInbound = type.toLowerCase() === "customer rejection receipt"
          || type.toLowerCase() === "bom moulding receipt"
          || type.toLowerCase() === "bom transfer receipt"
          || type.toLowerCase() === "bom fg transfer receipt";

        if (isTxInbound) {
          if (toName === deptName || (!toName && fromName === deptName)) {
            netTx += qty;
          }
        } else if (tx.reversedTransactionId) {
          // Reversal of a prior movement is applied by the backend; skip client double-count
        } else {
          if (fromName === deptName) netTx -= qty;
          if (toName === deptName) netTx += qty;
        }
      }
    });

    return baseBal + netTx;
  };




  return {
    departments,
    transactionTypes,
    categories,
    masterItems,

    transactions,
    previewTransactionNumber,
    previewSlipNumber: previewTransactionNumber,
    loading,
    error,
    getDeptBalance,
    fetchPreviewTransactionNumber,
    fetchPreviewSlipNumber: fetchPreviewTransactionNumber,
    clearAllTransactions: async () => {
      try {
        const res = await fetch(`${BASE}/api/inventory/transactions`, { method: "DELETE" });
        if (res.ok) {
          setTransactions([]);
          await reloadAll();
          return { success: true, message: "All transaction history cleared successfully." };
        }
      } catch (err) {
        console.error("Failed to clear transaction history", err);
      }
      return { success: false, error: "Failed to clear history." };
    },
    fetchOpeningBalance: async (itemCode, categoryName) => {
      if (!itemCode || !categoryName) return 0;
      try {
        const res = await fetch(`${BASE}/api/inventory/opening-balances/balance?code=${encodeURIComponent(itemCode)}&category=${encodeURIComponent(categoryName)}`);
        if (res.ok) {
          const data = await res.json();
          return data.openingBalance || 0;
        }
      } catch (err) {
        console.error("Failed to fetch opening balance", err);
      }
      return 0;
    },
    getCategoriesForItemCode: async (itemCode) => {

      if (!itemCode) return [];
      try {
        const res = await fetch(`${BASE}/api/inventory/opening-balances/categories-for-item?code=${encodeURIComponent(itemCode)}`);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Failed to fetch categories for item code", err);
      }
      return [];
    },
    reloadAll,
    submitBatchTransaction,
    submitReverseTransaction,
    submitExcelTransactions,
  };
}


