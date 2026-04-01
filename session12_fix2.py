#!/usr/bin/env python3
"""
Session 12 — Fix patches 1 and 6b (exact line-number approach)
Run from: /Users/admin/1bag-nomad/
"""
with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# ─────────────────────────────────────────────────────────────────
# PATCH 6b: PhaseCard segment header divider — line 1080
# borderBottom:"1px solid rgba(0,229,255,0.055)" → 0.18
# ─────────────────────────────────────────────────────────────────
target_6b = 'borderBottom:"1px solid rgba(0,229,255,0.055)"'
replace_6b = 'borderBottom:"1px solid rgba(0,229,255,0.18)"'
fixed_6b = False
for i, line in enumerate(lines):
    if target_6b in line and 'TAP TO EXPAND' in ''.join(lines[max(0,i-2):i+4]):
        lines[i] = line.replace(target_6b, replace_6b, 1)
        fixed_6b = True
        results.append(f"✅  PATCH 6b — PhaseCard segment divider fixed at line {i+1}")
        break
if not fixed_6b:
    # Try broader search — fix ALL 0.055 rgba cyan dividers
    for i, line in enumerate(lines):
        if 'rgba(0,229,255,0.055)' in line and i not in []:
            lines[i] = line.replace('rgba(0,229,255,0.055)', 'rgba(0,229,255,0.18)', 1)
            results.append(f"✅  PATCH 6b — fixed rgba(0,229,255,0.055) at line {i+1}")
            fixed_6b = True
    if not fixed_6b:
        results.append("❌  PATCH 6b — not found")

# ─────────────────────────────────────────────────────────────────
# PATCH 1: PhaseCard date row — find by fD(phase.arrival) presence
# Remove flexShrink:1 + textOverflow:ellipsis + isMobile conditionals
# ─────────────────────────────────────────────────────────────────
fixed_1 = False
for i, line in enumerate(lines):
    if 'fD(phase.arrival)' in line and 'ellipsis' in line:
        # This is the inline date span with truncation — replace it
        lines[i] = lines[i].replace(
            'flexShrink:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"',
            'flexShrink:0'
        )
        lines[i] = lines[i].replace(
            'flexShrink:1,minWidth:0,overflow:\\"hidden\\",textOverflow:\\"ellipsis\\"',
            'flexShrink:0'
        )
        fixed_1 = True
        results.append(f"✅  PATCH 1 — PhaseCard date: removed ellipsis truncation at line {i+1}")
        break

if not fixed_1:
    # Find the date container div and remove overflow:hidden
    for i, line in enumerate(lines):
        if 'fD(phase.arrival)' in line:
            # Look at surrounding lines for the container
            for j in range(max(0, i-3), i+1):
                if 'overflow:"hidden"' in lines[j] and 'flexWrap:"nowrap"' in lines[j]:
                    lines[j] = lines[j].replace(',overflow:"hidden"', '')
                    results.append(f"✅  PATCH 1 — PhaseCard date container: removed overflow:hidden at line {j+1}")
                    fixed_1 = True
                    break
            # Also fix the span's font size isMobile ternary if present
            if 'isMobile?10:15' in line or 'isMobile?10:11' in line:
                lines[i] = lines[i].replace('isMobile?10:15', '10')
                lines[i] = lines[i].replace('isMobile?10:11', '10')
                results.append(f"✅  PATCH 1b — PhaseCard date span: removed isMobile ternary at line {i+1}")
            break

if not fixed_1:
    results.append("❌  PATCH 1 — PhaseCard date: not found — printing nearby lines for debug")
    for i, line in enumerate(lines):
        if 'fD(phase.arrival)' in line:
            results.append(f"  Line {i+1}: {line.strip()[:120]}")

# ─────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────
with open('src/App.jsx', 'w') as f:
    f.writelines(lines)

print("\n📝 File written.\n")
print("─" * 55)
print("FIX RESULTS:")
print("─" * 55)
for r in results:
    print(r)
print("─" * 55)
print("\nNext: git add src/App.jsx && git commit -m 'fix: phase card date + segment divider' && git push")
