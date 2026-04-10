import { useState, useRef, useEffect } from "react";
import { useMobile } from "../hooks/useMobile";

/** Small "?" help control: hover on desktop, tap to pin on mobile. */
export default function HelpTip({ text, noLeadingMargin = false, compact = false }) {
  const isMobile = useMobile();
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef(null);
  const show = hover || pinned;

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setPinned(false);
    };
    document.addEventListener("click", onDoc, true);
    return () => document.removeEventListener("click", onDoc, true);
  }, [pinned]);

  const bubblePos = isMobile
    ? { top: "100%", left: 0, marginTop: 8, transform: "none" }
    : { bottom: 22, left: "50%", transform: "translateX(-50%)" };

  const dim = compact ? 12 : 14;
  const fs = compact ? 8 : 9;
  return (
    <span ref={rootRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: noLeadingMargin ? 0 : 5, verticalAlign: "middle" }}>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={show}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (isMobile) setPinned((p) => !p);
        }}
        style={{
          width: dim,
          height: dim,
          borderRadius: "50%",
          border: `1px solid ${show ? "rgba(245,158,11,0.9)" : "rgba(245,158,11,0.4)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: fs,
          color: show ? "rgba(245,158,11,0.9)" : "rgba(245,158,11,0.5)",
          cursor: "default",
          fontFamily: "'Space Mono',monospace",
          lineHeight: 1,
          padding: 0,
          margin: 0,
          background: "rgba(0,0,0,0.25)",
          transition: "all 0.2s ease",
        }}
      >
        ?
      </button>
      {show ? (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            ...bubblePos,
            background: "#1a1108",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 11,
            color: "rgba(255,255,255,0.75)",
            whiteSpace: "normal",
            maxWidth: "min(300px, calc(100vw - 32px))",
            width: "max-content",
            zIndex: 999,
            lineHeight: 1.6,
            fontFamily: "'Space Mono',monospace",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            animation: "fadeIn 0.15s ease",
            pointerEvents: "none",
            textAlign: "left",
          }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
