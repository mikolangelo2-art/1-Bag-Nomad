import { useState, useEffect, useRef, useCallback } from "react";
import posthog from "posthog-js";
import { useMobile } from '../hooks/useMobile';
import { askAI } from '../utils/aiHelpers';
import { fmt, fD, daysBetween } from '../utils/dateHelpers';
import { loadSeg, saveSeg, loadReturn, saveReturn, TI } from '../utils/storageHelpers';
import { STATUS_CFG, STATUS_NEXT, formatTripNameDisplay } from '../utils/tripConsoleHelpers';
import { toSegPhases, computePhasePlannedSpend } from '../utils/tripHelpers';
import PhaseCard from './PhaseCard';
import PhaseDetailPage from './PhaseDetailPage';
import WorldMapBackground from './WorldMapBackground';

function MissionConsole({tripData,onNewTrip,onExitDemo,onRevise,onPackConsole,onHomecoming,isFullscreen,setFullscreen,initialTab="next",segmentSuggestions,suggestionsLoading,onUpdateTripData,onTripAmbientContextChange,founderExpedition=null,founderMode=false,onToggleFounderExpedition,onSaveAsFounderExpedition,hideBottomNav=false}) {
  const isMobile=useMobile();
  useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});posthog.capture("$pageview",{$current_url:"/trip-console"});},[]);
  const [explorerData,setExplorerData]=useState(()=>{try{const s=localStorage.getItem("1bn_intel");return s?JSON.parse(s):{}}catch(e){return{};}});
  const [phaseDetailView,setPhaseDetailView]=useState(null);
  const [caWorkspaceSegment,setCaWorkspaceSegment]=useState(null);
  useEffect(()=>{if(!phaseDetailView)setCaWorkspaceSegment(null);},[phaseDetailView]);
  useEffect(()=>{
    if(!onTripAmbientContextChange)return;
    if(!phaseDetailView){onTripAmbientContextChange({screen:"trip-console",phase:null,segment:null,tab:null});return;}
    if(caWorkspaceSegment){onTripAmbientContextChange({screen:"segment-workspace",phase:phaseDetailView,segment:caWorkspaceSegment,tab:null});}
    else{onTripAmbientContextChange({screen:"phase-detail",phase:phaseDetailView,segment:null,tab:null});}
  },[phaseDetailView,caWorkspaceSegment,onTripAmbientContextChange]);
  const [warningFlags,setWarningFlags]=useState(()=>{try{const s=localStorage.getItem('1bn_warnings_v1');return s?JSON.parse(s):[];}catch(e){return[];}});
  useEffect(()=>{try{localStorage.setItem('1bn_warnings_v1',JSON.stringify(warningFlags));}catch(e){}},[warningFlags]);
  const dismissWarning=(idx)=>setWarningFlags(f=>f.filter((_,i)=>i!==idx));
  useEffect(()=>{try{localStorage.setItem("1bn_intel",JSON.stringify(explorerData));}catch(e){};},[explorerData]);

  const flatPhases=tripData.phases||[];
  const returnPhase=flatPhases.find(p=>p.type==="Return")||null;
  const destFlatPhases=flatPhases.filter(p=>p.type!=="Return");
  const segPhases=tripData.segmentedPhases||toSegPhases(destFlatPhases);
  const allSegD=loadSeg();
  const depInput=tripData.departureCity||tripData.city||"";
  const isComplete=segPhases.length>0&&new Date()>new Date((segPhases[segPhases.length-1].departure||"2099-01-01")+"T12:00:00");

  return(
    <div style={{minHeight:'100vh',background:'#0A0705',paddingBottom:hideBottomNav?0:80,animation:"consoleIn 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>

      {/* DS v2 Section 4: dot world map texture + whisper gold atmospheric wash */}
      <WorldMapBackground phases={tripData.phases||[]} activeCountry={phaseDetailView?.country} departureCity={depInput}/>
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse at 50% 30%, rgba(201,160,76,0.04) 0%, transparent 70%)',pointerEvents:'none',zIndex:0}}/>

      {/* Phase detail page (full overlay) */}
      {phaseDetailView&&<PhaseDetailPage phase={phaseDetailView} intelData={explorerData} onBack={()=>setPhaseDetailView(null)} segmentSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading} homeCity={depInput} segPhases={segPhases} warningFlags={warningFlags} onDismissWarning={dismissWarning} allPhases={tripData.phases||[]} onAmbientSegmentChange={setCaWorkspaceSegment}/>}

      {/* Phase card list */}
      {!phaseDetailView&&(
        <>
      <div style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(10,7,5,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Instrument Sans', sans-serif",
          fontWeight: 600,
          fontSize: 18,
          color: "#E8DCC8",
          letterSpacing: "-0.3px",
        }}>
          My Expedition
        </span>
      </div>
        <div style={{
          maxWidth:880,
          margin:'0 auto',
          padding:isMobile?'16px 12px':'16px 24px',
          display:'flex',
          flexDirection:'column',
          gap:12,
        }}>
          {isComplete&&typeof onHomecoming==='function'&&(
            <div onClick={onHomecoming} style={{padding:'14px 16px',background:'rgba(201,160,76,0.06)',border:'1px solid rgba(201,160,76,0.25)',borderRadius:14,cursor:'pointer',display:'flex',alignItems:'center',gap:10}} onMouseOver={e=>e.currentTarget.style.borderColor='rgba(201,160,76,0.45)'} onMouseOut={e=>e.currentTarget.style.borderColor='rgba(201,160,76,0.25)'}>
              <span style={{fontSize:18}}>&#x1F3C6;</span>
              <span style={{fontSize:11,fontWeight:600,color:'#C9A04C',letterSpacing:2,fontFamily:"'Instrument Sans',sans-serif",flex:1}}>EXPEDITION COMPLETE</span>
              <span style={{fontSize:13,color:'rgba(201,160,76,0.5)'}}>&#x2192;</span>
            </div>
          )}

          {segPhases.map((phase,i)=>{
            const plannedOverBudget=computePhasePlannedSpend(phase,allSegD).total>(Number(phase.totalBudget)||0);
            return <PhaseCard key={phase.id} phase={phase} intelData={explorerData} idx={i} onTap={p=>setPhaseDetailView(p)} allSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading} allPhases={tripData.phases||[]} segPhases={segPhases} homeCity={depInput} plannedOverBudget={plannedOverBudget}/>;
          })}

          {returnPhase&&<PhaseCard key="return" phase={returnPhase} intelData={explorerData} idx={segPhases.length} onTap={null} allSuggestions={null} suggestionsLoading={false}/>}
        </div>
        </>
      )}

      {/* Bottom spacer for mobile nav */}
      {isMobile&&!phaseDetailView&&<div style={{height:hideBottomNav?'calc(80px + env(safe-area-inset-bottom))':'calc(64px + env(safe-area-inset-bottom))'}}/>}
    </div>
  );
}

export default MissionConsole;
