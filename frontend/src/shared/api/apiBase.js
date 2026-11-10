// Where the backend API lives. Every screen builds its URLs from this one value.
//
// Default (empty): calls go to the same origin the page was loaded from ("/api/..."). In `npm run dev` Vite's proxy
// forwards them to the Spring Boot API on :4000 (vite.config.js), so the ERP works from this PC, from another PC on
// the LAN, or behind a reverse proxy without any change. Set VITE_API_URL (e.g. https://erp.example.com) at build time
// only when the API is served from a different host than the frontend.
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
export const API_ROOT = `${API_BASE}/api`;
