# 1 Bag Nomad — Design System v2
## *Sophisticated Simplicity*
**Date:** April 15, 2026 · Sprint Day 18
**Status:** ✅ LOCKED — Ready for implementation
**Supersedes:** DesignSystem/Design System.md (historical reference)
**Owner:** Michael Angelo Holly II · SHAREGOOD Co. LLC

---

## 1. NORTH STAR

**Sophisticated Simplicity.**

Every screen has ONE emotional job. Every element has ONE job. Progressive disclosure — one decision at a time, always. Do more with less and speak the same volume across every surface.

This is not minimalism for minimalism's sake. It is the confidence to show only what matters, when it matters, and trust that the user will tap deeper when they're ready. The app should feel like a quiet luxury hotel lobby — not empty, but curated. Not loud, but undeniably present.

The filter for every design decision: *Would a first-time user with no tech background feel invited, not intimidated?*

**Positioning in one line:** *Other apps plan your trip. 1 Bag Nomad architects your expedition.*

---

## 2. TYPOGRAPHY

**Two fonts. Two jobs. No exceptions.**

### Fraunces (Serif) — the emotional voice
Narrative, invitation, feeling.

- Welcome headline: weight 300, 28/36px — "Your first expedition is waiting."
- Dream header: weight 900, 18/22px — DREAM BIG
- Dream tagline: weight 100 italic, 14/15px — *travel light*
- Section invitations: weight 300, 16/18px
- Landing card titles: weight 400, 18/20px
- Expanded sub-pill descriptions: weight 300 italic, 14/15px
- Empty state messages: weight 300, 18/22px
- Error messages: weight 300 italic, 14/15px
- CA greeting: weight 300, 20/24px
- Vision Reveal narrative: weight 300 italic, 15/17px
- Trip name anchor: weight 300 italic, 14/16px — "The Japanese Feast & Caribbean Dive"
- Brand creed: weight 400, 11/12px — FREEDOM · INDEPENDENCE · DISCOVERY

### Instrument Sans (Sans-Serif) — the functional voice
UI chrome, labels, data, navigation. Chosen over Inter for warmer letterforms and less ubiquity — aligns with quiet luxury DNA.

- Bottom nav labels: weight 500, 10/11px
- Pill labels (horizontal): weight 500, 13/14px
- Sub-pill name: weight 500, 15/16px
- Sub-pill price: weight 400, 13/14px
- Stat labels: weight 600, 11/12px
- Stat numbers: weight 600, 16/18px
- Phase card names: weight 600, 16/17px
- Button labels: weight 600, 14/15px (uppercase tracking 1px on CTAs)
- Input placeholders: weight 400, 14/15px
- "EXPEDITION ACTIVE" label: weight 500, 11/12px, spaced caps, teal

### Retired
- **Inter** — Replaced by Instrument Sans.
- **Space Mono** — Retired. Execution-world energy doesn't exist anymore.
- **Playfair Display** — Fully purged.

### The Rule
Feeling/invitation → Fraunces. Navigation/data → Instrument Sans. When in doubt → Instrument Sans.

---

## 3. COLOR PALETTE — LOCKED

### Philosophy
Maximum 5 core colors plus two supporting. Each color has ONE job. No overlap. Old three-world system retired. App speaks with one unified warm voice with subtle per-screen atmospheric tinting.

**Two accent system: gold commands, teal speaks, taupe whispers.**

### The Locked Palette

| Role | Value | Job |
|------|-------|-----|
| Background | `#0A0705` | Warm espresso canvas. Every screen. |
| Primary Accent | `#C9A04C` | Gold — action, commands, CTAs, active pills, prices, weight progress |
| Secondary Accent | `#5E8B8A` | Warm teal — information, links, map pins, route, volume progress, status indicators, CA markers, travel-mode icons |
| Text Primary | `#E8DCC8` | Cream — card titles, names, primary body text |
| Text Secondary | `rgba(255,255,255,0.55)` | Supporting text, metadata |
| Text Tertiary | `rgba(255,255,255,0.30)` | Placeholders, whispers, disabled |
| Neutral UI | `#7A6F5D` | Taupe — borders, dividers, inactive outlines, glass edges |

### Supporting Colors (functional only)
- Success/Confirmed: `#69F0AE` — OWNED badge, booking confirmed, checkmarks
- Warning/Over-limit: `#FF6B6B` — over-weight, over-budget, errors

### Accent Distribution Target
Roughly **70% cream / 25% teal / 5% gold** on any given screen. Cream dominates as content, teal supports information, gold punctuates action moments.

