import GenericSuggestionCard from "./GenericSuggestionCard";

const ACT_ACCENT = "#c9a04c";
const DEFAULT_ACT_DISCLAIMER =
  "\u26A1 Estimates only \u2014 prices vary when booked";

function formatActivityPrice(raw) {
  const s = String(raw || "").trim();
  if (!s) return "\u2014";
  const n = s.replace(/^\$/, "");
  return `Est. $${n}`;
}

/**
 * Co-Architect activity suggestion — same split layout as Stay/Food insight cards
 * (hero band + title block + details + actions).
 */
export function ActivitySuggestionExperienceCard({
  segmentName,
  segmentCountry = "",
  activity,
  photoInstanceId,
  isMobile,
  onAdd,
  onSkip,
  showSkip = true,
  acceptBtnStyle,
  dismissBtnStyle,
  disclaimerText = DEFAULT_ACT_DISCLAIMER,
}) {
  const name = (activity?.name || activity?.title || "").trim() || "Activity";
  const provider = (activity?.provider || "").trim();
  const notes = (activity?.notes || activity?.brief || "").trim();
  const costRaw = activity?.estimatedCost || activity?.cost || "";

  const item = {
    name,
    category: "SUGGESTED ACTIVITY",
    description: notes || "",
    price: formatActivityPrice(costRaw),
    rating: null,
    address: null,
  };

  return (
    <GenericSuggestionCard
      variant="expand"
      item={item}
      destination={segmentName}
      country={segmentCountry}
      instanceId={photoInstanceId || "sug-act"}
      accent={ACT_ACCENT}
      isMobile={isMobile}
      subtitle={provider || undefined}
      photoQueryOverride={name === "Activity" ? "sightseeing" : name}
      onAddToPlan={onAdd}
      onSkip={showSkip ? onSkip : undefined}
      disclaimer={disclaimerText}
      addButtonLabel="ADD TO PLAN"
      acceptButtonStyle={acceptBtnStyle}
      dismissButtonStyle={dismissBtnStyle}
    />
  );
}
