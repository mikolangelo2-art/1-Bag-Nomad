# Segment tab layout — default reference (Trip Console)

This document is the **canonical layout contract** for the expedition segment workspace (`SegmentWorkspace.jsx`): Travel, Stay, Activities, Food, Budget, Calendar, Docs. It exists so future changes stay structurally consistent instead of mixing centered marketing blocks with left-aligned forms.

## Design system

- **Console:** Trip Console — cyan accents (`#00E5FF`), warm orange/gold for Co-Architect highlights (`#FF9F43`, `#FFD93D`), dark navy panels.
- **Typography:** Inter for UI labels and dense data; Fraunces for optional italic empty-state lines only.
- **Touch:** Primary actions ? 44px height where possible.

## Vertical section order (every tab)

Use the same **stack** so users learn one pattern:

1. **Loading** — single full-width row (spinner + short status), left-aligned text.
2. **Co-Architect / suggestion** — optional card(s) using shared `suggestionCardStyle` (see `tripConsoleHelpers.js`).
3. **Saved / confirmed summary** — bordered summary card when the user has already accepted data (transport, stay, etc.).
4. **Manual entry / edit** — grids of `SDF` fields, full width, **left-aligned** labels and inputs.
5. **Tab-level notes** — one multiline `SDF` at the bottom when the tab has freeform notes.

**Spacing:** Aim for **16px+** clear vertical gap between (2) and (4) when both are visible so the card does not visually merge with the form.

## Alignment rules

| Region | Alignment | Notes |
|--------|-----------|--------|
| Tab content panel | **Left** | Default `textAlign: left` on the outer tab container. |
| Suggestion cards | **Left** | Title, facts, disclaimer, and actions read top-to-bottom, start-aligned. |
| Forms (`SDF` grids) | **Left** | Already columnar; never inherit `textAlign: center` from a parent. |
| Budget tab rows | **Left** | Key facts and snapshot lines left; currency column right-aligned in its cell. |
| Empty / hero states | **Center (optional)** | Short italic prompts (“No transport planned yet”) may stay centered in a **narrow vertical band** only; avoid centering whole tab content. |
| Single CTAs in empty Docs | **Left** | Align under the section title so the flow matches other tabs. |

## Information hierarchy inside a suggestion card

1. **Eyebrow** — `? CO-ARCHITECT SUGGESTION` (or tab-specific variant), small caps, accent color.
2. **Primary headline** — one line (route, property strategy, activity name).
3. **Facts** — duration, type, structured lists (numbered or bordered rows) for multi-leg transport when we add them.
4. **Single primary estimate** — one prominent `Est. …` line (avoid duplicating the same number in multiple styles).
5. **Supporting copy** — timing, bullets, provider; normal body color.
6. **Narrative / tips** — italic or slightly muted, clearly “guidance” not “data”.
7. **Disclaimer** — `disclaimerStyle`, always last before actions.
8. **Actions** — primary + secondary in a horizontal flex row (`acceptBtnStyle` / `dismissBtnStyle`).

## Transport-specific (future-friendly)

- Prefer **numbered legs** (1. ATL ? GIG, 2. GIG ? MAO) when the API returns multiple segments; keep **mode** scoped per leg or one global mode with explicit “leg” rows.
- **Booking vs planned** is segment `status` in persistence, not inferred from UI alone.

## Calendar & Docs

- **Calendar (empty):** Centered hero is acceptable — it is not a data form.
- **Docs:** Section title + meta (segment name, nights) stay left; generate CTA aligns with that column.

## Files

- Implementation: `src/components/SegmentWorkspace.jsx`
- Shared card/disclaimer/button styles: `src/utils/tripConsoleHelpers.js`
- Field primitive: `src/components/SDF.jsx`

When in doubt, **left-align facts and forms**, reserve **center** for rare empty-state poetry only.
