// src/screens/DreamScreen.jsx
// 1 Bag Nomad - Dream Input Screen
// Design System v2 - LOCKED April 15 2026
// Phase 2 - Full implementation

import { useEffect, useState } from "react";
import DatePickerInput from "../components/DatePickerInput";
import VisionReveal from "../components/VisionReveal";
import BrandHeaderTier3 from "../components/BrandHeaderTier3";
import WorldMapBackground from "../components/WorldMapBackground";
import { runDreamExpeditionBuild } from "../utils/dreamVisionBuild";

const STORAGE_KEY = "1bn_dream_draft_v1";

const DREAM_VISION_PLACEHOLDER_DESKTOP =
  "Speak from the heart. Don't say where you want to go \u2014 say how you want to FEEL. The reefs you need to dive. The city you need to disappear into. The road that's been calling you. The version of yourself you're chasing. The more passion you pour in, the more magic your co-architect returns.";

const DREAM_VISION_PLACEHOLDER_MOBILE =
  "Speak from the heart. Don't say where you want to go \u2014 say how you want to FEEL. The more passion you pour in, the more magic your co-architect returns.";

const TRAVEL_STYLES = [
  { id: "cultural", label: "Cultural" },
  { id: "adventure", label: "Adventure" },
  { id: "wellness", label: "Wellness" },
  { id: "luxury", label: "Luxury" },
  { id: "backpacking", label: "Backpacking" },
  { id: "offgrid", label: "Off-Grid" },
  { id: "wanderer", label: "Wanderer" },
];

