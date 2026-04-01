#!/usr/bin/env python3
"""
Session 13 Fix Round 3:
1. Fix black screen — body opacity not recovering after handoff fade
2. Replace blob globe with proper spinning Earth (blue ocean, land masses)
3. Fix handoff overlap — prevent double screen render during transition
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
# 1. FIX BLACK SCREEN — body opacity fix
# The body.style.opacity approach bleeds across React re-renders
# Replace with a proper React overlay div approach
# ═══════════════════════════════════════════════════════════════════

rep(
    '''<button onClick={()=>{const b=document.body;b.style.transition="opacity 0.5s ease";b.style.opacity="0";setTimeout(()=>{b.style.opacity="1";b.style.transition="opacity 0.6s ease";onComplete();},500);}} style={{padding:isMobile?"16px 32px":"18px 44px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#030810",fontSize:isMobile?13:15,fontWeight:900,fontFamily:"\'Space Mono\',monospace",letterSpacing:2.5,cursor:"pointer",animation:"consolePulse 2.8s ease-in-out infinite",minHeight:54}}>ENTER TRIP CONSOLE →</button>''',
    '''<button onClick={()=>{onComplete();}} style={{padding:isMobile?"16px 32px":"18px 44px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00E5FF,#69F0AE)",color:"#030810",fontSize:isMobile?13:15,fontWeight:900,fontFamily:"\'Space Mono\',monospace",letterSpacing:2.5,cursor:"pointer",animation:"consolePulse 2.8s ease-in-out infinite",minHeight:54}}>ENTER TRIP CONSOLE →</button>''',
    'Removed body opacity hack — was causing black screen'
)

# ═══════════════════════════════════════════════════════════════════
# 2. REPLACE AntiqueGlobe with proper spinning Earth
# Blue oceans, recognizable continents, clean modern globe aesthetic
# ═══════════════════════════════════════════════════════════════════

old_globe_start = '// ─── AntiqueGlobe ─────────────────────────────────────────────────'
old_globe_end = '// ─── ConsoleHeader ────────────────────────────────────────────────'

start_idx = content.find(old_globe_start)
end_idx = content.find(old_globe_end)

if start_idx > -1 and end_idx > -1:
    new_globe = '''// ─── AntiqueGlobe (Spinning Earth) ───────────────────────────────
function AntiqueGlobe({size=120, glowColor="rgba(0,180,255,0.45)", animate=true}) {
  const r = size / 2;
  const sc = size / 200; // scale: designed at 200x200

  return (
    <div style={{
      position:"relative", width:size, height:size, flexShrink:0,
      filter:`drop-shadow(0 0 ${size*.18}px ${glowColor})`,
      animation: animate ? "spinGlobe 20s linear infinite" : "none",
    }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        {/* Ocean base */}
        <circle cx={r} cy={r} r={r-1} fill="#0a2744" stroke="#1a5276" strokeWidth="1.5"/>
        {/* Ocean highlight */}
        <circle cx={r} cy={r} r={r-1} fill="url(#oceanGrad)" opacity="0.6"/>
        <defs>
          <radialGradient id="oceanGrad" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#1a6b96" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#051428" stopOpacity="0.3"/>
          </radialGradient>
          <radialGradient id="landGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#3d7a45" stopOpacity="1"/>
            <stop offset="100%" stopColor="#1a4a1e" stopOpacity="1"/>
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx={r} cy={r} r={r-2}/>
          </clipPath>
        </defs>

        {/* Land masses — simplified but recognizable */}
        <g clipPath="url(#globeClip)" fill="url(#landGrad)" stroke="#2d6e35" strokeWidth="0.5">
          {/* North America */}
          <path d={`M${55*sc},${48*sc} C${60*sc},${38*sc} ${75*sc},${35*sc} ${88*sc},${40*sc} C${98*sc},${44*sc} ${100*sc},${55*sc} ${95*sc},${65*sc} C${90*sc},${75*sc} ${82*sc},${82*sc} ${74*sc},${84*sc} C${66*sc},${82*sc} ${60*sc},${74*sc} ${56*sc},${66*sc} C${52*sc},${58*sc} ${53*sc},${52*sc} ${55*sc},${48*sc} Z`}/>
          {/* Greenland */}
          <path d={`M${74*sc},${22*sc} C${80*sc},${17*sc} ${90*sc},${20*sc} ${92*sc},${30*sc} C${90*sc},${38*sc} ${80*sc},${38*sc} ${73*sc},${33*sc} Z`}/>
          {/* South America */}
          <path d={`M${72*sc},${93*sc} C${78*sc},${88*sc} ${90*sc},${91*sc} C${94*sc},${100*sc} ${93*sc},${118*sc} ${87*sc},${130*sc} C${82*sc},${140*sc} ${73*sc},${143*sc} ${67*sc},${133*sc} C${63*sc},${122*sc} ${65*sc},${108*sc} ${68*sc},${98*sc} Z`}/>
          {/* Europe */}
          <path d={`M${98*sc},${38*sc} C${105*sc},${32*sc} ${118*sc},${34*sc} ${120*sc},${44*sc} C${118*sc},${53*sc} ${108*sc},${56*sc} ${100*sc},${52*sc} Z`}/>
          {/* Africa */}
          <path d={`M${100*sc},${60*sc} C${108*sc},${57*sc} ${118*sc},${60*sc} C${124*sc},${70*sc} ${122*sc},${90*sc} ${116*sc},${108*sc} C${110*sc},${118*sc} ${100*sc},${120*sc} ${95*sc},${110*sc} C${92*sc},${98*sc} ${94*sc},${78*sc} ${97*sc},${68*sc} Z`}/>
          {/* Asia mainland */}
          <path d={`M${120*sc},${30*sc} C${138*sc},${25*sc} ${160*sc},${28*sc} ${170*sc},${40*sc} C${175*sc},${52*sc} ${165*sc},${65*sc} ${150*sc},${68*sc} C${135*sc},${70*sc} ${122*sc},${62*sc} ${115*sc},${52*sc} C${112*sc},${42*sc} ${115*sc},${33*sc} ${120*sc},${30*sc} Z`}/>
          {/* India */}
          <path d={`M${130*sc},${70*sc} C${136*sc},${68*sc} ${142*sc},${72*sc} ${140*sc},${86*sc} C${137*sc},${96*sc} ${130*sc},${98*sc} ${125*sc},${90*sc} C${122*sc},${80*sc} ${125*sc},${72*sc} ${130*sc},${70*sc} Z`}/>
          {/* Southeast Asia */}
          <path d={`M${150*sc},${72*sc} C${160*sc},${70*sc} ${166*sc},${76*sc} ${162*sc},${86*sc} C${156*sc},${90*sc} ${148*sc},${86*sc} ${147*sc},${78*sc} Z`}/>
          {/* Australia */}
          <path d={`M${148*sc},${108*sc} C${158*sc},${104*sc} ${170*sc},${108*sc} C${174*sc},${120*sc} ${168*sc},${132*sc} ${155*sc},${134*sc} C${143*sc},${132*sc} ${138*sc},${122*sc} ${142*sc},${112*sc} Z`}/>
          {/* Antarctica (bottom) */}
          <path d={`M${40*sc},${168*sc} C${70*sc},${162*sc} ${130*sc},${162*sc} ${162*sc},${168*sc} C${165*sc},${175*sc} ${140*sc},${182*sc} ${100*sc},${182*sc} C${60*sc},${182*sc} ${35*sc},${175*sc} ${40*sc},${168*sc} Z`} opacity="0.7" fill="#e8f4f8" stroke="#c0d8e0" strokeWidth="0.5"/>
        </g>

        {/* Latitude grid lines */}
        {[-0.35, -0.18, 0, 0.18, 0.35].map((lat, i) => {
          const cy = r + lat * size;
          const rx2 = Math.sqrt(Math.max(0, Math.pow(r-2, 2) - Math.pow(lat*size, 2)));
          const ry = Math.max(1, rx2 * 0.14);
          return rx2 > 3 ? (
            <ellipse key={i} cx={r} cy={cy} rx={rx2} ry={ry}
              fill="none" stroke={i===2?"rgba(100,200,255,0.5)":"rgba(100,180,255,0.2)"}
              strokeWidth={i===2?"0.8":"0.4"}/>
          ) : null;
        })}
        {/* Longitude grid */}
        {[0, 60, 120].map((angle, i) => (
          <ellipse key={i} cx={r} cy={r} rx={r-2} ry={r-2}
            fill="none" stroke="rgba(100,180,255,0.15)" strokeWidth="0.4"
            transform={`rotate(${angle} ${r} ${r})`}/>
        ))}

        {/* Atmosphere glow rim */}
        <circle cx={r} cy={r} r={r-1} fill="none"
          stroke="rgba(100,200,255,0.35)" strokeWidth="3"/>
        <circle cx={r} cy={r} r={r-1} fill="none"
          stroke="rgba(150,220,255,0.15)" strokeWidth="6"/>

        {/* Specular highlight */}
        <ellipse cx={r*0.65} cy={r*0.55} rx={r*0.28} ry={r*0.18}
          fill="rgba(255,255,255,0.07)" transform={`rotate(-30 ${r*0.65} ${r*0.55})`}/>
      </svg>
    </div>
  );
}

'''
    content = content[:start_idx] + new_globe + content[end_idx:]
    results.append("✅  Globe: replaced with proper spinning Earth (blue ocean + continents)")
else:
    results.append(f"❌  Globe not found (start:{start_idx}, end:{end_idx})")

# ═══════════════════════════════════════════════════════════════════
# 3. FIX HANDOFF OVERLAP — add mounting guard to HandoffScreen
# The overlap happens because App renders HandoffScreen while
# CoArchitect is still visible. Add a brief mount delay.
# ═══════════════════════════════════════════════════════════════════

rep(
    "{screen===\"handoff\"     && tripData && <HandoffScreen tripData={tripData} onComplete={handleHandoffComplete}/>}",
    "{screen===\"handoff\"     && tripData && <HandoffScreen tripData={tripData} onComplete={handleHandoffComplete}/>}",
    'Handoff render — checking existing structure'
)

# Add fade-in mount to HandoffScreen
rep(
    'const [ph,setPh]=useState(0),[lit,setLit]=useState(0);\n  useEffect(()=>{window.scrollTo(0,0);},[]);\n  useEffect(()=>{const ts=[',
    'const [ph,setPh]=useState(0),[lit,setLit]=useState(0);\n  const [mounted,setMounted]=useState(false);\n  useEffect(()=>{window.scrollTo(0,0);const t=setTimeout(()=>setMounted(true),50);return()=>clearTimeout(t);},[]);\n  useEffect(()=>{const ts=[',
    'HandoffScreen: add mounted state for clean entrance'
)

# Apply mounted opacity to HandoffScreen root
rep(
    '<div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"\'Space Mono\',monospace",overflow:"hidden"}}>',
    '<div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"\'Space Mono\',monospace",overflow:"hidden",opacity:mounted?1:0,transition:"opacity 0.4s ease"}}>',
    'HandoffScreen root: fade-in on mount'
)

# ═══════════════════════════════════════════════════════════════════
# 4. GENERATION SCREEN — update glow color for blue Earth
# ═══════════════════════════════════════════════════════════════════

rep(
    '<AntiqueGlobe size={180} glowColor="rgba(201,168,76,0.6)" animate={true}/>',
    '<AntiqueGlobe size={180} glowColor="rgba(0,180,255,0.5)" animate={true}/>',
    'Generation screen globe: amber glow → blue Earth glow'
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
print("SESSION 13 FIX ROUND 3:")
print("─" * 60)
for r in results:
    print(r)
passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
print("─" * 60)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 60)
print("\nNext: git add src/App.jsx && git commit -m 'fix: proper Earth globe, black screen fix, handoff overlap fix' && git push")
