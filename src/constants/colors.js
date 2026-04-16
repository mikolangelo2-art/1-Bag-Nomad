// ── Core Palette ─────────────────────────────────────────────
/** DS v2: mapped to warm teal (keep export name for import stability) */
export const DIVE_CYAN       = "#5E8B8A";
export const SURF_GREEN      = "#69F0AE";
/** Trip console hero / metallic text gold — prefer over bright #FFD93D for UI copy */
export const CULTURE_GOLD    = "#C9A04C";
/** DS v2: mapped to gold */
export const EXPLORATION_ORANGE = "#C9A04C";
/** DS v2: mapped to taupe */
export const NATURE_PURPLE   = "#7A6F5D";
export const MOTO_RED        = "#FF6B6B";
export const TREK_TEAL       = "#5E8B8A";
export const LIGHT_BLUE      = "#5E8B8A";
/** DS v2: mapped to warm teal */
export const TECH_BLUE       = "#5E8B8A";
export const PARCHMENT       = "#F8F5F0";
export const LIGHT_GRAY      = "#E0E0E0";
export const WHITE           = "#FFFFFF";

// ── Dark Backgrounds ─────────────────────────────────────────
export const BG_PAGE         = "#0A0705";              // Warm espresso (DS v2)
export const BG_DARK         = "rgba(10,7,5,0.96)";
export const BG_DARK_TRIP    = "rgba(10,7,5,0.94)";
/** Alias for warm base — same as BG_PAGE */
export const BG_PAGE_WARM    = "#0A0705";
export const BLACK_OVERLAY   = "rgba(0,0,0,0.55)";
/** Dream Console base only — do not use for Trip/Pack shells */
export const BG_DREAM = "#0A0705";
export const BG_DREAM_GRADIENT =
  "radial-gradient(ellipse at 50% 0%, rgba(169,70,29,0.15) 0%, transparent 60%), #0A0705";
export const BG_TRIP_GRADIENT  = "radial-gradient(ellipse at 50% 0%, rgba(94,139,138,0.08) 0%, transparent 55%), #0A0705";
export const BG_PACK_GRADIENT  = "radial-gradient(ellipse at 50% 0%, rgba(201,160,76,0.07) 0%, transparent 55%), #0A0705";

// ── Parchment / Sand Alphas ──────────────────────────────────
export const PARCHMENT_08    = "rgba(248,245,240,0.08)";
export const PARCHMENT_06    = "rgba(248,245,240,0.06)";
export const PARCHMENT_55    = "rgba(248,245,240,0.55)";
export const PARCHMENT_20    = "rgba(248,245,240,0.2)";

// ── Burnt Orange Alphas ──────────────────────────────────────
export const BURNT_ORANGE_35 = "rgba(196,87,30,0.35)";
export const BURNT_ORANGE_50 = "rgba(196,87,30,0.5)";
export const DARK_BURNT_52   = "rgba(169,70,29,0.52)";

// ── Teal alphas (DS v2; names kept for import stability) ─────
export const CYAN_10         = "rgba(94,139,138,0.1)";
export const CYAN_25         = "rgba(94,139,138,0.25)";
export const CYAN_30         = "rgba(94,139,138,0.3)";
export const CYAN_35         = "rgba(94,139,138,0.35)";
export const CYAN_40         = "rgba(94,139,138,0.4)";
export const CYAN_60         = "rgba(94,139,138,0.60)";
export const CYAN_90         = "rgba(94,139,138,0.90)";

// ── Gold alphas (DS v2; names kept) ───────────────────────────
export const ORANGE_15       = "rgba(201,160,76,0.15)";
export const ORANGE_25       = "rgba(201,160,76,0.25)";
export const ORANGE_40       = "rgba(201,160,76,0.4)";
export const ORANGE_65       = "rgba(201,160,76,0.65)";
export const ORANGE_90       = "rgba(201,160,76,0.90)";

// ── Gold Alphas ──────────────────────────────────────────────
export const GOLD_04         = "rgba(201,160,76,0.04)";
export const GOLD_20         = "rgba(201,160,76,0.2)";
export const GOLD_35         = "rgba(201,160,76,0.35)";
export const GOLD_50         = "rgba(201,160,76,0.5)";
export const GOLD_60         = "rgba(201,160,76,0.6)";
export const GOLD_65         = "rgba(201,160,76,0.65)";

// ── Red Alphas ───────────────────────────────────────────────
export const RED_04          = "rgba(255,107,107,0.04)";
export const RED_10          = "rgba(255,107,107,0.1)";
export const RED_40          = "rgba(255,107,107,0.4)";

