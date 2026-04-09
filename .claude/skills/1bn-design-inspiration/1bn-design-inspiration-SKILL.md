# 1 Bag Nomad — Design Inspiration Skill

> ALWAYS read this file and examine all reference images in `references/images/` before performing any UI, landing page, or design work for 1 Bag Nomad.

## Purpose

This skill ensures visual consistency across all design sessions — whether in Claude Code, Chat, or Cowork. Before generating any UI code, component, layout, or style change, you must:

1. Read every image in `references/images/` (all subfolders)
2. Extract the style patterns listed below
3. Cross-reference against the **1BN Design System** section
4. Only then begin design work

## How to Use References

When examining reference images, extract and note these patterns:

- **Color palette** — background tones, surface layers, accent colors, text hierarchy
- **Typography** — font weights, sizes, letter-spacing, heading vs body contrast
- **Spacing** — padding rhythm, section breathing room, card internal margins
- **Component shapes** — border radius, card elevation, divider styles, button forms
- **Mood** — what makes it feel premium? what creates the "quiet luxury" sensation?

## 1BN Design System (Locked — Session 23)

These are non-negotiable. Reference images inform *how* we execute, but these tokens define *what* we execute with.

### Fonts
- **Display / Headings:** Fraunces (serif, optical size axis)
- **Body / UI / Mono:** Space Mono (monospace)

### Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| Cyan | `#00e5ff` | Trip Console — borders, glows, active states |
| Amber | `#ffb300` | Dream Console + Pack Console — accents, highlights |
| Gold | `#ffd700` | Cross-console accent — premium moments, CTAs |
| Green | — | OWNED states only (pack items, completed goals) |
| Near-black surfaces | `#0a0a0a` to `#1a1a1a` | Backgrounds, card surfaces |
| White text | `#ffffff` / `#e0e0e0` | Primary / secondary text on dark |

### Design Principles
- **Quiet luxury** — restraint over flash, whitespace over clutter
- **Cinematic depth** — layered dark surfaces, subtle glows, not flat
- **Earned color** — color appears when the user accomplishes something or interacts; default state is muted
- **Travel-grade clarity** — every element must be readable on a phone in bright sunlight or a dim hostel

### Component Patterns
- Cards: dark surface (`#111` to `#1a1a1a`), subtle border (`1px solid rgba(255,255,255,0.06)`), generous padding (20-24px)
- Buttons: pill or rounded-rect, gold/cyan fill for primary, ghost/outline for secondary
- Section spacing: 80-120px vertical breathing room between major sections
- Icons: thin stroke weight, monoline style
- Transitions: smooth, 200-300ms ease, no jarring snaps

## Quality Checklist

Before delivering any design work, verify:

- [ ] Does the color palette match the locked tokens above?
- [ ] Does the typography use Fraunces + Space Mono correctly?
- [ ] Does the spacing feel generous and unhurried?
- [ ] Do dark surfaces have depth (layered, not flat black)?
- [ ] Would this feel at home next to Linear, Arc, or Amie?
- [ ] Is every interactive element touch-friendly (min 44px tap target)?
- [ ] Does color appear intentionally, not decoratively?

## Reference Image Folders

Organize your screenshots like this:

```
references/
  images/
    1bn-current/          ← Screenshots of YOUR best 1BN screens
      dream-screen.png
      trip-console.png
      pack-console.png
      landing-hero.png

    inspiration-dark/     ← Dark UI / premium SaaS references
      linear/
      arc-browser/
      amie/
      raycast/

    inspiration-travel/   ← Travel + lifestyle app references
      flighty/
      wanderlog/
      airbnb/

    inspiration-landing/  ← Marketing site / landing page references
      framer/
      raycast-site/
      linear-site/
      vercel-site/
```

## What to Screenshot on Mobbin & Elsewhere

When gathering references, capture these specific patterns:

- **Hero sections** — how they handle big type + imagery on dark backgrounds
- **Feature cards** — layout, icon treatment, description hierarchy
- **Navigation** — sidebar patterns, tab bars, mobile nav
- **Empty states** — how premium apps handle "nothing here yet"
- **Onboarding flows** — first-run experience, progressive disclosure
- **Settings / profile** — form layouts, toggle styles, account screens
- **Detail views** — how dense info is organized without clutter
- **CTAs** — button placement, copy, color usage for conversion moments
