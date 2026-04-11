/**
 * Three skeleton cards + loading copy - Stay / Activities / Food while tab suggestions load.
 * @param {{ message: string }} props
 */
export default function SuggestionShimmer({ message }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 13,
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          fontStyle: "italic",
          color: "rgba(255,255,255,0.4)",
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        {message}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(201,160,76,0.12)",
              background: "rgba(201,160,76,0.06)",
              animation: "sgShimmerPulse 1.6s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
            }}
          >
            <div
              style={{
                height: 160,
                background: "linear-gradient(90deg, rgba(201,160,76,0.08) 0%, rgba(201,160,76,0.16) 50%, rgba(201,160,76,0.08) 100%)",
                backgroundSize: "200% 100%",
                animation: "sgShimmerSweep 1.8s ease-in-out infinite",
              }}
            />
            <div style={{ padding: "12px 14px" }}>
              <div
                style={{
                  height: 14,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.08)",
                  width: "72%",
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  height: 10,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.05)",
                  width: "45%",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes sgShimmerPulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes sgShimmerSweep {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
