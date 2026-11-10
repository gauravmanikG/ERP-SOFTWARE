import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import docsChangelog from "./docs-changelog-plugin.js";

export default defineConfig({
  // docsChangelog: git history for Documentation -> What's new (refreshes on every commit in dev).
  plugins: [react(), docsChangelog()],
  // Production build (npm run build -> dist/, served by the backend on :4000). Every screen is its own file (see
  // src/shared/utils/lazyPage.js); the big shared libraries get their own files too, so a release that changes only
  // app code leaves them in the browser cache. All names carry a content hash, so they can be cached for good.
  build: {
    target: "es2022",
    sourcemap: false,
    // The Documentation module's diagram library (loaded only on that screen) is large by nature.
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react", test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: "xlsx", test: /[\\/]node_modules[\\/]xlsx[\\/]/, priority: 20 },
            { name: "icons", test: /[\\/]node_modules[\\/]lucide-react[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
  server: {
    // This PC only by default. SMS_DEV_HOST=0.0.0.0 opens the dev server to other PCs on the network
    // (for real hosting use the backend on :4000, which serves the built ERP itself — docs/hosting.md).
    host: process.env.SMS_DEV_HOST || "127.0.0.1",
    port: 5173,
    // Opens the browser on a manual `npm run dev`; the run-frontend.ps1 supervisor sets SMS_NO_BROWSER_OPEN so a
    // restart does not open a new tab every time.
    open: !process.env.SMS_NO_BROWSER_OPEN,
    proxy: {
      // Forwards frontend fetch("/api/...") calls to the Spring Boot +
      // PostgreSQL backend in /backend during `npm run dev`, so there's no
      // CORS setup needed and no hardcoded backend URL in the frontend code.
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        // To the browser these calls are same-origin, so the backend must not treat them as cross-origin: drop the
        // Origin header. Otherwise the API's CORS check refuses (403) any page address not in its allow-list, e.g.
        // when the ERP is opened as http://<this-pc-ip>:5173.
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => proxyReq.removeHeader("origin"));
        },
      },
    },
  },
});
