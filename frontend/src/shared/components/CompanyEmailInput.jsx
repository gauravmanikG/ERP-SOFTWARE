// Email input for company login ids. The domain is fixed on the right; the user types only
// the part before it, e.g. "developer" -> developer@silverseals.com. Any "@..." typed by
// mistake is dropped, so the value can only ever end with @silverseals.com.

export const COMPANY_DOMAIN = "@silverseals.com";

// The part before "@", lower-cased, limited to characters allowed in a login id.
export function toLocalPart(value) {
  const v = (value || "").trim().toLowerCase();
  const at = v.indexOf("@");
  return (at >= 0 ? v.slice(0, at) : v).replace(/[^a-z0-9._-]/g, "");
}

export function CompanyEmailInput({ value, onChange, border, bg, text, sub, leadingIcon = null, placeholder = "name", autoFocus = false, onEnter, autoComplete = "off" }) {
  const local = toLocalPart(value);
  return (
    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${border}`, borderRadius: 10, background: bg, overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
      {leadingIcon && <span style={{ display: "flex", paddingLeft: 12 }}>{leadingIcon}</span>}
      <input
        value={local}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => {
          const next = toLocalPart(e.target.value);
          onChange(next ? next + COMPANY_DOMAIN : "");
        }}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: text, fontSize: 14, padding: "10px 8px", textAlign: "right" }}
      />
      <span style={{ padding: "10px 12px", whiteSpace: "nowrap", color: sub, fontSize: 14, fontWeight: 600, background: "rgba(148,163,184,0.12)", borderLeft: `1px solid ${border}` }}>
        {COMPANY_DOMAIN}
      </span>
    </div>
  );
}
