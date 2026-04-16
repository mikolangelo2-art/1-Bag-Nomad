// src/screens/DreamScreen.jsx
// 1 Bag Nomad - Dream Input Screen
// Design System v2 - LOCKED April 15 2026
// Phase 2 - Full implementation

import { useEffect, useState } from "react";
import DatePickerInput from "../components/DatePickerInput";
import VisionReveal from "../components/VisionReveal";
import { runDreamExpeditionBuild } from "../utils/dreamVisionBuild";

const TRAVEL_STYLES = [
  { id: "cultural", label: "Cultural" },
  { id: "adventure", label: "Adventure" },
  { id: "culinary", label: "Culinary" },
  { id: "diving", label: "Diving" },
  { id: "wellness", label: "Wellness" },
  { id: "photography", label: "Photography" },
  { id: "surfing", label: "Surfing" },
  { id: "backpacking", label: "Backpacking" },
  { id: "luxury", label: "Luxury" },
  { id: "remote", label: "Off-Grid" },
];

const INTEREST_GROUPS = [
  {
    label: "Nature & Outdoors",
    items: ["Beaches", "Mountains", "Jungle", "Desert", "Wildlife", "National Parks"],
  },
  {
    label: "Culture & History",
    items: ["Temples", "Museums", "Architecture", "Local Markets", "Ancient Ruins"],
  },
  {
    label: "Food & Drink",
    items: ["Street Food", "Fine Dining", "Wine", "Coffee Culture", "Cooking Classes"],
  },
  {
    label: "Adventure & Sport",
    items: ["Scuba Diving", "Surfing", "Trekking", "Rock Climbing", "Cycling"],
  },
];

