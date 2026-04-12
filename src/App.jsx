import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import WorldMapBackground from './components/WorldMapBackground';
import posthog from "posthog-js";
import { DIVE_CYAN, SURF_GREEN, CULTURE_GOLD, EXPLORATION_ORANGE, NATURE_PURPLE, MOTO_RED, TREK_TEAL, LIGHT_BLUE, TECH_BLUE, PARCHMENT, LIGHT_GRAY, WHITE, BG_PAGE, BG_DARK, BG_DARK_TRIP, BG_PAGE_LEGACY, BLACK_OVERLAY, BG_TRIP_GRADIENT, BG_PACK_GRADIENT, PARCHMENT_08, PARCHMENT_06, PARCHMENT_55, PARCHMENT_20, BURNT_ORANGE_35, BURNT_ORANGE_50, DARK_BURNT_52, CYAN_10, CYAN_25, CYAN_30, CYAN_35, CYAN_40, CYAN_60, CYAN_90, ORANGE_15, ORANGE_25, ORANGE_40, ORANGE_65, ORANGE_90, GOLD_04, GOLD_20, GOLD_35, GOLD_50, GOLD_60, GOLD_65, RED_04, RED_10, RED_40, WHITE_04, WHITE_08, WHITE_15, WHITE_22, WHITE_50, WHITE_60, GREEN_WASH, PURPLE_WASH, CYAN_WASH, ORANGE_WASH, TRIP_CATEGORY_COLORS, CAT_DOT_COLORS, PILL_COLORS, PALETTE_8, BAG_COLORS, NOTEBOOK_CAT_COLORS, PACK_CAT_COLORS, EXPENSE_CAT_COLORS, urgencyColor } from './constants/colors';
import { getDefaultPack, fixPackItemVolume, mapPackItemsWithVolumes } from './utils/packHelpers';
import { fmt, daysBetween, fD, fDS } from './utils/dateHelpers';
import { estCost } from './utils/priceHelpers';
import { TI, SEG_KEY, loadSeg, saveSeg, RETURN_KEY, BLANK_RETURN, loadReturn, saveReturn } from './utils/storageHelpers';
import { askAI, parseJSON } from './utils/aiHelpers';
import { GOAL_PRESETS, QUICK_ACTIONS } from './constants/dreamData';
import { COUNTRY_FLAGS, toSegPhases } from './utils/tripHelpers';
import { STATUS_CFG, STATUS_NEXT, SUGGEST_KEY, DISMISS_KEY, ACTIVITY_ICONS, SEG_TYPE_TO_ACT, suggestionCardStyle, suggestionHeaderStyle, disclaimerStyle, acceptBtnStyle, dismissBtnStyle, loadDismissed, saveDismissed, findSuggestionForSegment, loadSuggestionsFromStorage, detectMode, buildSegmentSuggestionsPrompt, getPhaseActivityIcon, getSuggestionsTripId } from './utils/tripConsoleHelpers';
import { useMobile } from './hooks/useMobile';
import SharegoodLogo from './components/SharegoodLogo';
import BottomSheet from './components/BottomSheet';
import ConsoleHeader from './components/ConsoleHeader';
import BottomNav from './components/BottomNav';
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
import SDF from './components/SDF';
import ProgDots from './components/ProgDots';
import AmbientChat from './components/AmbientChat';
import SegmentDetails from './components/SegmentDetails';
import SegmentRow from './components/SegmentRow';
import SegmentWorkspace from './components/SegmentWorkspace';
import PhaseDetailPage from './components/PhaseDetailPage';
import PhaseCard from './components/PhaseCard';
import MissionConsole from './components/MissionConsole';

// PostHog: initialized in src/posthogInit.js (imported from main.jsx)
// ╔══════════════════════════════════════════════════════════════╗
// ║  1 BAG NOMAD — v5_r4                                        ║
// ║  Merged: v5 + TripConsoleSandbox · March 23 2026            ║
// ║  · Each phase auto-wraps as 1 segment on handoff            ║
// ║  · Both intel previews kept (inline + full INTEL tab)       ║
// ║  · Storage: 1bn_seg_v2 only — legacy bookings purged        ║
// ╚══════════════════════════════════════════════════════════════╝

// ─── Founder expedition (protected lane; QA / new trip never clears this key) ───
const FOUNDER_KEY = "1bn_founder_expedition";

function loadFounderExpedition() {
  try {
    const s = localStorage.getItem(FOUNDER_KEY);
    if (!s) return null;
    const p = JSON.parse(s);
    return p?.phases?.length ? p : null;
  } catch (e) {
    return null;
  }
}

