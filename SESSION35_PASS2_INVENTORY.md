# Session 35 - Pass 2 input audit inventory

**Sprint Day 11 - April 7, 2026**  
Scope: `SegmentRow.jsx`, `MissionConsole.jsx`, `CoArchitect.jsx`, `DreamScreen.jsx`  
Reference: Session 33 eight anti-patterns plus **#9** numeric parsing (`type="number"` plus `parseInt`/`parseFloat` in `onChange`, NaN loops, stepper quirks).

---

## 1. `src/components/SegmentRow.jsx` (ask strip)

| # | Pattern | Finding | Resolution |
|---|---------|---------|------------|
| 1 | Click bubbling | Ask `<input>` had no `onClick` stop; taps could bubble to row/parent handlers. | `onClick` calls `stopPropagation` on ask input. |
| 2 | Enter / submit | Enter runs `sendAsk()` only; no `<form>` parent in tree; low risk. | `preventDefault` on Enter before `sendAsk`. |
| 9 | Numeric parsing | No cost/number fields in this strip. | N/A |

**Grep notes:** `parseFloat` only in display reduce for activity costs (read-only).

---

## 2. `src/components/MissionConsole.jsx` (departure field)

| # | Pattern | Finding | Resolution |
|---|---------|---------|------------|
| 1 | Click bubbling | Inline departure `<input>` lacked `stopPropagation`. | Added `stopPropagation` on departure input. |
| 8 | Focus | `useEffect` focuses dep input when `editingDep` is intentional. | No change. |
| (sync) | Value sync | Escape closed editor but left stale text in `depInput`. | On Escape, reset `depInput` from `tripData` then close. |

**Grep notes:** `window.addEventListener` for `intelMapActive` uses cleanup (not ad-hoc global keydown on inputs).

---

## 3. `src/components/CoArchitect.jsx`

| # | Pattern | Finding | Resolution |
|---|---------|---------|------------|
| 1 | Click bubbling | Itinerary edit inputs and chat `<input>` could bubble. | `stopPropagation` on click. |
| 2 | Enter | Chat uses Enter to send; added `preventDefault` for edge cases. | `onKeyDown` Enter: `preventDefault` then `sendMsg`. |
| 9 | Numeric | Inline NIGHTS / COST used `type="number"` with `parseInt(...)||1` for both fields; breaks decimals on cost and causes cursor/value jumps. | `type="text"`, `inputMode` numeric/decimal, regex-gated `onChange`, commit numbers on `blur`. |

---

## 4. `src/components/DreamScreen.jsx` (Pass 2 remainder)

| # | Pattern | Finding | Resolution |
|---|---------|---------|------------|
| 1 | Click bubbling | Vision `<textarea>`, journey name `<input>` lacked explicit stop (CityInput already stops). | `onClick` calls `stopPropagation`. |
| 9 | Numeric | Budget field uses `text` plus `inputMode="decimal"` plus regex (same pattern as SDF costs). | Commit: cost field numeric hotfix. |

**Out of scope (session brief):** Travel DEPART/ARRIVE dual-purpose fields; FROM jump; Plan my own blank screen.

---

## Shared fix (Task 1, all segment cost SDFs)

`SDF` with `type="number"` renders `type="text"` plus `inputMode="decimal"` plus `/^\d*\.?\d*$/` gating so Travel / Stay / Activities / Food / Misc cost fields stay string-at-keystroke and match stored segment JSON strings.
