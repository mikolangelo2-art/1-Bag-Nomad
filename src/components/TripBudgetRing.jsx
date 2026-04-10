import { useEffect, useState } from "react";
import HelpTip from "./HelpTip";

/**
 * Planned spend vs expedition budget - gold ring, animates on load and when values change.
 */
export default function TripBudgetRing({ planned = 0, cap = 0, labelText = "BUDGET", displayAmount = "", compact = false, helpTip = "" }) {
  const safeCap = cap > 0 ? cap : 0;
  const pct = safeCap > 0 ? Math.min(planned / safeCap, 1) : 0;
  const r = compact ? 20 : 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    let innerId;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => setDrawn(dash));
    });
    return () => {
      cancelAnimationFrame(outerId);
      if (innerId != null) cancelAnimationFrame(innerId);
    };
  }, [dash]);

  const over = safeCap > 0 && planned > safeCap;
  const stroke = over ? "#FF6B6B" : "#C9A04C";

  const svgSize = compact ? 52 : 72;
  const cx = svgSize / 2;
  const strokeW = compact ? 4 : 5;
  return (
    <div
      className="trip-budget-ring"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: compact ? "4px 2px 2px" : "6px 8px 4px",
        minHeight: compact ? 0 : 132,
      }}
      role="img"
      aria-label={
        safeCap > 0
          ? `Budget allocation ${Math.round(pct * 100)} percent, planned ${Math.round(planned)} of ${Math.round(safeCap)}`
          : "Budget ring"
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          marginBottom: compact ? 4 : 6,
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: compact ? 8 : 11,
            fontWeight: 700,
            color: "rgba(248,245,240,0.48)",
            letterSpacing: compact ? 2 : 3.2,
          }}
        >
          {labelText}
        </span>
        {helpTip ? <HelpTip text={helpTip} /> : null}
      </div>
      <div style={{ position: "relative", width: svgSize, height: svgSize, flexShrink: 0 }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} aria-hidden>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(248,245,240,0.08)" strokeWidth={strokeW} />
          <circle
            className="trip-budget-ring__arc"
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            strokeWidth={strokeW}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{
              stroke,
              strokeDasharray: `${drawn} ${circ}`,
              strokeDashoffset: circ * 0.25,
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
            paddingTop: compact ? 0 : 2,
          }}
        >
          <span
            style={{
              fontSize: compact ? 12 : 17,
              fontWeight: 700,
              color: stroke,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              lineHeight: 1.05,
              textShadow: over ? "none" : "0 0 20px rgba(201,160,76,0.28)",
            }}
          >
            {Math.round(pct * 100)}%
          </span>
          {!compact ? (
            <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(248,245,240,0.38)", letterSpacing: 2, marginTop: 2, fontFamily: "'Inter',system-ui,-apple-system,sans-serif" }}>
              ALLOC
            </span>
          ) : null}
        </div>
      </div>
      {displayAmount ? (
        <div
          style={{
            fontSize: compact ? 13 : 22,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#c9a04c",
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            marginTop: compact ? 2 : 4,
            textShadow: "0 0 28px rgba(201,160,76,0.28)",
          }}
        >
          {displayAmount}
        </div>
      ) : null}
      {!compact ? (
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(248,245,240,0.42)", letterSpacing: 2.2, marginTop: displayAmount ? 6 : 8, fontFamily: "'Inter',system-ui,-apple-system,sans-serif" }}>
          TOTAL
        </div>
      ) : (
        <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(248,245,240,0.38)", letterSpacing: 1.5, marginTop: 2, fontFamily: "'Inter',system-ui,-apple-system,sans-serif" }}>
          TOTAL
        </div>
      )}
    </div>
  );
}