function saveFounderExpedition(data) {
  try {
    if (data) localStorage.setItem(FOUNDER_KEY, JSON.stringify(data));
    else localStorage.removeItem(FOUNDER_KEY);
  } catch (e) {}
}

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
const CSS=`*{box-sizing:border-box;margin:0;padding:0}
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
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes launchPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,159,67,0.5)}50%{box-shadow:0 0 0 14px rgba(255,159,67,0)}}
@keyframes consolePulse{0%,100%{box-shadow:0 0 0 0 rgba(0,229,255,0.4)}50%{box-shadow:0 0 0 14px rgba(0,229,255,0)}}
@keyframes phaseIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes amberPulse{0%,100%{opacity:0.2;transform:scale(1)}50%{opacity:0.8;transform:scale(1.12)}}
@keyframes shimmer{0%,100%{opacity:0.5}50%{opacity:1}}
@keyframes shimmerBar{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes visionGlow{0%,100%{box-shadow:0 0 0 1px rgba(201,160,76,0.38),0 0 22px rgba(201,160,76,0.1),inset 0 0 18px rgba(0,0,0,0.2)}50%{box-shadow:0 0 0 1px rgba(201,160,76,0.55),0 0 32px rgba(201,160,76,0.16),inset 0 0 22px rgba(0,0,0,0.24)}}
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
@keyframes caFabPulse{0%,100%{box-shadow:0 0 12px rgba(201,160,76,0.25)}50%{box-shadow:0 0 24px rgba(201,160,76,0.45)}}
@keyframes welcomeLogoGlow{0%,100%{box-shadow:0 0 0 2px rgba(201,160,76,0.4),0 0 32px rgba(201,160,76,0.3),0 0 64px rgba(169,70,29,0.14),inset 0 0 22px rgba(255,255,255,0.05);filter:drop-shadow(0 0 20px rgba(201,160,76,0.38))}50%{box-shadow:0 0 0 2px rgba(201,160,76,0.55),0 0 46px rgba(201,160,76,0.42),0 0 84px rgba(169,70,29,0.2),inset 0 0 28px rgba(255,255,255,0.08);filter:drop-shadow(0 0 30px rgba(255,200,100,0.48))}}
@keyframes welcomeCtaGlow{0%,100%{box-shadow:0 0 28px rgba(169,70,29,0.42),0 0 56px rgba(201,160,76,0.2),0 0 0 1px rgba(255,200,120,0.45),inset 0 1px 0 rgba(255,255,255,0.15)}50%{box-shadow:0 0 40px rgba(201,160,76,0.48),0 0 78px rgba(255,159,67,0.24),0 0 0 1px rgba(201,160,76,0.55),inset 0 1px 0 rgba(255,255,255,0.2)}}
.welcome-beta-logo{width:118px;height:118px;border-radius:50%;object-fit:contain;box-sizing:border-box;border:2px solid rgba(201,160,76,0.48);margin-bottom:8px;animation:welcomeLogoGlow 3s ease-in-out infinite}
.welcome-beta-wordmark{margin:0 0 6px;font-family:'Playfair Display',Georgia,serif;font-size:clamp(17px,3.4vw,22px);font-weight:500;letter-spacing:0.14em;color:rgba(201,160,76,0.9);text-rendering:optimizeLegibility;font-variant-numeric:lining-nums}
.welcome-beta-wordmark-one{font-size:1.22em;font-weight:600;letter-spacing:0.14em;display:inline-block;vertical-align:-0.02em}
@media (min-width:769px){.welcome-beta-logo{width:136px;height:136px;margin-bottom:10px}}
.welcome-beta-cta{transition:transform 0.2s ease,filter 0.2s ease!important;animation:welcomeCtaGlow 2.8s ease-in-out infinite}
.welcome-beta-cta:hover{transform:scale(1.03);filter:brightness(1.05)}
@media (prefers-reduced-motion:reduce){.welcome-beta-logo,.welcome-beta-cta{animation:none!important}.welcome-beta-logo{box-shadow:0 0 0 2px rgba(201,160,76,0.4),0 0 36px rgba(201,160,76,0.32);filter:drop-shadow(0 0 20px rgba(201,160,76,0.38))}.welcome-beta-cta{box-shadow:0 0 28px rgba(169,70,29,0.42),0 0 56px rgba(201,160,76,0.2),0 0 0 1px rgba(255,200,120,0.45),inset 0 1px 0 rgba(255,255,255,0.15)!important}}
@media(max-width:768px){.sg-suggestion-card{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important;padding:16px!important;box-sizing:border-box!important}}

  .dream-root,.mc-root,.build-root{font-size:18px}
  .dream-content{max-width:780px;padding:40px 0 70px}@keyframes shimmerOnce{0%{background-position:-200% center}65%{background-position:200% center}100%{background-position:200% center}}.dream-big-shimmer{background:linear-gradient(90deg,#c9a04c 25%,#fff 45%,#FF9F43 55%,#c9a04c 75%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmerOnce 2s ease forwards}.dream-divider{width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,159,67,0.22),rgba(0,229,255,0.12),rgba(162,155,254,0.1),transparent);margin:4px 0 16px 0;border:none}.dream-accent-green{color:rgba(105,240,174,0.45)}
  .mc-content{padding:22px 36px}
  .g-label{font-size:16px}
  .g-desc{font-size:11px}
  .g-icon{font-size:28px}
  .sec-label{font-size:12px;letter-spacing:5px;color:rgba(255,159,67,0.6)}
  .f-label{font-size:11px;letter-spacing:3px;color:rgba(0,229,255,0.5)}
  .f-input{font-size:15px;padding:12px 16px}
  .vision-ta{font-size:15px;padding:16px 20px;transition:box-shadow 0.35s cubic-bezier(0.25,0.46,0.45,0.94),border-color 0.35s cubic-bezier(0.25,0.46,0.45,0.94)}.vision-ta:focus{outline:none}
  .launch-btn{font-size:15px;padding:20px;transition:box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94),transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)}.launch-btn:hover{box-shadow:0 0 28px rgba(255,159,67,0.35);transform:translateY(-1px)}
  .vibe-tag{font-size:11px;padding:6px 16px;transition:transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94),border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),background 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)}.vibe-tag:hover{transform:scale(1.04);box-shadow:0 0 10px rgba(169,70,29,0.35)}
  .mc-tab{font-size:11px;padding:12px 16px}
  .chat-bubble{font-size:12px}
  .intel-section-label{font-size:12px}

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
.chat-bubble{font-size:12px}

.dream-root,.mc-root,.build-root{max-width:min(100%,1320px)!important;margin:0 auto!important}
@media(max-width:599px){.dream-root,.mc-root,.build-root{max-width:100%!important;margin:0!important;padding:0!important;width:100%!important}.dream-content{max-width:100%!important;margin:0!important;padding:14px 12px 80px!important;width:100%!important;box-sizing:border-box!important}}
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
.chat-bubble{font-size:12px!important}
@media(min-width:900px){html,body{font-size:18px}.dream-content{max-width:860px;margin:0 auto;padding:40px 40px 70px}.mc-content{max-width:1100px;margin:0 auto;padding:24px 48px}.overlay-pad{padding-left:48px;padding-right:48px}.g-label{font-size:18px}.g-desc{font-size:12px}.sec-label{font-size:13px;letter-spacing:5px}.f-label{font-size:12px}.f-input{font-size:16px;padding:13px 18px}.vision-ta{font-size:17px;padding:18px 22px}.launch-btn{font-size:16px;padding:22px}.mc-tab{font-size:12px;padding:14px 18px}.chat-bubble{font-size:12px}}
.dream-root{font-family:var(--lux-font-body,'Inter',system-ui,-apple-system,sans-serif);min-height:100vh;color:var(--lux-text-primary,#f8f5f0);position:relative}
.dream-content{position:relative;z-index:1;padding:26px 0 44px;max-width:720px;margin:0 auto}.mc-content{padding:20px 32px}.overlay-pad{padding-left:32px;padding-right:32px}.build-root,.mc-root{font-size:15px}.g-label{font-size:15px}.g-desc{font-size:10px}.launch-btn{font-size:15px}.sec-label{font-size:10px;letter-spacing:0.08em}.f-input{font-size:14px}.f-label{font-size:10px}}
.hero-cursor{color:#c9a04c;animation:blink 0.9s infinite}
.sec-label{font-size:12px;color:rgba(0,229,255,0.85);letter-spacing:4px;margin-bottom:13px;padding-bottom:7px;border-bottom:1px solid rgba(0,229,255,0.15);white-space:nowrap}.dream-root .sec-label{color:rgba(255,159,67,0.85);border-image:linear-gradient(90deg,rgba(255,159,67,0.3),rgba(201,160,76,0.2),transparent) 1}
.goal-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:28px}
.g-card{position:relative;border-radius:18px;padding:15px 14px;cursor:pointer;text-align:left;border:none;outline:none;overflow:hidden}
.g-card.off{background:linear-gradient(148deg,#B04E22,#8d3c18,#6d2c11);border:1px solid rgba(169,70,29,0.08);box-shadow:0 6px 24px rgba(0,0,0,0.55),0 0 32px rgba(201,160,76,0.08),inset 0 1px 0 rgba(255,180,80,0.30),inset 1px 0 0 rgba(255,140,40,0.10),inset -1px 0 0 rgba(255,140,40,0.10),inset 0 -1px 0 rgba(0,0,0,0.18)}
.g-card.on{background:linear-gradient(148deg,#311400,#200e00,#150900);box-shadow:0 0 0 1.5px rgba(201,160,76,0.65),0 0 36px rgba(201,160,76,0.28),0 8px 28px rgba(0,0,0,0.65);transform:translateY(-2px)}
.g-icon{font-size:22px;margin-bottom:6px;display:block}
.g-label{font-family:'Playfair Display',serif;font-size:13px;font-weight:700;margin-bottom:4px;line-height:1.2}
.g-card.off .g-label{color:#FFF}.g-card.on .g-label{color:#c9a04c}
.g-desc{font-size:12px;line-height:1.5}
.g-card.off .g-desc{color:rgba(255,255,255,0.78)}.g-card.on .g-desc{color:rgba(201,160,76,0.82)}
.vision-textarea-wrap{width:100%;min-width:0;display:block;box-sizing:border-box}
.vision-textarea-wrap.ca-chat-input-wrap{border-radius:12px!important;overflow:hidden!important}
.vision-ta{width:100%;max-width:100%;min-width:0;box-sizing:border-box;display:block;background:#0C1520!important;border:1px solid rgba(201,160,76,0.5)!important;border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;font-family:'Inter',system-ui,-apple-system,sans-serif;resize:none;outline:none;line-height:1.8;min-height:106px;transition:border-color 0.3s,box-shadow 0.3s;margin-bottom:6px;word-break:normal;overflow-wrap:break-word;white-space:pre-wrap;box-shadow:0 4px 28px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.05)}
.vision-ta::placeholder{font-family:'Playfair Display',serif;font-style:italic;font-weight:300;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.28);letter-spacing:0.01em}.vision-ta:focus{border:1px solid rgba(201,160,76,0.85)!important;animation:none!important;box-shadow:0 0 0 2px rgba(201,160,76,0.18),0 10px 36px rgba(0,0,0,0.55)}
.ca-chat-input-wrap .vision-ta{border:none!important;border-radius:0!important;box-shadow:0 4px 28px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.05)!important}.ca-chat-input-wrap .vision-ta:focus{border:none!important;animation:none!important;box-shadow:none!important}
.f-label{font-size:13px;color:rgba(255,159,67,0.88);letter-spacing:0.10em}
.f-input{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.30);border-radius:9px;color:#FFF;font-size:12px;padding:9px 13px;font-family:'Inter',system-ui,-apple-system,sans-serif;outline:none;width:100%;box-sizing:border-box;transition:border-color 0.2s,box-shadow 0.2s}
.f-input:focus{border-color:rgba(255,159,67,0.65);box-shadow:0 0 0 2px rgba(255,159,67,0.15),0 0 20px rgba(255,159,67,0.1)}.f-input::placeholder{color:rgba(255,255,255,0.40)}
input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.45)!important;font-style:italic}.ca-chat-input::placeholder,.vision-refine-input::placeholder{font-family:'Inter',system-ui,-apple-system,sans-serif!important;font-size:14px!important;color:rgba(255,255,255,0.4)!important;font-style:normal!important}.ca-chat-input-wrap{background-color:#0C1520!important;border:1px solid rgba(201,160,76,0.5)!important;border-radius:8px;box-sizing:border-box!important;transition:border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)}.ca-chat-input-wrap:focus-within{border-color:rgba(201,160,76,0.78)!important;box-shadow:0 0 0 2px rgba(201,160,76,0.12)!important}.build-root .ca-chat-input,.dream-root .vision-refine-input,[data-ca-drawer] .ca-chat-input{background-color:#0C1520!important;background-image:none!important;-webkit-appearance:none!important;appearance:none!important;border:none!important;box-shadow:none!important}.build-root .ca-chat-input:-webkit-autofill,.dream-root .vision-refine-input:-webkit-autofill,[data-ca-drawer] .ca-chat-input:-webkit-autofill{-webkit-text-fill-color:#FFF!important;-webkit-box-shadow:0 0 0 1000px #0C1520 inset!important;transition:background-color 99999s ease-out 0s}input[type="date"]{-webkit-appearance:none;appearance:none}input[type="date"]::-webkit-calendar-picker-indicator{opacity:0;width:28px;cursor:pointer;position:relative;z-index:2}
.launch-btn{width:100%;padding:17px;border-radius:14px;border:none;font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:13px;font-weight:700;letter-spacing:2.5px;cursor:pointer;position:relative;overflow:hidden;transition:all 0.3s}
.launch-btn.off{background:linear-gradient(135deg,#8a3515 0%,#A9461D 40%,#C4571E 70%,#E06830 100%);color:rgba(255,255,255,0.5);cursor:default}
.launch-btn.on{background:linear-gradient(135deg,#C4571E 0%,#E06830 30%,#FF9F43 60%,#c9a04c 100%);color:#FFF;animation:launchPulse 2.8s ease-in-out infinite;box-shadow:0 0 24px rgba(255,159,67,0.3),0 0 48px rgba(201,160,76,0.15)}
.launch-btn.on:hover{box-shadow:0 10px 38px rgba(255,159,67,0.45),0 0 48px rgba(201,160,76,0.22),0 4px 28px rgba(0,120,255,0.18);animation:none}
.launch-btn.loading{background:linear-gradient(135deg,#C4571E,#E06830,#C4571E);color:rgba(255,255,255,0.92);cursor:wait;animation:launchPulse 1.4s ease-in-out infinite!important}
.narrative-card{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(169,70,29,0.14),rgba(201,160,76,0.05));border:1px solid rgba(201,160,76,0.45);box-shadow:0 0 0 1px rgba(201,160,76,0.1),0 12px 40px rgba(0,0,0,0.45),0 0 48px rgba(201,160,76,0.12);border-radius:18px;padding:24px;margin-bottom:22px;animation:fadeUp 0.5s ease}
.vibe-tag{background:rgba(169,70,29,0.22);border:1px solid rgba(169,70,29,0.55);border-radius:20px;padding:4px 12px;font-size:12px;color:#c9a04c;letter-spacing:2.5px}
.stat-card{background:rgba(44,44,44,0.45);border:1px solid rgba(201,160,76,0.28);border-radius:17px;padding:12px 10px;text-align:center;box-shadow:0 8px 28px rgba(0,0,0,0.35),0 0 0 1px rgba(0,0,0,0.2)}
.phase-row{display:flex;gap:14px;padding:16px 18px;background:rgba(44,44,44,0.35);border:1px solid rgba(201,160,76,0.22);border-radius:18px;align-items:flex-start;border-left:3px solid transparent;box-shadow:0 10px 36px rgba(0,0,0,0.38),0 0 0 1px rgba(201,160,76,0.06)}
.cta-build-btn{width:100%;padding:16px;border-radius:13px;border:none;background:linear-gradient(135deg,#A9461D 0%,#C4571E 38%,#69F0AE 100%);color:#060A0F;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:2.5px;font-family:'Inter',system-ui,-apple-system,sans-serif;animation:consolePulse 2.8s ease-in-out infinite;transition:transform 0.2s}
.cta-build-btn:hover{animation:none}
.build-root{font-family:var(--lux-font-body,'Inter',system-ui,-apple-system,sans-serif);background:var(--lux-bg-main,#121212);min-height:100vh;color:var(--lux-text-primary,#f8f5f0);display:flex;flex-direction:column}
.mc-root{font-family:var(--lux-font-body,'Inter',system-ui,-apple-system,sans-serif);background:radial-gradient(ellipse at 50% 0%,rgba(0,229,255,0.06) 0%,transparent 55%) no-repeat fixed,var(--lux-bg-trip,#171b20);min-height:100vh;color:var(--lux-text-primary,#f8f5f0);display:flex;flex-direction:column}@media(min-width:600px){.mc-root{background:radial-gradient(ellipse at 50% 0%,rgba(0,229,255,0.06) 0%,transparent 55%) no-repeat fixed,transparent}}
.mc-tab{background:none;border:none;cursor:pointer;padding:9px 12px;font-size:11px;letter-spacing:2px;white-space:nowrap;color:rgba(248,245,240,0.72);border-bottom:2px solid transparent;transition:all 0.30s cubic-bezier(0.25,0.46,0.45,0.94);font-family:'Inter',system-ui,-apple-system,sans-serif;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center}
.mc-tab.active{color:#f8f5f0;border-bottom-color:#00E5FF}
.mc-content{padding:14px 22px;overflow-y:auto;flex:1;min-height:0}
.intel-section{background:rgba(255,255,255,0.04);border:1px solid rgba(232,185,35,0.1);border-radius:var(--lux-radius-md,16px);padding:11px;margin-bottom:10px}
.intel-section-label{font-size:12px;letter-spacing:2px;margin-bottom:7px}
.street-card{display:flex;gap:9px;padding:9px 11px;background:rgba(0,0,0,0.25);border-radius:8px;margin-bottom:7px}
.loading-skeleton{height:13px;background:#111D2A;border-radius:4px;animation:shimmer 1.5s infinite;margin-bottom:8px}
.chat-bubble{border-radius:10px;padding:8px 10px;font-size:12px;color:#FFF;line-height:1.7;max-width:86%}
@media(max-width:599px){.dream-content{padding:14px 12px 80px;width:100%;max-width:100%;margin:0;box-sizing:border-box}.goal-grid{gap:7px}.mc-content{padding:12px 12px!important;box-sizing:border-box!important}input,textarea,select{font-size:16px!important}}
.bnav{position:fixed;bottom:0;left:0;right:0;z-index:300;display:flex;background:rgba(28,28,28,0.94);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border-top:1px solid rgba(232,185,35,0.12);padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -8px 40px rgba(0,0,0,0.35)}
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:6px 0 10px;cursor:pointer;border:none;background:none;gap:3px;position:relative;min-height:56px;-webkit-tap-highlight-color:transparent;outline:none}
.bnav-pip{position:absolute;top:0;left:50%;transform:translateX(-50%);width:22px;height:2px;border-radius:2px;opacity:0}
.bnav-btn.active .bnav-pip{opacity:1;animation:pipSpring 0.45s cubic-bezier(0.34,1.56,0.64,1) both}
.bnav-icon{font-size:20px;line-height:1;transition:transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94);display:block}
.bnav-btn.active .bnav-icon{transform:translateY(-2px)}
.bnav-lbl{font-size:9px;letter-spacing:1.5px;font-family:'Inter',system-ui,-apple-system,sans-serif;font-weight:700;transition:color 0.30s cubic-bezier(0.25,0.46,0.45,0.94);color:rgba(248,245,240,0.4)}
.bnav-btn.active .bnav-lbl{color:#c9a04c}
.bnav-btn.bnav-pack.active .bnav-pip{background:#FF9F43!important;box-shadow:0 0 8px #FF9F43}
.bnav-btn.bnav-pack.active .bnav-lbl{color:#FF9F43}
@keyframes pipSpring{0%{opacity:0;transform:translateX(-50%) scaleX(0)}60%{transform:translateX(-50%) scaleX(1.3)}100%{opacity:1;transform:translateX(-50%) scaleX(1)}}
@keyframes consoleIn{from{opacity:0}to{opacity:1}}
@keyframes planningPulse{0%,100%{opacity:0.72}50%{opacity:1.0}}
@keyframes statReveal{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.stat-val{animation:statReveal 0.5s cubic-bezier(0.34,1.56,0.64,1) both}
.tap-scale{-webkit-tap-highlight-color:transparent;cursor:pointer}
.tap-scale:active{transform:scale(0.97)!important;transition:transform 0.12s cubic-bezier(0.34,1.56,0.64,1)!important}
/* Trip console main scroll — own class so global .mc-content !important rules cannot flatten layout */
.mc-root .mc-trip-scroll{flex:1!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;width:100%!important;max-width:min(100%,1320px)!important;margin-left:auto!important;margin-right:auto!important;padding:14px 24px!important;box-sizing:border-box!important;background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;position:relative;z-index:1}
@media(max-width:599px){.mc-root .mc-trip-scroll{padding:12px 12px!important}}
.pack-scroll-dashboard{background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important}`;

