---
name: 1-bag-nomad
description: Design system, component conventions, and coding standards for the 1 Bag Nomad (1BN) React travel app. Use this skill whenever working on any file in the 1bag-nomad repo, writing or editing React components, applying styles, touching the color system, working on any console (Dream, Trip, Pack), working on the Intel Map, Travel tab, CoArchitect chat, landing page, or any UI element in the app. Also use when writing patch scripts, session briefs, or making architectural decisions for 1BN. If the task involves 1 Bag Nomad in any way, always load this skill first.
---

# 1 Bag Nomad — Agent Skill

Reference for all design, code, and architectural decisions in the 1 Bag Nomad React app.

---

## Project Overview

- **App:** 1 Bag Nomad (1BN) — AI-powered travel planning web app
- **Live URL:** 1bagnomad.com
- **Repo path:** `/Users/admin/Desktop/1bag-nomad/`
- **Stack:** React (Vite), Mapbox GL JS, Vercel (hosting + serverless functions)
- **Founder:** Mike Holly — sole builder, professional tour guide, 180-night global dive expedition planned Sep 16, 2026 (live proof of concept)
- **Company:** SHAREGOOD Co. LLC (Wyoming, registered April 2, 2026)

---

## Workflow Rules

- **Git commands** must always be run from `/Users/admin/Desktop/1bag-nomad/` — never from a subdirectory
- **Patch scripts over full rewrites** — always prefer targeted patches; never rewrite a full component unless explicitly requested
- **Options before builds** — present 2–3 options with tradeoffs before implementing anything significant
- **Python heredoc scripts** are more reliable than `sed` for multi-line CSS/JSX edits
- Deployment is via Vercel; serverless functions live at `/api/`

---

## Design Philosophy

**"Quiet luxury"** — confident, uncluttered, cinematic, unhurried. Never busy, never flashy.

**North Star product statements:**
- *"Sparking an emotional flame, then leveraging the user's own excitement to lead them through the process of building their own dream journey."*
- *"The first dopamine hit that the user will chase until the day that plane takes off."*

**UX quality bar:** The 65-year-old first-time international traveler must be able to use every screen comfortably. Minimum 13px font size on mobile, minimum 15px on desktop. Only exception: 9px for LBS/KG toggle.

---

## Color System (Locked — Do Not Deviate)

### Background
- Base: `#150F0A` (dark walnut / warm espresso)
- No purple anywhere in the app

### Four-Tier Hierarchy

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Cyan** | Trip Console only | `#00D4FF` | Active states, highlights, accents ONLY within Trip Console |
| **Amber** | Dream Console soul color | `#F59E0B` | Dream Console primary accent; Pack Console secondary |
| **Gold** | Cross-console accent | `#D4AF37` | Route lines on Intel Map, cross-console UI accents, pip active states |
| **Green** | OWNED / success states | `#10B981` | Completion indicators, owned gear, success feedback only |

### Additional palette entries
- `#8B7355` — warm brown mid-tone
- `#6B5A3E` — muted brown
- `#4A3728` — dark card backgrounds
- `#2D1F14` — deep section backgrounds

### Color discipline rules
- Cyan **never** appears outside Trip Console
- Green **never** used for decoration — success/completion states only
- Amber is the "soul color" of the Dream experience
- Gold is the premium cross-console connector

---

## Typography

- **Primary:** Fraunces (serif) — used for headings, hero text, emotional moments
- **Body/UI:** System sans-serif stack
- **CoArchitect chat:** Fraunces upright, 15px, inline markdown rendering
- **Font size floor:** 15px desktop / 13px mobile (9px exception for LBS/KG toggle only)

---

## Console Architecture

Three primary consoles, each with distinct color identity:

### Dream Console
- Soul color: **Amber** (`#F59E0B`)
- Entry point — emotional, aspirational
- Vision Reveal → CA Segment Suggestions → Segment Workspace

### Trip Console
- Accent: **Cyan** (`#00D4FF`)
- Planning and itinerary management
- Full-page phase detail slides, Segment Calendar View tab

### Pack Console
- Primary: **Amber**, secondary accent: **Gold**
- Circular SVG progress rings
- Category accordion system

---

## Key Components

### CoArchitect (CA) Ambient Chat
- File: `AmbientChat.jsx`
- Floating FAB (Co-Architect button) — hosts the Living Logo animation system
- Slide-up drawer with context-aware system prompts per screen
- Uses custom DOM event bridge: `openCA`
- Chat style: Fraunces upright 15px, inline markdown rendering

### Intel Map
- Mapbox GL JS satellite map
- Colored destination dots (per console color rules)
- Gold (`#D4AF37`) dashed route lines
- Bloom tap interaction, full viewport takeover
- Known fixes: `interactive: false` blocks programmatic camera; `fitBounds` requires `essential: true`; watch for stale closure bugs with coords
- Mapbox token stored in Vercel environment variables

### Travel Tab / Segment Workspace
- File: `SegmentWorkspace.jsx`
- Known issue history: form jumping to confirmed card view; blank screen on "Plan My Own"
- AirLabs API for airport autocomplete (replaced Amadeus, decommissioning July 2026)
- AirLabs proxy: `/api/airports.js`

### Landing Page
- File: `1bn-landing.html`
- Eight Block 2 briefs drafted and queued

---

## Navigation System

- Five-tab bottom navigation
- Gold pip active states
- iOS safe area support
- Reusable `BottomSheet` component

---

## API & Infrastructure

- Production AI API: Vercel serverless at `/api/ask.js`
- Airport autocomplete: `/api/airports.js` (AirLabs)
- Custom domain via Cloudflare DNS
- Provisional patent filed March 23, 2026 (USPTO #64/014,106)

---

## Outstanding Deferred Items (as of Session 26, early April 2026)

1. iOS return date picker fix
2. FIX 5 — departure city dot + dashed route on Intel Map
3. FIX 6 — mobile label sizing and rotation lock
4. Blueprint Pill
5. AirLabs autocomplete on Travel tab FROM/TO fields

---

## Patch Script Conventions

- Prefer Python heredoc scripts over `sed` for multi-line edits
- Always `cd /Users/admin/Desktop/1bag-nomad/` before any git command
- Test on mobile viewport (iPhone) as primary QA surface
- Vercel auto-deploys on `git push` to main

---

## Tagline & Brand Voice

- **Tagline:** "Dream it. Build it. Plan it. Pack it. Live it."
- **Tesla analogy:** The app should feel like the first time you sit in a Tesla — you immediately understand the future
- Brand is cinematic, confident, unhurried — never salesy, never cluttered
