import { memo } from "react";

export const SharegoodLogo = memo(function SharegoodLogo({
  size=40, opacity=1, glowColor="rgba(169,70,29,0.5)",
  animate=true, logoState="idle"
}) {
  const anim = {
    idle:     "logoIdle 5s ease-in-out infinite",
    thinking: "logoThinking 1.2s ease-in-out infinite",
    done:     "logoDone 0.6s ease forwards",
    error:    "logoError 0.4s ease"
  }[logoState] || "logoIdle 5s ease-in-out infinite";
  const finalAnim = animate ? anim : "none";
  return (
    <div style={{position:"relative",width:size,height:size,
      flexShrink:0,animation:finalAnim,
      filter:`drop-shadow(0 0 ${size*.25}px ${glowColor})`,
      opacity,"--logo-glow":glowColor}}>
      <img src="/1bn-logo.png" width={size} height={size}
        alt="1 Bag Nomad"
        style={{display:"block",borderRadius:"50%"}}/>
    </div>
  );
});

export default SharegoodLogo;
