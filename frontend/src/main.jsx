import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { applyTheme, getTheme } from "./shared/utils/theme";
import { loadSettings } from "./shared/utils/settingsStore";

// Settings come from PostgreSQL; load them before the first screen renders so the theme and column widths are correct
loadSettings().finally(() => {
  applyTheme(getTheme());
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
