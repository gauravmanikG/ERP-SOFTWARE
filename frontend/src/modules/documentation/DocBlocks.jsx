// Renders the content blocks used in content/guide.js (paragraph, steps, list, rules, table, tip, warn, flow link).
import { C } from "./theme";

export function DocBlocks({ blocks = [], onOpenFlow, flowTitles = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {blocks.map((b, i) => <Block key={i} b={b} onOpenFlow={onOpenFlow} flowTitles={flowTitles} />)}
    </div>
  );
}

function Block({ b, onOpenFlow, flowTitles }) {
  if (b.p) return <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.65 }}>{b.p}</p>;

  if (b.steps) {
    return (
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {b.steps.map((s, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 12, background: C.accent, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{i + 1}</span>
            <span style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>{s}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (b.list) {
    return (
      <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        {b.list.map((s, i) => <li key={i} style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>{s}</li>)}
      </ul>
    );
  }

  if (b.rules) {
    return (
      <div style={{ background: C.rulesBg, border: `1px solid ${C.rulesBorder}`, borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: C.rulesTitle, marginBottom: 8 }}>
          🛡 Rules the system enforces
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {b.rules.map((s, i) => <li key={i} style={{ color: C.text, fontSize: 13.5, lineHeight: 1.6 }}>{s}</li>)}
        </ul>
      </div>
    );
  }

  if (b.table) {
    return (
      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {b.table.head.map((h, i) => (
                <th key={i} style={{ textAlign: "left", padding: "9px 12px", background: C.tableHead, color: C.muted, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.table.rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? C.zebra : C.card }}>
                {r.map((c, j) => (
                  <td key={j} style={{ padding: "9px 12px", color: j === 0 ? C.heading : C.text, fontWeight: j === 0 ? 700 : 400, borderBottom: `1px solid ${C.border}`, verticalAlign: "top", lineHeight: 1.55 }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (b.tip || b.warn) {
    const warn = !!b.warn;
    return (
      <div style={{ display: "flex", gap: 10, background: warn ? C.warnBg : C.tipBg, border: `1px solid ${warn ? C.warnBorder : C.tipBorder}`, borderRadius: 10, padding: "10px 14px" }}>
        <span style={{ fontSize: 16 }}>{warn ? "⚠️" : "💡"}</span>
        <span style={{ color: C.text, fontSize: 13.5, lineHeight: 1.6 }}>{b.warn || b.tip}</span>
      </div>
    );
  }

  if (b.flow) {
    return (
      <button type="button" onClick={() => onOpenFlow && onOpenFlow(b.flow)}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.accent}`, color: C.accent, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        ⤷ See the flowchart: {flowTitles[b.flow] || b.flow}
      </button>
    );
  }
  return null;
}
