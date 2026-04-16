// src/screens/ProfileScreen.jsx - STUB (Phase 5)
import AppHeader from "../components/AppHeader";

export default function ProfileScreen({ onBack, onNewTrip, onSignOut }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0705", paddingBottom: 80 }}>
      <AppHeader mode="utility" title="Profile" onBack={onBack} />
      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <button
          type="button"
          onClick={onNewTrip}
          style={{
            width: "100%",
            height: 52,
            background: "transparent",
            border: "1px solid rgba(201,160,76,0.5)",
            borderRadius: 14,
            color: "#C9A04C",
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 500,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          + Start a New Expedition
        </button>
        <button
          type="button"
          onClick={onSignOut}
          style={{
            background: "none",
            border: "none",
            color: "rgba(232,220,200,0.4)",
            fontFamily: "Instrument Sans, sans-serif",
            fontSize: 13,
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          Sign Out
        </button>
        <div
          style={{
            fontFamily: "Instrument Sans, sans-serif",
            fontSize: 10,
            color: "rgba(232,220,200,0.2)",
            textAlign: "center",
            marginTop: 32,
            letterSpacing: "0.5px",
          }}
        >
          {"1 Bag Nomad \u00B7 SHAREGOOD Co. LLC"}
          <br />
          {"Patent pending \u00B7 USPTO #64/014,106"}
        </div>
      </div>
    </div>
  );
}
