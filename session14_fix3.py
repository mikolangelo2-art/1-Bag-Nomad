#!/usr/bin/env python3
"""
Session 14 Fix v3 — exact strings from diagnostic screenshot
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_fix3.py
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
log = []

# ─────────────────────────────────────────────────────────────────────────────
# FIX P4a: Phase card Row 1 flag + name
# From diagnostic screenshot pos 129578:
#   style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FFF"}}>{phase.flag} {phase.name}
# ─────────────────────────────────────────────────────────────────────────────
OLD_A = 'fontSize:isMobile?13:15,fontWeight:700,color:"#FFF"}}>{phase.flag} {phase.name}'
NEW_A = 'fontSize:isMobile?13:15,fontWeight:700,color:"#FF9F43"}}>{phase.flag} {phase.name}'

if OLD_A in src:
    src = src.replace(OLD_A, NEW_A, 1)
    log.append('✅ P4a: Phase Row 1 flag+name → amber #FF9F43')
else:
    # single-quote variant
    OLD_A2 = "fontSize:isMobile?13:15,fontWeight:700,color:'#FFF'}}>{phase.flag} {phase.name}"
    if OLD_A2 in src:
        src = src.replace(OLD_A2, OLD_A2.replace("'#FFF'", "'#FF9F43'"), 1)
        log.append('✅ P4a: Phase Row 1 flag+name → amber (single-quote)')
    else:
        log.append('⚠️  P4a: isMobile?13:15 flag+name pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# FIX P4b: Phase card country label in collapsed row
# From diagnostic screenshot pos 129798:
#   fontSize:isMobile?11:13,color:"rgba(255,255,255,0.55)"}}>{phase.nights}n · {phase.country}
# We want country to be amber — but nights stays dim
# Split the render: keep nights color dim, make country amber
# Replace the whole span so country gets its own color
# ─────────────────────────────────────────────────────────────────────────────

# Current: one span wraps both nights + country at 0.55 opacity
# Target: keep nights dim, country amber
# The exact string (from screenshot):
OLD_B = 'color:"rgba(255,255,255,0.55)"}}>{phase.nights}n · {phase.country}'
NEW_B = 'color:"rgba(255,255,255,0.55)"}}>{phase.nights}n · <span style={{color:"#FF9F43",fontWeight:600}}>{phase.country}</span>'

if OLD_B in src:
    src = src.replace(OLD_B, NEW_B, 1)
    log.append('✅ P4b: phase.country → amber #FF9F43 inline span (nights stays dim)')
else:
    OLD_B2 = "color:'rgba(255,255,255,0.55)'}}>{phase.nights}n · {phase.country}"
    if OLD_B2 in src:
        src = src.replace(OLD_B2,
            "color:'rgba(255,255,255,0.55)'}}>{phase.nights}n · <span style={{color:'#FF9F43',fontWeight:600}}>{phase.country}</span>",
            1)
        log.append('✅ P4b: phase.country → amber (single-quote)')
    else:
        # Try fontSize variant from diagnostic
        OLD_B3 = 'fontSize:isMobile?11:13,color:"rgba(255,255,255,0.55)"}}>{phase.nights}n · {phase.country}'
        NEW_B3 = 'fontSize:isMobile?11:13,color:"rgba(255,255,255,0.55)"}}>{phase.nights}n · <span style={{color:"#FF9F43",fontWeight:600}}>{phase.country}</span>'
        if OLD_B3 in src:
            src = src.replace(OLD_B3, NEW_B3, 1)
            log.append('✅ P4b: phase.country → amber (isMobile variant)')
        else:
            log.append('⚠️  P4b: phase.country pattern not found — check exact spacing around 0.55')

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
changed = src != original
if changed:
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'\n✅ {SRC} written\n')
else:
    print('\n⚠️  Still no matches — running targeted grep output:\n')
    # Print the exact lines for manual inspection
    lines = src.split('\n')
    print('Lines containing phase.flag or phase.name or phase.country:')
    for i, line in enumerate(lines):
        if any(x in line for x in ['phase.flag', 'phase.name}', 'phase.country']):
            print(f'  L{i+1}: {repr(line.strip()[:120])}')

print('─' * 60)
for line in log:
    print(line)
applied = sum(1 for l in log if l.startswith('✅'))
warned  = sum(1 for l in log if l.startswith('⚠️'))
print('─' * 60)
print(f'Applied: {applied}  |  Warned: {warned}')
if changed:
    print('\nNext:')
    print('  git add src/App.jsx && git commit -m "fix: Session 14c — phase card country amber, row1 name amber" && git push')
