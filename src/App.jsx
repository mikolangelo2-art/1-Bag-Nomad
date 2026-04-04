import { useState, useEffect, useRef, useCallback, memo } from "react";
import WorldMapBackground from './components/WorldMapBackground';
import posthog from "posthog-js";
import { DIVE_CYAN, SURF_GREEN, CULTURE_GOLD, EXPLORATION_ORANGE, NATURE_PURPLE, MOTO_RED, TREK_TEAL, LIGHT_BLUE, TECH_BLUE, PARCHMENT, LIGHT_GRAY, WHITE, BG_PAGE, BG_DARK, BG_DARK_TRIP, BG_PAGE_LEGACY, BLACK_OVERLAY, BG_DREAM_GRADIENT, BG_TRIP_GRADIENT, BG_PACK_GRADIENT, PARCHMENT_08, PARCHMENT_06, PARCHMENT_55, PARCHMENT_20, BURNT_ORANGE_35, BURNT_ORANGE_50, DARK_BURNT_52, CYAN_10, CYAN_25, CYAN_30, CYAN_35, CYAN_40, CYAN_60, CYAN_90, ORANGE_15, ORANGE_25, ORANGE_40, ORANGE_65, ORANGE_90, GOLD_04, GOLD_20, GOLD_35, GOLD_50, GOLD_60, GOLD_65, RED_04, RED_10, RED_40, WHITE_04, WHITE_08, WHITE_15, WHITE_22, WHITE_50, WHITE_60, GREEN_WASH, PURPLE_WASH, CYAN_WASH, ORANGE_WASH, TRIP_CATEGORY_COLORS, CAT_DOT_COLORS, PILL_COLORS, PALETTE_8, BAG_COLORS, NOTEBOOK_CAT_COLORS, PACK_CAT_COLORS, EXPENSE_CAT_COLORS, urgencyColor } from './constants/colors';
import { getDefaultPack, fixPackItemVolume, mapPackItemsWithVolumes } from './utils/packHelpers';
import { fmt, daysBetween, fD, fDS } from './utils/dateHelpers';
import { estCost } from './utils/priceHelpers';
import { TI, SEG_KEY, loadSeg, saveSeg, COACH_KEY, loadCoach, saveCoach, ONBOARD_KEY, loadOnboard, saveOnboard, RETURN_KEY, BLANK_RETURN, loadReturn, saveReturn } from './utils/storageHelpers';
import { askAI, parseJSON } from './utils/aiHelpers';
import { GOAL_PRESETS, QUICK_ACTIONS } from './constants/dreamData';
import { COUNTRY_FLAGS, toSegPhases } from './utils/tripHelpers';
import { useMobile } from './hooks/useMobile';
import SharegoodLogo from './components/SharegoodLogo';
import BottomSheet from './components/BottomSheet';
import ConsoleHeader from './components/ConsoleHeader';
import BottomNav from './components/BottomNav';
import CoachOverlay from './components/CoachOverlay';
import OnboardCard from './components/OnboardCard';
import PackConsole from './components/PackConsole';
import GenerationScreen from './components/GenerationScreen';
import CityInput from './components/CityInput';
import DreamHeader from './components/DreamHeader';
import VisionReveal from './components/VisionReveal';
import DreamScreen from './components/DreamScreen';
import HandoffScreen from './components/HandoffScreen';
import HomecomingScreen from './components/HomecomingScreen';

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
// GOAL_PRESETS, QUICK_ACTIONS — imported from constants/dreamData.js
const TC = TRIP_CATEGORY_COLORS;
// TI — imported from storageHelpers.js
const STATUS_CFG={
  planning:  {label:"PLANNING",  icon:"✏️", color:"#FF9F43"},
  confirmed: {label:"CONFIRMED", icon:"✓",  color:"#E8DCC8"},
  booked:    {label:"BOOKED",    icon:"🔒", color:"#69F0AE"},
  changed:   {label:"CHANGED",   icon:"⚠️",color:"#FF6B6B"},
  cancelled: {label:"CANCELLED", icon:"✕",  color:"#888888"},
};
// Tap cycles forward; booked tapped = show modal instead
const STATUS_NEXT={planning:"confirmed",confirmed:"booked",changed:"booked",cancelled:"planning"};
// CAT_DOT_COLORS — imported from colors.js

// WorldMapBackground — imported from components/WorldMapBackground.jsx

// Storage helpers — imported from utils/storageHelpers.js

// ─── Utils ───────────────────────────────────────────────────────
// fmt, daysBetween, urgencyColor, fD, fDS — imported from dateHelpers.js / colors.js

// ─── City / Airport Autocomplete (AirLabs API) ─────────────────
// CityInput — imported from components/CityInput.jsx

// useMobile — imported from hooks/useMobile.js

// Architecture #1: group flat phases by country → each country = 1 PhaseCard with segments
// COUNTRY_FLAGS, toSegPhases — imported from utils/tripHelpers.js

// askAI, parseJSON — imported from utils/aiHelpers.js

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
  background: 'rgba(255,159,67,0.09)',
  padding: '18px',
  marginBottom: '14px',
  animation: 'suggestIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both'
};
const suggestionHeaderStyle = {
  fontSize: '11px',
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  color: '#FF9F43',
  letterSpacing: '2px',
  marginBottom: '12px',
  opacity: 0.85
};
const disclaimerStyle = {
  fontSize: '11px',
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
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
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
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
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  cursor: 'pointer'
};

function buildSegmentSuggestionsPrompt(tripData, travelerProfile, phasesSlice, startIndex) {
  const phases = phasesSlice || (tripData.phases || []).slice(0, 5);
  const offset = startIndex || 0;
  const home = tripData.departureCity || tripData.city || 'Home';
  const style = travelerProfile?.style || 'Independent';
  const group = travelerProfile?.group || 'Solo';
  return `Travel advisor. ${group} ${style} traveler from ${home}. Budget: $${tripData.totalBudget||'flexible'}.

PHASES:
${phases.map((p, i) => {const globalIdx=offset+i;const from=globalIdx===0?home:(i===0?(tripData.phases[offset-1]?.name||tripData.phases[offset-1]?.destination||'Previous'):(phases[i-1].name||phases[i-1].destination||'Previous'));return `${globalIdx+1}. FROM ${from} → ${p.name||p.destination||p.city}, ${p.country} | ${p.arrival}→${p.departure} | ${p.nights}n | $${p.budget||p.cost}`;}).join('\n')}

For each phase: transport route+cost, stay name+cost, 2 activities+costs, food budget.

Return ONLY JSON:
{"phases":[{"phaseIndex":${offset},"phaseName":"...","transport":{"route":"...","estimatedCost":"$X-X","notes":"..."},"stay":{"recommendation":"...","suggestions":["Name1","Name2"],"estimatedNightly":"$X/night","estimatedTotal":"$X-X","notes":"..."},"activities":[{"name":"...","provider":"...","estimatedCost":"$X","notes":"..."}],"food":{"dailyBudget":"$X-X/day","recommendations":["..."],"notes":"..."}}]}

JSON only. No markdown. No preamble.`;
}

