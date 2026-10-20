// MASTER DATE FORMAT for the whole application.
// Every date shown to a user, every date typed by a user and every date in an export uses this format.
// To change the format for the entire app, change DATE_FORMAT.separator here only.
// Stored and API values stay ISO (yyyy-MM-dd); only the displayed/typed form uses DATE_FORMAT.
export const DATE_FORMAT = {
  separator: "-",
  display: "DD-MM-YYYY",
  placeholder: "DD-MM-YYYY"
};

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const pad = (n) => String(n).padStart(2, "0");

const fromParts = (day, month, year) =>
  [pad(day), pad(month), String(year)].join(DATE_FORMAT.separator);

// Parses timestamps from the API. Trims fractional seconds beyond milliseconds, which some browsers reject.
const toDate = (val) => {
  if (val instanceof Date) return val;
  const s = String(val).trim().replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
  return new Date(s);
};

/** Date in the master format. Empty input returns "". Unrecognised input is returned unchanged. */
export function formatDisplayDate(val) {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "string") {
    const s = val.trim();
    // Date-only ISO values are read directly, so no timezone can shift the day
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return fromParts(m[3], m[2], m[1]);
    // Already dd/mm/yyyy or dd-mm-yyyy (any separator): re-express in the master format
    m = s.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/);
    if (m) return fromParts(m[1], m[2], m[3]);
    // Text months such as "06-Oct-2026" (older records)
    m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s](\d{4})/);
    if (m && MONTHS[m[2].toLowerCase()]) return fromParts(m[1], MONTHS[m[2].toLowerCase()], m[3]);
  }
  const d = toDate(val);
  if (isNaN(d.getTime())) return String(val);
  return fromParts(d.getDate(), d.getMonth() + 1, d.getFullYear());
}

/** Master-format date followed by hh:mm AM/PM, in local time, for a timestamp. */
export function formatDisplayDateTime(val) {
  if (val === null || val === undefined || val === "") return "";
  const d = toDate(val);
  if (isNaN(d.getTime())) return String(val);
  const h24 = d.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${fromParts(d.getDate(), d.getMonth() + 1, d.getFullYear())} ${pad(h12)}:${pad(d.getMinutes())} ${h24 < 12 ? "AM" : "PM"}`;
}

/** ISO yyyy-MM-dd to the master display form. Returns "" for empty input. */
export function isoToDisplayDate(iso) {
  if (!iso) return "";
  return formatDisplayDate(iso);
}

/**
 * Master display form (DD-MM-YYYY) to ISO yyyy-MM-dd.
 * Returns "" when the text is incomplete or is not a real calendar date (for example 31-02-2026).
 */
export function displayDateToIso(text) {
  const parts = String(text || "").trim().split(DATE_FORMAT.separator);
  if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) return "";
  const [day, month, year] = parts.map(Number);
  if (!year || month < 1 || month > 12 || day < 1) return "";
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return "";
  return `${String(year)}-${pad(month)}-${pad(day)}`;
}
