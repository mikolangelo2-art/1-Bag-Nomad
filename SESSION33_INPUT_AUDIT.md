# Session 33 - Input field bug audit

**Date:** April 7, 2026. **Scope:** Segment workspace + secondary sweep.

## Pass 1 inventory (anti-patterns)

### 1. Click bubbling
- `SegmentRow.jsx` ~L75: row `div` toggles expand; badge uses `stopPropagation`; ProgDots inert (clicks bubble to row).
- `BottomSheet.jsx`: inner panel uses `stopPropagation`; OK for inputs in sheet.
- `SegmentWorkspace.jsx`: tabs are buttons; tab content is not inside their click target. Residual: wrap SDF/CityInput with stopPropagation on controls (done in Pass 2).

### 2. Form auto-submit
- No `<form>` / `onSubmit` in `src/` (grep). Pass 2: `type="button"` on SegmentWorkspace buttons.

### 3. Uncontrolled to controlled
- `SDF` / `CityInput` could receive `undefined` from legacy storage. Pass 2: `value ?? ""`.

### 4. Map keys
- Stay suggestions and activity suggestions used index keys; calendar rows used index. Pass 2: composite keys.

### 5. Shared state
- `nAct` and segment `det` updates look correct. No change.

### 6. Global keydown
- **None** on `document`/`window` in `src/`. Resize + custom events only.

### 7. Input in button/link
- Workspace: no nested inputs in buttons. No change.

### 8. Auto-focus steal
- **SDF** used delayed `scrollIntoView` on every focus. Pass 2: removed.

### Secondary
- CoArchitect, VisionReveal, SegmentRow ask, PackConsole, App: local `onKeyDown` Enter handlers only.

---

## Pass 2 fixes (implemented)

1. **#6** - Documented only; no code.
2. **#1, #3, #8** - `SDF.jsx`, `CityInput.jsx`.
3. **#2** - `SegmentWorkspace.jsx` buttons `type="button"`.
4. **#4** - `SegmentWorkspace.jsx` list keys.
5. **#5, #7** - Skipped.
