---
name: 1-bag-nomad
description: Design system, component conventions, and coding standards for the 1 Bag Nomad (1BN) React travel app. Use this skill whenever working on any file in the 1bag-nomad repo, writing or editing React components, applying styles, touching the color system, working on any console (Dream, Trip, Pack), working on the Intel Map, CoArchitect chat, landing page, or any UI element in the app. Also use when writing patch scripts, session briefs, or making architectural decisions for 1BN. If the task involves 1 Bag Nomad in any way, always load this skill first.
---

# 1 Bag Nomad — Agent Skill

**Authoritative reference for all design, code, and architectural decisions in the 1 Bag Nomad React app.**

Mirrors DS v2 + DS v2.1 amendment as of April 17, 2026 · Sprint Day 20.

When this skill conflicts with anything else in context (older docs, session briefs, prior chats), **this skill wins**. DS v2 in the vault/repo at `DesignSystem_v2.md` is the canonical long-form spec; this skill is the working summary agents build from.

---

## PROJECT IDENTITY

- **App:** 1 Bag Nomad (1BN) — AI-powered travel expedition planning
- **Live URL:** 1bagnomad.com
- **Repo:** `/Users/admin/Desktop/1bag-nomad/`
- **Vault:** `/Users/admin/Desktop/Obsidian Vault 1 Bag Nomad/1 Bag Nomad/`
- **Stack:** React (Vite), Mapbox GL JS, Vercel (hosting + serverless), @iconify/react Solar icon set
- **Founder:** Michael Angelo Holly II — solo developer, SHAREGOOD Co. LLC
- **Real-world validation:** Global expedition departing September 16, 2026

---

## NORTH STAR

**Sophisticated Simplicity.** Every screen has one emotional job. Every element has one job. Progressive disclosure — one decision at a time, always.

Filter for every decision: *Would a first-time user with no tech background feel invited, not intimidated?*

Positioning: *Other apps plan your trip. 1 Bag Nomad architects your expedition.*

---

## §1b INTERACTION DEPTH PRINCIPLE (operational rule)

**Information density lives in depth, not breadth. Every screen's surface shows the headline. Detail lives one tap away.**

- Default to collapsed, reveal on tap
- Every displayed metric is a portal, not a billboard
- Photos, descriptions, and supporting content load on interaction, never on first paint
- No screen tries to be complete at a glance
- The calm of the surface *is* the product

**The test for every component:** *"Is this showing the headline, or the detail? If detail, is it behind a tap?"*

---

## WORKFLOW RULES

- Git commands always from `/Users/admin/Desktop/1bag-nomad/` (never a subdirectory)
- **Patch scripts over full rewrites** — never rewrite a full component unless explicitly requested
- **Options before builds** — present 2-3 options with tradeoffs before implementing anything significant
- Python heredoc scripts preferred over `sed` for multi-line CSS/JSX edits
- Deployment via Vercel; serverless functions at `/api/`
- Test on mobile viewport (iPhone) as primary QA surface before desktop
- Vercel auto-deploys on `git push` to main
- Never patch mid-QA — gather all fixes from a full test run first, then write briefs

---

## COLOR PALETTE — LOCKED (DS v2 §3)

### Core

| Role | Value | Job |
|---|---|---|
| Background | `#0A0705` | Warm espresso canvas. Every screen. |
| Primary accent | `#C9A04C` | Gold — action, CTAs, active pills, prices, weight progress |
| Secondary accent | `#5E8B8A` | Warm teal — info, links, map pins, route, volume progress, status, CA markers |
| Text primary | `#E8DCC8` | Cream — titles, names, primary body |
| Text secondary | `rgba(255,255,255,0.55)` | Supporting text, metadata |
| Text tertiary | `rgba(255,255,255,0.30)` | Placeholders, whispers, disabled |
| Neutral UI | `#7A6F5D` | Taupe — borders, dividers, inactive outlines, glass edges |

### Supporting (functional only)

- Success: `#69F0AE` — owned, confirmed, checkmarks
- Warning: `#FF6B6B` — over-weight, over-budget, errors

### Distribution target

Roughly **70% cream / 25% teal / 5% gold** on any given screen. Cream dominates as content, teal supports information, gold punctuates action.

### RETIRED — never reintroduce

- Cyan `#00E5FF` (was Trip Console identity)
- Purple `#A29BFE`
- Electric Blue `#1565FF`
- Bright Yellow `#FFD93D`
- Orange `#FF9F43`
- Three-world color system

