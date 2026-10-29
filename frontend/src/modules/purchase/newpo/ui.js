// Shared styles and formatters for the New Purchase Order screens.
import { formatDisplayDate } from "../../../shared/utils/dateFormat";

// Dates from some older columns arrive as "2026-10-29 +05:30": keep the date part, then use the master format.
export function shortDate(v) {
  if (v === null || v === undefined || v === "") return "—";
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return formatDisplayDate(m ? m[1] : v) || "—";
}

// Our own company block, used as the default Invoice To and Ship To on every PO.
export const COMPANY_BLOCK = [
  "SILVER MULLER SEALS LLP",
  "413, EPIP, PHASE-3, SECTOR-53, INDUSTRIAL ESTATE, KUNDALI DISTT- SONEPAT, HARYANA-131028",
  "MSME-UDYAM-HR-180034802",
  "email : accounts@silverseals.com",
  "GSTIN/UIN - 06AFBFS8991J1ZC",
  "STATE NAME- HARYANA , CODE -06"
].join("\n");

export const inp ={ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "7px 9px", fontSize: 13, background: "#fff", boxSizing: "border-box" };

export const label = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };

export const btn = (primary) => ({
  background: primary ? "#2563eb" : "#fff",
  color: primary ? "#fff" : "#334155",
  border: primary ? "none" : "1px solid #cbd5e1",
  borderRadius: 6,
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer"
});

export const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, minWidth: 0 };

export const errorBox = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#b91c1c", fontWeight: 600 };

export const th = { padding: "8px 10px", fontWeight: 700, borderBottom: "1px solid #e2e8f0", textAlign: "left", whiteSpace: "nowrap", color: "#475569", background: "#f8fafc" };
export const thRight = { ...th, textAlign: "right" };
export const thCenter = { ...th, textAlign: "center" };

const NUMERIC_HEADER_REGEX = /amount|total|qty|quantity|rate|price|gst|tax|disc|balance|received|ordered|allocated|released|remaining|pending|accepted|rejected|outside|requested|basic|invoiced|outstanding|value|to order|po-by-pr|cost|cgst|sgst|igst|%\b/i;
const EXCLUDE_HEADER_REGEX = /status|date|remark|vendor|department|lifecycle|condition|inspection|by|responsible|description|action|reason|changes|trigger|category|type|slip|challan|invoice no|serial/i;

export function isNumericHeader(h) {
  if (!h || typeof h !== "string") return false;
  const s = h.trim();
  if (EXCLUDE_HEADER_REGEX.test(s) && !/qty|amount|rate|price|total|value|gst|tax/i.test(s)) return false;
  return NUMERIC_HEADER_REGEX.test(s);
}

export function thFor(header) {
  if (/days\s*gap/i.test(header)) return thCenter;
  return isNumericHeader(header) ? thRight : th;
}
export const td = { padding: "7px 10px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };

export const money = (n) => (n === null || n === undefined || n === "" ? "—" : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export const qty = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));

// Units that count whole things must be ordered in whole numbers (the server enforces the same list).
// There is no UoM master with an "allows decimals" flag yet, so the list lives here and in QuantityRules.java.
const COUNTED_UNITS = new Set(["PCS", "PC", "NOS", "NO", "EA", "EACH", "UNIT", "UNITS", "SET", "SETS", "PAIR", "PAIRS",
  "BOX", "BOXES", "PKT", "PACK", "PACKS", "ROLL", "ROLLS", "REAM", "REAMS", "BAG", "BAGS", "BOTTLE", "BOTTLES"]);
export const isCountedUnit = (uom) => !!uom && COUNTED_UNITS.has(String(uom).trim().toUpperCase());
export const qtyStep = (uom) => (isCountedUnit(uom) ? "1" : "0.01");

// Downloads rows as a CSV file. columns: [{ key, label }]. Values are quoted, so commas and quotes are safe.
export function downloadCsv(filename, columns, rows) {
  const cell = (v) => `"${String(v === null || v === undefined ? "" : v).replace(/"/g, '""')}"`;
  const lines = [columns.map((c) => cell(c.label)).join(",")];
  rows.forEach((r) => lines.push(columns.map((c) => cell(r[c.key])).join(",")));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Local calendar date as yyyy-MM-dd (toISOString would give yesterday's date before 05:30 in India).
export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
