// src/screens/WelcomeScreen.jsx
// 1 Bag Nomad - Welcome Screen
// Design System v2 - LOCKED April 15 2026
// Phase 2 - Full implementation

import { useEffect, useState } from "react";

export default function WelcomeScreen({ onBuild, onDemo }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

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
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,160,76,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          opacity: 0.09,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          width: "100%",
          maxWidth: 360,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "1px solid rgba(201,160,76,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(201,160,76,0.04)",
          }}
        >
          <span style={{ fontSize: 32, color: "#C9A04C" }}>{"\u2708"}</span>
        </div>

        <div
          style={{
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 500,
            fontSize: 11,
            color: "rgba(232,220,200,0.55)",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          1 Bag Nomad
        </div>

        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 300,
            fontSize: 30,
            color: "#E8DCC8",
            textAlign: "center",
            lineHeight: 1.25,
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
            textAlign: "center",
          }}
        >
          {"\u2726 Dream Big, Travel Light \u2726"}
        </div>

        <button
          type="button"
          onClick={onBuild}
          style={{
            width: "100%",
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
            transition: "brightness 0.15s ease, transform 0.1s ease",
            marginTop: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = "brightness(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "brightness(1)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
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
            color: "rgba(232,220,200,0.45)",
            fontFamily: "Instrument Sans, sans-serif",
            fontSize: 14,
            cursor: "pointer",
            letterSpacing: "0.2px",
            marginBottom: 72,
          }}
        >
          {"or explore a demo expedition \u2192"}
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 400,
            fontSize: 11,
            color: "rgba(232,220,200,0.45)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {"Freedom \u00B7 Independence \u00B7 Discovery"}
        </div>
        <div
          style={{
            fontFamily: "Instrument Sans, sans-serif",
            fontSize: 10,
            color: "rgba(232,220,200,0.2)",
            textAlign: "center",
            letterSpacing: "0.3px",
          }}
        >
          {"Patent pending \u00B7 USPTO #64/014,106"}
        </div>
      </div>
    </div>
  );
}
