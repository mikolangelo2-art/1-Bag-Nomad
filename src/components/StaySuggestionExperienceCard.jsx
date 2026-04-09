import SuggestionExperienceCard from "./SuggestionExperienceCard";
import {
  dismissBtnStyleOnHero,
  stayBlurbForSelection,
} from "../utils/tripConsoleHelpers";

const STAY_ACCENT = "#69F0AE";
const STAY_DISCLAIMER =
  "\u26A1 Estimates based on current market rates \u2014 actual prices vary when booked";

export function StaySuggestionExperienceCard({
  suggestion,
  segment,
  selectedStayProp,
  setSelectedStayProp,
  heroUrl,
  heroLink,
  isMobile,
  onUseThisStay,
  onPlanMyOwn,
  planMyOwnLabel = "PLAN MY OWN",
  acceptBtnStyle,
  dismissBtnStyle,
  extraActions,
}) {
  const s = suggestion;
  const propsList = s?.suggestions || [];
  const segName = (segment?.name || "").trim() || "This stop";
  const primaryName = (selectedStayProp || propsList[0] || "").trim();
  let title;
  let descriptor;
  if (propsList.length > 0) {
    title = primaryName || `${segName} \u00B7 stays`;
    const blurb = stayBlurbForSelection(s, primaryName).trim();
    descriptor = blurb || null;
  } else {
    title = (s?.recommendation || "").trim() || `${segName} \u00B7 stays`;
    descriptor = null;
  }

  const priceLine = `Est. ${s.estimatedNightly || "\u2014"} \u00B7 Total ~${s.estimatedTotal || "\u2014"}`;
  const notesFull = (s?.notes || "").trim();
  const priceSubline =
    notesFull.length > 140 ? `${notesFull.slice(0, 137)}...` : notesFull || null;

  const middle =
    propsList.length > 0 ? (
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            color: "rgba(255,255,255,0.40)",
            letterSpacing: 2,
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          SELECT PROPERTY
        </div>
        {propsList.map((prop, pi) => (
          <div
            key={`stay-exp-${pi}-${String(prop).slice(0, 48)}`}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedStayProp(prop)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedStayProp(prop);
              }
            }}
            style={{
              border:
                selectedStayProp === prop
                  ? "1px solid rgba(105,240,174,0.55)"
                  : "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 6,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              color:
                selectedStayProp === prop
                  ? STAY_ACCENT
                  : "rgba(255,255,255,0.75)",
              background:
                selectedStayProp === prop
                  ? "rgba(105,240,174,0.08)"
                  : "transparent",
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              lineHeight: 1.35,
              transition: "all 0.2s",
            }}
          >
            {prop}
          </div>
        ))}
      </div>
    ) : null;

  const ctaFlex = isMobile
    ? { width: "100%", minHeight: 44 }
    : { flex: 1, minWidth: 120, minHeight: 44 };

  const dismissMerged = heroUrl ? dismissBtnStyleOnHero : dismissBtnStyle;

  return (
    <SuggestionExperienceCard
      accent={STAY_ACCENT}
      categoryLabel="ACCOMMODATION"
      title={title}
      descriptor={descriptor}
      descriptorFontSize={15}
      middle={middle}
      priceLine={priceLine}
      priceSubline={priceSubline}
      whisper={null}
      disclaimer={STAY_DISCLAIMER}
      heroUrl={heroUrl}
      heroLink={heroLink}
      isMobile={isMobile}
    >
      <button type="button" onClick={onUseThisStay} style={{ ...acceptBtnStyle, ...ctaFlex }}>
        USE THIS STAY
      </button>
      <button type="button" onClick={onPlanMyOwn} style={{ ...dismissMerged, ...ctaFlex }}>
        {planMyOwnLabel}
      </button>
      {extraActions}
    </SuggestionExperienceCard>
  );
}