### Retired Colors
- Cyan `#00E5FF` — retired as Trip Console identity
- Purple `#A29BFE` — retired entirely
- Electric Blue `#1565FF` — retired
- Bright Yellow `#FFD93D` — replaced by antique gold
- Orange `#FF9F43` — retired

### Logo Policy
The 1 Bag Nomad / SHAREGOOD logo stays **unmodified**. Its colors are slightly richer than the UI palette — this is intentional. The logo is the jewel; the UI is the velvet backdrop. Do not attempt to color-match the logo to the UI palette.

---

## 4. BACKGROUND SYSTEM

### Layer Stack (bottom to top)
1. `#0A0705` warm espresso base
2. **Dot-style world map texture** — 10–15% opacity. Foundational identity layer.
3. Radial atmospheric wash (amber/gold, per-screen)
4. Film grain (emotional screens only — Welcome, Dream, Vision Reveal)
5. Content

### Per-Screen Atmospheric Tinting

| Screen | Map | Atmospheric Wash |
|--------|-----|-----------------|
| Welcome | Absent | None — pure `#0A0705` + logo glow |
| Dream | Subtle | `rgba(169,70,29,0.12)` amber |
| CA | Subtle | `rgba(169,70,29,0.06)` softer amber |
| Vision Reveal | Present | Warm amber wash, cinematic |
| Landing Page | Present | `rgba(201,160,76,0.04)` whisper gold |
| Trip Console | Present | `rgba(201,160,76,0.03)` whisper gold |
| Segment Page | Present | None — content dominates |
| Pack Console | Subtle | `rgba(169,70,29,0.08)` warm earthy |
| Calendar | Subtle | `rgba(201,160,76,0.03)` whisper gold |
| Maps | N/A | Full Mapbox takes over |
| Profile | Absent | Utility screen, clean |

All gradients: `background-attachment: fixed`

---

## 5. COMPONENT SPECS

### Pills — Universal Pattern

**Horizontal Filter Pill** (Segment Page categories)
- Height: 36px mobile / 40px desktop, padding 0 16px, border-radius 20px full round
- Font: Instrument Sans 500, 13/14px
- Active: gold background, `#0A0705` text
- Inactive: transparent, 1px taupe border, cream at 60%
- Emoji/icon before label, 4px gap
- Horizontal scroll if overflow, no visible scrollbar

**Collapsible Trigger Pill** (Dream Screen: Travel Style, Interests, Dates & Budget)
- Width: 100%, height 52/56px, border-radius 16px
- Background: `rgba(255,255,255,0.06)` frosted glass
- Border: 1px `rgba(255,255,255,0.10)`, backdrop-filter blur(12px)
- Label left, ▾ chevron right
- Chevron rotates 180° on expand, 0.3s ease
- Active/Open: border shifts to gold at 40%
- 12px gap between stacked pills

**Multi-Select Interest Pill** (Dream Screen Interests expansion)
- Flex wrap, height 36px, padding 0 14px, border-radius 20px
- Unselected: 1px border `rgba(255,255,255,0.15)`, cream 60% text
- Selected: 1px gold border, gold background at 12%, cream 90%
- Category headers: Fraunces 300, 15px, emoji prefix
- 8px gap, 20px between category groups

**Toggle Pill** (Solo / Couple)
- Two pills side by side, 50% width each, height 44px, border-radius 14px
- Active: gold border, checkmark left of label, filled background at 10%
- Inactive: taupe border, no checkmark

**Suggestion Sub-Pill** (inside Stay/Activities/Food)

COLLAPSED (zero network):
- Height: 56/60px, border-radius 14px
- Background: `rgba(255,255,255,0.04)`, 1px taupe border
- Layout: [icon] [name Instrument Sans 500 15px] ·····[price gold 13px] [▾]
- 8px gap between sub-pills

EXPANDED (one photo, one request):
- Photo: fades in from opacity 0, 0.4s ease, aspect 16:9, radius 12px
- Description: Fraunces 300 italic, 14px, cream 75%
- Rating: Instrument Sans 400, 13px with ★ icon
- ADD TO PLAN: full-width gold button, dark text, Instrument Sans 600 14px
- Max-height transition 0.4s ease-out, photo fade 0.1s delay

### Cards

**Landing Page Card** (mobile: full-width stacked · desktop: within 880px column)
- Border-radius: 20px
- Background: subtle warm gradient per card
- Border: 1px gold at 15% opacity
- Layout: gold line icon in rounded square left, Fraunces title center, teal stat line below
- Padding: 24px
- 12px gap between cards
- Hover: border brightens to gold 25%, translateY(-2px), 0.2s ease
- Shadow: `0 4px 20px rgba(0,0,0,0.3)`

Per-card gradient tints:
- My Expedition: warm amber wash
- My Pack: dark brown wash
- Maps: dark teal wash
- Calendar: subtle gold wash

