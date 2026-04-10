import posthog from "posthog-js";
import { Reveal } from "./Reveal.jsx";

const STAR = String.fromCodePoint(0x2726);
const buildUrl = () =>
  typeof window !== "undefined" ? `${window.location.origin}/?new=true` : "/?new=true";

function trackHeroCta() {
  try {
    posthog.capture("landing_cta_clicked", { location: "hero" });
  } catch {
    /* ignore */
  }
}

export function HeroSection({ onWatchDemo }) {
  return (
    <header className="lp-hero lp-section">
      <div className="lp-hero-glow" aria-hidden />
      <Reveal>
        <div className="lp-hero-logo-wrap">
          <img src="/1bn-logo.png" alt="1 Bag Nomad" className="lp-hero-logo" width={260} height={260} decoding="async" />
        </div>
      </Reveal>
      <div className="lp-glass lp-hero-copy">
        <Reveal delay={80}>
          <h1 className="lp-serif lp-hero-headline" style={{ fontSize: "clamp(1.35rem, 5vw, 2.6rem)", fontWeight: 700, marginBottom: "clamp(1.25rem, 4vw, 2rem)", lineHeight: 1.2 }}>
            <span style={{ color: "var(--lp-gold-bright)", fontWeight: 900 }}>DREAM BIG</span>
            <span className="lp-hero-sep" style={{ color: "rgba(248,245,240,0.15)", fontWeight: 100, margin: "0 12px" }}>
              |
            </span>
            <span style={{ fontWeight: 100, fontStyle: "italic", color: "rgba(248,245,240,0.92)", fontSize: "clamp(1.2rem, 4.5vw, 2.35rem)" }}>travel light</span>
          </h1>
        </Reveal>
        <Reveal delay={180}>
          <p
            className="lp-serif"
            style={{
              margin: "0 auto clamp(2rem, 6vw, 2.75rem)",
              maxWidth: 520,
              fontSize: "clamp(1.05rem, 2.4vw, 1.2rem)",
              fontWeight: 300,
              fontStyle: "italic",
              lineHeight: 1.95,
              letterSpacing: "0.02em",
              color: "rgba(248,245,240,0.62)",
            }}
          >
            {"1 Bag Nomad builds your expedition around what you want to feel \u2014 not just where you want to go."}
          </p>
        </Reveal>
        <Reveal delay={280}>
          <div className="lp-hero-buttons" style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" className="lp-btn-ghost" onClick={onWatchDemo}>
              {"\u25B6 WATCH THE DEMO"}
            </button>
            <a href={buildUrl()} className="lp-btn-gold lp-cta-sentence" onClick={trackHeroCta}>
              {`${STAR} Build your expedition \u2192`}
            </a>
          </div>
        </Reveal>
      </div>
      <div className="lp-scroll" aria-hidden>
        <span className="lp-scroll-label">SCROLL TO EXPLORE</span>
        <span className="lp-scroll-chevron" style={{ color: "var(--lp-gold-bright)", display: "flex", justifyContent: "center", marginTop: 6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </header>
  );
}
