import { useState, useEffect } from "react";
import posthog from "posthog-js";
import { BG_DREAM_GRADIENT } from '../constants/colors';
import { useMobile } from '../hooks/useMobile';
import { askAI, parseJSON } from '../utils/aiHelpers';
import SharegoodLogo from './SharegoodLogo';
import WorldMapBackground from './WorldMapBackground';
import DreamHeader from './DreamHeader';
import VisionReveal from './VisionReveal';
import CityInput from './CityInput';
import DatePickerInput from './DatePickerInput';

function DreamScreen({onGoGen,onLoadDemo,prefilledVision=""}) {
  const isMobile=useMobile();
  const [vision,setVision]=useState(prefilledVision);
  const [tripName,setTripName]=useState("");
  const [city,setCity]=useState("");
  const [date,setDate]=useState("");
  const [returnDate,setReturnDate]=useState("");
  const [heroPhase,setHeroPhase]=useState(0);
  const [loading,setLoading]=useState(false);
  const [budgetMode,setBudgetMode]=useState("dream");
  const [budgetAmount,setBudgetAmount]=useState("");
  const [loadError,setLoadError]=useState(false);
  const [visionData,setVisionData]=useState(null);
  const [focused,setFocused]=useState(false);
  const [logoState,setLogoState]=useState("idle");
  const [hintIdx,setHintIdx]=useState(0);
  const [retryMsg,setRetryMsg]=useState("");
  const [travelerGroup,setTravelerGroup]=useState("solo");
  const [travelStyle,setTravelStyle]=useState("");
  const [interests,setInterests]=useState([]);
  const [specialtyInterests,setSpecialtyInterests]=useState([]);
  const [specialtyOpen,setSpecialtyOpen]=useState(false);
  const [showAllInterests,setShowAllInterests]=useState(false);
  useEffect(()=>{if(date&&(returnDate===undefined||returnDate===""))setReturnDate(date);},[date,returnDate]);
  useEffect(()=>{
    const ts=[setTimeout(()=>setHeroPhase(1),400),setTimeout(()=>setHeroPhase(2),1200),setTimeout(()=>setHeroPhase(3),2100)];
    return()=>ts.forEach(clearTimeout);
  },[]);
  const GENERATION_HINTS=["Reading your vision...","Mapping your expedition...","Building your blueprint...","Calculating your budget...","Crafting your narrative...","Selecting your destinations..."];
  useEffect(()=>{if(!loading)return;setHintIdx(0);const iv=setInterval(()=>setHintIdx(p=>(p+1)%6),2500);return()=>clearInterval(iv);},[loading]);
  const canLaunch=vision.trim().length>20;
  async function handleReveal() {
    if(!canLaunch||loading)return;
    posthog.capture("expedition_built",{budget_mode:budgetMode,has_budget:Number(budgetAmount)>0,traveler_group:travelerGroup,travel_style:travelStyle,interests,specialty_interests:specialtyInterests});
    setLoading(true);setLoadError(false);setLogoState("thinking");
    const hasBudget=budgetMode!=="dream"&&budgetAmount&&Number(budgetAmount)>0;
    const nightCount=(date&&returnDate)?Math.round((new Date(returnDate)-new Date(date))/(1000*60*60*24)):null;
    const nightsDirective=nightCount?`CRITICAL: trip is exactly ${nightCount} nights — phases must sum to exactly ${nightCount} totalNights.`:"Infer duration from vision.";
    const bAmt=Number(budgetAmount)||0;
    const tierLabel=bAmt>=25000?"LUXURY":bAmt>=10000?"HIGH-END":bAmt>=3000?"MID-RANGE":"BUDGET";
    const budgetConstraint=hasBudget?`HARD BUDGET CONSTRAINT — MATHEMATICAL REQUIREMENT:
The traveler's total budget is $${budgetAmount}. This is BOTH a spend target AND an absolute ceiling.

ALLOCATION RULES:
1. Sum of all phase "budget" fields MUST equal $${budgetAmount} (±$50 rounding tolerance only)
2. "totalBudget" in your JSON MUST be exactly ${budgetAmount}
3. Distribute $${budgetAmount} proportionally: more nights = higher share, expensive countries = higher share
4. ${tierLabel} tier — choose accommodations and experiences matching this spend level realistically
5. SHOW YOUR MATH in budgetBreakdown: flights + accommodation + food + transport + activities + buffer = $${budgetAmount}
6. If your phases would exceed $${budgetAmount}, reduce nights or swap to cheaper destinations — do NOT exceed the budget
7. BEFORE returning JSON, mentally verify: add up all phase budgets — does the sum equal $${budgetAmount}? If not, adjust.

COMMON MISTAKES TO AVOID:
- Do NOT estimate costs from scratch and hope they match — ALLOCATE the stated budget across phases
- Do NOT round each phase independently (causes drift) — allocate proportionally then round
- Do NOT set totalBudget to anything other than ${budgetAmount}
- A $6,000 trip should have phases summing to $6,000 — not $8,000 or $4,000`
    :"NO BUDGET SET — set totalBudget to 0.";
    const allInterests=[...interests,...specialtyInterests];
    const specialtyRules=specialtyInterests.length>0?`\n${specialtyInterests.includes('fishing')?'- If "Fishing": prioritize coastal/offshore destinations, weight activities toward charters and water time, suggest fishing lodge accommodation\n':''}${specialtyInterests.includes('nightlife')?'- If "Nightlife": prioritize cities with strong nightlife scenes, suggest late-morning starts, accommodation near action\n':''}${specialtyInterests.includes('music')?'- If "Music/Festivals": build itinerary around festival dates, suggest shoulder accommodation strategy\n':''}${specialtyInterests.includes('wine')?'- If "Wine Tourism": weight vineyard regions, include cellar door experiences, suggest harvest season timing\n':''}${specialtyInterests.includes('skiing')?'- If "Skiing/Snow": weight mountain resort destinations, check snow season dates\n':''}${specialtyInterests.includes('fishing')||specialtyInterests.includes('camping')?'- If "Camping/Fishing": suggest dawn departures, remote accommodation options\n':''}${specialtyInterests.includes('yoga')?'- If "Yoga Retreat": include wellness centers, suggest peaceful accommodation\n':''}`:'';
    const travelerConstraints=`TRAVELER PROFILE — HARD CONSTRAINTS:\n- Traveling party: ${travelerGroup==='couple'?'Couple or 2 friends traveling together — budget covers both people, activities and accommodation for 2':'Solo traveler'}\n- Travel style: ${travelStyle||'Independent explorer'}${hasBudget?`\n- Budget: $${budgetAmount} FIRM — reflects total spend for the traveling party`:''}\n${nightCount?`- Nights: ${nightCount} — do not deviate`:''}\n${allInterests.length>0?`- Interests: ${allInterests.join(', ')} — weight destinations and activities toward these\n`:''}- If "First Timer": 1-2 countries max, beginner-friendly destinations, simple logistics, reassuring tone\n- If "Luxury": 5-star properties, premium experiences, business class\n- If "Couple/2 friends": romantic or buddy-trip framing as appropriate, experiences that work for two${specialtyRules}`;
    try {
      const breakdownSchema=hasBudget?`,"budgetBreakdown":{"flights":NUMBER,"accommodation":NUMBER,"food":NUMBER,"transport":NUMBER,"activities":NUMBER,"buffer":NUMBER,"flightsNote":"flight routing e.g. LAX → Lisbon return","accommodationNote":"e.g. Guesthouses and boutique hotels","foodNote":"e.g. Local restaurants and cafes","routingNote":"one sentence explaining WHY this route was chosen — the key routing decision in plain English, why these destinations in this order"}`:'';
      const returnPhaseNote=`The LAST phase must always be the return trip home: {"destination":"${city||"Home"}","country":"United States","type":"Return","nights":0,"budget":NUMBER,"why":"Homebound — routing note","flag":"🏠"}. Return phase cost IS included in total budget.`;
      const packSchema=`,"packProfile":{"categories":["clothes","tech","documents","travel","health"],"hiddenCategories":["dive","creator"],"tripType":"culture","climate":"mediterranean","season":"dry","tempRange":"18-28C","activities":["city-walking","fine-dining"],"duration":"medium","essentialItems":["walking shoes","universal adapter"],"optionalItems":["wetsuit","down jacket"]}`;
      const highlightFieldGuide="one specific moment from this exact trip — name the place, the time of day, the experience. Not 'an unforgettable moment' — the actual moment. Example: 'Sunrise from the roof of Riad Kniza before the call to prayer, Marrakech still dark below.'";
      const narrativeRules=`NARRATIVE RULES — non-negotiable:
- Sentence 1: The emotional truth of what this trip is about. What the traveler will feel and why it matters to them personally. Mirror their own language back if possible.
- Sentence 2: Name the specific. A real place, a real moment, a real sensation — not "beautiful scenery" or "local culture." The medina at dawn. The seaplane at first light. The ryokan where Basho once slept.
- Sentence 3: The transformation. Who is this traveler when they return? What will they know or feel that they don't now?
- NEVER use: "unforgettable," "breathtaking," "world-class," "hidden gems," "local culture," "unique experience"
- ALWAYS name: a specific place, a specific time of day, or a specific physical sensation`;
      const basePrompt=`${travelerConstraints}\n\n${budgetConstraint}\nElite travel co-architect. Vision:"${vision}". Trip:"${tripName||"My Expedition"}". From:"${city||"unknown"}". Departs:"${date||"flexible"}". Returns:"${returnDate||"open-ended"}". ${nightsDirective} ${returnPhaseNote}

${narrativeRules}

Return ONLY valid JSON:{"narrative":"Exactly 3 sentences following NARRATIVE RULES above.","vibe":"3 words separated by · ","phases":[{"destination":"City","country":"Country","nights":7,"type":"Culture","why":"one sentence","flag":"🌍","budget":NUMBER}],"totalNights":0,"totalBudget":${hasBudget?budgetAmount:'0'},"countries":0,"highlight":"${highlightFieldGuide}","goalLabel":"inferred goal type"${breakdownSchema}${packSchema}}${hasBudget?`\n\nFINAL CHECK: All phase budgets (including return phase) must sum to ${budgetAmount}. Last phase must be type "Return" with nights:0. "totalBudget" must be exactly ${budgetAmount}. budgetBreakdown must sum to ${budgetAmount}.`:''}
packProfile must reflect the actual generated itinerary. categories should include only what this specific traveler needs. essentialItems should name specific gear critical for the trip (e.g. "BCD", "wetsuit", "hiking boots", "down jacket"). optionalItems should name items unnecessary for this trip.`;
      let raw=await askAI(basePrompt,2800,0.3);
      let parsed=parseJSON(raw);
      console.log('[1BN] AI budgetBreakdown returned:',parsed?.budgetBreakdown||'MISSING');

      // Budget validator — catch wild misses before scaling
      if(parsed&&hasBudget&&parsed.phases?.length&&bAmt>0){
        const phaseSum=parsed.phases.reduce((s,p)=>s+(p.budget||p.cost||0),0)||1;
        const ratio=phaseSum/bAmt;
        console.log(`[1BN] Budget validation: AI total $${phaseSum} vs target $${bAmt} (ratio ${ratio.toFixed(2)})`);
        if(ratio<0.5||ratio>2.0){
          console.log('[1BN] Budget wildly off — retrying with correction prompt');
          setRetryMsg("Refining your budget allocation...");
          try{
            const retryPrompt=`Your previous budget allocation was $${phaseSum} but the target is $${bAmt}. Return the SAME destinations and itinerary structure with phase budgets corrected to sum to exactly $${bAmt}. Return ONLY valid JSON in the same format — no explanation.
Current itinerary: ${JSON.stringify(parsed.phases.map(p=>({destination:p.destination,country:p.country,nights:p.nights,type:p.type})))}
Required: all phase "budget" values must sum to $${bAmt}. "totalBudget" must be ${bAmt}.`;
            const retryRaw=await askAI(retryPrompt,1200,0.2);
            const retryParsed=parseJSON(retryRaw);
            if(retryParsed?.phases?.length){
              const retrySum=retryParsed.phases.reduce((s,p)=>s+(p.budget||p.cost||0),0);
              console.log(`[1BN] Retry budget: $${retrySum} vs target $${bAmt}`);
              parsed.phases=retryParsed.phases;
            }
          }catch(retryErr){console.log('[1BN] Retry failed, proceeding with scaling',retryErr);}
          setRetryMsg("");
        }
      }

      if(parsed&&hasBudget&&parsed.phases?.length){
        // Pure math: scale AI's proportional split to match stated budget
        const phaseSum=parsed.phases.reduce((s,p)=>s+(p.budget||p.cost||0),0)||1;
        const ratio=bAmt/phaseSum;
        console.log(`[1BN] Budget scaling: AI total $${phaseSum} x ${ratio.toFixed(2)} -> target $${bAmt}`);
        parsed.phases.forEach(p=>{p.budget=Math.round((p.budget||p.cost||0)*ratio/10)*10;});
        parsed.totalBudget=bAmt;
        // Scale or synthesize breakdown categories to match stated budget
        if(!parsed.budgetBreakdown){
          console.log('[1BN] budgetBreakdown missing from AI — synthesizing from budget');
          const tn=parsed.phases.reduce((s,p)=>s+(p.nights||0),0)||1;
          parsed.budgetBreakdown={flights:Math.round(bAmt*0.2),accommodation:Math.round(bAmt*0.3),food:Math.round(bAmt*0.18),transport:Math.round(bAmt*0.08),activities:Math.round(bAmt*0.16),buffer:Math.round(bAmt*0.08),flightsNote:(city||"Home")+" → "+parsed.phases[0]?.destination+" return",accommodationNote:bAmt>=25000?"Luxury resorts & 5-star hotels":bAmt>=10000?"4-star hotels & boutique stays":bAmt>=3000?"Mid-range hotels & guesthouses":"Hostels & guesthouses",foodNote:bAmt>=10000?"Quality restaurants & local dining":"Local restaurants & street food",routingNote:parsed.phases.length>1?`${parsed.phases.map(p=>p.destination).join(" → ")} — following the most efficient routing between destinations.`:""};
        }
        const bd=parsed.budgetBreakdown;
        const catSum=(bd.flights||0)+(bd.accommodation||0)+(bd.food||0)+(bd.transport||0)+(bd.activities||0)+(bd.buffer||0)||1;
        const bRatio=bAmt/catSum;
        bd.flights=Math.round((bd.flights||0)*bRatio/10)*10;
        bd.accommodation=Math.round((bd.accommodation||0)*bRatio/10)*10;
        bd.food=Math.round((bd.food||0)*bRatio/10)*10;
        bd.transport=Math.round((bd.transport||0)*bRatio/10)*10;
        bd.activities=Math.round((bd.activities||0)*bRatio/10)*10;
        bd.buffer=Math.round((bd.buffer||0)*bRatio/10)*10;
        console.log('[1BN] Final budgetBreakdown:',bd);
      }
      // Ensure return phase is last — synthesize if AI omitted it
      if(parsed?.phases?.length){
        const lastP=parsed.phases[parsed.phases.length-1];
        if(lastP?.type!=="Return"){
          const depCity=city||"Home";
          const returnCost=hasBudget?Math.max(Math.round(bAmt*0.08/10)*10,100):0;
          if(hasBudget&&returnCost>0){
            const destSum=parsed.phases.reduce((s,p)=>s+(p.budget||p.cost||0),0)||1;
            const targetDest=bAmt-returnCost;
            if(targetDest>0){const r=targetDest/destSum;parsed.phases.forEach(p=>{p.budget=Math.round((p.budget||p.cost||0)*r/10)*10;p.cost=p.budget;});}
          }
          parsed.phases.push({id:parsed.phases.length+1,destination:depCity,name:depCity,country:"United States",type:"Return",nights:0,cost:returnCost,budget:returnCost,why:`Homebound from ${lastP?.destination||"final destination"}`,flag:"🏠",color:"#94A3B8"});
          if(hasBudget)parsed.totalBudget=bAmt;
          console.log(`[1BN] Return phase synthesized: ${depCity} $${returnCost}`);
        }
      }

      // Synthesize packProfile if AI omitted it
      if(parsed&&!parsed.packProfile){
        console.log('[1BN] packProfile missing from AI — synthesizing from trip data');
        const phTypes=(parsed.phases||[]).map(p=>(p.type||'').toLowerCase());
        const hasDive=phTypes.includes('dive')||interests.includes('diving')||data.selectedGoal==='diver';
        const hasTrek=phTypes.includes('trek')||phTypes.includes('adventure')||interests.includes('adventure');
        const hasCreator=interests.includes('vlog');        // creator only if user is a vlogger
        const hasMoto=interests.includes('moto');
        const hasSafari=interests.includes('safari');
        // Base categories — always present via BASE_PACK; only add specialty cats that have ADAPTIVE_PACKS entries
        const cats=["clothes","tech","travel","health","docs"];
        const hidden=[];
        if(hasDive)cats.push("dive");else hidden.push("dive");
        if(hasCreator)cats.push("creator");else hidden.push("creator");
        if(hasMoto)cats.push("moto");
        if(hasSafari)cats.push("safari");
        if(hasTrek)cats.push("adventure");
        const tn=(parsed.phases||[]).reduce((s,p)=>s+(p.nights||0),0);
        const dur=tn<14?"short":tn<=30?"medium":"long";
        const tropical=["thailand","indonesia","philippines","maldives","honduras","belize","costa rica","vietnam","malaysia","india","mexico","barbados","tanzania","kenya","tanzania","ghana","senegal","colombia","brazil","peru","ecuador"];
        const cold=["iceland","norway","sweden","finland","switzerland","austria","canada","nepal","mongolia","new zealand","patagonia"];
        const dests=(parsed.phases||[]).map(p=>(p.country||p.destination||'').toLowerCase());
        const climate=dests.some(d=>cold.some(c=>d.includes(c)))?"temperate-cool":dests.some(d=>tropical.some(t=>d.includes(t)))?"tropical-hot":"mediterranean";
        const acts=[];
        if(hasDive)acts.push("diving","snorkeling");
        if(hasTrek)acts.push("trekking","hiking");
        acts.push("city-walking");
        if(travelStyle==="Luxury"||interests.includes('food'))acts.push("fine-dining");
        if(interests.includes('wellness'))acts.push("yoga");
        const essential=["passport","universal adapter"];
        if(hasDive)essential.push("dive mask","dive computer","reef-safe sunscreen");
        if(hasTrek)essential.push("hiking boots","rain jacket");
        if(climate==="tropical-hot")essential.push("sunscreen","insect repellent");
        if(dur==="long")essential.push("travel merino wool");
        parsed.packProfile={categories:cats,hiddenCategories:hidden,tripType:phTypes[0]||"culture",climate,season:"dry",tempRange:climate==="tropical-hot"?"28-35C":climate==="temperate-cool"?"10-18C":"18-28C",activities:[...new Set(acts)],duration:dur,essentialItems:essential,optionalItems:hasDive?[]:["wetsuit","dive computer","BCD"]};
      }
      console.log('[1BN] packProfile:',parsed?.packProfile);
      if(parsed){setLogoState("done");setTimeout(()=>setLogoState("idle"),600);setVisionData({visionData:parsed,selectedGoal:"custom",vision,tripName:tripName||"My Expedition",city,date,returnDate,budgetMode,budgetAmount,travelerProfile:{group:travelerGroup,style:travelStyle,interests,specialtyInterests}});}
      else{setLogoState("error");setTimeout(()=>setLogoState("idle"),2000);setLoadError(true);setLoading(false);}
    } catch(e){setLogoState("error");setTimeout(()=>setLogoState("idle"),2000);setLoadError(true);setLoading(false);}
  }
  if(visionData) return <VisionReveal data={visionData} onBuild={vd=>onGoGen(visionData,vd)} onBack={()=>{setVisionData(null);setLoading(false);}} freshMount={true}/>;
  return (
    <div className="dream-root" style={{ background: BG_DREAM_GRADIENT, backgroundAttachment: "fixed" }}>
      <WorldMapBackground dream/>
      <div className="dream-glow"/>
      <DreamHeader step={1}/>
      <div className="dream-content">
        <div style={{textAlign:"center",marginBottom:isMobile?20:28,animation:"fadeUp 0.6s ease"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:14}}>
            <SharegoodLogo size={isMobile?148:168} animate={true} logoState={logoState} glowColor={loading?"rgba(0,229,255,0.7)":"rgba(0,229,255,0.3)"} opacity={loading?1:0.92}/>
            {loading&&<div key={retryMsg||hintIdx} style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontStyle:"italic",color:retryMsg?"rgba(255,217,61,0.75)":"rgba(255,159,67,0.65)",marginTop:10,animation:"hintFade 2.5s ease forwards",textAlign:"center",letterSpacing:0.5}}>{retryMsg||GENERATION_HINTS[hintIdx]}</div>}
          </div>
          <div style={{minHeight:isMobile?80:110}}>
            {heroPhase>=1&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?28:38,fontWeight:100,color:"rgba(255,255,255,0.88)",lineHeight:1.15,letterSpacing:2,animation:"slideUp 0.7s cubic-bezier(0.22,1,0.36,1) both"}}>Your expedition</div>}
            {heroPhase>=2&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?28:38,fontWeight:300,color:"#FFF",lineHeight:1.15,letterSpacing:1,animation:"slideUp 0.7s cubic-bezier(0.22,1,0.36,1) both"}}>starts now.</div>}
            {heroPhase>=3&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?30:44,fontWeight:300,fontStyle:"italic",color:"#FFD93D",lineHeight:1.2,marginTop:10,letterSpacing:3,animation:"slideUp 0.8s cubic-bezier(0.22,1,0.36,1) both",textShadow:"0 0 24px rgba(0,120,255,0.25)"}}>Let's go.</div>}
          </div>
        </div>
        <div style={{marginBottom:13,padding:0,width:"100%",minWidth:0,boxSizing:"border-box"}}>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?14:17,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.82)",lineHeight:1.55,margin:"0 0 12px",animation:"fadeUp 0.8s ease 0.15s both",textAlign:"center",maxWidth:640,marginLeft:"auto",marginRight:"auto"}}>Every expedition starts with a feeling — tell me what&apos;s driving yours.</p>
          <div className="vision-textarea-wrap">
          <textarea className="vision-ta" style={{animation:focused?"none":"visionGlow 3.5s ease-in-out infinite",wordBreak:'break-word',overflowWrap:'break-word',whiteSpace:'pre-wrap'}} value={vision} onClick={e=>e.stopPropagation()} onChange={e=>{if(vision.length===0&&e.target.value.length>0)posthog.capture("vision_started");setVision(e.target.value);}} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={"Speak from the heart. Don\u2019t say where you want to go \u2014 say how you want to FEEL. The reefs you need to dive. The city you need to disappear into. The road that\u2019s been calling you. The version of yourself you\u2019re chasing. The more passion you pour in, the more magic your co-architect returns."} rows={isMobile?8:9}/>
          </div>
          {canLaunch&&<div style={{marginTop:8,fontFamily:"'Playfair Display',serif",fontSize:isMobile?13:14,fontStyle:"italic",color:"rgba(105,240,174,0.75)",animation:"fadeUp 0.4s ease",textShadow:"0 0 20px rgba(105,240,174,0.2)"}}>✦ Your co-architect is ready to build this.</div>}
        </div>
        <div style={{marginBottom:28,borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:24,padding:"24px 0 0"}}>
          <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>TRAVELER BRIEF</div>
          <div style={{marginBottom:12,border:travelerGroup?"1px solid rgba(255,159,67,0.20)":"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:isMobile?"12px 14px":"14px 16px",background:"rgba(255,255,255,0.02)",transition:"border 0.3s ease",width:"100%",boxSizing:"border-box"}}>
            <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>WHO'S GOING</div>
            <div style={{display:"flex",flexDirection:isMobile?"column":"row",flexWrap:"wrap",gap:8}}>
              {[{id:"solo",label:"Solo"},{id:"couple",label:"Couple / 2 Friends"}].map(g=>(
                <button key={g.id} onClick={()=>setTravelerGroup(g.id)} style={{padding:"9px 18px",borderRadius:24,border:travelerGroup===g.id?"1.5px solid rgba(255,159,67,0.90)":"1px solid rgba(255,255,255,0.32)",background:travelerGroup===g.id?"rgba(255,159,67,0.10)":"rgba(255,255,255,0.06)",color:travelerGroup===g.id?"#FFD93D":"rgba(255,255,255,0.75)",fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:travelerGroup===g.id?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:40,userSelect:"none",boxShadow:travelerGroup===g.id?"0 0 10px rgba(255,159,67,0.25)":"0 0 6px rgba(255,255,255,0.06)",width:isMobile?"100%":undefined,boxSizing:"border-box",textAlign:"center"}}>{g.label}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12,border:travelStyle?"1px solid rgba(255,159,67,0.20)":"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:isMobile?"12px 14px":"14px 16px",background:"rgba(255,255,255,0.02)",transition:"border 0.3s ease",width:"100%",boxSizing:"border-box"}}>
            <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>YOUR TRAVEL STYLE</div>
            <div style={{display:"flex",flexDirection:isMobile?"column":"row",flexWrap:"wrap",gap:8,width:"100%"}}>
              {["First Timer","Independent Explorer","Comfort & Quality","Adventure First","Luxury"].map(s=>(
                <button key={s} onClick={()=>setTravelStyle(v=>v===s?"":s)} style={{padding:isMobile?"6px 14px":"9px 18px",borderRadius:24,border:travelStyle===s?"1.5px solid rgba(255,159,67,0.90)":"1px solid rgba(255,255,255,0.32)",background:travelStyle===s?"rgba(255,159,67,0.10)":"rgba(255,255,255,0.06)",color:travelStyle===s?"#FFD93D":"rgba(255,255,255,0.70)",fontSize:isMobile?12:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:travelStyle===s?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:isMobile?36:40,userSelect:"none",boxShadow:travelStyle===s?"0 0 10px rgba(255,159,67,0.25)":"0 0 6px rgba(255,255,255,0.06)",width:isMobile?"100%":undefined,boxSizing:"border-box",textAlign:"center"}}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12,border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:isMobile?"12px 14px":"12px 16px",background:"transparent",transition:"border 0.3s ease",width:"100%",boxSizing:"border-box"}}>
            <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>INTERESTS <span style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontWeight:300,color:"rgba(255,159,67,0.50)",fontSize:13,textTransform:"none"}}>· optional</span></div>
            <div style={{display:"flex",flexDirection:isMobile?"column":"row",flexWrap:"wrap",gap:isMobile?8:7,width:"100%"}}>
              {(()=>{const allI=[{id:"diving",icon:"🤿",label:"Diving"},{id:"culture",icon:"🌍",label:"Culture"},{id:"vlog",icon:"🎥",label:"Vlog"},{id:"food",icon:"🍜",label:"Food & Wine"},{id:"adventure",icon:"🥾",label:"Adventure"},{id:"golf",icon:"⛳",label:"Golf"},{id:"wellness",icon:"🧘",label:"Wellness"},{id:"remote",icon:"💻",label:"Remote Work"},{id:"safari",icon:"🦁",label:"Safari"},{id:"moto",icon:"🏍️",label:"Moto"}];const visible=showAllInterests?allI:allI.filter((c,i)=>i<4||interests.includes(c.id));const hidden=allI.length-visible.length;return(<>{visible.map(c=>{const on=interests.includes(c.id);return(
                <button key={c.id} onClick={()=>setInterests(p=>on?p.filter(x=>x!==c.id):[...p,c.id])} style={{padding:isMobile?"5px 11px":"6px 14px",borderRadius:20,border:on?"1.5px solid rgba(255,159,67,0.80)":"1px solid rgba(255,255,255,0.30)",background:on?"rgba(255,159,67,0.08)":"rgba(255,255,255,0.06)",color:on?"#FF9F43":"rgba(255,255,255,0.70)",fontSize:isMobile?12:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:on?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:isMobile?36:40,userSelect:"none",boxShadow:on?"0 0 10px rgba(255,159,67,0.22)":"0 0 6px rgba(255,255,255,0.05)",width:isMobile?"100%":undefined,boxSizing:"border-box",textAlign:"center"}}>{c.icon} {c.label}</button>
              );})}{!showAllInterests&&hidden>0&&<button onClick={()=>setShowAllInterests(true)} style={{padding:isMobile?"5px 11px":"6px 14px",borderRadius:20,border:"1px solid rgba(255,159,67,0.50)",background:"transparent",color:"rgba(255,159,67,0.85)",fontSize:isMobile?12:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",cursor:"pointer",minHeight:isMobile?36:40,userSelect:"none",width:isMobile?"100%":undefined,boxSizing:"border-box",textAlign:"center"}}>+ {hidden} more</button>}{showAllInterests&&<button onClick={()=>setShowAllInterests(false)} style={{padding:isMobile?"5px 11px":"6px 14px",borderRadius:20,border:"1px solid rgba(255,159,67,0.50)",background:"transparent",color:"rgba(255,159,67,0.85)",fontSize:isMobile?12:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",cursor:"pointer",minHeight:isMobile?36:40,userSelect:"none",width:isMobile?"100%":undefined,boxSizing:"border-box",textAlign:"center"}}>− less</button>}</>);})()}
              <button onClick={()=>setSpecialtyOpen(o=>!o)} style={{padding:isMobile?"5px 11px":"6px 14px",borderRadius:20,border:specialtyInterests.length>0?"1.5px solid rgba(255,217,61,0.90)":specialtyOpen?"1.5px solid rgba(255,217,61,0.55)":"1px solid rgba(255,217,61,0.40)",background:specialtyInterests.length>0?"rgba(255,217,61,0.08)":"transparent",color:specialtyInterests.length>0?"#FFD93D":specialtyOpen?"rgba(255,217,61,0.75)":"rgba(255,217,61,0.60)",fontSize:isMobile?12:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:specialtyInterests.length>0?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:isMobile?36:40,userSelect:"none",boxShadow:specialtyInterests.length>0?"0 0 10px rgba(255,217,61,0.25)":"0 0 6px rgba(255,217,61,0.10)",width:isMobile?"100%":undefined,boxSizing:"border-box",textAlign:"center"}}>✦ Specialty{specialtyInterests.length>0?` (${specialtyInterests.length})`:"..."}</button>
            </div>
            <div style={{maxHeight:specialtyOpen?300:0,overflow:specialtyOpen?"visible":"hidden",transition:"max-height 0.28s ease-out"}}>
              <div style={{marginTop:8,border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"12px 14px",background:"rgba(255,255,255,0.015)",maxHeight:240,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:2,marginBottom:8}}>SPECIALTY INTERESTS <span style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontWeight:300,color:"rgba(255,159,67,0.50)",fontSize:13}}>· optional</span></div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {[{id:"fishing",icon:"🎣",label:"Fishing"},{id:"climbing",icon:"🧗",label:"Climbing"},{id:"skiing",icon:"🎿",label:"Skiing/Snow"},{id:"nightlife",icon:"🎉",label:"Nightlife"},{id:"music",icon:"🎵",label:"Music/Festivals"},{id:"shopping",icon:"🛍️",label:"Shopping"},{id:"wine",icon:"🍷",label:"Wine Tourism"},{id:"eco",icon:"🌿",label:"Eco Travel"},{id:"photography",icon:"🎨",label:"Photography"},{id:"camping",icon:"🏕️",label:"Camping"},{id:"yoga",icon:"🤸",label:"Yoga Retreat"},{id:"watersports",icon:"🏄",label:"Water Sports"}].map(c=>{const on=specialtyInterests.includes(c.id);return(
                    <button key={c.id} onClick={()=>setSpecialtyInterests(p=>on?p.filter(x=>x!==c.id):[...p,c.id])} style={{padding:"5px 12px",borderRadius:20,border:on?"1.5px solid rgba(255,159,67,0.80)":"1px solid rgba(255,255,255,0.30)",background:on?"rgba(255,159,67,0.08)":"rgba(255,255,255,0.06)",color:on?"#FF9F43":"rgba(255,255,255,0.68)",fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:on?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:40,userSelect:"none",boxShadow:on?"0 0 10px rgba(255,159,67,0.22)":"0 0 5px rgba(255,255,255,0.05)"}}>{c.icon} {c.label}</button>
                  );})}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="sec-label">EXPEDITION DETAILS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:22}}>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">JOURNEY NAME</div><input className="f-input" value={tripName} onClick={e=>e.stopPropagation()} onChange={e=>setTripName(e.target.value)} placeholder="MY GRAND EXPEDITION" style={{textTransform:"uppercase",borderColor:"rgba(0,229,255,0.72)",boxShadow:"0 0 14px rgba(0,229,255,0.18),0 0 32px rgba(0,229,255,0.07)"}}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">DEPARTS FROM</div><CityInput className="f-input" value={city} onChange={v=>setCity(v)} placeholder="Los Angeles, CA" style={{borderColor:"rgba(255,217,61,0.72)",boxShadow:"0 0 14px rgba(255,217,61,0.18),0 0 32px rgba(255,217,61,0.07)"}}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">TARGET START DATE</div><div style={{width:"100%",overflow:"clip",boxSizing:"border-box"}}><DatePickerInput className="f-input" value={date} onChange={setDate} style={{width:"100%",boxSizing:"border-box",fontSize:16,display:"block",borderColor:"rgba(105,240,174,0.72)",boxShadow:"0 0 14px rgba(105,240,174,0.18),0 0 32px rgba(105,240,174,0.07)"}} aria-label="Target start date" buttonStyle={{border:"1px solid rgba(105,240,174,0.35)",background:"rgba(105,240,174,0.12)"}}/></div></div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">RETURN DATE</div><div key={`return-${date}`} style={{width:"100%",overflow:"clip",boxSizing:"border-box"}}><DatePickerInput className="f-input" value={returnDate||date} min={date||undefined} onChange={setReturnDate} style={{width:"100%",boxSizing:"border-box",fontSize:16,display:"block",borderColor:"rgba(255,217,61,0.72)",boxShadow:"0 0 14px rgba(255,217,61,0.18),0 0 32px rgba(255,217,61,0.07)"}} aria-label="Return date" buttonStyle={{border:"1px solid rgba(255,217,61,0.35)",background:"rgba(255,217,61,0.10)"}}/></div><div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,217,61,0.65)",marginTop:3}}>optional · open-ended</div>{date&&returnDate&&(()=>{const d0=new Date(date+"T12:00:00"),d1=new Date(returnDate+"T12:00:00");const n=Math.round((d1-d0)/86400000);return n>0?<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:4}}>{n} nights</div>:null;})()}</div>
        </div>

        <div style={{marginBottom:22}}>
          <div className="f-label" style={{marginBottom:10}}>BUDGET APPROACH</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {[{id:"dream",icon:"💭",label:"Build the dream",sub:"We'll figure budget later",accent:"#FF9F43"},{id:"rough",icon:"💰",label:"I have a rough number",sub:"Give me a ballpark",accent:"#FFD93D"},{id:"strict",icon:"🎯",label:"Keep it under...",sub:"I have a firm limit",accent:"#A29BFE"}].map(b=>(
              <button key={b.id} onClick={()=>setBudgetMode(b.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 13px",borderRadius:9,border:"1px solid "+(budgetMode===b.id?b.accent+"80":"rgba(255,255,255,0.08)"),background:budgetMode===b.id?b.accent+"0D":"rgba(255,255,255,0.06)",cursor:"pointer",textAlign:"left",transition:"all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:44,width:"100%",boxSizing:"border-box",boxShadow:budgetMode===b.id?`0 0 16px ${b.accent}15`:'inset 0 1px 0 rgba(255,180,80,0.22),inset 1px 0 0 rgba(255,140,40,0.08),inset -1px 0 0 rgba(255,140,40,0.08),inset 0 -1px 0 rgba(255,100,20,0.06)'}}>
                <span style={{fontSize:16}}>{b.icon}</span>
                <div><div style={{fontSize:isMobile?13:14,fontWeight:700,color:budgetMode===b.id?b.accent:"#FFF"}}>{b.label}</div><div style={{fontSize:isMobile?12:13,color:"rgba(255,255,255,0.5)",marginTop:2}}>{b.sub}</div></div>
                <div style={{marginLeft:"auto",width:14,height:14,borderRadius:"50%",border:"1.5px solid "+(budgetMode===b.id?b.accent:"rgba(255,255,255,0.15)"),background:budgetMode===b.id?b.accent+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {budgetMode===b.id&&<div style={{width:6,height:6,borderRadius:"50%",background:b.accent}}/>}
                </div>
              </button>
            ))}
          </div>
          {(budgetMode==="rough"||budgetMode==="strict")&&<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}><div className="f-label">{budgetMode==="strict"?"MAX BUDGET ($)":"ROUGH BUDGET ($)"}</div><input className="f-input" type="text" inputMode="decimal" value={budgetAmount??""} onClick={e=>e.stopPropagation()} onChange={e=>{const v=e.target.value;if(v===""||/^\d*\.?\d*$/.test(v))setBudgetAmount(v);}} placeholder={budgetMode==="strict"?"e.g. 15000":"e.g. 20000"}/></div>}
        </div>
        <button className={"launch-btn "+(loading?"loading":canLaunch?"on":"off")} onClick={handleReveal} style={{minHeight:54,cursor:loading?"wait":canLaunch?"pointer":"default"}}>
          {loading?"✨  BUILDING YOUR EXPEDITION...":"🚀  BUILD MY EXPEDITION"}
        </button>
        {loadError&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.3)",textAlign:"center",fontSize:15,color:"#FF6B6B",letterSpacing:1}}>Connection issue — tap to try again</div>}
        <div style={{textAlign:"center",marginTop:30,paddingTop:20,borderTop:"1px solid rgba(0,229,255,0.1)"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:300,fontStyle:"italic",color:"rgba(255,217,61,0.4)",letterSpacing:2}}>Dream Big. Travel Light.</div>
          <div style={{fontSize:15,color:"rgba(255,255,255,0.15)",letterSpacing:3,marginTop:5}}>A SHAREGOOD COMPANY</div>
          <button onClick={onLoadDemo} style={{marginTop:16,background:"none",border:"1px solid rgba(0,229,255,0.2)",borderRadius:8,color:"rgba(0,229,255,0.5)",fontSize:15,padding:"10px 16px",cursor:"pointer",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",width:"100%",minHeight:44,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
            🌍 LOAD MY EXPEDITION · Michael's 2026/27 Global Dive
          </button>
        </div>
      </div>
    </div>
  );
}

export default DreamScreen;