**Phase Card** (Trip Console)
- Width 100%, border-radius 16px
- Background: `rgba(255,255,255,0.04)`, 1px taupe border
- Layout: phase name (Fraunces 600 16/17px cream) + destination count + date range
- Padding: 20px
- Tap: reveals segment pills inline (not new page)
- Active/expanded: border gold 25%, subtle lighten

**Glass Card** (CA messages, info panels, modals)
- Background: `rgba(23,27,32,0.65)`, backdrop-filter blur(10px)
- Border: 1px gold at 18%
- Border-radius: 16px, padding 20px

### Buttons

**Primary CTA** (BUILD MY EXPEDITION, ADD TO PLAN)
- Width 100%, height 52px, border-radius 14px
- Background: gold, text `#0A0705` Instrument Sans 600 15px uppercase tracking 1px
- Hover: brightness 1.1, subtle glow
- Active: scale 0.98, 0.1s

**Secondary CTA** (ghost/outline)
- Transparent background, 1px gold border at 50%
- Text: gold Instrument Sans 500 14px
- Hover: fills to gold at 8%

**Gold Retry** (error states)
- Transparent, gold Instrument Sans 500 14px, ↺ icon before text

### Line Icons
- Gold `#C9A04C` stroke, 1.5px weight
- Rounded square containers with low-opacity gold border (for Landing Page cards and sub-pills)
- Replaces emoji throughout (emojis were validated in mockups but line icons are the production standard)

---

## 6. SPACING & LAYOUT

### Spacing Scale
- 4px: inner element gaps (icon to label)
- 8px: sibling elements (pill to pill)
- 12px: card groups
- 16px: section padding vertical
- 20px: horizontal page padding (mobile)
- 24px: card internal padding
- 32px: between major sections
- 48px: between screen zones

### Border Radius Scale
- 8px: badges, tags
- 12px: photo containers
- 14px: buttons, sub-pills
- 16px: cards, glass panels
- 20px: large cards
- Full: pills (height/2)

### Responsive Layout

| Width | Behavior |
|-------|----------|
| Mobile (0–768px) | 100% width, 20px horizontal padding |
| Tablet (768–1024px) | 32px horizontal padding |
| Desktop (1024px+) | **880px content column centered** |
| Ultra-wide (1600px+) | Same 880px cap — never stretch beyond |

**Desktop exceptions:**
- Maps: full browser width (Mapbox needs real estate)
- CA Screen: 1200px max (phase cards left + chat right split)

**Desktop background breathing space:** the area beyond 880px is filled with the warm espresso base + dot world map + atmospheric amber wash. Never dead space — always atmosphere.

**Subtle desktop content framing:** 5–8% gold border on left and right edges of the 880px column creates a faint "canvas edge" feeling.

---

## 7. NAVIGATION

### Mobile — Bottom Nav (persistent)
- Height: 64px + safe area
- Background: `rgba(10,7,5,0.95)` with backdrop-filter blur(12px)
- Border-top: 1px `rgba(255,255,255,0.06)`
- 5 items evenly distributed: 🌍 Trip · 🎒 Pack · 🗺 Maps · 📅 Calendar · 👤 Profile
- Icons: 22px, 1.5px line weight
- Labels: Instrument Sans 500, 10px
- Active: icon brightened to gold + 3px gold underline bar, 20px wide, 4px below icon
- Inactive: outlined, cream at 40%

### Desktop — Left Sidebar (LOCKED)
- Width: 80px fixed, full viewport height
- Background: `#0A0705` with subtle dot map texture showing through
- Right edge: 1px gold border at 15% opacity
- Layout:
  - Small logo mark at top, 32px padding
  - 5 vertical nav items stacked with 24px spacing — icon above label
  - Profile avatar circle anchored at bottom
- Items: Trip · Pack · Maps · Calendar · Profile
- Active state: gold icon + gold label + 3px gold accent bar on left edge of item
- Inactive: cream 40% opacity
- Why sidebar over top nav: top nav reads as "tabs" which we explicitly retired. Sidebar is the premium desktop convention (Notion, Linear, Arc) and preserves the pills-everywhere philosophy.

### Headers — Tiered Approach

**Brand Header** (emotional/story screens)
- Present on: Welcome, Dream, Vision Reveal, CA, Landing Page
- Scales down progressively (largest on Welcome, smallest on Landing)
- "1 Bag Nomad" wordmark with logo mark, "EXPEDITION ACTIVE" in teal caps when active
- Trip name in gold italic serif below on Landing Page

**Utility Header** (working screens)
- Present on: Trip Console, Segment Pages, Pack Console, Maps, Calendar, Profile
- Layout: ← back arrow left, page title center, optional action icon right
- Height: ~44px
- No branding, no tagline — content dominates

