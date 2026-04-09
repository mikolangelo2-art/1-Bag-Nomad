import { Reveal } from "./Reveal.jsx";

export function PromiseSection() {
  return (
    <section
      className="lp-section"
      style={{
        background: "var(--lp-bg)",
        padding: "60px 24px",
        textAlign: "center",
        borderTop: "1px solid rgba(201,160,76,0.12)",
        borderBottom: "1px solid rgba(201,160,76,0.12)",
      }}
    >
      <Reveal>
        <p
          className="lp-serif"
          style={{
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: "0.35em",
            color: "rgba(248,245,240,0.4)",
            textTransform: "uppercase",
            marginBottom: 16,
            fontStyle: "normal",
          }}
        >
          The 1 Bag Nomad Promise
        </p>
      </Reveal>
      <Reveal delay={120}>
        <h2
          className="lp-serif"
          style={{
            fontSize: "clamp(22px, 4vw, 38px)",
            fontWeight: 300,
            color: "rgba(248,245,240,0.92)",
            letterSpacing: "0.06em",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Dream it. Build it. Plan it.
          <br />
          Pack it. <span style={{ color: "var(--lp-gold-bright)", fontStyle: "italic" }}>Live it.</span>
        </h2>
      </Reveal>
    </section>
  );
}
