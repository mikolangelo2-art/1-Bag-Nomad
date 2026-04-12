import HelpTip from "./HelpTip";

const SEGMENTS_DESKTOP = 10;
const SEGMENTS_COMPACT = 8;

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Math.round(Number(n));
  return `$${v.toLocaleString()}`;
}

/**
 * Planned spend vs expedition budget — segmented bar + total (Trip Console hero stat).
 */
export default function TripBudgetRing({
  planned = 0,
  cap = 0,
  labelText = "BUDGET",
  displayAmount = "",
  compact = false,
  helpTip = "",
  helpTipDesktopOnly = true,
  mobileStatBar = false,
}) {
  const safeCap = cap > 0 ? cap : 0;
  const raw = safeCap > 0 ? planned / safeCap : 0;
  const over = safeCap > 0 && planned > safeCap;
  const fillRatio = safeCap > 0 ? Math.min(raw, 1) : 0;
  const pctShown = Math.round(fillRatio * 100);
  const n = compact ? SEGMENTS_COMPACT : SEGMENTS_DESKTOP;
  const filled = safeCap > 0 ? Math.min(n, Math.round(fillRatio * n)) : 0;
  const fillColor = over ? "#FF6B6B" : mobileStatBar && compact ? "#D4AF37" : "#C9A04C";
  const segH = compact ? 4 : 5;
  const gap = compact ? 2 : 2;

  /** Mobile expedition strip — compact cells */
  if (compact && mobileStatBar) {
    return (
      <div
        className="trip-budget-ring"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "flex-start",
          padding: "2px 2px 0",
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
            marginBottom: 2,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 2,
              textTransform: "uppercase",
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
            gap: 6,
            marginBottom: 2,
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
              fontSize: 11,
              fontWeight: 700,
              color: fillColor,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              lineHeight: 1,
              flexShrink: 0,
              textShadow: "0 0 12px rgba(212,175,55,0.2)",
            }}
          >
            {pctShown}%
          </span>
        </div>
        {displayAmount ? (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#D4AF37",
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              textAlign: "center",
              textShadow: "0 0 18px rgba(212,175,55,0.22)",
            }}
          >
            {displayAmount}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: 1.5,
            marginTop: 1,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            textAlign: "center",
          }}
        >
          TOTAL
        </div>
      </div>
    );
  }

  /** Desktop Trip Console hero — align primary figure with DEPARTS / NIGHTS columns */
  const desktopHero = !compact && !mobileStatBar;
  if (desktopHero) {
    return (
      <div
        className="trip-budget-ring"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "2px 6px 0",
          width: "100%",
          maxWidth: "100%",
          minHeight: 0,
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
            marginBottom: 2,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(248,245,240,0.48)",
              letterSpacing: 2.5,
            }}
          >
            {labelText}
          </span>
          {helpTip ? <HelpTip noLeadingMargin desktopOnly={helpTipDesktopOnly} text={helpTip} /> : null}
        </div>
        {displayAmount ? (
          <div
            className="stat-val"
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#c9a04c",
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              textAlign: "center",
              textShadow: "0 0 22px rgba(201,160,76,0.24)",
              marginBottom: 4,
            }}
          >
            {displayAmount}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            marginBottom: 4,
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
              fontSize: 11,
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
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(248,245,240,0.42)",
            letterSpacing: 0.4,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          Planned {fmtMoney(planned)}
        </div>
      </div>
    );
  }

  /** Fallback (compact desktop if ever used) */
  return (
    <div
      className="trip-budget-ring"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        padding: "0 4px 0",
        minHeight: 0,
        width: "100%",
        maxWidth: "100%",
      }}
      role="img"
      aria-label="Budget"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          marginBottom: 2,
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(248,245,240,0.48)",
            letterSpacing: 2.6,
          }}
        >
          {labelText}
        </span>
        {helpTip ? <HelpTip noLeadingMargin desktopOnly={helpTipDesktopOnly} text={helpTip} /> : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, width: "100%" }}>
        <div style={{ flex: 1, display: "flex", gap, minHeight: segH, alignItems: "stretch" }} aria-hidden>
          {Array.from({ length: n }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                height: segH,
                borderRadius: 2,
                background: i < filled ? fillColor : "rgba(248,245,240,0.09)",
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: fillColor, fontFamily: "'Inter',system-ui,-apple-system,sans-serif" }}>
          {pctShown}%
        </span>
      </div>
      {displayAmount ? (
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#c9a04c",
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            textAlign: "center",
          }}
        >
          {displayAmount}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(248,245,240,0.4)",
          letterSpacing: 1.6,
          marginTop: 1,
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          textAlign: "center",
        }}
      >
        TOTAL
      </div>
    </div>
  );
}
