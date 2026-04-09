/**
 * Shared hero + hierarchy for Food / Stay / Activities Co-Architect suggestion cards.
 * Full-bleed hero (when present) with a strong bottom-weighted scrim so copy and CTAs stay readable.
 */
const WALNUT = "#0A0705";

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
  const nameFs = isMobile ? 18 : 20;
  const cardRadius = 14;
  const cardMinH = heroUrl ? (isMobile ? 320 : 380) : undefined;

  return (
    <div
      className="sg-suggestion-card sg-experience-card"
      style={{
        boxSizing: "border-box",
        position: "relative",
        WebkitTapHighlightColor: "transparent",
        border: "1.5px solid rgba(255,255,255,0.14)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: cardRadius,
        background: heroUrl ? `linear-gradient(165deg, rgba(255,159,67,0.07) 0%, ${WALNUT} 55%)` : "rgba(255,159,67,0.09)",
        overflow: "hidden",
        marginBottom: 10,
        textAlign: "left",
        minHeight: cardMinH,
        display: "flex",
        flexDirection: "column",
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
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              zIndex: 0,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              background: `linear-gradient(
                180deg,
                rgba(10,7,5,0.28) 0%,
                rgba(10,7,5,0.5) 22%,
                rgba(10,7,5,0.88) 48%,
                rgba(10,7,5,0.94) 72%,
                rgba(10,7,5,0.97) 100%
              )`,
            }}
          />
        </>
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "16px 16px 18px",
          background: heroUrl ? "rgba(10,7,5,0.88)" : "transparent",
          backdropFilter: heroUrl ? "saturate(1.08) blur(10px)" : undefined,
          WebkitBackdropFilter: heroUrl ? "saturate(1.08) blur(10px)" : undefined,
          textShadow: heroUrl ? "0 1px 14px rgba(0,0,0,0.55)" : undefined,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            letterSpacing: 2.5,
            color: accent,
            opacity: heroUrl ? 0.9 : 0.75,
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
              color: "rgba(255,255,255,0.78)",
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
              color: "rgba(255,255,255,0.55)",
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
              color: "rgba(255,159,67,0.72)",
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
              color: "rgba(255,255,255,0.42)",
              lineHeight: 1.5,
              marginBottom: heroLink ? 6 : 12,
            }}
          >
            {disclaimer}
          </div>
        ) : null}

        {heroLink ? (
          <div style={{ textAlign: "right", marginBottom: 12, marginTop: disclaimer ? 0 : 0 }}>
            <a
              href={heroLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10,
                fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
                color: "rgba(255,255,255,0.48)",
                textDecoration: "none",
              }}
            >
              Photo: Unsplash
            </a>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            flexDirection: isMobile ? "column" : "row",
            marginTop: "auto",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
