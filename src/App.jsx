import { useState, useEffect, useRef } from "react";
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
const CAT_DOT_COLORS = ["#00E5FF","#69F0AE","#FFD93D","#FF9F43","#A29BFE","#FF6B6B"];

// ─── Storage: 1bn_seg_v2 only ────────────────────────────────────
const SEG_KEY = "1bn_seg_v2";
const loadSeg = () => { try { const s=localStorage.getItem(SEG_KEY); return s?JSON.parse(s):{}; } catch(e) { return {}; } };
const saveSeg = d => { try { localStorage.setItem(SEG_KEY,JSON.stringify(d)); } catch(e) {} };

// ─── Utils ───────────────────────────────────────────────────────
const fmt = n => "$"+Math.round(n).toLocaleString();
const daysBetween = (d1,d2) => Math.round((new Date(d2)-new Date(d1))/86400000);
const urgencyColor = d => d<0?"#fff":d<30?"#FF6B6B":d<60?"#FFD93D":d<90?"#FF9F43":"#69F0AE";
const fD  = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
const fDS = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"}) : "";

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
      color, country:g.country,
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

// ─── CSS ─────────────────────────────────────────────────────────
const CSS=`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,100;0,300;0,700;0,900;1,100;1,300;1,700;1,900&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0500}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes spinGlobe{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes glowPulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:0.85;transform:scale(1.04)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes launchPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,159,67,0.5)}50%{box-shadow:0 0 0 14px rgba(255,159,67,0)}}
@keyframes consolePulse{0%,100%{box-shadow:0 0 0 0 rgba(0,229,255,0.4)}50%{box-shadow:0 0 0 14px rgba(0,229,255,0)}}
@keyframes phaseIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes amberPulse{0%,100%{opacity:0.2;transform:scale(1)}50%{opacity:0.8;transform:scale(1.12)}}
@keyframes shimmer{0%,100%{opacity:0.5}50%{opacity:1}}
@keyframes shimmerBar{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes msgIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes logoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes ambientGlow{0%,100%{opacity:0.5}50%{opacity:0.9}}
@keyframes slideOpen{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}


  .dream-root,.mc-root,.build-root{font-size:18px}
  .dream-content{max-width:780px;padding:40px 52px 70px}
  .mc-content{padding:22px 36px}
  .g-label{font-size:16px}
  .g-desc{font-size:11px}
  .g-icon{font-size:28px}
  .sec-label{font-size:12px;letter-spacing:5px}
  .f-label{font-size:11px;letter-spacing:3px}
  .f-input{font-size:15px;padding:12px 16px}
  .vision-ta{font-size:15px;padding:16px 20px}
  .launch-btn{font-size:15px;padding:20px}
  .vibe-tag{font-size:11px;padding:6px 16px}
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
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#060A0F}::-webkit-scrollbar-thumb{background:#1a2d42;border-radius:2px}
.dream-root{font-family:'Space Mono',monospace;background:radial-gradient(ellipse at 20% 0%,#2d1200 0%,#1a0900 25%,#0d0500 55%,#060200 100%);min-height:100vh;color:#FFF;position:relative}
.dream-glow{position:fixed;top:-80px;left:50%;transform:translateX(-50%);width:700px;height:280px;background:radial-gradient(ellipse,rgba(169,70,29,0.4) 0%,rgba(255,217,61,0.07) 45%,transparent 70%);pointer-events:none;z-index:0;animation:glowPulse 7s ease-in-out infinite}
.dream-content{position:relative;z-index:1;padding:26px 20px 44px;max-width:720px;margin:0 auto}.mc-content{padding:20px 32px}.build-root,.mc-root{font-size:15px}.g-label{font-size:15px}.g-desc{font-size:10px}.launch-btn{font-size:15px}.sec-label{font-size:11px}.f-input{font-size:14px}.f-label{font-size:10px}}
.hero-cursor{color:#FFD93D;animation:blink 0.9s infinite}
.sec-label{font-size:12px;color:rgba(255,159,67,0.85);letter-spacing:4px;margin-bottom:13px;padding-bottom:7px;border-bottom:1px solid rgba(169,70,29,0.22)}
.goal-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:28px}
.g-card{position:relative;border-radius:12px;padding:13px 12px;cursor:pointer;transition:all 0.24s cubic-bezier(0.34,1.56,0.64,1);text-align:left;border:none;outline:none;overflow:hidden}
.g-card.off{background:linear-gradient(148deg,#B04E22,#8d3c18,#6d2c11);box-shadow:0 4px 18px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.07)}
.g-card.on{background:linear-gradient(148deg,#311400,#200e00,#150900);box-shadow:0 0 0 1.5px #FFD93D,0 0 28px rgba(255,217,61,0.22),0 6px 22px rgba(0,0,0,0.65);transform:translateY(-2px)}
.g-card.off:hover{transform:translateY(-3px)}
.g-icon{font-size:22px;margin-bottom:6px;display:block}
.g-label{font-family:'Fraunces',serif;font-size:13px;font-weight:700;margin-bottom:4px;line-height:1.2}
.g-card.off .g-label{color:#FFF}.g-card.on .g-label{color:#FFD93D}
.g-desc{font-size:12px;line-height:1.5}
.g-card.off .g-desc{color:rgba(255,255,255,0.78)}.g-card.on .g-desc{color:rgba(255,217,61,0.7)}
.vision-ta{width:100%;background:rgba(169,70,29,0.07);border:1px solid rgba(169,70,29,0.48);border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;font-family:'Space Mono',monospace;resize:none;outline:none;line-height:1.8;min-height:106px;transition:border-color 0.2s,box-shadow 0.2s;margin-bottom:6px}
.vision-ta::placeholder{color:rgba(255,255,255,0.27)}.vision-ta:focus{border-color:rgba(255,217,61,0.48);box-shadow:0 0 0 3px rgba(255,217,61,0.07)}
.f-label{font-size:12px;color:rgba(255,159,67,0.75);letter-spacing:2.5px}
.f-input{background:rgba(18,11,0,0.85);border:1px solid rgba(169,70,29,0.38);border-radius:9px;color:#FFF;font-size:12px;padding:9px 13px;font-family:'Space Mono',monospace;outline:none;width:100%;transition:border-color 0.2s}
.f-input:focus{border-color:rgba(255,217,61,0.42)}.f-input::placeholder{color:rgba(255,255,255,0.22)}
.launch-btn{width:100%;padding:17px;border-radius:14px;border:none;font-family:'Space Mono',monospace;font-size:13px;font-weight:700;letter-spacing:2.5px;cursor:pointer;position:relative;overflow:hidden;transition:all 0.3s}
.launch-btn.on{background:linear-gradient(135deg,#A9461D 0%,#C4571E 38%,#E06830 68%,#FF9F43 100%);color:#FFF;animation:launchPulse 2.8s ease-in-out infinite}
.launch-btn.on:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(169,70,29,0.65);animation:none}
.launch-btn.loading{background:linear-gradient(135deg,#6b2a0e,#8a3515,#6b2a0e);color:rgba(255,255,255,0.85);cursor:wait}
.narrative-card{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(169,70,29,0.14),rgba(255,217,61,0.04));border:2px solid #FFD93D;box-shadow:0 0 20px rgba(255,217,61,0.15);border-radius:16px;padding:22px;margin-bottom:18px;animation:fadeUp 0.5s ease}
.vibe-tag{background:rgba(169,70,29,0.22);border:1px solid rgba(169,70,29,0.55);border-radius:20px;padding:4px 12px;font-size:12px;color:#FFD93D;letter-spacing:2.5px}
.stat-card{background:#0C1520;border:1px solid #1a2535;border-radius:9px;padding:9px 7px;text-align:center}
.phase-row{display:flex;gap:10px;padding:12px 14px;background:#0C1520;border-radius:11px;align-items:flex-start;border-left:3px solid transparent}
.cta-build-btn{width:100%;padding:16px;border-radius:13px;border:none;background:linear-gradient(135deg,#A9461D 0%,#C4571E 38%,#69F0AE 100%);color:#060A0F;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:2.5px;font-family:'Space Mono',monospace;animation:consolePulse 2.8s ease-in-out infinite;transition:transform 0.2s}
.cta-build-btn:hover{transform:translateY(-2px);animation:none}
.build-root{font-family:'Space Mono',monospace;background:#060A0F;min-height:100vh;color:#FFF;display:flex;flex-direction:column}
.mc-root{font-family:'Space Mono',monospace;background:radial-gradient(ellipse at 20% 0%,#001830 0%,#000d1a 30%,#000810 60%,#030810 100%);min-height:100vh;color:#FFF;display:flex;flex-direction:column}
.mc-tab{background:none;border:none;cursor:pointer;padding:9px 12px;font-size:11px;letter-spacing:2px;white-space:nowrap;color:#FFF;border-bottom:2px solid transparent;transition:all 0.15s;font-family:'Space Mono',monospace;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center}
.mc-tab.active{color:#00E5FF;border-bottom-color:#00E5FF}
.mc-content{padding:14px 16px;overflow-y:auto;flex:1;min-height:0}
.intel-section{background:#0C1520;border:1px solid #1a2d42;border-radius:8px;padding:11px;margin-bottom:10px}
.intel-section-label{font-size:12px;letter-spacing:2px;margin-bottom:7px}
.street-card{display:flex;gap:9px;padding:9px 11px;background:rgba(0,0,0,0.25);border-radius:8px;margin-bottom:7px}
.loading-skeleton{height:13px;background:#111D2A;border-radius:4px;animation:shimmer 1.5s infinite;margin-bottom:8px}
.chat-bubble{border-radius:10px;padding:8px 10px;font-size:12px;color:#FFF;line-height:1.7;max-width:86%}
@media(max-width:599px){.dream-content{padding:18px 14px 40px}.goal-grid{gap:7px}.mc-content{padding:10px 12px}}`;

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
    {id:t+1, name:"Peak Design 45L Backpack",    cat:"travel", cost:299,weight:4.5, volume:45,  bag:"Backpack",         owned:true},
    {id:t+2, name:"Topo Design Global Briefcase", cat:"travel", cost:150,weight:2.2, volume:20,  bag:"Global Briefcase", owned:false},
    {id:t+3, name:"Matador Packable Daypack",     cat:"travel", cost:65, weight:0.4, volume:0.6, bag:"Backpack",         owned:true},
    {id:t+4, name:"Peak Design Camera Cube",      cat:"travel", cost:60, weight:0.7, volume:3,   bag:"Backpack",         owned:false},
    {id:t+5, name:"Peak Design Tech Pouch",       cat:"tech",   cost:60, weight:0.5, volume:1.5, bag:"Global Briefcase", owned:true},
    {id:t+10,name:"Peak Design (M) Packing Cube", cat:"clothes",cost:0,  weight:3.1, volume:8,   bag:"Backpack",         owned:true},
    {id:t+11,name:"Peak Design (S) Packing Cube", cat:"clothes",cost:0,  weight:0.2, volume:4,   bag:"Backpack",         owned:true},
    {id:t+12,name:"2 T-Shirts",                   cat:"clothes",cost:0,  weight:0.4, volume:0.5, bag:"Backpack",         owned:true},
    {id:t+13,name:"Huckberry Bamboo Sun Hoodie",  cat:"clothes",cost:75, weight:0.55,volume:0.8, bag:"Backpack",         owned:false},
    {id:t+14,name:"1 Button Shirt",               cat:"clothes",cost:50, weight:0.25,volume:0.4, bag:"Backpack",         owned:false},
    {id:t+15,name:"1 Lightweight Pants",          cat:"clothes",cost:0,  weight:0.45,volume:0.6, bag:"Backpack",         owned:true},
    {id:t+16,name:"1 Swim Shorts",                cat:"clothes",cost:0,  weight:0.2, volume:0.3, bag:"Backpack",         owned:true},
    {id:t+17,name:"2 Underwear",                  cat:"clothes",cost:0,  weight:0.1, volume:0.15,bag:"Backpack",         owned:true},
    {id:t+18,name:"2 Socks",                      cat:"clothes",cost:0,  weight:0.1, volume:0.15,bag:"Backpack",         owned:true},
    {id:t+19,name:"Unbound 2pk Bundle",           cat:"clothes",cost:280,weight:0.3, volume:0.4, bag:"Backpack",         owned:false},
    {id:t+20,name:"Flip Flops",                   cat:"clothes",cost:100,weight:0.4, volume:1.2, bag:"Backpack",         owned:true},
    {id:t+21,name:"2 Hats",                       cat:"clothes",cost:0,  weight:0.2, volume:0.8, bag:"Worn",             owned:true},
    {id:t+25,name:"Charging Cables",              cat:"tech",   cost:0,  weight:0.2, volume:0.3, bag:"Global Briefcase", owned:true},
    {id:t+26,name:"Universal Power Adapter",      cat:"tech",   cost:0,  weight:0.2, volume:0.35,bag:"Global Briefcase", owned:true},
    {id:t+27,name:"10k Power Bank",               cat:"tech",   cost:0,  weight:0.2, volume:0.4, bag:"Global Briefcase", owned:true},
    {id:t+31,name:"MacBook Pro",                  cat:"creator",cost:0,  weight:4.7, volume:1,   bag:"Global Briefcase", owned:true},
    {id:t+33,name:"GoPro Hero 10",                cat:"creator",cost:290,weight:0.4, volume:0.2, bag:"Global Briefcase", owned:true},
    {id:t+34,name:"DJI Mini Drone 2 SE",          cat:"creator",cost:350,weight:0.6, volume:0.6, bag:"Global Briefcase", owned:false},
    {id:t+35,name:"Samsung T7 SSD",               cat:"creator",cost:130,weight:0.12,volume:0.03,bag:"Global Briefcase", owned:false},
    {id:t+36,name:"Small Tripod",                 cat:"creator",cost:35, weight:0.3, volume:0.3, bag:"Backpack",         owned:false},
    {id:t+39,name:"Hollyland Lark M2 Lav Mic",   cat:"creator",cost:75, weight:0.1, volume:0.1, bag:"Global Briefcase", owned:true},
    {id:t+40,name:"iPhone 17",                    cat:"creator",cost:1500,weight:0.44,volume:0.1,bag:"Worn",             owned:false},
    {id:t+45,name:"Mask",                         cat:"dive",   cost:100,weight:0.5, volume:0.8, bag:"Backpack",         owned:false},
    {id:t+46,name:"Dive Computer",                cat:"dive",   cost:300,weight:0.2, volume:0.1, bag:"Backpack",         owned:false},
    {id:t+47,name:"Surface Marker Buoy",          cat:"dive",   cost:20, weight:0.35,volume:0.4, bag:"Backpack",         owned:false},
    {id:t+48,name:"Reef Hook",                    cat:"dive",   cost:15, weight:0.2, volume:0.2, bag:"Backpack",         owned:false},
    {id:t+49,name:"Mesh Dive Bag",                cat:"dive",   cost:20, weight:0.3, volume:0.3, bag:"Backpack",         owned:false},
    {id:t+50,name:"Mask Defog",                   cat:"dive",   cost:12, weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+51,name:"O-ring Kit",                   cat:"dive",   cost:8,  weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+52,name:"Zip Ties",                     cat:"dive",   cost:5,  weight:0.02,volume:0.02,bag:"Backpack",         owned:false},
    {id:t+60,name:"Peak Design Wash Pouch",       cat:"health", cost:0,  weight:0.4, volume:2,   bag:"Backpack",         owned:true},
    {id:t+61,name:"Toothbrush & Paste",           cat:"health", cost:0,  weight:0.15,volume:0.18,bag:"Backpack",         owned:true},
    {id:t+63,name:"Electric Razor Set",           cat:"health", cost:75, weight:0.3, volume:0.5, bag:"Backpack",         owned:true},
    {id:t+68,name:"Small First Aid Kit",          cat:"health", cost:0,  weight:0.35,volume:3,   bag:"Backpack",         owned:false},
    {id:t+69,name:"Anti-diarrheal Tablets",       cat:"health", cost:0,  weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+70,name:"Motion Sickness Pills",        cat:"health", cost:0,  weight:0.05,volume:0.05,bag:"Backpack",         owned:true},
    {id:t+80,name:"Passport",                     cat:"docs",   cost:200,weight:0.1, volume:0.1, bag:"Worn",             owned:true},
    {id:t+81,name:"Debit and Credit Cards",       cat:"docs",   cost:0,  weight:0.01,volume:0.01,bag:"Worn",             owned:true},
    {id:t+82,name:"Travel Insurance Docs",        cat:"docs",   cost:0,  weight:0,   volume:0,   bag:"Digital",          owned:false},
    {id:t+83,name:"International Drivers Permit", cat:"docs",   cost:0,  weight:0.01,volume:0.01,bag:"Global Briefcase", owned:true},
  ].map(i=>({...i,status:i.owned?"owned":"needed"}));
}

// ─── SharegoodLogo ────────────────────────────────────────────────
function SharegoodLogo({size=40,opacity=1,glowColor="rgba(169,70,29,0.5)",animate=true}) {
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0,animation:animate?"float 5s ease-in-out infinite":"none",filter:`drop-shadow(0 0 ${size*.25}px ${glowColor})`,opacity}}>
      <svg viewBox="50 50 1700 1650" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <circle cx="888.836" cy="883.65" r="835.885" fill="#000"/>
        <circle cx="888.837" cy="883.65" r="812.849" fill="#2954CC"/>
        <circle cx="888.836" cy="883.65" r="791.992" fill="#FFBF00"/>
        <circle cx="888.836" cy="883.65" r="779.997" fill="#A9461D"/>
        <circle cx="888.836" cy="883.65" r="632.011" fill="#FFBF00"/>
        <circle cx="888.836" cy="883.65" r="619.322" fill="#2954CC"/>
        <circle cx="888.837" cy="883.65" r="596.85"  fill="#67F0E9"/>
        <path fill="#0BB4B1" fillRule="evenodd" clipRule="evenodd" d="M1328.754,479.735c104.745,112.584,157.117,247.902,157.117,403.954c0,134.465-38.891,252.807-116.67,355.025c-4.126,5.415-8.361,10.786-12.706,16.11c-13.864,17.002-28.839,33.545-44.922,49.63c-1.927,1.927-5.861,5.843-7.8,7.741c-114.983,112.371-253.293,168.559-414.931,168.559c-144.074,0-269.647-46.645-376.72-135.93c-15.071-12.572-31.779-26.028-46.121-40.37c-18.094-18.114-34.778-36.801-50.052-56.06c-4.322-5.452-8.531-10.949-12.627-16.492c-12.909-17.475-23.681-35.395-34.318-53.762c-1.159-1.997-1.307-4-2.443-6.009c-21.871-38.778-39.811-79.618-51.817-122.525c-14.643-52.271-22.965-107.576-22.965-165.918c0-164.362,60.075-307.619,176.223-423.767c116.199-116.25,256.479-171.374,420.84-171.374c164.364,0,306.607,57.125,422.73,173.375C1317.448,467.796,1323.176,473.734,1328.754,479.735z"/>
        <path fill="#1a1a0a" fillRule="evenodd" clipRule="evenodd" d="M741.2,858.75c20.8-2.366,42.366-5.2,64.7-8.5c25.967,3.467,46.967,9.4,63,17.8c7.759,4.351,13.592,8.176,17.5,11.476v0.425c3.907-3.301,9.741-7.125,17.5-11.476c16.033-8.399,37.033-14.333,63-17.8c22.333,3.3,43.899,6.134,64.699,8.5c53.134,6,101.101,8.9,143.9,8.7c18.366-0.134,35.767-0.816,52.2-2.05c-7.268-4.4-24.167-18.45-50.7-42.15c42.833,24.2,83.366,42.217,121.6,54.05h-28.899c-5.2-0.467-12.268-0.383-21.2,0.25c-8.967,0.601-17.083,2.533-24.351,5.8c-8.166,3.667-17.866,9-29.1,16c-21.167,16.733-45.833,36.534-74,59.4c-2.434,1.967-4.883,3.95-7.35,5.95c-31.4,25-59.801,45.083-85.2,60.25c-25.434,15.167-52.434,27.149-81,35.95c-19.982,6.128-40.132,9.628-60.45,10.5c-20.318-0.872-40.468-4.372-60.45-10.5c-28.567-8.801-55.567-20.783-81-35.95c-25.4-15.167-53.8-35.25-85.2-60.25c-2.466-2-4.917-3.983-7.35-5.95c-28.167-22.866-52.833-42.667-74-59.4c-11.233-7-20.933-12.333-29.1-16c-7.267-3.267-15.384-5.199-24.35-5.8c-8.934-0.633-16-0.717-21.2-0.25h-28.9c38.233-11.833,78.767-29.85,121.6-54.05c-26.534,23.7-43.434,37.75-50.7,42.15c16.434,1.233,33.833,1.916,52.2,2.05C640.1,867.65,688.066,864.75,741.2,858.75z"/>
      </svg>
    </div>
  );
}

