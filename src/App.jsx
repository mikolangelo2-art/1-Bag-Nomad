import { useState, useEffect, useRef, useCallback, memo } from "react";
import { ComposableMap, Geographies, Geography, Line, Marker } from "react-simple-maps";
import posthog from "posthog-js";

// Initialize PostHog — only in production
if (typeof window !== "undefined") {
  posthog.init("phc_O9hQZjy2VLHhAPuZPFhQeZTfAtXnXKfZh39qWZS966u", {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    loaded: (ph) => {
      if (window.location.hostname === "localhost") ph.opt_out_capturing();
    }
  });
}
// ╔══════════════════════════════════════════════════════════════╗
// ║  1 BAG NOMAD — v5_r4                                        ║
// ║  Merged: v5 + TripConsoleSandbox · March 23 2026            ║
// ║  · Each phase auto-wraps as 1 segment on handoff            ║
// ║  · Both intel previews kept (inline + full INTEL tab)       ║
// ║  · Storage: 1bn_seg_v2 only — legacy bookings purged        ║
// ╚══════════════════════════════════════════════════════════════╝

// ─── Constants ───────────────────────────────────────────────────
const GOAL_PRESETS = [
  {id:"diver",icon:"🤿",label:"Scuba Dive",desc:"Reefs, liveaboards, dive certs worldwide"},
  {id:"nomad",icon:"🌍",label:"Cultural Nomad",desc:"History, food, local life & hidden gems"},
  {id:"surfer",icon:"🏄",label:"Chase Waves",desc:"Follow the swell, surf the world's best breaks"},
  {id:"creator",icon:"🎥",label:"Document the Journey",desc:"Vlog, photograph, tell the story"},
  {id:"adventurer",icon:"🥾",label:"Wild & Off-Grid",desc:"Trek, climb, explore the unknown"},
  {id:"moto",icon:"🏍️",label:"Moto Explorer",desc:"Two wheels, open roads, borderless freedom"},
  {id:"golfer",icon:"⛳",label:"Golf Traveler",desc:"World-class courses, exclusive destinations"},
  {id:"custom",icon:"✨",label:"My Own Vision",desc:"I know what I want — let me describe it"},
];
const TC = {Dive:"#00E5FF",Surf:"#69F0AE",Culture:"#FFD93D",Exploration:"#FF9F43",Nature:"#A29BFE",Moto:"#FF6B6B",Trek:"#55EFC4",Relax:"#55EFC4",Transit:"#FFFFFF"};
const TI = {Dive:"🤿",Surf:"🏄",Culture:"🏛️",Exploration:"🔭",Nature:"🦎",Moto:"🏍️",Trek:"🥾",Relax:"🌴",Transit:"✈️"};
const QUICK_ACTIONS = ["Optimize routing","Check seasons","Reduce budget","Add a stop","Reorder stops","Am I on budget?"];
const STATUS_CFG={
  planning:  {label:"PLANNING",  icon:"✏️", color:"#FF9F43"},
  confirmed: {label:"CONFIRMED", icon:"✓",  color:"#E8DCC8"},
  booked:    {label:"BOOKED",    icon:"🔒", color:"#69F0AE"},
  changed:   {label:"CHANGED",   icon:"⚠️",color:"#FF6B6B"},
  cancelled: {label:"CANCELLED", icon:"✕",  color:"#888888"},
};
// Tap cycles forward; booked tapped = show modal instead
const STATUS_NEXT={planning:"confirmed",confirmed:"booked",changed:"booked",cancelled:"planning"};
const CAT_DOT_COLORS = ["#00E5FF","#69F0AE","#FFD93D","#FF9F43","#A29BFE","#FF6B6B"];

// ─── World Map ────────────────────────────────────────────────────
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const EXPEDITION_COORDS = {
  'Honduras':    [-86.2, 15.2],
  'Belize':      [-88.5, 17.2],
  'Barbados':    [-59.5, 13.2],
  'Egypt':       [30.8,  26.8],
  'India':       [78.9,  20.6],
  'Malaysia':    [109.7,  4.2],
  'Thailand':    [100.9, 15.9],
  'Indonesia':   [113.9, -0.8],
  'Japan':       [138.2, 36.2],
  'Vietnam':     [108.3, 14.1],
  'Philippines': [122.9, 12.9],
  'Maldives':    [73.2,   3.2],
  'Italy':       [12.6,  41.9],
  'France':      [2.3,   46.2],
  'Portugal':    [-8.2,  39.6],
  'Mexico':      [-102.5, 23.6],
  'Costa Rica':  [-83.8,  9.7],
  'Panama':      [-80.8,  8.5],
  'Greece':      [21.8,  39.1],
  'Jordan':      [36.2,  30.6],
  'Tanzania':    [34.9,  -6.4],
};
const WorldMapBackground = memo(({phases, activeCountry, console: consoleProp}) => {
  try {
    const isPack = consoleProp === 'pack';
    const phaseList = phases||[];
    const coords = phaseList.map(p=>EXPEDITION_COORDS[p.country]).filter(Boolean);
    const activeCoord = activeCountry ? EXPEDITION_COORDS[activeCountry] : null;
    const isMobileMap = typeof window!=='undefined' && window.innerWidth < 480;
    const geoFill = isPack ? '#FF9F43' : '#E8DCC8';
    const geoFillOp = isPack ? 0.035 : (isMobileMap ? 0.08 : 0.06);
    const geoStroke = isPack ? '#FF9F43' : '#00E5FF';
    const geoStrokeOp = isPack ? 0.08 : (isMobileMap ? 0.22 : 0.18);
    return (
      <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
        <style>{`@keyframes dashMove{to{stroke-dashoffset:-50}}.route-line{animation:dashMove 6s linear infinite}@keyframes activePulseR{0%,100%{r:2.8}50%{r:5}}.active-dot{animation:activePulseR 1.4s ease-in-out infinite}`}</style>
        <ComposableMap projection="geoNaturalEarth1" projectionConfig={{scale:160,center:[20,10]}} style={{width:'100%',height:'100%'}}>
          <Geographies geography={GEO_URL}>
            {({geographies})=>geographies.map(geo=>(
              <Geography key={geo.rsmKey} geography={geo} fill={geoFill} fillOpacity={geoFillOp} stroke={geoStroke} strokeWidth={0.4} strokeOpacity={geoStrokeOp} style={{default:{outline:'none'},hover:{outline:'none'},pressed:{outline:'none'}}}/>
            ))}
          </Geographies>
          {coords.length>1&&coords.map((coord,i)=>{
            if(i===coords.length-1)return null;
            return(<Line key={i} from={coord} to={coords[i+1]} stroke="#FFD93D" strokeWidth={1.2} strokeOpacity={isPack?0.35:0.65} strokeDasharray="4,4" className="route-line"/>);
          })}
          {phaseList.map((phase,i)=>{
            const coord = EXPEDITION_COORDS[phase.country];
            if(!coord) return null;
            const isActive = activeCountry && phase.country === activeCountry;
            return(
              <Marker key={i} coordinates={coord}>
                <circle r={isActive?14:6} fill={isActive?"#00E5FF":"#FF9F43"} fillOpacity={isActive?0.18:(isPack?0.08:0.15)}/>
                <circle r="2.8" fill={isActive?"#00E5FF":"#FFD93D"} fillOpacity={isActive?1:(isPack?0.45:0.9)} className={isActive?"active-dot":undefined}/>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>
    );
  } catch(e) { return null; }
});

// ─── Storage: 1bn_seg_v2 only ────────────────────────────────────
const SEG_KEY = "1bn_seg_v2";
const loadSeg = () => { try { const s=localStorage.getItem(SEG_KEY); return s?JSON.parse(s):{}; } catch(e) { return {}; } };
const saveSeg = d => { try { localStorage.setItem(SEG_KEY,JSON.stringify(d)); } catch(e) {} };
const COACH_KEY = "1bn_coach_v1";
const loadCoach = () => { try { const s=localStorage.getItem(COACH_KEY); return s?JSON.parse(s):{}; } catch(e) { return {}; } };
const saveCoach = d => { try { localStorage.setItem(COACH_KEY,JSON.stringify(d)); } catch(e) {} };
const ONBOARD_KEY = "1bn_onboard_v1";
const loadOnboard = () => { try { const s=localStorage.getItem(ONBOARD_KEY); return s?JSON.parse(s):{}; } catch(e) { return {}; } };
const saveOnboard = d => { try { localStorage.setItem(ONBOARD_KEY,JSON.stringify(d)); } catch(e) {} };
const RETURN_KEY = "1bn_return_v1";
const BLANK_RETURN = {flight:{date:"",from:"",to:"",cost:"",status:"planning"}};
const loadReturn = () => { try { const s=localStorage.getItem(RETURN_KEY); return s?JSON.parse(s):BLANK_RETURN; } catch(e) { return BLANK_RETURN; } };
const saveReturn = d => { try { localStorage.setItem(RETURN_KEY,JSON.stringify(d)); } catch(e) {} };

// ─── Utils ───────────────────────────────────────────────────────
const fmt = n => "$"+Math.round(n).toLocaleString();
const daysBetween = (d1,d2) => Math.round((new Date(d2)-new Date(d1))/86400000);
const urgencyColor = d => d<0?"#fff":d<30?"#FF6B6B":d<60?"#FFD93D":d<90?"#FF9F43":"#69F0AE";
const fD  = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
const fDS = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"}) : "";

// ─── City Autocomplete ──────────────────────────────────────────
const COMMON_CITIES=["Los Angeles, CA","New York, NY","San Francisco, CA","Chicago, IL","Miami, FL","Houston, TX","Dallas, TX","Austin, TX","Seattle, WA","Portland, OR","Denver, CO","Phoenix, AZ","San Diego, CA","Nashville, TN","Atlanta, GA","Boston, MA","Washington, DC","Philadelphia, PA","Minneapolis, MN","Detroit, MI","Las Vegas, NV","New Orleans, LA","Salt Lake City, UT","Charlotte, NC","Tampa, FL","Orlando, FL","Honolulu, HI","London, UK","Toronto, Canada","Vancouver, Canada","Montreal, Canada","Sydney, Australia","Melbourne, Australia","Auckland, New Zealand","Dublin, Ireland","Amsterdam, Netherlands","Berlin, Germany","Paris, France","Barcelona, Spain","Lisbon, Portugal","Rome, Italy","Tokyo, Japan","Singapore","Hong Kong","Dubai, UAE","Bangkok, Thailand","Mexico City, Mexico","São Paulo, Brazil","Buenos Aires, Argentina","Cape Town, South Africa"];
function CityInput({value,onChange,className,style:inputStyle,placeholder}){
  const [suggestions,setSuggestions]=useState([]);
  const [focused,setFocused]=useState(false);
  const handleChange=(v)=>{onChange(v);if(v.length>=2){const q=v.toLowerCase();setSuggestions(COMMON_CITIES.filter(c=>c.toLowerCase().includes(q)).slice(0,6));}else setSuggestions([]);};
  return(<div style={{position:'relative'}}><input className={className} style={inputStyle} value={value} onChange={e=>handleChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),150)} placeholder={placeholder}/>
    {focused&&suggestions.length>0&&<div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'rgba(0,8,20,0.98)',border:'1px solid rgba(255,159,67,0.25)',borderRadius:8,marginTop:4,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
      {suggestions.map(s=><div key={s} onMouseDown={()=>{onChange(s);setSuggestions([]);}} style={{padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.85)',fontFamily:"'Space Mono',monospace",cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.06)',transition:'background 0.15s'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{s}</div>)}
    </div>}
  </div>);
}

function useMobile() {
  const [m,setM] = useState(window.innerWidth<480);
  useEffect(()=>{ const h=()=>setM(window.innerWidth<480); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); },[]);
  return m;
}

// Architecture #1: group flat phases by country → each country = 1 PhaseCard with segments
const COUNTRY_FLAGS={"Honduras":"🇭🇳","Belize":"🇧🇿","Barbados":"🇧🇧","Egypt":"🇪🇬","India":"🇮🇳","Indonesia":"🇮🇩","Malaysia":"🇲🇾","Thailand":"🇹🇭"};
function toSegPhases(phases=[]) {
  // Group consecutive phases by country
  const groups=[];
  phases.forEach((p)=>{
    const last=groups[groups.length-1];
    if(last&&last.country===p.country){
      last.phases.push(p);
    } else {
      groups.push({country:p.country||"Unknown",phases:[p]});
    }
  });
  return groups.map((g,i)=>{
    const first=g.phases[0],last=g.phases[g.phases.length-1];
    const totalNights=g.phases.reduce((s,p)=>s+(p.nights||0),0);
    const totalBudget=g.phases.reduce((s,p)=>s+(p.budget||p.cost||0),0);
    const totalDives=g.phases.reduce((s,p)=>s+(p.diveCount||0),0);
    // Use color of first phase in country group
    const color=first.color||CAT_DOT_COLORS[i%6];
    return {
      id:i+1, name:g.country, flag:COUNTRY_FLAGS[g.country]||first.flag||"🌍",
      color, country:g.country, note:first.note||"",
      totalNights, totalBudget, totalDives,
      arrival:first.arrival||"", departure:last.departure||"",
      segments:g.phases.map((p)=>({
        id:String(p.id)+"a", name:p.name||p.destination||"Unnamed",
        type:p.type||"Exploration", nights:p.nights||0, budget:p.budget||p.cost||0,
        diveCount:p.diveCount||0, arrival:p.arrival||"", departure:p.departure||"",
        note:p.note||"", country:p.country||"",
      })),
    };
  });
}

async function askAI(prompt,max=900) {
  const r = await fetch("/api/ask",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:max,messages:[{role:"user",content:prompt}]})});
  const d = await r.json();
  return d.content?.find(c=>c.type==="text")?.text||"";
}
function parseJSON(raw) {
  if(!raw)return null;
  for(const fn of [s=>JSON.parse(s), s=>JSON.parse(s.replace(/`json\s*/gi,"").replace(/`\s*/gi,"").trim()), s=>{const m=s.match(/{[\s\S]*}/);if(m)return JSON.parse(m[0]);throw 0;}, s=>{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a!==-1&&b>a)return JSON.parse(s.slice(a,b+1));throw 0;}]) {
    try{return fn(raw);}catch(e){}
  }
  return null;
}

// ─── Segment Suggestions ────────────────────────────────────────
const SUGGEST_KEY = "1bn_seg_suggestions_v1";
const DISMISS_KEY = "1bn_dismissed_suggestions";
const loadDismissed = () => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); } catch(e) { return {}; } };
const saveDismissed = d => { try { localStorage.setItem(DISMISS_KEY, JSON.stringify(d)); } catch(e) {} };
// Find the suggestion matching a segment by name (handles country-grouping index mismatch)
function findSuggestionForSegment(suggestions, segmentName) {
  if (!suggestions || !segmentName) return null;
  const name = segmentName.toLowerCase();
  // Try exact phaseName match first, then partial match
  return suggestions.find(s => s?.phaseName?.toLowerCase() === name)
    || suggestions.find(s => s?.phaseName?.toLowerCase()?.includes(name))
    || suggestions.find(s => name.includes(s?.phaseName?.toLowerCase()?.split(',')[0]?.trim()))
    || null;
}
// Load suggestions directly from localStorage (fallback when prop chain fails)
function loadSuggestionsFromStorage() {
  try { const s=localStorage.getItem(SUGGEST_KEY); return s?JSON.parse(s).suggestions:null; } catch(e) { return null; }
}

function detectMode(route) {
  if (!route) return '';
  const r = route.toLowerCase();
  if (r.includes('flight') || r.includes('airline') || r.includes('airport') || r.includes('→') && (r.includes('air') || r.includes('united') || r.includes('american') || r.includes('delta') || r.includes('jetblue'))) return 'Flight';
  if (r.includes('ferry') || r.includes('boat')) return 'Boat/Ferry';
  if (r.includes('bus') || r.includes('shuttle') || r.includes('coach')) return 'Bus/Shuttle';
  if (r.includes('train') || r.includes('rail')) return 'Train';
  if (r.includes('drive') || r.includes('car') || r.includes('rental')) return 'Car/Drive';
  return '';
}

const suggestionCardStyle = {
  border: '1.5px solid rgba(255,255,255,0.14)',
  borderRadius: '14px',
  background: 'rgba(255,159,67,0.06)',
  padding: '18px',
  marginBottom: '14px',
  animation: 'suggestIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both'
};
const suggestionHeaderStyle = {
  fontSize: '11px',
  fontFamily: "'Space Mono',monospace",
  color: '#FF9F43',
  letterSpacing: '2px',
  marginBottom: '12px',
  opacity: 0.85
};
const disclaimerStyle = {
  fontSize: '11px',
  fontFamily: "'Space Mono',monospace",
  color: 'rgba(255,255,255,0.30)',
  fontStyle: 'italic',
  marginBottom: '12px',
  lineHeight: 1.5
};
const acceptBtnStyle = {
  flex: 1, padding: '10px',
  background: 'rgba(255,159,67,0.20)',
  border: '1px solid rgba(255,159,67,0.50)',
  borderRadius: '8px',
  color: '#FF9F43',
  fontSize: '12px',
  fontFamily: "'Space Mono',monospace",
  fontWeight: 600,
  cursor: 'pointer'
};
const dismissBtnStyle = {
  padding: '10px 14px',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  color: 'rgba(255,255,255,0.45)',
  fontSize: '12px',
  fontFamily: "'Space Mono',monospace",
  cursor: 'pointer'
};

function buildSegmentSuggestionsPrompt(tripData, travelerProfile) {
  const phases = tripData.phases || [];
  const style = travelerProfile?.style || 'Independent Explorer';
  const group = travelerProfile?.group || 'Solo';
  const interests = [...(travelerProfile?.interests||[]), ...(travelerProfile?.specialtyInterests||[])].join(', ');
  return `You are a world-class travel advisor and co-architect for a ${style} traveler.

EXPEDITION OVERVIEW:
- Traveler: ${group}
- Style: ${style}
- Interests: ${interests}
- Total budget: $${tripData.totalBudget}
- Departure: ${tripData.startDate}
- Departs from: ${tripData.departureCity || tripData.city || 'Unknown'}

PHASES:
${phases.map((p, i) => {const fromCity=i===0?(tripData.departureCity||tripData.city||'Home'):(phases[i-1].name||phases[i-1].destination||phases[i-1].city||'Previous');return `Phase ${i+1}: FROM ${fromCity} → TO ${p.name || p.destination || p.city}, ${p.country} | ${p.arrival} → ${p.departure} | ${p.nights} nights | Budget: $${p.budget || p.cost} | Type: ${p.type}`;}).join('\n')}

Generate specific, actionable suggestions for each phase. Include:
1. Transport: How to get there from the previous destination (or from ${tripData.departureCity || tripData.city || 'home'} for Phase 1). Include the actual departure city name in the route, not "Home city". Specific carriers/routes, realistic price estimate.
2. Stay: Best area to stay, accommodation type matching their style, realistic nightly rate and total cost.
3. Activities: 2-3 specific recommended activities matching their interests, with realistic costs.
4. Food: Daily food budget estimate, 2-3 specific local food recommendations.

IMPORTANT: All prices are ESTIMATES based on current market rates. Actual prices will vary when booked.

Return ONLY a JSON object:
{
  "phases": [
    {
      "phaseIndex": 0,
      "phaseName": "Destination Name",
      "transport": {
        "route": "Origin → Destination via carrier/method",
        "duration": "Approx travel time",
        "estimatedCost": "$XXX-XXX",
        "bestTiming": "Booking advice",
        "notes": "Practical travel notes"
      },
      "stay": {
        "recommendation": "Area and style recommendation",
        "type": "Accommodation type",
        "suggestions": ["Property 1", "Property 2", "Property 3"],
        "estimatedNightly": "$XX-XX/night",
        "estimatedTotal": "$XXX-XXX for N nights",
        "notes": "Booking tips"
      },
      "activities": [
        {
          "name": "Activity name",
          "provider": "Operator or venue",
          "estimatedCost": "$XX-XX",
          "notes": "Tips"
        }
      ],
      "food": {
        "dailyBudget": "$XX-XX/day",
        "totalEstimate": "$XXX-XXX for N nights",
        "recommendations": ["Restaurant — description", "Restaurant — description"],
        "notes": "Local food tips"
      }
    }
  ]
}

Return JSON only. No preamble. No markdown.`;
}

// ─── CSS ─────────────────────────────────────────────────────────
const CSS=`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,100;0,300;0,700;0,900;1,100;1,300;1,700;1,900&family=Space+Mono:wght@400;700&display=swap');
:root{--cream:#E8DCC8}*{box-sizing:border-box;margin:0;padding:0}body{background:#150F0A}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes suggestIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes coachFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
@keyframes consoleSlideOutLeft{from{transform:translateX(0);opacity:1}to{transform:translateX(-100%);opacity:0}}
@keyframes consoleSlideOutRight{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}
@keyframes consoleSlideInLeft{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes consoleSlideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes coachPulse{0%,100%{box-shadow:0 0 0 2px rgba(0,229,255,0.2),0 0 16px rgba(0,229,255,0.08)}50%{box-shadow:0 0 0 3px rgba(0,229,255,0.35),0 0 24px rgba(0,229,255,0.14)}}
@keyframes spinGlobe{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes glowPulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:0.85;transform:scale(1.04)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes launchPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,159,67,0.5)}50%{box-shadow:0 0 0 14px rgba(255,159,67,0)}}
@keyframes consolePulse{0%,100%{box-shadow:0 0 0 0 rgba(0,229,255,0.4)}50%{box-shadow:0 0 0 14px rgba(0,229,255,0)}}
@keyframes phaseIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes amberPulse{0%,100%{opacity:0.2;transform:scale(1)}50%{opacity:0.8;transform:scale(1.12)}}
@keyframes shimmer{0%,100%{opacity:0.5}50%{opacity:1}}
@keyframes shimmerBar{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes visionGlow{0%,100%{box-shadow:0 0 22px rgba(255,217,61,0.18),0 0 55px rgba(255,217,61,0.07)}50%{box-shadow:0 0 44px rgba(255,217,61,0.38),0 0 100px rgba(255,217,61,0.15)}}
@keyframes msgIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes logoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes ambientGlow{0%,100%{opacity:0.5}50%{opacity:0.9}}
@keyframes slideOpen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideInRight{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes slideOutRight{from{transform:translateX(0);opacity:1}to{transform:translateX(60px);opacity:0}}
@keyframes activePulse{0%,100%{r:2.8;opacity:0.9}50%{r:4.5;opacity:1.0}}
@keyframes logoIdle{0%,100%{transform:translateY(0);filter:drop-shadow(0 0 8px var(--logo-glow,rgba(255,159,67,0.4)))}50%{transform:translateY(-4px);filter:drop-shadow(0 0 14px var(--logo-glow,rgba(255,159,67,0.6)))}}
@keyframes logoThinking{0%,100%{transform:scale(1);filter:drop-shadow(0 0 12px var(--logo-glow,rgba(255,159,67,0.7)))}50%{transform:scale(1.04);filter:drop-shadow(0 0 22px var(--logo-glow,rgba(255,159,67,0.9)))}}
@keyframes logoDone{0%{transform:scale(1)}40%{transform:scale(1.12);filter:drop-shadow(0 0 30px var(--logo-glow,rgba(255,159,67,1)))}100%{transform:scale(1)}}
@keyframes logoError{0%,100%{transform:translateX(0);opacity:0.4}20%{transform:translateX(-2px)}40%{transform:translateX(2px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
@keyframes hintFade{0%{opacity:0}10%{opacity:0.65}70%{opacity:0.65}100%{opacity:0}}


  .dream-root,.mc-root,.build-root{font-size:18px}
  .dream-content{max-width:780px;padding:40px 52px 70px}@keyframes shimmerOnce{0%{background-position:-200% center}65%{background-position:200% center}100%{background-position:200% center}}.dream-big-shimmer{background:linear-gradient(90deg,#FFD93D 25%,#fff 45%,#FF9F43 55%,#FFD93D 75%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmerOnce 2s ease forwards}.dream-divider{width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,159,67,0.22),rgba(0,229,255,0.12),rgba(162,155,254,0.1),transparent);margin:4px 0 16px 0;border:none}.dream-accent-green{color:rgba(105,240,174,0.45)}
  .mc-content{padding:22px 36px}
  .g-label{font-size:16px}
  .g-desc{font-size:11px}
  .g-icon{font-size:28px}
  .sec-label{font-size:12px;letter-spacing:5px;color:rgba(255,159,67,0.6)}
  .f-label{font-size:11px;letter-spacing:3px;color:rgba(0,229,255,0.5)}
  .f-input{font-size:15px;padding:12px 16px}
  .vision-ta{font-size:15px;padding:16px 20px;transition:box-shadow 0.35s cubic-bezier(0.25,0.46,0.45,0.94),border-color 0.35s cubic-bezier(0.25,0.46,0.45,0.94)}.vision-ta:focus{outline:none}
  .launch-btn{font-size:15px;padding:20px;transition:box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94),transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)}.launch-btn:hover{box-shadow:0 0 28px rgba(255,159,67,0.35);transform:translateY(-1px)}
  .vibe-tag{font-size:11px;padding:6px 16px;transition:transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94),border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),background 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)}.vibe-tag:hover{transform:scale(1.04);box-shadow:0 0 10px rgba(255,159,67,0.2)}
  .mc-tab{font-size:11px;padding:12px 16px}
  .chat-bubble{font-size:12px}
  .intel-section-label{font-size:12px}
}

.dream-content{max-width:800px;padding:40px 52px 70px}
.mc-content{padding:22px 36px}
.g-label{font-size:16px}
.g-desc{font-size:11px}
.g-icon{font-size:28px}
.sec-label{font-size:12px;letter-spacing:5px}
.f-label{font-size:11px}
.f-input{font-size:15px;padding:12px 16px}
.vision-ta{font-size:15px;padding:16px 20px}
.launch-btn{font-size:15px;padding:20px}
.mc-tab{font-size:11px;padding:12px 16px}
.chat-bubble{font-size:12px}}

.dream-root,.mc-root,.build-root{max-width:900px!important;margin:0 auto!important}
.dream-content{padding:40px 52px 70px!important}
.mc-content{padding:22px 36px!important}
.g-label{font-size:16px!important}
.g-desc{font-size:11px!important}
.sec-label{font-size:12px!important;letter-spacing:5px!important}
.f-label{font-size:11px!important}
.f-input{font-size:15px!important;padding:12px 16px!important}
.vision-ta{font-size:15px!important;padding:16px 20px!important}
.launch-btn{font-size:15px!important;padding:20px!important}
.mc-tab{font-size:11px!important;padding:12px 16px!important}
.chat-bubble{font-size:12px!important}}
@media(min-width:900px){html,body{font-size:18px}.dream-content{max-width:860px;margin:0 auto;padding:40px 40px 70px}.mc-content{max-width:1100px;margin:0 auto;padding:24px 48px}.g-label{font-size:18px}.g-desc{font-size:12px}.sec-label{font-size:13px;letter-spacing:5px}.f-label{font-size:12px}.f-input{font-size:16px;padding:13px 18px}.vision-ta{font-size:16px;padding:18px 22px}.launch-btn{font-size:16px;padding:22px}.mc-tab{font-size:12px;padding:14px 18px}.chat-bubble{font-size:12px}}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#150F0A}::-webkit-scrollbar-thumb{background:rgba(232,220,200,0.12);border-radius:2px}
.dream-root{font-family:'Space Mono',monospace;background:radial-gradient(ellipse at 50% 0%,rgba(169,70,29,0.15) 0%,transparent 60%) no-repeat fixed,#150F0A;min-height:100vh;color:#FFF;position:relative}
.dream-glow{position:fixed;top:-80px;left:50%;transform:translateX(-50%);width:700px;height:280px;background:radial-gradient(ellipse,rgba(169,70,29,0.3) 0%,rgba(0,120,255,0.06) 40%,rgba(255,217,61,0.05) 55%,transparent 70%);pointer-events:none;z-index:0;animation:glowPulse 7s ease-in-out infinite}.dream-glow::after{content:"";position:absolute;top:60px;left:-120px;width:280px;height:180px;background:radial-gradient(ellipse,rgba(0,120,255,0.14) 0%,transparent 70%);pointer-events:none}.dream-glow::before{content:"";position:absolute;top:80px;right:-100px;width:240px;height:160px;background:radial-gradient(ellipse,rgba(162,155,254,0.14) 0%,rgba(0,120,255,0.06) 50%,transparent 70%);pointer-events:none}
.dream-content{position:relative;z-index:1;padding:26px 20px 44px;max-width:720px;margin:0 auto}.mc-content{padding:20px 32px}.build-root,.mc-root{font-size:15px}.g-label{font-size:15px}.g-desc{font-size:10px}.launch-btn{font-size:15px}.sec-label{font-size:10px;letter-spacing:0.08em}.f-input{font-size:14px}.f-label{font-size:10px}}
.hero-cursor{color:#FFD93D;animation:blink 0.9s infinite}
.sec-label{font-size:12px;color:rgba(0,229,255,0.85);letter-spacing:4px;margin-bottom:13px;padding-bottom:7px;border-bottom:1px solid rgba(0,229,255,0.15);white-space:nowrap}.dream-root .sec-label{color:rgba(255,159,67,0.85);border-image:linear-gradient(90deg,rgba(255,159,67,0.3),rgba(255,217,61,0.2),transparent) 1}
.goal-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:28px}
.g-card{position:relative;border-radius:12px;padding:13px 12px;cursor:pointer;transition:all 0.24s cubic-bezier(0.34,1.56,0.64,1);text-align:left;border:none;outline:none;overflow:hidden}
.g-card.off{background:linear-gradient(148deg,#B04E22,#8d3c18,#6d2c11);border:1px solid rgba(169,70,29,0.08);box-shadow:0 4px 18px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,180,80,0.30),inset 1px 0 0 rgba(255,140,40,0.10),inset -1px 0 0 rgba(255,140,40,0.10),inset 0 -1px 0 rgba(0,0,0,0.18)}
.g-card.on{background:linear-gradient(148deg,#311400,#200e00,#150900);box-shadow:0 0 0 1.5px #FFD93D,0 0 28px rgba(255,217,61,0.22),0 6px 22px rgba(0,0,0,0.65);transform:translateY(-2px)}
.g-card.off:hover{transform:translateY(-3px)}
.g-icon{font-size:22px;margin-bottom:6px;display:block}
.g-label{font-family:'Fraunces',serif;font-size:13px;font-weight:700;margin-bottom:4px;line-height:1.2}
.g-card.off .g-label{color:#FFF}.g-card.on .g-label{color:#FFD93D}
.g-desc{font-size:12px;line-height:1.5}
.g-card.off .g-desc{color:rgba(255,255,255,0.78)}.g-card.on .g-desc{color:rgba(255,217,61,0.7)}
.vision-ta{width:100%;background:rgba(8,6,4,0.85)!important;border:1.5px solid rgba(255,217,61,0.85)!important;border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;font-family:'Space Mono',monospace;resize:none;outline:none;line-height:1.8;min-height:106px;transition:border-color 0.3s;margin-bottom:6px}
.vision-ta::placeholder{font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.28);letter-spacing:0.01em}.vision-ta:focus{border:1.5px solid rgba(255,217,61,1)!important;animation:none!important;box-shadow:0 0 24px rgba(255,217,61,0.3),0 0 60px rgba(255,217,61,0.1)}
.f-label{font-size:13px;color:rgba(255,159,67,0.88);letter-spacing:0.10em}
.f-input{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.30);border-radius:9px;color:#FFF;font-size:12px;padding:9px 13px;font-family:'Space Mono',monospace;outline:none;width:100%;transition:border-color 0.2s,box-shadow 0.2s}
.f-input:focus{border-color:rgba(255,159,67,0.65);box-shadow:0 0 0 2px rgba(255,159,67,0.15),0 0 20px rgba(255,159,67,0.1)}.f-input::placeholder{color:rgba(255,255,255,0.40)}
input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.40)!important;font-style:italic}input[type="date"]::-webkit-calendar-picker-indicator{opacity:0;width:28px;cursor:pointer;position:relative;z-index:2}
.launch-btn{width:100%;padding:17px;border-radius:14px;border:none;font-family:'Space Mono',monospace;font-size:13px;font-weight:700;letter-spacing:2.5px;cursor:pointer;position:relative;overflow:hidden;transition:all 0.3s}
.launch-btn.off{background:linear-gradient(135deg,#8a3515 0%,#A9461D 40%,#C4571E 70%,#E06830 100%);color:rgba(255,255,255,0.5);cursor:default}
.launch-btn.on{background:linear-gradient(135deg,#C4571E 0%,#E06830 30%,#FF9F43 60%,#FFD93D 100%);color:#FFF;animation:launchPulse 2.8s ease-in-out infinite;box-shadow:0 0 24px rgba(255,159,67,0.3),0 0 48px rgba(255,217,61,0.15)}
.launch-btn.on:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(255,159,67,0.5),0 4px 28px rgba(0,120,255,0.2);animation:none}
.launch-btn.loading{background:linear-gradient(135deg,#C4571E,#E06830,#C4571E);color:rgba(255,255,255,0.92);cursor:wait;animation:launchPulse 1.4s ease-in-out infinite!important}
.narrative-card{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(169,70,29,0.14),rgba(255,217,61,0.04));border:2px solid #FFD93D;box-shadow:0 0 20px rgba(255,217,61,0.15);border-radius:16px;padding:22px;margin-bottom:18px;animation:fadeUp 0.5s ease}
.vibe-tag{background:rgba(169,70,29,0.22);border:1px solid rgba(169,70,29,0.55);border-radius:20px;padding:4px 12px;font-size:12px;color:#FFD93D;letter-spacing:2.5px}
.stat-card{background:rgba(255,255,255,0.04);border:1px solid rgba(232,220,200,0.08);border-radius:9px;padding:9px 7px;text-align:center}
.phase-row{display:flex;gap:10px;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:11px;align-items:flex-start;border-left:3px solid transparent}
.cta-build-btn{width:100%;padding:16px;border-radius:13px;border:none;background:linear-gradient(135deg,#A9461D 0%,#C4571E 38%,#69F0AE 100%);color:#060A0F;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:2.5px;font-family:'Space Mono',monospace;animation:consolePulse 2.8s ease-in-out infinite;transition:transform 0.2s}
.cta-build-btn:hover{transform:translateY(-2px);animation:none}
.build-root{font-family:'Space Mono',monospace;background:#150F0A;min-height:100vh;color:#FFF;display:flex;flex-direction:column}
.mc-root{font-family:'Space Mono',monospace;background:radial-gradient(ellipse at 50% 0%,rgba(0,229,255,0.04) 0%,transparent 50%) no-repeat fixed,#150F0A;min-height:100vh;color:#FFF;display:flex;flex-direction:column}
.mc-tab{background:none;border:none;cursor:pointer;padding:9px 12px;font-size:11px;letter-spacing:2px;white-space:nowrap;color:#FFF;border-bottom:2px solid transparent;transition:all 0.30s cubic-bezier(0.25,0.46,0.45,0.94);font-family:'Space Mono',monospace;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center}
.mc-tab.active{color:#00E5FF;border-bottom-color:#00E5FF}
.mc-content{padding:14px 16px;overflow-y:auto;flex:1;min-height:0}
.intel-section{background:rgba(255,255,255,0.04);border:1px solid rgba(232,220,200,0.08);border-radius:8px;padding:11px;margin-bottom:10px}
.intel-section-label{font-size:12px;letter-spacing:2px;margin-bottom:7px}
.street-card{display:flex;gap:9px;padding:9px 11px;background:rgba(0,0,0,0.25);border-radius:8px;margin-bottom:7px}
.loading-skeleton{height:13px;background:#111D2A;border-radius:4px;animation:shimmer 1.5s infinite;margin-bottom:8px}
.chat-bubble{border-radius:10px;padding:8px 10px;font-size:12px;color:#FFF;line-height:1.7;max-width:86%}
@media(max-width:599px){.dream-content{padding:18px 14px 40px}.goal-grid{gap:7px}.mc-content{padding:10px 12px}}
.bnav{position:fixed;bottom:0;left:0;right:0;z-index:300;display:flex;background:rgba(21,15,10,0.97);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border-top:1px solid rgba(232,220,200,0.08);padding-bottom:env(safe-area-inset-bottom)}
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:6px 0 10px;cursor:pointer;border:none;background:none;gap:3px;position:relative;min-height:56px;-webkit-tap-highlight-color:transparent;outline:none}
.bnav-pip{position:absolute;top:0;left:50%;transform:translateX(-50%);width:22px;height:2px;border-radius:2px;opacity:0}
.bnav-btn.active .bnav-pip{opacity:1;animation:pipSpring 0.45s cubic-bezier(0.34,1.56,0.64,1) both}
.bnav-icon{font-size:20px;line-height:1;transition:transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94);display:block}
.bnav-btn.active .bnav-icon{transform:translateY(-2px)}
.bnav-lbl{font-size:9px;letter-spacing:1.5px;font-family:'Space Mono',monospace;font-weight:700;transition:color 0.30s cubic-bezier(0.25,0.46,0.45,0.94);color:rgba(232,220,200,0.4)}
.bnav-btn.active .bnav-lbl{color:#FFD93D}
.bnav-btn.bnav-pack.active .bnav-pip{background:#FF9F43!important;box-shadow:0 0 8px #FF9F43}
.bnav-btn.bnav-pack.active .bnav-lbl{color:#FF9F43}
@keyframes pipSpring{0%{opacity:0;transform:translateX(-50%) scaleX(0)}60%{transform:translateX(-50%) scaleX(1.3)}100%{opacity:1;transform:translateX(-50%) scaleX(1)}}
@keyframes consoleIn{from{opacity:0}to{opacity:1}}
@keyframes planningPulse{0%,100%{opacity:0.72}50%{opacity:1.0}}
@keyframes statReveal{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.stat-val{animation:statReveal 0.5s cubic-bezier(0.34,1.56,0.64,1) both}
.tap-scale{-webkit-tap-highlight-color:transparent;cursor:pointer}
.tap-scale:active{transform:scale(0.97)!important;transition:transform 0.12s cubic-bezier(0.34,1.56,0.64,1)!important}`;

// ─── Michael's Expedition (compact) ──────────────────────────────
const MICHAEL_EXPEDITION = {
  tripName:"2026/27 Global Dive & Culture Expedition", startDate:"2026-09-16",
  visionNarrative:"You're about to embark on a 180-night odyssey across 8 countries — from the crystalline waters of the Caribbean to ancient Egyptian temples, from the sacred ghats of Varanasi to the legendary reefs of Komodo.",
  visionHighlight:"Completing 57 dives across 4 continents — from Caribbean coral gardens to Red Sea wrecks aboard Bella 3 to Komodo's legendary drift dives.",
  goalLabel:"Become a Diver", totalNights:180, totalBudget:19527, totalDives:57,
  phases:[
    {id:1, name:"Utila",              flag:"🇭🇳",country:"Honduras",  color:"#00E5FF",type:"Dive",       nights:10,budget:1435,cost:1435,diveCount:8, arrival:"2026-09-16",departure:"2026-09-26"},
    {id:2, name:"Roatan",             flag:"🇭🇳",country:"Honduras",  color:"#69F0AE",type:"Dive",       nights:8, budget:1970,cost:1970,diveCount:13,arrival:"2026-09-26",departure:"2026-10-04"},
    {id:3, name:"San Ignacio",        flag:"🇧🇿",country:"Belize",    color:"#FFD93D",type:"Culture",    nights:3, budget:520, cost:520, diveCount:0, arrival:"2026-10-04",departure:"2026-10-08"},
    {id:4, name:"Caye Caulker",       flag:"🇧🇿",country:"Belize",    color:"#FF9F43",type:"Dive",       nights:7, budget:1200,cost:1200,diveCount:6, arrival:"2026-10-08",departure:"2026-10-15"},
    {id:5, name:"Bridgetown",         flag:"🇧🇧",country:"Barbados",  color:"#A29BFE",type:"Dive",       nights:10,budget:3525,cost:3525,diveCount:8, arrival:"2026-10-16",departure:"2026-10-27"},
    {id:6, name:"Cairo & Luxor",      flag:"🇪🇬",country:"Egypt",     color:"#FF7675",type:"Culture",    nights:6, budget:835, cost:835, diveCount:0, arrival:"2026-10-27",departure:"2026-11-02"},
    {id:7, name:"Red Sea · Bella 3",  flag:"🇪🇬",country:"Egypt",     color:"#00E5FF",type:"Dive",       nights:7, budget:1112,cost:1112,diveCount:12,arrival:"2026-11-06",departure:"2026-11-16"},
    {id:8, name:"New Delhi",          flag:"🇮🇳",country:"India",     color:"#FF9F43",type:"Exploration",nights:3, budget:530, cost:530, diveCount:0, arrival:"2026-11-10",departure:"2026-11-13"},
    {id:9, name:"Varanasi",           flag:"🇮🇳",country:"India",     color:"#FFD93D",type:"Culture",    nights:3, budget:200, cost:200, diveCount:0, arrival:"2026-11-13",departure:"2026-11-16"},
    {id:10,name:"Kannauj",            flag:"🇮🇳",country:"India",     color:"#69F0AE",type:"Exploration",nights:3, budget:1165,cost:1165,diveCount:0, arrival:"2026-11-16",departure:"2026-11-19"},
    {id:11,name:"Kerala",             flag:"🇮🇳",country:"India",     color:"#A29BFE",type:"Exploration",nights:5, budget:900, cost:900, diveCount:0, arrival:"2026-11-19",departure:"2026-11-24"},
    {id:12,name:"Komodo · Wild Frontier",flag:"🇮🇩",country:"Indonesia",color:"#FF6B6B",type:"Dive",    nights:7, budget:1520,cost:1520,diveCount:10,arrival:"2026-11-29",departure:"2026-12-09"},
    {id:13,name:"Jakarta",            flag:"🇮🇩",country:"Indonesia", color:"#FF9F43",type:"Exploration",nights:3, budget:445, cost:445, diveCount:0, arrival:"2026-12-09",departure:"2026-12-12"},
    {id:14,name:"Penang",             flag:"🇲🇾",country:"Malaysia",  color:"#55EFC4",type:"Exploration",nights:4, budget:620, cost:620, diveCount:0, arrival:"2026-12-12",departure:"2026-12-16"},
    {id:15,name:"Bangkok",            flag:"🇹🇭",country:"Thailand",  color:"#74B9FF",type:"Culture",    nights:31,budget:1390,cost:1390,diveCount:0, arrival:"2026-12-16",departure:"2027-01-16"},
  ],
};

// ─── Default Pack (compact) ───────────────────────────────────────
function getDefaultPack() {
  const t = Date.now();
  return [
    {id:t+1, name:"45L Travel Backpack",           cat:"travel", cost:299,weight:4.5, volume:0,   bag:"Backpack",         owned:true},
    {id:t+2, name:"Travel Laptop Briefcase",       cat:"travel", cost:150,weight:2.2, volume:0,   bag:"Global Briefcase", owned:false},
    {id:t+3, name:"Packable Day Bag",              cat:"travel", cost:65, weight:0.4, volume:0.6, bag:"Backpack",         owned:true},
    {id:t+4, name:"Camera Organizer Cube",         cat:"travel", cost:60, weight:0.7, volume:3,   bag:"Backpack",         owned:false},
    {id:t+5, name:"Tech Organizer Pouch",          cat:"tech",   cost:60, weight:0.5, volume:1.5, bag:"Global Briefcase", owned:true},
    {id:t+10,name:"Medium Packing Cube",           cat:"clothes",cost:0,  weight:0.22,volume:8,   bag:"Backpack",         owned:true},
    {id:t+11,name:"Small Packing Cube",            cat:"clothes",cost:0,  weight:0.2, volume:4,   bag:"Backpack",         owned:true},
    {id:t+12,name:"2 T-Shirts",                    cat:"clothes",cost:0,  weight:0.4, volume:0.5, bag:"Backpack",         owned:true},
    {id:t+13,name:"Lightweight Sun Hoodie",        cat:"clothes",cost:75, weight:0.55,volume:0.8, bag:"Backpack",         owned:false},
    {id:t+14,name:"1 Button Shirt",                cat:"clothes",cost:50, weight:0.25,volume:0.4, bag:"Backpack",         owned:false},
    {id:t+15,name:"1 Lightweight Pants",           cat:"clothes",cost:0,  weight:0.45,volume:0.6, bag:"Backpack",         owned:true},
    {id:t+16,name:"1 Swim Shorts",                 cat:"clothes",cost:0,  weight:0.2, volume:0.3, bag:"Backpack",         owned:true},
    {id:t+17,name:"2 Underwear",                   cat:"clothes",cost:0,  weight:0.1, volume:0.15,bag:"Backpack",         owned:true},
    {id:t+18,name:"2 Socks",                       cat:"clothes",cost:0,  weight:0.1, volume:0.15,bag:"Backpack",         owned:true},
    {id:t+19,name:"Travel Merino Wool Bundle",     cat:"clothes",cost:280,weight:0.3, volume:0.4, bag:"Backpack",         owned:false},
    {id:t+20,name:"Flip Flops",                    cat:"clothes",cost:100,weight:0.4, volume:1.2, bag:"Backpack",         owned:true},
    {id:t+21,name:"2 Hats",                        cat:"clothes",cost:0,  weight:0.2, volume:0.8, bag:"Worn",             owned:true},
    {id:t+25,name:"Charging Cables",               cat:"tech",   cost:0,  weight:0.2, volume:0.3, bag:"Global Briefcase", owned:true},
    {id:t+26,name:"Universal Power Adapter",       cat:"tech",   cost:0,  weight:0.2, volume:0.35,bag:"Global Briefcase", owned:true},
    {id:t+27,name:"Portable Power Bank",           cat:"tech",   cost:0,  weight:0.2, volume:0.4, bag:"Global Briefcase", owned:true},
    {id:t+31,name:"Laptop",                        cat:"creator",cost:0,  weight:4.7, volume:1,   bag:"Global Briefcase", owned:true},
    {id:t+33,name:"Action Camera",                 cat:"creator",cost:290,weight:0.4, volume:0.2, bag:"Global Briefcase", owned:true},
    {id:t+34,name:"Compact Travel Drone",          cat:"creator",cost:350,weight:0.6, volume:0.6, bag:"Global Briefcase", owned:false},
    {id:t+35,name:"Portable SSD",                  cat:"creator",cost:130,weight:0.12,volume:0.03,bag:"Global Briefcase", owned:false},
    {id:t+36,name:"Compact Travel Tripod",         cat:"creator",cost:35, weight:0.3, volume:0.3, bag:"Backpack",         owned:false},
    {id:t+39,name:"Wireless Lavalier Mic",         cat:"creator",cost:75, weight:0.1, volume:0.1, bag:"Global Briefcase", owned:true},
    {id:t+40,name:"Smartphone",                    cat:"creator",cost:1500,weight:0.44,volume:0.1,bag:"Worn",             owned:false},
    {id:t+45,name:"Dive Mask",                     cat:"dive",   cost:100,weight:0.5, volume:0.8, bag:"Backpack",         owned:false},
    {id:t+46,name:"Dive Computer",                 cat:"dive",   cost:300,weight:0.2, volume:0.1, bag:"Backpack",         owned:false},
    {id:t+47,name:"Surface Marker Buoy",           cat:"dive",   cost:20, weight:0.35,volume:0.4, bag:"Backpack",         owned:false},
    {id:t+48,name:"Reef Hook",                     cat:"dive",   cost:15, weight:0.2, volume:0.2, bag:"Backpack",         owned:false},
    {id:t+49,name:"Mesh Dive Bag",                 cat:"dive",   cost:20, weight:0.3, volume:0.3, bag:"Backpack",         owned:false},
    {id:t+50,name:"Mask Defog",                    cat:"dive",   cost:12, weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+51,name:"O-ring Kit",                    cat:"dive",   cost:8,  weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+52,name:"Zip Ties",                      cat:"dive",   cost:5,  weight:0.02,volume:0.02,bag:"Backpack",         owned:false},
    {id:t+60,name:"Travel Wash Pouch",             cat:"health", cost:0,  weight:0.4, volume:2,   bag:"Backpack",         owned:true},
    {id:t+61,name:"Toothbrush & Paste",            cat:"health", cost:0,  weight:0.15,volume:0.18,bag:"Backpack",         owned:true},
    {id:t+63,name:"Electric Razor Set",            cat:"health", cost:75, weight:0.3, volume:0.5, bag:"Backpack",         owned:true},
    {id:t+68,name:"Small First Aid Kit",           cat:"health", cost:0,  weight:0.35,volume:3,   bag:"Backpack",         owned:false},
    {id:t+69,name:"Anti-diarrheal Tablets",        cat:"health", cost:0,  weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+70,name:"Motion Sickness Pills",         cat:"health", cost:0,  weight:0.05,volume:0.05,bag:"Backpack",         owned:true},
    {id:t+80,name:"Passport",                      cat:"docs",   cost:200,weight:0.1, volume:0.1, bag:"Worn",             owned:true},
    {id:t+81,name:"Debit and Credit Cards",        cat:"docs",   cost:0,  weight:0.01,volume:0.01,bag:"Worn",             owned:true},
    {id:t+82,name:"Travel Insurance Docs",         cat:"docs",   cost:0,  weight:0,   volume:0,   bag:"Digital",          owned:false},
    {id:t+83,name:"International Drivers Permit",  cat:"docs",   cost:0,  weight:0.01,volume:0.01,bag:"Global Briefcase", owned:true},
  ].map(i=>({...i,status:i.owned?"owned":"needed"}));
}

// ─── SharegoodLogo ────────────────────────────────────────────────
function SharegoodLogo({size=40,opacity=1,glowColor="rgba(169,70,29,0.5)",animate=true,logoState="idle"}) {
  const anim={idle:"logoIdle 5s ease-in-out infinite",thinking:"logoThinking 1.2s ease-in-out infinite",done:"logoDone 0.6s ease forwards",error:"logoError 0.4s ease"}[logoState]||"logoIdle 5s ease-in-out infinite";
  const finalAnim=animate?anim:"none";
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0,animation:finalAnim,filter:`drop-shadow(0 0 ${size*.25}px ${glowColor})`,opacity,"--logo-glow":glowColor}}>
      <img src="/sharegood-logo.svg" width={size} height={size} alt="Sharegood" style={{display:"block",borderRadius:"50%"}}/>
    </div>
  );
}


// ─── AntiqueGlobe (Spinning Earth) ───────────────────────────────
function AntiqueGlobe({size=120, glowColor="rgba(0,180,255,0.45)", animate=true}) {
  const r = size / 2;
  const sc = size / 200; // scale: designed at 200x200

  return (
    <div style={{
      position:"relative", width:size, height:size, flexShrink:0,
      filter:`drop-shadow(0 0 ${size*.18}px ${glowColor})`,
      animation: animate ? "spinGlobe 20s linear infinite" : "none",
    }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        {/* Ocean base */}
        <circle cx={r} cy={r} r={r-1} fill="#0a2744" stroke="#1a5276" strokeWidth="1.5"/>
        {/* Ocean highlight */}
        <circle cx={r} cy={r} r={r-1} fill="url(#oceanGrad)" opacity="0.6"/>
        <defs>
          <radialGradient id="oceanGrad" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#1a6b96" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#051428" stopOpacity="0.3"/>
          </radialGradient>
          <radialGradient id="landGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#3d7a45" stopOpacity="1"/>
            <stop offset="100%" stopColor="#1a4a1e" stopOpacity="1"/>
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx={r} cy={r} r={r-2}/>
          </clipPath>
        </defs>

        {/* Land masses — simplified but recognizable */}
        <g clipPath="url(#globeClip)" fill="url(#landGrad)" stroke="#2d6e35" strokeWidth="0.5">
          {/* North America */}
          <path d={`M${55*sc},${48*sc} C${60*sc},${38*sc} ${75*sc},${35*sc} ${88*sc},${40*sc} C${98*sc},${44*sc} ${100*sc},${55*sc} ${95*sc},${65*sc} C${90*sc},${75*sc} ${82*sc},${82*sc} ${74*sc},${84*sc} C${66*sc},${82*sc} ${60*sc},${74*sc} ${56*sc},${66*sc} C${52*sc},${58*sc} ${53*sc},${52*sc} ${55*sc},${48*sc} Z`}/>
          {/* Greenland */}
          <path d={`M${74*sc},${22*sc} C${80*sc},${17*sc} ${90*sc},${20*sc} ${92*sc},${30*sc} C${90*sc},${38*sc} ${80*sc},${38*sc} ${73*sc},${33*sc} Z`}/>
          {/* South America */}
          <path d={`M${72*sc},${93*sc} C${78*sc},${88*sc} ${90*sc},${91*sc} C${94*sc},${100*sc} ${93*sc},${118*sc} ${87*sc},${130*sc} C${82*sc},${140*sc} ${73*sc},${143*sc} ${67*sc},${133*sc} C${63*sc},${122*sc} ${65*sc},${108*sc} ${68*sc},${98*sc} Z`}/>
          {/* Europe */}
          <path d={`M${98*sc},${38*sc} C${105*sc},${32*sc} ${118*sc},${34*sc} ${120*sc},${44*sc} C${118*sc},${53*sc} ${108*sc},${56*sc} ${100*sc},${52*sc} Z`}/>
          {/* Africa */}
          <path d={`M${100*sc},${60*sc} C${108*sc},${57*sc} ${118*sc},${60*sc} C${124*sc},${70*sc} ${122*sc},${90*sc} ${116*sc},${108*sc} C${110*sc},${118*sc} ${100*sc},${120*sc} ${95*sc},${110*sc} C${92*sc},${98*sc} ${94*sc},${78*sc} ${97*sc},${68*sc} Z`}/>
          {/* Asia mainland */}
          <path d={`M${120*sc},${30*sc} C${138*sc},${25*sc} ${160*sc},${28*sc} ${170*sc},${40*sc} C${175*sc},${52*sc} ${165*sc},${65*sc} ${150*sc},${68*sc} C${135*sc},${70*sc} ${122*sc},${62*sc} ${115*sc},${52*sc} C${112*sc},${42*sc} ${115*sc},${33*sc} ${120*sc},${30*sc} Z`}/>
          {/* India */}
          <path d={`M${130*sc},${70*sc} C${136*sc},${68*sc} ${142*sc},${72*sc} ${140*sc},${86*sc} C${137*sc},${96*sc} ${130*sc},${98*sc} ${125*sc},${90*sc} C${122*sc},${80*sc} ${125*sc},${72*sc} ${130*sc},${70*sc} Z`}/>
          {/* Southeast Asia */}
          <path d={`M${150*sc},${72*sc} C${160*sc},${70*sc} ${166*sc},${76*sc} ${162*sc},${86*sc} C${156*sc},${90*sc} ${148*sc},${86*sc} ${147*sc},${78*sc} Z`}/>
          {/* Australia */}
          <path d={`M${148*sc},${108*sc} C${158*sc},${104*sc} ${170*sc},${108*sc} C${174*sc},${120*sc} ${168*sc},${132*sc} ${155*sc},${134*sc} C${143*sc},${132*sc} ${138*sc},${122*sc} ${142*sc},${112*sc} Z`}/>
          {/* Antarctica (bottom) */}
          <path d={`M${40*sc},${168*sc} C${70*sc},${162*sc} ${130*sc},${162*sc} ${162*sc},${168*sc} C${165*sc},${175*sc} ${140*sc},${182*sc} ${100*sc},${182*sc} C${60*sc},${182*sc} ${35*sc},${175*sc} ${40*sc},${168*sc} Z`} opacity="0.7" fill="#e8f4f8" stroke="#c0d8e0" strokeWidth="0.5"/>
        </g>

        {/* Latitude grid lines */}
        {[-0.35, -0.18, 0, 0.18, 0.35].map((lat, i) => {
          const cy = r + lat * size;
          const rx2 = Math.sqrt(Math.max(0, Math.pow(r-2, 2) - Math.pow(lat*size, 2)));
          const ry = Math.max(1, rx2 * 0.14);
          return rx2 > 3 ? (
            <ellipse key={i} cx={r} cy={cy} rx={rx2} ry={ry}
              fill="none" stroke={i===2?"rgba(100,200,255,0.5)":"rgba(100,180,255,0.2)"}
              strokeWidth={i===2?"0.8":"0.4"}/>
          ) : null;
        })}
        {/* Longitude grid */}
        {[0, 60, 120].map((angle, i) => (
          <ellipse key={i} cx={r} cy={r} rx={r-2} ry={r-2}
            fill="none" stroke="rgba(100,180,255,0.15)" strokeWidth="0.4"
            transform={`rotate(${angle} ${r} ${r})`}/>
        ))}

        {/* Atmosphere glow rim */}
        <circle cx={r} cy={r} r={r-1} fill="none"
          stroke="rgba(100,200,255,0.35)" strokeWidth="3"/>
        <circle cx={r} cy={r} r={r-1} fill="none"
          stroke="rgba(150,220,255,0.15)" strokeWidth="6"/>

        {/* Specular highlight */}
        <ellipse cx={r*0.65} cy={r*0.55} rx={r*0.28} ry={r*0.18}
          fill="rgba(255,255,255,0.07)" transform={`rotate(-30 ${r*0.65} ${r*0.55})`}/>
      </svg>
    </div>
  );
}

// ─── ConsoleHeader ────────────────────────────────────────────────
function ConsoleHeader({console:which,isMobile,rightSlot,onTripConsole,onPackConsole,screenLabel,children}) {
  const isDream=which==="dream", isTrip=which==="trip", isPack=which==="pack";
  const [profileOpen,setProfileOpen]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false);
  const bg=isDream?"rgba(21,15,10,0.95)":isTrip?"rgba(21,15,10,0.92)":"rgba(21,15,10,0.95)";
  const bc=isDream?"rgba(232,220,200,0.08)":isTrip?"rgba(232,220,200,0.06)":"rgba(196,87,30,0.35)";
  const dot=isDream?"#FFD93D":isTrip?"#00E5FF":"#FF9F43";
  const sub=isDream?"rgba(232,220,200,0.55)":isTrip?"rgba(232,220,200,0.55)":"rgba(232,220,200,0.55)";
  const sublabel=isDream?"DREAM CONSOLE":isTrip?"TRIP CONSOLE":"PACK CONSOLE";
  const dbSize=isMobile?(isDream?18:14):(isDream?36:26);
  const tlSize=isMobile?(isPack?18:14):(isPack?36:26);
  const dbColor=isDream?"#FFD93D":isTrip?"rgba(255,217,61,0.5)":"rgba(255,217,61,0.2)";
  const dbWeight=isDream?900:isTrip?700:300;
  const tlColor=isPack?"#FFD93D":isTrip?"rgba(255,217,61,0.65)":"#FFD93D";
  const tlShadow=isPack?"0 0 28px rgba(255,217,61,0.6)":isDream?"0 0 28px rgba(255,217,61,0.5)":"none";
  const logoGlow=isDream?"rgba(0,229,255,0.25)":isTrip?"rgba(0,229,255,0.35)":"rgba(196,87,30,0.5)";
  const radial=isDream?"rgba(255,159,67,0.25)":isTrip?"rgba(0,229,255,0.1)":"rgba(169,70,29,0.52)";
  const divLine=isDream?"rgba(255,159,67,0.4)":isTrip?"rgba(0,229,255,0.35)":"rgba(255,159,67,0.4)";

  // Console nav buttons — only shown on trip/pack consoles
  const TripBtn = ({active}) => (
    <button onClick={active ? undefined : onTripConsole} style={{
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
      padding:isMobile?"5px 8px":"6px 12px",borderRadius:7,
      border:active?"1px solid rgba(0,229,255,0.55)":"1px solid rgba(0,229,255,0.25)",
      background:active?"rgba(0,229,255,0.08)":"rgba(0,229,255,0.03)",
      color:active?"#00E5FF":"rgba(0,229,255,0.45)",
      cursor:active?"default":"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,
      animation:active?"none":"consolePulse 3s ease-in-out infinite",
      minHeight:isMobile?34:38,minWidth:isMobile?52:64,flexShrink:0,
      boxShadow:active?"0 0 10px rgba(0,229,255,0.15)":"none",
      transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",
    }}>
      <span style={{fontSize:isMobile?13:15,lineHeight:1}}>🔭</span>
      <span style={{fontSize:isMobile?7:8,letterSpacing:1.5,whiteSpace:"nowrap"}}>{isMobile?"TRIP":"TRIP"}</span>
    </button>
  );
  const PackBtn = ({active}) => (
    <button onClick={active ? undefined : onPackConsole} style={{
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
      padding:isMobile?"5px 8px":"6px 12px",borderRadius:7,
      border:active?"1px solid rgba(196,87,30,0.65)":"1px solid rgba(196,87,30,0.28)",
      background:active?"rgba(196,87,30,0.1)":"rgba(196,87,30,0.03)",
      color:active?"#FF9F43":"rgba(255,159,67,0.4)",
      cursor:active?"default":"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,
      animation:active?"none":"launchPulse 3s ease-in-out infinite",
      minHeight:isMobile?34:38,minWidth:isMobile?52:64,flexShrink:0,
      boxShadow:active?"0 0 10px rgba(196,87,30,0.2)":"none",
      transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",
    }}>
      <span style={{fontSize:isMobile?13:15,lineHeight:1}}>🎒</span>
      <span style={{fontSize:isMobile?7:8,letterSpacing:1.5,whiteSpace:"nowrap"}}>{isMobile?"PACK":"PACK"}</span>
    </button>
  );

  return (
    <>
    <div style={{background:bg,borderBottom:`1px solid ${bc}`,backdropFilter:"blur(10px)",flexShrink:0}}>
      {/* Top row: [left slot] [center: logo+wordmark] [right slot] */}
      <div style={{display:"flex",alignItems:"center",padding:isMobile?"5px 8px":"7px 14px",gap:6}}>
        {/* Left slot */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",gap:2}}>
          {(!isMobile&&(isTrip||isPack)) ? <TripBtn active={isTrip}/> : null}
          {screenLabel&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.45)",letterSpacing:2,textTransform:"uppercase",paddingLeft:2}}>{screenLabel}</div>}
        </div>
        {/* Center: logo + wordmark */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
          <SharegoodLogo size={isMobile?30:42} opacity={0.88} glowColor={logoGlow} animate={false}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:18,fontWeight:500,color:"#FFF",letterSpacing:3,lineHeight:1}}>1 Bag Nomad</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:3}}>
              <div style={{width:3,height:3,borderRadius:"50%",background:dot,boxShadow:`0 0 6px ${dot}`}}/>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:300,fontStyle:"italic",fontSize:isMobile?8:10,color:sub,letterSpacing:1.5}}>Sharegood Co.</div>
            </div>
          </div>
        </div>
        {/* Right slot */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
          {(!isMobile&&(isTrip||isPack)) ? <PackBtn active={isPack}/> : (isMobile&&(isTrip||isPack)) ? (
            <button onClick={()=>setProfileOpen(true)} className="tap-scale" style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${isPack?"rgba(255,159,67,0.45)":"rgba(0,229,255,0.45)"}`,background:isPack?"rgba(255,159,67,0.08)":"rgba(0,229,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,boxShadow:isPack?"0 0 12px rgba(255,159,67,0.12)":"0 0 12px rgba(0,229,255,0.12)"}}>
              <span style={{fontSize:16,lineHeight:1}}>👤</span>
            </button>
          ) : rightSlot||null}
        </div>
      </div>
      {/* Tagline bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:isMobile?10:28,padding:isMobile?"10px 14px":"14px 32px",borderTop:`1px solid ${bc}`,border:'1px solid rgba(255,159,67,0.35)',borderTopColor:'rgba(255,159,67,0.55)',borderRadius:isMobile?8:0,margin:isMobile?'0 8px':0,background:`linear-gradient(90deg,transparent,${isDream?"rgba(32,15,0,0.75)":isTrip?"rgba(0,20,45,0.65)":"rgba(40,16,0,0.65)"},transparent)`,boxShadow:'inset 0 1px 0 rgba(255,159,67,0.40),inset 0 -1px 0 rgba(255,159,67,0.08)',position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"80%",height:80,background:`radial-gradient(ellipse,${radial} 0%,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:dbSize,fontWeight:isMobile?700:dbWeight,color:dbColor,letterSpacing:isMobile?0:7,lineHeight:1,whiteSpace:"nowrap",textShadow:isDream?"0 0 32px rgba(255,217,61,0.7),0 0 64px rgba(169,70,29,0.4)":"none",position:"relative",textTransform:"uppercase"}}>Dream Big</div>
        <div style={{width:1,height:isMobile?22:30,background:`linear-gradient(180deg,transparent,${divLine},transparent)`,flexShrink:0}}/>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:tlSize,fontWeight:isPack?300:100,fontStyle:"italic",color:tlColor,letterSpacing:isMobile?0:8,lineHeight:1,whiteSpace:"nowrap",position:"relative",textShadow:tlShadow}}>travel light</div>
      </div>
      {children}
    </div>
    {isMobile&&(isTrip||isPack)&&<BottomSheet open={profileOpen} onClose={()=>setProfileOpen(false)} zIndex={700}>
      <div style={{padding:"24px 20px 32px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,marginBottom:28}}>
          <div style={{width:72,height:72,borderRadius:"50%",border:"2px solid rgba(255,217,61,0.4)",background:"rgba(255,217,61,0.06)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 28px rgba(255,217,61,0.12)"}}>
            <span style={{fontSize:32}}>👤</span>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,fontStyle:"italic",color:"#FFF",letterSpacing:1}}>1 Bag Nomad</div>
              <div style={{padding:"2px 8px",borderRadius:12,background:"rgba(255,217,61,0.15)",border:"1px solid rgba(255,217,61,0.4)",fontSize:9,fontWeight:700,letterSpacing:2,color:"#FFD93D",fontFamily:"'Space Mono',monospace"}}>PRO</div>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontFamily:"'Space Mono',monospace",letterSpacing:1}}>explorer@1bagnomad.com</div>
          </div>
        </div>
        {[
          {icon:"⚙️",label:"Settings",sub:"Preferences, units, notifications"},
          {icon:"🌐",label:"Your Trips",sub:"View all expeditions"},
          {icon:"💳",label:"Subscription",sub:"1 Bag Nomad Pro · Active"},
          {icon:"🚪",label:"Sign Out",sub:"See you on the road",danger:true},
        ].map(row=>(
          <div key={row.label} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 4px",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer"}}>
            <span style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{row.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:row.danger?"#FF6B6B":"rgba(255,255,255,0.88)",fontFamily:"'Space Mono',monospace",letterSpacing:0.5}}>{row.label}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2,fontFamily:"'Space Mono',monospace"}}>{row.sub}</div>
            </div>
            {!row.danger&&<span style={{fontSize:16,color:"rgba(255,255,255,0.18)"}}>›</span>}
          </div>
        ))}
        {/* Help row */}
        <div onClick={()=>setHelpOpen(h=>!h)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 4px",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer"}}>
          <span style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>❓</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.88)",fontFamily:"'Space Mono',monospace",letterSpacing:0.5}}>Help</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2,fontFamily:"'Space Mono',monospace"}}>How to navigate the app</div>
          </div>
          <span style={{fontSize:14,color:"rgba(255,255,255,0.30)",transition:"transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",display:"inline-block",transform:helpOpen?"rotate(90deg)":"rotate(0deg)"}}>›</span>
        </div>
        {helpOpen&&<div style={{background:"rgba(0,229,255,0.03)",border:"1px solid rgba(0,229,255,0.10)",borderRadius:10,padding:"14px 16px",marginTop:4,marginBottom:8,display:"flex",flexDirection:"column",gap:12}}>
          {[
            {icon:"🧭",title:"Trip Console",tip:"Tap any phase card to expand it. Tap a segment inside to plan transport, stay, activities, food and more."},
            {icon:"📋",title:"Bottom Tabs",tip:"TRIP · BUDGET · BOOK · INTEL each show a different view of your expedition. PACK switches to your gear console."},
            {icon:"🎒",title:"Pack Console",tip:"Tap a category to browse items. Check the box on any item once you own it. Use NEED TO BUY for your shopping list."},
            {icon:"🔭",title:"Intel Tab",tip:"Ask your co-architect anything about your destinations — visa rules, weather, dive conditions, local tips."},
            {icon:"✏️",title:"Revise Trip",tip:"Tap REVISE at any time to edit your trip dates, countries, budget or travel style with the Co-Architect planner."},
          ].map(h=>(
            <div key={h.title} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{h.icon}</span>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(0,229,255,0.75)",fontFamily:"'Space Mono',monospace",letterSpacing:1,marginBottom:2}}>{h.title}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",fontFamily:"'Space Mono',monospace",lineHeight:1.6}}>{h.tip}</div>
              </div>
            </div>
          ))}
        </div>}
      </div>
    </BottomSheet>}
    </>
  );
}

// ─── BottomNav ─────────────────────────────────────────────────────
function BottomNav({activeTab,onTab}) {
  const NAV=[
    {id:"next",  icon:"🧭",lbl:"TRIP",   glowColor:"rgba(0,229,255,0.6)",   glowFaint:"rgba(0,229,255,0.2)"},
    {id:"budget",icon:"💰",lbl:"BUDGET", glowColor:"rgba(255,255,255,0.4)", glowFaint:"rgba(255,255,255,0.15)"},
    {id:"book",  icon:"✈️", lbl:"BOOK",   glowColor:"rgba(255,255,255,0.4)", glowFaint:"rgba(255,255,255,0.15)"},
    {id:"intel", icon:"🔭",lbl:"INTEL",  glowColor:"rgba(255,255,255,0.4)", glowFaint:"rgba(255,255,255,0.15)"},
    {id:"pack",  icon:"🎒",lbl:"PACK",   glowColor:"rgba(255,159,67,0.6)",   glowFaint:"rgba(255,159,67,0.2)"},
  ];
  return(
    <div className="bnav">
      {NAV.map(n=>{
        const active=activeTab===n.id;
        const isPack=n.id==="pack";
        const pipColor=isPack?"#FF9F43":"#FFD93D";
        const borderColor=n.id==="next"?"rgba(0,229,255,0.90)":n.id==="pack"?"rgba(255,159,67,0.90)":"rgba(255,255,255,0.60)";
        const activeGlow=n.id==="next"
          ?'0 -3px 12px rgba(0,229,255,0.45),0 -1px 6px rgba(0,229,255,0.25)'
          :n.id==="pack"
          ?'0 -3px 12px rgba(255,159,67,0.45),0 -1px 6px rgba(255,159,67,0.25)'
          :'0 -3px 10px rgba(255,255,255,0.20)';
        return(
          <button key={n.id} className={`bnav-btn${isPack?" bnav-pack":""}${active?" active":""}`} onClick={()=>onTab(n.id)}
            style={active?{
              borderTop:`2px solid ${borderColor}`,
              marginTop:'-2px',
              boxShadow:activeGlow,
            }:undefined}>
            <div className="bnav-pip" style={{background:pipColor,boxShadow:active?`0 0 8px ${pipColor}`:undefined}}/>
            <span className="bnav-icon">{n.icon}</span>
            <span className="bnav-lbl">{n.lbl}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── BottomSheet ──────────────────────────────────────────────────
function BottomSheet({open,onClose,children,zIndex=400,hideClose=false}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    if(open){requestAnimationFrame(()=>requestAnimationFrame(()=>setVisible(true)));}
    else{setVisible(false);}
  },[open]);
  useEffect(()=>{
    if(open){
      const y=window.scrollY;
      document.body.style.overflow='hidden';
      document.body.style.position='fixed';
      document.body.style.width='100%';
      document.body.style.top=`-${y}px`;
    } else {
      const top=document.body.style.top;
      document.body.style.overflow='';
      document.body.style.position='';
      document.body.style.width='';
      document.body.style.top='';
      if(top)window.scrollTo(0,-parseInt(top));
    }
    return()=>{
      const top=document.body.style.top;
      document.body.style.overflow='';
      document.body.style.position='';
      document.body.style.width='';
      document.body.style.top='';
      if(top)window.scrollTo(0,-parseInt(top));
    };
  },[open]);
  if(!open)return null;
  return(
    <div style={{position:'fixed',inset:0,zIndex,display:'flex',flexDirection:'column',justifyContent:'flex-end'}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.72)'}}/>
      <div onClick={e=>e.stopPropagation()}
        style={{position:'relative',background:'#1C1208',borderRadius:'20px 20px 0 0',border:'1px solid rgba(212,180,120,0.08)',maxHeight:'90vh',display:'flex',flexDirection:'column',paddingBottom:'env(safe-area-inset-bottom)',transform:visible?'translateY(0)':'translateY(100%)',transition:visible?'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)':'none',boxShadow:'inset 0 1px 0 rgba(255,180,80,0.35),inset 1px 0 0 rgba(255,140,40,0.12),inset -1px 0 0 rgba(255,140,40,0.12),inset 0 -1px 0 rgba(255,100,20,0.08)'}}>
        {!hideClose&&<button onClick={onClose} style={{position:'absolute',top:20,right:20,width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1,flexShrink:0}}>
          <span style={{fontSize:16,color:'rgba(255,255,255,0.7)',lineHeight:1}}>✕</span>
        </button>}
        <div style={{height:16,flexShrink:0}}/>
        <div style={{overflowY:'auto',flex:1,WebkitOverflowScrolling:'touch'}}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── GenerationScreen ─────────────────────────────────────────────
function GenerationScreen({onComplete}) {
  const [ph,setPh]=useState(1),[prog,setProg]=useState(0),[mi,setMi]=useState(0);
  const msgs=["Reading your vision...","Mapping the route...","Calculating phases...","Bringing it to life..."];
  useEffect(()=>{
    const ts=[setTimeout(()=>setPh(1),0),setTimeout(()=>setMi(1),1800),setTimeout(()=>setMi(2),3600),setTimeout(()=>setMi(3),5400),setTimeout(()=>{setProg(100);onComplete?.();},7000)];
    return()=>ts.forEach(clearTimeout);
  },[]);
  useEffect(()=>{
    const iv=setInterval(()=>setProg(p=>Math.min(p+Math.random()*3+0.5,94)),100);
    setTimeout(()=>clearInterval(iv),6800); return()=>clearInterval(iv);
  },[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"radial-gradient(ellipse at 40% 30%,#2d1200 0%,#1a0900 30%,#0a0400 65%,#040100 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"5%",left:"50%",width:700,height:500,background:"radial-gradient(ellipse,rgba(169,70,29,0.5) 0%,transparent 65%)",animation:"ambientGlow 3s ease-in-out infinite",transform:"translateX(-50%)",pointerEvents:"none"}}/>
      <div style={{animation:"logoPulse 2.4s ease-in-out infinite",marginBottom:36,zIndex:1}}><SharegoodLogo size={180} animate={false} glowColor="rgba(169,70,29,0.52)" opacity={0.9}/></div>
      <div key={mi} style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:100,fontStyle:"italic",color:"rgba(255,255,255,0.92)",letterSpacing:1,marginBottom:10,animation:"fadeUp 0.5s ease",textAlign:"center",zIndex:1,opacity:1}}>{msgs[mi]}</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.5)",letterSpacing:3,marginBottom:40,textAlign:"center",zIndex:1}}>The co-architect is working its magic ✦</div>
      <div style={{width:260,zIndex:1}}>
        <div style={{height:3,background:"rgba(255,255,255,0.07)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:2,background:"linear-gradient(90deg,#A9461D,#FFD93D,#A9461D)",backgroundSize:"200% 100%",width:prog+"%",transition:"width 0.3s ease",animation:"shimmerBar 2s linear infinite"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:15,color:"rgba(255,255,255,0.2)",letterSpacing:2}}><span>BUILDING</span><span>{Math.round(prog)}%</span></div>
      </div>
    </div>
  );
}

// ─── DreamScreen ──────────────────────────────────────────────────
function DreamHeader({step,screenLabel}) {
  const isMobile=useMobile();
  const pillColors=["#00E5FF","#69F0AE","#A29BFE","#FFD93D"];const pills=<div style={{display:"flex",gap:5,alignItems:"center"}}>{[1,2,3,4].map(n=><div key={n} style={{width:n===step?28:18,height:6,borderRadius:3,background:n<step?pillColors[n-1]+"88":n===step?pillColors[n-1]:"rgba(255,255,255,0.08)",boxShadow:n===step?`0 0 10px ${pillColors[n-1]}66`:"none",transition:"all 0.3s ease"}}/>)}</div>;
  return <ConsoleHeader console="dream" isMobile={isMobile} rightSlot={pills} screenLabel={screenLabel}/>;
}

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
  const [travelerGroup,setTravelerGroup]=useState("solo");
  const [travelStyle,setTravelStyle]=useState("");
  const [interests,setInterests]=useState([]);
  const [specialtyInterests,setSpecialtyInterests]=useState([]);
  const [specialtyOpen,setSpecialtyOpen]=useState(false);
  useEffect(()=>{
    const ts=[setTimeout(()=>setHeroPhase(1),400),setTimeout(()=>setHeroPhase(2),1200),setTimeout(()=>setHeroPhase(3),2100),setTimeout(()=>setHeroPhase(4),3000)];
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
    const budgetConstraint=hasBudget?`⚠️ BUDGET ALLOCATION DIRECTIVE:\nThe traveler's total budget is $${budgetAmount}. This is a SPEND TARGET, not a ceiling to stay under.\nYour job is to ALLOCATE this $${budgetAmount} across the phases — not to estimate what the trip "might" cost.\n- Divide $${budgetAmount} proportionally across phases based on nights and destination cost-of-living\n- A ${bAmt>=25000?"LUXURY":""}${bAmt>=10000&&bAmt<25000?"HIGH-END":""}${bAmt>=3000&&bAmt<10000?"MID-RANGE":""}${bAmt<3000?"BUDGET":""} trip: choose accommodations and experiences that would realistically spend this amount\n- The sum of all phase "budget" fields MUST equal approximately $${budgetAmount}\n- "totalBudget" in your JSON MUST be set to ${budgetAmount}\n`:"NO BUDGET SET — set totalBudget to 0.";
    const allInterests=[...interests,...specialtyInterests];
    const specialtyRules=specialtyInterests.length>0?`\n${specialtyInterests.includes('fishing')?'- If "Fishing": prioritize coastal/offshore destinations, weight activities toward charters and water time, suggest fishing lodge accommodation\n':''}${specialtyInterests.includes('nightlife')?'- If "Nightlife": prioritize cities with strong nightlife scenes, suggest late-morning starts, accommodation near action\n':''}${specialtyInterests.includes('music')?'- If "Music/Festivals": build itinerary around festival dates, suggest shoulder accommodation strategy\n':''}${specialtyInterests.includes('wine')?'- If "Wine Tourism": weight vineyard regions, include cellar door experiences, suggest harvest season timing\n':''}${specialtyInterests.includes('skiing')?'- If "Skiing/Snow": weight mountain resort destinations, check snow season dates\n':''}${specialtyInterests.includes('fishing')||specialtyInterests.includes('camping')?'- If "Camping/Fishing": suggest dawn departures, remote accommodation options\n':''}${specialtyInterests.includes('yoga')?'- If "Yoga Retreat": include wellness centers, suggest peaceful accommodation\n':''}`:'';
    const travelerConstraints=`TRAVELER PROFILE — HARD CONSTRAINTS:\n- Traveling party: ${travelerGroup==='couple'?'Couple or 2 friends traveling together — budget covers both people, activities and accommodation for 2':'Solo traveler'}\n- Travel style: ${travelStyle||'Independent explorer'}${hasBudget?`\n- Budget: $${budgetAmount} FIRM — reflects total spend for the traveling party`:''}\n${nightCount?`- Nights: ${nightCount} — do not deviate`:''}\n${allInterests.length>0?`- Interests: ${allInterests.join(', ')} — weight destinations and activities toward these\n`:''}- If "First Timer": 1-2 countries max, beginner-friendly destinations, simple logistics, reassuring tone\n- If "Luxury": 5-star properties, premium experiences, business class\n- If "Couple/2 friends": romantic or buddy-trip framing as appropriate, experiences that work for two${specialtyRules}`;
    try {
      const breakdownSchema=hasBudget?`,"budgetBreakdown":{"flights":NUMBER,"accommodation":NUMBER,"food":NUMBER,"transport":NUMBER,"activities":NUMBER,"buffer":NUMBER,"flightsNote":"flight routing e.g. LAX → Lisbon return","accommodationNote":"e.g. Guesthouses and boutique hotels","foodNote":"e.g. Local restaurants and cafes","routingNote":"one sentence explaining WHY this route was chosen — the key routing decision in plain English, why these destinations in this order"}`:'';
      const packSchema=`,"packProfile":{"categories":["clothes","tech","documents","travel","health"],"hiddenCategories":["dive","creator"],"tripType":"culture","climate":"mediterranean","season":"dry","tempRange":"18-28C","activities":["city-walking","fine-dining"],"duration":"medium","essentialItems":["walking shoes","universal adapter"],"optionalItems":["wetsuit","down jacket"]}`;
      const basePrompt=`${travelerConstraints}\n\n${budgetConstraint}\nElite travel co-architect. Vision:"${vision}". Trip:"${tripName||"My Expedition"}". From:"${city||"unknown"}". Departs:"${date||"flexible"}". Returns:"${returnDate||"open-ended"}". ${nightsDirective} Return ONLY valid JSON:{"narrative":"3 vivid sentences","vibe":"3 words separated by · ","phases":[{"destination":"City","country":"Country","nights":7,"type":"Culture","why":"one sentence","flag":"🌍","budget":NUMBER}],"totalNights":0,"totalBudget":${hasBudget?budgetAmount:'0'},"countries":0,"highlight":"most exciting moment","goalLabel":"inferred goal type"${breakdownSchema}${packSchema}}${hasBudget?`\n\nREMINDER: "totalBudget" MUST be ${budgetAmount}. Each phase "budget" is that phase's share of $${budgetAmount}. The budgetBreakdown fields (flights, accommodation, food, transport, activities, buffer) must sum to approximately $${budgetAmount}. Distribute realistically based on destination costs, trip length, and accommodation tier. Do NOT estimate from scratch — ALLOCATE the stated budget.`:''}
packProfile must reflect the actual generated itinerary. categories should include only what this specific traveler needs. essentialItems should name specific gear critical for the trip (e.g. "BCD", "wetsuit", "hiking boots", "down jacket"). optionalItems should name items unnecessary for this trip.`;
      let raw=await askAI(basePrompt,2800);
      let parsed=parseJSON(raw);
      console.log('[1BN] AI budgetBreakdown returned:',parsed?.budgetBreakdown||'MISSING');
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
      // Synthesize packProfile if AI omitted it
      if(parsed&&!parsed.packProfile){
        console.log('[1BN] packProfile missing from AI — synthesizing from trip data');
        const phTypes=(parsed.phases||[]).map(p=>(p.type||'').toLowerCase());
        const hasDive=phTypes.includes('dive')||interests.includes('diving')||data.selectedGoal==='diver';
        const hasTrek=phTypes.includes('trek')||interests.includes('adventure');
        const hasCreator=interests.includes('vlog');
        const hasMoto=interests.includes('moto');
        const hasSafari=interests.includes('safari');
        const cats=["clothes","tech","travel","health","docs"];
        const hidden=[];
        const tripType=phTypes[0]||"culture";
        const isNonAdventure=["music","culture","nomad","city"].includes(tripType);
        if(hasDive)cats.push("dive");else hidden.push("dive");
        if(hasCreator)cats.push("creator");else hidden.push("creator");
        if(hasMoto){cats.push("moto");} if(hasSafari){cats.push("safari");} if(hasTrek){cats.push("adventure");}
        if(isNonAdventure){if(!hasDive)hidden.push("scuba");hidden.push("skiing","climbing");}
        const tn=(parsed.phases||[]).reduce((s,p)=>s+(p.nights||0),0);
        const dur=tn<14?"short":tn<=30?"medium":"long";
        const tropical=["thailand","indonesia","philippines","maldives","honduras","belize","costa rica","vietnam","malaysia","india","mexico","barbados","tanzania"];
        const cold=["iceland","norway","switzerland","japan","nepal"];
        const dests=(parsed.phases||[]).map(p=>(p.country||'').toLowerCase());
        const climate=dests.some(d=>tropical.some(t=>d.includes(t)))?"tropical-hot":dests.some(d=>cold.some(c=>d.includes(c)))?"temperate-cool":"mediterranean";
        const acts=[];
        if(hasDive){acts.push("diving","snorkeling");} if(hasTrek)acts.push("trekking"); acts.push("city-walking");
        if(travelStyle==="Luxury")acts.push("fine-dining"); if(interests.includes('food'))acts.push("fine-dining");
        if(interests.includes('wellness'))acts.push("yoga");
        const essential=["passport","universal adapter"];
        if(hasDive){essential.push("mask","dive computer","reef-safe sunscreen");} if(hasTrek)essential.push("hiking boots","rain jacket"); if(climate==="tropical-hot")essential.push("sunscreen","insect repellent");
        parsed.packProfile={categories:cats,hiddenCategories:hidden,tripType:phTypes[0]||"culture",climate,season:"dry",tempRange:climate==="tropical-hot"?"28-35C":climate==="temperate-cool"?"10-18C":"18-28C",activities:[...new Set(acts)],duration:dur,essentialItems:essential,optionalItems:hasDive?[]:["wetsuit","dive computer","BCD"]};
      }
      console.log('[1BN] packProfile:',parsed?.packProfile);
      if(parsed){setLogoState("done");setTimeout(()=>setLogoState("idle"),600);setVisionData({visionData:parsed,selectedGoal:"custom",vision,tripName:tripName||"My Expedition",city,date,returnDate,budgetMode,budgetAmount,travelerProfile:{group:travelerGroup,style:travelStyle,interests,specialtyInterests}});}
      else{setLogoState("error");setTimeout(()=>setLogoState("idle"),2000);setLoadError(true);setLoading(false);}
    } catch(e){setLogoState("error");setTimeout(()=>setLogoState("idle"),2000);setLoadError(true);setLoading(false);}
  }
  if(visionData) return <VisionReveal data={visionData} onBuild={vd=>onGoGen(visionData,vd)} onBack={()=>{setVisionData(null);setLoading(false);}} freshMount={true}/>;
  return (
    <div className="dream-root">
      <div className="dream-glow"/>
      <DreamHeader step={1}/>
      <div className="dream-content">
        <div style={{textAlign:"center",marginBottom:isMobile?20:28,animation:"fadeUp 0.6s ease"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:8}}>
            <SharegoodLogo size={isMobile?72:96} animate={true} logoState={logoState} glowColor={loading?"rgba(0,229,255,0.7)":"rgba(0,229,255,0.3)"} opacity={loading?1:0.92}/>
            {loading&&<div key={hintIdx} style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,159,67,0.65)",marginTop:10,animation:"hintFade 2.5s ease forwards",textAlign:"center",letterSpacing:0.5}}>{GENERATION_HINTS[hintIdx]}</div>}
          </div>
          <div style={{minHeight:isMobile?80:110}}>
            {heroPhase>=1&&<div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?28:38,fontWeight:100,color:"rgba(255,255,255,0.88)",lineHeight:1.15,letterSpacing:2,animation:"slideUp 0.7s cubic-bezier(0.22,1,0.36,1) both"}}>Your expedition</div>}
            {heroPhase>=2&&<div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?28:38,fontWeight:300,color:"#FFF",lineHeight:1.15,letterSpacing:1,animation:"slideUp 0.7s cubic-bezier(0.22,1,0.36,1) both"}}>starts now.</div>}
            {heroPhase>=3&&<div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?30:44,fontWeight:300,fontStyle:"italic",color:"#FFD93D",lineHeight:1.2,marginTop:10,letterSpacing:3,animation:"slideUp 0.8s cubic-bezier(0.22,1,0.36,1) both",textShadow:"0 0 24px rgba(0,120,255,0.25)"}}>Let's go.</div>}
          </div>
          {heroPhase>=4&&<p style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:16,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.75)",lineHeight:1.6,marginTop:12,animation:"fadeUp 0.8s ease both"}}>Every expedition starts with a feeling — tell me what's driving yours.</p>}
        </div>
        <div style={{marginBottom:28}}>
          <div className="sec-label">WHAT'S <span style={{color:"#FFD93D",fontWeight:900}}>YOUR</span> VISION?</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:14,fontStyle:"italic",fontWeight:300,color:"rgba(255,159,67,0.6)",marginBottom:10,lineHeight:1.6}}>Describe the expedition you've always imagined — the countries, the feeling, who you want to become out there.</div>
          <textarea className="vision-ta" style={{animation:focused?"none":"visionGlow 3.5s ease-in-out infinite"}} value={vision} onChange={e=>{if(vision.length===0&&e.target.value.length>0)posthog.capture("vision_started");setVision(e.target.value);}} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={"Speak from the heart. Don\u2019t say where you want to go \u2014 say how you want to FEEL. The reefs you need to dive. The city you need to disappear into. The road that\u2019s been calling you. The version of yourself you\u2019re chasing. The more passion you pour in, the more magic your co-architect returns."} rows={isMobile?5:6}/>
          {!canLaunch&&!vision&&<div style={{textAlign:'center',marginTop:8,fontFamily:"'Fraunces',serif",fontSize:11,fontStyle:'italic',color:'rgba(255,159,67,0.45)',lineHeight:1.5}}>✦ The more emotion you bring, the better your expedition becomes</div>}
          {canLaunch&&<div style={{marginTop:8,fontFamily:"'Fraunces',serif",fontSize:isMobile?13:14,fontStyle:"italic",color:"rgba(105,240,174,0.75)",animation:"fadeUp 0.4s ease",textShadow:"0 0 20px rgba(105,240,174,0.2)"}}>✦ Your co-architect is ready to build this.</div>}
        </div>
        <div style={{marginBottom:28,borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:24}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>TRAVELER BRIEF</div>
          <div style={{marginBottom:12,border:travelerGroup?"1px solid rgba(255,159,67,0.20)":"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px 16px",background:"rgba(255,255,255,0.02)",transition:"border 0.3s ease"}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>WHO'S GOING</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[{id:"solo",label:"Solo"},{id:"couple",label:"Couple / 2 Friends"}].map(g=>(
                <button key={g.id} onClick={()=>setTravelerGroup(g.id)} style={{padding:"9px 18px",borderRadius:24,border:travelerGroup===g.id?"1.5px solid rgba(255,159,67,0.90)":"1px solid rgba(255,255,255,0.32)",background:travelerGroup===g.id?"rgba(255,159,67,0.10)":"transparent",color:travelerGroup===g.id?"#FFD93D":"rgba(255,255,255,0.75)",fontSize:13,fontFamily:"'Space Mono',monospace",fontWeight:travelerGroup===g.id?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:40,userSelect:"none",boxShadow:travelerGroup===g.id?"0 0 10px rgba(255,159,67,0.25)":"0 0 6px rgba(255,255,255,0.06)"}}>{g.label}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12,border:travelStyle?"1px solid rgba(255,159,67,0.20)":"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px 16px",background:"rgba(255,255,255,0.02)",transition:"border 0.3s ease"}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>YOUR TRAVEL STYLE</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {["First Timer","Independent Explorer","Comfort & Quality","Adventure First","Luxury"].map(s=>(
                <button key={s} onClick={()=>setTravelStyle(v=>v===s?"":s)} style={{padding:"9px 18px",borderRadius:24,border:travelStyle===s?"1.5px solid rgba(255,159,67,0.90)":"1px solid rgba(255,255,255,0.32)",background:travelStyle===s?"rgba(255,159,67,0.10)":"transparent",color:travelStyle===s?"#FFD93D":"rgba(255,255,255,0.70)",fontSize:13,fontFamily:"'Space Mono',monospace",fontWeight:travelStyle===s?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:40,userSelect:"none",boxShadow:travelStyle===s?"0 0 10px rgba(255,159,67,0.25)":"0 0 6px rgba(255,255,255,0.06)"}}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12,border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"12px 16px",background:"transparent",transition:"border 0.3s ease"}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>INTERESTS <span style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",fontWeight:300,color:"rgba(255,159,67,0.50)",fontSize:13,textTransform:"none"}}>· optional</span></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {[{id:"diving",icon:"🤿",label:"Diving"},{id:"culture",icon:"🌍",label:"Culture"},{id:"vlog",icon:"🎥",label:"Vlog"},{id:"food",icon:"🍜",label:"Food & Wine"},{id:"adventure",icon:"🥾",label:"Adventure"},{id:"golf",icon:"⛳",label:"Golf"},{id:"wellness",icon:"🧘",label:"Wellness"},{id:"remote",icon:"💻",label:"Remote Work"},{id:"safari",icon:"🦁",label:"Safari"}].map(c=>{const on=interests.includes(c.id);return(
                <button key={c.id} onClick={()=>setInterests(p=>on?p.filter(x=>x!==c.id):[...p,c.id])} style={{padding:"6px 14px",borderRadius:20,border:on?"1.5px solid rgba(255,159,67,0.80)":"1px solid rgba(255,255,255,0.30)",background:on?"rgba(255,159,67,0.08)":"transparent",color:on?"#FF9F43":"rgba(255,255,255,0.70)",fontSize:13,fontFamily:"'Space Mono',monospace",fontWeight:on?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:40,userSelect:"none",boxShadow:on?"0 0 10px rgba(255,159,67,0.22)":"0 0 6px rgba(255,255,255,0.05)"}}>{c.icon} {c.label}</button>
              );})}
              <button onClick={()=>setSpecialtyOpen(o=>!o)} style={{padding:"6px 14px",borderRadius:20,border:specialtyInterests.length>0?"1.5px solid rgba(255,217,61,0.90)":specialtyOpen?"1.5px solid rgba(255,217,61,0.55)":"1px solid rgba(255,217,61,0.40)",background:specialtyInterests.length>0?"rgba(255,217,61,0.08)":"transparent",color:specialtyInterests.length>0?"#FFD93D":specialtyOpen?"rgba(255,217,61,0.75)":"rgba(255,217,61,0.60)",fontSize:13,fontFamily:"'Space Mono',monospace",fontWeight:specialtyInterests.length>0?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:40,userSelect:"none",boxShadow:specialtyInterests.length>0?"0 0 10px rgba(255,217,61,0.25)":"0 0 6px rgba(255,217,61,0.10)"}}>✦ Specialty{specialtyInterests.length>0?` (${specialtyInterests.length})`:"..."}</button>
            </div>
            <div style={{maxHeight:specialtyOpen?300:0,overflow:"hidden",transition:"max-height 0.28s ease-out"}}>
              <div style={{marginTop:8,border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"12px 14px",background:"rgba(255,255,255,0.015)"}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"rgba(255,159,67,0.85)",letterSpacing:2,marginBottom:8}}>SPECIALTY INTERESTS <span style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",fontWeight:300,color:"rgba(255,159,67,0.50)",fontSize:13}}>· optional</span></div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {[{id:"fishing",icon:"🎣",label:"Fishing"},{id:"climbing",icon:"🧗",label:"Climbing"},{id:"skiing",icon:"🎿",label:"Skiing/Snow"},{id:"nightlife",icon:"🎉",label:"Nightlife"},{id:"music",icon:"🎵",label:"Music/Festivals"},{id:"shopping",icon:"🛍️",label:"Shopping"},{id:"wine",icon:"🍷",label:"Wine Tourism"},{id:"eco",icon:"🌿",label:"Eco Travel"},{id:"photography",icon:"🎨",label:"Photography"},{id:"camping",icon:"🏕️",label:"Camping"},{id:"yoga",icon:"🤸",label:"Yoga Retreat"},{id:"watersports",icon:"🏄",label:"Water Sports"}].map(c=>{const on=specialtyInterests.includes(c.id);return(
                    <button key={c.id} onClick={()=>setSpecialtyInterests(p=>on?p.filter(x=>x!==c.id):[...p,c.id])} style={{padding:"5px 12px",borderRadius:20,border:on?"1.5px solid rgba(255,159,67,0.80)":"1px solid rgba(255,255,255,0.30)",background:on?"rgba(255,159,67,0.08)":"transparent",color:on?"#FF9F43":"rgba(255,255,255,0.68)",fontSize:13,fontFamily:"'Space Mono',monospace",fontWeight:on?600:400,cursor:"pointer",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:40,userSelect:"none",boxShadow:on?"0 0 10px rgba(255,159,67,0.22)":"0 0 5px rgba(255,255,255,0.05)"}}>{c.icon} {c.label}</button>
                  );})}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="sec-label">EXPEDITION DETAILS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:22}}>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">JOURNEY NAME</div><input className="f-input" value={tripName} onChange={e=>setTripName(e.target.value)} placeholder="My Grand Expedition" style={{borderColor:"rgba(0,229,255,0.72)",boxShadow:"0 0 14px rgba(0,229,255,0.18),0 0 32px rgba(0,229,255,0.07)"}}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">DEPARTS FROM</div><CityInput className="f-input" value={city} onChange={v=>setCity(v)} placeholder="Los Angeles, CA" style={{borderColor:"rgba(255,217,61,0.72)",boxShadow:"0 0 14px rgba(255,217,61,0.18),0 0 32px rgba(255,217,61,0.07)"}}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">TARGET START DATE</div><div style={{position:"relative"}}><input type="date" className="f-input" value={date} onChange={e=>setDate(e.target.value)} style={{colorScheme:"dark",color:(!date&&isMobile)?"transparent":undefined,paddingRight:36,borderColor:"rgba(105,240,174,0.72)",boxShadow:"0 0 14px rgba(105,240,174,0.18),0 0 32px rgba(105,240,174,0.07)"}}/>{!date&&isMobile&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 13px",fontFamily:"'Space Mono',monospace",fontSize:12,color:"rgba(255,255,255,0.22)",pointerEvents:"none",letterSpacing:1}}>mm / dd / yyyy<span>📅</span></div>}<div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",fontSize:16,lineHeight:1}}>📅</div></div></div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">RETURN DATE</div><div style={{position:"relative"}}><input type="date" className="f-input" value={returnDate} min={date||undefined} onChange={e=>setReturnDate(e.target.value)} onFocus={()=>{if(!returnDate&&date)setReturnDate(date);}} style={{colorScheme:"dark",color:(!returnDate&&isMobile)?"transparent":undefined,paddingRight:36,borderColor:"rgba(162,155,254,0.72)",boxShadow:"0 0 14px rgba(162,155,254,0.18),0 0 32px rgba(162,155,254,0.07)"}}/>{!returnDate&&isMobile&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 13px",fontFamily:"'Space Mono',monospace",fontSize:12,color:"rgba(255,255,255,0.22)",pointerEvents:"none",letterSpacing:1}}>mm / dd / yyyy<span>📅</span></div>}<div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",fontSize:16,lineHeight:1}}>📅</div></div><div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(162,155,254,0.88)",marginTop:3}}>optional · open-ended</div></div>
        </div>

        <div style={{marginBottom:22}}>
          <div className="f-label" style={{marginBottom:10}}>BUDGET APPROACH</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {[{id:"dream",icon:"💭",label:"Build the dream",sub:"We'll figure budget later",accent:"#69F0AE"},{id:"rough",icon:"💰",label:"I have a rough number",sub:"Give me a ballpark",accent:"#FFD93D"},{id:"strict",icon:"🎯",label:"Keep it under...",sub:"I have a firm limit",accent:"#A29BFE"}].map(b=>(
              <button key={b.id} onClick={()=>setBudgetMode(b.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 13px",borderRadius:9,border:"1px solid "+(budgetMode===b.id?b.accent+"80":"rgba(255,255,255,0.08)"),background:budgetMode===b.id?b.accent+"0D":"rgba(255,255,255,0.02)",cursor:"pointer",textAlign:"left",transition:"all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",minHeight:44,boxShadow:budgetMode===b.id?`0 0 16px ${b.accent}15`:'inset 0 1px 0 rgba(255,180,80,0.22),inset 1px 0 0 rgba(255,140,40,0.08),inset -1px 0 0 rgba(255,140,40,0.08),inset 0 -1px 0 rgba(255,100,20,0.06)'}}>
                <span style={{fontSize:16}}>{b.icon}</span>
                <div><div style={{fontSize:isMobile?13:14,fontWeight:700,color:budgetMode===b.id?b.accent:"#FFF"}}>{b.label}</div><div style={{fontSize:isMobile?12:13,color:"rgba(255,255,255,0.5)",marginTop:2}}>{b.sub}</div></div>
                <div style={{marginLeft:"auto",width:14,height:14,borderRadius:"50%",border:"1.5px solid "+(budgetMode===b.id?b.accent:"rgba(255,255,255,0.15)"),background:budgetMode===b.id?b.accent+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {budgetMode===b.id&&<div style={{width:6,height:6,borderRadius:"50%",background:b.accent}}/>}
                </div>
              </button>
            ))}
          </div>
          {(budgetMode==="rough"||budgetMode==="strict")&&<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}><div className="f-label">{budgetMode==="strict"?"MAX BUDGET ($)":"ROUGH BUDGET ($)"}</div><input className="f-input" type="number" value={budgetAmount} onChange={e=>setBudgetAmount(e.target.value)} placeholder={budgetMode==="strict"?"e.g. 15000":"e.g. 20000"}/></div>}
        </div>
        <button className={"launch-btn "+(loading?"loading":canLaunch?"on":"off")} onClick={handleReveal} style={{minHeight:54,cursor:loading?"wait":canLaunch?"pointer":"default"}}>
          {loading?"✨  BUILDING YOUR EXPEDITION...":"🚀  BUILD MY EXPEDITION"}
        </button>
        {loadError&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.3)",textAlign:"center",fontSize:15,color:"#FF6B6B",letterSpacing:1}}>Connection issue — tap to try again</div>}
        <div style={{textAlign:"center",marginTop:30,paddingTop:20,borderTop:"1px solid rgba(0,229,255,0.1)"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:300,fontStyle:"italic",color:"rgba(162,155,254,0.4)",letterSpacing:2}}>Dream Big. Travel Light.</div>
          <div style={{fontSize:15,color:"rgba(255,255,255,0.15)",letterSpacing:3,marginTop:5}}>A SHAREGOOD COMPANY</div>
          <button onClick={onLoadDemo} style={{marginTop:16,background:"none",border:"1px solid rgba(0,229,255,0.2)",borderRadius:8,color:"rgba(0,229,255,0.5)",fontSize:15,padding:"10px 16px",cursor:"pointer",letterSpacing:2,fontFamily:"'Space Mono',monospace",width:"100%",minHeight:44,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
            🌍 LOAD MY EXPEDITION · Michael's 2026/27 Global Dive
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VisionReveal ─────────────────────────────────────────────────
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
    <div className="dream-root" style={{opacity:mounted?1:0,transition:"opacity 0.5s ease"}}>
      <div className="dream-glow"/>
      <DreamHeader step={2} screenLabel="VISION REVEAL"/>
      <div style={{padding:"22px 18px 44px",maxWidth:640,margin:"0 auto",position:"relative",zIndex:10}}>
        <div className="narrative-card">
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"90%",height:"130%",background:"radial-gradient(ellipse,rgba(169,70,29,0.22) 0%,transparent 68%)",pointerEvents:"none"}}/>
          <div style={{fontSize:15,color:"#C4571E",letterSpacing:3,marginBottom:12,position:"relative"}}>✦ YOUR EXPEDITION VISION</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?15:17,fontWeight:300,fontStyle:"italic",color:"#FFF",lineHeight:1.85,position:"relative",minHeight:80}}>"{narrative}{!narrativeDone&&<span className="hero-cursor">|</span>}"</div>
          {narrativeDone&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:14,position:"relative"}}>{(vd.vibe||"").split(" · ").filter(Boolean).map((w,i)=><span key={i} className="vibe-tag">{w}</span>)}</div>}
        </div>
        {showStats&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16,animation:"fadeUp 0.5s ease"}}>
            {[{label:"COUNTRIES",value:vd.countries,color:"#00E5FF"},{label:"PHASES",value:vd.phases?.length,color:"#FFD93D"},{label:"NIGHTS",value:vd.totalNights,color:"#A29BFE"},{label:"BUDGET",value:fmt(vd.totalBudget||0),color:"#FF9F43"}].map(s=>(
              <div key={s.label} className="stat-card"><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",letterSpacing:1.5,marginBottom:4,fontFamily:"'Space Mono',monospace"}}>{s.label}</div><div style={{fontSize:isMobile?20:22,fontWeight:700,color:s.color}}>{s.value}</div></div>
            ))}
          </div>
        )}
        {narrativeDone&&vd.highlight&&<div style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.18)",borderRadius:11,padding:"10px 12px",marginBottom:18}}><div style={{fontSize:12,color:"#00E5FF",letterSpacing:2.5,marginBottom:7,fontFamily:"'Space Mono',monospace"}}>⚡ EXPEDITION HIGHLIGHT</div><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:300,fontStyle:"italic",color:"#FFF",lineHeight:1.7}}>{vd.highlight}</div></div>}
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
                    <span style={{fontSize:isMobile?11:12,color:"rgba(255,159,67,0.85)",letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700}}>✦ How I built your budget</span>
                    <span style={{fontSize:14,color:"rgba(255,159,67,0.6)",transition:"transform 0.3s",transform:bdOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
                  </button>
                  <div style={{maxHeight:bdOpen?600:0,overflow:"hidden",transition:"max-height 0.3s ease"}}>
                    <div style={{background:"rgba(0,8,20,0.6)",border:"1px solid rgba(169,70,29,0.3)",borderTop:"none",borderRadius:"0 0 11px 11px",padding:"12px 14px"}}>
                      {cats.map(c=>{const val=bd[c.key]||0;return(
                        <div key={c.key} style={{display:"flex",alignItems:"center",padding:"7px 0",gap:8}}>
                          <span style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}>{c.icon}</span>
                          <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.75)",fontWeight:600,width:isMobile?90:110,flexShrink:0}}>{c.label}</span>
                          <span style={{flex:1,fontSize:isMobile?11:13,fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"rgba(255,255,255,0.45)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.note||""}</span>
                          <span style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FFD93D",fontFamily:"'Space Mono',monospace",flexShrink:0,marginLeft:8}}>~{fmt(val)}</span>
                        </div>
                      );})}
                      <div style={{height:1,background:"rgba(255,255,255,0.12)",margin:"8px 0"}}/>
                      <div style={{display:"flex",alignItems:"center",padding:"4px 0",gap:8}}>
                        <span style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}> </span>
                        <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.9)",fontWeight:700,width:isMobile?90:110,flexShrink:0}}>TOTAL</span>
                        <span style={{flex:1}}/>
                        <span style={{fontSize:isMobile?14:16,fontWeight:900,color:"#FFD93D",fontFamily:"'Space Mono',monospace",flexShrink:0,marginLeft:8}}>~{fmt(total)}</span>
                      </div>
                      {bd.routingNote&&(
                        <div style={{marginTop:10,borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:10}}>
                          <div style={{fontSize:11,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Space Mono',monospace",marginBottom:3}}>✦ WHY THIS ROUTE</div>
                          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?12:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>{bd.routingNote}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div style={{background:"#0C1520",border:"1px solid #1a2535",borderRadius:13,padding:14,marginBottom:18}}>
              <div style={{fontSize:15,color:"rgba(255,255,255,0.9)",letterSpacing:2,marginBottom:10}}>💬 REFINE YOUR VISION</div>
              {loading&&<div style={{fontSize:15,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",marginBottom:8}}>✨ refining...</div>}
              <div style={{display:"flex",gap:7}}>
                <input style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:8,color:"#FFF",fontSize:isMobile?13:15,padding:isMobile?"11px":"9px 11px",fontFamily:"'Space Mono',monospace",outline:"none",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} value={refineInput} onChange={e=>setRefineInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")refine();}} placeholder="Swap a destination, adjust duration..." onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
                <button style={{background:"rgba(169,70,29,0.2)",border:"1px solid rgba(169,70,29,0.4)",borderRadius:8,color:"#FFD93D",fontSize:15,padding:"8px 12px",cursor:"pointer",minWidth:44,minHeight:44}} onClick={refine}>↑</button>
              </div>
            </div>
            <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.1),rgba(255,217,61,0.04))",border:"1px solid rgba(169,70,29,0.4)",borderRadius:16,padding:22,textAlign:"center"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:20,fontWeight:300,color:"#FFF",marginBottom:6,lineHeight:1.3}}>This is your <em style={{color:"#FFD93D"}}>expedition.</em></div>
              <div style={{fontSize:15,color:"rgba(255,255,255,0.88)",letterSpacing:1,marginBottom:20,lineHeight:1.8}}>Does this feel right? Refine above until it does.<br/>When your gut says yes — it's time to build.</div>
              <button className="cta-build-btn" style={{minHeight:52,opacity:launching?0.7:1}} onClick={()=>{if(!launching){setLaunching(true);onBuild(vd);}}}>
                {launching?"✨  Building...":"✅  YES — BUILD THIS EXPEDITION"}
              </button>
              <button style={{marginTop:10,background:"none",border:"1px solid #1a2535",borderRadius:8,color:"rgba(255,255,255,0.3)",fontSize:15,padding:"7px 14px",cursor:"pointer",fontFamily:"'Space Mono',monospace",width:"100%",minHeight:44}} onClick={onBack}>{data.isRevision?"← BACK TO CONSOLE":"← START OVER"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CoArchitect ──────────────────────────────────────────────────
function CoArchitect({data,visionData,onLaunch,onBack}) {
  const isMobile=useMobile();
  const [mobileTab,setMobileTab]=useState(data.isRevision?"chat":"itinerary");
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setMounted(true),60);return()=>clearTimeout(t);},[]);
  useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});posthog.capture("co_architect_opened");posthog.capture("$pageview",{$current_url:"/co-architect"});},[]);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  function estCost(dest,country,type,nights){
    const d=(dest||"").toLowerCase(),c=(country||"").toLowerCase();
    if(["maldives","norway","switzerland","iceland","japan","australia"].some(r=>d.includes(r)||c.includes(r)))return Math.round(nights*220);
    if(["europe","portugal","spain","france","italy","greece","barbados","caribbean"].some(r=>d.includes(r)||c.includes(r)))return Math.round(nights*190);
    if(type==="Dive"&&["red sea","komodo","galapagos","liveaboard"].some(r=>d.includes(r)))return Math.round(nights*230);
    if(["mexico","colombia","south africa","egypt","brazil"].some(r=>d.includes(r)||c.includes(r)))return Math.round(nights*165);
    if(["thailand","vietnam","indonesia","bali","philippines"].some(r=>d.includes(r)||c.includes(r)))return Math.round(nights*145);
    if(["honduras","belize","guatemala","nicaragua"].some(r=>d.includes(r)||c.includes(r)))return Math.round(nights*155);
    if(["india","nepal","sri lanka"].some(r=>d.includes(r)||c.includes(r)))return Math.round(nights*130);
    return Math.round(nights*170);
  }
  const colors=["#00E5FF","#69F0AE","#FFD93D","#FF9F43","#A29BFE","#FF6B6B","#55EFC4","#74B9FF"];
  const [items,setItems]=useState(()=>(visionData.phases||[]).map((p,i)=>({id:i,destination:p.destination,country:p.country,type:p.type||"Exploration",nights:p.nights||7,cost:p.budget||estCost(p.destination,p.country,p.type,p.nights||7),flag:p.flag||"🌍",color:colors[i%8],why:p.why||""})));
  const [startDate,setStartDate]=useState(data.date||"2026-09-16");
  const [chat,setChat]=useState([{role:"ai",text:data.isRevision?"Welcome back — let's revise your expedition. ✏️\n\nYour itinerary is loaded. Tell me what you'd like to change.":"Welcome — I'm your expedition co-architect. ✨\n\nYour vision is incredible and I'm genuinely excited to help you build it.",isWelcome:true}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const chatEnd=useRef(null);
  const goalLabel=GOAL_PRESETS.find(g=>g.id===data.selectedGoal)?.label||"expedition";
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  useEffect(()=>{const t=setTimeout(()=>genInsight(),2000);return()=>clearTimeout(t);},[]);
  const totalNights=items.reduce((s,i)=>s+i.nights,0);
  const totalCost=items.reduce((s,i)=>s+i.cost,0);
  const countries=[...new Set(items.map(i=>i.country))];
  function getDates(){let cur=new Date(startDate);return items.map(p=>{const arr=new Date(cur);cur.setDate(cur.getDate()+p.nights);return{arrival:arr,departure:new Date(cur)};});}
  const dates=getDates();
  function fmtD(d){return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});}
  async function genInsight(){
    setLoading(true);
    const res=await askAI(`Co-architect. Goal:"${goalLabel}". Vision:"${data.vision}". ${data.budgetMode!=="dream"?"Budget: "+data.budgetAmount:"No budget."} Items:${JSON.stringify(items.map(i=>({destination:i.destination,type:i.type,nights:i.nights})))} One sentence excitement. ONE clarifying question. Max 3 sentences.`,350);
    setChat(p=>[...p,{role:"ai",text:res}]);setLoading(false);
  }
  async function sendMsg(){
    if(!input.trim())return;
    const msg=input;setInput("");setChat(p=>[...p,{role:"user",text:msg}]);setLoading(true);
    try{
      const raw=await askAI(`Co-architect. Goal:"${goalLabel}". Vision:"${data.vision}". ${data.budgetMode!=="dream"?"Budget:"+data.budgetAmount+".":"No budget."} Items:${JSON.stringify(items.map(i=>({id:i.id,destination:i.destination,country:i.country,nights:i.nights,type:i.type})))} Traveler:"${msg}" Return ONLY valid JSON:{"response":"warm 2-3 sentences","changes":[{"id":0,"field":"destination","value":"New Place","country":"New Country"}],"warnings":[{"phaseIndex":0,"type":"date_conflict","message":"...","suggestion":"...","dismissible":true}]}. When changing destination always include country. If you detect a date conflict or seasonal mismatch include a warning.`,600);
      const parsed=parseJSON(raw);
      if(parsed){setChat(p=>[...p,{role:"ai",text:parsed.response}]);if(parsed.changes?.length)setItems(p=>{let u=[...p];parsed.changes.forEach(c=>{u=u.map(it=>{if(it.id!==c.id)return it;const upd={...it,[c.field]:c.value};if(c.field==="destination"&&c.country)upd.country=c.country;if(c.field==="country")upd.country=c.value;return upd;})});return u;});if(parsed.warnings?.length)parsed.warnings.forEach(w=>{try{const existing=JSON.parse(localStorage.getItem('1bn_warnings_v1')||'[]');existing.push(w);localStorage.setItem('1bn_warnings_v1',JSON.stringify(existing));}catch(e){}});}
      else setChat(p=>[...p,{role:"ai",text:"Got it — which stop would you like to change?"}]);
    }catch(e){setChat(p=>[...p,{role:"ai",text:"What specifically would you like to change?"}]);}
    setLoading(false);
  }
  // Architecture #1: each item auto-wraps as 1 segment
  function buildHandoff(){
    return{tripName:data.tripName||"My Expedition",startDate,departureCity:data.city||"",vision:data.vision,visionNarrative:visionData.narrative,visionHighlight:visionData.highlight,goalLabel,
      budgetBreakdown:visionData.budgetBreakdown||null,travelerProfile:data.travelerProfile||null,packProfile:visionData.packProfile||null,
      phases:items.map((item,i)=>({id:i+1,name:item.destination,flag:item.flag,color:item.color,budget:item.cost,nights:item.nights,type:item.type,arrival:dates[i]?.arrival.toISOString().split("T")[0]||"",departure:dates[i]?.departure.toISOString().split("T")[0]||"",country:item.country,diveCount:item.type==="Dive"?Math.floor(item.nights*1.5):0,cost:item.cost,note:item.why||visionData.phases?.[i]?.why||""})),
      totalNights,totalBudget:totalCost,totalDives:items.filter(i=>i.type==="Dive").reduce((s,i)=>s+Math.floor(i.nights*1.5),0)};
  }
  return(
    <div className="build-root" style={{opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(32px)",transition:"opacity 0.55s ease,transform 0.55s cubic-bezier(0.22,1,0.36,1)"}}>
      <ConsoleHeader console="dream" isMobile={isMobile} screenLabel="CO-ARCHITECT" rightSlot={<div style={{display:"flex",gap:5,alignItems:"center"}}>{[1,2,3,4].map(n=><div key={n} style={{width:n<3?18:n===3?28:18,height:6,borderRadius:3,background:n<3?"rgba(169,70,29,0.55)":n===3?"#FFD93D":"rgba(255,255,255,0.1)",boxShadow:n===3?"0 0 8px rgba(255,217,61,0.6)":"none"}}/>)}</div>}/>
      <div style={{display:"flex",border:"none",background:"#080D14",flexShrink:0}}>
        {[{label:"STOPS",val:items.length,c:"#00E5FF"},{label:"COUNTRIES",val:countries.length,c:"#69F0AE"},{label:"NIGHTS",val:totalNights,c:"#A29BFE"},{label:"BUDGET",val:fmt(totalCost),c:"#FFD93D"}].map((s,i)=>(
          <div key={s.label} style={{flex:1,padding:"8px 6px",textAlign:"center",borderRight:i<3?"1px solid #111D2A":"none"}}>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{s.label}</div>
            <div style={{fontSize:isMobile?13:15,fontWeight:700,color:s.c}}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"8px 14px",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid #111D2A",flexShrink:0}}>
        <span style={{fontSize:15,color:"rgba(255,255,255,0.75)",letterSpacing:1}}>DEPARTURE</span>
        <input type="date" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:6,color:"#00E5FF",fontSize:15,padding:"3px 8px",fontFamily:"monospace",outline:"none",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",colorScheme:"dark"}} value={startDate} onChange={e=>setStartDate(e.target.value)} onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
        <span style={{fontSize:15,color:"rgba(255,255,255,0.65)",marginLeft:"auto"}}>{totalNights} nights</span>
      </div>
      {isMobile&&<div style={{display:"flex",borderBottom:"1px solid #1a2535",background:"#080D14",flexShrink:0}}>
        {["itinerary","chat"].map(t=><button key={t} onClick={()=>setMobileTab(t)} style={{flex:1,padding:10,background:"none",border:"none",borderBottom:mobileTab===t?"2px solid #69F0AE":"2px solid transparent",color:mobileTab===t?"#69F0AE":"rgba(255,255,255,0.4)",fontSize:15,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:2,minHeight:44}}>{t==="itinerary"?"🗺️ ITINERARY":"✏️ REFINE"}</button>)}
      </div>}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0,...(isMobile?{flexDirection:"column"}:{})}}>
        {(!isMobile||mobileTab==="itinerary")&&(
          <div style={{flex:1,overflowY:"auto",padding:12,...(isMobile?{maxHeight:"none"}:{})}}>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.85)",letterSpacing:3,marginBottom:10}}>YOUR ITINERARY · TAP TO EDIT</div>
            {items.map((item,i)=>{
              const c=item.color,isEd=editingId===item.id;
              return(
                <div key={item.id} style={{marginBottom:7,background:"#0C1520",borderRadius:11,overflow:"hidden",border:`1px solid ${c}22`,borderLeft:`3px solid ${c}`}}>
                  <div onClick={()=>setEditingId(isEd?null:item.id)} style={{padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,minHeight:44}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:`${c}18`,border:`1px solid ${c}44`,color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:"#FFF"}}>{item.flag} {item.destination}</div><div style={{fontSize:15,color:"rgba(255,255,255,0.75)"}}><span style={{color:"#FFD93D",fontWeight:700}}>{item.country}</span> · {TI[item.type]} {item.type} · {fmtD(dates[i]?.arrival)}→{fmtD(dates[i]?.departure)}</div></div>
                    <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontWeight:900,color:"#A29BFE"}}>{item.nights}n</div><div style={{fontSize:15,color:"#FFD93D"}}>{fmt(item.cost)}</div></div>
                    <span style={{fontSize:15,color:"rgba(255,255,255,0.25)",marginLeft:6}}>{isEd?"▲":"▼"}</span>
                  </div>
                  {isEd&&<div style={{padding:"10px 12px 12px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.2)",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[{label:"NIGHTS",field:"nights",type:"number"},{label:"COST ($)",field:"cost",type:"number"}].map(f=><div key={f.field} style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{f.label}</div><input type={f.type} style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",fontFamily:"'Space Mono',monospace",outline:"none"}} value={item[f.field]} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,[f.field]:parseInt(e.target.value)||1}:it))}/></div>)}
                    <div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>TYPE</div><select style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",outline:"none",width:"100%"}} value={item.type} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,type:e.target.value}:it))}>{["Exploration","Culture","Dive","Surf","Nature","Trek","Moto","Relax","Transit"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
                  </div>}
                </div>
              );
            })}
            <div style={{padding:"10px 12px",background:"rgba(105,240,174,0.04)",border:"1px solid rgba(105,240,174,0.14)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
              <div><div style={{fontSize:15,color:"rgba(255,255,255,0.35)"}}>{items.length} stops · {countries.length} countries</div><div style={{fontSize:15,color:"#69F0AE"}}>~{fmt(Math.round(totalCost/Math.max(totalNights,1)))}/night</div></div>
              <div style={{fontSize:20,fontWeight:900,color:"#FFD93D"}}>{fmt(totalCost)}</div>
            </div>
            {isMobile&&<button style={{margin:"12px 0 0 0",width:"100%",padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#060A0F",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,fontFamily:"'Space Mono',monospace",animation:"consolePulse 2.8s ease-in-out infinite"}} onClick={()=>onLaunch(buildHandoff())}>{data.isRevision?"✅  UPDATE":"🚀  LAUNCH TRIP CONSOLE"}</button>}
          </div>
        )}
        {(!isMobile||mobileTab==="chat")&&(
          <div style={{width:isMobile?"100%":"44%",display:"flex",flexDirection:"column",borderLeft:isMobile?"none":"1px solid #111D2A",...(isMobile?{flex:1,borderTop:"1px solid #111D2A"}:{})}}>
            <div style={{padding:"8px 11px",borderBottom:"1px solid #111D2A",fontSize:15,color:"#C4571E",letterSpacing:2,flexShrink:0}}>{data.isRevision?"✏️ REVISE YOUR EXPEDITION":"✨ DREAM CONSOLE"}</div>
            <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:14}}>
              {chat.map((msg,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:msg.role==="user"?"row-reverse":"row",animation:"msgIn 0.25s ease"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:msg.role==="ai"?"#A9461D":"#1a2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{msg.role==="ai"?"✨":"👤"}</div>
                  {msg.isWelcome
                    ?<div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.2),rgba(255,217,61,0.07))",border:"2px solid rgba(255,159,67,0.30)",borderRadius:12,padding:"18px 20px",fontSize:18,fontWeight:400,color:"rgba(255,255,255,0.88)",lineHeight:1.7,maxWidth:"92%",whiteSpace:"pre-line",fontFamily:"'Fraunces',serif",animation:"fadeUp 0.6s ease",boxShadow:"inset 0 0 24px rgba(255,159,67,0.04)"}}>{msg.text}</div>
                    :<div style={{background:msg.role==="ai"?"rgba(255,159,67,0.04)":"rgba(255,255,255,0.05)",border:msg.role==="ai"?"2px solid rgba(255,159,67,0.30)":`1px solid rgba(255,255,255,0.08)`,borderRadius:12,padding:msg.role==="ai"?"18px 20px":"10px 14px",fontSize:msg.role==="ai"?14:12,fontFamily:msg.role==="ai"?"'Fraunces',serif":"'Space Mono',monospace",fontStyle:msg.role==="ai"?"italic":"normal",color:"#FFF",lineHeight:msg.role==="ai"?1.7:1.5,maxWidth:"92%",boxShadow:msg.role==="ai"?"inset 0 0 24px rgba(255,159,67,0.04)":"none"}}>{(msg.text||"").replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')}</div>}
                </div>
              ))}
              {loading&&<div style={{display:"flex",gap:6,animation:"msgIn 0.25s ease"}}><div style={{width:20,height:20,borderRadius:"50%",background:"#A9461D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>✨</div><div style={{fontSize:15,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",padding:"4px 0"}}>thinking...</div></div>}
              <div ref={chatEnd}/>
            </div>
            <div style={{padding:"10px",borderTop:"1px solid #111D2A",display:"flex",gap:5,flexWrap:isMobile?"nowrap":"wrap",overflowX:"auto",flexShrink:0}}>
              {QUICK_ACTIONS.map(a=><button key={a} onClick={()=>setInput(a)} style={{background:"rgba(169,70,29,0.18)",border:"1px solid rgba(255,217,61,0.35)",borderRadius:20,padding:"7px 14px",fontSize:15,fontWeight:700,color:"#FFD93D",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Space Mono',monospace",minHeight:36}}>{a}</button>)}
            </div>
            <div style={{padding:"8px 10px",borderTop:"1px solid #111D2A",display:"flex",gap:7,flexShrink:0}}>
              <input style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:8,color:"#FFF",fontSize:isMobile?13:15,padding:"8px 10px",fontFamily:"'Space Mono',monospace",outline:"none",minHeight:44,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMsg();}} placeholder="Ask anything, request changes..." onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
              <button style={{background:"rgba(169,70,29,0.2)",border:"1px solid rgba(169,70,29,0.4)",borderRadius:8,color:"#FFD93D",fontSize:15,padding:"8px 11px",cursor:"pointer",minWidth:44,minHeight:44}} onClick={sendMsg}>↑</button>
            </div>
            {!isMobile&&<button style={{margin:10,padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#060A0F",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,fontFamily:"'Space Mono',monospace",animation:"consolePulse 2.8s ease-in-out infinite",flexShrink:0}} onClick={()=>onLaunch(buildHandoff())}>{data.isRevision?"✅  UPDATE MY EXPEDITION":"🚀  LAUNCH TRIP CONSOLE"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HandoffScreen ────────────────────────────────────────────────
function HandoffScreen({tripData,onComplete}) {
  const isMobile=useMobile();
  const [ph,setPh]=useState(0),[lit,setLit]=useState(0);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{const ts=[setTimeout(()=>setPh(1),5000),setTimeout(()=>setPh(2),10000),setTimeout(()=>setPh(3),13500)];return()=>ts.forEach(clearTimeout);},[]);
  useEffect(()=>{if(ph<2)return;const total=tripData.phases?.length||0;let i=0;const iv=setInterval(()=>{i++;setLit(i);if(i>=total)clearInterval(iv);},180);return()=>clearInterval(iv);},[ph]);
  const totalNights=tripData.phases?.reduce((s,p)=>s+p.nights,0)||0;
  const totalBudget=tripData.phases?.reduce((s,p)=>s+(p.cost||p.budget||0),0)||0;
  const countries=[...new Set((tripData.phases||[]).map(p=>p.country))].length;
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"'Space Mono',monospace",overflow:"hidden",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 0%,#2d1200 0%,#1a0900 25%,#0d0500 55%,#060200 100%)",zIndex:1}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 0%,#001830 0%,#000d1a 30%,#000810 60%,#030810 100%)",opacity:ph>=1?1:0,transition:"opacity 1.4s ease",zIndex:2}}/>
      <div style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,paddingBottom:"calc(40px + env(safe-area-inset-bottom))",overflowY:"auto"}}>
        <div style={{opacity:ph<1?1:0,transition:"opacity 0.9s ease",position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:24,fontSize:isMobile?64:90,animation:"spinGlobe 20s linear infinite",filter:"drop-shadow(0 0 20px rgba(0,160,220,0.4))"}}>🌍</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:22,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.88)",lineHeight:1.6,maxWidth:560,textAlign:"center"}}>"{(tripData.visionNarrative||"").slice(0,120)}..."</div>
          <div style={{marginTop:28,fontFamily:"'Fraunces',serif",fontSize:15,fontStyle:"italic",color:"rgba(255,217,61,0.45)",letterSpacing:3}}>Now becoming real.</div>
        </div>
        <div style={{opacity:ph>=1&&ph<2?1:0,transition:"opacity 0.8s ease",position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:24,fontSize:isMobile?64:90,animation:"spinGlobe 20s linear infinite",filter:"drop-shadow(0 0 20px rgba(0,229,255,0.4))"}}>🌍</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:16,fontWeight:100,fontStyle:"italic",color:"rgba(0,229,255,0.6)",letterSpacing:4,textAlign:"center"}}>Building your expedition...</div>
        </div>
        <div style={{opacity:ph>=2?1:0,transition:"opacity 0.8s ease 0.2s",display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:520}}>
          <div style={{position:"relative",marginBottom:isMobile?28:36}}>
            {[0,1,2].map(i=><div key={i} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:isMobile?90+i*40:110+i*50,height:isMobile?90+i*40:110+i*50,borderRadius:"50%",border:`1px solid rgba(0,229,255,${0.15-i*.04})`,animation:"consolePulse 2.8s ease-in-out infinite"}}/>)}
            <div style={{position:"relative",zIndex:1,animation:"logoPulse 2.4s ease-in-out infinite"}}>
              <SharegoodLogo size={isMobile?72:88} animate={false} glowColor="rgba(0,229,255,0.5)" opacity={1}/>
            </div>
          </div>
          <div style={{textAlign:"center",marginBottom:isMobile?16:20}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:22,fontWeight:900,letterSpacing:3,textShadow:"0 0 30px rgba(255,217,61,0.5)",lineHeight:1,WebkitTextFillColor:"transparent",background:"linear-gradient(90deg,#FFD93D 25%,#fff 45%,#FF9F43 55%,#FFD93D 75%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",backgroundClip:"text",animation:"shimmerOnce 2s ease forwards"}}>DREAM BIG</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:22,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.7)",letterSpacing:2,lineHeight:1.2}}>travel light</div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",maxWidth:isMobile?320:480,marginBottom:isMobile?20:28}}>
            {tripData.phases?.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5,opacity:i<lit?1:0.15,transition:"opacity 0.3s ease"}}>
                <div style={{width:isMobile?8:10,height:isMobile?8:10,borderRadius:"50%",background:p.color||"#00E5FF",boxShadow:i<lit?`0 0 8px ${p.color||"#00E5FF"}`:"none"}}/>
                {i<lit&&<div style={{fontSize:isMobile?13:15,color:p.color||"#00E5FF",whiteSpace:"nowrap",fontWeight:700}}>{p.flag} {p.name}</div>}
              </div>
            ))}
          </div>
          <div style={{opacity:ph>=3?1:0,transform:ph>=3?"translateY(0)":"translateY(16px)",transition:"opacity 0.7s ease,transform 0.7s ease",textAlign:"center",width:"100%"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:32,fontWeight:300,fontStyle:"italic",color:"#FFD93D",marginBottom:6,textShadow:"0 0 40px rgba(255,217,61,0.4)"}}>{tripData.tripName}</div>
            <div style={{width:80,height:1,background:"linear-gradient(90deg,transparent,rgba(255,217,61,0.5),transparent)",margin:"10px auto 16px"}}/>
            <div style={{display:"flex",justifyContent:"center",gap:isMobile?16:28,marginBottom:isMobile?28:36,flexWrap:"wrap"}}>
              {[{value:totalNights,label:"NIGHTS"},{value:"$"+Math.round(totalBudget/1000)+"k",label:"BUDGET"},{value:countries,label:"COUNTRIES"}].map((s,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{fontSize:isMobile?13:28,fontWeight:900,color:"#00E5FF",fontFamily:"'Space Mono',monospace"}}>{s.value}</div>
                  <div style={{fontSize:15,color:"rgba(0,229,255,0.9)",letterSpacing:2,fontWeight:700}}>{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{onComplete();}} style={{padding:isMobile?"16px 32px":"18px 44px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#030810",fontSize:isMobile?13:15,fontWeight:900,fontFamily:"'Space Mono',monospace",letterSpacing:2.5,cursor:"pointer",animation:"consolePulse 2.8s ease-in-out infinite",minHeight:54}}>🌍  ENTER TRIP CONSOLE →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HomecomingScreen ─────────────────────────────────────────────
function HomecomingScreen({tripData,onPlanNext}) {
  const isMobile=useMobile();
  const [ph,setPh]=useState(0);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{
    const ts=[setTimeout(()=>setPh(1),600),setTimeout(()=>setPh(2),1800),setTimeout(()=>setPh(3),3200)];
    return()=>ts.forEach(clearTimeout);
  },[]);
  const segPhases=tripData.segmentedPhases||toSegPhases(tripData.phases||[]);
  const totalNights=segPhases.reduce((s,p)=>s+p.totalNights,0)||tripData.totalNights||0;
  const countries=segPhases.length;
  const totalDives=segPhases.reduce((s,p)=>s+p.totalDives,0)||tripData.totalDives||0;
  const totalBudget=segPhases.reduce((s,p)=>s+p.totalBudget,0)||tripData.totalBudget||0;
  const name=tripData.tripName||"My Expedition";
  const narrative=tripData.visionNarrative||"";
  const shareText=`✦ EXPEDITION COMPLETE ✦\n\n${name}\n\n${totalNights} nights · ${countries} countries${totalDives>0?` · ${totalDives} dives`:""} · ${fmt(totalBudget)}\n\n"${narrative.slice(0,160)}${narrative.length>160?"...":""}"\n\nDream Big. Travel Light.\n1bagnomad.com`;
  async function handleShare(){
    if(navigator.share){try{await navigator.share({title:name,text:shareText});}catch(e){}}
    else{try{await navigator.clipboard.writeText(shareText);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch(e){}}
  }
  const fade=(delay=0)=>({opacity:ph>=2?1:0,transform:ph>=2?"translateY(0)":"translateY(14px)",transition:`opacity 0.7s ease ${delay}s,transform 0.7s ease ${delay}s`});
  const fade3=(delay=0)=>({opacity:ph>=3?1:0,transform:ph>=3?"translateY(0)":"translateY(10px)",transition:`opacity 0.6s ease ${delay}s,transform 0.6s ease ${delay}s`});
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"'Space Mono',monospace",overflow:"hidden",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 20%,#281400 0%,#160a00 30%,#090400 60%,#030100 100%)",zIndex:1}}/>
      <div style={{position:"absolute",top:"-10%",left:"50%",transform:"translateX(-50%)",width:700,height:400,background:"radial-gradient(ellipse,rgba(255,159,67,0.22) 0%,rgba(255,217,61,0.06) 45%,transparent 70%)",pointerEvents:"none",zIndex:2}}/>
      <div style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:isMobile?24:40,paddingBottom:"calc(40px + env(safe-area-inset-bottom))",overflowY:"auto"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:520,gap:isMobile?18:24}}>
          {/* Spinning logo */}
          <div style={{position:"relative",marginBottom:4}}>
            {[0,1,2].map(i=><div key={i} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:(isMobile?88:108)+i*38,height:(isMobile?88:108)+i*38,borderRadius:"50%",border:`1px solid rgba(255,159,67,${0.14-i*.04})`,animation:"consolePulse 3s ease-in-out infinite"}}/>)}
            <div style={{position:"relative",zIndex:1,animation:"spinGlobe 30s linear infinite"}}>
              <SharegoodLogo size={isMobile?68:84} animate={false} glowColor="rgba(255,159,67,0.55)" opacity={1}/>
            </div>
          </div>
          {/* You did it. */}
          <div style={{textAlign:"center",opacity:ph>=1?1:0,transform:ph>=1?"translateY(0)":"translateY(20px)",transition:"opacity 0.7s ease,transform 0.7s ease"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?40:56,fontWeight:900,color:"#FFD93D",textShadow:"0 0 50px rgba(255,217,61,0.45)",lineHeight:1,marginBottom:6}}>You did it.</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:16,fontWeight:300,fontStyle:"italic",color:"rgba(255,159,67,0.65)",letterSpacing:1}}>{name}</div>
          </div>
          {/* Stats */}
          <div style={{...fade(0.1),display:"flex",justifyContent:"center",gap:isMobile?18:32,flexWrap:"wrap"}}>
            {[{v:totalNights,l:"NIGHTS"},{v:countries,l:"COUNTRIES"},...(totalDives>0?[{v:totalDives,l:"DIVES"}]:[]),{v:fmt(totalBudget),l:"BUDGET"}].map((s,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontSize:isMobile?22:30,fontWeight:900,color:"#FF9F43",fontFamily:"'Space Mono',monospace"}}>{s.v}</div>
                <div style={{fontSize:8,color:"rgba(255,159,67,0.65)",letterSpacing:2.5,fontWeight:700}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Vision narrative */}
          {narrative&&<div style={{...fade(0.4),textAlign:"center",fontFamily:"'Fraunces',serif",fontSize:isMobile?12:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,217,61,0.6)",lineHeight:1.75,borderLeft:"2px solid rgba(255,217,61,0.18)",paddingLeft:14,maxWidth:440}}>"{narrative.slice(0,160)}{narrative.length>160?"...":""}"</div>}
          {/* Dream Big tagline */}
          <div style={{...fade3(0),textAlign:"center"}}>
            <div style={{width:60,height:1,background:"linear-gradient(90deg,transparent,rgba(255,217,61,0.35),transparent)",margin:"0 auto 16px"}}/>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?15:19,fontWeight:700,WebkitTextFillColor:"transparent",background:"linear-gradient(90deg,#FFD93D 25%,#FFF 45%,#FF9F43 55%,#FFD93D 75%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",backgroundClip:"text",animation:"shimmerOnce 2.5s ease forwards",letterSpacing:2}}>Dream Big. Travel Light.</div>
          </div>
          {/* Buttons */}
          <div style={{...fade3(0.15),display:"flex",flexDirection:isMobile?"column":"row",gap:10,width:"100%",maxWidth:400}}>
            <button onClick={handleShare} style={{flex:1,padding:"14px 18px",borderRadius:12,border:"1px solid rgba(255,159,67,0.45)",background:"rgba(255,159,67,0.1)",color:"#FF9F43",fontSize:isMobile?10:11,fontWeight:700,letterSpacing:2,cursor:"pointer",fontFamily:"'Space Mono',monospace",minHeight:48,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,159,67,0.2)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,159,67,0.1)"}>
              {copied?"✓ COPIED!":"✦ SHARE MY EXPEDITION"}
            </button>
            <button onClick={onPlanNext} style={{flex:1,padding:"14px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#C4571E,#FF9F43,#FFD93D)",color:"#060A0F",fontSize:isMobile?10:11,fontWeight:900,letterSpacing:2,cursor:"pointer",fontFamily:"'Space Mono',monospace",minHeight:48,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onMouseOver={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseOut={e=>e.currentTarget.style.transform="none"}>
              PLAN MY NEXT ONE →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SegmentDetailField ───────────────────────────────────────────
function SDF({label,value,onChange,placeholder,type="text",multiline,accent="#00E5FF"}) {
  const mob=useMobile();
  const s={background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:6,color:"#FFF",fontSize:mob?12:15,padding:multiline?(mob?"5px 7px":"6px 8px"):(mob?"4px 7px":"5px 8px"),fontFamily:"'Space Mono',monospace",outline:"none",width:"100%",maxWidth:"100%",boxSizing:"border-box",lineHeight:1.6,resize:multiline?"none":undefined,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"};
  const onF=e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";setTimeout(()=>e.target.scrollIntoView({behavior:'smooth',block:'center'}),320);};
  const onB=e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:mob?2:3}}>
      <div style={{fontSize:mob?9:11,color:"rgba(212,180,120,0.7)",letterSpacing:1.5,fontFamily:"'Space Mono',monospace",fontWeight:500}}>{label}</div>
      {multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={1} style={s} onFocus={onF} onBlur={onB}/>
      :type==="date"?<div style={{width:"100%"}}><input type="date" value={value} onChange={e=>onChange(e.target.value)} style={{...s,colorScheme:"dark"}} onFocus={onF} onBlur={onB}/></div>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} onFocus={onF} onBlur={onB}/>}
    </div>
  );
}

// ─── CoachOverlay ─────────────────────────────────────────────────
function CoachOverlay({steps,storageKey,accentColor="#00E5FF",onDismiss}) {
  const isMobile=useMobile();
  const [step,setStep]=useState(0);
  const [rect,setRect]=useState(null);
  const [fading,setFading]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{const c=loadCoach();if(!c[storageKey]){c[storageKey]=true;saveCoach(c);}const t=setTimeout(()=>setReady(true),600);return()=>clearTimeout(t);},[storageKey]);
  const measure=useCallback(()=>{
    const el=document.querySelector(`[data-coach="${steps[step]?.target}"]`);
    if(!el)return;
    el.scrollIntoView({behavior:"smooth",block:"center"});
    setTimeout(()=>setRect(el.getBoundingClientRect()),350);
  },[step,steps]);
  useEffect(()=>{if(ready)measure();},[ready,measure]);
  useEffect(()=>{const h=()=>measure();window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[measure]);
  const finish=()=>{const c=loadCoach();c[storageKey]=true;saveCoach(c);onDismiss?.();};
  const goNext=()=>{
    if(step>=steps.length-1){finish();return;}
    setFading(true);
    setTimeout(()=>{setStep(s=>s+1);setFading(false);},200);
  };
  if(!ready||!rect)return null;
  const pad=10,r=rect;
  const cut={top:Math.max(0,r.top-pad),left:Math.max(0,r.left-pad),width:r.width+pad*2,height:r.height+pad*2};
  const below=window.innerHeight-cut.top-cut.height>160;
  const tipStyle={
    position:"fixed",zIndex:10001,
    left:isMobile?12:Math.max(12,Math.min(cut.left,window.innerWidth-320)),
    top:below?cut.top+cut.height+12:undefined,
    bottom:below?undefined:window.innerHeight-cut.top+12,
    width:isMobile?"calc(100vw - 24px)":"min(320px,80vw)",
    background:"rgba(0,8,20,0.96)",backdropFilter:"blur(12px)",
    border:`1px solid ${accentColor}33`,borderRadius:12,
    padding:"16px 18px",
    animation:fading?"none":"coachFadeIn 0.3s ease both",
    opacity:fading?0:1,transition:"opacity 0.35s cubic-bezier(0.25,0.46,0.45,0.94)"
  };
  const s=steps[step];
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999}} onClick={goNext}>
      {/* Four overlay panels */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:cut.top,background:"rgba(0,4,14,0.82)"}}/>
      <div style={{position:"fixed",top:cut.top+cut.height,left:0,right:0,bottom:0,background:"rgba(0,4,14,0.82)"}}/>
      <div style={{position:"fixed",top:cut.top,left:0,width:cut.left,height:cut.height,background:"rgba(0,4,14,0.82)"}}/>
      <div style={{position:"fixed",top:cut.top,left:cut.left+cut.width,right:0,height:cut.height,background:"rgba(0,4,14,0.82)"}}/>
      {/* Spotlight glow ring */}
      <div style={{position:"fixed",top:cut.top,left:cut.left,width:cut.width,height:cut.height,borderRadius:12,animation:"coachPulse 2.5s ease-in-out infinite",pointerEvents:"none",zIndex:10000}}/>
      {/* Tooltip */}
      <div style={tipStyle} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:16,fontWeight:700,fontStyle:"italic",color:"#FFD93D"}}>{s.title}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'Space Mono',monospace"}}>{step+1}/{steps.length}</div>
        </div>
        <div style={{fontSize:isMobile?11:12,color:"rgba(255,255,255,0.65)",fontFamily:"'Space Mono',monospace",lineHeight:1.7,marginBottom:14}}>{s.body}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={e=>{e.stopPropagation();finish();}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.70)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Space Mono',monospace",padding:"8px 16px",minHeight:44}} onMouseOver={e=>e.currentTarget.style.textDecoration="underline"} onMouseOut={e=>e.currentTarget.style.textDecoration="none"}>Skip tour</button>
          <button onClick={e=>{e.stopPropagation();goNext();}} style={{background:`${accentColor}14`,border:`1px solid ${accentColor}55`,borderRadius:8,color:accentColor,fontSize:12,cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,padding:"8px 18px",letterSpacing:1,minHeight:44}}>{step>=steps.length-1?"Got it":"Next"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── OnboardCard ──────────────────────────────────────────────────
function OnboardCard({storageKey,ctaLabel,onDismiss,children}) {
  const isMobile=useMobile();
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVisible(true),200);return()=>clearTimeout(t);},[]);
  const dismiss=()=>{const o=loadOnboard();o[storageKey]=true;saveOnboard(o);onDismiss?.();};
  if(!visible)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,4,14,0.88)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:isMobile?"12px":"24px",overflowY:"auto",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
      <div style={{width:"100%",maxWidth:480,background:"linear-gradient(160deg,rgba(0,12,28,0.98),rgba(0,6,18,0.98))",border:"1px solid rgba(0,229,255,0.18)",borderRadius:18,padding:isMobile?"20px 16px":"32px 28px",animation:"fadeUp 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both",boxShadow:"0 0 60px rgba(0,229,255,0.07),0 24px 48px rgba(0,0,0,0.6)",marginTop:isMobile?"auto":0,marginBottom:isMobile?"auto":0,alignSelf:"center"}}>
        {children}
        <div style={{marginTop:isMobile?16:24,display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={dismiss} style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid rgba(255,159,67,0.5)",background:"linear-gradient(135deg,rgba(196,87,30,0.2),rgba(255,159,67,0.1))",color:"#FF9F43",fontSize:isMobile?12:13,fontWeight:700,letterSpacing:2.5,cursor:"pointer",fontFamily:"'Space Mono',monospace",minHeight:48,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onMouseOver={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(196,87,30,0.35),rgba(255,159,67,0.2))";e.currentTarget.style.boxShadow="0 0 20px rgba(255,159,67,0.2)";}} onMouseOut={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(196,87,30,0.2),rgba(255,159,67,0.1))";e.currentTarget.style.boxShadow="none";}}>{ctaLabel}</button>
          <button onClick={dismiss} style={{background:"none",border:"none",color:"rgba(255,255,255,0.70)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,padding:"8px 16px",minHeight:44,textAlign:"center",transition:"color 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onMouseOver={e=>{e.currentTarget.style.color="rgba(255,255,255,0.9)";e.currentTarget.style.textDecoration="underline";}} onMouseOut={e=>{e.currentTarget.style.color="rgba(255,255,255,0.70)";e.currentTarget.style.textDecoration="none";}}>I know my way around →</button>
        </div>
      </div>
    </div>
  );
}

// ─── SegmentDetails — reads/writes 1bn_seg_v2 only (arch #3) ─────
// arch #2: inline intel tab preview preserved
function SegmentDetails({phaseId,segment,intelSnippet,status="planning",onStatusChange,suggestion:suggestionProp,suggestionsLoading}) {
  const isMobile=useMobile();
  const key=`${phaseId}-${segment.id}`;
  const blank={transport:{mode:"",from:"",to:"",depTime:"",arrTime:"",cost:"",notes:""},stay:{name:"",checkin:"",checkout:"",cost:"",link:"",notes:""},activities:[],actNotes:"",food:{dailyBudget:"",notes:""},misc:[],intel:{notes:""}};
  const [det,setDet]=useState(()=>{const a=loadSeg();return a[key]||blank;});
  const [cat,setCat]=useState(null);
  const [aiLoad,setAiLoad]=useState(false);
  const [nAct,setNAct]=useState({name:"",date:"",cost:"",transit:"",link:""});
  const [nMisc,setNMisc]=useState({name:"",cost:""});
  const locked=status==='booked';
  const [saveFlash,setSaveFlash]=useState(false);
  const saveFlashRef=useRef(null);
  const isFirstRender=useRef(true);
  // Save form data without overwriting status/history fields managed by SegmentRow
  useEffect(()=>{if(isFirstRender.current){isFirstRender.current=false;return;}const a=loadSeg();const ex=a[key]||{};a[key]={...ex,...det,status:ex.status||'planning',statusUpdatedAt:ex.statusUpdatedAt||null,changes:ex.changes||[]};saveSeg(a);setSaveFlash(true);if(saveFlashRef.current)clearTimeout(saveFlashRef.current);saveFlashRef.current=setTimeout(()=>setSaveFlash(false),2000);},[det]);
  const uT=(f,v)=>setDet(d=>({...d,transport:{...d.transport,[f]:v}}));
  const uS=(f,v)=>setDet(d=>({...d,stay:{...d.stay,[f]:v}}));
  const uF=(f,v)=>setDet(d=>({...d,food:{...d.food,[f]:v}}));
  // Resolve suggestion: use prop if available, otherwise look up by segment name from localStorage
  const suggestion = (()=>{
    if(suggestionProp) return suggestionProp;
    const all = loadSuggestionsFromStorage();
    return findSuggestionForSegment(all, segment.name);
  })();
  const dismissKey = segment.name || `${phaseId}`;
  const [dismissed,setDismissedSD]=useState(()=>loadDismissed());
  const isDismSD=(type)=>!!dismissed[`${dismissKey}_${type}`];
  const dismissSD=(type)=>{const d={...dismissed,[`${dismissKey}_${type}`]:true};setDismissedSD(d);saveDismissed(d);};
  const acceptTransportSD=(t)=>{const mode=detectMode(t.route);if(mode)uT("mode",mode);uT("cost",(t.estimatedCost||"").split('-')[0].replace(/[^0-9]/g,''));uT("notes",`${t.route}\n\nEst. ${t.estimatedCost}${t.bestTiming?`\nBest timing: ${t.bestTiming}`:""}${t.notes?`\n${t.notes}`:""}`);dismissSD('transport');};
  const acceptStaySD=(s)=>{const primary=s.suggestions?.[0]||"";const alts=s.suggestions?.slice(1)||[];if(primary)uS("name",primary);uS("cost",(s.estimatedTotal||"").split('-')[0].replace(/[^0-9]/g,''));if(segment.arrival&&!det.stay.checkin)uS("checkin",segment.arrival);if(segment.departure&&!det.stay.checkout)uS("checkout",segment.departure);uS("notes",`${alts.length>0?`Alternatives: ${alts.join(', ')}\n\n`:""}${s.recommendation||""}${s.notes?`\n${s.notes}`:""}`);dismissSD('stay');};
  const acceptActivitySD=(a)=>{const sentences=(a.notes||"").split(/(?<=[.!?])\s+/);const brief=sentences[0]||"";const tipText=sentences.slice(1).join(' ');setDet(d=>({...d,activities:[...d.activities,{name:a.name,brief,tip:tipText,date:"",cost:(a.estimatedCost||"").match(/\d+/)?.[0]||"",notes:`${a.provider||""}${tipText?`\n${tipText}`:""}`,provider:a.provider||"",id:Date.now()+Math.random()}]}));};
  async function aiFood(){setAiLoad(true);const r=await askAI(`Daily food budget USD solo traveler ${segment.name}. Number only.`,20);const n=r.replace(/\D/g,"");if(n)uF("dailyBudget",n);setAiLoad(false);}
  const CATS=[{id:"transport",icon:"✈️",label:"TRANSPORT",a:"#00E5FF",w:"rgba(0,229,255,0.04)"},{id:"stay",icon:"🏠",label:"STAY",a:"#69F0AE",w:"rgba(105,240,174,0.04)"},{id:"activities",icon:"🎯",label:"ACTIVITIES",a:"#FFD93D",w:"rgba(255,217,61,0.04)"},{id:"food",icon:"🍽️",label:"FOOD",a:"#FF9F43",w:"rgba(255,159,67,0.04)"},{id:"misc",icon:"💸",label:"MISC",a:"#A29BFE",w:"rgba(162,155,254,0.04)"},{id:"intel",icon:"🔭",label:"INTEL",a:"#FF6B6B",w:"rgba(255,107,107,0.04)"}];
  const done={transport:!!(det.transport.mode||det.transport.cost),stay:!!(det.stay.name||det.stay.cost),activities:det.activities.length>0,food:!!(det.food.dailyBudget),misc:det.misc.length>0,intel:!!(intelSnippet?.tagline||det.intel.notes)};
  const ac=CATS.find(c=>c.id===cat);
  return(
    <div style={{borderTop:"1px solid rgba(0,229,255,0.06)"}}>
      {/* Status banner — lock notice or LOCK BOOKING button */}
      {locked&&<div style={{padding:"7px 14px",background:"rgba(105,240,174,0.06)",borderBottom:"1px solid rgba(105,240,174,0.15)",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:"#69F0AE",fontFamily:"'Space Mono',monospace",letterSpacing:1.5,flex:1}}>🔒 BOOKED — tap badge to unlock for editing</span>
      </div>}
      {status==='changed'&&<div style={{padding:"7px 14px",background:"rgba(255,107,107,0.06)",borderBottom:"1px solid rgba(255,107,107,0.2)",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:"#FF6B6B",fontFamily:"'Space Mono',monospace",letterSpacing:1,flex:1}}>⚠️ CHANGED — update your details, then lock when done</span>
        <button onClick={()=>onStatusChange?.('booked')} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:"1px solid rgba(105,240,174,0.4)",background:"rgba(105,240,174,0.08)",color:"#69F0AE",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1,whiteSpace:"nowrap",minHeight:26}}>✓ LOCK BOOKING</button>
      </div>}
      <div style={{pointerEvents:locked?"none":"auto",opacity:locked?0.55:1,transition:"opacity 0.2s"}}>
      <div style={{display:"flex",background:"rgba(0,4,12,0.8)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",position:"relative"}}>
        {saveFlash&&<div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontFamily:"'Space Mono',monospace",fontSize:13,color:"#69F0AE",opacity:0.80,letterSpacing:1,transition:"opacity 0.40s cubic-bezier(0.25,0.46,0.45,0.94)",zIndex:2,pointerEvents:"none"}}>&#10003; saved</div>}
        {CATS.map(c=>{const on=cat===c.id;return(
          <button key={c.id} onClick={()=>setCat(on?null:c.id)} style={{flexShrink:0,minWidth:52,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"7px 4px",border:"none",cursor:"pointer",background:on?c.w:"transparent",borderBottom:on?`2px solid ${c.a}`:"2px solid transparent",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",position:"relative"}}>
            <span style={{fontSize:isMobile?13:15,lineHeight:1}}>{c.icon}</span>
            <span style={{fontSize:isMobile?10:12,letterSpacing:0,fontFamily:"'Space Mono',monospace",fontWeight:700,color:on?c.a:"rgba(255,255,255,0.55)",whiteSpace:"nowrap"}}>{c.label}{c.id==="activities"&&det.activities.length>0?<span style={{color:"#FF9F43",fontSize:isMobile?9:11}}> ({det.activities.length})</span>:""}{c.id==="misc"&&det.misc.length>0?<span style={{color:"#A29BFE",fontSize:isMobile?9:11}}> ({det.misc.length})</span>:""}</span>
            {done[c.id]&&<div style={{position:"absolute",top:4,right:"14%",width:5,height:5,borderRadius:"50%",background:c.a,boxShadow:`0 0 5px ${c.a}`}}/>}
          </button>
        );})}
      </div>
      {!cat&&<div style={{padding:"12px 16px",textAlign:"center",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?11:13,fontStyle:"italic",color:"rgba(0,229,255,0.35)",lineHeight:1.5}}>Tap a category above to start planning this segment</div>
      </div>}
      {cat&&ac&&(
        <div style={{background:ac.w,borderTop:`1px solid ${ac.a}15`,animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          {cat==="transport"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>
            {suggestion?.transport&&!isDismSD('transport')&&!det.transport.mode&&!det.transport.from&&<div style={suggestionCardStyle}>
              <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
              <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{suggestion.transport.route}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:3}}>{suggestion.transport.duration}</div>
              <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:3}}>Est. {suggestion.transport.estimatedCost}</div>
              {suggestion.transport.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:8}}>{suggestion.transport.notes}</div>}
              <div style={disclaimerStyle}>⚡ Estimates — actual prices vary when booked</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>acceptTransportSD(suggestion.transport)} style={acceptBtnStyle}>USE THIS ROUTE</button>
                <button onClick={()=>dismissSD('transport')} style={dismissBtnStyle}>PLAN MY OWN</button>
              </div>
            </div>}
            {(det.transport.mode||det.transport.from)&&<div style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:4}}>
              <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace"}}>✈️ {det.transport.mode||"Transport"}{det.transport.from&&det.transport.to?` · ${det.transport.from} → ${det.transport.to}`:""}{det.transport.cost?` · $${det.transport.cost}`:""}</div>
              {(det.transport.depTime||det.transport.arrTime)&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Space Mono',monospace",marginTop:2}}>{det.transport.depTime?`Departs ${det.transport.depTime}`:""}{det.transport.depTime&&det.transport.arrTime?" · ":""}{det.transport.arrTime?`Arrives ${det.transport.arrTime}`:""}</div>}
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
              <SDF label="FROM" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="Departure" accent="#00E5FF"/>
              <SDF label="TO" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="Arrival" accent="#00E5FF"/>
              <SDF label="DEP TIME" value={det.transport.depTime} onChange={v=>uT("depTime",v)} placeholder="08:30 AM" accent="#00E5FF"/>
              <SDF label="ARR TIME" value={det.transport.arrTime} onChange={v=>uT("arrTime",v)} placeholder="11:45 AM" accent="#00E5FF"/>
            </div>
            <SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="Flight number, booking ref..." accent="#00E5FF" multiline/>
          </div>}
          {cat==="stay"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
            {suggestion?.stay&&!isDismSD('stay')&&!det.stay.name&&<div style={suggestionCardStyle}>
              <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
              <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{suggestion.stay.recommendation}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:3}}>{suggestion.stay.type}</div>
              {suggestion.stay.suggestions?.length>0&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',marginBottom:3}}>Options: {suggestion.stay.suggestions.join(' · ')}</div>}
              <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:3}}>Est. {suggestion.stay.estimatedNightly} · Total ~{suggestion.stay.estimatedTotal}</div>
              <div style={disclaimerStyle}>⚡ Estimates — actual prices vary when booked</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>acceptStaySD(suggestion.stay)} style={acceptBtnStyle}>ADD TO STAY NOTES</button>
                <button onClick={()=>dismissSD('stay')} style={dismissBtnStyle}>PLAN MY OWN</button>
              </div>
            </div>}
            {det.stay.name&&<div style={{background:"rgba(105,240,174,0.04)",border:"1px solid rgba(105,240,174,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:4}}>
              <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace"}}>🏨 {det.stay.name}</div>
              {(det.stay.checkin||det.stay.checkout||det.stay.cost)&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Space Mono',monospace",marginTop:2}}>{det.stay.checkin?`Check-in ${fD(det.stay.checkin)}`:""}{det.stay.checkin&&det.stay.checkout?" · ":""}{det.stay.checkout?`Check-out ${fD(det.stay.checkout)}`:""}{det.stay.cost?` · $${det.stay.cost}`:""}</div>}
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:"flex",gap:6,marginTop:6,overflow:"hidden"}}>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
            </div>
            <SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/>
            <SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/>
          </div>}
          {cat==="activities"&&<div style={{padding:"10px 12px"}}>
            {suggestion?.activities?.map((activity,idx)=>(
              !isDismSD(`activity_${idx}`)&&<div key={idx} style={{...suggestionCardStyle,marginBottom:8,animationDelay:`${idx*100}ms`}}>
                <div style={suggestionHeaderStyle}>✦ SUGGESTED ACTIVITY</div>
                <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{activity.name}</div>
                {activity.provider&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',marginBottom:3}}>{activity.provider}</div>}
                <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:3}}>Est. {activity.estimatedCost}</div>
                {activity.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:8}}>{activity.notes}</div>}
                <div style={disclaimerStyle}>⚡ Estimates only — prices vary when booked</div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>{acceptActivitySD(activity);dismissSD(`activity_${idx}`);}} style={acceptBtnStyle}>+ ADD TO PLAN</button>
                  <button onClick={()=>dismissSD(`activity_${idx}`)} style={dismissBtnStyle}>SKIP</button>
                </div>
              </div>
            ))}
            {det.activities.length===0&&!(suggestion?.activities?.some((_,i)=>!isDismSD(`activity_${i}`)))&&<div style={{textAlign:"center",padding:"6px 0 10px",animation:"fadeIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?11:13,fontStyle:"italic",color:"rgba(255,217,61,0.35)",lineHeight:1.5}}>Add your first activity — dives, tours, day trips</div></div>}
            {det.activities.length>0&&<div style={{marginBottom:12}}>
              {det.activities.map(a=>(
                <div key={a.id} style={{background:"rgba(255,217,61,0.03)",border:"1px solid rgba(255,217,61,0.10)",borderRadius:8,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace",marginBottom:4}}>{a.name}</div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Space Mono',monospace",display:"flex",gap:8,flexWrap:"wrap"}}>
                        {a.date&&<span>{fD(a.date)}</span>}{a.cost&&<span style={{color:"#FFD93D"}}>${a.cost}</span>}{a.transit&&<span style={{color:"rgba(255,255,255,0.50)"}}>🚕 {a.transit}</span>}
                      </div>
                      {a.link&&<a href={a.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#00E5FF",textDecoration:"none",display:"inline-block",marginTop:4,maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
                    </div>
                    <button onClick={()=>setDet(d=>({...d,activities:d.activities.filter(x=>x.id!==a.id)}))} style={{background:"none",border:"none",color:"rgba(255,255,255,0.30)",fontSize:14,cursor:"pointer",lineHeight:1,padding:"2px 4px",flexShrink:0}}>✕</button>
                  </div>
                </div>
              ))}
              <div style={{paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.25)",fontFamily:"monospace",letterSpacing:1}}>TOTAL ACTIVITIES</span>
                <span style={{fontSize:13,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"monospace"}}>${det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}</span>
              </div>
            </div>}
            <div style={{padding:"9px 0px"}}>
              <div style={{fontSize:11,color:"rgba(255,217,61,0.4)",letterSpacing:1.5,marginBottom:6,fontFamily:"'Space Mono',monospace",fontWeight:500}}>ADD ACTIVITY</div>
              <div style={{display:"flex",gap:5,marginBottom:5,overflow:"hidden"}}>
                <div style={{flex:1,minWidth:0}}><SDF label="ACTIVITY" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#FFD93D"/></div>
                <div style={{flex:1,minWidth:0}}><SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#FFD93D"/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6,overflow:"hidden"}}>
                <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#FFD93D"/>
                <SDF label="TRANSIT" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Taxi from hotel..." accent="#FFD93D"/>
              </div>
              <SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://klook.com / dive shop..." accent="#FFD93D"/>
              <button onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:[...d.activities,{...nAct,id:Date.now()}]}));setNAct({name:"",date:"",cost:"",transit:"",link:""});}} style={{marginTop:8,padding:isMobile?"5px 12px":"6px 14px",borderRadius:5,border:`1px solid rgba(255,217,61,${nAct.name?"0.4":"0.14"})`,background:nAct.name?"rgba(255,217,61,0.1)":"transparent",color:nAct.name?"#FFD93D":"rgba(255,255,255,0.18)",fontSize:isMobile?11:15,cursor:nAct.name?"pointer":"default",fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:700}}>+ ADD</button>
            </div>
            <div style={{marginTop:12}}><SDF label="ACTIVITY NOTES" value={det.actNotes||""} onChange={v=>setDet(d=>({...d,actNotes:v}))} placeholder="Tips, what to bring, dress code, best time..." accent="#FFD93D" multiline/></div>
          </div>}
          {cat==="food"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
            {suggestion?.food&&!isDismSD('food')&&<div style={suggestionCardStyle}>
              <div style={suggestionHeaderStyle}>✦ FOOD & DINING</div>
              <div style={{fontSize:14,fontWeight:600,color:'#FFD93D',marginBottom:6}}>Est. {suggestion.food.dailyBudget}/day · ~{suggestion.food.totalEstimate} total</div>
              {suggestion.food.recommendations?.map((rec,i)=>(
                <div key={i} style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:4,paddingLeft:8,borderLeft:'2px solid rgba(255,159,67,0.30)'}}>{rec}</div>
              ))}
              {suggestion.food.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginTop:6}}>{suggestion.food.notes}</div>}
              <div style={{...disclaimerStyle,marginTop:8}}>⚡ Suggestions based on current market knowledge — always verify locally</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>{const bud=(suggestion.food.dailyBudget||"").match(/\d+/)?.[0]||"";if(bud)uF("dailyBudget",bud);uF("notes",suggestion.food.recommendations?.join('\n')||"");dismissSD('food');}} style={acceptBtnStyle}>USE ESTIMATES</button>
                <button onClick={()=>dismissSD('food')} style={dismissBtnStyle}>PLAN MY OWN</button>
              </div>
            </div>}
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <div style={{flex:1}}><SDF label="DAILY FOOD BUDGET ($)" type="number" value={det.food.dailyBudget} onChange={v=>uF("dailyBudget",v)} placeholder="e.g. 45" accent="#FF9F43"/></div>
              <button onClick={aiFood} disabled={aiLoad} style={{padding:"5px 10px",borderRadius:5,border:"1px solid rgba(255,159,67,0.3)",background:"rgba(255,159,67,0.05)",color:"rgba(255,159,67,0.8)",fontSize:11,cursor:aiLoad?"wait":"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:600,whiteSpace:"nowrap",height:28,flexShrink:0}}>{aiLoad?"✦...":"✦ CO-ARCH EST"}</button>
            </div>
            {det.food.dailyBudget&&<div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,159,67,0.05)",border:"1px solid rgba(255,159,67,0.16)",borderRadius:7}}>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>{segment.nights} nights × ${det.food.dailyBudget}/day</span>
              <span style={{fontSize:13,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"monospace"}}>${(parseFloat(det.food.dailyBudget)*segment.nights).toLocaleString()}</span>
            </div>}
            <SDF label="FOOD NOTES" value={det.food.notes} onChange={v=>uF("notes",v)} placeholder="Must-try dishes, market days, dietary notes..." accent="#FF9F43" multiline/>
          </div>}
          {cat==="misc"&&<div style={{padding:"10px 12px"}}>
            {det.misc.length>0&&<div style={{marginBottom:12}}>
              {det.misc.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(162,155,254,0.07)"}}>
                  <div style={{flex:1,fontSize:isMobile?12:15,color:"#FFF",fontFamily:"'Space Mono',monospace"}}>{m.name}</div>
                  <span style={{fontSize:isMobile?12:15,fontWeight:700,color:"#A29BFE",fontFamily:"monospace",flexShrink:0}}>${parseFloat(m.cost||0).toLocaleString()}</span>
                  <button onClick={()=>setDet(d=>({...d,misc:d.misc.filter(x=>x.id!==m.id)}))} style={{background:"none",border:"none",color:"rgba(255,255,255,0.18)",fontSize:16,cursor:"pointer",lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
                </div>
              ))}
              <div style={{paddingTop:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"rgba(255,255,255,0.25)",fontFamily:"monospace",letterSpacing:1}}>TOTAL MISC</span><span style={{fontSize:13,fontWeight:600,color:"rgba(162,155,254,0.8)",fontFamily:"monospace"}}>${det.misc.reduce((s,m)=>s+(parseFloat(m.cost)||0),0).toLocaleString()}</span></div>
            </div>}
            <div style={{background:"rgba(162,155,254,0.02)",border:"1px dashed rgba(162,155,254,0.16)",borderRadius:8,padding:"11px 12px"}}>
              <div style={{fontSize:11,color:"rgba(162,155,254,0.4)",letterSpacing:1.5,marginBottom:6,fontFamily:"'Space Mono',monospace",fontWeight:500}}>ADD EXPENSE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
                <SDF label="ITEM" value={nMisc.name} onChange={v=>setNMisc(m=>({...m,name:v}))} placeholder="Visa / permit / rental..." accent="#A29BFE"/>
                <SDF label="COST ($)" type="number" value={nMisc.cost} onChange={v=>setNMisc(m=>({...m,cost:v}))} placeholder="0" accent="#A29BFE"/>
              </div>
              <button onClick={()=>{if(!nMisc.name)return;setDet(d=>({...d,misc:[...d.misc,{...nMisc,id:Date.now()}]}));setNMisc({name:"",cost:""});}} style={{padding:isMobile?"5px 12px":"6px 14px",borderRadius:5,border:`1px solid rgba(162,155,254,${nMisc.name?"0.4":"0.14"})`,background:nMisc.name?"rgba(162,155,254,0.1)":"transparent",color:nMisc.name?"#A29BFE":"rgba(255,255,255,0.18)",fontSize:isMobile?11:15,cursor:nMisc.name?"pointer":"default",fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:700}}>+ ADD</button>
            </div>
          </div>}
          {/* arch #2: inline intel preview */}
          {cat==="intel"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
            {intelSnippet&&!intelSnippet.error?(
              <div style={{padding:"10px 12px",background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.14)",borderRadius:8}}>
                {intelSnippet.tagline&&<div style={{fontSize:isMobile?12:15,color:"#A29BFE",fontStyle:"italic",marginBottom:8,lineHeight:1.55}}>{intelSnippet.tagline}</div>}
                {intelSnippet.mustDo?.slice(0,3).map((item,i)=><div key={i} style={{fontSize:isMobile?11:15,color:"rgba(255,255,255,0.68)",marginBottom:4,paddingLeft:8}}>• {item}</div>)}
                {intelSnippet.streetIntel?.[0]&&<div style={{marginTop:8,padding:"6px 9px",background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.18)",borderRadius:6}}><div style={{fontSize:isMobile?10:15,color:"#FF6B6B",fontWeight:700,letterSpacing:1.5,marginBottom:2}}>{intelSnippet.streetIntel[0].type}</div><div style={{fontSize:isMobile?11:15,color:"#FFF"}}>{intelSnippet.streetIntel[0].alert}</div></div>}
                <div style={{marginTop:10,fontSize:isMobile?11:15,color:"rgba(0,229,255,0.5)",fontFamily:"'Space Mono',monospace"}}>→ Full briefing in INTEL tab</div>
              </div>
            ):(
              <div style={{padding:"12px 14px",background:"rgba(255,107,107,0.03)",border:"1px solid rgba(255,107,107,0.09)",borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18,opacity:0.35}}>🔭</span>
                <div><div style={{fontSize:isMobile?11:15,color:"rgba(255,255,255,0.38)",fontStyle:"italic",marginBottom:2}}>No briefing for {segment.name} yet.</div><div style={{fontSize:isMobile?11:15,color:"rgba(0,229,255,0.45)",fontFamily:"'Space Mono',monospace"}}>→ Generate in the INTEL tab</div></div>
              </div>
            )}
            <SDF label="YOUR NOTES" value={det.intel.notes} onChange={v=>setDet(d=>({...d,intel:{...d.intel,notes:v}}))} placeholder="Visa requirements, local contacts, personal tips..." accent="#FF6B6B" multiline/>
          </div>}
        </div>
      )}
      </div>{/* end pointerEvents wrapper */}
    </div>
  );
}

// ─── ProgDots ─────────────────────────────────────────────────────
function ProgDots({phaseId,segment,intelSnippet}) {
  const d=loadSeg()[`${phaseId}-${segment.id}`]||{};
  const dots=[!!(d.transport?.mode||d.transport?.cost),!!(d.stay?.name||d.stay?.cost),(d.activities?.length||0)>0,!!(d.food?.dailyBudget),(d.misc?.length||0)>0,!!(intelSnippet?.tagline||d.intel?.notes)];
  return(<div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>{dots.map((on,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:on?CAT_DOT_COLORS[i]:"rgba(255,255,255,0.1)",boxShadow:on?`0 0 4px ${CAT_DOT_COLORS[i]}`:"none",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flexShrink:0}}/>)}</div>);
}

// ─── SegmentRow ───────────────────────────────────────────────────
function SegmentRow({segment,phaseId,phaseColor,intelSnippet,isLast,onAskOpenChange,onSegmentTap,suggestion,suggestionsLoading}) {
  const isMobile=useMobile();
  const segKey=`${phaseId}-${segment.id}`;
  const [open,setOpen]=useState(false);
  const [askOpen,setAskOpen]=useState(false);
  useEffect(()=>{onAskOpenChange?.(askOpen);},[askOpen]);
  const [askInput,setAskInput]=useState("");
  const [askChat,setAskChat]=useState([]);
  const [askLoading,setAskLoading]=useState(false);
  const [showChangeModal,setShowChangeModal]=useState(false);
  const [status,setStatus]=useState(()=>{const d=loadSeg()[segKey];return d?.status||'planning';});
  const segData=loadSeg()[segKey]||null;
  const askEnd=useRef(null);
  const tc=TC[segment.type]||"#FFD93D";
  const sc=STATUS_CFG[status]||STATUS_CFG.planning;
  // Planning completion status
  const hasTransport=segData&&Object.values(segData.transport||{}).some(v=>v&&String(v).length>0);
  const hasStay=segData?.stay?.name?.length>0;
  const hasActivities=(segData?.activities?.length||0)>0;
  const completedCount=[hasTransport,hasStay,hasActivities].filter(Boolean).length;
  const planStatus=status==="booked"||status==="confirmed"?null:completedCount===0?{label:"NOT STARTED",color:"rgba(255,255,255,0.85)",bg:"rgba(255,255,255,0.12)",border:"rgba(255,255,255,0.20)"}:completedCount===1?{label:"IN PROGRESS",color:"#FF9F43",bg:"rgba(255,159,67,0.10)",border:"rgba(255,159,67,0.30)"}:completedCount===2?{label:"MOSTLY DONE",color:"#FFD93D",bg:"rgba(255,217,61,0.10)",border:"rgba(255,217,61,0.30)"}:{label:"PLANNED",color:"#69F0AE",bg:"rgba(105,240,174,0.10)",border:"rgba(105,240,174,0.30)"};
  const isCancelled=status==='cancelled';
  const borderColor=status==='planning'?tc:sc.color;

  function saveStatus(newStatus){
    const all=loadSeg();const ex=all[segKey]||{};const prev=ex.status||'planning';
    all[segKey]={...ex,status:newStatus,statusUpdatedAt:new Date().toISOString(),changes:[...(ex.changes||[]),{changedAt:new Date().toISOString(),previousStatus:prev}]};
    saveSeg(all);setStatus(newStatus);
  }
  function handleBadgeTap(e){
    e.stopPropagation();
    if(status==='booked'){setShowChangeModal(true);return;}
    if(STATUS_NEXT[status])saveStatus(STATUS_NEXT[status]);
  }

  useEffect(()=>{askEnd.current?.scrollIntoView({behavior:"smooth"});},[askChat]);
  async function sendAsk(){
    if(!askInput.trim()||askLoading)return;
    const msg=askInput;setAskInput("");setAskChat(p=>[...p,{role:"user",text:msg}]);setAskLoading(true);
    const det=loadSeg()[segKey]||{};
    const ctx=`Segment:${segment.name}(${segment.type}).${segment.nights}n.$${segment.budget}.${det.stay?.name?"Stay:"+det.stay.name+".":""}${det.transport?.mode?"Transport:"+det.transport.mode+".":""}`;
    const statusCtx=status==='changed'||status==='cancelled'?` Note: this segment is ${status}.`:'';
    const res=await askAI(`Travel co-architect.${ctx}${statusCtx} Q:"${msg}".2-3 sentences max.`,300);
    setAskChat(p=>[...p,{role:"ai",text:res}]);setAskLoading(false);
  }
  return(
    <div style={{border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,background:'rgba(255,255,255,0.03)',padding:'2px 0',marginBottom:8,opacity:isCancelled?0.65:1,transition:"opacity 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
      {/* Change Flow Modal */}
      {showChangeModal&&(
        <div onClick={()=>setShowChangeModal(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,4,14,0.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:400,background:"rgba(0,8,20,0.98)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:14,padding:"24px 20px",animation:"fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontStyle:"italic",color:"#FF9F43",marginBottom:6}}>What happened?</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"'Space Mono',monospace",marginBottom:20,lineHeight:1.7}}>{segment.name} is currently booked. What changed?</div>
            <div style={{display:"flex",gap:10,flexDirection:isMobile?"column":"row"}}>
              <button onClick={()=>{saveStatus('changed');setShowChangeModal(false);setOpen(true);}} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(0,229,255,0.4)",background:"rgba(0,229,255,0.08)",color:"#00E5FF",fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"'Space Mono',monospace",minHeight:44}}>UPDATE BOOKING</button>
              <button onClick={()=>{saveStatus('cancelled');setShowChangeModal(false);}} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(255,107,107,0.4)",background:"rgba(255,107,107,0.08)",color:"#FF6B6B",fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"'Space Mono',monospace",minHeight:44}}>MARK CANCELLED</button>
            </div>
            <button onClick={()=>setShowChangeModal(false)} style={{marginTop:12,width:"100%",background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:11,cursor:"pointer",fontFamily:"'Space Mono',monospace",minHeight:36}}>← Keep as BOOKED</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",alignItems:"stretch",minHeight:50,borderLeft:`2px solid ${borderColor}${open?"88":"2a"}`,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
        <div onClick={()=>{if(onSegmentTap){onSegmentTap(segment);}else{setOpen(o=>!o);}}} style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"10px 6px 10px 12px":"12px 10px 12px 20px",cursor:"pointer",background:open?`${tc}04`:"transparent",transition:"background 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flex:1,minWidth:0}}>
          {/* Row 1: dot + name + type badge + budget */}
          <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:tc,flexShrink:0,boxShadow:open?`0 0 7px ${tc}`:"none"}}/>
            <span style={{fontSize:isMobile?14:15,fontWeight:600,color:isCancelled?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:isCancelled?"line-through":"none"}}>{segment.name}</span>
            <span style={{fontSize:11,color:`${tc}bb`,background:`${tc}0e`,border:`1px solid ${tc}1e`,borderRadius:6,padding:"1px 6px",letterSpacing:0.5,fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>{segment.type?.toUpperCase()}</span>
            <span style={{fontSize:isMobile?12:14,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",flexShrink:0,textDecoration:isCancelled?"line-through":"none"}}>{fmt(segment.budget)}</span>
          </div>
          {/* Row 2: date + nights + dives */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,paddingLeft:13,minWidth:0,flexWrap:"wrap"}}>
            <span style={{color:"rgba(255,255,255,0.75)",fontFamily:"'Space Mono',monospace",fontSize:13,whiteSpace:"nowrap"}}>{fD(segment.arrival)}→{fD(segment.departure)}</span>
            <span style={{color:"rgba(255,255,255,0.60)",fontSize:13,whiteSpace:"nowrap"}}>· {segment.nights}n</span>
            {segment.diveCount>0&&<span style={{color:"rgba(0,229,255,0.7)",fontSize:13,whiteSpace:"nowrap"}}>· 🤿{segment.diveCount}</span>}
            <div style={{flex:1,minWidth:0}}/>
            <ProgDots phaseId={phaseId} segment={segment} intelSnippet={intelSnippet}/>
            <button onClick={handleBadgeTap} style={{background:planStatus?planStatus.bg:`${sc.color}18`,border:planStatus?`1px solid ${planStatus.border}`:`1px solid ${sc.color}55`,borderRadius:12,padding:"3px 8px",fontSize:11,fontWeight:700,letterSpacing:0.5,color:(planStatus||sc).color,cursor:"pointer",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:2,lineHeight:1.4,minHeight:22,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flexShrink:0,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",animation:status==='planning'&&completedCount===0?'planningPulse 2.2s ease-in-out infinite':'none'}}>
              <span style={{fontSize:11}}>{planStatus?completedCount>=3?"✓":sc.icon:sc.icon}</span>{planStatus?planStatus.label:sc.label}
            </button>
          </div>
        </div>
        {onSegmentTap?<div onClick={e=>{e.stopPropagation();onSegmentTap(segment);}} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"0 10px",cursor:"pointer",flexShrink:0}}>
          <span style={{fontSize:18,color:"rgba(255,255,255,0.30)",fontWeight:300}}>›</span>
        </div>:<>
        <div onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"0 8px",cursor:"pointer",flexShrink:0}}>
          <div style={{width:16,height:16,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.15":"0.08"})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:11,color:open?"#00E5FF":"rgba(255,255,255,0.4)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>▼</span>
          </div>
        </div>
        <button onClick={e=>{e.stopPropagation();setAskOpen(o=>!o);}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:"8px 10px",background:askOpen?"rgba(255,217,61,0.1)":"rgba(255,217,61,0.03)",border:"none",borderLeft:`1px solid rgba(255,217,61,${askOpen?"0.45":"0.22"})`,cursor:"pointer",flexShrink:0,height:"100%",minWidth:38,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} title="Ask co-architect">
          <span style={{fontSize:11,color:askOpen?"#FFD93D":"rgba(255,217,61,0.55)",lineHeight:1,textShadow:askOpen?"0 0 8px rgba(255,217,61,0.6)":"none",animation:askOpen?"none":"glowPulse 2.5s ease-in-out infinite"}}>✦</span>
          <span style={{fontSize:10,color:askOpen?"#FFD93D":"rgba(255,217,61,0.4)",letterSpacing:1,fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>ASK</span>
        </button></>}
      </div>
      {!open&&segData&&(hasTransport||hasStay||hasActivities||segData.food?.dailyBudget)&&(
        <div onClick={()=>setOpen(true)} style={{padding:"4px 14px 6px 20px",display:"flex",flexWrap:"wrap",gap:"4px 8px",cursor:"pointer",background:"rgba(0,4,14,0.4)"}}>
          {hasTransport&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",lineHeight:1.5}}>✈️ {segData.transport.mode||"Transport"}{segData.transport.from&&segData.transport.to?` · ${segData.transport.from} → ${segData.transport.to}`:""}{segData.transport.cost?` · $${segData.transport.cost}`:""}</span>}
          {hasStay&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",lineHeight:1.5}}>🏨 {segData.stay.name}{segData.stay.cost?` · $${segData.stay.cost}`:""}</span>}
          {hasActivities&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",lineHeight:1.5}}>⚡ {segData.activities.length} activit{segData.activities.length===1?"y":"ies"}{segData.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0)>0?` · $${segData.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}`:""}</span>}
          {segData.food?.dailyBudget&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",lineHeight:1.5}}>🍜 ${segData.food.dailyBudget}/day</span>}
        </div>
      )}
      {askOpen&&(
        <div style={{background:"rgba(0,4,14,0.95)",borderTop:"1px solid rgba(255,217,61,0.12)",padding:"10px 14px",animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{fontSize:isMobile?11:15,color:"rgba(255,217,61,0.6)",fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1.5}}>✦ CO-ARCHITECT · {segment.name.toUpperCase()}</span>
            <button onClick={()=>setAskOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:isMobile?13:15,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          {(status==='changed'||status==='cancelled')&&<div style={{marginBottom:8,padding:"6px 9px",borderRadius:7,background:status==='changed'?"rgba(255,107,107,0.08)":"rgba(136,136,136,0.08)",border:`1px solid ${sc.color}33`}}><span style={{fontSize:10,color:sc.color,fontFamily:"'Space Mono',monospace",letterSpacing:1}}>Looks like something changed with this {status==='cancelled'?'booking':'segment'}. Want help finding alternatives or adjusting your timeline?</span></div>}
          {askChat.length===0&&<div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?12:15,fontStyle:"italic",color:"rgba(255,217,61,0.45)",marginBottom:8,lineHeight:1.6}}>"Ask me anything — best dive ops, where to stay, local tips..."</div>}
          {askChat.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8,maxHeight:160,overflowY:"auto"}}>
            {askChat.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:6,flexDirection:m.role==="user"?"row-reverse":"row",alignItems:"flex-start"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:m.role==="ai"?"#A9461D":"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?11:15,flexShrink:0}}>{m.role==="ai"?"✦":"·"}</div>
                <div style={{borderRadius:8,padding:"6px 9px",fontSize:isMobile?11:15,color:"#FFF",lineHeight:1.6,maxWidth:"88%",background:m.role==="ai"?"rgba(169,70,29,0.18)":"rgba(255,255,255,0.06)",border:`1px solid ${m.role==="ai"?"rgba(169,70,29,0.35)":"rgba(255,255,255,0.08)"}`}}>{m.text}</div>
              </div>
            ))}
            {askLoading&&<div style={{fontSize:isMobile?11:15,color:"rgba(169,70,29,0.6)",fontStyle:"italic",paddingLeft:22}}>✦ thinking...</div>}
            <div ref={askEnd}/>
          </div>}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7}}>
            {["Best dive ops?","Where to stay?","What to skip?","Budget tips?","Local food?"].map(p=><button key={p} onClick={()=>setAskInput(p)} style={{padding:isMobile?"2px 7px":"3px 9px",borderRadius:12,border:"1px solid rgba(255,217,61,0.2)",background:"rgba(255,217,61,0.05)",color:"rgba(255,217,61,0.65)",fontSize:isMobile?10:15,cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>{p}</button>)}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input value={askInput} onChange={e=>setAskInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendAsk();}} placeholder={`Ask about ${segment.name}...`} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:7,color:"#FFF",fontSize:isMobile?12:15,padding:isMobile?"6px 8px":"8px 10px",fontFamily:"'Space Mono',monospace",outline:"none",minHeight:isMobile?30:34,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
            <button onClick={sendAsk} style={{background:"rgba(255,217,61,0.12)",border:"1px solid rgba(255,217,61,0.3)",borderRadius:7,color:"#FFD93D",fontSize:isMobile?13:15,padding:isMobile?"5px 9px":"6px 11px",cursor:"pointer",minWidth:isMobile?30:34,minHeight:isMobile?30:34,fontWeight:700}}>↑</button>
          </div>
        </div>
      )}
      {open&&<SegmentDetails phaseId={phaseId} segment={segment} intelSnippet={intelSnippet} status={status} onStatusChange={saveStatus} suggestion={suggestion} suggestionsLoading={suggestionsLoading}/>}
      {isCancelled&&!open&&(
        <div style={{padding:"6px 16px 8px 20px",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:11,color:"rgba(136,136,136,0.7)",fontFamily:"'Space Mono',monospace",flex:1,letterSpacing:1}}>✕ CANCELLED</span>
          <button onClick={e=>{e.stopPropagation();saveStatus('planning');}} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"1px solid rgba(0,229,255,0.3)",background:"rgba(0,229,255,0.06)",color:"#00E5FF",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1,minHeight:28}}>+ REBOOK</button>
        </div>
      )}
    </div>
  );
}

// ─── PhaseCard ────────────────────────────────────────────────────
// ─── Activity Icons ───────────────────────────────────────────────
const ACTIVITY_ICONS={'DIVE':'🤿','CULTURE':'🏛️','HIKING':'🥾','SAILING':'⛵','CITY':'🏙️','FOOD':'🍜','BEACH':'🏖️','SAFARI':'🦁','WELLNESS':'🧘','ADVENTURE':'🏔️','DEFAULT':'✦'};
const SEG_TYPE_TO_ACT={Dive:'DIVE',Surf:'SAILING',Culture:'CULTURE',Exploration:'ADVENTURE',Nature:'SAFARI',Moto:'ADVENTURE',Trek:'HIKING',Relax:'WELLNESS',Transit:'DEFAULT',City:'CITY'};
function getPhaseActivityIcon(phase){const t=phase.segments?.[0]?.type;return ACTIVITY_ICONS[SEG_TYPE_TO_ACT[t]||'DEFAULT']||'✦';}

// ─── PhaseDetailPage ──────────────────────────────────────────────
// ─── SegmentWorkspace (Level 3) ───────────────────────────────────
function SegmentWorkspace({segment,phaseId,phaseName:phaseLabelName,phaseFlag,intelSnippet,onBack,onBackToExpedition,suggestion:suggestionProp,suggestionsLoading,homeCity="",prevCity=""}) {
  const isMobile=useMobile();
  const key=`${phaseId}-${segment.id}`;
  const blank={transport:{mode:"",from:"",to:"",depTime:"",arrTime:"",cost:"",notes:""},stay:{name:"",checkin:"",checkout:"",cost:"",link:"",notes:""},activities:[],actNotes:"",food:{dailyBudget:"",notes:""},misc:[],intel:{notes:""}};
  const [det,setDet]=useState(()=>{const a=loadSeg();return a[key]||blank;});
  const [tab,setTab]=useState("transport");
  const [editingTransport,setEditingTransport]=useState(false);
  const [editingStay,setEditingStay]=useState(false);
  const [selectedStayProp,setSelectedStayProp]=useState("");
  const [showStayResuggest,setShowStayResuggest]=useState(false);
  const [transportEst,setTransportEst]=useState(null);
  const [transportEstLoading,setTransportEstLoading]=useState(false);
  const transportEstTimer=useRef(null);
  const fetchTransportEst=useCallback(()=>{
    const from=det.transport.from,to=det.transport.to,mode=det.transport.mode;
    if(!from||!to)return;
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
  useEffect(()=>{if(det.transport.from&&det.transport.to)fetchTransportEst();},[det.transport.from,det.transport.to,det.transport.mode]);
  const [nAct,setNAct]=useState({name:"",date:"",cost:"",transit:"",link:""});
  const [aiLoad,setAiLoad]=useState(false);
  const [saveFlash,setSaveFlash]=useState(false);
  const saveFlashRef=useRef(null);
  const isFirst=useRef(true);
  const [status,setStatus]=useState(()=>{const d=loadSeg()[key];return d?.status||'planning';});
  // Resolve suggestion: use prop if available, otherwise look up by segment name from localStorage
  const suggestion = (()=>{
    if(suggestionProp) return suggestionProp;
    const all = loadSuggestionsFromStorage();
    return findSuggestionForSegment(all, segment.name);
  })();
  const dismissKey = segment.name || `${phaseId}`;
  const [dismissed,setDismissed]=useState(()=>loadDismissed());
  const isDism=(type)=>!!dismissed[`${dismissKey}_${type}`];
  const dismiss=(type)=>{const d={...dismissed,[`${dismissKey}_${type}`]:true};setDismissed(d);saveDismissed(d);};
  const [docsData,setDocsData]=useState(()=>{try{const s=localStorage.getItem(`1bn_docs_${phaseId}_v1`);return s?JSON.parse(s):null;}catch(e){return null;}});
  const [docsLoading,setDocsLoading]=useState(false);
  const [docsNote,setDocsNote]=useState(det.intel?.notes||"");
  const [bookDropdown,setBookDropdown]=useState(null);
  async function loadDocs(){if(docsData||docsLoading)return;setDocsLoading(true);try{const raw=await askAI(`Travel advisor. Destination:${segment.name},${segment.country}. Home:USA. Return JSON only:{"visa":{"required":true,"details":"","cost":""},"health":{"required":[],"recommended":[],"notes":""},"money":{"currency":"","tips":"","warning":""},"connectivity":{"tips":""},"safety":{"level":"low","notes":""},"customs":{"tips":""},"emergency":{"police":"","ambulance":"","embassy":""}}`,800);const m=raw.match(/\{[\s\S]*\}/);if(m){const d=JSON.parse(m[0]);setDocsData(d);localStorage.setItem(`1bn_docs_${phaseId}_v1`,JSON.stringify(d));}}catch(e){}setDocsLoading(false);}
  useEffect(()=>{window.scrollTo(0,0);},[]);
  useEffect(()=>{if(isFirst.current){isFirst.current=false;return;}const a=loadSeg();const ex=a[key]||{};a[key]={...ex,...det,status:ex.status||'planning',statusUpdatedAt:ex.statusUpdatedAt||null,changes:ex.changes||[]};saveSeg(a);setSaveFlash(true);if(saveFlashRef.current)clearTimeout(saveFlashRef.current);saveFlashRef.current=setTimeout(()=>setSaveFlash(false),2000);},[det]);
  const uT=(f,v)=>setDet(d=>({...d,transport:{...d.transport,[f]:v}}));
  const uS=(f,v)=>setDet(d=>({...d,stay:{...d.stay,[f]:v}}));
  const uF=(f,v)=>setDet(d=>({...d,food:{...d.food,[f]:v}}));
  async function aiFood(){setAiLoad(true);const r=await askAI(`Daily food budget USD solo traveler ${segment.name}. Number only.`,20);const n=r.replace(/\D/g,"");if(n)uF("dailyBudget",n);setAiLoad(false);}
  const acceptTransport=(t)=>{const mode=detectMode(t.route);if(mode)uT("mode",mode);uT("from",prevCity||homeCity||"");uT("to",segment.name||"");uT("cost",(t.estimatedCost||"").split('-')[0].replace(/[^0-9]/g,''));uT("notes",`${t.route}\n\nEst. ${t.estimatedCost}${t.bestTiming?`\nBest timing: ${t.bestTiming}`:""}${t.notes?`\n${t.notes}`:""}`);if(segment.arrival){uT("depTime",fD(segment.arrival));uT("arrTime",fD(segment.arrival));}dismiss('transport');};
  const acceptStay=(s)=>{const primary=s.suggestions?.[0]||"";const alts=s.suggestions?.slice(1)||[];if(primary)uS("name",primary);uS("cost",(s.estimatedTotal||"").split('-')[0].replace(/[^0-9]/g,''));if(segment.arrival&&!det.stay.checkin)uS("checkin",segment.arrival);if(segment.departure&&!det.stay.checkout)uS("checkout",segment.departure);uS("notes",`${alts.length>0?`Alternatives: ${alts.join(', ')}\n\n`:""}${s.recommendation||""}${s.notes?`\n${s.notes}`:""}`);dismiss('stay');};
  const acceptActivity=(a)=>{const sentences=(a.notes||"").split(/(?<=[.!?])\s+/);const brief=sentences[0]||"";const tipText=sentences.slice(1).join(' ');setDet(d=>({...d,activities:[...d.activities,{name:a.name,brief,tip:tipText,date:"",cost:(a.estimatedCost||"").match(/\d+/)?.[0]||"",notes:`${a.provider||""}${tipText?`\n${tipText}`:""}`,provider:a.provider||"",id:Date.now()+Math.random()}]}));};
  const hasT=Object.values(det.transport||{}).some(v=>v&&String(v).length>0);
  const hasS=det.stay?.name?.length>0;
  const TABS=[{id:"transport",label:"TRANSPORT",icon:"✈️"},{id:"stay",label:"STAY",icon:"🏨"},{id:"activities",label:"ACTIVITIES",icon:"⚡",count:det.activities.length},{id:"food",label:"FOOD",icon:"🍜"},{id:"budget",label:"BUDGET",icon:"💰"},{id:"docs",label:"DOCS",icon:"📋"}];
  return(
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:300,background:'#03070F',overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'12px 16px',gap:10,background:'rgba(0,8,16,0.95)',borderBottom:'1px solid rgba(255,159,67,0.15)',position:'sticky',top:0,zIndex:10}}>
        {isMobile?<button onClick={onBack} style={{background:'none',border:'none',color:'#FF9F43',fontSize:24,cursor:'pointer',padding:'0 8px 0 0',fontWeight:300,lineHeight:1,minWidth:32,minHeight:44,display:'flex',alignItems:'center',gap:6}}>‹ <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",letterSpacing:2,opacity:0.60}}>{phaseLabelName.toUpperCase()}</span></button>
        :<div style={{display:'flex',alignItems:'center',gap:8,fontSize:11,fontFamily:"'Space Mono',monospace"}}>
          <span onClick={onBackToExpedition||onBack} style={{color:'#FF9F43',cursor:'pointer'}}>←</span>
          <span onClick={onBackToExpedition||onBack} style={{color:'rgba(255,255,255,0.45)',cursor:'pointer',letterSpacing:1}}>EXPEDITION</span>
          <span style={{color:'rgba(255,255,255,0.25)'}}>›</span>
          <span onClick={onBack} style={{color:'rgba(255,255,255,0.45)',cursor:'pointer',letterSpacing:1}}>{phaseLabelName.toUpperCase()}</span>
          <span style={{color:'rgba(255,255,255,0.25)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.85)',letterSpacing:1}}>{segment.name.toUpperCase()}</span>
        </div>}
        <div style={{flex:1,minWidth:0}}>
          {isMobile&&<div style={{fontSize:17,fontWeight:600,color:'#FFFFFF',fontFamily:"'Fraunces',serif"}}>{segment.name}</div>}
          <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',fontFamily:"'Space Mono',monospace",marginTop:isMobile?2:0}}>{isMobile?`${segment.nights}n`:`${segment.nights} Nights`} · {segment.type} · {fmt(segment.budget)}</div>
        </div>
      </div>
      {/* Tab bar */}
      <div style={{display:'flex',justifyContent:'center',background:'rgba(0,4,12,0.95)',borderBottom:'1px solid rgba(255,255,255,0.08)',position:'sticky',top:isMobile?68:56,zIndex:9}}>
        {TABS.map(t=>{const on=tab===t.id;return(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:isMobile?1:undefined,minWidth:isMobile?0:undefined,padding:isMobile?'10px 2px':'10px 16px',background:'none',border:'none',borderBottom:on?'2px solid #FF9F43':'2px solid transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,transition:'all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)',overflow:'hidden',opacity:on?1:0.75,transform:on?'scale(1.05)':'scale(1)'}}>
            <span style={{fontSize:isMobile?15:18,lineHeight:1}}>{t.icon}</span>
            <span style={{fontSize:isMobile?9:11,fontWeight:600,fontFamily:"'Space Mono',monospace",color:on?'#FF9F43':'rgba(255,255,255,0.45)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{t.label}{t.count>0?` (${t.count})`:""}</span>
          </button>
        );})}
        {saveFlash&&<div style={{position:'absolute',right:8,top:8,fontFamily:"'Space Mono',monospace",fontSize:13,color:'#69F0AE',opacity:0.80,letterSpacing:1,pointerEvents:'none'}}>✓ saved</div>}
      </div>
      {/* Tab content */}
      <div style={{border:'1.5px solid rgba(255,255,255,0.10)',borderRadius:16,background:'rgba(255,255,255,0.025)',padding:20,margin:'12px 16px',minHeight:300}}>
        {/* TRANSPORT */}
        {tab==="transport"&&<div style={{border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.40)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.transport&&!isDism('transport')&&!hasT&&<div style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:6}}>{suggestion.transport.route}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:4}}>{suggestion.transport.duration}</div>
            <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. {suggestion.transport.estimatedCost}</div>
            {suggestion.transport.bestTiming&&<div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:4}}>{suggestion.transport.bestTiming}</div>}
            {suggestion.transport.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12}}>{suggestion.transport.notes}</div>}
            <div style={disclaimerStyle}>⚡ Estimates based on current market rates — actual prices vary when booked</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>acceptTransport(suggestion.transport)} style={acceptBtnStyle}>USE THIS ROUTE</button>
              <button onClick={()=>dismiss('transport')} style={dismissBtnStyle}>PLAN MY OWN</button>
            </div>
          </div>}
          {hasT&&<div style={{border:'1.5px solid rgba(255,159,67,0.45)',borderRadius:14,background:'rgba(255,140,50,0.10)',padding:'18px 20px',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:10,fontFamily:"'Space Mono',monospace",color:'rgba(255,159,67,0.65)',letterSpacing:2,flex:1}}>✈️ TRANSPORT</span>
              <button onClick={()=>{const from=encodeURIComponent(det.transport.from||'');const to=encodeURIComponent(det.transport.to||'');setBookDropdown(bookDropdown==='transport'?null:'transport');}} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Space Mono',monospace",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button onClick={()=>setEditingTransport(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Space Mono',monospace",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28}}>{editingTransport?'DONE':'EDIT'}</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.transport.from&&det.transport.to?`${det.transport.from} → ${det.transport.to}`:det.transport.mode||"Transport"}</div>
            {(det.transport.depTime||det.transport.cost)&&<div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Space Mono',monospace",marginBottom:4}}>{det.transport.depTime?`${det.transport.depTime}`:""}{det.transport.depTime&&det.transport.cost?" · ":""}{det.transport.cost?`Est. $${det.transport.cost}`:""}{det.transport.mode&&det.transport.from?` · ${det.transport.mode}`:""}</div>}
            {det.transport.notes&&!editingTransport&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:6,lineHeight:1.5,whiteSpace:'pre-line'}}>{det.transport.notes.length>120?det.transport.notes.slice(0,120)+'...':det.transport.notes}</div>}
            {det.transport.link&&<a href={det.transport.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.transport.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
          </div>}
          {bookDropdown==='transport'&&<div style={{position:'relative',zIndex:100,marginBottom:10}}><div style={{background:'#1A1208',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:8,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.30)',letterSpacing:2,padding:'4px 14px'}}>SEARCH FLIGHTS</div>
            {[{n:'Google Flights',u:`https://www.google.com/travel/flights?q=${encodeURIComponent((det.transport.from||'')+' to '+(det.transport.to||''))}`},{n:'Skyscanner',u:'https://www.skyscanner.com'},{n:'Kayak',u:'https://www.kayak.com/flights'},{n:'Rome2rio',u:`https://www.rome2rio.com/map/${encodeURIComponent(det.transport.from||'')}/${encodeURIComponent(det.transport.to||'')}`}].map(l=><a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer" onClick={()=>setBookDropdown(null)} style={{display:'block',padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.75)',borderRadius:8,cursor:'pointer',textDecoration:'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{l.n}</a>)}
          </div></div>}
          {hasT&&editingTransport&&<div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
              <SDF label="FROM" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="Departure city" accent="#00E5FF"/>
              <SDF label="TO" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="Arrival city" accent="#00E5FF"/>
              <SDF label="DEP TIME" value={det.transport.depTime} onChange={v=>uT("depTime",v)} placeholder="08:30 AM" accent="#00E5FF"/>
              <SDF label="ARR TIME" value={det.transport.arrTime} onChange={v=>uT("arrTime",v)} placeholder="11:45 AM" accent="#00E5FF"/>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.transport.link||""} onChange={v=>uT("link",v)} placeholder="https://..." accent="#00E5FF"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="Flight number, booking ref..." accent="#00E5FF" multiline/></div>
            <button onClick={()=>setEditingTransport(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(0,229,255,0.12)',color:'#00E5FF',fontSize:12,fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
          </div>}
          {!hasT&&!editingTransport&&<div>
            {!(suggestion?.transport&&!isDism('transport'))&&!suggestionsLoading&&<div style={{textAlign:'center',padding:'24px 0 20px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.40)',marginBottom:12}}>No transport planned yet.</div></div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
              <SDF label="FROM" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="Departure city" accent="#00E5FF"/>
              <SDF label="TO" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="Arrival city" accent="#00E5FF"/>
            </div>
            {(transportEstLoading||transportEst)&&<div style={{padding:'8px 12px',marginTop:8,borderRadius:8,background:'rgba(255,159,67,0.04)',border:'1px solid rgba(255,159,67,0.12)',display:'flex',alignItems:'center',gap:8}}>
              {transportEstLoading?<span style={{fontSize:10,fontFamily:"'Space Mono',monospace",color:'rgba(255,159,67,0.50)',letterSpacing:1}}>✦ Estimating...</span>
              :transportEst&&<span onClick={()=>{if(transportEst.estimate)uT("cost",transportEst.estimate.replace(/[^0-9]/g,'').slice(0,6));}} style={{fontSize:10,fontFamily:"'Space Mono',monospace",color:'rgba(255,159,67,0.65)',letterSpacing:0.5,cursor:'pointer'}}>✦ Est. {transportEst.estimate}{transportEst.note?` — ${transportEst.note}`:""} <span style={{color:'#FF9F43',textDecoration:'underline'}}>use</span></span>}
            </div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
              <SDF label="DEP TIME" value={det.transport.depTime} onChange={v=>uT("depTime",v)} placeholder="08:30 AM" accent="#00E5FF"/>
              <SDF label="ARR TIME" value={det.transport.arrTime} onChange={v=>uT("arrTime",v)} placeholder="11:45 AM" accent="#00E5FF"/>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.transport.link||""} onChange={v=>uT("link",v)} placeholder="https://..." accent="#00E5FF"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="Flight number, booking ref..." accent="#00E5FF" multiline/></div>
          </div>}
        </div>}
        {/* STAY */}
        {tab==="stay"&&<div style={{border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.40)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.stay&&!isDism('stay')&&!hasS&&<div style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:6}}>{suggestion.stay.recommendation}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:8}}>{suggestion.stay.type}</div>
            {suggestion.stay.suggestions?.length>0&&<div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.40)',letterSpacing:2,marginBottom:6}}>SELECT PROPERTY</div>
              {suggestion.stay.suggestions.map((prop,pi)=><div key={pi} onClick={()=>setSelectedStayProp(prop)} style={{border:selectedStayProp===prop?'1px solid rgba(255,159,67,0.60)':'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:'10px 14px',marginBottom:6,cursor:'pointer',fontSize:13,color:selectedStayProp===prop?'#FF9F43':'rgba(255,255,255,0.75)',background:selectedStayProp===prop?'rgba(255,159,67,0.08)':'transparent',transition:'all 0.20s'}}>{prop}</div>)}
              <SDF label="OR ENTER YOUR OWN" value={selectedStayProp&&!suggestion.stay.suggestions.includes(selectedStayProp)?selectedStayProp:""} onChange={v=>setSelectedStayProp(v)} placeholder="Your property choice..." accent="#FF9F43"/>
            </div>}
            <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. {suggestion.stay.estimatedNightly} · Total ~{suggestion.stay.estimatedTotal}</div>
            {suggestion.stay.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12}}>{suggestion.stay.notes}</div>}
            <div style={disclaimerStyle}>⚡ Estimates based on current market rates — actual prices vary when booked</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{const s=suggestion.stay;const name=selectedStayProp||s.suggestions?.[0]||"";const alts=(s.suggestions||[]).filter(p=>p!==name);if(name)uS("name",name);uS("cost",(s.estimatedTotal||"").split('-')[0].replace(/[^0-9]/g,''));if(segment.arrival&&!det.stay.checkin)uS("checkin",segment.arrival);if(segment.departure&&!det.stay.checkout)uS("checkout",segment.departure);uS("notes",`${alts.length>0?`Alternatives: ${alts.join(', ')}\n\n`:""}${s.recommendation||""}${s.notes?`\n${s.notes}`:""}`);dismiss('stay');}} style={acceptBtnStyle}>USE THIS STAY</button>
              <button onClick={()=>dismiss('stay')} style={dismissBtnStyle}>PLAN MY OWN</button>
            </div>
          </div>}
          {hasS&&!showStayResuggest&&<div style={{border:'1.5px solid rgba(255,159,67,0.45)',borderRadius:14,background:'rgba(255,140,50,0.10)',padding:'18px 20px',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:10,fontFamily:"'Space Mono',monospace",color:'rgba(255,159,67,0.65)',letterSpacing:2,flex:1}}>🏨 ACCOMMODATION</span>
              <button onClick={()=>setBookDropdown(bookDropdown==='stay'?null:'stay')} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Space Mono',monospace",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button onClick={()=>setEditingStay(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Space Mono',monospace",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28}}>{editingStay?'DONE':'EDIT'}</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.stay.name}</div>
            {(det.stay.checkin||det.stay.checkout)&&<div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Space Mono',monospace",marginBottom:4}}>{det.stay.checkin?`Check-in ${fD(det.stay.checkin)}`:""}{det.stay.checkin&&det.stay.checkout?" · ":""}{det.stay.checkout?`Check-out ${fD(det.stay.checkout)}`:""}{segment.nights?` · ${segment.nights} nights`:""}</div>}
            {det.stay.cost&&<div style={{fontSize:13,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. ${det.stay.cost}</div>}
            {det.stay.notes&&!editingStay&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:6,lineHeight:1.5,whiteSpace:'pre-line'}}>{det.stay.notes.length>140?det.stay.notes.slice(0,140)+'...':det.stay.notes}</div>}
            {det.stay.link&&<a href={det.stay.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.stay.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
            {suggestion?.stay?.suggestions?.length>1&&<div onClick={()=>setShowStayResuggest(true)} style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,159,67,0.65)',cursor:'pointer',marginTop:8,textDecoration:'underline'}}>↩ View other suggestions</div>}
          </div>}
          {hasS&&showStayResuggest&&suggestion?.stay&&<div style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ CHANGE PROPERTY</div>
            <div style={{marginBottom:10}}>
              {suggestion.stay.suggestions.map((prop,pi)=><div key={pi} onClick={()=>{uS("name",prop);setShowStayResuggest(false);}} style={{border:det.stay.name===prop?'1px solid rgba(255,159,67,0.60)':'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:'10px 14px',marginBottom:6,cursor:'pointer',fontSize:13,color:det.stay.name===prop?'#FF9F43':'rgba(255,255,255,0.75)',background:det.stay.name===prop?'rgba(255,159,67,0.08)':'transparent',transition:'all 0.20s'}}>{prop}</div>)}
            </div>
            <button onClick={()=>setShowStayResuggest(false)} style={{...dismissBtnStyle,width:'100%'}}>KEEP CURRENT</button>
          </div>}
          {bookDropdown==='stay'&&<div style={{position:'relative',zIndex:100,marginBottom:10}}><div style={{background:'#1A1208',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:8,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.30)',letterSpacing:2,padding:'4px 14px'}}>SEARCH STAYS</div>
            {[{n:'Booking.com',u:`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(segment.name)}`},{n:'Airbnb',u:`https://www.airbnb.com/s/${encodeURIComponent(segment.name)}/homes`},{n:'Hotels.com',u:`https://www.hotels.com/search.do?q-destination=${encodeURIComponent(segment.name)}`},{n:'Hostelworld',u:`https://www.hostelworld.com/search?search_keywords=${encodeURIComponent(segment.name)}`}].map(l=><a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer" onClick={()=>setBookDropdown(null)} style={{display:'block',padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.75)',borderRadius:8,cursor:'pointer',textDecoration:'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{l.n}</a>)}
          </div></div>}
          {hasS&&editingStay&&<div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:'flex',gap:10,marginTop:10,overflow:'hidden'}}>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/></div>
            <button onClick={()=>setEditingStay(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(105,240,174,0.12)',color:'#69F0AE',fontSize:12,fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
          </div>}
          {!hasS&&!(suggestion?.stay&&!isDism('stay'))&&!suggestionsLoading&&<div>
            <div style={{textAlign:'center',padding:'24px 0 20px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.40)',marginBottom:12}}>No accommodation planned yet.</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:'flex',gap:10,marginTop:10,overflow:'hidden'}}>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/></div>
              <div style={{flex:1,minWidth:0}}><SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/></div>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/></div>
          </div>}
        </div>}
        {/* ACTIVITIES */}
        {tab==="activities"&&<div style={{border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.40)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.activities?.map((activity,idx)=>(
            !isDism(`activity_${idx}`)&&<div key={idx} style={{...suggestionCardStyle,marginBottom:10,animationDelay:`${idx*100}ms`}}>
              <div style={suggestionHeaderStyle}>✦ SUGGESTED ACTIVITY</div>
              <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:6}}>{activity.name}</div>
              {activity.provider&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',marginBottom:4}}>{activity.provider}</div>}
              <div style={{fontSize:14,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. {activity.estimatedCost}</div>
              {activity.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginBottom:12}}>{activity.notes}</div>}
              <div style={disclaimerStyle}>⚡ Estimates only — prices vary when booked</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{acceptActivity(activity);dismiss(`activity_${idx}`);}} style={acceptBtnStyle}>+ ADD TO PLAN</button>
                <button onClick={()=>dismiss(`activity_${idx}`)} style={dismissBtnStyle}>SKIP</button>
              </div>
            </div>
          ))}
          {det.activities.length>0&&<div style={{marginBottom:16}}>
            {det.activities.map(a=>(
              <div key={a.id} style={{border:'1.5px solid rgba(255,210,0,0.55)',borderRadius:14,background:'rgba(255,200,0,0.06)',padding:'18px 20px',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:10,fontFamily:"'Space Mono',monospace",color:'rgba(255,217,61,0.65)',letterSpacing:2,flex:1}}>⚡ ACTIVITY</span>
                  <a href={`https://www.viator.com/search/${encodeURIComponent(segment.name+' '+a.name)}`} target="_blank" rel="noopener noreferrer" style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Space Mono',monospace",padding:'3px 8px',textDecoration:'none',minHeight:24,display:'flex',alignItems:'center'}}>🔗</a>
                  <button onClick={()=>setDet(d=>({...d,activities:d.activities.filter(x=>x.id!==a.id)}))} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Space Mono',monospace",padding:'3px 8px',cursor:'pointer',minHeight:24}}>✕</button>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{a.name}</div>
                {a.provider&&<div style={{fontSize:12,color:'rgba(255,255,255,0.50)',fontFamily:"'Space Mono',monospace",marginBottom:4}}>{a.provider}</div>}
                {a.brief&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.75)',marginBottom:8,marginTop:4,lineHeight:1.6}}>{a.brief}</div>}
                <div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Space Mono',monospace",display:'flex',gap:8,flexWrap:'wrap',marginBottom:a.tip||a.link?6:0}}>
                  {a.date?<span>{fD(a.date)}</span>:segment.arrival&&<span style={{fontStyle:'italic',color:'rgba(255,159,67,0.55)',fontSize:11}}>within {fD(segment.arrival)}–{fD(segment.departure)}</span>}{a.cost&&<span style={{color:'#FFD93D'}}>Est. ${a.cost}</span>}
                </div>
                {a.tip&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'rgba(255,255,255,0.45)',lineHeight:1.5,marginTop:4}}>💡 {a.tip}</div>}
                {a.link&&<a href={a.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:6}}>{a.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'4px 2px'}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.30)',fontFamily:'monospace',letterSpacing:1}}>TOTAL</span>
              <span style={{fontSize:14,fontWeight:600,color:'rgba(255,217,61,0.85)',fontFamily:'monospace'}}>${det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}</span>
            </div>
          </div>}
          {det.activities.length===0&&!(suggestion?.activities?.some((_,i)=>!isDism(`activity_${i}`)))&&!suggestionsLoading&&<div style={{textAlign:'center',padding:'24px 0 16px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,217,61,0.40)'}}>No activities planned yet — dives, tours, day trips</div></div>}
          <div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginTop:4}}>
            <div style={{fontSize:10,color:'rgba(255,217,61,0.50)',letterSpacing:2,marginBottom:12,fontFamily:"'Space Mono',monospace",fontWeight:700}}>+ ADD ACTIVITY</div>
            <SDF label="ACTIVITY NAME" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#FFD93D"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8,overflow:'hidden'}}>
              <SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#FFD93D"/>
              <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#FFD93D"/>
            </div>
            <div style={{marginTop:8}}><SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://..." accent="#FFD93D"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Tips, what to bring..." accent="#FFD93D" multiline/></div>
            <button onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:[...d.activities,{...nAct,id:Date.now()}]}));setNAct({name:"",date:"",cost:"",transit:"",link:""});}} style={{marginTop:12,padding:'12px 20px',borderRadius:10,border:'none',background:nAct.name?'linear-gradient(135deg,rgba(255,159,67,0.25),rgba(255,217,61,0.15))':'rgba(255,255,255,0.04)',color:nAct.name?'#FFD93D':'rgba(255,255,255,0.20)',fontSize:12,cursor:nAct.name?'pointer':'default',fontFamily:"'Space Mono',monospace",letterSpacing:1.5,fontWeight:700,width:'100%',minHeight:44}}>ADD TO PLAN</button>
          </div>
          <div style={{marginTop:14}}><SDF label="ACTIVITY NOTES" value={det.actNotes||""} onChange={v=>setDet(d=>({...d,actNotes:v}))} placeholder="Tips, what to bring, dress code..." accent="#FFD93D" multiline/></div>
        </div>}
        {/* FOOD */}
        {tab==="food"&&<div style={{border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.40)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.food&&!isDism('food')&&<div style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ FOOD & DINING</div>
            <div style={{fontSize:14,fontWeight:600,color:'#FFD93D',marginBottom:8}}>Est. {suggestion.food.dailyBudget}/day · ~{suggestion.food.totalEstimate} total</div>
            {suggestion.food.recommendations?.map((rec,i)=>(
              <div key={i} style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:6,paddingLeft:8,borderLeft:'2px solid rgba(255,159,67,0.30)'}}>{rec}</div>
            ))}
            {suggestion.food.notes&&<div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontStyle:'italic',marginTop:8}}>{suggestion.food.notes}</div>}
            <div style={{...disclaimerStyle,marginTop:12}}>⚡ Suggestions based on current market knowledge — always verify locally</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{const bud=(suggestion.food.dailyBudget||"").match(/\d+/)?.[0]||"";if(bud)uF("dailyBudget",bud);uF("notes",suggestion.food.recommendations?.join('\n')||"");dismiss('food');}} style={acceptBtnStyle}>USE ESTIMATES</button>
              <button onClick={()=>dismiss('food')} style={dismissBtnStyle}>PLAN MY OWN</button>
            </div>
          </div>}
          <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:10}}>
            <div style={{flex:1}}><SDF label="DAILY FOOD BUDGET ($)" type="number" value={det.food.dailyBudget} onChange={v=>uF("dailyBudget",v)} placeholder="e.g. 45" accent="#FF9F43"/></div>
            <button onClick={aiFood} disabled={aiLoad} style={{padding:'8px 14px',borderRadius:6,border:'1px solid rgba(255,159,67,0.3)',background:'rgba(255,159,67,0.05)',color:'rgba(255,159,67,0.8)',fontSize:12,cursor:aiLoad?'wait':'pointer',fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:600,whiteSpace:'nowrap',height:34,flexShrink:0}}>{aiLoad?"✦...":"✦ CO-ARCH EST"}</button>
          </div>
          {det.food.dailyBudget&&<div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'rgba(255,159,67,0.05)',border:'1px solid rgba(255,159,67,0.16)',borderRadius:8,marginBottom:10}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.45)',fontFamily:'monospace'}}>{segment.nights} nights × ${det.food.dailyBudget}/day</span>
            <span style={{fontSize:14,fontWeight:600,color:'rgba(255,217,61,0.85)',fontFamily:'monospace'}}>${(parseFloat(det.food.dailyBudget)*segment.nights).toLocaleString()}</span>
          </div>}
          <SDF label="FOOD NOTES" value={det.food.notes} onChange={v=>uF("notes",v)} placeholder="Must-try dishes, market days, dietary notes..." accent="#FF9F43" multiline/>
        </div>}
        {/* BUDGET */}
        {tab==="budget"&&(()=>{const tCost=parseFloat(det.transport?.cost)||0;const sCost=parseFloat(det.stay?.cost)||0;const aCost=det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0);const fCost=(parseFloat(det.food?.dailyBudget)||0)*segment.nights;const mCost=det.misc.reduce((s,m)=>s+(parseFloat(m.cost)||0),0);const total=tCost+sCost+aCost+fCost+mCost;const budget=segment.budget||0;const pct=budget>0?Math.round((total/budget)*100):0;const barColor=pct>=100?'#FF6B6B':pct>=80?'#FFD93D':'#00E5FF';return(
          <div style={{border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16}}>
            <div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,159,67,0.65)',letterSpacing:2,marginBottom:12}}>PHASE BUDGET</div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{segment.name}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontFamily:"'Space Mono',monospace",marginBottom:16}}>{segment.nights} Nights · Budget: {fmt(budget)}</div>
            {[{icon:'✈️',label:'TRANSPORT',cost:tCost,has:hasT},{icon:'🏨',label:'STAY',cost:sCost,has:hasS},{icon:'⚡',label:'ACTIVITIES',cost:aCost,has:det.activities.length>0},{icon:'🍜',label:'FOOD',cost:fCost,has:!!det.food?.dailyBudget},{icon:'💸',label:'MISC',cost:mCost,has:det.misc.length>0}].map(r=>(
              <div key={r.label} style={{display:'flex',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{fontSize:14,marginRight:10}}>{r.icon}</span>
                <span style={{flex:1,fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.55)',letterSpacing:1}}>{r.label}</span>
                <span style={{fontSize:14,fontWeight:600,color:'#FFFFFF',fontFamily:"'Space Mono',monospace",marginRight:12}}>{r.cost>0?fmt(r.cost):'—'}</span>
                <span style={{fontSize:10,fontFamily:"'Space Mono',monospace",color:r.has?'#69F0AE':'rgba(255,255,255,0.25)',letterSpacing:1}}>{r.has?'✓ Added':'—'}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 6px',borderTop:'1px solid rgba(255,255,255,0.12)',marginTop:4}}>
              <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.45)',letterSpacing:1}}>TOTAL PLANNED</span>
              <span style={{fontSize:15,fontWeight:700,color:'#FFFFFF',fontFamily:"'Space Mono',monospace"}}>{fmt(total)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
              <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.45)',letterSpacing:1}}>REMAINING</span>
              <span style={{fontSize:15,fontWeight:700,color:budget-total>=0?'#69F0AE':'#FF6B6B',fontFamily:"'Space Mono',monospace"}}>{fmt(budget-total)}</span>
            </div>
            <div style={{marginTop:12,height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:Math.min(pct,100)+'%',background:barColor,borderRadius:3,transition:'width 0.60s cubic-bezier(0.25,0.46,0.45,0.94)'}}/>
            </div>
            <div style={{textAlign:'center',marginTop:6,fontSize:11,fontFamily:"'Space Mono',monospace",color:barColor}}>{pct}% allocated</div>
            {pct>=100&&<div style={{marginTop:10,padding:'10px 14px',border:'1.5px solid rgba(255,107,107,0.40)',borderRadius:8,background:'rgba(255,107,107,0.06)',fontSize:12,color:'#FF6B6B',fontFamily:"'Space Mono',monospace"}}>⚠️ Over budget by {fmt(total-budget)}</div>}
          </div>);})()}
        {/* DOCS & VISA */}
        {tab==="docs"&&<div style={{border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16}}>
          <div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,159,67,0.65)',letterSpacing:2,marginBottom:12}}>DOCS & VISA</div>
          <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{segment.name}, {segment.country}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontFamily:"'Space Mono',monospace",marginBottom:16}}>{segment.nights} Nights</div>
          {!docsData&&!docsLoading&&<div style={{textAlign:'center',padding:'24px 0'}}><button onClick={loadDocs} style={{padding:'12px 24px',borderRadius:10,border:'1px solid rgba(255,159,67,0.40)',background:'rgba(255,159,67,0.08)',color:'#FF9F43',fontSize:12,fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:44}}>✦ GENERATE TRAVEL DOCS BRIEF</button></div>}
          {docsLoading&&<div style={{textAlign:'center',padding:'24px 0'}}><div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite',margin:'0 auto 8px'}}/><span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,255,255,0.40)',letterSpacing:1}}>GENERATING DOCS BRIEF...</span></div>}
          {docsData&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
            {docsData.visa&&<div><div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🛂 VISA REQUIREMENTS</div><div style={{fontFamily:"'Fraunces',serif",fontSize:13,color:'rgba(255,255,255,0.80)',lineHeight:1.6}}>{docsData.visa.details}{docsData.visa.cost?` · Cost: ${docsData.visa.cost}`:''}</div></div>}
            {docsData.health&&<div><div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>💉 HEALTH</div>{docsData.health.required?.length>0&&<div style={{padding:'6px 10px',background:'rgba(255,200,0,0.06)',border:'1px solid rgba(255,200,0,0.20)',borderRadius:6,marginBottom:4,fontSize:13,color:'#FFD93D'}}>⚠️ Required: {docsData.health.required.join(', ')}</div>}{docsData.health.recommended?.length>0&&<div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Recommended: {docsData.health.recommended.join(', ')}</div>}{docsData.health.notes&&<div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4}}>{docsData.health.notes}</div>}</div>}
            {docsData.money&&<div><div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>💵 MONEY & CURRENCY</div>{docsData.money.warning&&<div style={{padding:'6px 10px',background:'rgba(255,200,0,0.06)',border:'1px solid rgba(255,200,0,0.20)',borderRadius:6,marginBottom:4,fontSize:13,color:'#FFD93D'}}>⚠️ {docsData.money.warning}</div>}<div style={{fontSize:13,color:'rgba(255,255,255,0.80)',lineHeight:1.5}}>{docsData.money.currency}{docsData.money.tips?` · ${docsData.money.tips}`:''}</div></div>}
            {docsData.connectivity&&<div><div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>📶 CONNECTIVITY</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{docsData.connectivity.tips}</div></div>}
            {docsData.safety&&<div><div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🛡️ SAFETY</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Level: {docsData.safety.level}{docsData.safety.notes?` · ${docsData.safety.notes}`:''}</div></div>}
            {docsData.customs&&<div><div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🤝 LOCAL CUSTOMS</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{docsData.customs.tips}</div></div>}
            {docsData.emergency&&<div><div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🆘 EMERGENCY CONTACTS</div><div style={{display:'flex',flexDirection:'column',gap:4}}>{docsData.emergency.police&&<div style={{fontSize:12,fontFamily:"'Space Mono',monospace",color:'#00E5FF'}}>Police: {docsData.emergency.police}</div>}{docsData.emergency.ambulance&&<div style={{fontSize:12,fontFamily:"'Space Mono',monospace",color:'#00E5FF'}}>Ambulance: {docsData.emergency.ambulance}</div>}{docsData.emergency.embassy&&<div style={{fontSize:12,fontFamily:"'Space Mono',monospace",color:'#00E5FF'}}>Embassy: {docsData.emergency.embassy}</div>}</div></div>}
          </div>}
          <div style={{marginTop:16}}><SDF label="PERSONAL NOTES" value={docsNote} onChange={v=>{setDocsNote(v);setDet(d=>({...d,intel:{...d.intel,notes:v}}));}} placeholder="Visa application status, insurance details, personal contacts..." accent="#FF9F43" multiline/></div>
        </div>}
      </div>
    </div>
  );
}

function PhaseDetailPage({phase,intelData,onBack,segmentSuggestions,suggestionsLoading,homeCity="",segPhases=[],warningFlags=[],onDismissWarning}) {
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
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:200,background:'#03070F',overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'12px 16px',gap:12,background:'rgba(0,8,16,0.95)',borderBottom:'1px solid rgba(0,229,255,0.12)',position:'sticky',top:0,zIndex:10}}>
        {isMobile?<button onClick={onBack} style={{background:'none',border:'none',color:'#00E5FF',fontSize:24,cursor:'pointer',padding:'0 8px 0 0',fontWeight:300,lineHeight:1,minWidth:32,minHeight:44,display:'flex',alignItems:'center',gap:6}}>‹ <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",letterSpacing:2,opacity:0.60}}>EXPEDITION</span></button>
        :<div style={{display:'flex',alignItems:'center',gap:8,fontSize:11,fontFamily:"'Space Mono',monospace"}}>
          <span onClick={onBack} style={{color:'#FF9F43',cursor:'pointer'}}>←</span>
          <span onClick={onBack} style={{color:'rgba(255,255,255,0.45)',cursor:'pointer',letterSpacing:1}}>EXPEDITION</span>
          <span style={{color:'rgba(255,255,255,0.25)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.85)',letterSpacing:1}}>{phase.name.toUpperCase()}</span>
        </div>}
        {isMobile&&<span style={{fontSize:20}}>{phase.flag}</span>}
        {isMobile&&<span style={{flex:1,fontSize:18,fontWeight:500,color:'#FFFFFF',fontFamily:"'Fraunces',serif"}}>{phase.name}</span>}
        {!isMobile&&<div style={{flex:1}}/>}
        <span style={{fontSize:14,fontWeight:700,color:'#FFD93D',fontFamily:"'Space Mono',monospace"}}>{fmt(phase.totalBudget)}</span>
      </div>
      {/* First-visit breadcrumb hint */}
      {hintVisible&&<div style={{fontSize:11,letterSpacing:'0.12em',color:'rgba(0,229,255,0.35)',padding:'6px 16px 0',textAlign:'center',fontFamily:"'Space Mono',monospace"}}>TAP ‹ TO RETURN TO EXPEDITION</div>}
      {/* Stats bar */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'10px 16px',flexShrink:0}}>
        <span style={{flex:1,fontSize:13,color:'rgba(255,255,255,0.45)',fontFamily:"'Space Mono',monospace"}}>{fD(phase.arrival)} – {fD(phase.departure)}</span>
        <span style={{fontSize:13,color:'rgba(255,255,255,0.45)',fontFamily:"'Space Mono',monospace"}}>🌙{isMobile?`${phase.totalNights}n`:`${phase.totalNights} Nights`}</span>
        {phase.totalDives>0&&<span style={{fontSize:13,color:'#00E5FF',marginLeft:8,fontFamily:"'Space Mono',monospace"}}>🤿{phase.totalDives}</span>}
      </div>
      {/* Warning flags */}
      {warningFlags.filter(w=>w.phaseIndex===phase.id-1).map((w,wi)=>(
        <div key={wi} style={{border:'1.5px solid rgba(255,200,0,0.40)',borderRadius:12,background:'rgba(255,200,0,0.06)',padding:'14px 16px',margin:'8px 16px',animation:'fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both'}}>
          <div style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:'rgba(255,200,0,0.70)',letterSpacing:2,marginBottom:6}}>⚠️ {w.type==='date_conflict'?'DATE CONFLICT':'SEASONAL NOTICE'}</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.85)',lineHeight:1.6,marginBottom:4}}>{w.message}</div>
          {w.suggestion&&<div style={{fontSize:12,color:'rgba(255,200,0,0.60)',fontFamily:"'Space Mono',monospace",marginBottom:10}}>{w.suggestion}</div>}
          <div style={{display:'flex',gap:8}}>
            {w.dismissible&&<button onClick={()=>onDismissWarning?.(warningFlags.indexOf(w))} style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,200,0,0.30)',background:'transparent',color:'rgba(255,200,0,0.60)',fontSize:11,fontFamily:"'Space Mono',monospace",cursor:'pointer',fontWeight:600,letterSpacing:1}}>DISMISS</button>}
          </div>
        </div>
      ))}
      {/* Segment list */}
      <div style={{padding:'6px 0 80px'}}>
        <div style={{padding:'8px 16px 4px',fontSize:12,color:'rgba(255,255,255,0.35)',letterSpacing:3,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{phase.segments.length} SEGMENT{phase.segments.length!==1?'S':''} · TAP TO PLAN</div>
        {phase.segments.map((seg,i)=>(
          <SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} onSegmentTap={s=>setActiveSegment(s)}/>
        ))}
      </div>
    </div>
    {activeSegment&&(()=>{const allSegs=segPhases.flatMap(p=>p.segments);const segIdx=allSegs.findIndex(s=>s.id===activeSegment.id);const prev=segIdx>0?allSegs[segIdx-1]:null;return <SegmentWorkspace segment={activeSegment} phaseId={phase.id} phaseName={phase.name} phaseFlag={phase.flag} intelSnippet={intelData?.[activeSegment.name]} onBack={()=>setActiveSegment(null)} onBackToExpedition={()=>{setActiveSegment(null);onBack();}} suggestion={findSuggestionForSegment(segmentSuggestions, activeSegment.name)} suggestionsLoading={suggestionsLoading} homeCity={homeCity} prevCity={prev?.name||""}/>;})()}
    </>
  );
}

function PhaseCard({phase,intelData,idx,autoOpen=false,onTap=null,allSuggestions,suggestionsLoading}) {
  const isMobile=useMobile();
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
        onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,0.028)';e.currentTarget.style.border='1.5px solid rgba(0,229,255,0.40)';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.5),inset 0 1px 0 rgba(0,229,255,0.35),inset 1px 0 0 rgba(0,229,255,0.15),inset -1px 0 0 rgba(0,229,255,0.15),inset 0 -1px 0 rgba(0,229,255,0.08)';}}
        onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.012)';e.currentTarget.style.border='1.5px solid rgba(0,229,255,0.22)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(0,229,255,0.30),inset 1px 0 0 rgba(0,229,255,0.12),inset -1px 0 0 rgba(0,229,255,0.12),inset 0 -1px 0 rgba(0,229,255,0.06)';}}
        style={{display:'flex',flexDirection:'column',padding:'18px 16px',background:'rgba(255,255,255,0.012)',border:'1.5px solid rgba(0,229,255,0.22)',borderRadius:12,marginBottom:10,boxShadow:'0 2px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(0,229,255,0.22),inset 1px 0 0 rgba(0,229,255,0.08),inset -1px 0 0 rgba(0,229,255,0.08),inset 0 -1px 0 rgba(0,229,255,0.04)',animation:`fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) ${idx*0.07}s both`}}>
        {/* Row 1: badge + flag + name + budget */}
        <div style={{display:'flex',alignItems:'center',gap:8,width:'100%',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            <div style={{width:24,height:24,borderRadius:'50%',background:`${phase.color}16`,border:`1.5px solid ${phase.color}45`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:phase.color,fontFamily:"'Space Mono',monospace",flexShrink:0}}>{phase.id}</div>
            <span style={{fontSize:20,lineHeight:1}}>{phase.flag}</span>
          </div>
          <div style={{flex:1,fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:500,color:'#E8DCC8',lineHeight:1.1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{phase.name}</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:700,color:'#FFD93D',whiteSpace:'nowrap',flexShrink:0}}>{fmt(phase.totalBudget)}</div>
        </div>
        {/* Row 2: date + nights/dives */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:5,paddingLeft:38,overflow:'hidden',width:'100%'}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:500,color:'rgba(255,255,255,0.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>{fD(phase.arrival)} – {fD(phase.departure)} · {phase.totalNights}N{phase.totalDives>0?` · 🤿${phase.totalDives}`:''}</span>
        </div>
      </div>
      {!onTap&&<BottomSheet open={sheetOpen} onClose={()=>setSheetOpen(false)} zIndex={500} hideClose={anyAskOpen}>
        {/* Sheet header */}
        <div style={{padding:'16px 16px 14px',borderBottom:'1px solid rgba(255,255,255,0.12)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:`${phase.color}16`,border:`1.5px solid ${phase.color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:phase.color,fontFamily:"'Space Mono',monospace",flexShrink:0}}>{phase.id}</div>
            <span style={{fontSize:28,lineHeight:1}}>{phase.flag}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:300,color:'#E8DCC8',lineHeight:1.1}}>{phase.name}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:'rgba(255,255,255,0.42)',marginTop:3}}>{fD(phase.arrival)} – {fD(phase.departure)}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:14,alignItems:'center',paddingLeft:42}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:phase.color}}>🌙{phase.totalNights}n</span>
            {phase.totalDives>0&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:'#00E5FF'}}>🤿{phase.totalDives}</span>}
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:700,color:'#FFD93D',marginLeft:'auto'}}>{fmt(phase.totalBudget)}</span>
          </div>
          {phase.note&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:300,fontStyle:'italic',color:'rgba(255,255,255,0.55)',lineHeight:1.7,paddingLeft:42,marginTop:8,borderLeft:'2px solid rgba(255,255,255,0.08)',marginLeft:40}}>{phase.note}</div>}
          {pct>0&&<div style={{marginTop:10,paddingLeft:42,display:'flex',alignItems:'center',gap:8}}>
            <div style={{height:2,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden',width:80}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${phase.color}55,${phase.color})`,borderRadius:2,transition:'width 0.60s cubic-bezier(0.25,0.46,0.45,0.94)'}}/></div>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:"'Space Mono',monospace"}}>{pct}% PLANNED</span>
          </div>}
        </div>
        {/* Segments */}
        <div style={{paddingTop:4,paddingBottom:20}}>
          <div style={{padding:'10px 16px 6px',fontSize:11,color:'rgba(255,255,255,0.3)',letterSpacing:3,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{phase.segments.length} SEGMENT{phase.segments.length!==1?'S':''} · TAP TO PLAN</div>
          {phase.segments.map((seg,i)=>(
            <SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} onAskOpenChange={setAnyAskOpen} suggestion={findSuggestionForSegment(allSuggestions, seg.name)} suggestionsLoading={suggestionsLoading}/>
          ))}
        </div>
      </BottomSheet>}
    </>
  );

  // ── Desktop: phase card (always slides to detail page when onTap provided) ──
  return(
    <div style={{borderRadius:13,border:"1px solid rgba(0,229,255,0.08)",borderTop:"1px solid rgba(0,229,255,0.20)",background:"rgba(0,8,16,0.55)",backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',overflow:"hidden",transition:"all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",animation:`fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) ${idx*.06}s both`}}>
      <div onClick={()=>onTap?onTap(phase):setOpen(o=>!o)} style={{padding:"14px 16px",cursor:"pointer",minHeight:62,borderLeft:`3px solid ${phase.color}50`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:`${phase.color}14`,border:`1.5px solid ${phase.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:phase.color,fontFamily:"'Space Mono',monospace",flexShrink:0}}>{phase.id}</div>
          <span style={{fontSize:14,flexShrink:0}}>{phase.flag}</span>
          <span style={{flex:1,fontSize:15,fontWeight:600,color:"#E8DCC8",fontFamily:"'Space Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",transition:"color 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>{phase.name}</span>
          {isNow&&<span style={{fontSize:9,color:"#69F0AE",background:"rgba(105,240,174,0.1)",border:"1px solid rgba(105,240,174,0.28)",borderRadius:20,padding:"2px 8px",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>ACTIVE</span>}
          <span style={{fontSize:15,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",flexShrink:0}}>{fmt(phase.totalBudget)}</span>
          <span style={{fontSize:14,color:"rgba(255,255,255,0.30)",flexShrink:0}}>›</span>
        </div>
        {phase.note&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.62)",lineHeight:1.65,paddingLeft:28,marginBottom:6,marginTop:1}}>{phase.note}</div>}
        <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:28,flexWrap:"nowrap"}}>
          <span style={{fontSize:15,color:"rgba(255,255,255,0.62)",fontFamily:"'Space Mono',monospace",fontWeight:500,whiteSpace:"nowrap"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>
          <span style={{fontSize:15,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights} Nights</span>
          {phase.totalDives>0&&<span style={{fontSize:15,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}
          {pct>0&&<div style={{width:80,height:2,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${phase.color}55,${phase.color}99)`,borderRadius:2,transition:"width 0.60s cubic-bezier(0.25,0.46,0.45,0.94)"}}/></div>}
          <span style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontFamily:"monospace",whiteSpace:"nowrap",marginLeft:"auto",flexShrink:0}}>{isPast?"done":isNow?"active":`${dUntil}d`}</span>
        </div>
      </div>
      {!onTap&&open&&(
        <div style={{animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)",background:"rgba(0,3,11,0.55)"}}>
          <div style={{padding:"6px 16px 6px 20px",borderTop:`1px solid ${phase.color}15`,borderBottom:"1px solid rgba(0,229,255,0.18)",display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:phase.color,flexShrink:0}}/>
            <span style={{fontSize:11,color:`${phase.color}cc`,letterSpacing:1.5,fontFamily:"'Space Mono',monospace",fontWeight:600,whiteSpace:"nowrap"}}>{phase.segments.length} SEGMENT{phase.segments.length>1?"S":""} · TAP TO EXPAND PLANNING TABS</span>
          </div>
          {phase.segments.map((seg,i)=><SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} suggestion={findSuggestionForSegment(allSuggestions, seg.name)} suggestionsLoading={suggestionsLoading}/>)}
        </div>
      )}
    </div>
  );
}

// ─── MissionConsole ───────────────────────────────────────────────
function MissionConsole({tripData,onNewTrip,onRevise,onPackConsole,onHomecoming,isFullscreen,setFullscreen,initialTab="next",segmentSuggestions,suggestionsLoading}) {
  const isMobile=useMobile();
  const [tab,setTab]=useState(initialTab);
  useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});posthog.capture("$pageview",{$current_url:"/trip-console"});},[]);
  const [confirmNewTrip,setConfirmNewTrip]=useState(false);
  const [showMobileMenu,setShowMobileMenu]=useState(false);
  const [explorerDest,setExplorerDest]=useState(null);
  const [explorerData,setExplorerData]=useState(()=>{try{const s=localStorage.getItem("1bn_intel");return s?JSON.parse(s):{}}catch(e){return{};}});
  const [loadingIntel,setLoadingIntel]=useState(false);
  const [showCoach,setShowCoach]=useState(()=>{try{if(localStorage.getItem("1bn_hide_all_tips")==="1")return false;}catch(e){}return!loadCoach().trip;});
  const [showOnboard,setShowOnboard]=useState(()=>{try{if(localStorage.getItem("1bn_hide_all_tips")==="1")return false;}catch(e){}return!loadOnboard().trip;});
  const [phaseDetailView,setPhaseDetailView]=useState(null);
  const [warningFlags,setWarningFlags]=useState(()=>{try{const s=localStorage.getItem('1bn_warnings_v1');return s?JSON.parse(s):[];}catch(e){return[];}});
  useEffect(()=>{try{localStorage.setItem('1bn_warnings_v1',JSON.stringify(warningFlags));}catch(e){}},[warningFlags]);
  const dismissWarning=(idx)=>setWarningFlags(f=>f.filter((_,i)=>i!==idx));
  useEffect(()=>{try{localStorage.setItem("1bn_intel",JSON.stringify(explorerData));}catch(e){};},[explorerData]);

  function handleNewTripClick(){if(confirmNewTrip){onNewTrip();}else{setConfirmNewTrip(true);setTimeout(()=>setConfirmNewTrip(false),4000);}}

  const TODAY=new Date();
  const daysToDepart=daysBetween(TODAY,new Date(tripData.startDate||"2026-09-16"));
  const uc=urgencyColor(daysToDepart);
  const segPhases=tripData.segmentedPhases||toSegPhases(tripData.phases||[]);
  const totalNights=segPhases.reduce((s,p)=>s+p.totalNights,0);
  const totalBudget=segPhases.reduce((s,p)=>s+p.totalBudget,0);
  const totalDives=segPhases.reduce((s,p)=>s+p.totalDives,0);
  const flatPhases=tripData.phases||[];
  const lastSeg=segPhases[segPhases.length-1];
  const isComplete=lastSeg&&new Date()>new Date((lastSeg.departure||"2099-01-01")+"T12:00:00");
  const [returnData,setReturnData]=useState(()=>loadReturn());
  useEffect(()=>saveReturn(returnData),[returnData]);
  const uR=(f,v)=>setReturnData(d=>({...d,flight:{...d.flight,[f]:v}}));

  async function openIntel(dest,phaseName,type){
    setExplorerDest({destination:dest,phaseName,type});setTab("intel");
    if(explorerData[dest]&&!explorerData[dest].error)return;
    setLoadingIntel(true);
    try{
      const raw=await askAI(`Elite travel intel. Destination:"${dest}"(${phaseName},${type}). Return ONLY raw JSON:{tagline,mustDo:[4],hiddenGems:[3],food:[3],culture,climate,warnings:[2],diveHighlight,vibe,streetIntel:[{type,alert}×4]}`,1400);
      const m=raw.match(/{[\s\S]*}/);if(!m)throw 0;
      setExplorerData(p=>({...p,[dest]:JSON.parse(m[0])}));
    }catch(e){setExplorerData(p=>({...p,[dest]:{error:true,errorMsg:"Could not load intel. Check connection and retry."}}));}
    setLoadingIntel(false);
  }

  const heroStats=[{label:"DEPARTS IN",value:daysToDepart,unit:"DAYS",color:"#FFD93D",glow:"rgba(255,217,61,0.35)"},{label:"NIGHTS",value:totalNights,unit:"NIGHTS",color:"#E8DCC8",glow:"rgba(232,220,200,0.2)"},...(totalDives>0?[{label:"DIVES",value:totalDives,unit:"DIVES",color:"#00E5FF",glow:"rgba(0,229,255,0.4)"}]:[]),{label:"BUDGET",value:fmt(totalBudget),unit:"TOTAL",color:"#FFD93D",glow:"rgba(255,217,61,0.35)"}];
  const TABS=[{id:"next",label:"🗺️ EXPEDITION"},{id:"budget",label:"💰 BUDGET"},{id:"book",label:"🔗 BOOK"},{id:"intel",label:"🔭 INTEL"},{id:"blueprint",label:isMobile?"✦":"✦ BLUEPRINT"}];
  const {changedSegs,cancelledSegs}=(()=>{const allSeg=loadSeg();const cs=[],xs=[];segPhases.forEach(p=>p.segments.forEach(s=>{const d=allSeg[`${p.id}-${s.id}`]||{};const st=d.status||'planning';if(st==='changed')cs.push({phase:p,seg:s});if(st==='cancelled')xs.push({phase:p,seg:s});}));return{changedSegs:cs,cancelledSegs:xs};})();

  return(
    <div className="mc-root" style={{animation:"consoleIn 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
      <WorldMapBackground phases={tripData.phases||[]} activeCountry={phaseDetailView?.country}/>
      {phaseDetailView&&<PhaseDetailPage phase={phaseDetailView} intelData={explorerData} onBack={()=>setPhaseDetailView(null)} segmentSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading} homeCity={tripData.departureCity||tripData.city||""} segPhases={segPhases} warningFlags={warningFlags} onDismissWarning={dismissWarning}/>}
      {showOnboard&&<OnboardCard storageKey="trip" ctaLabel="✦ ENTER MY EXPEDITION" onDismiss={()=>setShowOnboard(false)}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:4,color:"rgba(0,229,255,0.75)",marginBottom:10}}>TRIP CONSOLE</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:700,fontStyle:"italic",color:"#FF9F43",lineHeight:1.2,marginBottom:10}}>Your expedition is live.</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.65)",lineHeight:1.7}}>Every leg of your journey — planned, budgeted, and briefed. Here's how to navigate your console.</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:4}}>
          {[
            {icon:"🗺️",label:"EXPEDITION",color:"#00E5FF",desc:"Country-by-country breakdown. Tap any card to expand segments, add stays, transport, and activities."},
            {icon:"💰",label:"BUDGET",color:"#FFD93D",desc:"Real-time cost tracking across every leg. See where your money goes before you leave."},
            {icon:"🔗",label:"BOOK",color:"#69F0AE",desc:"Direct links for flights, stays, and experiences — everything to action in one place."},
            {icon:"🔭",label:"INTEL",color:"#A29BFE",desc:"Co-Architect briefings for every stop. Local tips, must-dos, food, street intel, and culture."},
          ].map(t=>(
            <div key={t.label} style={{display:"flex",gap:8,alignItems:"flex-start",padding:isMobile?"6px 8px":"8px 10px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:`1px solid ${t.color}44`}}>
              <span style={{fontSize:isMobile?13:14,flexShrink:0,marginTop:1}}>{t.icon}</span>
              <div style={{minWidth:0}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:isMobile?10:11,fontWeight:700,letterSpacing:2,color:t.color}}>{t.label}</span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:isMobile?10:11,color:"rgba(255,255,255,0.65)",marginLeft:5}}>{t.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:16,fontFamily:"'Fraunces',serif",fontSize:12,fontStyle:"italic",color:"rgba(255,217,61,0.55)",textAlign:"center",lineHeight:1.6}}>Built by your co-architect. Now it's yours to command.</div>
      </OnboardCard>}
      {!showOnboard&&showCoach&&<CoachOverlay storageKey="trip" accentColor="#00E5FF" onDismiss={()=>setShowCoach(false)} steps={[
        {target:"trip-stats",title:"Your Mission Dashboard",body:"Countdown, nights, dives, and budget — your expedition at a glance."},
        {target:"trip-phases",title:"Country Phases",body:"Each card is a country. Tap to expand and see the segments within."},
        {target:"trip-tabs",title:"Explore Your Data",body:"Switch between Expedition, Budget, Booking links, and Intel views."},
        {target:"trip-intel",title:"Destination Intel",body:"Co-Architect briefings — local tips, must-dos, food, culture, and street intel for every stop."},
        {target:"trip-pack-switch",title:"Pack Console",body:"When you're ready, switch here to manage your one-bag gear list."}
      ]}/>}
      {!isFullscreen&&<ConsoleHeader console="trip" isMobile={isMobile} onTripConsole={()=>{}} onPackConsole={onPackConsole}/>}
      {isMobile&&!isFullscreen&&<div style={{padding:"5px 16px",borderBottom:"1px solid rgba(0,229,255,0.08)",display:"flex",justifyContent:"space-between",background:"rgba(0,8,20,0.98)",flexShrink:0,position:"relative",zIndex:1}}>
        <button onClick={onRevise} style={{padding:"6px 16px",borderRadius:7,border:"1.5px solid rgba(0,229,255,0.55)",background:"rgba(0,229,255,0.12)",color:"#00E5FF",fontSize:14,cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:600,letterSpacing:1,minHeight:32}}>✏️ REVISE</button>
        <button onClick={handleNewTripClick} style={{padding:"6px 14px",borderRadius:7,border:confirmNewTrip?"1px solid rgba(255,107,107,0.5)":"1px solid rgba(255,255,255,0.18)",background:confirmNewTrip?"rgba(255,107,107,0.12)":"transparent",color:confirmNewTrip?"#FF6B6B":"rgba(255,255,255,0.45)",fontSize:13,cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:confirmNewTrip?700:400,letterSpacing:1,minHeight:32}}>{confirmNewTrip?"⚠️ CONFIRM?":"+ NEW TRIP"}</button>
      </div>}
      {!isFullscreen&&<div style={{padding:isMobile?"8px 12px 6px":"10px 16px 8px",background:isMobile?"rgba(0,8,16,0.10)":"linear-gradient(180deg,rgba(21,15,10,0.98),rgba(21,15,10,0.99))",borderBottom:"1px solid rgba(232,220,200,0.06)",position:"relative",overflow:"hidden",zIndex:1}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 50%,rgba(232,220,200,0.02) 0%,transparent 60%)",pointerEvents:"none"}}/>
        {tripData.tripName&&<div style={{marginBottom:isMobile?5:7,position:"relative"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:17,fontWeight:300,fontStyle:"italic",color:"#E8DCC8",lineHeight:1}}>{tripData.tripName}</div>
          {!isMobile&&<div style={{fontSize:15,color:"rgba(232,220,200,0.45)",letterSpacing:2,marginTop:3,fontFamily:"'Space Mono',monospace"}}>{[...new Set(flatPhases.map(p=>p.country))].join(" · ")}</div>}
        </div>}
        {isMobile?(()=>{
          const allSegD=loadSeg();
          let totalSegs=0,filledSegs=0;
          segPhases.forEach(p=>p.segments.forEach(s=>{totalSegs++;const d=allSegD[`${p.id}-${s.id}`]||{};if(d.transport?.mode||d.transport?.cost||d.stay?.name||d.stay?.cost||(d.activities?.length||0)>0)filledSegs++;}));
          const readPct=totalSegs>0?Math.round((filledSegs/totalSegs)*100):0;
          return(
            <div data-coach="trip-stats" style={{background:'rgba(0,8,16,0.38)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderRadius:14,border:'1.5px solid rgba(0,229,255,0.35)',borderTop:'1.5px solid rgba(0,229,255,0.65)',boxShadow:'inset 0 1px 0 rgba(0,229,255,0.30), 0 4px 24px rgba(0,0,0,0.35)',overflow:'hidden'}}>
              <div style={{padding:'10px 16px 9px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                  <span style={{fontSize:9,letterSpacing:'0.12em',color:'rgba(0,229,255,0.55)',fontFamily:"'Space Mono',monospace",fontWeight:700}}>EXPEDITION READINESS</span>
                  <span style={{fontSize:20,fontWeight:700,color:'#00E5FF',fontFamily:"'Space Mono',monospace"}}>{readPct}%</span>
                </div>
                <div style={{width:'100%',height:6,background:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${readPct}%`,background:'linear-gradient(90deg,#00E5FF88,#00E5FF)',borderRadius:3,transition:'width 0.6s ease'}}/>
                </div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',marginTop:5,fontFamily:"'Space Mono',monospace"}}>{filledSegs} of {totalSegs} planning tasks complete</div>
              </div>
              <div style={{height:1,background:'rgba(0,229,255,0.12)'}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',overflow:'hidden'}}>
                {[{label:'DEPARTS IN',value:daysToDepart,sub:'DAYS',color:'#E8DCC8'},{label:'NIGHTS',value:totalNights,sub:'NIGHTS',color:'#E8DCC8'},{label:'BUDGET',value:fmt(totalBudget),sub:'TOTAL',color:'#FFD93D'}].map((s,i)=>(
                  <div key={s.label} style={{textAlign:'center',padding:'8px 4px'}}>
                    <div style={{fontSize:9,letterSpacing:'0.10em',color:'rgba(255,255,255,0.60)',fontFamily:"'Space Mono',monospace",fontWeight:700,marginBottom:3}}>{s.label}</div>
                    <div style={{fontSize:19,fontWeight:700,color:s.color,fontFamily:"'Space Mono',monospace",lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.50)',fontFamily:"'Space Mono',monospace",marginTop:2}}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })():(
          <div data-coach="trip-stats" style={{background:'rgba(0,8,16,0.65)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',border:'1.5px solid rgba(0,229,255,0.28)',borderTop:'1.5px solid rgba(0,229,255,0.55)',borderRadius:12,padding:'4px 0',overflow:'hidden'}}>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${heroStats.length},1fr)`,position:"relative"}}>
              {heroStats.map((s,i)=>(
                <div key={s.label} style={{textAlign:"center",padding:"4px 6px",borderLeft:i>0?"1px solid rgba(255,255,255,0.10)":"none"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(232,220,200,0.5)",letterSpacing:3,marginBottom:4,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>{s.label}</div>
                  <div className="stat-val" style={{fontSize:26,fontWeight:700,lineHeight:1,color:s.label==="BUDGET"?"#FFD93D":"#E8DCC8",fontFamily:"'Space Mono',monospace",animationDelay:`${i*0.1}s`}}>{s.value}</div>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(232,220,200,0.4)",letterSpacing:2,marginTop:3,fontFamily:"'Space Mono',monospace"}}>{s.unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}
      {!isFullscreen&&!isMobile&&<div style={{display:"flex",borderBottom:"1px solid rgba(0,229,255,0.1)",border:"1px solid rgba(255,255,255,0.10)",borderTop:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.03)",flexShrink:0,position:"relative",zIndex:1}}>
        <div style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,borderRight:"1px solid rgba(0,229,255,0.1)",borderBottom:"2px solid #00E5FF",background:"rgba(0,229,255,0.04)"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#00E5FF",boxShadow:"0 0 6px #00E5FF",animation:"consolePulse 2.5s ease-in-out infinite"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"#00E5FF",letterSpacing:1,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>TRIP CONSOLE</span>
        </div>
        <div data-coach="trip-pack-switch" onClick={onPackConsole} style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",background:"transparent",opacity:0.55}} onMouseOver={e=>{e.currentTarget.style.background="rgba(196,87,30,0.08)";e.currentTarget.style.opacity="1";}} onMouseOut={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.opacity="0.55";}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"rgba(196,87,30,0.4)"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"rgba(255,159,67,0.65)",letterSpacing:1,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>PACK CONSOLE</span>
        </div>
      </div>}
      {/* Tab bar */}
      {!isMobile&&(
        <div style={{display:"flex",borderBottom:"1px solid rgba(232,220,200,0.06)",background:"#150F0A",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",alignItems:"stretch",position:"relative",zIndex:1}}>
          <button onClick={()=>setFullscreen(f=>!f)} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"10px 14px",background:isFullscreen?"rgba(0,229,255,0.15)":"rgba(0,229,255,0.06)",border:"none",borderRight:"1px solid rgba(0,229,255,0.2)",cursor:"pointer",flexShrink:0,color:"#00E5FF"}} onMouseOver={e=>e.currentTarget.style.background="rgba(0,229,255,0.22)"} onMouseOut={e=>e.currentTarget.style.background=isFullscreen?"rgba(0,229,255,0.15)":"rgba(0,229,255,0.06)"}>
            <span style={{fontSize:15,lineHeight:1,textShadow:"0 0 10px rgba(0,229,255,0.9)"}}>{isFullscreen?"⊡":"⛶"}</span>
            <span style={{fontSize:15,letterSpacing:1,fontWeight:700,whiteSpace:"nowrap"}}>{isFullscreen?"EXIT":"EXPAND"}</span>
          </button>
          <div data-coach="trip-tabs" style={{display:"flex",flex:1,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} {...(t.id==="intel"?{"data-coach":"trip-intel"}:{})} className={"mc-tab "+(tab===t.id?"active":"")} onClick={()=>{setTab(t.id);if(t.id!=="intel")setExplorerDest(null);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"9px 12px",minWidth:44}}>
                <span style={{fontSize:15}}>{t.label.split(" ")[0]}</span>
                <span style={{fontSize:15,letterSpacing:1.5}}>{t.label.split(" ").slice(1).join(" ")}</span>
              </button>
            ))}
          </div>
          <button onClick={onRevise} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 12px",background:"rgba(0,229,255,0.06)",border:"none",borderLeft:"1px solid rgba(0,229,255,0.15)",cursor:"pointer",flexShrink:0}} onMouseOver={e=>e.currentTarget.style.background="rgba(0,229,255,0.14)"} onMouseOut={e=>e.currentTarget.style.background="rgba(0,229,255,0.06)"}>
            <span style={{fontSize:15,lineHeight:1}}>✏️</span><span style={{fontSize:15,letterSpacing:1,fontFamily:"'Space Mono',monospace",color:"#00E5FF",whiteSpace:"nowrap",fontWeight:700}}>REVISE</span>
          </button>
          <button onClick={handleNewTripClick} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 14px",borderLeft:confirmNewTrip?"1px solid rgba(255,107,107,0.5)":"1px solid rgba(169,70,29,0.4)",background:confirmNewTrip?"rgba(255,107,107,0.15)":"rgba(169,70,29,0.08)",border:"none",cursor:"pointer",flexShrink:0,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minWidth:confirmNewTrip?72:50}} onMouseOver={e=>e.currentTarget.style.background=confirmNewTrip?"rgba(255,107,107,0.22)":"rgba(169,70,29,0.18)"} onMouseOut={e=>e.currentTarget.style.background=confirmNewTrip?"rgba(255,107,107,0.15)":"rgba(169,70,29,0.08)"}>
            <span style={{fontSize:15,color:confirmNewTrip?"#FF6B6B":"#FFD93D",lineHeight:1}}>{confirmNewTrip?"⚠️":"+"}</span>
            <span style={{fontSize:15,fontFamily:"'Space Mono',monospace",color:confirmNewTrip?"#FF6B6B":"#FFD93D",whiteSpace:"nowrap",fontWeight:700,textAlign:"center"}}>{confirmNewTrip?"CONFIRM?":"NEW TRIP"}</span>
          </button>
        </div>
      )}
      {confirmNewTrip&&<div style={{padding:"7px 14px",background:"rgba(255,107,107,0.1)",borderBottom:"1px solid rgba(255,107,107,0.3)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"relative",zIndex:1}}>
        <span style={{fontSize:15,color:"rgba(255,107,107,0.9)",letterSpacing:1}}>⚠️ This will clear your expedition. Tap CONFIRM? again to proceed.</span>
        <button onClick={()=>setConfirmNewTrip(false)} style={{fontSize:15,color:"rgba(255,255,255,0.4)",background:"none",border:"none",cursor:"pointer",padding:"2px 6px"}}>✕</button>
      </div>}
      <div className="mc-content" style={{position:"relative",zIndex:1}}>
        {tab==="next"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {isComplete&&<div onClick={onHomecoming} style={{marginBottom:4,padding:"11px 14px",background:"linear-gradient(135deg,rgba(255,217,61,0.1),rgba(255,159,67,0.06))",border:"1px solid rgba(255,217,61,0.35)",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:8,animation:"consolePulse 2.8s ease-in-out infinite"}} onMouseOver={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(255,217,61,0.18),rgba(255,159,67,0.12))"} onMouseOut={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(255,217,61,0.1),rgba(255,159,67,0.06))"}>
              <span style={{fontSize:16}}>🏆</span>
              <span style={{fontSize:11,fontWeight:700,color:"#FFD93D",letterSpacing:2,fontFamily:"'Space Mono',monospace",flex:1}}>✦ EXPEDITION COMPLETE · TAP TO CELEBRATE</span>
              <span style={{fontSize:12,color:"rgba(255,217,61,0.5)"}}>→</span>
            </div>}
            {tripData.visionNarrative&&(()=>{const _vn=tripData.visionNarrative;const _lim=160;const _trunc=_vn.length>_lim?_vn.slice(0,_lim).slice(0,_vn.slice(0,_lim).lastIndexOf(' '))+'...':_vn;return(<div style={{marginBottom:8}}><div style={{fontSize:10,color:"rgba(232,220,200,0.35)",letterSpacing:3,fontFamily:"'Space Mono',monospace",marginBottom:6}}>✦ EXPEDITION VISION</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:15,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.65)",lineHeight:1.75,borderLeft:"2px solid rgba(232,220,200,0.12)",paddingLeft:12,textAlign:"left"}}>"{_trunc}"</div></div>);})()}
            <div style={{fontSize:isMobile?12:14,color:"#E8DCC8",letterSpacing:isMobile?1.5:2.5,marginBottom:4,fontWeight:500,fontFamily:"'Space Mono',monospace",whiteSpace:isMobile?"normal":"nowrap"}}>YOUR EXPEDITION · {segPhases.length} PHASES</div>
            {isMobile&&<div style={{fontSize:15,color:"rgba(232,220,200,0.45)",letterSpacing:1.5,marginBottom:4,fontFamily:"'Space Mono',monospace"}}>TAP PHASE TO EXPAND</div>}
            {segPhases.map((phase,i)=>i===0?<div key={phase.id} data-coach="trip-phases"><PhaseCard phase={phase} intelData={explorerData} idx={i} onTap={p=>setPhaseDetailView(p)} allSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading}/></div>:<PhaseCard key={phase.id} phase={phase} intelData={explorerData} idx={i} onTap={p=>setPhaseDetailView(p)} allSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading}/>)}
          </div>
        )}
        {tab==="budget"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[{label:"EXPEDITION TOTAL",value:fmt(totalBudget),color:"#FFD93D",sub:`across ${flatPhases.length} phases`},{label:"AVG / NIGHT",value:fmt(totalBudget/Math.max(totalNights,1)),color:"#A29BFE",sub:`${totalNights} nights`},{label:"AVG / PHASE",value:fmt(totalBudget/Math.max(flatPhases.length,1)),color:"#00E5FF",sub:"per destination"}].map((s,si)=>(
                <div key={s.label} style={{background:"linear-gradient(135deg,rgba(0,8,20,0.8),rgba(0,20,40,0.6))",border:"1px solid rgba(0,229,255,0.12)",borderRadius:10,padding:isMobile?"8px 10px":"12px 14px",textAlign:"center",gridColumn:isMobile&&si===2?"1 / -1":"auto"}}>
                  <div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.6)",letterSpacing:isMobile?0:1,marginBottom:3,fontFamily:"'Space Mono',monospace",fontWeight:600}}>{s.label}</div>
                  <div style={{fontSize:isMobile?16:22,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.45)",marginTop:2}}>{s.sub}</div>
                </div>
              ))}
            </div>
            {(()=>{const bd=tripData.budgetBreakdown;if(!bd)return null;const cats=[{key:"flights",icon:"✈️",label:"FLIGHTS",color:"#00E5FF",note:bd.flightsNote},{key:"accommodation",icon:"🏨",label:"ACCOMMODATION",color:"#A29BFE",note:bd.accommodationNote},{key:"food",icon:"🍽️",label:"FOOD & DRINK",color:"#FFD93D",note:bd.foodNote},{key:"transport",icon:"🚌",label:"TRANSPORT",color:"#69F0AE",note:null},{key:"activities",icon:"🎯",label:"ACTIVITIES",color:"#FF9F43",note:null},{key:"buffer",icon:"🛡️",label:"BUFFER",color:"rgba(255,255,255,0.5)",note:null}];const maxCat=Math.max(...cats.map(c=>bd[c.key]||0),1);return(
              <div style={{marginBottom:16,background:"linear-gradient(135deg,rgba(0,8,20,0.7),rgba(0,20,40,0.4))",border:"1px solid rgba(255,217,61,0.12)",borderRadius:10,padding:isMobile?"10px 12px":"14px 16px"}}>
                <div style={{fontSize:11,color:"rgba(255,217,61,0.7)",letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700,marginBottom:10}}>BUDGET BREAKDOWN</div>
                {cats.map(c=>{const val=bd[c.key]||0;const pct=(val/maxCat)*100;return(
                  <div key={c.key} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13}}>{c.icon}</span><span style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.7)",fontFamily:"'Space Mono',monospace",fontWeight:600,letterSpacing:1}}>{c.label}</span></div>
                      <span style={{fontSize:isMobile?13:15,fontWeight:900,color:c.color,fontFamily:"'Space Mono',monospace"}}>{fmt(val)}</span>
                    </div>
                    <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${c.color}66,${c.color})`,borderRadius:3,transition:"width 0.6s ease"}}/></div>
                    {c.note&&<div style={{fontSize:isMobile?10:12,color:"rgba(255,255,255,0.4)",fontStyle:"italic",marginTop:2}}>{c.note}</div>}
                  </div>
                );})}
                {bd.routingNote&&<div style={{marginTop:8,padding:"8px 10px",background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.1)",borderRadius:6,fontSize:isMobile?11:13,color:"rgba(255,255,255,0.55)",fontStyle:"italic",lineHeight:1.5}}>🗺️ {bd.routingNote}</div>}
              </div>
            );})()}
            {flatPhases.map(phase=>{
              const budget=phase.budget||phase.cost||0;
              const pct=(budget/Math.max(...flatPhases.map(p=>p.budget||p.cost||0)))*100;
              return(
                <div key={phase.id} style={{background:"rgba(0,8,20,0.5)",border:"1px solid rgba(0,229,255,0.08)",borderRadius:8,padding:"9px 13px",borderLeft:"3px solid "+phase.color,marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                      <span style={{fontSize:15}}>{phase.flag}</span>
                      <div><div style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FF9F43"}}>{phase.name}</div><div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.55)"}}>{phase.nights}n · <span style={{color:"#FF9F43",fontWeight:600}}>{phase.country}</span></div></div>
                    </div>
                    <span style={{fontSize:15,fontWeight:900,color:phase.color,fontFamily:"'Space Mono',monospace",flexShrink:0,marginLeft:8}}>{fmt(budget)}</span>
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${phase.color}88,${phase.color})`,borderRadius:3,transition:"width 0.6s ease"}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.5)"}}>{fmt(Math.round(budget/Math.max(phase.nights,1)))}/night</div><div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.4)"}}>{Math.round(pct)}% of max</div></div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="book"&&(
          <div>
            {/* NEEDS ATTENTION */}
            {changedSegs.length>0&&<div style={{marginBottom:14,padding:"10px 13px",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(255,107,107,0.28)",borderRadius:10}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                <span style={{fontSize:14}}>⚠️</span>
                <span style={{fontSize:11,fontWeight:700,color:"#FF6B6B",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>NEEDS ATTENTION · {changedSegs.length} SEGMENT{changedSegs.length>1?"S":""} WITH CHANGES</span>
              </div>
              {changedSegs.map(({phase,seg})=>(
                <div key={`${phase.id}-${seg.id}`} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:"1px solid rgba(255,107,107,0.1)"}}>
                  <span style={{fontSize:12,flex:1,color:"rgba(255,255,255,0.75)",fontFamily:"'Space Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>→ {phase.name} / {seg.name}</span>
                  <button onClick={()=>{const all=loadSeg();const k=`${phase.id}-${seg.id}`;if(all[k]){all[k]={...all[k],status:'booked'};saveSeg(all);setTab("next");}}} style={{fontSize:10,padding:"3px 10px",borderRadius:6,border:"1px solid rgba(255,107,107,0.4)",background:"rgba(255,107,107,0.1)",color:"#FF6B6B",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1,minHeight:30,flexShrink:0}}>RESOLVE</button>
                </div>
              ))}
            </div>}
            <div style={{fontSize:15,color:"#FFD93D",letterSpacing:3,marginBottom:4}}>BOOK YOUR EXPEDITION</div>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.65)",marginBottom:14}}>Links open in new tab</div>
            {flatPhases.map(phase=>{
              const dest=encodeURIComponent(phase.name);
              const LINKS=[{icon:"✈️",label:"Google Flights",color:"#00E5FF",url:"https://www.google.com/flights"},{icon:"✈️",label:"Skyscanner",color:"#00E5FF",url:"https://www.skyscanner.com/transport/flights/"+dest},{icon:"🏠",label:"Airbnb",color:"#69F0AE",url:"https://www.airbnb.com/s/"+dest+"/homes"},{icon:"🏨",label:"Booking.com",color:"#69F0AE",url:"https://www.booking.com/searchresults.html?ss="+dest},{icon:"🎯",label:"Klook",color:"#FF9F43",url:"https://www.klook.com/en-US/search/?query="+dest},{icon:"🗺️",label:"Viator",color:"#FF9F43",url:"https://www.viator.com/searchResults/all?text="+dest},{icon:"🤿",label:"PADI Dive Ops",color:"#00E5FF",url:"https://www.padi.com/dive-shop?q="+dest}];
              return(
                <div key={phase.id} style={{background:"#0C1520",border:"1px solid "+phase.color+"22",borderRadius:10,marginBottom:10,overflow:"hidden"}}>
                  <div style={{padding:"10px 13px",borderBottom:"1px solid "+phase.color+"22",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{phase.flag}</span><div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:phase.color}}>{phase.name}</div><div style={{fontSize:15,color:"rgba(255,255,255,0.7)"}}>{phase.arrival} · {phase.nights} nights</div></div><div style={{fontSize:15,fontWeight:700,color:"#FFD93D"}}>{fmt(phase.budget||phase.cost||0)}</div></div>
                  <div style={{padding:"10px 13px",display:"flex",flexWrap:"wrap",gap:6}}>
                    {LINKS.filter(l=>phase.diveCount>0||l.label!=="PADI Dive Ops").map(link=>(
                      <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:5,padding:isMobile?"8px 13px":"6px 11px",background:link.color+"10",border:"1px solid "+link.color+"33",borderRadius:20,textDecoration:"none",minHeight:36}}>
                        <span style={{fontSize:15}}>{link.icon}</span><span style={{fontSize:isMobile?13:15,color:link.color,fontFamily:"'Space Mono',monospace"}}>{link.label}</span><span style={{fontSize:15,color:"rgba(255,255,255,0.25)"}}>↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* CANCELLED sub-list */}
            {cancelledSegs.length>0&&<div style={{marginTop:14,padding:"10px 13px",background:"rgba(136,136,136,0.05)",border:"1px solid rgba(136,136,136,0.2)",borderRadius:10}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                <span style={{fontSize:13}}>✕</span>
                <span style={{fontSize:11,fontWeight:700,color:"#888",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>CANCELLED · {cancelledSegs.length} ITEM{cancelledSegs.length>1?"S":""}</span>
              </div>
              {cancelledSegs.map(({phase,seg})=>(
                <div key={`${phase.id}-${seg.id}`} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:"1px solid rgba(136,136,136,0.1)"}}>
                  <span style={{fontSize:12,flex:1,color:"rgba(136,136,136,0.7)",fontFamily:"'Space Mono',monospace",textDecoration:"line-through",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{phase.name} / {seg.name}</span>
                  <button onClick={()=>{const all=loadSeg();const k=`${phase.id}-${seg.id}`;if(all[k]){all[k]={...all[k],status:'planning'};saveSeg(all);setTab("next");}}} style={{fontSize:10,padding:"3px 10px",borderRadius:6,border:"1px solid rgba(0,229,255,0.3)",background:"rgba(0,229,255,0.06)",color:"#00E5FF",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1,minHeight:30,flexShrink:0}}>+ REBOOK</button>
                </div>
              ))}
            </div>}
            {/* RETURN JOURNEY */}
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(255,217,61,0.12)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(255,217,61,0.2))"}}/>
                <span style={{fontSize:15,color:"rgba(255,242,210,0.78)",letterSpacing:3,fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>✦ RETURN JOURNEY</span>
                <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(255,217,61,0.2),transparent)"}}/>
              </div>
              <div style={{background:"rgba(255,217,61,0.03)",border:"1px solid rgba(255,217,61,0.14)",borderRadius:12,padding:"14px 14px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <SDF label="DATE" type="date" value={returnData.flight.date} onChange={v=>uR("date",v)} accent="#FFD93D"/>
                  <SDF label="COST ($)" type="number" value={returnData.flight.cost} onChange={v=>uR("cost",v)} placeholder="0" accent="#FFD93D"/>
                  <SDF label="FROM" value={returnData.flight.from} onChange={v=>uR("from",v)} placeholder="Last destination..." accent="#FFD93D"/>
                  <SDF label="TO" value={returnData.flight.to} onChange={v=>uR("to",v)} placeholder="Home city..." accent="#FFD93D"/>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:"'Space Mono',monospace",letterSpacing:1}}>Return flight status</span>
                  <button onClick={()=>uR("status",STATUS_NEXT[returnData.flight.status]||"planning")} style={{background:`${STATUS_CFG[returnData.flight.status]?.color||"#FF9F43"}18`,border:`1px solid ${STATUS_CFG[returnData.flight.status]?.color||"#FF9F43"}55`,borderRadius:6,padding:"4px 12px",fontSize:9,fontWeight:700,letterSpacing:2,color:STATUS_CFG[returnData.flight.status]?.color||"#FF9F43",cursor:"pointer",fontFamily:"'Space Mono',monospace",minHeight:30}}>
                    {STATUS_CFG[returnData.flight.status]?.icon||"✏️"} {STATUS_CFG[returnData.flight.status]?.label||"PLANNING"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* arch #2: full INTEL tab preserved */}
        {tab==="intel"&&(
          <div>
            {!explorerDest?(
              <div>
                <div style={{fontSize:15,color:"#FFD93D",letterSpacing:3,marginBottom:14}}>SELECT A PHASE · FOR DESTINATION INTEL</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8}}>
                  {flatPhases.map(phase=>(
                    <button key={phase.id} onClick={()=>openIntel(phase.name,phase.name,phase.type)} style={{background:phase.color+"08",border:"1px solid "+phase.color+"33",borderRadius:8,padding:"11px 12px",cursor:"pointer",textAlign:"left",minHeight:60}}>
                      <div style={{fontSize:15,color:"#FF9F43",marginBottom:3}}>{phase.flag} Phase {phase.id}</div>
                      <div style={{fontSize:15,fontWeight:700,color:"#FFF"}}>{phase.name}</div>
                      <div style={{fontSize:15,color:"rgba(255,255,255,0.5)",marginTop:2}}>{TI[phase.type]} {phase.type}</div>
                    </button>
                  ))}
                </div>
              </div>
            ):(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
                  <button onClick={()=>setExplorerDest(null)} style={{background:"none",border:"1px solid #111D2A",borderRadius:4,color:"#FFF",fontSize:15,padding:"4px 9px",cursor:"pointer",minHeight:36,marginRight:10}}>← BACK</button>
                  <div><div style={{fontSize:15,fontWeight:700,color:"#FFF"}}>{explorerDest.destination}</div><div style={{fontSize:15,color:"rgba(255,255,255,0.5)",letterSpacing:2}}>{TI[explorerDest.type]} {explorerDest.type?.toUpperCase()}</div></div>
                </div>
                {loadingIntel?<div>{[80,65,72,55,68].map((w,i)=><div key={i} className="loading-skeleton" style={{width:w+"%"}}/>)}<div style={{color:"rgba(255,255,255,0.4)",fontSize:15,letterSpacing:2,marginTop:6}}>LOADING INTEL...</div></div>
                :explorerData[explorerDest.destination]?(()=>{
                  const d=explorerData[explorerDest.destination];
                  if(d.error)return(<div style={{textAlign:"center",padding:"30px 20px"}}><div style={{fontSize:32,marginBottom:16}}>📡</div><div style={{fontSize:15,color:"#FF6B6B",marginBottom:8,fontFamily:"'Space Mono',monospace"}}>Intel unavailable</div><div style={{fontSize:15,color:"rgba(255,255,255,0.4)",marginBottom:20,lineHeight:1.6}}>{d.errorMsg}</div><button style={{background:"rgba(255,107,107,0.15)",border:"1px solid #FF6B6B44",borderRadius:8,color:"#FF6B6B",fontSize:15,padding:"10px 20px",cursor:"pointer",fontFamily:"monospace",minHeight:44}} onClick={()=>{setExplorerData(p=>({...p,[explorerDest.destination]:undefined}));openIntel(explorerDest.destination,explorerDest.phaseName,explorerDest.type);}}>↺ RETRY</button></div>);
                  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {d.tagline&&<div style={{fontSize:15,color:"#A29BFE",fontStyle:"italic",borderLeft:"3px solid #A29BFE",paddingLeft:11}}>{d.tagline}</div>}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                      {d.mustDo&&<div className="intel-section"><div className="intel-section-label" style={{color:"#00E5FF"}}>⚡ MUST DO</div>{d.mustDo.map((item,i)=><div key={i} style={{fontSize:isMobile?13:15,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.hiddenGems&&<div className="intel-section"><div className="intel-section-label" style={{color:"#69F0AE"}}>💎 HIDDEN GEMS</div>{d.hiddenGems.map((item,i)=><div key={i} style={{fontSize:isMobile?13:15,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.food&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FFD93D"}}>🍽️ FOOD</div>{d.food.map((item,i)=><div key={i} style={{fontSize:isMobile?13:15,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.warnings?.length>0&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FF6B6B"}}>⚠️ HEADS UP</div>{d.warnings.map((item,i)=><div key={i} style={{fontSize:isMobile?13:15,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                    </div>
                    {d.streetIntel?.length>0&&<div style={{background:"linear-gradient(135deg,rgba(255,107,107,0.07),rgba(255,159,67,0.05))",border:"1px solid rgba(255,107,107,0.4)",borderRadius:10,padding:13}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><div style={{width:7,height:7,borderRadius:"50%",background:"#FF6B6B",boxShadow:"0 0 8px #FF6B6B"}}/><div style={{fontSize:15,color:"#FF6B6B",letterSpacing:3,fontWeight:700}}>STREET INTEL</div></div>
                      {d.streetIntel.map((intel,i)=>{const tc2={SCAM:"#FF6B6B",LEGAL:"#FFD93D",HEALTH:"#69F0AE",MONEY:"#FF9F43"};const ti2={SCAM:"🎭",LEGAL:"⚖️",HEALTH:"🏥",MONEY:"💸"};const c=tc2[intel.type]||"#FF6B6B";return(<div key={i} className="street-card" style={{borderLeft:`3px solid ${c}`}}><span style={{fontSize:15,flexShrink:0}}>{ti2[intel.type]||"⚠️"}</span><div><div style={{fontSize:15,letterSpacing:2,fontWeight:700,marginBottom:3,color:c}}>{intel.type}</div><div style={{fontSize:15,color:"#FFF",lineHeight:1.6}}>{intel.alert}</div></div></div>);})}
                    </div>}
                    {d.culture&&<div className="intel-section"><div className="intel-section-label" style={{color:"#A29BFE"}}>🏛️ CULTURE & VIBE</div><div style={{fontSize:isMobile?13:15,color:"#FFF",lineHeight:1.6}}>{d.culture}</div></div>}
                    {d.climate&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FF9F43"}}>🌤️ CLIMATE</div><div style={{fontSize:isMobile?13:15,color:"#FFF"}}>{d.climate}</div></div>}
                    {d.diveHighlight&&<div className="intel-section" style={{borderColor:"rgba(0,229,255,0.2)"}}><div className="intel-section-label" style={{color:"#00E5FF"}}>🤿 DIVE INTEL</div><div style={{fontSize:isMobile?13:15,color:"#FFF"}}>{d.diveHighlight}</div></div>}
                  </div>);
                })():null}
              </div>
            )}
          </div>
        )}
        {tab==="blueprint"&&(
          <div>
            {(tripData.budgetBreakdown||tripData.phases?.length>0)?(
              <div>
                {(tripData.visionNarrative||tripData.vision)&&<div style={{borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:12,marginBottom:18}}><div style={{fontSize:11,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700,marginBottom:4}}>✦ ORIGINAL VISION</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:15,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.7}}>"{tripData.visionNarrative||tripData.vision}"</div></div>}
                {(()=>{const bd=tripData.budgetBreakdown;if(!bd)return <div style={{padding:"12px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:11,marginBottom:16}}><div style={{fontSize:11,color:"rgba(255,159,67,0.65)",letterSpacing:2,fontFamily:"'Space Mono',monospace",marginBottom:6}}>✦ BUDGET OVERVIEW</div><div style={{fontSize:14,fontWeight:700,color:"#FFD93D",fontFamily:"'Space Mono',monospace"}}>Total: {fmt(tripData.totalBudget||0)}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.50)",fontFamily:"'Space Mono',monospace",marginTop:4}}>{tripData.phases?.length||0} phases · {segPhases.reduce((s,p)=>s+p.totalNights,0)} nights</div></div>;const cats=[{key:"flights",icon:"✈️",label:"Flights",note:bd.flightsNote},{key:"accommodation",icon:"🏨",label:"Accommodation",note:bd.accommodationNote},{key:"food",icon:"🍜",label:"Food",note:bd.foodNote},{key:"transport",icon:"🚌",label:"Transport",note:null},{key:"activities",icon:"🎯",label:"Activities",note:null},{key:"buffer",icon:"🎒",label:"Buffer",note:null}].filter(c=>bd[c.key]>0);const total=cats.reduce((s,c)=>s+(bd[c.key]||0),0);return(
                  <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.08),rgba(0,8,20,0.6))",border:"1px solid rgba(169,70,29,0.3)",borderRadius:11,padding:"12px 14px",marginBottom:16}}>
                    <div style={{fontSize:11,color:"rgba(255,159,67,0.85)",letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700,marginBottom:10}}>✦ BUDGET BLUEPRINT</div>
                    {cats.map(c=>{const val=bd[c.key]||0;return(
                      <div key={c.key} style={{display:"flex",alignItems:"center",padding:"7px 0",gap:8}}>
                        <span style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}>{c.icon}</span>
                        <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.75)",fontWeight:600,width:isMobile?90:110,flexShrink:0}}>{c.label}</span>
                        <span style={{flex:1,fontSize:isMobile?11:13,fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"rgba(255,255,255,0.45)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.note||""}</span>
                        <span style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FFD93D",fontFamily:"'Space Mono',monospace",flexShrink:0,marginLeft:8}}>~{fmt(val)}</span>
                      </div>
                    );})}
                    <div style={{height:1,background:"rgba(255,255,255,0.12)",margin:"8px 0"}}/>
                    <div style={{display:"flex",alignItems:"center",padding:"4px 0",gap:8}}>
                      <span style={{fontSize:14,width:22,flexShrink:0}}> </span>
                      <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.9)",fontWeight:700,width:isMobile?90:110,flexShrink:0}}>TOTAL</span>
                      <span style={{flex:1}}/>
                      <span style={{fontSize:isMobile?14:16,fontWeight:900,color:"#FFD93D",fontFamily:"'Space Mono',monospace",flexShrink:0,marginLeft:8}}>~{fmt(total)}</span>
                    </div>
                    {bd.routingNote&&<div style={{marginTop:10,borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:10}}><div style={{fontSize:11,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Space Mono',monospace",marginBottom:3}}>✦ WHY THIS ROUTE</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?12:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>{bd.routingNote}</div></div>}
                  </div>
                );})()}
              </div>
            ):(
              <div style={{textAlign:"center",padding:"40px 20px"}}>
                <div style={{fontSize:32,marginBottom:12}}>✦</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:16,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.55)",lineHeight:1.7}}>Complete your first expedition to unlock your Blueprint.</div>
              </div>
            )}
          </div>
        )}
      </div>
      {(()=>{try{return localStorage.getItem("1bn_hide_all_tips")!=="1";}catch(e){return true;}})()&&<div style={{padding:"12px 16px",textAlign:"center"}}><button onClick={()=>{try{localStorage.setItem("1bn_hide_all_tips","1");}catch(e){}setShowCoach(false);setShowOnboard(false);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.40)",fontSize:10,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,padding:"6px 12px"}} onMouseOver={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"} onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,0.40)"}>Hide all tips</button></div>}
      {isMobile&&!isFullscreen&&!phaseDetailView&&<div style={{height:"calc(64px + env(safe-area-inset-bottom))"}}/>}
      {isMobile&&!isFullscreen&&<div style={{opacity:phaseDetailView?0:1,pointerEvents:phaseDetailView?"none":"auto",transition:"opacity 0.35s cubic-bezier(0.25,0.46,0.45,0.94)"}}><BottomNav activeTab={tab} onTab={t=>{if(t==="pack")onPackConsole();else{setTab(t);if(t!=="intel")setExplorerDest(null);}}}/></div>}
    </div>
  );
}

// ─── CircularRing ─────────────────────────────────────────────────
function CircularRing({value,max,label,sublabel,color,unit}) {
  const r=54,circ=2*Math.PI*r;
  const pct=Math.min(value/max,1);
  const dash=pct*circ,gap=circ-dash;
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 8px'}}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <defs>
          <filter id={`glow-${color.replace('#','')}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`} strokeDashoffset={circ*0.25}
          filter={`url(#glow-${color.replace('#','')})`}
          style={{transition:'stroke-dasharray 0.6s ease'}}/>
        <text x="65" y="58" textAnchor="middle" fill={color} fontSize="22" fontWeight="700" fontFamily="Space Mono">{value}</text>
        <text x="65" y="74" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="11" fontFamily="Space Mono">{unit}</text>
        <text x="65" y="90" textAnchor="middle" fill="rgba(255,255,255,0.50)" fontSize="10" fontFamily="Space Mono">/ {max} {unit}</text>
      </svg>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.10em',color:'rgba(255,255,255,0.80)',marginTop:4}}>{label}</div>
      <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',letterSpacing:'0.08em',marginTop:2}}>{sublabel}</div>
    </div>
  );
}

// ─── Pack Brief helper ────────────────────────────────────────────
function getPackBrief(pp,tripData){
  if(!pp)return null;
  const {tripType,climate,duration}=pp;
  const tripName=tripData?.tripName||"your expedition";
  const typeContext={dive:"underwater exploration — dive gear is front and center, everything else is minimal",adventure:"physical adventure — durability and weather protection are priorities",culture:"city and cultural exploration — versatile, presentable, lightweight",luxury:"premium travel — quality over quantity, smart casual essentials",nomad:"long-term travel — tech-forward, laundry-friendly, multi-purpose items",beach:"coastal living — sun protection, quick-dry, minimal footprint",moto:"motorbike travel — weather protection, packable layers, security essentials",wellness:"wellness retreat — comfortable layers, yoga-friendly, minimal distractions",Trek:"alpine trekking — layered warmth, durable footwear, weather protection",Exploration:"broad exploration — versatile pieces that work across settings",Relax:"relaxed travel — comfort-first, easy layers, minimal fuss",Surf:"surf travel — boardshorts, rashguards, reef-safe sun protection",Nature:"nature immersion — earth tones, insect protection, quick-dry layers",Transit:"transit-heavy routing — wrinkle-resistant, packable, security-conscious"};
  const climateAdvice={"tropical-hot":"The heat and humidity mean breathable fabrics are essential — avoid anything that traps moisture.","tropical-wet":"Wet season means rain is guaranteed — waterproof everything, quick-dry only.","temperate-cool":"Layering is key — mornings and evenings will be cold even if afternoons are mild.","cold-alpine":"Warmth is non-negotiable — down layers, windproof shell, thermal base layers.",mediterranean:"Mild days, cooler evenings — one light layer handles most situations.","desert-hot":"UV protection is critical — cover up during midday, light breathable fabrics."};
  let msg=`For ${tripName}, I've selected gear appropriate for `+(typeContext[tripType]||"your specific trip type")+". "+(climateAdvice[climate]||"");
  if(duration==="short")msg+=" For a short trip, pack lighter than you think you need.";
  else if(duration==="long")msg+=" For an extended trip, plan for laundry every 5-7 days.";
  return msg;
}

// ─── PackConsole ──────────────────────────────────────────────────
function PackConsole({tripData,onExpedition,onGoToTab,isFullscreen,setFullscreen}) {
  const isMobile=useMobile();
  useEffect(()=>{window.scrollTo(0,0);posthog.capture("pack_console_opened");posthog.capture("$pageview",{$current_url:"/pack-console"});},[]);
  const ALL_CATS=[
    {id:"clothes",label:"Clothes",icon:"👕",color:"#FFD93D"},
    {id:"tech",label:"Tech",icon:"💻",color:"#00D4FF"},
    {id:"creator",label:"Creator",icon:"🎥",color:"#FF9F43"},
    {id:"dive",label:"Dive",icon:"🤿",color:"#00E5FF"},
    {id:"health",label:"Health",icon:"🏥",color:"#69F0AE"},
    {id:"travel",label:"Travel",icon:"🧳",color:"#55EFC4"},
    {id:"docs",label:"Docs",icon:"📄",color:"#E0E0E0"},
    {id:"adventure",label:"Adventure",icon:"🥾",color:"#55EFC4"},
    {id:"moto",label:"Moto",icon:"🏍️",color:"#FF6B6B"},
    {id:"safari",label:"Safari",icon:"🦁",color:"#FFD93D"},
    {id:"work",label:"Work",icon:"💼",color:"#A29BFE"},
  ];
  const pp=tripData.packProfile||null;
  const [enabledCats,setEnabledCats]=useState(()=>{try{const s=localStorage.getItem("1bn_pack_cats_v1");if(s)return JSON.parse(s);}catch(e){}return null;});
  const CATS=enabledCats?ALL_CATS.filter(c=>enabledCats.includes(c.id)):pp?ALL_CATS.filter(c=>pp.categories?.includes(c.id)):ALL_CATS.filter(c=>["clothes","tech","creator","dive","health","travel","docs"].includes(c.id));
  useEffect(()=>{if(enabledCats)try{localStorage.setItem("1bn_pack_cats_v1",JSON.stringify(enabledCats));}catch(e){}},[enabledCats]);
  const BAGS=["Backpack","Global Briefcase","Worn","Digital","Day Bag"];
  const WL=15,KGL=7,VL=45;
  const BAG_C={"Backpack":"#00E5FF","Global Briefcase":"#A29BFE","Worn":"#FFD93D","Digital":"#69F0AE","Day Bag":"#FF9F43"};

  const [packTab,setPackTab]=useState("pack");
  const [packView,setPackView]=useState("dashboard");
  const [activeCategory,setActiveCategory]=useState(null);
  const [items,setItems]=useState(()=>{try{const s=localStorage.getItem("1bn_pack_v5");if(s){const p=JSON.parse(s);if(p?.length>0)return p;}}catch(e){}const base=getDefaultPack();if(!pp)return base;const visCats=pp.categories||[];const ess=(pp.essentialItems||[]).map(n=>n.toLowerCase());const opt=(pp.optionalItems||[]).map(n=>n.toLowerCase());return base.filter(i=>visCats.includes(i.cat)||i.cat==="docs").map(i=>({...i,essential:ess.some(e=>i.name.toLowerCase().includes(e)),optional:opt.some(o=>i.name.toLowerCase().includes(o))})).sort((a,b)=>(b.essential?1:0)-(a.essential?1:0)||(a.optional?1:0)-(b.optional?1:0));});
  const [filterCat,setFilterCat]=useState("all");
  const [openCats,setOpenCats]=useState({});
  const [unit,setUnit]=useState("lbs");
  const [expandedItem,setExpandedItem]=useState(null);
  const [resetConfirm,setResetConfirm]=useState(false);
  const suggestCacheKey="1bn_refine_"+(tripData?.tripName||"default").replace(/\s+/g,"_").toLowerCase();
  const [suggestions,setSuggestions]=useState(()=>{try{const c=localStorage.getItem(suggestCacheKey);if(c){const p=JSON.parse(c);if(Array.isArray(p)&&p.length>0)return p;}}catch(e){}return[];});
  const [suggestLoading,setSuggestLoading]=useState(false);
  const [suggestDone,setSuggestDone]=useState(()=>{try{const c=localStorage.getItem(suggestCacheKey);if(c){const p=JSON.parse(c);if(Array.isArray(p))return true;}}catch(e){}return false;});
  const [accepted,setAccepted]=useState([]);
  const [chat,setChat]=useState([]);
  const [chatInput,setChatInput]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const [showCoach,setShowCoach]=useState(()=>{try{if(localStorage.getItem("1bn_hide_all_tips")==="1")return false;}catch(e){}return!loadCoach().pack;});
  const [showOnboard,setShowOnboard]=useState(()=>{try{if(localStorage.getItem("1bn_hide_all_tips")==="1")return false;}catch(e){}return!loadOnboard().pack;});
  const [packExplainerDismissed,setPackExplainerDismissed]=useState(()=>{try{return localStorage.getItem("1bn_hide_all_tips")==="1"||localStorage.getItem("1bn_pack_explainer_v1")==="1";}catch(e){return false;}});
  const briefKey="1bn_pack_brief_"+(tripData?.tripName||"default").replace(/\s+/g,"_").toLowerCase();
  const [packBriefCollapsed,setPackBriefCollapsed]=useState(()=>{try{return localStorage.getItem(briefKey)==="1";}catch(e){return false;}});
  const [showAddCats,setShowAddCats]=useState(false);
  const [packSaveFlash,setPackSaveFlash]=useState(false);
  const packSaveRef=useRef(null);
  const packFirstRender=useRef(true);
  const coupleMode=tripData.travelerProfile?.group==="couple";
  const chatEnd=useRef(null);

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  useEffect(()=>{try{localStorage.setItem("1bn_pack_v5",JSON.stringify(items));}catch(e){}if(packFirstRender.current){packFirstRender.current=false;return;}setPackSaveFlash(true);if(packSaveRef.current)clearTimeout(packSaveRef.current);packSaveRef.current=setTimeout(()=>setPackSaveFlash(false),2000);},[items]);
  useEffect(()=>{if(packTab==="refine"){posthog.capture("refine_tab_opened");if(!suggestDone&&!suggestLoading){const t=setTimeout(()=>genSuggestions(),800);return()=>clearTimeout(t);}}},[ packTab]);

  const countries=[...new Set(tripData.phases.map(p=>p.country))];
  const tripTypes=[...new Set(tripData.phases.map(p=>p.type))];
  const goalLabel=tripData.goalLabel||"Expedition";
  const totalNights=tripData.phases.reduce((s,p)=>s+p.nights,0);
  const wM=unit==="kg"?0.453592:1,wLim=unit==="kg"?KGL:WL;
  const bpW=items.filter(i=>i.bag==="Backpack").reduce((s,i)=>s+(parseFloat(i.weight)||0),0);
  const bpV=items.filter(i=>i.bag==="Backpack").reduce((s,i)=>s+(parseFloat(i.volume)||0),0);
  const gbW=items.filter(i=>i.bag==="Global Briefcase").reduce((s,i)=>s+(parseFloat(i.weight)||0),0);
  const neededCost=items.filter(i=>!i.owned).reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
  const ownedCount=items.filter(i=>i.owned).length;
  const gearPct=items.length>0?Math.round((ownedCount/items.length)*100):0;

  const toggleOwned=id=>setItems(p=>p.map(it=>it.id===id?{...it,owned:!it.owned,status:it.owned?"needed":"owned"}:it));
  const removeItem=id=>setItems(p=>p.filter(it=>it.id!==id));
  const updateItem=(id,f,v)=>setItems(p=>p.map(it=>it.id===id?{...it,[f]:v}:it));
  const addItemToCat=cat=>{setItems(p=>[...p,{id:Date.now(),name:"New Item",cat,weight:"0",cost:"0",volume:"0",owned:false,bag:"Backpack",status:"needed"}]);setOpenCats(o=>({...o,[cat]:true}));};
  const toggleCat=id=>setOpenCats(o=>({...o,[id]:!o[id]}));

  // filter logic
  const visibleCats=filterCat==="all"?CATS:CATS.filter(c=>c.id===filterCat);
  const itemsForCat=catId=>items.filter(i=>i.cat===catId);

  async function genSuggestions(skipCache){
    if(!skipCache){try{const c=localStorage.getItem(suggestCacheKey);if(c){const p=JSON.parse(c);if(Array.isArray(p)&&p.length>0){setSuggestions(p);setSuggestDone(true);return;}}}catch(e){}}
    setSuggestLoading(true);
    const existing=items.map(i=>i.name.toLowerCase());
    const tp=tripData.travelerProfile;
    const prompt=`You are a travel packing expert and co-architect for a ${pp?.tripType||"exploration"} trip.

TRIP DETAILS:
- Trip: ${tripData.tripName||"expedition"}
- Duration: ${pp?.duration||"medium"} (${totalNights} nights)
- Destinations: ${tripData.phases.map(p=>`${p.name||p.destination||""}, ${p.country} (${p.nights}n, ${p.type})`).join("; ")}
- Climate: ${pp?.climate?.replace(/-/g," ")||"mixed"}, ${pp?.season||"dry"} season
- Temperature: ${pp?.tempRange||"20-30C"}
- Activities: ${pp?.activities?.join(", ")||tripTypes.join(", ")}
- Travel style: ${tp?.style||"independent"}
- Group: ${tp?.group||"solo"}
${pp?.essentialItems?.length?`- Essential gear already flagged: ${pp.essentialItems.join(", ")}`:""}

ALREADY IN PACK (do NOT suggest these): ${existing.slice(0,25).join(", ")}

Generate 6-8 specific packing suggestions for this exact trip. For each suggestion:
- Be specific to THIS trip (mention the destination, climate, activities by name)
- Explain WHY this item matters for this specific trip
- Include realistic cost and weight estimates in lbs
- Assign to correct category: clothes, tech, travel, health, docs, dive, creator, adventure, safari, moto, work
- Assign bag: Backpack, Global Briefcase, Worn, Digital, Day Bag

Return ONLY a JSON array:
[{"name":"item name","cat":"category","reason":"specific reason for THIS trip","weight":0.3,"volume":0.2,"cost":25,"bag":"Backpack","priority":"essential|nice-to-have"}]`;
    const raw=await askAI(prompt,1200);
    const parsed=parseJSON(raw);
    if(parsed&&Array.isArray(parsed)){const tagged=parsed.map((s,i)=>({...s,id:"s"+Date.now()+i}));setSuggestions(tagged);try{localStorage.setItem(suggestCacheKey,JSON.stringify(tagged));}catch(e){}}
    setSuggestLoading(false);setSuggestDone(true);
  }
  const acceptSuggestion=s=>{posthog.capture("refine_item_added",{item_name:s.name,item_category:s.cat,essential:s.priority==="essential"||s.essential||false});setItems(p=>[...p,{id:Date.now(),name:s.name,cat:s.cat||"travel",weight:s.weight||0,volume:s.volume||0,cost:s.cost||0,bag:s.bag||"Backpack",owned:false,status:"needed"}]);setAccepted(p=>[...p,s.id]);setSuggestions(p=>{const next=p.filter(x=>x.id!==s.id);try{localStorage.setItem(suggestCacheKey,JSON.stringify(next));}catch(e){}return next;});};
  const dismissSuggestion=id=>setSuggestions(p=>{const next=p.filter(s=>s.id!==id);try{localStorage.setItem(suggestCacheKey,JSON.stringify(next));}catch(e){}return next;});
  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return;
    posthog.capture("pack_coarchitect_asked");
    const msg=chatInput;setChatInput("");setChat(p=>[...p,{role:"user",text:msg}]);setChatLoading(true);
    const res=await askAI(`Quiet luxury gear concierge.Trip:"${goalLabel}",${totalNights}n,${countries.join(",")}.Pack:${items.map(i=>i.name).join(",")}.User:"${msg}".2 sentences max.`,300);
    setChat(p=>[...p,{role:"ai",text:res}]);setChatLoading(false);
  }

  // ─── Item Row ─────────────────────────────────────────────────
  function PackItemRow({item,catColor,isLast,onEditOpenChange}) {
    const [open,setOpen]=useState(false);
    const [editOpen,setEditOpen]=useState(false);
    useEffect(()=>{onEditOpenChange?.(editOpen);},[editOpen]);
    if(isMobile) return(
      <>
        <div className="tap-scale" onClick={()=>setEditOpen(true)}
          style={{display:'flex',alignItems:'center',minHeight:56,padding:'0 16px',borderBottom:isLast?'none':'1px solid rgba(232,220,200,0.05)',gap:12,background:'transparent'}}>
          <button onClick={e=>{e.stopPropagation();toggleOwned(item.id);}} style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${item.owned?'#69F0AE':'rgba(255,255,255,0.15)'}`,background:item.owned?'rgba(105,240,174,0.1)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            {item.owned&&<span style={{color:'#69F0AE',fontSize:15,fontWeight:900,lineHeight:1}}>✓</span>}
          </button>
          <div style={{flex:1,minWidth:0,textAlign:'left'}}>
            <div style={{fontSize:13,fontWeight:500,color:item.owned?'#69F0AE':'#E8DCC8',fontFamily:"'Space Mono',monospace",whiteSpace:'normal',overflow:'visible',textOverflow:'clip',lineHeight:1.3}}>{item.essential&&<span style={{fontSize:9,color:'#FFD93D',marginRight:3}}>★</span>}{item.optional&&<span style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginRight:2}}>~</span>}{item.name||'Unnamed'}</div>
            <div style={{display:'flex',gap:8,marginTop:2}}>
              {parseFloat(item.weight)>0&&<span style={{fontSize:11,color:'rgba(255,255,255,0.38)',fontFamily:'monospace'}}>{(parseFloat(item.weight)*wM).toFixed(1)}{unit}</span>}
              {parseFloat(item.cost)>0&&<span style={{fontSize:11,color:'rgba(255,217,61,0.5)',fontFamily:'monospace'}}>${item.cost}</span>}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,padding:'2px 9px',borderRadius:20,border:`1px solid ${item.owned?'rgba(105,240,174,0.3)':'rgba(196,87,30,0.35)'}`,color:item.owned?'rgba(105,240,174,0.7)':'rgba(196,87,30,0.75)',fontFamily:"'Space Mono',monospace",fontWeight:600,whiteSpace:'nowrap'}}>{item.owned?'OWNED':'NEED'}</span>
            <span style={{fontSize:18,color:'rgba(255,255,255,0.18)'}}>›</span>
          </div>
        </div>
        <BottomSheet open={editOpen} onClose={()=>setEditOpen(false)} zIndex={600}>
          <div style={{padding:'16px 16px 8px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{fontSize:10,color:`${catColor}99`,letterSpacing:3,fontFamily:"'Space Mono',monospace",fontWeight:700,marginBottom:8}}>EDIT ITEM</div>
            <input value={item.name} onChange={e=>updateItem(item.id,'name',e.target.value)} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.30)',borderRadius:9,color:'#FFF',fontSize:14,padding:'10px 13px',fontFamily:"'Space Mono',monospace",outline:'none',transition:'border-color 0.2s,box-shadow 0.2s'}} placeholder="Item name" onFocus={e=>{e.target.style.borderColor='rgba(255,159,67,0.65)';e.target.style.boxShadow='0 0 0 2px rgba(255,159,67,0.15)';}} onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.30)';e.target.style.boxShadow='none';}}/>
          </div>
          <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:12,textAlign:'left'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[{label:'WT (lbs)',f:'weight'},{label:'COST ($)',f:'cost'},{label:'VOL (L)',f:'volume'}].map(({label,f})=>(
                <div key={f}>
                  <div style={{fontSize:9,color:`${catColor}88`,letterSpacing:2,marginBottom:5,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{label}</div>
                  <input value={item[f]} onChange={e=>updateItem(item.id,f,e.target.value)} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.30)',borderRadius:7,color:'#FFD93D',fontSize:13,padding:'8px 9px',outline:'none',fontFamily:'monospace',transition:'border-color 0.2s,box-shadow 0.2s'}} onFocus={e=>{e.target.style.borderColor='rgba(255,159,67,0.65)';e.target.style.boxShadow='0 0 0 2px rgba(255,159,67,0.15)';}} onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.30)';e.target.style.boxShadow='none';}}/>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:9,color:`${catColor}88`,letterSpacing:2,marginBottom:8,fontFamily:"'Space Mono',monospace",fontWeight:700}}>BAG</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {BAGS.map(b=><button key={b} onClick={()=>updateItem(item.id,'bag',b)} style={{padding:'5px 10px',borderRadius:20,border:`1px solid ${item.bag===b?BAG_C[b]||'#FF9F43':'rgba(255,255,255,0.35)'}`,background:item.bag===b?'rgba(255,255,255,0.06)':'transparent',color:item.bag===b?BAG_C[b]||'#FF9F43':'rgba(255,255,255,0.4)',fontSize:11,cursor:'pointer',fontFamily:'monospace',fontWeight:item.bag===b?700:400}}>{b}</button>)}
              </div>
            </div>
            <div style={{display:'flex',gap:8,paddingTop:4}}>
              <button onClick={()=>toggleOwned(item.id)} style={{flex:1,padding:'12px',borderRadius:12,border:`1px solid ${item.owned?'rgba(105,240,174,0.4)':'rgba(196,87,30,0.4)'}`,background:item.owned?'rgba(105,240,174,0.08)':'rgba(169,70,29,0.1)',color:item.owned?'#69F0AE':'#FF9F43',fontSize:13,cursor:'pointer',fontFamily:'monospace',fontWeight:700}}>{item.owned?'✓ OWNED':'MARK OWNED'}</button>
              <button onClick={()=>{removeItem(item.id);setEditOpen(false);}} style={{padding:'12px 16px',borderRadius:12,border:'1px solid rgba(255,107,107,0.3)',background:'rgba(255,107,107,0.06)',color:'rgba(255,107,107,0.7)',fontSize:11,cursor:'pointer',fontFamily:'monospace',fontWeight:700,letterSpacing:1}}>REMOVE</button>
            </div>
          </div>
        </BottomSheet>
      </>
    );
    // Desktop inline expand
    return(
      <div style={{borderBottom:isLast?"none":"1px solid rgba(255,255,255,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",minHeight:44,borderLeft:`2px solid ${catColor}${open?"88":"33"}`}}>
          <button onClick={e=>{e.stopPropagation();toggleOwned(item.id);}} style={{width:44,height:"100%",minHeight:52,display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>
            <div style={{width:20,height:20,borderRadius:4,border:`1.5px solid ${item.owned?"#69F0AE":"rgba(255,255,255,0.2)"}`,background:item.owned?"rgba(105,240,174,0.12)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
              {item.owned&&<span style={{color:"#69F0AE",fontSize:15,fontWeight:900,lineHeight:1}}>✓</span>}
            </div>
          </button>
          <div onClick={()=>setOpen(o=>!o)} style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:"10px 8px 10px 4px",cursor:"pointer",minWidth:0}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:item.owned?"rgba(105,240,174,0.82)":"rgba(255,242,210,0.78)",fontFamily:"'Space Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{item.essential&&<span style={{fontSize:9,color:"#FFD93D",marginRight:3}}>★</span>}{item.optional&&<span style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginRight:2}}>~</span>}{item.name||"Unnamed"}</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {parseFloat(item.weight)>0&&<span style={{fontSize:13,color:"rgba(255,255,255,0.45)",fontFamily:"monospace"}}>{(parseFloat(item.weight)*wM).toFixed(1)}{unit}</span>}
                {parseFloat(item.cost)>0&&<span style={{fontSize:13,color:"rgba(255,217,61,0.55)",fontFamily:"monospace"}}>${item.cost}</span>}
                <span style={{fontSize:13,color:(BAG_C[item.bag]||"rgba(255,159,67,0.6)")+"aa",fontFamily:"monospace"}}>{item.bag}</span>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
              <div style={{padding:"2px 8px",borderRadius:20,border:`1px solid ${item.owned?"rgba(105,240,174,0.25)":"rgba(196,87,30,0.28)"}`,fontSize:11,fontWeight:600,color:item.owned?"rgba(105,240,174,0.75)":"rgba(196,87,30,0.7)",letterSpacing:1,whiteSpace:"nowrap"}}>{item.owned?"OWNED":"NEED"}</div>
              <div style={{width:16,height:16,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",transform:open?"rotate(180deg)":"none",display:"inline-block",transition:"transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>▼</span>
              </div>
            </div>
          </div>
        </div>
        {open&&(
          <div style={{padding:"12px 16px 16px 44px",background:"rgba(0,0,0,0.25)",borderTop:`1px solid ${catColor}15`,animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)",display:"flex",flexDirection:"column",gap:10}}>
            <input value={item.name} onChange={e=>updateItem(item.id,"name",e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:7,color:"#FFF",fontSize:12,padding:"8px 10px",fontFamily:"'Space Mono',monospace",outline:"none",width:"100%",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} placeholder="Item name" onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{label:"WT (lbs)",f:"weight"},{label:"COST ($)",f:"cost"},{label:"VOL (L)",f:"volume"}].map(({label,f})=>(
                <div key={f}><div style={{fontSize:9,color:"rgba(255,159,67,0.65)",letterSpacing:1,marginBottom:3,fontFamily:"monospace"}}>{label}</div><input value={item[f]} onChange={e=>updateItem(item.id,f,e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:5,color:"#FFD93D",fontSize:12,padding:"6px 8px",outline:"none",fontFamily:"monospace",width:"100%",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/></div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {BAGS.map(b=><button key={b} onClick={()=>updateItem(item.id,"bag",b)} style={{padding:"4px 8px",borderRadius:8,border:`1px solid ${item.bag===b?BAG_C[b]||"#FF9F43":"rgba(255,255,255,0.35)"}`,background:item.bag===b?"rgba(255,255,255,0.07)":"transparent",color:item.bag===b?BAG_C[b]||"#FF9F43":"rgba(255,255,255,0.45)",fontSize:10,cursor:"pointer",fontFamily:"monospace",fontWeight:item.bag===b?700:400}}>{b}</button>)}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>toggleOwned(item.id)} style={{flex:1,padding:"9px 8px",borderRadius:7,border:`1px solid ${item.owned?"rgba(105,240,174,0.4)":"rgba(196,87,30,0.4)"}`,background:item.owned?"rgba(105,240,174,0.08)":"rgba(169,70,29,0.1)",color:item.owned?"#69F0AE":"#FF9F43",fontSize:13,cursor:"pointer",fontFamily:"monospace",fontWeight:700,whiteSpace:"nowrap"}}>{item.owned?"✓ OWNED":"MARK OWNED"}</button>
              <button onClick={()=>removeItem(item.id)} style={{padding:"8px 12px",borderRadius:7,border:"1px solid rgba(255,107,107,0.3)",background:"rgba(255,107,107,0.06)",color:"rgba(255,107,107,0.7)",fontSize:13,cursor:"pointer",fontFamily:"monospace",fontWeight:700}}>✕</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Category Tile ─────────────────────────────────────────────
  function CatCard({cat,idx}) {
    const catItems=itemsForCat(cat.id);
    const ownedInCat=catItems.filter(i=>i.owned).length;
    const catW=catItems.reduce((s,i)=>s+(parseFloat(i.weight)||0),0)*wM;
    const catCost=catItems.reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
    const needCount=catItems.filter(i=>!i.owned).length;
    const needCost=catItems.filter(i=>!i.owned).reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
    const pct=catItems.length>0?Math.round((ownedInCat/catItems.length)*100):0;
    return(
      <div onClick={()=>{setActiveCategory(cat);setPackView('category');}}
        style={{background:'rgba(255,255,255,0.015)',border:`1.5px solid rgba(255,255,255,0.16)`,borderTop:`1.5px solid ${cat.color}65`,borderRadius:12,padding:'14px 16px',marginBottom:8,cursor:'pointer',display:'flex',flexDirection:'column',gap:8,animation:`fadeUp 0.3s ease ${idx*0.05}s both`}}
        onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.035)'}
        onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.015)'}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:24}}>{cat.icon}</span>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:'#E8DCC8',letterSpacing:'0.06em',fontFamily:"'Space Mono',monospace"}}>{cat.label.toUpperCase()}</span>
          <span style={{fontSize:14,fontWeight:700,color:cat.color}}>{pct}%</span>
          <span style={{fontSize:14,color:'rgba(255,255,255,0.30)',marginLeft:6}}>›</span>
        </div>
        <div style={{display:'flex',gap:12,fontSize:14,color:'rgba(255,255,255,0.45)',fontFamily:"'Space Mono',monospace"}}>
          <span>{catItems.length} items</span>
          <span>·</span>
          <span style={{color:cat.color}}>{catW.toFixed(1)}{unit}</span>
          <span style={{marginLeft:'auto',color:'#FFD93D'}}>{needCount>0?`$${Math.round(needCost)} still needed`:'✓ all owned'}</span>
        </div>
        <div style={{height:3,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${cat.color}66,${cat.color})`,borderRadius:2,transition:'width 0.5s ease',boxShadow:`0 0 8px ${cat.color}90`}}/>
        </div>
      </div>
    );
  }

  // ─── Category Detail Page ──────────────────────────────────────
  function CategoryDetailPage({cat,onBack}) {
    const catItems=itemsForCat(cat.id);
    const ownedInCat=catItems.filter(i=>i.owned).length;
    const catW=catItems.reduce((s,i)=>s+(parseFloat(i.weight)||0),0)*wM;
    const catCost=catItems.reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
    return(
      <div style={{display:'flex',flexDirection:'column',flex:1,overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',padding:'16px',gap:12,borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0,background:'rgba(10,4,0,0.95)',position:'sticky',top:0,zIndex:10}}>
          <button onClick={onBack} style={{background:'none',border:'none',color:'#FF9F43',fontSize:22,cursor:'pointer',padding:'0 8px 0 0',lineHeight:1,minWidth:32,minHeight:44,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>‹ <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",letterSpacing:2,opacity:0.60}}>PACK LIST</span></button>
          <span style={{fontSize:18}}>{cat.icon}</span>
          <span style={{flex:1,fontSize:16,fontWeight:600,color:'#FFFFFF',fontFamily:"'Space Mono',monospace"}}>{cat.label}</span>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.45)',fontFamily:"'Space Mono',monospace"}}>{ownedInCat}/{catItems.length}</span>
        </div>
        {/* Subheader */}
        <div style={{display:'flex',gap:16,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.45)',fontFamily:"'Space Mono',monospace"}}><span style={{color:cat.color,fontWeight:700}}>{catW.toFixed(1)}{unit}</span> total weight</span>
          {catCost>0&&<span style={{fontSize:11,color:'rgba(255,255,255,0.45)',fontFamily:"'Space Mono',monospace"}}><span style={{color:'#FFD93D',fontWeight:700}}>${catCost.toLocaleString()}</span> total cost</span>}
        </div>
        {/* Item list */}
        <div style={{flex:1,padding:'8px 16px 24px'}}>
          {catItems.map((item,i)=><PackItemRow key={item.id} item={item} catColor={cat.color} isLast={i===catItems.length-1}/>)}
          {catItems.length===0&&<div style={{textAlign:'center',padding:'40px 0'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,159,67,0.45)'}}>No items yet. Add one below.</div></div>}
          <div style={{marginTop:12,display:'flex',justifyContent:'center'}}>
            <button onClick={()=>addItemToCat(cat.id)} style={{padding:'10px 32px',borderRadius:20,border:`1px dashed ${cat.color}55`,background:'transparent',color:`${cat.color}88`,fontSize:12,cursor:'pointer',fontFamily:"'Space Mono',monospace",letterSpacing:1.5,fontWeight:700}} onMouseOver={e=>{e.currentTarget.style.background=`${cat.color}12`;e.currentTarget.style.color=cat.color;}} onMouseOut={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=`${cat.color}88`;}}>+ ADD ITEM</button>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{fontFamily:"'Space Mono',monospace",background:"radial-gradient(ellipse at 50% 0%,rgba(255,159,67,0.10) 0%,transparent 55%) no-repeat fixed,#150F0A",minHeight:"100vh",color:"#FFF",display:"flex",flexDirection:"column",animation:"consoleIn 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
      <WorldMapBackground phases={tripData?.phases||[]} console="pack"/>
      <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',flex:1,minHeight:'100vh'}}>
      {showOnboard&&<OnboardCard storageKey="pack" ctaLabel="✦ BUILD MY PACK" onDismiss={()=>setShowOnboard(false)}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:4,color:"rgba(255,159,67,0.75)",marginBottom:10}}>PACK CONSOLE</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:700,fontStyle:"italic",color:"#FF9F43",lineHeight:1.2,marginBottom:10}}>One bag. Everything you need.</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.65)",lineHeight:1.7}}>Your gear list is built for this specific expedition. Here's how to make it yours.</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:4}}>
          {[
            {icon:"📦",label:"PACK LIST",color:"#FF9F43",desc:"Full gear list by category. Expand sections, check off what you own, edit weights and volumes."},
            {icon:"✨",label:"REFINE",color:"#69F0AE",desc:"Co-Architect suggestions based on your destinations and travel style. Add what fits, skip what doesn't."},
            {icon:"📊",label:"BREAKDOWN",color:"#A29BFE",desc:"Visual weight and volume breakdown across every bag category."},
            {icon:"🛒",label:"NEED TO BUY",color:"#00E5FF",desc:"Focused list of items you haven't checked off yet. Your pre-trip shopping list."},
          ].map(t=>(
            <div key={t.label} style={{display:"flex",gap:8,alignItems:"flex-start",padding:isMobile?"6px 8px":"8px 10px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:`1px solid ${t.color}44`}}>
              <span style={{fontSize:isMobile?13:14,flexShrink:0,marginTop:1}}>{t.icon}</span>
              <div style={{minWidth:0}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:isMobile?10:11,fontWeight:700,letterSpacing:2,color:t.color}}>{t.label}</span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:isMobile?10:11,color:"rgba(255,255,255,0.65)",marginLeft:5}}>{t.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:14,padding:"9px 12px",borderRadius:9,background:"rgba(255,159,67,0.06)",border:"1px solid rgba(255,159,67,0.2)",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>🎒</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,159,67,0.8)",lineHeight:1.5}}>Carry-on limit: <strong>15 lbs · 45L volume</strong> — every item counts.</span>
        </div>
        <div style={{marginTop:14,fontFamily:"'Fraunces',serif",fontSize:12,fontStyle:"italic",color:"rgba(255,217,61,0.55)",textAlign:"center",lineHeight:1.6}}>Pack light. Pack right. Built for your exact route.</div>
      </OnboardCard>}
      {!showOnboard&&showCoach&&<CoachOverlay storageKey="pack" accentColor="#FF9F43" onDismiss={()=>setShowCoach(false)} steps={[
        {target:"pack-stats",title:"Weight & Volume",body:"Track your bag weight and volume against carry-on limits."},
        {target:"pack-filters",title:"Filter by Category",body:"Tap a category to focus. Use 'Need to Buy' to see what's missing."},
        {target:"pack-first-cat",title:"Your Gear",body:"Expand a category, tap an item to edit. Check the box when you own it."}
      ]}/>}
      {/* Header */}
      {!isFullscreen&&<ConsoleHeader console="pack" isMobile={isMobile} onTripConsole={onExpedition} onPackConsole={()=>{}}/>}
      {/* Console switcher */}
      {!isFullscreen&&!isMobile&&<div style={{display:"flex",border:"1px solid rgba(255,255,255,0.10)",borderTop:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.03)",flexShrink:0}}>
        <div onClick={onExpedition} style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",borderRight:"1px solid rgba(196,87,30,0.2)",opacity:0.55}} onMouseOver={e=>{e.currentTarget.style.background="rgba(0,229,255,0.06)";e.currentTarget.style.opacity="1";}} onMouseOut={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.opacity="0.55";}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"rgba(0,229,255,0.4)"}}/>
          <span style={{fontSize:isMobile?11:13,fontWeight:700,color:"rgba(0,229,255,0.6)",letterSpacing:isMobile?0:1,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>TRIP CONSOLE</span>
        </div>
        <div style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"rgba(196,87,30,0.06)",borderBottom:"2px solid #FF9F43"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#FF9F43",boxShadow:"0 0 6px rgba(196,87,30,0.8)",animation:"launchPulse 2.5s ease-in-out infinite"}}/>
          <span style={{fontSize:isMobile?11:13,fontWeight:700,color:"#FF9F43",letterSpacing:isMobile?0:1,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>PACK CONSOLE</span>
        </div>
      </div>}
      {/* Hero rings */}
      {!isFullscreen&&<div data-coach="pack-stats">
        <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,0.08)',position:'relative',boxShadow:'inset 0 1px 0 rgba(255,159,67,0.40),inset 1px 0 0 rgba(255,159,67,0.12),inset -1px 0 0 rgba(255,159,67,0.12),inset 0 -1px 0 rgba(255,159,67,0.06)'}}>
          {/* LBS/KG toggle pill above weight ring */}
          <div style={{position:'absolute',top:10,left:'25%',transform:'translateX(-50%)',zIndex:1}}>
            <div onClick={()=>setUnit(u=>u==="lbs"?"kg":"lbs")} style={{display:'flex',borderRadius:20,border:'1px solid rgba(77,159,255,0.35)',overflow:'hidden',cursor:'pointer',background:'rgba(0,8,20,0.8)'}}>
              {["lbs","kg"].map(u=><div key={u} style={{padding:'3px 10px',fontSize:10,fontWeight:700,background:unit===u?'rgba(77,159,255,0.25)':'transparent',color:unit===u?'#4D9FFF':'rgba(77,159,255,0.35)',fontFamily:"'Space Mono',monospace",letterSpacing:1,borderLeft:u==="kg"?'1px solid rgba(77,159,255,0.2)':'none'}}>{u.toUpperCase()}</div>)}
            </div>
          </div>
          <CircularRing value={parseFloat((bpW*wM).toFixed(1))} max={wLim} label="MAIN BAG" sublabel="carry-on limit" color="#4D9FFF" unit={unit}/>
          <div style={{width:'1px',background:'rgba(255,255,255,0.06)',flexShrink:0}}/>
          <CircularRing value={parseFloat(bpV.toFixed(1))} max={VL} label="MAIN BAG" sublabel="volume limit" color="#FF9F43" unit="L"/>
        </div>
        {/* 4 mini stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,width:"100%",padding:'10px 12px'}}>
          {[{label:"PERSONAL BAG",value:(gbW*wM).toFixed(1)+unit,color:"#64B4FF"},{label:"GEAR READY",value:gearPct+"%",color:"#A29BFE"},{label:"STILL NEED",value:"$"+Math.round(neededCost).toLocaleString(),color:"#FFD93D"},{label:"TOTAL ITEMS",value:items.length,color:"#FF9F43"}].map(s=>(
            <div key={s.label} style={{background:"rgba(0,0,0,0.25)",border:`1.5px solid ${s.color}55`,borderTop:`1.5px solid ${s.color}99`,borderRadius:7,padding:"7px 8px",textAlign:"center",boxShadow:`0 0 12px ${s.color}30, inset 0 1px 0 ${s.color}55`}}>
              <div style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,0.4)",letterSpacing:0,marginBottom:2,fontFamily:"'Space Mono',monospace",lineHeight:1.2}}>{s.label}</div>
              <div style={{fontSize:isMobile?12:18,fontWeight:600,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>}
      {/* Built-for strip */}
      {!isFullscreen&&pp&&(()=>{
        const getClimateAdvisory=(climate,season)=>{const map={'tropical-hot':{dry:{label:'Tropical',advice:'Pack light — reef-safe sunscreen essential'},wet:{label:'Tropical Wet',advice:'Quick-dry everything — waterproof your gear'},default:{label:'Tropical',advice:'Pack light, breathable fabrics only'}},'tropical-wet':{default:{label:'Tropical Wet',advice:'Quick-dry everything — waterproof your gear'}},'temperate-cool':{default:{label:'Temperate',advice:'Layer up — mornings cold, afternoons warm'}},'cold-alpine':{default:{label:'Alpine Cold',advice:'Warm layers essential — windproof shell critical'}},'mediterranean':{default:{label:'Mediterranean',advice:'Light clothing + one smart dinner outfit'}},'desert-hot':{default:{label:'Desert',advice:'UV protection critical — cover up at midday'}},'varied':{default:{label:'Mixed Climate',advice:'Pack for range — layers are your friend'}}};return map[climate]?.[season]||map[climate]?.default||{label:'Varied',advice:'Check conditions per destination'};};
        const ca=pp.climate?getClimateAdvisory(pp.climate,pp.season):null;
        return <div style={{padding:"6px 16px",background:"rgba(255,159,67,0.04)",borderBottom:"1px solid rgba(255,159,67,0.12)",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:"rgba(255,159,67,0.7)",flexShrink:0}}>✦</span>
            <span style={{fontSize:isMobile?10:11,color:"rgba(255,255,255,0.55)",fontFamily:"'Space Mono',monospace",letterSpacing:0.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Built for: {tripData.tripName||"Your Trip"} · {totalNights}n · {pp.tripType}{coupleMode?" · for 2":""}</span>
          </div>
          {ca&&<div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,paddingLeft:17}}>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.6)",fontFamily:"'Space Mono',monospace",letterSpacing:0.5,whiteSpace:"nowrap"}}>🌡 {ca.label}{pp.tempRange?" · "+pp.tempRange:""}</span>
            <span style={{fontSize:10,fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"rgba(255,159,67,0.5)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ca.advice}</span>
          </div>}
        </div>;
      })()}
      {/* Tab bar */}
      <div style={{display:"flex",alignItems:"stretch",background:"rgba(12,5,0,0.98)",borderBottom:"1px solid rgba(196,87,30,0.2)",position:"relative"}}>
        {packSaveFlash&&<div style={{position:"absolute",right:12,top:4,fontFamily:"'Space Mono',monospace",fontSize:13,color:"#69F0AE",opacity:0.80,letterSpacing:1,zIndex:2,pointerEvents:"none",transition:"opacity 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>&#10003; saved</div>}
        <button onClick={()=>setFullscreen(f=>!f)} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"10px 14px",background:isFullscreen?"rgba(255,159,67,0.15)":"rgba(255,159,67,0.06)",border:"none",borderRight:"1px solid rgba(196,87,30,0.3)",cursor:"pointer",flexShrink:0,color:"#FFD93D"}}>
          <span style={{fontSize:isMobile?13:15,lineHeight:1}}>{isFullscreen?"⊡":"⛶"}</span>
          <span style={{fontSize:isMobile?9:15,letterSpacing:1,fontWeight:700,whiteSpace:"nowrap"}}>{isFullscreen?"EXIT":"EXPAND"}</span>
        </button>
        {[{id:"pack",label:isMobile?"PACK":"PACK LIST",emoji:"🎒"},{id:"refine",label:"REFINE",emoji:"✦"},{id:"weight",label:isMobile?"WEIGHT":"BREAKDOWN",emoji:"⚖️"}].map(t=>(
          <button key={t.id} onClick={()=>{setPackTab(t.id);if(t.id!=="pack"){setPackView('dashboard');setActiveCategory(null);}}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:"10px 4px",background:"none",border:"none",borderBottom:packTab===t.id?"2px solid #FF9F43":"2px solid transparent",color:packTab===t.id?"#FF9F43":"rgba(255,255,255,0.55)",cursor:"pointer",fontFamily:"'Space Mono',monospace",position:"relative"}}>
            {t.emoji&&<span style={{fontSize:isMobile?13:15,lineHeight:1}}>{t.emoji}</span>}
            <span style={{fontSize:isMobile?12:13,letterSpacing:isMobile?0:1,fontWeight:700,whiteSpace:"nowrap"}}>{t.label}</span>
            {t.id==="refine"&&suggestions.length>0&&<div style={{position:"absolute",top:6,right:"20%",width:7,height:7,borderRadius:"50%",background:"#4D9FFF",boxShadow:"0 0 8px #4D9FFF"}}/>}
          </button>
        ))}
      </div>
      {/* Need to Buy pill (retained as a standalone shortcut) */}
      {packTab==="pack"&&packView==="dashboard"&&<div data-coach="pack-filters" style={{display:"flex",padding:"8px 16px",borderBottom:"1px solid rgba(169,70,29,0.2)",background:"rgba(10,4,0,0.8)",flexShrink:0}}>
        <button onClick={()=>setFilterCat(f=>f==="needtobuy"?"all":"needtobuy")} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 16px",borderRadius:20,border:"1px solid "+(filterCat==="needtobuy"?"rgba(255,107,107,0.85)":"rgba(255,107,107,0.25)"),background:filterCat==="needtobuy"?"rgba(255,107,107,0.18)":"transparent",cursor:"pointer",whiteSpace:"nowrap",minHeight:34,boxShadow:filterCat==="needtobuy"?"0 0 10px rgba(255,107,107,0.30)":"none",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          <span style={{fontSize:13}}>{filterCat==="needtobuy"?"←":"🛒"}</span>
          <span style={{fontSize:11,color:filterCat==="needtobuy"?"#FF6B6B":"rgba(255,107,107,0.6)",fontFamily:"'Space Mono',monospace",fontWeight:filterCat==="needtobuy"?700:400,letterSpacing:1}}>{filterCat==="needtobuy"?"ALL ITEMS":"NEED TO BUY"}</span>
        </button>
      </div>}
      {/* Main content */}
      {packTab==="pack"&&packView==="category"&&activeCategory&&(
        <CategoryDetailPage cat={activeCategory} onBack={()=>{setPackView('dashboard');setActiveCategory(null);}}/>
      )}
      {packTab==="pack"&&packView==="dashboard"&&(
        <div style={{overflowY:"auto",flex:1,padding:"12px 16px 32px"}}>
          {filterCat==="needtobuy"?(()=>{
            const unowned=[...items].filter(i=>!i.owned).sort((a,b)=>(parseFloat(b.cost)||0)-(parseFloat(a.cost)||0));
            const total=unowned.reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
            const CAT_COLORS_NTB={docs:"#E0E0E0",tech:"#00D4FF",clothes:"#FFD93D",health:"#69F0AE",travel:"#55EFC4",creator:"#FF9F43",dive:"#00E5FF"};
            return(<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,padding:"10px 14px",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(255,107,107,0.22)",borderRadius:10}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,color:"rgba(255,107,107,0.85)",letterSpacing:2,fontWeight:700,fontFamily:"'Space Mono',monospace"}}>🛒 NEED TO BUY</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>{unowned.length} item{unowned.length!==1?"s":""} · sorted by cost</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:"#FF6B6B",fontFamily:"'Space Mono',monospace"}}>${total.toLocaleString()}</div>
                  <div style={{fontSize:10,color:"rgba(255,107,107,0.55)",letterSpacing:1,whiteSpace:"nowrap"}}>TOTAL TO SPEND</div>
                </div>
              </div>
              {unowned.length===0?(<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:28,marginBottom:12}}>✅</div><div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontStyle:"italic",color:"rgba(105,240,174,0.75)"}}>You own everything!</div></div>):(
                <div style={{display:"flex",flexDirection:"column",gap:0,borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)"}}>
                  {unowned.map((item,i)=>{
                    const c=CAT_COLORS_NTB[item.cat]||"#FF9F43";
                    const running=unowned.slice(0,i+1).reduce((s,x)=>s+(parseFloat(x.cost)||0),0);
                    return(<div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:i%2===0?"rgba(18,5,0,0.9)":"rgba(10,3,0,0.9)",borderBottom:i<unowned.length-1?"1px solid rgba(255,255,255,0.06)":"none",borderLeft:`3px solid ${c}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#FFF",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>{item.name}</div>
                        <div style={{fontSize:10,color:`${c}99`,letterSpacing:1,marginTop:2,fontFamily:"monospace"}}>{item.cat?.toUpperCase()} · {item.bag}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#FFD93D",fontFamily:"monospace"}}>${parseFloat(item.cost||0).toLocaleString()}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.28)",fontFamily:"monospace"}}>running: ${running.toLocaleString()}</div>
                      </div>
                      <button onClick={()=>toggleOwned(item.id)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid rgba(105,240,174,0.3)",background:"rgba(105,240,174,0.06)",color:"#69F0AE",fontSize:11,cursor:"pointer",fontFamily:"monospace",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>GOT IT</button>
                    </div>);
                  })}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"rgba(255,107,107,0.08)",borderTop:"1px solid rgba(255,107,107,0.2)"}}>
                    <div style={{fontSize:11,color:"rgba(255,107,107,0.75)",letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700}}>TOTAL TO BUY</div>
                    <div style={{fontSize:20,fontWeight:900,color:"#FF6B6B",fontFamily:"'Space Mono',monospace"}}>${total.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>);
          })():<>
            {pp&&!packExplainerDismissed&&<div style={{background:"rgba(0,8,20,0.6)",border:"1px solid rgba(255,159,67,0.3)",borderLeft:"3px solid #FF9F43",borderRadius:10,padding:"10px 13px",marginBottom:12,display:"flex",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"rgba(255,159,67,0.85)",letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:600,marginBottom:4}}>✦ Your pack list was built for this trip</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?12:13,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.7)",lineHeight:1.5}}>Gear selected for {tripData.tripName||"your trip"} — {pp.tripType}, {pp.duration}, {pp.climate?.replace(/-/g," ")}. Categories not relevant to your trip are hidden.</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4,fontFamily:"'Space Mono',monospace"}}>Tap "＋ Add gear categories" below to unlock everything.</div>
              </div>
              <button onClick={()=>{setPackExplainerDismissed(true);try{localStorage.setItem("1bn_pack_explainer_v1","1");}catch(e){}}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.8)",fontSize:14,cursor:"pointer",padding:"0 4px",flexShrink:0,lineHeight:1}}>✕</button>
            </div>}
            {CATS.map((cat,i)=>i===0?<div key={cat.id} data-coach="pack-first-cat"><CatCard cat={cat} idx={i}/></div>:<CatCard key={cat.id} cat={cat} idx={i}/>)}
            {pp&&<>
              <button onClick={()=>setShowAddCats(o=>!o)} style={{width:"100%",padding:"10px 14px",marginTop:4,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.02)",color:"rgba(255,255,255,0.4)",fontSize:12,fontFamily:"'Space Mono',monospace",cursor:"pointer",letterSpacing:1,textAlign:"center",minHeight:40}}>＋ Add gear categories</button>
              {showAddCats&&<div style={{marginTop:8,padding:"10px 14px",background:"rgba(0,8,20,0.6)",border:"1px solid rgba(255,159,67,0.2)",borderRadius:10}}>
                <div style={{fontSize:10,color:"rgba(255,159,67,0.7)",letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700,marginBottom:8}}>HIDDEN CATEGORIES</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {ALL_CATS.filter(c=>!CATS.find(v=>v.id===c.id)).map(c=>(
                    <button key={c.id} onClick={()=>{const next=[...CATS.map(x=>x.id),c.id];setEnabledCats(next);}} style={{padding:"6px 12px",borderRadius:16,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"rgba(255,255,255,0.5)",fontSize:12,fontFamily:"'Space Mono',monospace",cursor:"pointer",display:"flex",alignItems:"center",gap:5,minHeight:32}}>
                      <span>{c.icon}</span>{c.label}
                    </button>
                  ))}
                  {ALL_CATS.filter(c=>!CATS.find(v=>v.id===c.id)).length===0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.35)",fontStyle:"italic"}}>All categories are visible</div>}
                </div>
              </div>}
            </>}
          </>}
          <div style={{textAlign:"center",marginTop:8,padding:"8px 0",borderTop:"1px solid rgba(169,70,29,0.12)"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.35)",letterSpacing:2}}>1 bag. travel light. · {(bpW*wM).toFixed(1)}{unit}</div>
          </div>
        </div>
      )}
      {packTab==="refine"&&(
        <div style={{overflowY:"auto",flex:1,padding:"12px 16px"}}>
          <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.15),rgba(255,217,61,0.05))",border:"1px solid rgba(169,70,29,0.35)",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
            <button onClick={()=>{const next=!packBriefCollapsed;setPackBriefCollapsed(next);if(next)try{localStorage.setItem(briefKey,"1");}catch(e){}}} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"none",border:"none",cursor:"pointer"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"#FF9F43",letterSpacing:2,fontWeight:700}}>✦ CO-ARCHITECT PACK BRIEF</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'Space Mono',monospace"}}>{packBriefCollapsed?"▼":"▲"}</div>
            </button>
            <div style={{maxHeight:packBriefCollapsed?0:400,overflow:"hidden",transition:"max-height 0.28s ease-out"}}>
              <div style={{padding:"0 12px 12px"}}>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic",color:"rgba(255,255,255,0.80)",lineHeight:1.7,marginBottom:10}}>{getPackBrief(pp,tripData)||`Reviewing your pack for a ${goalLabel} trip across ${countries.slice(0,3).join(", ")}${countries.length>3?" +"+(countries.length-3)+" more":""} — ${totalNights} nights.`}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.55)",letterSpacing:1,marginBottom:8}}>Built for: {tripData?.tripName||"your expedition"} · {totalNights} nights · {pp?.tripType||goalLabel} · {pp?.climate?.replace(/-/g," ")||"mixed"}</div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{tripTypes.map(t=><span key={t} style={{fontSize:11,color:"rgba(255,159,67,0.85)",background:"rgba(169,70,29,0.18)",border:"1px solid rgba(169,70,29,0.35)",borderRadius:10,padding:"3px 9px",letterSpacing:1,fontWeight:700}}>{TI[t]||"🗺️"} {t}</span>)}</div>
              </div>
            </div>
          </div>
          {suggestLoading&&<div>
            <div style={{textAlign:"center",padding:"20px 20px 16px"}}>
              <div style={{position:"relative",width:52,height:52,margin:"0 auto 14px"}}>
                <div style={{position:"absolute",inset:-6,borderRadius:"50%",border:"1.5px solid rgba(255,159,67,0.5)",animation:"amberPulse 1.8s ease-in-out infinite"}}/>
                <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(169,70,29,0.12)",border:"1px solid rgba(255,159,67,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,animation:"logoPulse 2s ease-in-out infinite"}}>✦</div>
              </div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,0.85)",marginBottom:4}}>Analyzing your trip and current pack...</div>
              <div style={{fontSize:10,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>{tripData.tripName||"your expedition"} · {totalNights}N · {pp?.climate?.replace(/-/g," ")||"mixed"}</div>
            </div>
            {[0,1,2].map(i=><div key={i} style={{borderRadius:12,marginBottom:9,background:"rgba(18,8,0,0.85)",border:"1px solid rgba(255,255,255,0.06)",padding:"14px 12px",animation:`shimmer 1.5s ease-in-out infinite ${i*0.2}s`}}>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <div style={{width:70,height:14,borderRadius:6,background:"rgba(255,159,67,0.12)"}}/>
                <div style={{width:50,height:14,borderRadius:6,background:"rgba(255,255,255,0.06)"}}/>
              </div>
              <div style={{width:"80%",height:13,borderRadius:6,background:"rgba(255,255,255,0.06)",marginBottom:8}}/>
              <div style={{width:"60%",height:12,borderRadius:6,background:"rgba(255,255,255,0.04)"}}/>
            </div>)}
          </div>}
          {!suggestLoading&&suggestions.length>0&&<div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:"rgba(255,159,67,0.9)",letterSpacing:3,marginBottom:12,fontWeight:700}}>SUGGESTED FOR YOUR TRIP</div>
            {suggestions.map(s=>{
              const CAT_COLORS_P={docs:"#E0E0E0",tech:"#00D4FF",clothes:"#FFD93D",health:"#69F0AE",travel:"#55EFC4",creator:"#FF9F43",dive:"#00E5FF",adventure:"#55EFC4",safari:"#FFD93D",moto:"#FF6B6B",work:"#A29BFE"};
              const c=CAT_COLORS_P[s.cat]||"#FF9F43";
              const isEssential=s.priority==="essential"||s.essential;
              return(<div key={s.id} style={{borderRadius:12,marginBottom:9,background:"rgba(18,8,0,0.85)",border:"1px solid "+(isEssential?"rgba(255,159,67,0.4)":"rgba(255,255,255,0.08)"),animation:"fadeUp 0.4s ease"}}>
                <div style={{padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        {isEssential?<span style={{fontSize:11,color:"#FF9F43",background:"rgba(255,159,67,0.18)",border:"1px solid rgba(255,159,67,0.4)",borderRadius:6,padding:"2px 8px",letterSpacing:1.5,fontWeight:700,fontFamily:"'Space Mono',monospace"}}>ESSENTIAL</span>:<span style={{fontSize:11,color:"rgba(105,240,174,0.85)",background:"rgba(105,240,174,0.1)",border:"1px solid rgba(105,240,174,0.3)",borderRadius:6,padding:"2px 8px",letterSpacing:1.5,fontWeight:700,fontFamily:"'Space Mono',monospace"}}>RECOMMENDED</span>}
                        <span style={{fontSize:11,color:c,background:c+"14",border:`1px solid ${c}44`,borderRadius:6,padding:"2px 8px",letterSpacing:1,fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{s.cat}</span>
                      </div>
                      <div style={{fontSize:14,fontWeight:600,color:"#FFF",marginBottom:4}}>{s.name}</div>
                      <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,0.70)",lineHeight:1.6}}>{s.reason}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,fontFamily:"'Space Mono',monospace"}}>{s.cost>0&&<div style={{fontSize:12,fontWeight:700,color:"#FFD93D",marginBottom:3}}>~${s.cost}</div>}{s.weight>0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>~{s.weight}lb</div>}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>acceptSuggestion(s)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid rgba(105,240,174,0.5)",background:"rgba(105,240,174,0.08)",color:"#69F0AE",fontSize:13,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:700,minHeight:40}}>+ ADD TO PACK</button>
                    <button onClick={()=>dismissSuggestion(s.id)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"rgba(255,255,255,0.70)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Space Mono',monospace",minHeight:44}}>SKIP</button>
                  </div>
                </div>
              </div>);
            })}
          </div>}
          {!suggestLoading&&suggestions.length>0&&<div style={{textAlign:"center",paddingTop:8,marginBottom:12}}><button onClick={()=>{try{localStorage.removeItem(suggestCacheKey);}catch(e){}setSuggestions([]);setSuggestDone(false);setAccepted([]);genSuggestions(true);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.45)",fontSize:12,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,padding:"6px 12px"}} onMouseOver={e=>e.currentTarget.style.color="rgba(255,255,255,0.70)"} onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,0.45)"}>↻ Refresh suggestions</button></div>}
          {!suggestLoading&&suggestions.length===0&&suggestDone&&<div style={{marginBottom:16}}>
            <div style={{textAlign:"center",padding:"24px 0 18px"}}>
              <div style={{fontSize:22,marginBottom:10,color:"#FF9F43"}}>✦</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,0.85)",marginBottom:5}}>{accepted.length>0?`${accepted.length} item${accepted.length>1?"s":""} added to your pack.`:"Your pack looks solid for this trip."}</div>
              <div style={{fontSize:10,color:"rgba(255,159,67,0.65)",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>Anything else? I'm here.</div>
            </div>
            <button onClick={()=>{try{localStorage.removeItem(suggestCacheKey);}catch(e){}setSuggestions([]);setSuggestDone(false);setAccepted([]);genSuggestions(true);}} style={{width:"100%",padding:10,borderRadius:8,border:"1px solid rgba(169,70,29,0.35)",background:"rgba(169,70,29,0.1)",color:"rgba(255,159,67,0.75)",fontSize:11,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,marginBottom:18,fontWeight:700}}>↺ REFRESH SUGGESTIONS</button>
          </div>}
          {suggestDone&&!suggestLoading&&<div style={{borderTop:"1px solid rgba(196,87,30,0.25)",paddingTop:16}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontStyle:"italic",fontWeight:300,color:"#FFD93D",marginBottom:12,lineHeight:1.4}}>Refine packing list with your co-architect</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:12,maxHeight:220,overflowY:"auto"}}>
              {chat.length===0&&<div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontStyle:"italic",color:"rgba(255,200,120,0.82)",lineHeight:1.7,padding:"4px 0"}}>"Need help staying under 15 lbs? Tell me and I'll refine your list."</div>}
              {chat.map((m,i)=>(
                <div key={i} style={{display:"flex",gap:7,flexDirection:m.role==="user"?"row-reverse":"row"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:m.role==="ai"?"#A9461D":"#1a2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{m.role==="ai"?"✦":"M"}</div>
                  <div style={{borderRadius:9,padding:"8px 11px",fontSize:15,color:"#FFF",lineHeight:1.65,maxWidth:"86%",background:m.role==="ai"?"rgba(169,70,29,0.22)":"rgba(255,255,255,0.08)",border:`1px solid ${m.role==="ai"?"rgba(169,70,29,0.5)":"rgba(255,255,255,0.14)"}`}}>{m.text}</div>
                </div>
              ))}
              {chatLoading&&<div style={{fontSize:15,color:"rgba(169,70,29,0.75)",animation:"shimmer 1s infinite",padding:"4px 0",letterSpacing:1}}>✦ thinking...</div>}
              <div ref={chatEnd}/>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {["Keep me under 15 lbs","I do laundry weekly","Add rain gear","Pack for heat"].map(p=><button key={p} onClick={()=>setChatInput(p)} style={{padding:"6px 12px",borderRadius:14,border:"1px solid rgba(196,87,30,0.35)",background:"rgba(169,70,29,0.12)",color:"rgba(255,159,67,0.9)",fontSize:15,cursor:"pointer",fontFamily:"monospace",whiteSpace:"nowrap",fontWeight:700}}>{p}</button>)}
            </div>
            <div style={{display:"flex",gap:7}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendChat();}} placeholder="Ask anything about your pack..." style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:8,color:"#FFF",fontSize:15,padding:"11px 14px",fontFamily:"monospace",outline:"none",minHeight:44,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
              <button onClick={sendChat} style={{background:"rgba(169,70,29,0.25)",border:"1px solid rgba(196,87,30,0.45)",borderRadius:8,color:"#FF9F43",fontSize:16,padding:"8px 14px",cursor:"pointer",minWidth:44,minHeight:44,fontWeight:700}}>↑</button>
            </div>
          </div>}
        </div>
      )}
      {packTab==="weight"&&(
        <div style={{overflowY:"auto",flex:1,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
            <button onClick={()=>setUnit(u=>u==="lbs"?"kg":"lbs")} style={{fontSize:15,color:"rgba(255,159,67,0.85)",background:"rgba(169,70,29,0.12)",border:"1px solid rgba(169,70,29,0.35)",borderRadius:6,padding:"7px 16px",cursor:"pointer",fontFamily:"monospace",letterSpacing:1,fontWeight:700}}>SWITCH TO {unit==="lbs"?"KG":"LBS"}</button>
          </div>
          {["Backpack","Global Briefcase","Worn","Digital"].map(bagName=>{
            const bagItems=items.filter(i=>i.bag===bagName);
            const bagW=bagItems.reduce((s,i)=>s+(parseFloat(i.weight)||0),0)*wM;
            const bagV=bagName==="Backpack"?bpV:0;
            const isOver=bagName==="Backpack"&&bagW>wLim;
            const bagColor=bagName==="Backpack"?"#69F0AE":bagName==="Global Briefcase"?"#A29BFE":bagName==="Worn"?"#FFD93D":"#69F0AE";
            return(
              <div key={bagName} style={{background:"rgba(18,8,0,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:14,fontWeight:600,color:bagColor,letterSpacing:0.5}}>{bagName}</div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:20,fontWeight:900,color:isOver?"#FF6B6B":bagColor,letterSpacing:-1,lineHeight:1}}>{bagW.toFixed(1)}<span style={{fontSize:15,fontWeight:400,opacity:0.8}}> {unit}</span></div>
                    {bagName==="Backpack"&&<div style={{fontSize:15,color:"#FFD93D",marginTop:1,fontWeight:700}}>{bagV.toFixed(1)}L / {VL}L</div>}
                  </div>
                </div>
                {bagName==="Backpack"&&<div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",marginBottom:11}}><div style={{height:"100%",background:isOver?"linear-gradient(90deg,#4D9FFF88,#FF6B6B)":"linear-gradient(90deg,rgba(77,159,255,0.5),#4D9FFF)",borderRadius:2,width:Math.min(bagW/wLim*100,100)+"%",transition:"width 0.5s ease"}}/></div>}
                {bagItems.length===0?<div style={{fontSize:15,color:"rgba(255,255,255,0.35)",textAlign:"center",padding:"10px 0"}}>No items</div>
                :bagItems.sort((a,b)=>(parseFloat(b.weight)||0)-(parseFloat(a.weight)||0)).map(item=>(
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <div style={{fontSize:13,color:item.owned?"rgba(255,255,255,0.7)":"#FFF",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.owned?"✓ ":""}{item.name}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.65)",flexShrink:0,marginLeft:8,fontWeight:700}}>{parseFloat(item.weight)>0?(parseFloat(item.weight)*wM).toFixed(2)+unit:"—"}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {(()=>{try{return localStorage.getItem("1bn_hide_all_tips")!=="1";}catch(e){return true;}})()&&<div style={{padding:"12px 16px",textAlign:"center"}}><button onClick={()=>{try{localStorage.setItem("1bn_hide_all_tips","1");}catch(e){}setShowCoach(false);setShowOnboard(false);setPackExplainerDismissed(true);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.40)",fontSize:10,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,padding:"6px 12px"}} onMouseOver={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"} onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,0.40)"}>Hide all tips</button></div>}
      {isMobile&&!isFullscreen&&packView==="dashboard"&&<div style={{height:"calc(64px + env(safe-area-inset-bottom))"}}/>}
      {isMobile&&!isFullscreen&&<div style={{opacity:packView==="dashboard"?1:0,pointerEvents:packView==="dashboard"?"auto":"none",transition:"opacity 0.35s cubic-bezier(0.25,0.46,0.45,0.94)"}}><BottomNav activeTab="pack" onTab={t=>{if(t==="pack")return;if(onGoToTab)onGoToTab(t);else onExpedition();}}/></div>}
      </div>
    </div>
  );
}


// ─── Root App ─────────────────────────────────────────────────────
export default function App() {
  const isNewFromLanding=(()=>{try{return new URLSearchParams(window.location.search).get("new")==="true";}catch(e){return false;}})();
  const [screen,setScreen]=useState(isNewFromLanding?"dream":"console");
  const [appData,setAppData]=useState(null);
  const [fullscreen,setFullscreen]=useState(false);
  const [prefilledVision,setPrefilledVision]=useState("");
  const [pendingTab,setPendingTab]=useState("next");
  const [segmentSuggestions,setSegmentSuggestions]=useState(null);
  const [suggestionsLoading,setSuggestionsLoading]=useState(false);
  const [slideDir,setSlideDir]=useState(null);
  const [prevScreen,setPrevScreen]=useState(null);
  const slideTimerRef=useRef(null);
  const slideScreen=useCallback((to)=>{
    setScreen(prev=>{
      if((prev==="console"&&to==="pack")||(prev==="pack"&&to==="console")){
        const dir=to==="pack"?"left":"right";
        setPrevScreen(prev);setSlideDir(dir);
        if(slideTimerRef.current)clearTimeout(slideTimerRef.current);
        slideTimerRef.current=setTimeout(()=>{setPrevScreen(null);setSlideDir(null);},520);
      }
      return to;
    });
  },[]);

  useEffect(()=>{
    // Version bump — clears stale pack data; purges legacy booking keys (arch #3)
    const VER="1bn_v5_r5";
    try{
      if(localStorage.getItem("1bn_pack_version")!==VER){
        localStorage.removeItem("1bn_pack_v5");
        localStorage.removeItem("1bn_bookings");        // legacy — purged
        localStorage.removeItem("1bn_bookingDetails"); // legacy — purged
        localStorage.setItem("1bn_pack_version",VER);
      }
    }catch(e){}
    // Data integrity check
    try{const td=localStorage.getItem("1bn_tripData_v5");if(td){const p=JSON.parse(td);if(!p?.phases||!Array.isArray(p.phases))console.warn("[1BN] Trip data structure invalid — phases missing or not array");}}catch(e){console.warn("[1BN] Trip data parse error:",e);}
    try{const sd=localStorage.getItem("1bn_seg_v2");if(sd){const p=JSON.parse(sd);if(typeof p!=="object"||Array.isArray(p))console.warn("[1BN] Segment data structure invalid — expected object");}}catch(e){console.warn("[1BN] Segment data parse error:",e);}
    try{const pk=localStorage.getItem("1bn_pack_v5");if(pk){const p=JSON.parse(pk);if(!Array.isArray(p))console.warn("[1BN] Pack data structure invalid — expected array");}}catch(e){console.warn("[1BN] Pack data parse error:",e);}
  },[]);

  const [tripData,setTripData]=useState(()=>{
    try{
      const params=new URLSearchParams(window.location.search);
      if(params.get("new")==="true"){
        localStorage.removeItem("1bn_tripData_v5");localStorage.removeItem("1bn_seg_v2");localStorage.removeItem("1bn_intel");localStorage.removeItem("1bn_pack_v5");
        window.history.replaceState({},"","/");
        return null;
      }
      const t=localStorage.getItem("1bn_tripData_v5");if(t){const p=JSON.parse(t);if(p?.phases?.length>0)return p;}
    }catch(e){}
    return MICHAEL_EXPEDITION;
  });
  useEffect(()=>{try{if(tripData)localStorage.setItem("1bn_tripData_v5",JSON.stringify(tripData));}catch(e){};},[tripData]);

  // Load saved segment suggestions on mount
  useEffect(()=>{
    try{
      const saved=localStorage.getItem(SUGGEST_KEY);
      if(saved){
        const parsed=JSON.parse(saved);
        const currentId=tripData?.tripName||tripData?.vision?.slice(0,30)||"expedition";
        if(parsed.tripId&&(parsed.tripId===currentId||parsed.tripId===tripData?.tripName)&&parsed.suggestions?.length){
          setSegmentSuggestions(parsed.suggestions);
        }
      }
    }catch(e){}
  },[tripData?.tripName]);

  async function generateSegmentSuggestions(td){
    const tripId=td?.tripName||td?.vision?.slice(0,30)||"expedition";
    if(!td?.phases?.length){console.warn('[1BN] Cannot generate suggestions — tripData incomplete');return;}
    console.log('[1BN] Generating suggestions for:',tripId,'phases:',td.phases.length);
    setSuggestionsLoading(true);
    try{
      const prompt=buildSegmentSuggestionsPrompt(td,td.travelerProfile);
      const raw=await askAI(prompt,4000);
      const m=raw.match(/\{[\s\S]*\}/);
      if(!m)throw new Error("No JSON");
      const parsed=JSON.parse(m[0]);
      localStorage.setItem(SUGGEST_KEY,JSON.stringify({tripId,generated:Date.now(),suggestions:parsed.phases}));
      setSegmentSuggestions(parsed.phases);
    }catch(e){
      console.warn('[1BN] Segment suggestions failed silently:',e);
    }
    setSuggestionsLoading(false);
  }

  function handleLoadDemo(){try{const preserve=["1bn_coach_v1","1bn_onboard_v1","1bn_pack_explainer_v1","1bn_phase_hint_shown","1bn_hide_all_tips"];const saved={};preserve.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)saved[k]=v;});localStorage.clear();Object.entries(saved).forEach(([k,v])=>localStorage.setItem(k,v));}catch(e){}setTripData(MICHAEL_EXPEDITION);setScreen("console");}
  function handleGoGen(data,vd){setAppData({...data,visionData:vd});setScreen("gen");}
  function handleGenComplete(){setScreen("coarchitect");}
  function handleLaunch(hd){posthog.capture("trip_console_launched",{total_budget:hd?.totalBudget,nights:hd?.totalNights,phases:hd?.phases?.length});try{localStorage.removeItem("1bn_pack_v5");localStorage.removeItem("1bn_pack_cats_v1");}catch(e){}setTripData(hd);setScreen("handoff");generateSegmentSuggestions(hd);}
  function handleReviseLaunch(hd){setTripData(hd);setScreen("handoff");}
  function handleHandoffComplete(){setScreen("console");}
  function handleRevise(){
    const revData={vision:tripData.visionNarrative||"My expedition",tripName:tripData.tripName||"My Expedition",city:tripData.departureCity||"",date:tripData.startDate||"",budgetMode:"dream",budgetAmount:"",selectedGoal:tripData.goalLabel||"custom",
      visionData:{phases:(tripData.phases||[]).map(p=>({destination:p.name||p.destination||"",country:p.country||"",type:p.type||"Exploration",nights:p.nights||7,flag:p.flag||"🌍",why:p.why||""})),narrative:tripData.visionNarrative||"",vibe:tripData.visionVibe||"",highlight:tripData.visionHighlight||"",totalNights:(tripData.phases||[]).reduce((s,p)=>s+p.nights,0),totalBudget:(tripData.phases||[]).reduce((s,p)=>s+(p.budget||p.cost||0),0),countries:[...new Set((tripData.phases||[]).map(p=>p.country))].length}};
    setAppData({...revData,isRevision:true});setScreen("coarchitect");
  }
  function handleNewTrip(){
    setScreen("dream");setAppData(null);setSegmentSuggestions(null);
    try{localStorage.removeItem("1bn_tripData_v5");localStorage.removeItem("1bn_seg_v2");localStorage.removeItem("1bn_pack_v5");localStorage.removeItem("1bn_pack_cats_v1");localStorage.removeItem(SUGGEST_KEY);localStorage.removeItem(DISMISS_KEY);}catch(e){}
  }
  function handleHomecoming(){setScreen("homecoming");}
  function handlePlanNext(){
    const name=tripData?.tripName||"my expedition";
    setPrefilledVision(`I just completed ${name}. Now I want to `);
    try{localStorage.removeItem("1bn_tripData_v5");localStorage.removeItem("1bn_seg_v2");localStorage.removeItem("1bn_pack_v5");localStorage.removeItem("1bn_pack_cats_v1");}catch(e){}
    setAppData(null);setScreen("dream");
  }

  return(
    <>
      <style>{CSS}</style>
      {screen==="dream"       && <DreamScreen onGoGen={handleGoGen} onLoadDemo={handleLoadDemo} prefilledVision={prefilledVision}/>}
      {screen==="gen"         && <GenerationScreen onComplete={handleGenComplete}/>}
      {screen==="coarchitect" && appData && <CoArchitect data={appData} visionData={appData.visionData} onLaunch={appData.isRevision?handleReviseLaunch:handleLaunch} onBack={()=>setScreen(appData.isRevision?"console":"dream")}/>}
      {screen==="handoff"     && tripData && <HandoffScreen tripData={tripData} onComplete={handleHandoffComplete}/>}
      {screen==="homecoming"  && tripData && <HomecomingScreen tripData={tripData} onPlanNext={handlePlanNext}/>}
      {(screen==="console"||prevScreen==="console") && tripData && <div style={{position:prevScreen==="console"||slideDir?"fixed":"relative",inset:prevScreen==="console"||slideDir?0:undefined,width:"100%",zIndex:prevScreen==="console"?0:1,animation:prevScreen==="console"?(slideDir==="left"?"consoleSlideOutLeft 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards":"consoleSlideOutRight 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards"):screen==="console"&&slideDir?(slideDir==="right"?"consoleSlideInLeft 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards":"consoleSlideInRight 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards"):"none",overflow:"hidden"}}><MissionConsole tripData={tripData} onNewTrip={handleNewTrip} onRevise={handleRevise} onPackConsole={()=>{setPendingTab("next");slideScreen("pack");}} onHomecoming={handleHomecoming} isFullscreen={fullscreen} setFullscreen={setFullscreen} initialTab={pendingTab} segmentSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading}/></div>}
      {(screen==="pack"||prevScreen==="pack") && <div style={{position:prevScreen==="pack"||slideDir?"fixed":"relative",inset:prevScreen==="pack"||slideDir?0:undefined,width:"100%",zIndex:prevScreen==="pack"?0:1,animation:prevScreen==="pack"?(slideDir==="right"?"consoleSlideOutRight 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards":"consoleSlideOutLeft 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards"):screen==="pack"&&slideDir?(slideDir==="left"?"consoleSlideInRight 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards":"consoleSlideInLeft 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards"):"none",overflow:"hidden"}}><PackConsole tripData={tripData} onExpedition={()=>slideScreen("console")} onGoToTab={t=>{setPendingTab(t||"next");slideScreen("console");}} isFullscreen={fullscreen} setFullscreen={setFullscreen}/></div>}
    </>
  );
}
