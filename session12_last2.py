#!/usr/bin/env python3
"""
Session 12 — Last 2 fixes, exact strings confirmed from debug
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# ── P1: Phase budget — EXACT string from debug output line 1066:
# fontSize:16,fontWeight:700,color:"#FFD93D",fontFamily:"'Space Mono',monospace"
for i, line in enumerate(lines):
    if 'fmt(phase.totalBudget)' in line and 'fontWeight:700' in line and 'fontSize:16' in line:
        lines[i] = line.replace(
            'fontSize:16,fontWeight:700,color:"#FFD93D"',
            'fontSize:13,fontWeight:600,color:"rgba(255,217,61,0.82)"'
        )
        results.append(f"✅  P1 — Phase budget: 16/700 → 13/600 (line {i+1})")
        break
else:
    # Print all lines with fmt(phase.totalBudget) for diagnosis
    for i, line in enumerate(lines):
        if 'fmt(phase.totalBudget)' in line:
            results.append(f"❌  P1 — line {i+1}: {line.strip()[:120]}")

# ── I5: Item row minHeight:48 — search more broadly
found_i5 = False
for i, line in enumerate(lines):
    if 'minHeight:48' in line:
        # Check nearby lines for context to confirm it's the item row
        context = ''.join(lines[max(0,i-2):i+2])
        if 'borderLeft' in context or 'owned' in context.lower() or 'item' in context.lower():
            lines[i] = line.replace('minHeight:48', 'minHeight:43')
            results.append(f"✅  I5 — Item row minHeight 48→43 (line {i+1})")
            found_i5 = True
            break
if not found_i5:
    # Find ALL minHeight:48 occurrences
    for i, line in enumerate(lines):
        if 'minHeight:48' in line:
            results.append(f"ℹ️   minHeight:48 at line {i+1}: {line.strip()[:100]}")
    results.append("❌  I5 — none matched item row context")

# ── Bonus: Phase status text — find dUntil with any white opacity
for i, line in enumerate(lines):
    if '`${dUntil}d`' in line:
        if 'rgba(255,255,255,0.6)' in line:
            lines[i] = line.replace('rgba(255,255,255,0.6)', 'rgba(255,255,255,0.38)')
            results.append(f"✅  Bonus — status text softer (line {i+1})")
        elif 'rgba(255,255,255,0.45)' in line:
            lines[i] = line.replace('rgba(255,255,255,0.45)', 'rgba(255,255,255,0.38)')
            results.append(f"✅  Bonus — status text softer (line {i+1})")
        else:
            results.append(f"ℹ️   status text line {i+1}: {line.strip()[:80]}")
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
print("\nNext: git add src/App.jsx && git commit -m 'polish: final 2 - phase budget weight, item row height' && git push")
