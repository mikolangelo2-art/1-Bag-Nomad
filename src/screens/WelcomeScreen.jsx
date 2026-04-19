// src/screens/WelcomeScreen.jsx
// 1 Bag Nomad — Welcome Screen
// Phase 3A Polish · Session 54H · Sprint Day 22 · April 19, 2026
// DS v2.1 §7b Tier 3 Brand Header + DS v2.2 "Emotional CTA via Brand Mark"
// See: vault/WelcomeLogoButton_Spec.md

import { useEffect, useState } from "react";
import BrandHeaderTier3 from "../components/BrandHeaderTier3";
import { SharegoodLogo } from "../components/SharegoodLogo";

export default function WelcomeScreen({ onBuild, onDemo }) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [demoHover, setDemoHover] = useState(false);
  const [logoPressed, setLogoPressed] = useState(false);
  const [logoFocus, setLogoFocus] = useState(false);

  useEffect(() => {
    const tMount = setTimeout(() => setMounted(true), 60);

    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      clearTimeout(tMount);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  function handleLogoTap() {
    if (celebrating) return; // debounce double-taps
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      onBuild();
      return;
    }

    setCelebrating(true);
    setTimeout(() => {
      onBuild();
    }, 600);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0705",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Atmospheric radial glow — repositioned to ~55% to follow new content centroid */}
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,160,76,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Film grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          opacity: 0.09,
          mixBlendMode: "overlay",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Tier 3 Brand Header — the crown */}
      <div style={{ width: "100%", zIndex: 2, position: "relative" }}>
        <BrandHeaderTier3 />
      </div>

      {/* Main content — flex:1 fills remaining vertical space, contents centered */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
          position: "relative",
          zIndex: 1,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        {/* Hero */}
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 300,
            fontSize: isMobile ? 28 : 34,
            color: "#E8DCC8",
            textAlign: "center",
            lineHeight: 1.25,
            marginBottom: isMobile ? 28 : 40,
          }}
        >
          Your first expedition
          <br />
          is waiting.
        </div>

        {/* Living Logo — the primary CTA */}
        <button
          type="button"
          onClick={handleLogoTap}
          aria-label="Begin your first expedition"
          onMouseDown={() => setLogoPressed(true)}
          onMouseUp={() => setLogoPressed(false)}
          onMouseLeave={() => setLogoPressed(false)}
          onFocus={() => setLogoFocus(true)}
          onBlur={() => setLogoFocus(false)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            outline: "none",
            boxShadow: logoFocus ? "0 0 0 2px rgba(201,160,76,0.6)" : "none",
            transform: logoPressed ? "scale(0.96)" : "scale(1)",
            transition: "transform 80ms ease, box-shadow 200ms ease",
          }}
        >
          <SharegoodLogo
            size={isMobile ? 180 : 220}
            animationState={celebrating ? "celebrating" : "idle"}
            animate={true}
          />
        </button>

        {/* "click to enter" whisper label */}
        <div
          style={{
            marginTop: 20,
            fontFamily: "Fraunces, serif",
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: isMobile ? 15 : 16,
            color: "rgba(232,220,200,0.55)",
            letterSpacing: "0.3px",
            textAlign: "center",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          click to enter
        </div>

        {/* Demo link — prominent verbal secondary CTA */}
        <button
          type="button"
          onClick={onDemo}
          onMouseEnter={() => setDemoHover(true)}
          onMouseLeave={() => setDemoHover(false)}
          style={{
            marginTop: 24,
            background: "none",
            border: "none",
            color: demoHover
              ? "rgba(232,220,200,0.95)"
              : "rgba(232,220,200,0.70)",
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 500,
            fontSize: isMobile ? 14 : 15,
            cursor: "pointer",
            letterSpacing: "0.2px",
            padding: "4px 0",
            borderBottom: demoHover
              ? "1px solid rgba(201,160,76,0.4)"
              : "1px solid transparent",
            transition: "color 0.3s ease, border-color 0.3s ease",
          }}
        >
          {"or explore a demo expedition \u2192"}
        </button>
      </main>

      {/* Brand creed footer — natural flow, always at viewport bottom */}
      <footer
        style={{
          padding: "0 20px 24px",
          display: "flex",
          justifyContent: "center",
          position: "relative",
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
      </footer>
    </div>
  );
}