### Footers

**Welcome Screen Footer** (brand creed moment)
- `FREEDOM · INDEPENDENCE · DISCOVERY` in small spaced caps, cream 50%
- `Patent pending · USPTO #64/014,106` below in whisper text

**Profile Screen Footer** (utility)
- Version, settings links, legal, sign out

**Desktop Viewport Footer** (quiet legal presence)
- `1 Bag Nomad · SHAREGOOD Co. LLC · Patent pending #64/014,106`
- Instrument Sans 10px at 20% cream opacity
- Very bottom of browser viewport, below 880px column

**No footer on mobile working screens** — bottom nav is the anchor.

### Back Button (consistent, every screen except Welcome/Landing)
- Position: top-left, 20px from left, 12px from top (below status bar on mobile)
- Style: ← chevron, 24px, cream at 70%
- Tap target: 44x44px minimum

---

## 8. STATES & FEEDBACK

### Empty States
Structure: warm background + centered Fraunces message + optional CTA.

| Screen | Message | CTA |
|--------|---------|-----|
| Trip Console (no trip) | *"Your first expedition is waiting."* | ✦ Start Dreaming |
| Pack Console (empty) | *"Your bag is light. Let's fill it."* | ✦ Start Packing |
| Calendar (no events) | *"Your timeline will come alive here."* | None |
| Maps (no pins) | *"Generate your expedition to see it here."* | None |
| CA (first message) | *"Let's architect your expedition."* | 2–3 suggestion pills |
| Suggestion pill (loading) | Warm shimmer placeholder | — |
| Error / API failure | *"The Co-Architect is resting."* Fraunces italic | ↺ Try again (gold) |

### Loading States
- **No spinners. Ever.**
- Warm-toned shimmer placeholders (skeletons with subtle gold pulse)
- Sub-pill loading: collapsed pill shape with warm shimmer sweeping left to right
- Trip generation: CA screen with animated logo glow + Fraunces progress messaging

### Micro-Interactions
- Card tap: scale 0.98, 0.1s ease → release
- Pill tap: background fill transition 0.2s
- Sub-pill expand: max-height 0.4s ease-out, photo fades in 0.4s with 0.1s delay
- Chevron rotate: 180°, 0.3s ease
- Page transition: fade + subtle translateY, 0.3s
- Landing card hover: translateY(-2px), border glow, 0.2s
- Button press: scale 0.98 + brightness shift, 0.1s

### Film Grain
- Opacity: 8–12% (`--lux-grain-opacity: 0.09`), blend: overlay
- **Present on:** Welcome, Dream, Vision Reveal (emotional screens)
- **Absent on:** Trip, Pack, Maps, Calendar (data screens)

---

## 9. WHAT GETS CUT

Permanently removed — do not reintroduce.

| Cut | Reason |
|-----|--------|
| Inter | Replaced by Instrument Sans |
| Space Mono | Execution-world energy doesn't exist |
| Playfair Display | Fraunces is the only serif |
| Tab bars | Replaced by pills everywhere |
| Top nav (desktop) | Feels like tabs — explicitly retired |
| Progress rings | Replaced by slim bars |
| Three-world color system | Unified palette |
| Coaching overlays | Removed Session 49 |
| OnboardCard component | Empty states handle first-time UX |
| EXPAND/REVISE/NEW TRIP buttons | Competing controls retired |
| 7-tab segment bar | Replaced by 5 horizontal filter pills |
| Photos loading on tab entry | Photos load on tap only |
| Separate Budget and Calendar tabs | Combined into Itinerary pill |
| "Intel" label | Replaced by "Maps" |
| Cyan as Trip identity | Unified gold accent |
| Purple as accent | Retired entirely |
| CA welcome box (separate) | Folded into first CA message |
| Cold dark backgrounds | Everything warm `#0A0705` family |
| Emoji icons on Landing Page | Replaced by gold line icons |

---

## 10. COMPETITIVE REFERENCES (Design DNA)

