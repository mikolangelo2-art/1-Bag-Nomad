import { useState } from "react";
import { useDestinationPhoto } from "../hooks/useDestinationPhoto";

/** Split-card hero height — aligned across Stay/Food/Activities insight rows */
const HERO_H = 140;

/**
 * Unsplash-powered suggestion tile (generic shape).
 * @param {{
 *   item: import("../utils/suggestionCardShape").GenericSuggestion,
 *   destination: string,
 *   country?: string,
 *   instanceId: string,
 *   accent?: string,
 *   variant?: "expand" | "accordion" | "stacked",
 *   expanded?: boolean,
 *   onToggle?: () => void,
 *   onAddToPlan: () => void,
 *   warmLine?: string,
 *   isMobile?: boolean,
 *   subtitle?: string,
 *   photoQueryOverride?: string,
 *   onSkip?: () => void,
 *   disclaimer?: string,
 *   addButtonLabel?: string,
 *   acceptButtonStyle?: import("react").CSSProperties,
 *   dismissButtonStyle?: import("react").CSSProperties,
 * }} props
 */
export default function GenericSuggestionCard({
  item,
  destination,
  country = "",
  instanceId,
  accent = "#69F0AE",
  variant = "expand",
  expanded: expandedProp,
  onToggle,
  onAddToPlan,
  warmLine,
  isMobile = false,
  subtitle,
  photoQueryOverride,
  onSkip,
  disclaimer,
  addButtonLabel = "ADD TO PLAN",
  acceptButtonStyle,
  dismissButtonStyle,
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isStacked = variant === "stacked";
  const expanded = isStacked ? true : variant === "accordion" ? !!expandedProp : innerOpen;
  function toggle() {
    if (isStacked) return;
    if (variant === "accordion") onToggle?.();
    else setInnerOpen((o) => !o);
  }

  const photoCat = photoQueryOverride ?? `${item.category} ${destination}`.trim();
  const photo = useDestinationPhoto(destination, photoCat, country, { instanceId });

  const priceStr =
    typeof item.price === "number"
      ? `$${item.price}`
      : String(item.price || "\u2014");

  const categoryStyle = {
    fontSize: 11,
    fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
    color: isStacked ? accent : "rgba(255,255,255,0.45)",
    marginBottom: 6,
    letterSpacing: isStacked ? 2 : 0.5,
    opacity: isStacked ? 0.95 : 1,
  };

  const defaultAddStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg,rgba(0,229,255,0.25),rgba(105,240,174,0.2))",
    color: "#060A0F",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.2,
    cursor: "pointer",
    fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
    minHeight: 44,
  };

  const addLabelDisplay =
    addButtonLabel.startsWith("+") ? addButtonLabel : `+ ${addButtonLabel}`;

  const heroBlock = (
    <div style={{ position: "relative", height: HERO_H, background: "#111" }}>
      {photo.ready && photo.url ? (
        <>
          <img
            src={photo.url}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(201,160,76,0.12) 0%, rgba(0,0,0,0.45) 100%)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(201,160,76,0.08)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );

  const summaryBlock = (
    <div style={{ padding: isMobile ? "12px 12px 10px" : "14px 14px 12px" }}>
      <div style={categoryStyle}>{item.category}</div>
      {subtitle ? (
        <div
          style={{
            fontSize: 13,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            color: "rgba(255,255,255,0.72)",
            marginBottom: 6,
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 16,
          fontWeight: 500,
          color: "#FFF",
          lineHeight: 1.25,
          marginBottom: 6,
          wordBreak: "break-word",
        }}
      >
        {item.name}
      </div>
      <div
        style={{
          fontSize: 12,
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          color: "#c9a04c",
          fontWeight: 600,
        }}
      >
        {priceStr}
        {item.rating != null ? (
          <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500, marginLeft: 8 }}>
            {"\u2605"} {item.rating}/10
          </span>
        ) : null}
      </div>
      {variant === "accordion" && !expanded ? (
        <div
          style={{
            fontSize: 11,
            marginTop: 6,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          }}
        >
          Tap for details
        </div>
      ) : null}
    </div>
  );

  const photoCredit =
    photo.htmlLink ? (
      <div style={{ textAlign: "right", marginTop: 6 }}>
        <a
          href={photo.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            textDecoration: "none",
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          }}
        >
          Photo: Unsplash
        </a>
      </div>
    ) : null;

  const sharedDetails = (
    <>
      {warmLine ? (
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 14,
            fontStyle: "italic",
            color: "rgba(255,248,235,0.82)",
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          {warmLine}
        </div>
      ) : null}
      {item.description ? (
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.72)",
            lineHeight: 1.5,
            marginBottom: 10,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            whiteSpace: isStacked ? "pre-line" : undefined,
          }}
        >
          {item.description}
        </div>
      ) : null}
      {item.address ? (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 10,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          }}
        >
          {item.address}
        </div>
      ) : null}
    </>
  );

  const expandableDetailBody = (
    <div
      style={{
        padding: "0 14px 14px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {sharedDetails}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddToPlan();
        }}
        style={{
          ...defaultAddStyle,
          ...acceptButtonStyle,
        }}
      >
        {addLabelDisplay}
      </button>
      {photoCredit}
    </div>
  );

  const stackedDetailBody = (
    <div
      style={{
        padding: "0 14px 14px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {sharedDetails}
      {disclaimer ? (
        <div
          style={{
            fontSize: 11,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            color: "rgba(255,255,255,0.52)",
            lineHeight: 1.45,
            marginBottom: 10,
          }}
        >
          {disclaimer}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexDirection: isMobile ? "column" : "row",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToPlan();
          }}
          style={{
            ...defaultAddStyle,
            ...acceptButtonStyle,
            flex: isMobile ? "none" : 1,
            width: isMobile ? "100%" : undefined,
          }}
        >
          {addLabelDisplay}
        </button>
        {onSkip ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            style={{
              ...defaultAddStyle,
              ...dismissButtonStyle,
              flex: isMobile ? "none" : 1,
              width: isMobile ? "100%" : undefined,
              background: dismissButtonStyle?.background ?? "rgba(0,0,0,0.35)",
              color: dismissButtonStyle?.color ?? "rgba(255,255,255,0.88)",
              border: dismissButtonStyle?.border ?? "1px solid rgba(255,255,255,0.12)",
            }}
          >
            SKIP
          </button>
        ) : null}
      </div>
      {photoCredit}
    </div>
  );

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
        borderLeft: `3px solid ${accent}`,
        marginBottom: 10,
        background: "rgba(0,8,20,0.6)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {isStacked ? (
        <>
          {heroBlock}
          {summaryBlock}
          {stackedDetailBody}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={toggle}
            style={{
              display: "block",
              width: "100%",
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {heroBlock}
            {summaryBlock}
          </button>
          {expanded ? expandableDetailBody : null}
        </>
      )}
    </div>
  );
}