// ─── Michael's Expedition (compact) ──────────────────────────────
const MICHAEL_EXPEDITION = {
  tripName:"2026/27 Global Dive & Culture Expedition", startDate:"2026-09-16",
  visionNarrative:"You're about to embark on a 180-night odyssey across 8 countries — from the crystalline waters of the Caribbean to ancient Egyptian temples, from the sacred ghats of Varanasi to the legendary reefs of Komodo.",
  visionHighlight:"Completing 57 dives across 4 continents — from Caribbean coral gardens to Red Sea wrecks aboard Bella 3 to Komodo's legendary drift dives.",
  goalLabel:"Become a Diver", totalNights:180, totalBudget:19527, totalDives:57,
  phases:[
    {id:1, name:"Utila",              flag:"🇭🇳",country:"Honduras",  color:"#00E5FF",type:"Dive",       nights:10,budget:1435,cost:1435,diveCount:8, arrival:"2026-09-16",departure:"2026-09-26"},
    {id:2, name:"Roatan",             flag:"🇭🇳",country:"Honduras",  color:"#69F0AE",type:"Dive",       nights:8, budget:1970,cost:1970,diveCount:13,arrival:"2026-09-26",departure:"2026-10-04"},
    {id:3, name:"San Ignacio",        flag:"🇧🇿",country:"Belize",    color:"#c9a04c",type:"Culture",    nights:3, budget:520, cost:520, diveCount:0, arrival:"2026-10-04",departure:"2026-10-08"},
    {id:4, name:"Caye Caulker",       flag:"🇧🇿",country:"Belize",    color:"#FF9F43",type:"Dive",       nights:7, budget:1200,cost:1200,diveCount:6, arrival:"2026-10-08",departure:"2026-10-15"},
    {id:5, name:"Bridgetown",         flag:"🇧🇧",country:"Barbados",  color:"#A29BFE",type:"Dive",       nights:10,budget:3525,cost:3525,diveCount:8, arrival:"2026-10-16",departure:"2026-10-27"},
    {id:6, name:"Cairo & Luxor",      flag:"🇪🇬",country:"Egypt",     color:"#FF7675",type:"Culture",    nights:6, budget:835, cost:835, diveCount:0, arrival:"2026-10-27",departure:"2026-11-02"},
    {id:7, name:"Red Sea · Bella 3",  flag:"🇪🇬",country:"Egypt",     color:"#00E5FF",type:"Dive",       nights:7, budget:1112,cost:1112,diveCount:12,arrival:"2026-11-06",departure:"2026-11-16"},
    {id:8, name:"New Delhi",          flag:"🇮🇳",country:"India",     color:"#FF9F43",type:"Exploration",nights:3, budget:530, cost:530, diveCount:0, arrival:"2026-11-10",departure:"2026-11-13"},
    {id:9, name:"Varanasi",           flag:"🇮🇳",country:"India",     color:"#c9a04c",type:"Culture",    nights:3, budget:200, cost:200, diveCount:0, arrival:"2026-11-13",departure:"2026-11-16"},
    {id:10,name:"Kannauj",            flag:"🇮🇳",country:"India",     color:"#69F0AE",type:"Exploration",nights:3, budget:1165,cost:1165,diveCount:0, arrival:"2026-11-16",departure:"2026-11-19"},
    {id:11,name:"Kerala",             flag:"🇮🇳",country:"India",     color:"#A29BFE",type:"Exploration",nights:5, budget:900, cost:900, diveCount:0, arrival:"2026-11-19",departure:"2026-11-24"},
    {id:12,name:"Komodo · Wild Frontier",flag:"🇮🇩",country:"Indonesia",color:"#FF6B6B",type:"Dive",    nights:7, budget:1520,cost:1520,diveCount:10,arrival:"2026-11-29",departure:"2026-12-09"},
    {id:13,name:"Jakarta",            flag:"🇮🇩",country:"Indonesia", color:"#FF9F43",type:"Exploration",nights:3, budget:445, cost:445, diveCount:0, arrival:"2026-12-09",departure:"2026-12-12"},
    {id:14,name:"Penang",             flag:"🇲🇾",country:"Malaysia",  color:"#55EFC4",type:"Exploration",nights:4, budget:620, cost:620, diveCount:0, arrival:"2026-12-12",departure:"2026-12-16"},
    {id:15,name:"Bangkok",            flag:"🇹🇭",country:"Thailand",  color:"#74B9FF",type:"Culture",    nights:31,budget:1390,cost:1390,diveCount:0, arrival:"2026-12-16",departure:"2027-01-16"},
  ],
};

