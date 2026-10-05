import { ChevronLeft } from "lucide-react";
import { settingsTheme } from "./settingsTheme";
import { NotificationRuleForm } from "./NotificationRuleForm";

export function GenerateNotificationPage({ dark, onBack, backLabel = "Back to Settings" }) {
  const t = settingsTheme(dark);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920, paddingBottom: 40 }}>
      <div>
        <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", padding: 0, marginBottom: 10, color: "#0284c7", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <ChevronLeft size={16} /> {backLabel}
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: t.txtPrimary, margin: 0 }}>Generate Notification</h2>
        <p style={{ fontSize: 13, color: t.txtMuted, margin: "6px 0 0" }}>
          Required: item code and category. Set a minimum, a maximum, or both. You can apply one range to all departments, or a different range per department. To change or remove a saved rule, use Edit & Delete Notification.
        </p>
      </div>

      <NotificationRuleForm dark={dark} />
    </div>
  );
}
