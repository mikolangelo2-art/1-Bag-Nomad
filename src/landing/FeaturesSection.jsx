import { Reveal } from "./Reveal.jsx";

const STAR = String.fromCodePoint(0x2726);

const FEATURES = [
  { icon: STAR, title: "Goal-first generation", body: "Your vision drives everything. Not a search form." },
  { icon: String.fromCodePoint(0x1f4b0), title: "Budget reality check", body: "Know exactly what's possible before you commit." },
  { icon: String.fromCodePoint(0x1f5fa), title: "Real expedition map", body: "Your route on a real map. Every phase, every stop." },
  { icon: String.fromCodePoint(0x1f392), title: "Trip-aware pack list", body: "Gear selected for YOUR trip. Climate. Activities. Duration." },
  { icon: STAR, title: "Co-Architect transparency", body: "See every decision. Every budget allocation. Every routing choice." },
  { icon: String.fromCodePoint(0x1f517), title: "Expedition Linking", body: "Build once. Invite friends. Everyone gets their own pack list." },
];

export function FeaturesSection() {
  return (
    <section className="lp-section lp-band-features">
      <Reveal variant="subtle">
        <p
          className="lp-sans"
          style={{
            fontSize: 11,
            letterSpacing: "0.35em",
            color: "rgba(201,160,76,0.75)",
            textAlign: "center",
            textTransform: "uppercase",
            margin: "0 0 clamp(2rem, 5vw, 2.75rem)",
          }}
        >
          What makes it different
        </p>
      </Reveal>
      <div className="lp-features-grid">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={60 + i * 70} variant="subtle">
            <div className="lp-card">
              <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
              <div className="lp-sans" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(248,245,240,0.9)", marginBottom: 8 }}>
                {f.title}
              </div>
              <p className="lp-sans" style={{ fontSize: 15, fontWeight: 400, color: "rgba(248,245,240,0.75)", lineHeight: 1.7, margin: 0 }}>
                {f.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
