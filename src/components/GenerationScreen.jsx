import { useState, useEffect } from "react";
import SharegoodLogo from './SharegoodLogo';

function GenerationScreen({onComplete}) {
  const [ph,setPh]=useState(1),[prog,setProg]=useState(0),[mi,setMi]=useState(0);
  const msgs=["Reading your vision...","Mapping the route...","Calculating phases...","Bringing it to life..."];
  useEffect(()=>{
    const ts=[setTimeout(()=>setPh(1),0),setTimeout(()=>setMi(1),1800),setTimeout(()=>setMi(2),3600),setTimeout(()=>setMi(3),5400),setTimeout(()=>{setProg(100);onComplete?.();},7000)];
    return()=>ts.forEach(clearTimeout);
  },[]);
  useEffect(()=>{
    const iv=setInterval(()=>setProg(p=>Math.min(p+Math.random()*3+0.5,94)),100);
    setTimeout(()=>clearInterval(iv),6800); return()=>clearInterval(iv);
  },[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"radial-gradient(ellipse at 40% 30%,#120A04 0%,#120A04 30%,#120A04 65%,#120A04 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"5%",left:"50%",width:700,height:500,background:"radial-gradient(ellipse,rgba(169,70,29,0.5) 0%,transparent 65%)",animation:"ambientGlow 3s ease-in-out infinite",transform:"translateX(-50%)",pointerEvents:"none"}}/>
      <div style={{animation:"logoPulse 2.4s ease-in-out infinite",marginBottom:36,zIndex:1}}><SharegoodLogo size={180} animate={false} glowColor="rgba(169,70,29,0.52)" opacity={0.9}/></div>
      <div key={mi} style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:100,fontStyle:"italic",color:"rgba(255,255,255,0.92)",letterSpacing:1,marginBottom:10,animation:"fadeUp 0.5s ease",textAlign:"center",zIndex:1,opacity:1}}>{msgs[mi]}</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.5)",letterSpacing:3,marginBottom:40,textAlign:"center",zIndex:1}}>The co-architect is working its magic ✦</div>
      <div style={{width:260,zIndex:1}}>
        <div style={{height:3,background:"rgba(255,255,255,0.07)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:2,background:"linear-gradient(90deg,#A9461D,#FFD93D,#A9461D)",backgroundSize:"200% 100%",width:prog+"%",transition:"width 0.3s ease",animation:"shimmerBar 2s linear infinite"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:15,color:"rgba(255,255,255,0.2)",letterSpacing:2}}><span>BUILDING</span><span>{Math.round(prog)}%</span></div>
      </div>
    </div>
  );
}

export default GenerationScreen;
