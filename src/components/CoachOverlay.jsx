import { useState, useEffect, useCallback } from "react";
import { useMobile } from '../hooks/useMobile';
import { loadCoach, saveCoach } from '../utils/storageHelpers';

function CoachOverlay({steps,storageKey,accentColor="#00E5FF",onDismiss}) {
  const isMobile=useMobile();
  const [step,setStep]=useState(0);
  const [rect,setRect]=useState(null);
  const [fading,setFading]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{const c=loadCoach();if(!c[storageKey]){c[storageKey]=true;saveCoach(c);}const t=setTimeout(()=>setReady(true),600);return()=>clearTimeout(t);},[storageKey]);
  const measure=useCallback(()=>{
    const el=document.querySelector(`[data-coach="${steps[step]?.target}"]`);
    if(!el)return;
    el.scrollIntoView({behavior:"smooth",block:"center"});
    setTimeout(()=>setRect(el.getBoundingClientRect()),350);
  },[step,steps]);
  useEffect(()=>{if(ready)measure();},[ready,measure]);
  useEffect(()=>{const h=()=>measure();window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[measure]);
  const finish=()=>{const c=loadCoach();c[storageKey]=true;saveCoach(c);onDismiss?.();};
  const goNext=()=>{
    if(step>=steps.length-1){finish();return;}
    setFading(true);
    setTimeout(()=>{setStep(s=>s+1);setFading(false);},200);
  };
  if(!ready||!rect)return null;
  const pad=10,r=rect;
  const cut={top:Math.max(0,r.top-pad),left:Math.max(0,r.left-pad),width:r.width+pad*2,height:r.height+pad*2};
  const below=window.innerHeight-cut.top-cut.height>160;
  const tipStyle={
    position:"fixed",zIndex:10001,
    left:isMobile?12:Math.max(12,Math.min(cut.left,window.innerWidth-320)),
    top:below?cut.top+cut.height+12:undefined,
    bottom:below?undefined:window.innerHeight-cut.top+12,
    width:isMobile?"calc(100vw - 24px)":"min(320px,80vw)",
    background:"rgba(0,8,20,0.96)",backdropFilter:"blur(12px)",
    border:`1px solid ${accentColor}33`,borderRadius:12,
    padding:"16px 18px",
    animation:fading?"none":"coachFadeIn 0.3s ease both",
    opacity:fading?0:1,transition:"opacity 0.35s cubic-bezier(0.25,0.46,0.45,0.94)"
  };
  const s=steps[step];
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999}} onClick={goNext}>
      {/* Four overlay panels */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:cut.top,background:"rgba(0,4,14,0.82)"}}/>
      <div style={{position:"fixed",top:cut.top+cut.height,left:0,right:0,bottom:0,background:"rgba(0,4,14,0.82)"}}/>
      <div style={{position:"fixed",top:cut.top,left:0,width:cut.left,height:cut.height,background:"rgba(0,4,14,0.82)"}}/>
      <div style={{position:"fixed",top:cut.top,left:cut.left+cut.width,right:0,height:cut.height,background:"rgba(0,4,14,0.82)"}}/>
      {/* Spotlight glow ring */}
      <div style={{position:"fixed",top:cut.top,left:cut.left,width:cut.width,height:cut.height,borderRadius:12,animation:"coachPulse 2.5s ease-in-out infinite",pointerEvents:"none",zIndex:10000}}/>
      {/* Tooltip */}
      <div style={tipStyle} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:16,fontWeight:700,fontStyle:"italic",color:"#FFD93D"}}>{s.title}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{step+1}/{steps.length}</div>
        </div>
        <div style={{fontSize:isMobile?11:12,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",lineHeight:1.7,marginBottom:14}}>{s.body}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={e=>{e.stopPropagation();finish();}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.70)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:"8px 16px",minHeight:44}} onMouseOver={e=>e.currentTarget.style.textDecoration="underline"} onMouseOut={e=>e.currentTarget.style.textDecoration="none"}>Skip tour</button>
          <button onClick={e=>{e.stopPropagation();goNext();}} style={{background:`${accentColor}14`,border:`1px solid ${accentColor}55`,borderRadius:8,color:accentColor,fontSize:12,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,padding:"8px 18px",letterSpacing:1,minHeight:44}}>{step>=steps.length-1?"Got it":"Next"}</button>
        </div>
      </div>
    </div>
  );
}

export default CoachOverlay;
