// src/screens/WelcomeScreen.jsx - STUB (Full implementation Phase 2)

export default function WelcomeScreen({ onBuild, onDemo }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0705",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 20px",
        gap: 32,
        position: "relative",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "1px solid rgba(201,160,76,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          color: "#C9A04C",
        }}
      >
        {"\u2708"}
      </div>

      <div
        style={{
          fontFamily: "Instrument Sans, sans-serif",
          fontWeight: 500,
          fontSize: 11,
          color: "rgba(232,220,200,0.6)",
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}
      >
        1 Bag Nomad
      </div>

      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontWeight: 300,
          fontSize: 28,
          color: "#E8DCC8",
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        Your first expedition
        <br />
        is waiting.
      </div>

      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontWeight: 300,
          fontStyle: "italic",
          fontSize: 15,
          color: "#C9A04C",
        }}
      >
        {"\u2726 Dream Big, Travel Light \u2726"}
      </div>

      <button
        type="button"
        onClick={onBuild}
        style={{
          width: "100%",
          maxWidth: 360,
          height: 52,
          background: "#C9A04C",
          color: "#0A0705",
          border: "none",
          borderRadius: 14,
          fontFamily: "Instrument Sans, sans-serif",
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: "1px",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Build My Expedition
      </button>

      <button
        type="button"
        onClick={onDemo}
        style={{
          background: "none",
          border: "none",
          color: "rgba(232,220,200,0.5)",
          fontFamily: "Instrument Sans, sans-serif",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {"or explore a demo expedition \u2192"}
      </button>

      <div
        style={{
          position: "absolute",
          bottom: 32,
          fontFamily: "Instrument Sans, sans-serif",
          fontWeight: 400,
          fontSize: 11,
          color: "rgba(232,220,200,0.5)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {"Freedom \u00B7 Independence \u00B7 Discovery"}
      </div>
    </div>
  );
}
