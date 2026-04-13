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
  useEffect(()=>{const destCount=(data.visionData?.phases||[]).filter(p=>p.type!=="Return").length;window.scrollTo(0,0);posthog.capture("vision_reveal_viewed",{phases_count:destCount,total_budget:data.visionData?.totalBudget,countries_count:data.visionData?.countries});posthog.capture("$pageview",{$current_url:"/vision-reveal"});if(freshMount){const t=setTimeout(()=>setMounted(true),50);return()=>clearTimeout(t);}},[]);
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
    const highlightRefinedGuide="one specific moment drawn from this refined vision — name the place, the time of day, the experience. Not 'an unforgettable moment' — the actual moment. Example: 'Sunrise from the roof of Riad Kniza before the call to prayer, Marrakech still dark below.'";
    const narrativeRulesRefine=`NARRATIVE RULES — non-negotiable:
- Sentence 1: The emotional truth of what this trip is about. What the traveler will feel and why it matters to them personally. Mirror their own language back if possible.
- Sentence 2: Name the specific. A real place, a real moment, a real sensation — not "beautiful scenery" or "local culture." The medina at dawn. The seaplane at first light. The ryokan where Basho once slept.
- Sentence 3: The transformation. Who is this traveler when they return? What will they know or feel that they don't now?
- NEVER use: "unforgettable," "breathtaking," "world-class," "hidden gems," "local culture," "unique experience"
- ALWAYS name: a specific place, a specific time of day, or a specific physical sensation`;
    // Preserve return phase — re-attach after refine regardless of what AI returns
    const savedReturn=vd.phases?.find(p=>p.type==="Return")||null;
    const hasBudget=data.budgetMode!=="dream"&&data.budgetAmount&&Number(data.budgetAmount)>0;
    const bAmt=Number(data.budgetAmount)||0;
    const destPhases=(vd.phases||[]).filter(p=>p.type!=="Return");
    const phaseCount=destPhases.length;
    const totalNights=vd.totalNights||destPhases.reduce((s,p)=>s+(p.nights||0),0)||0;
    try{
      const raw=await askAI(`You are reshaping an expedition vision — NOT rebuilding the itinerary.

LOCKED CONSTRAINTS — DO NOT CHANGE:
- Exactly ${phaseCount} destination phases (same count — the return phase is handled separately, do not include it)
- Exactly ${totalNights} total nights (redistribute across destination phases if needed, but sum must equal ${totalNights})
${hasBudget?`- Exactly $${data.budgetAmount} total budget (redistribute across phases if needed, but sum must equal $${data.budgetAmount})`:'- No budget set'}
- Do NOT add or remove phases — only reshape existing ones

WHAT YOU CAN CHANGE:
- Swap destinations to better match the refined vision
- Change phase types (Culture, Dive, Trek, etc.)
- Redistribute nights between phases (keeping the same total)
${hasBudget?'- Redistribute budget between phases (keeping the same total)':''}
- Rewrite the narrative, vibe, highlight, and phase "why" descriptions
- Update country and flag to match new destinations

Current vision: "${data.vision}"
Current destination phases (exclude the return trip from reshaping): ${JSON.stringify(destPhases)}
${data.city?`Departure city: ${data.city}`:''}
${data.travelerProfile?`Traveler: ${data.travelerProfile.group==='couple'?'Couple/2 friends':'Solo'}, style: ${data.travelerProfile.style||'independent'}${data.travelerProfile.interests?.length?', interests: '+data.travelerProfile.interests.join(', '):''}`:''}

User's refinement: "${msg}"

Reshape the vision to honor this request. Keep the same structure — change the flavor.

${narrativeRulesRefine}

Return ONLY valid JSON:
{"narrative":"Exactly 3 sentences following NARRATIVE RULES above.","vibe":"3 words · separated","phases":[{"destination":"City","country":"Country","nights":NUMBER,"type":"Type","why":"one sentence","flag":"🌍","budget":NUMBER}],"totalNights":${totalNights},"totalBudget":${hasBudget?data.budgetAmount:'0'},"countries":NUMBER,"highlight":"${highlightRefinedGuide}"}`,1800,0.4);
      const parsed=parseJSON(raw);
      // Hard enforcement: lock budget and duration even if AI drifts
      if(parsed&&parsed.phases?.length){
        // Duration lock
        const nightSum=parsed.phases.reduce((s,p)=>s+(p.nights||0),0);
        if(nightSum!==totalNights&&totalNights>0){
          console.log(`[1BN] Vision refine duration lock: ${nightSum} -> ${totalNights}`);
          const nRatio=totalNights/nightSum;
          let remaining=totalNights;
          parsed.phases.forEach((p,i)=>{
            if(i===parsed.phases.length-1){p.nights=remaining;}
            else{p.nights=Math.max(1,Math.round((p.nights||1)*nRatio));remaining-=p.nights;}
          });
          parsed.totalNights=totalNights;
        }
        // Budget lock
        if(hasBudget&&bAmt>0){
          const phaseSum=parsed.phases.reduce((s,p)=>s+(p.budget||p.cost||0),0)||1;
          const ratio=bAmt/phaseSum;
          console.log(`[1BN] Vision refine budget lock: AI $${phaseSum} x ${ratio.toFixed(2)} -> $${bAmt}`);
          parsed.phases.forEach(p=>{p.budget=Math.round((p.budget||p.cost||0)*ratio/10)*10;});
          parsed.totalBudget=bAmt;
        }
        // Phase count lock — only on destination phases
        const parsedDest=parsed.phases.filter(p=>p.type!=="Return");
        if(parsedDest.length>phaseCount){
          console.log(`[1BN] Vision refine phase count lock: ${parsedDest.length} -> ${phaseCount} (truncating)`);
          parsed.phases=parsedDest.slice(0,phaseCount);
        } else {
          parsed.phases=parsedDest;
        }
        // Always re-attach return phase — unchanged
        if(savedReturn)parsed.phases.push(savedReturn);
      }
      if(parsed){
        setVd(parsed);setNarrativeDone(false);setShowStats(false);setShowPhases(false);setNarrative("");
        let i=0;const txt=parsed.narrative||"";
        const iv=setInterval(()=>{i++;setNarrative(txt.slice(0,i));if(i>=txt.length){clearInterval(iv);setNarrativeDone(true);setTimeout(()=>setShowStats(true),800);setTimeout(()=>setShowPhases(true),1200);}},13);
      } else setRefineInput("⚠ Couldn't apply — try rephrasing");
    }catch(e){setRefineInput("⚠ Connection issue");}
    setLoading(false);
  }
  return (
    <div className="dream-root dream-bleed" style={{opacity:mounted?1:0,transform:mounted?"scale(1)":"scale(0.97)",transition:"opacity 0.7s ease-in-out, transform 0.7s ease-in-out"}}>
      <div className="dream-glow"/>
      <DreamHeader step={2} screenLabel="VISION REVEAL"/>
      <div className="dream-content" style={{maxWidth:1100,position:"relative",zIndex:10}}>
        <div className="narrative-card">
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"90%",height:"130%",background:"radial-gradient(ellipse,rgba(169,70,29,0.22) 0%,transparent 68%)",pointerEvents:"none"}}/>
          <div style={{fontSize:15,color:"#C4571E",letterSpacing:3,marginBottom:12,position:"relative"}}>✦ YOUR EXPEDITION VISION</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?17:18,fontWeight:400,fontStyle:"italic",color:"rgba(255,255,255,0.92)",lineHeight:1.75,position:"relative",minHeight:80,letterSpacing:"0.01em",textShadow:"0 1px 12px rgba(0,0,0,0.4)",maxWidth:isMobile?"min(88vw,100%)":"none",margin:isMobile?"0 auto":undefined,boxSizing:"border-box",width:isMobile?"100%":undefined}}>"{narrative}{!narrativeDone&&<span className="hero-cursor">|</span>}"</div>
          {narrativeDone&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:14,position:"relative"}}>{(vd.vibe||"").split(" · ").filter(Boolean).map((w,i)=><span key={i} className="vibe-tag">{w}</span>)}</div>}
        </div>
        {showStats&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:isMobile?10:14,marginBottom:22,animation:"fadeUp 0.5s ease"}}>
            {[{label:"COUNTRIES",value:vd.countries,color:"#c9a04c"},{label:"PHASES",value:(vd.phases||[]).filter(p=>p.type!=="Return").length,color:"#c9a04c"},{label:"NIGHTS",value:vd.totalNights,color:"#c9a04c"},{label:"BUDGET",value:fmt(vd.totalBudget||0),color:"#c9a04c"}].map(s=>(
              <div key={s.label} className="stat-card" style={{overflow:"hidden"}}><div style={{fontSize:isMobile?9:11,color:"rgba(255,255,255,0.45)",letterSpacing:isMobile?1:1.5,marginBottom:4,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>{s.label}</div><div style={{fontSize:isMobile?16:22,fontWeight:700,color:s.color,whiteSpace:"nowrap"}}>{s.value}</div></div>
            ))}
          </div>
        )}
        {narrativeDone&&vd.highlight&&<div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.1),rgba(201,160,76,0.04))",border:"1px solid rgba(201,160,76,0.35)",borderRadius:11,padding:"10px 12px",marginBottom:18,boxShadow:"0 0 20px rgba(169,70,29,0.1)"}}><div style={{fontSize:12,color:"rgba(201,160,76,0.95)",letterSpacing:2.5,marginBottom:7,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>⚡ EXPEDITION HIGHLIGHT</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:300,fontStyle:"italic",color:"#FFF",lineHeight:1.7,opacity:0.90}}>{vd.highlight}</div></div>}
        {showPhases&&(
          <div style={{animation:"fadeUp 0.5s ease"}}>
            <div style={{fontSize:15,color:"rgba(255,159,67,0.8)",letterSpacing:4,marginBottom:12,paddingBottom:7,borderBottom:"1px solid rgba(169,70,29,0.2)"}}>YOUR EXPEDITION PHASES</div>
            <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
              {vd.phases?.map((p,i)=>{
                const c=TC[p.type]||"#c9a04c";
                return(<div key={i} className="phase-row" style={{borderLeftColor:c,background:`linear-gradient(90deg,${c}08,#0C1520)`,animation:`phaseIn 0.4s ease ${i*.07}s both`}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:`${c}18`,border:`1px solid ${c}44`,color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0,marginTop:1}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:400,fontStyle:"normal",color:"rgba(255,245,220,0.94)",lineHeight:1.48,marginBottom:8,letterSpacing:"0.01em",textWrap:"balance",overflowWrap:"break-word",wordBreak:"break-word"}}>{p.why}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
                      <span style={{fontSize:isMobile?12:13,fontWeight:600,color:"rgba(255,255,255,0.92)",letterSpacing:0.3}}>{p.flag||"🌍"} {p.destination}</span>
                      <span style={{fontSize:11,color:c}}>{TI[p.type]||"✈️"} {p.type}</span>
                      <span style={{fontSize:isMobile?12:13,color:"rgba(255,255,255,0.82)",marginLeft:"auto"}}>🌙 {p.nights}n</span>
                    </div>
                    <div style={{fontSize:isMobile?12:13,fontWeight:500,color:"rgba(255,255,255,0.72)",marginBottom:0,letterSpacing:0.4}}>{p.country}</div>
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
                          <span style={{flex:1,fontSize:isMobile?11:13,fontFamily:"'Playfair Display',serif",fontStyle:"italic",color:"rgba(255,255,255,0.45)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.note||""}</span>
                          <span style={{fontSize:isMobile?13:15,fontWeight:700,color:"#c9a04c",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>~{fmt(val)}</span>
                        </div>
                      );})}
                      <div style={{height:1,background:"rgba(255,255,255,0.12)",margin:"8px 0"}}/>
                      <div style={{display:"flex",alignItems:"center",padding:"4px 0",gap:8}}>
                        <span style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}> </span>
                        <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.9)",fontWeight:700,width:isMobile?90:110,flexShrink:0}}>TOTAL</span>
                        <span style={{flex:1}}/>
                        <span style={{fontSize:isMobile?14:16,fontWeight:900,color:"#c9a04c",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>~{fmt(total)}</span>
                      </div>
                      {bd.routingNote&&(
                        <div style={{marginTop:10,borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:10}}>
                          <div style={{fontSize:11,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:3}}>✦ WHY THIS ROUTE</div>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?12:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>{bd.routingNote}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div style={{background:"rgba(12,21,32,0.96)",border:"1px solid rgba(201,160,76,0.45)",borderRadius:13,padding:14,marginBottom:18,overflow:"hidden",maxWidth:"100%",boxSizing:"border-box",marginLeft:0,marginRight:0,boxShadow:"0 4px 24px rgba(0,0,0,0.35)"}}>
              <div style={{fontSize:15,color:"rgba(201,160,76,0.9)",letterSpacing:2,marginBottom:10}}>💬 REFINE YOUR VISION</div>
              {loading&&<div style={{fontSize:15,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",marginBottom:8}}>✨ refining...</div>}
              <div style={{display:"flex",gap:7,alignItems:"stretch"}}>
                <div className="ca-chat-input-wrap" style={{flex:1,minWidth:0,display:"flex",alignItems:"stretch",borderRadius:8,overflow:"hidden",backgroundColor:"#0C1520",boxSizing:"border-box"}}>
                  <input className="vision-refine-input" style={{flex:1,width:"100%",minWidth:0,backgroundColor:"#0C1520",color:"#FFF",fontSize:isMobile?14:15,padding:isMobile?"11px":"9px 11px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",colorScheme:"dark"}} value={refineInput} onChange={e=>setRefineInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")refine();}} placeholder="Refine, redirect, dream bigger..."/>
                </div>
                <button style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(201,160,76,0.4)",borderRadius:8,color:"rgba(201,160,76,0.95)",fontSize:15,padding:"8px 12px",cursor:"pointer",minWidth:44,minHeight:44}} onClick={refine}>↑</button>
              </div>
            </div>
            <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.1),rgba(201,160,76,0.04))",border:"1px solid rgba(169,70,29,0.4)",borderRadius:16,padding:22,textAlign:"center"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?13:20,fontWeight:300,color:"#FFF",marginBottom:6,lineHeight:1.3}}>This is your <em style={{color:"#c9a04c"}}>expedition.</em></div>
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
