import { useState, useEffect, useMemo, useRef } from "react";
import { askAI, parseJSON } from "../utils/aiHelpers";
import { normalizeSuggestionItem } from "../utils/suggestionCardShape";

function inferStayTier(segment) {
  const b = Number(segment?.budget) || 0;
  const n = Math.max(1, Number(segment?.nights) || 1);
  const per = b > 0 ? b / n : 0;
  if (per > 350 || b > 5500) return "luxury - boutique hotels and design hotels";
  if (per < 90 || (b > 0 && b < 900)) return "budget - hostels, guesthouses, and affordable stays";
  return "mid-range - well-rated hotels and apartments";
}

function inferActivityFocus(segment) {
  const t = String(segment?.type || "Exploration").toLowerCase();
  if (t.includes("culture")) return "museums, galleries, and heritage walks";
  if (t.includes("dive")) return "scuba diving and underwater experiences";
  if (t.includes("surf")) return "surfing and coastal activities";
  if (t.includes("nature") || t.includes("trek")) return "hiking, nature, and outdoor adventures";
  if (t.includes("relax")) return "spas, slow days, and scenic viewpoints";
  if (t.includes("beach")) return "beach, snorkeling, and coastal fun";
  return "signature experiences and local highlights";
}

function inferFoodAngle(segment) {
  const c = String(segment?.country || "").toLowerCase();
  if (/japan|tokyo|kyoto|osaka/.test(c)) return "ramen, izakaya, and seasonal Japanese";
  if (/italy|rome|florence|sicily/.test(c)) return "trattoria, pasta, and regional Italian";
  if (/mexico|oaxaca|cdmx/.test(c)) return "street food, markets, and regional Mexican";
  if (/thailand|bangkok|chiang/.test(c)) return "night markets, curry, and Thai classics";
  return "local markets, casual dining, and one special-occasion meal";
}

async function fetchStayItems(segment) {
  const dest = String(segment?.name || "").trim();
  const country = String(segment?.country || "").trim();
  const tier = inferStayTier(segment);
  const prompt = `You are a travel advisor. Destination: ${dest}, ${country}. ${segment?.nights || "?"} nights. Archetype: ${tier}.
Return JSON only, no markdown:
{"items":[{"name":"short property style or area label (not a real trademark)","description":"1-2 sentences","category":"e.g. Boutique Hotel","price":"$$ or $45-90/night","rating":8.2,"address":null,"meta":{}}]}
Exactly 3 items in "items". Use realistic categories; do not invent real hotel brand names.`;
  const raw = await askAI(prompt, 600, 0.6);
  const parsed = parseJSON(raw);
  const arr = Array.isArray(parsed?.items) ? parsed.items : [];
  return arr.slice(0, 3).map(normalizeSuggestionItem);
}

async function fetchActivityItems(segment) {
  const dest = String(segment?.name || "").trim();
  const country = String(segment?.country || "").trim();
  const focus = inferActivityFocus(segment);
  const prompt = `You are a travel advisor. Destination: ${dest}, ${country}. Trip style includes: ${focus}.
Return JSON only:
{"items":[{"name":"activity name","description":"1-2 lines","category":"e.g. Day trip","price":"Est. $X","rating":8.0,"address":null,"meta":{}}]}
Exactly 3 items. No markdown.`;
  const raw = await askAI(prompt, 600, 0.6);
  const parsed = parseJSON(raw);
  const arr = Array.isArray(parsed?.items) ? parsed.items : [];
  return arr.slice(0, 3).map(normalizeSuggestionItem);
}

async function fetchFoodItems(segment) {
  const dest = String(segment?.name || "").trim();
  const country = String(segment?.country || "").trim();
  const angle = inferFoodAngle(segment);
  const prompt = `You are a food expert. Destination: ${dest}, ${country}. Angle: ${angle}.
Return JSON only:
{"items":[{"name":"restaurant style or dish focus","description":"1-2 lines","category":"e.g. Izakaya","price":"$$","rating":8.1,"address":null,"meta":{"cuisine":"short label"}}]}
Exactly 3 items. No real trademarked chain names. No markdown.`;
  const raw = await askAI(prompt, 600, 0.6);
  const parsed = parseJSON(raw);
  const arr = Array.isArray(parsed?.items) ? parsed.items : [];
  return arr.slice(0, 3).map(normalizeSuggestionItem);
}

/**
 * Loads 3 AI suggestions when `enabled` and tab kind match (client-side Unsplash in GenericSuggestionCard).
 * @param {{ kind: 'stay'|'food'|'activities', segment: object, enabled: boolean }} opts
 */
export function useTabSuggestions({ kind, segment, enabled }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(null);
  const segmentRef = useRef(segment);
  segmentRef.current = segment;

  const cacheKey = useMemo(
    () =>
      `${segment?.id ?? ""}-${kind}-${String(segment?.name || "")}-${String(segment?.country || "")}`,
    [segment?.id, segment?.name, segment?.country, kind]
  );

  useEffect(() => {
    if (!enabled || !segment?.name) return undefined;
    if (fetchedRef.current === cacheKey) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const seg = segmentRef.current;
        let out = [];
        if (kind === "stay") out = await fetchStayItems(seg);
        else if (kind === "food") out = await fetchFoodItems(seg);
        else if (kind === "activities") out = await fetchActivityItems(seg);
        if (!cancelled) {
          setItems(out);
          fetchedRef.current = cacheKey;
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e?.message || e));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, enabled, kind]);

  return { items, loading, error };
}
