/**
 * Generic suggestion card shape - works with AI today; Foursquare can map into this later.
 * @typedef {{
 *   name: string,
 *   description: string,
 *   imageUrl: string|null,
 *   price: string|number,
 *   rating: number|null,
 *   category: string,
 *   address: string|null,
 *   meta: object
 * }} GenericSuggestion
 */

export function normalizeSuggestionItem(raw) {
  const meta = raw?.meta && typeof raw.meta === "object" ? raw.meta : {};
  return {
    name: String(raw?.name ?? "").trim() || "Suggestion",
    description: String(raw?.description ?? "").trim(),
    imageUrl: raw?.imageUrl != null ? raw.imageUrl : null,
    price: raw?.price != null && raw.price !== "" ? raw.price : "\u2014",
    rating: raw?.rating != null && Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : null,
    category: String(raw?.category ?? "").trim() || "Pick",
    address: raw?.address != null ? String(raw.address) : null,
    meta,
  };
}

/** Calendar one-liner under card titles (max 45 chars). */
export function truncateCalendarLine(s, max = 45) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}\u2026`;
}
