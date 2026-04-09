/**
 * Shared hero + hierarchy for Food / Stay / Activities Co-Architect suggestion cards.
 */
export default function SuggestionExperienceCard({
  accent,
  categoryLabel,
  title,
  descriptor,
  middle,
  priceLine,
  priceSubline,
  whisper,
  disclaimer,
  heroUrl,
  heroLink,
  isMobile,
  children,
}) {
  const heroH = isMobile ? 140 : 160;
  const nameFs = isMobile ? 18 : 20;
  const cardRadius = 14;

  return (
    <div
      className="sg-suggestion-card sg-experience-card"
      style={{
        boxSizing: "border-box",
        WebkitTapHighlightColor: "transparent",
        border: "1.5px solid rgba(255,255,255,0.14)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: cardRadius,
        background: "rgba(255,159,67,0.09)",
        overflow: "hidden",
        marginBottom: 10,
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: heroUrl ? heroH : 0,
          background: heroUrl ? "#0A0705" : "transparent",
        }}
      >
        {heroUrl ? (
          <>
            <img
              src={heroUrl}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                width: "100%",
                height: heroH,
                objectFit: "cover",
                display: "block",
                borderRadius: `${cardRadius}px ${cardRadius}px 0 0`,
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: "55%",
                background:
                  "linear-gradient(to top, rgba(0,4,12,0.85) 0%, transparent 100%)",
                pointerEvents: "none",
                borderRadius: `${cardRadius}px ${cardRadius}px 0 0`,
              }}
            />
            {heroLink ? (
              <a
                href={heroLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 8,
                  fontSize: 10,
                  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
                  color: "rgba(255,255,255,0.40)",
                  textDecoration: "none",
                  zIndex: 2,
                }}
              >
                Photo: Unsplash
              </a>
            ) : null}
          </>
        ) : null}
      </div>

      <div style={{ padding: "16px 16px 18px" }}>
        <div
          style={{
            fontSize: 10,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            letterSpacing: 2.5,
            color: accent,
            opacity: 0.75,
            marginBottom: 8,
            lineHeight: 1.35,
          }}
        >
          {categoryLabel}
        </div>
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: nameFs,
            fontWeight: 500,
            color: "#FFFFFF",
            lineHeight: 1.25,
            marginBottom: descriptor ? 6 : 10,
            wordBreak: isMobile ? "break-word" : undefined,
          }}
        >
          {title}
        </div>
        {descriptor ? (
          <div
            style={{
              fontSize: 14,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              color: "rgba(255,255,255,0.70)",
              lineHeight: 1.45,
              marginBottom: 10,
              whiteSpace: isMobile ? "normal" : "nowrap",
              overflow: isMobile ? "visible" : "hidden",
              textOverflow: isMobile ? "clip" : "ellipsis",
            }}
          >
            {descriptor}
          </div>
        ) : null}

        {middle}

        {priceLine ? (
          <div
            style={{
              fontSize: 14,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              color: "#FF9F43",
              fontWeight: 600,
              marginBottom: priceSubline ? 4 : whisper || disclaimer ? 8 : 10,
              lineHeight: 1.4,
            }}
          >
            {priceLine}
          </div>
        ) : null}
        {priceSubline ? (
          <div
            style={{
              fontSize: 12,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              color: "rgba(255,255,255,0.50)",
              marginBottom: whisper || disclaimer ? 8 : 10,
              lineHeight: 1.45,
            }}
          >
            {priceSubline}
          </div>
        ) : null}

        {whisper ? (
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 13,
              fontStyle: "italic",
              color: "rgba(255,159,67,0.65)",
              lineHeight: 1.5,
              marginBottom: disclaimer ? 8 : 10,
            }}
          >
            {whisper}
          </div>
        ) : null}

        {disclaimer ? (
          <div
            style={{
              fontSize: 11,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              color: "rgba(255,255,255,0.30)",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            {disclaimer}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
