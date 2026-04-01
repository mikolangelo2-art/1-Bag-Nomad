#!/usr/bin/env python3
"""
Session 13 — Quick fix: dives fontSize + date dash character
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

for i, line in enumerate(lines):
    # Fix dives font size in phase card row 2
    if 'phase.totalDives' in line and 'fontSize:10' in line and '00E5FF' in line and 'Row 2' not in line:
        # Check it's in the PhaseCard (not SegmentRow)
        context = ''.join(lines[max(0,i-5):i+2])
        if 'totalNights' in context or 'dUntil' in context:
            lines[i] = line.replace('fontSize:10,color:"#00E5FF"', 'fontSize:isMobile?12:13,color:"#00E5FF"')
            results.append(f"✅  Dives fontSize 10→12/13 in phase card (line {i+1})")
            break

# Fix &ndash; → – in phase card row 2
for i, line in enumerate(lines):
    if '&ndash;' in line and 'fD(phase.arrival)' in line:
        lines[i] = line.replace('&ndash;', '–')
        results.append(f"✅  Fixed &ndash; → – in phase card (line {i+1})")
        break

# Also ensure the – character is correct in all phase card date spans
for i, line in enumerate(lines):
    if 'fD(phase.arrival)' in line and '}&ndash;{' in line:
        lines[i] = line.replace('}&ndash;{', '}–{')
        results.append(f"✅  Fixed inline &ndash; (line {i+1})")

with open('src/App.jsx', 'w') as f:
    f.writelines(lines)

print("\n📝 File written.\n")
print("─" * 50)
for r in results:
    print(r)
print("─" * 50)
print("\nNext: git add src/App.jsx && git commit -m 'fix: phase card dives size + date dash' && git push")
