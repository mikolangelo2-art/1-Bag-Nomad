import { useState, useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useMobile } from '../hooks/useMobile';
import ConsoleHeader from './ConsoleHeader';
import { askAI, parseJSON } from '../utils/aiHelpers';
import { estCost } from '../utils/priceHelpers';
import { fmt } from '../utils/dateHelpers';
import { TI } from '../utils/storageHelpers';
import { GOAL_PRESETS, QUICK_ACTIONS } from '../constants/dreamData';
import { PALETTE_8 } from '../constants/colors';

function CoArchitect({data,visionData,onLaunch,onBack}) {
  const isMobile=useMobile();
  const [mobileTab,setMobileTab]=useState(data.isRevision?"chat":"chat");
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setMounted(true),60);return()=>clearTimeout(t);},[]);
  useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});posthog.capture("co_architect_opened");posthog.capture("$pageview",{$current_url:"/co-architect"});},[]);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  // estCost — imported from priceHelpers.js
  const colors=PALETTE_8;
  const [items,setItems]=useState(()=>(visionData.phases||[]).map((p,i)=>({id:i,destination:p.destination,country:p.country,type:p.type||"Exploration",nights:p.nights||7,cost:p.budget||estCost(p.destination,p.country,p.type,p.nights||7),flag:p.flag||"🌍",color:colors[i%8],why:p.why||""})));
  const [startDate,setStartDate]=useState(data.date||"2026-09-16");
  const [chat,setChat]=useState([{role:"ai",text:data.isRevision?"Welcome back — let's revise your expedition. ✏️\n\nYour itinerary is loaded. Tell me what you'd like to change.":"Welcome — I'm your expedition co-architect. ✨\n\nYour vision is incredible and I'm genuinely excited to help you build it.",isWelcome:true}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const chatEnd=useRef(null);
  const goalLabel=GOAL_PRESETS.find(g=>g.id===data.selectedGoal)?.label||"expedition";
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  useEffect(()=>{const t=setTimeout(()=>genInsight(),2000);return()=>clearTimeout(t);},[]);
  const totalNights=items.reduce((s,i)=>s+i.nights,0);
  const totalCost=items.reduce((s,i)=>s+i.cost,0);
  const countries=[...new Set(items.map(i=>i.country))];
  function getDates(){let cur=new Date(startDate);return items.map(p=>{const arr=new Date(cur);cur.setDate(cur.getDate()+p.nights);return{arrival:arr,departure:new Date(cur)};});}
  const dates=getDates();
  function fmtD(d){return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});}
  async function genInsight(){
    setLoading(true);
    const res=await askAI(`Co-architect. Goal:"${goalLabel}". Vision:"${data.vision}". ${data.budgetMode!=="dream"?"Budget: "+data.budgetAmount:"No budget."} Items:${JSON.stringify(items.map(i=>({destination:i.destination,type:i.type,nights:i.nights})))} One sentence excitement. ONE clarifying question. Max 3 sentences.`,350);
    setChat(p=>[...p,{role:"ai",text:res}]);setLoading(false);
  }
  async function sendMsg(){
    if(!input.trim())return;
    const msg=input;setInput("");setChat(p=>[...p,{role:"user",text:msg}]);setLoading(true);
    try{
      const raw=await askAI(`Co-architect. Goal:"${goalLabel}". Vision:"${data.vision}". ${data.budgetMode!=="dream"?"Budget:"+data.budgetAmount+".":"No budget."} Items:${JSON.stringify(items.map(i=>({id:i.id,destination:i.destination,country:i.country,nights:i.nights,type:i.type})))} Traveler:"${msg}" Return ONLY valid JSON:{"response":"warm 2-3 sentences","changes":[{"id":0,"field":"destination","value":"New Place","country":"New Country"}],"warnings":[{"phaseIndex":0,"type":"date_conflict","message":"...","suggestion":"...","dismissible":true}]}. When changing destination always include country. If you detect a date conflict or seasonal mismatch include a warning.`,600);
      const parsed=parseJSON(raw);
      if(parsed){setChat(p=>[...p,{role:"ai",text:parsed.response}]);if(parsed.changes?.length)setItems(p=>{let u=[...p];parsed.changes.forEach(c=>{u=u.map(it=>{if(it.id!==c.id)return it;const upd={...it,[c.field]:c.value};if(c.field==="destination"&&c.country)upd.country=c.country;if(c.field==="country")upd.country=c.value;return upd;})});return u;});if(parsed.warnings?.length)parsed.warnings.forEach(w=>{try{const existing=JSON.parse(localStorage.getItem('1bn_warnings_v1')||'[]');existing.push(w);localStorage.setItem('1bn_warnings_v1',JSON.stringify(existing));}catch(e){}});}
      else setChat(p=>[...p,{role:"ai",text:"Got it — which stop would you like to change?"}]);
    }catch(e){setChat(p=>[...p,{role:"ai",text:"What specifically would you like to change?"}]);}
    setLoading(false);
  }
  // Architecture #1: each item auto-wraps as 1 segment
  function buildHandoff(){
    return{tripName:data.tripName||"My Expedition",startDate,departureCity:data.city||"",vision:data.vision,visionNarrative:visionData.narrative,visionHighlight:visionData.highlight,goalLabel,
      budgetBreakdown:visionData.budgetBreakdown||null,travelerProfile:data.travelerProfile||null,packProfile:visionData.packProfile||null,
      phases:items.map((item,i)=>({id:i+1,name:item.destination,flag:item.flag,color:item.color,budget:item.cost,nights:item.nights,type:item.type,arrival:dates[i]?.arrival.toISOString().split("T")[0]||"",departure:dates[i]?.departure.toISOString().split("T")[0]||"",country:item.country,diveCount:item.type==="Dive"?Math.floor(item.nights*1.5):0,cost:item.cost,note:item.why||visionData.phases?.[i]?.why||""})),
      totalNights,totalBudget:totalCost,totalDives:items.filter(i=>i.type==="Dive").reduce((s,i)=>s+Math.floor(i.nights*1.5),0)};
  }
  return(
    <div className="build-root" style={{opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(32px)",transition:"opacity 0.55s ease,transform 0.55s cubic-bezier(0.22,1,0.36,1)"}}>
      <ConsoleHeader console="dream" isMobile={isMobile} screenLabel="CO-ARCHITECT" rightSlot={<div style={{display:"flex",gap:5,alignItems:"center"}}>{[1,2,3,4].map(n=><div key={n} style={{width:n<3?22:n===3?28:18,height:6,borderRadius:3,background:n===1?"rgba(255,159,67,0.85)":n===2?"rgba(255,159,67,0.55)":n===3?"#FFD93D":"rgba(0,229,255,0.15)",boxShadow:n===1?"0 0 8px rgba(255,159,67,0.5)":n===3?"0 0 10px rgba(255,217,61,0.7)":"none",transition:"all 0.3s ease"}}/>)}</div>}/>
      <div style={{display:"flex",border:"none",background:"#080D14",flexShrink:0,paddingRight:4}}>
        {[{label:"STOPS",val:items.length,c:"#00E5FF"},{label:"COUNTRIES",val:countries.length,c:"#69F0AE"},{label:"NIGHTS",val:totalNights,c:"#A29BFE"},{label:"BUDGET",val:fmt(totalCost),c:"#FFD93D"}].map((s,i)=>(
          <div key={s.label} style={{flex:1,padding:"8px 6px",textAlign:"center",borderRight:i<3?"1px solid #111D2A":"none"}}>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{s.label}</div>
            <div style={{fontSize:isMobile?13:15,fontWeight:700,color:s.c}}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"8px 14px",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid #111D2A",flexShrink:0}}>
        <span style={{fontSize:15,color:"rgba(255,255,255,0.75)",letterSpacing:1}}>DEPARTURE</span>
        <input type="date" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:6,color:"#00E5FF",fontSize:15,padding:"3px 8px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",colorScheme:"dark"}} value={startDate} onChange={e=>setStartDate(e.target.value)} onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
        <span style={{fontSize:15,color:"rgba(255,255,255,0.65)",marginLeft:"auto"}}>{totalNights} nights</span>
      </div>
      {isMobile&&<div style={{display:"flex",borderBottom:"1px solid #1a2535",background:"#080D14",flexShrink:0}}>
        {["chat","itinerary"].map(t=><button key={t} onClick={()=>setMobileTab(t)} style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:mobileTab===t?"2px solid #69F0AE":"2px solid transparent",color:mobileTab===t?"#69F0AE":"rgba(255,255,255,0.4)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:2,minHeight:44}}>{t==="itinerary"?"🗺️ ITINERARY":"✨ TRIP BRIEF"}</button>)}
      </div>}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0,...(isMobile?{flexDirection:"column"}:{})}}>
        {(!isMobile||mobileTab==="itinerary")&&(
          <div style={{width:"42%",overflowY:"auto",padding:12,...(isMobile?{maxHeight:"none",width:"100%",padding:"12px 16px"}:{})}}>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.85)",letterSpacing:3,marginBottom:10}}>YOUR ITINERARY · TAP TO EDIT</div>
            {items.map((item,i)=>{
              const c=item.color,isEd=editingId===item.id;
              return(
                <div key={item.id} style={{marginBottom:7,background:"#0C1520",borderRadius:11,overflow:"hidden",border:`1px solid ${c}22`,borderLeft:`3px solid ${c}`}}>
                  <div onClick={()=>setEditingId(isEd?null:item.id)} style={{padding:isMobile?"8px 10px":"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,minHeight:44}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:`${c}18`,border:`1px solid ${c}44`,color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}><div style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FFF"}}>{item.flag} {item.destination}</div><div style={{fontSize:isMobile?11:15,color:"rgba(255,255,255,0.75)"}}><span style={{color:"#FFD93D",fontWeight:700}}>{item.country}</span> · {TI[item.type]} {item.type} · {fmtD(dates[i]?.arrival)}→{fmtD(dates[i]?.departure)}</div></div>
                    <div style={{textAlign:"right",flexShrink:0,paddingRight:4}}><div style={{fontSize:15,fontWeight:900,color:"#A29BFE",paddingRight:2}}>{item.nights}n</div><div style={{fontSize:15,color:"#FFD93D"}}>{fmt(item.cost)}</div></div>
                    <span style={{fontSize:15,color:"rgba(255,255,255,0.25)",marginLeft:6}}>{isEd?"▲":"▼"}</span>
                  </div>
                  {isEd&&<div style={{padding:"10px 12px 12px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.2)",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[{label:"NIGHTS",field:"nights",type:"number"},{label:"COST ($)",field:"cost",type:"number"}].map(f=><div key={f.field} style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{f.label}</div><input type={f.type} style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none"}} value={item[f.field]} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,[f.field]:parseInt(e.target.value)||1}:it))}/></div>)}
                    <div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>TYPE</div><select style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",outline:"none",width:"100%"}} value={item.type} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,type:e.target.value}:it))}>{["Exploration","Culture","Dive","Surf","Nature","Trek","Moto","Relax","Transit"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
                  </div>}
                </div>
              );
            })}
            <div style={{padding:"10px 12px",background:"rgba(105,240,174,0.04)",border:"1px solid rgba(105,240,174,0.14)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
              <div><div style={{fontSize:15,color:"rgba(255,255,255,0.35)"}}>{items.length} stops · {countries.length} countries</div><div style={{fontSize:15,color:"#69F0AE"}}>~{fmt(Math.round(totalCost/Math.max(totalNights,1)))}/night</div></div>
              <div style={{fontSize:20,fontWeight:900,color:"#FFD93D"}}>{fmt(totalCost)}</div>
            </div>
            {isMobile&&<button style={{margin:"12px 0 0 0",width:"100%",padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#060A0F",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",animation:"consolePulse 2.8s ease-in-out infinite"}} onClick={()=>onLaunch(buildHandoff())}>{data.isRevision?"✅  UPDATE":"🚀  LAUNCH TRIP CONSOLE"}</button>}
          </div>
        )}
        {(!isMobile||mobileTab==="chat")&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",borderRight:isMobile?"none":"1px solid #111D2A",...(isMobile?{flex:1,borderTop:"1px solid #111D2A",padding:"0 16px"}:{})}}>
            <div style={{padding:"8px 11px",borderBottom:"1px solid #111D2A",fontSize:15,color:"#C4571E",letterSpacing:2,flexShrink:0}}>{data.isRevision?"✏️ REVISE YOUR EXPEDITION":"✦ CO-ARCHITECT"}</div>
            <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:14}}>
              {chat.map((msg,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:msg.role==="user"?"row-reverse":"row",animation:"msgIn 0.25s ease"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:msg.role==="ai"?"#A9461D":"#1a2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{msg.role==="ai"?"✨":"👤"}</div>
                  {msg.isWelcome
                    ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"20px 0 8px"}}><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:16,fontWeight:300,fontStyle:"normal",color:"rgba(232,220,200,0.7)",textAlign:"center",letterSpacing:0.5,marginBottom:isMobile?8:0}}>Welcome — I'm your expedition co-architect.</div></div>
                    :<div style={{background:msg.role==="ai"?"rgba(255,159,67,0.04)":"rgba(255,255,255,0.05)",border:msg.role==="ai"?"2px solid rgba(255,159,67,0.30)":`1px solid rgba(255,255,255,0.08)`,borderRadius:12,padding:msg.role==="ai"?(isMobile?"14px 16px":"18px 20px"):"10px 14px",fontSize:msg.role==="ai"?(isMobile?13:16):13,fontFamily:msg.role==="ai"?"'Fraunces',serif":"'Inter',system-ui,-apple-system,sans-serif",fontStyle:msg.role==="ai"?"italic":"normal",color:"#FFF",lineHeight:msg.role==="ai"?(isMobile?1.55:1.7):1.5,maxWidth:"92%",boxShadow:msg.role==="ai"?"inset 0 0 24px rgba(255,159,67,0.04)":"none"}}>{(msg.text||"").replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')}</div>}
                </div>
              ))}
              {loading&&<div style={{display:"flex",gap:6,animation:"msgIn 0.25s ease"}}><div style={{width:20,height:20,borderRadius:"50%",background:"#A9461D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>✨</div><div style={{fontSize:15,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",padding:"4px 0"}}>thinking...</div></div>}
              <div ref={chatEnd}/>
            </div>
            <div style={{padding:isMobile?"10px 10px 10px 10px":"10px",paddingRight:isMobile?80:10,borderTop:"1px solid #111D2A",display:"flex",gap:5,flexWrap:isMobile?"nowrap":"wrap",overflowX:"auto",flexShrink:0}}>
              {QUICK_ACTIONS.map(a=><button key={a} onClick={()=>setInput(a)} style={{background:"rgba(169,70,29,0.18)",border:"1px solid rgba(255,217,61,0.35)",borderRadius:20,padding:isMobile?"6px 12px":"7px 14px",fontSize:isMobile?11:15,fontWeight:700,color:"#FFD93D",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:isMobile?32:36}}>{a}</button>)}
            </div>
            <div style={{padding:"8px 10px",borderTop:"1px solid #111D2A",display:"flex",gap:7,flexShrink:0}}>
              <input style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:8,color:"#FFF",fontSize:isMobile?13:15,padding:"8px 10px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",minHeight:44,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMsg();}} placeholder="Ask anything, request changes..." onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
              <button style={{background:"rgba(169,70,29,0.2)",border:"1px solid rgba(169,70,29,0.4)",borderRadius:8,color:"#FFD93D",fontSize:15,padding:"8px 11px",cursor:"pointer",minWidth:44,minHeight:44}} onClick={sendMsg}>↑</button>
            </div>
            {!isMobile&&<button style={{margin:10,padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#060A0F",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",animation:"consolePulse 2.8s ease-in-out infinite",flexShrink:0}} onClick={()=>onLaunch(buildHandoff())}>{data.isRevision?"✅  UPDATE MY EXPEDITION":"🚀  LAUNCH TRIP CONSOLE"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}


export default CoArchitect;