// ─── CSS ─────────────────────────────────────────────────────────
const CSS=`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,100;0,300;0,700;0,900;1,100;1,300;1,700;1,900&family=Space+Mono:wght@400;700&display=swap');
:root{--cream:#E8DCC8}*{box-sizing:border-box;margin:0;padding:0}body{background:#3C2418}
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
@keyframes tabFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes drawerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes caFabPulse{0%,100%{box-shadow:0 0 12px rgba(255,217,61,0.25)}50%{box-shadow:0 0 24px rgba(255,217,61,0.45)}}
@media(max-width:768px){.sg-suggestion-card{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important;padding:16px!important;box-sizing:border-box!important}}

  .dream-root,.mc-root,.build-root{font-size:18px}
  .dream-content{max-width:780px;padding:40px 0 70px}@keyframes shimmerOnce{0%{background-position:-200% center}65%{background-position:200% center}100%{background-position:200% center}}.dream-big-shimmer{background:linear-gradient(90deg,#FFD93D 25%,#fff 45%,#FF9F43 55%,#FFD93D 75%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmerOnce 2s ease forwards}.dream-divider{width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,159,67,0.22),rgba(0,229,255,0.12),rgba(162,155,254,0.1),transparent);margin:4px 0 16px 0;border:none}.dream-accent-green{color:rgba(105,240,174,0.45)}
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

.dream-content{max-width:800px;padding:40px 0 70px}
.mc-content{padding:22px 36px}
.g-label{font-size:16px}
.g-desc{font-size:11px}
.g-icon{font-size:28px}
.sec-label{font-size:12px;letter-spacing:5px}
.f-label{font-size:11px}
.f-input{font-size:15px;padding:12px 16px}
.vision-ta{font-size:17px;padding:16px 20px}
.launch-btn{font-size:15px;padding:20px}
.mc-tab{font-size:11px;padding:12px 16px}
.chat-bubble{font-size:12px}}

.dream-root,.mc-root,.build-root{max-width:900px!important;margin:0 auto!important}
@media(max-width:599px){.dream-root,.mc-root,.build-root{max-width:100%!important;margin:0!important;padding:0!important;width:100%!important}.dream-content{max-width:100%!important;margin:0!important;padding:14px 0 80px!important;width:100%!important}}
.dream-content{padding:40px 0 70px!important}
.mc-content{padding:22px 36px!important}
.g-label{font-size:16px!important}
.g-desc{font-size:11px!important}
.sec-label{font-size:12px!important;letter-spacing:5px!important}
.f-label{font-size:11px!important}
.f-input{font-size:15px!important;padding:12px 16px!important}
.vision-ta{font-size:17px!important;padding:16px 20px!important}
.launch-btn{font-size:15px!important;padding:20px!important}
.mc-tab{font-size:11px!important;padding:12px 16px!important}
.chat-bubble{font-size:12px!important}}
@media(min-width:900px){html,body{font-size:18px}.dream-content{max-width:860px;margin:0 auto;padding:40px 40px 70px}.mc-content{max-width:1100px;margin:0 auto;padding:24px 48px}.overlay-pad{padding-left:48px;padding-right:48px}.g-label{font-size:18px}.g-desc{font-size:12px}.sec-label{font-size:13px;letter-spacing:5px}.f-label{font-size:12px}.f-input{font-size:16px;padding:13px 18px}.vision-ta{font-size:17px;padding:18px 22px}.launch-btn{font-size:16px;padding:22px}.mc-tab{font-size:12px;padding:14px 18px}.chat-bubble{font-size:12px}}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#3C2418}::-webkit-scrollbar-thumb{background:rgba(232,220,200,0.12);border-radius:2px}
.dream-root{font-family:'Inter',system-ui,-apple-system,sans-serif;background:radial-gradient(ellipse at 50% 0%,rgba(169,70,29,0.15) 0%,transparent 60%) no-repeat fixed,#3C2418;min-height:100vh;color:#FFF;position:relative}
.dream-glow{position:fixed;top:-80px;left:50%;transform:translateX(-50%);width:700px;height:280px;background:radial-gradient(ellipse,rgba(169,70,29,0.3) 0%,rgba(0,120,255,0.06) 40%,rgba(255,217,61,0.05) 55%,transparent 70%);pointer-events:none;z-index:0;animation:glowPulse 7s ease-in-out infinite}.dream-glow::after{content:"";position:absolute;top:60px;left:-120px;width:280px;height:180px;background:radial-gradient(ellipse,rgba(0,120,255,0.14) 0%,transparent 70%);pointer-events:none}.dream-glow::before{content:"";position:absolute;top:80px;right:-100px;width:240px;height:160px;background:radial-gradient(ellipse,rgba(162,155,254,0.14) 0%,rgba(0,120,255,0.06) 50%,transparent 70%);pointer-events:none}
.dream-content{position:relative;z-index:1;padding:26px 0 44px;max-width:720px;margin:0 auto}.mc-content{padding:20px 32px}.overlay-pad{padding-left:32px;padding-right:32px}.build-root,.mc-root{font-size:15px}.g-label{font-size:15px}.g-desc{font-size:10px}.launch-btn{font-size:15px}.sec-label{font-size:10px;letter-spacing:0.08em}.f-input{font-size:14px}.f-label{font-size:10px}}
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
.vision-textarea-wrap{width:100%;min-width:0;display:block;box-sizing:border-box}
.vision-ta{width:100%;max-width:100%;min-width:0;box-sizing:border-box;display:block;background:rgba(255,255,255,0.06)!important;border:1.5px solid rgba(255,217,61,0.85)!important;border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;font-family:'Inter',system-ui,-apple-system,sans-serif;resize:none;outline:none;line-height:1.8;min-height:106px;transition:border-color 0.3s;margin-bottom:6px;word-break:normal;overflow-wrap:break-word;white-space:pre-wrap}
.vision-ta::placeholder{font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.28);letter-spacing:0.01em}.vision-ta:focus{border:1.5px solid rgba(255,217,61,1)!important;animation:none!important;box-shadow:0 0 24px rgba(255,217,61,0.3),0 0 60px rgba(255,217,61,0.1)}
.f-label{font-size:13px;color:rgba(255,159,67,0.88);letter-spacing:0.10em}
.f-input{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.30);border-radius:9px;color:#FFF;font-size:12px;padding:9px 13px;font-family:'Inter',system-ui,-apple-system,sans-serif;outline:none;width:100%;box-sizing:border-box;transition:border-color 0.2s,box-shadow 0.2s}
.f-input:focus{border-color:rgba(255,159,67,0.65);box-shadow:0 0 0 2px rgba(255,159,67,0.15),0 0 20px rgba(255,159,67,0.1)}.f-input::placeholder{color:rgba(255,255,255,0.40)}
input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.45)!important;font-style:italic}input[type="date"]{-webkit-appearance:none;appearance:none}input[type="date"]::-webkit-calendar-picker-indicator{opacity:0;width:28px;cursor:pointer;position:relative;z-index:2}
.launch-btn{width:100%;padding:17px;border-radius:14px;border:none;font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:13px;font-weight:700;letter-spacing:2.5px;cursor:pointer;position:relative;overflow:hidden;transition:all 0.3s}
.launch-btn.off{background:linear-gradient(135deg,#8a3515 0%,#A9461D 40%,#C4571E 70%,#E06830 100%);color:rgba(255,255,255,0.5);cursor:default}
.launch-btn.on{background:linear-gradient(135deg,#C4571E 0%,#E06830 30%,#FF9F43 60%,#FFD93D 100%);color:#FFF;animation:launchPulse 2.8s ease-in-out infinite;box-shadow:0 0 24px rgba(255,159,67,0.3),0 0 48px rgba(255,217,61,0.15)}
.launch-btn.on:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(255,159,67,0.5),0 4px 28px rgba(0,120,255,0.2);animation:none}
.launch-btn.loading{background:linear-gradient(135deg,#C4571E,#E06830,#C4571E);color:rgba(255,255,255,0.92);cursor:wait;animation:launchPulse 1.4s ease-in-out infinite!important}
.narrative-card{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(169,70,29,0.14),rgba(255,217,61,0.04));border:2px solid #FFD93D;box-shadow:0 0 20px rgba(255,217,61,0.15);border-radius:16px;padding:22px;margin-bottom:18px;animation:fadeUp 0.5s ease}
.vibe-tag{background:rgba(169,70,29,0.22);border:1px solid rgba(169,70,29,0.55);border-radius:20px;padding:4px 12px;font-size:12px;color:#FFD93D;letter-spacing:2.5px}
.stat-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,217,61,0.35);border-radius:9px;padding:9px 7px;text-align:center}
.phase-row{display:flex;gap:10px;padding:12px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,217,61,0.35);border-radius:11px;align-items:flex-start;border-left:3px solid transparent}
.cta-build-btn{width:100%;padding:16px;border-radius:13px;border:none;background:linear-gradient(135deg,#A9461D 0%,#C4571E 38%,#69F0AE 100%);color:#060A0F;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:2.5px;font-family:'Inter',system-ui,-apple-system,sans-serif;animation:consolePulse 2.8s ease-in-out infinite;transition:transform 0.2s}
.cta-build-btn:hover{transform:translateY(-2px);animation:none}
.build-root{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#3C2418;min-height:100vh;color:#FFF;display:flex;flex-direction:column}
.mc-root{font-family:'Inter',system-ui,-apple-system,sans-serif;background:radial-gradient(ellipse at 50% 0%,rgba(0,229,255,0.04) 0%,transparent 50%) no-repeat fixed,#3C2418;min-height:100vh;color:#FFF;display:flex;flex-direction:column}
.mc-tab{background:none;border:none;cursor:pointer;padding:9px 12px;font-size:11px;letter-spacing:2px;white-space:nowrap;color:#FFF;border-bottom:2px solid transparent;transition:all 0.30s cubic-bezier(0.25,0.46,0.45,0.94);font-family:'Inter',system-ui,-apple-system,sans-serif;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center}
.mc-tab.active{color:#00E5FF;border-bottom-color:#00E5FF}
.mc-content{padding:14px 16px;overflow-y:auto;flex:1;min-height:0}
.intel-section{background:rgba(255,255,255,0.04);border:1px solid rgba(232,220,200,0.08);border-radius:8px;padding:11px;margin-bottom:10px}
.intel-section-label{font-size:12px;letter-spacing:2px;margin-bottom:7px}
.street-card{display:flex;gap:9px;padding:9px 11px;background:rgba(0,0,0,0.25);border-radius:8px;margin-bottom:7px}
.loading-skeleton{height:13px;background:#111D2A;border-radius:4px;animation:shimmer 1.5s infinite;margin-bottom:8px}
.chat-bubble{border-radius:10px;padding:8px 10px;font-size:12px;color:#FFF;line-height:1.7;max-width:86%}
@media(max-width:599px){.dream-content{padding:14px 0 80px;width:100%;max-width:100%;margin:0;box-sizing:border-box}.goal-grid{gap:7px}.mc-content{padding:10px 12px}input,textarea,select{font-size:16px!important}}
.bnav{position:fixed;bottom:0;left:0;right:0;z-index:300;display:flex;background:rgba(21,15,10,0.97);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border-top:1px solid rgba(232,220,200,0.08);padding-bottom:env(safe-area-inset-bottom)}
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:6px 0 10px;cursor:pointer;border:none;background:none;gap:3px;position:relative;min-height:56px;-webkit-tap-highlight-color:transparent;outline:none}
.bnav-pip{position:absolute;top:0;left:50%;transform:translateX(-50%);width:22px;height:2px;border-radius:2px;opacity:0}
.bnav-btn.active .bnav-pip{opacity:1;animation:pipSpring 0.45s cubic-bezier(0.34,1.56,0.64,1) both}
.bnav-icon{font-size:20px;line-height:1;transition:transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94);display:block}
.bnav-btn.active .bnav-icon{transform:translateY(-2px)}
.bnav-lbl{font-size:9px;letter-spacing:1.5px;font-family:'Inter',system-ui,-apple-system,sans-serif;font-weight:700;transition:color 0.30s cubic-bezier(0.25,0.46,0.45,0.94);color:rgba(232,220,200,0.4)}
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
// getDefaultPack, fixPackItemVolume, mapPackItemsWithVolumes — imported from packHelpers.js

// SharegoodLogo — imported from components/SharegoodLogo.jsx


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

// ConsoleHeader — imported from components/ConsoleHeader.jsx

// BottomNav — imported from components/BottomNav.jsx

// ─── BottomSheet ──────────────────────────────────────────────────
// BottomSheet — imported from components/BottomSheet.jsx

// GenerationScreen — imported from components/GenerationScreen.jsx

// DreamHeader — imported from components/DreamHeader.jsx
// DreamScreen — imported from components/DreamScreen.jsx

// VisionReveal — imported from components/VisionReveal.jsx

// ─── CoArchitect ──────────────────────────────────────────────────
function CoArchitect({data,visionData,onLaunch,onBack}) {
  const isMobile=useMobile();
  const [mobileTab,setMobileTab]=useState(data.isRevision?"chat":"itinerary");
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setMounted(true),60);return()=>clearTimeout(t);},[]);
  useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});posthog.capture("co_architect_opened");posthog.capture("$pageview",{$current_url:"/co-architect"});},[]);
  useEffect(()=>{window.scrollTo(0,0);},[]);
  // estCost — imported from priceHelpers.js
  const colors=PALETTE_8;
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
      <ConsoleHeader console="dream" isMobile={isMobile} screenLabel="CO-ARCHITECT" rightSlot={<div style={{display:"flex",gap:5,alignItems:"center"}}>{[1,2,3,4].map(n=><div key={n} style={{width:n<3?22:n===3?28:18,height:6,borderRadius:3,background:n===1?"rgba(255,159,67,0.85)":n===2?"rgba(255,159,67,0.55)":n===3?"#FFD93D":"rgba(0,229,255,0.15)",boxShadow:n===1?"0 0 8px rgba(255,159,67,0.5)":n===3?"0 0 10px rgba(255,217,61,0.7)":"none",transition:"all 0.3s ease"}}/>)}</div>}/>
      <div style={{display:"flex",border:"none",background:"#080D14",flexShrink:0,paddingRight:4}}>
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
        {["itinerary","chat"].map(t=><button key={t} onClick={()=>setMobileTab(t)} style={{flex:1,padding:10,background:"none",border:"none",borderBottom:mobileTab===t?"2px solid #69F0AE":"2px solid transparent",color:mobileTab===t?"#69F0AE":"rgba(255,255,255,0.4)",fontSize:15,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:2,minHeight:44}}>{t==="itinerary"?"🗺️ ITINERARY":"✏️ REFINE"}</button>)}
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
                    <div style={{textAlign:"right",flexShrink:0,paddingRight:4}}><div style={{fontSize:15,fontWeight:900,color:"#A29BFE",paddingRight:2}}>{item.nights}n</div><div style={{fontSize:15,color:"#FFD93D"}}>{fmt(item.cost)}</div></div>
                    <span style={{fontSize:15,color:"rgba(255,255,255,0.25)",marginLeft:6}}>{isEd?"▲":"▼"}</span>
                  </div>
                  {isEd&&<div style={{padding:"10px 12px 12px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.2)",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[{label:"NIGHTS",field:"nights",type:"number"},{label:"COST ($)",field:"cost",type:"number"}].map(f=><div key={f.field} style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{f.label}</div><input type={f.type} style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none"}} value={item[f.field]} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,[f.field]:parseInt(e.target.value)||1}:it))}/></div>)}
                    <div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:15,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>TYPE</div><select style={{background:"#080D14",border:"1px solid #1a2535",borderRadius:5,color:"#FFF",fontSize:15,padding:"5px 7px",outline:"none",width:"100%"}} value={item.type} onChange={e=>setItems(p=>p.map(it=>it.id===item.id?{...it,type:e.target.value}:it))}>{["Exploration","Culture","Dive","Surf","Nature","Trek","Moto","Relax","Transit"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
                  </div>}
                </div>
              );
            })}
            <div style={{padding:"10px 12px",background:"rgba(105,240,174,0.04)",border:"1px solid rgba(105,240,174,0.14)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
              <div><div style={{fontSize:15,color:"rgba(255,255,255,0.35)"}}>{items.length} stops · {countries.length} countries</div><div style={{fontSize:15,color:"#69F0AE"}}>~{fmt(Math.round(totalCost/Math.max(totalNights,1)))}/night</div></div>
              <div style={{fontSize:20,fontWeight:900,color:"#FFD93D"}}>{fmt(totalCost)}</div>
            </div>
            {isMobile&&<button style={{margin:"12px 0 0 0",width:"100%",padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#060A0F",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",animation:"consolePulse 2.8s ease-in-out infinite"}} onClick={()=>onLaunch(buildHandoff())}>{data.isRevision?"✅  UPDATE":"🚀  LAUNCH TRIP CONSOLE"}</button>}
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
                    ?<div style={{position:"relative",background:"linear-gradient(135deg,rgba(169,70,29,0.2),rgba(255,217,61,0.07))",border:"2px solid rgba(255,159,67,0.30)",borderRadius:12,padding:"20px 16px 16px",fontSize:18,fontWeight:400,color:"rgba(255,255,255,0.88)",lineHeight:1.7,maxWidth:"92%",whiteSpace:"pre-line",fontFamily:"'Fraunces',serif",animation:"fadeUp 0.6s ease",boxShadow:"inset 0 0 24px rgba(255,159,67,0.04)",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center"}}><img src="/1bn-logo.png" alt="" aria-hidden style={{display:"block",width:140,height:140,objectFit:"contain",opacity:0.12,pointerEvents:"none",filter:"brightness(1.15) sepia(0.2) saturate(0.85)",marginBottom:12}}/><div style={{textAlign:"center"}}>{msg.text}</div></div>
                    :<div style={{background:msg.role==="ai"?"rgba(255,159,67,0.04)":"rgba(255,255,255,0.05)",border:msg.role==="ai"?"2px solid rgba(255,159,67,0.30)":`1px solid rgba(255,255,255,0.08)`,borderRadius:12,padding:msg.role==="ai"?"18px 20px":"10px 14px",fontSize:msg.role==="ai"?16:13,fontFamily:msg.role==="ai"?"'Fraunces',serif":"'Inter',system-ui,-apple-system,sans-serif",fontStyle:msg.role==="ai"?"italic":"normal",color:"#FFF",lineHeight:msg.role==="ai"?1.7:1.5,maxWidth:"92%",boxShadow:msg.role==="ai"?"inset 0 0 24px rgba(255,159,67,0.04)":"none"}}>{(msg.text||"").replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')}</div>}
                </div>
              ))}
              {loading&&<div style={{display:"flex",gap:6,animation:"msgIn 0.25s ease"}}><div style={{width:20,height:20,borderRadius:"50%",background:"#A9461D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>✨</div><div style={{fontSize:15,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",padding:"4px 0"}}>thinking...</div></div>}
              <div ref={chatEnd}/>
            </div>
            <div style={{padding:"10px",borderTop:"1px solid #111D2A",display:"flex",gap:5,flexWrap:isMobile?"nowrap":"wrap",overflowX:"auto",flexShrink:0}}>
              {QUICK_ACTIONS.map(a=><button key={a} onClick={()=>setInput(a)} style={{background:"rgba(169,70,29,0.18)",border:"1px solid rgba(255,217,61,0.35)",borderRadius:20,padding:"7px 14px",fontSize:15,fontWeight:700,color:"#FFD93D",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:36}}>{a}</button>)}
            </div>
            <div style={{padding:"8px 10px",borderTop:"1px solid #111D2A",display:"flex",gap:7,flexShrink:0}}>
              <input style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:8,color:"#FFF",fontSize:isMobile?13:15,padding:"8px 10px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",minHeight:44,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMsg();}} placeholder="Ask anything, request changes..." onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
              <button style={{background:"rgba(169,70,29,0.2)",border:"1px solid rgba(169,70,29,0.4)",borderRadius:8,color:"#FFD93D",fontSize:15,padding:"8px 11px",cursor:"pointer",minWidth:44,minHeight:44}} onClick={sendMsg}>↑</button>
            </div>
            {!isMobile&&<button style={{margin:10,padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#060A0F",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",animation:"consolePulse 2.8s ease-in-out infinite",flexShrink:0}} onClick={()=>onLaunch(buildHandoff())}>{data.isRevision?"✅  UPDATE MY EXPEDITION":"🚀  LAUNCH TRIP CONSOLE"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// HandoffScreen — imported from components/HandoffScreen.jsx

// HomecomingScreen — imported from components/HomecomingScreen.jsx

// ─── DateInput (MM/DD/YYYY three-field) ──────────────────────────
function DateInput({value,onChange,accentColor="#69F0AE",yearHint}) {
  const parse=v=>{if(!v)return{m:"",d:"",y:""};const p=v.split("-");return p.length===3?{m:p[1]||"",d:p[2]||"",y:p[0]||""}:{m:"",d:"",y:""};};
  const [mm,setMm]=useState(()=>parse(value).m);
  const [dd,setDd]=useState(()=>parse(value).d);
  const [yyyy,setYyyy]=useState(()=>parse(value).y);
  const mmRef=useRef();const ddRef=useRef();const yyyyRef=useRef();
  useEffect(()=>{const p=parse(value);setMm(p.m);setDd(p.d);setYyyy(p.y);},[value]);
  const emit=(m,d,y)=>{if(m&&d&&y.length===4){const iso=`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;onChange(iso);}};
  const handleMm=e=>{const v=e.target.value.replace(/\D/g,"").slice(0,2);setMm(v);if(v.length===2)ddRef.current?.focus();emit(v,dd,yyyy);};
  const handleDd=e=>{const v=e.target.value.replace(/\D/g,"").slice(0,2);setDd(v);if(v.length===2)yyyyRef.current?.focus();emit(mm,v,yyyy);};
  const handleYyyy=e=>{const v=e.target.value.replace(/\D/g,"").slice(0,4);setYyyy(v);emit(mm,dd,v);};
  const fs={background:"rgba(255,255,255,0.04)",border:`1px solid ${accentColor}55`,borderRadius:9,color:"#FFF",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:15,padding:"12px 8px",textAlign:"center",width:"100%",boxSizing:"border-box",outline:"none",transition:"border-color 0.2s,box-shadow 0.2s"};
  const onF=e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";};
  const onB=e=>{e.target.style.borderColor=`${accentColor}55`;e.target.style.boxShadow="none";};
  return(
    <div style={{display:"flex",gap:8,alignItems:"center",width:"100%"}}>
      <input ref={mmRef} type="text" inputMode="numeric" placeholder="MM" maxLength={2} value={mm} onChange={handleMm} onFocus={e=>{onF(e);if(yearHint&&!mm&&!dd&&!yyyy){setYyyy(yearHint);}}} onBlur={onB} style={{...fs,flex:1}}/>
      <span style={{color:"rgba(255,159,67,0.5)",fontSize:18,flexShrink:0}}>/</span>
      <input ref={ddRef} type="text" inputMode="numeric" placeholder="DD" maxLength={2} value={dd} onChange={handleDd} onFocus={onF} onBlur={onB} style={{...fs,flex:1}}/>
      <span style={{color:"rgba(255,159,67,0.5)",fontSize:18,flexShrink:0}}>/</span>
      <input ref={yyyyRef} type="text" inputMode="numeric" placeholder="YYYY" maxLength={4} value={yyyy} onChange={handleYyyy} onFocus={onF} onBlur={onB} style={{...fs,flex:2}}/>
    </div>
  );
}

