// ── Font Families ────────────────────────────────────────────
export const FONT_BODY     = "'Instrument Sans',system-ui,-apple-system,sans-serif";
export const FONT_DISPLAY  = "'Fraunces',serif";
export const FONT_MONO     = "monospace";

// ── Letter Spacing Presets ───────────────────────────────────
export const LS_TIGHT  = 0.5;   // compact labels
export const LS_NORMAL = 1;     // standard UI text
export const LS_WIDE   = 1.5;   // sub-labels
export const LS_WIDER  = 2;     // section headers
export const LS_ULTRA  = 3;     // category titles
export const LS_MAX    = 4;     // hero labels

// ──────────────────────────────────────────────────────────────
// DS v2.1 §2b — Desktop Typography Scale
// +2 to +6px larger on desktop, not proportional.
// Apply via useIsDesktop() or matchMedia("(min-width: 1024px)").
// ──────────────────────────────────────────────────────────────
export const TYPE = {
  microCaps:       { mobile: 10, desktop: 11 },  // Footer legal, tiny meta
  smallCaps:       { mobile: 11, desktop: 13 },  // EXPEDITION ACTIVE, tier labels
  bodySmall:       { mobile: 12, desktop: 14 },  // Sub-metric rows, card meta
  body:            { mobile: 13, desktop: 15 },  // Snapshot rows, card descriptions
  bodyEmphasized:  { mobile: 14, desktop: 16 },  // Primary card body, interactive labels
  statValueSmall:  { mobile: 16, desktop: 20 },  // Sub-metric percentages
  statValue:       { mobile: 18, desktop: 24 },  // Tier 2a hero stats
  titleSmall:      { mobile: 16, desktop: 20 },  // Sub-pill names, category row titles
  title:           { mobile: 18, desktop: 24 },  // Utility header, phase/segment titles
  titleLarge:      { mobile: 22, desktop: 28 },  // Tier 2a centered hero titles
  heroHeadline:    { mobile: 28, desktop: 42 },  // Welcome, Tier 3 brand
  tagline:         { mobile: 28, desktop: 40 },  // Tier 3 tagline row (DREAM BIG)
};

/** Helper — returns correct size for current viewport */
export const t = (token, isDesktop) =>
  (TYPE[token] && (isDesktop ? TYPE[token].desktop : TYPE[token].mobile)) || 15;