/** Compact demo for beta empty state — same phase shape as MICHAEL_EXPEDITION / handleLaunch */
const BETA_DEMO_EXPEDITION = {
  isDemo: true,
  tripName: "The Japanese Feast & Caribbean Dive",
  startDate: "2026-06-01",
  departureCity: "Los Angeles, CA",
  vision:
    "Michelin temples and dawn tuna auctions in Tokyo, then crystalline Caribbean reefs on Utila. Food as meditation. Diving as freedom.",
  visionNarrative:
    "Michelin temples and dawn tuna auctions in Tokyo, then crystalline Caribbean reefs on Utila. Food as meditation. Diving as freedom.",
  visionHighlight: "Tokyo omakase nights, Tsukiji before sunrise, then wall dives off Utila.",
  goalLabel: "Exploration",
  totalNights: 17,
  totalBudget: 3600,
  totalDives: 0,
  phases: [
    {
      id: 1,
      name: "Tokyo",
      flag: "🇯🇵",
      country: "Japan",
      color: "#FF9F43",
      type: "Culture",
      nights: 7,
      budget: 2200,
      cost: 2200,
      diveCount: 0,
      arrival: "2026-06-01",
      departure: "2026-06-08",
    },
    {
      id: 2,
      name: "Utila",
      flag: "🇭🇳",
      country: "Honduras",
      color: "#00E5FF",
      type: "Dive",
      nights: 10,
      budget: 1400,
      cost: 1400,
      diveCount: 8,
      arrival: "2026-06-08",
      departure: "2026-06-18",
    },
  ],
};

