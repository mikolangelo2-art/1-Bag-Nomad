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
  // Planning completion status
  const hasTransport=segData&&Object.values(segData.transport||{}).some(v=>v&&String(v).length>0);
  const hasStay=segData?.stay?.name?.length>0;
  const hasActivities=(segData?.activities?.length||0)>0;
  const completedCount=[hasTransport,hasStay,hasActivities].filter(Boolean).length;
  const planStatus=status==="booked"||status==="confirmed"?null:completedCount===0?{label:"NOT STARTED",color:"rgba(255,255,255,0.85)",bg:"rgba(255,255,255,0.12)",border:"rgba(255,255,255,0.20)"}:completedCount===1?{label:"IN PROGRESS",color:"#FF9F43",bg:"rgba(255,159,67,0.10)",border:"rgba(255,159,67,0.30)"}:completedCount===2?{label:"MOSTLY DONE",color:"#c9a04c",bg:"rgba(201,160,76,0.10)",border:"rgba(201,160,76,0.30)"}:{label:"PLANNED",color:"#69F0AE",bg:"rgba(105,240,174,0.10)",border:"rgba(105,240,174,0.30)"};
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
    <div style={{border:'1px rgba(255,255,255,0.10)',borderTop:'1px solid rgba(255,255,255,0.18)',borderRadius:14,background:'rgba(0,8,20,0.85)',padding:'2px 0',marginBottom:8,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.3)',opacity:isCancelled?0.65:1,transition:"opacity 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
      {/* Change Flow Modal */}
      {showChangeModal&&(
        <div onClick={()=>setShowChangeModal(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,4,14,0.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:400,background:"rgba(0,8,20,0.98)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:14,padding:"24px 20px",animation:"fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontStyle:"italic",color:"#FF9F43",marginBottom:6}}>What happened?</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:20,lineHeight:1.7}}>{segment.name} is currently booked. What changed?</div>
            <div style={{display:"flex",gap:10,flexDirection:isMobile?"column":"row"}}>
              <button onClick={()=>{saveStatus('changed');setShowChangeModal(false);setOpen(true);}} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(0,229,255,0.4)",background:"rgba(0,229,255,0.08)",color:"#00E5FF",fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:44}}>UPDATE BOOKING</button>
              <button onClick={()=>{saveStatus('cancelled');setShowChangeModal(false);}} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(255,107,107,0.4)",background:"rgba(255,107,107,0.08)",color:"#FF6B6B",fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:44}}>MARK CANCELLED</button>
            </div>
            <button onClick={()=>setShowChangeModal(false)} style={{marginTop:12,width:"100%",background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:36}}>← Keep as BOOKED</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",alignItems:"stretch",minHeight:50,borderLeft:`3px solid ${tc}${open?"cc":"66"}`,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
        <div onClick={()=>{if(onSegmentTap){onSegmentTap(segment);}else{setOpen(o=>!o);}}} style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"10px 6px 10px 12px":"12px 10px 12px 20px",cursor:"pointer",background:open?`${tc}04`:"transparent",transition:"background 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flex:1,minWidth:0}}>
          {/* Row 1: dot + name + type badge + budget */}
          <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:tc,flexShrink:0,boxShadow:open?`0 0 7px ${tc}`:"none"}}/>
            <span style={{fontSize:isMobile?15:16,fontWeight:600,color:isCancelled?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.95)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:isCancelled?"line-through":"none"}}>{segment.name}</span>
            <span style={{fontSize:11,color:`${tc}bb`,background:`${tc}0e`,border:`1px solid ${tc}1e`,borderRadius:6,padding:"1px 6px",letterSpacing:0.5,fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>{segment.type?.toUpperCase()}</span>
            <span style={{fontSize:isMobile?12:14,fontWeight:600,color:"rgba(201,160,76,0.85)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",flexShrink:0,textDecoration:isCancelled?"line-through":"none"}}>{fmt(segment.budget)}</span>
          </div>
          {/* Row 2: date + nights + dives */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,paddingLeft:13,minWidth:0,flexWrap:"wrap"}}>
            <span style={{color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:14,whiteSpace:"nowrap"}}>{fD(segment.arrival)}→{fD(segment.departure)}</span>
            <span style={{color:"rgba(255,255,255,0.60)",fontSize:14,whiteSpace:"nowrap"}}>· {segment.nights}n</span>
            {segment.diveCount>0&&<span style={{color:"rgba(0,229,255,0.7)",fontSize:14,whiteSpace:"nowrap"}}>· 🤿{segment.diveCount}</span>}
            <div style={{flex:1,minWidth:0}}/>
            <ProgDots phaseId={phaseId} segment={segment} intelSnippet={intelSnippet}/>
            <button onClick={handleBadgeTap} style={{background:planStatus?planStatus.bg:`${sc.color}18`,border:planStatus?`1px solid ${planStatus.border}`:`1px solid ${sc.color}55`,borderRadius:12,padding:"3px 8px",fontSize:11,fontWeight:700,letterSpacing:0.5,color:(planStatus||sc).color,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:2,lineHeight:1.4,minHeight:22,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flexShrink:0,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",animation:status==='planning'&&completedCount===0?'planningPulse 2.2s ease-in-out infinite':'none'}}>
              <span style={{fontSize:11}}>{planStatus?completedCount>=3?"✓":sc.icon:sc.icon}</span>{planStatus?planStatus.label:sc.label}
            </button>
          </div>
{segment.note&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,0.65)",lineHeight:1.5,marginTop:3,paddingLeft:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"90%"}}>{segment.note}</div>}
          {insight&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(245,158,11,0.55)",lineHeight:1.5,marginTop:4,paddingLeft:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"90%"}}>{insight}</div>}
        </div>
        {onSegmentTap?<div onClick={e=>{e.stopPropagation();onSegmentTap(segment);}} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"0 10px",cursor:"pointer",flexShrink:0}}>
          <span style={{fontSize:18,color:"rgba(255,255,255,0.30)",fontWeight:300}}>›</span>
        </div>:<>
        <div onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"0 8px",cursor:"pointer",flexShrink:0}}>
          <div style={{width:16,height:16,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.15":"0.08"})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:11,color:open?"#00E5FF":"rgba(255,255,255,0.4)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>▼</span>
          </div>
        </div>
        <button onClick={e=>{e.stopPropagation();setAskOpen(o=>!o);}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:"8px 10px",background:askOpen?"rgba(201,160,76,0.1)":"rgba(201,160,76,0.03)",border:"none",borderLeft:`1px solid rgba(201,160,76,${askOpen?"0.45":"0.22"})`,cursor:"pointer",flexShrink:0,height:"100%",minWidth:38,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} title="Ask co-architect">
          <span style={{fontSize:11,color:askOpen?"#c9a04c":"rgba(201,160,76,0.55)",lineHeight:1,textShadow:askOpen?"0 0 8px rgba(201,160,76,0.6)":"none",animation:askOpen?"none":"glowPulse 2.5s ease-in-out infinite"}}>✦</span>
          <span style={{fontSize:10,color:askOpen?"#c9a04c":"rgba(201,160,76,0.4)",letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,whiteSpace:"nowrap"}}>ASK</span>
        </button></>}
      </div>
      {!open&&segData&&(hasTransport||hasStay||hasActivities||segData.food?.dailyBudget)&&(
        <div onClick={()=>setOpen(true)} style={{padding:"4px 14px 6px 20px",display:"flex",flexWrap:"wrap",gap:"4px 8px",cursor:"pointer",background:"rgba(0,4,14,0.4)"}}>
          {hasTransport&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",lineHeight:1.5}}>✈️ {segData.transport.mode||"Transport"}{segData.transport.from&&segData.transport.to?` · ${segData.transport.from} → ${segData.transport.to}`:""}{segData.transport.cost?` · $${segData.transport.cost}`:""}</span>}
          {hasStay&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",lineHeight:1.5}}>🏨 {segData.stay.name}{segData.stay.cost?` · $${segData.stay.cost}`:""}</span>}
          {hasActivities&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",lineHeight:1.5}}>⚡ {segData.activities.length} activit{segData.activities.length===1?"y":"ies"}{segData.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0)>0?` · $${segData.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}`:""}</span>}
          {segData.food?.dailyBudget&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",lineHeight:1.5}}>🍜 ${segData.food.dailyBudget}/day</span>}
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
          <button onClick={e=>{e.stopPropagation();saveStatus('planning');}} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"1px solid rgba(0,229,255,0.3)",background:"rgba(0,229,255,0.06)",color:"#00E5FF",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,minHeight:28}}>+ REBOOK</button>
        </div>
      )}
    </div>
  );
}


export default SegmentRow;