// ─── SegmentDetailField ───────────────────────────────────────────
function SDF({label,value,onChange,placeholder,type="text",multiline,accent="#00E5FF"}) {
  const mob=useMobile();
  const s={background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:6,color:"#FFF",fontSize:mob?12:15,padding:multiline?(mob?"5px 7px":"6px 8px"):(mob?"4px 7px":"5px 8px"),fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",width:"100%",maxWidth:"100%",boxSizing:"border-box",lineHeight:1.6,resize:multiline?"none":undefined,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"};
  const onF=e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";setTimeout(()=>e.target.scrollIntoView({behavior:'smooth',block:'nearest'}),500);};
  const onB=e=>{e.target.style.borderColor="rgba(255,255,255,0.22)";e.target.style.boxShadow="none";};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:mob?2:3}}>
      <div style={{fontSize:mob?11:13,color:"rgba(212,180,120,0.92)",letterSpacing:1.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500,opacity:0.92}}>{label}</div>
      {multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={1} style={s} onFocus={onF} onBlur={onB}/>
      :type==="date"?<div style={{width:"100%"}}><input type="date" value={value} onChange={e=>onChange(e.target.value)} style={{...s,colorScheme:"dark"}} onFocus={onF} onBlur={onB}/></div>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} onFocus={onF} onBlur={onB}/>}
    </div>
  );
}

