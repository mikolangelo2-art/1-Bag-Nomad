import { useState, useEffect, useRef } from "react";
import { useMobile } from '../hooks/useMobile';
import { askAI } from '../utils/aiHelpers';
import { BG_PAGE } from '../constants/colors';
import SharegoodLogo from './SharegoodLogo';
import HelpTip from './HelpTip';

function AmbientChat({screen:scr,tripData,currentPhase,currentSegment,currentTab}) {
  const isMobile=useMobile();
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [keyboardLikely,setKeyboardLikely]=useState(false);
  const [anyInputFocused,setAnyInputFocused]=useState(false);
  const endRef=useRef();
  useEffect(()=>{const h=(e)=>{if(e.detail?.message){setOpen(true);setInput(e.detail.message);}};window.addEventListener('openCA',h);return()=>window.removeEventListener('openCA',h);},[]);
  useEffect(()=>{if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  useEffect(()=>{
    if(!isMobile||typeof window==="undefined"){setKeyboardLikely(false);return;}
    const vv=window.visualViewport;
    if(!vv){setKeyboardLikely(false);return;}
    const update=()=>{
      const inner=window.innerHeight;
      if(inner<320)return;
      setKeyboardLikely(vv.height/inner<0.74);
    };
    update();
    vv.addEventListener("resize",update);
    vv.addEventListener("scroll",update);
    return()=>{vv.removeEventListener("resize",update);vv.removeEventListener("scroll",update);};
  },[isMobile]);

  useEffect(()=>{
    if(!isMobile||open){
      setAnyInputFocused(false);
      return;
    }
    const onIn=(e)=>{
      const t=e.target;
      if(!t||typeof t.matches!=="function")return;
      if(t.closest&&t.closest("[data-ca-drawer]"))return;
      if(t.matches("input, textarea, [contenteditable=true]"))setAnyInputFocused(true);
    };
    const onOut=()=>{
      requestAnimationFrame(()=>{
        const a=document.activeElement;
        if(!a||typeof a.matches!=="function"||!a.matches("input, textarea, [contenteditable=true]"))setAnyInputFocused(false);
      });
    };
    document.addEventListener("focusin",onIn);
    document.addEventListener("focusout",onOut);
    return()=>{document.removeEventListener("focusin",onIn);document.removeEventListener("focusout",onOut);};
  },[isMobile,open]);
  const phases=tripData?.phases||[];
  const ctx=scr==="trip-console"?`You are the Co-Architect for "${tripData?.tripName||"this expedition"}". Full expedition: ${phases.length} phases, ${tripData?.totalNights||0} nights total. Departure: ${tripData?.startDate||tripData?.departureDate||"TBD"}. Phases: ${phases.map(p=>`${p.name} (${p.arrival||""} to ${p.departure||""}, ${p.nights}n, $${p.budget||p.cost||0})`).join("; ")}. Help refine, expand, or think through their expedition. Be concise and warm.`
    :scr==="phase-detail"?`You are the Co-Architect. User is planning: Phase: ${currentPhase?.name||"unknown"}. Country: ${currentPhase?.country||""}. Dates: ${currentPhase?.arrival||""} to ${currentPhase?.departure||""}. Nights: ${currentPhase?.totalNights||currentPhase?.nights||0}. Budget: $${currentPhase?.budget||currentPhase?.totalBudget||0}. Help plan transport, stays, activities, and local tips for this specific phase. Be concise.`
    :scr==="segment-workspace"?`You are the Co-Architect. User is planning: Segment: ${currentSegment?.name||"unknown"}. Dates: ${currentSegment?.arrival||""} to ${currentSegment?.departure||""}. Nights: ${currentSegment?.nights||0}. Current tab: ${currentTab||"overview"}. Help fill in details for this specific segment. Be concise.`
    :scr==="pack-console"?`You are the Co-Architect and packing strategist. User is packing for ${tripData?.tripName||"their expedition"} — ${tripData?.totalNights||0} nights across ${[...new Set(phases.map(p=>p.country))].length} countries. Help them pack light and smart. Be concise.`
    :`You are the Co-Architect travel assistant for 1 Bag Nomad. Help the user with their expedition planning. Be concise and warm.`;
  const openLine=scr==="trip-console"?"Your expedition is taking shape — I can see it coming together. What do you want to dial in next?"
    :scr==="phase-detail"?`${currentPhase?.name||"This phase"} is next. What do you want to figure out first — how to get there, where to stay, or what to do?`
    :scr==="segment-workspace"?`${currentSegment?.name||"This segment"} — let's make this one count. What are you working on?`
    :scr==="pack-console"?"One bag. Let's make sure everything in it earns its place. What do you need to think through?"
    :"Your Co-Architect is here. What's pulling at you?";
  const subtitle=scr==="phase-detail"?currentPhase?.name?.toUpperCase():scr==="segment-workspace"?currentSegment?.name?.toUpperCase():scr==="pack-console"?"PACK CONSOLE":tripData?.tripName?.toUpperCase()||"";
  const send=async()=>{if(!input.trim()||loading)return;const userMsg=input;setInput("");const newMsgs=[...msgs,{role:"user",text:userMsg}];setMsgs(newMsgs);setLoading(true);try{const history=newMsgs.map(m=>`${m.role==="user"?"User":"Co-Architect"}: ${m.text}`).join("\n");const response=await askAI(`${ctx}\n\nConversation:\n${history}\n\nCo-Architect:`,800);setMsgs([...newMsgs,{role:"ai",text:response}]);}catch(e){setMsgs([...newMsgs,{role:"ai",text:"I'm having trouble connecting. Try again in a moment."}]);}setLoading(false);};
  const parseMarkdown=(text)=>{if(!text)return null;const parts=text.split(/(\*\*[^*]+\*\*)/g);return parts.map((part,i)=>{if(part.startsWith('**')&&part.endsWith('**'))return <strong key={i} style={{fontWeight:600,color:'#c9a04c'}}>{part.slice(2,-2)}</strong>;return <span key={i}>{part}</span>;});};
  if(scr==="dream")return null;
  const isPackMobile=isMobile&&scr==="pack-console";
  const fabBottom=isPackMobile
    ?"calc(88px + env(safe-area-inset-bottom, 0px))"
    :isMobile
      ?"calc(62px + env(safe-area-inset-bottom, 0px))"
      :24;
  const hideFabMobile=isMobile&&(keyboardLikely||anyInputFocused);
  const showFab=!open&&!hideFabMobile;
  return(<>
    {showFab&&<div style={{position:"fixed",bottom:fabBottom,right:isMobile?12:"calc((100vw / 1.15 - 1382px) / 4)",display:"flex",flexDirection:"column",alignItems:"center",gap:4,zIndex:1000}}>
      <button type="button" className="ca-architect-fab ca-architect-fab--breathe" onClick={()=>setOpen(true)} style={{width:isMobile?48:128,height:isMobile?48:128,borderRadius:"50%",background:"linear-gradient(145deg,rgba(166,123,91,0.55),rgba(18,18,18,0.92))",border:"1px solid rgba(201,160,76,0.42)",boxShadow:"0 0 24px rgba(201,160,76,0.28), 0 0 56px rgba(201,160,76,0.12), 0 12px 32px rgba(0,0,0,0.45)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,opacity:0.92}}>
        <span className="ca-architect-fab-inner--breathe" style={{ lineHeight: 0 }}>
          <SharegoodLogo size={isMobile?56:112} animationState={loading?"thinking":"idle"} opacity={1} glowColor="rgba(201,160,76,0.55)"/>
        </span>
      </button>
      {!isMobile&&<span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,159,67,0.7)",textTransform:"uppercase",whiteSpace:"nowrap"}}>CO-ARCHITECT</span>}
    </div>}
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000}}/>
      <div data-ca-drawer style={{position:"fixed",bottom:0,left:0,right:0,height:"65vh",background:BG_PAGE,borderTop:"1px solid rgba(201,160,76,0.3)",borderRadius:"20px 20px 0 0",zIndex:1001,display:"flex",flexDirection:"column",animation:"drawerSlideUp 400ms cubic-bezier(0.25,0.46,0.45,0.94)",boxShadow:"0 -14px 52px rgba(0,0,0,0.48), 0 0 64px rgba(201,160,76,0.1)"}}>
        <div style={{padding:"16px 20px 12px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
          <div><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,159,67,0.85)",letterSpacing:3}}>✦ CO-ARCHITECT</span><HelpTip compact noLeadingMargin text="This is where the real magic happens — dial in your destinations, refine your budget, adjust your timing, swap stays. Your Co-Architect knows your whole trip and is ready to shape it around you" /></div>{subtitle&&<div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,marginTop:3}}>{subtitle}</div>}</div>
          <button onClick={()=>setOpen(false)} style={{color:"rgba(255,255,255,0.4)",background:"none",border:"none",fontSize:20,cursor:"pointer",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12,minHeight:0,background:"rgba(255,255,255,0.06)"}}>
          {msgs.length===0&&<div style={{position:"relative",flex:1,display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}>
            <img src="/1bn-logo.png" style={{position:"absolute",width:"60%",maxWidth:200,opacity:0.06,pointerEvents:"none"}} alt=""/>
            <div style={{position:"relative",zIndex:1,textAlign:"center",padding:"0 20px",maxWidth:420,margin:"0 auto",fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontWeight:400,color:"rgba(232,220,200,0.95)",fontSize:isMobile?18:20,lineHeight:1.65,textShadow:"0 1px 2px rgba(0,0,0,0.35)"}}>{openLine}</div>
          </div>}
          {msgs.map((m,i)=><div key={i} style={{display:"flex",gap:8,flexDirection:m.role==="user"?"row-reverse":"row",animation:"msgIn 0.25s ease"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:m.role==="ai"?"#A9461D":"#1a2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{m.role==="ai"?"✦":"·"}</div>
            <div style={{borderRadius:12,padding:m.role==="ai"?"14px 16px":"10px 14px",fontSize:m.role==="ai"?15:13,fontFamily:m.role==="ai"?"'Playfair Display',serif":"'Inter',system-ui,-apple-system,sans-serif",fontStyle:"normal",color:"#FFF",lineHeight:m.role==="ai"?1.6:1.7,maxWidth:"85%",background:m.role==="ai"?"rgba(255,159,67,0.06)":"rgba(255,255,255,0.06)",border:m.role==="ai"?"1px solid rgba(255,159,67,0.25)":"1px solid rgba(255,255,255,0.08)"}}>{m.role==="ai"?parseMarkdown(m.text):m.text}</div>
          </div>)}
          {loading&&<div style={{display:"flex",gap:6,animation:"msgIn 0.25s ease"}}><div style={{width:22,height:22,borderRadius:"50%",background:"#A9461D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div><div style={{fontSize:13,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",padding:"4px 0"}}>thinking...</div></div>}
          <div ref={endRef}/>
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",gap:8,flexShrink:0,paddingBottom:`calc(12px + env(safe-area-inset-bottom))`}}>
          <input className="ca-chat-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send();}} placeholder="How can I help you?" style={{flex:1,backgroundColor:"#0C1520",border:"1px solid rgba(255,255,255,0.14)",borderRadius:10,padding:"10px 14px",color:"white",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:16,outline:"none",boxSizing:"border-box",transition:"border-color 0.3s ease,box-shadow 0.3s ease",WebkitAppearance:"none",appearance:"none",colorScheme:"dark"}} onFocus={e=>{e.target.style.borderColor="rgba(255,255,255,0.32)";e.target.style.boxShadow="0 0 0 2px rgba(255,255,255,0.06)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.14)";e.target.style.boxShadow="none";}}/>
          <button onClick={send} disabled={loading} style={{background:"rgba(255,159,67,0.2)",border:"1px solid rgba(255,159,67,0.4)",borderRadius:10,padding:"10px 16px",color:"rgba(255,159,67,0.9)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,fontWeight:700,letterSpacing:1,cursor:loading?"wait":"pointer",minWidth:44,minHeight:44}}>↑</button>
        </div>
      </div>
    </>}
  </>);
}


export default AmbientChat;
