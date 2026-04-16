import { useState, useEffect, useMemo } from "react";
import { useDestinationPhoto } from "../hooks/useDestinationPhoto";
import { useSuggestionPhotoDuplicate } from "./SuggestionPhotoDedupProvider";

/** Split-card hero height — stacked variant only */
const HERO_H = 200;

/** DS v2 — fixed tokens (accent prop kept for API compat, not used for chrome) */
const DS_GOLD = "#C9A04C";
const DS_TEAL = "#5E8B8A";

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
  accent: _accent = "#69F0AE",
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
  const isExpandVariant = variant === "expand";
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

  const collapseIconChar = String(item.category || "\u25C6").trim().slice(0, 2) || "\u25C6";

  const categoryStyle = {
    fontSize: 11,
    fontFamily: "Instrument Sans, sans-serif",
    color: isStacked ? DS_TEAL : "rgba(255,255,255,0.45)",
    marginBottom: 6,
    letterSpacing: isStacked ? 2 : 0.5,
    opacity: isStacked ? 0.95 : 1,
  };

  const defaultAddStyle = {
    width: "100%",
    height: 48,
    background: DS_GOLD,
    color: "#0A0705",
    border: "none",
    borderRadius: 12,
    fontFamily: "Instrument Sans, sans-serif",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: "1px",
    textTransform: "uppercase",
    cursor: "pointer",
    marginTop: 4,
    transition: "filter 0.15s ease, transform 0.1s ease",
  };

  const addLabelDisplay =
    addButtonLabel.startsWith("+") ? addButtonLabel : `+ ${addButtonLabel}`;

  const heroInner = (fillMode) => (
    <>
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
              display: "block",
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
            borderRadius: fillMode === "expand" ? 0 : "12px 12px 0 0",
            minHeight: fillMode === "expand" ? "100%" : HERO_H,
            height: fillMode === "expand" ? "100%" : undefined,
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
    </>
  );

  const heroBlock = (
    <div style={{ position: "relative", height: HERO_H, background: "#111", overflow: "hidden" }}>
      {heroInner("stacked")}
    </div>
  );

  const heroPhotoBlock = (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        background: "#111",
        overflow: "hidden",
      }}
    >
      {heroInner("expand")}
    </div>
  );

  const summaryBlock = (
    <div style={{ padding: isMobile ? "12px 12px 10px" : "14px 14px 12px" }}>
      <div style={categoryStyle}>{item.category}</div>
      {subtitle ? (
        <div
          style={{
            fontSize: 14,
            fontFamily: "Instrument Sans, sans-serif",
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
          fontFamily: "Instrument Sans, sans-serif",
          color: "rgba(245,158,11,0.90)",
          fontWeight: 600,
        }}
      >
        {priceStr}
        {item.rating != null ? (
          <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500, marginLeft: 8 }}>
            <span style={{ color: "rgba(245,158,11,0.90)" }}>★</span> {item.rating}/10
          </span>
        ) : null}
      </div>
      {variant === "accordion" && !expanded ? (
        <div
          style={{
            fontSize: 11,
            marginTop: 6,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "Instrument Sans, sans-serif",
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
            fontFamily: "Instrument Sans, sans-serif",
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
            fontFamily: "'Fraunces',serif",
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: 15,
            color: "rgba(232,220,200,0.75)",
            lineHeight: 1.6,
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
            fontFamily: "Instrument Sans, sans-serif",
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
            fontFamily: "Instrument Sans, sans-serif",
          }}
        >
          {item.address}
        </div>
      ) : null}
    </>
  );

  const defaultSavedCheck = {
    fontFamily: "Instrument Sans, sans-serif",
    fontWeight: 500,
    fontSize: 13,
    color: "#69F0AE",
  };
  const defaultSavedSub = {
    fontFamily: "Fraunces, serif",
    fontWeight: 300,
    fontStyle: "italic",
    fontSize: 13,
    color: "rgba(232,220,200,0.55)",
  };

  const savedBlockMerged =
    inPlaceSaved && (savedCheckText || savedSubText) ? (
      <div style={{ marginTop: 10 }}>
        {savedCheckText ? (
          <span style={{ ...defaultSavedCheck, ...savedCheckStyle }}>{savedCheckText}</span>
        ) : null}
        {savedSubText ? (
          <span style={{ display: "block", ...defaultSavedSub, ...savedSubStyle }}>{savedSubText}</span>
        ) : null}
      </div>
    ) : null;

  const expandableDetailBody = (
    <div
      style={{
        padding: "0 14px 14px",
        borderTop: "1px solid rgba(122,111,93,0.3)",
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
          {savedBlockMerged}
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
        borderTop: "1px solid rgba(122,111,93,0.3)",
      }}
    >
      {sharedDetails}
      {disclaimer ? (
        <div
          style={{
            fontSize: 11,
            fontFamily: "Instrument Sans, sans-serif",
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
          {savedBlockMerged}
          {inPlaceSaved && footerSlot ? <div style={{ marginTop: 10 }}>{footerSlot}</div> : null}
        </>
      )}
      {photoCredit}
    </div>
  );

  const expandBodyBelowPhoto = (
    <div
      style={{
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 500,
            fontSize: 15,
            color: "#E8DCC8",
            flex: 1,
            minWidth: 0,
            paddingRight: 8,
          }}
        >
          {item.name}
        </span>
        <span
          style={{
            fontFamily: "Instrument Sans, sans-serif",
            fontWeight: 500,
            fontSize: 13,
            color: DS_GOLD,
            flexShrink: 0,
          }}
        >
          {priceStr}
        </span>
      </div>
      {item.rating != null ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "Instrument Sans, sans-serif",
            fontSize: 13,
            color: "rgba(232,220,200,0.6)",
          }}
        >
          <span style={{ color: DS_GOLD }}>★</span>
          <span>
            {item.rating}/10
          </span>
        </div>
      ) : null}
      {subtitle ? (
        <div
          style={{
            fontSize: 13,
            fontFamily: "Instrument Sans, sans-serif",
            color: "rgba(232,220,200,0.55)",
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {inPlaceSaved && committedToolbar ? <div style={{ marginBottom: 4 }}>{committedToolbar}</div> : null}
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
          {savedBlockMerged}
          {inPlaceSaved && footerSlot ? <div style={{ marginTop: 10 }}>{footerSlot}</div> : null}
        </>
      )}
      {photoCredit}
    </div>
  );

  if (inPlaceSaved && variant === "expand" && !innerOpen) {
    return (
      <div style={{ marginBottom: 8 }}>
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
            borderRadius: 14,
            padding: "0 16px",
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(122,111,93,0.4)",
            borderLeft: `3px solid ${DS_GOLD}`,
            flexWrap: "wrap",
            transition: "border-color 0.2s ease",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(201,160,76,0.08)",
                border: "1px solid rgba(201,160,76,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: DS_GOLD,
                fontSize: 16,
              }}
            >
              {collapseIconChar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "Instrument Sans, sans-serif",
                  color: DS_TEAL,
                  letterSpacing: 1,
                  fontWeight: 700,
                }}
              >
                {item.category}
              </span>{" "}
              <span
                style={{
                  fontSize: 15,
                  fontFamily: "Instrument Sans, sans-serif",
                  fontWeight: 500,
                  color: "#E8DCC8",
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </span>
            </div>
            <span
              style={{
                fontFamily: "Instrument Sans, sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: DS_GOLD,
                flexShrink: 0,
              }}
            >
              {priceStr}
            </span>
            <span
              style={{
                color: "#69F0AE",
                fontSize: 12,
                fontFamily: "Instrument Sans, sans-serif",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {savedCheckText || "\u2713 Added"}
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
                color: "rgba(232,220,200,0.4)",
                transition: "transform 0.3s ease",
                transform: "rotate(0deg)",
                lineHeight: 1,
              }}
            >
              &#9662;
            </span>
          </div>
        </div>
      </div>
    );
  }

  const outerShell = {
    borderRadius: 14,
    overflow: "hidden",
    border: `1px solid rgba(122,111,93,0.4)`,
    borderLeft: `3px solid ${DS_GOLD}`,
    marginBottom: 8,
    background: "rgba(255,255,255,0.04)",
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <div style={isExpandVariant ? { marginBottom: 8 } : outerShell}>
      {isStacked ? (
        <>
          {heroBlock}
          {summaryBlock}
          {stackedDetailBody}
        </>
      ) : isExpandVariant ? (
        <>
          {!innerOpen ? (
            <button
              type="button"
              onClick={toggle}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(122,111,93,0.4)",
                borderLeft: `3px solid ${DS_GOLD}`,
                borderRadius: 14,
                padding: "0 16px",
                height: 56,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                transition: "border-color 0.2s ease",
                marginBottom: 0,
                textAlign: "left",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(201,160,76,0.08)",
                  border: "1px solid rgba(201,160,76,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: DS_GOLD,
                  fontSize: 16,
                }}
              >
                {collapseIconChar}
              </div>
              <span
                style={{
                  fontFamily: "Instrument Sans, sans-serif",
                  fontWeight: 500,
                  fontSize: 15,
                  color: "#E8DCC8",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </span>
              <span
                style={{
                  fontFamily: "Instrument Sans, sans-serif",
                  fontWeight: 500,
                  fontSize: 13,
                  color: DS_GOLD,
                  flexShrink: 0,
                }}
              >
                {priceStr}
              </span>
              <span
                style={{
                  color: "rgba(232,220,200,0.4)",
                  fontSize: 12,
                  transition: "transform 0.3s ease",
                  transform: innerOpen ? "rotate(180deg)" : "rotate(0deg)",
                  flexShrink: 0,
                }}
              >
                &#9662;
              </span>
            </button>
          ) : (
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(201,160,76,0.22)",
                borderLeft: `3px solid ${DS_GOLD}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative" }}>
                {inPlaceSaved ? (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 12,
                      zIndex: 15,
                      fontSize: 12,
                      color: "rgba(232,220,200,0.4)",
                      transition: "transform 0.3s ease",
                      transform: "rotate(180deg)",
                      lineHeight: 1,
                      pointerEvents: "none",
                      textShadow: "0 1px 8px rgba(0,0,0,0.75)",
                    }}
                  >
                    &#9662;
                  </span>
                ) : null}
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
                    lineHeight: 0,
                  }}
                >
                  {heroPhotoBlock}
                </button>
              </div>
              {expandBodyBelowPhoto}
            </div>
          )}
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
