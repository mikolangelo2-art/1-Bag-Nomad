import { useState } from "react";
import { useMobile } from '../hooks/useMobile';
import { fmt, fD } from '../utils/dateHelpers';
import { loadSeg } from '../utils/storageHelpers';
import { findSuggestionForSegment, flatPhaseIndexForSegment, prevSegmentNameForSeg, STATUS_CFG } from '../utils/tripConsoleHelpers';
import SegmentRow from './SegmentRow';
import BottomSheet from './BottomSheet';

function PhaseCard({phase,intelData,idx,autoOpen=false,onTap=null,allSuggestions,suggestionsLoading,allPhases=[],segPhases=[],homeCity=""}) {
  const isMobile=useMobile();

  // ── Return Trip variant — title row mirrors destination cards (centered name) ──
  if(phase?.type==="Return"){
    const retTitle=isMobile
      ?{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:500,color:"#E8DCC8",lineHeight:1.1,textAlign:"center"}
      :{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:15,fontWeight:600,color:"#E8DCC8",textAlign:"center"};
    return(
    <div style={{borderRadius:13,border:"1px solid rgba(148,163,184,0.20)",borderTop:"1px solid rgba(148,163,184,0.35)",background:"rgba(0,8,20,0.35)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",overflow:"hidden",animation:`fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) ${idx*.06}s both`,opacity:0.80}}>
      <div style={{padding:isMobile?"16px 16px":"14px 16px",borderLeft:"3px solid rgba(148,163,184,0.40)"}}>
        <div style={{display:"flex",alignItems:"center",gap:isMobile?8:8,marginBottom:6,width:"100%"}}>
          {isMobile?<div style={{width:30,flexShrink:0}} aria-hidden />:<div style={{width:22,height:22,flexShrink:0}} aria-hidden />}
          <span style={{fontSize:isMobile?20:14,lineHeight:1,flexShrink:0}}>{phase.flag||"🏠"}</span>
          <div style={{flex:1,minWidth:0,textAlign:"center"}}>
            <div style={retTitle}>RETURN FLIGHT</div>
          </div>
          <div style={{minWidth:isMobile?56:72,textAlign:"right",flexShrink:0}}>
            {(phase.budget||phase.cost)>0?<span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:isMobile?15:15,fontWeight:600,color:"rgba(255,217,61,0.85)",whiteSpace:"nowrap"}}>~{fmt(phase.budget||phase.cost)}</span>:<span style={{width:1}} />}
          </div>
        </div>
        <div style={{fontSize:isMobile?13:14,fontWeight:500,color:"rgba(232,220,200,0.72)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",textAlign:"center",lineHeight:1.45,paddingLeft:isMobile?8:0,paddingRight:isMobile?8:0}}>Home to {phase.name||phase.destination}</div>
        {phase.why&&<div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:13,fontStyle:"italic",color:"rgba(148,163,184,0.62)",lineHeight:1.5,marginTop:6,textAlign:"center"}}>{phase.why}</div>}
      </div>
    </div>
    );
  }
  const [open,setOpen]=useState(autoOpen);
  const [sheetOpen,setSheetOpen]=useState(false);
  const [anyAskOpen,setAnyAskOpen]=useState(false);
  const today=new Date();
  const arr=new Date(phase.arrival+"T12:00:00"),dep=new Date(phase.departure+"T12:00:00");
  const dUntil=Math.round((arr-today)/86400000);
  const isNow=dUntil<=0&&Math.round((dep-today)/86400000)>0;
  const isPast=Math.round((dep-today)/86400000)<=0;
  const allD=loadSeg();
  let total=0,filled=0;
  phase.segments.forEach(seg=>{
    const d=allD[`${phase.id}-${seg.id}`]||{},intel=intelData?.[seg.name];
    const b=[!!(d.transport?.mode||d.transport?.cost),!!(d.stay?.name||d.stay?.cost),(d.activities?.length||0)>0,!!(d.food?.dailyBudget),(d.misc?.length||0)>0,!!(intel?.tagline||d.intel?.notes)];
    total+=6;filled+=b.filter(Boolean).length;
  });
  const pct=total>0?Math.round((filled/total)*100):0;
  const firstSeg=allD[`${phase.id}-${phase.segments[0]?.id}`]||{};
  const phaseStatus=firstSeg.status||'planning';
  const statusDot=STATUS_CFG[phaseStatus]?.color||STATUS_CFG.planning.color;

  // ── Mobile: slim itinerary row + BottomSheet (or page nav) ──────
  if(isMobile) return(
    <>
      <div className="tap-scale" onClick={()=>onTap?onTap(phase):setSheetOpen(true)}
        onMouseOver={e=>{e.currentTarget.style.background='rgba(10,7,5,0.62)';e.currentTarget.style.border='1.5px solid rgba(0,229,255,0.40)';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.5),inset 0 1px 0 rgba(0,229,255,0.35),inset 1px 0 0 rgba(0,229,255,0.15),inset -1px 0 0 rgba(0,229,255,0.15),inset 0 -1px 0 rgba(0,229,255,0.08)';}}
        onMouseOut={e=>{e.currentTarget.style.background='rgba(10,7,5,0.50)';e.currentTarget.style.border='1.5px solid rgba(0,229,255,0.22)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(0,229,255,0.30),inset 1px 0 0 rgba(0,229,255,0.12),inset -1px 0 0 rgba(0,229,255,0.12),inset 0 -1px 0 rgba(0,229,255,0.06)';}}
        style={{display:'flex',flexDirection:'column',padding:'18px 16px',background:'rgba(10,7,5,0.50)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'1.5px solid rgba(0,229,255,0.22)',borderRadius:12,marginBottom:10,boxShadow:'0 2px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(0,229,255,0.22),inset 1px 0 0 rgba(0,229,255,0.08),inset -1px 0 0 rgba(0,229,255,0.08),inset 0 -1px 0 rgba(0,229,255,0.04)',animation:`fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) ${idx*0.07}s both`}}>
        {/* Row 1: badge + flag + name + budget */}
        <div style={{display:'flex',alignItems:'center',gap:8,width:'100%',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            <div style={{width:24,height:24,borderRadius:'50%',background:`${phase.color}16`,border:`1.5px solid ${phase.color}45`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:phase.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0}}>{phase.id}</div>
            <span style={{fontSize:20,lineHeight:1}}>{phase.flag}</span>
          </div>
          <div style={{flex:1,fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:500,color:'#E8DCC8',lineHeight:1.1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{phase.name}</div>
          <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:15,fontWeight:700,color:'#FFD93D',whiteSpace:'nowrap',flexShrink:0}}>{fmt(phase.totalBudget)}</div>
        </div>
        {/* Row 2: date + nights/dives */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:5,paddingLeft:38,overflow:'hidden',width:'100%'}}>
          <span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,fontWeight:500,color:'rgba(255,255,255,0.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>{fD(phase.arrival)} – {fD(phase.departure)} · {phase.totalNights}N{phase.totalDives>0?` · 🤿${phase.totalDives}`:''}</span>
        </div>
      </div>
      {!onTap&&<BottomSheet open={sheetOpen} onClose={()=>setSheetOpen(false)} zIndex={500} hideClose={anyAskOpen}>
        {/* Sheet header */}
        <div style={{padding:'16px 16px 14px',borderBottom:'1px solid rgba(255,255,255,0.12)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:`${phase.color}16`,border:`1.5px solid ${phase.color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:phase.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0}}>{phase.id}</div>
            <span style={{fontSize:28,lineHeight:1}}>{phase.flag}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:300,color:'#E8DCC8',lineHeight:1.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{phase.name}</div>
              <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,color:'rgba(255,255,255,0.42)',marginTop:3}}>{fD(phase.arrival)} – {fD(phase.departure)}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:14,alignItems:'center',paddingLeft:42}}>
            <span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,fontWeight:700,color:phase.color}}>🌙{phase.totalNights}n</span>
            {phase.totalDives>0&&<span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,fontWeight:700,color:'#00E5FF'}}>🤿{phase.totalDives}</span>}
            <span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:15,fontWeight:700,color:'#FFD93D',marginLeft:'auto'}}>{fmt(phase.totalBudget)}</span>
          </div>
          {phase.note&&<div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:400,fontStyle:'italic',color:'rgba(255,245,220,0.92)',lineHeight:1.72,paddingLeft:42,marginTop:10,borderLeft:'2px solid rgba(255,217,61,0.22)',marginLeft:40,letterSpacing:'0.02em',textShadow:'0 1px 14px rgba(0,0,0,0.45)'}}>{phase.note}</div>}
          {pct>0&&<div style={{marginTop:10,paddingLeft:42,display:'flex',alignItems:'center',gap:8}}>
            <div style={{height:2,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden',width:80}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${phase.color}55,${phase.color})`,borderRadius:2,transition:'width 0.60s cubic-bezier(0.25,0.46,0.45,0.94)'}}/></div>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{pct}% PLANNED</span>
          </div>}
        </div>
        {/* Segments */}
        <div style={{paddingTop:4,paddingBottom:20}}>
          <div style={{padding:'10px 16px 6px',fontSize:11,color:'rgba(255,255,255,0.3)',letterSpacing:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>{phase.segments.length} SEGMENT{phase.segments.length!==1?'S':''} · TAP TO PLAN</div>
          {phase.segments.map((seg,i)=>(
            <SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} onAskOpenChange={setAnyAskOpen} suggestion={findSuggestionForSegment(allSuggestions, seg.name, flatPhaseIndexForSegment(seg, allPhases))} suggestionsLoading={suggestionsLoading} prevCity={prevSegmentNameForSeg(seg, segPhases)} homeCity={homeCity}/>
          ))}
        </div>
      </BottomSheet>}
    </>
  );

  // ── Desktop: phase card (always slides to detail page when onTap provided) ──
  return(
    <div style={{borderRadius:13,border:"1px solid rgba(0,229,255,0.08)",borderTop:"1px solid rgba(0,229,255,0.20)",background:"rgba(0,15,35,0.55)",backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',overflow:"hidden",transition:"all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",animation:`fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) ${idx*.06}s both`}}>
      <div onClick={()=>onTap?onTap(phase):setOpen(o=>!o)} style={{padding:"14px 16px",cursor:"pointer",minHeight:62,borderLeft:`3px solid ${phase.color}50`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:`${phase.color}14`,border:`1.5px solid ${phase.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:phase.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0}}>{phase.id}</div>
          <span style={{fontSize:14,flexShrink:0}}>{phase.flag}</span>
          <span style={{flex:1,fontSize:15,fontWeight:600,color:"#E8DCC8",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",transition:"color 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>{phase.name}</span>
          {isNow&&<span style={{fontSize:9,color:"#69F0AE",background:"rgba(105,240,174,0.1)",border:"1px solid rgba(105,240,174,0.28)",borderRadius:20,padding:"2px 8px",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>ACTIVE</span>}
          <span style={{fontSize:15,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",flexShrink:0}}>{fmt(phase.totalBudget)}</span>
          <span style={{fontSize:14,color:"rgba(255,255,255,0.30)",flexShrink:0}}>›</span>
        </div>
        {phase.note&&<div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:400,fontStyle:"italic",color:"rgba(255,245,220,0.93)",lineHeight:1.68,paddingLeft:28,paddingRight:8,marginBottom:10,marginTop:4,letterSpacing:"0.02em",textShadow:"0 1px 16px rgba(0,0,0,0.5),0 0 24px rgba(255,217,61,0.06)"}}>{phase.note}</div>}
        <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:28,flexWrap:"nowrap"}}>
          <span style={{fontSize:15,color:"rgba(255,255,255,0.62)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500,whiteSpace:"nowrap"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>
          <span style={{fontSize:15,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights} Nights</span>
          {phase.totalDives>0&&<span style={{fontSize:15,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}
          {pct>0&&<div style={{width:80,height:2,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${phase.color}55,${phase.color}99)`,borderRadius:2,transition:"width 0.60s cubic-bezier(0.25,0.46,0.45,0.94)"}}/></div>}
          <span style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",marginLeft:"auto",flexShrink:0}}>{isPast?"done":isNow?"active":`${dUntil}d`}</span>
        </div>
      </div>
      {!onTap&&open&&(
        <div style={{animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)",background:"rgba(0,3,11,0.55)"}}>
          <div style={{padding:"6px 16px 6px 20px",borderTop:`1px solid ${phase.color}15`,borderBottom:"1px solid rgba(0,229,255,0.18)",display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:phase.color,flexShrink:0}}/>
            <span style={{fontSize:11,color:`${phase.color}cc`,letterSpacing:1.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,whiteSpace:"nowrap"}}>{phase.segments.length} SEGMENT{phase.segments.length>1?"S":""} · TAP TO EXPAND PLANNING TABS</span>
          </div>
          {phase.segments.map((seg,i)=><SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} suggestion={findSuggestionForSegment(allSuggestions, seg.name, flatPhaseIndexForSegment(seg, allPhases))} suggestionsLoading={suggestionsLoading} prevCity={prevSegmentNameForSeg(seg, segPhases)} homeCity={homeCity}/>)}
        </div>
      )}
    </div>
  );
}


export default PhaseCard;
