import { useEffect, useState } from "react";

// Night view (dark theme) for the whole software. The choice is remembered per browser.
// Applying it adds the `dark` class to <html>; index.css turns that class into the night palette.
const STORAGE_KEY = "sms_theme";
const EVENT = "sms-theme-change";

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable: the theme still applies for this page view
  }
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

// Apply the saved theme as soon as the app loads, before the first screen renders
applyTheme(getTheme());
