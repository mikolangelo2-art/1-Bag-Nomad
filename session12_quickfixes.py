#!/usr/bin/env python3
"""
Session 12 — Quick wins: OWNED badge, NTB item names, NTB header
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# ── FIX 1: OWNED badge — slim it down from pill to lean text tag
for i, line in enumerate(lines):
    if 'OWNED":"NEED"' in line and 'borderRadius:8' in line:
        lines[i] = line.replace(
            'padding:"3px 9px",borderRadius:8,background:item.owned?"rgba(105,240,174,0.06)":"rgba(196,87,30,0.07)",border:`1px solid ${item.owned?"rgba(105,240,174,0.2)":"rgba(196,87,30,0.22)"}`,fontSize:9,fontWeight:600,color:item.owned?"rgba(105,240,174,0.8)":"rgba(196,87,30,0.75)",letterSpacing:0.5,whiteSpace:"nowrap"',
            'padding:"2px 7px",borderRadius:4,background:"transparent",border:`1px solid ${item.owned?"rgba(105,240,174,0.25)":"rgba(196,87,30,0.28)"}`,fontSize:9,fontWeight:600,color:item.owned?"rgba(105,240,174,0.75)":"rgba(196,87,30,0.7)",letterSpacing:1,whiteSpace:"nowrap"'
        )
        results.append(f"✅  FIX 1 — OWNED badge: slim text tag, no background (line {i+1})")
        break
else:
    results.append("❌  FIX 1 — OWNED badge not found")

# ── FIX 2: NEED TO BUY item names — remove truncation ellipsis
for i, line in enumerate(lines):
    if 'running:' in line and 'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"' in line and 'item.name' in line:
        lines[i] = line.replace(
            'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"',
            'whiteSpace:"nowrap"'
        )
        results.append(f"✅  FIX 2 — NTB item names: removed truncation (line {i+1})")
        break
else:
    # Try alternate search
    for i, line in enumerate(lines):
        if 'running:' in line and 'textOverflow' in line:
            lines[i] = line.replace('textOverflow:"ellipsis",', '')
            lines[i] = lines[i].replace('overflow:"hidden",', '')
            results.append(f"✅  FIX 2b — NTB item names alt fix (line {i+1})")
            break
    else:
        results.append("❌  FIX 2 — NTB item names not found")

# ── FIX 3: NEED TO BUY header — fix wrapping in summary card
# "14 items · sorted by cost" and "TOTAL TO SPEND" wrapping
for i, line in enumerate(lines):
    if 'sorted by cost' in line and 'fontSize:11' in line:
        lines[i] = line.replace(
            'fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2',
            'fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:2,whiteSpace:"nowrap"'
        )
        results.append(f"✅  FIX 3a — NTB sub-label: nowrap (line {i+1})")
        break
else:
    results.append("❌  FIX 3a — NTB sub-label not found")

# Also fix "TOTAL TO SPEND" wrapping
for i, line in enumerate(lines):
    if 'TOTAL TO SPEND' in line and 'fontSize:10' in line:
        lines[i] = line.replace(
            'fontSize:10,color:"rgba(255,107,107,0.55)",letterSpacing:1',
            'fontSize:10,color:"rgba(255,107,107,0.55)",letterSpacing:1,whiteSpace:"nowrap"'
        )
        results.append(f"✅  FIX 3b — NTB TOTAL TO SPEND: nowrap (line {i+1})")
        break

# ── FIX 4: Phase card top-right date overlap
# The date row at top and the right column budget both try to sit in same row
# Solution: give the name column flex:1 and ensure right col has fixed width
for i, line in enumerate(lines):
    if 'fmt(phase.totalBudget)' in line and 'flexShrink:0,marginLeft:6' in line:
        # Right column already has flexShrink:0 — make sure it has explicit width
        lines[i] = line.replace(
            'display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0,marginLeft:6',
            'display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0,marginLeft:4,minWidth:60'
        )
        results.append(f"✅  FIX 4 — Phase card right col: minWidth:60 prevents overlap (line {i+1})")
        break
else:
    results.append("❌  FIX 4 — Phase card right col not found")

# ── Write
with open('src/App.jsx', 'w') as f:
    f.writelines(lines)

print("\n📝 File written.\n")
print("─" * 55)
for r in results:
    print(r)
passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
print("─" * 55)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 55)
print("\nNext: git add src/App.jsx && git commit -m 'polish: OWNED badge slim, NTB item names, phase card overlap' && git push")
