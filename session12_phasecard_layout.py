#!/usr/bin/env python3
"""
Session 12 — PhaseCard mobile layout restructure
Problem: budget + icons + date all cramming into one flex row on mobile
Fix: proper 2-row layout — top row (number + name + budget), bottom row (date + nights + dives)
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()

original = content
results = []

# ── The PhaseCard inner content — restructure for clean 2-row mobile layout
# Find the main clickable div content area

old = '''        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",minHeight:62,borderLeft:`3px solid ${open?phase.color:phase.color+"50"}`}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:`${phase.color}14`,border:`1.5px solid ${phase.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:phase.color,fontFamily:"'Space Mono',monospace"}}>{phase.id}</div>
          <div style={{fontSize:13}}>{phase.flag}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
            <span style={{fontSize:isMobile?13:15,fontWeight:600,color:open?phase.color:"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace",transition:"color 0.2s"}}>{phase.name}</span>
            {isNow&&<span style={{fontSize:isMobile?9:15,color:"#69F0AE",background:"rgba(105,240,174,0.1)",border:"1px solid rgba(105,240,174,0.28)",borderRadius:8,padding:"1px 6px",letterSpacing:1,fontWeight:700}}>● ACTIVE</span>}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"nowrap"}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.82)",fontFamily:"'Space Mono',monospace",fontWeight:600,whiteSpace:"nowrap"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>
            <span style={{fontSize:10,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights}n</span>
            {phase.totalDives>0&&<span style={{fontSize:10,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}
          </div>
          {pct>0&&<div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:isMobile?50:100,height:2,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${phase.color}66,${phase.color})`,borderRadius:2,transition:"width 0.4s ease"}}/></div>
            <span style={{fontSize:8,color:`${phase.color}66`,fontFamily:"monospace",fontWeight:400,whiteSpace:"nowrap"}}>{pct}%</span>
          </div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0,marginLeft:4,minWidth:58}}>
          <div style={{fontSize:isMobile?12:15,fontWeight:600,color:"rgba(255,217,61,0.82)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>{fmt(phase.totalBudget)}</div>
          <div style={{fontSize:isMobile?9:11,color:"rgba(255,255,255,0.38)",fontFamily:"monospace",whiteSpace:"nowrap",letterSpacing:0.5}}>{isPast?"DONE":isNow?"ACTIVE":`${dUntil}d`}</div>
        </div>
        <div style={{width:20,height:20,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.18":"0.07"})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:15,color:open?phase.color:"rgba(255,255,255,0.55)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▼</span>
        </div>
      </div>'''

new = '''        <div style={{padding:isMobile?"11px 12px":"14px 16px",cursor:"pointer",minHeight:isMobile?56:62,borderLeft:`3px solid ${open?phase.color:phase.color+"50"}`}}>
          {/* Row 1: number+flag · name · budget · chevron */}
          <div style={{display:"flex",alignItems:"center",gap:isMobile?8:12,marginBottom:isMobile?5:4}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:`${phase.color}14`,border:`1.5px solid ${phase.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:phase.color,fontFamily:"'Space Mono',monospace",flexShrink:0}}>{phase.id}</div>
              <span style={{fontSize:14}}>{phase.flag}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"nowrap"}}>
                <span style={{fontSize:isMobile?13:15,fontWeight:600,color:open?phase.color:"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace",transition:"color 0.2s",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{phase.name}</span>
                {isNow&&<span style={{fontSize:9,color:"#69F0AE",background:"rgba(105,240,174,0.1)",border:"1px solid rgba(105,240,174,0.28)",borderRadius:8,padding:"1px 5px",letterSpacing:0.5,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>ACTIVE</span>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <div style={{fontSize:isMobile?12:15,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>{fmt(phase.totalBudget)}</div>
              <div style={{width:18,height:18,borderRadius:"50%",border:`1px solid rgba(255,255,255,${open?"0.18":"0.07"})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:8,color:open?phase.color:"rgba(255,255,255,0.45)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▼</span>
              </div>
            </div>
          </div>
          {/* Row 2: date · nights · dives · days-away · progress */}
          <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:isMobile?25:32,flexWrap:"nowrap"}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.65)",fontFamily:"'Space Mono',monospace",fontWeight:500,whiteSpace:"nowrap"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>
            <span style={{fontSize:10,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights}n</span>
            {phase.totalDives>0&&<span style={{fontSize:10,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}
            <span style={{fontSize:9,color:"rgba(255,255,255,0.28)",fontFamily:"monospace",whiteSpace:"nowrap",marginLeft:"auto",flexShrink:0}}>{isPast?"done":isNow?"active":`${dUntil}d`}</span>
            {pct>0&&<div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
              <div style={{width:isMobile?36:80,height:2,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${phase.color}55,${phase.color}99)`,borderRadius:2}}/></div>
            </div>}
          </div>
        </div>'''

if old in content:
    content = content.replace(old, new)
    results.append("✅  PhaseCard: clean 2-row mobile layout")
else:
    results.append("❌  PhaseCard: not found — check string")
    # Debug: find the phase card click handler
    idx = content.find('minHeight:62,borderLeft')
    if idx > -1:
        results.append(f"  Found 'minHeight:62' at char {idx}")
    idx2 = content.find('minHeight:isMobile?56')
    if idx2 > -1:
        results.append(f"  Already patched? Found at char {idx2}")

if content != original:
    with open('src/App.jsx', 'w') as f:
        f.write(content)
    print("\n📝 File written.\n")
else:
    print("\n⚠️  No changes.\n")

print("─" * 55)
for r in results:
    print(r)
print("─" * 55)
print("\nNext: git add src/App.jsx && git commit -m 'fix: phase card clean 2-row mobile layout' && git push")
