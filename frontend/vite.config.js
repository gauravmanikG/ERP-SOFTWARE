import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    open: true,
    proxy: {
      // Forwards frontend fetch("/api/...") calls to the Spring Boot +
      // PostgreSQL backend in /backend during `npm run dev`, so there's no
      // CORS setup needed and no hardcoded backend URL in the frontend code.
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