const INTEREST_GROUPS = [
  {
    label: "Nature & Outdoors",
    items: ["Beaches", "Mountains", "Jungle", "Wildlife", "Safari"],
  },
  {
    label: "Culture & History",
    items: ["Temples", "Museums", "Local Markets", "Ancient Ruins", "Festivals"],
  },
  {
    label: "Food & Drink",
    items: ["Street Food", "Fine Dining", "Wine", "Cooking Classes"],
  },
  {
    label: "Adventure & Sport",
    items: ["Scuba Diving", "Surfing", "Trekking", "Climbing", "Cycling", "Sailing"],
  },
  {
    label: "Wellness & Spiritual",
    items: ["Yoga", "Meditation", "Retreats", "Sacred Sites"],
  },
  {
    label: "Creative & Arts",
    items: ["Photography", "Music", "Galleries", "Live Performance"],
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
  const [departureIso, setDepartureIso] = useState("");
  const [dateMode, setDateMode] = useState("specific");
  const [returnDateIso, setReturnDateIso] = useState("");
  const [duration, setDuration] = useState("");
  const [budget, setBudget] = useState("");
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [revealPayload, setRevealPayload] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (prefilledVision) setVision(prefilledVision);
  }, [prefilledVision]);

  /* Draft restore: single mount read from localStorage (Session 58) */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.vision && !prefilledVision) setVision(saved.vision);
        if (saved.journeyName) setJourneyName(saved.journeyName);
        if (saved.travelerType) setTravelerType(saved.travelerType);
        if (saved.selectedStyle) {
          if (saved.selectedStyle === "remote") setSelectedStyle("offgrid");
          else setSelectedStyle(saved.selectedStyle);
        }
        if (Array.isArray(saved.selectedInterests)) setSelectedInterests(saved.selectedInterests);
        if (saved.departureIso) setDepartureIso(saved.departureIso);
        if (saved.dateMode === "specific" || saved.dateMode === "duration" || saved.dateMode === "wandering") {
          setDateMode(saved.dateMode);
        }
        if (saved.returnDateIso) setReturnDateIso(saved.returnDateIso);
        if (saved.duration) setDuration(saved.duration);
        if (saved.budget) setBudget(saved.budget);
      }
    } catch {
      // Silent: corrupted storage ignored
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only; prefilledVision is initial-route snapshot
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const payload = {
          vision,
          journeyName,
          travelerType,
          selectedStyle,
          selectedInterests,
          departureIso,
          dateMode,
          returnDateIso,
          duration,
          budget,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Silent
      }
    }, 400);
    return () => clearTimeout(t);
  }, [vision, journeyName, travelerType, selectedStyle, selectedInterests, departureIso, dateMode, returnDateIso, duration, budget]);

  const canBuild = vision.trim().length > 20;

  function togglePill(id) {
    setOpenPill((prev) => (prev === id ? null : id));
  }

  function toggleInterest(item) {
    setSelectedInterests((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }

  function addCustomInterest() {
    const trimmed = customInterestInput.trim();
    if (trimmed && !selectedInterests.includes(trimmed)) {
      setSelectedInterests((prev) => [...prev, trimmed]);
      setCustomInterestInput("");
    }
  }

  async function handleBuild() {
    if (!canBuild || loading) return;
    setLoading(true);
    setLoadError("");
    const { mode, amount } = parseBudget(budget);
    const travelStyleLabel = TRAVEL_STYLES.find((s) => s.id === selectedStyle)?.label || "";
    const effectiveDeparture = departureIso || "";
    let returnDate = "";
    if (dateMode === "specific") {
      returnDate = returnDateIso || "";
    } else if (dateMode === "duration") {
      const nights = parseInt(duration, 10) || 14;
      returnDate = computeReturnDate(departureIso, nights);
    } else {
      returnDate = "";
    }
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
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Silent
        }
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
    } catch (err) {
      setLoadError(err?.message || "Something went wrong.");
    }
    setLoading(false);
  }

  const pillAccent = {
    style: "#5E8B8A",
    interests: "#C9A04C",
    dates: "#8B6F47",
  };

  const triggerPillStyle = (id) => {
    const acc = pillAccent[id] || "#C9A04C";
    const left = openPill === id ? acc : `${acc}60`;
    return {
      width: "100%",
      minHeight: 52,
      borderRadius: 16,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderLeft: `2px solid ${left}`,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 18px",
      cursor: "pointer",
      transition: "border-color 0.2s ease",
    };
  };

  const sectionLabelStyle = {
    fontFamily: "Instrument Sans, sans-serif",
    fontWeight: 600,
    fontSize: isDesktop ? 12 : 11,
    color: "rgba(201,160,76,0.85)",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  };

  const helperLabelStyle = {
    fontFamily: "Instrument Sans, sans-serif",
    fontWeight: 500,
    fontSize: isDesktop ? 12 : 11,
    color: "rgba(232,220,200,0.5)",
    marginBottom: 6,
    letterSpacing: "0.3px",
  };

  const interestCategoryHeaderStyle = {
    fontFamily: "Instrument Sans, sans-serif",
    fontWeight: 600,
    fontSize: isDesktop ? 15 : 13,
    color: "rgba(201,160,76,0.85)",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: 10,
  };

  const triggerLabelStyle = {
    fontFamily: "Instrument Sans, sans-serif",
    fontWeight: 500,
    fontSize: isDesktop ? 16 : 14,
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

  const contentMax = isDesktop ? 640 : 480;

  const datesPillSummary = (() => {
    const parts = [];
    if (departureIso) parts.push(departureIso);
    if (dateMode === "specific" && returnDateIso) parts.push(`\u2192 ${returnDateIso}`);
    if (dateMode === "duration" && duration) parts.push(`${duration} nights`);
    if (dateMode === "wandering") parts.push("Wandering");
    if (budget.trim()) parts.push(budget);
    return parts.length ? parts.join(" \u00B7 ") : null;
  })();

  const datePickerFieldStyle = {
    width: "100%",
    minHeight: 44,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(122,111,93,0.45)",
    borderRadius: 10,
    fontFamily: "Instrument Sans, sans-serif",
    fontWeight: 400,
    fontSize: isDesktop ? 15 : 14,
    color: "#E8DCC8",
    padding: "10px 42px 10px 12px",
    caretColor: "#C9A04C",
  };

  const datePickerButtonStyle = {
    border: "1px solid rgba(201,160,76,0.4)",
    background: "rgba(201,160,76,0.12)",
    borderRadius: 8,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0705",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes dream-textarea-breath {
          0%, 100% {
            box-shadow: 0 0 0 rgba(201,160,76,0);
          }
          50% {
            box-shadow: 0 0 24px rgba(201,160,76,0.18);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dream-textarea-wrapper {
            animation: none !important;
          }
        }
      `}</style>

      <WorldMapBackground dream={true} />

      <div
        style={{
          position: "fixed",
          top: "15%",
          left: 0,
          right: 0,
          height: "50%",
          background: "radial-gradient(ellipse at 50% 0%, rgba(169,70,29,0.18) 0%, transparent 70%)",
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

      <BrandHeaderTier3 sticky={true} shimmer={true} />

      {typeof onBackToWelcome === "function" && (
        <button
          type="button"
          onClick={() => onBackToWelcome()}
          style={{
            position: "fixed",
            top: isDesktop ? 196 : 136,
            left: isDesktop ? 32 : 16,
            zIndex: 50,
            background: "transparent",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: "Instrument Sans, sans-serif",
            fontSize: isDesktop ? 14 : 12,
            fontWeight: 500,
            color: "rgba(201,160,76,0.85)",
            opacity: isDesktop ? 0.75 : 0.4,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 4,
            minHeight: 44,
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = isDesktop ? "0.75" : "0.4";
          }}
        >
          {"\u2190 Back"}
        </button>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: contentMax,
          margin: "0 auto",
          padding: "24px 20px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: isDesktop ? 20 : 16,
            color: "rgba(201,160,76,0.85)",
            lineHeight: 1.4,
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          {"Describe your journey\u2026"}
        </div>

        {/* Vision textarea */}
        <div
          className="dream-textarea-wrapper"
          style={{
            border: "1px solid rgba(201,160,76,0.35)",
            borderLeft: "2px solid rgba(201,160,76,0.6)",
            borderRadius: 14,
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            animation: "dream-textarea-breath 2.8s ease-in-out infinite",
          }}
        >
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder={isDesktop ? DREAM_VISION_PLACEHOLDER_DESKTOP : DREAM_VISION_PLACEHOLDER_MOBILE}
            style={{
              width: "100%",
              display: "block",
              boxSizing: "border-box",
              minHeight: isDesktop ? 140 : 180,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "Fraunces, serif",
              fontWeight: 300,
              fontStyle: vision ? "normal" : "italic",
              fontSize: isDesktop ? 17 : 15,
              color: "#E8DCC8",
              lineHeight: 1.65,
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
                fontSize: isDesktop ? 15 : 14,
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
                      fontSize: isDesktop ? 15 : 13,
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
                    <div style={interestCategoryHeaderStyle}>{group.label}</div>
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
                              fontSize: isDesktop ? 15 : 13,
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
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontFamily: "Instrument Sans, sans-serif",
                      fontWeight: 600,
                      fontSize: isDesktop ? 12 : 11,
                      color: "rgba(201,160,76,0.85)",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Something else?
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={customInterestInput}
                      onChange={(e) => setCustomInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomInterest();
                        }
                      }}
                      placeholder="Add your own\u2026"
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(122,111,93,0.4)",
                        borderRadius: 10,
                        outline: "none",
                        fontFamily: "Instrument Sans, sans-serif",
                        fontWeight: 400,
                        fontSize: isDesktop ? 15 : 14,
                        color: "#E8DCC8",
                        padding: "10px 14px",
                        caretColor: "#C9A04C",
                      }}
                    />
                    <button
                      type="button"
                      onClick={addCustomInterest}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: customInterestInput.trim() ? "rgba(201,160,76,0.15)" : "transparent",
                        border: "1px solid rgba(201,160,76,0.4)",
                        color: "#C9A04C",
                        fontSize: 18,
                        fontWeight: 400,
                        cursor: customInterestInput.trim() ? "pointer" : "not-allowed",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {"\u002B"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <button type="button" onClick={() => togglePill("dates")} style={triggerPillStyle("dates")}>
              <span style={triggerLabelStyle}>
                {datesPillSummary || "Dates & Budget"}
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
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={sectionLabelStyle}>WHEN ARE YOU GOING?</div>
                  <div>
                    <div style={helperLabelStyle}>The day your expedition begins</div>
                    <DatePickerInput
                      value={departureIso}
                      onChange={setDepartureIso}
                      aria-label="Start date"
                      style={datePickerFieldStyle}
                      buttonStyle={datePickerButtonStyle}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { id: "specific", label: "Return date" },
                      { id: "duration", label: "Duration" },
                      { id: "wandering", label: "Wandering" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDateMode(mode.id)}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 12,
                          background: dateMode === mode.id ? "rgba(201,160,76,0.10)" : "transparent",
                          border: `1px solid ${dateMode === mode.id ? "#C9A04C" : "rgba(122,111,93,0.5)"}`,
                          color: dateMode === mode.id ? "#C9A04C" : "rgba(232,220,200,0.6)",
                          fontFamily: "Instrument Sans, sans-serif",
                          fontWeight: 500,
                          fontSize: isDesktop ? 14 : 13,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  {dateMode === "specific" && (
                    <div>
                      <div style={helperLabelStyle}>The day you return home</div>
                      <DatePickerInput
                        value={returnDateIso}
                        onChange={setReturnDateIso}
                        aria-label="Return date"
                        style={datePickerFieldStyle}
                        buttonStyle={datePickerButtonStyle}
                      />
                    </div>
                  )}
                  {dateMode === "duration" && (
                    <div>
                      <div style={helperLabelStyle}>How many nights?</div>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 21"
                        style={{
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid rgba(122,111,93,0.4)",
                          outline: "none",
                          fontFamily: "Instrument Sans, sans-serif",
                          fontWeight: 400,
                          fontSize: isDesktop ? 15 : 14,
                          color: "#E8DCC8",
                          padding: "6px 0",
                          caretColor: "#C9A04C",
                          colorScheme: "dark",
                        }}
                      />
                    </div>
                  )}
                  {dateMode === "wandering" && (
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "rgba(201,160,76,0.05)",
                        borderLeft: "2px solid rgba(201,160,76,0.4)",
                        borderRadius: 8,
                        fontFamily: "Fraunces, serif",
                        fontStyle: "italic",
                        fontWeight: 300,
                        fontSize: isDesktop ? 15 : 14,
                        color: "rgba(232,220,200,0.8)",
                        lineHeight: 1.5,
                      }}
                    >
                      {"No fixed return. Your co-architect will help you decide as you go."}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={sectionLabelStyle}>BUDGET</div>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. $5,000 \u00B7 No limit \u00B7 Dream big"
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(122,111,93,0.4)",
                      outline: "none",
                      fontFamily: "Instrument Sans, sans-serif",
                      fontWeight: 400,
                      fontSize: isDesktop ? 15 : 14,
                      color: "#E8DCC8",
                      padding: "6px 0",
                      caretColor: "#C9A04C",
                      colorScheme: "dark",
                    }}
                  />
                </div>
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

        <div style={{ marginTop: 16, width: "100%" }}>
          <button
            type="button"
            onClick={handleBuild}
            disabled={!canBuild || loading}
            style={{
              width: "100%",
              height: isDesktop ? 56 : 52,
              background:
                canBuild && !loading
                  ? "linear-gradient(180deg, #D4AE5C 0%, #C9A04C 55%, #A8842E 100%)"
                  : "rgba(201,160,76,0.35)",
              boxShadow:
                canBuild && !loading
                  ? "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.12), 0 4px 14px rgba(201,160,76,0.22), 0 1px 3px rgba(0,0,0,0.25)"
                  : "none",
              color: "#0A0705",
              border: "none",
              borderRadius: 14,
              fontFamily: "Instrument Sans, sans-serif",
              fontWeight: 600,
              fontSize: isDesktop ? 15 : 14,
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: canBuild && !loading ? "pointer" : "not-allowed",
              transition: "background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease",
            }}
            onMouseDown={(e) => {
              if (canBuild && !loading) e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {loading ? "Building..." : "Build My Expedition"}
          </button>
        </div>
      </div>
    </div>
  );
}
