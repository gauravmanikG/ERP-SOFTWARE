import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { applyTheme } from "./shared/utils/theme";
import { loadSettings } from "./shared/utils/settingsStore";
import { AuthGate } from "./modules/auth/AuthGate";

// Settings come from PostgreSQL; load them before the first screen renders so the theme and column widths are correct
loadSettings().finally(() => {
  // Sign-in screens are always light; AuthGate applies the saved theme once someone is signed in.
  applyTheme("light");
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <AuthGate>
        <App />
      </AuthGate>
    </React.StrictMode>
  );
});
