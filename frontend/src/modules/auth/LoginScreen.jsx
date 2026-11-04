import { useEffect, useMemo, useState } from "react";
import { LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";
import * as api from "../settings/admin/api";
import { ParticleField } from "./ParticleField";
import { BrainLogoMark } from "./BrainLogoMark";
import { CompanyEmailInput } from "../../shared/components/CompanyEmailInput";

// Every word of the heading types in letter by letter. Colors: rest = black, SILVER = dark grey, BRAIN = red
// (the same red used on the Silver Brain wordmark elsewhere in the app).
// The whole heading types in letter by letter, one word after another.
const HEADING_WORDS = [
  { text: "WELCOME", color: "#0f172a" },
  { text: "TO", color: "#0f172a" },
  { text: "SILVER", color: "#475569" },
  { text: "BRAIN", color: "#c51f28" }
];
const START_DELAY = 0.45;     // s, before the first tail letter animates in
const LETTER_STEP = 0.045;    // s, stagger between letters
const LETTER_DURATION = 0.5;  // s, each letter's own fade/rise

export function LoginScreen({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formReady, setFormReady] = useState(false);

  const tailLetters = useMemo(() => {
    const out = [];
    let idx = 0;
    HEADING_WORDS.forEach((w, wi) => {
      if (wi > 0) out.push({ ch: " ", color: "#0f172a", key: `sp-${idx}`, idx: idx++ });
      [...w.text].forEach((ch, ci) => out.push({ ch, color: w.color, key: `c-${idx}-${ci}`, idx: idx++ }));
    });
    return out;
  }, []);

  useEffect(() => {
    const totalMs = (START_DELAY + tailLetters.length * LETTER_STEP + LETTER_DURATION) * 1000;
    const t = setTimeout(() => setFormReady(true), totalMs);
    return () => clearTimeout(t);
  }, [tailLetters.length]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.login(email.trim(), password);
      onSignedIn && (await onSignedIn());
    } catch (err) {
      setError(err.message || "Invalid email or password.");
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
        <div style={{ marginBottom: 18 }}>
          <BrainLogoMark size={200} />
        </div>

        <h1
          style={{
            fontSize: "clamp(26px, 5vw, 50px)", fontWeight: 900, letterSpacing: "0.01em",
            margin: 0, textAlign: "center", userSelect: "none", lineHeight: 1.15
          }}
        >
          {tailLetters.map((l) => (
            <span
              key={l.key}
              style={{
                display: "inline-block", color: l.color, opacity: 0,
                animation: "sbLetterIn 0.5s ease forwards",
                animationDelay: `${START_DELAY + l.idx * LETTER_STEP}s`
              }}
            >
              {l.ch}
            </span>
          ))}
        </h1>

        <p
          style={{
            margin: "10px 0 0", fontSize: 13, fontWeight: 700, letterSpacing: "0.14em",
            color: "#94a3b8", textTransform: "uppercase", opacity: 0,
            animation: "sbFadeIn 0.8s ease forwards", animationDelay: `${START_DELAY + tailLetters.length * LETTER_STEP + 0.15}s`
          }}
        >
          Where Business Meets Intelligence
        </p>

        <form
          onSubmit={submit}
          style={{
            marginTop: 38, width: "min(360px, 90vw)", background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)", border: "1px solid #e2e8f0", borderRadius: 18,
            padding: 26, boxShadow: "0 20px 60px rgba(15,23,42,0.1)",
            opacity: formReady ? 1 : 0, transform: formReady ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
            pointerEvents: formReady ? "auto" : "none", boxSizing: "border-box"
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 18 }}>Use the email and password set up for your account.</div>

          <label style={fieldLabel}>Email</label>
          <CompanyEmailInput
            value={email} onChange={setEmail} autoFocus autoComplete="username"
            border="#cfd4dc" bg={FIELD_GREY} text="#0f172a" sub="#475569"
            leadingIcon={<Mail size={16} color="#94a3b8" />} placeholder="developer"
            onEnter={() => document.getElementById("sms-login-password")?.focus()}
          />

          <label style={{ ...fieldLabel, marginTop: 14 }}>Password</label>
          <div style={fieldWrap}>
            <Lock size={16} color="#94a3b8" />
            <input
              id="sms-login-password" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" style={fieldInput} autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPwd((v) => !v)} style={eyeBtn} tabIndex={-1} title={showPwd ? "Hide password" : "Show password"}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
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
            <LogIn size={16} /> {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes sbLetterIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sbFadeIn { from { opacity: 0; } to { opacity: 1; } }
        /* Browser autofill would paint these fields blue; keep them light grey */
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px ${FIELD_GREY} inset !important;
          box-shadow: 0 0 0 1000px ${FIELD_GREY} inset !important;
          -webkit-text-fill-color: #0f172a !important;
          caret-color: #0f172a;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}

const fieldLabel = { display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" };
const FIELD_GREY = "#e9ecef";
const fieldWrap = { display: "flex", alignItems: "center", gap: 9, border: "1px solid #cfd4dc", borderRadius: 10, padding: "10px 12px", background: FIELD_GREY };
const fieldInput = { flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", background: "transparent" };
const eyeBtn = { border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", display: "flex", padding: 2 };
