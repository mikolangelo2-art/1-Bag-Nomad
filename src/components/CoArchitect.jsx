import { useState, useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useMobile } from '../hooks/useMobile';
import BrandHeaderTier3 from './BrandHeaderTier3';
import { Icon } from "@iconify/react";
import { askAI, parseJSON } from '../utils/aiHelpers';
import { estCost } from '../utils/priceHelpers';
import { fmt } from '../utils/dateHelpers';
import { TI } from '../utils/storageHelpers';
import { GOAL_PRESETS, QUICK_ACTIONS } from '../constants/dreamData';
import { PALETTE_8 } from '../constants/colors';
import DatePickerInput from './DatePickerInput';
import { formatTripNameDisplay } from '../utils/tripConsoleHelpers';

function coerceNightsInit(v){
  if(v===""||v==null)return 1;
  if(typeof v==="number")return Math.max(1,v);
  const n=parseInt(String(v),10);
  return Number.isFinite(n)?Math.max(1,n):1;
}
function buildCoArchitectWelcomeMessage(tripName, items, countries, totalNights) {
  const cc = countries.length;
  const dive = items.some(i => String(i.type || "").toLowerCase().includes("dive"));
  const tn = tripName ? `${tripName} — ` : "";
  if (dive) return `${tn}${totalNights} nights, ${cc} ${cc === 1 ? "country" : "countries"}. Let's make every dive count.`;
  if (items.length >= 4 || cc >= 5) return `${tn}${cc} countries, ${totalNights} nights. This is an expedition — let's build it right.`;
  return `${tn}${totalNights} nights across ${cc} ${cc === 1 ? "country" : "countries"}. Let's make every one count.`;
}
function initialItemsFromVision(visionData,colors){
  return(visionData.phases||[]).filter(p=>p.type!=="Return").map((p,i)=>({id:i,destination:p.destination,country:p.country,type:p.type||"Exploration",nights:p.nights||7,cost:p.budget||estCost(p.destination,p.country,p.type,p.nights||7),flag:p.flag||"🌍",color:colors[i%8],why:p.why||"",caActivities:Array.isArray(p.caActivities)?p.caActivities.slice():[]}));
}

