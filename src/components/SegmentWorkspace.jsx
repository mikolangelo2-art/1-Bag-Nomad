import { useState, useEffect, useRef, useCallback } from "react";
import { useMobile } from '../hooks/useMobile';
import { askAI } from '../utils/aiHelpers';
import { fmt, fD } from '../utils/dateHelpers';
import { loadSeg, saveSeg } from '../utils/storageHelpers';
import { detectMode, findSuggestionForSegment, loadSuggestionsFromStorage, loadDismissed, saveDismissed, suggestionCardStyle, suggestionHeaderStyle, disclaimerStyle, acceptBtnStyle, dismissBtnStyle } from '../utils/tripConsoleHelpers';
import SDF from './SDF';
import WorldMapBackground from './WorldMapBackground';

function SegmentWorkspace({segment,phaseId,phaseName:phaseLabelName,phaseFlag,intelSnippet,onBack,onBackToExpedition,suggestion:suggestionProp,suggestionsLoading,homeCity="",prevCity="",allPhases=[]}) {
  const isMobile=useMobile();
  const key=`${phaseId}-${segment.id}`;
  const blank={transport:{mode:"",from:"",to:"",depTime:"",arrTime:"",cost:"",notes:""},stay:{name:"",checkin:"",checkout:"",cost:"",link:"",notes:""},activities:[],actNotes:"",food:{dailyBudget:"",notes:""},misc:[],intel:{notes:""}};
  const [det,setDet]=useState(()=>{const a=loadSeg();return a[key]||blank;});
  const [tab,setTab]=useState("transport");
  const [editingTransport,setEditingTransport]=useState(false);
  const [planningOwn,setPlanningOwn]=useState(false);
  const [transportFocused,setTransportFocused]=useState(false);
  const [editingStay,setEditingStay]=useState(false);
  const [selectedStayProp,setSelectedStayProp]=useState("");
  const [showStayResuggest,setShowStayResuggest]=useState(false);
  const [transportEst,setTransportEst]=useState(null);
  const [transportEstLoading,setTransportEstLoading]=useState(false);
  const transportEstTimer=useRef(null);
  const fetchTransportEst=useCallback(()=>{
    const from=det.transport.from,to=det.transport.to,mode=det.transport.mode;
    if(!from||!to)return;
    if(transportEstTimer.current)clearTimeout(transportEstTimer.current);
    transportEstTimer.current=setTimeout(async()=>{
      setTransportEstLoading(true);
      try{
        const raw=await askAI(`Transport ${from} to ${to} by ${mode||'flight'}. Return JSON only: {"estimate":"$X-X","note":"one tip"}`,100);
        const m=raw.match(/\{[\s\S]*\}/);if(m){setTransportEst(JSON.parse(m[0]));}
      }catch(e){}
      setTransportEstLoading(false);
    },1000);
  },[det.transport.from,det.transport.to,det.transport.mode]);
  useEffect(()=>{if(det.transport.from&&det.transport.to)fetchTransportEst();},[det.transport.from,det.transport.to,det.transport.mode]);
  const [nAct,setNAct]=useState({name:"",date:"",cost:"",transit:"",link:""});
  const [aiLoad,setAiLoad]=useState(false);
  const [saveFlash,setSaveFlash]=useState(false);
  const saveFlashRef=useRef(null);
  const isFirst=useRef(true);
  const [status,setStatus]=useState(()=>{const d=loadSeg()[key];return d?.status||'planning';});
  // Resolve suggestion: use prop if available, otherwise look up by segment name from localStorage
  const suggestion = (()=>{
    if(suggestionProp) return suggestionProp;
    const all = loadSuggestionsFromStorage();
    return findSuggestionForSegment(all, segment.name);
  })();
  const dismissKey = segment.name || `${phaseId}`;
  const caFromArch=(()=>{const fp=(allPhases||[]).find(p=>p.type!=="Return"&&p.name===segment.name&&(!segment.country||p.country===segment.country));return fp?.caActivities?.filter(a=>a&&(a.name||a.title))||[];})();
  const [dismissed,setDismissed]=useState(()=>loadDismissed());
  const isDism=(type)=>!!dismissed[`${dismissKey}_${type}`];
  const dismiss=(type)=>{const d={...dismissed,[`${dismissKey}_${type}`]:true};setDismissed(d);saveDismissed(d);};
  const [docsData,setDocsData]=useState(()=>{try{const s=localStorage.getItem(`1bn_docs_${phaseId}_v1`);return s?JSON.parse(s):null;}catch(e){return null;}});
  const [docsLoading,setDocsLoading]=useState(false);
  const [docsNote,setDocsNote]=useState(det.intel?.notes||"");
  const [bookDropdown,setBookDropdown]=useState(null);
  async function loadDocs(){if(docsData||docsLoading)return;setDocsLoading(true);try{const raw=await askAI(`Travel advisor. Destination:${segment.name},${segment.country}. Home:USA. Return JSON only:{"visa":{"required":true,"details":"","cost":""},"health":{"required":[],"recommended":[],"notes":""},"money":{"currency":"","tips":"","warning":""},"connectivity":{"tips":""},"safety":{"level":"low","notes":""},"customs":{"tips":""},"emergency":{"police":"","ambulance":"","embassy":""}}`,800);const m=raw.match(/\{[\s\S]*\}/);if(m){const d=JSON.parse(m[0]);setDocsData(d);localStorage.setItem(`1bn_docs_${phaseId}_v1`,JSON.stringify(d));}}catch(e){}setDocsLoading(false);}
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{if(isFirst.current){isFirst.current=false;return;}const a=loadSeg();const ex=a[key]||{};a[key]={...ex,...det,status:ex.status||'planning',statusUpdatedAt:ex.statusUpdatedAt||null,changes:ex.changes||[]};saveSeg(a);setSaveFlash(true);if(saveFlashRef.current)clearTimeout(saveFlashRef.current);saveFlashRef.current=setTimeout(()=>setSaveFlash(false),2000);},[det]);
  const uT=(f,v)=>setDet(d=>({...d,transport:{...d.transport,[f]:v}}));
  const uS=(f,v)=>setDet(d=>({...d,stay:{...d.stay,[f]:v}}));
  const uF=(f,v)=>setDet(d=>({...d,food:{...d.food,[f]:v}}));
  async function aiFood(){setAiLoad(true);const r=await askAI(`Daily food budget USD solo traveler ${segment.name}. Number only.`,20);const n=r.replace(/\D/g,"");if(n)uF("dailyBudget",n);setAiLoad(false);}
  const acceptTransport=(t)=>{const mode=detectMode(t.route);if(mode)uT("mode",mode);uT("from",prevCity||homeCity||"");uT("to",segment.name||"");uT("cost",(t.estimatedCost||"").split('-')[0].replace(/[^0-9]/g,''));uT("notes",`${t.route}\n\nEst. ${t.estimatedCost}${t.bestTiming?`\nBest timing: ${t.bestTiming}`:""}${t.notes?`\n${t.notes}`:""}`);if(segment.arrival){uT("depTime",fD(segment.arrival));uT("arrTime",fD(segment.arrival));}dismiss('transport');};
  const acceptStay=(s)=>{const primary=s.suggestions?.[0]||"";const alts=s.suggestions?.slice(1)||[];if(primary)uS("name",primary);uS("cost",(s.estimatedTotal||"").split('-')[0].replace(/[^0-9]/g,''));if(segment.arrival&&!det.stay.checkin)uS("checkin",segment.arrival);if(segment.departure&&!det.stay.checkout)uS("checkout",segment.departure);uS("notes",`${alts.length>0?`Alternatives: ${alts.join(', ')}\n\n`:""}${s.recommendation||""}${s.notes?`\n${s.notes}`:""}`);dismiss('stay');};
  const acceptActivity=(a)=>{const sentences=(a.notes||"").split(/(?<=[.!?])\s+/);const brief=sentences[0]||"";const tipText=sentences.slice(1).join(' ');setDet(d=>({...d,activities:[...d.activities,{name:a.name,brief,tip:tipText,date:"",cost:(a.estimatedCost||"").match(/\d+/)?.[0]||"",notes:`${a.provider||""}${tipText?`\n${tipText}`:""}`,provider:a.provider||"",id:Date.now()+Math.random()}]}));};
  const hasT=(!transportFocused)&&(!!(det.transport?.from&&det.transport?.to)||!!(det.transport?.mode&&det.transport?.cost));
  useEffect(()=>{if(hasT)setPlanningOwn(false);},[hasT]);
  useEffect(()=>{if(!det.transport.from&&!det.transport.to&&!det.transport.mode&&!det.transport.cost){const d={...dismissed};delete d[`${dismissKey}_transport`];setDismissed(d);saveDismissed(d);}},[det.transport.from,det.transport.to,det.transport.mode,det.transport.cost]);
  const hasS=det.stay?.name?.length>0;
  const TABS=[{id:"transport",label:"TRAVEL",icon:"✈️"},{id:"stay",label:"STAY",icon:"🏨"},{id:"activities",label:isMobile?"ACTS":"ACTIVITIES",icon:"🎯",count:det.activities.length},{id:"food",label:"FOOD",icon:"🍜"},{id:"budget",label:"BUDGET",icon:"💰"},{id:"calendar",label:isMobile?"CAL":"CALENDAR",icon:"📅"},{id:"docs",label:"DOCS",icon:"📋"}];
  return(
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:300,background:'#120A04',overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      <WorldMapBackground phases={allPhases} activeCountry={(() => { const match = (allPhases||[]).find(p => p.name === phaseLabelName); return match ? match.country : phaseLabelName; })()} departureCity={homeCity||""}/>
      <div className="mc-content" style={{width:1126,maxWidth:'100%',margin:'0 auto',borderInline:'1px solid var(--border, #2e303a)',overflow:'visible',flex:'none',minHeight:'100%',boxSizing:'border-box',position:'relative',zIndex:1}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'12px 0',gap:10,background:'rgba(0,8,16,0.95)',borderBottom:'1px solid rgba(255,159,67,0.15)',position:'sticky',top:0,zIndex:10}}>
        {isMobile?<button onClick={onBack} style={{background:'none',border:'none',color:'#FF9F43',fontSize:24,cursor:'pointer',padding:'0 8px 0 0',fontWeight:300,lineHeight:1,minWidth:32,minHeight:44,display:'flex',alignItems:'center',gap:6}}>‹ <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:2,opacity:0.65}}>{phaseLabelName.toUpperCase()}</span></button>
        :<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>
          <span onClick={onBackToExpedition||onBack} style={{color:'#FF9F43',cursor:'pointer'}}>←</span>
          <span onClick={onBackToExpedition||onBack} style={{color:'rgba(255,255,255,0.60)',cursor:'pointer',letterSpacing:1}}>EXPEDITION</span>
          <span style={{color:'rgba(255,255,255,0.30)'}}>›</span>
          <span onClick={onBack} style={{color:'rgba(255,255,255,0.60)',cursor:'pointer',letterSpacing:1}}>{phaseLabelName.toUpperCase()}</span>
          <span style={{color:'rgba(255,255,255,0.25)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.85)',letterSpacing:1}}>{segment.name.toUpperCase()}</span>
        </div>}
        <div style={{flex:1,minWidth:0}}>
          {isMobile&&<div style={{fontSize:17,fontWeight:600,color:'#FFFFFF',fontFamily:"'Fraunces',serif"}}>{segment.name}</div>}
          <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:isMobile?2:0}}>{isMobile?`${segment.nights}n`:`${segment.nights} Nights`} · {segment.type} · {fmt(segment.budget)}</div>
        </div>
      </div>
      {/* Tab bar */}
      <div style={{display:'flex',justifyContent:'center',background:'rgba(0,4,12,0.95)',borderBottom:'1px solid rgba(255,255,255,0.08)',position:'sticky',top:isMobile?68:56,zIndex:9}}>
        {TABS.map(t=>{const on=tab===t.id;return(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:isMobile?1:undefined,minWidth:isMobile?0:undefined,padding:isMobile?'10px 2px':'10px 16px',background:'none',border:'none',borderBottom:on?'2px solid #FF9F43':'2px solid transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,transition:'all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)',overflow:'hidden',opacity:on?1:0.75,transform:on?'scale(1.05)':'scale(1)'}}>
            <span style={{fontSize:isMobile?20:20,lineHeight:1}}>{t.icon}</span>
            {!isMobile&&<span style={{fontSize:13,fontWeight:600,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:on?'#FF9F43':'rgba(255,255,255,0.45)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{t.label}{t.count>0?` (${t.count})`:""}</span>}
            {isMobile&&t.count>0&&<span style={{fontSize:9,fontWeight:600,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:on?'#FF9F43':'rgba(255,255,255,0.45)'}}>{t.count}</span>}
          </button>
        );})}
        {saveFlash&&<div style={{position:'absolute',right:8,top:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:'#69F0AE',opacity:0.80,letterSpacing:1,pointerEvents:'none'}}>✓ saved</div>}
      </div>
      {/* Tab content */}
      <div key={tab} style={{border:'1.5px solid rgba(255,255,255,0.10)',borderRadius:16,background:'rgba(0,8,20,0.85)',padding:'16px 14px',margin:'12px 0',minHeight:300,animation:'tabFadeIn 400ms cubic-bezier(0.25,0.46,0.45,0.94)'}}>
        {/* TRANSPORT */}
        {tab==="transport"&&<div style={{padding:0}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.transport&&!isDism('transport')&&!hasT&&<div className="sg-suggestion-card" style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:6}}>{suggestion.transport.route}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:4}}>{suggestion.transport.duration}</div>
            <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. {suggestion.transport.estimatedCost}</div>
            {suggestion.transport.bestTiming&&<div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:4}}>{suggestion.transport.bestTiming}</div>}
            {suggestion.transport.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12}}>{suggestion.transport.notes}</div>}
            <div style={disclaimerStyle}>⚡ Estimates based on current market rates — actual prices vary when booked</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>acceptTransport(suggestion.transport)} style={acceptBtnStyle}>USE THIS ROUTE</button>
              <button onClick={()=>{dismiss('transport');setPlanningOwn(true);}} style={dismissBtnStyle}>PLAN MY OWN</button>
            </div>
          </div>}
          {hasT&&<div style={{border:'1.5px solid rgba(255,159,67,0.45)',borderRadius:14,background:'rgba(0,229,255,0.06)',padding:'18px 20px',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,flex:1}}>✈️ TRANSPORT</span>
              <button onClick={()=>{const from=encodeURIComponent(det.transport.from||'');const to=encodeURIComponent(det.transport.to||'');setBookDropdown(bookDropdown==='transport'?null:'transport');}} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button onClick={()=>setEditingTransport(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28}}>{editingTransport?'DONE':'EDIT'}</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.transport.from&&det.transport.to?`${det.transport.from} → ${det.transport.to}`:det.transport.mode||"Transport"}</div>
            {(det.transport.depTime||det.transport.cost)&&<div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{det.transport.depTime?`${det.transport.depTime}`:""}{det.transport.depTime&&det.transport.cost?" · ":""}{det.transport.cost?`Est. $${det.transport.cost}`:""}{det.transport.mode&&det.transport.from?` · ${det.transport.mode}`:""}</div>}
            {det.transport.notes&&!editingTransport&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,color:'rgba(255,255,255,0.60)',marginTop:6,lineHeight:1.5,whiteSpace:'pre-line'}}>{det.transport.notes.length>120?det.transport.notes.slice(0,120)+'...':det.transport.notes}</div>}
            {det.transport.link&&<a href={det.transport.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.transport.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
          </div>}
          {bookDropdown==='transport'&&<div style={{position:'relative',zIndex:100,marginBottom:10}}><div style={{background:'rgba(0,8,20,0.95)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:8,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.60)',letterSpacing:2,padding:'4px 14px'}}>SEARCH FLIGHTS</div>
            {[{n:'Google Flights',u:`https://www.google.com/travel/flights?q=${encodeURIComponent((det.transport.from||'')+' to '+(det.transport.to||''))}`},{n:'Skyscanner',u:'https://www.skyscanner.com'},{n:'Kayak',u:'https://www.kayak.com/flights'},{n:'Rome2rio',u:`https://www.rome2rio.com/map/${encodeURIComponent(det.transport.from||'')}/${encodeURIComponent(det.transport.to||'')}`}].map(l=><a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer" onClick={()=>setBookDropdown(null)} style={{display:'block',padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.75)',borderRadius:8,cursor:'pointer',textDecoration:'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{l.n}</a>)}
          </div></div>}
          {hasT&&editingTransport&&<div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
              <SDF label="FROM" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="Departure city" accent="#00E5FF"/>
              <SDF label="TO" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="Arrival city" accent="#00E5FF"/>
              <SDF label="DEP TIME" value={det.transport.depTime} onChange={v=>uT("depTime",v)} placeholder="08:30 AM" accent="#00E5FF"/>
              <SDF label="ARR TIME" value={det.transport.arrTime} onChange={v=>uT("arrTime",v)} placeholder="11:45 AM" accent="#00E5FF"/>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.transport.link||""} onChange={v=>uT("link",v)} placeholder="https://..." accent="#00E5FF"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="Flight number, booking ref..." accent="#00E5FF" multiline/></div>
            <button onClick={()=>setEditingTransport(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(0,229,255,0.12)',color:'#00E5FF',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
          </div>}
          {(!hasT||planningOwn)&&!editingTransport&&<div>
            {!(suggestion?.transport&&!isDism('transport'))&&!suggestionsLoading&&<div style={{textAlign:'center',padding:'24px 0 20px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.40)',marginBottom:12}}>No transport planned yet.</div></div>}
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
              <SDF label="FROM" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="Departure city" accent="#00E5FF" onFocus={()=>setTransportFocused(true)} onBlur={()=>setTransportFocused(false)}/>
              <SDF label="TO" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="Arrival city" accent="#00E5FF" onFocus={()=>setTransportFocused(true)} onBlur={()=>setTransportFocused(false)}/>
            </div>
            {(transportEstLoading||transportEst)&&<div style={{padding:'8px 12px',marginTop:8,borderRadius:8,background:'rgba(255,159,67,0.04)',border:'1px solid rgba(255,159,67,0.12)',display:'flex',alignItems:'center',gap:8}}>
              {transportEstLoading?<span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.60)',letterSpacing:1}}>✦ Estimating...</span>
              :transportEst&&<span onClick={()=>{if(transportEst.estimate)uT("cost",transportEst.estimate.replace(/[^0-9]/g,'').slice(0,6));}} style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:0.5,cursor:'pointer'}}>✦ Est. {transportEst.estimate}{transportEst.note?` — ${transportEst.note}`:""} <span style={{color:'#FF9F43',textDecoration:'underline'}}>use</span></span>}
            </div>}
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10,marginTop:10}}>
              <SDF label="DEP TIME" value={det.transport.depTime} onChange={v=>uT("depTime",v)} placeholder="08:30 AM" accent="#00E5FF"/>
              <SDF label="ARR TIME" value={det.transport.arrTime} onChange={v=>uT("arrTime",v)} placeholder="11:45 AM" accent="#00E5FF"/>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.transport.link||""} onChange={v=>uT("link",v)} placeholder="https://..." accent="#00E5FF"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="Flight number, booking ref..." accent="#00E5FF" multiline/></div>
          </div>}
        </div>}
        {/* STAY */}
        {tab==="stay"&&<div style={{padding:0}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.stay&&!isDism('stay')&&!hasS&&<div className="sg-suggestion-card" style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:6}}>{suggestion.stay.recommendation}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:8}}>{suggestion.stay.type}</div>
            {suggestion.stay.suggestions?.length>0&&<div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.40)',letterSpacing:2,marginBottom:6}}>SELECT PROPERTY</div>
              {suggestion.stay.suggestions.map((prop,pi)=><div key={pi} onClick={()=>setSelectedStayProp(prop)} style={{border:selectedStayProp===prop?'1px solid rgba(255,159,67,0.60)':'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:'10px 14px',marginBottom:6,cursor:'pointer',fontSize:13,color:selectedStayProp===prop?'#FF9F43':'rgba(255,255,255,0.75)',background:selectedStayProp===prop?'rgba(255,159,67,0.08)':'transparent',transition:'all 0.20s'}}>{prop}</div>)}
              <SDF label="OR ENTER YOUR OWN" value={selectedStayProp&&!suggestion.stay.suggestions.includes(selectedStayProp)?selectedStayProp:""} onChange={v=>setSelectedStayProp(v)} placeholder="Your property choice..." accent="#FF9F43"/>
            </div>}
            <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. {suggestion.stay.estimatedNightly} · Total ~{suggestion.stay.estimatedTotal}</div>
            {suggestion.stay.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12}}>{suggestion.stay.notes}</div>}
            <div style={disclaimerStyle}>⚡ Estimates based on current market rates — actual prices vary when booked</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{const s=suggestion.stay;const name=selectedStayProp||s.suggestions?.[0]||"";const alts=(s.suggestions||[]).filter(p=>p!==name);if(name)uS("name",name);uS("cost",(s.estimatedTotal||"").split('-')[0].replace(/[^0-9]/g,''));if(segment.arrival&&!det.stay.checkin)uS("checkin",segment.arrival);if(segment.departure&&!det.stay.checkout)uS("checkout",segment.departure);uS("notes",`${alts.length>0?`Alternatives: ${alts.join(', ')}\n\n`:""}${s.recommendation||""}${s.notes?`\n${s.notes}`:""}`);dismiss('stay');}} style={acceptBtnStyle}>USE THIS STAY</button>
              <button onClick={()=>dismiss('stay')} style={dismissBtnStyle}>PLAN MY OWN</button>
            </div>
          </div>}
          {hasS&&!showStayResuggest&&<div style={{border:'1.5px solid rgba(255,159,67,0.45)',borderRadius:14,background:'rgba(0,229,255,0.06)',padding:'18px 20px',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,flex:1}}>🏨 ACCOMMODATION</span>
              <button onClick={()=>setBookDropdown(bookDropdown==='stay'?null:'stay')} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button onClick={()=>setEditingStay(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28}}>{editingStay?'DONE':'EDIT'}</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.stay.name}</div>
            {(det.stay.checkin||det.stay.checkout)&&<div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{det.stay.checkin?`Check-in ${fD(det.stay.checkin)}`:""}{det.stay.checkin&&det.stay.checkout?" · ":""}{det.stay.checkout?`Check-out ${fD(det.stay.checkout)}`:""}{segment.nights?` · ${segment.nights} nights`:""}</div>}
            {det.stay.cost&&<div style={{fontSize:13,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. ${det.stay.cost}</div>}
            {det.stay.notes&&!editingStay&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,color:'rgba(255,255,255,0.60)',marginTop:6,lineHeight:1.5,whiteSpace:'pre-line'}}>{det.stay.notes.length>140?det.stay.notes.slice(0,140)+'...':det.stay.notes}</div>}
            {det.stay.link&&<a href={det.stay.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.stay.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
            {suggestion?.stay?.suggestions?.length>1&&<div onClick={()=>setShowStayResuggest(true)} style={{fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',cursor:'pointer',marginTop:8,textDecoration:'underline'}}>↩ View other suggestions</div>}
          </div>}
          {hasS&&!showStayResuggest&&<div style={{textAlign:'center',marginTop:8,marginBottom:4}}>
            <span onClick={()=>{uS("name","");uS("cost","");uS("checkin","");uS("checkout","");uS("link","");uS("notes","");const d={...dismissed};delete d[`${dismissKey}_stay`];setDismissed(d);saveDismissed(d);}} style={{color:'rgba(255,255,255,0.4)',fontSize:12,cursor:'pointer',letterSpacing:0.3,textDecoration:'underline',textUnderlineOffset:3}} onMouseEnter={e=>e.target.style.color='rgba(255,255,255,0.7)'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.4)'}>↩ Clear selection</span>
          </div>}
          {hasS&&showStayResuggest&&suggestion?.stay&&<div className="sg-suggestion-card" style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ CHANGE PROPERTY</div>
            <div style={{marginBottom:10}}>
              {suggestion.stay.suggestions.map((prop,pi)=><div key={pi} onClick={()=>{uS("name",prop);setShowStayResuggest(false);}} style={{border:det.stay.name===prop?'1px solid rgba(255,159,67,0.60)':'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:'10px 14px',marginBottom:6,cursor:'pointer',fontSize:13,color:det.stay.name===prop?'#FF9F43':'rgba(255,255,255,0.75)',background:det.stay.name===prop?'rgba(255,159,67,0.08)':'transparent',transition:'all 0.20s'}}>{prop}</div>)}
            </div>
            <button onClick={()=>setShowStayResuggest(false)} style={{...dismissBtnStyle,width:'100%'}}>KEEP CURRENT</button>
          </div>}
          {bookDropdown==='stay'&&<div style={{position:'relative',zIndex:100,marginBottom:10}}><div style={{background:'rgba(0,8,20,0.95)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:8,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.30)',letterSpacing:2,padding:'4px 14px'}}>SEARCH STAYS</div>
            {[{n:'Booking.com',u:`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(segment.name)}`},{n:'Airbnb',u:`https://www.airbnb.com/s/${encodeURIComponent(segment.name)}/homes`},{n:'Hotels.com',u:`https://www.hotels.com/search.do?q-destination=${encodeURIComponent(segment.name)}`},{n:'Hostelworld',u:`https://www.hostelworld.com/search?search_keywords=${encodeURIComponent(segment.name)}`}].map(l=><a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer" onClick={()=>setBookDropdown(null)} style={{display:'block',padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.75)',borderRadius:8,cursor:'pointer',textDecoration:'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{l.n}</a>)}
          </div></div>}
          {hasS&&editingStay&&<div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:10,marginTop:10,overflow:'hidden'}}>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/></div>
            <button onClick={()=>setEditingStay(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(105,240,174,0.12)',color:'#69F0AE',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
          </div>}
          {!hasS&&!(suggestion?.stay&&!isDism('stay'))&&!suggestionsLoading&&<div>
            <div style={{textAlign:'center',padding:'24px 0 20px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.40)',marginBottom:12}}>No accommodation planned yet.</div></div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:10,marginTop:10,overflow:'hidden'}}>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/></div>
          </div>}
        </div>}
        {/* ACTIVITIES */}
        {tab==="activities"&&<div style={{padding:0}}>
          {caFromArch.length>0&&<div style={{marginBottom:16}}>
            <div style={{...suggestionHeaderStyle,marginBottom:10}}>✦ FROM YOUR CO-ARCHITECT CONVERSATION</div>
            {caFromArch.map((a,idx)=>{
              const actName=a.name||a.title||"";
              const actNotes=a.notes||a.brief||"";
              return(
                <div key={`ca-act-${idx}`} className="sg-suggestion-card" style={{...suggestionCardStyle,marginBottom:10}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:6}}>{actName}</div>
                  {a.provider&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',marginBottom:4}}>{a.provider}</div>}
                  {actNotes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12}}>{actNotes}</div>}
                  {a.estimatedCost&&<div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:8}}>Est. {a.estimatedCost}</div>}
                  <div style={disclaimerStyle}>Mentioned in chat — add to your plan if it fits</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>acceptActivity({name:actName,notes:actNotes,estimatedCost:a.estimatedCost||a.cost,provider:a.provider||""})} style={acceptBtnStyle}>+ ADD TO PLAN</button>
                  </div>
                </div>
              );
            })}
          </div>}
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.activities?.map((activity,idx)=>(
            !isDism(`activity_${idx}`)&&<div key={idx} className="sg-suggestion-card" style={{...suggestionCardStyle,marginBottom:10,animationDelay:`${idx*100}ms`}}>
              <div style={suggestionHeaderStyle}>✦ SUGGESTED ACTIVITY</div>
              <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:6}}>{activity.name}</div>
              {activity.provider&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',marginBottom:4}}>{activity.provider}</div>}
              <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. {activity.estimatedCost}</div>
              {activity.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12}}>{activity.notes}</div>}
              <div style={disclaimerStyle}>⚡ Estimates only — prices vary when booked</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{acceptActivity(activity);dismiss(`activity_${idx}`);}} style={acceptBtnStyle}>+ ADD TO PLAN</button>
                <button onClick={()=>dismiss(`activity_${idx}`)} style={dismissBtnStyle}>SKIP</button>
              </div>
            </div>
          ))}
          {det.activities.length>0&&<div style={{marginBottom:16}}>
            {det.activities.map(a=>(
              <div key={a.id} style={{border:'1.5px solid rgba(255,210,0,0.55)',borderRadius:14,background:'rgba(255,200,0,0.06)',padding:'18px 20px',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,217,61,0.65)',letterSpacing:2,flex:1}}>⚡ ACTIVITY</span>
                  <a href={`https://www.viator.com/search/${encodeURIComponent(segment.name+' '+a.name)}`} target="_blank" rel="noopener noreferrer" style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'3px 8px',textDecoration:'none',minHeight:24,display:'flex',alignItems:'center'}}>🔗</a>
                  <button onClick={()=>setDet(d=>({...d,activities:d.activities.filter(x=>x.id!==a.id)}))} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'3px 8px',cursor:'pointer',minHeight:24}}>✕</button>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{a.name}</div>
                {a.provider&&<div style={{fontSize:12,color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{a.provider}</div>}
                {a.brief&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.75)',marginBottom:8,marginTop:4,lineHeight:1.6}}>{a.brief}</div>}
                <div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",display:'flex',gap:8,flexWrap:'wrap',marginBottom:a.tip||a.link?6:0}}>
                  {a.date?<span>{fD(a.date)}</span>:segment.arrival&&<span style={{fontStyle:'italic',color:'rgba(255,159,67,0.60)',fontSize:12}}>within {fD(segment.arrival)}–{fD(segment.departure)}</span>}{a.cost&&<span style={{color:'#FFD93D'}}>Est. ${a.cost}</span>}
                </div>
                {a.tip&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,color:'rgba(255,255,255,0.60)',lineHeight:1.5,marginTop:4}}>💡 {a.tip}</div>}
                {a.link&&<a href={a.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:6}}>{a.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'4px 2px'}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>TOTAL</span>
              <span style={{fontSize:14,fontWeight:600,color:'rgba(255,217,61,0.85)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>${det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}</span>
            </div>
          </div>}
          {det.activities.length===0&&!(suggestion?.activities?.some((_,i)=>!isDism(`activity_${i}`)))&&!suggestionsLoading&&<div style={{textAlign:'center',padding:'24px 0 16px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,217,61,0.40)'}}>No activities planned yet — dives, tours, day trips</div></div>}
          <div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginTop:4}}>
            <div style={{fontSize:12,color:'rgba(255,217,61,0.60)',letterSpacing:2,marginBottom:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>+ ADD ACTIVITY</div>
            <SDF label="ACTIVITY NAME" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#FFD93D"/>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:8,marginTop:8,overflow:'hidden'}}>
              <SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#FFD93D"/>
              <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#FFD93D"/>
            </div>
            <div style={{marginTop:8}}><SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://..." accent="#FFD93D"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Tips, what to bring..." accent="#FFD93D" multiline/></div>
            <button onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:[...d.activities,{...nAct,id:Date.now()}]}));setNAct({name:"",date:"",cost:"",transit:"",link:""});}} style={{marginTop:12,padding:'12px 20px',borderRadius:10,border:'none',background:nAct.name?'linear-gradient(135deg,rgba(255,159,67,0.25),rgba(255,217,61,0.15))':'rgba(255,255,255,0.04)',color:nAct.name?'#FFD93D':'rgba(255,255,255,0.20)',fontSize:12,cursor:nAct.name?'pointer':'default',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,fontWeight:700,width:'100%',minHeight:44}}>ADD TO PLAN</button>
          </div>
          <div style={{marginTop:14}}><SDF label="ACTIVITY NOTES" value={det.actNotes||""} onChange={v=>setDet(d=>({...d,actNotes:v}))} placeholder="Tips, what to bring, dress code..." accent="#FFD93D" multiline/></div>
        </div>}
        {/* FOOD */}
        {tab==="food"&&<div style={{padding:0}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.food&&!isDism('food')&&<div className="sg-suggestion-card" style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ FOOD & DINING</div>
            <div style={{fontSize:14,fontWeight:600,color:'#FFD93D',marginBottom:8}}>Est. {(suggestion.food.dailyBudget||"").replace(/\/day$/i,"")}/day{suggestion.food.totalEstimate?` · ~${suggestion.food.totalEstimate} total`:""}</div>
            {suggestion.food.recommendations?.map((rec,i)=>(
              <div key={i} style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:6,paddingLeft:8,borderLeft:'2px solid rgba(255,159,67,0.30)'}}>{rec}</div>
            ))}
            {suggestion.food.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginTop:8}}>{suggestion.food.notes}</div>}
            <div style={{...disclaimerStyle,marginTop:12}}>⚡ Suggestions based on current market knowledge — always verify locally</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{const bud=(suggestion.food.dailyBudget||"").match(/\d+/)?.[0]||"";if(bud)uF("dailyBudget",bud);uF("notes",suggestion.food.recommendations?.join('\n')||"");dismiss('food');}} style={acceptBtnStyle}>USE ESTIMATES</button>
              <button onClick={()=>dismiss('food')} style={dismissBtnStyle}>PLAN MY OWN</button>
            </div>
          </div>}
          <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:10}}>
            <div style={{flex:1}}><SDF label="DAILY FOOD BUDGET ($)" type="number" value={det.food.dailyBudget} onChange={v=>uF("dailyBudget",v)} placeholder="e.g. 45" accent="#FF9F43"/></div>
            <button onClick={aiFood} disabled={aiLoad} style={{padding:'8px 14px',borderRadius:6,border:'1px solid rgba(255,159,67,0.3)',background:'rgba(255,159,67,0.05)',color:'rgba(255,159,67,0.8)',fontSize:12,cursor:aiLoad?'wait':'pointer',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:600,whiteSpace:'nowrap',height:34,flexShrink:0}}>{aiLoad?"✦...":"✦ CO-ARCH EST"}</button>
          </div>
          {det.food.dailyBudget&&<div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'rgba(255,159,67,0.05)',border:'1px solid rgba(255,159,67,0.16)',borderRadius:8,marginBottom:10}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{segment.nights} nights × ${det.food.dailyBudget}/day</span>
            <span style={{fontSize:14,fontWeight:600,color:'rgba(255,217,61,0.85)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>${(parseFloat(det.food.dailyBudget)*segment.nights).toLocaleString()}</span>
          </div>}
          <SDF label="FOOD NOTES" value={det.food.notes} onChange={v=>uF("notes",v)} placeholder="Must-try dishes, market days, dietary notes..." accent="#FF9F43" multiline/>
        </div>}
        {/* BUDGET */}
        {tab==="budget"&&(()=>{const tCost=parseFloat(det.transport?.cost)||0;const sCost=parseFloat(det.stay?.cost)||0;const aCost=det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0);const fCost=(parseFloat(det.food?.dailyBudget)||0)*segment.nights;const mCost=det.misc.reduce((s,m)=>s+(parseFloat(m.cost)||0),0);const total=tCost+sCost+aCost+fCost+mCost;const budget=segment.budget||0;const pct=budget>0?Math.round((total/budget)*100):0;const barColor=pct>=100?'#FF6B6B':pct>=80?'#FFD93D':'#00E5FF';
          const tf=(det.transport?.from||'').trim();const tt=(det.transport?.to||'').trim();const tMode=(det.transport?.mode||'').trim();
          const transportSnap=(tf||tt)?`${tf||'…'} → ${tt||segment.name}`:(tMode||'');
          const stayNm=(det.stay?.name||'').trim();
          const staySnap=stayNm?`${stayNm} · ${segment.nights}n`:`${segment.nights}n`;
          const actSnip=(a)=>{const n=(a.name||'').trim();const c=parseFloat(a.cost);const has$=Number.isFinite(c)&&c>0;if(has$&&n)return`${fmt(c)} · ${n}`;if(has$)return fmt(c);return n;};
          const actParts=det.activities.map(actSnip).filter(Boolean);
          const trimActLines=(lines)=>{let out=lines;const max=320;const j=out.join(' · ');if(j.length<=max)return out;const acc=[];let n=0;for(const p of out){if(n+(p.length+3)>max)break;acc.push(p);n+=p.length+3;}return acc.length?acc:[`${j.slice(0,max)}…`];};
          const actLines=actParts.length>1?trimActLines(actParts):null;
          const activitiesSnap=actParts.length<=1?(actParts[0]||''):'';
          const db=det.food?.dailyBudget;const foodSnap=db?`${segment.nights}n × $${db}/day`:'';
          const miscSnap=det.misc.map(m=>(m.name||'').trim()).filter(Boolean).join(' · ').slice(0,120);
          const budgetRows=[{icon:'✈️',label:'TRANSPORT',cost:tCost,has:hasT,snap:transportSnap},{icon:'🏨',label:'STAY',cost:sCost,has:hasS,snap:hasS?staySnap:''},{icon:'⚡',label:'ACTIVITIES',cost:aCost,has:det.activities.length>0,snap:activitiesSnap,snapLines:actLines},{icon:'🍜',label:'FOOD',cost:fCost,has:!!db,snap:foodSnap},{icon:'💸',label:'MISC',cost:mCost,has:det.misc.length>0,snap:miscSnap}];
          return(
          <div style={{padding:0}}>
            <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,marginBottom:12,textAlign:'left'}}>PHASE BUDGET</div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4,textAlign:'left'}}>{segment.name}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:16,textAlign:'left'}}>{segment.nights} Nights · Budget: {fmt(budget)}</div>
            {budgetRows.map(r=>{
              const snapStyle={fontSize:isMobile?16:18,fontFamily:"'Fraunces',serif",fontStyle:'italic',fontWeight:500,color:'rgba(255,245,220,0.90)',marginTop:7,lineHeight:1.55,wordBreak:'break-word',letterSpacing:'0.01em',textShadow:'0 1px 10px rgba(0,0,0,0.35)',textAlign:'left'};
              return(
              <div key={r.label} style={{display:'flex',alignItems:'flex-start',gap:isMobile?8:12,padding:isMobile?'14px 0':'15px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{width:isMobile?30:36,fontSize:isMobile?22:24,flexShrink:0,lineHeight:1.2,textAlign:'left'}}>{r.icon}</span>
                <div style={{flex:1,minWidth:0,textAlign:'left'}}>
                  <div style={{fontSize:isMobile?15:17,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.90)',letterSpacing:isMobile?0.8:1.2,fontWeight:700,textAlign:'left'}}>{r.label}</div>
                  {r.snapLines&&r.snapLines.length>0&&<div style={{marginTop:7}}>{r.snapLines.map((line,i)=><div key={i} style={{...snapStyle,marginTop:i?10:0,display:'flex',gap:10,alignItems:'baseline'}}><span style={{flexShrink:0,color:'rgba(255,217,61,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,lineHeight:1,fontStyle:'normal',fontWeight:700}}>●</span><span style={{flex:1,minWidth:0}}>{line}</span></div>)}</div>}
                  {r.snap&&!r.snapLines?.length&&<div style={snapStyle}>{r.snap}</div>}
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',flexShrink:0,gap:5}}>
                  <span style={{fontSize:isMobile?16:18,fontWeight:700,color:'#FFFFFF',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:'nowrap'}}>{r.cost>0?fmt(r.cost):'—'}</span>
                  <span style={{fontSize:isMobile?12:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,color:r.has?'#69F0AE':'rgba(255,255,255,0.60)',letterSpacing:0.5,whiteSpace:'nowrap'}}>{r.has?'✓ Added':'—'}</span>
                </div>
              </div>
              );
            })}
            <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 6px',borderTop:'1px solid rgba(255,255,255,0.12)',marginTop:4}}>
              <span style={{fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.65)',letterSpacing:1}}>TOTAL PLANNED</span>
              <span style={{fontSize:15,fontWeight:700,color:'#FFFFFF',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fmt(total)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
              <span style={{fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.65)',letterSpacing:1}}>REMAINING</span>
              <span style={{fontSize:15,fontWeight:700,color:budget-total>=0?'#69F0AE':'#FF6B6B',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fmt(budget-total)}</span>
            </div>
            <div style={{marginTop:12,height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:Math.min(pct,100)+'%',background:barColor,borderRadius:3,transition:'width 0.60s cubic-bezier(0.25,0.46,0.45,0.94)'}}/>
            </div>
            <div style={{textAlign:'center',marginTop:6,fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:barColor}}>{pct}% allocated</div>
            {pct>=100&&<div style={{background:'rgba(255,107,107,0.08)',border:'1px solid rgba(255,107,107,0.3)',borderRadius:12,padding:'12px 16px',marginTop:12}}>
              <div style={{color:'#FF6B6B',fontSize:13,fontWeight:600,marginBottom:6}}>⚠️ Over budget by {fmt(total-budget)}</div>
              <div style={{color:'rgba(255,255,255,0.55)',fontSize:12,marginBottom:12,lineHeight:1.5}}>Want help finding options that fit your budget?</div>
              <button onClick={()=>window.dispatchEvent(new CustomEvent('openCA',{detail:{message:`I'm over budget on ${segment?.name||'this segment'} by ${fmt(total-budget)}. Can you suggest alternatives that fit within my ${fmt(budget)} budget?`}}))} style={{background:'rgba(255,217,61,0.12)',border:'1px solid rgba(255,217,61,0.35)',borderRadius:8,color:'#FFD93D',fontSize:12,fontWeight:600,padding:'8px 14px',cursor:'pointer',letterSpacing:0.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>✦ Ask Co-Architect for alternatives</button>
            </div>}
          </div>);})()}
        {/* DOCS & VISA */}
        {tab==="docs"&&<div style={{padding:0}}>
          <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,marginBottom:12}}>DOCS & VISA</div>
          <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{segment.name}, {segment.country}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:16}}>{segment.nights} Nights</div>
          {!docsData&&!docsLoading&&<div style={{textAlign:'center',padding:'24px 0'}}><button onClick={loadDocs} style={{padding:'12px 24px',borderRadius:10,border:'1px solid rgba(255,159,67,0.40)',background:'rgba(255,159,67,0.08)',color:'#FF9F43',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:44}}>✦ GENERATE TRAVEL DOCS BRIEF</button></div>}
          {docsLoading&&<div style={{textAlign:'center',padding:'24px 0'}}><div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite',margin:'0 auto 8px'}}/><span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>GENERATING DOCS BRIEF...</span></div>}
          {docsData&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
            {docsData.visa&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🛂 VISA REQUIREMENTS</div><div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:'rgba(255,255,255,0.85)',lineHeight:1.7}}>{docsData.visa.details}{docsData.visa.cost?` · Cost: ${docsData.visa.cost}`:''}</div></div>}
            {docsData.health&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>💉 HEALTH</div>{docsData.health.required?.length>0&&<div style={{padding:'6px 10px',background:'rgba(255,200,0,0.06)',border:'1px solid rgba(255,200,0,0.20)',borderRadius:6,marginBottom:4,fontSize:13,color:'#FFD93D'}}>⚠️ Required: {docsData.health.required.join(', ')}</div>}{docsData.health.recommended?.length>0&&<div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Recommended: {docsData.health.recommended.join(', ')}</div>}{docsData.health.notes&&<div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4}}>{docsData.health.notes}</div>}</div>}
            {docsData.money&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>💵 MONEY & CURRENCY</div>{docsData.money.warning&&<div style={{padding:'6px 10px',background:'rgba(255,200,0,0.06)',border:'1px solid rgba(255,200,0,0.20)',borderRadius:6,marginBottom:4,fontSize:13,color:'#FFD93D'}}>⚠️ {docsData.money.warning}</div>}<div style={{fontSize:13,color:'rgba(255,255,255,0.80)',lineHeight:1.5}}>{docsData.money.currency}{docsData.money.tips?` · ${docsData.money.tips}`:''}</div></div>}
            {docsData.connectivity&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>📶 CONNECTIVITY</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{docsData.connectivity.tips}</div></div>}
            {docsData.safety&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🛡️ SAFETY</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Level: {docsData.safety.level}{docsData.safety.notes?` · ${docsData.safety.notes}`:''}</div></div>}
            {docsData.customs&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🤝 LOCAL CUSTOMS</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{docsData.customs.tips}</div></div>}
            {docsData.emergency&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🆘 EMERGENCY CONTACTS</div><div style={{display:'flex',flexDirection:'column',gap:4}}>{docsData.emergency.police&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Police: {docsData.emergency.police}</div>}{docsData.emergency.ambulance&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Ambulance: {docsData.emergency.ambulance}</div>}{docsData.emergency.embassy&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Embassy: {docsData.emergency.embassy}</div>}</div></div>}
          </div>}
          <div style={{marginTop:16}}><SDF label="PERSONAL NOTES" value={docsNote} onChange={v=>{setDocsNote(v);setDet(d=>({...d,intel:{...d.intel,notes:v}}));}} placeholder="Visa application status, insurance details, personal contacts..." accent="#FF9F43" multiline/></div>
        </div>}
        {tab==="calendar"&&(()=>{const items=[];if(det.transport.mode||det.transport.from)items.push({type:"transport",icon:"✈️",label:det.transport.mode||"Transport",sub:`${det.transport.from||""}→${det.transport.to||""}`,color:"#00E5FF",date:segment.arrival});if(det.stay.name)items.push({type:"stay",icon:"🏨",label:det.stay.name,sub:det.stay.checkin&&det.stay.checkout?`${fD(det.stay.checkin)} – ${fD(det.stay.checkout)}`:`${segment.nights} nights`,color:"#69F0AE",date:det.stay.checkin||segment.arrival});det.activities.forEach(a=>items.push({type:"activity",icon:"🎯",label:a.name,sub:a.cost?`$${a.cost}`:"",color:"#FFD93D",date:a.date}));if(det.food.dailyBudget)items.push({type:"food",icon:"🍜",label:`Food · $${det.food.dailyBudget}/day`,sub:`${segment.nights} days`,color:"#FF9F43"});const hasItems=items.length>0;return(
          <div style={{padding:0}}>
            {!hasItems&&<div style={{textAlign:"center",padding:"40px 20px",minHeight:"auto"}}>
              <div style={{fontSize:32,marginBottom:12}}>📅</div>
              <div style={{color:"rgba(255,255,255,0.5)",fontFamily:"'Fraunces',serif",fontStyle:"italic",fontSize:15,lineHeight:1.6}}>Your calendar fills as you plan.</div>
              <div style={{color:"rgba(255,159,67,0.6)",fontSize:12,letterSpacing:2,marginTop:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>ADD TRANSPORT · STAY · ACTIVITIES TO SEE YOUR DAYS</div>
            </div>}
            {hasItems&&<div>
              <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:"rgba(255,159,67,0.65)",letterSpacing:2,marginBottom:12}}>PLANNED ITEMS</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {items.map((it,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:`${it.color}08`,border:`1px solid ${it.color}30`,borderRadius:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>{it.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:600,color:"#FFF",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{it.label}</div>
                    {it.sub&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{it.sub}</div>}
                  </div>
                  {it.date&&<div style={{fontSize:12,color:it.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,whiteSpace:"nowrap"}}>{fD(it.date)}</div>}
                </div>)}
              </div>
            </div>}
          </div>
        );})()}
      </div>
      </div>
    </div>
  );
}


export default SegmentWorkspace;
