import { useDestinationPhoto } from "../hooks/useDestinationPhoto";
import SuggestionExperienceCard from "./SuggestionExperienceCard";

const ACT_ACCENT = "#FFD93D";
const DEFAULT_ACT_DISCLAIMER =
  "\u26A1 Estimates only \u2014 prices vary when booked";

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
  const photo = useDestinationPhoto(
    segmentName,
    name === "Activity" ? "sightseeing" : name,
    segmentCountry,
    photoInstanceId ? { instanceId: photoInstanceId } : undefined
  );
  const provider = (activity?.provider || "").trim();
  const notes = (activity?.notes || activity?.brief || "").trim();
  const costRaw = activity?.estimatedCost || activity?.cost || "";

  const ctaFlex = isMobile
    ? { width: "100%", minHeight: 44 }
    : { flex: 1, minWidth: 120, minHeight: 44 };

  return (
    <SuggestionExperienceCard
      accent={ACT_ACCENT}
      categoryLabel="SUGGESTED ACTIVITY"
      title={name}
      descriptor={provider || null}
      middle={null}
      priceLine={costRaw ? `Est. ${costRaw}` : null}
      priceSubline={null}
      whisper={notes || null}
      disclaimer={disclaimerText}
      heroUrl={photo.ready ? photo.url : null}
      heroLink={photo.htmlLink}
      isMobile={isMobile}
    >
      <button type="button" onClick={onAdd} style={{ ...acceptBtnStyle, ...ctaFlex }}>
        + ADD TO PLAN
      </button>
      {showSkip && onSkip ? (
        <button type="button" onClick={onSkip} style={{ ...dismissBtnStyle, ...ctaFlex }}>
          SKIP
        </button>
      ) : null}
    </SuggestionExperienceCard>
  );
}
