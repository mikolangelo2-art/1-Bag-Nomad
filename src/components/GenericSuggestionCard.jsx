import { useState } from "react";
import { useDestinationPhoto } from "../hooks/useDestinationPhoto";

const HERO_H = 160;

/**
 * Unsplash-powered suggestion tile (generic shape).
 * @param {{
 *   item: import("../utils/suggestionCardShape").GenericSuggestion,
 *   destination: string,
 *   country?: string,
 *   instanceId: string,
 *   accent?: string,
 *   variant?: "expand" | "accordion",
 *   expanded?: boolean,
 *   onToggle?: () => void,
 *   onAddToPlan: () => void,
 *   warmLine?: string,
 *   isMobile?: boolean,
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
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const expanded = variant === "accordion" ? !!expandedProp : innerOpen;
  function toggle() {
    if (variant === "accordion") onToggle?.();
    else setInnerOpen((o) => !o);
  }

  const photoCat = `${item.category} ${destination}`.trim();
  const photo = useDestinationPhoto(destination, photoCat, country, { instanceId });

  const priceStr =
    typeof item.price === "number"
      ? `$${item.price}`
      : String(item.price || "\u2014");

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
        <div style={{ padding: isMobile ? "12px 12px 10px" : "14px 14px 12px" }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              color: "rgba(255,255,255,0.45)",
              marginBottom: 6,
              letterSpacing: 0.5,
            }}
          >
            {item.category}
          </div>
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
      </button>

      {expanded && (
        <div
          style={{
            padding: "0 14px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToPlan();
            }}
            style={{
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
            }}
          >
            ADD TO PLAN
          </button>
          {photo.htmlLink && (
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
          )}
        </div>
      )}
    </div>
  );
}