function addDaysToIso(iso, days) {
  if (!iso || !Number.isFinite(days)) return "";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Only derive return date when departure looks like YYYY-MM-DD (avoids breaking free-text dates). */
function computeReturnDate(departureStr, nights) {
  const t = (departureStr || "").trim();
  if (!t || !/^\d{4}-\d{2}-\d{2}/.test(t)) return "";
  return addDaysToIso(t.slice(0, 10), nights);
}

function parseBudget(s) {
  const t = (s || "").trim();
  if (!t || /no limit/i.test(t)) return { mode: "dream", amount: "" };
  const m = t.replace(/,/g, "").match(/(\d+)/);
  if (m) return { mode: "strict", amount: m[1] };
  return { mode: "dream", amount: "" };
}

export default function DreamScreen({ onGoGen, onLoadDemo, prefilledVision = "", onBackToWelcome }) {
  const [vision, setVision] = useState(prefilledVision || "");
  const [journeyName, setJourneyName] = useState("");
  const [travelerType, setTravelerType] = useState("solo");
  const [openPill, setOpenPill] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [departureDate, setDepartureDate] = useState("");
  /** YYYY-MM-DD from calendar; free-text window stays in `departureDate`. */
  const [departureIso, setDepartureIso] = useState("");
  const [duration, setDuration] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [revealPayload, setRevealPayload] = useState(null);

  useEffect(() => {
    if (prefilledVision) setVision(prefilledVision);
  }, [prefilledVision]);

  const canBuild = vision.trim().length > 20;

  function togglePill(id) {
    setOpenPill((prev) => (prev === id ? null : id));
  }

  function toggleInterest(item) {
    setSelectedInterests((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }

  async function handleBuild() {
    if (!canBuild || loading) return;
    setLoading(true);
    setLoadError("");
    const { mode, amount } = parseBudget(budget);
    const travelStyleLabel = TRAVEL_STYLES.find((s) => s.id === selectedStyle)?.label || "";
    const nights = parseInt(duration, 10) || 14;
    const effectiveDeparture = departureIso || departureDate || "";
    const returnDate = computeReturnDate(departureIso || departureDate, nights);
    try {
      const result = await runDreamExpeditionBuild({
        vision: vision.trim(),
        tripName: journeyName || "My Expedition",
        city: "",
        date: effectiveDeparture,
        returnDate,
        budgetMode: mode,
        budgetAmount: amount,
        travelerGroup: travelerType,
        travelStyle: travelStyleLabel,
        interests: selectedInterests,
        specialtyInterests: [],
        selectedGoal: selectedStyle || "custom",
      });
      if (result.ok) {
        setRevealPayload({
          visionData: result.parsed,
          selectedGoal: selectedStyle || "custom",
          vision: vision.trim(),
          tripName: result.appPayload.tripName,
          city: result.appPayload.city || "",
          date: result.appPayload.date || "",
          returnDate: result.appPayload.returnDate || "",
          budgetMode: result.appPayload.budgetMode,
          budgetAmount: result.appPayload.budgetAmount,
          travelerProfile: result.appPayload.travelerProfile,
        });
      } else {
        setLoadError(result.error || "Could not build expedition.");
      }
    } catch (e) {
      setLoadError(e?.message || "Something went wrong.");
    }
    setLoading(false);
  }

  const triggerPillStyle = (id) => ({
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${openPill === id ? "rgba(201,160,76,0.4)" : "rgba(255,255,255,0.10)"}`,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
  });

  const triggerLabelStyle = {
    fontFamily: "Instrument Sans, sans-serif",
    fontWeight: 500,
    fontSize: 14,
    color: "rgba(232,220,200,0.75)",
  };

  const chevronStyle = (id) => ({
    fontSize: 12,
    color: "rgba(232,220,200,0.4)",
    transform: openPill === id ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.3s ease",
  });

  if (revealPayload) {
    return (
      <VisionReveal
        data={revealPayload}
        freshMount={true}
        onBuild={(vd) => {
          onGoGen(revealPayload, vd);
          setRevealPayload(null);
        }}
        onBack={() => {
          setRevealPayload(null);
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0705",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "40%",
          background: "radial-gradient(ellipse at 50% 0%, rgba(169,70,29,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          opacity: 0.08,
          mixBlendMode: "overlay",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 480,
          margin: "0 auto",
          padding: "24px 20px 120px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {typeof onBackToWelcome === "function" && (
          <button
            type="button"
            onClick={() => onBackToWelcome()}
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: "none",
              padding: "8px 0",
              cursor: "pointer",
              fontFamily: "Instrument Sans, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(201,160,76,0.72)",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            {"\u2190 Back to welcome"}
          </button>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid rgba(201,160,76,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 16, color: "#C9A04C" }}>{"\u2708"}</span>
          </div>
          <div
            style={{
              fontFamily: "Instrument Sans, sans-serif",
              fontWeight: 400,
              fontSize: 13,
              color: "rgba(232,220,200,0.55)",
              letterSpacing: "0.2px",
            }}
          >
            Your expedition starts now.
          </div>
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 22,
              color: "#C9A04C",
              lineHeight: 1.1,
            }}
          >
            {"Let's go."}
          </div>
        </div>

        {/* Vision textarea */}
        <div
          style={{
            border: "1px solid rgba(201,160,76,0.35)",
            borderLeft: "2px solid rgba(201,160,76,0.6)",
            borderRadius: 14,
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Describe your journey..."
            style={{
              minHeight: 140,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "Fraunces, serif",
              fontWeight: 300,
              fontStyle: vision ? "normal" : "italic",
              fontSize: 15,
              color: "#E8DCC8",
              lineHeight: 1.65,
              caretColor: "#C9A04C",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontFamily: "Instrument Sans, sans-serif",
              fontWeight: 600,
              fontSize: 11,
              color: "rgba(232,220,200,0.5)",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            Journey Name
          </div>
          <input
            value={journeyName}
            onChange={(e) => setJourneyName(e.target.value)}
            placeholder="e.g. The Japanese Feast"
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(122,111,93,0.5)",
              outline: "none",
              fontFamily: "Instrument Sans, sans-serif",
              fontWeight: 400,
              fontSize: 14,
              color: "#E8DCC8",
              padding: "8px 0",
              caretColor: "#C9A04C",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {["solo", "couple"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTravelerType(type)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 14,
                background: travelerType === type ? "rgba(201,160,76,0.10)" : "transparent",
                border: `1px solid ${travelerType === type ? "#C9A04C" : "#7A6F5D"}`,
                color: travelerType === type ? "#C9A04C" : "rgba(232,220,200,0.6)",
                fontFamily: "Instrument Sans, sans-serif",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.2s ease",
                textTransform: "capitalize",
              }}
            >
              {travelerType === type && <span style={{ fontSize: 11 }}>{"\u2713"}</span>}
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <button type="button" onClick={() => togglePill("style")} style={triggerPillStyle("style")}>
              <span style={triggerLabelStyle}>
                {selectedStyle
                  ? `Travel Style \u00B7 ${TRAVEL_STYLES.find((s) => s.id === selectedStyle)?.label || selectedStyle}`
                  : "Travel Style"}
              </span>
              <span style={chevronStyle("style")}>{"\u25BE"}</span>
            </button>
            {openPill === "style" && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "12px 4px",
                  animation: "fadeUp 0.25s ease",
                }}
              >
                {TRAVEL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStyle(s.id)}
                    style={{
                      height: 36,
                      padding: "0 14px",
                      borderRadius: 20,
                      background: selectedStyle === s.id ? "rgba(201,160,76,0.12)" : "transparent",
                      border: `1px solid ${selectedStyle === s.id ? "#C9A04C" : "rgba(255,255,255,0.15)"}`,
                      color: selectedStyle === s.id ? "#C9A04C" : "rgba(232,220,200,0.7)",
                      fontFamily: "Instrument Sans, sans-serif",
                      fontWeight: 500,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <button type="button" onClick={() => togglePill("interests")} style={triggerPillStyle("interests")}>
              <span style={triggerLabelStyle}>
                {selectedInterests.length > 0
                  ? `Interests \u00B7 ${selectedInterests.length} selected`
                  : "Interests"}
              </span>
              <span style={chevronStyle("interests")}>{"\u25BE"}</span>
            </button>
            {openPill === "interests" && (
              <div
                style={{
                  marginTop: 8,
                  padding: "12px 4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  animation: "fadeUp 0.25s ease",
                }}
              >
                {INTEREST_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div
                      style={{
                        fontFamily: "Fraunces, serif",
                        fontWeight: 300,
                        fontSize: 13,
                        color: "rgba(232,220,200,0.5)",
                        marginBottom: 10,
                        letterSpacing: "0.3px",
                      }}
                    >
                      {group.label}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {group.items.map((item) => {
                        const selected = selectedInterests.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleInterest(item)}
                            style={{
                              height: 36,
                              padding: "0 14px",
                              borderRadius: 20,
                              background: selected ? "rgba(201,160,76,0.12)" : "transparent",
                              border: `1px solid ${selected ? "#C9A04C" : "rgba(255,255,255,0.15)"}`,
                              color: selected ? "#C9A04C" : "rgba(232,220,200,0.6)",
                              fontFamily: "Instrument Sans, sans-serif",
                              fontWeight: 500,
                              fontSize: 13,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <button type="button" onClick={() => togglePill("dates")} style={triggerPillStyle("dates")}>
              <span style={triggerLabelStyle}>
                {departureIso || departureDate || duration
                  ? [
                      departureIso || departureDate,
                      duration ? `${duration} nights` : null,
                    ]
                      .filter(Boolean)
                      .join(" \u00B7 ")
                  : "Dates & Budget"}
              </span>
              <span style={chevronStyle("dates")}>{"\u25BE"}</span>
            </button>
            {openPill === "dates" && (
              <div
                style={{
                  marginTop: 8,
                  padding: "16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  animation: "fadeUp 0.25s ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      fontFamily: "Instrument Sans, sans-serif",
                      fontWeight: 600,
                      fontSize: 11,
                      color: "rgba(232,220,200,0.45)",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    WHEN ARE YOU THINKING?
                  </div>
                  <input
                    type="text"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    placeholder="e.g. September 2026 or Sep 16, 2026"
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(122,111,93,0.4)",
                      outline: "none",
                      fontFamily: "Instrument Sans, sans-serif",
                      fontWeight: 400,
                      fontSize: 14,
                      color: "#E8DCC8",
                      padding: "6px 0",
                      caretColor: "#C9A04C",
                      colorScheme: "dark",
                    }}
                  />
                  <div style={{ marginTop: 4, width: "100%" }}>
                    <div
                      style={{
                        fontFamily: "Instrument Sans, sans-serif",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "rgba(232,220,200,0.35)",
                        marginBottom: 6,
                        letterSpacing: "0.3px",
                      }}
                    >
                      Or pick a date
                    </div>
                    <DatePickerInput
                      value={departureIso}
                      onChange={setDepartureIso}
                      aria-label="Departure date"
                      style={{
                        width: "100%",
                        minHeight: 44,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(122,111,93,0.45)",
                        borderRadius: 10,
                        fontFamily: "Instrument Sans, sans-serif",
                        fontWeight: 400,
                        fontSize: 14,
                        color: "#E8DCC8",
                        padding: "10px 42px 10px 12px",
                        caretColor: "#C9A04C",
                      }}
                      buttonStyle={{
                        border: "1px solid rgba(201,160,76,0.4)",
                        background: "rgba(201,160,76,0.12)",
                        borderRadius: 8,
                      }}
                    />
                  </div>
                </div>
                {[
                  {
                    label: "HOW LONG? (NIGHTS)",
                    value: duration,
                    setter: setDuration,
                    type: "number",
                    placeholder: "e.g. 21",
                  },
                  {
                    label: "BUDGET",
                    value: budget,
                    setter: setBudget,
                    type: "text",
                    placeholder: "e.g. $5,000 \u00B7 No limit \u00B7 Dream big",
                  },
                ].map((field) => (
                  <div key={field.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        fontFamily: "Instrument Sans, sans-serif",
                        fontWeight: 600,
                        fontSize: 11,
                        color: "rgba(232,220,200,0.45)",
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      {field.label}
                    </div>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      placeholder={field.placeholder}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(122,111,93,0.4)",
                        outline: "none",
                        fontFamily: "Instrument Sans, sans-serif",
                        fontWeight: 400,
                        fontSize: 14,
                        color: "#E8DCC8",
                        padding: "6px 0",
                        caretColor: "#C9A04C",
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {typeof onLoadDemo === "function" && (
          <button
            type="button"
            onClick={onLoadDemo}
            style={{
              marginTop: 8,
              background: "none",
              border: "1px solid rgba(201,160,76,0.2)",
              borderRadius: 10,
              color: "rgba(201,160,76,0.55)",
              fontSize: 13,
              padding: "10px 16px",
              cursor: "pointer",
              fontFamily: "Instrument Sans, sans-serif",
              width: "100%",
              minHeight: 44,
            }}
          >
            Load demo expedition
          </button>
        )}

        {loadError && (
          <div
            role="alert"
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(201,160,76,0.25)",
              fontFamily: "Instrument Sans, sans-serif",
              fontSize: 13,
              color: "rgba(232,220,200,0.85)",
              lineHeight: 1.45,
            }}
          >
            {loadError}
          </div>
        )}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 20px",
          background: "linear-gradient(to top, #0A0705 60%, transparent)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={handleBuild}
          disabled={!canBuild || loading}
          style={{
            width: "100%",
            height: 52,
            background: canBuild ? "#C9A04C" : "rgba(201,160,76,0.35)",
            color: "#0A0705",
            border: "none",
            borderRadius: 14,
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "1px",
            textTransform: "uppercase",
            cursor: canBuild ? "pointer" : "not-allowed",
            transition: "background 0.2s ease, transform 0.1s ease",
          }}
          onMouseDown={(e) => {
            if (canBuild) e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {loading ? "Building..." : "Build My Expedition"}
        </button>
      </div>
    </div>
  );
}
