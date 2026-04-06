import { useState, useEffect } from "react";
import { useMobile } from '../hooks/useMobile';
import { fmt, fD } from '../utils/dateHelpers';
import { findSuggestionForSegment } from '../utils/tripConsoleHelpers';
import SegmentRow from './SegmentRow';
import SegmentWorkspace from './SegmentWorkspace';
import WorldMapBackground from './WorldMapBackground';

function PhaseDetailPage({phase,intelData,onBack,segmentSuggestions,suggestionsLoading,homeCity="",segPhases=[],warningFlags=[],onDismissWarning,allPhases=[]}) {
  const isMobile=useMobile();
  const [activeSegment,setActiveSegment]=useState(null);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const [hintVisible,setHintVisible]=useState(()=>{try{if(localStorage.getItem("1bn_hide_all_tips")==="1")return false;return!localStorage.getItem('1bn_phase_hint_shown');}catch(e){return false;}});
  useEffect(()=>{
    if(hintVisible){
      const t=setTimeout(()=>{try{localStorage.setItem('1bn_phase_hint_shown','1');}catch(e){}setHintVisible(false);},4000);
      return()=>clearTimeout(t);
    }
  },[hintVisible]);
  return(
    <>
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:200,background:'#120A04',overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      <WorldMapBackground phases={allPhases} activeCountry={phase.country} departureCity={homeCity||""}/>
      <div className="mc-content" style={{width:1126,maxWidth:'100%',margin:'0 auto',borderInline:'1px solid var(--border, #2e303a)',overflow:'visible',flex:'none',minHeight:'100%',boxSizing:'border-box',position:'relative',zIndex:1}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'12px 0',gap:12,background:'rgba(0,8,16,0.95)',borderBottom:'1px solid rgba(0,229,255,0.12)',position:'sticky',top:0,left:0,right:0,width:'100%',zIndex:10}}>
        {isMobile?<button onClick={onBack} style={{background:'none',border:'none',color:'#00E5FF',fontSize:24,cursor:'pointer',padding:'0 8px 0 0',fontWeight:300,lineHeight:1,minWidth:32,minHeight:44,display:'flex',alignItems:'center',gap:6}}>‹ <span style={{fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:2,opacity:0.60}}>EXPEDITION</span></button>
        :<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>
          <span onClick={onBack} style={{color:'#FF9F43',cursor:'pointer'}}>←</span>
          <span onClick={onBack} style={{color:'rgba(255,255,255,0.45)',cursor:'pointer',letterSpacing:1}}>EXPEDITION</span>
          <span style={{color:'rgba(255,255,255,0.25)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.85)',letterSpacing:1}}>{phase.name.toUpperCase()}</span>
        </div>}
        {isMobile&&<span style={{fontSize:20}}>{phase.flag}</span>}
        {isMobile&&<span style={{flex:1,fontSize:18,fontWeight:500,color:'#FFFFFF',fontFamily:"'Fraunces',serif"}}>{phase.name}</span>}
        {!isMobile&&<div style={{flex:1}}/>}
        <span style={{fontSize:14,fontWeight:700,color:'#FFD93D',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fmt(phase.totalBudget)}</span>
      </div>
      {/* First-visit breadcrumb hint */}
      {hintVisible&&<div style={{fontSize:11,letterSpacing:'0.12em',color:'rgba(0,229,255,0.35)',padding:'6px 0 0',textAlign:'center',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>TAP ‹ TO RETURN TO EXPEDITION</div>}
      {/* Stats bar */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'10px 0',flexShrink:0}}>
        <span style={{flex:1,fontSize:13,color:'rgba(255,255,255,0.45)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fD(phase.arrival)} – {fD(phase.departure)}</span>
        <span style={{fontSize:13,color:'rgba(255,255,255,0.45)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>🌙{isMobile?`${phase.totalNights}n`:`${phase.totalNights} Nights`}</span>
        {phase.totalDives>0&&<span style={{fontSize:13,color:'#00E5FF',marginLeft:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>🤿{phase.totalDives}</span>}
      </div>
      {/* Warning flags */}
      {warningFlags.filter(w=>w.phaseIndex===phase.id-1).map((w,wi)=>(
        <div key={wi} style={{border:'1.5px solid rgba(255,200,0,0.40)',borderRadius:12,background:'rgba(255,200,0,0.06)',padding:'14px 16px',margin:'8px 0',animation:'fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both'}}>
          <div style={{fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,200,0,0.70)',letterSpacing:2,marginBottom:6}}>⚠️ {w.type==='date_conflict'?'DATE CONFLICT':'SEASONAL NOTICE'}</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.85)',lineHeight:1.6,marginBottom:4}}>{w.message}</div>
          {w.suggestion&&<div style={{fontSize:12,color:'rgba(255,200,0,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:10}}>{w.suggestion}</div>}
          <div style={{display:'flex',gap:8}}>
            {w.dismissible&&<button onClick={()=>onDismissWarning?.(warningFlags.indexOf(w))} style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,200,0,0.30)',background:'transparent',color:'rgba(255,200,0,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",cursor:'pointer',fontWeight:600,letterSpacing:1}}>DISMISS</button>}
          </div>
        </div>
      ))}
      {/* Segment list */}
      <div style={{padding:'6px 0 80px'}}>
        <div style={{padding:'8px 0 4px',fontSize:12,color:'rgba(255,255,255,0.50)',letterSpacing:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>{phase.segments.length} SEGMENT{phase.segments.length!==1?'S':''} · TAP TO PLAN</div>
        {phase.segments.map((seg,i)=>(
          <SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} onSegmentTap={s=>setActiveSegment(s)}/>
        ))}
      </div>
      </div>
    </div>
    {activeSegment&&(()=>{const allSegs=segPhases.flatMap(p=>p.segments);const segIdx=allSegs.findIndex(s=>s.id===activeSegment.id);const prev=segIdx>0?allSegs[segIdx-1]:null;return <SegmentWorkspace segment={activeSegment} phaseId={phase.id} phaseName={phase.name} phaseFlag={phase.flag} intelSnippet={intelData?.[activeSegment.name]} onBack={()=>setActiveSegment(null)} onBackToExpedition={()=>{setActiveSegment(null);onBack();}} suggestion={findSuggestionForSegment(segmentSuggestions, activeSegment.name)} suggestionsLoading={suggestionsLoading} homeCity={homeCity} prevCity={prev?.name||""} allPhases={allPhases}/>;})()}
    </>
  );
}


export default PhaseDetailPage;
