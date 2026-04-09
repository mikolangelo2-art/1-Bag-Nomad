import { Reveal } from "./Reveal.jsx";

export function FounderSection() {
  return (
    <section className="lp-section lp-founder-section">
      <Reveal>
        <div>
          <h3 className="lp-serif" style={{ fontSize: "clamp(1.35rem, 3vw, 1.75rem)", fontWeight: 700, color: "var(--lp-gold-bright)", marginBottom: 20, lineHeight: 1.3 }}>
            Built by a traveler, for travelers.
          </h3>
          <p className="lp-sans" style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(248,245,240,0.75)", marginBottom: 16 }}>
            I planned my 180-night global expedition in a Google Sheets spreadsheet. Every leg, every budget line.
          </p>
          <p className="lp-sans" style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(248,245,240,0.75)", marginBottom: 16 }}>
            Then I thought: <em style={{ fontWeight: 400, color: "rgba(248,245,240,0.9)", fontStyle: "italic" }}>what if this existed as an app?</em>
          </p>
          <p className="lp-sans" style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(248,245,240,0.75)", marginBottom: 0 }}>
            <em style={{ fontStyle: "italic" }}>{"Six weeks later \u2014 patent pending."}</em>
          </p>
          <div className="lp-serif" style={{ fontSize: 16, fontStyle: "italic", color: "rgba(248,245,240,0.55)", marginTop: 24, lineHeight: 1.6 }}>
            Michael Angelo Holly II
            <br />
            Founder, SHAREGOOD Co.
          </div>
          <div
            className="lp-sans"
            style={{
              display: "inline-block",
              marginTop: 16,
              padding: "6px 16px",
              borderRadius: 20,
              border: "1px solid rgba(201,160,76,0.35)",
              background: "rgba(201,160,76,0.06)",
              fontSize: 13,
              letterSpacing: "0.1em",
              color: "rgba(201,160,76,0.8)",
            }}
          >
            {`${String.fromCodePoint(0x26a1)} Patent Pending \u00B7 USPTO #64/014,106`}
          </div>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className="lp-founder-visual" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 180, height: 180 }}>
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid rgba(201,160,76,0.12)",
              }}
            />
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 20,
                borderRadius: "50%",
                border: "1px solid rgba(201,160,76,0.2)",
              }}
            />
            <img
              src="/1bn-logo.png"
              alt="SHAREGOOD"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 70,
                opacity: 0.6,
              }}
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
