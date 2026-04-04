import { useState, useEffect } from "react";
import posthog from "posthog-js";
import { useMobile } from '../hooks/useMobile';
import { askAI, parseJSON } from '../utils/aiHelpers';
import { TI } from '../utils/storageHelpers';
import { TRIP_CATEGORY_COLORS } from '../constants/colors';
import { fmt } from '../utils/dateHelpers';
import DreamHeader from './DreamHeader';

const TC = TRIP_CATEGORY_COLORS;

function VisionReveal({data,onBuild,onBack,freshMount}) {
  const isMobile=useMobile();
  const [narrative,setNarrative]=useState("");
  const [narrativeDone,setNarrativeDone]=useState(false);
  const [showStats,setShowStats]=useState(false);
  const [showPhases,setShowPhases]=useState(false);
  const [refineInput,setRefineInput]=useState("");
  const [vd,setVd]=useState(data.visionData);
  const [loading,setLoading]=useState(false);
  const [launching,setLaunching]=useState(false);
  const [mounted,setMounted]=useState(!freshMount);
  const [bdOpen,setBdOpen]=useState(true);
  useEffect(()=>{window.scrollTo(0,0);posthog.capture("vision_reveal_viewed",{phases_count:vd.phases?.length,total_budget:vd.totalBudget,countries_count:vd.countries});posthog.capture("$pageview",{$current_url:"/vision-reveal"});if(freshMount){const t=setTimeout(()=>setMounted(true),50);return()=>clearTimeout(t);}},[]);
  useEffect(()=>{
    let i=0;const txt=vd.narrative||"";
    const t=setTimeout(()=>{
      const iv=setInterval(()=>{i++;setNarrative(txt.slice(0,i));if(i>=txt.length){clearInterval(iv);setNarrativeDone(true);setTimeout(()=>setShowStats(true),800);setTimeout(()=>setShowPhases(true),1200);}},13);
    },400);
    return()=>clearTimeout(t);
  },[]);
  async function refine(){
    if(!refineInput.trim()||loading)return;
    setLoading(true);const msg=refineInput;setRefineInput("");
    try{
      const raw=await askAI(`Expedition co-architect. Phases:${JSON.stringify(vd.phases)}. Vision:"${data.vision}". Request:"${msg}". Return ONLY valid JSON:{"narrative":"2-3 warm sentences","vibe":"3 words · ","phases":[{"destination":"","country":"","nights":7,"type":"","why":"","flag":"🌍"}],"totalNights":0,"totalBudget":0,"countries":0,"highlight":""}`,1800);
      const parsed=parseJSON(raw);
      if(parsed){
        setVd(parsed);setNarrativeDone(false);setShowStats(false);setShowPhases(false);setNarrative("");
        let i=0;const txt=parsed.narrative||"";
        const iv=setInterval(()=>{i++;setNarrative(txt.slice(0,i));if(i>=txt.length){clearInterval(iv);setNarrativeDone(true);setTimeout(()=>setShowStats(true),800);setTimeout(()=>setShowPhases(true),1200);}},13);
      } else setRefineInput("⚠ Couldn't apply — try rephrasing");
    }catch(e){setRefineInput("⚠ Connection issue");}
    setLoading(false);
  }
  return (
    <div className="dream-root" style={{opacity:mounted?1:0,transform:mounted?"scale(1)":"scale(0.97)",transition:"opacity 0.7s ease-in-out, transform 0.7s ease-in-out"}}>
      <div className="dream-glow"/>
      <DreamHeader step={2} screenLabel="VISION REVEAL"/>
      <div className="dream-content" style={{maxWidth:1100,position:"relative",zIndex:10}}>
        <div className="narrative-card">
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"90%",height:"130%",background:"radial-gradient(ellipse,rgba(169,70,29,0.22) 0%,transparent 68%)",pointerEvents:"none"}}/>
          <div style={{fontSize:15,color:"#C4571E",letterSpacing:3,marginBottom:12,position:"relative"}}>✦ YOUR EXPEDITION VISION</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:400,fontStyle:"italic",color:"rgba(255,245,220,0.96)",lineHeight:1.8,position:"relative",minHeight:80,letterSpacing:"0.01em",textShadow:"0 1px 12px rgba(0,0,0,0.4)"}}>"{narrative}{!narrativeDone&&<span className="hero-cursor">|</span>}"</div>
          {narrativeDone&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:14,position:"relative"}}>{(vd.vibe||"").split(" · ").filter(Boolean).map((w,i)=><span key={i} className="vibe-tag">{w}</span>)}</div>}
        </div>
        {showStats&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:isMobile?6:8,marginBottom:16,animation:"fadeUp 0.5s ease"}}>
            {[{label:"COUNTRIES",value:vd.countries,color:"#FFD93D"},{label:"PHASES",value:vd.phases?.length,color:"#FFD93D"},{label:"NIGHTS",value:vd.totalNights,color:"#FFD93D"},{label:"BUDGET",value:fmt(vd.totalBudget||0),color:"#FFD93D"}].map(s=>(
              <div key={s.label} className="stat-card" style={{overflow:"hidden"}}><div style={{fontSize:isMobile?9:11,color:"rgba(255,255,255,0.45)",letterSpacing:isMobile?1:1.5,marginBottom:4,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>{s.label}</div><div style={{fontSize:isMobile?16:22,fontWeight:700,color:s.color,whiteSpace:"nowrap"}}>{s.value}</div></div>
            ))}
          </div>
        )}
        {narrativeDone&&vd.highlight&&<div style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.18)",borderRadius:11,padding:"10px 12px",marginBottom:18}}><div style={{fontSize:12,color:"#00E5FF",letterSpacing:2.5,marginBottom:7,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>⚡ EXPEDITION HIGHLIGHT</div><div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:300,fontStyle:"italic",color:"#FFF",lineHeight:1.7,opacity:0.90}}>{vd.highlight}</div></div>}
        {showPhases&&(
          <div style={{animation:"fadeUp 0.5s ease"}}>
            <div style={{fontSize:15,color:"rgba(255,159,67,0.8)",letterSpacing:4,marginBottom:12,paddingBottom:7,borderBottom:"1px solid rgba(169,70,29,0.2)"}}>YOUR EXPEDITION PHASES</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {vd.phases?.map((p,i)=>{
                const c=TC[p.type]||"#FFD93D";
                return(<div key={i} className="phase-row" style={{borderLeftColor:c,background:`linear-gradient(90deg,${c}08,#0C1520)`,animation:`phaseIn 0.4s ease ${i*.07}s both`}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:`${c}18`,border:`1px solid ${c}44`,color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0,marginTop:1}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
                      <span style={{fontSize:14,fontWeight:600,color:"#FFF"}}>{p.flag||"🌍"} {p.destination}</span>
                      <span style={{fontSize:11,color:c}}>{TI[p.type]||"✈️"} {p.type}</span>
                      <span style={{fontSize:13,color:"rgba(255,255,255,0.82)",marginLeft:"auto"}}>🌙 {p.nights}n</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.80)",marginBottom:3,letterSpacing:0.5}}>{p.country}</div>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.88)",lineHeight:1.5}}>{p.why}</div>
                  </div>
                </div>);
              })}
            </div>
            {vd.budgetBreakdown&&data.budgetMode!=="dream"&&(()=>{
              const bd=vd.budgetBreakdown;
              const cats=[{key:"flights",icon:"✈️",label:"Flights",note:bd.flightsNote},{key:"accommodation",icon:"🏨",label:"Accommodation",note:bd.accommodationNote},{key:"food",icon:"🍜",label:"Food",note:bd.foodNote},{key:"transport",icon:"🚌",label:"Transport",note:null},{key:"activities",icon:"🎯",label:"Activities",note:null},{key:"buffer",icon:"🎒",label:"Buffer",note:null}].filter(c=>bd[c.key]>0);
              const total=cats.reduce((s,c)=>s+(bd[c.key]||0),0);
              return(
                <div style={{marginBottom:16,animation:"fadeUp 0.5s ease"}}>
                  <button onClick={()=>setBdOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:"linear-gradient(135deg,rgba(169,70,29,0.08),rgba(0,8,20,0.6))",border:"1px solid rgba(169,70,29,0.3)",borderRadius:bdOpen?"11px 11px 0 0":11,cursor:"pointer",transition:"border-radius 0.2s"}}>
                    <span style={{fontSize:isMobile?11:12,color:"rgba(255,159,67,0.85)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>✦ How I built your budget</span>
                    <span style={{fontSize:14,color:"rgba(255,159,67,0.6)",transition:"transform 0.3s",transform:bdOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
                  </button>
                  <div style={{maxHeight:bdOpen?600:0,overflow:"hidden",transition:"max-height 0.3s ease"}}>
                    <div style={{background:"rgba(0,8,20,0.6)",border:"1px solid rgba(169,70,29,0.3)",borderTop:"none",borderRadius:"0 0 11px 11px",padding:"12px 14px"}}>
                      {cats.map(c=>{const val=bd[c.key]||0;return(
                        <div key={c.key} style={{display:"flex",alignItems:"center",padding:"7px 0",gap:8}}>
                          <span style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}>{c.icon}</span>
                          <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.75)",fontWeight:600,width:isMobile?90:110,flexShrink:0}}>{c.label}</span>
                          <span style={{flex:1,fontSize:isMobile?11:13,fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"rgba(255,255,255,0.45)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.note||""}</span>
                          <span style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FFD93D",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>~{fmt(val)}</span>
                        </div>
                      );})}
                      <div style={{height:1,background:"rgba(255,255,255,0.12)",margin:"8px 0"}}/>
                      <div style={{display:"flex",alignItems:"center",padding:"4px 0",gap:8}}>
                        <span style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}> </span>
                        <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.9)",fontWeight:700,width:isMobile?90:110,flexShrink:0}}>TOTAL</span>
                        <span style={{flex:1}}/>
                        <span style={{fontSize:isMobile?14:16,fontWeight:900,color:"#FFD93D",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>~{fmt(total)}</span>
                      </div>
                      {bd.routingNote&&(
                        <div style={{marginTop:10,borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:10}}>
                          <div style={{fontSize:11,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:3}}>✦ WHY THIS ROUTE</div>
                          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?12:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>{bd.routingNote}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div style={{background:"#0C1520",border:"1px solid #1a2535",borderRadius:13,padding:14,marginBottom:18,overflow:"hidden",maxWidth:"100%",boxSizing:"border-box",marginLeft:0,marginRight:0}}>
              <div style={{fontSize:15,color:"rgba(255,255,255,0.9)",letterSpacing:2,marginBottom:10}}>💬 REFINE YOUR VISION</div>
              {loading&&<div style={{fontSize:15,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",marginBottom:8}}>✨ refining...</div>}
              <div style={{display:"flex",gap:7}}>
                <input style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:8,color:"#FFF",fontSize:isMobile?13:15,padding:isMobile?"11px":"9px 11px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} value={refineInput} onChange={e=>setRefineInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")refine();}} placeholder="Swap a destination, adjust duration..." onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
                <button style={{background:"rgba(169,70,29,0.2)",border:"1px solid rgba(169,70,29,0.4)",borderRadius:8,color:"#FFD93D",fontSize:15,padding:"8px 12px",cursor:"pointer",minWidth:44,minHeight:44}} onClick={refine}>↑</button>
              </div>
            </div>
            <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.1),rgba(255,217,61,0.04))",border:"1px solid rgba(169,70,29,0.4)",borderRadius:16,padding:22,textAlign:"center"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:20,fontWeight:300,color:"#FFF",marginBottom:6,lineHeight:1.3}}>This is your <em style={{color:"#FFD93D"}}>expedition.</em></div>
              <div style={{fontSize:15,color:"rgba(255,255,255,0.88)",letterSpacing:1,marginBottom:20,lineHeight:1.8}}>Does this feel right? Refine above until it does.<br/>When your gut says yes — it's time to build.</div>
              <button className="cta-build-btn" style={{minHeight:52,opacity:launching?0.7:1}} onClick={()=>{if(!launching){setLaunching(true);onBuild(vd);}}}>
                {launching?"✨  Building...":"✅  YES — BUILD THIS EXPEDITION"}
              </button>
              <button style={{marginTop:10,background:"none",border:"1px solid #1a2535",borderRadius:8,color:"rgba(255,255,255,0.3)",fontSize:15,padding:"7px 14px",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",width:"100%",minHeight:44}} onClick={onBack}>{data.isRevision?"← BACK TO CONSOLE":"← START OVER"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VisionReveal;