// ─── ConsoleHeader ────────────────────────────────────────────────
function ConsoleHeader({console:which,isMobile,rightSlot,children}) {
  const isDream=which==="dream", isTrip=which==="trip", isPack=which==="pack";
  const bg=isDream?"rgba(8,6,0,0.85)":isTrip?"rgba(0,8,20,0.92)":"rgba(20,8,0,0.95)";
  const bc=isDream?"rgba(169,70,29,0.45)":isTrip?"rgba(0,229,255,0.15)":"rgba(196,87,30,0.5)";
  const dot=isDream?"#C4571E":isTrip?"#00E5FF":"#C4571E";
  const sub=isDream?"#C4571E":isTrip?"#00E5FF":"#FF9F43";
  const sublabel=isDream?"DREAM CONSOLE":isTrip?"TRIP CONSOLE":"PACK CONSOLE";
  const dbSize=isMobile?(isDream?22:17):(isDream?36:26);
  const tlSize=isMobile?(isPack?22:17):(isPack?36:26);
  const dbColor=isDream?"#FFD93D":isTrip?"rgba(255,217,61,0.5)":"rgba(255,217,61,0.2)";
  const dbWeight=isDream?900:isTrip?700:300;
  const tlColor=isPack?"#FFD93D":isTrip?"rgba(255,217,61,0.65)":"#FFD93D";
  const tlShadow=isPack?"0 0 28px rgba(255,217,61,0.6)":isDream?"0 0 28px rgba(255,217,61,0.5)":"none";
  const logoGlow=isDream?"rgba(169,70,29,0.55)":isTrip?"rgba(0,229,255,0.35)":"rgba(196,87,30,0.5)";
  const radial=isDream?"rgba(169,70,29,0.4)":isTrip?"rgba(0,229,255,0.1)":"rgba(169,70,29,0.52)";
  const divLine=isDream?"rgba(255,217,61,0.5)":isTrip?"rgba(0,229,255,0.35)":"rgba(255,159,67,0.4)";
  return (
    <div style={{background:bg,borderBottom:`1px solid ${bc}`,backdropFilter:"blur(10px)",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",padding:isMobile?"7px 14px":"8px 16px",gap:10}}>
        <SharegoodLogo size={isMobile?36:44} opacity={0.88} glowColor={logoGlow} animate={isDream}/>
        <div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:15,fontWeight:700,color:"#FFF",letterSpacing:2,lineHeight:1}}>1 Bag Nomad</div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:dot,boxShadow:`0 0 5px ${dot}`}}/>
            <div style={{fontSize:12,fontWeight:700,color:sub,letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>{sublabel} · <span style={{fontFamily:"'Fraunces',serif",fontWeight:100,fontStyle:"italic",letterSpacing:1}}>Sharegood Co.</span></div>
          </div>
        </div>
        <div style={{flex:1}}/>{rightSlot}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:isMobile?10:28,padding:isMobile?"10px 14px":"14px 32px",borderTop:`1px solid ${bc}`,background:`linear-gradient(90deg,transparent,${isDream?"rgba(32,15,0,0.75)":isTrip?"rgba(0,20,45,0.65)":"rgba(40,16,0,0.65)"},transparent)`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"80%",height:80,background:`radial-gradient(ellipse,${radial} 0%,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:dbSize,fontWeight:dbWeight,color:dbColor,letterSpacing:isMobile?4:7,lineHeight:1,textShadow:isDream?"0 0 32px rgba(255,217,61,0.7),0 0 64px rgba(169,70,29,0.4)":"none",position:"relative",textTransform:"uppercase"}}>Dream Big</div>
        <div style={{width:1,height:isMobile?22:30,background:`linear-gradient(180deg,transparent,${divLine},transparent)`,flexShrink:0}}/>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:tlSize,fontWeight:isPack?300:100,fontStyle:"italic",color:tlColor,letterSpacing:isMobile?5:8,lineHeight:1,position:"relative",textShadow:tlShadow}}>travel light</div>
      </div>
      {children}
    </div>
  );
}

// ─── GenerationScreen ─────────────────────────────────────────────
function GenerationScreen({onComplete}) {
  const [ph,setPh]=useState(0),[prog,setProg]=useState(0),[mi,setMi]=useState(0);
  const msgs=["Reading your vision...","Mapping the route...","Calculating phases...","Bringing it to life..."];
  useEffect(()=>{
    const ts=[setTimeout(()=>setPh(1),400),setTimeout(()=>setMi(1),1800),setTimeout(()=>setMi(2),3600),setTimeout(()=>setMi(3),5400),setTimeout(()=>{setProg(100);onComplete?.();},7000)];
    return()=>ts.forEach(clearTimeout);
  },[]);
  useEffect(()=>{
    const iv=setInterval(()=>setProg(p=>Math.min(p+Math.random()*3+0.5,94)),100);
    setTimeout(()=>clearInterval(iv),6800); return()=>clearInterval(iv);
  },[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"radial-gradient(ellipse at 40% 30%,#2d1200 0%,#1a0900 30%,#0a0400 65%,#040100 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"5%",left:"50%",width:700,height:500,background:"radial-gradient(ellipse,rgba(169,70,29,0.5) 0%,transparent 65%)",animation:"ambientGlow 3s ease-in-out infinite",transform:"translateX(-50%)",pointerEvents:"none"}}/>
      <div style={{animation:"logoPulse 2.4s ease-in-out infinite",marginBottom:36,zIndex:1}}><SharegoodLogo size={200} animate={false} glowColor="rgba(169,70,29,0.52)" opacity={0.9}/></div>
      <div key={mi} style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:100,fontStyle:"italic",color:"rgba(255,255,255,0.92)",letterSpacing:1,marginBottom:10,animation:"fadeUp 0.5s ease",textAlign:"center",zIndex:1,opacity:ph>=1?1:0,transition:"opacity 0.6s ease"}}>{msgs[mi]}</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.5)",letterSpacing:3,marginBottom:40,textAlign:"center",zIndex:1}}>The co-architect is working its magic ✦</div>
      <div style={{width:260,zIndex:1}}>
        <div style={{height:3,background:"rgba(255,255,255,0.07)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:2,background:"linear-gradient(90deg,#A9461D,#FFD93D,#A9461D)",backgroundSize:"200% 100%",width:prog+"%",transition:"width 0.3s ease",animation:"shimmerBar 2s linear infinite"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:12,color:"rgba(255,255,255,0.2)",letterSpacing:2}}><span>BUILDING</span><span>{Math.round(prog)}%</span></div>
      </div>
    </div>
  );
}

// ─── DreamScreen ──────────────────────────────────────────────────
function DreamHeader({step}) {
  const isMobile=useMobile();
  const pills=<div style={{display:"flex",gap:5,alignItems:"center"}}>{[1,2,3,4].map(n=><div key={n} style={{width:n===step?28:18,height:6,borderRadius:3,background:n<step?"rgba(169,70,29,0.55)":n===step?"#FFD93D":"rgba(255,255,255,0.1)",boxShadow:n===step?"0 0 8px rgba(255,217,61,0.6)":"none",transition:"all 0.3s ease"}}/>)}</div>;
  return <ConsoleHeader console="dream" isMobile={isMobile} rightSlot={pills}/>;
}

function DreamScreen({onGoGen,onLoadDemo}) {
  const isMobile=useMobile();
  const [vision,setVision]=useState("");
  const [tripName,setTripName]=useState("");
  const [city,setCity]=useState("");
  const [date,setDate]=useState("");
  const [heroPhase,setHeroPhase]=useState(0);
  const [loading,setLoading]=useState(false);
  const [budgetMode,setBudgetMode]=useState("dream");
  const [budgetAmount,setBudgetAmount]=useState("");
  const [loadError,setLoadError]=useState(false);
  const [visionData,setVisionData]=useState(null);
  const [focused,setFocused]=useState(false);
  useEffect(()=>{
    const ts=[setTimeout(()=>setHeroPhase(1),400),setTimeout(()=>setHeroPhase(2),1200),setTimeout(()=>setHeroPhase(3),2100),setTimeout(()=>setHeroPhase(4),3000)];
    return()=>ts.forEach(clearTimeout);
  },[]);
  const canLaunch=vision.trim().length>20;
  async function handleReveal() {
    if(!canLaunch||loading)return;
    setLoading(true);setLoadError(false);
    const bl=budgetMode==="dream"?"NO BUDGET SET — set totalBudget to 0.":"Traveler budget: $"+(budgetAmount||"flexible");
    try {
      const raw=await askAI(`Elite travel co-architect. Vision:"${vision}". Trip:"${tripName||"My Expedition"}". From:"${city||"unknown"}". Date:"${date||"flexible"}". ${bl} Return ONLY valid JSON:{"narrative":"3 vivid sentences","vibe":"3 words separated by · ","phases":[{"destination":"City","country":"Country","nights":7,"type":"Culture","why":"one sentence","flag":"🌍"}],"totalNights":0,"totalBudget":0,"countries":0,"highlight":"most exciting moment","goalLabel":"inferred goal type"}`,1800);
      const parsed=parseJSON(raw);
      if(parsed) setVisionData({visionData:parsed,selectedGoal:"custom",vision,tripName:tripName||"My Expedition",city,date,budgetMode,budgetAmount});
      else{setLoadError(true);setLoading(false);}
    } catch(e){setLoadError(true);setLoading(false);}
  }
  if(visionData) return <VisionReveal data={visionData} onBuild={vd=>onGoGen(visionData,vd)} onBack={()=>{setVisionData(null);setLoading(false);}} freshMount={true}/>;
  return (
    <div className="dream-root">
      <div className="dream-glow"/>
      <DreamHeader step={1}/>
      <div className="dream-content">
        <div style={{textAlign:"center",marginBottom:isMobile?20:28,animation:"fadeUp 0.6s ease"}}>
          <span style={{fontSize:isMobile?36:46,display:"block",marginBottom:8,animation:"spinGlobe 14s linear infinite",filter:"drop-shadow(0 0 22px rgba(169,70,29,0.65))"}}>🌍</span>
          <div style={{minHeight:isMobile?80:110}}>
            {heroPhase>=1&&<div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?26:34,fontWeight:100,color:"rgba(255,255,255,0.88)",lineHeight:1.2,letterSpacing:2,animation:"slideUp 0.7s cubic-bezier(0.22,1,0.36,1) both"}}>Your expedition</div>}
            {heroPhase>=2&&<div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?26:34,fontWeight:300,color:"#FFF",lineHeight:1.2,letterSpacing:1,animation:"slideUp 0.7s cubic-bezier(0.22,1,0.36,1) both"}}>starts now.</div>}
            {heroPhase>=3&&<div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?28:36,fontWeight:300,fontStyle:"italic",color:"#FFD93D",lineHeight:1.25,marginTop:8,letterSpacing:3,animation:"slideUp 0.8s cubic-bezier(0.22,1,0.36,1) both"}}>Let's go.</div>}
          </div>
          {heroPhase>=4&&<p style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?12:13,fontWeight:100,fontStyle:"italic",color:"#FFD93D",lineHeight:1.6,marginTop:10,animation:"fadeUp 0.8s ease both"}}>Every expedition starts with a feeling — tell me what's driving yours.</p>}
        </div>
        <div style={{marginBottom:28}}>
          <div className="sec-label">WHAT'S <span style={{color:"#FFD93D",fontWeight:900}}>YOUR</span> VISION?</div>
          <textarea className="vision-ta" value={vision} onChange={e=>setVision(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Pour it all out — the places that call to you, what you need to feel, who you want to become." rows={isMobile?5:6} style={{border:focused?"1px solid rgba(255,217,61,0.55)":"1px solid rgba(169,70,29,0.48)",boxShadow:focused?"0 0 0 3px rgba(255,217,61,0.08)":"none"}}/>
          {canLaunch&&<div style={{marginTop:8,fontFamily:"'Fraunces',serif",fontSize:11,fontStyle:"italic",color:"rgba(105,240,174,0.6)",animation:"fadeUp 0.4s ease"}}>✦ Your co-architect is ready to build this.</div>}
        </div>
        <div className="sec-label">EXPEDITION DETAILS</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:10}}>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">JOURNEY NAME</div><input className="f-input" value={tripName} onChange={e=>setTripName(e.target.value)} placeholder="My Grand Expedition"/></div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}><div className="f-label">DEPARTS FROM</div><input className="f-input" value={city} onChange={e=>setCity(e.target.value)} placeholder="Los Angeles, CA"/></div>
        </div>
        <div style={{marginBottom:22,display:"flex",flexDirection:"column",gap:5}}><div className="f-label">TARGET START DATE</div><input type="date" className="f-input" value={date} onChange={e=>setDate(e.target.value)}/></div>
        <div style={{marginBottom:22}}>
          <div className="f-label" style={{marginBottom:10}}>BUDGET APPROACH</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {[{id:"dream",icon:"💭",label:"Build the dream",sub:"We'll figure budget later"},{id:"rough",icon:"💰",label:"I have a rough number",sub:"Give me a ballpark"},{id:"strict",icon:"🎯",label:"Keep it under...",sub:"I have a firm limit"}].map(b=>(
              <button key={b.id} onClick={()=>setBudgetMode(b.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 13px",borderRadius:9,border:"1px solid "+(budgetMode===b.id?"rgba(255,217,61,0.5)":"rgba(169,70,29,0.52)"),background:budgetMode===b.id?"rgba(255,217,61,0.06)":"rgba(169,70,29,0.05)",cursor:"pointer",textAlign:"left",transition:"all 0.2s",minHeight:44}}>
                <span style={{fontSize:16}}>{b.icon}</span>
                <div><div style={{fontSize:11,fontWeight:700,color:budgetMode===b.id?"#FFD93D":"#FFF"}}>{b.label}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:2}}>{b.sub}</div></div>
                <div style={{marginLeft:"auto",width:14,height:14,borderRadius:"50%",border:"1.5px solid "+(budgetMode===b.id?"#FFD93D":"rgba(255,255,255,0.2)"),background:budgetMode===b.id?"rgba(255,217,61,0.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {budgetMode===b.id&&<div style={{width:6,height:6,borderRadius:"50%",background:"#FFD93D"}}/>}
                </div>
              </button>
            ))}
          </div>
          {(budgetMode==="rough"||budgetMode==="strict")&&<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}><div className="f-label">{budgetMode==="strict"?"MAX BUDGET ($)":"ROUGH BUDGET ($)"}</div><input className="f-input" type="number" value={budgetAmount} onChange={e=>setBudgetAmount(e.target.value)} placeholder={budgetMode==="strict"?"e.g. 15000":"e.g. 20000"}/></div>}
        </div>
        <button className={"launch-btn "+(loading?"loading":canLaunch?"on":"off")} onClick={handleReveal} style={{minHeight:54,cursor:loading?"wait":canLaunch?"pointer":"default"}}>
          {loading?"✨  BUILDING YOUR EXPEDITION...":"🚀  BUILD MY EXPEDITION"}
        </button>
        {loadError&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.3)",textAlign:"center",fontSize:12,color:"#FF6B6B",letterSpacing:1}}>Connection issue — tap to try again</div>}
        <div style={{textAlign:"center",marginTop:30,paddingTop:20,borderTop:"1px solid rgba(169,70,29,0.14)"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:11,fontWeight:300,fontStyle:"italic",color:"rgba(255,217,61,0.28)",letterSpacing:2}}>Dream Big. Travel Light.</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.12)",letterSpacing:3,marginTop:5}}>A SHAREGOOD COMPANY</div>
          <button onClick={onLoadDemo} style={{marginTop:16,background:"none",border:"1px solid rgba(255,217,61,0.25)",borderRadius:8,color:"rgba(255,217,61,0.5)",fontSize:12,padding:"10px 16px",cursor:"pointer",letterSpacing:2,fontFamily:"'Space Mono',monospace",width:"100%",minHeight:44}}>
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
  useEffect(()=>{if(freshMount){const t=setTimeout(()=>setMounted(true),50);return()=>clearTimeout(t);}});
  useEffect(()=>{
    let i=0;const txt=vd.narrative||"";
    const t=setTimeout(()=>{
      const iv=setInterval(()=>{i++;setNarrative(txt.slice(0,i));if(i>=txt.length){clearInterval(iv);setNarrativeDone(true);setTimeout(()=>setShowStats(true),200);setTimeout(()=>setShowPhases(true),500);}},13);
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
        const iv=setInterval(()=>{i++;setNarrative(txt.slice(0,i));if(i>=txt.length){clearInterval(iv);setNarrativeDone(true);setTimeout(()=>setShowStats(true),200);setTimeout(()=>setShowPhases(true),500);}},13);
      } else setRefineInput("⚠ Couldn't apply — try rephrasing");
    }catch(e){setRefineInput("⚠ Connection issue");}
    setLoading(false);
  }
  return (
    <div className="dream-root" style={{opacity:mounted?1:0,transition:"opacity 0.5s ease"}}>
      <div className="dream-glow"/>
      <DreamHeader step={2}/>
      <div style={{padding:"22px 18px 44px",maxWidth:640,margin:"0 auto",position:"relative",zIndex:10}}>
        <div className="narrative-card">
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"90%",height:"130%",background:"radial-gradient(ellipse,rgba(169,70,29,0.22) 0%,transparent 68%)",pointerEvents:"none"}}/>
          <div style={{fontSize:9,color:"#C4571E",letterSpacing:3,marginBottom:12,position:"relative"}}>✦ YOUR EXPEDITION VISION</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:15,fontWeight:300,fontStyle:"italic",color:"#FFF",lineHeight:1.85,position:"relative",minHeight:80}}>"{narrative}{!narrativeDone&&<span className="hero-cursor">|</span>}"</div>
          {narrativeDone&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:14,position:"relative"}}>{(vd.vibe||"").split(" · ").filter(Boolean).map((w,i)=><span key={i} className="vibe-tag">{w}</span>)}</div>}
        </div>
        {showStats&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16,animation:"fadeUp 0.5s ease"}}>
            {[{label:"COUNTRIES",value:vd.countries,color:"#00E5FF"},{label:"PHASES",value:vd.phases?.length,color:"#FFD93D"},{label:"NIGHTS",value:vd.totalNights,color:"#A29BFE"},{label:"BUDGET",value:fmt(vd.totalBudget||0),color:"#FF9F43"}].map(s=>(
              <div key={s.label} className="stat-card"><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",letterSpacing:1.5,marginBottom:4}}>{s.label}</div><div style={{fontSize:isMobile?14:16,fontWeight:700,color:s.color}}>{s.value}</div></div>
            ))}
          </div>
        )}
        {narrativeDone&&vd.highlight&&<div style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.18)",borderRadius:11,padding:"14px 16px",marginBottom:18}}><div style={{fontSize:9,color:"#00E5FF",letterSpacing:2.5,marginBottom:7}}>⚡ EXPEDITION HIGHLIGHT</div><div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:300,fontStyle:"italic",color:"#FFF",lineHeight:1.7}}>{vd.highlight}</div></div>}
        {showPhases&&(
          <div style={{animation:"fadeUp 0.5s ease"}}>
            <div style={{fontSize:9,color:"rgba(255,159,67,0.8)",letterSpacing:4,marginBottom:12,paddingBottom:7,borderBottom:"1px solid rgba(169,70,29,0.2)"}}>YOUR EXPEDITION PHASES</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {vd.phases?.map((p,i)=>{
                const c=TC[p.type]||"#FFD93D";
                return(<div key={i} className="phase-row" style={{borderLeftColor:c,background:`linear-gradient(90deg,${c}08,#0C1520)`,animation:`phaseIn 0.4s ease ${i*.07}s both`}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:`${c}18`,border:`1px solid ${c}44`,color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0,marginTop:1}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#FFF"}}>{p.flag||"🌍"} {p.destination}</span>
                      <span style={{fontSize:9,color:c}}>{TI[p.type]||"✈️"} {p.type}</span>
                      <span style={{fontSize:9,color:"rgba(255,255,255,0.38)",marginLeft:"auto"}}>🌙 {p.nights}n</span>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.75)",marginBottom:3,letterSpacing:0.5}}>{p.country}</div>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:11,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.88)",lineHeight:1.5}}>{p.why}</div>
                  </div>
                </div>);
              })}
            </div>
            <div style={{background:"#0C1520",border:"1px solid #1a2535",borderRadius:13,padding:14,marginBottom:18}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.9)",letterSpacing:2,marginBottom:10}}>💬 REFINE YOUR VISION</div>
              {loading&&<div style={{fontSize:12,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",marginBottom:8}}>✨ refining...</div>}
              <div style={{display:"flex",gap:7}}>
                <input style={{flex:1,background:"#080D14",border:"1px solid #1a2535",borderRadius:8,color:"#FFF",fontSize:isMobile?12:10,padding:isMobile?"11px":"9px 11px",fontFamily:"'Space Mono',monospace",outline:"none"}} value={refineInput} onChange={e=>setRefineInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")refine();}} placeholder="Swap a destination, adjust duration..."/>
                <button style={{background:"rgba(169,70,29,0.2)",border:"1px solid rgba(169,70,29,0.4)",borderRadius:8,color:"#FFD93D",fontSize:14,padding:"8px 12px",cursor:"pointer",minWidth:44,minHeight:44}} onClick={refine}>↑</button>
              </div>
            </div>
            <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.1),rgba(255,217,61,0.04))",border:"1px solid rgba(169,70,29,0.4)",borderRadius:16,padding:22,textAlign:"center"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?18:20,fontWeight:300,color:"#FFF",marginBottom:6,lineHeight:1.3}}>This is your <em style={{color:"#FFD93D"}}>expedition.</em></div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.88)",letterSpacing:1,marginBottom:20,lineHeight:1.8}}>Does this feel right? Refine above until it does.<br/>When your gut says yes — it's time to build.</div>
              <button className="cta-build-btn" style={{minHeight:52,opacity:launching?0.7:1}} onClick={()=>{if(!launching){setLaunching(true);onBuild(vd);}}}>
                {launching?"✨  Building...":"✅  YES — BUILD THIS EXPEDITION"}
              </button>
              <button style={{marginTop:10,background:"none",border:"1px solid #1a2535",borderRadius:8,color:"rgba(255,255,255,0.3)",fontSize:9,padding:"7px 14px",cursor:"pointer",fontFamily:"'Space Mono',monospace",width:"100%",minHeight:44}} onClick={onBack}>{data.isRevision?"← BACK TO CONSOLE":"← START OVER"}</button>
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
  const [items,setItems]=useState(()=>(visionData.phases||[]).map((p,i)=>({id:i,destination:p.destination,country:p.country,type:p.type||"Exploration",nights:p.nights||7,cost:estCost(p.destination,p.country,p.type,p.nights||7),flag:p.flag||"🌍",color:colors[i%8]})));
  const [startDate,setStartDate]=useState(data.date||"2026-09-16");
  const [chat,setChat]=useState([{role:"ai",text:data.isRevision?"Welcome back — let's revise your expedition. ✏️\n\nYour itinerary is loaded. Tell me what you'd like to change.":"Welcome — I'm your expedition co-architect. ✨\n\nYour vision is incredible and I'm genuinely excited to help you build it.",isWelcome:true}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const chatEnd=useRef(null);
  const goalLabel=GOAL_PRESETS.find(g=>g.id===data.selectedGoal)?.label||"expedition";
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
      const raw=await askAI(`Co-architect. Goal:"${goalLabel}". Vision:"${data.vision}". ${data.budgetMode!=="dream"?"Budget:"+data.budgetAmount+".":"No budget."} Items:${JSON.stringify(items.map(i=>({id:i.id,destination:i.destination,nights:i.nights,type:i.type})))} Traveler:"${msg}" Return ONLY valid JSON:{"response":"warm 2-3 sentences","changes":[{"id":0,"field":"nights","value":7}]}`,550);
      const parsed=parseJSON(raw);
      if(parsed){setChat(p=>[...p,{role:"ai",text:parsed.response}]);if(parsed.changes?.length)setItems(p=>{let u=[...p];parsed.changes.forEach(c=>{u=u.map(it=>it.id===c.id?{...it,[c.field]:c.value}:it)});return u;});}
      else setChat(p=>[...p,{role:"ai",text:"Got it — which stop would you like to change?"}]);
    }catch(e){setChat(p=>[...p,{role:"ai",text:"What specifically would you like to change?"}]);}
    setLoading(false);
  }
  // Architecture #1: each item auto-wraps as 1 segment
  function buildHandoff(){
    return{tripName:data.tripName||"My Expedition",startDate,vision:data.vision,visionNarrative:visionData.narrative,visionHighlight:visionData.highlight,goalLabel,
      phases:items.map((item,i)=>({id:i+1,name:item.destination,flag:item.flag,color:item.color,budget:item.cost,nights:item.nights,type:item.type,arrival:dates[i]?.arrival.toISOString().split("T")[0]||"",departure:dates[i]?.departure.toISOString().split("T")[0]||"",country:item.country,diveCount:item.type==="Dive"?Math.floor(item.nights*1.5):0,cost:item.cost,note:""})),
      totalNights,totalBudget:totalCost,totalDives:items.filter(i=>i.type==="Dive").reduce((s,i)=>s+Math.floor(i.nights*1.5),0)};
  }
  return(
    <div className="build-root" style={{opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(32px)",transition:"opacity 0.55s ease,transform 0.55s cubic-bezier(0.22,1,0.36,1)"}}>
      <ConsoleHeader console="dream" isMobile={isMobile} rightSlot={<div style={{display:"flex",gap:5,alignItems:"center"}}>{[1,2,3,4].map(n=><div key={n} style={{width:n<3?18:n===3?28:18,height:6,borderRadius:3,background:n<3?"rgba(169,70,29,0.55)":n===3?"#FFD93D":"rgba(255,255,255,0.1)",boxShadow:n===3?"0 0 8px rgba(255,217,61,0.6)":"none"}}/>)}</div>}/>
      <div style={{display:"flex",border:"none",background:"#080D14",flexShrink:0}}>
        {[{label:"STOPS",val:items.length,c:"#00E5FF"},{label:"COUNTRIES",val:countries.length,c:"#69F0AE"},{label:"NIGHTS",val:totalNights,c:"#A29BFE"},{label:"BUDGET",val:fmt(totalCost),c:"#FFD93D"}].map((s,i)=>(
          <div key={s.label} style={{flex:1,padding:"8px 6px",textAlign:"center",borderRight:i<3?"1px solid #111D2A":"none"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{s.label}</div>
            <div style={{fontSize:isMobile?12:14,fontWeight:700,color:s.c}}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"8px 14px",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid #111D2A",flexShrink:0}}>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.75)",letterSpacing:1}}>DEPARTURE</span>
        <input type="date" style={{background:"transparent",border:"1px solid rgba(0,229,255,0.28)",borderRadius:6,color:"#00E5FF",fontSize:11,padding:"3px 8px",fontFamily:"monospace",outline:"none"}} value={startDate} onChange={e=>setStartDate(e.target.value)}/>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.65)",marginLeft:"auto"}}>{totalNights} nights</span>
      </div>
      {isMobile&&<div style={{display:"flex",borderBottom:"1px solid #1a2535",background:"#080D14",flexShrink:0}}>
        {["itinerary","chat"].map(t=><button key={t} onClick={()=>setMobileTab(t)} style={{flex:1,padding:10,background:"none",border:"none",borderBottom:mobileTab===t?"2px solid #69F0AE":"2px solid transparent",color:mobileTab===t?"#69F0AE":"rgba(255,255,255,0.4)",fontSize:9,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:2,minHeight:44}}>{t==="itinerary"?"🗺️ ITINERARY":"✏️ REFINE"}</button>)}
      </div>}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0,...(isMobile?{flexDirection:"column"}:{})}}>
        {(!isMobile||mobileTab==="itinerary")&&(
          <div style={{flex:1,overflowY:"auto",padding:12,...(isMobile?{maxHeight:"none"}:{})}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",letterSpacing:3,marginBottom:10}}>YOUR ITINERARY · TAP TO EDIT</div>
            {items.map((item,i)=>{
              const c=item.color,isEd=editingId===item.id;
              return(
                <div key={item.id} style={{marginBottom:7,background:"#0C1520",borderRadius:11,overflow:"hidden",border:`1px solid ${c}22`,borderLeft:`3px solid ${c}`}}>
                  <div onClick={()=>setEditingId(isEd?null:item.id)} style={{padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,minHeight:44}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:`${c}18`,border:`1px solid ${c}44`,color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#FFF"}}>{item.flag} {item.destination}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.75)"}}><span style={{color:"#FFD93D",fontWeight:700}}>{item.country}</span> · {TI[item.type]} {item.type} · {fmtD(dates[i]?.arrival)}→{fmtD(dates[i]?.departure)}</div></div>
                    <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontWeight:900,color:"#A29BFE"}}>{item.nights}n</div><div style={{fontSize:12,color:"#FFD93D"}}>{fmt(item.cost)}</div></div>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.25)",marginLeft:6}}>{isEd?"▲":"▼"}</span>
                  </div>
                  {isEd&&<div style={{padding:"10px 12px 12px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.2)",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[{label:"NIGHTS",field:"nights",type:"number"},{label:"COST ($)",field:"cost",type:"number"}].map(f=><div key={f.field} style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{f.label}</div><input type={f.type} style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:12,padding:"5px 7px",fontFamily:"'Space Mono',monospace",outline:"none"}} value={item[f.field]} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,[f.field]:parseInt(e.target.value)||1}:it))}/></div>)}
                    <div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>TYPE</div><select style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:12,padding:"5px 7px",outline:"none",width:"100%"}} value={item.type} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,type:e.target.value}:it))}>{["Exploration","Culture","Dive","Surf","Nature","Trek","Moto","Relax","Transit"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
                  </div>}
                </div>
              );
            })}
            <div style={{padding:"10px 12px",background:"rgba(105,240,174,0.04)",border:"1px solid rgba(105,240,174,0.14)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
              <div><div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{items.length} stops · {countries.length} countries</div><div style={{fontSize:9,color:"#69F0AE"}}>~{fmt(Math.round(totalCost/Math.max(totalNights,1)))}/night</div></div>
              <div style={{fontSize:20,fontWeight:900,color:"#FFD93D"}}>{fmt(totalCost)}</div>
            </div>
            {isMobile&&<button style={{margin:"12px 0 0 0",width:"100%",padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#060A0F",fontSize:11,fontWeight:900,cursor:"pointer",letterSpacing:2,fontFamily:"'Space Mono',monospace",animation:"consolePulse 2.8s ease-in-out infinite"}} onClick={()=>onLaunch(buildHandoff())}>{data.isRevision?"✅  UPDATE":"🚀  LAUNCH TRIP CONSOLE"}</button>}
          </div>
        )}
        {(!isMobile||mobileTab==="chat")&&(
          <div style={{width:isMobile?"100%":"44%",display:"flex",flexDirection:"column",borderLeft:isMobile?"none":"1px solid #111D2A",...(isMobile?{flex:1,borderTop:"1px solid #111D2A"}:{})}}>
            <div style={{padding:"8px 11px",borderBottom:"1px solid #111D2A",fontSize:12,color:"#C4571E",letterSpacing:2,flexShrink:0}}>{data.isRevision?"✏️ REVISE YOUR EXPEDITION":"✨ DREAM CONSOLE"}</div>
            <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:8}}>
              {chat.map((msg,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",flexDirection:msg.role==="user"?"row-reverse":"row",animation:"msgIn 0.25s ease"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:msg.role==="ai"?"#A9461D":"#1a2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0}}>{msg.role==="ai"?"✨":"👤"}</div>
                  {msg.isWelcome
                    ?<div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.2),rgba(255,217,61,0.07))",border:"1px solid rgba(169,70,29,0.5)",borderRadius:12,padding:"13px 15px",fontSize:11,color:"#FFF",lineHeight:1.8,maxWidth:"92%",whiteSpace:"pre-line",fontFamily:"'Fraunces',serif",fontStyle:"italic",animation:"fadeUp 0.6s ease"}}>{msg.text}</div>
                    :<div className="chat-bubble" style={{background:msg.role==="ai"?"rgba(169,70,29,0.12)":"rgba(255,255,255,0.05)",border:`1px solid ${msg.role==="ai"?"rgba(169,70,29,0.52)":"rgba(255,255,255,0.08)"}`}}>{msg.text}</div>}
                </div>
              ))}
              {loading&&<div style={{display:"flex",gap:6,animation:"msgIn 0.25s ease"}}><div style={{width:20,height:20,borderRadius:"50%",background:"#A9461D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>✨</div><div style={{fontSize:9,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",padding:"4px 0"}}>thinking...</div></div>}
              <div ref={chatEnd}/>
            </div>
            <div style={{padding:"10px",borderTop:"1px solid #111D2A",display:"flex",gap:5,flexWrap:isMobile?"nowrap":"wrap",overflowX:"auto",flexShrink:0}}>
              {QUICK_ACTIONS.map(a=><button key={a} onClick={()=>setInput(a)} style={{background:"rgba(169,70,29,0.18)",border:"1px solid rgba(255,217,61,0.35)",borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:700,color:"#FFD93D",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Space Mono',monospace",minHeight:36}}>{a}</button>)}
            </div>
            <div style={{padding:"8px 10px",borderTop:"1px solid #111D2A",display:"flex",gap:7,flexShrink:0}}>
              <input style={{flex:1,background:"#080D14",border:"1px solid #1a2535",borderRadius:8,color:"#FFF",fontSize:isMobile?13:10,padding:"8px 10px",fontFamily:"'Space Mono',monospace",outline:"none",minHeight:44}} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMsg();}} placeholder="Ask anything, request changes..."/>
              <button style={{background:"rgba(169,70,29,0.2)",border:"1px solid rgba(169,70,29,0.4)",borderRadius:8,color:"#FFD93D",fontSize:14,padding:"8px 11px",cursor:"pointer",minWidth:44,minHeight:44}} onClick={sendMsg}>↑</button>
            </div>
            {!isMobile&&<button style={{margin:10,padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#060A0F",fontSize:11,fontWeight:900,cursor:"pointer",letterSpacing:2,fontFamily:"'Space Mono',monospace",animation:"consolePulse 2.8s ease-in-out infinite",flexShrink:0}} onClick={()=>onLaunch(buildHandoff())}>{data.isRevision?"✅  UPDATE MY EXPEDITION":"🚀  LAUNCH TRIP CONSOLE"}</button>}
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
  useEffect(()=>{const ts=[setTimeout(()=>setPh(1),2200),setTimeout(()=>setPh(2),7200),setTimeout(()=>setPh(3),10500)];return()=>ts.forEach(clearTimeout);},[]);
  useEffect(()=>{if(ph<2)return;const total=tripData.phases?.length||0;let i=0;const iv=setInterval(()=>{i++;setLit(i);if(i>=total)clearInterval(iv);},180);return()=>clearInterval(iv);},[ph]);
  const totalNights=tripData.phases?.reduce((s,p)=>s+p.nights,0)||0;
  const totalBudget=tripData.phases?.reduce((s,p)=>s+(p.cost||p.budget||0),0)||0;
  const countries=[...new Set((tripData.phases||[]).map(p=>p.country))].length;
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"'Space Mono',monospace",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 0%,#2d1200 0%,#1a0900 25%,#0d0500 55%,#060200 100%)",zIndex:1}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 0%,#001830 0%,#000d1a 30%,#000810 60%,#030810 100%)",opacity:ph>=1?1:0,transition:"opacity 1.4s ease",zIndex:2}}/>
      <div style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}>
        <div style={{opacity:ph<1?1:0,transition:"opacity 0.9s ease",position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{fontSize:isMobile?44:56,marginBottom:24,animation:"spinGlobe 14s linear infinite",filter:"drop-shadow(0 0 30px rgba(255,217,61,0.5))"}}>🌍</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?17:22,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.88)",lineHeight:1.6,maxWidth:560,textAlign:"center"}}>"{(tripData.visionNarrative||"").slice(0,120)}..."</div>
          <div style={{marginTop:28,fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic",color:"rgba(255,217,61,0.45)",letterSpacing:3}}>Now becoming real.</div>
        </div>
        <div style={{opacity:ph>=1&&ph<2?1:0,transition:"opacity 0.8s ease",position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{fontSize:isMobile?56:72,filter:"drop-shadow(0 0 40px rgba(0,229,255,0.5))",marginBottom:24}}>🌍</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:16,fontWeight:100,fontStyle:"italic",color:"rgba(0,229,255,0.6)",letterSpacing:4,textAlign:"center"}}>Building your expedition...</div>
        </div>
        <div style={{opacity:ph>=2?1:0,transition:"opacity 0.8s ease 0.2s",display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:520}}>
          <div style={{position:"relative",marginBottom:isMobile?28:36}}>
            {[0,1,2].map(i=><div key={i} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:isMobile?90+i*40:110+i*50,height:isMobile?90+i*40:110+i*50,borderRadius:"50%",border:`1px solid rgba(0,229,255,${0.15-i*.04})`}}/>)}
            <div style={{width:isMobile?72:88,height:isMobile?72:88,borderRadius:"50%",background:"radial-gradient(circle at 38% 32%,#0d3a5c 0%,#071420 60%,#030810 100%)",border:"2px solid rgba(0,229,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?28:36,position:"relative",zIndex:1}}>🌍</div>
          </div>
          <div style={{textAlign:"center",marginBottom:isMobile?16:20}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?18:22,fontWeight:900,color:"#FFD93D",letterSpacing:3,textShadow:"0 0 30px rgba(255,217,61,0.5)",lineHeight:1}}>DREAM BIG</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?18:22,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.7)",letterSpacing:2,lineHeight:1.2}}>travel light</div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",maxWidth:isMobile?320:480,marginBottom:isMobile?20:28}}>
            {tripData.phases?.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5,opacity:i<lit?1:0.15,transition:"opacity 0.3s ease"}}>
                <div style={{width:isMobile?8:10,height:isMobile?8:10,borderRadius:"50%",background:p.color||"#00E5FF",boxShadow:i<lit?`0 0 8px ${p.color||"#00E5FF"}`:"none"}}/>
                {i<lit&&<div style={{fontSize:isMobile?11:12,color:p.color||"#00E5FF",whiteSpace:"nowrap",fontWeight:700}}>{p.flag} {p.name}</div>}
              </div>
            ))}
          </div>
          <div style={{opacity:ph>=3?1:0,transform:ph>=3?"translateY(0)":"translateY(16px)",transition:"opacity 0.7s ease,transform 0.7s ease",textAlign:"center",width:"100%"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?22:32,fontWeight:300,fontStyle:"italic",color:"#FFD93D",marginBottom:6,textShadow:"0 0 40px rgba(255,217,61,0.4)"}}>{tripData.tripName}</div>
            <div style={{width:80,height:1,background:"linear-gradient(90deg,transparent,rgba(255,217,61,0.5),transparent)",margin:"10px auto 16px"}}/>
            <div style={{display:"flex",justifyContent:"center",gap:isMobile?16:28,marginBottom:isMobile?28:36,flexWrap:"wrap"}}>
              {[{value:totalNights,label:"NIGHTS"},{value:"$"+Math.round(totalBudget/1000)+"k",label:"BUDGET"},{value:countries,label:"COUNTRIES"}].map((s,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{fontSize:isMobile?22:28,fontWeight:900,color:"#00E5FF",fontFamily:"'Space Mono',monospace"}}>{s.value}</div>
                  <div style={{fontSize:11,color:"rgba(0,229,255,0.9)",letterSpacing:2,fontWeight:700}}>{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={onComplete} style={{padding:isMobile?"16px 32px":"18px 44px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#030810",fontSize:isMobile?12:13,fontWeight:900,fontFamily:"'Space Mono',monospace",letterSpacing:2.5,cursor:"pointer",animation:"consolePulse 2.8s ease-in-out infinite",minHeight:54}}>ENTER TRIP CONSOLE →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SegmentDetailField ───────────────────────────────────────────
function SDF({label,value,onChange,placeholder,type="text",multiline,accent="#00E5FF"}) {
  const s={background:"rgba(0,8,20,0.6)",border:`1px solid ${accent}18`,borderRadius:6,color:"#FFF",fontSize:11,padding:multiline?"8px 10px":"7px 10px",fontFamily:"'Space Mono',monospace",outline:"none",width:"100%",lineHeight:1.6,resize:multiline?"none":undefined};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <div style={{fontSize:11,color:`${accent}CC`,letterSpacing:2.5,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{label}</div>
      {multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={2} style={s} onFocus={e=>e.target.style.borderColor=`${accent}55`} onBlur={e=>e.target.style.borderColor=`${accent}18`}/>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} onFocus={e=>e.target.style.borderColor=`${accent}55`} onBlur={e=>e.target.style.borderColor=`${accent}18`}/>}
    </div>
  );
}

// ─── SegmentDetails — reads/writes 1bn_seg_v2 only (arch #3) ─────
// arch #2: inline intel tab preview preserved
function SegmentDetails({phaseId,segment,intelSnippet}) {
  const key=`${phaseId}-${segment.id}`;
  const blank={transport:{mode:"",from:"",to:"",depTime:"",arrTime:"",cost:"",notes:""},stay:{name:"",checkin:"",checkout:"",cost:"",link:"",notes:""},activities:[],actNotes:"",food:{dailyBudget:"",notes:""},misc:[],intel:{notes:""}};
  const [det,setDet]=useState(()=>{const a=loadSeg();return a[key]||blank;});
  const [cat,setCat]=useState(null);
  const [aiLoad,setAiLoad]=useState(false);
  const [nAct,setNAct]=useState({name:"",date:"",cost:"",transit:"",link:""});
  const [nMisc,setNMisc]=useState({name:"",cost:""});
  useEffect(()=>{const a=loadSeg();a[key]=det;saveSeg(a);},[det]);
  const uT=(f,v)=>setDet(d=>({...d,transport:{...d.transport,[f]:v}}));
  const uS=(f,v)=>setDet(d=>({...d,stay:{...d.stay,[f]:v}}));
  const uF=(f,v)=>setDet(d=>({...d,food:{...d.food,[f]:v}}));
  async function aiFood(){setAiLoad(true);const r=await askAI(`Daily food budget USD solo traveler ${segment.name}. Number only.`,20);const n=r.replace(/\D/g,"");if(n)uF("dailyBudget",n);setAiLoad(false);}
  const CATS=[{id:"transport",icon:"✈️",label:"TRANSPORT",a:"#00E5FF",w:"rgba(0,229,255,0.04)"},{id:"stay",icon:"🏠",label:"STAY",a:"#69F0AE",w:"rgba(105,240,174,0.04)"},{id:"activities",icon:"🎯",label:"ACTIVITIES",a:"#FFD93D",w:"rgba(255,217,61,0.04)"},{id:"food",icon:"🍽️",label:"FOOD",a:"#FF9F43",w:"rgba(255,159,67,0.04)"},{id:"misc",icon:"💸",label:"MISC",a:"#A29BFE",w:"rgba(162,155,254,0.04)"},{id:"intel",icon:"🔭",label:"INTEL",a:"#FF6B6B",w:"rgba(255,107,107,0.04)"}];
  const done={transport:!!(det.transport.mode||det.transport.cost),stay:!!(det.stay.name||det.stay.cost),activities:det.activities.length>0,food:!!(det.food.dailyBudget),misc:det.misc.length>0,intel:!!(intelSnippet?.tagline||det.intel.notes)};
  const ac=CATS.find(c=>c.id===cat);
  return(
    <div style={{borderTop:"1px solid rgba(0,229,255,0.06)"}}>
      <div style={{display:"flex",background:"rgba(0,4,12,0.8)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        {CATS.map(c=>{const on=cat===c.id;return(
          <button key={c.id} onClick={()=>setCat(on?null:c.id)} style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"9px 2px",border:"none",cursor:"pointer",background:on?c.w:"transparent",borderBottom:on?`2px solid ${c.a}`:"2px solid transparent",transition:"all 0.15s",position:"relative"}}>
            <span style={{fontSize:12,lineHeight:1}}>{c.icon}</span>
            <span style={{fontSize:12,letterSpacing:0.5,fontFamily:"'Space Mono',monospace",fontWeight:700,color:on?c.a:"rgba(255,255,255,0.7)",whiteSpace:"nowrap"}}>{c.label}</span>
            {done[c.id]&&<div style={{position:"absolute",top:4,right:"14%",width:5,height:5,borderRadius:"50%",background:c.a,boxShadow:`0 0 5px ${c.a}`}}/>}
          </button>
        );})}
      </div>
      {cat&&ac&&(
        <div style={{background:ac.w,borderTop:`1px solid ${ac.a}15`,animation:"slideOpen 0.18s ease"}}>
          {cat==="transport"&&<div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>
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
          {cat==="stay"&&<div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
              <SDF label="CHECK-IN" type="date" value={det.stay.checkin} onChange={v=>uS("checkin",v)} accent="#69F0AE"/>
              <SDF label="CHECK-OUT" type="date" value={det.stay.checkout} onChange={v=>uS("checkout",v)} accent="#69F0AE"/>
            </div>
            <SDF label="BOOKING LINK" value={det.stay.link} onChange={v=>uS("link",v)} placeholder="https://..." accent="#69F0AE"/>
            <SDF label="NOTES" value={det.stay.notes} onChange={v=>uS("notes",v)} placeholder="Room type, included meals, host contact..." accent="#69F0AE" multiline/>
          </div>}
          {cat==="activities"&&<div style={{padding:"14px 16px"}}>
            {det.activities.length>0&&<div style={{marginBottom:12}}>
              {det.activities.map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(255,217,61,0.07)"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:"#FFF",fontFamily:"'Space Mono',monospace",marginBottom:2}}>{a.name}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",display:"flex",gap:8,flexWrap:"wrap"}}>
                      {a.date&&<span>📅 {fD(a.date)}</span>}{a.cost&&<span style={{color:"#FFD93D"}}>💰 ${a.cost}</span>}{a.transit&&<span>🚕 {a.transit}</span>}
                      {a.link&&<a href={a.link} target="_blank" rel="noopener noreferrer" style={{color:"#00E5FF",textDecoration:"none"}}>🔗 Book</a>}
                    </div>
                  </div>
                  <button onClick={()=>setDet(d=>({...d,activities:d.activities.filter(x=>x.id!==a.id)}))} style={{background:"none",border:"none",color:"rgba(255,255,255,0.18)",fontSize:16,cursor:"pointer",lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
                </div>
              ))}
              <div style={{paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.28)",fontFamily:"monospace",letterSpacing:1}}>TOTAL ACTIVITIES</span>
                <span style={{fontSize:12,fontWeight:700,color:"#FFD93D",fontFamily:"monospace"}}>${det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}</span>
              </div>
            </div>}
            <div style={{background:"rgba(255,217,61,0.02)",border:"1px dashed rgba(255,217,61,0.16)",borderRadius:8,padding:"11px 12px"}}>
              <div style={{fontSize:11,color:"rgba(255,217,61,0.5)",letterSpacing:2,marginBottom:8,fontFamily:"'Space Mono',monospace",fontWeight:700}}>ADD ACTIVITY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
                <SDF label="ACTIVITY" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#FFD93D"/>
                <SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#FFD93D"/>
                <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#FFD93D"/>
                <SDF label="TRANSIT" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Taxi from hotel..." accent="#FFD93D"/>
              </div>
              <SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://klook.com / dive shop..." accent="#FFD93D"/>
              <button onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:[...d.activities,{...nAct,id:Date.now()}]}));setNAct({name:"",date:"",cost:"",transit:"",link:""});}} style={{marginTop:8,padding:"6px 14px",borderRadius:5,border:`1px solid rgba(255,217,61,${nAct.name?"0.4":"0.14"})`,background:nAct.name?"rgba(255,217,61,0.1)":"transparent",color:nAct.name?"#FFD93D":"rgba(255,255,255,0.18)",fontSize:9,cursor:nAct.name?"pointer":"default",fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:700}}>+ ADD</button>
            </div>
            <div style={{marginTop:12}}><SDF label="ACTIVITY NOTES" value={det.actNotes||""} onChange={v=>setDet(d=>({...d,actNotes:v}))} placeholder="Tips, what to bring, dress code, best time..." accent="#FFD93D" multiline/></div>
          </div>}
          {cat==="food"&&<div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <div style={{flex:1}}><SDF label="DAILY FOOD BUDGET ($)" type="number" value={det.food.dailyBudget} onChange={v=>uF("dailyBudget",v)} placeholder="e.g. 45" accent="#FF9F43"/></div>
              <button onClick={aiFood} disabled={aiLoad} style={{padding:"7px 13px",borderRadius:6,border:"1px solid rgba(255,159,67,0.4)",background:"rgba(255,159,67,0.07)",color:"#FF9F43",fontSize:9,cursor:aiLoad?"wait":"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:700,whiteSpace:"nowrap",height:32,flexShrink:0}}>{aiLoad?"✦...":"✦ AI EST"}</button>
            </div>
            {det.food.dailyBudget&&<div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,159,67,0.05)",border:"1px solid rgba(255,159,67,0.16)",borderRadius:7}}>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{segment.nights} nights × ${det.food.dailyBudget}/day</span>
              <span style={{fontSize:13,fontWeight:700,color:"#FFD93D",fontFamily:"monospace"}}>${(parseFloat(det.food.dailyBudget)*segment.nights).toLocaleString()}</span>
            </div>}
            <SDF label="FOOD NOTES" value={det.food.notes} onChange={v=>uF("notes",v)} placeholder="Must-try dishes, market days, dietary notes..." accent="#FF9F43" multiline/>
          </div>}
          {cat==="misc"&&<div style={{padding:"14px 16px"}}>
            {det.misc.length>0&&<div style={{marginBottom:12}}>
              {det.misc.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(162,155,254,0.07)"}}>
                  <div style={{flex:1,fontSize:11,color:"#FFF",fontFamily:"'Space Mono',monospace"}}>{m.name}</div>
                  <span style={{fontSize:12,fontWeight:700,color:"#A29BFE",fontFamily:"monospace",flexShrink:0}}>${parseFloat(m.cost||0).toLocaleString()}</span>
                  <button onClick={()=>setDet(d=>({...d,misc:d.misc.filter(x=>x.id!==m.id)}))} style={{background:"none",border:"none",color:"rgba(255,255,255,0.18)",fontSize:16,cursor:"pointer",lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
                </div>
              ))}
              <div style={{paddingTop:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"rgba(255,255,255,0.28)",fontFamily:"monospace",letterSpacing:1}}>TOTAL MISC</span><span style={{fontSize:12,fontWeight:700,color:"#A29BFE",fontFamily:"monospace"}}>${det.misc.reduce((s,m)=>s+(parseFloat(m.cost)||0),0).toLocaleString()}</span></div>
            </div>}
            <div style={{background:"rgba(162,155,254,0.02)",border:"1px dashed rgba(162,155,254,0.16)",borderRadius:8,padding:"11px 12px"}}>
              <div style={{fontSize:11,color:"rgba(162,155,254,0.5)",letterSpacing:2,marginBottom:8,fontFamily:"'Space Mono',monospace",fontWeight:700}}>ADD EXPENSE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
                <SDF label="ITEM" value={nMisc.name} onChange={v=>setNMisc(m=>({...m,name:v}))} placeholder="Visa / permit / rental..." accent="#A29BFE"/>
                <SDF label="COST ($)" type="number" value={nMisc.cost} onChange={v=>setNMisc(m=>({...m,cost:v}))} placeholder="0" accent="#A29BFE"/>
              </div>
              <button onClick={()=>{if(!nMisc.name)return;setDet(d=>({...d,misc:[...d.misc,{...nMisc,id:Date.now()}]}));setNMisc({name:"",cost:""});}} style={{padding:"6px 14px",borderRadius:5,border:`1px solid rgba(162,155,254,${nMisc.name?"0.4":"0.14"})`,background:nMisc.name?"rgba(162,155,254,0.1)":"transparent",color:nMisc.name?"#A29BFE":"rgba(255,255,255,0.18)",fontSize:9,cursor:nMisc.name?"pointer":"default",fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:700}}>+ ADD</button>
            </div>
          </div>}
          {/* arch #2: inline intel preview */}
          {cat==="intel"&&<div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>
            {intelSnippet&&!intelSnippet.error?(
              <div style={{padding:"10px 12px",background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.14)",borderRadius:8}}>
                {intelSnippet.tagline&&<div style={{fontSize:11,color:"#A29BFE",fontStyle:"italic",marginBottom:8,lineHeight:1.55}}>{intelSnippet.tagline}</div>}
                {intelSnippet.mustDo?.slice(0,3).map((item,i)=><div key={i} style={{fontSize:12,color:"rgba(255,255,255,0.68)",marginBottom:4,paddingLeft:8}}>• {item}</div>)}
                {intelSnippet.streetIntel?.[0]&&<div style={{marginTop:8,padding:"6px 9px",background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.18)",borderRadius:6}}><div style={{fontSize:11,color:"#FF6B6B",fontWeight:700,letterSpacing:1.5,marginBottom:2}}>{intelSnippet.streetIntel[0].type}</div><div style={{fontSize:12,color:"#FFF"}}>{intelSnippet.streetIntel[0].alert}</div></div>}
                <div style={{marginTop:10,fontSize:12,color:"rgba(0,229,255,0.5)",fontFamily:"'Space Mono',monospace"}}>→ Full briefing in INTEL tab</div>
              </div>
            ):(
              <div style={{padding:"12px 14px",background:"rgba(255,107,107,0.03)",border:"1px solid rgba(255,107,107,0.09)",borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18,opacity:0.35}}>🔭</span>
                <div><div style={{fontSize:12,color:"rgba(255,255,255,0.38)",fontStyle:"italic",marginBottom:2}}>No briefing for {segment.name} yet.</div><div style={{fontSize:12,color:"rgba(0,229,255,0.45)",fontFamily:"'Space Mono',monospace"}}>→ Generate in the INTEL tab</div></div>
              </div>
            )}
            <SDF label="YOUR NOTES" value={det.intel.notes} onChange={v=>setDet(d=>({...d,intel:{...d.intel,notes:v}}))} placeholder="Visa requirements, local contacts, personal tips..." accent="#FF6B6B" multiline/>
          </div>}
        </div>
      )}
    </div>
  );
}

