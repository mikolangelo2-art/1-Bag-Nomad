// ──────────────────────────────────────────────────────────────
// DS v2.1 Layout Tokens — Sprint Day 20 (April 17, 2026)
// Source of truth: DesignSystem_v2.md + v2.1 amendment
// ──────────────────────────────────────────────────────────────

/** Sidebar width (desktop only) — §7d icon-only with hover tooltips */
export const SIDEBAR_WIDTH = 72;

/** Content column max width — §6 everywhere except CA Screen exception */
export const CONTENT_MAX = 880;

/** CA Screen split-layout exception — §6 explicit exception */
export const CA_SCREEN_MAX = 1200;

/**
 * Legacy alias — kept for import stability.
 * Pre-v2.1 value was 1200 (drift from spec). Now aligned to CONTENT_MAX per DS v2 §6.
 * Prefer CONTENT_MAX in new code.
 */
export const CONSOLE_CONTENT_MAX = 880;

/** Header tier heights — §7b */
export const HEADER_TIER_1  = 64;   // Utility (pure task screens)
export const HEADER_TIER_2A = 128;  // Stats Hero (consoles + hubs)
export const HEADER_TIER_3  = 176;  // Brand (emotional screens)

/** Breakpoints — §2b + §6 responsive */
export const BP_MOBILE_MAX  = 767;
export const BP_TABLET_MAX  = 1023;
export const BP_DESKTOP_MIN = 1024;
