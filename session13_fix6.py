#!/usr/bin/env python3
"""
Session 13 — Exact line fixes using line numbers from diagnostic
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# ── FIX 1: ENTER TRIP CONSOLE globe emoji
# Line 870 has the button — replace any variant
for i, line in enumerate(lines):
    if 'ENTER TRIP CONSOLE' in line and 'button' in line:
        # Strip any existing emoji attempts and add clean one
        orig = lines[i]
        # Remove any existing globe-like prefixes
        lines[i] = lines[i].replace('🌍  ENTER TRIP CONSOLE →', 'ENTER TRIP CONSOLE →')
        lines[i] = lines[i].replace('🌍 ENTER TRIP CONSOLE →', 'ENTER TRIP CONSOLE →')
        lines[i] = lines[i].replace('\U0001f30d  ENTER TRIP CONSOLE →', 'ENTER TRIP CONSOLE →')
        # Now add it fresh as Unicode escape to avoid encoding issues
        lines[i] = lines[i].replace('>ENTER TRIP CONSOLE \u2192</button>', '>\U0001f30d  ENTER TRIP CONSOLE \u2192</button>')
        if lines[i] != orig:
            results.append(f"✅  Globe emoji fixed on line {i+1}")
        else:
            results.append(f"ℹ️   Line {i+1} unchanged: {lines[i].strip()[:80]}")
        break

# ── FIX 2: CoArchitect scroll — the issue is multiple scrollTo calls
# exist but they may be firing BEFORE the component fully mounts
# The real fix: use scrollTo inside the genInsight setTimeout which
# fires after 2000ms — that's too late. 
# Instead: wrap in requestAnimationFrame for guaranteed post-render scroll
# Find CoArchitect function and add rAF scroll
coarch_start = -1
for i, line in enumerate(lines):
    if 'function CoArchitect(' in line:
        coarch_start = i
        break

if coarch_start > -1:
    # Find the first useEffect in CoArchitect
    for i in range(coarch_start, min(coarch_start + 50, len(lines))):
        if 'useEffect(()=>{window.scrollTo(0,0)' in lines[i]:
            # Replace simple scrollTo with rAF version
            lines[i] = lines[i].replace(
                'useEffect(()=>{window.scrollTo(0,0);},[]);',
                'useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});},[]);'
            )
            results.append(f"✅  CoArchitect: scrollTo → rAF instant scroll (line {i+1})")
            break
    else:
        # Add it after the useState declarations
        for i in range(coarch_start, min(coarch_start + 30, len(lines))):
            if 'const [mobileTab' in lines[i]:
                lines.insert(i+1, '  useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});},[]);\n')
                results.append(f"✅  CoArchitect: rAF scroll inserted after line {i+1}")
                break

# ── Also fix MissionConsole scroll the same way
mc_start = -1
for i, line in enumerate(lines):
    if 'function MissionConsole(' in line:
        mc_start = i
        break

if mc_start > -1:
    for i in range(mc_start, min(mc_start + 20, len(lines))):
        if 'useEffect(()=>{window.scrollTo(0,0);},[]);' in lines[i]:
            lines[i] = lines[i].replace(
                'useEffect(()=>{window.scrollTo(0,0);},[]);',
                'useEffect(()=>{requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:"instant"});});},[]);'
            )
            results.append(f"✅  MissionConsole: rAF scroll (line {i+1})")
            break

# ── Write
with open('src/App.jsx', 'w') as f:
    f.writelines(lines)

print("\n📝 File written.\n")
print("─" * 55)
for r in results:
    print(r)
print("─" * 55)
print("\nNext: git add src/App.jsx && git commit -m 'fix: rAF scroll CoArchitect + globe emoji' && git push")
