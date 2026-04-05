import { memo, useState, useEffect } from "react";

const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

const LOGO_CSS = `
@keyframes llRingSpin { to { transform: rotate(360deg) } }
@keyframes llIdle {
  0%, 100% { transform: scale(1) }
  50% { transform: scale(1.03) }
}
@keyframes llIdleGlow {
  0%, 100% { opacity: 0.04 }
  50% { opacity: 0.08 }
}
@keyframes llListening {
  0%, 100% { transform: scale(1) }
  50% { transform: scale(1.05) }
}
@keyframes llListeningGlow {
  0%, 100% { opacity: 0.08 }
  50% { opacity: 0.15 }
}
@keyframes llThinkingGlow {
  0%, 100% { opacity: 0.10; background: radial-gradient(circle, rgba(255,217,61,0.25) 0%, rgba(255,159,67,0.12) 50%, transparent 70%) }
  50% { opacity: 0.22; background: radial-gradient(circle, rgba(255,159,67,0.30) 0%, rgba(255,217,61,0.15) 50%, transparent 70%) }
}
@keyframes llCelebratePulse {
  0% { transform: scale(1) }
  35% { transform: scale(1.15) }
  100% { transform: scale(1) }
}
@keyframes llCelebrateBurst {
  0% { transform: scale(0.8); opacity: 0.6; border-color: rgba(255,217,61,0.8) }
  100% { transform: scale(2.2); opacity: 0; border-color: rgba(255,217,61,0) }
}
@keyframes llCelebrateRingFlash {
  0%, 100% { border-color: rgba(255,217,61,0.12) }
  30% { border-color: rgba(255,217,61,0.7) }
}
`;

const STATE_CONFIG = {
  idle: {
    ringSpeed: "22s",
    scaleAnim: `llIdle 4s ${EASE} infinite`,
    glowAnim: `llIdleGlow 6s ${EASE} infinite`,
  },
  listening: {
    ringSpeed: "8s",
    scaleAnim: `llListening 2s ${EASE} infinite`,
    glowAnim: `llListeningGlow 2s ${EASE} infinite`,
  },
  thinking: {
    ringSpeed: "3s",
    scaleAnim: "none",
    scaleTransform: "scale(1.06)",
    glowAnim: `llThinkingGlow 1.5s ${EASE} infinite`,
  },
  celebrating: {
    ringSpeed: "3s",
    scaleAnim: `llCelebratePulse 800ms ${EASE} forwards`,
    glowAnim: "none",
    ringFlash: `llCelebrateRingFlash 800ms ${EASE} forwards`,
    burst: true,
  },
};

// Map legacy logoState values to new animationState
const LEGACY_MAP = { idle: "idle", thinking: "thinking", done: "celebrating", error: "idle" };

export const SharegoodLogo = memo(function SharegoodLogo({
  size = 40, opacity = 1, glowColor = "rgba(169,70,29,0.5)",
  animate = true, logoState, animationState
}) {
  const resolvedState = animationState || LEGACY_MAP[logoState] || "idle";
  const active = animate && resolvedState !== "idle" ? resolvedState : (animate ? "idle" : null);
  const cfg = active ? STATE_CONFIG[active] : null;

  // Celebrating auto-returns to idle
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (resolvedState === "celebrating" && animate) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 1200);
      return () => clearTimeout(t);
    }
  }, [resolvedState, animate]);

  const showCelebrate = celebrating && animate;
  const effectiveState = showCelebrate ? "celebrating" : (active || null);
  const c = effectiveState ? STATE_CONFIG[effectiveState] : null;

  // Transition timing
  const transIn = effectiveState === "listening" ? "400ms" : effectiveState === "thinking" ? "300ms" : "200ms";
  const transOut = effectiveState === "listening" ? "600ms" : effectiveState === "thinking" ? "800ms" : "300ms";
  const trans = `transform ${transIn} ${EASE}, opacity ${transOut} ${EASE}`;

  const ringSize = size + 12;

  return (
    <>
      <style>{LOGO_CSS}</style>
      <div style={{
        position: "relative", width: size, height: size, flexShrink: 0, opacity,
        animation: c?.scaleAnim || "none",
        transform: c?.scaleTransform || "scale(1)",
        transition: trans,
      }}>
        {/* Orbital ring */}
        {animate && <div style={{
          position: "absolute",
          top: (size - ringSize) / 2, left: (size - ringSize) / 2,
          width: ringSize, height: ringSize,
          borderRadius: "50%",
          border: "1px solid rgba(255,217,61,0.12)",
          animation: c ? `llRingSpin ${c.ringSpeed} linear infinite${c.ringFlash ? `, ${c.ringFlash}` : ""}` : "none",
          pointerEvents: "none",
        }}/>}

        {/* Glow layer */}
        {animate && c && <div style={{
          position: "absolute", inset: -size * 0.3,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          animation: c.glowAnim,
          pointerEvents: "none",
        }}/>}

        {/* Celebrate burst ring */}
        {showCelebrate && <div style={{
          position: "absolute",
          top: -4, left: -4,
          width: size + 8, height: size + 8,
          borderRadius: "50%",
          border: "2px solid rgba(255,217,61,0.8)",
          animation: `llCelebrateBurst 600ms ${EASE} forwards`,
          pointerEvents: "none",
        }}/>}

        {/* Logo image */}
        <img src="/1bn-logo.png" width={size} height={size}
          alt="1 Bag Nomad"
          style={{
            display: "block", borderRadius: "50%", position: "relative", zIndex: 1,
            filter: `drop-shadow(0 0 ${size * 0.2}px ${glowColor})`,
          }}/>
      </div>
    </>
  );
});

export default SharegoodLogo;
