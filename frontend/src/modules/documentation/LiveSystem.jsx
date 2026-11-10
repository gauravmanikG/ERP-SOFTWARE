// Live system facts, read from the running backend (GET /api/docs/system) on every visit — never written by hand,
// so they are always exact: API endpoints, database tables, access-control catalog and applied data migrations.
import { useEffect, useMemo, useState } from "react";
import { C } from "./theme";
import { API_BASE } from "../../shared/api/apiBase.js";

const API_ROOT = API_BASE + "/api";

export function useSystemInfo() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_ROOT}/docs/system`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`The backend answered ${r.status}`);
        return r.json();
      })
      .then((data) => !cancelled && setState({ loading: false, data, error: null }))
      .catch((e) => !cancelled && setState({ loading: false, data: null, error: e.message || String(e) }));
    return () => { cancelled = true; };
  }, []);
  return state;
}

export function StatCards({ totals }) {
  if (!totals) return null;
  const cards = [
    ["API endpoints", totals.endpoints],
    ["REST controllers", totals.controllers],
    ["Database tables", totals.tables],
    ["Table columns", totals.columns],
    ["Access-controlled entities", totals.permissionEntities],
    ["Permission keys", totals.permissionKeys]
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
      {cards.map(([label, value]) => (
        <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.accent, lineHeight: 1.1 }}>{Number(value).toLocaleString("en-IN")}</div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

const METHOD_COLORS = { GET: "#059669", POST: "#2563eb", PUT: "#b45309", PATCH: "#7c3aed", DELETE: "#dc2626" };

export function LiveSystem() {
  const { loading, data, error } = useSystemInfo();
  const [tab, setTab] = useState("api");
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.endpointGroups
      .map((g) => ({ ...g, endpoints: g.endpoints.filter((e) => !needle || `${e.method} ${e.path} ${e.controller} ${e.handler}`.toLowerCase().includes(needle)) }))
      .filter((g) => g.endpoints.length > 0);
  }, [data, q]);

  const tables = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.tables.filter((t) => !needle || t.name.toLowerCase().includes(needle));
  }, [data, q]);

  if (loading) return <Note>Reading the live system…</Note>;
  if (error) return <Note bad>Could not read the live system ({error}). Check that the backend is running: open /api/health on this site</Note>;

  const tabs = [
    ["api", `API endpoints (${data.totals.endpoints})`],
    ["db", `Database tables (${data.totals.tables})`],
    ["rbac", `Access control (${data.totals.permissionEntities})`],
    ["migrations", `Data migrations (${data.migrations.length})`]
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ color: C.muted, fontSize: 12 }}>Read from the running backend at {new Date(data.generatedAt).toLocaleString("en-IN")}. Nothing on this page is typed by hand.</div>
      <StatCards totals={data.totals} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            style={{ border: `1px solid ${tab === id ? C.accent : C.border}`, background: tab === id ? C.accentSoft : C.card, color: tab === id ? C.accent : C.text, borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            {label}
          </button>
        ))}
        {(tab === "api" || tab === "db") && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "api" ? "Filter endpoints (path, method, controller)…" : "Filter tables…"}
            style={{ marginLeft: "auto", minWidth: 240, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 13 }} />
        )}
      </div>

      {tab === "api" && groups.map((g) => (
        <details key={g.area} open={!!q} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <summary style={{ cursor: "pointer", padding: "10px 14px", fontWeight: 800, color: C.heading, fontSize: 13.5 }}>
            /api/{g.area} <span style={{ color: C.muted, fontWeight: 600 }}>· {g.endpoints.length} endpoint{g.endpoints.length === 1 ? "" : "s"}</span>
          </summary>
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            {g.endpoints.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 14px", borderBottom: i < g.endpoints.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 12.5 }}>
                <span style={{ width: 58, flexShrink: 0, fontWeight: 800, color: METHOD_COLORS[e.method] || C.muted, fontFamily: "Consolas, monospace" }}>{e.method}</span>
                <span style={{ fontFamily: "Consolas, monospace", color: C.heading, wordBreak: "break-all" }}>{e.path}</span>
                <span style={{ marginLeft: "auto", color: C.muted, whiteSpace: "nowrap" }}>{e.controller}.{e.handler}</span>
              </div>
            ))}
          </div>
        </details>
      ))}

      {tab === "db" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr>{["Table", "Columns", "Rows (approx.)"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {tables.map((t, i) => (
                <tr key={t.name} style={{ background: i % 2 ? C.zebra : C.card }}>
                  <td style={{ ...td, fontFamily: "Consolas, monospace", color: C.heading }}>{t.name}</td>
                  <td style={td}>{t.columns}</td>
                  <td style={td}>{Number(t.approx_rows).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "rbac" && data.permissions.map((m) => (
        <div key={m.module} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 800, color: C.heading, marginBottom: 8 }}>{m.module}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {m.entities.map((e) => (
              <div key={e.entity} style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", fontSize: 12.5 }}>
                <span style={{ minWidth: 230, fontWeight: 700, color: C.text }}>{e.label}</span>
                <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {e.actions.map((a) => <span key={a} style={{ background: C.accentSoft, color: C.accent, borderRadius: 6, padding: "1px 7px", fontWeight: 700, fontSize: 11.5 }}>{a}</span>)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {tab === "migrations" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr>{["Migration", "What it changed", "Rows", "Applied"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.migrations.map((m, i) => (
                <tr key={m.id} style={{ background: i % 2 ? C.zebra : C.card }}>
                  <td style={{ ...td, fontFamily: "Consolas, monospace", color: C.heading, whiteSpace: "nowrap" }}>{m.id}</td>
                  <td style={td}>{m.description}</td>
                  <td style={td}>{m.rows}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{m.appliedAt ? new Date(m.appliedAt).toLocaleDateString("en-IN") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: "left", padding: "8px 12px", background: C.tableHead, color: C.muted, fontSize: 11, fontWeight: 800, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` };
const td = { padding: "7px 12px", color: C.text, borderBottom: `1px solid ${C.border}`, verticalAlign: "top", lineHeight: 1.5 };

function Note({ children, bad }) {
  return <div style={{ padding: 14, borderRadius: 10, background: bad ? C.badSoft : C.card, border: `1px solid ${bad ? C.bad : C.border}`, color: bad ? C.bad : C.muted, fontSize: 13 }}>{children}</div>;
}