// ─── ProgDots ─────────────────────────────────────────────────────
function ProgDots({phaseId,segment,intelSnippet}) {
  const d=loadSeg()[`${phaseId}-${segment.id}`]||{};
  const dots=[!!(d.transport?.mode||d.transport?.cost),!!(d.stay?.name||d.stay?.cost),(d.activities?.length||0)>0,!!(d.food?.dailyBudget),(d.misc?.length||0)>0,!!(intelSnippet?.tagline||d.intel?.notes)];
  return(<div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>{dots.map((on,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:on?CAT_DOT_COLORS[i]:"rgba(255,255,255,0.1)",boxShadow:on?`0 0 4px ${CAT_DOT_COLORS[i]}`:"none",transition:"all 0.2s",flexShrink:0}}/>)}</div>);
}

// ─── SegmentRow ───────────────────────────────────────────────────
function SegmentRow({segment,phaseId,phaseColor,intelSnippet,isLast}) {
  const [open,setOpen]=useState(false);
  const [askOpen,setAskOpen]=useState(false);
  const [askInput,setAskInput]=useState("");
  const [askChat,setAskChat]=useState([]);
  const [askLoading,setAskLoading]=useState(false);
  const askEnd=useRef(null);
  const tc=TC[segment.type]||"#FFD93D";
  useEffect(()=>{askEnd.current?.scrollIntoView({behavior:"smooth"});},[askChat]);
  async function sendAsk(){
    if(!askInput.trim()||askLoading)return;
    const msg=askInput;setAskInput("");setAskChat(p=>[...p,{role:"user",text:msg}]);setAskLoading(true);
    const det=loadSeg()[`${phaseId}-${segment.id}`]||{};
    const ctx=`Segment:${segment.name}(${segment.type}).${segment.nights}n.$${segment.budget}.${det.stay?.name?"Stay:"+det.stay.name+".":""}${det.transport?.mode?"Transport:"+det.transport.mode+".":""}`;
    const res=await askAI(`Travel co-architect.${ctx} Q:"${msg}".2-3 sentences max.`,300);
    setAskChat(p=>[...p,{role:"ai",text:res}]);setAskLoading(false);
  }
  return(
    <div style={{borderBottom:isLast?"none":"1px solid rgba(0,229,255,0.055)"}}>
      <div style={{display:"flex",alignItems:"center",minHeight:50,borderLeft:`2px solid ${tc}${open?"77":"2a"}`}}>
        <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 10px 12px 20px",cursor:"pointer",background:open?`${tc}04`:"transparent",transition:"background 0.15s",flex:1,minWidth:0}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:tc,flexShrink:0,boxShadow:open?`0 0 7px ${tc}`:"none"}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:700,color:"#FFF",fontFamily:"'Space Mono',monospace"}}>{segment.name}</span>
              <span style={{fontSize:11,color:tc,background:`${tc}16`,border:`1px solid ${tc}33`,borderRadius:10,padding:"1px 7px",letterSpacing:1,fontWeight:700}}>{TI[segment.type]} {segment.type?.toUpperCase()}</span>
              {segment.note&&<span style={{fontSize:12,color:"rgba(255,255,255,0.72)",fontStyle:"italic"}}>{segment.note}</span>}
            </div>
            <div style={{display:"flex",gap:9,fontSize:9,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:"rgba(255,255,255,0.88)",fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{fD(segment.arrival)} → {fD(segment.departure)}</span>
              <span style={{color:tc,fontWeight:900,fontSize:12}}>🌙 {segment.nights}n</span>
              {segment.diveCount>0&&<span style={{color:"#00E5FF",fontSize:9}}>🤿 {segment.diveCount}</span>}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
            <ProgDots phaseId={phaseId} segment={segment} intelSnippet={intelSnippet}/>
            <div style={{fontSize:13,fontWeight:900,color:"#FFD93D",fontFamily:"'Space Mono',monospace"}}>{fmt(segment.budget)}</div>
            <div style={{fontSize:7.5,color:"rgba(255,255,255,0.68)",fontFamily:"monospace"}}>{fmt(Math.round(segment.budget/Math.max(segment.nights,1)))}/night</div>
          </div>
          <div style={{width:18,height:18,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.28":"0.18"})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:4}}>
            <span style={{fontSize:11,color:open?"#00E5FF":"rgba(255,255,255,0.75)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▼</span>
          </div>
        </div>
        <button onClick={e=>{e.stopPropagation();setAskOpen(o=>!o);}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:"8px 10px",background:askOpen?"rgba(255,217,61,0.1)":"rgba(255,217,61,0.03)",border:"none",borderLeft:`1px solid rgba(255,217,61,${askOpen?"0.45":"0.22"})`,cursor:"pointer",flexShrink:0,height:"100%",minWidth:38,transition:"all 0.15s"}} title="Ask co-architect">
          <span style={{fontSize:11,color:askOpen?"#FFD93D":"rgba(255,217,61,0.65)",lineHeight:1,textShadow:askOpen?"0 0 8px rgba(255,217,61,0.6)":"none",animation:askOpen?"none":"glowPulse 2.5s ease-in-out infinite"}}>✦</span>
          <span style={{fontSize:12,color:askOpen?"#FFD93D":"rgba(255,217,61,0.55)",letterSpacing:1,fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>ASK</span>
        </button>
      </div>
      {askOpen&&(
        <div style={{background:"rgba(0,4,14,0.95)",borderTop:"1px solid rgba(255,217,61,0.12)",padding:"10px 14px",animation:"slideOpen 0.18s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{fontSize:9,color:"rgba(255,217,61,0.6)",fontFamily:"'Space Mono',monospace",fontWeight:700,letterSpacing:1.5}}>✦ CO-ARCHITECT · {segment.name.toUpperCase()}</span>
            <button onClick={()=>setAskOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:14,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          {askChat.length===0&&<div style={{fontFamily:"'Fraunces',serif",fontSize:11,fontStyle:"italic",color:"rgba(255,217,61,0.45)",marginBottom:8,lineHeight:1.6}}>"Ask me anything — best dive ops, where to stay, local tips..."</div>}
          {askChat.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8,maxHeight:160,overflowY:"auto"}}>
            {askChat.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:6,flexDirection:m.role==="user"?"row-reverse":"row",alignItems:"flex-start"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:m.role==="ai"?"#A9461D":"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>{m.role==="ai"?"✦":"·"}</div>
                <div style={{borderRadius:8,padding:"6px 9px",fontSize:12,color:"#FFF",lineHeight:1.6,maxWidth:"88%",background:m.role==="ai"?"rgba(169,70,29,0.18)":"rgba(255,255,255,0.06)",border:`1px solid ${m.role==="ai"?"rgba(169,70,29,0.35)":"rgba(255,255,255,0.08)"}`}}>{m.text}</div>
              </div>
            ))}
            {askLoading&&<div style={{fontSize:9,color:"rgba(169,70,29,0.6)",fontStyle:"italic",paddingLeft:22}}>✦ thinking...</div>}
            <div ref={askEnd}/>
          </div>}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7}}>
            {["Best dive ops?","Where to stay?","What to skip?","Budget tips?","Local food?"].map(p=><button key={p} onClick={()=>setAskInput(p)} style={{padding:"3px 9px",borderRadius:12,border:"1px solid rgba(255,217,61,0.2)",background:"rgba(255,217,61,0.05)",color:"rgba(255,217,61,0.65)",fontSize:12,cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>{p}</button>)}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input value={askInput} onChange={e=>setAskInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendAsk();}} placeholder={`Ask about ${segment.name}...`} style={{flex:1,background:"rgba(0,8,20,0.8)",border:"1px solid rgba(255,217,61,0.2)",borderRadius:7,color:"#FFF",fontSize:11,padding:"8px 10px",fontFamily:"'Space Mono',monospace",outline:"none",minHeight:34}}/>
            <button onClick={sendAsk} style={{background:"rgba(255,217,61,0.12)",border:"1px solid rgba(255,217,61,0.3)",borderRadius:7,color:"#FFD93D",fontSize:13,padding:"6px 11px",cursor:"pointer",minWidth:34,minHeight:34,fontWeight:700}}>↑</button>
          </div>
        </div>
      )}
      {open&&<SegmentDetails phaseId={phaseId} segment={segment} intelSnippet={intelSnippet}/>}
    </div>
  );
}

// ─── PhaseCard ────────────────────────────────────────────────────
function PhaseCard({phase,intelData,idx}) {
  const isMobile=useMobile();
  const [open,setOpen]=useState(false);
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
  return(
    <div style={{borderRadius:13,border:open?`1.5px solid ${phase.color}`:"1px solid rgba(0,229,255,0.08)",boxShadow:open?`0 0 0 1px ${phase.color}22, 0 4px 28px ${phase.color}28, inset 0 1px 0 ${phase.color}18`:"none",background:open?`linear-gradient(145deg,${phase.color}07,rgba(0,4,14,0.98))`:"rgba(3,7,16,0.88)",overflow:"hidden",transition:"all 0.25s",animation:`fadeUp 0.3s ease ${idx*.04}s both`}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",minHeight:62,borderLeft:`3px solid ${open?phase.color:phase.color+"50"}`}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
          <div style={{width:26,height:26,borderRadius:"50%",background:`${phase.color}14`,border:`1.5px solid ${phase.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:phase.color,fontFamily:"'Space Mono',monospace"}}>{phase.id}</div>
          <div style={{fontSize:15}}>{phase.flag}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
            <span style={{fontSize:15,fontWeight:700,color:open?phase.color:"#FFF",fontFamily:"'Space Mono',monospace",transition:"color 0.2s"}}>{phase.name}</span>
            {isNow&&<span style={{fontSize:11,color:"#69F0AE",background:"rgba(105,240,174,0.1)",border:"1px solid rgba(105,240,174,0.28)",borderRadius:8,padding:"1px 6px",letterSpacing:1,fontWeight:700}}>● ACTIVE</span>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:5}}>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.9)",fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>{isMobile?fD(phase.arrival):fDS(phase.arrival)} → {isMobile?fD(phase.departure):fDS(phase.departure)}</span>
            <span style={{fontSize:12,color:phase.color,fontWeight:900}}>🌙 {phase.totalNights}n</span>
            {phase.totalDives>0&&<span style={{fontSize:9,color:"#00E5FF"}}>🤿 {phase.totalDives}</span>}
          </div>
          {pct>0&&<div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:100,height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${phase.color}66,${phase.color})`,borderRadius:2,transition:"width 0.4s ease"}}/></div>
            <span style={{fontSize:11,color:`${phase.color}CC`,fontFamily:"monospace",fontWeight:700}}>{pct}% planned</span>
          </div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:900,color:"#FFD93D",fontFamily:"'Space Mono',monospace"}}>{fmt(phase.totalBudget)}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontFamily:"monospace"}}>{isPast?"COMPLETE":isNow?"IN PROGRESS":`${dUntil}d away`}</div>
        </div>
        <div style={{width:20,height:20,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.18":"0.07"})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:11,color:open?phase.color:"rgba(255,255,255,0.55)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▼</span>
        </div>
      </div>
      {open&&(
        <div style={{animation:"slideOpen 0.2s ease",background:"rgba(0,3,11,0.55)"}}>
          <div style={{padding:"6px 16px 6px 20px",borderTop:`1px solid ${phase.color}15`,borderBottom:"1px solid rgba(0,229,255,0.055)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:phase.color,flexShrink:0}}/>
            <span style={{fontSize:11,color:phase.color,letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>{phase.segments.length} SEGMENT{phase.segments.length>1?"S":""}</span>
            <span style={{fontSize:11,color:`${phase.color}88`,letterSpacing:2,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>· TAP SEGMENT TO EXPAND</span>
          </div>
          {phase.segments.map((seg,i)=><SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1}/>)}
        </div>
      )}
    </div>
  );
}

// ─── MissionConsole ───────────────────────────────────────────────
function MissionConsole({tripData,onNewTrip,onRevise,onPackConsole,isFullscreen,setFullscreen}) {
  const isMobile=useMobile();
  const [tab,setTab]=useState("next");
  const [confirmNewTrip,setConfirmNewTrip]=useState(false);
  const [showMobileMenu,setShowMobileMenu]=useState(false);
  const [explorerDest,setExplorerDest]=useState(null);
  const [explorerData,setExplorerData]=useState(()=>{try{const s=localStorage.getItem("1bn_intel");return s?JSON.parse(s):{}}catch(e){return{};}});
  const [loadingIntel,setLoadingIntel]=useState(false);
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

  const heroStats=[{label:"DEPARTS IN",value:daysToDepart,unit:"DAYS",color:uc,glow:uc},{label:"NIGHTS",value:totalNights,unit:"NIGHTS",color:"#A29BFE",glow:"rgba(162,155,254,0.4)"},...(totalDives>0?[{label:"DIVES",value:totalDives,unit:"DIVES",color:"#00E5FF",glow:"rgba(0,229,255,0.4)"}]:[]),{label:"BUDGET",value:fmt(totalBudget),unit:"TOTAL",color:"#FFD93D",glow:"rgba(255,217,61,0.35)"}];
  const TABS=[{id:"next",label:"🗺️ EXPEDITION"},{id:"budget",label:"💰 BUDGET"},{id:"book",label:"🔗 BOOK"},{id:"intel",label:"🔭 INTEL"}];

  return(
    <div className="mc-root" style={{animation:"fadeIn 0.6s ease both"}}>
      {!isFullscreen&&<ConsoleHeader console="trip" isMobile={isMobile} rightSlot={
        <div style={{display:"flex",alignItems:"center",gap:isMobile?6:8,flexShrink:0}}>
          {!isMobile&&<><div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:3,height:3,borderRadius:"50%",background:"#69F0AE",boxShadow:"0 0 5px #69F0AE80"}}/><span style={{fontSize:11,color:"#69F0AE",letterSpacing:1.5,fontFamily:"'Space Mono',monospace"}}>LIVE</span></div><div style={{fontSize:11,color:"rgba(255,255,255,0.6)",letterSpacing:1,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{TODAY.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase()}</div><div style={{width:1,height:12,background:"rgba(0,229,255,0.15)"}}/></>}
          <button onClick={onPackConsole} style={{display:"flex",flexDirection:"row",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:6,border:"1px solid rgba(196,87,30,0.65)",background:"linear-gradient(135deg,rgba(45,18,0,0.9),rgba(26,9,0,0.85))",color:"#FF9F43",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,animation:"launchPulse 3s ease-in-out infinite",minHeight:34,flexShrink:0}}>
            <span style={{fontSize:12,lineHeight:1}}>🎒</span><span style={{fontSize:12,letterSpacing:1.5,whiteSpace:"nowrap"}}>{isMobile?"PACK":"PACK CONSOLE"}</span>
          </button>
        </div>
      }/>}
      {!isFullscreen&&<div style={{padding:isMobile?"8px 12px 6px":"10px 16px 8px",background:"linear-gradient(180deg,rgba(0,20,45,0.95),rgba(0,8,20,0.98))",borderBottom:"1px solid rgba(0,229,255,0.15)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 50%,rgba(0,229,255,0.04) 0%,transparent 60%)",pointerEvents:"none"}}/>
        {tripData.tripName&&<div style={{marginBottom:isMobile?5:7,position:"relative"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:17,fontWeight:300,fontStyle:"italic",color:"#FFD93D",lineHeight:1,textShadow:"0 0 28px rgba(255,217,61,0.35)"}}>{tripData.tripName}</div>
          {!isMobile&&<div style={{fontSize:11,color:"rgba(0,229,255,0.55)",letterSpacing:2,marginTop:3,fontFamily:"'Space Mono',monospace"}}>{[...new Set(flatPhases.map(p=>p.country))].join(" · ")}</div>}
        </div>}
        <div style={{display:"grid",gridTemplateColumns:`repeat(${heroStats.length},1fr)`,position:"relative"}}>
          {heroStats.map((s,i)=>(
            <div key={s.label} style={{textAlign:"center",padding:isMobile?"2px 3px":"4px 6px",borderLeft:i>0?"1px solid rgba(0,229,255,0.1)":"none"}}>
              <div style={{fontSize:isMobile?9:11,fontWeight:700,color:"rgba(255,255,255,0.65)",letterSpacing:isMobile?0.5:2,marginBottom:isMobile?2:4,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>{s.label}</div>
              <div style={{fontSize:isMobile?16:26,fontWeight:900,lineHeight:1,color:s.color,textShadow:`0 0 20px ${s.glow}`,fontFamily:"'Space Mono',monospace"}}>{s.value}</div>
              <div style={{fontSize:isMobile?9:11,fontWeight:700,color:s.color,opacity:0.7,letterSpacing:isMobile?0.5:2,marginTop:isMobile?2:3,fontFamily:"'Space Mono',monospace"}}>{s.unit}</div>
            </div>
          ))}
        </div>
      </div>}
      {!isFullscreen&&<div style={{display:"flex",borderBottom:"1px solid rgba(0,229,255,0.1)",flexShrink:0}}>
        <div style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,borderRight:"1px solid rgba(0,229,255,0.1)",background:"rgba(0,229,255,0.04)"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#00E5FF",boxShadow:"0 0 6px #00E5FF",animation:"consolePulse 2.5s ease-in-out infinite"}}/>
          <span style={{fontSize:11,fontWeight:700,color:"#00E5FF",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>TRIP CONSOLE</span>
        </div>
        <div onClick={onPackConsole} style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",background:"transparent"}} onMouseOver={e=>e.currentTarget.style.background="rgba(196,87,30,0.08)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"rgba(196,87,30,0.4)"}}/>
          <span style={{fontSize:12,fontWeight:700,color:"rgba(255,159,67,0.65)",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>PACK CONSOLE</span>
        </div>
      </div>}
      {/* Tab bar */}
      {isMobile?(
        <div style={{flexShrink:0}}>
          <div style={{display:"flex",borderBottom:"1px solid #111D2A",background:"#060A0F",alignItems:"stretch"}}>
            {TABS.map(t=>(
              <button key={t.id} className={"mc-tab "+(tab===t.id?"active":"")} onClick={()=>{setTab(t.id);if(t.id!=="intel")setExplorerDest(null);}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"10px 4px",minWidth:0}}>
                <span style={{fontSize:16,lineHeight:1}}>{t.label.split(" ")[0]}</span>
                <span style={{fontSize:12,letterSpacing:1,fontWeight:700,whiteSpace:"nowrap",color:tab===t.id?"#00E5FF":"rgba(255,255,255,0.5)"}}>{t.label.split(" ").slice(1).join(" ")}</span>
              </button>
            ))}
            <button onClick={()=>setShowMobileMenu(m=>!m)} style={{width:48,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"10px 6px",background:showMobileMenu?"rgba(0,229,255,0.1)":"transparent",border:"none",borderLeft:"1px solid rgba(0,229,255,0.15)",cursor:"pointer",flexShrink:0}}>
              <span style={{fontSize:16,lineHeight:1,color:showMobileMenu?"#00E5FF":"rgba(255,255,255,0.5)"}}>⋯</span>
            </button>
          </div>
          {showMobileMenu&&(
            <div style={{background:"#060A0F",borderBottom:"1px solid rgba(0,229,255,0.15)",display:"flex",gap:0,animation:"slideOpen 0.15s ease"}}>
              <button onClick={()=>setFullscreen(f=>!f)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"12px 8px",background:isFullscreen?"rgba(0,229,255,0.1)":"transparent",border:"none",borderRight:"1px solid rgba(0,229,255,0.1)",cursor:"pointer",color:"#00E5FF"}}>
                <span style={{fontSize:16}}>{isFullscreen?"⊡":"⛶"}</span>
                <span style={{fontSize:12,letterSpacing:1,fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{isFullscreen?"EXIT":"EXPAND"}</span>
              </button>
              <button onClick={()=>{onRevise();setShowMobileMenu(false);}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"12px 8px",background:"transparent",border:"none",borderRight:"1px solid rgba(0,229,255,0.1)",cursor:"pointer"}}>
                <span style={{fontSize:16}}>✏️</span>
                <span style={{fontSize:12,letterSpacing:1,fontWeight:700,fontFamily:"'Space Mono',monospace",color:"#00E5FF"}}>REVISE</span>
              </button>
              <button onClick={()=>{handleNewTripClick();}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"12px 8px",background:confirmNewTrip?"rgba(255,107,107,0.15)":"transparent",border:"none",cursor:"pointer"}}>
                <span style={{fontSize:16,color:confirmNewTrip?"#FF6B6B":"#FFD93D"}}>{confirmNewTrip?"⚠️":"+"}</span>
                <span style={{fontSize:12,letterSpacing:1,fontWeight:700,fontFamily:"'Space Mono',monospace",color:confirmNewTrip?"#FF6B6B":"#FFD93D"}}>{confirmNewTrip?"CONFIRM?":"NEW TRIP"}</span>
              </button>
            </div>
          )}
        </div>
      ):(
        <div style={{display:"flex",borderBottom:"1px solid #111D2A",background:"#060A0F",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",alignItems:"stretch"}}>
          <button onClick={()=>setFullscreen(f=>!f)} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"10px 14px",background:isFullscreen?"rgba(0,229,255,0.15)":"rgba(0,229,255,0.06)",border:"none",borderRight:"1px solid rgba(0,229,255,0.2)",cursor:"pointer",flexShrink:0,color:"#00E5FF"}} onMouseOver={e=>e.currentTarget.style.background="rgba(0,229,255,0.22)"} onMouseOut={e=>e.currentTarget.style.background=isFullscreen?"rgba(0,229,255,0.15)":"rgba(0,229,255,0.06)"}>
            <span style={{fontSize:14,lineHeight:1,textShadow:"0 0 10px rgba(0,229,255,0.9)"}}>{isFullscreen?"⊡":"⛶"}</span>
            <span style={{fontSize:11,letterSpacing:1,fontWeight:700,whiteSpace:"nowrap"}}>{isFullscreen?"EXIT":"EXPAND"}</span>
          </button>
          <div style={{display:"flex",flex:1,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} className={"mc-tab "+(tab===t.id?"active":"")} onClick={()=>{setTab(t.id);if(t.id!=="intel")setExplorerDest(null);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"9px 12px",minWidth:44}}>
                <span style={{fontSize:12}}>{t.label.split(" ")[0]}</span>
                <span style={{fontSize:12,letterSpacing:1.5}}>{t.label.split(" ").slice(1).join(" ")}</span>
              </button>
            ))}
          </div>
          <button onClick={onRevise} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 12px",background:"rgba(0,229,255,0.06)",border:"none",borderLeft:"1px solid rgba(0,229,255,0.15)",cursor:"pointer",flexShrink:0}} onMouseOver={e=>e.currentTarget.style.background="rgba(0,229,255,0.14)"} onMouseOut={e=>e.currentTarget.style.background="rgba(0,229,255,0.06)"}>
            <span style={{fontSize:12,lineHeight:1}}>✏️</span><span style={{fontSize:11,letterSpacing:1,fontFamily:"'Space Mono',monospace",color:"#00E5FF",whiteSpace:"nowrap",fontWeight:700}}>REVISE</span>
          </button>
          <button onClick={handleNewTripClick} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 14px",borderLeft:confirmNewTrip?"1px solid rgba(255,107,107,0.5)":"1px solid rgba(169,70,29,0.4)",background:confirmNewTrip?"rgba(255,107,107,0.15)":"rgba(169,70,29,0.08)",border:"none",cursor:"pointer",flexShrink:0,transition:"all 0.2s",minWidth:confirmNewTrip?72:50}} onMouseOver={e=>e.currentTarget.style.background=confirmNewTrip?"rgba(255,107,107,0.22)":"rgba(169,70,29,0.18)"} onMouseOut={e=>e.currentTarget.style.background=confirmNewTrip?"rgba(255,107,107,0.15)":"rgba(169,70,29,0.08)"}>
            <span style={{fontSize:12,color:confirmNewTrip?"#FF6B6B":"#FFD93D",lineHeight:1}}>{confirmNewTrip?"⚠️":"+"}</span>
            <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:confirmNewTrip?"#FF6B6B":"#FFD93D",whiteSpace:"nowrap",fontWeight:700,textAlign:"center"}}>{confirmNewTrip?"CONFIRM?":"NEW TRIP"}</span>
          </button>
        </div>
      )}
      {confirmNewTrip&&<div style={{padding:"7px 14px",background:"rgba(255,107,107,0.1)",borderBottom:"1px solid rgba(255,107,107,0.3)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{fontSize:9,color:"rgba(255,107,107,0.9)",letterSpacing:1}}>⚠️ This will clear your expedition. Tap CONFIRM? again to proceed.</span>
        <button onClick={()=>setConfirmNewTrip(false)} style={{fontSize:9,color:"rgba(255,255,255,0.4)",background:"none",border:"none",cursor:"pointer",padding:"2px 6px"}}>✕</button>
      </div>}
      <div className="mc-content">
        {tab==="next"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {tripData.visionNarrative&&<div style={{marginBottom:8}}><div style={{fontSize:11,color:"rgba(255,217,61,0.85)",letterSpacing:3,fontFamily:"'Space Mono',monospace",marginBottom:6}}>✦ EXPEDITION VISION</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?12:13,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.7,borderLeft:"2px solid rgba(255,217,61,0.3)",paddingLeft:10}}>"{tripData.visionNarrative.slice(0,160)}{tripData.visionNarrative.length>160?"...":""}"</div></div>}
            <div style={{fontSize:isMobile?10:12,color:"#00E5FF",letterSpacing:isMobile?2:3,marginBottom:4,fontWeight:700,fontFamily:"'Space Mono',monospace",whiteSpace:isMobile?"normal":"nowrap"}}>{isMobile?`YOUR EXPEDITION · ${segPhases.length} PHASES`:`YOUR EXPEDITION · ${segPhases.length} PHASES · TAP PHASE TO EXPAND`}</div>
            {isMobile&&<div style={{fontSize:11,color:"rgba(0,229,255,0.55)",letterSpacing:2,marginBottom:4,fontFamily:"'Space Mono',monospace"}}>TAP PHASE TO EXPAND</div>}
            {segPhases.map((phase,i)=><PhaseCard key={phase.id} phase={phase} intelData={explorerData} idx={i}/>)}
          </div>
        )}
        {tab==="budget"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[{label:"EXPEDITION TOTAL",value:fmt(totalBudget),color:"#FFD93D",sub:`across ${flatPhases.length} phases`},{label:"AVG / NIGHT",value:fmt(totalBudget/Math.max(totalNights,1)),color:"#A29BFE",sub:`${totalNights} nights`},{label:"AVG / PHASE",value:fmt(totalBudget/Math.max(flatPhases.length,1)),color:"#00E5FF",sub:"per destination"}].map((s,si)=>(
                <div key={s.label} style={{background:"linear-gradient(135deg,rgba(0,8,20,0.8),rgba(0,20,40,0.6))",border:"1px solid rgba(0,229,255,0.12)",borderRadius:10,padding:isMobile?"8px 10px":"12px 14px",textAlign:"center",gridColumn:isMobile&&si===2?"1 / -1":"auto"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",letterSpacing:2,marginBottom:4}}>{s.label}</div>
                  <div style={{fontSize:isMobile?14:22,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:3}}>{s.sub}</div>
                </div>
              ))}
            </div>
            {flatPhases.map(phase=>{
              const budget=phase.budget||phase.cost||0;
              const pct=(budget/Math.max(...flatPhases.map(p=>p.budget||p.cost||0)))*100;
              return(
                <div key={phase.id} style={{background:"rgba(0,8,20,0.5)",border:"1px solid rgba(0,229,255,0.08)",borderRadius:8,padding:"9px 13px",borderLeft:"3px solid "+phase.color,marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                      <span style={{fontSize:13}}>{phase.flag}</span>
                      <div><div style={{fontSize:11,fontWeight:700,color:"#FFF"}}>{phase.name}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>{phase.nights}n · {phase.country}</div></div>
                    </div>
                    <span style={{fontSize:14,fontWeight:900,color:phase.color,fontFamily:"'Space Mono',monospace",flexShrink:0,marginLeft:8}}>{fmt(budget)}</span>
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${phase.color}88,${phase.color})`,borderRadius:3,transition:"width 0.6s ease"}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><div style={{fontSize:11,color:"rgba(255,255,255,0.55)"}}>{fmt(Math.round(budget/Math.max(phase.nights,1)))}/night</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>{Math.round(pct)}% of highest</div></div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="book"&&(
          <div>
            <div style={{fontSize:9,color:"#FFD93D",letterSpacing:3,marginBottom:4}}>BOOK YOUR EXPEDITION</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.65)",marginBottom:14}}>Links open in new tab</div>
            {flatPhases.map(phase=>{
              const dest=encodeURIComponent(phase.name);
              const LINKS=[{icon:"✈️",label:"Google Flights",color:"#00E5FF",url:"https://www.google.com/flights"},{icon:"✈️",label:"Skyscanner",color:"#00E5FF",url:"https://www.skyscanner.com/transport/flights/"+dest},{icon:"🏠",label:"Airbnb",color:"#69F0AE",url:"https://www.airbnb.com/s/"+dest+"/homes"},{icon:"🏨",label:"Booking.com",color:"#69F0AE",url:"https://www.booking.com/searchresults.html?ss="+dest},{icon:"🎯",label:"Klook",color:"#FF9F43",url:"https://www.klook.com/en-US/search/?query="+dest},{icon:"🗺️",label:"Viator",color:"#FF9F43",url:"https://www.viator.com/searchResults/all?text="+dest},{icon:"🤿",label:"PADI Dive Ops",color:"#00E5FF",url:"https://www.padi.com/dive-shop?q="+dest}];
              return(
                <div key={phase.id} style={{background:"#0C1520",border:"1px solid "+phase.color+"22",borderRadius:10,marginBottom:10,overflow:"hidden"}}>
                  <div style={{padding:"10px 13px",borderBottom:"1px solid "+phase.color+"22",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{phase.flag}</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:phase.color}}>{phase.name}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.7)"}}>{phase.arrival} · {phase.nights} nights</div></div><div style={{fontSize:12,fontWeight:700,color:"#FFD93D"}}>{fmt(phase.budget||phase.cost||0)}</div></div>
                  <div style={{padding:"10px 13px",display:"flex",flexWrap:"wrap",gap:6}}>
                    {LINKS.filter(l=>phase.diveCount>0||l.label!=="PADI Dive Ops").map(link=>(
                      <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:5,padding:isMobile?"8px 13px":"6px 11px",background:link.color+"10",border:"1px solid "+link.color+"33",borderRadius:20,textDecoration:"none",minHeight:36}}>
                        <span style={{fontSize:11}}>{link.icon}</span><span style={{fontSize:isMobile?10:9,color:link.color,fontFamily:"'Space Mono',monospace"}}>{link.label}</span><span style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* arch #2: full INTEL tab preserved */}
        {tab==="intel"&&(
          <div>
            {!explorerDest?(
              <div>
                <div style={{fontSize:9,color:"#FFD93D",letterSpacing:3,marginBottom:14}}>SELECT A PHASE · FOR DESTINATION INTEL</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8}}>
                  {flatPhases.map(phase=>(
                    <button key={phase.id} onClick={()=>openIntel(phase.name,phase.name,phase.type)} style={{background:phase.color+"08",border:"1px solid "+phase.color+"33",borderRadius:8,padding:"11px 12px",cursor:"pointer",textAlign:"left",minHeight:60}}>
                      <div style={{fontSize:12,color:phase.color,marginBottom:3}}>{phase.flag} Phase {phase.id}</div>
                      <div style={{fontSize:12,fontWeight:700,color:"#FFF"}}>{phase.name}</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,0.5)",marginTop:2}}>{TI[phase.type]} {phase.type}</div>
                    </button>
                  ))}
                </div>
              </div>
            ):(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
                  <button onClick={()=>setExplorerDest(null)} style={{background:"none",border:"1px solid #111D2A",borderRadius:4,color:"#FFF",fontSize:9,padding:"4px 9px",cursor:"pointer",minHeight:36,marginRight:10}}>← BACK</button>
                  <div><div style={{fontSize:15,fontWeight:700,color:"#FFF"}}>{explorerDest.destination}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.5)",letterSpacing:2}}>{TI[explorerDest.type]} {explorerDest.type?.toUpperCase()}</div></div>
                </div>
                {loadingIntel?<div>{[80,65,72,55,68].map((w,i)=><div key={i} className="loading-skeleton" style={{width:w+"%"}}/>)}<div style={{color:"rgba(255,255,255,0.4)",fontSize:9,letterSpacing:2,marginTop:6}}>LOADING INTEL...</div></div>
                :explorerData[explorerDest.destination]?(()=>{
                  const d=explorerData[explorerDest.destination];
                  if(d.error)return(<div style={{textAlign:"center",padding:"30px 20px"}}><div style={{fontSize:32,marginBottom:16}}>📡</div><div style={{fontSize:12,color:"#FF6B6B",marginBottom:8,fontFamily:"'Space Mono',monospace"}}>Intel unavailable</div><div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:20,lineHeight:1.6}}>{d.errorMsg}</div><button style={{background:"rgba(255,107,107,0.15)",border:"1px solid #FF6B6B44",borderRadius:8,color:"#FF6B6B",fontSize:12,padding:"10px 20px",cursor:"pointer",fontFamily:"monospace",minHeight:44}} onClick={()=>{setExplorerData(p=>({...p,[explorerDest.destination]:undefined}));openIntel(explorerDest.destination,explorerDest.phaseName,explorerDest.type);}}>↺ RETRY</button></div>);
                  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {d.tagline&&<div style={{fontSize:13,color:"#A29BFE",fontStyle:"italic",borderLeft:"3px solid #A29BFE",paddingLeft:11}}>{d.tagline}</div>}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                      {d.mustDo&&<div className="intel-section"><div className="intel-section-label" style={{color:"#00E5FF"}}>⚡ MUST DO</div>{d.mustDo.map((item,i)=><div key={i} style={{fontSize:isMobile?11:10,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.hiddenGems&&<div className="intel-section"><div className="intel-section-label" style={{color:"#69F0AE"}}>💎 HIDDEN GEMS</div>{d.hiddenGems.map((item,i)=><div key={i} style={{fontSize:isMobile?11:10,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.food&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FFD93D"}}>🍽️ FOOD</div>{d.food.map((item,i)=><div key={i} style={{fontSize:isMobile?11:10,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                      {d.warnings?.length>0&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FF6B6B"}}>⚠️ HEADS UP</div>{d.warnings.map((item,i)=><div key={i} style={{fontSize:isMobile?11:10,color:"#FFF",marginBottom:3}}>• {item}</div>)}</div>}
                    </div>
                    {d.streetIntel?.length>0&&<div style={{background:"linear-gradient(135deg,rgba(255,107,107,0.07),rgba(255,159,67,0.05))",border:"1px solid rgba(255,107,107,0.4)",borderRadius:10,padding:13}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><div style={{width:7,height:7,borderRadius:"50%",background:"#FF6B6B",boxShadow:"0 0 8px #FF6B6B"}}/><div style={{fontSize:12,color:"#FF6B6B",letterSpacing:3,fontWeight:700}}>STREET INTEL</div></div>
                      {d.streetIntel.map((intel,i)=>{const tc2={SCAM:"#FF6B6B",LEGAL:"#FFD93D",HEALTH:"#69F0AE",MONEY:"#FF9F43"};const ti2={SCAM:"🎭",LEGAL:"⚖️",HEALTH:"🏥",MONEY:"💸"};const c=tc2[intel.type]||"#FF6B6B";return(<div key={i} className="street-card" style={{borderLeft:`3px solid ${c}`}}><span style={{fontSize:14,flexShrink:0}}>{ti2[intel.type]||"⚠️"}</span><div><div style={{fontSize:12,letterSpacing:2,fontWeight:700,marginBottom:3,color:c}}>{intel.type}</div><div style={{fontSize:12,color:"#FFF",lineHeight:1.6}}>{intel.alert}</div></div></div>);})}
                    </div>}
                    {d.culture&&<div className="intel-section"><div className="intel-section-label" style={{color:"#A29BFE"}}>🏛️ CULTURE & VIBE</div><div style={{fontSize:isMobile?12:11,color:"#FFF",lineHeight:1.6}}>{d.culture}</div></div>}
                    {d.climate&&<div className="intel-section"><div className="intel-section-label" style={{color:"#FF9F43"}}>🌤️ CLIMATE</div><div style={{fontSize:isMobile?12:11,color:"#FFF"}}>{d.climate}</div></div>}
                    {d.diveHighlight&&<div className="intel-section" style={{borderColor:"rgba(0,229,255,0.2)"}}><div className="intel-section-label" style={{color:"#00E5FF"}}>🤿 DIVE INTEL</div><div style={{fontSize:isMobile?12:11,color:"#FFF"}}>{d.diveHighlight}</div></div>}
                  </div>);
                })():null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PackConsole ──────────────────────────────────────────────────
function PackConsole({tripData,onExpedition,isFullscreen,setFullscreen}) {
  const isMobile=useMobile();
  const CATS=[
    {id:"clothes",label:"Clothes",icon:"👕",color:"#FFD93D"},
    {id:"tech",label:"Tech",icon:"💻",color:"#00D4FF"},
    {id:"creator",label:"Creator",icon:"🎥",color:"#FF9F43"},
    {id:"dive",label:"Dive",icon:"🤿",color:"#00E5FF"},
    {id:"health",label:"Health",icon:"🏥",color:"#69F0AE"},
    {id:"travel",label:"Travel",icon:"🧳",color:"#55EFC4"},
    {id:"docs",label:"Docs",icon:"📄",color:"#E0E0E0"},
  ];
  const BAGS=["Backpack","Global Briefcase","Worn","Digital","Day Bag"];
  const WL=15,KGL=7,VL=45;
  const BAG_C={"Backpack":"#00E5FF","Global Briefcase":"#A29BFE","Worn":"#FFD93D","Digital":"#69F0AE","Day Bag":"#FF9F43"};

  const [packTab,setPackTab]=useState("pack");
  const [items,setItems]=useState(()=>{try{const s=localStorage.getItem("1bn_pack_v5");if(s){const p=JSON.parse(s);if(p?.length>0)return p;}}catch(e){}return getDefaultPack();});
  const [filterCat,setFilterCat]=useState("all");
  const [openCats,setOpenCats]=useState({});
  const [unit,setUnit]=useState("lbs");
  const [expandedItem,setExpandedItem]=useState(null);
  const [resetConfirm,setResetConfirm]=useState(false);
  const [suggestions,setSuggestions]=useState([]);
  const [suggestLoading,setSuggestLoading]=useState(false);
  const [suggestDone,setSuggestDone]=useState(false);
  const [accepted,setAccepted]=useState([]);
  const [chat,setChat]=useState([]);
  const [chatInput,setChatInput]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const chatEnd=useRef(null);

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  useEffect(()=>{try{localStorage.setItem("1bn_pack_v5",JSON.stringify(items));}catch(e){};},[items]);
  useEffect(()=>{if(packTab==="refine"&&!suggestDone&&!suggestLoading){const t=setTimeout(()=>genSuggestions(),800);return()=>clearTimeout(t);}},[ packTab]);

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

  async function genSuggestions(){
    setSuggestLoading(true);
    const existing=items.map(i=>i.name.toLowerCase());
    const raw=await askAI(`Quiet luxury gear concierge."${goalLabel}",${totalNights}n,${countries.join(",")}.Types:${tripTypes.join(",")}.Has:${existing.slice(0,15).join(",")}.Suggest 6-8 MISSING items.Return ONLY JSON array:[{"name","cat","reason","weight":0.2,"volume":0.3,"cost":25,"bag":"Backpack","priority":"essential|nice-to-have"}]`,1000);
    const parsed=parseJSON(raw);
    if(parsed&&Array.isArray(parsed))setSuggestions(parsed.map((s,i)=>({...s,id:"s"+Date.now()+i})));
    setSuggestLoading(false);setSuggestDone(true);
  }
  const acceptSuggestion=s=>{setItems(p=>[...p,{id:Date.now(),name:s.name,cat:s.cat||"travel",weight:s.weight||0,volume:s.volume||0,cost:s.cost||0,bag:s.bag||"Backpack",owned:false,status:"needed"}]);setAccepted(p=>[...p,s.id]);setSuggestions(p=>p.filter(x=>x.id!==s.id));};
  const dismissSuggestion=id=>setSuggestions(p=>p.filter(s=>s.id!==id));
  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return;
    const msg=chatInput;setChatInput("");setChat(p=>[...p,{role:"user",text:msg}]);setChatLoading(true);
    const res=await askAI(`Quiet luxury gear concierge.Trip:"${goalLabel}",${totalNights}n,${countries.join(",")}.Pack:${items.map(i=>i.name).join(",")}.User:"${msg}".2 sentences max.`,300);
    setChat(p=>[...p,{role:"ai",text:res}]);setChatLoading(false);
  }

  // ─── Item Row (inline expand like SegmentRow) ──────────────────
  function PackItemRow({item,catColor,isLast}) {
    const [open,setOpen]=useState(false);
    const CAT_COLORS_P={docs:"#E0E0E0",tech:"#00D4FF",clothes:"#FFD93D",health:"#69F0AE",travel:"#55EFC4",creator:"#FF9F43",dive:"#00E5FF"};
    return(
      <div style={{borderBottom:isLast?"none":"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",minHeight:52,borderLeft:`2px solid ${catColor}${open?"88":"22"}`}}>
          {/* Owned toggle */}
          <button onClick={e=>{e.stopPropagation();toggleOwned(item.id);}} style={{width:44,height:"100%",minHeight:52,display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>
            <div style={{width:20,height:20,borderRadius:4,border:`1.5px solid ${item.owned?"#69F0AE":"rgba(255,255,255,0.2)"}`,background:item.owned?"rgba(105,240,174,0.12)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
              {item.owned&&<span style={{color:"#69F0AE",fontSize:12,fontWeight:900,lineHeight:1}}>✓</span>}
            </div>
          </button>
          {/* Main row — tap to expand */}
          <div onClick={()=>setOpen(o=>!o)} style={{flex:1,display:"flex",alignItems:"center",gap:12,padding:"12px 8px 12px 4px",cursor:"pointer",minWidth:0}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:700,color:item.owned?"rgba(105,240,174,0.85)":"#FFF",fontFamily:"'Space Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4}}>{item.name||"Unnamed"}</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {parseFloat(item.weight)>0&&<span style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"monospace"}}>{(parseFloat(item.weight)*wM).toFixed(2)}{unit}</span>}
                {parseFloat(item.cost)>0&&<span style={{fontSize:13,color:"rgba(255,217,61,0.75)",fontFamily:"monospace"}}>${item.cost}</span>}
                <span style={{fontSize:12,color:BAG_C[item.bag]||"rgba(255,159,67,0.6)",fontFamily:"monospace"}}>{item.bag}</span>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
              <div style={{padding:"5px 14px",borderRadius:10,background:item.owned?"rgba(105,240,174,0.08)":"rgba(196,87,30,0.1)",border:`1px solid ${item.owned?"rgba(105,240,174,0.3)":"rgba(196,87,30,0.3)"}`,fontSize:12,fontWeight:700,color:item.owned?"#69F0AE":"#C4571E",letterSpacing:0.5}}>{item.owned?"OWNED":"NEED"}</div>
              <div style={{width:22,height:22,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.6)",transform:open?"rotate(180deg)":"none",display:"inline-block",transition:"transform 0.2s"}}>▼</span>
              </div>
            </div>
          </div>
        </div>
        {/* Expanded edit drawer */}
        {open&&(
          <div style={{padding:"12px 16px 16px 44px",background:"rgba(0,0,0,0.25)",borderTop:`1px solid ${catColor}15`,animation:"slideOpen 0.18s ease",display:"flex",flexDirection:"column",gap:10}}>
            <input value={item.name} onChange={e=>updateItem(item.id,"name",e.target.value)} style={{background:"rgba(18,11,0,0.9)",border:"1px solid rgba(169,70,29,0.4)",borderRadius:7,color:"#FFF",fontSize:13,padding:"10px 13px",fontFamily:"'Space Mono',monospace",outline:"none",width:"100%"}} placeholder="Item name"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{label:"WEIGHT (lbs)",f:"weight"},{label:"COST ($)",f:"cost"},{label:"VOLUME (L)",f:"volume"}].map(({label,f})=>(
                <div key={f}>
                  <div style={{fontSize:12,color:"rgba(255,159,67,0.65)",letterSpacing:2,marginBottom:5,fontFamily:"monospace"}}>{label}</div>
                  <input value={item[f]} onChange={e=>updateItem(item.id,f,e.target.value)} style={{background:"rgba(18,11,0,0.9)",border:"1px solid rgba(169,70,29,0.3)",borderRadius:5,color:"#FFD93D",fontSize:13,padding:"8px 10px",outline:"none",fontFamily:"monospace",width:"100%"}}/>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:12,color:"rgba(255,159,67,0.65)",letterSpacing:2,marginBottom:5,fontFamily:"monospace"}}>BAG</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {BAGS.map(b=>(
                  <button key={b} onClick={()=>updateItem(item.id,"bag",b)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${item.bag===b?BAG_C[b]||"#FF9F43":"rgba(255,255,255,0.12)"}`,background:item.bag===b?"rgba(255,255,255,0.07)":"transparent",color:item.bag===b?BAG_C[b]||"#FF9F43":"rgba(255,255,255,0.45)",fontSize:12,cursor:"pointer",fontFamily:"monospace",fontWeight:item.bag===b?700:400,transition:"all 0.15s"}}>{b}</button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8,paddingTop:4}}>
              <button onClick={()=>toggleOwned(item.id)} style={{flex:1,padding:"10px",borderRadius:7,border:`1px solid ${item.owned?"rgba(105,240,174,0.4)":"rgba(196,87,30,0.4)"}`,background:item.owned?"rgba(105,240,174,0.08)":"rgba(169,70,29,0.1)",color:item.owned?"#69F0AE":"#FF9F43",fontSize:12,cursor:"pointer",fontFamily:"monospace",fontWeight:700,letterSpacing:1}}>{item.owned?"✓ OWNED — TAP TO UNMARK":"TAP TO MARK OWNED"}</button>
              <button onClick={()=>removeItem(item.id)} style={{padding:"10px 16px",borderRadius:7,border:"1px solid rgba(255,107,107,0.3)",background:"rgba(255,107,107,0.06)",color:"rgba(255,107,107,0.7)",fontSize:13,cursor:"pointer",fontFamily:"monospace",fontWeight:700}}>✕</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Category Accordion Card (mirrors PhaseCard) ───────────────
  function CatCard({cat,idx}) {
    const catItems=itemsForCat(cat.id);
    const open=!!openCats[cat.id];
    const ownedInCat=catItems.filter(i=>i.owned).length;
    const catW=catItems.reduce((s,i)=>s+(parseFloat(i.weight)||0),0)*wM;
    const catCost=catItems.reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
    if(catItems.length===0&&filterCat!=="all"&&filterCat!==cat.id)return null;
    return(
      <div style={{borderRadius:13,border:open?`1.5px solid ${cat.color}`:"1px solid rgba(255,255,255,0.07)",boxShadow:open?`0 0 0 1px ${cat.color}22,0 4px 28px ${cat.color}18,inset 0 1px 0 ${cat.color}12`:"none",background:open?`linear-gradient(145deg,${cat.color}06,rgba(8,3,0,0.98))`:"rgba(18,8,0,0.85)",overflow:"hidden",transition:"all 0.25s",animation:`fadeUp 0.3s ease ${idx*.05}s both`,marginBottom:8}}>
        {/* Header row — tap to open */}
        <div onClick={()=>toggleCat(cat.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px",cursor:"pointer",minHeight:64,borderLeft:`3px solid ${open?cat.color:cat.color+"44"}`}}>
          <div style={{fontSize:22,flexShrink:0}}>{cat.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:18,fontWeight:700,color:open?cat.color:"#FFF",fontFamily:"'Space Mono',monospace",marginBottom:5,transition:"color 0.2s"}}>{cat.label}</div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"monospace"}}>{catItems.length} item{catItems.length!==1?"s":""}</span>
              {catW>0&&<span style={{fontSize:13,color:cat.color,fontWeight:700,fontFamily:"monospace"}}>{catW.toFixed(2)}{unit}</span>}
              <span style={{fontSize:13,color:"rgba(255,255,255,0.55)",fontFamily:"monospace"}}>{ownedInCat}/{catItems.length} owned</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
            {catCost>0&&<div style={{fontSize:14,fontWeight:900,color:"#FFD93D",fontFamily:"'Space Mono',monospace"}}>${catCost.toLocaleString()}</div>}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:60,height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(catItems.length>0?(ownedInCat/catItems.length)*100:0)+"%",background:`linear-gradient(90deg,${cat.color}66,${cat.color})`,borderRadius:2,transition:"width 0.4s ease"}}/></div>
            </div>
          </div>
          <div style={{width:22,height:22,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.2":"0.08"})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:4}}>
            <span style={{fontSize:12,color:open?cat.color:"rgba(255,255,255,0.45)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▼</span>
          </div>
        </div>
        {/* Items */}
        {open&&(
          <div style={{animation:"slideOpen 0.2s ease",background:"rgba(0,0,0,0.2)"}}>
            <div style={{padding:"6px 18px 6px 18px",borderTop:`1px solid ${cat.color}15`,borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:4,height:4,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
              <span style={{fontSize:13,color:cat.color,letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{catItems.length} ITEM{catItems.length!==1?"S":""} · TAP TO EXPAND</span>
            </div>
            {catItems.map((item,i)=><PackItemRow key={item.id} item={item} catColor={cat.color} isLast={i===catItems.length-1}/>)}
            {/* Add item row */}
            <div style={{padding:"10px 18px",borderTop:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"center"}}>
              <button onClick={()=>addItemToCat(cat.id)} style={{padding:"8px 20px",borderRadius:8,border:`1px dashed ${cat.color}44`,background:"transparent",color:`${cat.color}88`,fontSize:11,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:1,fontWeight:700,transition:"all 0.15s"}} onMouseOver={e=>{e.currentTarget.style.background=`${cat.color}10`;e.currentTarget.style.color=cat.color;}} onMouseOut={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=`${cat.color}88`;}}>+ ADD ITEM</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return(
    <div style={{fontFamily:"'Space Mono',monospace",background:"radial-gradient(ellipse at 20% 0%,#2d1200 0%,#1a0900 28%,#0d0500 58%,#060200 100%)",minHeight:"100vh",color:"#FFF",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      {!isFullscreen&&<ConsoleHeader console="pack" isMobile={isMobile} rightSlot={
        <button onClick={onExpedition} style={{display:"flex",flexDirection:"row",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:6,border:"1px solid rgba(0,229,255,0.55)",background:"linear-gradient(135deg,rgba(0,20,45,0.92),rgba(0,40,70,0.8))",color:"#00E5FF",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,animation:"consolePulse 3s ease-in-out infinite",minHeight:34,flexShrink:0}}>
          <span style={{fontSize:12,lineHeight:1}}>🔭</span><span style={{fontSize:12,letterSpacing:1.5,whiteSpace:"nowrap"}}>{isMobile?"TRIP":"TRIP CONSOLE"}</span>
        </button>
      }/>}
      {/* Console switcher */}
      {!isFullscreen&&<div style={{display:"flex",borderBottom:"1px solid rgba(196,87,30,0.3)",flexShrink:0}}>
        <div onClick={onExpedition} style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",borderRight:"1px solid rgba(196,87,30,0.2)"}} onMouseOver={e=>e.currentTarget.style.background="rgba(0,229,255,0.06)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"rgba(0,229,255,0.4)"}}/>
          <span style={{fontSize:12,fontWeight:700,color:"rgba(0,229,255,0.6)",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>TRIP CONSOLE</span>
        </div>
        <div style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"rgba(196,87,30,0.06)"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#FF9F43",boxShadow:"0 0 6px rgba(196,87,30,0.8)",animation:"launchPulse 2.5s ease-in-out infinite"}}/>
          <span style={{fontSize:12,fontWeight:700,color:"#FF9F43",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>PACK CONSOLE</span>
        </div>
      </div>}
      {/* Hero stats */}
      {!isFullscreen&&<div style={{padding:isMobile?"8px 14px 6px":"12px 20px 8px",background:"linear-gradient(180deg,rgba(35,14,0,0.6),rgba(20,8,0,0.8))"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {/* Weight hero */}
          <div style={{background:"rgba(21,101,255,0.07)",border:"1px solid rgba(77,159,255,0.3)",borderRadius:10,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700,color:"#4D9FFF",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>⚖️ PACK WEIGHT</div>
              <div onClick={()=>setUnit(u=>u==="lbs"?"kg":"lbs")} style={{display:"flex",borderRadius:8,border:"1px solid rgba(77,159,255,0.4)",overflow:"hidden",cursor:"pointer"}}>
                {["lbs","kg"].map(u=><div key={u} style={{padding:"4px 10px",fontSize:11,fontWeight:700,background:unit===u?"rgba(77,159,255,0.3)":"rgba(77,159,255,0.05)",color:unit===u?"#4D9FFF":"rgba(77,159,255,0.3)",borderLeft:u==="kg"?"1px solid rgba(77,159,255,0.3)":"none"}}>{u.toUpperCase()}</div>)}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:7}}>
              <div style={{fontSize:isMobile?28:34,fontWeight:900,color:"#69F0AE",lineHeight:1,letterSpacing:-1,fontFamily:"'Space Mono',monospace"}}>{(bpW*wM).toFixed(1)}</div>
              <div style={{fontSize:13,color:"rgba(77,159,255,0.75)",fontWeight:700}}>{unit}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginLeft:2}}>/ {wLim}</div>
            </div>
            <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",marginBottom:5}}>
              <div style={{height:"100%",width:Math.min((bpW/wLim)*100,100)+"%",background:`linear-gradient(90deg,#1565FF,${(bpW*wM)>wLim?"#FF6B6B":"#4D9FFF"})`,borderRadius:4,transition:"width 0.4s ease"}}/>
            </div>
            <div style={{fontSize:13,color:"rgba(77,159,255,0.8)",fontFamily:"monospace",fontWeight:700}}>{Math.round((bpW/wLim)*100)}% of {wLim}{unit} limit</div>
          </div>
          {/* Volume hero */}
          {(()=>{
            const zeroV=items.filter(i=>i.bag==="Backpack"&&(parseFloat(i.volume)||0)===0).length;
            const bpItems=items.filter(i=>i.bag==="Backpack").length;
            const incomplete=bpItems>0&&(zeroV/bpItems)>0.4;
            const dV=Math.min(bpV,VL),vPct=Math.min((bpV/VL)*100,100);
            return(<div style={{background:"rgba(169,70,29,0.08)",border:"1px solid rgba(196,87,30,0.5)",borderRadius:10,padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:"#FFD93D",letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>📦 PACK VOLUME</div>
                {incomplete&&<div style={{padding:"3px 8px",borderRadius:8,border:"1px solid rgba(255,159,67,0.4)",background:"rgba(255,159,67,0.1)",color:"#FF9F43",fontSize:9,fontFamily:"monospace",fontWeight:700}}>⚠ PARTIAL</div>}
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:7}}>
                <div style={{fontSize:isMobile?28:34,fontWeight:900,color:"#FFD93D",lineHeight:1,letterSpacing:-1,fontFamily:"'Space Mono',monospace"}}>{dV.toFixed(1)}</div>
                <div style={{fontSize:13,color:"rgba(255,217,61,0.75)",fontWeight:700}}>L</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginLeft:2}}>/ {VL}L</div>
              </div>
              <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",marginBottom:5}}>
                <div style={{height:"100%",width:vPct+"%",background:"linear-gradient(90deg,#A9461D,#FFD93D)",borderRadius:4,transition:"width 0.4s ease"}}/>
              </div>
              {incomplete?<div style={{fontSize:12,color:"rgba(255,159,67,0.7)",fontFamily:"monospace",fontWeight:700}}>⚠ {zeroV} items missing volume data</div>:<div style={{fontSize:12,color:"rgba(255,217,61,0.55)",fontFamily:"monospace",fontWeight:700}}>{Math.round(vPct)}% of 45L</div>}
            </div>);
          })()}
        </div>
        {/* 4 mini stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
          {[{label:"PERSONAL BAG",value:(gbW*wM).toFixed(1)+unit,color:"#64B4FF"},{label:"GEAR READY",value:gearPct+"%",color:"#A29BFE"},{label:"STILL NEED",value:"$"+Math.round(neededCost).toLocaleString(),color:"#FFD93D"},{label:"TOTAL ITEMS",value:items.length,color:"#FF9F43"}].map(s=>(
            <div key={s.label} style={{background:"rgba(169,70,29,0.06)",border:"1px solid rgba(196,87,30,0.4)",borderRadius:7,padding:"7px 8px",textAlign:"center"}}>
              <div style={{fontSize:isMobile?10:12,fontWeight:700,color:"rgba(255,255,255,0.6)",letterSpacing:0.5,marginBottom:5,fontFamily:"'Space Mono',monospace",lineHeight:1.2}}>{s.label}</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>}
      {/* Tab bar */}
      <div style={{display:"flex",alignItems:"stretch",background:"rgba(12,5,0,0.98)",borderBottom:"1px solid rgba(196,87,30,0.2)"}}>
        <button onClick={()=>setFullscreen(f=>!f)} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"10px 14px",background:isFullscreen?"rgba(255,159,67,0.15)":"rgba(255,159,67,0.06)",border:"none",borderRight:"1px solid rgba(196,87,30,0.3)",cursor:"pointer",flexShrink:0,color:"#FFD93D"}}>
          <span style={{fontSize:14,lineHeight:1}}>{isFullscreen?"⊡":"⛶"}</span>
          <span style={{fontSize:11,letterSpacing:1,fontWeight:700,whiteSpace:"nowrap"}}>{isFullscreen?"EXIT":"EXPAND"}</span>
        </button>
        {[{id:"pack",label:"PACK LIST",emoji:"🎒"},{id:"refine",label:"✦ REFINE",emoji:""},{id:"weight",label:"BREAKDOWN",emoji:"⚖️"}].map(t=>(
          <button key={t.id} onClick={()=>setPackTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:"10px 4px",background:"none",border:"none",borderBottom:packTab===t.id?"2px solid #FF9F43":"2px solid transparent",color:packTab===t.id?"#FF9F43":"rgba(255,255,255,0.55)",cursor:"pointer",fontFamily:"'Space Mono',monospace",position:"relative"}}>
            {t.emoji&&<span style={{fontSize:14,lineHeight:1}}>{t.emoji}</span>}
            <span style={{fontSize:13,letterSpacing:1,fontWeight:700}}>{t.label}</span>
            {t.id==="refine"&&suggestions.length>0&&<div style={{position:"absolute",top:6,right:"20%",width:7,height:7,borderRadius:"50%",background:"#4D9FFF",boxShadow:"0 0 8px #4D9FFF"}}/>}
          </button>
        ))}
      </div>
      {/* Category filter pills */}
      {packTab==="pack"&&<div style={{display:"flex",gap:6,padding:"10px 16px",overflowX:"auto",borderBottom:"1px solid rgba(169,70,29,0.25)",background:"rgba(10,4,0,0.8)",flexShrink:0,WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        <button onClick={()=>{setFilterCat("all");setOpenCats({});}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 16px",borderRadius:20,border:"1px solid "+(filterCat==="all"?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.12)"),background:filterCat==="all"?"rgba(255,255,255,0.08)":"transparent",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,minHeight:36}}>
          <span style={{fontSize:12}}>📋</span><span style={{fontSize:13,color:filterCat==="all"?"#FFF":"rgba(255,255,255,0.55)",fontFamily:"'Space Mono',monospace",fontWeight:filterCat==="all"?700:400}}>All</span>
        </button>
        {CATS.map(c=>(
          <button key={c.id} onClick={()=>{setFilterCat(c.id);setOpenCats({[c.id]:true});}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 16px",borderRadius:20,border:"1px solid "+(filterCat===c.id?c.color+"80":"rgba(169,70,29,0.4)"),background:filterCat===c.id?c.color+"14":"transparent",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,minHeight:36}}>
            <span style={{fontSize:12}}>{c.icon}</span>
            <span style={{fontSize:13,color:filterCat===c.id?c.color:"rgba(255,255,255,0.6)",fontFamily:"'Space Mono',monospace",fontWeight:filterCat===c.id?700:400}}>{c.label}</span>
          </button>
        ))}
      </div>}
      {/* Main content */}
      {packTab==="pack"&&(
        <div style={{overflowY:"auto",flex:1,padding:"12px 16px 32px"}}>
          {visibleCats.map((cat,i)=><CatCard key={cat.id} cat={cat} idx={i}/>)}
          <div style={{textAlign:"center",marginTop:8,padding:"8px 0",borderTop:"1px solid rgba(169,70,29,0.12)"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:12,fontWeight:100,fontStyle:"italic",color:"rgba(255,217,61,0.35)",letterSpacing:2}}>1 bag. travel light. · {(bpW*wM).toFixed(1)}{unit}</div>
          </div>
        </div>
      )}
      {packTab==="refine"&&(
        <div style={{overflowY:"auto",flex:1,padding:"12px 16px"}}>
          <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.15),rgba(255,217,61,0.05))",border:"1px solid rgba(169,70,29,0.35)",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,0.88)",lineHeight:1.6,marginBottom:8}}>Reviewing your pack for a <span style={{color:"#FF9F43"}}>{goalLabel}</span> trip across <span style={{color:"#FFD93D"}}>{countries.slice(0,3).join(", ")}{countries.length>3?" +"+(countries.length-3)+" more":""}</span> — {totalNights} nights.</div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{tripTypes.map(t=><span key={t} style={{fontSize:9,color:"rgba(255,159,67,0.85)",background:"rgba(169,70,29,0.18)",border:"1px solid rgba(169,70,29,0.35)",borderRadius:10,padding:"3px 9px",letterSpacing:1,fontWeight:700}}>{TI[t]||"🗺️"} {t}</span>)}</div>
          </div>
          {suggestLoading&&<div style={{textAlign:"center",padding:"36px 20px"}}>
            <div style={{position:"relative",width:72,height:72,margin:"0 auto 20px"}}>
              <div style={{position:"absolute",inset:-8,borderRadius:"50%",border:"1.5px solid rgba(255,159,67,0.5)",animation:"amberPulse 1.8s ease-in-out infinite"}}/>
              <div style={{position:"absolute",inset:-2,borderRadius:"50%",border:"1px solid rgba(255,159,67,0.35)",animation:"amberPulse 1.8s ease-in-out infinite 0.4s"}}/>
              <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(169,70,29,0.12)",border:"1px solid rgba(255,159,67,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,animation:"logoPulse 2s ease-in-out infinite"}}>✦</div>
            </div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic",color:"rgba(255,255,255,0.85)",marginBottom:6}}>Reviewing your pack...</div>
            <div style={{fontSize:9,color:"rgba(255,159,67,0.7)",letterSpacing:2}}>Checking what your trip needs</div>
          </div>}
          {!suggestLoading&&suggestions.length>0&&<div>
            <div style={{fontSize:9,color:"rgba(255,159,67,0.9)",letterSpacing:3,marginBottom:12,fontWeight:700}}>SUGGESTED FOR YOUR TRIP</div>
            {suggestions.map(s=>{
              const CAT_COLORS_P={docs:"#E0E0E0",tech:"#00D4FF",clothes:"#FFD93D",health:"#69F0AE",travel:"#55EFC4",creator:"#FF9F43",dive:"#00E5FF"};
              const c=CAT_COLORS_P[s.cat]||"#FF9F43";
              return(<div key={s.id} style={{borderRadius:12,marginBottom:9,background:"rgba(18,8,0,0.85)",border:"1px solid "+(s.priority==="essential"?"rgba(255,159,67,0.4)":"rgba(255,255,255,0.08)"),animation:"fadeUp 0.4s ease"}}>
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        {s.priority==="essential"&&<span style={{fontSize:12,color:"#FF9F43",background:"rgba(255,159,67,0.18)",border:"1px solid rgba(255,159,67,0.4)",borderRadius:8,padding:"2px 8px",letterSpacing:1,fontWeight:700}}>ESSENTIAL</span>}
                        <span style={{fontSize:12,color:c,background:c+"14",border:`1px solid ${c}44`,borderRadius:8,padding:"2px 8px",letterSpacing:1,fontWeight:700}}>{s.cat}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:"#FFF",marginBottom:5}}>{s.name}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>{s.reason}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>{s.cost>0&&<div style={{fontSize:13,fontWeight:700,color:"#FFD93D",marginBottom:3}}>${s.cost}</div>}{s.weight>0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{s.weight}lb</div>}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>acceptSuggestion(s)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid rgba(105,240,174,0.5)",background:"rgba(105,240,174,0.08)",color:"#69F0AE",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,fontWeight:700,minHeight:40}}>+ ADD TO PACK</button>
                    <button onClick={()=>dismissSuggestion(s.id)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"rgba(255,255,255,0.5)",fontSize:11,cursor:"pointer",fontFamily:"monospace",minHeight:40}}>SKIP</button>
                  </div>
                </div>
              </div>);
            })}
          </div>}
          {!suggestLoading&&suggestions.length===0&&suggestDone&&<div style={{marginBottom:16}}>
            <div style={{textAlign:"center",padding:"24px 0 18px"}}>
              <div style={{fontSize:22,marginBottom:10,color:"#FF9F43"}}>✦</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic",color:"rgba(255,255,255,0.85)",marginBottom:5}}>{accepted.length>0?`${accepted.length} item${accepted.length>1?"s":""} added.`:"Your pack looks solid for this trip."}</div>
              <div style={{fontSize:9,color:"rgba(255,159,67,0.75)",letterSpacing:2}}>Anything else? I'm here.</div>
            </div>
            <button onClick={()=>{setSuggestions([]);setSuggestDone(false);setAccepted([]);genSuggestions();}} style={{width:"100%",padding:10,borderRadius:8,border:"1px solid rgba(169,70,29,0.35)",background:"rgba(169,70,29,0.1)",color:"rgba(255,159,67,0.75)",fontSize:9,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,marginBottom:18,fontWeight:700}}>↺ REFRESH SUGGESTIONS</button>
          </div>}
          {suggestDone&&!suggestLoading&&<div style={{borderTop:"1px solid rgba(196,87,30,0.25)",paddingTop:16}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic",fontWeight:300,color:"#FFD93D",marginBottom:12,lineHeight:1.4}}>Refine packing list with your co-architect</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:12,maxHeight:220,overflowY:"auto"}}>
              {chat.length===0&&<div style={{fontFamily:"'Fraunces',serif",fontSize:12,fontStyle:"italic",color:"rgba(255,200,120,0.82)",lineHeight:1.7,padding:"4px 0"}}>"Need help staying under 15 lbs? Tell me and I'll refine your list."</div>}
              {chat.map((m,i)=>(
                <div key={i} style={{display:"flex",gap:7,flexDirection:m.role==="user"?"row-reverse":"row"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:m.role==="ai"?"#A9461D":"#1a2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0}}>{m.role==="ai"?"✦":"M"}</div>
                  <div style={{borderRadius:9,padding:"8px 11px",fontSize:11,color:"#FFF",lineHeight:1.65,maxWidth:"86%",background:m.role==="ai"?"rgba(169,70,29,0.22)":"rgba(255,255,255,0.08)",border:`1px solid ${m.role==="ai"?"rgba(169,70,29,0.5)":"rgba(255,255,255,0.14)"}`}}>{m.text}</div>
                </div>
              ))}
              {chatLoading&&<div style={{fontSize:12,color:"rgba(169,70,29,0.75)",animation:"shimmer 1s infinite",padding:"4px 0",letterSpacing:1}}>✦ thinking...</div>}
              <div ref={chatEnd}/>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {["Keep me under 15 lbs","I do laundry weekly","Add rain gear","Pack for heat"].map(p=><button key={p} onClick={()=>setChatInput(p)} style={{padding:"6px 12px",borderRadius:14,border:"1px solid rgba(196,87,30,0.35)",background:"rgba(169,70,29,0.12)",color:"rgba(255,159,67,0.9)",fontSize:12,cursor:"pointer",fontFamily:"monospace",whiteSpace:"nowrap",fontWeight:700}}>{p}</button>)}
            </div>
            <div style={{display:"flex",gap:7}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendChat();}} placeholder="Ask anything about your pack..." style={{flex:1,background:"rgba(20,8,0,0.85)",border:"1px solid rgba(196,87,30,0.35)",borderRadius:8,color:"#FFF",fontSize:13,padding:"11px 14px",fontFamily:"monospace",outline:"none",minHeight:44}}/>
              <button onClick={sendChat} style={{background:"rgba(169,70,29,0.25)",border:"1px solid rgba(196,87,30,0.45)",borderRadius:8,color:"#FF9F43",fontSize:16,padding:"8px 14px",cursor:"pointer",minWidth:44,minHeight:44,fontWeight:700}}>↑</button>
            </div>
          </div>}
        </div>
      )}
      {packTab==="weight"&&(
        <div style={{overflowY:"auto",flex:1,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
            <button onClick={()=>setUnit(u=>u==="lbs"?"kg":"lbs")} style={{fontSize:12,color:"rgba(255,159,67,0.85)",background:"rgba(169,70,29,0.12)",border:"1px solid rgba(169,70,29,0.35)",borderRadius:6,padding:"7px 16px",cursor:"pointer",fontFamily:"monospace",letterSpacing:1,fontWeight:700}}>SWITCH TO {unit==="lbs"?"KG":"LBS"}</button>
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
                  <div style={{fontSize:13,fontWeight:700,color:bagColor}}>{bagName}</div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:20,fontWeight:900,color:isOver?"#FF6B6B":bagColor,letterSpacing:-1,lineHeight:1}}>{bagW.toFixed(1)}<span style={{fontSize:11,fontWeight:400,opacity:0.8}}> {unit}</span></div>
                    {bagName==="Backpack"&&<div style={{fontSize:12,color:"#FFD93D",marginTop:1,fontWeight:700}}>{bagV.toFixed(1)}L / {VL}L</div>}
                  </div>
                </div>
                {bagName==="Backpack"&&<div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden",marginBottom:11}}><div style={{height:"100%",background:isOver?"linear-gradient(90deg,#1565FF,#FF6B6B)":"linear-gradient(90deg,#1565FF,#4D9FFF)",borderRadius:3,width:Math.min(bagW/wLim*100,100)+"%",transition:"width 0.5s ease"}}/></div>}
                {bagItems.length===0?<div style={{fontSize:12,color:"rgba(255,255,255,0.35)",textAlign:"center",padding:"10px 0"}}>No items</div>
                :bagItems.sort((a,b)=>(parseFloat(b.weight)||0)-(parseFloat(a.weight)||0)).map(item=>(
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <div style={{fontSize:12,color:item.owned?"rgba(255,255,255,0.65)":"#FFF"}}>{item.owned?"✓ ":""}{item.name}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",flexShrink:0,marginLeft:8,fontWeight:700}}>{parseFloat(item.weight)>0?(parseFloat(item.weight)*wM).toFixed(2)+unit:"—"}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─── Root App ─────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("console");
  const [appData,setAppData]=useState(null);
  const [fullscreen,setFullscreen]=useState(false);

  useEffect(()=>{
    // Version bump — clears stale pack data; purges legacy booking keys (arch #3)
    const VER="1bn_v5_r4";
    try{
      if(localStorage.getItem("1bn_pack_version")!==VER){
        localStorage.removeItem("1bn_pack_v5");
        localStorage.removeItem("1bn_bookings");        // legacy — purged
        localStorage.removeItem("1bn_bookingDetails"); // legacy — purged
        localStorage.setItem("1bn_pack_version",VER);
      }
    }catch(e){}
  },[]);

  const [tripData,setTripData]=useState(()=>{
    try{const t=localStorage.getItem("1bn_tripData_v5");if(t){const p=JSON.parse(t);if(p?.phases?.length>0)return p;}}catch(e){}
    return MICHAEL_EXPEDITION;
  });
  useEffect(()=>{try{if(tripData)localStorage.setItem("1bn_tripData_v5",JSON.stringify(tripData));}catch(e){};},[tripData]);

  function handleLoadDemo(){try{localStorage.clear();}catch(e){}setTripData(MICHAEL_EXPEDITION);setScreen("console");}
  function handleGoGen(data,vd){setAppData({...data,visionData:vd});setScreen("gen");}
  function handleGenComplete(){setScreen("coarchitect");}
  function handleLaunch(hd){try{localStorage.removeItem("1bn_pack_v5");}catch(e){}setTripData(hd);setScreen("handoff");}
  function handleReviseLaunch(hd){setTripData(hd);setScreen("handoff");}
  function handleHandoffComplete(){setScreen("console");}
  function handleRevise(){
    const revData={vision:tripData.visionNarrative||"My expedition",tripName:tripData.tripName||"My Expedition",city:tripData.departureCity||"",date:tripData.startDate||"",budgetMode:"dream",budgetAmount:"",selectedGoal:tripData.goalLabel||"custom",
      visionData:{phases:(tripData.phases||[]).map(p=>({destination:p.name||p.destination||"",country:p.country||"",type:p.type||"Exploration",nights:p.nights||7,flag:p.flag||"🌍",why:p.why||""})),narrative:tripData.visionNarrative||"",vibe:tripData.visionVibe||"",highlight:tripData.visionHighlight||"",totalNights:(tripData.phases||[]).reduce((s,p)=>s+p.nights,0),totalBudget:(tripData.phases||[]).reduce((s,p)=>s+(p.budget||p.cost||0),0),countries:[...new Set((tripData.phases||[]).map(p=>p.country))].length}};
    setAppData({...revData,isRevision:true});setScreen("coarchitect");
  }
  function handleNewTrip(){
    setScreen("dream");setAppData(null);
    try{localStorage.removeItem("1bn_tripData_v5");localStorage.removeItem("1bn_seg_v2");localStorage.removeItem("1bn_pack_v5");}catch(e){}
  }

  return(
    <>
      <style>{CSS}</style>
      {screen==="dream"       && <DreamScreen onGoGen={handleGoGen} onLoadDemo={handleLoadDemo}/>}
      {screen==="gen"         && <GenerationScreen onComplete={handleGenComplete}/>}
      {screen==="coarchitect" && appData && <CoArchitect data={appData} visionData={appData.visionData} onLaunch={appData.isRevision?handleReviseLaunch:handleLaunch} onBack={()=>setScreen(appData.isRevision?"console":"dream")}/>}
      {screen==="handoff"     && tripData && <HandoffScreen tripData={tripData} onComplete={handleHandoffComplete}/>}
      {screen==="console"     && tripData && <MissionConsole tripData={tripData} onNewTrip={handleNewTrip} onRevise={handleRevise} onPackConsole={()=>setScreen("pack")} isFullscreen={fullscreen} setFullscreen={setFullscreen}/>}
      {screen==="pack"        && <PackConsole tripData={tripData} onExpedition={()=>setScreen("console")} isFullscreen={fullscreen} setFullscreen={setFullscreen}/>}
    </>
  );
}
