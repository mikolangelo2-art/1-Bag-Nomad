import { useState, useEffect, useRef } from "react";
import { useMobile } from '../hooks/useMobile';
import { askAI } from '../utils/aiHelpers';
import { fmt, fD } from '../utils/dateHelpers';
import { loadSeg, saveSeg } from '../utils/storageHelpers';
import { STATUS_CFG, STATUS_NEXT } from '../utils/tripConsoleHelpers';
import { TRIP_CATEGORY_COLORS } from '../constants/colors';
import SegmentDetails from './SegmentDetails';
import ProgDots from './ProgDots';

const TC = TRIP_CATEGORY_COLORS;

function SegmentRow({segment,phaseId,phaseColor,intelSnippet,isLast,onAskOpenChange,onSegmentTap,suggestion,suggestionsLoading,prevCity="",homeCity=""}) {
  const isMobile=useMobile();
  const segKey=`${phaseId}-${segment.id}`;
  const [open,setOpen]=useState(false);
  const [askOpen,setAskOpen]=useState(false);
  useEffect(()=>{onAskOpenChange?.(askOpen);},[askOpen]);
  const [askInput,setAskInput]=useState("");
  const [askChat,setAskChat]=useState([]);
  const [askLoading,setAskLoading]=useState(false);
  const [showChangeModal,setShowChangeModal]=useState(false);
  const [status,setStatus]=useState(()=>{const d=loadSeg()[segKey];return d?.status||'planning';});
  const segData=loadSeg()[segKey]||null;
  const askEnd=useRef(null);
  const tc=TC[segment.type]||"#c9a04c";
  const sc=STATUS_CFG[status]||STATUS_CFG.planning;
  const countryLabel=(segment.country||"").trim();
  const titleFs=17;
  const dateMonoFs=13;
  const revealBodyFs=isMobile?14:15;
  const segChipFromStatus=planStatus
    ?{color:planStatus.color,border:`1px solid ${planStatus.border}`,background:planStatus.bg||"transparent"}
    :status==="planning"
      ?{color:"#C9A04C",border:"1px solid rgba(201,160,76,0.45)",background:"transparent"}
      :status==="confirmed"
        ?{color:"#5E8B8A",border:"1px solid rgba(94,139,138,0.5)",background:"transparent"}
        :status==="booked"
          ?{color:"#69F0AE",border:"1px solid rgba(105,240,174,0.45)",background:"transparent"}
          :status==="changed"
            ?{color:"#FF6B6B",border:"1px solid rgba(255,107,107,0.45)",background:"transparent"}
            :{color:"rgba(232,220,200,0.45)",border:"1px solid rgba(122,111,93,0.5)",background:"transparent"};
  // Planning completion status
  const hasTransport=segData&&Object.values(segData.transport||{}).some(v=>v&&String(v).length>0);
  const hasStay=segData?.stay?.name?.length>0;
  const hasActivities=(segData?.activities?.length||0)>0;
  const completedCount=[hasTransport,hasStay,hasActivities].filter(Boolean).length;
  const planStatus=status==="booked"||status==="confirmed"?null:completedCount===0?{label:"NOT STARTED",color:"rgba(232,220,200,0.45)",bg:"transparent",border:"rgba(122,111,93,0.5)"}:completedCount===1?{label:"IN PROGRESS",color:"#C9A04C",bg:"transparent",border:"rgba(201,160,76,0.5)"}:completedCount===2?{label:"MOSTLY DONE",color:"#C9A04C",bg:"transparent",border:"rgba(201,160,76,0.5)"}:{label:"COMPLETE",color:"#5E8B8A",bg:"transparent",border:"rgba(94,139,138,0.5)"};
  const isCancelled=status==='cancelled';
  const [insight,setInsight]=useState("");
  useEffect(()=>{
    const insightKey=`1bn_seg_insight_v1_${(segment.name||"").replace(/\s+/g,"_")}`;
    try{
      const cached=localStorage.getItem(insightKey);
      if(cached){setInsight(cached);return;}
    }catch(e){}
    let cancelled=false;
    askAI(
      `One-line evocative travel teaser for "${segment.name}" (${segment.type}, ${segment.nights} nights). Max 18 words. No quotes, no labels. Sensory, confident, specific.`,
      120
    ).then(r=>{
      if(!cancelled&&r){
        const clean=String(r).replace(/^["']|["']$/g,"").trim();
        setInsight(clean);
        try{localStorage.setItem(insightKey,clean);}catch(e){}
      }
    });
    return()=>{cancelled=true;};
  },[segment.name,segment.type,segment.nights]);

  function saveStatus(newStatus){
    const all=loadSeg();const ex=all[segKey]||{};const prev=ex.status||'planning';
    all[segKey]={...ex,status:newStatus,statusUpdatedAt:new Date().toISOString(),changes:[...(ex.changes||[]),{changedAt:new Date().toISOString(),previousStatus:prev}]};
    saveSeg(all);setStatus(newStatus);
  }
  function handleBadgeTap(e){
    e.stopPropagation();
    if(status==='booked'){setShowChangeModal(true);return;}
    if(STATUS_NEXT[status])saveStatus(STATUS_NEXT[status]);
  }

  useEffect(()=>{askEnd.current?.scrollIntoView({behavior:"smooth"});},[askChat]);
  async function sendAsk(){
    if(!askInput.trim()||askLoading)return;
    const msg=askInput;setAskInput("");setAskChat(p=>[...p,{role:"user",text:msg}]);setAskLoading(true);
    const det=loadSeg()[segKey]||{};
    const ctx=`Segment:${segment.name}(${segment.type}).${segment.nights}n.$${segment.budget}.${det.stay?.name?"Stay:"+det.stay.name+".":""}${det.transport?.mode?"Transport:"+det.transport.mode+".":""}`;
    const statusCtx=status==='changed'||status==='cancelled'?` Note: this segment is ${status}.`:'';
    const res=await askAI(`Travel co-architect.${ctx}${statusCtx} Q:"${msg}".2-3 sentences max.`,300);
    setAskChat(p=>[...p,{role:"ai",text:res}]);setAskLoading(false);
  }
  return(
    <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(122,111,93,0.35)',borderRadius:16,borderLeft:`3px solid ${tc}`,marginBottom:12,overflow:'hidden',transition:'border-color 0.2s ease',opacity:isCancelled?0.65:1,boxSizing:'border-box'}}>
      {/* Change Flow Modal */}
      {showChangeModal&&(
        <div onClick={()=>setShowChangeModal(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,4,14,0.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:400,background:"rgba(0,8,20,0.98)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:14,padding:"24px 20px",animation:"fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontStyle:"italic",color:"#FF9F43",marginBottom:6}}>What happened?</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:20,lineHeight:1.7}}>{segment.name} is currently booked. What changed?</div>
            <div style={{display:"flex",gap:10,flexDirection:isMobile?"column":"row"}}>
              <button onClick={()=>{saveStatus('changed');setShowChangeModal(false);setOpen(true);}} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(201,160,76,0.35)",background:"rgba(201,160,76,0.08)",color:"#C9A04C",fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"Instrument Sans, sans-serif",minHeight:44}}>UPDATE BOOKING</button>
              <button onClick={()=>{saveStatus('cancelled');setShowChangeModal(false);}} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(255,107,107,0.4)",background:"rgba(255,107,107,0.08)",color:"#FF6B6B",fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:44}}>MARK CANCELLED</button>
            </div>
            <button onClick={()=>setShowChangeModal(false)} style={{marginTop:12,width:"100%",background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:36}}>← Keep as BOOKED</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",alignItems:"stretch",minHeight:50,borderLeft:"none",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
        <div onClick={()=>{if(onSegmentTap){onSegmentTap(segment);}else{setOpen(o=>!o);}}} style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"10px 6px 10px 12px":"12px 10px 12px 20px",cursor:"pointer",background:open?"rgba(201,160,76,0.06)":"transparent",transition:"background 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flex:1,minWidth:0}}>
          {/* Row 1: dot + destination · country + dates (Space Mono) + type + budget */}
          <div style={{display:"flex",alignItems:"flex-start",gap:8,minWidth:0,width:"100%"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#5E8B8A",flexShrink:0,marginTop:6,boxShadow:open?"0 0 7px rgba(94,139,138,0.5)":"none"}}/>
            <div style={{flex:1,minWidth:0,display:"flex",flexWrap:"wrap",alignItems:"baseline",gap:"4px 10px"}}>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:titleFs,fontWeight:600,color:isCancelled?"rgba(232,220,200,0.35)":"#E8DCC8",lineHeight:1.2,letterSpacing:"0.02em",textDecoration:isCancelled?"line-through":"none"}}>{segment.name}</span>
              {countryLabel&&<>
                <span style={{fontFamily:"'Fraunces',serif",fontSize:titleFs,color:"rgba(232,220,200,0.35)",fontWeight:400,lineHeight:1}} aria-hidden>·</span>
                <span style={{fontFamily:"'Fraunces',serif",fontSize:titleFs,fontWeight:600,color:isCancelled?"rgba(232,220,200,0.35)":"#E8DCC8",lineHeight:1.2,letterSpacing:"0.02em",textDecoration:isCancelled?"line-through":"none"}}>{countryLabel}</span>
              </>}
              <span style={{fontFamily:"Instrument Sans, sans-serif",fontSize:dateMonoFs,fontWeight:400,color:"rgba(232,220,200,0.55)",whiteSpace:"nowrap",marginLeft:"auto"}}>{fD(segment.arrival)} → {fD(segment.departure)} <span style={{color:"rgba(232,220,200,0.35)"}}>·</span> {segment.nights}n{segment.diveCount>0?<><span style={{color:"rgba(232,220,200,0.35)"}}> · </span><span style={{color:"#5E8B8A"}}>🤿{segment.diveCount}</span></>:""}</span>
            </div>
            <span style={{background:"rgba(94,139,138,0.15)",border:"1px solid rgba(94,139,138,0.4)",color:"#5E8B8A",fontFamily:"Instrument Sans, sans-serif",fontWeight:600,fontSize:11,letterSpacing:"1px",padding:"3px 10px",borderRadius:20,textTransform:"uppercase",whiteSpace:"nowrap",flexShrink:0,alignSelf:"flex-start",marginTop:2}}>{segment.type?.toUpperCase()}</span>
            <span style={{fontSize:15,fontWeight:600,color:"#C9A04C",fontFamily:"Instrument Sans, sans-serif",whiteSpace:"nowrap",flexShrink:0,textDecoration:isCancelled?"line-through":"none",alignSelf:"flex-start",marginTop:1}}>{fmt(segment.budget)}</span>
          </div>
          {/* Row 2: status + progress */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,paddingLeft:15,minWidth:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <div style={{flex:1,minWidth:0}}/>
            <ProgDots phaseId={phaseId} segment={segment} intelSnippet={intelSnippet}/>
            <button onClick={handleBadgeTap} style={{...segChipFromStatus,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:500,letterSpacing:"0.8px",textTransform:"uppercase",cursor:"pointer",fontFamily:"Instrument Sans, sans-serif",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:2,lineHeight:1.4,minHeight:24,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flexShrink:0,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",animation:status==='planning'&&completedCount===0?'planningPulse 2.2s ease-in-out infinite':'none'}}>
              <span style={{fontSize:11}}>{planStatus?completedCount>=3?"✓":sc.icon:sc.icon}</span>{planStatus?planStatus.label:sc.label}
            </button>
          </div>
{segment.note&&<div style={{fontFamily:"'Fraunces',serif",fontSize:revealBodyFs,fontStyle:"italic",fontWeight:400,color:"rgba(255,248,235,0.78)",lineHeight:1.55,marginTop:8,paddingLeft:15,maxWidth:"100%",wordBreak:"break-word"}}>{segment.note}</div>}
          {insight&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",fontWeight:300,color:"rgba(201,160,76,0.75)",lineHeight:1.6,padding:"8px 16px 12px",maxWidth:"100%",wordBreak:"break-word"}}>{insight}</div>}
        </div>
        {onSegmentTap?<div onClick={e=>{e.stopPropagation();onSegmentTap(segment);}} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"0 10px",cursor:"pointer",flexShrink:0}}>
          <span style={{fontSize:18,color:"rgba(255,255,255,0.30)",fontWeight:300}}>›</span>
        </div>:<>
        <div onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"0 8px",cursor:"pointer",flexShrink:0}}>
          <div style={{width:16,height:16,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.15":"0.08"})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:11,color:open?"#C9A04C":"rgba(232,220,200,0.4)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>▼</span>
          </div>
        </div>
        <button onClick={e=>{e.stopPropagation();setAskOpen(o=>!o);}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:"8px 10px",background:askOpen?"rgba(201,160,76,0.1)":"rgba(201,160,76,0.03)",border:"none",borderLeft:`1px solid rgba(201,160,76,${askOpen?"0.45":"0.22"})`,cursor:"pointer",flexShrink:0,height:"100%",minWidth:38,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} title="Ask co-architect">
          <span style={{fontSize:11,color:askOpen?"#c9a04c":"rgba(201,160,76,0.55)",lineHeight:1,textShadow:askOpen?"0 0 8px rgba(201,160,76,0.6)":"none",animation:askOpen?"none":"glowPulse 2.5s ease-in-out infinite"}}>✦</span>
          <span style={{fontSize:10,color:askOpen?"#c9a04c":"rgba(201,160,76,0.4)",letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,whiteSpace:"nowrap"}}>ASK</span>
        </button></>}
      </div>
      {!open&&segData&&(hasTransport||hasStay||hasActivities||segData.food?.dailyBudget)&&(
        <div onClick={()=>setOpen(true)} style={{padding:"6px 14px 8px 20px",display:"flex",flexWrap:"wrap",gap:"6px 10px",cursor:"pointer",background:"rgba(0,4,14,0.4)"}}>
          {hasTransport&&<span style={{fontSize:isMobile?13:14,fontWeight:500,color:"rgba(255,248,235,0.82)",fontFamily:"'Space Mono',ui-monospace,monospace",whiteSpace:"nowrap",lineHeight:1.55}}>✈️ {segData.transport.mode||"Transport"}{segData.transport.from&&segData.transport.to?` · ${segData.transport.from} → ${segData.transport.to}`:""}{segData.transport.cost?` · $${segData.transport.cost}`:""}</span>}
          {hasStay&&<span style={{fontSize:isMobile?13:14,fontWeight:500,color:"rgba(255,248,235,0.82)",fontFamily:"'Space Mono',ui-monospace,monospace",whiteSpace:"nowrap",lineHeight:1.55}}>🏨 {segData.stay.name}{segData.stay.cost?` · $${segData.stay.cost}`:""}</span>}
          {hasActivities&&<span style={{fontSize:isMobile?13:14,fontWeight:500,color:"rgba(255,248,235,0.82)",fontFamily:"'Space Mono',ui-monospace,monospace",whiteSpace:"nowrap",lineHeight:1.55}}>⚡ {segData.activities.length} activit{segData.activities.length===1?"y":"ies"}{segData.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0)>0?` · $${segData.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}`:""}</span>}
          {segData.food?.dailyBudget&&<span style={{fontSize:isMobile?13:14,fontWeight:500,color:"rgba(255,248,235,0.82)",fontFamily:"'Space Mono',ui-monospace,monospace",whiteSpace:"nowrap",lineHeight:1.55}}>🍜 ${segData.food.dailyBudget}/day</span>}
        </div>
      )}
      {askOpen&&(
        <div style={{background:"rgba(0,4,14,0.95)",borderTop:"1px solid rgba(201,160,76,0.12)",padding:"10px 14px",animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{fontSize:isMobile?11:15,color:"rgba(201,160,76,0.6)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1.5}}>✦ CO-ARCHITECT · {segment.name.toUpperCase()}</span>
            <button onClick={()=>setAskOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:isMobile?13:15,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          {(status==='changed'||status==='cancelled')&&<div style={{marginBottom:8,padding:"6px 9px",borderRadius:7,background:status==='changed'?"rgba(255,107,107,0.08)":"rgba(136,136,136,0.08)",border:`1px solid ${sc.color}33`}}><span style={{fontSize:10,color:sc.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>Looks like something changed with this {status==='cancelled'?'booking':'segment'}. Want help finding alternatives or adjusting your timeline?</span></div>}
          {askChat.length===0&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?12:15,fontStyle:"italic",color:"rgba(201,160,76,0.45)",marginBottom:8,lineHeight:1.6}}>"Ask me anything — best dive ops, where to stay, local tips..."</div>}
          {askChat.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8,maxHeight:160,overflowY:"auto"}}>
            {askChat.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:6,flexDirection:m.role==="user"?"row-reverse":"row",alignItems:"flex-start"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:m.role==="ai"?"#A9461D":"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?11:15,flexShrink:0}}>{m.role==="ai"?"✦":"·"}</div>
                <div style={{borderRadius:8,padding:"6px 9px",fontSize:isMobile?11:15,color:"#FFF",lineHeight:1.6,maxWidth:"88%",background:m.role==="ai"?"rgba(169,70,29,0.18)":"rgba(255,255,255,0.06)",border:`1px solid ${m.role==="ai"?"rgba(169,70,29,0.35)":"rgba(255,255,255,0.08)"}`}}>{m.text}</div>
              </div>
            ))}
            {askLoading&&<div style={{fontSize:isMobile?11:15,color:"rgba(169,70,29,0.6)",fontStyle:"italic",paddingLeft:22}}>✦ thinking...</div>}
            <div ref={askEnd}/>
          </div>}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7}}>
            {["Best dive ops?","Where to stay?","What to skip?","Budget tips?","Local food?"].map(p=><button type="button" key={p} onClick={()=>setAskInput(p)} style={{padding:isMobile?"2px 7px":"3px 9px",borderRadius:12,border:"1px solid rgba(201,160,76,0.2)",background:"rgba(201,160,76,0.05)",color:"rgba(201,160,76,0.65)",fontSize:isMobile?10:15,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,whiteSpace:"nowrap"}}>{p}</button>)}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input value={askInput} onChange={e=>setAskInput(e.target.value)} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendAsk();}}} placeholder={`Ask about ${segment.name}...`} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:7,color:"#FFF",fontSize:isMobile?12:15,padding:isMobile?"6px 8px":"8px 10px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",minHeight:isMobile?30:34,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
            <button type="button" onClick={sendAsk} style={{background:"rgba(201,160,76,0.12)",border:"1px solid rgba(201,160,76,0.3)",borderRadius:7,color:"#c9a04c",fontSize:isMobile?13:15,padding:isMobile?"5px 9px":"6px 11px",cursor:"pointer",minWidth:isMobile?30:34,minHeight:isMobile?30:34,fontWeight:700}}>↑</button>
          </div>
        </div>
      )}
      {open&&<SegmentDetails phaseId={phaseId} segment={segment} intelSnippet={intelSnippet} status={status} onStatusChange={saveStatus} suggestion={suggestion} suggestionsLoading={suggestionsLoading} prevCity={prevCity} homeCity={homeCity}/>}
      {isCancelled&&!open&&(
        <div style={{padding:"6px 16px 8px 20px",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:11,color:"rgba(136,136,136,0.7)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flex:1,letterSpacing:1}}>✕ CANCELLED</span>
          <button onClick={e=>{e.stopPropagation();saveStatus('planning');}} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"1px solid rgba(201,160,76,0.35)",background:"rgba(201,160,76,0.08)",color:"#C9A04C",cursor:"pointer",fontFamily:"Instrument Sans, sans-serif",fontWeight:700,letterSpacing:1,minHeight:28}}>+ REBOOK</button>
        </div>
      )}
    </div>
  );
}


export default SegmentRow;
