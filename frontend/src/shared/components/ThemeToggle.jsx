import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../utils/theme";

// Day / night switch shown in the top bar. Switches the whole software.
export default function ThemeToggle() {
  const { dark, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      title={dark ? "Switch to day view" : "Switch to night view"}
      aria-label={dark ? "Switch to day view" : "Switch to night view"}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: "1px solid rgba(148, 163, 184, 0.35)",
        background: dark ? "#1e293b" : "#f8fafc",
        color: dark ? "#fbbf24" : "#475569",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s"
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
