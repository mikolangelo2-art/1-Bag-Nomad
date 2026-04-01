#!/usr/bin/env python3
"""
Session 12 — Fix 5 failed drawer polish items
Stay/Food/Intel padding + activity/misc total values
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# ── FIX: Stay, Food, Intel section padding — find by unique content nearby
sections = [
    ('stay.name', 'stay', '10px 12px'),
    ('food.dailyBudget', 'food', '10px 12px'),
    ('intel.notes', 'intel', '10px 12px'),
]

for search_str, cat_name, new_padding in sections:
    fixed = False
    for i, line in enumerate(lines):
        if search_str in line:
            # Look back up to 8 lines for the opening div with padding
            for j in range(max(0, i-8), i+1):
                if 'padding:"14px 16px"' in lines[j] and 'flexDirection:"column"' in lines[j]:
                    lines[j] = lines[j].replace('padding:"14px 16px"', f'padding:"{new_padding}"')
                    results.append(f"✅  {cat_name} section padding fixed (line {j+1})")
                    fixed = True
                    break
            if fixed:
                break
    if not fixed:
        # Try broader: find any remaining padding:"14px 16px" near the section
        for i, line in enumerate(lines):
            if f'cat==="{cat_name}"' in line:
                for j in range(i, min(len(lines), i+5)):
                    if 'padding:"14px 16px"' in lines[j]:
                        lines[j] = lines[j].replace('padding:"14px 16px"', f'padding:"{new_padding}"')
                        results.append(f"✅  {cat_name} section padding (broader match, line {j+1})")
                        fixed = True
                        break
                if fixed:
                    break
    if not fixed:
        results.append(f"❌  {cat_name} section padding not found")

# ── FIX: Activities total value — find by det.activities.reduce
for i, line in enumerate(lines):
    if 'det.activities.reduce' in line and ('fontSize:15' in line or 'fontWeight:700' in line):
        lines[i] = lines[i].replace('fontSize:15,fontWeight:700,color:"#FFD93D"', 'fontSize:11,fontWeight:600,color:"rgba(255,217,61,0.8)"')
        results.append(f"✅  Activities total value fixed (line {i+1})")
        break
else:
    # Check what's actually there
    for i, line in enumerate(lines):
        if 'det.activities.reduce' in line:
            results.append(f"ℹ️   activities.reduce line {i+1}: {line.strip()[:100]}")
    results.append("❌  Activities total value — not found")

# ── FIX: Misc total value — find by det.misc.reduce  
for i, line in enumerate(lines):
    if 'det.misc.reduce' in line and ('fontSize:15' in line or 'fontWeight:700' in line):
        lines[i] = lines[i].replace('fontSize:15,fontWeight:700,color:"#A29BFE"', 'fontSize:11,fontWeight:600,color:"rgba(162,155,254,0.8)"')
        results.append(f"✅  Misc total value fixed (line {i+1})")
        break
else:
    for i, line in enumerate(lines):
        if 'det.misc.reduce' in line:
            results.append(f"ℹ️   misc.reduce line {i+1}: {line.strip()[:100]}")
    results.append("❌  Misc total value — not found")

# ── BONUS: Any remaining padding:"14px 16px" in SegmentDetails
remaining = []
for i, line in enumerate(lines):
    if 'padding:"14px 16px"' in line:
        lines[i] = line.replace('padding:"14px 16px"', 'padding:"10px 12px"')
        remaining.append(i+1)
if remaining:
    results.append(f"✅  Remaining 14px padding swept: lines {remaining}")

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
print("\nNext: git add src/App.jsx && git commit -m 'polish: stay/food/intel padding + total values' && git push")
