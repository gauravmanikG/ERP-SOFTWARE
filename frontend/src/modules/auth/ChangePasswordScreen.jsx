import { useState } from "react";
import { KeyRound, Lock, Eye, EyeOff, LogOut } from "lucide-react";
import * as api from "../settings/admin/api";
import { ParticleField } from "./ParticleField";
import { BrainLogoMark } from "./BrainLogoMark";

/**
 * Blocks the whole app until a user signing in with a temporary/reset password (the
 * app_user.must_change_password flag) sets a real one. Shown by AuthGate in place of
 * both the login screen and the app — there is no way around it but signing out.
 */
export function ChangePasswordScreen({ user, onDone, onSignOut }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!current) { setError("Enter your current password."); return; }
    if (next.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setError("New password and confirmation do not match."); return; }
    if (next === current) { setError("Choose a password different from your current one."); return; }

    setBusy(true);
    setError("");
    try {
      await api.changePassword(current, next);
      await onDone();
    } catch (err) {
      setError(err.message || "Could not change password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, overflow: "hidden", background: "#fafafa",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
      }}
    >
      <ParticleField />

      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ marginBottom: 14 }}>
          <BrainLogoMark size={160} />
        </div>

        <h1 style={{ fontSize: "clamp(20px, 3.4vw, 28px)", fontWeight: 900, margin: 0, color: "#0f172a", textAlign: "center" }}>
          Set a new password
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b", textAlign: "center", maxWidth: 380 }}>
          {user?.name ? `Welcome, ${user.name}. ` : ""}Your account is using a temporary password. Choose your own before continuing.
        </p>

        <form
          onSubmit={submit}
          style={{
            marginTop: 26, width: "min(360px, 90vw)", background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)", border: "1px solid #e2e8f0", borderRadius: 18,
            padding: 26, boxShadow: "0 20px 60px rgba(15,23,42,0.1)", boxSizing: "border-box"
          }}
        >
          <label style={fieldLabel}>Current (temporary) password</label>
          <div style={fieldWrap}>
            <Lock size={16} color="#94a3b8" />
            <input
              type={showCurrent ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••" style={fieldInput} autoComplete="current-password" autoFocus
            />
            <button type="button" onClick={() => setShowCurrent((v) => !v)} style={eyeBtn} tabIndex={-1} title={showCurrent ? "Hide" : "Show"}>
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label style={{ ...fieldLabel, marginTop: 14 }}>New password (min 8 characters)</label>
          <div style={fieldWrap}>
            <KeyRound size={16} color="#94a3b8" />
            <input
              type={showNext ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)}
              placeholder="••••••••" style={fieldInput} autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowNext((v) => !v)} style={eyeBtn} tabIndex={-1} title={showNext ? "Hide" : "Show"}>
              {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label style={{ ...fieldLabel, marginTop: 14 }}>Confirm new password</label>
          <div style={fieldWrap}>
            <KeyRound size={16} color="#94a3b8" />
            <input
              type={showNext ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••" style={fieldInput} autoComplete="new-password"
            />
          </div>

          {error && <div style={{ marginTop: 12, fontSize: 12.5, color: "#b91c1c", fontWeight: 600 }}>{error}</div>}

          <button
            type="submit" disabled={busy}
            style={{
              marginTop: 20, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px 0", borderRadius: 11, border: "none", background: "#c51f28", color: "#fff",
              fontSize: 14, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.75 : 1,
              boxShadow: "0 10px 24px rgba(197,31,40,0.3)", transition: "opacity 0.15s"
            }}
          >
            <KeyRound size={16} /> {busy ? "Updating…" : "Update password & continue"}
          </button>

          <button
            type="button" onClick={onSignOut}
            style={{
              marginTop: 10, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "9px 0", borderRadius: 10, border: "none", background: "transparent", color: "#94a3b8",
              fontSize: 12.5, fontWeight: 600, cursor: "pointer"
            }}
          >
            <LogOut size={14} /> Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}

const fieldLabel = { display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" };
const fieldWrap = { display: "flex", alignItems: "center", gap: 9, border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fff" };
const fieldInput = { flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", background: "transparent" };
const eyeBtn = { border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", display: "flex", padding: 2 };
