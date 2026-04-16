// src/screens/MapsScreen.jsx - STUB (Phase 5)
import AppHeader from "../components/AppHeader";

export default function MapsScreen({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0705", paddingBottom: 80 }}>
      <AppHeader mode="utility" title="Maps" onBack={onBack} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 124px)",
          fontFamily: "Fraunces, serif",
          fontWeight: 300,
          fontStyle: "italic",
          fontSize: 18,
          color: "rgba(232,220,200,0.4)",
          textAlign: "center",
          padding: "0 32px",
        }}
      >
        Generate your expedition
        <br />
        to see it here.
      </div>
    </div>
  );
}
