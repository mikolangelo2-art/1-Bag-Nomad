#!/usr/bin/env python3
"""
1 BAG NOMAD — Session 12 · Quiet Luxury Polish Pass
Both consoles — typography, spacing, hierarchy, crowding
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()

original = content
results = []

# ═══════════════════════════════════════════════════════════════
# TRIP CONSOLE — PHASE CARDS
# ═══════════════════════════════════════════════════════════════

# ── P1: Phase card budget — too heavy, should support not dominate
# $3,405 at fontWeight:900 → 700, slightly smaller
old = '''          <div style={{fontSize:isMobile?13:16,fontWeight:900,color:"#FFD93D",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>{fmt(phase.totalBudget)}</div>
          <div style={{fontSize:isMobile?9:15,color:"rgba(255,255,255,0.6)",fontFamily:"monospace",whiteSpace:"nowrap"}}>{isPast?"DONE":isNow?"ACTIVE":`${dUntil}d`}</div>'''
new = '''          <div style={{fontSize:isMobile?12:15,fontWeight:600,color:"#FFD93D",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>{fmt(phase.totalBudget)}</div>
          <div style={{fontSize:isMobile?9:11,color:"rgba(255,255,255,0.45)",fontFamily:"monospace",whiteSpace:"nowrap",letterSpacing:0.5}}>{isPast?"DONE":isNow?"ACTIVE":`${dUntil}d`}</div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  P1 — Phase budget: 900→600, recedes behind content")
else:
    results.append("❌  P1 — Phase budget weight")

# ── P2: Phase card country name — too heavy at fontWeight:700
old = '''            <span style={{fontSize:isMobile?13:15,fontWeight:700,color:open?phase.color:"#FFF",fontFamily:"'Space Mono',monospace",transition:"color 0.2s"}}>{phase.name}</span>'''
new = '''            <span style={{fontSize:isMobile?13:15,fontWeight:600,color:open?phase.color:"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace",transition:"color 0.2s"}}>{phase.name}</span>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  P2 — Phase name: 700→600, softer white")
else:
    results.append("❌  P2 — Phase name weight")

# ── P3: "2 SEGMENTS · TAP TO EXPAND" — too loud, make it a whisper
old = '''            <span style={{fontSize:15,color:phase.color,letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>{phase.segments.length} SEGMENT{phase.segments.length>1?"S":""}</span>
            <span style={{fontSize:isMobile?8:11,color:`${phase.color}66`,letterSpacing:0,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>· TAP TO EXPAND</span>'''
new = '''            <span style={{fontSize:10,color:`${phase.color}cc`,letterSpacing:1.5,fontFamily:"'Space Mono',monospace",fontWeight:600,whiteSpace:"nowrap"}}>{phase.segments.length} SEGMENT{phase.segments.length>1?"S":""}</span>
            <span style={{fontSize:9,color:`${phase.color}44`,letterSpacing:0,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>· TAP TO EXPAND</span>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  P3 — Segments label: quieter, smaller, whisper feel")
else:
    results.append("❌  P3 — Segments label")

# ── P4: Progress bar % label — was showing, tone down
old = '''            <span style={{fontSize:8,color:`${phase.color}99`,fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap"}}>{pct}%</span>'''
new = '''            <span style={{fontSize:8,color:`${phase.color}66`,fontFamily:"monospace",fontWeight:400,whiteSpace:"nowrap"}}>{pct}%</span>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  P4 — Progress % label: lighter weight + opacity")
else:
    results.append("❌  P4 — Progress label")

# ═══════════════════════════════════════════════════════════════
# TRIP CONSOLE — SEGMENT ROWS
# ═══════════════════════════════════════════════════════════════

# ── S1: Segment name — 12px 600 is good, but DIVE badge oversized
old = '''              <span style={{fontSize:9,color:tc,background:`${tc}14`,border:`1px solid ${tc}28`,borderRadius:8,padding:"1px 6px",letterSpacing:0.5,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>{segment.type?.toUpperCase()}</span>'''
new = '''              <span style={{fontSize:8,color:`${tc}bb`,background:`${tc}0e`,border:`1px solid ${tc}1e`,borderRadius:6,padding:"1px 5px",letterSpacing:0.5,fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>{segment.type?.toUpperCase()}</span>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  S1 — Type badge: smaller, subtler, less border pop")
else:
    results.append("❌  S1 — Type badge")

# ── S2: Segment budget — $1,435 competing with phase total
old = '''            <div style={{fontSize:12,fontWeight:700,color:"#FFD93D",fontFamily:"'Space Mono',monospace"}}>{fmt(segment.budget)}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"monospace"}}>{fmt(Math.round(segment.budget/Math.max(segment.nights,1)))}/n</div>'''
new = '''            <div style={{fontSize:11,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Space Mono',monospace"}}>{fmt(segment.budget)}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",fontFamily:"monospace"}}>{fmt(Math.round(segment.budget/Math.max(segment.nights,1)))}/n</div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  S2 — Segment budget: lighter, recedes from phase total")
else:
    results.append("❌  S2 — Segment budget")

# ── S3: Segment chevron circle — too prominent
old = '''          <div style={{width:18,height:18,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.28":"0.18"})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:4}}>
            <span style={{fontSize:15,color:open?"#00E5FF":"rgba(255,255,255,0.75)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▼</span>
          </div>'''
new = '''          <div style={{width:16,height:16,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.15":"0.08"})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:4}}>
            <span style={{fontSize:8,color:open?"#00E5FF":"rgba(255,255,255,0.4)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▼</span>
          </div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  S3 — Segment chevron: smaller, quieter")
else:
    results.append("❌  S3 — Segment chevron")

# ── S4: ASK button — reduce visual noise slightly
old = '''      <button onClick={e=>{e.stopPropagation();setAskOpen(o=>!o);}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:"8px 10px",background:askOpen?"rgba(255,217,61,0.1)":"rgba(255,217,61,0.03)",border:"none",borderLeft:`1px solid rgba(255,217,61,${askOpen?"0.45":"0.22"})`,cursor:"pointer",flexShrink:0,height:"100%",minWidth:38,transition:"all 0.15s"}} title="Ask co-architect">
        <span style={{fontSize:15,color:askOpen?"#FFD93D":"rgba(255,217,61,0.65)",lineHeight:1,textShadow:askOpen?"0 0 8px rgba(255,217,61,0.6)":"none",animation:askOpen?"none":"glowPulse 2.5s ease-in-out infinite"}}>✦</span>
        <span style={{fontSize:15,color:askOpen?"#FFD93D":"rgba(255,217,61,0.55)",letterSpacing:1,fontFamily:"'Space Mono',monospace",fontWeight:700,whiteSpace:"nowrap"}}>ASK</span>'''
new = '''      <button onClick={e=>{e.stopPropagation();setAskOpen(o=>!o);}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:"8px 9px",background:askOpen?"rgba(255,217,61,0.08)":"transparent",border:"none",borderLeft:`1px solid rgba(255,217,61,${askOpen?"0.35":"0.14"})`,cursor:"pointer",flexShrink:0,height:"100%",minWidth:34,transition:"all 0.15s"}} title="Ask co-architect">
        <span style={{fontSize:12,color:askOpen?"#FFD93D":"rgba(255,217,61,0.55)",lineHeight:1,textShadow:askOpen?"0 0 8px rgba(255,217,61,0.5)":"none",animation:askOpen?"none":"glowPulse 2.5s ease-in-out infinite"}}>✦</span>
        <span style={{fontSize:8,color:askOpen?"#FFD93D":"rgba(255,217,61,0.4)",letterSpacing:1,fontFamily:"'Space Mono',monospace",fontWeight:600,whiteSpace:"nowrap"}}>ASK</span>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  S4 — ASK button: quieter, less border dominance")
else:
    results.append("❌  S4 — ASK button")

# ═══════════════════════════════════════════════════════════════
# TRIP CONSOLE — EXPEDITION VISION BLOCK
# ═══════════════════════════════════════════════════════════════

# ── V1: "✦ EXPEDITION VISION" label — too much letter-spacing
old = '''          <div style={{fontSize:15,color:"rgba(255,217,61,0.85)",letterSpacing:3,fontFamily:"'Space Mono',monospace",marginBottom:6}}>✦ EXPEDITION VISION</div>'''
new = '''          <div style={{fontSize:10,color:"rgba(255,217,61,0.6)",letterSpacing:2,fontFamily:"'Space Mono',monospace",marginBottom:6,fontWeight:400}}>✦ EXPEDITION VISION</div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  V1 — Vision label: smaller, quieter")
else:
    results.append("❌  V1 — Vision label")

# ── V2: Vision narrative text — 13/15 good, just reduce left border brightness
old = '''color:"rgba(255,255,255,0.75)",lineHeight:1.7,borderLeft:"2px solid rgba(255,217,61,0.3)",paddingLeft:10'''
new = '''color:"rgba(255,255,255,0.68)",lineHeight:1.75,borderLeft:"2px solid rgba(255,217,61,0.18)",paddingLeft:12'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  V2 — Vision narrative: softer border, slightly more line-height")
else:
    results.append("❌  V2 — Vision narrative")

# ═══════════════════════════════════════════════════════════════
# PACK CONSOLE — CATEGORY CARDS
# ═══════════════════════════════════════════════════════════════

# ── C1: Category name — 18px is too large on mobile
old = '''            <div style={{fontSize:18,fontWeight:700,color:open?cat.color:"#FFF",fontFamily:"'Space Mono',monospace",marginBottom:5,transition:"color 0.2s"}}>{cat.label}</div>'''
new = '''            <div style={{fontSize:15,fontWeight:600,color:open?cat.color:"rgba(255,255,255,0.9)",fontFamily:"'Space Mono',monospace",marginBottom:3,transition:"color 0.2s"}}>{cat.label}</div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  C1 — Category name: 18→15, 700→600")
else:
    results.append("❌  C1 — Category name")

# ── C2: Category meta (items count, weight, owned) — too large
old = '''              <span style={{fontSize:16,color:"rgba(255,255,255,0.65)",fontFamily:"monospace"}}>{catItems.length} item{catItems.length!==1?"s":""}</span>
              {catW>0&&<span style={{fontSize:15,color:cat.color,fontWeight:700,fontFamily:"monospace"}}>{catW.toFixed(2)}{unit}</span>}
              <span style={{fontSize:16,color:"rgba(255,255,255,0.55)",fontFamily:"monospace"}}>{ownedInCat}/{catItems.length} owned</span>'''
new = '''              <span style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"monospace"}}>{catItems.length} items</span>
              {catW>0&&<span style={{fontSize:11,color:cat.color,fontWeight:600,fontFamily:"monospace"}}>{catW.toFixed(1)}{unit}</span>}
              <span style={{fontSize:11,color:"rgba(255,255,255,0.38)",fontFamily:"monospace"}}>{ownedInCat}/{catItems.length} owned</span>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  C2 — Category meta: 16→11, recedes under label")
else:
    results.append("❌  C2 — Category meta")

# ── C3: Category cost — 900 weight too loud
old = '''          {catCost>0&&<div style={{fontSize:16,fontWeight:900,color:"#FFD93D",fontFamily:"'Space Mono',monospace"}}>${catCost.toLocaleString()}</div>}'''
new = '''          {catCost>0&&<div style={{fontSize:13,fontWeight:600,color:"rgba(255,217,61,0.8)",fontFamily:"'Space Mono',monospace"}}>${catCost.toLocaleString()}</div>}'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  C3 — Category cost: 16/900 → 13/600, softer gold")
else:
    results.append("❌  C3 — Category cost")

# ── C4: Category header padding — reduce vertical height
old = '''        <div onClick={()=>toggleCat(cat.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px",cursor:"pointer",minHeight:64,borderLeft:`3px solid ${open?cat.color:cat.color+"44"}`}}>
          <div style={{fontSize:22,flexShrink:0}}>{cat.icon}</div>'''
new = '''        <div onClick={()=>toggleCat(cat.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",minHeight:52,borderLeft:`3px solid ${open?cat.color:cat.color+"44"}`}}>
          <div style={{fontSize:18,flexShrink:0}}>{cat.icon}</div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  C4 — Category header: tighter padding, smaller icon")
else:
    results.append("❌  C4 — Category header padding")

# ── C5: "12 ITEMS · TAP TO EXPAND" — fix wrapping, reduce size
old = '''              <span style={{fontSize:15,color:cat.color,letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{catItems.length} ITEM{catItems.length!==1?"S":""} · TAP TO EXPAND</span>'''
new = '''              <span style={{fontSize:9,color:`${cat.color}aa`,letterSpacing:1.5,fontFamily:"'Space Mono',monospace",fontWeight:500,whiteSpace:"nowrap"}}>{catItems.length} ITEM{catItems.length!==1?"S":""} · TAP TO EXPAND</span>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  C5 — Items label: 15→9, nowrap, 700→500, no more wrapping")
else:
    results.append("❌  C5 — Items label")

# ═══════════════════════════════════════════════════════════════
# PACK CONSOLE — ITEM ROWS
# ═══════════════════════════════════════════════════════════════

# ── I1: OWNED/NEED badge — too large and dominant
old = '''              <div style={{padding:"5px 14px",borderRadius:10,background:item.owned?"rgba(105,240,174,0.08)":"rgba(196,87,30,0.1)",border:`1px solid ${item.owned?"rgba(105,240,174,0.3)":"rgba(196,87,30,0.3)"}`,fontSize:15,fontWeight:700,color:item.owned?"#69F0AE":"#C4571E",letterSpacing:0.5}}>{item.owned?"OWNED":"NEED"}</div>'''
new = '''              <div style={{padding:"3px 9px",borderRadius:8,background:item.owned?"rgba(105,240,174,0.06)":"rgba(196,87,30,0.07)",border:`1px solid ${item.owned?"rgba(105,240,174,0.2)":"rgba(196,87,30,0.22)"}`,fontSize:9,fontWeight:600,color:item.owned?"rgba(105,240,174,0.8)":"rgba(196,87,30,0.75)",letterSpacing:0.5,whiteSpace:"nowrap"}}>{item.owned?"OWNED":"NEED"}</div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  I1 — OWNED/NEED badge: smaller, subtler")
else:
    results.append("❌  I1 — OWNED/NEED badge")

# ── I2: Item name in row — good size, just ensure no truncation on expand
old = '''              <div style={{fontSize:13,fontWeight:600,color:item.owned?"rgba(105,240,174,0.85)":"#FFF",fontFamily:"'Space Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{item.name||"Unnamed"}</div>'''
new = '''              <div style={{fontSize:12,fontWeight:500,color:item.owned?"rgba(105,240,174,0.82)":"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{item.name||"Unnamed"}</div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  I2 — Item name: 13→12, 600→500, softer")
else:
    results.append("❌  I2 — Item name")

# ── I3: Item sub-meta (weight, cost, bag) — too large
old = '''                {parseFloat(item.weight)>0&&<span style={{fontSize:16,color:"rgba(255,255,255,0.65)",fontFamily:"monospace"}}>{(parseFloat(item.weight)*wM).toFixed(2)}{unit}</span>}
                {parseFloat(item.cost)>0&&<span style={{fontSize:15,color:"rgba(255,217,61,0.75)",fontFamily:"monospace"}}>${item.cost}</span>}
                <span style={{fontSize:15,color:BAG_C[item.bag]||"rgba(255,159,67,0.6)",fontFamily:"monospace"}}>{item.bag}</span>'''
new = '''                {parseFloat(item.weight)>0&&<span style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontFamily:"monospace"}}>{(parseFloat(item.weight)*wM).toFixed(1)}{unit}</span>}
                {parseFloat(item.cost)>0&&<span style={{fontSize:11,color:"rgba(255,217,61,0.55)",fontFamily:"monospace"}}>${item.cost}</span>}
                <span style={{fontSize:11,color:(BAG_C[item.bag]||"rgba(255,159,67,0.6)")+"aa",fontFamily:"monospace"}}>{item.bag}</span>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  I3 — Item meta (weight/cost/bag): 15-16→11, all recede")
else:
    results.append("❌  I3 — Item meta")

# ── I4: Item row chevron — too prominent
old = '''              <div style={{width:22,height:22,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:15,color:"rgba(255,255,255,0.6)",transform:open?"rotate(180deg)":"none",display:"inline-block",transition:"transform 0.2s"}}>▼</span>
              </div>'''
new = '''              <div style={{width:16,height:16,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:7,color:"rgba(255,255,255,0.35)",transform:open?"rotate(180deg)":"none",display:"inline-block",transition:"transform 0.2s"}}>▼</span>
              </div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  I4 — Item chevron: smaller, quieter")
else:
    results.append("❌  I4 — Item chevron")

# ── I5: Item row height — reduce minHeight for tighter list
old = '''          <div style={{display:"flex",alignItems:"center",minHeight:48,borderLeft:`2px solid ${catColor}${open?"88":"33"}`}}>'''
new = '''          <div style={{display:"flex",alignItems:"center",minHeight:44,borderLeft:`2px solid ${catColor}${open?"66":"22"}`}}>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  I5 — Item row: minHeight 48→44, softer left border")
else:
    results.append("❌  I5 — Item row minHeight")

# ── I6: Item row main content padding — slightly tighter
old = '''          <div onClick={()=>setOpen(o=>!o)} style={{flex:1,display:"flex",alignItems:"center",gap:12,padding:"12px 8px 12px 4px",cursor:"pointer",minWidth:0}}>'''
new = '''          <div onClick={()=>setOpen(o=>!o)} style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:"10px 8px 10px 4px",cursor:"pointer",minWidth:0}}>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  I6 — Item row padding: 12→10px top/bottom")
else:
    results.append("❌  I6 — Item row padding")

# ═══════════════════════════════════════════════════════════════
# PACK CONSOLE — HERO STATS
# ═══════════════════════════════════════════════════════════════

# ── H1: Mini stat labels — slightly too large
old = '''              <div style={{fontSize:isMobile?8:12,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:0,marginBottom:3,fontFamily:"'Space Mono',monospace",lineHeight:1.2}}>{s.label}</div>
              <div style={{fontSize:isMobile?13:20,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div>'''
new = '''              <div style={{fontSize:isMobile?7:11,fontWeight:500,color:"rgba(255,255,255,0.4)",letterSpacing:0,marginBottom:2,fontFamily:"'Space Mono',monospace",lineHeight:1.2}}>{s.label}</div>
              <div style={{fontSize:isMobile?12:18,fontWeight:600,color:s.color,fontFamily:"monospace"}}>{s.value}</div>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  H1 — Mini stats: label 8→7, value 13→12 mobile")
else:
    results.append("❌  H1 — Mini stats")

# ── H2: Hero stats padding — slightly tighter
old = '''      {!isFullscreen&&<div style={{padding:isMobile?"8px 14px 6px":"12px 20px 8px",background:"linear-gradient(180deg,rgba(35,14,0,0.6),rgba(20,8,0,0.8))"}}>'''
new = '''      {!isFullscreen&&<div style={{padding:isMobile?"6px 12px 5px":"10px 18px 7px",background:"linear-gradient(180deg,rgba(35,14,0,0.6),rgba(20,8,0,0.8))"}}>'''
if old in content:
    content = content.replace(old, new)
    results.append("✅  H2 — Hero stats section: tighter padding")
else:
    results.append("❌  H2 — Hero stats padding")

# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════
if content != original:
    with open('src/App.jsx', 'w') as f:
        f.write(content)
    print("\n📝 File written.\n")
else:
    print("\n⚠️  No changes made.\n")

print("─" * 60)
print("QUIET LUXURY POLISH RESULTS:")
print("─" * 60)
for r in results:
    print(r)

passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
print("─" * 60)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 60)
print("\nNext: git add src/App.jsx && git commit -m 'polish: quiet luxury pass - typography hierarchy, spacing, both consoles' && git push")
