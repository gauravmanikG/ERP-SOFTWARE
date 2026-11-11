import { useEffect, useRef, useState } from "react";

// Screen history for the whole ERP, kept in the browser's own history (history.pushState), so the header's Back
// button, the browser's Back/Forward buttons, the mouse back button and Alt+Left all move between ERP screens.
// The address in the browser bar never changes; each entry only remembers which screen was open.
//
// An entry is { sms: <screen snapshot>, smsKey, smsIndex, smsUser }. smsIndex counts entries inside the ERP, so Back is
// offered only when there is an earlier ERP screen to return to (never back out of the ERP to another site).

// The history entry the page was loaded with (a refresh keeps it), read once when this file first loads.
const entryAtLoad = window.history.state;
let started = false;

// The screen to show when the ERP first opens: after a page refresh, the screen that was open (for the same user);
// otherwise null (Home). Signing out and in again in the same tab always starts at Home. Pure, so React may call it
// more than once; useScreenHistory marks the start.
export function initialScreen(userId) {
  if (started) return null;
  return entryAtLoad && entryAtLoad.sms && entryAtLoad.smsUser === userId ? entryAtLoad.sms : null;
}

// Records every screen change as a history entry and restores the screen when the user goes back or forward.
// Returns { canGoBack, goBack }.
export function useScreenHistory(snapshot, restore, userId) {
  const key = JSON.stringify(snapshot);
  const [index, setIndex] = useState(() => {
    const st = window.history.state;
    return st && st.smsKey === key && st.smsUser === userId ? st.smsIndex || 0 : 0;
  });
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  useEffect(() => {
    started = true;
    const st = window.history.state;
    if (st && st.smsKey === key && st.smsUser === userId) return; // already the current entry (refresh, back/forward)
    const entry = { sms: JSON.parse(key), smsKey: key, smsUser: userId };
    if (st && st.sms && st.smsUser === userId) {
      const next = (st.smsIndex || 0) + 1;
      window.history.pushState({ ...entry, smsIndex: next }, "");
      setIndex(next);
    } else {
      // First ERP screen in this tab (or a different user signed in): start a fresh ERP history here.
      window.history.replaceState({ ...(st || {}), ...entry, smsIndex: 0 }, "");
      setIndex(0);
    }
  }, [key, userId]);

  useEffect(() => {
    const onPop = (e) => {
      const st = e.state;
      if (!st || !st.sms || st.smsUser !== userId) return;
      setIndex(st.smsIndex || 0);
      restoreRef.current(st.sms);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [userId]);

  return {
    canGoBack: index > 0,
    goBack: () => { if (index > 0) window.history.back(); }
  };
}
