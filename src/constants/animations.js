// ── Keyframe Names ───────────────────────────────────────────
// All keyframes are injected via the CSS template literal in src/App.jsx.
// These constants provide a single source of truth for animation names
// referenced in inline styles, preventing typo drift.

// Entrance
export const ANIM_FADE_UP       = "fadeUp";
export const ANIM_SLIDE_UP      = "slideUp";
export const ANIM_FADE_IN       = "fadeIn";
export const ANIM_SUGGEST_IN    = "suggestIn";
export const ANIM_COACH_FADE_IN = "coachFadeIn";
export const ANIM_MSG_IN        = "msgIn";
export const ANIM_PHASE_IN      = "phaseIn";
export const ANIM_TAB_FADE_IN   = "tabFadeIn";
export const ANIM_DRAWER_SLIDE_UP = "drawerSlideUp";
export const ANIM_SLIDE_OPEN    = "slideOpen";

// Console transitions
export const ANIM_CONSOLE_SLIDE_OUT_LEFT  = "consoleSlideOutLeft";
export const ANIM_CONSOLE_SLIDE_OUT_RIGHT = "consoleSlideOutRight";
export const ANIM_CONSOLE_SLIDE_IN_LEFT   = "consoleSlideInLeft";
export const ANIM_CONSOLE_SLIDE_IN_RIGHT  = "consoleSlideInRight";
export const ANIM_SLIDE_IN_RIGHT  = "slideInRight";
export const ANIM_SLIDE_OUT_RIGHT = "slideOutRight";

// Loops & pulses
export const ANIM_FLOAT          = "float";
export const ANIM_PULSE          = "pulse";
export const ANIM_COACH_PULSE    = "coachPulse";
export const ANIM_SPIN_GLOBE     = "spinGlobe";
export const ANIM_GLOW_PULSE     = "glowPulse";
export const ANIM_BLINK          = "blink";
export const ANIM_LAUNCH_PULSE   = "launchPulse";
export const ANIM_CONSOLE_PULSE  = "consolePulse";
export const ANIM_AMBER_PULSE    = "amberPulse";
export const ANIM_ACTIVE_PULSE   = "activePulse";
export const ANIM_CA_FAB_PULSE   = "caFabPulse";

// Shimmer
export const ANIM_SHIMMER        = "shimmer";
export const ANIM_SHIMMER_BAR    = "shimmerBar";
export const ANIM_SHIMMER_ONCE   = "shimmerOnce";

// Glow
export const ANIM_VISION_GLOW    = "visionGlow";
export const ANIM_AMBIENT_GLOW   = "ambientGlow";

// Logo states
export const ANIM_LOGO_PULSE     = "logoPulse";
export const ANIM_LOGO_IDLE      = "logoIdle";
export const ANIM_LOGO_THINKING  = "logoThinking";
export const ANIM_LOGO_DONE      = "logoDone";
export const ANIM_LOGO_ERROR     = "logoError";

// Misc
export const ANIM_HINT_FADE      = "hintFade";

// ── Common Durations / Easings ───────────────────────────────
export const EASE_DEFAULT  = "0.3s ease";
export const EASE_SMOOTH   = "0.3s cubic-bezier(0.25,0.46,0.45,0.94)";
export const EASE_SPRING   = "0.7s cubic-bezier(0.22,1,0.36,1)";
export const DURATION_FAST = "0.25s";
export const DURATION_MED  = "0.4s";
export const DURATION_SLOW = "0.8s";