| Pattern | Reference | What We Took |
|---------|-----------|-------------|
| Onboarding | Calm | Vision-first, one idea per screen, full-width pills |
| Collapsed rows | Headspace | Name + metadata + chevron, uniform height |
| Expand behavior | Airbnb | Progressive disclosure, photo + details + CTA |
| Landing cards | Hatch Sleep + Expedia | Full-width stacked gradient cards + stat line |
| Warm dark mode | Revolut | Brown-black temperature, frosted glass |
| Frosted glass buttons | Calm Sleep | Translucent rounded pills on dark |
| Horizontal filter pills | YouTube Music | Outlined pills, filled active, scrollable |
| Multi-select interests | Reddit + Amazon Music | Category-grouped flowing wrap |
| AI empty state | Spotify + MLS | Atmospheric glow + "Try asking" |
| Content empty state | 5 Minute Journal | Warm background, serif greeting, gold CTA |
| Error empty state | Sweetgreen | Branded copy, turn frustration into charm |
| Bottom nav accent | TradingView | Gold underline on active item |
| Solo/Couple toggle | Peacock | Two centered pills, checkmark |
| Dream Screen collapse | Airbnb Search | One active at a time |
| Overall aesthetic benchmark | Kashta | Quiet luxury on dark, gold accent, warm photography |
| Desktop sidebar | Notion/Linear/Arc | Vertical rail, premium desktop feel |

---

## 11. MOCKUP VALIDATION (April 15, 2026)

Seven production-quality mockups generated on sleek.design, validating every major screen of the redesign:

- ✅ Welcome Screen — cinematic, breathing room, logo as invitation
- ✅ Dream Input Screen — one screen, collapsible pills, BUILD CTA
- ✅ Landing Page — 4 stacked gradient cards with stat lines
- ✅ Trip Console — phase cards with inline segment pills
- ✅ Segment Detail — 5 scrollable pills, collapsed sub-pills
- ✅ Pack Console — slim bars, stat boxes, category cards
- ✅ Itinerary Screen — dual progress bars, day-by-day timeline

These mockups become the visual reference for implementation. Cowork builds to match. No ambiguity.

Vision Reveal and CA Screen stay close to current implementation (already magical — "secret sauce").

---

## DOCUMENT STATUS

| Section | Status |
|---------|--------|
| 1. North Star | ✅ LOCKED |
| 2. Typography | ✅ LOCKED |
| 3. Color Palette | ✅ LOCKED |
| 4. Background System | ✅ LOCKED |
| 5. Component Specs | ✅ LOCKED |
| 6. Spacing & Layout | ✅ LOCKED |
| 7. Navigation | ✅ LOCKED |
| 8. States & Feedback | ✅ LOCKED |
| 9. What Gets Cut | ✅ LOCKED |
| 10. Competitive References | ✅ LOCKED |
| 11. Mockup Validation | ✅ LOCKED |

---

*Design System v2 · 1 Bag Nomad · SHAREGOOD Co. LLC*
*April 15, 2026 · Sprint Day 18*
*Sophisticated Simplicity · Dream Big. Travel Light.*


---

# DESIGN SYSTEM v2.1 AMENDMENT
## Structural Consistency Pass
**Date:** April 17, 2026 · Sprint Day 20
**Status:** ✅ LOCKED
**Relationship to v2:** Amends §2, §6, §7. Adds §1b, §2b, §5d, §5d.i, §6b, §7b, §7b.i, §7c, §7d, §8b.

---

## §1b — INTERACTION DEPTH PRINCIPLE

**Information density lives in depth, not breadth. Every screen's surface shows the headline. Detail lives one tap away.**

The operational *how* of Sophisticated Simplicity (§1). Where §1 states the philosophy, §1b states the rule that makes it build-able.

### Implications
- Default to collapsed, reveal on tap
- Every displayed metric is a portal, not a billboard
- Photos, descriptions, and supporting content load on interaction, never on first paint
- No screen tries to be complete at a glance — the complete state is the sum of the paths, not the surface
- The calm of the surface *is* the product

### Applies to
Suggestion pills, phase cards, readiness bar, stat tiles, segment workspace tabs, sub-pill expansions, category cards, pack index rows — every interactive surface in the app.

### The test
> *"Is this showing the headline, or the detail? If detail, is it behind a tap?"*

If a component fails this test, it does not belong in the app yet.

---

## §2b — DESKTOP TYPOGRAPHY SCALE (AMENDS §2)

Desktop type is **+2 to +6px larger** than mobile, not proportionally scaled.

### The Scale

| Token | Mobile | Desktop | Usage |
|---|---|---|---|
| Micro caps | 10px | 11px | Footer legal, very small meta |
| Small caps | 11px | 13px | "EXPEDITION ACTIVE", tier labels, sub-metric labels |
| Body small | 12px | 14px | Sub-metric rows, card meta |
| Body | 13px | 15px | Snapshot status rows, card descriptions, defaults |
| Body emphasized | 14px | 16px | Primary card body, interactive row labels |
| Stat value small | 16px | 20px | Sub-metric percentages on snapshots |
| Stat value | 18px | 24px | Tier 2a hero stats |
| Title small | 16px | 20px | Sub-pill names, category row titles |
| Title | 18px | 24px | Utility header title, phase/segment titles |
| Title large | 22px | 28px | Tier 2a centered hero titles |
| Hero headline | 28px | 42px | Welcome, Tier 3 brand moments |
| Tagline (DREAM BIG) | 28px | 40px | Tier 3 tagline row |

