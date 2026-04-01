#!/usr/bin/env python3
"""
Session 14 Nuclear Fix — adds !important to all vision-ta override rules
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_nuclear.py
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
log = []

# ─────────────────────────────────────────────────────────────────────────────
# The problem: multiple .vision-ta rules, last one wins on border/box-shadow
# Nuclear fix: find the LAST .vision-ta rule in the CSS block
# and add !important to border-left and box-shadow there
# 
# From live CSS inspection, the overriding rule has:
#   width:100%;background:rgba(255,159,67,0.025);border:1px solid rgba(169,70,29,0.25);
#   border-left:3px solid rgba(255,159,67,0.75);
#
# But computed style shows old border winning — means our patched rule
# is still loading BEFORE the original unpatched base rule somewhere
#
# Real fix: find ALL vision-ta rules and consolidate into one winner
# ─────────────────────────────────────────────────────────────────────────────

# Find all vision-ta occurrences in the CSS
import re

# Find every CSS rule block containing vision-ta
# In JSX source these are in template literals like `...CSS...`
# Count them
matches = [(m.start(), m.group()) for m in re.finditer(r'\.vision-ta\{[^}]+\}', src)]
log.append(f'Found {len(matches)} .vision-ta CSS rules')
for pos, m in matches:
    log.append(f'  pos {pos}: {m[:80]}')

# Strategy: replace ALL vision-ta CSS rules with a single consolidated winner
# First find the base rule (width:100%) and make it the only authoritative one

# Replace the patched base rule with a stronger version using !important on key props
OLD_BASE = (
    "width:100%;background:rgba(255,159,67,0.025);"
    "border:1px solid rgba(169,70,29,0.25);"
    "border-left:3px solid rgba(255,159,67,0.75);"
    "border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;"
    "font-family:'Space Mono',monospace;resize:none;outline:none;"
    "line-height:1.8;min-height:106px;"
    "box-shadow:0 0 28px rgba(255,159,67,0.10),inset 0 0 12px rgba(255,159,67,0.04);"
    "transition:border-color 0.2s,box-shadow 0.3s;margin-bottom:6px}"
)

NEW_BASE = (
    "width:100%;background:rgba(255,159,67,0.03)!important;"
    "border:1px solid rgba(169,70,29,0.2)!important;"
    "border-left:4px solid rgba(255,159,67,0.85)!important;"
    "border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;"
    "font-family:'Space Mono',monospace;resize:none;outline:none;"
    "line-height:1.8;min-height:106px;"
    "box-shadow:0 0 32px rgba(255,159,67,0.14),inset 0 0 14px rgba(255,159,67,0.05)!important;"
    "transition:border-color 0.2s,box-shadow 0.3s;margin-bottom:6px}"
)

if OLD_BASE in src:
    src = src.replace(OLD_BASE, NEW_BASE, 1)
    log.append('✅ vision-ta base: !important added to border-left + box-shadow')
else:
    log.append('⚠️  base rule not found as expected — trying partial match')
    # Try to find it by unique substring
    partial = "border-left:3px solid rgba(255,159,67,0.75);"
    if partial in src:
        src = src.replace(
            "border:1px solid rgba(169,70,29,0.25);border-left:3px solid rgba(255,159,67,0.75);",
            "border:1px solid rgba(169,70,29,0.2)!important;border-left:4px solid rgba(255,159,67,0.85)!important;",
            1
        )
        src = src.replace(
            "box-shadow:0 0 28px rgba(255,159,67,0.10),inset 0 0 12px rgba(255,159,67,0.04);",
            "box-shadow:0 0 32px rgba(255,159,67,0.14),inset 0 0 14px rgba(255,159,67,0.05)!important;",
            1
        )
        log.append('✅ vision-ta: !important via partial match')
    else:
        log.append('⚠️  partial match also failed')

# Also nuke any other vision-ta border rules that could override
# The old separate rule block added by session14_final: "border-left:2px solid rgba(255,159,67,0.6)"
# Make sure it doesn't override with a weaker value
old_weak = "border-left:2px solid rgba(255,159,67,0.6);"
new_strong = "border-left:4px solid rgba(255,159,67,0.85)!important;"
if old_weak in src:
    src = src.replace(old_weak, new_strong)
    log.append('✅ Upgraded weaker border-left 2px→4px with !important')

# Also fix the focus state box-shadow to use !important
old_focus_shadow = "box-shadow:0 0 32px rgba(255,159,67,0.16),inset 0 0 14px rgba(255,159,67,0.05)"
new_focus_shadow = "box-shadow:0 0 40px rgba(255,159,67,0.25),inset 0 0 16px rgba(255,159,67,0.08)!important"
if old_focus_shadow in src:
    src = src.replace(old_focus_shadow, new_focus_shadow)
    log.append('✅ Focus box-shadow strengthened with !important')

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
changed = src != original
if changed:
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'\n✅ {SRC} written\n')
else:
    print('\n⚠️  No changes\n')

print('─' * 60)
for line in log:
    print(line)
applied = sum(1 for l in log if l.startswith('✅'))
print('─' * 60)
print(f'Applied: {applied}')
if changed:
    print('\nNext:')
    print('  git add src/App.jsx && git commit -m "fix: Session 14 — vision-ta border !important override" && git push')
