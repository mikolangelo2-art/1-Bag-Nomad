#!/usr/bin/env python3
"""
Session 13 — Fix scroll, globe emoji, vision timing
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# ── FIX 1: Globe emoji — find exact current ENTER TRIP CONSOLE button text
for i, line in enumerate(lines):
    if 'ENTER TRIP CONSOLE' in line and 'button' in line.lower():
        if '🌍' not in line:
            lines[i] = line.replace('ENTER TRIP CONSOLE →', '🌍  ENTER TRIP CONSOLE →')
            results.append(f"✅  Globe emoji added (line {i+1})")
        else:
            results.append(f"✅  Globe emoji already present (line {i+1})")
        break

# ── FIX 2: Scroll to top on CoArchitect — find existing useEffect and add before it
# Look for the chatEnd scrollIntoView useEffect
coarch_fixed = False
for i, line in enumerate(lines):
    if 'chatEnd.current?.scrollIntoView' in line and 'useEffect' in line:
        # Check if scroll already added before this
        prev = ''.join(lines[max(0,i-3):i])
        if 'window.scrollTo(0,0)' not in prev:
            lines.insert(i, '  useEffect(()=>{window.scrollTo(0,0);},[]);\n')
            results.append(f"✅  CoArchitect scroll to top added (before line {i+1})")
            coarch_fixed = True
        else:
            results.append(f"✅  CoArchitect scroll already present")
            coarch_fixed = True
        break
if not coarch_fixed:
    results.append("❌  CoArchitect scroll — chatEnd useEffect not found")

# ── FIX 3: Vision quote — remove the 5s pause, go back to fast (500ms)
# The quote lives on Trip Console so we don't need to hold here
for i, line in enumerate(lines):
    if 'setShowStats(true),5000' in line:
        lines[i] = line.replace('setShowStats(true),5000', 'setShowStats(true),800')
        lines[i] = lines[i].replace('setShowPhases(true),5600', 'setShowPhases(true),1200')
        results.append(f"✅  Vision quote timing: 5s → 0.8s (fast, not held) (line {i+1})")
        break

# Also catch the second instance
for i, line in enumerate(lines):
    if 'setShowStats(true),5000' in line:
        lines[i] = line.replace('setShowStats(true),5000', 'setShowStats(true),800')
        lines[i] = lines[i].replace('setShowPhases(true),5600', 'setShowPhases(true),1200')
        results.append(f"✅  Vision quote timing 2nd instance fixed (line {i+1})")

# ── Write
with open('src/App.jsx', 'w') as f:
    f.writelines(lines)

print("\n📝 File written.\n")
print("─" * 50)
for r in results:
    print(r)
print("─" * 50)
print("\nNext: git add src/App.jsx && git commit -m 'fix: scroll top coarchitect, globe emoji, vision timing' && git push")