### Category A / B Density Framework

**Category A — "Say more" on desktop** (decision-oriented screens)
- Landing — compact snapshots always visible; 2x2 nav grid
- Trip Console — 2-column phase grid
- Segment hub — 5 workspace cards in grid layout
- Pack Index — 2-column category layout
- Trip Readiness full snapshot panels — up to 6 rows visible

**Category B — "Keep sparse" on desktop** (emotional/focused screens)
- Welcome, Dream input, Vision Reveal — more whitespace, larger type, no added content
- Pack List, Tailor, Category Detail — single-column focus
- CA Screen — split layout preserved
- Loading screens — quiet

**The test:** *"Is the user here to make decisions or to feel something?"* Decisions to A. Feeling to B.

### Breakpoints
- Mobile type scale: <1024px (includes tablet)
- Desktop type scale: >=1024px

---

## §5d — LANDING PAGE TRIP READINESS BAR

Landing is the return-visit home screen. The Trip Readiness bar answers the user's most important pre-departure question — *how ready am I?* — as the first thing they see.

### Placement
Row 2 of the Landing Hero Header (§7b Tier 2a). Full-width within the 880px content column.

### Composition
- Label: `TRIP READINESS` — Instrument Sans 500, 11px, spaced caps, cream at 55%
- Value: `47%` — Instrument Sans 600, 16px, gold, right-aligned
- Track: 6px tall, radius 3px, rgba(255,255,255,0.08)
- Fill: gold #C9A04C, animated on entry (0 to current, 0.8s ease-out, 0.2s delay)
- Sub-metrics: `Pack 62% . Travel 30% . Stay 45% . Docs 75%`

### Calculation
```
readiness = (packReady% x 0.25)
          + (travelBooked% x 0.25)
          + (stayConfirmed% x 0.25)
          + (docsInOrder% x 0.25)
```

**Intel is explicitly not a readiness metric** — it measures reading, not doing.

### Three-Depth Interaction

**Depth 0 — Headline (always visible):** the bar and sub-metric row.

**Depth 1 — Snapshot (tap a sub-metric):** Glass Card slides down with 4-6 lines of concrete status + "Open [X]" CTA. Uses §8b icon system.

**Depth 2 — Full screen (tap "Open"):** routes to Pack Console / Segment Travel tab / Segment Stay tab / Docs.

Full snapshot content examples and spec: see DS v2.1 amendment file in vault.

---

## §5d.i — LANDING DESKTOP VARIANT

**Breakpoint:** >=1024px.

### Layout top-to-bottom
1. **Tier 2a Hero Header** (128px) — unchanged from mobile
2. **Compact Snapshot Row** (~140px) — 4 Glass Cards always visible, each showing metric label + percentage (24px Fraunces gold) + top 2 status rows + "Open" link. 208px wide each, 16px gaps.
3. **Navigation Card Grid 2x2** — My Expedition . My Pack . Maps . Calendar. 432px wide cards, 16px gap.

### Interaction
Tap compact snapshot to expand to full snapshot in Glass Card overlay. Dismisses on outside-click.

### Density math (1440x900 viewport)
Snapshot row 140 + gap 32 + nav grid 340 = 512px. All content above the fold with ~228px breathing room.

### Mobile unchanged
4x1 nav stack, tap-to-reveal snapshot via slide-down panel. No compact row (viewport too narrow).

---

## §6b — CONTENT COLUMN (AMENDS §6)

**Supersedes:** DS v2 §6 *"Subtle desktop content framing: 5-8% gold border on left and right edges."*

### Locked
**No edge framing.** Column is defined by where content ends, not by any visual border, line, or shadow.
- Column: 880px max, centered
- Background: transparent — page stack shows through continuously
- No seam between "inside column" and "outside column"
- Vertical padding: 32px top below header, 48px bottom before footer

---

## §7b — HEADER HEIGHT TIERS

Three tiers. Three heights. Every screen belongs to exactly one tier. No in-between values, no per-screen exceptions.

### Tier 1 — Utility . 64px
Pure task. Back + title, optional right-side action.

**Screens:** Pack List . Tailor . Pack Index . Category Detail . Profile . Calendar . Segment sub-workspaces (Travel/Stay/Activities/Food/Itinerary)

**Layout:**
- Height: 64px exact
- Back arrow: absolute left 20px, cream 70%, 22px icon, 44x44 tap target
- Title: centered, Instrument Sans 600, 18/24px (mobile/desktop), cream
- Optional right action: icon at right 20px
- Background: rgba(10,7,5,0.95) + blur(12px)
- Bottom border: 1px rgba(255,255,255,0.06), sticky z-10

