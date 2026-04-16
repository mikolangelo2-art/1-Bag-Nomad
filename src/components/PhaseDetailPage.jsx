import { useState, useEffect } from "react";
import { useMobile } from '../hooks/useMobile';
import { fmt, fD } from '../utils/dateHelpers';
import { findSuggestionForSegment, flatPhaseIndexForSegment, prevSegmentNameForSeg } from '../utils/tripConsoleHelpers';
import { computePhasePlannedSpend } from '../utils/tripHelpers';
import { loadSeg } from '../utils/storageHelpers';
import SegmentRow from './SegmentRow';
import SegmentWorkspace from './SegmentWorkspace';
import WorldMapBackground from './WorldMapBackground';
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
  return(
    <>
    <div style={{position:'fixed',top:0,left:isMobile?0:68,right:0,bottom:0,zIndex:1100,background:'#0A0705',overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      <WorldMapBackground phases={allPhases} activeCountry={phase.country} departureCity={homeCity||""}/>
      <div style={{width:'100%',maxWidth:880,margin:'0 auto',padding:'0 20px',boxSizing:'border-box',position:'relative',zIndex:1,minHeight:'100%'}}>
      {/* DS v2 utility header — Segment Detail (phase) */}
      <div style={{
        background:'rgba(10,7,5,0.95)',
        backdropFilter:'blur(12px)',
        WebkitBackdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        position:'sticky',
        top:0,
        zIndex:10,
        width:'100%',
      }}>
        <div style={{
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          height:44,
          padding:'0 16px',
          position:'relative',
        }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              position:'absolute',
              left:20,
              background:'none',
              border:'none',
              cursor:'pointer',
              color:'rgba(232,220,200,0.7)',
              fontSize:20,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              minWidth:44,
              minHeight:44,
              padding:0,
            }}
          >
            ←
          </button>
          <div style={{
            position:'absolute',
            left:'50%',
            transform:'translateX(-50%)',
            fontFamily:'Instrument Sans, sans-serif',
            fontWeight:600,
            fontSize:18,
            color:'#E8DCC8',
            letterSpacing:'-0.3px',
            whiteSpace:'nowrap',
            maxWidth:isMobile?'min(52vw, 240px)':'min(480px, 40vw)',
            overflow:'hidden',
            textOverflow:'ellipsis',
          }}>
            {phase.name}
          </div>
          <div style={{
            position:'absolute',
            right:16,
            fontFamily:'Instrument Sans, sans-serif',
            fontWeight:400,
            fontSize:12,
            color:'rgba(232,220,200,0.5)',
            whiteSpace:'nowrap',
            textAlign:'right',
            maxWidth:'38%',
          }}>
            {phase.totalNights?`${phase.totalNights}N`:''}
            {phase.totalNights&&(phase.segments?.[0]?.type||phase.type)?' · ':''}
            {(phase.segments?.[0]?.type||phase.type||'').toUpperCase()}
            {phaseCap>0?` · $${Math.round(phaseCap).toLocaleString()}`:''}
          </div>
        </div>
        {(phase.arrival||phase.departure)&&(
          <div style={{
            fontFamily:'Fraunces, serif',
            fontWeight:300,
            fontStyle:'italic',
            fontSize:13,
            color:'rgba(232,220,200,0.55)',
            textAlign:'center',
            paddingBottom:8,
            paddingTop:0,
          }}>
            {fD(phase.arrival)}{phase.arrival&&phase.departure?' – ':''}{fD(phase.departure)}
            {phase.totalNights?` · ${phase.totalNights} Nights`:''}
          </div>
        )}
        {phaseCap>0&&(
          <div style={{
            height:2,
            background:'rgba(255,255,255,0.06)',
            width:'100%',
          }}>
            <div style={{
              height:'100%',
              width:`${barFillPct}%`,
              background:spendOverCap?'#FF6B6B':'#C9A04C',
              transition:'width 0.4s ease',
            }}/>
          </div>
        )}
      </div>
      {/* Warning flags */}
      {warningFlags.filter(w=>w.phaseIndex===phase.id-1).map((w,wi)=>(
        <div key={wi} style={{border:'1.5px solid rgba(201,160,76,0.40)',borderRadius:12,background:'rgba(201,160,76,0.06)',padding:'14px 16px',margin:'8px 0',animation:'fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both'}}>
          <div style={{fontSize:11,fontFamily:"'Instrument Sans',sans-serif",color:'rgba(201,160,76,0.70)',letterSpacing:2,marginBottom:6}}>⚠️ {w.type==='date_conflict'?'DATE CONFLICT':'SEASONAL NOTICE'}</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.85)',lineHeight:1.6,marginBottom:4}}>{w.message}</div>
          {w.suggestion&&<div style={{fontSize:12,color:'rgba(201,160,76,0.60)',fontFamily:"'Instrument Sans',sans-serif",marginBottom:10}}>{w.suggestion}</div>}
          <div style={{display:'flex',gap:8}}>
            {w.dismissible&&<button onClick={()=>onDismissWarning?.(warningFlags.indexOf(w))} style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(201,160,76,0.30)',background:'transparent',color:'rgba(201,160,76,0.60)',fontSize:11,fontFamily:"'Instrument Sans',sans-serif",cursor:'pointer',fontWeight:600,letterSpacing:1}}>DISMISS</button>}
          </div>
        </div>
      ))}
      {/* Segment list */}
      <div style={{padding:'6px 0 80px'}}>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.40)',letterSpacing:3,fontFamily:"'Instrument Sans',sans-serif",fontWeight:600,padding:'14px 0 8px'}}>YOUR EXPEDITION · {phase.segments.length} SEGMENT{phase.segments.length!==1?'S':''}</div>
        {phase.segments.map((seg,i)=>(
          <SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color||'#C9A04C'} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} onSegmentTap={s=>setActiveSegment(s)} prevCity={prevSegmentNameForSeg(seg, segPhases)} homeCity={homeCity}/>
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
