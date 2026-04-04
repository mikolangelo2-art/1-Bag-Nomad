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
import { STATUS_CFG, STATUS_NEXT, SUGGEST_KEY, DISMISS_KEY, ACTIVITY_ICONS, SEG_TYPE_TO_ACT, suggestionCardStyle, suggestionHeaderStyle, disclaimerStyle, acceptBtnStyle, dismissBtnStyle, loadDismissed, saveDismissed, findSuggestionForSegment, loadSuggestionsFromStorage, detectMode, buildSegmentSuggestionsPrompt, getPhaseActivityIcon } from './utils/tripConsoleHelpers';
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
import CoArchitect from './components/CoArchitect';
import AntiqueGlobe from './components/AntiqueGlobe';
import DateInput from './components/DateInput';
import SDF from './components/SDF';
import ProgDots from './components/ProgDots';
import AmbientChat from './components/AmbientChat';
import SegmentDetails from './components/SegmentDetails';
import SegmentRow from './components/SegmentRow';
import SegmentWorkspace from './components/SegmentWorkspace';
import PhaseDetailPage from './components/PhaseDetailPage';

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
// STATUS_CFG, STATUS_NEXT — imported from utils/tripConsoleHelpers.js
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

// Segment suggestions, detectMode, styles, buildSegmentSuggestionsPrompt — imported from utils/tripConsoleHelpers.js

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


// ─── BottomSheet ──────────────────────────────────────────────────
// BottomSheet — imported from components/BottomSheet.jsx

// GenerationScreen — imported from components/GenerationScreen.jsx

// DreamHeader — imported from components/DreamHeader.jsx
// DreamScreen — imported from components/DreamScreen.jsx

// VisionReveal — imported from components/VisionReveal.jsx

// CoArchitect — imported from components/CoArchitect.jsx

// HandoffScreen — imported from components/HandoffScreen.jsx

// HomecomingScreen — imported from components/HomecomingScreen.jsx

// ─── CoachOverlay ─────────────────────────────────────────────────
// CoachOverlay — imported from components/CoachOverlay.jsx
// OnboardCard — imported from components/OnboardCard.jsx

// SegmentDetails — imported from components/SegmentDetails.jsx

// SegmentRow — imported from components/SegmentRow.jsx

// ─── PhaseCard ────────────────────────────────────────────────────
// ACTIVITY_ICONS, SEG_TYPE_TO_ACT, getPhaseActivityIcon — imported from utils/tripConsoleHelpers.js

// ─── PhaseDetailPage ──────────────────────────────────────────────
// SegmentWorkspace — imported from components/SegmentWorkspace.jsx

// PhaseDetailPage — imported from components/PhaseDetailPage.jsx

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

// AmbientChat — imported from components/AmbientChat.jsx

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
