import posthog from "posthog-js";
import { askAI, parseJSON } from "./aiHelpers";
import { formatTripNameDisplay } from "./tripConsoleHelpers";

function hasInterestLabel(interests, needle) {
  return interests.some((x) => String(x).toLowerCase().includes(needle));
}

export async function runDreamExpeditionBuild({ vision, tripName, city, date, returnDate, budgetMode, budgetAmount, travelerGroup, travelStyle, interests, specialtyInterests, selectedGoal }) {
    posthog.capture("expedition_built",{budget_mode:budgetMode,has_budget:Number(budgetAmount)>0,traveler_group:travelerGroup,travel_style:travelStyle,interests,specialty_interests:specialtyInterests});
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
        const hasDive=phTypes.includes('dive')||hasInterestLabel(interests,'dive')||hasInterestLabel(interests,'scuba')||selectedGoal==='diver';
        const hasTrek=phTypes.includes('trek')||phTypes.includes('adventure')||hasInterestLabel(interests,'adventure');
        const hasCreator=hasInterestLabel(interests,'vlog');        // creator only if user is a vlogger
        const hasMoto=hasInterestLabel(interests,'moto');
        const hasSafari=hasInterestLabel(interests,'safari');
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
        if(travelStyle==="Luxury"||hasInterestLabel(interests,'food'))acts.push("fine-dining");
        if(hasInterestLabel(interests,'wellness'))acts.push("yoga");
        const essential=["passport","universal adapter"];
        if(hasDive)essential.push("dive mask","dive computer","reef-safe sunscreen");
        if(hasTrek)essential.push("hiking boots","rain jacket");
        if(climate==="tropical-hot")essential.push("sunscreen","insect repellent");
        if(dur==="long")essential.push("travel merino wool");
        parsed.packProfile={categories:cats,hiddenCategories:hidden,tripType:phTypes[0]||"culture",climate,season:"dry",tempRange:climate==="tropical-hot"?"28-35C":climate==="temperate-cool"?"10-18C":"18-28C",activities:[...new Set(acts)],duration:dur,essentialItems:essential,optionalItems:hasDive?[]:["wetsuit","dive computer","BCD"]};
      }
      console.log('[1BN] packProfile:',parsed?.packProfile);
      if(parsed){
        const appPayload={
          vision,
          tripName:formatTripNameDisplay(tripName||"My Expedition"),
          city,
          date,
          returnDate,
          budgetMode,
          budgetAmount,
          selectedGoal:selectedGoal||"custom",
          travelerProfile:{group:travelerGroup,style:travelStyle,interests,specialtyInterests},
        };
        return { ok:true, parsed, appPayload };
      }
      else{ return { ok:false, error:"Could not read expedition data — try again." }; }
    } catch(e){
      return { ok:false, error:e?.message||"Request failed — check connection or try again." };
    }
}
