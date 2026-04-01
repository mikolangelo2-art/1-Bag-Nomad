#!/usr/bin/env python3
"""
Session 14 Fix v4 — P4a only: phase name color
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_fix4.py
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
log = []

# ─────────────────────────────────────────────────────────────────────────────
# From diagnostic pos 129578 the structure is:
#   <span style={{fontSize:15}}>{phase.flag}</span>
#   <div><div style={{fontSize:isMobile?13:15,fontWeight:700,color:"#FFF"}}>{phase.name}
#
# Flag and name are separate — just target the name div's color
# ─────────────────────────────────────────────────────────────────────────────

attempts = [
    # Double-quote variants
    ('fontSize:isMobile?13:15,fontWeight:700,color:"#FFF"}}>{phase.name}',
     'fontSize:isMobile?13:15,fontWeight:700,color:"#FF9F43"}}>{phase.name}'),
    # Without isMobile
    ('fontSize:15,fontWeight:700,color:"#FFF"}}>{phase.name}',
     'fontSize:15,fontWeight:700,color:"#FF9F43"}}>{phase.name}'),
    # Single-quote variants
    ("fontSize:isMobile?13:15,fontWeight:700,color:'#FFF'}}>{phase.name}",
     "fontSize:isMobile?13:15,fontWeight:700,color:'#FF9F43'}}>{phase.name}"),
    ("fontSize:15,fontWeight:700,color:'#FFF'}}>{phase.name}",
     "fontSize:15,fontWeight:700,color:'#FF9F43'}}>{phase.name}"),
]

for old, new in attempts:
    if old in src:
        src = src.replace(old, new, 1)
        log.append(f'✅ P4a: phase.name → amber #FF9F43')
        log.append(f'   matched: {repr(old[:60])}')
        break
else:
    # Fallback: scan every line containing phase.name for color:#FFF
    log.append('⚠️  P4a: standard patterns missed — scanning line by line')
    lines = src.split('\n')
    changed_lines = 0
    for i, line in enumerate(lines):
        if 'phase.name' in line and ('#FFF"' in line or "#FFF'" in line):
            # Only target fontWeight:700 lines (phase card header, not other uses)
            if 'fontWeight:700' in line or 'fontWeight:900' in line:
                old_line = line
                new_line = line.replace('color:"#FFF"', 'color:"#FF9F43"', 1)
                new_line = new_line.replace("color:'#FFF'", "color:'#FF9F43'", 1)
                if new_line != old_line:
                    lines[i] = new_line
                    log.append(f'✅ P4a: Line {i+1} patched: {repr(old_line.strip()[:80])}')
                    changed_lines += 1
                    break  # Only first match — phase card row 1
    if changed_lines > 0:
        src = '\n'.join(lines)
    else:
        log.append('⚠️  P4a: No matching line found — printing all phase.name lines:')
        for i, line in enumerate(lines):
            if 'phase.name' in line:
                log.append(f'   L{i+1}: {repr(line.strip()[:100])}')

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
changed = src != original
if changed:
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'\n✅ {SRC} written\n')
else:
    print('\n⚠️  No changes made\n')

print('─' * 60)
for line in log:
    print(line)
applied = sum(1 for l in log if l.startswith('✅'))
warned  = sum(1 for l in log if l.startswith('⚠️'))
print('─' * 60)
print(f'Applied: {applied}  |  Warned: {warned}')
if changed:
    print('\nNext:')
    print('  git add src/App.jsx && git commit -m "fix: Session 14d — phase card name amber" && git push')
