import { lazy } from "react";

// Screens are loaded on first open instead of all at start-up (the production build splits each into its own file).
//
// After a new release the old script files are gone from the server. A browser tab opened before the release still
// asks for the old file of a screen it has not opened yet; that load fails. The tab then reloads once to pick up the
// new release (the page itself is never cached). If the screen still cannot load, the error goes to ScreenBoundary.
const RELOAD_KEY = "sms-screen-reload";

function reloadedAlready() {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === "1") return true;
    sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    return true; // no session storage: never risk a reload loop
  }
  return false;
}

export function lazyPage(load, exportName) {
  return lazy(() =>
    load().then(
      (module) => {
        try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ }
        return { default: module[exportName] };
      },
      (error) => {
        if (!reloadedAlready()) {
          window.location.reload();
          return new Promise(() => {}); // the page is reloading
        }
        throw error;
      }
    )
  );
}
