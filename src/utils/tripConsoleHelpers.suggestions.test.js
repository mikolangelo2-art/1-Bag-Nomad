import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSuggestionsTripId,
  flatPhaseIndexForSegment,
  findSuggestionForSegment,
  transportNotesFromSuggestion,
} from "./tripConsoleHelpers.js";

describe("getSuggestionsTripId", () => {
  it("returns tripName when set", () => {
    assert.equal(
      getSuggestionsTripId({ tripName: "  My Trip  ", phases: [{ id: 1 }] }),
      "My Trip"
    );
  });

  it("uses vision when tripName missing", () => {
    assert.equal(
      getSuggestionsTripId({ vision: "Around the world", phases: [{ id: 1 }] }),
      "Around the world"
    );
  });

  it("uses phase signature when no name or vision", () => {
    const id = getSuggestionsTripId({
      phases: [
        { id: 7, name: "Manaus Tour", type: "Exploration" },
        { id: 8, name: "Return", type: "Return" },
      ],
    });
    assert.ok(id.startsWith("1bn:"));
    assert.ok(id.includes("7:Manaus Tour"));
  });

  it("returns empty when no phases", () => {
    assert.equal(getSuggestionsTripId({ tripName: "X" }), "");
    assert.equal(getSuggestionsTripId(null), "");
  });
});

describe("flatPhaseIndexForSegment", () => {
  const phases = [
    { id: 1, name: "First" },
    { id: 2, name: "Second" },
  ];

  it("matches segment id with a suffix from toSegPhases", () => {
    assert.equal(flatPhaseIndexForSegment({ id: "2a" }, phases), 1);
  });

  it("matches raw phase id", () => {
    assert.equal(flatPhaseIndexForSegment({ id: "1" }, phases), 0);
  });

  it("returns -1 when unknown", () => {
    assert.equal(flatPhaseIndexForSegment({ id: "99a" }, phases), -1);
  });
});

describe("transportNotesFromSuggestion", () => {
  it("uses short leg notes when previous segment exists and route is multi-hop", () => {
    const n = transportNotesFromSuggestion(
      {
        route: "Home -> SPS -> La Ceiba -> Utila ferry",
        estimatedCost: "$400-500",
        notes: "Book early",
      },
      { prevCity: "Utila", homeCity: "Atlanta", segmentName: "Roatan" }
    );
    assert.ok(n.includes("Leg: Utila -> Roatan"));
    assert.ok(!n.includes("Home ->"));
    assert.ok(n.includes("Est."));
  });

  it("keeps full route for first leg (no previous segment)", () => {
    const r = "ATL -> SPS -> Utila";
    const n = transportNotesFromSuggestion(
      { route: r, estimatedCost: "$600" },
      { prevCity: "", homeCity: "Atlanta", segmentName: "Utila" }
    );
    assert.ok(n.includes(r));
  });
});

describe("findSuggestionForSegment", () => {
  const rows = [
    { phaseIndex: 0, phaseName: "Alpha", transport: { route: "A to B" } },
    { phaseIndex: 1, phaseName: "Wrong AI label", stay: { recommendation: "Hostel" } },
  ];

  it("prefers row at flat phase index", () => {
    const s = findSuggestionForSegment(rows, "Alpha", 1);
    assert.equal(s?.stay?.recommendation, "Hostel");
  });

  it("falls back to phaseName string match", () => {
    const s = findSuggestionForSegment(rows, "Alpha", -1);
    assert.equal(s?.transport?.route, "A to B");
  });
});
