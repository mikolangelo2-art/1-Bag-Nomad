#!/usr/bin/env python3
"""
Session 14 Fix Patch — 3 warnings from session14_final.py
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_fix.py
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
log = []

# ─────────────────────────────────────────────────────────────────────────────
# FIX P2: DREAM BIG shimmer — letterSpacing is 3 not 6
# Exact string from bundle:
#   fontWeight:900,color:`#FFD93D`,letterSpacing:3,textShadow:`0 0 30px rgba(255,217,61,0.5)`,lineHeight:1},children:`DREAM BIG`
# ─────────────────────────────────────────────────────────────────────────────
OLD_DB = "fontWeight:900,color:`#FFD93D`,letterSpacing:3,textShadow:`0 0 30px rgba(255,217,61,0.5)`,lineHeight:1},children:`DREAM BIG`"
NEW_DB = "fontWeight:900,color:`#FFD93D`,letterSpacing:3,textShadow:`0 0 30px rgba(255,217,61,0.5)`,lineHeight:1,WebkitTextFillColor:`transparent`,background:`linear-gradient(90deg,#FFD93D 25%,#fff 45%,#FF9F43 55%,#FFD93D 75%)`,backgroundSize:`200% auto`,WebkitBackgroundClip:`text`,backgroundClip:`text`,animation:`shimmerOnce 2s ease forwards`},children:`DREAM BIG`"

if OLD_DB in src:
    src = src.replace(OLD_DB, NEW_DB, 1)
    log.append('✅ FIX P2: DREAM BIG shimmer — inline style applied (letterSpacing:3 found)')
else:
    log.append('⚠️  FIX P2: DREAM BIG target still not found — check manually')

# ─────────────────────────────────────────────────────────────────────────────
# FIX P3: Phase card date row — exact string from bundle
# `rgba(255,255,255,0.38)`,marginLeft:`auto`},children:[`·· `,e.nights,`n`]
# Note: the ·· are actual emoji chars in source — use unicode
# ─────────────────────────────────────────────────────────────────────────────
# The exact pattern with the moon emoji prefix:
OLD_DATE = "color:`rgba(255,255,255,0.38)`,marginLeft:`auto`"
NEW_DATE = "color:`rgba(255,255,255,0.80)`,marginLeft:`auto`"

count = src.count(OLD_DATE)
if count > 0:
    src = src.replace(OLD_DATE, NEW_DATE)
    log.append(f'✅ FIX P3: Date row color 0.38 → 0.80 ({count} instance(s) replaced)')
else:
    log.append('⚠️  FIX P3: rgba(255,255,255,0.38) + marginLeft:auto not found')

# ─────────────────────────────────────────────────────────────────────────────
# FIX P4: Phase card country name — two targets from bundle
#
# Target A (Row 1 flag+name span — the one with e.color||#00E5FF):
#   fontSize:n?13:15,color:e.color||`#00E5FF`,whiteSpace:`nowrap`,fontWeight:700},children:[e.flag,` `,e.name]
#
# Target B (expanded view country label):
#   fontSize:15,fontWeight:700,color:`rgba(255,255,255,0.75)`,marginBottom:3,letterSpacing:.5},children:e.country
# ─────────────────────────────────────────────────────────────────────────────

# Target A — Row 1 collapsed view: flag + destination name
OLD_A = "fontSize:n?13:15,color:e.color||`#00E5FF`,whiteSpace:`nowrap`,fontWeight:700},children:[e.flag,` `,e.name]"
NEW_A = "fontSize:n?13:15,color:`#FF9F43`,whiteSpace:`nowrap`,fontWeight:700},children:[e.flag,` `,e.name]"

if OLD_A in src:
    src = src.replace(OLD_A, NEW_A, 1)
    log.append('✅ FIX P4a: Phase card Row 1 country name → amber #FF9F43')
else:
    log.append('⚠️  FIX P4a: Row 1 flag+name color pattern not found')

# Target B — Row 1 expanded destination label (e.destination instead of e.name)
# From bundle: e.destination is used in the phase row heading
OLD_B = "fontSize:15,fontWeight:700,color:`rgba(255,255,255,0.75)`,marginBottom:3,letterSpacing:.5},children:e.country"
NEW_B = "fontSize:15,fontWeight:700,color:`#FF9F43`,marginBottom:3,letterSpacing:.5},children:e.country"

if OLD_B in src:
    src = src.replace(OLD_B, NEW_B, 1)
    log.append('✅ FIX P4b: Phase card expanded country label → amber #FF9F43')
else:
    log.append('⚠️  FIX P4b: Expanded country label pattern not found')

# Also fix the phase Row 1 destination (e.destination) — from moon context:
# fontSize:15,fontWeight:700,color:`#FFF`},children:[e.flag||`··`,` `,e.destination]
OLD_DEST = "fontSize:15,fontWeight:700,color:`#FFF`},children:[e.flag||`"
NEW_DEST = "fontSize:15,fontWeight:700,color:`#FF9F43`},children:[e.flag||`"
count_dest = src.count(OLD_DEST)
if count_dest > 0:
    src = src.replace(OLD_DEST, NEW_DEST, 1)
    log.append(f'✅ FIX P4c: Phase card Row 1 destination #FFF → amber #FF9F43')
else:
    log.append('⚠️  FIX P4c: Row 1 destination #FFF pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
changed = src != original
if changed:
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'\n✅ {SRC} written\n')
else:
    print('\n⚠️  No changes — all patterns were no-ops\n')

print('─' * 60)
for line in log:
    print(line)
applied = sum(1 for l in log if l.startswith('✅'))
warned  = sum(1 for l in log if l.startswith('⚠️'))
print('─' * 60)
print(f'Applied: {applied}  |  Warned: {warned}')
if changed:
    print('\nNext:')
    print('  git add src/App.jsx && git commit -m "fix: Session 14 — DREAM BIG shimmer, phase card amber, date row brightness" && git push')
