// Application settings (theme, table column widths, current user) live in PostgreSQL (app_setting).
// They are loaded once at startup, kept in memory, and saved back to the server on every change.
// Nothing is written to localStorage or sessionStorage.

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";
const SETTINGS_API = `${API_ROOT}/settings`;
const GROUPS_API = `${API_ROOT}/inventory/item-groups`;

// Browser copy of the Groups & Subgroups list, moved to PostgreSQL on first start
const LEGACY_GROUPS_KEY = "SMS_OTHER_ITEM_GROUPS_DATA_USER";
// Browser caches of data that now comes from PostgreSQL only; they are discarded
const DISCARDED_KEY = /ITEM_MASTER_DATA|PURCHASE_REQUISITION|ITEM_GROUPS_DATA_VERSION/;

const cache = {};

export function getSetting(key, fallback) {
  return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : fallback;
}

export function setSetting(key, value) {
  cache[key] = value;
  fetch(`${SETTINGS_API}/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value })
  }).catch((e) => console.error(`Setting "${key}" could not be saved:`, e));
}

// Copies anything left in the browser from earlier versions into PostgreSQL, then empties the browser storage.
async function moveLegacyBrowserData() {
  let keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
  } catch {
    return;
  }
  for (const key of keys.filter((k) => k && (k.startsWith("sms_") || k.startsWith("SMS_")))) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      continue;
    }
    try {
      if (key === LEGACY_GROUPS_KEY) {
        const groups = JSON.parse(raw || "null");
        if (Array.isArray(groups)) {
          const res = await fetch(`${GROUPS_API}/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(groups)
          });
          if (!res.ok) continue; // keep the browser copy if the import failed
        }
      } else if (!DISCARDED_KEY.test(key)) {
        let value = raw;
        try {
          value = JSON.parse(raw);
        } catch {
          // plain text value
        }
        await fetch(`${SETTINGS_API}/${encodeURIComponent(key)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value })
        });
      }
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Could not move "${key}" to the database:`, e);
    }
  }
}

// Call once before the first screen renders.
export async function loadSettings() {
  await moveLegacyBrowserData();
  try {
    const res = await fetch(SETTINGS_API);
    if (res.ok) Object.assign(cache, await res.json());
  } catch (e) {
    console.error("Settings could not be loaded from the server:", e);
  }
}
