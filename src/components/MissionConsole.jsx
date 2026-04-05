import { useState, useEffect, useRef, useCallback } from "react";
import posthog from "posthog-js";
import { useMobile } from '../hooks/useMobile';
import { askAI } from '../utils/aiHelpers';
import { fmt, daysBetween } from '../utils/dateHelpers';
import { urgencyColor } from '../constants/colors';
import { loadSeg, saveSeg, loadCoach, loadOnboard, loadReturn, saveReturn, TI } from '../utils/storageHelpers';
import { STATUS_CFG, STATUS_NEXT } from '../utils/tripConsoleHelpers';
import { toSegPhases } from '../utils/tripHelpers';
import ConsoleHeader from './ConsoleHeader';
import BottomNav from './BottomNav';
import CoachOverlay from './CoachOverlay';
import OnboardCard from './OnboardCard';
import WorldMapBackground from './WorldMapBackground';
import SDF from './SDF';
import PhaseCard from './PhaseCard';
import PhaseDetailPage from './PhaseDetailPage';
import Timeline from './Timeline';
import IntelMap from './IntelMap';

function MissionConsole({tripData,onNewTrip,onRevise,onPackConsole,onHomecoming,isFullscreen,setFullscreen,initialTab="next",segmentSuggestions,suggestionsLoading}) {
  const isMobile=useMobile();
  const [tab,setTab]=useState(initialTab);
  useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});posthog.capture("$pageview",{$current_url:"/trip-console"});},[]);
  const [confirmNewTrip,setConfirmNewTrip]=useState(false);
  const [showMobileMenu,setShowMobileMenu]=useState(false);
  const [explorerDest,setExplorerDest]=useState(null);
  const [explorerData,setExplorerData]=useState(()=>{try{const s=localStorage.getItem("1bn_intel");return s?JSON.parse(s):{}}catch(e){return{};}});
  const [loadingIntel,setLoadingIntel]=useState(false);
  const [showCoach,setShowCoach]=useState(()=>{try{if(localStorage.getItem("1bn_hide_all_tips")==="1")return false;}catch(e){}return!loadCoach().trip;});
  const [showOnboard,setShowOnboard]=useState(()=>{try{if(localStorage.getItem("1bn_hide_all_tips")==="1")return false;}catch(e){}return!loadOnboard().trip;});
  const [phaseDetailView,setPhaseDetailView]=useState(null);
  const [warningFlags,setWarningFlags]=useState(()=>{try{const s=localStorage.getItem('1bn_warnings_v1');return s?JSON.parse(s):[];}catch(e){return[];}});
  useEffect(()=>{try{localStorage.setItem('1bn_warnings_v1',JSON.stringify(warningFlags));}catch(e){}},[warningFlags]);
  const dismissWarning=(idx)=>setWarningFlags(f=>f.filter((_,i)=>i!==idx));
  useEffect(()=>{try{localStorage.setItem("1bn_intel",JSON.stringify(explorerData));}catch(e){};},[explorerData]);

  function handleNewTripClick(){if(confirmNewTrip){onNewTrip();}else{setConfirmNewTrip(true);setTimeout(()=>setConfirmNewTrip(false),4000);}}

  const TODAY=new Date();
  const daysToDepart=daysBetween(TODAY,new Date(tripData.startDate||"2026-09-16"));
  const uc=urgencyColor(daysToDepart);
  const segPhases=tripData.segmentedPhases||toSegPhases(tripData.phases||[]);
  const totalNights=segPhases.reduce((s,p)=>s+p.totalNights,0);
  const totalBudget=segPhases.reduce((s,p)=>s+p.totalBudget,0);
  const totalDives=segPhases.reduce((s,p)=>s+p.totalDives,0);
  const flatPhases=tripData.phases||[];
  const lastSeg=segPhases[segPhases.length-1];
  const isComplete=lastSeg&&new Date()>new Date((lastSeg.departure||"2099-01-01")+"T12:00:00");
  const [returnData,setReturnData]=useState(()=>loadReturn());
  useEffect(()=>saveReturn(returnData),[returnData]);
  const uR=(f,v)=>setReturnData(d=>({...d,flight:{...d.flight,[f]:v}}));

  async function openIntel(dest,phaseName,type){
    setExplorerDest({destination:dest,phaseName,type});setTab("intel");
    if(explorerData[dest]&&!explorerData[dest].error)return;
    setLoadingIntel(true);
    try{
      const raw=await askAI(`Elite travel intel. Destination:"${dest}"(${phaseName},${type}). Return ONLY raw JSON:{tagline,mustDo:[4],hiddenGems:[3],food:[3],culture,climate,warnings:[2],diveHighlight,vibe,streetIntel:[{type,alert}×4]}`,1400);
      const m=raw.match(/{[\s\S]*}/);if(!m)throw 0;
      setExplorerData(p=>({...p,[dest]:JSON.parse(m[0])}));
    }catch(e){setExplorerData(p=>({...p,[dest]:{error:true,errorMsg:"Could not load intel. Check connection and retry."}}));}
    setLoadingIntel(false);
  }

  const heroStats=[{label:"DEPARTS IN",value:daysToDepart,unit:"DAYS",color:"#FFD93D",glow:"rgba(255,217,61,0.35)"},{label:"NIGHTS",value:totalNights,unit:"NIGHTS",color:"#E8DCC8",glow:"rgba(232,220,200,0.2)"},...(totalDives>0?[{label:"DIVES",value:totalDives,unit:"DIVES",color:"#00E5FF",glow:"rgba(0,229,255,0.4)"}]:[]),{label:"BUDGET",value:fmt(totalBudget),unit:"TOTAL",color:"#FFD93D",glow:"rgba(255,217,61,0.35)"}];
  const TABS=[{id:"next",label:"🗺️ EXPEDITION"},{id:"budget",label:"💰 BUDGET"},{id:"book",label:"🗓 TIMELINE"},{id:"intel",label:"🔭 INTEL"},{id:"blueprint",label:isMobile?"✦":"✦ BLUEPRINT"}];
  const {changedSegs,cancelledSegs}=(()=>{const allSeg=loadSeg();const cs=[],xs=[];segPhases.forEach(p=>p.segments.forEach(s=>{const d=allSeg[`${p.id}-${s.id}`]||{};const st=d.status||'planning';if(st==='changed')cs.push({phase:p,seg:s});if(st==='cancelled')xs.push({phase:p,seg:s});}));return{changedSegs:cs,cancelledSegs:xs};})();

  return(
    <div className="mc-root" style={{animation:"consoleIn 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
      <WorldMapBackground phases={tripData.phases||[]} activeCountry={phaseDetailView?.country}/>
      {phaseDetailView&&<PhaseDetailPage phase={phaseDetailView} intelData={explorerData} onBack={()=>setPhaseDetailView(null)} segmentSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading} homeCity={tripData.departureCity||tripData.city||""} segPhases={segPhases} warningFlags={warningFlags} onDismissWarning={dismissWarning} allPhases={tripData.phases||[]}/>}
      {showOnboard&&<OnboardCard storageKey="trip" ctaLabel="✦ ENTER MY EXPEDITION" onDismiss={()=>setShowOnboard(false)}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,letterSpacing:4,color:"rgba(0,229,255,0.75)",marginBottom:10}}>TRIP CONSOLE</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:700,fontStyle:"italic",color:"#FF9F43",lineHeight:1.2,marginBottom:10}}>Your expedition is live.</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.65)",lineHeight:1.7}}>Every leg of your journey — planned, budgeted, and briefed. Here's how to navigate your console.</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:4}}>
          {[
            {icon:"🗺️",label:"EXPEDITION",color:"#00E5FF",desc:"Country-by-country breakdown. Tap any card to expand segments, add stays, transport, and activities."},
            {icon:"💰",label:"BUDGET",color:"#FFD93D",desc:"Real-time cost tracking across every leg. See where your money goes before you leave."},
            {icon:"🔗",label:"BOOK",color:"#69F0AE",desc:"Direct links for flights, stays, and experiences — everything to action in one place."},
            {icon:"🔭",label:"INTEL",color:"#A29BFE",desc:"Co-Architect briefings for every stop. Local tips, must-dos, food, street intel, and culture."},
          ].map(t=>(
            <div key={t.label} style={{display:"flex",gap:8,alignItems:"flex-start",padding:isMobile?"6px 8px":"8px 10px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:`1px solid ${t.color}44`}}>
              <span style={{fontSize:isMobile?13:14,flexShrink:0,marginTop:1}}>{t.icon}</span>
              <div style={{minWidth:0}}>
                <span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:isMobile?11:13,fontWeight:700,letterSpacing:2,color:t.color}}>{t.label}</span>
                <span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:isMobile?11:13,color:"rgba(255,255,255,0.65)",marginLeft:5}}>{t.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:16,fontFamily:"'Fraunces',serif",fontSize:12,fontStyle:"italic",color:"rgba(255,217,61,0.55)",textAlign:"center",lineHeight:1.6}}>Built by your co-architect. Now it's yours to command.</div>
      </OnboardCard>}
      {!showOnboard&&showCoach&&<CoachOverlay storageKey="trip" accentColor="#00E5FF" onDismiss={()=>setShowCoach(false)} steps={[
        {target:"trip-stats",title:"Your Mission Dashboard",body:"Countdown, nights, dives, and budget — your expedition at a glance."},
        {target:"trip-phases",title:"Country Phases",body:"Each card is a country. Tap to expand and see the segments within."},
        {target:"trip-tabs",title:"Explore Your Data",body:"Switch between Expedition, Budget, Booking links, and Intel views."},
        {target:"trip-intel",title:"Destination Intel",body:"Co-Architect briefings — local tips, must-dos, food, culture, and street intel for every stop."},
        {target:"trip-pack-switch",title:"Pack Console",body:"When you're ready, switch here to manage your one-bag gear list."}
      ]}/>}
      {!isFullscreen&&<ConsoleHeader console="trip" isMobile={isMobile} onTripConsole={()=>{}} onPackConsole={onPackConsole}/>}
      {isMobile&&!isFullscreen&&<div style={{padding:"5px 16px",borderBottom:"1px solid rgba(0,229,255,0.08)",display:"flex",justifyContent:"space-between",background:"rgba(0,8,20,0.98)",flexShrink:0,position:"relative",zIndex:1}}>
        <button onClick={onRevise} style={{padding:"6px 16px",borderRadius:7,border:"1.5px solid rgba(0,229,255,0.55)",background:"rgba(0,229,255,0.12)",color:"#00E5FF",fontSize:14,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,minHeight:32}}>✏️ REVISE</button>
        <button onClick={handleNewTripClick} style={{padding:"6px 14px",borderRadius:7,border:confirmNewTrip?"1px solid rgba(255,107,107,0.5)":"1px solid rgba(255,255,255,0.18)",background:confirmNewTrip?"rgba(255,107,107,0.12)":"transparent",color:confirmNewTrip?"#FF6B6B":"rgba(255,255,255,0.45)",fontSize:13,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:confirmNewTrip?700:400,letterSpacing:1,minHeight:32}}>{confirmNewTrip?"⚠️ CONFIRM?":"+ NEW TRIP"}</button>
      </div>}
      {!isFullscreen&&<div style={{padding:isMobile?"8px 12px 6px":"10px 16px 8px",background:isMobile?"rgba(0,8,16,0.10)":"linear-gradient(180deg,rgba(21,15,10,0.98),rgba(21,15,10,0.99))",borderBottom:"1px solid rgba(232,220,200,0.06)",position:"relative",overflow:"hidden",zIndex:1}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 50%,rgba(232,220,200,0.02) 0%,transparent 60%)",pointerEvents:"none"}}/>
        {tripData.tripName&&<div style={{marginBottom:isMobile?5:7,position:"relative"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:17,fontWeight:300,fontStyle:"italic",color:"#E8DCC8",lineHeight:1}}>{tripData.tripName}</div>
          {!isMobile&&<div style={{fontSize:15,color:"rgba(232,220,200,0.45)",letterSpacing:2,marginTop:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{[...new Set(flatPhases.map(p=>p.country))].join(" · ")}</div>}
        </div>}
        {isMobile?(()=>{
          const allSegD=loadSeg();
          let totalSegs=0,filledSegs=0;
          segPhases.forEach(p=>p.segments.forEach(s=>{totalSegs++;const d=allSegD[`${p.id}-${s.id}`]||{};if(d.transport?.mode||d.transport?.cost||d.stay?.name||d.stay?.cost||(d.activities?.length||0)>0)filledSegs++;}));
          const readPct=totalSegs>0?Math.round((filledSegs/totalSegs)*100):0;
          return(
            <div data-coach="trip-stats" style={{background:'rgba(10,7,5,0.55)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderRadius:14,border:'1.5px solid rgba(0,229,255,0.35)',borderTop:'1.5px solid rgba(0,229,255,0.65)',boxShadow:'inset 0 1px 0 rgba(0,229,255,0.30), 0 4px 24px rgba(0,0,0,0.35)',overflow:'hidden'}}>
              <div style={{padding:'10px 16px 9px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                  <span style={{fontSize:9,letterSpacing:'0.12em',color:'rgba(0,229,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>EXPEDITION READINESS</span>
                  <span style={{fontSize:20,fontWeight:700,color:'#00E5FF',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{readPct}%</span>
                </div>
                <div style={{width:'100%',height:6,background:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${readPct}%`,background:'linear-gradient(90deg,#00E5FF88,#00E5FF)',borderRadius:3,transition:'width 0.6s ease'}}/>
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{filledSegs} of {totalSegs} planning tasks complete</div>
              </div>
              <div style={{height:1,background:'rgba(0,229,255,0.12)'}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',overflow:'hidden'}}>
                {[{label:'DEPARTS IN',value:daysToDepart,sub:'DAYS',color:'#E8DCC8'},{label:'NIGHTS',value:totalNights,sub:'NIGHTS',color:'#E8DCC8'},{label:'BUDGET',value:fmt(totalBudget),sub:'TOTAL',color:'#FFD93D'}].map((s,i)=>(
                  <div key={s.label} style={{textAlign:'center',padding:'8px 4px'}}>
                    <div style={{fontSize:9,letterSpacing:'0.10em',color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:3}}>{s.label}</div>
                    <div style={{fontSize:19,fontWeight:700,color:s.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.65)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:2}}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })():(
          <div data-coach="trip-stats" style={{background:'rgba(0,10,25,0.30)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',border:'1.5px solid rgba(0,229,255,0.35)',borderTop:'2px solid rgba(0,229,255,0.75)',borderRadius:12,padding:'4px 0',overflow:'hidden'}}>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${heroStats.length},1fr)`,position:"relative"}}>
              {heroStats.map((s,i)=>(
                <div key={s.label} style={{textAlign:"center",padding:"4px 6px",borderLeft:i>0?"1px solid rgba(255,255,255,0.10)":"none"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(232,220,200,0.5)",letterSpacing:3,marginBottom:4,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>{s.label}</div>
                  <div className="stat-val" style={{fontSize:26,fontWeight:700,lineHeight:1,color:s.label==="BUDGET"?"#FFD93D":"#E8DCC8",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",animationDelay:`${i*0.1}s`}}>{s.value}</div>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(232,220,200,0.4)",letterSpacing:2,marginTop:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{s.unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}
      {!isFullscreen&&!isMobile&&<div style={{display:"flex",borderBottom:"1px solid rgba(0,229,255,0.1)",border:"1px solid rgba(255,255,255,0.10)",borderTop:"1px solid rgba(255,255,255,0.18)",background:"rgba(0,15,30,0.50)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",flexShrink:0,position:"relative",zIndex:1}}>
        <div style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,borderRight:"1px solid rgba(0,229,255,0.1)",borderBottom:"2px solid #00E5FF",background:"rgba(0,229,255,0.04)"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#00E5FF",boxShadow:"0 0 6px #00E5FF",animation:"consolePulse 2.5s ease-in-out infinite"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"#00E5FF",letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>TRIP CONSOLE</span>
        </div>
        <div data-coach="trip-pack-switch" onClick={onPackConsole} style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",background:"transparent",opacity:0.55}} onMouseOver={e=>{e.currentTarget.style.background="rgba(196,87,30,0.08)";e.currentTarget.style.opacity="1";}} onMouseOut={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.opacity="0.55";}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"rgba(196,87,30,0.4)"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"rgba(255,159,67,0.65)",letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>PACK CONSOLE</span>
        </div>
      </div>}
      {/* Tab bar */}
      {!isMobile&&(
        <div style={{display:"flex",borderBottom:"1px solid rgba(232,220,200,0.06)",background:"rgba(0,15,35,0.95)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",alignItems:"stretch",position:"relative",zIndex:1}}>
          <button onClick={()=>setFullscreen(f=>!f)} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"10px 14px",background:isFullscreen?"rgba(0,229,255,0.15)":"rgba(0,229,255,0.06)",border:"none",borderRight:"1px solid rgba(0,229,255,0.2)",cursor:"pointer",flexShrink:0,color:"#00E5FF"}} onMouseOver={e=>e.currentTarget.style.background="rgba(0,229,255,0.22)"} onMouseOut={e=>e.currentTarget.style.background=isFullscreen?"rgba(0,229,255,0.15)":"rgba(0,229,255,0.06)"}>
            <span style={{fontSize:15,lineHeight:1,textShadow:"0 0 10px rgba(0,229,255,0.9)"}}>{isFullscreen?"⊡":"⛶"}</span>
            <span style={{fontSize:15,letterSpacing:1,fontWeight:700,whiteSpace:"nowrap"}}>{isFullscreen?"EXIT":"EXPAND"}</span>
          </button>
          <div data-coach="trip-tabs" style={{display:"flex",flex:1,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} {...(t.id==="intel"?{"data-coach":"trip-intel"}:{})} className={"mc-tab "+(tab===t.id?"active":"")} onClick={()=>{setTab(t.id);if(t.id!=="intel")setExplorerDest(null);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"9px 12px",minWidth:44}}>
                <span style={{fontSize:15}}>{t.label.split(" ")[0]}</span>
                <span style={{fontSize:15,letterSpacing:1.5}}>{t.label.split(" ").slice(1).join(" ")}</span>
              </button>
            ))}
          </div>
          <button onClick={onRevise} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 12px",background:"rgba(0,229,255,0.06)",border:"none",borderLeft:"1px solid rgba(0,229,255,0.15)",cursor:"pointer",flexShrink:0}} onMouseOver={e=>e.currentTarget.style.background="rgba(0,229,255,0.14)"} onMouseOut={e=>e.currentTarget.style.background="rgba(0,229,255,0.06)"}>
            <span style={{fontSize:15,lineHeight:1}}>✏️</span><span style={{fontSize:15,letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:"#00E5FF",whiteSpace:"nowrap",fontWeight:700}}>REVISE</span>
          </button>
          <button onClick={handleNewTripClick} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 14px",borderLeft:confirmNewTrip?"1px solid rgba(255,107,107,0.5)":"1px solid rgba(169,70,29,0.4)",background:confirmNewTrip?"rgba(255,107,107,0.15)":"rgba(169,70,29,0.08)",border:"none",cursor:"pointer",flexShrink:0,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minWidth:confirmNewTrip?72:50}} onMouseOver={e=>e.currentTarget.style.background=confirmNewTrip?"rgba(255,107,107,0.22)":"rgba(169,70,29,0.18)"} onMouseOut={e=>e.currentTarget.style.background=confirmNewTrip?"rgba(255,107,107,0.15)":"rgba(169,70,29,0.08)"}>
            <span style={{fontSize:15,color:confirmNewTrip?"#FF6B6B":"#FFD93D",lineHeight:1}}>{confirmNewTrip?"⚠️":"+"}</span>
            <span style={{fontSize:15,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:confirmNewTrip?"#FF6B6B":"#FFD93D",whiteSpace:"nowrap",fontWeight:700,textAlign:"center"}}>{confirmNewTrip?"CONFIRM?":"NEW TRIP"}</span>
          </button>
        </div>
      )}
      {confirmNewTrip&&<div style={{padding:"7px 14px",background:"rgba(255,107,107,0.1)",borderBottom:"1px solid rgba(255,107,107,0.3)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"relative",zIndex:1}}>
        <span style={{fontSize:15,color:"rgba(255,107,107,0.9)",letterSpacing:1}}>⚠️ This will clear your expedition. Tap CONFIRM? again to proceed.</span>
        <button onClick={()=>setConfirmNewTrip(false)} style={{fontSize:15,color:"rgba(255,255,255,0.4)",background:"none",border:"none",cursor:"pointer",padding:"2px 6px"}}>✕</button>
      </div>}
      <div className="mc-content" style={{position:"relative",zIndex:1}}>
        {tab==="next"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {isComplete&&<div onClick={onHomecoming} style={{marginBottom:4,padding:"11px 14px",background:"linear-gradient(135deg,rgba(255,217,61,0.1),rgba(255,159,67,0.06))",border:"1px solid rgba(255,217,61,0.35)",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:8,animation:"consolePulse 2.8s ease-in-out infinite"}} onMouseOver={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(255,217,61,0.18),rgba(255,159,67,0.12))"} onMouseOut={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(255,217,61,0.1),rgba(255,159,67,0.06))"}>
              <span style={{fontSize:16}}>🏆</span>
              <span style={{fontSize:11,fontWeight:700,color:"#FFD93D",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flex:1}}>✦ EXPEDITION COMPLETE · TAP TO CELEBRATE</span>
              <span style={{fontSize:12,color:"rgba(255,217,61,0.5)"}}>→</span>
            </div>}
            {tripData.visionNarrative&&(()=>{const _vn=tripData.visionNarrative;const _lim=160;const _trunc=_vn.length>_lim?_vn.slice(0,_lim).slice(0,_vn.slice(0,_lim).lastIndexOf(' '))+'...':_vn;return(<div style={{marginBottom:8}}><div style={{fontSize:11,color:"rgba(232,220,200,0.50)",letterSpacing:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:6}}>✦ EXPEDITION VISION</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:15,fontWeight:300,fontStyle:"italic",color:"rgba(255,240,210,0.80)",lineHeight:1.75,borderLeft:"2px solid rgba(232,220,200,0.12)",paddingLeft:12,textAlign:"left"}}>"{_trunc}"</div></div>);})()}
            <div style={{fontSize:isMobile?12:14,color:"#E8DCC8",letterSpacing:isMobile?1.5:2.5,marginBottom:4,fontWeight:500,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:isMobile?"normal":"nowrap"}}>YOUR EXPEDITION · {segPhases.length} PHASES</div>
            {isMobile&&<div style={{fontSize:15,color:"rgba(232,220,200,0.45)",letterSpacing:1.5,marginBottom:4,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>TAP PHASE TO EXPAND</div>}
            {segPhases.map((phase,i)=>i===0?<div key={phase.id} data-coach="trip-phases"><PhaseCard phase={phase} intelData={explorerData} idx={i} onTap={p=>setPhaseDetailView(p)} allSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading}/></div>:<PhaseCard key={phase.id} phase={phase} intelData={explorerData} idx={i} onTap={p=>setPhaseDetailView(p)} allSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading}/>)}
          </div>
        )}
        {tab==="budget"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[{label:"EXPEDITION TOTAL",value:fmt(totalBudget),color:"#FFD93D",sub:`across ${flatPhases.length} phases`},{label:"AVG / NIGHT",value:fmt(totalBudget/Math.max(totalNights,1)),color:"#A29BFE",sub:`${totalNights} nights`},{label:"AVG / PHASE",value:fmt(totalBudget/Math.max(flatPhases.length,1)),color:"#00E5FF",sub:"per destination"}].map((s,si)=>(
                <div key={s.label} style={{background:"linear-gradient(135deg,rgba(0,8,20,0.8),rgba(0,20,40,0.6))",border:"1px solid rgba(0,229,255,0.12)",borderRadius:10,padding:isMobile?"8px 10px":"12px 14px",textAlign:"center",gridColumn:isMobile&&si===2?"1 / -1":"auto"}}>
                  <div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.6)",letterSpacing:isMobile?0:1,marginBottom:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600}}>{s.label}</div>
                  <div style={{fontSize:isMobile?16:22,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.45)",marginTop:2}}>{s.sub}</div>
                </div>
              ))}
            </div>
            {(()=>{const bd=tripData.budgetBreakdown;if(!bd)return null;const cats=[{key:"flights",icon:"✈️",label:"FLIGHTS",color:"#00E5FF",note:bd.flightsNote},{key:"accommodation",icon:"🏨",label:"ACCOMMODATION",color:"#A29BFE",note:bd.accommodationNote},{key:"food",icon:"🍽️",label:"FOOD & DRINK",color:"#FFD93D",note:bd.foodNote},{key:"transport",icon:"🚌",label:"TRANSPORT",color:"#69F0AE",note:null},{key:"activities",icon:"🎯",label:"ACTIVITIES",color:"#FF9F43",note:null},{key:"buffer",icon:"🛡️",label:"BUFFER",color:"rgba(255,255,255,0.5)",note:null}];const maxCat=Math.max(...cats.map(c=>bd[c.key]||0),1);return(
              <div style={{marginBottom:16,background:"linear-gradient(135deg,rgba(0,8,20,0.7),rgba(0,20,40,0.4))",border:"1px solid rgba(255,217,61,0.12)",borderRadius:10,padding:isMobile?"10px 12px":"14px 16px"}}>
                <div style={{fontSize:11,color:"rgba(255,217,61,0.7)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:10}}>BUDGET BREAKDOWN</div>
                {cats.map(c=>{const val=bd[c.key]||0;const pct=(val/maxCat)*100;return(
                  <div key={c.key} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13}}>{c.icon}</span><span style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.7)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1}}>{c.label}</span></div>
                      <span style={{fontSize:isMobile?13:15,fontWeight:900,color:c.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fmt(val)}</span>
                    </div>
                    <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${c.color}66,${c.color})`,borderRadius:3,transition:"width 0.6s ease"}}/></div>
                    {c.note&&<div style={{fontSize:isMobile?10:12,color:"rgba(255,255,255,0.4)",fontStyle:"italic",marginTop:2}}>{c.note}</div>}
                  </div>
                );})}
                {bd.routingNote&&<div style={{marginTop:8,padding:"8px 10px",background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.1)",borderRadius:6,fontSize:isMobile?11:13,color:"rgba(255,255,255,0.55)",fontStyle:"italic",lineHeight:1.5}}>🗺️ {bd.routingNote}</div>}
              </div>
            );})()}
            {flatPhases.map(phase=>{
              const budget=phase.budget||phase.cost||0;
              const pct=(budget/Math.max(...flatPhases.map(p=>p.budget||p.cost||0)))*100;
              return(
                <div key={phase.id} style={{background:"rgba(0,8,20,0.5)",border:"1px solid rgba(0,229,255,0.08)",borderRadius:8,padding:"9px 13px",borderLeft:"3px solid "+phase.color,marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                      <span style={{fontSize:15}}>{phase.flag}</span>
                      <div><div style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FF9F43"}}>{phase.name}</div><div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.55)"}}>{phase.nights}n · <span style={{color:"#FF9F43",fontWeight:600}}>{phase.country}</span></div></div>
                    </div>
                    <span style={{fontSize:15,fontWeight:900,color:phase.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>{fmt(budget)}</span>
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${phase.color}88,${phase.color})`,borderRadius:3,transition:"width 0.6s ease"}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.5)"}}>{fmt(Math.round(budget/Math.max(phase.nights,1)))}/night</div><div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.4)"}}>{Math.round(pct)}% of max</div></div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="book"&&(
          <Timeline tripData={tripData}/>
        )}
        {/* arch #2: full INTEL tab preserved */}
        {tab==="intel"&&(
          <div>
            {!explorerDest?(
              <div>
                <IntelMap tripData={tripData} isMobile={isMobile} onSelectPhase={(phase)=>openIntel(phase.name,phase.name,phase.type)}/>
              </div>
            ):(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
                  <button onClick={()=>setExplorerDest(null)} style={{background:"none",border:"1px solid #111D2A",borderRadius:4,color:"#FFF",fontSize:15,padding:"4px 9px",cursor:"pointer",minHeight:36,marginRight:10}}>← BACK</button>
                  <div><div style={{fontSize:15,fontWeight:700,color:"#FFF"}}>{explorerDest.destination}</div><div style={{fontSize:15,color:"rgba(255,255,255,0.5)",letterSpacing:2}}>{TI[explorerDest.type]} {explorerDest.type?.toUpperCase()}</div></div>
                </div>
                {loadingIntel?<div>{[80,65,72,55,68].map((w,i)=><div key={i} className="loading-skeleton" style={{width:w+"%"}}/>)}<div style={{color:"rgba(255,255,255,0.4)",fontSize:15,letterSpacing:2,marginTop:6}}>LOADING INTEL...</div></div>
                :explorerData[explorerDest.destination]?(()=>{
                  const d=explorerData[explorerDest.destination];
                  if(d.error)return(<div style={{textAlign:"center",padding:"30px 20px"}}><div style={{fontSize:32,marginBottom:16}}>📡</div><div style={{fontSize:15,color:"#FF6B6B",marginBottom:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>Intel unavailable</div><div style={{fontSize:15,color:"rgba(255,255,255,0.4)",marginBottom:20,lineHeight:1.6}}>{d.errorMsg}</div><button style={{background:"rgba(255,107,107,0.15)",border:"1px solid #FF6B6B44",borderRadius:8,color:"#FF6B6B",fontSize:15,padding:"10px 20px",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:44}} onClick={()=>{setExplorerData(p=>({...p,[explorerDest.destination]:undefined}));openIntel(explorerDest.destination,explorerDest.phaseName,explorerDest.type);}}>↺ RETRY</button></div>);
                  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {d.tagline&&<div style={{fontSize:15,color:"#A29BFE",fontStyle:"italic",borderLeft:"3px solid #A29BFE",paddingLeft:11}}>{d.tagline}</div>}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                      {d.mustDo&&<div className="intel-section"><div className="intel-section-label" style={{color:"#00E5FF"}}>⚡ MUST DO</div>{d.mustDo.map((item,i)=><div key={i} style={{fontSize:isMobile?13:15,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.hiddenGems&&<div className="intel-section"><div className="intel-section-label" style={{color:"#69F0AE"}}>💎 HIDDEN GEMS</div>{d.hiddenGems.map((item,i)=><div key={i} style={{fontSize:isMobile?13:15,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.food&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FFD93D"}}>🍽️ FOOD</div>{d.food.map((item,i)=><div key={i} style={{fontSize:isMobile?13:15,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.warnings?.length>0&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FF6B6B"}}>⚠️ HEADS UP</div>{d.warnings.map((item,i)=><div key={i} style={{fontSize:isMobile?13:15,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                    </div>
                    {d.streetIntel?.length>0&&<div style={{background:"linear-gradient(135deg,rgba(255,107,107,0.07),rgba(255,159,67,0.05))",border:"1px solid rgba(255,107,107,0.4)",borderRadius:10,padding:13}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><div style={{width:7,height:7,borderRadius:"50%",background:"#FF6B6B",boxShadow:"0 0 8px #FF6B6B"}}/><div style={{fontSize:15,color:"#FF6B6B",letterSpacing:3,fontWeight:700}}>STREET INTEL</div></div>
                      {d.streetIntel.map((intel,i)=>{const tc2={SCAM:"#FF6B6B",LEGAL:"#FFD93D",HEALTH:"#69F0AE",MONEY:"#FF9F43"};const ti2={SCAM:"🎭",LEGAL:"⚖️",HEALTH:"🏥",MONEY:"💸"};const c=tc2[intel.type]||"#FF6B6B";return(<div key={i} className="street-card" style={{borderLeft:`3px solid ${c}`}}><span style={{fontSize:15,flexShrink:0}}>{ti2[intel.type]||"⚠️"}</span><div><div style={{fontSize:15,letterSpacing:2,fontWeight:700,marginBottom:3,color:c}}>{intel.type}</div><div style={{fontSize:15,color:"#FFF",lineHeight:1.6}}>{intel.alert}</div></div></div>);})}
                    </div>}
                    {d.culture&&<div className="intel-section"><div className="intel-section-label" style={{color:"#A29BFE"}}>🏛️ CULTURE & VIBE</div><div style={{fontSize:isMobile?13:15,color:"#FFF",lineHeight:1.6}}>{d.culture}</div></div>}
                    {d.climate&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FF9F43"}}>🌤️ CLIMATE</div><div style={{fontSize:isMobile?13:15,color:"#FFF"}}>{d.climate}</div></div>}
                    {d.diveHighlight&&<div className="intel-section" style={{borderColor:"rgba(0,229,255,0.2)"}}><div className="intel-section-label" style={{color:"#00E5FF"}}>🤿 DIVE INTEL</div><div style={{fontSize:isMobile?13:15,color:"#FFF"}}>{d.diveHighlight}</div></div>}
                  </div>);
                })():null}
              </div>
            )}
          </div>
        )}
        {tab==="blueprint"&&(
          <div>
            {(tripData.budgetBreakdown||tripData.phases?.length>0)?(
              <div>
                {(tripData.visionNarrative||tripData.vision)&&<div style={{borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:12,marginBottom:18}}><div style={{fontSize:14,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:4}}>✦ ORIGINAL VISION</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:16,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.7}}>"{tripData.visionNarrative||tripData.vision}"</div></div>}
                {(()=>{const bd=tripData.budgetBreakdown;if(!bd)return <div style={{padding:"12px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:11,marginBottom:16}}><div style={{fontSize:14,color:"rgba(255,159,67,0.65)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:6}}>✦ BUDGET OVERVIEW</div><div style={{fontSize:14,fontWeight:700,color:"#FFD93D",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>Total: {fmt(tripData.totalBudget||0)}</div><div style={{fontSize:14,color:"rgba(255,255,255,0.50)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:4}}>{tripData.phases?.length||0} phases · {segPhases.reduce((s,p)=>s+p.totalNights,0)} nights</div></div>;const cats=[{key:"flights",icon:"✈️",label:"Flights",note:bd.flightsNote},{key:"accommodation",icon:"🏨",label:"Accommodation",note:bd.accommodationNote},{key:"food",icon:"🍜",label:"Food",note:bd.foodNote},{key:"transport",icon:"🚌",label:"Transport",note:null},{key:"activities",icon:"🎯",label:"Activities",note:null},{key:"buffer",icon:"🎒",label:"Buffer",note:null}].filter(c=>bd[c.key]>0);const total=cats.reduce((s,c)=>s+(bd[c.key]||0),0);return(
                  <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.08),rgba(0,8,20,0.6))",border:"1px solid rgba(169,70,29,0.3)",borderRadius:11,padding:"12px 14px",marginBottom:16}}>
                    <div style={{fontSize:14,color:"rgba(255,159,67,0.85)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:10}}>✦ BUDGET BLUEPRINT</div>
                    {cats.map(c=>{const val=bd[c.key]||0;return(
                      <div key={c.key} style={{display:"flex",alignItems:"center",padding:"7px 0",gap:8}}>
                        <span style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}>{c.icon}</span>
                        <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.75)",fontWeight:600,width:isMobile?90:110,flexShrink:0}}>{c.label}</span>
                        <span style={{flex:1,fontSize:isMobile?11:13,fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"rgba(255,255,255,0.45)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.note||""}</span>
                        <span style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FFD93D",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>~{fmt(val)}</span>
                      </div>
                    );})}
                    <div style={{height:1,background:"rgba(255,255,255,0.12)",margin:"8px 0"}}/>
                    <div style={{display:"flex",alignItems:"center",padding:"4px 0",gap:8}}>
                      <span style={{fontSize:14,width:22,flexShrink:0}}> </span>
                      <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.9)",fontWeight:700,width:isMobile?90:110,flexShrink:0}}>TOTAL</span>
                      <span style={{flex:1}}/>
                      <span style={{fontSize:isMobile?14:16,fontWeight:900,color:"#FFD93D",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>~{fmt(total)}</span>
                    </div>
                    {bd.routingNote&&<div style={{marginTop:10,borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:10}}><div style={{fontSize:14,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:3}}>✦ WHY THIS ROUTE</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:15,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>{bd.routingNote}</div></div>}
                  </div>
                );})()}
              </div>
            ):(
              <div style={{textAlign:"center",padding:"40px 20px"}}>
                <div style={{fontSize:32,marginBottom:12}}>✦</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:16,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.55)",lineHeight:1.7}}>Complete your first expedition to unlock your Blueprint.</div>
              </div>
            )}
          </div>
        )}
      </div>
      {(()=>{try{return localStorage.getItem("1bn_hide_all_tips")!=="1";}catch(e){return true;}})()&&<div style={{padding:"12px 16px",textAlign:"center"}}><button onClick={()=>{try{localStorage.setItem("1bn_hide_all_tips","1");}catch(e){}setShowCoach(false);setShowOnboard(false);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.50)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,padding:"6px 12px"}} onMouseOver={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"} onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,0.50)"}>Hide all tips</button></div>}
      {isMobile&&!isFullscreen&&!phaseDetailView&&<div style={{height:"calc(64px + env(safe-area-inset-bottom))"}}/>}
      {isMobile&&!isFullscreen&&<div style={{opacity:phaseDetailView?0:1,pointerEvents:phaseDetailView?"none":"auto",transition:"opacity 0.35s cubic-bezier(0.25,0.46,0.45,0.94)"}}><BottomNav activeTab={tab} onTab={t=>{if(t==="pack")onPackConsole();else{setTab(t);if(t!=="intel")setExplorerDest(null);}}}/></div>}
    </div>
  );
}

// CircularRing, getPackBrief, PackConsole — imported from components/PackConsole.jsx

// AmbientChat — imported from components/AmbientChat.jsx


export default MissionConsole;