function BetaEmptyTripState({ onStartDreaming, onTryDemo }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(169,70,29,0.15) 0%, transparent 60%), #0A0705",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "max(60px, 10vh)",
        paddingBottom: "max(40px, 8vh)",
        paddingLeft: 24,
        paddingRight: 24,
        textAlign: "center",
        gap: 24,
        boxSizing: "border-box",
      }}
    >
      <img
        src="/1bn-logo.png"
        alt=""
        className="welcome-beta-logo"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
      <p className="welcome-beta-wordmark">
        <span className="welcome-beta-wordmark-one">1</span> Bag Nomad
      </p>
      <div>
        <div
          style={{
            fontFamily: "'Playfair Display',Georgia,serif",
            fontSize: "clamp(28px, 6vw, 42px)",
            fontWeight: 200,
            color: "rgba(255,245,220,0.95)",
            lineHeight: 1.3,
            marginBottom: 10,
          }}
        >
          Your first expedition
          <br />
          is waiting.
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display',Georgia,serif",
            fontSize: 18,
            fontStyle: "italic",
            color: "rgba(255,159,67,0.65)",
          }}
        >
          Every journey starts with a feeling.
        </div>
      </div>
      <button
        type="button"
        onClick={onStartDreaming}
        className="welcome-beta-cta"
        style={{
          background: "linear-gradient(135deg, #A9461D, #C4571E)",
          borderRadius: 16,
          padding: "18px 56px",
          color: "#fff",
          fontFamily: "'Playfair Display',Georgia,serif",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.08em",
          cursor: "pointer",
        }}
      >
        ✦ Start Dreaming
      </button>
      <button
        type="button"
        onClick={onTryDemo}
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,245,220,0.48)",
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "0.05em",
          cursor: "pointer",
          padding: "12px 20px",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(255,200,120,0.85)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(255,245,220,0.48)";
        }}
      >
        or explore a demo expedition →
      </button>
    </div>
  );
}

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

