import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMobile } from '../hooks/useMobile';
import { askAI } from '../utils/aiHelpers';
import { fmt, fD, formatSegmentCardDateHeader, formatTravelLegDates } from '../utils/dateHelpers';
import { loadSeg, saveSeg } from '../utils/storageHelpers';
import { returnToLogCopy, addedToPlanLine } from '../utils/microcopy';
import { inferTransportMode, findSuggestionForSegment, flatPhaseIndexForSegment, loadSuggestionsFromStorage, loadDismissed, saveDismissed, suggestionCardStyle, suggestionHeaderStyle, disclaimerStyle, acceptBtnStyle, dismissBtnStyle, sanitizeAiDisplayText, transportNotesFromSuggestion, transportSuggestionEstimateHint, parseTransportEstimateToCostDigits, suggestionRowHasPayload, isRowEmpty } from '../utils/tripConsoleHelpers';
import SDF from './SDF';
import CityInput from './CityInput';
import WorldMapBackground from './WorldMapBackground';
import { ActivitySuggestionExperienceCard } from './ActivitySuggestionExperienceCard';
import { BG_PAGE } from '../constants/colors';
import HelpTip from './HelpTip';
import SuggestionShimmer from './SuggestionShimmer';
import GenericSuggestionCard from './GenericSuggestionCard';
import { SuggestionPhotoDedupProvider } from './SuggestionPhotoDedupProvider';
import { useTabSuggestions } from '../hooks/useTabSuggestions';
import { truncateCalendarLine } from '../utils/suggestionCardShape';

function parsePriceDigits(s){
  const m=String(s||'').match(/\d+/);
  return m?m[0]:'';
}

/** Daily USD for food insight cards: $12 from "$12", else $ / $$ / $$$ tiers when AI sends no digits. */
function parseFoodInsightDailyBudget(priceStr) {
  const s = String(priceStr || "");
  const explicit = s.match(/\$\s*(\d+)/);
  if (explicit) {
    const n = parseInt(explicit[1], 10);
    if (n > 0 && n < 500) return String(n);
  }
  const perDay = s.match(/(\d+)\s*(?:\/day|per\s*day)/i);
  if (perDay) {
    const n = parseInt(perDay[1], 10);
    if (n > 0 && n < 500) return String(n);
  }
  const dollarCount = (s.match(/\$/g) || []).length;
  if (dollarCount >= 1) {
    const tier = Math.min(dollarCount, 4);
    const tierToUsd = { 1: 22, 2: 38, 3: 58, 4: 85 };
    return String(tierToUsd[tier]);
  }
  const nums = s.match(/\d+/g);
  if (nums && nums.length) {
    const n = parseInt(nums[0], 10);
    if (n > 0 && n < 500) return String(n);
  }
  return "";
}

function parseFoodRecLine(s) {
  const t = sanitizeAiDisplayText(String(s || "").trim());
  if (!t) return { name: "", desc: "" };
  const seps = [" \u00B7 ", " \u2014 ", " \u2013 ", " for ", " - ", " | "];
  for (const sep of seps) {
    const i = t.indexOf(sep);
    if (i > 0) return { name: t.slice(0, i).trim(), desc: t.slice(i + sep.length).trim() };
  }
  return { name: t, desc: "" };
}

/** Collapse duplicate AI lines (invisible chars, accents, NBSP). */
function foodRecDedupeKey(r) {
  return String(sanitizeAiDisplayText(r || ""))
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
}

/** Venue + dish (after parseFoodRecLine); catches duplicate "Mercado X for Y" lines that differ only in hidden chars. */
function foodRecSemanticDedupeKey(r) {
  const { name, desc } = parseFoodRecLine(String(r).trim());
  const n = foodRecDedupeKey(name);
  const d = foodRecDedupeKey(desc);
  if (!desc) return foodRecDedupeKey(r);
  return `${n}::${d}`;
}

function dedupeFoodRecommendations(raw) {
  const seenFull = new Set();
  const seenSem = new Set();
  const out = [];
  for (const r of raw || []) {
    const k = foodRecDedupeKey(r);
    if (!k || seenFull.has(k)) continue;
    const sem = foodRecSemanticDedupeKey(r);
    if (seenSem.has(sem)) continue;
    seenFull.add(k);
    seenSem.add(sem);
    out.push(sanitizeAiDisplayText(String(r).trim()));
  }
  return out;
}

function applyTransportDateDefaults(transport, segment) {
  const tr = { ...transport };
  if (!(String(tr.departDate ?? "").trim()) && segment?.arrival) tr.departDate = segment.arrival;
  if (!(String(tr.arriveDate ?? "").trim()) && segment?.arrival) tr.arriveDate = segment.arrival;
  return tr;
}

