import { useState, useEffect, useRef } from "react";
import { useMobile } from '../hooks/useMobile';
import { askAI } from '../utils/aiHelpers';
import { fD } from '../utils/dateHelpers';
import { loadSeg, saveSeg } from '../utils/storageHelpers';
import { inferTransportMode, findSuggestionForSegment, loadSuggestionsFromStorage, loadDismissed, saveDismissed, suggestionCardStyle, suggestionHeaderStyle, disclaimerStyle, acceptBtnStyle, dismissBtnStyle, transportNotesFromSuggestion, transportSuggestionEstimateHint, isRowEmpty } from '../utils/tripConsoleHelpers';
import SDF from './SDF';
import CityInput from './CityInput';

function SegmentDetails({phaseId,segment,intelSnippet,status="planning",onStatusChange,suggestion:suggestionProp,suggestionsLoading,prevCity="",homeCity=""}) {
  const isMobile=useMobile();
  const key=`${phaseId}-${segment.id}`;
  const blank={transport:{mode:"",from:"",to:"",depTime:"",arrTime:"",cost:"",notes:""},stay:{name:"",checkin:"",checkout:"",cost:"",link:"",notes:""},activities:[],actNotes:"",food:{dailyBudget:"",notes:""},misc:[],intel:{notes:""}};
  const [det,setDet]=useState(()=>{const a=loadSeg();return a[key]?{...blank,...a[key]}:blank;});
  const [cat,setCat]=useState(null);
  const [aiLoad,setAiLoad]=useState(false);
  const [nAct,setNAct]=useState({name:"",date:"",cost:"",transit:"",link:""});
  const [nMisc,setNMisc]=useState({name:"",cost:""});
  const locked=status==='booked';
  const [saveFlash,setSaveFlash]=useState(false);
  const saveFlashRef=useRef(null);
  const isFirstRender=useRef(true);
  // Save form data without overwriting status/history fields managed by SegmentRow
  useEffect(()=>{if(isFirstRender.current){isFirstRender.current=false;return;}const a=loadSeg();const ex=a[key]||{};const merged={...ex,...det,status:ex.status||'planning',statusUpdatedAt:ex.statusUpdatedAt||null,changes:ex.changes||[]};if(isRowEmpty(merged.transport))delete merged.transport;if(isRowEmpty(merged.stay))delete merged.stay;if(isRowEmpty(merged.food))delete merged.food;a[key]=merged;saveSeg(a);setSaveFlash(true);if(saveFlashRef.current)clearTimeout(saveFlashRef.current);saveFlashRef.current=setTimeout(()=>setSaveFlash(false),2000);},[det]);
  const uT=(f,v)=>setDet(d=>({...d,transport:{...d.transport,[f]:v}}));
  const uS=(f,v)=>setDet(d=>({...d,stay:{...d.stay,[f]:v}}));
  const uF=(f,v)=>setDet(d=>({...d,food:{...d.food,[f]:v}}));
  // Resolve suggestion: use prop if available, otherwise look up by segment name from localStorage
  const suggestion = (()=>{
    if(suggestionProp) return suggestionProp;
    const all = loadSuggestionsFromStorage();
    return findSuggestionForSegment(all, segment.name);
  })();
  const dismissKey = segment.name || `${phaseId}`;
  const [dismissed,setDismissedSD]=useState(()=>loadDismissed());
  const isDismSD=(type)=>!!dismissed[`${dismissKey}_${type}`];
  const dismissSD=(type)=>{const d={...dismissed,[`${dismissKey}_${type}`]:true};setDismissedSD(d);saveDismissed(d);};
  const acceptTransportSD=(t)=>{let mode=inferTransportMode(t.route);if(!mode&&/→|–|—|->/.test(String(t.route||"")))mode="Flight";if(mode)uT("mode",mode);uT("from",(prevCity||homeCity||"").trim());uT("to",(segment.name||"").trim());uT("cost",(t.estimatedCost||"").split('-')[0].replace(/[^0-9]/g,''));uT("notes",transportNotesFromSuggestion(t,{prevCity,homeCity,segmentName:segment.name}));dismissSD('transport');};
  const acceptStaySD=(s)=>{const primary=s.suggestions?.[0]||"";const alts=s.suggestions?.slice(1)||[];if(primary)uS("name",primary);uS("cost",(s.estimatedTotal||"").split('-')[0].replace(/[^0-9]/g,''));if(segment.arrival&&!det.stay.checkin)uS("checkin",segment.arrival);if(segment.departure&&!det.stay.checkout)uS("checkout",segment.departure);uS("notes",`${alts.length>0?`Alternatives: ${alts.join(', ')}\n\n`:""}${s.recommendation||""}${s.notes?`\n${s.notes}`:""}`);dismissSD('stay');};
  const acceptActivitySD=(a,suggestionIdx=null)=>{const sentences=(a.notes||"").split(/(?<=[.!?])\s+/);const brief=sentences[0]||"";const tipText=sentences.slice(1).join(' ');const row={name:a.name,brief,tip:tipText,date:"",cost:(a.estimatedCost||"").match(/\d+/)?.[0]||"",notes:`${a.provider||""}${tipText?`\n${tipText}`:""}`,provider:a.provider||"",id:Date.now()+Math.random()};if(suggestionIdx!=null)row.suggestionActivityIdx=suggestionIdx;setDet(d=>({...d,activities:[...d.activities,row]}));};
  async function aiFood(){setAiLoad(true);const r=await askAI(`Daily food budget USD solo traveler ${segment.name}. Number only.`,20);const nums=(r.match(/\d+/g)||[]).map(Number).filter(x=>x>0&&x<500);let n="";if(nums.length===1)n=String(nums[0]);else if(nums.length>=2)n=String(Math.round((nums[0]+nums[1])/2));if(n)uF("dailyBudget",n);setAiLoad(false);}
  const CATS=[{id:"transport",icon:"✈️",label:"TRANSPORT",a:DIVE_CYAN,w:CYAN_WASH},{id:"stay",icon:"🏠",label:"STAY",a:SURF_GREEN,w:GREEN_WASH},{id:"activities",icon:"🎯",label:"ACTIVITIES",a:CULTURE_GOLD,w:GOLD_04},{id:"food",icon:"🍽️",label:"FOOD",a:EXPLORATION_ORANGE,w:ORANGE_WASH},{id:"misc",icon:"💸",label:"MISC",a:NATURE_PURPLE,w:PURPLE_WASH},{id:"intel",icon:"🔭",label:"INTEL",a:MOTO_RED,w:RED_04}];
  const done={transport:!!(det.transport.mode||det.transport.cost),stay:!!(det.stay.name||det.stay.cost),activities:det.activities.length>0,food:!!(det.food.dailyBudget),misc:det.misc.length>0,intel:!!(intelSnippet?.tagline||det.intel.notes)};
  const ac=CATS.find(c=>c.id===cat);
  const prevStop=(prevCity||"").trim();
  const homeStop=(homeCity||"").trim();
  const thisStop=(segment.name||"").trim();
  const plannedLegFrom=prevStop||homeStop||"Trip start";
  const plannedLegTo=thisStop||"This stop";
  const tripFieldLabel={fontSize:isMobile?10:12,color:"rgba(0,229,255,0.75)",letterSpacing:1.2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500,opacity:0.92};
  const cityInStyle={background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:6,color:"#FFF",fontSize:isMobile?12:14,padding:isMobile?"4px 7px":"5px 8px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",width:"100%",maxWidth:"100%",boxSizing:"border-box",lineHeight:1.6};
  const legChipStyle={padding:"4px 9px",borderRadius:6,border:"1px solid rgba(0,229,255,0.35)",background:"rgba(0,229,255,0.06)",color:"rgba(0,229,255,0.88)",fontSize:10,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",minHeight:28};
  return(
    <div style={{borderTop:"1px solid rgba(0,229,255,0.06)"}}>
      {/* Status banner — lock notice or LOCK BOOKING button */}
      {locked&&<div style={{padding:"7px 14px",background:"rgba(105,240,174,0.06)",borderBottom:"1px solid rgba(105,240,174,0.15)",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:"#69F0AE",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,flex:1}}>🔒 BOOKED — tap badge to unlock for editing</span>
      </div>}
      {status==='changed'&&<div style={{padding:"7px 14px",background:"rgba(255,107,107,0.06)",borderBottom:"1px solid rgba(255,107,107,0.2)",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:"#FF6B6B",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,flex:1}}>⚠️ CHANGED — update your details, then lock when done</span>
        <button onClick={()=>onStatusChange?.('booked')} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:"1px solid rgba(105,240,174,0.4)",background:"rgba(105,240,174,0.08)",color:"#69F0AE",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,whiteSpace:"nowrap",minHeight:26}}>✓ LOCK BOOKING</button>
      </div>}
      <div style={{pointerEvents:locked?"none":"auto",opacity:locked?0.55:1,transition:"opacity 0.2s"}}>
      <div style={{display:"flex",background:"rgba(0,4,12,0.8)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",position:"relative"}}>
        {saveFlash&&<div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"#69F0AE",opacity:0.80,letterSpacing:1,transition:"opacity 0.40s cubic-bezier(0.25,0.46,0.45,0.94)",zIndex:2,pointerEvents:"none"}}>&#10003; saved</div>}
        {CATS.map(c=>{const on=cat===c.id;return(
          <button key={c.id} onClick={()=>setCat(on?null:c.id)} style={{flexShrink:0,minWidth:52,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"7px 4px",border:"none",cursor:"pointer",background:on?c.w:"transparent",borderBottom:on?`2px solid ${c.a}`:"2px solid transparent",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",position:"relative"}}>
            <span style={{fontSize:isMobile?13:15,lineHeight:1}}>{c.icon}</span>
            <span style={{fontSize:isMobile?10:12,letterSpacing:0,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,color:on?c.a:"rgba(255,255,255,0.55)",whiteSpace:"nowrap"}}>{c.label}{c.id==="activities"&&det.activities.length>0?<span style={{color:"#FF9F43",fontSize:isMobile?9:11}}> ({det.activities.length})</span>:""}{c.id==="misc"&&det.misc.length>0?<span style={{color:"#A29BFE",fontSize:isMobile?9:11}}> ({det.misc.length})</span>:""}</span>
            {done[c.id]&&<div style={{position:"absolute",top:4,right:"14%",width:5,height:5,borderRadius:"50%",background:c.a,boxShadow:`0 0 5px ${c.a}`}}/>}
          </button>
        );})}
      </div>
      {!cat&&<div style={{padding:"12px 16px",textAlign:"center",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?11:13,fontStyle:"italic",color:"rgba(0,229,255,0.35)",lineHeight:1.5}}>Tap a category above to start planning this segment</div>
      </div>}
      {cat&&ac&&(
        <div style={{background:ac.w,borderTop:`1px solid ${ac.a}15`,animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          {cat==="transport"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>
            {suggestion?.transport&&!isDismSD('transport')&&<div style={suggestionCardStyle}>
              <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
              <div style={{fontSize:13,fontWeight:700,color:'#FFD93D',marginBottom:6,lineHeight:1.45,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>
                This leg: {plannedLegFrom} → {plannedLegTo}
                <span style={{color:'rgba(255,245,220,0.45)',fontWeight:600}}> · </span>
                Est. {suggestion.transport.estimatedCost}
              </div>
              {suggestion.transport.route?<div style={{fontSize:12,color:'rgba(255,255,255,0.36)',lineHeight:1.5,marginBottom:5,whiteSpace:'pre-wrap'}}>{suggestion.transport.route}</div>:null}
              <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:3}}>{suggestion.transport.duration}</div>
              <div style={{fontSize:10,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.40)',lineHeight:1.45,marginBottom:6}}>{transportSuggestionEstimateHint({prevCity,segmentName:segment.name})}</div>
              {suggestion.transport.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:8}}>{suggestion.transport.notes}</div>}
              <div style={disclaimerStyle}>⚡ Estimates — actual prices vary when booked</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>acceptTransportSD(suggestion.transport)} style={acceptBtnStyle}>USE THIS ROUTE</button>
                <button onClick={()=>dismissSD('transport')} style={dismissBtnStyle}>PLAN MY OWN</button>
              </div>
            </div>}
            {(det.transport.mode||det.transport.from)&&<div style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:4}}>
              <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>✈️ {det.transport.mode||"Transport"}{det.transport.from&&det.transport.to?` · ${det.transport.from} → ${det.transport.to}`:""}{det.transport.cost?` · $${det.transport.cost}`:""}</div>
              {(det.transport.depTime||det.transport.arrTime)&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:2}}>{det.transport.depTime?`Departs ${det.transport.depTime}`:""}{det.transport.depTime&&det.transport.arrTime?" · ":""}{det.transport.arrTime?`Arrives ${det.transport.arrTime}`:""}</div>}
            </div>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginTop:6}}>
              <div style={{display:"flex",flexDirection:"column",gap:isMobile?2:3}}>
                <div style={tripFieldLabel}>FROM</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
                  {prevStop?<button type="button" onClick={()=>uT("from",prevStop)} style={legChipStyle}>Use previous stop</button>:null}
                  {homeStop&&(!prevStop||homeStop.toLowerCase()!==prevStop.toLowerCase())?<button type="button" onClick={()=>uT("from",homeStop)} style={legChipStyle}>{prevStop?"Trip departure (home)":"Use trip departure"}</button>:null}
                </div>
                <CityInput accent="cyan" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="City, region, or airport" style={cityInStyle}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:isMobile?2:3}}>
                <div style={tripFieldLabel}>TO</div>
                {thisStop?<div style={{display:"flex",flexWrap:"wrap",gap:5}}><button type="button" onClick={()=>uT("to",thisStop)} style={legChipStyle}>This stop: {thisStop}</button></div>:null}
                <CityInput accent="cyan" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="City, region, or airport" style={cityInStyle}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginTop:6}}>
              <SDF label="DEPART (TIME OR DATE)" value={det.transport.depTime} onChange={v=>uT("depTime",v)} placeholder="e.g. 08:30 or Sep 26" accent="#00E5FF"/>
              <SDF label="ARRIVE (TIME OR DATE)" value={det.transport.arrTime} onChange={v=>uT("arrTime",v)} placeholder="e.g. 11:45 or Sep 26" accent="#00E5FF"/>
            </div>
            <SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="Flight number, booking ref..." accent="#00E5FF" multiline/>
          </div>}
          {cat==="stay"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
            {suggestion?.stay&&!isDismSD('stay')&&<div style={suggestionCardStyle}>
              <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
              <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{suggestion.stay.recommendation}</div>
              {suggestion.stay.suggestions?.length>0&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',marginBottom:3}}>Options: {suggestion.stay.suggestions.join(' · ')}</div>}
              <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:3}}>Est. {suggestion.stay.estimatedNightly} · Total ~{suggestion.stay.estimatedTotal}</div>
              <div style={disclaimerStyle}>⚡ Estimates — actual prices vary when booked</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>acceptStaySD(suggestion.stay)} style={acceptBtnStyle}>ADD TO STAY NOTES</button>
                <button onClick={()=>dismissSD('stay')} style={dismissBtnStyle}>PLAN MY OWN</button>
              </div>
            </div>}
            {det.stay.name&&<div style={{background:"rgba(105,240,174,0.04)",border:"1px solid rgba(105,240,174,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:4}}>
              <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>🏨 {det.stay.name}</div>
              {(det.stay.checkin||det.stay.checkout||det.stay.cost)&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:2}}>{det.stay.checkin?`Check-in ${fD(det.stay.checkin)}`:""}{det.stay.checkin&&det.stay.checkout?" · ":""}{det.stay.checkout?`Check-out ${fD(det.stay.checkout)}`:""}{det.stay.cost?` · $${det.stay.cost}`:""}</div>}
            </div>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:6,marginTop:6,overflow:"hidden"}}>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
            </div>
            <SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/>
            <SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/>
          </div>}
          {cat==="activities"&&<div style={{padding:"10px 12px"}}>
            {suggestion?.activities?.map((activity,idx)=>(
              !isDismSD(`activity_${idx}`)&&!det.activities.some(x=>x.suggestionActivityIdx===idx)&&<div key={idx} style={{...suggestionCardStyle,marginBottom:8,animationDelay:`${idx*100}ms`}}>
                <div style={suggestionHeaderStyle}>✦ SUGGESTED ACTIVITY</div>
                <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{activity.name}</div>
                {activity.provider&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',marginBottom:3}}>{activity.provider}</div>}
                <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:3}}>Est. {activity.estimatedCost}</div>
                {activity.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:8}}>{activity.notes}</div>}
                <div style={disclaimerStyle}>⚡ Estimates only — prices vary when booked</div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>acceptActivitySD(activity,idx)} style={acceptBtnStyle}>+ ADD TO PLAN</button>
                  <button onClick={()=>dismissSD(`activity_${idx}`)} style={dismissBtnStyle}>SKIP</button>
                </div>
              </div>
            ))}
            {det.activities.length===0&&!(suggestion?.activities?.some((_,i)=>!isDismSD(`activity_${i}`)&&!det.activities.some(x=>x.suggestionActivityIdx===i)))&&<div style={{textAlign:"center",padding:"6px 0 10px",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?11:13,fontStyle:"italic",color:"rgba(255,217,61,0.35)",lineHeight:1.5}}>Add your first activity — dives, tours, day trips</div></div>}
            {det.activities.length>0&&<div style={{marginBottom:12}}>
              {det.activities.map(a=>(
                <div key={a.id} style={{background:"rgba(255,217,61,0.03)",border:"1px solid rgba(255,217,61,0.10)",borderRadius:8,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{a.name}</div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",display:"flex",gap:8,flexWrap:"wrap"}}>
                        {a.date&&<span>{fD(a.date)}</span>}{a.cost&&<span style={{color:"#FFD93D"}}>${a.cost}</span>}{a.transit&&<span style={{color:"rgba(255,255,255,0.50)"}}>🚕 {a.transit}</span>}
                      </div>
                      {a.link&&<a href={a.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#00E5FF",textDecoration:"none",display:"inline-block",marginTop:4,maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
                    </div>
                    <button onClick={()=>{
                      const removed=a;
                      setDet(d=>({...d,activities:d.activities.filter(x=>x.id!==removed.id)}));
                      if(suggestion?.activities?.length){
                        setDismissedSD(d0=>{
                          const dd={...d0};
                          let ch=false;
                          suggestion.activities.forEach((sa,i)=>{
                            const key=`${dismissKey}_activity_${i}`;
                            if(!dd[key]) return;
                            if(removed.suggestionActivityIdx===i){delete dd[key];ch=true;}
                            else if(removed.suggestionActivityIdx==null&&(removed.name||"").trim().toLowerCase()===(sa.name||"").trim().toLowerCase()){delete dd[key];ch=true;}
                          });
                          if(ch) saveDismissed(dd);
                          return ch?dd:d0;
                        });
                      }
                    }} style={{background:"none",border:"none",color:"rgba(255,255,255,0.30)",fontSize:14,cursor:"pointer",lineHeight:1,padding:"2px 4px",flexShrink:0}}>✕</button>
                  </div>
                </div>
              ))}
              <div style={{paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.25)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>TOTAL ACTIVITIES</span>
                <span style={{fontSize:13,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>${det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}</span>
              </div>
            </div>}
            <div style={{padding:"9px 0px"}}>
              <div style={{fontSize:11,color:"rgba(255,217,61,0.4)",letterSpacing:1.5,marginBottom:6,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500}}>ADD ACTIVITY</div>
              <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:5,marginBottom:5,overflow:"hidden"}}>
                <div style={{flex:1,minWidth:0}}><SDF label="ACTIVITY" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#FFD93D"/></div>
                <div style={{flex:1,minWidth:0}}><SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#FFD93D"/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:5,marginBottom:6,overflow:"hidden"}}>
                <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#FFD93D"/>
                <SDF label="TRANSIT" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Taxi from hotel..." accent="#FFD93D"/>
              </div>
              <SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://klook.com / dive shop..." accent="#FFD93D"/>
              <button onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:[...d.activities,{...nAct,id:Date.now()}]}));setNAct({name:"",date:"",cost:"",transit:"",link:""});}} style={{marginTop:8,padding:isMobile?"5px 12px":"6px 14px",borderRadius:5,border:`1px solid rgba(255,217,61,${nAct.name?"0.4":"0.14"})`,background:nAct.name?"rgba(255,217,61,0.1)":"transparent",color:nAct.name?"#FFD93D":"rgba(255,255,255,0.18)",fontSize:isMobile?11:15,cursor:nAct.name?"pointer":"default",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:700}}>+ ADD</button>
            </div>
            <div style={{marginTop:12}}><SDF label="ACTIVITY NOTES" value={det.actNotes||""} onChange={v=>setDet(d=>({...d,actNotes:v}))} placeholder="Tips, what to bring, dress code, best time..." accent="#FFD93D" multiline/></div>
          </div>}
          {cat==="food"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
            {suggestion?.food&&!isDismSD('food')&&<div style={suggestionCardStyle}>
              <div style={suggestionHeaderStyle}>✦ FOOD & DINING</div>
              <div style={{fontSize:14,fontWeight:600,color:'#FFD93D',marginBottom:6}}>Est. {(suggestion.food.dailyBudget||"").replace(/\/day$/i,"")}/day{suggestion.food.totalEstimate?` · ~${suggestion.food.totalEstimate} total`:""}</div>
              {suggestion.food.recommendations?.map((rec,i)=>(
                <div key={i} style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:4,paddingLeft:8,borderLeft:'2px solid rgba(255,159,67,0.30)'}}>{rec}</div>
              ))}
              {suggestion.food.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginTop:6}}>{suggestion.food.notes}</div>}
              <div style={{...disclaimerStyle,marginTop:8}}>⚡ Suggestions based on current market knowledge — always verify locally</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>{const bud=(suggestion.food.dailyBudget||"").match(/\d+/)?.[0]||"";if(bud)uF("dailyBudget",bud);uF("notes",suggestion.food.recommendations?.join('\n')||"");dismissSD('food');}} style={acceptBtnStyle}>USE ESTIMATES</button>
                <button onClick={()=>dismissSD('food')} style={dismissBtnStyle}>PLAN MY OWN</button>
              </div>
            </div>}
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <div style={{flex:1}}><SDF label="DAILY FOOD BUDGET ($)" type="number" value={det.food.dailyBudget} onChange={v=>uF("dailyBudget",v)} placeholder="e.g. 45" accent="#FF9F43"/></div>
              <button onClick={aiFood} disabled={aiLoad} style={{padding:"5px 10px",borderRadius:5,border:"1px solid rgba(255,159,67,0.3)",background:"rgba(255,159,67,0.05)",color:"rgba(255,159,67,0.8)",fontSize:11,cursor:aiLoad?"wait":"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:600,whiteSpace:"nowrap",height:28,flexShrink:0}}>{aiLoad?"✦...":"✦ CO-ARCH EST"}</button>
            </div>
            {det.food.dailyBudget&&<div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,159,67,0.05)",border:"1px solid rgba(255,159,67,0.16)",borderRadius:7}}>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.35)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{segment.nights} nights × ${det.food.dailyBudget}/day</span>
              <span style={{fontSize:13,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>${(parseFloat(det.food.dailyBudget)*segment.nights).toLocaleString()}</span>
            </div>}
            <SDF label="FOOD NOTES" value={det.food.notes} onChange={v=>uF("notes",v)} placeholder="Must-try dishes, market days, dietary notes..." accent="#FF9F43" multiline/>
          </div>}
          {cat==="misc"&&<div style={{padding:"10px 12px"}}>
            {det.misc.length>0&&<div style={{marginBottom:12}}>
              {det.misc.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(162,155,254,0.07)"}}>
                  <div style={{flex:1,fontSize:isMobile?12:15,color:"#FFF",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{m.name}</div>
                  <span style={{fontSize:isMobile?12:15,fontWeight:700,color:"#A29BFE",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0}}>${parseFloat(m.cost||0).toLocaleString()}</span>
                  <button onClick={()=>setDet(d=>({...d,misc:d.misc.filter(x=>x.id!==m.id)}))} style={{background:"none",border:"none",color:"rgba(255,255,255,0.18)",fontSize:16,cursor:"pointer",lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
                </div>
              ))}
              <div style={{paddingTop:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"rgba(255,255,255,0.25)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>TOTAL MISC</span><span style={{fontSize:13,fontWeight:600,color:"rgba(162,155,254,0.8)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>${det.misc.reduce((s,m)=>s+(parseFloat(m.cost)||0),0).toLocaleString()}</span></div>
            </div>}
            <div style={{background:"rgba(162,155,254,0.02)",border:"1px dashed rgba(162,155,254,0.16)",borderRadius:8,padding:"11px 12px"}}>
              <div style={{fontSize:11,color:"rgba(162,155,254,0.4)",letterSpacing:1.5,marginBottom:6,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500}}>ADD EXPENSE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
                <SDF label="ITEM" value={nMisc.name} onChange={v=>setNMisc(m=>({...m,name:v}))} placeholder="Visa / permit / rental..." accent="#A29BFE"/>
                <SDF label="COST ($)" type="number" value={nMisc.cost} onChange={v=>setNMisc(m=>({...m,cost:v}))} placeholder="0" accent="#A29BFE"/>
              </div>
              <button onClick={()=>{if(!nMisc.name)return;setDet(d=>({...d,misc:[...d.misc,{...nMisc,id:Date.now()}]}));setNMisc({name:"",cost:""});}} style={{padding:isMobile?"5px 12px":"6px 14px",borderRadius:5,border:`1px solid rgba(162,155,254,${nMisc.name?"0.4":"0.14"})`,background:nMisc.name?"rgba(162,155,254,0.1)":"transparent",color:nMisc.name?"#A29BFE":"rgba(255,255,255,0.18)",fontSize:isMobile?11:15,cursor:nMisc.name?"pointer":"default",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:700}}>+ ADD</button>
            </div>
          </div>}
          {/* arch #2: inline intel preview */}
          {cat==="intel"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
            {intelSnippet&&!intelSnippet.error?(
              <div style={{padding:"10px 12px",background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.14)",borderRadius:8}}>
                {intelSnippet.tagline&&<div style={{fontSize:isMobile?12:15,color:"#A29BFE",fontStyle:"italic",marginBottom:8,lineHeight:1.55}}>{intelSnippet.tagline}</div>}
                {intelSnippet.mustDo?.slice(0,3).map((item,i)=><div key={i} style={{fontSize:isMobile?11:15,color:"rgba(255,255,255,0.68)",marginBottom:4,paddingLeft:8}}>• {item}</div>)}
                {intelSnippet.streetIntel?.[0]&&<div style={{marginTop:8,padding:"6px 9px",background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.18)",borderRadius:6}}><div style={{fontSize:isMobile?10:15,color:"#FF6B6B",fontWeight:700,letterSpacing:1.5,marginBottom:2}}>{intelSnippet.streetIntel[0].type}</div><div style={{fontSize:isMobile?11:15,color:"#FFF"}}>{intelSnippet.streetIntel[0].alert}</div></div>}
                <div style={{marginTop:10,fontSize:isMobile?11:15,color:"rgba(0,229,255,0.5)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>→ Full briefing in INTEL tab</div>
              </div>
            ):(
              <div style={{padding:"12px 14px",background:"rgba(255,107,107,0.03)",border:"1px solid rgba(255,107,107,0.09)",borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18,opacity:0.35}}>🔭</span>
                <div><div style={{fontSize:isMobile?11:15,color:"rgba(255,255,255,0.38)",fontStyle:"italic",marginBottom:2}}>No briefing for {segment.name} yet.</div><div style={{fontSize:isMobile?11:15,color:"rgba(0,229,255,0.45)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>→ Generate in the INTEL tab</div></div>
              </div>
            )}
            <SDF label="YOUR NOTES" value={det.intel.notes} onChange={v=>setDet(d=>({...d,intel:{...d.intel,notes:v}}))} placeholder="Visa requirements, local contacts, personal tips..." accent="#FF6B6B" multiline/>
          </div>}
        </div>
      )}
      </div>{/* end pointerEvents wrapper */}
    </div>
  );
}


export default SegmentDetails;
