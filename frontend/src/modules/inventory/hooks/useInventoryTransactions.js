import { useState } from "react";

export function useInventoryTransactions() {
  // Master Lists
  const [departments, setDepartments] = useState([
    "Store Department",
    "Machining Department",
    "Assembly Department",
    "Quality Assurance (QA)",
    "Packaging Department",
    "Dispatch Department",
    "Maintenance Department",
  ]);

  const [categories, setCategories] = useState([
    "Rubber Seals",
    "Gaskets",
    "O-Rings",
    "Hydraulic Seals",
    "Mechanical Seals",
  ]);

  const [groups, setGroups] = useState([
    "Rotary Seals",
    "Pipe Flanges",
    "High Temp Seals",
    "Piston Seals",
    "Precision Seals",
  ]);

  const [uoms, setUoms] = useState(["Pcs", "Box", "Set", "Kg", "Meters", "Rolls"]);

  // Main Code Inventory Master with Department-Wise Stock Breakdown
  const [mainCodes, setMainCodes] = useState([
    {
      code: "MC-1001",
      description: "Oil Seal 45x65x10 Dual Lip Nitrile Rubber",
      category: "Rubber Seals",
      group: "Rotary Seals",
      uom: "Pcs",
      deptStock: {
        "Store Department": 250,
        "Assembly Department": 25,
        "Machining Department": 0,
      },
    },
    {
      code: "MC-1002",
      description: "EPDM Flange Gasket 2 Inch Class 150",
      category: "Gaskets",
      group: "Pipe Flanges",
      uom: "Pcs",
      deptStock: {
        "Store Department": 120,
        "Packaging Department": 15,
      },
    },
    {
      code: "MC-1003",
      description: "Viton High-Temp O-Ring AS568-214 Brown",
      category: "O-Rings",
      group: "High Temp Seals",
      uom: "Pcs",
      deptStock: {
        "Store Department": 500,
        "Dispatch Department": 50,
      },
    },
    {
      code: "MC-1004",
      description: "Hydraulic Rod Seal 50x60x7 PU Material",
      category: "Hydraulic Seals",
      group: "Piston Seals",
      uom: "Set",
      deptStock: {
        "Store Department": 0,
      },
    },
    {
      code: "MC-1005",
      description: "PTFE Spring-Energized Shaft Seal 30x42x7",
      category: "Mechanical Seals",
      group: "Precision Seals",
      uom: "Pcs",
      deptStock: {
        "Store Department": 45,
        "Assembly Department": 10,
      },
    },
    {
      code: "MC-1006",
      description: "Silicon Rubber Gasket Sheet 3mm Red",
      category: "Gaskets",
      group: "High Temp Seals",
      uom: "Rolls",
      deptStock: {
        "Store Department": 15,
      },
    },
  ]);

  // Helper to get stock of a main code in a specific department
  const getDeptStock = (code, deptName) => {
    const item = mainCodes.find((m) => m.code === code);
    if (!item || !item.deptStock) return 0;
    return item.deptStock[deptName] || 0;
  };

  // Helper to get total stock across all departments
  const getTotalCompanyStock = (code) => {
    const item = mainCodes.find((m) => m.code === code);
    if (!item || !item.deptStock) return 0;
    return Object.values(item.deptStock).reduce((acc, qty) => acc + qty, 0);
  };

  // Slip Counters
  const [counters, setCounters] = useState({
    issue: 2,
    receipt: 2,
    reverse: 1,
  });

  // Pre-populated Transaction Logs
  const [transactions, setTransactions] = useState([
    {
      id: "tx-1",
      slipNo: "ISSUE001",
      type: "issue",
      fromDept: "Store Department",
      toDept: "Assembly Department",
      mainCode: "MC-1001",
      description: "Oil Seal 45x65x10 Dual Lip Nitrile Rubber",
      quantity: 25,
      uom: "Pcs",
      fromDeptStockBefore: 275,
      fromDeptStockAfter: 250,
      toDeptStockBefore: 0,
      toDeptStockAfter: 25,
      totalCompanyStock: 275,
      timestamp: new Date(Date.now() - 3600000 * 5).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      status: "COMPLETED",
    },
    {
      id: "tx-2",
      slipNo: "RECEIPT001",
      type: "receipt",
      fromDept: "Supplier / External",
      toDept: "Store Department",
      mainCode: "MC-1003",
      description: "Viton High-Temp O-Ring AS568-214 Brown",
      quantity: 100,
      uom: "Pcs",
      fromDeptStockBefore: 0,
      fromDeptStockAfter: 0,
      toDeptStockBefore: 400,
      toDeptStockAfter: 500,
      totalCompanyStock: 550,
      timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      status: "COMPLETED",
    },
  ]);

  // Helper to generate next guaranteed UNIQUE slip number
  const getSlipNumber = (type) => {
    let prefix = "ISSUE";
    if (type === "receipt") prefix = "RECEIPT";
    if (type === "reverse") prefix = "REV";

    // Scan all existing transactions for the highest numeric suffix matching this prefix
    let maxIndex = 0;
    transactions.forEach((tx) => {
      if (tx.slipNo && tx.slipNo.startsWith(prefix)) {
        const numPart = parseInt(tx.slipNo.replace(prefix, ""), 10);
        if (!isNaN(numPart) && numPart > maxIndex) {
          maxIndex = numPart;
        }
      }
    });

    const nextNum = Math.max(counters[type] || 1, maxIndex + 1);
    const padded = String(nextNum).padStart(3, "0");
    return `${prefix}${padded}`;
  };

  // Submit Transaction Logic with Guaranteed Unique Slip Number
  const submitTransaction = ({ type, fromDept, toDept, mainCode, quantity, notes }) => {
    const qty = Number(quantity);
    if (!type || !fromDept || !toDept || !mainCode || isNaN(qty) || qty <= 0) {
      return { success: false, error: "Please fill all required fields with valid values." };
    }

    if (fromDept === toDept) {
      return { success: false, error: "'From Department' and 'To Department' cannot be the same." };
    }

    const item = mainCodes.find((m) => m.code === mainCode);
    if (!item) {
      return { success: false, error: "Selected Main Code is invalid." };
    }

    const currentFromStock = getDeptStock(mainCode, fromDept);
    const currentToStock = getDeptStock(mainCode, toDept);

    // Validation Logic against From Department stock
    if (type !== "receipt") {
      if (currentFromStock <= 0) {
        return {
          success: false,
          error: `Cannot transfer. '${fromDept}' currently has 0 ${item.uom} of ${item.code} available.`,
        };
      }
      if (qty > currentFromStock) {
        return {
          success: false,
          error: `Entered quantity (${qty} ${item.uom}) exceeds available stock in '${fromDept}' (${currentFromStock} ${item.uom}).`,
        };
      }
    }

    // Auto-generate guaranteed unique slip number
    const currentSlipNo = getSlipNumber(type);

    // Parse prefix to update counter for next slip
    let prefix = "ISSUE";
    if (type === "receipt") prefix = "RECEIPT";
    if (type === "reverse") prefix = "REV";

    const currentNum = parseInt(currentSlipNo.replace(prefix, ""), 10);
    setCounters((prev) => ({ ...prev, [type]: currentNum + 1 }));

    // Calculate new department balances
    let newFromStock = currentFromStock;
    let newToStock = currentToStock;

    if (type === "issue" || type === "reverse") {
      newFromStock = currentFromStock - qty;
      newToStock = currentToStock + qty;
    } else if (type === "receipt") {
      newToStock = currentToStock + qty;
    }

    // Update main code department stock map
    setMainCodes((prev) =>
      prev.map((m) => {
        if (m.code === mainCode) {
          const updatedDeptStock = {
            ...m.deptStock,
            [fromDept]: newFromStock,
            [toDept]: newToStock,
          };
          return { ...m, deptStock: updatedDeptStock };
        }
        return m;
      })
    );

    // Create new transaction log record
    const newRecord = {
      id: `tx-${Date.now()}`,
      slipNo: currentSlipNo,
      type,
      fromDept,
      toDept,
      mainCode: item.code,
      description: item.description,
      quantity: qty,
      uom: item.uom,
      fromDeptStockBefore: currentFromStock,
      fromDeptStockAfter: newFromStock,
      toDeptStockBefore: currentToStock,
      toDeptStockAfter: newToStock,
      totalCompanyStock: getTotalCompanyStock(item.code) + (type === "receipt" ? qty : 0),
      timestamp: new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      status: "COMPLETED",
      notes: notes || "-",
    };

    setTransactions((prev) => [newRecord, ...prev]);

    return {
      success: true,
      slipNo: currentSlipNo,
      message: `Transaction ${currentSlipNo} logged! Shifted ${qty} ${item.uom} from '${fromDept}' to '${toDept}'.`,
    };
  };

  // Master Data Mutators
  const addDepartment = (dept) => {
    if (dept && !departments.includes(dept)) {
      setDepartments((prev) => [...prev, dept.trim()]);
      return true;
    }
    return false;
  };

  const addCategory = (cat) => {
    if (cat && !categories.includes(cat)) {
      setCategories((prev) => [...prev, cat.trim()]);
      return true;
    }
    return false;
  };

  const addGroup = (grp) => {
    if (grp && !groups.includes(grp)) {
      setGroups((prev) => [...prev, grp.trim()]);
      return true;
    }
    return false;
  };

  const addUom = (unit) => {
    if (unit && !uoms.includes(unit)) {
      setUoms((prev) => [...prev, unit.trim()]);
      return true;
    }
    return false;
  };

  const addMainCodeItem = (newItem) => {
    if (newItem.code && !mainCodes.some((m) => m.code === newItem.code)) {
      const initialDept = newItem.initialDept || departments[0] || "Store Department";
      const initBal = Number(newItem.openingBalance) || 0;
      setMainCodes((prev) => [
        ...prev,
        {
          code: newItem.code.trim().toUpperCase(),
          description: newItem.description.trim(),
          category: newItem.category,
          group: newItem.group,
          uom: newItem.uom,
          deptStock: {
            [initialDept]: initBal,
          },
        },
      ]);
      return true;
    }
    return false;
  };

  return {
    departments,
    categories,
    groups,
    uoms,
    mainCodes,
    transactions,
    getDeptStock,
    getTotalCompanyStock,
    getSlipNumber,
    submitTransaction,
    addDepartment,
    addCategory,
    addGroup,
    addUom,
    addMainCodeItem,
  };
}
