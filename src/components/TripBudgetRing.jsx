import { useEffect, useState } from "react";

/**
 * Planned spend vs expedition budget - gold ring, animates on load and when values change.
 */
export default function TripBudgetRing({ planned = 0, cap = 0, labelText = "BUDGET", displayAmount = "" }) {
  const safeCap = cap > 0 ? cap : 0;
  const pct = safeCap > 0 ? Math.min(planned / safeCap, 1) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawn(dash));
    });
    return () => cancelAnimationFrame(id);
  }, [dash]);

  const over = safeCap > 0 && planned > safeCap;
  const stroke = over ? "#FF6B6B" : "#C9A04C";

  return (
    <div
      className="trip-budget-ring"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 8px 4px", minHeight: 132 }}
      role="img"
      aria-label={
        safeCap > 0
          ? `Budget allocation ${Math.round(pct * 100)} percent, planned ${Math.round(planned)} of ${Math.round(safeCap)}`
          : "Budget ring"
      }
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(248,245,240,0.48)", letterSpacing: 3.2, marginBottom: 6, fontFamily: "'Inter',system-ui,-apple-system,sans-serif", whiteSpace: "nowrap" }}>
        {labelText}
      </div>
      <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(248,245,240,0.08)" strokeWidth="5" />
          <circle
            className="trip-budget-ring__arc"
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${drawn} ${circ}`}
            strokeDashoffset={circ * 0.25}
            transform="rotate(-90 36 36)"
            style={{
              filter: over ? "drop-shadow(0 0 5px rgba(255,107,107,0.35))" : "drop-shadow(0 0 6px rgba(201,160,76,0.35))",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            paddingTop: 2,
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: stroke, fontFamily: "'Inter',system-ui,-apple-system,sans-serif", lineHeight: 1.05, textShadow: over ? "none" : "0 0 20px rgba(201,160,76,0.28)" }}>
            {Math.round(pct * 100)}%
          </span>
          <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(248,245,240,0.38)", letterSpacing: 2, marginTop: 2, fontFamily: "'Inter',system-ui,-apple-system,sans-serif" }}>
            ALLOC
          </span>
        </div>
      </div>
      {displayAmount ? (
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#c9a04c",
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            marginTop: 4,
            textShadow: "0 0 28px rgba(201,160,76,0.28)",
          }}
        >
          {displayAmount}
        </div>
      ) : null}
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(248,245,240,0.42)", letterSpacing: 2.2, marginTop: displayAmount ? 6 : 8, fontFamily: "'Inter',system-ui,-apple-system,sans-serif" }}>
        TOTAL
      </div>
    </div>
  );
}
