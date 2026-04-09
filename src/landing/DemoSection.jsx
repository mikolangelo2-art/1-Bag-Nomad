import { Reveal } from "./Reveal.jsx";

const STAR = String.fromCodePoint(0x2726);

export function DemoSection({ onPlay }) {
  return (
    <section className="lp-section" style={{ padding: "80px 24px", textAlign: "center", background: "#1a1a1a" }}>
      <Reveal>
        <p
          className="lp-sans"
          style={{
            fontSize: 12,
            letterSpacing: "0.28em",
            color: "rgba(201,160,76,0.75)",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          {`${STAR} SEE IT IN ACTION`}
        </p>
      </Reveal>
      <Reveal delay={100}>
        <button type="button" className="lp-demo-play" onClick={onPlay} aria-label="Play demo video">
          <span style={{ fontSize: 36, color: "#c9a04c", marginLeft: 6 }}>{"\u25B6"}</span>
        </button>
      </Reveal>
      <Reveal delay={200}>
        <p className="lp-serif" style={{ fontSize: 16, fontStyle: "italic", fontWeight: 300, color: "rgba(248,245,240,0.45)" }}>
          {"Demo coming soon \u2014 follow the journey"}
        </p>
      </Reveal>
    </section>
  );
}
