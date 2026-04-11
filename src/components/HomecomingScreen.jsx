import { useState, useEffect } from "react";
import { useMobile } from '../hooks/useMobile';
import SharegoodLogo from './SharegoodLogo';
import { fmt } from '../utils/dateHelpers';
import { toSegPhases } from '../utils/tripHelpers';

function HomecomingScreen({tripData,onPlanNext}) {
  const isMobile=useMobile();
  const [ph,setPh]=useState(0);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{
    const ts=[setTimeout(()=>setPh(1),600),setTimeout(()=>setPh(2),1800),setTimeout(()=>setPh(3),3200)];
    return()=>ts.forEach(clearTimeout);
  },[]);
  const segPhases=tripData.segmentedPhases||toSegPhases(tripData.phases||[]);
  const totalNights=segPhases.reduce((s,p)=>s+p.totalNights,0)||tripData.totalNights||0;
  const countries=segPhases.length;
  const totalDives=segPhases.reduce((s,p)=>s+p.totalDives,0)||tripData.totalDives||0;
  const totalBudget=segPhases.reduce((s,p)=>s+p.totalBudget,0)||tripData.totalBudget||0;
  const name=tripData.tripName||"My Expedition";
  const narrative=tripData.visionNarrative||"";
  const shareText=`✦ EXPEDITION COMPLETE ✦\n\n${name}\n\n${totalNights} nights · ${countries} countries${totalDives>0?` · ${totalDives} dives`:""} · ${fmt(totalBudget)}\n\n"${narrative.slice(0,160)}${narrative.length>160?"...":""}"\n\nDream Big. Travel Light.\n1bagnomad.com`;
  async function handleShare(){
    if(navigator.share){try{await navigator.share({title:name,text:shareText});}catch(e){}}
    else{try{await navigator.clipboard.writeText(shareText);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch(e){}}
  }
  const fade=(delay=0)=>({opacity:ph>=2?1:0,transform:ph>=2?"translateY(0)":"translateY(14px)",transition:`opacity 0.7s ease ${delay}s,transform 0.7s ease ${delay}s`});
  const fade3=(delay=0)=>({opacity:ph>=3?1:0,transform:ph>=3?"translateY(0)":"translateY(10px)",transition:`opacity 0.6s ease ${delay}s,transform 0.6s ease ${delay}s`});
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",overflow:"hidden",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 20%,#281400 0%,#160a00 30%,#090400 60%,#030100 100%)",zIndex:1}}/>
      <div style={{position:"absolute",top:"-10%",left:"50%",transform:"translateX(-50%)",width:700,height:400,background:"radial-gradient(ellipse,rgba(255,159,67,0.22) 0%,rgba(255,217,61,0.06) 45%,transparent 70%)",pointerEvents:"none",zIndex:2}}/>
      <div style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:isMobile?"24px 12px":40,paddingBottom:isMobile?"calc(28px + env(safe-area-inset-bottom))":"calc(40px + env(safe-area-inset-bottom))",overflowY:"auto",boxSizing:"border-box"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:520,gap:isMobile?18:24}}>
          {/* Spinning logo */}
          <div style={{position:"relative",marginBottom:4}}>
            {[0,1,2].map(i=><div key={i} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:(isMobile?88:108)+i*38,height:(isMobile?88:108)+i*38,borderRadius:"50%",border:`1px solid rgba(255,159,67,${0.14-i*.04})`,animation:"consolePulse 3s ease-in-out infinite"}}/>)}
            <div style={{position:"relative",zIndex:1,animation:"spinGlobe 30s linear infinite"}}>
              <SharegoodLogo size={isMobile?68:84} animate={false} glowColor="rgba(255,159,67,0.55)" opacity={1}/>
            </div>
          </div>
          {/* You did it. */}
          <div style={{textAlign:"center",opacity:ph>=1?1:0,transform:ph>=1?"translateY(0)":"translateY(20px)",transition:"opacity 0.7s ease,transform 0.7s ease"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?40:56,fontWeight:900,color:"#c9a04c",textShadow:"0 0 50px rgba(255,217,61,0.45)",lineHeight:1,marginBottom:6}}>You did it.</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?13:16,fontWeight:300,fontStyle:"italic",color:"rgba(255,159,67,0.65)",letterSpacing:1}}>{name}</div>
          </div>
          {/* Stats */}
          <div style={{...fade(0.1),display:"flex",justifyContent:"center",gap:isMobile?18:32,flexWrap:"wrap"}}>
            {[{v:totalNights,l:"NIGHTS"},{v:countries,l:"COUNTRIES"},...(totalDives>0?[{v:totalDives,l:"DIVES"}]:[]),{v:fmt(totalBudget),l:"BUDGET"}].map((s,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontSize:isMobile?22:30,fontWeight:900,color:"#FF9F43",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{s.v}</div>
                <div style={{fontSize:8,color:"rgba(255,159,67,0.65)",letterSpacing:2.5,fontWeight:700}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Vision narrative */}
          {narrative&&<div style={{...fade(0.4),textAlign:"center",fontFamily:"'Playfair Display',serif",fontSize:isMobile?12:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,217,61,0.6)",lineHeight:1.75,borderLeft:"2px solid rgba(255,217,61,0.18)",paddingLeft:14,maxWidth:440}}>"{narrative.slice(0,160)}{narrative.length>160?"...":""}"</div>}
          {/* Dream Big tagline */}
          <div style={{...fade3(0),textAlign:"center"}}>
            <div style={{width:60,height:1,background:"linear-gradient(90deg,transparent,rgba(255,217,61,0.35),transparent)",margin:"0 auto 16px"}}/>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?15:19,fontWeight:700,WebkitTextFillColor:"transparent",background:"linear-gradient(90deg,#c9a04c 25%,#FFF 45%,#FF9F43 55%,#c9a04c 75%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",backgroundClip:"text",animation:"shimmerOnce 2.5s ease forwards",letterSpacing:2}}>Dream Big. Travel Light.</div>
          </div>
          {/* Buttons */}
          <div style={{...fade3(0.15),display:"flex",flexDirection:isMobile?"column":"row",gap:10,width:"100%",maxWidth:400}}>
            <button onClick={handleShare} style={{flex:1,padding:"14px 18px",borderRadius:12,border:"1px solid rgba(255,159,67,0.45)",background:"rgba(255,159,67,0.1)",color:"#FF9F43",fontSize:isMobile?11:13,fontWeight:700,letterSpacing:2,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:48,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,159,67,0.2)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,159,67,0.1)"}>
              {copied?"✓ COPIED!":"✦ SHARE MY EXPEDITION"}
            </button>
            <button onClick={onPlanNext} style={{flex:1,padding:"14px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#C4571E,#FF9F43,#c9a04c)",color:"#060A0F",fontSize:isMobile?11:13,fontWeight:900,letterSpacing:2,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:48,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onMouseOver={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseOut={e=>e.currentTarget.style.transform="none"}>
              PLAN MY NEXT ONE →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default HomecomingScreen;