// ── White Alphas ─────────────────────────────────────────────
export const WHITE_04        = "rgba(255,255,255,0.04)";
export const WHITE_08        = "rgba(255,255,255,0.08)";
export const WHITE_15        = "rgba(255,255,255,0.15)";
export const WHITE_22        = "rgba(255,255,255,0.22)";
export const WHITE_50        = "rgba(255,255,255,0.5)";
export const WHITE_60        = "rgba(255,255,255,0.60)";

// ── Green / Purple / Cyan Wash Alphas ────────────────────────
export const GREEN_WASH      = "rgba(105,240,174,0.04)";
export const PURPLE_WASH     = "rgba(122,111,93,0.04)";
export const CYAN_WASH       = "rgba(94,139,138,0.04)";
export const ORANGE_WASH     = "rgba(201,160,76,0.04)";

// ── Trip Category Colors ─────────────────────────────────────
export const TRIP_CATEGORY_COLORS = {
  Dive:        DIVE_CYAN,
  Surf:        SURF_GREEN,
  Culture:     CULTURE_GOLD,
  Exploration: EXPLORATION_ORANGE,
  Nature:      NATURE_PURPLE,
  Moto:        MOTO_RED,
  Trek:        TREK_TEAL,
  Relax:       TREK_TEAL,
  Transit:     WHITE,
};

// ── Category Dot Colors ──────────────────────────────────────
export const CAT_DOT_COLORS = [
  DIVE_CYAN, SURF_GREEN, CULTURE_GOLD,
  EXPLORATION_ORANGE, NATURE_PURPLE, MOTO_RED,
];

// ── Onboarding Pill Colors ───────────────────────────────────
export const PILL_COLORS = [DIVE_CYAN, SURF_GREEN, NATURE_PURPLE, CULTURE_GOLD];

// ── General Palette Array ────────────────────────────────────
export const PALETTE_8 = [
  DIVE_CYAN, SURF_GREEN, CULTURE_GOLD, EXPLORATION_ORANGE,
  NATURE_PURPLE, MOTO_RED, TREK_TEAL, LIGHT_BLUE,
];

// ── Bag Category Colors ──────────────────────────────────────
export const BAG_COLORS = {
  "Backpack":         DIVE_CYAN,
  "Global Briefcase": NATURE_PURPLE,
  "Worn":             CULTURE_GOLD,
  "Digital":          SURF_GREEN,
  "Day Bag":          EXPLORATION_ORANGE,
};

// ── Notebook Category Colors ─────────────────────────────────
export const NOTEBOOK_CAT_COLORS = {
  docs:    LIGHT_GRAY,
  tech:    TECH_BLUE,
  clothes: CULTURE_GOLD,
  health:  SURF_GREEN,
  travel:  TREK_TEAL,
  creator: EXPLORATION_ORANGE,
  dive:    DIVE_CYAN,
};

// ── Pack Category Colors ─────────────────────────────────────
export const PACK_CAT_COLORS = {
  docs:      LIGHT_GRAY,
  tech:      CULTURE_GOLD,
  clothes:   CULTURE_GOLD,
  health:    SURF_GREEN,
  travel:    TREK_TEAL,
  creator:   EXPLORATION_ORANGE,
  dive:      "#B8A078",
  adventure: TREK_TEAL,
  safari:    CULTURE_GOLD,
  moto:      MOTO_RED,
  work:      NATURE_PURPLE,
};

// ── Expense Category Definitions (colors only) ───────────────
export const EXPENSE_CAT_COLORS = [
  { id: "transport",  accent: DIVE_CYAN,           wash: CYAN_WASH },
  { id: "stay",       accent: SURF_GREEN,           wash: GREEN_WASH },
  { id: "activities", accent: CULTURE_GOLD,          wash: GOLD_04 },
  { id: "food",       accent: EXPLORATION_ORANGE,    wash: ORANGE_WASH },
  { id: "misc",       accent: NATURE_PURPLE,         wash: PURPLE_WASH },
  { id: "intel",      accent: MOTO_RED,              wash: RED_04 },
];

// ── Urgency Color (days-to-depart) ───────────────────────────
export const urgencyColor = (d) =>
  d < 0 ? WHITE : d < 30 ? MOTO_RED : d < 60 ? CULTURE_GOLD : d < 90 ? EXPLORATION_ORANGE : SURF_GREEN;
