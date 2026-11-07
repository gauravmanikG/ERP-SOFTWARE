// Documentation module: everything a new user needs to know about Silver Brain ERP, plus the engineering behind it.
//
// Sections (menu targets docs-<section>, see shared/layout/modulesData.jsx):
//   overview   Getting started — welcome, sign-in, navigation, roles, glossary        (content/guide.js START_HERE)
//   guide      User guide for every screen, built from the live navigation menu       (content/guide.js SCREEN_GUIDE)
//   backend    The backend's engineering highlights + live counts                       (content/backend.js + /api/docs/system)
//   flowcharts Mermaid flowcharts of the system and every workflow                      (content/flowcharts.js)
//   system     Live system: every endpoint, table, permission and migration             (/api/docs/system)
//   whats-new  Change history read from git; refreshes on every commit                  (virtual:docs-changelog)
//
// What updates by itself: the screen catalog (from MODULES_LIST — a new screen appears here at once, flagged
// "Not documented yet" until its guide entry is written), the live system facts and What's new.
// What is written by hand and must be updated with every change: content/*.js (see CLAUDE.md).
import { useMemo, useState } from "react";
import changelog from "virtual:docs-changelog";
import { MODULES_LIST } from "../../shared/layout/modulesData";
import { useCurrentUser } from "../auth/AuthGate";
import { canOpenPage } from "../auth/access";
import { START_HERE, SCREEN_GUIDE, GUIDE_UPDATED } from "./content/guide";
import { BACKEND_INTRO, STACK, HIGHLIGHTS } from "./content/backend";
import { FLOWCHARTS, FLOW_GROUPS } from "./content/flowcharts";
import { DocBlocks } from "./DocBlocks";
import { MermaidChart } from "./MermaidChart";
import { LiveSystem, StatCards, useSystemInfo } from "./LiveSystem";
import { C } from "./theme";

const SECTIONS = [
  { id: "overview", label: "Getting Started", icon: "🚀" },
  { id: "guide", label: "User Guide", icon: "📘" },
  { id: "backend", label: "Backend", icon: "⚙️" },
  { id: "flowcharts", label: "Flowcharts", icon: "🔀" },
  { id: "system", label: "Live System", icon: "📡" },
  { id: "whats-new", label: "What's New", icon: "🆕" }
];

const FLOW_TITLES = Object.fromEntries(FLOWCHARTS.map((f) => [f.id, f.title]));

/** Every built screen in the navigation, grouped by module, in menu order. The Documentation module itself is skipped. */
export function screenCatalog() {
  return MODULES_LIST.filter((m) => m.id !== "documentation").map((mod) => {
    const screens = [];
    const planned = [];
    const seen = new Set();
    const walk = (items, group) => {
      for (const it of items || []) {
        if (it.children) { walk(it.children, it.name); continue; }
        const label = group ? `${group} → ${it.name}` : it.name;
        if (!it.targetPage) { planned.push(label); continue; }
        if (seen.has(it.targetPage)) {
          screens.find((s) => s.page === it.targetPage).alsoAs.push(label);
          continue;
        }
        seen.add(it.targetPage);
        screens.push({ page: it.targetPage, label, alsoAs: [], documented: !!SCREEN_GUIDE[it.targetPage] });
      }
    };
    walk(mod.submodules, null);
    return { id: mod.id, name: mod.name, screens, planned };
  });
}

