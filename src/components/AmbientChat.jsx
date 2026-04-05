import { useState, useEffect, useRef } from "react";
import { useMobile } from '../hooks/useMobile';
import { askAI } from '../utils/aiHelpers';
import SharegoodLogo from './SharegoodLogo';

function AmbientChat({screen:scr,tripData,currentPhase,currentSegment,currentTab}) {
  const isMobile=useMobile();
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef();
  useEffect(()=>{const h=(e)=>{if(e.detail?.message){setOpen(true);setInput(e.detail.message);}};window.addEventListener('openCA',h);return()=>window.removeEventListener('openCA',h);},[]);
  useEffect(()=>{if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  const phases=tripData?.phases||[];
  const ctx=scr==="trip-console"?`You are the Co-Architect for "${tripData?.tripName||"this expedition"}". Full expedition: ${phases.length} phases, ${tripData?.totalNights||0} nights total. Departure: ${tripData?.startDate||tripData?.departureDate||"TBD"}. Phases: ${phases.map(p=>`${p.name} (${p.arrival||""} to ${p.departure||""}, ${p.nights}n, $${p.budget||p.cost||0})`).join("; ")}. Help refine, expand, or think through their expedition. Be concise and warm.`
    :scr==="phase-detail"?`You are the Co-Architect. User is planning: Phase: ${currentPhase?.name||"unknown"}. Country: ${currentPhase?.country||""}. Dates: ${currentPhase?.arrival||""} to ${currentPhase?.departure||""}. Nights: ${currentPhase?.totalNights||currentPhase?.nights||0}. Budget: $${currentPhase?.budget||currentPhase?.totalBudget||0}. Help plan transport, stays, activities, and local tips for this specific phase. Be concise.`
    :scr==="segment-workspace"?`You are the Co-Architect. User is planning: Segment: ${currentSegment?.name||"unknown"}. Dates: ${currentSegment?.arrival||""} to ${currentSegment?.departure||""}. Nights: ${currentSegment?.nights||0}. Current tab: ${currentTab||"overview"}. Help fill in details for this specific segment. Be concise.`
    :scr==="pack-console"?`You are the Co-Architect and packing strategist. User is packing for ${tripData?.tripName||"their expedition"} — ${tripData?.totalNights||0} nights across ${[...new Set(phases.map(p=>p.country))].length} countries. Help them pack light and smart. Be concise.`
    :`You are the Co-Architect travel assistant for 1 Bag Nomad. Help the user with their expedition planning. Be concise and warm.`;
  const openLine=scr==="trip-console"?"Your expedition is taking shape. What would you like to refine?"
    :scr==="phase-detail"?`${currentPhase?.name||"This phase"} — what would you like to know?`
    :scr==="segment-workspace"?`Planning ${currentSegment?.name||"this segment"}. How can I help?`
    :scr==="pack-console"?"Let's make sure you're packing light. What do you need?"
    :"Your Co-Architect is here. What's on your mind?";
  const subtitle=scr==="phase-detail"?currentPhase?.name?.toUpperCase():scr==="segment-workspace"?currentSegment?.name?.toUpperCase():scr==="pack-console"?"PACK CONSOLE":tripData?.tripName?.toUpperCase()||"";
  const send=async()=>{if(!input.trim()||loading)return;const userMsg=input;setInput("");const newMsgs=[...msgs,{role:"user",text:userMsg}];setMsgs(newMsgs);setLoading(true);try{const history=newMsgs.map(m=>`${m.role==="user"?"User":"Co-Architect"}: ${m.text}`).join("\n");const response=await askAI(`${ctx}\n\nConversation:\n${history}\n\nCo-Architect:`,800);setMsgs([...newMsgs,{role:"ai",text:response}]);}catch(e){setMsgs([...newMsgs,{role:"ai",text:"I'm having trouble connecting. Try again in a moment."}]);}setLoading(false);};
  const parseMarkdown=(text)=>{if(!text)return null;const parts=text.split(/(\*\*[^*]+\*\*)/g);return parts.map((part,i)=>{if(part.startsWith('**')&&part.endsWith('**'))return <strong key={i} style={{fontWeight:600,color:'#FFD93D'}}>{part.slice(2,-2)}</strong>;return <span key={i}>{part}</span>;});};
  if(scr==="dream")return null;
  return(<>
    {!open&&<div style={{position:"fixed",bottom:isMobile?62:24,right:isMobile?12:"calc((100vw / 1.15 - 1382px) / 4)",display:"flex",flexDirection:"column",alignItems:"center",gap:4,zIndex:1000}}>
      <button onClick={()=>setOpen(true)} style={{width:isMobile?48:128,height:isMobile?48:128,borderRadius:"50%",background:"rgba(169,70,29,0.9)",border:"1px solid rgba(255,217,61,0.4)",boxShadow:"0 0 20px rgba(255,217,61,0.3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",animation:"caFabPulse 3s ease-in-out infinite",padding:0,opacity:0.85}}>
        <SharegoodLogo size={isMobile?56:112} animationState={loading?"thinking":"idle"} opacity={1} glowColor="rgba(255,217,61,0.6)"/>
      </button>
      {!isMobile&&<span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,159,67,0.7)",textTransform:"uppercase",whiteSpace:"nowrap"}}>CO-ARCHITECT</span>}
    </div>}
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000}}/>
      <div style={{position:"fixed",bottom:0,left:0,right:0,height:"65vh",background:"#120A04",borderTop:"1px solid rgba(255,217,61,0.3)",borderRadius:"20px 20px 0 0",zIndex:1001,display:"flex",flexDirection:"column",animation:"drawerSlideUp 400ms cubic-bezier(0.25,0.46,0.45,0.94)"}}>
        <div style={{padding:"16px 20px 12px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
          <div><div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,159,67,0.85)",letterSpacing:3}}>✦ CO-ARCHITECT</div>{subtitle&&<div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,marginTop:3}}>{subtitle}</div>}</div>
          <button onClick={()=>setOpen(false)} style={{color:"rgba(255,255,255,0.4)",background:"none",border:"none",fontSize:20,cursor:"pointer",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12,minHeight:0,background:"rgba(255,255,255,0.06)"}}>
          {msgs.length===0&&<div style={{position:"relative",flex:1,display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}>
            <img src="/1bn-logo.png" style={{position:"absolute",width:"60%",maxWidth:200,opacity:0.06,pointerEvents:"none"}} alt=""/>
            <div style={{position:"relative",zIndex:1,textAlign:"center",padding:"0 24px",fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"rgba(255,255,255,0.4)",fontSize:15,lineHeight:1.6}}>{openLine}</div>
          </div>}
          {msgs.map((m,i)=><div key={i} style={{display:"flex",gap:8,flexDirection:m.role==="user"?"row-reverse":"row",animation:"msgIn 0.25s ease"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:m.role==="ai"?"#A9461D":"#1a2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{m.role==="ai"?"✦":"·"}</div>
            <div style={{borderRadius:12,padding:m.role==="ai"?"14px 16px":"10px 14px",fontSize:m.role==="ai"?15:13,fontFamily:m.role==="ai"?"'Fraunces',serif":"'Inter',system-ui,-apple-system,sans-serif",fontStyle:"normal",color:"#FFF",lineHeight:m.role==="ai"?1.6:1.7,maxWidth:"85%",background:m.role==="ai"?"rgba(255,159,67,0.06)":"rgba(255,255,255,0.06)",border:m.role==="ai"?"1px solid rgba(255,159,67,0.25)":"1px solid rgba(255,255,255,0.08)"}}>{m.role==="ai"?parseMarkdown(m.text):m.text}</div>
          </div>)}
          {loading&&<div style={{display:"flex",gap:6,animation:"msgIn 0.25s ease"}}><div style={{width:22,height:22,borderRadius:"50%",background:"#A9461D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div><div style={{fontSize:13,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",padding:"4px 0"}}>thinking...</div></div>}
          <div ref={endRef}/>
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",gap:8,flexShrink:0,paddingBottom:`calc(12px + env(safe-area-inset-bottom))`}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send();}} placeholder="Ask your Co-Architect..." style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,159,67,0.3)",borderRadius:10,padding:"10px 14px",color:"white",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/>
          <button onClick={send} disabled={loading} style={{background:"rgba(255,159,67,0.2)",border:"1px solid rgba(255,159,67,0.4)",borderRadius:10,padding:"10px 16px",color:"rgba(255,159,67,0.9)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,fontWeight:700,letterSpacing:1,cursor:loading?"wait":"pointer",minWidth:44,minHeight:44}}>↑</button>
        </div>
      </div>
    </>}
  </>);
}


export default AmbientChat;
