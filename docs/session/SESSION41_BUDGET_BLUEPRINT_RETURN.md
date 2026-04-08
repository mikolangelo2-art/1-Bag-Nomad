# Session 41 — Return phase vs Budget Blueprint (inspection only)

**Date:** April 2026  
**Scope:** No product change in S41 — decision deferred to S42+.

## Question

Should the **Return** leg appear as its own row/line item in Trip Console budget views, or is that redundant with the **Flights** line in `budgetBreakdown`?

## Findings

### ? BLUEPRINT tab (`MissionConsole.jsx`, `tab==="blueprint"`)

- Renders **? BUDGET BLUEPRINT** from `tripData.budgetBreakdown` only: Flights, Accommodation, Food, Transport, Activities, Buffer (plus notes and total).
- **There is no per-phase list** here. The Return phase does **not** appear as a separate blueprint row.
- **Intentional:** this surface is a **category rollup** aligned to the handoff breakdown, not a phase itinerary.

### Mobile expedition ? BLUEPRINT accordion

- Same structure: `budgetBreakdown` categories only — **no Return phase row**.

### Where Return *does* show

1. **EXPEDITION tab** — `returnPhase` is rendered as a **`PhaseCard`** after `segPhases` (return flight / homebound card). This is **itinerary structure**, not the category breakdown.
2. **BUDGET tab** — `flatPhases.map` includes **all** `tripData.phases`, including `type === "Return"`, so Return can appear as a **phase row** with allocation % vs that phase’s cap.

### What Flights already covers

- `budgetBreakdown.flights` + `flightsNote` are meant to capture **round-trip / main air** spend (including return routing in prose), not duplicate every phase.

## Conclusion

- **Blueprint tab:** Return is **not** duplicated there; categories are the source of truth.
- **Budget tab phase list:** Return **can** appear as a phase row because it uses flat phases. That may feel redundant next to **Flights** if the return cost is only in the flights bucket — **product call** whether to filter Return out of the Budget tab list or relabel.

**Recommendation for S42:** Decide explicitly: (a) hide Return from Budget tab rows, (b) keep it but add helper copy (“homebound — often included in Flights total”), or (c) split return cost into the Return phase budget in data. No code shipped in S41.