// ─── CoachOverlay ─────────────────────────────────────────────────
// CoachOverlay — imported from components/CoachOverlay.jsx
// OnboardCard — imported from components/OnboardCard.jsx

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
  const CATS=[{id:"transport",icon:"✈️",label:"TRANSPORT",a:DIVE_CYAN,w:CYAN_WASH},{id:"stay",icon:"🏠",label:"STAY",a:SURF_GREEN,w:GREEN_WASH},{id:"activities",icon:"🎯",label:"ACTIVITIES",a:CULTURE_GOLD,w:GOLD_04},{id:"food",icon:"🍽️",label:"FOOD",a:EXPLORATION_ORANGE,w:ORANGE_WASH},{id:"misc",icon:"💸",label:"MISC",a:NATURE_PURPLE,w:PURPLE_WASH},{id:"intel",icon:"🔭",label:"INTEL",a:MOTO_RED,w:RED_04}];
  const done={transport:!!(det.transport.mode||det.transport.cost),stay:!!(det.stay.name||det.stay.cost),activities:det.activities.length>0,food:!!(det.food.dailyBudget),misc:det.misc.length>0,intel:!!(intelSnippet?.tagline||det.intel.notes)};
  const ac=CATS.find(c=>c.id===cat);
  return(
    <div style={{borderTop:"1px solid rgba(0,229,255,0.06)"}}>
      {/* Status banner — lock notice or LOCK BOOKING button */}
      {locked&&<div style={{padding:"7px 14px",background:"rgba(105,240,174,0.06)",borderBottom:"1px solid rgba(105,240,174,0.15)",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:"#69F0AE",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,flex:1}}>🔒 BOOKED — tap badge to unlock for editing</span>
      </div>}
      {status==='changed'&&<div style={{padding:"7px 14px",background:"rgba(255,107,107,0.06)",borderBottom:"1px solid rgba(255,107,107,0.2)",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:"#FF6B6B",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,flex:1}}>⚠️ CHANGED — update your details, then lock when done</span>
        <button onClick={()=>onStatusChange?.('booked')} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:"1px solid rgba(105,240,174,0.4)",background:"rgba(105,240,174,0.08)",color:"#69F0AE",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,whiteSpace:"nowrap",minHeight:26}}>✓ LOCK BOOKING</button>
      </div>}
      <div style={{pointerEvents:locked?"none":"auto",opacity:locked?0.55:1,transition:"opacity 0.2s"}}>
      <div style={{display:"flex",background:"rgba(0,4,12,0.8)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",position:"relative"}}>
        {saveFlash&&<div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"#69F0AE",opacity:0.80,letterSpacing:1,transition:"opacity 0.40s cubic-bezier(0.25,0.46,0.45,0.94)",zIndex:2,pointerEvents:"none"}}>&#10003; saved</div>}
        {CATS.map(c=>{const on=cat===c.id;return(
          <button key={c.id} onClick={()=>setCat(on?null:c.id)} style={{flexShrink:0,minWidth:52,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"7px 4px",border:"none",cursor:"pointer",background:on?c.w:"transparent",borderBottom:on?`2px solid ${c.a}`:"2px solid transparent",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",position:"relative"}}>
            <span style={{fontSize:isMobile?13:15,lineHeight:1}}>{c.icon}</span>
            <span style={{fontSize:isMobile?10:12,letterSpacing:0,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,color:on?c.a:"rgba(255,255,255,0.55)",whiteSpace:"nowrap"}}>{c.label}{c.id==="activities"&&det.activities.length>0?<span style={{color:"#FF9F43",fontSize:isMobile?9:11}}> ({det.activities.length})</span>:""}{c.id==="misc"&&det.misc.length>0?<span style={{color:"#A29BFE",fontSize:isMobile?9:11}}> ({det.misc.length})</span>:""}</span>
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
              <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>✈️ {det.transport.mode||"Transport"}{det.transport.from&&det.transport.to?` · ${det.transport.from} → ${det.transport.to}`:""}{det.transport.cost?` · $${det.transport.cost}`:""}</div>
              {(det.transport.depTime||det.transport.arrTime)&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:2}}>{det.transport.depTime?`Departs ${det.transport.depTime}`:""}{det.transport.depTime&&det.transport.arrTime?" · ":""}{det.transport.arrTime?`Arrives ${det.transport.arrTime}`:""}</div>}
            </div>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
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
              <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>🏨 {det.stay.name}</div>
              {(det.stay.checkin||det.stay.checkout||det.stay.cost)&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:2}}>{det.stay.checkin?`Check-in ${fD(det.stay.checkin)}`:""}{det.stay.checkin&&det.stay.checkout?" · ":""}{det.stay.checkout?`Check-out ${fD(det.stay.checkout)}`:""}{det.stay.cost?` · $${det.stay.cost}`:""}</div>}
            </div>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6}}>
              <SDF label="PROPERTY" value={det.stay.name} onChange={v=>uS("name",v)} placeholder="Hotel / hostel / resort..." accent="#69F0AE"/>
              <SDF label="TOTAL COST ($)" type="number" value={det.stay.cost} onChange={v=>uS("cost",v)} placeholder="0" accent="#69F0AE"/>
            </div>
            <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:6,marginTop:6,overflow:"hidden"}}>
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
                      <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{a.name}</div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",display:"flex",gap:8,flexWrap:"wrap"}}>
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
              <div style={{fontSize:11,color:"rgba(255,217,61,0.4)",letterSpacing:1.5,marginBottom:6,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500}}>ADD ACTIVITY</div>
              <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:5,marginBottom:5,overflow:"hidden"}}>
                <div style={{flex:1,minWidth:0}}><SDF label="ACTIVITY" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#FFD93D"/></div>
                <div style={{flex:1,minWidth:0}}><SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#FFD93D"/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:5,marginBottom:6,overflow:"hidden"}}>
                <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#FFD93D"/>
                <SDF label="TRANSIT" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Taxi from hotel..." accent="#FFD93D"/>
              </div>
              <SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://klook.com / dive shop..." accent="#FFD93D"/>
              <button onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:[...d.activities,{...nAct,id:Date.now()}]}));setNAct({name:"",date:"",cost:"",transit:"",link:""});}} style={{marginTop:8,padding:isMobile?"5px 12px":"6px 14px",borderRadius:5,border:`1px solid rgba(255,217,61,${nAct.name?"0.4":"0.14"})`,background:nAct.name?"rgba(255,217,61,0.1)":"transparent",color:nAct.name?"#FFD93D":"rgba(255,255,255,0.18)",fontSize:isMobile?11:15,cursor:nAct.name?"pointer":"default",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:700}}>+ ADD</button>
            </div>
            <div style={{marginTop:12}}><SDF label="ACTIVITY NOTES" value={det.actNotes||""} onChange={v=>setDet(d=>({...d,actNotes:v}))} placeholder="Tips, what to bring, dress code, best time..." accent="#FFD93D" multiline/></div>
          </div>}
          {cat==="food"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
            {suggestion?.food&&!isDismSD('food')&&<div style={suggestionCardStyle}>
              <div style={suggestionHeaderStyle}>✦ FOOD & DINING</div>
              <div style={{fontSize:14,fontWeight:600,color:'#FFD93D',marginBottom:6}}>Est. {(suggestion.food.dailyBudget||"").replace(/\/day$/i,"")}/day{suggestion.food.totalEstimate?` · ~${suggestion.food.totalEstimate} total`:""}</div>
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
              <button onClick={aiFood} disabled={aiLoad} style={{padding:"5px 10px",borderRadius:5,border:"1px solid rgba(255,159,67,0.3)",background:"rgba(255,159,67,0.05)",color:"rgba(255,159,67,0.8)",fontSize:11,cursor:aiLoad?"wait":"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:600,whiteSpace:"nowrap",height:28,flexShrink:0}}>{aiLoad?"✦...":"✦ CO-ARCH EST"}</button>
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
                  <div style={{flex:1,fontSize:isMobile?12:15,color:"#FFF",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{m.name}</div>
                  <span style={{fontSize:isMobile?12:15,fontWeight:700,color:"#A29BFE",fontFamily:"monospace",flexShrink:0}}>${parseFloat(m.cost||0).toLocaleString()}</span>
                  <button onClick={()=>setDet(d=>({...d,misc:d.misc.filter(x=>x.id!==m.id)}))} style={{background:"none",border:"none",color:"rgba(255,255,255,0.18)",fontSize:16,cursor:"pointer",lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
                </div>
              ))}
              <div style={{paddingTop:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"rgba(255,255,255,0.25)",fontFamily:"monospace",letterSpacing:1}}>TOTAL MISC</span><span style={{fontSize:13,fontWeight:600,color:"rgba(162,155,254,0.8)",fontFamily:"monospace"}}>${det.misc.reduce((s,m)=>s+(parseFloat(m.cost)||0),0).toLocaleString()}</span></div>
            </div>}
            <div style={{background:"rgba(162,155,254,0.02)",border:"1px dashed rgba(162,155,254,0.16)",borderRadius:8,padding:"11px 12px"}}>
              <div style={{fontSize:11,color:"rgba(162,155,254,0.4)",letterSpacing:1.5,marginBottom:6,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500}}>ADD EXPENSE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
                <SDF label="ITEM" value={nMisc.name} onChange={v=>setNMisc(m=>({...m,name:v}))} placeholder="Visa / permit / rental..." accent="#A29BFE"/>
                <SDF label="COST ($)" type="number" value={nMisc.cost} onChange={v=>setNMisc(m=>({...m,cost:v}))} placeholder="0" accent="#A29BFE"/>
              </div>
              <button onClick={()=>{if(!nMisc.name)return;setDet(d=>({...d,misc:[...d.misc,{...nMisc,id:Date.now()}]}));setNMisc({name:"",cost:""});}} style={{padding:isMobile?"5px 12px":"6px 14px",borderRadius:5,border:`1px solid rgba(162,155,254,${nMisc.name?"0.4":"0.14"})`,background:nMisc.name?"rgba(162,155,254,0.1)":"transparent",color:nMisc.name?"#A29BFE":"rgba(255,255,255,0.18)",fontSize:isMobile?11:15,cursor:nMisc.name?"pointer":"default",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:700}}>+ ADD</button>
            </div>
          </div>}
          {/* arch #2: inline intel preview */}
          {cat==="intel"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
            {intelSnippet&&!intelSnippet.error?(
              <div style={{padding:"10px 12px",background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.14)",borderRadius:8}}>
                {intelSnippet.tagline&&<div style={{fontSize:isMobile?12:15,color:"#A29BFE",fontStyle:"italic",marginBottom:8,lineHeight:1.55}}>{intelSnippet.tagline}</div>}
                {intelSnippet.mustDo?.slice(0,3).map((item,i)=><div key={i} style={{fontSize:isMobile?11:15,color:"rgba(255,255,255,0.68)",marginBottom:4,paddingLeft:8}}>• {item}</div>)}
                {intelSnippet.streetIntel?.[0]&&<div style={{marginTop:8,padding:"6px 9px",background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.18)",borderRadius:6}}><div style={{fontSize:isMobile?10:15,color:"#FF6B6B",fontWeight:700,letterSpacing:1.5,marginBottom:2}}>{intelSnippet.streetIntel[0].type}</div><div style={{fontSize:isMobile?11:15,color:"#FFF"}}>{intelSnippet.streetIntel[0].alert}</div></div>}
                <div style={{marginTop:10,fontSize:isMobile?11:15,color:"rgba(0,229,255,0.5)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>→ Full briefing in INTEL tab</div>
              </div>
            ):(
              <div style={{padding:"12px 14px",background:"rgba(255,107,107,0.03)",border:"1px solid rgba(255,107,107,0.09)",borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18,opacity:0.35}}>🔭</span>
                <div><div style={{fontSize:isMobile?11:15,color:"rgba(255,255,255,0.38)",fontStyle:"italic",marginBottom:2}}>No briefing for {segment.name} yet.</div><div style={{fontSize:isMobile?11:15,color:"rgba(0,229,255,0.45)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>→ Generate in the INTEL tab</div></div>
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
    <div style={{border:'1px rgba(255,255,255,0.10)',borderTop:'1px solid rgba(255,255,255,0.18)',borderRadius:12,background:'rgba(0,8,20,0.85)',padding:'2px 0',marginBottom:8,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.3)',opacity:isCancelled?0.65:1,transition:"opacity 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
      {/* Change Flow Modal */}
      {showChangeModal&&(
        <div onClick={()=>setShowChangeModal(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,4,14,0.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:400,background:"rgba(0,8,20,0.98)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:14,padding:"24px 20px",animation:"fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontStyle:"italic",color:"#FF9F43",marginBottom:6}}>What happened?</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:20,lineHeight:1.7}}>{segment.name} is currently booked. What changed?</div>
            <div style={{display:"flex",gap:10,flexDirection:isMobile?"column":"row"}}>
              <button onClick={()=>{saveStatus('changed');setShowChangeModal(false);setOpen(true);}} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(0,229,255,0.4)",background:"rgba(0,229,255,0.08)",color:"#00E5FF",fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:44}}>UPDATE BOOKING</button>
              <button onClick={()=>{saveStatus('cancelled');setShowChangeModal(false);}} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(255,107,107,0.4)",background:"rgba(255,107,107,0.08)",color:"#FF6B6B",fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:44}}>MARK CANCELLED</button>
            </div>
            <button onClick={()=>setShowChangeModal(false)} style={{marginTop:12,width:"100%",background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:36}}>← Keep as BOOKED</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",alignItems:"stretch",minHeight:50,borderLeft:`2px solid ${borderColor}${open?"88":"2a"}`,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
        <div onClick={()=>{if(onSegmentTap){onSegmentTap(segment);}else{setOpen(o=>!o);}}} style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"10px 6px 10px 12px":"12px 10px 12px 20px",cursor:"pointer",background:open?`${tc}04`:"transparent",transition:"background 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flex:1,minWidth:0}}>
          {/* Row 1: dot + name + type badge + budget */}
          <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:tc,flexShrink:0,boxShadow:open?`0 0 7px ${tc}`:"none"}}/>
            <span style={{fontSize:isMobile?15:16,fontWeight:600,color:isCancelled?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.95)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:isCancelled?"line-through":"none"}}>{segment.name}</span>
            <span style={{fontSize:11,color:`${tc}bb`,background:`${tc}0e`,border:`1px solid ${tc}1e`,borderRadius:6,padding:"1px 6px",letterSpacing:0.5,fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>{segment.type?.toUpperCase()}</span>
            <span style={{fontSize:isMobile?12:14,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",flexShrink:0,textDecoration:isCancelled?"line-through":"none"}}>{fmt(segment.budget)}</span>
          </div>
          {/* Row 2: date + nights + dives */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,paddingLeft:13,minWidth:0,flexWrap:"wrap"}}>
            <span style={{color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:14,whiteSpace:"nowrap"}}>{fD(segment.arrival)}→{fD(segment.departure)}</span>
            <span style={{color:"rgba(255,255,255,0.60)",fontSize:14,whiteSpace:"nowrap"}}>· {segment.nights}n</span>
            {segment.diveCount>0&&<span style={{color:"rgba(0,229,255,0.7)",fontSize:14,whiteSpace:"nowrap"}}>· 🤿{segment.diveCount}</span>}
            <div style={{flex:1,minWidth:0}}/>
            <ProgDots phaseId={phaseId} segment={segment} intelSnippet={intelSnippet}/>
            <button onClick={handleBadgeTap} style={{background:planStatus?planStatus.bg:`${sc.color}18`,border:planStatus?`1px solid ${planStatus.border}`:`1px solid ${sc.color}55`,borderRadius:12,padding:"3px 8px",fontSize:11,fontWeight:700,letterSpacing:0.5,color:(planStatus||sc).color,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:2,lineHeight:1.4,minHeight:22,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flexShrink:0,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",animation:status==='planning'&&completedCount===0?'planningPulse 2.2s ease-in-out infinite':'none'}}>
              <span style={{fontSize:11}}>{planStatus?completedCount>=3?"✓":sc.icon:sc.icon}</span>{planStatus?planStatus.label:sc.label}
            </button>
          </div>
{segment.note&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,0.65)",lineHeight:1.5,marginTop:3,paddingLeft:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"90%"}}>{segment.note}</div>}
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
          <span style={{fontSize:10,color:askOpen?"#FFD93D":"rgba(255,217,61,0.4)",letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,whiteSpace:"nowrap"}}>ASK</span>
        </button></>}
      </div>
      {!open&&segData&&(hasTransport||hasStay||hasActivities||segData.food?.dailyBudget)&&(
        <div onClick={()=>setOpen(true)} style={{padding:"4px 14px 6px 20px",display:"flex",flexWrap:"wrap",gap:"4px 8px",cursor:"pointer",background:"rgba(0,4,14,0.4)"}}>
          {hasTransport&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",lineHeight:1.5}}>✈️ {segData.transport.mode||"Transport"}{segData.transport.from&&segData.transport.to?` · ${segData.transport.from} → ${segData.transport.to}`:""}{segData.transport.cost?` · $${segData.transport.cost}`:""}</span>}
          {hasStay&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",lineHeight:1.5}}>🏨 {segData.stay.name}{segData.stay.cost?` · $${segData.stay.cost}`:""}</span>}
          {hasActivities&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",lineHeight:1.5}}>⚡ {segData.activities.length} activit{segData.activities.length===1?"y":"ies"}{segData.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0)>0?` · $${segData.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}`:""}</span>}
          {segData.food?.dailyBudget&&<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap",lineHeight:1.5}}>🍜 ${segData.food.dailyBudget}/day</span>}
        </div>
      )}
      {askOpen&&(
        <div style={{background:"rgba(0,4,14,0.95)",borderTop:"1px solid rgba(255,217,61,0.12)",padding:"10px 14px",animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{fontSize:isMobile?11:15,color:"rgba(255,217,61,0.6)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1.5}}>✦ CO-ARCHITECT · {segment.name.toUpperCase()}</span>
            <button onClick={()=>setAskOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:isMobile?13:15,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          {(status==='changed'||status==='cancelled')&&<div style={{marginBottom:8,padding:"6px 9px",borderRadius:7,background:status==='changed'?"rgba(255,107,107,0.08)":"rgba(136,136,136,0.08)",border:`1px solid ${sc.color}33`}}><span style={{fontSize:10,color:sc.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>Looks like something changed with this {status==='cancelled'?'booking':'segment'}. Want help finding alternatives or adjusting your timeline?</span></div>}
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
            {["Best dive ops?","Where to stay?","What to skip?","Budget tips?","Local food?"].map(p=><button key={p} onClick={()=>setAskInput(p)} style={{padding:isMobile?"2px 7px":"3px 9px",borderRadius:12,border:"1px solid rgba(255,217,61,0.2)",background:"rgba(255,217,61,0.05)",color:"rgba(255,217,61,0.65)",fontSize:isMobile?10:15,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,whiteSpace:"nowrap"}}>{p}</button>)}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input value={askInput} onChange={e=>setAskInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendAsk();}} placeholder={`Ask about ${segment.name}...`} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:7,color:"#FFF",fontSize:isMobile?12:15,padding:isMobile?"6px 8px":"8px 10px",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",minHeight:isMobile?30:34,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onFocus={e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";}}/>
            <button onClick={sendAsk} style={{background:"rgba(255,217,61,0.12)",border:"1px solid rgba(255,217,61,0.3)",borderRadius:7,color:"#FFD93D",fontSize:isMobile?13:15,padding:isMobile?"5px 9px":"6px 11px",cursor:"pointer",minWidth:isMobile?30:34,minHeight:isMobile?30:34,fontWeight:700}}>↑</button>
          </div>
        </div>
      )}
      {open&&<SegmentDetails phaseId={phaseId} segment={segment} intelSnippet={intelSnippet} status={status} onStatusChange={saveStatus} suggestion={suggestion} suggestionsLoading={suggestionsLoading}/>}
      {isCancelled&&!open&&(
        <div style={{padding:"6px 16px 8px 20px",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:11,color:"rgba(136,136,136,0.7)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flex:1,letterSpacing:1}}>✕ CANCELLED</span>
          <button onClick={e=>{e.stopPropagation();saveStatus('planning');}} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"1px solid rgba(0,229,255,0.3)",background:"rgba(0,229,255,0.06)",color:"#00E5FF",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,minHeight:28}}>+ REBOOK</button>
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
function SegmentWorkspace({segment,phaseId,phaseName:phaseLabelName,phaseFlag,intelSnippet,onBack,onBackToExpedition,suggestion:suggestionProp,suggestionsLoading,homeCity="",prevCity="",allPhases=[]}) {
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
  const TABS=[{id:"transport",label:"TRAVEL",icon:"✈️"},{id:"stay",label:"STAY",icon:"🏨"},{id:"activities",label:isMobile?"ACTS":"ACTIVITIES",icon:"🎯",count:det.activities.length},{id:"food",label:"FOOD",icon:"🍜"},{id:"budget",label:"BUDGET",icon:"💰"},{id:"docs",label:"DOCS",icon:"📋"},{id:"calendar",label:isMobile?"CAL":"CALENDAR",icon:"📅"}];
  return(
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:300,background:'#3C2418',overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      <WorldMapBackground phases={allPhases} activeCountry={(() => { const match = (allPhases||[]).find(p => p.name === phaseLabelName); return match ? match.country : phaseLabelName; })()}/>
      <div className="mc-content" style={{width:1126,maxWidth:'100%',margin:'0 auto',borderInline:'1px solid var(--border, #2e303a)',overflow:'visible',flex:'none',minHeight:'100%',boxSizing:'border-box',position:'relative',zIndex:1}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'12px 0',gap:10,background:'rgba(0,8,16,0.95)',borderBottom:'1px solid rgba(255,159,67,0.15)',position:'sticky',top:0,zIndex:10}}>
        {isMobile?<button onClick={onBack} style={{background:'none',border:'none',color:'#FF9F43',fontSize:24,cursor:'pointer',padding:'0 8px 0 0',fontWeight:300,lineHeight:1,minWidth:32,minHeight:44,display:'flex',alignItems:'center',gap:6}}>‹ <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:2,opacity:0.65}}>{phaseLabelName.toUpperCase()}</span></button>
        :<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>
          <span onClick={onBackToExpedition||onBack} style={{color:'#FF9F43',cursor:'pointer'}}>←</span>
          <span onClick={onBackToExpedition||onBack} style={{color:'rgba(255,255,255,0.60)',cursor:'pointer',letterSpacing:1}}>EXPEDITION</span>
          <span style={{color:'rgba(255,255,255,0.30)'}}>›</span>
          <span onClick={onBack} style={{color:'rgba(255,255,255,0.60)',cursor:'pointer',letterSpacing:1}}>{phaseLabelName.toUpperCase()}</span>
          <span style={{color:'rgba(255,255,255,0.25)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.85)',letterSpacing:1}}>{segment.name.toUpperCase()}</span>
        </div>}
        <div style={{flex:1,minWidth:0}}>
          {isMobile&&<div style={{fontSize:17,fontWeight:600,color:'#FFFFFF',fontFamily:"'Fraunces',serif"}}>{segment.name}</div>}
          <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:isMobile?2:0}}>{isMobile?`${segment.nights}n`:`${segment.nights} Nights`} · {segment.type} · {fmt(segment.budget)}</div>
        </div>
      </div>
      {/* Tab bar */}
      <div style={{display:'flex',justifyContent:'center',background:'rgba(0,4,12,0.95)',borderBottom:'1px solid rgba(255,255,255,0.08)',position:'sticky',top:isMobile?68:56,zIndex:9}}>
        {TABS.map(t=>{const on=tab===t.id;return(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:isMobile?1:undefined,minWidth:isMobile?0:undefined,padding:isMobile?'10px 2px':'10px 16px',background:'none',border:'none',borderBottom:on?'2px solid #FF9F43':'2px solid transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,transition:'all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)',overflow:'hidden',opacity:on?1:0.75,transform:on?'scale(1.05)':'scale(1)'}}>
            <span style={{fontSize:isMobile?20:20,lineHeight:1}}>{t.icon}</span>
            {!isMobile&&<span style={{fontSize:13,fontWeight:600,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:on?'#FF9F43':'rgba(255,255,255,0.45)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{t.label}{t.count>0?` (${t.count})`:""}</span>}
            {isMobile&&t.count>0&&<span style={{fontSize:9,fontWeight:600,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:on?'#FF9F43':'rgba(255,255,255,0.45)'}}>{t.count}</span>}
          </button>
        );})}
        {saveFlash&&<div style={{position:'absolute',right:8,top:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:'#69F0AE',opacity:0.80,letterSpacing:1,pointerEvents:'none'}}>✓ saved</div>}
      </div>
      {/* Tab content */}
      <div key={tab} style={{border:'1.5px solid rgba(255,255,255,0.10)',borderRadius:16,background:'rgba(0,8,20,0.85)',padding:'16px 14px',margin:'12px 0',minHeight:300,animation:'tabFadeIn 400ms cubic-bezier(0.25,0.46,0.45,0.94)'}}>
        {/* TRANSPORT */}
        {tab==="transport"&&<div style={{padding:0}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.transport&&!isDism('transport')&&!hasT&&<div className="sg-suggestion-card" style={suggestionCardStyle}>
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
          {hasT&&<div style={{border:'1.5px solid rgba(255,159,67,0.45)',borderRadius:14,background:'rgba(255,140,50,0.14)',padding:'18px 20px',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,flex:1}}>✈️ TRANSPORT</span>
              <button onClick={()=>{const from=encodeURIComponent(det.transport.from||'');const to=encodeURIComponent(det.transport.to||'');setBookDropdown(bookDropdown==='transport'?null:'transport');}} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button onClick={()=>setEditingTransport(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28}}>{editingTransport?'DONE':'EDIT'}</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.transport.from&&det.transport.to?`${det.transport.from} → ${det.transport.to}`:det.transport.mode||"Transport"}</div>
            {(det.transport.depTime||det.transport.cost)&&<div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{det.transport.depTime?`${det.transport.depTime}`:""}{det.transport.depTime&&det.transport.cost?" · ":""}{det.transport.cost?`Est. $${det.transport.cost}`:""}{det.transport.mode&&det.transport.from?` · ${det.transport.mode}`:""}</div>}
            {det.transport.notes&&!editingTransport&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,color:'rgba(255,255,255,0.60)',marginTop:6,lineHeight:1.5,whiteSpace:'pre-line'}}>{det.transport.notes.length>120?det.transport.notes.slice(0,120)+'...':det.transport.notes}</div>}
            {det.transport.link&&<a href={det.transport.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.transport.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
          </div>}
          {bookDropdown==='transport'&&<div style={{position:'relative',zIndex:100,marginBottom:10}}><div style={{background:'#1A1208',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:8,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.60)',letterSpacing:2,padding:'4px 14px'}}>SEARCH FLIGHTS</div>
            {[{n:'Google Flights',u:`https://www.google.com/travel/flights?q=${encodeURIComponent((det.transport.from||'')+' to '+(det.transport.to||''))}`},{n:'Skyscanner',u:'https://www.skyscanner.com'},{n:'Kayak',u:'https://www.kayak.com/flights'},{n:'Rome2rio',u:`https://www.rome2rio.com/map/${encodeURIComponent(det.transport.from||'')}/${encodeURIComponent(det.transport.to||'')}`}].map(l=><a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer" onClick={()=>setBookDropdown(null)} style={{display:'block',padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.75)',borderRadius:8,cursor:'pointer',textDecoration:'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,159,67,0.08)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{l.n}</a>)}
          </div></div>}
          {hasT&&editingTransport&&<div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginBottom:14,animation:'slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
              <SDF label="FROM" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="Departure city" accent="#00E5FF"/>
              <SDF label="TO" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="Arrival city" accent="#00E5FF"/>
              <SDF label="DEP TIME" value={det.transport.depTime} onChange={v=>uT("depTime",v)} placeholder="08:30 AM" accent="#00E5FF"/>
              <SDF label="ARR TIME" value={det.transport.arrTime} onChange={v=>uT("arrTime",v)} placeholder="11:45 AM" accent="#00E5FF"/>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.transport.link||""} onChange={v=>uT("link",v)} placeholder="https://..." accent="#00E5FF"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="Flight number, booking ref..." accent="#00E5FF" multiline/></div>
            <button onClick={()=>setEditingTransport(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(0,229,255,0.12)',color:'#00E5FF',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
          </div>}
          {!hasT&&!editingTransport&&<div>
            {!(suggestion?.transport&&!isDism('transport'))&&!suggestionsLoading&&<div style={{textAlign:'center',padding:'24px 0 20px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.40)',marginBottom:12}}>No transport planned yet.</div></div>}
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <SDF label="MODE" value={det.transport.mode} onChange={v=>uT("mode",v)} placeholder="Flight / Ferry / Car..." accent="#00E5FF"/>
              <SDF label="COST ($)" type="number" value={det.transport.cost} onChange={v=>uT("cost",v)} placeholder="0" accent="#00E5FF"/>
              <SDF label="FROM" value={det.transport.from} onChange={v=>uT("from",v)} placeholder="Departure city" accent="#00E5FF"/>
              <SDF label="TO" value={det.transport.to} onChange={v=>uT("to",v)} placeholder="Arrival city" accent="#00E5FF"/>
            </div>
            {(transportEstLoading||transportEst)&&<div style={{padding:'8px 12px',marginTop:8,borderRadius:8,background:'rgba(255,159,67,0.04)',border:'1px solid rgba(255,159,67,0.12)',display:'flex',alignItems:'center',gap:8}}>
              {transportEstLoading?<span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.60)',letterSpacing:1}}>✦ Estimating...</span>
              :transportEst&&<span onClick={()=>{if(transportEst.estimate)uT("cost",transportEst.estimate.replace(/[^0-9]/g,'').slice(0,6));}} style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:0.5,cursor:'pointer'}}>✦ Est. {transportEst.estimate}{transportEst.note?` — ${transportEst.note}`:""} <span style={{color:'#FF9F43',textDecoration:'underline'}}>use</span></span>}
            </div>}
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10,marginTop:10}}>
              <SDF label="DEP TIME" value={det.transport.depTime} onChange={v=>uT("depTime",v)} placeholder="08:30 AM" accent="#00E5FF"/>
              <SDF label="ARR TIME" value={det.transport.arrTime} onChange={v=>uT("arrTime",v)} placeholder="11:45 AM" accent="#00E5FF"/>
            </div>
            <div style={{marginTop:10}}><SDF label="BOOKING LINK" value={det.transport.link||""} onChange={v=>uT("link",v)} placeholder="https://..." accent="#00E5FF"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={det.transport.notes} onChange={v=>uT("notes",v)} placeholder="Flight number, booking ref..." accent="#00E5FF" multiline/></div>
          </div>}
        </div>}
        {/* STAY */}
        {tab==="stay"&&<div style={{padding:0}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.stay&&!isDism('stay')&&!hasS&&<div className="sg-suggestion-card" style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ CO-ARCHITECT SUGGESTION</div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:6}}>{suggestion.stay.recommendation}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginBottom:8}}>{suggestion.stay.type}</div>
            {suggestion.stay.suggestions?.length>0&&<div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.40)',letterSpacing:2,marginBottom:6}}>SELECT PROPERTY</div>
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
          {hasS&&!showStayResuggest&&<div style={{border:'1.5px solid rgba(255,159,67,0.45)',borderRadius:14,background:'rgba(255,140,50,0.14)',padding:'18px 20px',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,flex:1}}>🏨 ACCOMMODATION</span>
              <button onClick={()=>setBookDropdown(bookDropdown==='stay'?null:'stay')} style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28,marginRight:6}}>🔗</button>
              <button onClick={()=>setEditingStay(e=>!e)} style={{background:'none',border:'1px solid rgba(255,159,67,0.30)',borderRadius:6,color:'rgba(255,159,67,0.70)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,padding:'4px 10px',cursor:'pointer',minHeight:28}}>{editingStay?'DONE':'EDIT'}</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{det.stay.name}</div>
            {(det.stay.checkin||det.stay.checkout)&&<div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{det.stay.checkin?`Check-in ${fD(det.stay.checkin)}`:""}{det.stay.checkin&&det.stay.checkout?" · ":""}{det.stay.checkout?`Check-out ${fD(det.stay.checkout)}`:""}{segment.nights?` · ${segment.nights} nights`:""}</div>}
            {det.stay.cost&&<div style={{fontSize:13,color:'#FFD93D',fontWeight:600,marginBottom:4}}>Est. ${det.stay.cost}</div>}
            {det.stay.notes&&!editingStay&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,color:'rgba(255,255,255,0.60)',marginTop:6,lineHeight:1.5,whiteSpace:'pre-line'}}>{det.stay.notes.length>140?det.stay.notes.slice(0,140)+'...':det.stay.notes}</div>}
            {det.stay.link&&<a href={det.stay.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:4}}>{det.stay.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
            {suggestion?.stay?.suggestions?.length>1&&<div onClick={()=>setShowStayResuggest(true)} style={{fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',cursor:'pointer',marginTop:8,textDecoration:'underline'}}>↩ View other suggestions</div>}
          </div>}
          {hasS&&showStayResuggest&&suggestion?.stay&&<div className="sg-suggestion-card" style={suggestionCardStyle}>
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
            <button onClick={()=>setEditingStay(false)} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'rgba(105,240,174,0.12)',color:'#69F0AE',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:40}}>SAVE CHANGES</button>
          </div>}
          {!hasS&&!(suggestion?.stay&&!isDism('stay'))&&!suggestionsLoading&&<div>
            <div style={{textAlign:'center',padding:'24px 0 20px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,255,255,0.40)',marginBottom:12}}>No accommodation planned yet.</div></div>
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
          </div>}
        </div>}
        {/* ACTIVITIES */}
        {tab==="activities"&&<div style={{padding:0}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.activities?.map((activity,idx)=>(
            !isDism(`activity_${idx}`)&&<div key={idx} className="sg-suggestion-card" style={{...suggestionCardStyle,marginBottom:10,animationDelay:`${idx*100}ms`}}>
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
                  <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,217,61,0.65)',letterSpacing:2,flex:1}}>⚡ ACTIVITY</span>
                  <a href={`https://www.viator.com/search/${encodeURIComponent(segment.name+' '+a.name)}`} target="_blank" rel="noopener noreferrer" style={{background:'none',border:'1px solid rgba(0,229,255,0.25)',borderRadius:6,color:'rgba(0,229,255,0.60)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'3px 8px',textDecoration:'none',minHeight:24,display:'flex',alignItems:'center'}}>🔗</a>
                  <button onClick={()=>setDet(d=>({...d,activities:d.activities.filter(x=>x.id!==a.id)}))} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'rgba(255,255,255,0.35)',fontSize:11,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",padding:'3px 8px',cursor:'pointer',minHeight:24}}>✕</button>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{a.name}</div>
                {a.provider&&<div style={{fontSize:12,color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:4}}>{a.provider}</div>}
                {a.brief&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.75)',marginBottom:8,marginTop:4,lineHeight:1.6}}>{a.brief}</div>}
                <div style={{fontSize:13,color:'#FF9F43',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",display:'flex',gap:8,flexWrap:'wrap',marginBottom:a.tip||a.link?6:0}}>
                  {a.date?<span>{fD(a.date)}</span>:segment.arrival&&<span style={{fontStyle:'italic',color:'rgba(255,159,67,0.60)',fontSize:12}}>within {fD(segment.arrival)}–{fD(segment.departure)}</span>}{a.cost&&<span style={{color:'#FFD93D'}}>Est. ${a.cost}</span>}
                </div>
                {a.tip&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,color:'rgba(255,255,255,0.60)',lineHeight:1.5,marginTop:4}}>💡 {a.tip}</div>}
                {a.link&&<a href={a.link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#00E5FF',textDecoration:'none',display:'inline-block',marginTop:6}}>{a.link.replace(/^https?:\/\//,"").slice(0,40)}</a>}
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'4px 2px'}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.60)',fontFamily:'monospace',letterSpacing:1}}>TOTAL</span>
              <span style={{fontSize:14,fontWeight:600,color:'rgba(255,217,61,0.85)',fontFamily:'monospace'}}>${det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0).toLocaleString()}</span>
            </div>
          </div>}
          {det.activities.length===0&&!(suggestion?.activities?.some((_,i)=>!isDism(`activity_${i}`)))&&!suggestionsLoading&&<div style={{textAlign:'center',padding:'24px 0 16px'}}><div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:'italic',color:'rgba(255,217,61,0.40)'}}>No activities planned yet — dives, tours, day trips</div></div>}
          <div style={{border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,background:'rgba(255,255,255,0.04)',padding:16,marginTop:4}}>
            <div style={{fontSize:12,color:'rgba(255,217,61,0.60)',letterSpacing:2,marginBottom:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>+ ADD ACTIVITY</div>
            <SDF label="ACTIVITY NAME" value={nAct.name} onChange={v=>setNAct(a=>({...a,name:v}))} placeholder="Dive / temple / hike..." accent="#FFD93D"/>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:8,marginTop:8,overflow:'hidden'}}>
              <SDF label="DATE" type="date" value={nAct.date} onChange={v=>setNAct(a=>({...a,date:v}))} accent="#FFD93D"/>
              <SDF label="COST ($)" type="number" value={nAct.cost} onChange={v=>setNAct(a=>({...a,cost:v}))} placeholder="0" accent="#FFD93D"/>
            </div>
            <div style={{marginTop:8}}><SDF label="BOOKING LINK" value={nAct.link} onChange={v=>setNAct(a=>({...a,link:v}))} placeholder="https://..." accent="#FFD93D"/></div>
            <div style={{marginTop:8}}><SDF label="NOTES" value={nAct.transit} onChange={v=>setNAct(a=>({...a,transit:v}))} placeholder="Tips, what to bring..." accent="#FFD93D" multiline/></div>
            <button onClick={()=>{if(!nAct.name)return;setDet(d=>({...d,activities:[...d.activities,{...nAct,id:Date.now()}]}));setNAct({name:"",date:"",cost:"",transit:"",link:""});}} style={{marginTop:12,padding:'12px 20px',borderRadius:10,border:'none',background:nAct.name?'linear-gradient(135deg,rgba(255,159,67,0.25),rgba(255,217,61,0.15))':'rgba(255,255,255,0.04)',color:nAct.name?'#FFD93D':'rgba(255,255,255,0.20)',fontSize:12,cursor:nAct.name?'pointer':'default',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1.5,fontWeight:700,width:'100%',minHeight:44}}>ADD TO PLAN</button>
          </div>
          <div style={{marginTop:14}}><SDF label="ACTIVITY NOTES" value={det.actNotes||""} onChange={v=>setDet(d=>({...d,actNotes:v}))} placeholder="Tips, what to bring, dress code..." accent="#FFD93D" multiline/></div>
        </div>}
        {/* FOOD */}
        {tab==="food"&&<div style={{padding:0}}>
          {suggestionsLoading&&!suggestion&&<div style={{padding:'12px 16px',marginBottom:16,border:'1px solid rgba(255,159,67,0.15)',borderRadius:12,background:'rgba(255,159,67,0.03)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>CO-ARCHITECT IS PREPARING YOUR SUGGESTIONS...</span>
          </div>}
          {suggestion?.food&&!isDism('food')&&<div className="sg-suggestion-card" style={suggestionCardStyle}>
            <div style={suggestionHeaderStyle}>✦ FOOD & DINING</div>
            <div style={{fontSize:14,fontWeight:600,color:'#FFD93D',marginBottom:8}}>Est. {(suggestion.food.dailyBudget||"").replace(/\/day$/i,"")}/day{suggestion.food.totalEstimate?` · ~${suggestion.food.totalEstimate} total`:""}</div>
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
            <button onClick={aiFood} disabled={aiLoad} style={{padding:'8px 14px',borderRadius:6,border:'1px solid rgba(255,159,67,0.3)',background:'rgba(255,159,67,0.05)',color:'rgba(255,159,67,0.8)',fontSize:12,cursor:aiLoad?'wait':'pointer',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,fontWeight:600,whiteSpace:'nowrap',height:34,flexShrink:0}}>{aiLoad?"✦...":"✦ CO-ARCH EST"}</button>
          </div>
          {det.food.dailyBudget&&<div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'rgba(255,159,67,0.05)',border:'1px solid rgba(255,159,67,0.16)',borderRadius:8,marginBottom:10}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.60)',fontFamily:'monospace'}}>{segment.nights} nights × ${det.food.dailyBudget}/day</span>
            <span style={{fontSize:14,fontWeight:600,color:'rgba(255,217,61,0.85)',fontFamily:'monospace'}}>${(parseFloat(det.food.dailyBudget)*segment.nights).toLocaleString()}</span>
          </div>}
          <SDF label="FOOD NOTES" value={det.food.notes} onChange={v=>uF("notes",v)} placeholder="Must-try dishes, market days, dietary notes..." accent="#FF9F43" multiline/>
        </div>}
        {/* BUDGET */}
        {tab==="budget"&&(()=>{const tCost=parseFloat(det.transport?.cost)||0;const sCost=parseFloat(det.stay?.cost)||0;const aCost=det.activities.reduce((s,a)=>s+(parseFloat(a.cost)||0),0);const fCost=(parseFloat(det.food?.dailyBudget)||0)*segment.nights;const mCost=det.misc.reduce((s,m)=>s+(parseFloat(m.cost)||0),0);const total=tCost+sCost+aCost+fCost+mCost;const budget=segment.budget||0;const pct=budget>0?Math.round((total/budget)*100):0;const barColor=pct>=100?'#FF6B6B':pct>=80?'#FFD93D':'#00E5FF';return(
          <div style={{padding:0}}>
            <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,marginBottom:12}}>PHASE BUDGET</div>
            <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{segment.name}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:16}}>{segment.nights} Nights · Budget: {fmt(budget)}</div>
            {[{icon:'✈️',label:'TRANSPORT',cost:tCost,has:hasT},{icon:'🏨',label:'STAY',cost:sCost,has:hasS},{icon:'⚡',label:'ACTIVITIES',cost:aCost,has:det.activities.length>0},{icon:'🍜',label:'FOOD',cost:fCost,has:!!det.food?.dailyBudget},{icon:'💸',label:'MISC',cost:mCost,has:det.misc.length>0}].map(r=>(
              <div key={r.label} style={{display:'flex',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{fontSize:20,marginRight:10}}>{r.icon}</span>
                <span style={{flex:1,fontSize:13,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.70)',letterSpacing:1}}>{r.label}</span>
                <span style={{fontSize:15,fontWeight:600,color:'#FFFFFF',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginRight:12}}>{r.cost>0?fmt(r.cost):'—'}</span>
                <span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:r.has?'#69F0AE':'rgba(255,255,255,0.60)',letterSpacing:1}}>{r.has?'✓ Added':'—'}</span>
              </div>
            ))}
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
            <div style={{textAlign:'center',marginTop:6,fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:barColor}}>{pct}% allocated</div>
            {pct>=100&&<div style={{marginTop:10,padding:'10px 14px',border:'1.5px solid rgba(255,107,107,0.40)',borderRadius:8,background:'rgba(255,107,107,0.06)',fontSize:12,color:'#FF6B6B',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>⚠️ Over budget by {fmt(total-budget)}</div>}
          </div>);})()}
        {/* DOCS & VISA */}
        {tab==="docs"&&<div style={{padding:0}}>
          <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,159,67,0.65)',letterSpacing:2,marginBottom:12}}>DOCS & VISA</div>
          <div style={{fontSize:15,fontWeight:700,color:'#FFFFFF',marginBottom:4}}>{segment.name}, {segment.country}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:16}}>{segment.nights} Nights</div>
          {!docsData&&!docsLoading&&<div style={{textAlign:'center',padding:'24px 0'}}><button onClick={loadDocs} style={{padding:'12px 24px',borderRadius:10,border:'1px solid rgba(255,159,67,0.40)',background:'rgba(255,159,67,0.08)',color:'#FF9F43',fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,cursor:'pointer',minHeight:44}}>✦ GENERATE TRAVEL DOCS BRIEF</button></div>}
          {docsLoading&&<div style={{textAlign:'center',padding:'24px 0'}}><div style={{width:8,height:8,borderRadius:'50%',background:'rgba(255,159,67,0.6)',animation:'pulse 1.5s ease-in-out infinite',margin:'0 auto 8px'}}/><span style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'rgba(255,255,255,0.60)',letterSpacing:1}}>GENERATING DOCS BRIEF...</span></div>}
          {docsData&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
            {docsData.visa&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🛂 VISA REQUIREMENTS</div><div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:'rgba(255,255,255,0.85)',lineHeight:1.7}}>{docsData.visa.details}{docsData.visa.cost?` · Cost: ${docsData.visa.cost}`:''}</div></div>}
            {docsData.health&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>💉 HEALTH</div>{docsData.health.required?.length>0&&<div style={{padding:'6px 10px',background:'rgba(255,200,0,0.06)',border:'1px solid rgba(255,200,0,0.20)',borderRadius:6,marginBottom:4,fontSize:13,color:'#FFD93D'}}>⚠️ Required: {docsData.health.required.join(', ')}</div>}{docsData.health.recommended?.length>0&&<div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Recommended: {docsData.health.recommended.join(', ')}</div>}{docsData.health.notes&&<div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4}}>{docsData.health.notes}</div>}</div>}
            {docsData.money&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>💵 MONEY & CURRENCY</div>{docsData.money.warning&&<div style={{padding:'6px 10px',background:'rgba(255,200,0,0.06)',border:'1px solid rgba(255,200,0,0.20)',borderRadius:6,marginBottom:4,fontSize:13,color:'#FFD93D'}}>⚠️ {docsData.money.warning}</div>}<div style={{fontSize:13,color:'rgba(255,255,255,0.80)',lineHeight:1.5}}>{docsData.money.currency}{docsData.money.tips?` · ${docsData.money.tips}`:''}</div></div>}
            {docsData.connectivity&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>📶 CONNECTIVITY</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{docsData.connectivity.tips}</div></div>}
            {docsData.safety&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🛡️ SAFETY</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Level: {docsData.safety.level}{docsData.safety.notes?` · ${docsData.safety.notes}`:''}</div></div>}
            {docsData.customs&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🤝 LOCAL CUSTOMS</div><div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{docsData.customs.tips}</div></div>}
            {docsData.emergency&&<div><div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#FF9F43',letterSpacing:2,marginBottom:6}}>🆘 EMERGENCY CONTACTS</div><div style={{display:'flex',flexDirection:'column',gap:4}}>{docsData.emergency.police&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Police: {docsData.emergency.police}</div>}{docsData.emergency.ambulance&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Ambulance: {docsData.emergency.ambulance}</div>}{docsData.emergency.embassy&&<div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:'#00E5FF'}}>Embassy: {docsData.emergency.embassy}</div>}</div></div>}
          </div>}
          <div style={{marginTop:16}}><SDF label="PERSONAL NOTES" value={docsNote} onChange={v=>{setDocsNote(v);setDet(d=>({...d,intel:{...d.intel,notes:v}}));}} placeholder="Visa application status, insurance details, personal contacts..." accent="#FF9F43" multiline/></div>
        </div>}
        {tab==="calendar"&&(()=>{const items=[];if(det.transport.mode||det.transport.from)items.push({type:"transport",icon:"✈️",label:det.transport.mode||"Transport",sub:`${det.transport.from||""}→${det.transport.to||""}`,color:"#00E5FF",date:segment.arrival});if(det.stay.name)items.push({type:"stay",icon:"🏨",label:det.stay.name,sub:det.stay.checkin&&det.stay.checkout?`${fD(det.stay.checkin)} – ${fD(det.stay.checkout)}`:`${segment.nights} nights`,color:"#69F0AE",date:det.stay.checkin||segment.arrival});det.activities.forEach(a=>items.push({type:"activity",icon:"🎯",label:a.name,sub:a.cost?`$${a.cost}`:"",color:"#FFD93D",date:a.date}));if(det.food.dailyBudget)items.push({type:"food",icon:"🍜",label:`Food · $${det.food.dailyBudget}/day`,sub:`${segment.nights} days`,color:"#FF9F43"});const hasItems=items.length>0;return(
          <div style={{padding:0}}>
            {!hasItems&&<div style={{textAlign:"center",padding:"40px 20px",minHeight:"auto"}}>
              <div style={{fontSize:32,marginBottom:12}}>📅</div>
              <div style={{color:"rgba(255,255,255,0.5)",fontFamily:"'Fraunces',serif",fontStyle:"italic",fontSize:15,lineHeight:1.6}}>Your calendar fills as you plan.</div>
              <div style={{color:"rgba(255,159,67,0.6)",fontSize:12,letterSpacing:2,marginTop:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>ADD TRANSPORT · STAY · ACTIVITIES TO SEE YOUR DAYS</div>
            </div>}
            {hasItems&&<div>
              <div style={{fontSize:12,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:"rgba(255,159,67,0.65)",letterSpacing:2,marginBottom:12}}>PLANNED ITEMS</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {items.map((it,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:`${it.color}08`,border:`1px solid ${it.color}30`,borderRadius:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>{it.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:600,color:"#FFF",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{it.label}</div>
                    {it.sub&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{it.sub}</div>}
                  </div>
                  {it.date&&<div style={{fontSize:12,color:it.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,whiteSpace:"nowrap"}}>{fD(it.date)}</div>}
                </div>)}
              </div>
            </div>}
          </div>
        );})()}
      </div>
      </div>
    </div>
  );
}

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
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:200,background:'#3C2418',overflowY:'auto',animation:'slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'}}>
      <WorldMapBackground phases={allPhases} activeCountry={phase.country}/>
      <div className="mc-content" style={{width:1126,maxWidth:'100%',margin:'0 auto',borderInline:'1px solid var(--border, #2e303a)',overflow:'visible',flex:'none',minHeight:'100%',boxSizing:'border-box',position:'relative',zIndex:1}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'12px 0',gap:12,background:'rgba(0,8,16,0.95)',borderBottom:'1px solid rgba(0,229,255,0.12)',position:'sticky',top:0,zIndex:10}}>
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
          {phase.note&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:300,fontStyle:'italic',color:'rgba(255,255,255,0.55)',lineHeight:1.7,paddingLeft:42,marginTop:8,borderLeft:'2px solid rgba(255,255,255,0.08)',marginLeft:40}}>{phase.note}</div>}
          {pct>0&&<div style={{marginTop:10,paddingLeft:42,display:'flex',alignItems:'center',gap:8}}>
            <div style={{height:2,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden',width:80}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${phase.color}55,${phase.color})`,borderRadius:2,transition:'width 0.60s cubic-bezier(0.25,0.46,0.45,0.94)'}}/></div>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{pct}% PLANNED</span>
          </div>}
        </div>
        {/* Segments */}
        <div style={{paddingTop:4,paddingBottom:20}}>
          <div style={{padding:'10px 16px 6px',fontSize:11,color:'rgba(255,255,255,0.3)',letterSpacing:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>{phase.segments.length} SEGMENT{phase.segments.length!==1?'S':''} · TAP TO PLAN</div>
          {phase.segments.map((seg,i)=>(
            <SegmentRow key={seg.id} segment={seg} phaseId={phase.id} phaseColor={phase.color} intelSnippet={intelData?.[seg.name]} isLast={i===phase.segments.length-1} onAskOpenChange={setAnyAskOpen} suggestion={findSuggestionForSegment(allSuggestions, seg.name)} suggestionsLoading={suggestionsLoading}/>
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
        {phase.note&&<div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.62)",lineHeight:1.65,paddingLeft:28,marginBottom:6,marginTop:1}}>{phase.note}</div>}
        <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:28,flexWrap:"nowrap"}}>
          <span style={{fontSize:15,color:"rgba(255,255,255,0.62)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500,whiteSpace:"nowrap"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>
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
            <span style={{fontSize:11,color:`${phase.color}cc`,letterSpacing:1.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,whiteSpace:"nowrap"}}>{phase.segments.length} SEGMENT{phase.segments.length>1?"S":""} · TAP TO EXPAND PLANNING TABS</span>
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
      {phaseDetailView&&<PhaseDetailPage phase={phaseDetailView} intelData={explorerData} onBack={()=>setPhaseDetailView(null)} segmentSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading} homeCity={tripData.departureCity||tripData.city||""} segPhases={segPhases} warningFlags={warningFlags} onDismissWarning={dismissWarning} allPhases={tripData.phases||[]}/>}
      {showOnboard&&<OnboardCard storageKey="trip" ctaLabel="✦ ENTER MY EXPEDITION" onDismiss={()=>setShowOnboard(false)}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,letterSpacing:4,color:"rgba(0,229,255,0.75)",marginBottom:10}}>TRIP CONSOLE</div>
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
                <span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:isMobile?11:13,fontWeight:700,letterSpacing:2,color:t.color}}>{t.label}</span>
                <span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:isMobile?11:13,color:"rgba(255,255,255,0.65)",marginLeft:5}}>{t.desc}</span>
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
        <button onClick={onRevise} style={{padding:"6px 16px",borderRadius:7,border:"1.5px solid rgba(0,229,255,0.55)",background:"rgba(0,229,255,0.12)",color:"#00E5FF",fontSize:14,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1,minHeight:32}}>✏️ REVISE</button>
        <button onClick={handleNewTripClick} style={{padding:"6px 14px",borderRadius:7,border:confirmNewTrip?"1px solid rgba(255,107,107,0.5)":"1px solid rgba(255,255,255,0.18)",background:confirmNewTrip?"rgba(255,107,107,0.12)":"transparent",color:confirmNewTrip?"#FF6B6B":"rgba(255,255,255,0.45)",fontSize:13,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:confirmNewTrip?700:400,letterSpacing:1,minHeight:32}}>{confirmNewTrip?"⚠️ CONFIRM?":"+ NEW TRIP"}</button>
      </div>}
      {!isFullscreen&&<div style={{padding:isMobile?"8px 12px 6px":"10px 16px 8px",background:isMobile?"rgba(0,8,16,0.10)":"linear-gradient(180deg,rgba(21,15,10,0.98),rgba(21,15,10,0.99))",borderBottom:"1px solid rgba(232,220,200,0.06)",position:"relative",overflow:"hidden",zIndex:1}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 50%,rgba(232,220,200,0.02) 0%,transparent 60%)",pointerEvents:"none"}}/>
        {tripData.tripName&&<div style={{marginBottom:isMobile?5:7,position:"relative"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:17,fontWeight:300,fontStyle:"italic",color:"#E8DCC8",lineHeight:1}}>{tripData.tripName}</div>
          {!isMobile&&<div style={{fontSize:15,color:"rgba(232,220,200,0.45)",letterSpacing:2,marginTop:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{[...new Set(flatPhases.map(p=>p.country))].join(" · ")}</div>}
        </div>}
        {isMobile?(()=>{
          const allSegD=loadSeg();
          let totalSegs=0,filledSegs=0;
          segPhases.forEach(p=>p.segments.forEach(s=>{totalSegs++;const d=allSegD[`${p.id}-${s.id}`]||{};if(d.transport?.mode||d.transport?.cost||d.stay?.name||d.stay?.cost||(d.activities?.length||0)>0)filledSegs++;}));
          const readPct=totalSegs>0?Math.round((filledSegs/totalSegs)*100):0;
          return(
            <div data-coach="trip-stats" style={{background:'rgba(10,7,5,0.55)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderRadius:14,border:'1.5px solid rgba(0,229,255,0.35)',borderTop:'1.5px solid rgba(0,229,255,0.65)',boxShadow:'inset 0 1px 0 rgba(0,229,255,0.30), 0 4px 24px rgba(0,0,0,0.35)',overflow:'hidden'}}>
              <div style={{padding:'10px 16px 9px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                  <span style={{fontSize:9,letterSpacing:'0.12em',color:'rgba(0,229,255,0.55)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700}}>EXPEDITION READINESS</span>
                  <span style={{fontSize:20,fontWeight:700,color:'#00E5FF',fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{readPct}%</span>
                </div>
                <div style={{width:'100%',height:6,background:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${readPct}%`,background:'linear-gradient(90deg,#00E5FF88,#00E5FF)',borderRadius:3,transition:'width 0.6s ease'}}/>
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{filledSegs} of {totalSegs} planning tasks complete</div>
              </div>
              <div style={{height:1,background:'rgba(0,229,255,0.12)'}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',overflow:'hidden'}}>
                {[{label:'DEPARTS IN',value:daysToDepart,sub:'DAYS',color:'#E8DCC8'},{label:'NIGHTS',value:totalNights,sub:'NIGHTS',color:'#E8DCC8'},{label:'BUDGET',value:fmt(totalBudget),sub:'TOTAL',color:'#FFD93D'}].map((s,i)=>(
                  <div key={s.label} style={{textAlign:'center',padding:'8px 4px'}}>
                    <div style={{fontSize:9,letterSpacing:'0.10em',color:'rgba(255,255,255,0.60)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:3}}>{s.label}</div>
                    <div style={{fontSize:19,fontWeight:700,color:s.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.65)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:2}}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })():(
          <div data-coach="trip-stats" style={{background:'rgba(0,10,25,0.30)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',border:'1.5px solid rgba(0,229,255,0.35)',borderTop:'2px solid rgba(0,229,255,0.75)',borderRadius:12,padding:'4px 0',overflow:'hidden'}}>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${heroStats.length},1fr)`,position:"relative"}}>
              {heroStats.map((s,i)=>(
                <div key={s.label} style={{textAlign:"center",padding:"4px 6px",borderLeft:i>0?"1px solid rgba(255,255,255,0.10)":"none"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(232,220,200,0.5)",letterSpacing:3,marginBottom:4,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>{s.label}</div>
                  <div className="stat-val" style={{fontSize:26,fontWeight:700,lineHeight:1,color:s.label==="BUDGET"?"#FFD93D":"#E8DCC8",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",animationDelay:`${i*0.1}s`}}>{s.value}</div>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(232,220,200,0.4)",letterSpacing:2,marginTop:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{s.unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}
      {!isFullscreen&&!isMobile&&<div style={{display:"flex",borderBottom:"1px solid rgba(0,229,255,0.1)",border:"1px solid rgba(255,255,255,0.10)",borderTop:"1px solid rgba(255,255,255,0.18)",background:"rgba(0,15,30,0.50)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",flexShrink:0,position:"relative",zIndex:1}}>
        <div style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,borderRight:"1px solid rgba(0,229,255,0.1)",borderBottom:"2px solid #00E5FF",background:"rgba(0,229,255,0.04)"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#00E5FF",boxShadow:"0 0 6px #00E5FF",animation:"consolePulse 2.5s ease-in-out infinite"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"#00E5FF",letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>TRIP CONSOLE</span>
        </div>
        <div data-coach="trip-pack-switch" onClick={onPackConsole} style={{flex:1,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",background:"transparent",opacity:0.55}} onMouseOver={e=>{e.currentTarget.style.background="rgba(196,87,30,0.08)";e.currentTarget.style.opacity="1";}} onMouseOut={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.opacity="0.55";}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"rgba(196,87,30,0.4)"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"rgba(255,159,67,0.65)",letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>PACK CONSOLE</span>
        </div>
      </div>}
      {/* Tab bar */}
      {!isMobile&&(
        <div style={{display:"flex",borderBottom:"1px solid rgba(232,220,200,0.06)",background:"rgba(0,15,35,0.95)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",alignItems:"stretch",position:"relative",zIndex:1}}>
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
            <span style={{fontSize:15,lineHeight:1}}>✏️</span><span style={{fontSize:15,letterSpacing:1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:"#00E5FF",whiteSpace:"nowrap",fontWeight:700}}>REVISE</span>
          </button>
          <button onClick={handleNewTripClick} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 14px",borderLeft:confirmNewTrip?"1px solid rgba(255,107,107,0.5)":"1px solid rgba(169,70,29,0.4)",background:confirmNewTrip?"rgba(255,107,107,0.15)":"rgba(169,70,29,0.08)",border:"none",cursor:"pointer",flexShrink:0,transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",minWidth:confirmNewTrip?72:50}} onMouseOver={e=>e.currentTarget.style.background=confirmNewTrip?"rgba(255,107,107,0.22)":"rgba(169,70,29,0.18)"} onMouseOut={e=>e.currentTarget.style.background=confirmNewTrip?"rgba(255,107,107,0.15)":"rgba(169,70,29,0.08)"}>
            <span style={{fontSize:15,color:confirmNewTrip?"#FF6B6B":"#FFD93D",lineHeight:1}}>{confirmNewTrip?"⚠️":"+"}</span>
            <span style={{fontSize:15,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",color:confirmNewTrip?"#FF6B6B":"#FFD93D",whiteSpace:"nowrap",fontWeight:700,textAlign:"center"}}>{confirmNewTrip?"CONFIRM?":"NEW TRIP"}</span>
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
              <span style={{fontSize:11,fontWeight:700,color:"#FFD93D",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flex:1}}>✦ EXPEDITION COMPLETE · TAP TO CELEBRATE</span>
              <span style={{fontSize:12,color:"rgba(255,217,61,0.5)"}}>→</span>
            </div>}
            {tripData.visionNarrative&&(()=>{const _vn=tripData.visionNarrative;const _lim=160;const _trunc=_vn.length>_lim?_vn.slice(0,_lim).slice(0,_vn.slice(0,_lim).lastIndexOf(' '))+'...':_vn;return(<div style={{marginBottom:8}}><div style={{fontSize:11,color:"rgba(232,220,200,0.50)",letterSpacing:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:6}}>✦ EXPEDITION VISION</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:15,fontWeight:300,fontStyle:"italic",color:"rgba(255,240,210,0.80)",lineHeight:1.75,borderLeft:"2px solid rgba(232,220,200,0.12)",paddingLeft:12,textAlign:"left"}}>"{_trunc}"</div></div>);})()}
            <div style={{fontSize:isMobile?12:14,color:"#E8DCC8",letterSpacing:isMobile?1.5:2.5,marginBottom:4,fontWeight:500,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",whiteSpace:isMobile?"normal":"nowrap"}}>YOUR EXPEDITION · {segPhases.length} PHASES</div>
            {isMobile&&<div style={{fontSize:15,color:"rgba(232,220,200,0.45)",letterSpacing:1.5,marginBottom:4,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>TAP PHASE TO EXPAND</div>}
            {segPhases.map((phase,i)=>i===0?<div key={phase.id} data-coach="trip-phases"><PhaseCard phase={phase} intelData={explorerData} idx={i} onTap={p=>setPhaseDetailView(p)} allSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading}/></div>:<PhaseCard key={phase.id} phase={phase} intelData={explorerData} idx={i} onTap={p=>setPhaseDetailView(p)} allSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading}/>)}
          </div>
        )}
        {tab==="budget"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[{label:"EXPEDITION TOTAL",value:fmt(totalBudget),color:"#FFD93D",sub:`across ${flatPhases.length} phases`},{label:"AVG / NIGHT",value:fmt(totalBudget/Math.max(totalNights,1)),color:"#A29BFE",sub:`${totalNights} nights`},{label:"AVG / PHASE",value:fmt(totalBudget/Math.max(flatPhases.length,1)),color:"#00E5FF",sub:"per destination"}].map((s,si)=>(
                <div key={s.label} style={{background:"linear-gradient(135deg,rgba(0,8,20,0.8),rgba(0,20,40,0.6))",border:"1px solid rgba(0,229,255,0.12)",borderRadius:10,padding:isMobile?"8px 10px":"12px 14px",textAlign:"center",gridColumn:isMobile&&si===2?"1 / -1":"auto"}}>
                  <div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.6)",letterSpacing:isMobile?0:1,marginBottom:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600}}>{s.label}</div>
                  <div style={{fontSize:isMobile?16:22,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.45)",marginTop:2}}>{s.sub}</div>
                </div>
              ))}
            </div>
            {(()=>{const bd=tripData.budgetBreakdown;if(!bd)return null;const cats=[{key:"flights",icon:"✈️",label:"FLIGHTS",color:"#00E5FF",note:bd.flightsNote},{key:"accommodation",icon:"🏨",label:"ACCOMMODATION",color:"#A29BFE",note:bd.accommodationNote},{key:"food",icon:"🍽️",label:"FOOD & DRINK",color:"#FFD93D",note:bd.foodNote},{key:"transport",icon:"🚌",label:"TRANSPORT",color:"#69F0AE",note:null},{key:"activities",icon:"🎯",label:"ACTIVITIES",color:"#FF9F43",note:null},{key:"buffer",icon:"🛡️",label:"BUFFER",color:"rgba(255,255,255,0.5)",note:null}];const maxCat=Math.max(...cats.map(c=>bd[c.key]||0),1);return(
              <div style={{marginBottom:16,background:"linear-gradient(135deg,rgba(0,8,20,0.7),rgba(0,20,40,0.4))",border:"1px solid rgba(255,217,61,0.12)",borderRadius:10,padding:isMobile?"10px 12px":"14px 16px"}}>
                <div style={{fontSize:11,color:"rgba(255,217,61,0.7)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:10}}>BUDGET BREAKDOWN</div>
                {cats.map(c=>{const val=bd[c.key]||0;const pct=(val/maxCat)*100;return(
                  <div key={c.key} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13}}>{c.icon}</span><span style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.7)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:600,letterSpacing:1}}>{c.label}</span></div>
                      <span style={{fontSize:isMobile?13:15,fontWeight:900,color:c.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{fmt(val)}</span>
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
                    <span style={{fontSize:15,fontWeight:900,color:phase.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>{fmt(budget)}</span>
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
                <span style={{fontSize:11,fontWeight:700,color:"#FF6B6B",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>NEEDS ATTENTION · {changedSegs.length} SEGMENT{changedSegs.length>1?"S":""} WITH CHANGES</span>
              </div>
              {changedSegs.map(({phase,seg})=>(
                <div key={`${phase.id}-${seg.id}`} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:"1px solid rgba(255,107,107,0.1)"}}>
                  <span style={{fontSize:12,flex:1,color:"rgba(255,255,255,0.75)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>→ {phase.name} / {seg.name}</span>
                  <button onClick={()=>{const all=loadSeg();const k=`${phase.id}-${seg.id}`;if(all[k]){all[k]={...all[k],status:'booked'};saveSeg(all);setTab("next");}}} style={{fontSize:10,padding:"3px 10px",borderRadius:6,border:"1px solid rgba(255,107,107,0.4)",background:"rgba(255,107,107,0.1)",color:"#FF6B6B",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,minHeight:30,flexShrink:0}}>RESOLVE</button>
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
                        <span style={{fontSize:15}}>{link.icon}</span><span style={{fontSize:isMobile?13:15,color:link.color,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{link.label}</span><span style={{fontSize:15,color:"rgba(255,255,255,0.25)"}}>↗</span>
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
                <span style={{fontSize:11,fontWeight:700,color:"#888",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>CANCELLED · {cancelledSegs.length} ITEM{cancelledSegs.length>1?"S":""}</span>
              </div>
              {cancelledSegs.map(({phase,seg})=>(
                <div key={`${phase.id}-${seg.id}`} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:"1px solid rgba(136,136,136,0.1)"}}>
                  <span style={{fontSize:12,flex:1,color:"rgba(136,136,136,0.7)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",textDecoration:"line-through",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{phase.name} / {seg.name}</span>
                  <button onClick={()=>{const all=loadSeg();const k=`${phase.id}-${seg.id}`;if(all[k]){all[k]={...all[k],status:'planning'};saveSeg(all);setTab("next");}}} style={{fontSize:10,padding:"3px 10px",borderRadius:6,border:"1px solid rgba(0,229,255,0.3)",background:"rgba(0,229,255,0.06)",color:"#00E5FF",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1,minHeight:30,flexShrink:0}}>+ REBOOK</button>
                </div>
              ))}
            </div>}
            {/* RETURN JOURNEY */}
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(255,217,61,0.12)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(255,217,61,0.2))"}}/>
                <span style={{fontSize:15,color:"rgba(255,242,210,0.78)",letterSpacing:3,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,whiteSpace:"nowrap"}}>✦ RETURN JOURNEY</span>
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
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.50)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>Return flight status</span>
                  <button onClick={()=>uR("status",STATUS_NEXT[returnData.flight.status]||"planning")} style={{background:`${STATUS_CFG[returnData.flight.status]?.color||"#FF9F43"}18`,border:`1px solid ${STATUS_CFG[returnData.flight.status]?.color||"#FF9F43"}55`,borderRadius:6,padding:"4px 12px",fontSize:9,fontWeight:700,letterSpacing:2,color:STATUS_CFG[returnData.flight.status]?.color||"#FF9F43",cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",minHeight:30}}>
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
                  if(d.error)return(<div style={{textAlign:"center",padding:"30px 20px"}}><div style={{fontSize:32,marginBottom:16}}>📡</div><div style={{fontSize:15,color:"#FF6B6B",marginBottom:8,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>Intel unavailable</div><div style={{fontSize:15,color:"rgba(255,255,255,0.4)",marginBottom:20,lineHeight:1.6}}>{d.errorMsg}</div><button style={{background:"rgba(255,107,107,0.15)",border:"1px solid #FF6B6B44",borderRadius:8,color:"#FF6B6B",fontSize:15,padding:"10px 20px",cursor:"pointer",fontFamily:"monospace",minHeight:44}} onClick={()=>{setExplorerData(p=>({...p,[explorerDest.destination]:undefined}));openIntel(explorerDest.destination,explorerDest.phaseName,explorerDest.type);}}>↺ RETRY</button></div>);
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
                {(tripData.visionNarrative||tripData.vision)&&<div style={{borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:12,marginBottom:18}}><div style={{fontSize:14,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:4}}>✦ ORIGINAL VISION</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:16,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.7}}>"{tripData.visionNarrative||tripData.vision}"</div></div>}
                {(()=>{const bd=tripData.budgetBreakdown;if(!bd)return <div style={{padding:"12px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:11,marginBottom:16}}><div style={{fontSize:14,color:"rgba(255,159,67,0.65)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:6}}>✦ BUDGET OVERVIEW</div><div style={{fontSize:14,fontWeight:700,color:"#FFD93D",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>Total: {fmt(tripData.totalBudget||0)}</div><div style={{fontSize:14,color:"rgba(255,255,255,0.50)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginTop:4}}>{tripData.phases?.length||0} phases · {segPhases.reduce((s,p)=>s+p.totalNights,0)} nights</div></div>;const cats=[{key:"flights",icon:"✈️",label:"Flights",note:bd.flightsNote},{key:"accommodation",icon:"🏨",label:"Accommodation",note:bd.accommodationNote},{key:"food",icon:"🍜",label:"Food",note:bd.foodNote},{key:"transport",icon:"🚌",label:"Transport",note:null},{key:"activities",icon:"🎯",label:"Activities",note:null},{key:"buffer",icon:"🎒",label:"Buffer",note:null}].filter(c=>bd[c.key]>0);const total=cats.reduce((s,c)=>s+(bd[c.key]||0),0);return(
                  <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.08),rgba(0,8,20,0.6))",border:"1px solid rgba(169,70,29,0.3)",borderRadius:11,padding:"12px 14px",marginBottom:16}}>
                    <div style={{fontSize:14,color:"rgba(255,159,67,0.85)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:10}}>✦ BUDGET BLUEPRINT</div>
                    {cats.map(c=>{const val=bd[c.key]||0;return(
                      <div key={c.key} style={{display:"flex",alignItems:"center",padding:"7px 0",gap:8}}>
                        <span style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}>{c.icon}</span>
                        <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.75)",fontWeight:600,width:isMobile?90:110,flexShrink:0}}>{c.label}</span>
                        <span style={{flex:1,fontSize:isMobile?11:13,fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"rgba(255,255,255,0.45)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.note||""}</span>
                        <span style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FFD93D",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>~{fmt(val)}</span>
                      </div>
                    );})}
                    <div style={{height:1,background:"rgba(255,255,255,0.12)",margin:"8px 0"}}/>
                    <div style={{display:"flex",alignItems:"center",padding:"4px 0",gap:8}}>
                      <span style={{fontSize:14,width:22,flexShrink:0}}> </span>
                      <span style={{fontSize:isMobile?12:14,color:"rgba(255,255,255,0.9)",fontWeight:700,width:isMobile?90:110,flexShrink:0}}>TOTAL</span>
                      <span style={{flex:1}}/>
                      <span style={{fontSize:isMobile?14:16,fontWeight:900,color:"#FFD93D",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",flexShrink:0,marginLeft:8}}>~{fmt(total)}</span>
                    </div>
                    {bd.routingNote&&<div style={{marginTop:10,borderLeft:"2px solid rgba(255,159,67,0.4)",paddingLeft:10}}><div style={{fontSize:14,color:"rgba(255,159,67,0.6)",letterSpacing:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",marginBottom:3}}>✦ WHY THIS ROUTE</div><div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?14:15,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>{bd.routingNote}</div></div>}
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
      {(()=>{try{return localStorage.getItem("1bn_hide_all_tips")!=="1";}catch(e){return true;}})()&&<div style={{padding:"12px 16px",textAlign:"center"}}><button onClick={()=>{try{localStorage.setItem("1bn_hide_all_tips","1");}catch(e){}setShowCoach(false);setShowOnboard(false);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.50)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,padding:"6px 12px"}} onMouseOver={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"} onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,0.50)"}>Hide all tips</button></div>}
      {isMobile&&!isFullscreen&&!phaseDetailView&&<div style={{height:"calc(64px + env(safe-area-inset-bottom))"}}/>}
      {isMobile&&!isFullscreen&&<div style={{opacity:phaseDetailView?0:1,pointerEvents:phaseDetailView?"none":"auto",transition:"opacity 0.35s cubic-bezier(0.25,0.46,0.45,0.94)"}}><BottomNav activeTab={tab} onTab={t=>{if(t==="pack")onPackConsole();else{setTab(t);if(t!=="intel")setExplorerDest(null);}}}/></div>}
    </div>
  );
}

// CircularRing, getPackBrief, PackConsole — imported from components/PackConsole.jsx

// ─── AmbientChat (Floating CA) ───────────────────────────────────
function AmbientChat({screen:scr,tripData,currentPhase,currentSegment,currentTab}) {
  const isMobile=useMobile();
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef();
  useEffect(()=>{if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  const phases=tripData?.phases||[];
  const ctx=scr==="trip-console"?`You are the Co-Architect for "${tripData?.tripName||"this expedition"}". Full expedition: ${phases.length} phases, ${tripData?.totalNights||0} nights total. Departure: ${tripData?.startDate||tripData?.departureDate||"TBD"}. Phases: ${phases.map(p=>`${p.name} (${p.arrival||""} to ${p.departure||""}, ${p.nights}n, $${p.budget||p.cost||0})`).join("; ")}. Help refine, expand, or think through their expedition. Be concise and warm.`
    :scr==="phase-detail"?`You are the Co-Architect. User is planning: Phase: ${currentPhase?.name||"unknown"}. Country: ${currentPhase?.country||""}. Dates: ${currentPhase?.arrival||""} to ${currentPhase?.departure||""}. Nights: ${currentPhase?.totalNights||currentPhase?.nights||0}. Budget: $${currentPhase?.budget||currentPhase?.totalBudget||0}. Help plan transport, stays, activities, and local tips for this specific phase. Be concise.`
    :scr==="segment-workspace"?`You are the Co-Architect. User is planning: Segment: ${currentSegment?.name||"unknown"}. Dates: ${currentSegment?.arrival||""} to ${currentSegment?.departure||""}. Nights: ${currentSegment?.nights||0}. Current tab: ${currentTab||"overview"}. Help fill in details for this specific segment. Be concise.`
    :scr==="pack-console"?`You are the Co-Architect and packing strategist. User is packing for ${tripData?.tripName||"their expedition"} — ${tripData?.totalNights||0} nights across ${[...new Set(phases.map(p=>p.country))].length} countries. Help them pack light and smart. Be concise.`
    :`You are the Co-Architect travel assistant for 1 Bag Nomad. Help the user with their expedition planning. Be concise and warm.`;
  const openLine=scr==="trip-console"?"Your expedition is taking shape. What would you like to refine?"
    :scr==="phase-detail"?`${currentPhase?.name||"This phase"} — what would you like to know?`
    :scr==="segment-workspace"?`Planning ${currentSegment?.name||"this segment"}. How can I help?`
    :scr==="pack-console"?"Let's make sure you're packing light. What do you need?"
    :"Your Co-Architect is here. What's on your mind?";
  const subtitle=scr==="phase-detail"?currentPhase?.name?.toUpperCase():scr==="segment-workspace"?currentSegment?.name?.toUpperCase():scr==="pack-console"?"PACK CONSOLE":tripData?.tripName?.toUpperCase()||"";
  const send=async()=>{if(!input.trim()||loading)return;const userMsg=input;setInput("");const newMsgs=[...msgs,{role:"user",text:userMsg}];setMsgs(newMsgs);setLoading(true);try{const history=newMsgs.map(m=>`${m.role==="user"?"User":"Co-Architect"}: ${m.text}`).join("\n");const response=await askAI(`${ctx}\n\nConversation:\n${history}\n\nCo-Architect:`,800);setMsgs([...newMsgs,{role:"ai",text:response}]);}catch(e){setMsgs([...newMsgs,{role:"ai",text:"I'm having trouble connecting. Try again in a moment."}]);}setLoading(false);};
  if(scr==="dream")return null;
  return(<>
    {!open&&<div style={{position:"fixed",bottom:isMobile?62:24,right:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4,zIndex:1000}}>
      <button onClick={()=>setOpen(true)} style={{width:isMobile?48:64,height:isMobile?48:64,borderRadius:"50%",background:"rgba(169,70,29,0.9)",border:"1px solid rgba(255,217,61,0.4)",boxShadow:"0 0 20px rgba(255,217,61,0.3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",animation:"caFabPulse 3s ease-in-out infinite",padding:0,opacity:0.85}}>
        <img src="/1bn-logo.png" width={isMobile?32:44} height={isMobile?32:44} alt="CA" style={{borderRadius:"50%"}}/>
      </button>
      {!isMobile&&<span style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:9,letterSpacing:2,color:"rgba(255,159,67,0.7)",textTransform:"uppercase",whiteSpace:"nowrap"}}>CO-ARCHITECT</span>}
    </div>}
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000}}/>
      <div style={{position:"fixed",bottom:0,left:0,right:0,height:"65vh",background:"#3C2418",borderTop:"1px solid rgba(255,217,61,0.3)",borderRadius:"20px 20px 0 0",zIndex:1001,display:"flex",flexDirection:"column",animation:"drawerSlideUp 400ms cubic-bezier(0.25,0.46,0.45,0.94)"}}>
        <div style={{padding:"16px 20px 12px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
          <div><div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,159,67,0.85)",letterSpacing:3}}>✦ CO-ARCHITECT</div>{subtitle&&<div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1,marginTop:3}}>{subtitle}</div>}</div>
          <button onClick={()=>setOpen(false)} style={{color:"rgba(255,255,255,0.4)",background:"none",border:"none",fontSize:20,cursor:"pointer",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12,minHeight:0,background:"rgba(255,255,255,0.06)"}}>
          {msgs.length===0&&<div style={{position:"relative",flex:1,display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}>
            <img src="/1bn-logo.png" style={{position:"absolute",width:"60%",maxWidth:200,opacity:0.06,pointerEvents:"none"}} alt=""/>
            <div style={{position:"relative",zIndex:1,textAlign:"center",padding:"0 24px",fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"rgba(255,255,255,0.4)",fontSize:15,lineHeight:1.6}}>{openLine}</div>
          </div>}
          {msgs.map((m,i)=><div key={i} style={{display:"flex",gap:8,flexDirection:m.role==="user"?"row-reverse":"row",animation:"msgIn 0.25s ease"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:m.role==="ai"?"#A9461D":"#1a2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{m.role==="ai"?"✦":"·"}</div>
            <div style={{borderRadius:12,padding:m.role==="ai"?"14px 16px":"10px 14px",fontSize:m.role==="ai"?14:13,fontFamily:m.role==="ai"?"'Fraunces',serif":"'Inter',system-ui,-apple-system,sans-serif",fontStyle:m.role==="ai"?"italic":"normal",color:"#FFF",lineHeight:1.7,maxWidth:"85%",background:m.role==="ai"?"rgba(255,159,67,0.06)":"rgba(255,255,255,0.06)",border:m.role==="ai"?"1px solid rgba(255,159,67,0.25)":"1px solid rgba(255,255,255,0.08)"}}>{m.text}</div>
          </div>)}
          {loading&&<div style={{display:"flex",gap:6,animation:"msgIn 0.25s ease"}}><div style={{width:22,height:22,borderRadius:"50%",background:"#A9461D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div><div style={{fontSize:13,color:"rgba(169,70,29,0.7)",animation:"shimmer 1s infinite",padding:"4px 0"}}>thinking...</div></div>}
          <div ref={endRef}/>
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",gap:8,flexShrink:0,paddingBottom:`calc(12px + env(safe-area-inset-bottom))`}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send();}} placeholder="Ask your Co-Architect..." style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,159,67,0.3)",borderRadius:10,padding:"10px 14px",color:"white",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/>
          <button onClick={send} disabled={loading} style={{background:"rgba(255,159,67,0.2)",border:"1px solid rgba(255,159,67,0.4)",borderRadius:10,padding:"10px 16px",color:"rgba(255,159,67,0.9)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:12,fontWeight:700,letterSpacing:1,cursor:loading?"wait":"pointer",minWidth:44,minHeight:44}}>↑</button>
        </div>
      </div>
    </>}
  </>);
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

  // Load or generate segment suggestions when tripData changes
  useEffect(()=>{
    if(!tripData?.tripName||!tripData?.phases?.length)return;
    // Check for existing suggestions
    try{
      const saved=localStorage.getItem(SUGGEST_KEY);
      if(saved){
        const parsed=JSON.parse(saved);
        if(parsed.tripId&&parsed.tripId!=="undefined"&&parsed.tripId===tripData.tripName&&parsed.suggestions?.length){
          console.log('[1BN] Loaded existing suggestions for:',tripData.tripName);
          setSegmentSuggestions(parsed.suggestions);
          return;
        }
        // Clear stale/mismatched entries
        localStorage.removeItem(SUGGEST_KEY);
      }
    }catch(e){localStorage.removeItem(SUGGEST_KEY);}
    // Generate fresh suggestions
    console.log('[1BN] Triggering suggestion generation for:',tripData.tripName,'phases:',tripData.phases.length);
    generateSegmentSuggestions(tripData);
  },[tripData?.tripName]);

  async function fetchSuggestionsChunk(td, phasesSlice, startIndex){
    try{
      const prompt=buildSegmentSuggestionsPrompt(td,td.travelerProfile,phasesSlice,startIndex);
      const raw=await askAI(prompt,4000);
      if(!raw||raw.length<10){console.warn(`[1BN] Chunk ${startIndex}: empty or tiny response`);return {};}
      const m=raw.match(/\{[\s\S]*\}/);
      if(!m){console.warn(`[1BN] Chunk ${startIndex}: no JSON found`);return {};}
      const parsed=JSON.parse(m[0]);
      const phases=parsed.phases||[];
      const result={};
      phases.forEach((phase,localIdx)=>{result[startIndex+localIdx]=phase;});
      return result;
    }catch(err){
      console.warn(`[1BN] Suggestions chunk failed for phases starting at ${startIndex}:`,err);
      return {};
    }
  }

  async function generateSegmentSuggestions(td){
    if(!td||!td.phases?.length){console.warn('[1BN] Suggestions skipped — no phases');return;}
    const tripId=String(td.tripName||td.vision||"expedition").slice(0,60);
    const phases=td.phases||[];
    const count=phases.length;
    console.log('[1BN] === GENERATING SUGGESTIONS ===');
    console.log('[1BN] tripId:',tripId,'phases:',count);
    console.log(`[1BN] Suggestions strategy: ${count<=5?'single':'parallel'} | phases covered: ${count}`);
    setSuggestionsLoading(true);
    try{
      let merged={};
      if(count<=5){
        merged=await fetchSuggestionsChunk(td,phases.slice(0,5),0);
      }else{
        const [chunkA,chunkB]=await Promise.all([
          fetchSuggestionsChunk(td,phases.slice(0,5),0),
          fetchSuggestionsChunk(td,phases.slice(5),5)
        ]);
        merged={...chunkA,...chunkB};
      }
      const allSuggestions=Object.keys(merged).sort((a,b)=>a-b).map(k=>merged[k]);
      if(allSuggestions.length){
        localStorage.setItem(SUGGEST_KEY,JSON.stringify({tripId,generated:Date.now(),suggestions:allSuggestions}));
        setSegmentSuggestions(allSuggestions);
        console.log('[1BN] Suggestions saved with tripId:',tripId,'phases:',allSuggestions.length);
      }else{
        console.warn('[1BN] No suggestion phases returned from any chunk');
      }
    }catch(e){
      console.error('[1BN] Suggestions fetch failed:',e);
    }finally{
      setSuggestionsLoading(false);
    }
  }

  function handleLoadDemo(){try{const preserve=["1bn_coach_v1","1bn_onboard_v1","1bn_pack_explainer_v1","1bn_phase_hint_shown","1bn_hide_all_tips"];const saved={};preserve.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)saved[k]=v;});localStorage.clear();Object.entries(saved).forEach(([k,v])=>localStorage.setItem(k,v));}catch(e){}setTripData(MICHAEL_EXPEDITION);setScreen("console");}
  function handleGoGen(data,vd){setAppData({...data,visionData:vd});setScreen("gen");}
  function handleGenComplete(){setScreen("coarchitect");}
  function handleLaunch(hd){posthog.capture("trip_console_launched",{total_budget:hd?.totalBudget,nights:hd?.totalNights,phases:hd?.phases?.length});try{localStorage.removeItem("1bn_pack_v5");localStorage.removeItem("1bn_pack_cats_v1");localStorage.removeItem(SUGGEST_KEY);}catch(e){}console.log('[1BN] handleLaunch tripName:',hd?.tripName,'phases:',hd?.phases?.length);setTripData(hd);setScreen("handoff");}
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
      <AmbientChat screen={screen==="console"?"trip-console":screen==="pack"?"pack-console":screen} tripData={tripData}/>
    </>
  );
}
