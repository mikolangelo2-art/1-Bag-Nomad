import { useState, useEffect } from "react";
import { useMobile } from '../hooks/useMobile';
import { BG_PAGE } from '../constants/colors';
import SharegoodLogo from './SharegoodLogo';

function HandoffScreen({tripData,onComplete}) {
  const isMobile=useMobile();
  const [ph,setPh]=useState(0),[lit,setLit]=useState(0);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{const ts=[setTimeout(()=>setPh(1),5000),setTimeout(()=>setPh(2),10000),setTimeout(()=>setPh(3),13500)];return()=>ts.forEach(clearTimeout);},[]);
  useEffect(()=>{if(ph<2)return;const total=tripData.phases?.length||0;let i=0;const iv=setInterval(()=>{i++;setLit(i);if(i>=total)clearInterval(iv);},180);return()=>clearInterval(iv);},[ph]);
  const totalNights=tripData.phases?.reduce((s,p)=>s+p.nights,0)||0;
  const totalBudget=tripData.phases?.reduce((s,p)=>s+(p.cost||p.budget||0),0)||0;
  const countries=[...new Set((tripData.phases||[]).map(p=>p.country))].length;
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",overflow:"hidden",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 20% 0%,${BG_PAGE} 0%,${BG_PAGE} 25%,${BG_PAGE} 55%,${BG_PAGE} 100%)`,zIndex:1}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 0%,#001830 0%,#000d1a 30%,#000810 60%,#030810 100%)",opacity:ph>=1?1:0,transition:"opacity 1.4s ease",zIndex:2}}/>
      <div style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:isMobile?"24px 12px":"40px",paddingBottom:isMobile?"calc(24px + env(safe-area-inset-bottom))":"calc(40px + env(safe-area-inset-bottom))",overflowY:"auto",boxSizing:"border-box"}}>
        <div style={{opacity:ph<1?1:0,transition:"opacity 0.9s ease",position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:24,fontSize:isMobile?64:90,animation:"spinGlobe 20s linear infinite",filter:"drop-shadow(0 0 20px rgba(0,160,220,0.4))"}}>🌍</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?13:22,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.88)",lineHeight:1.6,maxWidth:560,textAlign:"center"}}>"{(tripData.visionNarrative||"").slice(0,120)}..."</div>
          <div style={{marginTop:28,fontFamily:"'Playfair Display',serif",fontSize:15,fontStyle:"italic",color:"rgba(201,160,76,0.45)",letterSpacing:3}}>Now becoming real.</div>
        </div>
        <div style={{opacity:ph>=1&&ph<2?1:0,transition:"opacity 0.8s ease",position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:24,fontSize:isMobile?64:90,animation:"spinGlobe 20s linear infinite",filter:"drop-shadow(0 0 20px rgba(0,229,255,0.4))"}}>🌍</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?13:16,fontWeight:100,fontStyle:"italic",color:"rgba(0,229,255,0.6)",letterSpacing:4,textAlign:"center"}}>Building your expedition...</div>
        </div>
        <div style={{opacity:ph>=2?1:0,transition:"opacity 0.8s ease 0.2s",display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:520}}>
          <div style={{position:"relative",marginBottom:isMobile?28:36}}>
            {[0,1,2].map(i=><div key={i} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:isMobile?90+i*40:110+i*50,height:isMobile?90+i*40:110+i*50,borderRadius:"50%",border:`1px solid rgba(0,229,255,${0.15-i*.04})`,animation:"consolePulse 2.8s ease-in-out infinite"}}/>)}
            <div style={{position:"relative",zIndex:1,animation:"logoPulse 2.4s ease-in-out infinite"}}>
              <SharegoodLogo size={isMobile?72:88} animate={false} glowColor="rgba(0,229,255,0.5)" opacity={1}/>
            </div>
          </div>
          <div style={{textAlign:"center",marginBottom:isMobile?16:20}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?22:"clamp(2rem, 4.5vw, 3.25rem)",fontWeight:900,letterSpacing:4,textShadow:"0 0 40px rgba(201,160,76,0.45)",lineHeight:1.05,WebkitTextFillColor:"transparent",background:"linear-gradient(90deg,#c9a04c 18%,#f8f5f0 42%,#d4a017 58%,#c9a04c 82%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",backgroundClip:"text",animation:"shimmerOnce 2s ease forwards"}}>DREAM BIG</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?15:"clamp(1.15rem, 2.2vw, 1.75rem)",fontWeight:300,fontStyle:"italic",color:"rgba(201,160,76,0.75)",letterSpacing:3,lineHeight:1.25,marginTop:6}}>travel light</div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",maxWidth:isMobile?320:480,marginBottom:isMobile?20:28}}>
            {tripData.phases?.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5,opacity:i<lit?1:0.15,transition:"opacity 0.3s ease"}}>
                <div style={{width:isMobile?8:10,height:isMobile?8:10,borderRadius:"50%",background:p.color||"#00E5FF",boxShadow:i<lit?`0 0 8px ${p.color||"#00E5FF"}`:"none"}}/>
                {i<lit&&<div style={{fontSize:isMobile?13:15,color:p.color||"#00E5FF",whiteSpace:"nowrap",fontWeight:700}}>{p.flag} {p.name}</div>}
              </div>
            ))}
          </div>
          <div style={{opacity:ph>=3?1:0,transform:ph>=3?"translateY(0)":"translateY(16px)",transition:"opacity 0.7s ease,transform 0.7s ease",textAlign:"center",width:"100%"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?16:"clamp(1.35rem, 3vw, 2.25rem)",fontWeight:400,fontStyle:"italic",color:"#c9a04c",marginBottom:8,textShadow:"0 0 36px rgba(201,160,76,0.35)"}}>{tripData.tripName}</div>
            <div style={{width:100,height:1,background:"linear-gradient(90deg,transparent,rgba(201,160,76,0.45),transparent)",margin:"12px auto 20px"}}/>
            <div style={{display:"flex",justifyContent:"center",gap:isMobile?16:28,marginBottom:isMobile?28:36,flexWrap:"wrap"}}>
              {[{value:totalNights,label:"NIGHTS"},{value:"$"+Math.round(totalBudget/1000)+"k",label:"BUDGET"},{value:countries,label:"COUNTRIES"}].map((s,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{fontSize:isMobile?13:28,fontWeight:900,color:"#00E5FF",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{s.value}</div>
                  <div style={{fontSize:15,color:"rgba(0,229,255,0.9)",letterSpacing:2,fontWeight:700}}>{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{onComplete();}} style={{padding:isMobile?"16px 32px":"18px 44px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#030810",fontSize:isMobile?13:15,fontWeight:900,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:2.5,cursor:"pointer",animation:"consolePulse 2.8s ease-in-out infinite",minHeight:54}}>🌍  ENTER TRIP CONSOLE →</button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default HandoffScreen;