// SegmentDetails — imported from components/SegmentDetails.jsx

// SegmentRow — imported from components/SegmentRow.jsx

// ─── PhaseCard ────────────────────────────────────────────────────
// ACTIVITY_ICONS, SEG_TYPE_TO_ACT, getPhaseActivityIcon — imported from utils/tripConsoleHelpers.js

// ─── PhaseDetailPage ──────────────────────────────────────────────
// SegmentWorkspace — imported from components/SegmentWorkspace.jsx

// PhaseDetailPage — imported from components/PhaseDetailPage.jsx

// PhaseCard — imported from components/PhaseCard.jsx

// MissionConsole — imported from components/MissionConsole.jsx

// ─── Root App ─────────────────────────────────────────────────────
export default function App() {
  const isMobile=useMobile();
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

  const [tripAmbientCtx,setTripAmbientCtx]=useState({screen:"trip-console",phase:null,segment:null,tab:null});
  const [founderMode,setFounderMode]=useState(false);
  const [founderExpedition,setFounderExpedition]=useState(()=>loadFounderExpedition());
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
    return null;
  });
  useEffect(()=>{
    try{
      if(tripData)localStorage.setItem("1bn_tripData_v5",JSON.stringify(tripData));
      else localStorage.removeItem("1bn_tripData_v5");
    }catch(e){}
  },[tripData]);

  useEffect(()=>{
    if(founderMode&&tripData){
      saveFounderExpedition(tripData);
      setFounderExpedition(tripData);
    }
  },[tripData,founderMode]);

  const hasTrip=useMemo(()=>Boolean(tripData?.phases?.length>0),[tripData?.phases?.length]);
  const suggestionsTripId=useMemo(()=>getSuggestionsTripId(tripData),[tripData]);

  // Load or generate segment suggestions when trip identity / phase count changes
  useEffect(()=>{
    if(!suggestionsTripId||!tripData?.phases?.length)return;
    try{
      const saved=localStorage.getItem(SUGGEST_KEY);
      if(saved){
        const parsed=JSON.parse(saved);
        if(parsed.tripId&&parsed.tripId!=="undefined"&&parsed.tripId===suggestionsTripId&&parsed.suggestions?.length){
          console.log('[1BN] Loaded existing suggestions for tripId:',suggestionsTripId);
          setSegmentSuggestions(parsed.suggestions);
          return;
        }
        localStorage.removeItem(SUGGEST_KEY);
      }
    }catch(e){localStorage.removeItem(SUGGEST_KEY);}
    console.log('[1BN] Triggering suggestion generation for tripId:',suggestionsTripId,'phases:',tripData.phases.length);
    generateSegmentSuggestions(tripData);
  },[suggestionsTripId,tripData?.phases?.length]);

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
    const tripId=getSuggestionsTripId(td)||String(td.tripName||td.vision||"expedition").slice(0,60);
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

  function handleLoadDemo(){try{const preserve=["1bn_coach_v1","1bn_onboard_v1","1bn_pack_explainer_v1","1bn_phase_hint_shown","1bn_hide_all_tips",FOUNDER_KEY];const saved={};preserve.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)saved[k]=v;});localStorage.clear();Object.entries(saved).forEach(([k,v])=>localStorage.setItem(k,v));localStorage.removeItem(SEG_KEY);}catch(e){}setFounderMode(false);setTripData(MICHAEL_EXPEDITION);setScreen("console");}
  function handleGoGen(data,vd){setAppData({...data,visionData:vd});setScreen("gen");}
  function handleGenComplete(){setScreen("coarchitect");}
  function handleLaunch(hd){posthog.capture("trip_console_launched",{total_budget:hd?.totalBudget,nights:hd?.totalNights,phases:hd?.phases?.length});try{localStorage.removeItem("1bn_pack_v5");localStorage.removeItem("1bn_pack_cats_v1");localStorage.removeItem(SUGGEST_KEY);}catch(e){}console.log('[1BN] handleLaunch tripName:',hd?.tripName,'phases:',hd?.phases?.length);setFounderMode(false);setTripData(hd);setScreen("handoff");}
  function handleReviseLaunch(hd){setTripData(hd);setScreen("handoff");}
  function handleHandoffComplete(){setScreen("console");}
  function handleRevise(){
    const revData={vision:tripData.visionNarrative||"My expedition",tripName:tripData.tripName||"My Expedition",city:tripData.departureCity||"",date:tripData.startDate||"",budgetMode:"dream",budgetAmount:"",selectedGoal:tripData.goalLabel||"custom",
      visionData:{phases:(tripData.phases||[]).map(p=>({destination:p.name||p.destination||"",country:p.country||"",type:p.type||"Exploration",nights:p.nights||7,flag:p.flag||"🌍",why:p.why||"",...(Array.isArray(p.caActivities)&&p.caActivities.length?{caActivities:[...p.caActivities]}:{})})),narrative:tripData.visionNarrative||"",vibe:tripData.visionVibe||"",highlight:tripData.visionHighlight||"",totalNights:(tripData.phases||[]).reduce((s,p)=>s+p.nights,0),totalBudget:(tripData.phases||[]).reduce((s,p)=>s+(p.budget||p.cost||0),0),countries:[...new Set((tripData.phases||[]).map(p=>p.country))].length}};
    setAppData({...revData,isRevision:true});setScreen("coarchitect");
  }
  function handleNewTrip(){
    setFounderMode(false);
    setTripData(null);setScreen("dream");setAppData(null);setSegmentSuggestions(null);
    try{localStorage.removeItem("1bn_tripData_v5");localStorage.removeItem("1bn_seg_v2");localStorage.removeItem("1bn_pack_v5");localStorage.removeItem("1bn_pack_cats_v1");localStorage.removeItem(SUGGEST_KEY);localStorage.removeItem(DISMISS_KEY);}catch(e){}
  }
  function handleExitDemo() {
    setFounderMode(false);
    setTripData(null);
    setScreen("console");
  }
  function handleHomecoming(){setScreen("homecoming");}
  function handlePlanNext(){
    const name=tripData?.tripName||"my expedition";
    setPrefilledVision(`I just completed ${name}. Now I want to `);
    try{localStorage.removeItem("1bn_tripData_v5");localStorage.removeItem("1bn_seg_v2");localStorage.removeItem("1bn_pack_v5");localStorage.removeItem("1bn_pack_cats_v1");}catch(e){}
    setFounderMode(false);
    setTripData(null);setAppData(null);setScreen("dream");
  }

  function handleToggleFounderExpedition(){
    if(founderMode){
      setFounderMode(false);
      try{
        const raw=localStorage.getItem("1bn_tripData_v5");
        const p=raw?JSON.parse(raw):null;
        setTripData(p?.phases?.length?p:null);
      }catch(e){setTripData(null);}
    }else if(founderExpedition?.phases?.length){
      setFounderMode(true);
      setTripData(founderExpedition);
      setScreen("console");
    }
  }

  function handleSaveAsFounderExpedition(){
    if(!tripData||tripData.isDemo)return;
    saveFounderExpedition(tripData);
    setFounderExpedition(tripData);
    setFounderMode(true);
  }

  return(
    <>
      <style>{CSS}</style>
      {screen==="dream"       && <DreamScreen onGoGen={handleGoGen} onLoadDemo={handleLoadDemo} prefilledVision={prefilledVision} onBackToWelcome={() => setScreen("console")}/>}
      {screen==="gen"         && <GenerationScreen onComplete={handleGenComplete}/>}
      {screen==="coarchitect" && appData && <CoArchitect data={appData} visionData={appData.visionData} onLaunch={appData.isRevision?handleReviseLaunch:handleLaunch} onBack={()=>setScreen(appData.isRevision?"console":"dream")}/>}
      {screen==="handoff"     && tripData && <HandoffScreen tripData={tripData} onComplete={handleHandoffComplete}/>}
      {screen==="homecoming"  && tripData && <HomecomingScreen tripData={tripData} onPlanNext={handlePlanNext}/>}
      {(screen==="console"||prevScreen==="console") && !hasTrip && (
        <BetaEmptyTripState
          onStartDreaming={() => setScreen("dream")}
          onTryDemo={() => {
            setFounderMode(false);
            setTripData(BETA_DEMO_EXPEDITION);
            setScreen("console");
          }}
        />
      )}
      {(screen==="console"||prevScreen==="console") && hasTrip && tripData && <div style={{position:prevScreen==="console"||slideDir?"fixed":"relative",inset:prevScreen==="console"||slideDir?0:undefined,width:"100%",zIndex:prevScreen==="console"?0:1,animation:prevScreen==="console"?(slideDir==="left"?"consoleSlideOutLeft 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards":"consoleSlideOutRight 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards"):screen==="console"&&slideDir?(slideDir==="right"?"consoleSlideInLeft 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards":"consoleSlideInRight 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards"):"none",overflow:"hidden"}}><MissionConsole tripData={tripData} onNewTrip={handleNewTrip} onExitDemo={handleExitDemo} onRevise={handleRevise} onPackConsole={()=>{setPendingTab("next");slideScreen("pack");}} onHomecoming={handleHomecoming} isFullscreen={fullscreen} setFullscreen={setFullscreen} initialTab={pendingTab} segmentSuggestions={segmentSuggestions} suggestionsLoading={suggestionsLoading} onUpdateTripData={(updates)=>setTripData(d=>({...d,...updates}))} onTripAmbientContextChange={setTripAmbientCtx} founderExpedition={founderExpedition} founderMode={founderMode} onToggleFounderExpedition={handleToggleFounderExpedition} onSaveAsFounderExpedition={handleSaveAsFounderExpedition}/></div>}
      {(screen==="pack"||prevScreen==="pack") && tripData && hasTrip && <div style={{position:prevScreen==="pack"||slideDir?"fixed":"relative",inset:prevScreen==="pack"||slideDir?0:undefined,width:"100%",zIndex:prevScreen==="pack"?0:1,animation:prevScreen==="pack"?(slideDir==="right"?"consoleSlideOutRight 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards":"consoleSlideOutLeft 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards"):screen==="pack"&&slideDir?(slideDir==="left"?"consoleSlideInRight 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards":"consoleSlideInLeft 500ms cubic-bezier(0.25,0.46,0.45,0.94) forwards"):"none",overflow:"hidden"}}><PackConsole tripData={tripData} onExpedition={()=>slideScreen("console")} onGoToTab={t=>{setPendingTab(t||"next");slideScreen("console");}} isFullscreen={fullscreen} setFullscreen={setFullscreen}/></div>}
      <AmbientChat screen={screen==="pack"?"pack-console":screen==="console"&&!hasTrip?"dream":screen==="console"?tripAmbientCtx.screen:screen} tripData={tripData} currentPhase={screen==="console"?tripAmbientCtx.phase:null} currentSegment={screen==="console"?tripAmbientCtx.segment:null} currentTab={screen==="console"?tripAmbientCtx.tab:null}/>
      {hasTrip && (screen === "console" || screen === "pack") && (
        <button
          type="button"
          className="bn-feedback-pill"
          onClick={() => window.open("https://tally.so/r/QKJrdX", "_blank", "noopener,noreferrer")}
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + " + (tripData?.isDemo ? "82" : "72") + "px)",
            left: 16,
            background: !isMobile
              ? tripData?.isDemo
                ? "rgba(201,160,76,0.16)"
                : "rgba(201,160,76,0.1)"
              : tripData?.isDemo
                ? "rgba(201,160,76,0.12)"
                : "rgba(255,255,255,0.05)",
            border: !isMobile
              ? "1px solid rgba(201,160,76,0.42)"
              : tripData?.isDemo
                ? "1px solid rgba(201,160,76,0.48)"
                : "1px solid rgba(255,255,255,0.10)",
            borderRadius: tripData?.isDemo ? 24 : !isMobile ? 22 : 20,
            padding: tripData?.isDemo ? "12px 22px" : !isMobile ? "8px 18px" : "6px 14px",
            fontSize: tripData?.isDemo ? 14 : !isMobile ? 12 : 11,
            fontWeight: tripData?.isDemo ? 600 : !isMobile ? 500 : 400,
            color: !isMobile
              ? "rgba(248,245,220,0.82)"
              : tripData?.isDemo
                ? "rgba(248,245,220,0.75)"
                : "rgba(255,255,255,0.35)",
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: tripData?.isDemo ? "0.1em" : !isMobile ? "0.08em" : "0.06em",
            cursor: "pointer",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: 890,
            transition: "color 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
            userSelect: "none",
            textTransform: "lowercase",
            minHeight: tripData?.isDemo ? 48 : !isMobile ? 36 : undefined,
            boxShadow: !isMobile
              ? "0 0 28px rgba(201,160,76,0.22), inset 0 1px 0 rgba(255,255,255,0.08)"
              : tripData?.isDemo
                ? "0 0 32px rgba(201,160,76,0.2)"
                : undefined,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tripData?.isDemo ? "rgba(255,230,180,0.95)" : !isMobile ? "rgba(255,245,230,0.95)" : "rgba(255,255,255,0.65)";
            if (tripData?.isDemo) {
              e.currentTarget.style.borderColor = "rgba(201,160,76,0.6)";
              e.currentTarget.style.background = "rgba(201,160,76,0.16)";
            } else if (!isMobile) {
              e.currentTarget.style.borderColor = "rgba(201,160,76,0.55)";
              e.currentTarget.style.background = "rgba(201,160,76,0.14)";
              e.currentTarget.style.boxShadow = "0 0 36px rgba(201,160,76,0.32), inset 0 1px 0 rgba(255,255,255,0.1)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tripData?.isDemo ? "rgba(248,245,220,0.75)" : !isMobile ? "rgba(248,245,220,0.82)" : "rgba(255,255,255,0.35)";
            if (tripData?.isDemo) {
              e.currentTarget.style.borderColor = "rgba(201,160,76,0.4)";
              e.currentTarget.style.background = "rgba(201,160,76,0.1)";
            } else if (!isMobile) {
              e.currentTarget.style.borderColor = "rgba(201,160,76,0.42)";
              e.currentTarget.style.background = "rgba(201,160,76,0.1)";
              e.currentTarget.style.boxShadow = "0 0 28px rgba(201,160,76,0.22), inset 0 1px 0 rgba(255,255,255,0.08)";
            }
          }}
        >
          feedback
        </button>
      )}
    </>
  );
}
