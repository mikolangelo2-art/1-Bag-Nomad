import { Reveal } from "./Reveal.jsx";

const BLOCKS = [
  { key: "a", text: "Real travel begins with a feeling." },
  { key: "s1", spacer: true },
  { key: "b", text: "A reef you need to dive." },
  { key: "c", text: "A city you need to disappear into." },
  { key: "d", text: "A version of yourself you're chasing.", breakAfter: true },
  { key: "s2", spacer: true },
  { key: "e", text: "Every travel app starts the same way \u2014", dim: true },
  { key: "f", text: "Where are you going? When are you leaving?", dim: true, breakAfter: true },
  { key: "s3", spacer: true },
  { key: "g", text: "But that's not how real travel begins." },
  { key: "s4", spacer: true },
  { key: "h", text: "Your ultimate travel journey starts right here, right now.", gold: true },
];

export function FeelingSection() {
  let revealIndex = 0;
  return (
    <section
      className="lp-section"
      style={{
        padding: "100px 24px",
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
        background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(201,160,76,0.06) 0%, transparent 60%), #1a1a1a",
      }}
    >
      {BLOCKS.map((block) => {
        if (block.spacer) {
          return <div key={block.key} style={{ height: 12, marginBottom: 8 }} />;
        }
        const i = revealIndex++;
        const color = block.gold
          ? "var(--lp-gold)"
          : block.dim
            ? "rgba(248,245,240,0.5)"
            : "rgba(248,245,240,0.8)";
        const weight = block.gold ? 400 : 300;
        const marginBottom = block.breakAfter ? 32 : 8;
        return (
          <Reveal key={block.key} delay={i * 120}>
            <p
              className="lp-serif"
              style={{
                fontSize: "clamp(1.1rem, 2.5vw, 1.45rem)",
                fontWeight: weight,
                fontStyle: "italic",
                lineHeight: 2,
                color,
                margin: `0 0 ${marginBottom}px`,
              }}
            >
              {block.text}
            </p>
          </Reveal>
        );
      })}
    </section>
  );
}
