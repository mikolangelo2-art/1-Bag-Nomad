#!/usr/bin/env python3
"""
Session 13 Fix Round 4 — Strip back, get clean
1. Remove mounted opacity hack from HandoffScreen (was causing black screen)
2. Revert globe to original Sharegood logo (was fine, repetition was the issue)
   Instead: use the logo on generation screen, antique globe ONLY on handoff ph0/ph1
3. Fix phase card Row 2 font sizes — dates/nights/dives too small
4. Clean up the dream fadeOut — it's working but interfering
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
# 1. REMOVE mounted opacity hack from HandoffScreen — main black screen cause
# ═══════════════════════════════════════════════════════════════════

rep(
    'const [ph,setPh]=useState(0),[lit,setLit]=useState(0);\n  const [mounted,setMounted]=useState(false);\n  useEffect(()=>{window.scrollTo(0,0);const t=setTimeout(()=>setMounted(true),50);return()=>clearTimeout(t);},[]);\n  useEffect(()=>{const ts=[',
    'const [ph,setPh]=useState(0),[lit,setLit]=useState(0);\n  useEffect(()=>{window.scrollTo(0,0);},[]);\n  useEffect(()=>{const ts=[',
    'HandoffScreen: removed mounted opacity hack (was black screen cause)'
)

rep(
    '<div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"\'Space Mono\',monospace",overflow:"hidden",opacity:mounted?1:0,transition:"opacity 0.4s ease"}}>',
    '<div style={{position:"fixed",inset:0,zIndex:9999,fontFamily:"\'Space Mono\',monospace",overflow:"hidden",animation:"fadeIn 0.5s ease"}}>',
    'HandoffScreen root: simple CSS fadeIn instead of JS opacity'
)

# ═══════════════════════════════════════════════════════════════════
# 2. GENERATION SCREEN — restore Sharegood logo (clean, already animated)
# ═══════════════════════════════════════════════════════════════════

rep(
    '<AntiqueGlobe size={180} glowColor="rgba(0,180,255,0.5)" animate={true}/>',
    '<SharegoodLogo size={180} animate={false} glowColor="rgba(169,70,29,0.52)" opacity={0.9}/>',
    'Generation screen: restore Sharegood logo'
)

# ═══════════════════════════════════════════════════════════════════
# 3. PHASE CARD — Row 2 font size fix
# dates/nights/dives in Row 2 currently at fontSize:10 — too small
# Should match Row 1 hierarchy — readable but supporting
# ═══════════════════════════════════════════════════════════════════

rep(
    '{/* Row 2: date · nights · dives · days-away · progress */}\n          <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:28,flexWrap:"nowrap"}}}>\n            <span style={{fontSize:10,color:"rgba(255,255,255,0.62)",fontFamily:"\'Space Mono\',monospace",fontWeight:500,whiteSpace:"nowrap"}}>{fD(phase.arrival)}&ndash;{fD(phase.departure)}</span>\n            <span style={{fontSize:10,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights}n</span>',
    '{/* Row 2: date · nights · dives · days-away · progress */}\n          <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:28,flexWrap:"nowrap"}}}>\n            <span style={{fontSize:isMobile?12:13,color:"rgba(255,255,255,0.78)",fontFamily:"\'Space Mono\',monospace",fontWeight:500,whiteSpace:"nowrap"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>\n            <span style={{fontSize:isMobile?12:13,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights}n</span>',
    'Phase card Row 2: date 10→12/13, nights 10→12/13'
)

rep(
    '{phase.totalDives>0&&<span style={{fontSize:10,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}\n            {pct>0&&<div style={{width:isMobile?40:80',
    '{phase.totalDives>0&&<span style={{fontSize:isMobile?12:13,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}\n            {pct>0&&<div style={{width:isMobile?40:80',
    'Phase card Row 2: dives 10→12/13'
)

rep(
    '<span style={{fontSize:9,color:"rgba(255,255,255,0.25)",fontFamily:"monospace",whiteSpace:"nowrap",marginLeft:"auto",flexShrink:0}}>{isPast?"done":isNow?"active":`${dUntil}d`}</span>',
    '<span style={{fontSize:isMobile?10:11,color:"rgba(255,255,255,0.35)",fontFamily:"monospace",whiteSpace:"nowrap",marginLeft:"auto",flexShrink:0}}>{isPast?"done":isNow?"active":`${dUntil}d`}</span>',
    'Phase card Row 2: days-away 9→10/11'
)

# ═══════════════════════════════════════════════════════════════════
# 4. DREAM FADEOUT — simplify to not block the build
# The async await is causing the delay — remove the await
# ═══════════════════════════════════════════════════════════════════

rep(
    'async function handleReveal() {\n    if(!canLaunch||loading)return;\n    setFadeOut(true);\n    await new Promise(r=>setTimeout(r,350));\n    setLoading(true);setLoadError(false);',
    'async function handleReveal() {\n    if(!canLaunch||loading)return;\n    setLoading(true);setLoadError(false);setFadeOut(true);',
    'Dream fadeout: removed blocking await, runs simultaneously with loading'
)

# ═══════════════════════════════════════════════════════════════════
# 5. HANDOFF — keep AntiqueGlobe on phases 0 and 1 (that part was good)
# Just make sure glow colors are right for the Earth globe
# ═══════════════════════════════════════════════════════════════════

# Phase 0 amber glow for Earth globe — warm transition from dream world
rep(
    '<AntiqueGlobe size={isMobile?80:110} glowColor="rgba(201,168,76,0.65)" animate={true}/>',
    '<AntiqueGlobe size={isMobile?80:110} glowColor="rgba(0,160,220,0.55)" animate={true}/>',
    'Handoff ph0: globe glow color updated to match Earth palette'
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
print("SESSION 13 FIX ROUND 4:")
print("─" * 60)
for r in results:
    print(r)
passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
print("─" * 60)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 60)
print("\nNext: git add src/App.jsx && git commit -m 'fix: black screen, phase card dates, generation logo, cleaner transitions' && git push")