### Tier 2a — Stats Hero . 128px
Identity + composite state. Console/hub screens showing aggregate data.

**Screens:** Landing . Trip Console . Phase . Segment hub . Pack Console

**Layout — two rows, 64px each:**

Row 1 (Identity): back arrow (if applicable) . title anchor (wordmark on Landing, breadcrumb on Phase/Segment hub, centered title elsewhere) . avatar/status right

Row 2 (Stats):
- Landing: Trip Readiness bar (§5d)
- Trip Console: `PHASES . NIGHTS . BUDGET`
- Phase: `NIGHTS . BUDGET . SEGMENTS`
- Segment hub: `NIGHTS . BUDGET . STYLE`
- Pack Console: `WEIGHT . VOLUME . OWNED . TOTAL`

### Tier 3 — Brand . 176px
Emotional invitation only.

**Mobile variant (< 1024px):** Tier 3 header compresses to 120px total height. Tagline DREAM BIG | travel light typography remains locked per BrandVoice doc; container padding adjusts to achieve compression. Locked April 19, 2026 (Phase 4.2).

**Screens:** Welcome . Dream . Vision Reveal . Loading overlays

**Layout:**
- Row 1 (Wordmark, 88px): "1 Bag Nomad" Fraunces 400/26px cream, screen label left (teal caps), status right
- Row 2 (Tagline, 88px): `DREAM BIG` Fraunces 900/28px gold + divider + `travel light` Fraunces 100 italic 16px gold

**"Sharegood Co." removed from Brand Header.** Company attribution lives in Desktop Viewport Footer (§7c Pattern 2) and Welcome Screen footer only.

### Decision tree
```
Emotional invitation?     Tier 3 . 176px
Carries composite state?  Tier 2a . 128px
Otherwise (pure task)     Tier 1 . 64px
```

### Flow rhythm
- **Expedition flow:** 2a to 2a to 2a to 2a to 1 (hero all the way down)
- **Pack flow:** 2a to 2a to 1 to 1 (drops to utility sooner)

### Persistent Breadcrumbs (Tier 2a with ancestors)

Format: `Trip > Argentina > BUENOS AIRES`

- Current level: Fraunces 400, 22px, cream 100%
- Ancestors: Fraunces 400, 14px, cream 55%, tappable (routes to that level)
- Separators: gold at 40%
- Mobile truncation: `... > Argentina > BUENOS AIRES`

### Card-based Segment sub-navigation (replaces tabs)

Segment hub presents 5 stacked cards (Travel . Stay . Activities . Food . Itinerary). Each card taps into its own Tier 1 sub-workspace. The horizontal pill-tab row previously on Segment Workspace was a tab bar wearing pill clothing — DS v2 §9 retired tabs, cards are the honest answer.

---

## §7b.i — SIBLING JUMPER (3-dot menu on Segment sub-workspaces)

Sideways navigation between the 5 sibling workspaces of a Segment without double-back through the Segment hub.

**Exists only on Segment sub-workspaces.** Nowhere else.

### Navigation tool division (zero overlap)
| Tool | Job |
|---|---|
| Back arrow | Up one level |
| Breadcrumb tap | Up multiple levels |
| 3-dot menu | Sideways to a sibling sub-workspace |
| Sidebar / bottom nav | Jump to any top-level console |

### Spec
- Trigger: horizontal three-dot icon in right-side action slot of Tier 1 header
- Menu: Glass Card per §5, slide-down + fade 0.3s ease-out, 8px offset from header, right-anchored, max-width 280px
- Content: 4 rows — the siblings excluding the current workspace
- Each row: Solar line icon (gold, 20px) + label Instrument Sans 500 15px cream + 48px tall
- Dismiss: tap outside, tap three-dot again, or tap a row (navigates + dismisses)

---

## §7c — FOOTER SYSTEM

### Principle
Footers are quiet legal anchors, never navigation. Three narrow jobs, each a dedicated pattern.

### Pattern 1 — Brand Creed Footer (Welcome only)
- Line 1: `FREEDOM . INDEPENDENCE . DISCOVERY` — Fraunces 400, 11px, spaced caps, cream 55%
- Line 2: `Patent pending . USPTO #64/014,106` — Instrument Sans 400, 10px, cream 30%
- Centered, 48px below CTA, 32px above viewport bottom

### Pattern 2 — Desktop Viewport Footer (>=1024px, all screens except Welcome and Maps)
- Content: `1 Bag Nomad . SHAREGOOD Co. LLC . Patent pending #64/014,106 . v{version}`
- Instrument Sans 400, 10px, cream 20%
- Height 40px, transparent bg, no top border
- Position: fixed to viewport bottom, z-index 5
- Hidden on mobile entirely

