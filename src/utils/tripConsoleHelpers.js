// ── Status Config ─────────────────────────────────────────────
export const STATUS_CFG={
  planning:  {label:"PLANNING",  icon:"✏️", color:"#FF9F43"},
  confirmed: {label:"CONFIRMED", icon:"✓",  color:"#F8F5F0"},
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

/** Title case for trip names: "latin dream" → "Latin Dream". Preserves digit-led tokens (e.g. years). */
export function formatTripNameDisplay(name) {
  if (name == null || typeof name !== "string") return "";
  const s = name.trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((word) => {
      if (/^\d/.test(word)) return word;
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => (part.length === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

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

/** True if null/undefined, whitespace-only string, empty array, or object whose values are all empty (recursive). */
export function isRowEmpty(row) {
  if (row == null) return true;
  if (typeof row === "string") return row.trim().length === 0;
  if (typeof row === "number" || typeof row === "boolean") return false;
  if (Array.isArray(row)) return row.length === 0 || row.every(isRowEmpty);
  if (typeof row === "object") {
    const keys = Object.keys(row);
    if (keys.length === 0) return true;
    return keys.every((k) => isRowEmpty(row[k]));
  }
  return true;
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

/** Previous segment name in expedition order (segPhases from toSegPhases), or "". */
export function prevSegmentNameForSeg(segment, segPhases) {
  if (!segment?.id || !Array.isArray(segPhases)) return "";
  const allSegs = segPhases.flatMap((p) => p?.segments || []);
  const idx = allSegs.findIndex((s) => s && String(s.id) === String(segment.id));
  if (idx <= 0) return "";
  const prev = allSegs[idx - 1];
  return (prev?.name && String(prev.name).trim()) || "";
}

export function suggestionRowHasPayload(row) {
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
function routeHasLegArrow(route) {
  return /→|–|—|->/.test(String(route || ""));
}

/**
 * Infer MODE from Co-Architect route copy. Priority: Train > Ferry > Bus > Car > Flight.
 * Case-insensitive; phrases are substring checks; short tokens (AVE, ICE, DB) use word boundaries.
 */
export function inferTransportMode(route) {
  const raw = String(route || "");
  const r = raw.toLowerCase();
  if (!r.trim()) return "";

  const trainPhraseHit = [
    "high-speed rail",
    "high speed rail",
    "high-speed train",
    "high speed train",
    "alfa pendular",
    "eurostar",
    "shinkansen",
    "frecciarossa",
    "thalys",
    "italo",
    "pendolino",
    "renfe",
    "sncf",
    "deutsche bahn",
    "amtrak",
    "light rail",
    "bullet train",
    "railjet",
    "railroad",
    "railway",
    "streetcar",
    "tramway",
    "commuter rail",
    "regional rail",
    "urban rail",
    "overnight sleeper",
    "sleeper train",
    "trans-siberian",
    "cable car",
    "seaplane",
  ].some((p) => r.includes(p));

  const trainWordHit =
    /\b(train|subway|tram|underground|monorail|metro)\b/.test(r) ||
    /(?<!t)rail\b/.test(r) ||
    /\b(tgv|ice|ave|jr|db|iryo|ouigo|obb|cfl|sbb)\b/i.test(raw);

  if (trainPhraseHit || trainWordHit) return "Train";

  const ferryPhraseHit = [
    "ferry",
    "catamaran",
    "hydrofoil",
    "seajets",
    "blue star",
    "water taxi",
  ].some((p) => r.includes(p));
  if (ferryPhraseHit || /\b(cruise|boat)\b/.test(r)) return "Boat/Ferry";

  const busPhraseHit = [
    "flixbus",
    "national express",
    "greyhound",
    "megabus",
  ].some((p) => r.includes(p));
  if (busPhraseHit || /\b(bus|shuttle|coach)\b/.test(r)) return "Bus/Shuttle";

  if (
    /\b(uber|lyft|rideshare|pedicab)\b/.test(r) ||
    /\btaxi\b/.test(r) ||
    /\b(rental car|car rental|road trip)\b/.test(r) ||
    /\b(drive|driving)\b/.test(r) ||
    /\bcar\b/.test(r) ||
    /on foot|walking tour|hike to/.test(r)
  )
    return "Car/Drive";

  if (
    /\b(flight|airline|airport|layover)\b/.test(r) ||
    /\b(american airlines|united airlines|delta air|jetblue|lufthansa|emirates)\b/.test(r)
  )
    return "Flight";

  if (
    routeHasLegArrow(raw) &&
    /\b(united|american|delta|jetblue)\b/.test(r)
  )
    return "Flight";

  if (routeHasLegArrow(raw)) {
    if (/\bferry\b|\bcruise\b|\bboat\b/.test(r)) return "Boat/Ferry";
    if (/\btrain\b|(?<!t)rail\b/.test(r)) return "Train";
    if (/\bshuttle\b/.test(r)) return "Bus/Shuttle";
    return "Flight";
  }

  return "";
}

export function detectMode(route) {
  return inferTransportMode(route);
}

// ── Suggestion Card Styles ────────────────────────────────────
export const suggestionCardStyle = {
  border: '1px solid rgba(201,160,76,0.2)',
  borderRadius: '18px',
  background: 'rgba(44,44,44,0.58)',
  boxShadow: '0 0 0 1px rgba(201,160,76,0.08), 0 14px 44px rgba(0,0,0,0.42), 0 0 48px rgba(201,160,76,0.14)',
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
  borderRadius: '16px',
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
  borderRadius: '16px',
  color: 'rgba(255,255,255,0.45)',
  fontSize: '12px',
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  cursor: 'pointer'
};

/** Ghost CTA on full-bleed photos — PLAN MY OWN / SKIP stay legible. */
export const dismissBtnStyleOnHero = {
  ...dismissBtnStyle,
  border: '1px solid rgba(255,255,255,0.48)',
  color: 'rgba(255,255,255,0.94)',
  background: 'rgba(22,22,22,0.72)',
  textShadow: '0 1px 3px rgba(0,0,0,0.85)',
};

/**
 * Models sometimes emit literal "\\u00B7" in JSON strings instead of a middle dot.
 */
export function sanitizeAiDisplayText(s) {
  return String(s || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
}

/** Blurb for the selected property; uses stay.recommendations[i] when present. */
export function stayBlurbForSelection(stay, selectedName) {
  const props = stay?.suggestions || [];
  const name = (selectedName || props[0] || "").trim();
  const idx = props.findIndex((p) => p === name);
  const i = idx >= 0 ? idx : 0;
  const arr = Array.isArray(stay?.recommendations) ? stay.recommendations : [];
  const fromArr = arr[i] != null ? String(arr[i]).trim() : "";
  if (fromArr) return sanitizeAiDisplayText(fromArr);
  if (i === 0 && stay?.recommendation) return sanitizeAiDisplayText(String(stay.recommendation).trim());
  const primary = (props[0] || "").trim();
  if (primary && name && primary !== name) {
    return sanitizeAiDisplayText(
      `${name} is listed as an alternative to ${primary}. The long blurb in this suggestion describes ${primary}; confirm ${name} on your own before booking.`
    );
  }
  return sanitizeAiDisplayText(String(stay?.recommendation || "").trim());
}

/**
 * Whole dollars for the transport cost field from an AI estimate like "$2000-5000".
 * Uses the low end of a range (same idea as acceptTransport split on '-').
 * Avoids stripping all digits, which produced values like 200050 from $2000-5000.
 */
export function parseTransportEstimateToCostDigits(estimateStr) {
  if (estimateStr == null || typeof estimateStr !== "string") return "";
  const t = estimateStr.trim();
  if (!t) return "";
  const range = t.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*[-–—]\s*\$?\s*([\d,]+(?:\.\d+)?)/);
  if (range) {
    const low = Number(String(range[1]).replace(/,/g, ""));
    if (Number.isFinite(low) && low >= 0) return String(Math.round(low)).slice(0, 6);
  }
  const dollar = t.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  if (dollar) {
    const n = Number(String(dollar[1]).replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) return String(Math.round(n)).slice(0, 6);
  }
  const digits = t.replace(/[^0-9]/g, "");
  return digits ? digits.replace(/^0+(?=\d)/, "").slice(0, 6) : "";
}

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
  return `Co-architect. You know this traveler: ${group}, ${style} style, departing from ${home}. You've already seen their vision. Now build suggestions that reflect it — specific properties, named routes, real operators. Not 'a local restaurant' — the restaurant. Not 'a scenic route' — the route. Budget: $${tripData.totalBudget||'flexible'}.

PHASES:
${phases.map((p, i) => {const globalIdx=offset+i;const from=globalIdx===0?home:(i===0?(tripData.phases[offset-1]?.name||tripData.phases[offset-1]?.destination||'Previous'):(phases[i-1].name||phases[i-1].destination||'Previous'));return `${globalIdx+1}. FROM ${from} → ${p.name||p.destination||p.city}, ${p.country} | ${p.arrival}→${p.departure} | ${p.nights}n | $${p.budget||p.cost}`;}).join('\n')}

CRITICAL BUDGET RULE: Every suggestion you generate MUST fit within the phase budget. Transport + Stay + Activities combined must not exceed the phase budget. Do not suggest any option that would push the total over budget. If budget is tight, prioritize Stay first, then Transport, then Activities.

TRANSPORT ROUTE + COST: The route string may describe the full path for context. For estimatedCost: if this phase is reached directly from HOME (first stop on the whole trip, or first phase in the list with FROM home), the estimate may include major international legs. For EVERY later phase, estimatedCost MUST be the typical price for THIS LEG ONLY from the immediately previous phase/stop to this one (e.g. domestic hop or ferry)—never repeat the same full-journey dollar amount as the first phase unless it is truly one bundled ticket.

For each phase: transport route+cost, stay name+cost, 2 activities+costs, food budget.

STAY RULE: stay.suggestions lists named properties in preference order. stay.recommendation MUST describe ONLY stay.suggestions[0] (character, price tier, 1-2 distinctive features). stay.recommendations MUST be a JSON array with the SAME length as stay.suggestions: recommendations[i] is 1-2 sentences describing ONLY stay.suggestions[i] (same specificity rule). For a single property, recommendations can be one element matching recommendation. Never use destination-generic filler. Do NOT write "traditional ryokan" unless the property is a ryokan. Return ONLY the fields in the schema — no extra keys.

Return ONLY JSON:
{"phases":[{"phaseIndex":${offset},"phaseName":"...","transport":{"route":"...","estimatedCost":"$X-X","notes":"..."},"stay":{"recommendation":"...","recommendations":["Blurb for suggestions[0]","Blurb for suggestions[1]"],"suggestions":["Name1","Name2"],"estimatedNightly":"$X/night","estimatedTotal":"$X-X","notes":"..."},"activities":[{"name":"...","provider":"...","estimatedCost":"$X","notes":"..."}],"food":{"dailyBudget":"$X-X/day","recommendations":["..."],"notes":"..."}}]}

JSON only. No markdown. No preamble.`;
}

// ── Activity Icons ────────────────────────────────────────────
export const ACTIVITY_ICONS={'DIVE':'🤿','CULTURE':'🏛️','HIKING':'🥾','SAILING':'⛵','CITY':'🏙️','FOOD':'🍜','BEACH':'🏖️','SAFARI':'🦁','WELLNESS':'🧘','ADVENTURE':'🏔️','DEFAULT':'✦'};
export const SEG_TYPE_TO_ACT={Dive:'DIVE',Surf:'SAILING',Culture:'CULTURE',Exploration:'ADVENTURE',Nature:'SAFARI',Moto:'ADVENTURE',Trek:'HIKING',Relax:'WELLNESS',Transit:'DEFAULT',City:'CITY'};
export function getPhaseActivityIcon(phase){const t=phase.segments?.[0]?.type;return ACTIVITY_ICONS[SEG_TYPE_TO_ACT[t]||'DEFAULT']||'✦';}
