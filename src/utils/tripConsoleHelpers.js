// ── Status Config ─────────────────────────────────────────────
export const STATUS_CFG={
  planning:  {label:"PLANNING",  icon:"✏️", color:"#FF9F43"},
  confirmed: {label:"CONFIRMED", icon:"✓",  color:"#E8DCC8"},
  booked:    {label:"BOOKED",    icon:"🔒", color:"#69F0AE"},
  changed:   {label:"CHANGED",   icon:"⚠️",color:"#FF6B6B"},
  cancelled: {label:"CANCELLED", icon:"✕",  color:"#888888"},
};
export const STATUS_NEXT={planning:"confirmed",confirmed:"booked",changed:"booked",cancelled:"planning"};

// ── Suggestion Storage ────────────────────────────────────────
export const SUGGEST_KEY = "1bn_seg_suggestions_v1";
export const DISMISS_KEY = "1bn_dismissed_suggestions";
export const loadDismissed = () => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); } catch(e) { return {}; } };
export const saveDismissed = d => { try { localStorage.setItem(DISMISS_KEY, JSON.stringify(d)); } catch(e) {} };

// ── Trip id for suggestion cache (must match generate + localStorage) ──
export function getSuggestionsTripId(td) {
  if (!td || !Array.isArray(td.phases) || td.phases.length === 0) return "";
  const tn = (td.tripName && String(td.tripName).trim()) || "";
  if (tn) return tn.slice(0, 60);
  const vision = (td.vision && String(td.vision).trim()) || (td.visionNarrative && String(td.visionNarrative).trim()) || "";
  if (vision) return vision.slice(0, 60);
  const sig = td.phases
    .filter((p) => p && p.type !== "Return")
    .map((p) => `${p.id ?? ""}:${(p.name || p.destination || "").slice(0, 24)}`)
    .join("|");
  return sig ? `1bn:${sig.slice(0, 100)}` : "";
}

/** Index in tripData.phases for this UI segment (ids from toSegPhases: String(phase.id) + "a"). */
export function flatPhaseIndexForSegment(segment, allPhases) {
  if (!segment?.id || !Array.isArray(allPhases)) return -1;
  const sid = String(segment.id);
  return allPhases.findIndex((p) => {
    if (!p) return false;
    const pid = String(p.id);
    return sid === `${pid}a` || sid === pid;
  });
}

function suggestionRowHasPayload(row) {
  return !!(row && (row.transport || row.stay || (row.activities && row.activities.length) || row.food));
}

// ── Suggestion Matching ───────────────────────────────────────
export function findSuggestionForSegment(suggestions, segmentName, flatPhaseIndex = -1) {
  if (!suggestions || !Array.isArray(suggestions)) return null;

  const pickByPhaseIndex = (idx) => {
    if (!Number.isInteger(idx) || idx < 0) return null;
    let row = suggestions.find((s) => Number(s.phaseIndex) === idx);
    if (row && suggestionRowHasPayload(row)) return row;
    row = suggestions.find((s) => Number(s.phaseIndex) === idx + 1);
    if (row && suggestionRowHasPayload(row)) return row;
    if (idx < suggestions.length) {
      row = suggestions[idx];
      if (suggestionRowHasPayload(row)) return row;
    }
    return null;
  };

  const byIndex = pickByPhaseIndex(flatPhaseIndex);
  if (byIndex) return byIndex;

  if (!segmentName) return null;
  const name = segmentName.toLowerCase();
  return suggestions.find((s) => s?.phaseName?.toLowerCase() === name)
    || suggestions.find((s) => {
      const pn = s?.phaseName?.toLowerCase();
      return pn && pn.includes(name);
    })
    || suggestions.find((s) => name.includes(s?.phaseName?.toLowerCase()?.split(",")[0]?.trim()))
    || null;
}

export function loadSuggestionsFromStorage() {
  try { const s=localStorage.getItem(SUGGEST_KEY); return s?JSON.parse(s).suggestions:null; } catch(e) { return null; }
}

// ── Transport Mode Detection ──────────────────────────────────
export function detectMode(route) {
  if (!route) return '';
  const r = route.toLowerCase();
  if (r.includes('flight') || r.includes('airline') || r.includes('airport') || r.includes('→') && (r.includes('air') || r.includes('united') || r.includes('american') || r.includes('delta') || r.includes('jetblue'))) return 'Flight';
  if (r.includes('ferry') || r.includes('boat')) return 'Boat/Ferry';
  if (r.includes('bus') || r.includes('shuttle') || r.includes('coach')) return 'Bus/Shuttle';
  if (r.includes('train') || r.includes('rail')) return 'Train';
  if (r.includes('drive') || r.includes('car') || r.includes('rental')) return 'Car/Drive';
  return '';
}

