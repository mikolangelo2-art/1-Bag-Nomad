/**
 * Shared hero + hierarchy for Food / Stay / Activities Co-Architect suggestion cards.
 * Full-bleed hero (when present) with a strong bottom-weighted scrim so copy and CTAs stay readable.
 */
export default function SuggestionExperienceCard({
  accent,
  categoryLabel,
  title,
  descriptor,
  descriptorFontSize = 14,
  middle,
  priceLine,
  priceSubline,
  whisper,
  disclaimer,
  heroUrl,
  heroLink,
  isMobile,
  /** Mobile Stay/Food: one visual layer — no inner gradient panel over the hero */
  flatMobile = false,
  children,
}) {
  const heroMobile = !!(heroUrl && isMobile);
  const flat = !!(flatMobile && heroMobile);
  const nameFs = isMobile ? 18 : 20;
  const cardRadius = heroMobile ? 12 : 14;
  const cardMinH = heroUrl ? (isMobile ? 300 : 380) : undefined;
  const txtSh = heroUrl
    ? heroMobile
      ? "0 1px 3px rgba(0,0,0,0.5)"
      : "0 1px 3px rgba(0,0,0,0.95), 0 2px 22px rgba(0,0,0,0.55)"
    : undefined;
  const whisperSh = heroUrl
    ? heroMobile
      ? "0 1px 3px rgba(0,0,0,0.5)"
      : "0 1px 3px rgba(0,0,0,0.98), 0 2px 16px rgba(0,0,0,0.75), 0 0 1px rgba(0,0,0,1)"
    : undefined;

  return (
    <div
      className="sg-suggestion-card sg-experience-card"
      style={{
        boxSizing: "border-box",
        position: "relative",
        WebkitTapHighlightColor: "transparent",
        border: heroMobile ? "1px solid rgba(255,255,255,0.12)" : "1.5px solid rgba(255,255,255,0.14)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: cardRadius,
        background: heroUrl ? "transparent" : "rgba(255,159,67,0.09)",
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
            key={heroUrl}
            src={heroUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="lux-img-reveal lux-img-hero-grade"
            onLoad={(e) => e.currentTarget.classList.add("lux-img-reveal--loaded")}
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
              background: heroMobile
                ? `linear-gradient(
                180deg,
                rgba(0,0,0,0.5) 0%,
                rgba(0,0,0,0.56) 38%,
                rgba(0,0,0,0.62) 72%,
                rgba(0,0,0,0.65) 100%
              )`
                : `linear-gradient(
                180deg,
                rgba(10,7,5,0.18) 0%,
                rgba(10,7,5,0.32) 20%,
                rgba(10,7,5,0.58) 42%,
                rgba(10,7,5,0.82) 65%,
                rgba(10,7,5,0.9) 100%
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
          padding: flat ? "14px 16px 16px" : heroMobile ? "10px 10px 14px" : "16px 16px 18px",
          background: heroUrl
            ? flat
              ? "transparent"
              : heroMobile
                ? "linear-gradient(90deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.22) 100%)"
                : "linear-gradient(90deg, rgba(10,7,5,0.82) 0%, rgba(10,7,5,0.62) 48%, rgba(10,7,5,0.22) 100%)"
            : undefined,
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
            textShadow: txtSh,
          }}
        >
          {categoryLabel}
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: nameFs,
            fontWeight: 500,
            color: "#FFFFFF",
            lineHeight: 1.25,
            marginBottom: descriptor ? 6 : 10,
            wordBreak: isMobile ? "break-word" : undefined,
            textShadow: txtSh,
          }}
        >
          {title}
        </div>
        {descriptor ? (
          <div
            style={{
              fontSize: descriptorFontSize,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              color: heroUrl ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.78)",
              lineHeight: 1.45,
              marginBottom: 10,
              whiteSpace: isMobile ? "normal" : "nowrap",
              overflow: isMobile ? "visible" : "hidden",
              textOverflow: isMobile ? "clip" : "ellipsis",
              textShadow: txtSh,
            }}
          >
            {descriptor}
          </div>
        ) : null}

        {middle ? (
          <div
            style={
              heroUrl
                ? flat
                  ? {
                      textShadow: txtSh,
                      padding: 0,
                      marginBottom: 8,
                      borderRadius: 0,
                      background: "transparent",
                      border: "none",
                    }
                  : heroMobile
                    ? {
                        textShadow: txtSh,
                        padding: "0",
                        marginBottom: 6,
                        borderRadius: 0,
                        background: "rgba(0,0,0,0.28)",
                        border: "none",
                      }
                    : {
                        textShadow: txtSh,
                        padding: "12px 14px",
                        marginBottom: 6,
                        borderRadius: 10,
                        background: "rgba(10,7,5,0.76)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                : { textShadow: txtSh }
            }
          >
            {middle}
          </div>
        ) : null}

        {priceLine ? (
          <div
            style={{
              fontSize: 14,
              fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
              color: "#FF9F43",
              fontWeight: 600,
              marginBottom: priceSubline ? 4 : whisper || disclaimer ? 8 : 10,
              lineHeight: 1.4,
              textShadow: txtSh,
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
              textShadow: txtSh,
            }}
          >
            {priceSubline}
          </div>
        ) : null}

        {whisper ? (
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 15,
              fontStyle: "italic",
              color: heroUrl ? "rgba(255,248,235,0.78)" : "rgba(255,159,67,0.78)",
              lineHeight: 1.5,
              marginBottom: disclaimer ? 8 : 10,
              textShadow: heroUrl ? whisperSh : txtSh,
              padding: heroUrl ? (flat ? "6px 0" : heroMobile ? "8px 0" : "10px 12px") : undefined,
              borderRadius: heroUrl ? (flat || heroMobile ? 0 : 8) : undefined,
              background: heroUrl ? (flat ? "transparent" : heroMobile ? "rgba(0,0,0,0.35)" : "rgba(10,7,5,0.72)") : undefined,
              border: heroUrl ? (flat || heroMobile ? "none" : "1px solid rgba(255,255,255,0.07)") : undefined,
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
              color: heroUrl ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.42)",
              lineHeight: 1.5,
              marginBottom: heroLink ? 6 : 12,
              textShadow: txtSh,
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
                textShadow: txtSh,
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
