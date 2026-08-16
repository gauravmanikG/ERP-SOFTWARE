import { useState } from "react";
import { InventoryTransactionPage } from "../../inventory/pages/InventoryTransactionPage";
import { CompanyMasterFormPage } from "../../company-master/pages/CompanyMasterFormPage";
import { CompanyMasterListPage } from "../../company-master/pages/CompanyMasterListPage";
import { useCompanyMaster } from "../../company-master/hooks/useCompanyMaster";
import { Ic, ComingSoon } from "./erpComponents";
import { DashboardHome } from "./DashboardHome";
import { NotificationsPage } from "./NotificationsPage";
import { DocumentationPage } from "./DocumentationPage";
import { AiChatbotPage } from "./AiChatbotPage";

export function ERPDashboard() {
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [col, setCol] = useState(false);
  const cm = useCompanyMaster();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
  const timeStr = now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
  const bg=dark?"#0f172a":"#f1f5f9", sbg=dark?"#1e293b":"#fff", bdr=dark?"rgba(148,163,184,0.1)":"rgba(148,163,184,0.2)";
  const navGroups=[
    {label:"OVERVIEW",items:[{id:"dashboard",label:"Dashboard",icon:<Ic.Dashboard/>},{id:"reports",label:"Reports & Analytics",icon:<Ic.Reports/>},{id:"notifications",label:"Notifications",icon:<Ic.Bell/>}]},
    {label:"OPERATIONS",items:[{id:"entry-forms",label:"Entry Forms",icon:<Ic.EntryForm/>},{id:"inventory",label:"Inventory Management",icon:<Ic.Inventory/>}]},
    {label:"ADMINISTRATION",items:[{id:"users",label:"Users & Roles",icon:<Ic.Users/>},{id:"settings",label:"Settings",icon:<Ic.Settings/>}]},
    {label:"HELP & SUPPORT",items:[{id:"docs",label:"Documentation 📖",icon:<Ic.Docs/>},{id:"ai-chatbot",label:"AI Chatbot 🤖✨",icon:<Ic.Sparkles/>}]},
  ];
  const titles={
    dashboard:"Dashboard",
    notifications:"Notifications & System Alerts",
    docs:"Documentation & User Manual",
    "ai-chatbot":"AI Assistant & Rule Guide 🤖✨",
    "entry-forms":"Entry Forms · Screen 1",
    "company-master-form":"Entry Forms · Screen 1",
    "company-master-list":"Entry Forms · Screen 2 (Records)",
    "entry-forms-list":"Entry Forms · Screen 2 (Records)",
    inventory:"Inventory Management",
    "inventory-history":"Inventory Management · History",
    reports:"Reports & Analytics",
    users:"Users & Roles",
    settings:"Settings",
  };

  const pages = {
    dashboard: <DashboardHome dark={dark} setPage={setPage} />,
    notifications: <NotificationsPage dark={dark} setPage={setPage} />,
    docs: <DocumentationPage dark={dark} setPage={setPage} />,
    "ai-chatbot": <AiChatbotPage dark={dark} setPage={setPage} />,
    "entry-forms": <CompanyMasterFormPage cm={cm} page={page} setPage={setPage} dark={dark} />,
    "company-master-form": <CompanyMasterFormPage cm={cm} page={page} setPage={setPage} dark={dark} />,
    "company-master-list": <CompanyMasterListPage cm={cm} page={page} setPage={setPage} dark={dark} />,
    "entry-forms-list": <CompanyMasterListPage cm={cm} page={page} setPage={setPage} dark={dark} />,
    inventory: <InventoryTransactionPage defaultTab="form" dark={dark} />,
    "inventory-history": <InventoryTransactionPage defaultTab="history" dark={dark} />,
    reports: <ComingSoon title="Reports & Analytics" dark={dark} />,
    users: <ComingSoon title="Users & Roles" dark={dark} />,
    settings: <ComingSoon title="Settings" dark={dark} />,
  };
  const sb = { position: "sticky", top: 0, height: "100vh" };
  return (
    <div className={dark ? "dark" : ""} style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter','Segoe UI',sans-serif", background: bg, transition: "background 0.3s" }}>
      <aside style={{width:col?64:228,minWidth:col?64:228,background:sbg,borderRight:`1px solid ${bdr}`,display:"flex",flexDirection:"column",transition:"width 0.25s,min-width 0.25s",...sb,overflow:"hidden",boxShadow:dark?"4px 0 24px rgba(0,0,0,0.25)":"4px 0 16px rgba(0,0,0,0.05)",zIndex:50}}>
        <div style={{padding:col?"18px 0":"18px 18px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${bdr}`,minHeight:68,justifyContent:col?"center":"space-between"}}>
          {!col && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14, flexShrink: 0, boxShadow: "0 4px 14px rgba(14,165,233,0.4)" }}>S</div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 13, color: dark ? "#f1f5f9" : "#0f172a", lineHeight: 1.2 }}>Silver Muller</p>
                <p style={{ fontSize: 10, color: "#0ea5e9", fontWeight: 700 }}>v2.4 &middot; plant-01</p>
              </div>
            </div>
          )}
          {col && <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14, boxShadow: "0 4px 14px rgba(14,165,233,0.4)" }}>S</div>}
          {!col&&<button onClick={()=>setCol(true)} style={{background:"none",border:"none",cursor:"pointer",color:dark?"#64748b":"#94a3b8",padding:4}}><Ic.ChevL/></button>}
        </div>
        <nav style={{flex:1,overflowY:"auto",padding:"14px 0",scrollbarWidth:"none"}}>
          {navGroups.map(g=>(
            <div key={g.label} style={{marginBottom:6}}>
              {!col&&<p style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:dark?"#475569":"#94a3b8",padding:"6px 18px 3px"}}>{g.label}</p>}
              {g.items.map(item=>{
                const active=page===item.id;
                return(<button key={item.id} onClick={()=>setPage(item.id)} title={col?item.label:undefined} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:col?"11px 0":"11px 18px",justifyContent:col?"center":"flex-start",background:active?(dark?"rgba(14,165,233,0.18)":"rgba(14,165,233,0.1)"):"transparent",color:active?"#0ea5e9":(dark?"#94a3b8":"#64748b"),border:"none",borderLeft:active?"3px solid #0ea5e9":"3px solid transparent",cursor:"pointer",fontSize:13,fontWeight:active?700:500,transition:"all 0.15s",borderRadius:col?0:"0 12px 12px 0",marginRight:col?0:6}}><span style={{flexShrink:0}}>{item.icon}</span>{!col&&<span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>}</button>);
              })}
            </div>
          ))}
        </nav>
        <div style={{borderTop:`1px solid ${bdr}`,padding:col?"14px 0":"14px 18px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:col?"center":"space-between",marginBottom:12}}>
            {!col&&(<div style={{display:"flex",alignItems:"center",gap:6}}>{dark?<Ic.Moon/>:<Ic.Sun/>}<span style={{fontSize:11,fontWeight:600,color:dark?"#94a3b8":"#64748b"}}>{dark?"Dark":"Light"} mode</span></div>)}
            <button onClick={()=>setDark(d=>!d)} style={{width:38,height:21,borderRadius:11,background:dark?"#0ea5e9":"rgba(148,163,184,0.4)",border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <span style={{position:"absolute",top:2.5,left:dark?19:2.5,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
            </button>
          </div>
          {!col?(<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12,flexShrink:0}}>G</div><div><p style={{fontSize:12,fontWeight:700,color:dark?"#e2e8f0":"#0f172a",lineHeight:1.2}}>Gaurav</p><p style={{fontSize:10,color:dark?"#64748b":"#94a3b8"}}>Plant Admin</p></div></div>)
          :(<div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12,margin:"0 auto"}}>G</div>)}
        </div>
        {col&&<button onClick={()=>setCol(false)} style={{width:"100%",padding:"10px 0",display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",borderTop:`1px solid ${bdr}`,cursor:"pointer",color:dark?"#64748b":"#94a3b8"}}><Ic.ChevR/></button>}
      </aside>
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        <div style={{padding:"18px 24px 4px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:dark?"#475569":"#94a3b8"}}>ERP</span>
            <span style={{color:dark?"#475569":"#cbd5e1"}}>&rsaquo;</span>
            <span style={{fontSize:11,fontWeight:700,color:dark?"#94a3b8":"#64748b"}}>{titles[page]||page}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div 
              onClick={() => setPage("notifications")}
              title="View Notifications"
              style={{position:"relative",cursor:"pointer",color:dark?"#94a3b8":"#64748b"}}
            >
              <Ic.Bell/>
              <span style={{position:"absolute",top:-5,right:-5,width:15,height:15,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>3</span>
            </div>
            <div style={{padding:"6px 14px",borderRadius:10,background:dark?"rgba(148,163,184,0.08)":"#ffffff",border:`1px solid ${dark?"rgba(148,163,184,0.15)":"#e2e8f0"}`,textAlign:"center",boxShadow:dark?"none":"0 1px 3px rgba(0,0,0,0.05)"}}>
              <p style={{fontSize:10,fontWeight:600,color:dark?"#94a3b8":"#64748b",lineHeight:1}}>{timeStr}</p>
              <p style={{fontSize:11,fontWeight:800,color:dark?"#f59e0b":"#b45309",marginTop:1}}>{dateStr}</p>
            </div>
          </div>
        </div>
        <main style={{flex:1,padding:"18px 24px",overflowY:"auto"}}>
          {pages[page]||<ComingSoon title={titles[page]||"Page"} dark={dark}/>}
        </main>
      </div>
    </div>
  );
}
