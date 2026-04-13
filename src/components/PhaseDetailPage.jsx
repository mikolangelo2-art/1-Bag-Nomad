import { useState, useEffect } from "react";
import { useMobile } from '../hooks/useMobile';
import { fmt, fD } from '../utils/dateHelpers';
import { findSuggestionForSegment, flatPhaseIndexForSegment, prevSegmentNameForSeg } from '../utils/tripConsoleHelpers';
import { computePhasePlannedSpend } from '../utils/tripHelpers';
import { loadSeg } from '../utils/storageHelpers';
import { BG_PAGE } from '../constants/colors';
import SegmentRow from './SegmentRow';
import SegmentWorkspace from './SegmentWorkspace';
import WorldMapBackground from './WorldMapBackground';
import HelpTip from './HelpTip';

function PhaseDetailPage({phase,intelData,onBack,segmentSuggestions,suggestionsLoading,homeCity="",segPhases=[],warningFlags=[],onDismissWarning,allPhases=[],onAmbientSegmentChange}) {
  const isMobile=useMobile();
  const [activeSegment,setActiveSegment]=useState(null);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{onAmbientSegmentChange?.(activeSegment);},[activeSegment,onAmbientSegmentChange]);
  const allSegD=loadSeg();
  const plannedBreakdown=computePhasePlannedSpend(phase,allSegD);
  const plannedSpend=plannedBreakdown.total;
  const phaseCap=Number(phase.totalBudget)||0;
  const allocPct=phaseCap>0?Math.round((plannedSpend/phaseCap)*100):0;
  const barFillPct=Math.min(allocPct,100);
  const spendOverCap=phaseCap>0&&plannedSpend>phaseCap;
  const barColor=spendOverCap?'#FF6B6B':'#c9a04c';
  /** Matches desktop Trip Console phase cards (PhaseCard.jsx) */
  const phaseDetailHeaderGlass={
    background:'rgba(23,27,32,0.62)',
    backdropFilter:'blur(10px)',
    WebkitBackdropFilter:'blur(10px)',
    borderBottom:'1px solid rgba(0,229,255,0.22)',
    borderTop:'1px solid rgba(0,229,255,0.36)',
    boxShadow:'inset 0 1px 0 rgba(248,245,240,0.06), 0 14px 44px rgba(0,0,0,0.42), 0 0 52px rgba(201,160,76,0.08)',
  };
  return(
    <>
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:200,background:BG_PAGE,overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      <WorldMapBackground phases={allPhases} activeCountry={phase.country} departureCity={homeCity||""}/>
      <div className="mc-content" style={{width:1126,maxWidth:'100%',margin:'0 auto',borderInline:'1px solid var(--border, #2e303a)',overflow:'visible',flex:'none',minHeight:'100%',boxSizing:'border-box',position:'relative',zIndex:1}}>
      {/* Header — single glass block: breadcrumb + spend bar + dates (matches Trip Console phase cards) */}
      <div style={{...phaseDetailHeaderGlass,position:'sticky',top:0,left:0,right:0,width:'100%',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',flexWrap:'nowrap',padding:isMobile?'14px 10px':'18px 16px',gap:12}}>
          {isMobile?<button type="button" onClick={onBack} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',fontSize:22,cursor:'pointer',padding:'0 6px 0 0',fontWeight:300,lineHeight:1,minWidth:28,minHeight:44,display:'flex',alignItems:'center',gap:6,flexShrink:0}}>‹ <span style={{fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,color:'rgba(255,255,255,0.45)'}}>EXPEDITION</span></button>
          :<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0}}>
            <span onClick={onBack} style={{color:'rgba(255,255,255,0.35)',cursor:'pointer'}}>‹</span>
            <span onClick={onBack} style={{color:'rgba(255,255,255,0.45)',cursor:'pointer',letterSpacing:1.5}}>EXPEDITION</span>
            <span style={{color:'rgba(255,255,255,0.25)'}}>›</span>
            <span style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:400,color:'rgba(255,255,255,0.90)'}}>{phase.name}</span>
          </div>}
          {isMobile&&<span style={{fontSize:20,flexShrink:0}}>{phase.flag}</span>}
          {isMobile&&<span style={{flex:1,minWidth:0,fontSize:16,fontWeight:400,color:'rgba(255,255,255,0.90)',fontFamily:"'Fraunces',serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{phase.name}</span>}
          {!isMobile&&<div style={{flex:1,minWidth:8}}/>}
          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0,marginLeft:isMobile?'auto':0}}>
            <span style={{fontSize:14,fontWeight:700,color:'#c9a04c',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:'nowrap'}}>{fmt(phase.totalBudget)}</span>
            <HelpTip compact noLeadingMargin desktopOnly text="Manage your flights, stays, activities and notes for this destination" />
          </div>
        </div>
        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:isMobile?'8px 10px 10px':'8px 16px 10px'}}>
          <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden',marginBottom:8}}>
            <div style={{height:'100%',width:`${barFillPct}%`,background:barColor,borderRadius:3,transition:'width 0.5s ease'}}/>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.75)'}}>{fmt(plannedSpend)} / {fmt(phase.totalBudget)} · {allocPct}%</span>
            {spendOverCap&&<button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('openCA',{detail:{message:`I'm over budget on the ${phase?.name||'this'} phase. Can you suggest alternatives that fit within my ${fmt(phase.totalBudget)} phase budget?`}}))} style={{background:'rgba(201,160,76,0.12)',border:'1px solid rgba(201,160,76,0.35)',borderRadius:8,color:'#c9a04c',fontSize:11,fontWeight:600,padding:'6px 12px',cursor:'pointer',letterSpacing:0.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>Ask Co-Architect for alternatives</button>}
          </div>
        </div>
        <div style={{display:'flex',gap:0,borderTop:'1px solid rgba(255,255,255,0.06)',padding:isMobile?'10px 10px 12px':'10px 16px 14px',flexShrink:0}}>
          <span style={{flex:1,fontSize:14,color:'rgba(255,255,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fD(phase.arrival)} – {fD(phase.departure)}</span>
          <span style={{fontSize:14,color:'rgba(255,255,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>🌙{isMobile?`${phase.totalNights}n`:`${phase.totalNights} Nights`}</span>
          {phase.totalDives>0&&<span style={{fontSize:14,color:'#00E5FF',marginLeft:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>🤿{phase.totalDives}</span>}
        </div>
      </div>
      {/* Warning flags */}
      {warningFlags.filter(w=>w.phaseIndex===phase.id-1).map((w,wi)=>(
        <div key={wi} style={{border:'1.5px solid rgba(201,160,76,0.40)',borderRadius:12,background:'rgba(201,160,76,0.06)',padding:'14px 16px',margin:'8px 0',animation:'fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both'}}>
          <div style={{fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(201,160,76,0.70)',letterSpacing:2,marginBottom:6}}>⚠️ {w.type==='date_conflict'?'DATE CONFLICT':'SEASONAL NOTICE'}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.85)',lineHeight:1.6,marginBottom:4}}>{w.message}</div>
          {w.suggestion&&<div style={{fontSize:12,color:'rgba(201,160,76,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:10}}>{w.suggestion}</div>}
          <div style={{display:'flex',gap:8}}>
            {w.dismissible&&<button onClick={()=>onDismissWarning?.(warningFlags.indexOf(w))} style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(201,160,76,0.30)',background:'transparent',color:'rgba(201,160,76,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",cursor:'pointer',fontWeight:600,letterSpacing:1}}>DISMISS</button>}
          </div>
        </div>
      ))}
      {/* Segment list */}
      <div style={{padding:'6px 0 80px'}}>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.40)',letterSpacing:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,padding:'14px 0 8px'}}>YOUR EXPEDITION · {phase.segments.length} SEGMENT{phase.segments.length!==1?'S':''}</div>
        {phase.segments.map((seg,i)=>(
          <SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} onSegmentTap={s=>setActiveSegment(s)} prevCity={prevSegmentNameForSeg(seg, segPhases)} homeCity={homeCity}/>
        ))}
        <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.35)',lineHeight:1.7,textAlign:'center',padding:'20px 16px 0',maxWidth:440,margin:'0 auto'}}>Your expedition unfolds one destination at a time. Tap any segment to begin planning.</div>
      </div>
      </div>
    </div>
    {activeSegment&&(()=>{const allSegs=segPhases.flatMap(p=>p.segments);const segIdx=allSegs.findIndex(s=>s.id===activeSegment.id);const prev=segIdx>0?allSegs[segIdx-1]:null;const segFlatIdx=flatPhaseIndexForSegment(activeSegment,allPhases);return <SegmentWorkspace segment={activeSegment} phaseId={phase.id} phaseName={phase.name} phaseFlag={phase.flag} intelSnippet={intelData?.[activeSegment.name]} onBack={()=>setActiveSegment(null)} onBackToExpedition={()=>{setActiveSegment(null);onBack();}} suggestion={findSuggestionForSegment(segmentSuggestions, activeSegment.name, segFlatIdx)} suggestionsLoading={suggestionsLoading} homeCity={homeCity} prevCity={prev?.name||""} allPhases={allPhases}/>;})()}
    </>
  );
}


export default PhaseDetailPage;
