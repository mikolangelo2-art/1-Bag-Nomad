#!/usr/bin/env python3
"""
Session 12 — SegmentDetails drawer polish
Labels too large/bold, fields cramped, section labels screaming
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()

original = content
results = []

def rep(old, new, label):
    global content
    if old in content:
        content = content.replace(old, new)
        results.append(f"✅  {label}")
    else:
        results.append(f"❌  {label}")

# ═══════════════════════════════════════════════════════
# SDF COMPONENT — field labels + inputs
# ═══════════════════════════════════════════════════════

# SDF label — currently 15px, letterSpacing:2.5, fontWeight:700 — way too loud
rep(
    'fontSize:15,color:`${accent}CC`,letterSpacing:2.5,fontFamily:"\'Space Mono\',monospace",fontWeight:700',
    'fontSize:9,color:`${accent}88`,letterSpacing:1.5,fontFamily:"\'Space Mono\',monospace",fontWeight:500',
    'SDF label: 15→9, 700→500, opacity CC→88'
)

# SDF input padding — too much vertical height
rep(
    'padding:multiline?"8px 10px":"7px 10px"',
    'padding:multiline?"7px 9px":"6px 9px"',
    'SDF input: padding tighter'
)

# SDF input font size
rep(
    'fontSize:15,padding:multiline?"8px 10px":"7px 10px"',
    'fontSize:13,padding:multiline?"7px 9px":"6px 9px"',
    'SDF input: fontSize 15→13'
)

# ═══════════════════════════════════════════════════════
# SEGMENT DETAIL TABS — category tab labels
# ═══════════════════════════════════════════════════════

# Tab labels inside SegmentDetails (TRANSPORT, STAY etc) — currently 9px good but check
# The issue is the overall section padding
rep(
    'padding:"14px 16px",display:"flex",flexDirection:"column",gap:9',
    'padding:"10px 12px",display:"flex",flexDirection:"column",gap:7',
    'Section padding: 14/16→10/12, gap 9→7 (transport)'
)

# Stay section
rep(
    '{cat==="stay"&&<div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>',
    '{cat==="stay"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>',
    'Stay section padding tighter'
)

# Food section  
rep(
    '{cat==="food"&&<div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>',
    '{cat==="food"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>',
    'Food section padding tighter'
)

# Intel section
rep(
    '{cat==="intel"&&<div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>',
    '{cat==="intel"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>',
    'Intel section padding tighter'
)

# ═══════════════════════════════════════════════════════
# ACTIVITIES SECTION — ADD ACTIVITY header too loud
# ═══════════════════════════════════════════════════════
rep(
    'fontSize:15,color:"rgba(255,217,61,0.5)",letterSpacing:2,marginBottom:8,fontFamily:"\'Space Mono\',monospace",fontWeight:700}}>ADD ACTIVITY',
    'fontSize:9,color:"rgba(255,217,61,0.4)",letterSpacing:1.5,marginBottom:6,fontFamily:"\'Space Mono\',monospace",fontWeight:500}}>ADD ACTIVITY',
    'ADD ACTIVITY label: 15→9, quieter'
)

# ADD ACTIVITY section padding
rep(
    'background:"rgba(255,217,61,0.02)",border:"1px dashed rgba(255,217,61,0.16)",borderRadius:8,padding:"11px 12px"',
    'background:"rgba(255,217,61,0.02)",border:"1px dashed rgba(255,217,61,0.12)",borderRadius:8,padding:"9px 10px"',
    'ADD ACTIVITY section: tighter padding, softer border'
)

# ADD EXPENSE label (misc)
rep(
    'fontSize:15,color:"rgba(162,155,254,0.5)",letterSpacing:2,marginBottom:8,fontFamily:"\'Space Mono\',monospace",fontWeight:700}}>ADD EXPENSE',
    'fontSize:9,color:"rgba(162,155,254,0.4)",letterSpacing:1.5,marginBottom:6,fontFamily:"\'Space Mono\',monospace",fontWeight:500}}>ADD EXPENSE',
    'ADD EXPENSE label: quieter'
)

# ═══════════════════════════════════════════════════════
# ACTIVITIES tab outer padding
# ═══════════════════════════════════════════════════════
rep(
    '{cat==="activities"&&<div style={{padding:"14px 16px"}}>',
    '{cat==="activities"&&<div style={{padding:"10px 12px"}}>',
    'Activities section padding tighter'
)

rep(
    '{cat==="misc"&&<div style={{padding:"14px 16px"}}>',
    '{cat==="misc"&&<div style={{padding:"10px 12px"}}>',
    'Misc section padding tighter'
)

# ═══════════════════════════════════════════════════════
# FOOD — AI EST button + daily budget row
# ═══════════════════════════════════════════════════════
rep(
    'padding:"7px 13px",borderRadius:6,border:"1px solid rgba(255,159,67,0.4)",background:"rgba(255,159,67,0.07)",color:"#FF9F43",fontSize:15,cursor:aiLoad?"wait":"pointer",fontFamily:"\'Space Mono\',monospace",letterSpacing:1,fontWeight:700,whiteSpace:"nowrap",height:32,flexShrink:0',
    'padding:"5px 10px",borderRadius:5,border:"1px solid rgba(255,159,67,0.3)",background:"rgba(255,159,67,0.05)",color:"rgba(255,159,67,0.8)",fontSize:9,cursor:aiLoad?"wait":"pointer",fontFamily:"\'Space Mono\',monospace",letterSpacing:1,fontWeight:600,whiteSpace:"nowrap",height:28,flexShrink:0',
    'AI EST button: smaller, quieter'
)

# Food calc row — nights × $/day
rep(
    'fontSize:15,color:"rgba(255,255,255,0.4)",fontFamily:"monospace"',
    'fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:"monospace"',
    'Food calc label: 15→10'
)
rep(
    'fontSize:15,fontWeight:700,color:"#FFD93D",fontFamily:"monospace"',
    'fontSize:11,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"monospace"',
    'Food calc value: 15→11, 700→600'
)

# ═══════════════════════════════════════════════════════
# ACTIVITY LIST items — dates/costs too large
# ═══════════════════════════════════════════════════════
rep(
    'fontSize:15,color:"#FFF",fontFamily:"\'Space Mono\',monospace",marginBottom:2',
    'fontSize:12,color:"rgba(255,255,255,0.88)",fontFamily:"\'Space Mono\',monospace",marginBottom:2',
    'Activity item name: 15→12'
)
rep(
    'fontSize:15,color:"rgba(255,255,255,0.38)",display:"flex",gap:8,flexWrap:"wrap"',
    'fontSize:10,color:"rgba(255,255,255,0.35)",display:"flex",gap:6,flexWrap:"wrap"',
    'Activity item meta: 15→10'
)

# Activity total row
rep(
    'fontSize:15,color:"rgba(255,255,255,0.28)",fontFamily:"monospace",letterSpacing:1}}>TOTAL ACTIVITIES',
    'fontSize:9,color:"rgba(255,255,255,0.25)",fontFamily:"monospace",letterSpacing:1}}>TOTAL ACTIVITIES',
    'Activities total label: 15→9'
)
rep(
    'fontSize:15,fontWeight:700,color:"#FFD93D",fontFamily:"monospace"}}>${det.activities',
    'fontSize:11,fontWeight:600,color:"rgba(255,217,61,0.8)",fontFamily:"monospace"}}>${det.activities',
    'Activities total value: 15→11'
)

# Misc total row
rep(
    'fontSize:15,color:"rgba(255,255,255,0.28)",fontFamily:"monospace",letterSpacing:1}}>TOTAL MISC',
    'fontSize:9,color:"rgba(255,255,255,0.25)",fontFamily:"monospace",letterSpacing:1}}>TOTAL MISC',
    'Misc total label: 15→9'
)
rep(
    'fontSize:15,fontWeight:700,color:"#A29BFE",fontFamily:"monospace"}}>${det.misc',
    'fontSize:11,fontWeight:600,color:"rgba(162,155,254,0.8)",fontFamily:"monospace"}}>${det.misc',
    'Misc total value: 15→11'
)

# ═══════════════════════════════════════════════════════
# SEGMENT DETAIL TAB BAR — reduce tab height
# ═══════════════════════════════════════════════════════
rep(
    'padding:"9px 4px",border:"none",cursor:"pointer"',
    'padding:"7px 4px",border:"none",cursor:"pointer"',
    'Tab bar: padding 9→7px'
)

# ═══════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════
if content != original:
    with open('src/App.jsx', 'w') as f:
        f.write(content)
    print("\n📝 File written.\n")
else:
    print("\n⚠️  No changes.\n")

print("─" * 55)
passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
for r in results:
    print(r)
print("─" * 55)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 55)
print("\nNext: git add src/App.jsx && git commit -m 'polish: SegmentDetails drawer - labels, padding, crowding' && git push")