// ── Suggestion Card Styles ────────────────────────────────────
export const suggestionCardStyle = {
  border: '1.5px solid rgba(255,255,255,0.14)',
  borderRadius: '14px',
  background: 'rgba(255,159,67,0.09)',
  padding: '18px',
  marginBottom: '18px',
  textAlign: 'left',
  animation: 'suggestIn 0.40s cubic-bezier(0.25,0.46,0.45,0.94) both'
};
export const suggestionHeaderStyle = {
  fontSize: '11px',
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  color: '#FF9F43',
  letterSpacing: '2px',
  marginBottom: '12px',
  opacity: 0.85,
  textAlign: 'left'
};
export const disclaimerStyle = {
  fontSize: '11px',
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  color: 'rgba(255,255,255,0.30)',
  fontStyle: 'italic',
  marginBottom: '12px',
  lineHeight: 1.5,
  textAlign: 'left'
};
export const acceptBtnStyle = {
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
export const dismissBtnStyle = {
  padding: '10px 14px',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  color: 'rgba(255,255,255,0.45)',
  fontSize: '12px',
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  cursor: 'pointer'
};

/** When accepting Co-Architect transport: avoid pasting a full home→…→island chain into NOTES for mid-trip segments. */
export function transportNotesFromSuggestion(t, { prevCity, homeCity, segmentName } = {}) {
  const fromLeg = String(prevCity || homeCity || "").trim();
  const toLeg = String(segmentName || "").trim();
  const est = t?.estimatedCost ? `Est. ${t.estimatedCost}` : "";
  const route = String(t?.route || "").trim();
  const hopCount = route ? route.split(/\s*(?:→|->|—)\s*/).filter(Boolean).length : 0;
  const longMultiLeg = hopCount > 2 || route.length > 100;
  const hasPrevSeg = !!(prevCity && String(prevCity).trim());
  const parts = [];
  if (hasPrevSeg && longMultiLeg) {
    if (fromLeg && toLeg) parts.push(`Leg: ${fromLeg} -> ${toLeg}`);
    else if (route) parts.push(route);
    if (est) parts.push(est);
    if (t?.bestTiming) parts.push(t.bestTiming);
    if (t?.notes) parts.push(t.notes);
    return parts.join("\n\n");
  }
  if (route) parts.push(route);
  if (est) parts.push(est);
  if (t?.bestTiming) parts.push(t.bestTiming);
  if (t?.notes) parts.push(t.notes);
  return parts.join("\n\n");
}

/** Short copy under Co-Architect transport estimate — clarifies whole-journey vs this-leg. */
export function transportSuggestionEstimateHint({ prevCity, segmentName } = {}) {
  const hasPrev = !!(prevCity && String(prevCity).trim());
  const stop = String(segmentName || "this stop").trim() || "this stop";
  if (hasPrev) {
    return `Estimate often matches the full route above. Your saved leg is ${String(prevCity).trim()} → ${stop} — adjust cost if this hop is priced separately.`;
  }
  return `Typical total to reach ${stop} from trip start (one journey, not per segment unless the route is a single leg).`;
}

// ── Segment Suggestions Prompt Builder ────────────────────────
export function buildSegmentSuggestionsPrompt(tripData, travelerProfile, phasesSlice, startIndex) {
  const phases = phasesSlice || (tripData.phases || []).slice(0, 5);
  const offset = startIndex || 0;
  const home = tripData.departureCity || tripData.city || 'Home';
  const style = travelerProfile?.style || 'Independent';
  const group = travelerProfile?.group || 'Solo';
  return `Travel advisor. ${group} ${style} traveler from ${home}. Budget: $${tripData.totalBudget||'flexible'}.

PHASES:
${phases.map((p, i) => {const globalIdx=offset+i;const from=globalIdx===0?home:(i===0?(tripData.phases[offset-1]?.name||tripData.phases[offset-1]?.destination||'Previous'):(phases[i-1].name||phases[i-1].destination||'Previous'));return `${globalIdx+1}. FROM ${from} → ${p.name||p.destination||p.city}, ${p.country} | ${p.arrival}→${p.departure} | ${p.nights}n | $${p.budget||p.cost}`;}).join('\n')}

CRITICAL BUDGET RULE: Every suggestion you generate MUST fit within the phase budget. Transport + Stay + Activities combined must not exceed the phase budget. Do not suggest any option that would push the total over budget. If budget is tight, prioritize Stay first, then Transport, then Activities.

TRANSPORT ROUTE + COST: The route string may describe the full path for context. For estimatedCost: if this phase is reached directly from HOME (first stop on the whole trip, or first phase in the list with FROM home), the estimate may include major international legs. For EVERY later phase, estimatedCost MUST be the typical price for THIS LEG ONLY from the immediately previous phase/stop to this one (e.g. domestic hop or ferry)—never repeat the same full-journey dollar amount as the first phase unless it is truly one bundled ticket.

For each phase: transport route+cost, stay name+cost, 2 activities+costs, food budget.

Return ONLY JSON:
{"phases":[{"phaseIndex":${offset},"phaseName":"...","transport":{"route":"...","estimatedCost":"$X-X","notes":"..."},"stay":{"recommendation":"...","suggestions":["Name1","Name2"],"estimatedNightly":"$X/night","estimatedTotal":"$X-X","notes":"..."},"activities":[{"name":"...","provider":"...","estimatedCost":"$X","notes":"..."}],"food":{"dailyBudget":"$X-X/day","recommendations":["..."],"notes":"..."}}]}

JSON only. No markdown. No preamble.`;
}

// ── Activity Icons ────────────────────────────────────────────
export const ACTIVITY_ICONS={'DIVE':'🤿','CULTURE':'🏛️','HIKING':'🥾','SAILING':'⛵','CITY':'🏙️','FOOD':'🍜','BEACH':'🏖️','SAFARI':'🦁','WELLNESS':'🧘','ADVENTURE':'🏔️','DEFAULT':'✦'};
export const SEG_TYPE_TO_ACT={Dive:'DIVE',Surf:'SAILING',Culture:'CULTURE',Exploration:'ADVENTURE',Nature:'SAFARI',Moto:'ADVENTURE',Trek:'HIKING',Relax:'WELLNESS',Transit:'DEFAULT',City:'CITY'};
export function getPhaseActivityIcon(phase){const t=phase.segments?.[0]?.type;return ACTIVITY_ICONS[SEG_TYPE_TO_ACT[t]||'DEFAULT']||'✦';}
