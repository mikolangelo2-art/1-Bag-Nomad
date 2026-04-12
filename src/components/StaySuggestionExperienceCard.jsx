import SuggestionExperienceCard from "./SuggestionExperienceCard";
import {
  dismissBtnStyleOnHero,
  stayBlurbForSelection,
} from "../utils/tripConsoleHelpers";
import { addedToPlanLine, returnToLogCopy } from "../utils/microcopy";

const committedFooterWrapStyle = {
  marginTop: 14,
  paddingTop: 12,
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const planCommitAddedLineStyle = {
  fontSize: 12,
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  color: "rgba(201,160,76,0.92)",
  letterSpacing: 0.35,
  lineHeight: 1.45,
};
const returnToLogFooterStyle = {
  fontSize: 12,
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  color: "rgba(255,255,255,0.36)",
  letterSpacing: "0.14em",
  lineHeight: 1.58,
  marginTop: 8,
};

const STAY_ACCENT = "#69F0AE";
const STAY_DISCLAIMER =
  "\u26A1 Estimates based on current market rates \u2014 actual prices vary when booked";
const STAY_SAVED_SUB =
  "Locked in — dates, links, and notes live here whenever you want to refine them.";

export function StaySuggestionExperienceCard({
  suggestion,
  segment,
  selectedStayProp,
  setSelectedStayProp,
  heroUrl,
  heroThumb,
  heroLink,
  isMobile,
  onUseThisStay,
  onPlanMyOwn,
  planMyOwnLabel = "PLAN MY OWN",
  acceptBtnStyle,
  dismissBtnStyle,
  extraActions,
  /** When true, show committed shell + toolbar in place of the hero suggestion (Session 52). */
  inPlaceSaved = false,
  committedToolbar = null,
  stayBodySummary = null,
  savedCheckStyle,
  savedSubStyle,
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
      <div style={{ marginBottom: isMobile ? 8 : 12, width: isMobile ? "100%" : undefined }}>
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
            style={
              isMobile
                ? {
                    border: "none",
                    borderBottom:
                      pi < propsList.length - 1 ? "1px solid rgba(255,255,255,0.12)" : "none",
                    borderRadius: 0,
                    padding: "12px 0",
                    marginBottom: 0,
                    width: "100%",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    fontSize: 14,
                    fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
                    color:
                      selectedStayProp === prop
                        ? STAY_ACCENT
                        : "rgba(255,255,255,0.75)",
                    background: "transparent",
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    lineHeight: 1.35,
                    transition: "all 0.2s",
                  }
                : {
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
                  }
            }
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

  const savedSubMerged = {
    ...savedSubStyle,
    display: "block",
    fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  };

  if (inPlaceSaved) {
    return (
      <SuggestionExperienceCard
        accent={STAY_ACCENT}
        categoryLabel="🏨 ACCOMMODATION"
        title={title}
        descriptor={descriptor}
        descriptorFontSize={15}
        middle={null}
        priceLine={priceLine}
        priceSubline={priceSubline}
        whisper={null}
        disclaimer={null}
        heroUrl={heroUrl}
        heroThumb={heroThumb}
        heroLink={heroLink}
        isMobile={isMobile}
        flatMobile={isMobile}
        tightFooter
      >
        {committedToolbar ? <div style={{ marginBottom: 10 }}>{committedToolbar}</div> : null}
        {stayBodySummary}
        <span style={savedCheckStyle}>✓ Stay added to your plan.</span>
        <span style={savedSubMerged}>{STAY_SAVED_SUB}</span>
        <div style={committedFooterWrapStyle}>
          <div style={planCommitAddedLineStyle}>{addedToPlanLine("stay")}</div>
          <div style={returnToLogFooterStyle}>{returnToLogCopy("Stay")}</div>
        </div>
      </SuggestionExperienceCard>
    );
  }

  return (
    <SuggestionExperienceCard
      accent={STAY_ACCENT}
      categoryLabel="🏨 ACCOMMODATION"
      title={title}
      descriptor={descriptor}
      descriptorFontSize={15}
      middle={middle}
      priceLine={priceLine}
      priceSubline={priceSubline}
      whisper={null}
      disclaimer={STAY_DISCLAIMER}
      heroUrl={heroUrl}
      heroThumb={heroThumb}
      heroLink={heroLink}
      isMobile={isMobile}
      flatMobile={isMobile}
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
