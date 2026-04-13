import { useState, useEffect, useMemo } from "react";
import { useDestinationPhoto } from "../hooks/useDestinationPhoto";
import { useSuggestionPhotoDuplicate } from "./SuggestionPhotoDedupProvider";

/** Split-card hero height — taller band shows more of each photo (Stay/Food/Activities) */
const HERO_H = 200;

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
 *   inPlaceSaved?: boolean,
 *   committedToolbar?: import("react").ReactNode,
 *   savedCheckText?: string,
 *   savedSubText?: string,
 *   savedCheckStyle?: import("react").CSSProperties,
 *   savedSubStyle?: import("react").CSSProperties,
 *   footerSlot?: import("react").ReactNode,
 *   photoPageIndex?: number,
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
  inPlaceSaved = false,
  committedToolbar = null,
  savedCheckText = "",
  savedSubText = "",
  savedCheckStyle,
  savedSubStyle,
  footerSlot = null,
  photoPageIndex = 0,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const isStacked = variant === "stacked";
  const expanded = isStacked
    ? true
    : variant === "accordion"
      ? !!expandedProp || inPlaceSaved
      : innerOpen;
  function toggle() {
    if (isStacked) return;
    if (variant === "accordion") onToggle?.();
    else setInnerOpen((o) => !o);
  }

  const photoCat = photoQueryOverride ?? `${item.category} ${destination}`.trim();
  const photo = useDestinationPhoto(destination, photoCat, country, {
    instanceId,
    page: Math.min(3, Math.max(1, (Number(photoPageIndex) || 0) + 1)),
  });
  const isPhotoDuplicate = useSuggestionPhotoDuplicate(
    photo.ready && photo.url ? photo.url : null,
    instanceId
  );
  const showHeroImg = photo.ready && photo.url && !isPhotoDuplicate;
  const descFallback = useMemo(
    () => String(item.description || item.note || "").trim(),
    [item.description, item.note]
  );

  useEffect(() => {
    setImgLoaded(false);
  }, [photo.url]);

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
    <div style={{ position: "relative", height: HERO_H, background: "#111", overflow: "hidden" }}>
      {showHeroImg ? (
        <>
          {!imgLoaded && photo.thumb ? (
            <img
              src={photo.thumb}
              alt=""
              decoding="async"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "blur(8px)",
                transform: "scale(1.05)",
                transition: "opacity 0.3s ease",
                zIndex: 0,
              }}
            />
          ) : !imgLoaded && !photo.thumb ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(201,160,76,0.08)",
                animation: "pulse 1.5s ease-in-out infinite",
                zIndex: 0,
              }}
            />
          ) : null}
          <img
            src={photo.url}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.4s ease",
              zIndex: 1,
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
              zIndex: 2,
            }}
          />
        </>
      ) : photo.ready && (!photo.url || isPhotoDuplicate) && descFallback ? (
        <div
          style={{
            padding: "20px 16px",
            background: "rgba(0,8,20,0.6)",
            borderRadius: "12px 12px 0 0",
            minHeight: HERO_H,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 15,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.70)",
              lineHeight: 1.7,
            }}
          >
            {descFallback}
          </div>
        </div>
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
            fontSize: 14,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            color: "rgba(255,245,220,0.80)",
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
          fontSize: 17,
          fontWeight: 400,
          color: "rgba(255,245,220,0.94)",
          lineHeight: 1.25,
          marginBottom: 6,
          wordBreak: "break-word",
        }}
      >
        {item.name}
      </div>
      <div
        style={{
          fontSize: 14,
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          color: "rgba(245,158,11,0.90)",
          fontWeight: 600,
        }}
      >
        {priceStr}
        {item.rating != null ? (
          <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500, marginLeft: 8 }}>
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
            fontSize: 15,
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
            fontSize: 14,
            color: "rgba(255,245,220,0.78)",
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

  const savedBlock =
    inPlaceSaved && (savedCheckText || savedSubText) ? (
      <div style={{ marginTop: 10 }}>
        {savedCheckText ? (
          <span style={savedCheckStyle}>{savedCheckText}</span>
        ) : null}
        {savedSubText ? (
          <span style={{ display: "block", ...savedSubStyle }}>{savedSubText}</span>
        ) : null}
      </div>
    ) : null;

  const expandableDetailBody = (
    <div
      style={{
        padding: "0 14px 14px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {inPlaceSaved && committedToolbar ? (
        <div style={{ marginBottom: 10 }}>{committedToolbar}</div>
      ) : null}
      {sharedDetails}
      {!inPlaceSaved ? (
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
      ) : (
        <>
          {savedBlock}
          {inPlaceSaved && footerSlot ? <div style={{ marginTop: 10 }}>{footerSlot}</div> : null}
        </>
      )}
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
      {inPlaceSaved && committedToolbar ? (
        <div style={{ marginBottom: 10 }}>{committedToolbar}</div>
      ) : null}
      {!inPlaceSaved ? (
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
      ) : (
        <>
          {savedBlock}
          {inPlaceSaved && footerSlot ? <div style={{ marginTop: 10 }}>{footerSlot}</div> : null}
        </>
      )}
      {photoCredit}
    </div>
  );

  if (inPlaceSaved && variant === "expand" && !innerOpen) {
    return (
      <div style={{ marginBottom: 10 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setInnerOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setInnerOpen(true);
            }
          }}
          style={{
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            cursor: "pointer",
            border: "1px solid rgba(212,175,55,0.25)",
            borderLeft: "3px solid #D4AF37",
            background: "rgba(212,175,55,0.06)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
                color: accent,
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              {item.category}
            </span>{" "}
            <span
              style={{
                fontSize: 14,
                fontFamily: "'Fraunces',serif",
                color: "#fff",
                fontWeight: 500,
              }}
            >
              {item.name}
            </span>
            <span
              style={{
                color: "#10B981",
                fontSize: 12,
                fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
                marginLeft: 10,
                fontWeight: 600,
              }}
            >
              ✓ Added to Plan
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {committedToolbar}
            <span
              aria-hidden
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.35)",
                transition: "transform 0.3s ease",
                transform: "rotate(0deg)",
                lineHeight: 1,
              }}
            >
              ▼
            </span>
          </div>
        </div>
      </div>
    );
  }

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
            {inPlaceSaved && variant === "expand" ? (
              <div style={{ position: "relative" }}>
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    zIndex: 15,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    transition: "transform 0.3s ease",
                    transform: "rotate(180deg)",
                    lineHeight: 1,
                    pointerEvents: "none",
                    textShadow: "0 1px 8px rgba(0,0,0,0.75)",
                  }}
                >
                  ▼
                </span>
                {heroBlock}
              </div>
            ) : (
              heroBlock
            )}
            {summaryBlock}
          </button>
          {expanded ? expandableDetailBody : null}
        </>
      )}
    </div>
  );
}
