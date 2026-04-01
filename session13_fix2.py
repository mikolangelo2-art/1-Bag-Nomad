#!/usr/bin/env python3
"""
Session 13 — Fix Round 2:
1. AntiqueGlobe: add continent outlines (SVG paths)
2. BUILD button: restore amber pulse during loading
3. Scroll reset on all screen transitions
4. Sharpen fade bridges
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()

original = content
results = []

def rep(old, new, label):
    global content
    if old in content:
        content = content.replace(old, new, 1)
        results.append(f"✅  {label}")
        return True
    results.append(f"❌  {label}")
    return False

# ═══════════════════════════════════════════════════════════════════
# 1. REPLACE AntiqueGlobe with continent version
# Using simplified SVG continent paths scaled to viewBox
# ═══════════════════════════════════════════════════════════════════

old_globe_start = '// ─── AntiqueGlobe ─────────────────────────────────────────────────'
old_globe_end = '// ─── ConsoleHeader ────────────────────────────────────────────────'

start_idx = content.find(old_globe_start)
end_idx = content.find(old_globe_end)

if start_idx > -1 and end_idx > -1:
    new_globe = '''// ─── AntiqueGlobe ─────────────────────────────────────────────────
function AntiqueGlobe({size=120, glowColor="rgba(201,168,76,0.5)", animate=true}) {
  const gold = "#C9A84C";
  const goldFaint = "rgba(201,168,76,0.22)";
  const goldMed = "rgba(201,168,76,0.45)";
  const landFill = "rgba(180,140,60,0.35)";
  const landStroke = "rgba(201,168,76,0.7)";
  const parchment = "rgba(201,168,76,0.06)";
  const r = size / 2;
  const s = size / 200; // scale factor (globe designed at 200px)

  // Simplified continent outlines — designed for 200x200 viewBox
  // Paths are approximate but recognizable continent shapes
  const continents = [
    // North America
    { d:`M${60*s},${45*s} L${75*s},${40*s} L${90*s},${42*s} L${95*s},${55*s} L${88*s},${70*s} L${80*s},${80*s} L${72*s},${85*s} L${65*s},${78*s} L${58*s},${68*s} L${55*s},${55*s} Z` },
    // South America
    { d:`M${75*s},${95*s} L${88*s},${92*s} L${95*s},${100*s} L${92*s},${120*s} L${85*s},${135*s} L${75*s},${140*s} L${68*s},${128*s} L${70*s},${110*s} Z` },
    // Europe
    { d:`M${98*s},${42*s} L${110*s},${38*s} L${118*s},${42*s} L${115*s},${52*s} L${105*s},${55*s} L${98*s},${50*s} Z` },
    // Africa
    { d:`M${100*s},${62*s} L${115*s},${60*s} L${122*s},${70*s} L${120*s},${90*s} L${115*s},${108*s} L${105*s},${115*s} L${98*s},${105*s} L${96*s},${88*s} L${98*s},${72*s} Z` },
    // Asia (simplified)
    { d:`M${118*s},${35*s} L${145*s},${32*s} L${165*s},${40*s} L${170*s},${55*s} L${158*s},${65*s} L${145*s},${68*s} L${130*s},${62*s} L${120*s},${55*s} Z` },
    // Southeast Asia blob
    { d:`M${148*s},${72*s} L${160*s},${70*s} L${165*s},${80*s} L${155*s},${85*s} L${145*s},${80*s} Z` },
    // Australia
    { d:`M${148*s},${108*s} L${165*s},${105*s} L${172*s},${118*s} L${165*s},${130*s} L${150*s},${132*s} L${142*s},${122*s} Z` },
    // Greenland
    { d:`M${72*s},${22*s} L${82*s},${18*s} L${90*s},${25*s} L${85*s},${35*s} L${75*s},${35*s} Z` },
  ];

  return (
    <div style={{
      position:"relative", width:size, height:size, flexShrink:0,
      filter:`drop-shadow(0 0 ${size*.2}px ${glowColor}) drop-shadow(0 0 ${size*.06}px ${glowColor})`,
      animation: animate ? "spinGlobe 22s linear infinite" : "none",
    }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        {/* Ocean base */}
        <circle cx={r} cy={r} r={r-1} fill={parchment} stroke={gold} strokeWidth="1.5" opacity="0.95"/>
        {/* Latitude lines */}
        {[-0.35,-0.18,0,0.18,0.35].map((lat, i) => {
          const cy = r + lat * size;
          const rx2 = Math.sqrt(Math.max(0, Math.pow(r-2,2) - Math.pow(lat*size,2)));
          const ry = Math.max(1, rx2 * 0.15);
          return rx2 > 3 ? (
            <ellipse key={i} cx={r} cy={cy} rx={rx2} ry={ry}
              fill="none" stroke={i===2?gold:goldMed}
              strokeWidth={i===2?"0.9":"0.5"} opacity={i===2?"0.7":"0.4"}/>
          ) : null;
        })}
        {/* Longitude lines */}
        {[0,45,90,135].map((angle, i) => (
          <ellipse key={i} cx={r} cy={r} rx={r-2} ry={r-2}
            fill="none" stroke={goldFaint} strokeWidth="0.5"
            transform={`rotate(${angle} ${r} ${r})`} opacity="0.35"/>
        ))}
        {/* Continent fills */}
        {continents.map((c, i) => (
          <path key={i} d={c.d} fill={landFill} stroke={landStroke} strokeWidth="0.7" opacity="0.85"/>
        ))}
        {/* Outer ring */}
        <circle cx={r} cy={r} r={r-1} fill="none" stroke={gold} strokeWidth="1.5" opacity="0.8"/>
        {/* Cardinal marks */}
        {[0,90,180,270].map((a,i) => {
          const rad = (a-90)*Math.PI/180;
          const x1 = r + (r-1.5)*Math.cos(rad), y1 = r + (r-1.5)*Math.sin(rad);
          const x2 = r + (r-5)*Math.cos(rad), y2 = r + (r-5)*Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gold} strokeWidth="1.5" opacity="0.9"/>;
        })}
        {/* N marker */}
        <text x={r} y={r*0.18} textAnchor="middle" fill={gold} fontSize={size*.08}
          fontFamily="Georgia,serif" fontWeight="bold" opacity="0.85">N</text>
      </svg>
    </div>
  );
}

'''
    content = content[:start_idx] + new_globe + content[end_idx:]
    results.append("✅  AntiqueGlobe: replaced with continent version")
else:
    results.append(f"❌  AntiqueGlobe not found (start:{start_idx}, end:{end_idx})")

# ═══════════════════════════════════════════════════════════════════
# 2. BUILD BUTTON — restore pulse during loading
# Currently .loading class kills the animation — add amber pulse back
# ═══════════════════════════════════════════════════════════════════

rep(
    '.launch-btn.loading{background:linear-gradient(135deg,#6b2a0e,#8a3515,#6b2a0e);color:rgba(255,255,255,0.85);cursor:wait}',
    '.launch-btn.loading{background:linear-gradient(135deg,#8a3515,#A9461D,#8a3515);color:rgba(255,255,255,0.92);cursor:wait;animation:launchPulse 1.4s ease-in-out infinite!important}',
    'BUILD button loading: restore amber pulse animation'
)

# ═══════════════════════════════════════════════════════════════════
# 3. SCROLL RESET — add window.scrollTo(0,0) on key transitions
# ═══════════════════════════════════════════════════════════════════

# VisionReveal mount — scroll to top
rep(
    "useEffect(()=>{if(freshMount){const t=setTimeout(()=>setMounted(true),50);return()=>clearTimeout(t);}});",
    "useEffect(()=>{window.scrollTo(0,0);if(freshMount){const t=setTimeout(()=>setMounted(true),50);return()=>clearTimeout(t);}});",
    'VisionReveal: scroll to top on mount'
)

# HandoffScreen mount — scroll to top
rep(
    'const [ph,setPh]=useState(0),[lit,setLit]=useState(0);\n  useEffect(()=>{const ts=[',
    'const [ph,setPh]=useState(0),[lit,setLit]=useState(0);\n  useEffect(()=>{window.scrollTo(0,0);},[]);\n  useEffect(()=>{const ts=[',
    'HandoffScreen: scroll to top on mount'
)

# MissionConsole mount — scroll to top
rep(
    "const [tab,setTab]=useState(\"next\");",
    "const [tab,setTab]=useState(\"next\");\n  useEffect(()=>{window.scrollTo(0,0);},[]);",
    'MissionConsole: scroll to top on mount'
)

# ═══════════════════════════════════════════════════════════════════
# 4. DREAM SCREEN — add fade-out before generation screen mounts
# Wrap the dream-root in opacity transition on launch
# ═══════════════════════════════════════════════════════════════════

rep(
    "[heroPhase,setHeroPhase]=useState(0);\n  const [loading,setLoading]=useState(false);",
    "[heroPhase,setHeroPhase]=useState(0);\n  const [loading,setLoading]=useState(false);\n  const [fadeOut,setFadeOut]=useState(false);",
    'DreamScreen: add fadeOut state'
)

rep(
    'async function handleReveal() {\n    if(!canLaunch||loading)return;\n    setLoading(true);setLoadError(false);',
    'async function handleReveal() {\n    if(!canLaunch||loading)return;\n    setFadeOut(true);\n    await new Promise(r=>setTimeout(r,350));\n    setLoading(true);setLoadError(false);',
    'DreamScreen: 350ms fade-out before generation starts'
)

rep(
    'className="dream-root">\n      <div className="dream-glow"/>',
    'className="dream-root" style={{opacity:fadeOut?0:1,transition:"opacity 0.35s ease"}}>\n      <div className="dream-glow"/>',
    'DreamScreen: apply fadeOut opacity transition'
)

# ═══════════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════════

if content != original:
    with open('src/App.jsx', 'w') as f:
        f.write(content)
    print("\n📝 File written.\n")
else:
    print("\n⚠️  No changes.\n")

print("─" * 60)
print("SESSION 13 FIX ROUND 2:")
print("─" * 60)
for r in results:
    print(r)
passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
print("─" * 60)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 60)
print("\nNext: git add src/App.jsx && git commit -m 'feat: continent globe, build button pulse, scroll reset, dream fade-out' && git push")
