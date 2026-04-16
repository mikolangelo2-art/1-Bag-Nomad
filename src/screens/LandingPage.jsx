// src/screens/LandingPage.jsx - STUB (Full visual implementation Phase 3)

export default function LandingPage({ tripData, onNavigate }) {
  const tripName = tripData?.tripName || "My Expedition";
  const phases = tripData?.phases || [];
  const totalNights = phases.reduce((s, p) => s + (p.nights || 0), 0);

  const cards = [
    {
      id: "expedition",
      title: "My Expedition",
      stat: `${phases.length} PHASES \u00B7 ${totalNights} NIGHTS`,
      screen: "console",
      icon: "\u2708",
    },
    { id: "pack", title: "My Pack", stat: "VIEW PACK LIST", screen: "pack", icon: "\u25FB" },
    { id: "maps", title: "Maps", stat: `${phases.length} DESTINATIONS`, screen: "maps", icon: "\u25CE" },
    { id: "calendar", title: "Calendar", stat: "VIEW TIMELINE", screen: "calendar", icon: "\u25A6" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0705", paddingBottom: 80 }}>
      <div style={{ padding: "20px 20px 12px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontWeight: 400, fontSize: 22, color: "#E8DCC8" }}>
          1 Bag Nomad
        </div>
        <div
          style={{
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 500,
            fontSize: 11,
            color: "#5E8B8A",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          Expedition Active
        </div>
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: 14,
            color: "#C9A04C",
            marginTop: 6,
          }}
        >
          {tripName}
        </div>
      </div>

      <div style={{ padding: "8px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onNavigate(card.screen)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(201,160,76,0.15)",
              borderRadius: 20,
              padding: 24,
              display: "flex",
              alignItems: "center",
              gap: 16,
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.2s ease, transform 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,160,76,0.25)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,160,76,0.15)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(201,160,76,0.08)",
                border: "1px solid rgba(201,160,76,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                color: "#C9A04C",
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "Fraunces, serif",
                  fontWeight: 400,
                  fontSize: 18,
                  color: "#E8DCC8",
                  lineHeight: 1.2,
                  marginBottom: 4,
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
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                {card.stat}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
