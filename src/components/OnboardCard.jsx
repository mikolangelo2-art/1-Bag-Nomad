import { useState, useEffect } from "react";
import { useMobile } from '../hooks/useMobile';
import { loadOnboard, saveOnboard } from '../utils/storageHelpers';

function OnboardCard({storageKey,ctaLabel,onDismiss,children}) {
  const isMobile=useMobile();
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVisible(true),200);return()=>clearTimeout(t);},[]);
  const dismiss=()=>{const o=loadOnboard();o[storageKey]=true;saveOnboard(o);onDismiss?.();};
  if(!visible)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,4,14,0.88)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:isMobile?"12px":"24px",overflowY:"auto",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
      <div style={{width:"100%",maxWidth:480,background:"linear-gradient(160deg,rgba(0,12,28,0.98),rgba(0,6,18,0.98))",border:"1px solid rgba(0,229,255,0.18)",borderRadius:18,padding:isMobile?"20px 16px":"32px 28px",animation:"fadeUp 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both",boxShadow:"0 0 60px rgba(0,229,255,0.07),0 24px 48px rgba(0,0,0,0.6)",marginTop:isMobile?"auto":0,marginBottom:isMobile?"auto":0,alignSelf:"center"}}>
        {children}
        <div style={{marginTop:isMobile?16:24,display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={dismiss} style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid rgba(255,159,67,0.5)",background:"linear-gradient(135deg,rgba(196,87,30,0.2),rgba(255,159,67,0.1))",color:"#FF9F43",fontSize:isMobile?12:13,fontWeight:700,letterSpacing:2.5,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:48,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onMouseOver={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(196,87,30,0.35),rgba(255,159,67,0.2))";e.currentTarget.style.boxShadow="0 0 20px rgba(255,159,67,0.2)";}} onMouseOut={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(196,87,30,0.2),rgba(255,159,67,0.1))";e.currentTarget.style.boxShadow="none";}}>{ctaLabel}</button>
          <button onClick={dismiss} style={{background:"none",border:"none",color:"rgba(255,255,255,0.70)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,padding:"8px 16px",minHeight:44,textAlign:"center",transition:"color 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onMouseOver={e=>{e.currentTarget.style.color="rgba(255,255,255,0.9)";e.currentTarget.style.textDecoration="underline";}} onMouseOut={e=>{e.currentTarget.style.color="rgba(255,255,255,0.70)";e.currentTarget.style.textDecoration="none";}}>I know my way around →</button>
        </div>
      </div>
    </div>
  );
}

export default OnboardCard;