---

## TYPOGRAPHY — LOCKED (DS v2 §2 + §2b)

**Two fonts. Two jobs. No exceptions.**

- **Fraunces (serif)** — emotional voice. Narrative, invitation, feeling.
- **Instrument Sans (sans-serif)** — functional voice. UI chrome, labels, data, navigation.

**Rule:** Feeling/invitation → Fraunces. Navigation/data → Instrument Sans. When in doubt → Instrument Sans.

### Desktop Type Scale (§2b) — +2 to +6px larger than mobile, not proportional

| Token | Mobile | Desktop | Usage |
|---|---|---|---|
| Micro caps | 10px | 11px | Footer legal, small meta |
| Small caps | 11px | 13px | "EXPEDITION ACTIVE", tier labels, sub-metric labels |
| Body small | 12px | 14px | Sub-metric rows, card meta |
| Body | 13px | 15px | Snapshot rows, card descriptions, defaults |
| Body emphasized | 14px | 16px | Primary card body, interactive row labels |
| Stat value small | 16px | 20px | Sub-metric percentages on snapshots |
| Stat value | 18px | 24px | Tier 2a hero stats |
| Title small | 16px | 20px | Sub-pill names, category row titles |
| Title | 18px | 24px | Utility header title, phase/segment titles |
| Title large | 22px | 28px | Tier 2a centered hero titles |
| Hero headline | 28px | 42px | Welcome, Tier 3 brand moments |
| Tagline (DREAM BIG) | 28px | 40px | Tier 3 tagline row |

Breakpoint: mobile scale `<1024px` (includes tablet) · desktop scale `>=1024px`.

Agents may not invent in-between sizes. Use the closest token or propose an amendment.

### Category A / B Density (§2b)

**Category A — "Say more" on desktop** (decision screens): Landing, Trip Console, Segment hub, Pack Index, Trip Readiness snapshots.

**Category B — "Keep sparse" on desktop** (emotional/focused): Welcome, Dream, Vision Reveal, Pack List, Tailor, Category Detail, CA Screen, loading.

Test: *"Is the user here to make decisions or to feel something?"* Decisions → A. Feeling → B.

### Retired

