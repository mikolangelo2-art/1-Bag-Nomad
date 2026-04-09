import posthog from "posthog-js";
import { Reveal } from "./Reveal.jsx";

const STAR = String.fromCodePoint(0x2726);
const buildUrl = () =>
  typeof window !== "undefined" ? `${window.location.origin}/?new=true` : "/?new=true";

function trackCta(location) {
  try {
    posthog.capture("landing_cta_clicked", { location });
  } catch {
    /* ignore */
  }
}

export function FinalCTASection() {
  return (
    <footer
      className="lp-section lp-final-cta"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 24px",
        background: "radial-gradient(ellipse 80% 50% at 50% 60%, rgba(169,70,29,0.06) 0%, transparent 60%), var(--lp-bg)",
      }}
    >
      <Reveal>
        <div className="lp-serif" style={{ fontSize: "clamp(2rem, 6vw, 3.25rem)", fontWeight: 900, color: "var(--lp-gold-bright)", letterSpacing: "0.06em", lineHeight: 1.15, marginBottom: 4 }}>
          DREAM BIG.
        </div>
      </Reveal>
      <Reveal delay={80}>
        <div className="lp-serif" style={{ fontSize: "clamp(1.75rem, 5vw, 2.75rem)", fontWeight: 100, fontStyle: "italic", color: "rgba(248,245,240,0.55)", marginBottom: 24 }}>
          travel light.
        </div>
      </Reveal>
      <Reveal delay={160}>
        <p className="lp-serif" style={{ fontSize: 16, fontWeight: 300, color: "rgba(248,245,240,0.5)", letterSpacing: "0.2em", marginBottom: 8, fontStyle: "italic" }}>
          Dream it. Build it. Plan it. Pack it. Live it.
        </p>
      </Reveal>
      <Reveal delay={220}>
        <p className="lp-serif" style={{ fontSize: 20, fontStyle: "italic", fontWeight: 300, color: "rgba(248,245,240,0.65)", marginBottom: 40 }}>
          Your expedition starts now.
        </p>
      </Reveal>
      <Reveal delay={280}>
        <a
          href={buildUrl()}
          className="lp-btn-gold lp-final-btn"
          style={{ padding: "18px 40px", borderRadius: 14, fontSize: 16, letterSpacing: "0.12em", minHeight: 58, marginBottom: 20 }}
          onClick={() => trackCta("footer")}
        >
          {`${STAR} BUILD MY EXPEDITION \u2014 IT'S FREE \u2192`}
        </a>
      </Reveal>
      <Reveal delay={340}>
        <p className="lp-sans" style={{ fontSize: 13, color: "rgba(248,245,240,0.35)", letterSpacing: "0.08em", marginBottom: 48 }}>
          {"No account required \u00B7 Free to build \u00B7 Patent Pending"}
        </p>
      </Reveal>
      <p className="lp-sans" style={{ fontSize: 13, color: "rgba(248,245,240,0.25)", letterSpacing: "0.06em" }}>
        {"\u00A9 2026 SHAREGOOD Co. \u00B7 1 Bag Nomad \u00B7 Dream Big. Travel Light."}
      </p>
    </footer>
  );
}