### Pattern 3 — Profile Footer (Profile only, mobile + desktop)
- Sign Out: full-width ghost, 1px red border #FF6B6B at 40%, red text, 48px tall
- Below: app version/build (11px cream 40%) + Privacy . Terms . Licenses (12px cream 55%)

### Pattern 4 — No Footer
All other screens. Content flows to scroll bottom, bottom nav (mobile) or sidebar (desktop) is the anchor.

### Edge cases
- Maps: no footer anywhere (full viewport)
- Desktop Profile: gets both Pattern 3 + Pattern 2
- Tablet (768-1023px): no Desktop Viewport Footer

---

## §7d — DESKTOP SIDEBAR REFINEMENT (AMENDS §7)

**Supersedes:** DS v2 §7 80px sidebar with "icon above label."

### Locked
**Icon-only sidebar at 72px width.** Labels reveal via hover tooltip on desktop only.

### Spec
- Width: 72px (down from 80)
- Background: #0A0705 with dot-map texture
- Right edge: 1px gold at 15%
- Logo top (32px padding above)
- 5 nav items stacked, 28px gap, centered in width
- Avatar bottom (32px from bottom, 32px diameter)
- Icons: 22px Solar linear, cream 50% inactive, gold active
- Active state: icon shifts to gold + 3px gold accent bar on left edge of item
- Hover: icon brightens to cream 80%, tooltip reveals 0.3s delay

### Tooltip
- Dark espresso bg, 1px gold 18%, radius 8px, padding 6px 12px
- Instrument Sans 500, 12px cream
- Position: 8px right of sidebar, vertically centered on item
- Animation: fade in 0.2s ease-out

### Accessibility
Keyboard arrow keys cycle, Enter activates, Esc dismisses tooltip. aria-label per item. 2px gold focus ring at 60%, keyboard-only.

### Mobile N/A
Mobile uses bottom nav per DS v2 §7 unchanged.

---

## §8b — STATUS ICON SEMANTIC SYSTEM

Four-icon status vocabulary used app-wide.

| Icon | Meaning | Color | Usage |
|---|---|---|---|
| check | Done . Confirmed | Green #69F0AE | Items owned, bookings confirmed, documents in order |
| circle-open | Pending . Open | Cream 40% | Items to acquire, legs to book, nights to reserve |
| warning | Blocker . Attention | Red #FF6B6B | Over-weight, over-budget, missing visa, expired docs |
| sparkle | Next action | Gold #C9A04C | Recommended next move, "Next up: X" |

### Spec
- Size: 14px inline, 18px primary indicator
- Weight: solid fills only
- Baseline-aligned with row text, 8px left margin to label
- Never combine two icons on one row

### Pairings are locked
Using a gold check or green warning fragments the vocabulary. Do not reassign.

### Applies
Readiness snapshots, Pack category rows, Segment suggestion status, Docs rows, any checklist.

### Does not apply
Emotional screens (Welcome/Dream/Vision Reveal), navigation (sidebar/bottom nav uses gold line icons), loading (use shimmer).

---

## NAVIGATION TOOL DIVISION — THE FOUR TOOLS

| Tool | Job | Where |
|---|---|---|
| Back arrow | Up one level | All non-emotional screens |
| Breadcrumb tap | Up multiple levels to ancestor | Tier 2a screens with ancestors (Phase, Segment hub) |
| 3-dot sibling menu | Sideways to sibling sub-workspace | Segment sub-workspaces only |
| Sidebar (desktop) / bottom nav (mobile) | Jump to top-level console | Global |

Zero functional overlap. Each tool does exactly one job.

---

## LOCKED DECISIONS SUMMARY

1. §1b Interaction Depth Principle
2. §2b Desktop Typography Scale (+2 to +6 rule, Category A/B)
3. §5d Trip Readiness Bar + 3-depth snapshots + Docs 4th metric + equal weighting
4. §5d.i Landing Desktop Variant (compact snapshot row + 2x2 nav grid)
5. §6b No content column edge framing
6. §7b Three-tier header system (64/128/176)
7. §7b Persistent breadcrumbs on Tier 2a
8. §7b.i 3-dot Sibling Jumper
9. §7c Four-pattern footer system
10. §7d 72px icon-only sidebar with hover tooltips
11. §8b Status Icon Semantic System
12. SHAREGOOD Co. to quiet footer corners only
13. Card-based Segment navigation (replaces pill-tabs)

---

*Design System v2.1 Amendment · Appended April 17, 2026*
*Sophisticated Simplicity · Dream Big. Travel Light.*
