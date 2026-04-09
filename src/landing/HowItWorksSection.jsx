import { Reveal } from "./Reveal.jsx";

const CONSOLES = [
  {
    key: "dream",
    label: `${String.fromCodePoint(0x1f30d)} DREAM`,
    labelColor: "var(--lp-gold)",
    title: "Your vision. Your expedition.",
    body: "Tell your co-architect what you want to feel. Set your budget. Watch your expedition get built around your vision in seconds.",
  },
  {
    key: "trip",
    label: `${String.fromCodePoint(0x1f535)} TRIP`,
    labelColor: "var(--lp-dream)",
    title: "Everything at a glance.",
    body: "Phases, budget, bookings, intel — your full expedition managed from dream to departure. The world map shows exactly where you're going.",
  },
  {
    key: "pack",
    label: `${String.fromCodePoint(0x1f392)} PACK`,
    labelColor: "var(--lp-gold)",
    title: "Travel light, for real.",
    body: "Your pack list built for your specific trip — climate, activities, duration. The co-architect knows what you need before you do.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="lp-section" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto", background: "var(--lp-bg)" }}>
      <Reveal>
        <p
          className="lp-sans"
          style={{
            fontSize: 11,
            letterSpacing: "0.35em",
            color: "rgba(201,160,76,0.75)",
            textAlign: "center",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          How it works
        </p>
      </Reveal>
      <Reveal delay={100}>
        <h2
          className="lp-serif"
          style={{
            textAlign: "center",
            fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
            fontWeight: 700,
            color: "var(--lp-gold-bright)",
            marginBottom: 48,
          }}
        >
          Three consoles. One expedition.
        </h2>
      </Reveal>
      <div className="lp-how-grid">
        {CONSOLES.map((c, i) => (
          <Reveal key={c.key} delay={200 + i * 100}>
            <div className="lp-card" style={{ height: "100%", padding: "32px 24px" }}>
              <div className="lp-sans" style={{ fontSize: 14, letterSpacing: "0.2em", marginBottom: 14, fontWeight: 700, color: c.labelColor }}>
                {c.label}
              </div>
              <h3 className="lp-serif" style={{ fontSize: 22, fontWeight: 700, color: "rgba(248,245,240,0.95)", marginBottom: 12, lineHeight: 1.3 }}>
                {c.title}
              </h3>
              <p className="lp-sans" style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.7, color: "rgba(248,245,240,0.7)", margin: 0 }}>
                {c.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
