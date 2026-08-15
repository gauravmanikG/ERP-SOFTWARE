import { Ic, Spark, KPICard, ComingSoon } from "./erpComponents";
function Donut({ dark }) {
  const segs=[{pct:40,color:"#6366f1",label:"Raw Material"},{pct:25,color:"#0ea5e9",label:"Spare Parts"},{pct:20,color:"#10b981",label:"Consumables"},{pct:15,color:"#f59e0b",label:"Other"}];
  let cum=0; const r=68,cx=90,cy=90;
  const arcs=segs.map(s=>{const a1=(cum/100)*Math.PI*2-Math.PI/2; cum+=s.pct; const a2=(cum/100)*Math.PI*2-Math.PI/2; return(<path key={s.label} d={`M${cx},${cy} L${cx+r*Math.cos(a1)},${cy+r*Math.sin(a1)} A${r},${r} 0 ${s.pct>50?1:0},1 ${cx+r*Math.cos(a2)},${cy+r*Math.sin(a2)} Z`} fill={s.color} stroke={dark?"#1e293b":"#fff"} strokeWidth="3"/>);});
  return(
    <div style={{display:"flex",alignItems:"center",gap:20}}>
      <div style={{position:"relative",flexShrink:0}}>
        <svg viewBox="0 0 180 180" width="115" height="115">{arcs}<circle cx="90" cy="90" r="40" fill={dark?"#1e293b":"#fff"}/></svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:10,fontWeight:700,color:dark?"#94a3b8":"#64748b"}}>Total</span>
          <span style={{fontSize:14,fontWeight:800,color:dark?"#f1f5f9":"#0f172a"}}>5 Cat</span>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {segs.map(s=>(<div key={s.label} style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/><span style={{fontSize:11,color:dark?"#94a3b8":"#64748b"}}>{s.label}</span><span style={{fontSize:11,fontWeight:700,color:dark?"#e2e8f0":"#334155",marginLeft:"auto"}}>{s.pct}%</span></div>))}
      </div>
    </div>
  );
}
function TrendChart({ dark }) {
  const prod=[420,380,460,440,500,480,520,490,560,540,580,610,590,640];
  const target=[450,450,470,470,490,490,510,510,530,530,560,560,580,580];
  const all=[...prod,...target]; const max=Math.max(...all),min=Math.min(...all)-30,rng=max-min;
  const toY=v=>112-((v-min)/rng)*102; const toX=i=>10+(i/13)*420;
  const pPts=prod.map((v,i)=>`${toX(i)},${toY(v)}`).join(" "); const tPts=target.map((v,i)=>`${toX(i)},${toY(v)}`).join(" ");
  const gc=dark?"rgba(148,163,184,0.1)":"rgba(148,163,184,0.25)"; const tc=dark?"#64748b":"#94a3b8";
  return(
    <div>
      <svg viewBox="0 0 440 122" style={{width:"100%",height:122}}>
        <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0.02"/></linearGradient></defs>
        {[0,1,2,3].map(i=><line key={i} x1="10" x2="430" y1={7+i*30} y2={7+i*30} stroke={gc} strokeWidth="1"/>)}
        {prod.map((_,i)=><text key={i} x={toX(i)} y="121" textAnchor="middle" fontSize="8" fill={tc}>{i+1}</text>)}
        <polygon points={`10,112 ${pPts} ${toX(13)},112`} fill="url(#pg)"/>
        <polyline points={pPts} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points={tPts} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5,3" strokeLinecap="round"/>
        {prod.map((v,i)=><circle key={i} cx={toX(i)} cy={toY(v)} r="2.5" fill="#6366f1"/>)}
      </svg>
      <div style={{display:"flex",gap:18,marginTop:8}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:18,height:2,background:"#6366f1",borderRadius:2}}/><span style={{fontSize:10,color:dark?"#94a3b8":"#64748b"}}>Actual Output</span></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:18,borderTop:"2px dashed #10b981"}}/><span style={{fontSize:10,color:dark?"#94a3b8":"#64748b"}}>Target</span></div>
      </div>
    </div>
  );
}
export function DashboardHome({ dark, setPage }) {
  const dayName=new Date().toLocaleDateString("en-IN",{weekday:"long"});
  const kpis=[
    {icon:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 3h12M6 8h12M6 13l8 8M6 13h3a4 4 0 000-8" strokeLinecap="round"/></svg>,value:"\u20B918.6L",label:"Inventory Value",trend:"4.8%",up:true,color:"indigo"},
    {icon:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" strokeLinecap="round"/></svg>,value:"3,412",label:"Open Orders",trend:"2.1%",up:true,color:"sky"},
    {icon:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,value:"128",label:"Active Users",trend:"1.2%",up:false,color:"emerald"},
    {icon:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round"/></svg>,value:"6",label:"Quality Flags",trend:"0.6%",up:false,color:"amber"},
  ];
  const stats=[{label:"OEE THIS SHIFT",value:"94.2%"},{label:"UNITS PRODUCED",value:"1,284"},{label:"ON-TIME DISPATCH",value:"99.1%"},{label:"LINES RUNNING",value:"4 / 4"}];
  const txs=[
    {type:"ISSUE",item:"MAT-001 \u00B7 Steel Sheet",from:"Stores",to:"Production",qty:"250 KG",time:"09:12 AM"},
    {type:"RECEIPT",item:"MAT-003 \u00B7 Bearing 6205",from:"Vendor",to:"Maintenance",qty:"50 PCS",time:"08:45 AM"},
    {type:"ISSUE",item:"MAT-004 \u00B7 Lubricating Oil",from:"Maint.",to:"Production",qty:"30 LTR",time:"08:10 AM"},
    {type:"REVERSE",item:"MAT-002 \u00B7 SS Rod 20mm",from:"Prod.",to:"Stores",qty:"100 KG",time:"07:55 AM"},
    {type:"RECEIPT",item:"MAT-005 \u00B7 Welding Electrode",from:"Vendor",to:"Production",qty:"75 KG",time:"07:20 AM"},
  ];
  const tC={ISSUE:["rgba(245,158,11,0.14)","#d97706"],RECEIPT:["rgba(16,185,129,0.14)","#059669"],REVERSE:["rgba(139,92,246,0.14)","#7c3aed"]};
  const card={background:dark?"#1e293b":"#fff",border:`1px solid ${dark?"rgba(148,163,184,0.12)":"rgba(148,163,184,0.2)"}`,borderRadius:20,boxShadow:dark?"0 4px 24px rgba(0,0,0,0.28)":"0 2px 16px rgba(0,0,0,0.06)"};
  const qa=[{label:"New Issue Slip",sub:"Material Issue",icon:"\uD83D\uDCE4",p:"entry-forms",c:"#f59e0b"},{label:"Record Receipt",sub:"Stock Inward",icon:"\uD83D\uDCE5",p:"entry-forms",c:"#10b981"},{label:"Stock Overview",sub:"View Balances",icon:"\uD83D\uDCE6",p:"inventory",c:"#6366f1"},{label:"View Audit Log",sub:"Tx History",icon:"\uD83D\uDCCB",p:"entry-forms",c:"#0ea5e9"}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:22,paddingBottom:32}}>
      <div style={{borderRadius:20,padding:"28px 32px",position:"relative",overflow:"hidden",background:"linear-gradient(135deg, #0369a1 0%, #0ea5e9 40%, #0284c7 75%, #0369a1 100%)",boxShadow:"0 8px 40px rgba(14,165,233,0.35)"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.05) 100%)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"inline-flex",alignItems: "center",gap:6,marginBottom:12,padding:"5px 12px",borderRadius:20,background:"rgba(255,255,255,0.2)",fontSize:11,fontWeight:700,color:"#e0f2fe"}}>✦ Powered by AI Insights</div>
          <h1 style={{fontSize:28,fontWeight:900,color:"#fff",letterSpacing:"-0.5px",marginBottom:6}}>Welcome back, <span style={{color:"#bae6fd"}}>Gaurav</span></h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.85)",marginBottom:22}}>{dayName} &mdash; Here&apos;s how Plant 01 is performing right now.</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:32}}>
            {stats.map(s=>(<div key={s.label}><p style={{fontSize:20,fontWeight:800,color:"#fff"}}>{s.value}</p><p style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.55)",letterSpacing:"0.08em",marginTop:2}}>{s.label}</p></div>))}
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
        {kpis.map(k=><KPICard key={k.label} {...k} dark={dark}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16}}>
        <div style={{...card,padding:22}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h3 style={{fontWeight:800,fontSize:14,color:dark?"#f1f5f9":"#0f172a"}}>Production Trend</h3>
            <span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:20,background:dark?"rgba(148,163,184,0.1)":"#f1f5f9",color:dark?"#94a3b8":"#64748b"}}>LAST 14 DAYS</span>
          </div>
          <TrendChart dark={dark}/>
        </div>
        <div style={{...card,padding:22}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h3 style={{fontWeight:800,fontSize:14,color:dark?"#f1f5f9":"#0f172a"}}>Inventory Split</h3>
            <span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:20,background:dark?"rgba(148,163,184,0.1)":"#f1f5f9",color:dark?"#94a3b8":"#64748b"}}>BY CATEGORY</span>
          </div>
          <Donut dark={dark}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16}}>
        <div style={{...card,padding:22}}>
          <h3 style={{fontWeight:800,fontSize:14,color:dark?"#f1f5f9":"#0f172a",marginBottom:14}}>Quick Actions</h3>
          {qa.map(a=>(<button key={a.label} onClick={()=>setPage(a.p)} onMouseOver={e=>e.currentTarget.style.transform="scale(1.01)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:14,marginBottom:8,cursor:"pointer",background:dark?"rgba(148,163,184,0.06)":"#f8fafc",border:`1px solid ${dark?"rgba(148,163,184,0.1)":"#e2e8f0"}`,textAlign:"left",transition:"transform 0.15s"}}><span style={{fontSize:20}}>{a.icon}</span><div style={{flex:1}}><p style={{fontSize:12,fontWeight:700,color:dark?"#e2e8f0":"#0f172a"}}>{a.label}</p><p style={{fontSize:11,color:dark?"#64748b":"#94a3b8"}}>{a.sub}</p></div><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={a.c} strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg></button>))}
        </div>
        <div style={{...card,padding:22}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontWeight:800,fontSize:14,color:dark?"#f1f5f9":"#0f172a"}}>Recent Transactions</h3>
            <button onClick={()=>setPage("entry-forms")} style={{fontSize:11,fontWeight:700,color:"#6366f1",background:"none",border:"none",cursor:"pointer"}}>View All &rarr;</button>
          </div>
          {txs.map((tx,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12,marginBottom:6,background:dark?"rgba(148,163,184,0.05)":"#f8fafc"}}><span style={{fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:8,flexShrink:0,background:tC[tx.type][0],color:tC[tx.type][1]}}>{tx.type}</span><div style={{flex:1,minWidth:0}}><p style={{fontSize:12,fontWeight:700,color:dark?"#e2e8f0":"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.item}</p><p style={{fontSize:11,color:dark?"#64748b":"#94a3b8"}}>{tx.from} &rarr; {tx.to}</p></div><div style={{textAlign:"right",flexShrink:0}}><p style={{fontSize:12,fontWeight:700,color:dark?"#cbd5e1":"#334155"}}>{tx.qty}</p><p style={{fontSize:10,color:dark?"#64748b":"#94a3b8"}}>{tx.time}</p></div></div>))}
        </div>
      </div>
    </div>
  );
}
