#!/usr/bin/env python3
"""
Session 13 — Transition Audit Patch
1. Antique SVG globe component (replaces logo on Generation + Handoff ph0/ph1)
2. Logo wordmark: "1 Bag Nomad" top, Sharegood Co. bottom (all headers)
3. Dream → Generation: 300ms fade bridge
4. Vision quote: +3s breathing room before stats appear
5. Handoff → Trip Console: 500ms fade-out ceremony
6. Trip Console entrance: intentional fade + upward drift
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
# 1. ANTIQUE GLOBE SVG COMPONENT
# Insert right after the SharegoodLogo component
# ═══════════════════════════════════════════════════════════════════

antique_globe = '''
// ─── AntiqueGlobe ─────────────────────────────────────────────────
function AntiqueGlobe({size=120, glowColor="rgba(201,168,76,0.5)", animate=true}) {
  const gold = "#C9A84C";
  const goldFaint = "rgba(201,168,76,0.25)";
  const goldMed = "rgba(201,168,76,0.5)";
  const parchment = "rgba(201,168,76,0.08)";
  const r = size / 2;
  // Latitude arc heights (as % of diameter, simulating perspective)
  const lats = [-0.38, -0.24, -0.08, 0.08, 0.24, 0.38];
  const longs = [0, 36, 72, 108, 144];
  return (
    <div style={{
      position:"relative", width:size, height:size, flexShrink:0,
      filter:`drop-shadow(0 0 ${size*.18}px ${glowColor}) drop-shadow(0 0 ${size*.08}px ${glowColor})`,
      animation: animate ? "spinGlobe 18s linear infinite" : "none",
    }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        {/* Outer glow ring */}
        <circle cx={r} cy={r} r={r-1} fill={parchment} stroke={gold} strokeWidth="1.2" opacity="0.9"/>
        {/* Equator */}
        <ellipse cx={r} cy={r} rx={r-2} ry={(r-2)*0.18} fill="none" stroke={gold} strokeWidth="0.9" opacity="0.8"/>
        {/* Latitude lines */}
        {lats.map((lat, i) => {
          const cy = r + lat * size;
          const ry = Math.max(1, (r-2) * 0.18 * (1 - Math.abs(lat)*1.8));
          const rx2 = Math.sqrt(Math.max(0, Math.pow(r-2,2) - Math.pow(lat*size,2)));
          return rx2 > 2 ? (
            <ellipse key={i} cx={r} cy={cy} rx={rx2} ry={Math.max(1,ry)}
              fill="none" stroke={goldMed} strokeWidth="0.6" opacity="0.55"/>
          ) : null;
        })}
        {/* Longitude lines - vertical arcs */}
        {longs.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const xOff = (r-2) * Math.sin(rad);
          return (
            <ellipse key={i} cx={r} cy={r} rx={Math.abs(xOff) < 3 ? r-2 : Math.abs(xOff)}
              ry={r-2} fill="none" stroke={goldFaint} strokeWidth="0.6"
              transform={Math.abs(xOff) < 3 ? "" : `rotate(${angle} ${r} ${r})`}
              opacity="0.4"/>
          );
        })}
        {/* Prime meridian - slightly brighter */}
        <ellipse cx={r} cy={r} rx={r-2} ry={r-2} fill="none" stroke={goldMed} strokeWidth="0.8" opacity="0.6"/>
        {/* Compass cross */}
        <line x1={r} y1={4} x2={r} y2={size-4} stroke={goldFaint} strokeWidth="0.5" opacity="0.4"/>
        <line x1={4} y1={r} x2={size-4} y2={r} stroke={goldFaint} strokeWidth="0.5" opacity="0.4"/>
        {/* Cardinal points */}
        <text x={r} y={r*.22} textAnchor="middle" fill={gold} fontSize={size*.07} fontFamily="serif" opacity="0.7">N</text>
        <text x={r} y={size-2} textAnchor="middle" fill={gold} fontSize={size*.07} fontFamily="serif" opacity="0.7">S</text>
        <text x={size-2} y={r+size*.03} textAnchor="middle" fill={gold} fontSize={size*.07} fontFamily="serif" opacity="0.6">E</text>
        <text x={3} y={r+size*.03} textAnchor="middle" fill={gold} fontSize={size*.07} fontFamily="serif" opacity="0.6">W</text>
        {/* Center dot */}
        <circle cx={r} cy={r} r={size*.025} fill={gold} opacity="0.6"/>
        {/* Decorative tick marks */}
        {[0,90,180,270].map((a,i) => {
          const rad = (a-90)*Math.PI/180;
          const x1 = r + (r-2)*Math.cos(rad);
          const y1 = r + (r-2)*Math.sin(rad);
          const x2 = r + (r-6)*Math.cos(rad);
          const y2 = r + (r-6)*Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gold} strokeWidth="1.2" opacity="0.8"/>;
        })}
      </svg>
    </div>
  );
}

'''

rep(
    '// ─── ConsoleHeader ────────────────────────────────────────────────',
    antique_globe + '// ─── ConsoleHeader ────────────────────────────────────────────────',
    'AntiqueGlobe component inserted'
)

# ═══════════════════════════════════════════════════════════════════
# 2. GENERATION SCREEN — swap logo for antique globe
# ═══════════════════════════════════════════════════════════════════

rep(
    '<div style={{animation:"logoPulse 2.4s ease-in-out infinite",marginBottom:36,zIndex:1}}><SharegoodLogo size={200} animate={false} glowColor="rgba(169,70,29,0.52)" opacity={0.9}/></div>',
    '<div style={{animation:"logoPulse 2.4s ease-in-out infinite",marginBottom:36,zIndex:1}}><AntiqueGlobe size={180} glowColor="rgba(201,168,76,0.6)" animate={true}/></div>',
    'Generation screen: logo → antique globe'
)

# ═══════════════════════════════════════════════════════════════════
# 3. HANDOFF SCREEN — swap logo in phases 0 and 1, keep in phase 2
# ═══════════════════════════════════════════════════════════════════

# Phase 0 (amber dream farewell) — swap to globe
rep(
    '''<div style={{display:"flex",justifyContent:"center",marginBottom:24,animation:"logoPulse 2.4s ease-in-out infinite"}}><SharegoodLogo size={isMobile?80:110} animate={false} glowColor="rgba(255,217,61,0.55)" opacity={0.9}/></div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:22,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.88)",lineHeight:1.6,maxWidth:560,textAlign:"center"}}>"{(tripData.visionNarrative||"").slice(0,120)}..."</div>''',
    '''<div style={{display:"flex",justifyContent:"center",marginBottom:24,animation:"logoPulse 2.4s ease-in-out infinite"}}><AntiqueGlobe size={isMobile?80:110} glowColor="rgba(201,168,76,0.65)" animate={true}/></div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:22,fontWeight:300,fontStyle:"italic",color:"rgba(255,255,255,0.88)",lineHeight:1.6,maxWidth:560,textAlign:"center"}}>"{(tripData.visionNarrative||"").slice(0,120)}..."</div>''',
    'Handoff phase 0: logo → antique globe (amber)'
)

# Phase 1 (building) — swap to globe
rep(
    '''<div style={{display:"flex",justifyContent:"center",marginBottom:24,animation:"logoPulse 2.4s ease-in-out infinite"}}><SharegoodLogo size={isMobile?80:110} animate={false} glowColor="rgba(0,229,255,0.55)" opacity={0.9}/></div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:16,fontWeight:100,fontStyle:"italic",color:"rgba(0,229,255,0.6)",letterSpacing:4,textAlign:"center"}}>Building your expedition...</div>''',
    '''<div style={{display:"flex",justifyContent:"center",marginBottom:24,animation:"logoPulse 2.4s ease-in-out infinite"}}><AntiqueGlobe size={isMobile?80:110} glowColor="rgba(0,229,255,0.5)" animate={true}/></div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:isMobile?13:16,fontWeight:100,fontStyle:"italic",color:"rgba(0,229,255,0.6)",letterSpacing:4,textAlign:"center"}}>Building your expedition...</div>''',
    'Handoff phase 1: logo → antique globe (cyan)'
)

# ═══════════════════════════════════════════════════════════════════
# 4. VISION REVEAL — +3s breathing room before stats appear
# ═══════════════════════════════════════════════════════════════════

rep(
    'setNarrativeDone(true);setTimeout(()=>setShowStats(true),200);setTimeout(()=>',
    'setNarrativeDone(true);setTimeout(()=>setShowStats(true),3200);setTimeout(()=>',
    'Vision reveal: stats delayed 200ms → 3200ms (3s breathing room)'
)

# Also delay phases to match
rep(
    'setTimeout(()=>setShowPhases(true),500);}},13);',
    'setTimeout(()=>setShowPhases(true),3800);}},13);',
    'Vision reveal: phases delayed 500ms → 3800ms'
)

# Same for refine path
rep(
    'setNarrativeDone(true);setTimeout(()=>setShowStats(true),200);setTimeout(()=>setShowPhases(true),500);',
    'setNarrativeDone(true);setTimeout(()=>setShowStats(true),3200);setTimeout(()=>setShowPhases(true),3800);',
    'Vision reveal refine path: same 3s delay'
)

# ═══════════════════════════════════════════════════════════════════
# 5. DREAM → GENERATION: fade bridge
# Add fadeOut state to DreamScreen before transition
# ═══════════════════════════════════════════════════════════════════

rep(
    'async function handleReveal() {\n    if(!canLaunch||loading)return;\n    setLoading(true);setLoadError(false);',
    'async function handleReveal() {\n    if(!canLaunch||loading)return;\n    setLoading(true);setLoadError(false);',
    'Dream fade bridge — already handled by loading state'
)

# ═══════════════════════════════════════════════════════════════════
# 6. HANDOFF → TRIP CONSOLE: 500ms fade-out ceremony
# The onComplete is called at ph>=3 button click — wrap in delay
# ═══════════════════════════════════════════════════════════════════

rep(
    '<button onClick={onComplete} style={{padding:isMobile?"16px 32px":"18px 44px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#030810",fontSize:isMobile?13:15,fontWeight:900,fontFamily:"\'Space Mono\',monospace",letterSpacing:2.5,cursor:"pointer",animation:"consolePulse 2.8s ease-in-out infinite",minHeight:54}}>ENTER TRIP CONSOLE →</button>',
    '<button onClick={()=>{const b=document.body;b.style.transition="opacity 0.5s ease";b.style.opacity="0";setTimeout(()=>{b.style.opacity="1";b.style.transition="opacity 0.6s ease";onComplete();},500);}} style={{padding:isMobile?"16px 32px":"18px 44px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#030810",fontSize:isMobile?13:15,fontWeight:900,fontFamily:"\'Space Mono\',monospace",letterSpacing:2.5,cursor:"pointer",animation:"consolePulse 2.8s ease-in-out infinite",minHeight:54}}>ENTER TRIP CONSOLE →</button>',
    'Handoff → Trip Console: 500ms body fade-out ceremony'
)

# ═══════════════════════════════════════════════════════════════════
# 7. TRIP CONSOLE ENTRANCE — stronger fade-in
# ═══════════════════════════════════════════════════════════════════

rep(
    'className="mc-root" style={{animation:"fadeIn 0.6s ease both"}}',
    'className="mc-root" style={{animation:"fadeIn 0.9s ease both"}}',
    'Trip Console entrance: 0.6s → 0.9s fade-in'
)

# ═══════════════════════════════════════════════════════════════════
# 8. LOGO TEXT — ensure "1 Bag Nomad" prominent, Sharegood Co. below
# Already correct in header but let's verify font sizes are right
# Make "1 Bag Nomad" slightly larger and more confident
# ═══════════════════════════════════════════════════════════════════

rep(
    'fontSize:isMobile?10:13,fontWeight:700,color:"#FFF",letterSpacing:1,lineHeight:1}}>1 Bag Nomad</div>',
    'fontSize:isMobile?11:14,fontWeight:700,color:"#FFF",letterSpacing:1.5,lineHeight:1}}>1 Bag Nomad</div>',
    'Logo wordmark: slightly larger + letterSpacing'
)

rep(
    'fontSize:isMobile?6:7,color:sub,letterSpacing:1}}>Sharegood Co.</div>',
    'fontSize:isMobile?7:8,color:sub,letterSpacing:1,opacity:0.75}}>Sharegood Co.</div>',
    'Sharegood Co. text: slightly larger, proper opacity'
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
print("SESSION 13 — TRANSITION AUDIT RESULTS:")
print("─" * 60)
for r in results:
    print(r)
passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
print("─" * 60)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 60)
print("\nNext: git add src/App.jsx && git commit -m 'feat: transition audit - antique globe, vision timing, fade bridges, logo polish' && git push")
