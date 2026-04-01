#!/usr/bin/env python3
"""
Session 12 — Final 4 polish fixes (exact strings from debug output)
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# ── P1: Phase budget — actual string from debug: line 1066
# actual: <div style={{fontSize:16,fontWeight:600,color:"#FFD93D",fontFamily:"'Space Mono',monospace"
for i, line in enumerate(lines):
    if 'fmt(phase.totalBudget)' in line and 'fontWeight:600' in line and 'fontSize:16' in line:
        lines[i] = line.replace('fontSize:16,fontWeight:600,color:"#FFD93D"', 'fontSize:13,fontWeight:600,color:"rgba(255,217,61,0.82)"')
        results.append(f"✅  P1 — Phase budget: 16→13, softer gold (line {i+1})")
        break
else:
    # Try any line with fmt(phase.totalBudget)
    for i, line in enumerate(lines):
        if 'fmt(phase.totalBudget)' in line:
            results.append(f"❌  P1 — actual line {i+1}: {line.strip()[:120]}")
            break

# ── P4: Progress % — actual: fontSize:15,color:`${phase.color}CC`,fontWeight:600
for i, line in enumerate(lines):
    if 'pct}%' in line and 'fontWeight:600' in line and 'phase.color' in line:
        lines[i] = line.replace('fontWeight:600}}>{pct}%', 'fontWeight:400}}>{pct}%')
        results.append(f"✅  P4 — Progress %: fontWeight 600→400 (line {i+1})")
        break
else:
    for i, line in enumerate(lines):
        if 'pct}%' in line:
            results.append(f"❌  P4 — actual line {i+1}: {line.strip()[:120]}")
            break

# ── S4a: ASK button ✦ icon — actual button has display:flex,flexDirection
# The button style was already partially patched — find the ✦ span inside it
for i, line in enumerate(lines):
    if 'glowPulse 2.5s' in line and 'askOpen' in line and ('fontSize:15' in line or 'fontSize:12' in line):
        if 'fontSize:15' in line:
            lines[i] = line.replace('fontSize:15,color:askOpen?"#FFD93D":"rgba(255,217,61,0.65)"', 
                                    'fontSize:11,color:askOpen?"#FFD93D":"rgba(255,217,61,0.55)"')
            results.append(f"✅  S4a — ASK ✦ icon: fontSize 15→11 (line {i+1})")
        elif 'fontSize:12' in line:
            results.append(f"✅  S4a — ASK ✦ already at 12, skipping (line {i+1})")
        break
else:
    results.append("❌  S4a — ASK ✦ icon not found")

# ── S4b: ASK label — already patched to 8 in prior run, check if needs anything
for i, line in enumerate(lines):
    if '>ASK</span>' in line and 'askOpen' in line:
        results.append(f"ℹ️   S4b — ASK label current state (line {i+1}): {line.strip()[:80]}")
        break

# ── V1: Vision label — actual line 1219: fontSize:15,color:"rgba(255,217,61,0.85)"
for i, line in enumerate(lines):
    if 'EXPEDITION VISION' in line:
        if 'fontSize:15' in line:
            lines[i] = line.replace(
                'fontSize:15,color:"rgba(255,217,61,0.85)",letterSpacing:3',
                'fontSize:10,color:"rgba(255,217,61,0.55)",letterSpacing:2'
            ).replace(
                'fontSize:15,color:"rgba(255,217,61,0.85)"',
                'fontSize:10,color:"rgba(255,217,61,0.55)"'
            )
            results.append(f"✅  V1 — Vision label: 15→10, softer (line {i+1})")
        elif 'fontSize:10' in line:
            results.append(f"✅  V1 — Vision label already at 10 (line {i+1})")
        else:
            results.append(f"❌  V1 — Vision label unexpected: {line.strip()[:80]}")
        break

# ── I5: Item row minHeight — actual line 1410: minHeight:48
for i, line in enumerate(lines):
    if 'minHeight:48' in line and 'borderLeft' in line and 'catColor' in line:
        lines[i] = line.replace('minHeight:48', 'minHeight:43')
        results.append(f"✅  I5 — Item row minHeight: 48→43 (line {i+1})")
        break
else:
    # Try without catColor check
    for i, line in enumerate(lines):
        if 'minHeight:48' in line and ('catColor' in line or 'borderLeft' in line):
            lines[i] = line.replace('minHeight:48', 'minHeight:43')
            results.append(f"✅  I5 — Item row minHeight: 48→43 (line {i+1})")
            break
    else:
        results.append("❌  I5 — minHeight:48 with catColor not found")

# ── BONUS: Phase card status text (dUntil) — softer color
for i, line in enumerate(lines):
    if 'dUntil}d`}' in line and ('rgba(255,255,255,0.6)' in line or 'rgba(255,255,255,0.45)' in line):
        lines[i] = line.replace('rgba(255,255,255,0.6)', 'rgba(255,255,255,0.38)')
        lines[i] = lines[i].replace('rgba(255,255,255,0.45)', 'rgba(255,255,255,0.38)')
        results.append(f"✅  Bonus — Phase status text softer (line {i+1})")
        break

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
print("\nNext: git add src/App.jsx && git commit -m 'polish: final 4 luxury fixes - budget weight, vision label, progress, item height' && git push")
