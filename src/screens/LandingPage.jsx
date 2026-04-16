// src/screens/LandingPage.jsx
// 1 Bag Nomad - Landing Page (Trip Home)
// Design System v2 - LOCKED April 15 2026
// Phase 3 - Full visual implementation

import { useEffect, useState } from "react";

const CARD_CONFIG = [
  {
    id: "expedition",
    title: "My Expedition",
    screen: "console",
    gradient: "linear-gradient(135deg, rgba(201,160,76,0.08) 0%, rgba(10,7,5,0) 60%)",
    borderGlow: "rgba(201,160,76,0.20)",
  },
  {
    id: "pack",
    title: "My Pack",
    screen: "pack",
    gradient: "linear-gradient(135deg, rgba(30,15,5,0.6) 0%, rgba(10,7,5,0) 60%)",
    borderGlow: "rgba(201,160,76,0.15)",
  },
  {
    id: "maps",
    title: "Maps",
    screen: "maps",
    gradient: "linear-gradient(135deg, rgba(50,80,80,0.18) 0%, rgba(10,7,5,0) 60%)",
    borderGlow: "rgba(94,139,138,0.20)",
  },
  {
    id: "calendar",
    title: "Calendar",
    screen: "calendar",
    gradient: "linear-gradient(135deg, rgba(201,160,76,0.05) 0%, rgba(10,7,5,0) 60%)",
    borderGlow: "rgba(201,160,76,0.12)",
  },
];

const CARD_ICONS = {
  expedition: "\u2708",
  pack: "\u25FB",
  maps: "\u25CE",
  calendar: "\u25A6",
};

function getCardStat(id, tripData) {
  const phases = tripData?.phases || [];
  const totalNights = phases.reduce((s, p) => s + (p.nights || 0), 0);
  const destPhases = phases.filter((p) => p.type !== "Return");

  switch (id) {
    case "expedition": {
      const phaseCount = destPhases.length;
      return `${phaseCount} ${phaseCount === 1 ? "PHASE" : "PHASES"} \u00B7 ${totalNights} NIGHTS`;
    }
    case "pack": {
      return "VIEW PACK LIST";
    }
    case "maps": {
      const countries = [...new Set(destPhases.map((p) => p.country).filter(Boolean))];
      const pins = destPhases.length;
      return `${pins} DESTINATIONS \u00B7 ${countries.length} ${countries.length === 1 ? "COUNTRY" : "COUNTRIES"}`;
    }
    case "calendar": {
      const today = new Date();
      const next = destPhases.find((p) => p.arrival && new Date(p.arrival + "T12:00:00") >= today);
      if (next) {
        const city = next.name || next.destination || next.city || "";
        const dateStr = next.arrival
          ? new Date(next.arrival + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "";
        return city && dateStr
          ? `NEXT: ${city.toUpperCase()} \u00B7 ${dateStr.toUpperCase()}`
          : "VIEW TIMELINE";
      }
      return "VIEW TIMELINE";
    }
    default:
      return "";
  }
}

export default function LandingPage({ tripData, onNavigate }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const tripName = tripData?.tripName || tripData?.visionNarrative?.slice(0, 40) || "My Expedition";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0705",
        paddingBottom: 88,
        backgroundImage: `
        radial-gradient(circle, rgba(201,160,76,0.05) 1px, transparent 1px),
        linear-gradient(#0A0705, #0A0705)
      `,
        backgroundSize: "24px 24px, 100% 100%",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "35%",
          background: "radial-gradient(ellipse at 30% 0%, rgba(201,160,76,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 880,
          margin: "0 auto",
          padding: "0 20px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <div style={{ padding: "24px 0 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  fontFamily: "Fraunces, serif",
                  fontWeight: 400,
                  fontSize: 24,
                  color: "#E8DCC8",
                  lineHeight: 1.1,
                  letterSpacing: "-0.3px",
                }}
              >
                1 Bag Nomad
              </div>
              <div
                style={{
                  fontFamily: "Instrument Sans, sans-serif",
                  fontWeight: 500,
                  fontSize: 11,
                  color: "#5E8B8A",
                  letterSpacing: "1.8px",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Expedition Active
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("profile")}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(201,160,76,0.1)",
                border: "1px solid rgba(201,160,76,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 18,
                color: "#C9A04C",
                padding: 0,
              }}
            >
              {"\u25EF"}
            </button>
          </div>

          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontWeight: 300,
              fontStyle: "italic",
              fontSize: 15,
              color: "#C9A04C",
              marginTop: 8,
              lineHeight: 1.3,
            }}
          >
            {tripName}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CARD_CONFIG.map((card, i) => {
            const stat = getCardStat(card.id, tripData);
            return (
              <LandingCard
                key={card.id}
                card={card}
                stat={stat}
                icon={CARD_ICONS[card.id]}
                onNavigate={onNavigate}
                animDelay={i * 60}
                mounted={mounted}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LandingCard({ card, stat, icon, onNavigate, mounted }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onNavigate(card.screen)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        width: "100%",
        background: card.gradient,
        backgroundColor: "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? card.borderGlow : "rgba(201,160,76,0.12)"}`,
        borderRadius: 20,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease",
        transform: pressed ? "scale(0.98)" : hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.4)" : "0 4px 16px rgba(0,0,0,0.25)",
        opacity: mounted ? 1 : 0,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "rgba(201,160,76,0.08)",
          border: "1px solid rgba(201,160,76,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          color: "#C9A04C",
          flexShrink: 0,
          transition: "background 0.2s ease",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 400,
            fontSize: 19,
            color: "#E8DCC8",
            lineHeight: 1.2,
            marginBottom: 5,
          }}
        >
          {card.title}
        </div>
        <div
          style={{
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 600,
            fontSize: 11,
            color: "#5E8B8A",
            letterSpacing: "0.9px",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {stat}
        </div>
      </div>

      <div
        style={{
          color: "rgba(201,160,76,0.4)",
          fontSize: 16,
          flexShrink: 0,
          transform: hovered ? "translateX(2px)" : "translateX(0)",
          transition: "transform 0.2s ease",
        }}
      >
        {"\u203A"}
      </div>
    </button>
  );
}
