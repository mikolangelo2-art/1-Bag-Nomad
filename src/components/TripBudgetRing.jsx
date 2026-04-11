import HelpTip from "./HelpTip";

const SEGMENTS_DESKTOP = 10;
const SEGMENTS_COMPACT = 8;

/**
 * Planned spend vs expedition budget — segmented bar + total (Trip Console hero stat).
 */
export default function TripBudgetRing({ planned = 0, cap = 0, labelText = "BUDGET", displayAmount = "", compact = false, helpTip = "", helpTipDesktopOnly = true }) {
  const safeCap = cap > 0 ? cap : 0;
  const raw = safeCap > 0 ? planned / safeCap : 0;
  const over = safeCap > 0 && planned > safeCap;
  const fillRatio = safeCap > 0 ? Math.min(raw, 1) : 0;
  const pctShown = Math.round(fillRatio * 100);
  const n = compact ? SEGMENTS_COMPACT : SEGMENTS_DESKTOP;
  const filled = safeCap > 0 ? Math.min(n, Math.round(fillRatio * n)) : 0;
  const fillColor = over ? "#FF6B6B" : "#C9A04C";
  const segH = compact ? 4 : 5;
  const gap = compact ? 2 : 2;

  return (
    <div
      className="trip-budget-ring"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        padding: compact ? "2px 2px 0" : "0 4px 0",
        minHeight: 0,
        width: "100%",
        maxWidth: "100%",
      }}
      role="img"
      aria-label={
        safeCap > 0
          ? `Budget allocation ${pctShown} percent, planned ${Math.round(planned)} of ${Math.round(safeCap)}`
          : "Budget"
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          marginBottom: compact ? 2 : 2,
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: compact ? 8 : 10,
            fontWeight: 700,
            color: "rgba(248,245,240,0.48)",
            letterSpacing: compact ? 2 : 2.6,
          }}
        >
          {labelText}
        </span>
        {helpTip ? <HelpTip noLeadingMargin desktopOnly={helpTipDesktopOnly} text={helpTip} /> : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 6 : 8,
          marginBottom: compact ? 2 : 3,
          width: "100%",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            gap,
            minHeight: segH,
            alignItems: "stretch",
          }}
          aria-hidden
        >
          {Array.from({ length: n }, (_, i) => (
            <div
              key={i}
              className="trip-budget-bar-seg"
              style={{
                flex: 1,
                minWidth: 0,
                height: segH,
                borderRadius: 2,
                background: i < filled ? fillColor : "rgba(248,245,240,0.09)",
                boxShadow:
                  i < filled && !over
                    ? "0 0 6px rgba(201,160,76,0.28)"
                    : i < filled && over
                      ? "0 0 6px rgba(255,107,107,0.35)"
                      : "none",
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: compact ? 11 : 13,
            fontWeight: 700,
            color: fillColor,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            lineHeight: 1,
            flexShrink: 0,
            textShadow: over ? "none" : "0 0 14px rgba(201,160,76,0.22)",
          }}
        >
          {pctShown}%
        </span>
      </div>
      {!compact ? (
        <span
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: "rgba(248,245,240,0.36)",
            letterSpacing: 1.6,
            margin: "0 0 2px",
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            textAlign: "center",
          }}
        >
          PLANNED
        </span>
      ) : null}
      {displayAmount ? (
        <div
          style={{
            fontSize: compact ? 13 : 20,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#c9a04c",
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            marginTop: compact ? 0 : 0,
            textAlign: "center",
            textShadow: "0 0 22px rgba(201,160,76,0.24)",
          }}
        >
          {displayAmount}
        </div>
      ) : null}
      {!compact ? (
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(248,245,240,0.4)",
            letterSpacing: 1.6,
            marginTop: displayAmount ? 1 : 2,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            textAlign: "center",
          }}
        >
          TOTAL
        </div>
      ) : (
        <div
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: "rgba(248,245,240,0.38)",
            letterSpacing: 1.5,
            marginTop: 1,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            textAlign: "center",
          }}
        >
          TOTAL
        </div>
      )}
    </div>
  );
}