function CoArchitect({data,visionData,onLaunch,onBack}) {
  const isMobile=useMobile();
  const [mobileTab,setMobileTab]=useState(data.isRevision?"chat":"chat");
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setMounted(true),60);return()=>clearTimeout(t);},[]);
  useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});posthog.capture("co_architect_opened");posthog.capture("$pageview",{$current_url:"/co-architect"});},[]);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  // estCost — imported from priceHelpers.js
  const colors=PALETTE_8;
  // Filter return phase — kept separately, re-attached in buildHandoff
  const [returnPhaseData]=useState(()=>(visionData.phases||[]).find(p=>p.type==="Return")||null);
  const [items,setItems]=useState(()=>initialItemsFromVision(visionData,colors));
  const [startDate,setStartDate]=useState(data.date||"2026-09-16");
  const [chat,setChat]=useState(()=>{
    const its=initialItemsFromVision(visionData,PALETTE_8);
    const cc=[...new Set(its.map(i=>i.country))];
    const tn=its.reduce((s,i)=>s+coerceNightsInit(i.nights),0);
    return[{role:"ai",text:buildCoArchitectWelcomeMessage(data.tripName,its,cc,tn)}];
  });
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const chatEnd=useRef(null);
  const coerceCostVal=(v)=>{if(v===""||v==null)return 0;if(typeof v==="number")return v;const n=parseFloat(String(v));return Number.isFinite(n)?n:0;};
  const coerceNightsVal=(v)=>{if(v===""||v==null)return 1;if(typeof v==="number")return Math.max(1,v);const n=parseInt(String(v),10);return Number.isFinite(n)?Math.max(1,n):1;};
  function commitItemNumeric(id){
    setItems(p=>p.map(it=>{
      if(it.id!==id)return it;
      const nRaw=typeof it.nights==="string"?it.nights:String(it.nights??"");
      const cRaw=typeof it.cost==="string"?it.cost:String(it.cost??"");
      const n=nRaw===""?1:parseInt(nRaw,10);
      const c=cRaw===""?0:parseFloat(cRaw);
      return{...it,nights:Number.isFinite(n)&&n>=1?n:1,cost:Number.isFinite(c)&&c>=0?c:0};
    }));
  }
  const goalLabel=GOAL_PRESETS.find(g=>g.id===data.selectedGoal)?.label||"expedition";
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  useEffect(()=>{
    const last=[...chat].reverse().find(m=>m.role==="ai");
    if(last?.text)try{sessionStorage.setItem("1bn_ca_peek_v1",JSON.stringify({text:last.text}));}catch(e){}
  },[chat]);
  const totalNights=items.reduce((s,i)=>s+coerceNightsVal(i.nights),0);
  const totalCost=items.reduce((s,i)=>s+coerceCostVal(i.cost),0);
  const countries=[...new Set(items.map(i=>i.country))];
  function getDates(){let cur=new Date(startDate);return items.map(p=>{const arr=new Date(cur);const n=coerceNightsVal(p.nights);cur.setDate(cur.getDate()+n);return{arrival:arr,departure:new Date(cur)};});}
  const dates=getDates();
  function fmtD(d){return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});}
  async function sendMsg(){
    if(!input.trim())return;
    const msg=input;setInput("");setChat(p=>[...p,{role:"user",text:msg}]);setLoading(true);
    const hasBudget=data.budgetMode!=="dream"&&data.budgetAmount&&Number(data.budgetAmount)>0;
    const budgetCtx=hasBudget?`Budget: $${data.budgetAmount} FIRM.`:"No budget set.";
    const depMonth=new Date(startDate).getMonth();
    const season=depMonth<=1||depMonth===11?"winter":depMonth<=4?"spring":depMonth<=7?"summer":"fall";
    const dateCtx=startDate?`Departure: ${startDate}. Return: ${data.returnDate||"open-ended"}. Season: ${season}. Do NOT ask what time of year — you already know.`:"";
    try{
      const raw=await askAI(`Co-architect. Goal:"${goalLabel}". Vision:"${data.vision}". ${budgetCtx} ${dateCtx}
Total nights: ${totalNights}. When adding phases, redistribute existing nights — do not extend the trip.
${hasBudget?`When adding phases, redistribute the existing $${data.budgetAmount} budget — do NOT increase total spend. If a new phase costs $X, include cost reductions to other phases totaling $X.`:''}
Current itinerary: ${JSON.stringify(items.map(i=>({id:i.id,destination:i.destination,country:i.country,nights:i.nights,type:i.type,cost:i.cost})))}
Traveler request: "${msg}"

Return ONLY valid JSON:
{
  "response": "warm 2-3 sentence reply confirming what you changed",
  "changes": [{"id": 0, "field": "destination", "value": "New Place", "country": "New Country"}, {"id": 0, "field": "nights", "value": 5}, {"id": 0, "field": "cost", "value": 800}],
  "addPhases": [{"destination": "City", "country": "Country", "nights": 5, "type": "Culture", "cost": 700, "flag": "🌍", "insertAfter": 1}],
  "removePhaseIds": [],
  "activitySuggestions": [],
  "targetDestination": "",
  "warnings": []
}
RULES:
- When changing destination ALWAYS include updated country and cost
- When changing nights ALWAYS include updated cost
- addPhases: full phase object + insertAfter (id of phase to insert after, or 0 for start)
- removePhaseIds: array of phase ids to delete
- When using addPhases: include cost changes to existing phases that offset the new phase cost — total must stay at $${hasBudget?data.budgetAmount:'N/A'}
- When using addPhases: reduce nights on existing phases so total stays at ${totalNights} — do not extend the trip
- If change would exceed budget of $${hasBudget?data.budgetAmount:"N/A"}, add a warning and suggest adjustment
- ALWAYS apply changes — do not just suggest them
- When reporting destination count to user, say "${items.length} destinations" (exclude return)
- If the user asks to add or remember a specific activity for a stop, set targetDestination to that stop's city name and activitySuggestions to an array of objects: {"name":"...","notes":"optional","estimatedCost":"optional"} (or plain strings for name-only)`,600,0.4);
      const parsed=parseJSON(raw);
      if(parsed){
        setChat(p=>[...p,{role:"ai",text:parsed.response}]);
        setItems(p=>{
          let u=[...p];
          // Apply field-level changes
          if(parsed.changes?.length){
            parsed.changes.forEach(c=>{
              u=u.map(it=>{
                if(it.id!==c.id)return it;
                const upd={...it,[c.field]:c.value};
                if(c.field==="destination"&&c.country)upd.country=c.country;
                if(c.field==="country")upd.country=c.value;
                if(c.field==="cost")upd.cost=Number(c.value)||upd.cost;
                if(c.field==="nights")upd.nights=Number(c.value)||upd.nights;
                return upd;
              });
            });
          }
          // Remove phases
          if(parsed.removePhaseIds?.length){
            u=u.filter(it=>!parsed.removePhaseIds.includes(it.id));
          }
          // Add new phases
          if(parsed.addPhases?.length){
            parsed.addPhases.forEach(np=>{
              const newItem={
                id:Date.now()+Math.random(),
                destination:np.destination,country:np.country,
                nights:np.nights||5,cost:np.cost||0,
                type:np.type||"Exploration",flag:np.flag||"🌍",
                color:np.color||"#A29BFE",why:np.why||"",caActivities:[]
              };
              const insertIdx=np.insertAfter?u.findIndex(it=>it.id===np.insertAfter):-1;
              if(insertIdx>=0)u.splice(insertIdx+1,0,newItem);
              else u.push(newItem);
            });
          }
          if(parsed.activitySuggestions?.length&&parsed.targetDestination){
            const tgt=(parsed.targetDestination||"").trim().toLowerCase();
            const norm=(s)=>typeof s==="string"?{name:s,notes:"",estimatedCost:"",provider:""}:{name:s.name||s.title||"",notes:s.notes||"",estimatedCost:s.estimatedCost||s.cost||"",provider:s.provider||""};
            const added=parsed.activitySuggestions.map(norm).filter(a=>a.name);
            if(tgt&&added.length){
              u=u.map(it=>{
                const d=(it.destination||"").trim().toLowerCase();
                if(d!==tgt&&!d.startsWith(tgt)&&!tgt.startsWith(d))return it;
                return{...it,caActivities:[...(it.caActivities||[]),...added]};
              });
            }
          }
          // Reassign sequential ids
          return u.map((it,idx)=>({...it,id:idx+1}));
        });
        if(parsed.warnings?.length)parsed.warnings.forEach(w=>{try{const existing=JSON.parse(localStorage.getItem('1bn_warnings_v1')||'[]');existing.push(w);localStorage.setItem('1bn_warnings_v1',JSON.stringify(existing));}catch(e){}});
      }
      else setChat(p=>[...p,{role:"ai",text:"Got it — which stop would you like to change?"}]);
    }catch(e){
      const isOverloaded=String(e?.message||e).toLowerCase().includes("overload")||String(e?.message||e).includes("529");
      setChat(p=>[...p,{role:"ai",text:isOverloaded?"The service is a little busy right now — give it a moment and try again. Your itinerary is safe.":"Something went wrong on my end — try sending that again."}]);
    }
    setLoading(false);
  }
  // Architecture #1: each item auto-wraps as 1 segment
  function buildHandoff(){
    const destPhases=items.map((item,i)=>({id:i+1,name:item.destination,flag:item.flag,color:item.color,budget:coerceCostVal(item.cost),nights:coerceNightsVal(item.nights),type:item.type,arrival:dates[i]?.arrival.toISOString().split("T")[0]||"",departure:dates[i]?.departure.toISOString().split("T")[0]||"",country:item.country,diveCount:item.type==="Dive"?Math.floor(coerceNightsVal(item.nights)*1.5):0,cost:coerceCostVal(item.cost),note:item.why||visionData.phases?.find(p=>p.destination===item.destination)?.why||"",...(item.caActivities?.length?{caActivities:[...item.caActivities]}:{})}));
    const lastDepDate=dates[items.length-1]?.departure?.toISOString().split("T")[0]||"";
    const rp=returnPhaseData||{destination:data.city||"Home",country:"United States",type:"Return",nights:0,cost:Math.round(totalCost*0.08/10)*10,budget:Math.round(totalCost*0.08/10)*10,flag:"🏠",color:"#94A3B8",why:`Homebound from ${items[items.length-1]?.destination||"final destination"}`};
    const returnPhaseHandoff={id:destPhases.length+1,name:rp.destination,flag:rp.flag||"🏠",color:rp.color||"#94A3B8",budget:rp.budget||rp.cost||0,nights:0,type:"Return",arrival:lastDepDate,departure:data.returnDate||lastDepDate,country:rp.country||"United States",diveCount:0,cost:rp.budget||rp.cost||0,note:rp.why||""};
    return{tripName:formatTripNameDisplay(data.tripName||"My Expedition"),startDate,departureCity:data.city||"",vision:data.vision,visionNarrative:visionData.narrative,visionHighlight:visionData.highlight,goalLabel,
      budgetBreakdown:visionData.budgetBreakdown||null,travelerProfile:data.travelerProfile||null,packProfile:visionData.packProfile||null,
      phases:[...destPhases,returnPhaseHandoff],
      budgetCap:(data.budgetMode!=="dream"&&Number(data.budgetAmount)>0)?Number(data.budgetAmount):0,
      totalNights,totalBudget:totalCost+(returnPhaseHandoff.budget||0),totalDives:items.filter(i=>i.type==="Dive").reduce((s,i)=>s+Math.floor(coerceNightsVal(i.nights)*1.5),0)};
  }
  return(
    <div className="build-root" style={{opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(32px)",transition:"opacity 0.55s ease,transform 0.55s cubic-bezier(0.22,1,0.36,1)",overflowX:"hidden"}}>
      <BrandHeaderTier3 shimmer={true} />
      <div style={{display:"flex",border:"none",background:"#080D14",flexShrink:0}}>
        {[{label:"STOPS",val:items.length},{label:"COUNTRIES",val:countries.length},{label:"NIGHTS",val:totalNights},{label:"BUDGET",val:fmt(totalCost)}].map((s,i)=>(
          <div key={s.label} style={{flex:1,minWidth:0,padding:isMobile?"6px 4px":"8px 6px",textAlign:"center",borderRight:i<3?"1px solid rgba(122,111,93,0.18)":"none"}}>
            <div style={{fontSize:isMobile?9:11,color:"rgba(94,139,138,0.75)",letterSpacing:1.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textTransform:"uppercase",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:500}}>{s.label}</div>
            <div style={{fontSize:isMobile?14:16,fontWeight:700,color:"#C9A04C",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:isMobile?"8px 12px":"8px 14px",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(122,111,93,0.18)",flexShrink:0}}>
        <span style={{fontSize:isMobile?9:11,fontWeight:600,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",color:"rgba(94,139,138,0.75)",letterSpacing:1.5}}>DEPARTURE</span>
        <div style={{flex:1,minWidth:0,maxWidth:isMobile?"100%":220}}><DatePickerInput value={startDate} onChange={setStartDate} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(201,160,76,0.42)",borderRadius:6,color:"#C9A04C",fontSize:isMobile?13:14,padding:"3px 8px",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",outline:"none",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",colorScheme:"dark"}} onFocus={e=>{e.target.style.borderColor="rgba(201,160,76,0.7)";e.target.style.boxShadow="0 0 0 2px rgba(201,160,76,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(201,160,76,0.42)";e.target.style.boxShadow="none";}} aria-label="Departure date" buttonStyle={{border:"1px solid rgba(201,160,76,0.42)",background:"rgba(201,160,76,0.12)",borderRadius:8}}/></div>
        <span style={{fontSize:isMobile?11:13,color:"#C9A04C",marginLeft:"auto",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:600}}>{totalNights}n</span>
      </div>
      {isMobile&&<div style={{display:"flex",borderBottom:"1px solid rgba(122,111,93,0.18)",background:"#080D14",flexShrink:0}}>
        {["chat","itinerary"].map(t=><button key={t} onClick={()=>setMobileTab(t)} style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:mobileTab===t?"2px solid #C9A04C":"2px solid transparent",color:mobileTab===t?"#C9A04C":"rgba(232,220,200,0.5)",fontSize:11,cursor:"pointer",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",letterSpacing:2,minHeight:44,fontWeight:600}}>{t==="itinerary"?"ITINERARY":"TRIP BRIEF"}</button>)}
      </div>}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0,...(isMobile?{flexDirection:"column"}:{})}}>
        {(!isMobile||mobileTab==="itinerary")&&(
          <div style={{width:"42%",overflowY:"auto",padding:12,...(isMobile?{maxHeight:"none",width:"100%",padding:"12px 12px"}:{})}}>
            <div style={{fontSize:isMobile?11:15,color:isMobile?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.85)",letterSpacing:isMobile?2:3,marginBottom:6,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:isMobile?600:400}}>YOUR ITINERARY · TAP TO EDIT</div>
            {(()=>{
              const bAmt=Number(data.budgetAmount)||0;
              const hasBudget=data.budgetMode!=="dream"&&bAmt>0;
              if(!hasBudget)return null;
              const remaining=bAmt-totalCost;
              const pct=totalCost/bAmt;
              const isOver=remaining<0;
              const isWarn=!isOver&&pct>0.9;
              const color=isOver?"#FF6B6B":isWarn?"#c9a04c":"#69F0AE";
              return(
                <div style={{marginBottom:10,padding:"6px 10px",borderRadius:8,background:isOver?"rgba(255,107,107,0.08)":isWarn?"rgba(201,160,76,0.06)":"rgba(105,240,174,0.06)",border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>{isOver?"⚠ OVER BUDGET":isWarn?"NEAR LIMIT":"ON BUDGET"}</span>
                  <span style={{fontSize:13,fontWeight:700,color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fmt(totalCost)} / {fmt(bAmt)} {isOver?`· ${fmt(Math.abs(remaining))} over`:`· ${fmt(Math.abs(remaining))} left`}</span>
                </div>
              );
            })()}
            {items.map((item,i)=>{
              const c=item.color,isEd=editingId===item.id;
              return(
                <div key={item.id} style={{marginBottom:7,background:"#0C1520",borderRadius:11,overflow:"hidden",border:`1px solid ${c}22`,borderLeft:`3px solid ${c}`}}>
                  <div onClick={()=>setEditingId(isEd?null:item.id)} style={{padding:isMobile?"8px 10px":"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,minHeight:44}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:`${c}18`,border:`1px solid ${c}44`,color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}><div style={{fontSize:isMobile?13:15,fontWeight:700,color:"#E8DCC8"}}>{item.flag} {item.destination}</div><div style={{fontSize:isMobile?11:14,color:"rgba(232,220,200,0.7)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}><span style={{color:"rgba(94,139,138,0.75)",fontWeight:600}}>{item.country}</span> · {TI[item.type]} {item.type} · {fmtD(dates[i]?.arrival)}→{fmtD(dates[i]?.departure)}</div></div>
                    <div style={{textAlign:"right",flexShrink:0,paddingRight:4}}><div style={{fontSize:15,fontWeight:700,color:"#C9A04C",paddingRight:2,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{coerceNightsVal(item.nights)}n</div><div style={{fontSize:13,color:"rgba(201,160,76,0.7)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{fmt(coerceCostVal(item.cost))}</div></div>
                    <span style={{fontSize:15,color:"rgba(255,255,255,0.25)",marginLeft:6}}>{isEd?"▲":"▼"}</span>
                  </div>
                  {isEd&&<div style={{padding:"10px 12px 12px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.2)",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>NIGHTS</div><input type="text" inputMode="numeric" style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none"}} value={typeof item.nights==="string"?item.nights:String(item.nights)} onClick={e=>e.stopPropagation()} onChange={e=>{const v=e.target.value;if(v===""||/^\d+$/.test(v))setItems(p=>p.map(it=>it.id===item.id?{...it,nights:v}:it));}} onBlur={()=>commitItemNumeric(item.id)} placeholder="7"/></div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>COST ($)</div><input type="text" inputMode="decimal" style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none"}} value={typeof item.cost==="string"?item.cost:String(item.cost)} onClick={e=>e.stopPropagation()} onChange={e=>{const v=e.target.value;if(v===""||/^\d*\.?\d*$/.test(v))setItems(p=>p.map(it=>it.id===item.id?{...it,cost:v}:it));}} onBlur={()=>commitItemNumeric(item.id)} placeholder="0"/></div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>TYPE</div><select style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",outline:"none",width:"100%"}} value={item.type} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,type:e.target.value}:it))}>{["Exploration","Culture","Dive","Surf","Nature","Trek","Moto","Relax","Transit"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
                  </div>}
                </div>
              );
            })}
            <div style={{padding:"10px 12px",background:"#0C1520",border:"1px solid rgba(201,160,76,0.45)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
              <div><div style={{fontSize:13,color:"rgba(232,220,200,0.55)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{items.length} stops · {countries.length} countries</div><div style={{fontSize:13,color:"rgba(232,220,200,0.4)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>~{fmt(Math.round(totalCost/Math.max(totalNights,1)))}/night</div></div>
              <div style={{fontSize:20,fontWeight:700,color:"#C9A04C",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{fmt(totalCost)}</div>
            </div>
            <button
                  type="button"
                  className="cta-build-btn"
                  style={{ marginTop: 12, minHeight: 52 }}
                  onClick={() => onLaunch(buildHandoff())}
                >
                  {data.isRevision ? "Update Expedition" : "Launch Trip Console"}
                </button>
          </div>
        )}
        {(!isMobile||mobileTab==="chat")&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",borderRight:isMobile?"none":"1px solid #111D2A",...(isMobile?{flex:1,borderTop:"1px solid #111D2A"}:{})}}>
            <div style={{display:isMobile?"none":"flex",alignItems:"center",gap:8,padding:"8px 14px 6px",borderBottom:"1px solid rgba(122,111,93,0.18)",fontSize:13,fontWeight:600,color:"#C9A04C",letterSpacing:2,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",flexShrink:0}}>
                  <Icon icon={data.isRevision?"solar:pen-bold":"solar:stars-bold"} width="14" height="14" style={{color:"#C9A04C"}} aria-hidden />
                  <span>{data.isRevision?"REVISE YOUR EXPEDITION":"CO-ARCHITECT"}</span>
                </div>
            <div style={{flex:1,overflowY:"auto",padding:isMobile?"6px 12px 16px":"6px 20px 20px",display:"flex",flexDirection:"column",gap:10}}>
              {chat.map((msg,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:msg.role==="user"?"row-reverse":"row",animation:"msgIn 0.25s ease"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:msg.role==="ai"?"rgba(201,160,76,0.18)":"#1a2535",border:msg.role==="ai"?"1px solid rgba(201,160,76,0.4)":"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:msg.role==="ai"?"#C9A04C":"rgba(255,255,255,0.5)"}}>
                    {msg.role==="ai" ? <Icon icon="solar:stars-bold" width="12" height="12" style={{color:"#C9A04C"}} aria-hidden /> : "·"}
                  </div>
                  {msg.role==="ai"
                    ?<div style={{flex:1,minWidth:0,width:"100%",maxWidth:isMobile?"100%":"92%",background:"#1F1A14",border:"1px solid rgba(122,111,93,0.50)",borderRadius:14,boxSizing:"border-box",padding:isMobile?"14px 16px":"18px 22px",fontSize:isMobile?15:17,fontFamily:"'Fraunces',serif",fontStyle:"italic",fontWeight:400,color:"#E8DCC8",lineHeight:1.75,whiteSpace:"pre-wrap",wordBreak:"break-word",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)"}}>{(msg.text||"").replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')}</div>
                    :<div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"10px 14px",fontSize:13,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontStyle:"normal",fontWeight:400,color:"#E8DCC8",lineHeight:1.5,maxWidth:isMobile?"100%":"92%"}}>{(msg.text||"").replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')}</div>}
                </div>
              ))}
              {loading&&<div style={{display:"flex",gap:8,alignItems:"center",animation:"msgIn 0.25s ease"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(201,160,76,0.18)",border:"1px solid rgba(201,160,76,0.4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon icon="solar:stars-bold" width="12" height="12" style={{color:"#C9A04C"}} aria-hidden />
                </div>
                <div style={{fontSize:13,color:"rgba(201,160,76,0.7)",animation:"shimmer 1s infinite",padding:"4px 0",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",letterSpacing:0.5}}>thinking...</div>
              </div>}
              <div ref={chatEnd}/>
            </div>
            <div style={{padding:isMobile?"10px 12px":"10px",paddingRight:isMobile?72:10,borderTop:"1px solid #111D2A",display:"flex",gap:5,flexWrap:isMobile?"nowrap":"wrap",overflowX:"auto",flexShrink:0}}>
              {QUICK_ACTIONS.map(a=><button type="button" key={a} onClick={()=>setInput(a)} onMouseEnter={e=>{e.currentTarget.style.background="rgba(201,160,76,0.10)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";}} onTouchStart={e=>{e.currentTarget.style.background="rgba(201,160,76,0.10)";}} onTouchEnd={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";}} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,160,76,0.25)",borderRadius:20,padding:isMobile?"6px 12px":"7px 14px",fontSize:isMobile?11:13,fontWeight:600,color:"#C9A04C",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",minHeight:isMobile?32:36,transition:"background 0.2s ease,border-color 0.2s ease",WebkitTapHighlightColor:"transparent"}}>{a}</button>)}
            </div>
            <div style={{padding:isMobile?"8px 12px":"8px 10px",borderTop:"1px solid #111D2A",display:"flex",gap:7,flexShrink:0,alignItems:"stretch",position:"relative",zIndex:700}}>
              <div className="ca-chat-input-wrap" style={{flex:1,minWidth:0,display:"flex",alignItems:"stretch",borderRadius:8,overflow:"hidden",backgroundColor:"#0C1520",boxSizing:"border-box",border:"1px solid rgba(201,160,76,0.5)"}}>
                <input className="ca-chat-input" style={{flex:1,width:"100%",minWidth:0,backgroundColor:"#0C1520",color:"#E8DCC8",fontSize:isMobile?14:15,padding:"8px 10px",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",outline:"none",minHeight:44,colorScheme:"dark"}} value={input} onChange={e=>setInput(e.target.value)} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendMsg();}}} placeholder="Refine, redirect, dream bigger..."/>
              </div>
              <button type="button" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.16)",borderRadius:8,color:"rgba(201,160,76,0.95)",fontSize:15,padding:"8px 11px",cursor:"pointer",minWidth:44,minHeight:44,alignSelf:"stretch"}} onClick={sendMsg}>↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default CoArchitect;
