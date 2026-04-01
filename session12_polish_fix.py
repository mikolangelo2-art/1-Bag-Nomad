#!/usr/bin/env python3
"""
Session 12 — Fix the 6 failed luxury polish patches
Uses grep approach to find exact current strings
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

def patch_line(search_fragment, old_fragment, new_fragment, label):
    """Find line containing search_fragment, replace old_fragment with new_fragment"""
    for i, line in enumerate(lines):
        if search_fragment in line and old_fragment in line:
            lines[i] = line.replace(old_fragment, new_fragment, 1)
            results.append(f"✅  {label} (line {i+1})")
            return True
    # Not found — print what we see near the search fragment for debug
    for i, line in enumerate(lines):
        if search_fragment in line:
            results.append(f"❌  {label} — found fragment at line {i+1} but old_str mismatch")
            results.append(f"    actual: {line.strip()[:100]}")
            return False
    results.append(f"❌  {label} — search fragment not found at all")
    return False

# ── P1: Phase budget — fontWeight:900 in phase card right column
patch_line(
    'fmt(phase.totalBudget)',
    'fontWeight:900,color:"#FFD93D"',
    'fontWeight:600,color:"rgba(255,217,61,0.88)"',
    'P1 — Phase budget weight 900→600'
)

# ── P2: Phase name fontWeight
patch_line(
    'phase.name}',
    'fontWeight:700,color:open?phase.color:"#FFF"',
    'fontWeight:600,color:open?phase.color:"rgba(255,255,255,0.92)"',
    'P2 — Phase name 700→600'
)

# ── P4: Progress % label
patch_line(
    'pct}%',
    'fontWeight:600,whiteSpace:"nowrap"}}>{pct}%',
    'fontWeight:400,whiteSpace:"nowrap"}}>{pct}%',
    'P4 — Progress % fontWeight 600→400'
)

# ── S4: ASK button ✦ span — current state after prior patches
patch_line(
    'Ask co-architect',
    'fontSize:15,color:askOpen?"#FFD93D":"rgba(255,217,61,0.65)"',
    'fontSize:12,color:askOpen?"#FFD93D":"rgba(255,217,61,0.55)"',
    'S4a — ASK ✦ icon size 15→12'
)
patch_line(
    'ASK</span>',
    'fontSize:15,color:askOpen?"#FFD93D":"rgba(255,217,61,0.55)"',
    'fontSize:8,color:askOpen?"#FFD93D":"rgba(255,217,61,0.4)"',
    'S4b — ASK label size 15→8'
)

# ── V1: Vision label — find current version
patch_line(
    'EXPEDITION VISION',
    'fontSize:15,color:"rgba(255,217,61,0.85)"',
    'fontSize:10,color:"rgba(255,217,61,0.55)"',
    'V1 — Vision label 15→10'
)

# ── I5: Item row minHeight — find current
patch_line(
    'minHeight:48',
    'minHeight:48',
    'minHeight:44',
    'I5 — Item row minHeight 48→44'
)

# ── Also fix the dUntil status text which was missed
patch_line(
    'dUntil}d`}',
    'color:"rgba(255,255,255,0.6)"',
    'color:"rgba(255,255,255,0.42)"',
    'Bonus — Phase status text: softer'
)

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
print("\nNext: git add src/App.jsx && git commit -m 'polish: fix remaining 6 luxury pass items' && git push")
