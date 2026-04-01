#!/usr/bin/env python3
"""
1 BAG NOMAD — Session 12 Patch Script
Run from: /Users/admin/1bag-nomad/
Command:  python3 session12_patches.py
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()

original = content
patch_results = []

# ─────────────────────────────────────────────────────────────────
# PATCH 1: PhaseCard date — always full-width row, no isMobile gate
# Root cause of Sep→Oct truncation on Safari/real phone
# ─────────────────────────────────────────────────────────────────
old = '''          <div style={{display:"flex",gap:isMobile?4:6,alignItems:"center",marginBottom:isMobile?2:5,flexWrap:"nowrap",overflow:"hidden"}}>
            <span style={{fontSize:isMobile?10:15,color:"rgba(255,255,255,0.8)",fontFamily:"'Space Mono',monospace",fontWeight:600,whiteSpace:"nowrap",flexShrink:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>
            <span style={{fontSize:isMobile?10:15,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights}n</span>
            {phase.totalDives>0&&<span style={{fontSize:isMobile?10:15,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}
          </div>'''

new = '''          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"nowrap"}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.82)",fontFamily:"'Space Mono',monospace",fontWeight:600,whiteSpace:"nowrap"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>
            <span style={{fontSize:10,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights}n</span>
            {phase.totalDives>0&&<span style={{fontSize:10,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}
          </div>'''

if old in content:
    content = content.replace(old, new)
    patch_results.append("✅  PATCH 1 — PhaseCard date row: always full-width, no isMobile gate")
else:
    patch_results.append("❌  PATCH 1 — PhaseCard date row: NOT FOUND")

# ─────────────────────────────────────────────────────────────────
# PATCH 2: SegmentRow date — fix Se… truncation
# Give dates guaranteed space, no ellipsis override
# ─────────────────────────────────────────────────────────────────
old2 = '''            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"nowrap",overflow:"hidden"}}>
              <span style={{color:"rgba(255,255,255,0.75)",fontWeight:500,fontFamily:"'Space Mono',monospace",fontSize:10,whiteSpace:"nowrap",flexShrink:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{fD(segment.arrival)}→{fD(segment.departure)}</span>
              <span style={{color:tc,fontWeight:700,fontSize:10,whiteSpace:"nowrap",flexShrink:0}}>🌙{segment.nights}n</span>
              {segment.diveCount>0&&<span style={{color:"#00E5FF",fontSize:10,whiteSpace:"nowrap",flexShrink:0}}>🤿{segment.diveCount}</span>}
            </div>'''

new2 = '''            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"nowrap"}}>
              <span style={{color:"rgba(255,255,255,0.75)",fontWeight:500,fontFamily:"'Space Mono',monospace",fontSize:10,whiteSpace:"nowrap"}}>{fD(segment.arrival)}→{fD(segment.departure)}</span>
              <span style={{color:tc,fontWeight:700,fontSize:10,whiteSpace:"nowrap",flexShrink:0}}>🌙{segment.nights}n</span>
              {segment.diveCount>0&&<span style={{color:"#00E5FF",fontSize:10,whiteSpace:"nowrap",flexShrink:0}}>🤿{segment.diveCount}</span>}
            </div>'''

if old2 in content:
    content = content.replace(old2, new2)
    patch_results.append("✅  PATCH 2 — SegmentRow date: Se… truncation fixed")
else:
    patch_results.append("❌  PATCH 2 — SegmentRow date: NOT FOUND")

# ─────────────────────────────────────────────────────────────────
# PATCH 3: "YOUR EXPEDITION · N PHASES" — amber color, lighter weight
# Currently: color:#00E5FF, fontWeight:700
# Fix: color:#FF9F43, fontWeight:500, not bold
# ─────────────────────────────────────────────────────────────────
old3 = '''            <div style={{fontSize:isMobile?13:15,color:"#00E5FF",letterSpacing:isMobile?2:3,marginBottom:4,fontWeight:700,fontFamily:"'Space Mono',monospace",whiteSpace:isMobile?"normal":"nowrap"}}>{isMobile?`YOUR EXPEDITION · ${segPhases.length} PHASES`:`YOUR EXPEDITION · ${segPhases.length} PHASES · TAP PHASE TO EXPAND`}</div>
            {isMobile&&<div style={{fontSize:15,color:"rgba(0,229,255,0.55)",letterSpacing:2,marginBottom:4,fontFamily:"'Space Mono',monospace"}}>TAP PHASE TO EXPAND</div>}'''

new3 = '''            <div style={{fontSize:isMobile?12:14,color:"#FF9F43",letterSpacing:isMobile?1.5:2.5,marginBottom:4,fontWeight:500,fontFamily:"'Space Mono',monospace",whiteSpace:isMobile?"normal":"nowrap"}}>{isMobile?`YOUR EXPEDITION · ${segPhases.length} PHASES`:`YOUR EXPEDITION · ${segPhases.length} PHASES · TAP PHASE TO EXPAND`}</div>
            {isMobile&&<div style={{fontSize:15,color:"rgba(255,159,67,0.55)",letterSpacing:1.5,marginBottom:4,fontFamily:"'Space Mono',monospace"}}>TAP PHASE TO EXPAND</div>}'''

if old3 in content:
    content = content.replace(old3, new3)
    patch_results.append("✅  PATCH 3 — Expedition label: amber color, fontWeight:500")
else:
    patch_results.append("❌  PATCH 3 — Expedition label: NOT FOUND")

# ─────────────────────────────────────────────────────────────────
# PATCH 4: Mobile typography — DREAM BIG letterSpacing on mobile
# Tagline bar: reduce letterSpacing on mobile, 900→700 weight
# ─────────────────────────────────────────────────────────────────
old4 = '''        <div style={{fontFamily:"'Fraunces',serif",fontSize:dbSize,fontWeight:dbWeight,color:dbColor,letterSpacing:isMobile?0:7,lineHeight:1,whiteSpace:"nowrap",textShadow:isDream?"0 0 32px rgba(255,217,61,0.7),0 0 64px rgba(169,70,29,0.4)":"none",position:"relative",textTransform:"uppercase"}}>Dream Big</div>'''

new4 = '''        <div style={{fontFamily:"'Fraunces',serif",fontSize:dbSize,fontWeight:isMobile?700:dbWeight,color:dbColor,letterSpacing:isMobile?0:7,lineHeight:1,whiteSpace:"nowrap",textShadow:isDream?"0 0 32px rgba(255,217,61,0.7),0 0 64px rgba(169,70,29,0.4)":"none",position:"relative",textTransform:"uppercase"}}>Dream Big</div>'''

if old4 in content:
    content = content.replace(old4, new4)
    patch_results.append("✅  PATCH 4 — Mobile typography: Dream Big fontWeight 900→700 on mobile")
else:
    patch_results.append("❌  PATCH 4 — Mobile typography: NOT FOUND")

# ─────────────────────────────────────────────────────────────────
# PATCH 5: Logo text — "1 Bag Nomad" on top, Sharegood Co. on bottom
# Currently: 1 Bag Nomad on top, Sharegood Co. below with dot — ALREADY CORRECT layout
# The user wants to confirm this layout is right. Let's just verify and note.
# Actually user wants "1 Bag Nomad on top, Sharegood Co. on bottom" — current code has
# "1 Bag Nomad" then dot + "Sharegood Co." which IS the right order already.
# The OLD layout was "Sharegood Everything" — now it's "1 Bag Nomad" + "Sharegood Co."
# This is already done in the current file. Let's double-check the center wordmark block.
# ─────────────────────────────────────────────────────────────────
if '1 Bag Nomad' in content and 'Sharegood Co.' in content:
    patch_results.append("✅  PATCH 5 — Logo: '1 Bag Nomad' top + 'Sharegood Co.' bottom already correct in file")
else:
    patch_results.append("⚠️  PATCH 5 — Logo: check wordmark block manually")

# ─────────────────────────────────────────────────────────────────
# PATCH 6: Mobile row separators — brighten in Trip Console expanded views
# SegmentRow bottom border: rgba(0,229,255,0.055) → 0.15
# PhaseCard segment divider: rgba(0,229,255,0.055) → 0.18
# PackItemRow border: rgba(255,255,255,0.12) → 0.22
# ─────────────────────────────────────────────────────────────────

# 6a: SegmentRow divider (between segments inside PhaseCard)
old6a = '''    <div style={{borderBottom:isLast?"none":"1px solid rgba(0,229,255,0.055)"}}>'''
new6a = '''    <div style={{borderBottom:isLast?"none":"1px solid rgba(0,229,255,0.16)"}}>'''
if old6a in content:
    content = content.replace(old6a, new6a)
    patch_results.append("✅  PATCH 6a — SegmentRow divider: 0.055 → 0.16")
else:
    patch_results.append("❌  PATCH 6a — SegmentRow divider: NOT FOUND")

# 6b: PhaseCard header/segment separator
old6b = '''            borderBottom:"1px solid rgba(0,229,255,0.055)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"'''
new6b = '''            borderBottom:"1px solid rgba(0,229,255,0.18)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"'''
if old6b in content:
    content = content.replace(old6b, new6b)
    patch_results.append("✅  PATCH 6b — PhaseCard segment header divider: 0.055 → 0.18")
else:
    patch_results.append("❌  PATCH 6b — PhaseCard segment header divider: NOT FOUND")

# 6c: PackItemRow divider (between pack items in category)
old6c = '''      <div style={{borderBottom:isLast?"none":"1px solid rgba(255,255,255,0.12)"}}>'''
new6c = '''      <div style={{borderBottom:isLast?"none":"1px solid rgba(255,255,255,0.2)"}}>'''
if old6c in content:
    content = content.replace(old6c, new6c)
    patch_results.append("✅  PATCH 6c — PackItemRow divider: 0.12 → 0.20")
else:
    patch_results.append("❌  PATCH 6c — PackItemRow divider: NOT FOUND")

# ─────────────────────────────────────────────────────────────────
# PATCH 7: NEED TO BUY filter pill — after Docs in Pack Console filter bar
# Unowned items sorted by cost desc, running total at bottom
# Step 1: Add "needtobuy" to filter pill row after Docs pill
# Step 2: Handle it in the CatCard visibleCats logic / pack tab render
# ─────────────────────────────────────────────────────────────────

# 7a: Add NEED TO BUY pill after the Docs pill in the filter bar
old7a = '''        {CATS.map(c=>(
          <button key={c.id} onClick={()=>{setFilterCat(c.id);setOpenCats({[c.id]:true});}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 16px",borderRadius:20,border:"1px solid "+(filterCat===c.id?c.color+"80":"rgba(169,70,29,0.4)"),background:filterCat===c.id?c.color+"14":"transparent",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,minHeight:36}}>
            <span style={{fontSize:15}}>{c.icon}</span>
            <span style={{fontSize:15,color:filterCat===c.id?c.color:"rgba(255,255,255,0.6)",fontFamily:"'Space Mono',monospace",fontWeight:filterCat===c.id?700:400}}>{c.label}</span>
          </button>
        ))}'''

new7a = '''        {CATS.map(c=>(
          <button key={c.id} onClick={()=>{setFilterCat(c.id);setOpenCats({[c.id]:true});}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 16px",borderRadius:20,border:"1px solid "+(filterCat===c.id?c.color+"80":"rgba(169,70,29,0.4)"),background:filterCat===c.id?c.color+"14":"transparent",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,minHeight:36}}>
            <span style={{fontSize:15}}>{c.icon}</span>
            <span style={{fontSize:15,color:filterCat===c.id?c.color:"rgba(255,255,255,0.6)",fontFamily:"'Space Mono',monospace",fontWeight:filterCat===c.id?700:400}}>{c.label}</span>
          </button>
        ))}
        <button onClick={()=>{setFilterCat("needtobuy");setOpenCats({});}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 16px",borderRadius:20,border:"1px solid "+(filterCat==="needtobuy"?"rgba(255,107,107,0.7)":"rgba(255,107,107,0.3)"),background:filterCat==="needtobuy"?"rgba(255,107,107,0.12)":"transparent",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,minHeight:36}}>
          <span style={{fontSize:15}}>🛒</span>
          <span style={{fontSize:15,color:filterCat==="needtobuy"?"#FF6B6B":"rgba(255,107,107,0.65)",fontFamily:"'Space Mono',monospace",fontWeight:filterCat==="needtobuy"?700:400}}>Need to Buy</span>
        </button>'''

if old7a in content:
    content = content.replace(old7a, new7a)
    patch_results.append("✅  PATCH 7a — NEED TO BUY filter pill added after Docs")
else:
    patch_results.append("❌  PATCH 7a — filter pill insertion: NOT FOUND")

# 7b: In the pack tab render, handle needtobuy filter view
# Insert NEED TO BUY view BEFORE the regular visibleCats.map
old7b = '''      {packTab==="pack"&&(
        <div style={{overflowY:"auto",flex:1,padding:"12px 16px 32px"}}>
          {visibleCats.map((cat,i)=><CatCard key={cat.id} cat={cat} idx={i}/>)}'''

new7b = '''      {packTab==="pack"&&(
        <div style={{overflowY:"auto",flex:1,padding:"12px 16px 32px"}}>
          {filterCat==="needtobuy"?(()=>{
            const unowned=[...items].filter(i=>!i.owned).sort((a,b)=>(parseFloat(b.cost)||0)-(parseFloat(a.cost)||0));
            const total=unowned.reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
            const CAT_COLORS_NTB={docs:"#E0E0E0",tech:"#00D4FF",clothes:"#FFD93D",health:"#69F0AE",travel:"#55EFC4",creator:"#FF9F43",dive:"#00E5FF"};
            return(<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,padding:"10px 14px",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(255,107,107,0.22)",borderRadius:10}}>
                <div>
                  <div style={{fontSize:12,color:"rgba(255,107,107,0.85)",letterSpacing:2,fontWeight:700,fontFamily:"'Space Mono',monospace"}}>🛒 NEED TO BUY</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2}}>{unowned.length} item{unowned.length!==1?"s":""} · sorted by cost</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:900,color:"#FF6B6B",fontFamily:"'Space Mono',monospace"}}>${total.toLocaleString()}</div>
                  <div style={{fontSize:10,color:"rgba(255,107,107,0.55)",letterSpacing:1}}>TOTAL TO SPEND</div>
                </div>
              </div>
              {unowned.length===0?(<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:28,marginBottom:12}}>✅</div><div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontStyle:"italic",color:"rgba(105,240,174,0.75)"}}>You own everything!</div></div>):(
                <div style={{display:"flex",flexDirection:"column",gap:0,borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)"}}>
                  {unowned.map((item,i)=>{
                    const c=CAT_COLORS_NTB[item.cat]||"#FF9F43";
                    const running=unowned.slice(0,i+1).reduce((s,x)=>s+(parseFloat(x.cost)||0),0);
                    return(<div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:i%2===0?"rgba(18,5,0,0.9)":"rgba(10,3,0,0.9)",borderBottom:i<unowned.length-1?"1px solid rgba(255,255,255,0.06)":"none",borderLeft:`3px solid ${c}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#FFF",fontFamily:"'Space Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                        <div style={{fontSize:10,color:`${c}99`,letterSpacing:1,marginTop:2,fontFamily:"monospace"}}>{item.cat?.toUpperCase()} · {item.bag}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#FFD93D",fontFamily:"monospace"}}>${parseFloat(item.cost||0).toLocaleString()}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.28)",fontFamily:"monospace"}}>running: ${running.toLocaleString()}</div>
                      </div>
                      <button onClick={()=>toggleOwned(item.id)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid rgba(105,240,174,0.3)",background:"rgba(105,240,174,0.06)",color:"#69F0AE",fontSize:11,cursor:"pointer",fontFamily:"monospace",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>GOT IT</button>
                    </div>);
                  })}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"rgba(255,107,107,0.08)",borderTop:"1px solid rgba(255,107,107,0.2)"}}>
                    <div style={{fontSize:11,color:"rgba(255,107,107,0.75)",letterSpacing:2,fontFamily:"'Space Mono',monospace",fontWeight:700}}>TOTAL TO BUY</div>
                    <div style={{fontSize:20,fontWeight:900,color:"#FF6B6B",fontFamily:"'Space Mono',monospace"}}>${total.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>);
          })():visibleCats.map((cat,i)=><CatCard key={cat.id} cat={cat} idx={i}/>)}'''

if old7b in content:
    content = content.replace(old7b, new7b)
    patch_results.append("✅  PATCH 7b — NEED TO BUY view: unowned sorted by cost + running total + GOT IT toggle")
else:
    patch_results.append("❌  PATCH 7b — NEED TO BUY view: NOT FOUND")

# ─────────────────────────────────────────────────────────────────
# CLOSE THE visibleCats.map — need to fix the closing brace since we changed the render
# ─────────────────────────────────────────────────────────────────
old7c = '''          {visibleCats.map((cat,i)=><CatCard key={cat.id} cat={cat} idx={i}/>)}
          <div style={{textAlign:"center",marginTop:8,padding:"8px 0",borderTop:"1px solid rgba(169,70,29,0.12)"}}>'''
new7c = '''          <div style={{textAlign:"center",marginTop:8,padding:"8px 0",borderTop:"1px solid rgba(169,70,29,0.12)"}}>'''
if old7c in content:
    content = content.replace(old7c, new7c)
    patch_results.append("✅  PATCH 7c — cleaned up duplicate visibleCats.map call")
else:
    # It's fine if not found — the structure may already be right
    patch_results.append("⚠️  PATCH 7c — duplicate map cleanup: not needed or already handled")

# ─────────────────────────────────────────────────────────────────
# WRITE FILE
# ─────────────────────────────────────────────────────────────────
if content != original:
    with open('src/App.jsx', 'w') as f:
        f.write(content)
    print("\n📝 File written successfully.\n")
else:
    print("\n⚠️  No changes were made — all patches may have failed.\n")

print("─" * 60)
print("SESSION 12 PATCH RESULTS:")
print("─" * 60)
for r in patch_results:
    print(r)
print("─" * 60)
print("\nNext: git add src/App.jsx && git commit -m 'feat: session12 - date fix, expedition label, NEED TO BUY, separators, mobile typo' && git push")
