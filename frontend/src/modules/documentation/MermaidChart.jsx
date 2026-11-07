// Renders one Mermaid diagram. Mermaid is loaded on first use only (dynamic import), so it never slows down the
// rest of the ERP. If a chart's source has a syntax error, the error and the source are shown instead of a blank box.
import { useEffect, useRef, useState } from "react";
import { C } from "./theme";

let mermaidPromise = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
        themeVariables: {
          primaryColor: "#eff6ff",
          primaryBorderColor: "#2563eb",
          primaryTextColor: "#0f172a",
          lineColor: "#64748b",
          secondaryColor: "#f0fdf4",
          tertiaryColor: "#f8fafc",
          fontSize: "14px"
        },
        flowchart: { curve: "basis", htmlLabels: true, padding: 12 },
        sequence: { mirrorActors: false }
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

let counter = 0;

export function MermaidChart({ code }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    loadMermaid()
      .then(async (mermaid) => {
        const id = `docs-mmd-${++counter}`;
        const { svg } = await mermaid.render(id, code);
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        const el = ref.current.querySelector("svg");
        if (el) { el.style.maxWidth = "100%"; el.style.height = "auto"; }
      })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div style={{ border: `1px solid ${C.bad}`, background: C.badSoft, borderRadius: 10, padding: 12 }}>
        <div style={{ color: C.bad, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>This chart could not be drawn: {error}</div>
        <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", color: C.text }}>{code}</pre>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", minHeight: 80 }}>
      {loading && <div style={{ color: C.muted, fontSize: 13, padding: 12 }}>Drawing chart…</div>}
      <div ref={ref} style={{ display: "flex", justifyContent: "center", overflowX: "auto" }} />
    </div>
  );
}