- Inter (replaced by Instrument Sans)
- Space Mono (execution-world energy doesn't exist)
- Playfair Display (Fraunces is the only serif)

---

## BACKGROUND SYSTEM — LOCKED (DS v2 §4)

Layer stack (bottom to top):
1. `#0A0705` warm espresso base
2. Dot-style world map texture (10–15% opacity)
3. Radial atmospheric wash (amber/gold, per-screen)
4. Film grain (emotional screens only — Welcome, Dream, Vision Reveal)
5. Content

**All gradients:** `background-attachment: fixed`

---

## LAYOUT & BREAKPOINTS — LOCKED (DS v2 §6 + §6b)

| Viewport | Container |
|---|---|
| Mobile `<768px` | 100% width, 20px horizontal padding |
| Tablet `768-1023px` | 32px horizontal padding |
| Desktop `>=1024px` | **880px centered** |
| Ultra-wide `1600px+` | Same 880px cap — never stretch |

### Desktop exceptions

- Maps: full browser width (Mapbox needs real estate)
- CA Screen: 1200px max (phase cards left + chat right split)

### §6b — No edge framing

Content column is defined by where content ends, **not** by any visual border, line, or shadow. The page background stack shows through continuously inside and outside the column. DS v2's "5-8% gold edge framing" spec is **superseded and removed**.

---

## HEADER TIERS — LOCKED (DS v2.1 §7b)

Three tiers. Three heights. Every screen belongs to exactly one tier. No in-between values.

### Tier 1 — Utility · 64px

**Job:** Back + title, pure task.

**Screens:** Pack List, Tailor, Pack Index, Category Detail, Profile, Calendar, Segment sub-workspaces (Travel/Stay/Activities/Food/Itinerary).

**Spec:**
- 64px exact height
- Back arrow: absolute left 20px, cream 70%, 22px icon, 44×44 tap target
- Title: centered, Instrument Sans 600, 18/24px mobile/desktop, cream
- Optional right action: icon at right 20px (e.g. Profile settings gear, Segment sub-workspace 3-dot menu)
- Background: `rgba(10,7,5,0.95)` + `backdrop-filter: blur(12px)`
- Bottom border: 1px `rgba(255,255,255,0.06)`, sticky z-10

### Tier 2a — Stats Hero · 128px

**Job:** Identity + composite state.

**Screens:** Landing, Trip Console, Phase, Segment hub, Pack Console.

**Two rows, 64px each:**
- Row 1 (Identity): back arrow (if applicable) · title anchor · avatar/status right
- Row 2 (Stats):
  - Landing: Trip Readiness bar (§5d)
  - Trip Console: `PHASES · NIGHTS · BUDGET`
  - Phase: `NIGHTS · BUDGET · SEGMENTS`
  - Segment hub: `NIGHTS · BUDGET · STYLE`
  - Pack Console: `WEIGHT · VOLUME · OWNED · TOTAL`

### Tier 3 — Brand · 176px

**Job:** Emotional invitation. The crown.

**Screens:** Welcome, Dream, Vision Reveal, Loading overlays.

**Two rows:**
- Row 1 (Wordmark, 88px): "1 Bag Nomad" Fraunces 400 26px cream, screen label left (teal caps), status right
- Row 2 (Tagline, 88px): `DREAM BIG` Fraunces 900 28px gold + vertical divider + `travel light` Fraunces 100 italic 16px gold

**"SHAREGOOD Co." is NOT in the Brand Header.** It lives only in Desktop Viewport Footer and Welcome Screen footer.

### Decision tree

```
Emotional invitation?       → Tier 3 · 176px
Carries composite state?    → Tier 2a · 128px
Otherwise (pure task)       → Tier 1 · 64px
```

### Flow rhythm

- **Expedition flow:** 2a → 2a → 2a → 2a → 1 (hero all the way down)
- **Pack flow:** 2a → 2a → 1 → 1 (drops to utility sooner)

---

## NAVIGATION — LOCKED

### Four tools, zero overlap

| Tool | Job | Where |
|---|---|---|
| Back arrow | Up one level | All non-emotional screens |
| Breadcrumb tap | Up multiple levels to ancestor | Tier 2a screens with ancestors (Phase, Segment hub) |
| 3-dot sibling menu | Sideways to sibling sub-workspace | Segment sub-workspaces only |
| Sidebar (desktop) / bottom nav (mobile) | Jump to top-level console | Global |

### Persistent Breadcrumbs (Tier 2a with ancestors)

Format: `Trip › Argentina › BUENOS AIRES`

- Current level: Fraunces 400, 22px, cream 100%
- Ancestors: Fraunces 400, 14px, cream 55%, tappable (routes to that level)
- Separators `›`: gold at 40%
- Mobile truncation: `… › Argentina › BUENOS AIRES`

### 3-Dot Sibling Jumper (§7b.i) — Segment sub-workspaces only

Trigger: horizontal `···` in right-side action slot of Tier 1 header.

Menu: Glass Card per §5, slide-down + fade 0.3s ease-out, 8px offset, right-anchored, max-width 280px. 4 rows showing the siblings excluding the current workspace. Each row: Solar line icon (gold, 20px) + label Instrument Sans 500 15px cream + 48px tall.

### Card-based Segment Sub-Navigation (replaces tabs)

Segment hub presents 5 stacked cards (Travel · Stay · Activities · Food · Itinerary), each tapping into its own Tier 1 sub-workspace. **The horizontal pill-tab row is retired** — DS v2 §9 killed tabs, cards are the honest answer.

### Desktop Sidebar (§7d)

**72px icon-only. Labels reveal via hover tooltip on desktop only.**

- Width: 72px (not 80)
- `#0A0705` bg with dot-map texture
- Right edge: 1px gold at 15%
- Logo top (32px padding above), 5 nav items stacked (28px gap, centered in width), avatar bottom (32px from bottom, 32px diameter)
- Icons: 22px Solar linear, cream 50% inactive, gold active
- Active: gold icon + 3px gold accent bar on left edge of item
- Hover: icon brightens to cream 80%, tooltip reveals 0.3s delay

**Tooltip:** dark espresso bg, 1px gold 18%, radius 8px, padding 6px 12px, Instrument Sans 500 12px cream, 8px right of sidebar, vertically centered.

### Mobile Bottom Nav (DS v2 §7 unchanged)

- 64px + safe area, `rgba(10,7,5,0.95)` + blur(12px)
- 5 items: Trip · Pack · Maps · Calendar · Profile
- Active: gold icon + 3px gold underline bar (20px wide, 4px below icon)
- Inactive: outlined, cream at 40%

---

## LANDING PAGE TRIP READINESS BAR — LOCKED (§5d + §5d.i)

### Composition

- Label: `TRIP READINESS` — Instrument Sans 500, 11px, spaced caps, cream at 55%
- Value: right-aligned, Instrument Sans 600, 16px, gold
- Track: 6px tall, radius 3px, `rgba(255,255,255,0.08)`
- Fill: gold, animated on entry (0 → current, 0.8s ease-out, 0.2s delay)
- Sub-metrics: `Pack 62% · Travel 30% · Stay 45% · Docs 75%`

### Calculation (equal 25% weighting)

```
readiness = (packReady% × 0.25)
          + (travelBooked% × 0.25)
          + (stayConfirmed% × 0.25)
          + (docsInOrder% × 0.25)
```

**Intel is not a readiness metric** — it measures reading, not doing.

### Three-Depth Interaction

- **Depth 0:** bar + sub-metric row always visible
- **Depth 1:** tap a sub-metric → Glass Card panel slides down with 4-6 status rows using §8b icons + "Open [X] →" CTA
- **Depth 2:** tap "Open →" → routes to corresponding working screen

### Desktop Variant (§5d.i, >=1024px)

1. Tier 2a Hero Header (128px, same as mobile)
2. **Compact Snapshot Row (~140px)** — 4 Glass Cards always visible, each showing: metric label + 24px Fraunces gold percentage + top 2 status rows + "Open →" link. 208px wide each, 16px gaps.
3. **2×2 Nav Grid** — My Expedition · My Pack · Maps · Calendar. 432px wide cards, 16px gap.

Tap any compact snapshot card → expands to full snapshot in Glass Card overlay, dismisses on outside-click.

Mobile unchanged: 4×1 nav stack, tap-to-reveal snapshot.

---

## COMPONENTS — LOCKED (DS v2 §5)

### Cards

**Landing Page Card (Card A):** 20px radius, subtle warm gradient, 1px gold 15% border, gold line icon in rounded square + Fraunces title + teal stat line. 24px padding. Shadow `0 4px 20px rgba(0,0,0,0.3)`. Mobile 4×1 stack, desktop 2×2 grid.

**Working Screen Card (Card B):** `rgba(255,255,255,0.04)` bg, 1px taupe border `rgba(122,111,93,0.35)`, 16px radius, 20px padding. No shadow, no gradient. Used everywhere except Landing and glass panels.

**Glass Card:** `rgba(23,27,32,0.65)` + `backdrop-filter: blur(10px)`, 1px gold 18% border, 16px radius, 20px padding. Used for CA messages, info panels, modals, readiness snapshot overlays, 3-dot sibling menu.

### Pills (DS v2 §5)

**Horizontal Filter Pill:** 36px (mobile) / 40px (desktop), 20px radius, Instrument Sans 500 13/14px. Active: gold bg, `#0A0705` text. Inactive: transparent, 1px taupe border, cream 60%.

**Collapsible Trigger Pill:** 100% width, 52/56px, 16px radius. `rgba(255,255,255,0.06)` frosted glass, 1px `rgba(255,255,255,0.10)`, blur(12px). Chevron rotates 180° on expand.

**Multi-Select Interest Pill:** flex wrap, 36px, 20px radius. Unselected: 1px `rgba(255,255,255,0.15)`, cream 60%. Selected: 1px gold border, gold bg at 12%, cream 90%.

**Toggle Pill (Solo/Couple):** 50% width each, 44px, 14px radius. Active: gold border + checkmark + filled bg at 10%.

**Suggestion Sub-Pill (collapsed):** 56/60px, 14px radius, `rgba(255,255,255,0.04)` + 1px taupe. Layout: [icon] [name 15px] · [price gold 13px] [▾].

**Suggestion Sub-Pill (expanded):** photo fades in 0.4s with 0.1s delay, 16:9 aspect, 12px radius. Description Fraunces 300 italic 14px cream 75%. ADD TO PLAN: full-width gold button, dark text, Instrument Sans 600 14px.

### Buttons

**Primary CTA:** 100% width, 52px, 14px radius. Gold bg, `#0A0705` Instrument Sans 600 15px uppercase tracking 1px. Hover: brightness 1.1. Active: scale 0.98.

**Secondary CTA:** transparent, 1px gold border at 50%. Text gold Instrument Sans 500 14px. Hover: fills to gold at 8%.

**Gold Retry (error):** transparent, gold Instrument Sans 500 14px, ↺ icon before text.

---

## FOOTER SYSTEM — LOCKED (§7c)

**Principle:** Footers are quiet legal anchors, never navigation.

### Pattern 1 — Brand Creed Footer (Welcome only)

- `FREEDOM · INDEPENDENCE · DISCOVERY` — Fraunces 400, 11px, spaced caps, cream 55%
- `Patent pending · USPTO #64/014,106` — Instrument Sans 400, 10px, cream 30%
- Centered, 48px below CTA, 32px above viewport bottom

### Pattern 2 — Desktop Viewport Footer (>=1024px, all screens except Welcome and Maps)

- Content: `1 Bag Nomad · SHAREGOOD Co. LLC · Patent pending #64/014,106 · v{version}`
- Instrument Sans 400, 10px, cream 20%
- 40px height, transparent bg, no top border
- Position: fixed to viewport bottom, z-index 5
- **Hidden on mobile entirely**

### Pattern 3 — Profile Footer (Profile only, mobile + desktop)

- Sign Out: full-width ghost, 1px red border `#FF6B6B` at 40%, red text, 48px tall
- Below: app version/build (11px cream 40%) + Privacy · Terms · Licenses (12px cream 55%)

### Pattern 4 — No Footer

All other screens. Bottom nav (mobile) or sidebar (desktop) is the anchor.

---

## STATUS ICON SEMANTIC SYSTEM — LOCKED (§8b)

Four-icon status vocabulary, app-wide.

| Icon | Meaning | Color | Usage |
|---|---|---|---|
| `✓` | Done · Confirmed | Green `#69F0AE` | Items owned, bookings confirmed, documents in order |
| `○` | Pending · Open | Cream 40% | Items to acquire, legs to book, nights to reserve |
| `⚠` | Blocker · Attention | Red `#FF6B6B` | Over-weight, over-budget, missing visa, expired docs |
| `✦` | Next action | Gold `#C9A04C` | Recommended next move, "Next up: X" |

**Pairings locked.** Using a gold `✓` or green `⚠` fragments the vocabulary. Do not reassign.

**Spec:** 14px inline / 18px primary indicator. Solid fills only. 8px left margin to label. Never combine two icons on one row.

**Applies:** readiness snapshots, Pack category rows, Segment suggestion status, Docs rows, any checklist.

**Does not apply:** emotional screens, navigation (sidebar/bottom nav uses gold line icons), loading (use shimmer).

---

## ICONS

- Solar linear set via @iconify/react — `import { Icon } from '@iconify/react'`
- **No emoji anywhere in the app** (icons are production standard)
- Gold `#C9A04C` stroke, 1.5px weight, 18-22px size
- In rounded square containers: gold-tinted bg/border

---

## STATES & FEEDBACK — LOCKED (DS v2 §8)

### Empty states

| Screen | Message | CTA |
|---|---|---|
| Trip Console (no trip) | *"Your first expedition is waiting."* | ✦ Start Dreaming |
| Pack Console (empty) | *"Your bag is light. Let's fill it."* | ✦ Start Packing |
| Calendar (no events) | *"Your timeline will come alive here."* | None |
| Maps (no pins) | *"Generate your expedition to see it here."* | None |
| CA (first message) | *"Let's architect your expedition."* | 2-3 suggestion pills |
| Error / API failure | *"The Co-Architect is resting."* Fraunces italic | ↺ Try again (gold) |

### Loading states

- **No spinners ever.**
- Warm-toned shimmer placeholders (skeletons with subtle gold pulse)
- Sub-pill loading: collapsed pill shape with warm shimmer sweeping left to right
- Trip generation: CA screen with animated logo glow + Fraunces progress messaging

### Micro-interactions

- Card tap: scale 0.98, 0.1s ease → release
- Pill tap: background fill transition 0.2s
- Sub-pill expand: max-height 0.4s ease-out, photo fades 0.4s with 0.1s delay
- Chevron rotate: 180°, 0.3s ease
- Page transition: fade + subtle translateY, 0.3s
- Landing card hover: translateY(-2px), border glow, 0.2s
- Button press: scale 0.98 + brightness shift, 0.1s

### Film grain

- Opacity 8-12% (`--lux-grain-opacity: 0.09`), blend overlay
- **On:** Welcome, Dream, Vision Reveal (emotional)
- **Off:** Trip, Pack, Maps, Calendar (data)

---

## WHAT GETS CUT — LOCKED (DS v2 §9)

Permanently removed. Do not reintroduce.

| Cut | Reason |
|---|---|
| Inter | Replaced by Instrument Sans |
| Space Mono | Execution-world energy doesn't exist |
| Playfair Display | Fraunces is the only serif |
| Tab bars | Replaced by cards everywhere (§7b.i) |
| Top nav (desktop) | Feels like tabs — retired |
| Progress rings | Replaced by slim bars |
| Three-world color system | Unified palette |
| Coaching overlays | Empty states handle first-time UX |
| OnboardCard component | Removed |
| EXPAND/REVISE/NEW TRIP buttons | Competing controls retired |
| 7-tab segment bar | Replaced by card navigation |
| Photos loading on tab entry | Load on tap only |
| Separate Budget and Calendar tabs | Combined into Itinerary |
| "Intel" label | Replaced by "Maps" |
| Cyan as Trip identity | Unified gold accent |
| Purple as accent | Retired |
| CA welcome box (separate) | Folded into first CA message |
| Cold dark backgrounds | Everything warm `#0A0705` family |
| Emoji icons on Landing Page | Replaced by gold line icons |
| Content column edge framing (5-8% gold) | §6b removed — no edge framing |
| 80px sidebar with labels | §7d 72px icon-only with tooltips |
| Intel as readiness metric | Dropped — measures reading not doing |
| "Sharegood Co." in Brand Header | Moved to quiet footer corners only |

---

## FILE ROUTING DISCIPLINE

- **Session briefs for Agent execution** → `/Users/admin/Desktop/1bag-nomad/`
- **Vault entries** (DevLog, BrandVoice, Cardinal Rules, PRDs, deferred items) → Obsidian vault path
- **Downloads from AI outputs** → `~/Downloads/` as staging, then move to repo or vault
- **Git commands** always run from `/Users/admin/Desktop/1bag-nomad/` root

### MCP filesystem server gotcha

Requires full absolute npx path (`/Users/admin/.nvm/versions/node/v18.20.8/bin/npx`) — Claude Desktop doesn't inherit shell PATH. Both repo and vault paths must be in allowed directories. When Cowork starts, select the Obsidian Vault option (not repo path) to avoid silent wrong-directory writes.

---

## INFRASTRUCTURE

- Production AI API: Vercel serverless at `/api/ask.js`
- Airport autocomplete: `/api/airports.js` (AirLabs)
- Custom domain via Cloudflare DNS
- Provisional patent filed March 23, 2026 (USPTO #64/014,106)
- Vercel projectId: `prj_QZiShBgPJA1qjU7lOAxRETuL80Sv`
- Vercel teamId: `team_hAFbzq10VM7ZuKNVwDPrZKtW`
- Email: `mike@1bagnomad.com` (ProtonMail custom domain, MX/SPF/DKIM/DMARC confirmed)

---

## BRAND VOICE

- Quiet luxury, cinematic, adventurous, deeply human
- Never corporate, never generic
- Core creed: **FREEDOM · INDEPENDENCE · DISCOVERY**
- Tagline: **Dream Big. Travel Light.**
- Tesla analogy: should feel like the first time you sit in a Tesla — you immediately understand the future

---

## DOCUMENTS OF RECORD

Canonical sources, in order of authority:

1. `DesignSystem_v2.md` (vault + repo, byte-identical) — full long-form spec + v2.1 amendment
2. This `SKILL.md` — working summary agents build from
3. Cardinal Rules in vault — behavior contracts codified from hard-won lessons
4. `PRD_OfflineSupport.md` (vault) — Phase 1 Vercel KV cache is next major product work
5. Session closeout files — historical build state

When in doubt, read DS v2 in the vault before proposing changes.

---

## AGENT BEHAVIOR SUMMARY

When building or modifying any component:

1. Check this skill first
2. Read DS v2 section referenced (`§5d`, `§7b`, etc.)
3. Propose options before implementing
4. Patch, don't rewrite
5. Run mobile QA first, desktop second
6. Never patch mid-QA; log fails, write brief, batch fixes
7. Match existing patterns before inventing
8. If the task implies retired behavior (cyan, tabs, emoji, progress rings), stop and confirm — something drifted

---

*1 Bag Nomad Agent Skill · April 17, 2026 · Sprint Day 20*
*Mirrors DS v2 + v2.1 · Sophisticated Simplicity · Dream Big. Travel Light.*
