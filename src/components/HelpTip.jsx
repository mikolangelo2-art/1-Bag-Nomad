import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMobile } from "../hooks/useMobile";

/** Small "?" help control: hover on desktop, tap to pin on mobile. Tooltip portals to document.body to avoid clipping. */
export default function HelpTip({ text, noLeadingMargin = false, compact = false }) {
  const isMobile = useMobile();
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const [tipStyle, setTipStyle] = useState(null);
  const show = hover || pinned;

  const updatePosition = useCallback(() => {
    if (!show || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const gap = 8;
    const maxW = "min(300px, calc(100vw - 32px))";
    if (isMobile) {
      const cx = r.left + r.width / 2;
      setTipStyle({
        position: "fixed",
        left: Math.max(16, Math.min(window.innerWidth - 16, cx)),
        top: r.bottom + gap,
        transform: "translateX(-50%)",
        maxWidth: maxW,
        width: "max-content",
        zIndex: 200000,
      });
    } else {
      setTipStyle({
        position: "fixed",
        left: r.left + r.width / 2,
        top: r.top - gap,
        transform: "translate(-50%, -100%)",
        maxWidth: maxW,
        width: "max-content",
        zIndex: 200000,
      });
    }
  }, [show, isMobile]);

  useLayoutEffect(() => {
    if (!show) {
      setTipStyle(null);
      return;
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [show, updatePosition]);

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setPinned(false);
    };
    document.addEventListener("click", onDoc, true);
    return () => document.removeEventListener("click", onDoc, true);
  }, [pinned]);

  const dim = compact ? 12 : 14;
  const fs = compact ? 8 : 9;

  const tooltipEl =
    show && tipStyle && typeof document !== "undefined"
      ? createPortal(
          <span
            role="tooltip"
            style={{
              ...tipStyle,
              background: "#1a1108",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 11,
              color: "rgba(255,255,255,0.75)",
              whiteSpace: "normal",
              lineHeight: 1.6,
              fontFamily: "'Space Mono',monospace",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              animation: "fadeIn 0.15s ease",
              pointerEvents: "none",
              textAlign: "left",
            }}
          >
            {text}
          </span>,
          document.body
        )
      : null;

  return (
    <>
      <span ref={rootRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: noLeadingMargin ? 0 : 5, verticalAlign: "middle" }}>
        <button
          ref={btnRef}
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
      </span>
      {tooltipEl}
    </>
  );
}
