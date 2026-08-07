import { useState, useEffect, useCallback } from "react";
import { api } from "../services/companyApi";
import { CM_BASIC_FIELDS, CM_LEGAL_FIELDS, CM_ADDRESS_FIELDS, CM_TABS, cmEmptyRecord, getNextCompanyCode } from "../data/companyMasterFields";
import { parseAndValidateExcel } from "../../../shared/utils/excel";

const ALL_RECORD_FIELDS = [
  ...CM_BASIC_FIELDS.map((f) => f.key),
  ...CM_LEGAL_FIELDS.map((f) => f.key),
  ...CM_ADDRESS_FIELDS.map((f) => f.key),
  "status",
];

const normalizeVal = (val) => (val === null || val === undefined ? "" : String(val).trim());

const isExactDuplicateRecord = (rec1, rec2) => {
  return ALL_RECORD_FIELDS.every((key) => normalizeVal(rec1[key]) === normalizeVal(rec2[key]));
};

// Shared state + handlers for the Company Master feature, lifted above both
// screens so navigating between them (via the Admin nav or Edit) doesn't
// lose the in-progress form or the records list.
//
// Every save/edit/delete goes straight to the PostgreSQL-backed API in
// /backend (via src/lib/api.js) — see backend/schema.sql for the table.
export function useCompanyMaster() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(cmEmptyRecord([]));
  const [editingId, setEditingId] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState(CM_TABS[0].id);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.list();
      setRecords(rows);
      setForm((f) => {
        if (!f.companyCode || !f.companyCode.startsWith("CMP-")) {
          return { ...f, companyCode: getNextCompanyCode(rows) };
        }
        return f;
      });
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const validateField = (key, val, frm = form) => {
    if (key === "companyCode") {
      if (!val || !String(val).trim()) return "Company Code is required";
      return null;
    }
    if (key === "companyName") {
      if (!val || !String(val).trim()) return "Company Name is required";
      return null;
    }
    if (key === "panNo") {
      if (!val || !String(val).trim()) return "PAN No. is required";
      if (!/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/.test(val)) return "Enter a valid 10-character PAN (e.g. ABCDE1234F)";
      return null;
    }
    if (key === "gstin") {
      if (!val || !String(val).trim()) return "GSTIN is required";
      if (String(val).length !== 15) return "GSTIN must be 15 characters";
      if (/^0+$/.test(val)) return "Enter a realistic GSTIN";
      return null;
    }
    if (key === "registeredOffice") {
      if (!val || !String(val).trim()) return "Registered Office is required";
      return null;
    }
    if (key === "country") {
      if (!val || !String(val).trim()) return "Please select Country";
      return null;
    }
    if (key === "otherCountry") {
      if (frm.country === "Other" && (!val || !String(val).trim())) {
        return "Please specify Country Name";
      }
      return null;
    }
    if (key === "state") {
      if (!frm.country || !String(frm.country).trim()) return "Please select Country first";
      if (!val || !String(val).trim()) {
        return frm.country === "Other" ? "State / Province is required" : "Please select a State";
      }
      return null;
    }
    if (key === "city") {
      if (!val || !String(val).trim()) return "City is required";
      return null;
    }
    if (key === "pinCode") {
      if (!val) return null;
      const isIndia = (frm.country || "").toLowerCase() === "india";
      if (isIndia && !/^[1-9][0-9]{5}$/.test(val)) return "Enter a valid 6-digit PIN code for India";
      return null;
    }
    return null;
  };

  const validateAll = (frm) => {
    const e = {};
    Object.keys(frm).forEach((k) => {
      const msg = validateField(k, frm[k], frm);
      if (msg) e[k] = msg;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (key, val) => {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === "country") {
        if (val === "India") {
          next.otherCountry = "";
        } else if (val === "Other") {
          next.state = "";
        }
      }
      const msg = validateField(key, val, next);
      setErrors((es) => {
        const copy = { ...es };
        if (msg) copy[key] = msg; else delete copy[key];
        delete copy._global;
        return copy;
      });
      return next;
    });
  };

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleChange("logo", reader.result);
    reader.readAsDataURL(file);
  };

  const handleNew = () => {
    setForm(cmEmptyRecord(records));
    setEditingId(null);
    setIsReadOnly(false);
    setActiveTab(CM_TABS[0].id);
    setErrors({});
    showToast("Cleared — enter a new company record");
  };

  const preparePayload = (frm) => {
    const payload = { ...frm };
    if (payload.country === "Other") {
      payload.country = (payload.otherCountry || "").trim();
    }
    delete payload.otherCountry;
    return payload;
  };

  // Returns true on success so the caller (Screen 1) can decide to
  // navigate to the Records screen after a successful save.
  const handleSave = async () => {
    if (!validateAll(form)) {
      showToast("Fix validation errors before saving");
      return false;
    }

    const savePayload = preparePayload(form);

    // Check if an exact duplicate record exists (all fields in Basic Company Info + Address Details + Legal Info match)
    const duplicateExists = records.some((r) => {
      if (editingId && (r.id === editingId || r._id === editingId)) return false;
      return isExactDuplicateRecord(r, savePayload);
    });

    if (duplicateExists) {
      setErrors((es) => ({ ...es, _global: "Record already exists" }));
      showToast("Record already exists");
      return false;
    }

    try {
      let nextRecords = [];
      if (editingId) {
        const updated = await api.update(editingId, savePayload);
        nextRecords = records.map((r) => (r.id === editingId ? updated : r));
        setRecords(nextRecords);
        showToast("Company record updated");
      } else {
        const created = await api.create(savePayload);
        nextRecords = [created, ...records];
        setRecords(nextRecords);
        showToast("Company record saved");
      }
      setForm(cmEmptyRecord(nextRecords));
      setEditingId(null);
      setIsReadOnly(false);
      setActiveTab(CM_TABS[0].id);
      setErrors({});
      return true;
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes("record already exists")) {
        setErrors((es) => ({ ...es, _global: "Record already exists" }));
        showToast("Record already exists");
      } else {
        showToast(`Save failed: ${e.message}`);
      }
      return false;
    }
  };

  const formatRecordForForm = (rec) => {
    const formatted = { ...cmEmptyRecord(), ...rec };
    if (rec.country && rec.country !== "India") {
      formatted.country = "Other";
      formatted.otherCountry = rec.country;
    } else {
      formatted.country = "India";
      formatted.otherCountry = "";
    }
    return formatted;
  };

  // Loads a record into the form's state for editing
  const handleEdit = (rec) => {
    setForm(formatRecordForForm(rec));
    setEditingId(rec.id);
    setIsReadOnly(false);
    setActiveTab(CM_TABS[0].id);
    setErrors({});
  };

  // Loads a record into the form's state in view-only / read-only mode
  const handleViewRecord = (rec) => {
    setForm(formatRecordForForm(rec));
    setEditingId(rec.id);
    setIsReadOnly(true);
    setActiveTab(CM_TABS[0].id);
    setErrors({});
  };

  const handleDelete = async (id) => {
    try {
      await api.remove(id);
      setRecords((rs) => rs.filter((r) => r.id !== id));
      showToast("Company record deleted");
    } catch (e) {
      showToast(`Delete failed: ${e.message}`);
    } finally {
      setConfirmId(null);
    }
  };

  // Client-side filter over whatever's already loaded, so typing feels
  // instant. (api.list(search) also supports server-side search if you'd
  // rather query the DB directly for large record sets.)
  const filtered = records.filter((r) =>
    `${r.companyName} ${r.companyCode}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleImportExcel = async (file) => {
    const result = await parseAndValidateExcel(file, records);
    if (!result.valid) {
      return { success: false, errors: result.errors };
    }

    try {
      const createdRecords = [];
      for (const rec of result.records) {
        const created = await api.create(rec);
        createdRecords.push(created);
      }
      setRecords((rs) => [...createdRecords.reverse(), ...rs]);
      showToast(`Successfully imported ${createdRecords.length} company records!`);
      return { success: true, count: createdRecords.length };
    } catch (e) {
      showToast(`Import save failed: ${e.message}`);
      return { success: false, errors: [`Server save error: ${e.message}`] };
    }
  };

  return {
    records, loading, loadError, form, editingId, isReadOnly, setIsReadOnly, activeTab, setActiveTab, toast,
    search, setSearch, confirmId, setConfirmId,
    handleChange, handleLogo, handleNew, handleSave, handleEdit, handleViewRecord, handleDelete, handleImportExcel,
    filtered,
    errors,
  };
}


