import { useEffect, useState } from "react";
import { getSetting, setSetting } from "./settingsStore";

// Night view (dark theme) for the whole software. The choice is saved in PostgreSQL (app_setting).
// Applying it adds the `dark` class to <html>; index.css turns that class into the night palette.
const SETTING_KEY = "sms_theme";
const EVENT = "sms-theme-change";

export function getTheme() {
  return getSetting(SETTING_KEY, "light") === "dark" ? "dark" : "light";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  setSetting(SETTING_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

// Components read the theme through this hook so every screen switches together
export function useTheme() {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return { theme, dark: theme === "dark", setTheme };
}

