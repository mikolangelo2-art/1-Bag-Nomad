# 1 Bag Nomad — Claude Code Standing Brief

AI-powered travel planning web app. Sole builder: Michael Angelo Holly II (Mike).
Repo: `/Users/admin/Desktop/1bag-nomad/` — always run git from here, never a subdirectory.

---

## Who You're Working With

Mike is a solo founder and professional tour guide. He builds in focused sessions with a Cursor agent (you), plans strategy in Claude.ai Chat, and tracks operations in Cowork. The Obsidian vault at `/Users/admin/Desktop/Obsidian Vault 1 Bag Nomad/1 Bag Nomad/` is the source of truth for all project context — check it when in doubt.

**His preferences, always:**
- Options before builds — present 2-3 approaches with tradeoffs before implementing anything significant
- Patch scripts over full rewrites — targeted changes only; never rewrite a full component unless explicitly asked
- Quiet luxury aesthetic — confident, uncluttered, cinematic. Never busy, never flashy
- Python heredoc scripts or multi-line edits — more reliable
- Mobile-first QA — iPhone is the primary test surface

---

## Current Sprint Context

**30-Day Pre-Launch Sprint** — March 28 – April 27, 2026
**Launch target:** September 16, 2026 (Mike's 180-night global expedition departs same day)
**Active session:** ~43

**What'ly shipped:**
- Component extraction (App.jsx down to 470 lines)
- Intel Map (Mapbox GL JS satellite, colored dots, gold dashed routes)
- CoArchitect ambient chat (FAB, slide-up drawer, context-aware prompts)
- Living Logo (idle + thinking states wired)
- Budget-aware CA suggestions
- Unsplash photos on Food/Stay/Activities tabs (v2 cache, smarter queries)
- AirLabs airport API replacing Amadeus

**Outstanding deferred items:**
1. iOS return date picker fix
2. FIX 5 — departure city dot + dashed route on Intel Map
3. FIX 6 — mobile label sizing and rotation lock
4. Blueprint Pill / Blueprint tab content (needs Mike's input)
5. AirLabs autocomplete wiring on Travel tab FROM/TO fields
6. Living Logo: listening + celebrating states not yet wired
7. AI reliabi — budget accuracy target 95% before beta

---

## Design System (Non-Negotiable)

**Background:** #150F0A (dark walnut / warm espresso). No purple anywhere.

| Color | Hex | Role |
|-------|-----|------|
| Cyan | #00D4FF | Trip Console ONLY |
Amber | #F59E0B | Dream Console soul color; Pack secondary |
| Gold | #D4AF37 | Cross-console accent, route lines, pip active states |
| Green | #10B981 | OWNED / success states ONLY — never decorative |

**Typography:** Fraunces serif for headings/hero/CA chat (upright 15px). Font floor: 15px desktop / 13px mobile. Exception: 9px for LBS/KG toggle only.

**UX bar:** Every screen must work for 65-year-old first-time international traveler.

---

## Stack & Infrastructure

- React + Vite — Vercel (auto-deploys on push to main)
- `/api/ask.js` (AI), `/api/airports.js` (AirLabs), `/api/unsplash.js` (photos)
- Mapbox GL JS satellite — token in Vercel env vars
- DNS: Cloudflare → 1bagnomad.com

ox gotchas:** interactive:false blocks camera; fitBounds needs essential:true; watch stale closures with coords.

---

## Key Files

| File | What it is |
|------|-----------|
| `src/hooks/useDestinationPhoto.js` | Unsplash query logic |
| `src/components/AmbientChat.jsx` | CoArchitect FAB + Living Logo |
| `src/components/SegmentWorkspace.jsx` | Travel tab (AirLabs wiring pending) |
| `src/components/IntelMap.jsx` | Mapbox satellite map |
| `1bn-landing.html` | Landing page |
| `.claude/skills/1-bag-nomad/SKILL.md` | Full design system — read for deep context |

---

## Rules

- Never use purple, never use green decoratively, never use cyan outside Trip Console
- Never rewrite a full component when a patch works
- Never run git from inside src/ — always from repo root
- Always present ons before building anything non-trivial
- After deploy: hard refresh iPhone, clear localStorage if needed (prefix: 1bn_unsplash_v2_)

---

## Brand

**Tagline:** "Dream it. Build it. Plan it. Pack it. Live it."
**Tone:** Cinematic, confident, unhurried. Never salesy, never cluttered.
**Tesla analogy:** First time in a Tesla — you immediely understand the future.

---

*CLAUDE.md · 1 Bag Nomad · SHAREGOOD Co. LLC · Session 43 · April 8, 2026*