function CollapsibleSuggestion({summaryCard=false,onSwitchToSuggestion,confirmMessage,children}){
  const [open,setOpen]=useState(false);
  return(
    <div style={{marginTop:10}}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{background:'none',border:'none',color:'rgba(255,159,67,0.65)',fontSize:13,cursor:'pointer',padding:0,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:'0.1em',textAlign:'left',width:'100%',lineHeight:1.45}}>{open?'⌄ Hide suggestion':'› View suggestion'}</button>
      <div style={{maxHeight:open?1600:0,overflow:'hidden',transition:'max-height 0.4s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
        <div style={{paddingTop:12}}>
          {children}
          {summaryCard&&onSwitchToSuggestion&&<div style={{marginTop:12}}>
            <button type="button" onClick={()=>{if(typeof window!=="undefined"&&window.confirm(confirmMessage||'Replace your saved plan with this Co-Architect suggestion?'))onSwitchToSuggestion();}} style={{...dismissBtnStyle,width:'100%'}}>SWITCH TO THIS</button>
          </div>}
        </div>
      </div>
    </div>
  );
}

function SegmentWorkspace({segment,phaseId,phaseName:phaseLabelName,phaseFlag,intelSnippet,onBack,onBackToExpedition,suggestion:suggestionProp,suggestionsLoading,homeCity="",prevCity="",allPhases=[]}) {
  const isMobile=useMobile();
  const dest=(segment?.name||"").trim();
  const destCountry=(segment?.country||"").trim();
  const stayLockedCardRadius=14;
  const key=`${phaseId}-${segment.id}`;
  const blank={transport:{mode:"",from:"",to:"",departDate:"",departTime:"",arriveDate:"",arriveTime:"",depTime:"",arrTime:"",cost:"",notes:"",link:""},stay:{name:"",checkin:"",checkout:"",cost:"",link:"",notes:""},activities:[],actNotes:"",food:{dailyBudget:"",notes:""},misc:[],intel:{notes:""}};
  const [ownRestaurantOpen,setOwnRestaurantOpen]=useState(false);
  const [ownRestaurant,setOwnRestaurant]=useState({name:"",cuisine:"",priceTier:"",link:"",notes:""});
  const [det,setDet]=useState(()=>{const a=loadSeg();const base=a[key]?{...blank,...a[key]}:blank;const stay={...base.stay};if(!(String(stay.checkin||"").trim())&&segment?.arrival)stay.checkin=segment.arrival;if(!(String(stay.checkout||"").trim())&&segment?.departure)stay.checkout=segment.departure;const transport=applyTransportDateDefaults({...blank.transport,...base.transport},segment);return{...base,stay,transport};});
  const [tab,setTab]=useState("transport");
  const [visitedTabs,setVisitedTabs]=useState(()=>new Set([tab]));
  const visitedKeyRef=useRef(key);
  useEffect(()=>{
    if(visitedKeyRef.current!==key){visitedKeyRef.current=key;setVisitedTabs(new Set([tab]));return;}
    setVisitedTabs(prev=>{if(prev.has(tab))return prev;const next=new Set(prev);next.add(tab);return next;});
  },[tab,key]);
  const [editingTransport,setEditingTransport]=useState(false);
  const [planningOwn,setPlanningOwn]=useState(false);
  const [transportFocused,setTransportFocused]=useState(false);
  const [transportConfirmed,setTransportConfirmed]=useState(false);
  const [editingStay,setEditingStay]=useState(false);
  const [editingFood,setEditingFood]=useState(false);
  const [stayFocused,setStayFocused]=useState(false);
  const [foodFocused,setFoodFocused]=useState(false);
  const [planningOwnStay,setPlanningOwnStay]=useState(false);
  const [transportEst,setTransportEst]=useState(null);
  const [transportEstLoading,setTransportEstLoading]=useState(false);
  const transportEstTimer=useRef(null);
  const fetchTransportEst=useCallback(()=>{
    const from=det.transport.from,to=det.transport.to,mode=det.transport.mode;
    if(isRowEmpty(from)||isRowEmpty(to))return;
    if(transportEstTimer.current)clearTimeout(transportEstTimer.current);
    transportEstTimer.current=setTimeout(async()=>{
      setTransportEstLoading(true);
      try{
        const raw=await askAI(`Transport ${from} to ${to} by ${mode||'flight'}. Return JSON only: {"estimate":"$X-X","note":"one tip"}`,100);
        const m=raw.match(/\{[\s\S]*\}/);if(m){setTransportEst(JSON.parse(m[0]));}
      }catch(e){}
      setTransportEstLoading(false);
    },1000);
  },[det.transport.from,det.transport.to,det.transport.mode]);
  useEffect(()=>{if(!isRowEmpty(det.transport.from)&&!isRowEmpty(det.transport.to))fetchTransportEst();},[det.transport.from,det.transport.to,det.transport.mode]);
  const [stayManualOpen,setStayManualOpen]=useState(false);
  const [activitiesManualOpen,setActivitiesManualOpen]=useState(false);
  const [foodManualOpen,setFoodManualOpen]=useState(false);
  const [stayInsightSavedIdx,setStayInsightSavedIdx]=useState(null);
  const [showStayBookingForm,setShowStayBookingForm]=useState(false);
  const [editingActIdx,setEditingActIdx]=useState(null);
  const [foodConfirmedPinnedIdxs,setFoodConfirmedPinnedIdxs]=useState([]);
  const [transportRouteInPlace,setTransportRouteInPlace]=useState(false);
  const [foodInsightSavedIdxs,setFoodInsightSavedIdxs]=useState([]);
  const [actInsightSavedIdxs,setActInsightSavedIdxs]=useState([]);
  const [travelManualOpen,setTravelManualOpen]=useState(false);
  const [nAct,setNAct]=useState({name:"",date:"",cost:"",transit:"",link:""});
  const [aiLoad,setAiLoad]=useState(false);
  const [saveFlash,setSaveFlash]=useState(false);
  const saveFlashRef=useRef(null);
  const isFirst=useRef(true);
  const [status,setStatus]=useState(()=>{const d=loadSeg()[key];return d?.status||'planning';});
  const suggestionWsKey=`${phaseId}:${segment?.id ?? ""}`;
  const suggestionFromMemo=useMemo(()=>{
    const all=loadSuggestionsFromStorage();
    const idx=flatPhaseIndexForSegment(segment,allPhases);
    const stored=findSuggestionForSegment(all,segment.name,idx);
    if(!suggestionProp)return stored;
    if(!stored)return suggestionProp;
    return{
      ...stored,
      ...suggestionProp,
      food:suggestionProp.food??stored.food,
      stay:suggestionProp.stay??stored.stay,
      transport:suggestionProp.transport??stored.transport,
      activities:(suggestionProp.activities&&suggestionProp.activities.length)?suggestionProp.activities:(stored.activities||[]),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- segment id+name only; whole `segment` ref often changes without semantic change
  },[suggestionProp,phaseId,segment?.id,segment?.name,allPhases]);
  const suggestionStashRef=useRef({k:"",sug:null});
  if(suggestionFromMemo&&suggestionRowHasPayload(suggestionFromMemo)) suggestionStashRef.current={k:suggestionWsKey,sug:suggestionFromMemo};
  const suggestion=suggestionFromMemo||(suggestionStashRef.current.k===suggestionWsKey?suggestionStashRef.current.sug:null);
  const dismissKey = segment.name || `${phaseId}`;
  const caFromArch=(()=>{const fp=(allPhases||[]).find(p=>p.type!=="Return"&&p.name===segment.name&&(!segment.country||p.country===segment.country));return fp?.caActivities?.filter(a=>a&&(a.name||a.title))||[];})();
  const [dismissed,setDismissed]=useState(()=>loadDismissed());
  const isDism=(type)=>!!dismissed[`${dismissKey}_${type}`];
  const dismiss=(type)=>{const d={...dismissed,[`${dismissKey}_${type}`]:true};setDismissed(d);saveDismissed(d);};
  const [docsData,setDocsData]=useState(()=>{try{const s=localStorage.getItem(`1bn_docs_${phaseId}_v1`);return s?JSON.parse(s):null;}catch(e){return null;}});
  const [docsLoading,setDocsLoading]=useState(false);
  const [docsNote,setDocsNote]=useState(det.intel?.notes||"");
  const [bookDropdown,setBookDropdown]=useState(null);
  async function loadDocs(){if(docsData||docsLoading)return;setDocsLoading(true);try{const raw=await askAI(`Travel advisor. Destination:${segment.name},${segment.country}. Home:USA. Return JSON only:{"visa":{"required":true,"details":"","cost":""},"health":{"required":[],"recommended":[],"notes":""},"money":{"currency":"","tips":"","warning":""},"connectivity":{"tips":""},"safety":{"level":"low","notes":""},"customs":{"tips":""},"emergency":{"police":"","ambulance":"","embassy":""}}`,800);const m=raw.match(/\{[\s\S]*\}/);if(m){const d=JSON.parse(m[0]);setDocsData(d);localStorage.setItem(`1bn_docs_${phaseId}_v1`,JSON.stringify(d));}}catch(e){}setDocsLoading(false);}
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{setPlanningOwnStay(false);setStayInsightSavedIdx(null);setShowStayBookingForm(false);setTransportRouteInPlace(false);setFoodInsightSavedIdxs([]);setActInsightSavedIdxs([]);setEditingActIdx(null);setFoodConfirmedPinnedIdxs([]);setOwnRestaurantOpen(false);setOwnRestaurant({name:"",cuisine:"",priceTier:"",link:"",notes:""});},[key]);
  useEffect(()=>{if(planningOwnStay)setStayManualOpen(true);},[planningOwnStay]);
  useEffect(()=>{if(planningOwn)setTravelManualOpen(true);},[planningOwn]);
  useEffect(()=>{if(editingFood)setFoodManualOpen(true);},[editingFood]);
  useEffect(()=>{
    if(editingActIdx==null)return;
    const row=det.activities.find(x=>x.actInsightIdx===editingActIdx);
    if(!row)return;
    setNAct({name:row.name||"",date:row.date||"",cost:String(row.cost||""),link:row.link||"",transit:(row.notes||"")});
  },[editingActIdx]);
  useEffect(()=>{const a=loadSeg();const base=a[key]?{...blank,...a[key]}:blank;const stay={...base.stay};if(!(String(stay.checkin||"").trim())&&segment?.arrival)stay.checkin=segment.arrival;if(!(String(stay.checkout||"").trim())&&segment?.departure)stay.checkout=segment.departure;const transport=applyTransportDateDefaults({...blank.transport,...base.transport},segment);setDet({...base,stay,transport});},[key]);
  useEffect(()=>{if(isFirst.current){isFirst.current=false;return;}const a=loadSeg();const ex=a[key]||{};const merged={...ex,...det,status:ex.status||'planning',statusUpdatedAt:ex.statusUpdatedAt||null,changes:ex.changes||[]};if(isRowEmpty(merged.transport))delete merged.transport;if(isRowEmpty(merged.stay))delete merged.stay;if(isRowEmpty(merged.food))delete merged.food;a[key]=merged;saveSeg(a);setSaveFlash(true);if(saveFlashRef.current)clearTimeout(saveFlashRef.current);saveFlashRef.current=setTimeout(()=>setSaveFlash(false),2000);},[det]);
  const uT=(f,v)=>setDet(d=>({...d,transport:{...d.transport,[f]:v}}));
  const uS=(f,v)=>setDet(d=>({...d,stay:{...d.stay,[f]:v}}));
  const uF=(f,v)=>setDet(d=>({...d,food:{...d.food,[f]:v}}));
  const clearStayPlan=()=>{setDet(d=>({...d,stay:{name:"",checkin:"",checkout:"",cost:"",link:"",notes:""}}));const nd={...dismissed};delete nd[`${dismissKey}_stay`];setDismissed(nd);saveDismissed(nd);setPlanningOwnStay(false);setStayInsightSavedIdx(null);setShowStayBookingForm(false);setBookDropdown(b=>b==='stay'?null:b);};
  async function aiFood(){
    setAiLoad(true);
    try{
      const r=await askAI(`Daily food budget USD solo traveler ${segment.name}. Number only.`,20);
      const nums=(r.match(/\d+/g)||[]).map(Number).filter(x=>x>0&&x<500);
      let n="";
      if(nums.length===1)n=String(nums[0]);
      else if(nums.length>=2)n=String(Math.round((nums[0]+nums[1])/2));
      if(n)setDet(d=>({...d,food:{...d.food,dailyBudget:n}}));
    }finally{
      setAiLoad(false);
    }
  }
  const acceptTransport=(t)=>{let mode=inferTransportMode(t.route);if(!mode&&/→|–|—|->/.test(String(t.route||"")))mode="Flight";if(mode)uT("mode",mode);uT("from",prevCity||homeCity||"");uT("to",segment.name||"");uT("cost",(t.estimatedCost||"").split('-')[0].replace(/[^0-9]/g,''));uT("notes",transportNotesFromSuggestion(t,{prevCity,homeCity,segmentName:segment.name}));setTransportRouteInPlace(true);setTransportConfirmed(true);};
  const clearTransport=()=>{setDet(d=>({...d,transport:{mode:"",from:"",to:"",departDate:"",departTime:"",arriveDate:"",arriveTime:"",depTime:"",arrTime:"",cost:"",notes:"",link:""}}));const nd={...dismissed};delete nd[`${dismissKey}_transport`];setDismissed(nd);saveDismissed(nd);setEditingTransport(false);setPlanningOwn(false);setTransportConfirmed(false);setTransportRouteInPlace(false);};
  const saveManualTransport=()=>{const hasEndpoints=!isRowEmpty(det.transport?.from)&&!isRowEmpty(det.transport?.to);if(!hasEndpoints)return;if(transportEst&&!det.transport.cost){const d=parseTransportEstimateToCostDigits(transportEst.estimate);if(d)uT("cost",d);}setTransportRouteInPlace(false);setTransportConfirmed(true);setTransportFocused(false);};
  // Auto-confirm on mount if a previously-saved leg already has endpoints (preserve legacy data).
  useEffect(()=>{if(!isRowEmpty(det.transport?.from)&&!isRowEmpty(det.transport?.to)&&(det.transport?.mode||det.transport?.cost||det.transport?.notes))setTransportConfirmed(true);/* eslint-disable-next-line */},[]);
  const acceptActivity=(a,suggestionIdx=null,actInsightIdx=null)=>{const sentences=(a.notes||"").split(/(?<=[.!?])\s+/);const brief=sentences[0]||"";const tipText=sentences.slice(1).join(' ');const row={name:a.name,brief,tip:tipText,date:"",cost:(a.estimatedCost||"").match(/\d+/)?.[0]||"",notes:`${a.provider||""}${tipText?`\n${tipText}`:""}`,provider:a.provider||"",link:a.link||"",id:Date.now()+Math.random()};if(suggestionIdx!=null)row.suggestionActivityIdx=suggestionIdx;if(actInsightIdx!=null)row.actInsightIdx=actInsightIdx;setDet(d=>({...d,activities:[...d.activities,row]}));};
  // Leg endpoints set: show transport card + EDIT; keep planning form visible until then (avoid unmounting MODE/COST on first cost digit).
  const transportEndpointsLocked=!isRowEmpty(det.transport?.from)&&!isRowEmpty(det.transport?.to);
  const transportLegLocked=(!transportFocused)&&transportEndpointsLocked&&transportConfirmed;
  // A2 Travel: hide transport suggestion only when from+to locked (not on mode+cost alone — avoids layout jump).
  const hideTransportSuggestion=transportLegLocked;
  const travelSummaryDateLine=formatTravelLegDates(det.transport);
  const transportCostModeParts=(()=>{const p=[];if(!travelSummaryDateLine){const dpt=(det.transport.departTime||det.transport.depTime||"").trim();const arv=(det.transport.arriveTime||det.transport.arrTime||"").trim();if(dpt)p.push(`Depart ${dpt}`);if(arv)p.push(`Arrive ${arv}`);}if(det.transport.cost)p.push(`Est. $${det.transport.cost}`);if(det.transport.mode&&det.transport.from)p.push(det.transport.mode);return p;})();
  const canShowSuggestedRouteHero=!!(suggestion?.transport&&!isDism('transport')&&!hideTransportSuggestion);
  const needsTravelManualToggle=!!(canShowSuggestedRouteHero&&!transportLegLocked);
  const showTravelManualInner=(!transportLegLocked||planningOwn)&&!editingTransport&&!(suggestionsLoading&&!suggestion)&&(!needsTravelManualToggle||travelManualOpen||planningOwn);
  useEffect(()=>{if(transportLegLocked)setPlanningOwn(false);},[transportLegLocked]);
  const transportCommittedRef=useRef(null);
  const transportSuggestionRef=useRef(null);
  const wasTransportLegLockedRef=useRef(false);
  useEffect(()=>{
    if(transportRouteInPlace&&transportSuggestionRef.current){
      requestAnimationFrame(()=>{transportSuggestionRef.current?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});});
      wasTransportLegLockedRef.current=transportLegLocked;
      return;
    }
    if(transportLegLocked&&!wasTransportLegLockedRef.current&&!transportRouteInPlace){
      requestAnimationFrame(()=>{transportCommittedRef.current?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});});
    }
    wasTransportLegLockedRef.current=transportLegLocked;
  },[transportLegLocked,transportRouteInPlace]);
  useEffect(()=>{if(!isRowEmpty({from:det.transport?.from,to:det.transport?.to,mode:det.transport?.mode,cost:det.transport?.cost}))return;const d={...dismissed};delete d[`${dismissKey}_transport`];setDismissed(d);saveDismissed(d);},[det.transport.from,det.transport.to,det.transport.mode,det.transport.cost]);
  const stayNameTrim=(det.stay?.name||"").trim();
  const hasS=stayNameTrim.length>0;
  const stayCostNum=Number(String(det.stay?.cost??"").replace(/[^0-9.]/g,""))||0;
  const hasStaySecondaryField=(!isRowEmpty(det.stay?.checkin)&&!isRowEmpty(det.stay?.checkout))||stayCostNum>0||(det.stay?.link||"").trim().length>0||(det.stay?.notes||"").trim().length>0;
  const showStayAccommodationCard=hasS&&hasStaySecondaryField&&!stayFocused;
  const hasFoodBudget=!isRowEmpty(det.food?.dailyBudget);
  const stayInsight=useTabSuggestions({kind:"stay",segment,enabled:tab==="stay"&&(!showStayAccommodationCard||stayInsightSavedIdx!=null)});
  const foodInsight=useTabSuggestions({kind:"food",segment,enabled:tab==="food"&&(!hasFoodBudget||foodInsightSavedIdxs.length>0)});
  const actInsight=useTabSuggestions({kind:"activities",segment,enabled:tab==="activities"});
  const prevStop=(prevCity||"").trim();
  const homeStop=(homeCity||"").trim();
  const thisStop=(segment.name||"").trim();
  const plannedLegFrom=prevStop||homeStop||"Trip start";
  const plannedLegTo=thisStop||"This stop";
  const fromLegChips=!!(prevStop||(homeStop&&(!prevStop||homeStop.toLowerCase()!==prevStop.toLowerCase())));
  const toLegChips=!!thisStop;
  const segmentCardDateHeader=formatSegmentCardDateHeader(segment.arrival,segment.departure,segment.nights);
  const suggestionHeaderReadable={...suggestionHeaderStyle,fontSize:12,lineHeight:1.45};
  const disclaimerReadable={...disclaimerStyle,fontSize:12,lineHeight:1.58};
  const ctaFlex=isMobile?{width:"100%",minHeight:44}:{flex:1,minWidth:120,minHeight:44};
  const planCommitCardBorder=isMobile?'1px solid rgba(201,160,76,0.45)':'1.5px solid rgba(201,160,76,0.55)';
  const planCommitCardBg='rgba(201,160,76,0.06)';
  const planCommitCardRadius=isMobile?12:14;
  const planCommitCardPad=isMobile?'14px 10px':'18px 20px';
  const planCommitLabelStyle={fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(201,160,76,0.65)',letterSpacing:2};
  const planCommitAddedLineStyle={fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(201,160,76,0.92)',letterSpacing:0.35,lineHeight:1.45};
  const savedCheckStyle={color:'#10B981',fontSize:14,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700};
  const savedSubStyle={color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:4,lineHeight:1.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"};
  const animatedRouteLegIndex=useMemo(()=>{const idx=(allPhases||[]).findIndex(p=>p.name===segment.name&&(!segment.country||p.country===segment.country));if(idx<0)return undefined;const hasDep=!!(homeCity||"").trim();if(hasDep)return idx;return idx>0?idx-1:undefined;},[allPhases,segment.name,segment.country,homeCity]);
  const committedFooterWrapStyle={marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.06)'};
  const addedPlanLineStyle={fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(105,240,174,0.88)',letterSpacing:0.35,lineHeight:1.45};
  const returnToLogFooterStyle={fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.36)',letterSpacing:'0.14em',lineHeight:1.58,marginTop:8};
  const caReminderStyle={fontFamily:"'Fraunces',serif",fontStyle:'italic',fontSize:16,color:'rgba(248,245,240,0.65)',textAlign:'center',padding:'14px 16px 10px',width:'100%',background:'none',border:'none',cursor:'pointer',display:'block',lineHeight:1.6};
  const tripFieldLabel={fontSize:isMobile?12:14,color:"rgba(0,229,255,0.75)",letterSpacing:1.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500,opacity:0.92};
  const cityInStyle={background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:6,color:"#FFF",fontSize:isMobile?12:15,padding:isMobile?"4px 7px":"5px 8px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",width:"100%",maxWidth:"100%",boxSizing:"border-box",lineHeight:1.6};
  const legChipStyle={padding:"5px 10px",borderRadius:6,border:"1px solid rgba(0,229,255,0.35)",background:"rgba(0,229,255,0.06)",color:"rgba(0,229,255,0.88)",fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",minHeight:32,lineHeight:1.35};
  const transportFromToGrid=(forManual)=><>
    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
      <div style={{display:'flex',flexDirection:'column',gap:isMobile?2:3}}>
        <div style={tripFieldLabel}>FROM</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center',minHeight:toLegChips&&!fromLegChips?32:undefined}}>
          {prevStop?<button type="button" onClick={()=>uT("from",prevStop)} style={legChipStyle}>Use previous stop</button>:null}
          {homeStop&&(!prevStop||homeStop.toLowerCase()!==prevStop.toLowerCase())?<button type="button" onClick={()=>uT("from",homeStop)} style={legChipStyle}>{prevStop?"Trip departure (home)":"Use trip departure"}</button>:null}
        </div>
        <CityInput accent="cyan" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="City, region, or airport" style={cityInStyle} onFocus={()=>forManual&&setTransportFocused(true)} onBlur={()=>forManual&&setTransportFocused(false)}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:isMobile?2:3}}>
        <div style={tripFieldLabel}>TO</div>
        {thisStop?<div style={{display:'flex',flexWrap:'wrap',gap:6}}><button type="button" onClick={()=>uT("to",thisStop)} style={legChipStyle}>This stop: {thisStop}</button></div>:null}
        <CityInput accent="cyan" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="City, region, or airport" style={cityInStyle} onFocus={()=>forManual&&setTransportFocused(true)} onBlur={()=>forManual&&setTransportFocused(false)}/>
      </div>
    </div>
  </>;
  const transportDateTimeGrid=<>
    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10,marginTop:10}}>
      <div style={{display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:'1 1 160px',minWidth:0}}><SDF type="date" label="DEPART DATE" value={det.transport.departDate??""} onChange={v=>uT("departDate",v)} accent="#00E5FF"/></div>
        <div style={{flex:'0 1 104px',minWidth:84}}><SDF label="DEPART TIME" value={det.transport.departTime??""} onChange={v=>uT("departTime",v)} placeholder="HH:MM" accent="#00E5FF"/></div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:'1 1 160px',minWidth:0}}><SDF type="date" label="ARRIVE DATE" value={det.transport.arriveDate??""} onChange={v=>uT("arriveDate",v)} accent="#00E5FF"/></div>
        <div style={{flex:'0 1 104px',minWidth:84}}><SDF label="ARRIVE TIME" value={det.transport.arriveTime??""} onChange={v=>uT("arriveTime",v)} placeholder="HH:MM" accent="#00E5FF"/></div>
      </div>
    </div>
  </>;
  const TABS=[{id:"transport",label:"TRAVEL",icon:"✈️"},{id:"stay",label:"STAY",icon:"🏨"},{id:"activities",label:isMobile?"ACTS":"ACTIVITIES",icon:"🎯",count:det.activities.length},{id:"food",label:"FOOD",icon:"🍜"},{id:"budget",label:"BUDGET",icon:"💰"},{id:"calendar",label:isMobile?"CAL":"CALENDAR",icon:"📅"},{id:"docs",label:"DOCS",icon:"📋"}];
  /** Rounded shell for breadcrumb header, tab bar, and tab panel (matches PhaseDetailPage / ConsoleHeader) */
  const segWorkspaceHdrR=isMobile?12:16;
  const segMobileLoose=isMobile&&(tab==="stay"||tab==="activities"||tab==="food");
  return(
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:300,background:BG_PAGE,overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      <WorldMapBackground phases={allPhases} activeCountry={(() => { const match = (allPhases||[]).find(p => p.name === phaseLabelName); return match ? match.country : phaseLabelName; })()} departureCity={homeCity||""} animatedRouteLegIndex={animatedRouteLegIndex}/>
      <div className="mc-content" style={{width:1126,maxWidth:'100%',margin:'0 auto',borderInline:'1px solid var(--border, #2e303a)',overflow:'visible',flex:'none',minHeight:'100%',boxSizing:'border-box',position:'relative',zIndex:1}}>
      {/* Header — glass card (Trip Console / PhaseCard language) */}
      <div style={{display:'flex',alignItems:'center',padding:isMobile?'14px 10px':'18px 16px',gap:12,background:'rgba(23,27,32,0.65)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',borderBottom:'1px solid rgba(201,160,76,0.18)',borderTop:'1px solid rgba(255,255,255,0.06)',position:'sticky',top:0,zIndex:10,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.3), 0 0 24px rgba(201,160,76,0.04)',borderTopLeftRadius:segWorkspaceHdrR,borderTopRightRadius:segWorkspaceHdrR,overflow:'hidden'}}>
        {isMobile?(
          <>
            <button type="button" onClick={onBack} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',fontSize:24,cursor:'pointer',padding:'0 8px 0 0',fontWeight:300,lineHeight:1,minWidth:32,minHeight:44,display:'flex',alignItems:'center',gap:6}}>‹ <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,color:'rgba(255,255,255,0.45)'}}>{phaseLabelName.toUpperCase()}</span></button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:17,fontWeight:500,color:'rgba(255,245,220,0.94)',fontFamily:"'Fraunces',serif",lineHeight:1.2}}>{segment.name}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.72)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:2}}>{`${segment.nights}n`} · {segment.type} · {fmt(segment.budget)}</div>
            </div>
          </>
        ):(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',gap:16,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flex:'1 1 220px',minWidth:0,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>
              <span onClick={onBackToExpedition||onBack} style={{color:'rgba(255,255,255,0.35)',cursor:'pointer',flexShrink:0,fontSize:14}}>←</span>
              <span onClick={onBackToExpedition||onBack} style={{color:'rgba(255,255,255,0.45)',cursor:'pointer',letterSpacing:1.5,fontSize:12,whiteSpace:'nowrap'}}>EXPEDITION</span>
              <span style={{color:'rgba(255,255,255,0.25)',flexShrink:0}}>›</span>
              <span onClick={onBack} style={{color:'rgba(255,255,255,0.45)',cursor:'pointer',letterSpacing:1.5,fontSize:12,whiteSpace:'nowrap'}}>{phaseLabelName.toUpperCase()}</span>
              <span style={{color:'rgba(255,255,255,0.25)',flexShrink:0}}>›</span>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:400,color:'rgba(255,255,255,0.90)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0}}>{segment.name}</span>
            </div>
            <div style={{display:'flex',alignItems:'stretch',gap:2,border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,overflow:'hidden',background:'rgba(0,8,24,0.45)',flexShrink:0,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)'}}>
              <div style={{padding:'8px 14px',textAlign:'center',minWidth:76}}>
                <div style={{fontSize:10,letterSpacing:1.5,color:'rgba(255,255,255,0.45)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,marginBottom:3}}>NIGHTS</div>
                <div style={{fontSize:15,fontWeight:600,color:'#F8F5F0',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",lineHeight:1.15}}>{segment.nights}</div>
              </div>
              <div style={{borderLeft:'1px solid rgba(255,255,255,0.08)',padding:'8px 14px',textAlign:'center',minWidth:88,maxWidth:150}}>
                <div style={{fontSize:10,letterSpacing:1.5,color:'rgba(255,255,255,0.45)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,marginBottom:3}}>STYLE</div>
                <div style={{fontSize:15,fontWeight:600,color:'#F8F5F0',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",lineHeight:1.15,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={segment.type}>{segment.type}</div>
              </div>
              <div style={{borderLeft:'1px solid rgba(255,255,255,0.08)',padding:'8px 14px',textAlign:'center',minWidth:88}}>
                <div style={{fontSize:10,letterSpacing:1.5,color:'rgba(255,255,255,0.45)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,marginBottom:3}}>BUDGET</div>
                <div style={{fontSize:15,fontWeight:600,color:'#D4AF37',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",lineHeight:1.15}}>{fmt(segment.budget)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Tab bar */}
      <div style={{display:'flex',justifyContent:'center',background:'rgba(0,4,12,0.92)',borderBottom:'1px solid rgba(255,255,255,0.08)',position:'sticky',top:isMobile?72:72,zIndex:9,borderBottomLeftRadius:segWorkspaceHdrR,borderBottomRightRadius:segWorkspaceHdrR,overflow:'hidden'}}>
        {TABS.map(t=>{const on=tab===t.id;return(
          <button type="button" key={t.id} onClick={()=>setTab(t.id)} style={{flex:isMobile?1:undefined,minWidth:isMobile?0:undefined,padding:isMobile?'10px 2px':'10px 16px',background:'none',border:'none',borderBottom:on?'2px solid #FF9F43':'2px solid transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,transition:'all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)',overflow:'hidden',opacity:on?1:0.75,transform:on?'scale(1.05)':'scale(1)'}}>
            <span style={{fontSize:isMobile?20:20,lineHeight:1}}>{t.icon}</span>
            {!isMobile&&<span style={{fontSize:13,fontWeight:600,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:on?'#FF9F43':'rgba(255,255,255,0.45)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{t.label}{t.count>0?` (${t.count})`:""}</span>}
            {isMobile&&t.count>0&&<span style={{fontSize:9,fontWeight:600,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:on?'#FF9F43':'rgba(255,255,255,0.45)'}}>{t.count}</span>}
          </button>
        );})}
        {saveFlash&&<div style={{position:'absolute',right:8,top:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:'#69F0AE',opacity:0.80,letterSpacing:1,pointerEvents:'none'}}>✓ saved</div>}
      </div>
      {/* Tab content — visited tabs stay mounted; visibility toggles (Session 51H) */}
      <div style={{border:segMobileLoose?'none':'1.5px solid rgba(255,255,255,0.10)',borderRadius:segWorkspaceHdrR,background:'rgba(0,8,20,0.85)',padding:segMobileLoose?'10px 10px':'16px 14px',margin:segMobileLoose?'6px 0':'12px 0',minHeight:300,textAlign:'left',animation:'tabFadeIn 400ms cubic-bezier(0.25,0.46,0.45,0.94)',overflow:'hidden'}}>
        {(tab==="transport"||tab==="stay"||tab==="activities"||tab==="food")&&!!segmentCardDateHeader&&<div style={{textAlign:'center',margin:segMobileLoose?'0 0 10px':'0 0 14px',padding:segMobileLoose?'0 0 10px':'0 8px 12px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{fontSize:isMobile?13:14,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.52)',letterSpacing:0.35,lineHeight:1.52}}>{segmentCardDateHeader}</div>
        </div>}
        {/* TRANSPORT */}
        {visitedTabs.has("transport")&&<div style={{display:tab==="transport"?"block":"none",padding:0}}>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10,paddingRight:2}}>
            <HelpTip compact noLeadingMargin text="Plan your transport to this destination — use the Co-Architect's suggestion or build your own route with flights, ferries, or ground transport" />
          </div>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'none',borderRadius:12,background:'transparent',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1,lineHeight:1.45}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.transport&&!isDism('transport')&&(!hideTransportSuggestion||transportRouteInPlace)&&<div ref={transportSuggestionRef} style={transportRouteInPlace?{border:planCommitCardBorder,borderRadius:planCommitCardRadius,background:planCommitCardBg,padding:planCommitCardPad,marginBottom:14,display:'flex',flexDirection:'column'}:{...suggestionCardStyle,background:'transparent',boxShadow:'none',border:'none'}}>
            {transportRouteInPlace?<>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <span style={{...planCommitLabelStyle,flex:1}}>✈️ TRAVEL</span>
              <button type="button" onClick={()=>{setBookDropdown(bookDropdown==='transport'?null:'transport');}} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button type="button" onClick={()=>setEditingTransport(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>{editingTransport?'DONE':'EDIT'}</button>
              <button type="button" onClick={clearTransport} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',cursor:'pointer',minHeight:28}}>✕</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.transport.from&&det.transport.to?`${det.transport.from} → ${det.transport.to}`:det.transport.mode||"Route"}</div>
            {!!travelSummaryDateLine&&<div style={{fontSize:14,color:'rgba(255,255,255,0.78)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4,lineHeight:1.5}}>{travelSummaryDateLine}</div>}
            {transportCostModeParts.length>0&&<div style={{fontSize:14,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:8,lineHeight:1.45}}>{transportCostModeParts.join(' · ')}</div>}
            <div style={savedCheckStyle}>✓ Route added to your plan.</div>
            <div style={{...savedSubStyle,display:'block'}}>Booking links and confirmation details can be added anytime.</div>
            {det.transport.notes&&!editingTransport&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:'rgba(255,255,255,0.60)',marginTop:8,lineHeight:1.52,whiteSpace:'pre-line'}}>{det.transport.notes.length>120?det.transport.notes.slice(0,120)+'...':det.transport.notes}</div>}
            {det.transport.link&&<a href={det.transport.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.transport.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
            {!editingTransport&&suggestion?.transport&&<CollapsibleSuggestion summaryCard confirmMessage="Replace your saved transport with this Co-Architect suggestion?" onSwitchToSuggestion={()=>acceptTransport(suggestion.transport)}>
              <div style={suggestionHeaderReadable}>✦ CO-ARCHITECT SUGGESTION</div>
              <div style={{fontSize:14,fontWeight:600,color:'#c9a04c',marginBottom:6,lineHeight:1.48,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>Est. {suggestion.transport.estimatedCost} · {suggestion.transport.duration||""}</div>
              {suggestion.transport.route?<div style={{fontSize:13,color:'rgba(255,255,255,0.50)',lineHeight:1.52,marginBottom:8,whiteSpace:'pre-wrap'}}>{suggestion.transport.route}</div>:null}
              <div style={disclaimerReadable}>⚡ Estimates based on current market rates — actual prices vary when booked</div>
            </CollapsibleSuggestion>}
            {!editingTransport&&<div style={committedFooterWrapStyle}><div style={planCommitAddedLineStyle}>{addedToPlanLine('transport')}</div><div style={returnToLogFooterStyle}>{returnToLogCopy('Travel')}</div></div>}
            </>:<>
            <div style={{fontSize:10,color:'rgba(201,160,76,0.9)',letterSpacing:2,marginBottom:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>SUGGESTED ROUTE</div>
            <div style={suggestionHeaderReadable}>✦ CO-ARCHITECT SUGGESTION</div>
            <div style={{fontSize:14,fontWeight:700,color:'#c9a04c',marginBottom:8,lineHeight:1.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>
              This leg: {plannedLegFrom} → {plannedLegTo}
              <span style={{color:'rgba(255,245,220,0.45)',fontWeight:600}}> · </span>
              Est. {suggestion.transport.estimatedCost}
            </div>
            {suggestion.transport.route?<div style={{fontSize:14,color:'rgba(255,255,255,0.36)',lineHeight:1.58,marginBottom:6,whiteSpace:'pre-wrap'}}>{suggestion.transport.route}</div>:null}
            <div style={{fontSize:14,color:'rgba(255,255,255,0.75)',marginBottom:4,lineHeight:1.45}}>{suggestion.transport.duration}</div>
            <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.42)',lineHeight:1.52,marginBottom:6}}>{transportSuggestionEstimateHint({prevCity,segmentName:segment.name})}</div>
            {suggestion.transport.bestTiming&&<div style={{fontSize:14,color:'rgba(255,255,255,0.75)',marginBottom:4,lineHeight:1.45}}>{suggestion.transport.bestTiming}</div>}
            {suggestion.transport.notes&&<div style={{fontSize:14,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12,lineHeight:1.5}}>{suggestion.transport.notes}</div>}
            <div style={disclaimerReadable}>⚡ Estimates based on current market rates — actual prices vary when booked</div>
            <div style={{display:'flex',gap:8}}>
              <button type="button" onClick={()=>acceptTransport(suggestion.transport)} style={{...acceptBtnStyle,width:'100%'}}>USE THIS ROUTE</button>
            </div>
            </>}
          </div>}
          {transportLegLocked&&!transportRouteInPlace&&<div ref={transportCommittedRef} style={{border:planCommitCardBorder,borderRadius:planCommitCardRadius,background:planCommitCardBg,padding:planCommitCardPad,marginBottom:14,display:'flex',flexDirection:'column'}}>
            <div style={{flex:1,minHeight:0}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <span style={{...planCommitLabelStyle,flex:1}}>✈️ TRAVEL</span>
              <button type="button" onClick={()=>{setBookDropdown(bookDropdown==='transport'?null:'transport');}} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button type="button" onClick={()=>setEditingTransport(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>{editingTransport?'DONE':'EDIT'}</button>
              <button type="button" onClick={clearTransport} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',cursor:'pointer',minHeight:28}}>✕</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.transport.from&&det.transport.to?`${det.transport.from} → ${det.transport.to}`:det.transport.mode||"Transport"}</div>
            {!!travelSummaryDateLine&&<div style={{fontSize:14,color:'rgba(255,255,255,0.78)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4,lineHeight:1.5}}>{travelSummaryDateLine}</div>}
            {transportCostModeParts.length>0&&<div style={{fontSize:14,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4,lineHeight:1.45}}>{transportCostModeParts.join(' · ')}</div>}
            <div style={savedCheckStyle}>✓ Route added to your plan.</div>
            <div style={{...savedSubStyle,display:'block'}}>Booking links and confirmation details can be added anytime.</div>
            {det.transport.notes&&!editingTransport&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:'rgba(255,255,255,0.60)',marginTop:6,lineHeight:1.52,whiteSpace:'pre-line'}}>{det.transport.notes.length>120?det.transport.notes.slice(0,120)+'...':det.transport.notes}</div>}
            {det.transport.link&&<a href={det.transport.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.transport.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
            </div>
            {!editingTransport&&suggestion?.transport&&<CollapsibleSuggestion summaryCard confirmMessage="Replace your saved transport with this Co-Architect suggestion?" onSwitchToSuggestion={()=>acceptTransport(suggestion.transport)}>
              <div style={suggestionHeaderReadable}>✦ CO-ARCHITECT SUGGESTION</div>
              <div style={{fontSize:14,fontWeight:600,color:'#c9a04c',marginBottom:6,lineHeight:1.48,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>Est. {suggestion.transport.estimatedCost} · {suggestion.transport.duration||""}</div>
              {suggestion.transport.route?<div style={{fontSize:13,color:'rgba(255,255,255,0.50)',lineHeight:1.52,marginBottom:8,whiteSpace:'pre-wrap'}}>{suggestion.transport.route}</div>:null}
              <div style={disclaimerReadable}>⚡ Estimates based on current market rates — actual prices vary when booked</div>
            </CollapsibleSuggestion>}
            {!editingTransport&&<div style={committedFooterWrapStyle}><div style={planCommitAddedLineStyle}>{addedToPlanLine('transport')}</div><div style={returnToLogFooterStyle}>{returnToLogCopy('Travel')}</div></div>}
          </div>}
          {bookDropdown==='transport'&&<div style={{position:'relative',zIndex:100,marginBottom:10}}><div style={{background:'rgba(0,8,20,0.95)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:8,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.60)',letterSpacing:2,padding:'4px 14px'}}>SEARCH FLIGHTS</div>
            {[{n:'Google Flights',u:`https://www.google.com/travel/flights?q=${encodeURIComponent((det.transport.from||'')+' to '+(det.transport.to||''))}`},{n:'Skyscanner',u:'https://www.skyscanner.com'},{n:'Kayak',u:'https://www.kayak.com/flights'},{n:'Rome2rio',u:`https://www.rome2rio.com/map/${encodeURIComponent(det.transport.from||'')}/${encodeURIComponent(det.transport.to||'')}`}].map(l=><a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer" onClick={()=>setBookDropdown(null)} style={{display:'block',padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.75)',borderRadius:8,cursor:'pointer',textDecoration:'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{l.n}</a>)}
          </div></div>}
          {transportLegLocked&&editingTransport&&<div style={{border:'none',borderRadius:12,background:'transparent',padding:16,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
            </div>
            {transportFromToGrid(false)}
            {transportDateTimeGrid}
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.transport.link||""} onChange={v=>uT("link",v)} placeholder="https://..." accent="#00E5FF"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="e.g. 1) Flight AA… 2) Shuttle to pier 3) Utila ferry — refs & costs per leg" accent="#00E5FF" multiline/></div>
            <button type="button" onClick={()=>setEditingTransport(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(0,229,255,0.12)',color:'#00E5FF',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
          </div>}
          {needsTravelManualToggle&&<button type="button" onClick={()=>setTravelManualOpen(o=>!o)} style={{width:'100%',textAlign:'left',background:'transparent',border:'1px solid rgba(0,229,255,0.35)',borderRadius:10,color:'rgba(0,229,255,0.85)',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,padding:'10px 14px',cursor:'pointer',marginBottom:10,minHeight:44}}>{travelManualOpen||planningOwn?'⌄ Hide manual route':'+ Plan your own route'}</button>}
          {showTravelManualInner&&<div>
            {!(suggestion?.transport&&!isDism('transport'))&&!suggestionsLoading&&<div style={{textAlign:'center',padding:'24px 0 20px'}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.40)',marginBottom:12}}>No transport planned yet.</div></div>}
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
            </div>
            {transportFromToGrid(true)}
            {(transportEstLoading||transportEst)&&<div style={{padding:'8px 12px',marginTop:8,borderRadius:8,background:'transparent',border:'none',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:6}}>
              {transportEstLoading?<span style={{fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.60)',letterSpacing:1,lineHeight:1.45}}>✦ Estimating...</span>
              :transportEst&&<span style={{fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:0.5,lineHeight:1.52}}>
                ✦ Est. {transportEst.estimate}{transportEst.note?` — ${transportEst.note}`:""}{" "}
                <button type="button" onClick={()=>{const d=parseTransportEstimateToCostDigits(transportEst.estimate);if(d)uT("cost",d);}} style={{background:'none',border:'none',padding:0,color:'#FF9F43',textDecoration:'underline',cursor:'pointer',fontSize:'inherit',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600}}>use</button>
                <span style={{display:'block',fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:4,fontWeight:400,lineHeight:1.45}}>Fills low end of a range into cost (adjust if you book mid/high).</span>
              </span>}
            </div>}
            <div style={{fontSize:12,color:'rgba(255,255,255,0.38)',lineHeight:1.58,marginTop:6,marginBottom:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>
              More than one hop (flight + bus + ferry)? Use <span style={{color:'rgba(0,229,255,0.72)'}}>NOTES</span> to list each leg, times, and refs; <span style={{color:'rgba(0,229,255,0.72)'}}>BOOKING LINK</span> for your main ticket or a trip folder. <span style={{color:'rgba(255,255,255,0.28)'}}>ACTIVITIES</span> is for things you do at this stop, not airport transfers.
            </div>
            {transportDateTimeGrid}
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.transport.link||""} onChange={v=>uT("link",v)} placeholder="https://..." accent="#00E5FF"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="e.g. 1) Flight AA… 2) Shuttle to pier 3) Utila ferry — refs & costs per leg" accent="#00E5FF" multiline/></div>
            {(()=>{const ready=!isRowEmpty(det.transport?.from)&&!isRowEmpty(det.transport?.to);return <button type="button" disabled={!ready} onClick={saveManualTransport} style={{marginTop:12,width:'100%',padding:'12px',borderRadius:8,border:'1px solid '+(ready?'rgba(0,229,255,0.45)':'rgba(255,255,255,0.10)'),background:ready?'rgba(0,229,255,0.12)':'rgba(255,255,255,0.03)',color:ready?'#00E5FF':'rgba(255,255,255,0.30)',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1.5,cursor:ready?'pointer':'not-allowed',minHeight:44}}>SAVE TRANSPORT</button>;})()}
            {suggestion?.transport&&isDism('transport')&&<CollapsibleSuggestion>
              <div style={suggestionHeaderReadable}>✦ CO-ARCHITECT SUGGESTION</div>
              <div style={{fontSize:14,fontWeight:700,color:'#c9a04c',marginBottom:8,lineHeight:1.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>This leg: {plannedLegFrom} → {plannedLegTo}<span style={{color:'rgba(255,245,220,0.45)',fontWeight:600}}> · </span>Est. {suggestion.transport.estimatedCost}</div>
              {suggestion.transport.route?<div style={{fontSize:14,color:'rgba(255,255,255,0.36)',lineHeight:1.58,marginBottom:6,whiteSpace:'pre-wrap'}}>{suggestion.transport.route}</div>:null}
              <div style={{fontSize:14,color:'rgba(255,255,255,0.75)',marginBottom:4,lineHeight:1.45}}>{suggestion.transport.duration}</div>
              {suggestion.transport.notes&&<div style={{fontSize:14,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12,lineHeight:1.5}}>{suggestion.transport.notes}</div>}
              <div style={disclaimerReadable}>⚡ Estimates based on current market rates — actual prices vary when booked</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button type="button" onClick={()=>acceptTransport(suggestion.transport)} style={acceptBtnStyle}>USE THIS ROUTE</button>
                <button type="button" onClick={()=>{const nd={...dismissed};delete nd[`${dismissKey}_transport`];setDismissed(nd);saveDismissed(nd);setPlanningOwn(true);}} style={dismissBtnStyle}>SHOW SUGGESTION CARD</button>
              </div>
            </CollapsibleSuggestion>}
            <button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('openCA',{detail:{message:`Help me plan routing to ${segment.name||'this stop'} — transit options, timing, and what to watch for.`}}))} style={{background:'none',border:'none',padding:'10px 0 0',marginTop:4,cursor:'pointer',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(201,160,76,0.75)',textAlign:'left',width:'100%'}}>Not sure? Ask your Co-Architect for routing tips, transit options, and timing advice</button>
          </div>}
        </div>}
        {/* STAY — Session 53M: useTabSuggestions / GenericSuggestionCard only (no StaySuggestionExperienceCard) */}
        {visitedTabs.has("stay")&&<div style={{display:tab==="stay"?"block":"none",padding:0}}>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10,paddingRight:2}}>
            <HelpTip compact noLeadingMargin text="Find your accommodation for this stop — use the Co-Architect's suggestion or search for your own property" />
          </div>
          {showStayAccommodationCard&&stayInsightSavedIdx==null&&<div style={{border:planCommitCardBorder,borderRadius:planCommitCardRadius,background:planCommitCardBg,padding:planCommitCardPad,marginBottom:14,display:'flex',flexDirection:'column'}}>
            <div style={{flex:1,minHeight:0}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
              <span style={{...planCommitLabelStyle,flex:1}}>🏨 ACCOMMODATION</span>
              <button type="button" title="Open booking link" onClick={()=>setBookDropdown(bookDropdown==='stay'?null:'stay')} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button type="button" title="Edit details" onClick={()=>setEditingStay(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>{editingStay?'DONE':'EDIT'}</button>
              <button type="button" title="Remove from plan" onClick={clearStayPlan} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',cursor:'pointer',minHeight:28}}>✕</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.stay.name}</div>
            {det.stay.cost&&<div style={{fontSize:13,color:'#c9a04c',fontWeight:600,marginBottom:4}}>Est. ${det.stay.cost}</div>}
            {det.stay.notes&&!editingStay&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.75)',marginBottom:8,marginTop:4,lineHeight:1.6}}>{(()=>{const n=sanitizeAiDisplayText(det.stay.notes);const first=(n.split(/\n/)[0]||"").trim();return first.length>200?first.slice(0,200)+'…':first;})()}</div>}
            {det.stay.checkin&&det.stay.checkout&&<div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:det.stay.link?6:0}}><span style={{fontStyle:'italic',color:'rgba(255,159,67,0.60)',fontSize:12}}>{fD(det.stay.checkin)} – {fD(det.stay.checkout)}</span><span style={{color:'#c9a04c'}}>· {segment.nights} nights</span></div>}
            {det.stay.link&&<a href={det.stay.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.stay.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
            {!editingStay&&<div style={committedFooterWrapStyle}><div style={planCommitAddedLineStyle}>{addedToPlanLine('stay')}</div><div style={returnToLogFooterStyle}>{returnToLogCopy('Stay')}</div></div>}
            </div>
          </div>}
          {bookDropdown==='stay'&&<div style={{position:'relative',zIndex:100,marginBottom:10}}><div style={{background:'rgba(0,8,20,0.95)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:8,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.30)',letterSpacing:2,padding:'4px 14px',lineHeight:1.4}}>SEARCH STAYS</div>
            {[{n:'Booking.com',u:`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(segment.name)}`},{n:'Airbnb',u:`https://www.airbnb.com/s/${encodeURIComponent(segment.name)}/homes`},{n:'Hotels.com',u:`https://www.hotels.com/search.do?q-destination=${encodeURIComponent(segment.name)}`},{n:'Hostelworld',u:`https://www.hostelworld.com/search?search_keywords=${encodeURIComponent(segment.name)}`}].map(l=><a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer" onClick={()=>setBookDropdown(null)} style={{display:'block',padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.75)',borderRadius:8,cursor:'pointer',textDecoration:'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{l.n}</a>)}
          </div></div>}
          {(!showStayAccommodationCard||stayInsightSavedIdx!=null)&&(
            <SuggestionPhotoDedupProvider>
            <>
              {!suggestionsLoading&&<button type="button" onClick={()=>window.dispatchEvent(new CustomEvent("openCA",{detail:{message:`I want more stay options in ${dest} — boutique, budget, or something specific.`}}))} style={caReminderStyle}>Want different options? Your Co-Architect can find them</button>}
              {stayInsight.loading&&<SuggestionShimmer message={`Finding the best stays in ${dest||"this destination"}...`}/>}
              {!stayInsight.loading&&stayInsight.items.length>0&&(()=>{
                const stayItems=stayInsight.items.slice(0,3);
                const stayInsightToolbar=(
                  <div style={{display:'flex',alignItems:'center',marginBottom:0}}>
                    <button type="button" title="Open booking link" onClick={()=>setBookDropdown(bookDropdown==='stay'?null:'stay')} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
                    <button type="button" title={showStayBookingForm?"Close booking form":"Book or edit stay details"} onClick={()=>setShowStayBookingForm(o=>!o)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>{showStayBookingForm?"CLOSE":"BOOK"}</button>
                    <button type="button" title="Remove from plan" onClick={clearStayPlan} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',cursor:'pointer',minHeight:28}}>✕</button>
                  </div>
                );
                return(
                  <>
                    {stayInsightSavedIdx!=null&&stayItems[stayInsightSavedIdx]&&(
                      <GenericSuggestionCard key="stay-pinned" item={{...stayItems[stayInsightSavedIdx],category:"🏨 ACCOMMODATION"}} destination={dest} country={destCountry} instanceId="stay-tab-pinned" photoPageIndex={stayInsightSavedIdx} accent="#69F0AE" variant="expand" isMobile={isMobile} warmLine={stayItems[stayInsightSavedIdx].name?`Great choice. ${stayItems[stayInsightSavedIdx].name} puts you right in the heart of ${dest}.`:undefined} savedCheckStyle={savedCheckStyle} savedSubStyle={savedSubStyle} savedCheckText="✓ Stay added to your plan." savedSubText="Locked in — dates, links, and notes live here whenever you want to refine them." footerSlot={null} inPlaceSaved={true} committedToolbar={stayInsightToolbar} onAddToPlan={()=>{}}/>
                    )}
                    {stayInsightSavedIdx!=null&&showStayBookingForm&&(
                      <div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
                        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
                          <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
                          <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
                        </div>
                        <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:10,marginTop:10,overflow:'hidden'}}>
                          <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
                          <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
                        </div>
                        <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/></div>
                        <div style={{marginTop:8}}><SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/></div>
                        <button type="button" onClick={()=>setShowStayBookingForm(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(105,240,174,0.12)',color:'#69F0AE',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
                      </div>
                    )}
                    {stayItems.map((it,idx)=>{
                      if(stayInsightSavedIdx===idx)return null;
                      return(
                        <GenericSuggestionCard key={`stay-insight-${idx}-${String(it.name).slice(0,24)}`} item={it} destination={dest} country={destCountry} instanceId={`stay-tab-${idx}`} photoPageIndex={idx} accent="#69F0AE" variant="expand" isMobile={isMobile} warmLine={it.name?`Great choice. ${it.name} puts you right in the heart of ${dest}.`:undefined} savedCheckStyle={savedCheckStyle} savedSubStyle={savedSubStyle} savedCheckText="✓ Stay added to your plan." savedSubText="Locked in — dates, links, and notes live here whenever you want to refine them." footerSlot={null} inPlaceSaved={false} committedToolbar={null} onAddToPlan={()=>{const cost=parsePriceDigits(String(it.price));uS("name",it.name);if(cost)uS("cost",cost);if(segment.arrival&&!det.stay.checkin)uS("checkin",segment.arrival);if(segment.departure&&!det.stay.checkout)uS("checkout",segment.departure);uS("notes",it.description||"");setStayInsightSavedIdx(idx);setShowStayBookingForm(false);}}/>
                      );
                    })}
                  </>
                );
              })()}
              {!stayInsight.loading&&stayInsight.error&&<div style={{fontSize:12,color:"rgba(255,107,107,0.85)",marginBottom:10}}>{stayInsight.error}</div>}
              {stayInsightSavedIdx!=null&&<button type="button" onClick={()=>setStayManualOpen(o=>!o)} style={{width:'100%',textAlign:'left',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(201,160,76,0.35)',borderRadius:10,color:'#c9a04c',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,padding:'10px 14px',cursor:'pointer',marginTop:8,marginBottom:4,minHeight:44}}>+ Add another stay</button>}
            </>
            </SuggestionPhotoDedupProvider>
          )}
          {showStayAccommodationCard&&editingStay&&<div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:10,marginTop:10,overflow:'hidden'}}>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/></div>
            <button type="button" onClick={()=>setEditingStay(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(105,240,174,0.12)',color:'#69F0AE',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
          </div>}
          {(stayManualOpen||planningOwnStay)&&(stayInsightSavedIdx!=null||!showStayAccommodationCard)&&<>
            {stayInsightSavedIdx==null&&<button type="button" onClick={()=>setStayManualOpen(o=>!o)} style={{width:'100%',textAlign:'left',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(201,160,76,0.35)',borderRadius:10,color:'#c9a04c',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,padding:'10px 14px',cursor:'pointer',marginBottom:10,minHeight:44}}>{stayManualOpen||planningOwnStay?'⌄ Hide manual booking':'+ Plan your own stay'}</button>}
            {(stayManualOpen||planningOwnStay)&&<div onFocus={()=>setStayFocused(true)} onBlur={(e)=>{if(!e.currentTarget.contains(e.relatedTarget))setStayFocused(false);}}>
            <div style={{textAlign:'center',padding:'24px 0 20px'}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.40)',marginBottom:12}}>No accommodation planned yet.</div></div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:10,marginTop:10,overflow:'hidden'}}>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/></div>
            {!showStayAccommodationCard&&(hasS||hasStaySecondaryField)&&<div style={{marginTop:12}}>
              <button type="button" onClick={()=>{if(typeof document!=="undefined")document.activeElement?.blur();setStayFocused(false);}} style={{padding:'8px 14px',borderRadius:6,border:'1px solid rgba(255,159,67,0.30)',background:'none',color:'rgba(255,159,67,0.70)',fontSize:12,cursor:'pointer',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:600,whiteSpace:'nowrap',height:34}}>SAVE</button>
            </div>}
          </div>}
          </>}
        </div>}
        {/* ACTIVITIES */}
        {visitedTabs.has("activities")&&<div style={{display:tab==="activities"?"block":"none",padding:0}}>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10,paddingRight:2}}>
            <HelpTip compact noLeadingMargin text="Curated activities and experiences for this destination — add them to your plan or skip to move on" />
          </div>
          {!suggestionsLoading&&<button type="button" onClick={()=>window.dispatchEvent(new CustomEvent("openCA",{detail:{message:`What are some hidden gems and local favorites in ${dest}?`}}))} style={caReminderStyle}>Your Co-Architect knows {dest} well — ask for hidden gems</button>}
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1,lineHeight:1.45}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          <SuggestionPhotoDedupProvider>
          {actInsight.loading&&<SuggestionShimmer message={`Curating experiences in ${dest||"this destination"}...`}/>}
          {!actInsight.loading&&actInsight.items.length>0&&(()=>{
            const actItems=actInsight.items.slice(0,3);
            const makeActToolbar=(savedIdx)=>{
              const row=det.activities.find(x=>x.actInsightIdx===savedIdx);
              const nm=actItems[savedIdx]?.name||"";
              return(
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <a href={`https://www.viator.com/search/${encodeURIComponent(segment.name+' '+nm)}`} target="_blank" rel="noopener noreferrer" title="Open booking link" style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',textDecoration:'none',minHeight:28,display:'flex',alignItems:'center'}}>🔗</a>
                  <button type="button" title={editingActIdx===savedIdx?"Close":"Book or edit activity"} onClick={()=>setEditingActIdx(prev=>prev===savedIdx?null:savedIdx)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28}}>{editingActIdx===savedIdx?"CLOSE":"BOOK"}</button>
                  <button type="button" title="Remove from plan" onClick={()=>{setActInsightSavedIdxs(prev=>prev.filter(i=>i!==savedIdx));if(editingActIdx===savedIdx)setEditingActIdx(null);if(row)setDet(d=>({...d,activities:d.activities.filter(x=>x.id!==row.id)}));}} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',cursor:'pointer',minHeight:28}}>✕</button>
                </div>
              );
            };
            return(
              <>
                {actInsightSavedIdxs.map(savedIdx=>{
                  const act=actItems[savedIdx];
                  if(!act)return null;
                  const costRaw=String(act.price||"");
                  const priceDisp=costRaw&&String(costRaw).trim()?`Est. $${String(costRaw).replace(/^\$/,"").replace(/[^\d.]/g,"")||costRaw}`:"\u2014";
                  const actItem={name:act.name||"Activity",category:"⚡ ACTIVITY",description:(act.description||"").trim(),price:priceDisp,rating:null,address:null};
                  return(
                    <div key={`act-pinned-wrap-${savedIdx}`}>
                    <GenericSuggestionCard item={actItem} destination={dest} country={destCountry} instanceId={`act-pin-${savedIdx}`} photoPageIndex={savedIdx} accent="#c9a04c" variant="expand" isMobile={isMobile} subtitle={(act.category||"").trim()||undefined} photoQueryOverride={(act.name||"Activity")==="Activity"?"sightseeing":act.name} warmLine={act.name?`Great choice. ${act.name} is one of the best ways to experience ${dest}.`:undefined} savedCheckStyle={savedCheckStyle} savedSubStyle={savedSubStyle} savedCheckText="\u2713 Activity added to your plan." savedSubText="Come back to this Activities tab anytime to add bookings or confirmed details." footerSlot={null} inPlaceSaved={true} committedToolbar={makeActToolbar(savedIdx)} onAddToPlan={()=>{}}/>
                    {editingActIdx===savedIdx&&(
                      <div style={{border:isMobile?'none':'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:isMobile?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.04)',padding:isMobile?'12px 10px':16,marginTop:4,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
                        <div style={{fontSize:12,color:'rgba(201,160,76,0.60)',letterSpacing:2,marginBottom:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>BOOKING DETAILS</div>
                        <SDF label="ACTIVITY NAME" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#c9a04c"/>
                        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:8,marginTop:8,overflow:'hidden'}}>
                          <SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#c9a04c"/>
                          <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#c9a04c"/>
                        </div>
                        <div style={{marginTop:8}}><SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://..." accent="#c9a04c"/></div>
                        <div style={{marginTop:8}}><SDF label="NOTES" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Tips, what to bring..." accent="#c9a04c" multiline/></div>
                        <button type="button" onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:d.activities.map(a=>a.actInsightIdx===savedIdx?{...a,name:nAct.name,date:nAct.date,cost:nAct.cost,link:nAct.link,notes:nAct.transit}:a)}));setEditingActIdx(null);}} style={{marginTop:12,padding:'12px 20px',borderRadius:10,border:'none',background:nAct.name?'linear-gradient(135deg,rgba(255,159,67,0.25),rgba(201,160,76,0.15))':'rgba(255,255,255,0.04)',color:nAct.name?'#c9a04c':'rgba(255,255,255,0.20)',fontSize:12,cursor:nAct.name?'pointer':'default',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,fontWeight:700,width:'100%',minHeight:44}}>SAVE</button>
                      </div>
                    )}
                    </div>
                  );
                })}
                {actItems.map((it,idx)=>{
                  if(actInsightSavedIdxs.includes(idx))return null;
                  return(
                    <GenericSuggestionCard key={`act-insight-${idx}-${String(it.name).slice(0,24)}`} item={it} destination={dest} country={destCountry} instanceId={`act-tab-${idx}`} photoPageIndex={idx} accent="#c9a04c" variant="expand" isMobile={isMobile} warmLine={it.name?`Great choice. ${it.name} is one of the best ways to experience ${dest}.`:undefined} savedCheckStyle={savedCheckStyle} savedSubStyle={savedSubStyle} savedCheckText="\u2713 Activity added to your plan." savedSubText="Come back to this Activities tab anytime to add bookings or confirmed details." footerSlot={null} inPlaceSaved={false} committedToolbar={null} onAddToPlan={()=>{acceptActivity({name:it.name,notes:it.description,estimatedCost:String(it.price),provider:it.category},null,idx);setActInsightSavedIdxs(prev=>prev.includes(idx)?prev:[...prev,idx]);setEditingActIdx(null);}}/>
                  );
                })}
              </>
            );
          })()}
          </SuggestionPhotoDedupProvider>
          {!actInsight.loading&&actInsight.error&&<div style={{fontSize:12,color:"rgba(255,107,107,0.85)",marginBottom:10}}>{actInsight.error}</div>}
          {det.activities.filter(a=>!(a.actInsightIdx!=null&&actInsightSavedIdxs.includes(a.actInsightIdx))&&(a.suggestionActivityIdx==null||!suggestion?.activities?.[a.suggestionActivityIdx])).length>0&&<div style={{marginBottom:16}}>
            {det.activities.filter(a=>!(a.actInsightIdx!=null&&actInsightSavedIdxs.includes(a.actInsightIdx))&&(a.suggestionActivityIdx==null||!suggestion?.activities?.[a.suggestionActivityIdx])).map(a=>(
              <div key={a.id} style={{border:planCommitCardBorder,borderRadius:planCommitCardRadius,background:planCommitCardBg,padding:planCommitCardPad,marginBottom:14,display:'flex',flexDirection:'column'}}>
                <div style={{flex:1,minHeight:0}}>
                <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
                  <span style={{...planCommitLabelStyle,flex:1}}>⚡ ACTIVITY</span>
                  <a href={`https://www.viator.com/search/${encodeURIComponent(segment.name+' '+a.name)}`} target="_blank" rel="noopener noreferrer" title="Open booking link" style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',textDecoration:'none',minHeight:28,display:'flex',alignItems:'center',marginRight:6}}>🔗</a>
                  <button type="button" title="Edit details" onClick={()=>setActivitiesManualOpen(true)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>EDIT</button>
                  <button type="button" title="Remove from plan" onClick={()=>{
                    const removed=a;
                    setDet(d=>({...d,activities:d.activities.filter(x=>x.id!==removed.id)}));
                    if(removed.actInsightIdx!=null)setActInsightSavedIdxs(prev=>prev.filter(i=>i!==removed.actInsightIdx));
                    if(suggestion?.activities?.length){
                      setDismissed(d0=>{
                        const dd={...d0};
                        let ch=false;
                        suggestion.activities.forEach((sa,i)=>{
                          const key=`${dismissKey}_activity_${i}`;
                          if(!dd[key]) return;
                          if(removed.suggestionActivityIdx===i){delete dd[key];ch=true;}
                          else if(removed.suggestionActivityIdx==null&&(removed.name||"").trim().toLowerCase()===(sa.name||"").trim().toLowerCase()){delete dd[key];ch=true;}
                        });
                        if(ch) saveDismissed(dd);
                        return ch?dd:d0;
                      });
                    }
                  }} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',cursor:'pointer',minHeight:28}}>✕</button>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{a.name}</div>
                {a.provider&&<div style={{fontSize:12,color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{a.provider}</div>}
                {a.brief&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.75)',marginBottom:8,marginTop:4,lineHeight:1.6}}>{a.brief}</div>}
                <div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",display:'flex',gap:8,flexWrap:'wrap',marginBottom:a.tip||a.link?6:0}}>
                  {a.date?<span>{fD(a.date)}</span>:segment.arrival&&<span style={{fontStyle:'italic',color:'rgba(255,159,67,0.60)',fontSize:12}}>within {fD(segment.arrival)}–{fD(segment.departure)}</span>}{a.cost&&<span style={{color:'#c9a04c'}}>Est. ${a.cost}</span>}
                </div>
                {a.tip&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,color:'rgba(255,255,255,0.60)',lineHeight:1.5,marginTop:4}}>💡 {a.tip}</div>}
                {a.link&&<a href={a.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:6}}>{a.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
                </div>
                <div style={committedFooterWrapStyle}><div style={planCommitAddedLineStyle}>{addedToPlanLine('activities')}</div><div style={returnToLogFooterStyle}>{returnToLogCopy('Activities')}</div></div>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'4px 2px'}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>TOTAL</span>
              <span style={{fontSize:14,fontWeight:600,color:'rgba(201,160,76,0.85)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>${det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}</span>
            </div>
          </div>}
          {det.activities.filter(a=>!(a.actInsightIdx!=null&&actInsightSavedIdxs.includes(a.actInsightIdx))&&(a.suggestionActivityIdx==null||!suggestion?.activities?.[a.suggestionActivityIdx])).length===0&&!actInsight.loading&&actInsight.items.length===0&&!suggestionsLoading&&<div style={{textAlign:'center',padding:'24px 0 16px'}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontStyle:'italic',color:'rgba(201,160,76,0.40)'}}>No activities planned yet — dives, tours, day trips</div></div>}
          {caFromArch.length>0&&<div style={{marginBottom:16}}>
            <div style={{...suggestionHeaderReadable,marginBottom:10}}>✦ FROM YOUR CO-ARCHITECT CONVERSATION</div>
            {caFromArch.map((a,idx)=>{
              const actName=a.name||a.title||"";
              return(
                <ActivitySuggestionExperienceCard key={`ca-act-${idx}-${String(actName).slice(0,32)}`} segmentName={dest} segmentCountry={destCountry} photoInstanceId={`ca-act-${idx}`} activity={{name:actName,notes:a.notes||a.brief||"",estimatedCost:a.estimatedCost||a.cost,provider:a.provider||""}} isMobile={isMobile} onAdd={()=>acceptActivity({name:actName,notes:a.notes||a.brief||"",estimatedCost:a.estimatedCost||a.cost,provider:a.provider||""})} showSkip={false} acceptBtnStyle={acceptBtnStyle} dismissBtnStyle={dismissBtnStyle} disclaimerText="Mentioned in chat \u2014 add to your plan if it fits"/>
              );
            })}
          </div>}
          <button type="button" onClick={()=>setActivitiesManualOpen(o=>!o)} style={{width:'100%',textAlign:'left',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(201,160,76,0.35)',borderRadius:10,color:'#c9a04c',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,padding:'10px 14px',cursor:'pointer',marginTop:8,marginBottom:4,minHeight:44}}>{activitiesManualOpen?'⌄ Hide manual activity form':'+ Plan your own activity'}</button>
          {activitiesManualOpen&&<div style={{border:isMobile?'none':'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:isMobile?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.04)',padding:isMobile?'12px 10px':16,marginTop:4}}>
            <div style={{fontSize:12,color:'rgba(201,160,76,0.60)',letterSpacing:2,marginBottom:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>+ ADD ACTIVITY</div>
            <SDF label="ACTIVITY NAME" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#c9a04c"/>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:8,marginTop:8,overflow:'hidden'}}>
              <SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#c9a04c"/>
              <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#c9a04c"/>
            </div>
            <div style={{marginTop:8}}><SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://..." accent="#c9a04c"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Tips, what to bring..." accent="#c9a04c" multiline/></div>
            <button type="button" onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:[...d.activities,{...nAct,id:Date.now()}]}));setNAct({name:"",date:"",cost:"",transit:"",link:""});}} style={{marginTop:12,padding:'12px 20px',borderRadius:10,border:'none',background:nAct.name?'linear-gradient(135deg,rgba(255,159,67,0.25),rgba(201,160,76,0.15))':'rgba(255,255,255,0.04)',color:nAct.name?'#c9a04c':'rgba(255,255,255,0.20)',fontSize:12,cursor:nAct.name?'pointer':'default',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,fontWeight:700,width:'100%',minHeight:44}}>ADD TO PLAN</button>
          </div>}
          <div style={{marginTop:14}}><SDF label="ACTIVITY NOTES" value={det.actNotes||""} onChange={v=>setDet(d=>({...d,actNotes:v}))} placeholder="Tips, what to bring, dress code..." accent="#c9a04c" multiline/></div>
        </div>}
        {/* FOOD */}
        {visitedTabs.has("food")&&<div style={{display:tab==="food"?"block":"none"}}>{(()=>{const hasFood=!isRowEmpty(det.food?.dailyBudget);const showFoodSummary=hasFood&&!editingFood&&!foodFocused&&foodInsightSavedIdxs.length===0;const showFoodManualBase=!showFoodSummary&&foodInsightSavedIdxs.length===0&&!(suggestionsLoading&&!suggestion);const showFoodManualForm=(showFoodManualBase&&(foodManualOpen||editingFood))||(foodInsightSavedIdxs.length>0&&editingFood);return(<div style={{padding:0}} onFocus={()=>setFoodFocused(true)} onBlur={(e)=>{if(!e.currentTarget.contains(e.relatedTarget))setFoodFocused(false);}}>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10,paddingRight:2}}>
            <HelpTip compact noLeadingMargin text="Local dining recommendations and daily food budget estimates for this destination" />
          </div>
          {!suggestionsLoading&&<button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('openCA',{detail:{message:`I'm craving something specific in ${dest} — help me find the right spot.`}}))} style={caReminderStyle}>Craving something specific? Your Co-Architect can find it</button>}
          {showFoodSummary&&<div style={{border:planCommitCardBorder,borderRadius:planCommitCardRadius,background:planCommitCardBg,padding:planCommitCardPad,marginBottom:14,display:'flex',flexDirection:'column'}}>
            <div style={{flex:1,minHeight:0}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
              <span style={{...planCommitLabelStyle,flex:1}}>🍜 FOOD</span>
              <button type="button" title="Open booking links" onClick={()=>setBookDropdown(bookDropdown==='food'?null:'food')} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button type="button" title="Edit details" onClick={()=>setEditingFood(true)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>EDIT</button>
              <button type="button" title="Remove from plan" onClick={()=>{setDet(d=>({...d,food:{dailyBudget:"",notes:""}}));const nd={...dismissed};delete nd[`${dismissKey}_food`];setDismissed(nd);saveDismissed(nd);setFoodInsightSavedIdxs([]);setBookDropdown(b=>b==='food'?null:b);}} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',cursor:'pointer',minHeight:28}}>✕</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{(()=>{const t=(det.food.notes||"").split("\n")[0].trim();return t||"Daily dining budget";})()}</div>
            <div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",display:'flex',gap:8,flexWrap:'wrap',marginBottom:6}}>{(()=>{const fd=parseFloat(det.food.dailyBudget);const day=Number.isFinite(fd)?fd:0;const total=day*(segment.nights||0);return(<><span style={{color:'#c9a04c'}}>${det.food.dailyBudget}/day</span><span style={{color:'rgba(255,255,255,0.45)'}}>·</span><span>{segment.nights} nights</span><span style={{color:'rgba(255,255,255,0.45)'}}>·</span><span style={{color:'#c9a04c'}}>${total.toLocaleString()} total</span></>);})()}</div>
            {det.food.notes&&(()=>{const rest=(det.food.notes||"").split("\n").slice(1).join("\n").trim();return rest?<div style={{fontSize:12,color:'rgba(255,255,255,0.60)',marginTop:6,lineHeight:1.5,whiteSpace:'pre-line',fontStyle:'italic'}}>{rest.length>200?rest.slice(0,200)+'…':rest}</div>:null;})()}
            </div>
            {!editingFood&&<div style={committedFooterWrapStyle}><div style={planCommitAddedLineStyle}>{addedToPlanLine('food')}</div><div style={returnToLogFooterStyle}>{returnToLogCopy('Food')}</div></div>}
          </div>}
          {bookDropdown==='food'&&<div style={{position:'relative',zIndex:100,marginBottom:10}}><div style={{background:'rgba(0,8,20,0.95)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:8,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.30)',letterSpacing:2,padding:'4px 14px',lineHeight:1.4}}>FIND FOOD</div>
            {[{n:'Google Maps',u:`https://www.google.com/maps/search/restaurants+in+${encodeURIComponent(segment.name||'')}`},{n:'OpenTable',u:`https://www.opentable.com/s?location=${encodeURIComponent(segment.name||'')}`},{n:'Yelp',u:`https://www.yelp.com/search?find_desc=restaurants&find_loc=${encodeURIComponent(segment.name||'')}`}].map(l=><a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer" onClick={()=>setBookDropdown(null)} style={{display:'block',padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.75)',borderRadius:8,cursor:'pointer',textDecoration:'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{l.n}</a>)}
          </div></div>}
          {!showFoodSummary&&foodInsight.loading&&<SuggestionShimmer message={`Discovering flavors in ${dest||"this destination"}...`}/>}
          {!showFoodSummary&&!foodInsight.loading&&foodInsight.items.length>0&&(()=>{
            const foodItems=foodInsight.items.slice(0,3);
            const stripFoodLine=(notes,line)=>{
              const raw=(notes||"").split(/\n\n/).filter(p=>p.trim()&&p.trim()!==line.trim());
              return raw.join("\n\n");
            };
            const makeFoodToolbar=(savedIdx)=>{
              if(foodConfirmedPinnedIdxs.includes(savedIdx))return null;
              const it=foodItems[savedIdx];
              return(
                <div style={{display:'flex',alignItems:'center',marginBottom:0}}>
                  <button type="button" title="Open booking links" onClick={()=>setBookDropdown(bookDropdown==='food'?null:'food')} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
                  <button type="button" title="Confirm and collapse" onClick={()=>setFoodConfirmedPinnedIdxs(p=>p.includes(savedIdx)?p:[...p,savedIdx])} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>DONE</button>
                  <button type="button" title="Remove from plan" onClick={()=>{if(it){const rm=[it.name,it.description].filter(Boolean).join(" — ");setDet(d=>({...d,food:{...d.food,notes:stripFoodLine(d.food.notes,rm)}}));}setFoodInsightSavedIdxs(prev=>prev.filter(i=>i!==savedIdx));setFoodConfirmedPinnedIdxs(p=>p.filter(i=>i!==savedIdx));setBookDropdown(b=>b==='food'?null:b);}} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'4px 10px',cursor:'pointer',minHeight:28}}>✕</button>
                </div>
              );
            };
            return(
              <SuggestionPhotoDedupProvider>
              <>
                {foodInsightSavedIdxs.map(savedIdx=>{
                  const fi=foodItems[savedIdx];
                  if(!fi)return null;
                  return(
                    <GenericSuggestionCard key={`food-pinned-${savedIdx}`} item={{...fi,category:"🍜 FOOD"}} destination={dest} country={destCountry} instanceId={`food-tab-pinned-${savedIdx}`} photoPageIndex={savedIdx} accent="#FF9F43" variant="expand" isMobile={isMobile} warmLine={fi.name?`Great choice. ${fi.name} is a standout in ${dest}.`:undefined} savedCheckStyle={savedCheckStyle} savedSubStyle={savedSubStyle} savedCheckText="✓ Food spot added to your plan." savedSubText="Your Co-Architect has great taste — this one's locked in." footerSlot={null} inPlaceSaved={true} committedToolbar={makeFoodToolbar(savedIdx)} onAddToPlan={()=>{}}/>
                  );
                })}
                {foodItems.map((it,idx)=>{
                  if(foodInsightSavedIdxs.includes(idx))return null;
                  return(
                    <GenericSuggestionCard key={`food-insight-${idx}-${String(it.name).slice(0,24)}`} item={it} destination={dest} country={destCountry} instanceId={`food-tab-${idx}`} photoPageIndex={idx} accent="#FF9F43" variant="expand" isMobile={isMobile} warmLine={it.name?`Great choice. ${it.name} is a standout in ${dest}.`:undefined} savedCheckStyle={savedCheckStyle} savedSubStyle={savedSubStyle} savedCheckText="✓ Food spot added to your plan." savedSubText="Your Co-Architect has great taste — this one's locked in." footerSlot={null} inPlaceSaved={false} committedToolbar={null} onAddToPlan={()=>{const bud=parseFoodInsightDailyBudget(it.price);setDet(d=>{const line=[it.name,it.description].filter(Boolean).join(" — ");const nextNotes=d.food.notes?`${d.food.notes}\n\n${line}`:line;const prev=parseFloat(d.food.dailyBudget)||0;const cur=parseFloat(bud)||0;const nextBud=bud?String(Math.round(Math.max(prev,cur))):d.food.dailyBudget;return{...d,food:{...d.food,dailyBudget:nextBud||d.food.dailyBudget,notes:nextNotes}};});setFoodInsightSavedIdxs(prev=>prev.includes(idx)?prev:[...prev,idx]);}}/>
                  );
                })}
              </>
              </SuggestionPhotoDedupProvider>
            );
          })()}
          {!showFoodSummary&&!foodInsight.loading&&foodInsight.error&&<div style={{fontSize:12,color:"rgba(255,107,107,0.85)",marginBottom:10}}>{foodInsight.error}</div>}
          {showFoodManualBase&&<>
          <button type="button" onClick={()=>setFoodManualOpen(o=>!o)} style={{width:'100%',textAlign:'left',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(201,160,76,0.35)',borderRadius:10,color:'#c9a04c',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,padding:'10px 14px',cursor:'pointer',marginBottom:10,minHeight:44}}>{foodManualOpen||editingFood?'⌄ Hide manual food plan':'+ Plan your own food budget'}</button>
          {showFoodManualForm&&<>
          <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:10,flexWrap:isMobile?'wrap':'nowrap'}}>
            <div style={{flex:1,minWidth:0}}><SDF label="DAILY FOOD BUDGET ($)" type="number" value={det.food.dailyBudget} onChange={v=>uF("dailyBudget",v)} placeholder="e.g. 45" accent="#FF9F43"/></div>
            {hasFood&&<button type="button" onClick={()=>{if(typeof document!=="undefined")document.activeElement?.blur();setFoodFocused(false);setEditingFood(false);}} style={{padding:'8px 14px',borderRadius:6,border:'1px solid rgba(255,159,67,0.30)',background:'none',color:'rgba(255,159,67,0.70)',fontSize:12,cursor:'pointer',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:600,whiteSpace:'nowrap',height:34,flexShrink:0}}>SAVE</button>}
            <button type="button" onClick={aiFood} disabled={aiLoad} style={{padding:'8px 14px',borderRadius:6,border:'1px solid rgba(255,159,67,0.3)',background:'rgba(255,159,67,0.05)',color:'rgba(255,159,67,0.8)',fontSize:12,cursor:aiLoad?'wait':'pointer',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:600,whiteSpace:'nowrap',height:34,flexShrink:0}}>{aiLoad?"✦...":"✦ CO-ARCH EST"}</button>
          </div>
          {hasFood&&<div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'rgba(255,159,67,0.05)',border:'1px solid rgba(255,159,67,0.16)',borderRadius:8,marginBottom:10}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{segment.nights} nights × ${det.food.dailyBudget}/day</span>
            <span style={{fontSize:14,fontWeight:600,color:'rgba(201,160,76,0.85)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>${(parseFloat(det.food.dailyBudget)*segment.nights).toLocaleString()}</span>
          </div>}
          <SDF label="FOOD NOTES" value={det.food.notes} onChange={v=>uF("notes",v)} placeholder="Must-try dishes, market days, dietary notes..." accent="#FF9F43" multiline/>
          {hasFood&&editingFood&&<div style={{textAlign:'left',marginTop:10}}>
            <button type="button" onClick={()=>{setEditingFood(false);}} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'6px 14px',cursor:'pointer',minHeight:30,lineHeight:1.3}}>DONE</button>
          </div>}
          </>}
          </>}
          <button type="button" onClick={()=>setOwnRestaurantOpen(o=>!o)} style={{width:'100%',border:'1px dashed rgba(212,175,55,0.35)',borderRadius:12,padding:'14px 16px',textAlign:'center',cursor:'pointer',color:'#D4AF37',fontSize:14,fontWeight:600,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:0.5,marginTop:12,background:'rgba(212,175,55,0.04)',transition:'all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)'}}>+ Add your own restaurant</button>
          {ownRestaurantOpen&&<div style={{border:isMobile?'none':'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:isMobile?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.04)',padding:isMobile?'12px 10px':16,marginTop:10,marginBottom:4,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            <div style={{fontSize:12,color:'rgba(201,160,76,0.60)',letterSpacing:2,marginBottom:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>YOUR RESTAURANT</div>
            <SDF label="RESTAURANT NAME" value={ownRestaurant.name} onChange={v=>setOwnRestaurant(r=>({...r,name:v}))} placeholder="Name or neighborhood" accent="#FF9F43"/>
            <div style={{marginTop:8}}><SDF label="CUISINE TYPE (OPTIONAL)" value={ownRestaurant.cuisine} onChange={v=>setOwnRestaurant(r=>({...r,cuisine:v}))} placeholder="e.g. Vietnamese, omakase" accent="#FF9F43"/></div>
            <div style={{marginTop:8}}><SDF label="PRICE RANGE" value={ownRestaurant.priceTier} onChange={v=>setOwnRestaurant(r=>({...r,priceTier:v}))} placeholder="$ · $$ · $$$" accent="#FF9F43"/></div>
            <div style={{marginTop:8}}><SDF label="BOOKING LINK" value={ownRestaurant.link} onChange={v=>setOwnRestaurant(r=>({...r,link:v}))} placeholder="https://..." accent="#FF9F43"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={ownRestaurant.notes} onChange={v=>setOwnRestaurant(r=>({...r,notes:v}))} placeholder="Reservation time, dishes to try..." accent="#FF9F43" multiline/></div>
            <button type="button" onClick={()=>{if(!ownRestaurant.name.trim())return;const t=(ownRestaurant.priceTier||"").trim();const est=t.includes("$$$")?"85":t.includes("$$")?"48":t.includes("$")?"28":"";const block=[`🍽 ${ownRestaurant.name.trim()}`,[ownRestaurant.cuisine,t].filter(Boolean).join(" · "),ownRestaurant.link?`Link: ${ownRestaurant.link}`:"",ownRestaurant.notes||""].filter(Boolean).join("\n");setDet(d=>{const prev=parseFloat(d.food.dailyBudget)||0;const nextBud=est?String(Math.max(prev,parseInt(est,10)||0)):d.food.dailyBudget;return{...d,food:{...d.food,dailyBudget:nextBud,notes:d.food.notes?`${d.food.notes}\n\n${block}`:block}};});setOwnRestaurant({name:"",cuisine:"",priceTier:"",link:"",notes:""});setOwnRestaurantOpen(false);}} style={{marginTop:12,padding:'12px 20px',borderRadius:10,border:'none',background:ownRestaurant.name.trim()?'linear-gradient(135deg,rgba(255,159,67,0.25),rgba(201,160,76,0.15))':'rgba(255,255,255,0.04)',color:ownRestaurant.name.trim()?'#c9a04c':'rgba(255,255,255,0.20)',fontSize:12,cursor:ownRestaurant.name.trim()?'pointer':'default',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,fontWeight:700,width:'100%',minHeight:44}}>SAVE</button>
          </div>}
        </div>);})()}</div>}
        {/* BUDGET */}
        {visitedTabs.has("budget")&&<div style={{display:tab==="budget"?"block":"none"}}>{(()=>{const tCost=parseFloat(det.transport?.cost)||0;const sCost=parseFloat(det.stay?.cost)||0;const aCost=det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0);const fCost=(parseFloat(det.food?.dailyBudget)||0)*segment.nights;const mCost=det.misc.reduce((s,m)=>s+(parseFloat(m.cost)||0),0);const total=tCost+sCost+aCost+fCost+mCost;const budget=segment.budget||0;const pct=budget>0?Math.round((total/budget)*100):0;const barColor=pct>=100?'#FF6B6B':pct>=80?'#c9a04c':'#00E5FF';
          const tf=(det.transport?.from||'').trim();const tt=(det.transport?.to||'').trim();const tMode=(det.transport?.mode||'').trim();
          const transportSnap=(tf||tt)?`${tf||'…'} → ${tt||segment.name}`:(tMode||'');
          const stayNm=(det.stay?.name||'').trim();
          const staySnap=stayNm?`${stayNm} · ${segment.nights}n`:`${segment.nights}n`;
          const actSnip=(a)=>{const n=(a.name||'').trim();const c=parseFloat(a.cost);const has$=Number.isFinite(c)&&c>0;if(has$&&n)return`${fmt(c)} · ${n}`;if(has$)return fmt(c);return n;};
          const actParts=det.activities.map(actSnip).filter(Boolean);
          const trimActLines=(lines)=>{let out=lines;const max=320;const j=out.join(' · ');if(j.length<=max)return out;const acc=[];let n=0;for(const p of out){if(n+(p.length+3)>max)break;acc.push(p);n+=p.length+3;}return acc.length?acc:[`${j.slice(0,max)}…`];};
          const actLines=actParts.length>1?trimActLines(actParts):null;
          const activitiesSnap=actParts.length<=1?(actParts[0]||''):'';
          const db=det.food?.dailyBudget;const foodSnap=!isRowEmpty(db)?`${segment.nights}n × $${db}/day`:'';
          const miscSnap=det.misc.map(m=>(m.name||'').trim()).filter(Boolean).join(' · ').slice(0,120);
          const budgetRows=[{icon:'✈️',label:'TRANSPORT',cost:tCost,has:hideTransportSuggestion,snap:transportSnap},{icon:'🏨',label:'STAY',cost:sCost,has:hasS,snap:hasS?staySnap:''},{icon:'⚡',label:'ACTIVITIES',cost:aCost,has:det.activities.length>0,snap:activitiesSnap,snapLines:actLines},{icon:'🍜',label:'FOOD',cost:fCost,has:!isRowEmpty(db),snap:foodSnap},{icon:'💸',label:'MISC',cost:mCost,has:det.misc.length>0,snap:miscSnap}];
          return(
          <div style={{padding:0}}>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10,paddingRight:2}}>
              <HelpTip compact noLeadingMargin text="Your phase budget at a glance — costs flow in automatically as you plan transport, stays, and activities" />
            </div>
            <div style={{fontSize:13,fontFamily:'Fraunces, serif',fontWeight:600,color:'rgba(255,159,67,0.78)',letterSpacing:2,marginBottom:12,textAlign:'left',lineHeight:1.4}}>PHASE BUDGET</div>
            <div style={{fontSize:17,fontWeight:600,color:'#FFFFFF',fontFamily:'Fraunces, serif',marginBottom:4,textAlign:'left'}}>{segment.name}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontFamily:'Inter, system-ui, sans-serif',marginBottom:16,textAlign:'left'}}>{segment.nights} Nights · Budget: {fmt(budget)}</div>
            {budgetRows.map(r=>{
              const snapStyle={fontSize:isMobile?13:14,fontStyle:'normal',fontWeight:500,color:'rgba(255,245,220,0.88)',marginTop:7,lineHeight:1.55,wordBreak:'break-word',letterSpacing:'0.02em',textAlign:'left',fontFamily:'Inter, system-ui, sans-serif'};
              return(
              <div key={r.label} style={{display:'flex',alignItems:'flex-start',gap:isMobile?8:12,padding:isMobile?'14px 0':'15px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{width:isMobile?30:36,fontSize:isMobile?22:24,flexShrink:0,lineHeight:1.2,textAlign:'left'}}>{r.icon}</span>
                <div style={{flex:1,minWidth:0,textAlign:'left'}}>
                  <div style={{fontSize:isMobile?15:17,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.90)',letterSpacing:isMobile?0.8:1.2,fontWeight:700,textAlign:'left'}}>{r.label}</div>
                  {r.snapLines&&r.snapLines.length>0&&<div style={{marginTop:7}}>{r.snapLines.map((line,i)=><div key={i} style={{...snapStyle,marginTop:i?10:0,display:'flex',gap:10,alignItems:'baseline'}}><span style={{flexShrink:0,color:'rgba(201,160,76,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,lineHeight:1,fontStyle:'normal',fontWeight:700}}>●</span><span style={{flex:1,minWidth:0}}>{line}</span></div>)}</div>}
                  {r.snap&&!r.snapLines?.length&&<div style={snapStyle}>{r.snap}</div>}
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',flexShrink:0,gap:5}}>
                  <span style={{fontSize:isMobile?16:18,fontWeight:700,color:'#FFFFFF',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:'nowrap'}}>{r.cost>0?fmt(r.cost):'—'}</span>
                  <span style={{fontSize:isMobile?13:14,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,color:r.has?'#69F0AE':'rgba(255,255,255,0.60)',letterSpacing:0.5,whiteSpace:'nowrap',lineHeight:1.35}}>{r.has?'✓ Added':'—'}</span>
                </div>
              </div>
              );
            })}
            <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 6px',borderTop:'1px solid rgba(255,255,255,0.12)',marginTop:4}}>
              <span style={{fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.65)',letterSpacing:1}}>TOTAL PLANNED</span>
              <span style={{fontSize:15,fontWeight:700,color:'#FFFFFF',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fmt(total)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
              <span style={{fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.65)',letterSpacing:1}}>REMAINING</span>
              <span style={{fontSize:15,fontWeight:700,color:budget-total>=0?'#69F0AE':'#FF6B6B',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fmt(budget-total)}</span>
            </div>
            <div style={{marginTop:12,height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:Math.min(pct,100)+'%',background:barColor,borderRadius:3,transition:'width 0.60s cubic-bezier(0.25,0.46,0.45,0.94)'}}/>
            </div>
            <div style={{textAlign:'center',marginTop:6,fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:barColor,lineHeight:1.4}}>{pct}% allocated</div>
            {pct>=100&&<div style={{background:'rgba(255,107,107,0.08)',border:'1px solid rgba(255,107,107,0.3)',borderRadius:12,padding:'12px 16px',marginTop:12}}>
              <div style={{color:'#FF6B6B',fontSize:13,fontWeight:600,marginBottom:6}}>⚠️ Over budget by {fmt(total-budget)}</div>
              <div style={{color:'rgba(255,255,255,0.55)',fontSize:12,marginBottom:12,lineHeight:1.5}}>Want help finding options that fit your budget?</div>
              <button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('openCA',{detail:{message:`I'm over budget on ${segment?.name||'this segment'} by ${fmt(total-budget)}. Can you suggest alternatives that fit within my ${fmt(budget)} budget?`}}))} style={{background:'rgba(201,160,76,0.12)',border:'1px solid rgba(201,160,76,0.35)',borderRadius:8,color:'#c9a04c',fontSize:12,fontWeight:600,padding:'8px 14px',cursor:'pointer',letterSpacing:0.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>✦ Ask Co-Architect for alternatives</button>
            </div>}
          </div>);})()}</div>}
        {/* DOCS & VISA */}
        {visitedTabs.has("docs")&&<div style={{display:tab==="docs"?"block":"none",padding:0}}>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10,paddingRight:2}}>
            <HelpTip compact noLeadingMargin text="Generate visa requirements, travel advisories, and document checklists tailored to this destination" />
          </div>
          <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,marginBottom:12}}>DOCS & VISA</div>
          <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{segment.name}, {segment.country}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:16}}>{segment.nights} Nights</div>
          {!docsData&&!docsLoading&&<div style={{textAlign:'left',padding:'16px 0 8px'}}><button type="button" onClick={loadDocs} style={{padding:'12px 24px',borderRadius:10,border:'1px solid rgba(255,159,67,0.40)',background:'rgba(255,159,67,0.08)',color:'#FF9F43',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:44}}>✦ GENERATE TRAVEL DOCS BRIEF</button></div>}
          {docsLoading&&<div style={{textAlign:'left',padding:'16px 0 8px',display:'flex',alignItems:'center',gap:10}}><div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite',flexShrink:0}}/><span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>GENERATING DOCS BRIEF...</span></div>}
          {docsData&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
            {docsData.visa&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🛂 VISA REQUIREMENTS</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:'rgba(255,255,255,0.85)',lineHeight:1.7}}>{docsData.visa.details}{docsData.visa.cost?` · Cost: ${docsData.visa.cost}`:''}</div></div>}
            {docsData.health&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>💉 HEALTH</div>{docsData.health.required?.length>0&&<div style={{padding:'6px 10px',background:'rgba(201,160,76,0.06)',border:'1px solid rgba(201,160,76,0.20)',borderRadius:6,marginBottom:4,fontSize:13,color:'#c9a04c'}}>⚠️ Required: {docsData.health.required.join(', ')}</div>}{docsData.health.recommended?.length>0&&<div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Recommended: {docsData.health.recommended.join(', ')}</div>}{docsData.health.notes&&<div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4}}>{docsData.health.notes}</div>}</div>}
            {docsData.money&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>💵 MONEY & CURRENCY</div>{docsData.money.warning&&<div style={{padding:'6px 10px',background:'rgba(201,160,76,0.06)',border:'1px solid rgba(201,160,76,0.20)',borderRadius:6,marginBottom:4,fontSize:13,color:'#c9a04c'}}>⚠️ {docsData.money.warning}</div>}<div style={{fontSize:13,color:'rgba(255,255,255,0.80)',lineHeight:1.5}}>{docsData.money.currency}{docsData.money.tips?` · ${docsData.money.tips}`:''}</div></div>}
            {docsData.connectivity&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>📶 CONNECTIVITY</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{docsData.connectivity.tips}</div></div>}
            {docsData.safety&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🛡️ SAFETY</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Level: {docsData.safety.level}{docsData.safety.notes?` · ${docsData.safety.notes}`:''}</div></div>}
            {docsData.customs&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🤝 LOCAL CUSTOMS</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{docsData.customs.tips}</div></div>}
            {docsData.emergency&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🆘 EMERGENCY CONTACTS</div><div style={{display:'flex',flexDirection:'column',gap:4}}>{docsData.emergency.police&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Police: {docsData.emergency.police}</div>}{docsData.emergency.ambulance&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Ambulance: {docsData.emergency.ambulance}</div>}{docsData.emergency.embassy&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Embassy: {docsData.emergency.embassy}</div>}</div></div>}
          </div>}
          <div style={{marginTop:16}}><SDF label="PERSONAL NOTES" value={docsNote} onChange={v=>{setDocsNote(v);setDet(d=>({...d,intel:{...d.intel,notes:v}}));}} placeholder="Visa application status, insurance details, personal contacts..." accent="#FF9F43" multiline/></div>
        </div>}
        {visitedTabs.has("calendar")&&<div style={{display:tab==="calendar"?"block":"none"}}>{(()=>{const items=[];if(det.transport.mode||det.transport.from){const mode=(det.transport.mode||"Transport").trim();const fromTo=`${(det.transport.from||"").trim()}→${(det.transport.to||"").trim()}`;const desc=truncateCalendarLine(`${mode} · ${fromTo}`);items.push({type:"transport",icon:"✈️",label:mode||"Transport",desc,color:"#00E5FF",date:segment.arrival});}if(det.stay.name){const noteHead=sanitizeAiDisplayText((det.stay.notes||"").split(/[\n.]/)[0]||"").slice(0,28).trim();const desc=truncateCalendarLine(noteHead?`${noteHead} · ${segment.name||""}`.trim():`Stay · ${segment.name||"destination"}`);items.push({type:"stay",icon:"🏨",label:det.stay.name,desc,color:"#69F0AE",date:det.stay.checkin||segment.arrival});}det.activities.forEach(a=>{const cat=(a.provider||"Activity").trim();const brief=(a.brief||"").trim()||(String(a.notes||"").split("\n")[0]||"").trim();const desc=truncateCalendarLine(brief?`${cat} · ${brief}`:`${cat} · self-guided`);items.push({type:"activity",icon:"🎯",label:a.name,desc,color:"#c9a04c",date:a.date});});if(det.food.dailyBudget){const foodHint=sanitizeAiDisplayText((det.food.notes||"").split("\n")[0]||"").trim();const desc=truncateCalendarLine(foodHint||`Daily dining · $${det.food.dailyBudget}/day`);items.push({type:"food",icon:"🍜",label:`Food · $${det.food.dailyBudget}/day`,desc,color:"#FF9F43"});}const hasItems=items.length>0;return(
          <div style={{padding:0}}>
            {!hasItems&&<div style={{textAlign:"center",padding:"40px 20px",minHeight:"auto"}}>
              <div style={{fontSize:32,marginBottom:12}}>📅</div>
              <div style={{color:"rgba(255,255,255,0.5)",fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:15,lineHeight:1.6}}>Your calendar fills as you plan.</div>
              <div style={{color:"rgba(255,159,67,0.6)",fontSize:12,letterSpacing:2,marginTop:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>ADD TRANSPORT · STAY · ACTIVITIES · FOOD TO SEE YOUR DAYS</div>
            </div>}
            {hasItems&&<div>
              <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:"rgba(255,159,67,0.65)",letterSpacing:2,marginBottom:12}}>PLANNED ITEMS</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {items.map((it,i)=><div key={`${it.type}-${i}-${String(it.label||'').slice(0,24)}`} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:`${it.color}08`,border:`1px solid ${it.color}30`,borderRadius:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>{it.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:600,color:"#FFF",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{it.label}</div>
                    {it.desc&&<div style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:3,lineHeight:1.35}}>{it.desc}</div>}
                  </div>
                  {it.date&&<div style={{fontSize:12,color:it.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,whiteSpace:"nowrap"}}>{fD(it.date)}</div>}
                </div>)}
              </div>
            </div>}
          </div>
        );})()}</div>}
      </div>
      </div>
    </div>
  );
}


export default SegmentWorkspace;