export function DocumentationPage({ screen = "overview", onNavigate, onBackToHome, onOpenSidebar, sidebarOpen }) {
  const section = SECTIONS.some((s) => s.id === screen) ? screen : "overview";
  const me = useCurrentUser();
  const catalog = useMemo(screenCatalog, []);
  const [guidePage, setGuidePage] = useState(null);
  const [flowId, setFlowId] = useState(FLOWCHARTS[0].id);
  const [startId, setStartId] = useState(START_HERE[0].id);
  const [q, setQ] = useState("");

  const go = (sectionId) => onNavigate && onNavigate(`docs-${sectionId}`);
  const openFlow = (id) => { setFlowId(id); go("flowcharts"); };
  const openGuide = (page) => { setGuidePage(page); go("guide"); };
  const openStart = (id) => { setStartId(id); go("overview"); };

  const results = useMemo(() => search(q, catalog), [q, catalog]);
  const current = SECTIONS.find((s) => s.id === section);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: C.page }}>
      {/* module bar */}
      <div style={{ flexShrink: 0, background: C.bar, borderBottom: `1px solid ${C.barBorder}`, padding: "8px 18px 8px 44px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.accent, width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11 }}>DOC</div>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Documentation</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>/ {current.label}</span>
        </div>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 460 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the documentation — a screen, a rule, a word…"
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid #475569", color: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none" }} />
          {q.trim() && (
            <div style={{ position: "absolute", top: "110%", left: 0, right: 0, zIndex: 50, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 12px 30px rgba(15,23,42,0.18)", maxHeight: 380, overflowY: "auto" }}>
              {results.length === 0 && <div style={{ padding: 12, color: C.muted, fontSize: 13 }}>Nothing found for “{q}”.</div>}
              {results.map((r, i) => (
                <button key={i} type="button"
                  onClick={() => { setQ(""); if (r.kind === "screen") openGuide(r.key); else if (r.kind === "start") openStart(r.key); else if (r.kind === "flow") openFlow(r.key); else go(r.section); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, padding: "8px 12px", cursor: "pointer" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.heading }}>{r.title}</div>
                  <div style={{ fontSize: 11.5, color: C.muted }}>{r.where}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, marginLeft: "auto" }}>
          <button onClick={onOpenSidebar} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>{sidebarOpen ? "Hide menu" : "Menu"}</button>
          <span onClick={onBackToHome} style={{ cursor: "pointer", color: "#60a5fa", textDecoration: "underline" }}>Home</span>
        </div>
      </div>

      {/* section tabs */}
      <div style={{ flexShrink: 0, display: "flex", gap: 4, padding: "8px 18px 0 44px", background: C.card, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => go(s.id)}
            style={{ border: "none", borderBottom: `3px solid ${section === s.id ? C.accent : "transparent"}`, background: "none", color: section === s.id ? C.accent : C.text, padding: "8px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {section === "overview" && <Overview catalog={catalog} startId={startId} setStartId={setStartId} openFlow={openFlow} go={go} />}
        {section === "guide" && <Guide catalog={catalog} page={guidePage} setPage={setGuidePage} openFlow={openFlow} me={me} onNavigate={onNavigate} />}
        {section === "backend" && <Backend />}
        {section === "flowcharts" && <Flowcharts flowId={flowId} setFlowId={setFlowId} />}
        {section === "system" && <Wrap><H1 title="Live System" sub="The running system describes itself: every API endpoint, database table, permission and data migration, read live." /><LiveSystem /></Wrap>}
        {section === "whats-new" && <WhatsNew />}
      </div>
    </div>
  );
}

export default DocumentationPage;

// ====================================================================== sections

function Overview({ catalog, startId, setStartId, openFlow, go }) {
  const built = catalog.reduce((n, m) => n + m.screens.length, 0);
  const documented = catalog.reduce((n, m) => n + m.screens.filter((s) => s.documented).length, 0);
  const planned = catalog.reduce((n, m) => n + m.planned.length, 0);
  const item = START_HERE.find((s) => s.id === startId) || START_HERE[0];
  return (
    <Wrap>
      <div style={{ background: `linear-gradient(135deg, ${C.bar} 0%, #1e3a8a 100%)`, color: "#fff", borderRadius: 16, padding: "22px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#93c5fd", textTransform: "uppercase" }}>Silver Brain ERP · Documentation</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>Everything you need to know, in one place</div>
        <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 6, maxWidth: 760, lineHeight: 1.6 }}>
          Start with the basics below, look up any screen in the User Guide, see how the system works in Flowcharts, and discover the engineering behind it under Backend.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {[["Screens documented", `${documented} / ${built}`], ["Modules", catalog.length], ["Planned screens", planned], ["Flowcharts", FLOWCHARTS.length]].map(([l, v]) => (
            <div key={l} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px" }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{v}</div>
              <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 260px) 1fr", gap: 16, alignItems: "start" }}>
        <SideList items={START_HERE.map((s) => ({ id: s.id, title: s.title, sub: s.summary }))} active={item.id} onPick={setStartId} />
        <Card>
          <H2>{item.title}</H2>
          <DocBlocks blocks={item.blocks} onOpenFlow={openFlow} flowTitles={FLOW_TITLES} />
          <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            <Btn onClick={() => go("guide")}>Open the User Guide →</Btn>
            <Btn ghost onClick={() => go("flowcharts")}>See the flowcharts</Btn>
          </div>
        </Card>
      </div>
    </Wrap>
  );
}

function Guide({ catalog, page, setPage, openFlow, me, onNavigate }) {
  const all = catalog.flatMap((m) => m.screens.map((s) => ({ ...s, module: m.name })));
  const selected = all.find((s) => s.page === page) || all.find((s) => s.documented) || all[0];
  const entry = selected && SCREEN_GUIDE[selected.page];
  const canOpen = selected && canOpenPage(me, selected.page);
  const missing = all.filter((s) => !s.documented);

  return (
    <Wrap>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 290px) 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, position: "sticky", top: 0, maxHeight: "calc(100vh - 170px)", overflowY: "auto" }}>
          {catalog.map((m) => (
            <div key={m.id} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, padding: "8px 8px 4px" }}>{m.name}</div>
              {m.screens.map((s) => (
                <button key={s.page} type="button" onClick={() => setPage(s.page)}
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", background: selected?.page === s.page ? C.navActive : "none", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: selected?.page === s.page ? C.accent : C.text, fontSize: 13, fontWeight: selected?.page === s.page ? 800 : 600 }}>
                  <span style={{ flex: 1 }}>{s.label}</span>
                  {!s.documented && <span title="Not documented yet" style={{ color: C.amber, fontSize: 11 }}>●</span>}
                </button>
              ))}
              {m.planned.length > 0 && (
                <div style={{ fontSize: 11.5, color: "#94a3b8", padding: "2px 8px 4px" }}>Coming soon: {m.planned.join(", ")}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {missing.length > 0 && (
            <div style={{ background: C.amberSoft, border: `1px solid ${C.warnBorder}`, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, color: C.amber }}>
              {missing.length} screen{missing.length === 1 ? " is" : "s are"} in the menu but not documented yet: {missing.map((s) => s.label).join(", ")}.
            </div>
          )}
          {selected && (
            <Card>
              <div style={{ fontSize: 11, fontWeight: 900, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>{selected.module}</div>
              <H2>{entry ? entry.title : selected.label}</H2>
              {entry ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 16 }}>
                    <Fact label="What it is for" value={entry.purpose} />
                    <Fact label="Who uses it" value={entry.who} />
                  </div>
                  <DocBlocks blocks={entry.blocks} onOpenFlow={openFlow} flowTitles={FLOW_TITLES} />
                </>
              ) : (
                <div style={{ color: C.amber, fontSize: 14 }}>This screen is in the menu but its guide has not been written yet.</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
                {canOpen
                  ? <Btn onClick={() => onNavigate && onNavigate(selected.page)}>Open this screen →</Btn>
                  : <span style={{ fontSize: 12.5, color: C.muted }}>You do not have access to open this screen.</span>}
                {selected.alsoAs.length > 0 && <span style={{ fontSize: 12, color: C.muted }}>Also in the menu as: {selected.alsoAs.join(", ")}</span>}
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#94a3b8" }}>Guide updated {GUIDE_UPDATED}</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Wrap>
  );
}

function Backend() {
  const { data } = useSystemInfo();
  return (
    <Wrap>
      <div style={{ background: `linear-gradient(135deg, #0f172a 0%, #312e81 100%)`, color: "#fff", borderRadius: 16, padding: "22px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#a5b4fc", textTransform: "uppercase" }}>Under the hood</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{BACKEND_INTRO.title}</div>
        <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 8, maxWidth: 860, lineHeight: 1.65 }}>{BACKEND_INTRO.text}</div>
      </div>

      {data && <div style={{ marginBottom: 16 }}><StatCards totals={data.totals} /><div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>Live counts, read from the running system just now.</div></div>}

      <Card style={{ marginBottom: 16 }}>
        <H2>Technology stack</H2>
        <DocBlocks blocks={[{ table: { head: ["Layer", "Technology"], rows: STACK } }]} />
      </Card>

      {HIGHLIGHTS.map((g) => (
        <div key={g.group} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, margin: "4px 2px 10px" }}>{g.group}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 12 }}>
            {g.items.map((h) => (
              <Card key={h.title}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.heading }}>{h.title}</div>
                  {h.tag && <span style={{ background: C.goodSoft, color: C.good, fontSize: 10.5, fontWeight: 900, borderRadius: 999, padding: "2px 8px", textTransform: "uppercase" }}>{h.tag}</span>}
                </div>
                <div style={{ fontSize: 14, color: C.accent, fontWeight: 700, lineHeight: 1.5, marginBottom: 10 }}>{h.headline}</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                  {h.points.map((p, i) => <li key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>{p}</li>)}
                </ul>
                {h.files?.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {h.files.map((f) => <code key={f} style={{ fontSize: 11, background: C.zebra, border: `1px solid ${C.border}`, borderRadius: 6, padding: "1px 6px", color: C.muted }}>{f}</code>)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </Wrap>
  );
}

function Flowcharts({ flowId, setFlowId }) {
  const chart = FLOWCHARTS.find((f) => f.id === flowId) || FLOWCHARTS[0];
  return (
    <Wrap>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, position: "sticky", top: 0 }}>
          {FLOW_GROUPS.map((g) => (
            <div key={g.id} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, padding: "8px 8px 4px" }}>{g.title}</div>
              {FLOWCHARTS.filter((f) => f.group === g.id).map((f) => (
                <button key={f.id} type="button" onClick={() => setFlowId(f.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", background: chart.id === f.id ? C.navActive : "none", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: chart.id === f.id ? C.accent : C.text, fontSize: 13, fontWeight: chart.id === f.id ? 800 : 600 }}>
                  {f.title}
                </button>
              ))}
            </div>
          ))}
        </div>
        <Card>
          <H2>{chart.title}</H2>
          <p style={{ margin: "0 0 14px", color: C.text, fontSize: 14, lineHeight: 1.6 }}>{chart.description}</p>
          <MermaidChart code={chart.code} />
        </Card>
      </div>
    </Wrap>
  );
}

function WhatsNew() {
  const commits = changelog.commits || [];
  const byDay = [];
  for (const c of commits) {
    const day = c.date ? new Date(c.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Unknown date";
    const last = byDay[byDay.length - 1];
    if (last && last.day === day) last.items.push(c); else byDay.push({ day, items: [c] });
  }
  return (
    <Wrap>
      <H1 title="What's New" sub={`Every change to the software, newest first — read from the project's history${changelog.branch ? ` (branch ${changelog.branch}, ${changelog.head})` : ""}. This list refreshes by itself whenever a change is committed.`} />
      {commits.length === 0 && <Card><span style={{ color: C.muted }}>No change history is available in this build.</span></Card>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {byDay.map((d) => (
          <div key={d.day}>
            <div style={{ fontSize: 12, fontWeight: 900, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, margin: "0 2px 6px" }}>{d.day}</div>
            <Card>
              {d.items.map((c, i) => (
                <div key={c.hash} style={{ padding: "8px 0", borderBottom: i < d.items.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <code style={{ fontSize: 11.5, color: C.accent, fontWeight: 800 }}>{c.hash}</code>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.heading }}>{c.subject}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.muted }}>{c.author}</span>
                  </div>
                  {c.body && <div style={{ fontSize: 12.5, color: C.text, whiteSpace: "pre-wrap", marginTop: 4, lineHeight: 1.55 }}>{c.body}</div>}
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// ====================================================================== search

function textOf(blocks = []) {
  return blocks.map((b) => [b.p, b.tip, b.warn, ...(b.steps || []), ...(b.list || []), ...(b.rules || []), ...(b.table ? b.table.rows.flat() : [])].filter(Boolean).join(" ")).join(" ");
}

function search(q, catalog) {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits = [];
  const add = (hay, r) => { if (hay.toLowerCase().includes(needle)) hits.push(r); };
  for (const s of START_HERE) add(`${s.title} ${s.summary} ${textOf(s.blocks)}`, { kind: "start", key: s.id, title: s.title, where: "Getting Started" });
  for (const m of catalog) {
    for (const s of m.screens) {
      const e = SCREEN_GUIDE[s.page];
      add(`${s.label} ${e ? `${e.title} ${e.purpose} ${e.who} ${textOf(e.blocks)}` : ""}`, { kind: "screen", key: s.page, title: e ? e.title : s.label, where: `User Guide · ${m.name}` });
    }
  }
  for (const g of HIGHLIGHTS) for (const h of g.items) add(`${h.title} ${h.headline} ${h.points.join(" ")}`, { kind: "section", section: "backend", title: h.title, where: `Backend · ${g.group}` });
  for (const f of FLOWCHARTS) add(`${f.title} ${f.description}`, { kind: "flow", key: f.id, title: f.title, where: "Flowcharts" });
  return hits.slice(0, 30);
}

// ====================================================================== small UI pieces

function Wrap({ children }) {
  return <div style={{ maxWidth: 1360, margin: "0 auto", padding: "18px 22px 40px 44px" }}>{children}</div>;
}
function H1({ title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.heading }}>{title}</div>
      {sub && <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4, lineHeight: 1.55, maxWidth: 900 }}>{sub}</div>}
    </div>
  );
}
function H2({ children }) {
  return <div style={{ fontSize: 19, fontWeight: 900, color: C.heading, margin: "2px 0 12px" }}>{children}</div>;
}
function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 2px rgba(15,23,42,0.04)", ...style }}>{children}</div>;
}
function Fact({ label, value }) {
  return (
    <div style={{ background: C.zebra, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 900, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}
function Btn({ children, onClick, ghost }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: ghost ? C.card : C.accent, color: ghost ? C.accent : "#fff", border: `1px solid ${C.accent}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
      {children}
    </button>
  );
}
function SideList({ items, active, onPick }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8 }}>
      {items.map((it) => (
        <button key={it.id} type="button" onClick={() => onPick(it.id)}
          style={{ display: "block", width: "100%", textAlign: "left", background: active === it.id ? C.navActive : "none", border: "none", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: active === it.id ? C.accent : C.heading }}>{it.title}</div>
          {it.sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{it.sub}</div>}
        </button>
      ))}
    </div>
  );
}
