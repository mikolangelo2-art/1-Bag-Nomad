#!/usr/bin/env python3
"""
Session 13 — FINAL FIX
1. Remove fadeOut state entirely — it's causing the black screen gap
2. Fix GenerationScreen to start visible immediately (no ph delay)
3. Vision quote — extend to 5 seconds before stats appear
4. Globe emoji 🌍 on ENTER TRIP CONSOLE button
5. Scroll to top on CoArchitect
6. Keep Handoff phases 0/1 globe, phase 2 logo
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
# 1. REMOVE fadeOut entirely — it's the black screen cause
# ═══════════════════════════════════════════════════════════════════

# Remove fadeOut state declaration
rep(
    '[heroPhase,setHeroPhase]=useState(0);\n  const [loading,setLoading]=useState(false);\n  const [fadeOut,setFadeOut]=useState(false);',
    '[heroPhase,setHeroPhase]=useState(0);\n  const [loading,setLoading]=useState(false);',
    'Removed fadeOut state'
)

# Remove fadeOut usage in handleReveal
rep(
    'setLoading(true);setLoadError(false);setFadeOut(true);',
    'setLoading(true);setLoadError(false);',
    'Removed setFadeOut(true) from handleReveal'
)

# Remove fadeOut from dream-root style
rep(
    'className="dream-root" style={{opacity:fadeOut?0:1,transition:"opacity 0.35s ease"}}>',
    'className="dream-root">',
    'Removed fadeOut opacity from dream-root'
)

# ═══════════════════════════════════════════════════════════════════
# 2. GENERATION SCREEN — start fully visible, no entrance delay
# Currently ph starts at 0 and content fades in at ph>=1 (after 400ms)
# Fix: start ph at 1 so content is immediately visible
# ═══════════════════════════════════════════════════════════════════

rep(
    'const [ph,setPh]=useState(0),[prog,setProg]=useState(0),[mi,setMi]=useState(0);\n  const msgs=["Reading your vision...","Mapping the route...","Calculating phases...","Bringing it to life..."];\n  useEffect(()=>{\n    const ts=[setTimeout(()=>setPh(1),400),',
    'const [ph,setPh]=useState(1),[prog,setProg]=useState(0),[mi,setMi]=useState(0);\n  const msgs=["Reading your vision...","Mapping the route...","Calculating phases...","Bringing it to life..."];\n  useEffect(()=>{\n    const ts=[setTimeout(()=>setPh(1),0),',
    'GenerationScreen: starts at ph=1 immediately visible'
)

# ═══════════════════════════════════════════════════════════════════
# 3. VISION REVEAL — give quote 5 full seconds to breathe
# Currently: narrativeDone → 3200ms → showStats
# Bump to 5000ms for a real pause
# ═══════════════════════════════════════════════════════════════════

rep(
    'setNarrativeDone(true);setTimeout(()=>setShowStats(true),3200);setTimeout(()=>setShowPhases(true),3800);}},13);',
    'setNarrativeDone(true);setTimeout(()=>setShowStats(true),5000);setTimeout(()=>setShowPhases(true),5600);}},13);',
    'Vision quote: 3.2s → 5s breathing room before stats'
)

# Also the refine path
rep(
    'setNarrativeDone(true);setTimeout(()=>setShowStats(true),3200);setTimeout(()=>setShowPhases(true),3800);',
    'setNarrativeDone(true);setTimeout(()=>setShowStats(true),5000);setTimeout(()=>setShowPhases(true),5600);',
    'Vision quote refine path: same 5s'
)

# ═══════════════════════════════════════════════════════════════════
# 4. ENTER TRIP CONSOLE — add 🌍 globe emoji
# ═══════════════════════════════════════════════════════════════════

rep(
    '>ENTER TRIP CONSOLE →</button>',
    '>🌍  ENTER TRIP CONSOLE →</button>',
    'Added 🌍 to ENTER TRIP CONSOLE button'
)

# ═══════════════════════════════════════════════════════════════════
# 5. COARCHITECT — scroll to top on mount (fixes defaulting to bottom)
# Already has useEffect(()=>{window.scrollTo(0,0);},[]);
# Check if it's there, add if not
# ═══════════════════════════════════════════════════════════════════

if 'useEffect(()=>{window.scrollTo(0,0);},[]);\n  useEffect(()=>{chatEnd' not in content:
    rep(
        'useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chat]);',
        'useEffect(()=>{window.scrollTo(0,0);},[]);\n  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chat]);',
        'CoArchitect: scroll to top on mount'
    )
else:
    results.append("✅  CoArchitect scroll already present")

# ═══════════════════════════════════════════════════════════════════
# 6. GENERATION SCREEN — use the full amber background from the start
# The bg radial gradient only shows after ph>=1 but now ph starts at 1
# Make sure the ambient glow is visible from mount
# ═══════════════════════════════════════════════════════════════════

rep(
    'opacity:ph>=1?1:0,transition:"opacity 0.6s ease"}}>{msgs[mi]}</div>',
    'opacity:1}}>{msgs[mi]}</div>',
    'GenerationScreen: message always visible'
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
print("SESSION 13 — FINAL FIX:")
print("─" * 60)
for r in results:
    print(r)
passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
print("─" * 60)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 60)
print("\nNext: git add src/App.jsx && git commit -m 'fix: remove fadeOut black screen, vision 5s pause, globe emoji, gen screen instant' && git push")
