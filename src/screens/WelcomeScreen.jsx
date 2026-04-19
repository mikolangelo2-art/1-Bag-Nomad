// src/screens/WelcomeScreen.jsx
// 1 Bag Nomad — Welcome Screen
// Phase 3A · Session 54H · Sprint Day 22 · April 19, 2026
// DS v2.1 §7b Tier 3 Brand Header + DS v2.2 Living Metal CTA (Welcome-exclusive)

import { useEffect, useState } from "react";
import BrandHeaderTier3 from "../components/BrandHeaderTier3";

export default function WelcomeScreen({ onBuild, onDemo }) {
  const [mounted, setMounted] = useState(false);
  const [breathing, setBreathing] = useState(false);

  useEffect(() => {
    const tMount = setTimeout(() => setMounted(true), 60);
    // Option B — button begins breathing 1.5s after fade-in settles
    const tBreath = setTimeout(() => setBreathing(true), 60 + 600 + 1500);
    return () => {
      clearTimeout(tMount);
      clearTimeout(tBreath);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0705",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Scoped keyframes for Living Metal breath */}
      <style>{`
        @keyframes wc-button-breath {
          0%, 100% {
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.15),
              inset 0 -1px 0 rgba(0,0,0,0.12),
              0 4px 14px rgba(201,160,76,0.22),
              0 1px 3px rgba(0,0,0,0.25);
          }
          50% {
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.15),
              inset 0 -1px 0 rgba(0,0,0,0.12),
              0 4px 20px rgba(201,160,76,0.34),
              0 1px 3px rgba(0,0,0,0.25);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .wc-build-button { animation: none !important; }
        }
      `}</style>

      {/* Atmospheric radial glow — unchanged */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,160,76,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Film grain — unchanged */}
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

      {/* Tier 3 Brand Header — the crown */}
      <div style={{ width: "100%", zIndex: 2, position: "relative" }}>
        <BrandHeaderTier3 />
      </div>

      {/* Centered hero + CTAs column */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          width: "100%",
          maxWidth: 360,
          padding: "0 20px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
          zIndex: 1,
        }}
      >
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

        {/* Living Metal CTA — antique gold gradient + breathing glow */}
        <button
          type="button"
          onClick={onBuild}
          className="wc-build-button"
          style={{
            width: "100%",
            height: 52,
            background:
              "linear-gradient(180deg, #D4AE5C 0%, #C9A04C 55%, #A8842E 100%)",
            color: "#0A0705",
            border: "none",
            borderRadius: 14,
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "1px",
            textTransform: "uppercase",
            cursor: "pointer",
            marginTop: 4,
            position: "relative",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.12), 0 4px 14px rgba(201,160,76,0.22), 0 1px 3px rgba(0,0,0,0.25)",
            animation: breathing
              ? "wc-button-breath 4s ease-in-out infinite"
              : "none",
            transition:
              "filter 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = "brightness(1.06)";
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
          onFocus={(e) => {
            e.currentTarget.style.outline = "2px solid rgba(201,160,76,0.6)";
            e.currentTarget.style.outlineOffset = "2px";
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = "none";
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
          }}
        >
          {"or explore a demo expedition \u2192"}
        </button>
      </div>

      {/* Brand creed footer — USPTO line removed */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
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
      </div>
    </div>
  );
}
