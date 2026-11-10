import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import * as api from "../settings/admin/api";
import { LoginScreen } from "./LoginScreen";
import { ChangePasswordScreen } from "./ChangePasswordScreen";
import { applyTheme, getTheme } from "../../shared/utils/theme";

// Whole-app login gate: nothing inside it renders until a valid session is resolved
// against /api/auth/me (which only succeeds for an ACTIVE row in app_user — see
// AuthService.login/resolve on the backend). Reuses the same token/session plumbing
// the Settings -> Users / Access Control screens already used, so signing in once here
// also signs you into those screens. A session whose account still carries a temporary
// password (must_change_password) is held on ChangePasswordScreen instead of the app.
const CurrentUserContext = createContext(null);
export const useCurrentUser = () => useContext(CurrentUserContext);

export function AuthGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | signedOut | mustChangePassword | signedIn
  const [user, setUser] = useState(null);

  const checkSession = async () => {
    if (!api.getToken()) {
      setStatus("signedOut");
      return;
    }
    try {
      const u = await api.me();
      setUser(u);
      setStatus(u.mustChangePassword ? "mustChangePassword" : "signedIn");
    } catch {
      api.clearToken();
      setStatus("signedOut");
    }
  };

  useEffect(() => { checkSession(); }, []);

  // The sign-in screens have one fixed light design. The saved theme (night view) is shared by everyone, so it must
  // not reach them: its dark-mode rules would turn their text white on the white card (unreadable email, password and
  // headings). The saved theme applies once someone is signed in; signing out returns to the light screens.
  // useLayoutEffect: switch before the browser paints, so there is no flash of the wrong colours.
  useLayoutEffect(() => {
    applyTheme(status === "signedIn" ? getTheme() : "light");
  }, [status]);

  // Any API call answered 401 (session expired / revoked / user deactivated) returns to the login screen.
  useEffect(() => {
    const onExpired = () => { api.clearToken(); setUser(null); setStatus("signedOut"); };
    window.addEventListener("sms:session-expired", onExpired);
    return () => window.removeEventListener("sms:session-expired", onExpired);
  }, []);

  const signOut = async () => {
    try { await api.logout(); } finally { setStatus("signedOut"); setUser(null); }
  };
  const updateUser = (patch) => setUser((u) => ({ ...u, ...patch }));

  if (status === "checking") return <AuthChecking />;
  if (status === "signedOut") return <LoginScreen onSignedIn={checkSession} />;
  if (status === "mustChangePassword") return <ChangePasswordScreen user={user} onDone={checkSession} onSignOut={signOut} />;

  return <CurrentUserContext.Provider value={{ ...user, signOut, updateUser }}>{children}</CurrentUserContext.Provider>;
}

function AuthChecking() {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#fafafa", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.1em" }}>
        <span style={{ color: "#475569" }}>SILVER</span>{" "}
        <span style={{ color: "#c51f28" }}>BRAIN</span>
      </div>
    </div>
  );
}
