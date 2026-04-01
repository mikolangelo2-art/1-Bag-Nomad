#!/usr/bin/env python3
"""
Session 12 — Fix NTB item name truncation + phase card right col
Broad scan approach — prints context for any miss
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# ── FIX 2: NTB item names — find the name div inside the needtobuy map
# Look for the div that has item.name AND is inside the needtobuy section
# The NTB view uses unowned.map — find item.name near "running:"
ntb_name_fixed = False
for i, line in enumerate(lines):
    if 'item.name' in line and 'running:' in ''.join(lines[max(0,i-5):i+10]):
        if 'textOverflow' in line or 'overflow:"hidden"' in line:
            lines[i] = line.replace('overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"', 'whiteSpace:"nowrap"')
            lines[i] = lines[i].replace(',overflow:"hidden"', '').replace(',textOverflow:"ellipsis"', '')
            results.append(f"✅  FIX 2 — NTB item name: removed ellipsis (line {i+1})")
            ntb_name_fixed = True
            break

if not ntb_name_fixed:
    # Print all lines with item.name near "running:" for debug
    for i, line in enumerate(lines):
        if 'item.name' in line and 'running:' in ''.join(lines[max(0,i-5):i+10]):
            results.append(f"ℹ️   NTB item.name line {i+1}: {line.strip()[:120]}")
    
    # Also try: find the NTB name div by fontSize:13 + fontWeight:600 near running
    for i, line in enumerate(lines):
        if 'running:' in line:
            # Check nearby lines for item name div
            for j in range(max(0,i-8), i+2):
                if 'fontSize:13' in lines[j] and 'fontWeight:600' in lines[j] and 'item.name' in lines[j]:
                    lines[j] = lines[j].replace('overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"', 'whiteSpace:"nowrap",overflow:"hidden"')
                    results.append(f"✅  FIX 2b — NTB item name via running context (line {j+1})")
                    ntb_name_fixed = True
                    break
            if ntb_name_fixed:
                break
    
    if not ntb_name_fixed:
        results.append("❌  FIX 2 — NTB item name: not found, need manual check")

# ── FIX 4: Phase card right col — find by totalBudget + flexDirection column
phase_col_fixed = False
for i, line in enumerate(lines):
    if 'fmt(phase.totalBudget)' in line:
        # Look for the containing div in nearby lines
        for j in range(max(0,i-4), i+1):
            if 'flexDirection:"column"' in lines[j] and 'alignItems:"flex-end"' in lines[j] and 'flexShrink:0' in lines[j]:
                if 'minWidth' not in lines[j]:
                    lines[j] = lines[j].replace('flexShrink:0,marginLeft:', 'flexShrink:0,minWidth:58,marginLeft:')
                    results.append(f"✅  FIX 4 — Phase right col: minWidth:58 added (line {j+1})")
                    phase_col_fixed = True
                    break
                else:
                    results.append(f"ℹ️   FIX 4 — Already has minWidth (line {j+1})")
                    phase_col_fixed = True
                    break
        if phase_col_fixed:
            break

if not phase_col_fixed:
    # Print all lines with fmt(phase.totalBudget) for debug
    for i, line in enumerate(lines):
        if 'fmt(phase.totalBudget)' in line:
            results.append(f"ℹ️   totalBudget line {i+1}: {line.strip()[:120]}")
            for j in range(max(0,i-4), i+1):
                results.append(f"  context {j+1}: {lines[j].strip()[:100]}")
    results.append("❌  FIX 4 — phase right col not found")

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
print("\nNext: git add src/App.jsx && git commit -m 'polish: NTB item names + phase card layout' && git push")
