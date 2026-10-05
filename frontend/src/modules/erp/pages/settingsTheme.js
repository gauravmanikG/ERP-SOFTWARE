export const SETTINGS_API = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? ""
    : "https://silver-muller-seals-backend-deploy.onrender.com"
);

export function settingsTheme(dark) {
  return {
    txtPrimary: dark ? "#f1f5f9" : "#0f172a",
    txtMuted: dark ? "#94a3b8" : "#64748b",
    bgCard: dark ? "#1e293b" : "#ffffff",
    bdr: dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)",
    input: {
      width: "100%",
      padding: "11px 14px",
      borderRadius: 12,
      border: `1px solid ${dark ? "rgba(148,163,184,0.25)" : "#cbd5e1"}`,
      background: dark ? "#0f172a" : "#fff",
      color: dark ? "#f1f5f9" : "#0f172a",
      fontSize: 14,
      outline: "none",
    },
  };
}

export function parseApiError(data, fallback) {
  if (!data) return fallback;
  if (data.message) return data.message;
  if (data.details) return Object.values(data.details).join(" ");
  return fallback;
}
