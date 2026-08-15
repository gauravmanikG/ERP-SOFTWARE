import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? ""
    : "https://silver-muller-seals-backend-deploy.onrender.com"
);

export function useInventoryTransactions() {
  const [departments, setDepartments] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [previewTransactionNumber, setPreviewTransactionNumber] = useState("ISU-001");
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
      const res = await fetch(`${BASE}/api/inventory/transaction-types`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setTransactionTypes(data);
      }
    } catch (err) {
      console.error("Failed to fetch transaction types", err);
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

  const fetchPreviewTransactionNumber = useCallback(async (typeName = "ISSUE") => {
    try {
      const res = await fetch(`${BASE}/api/inventory/transactions/preview-transaction-number?type=${encodeURIComponent(typeName)}`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        const num = data.transactionNumber || data.slipNumber || "ISU-001";
        setPreviewTransactionNumber(num);
        return num;
      }
    } catch (err) {
      console.error("Failed to fetch preview transaction number", err);
    }
    return "ISU-001";
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchDepartments(),
        fetchTransactionTypes(),
        fetchMasterItems(),
        fetchTransactions(),
        fetchPreviewTransactionNumber("ISSUE"),
      ]);
    } catch (err) {
      setError("Failed to load inventory database records.");
    } finally {
      setLoading(false);
    }
  }, [fetchPreviewTransactionNumber]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

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
      await fetchPreviewTransactionNumber("REVERSE");

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

  const getDeptBalance = (masterId, departmentId) => {
    const item = masterItems.find((m) => String(m.id) === String(masterId));
    if (!item || !item.deptBalances) return item ? item.currentBalance : 0;

    if (item.deptBalances[departmentId] !== undefined) {
      return item.deptBalances[departmentId];
    }
    const deptObj = departments.find((d) => String(d.id) === String(departmentId));
    if (deptObj && item.deptBalances[deptObj.name] !== undefined) {
      return item.deptBalances[deptObj.name];
    }
    return item.currentBalance;
  };

  return {
    departments,
    transactionTypes,
    masterItems,
    transactions,
    previewTransactionNumber,
    previewSlipNumber: previewTransactionNumber,
    loading,
    error,
    getDeptBalance,
    fetchPreviewTransactionNumber,
    fetchPreviewSlipNumber: fetchPreviewTransactionNumber,
    reloadAll,
    submitBatchTransaction,
    submitReverseTransaction,
  };
}
