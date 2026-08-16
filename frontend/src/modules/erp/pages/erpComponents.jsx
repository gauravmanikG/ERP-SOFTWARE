import { useState } from "react";
const Ic = {
  Dashboard: () => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>),
  Reports: () => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 17v-6m3 6v-4m3 4v-8M3 21h18" strokeLinecap="round"/></svg>),
  EntryForm: () => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round"/></svg>),
  Inventory: () => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m8 4v10M4 7l8 4 8-4" strokeLinecap="round"/></svg>),
  Users: () => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>),
  Settings: () => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>),
  Bell: () => (<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round"/></svg>),
  Sun: () => (<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/></svg>),
  Moon: () => (<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round"/></svg>),
  Search: () => (<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>),
  ChevL: () => (<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>),
  ChevR: () => (<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>),
  TUp: () => (<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>),
  TDn: () => (<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>),
  Docs: () => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15zM6.5 6H20" strokeLinecap="round"/></svg>),
  Sparkles: () => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121m12.728 0l-2.121-2.121M7.757 7.757L5.636 5.636M12 8a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round"/></svg>),
};
export function Spark({ color, data }) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${40 - ((v - min) / rng) * 36}`).join(" ");
  const gid = "sg" + color.replace("#", "");
  return (
    <svg viewBox="0 0 100 44" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28"/><stop offset="100%" stopColor={color} stopOpacity="0.02"/></linearGradient></defs>
      <polygon points={`0,44 ${pts} 100,44`} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
export function KPICard({ icon, value, label, trend, up, color, dark }) {
  const cm = { indigo:"#6366f1", sky:"#0ea5e9", emerald:"#10b981", amber:"#f59e0b" };
  const ic = cm[color];
  return (
    <div style={{ background: dark?"#1e293b":"#fff", border:`1px solid ${dark?"rgba(148,163,184,0.12)":"rgba(148,163,184,0.2)"}`, borderRadius:20, padding:20, display:"flex", flexDirection:"column", gap:12, position:"relative", overflow:"hidden", boxShadow:dark?"0 4px 24px rgba(0,0,0,0.28)":"0 2px 16px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div style={{ width:40, height:40, borderRadius:12, background:`${ic}1a`, color:ic, display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</div>
        <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20, background:up?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.12)", color:up?"#10b981":"#ef4444", display:"flex", alignItems:"center", gap:3 }}>
          {up?<Ic.TUp/>:<Ic.TDn/>}{trend}
        </span>
      </div>
      <div>
        <p style={{ fontSize:22, fontWeight:900, color:dark?"#f1f5f9":"#0f172a", letterSpacing:"-0.5px", marginBottom:2 }}>{value}</p>
        <p style={{ fontSize:11, color:dark?"#94a3b8":"#64748b", fontWeight:500 }}>{label}</p>
      </div>
      <div style={{ position:"absolute", bottom:0, right:0, width:88, height:50, opacity:0.65 }}>
        <Spark color={ic} data={[30,50,42,65,55,78,70,88]}/>
      </div>
    </div>
  );
}
export function ComingSoon({ title, dark }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:20 }}>
      <div style={{ width:80, height:80, borderRadius:28, background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3" strokeLinecap="round"/></svg>
      </div>
      <div style={{ textAlign:"center" }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:dark?"#f1f5f9":"#0f172a", marginBottom:8 }}>{title}</h2>
        <p style={{ fontSize:13, color:dark?"#64748b":"#94a3b8" }}>This module is under development. Check back soon.</p>
      </div>
      <div style={{ padding:"10px 20px", borderRadius:12, background:"rgba(99,102,241,0.1)", color:"#6366f1", fontSize:13, fontWeight:600 }}>Coming Soon</div>
    </div>
  );
}
export { Ic };
