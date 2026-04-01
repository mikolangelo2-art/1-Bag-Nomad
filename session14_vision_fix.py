#!/usr/bin/env python3
"""
Session 14 Vision Fix — patches the base .vision-ta CSS rule directly
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_vision_fix.py
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
log = []

# ─────────────────────────────────────────────────────────────────────────────
# The base .vision-ta rule (confirmed from live CSS inspection):
# width:100%;background:rgba(169,70,29,0.07);border:1px solid rgba(169,70,29,0.48);
# border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;
# font-family:'Space Mono',monospace;resize:none;outline:none;line-height:1.8;
# min-height:106px;transition:border-color 0.2s,box-shadow 0.2s;margin-bottom:6px}
#
# Fix: replace shorthand border with border-left amber + transparent other sides
#      add box-shadow amber glow directly here (not as separate rule)
# ─────────────────────────────────────────────────────────────────────────────

OLD = (
    "width:100%;background:rgba(169,70,29,0.07);"
    "border:1px solid rgba(169,70,29,0.48);"
    "border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;"
    "font-family:'Space Mono',monospace;resize:none;outline:none;"
    "line-height:1.8;min-height:106px;"
    "transition:border-color 0.2s,box-shadow 0.2s;margin-bottom:6px}"
)

NEW = (
    "width:100%;background:rgba(255,159,67,0.025);"
    "border:1px solid rgba(169,70,29,0.25);"          # soft base border all sides
    "border-left:3px solid rgba(255,159,67,0.75);"    # amber hero left border
    "border-radius:12px;color:#FFF;font-size:12px;padding:14px 16px;"
    "font-family:'Space Mono',monospace;resize:none;outline:none;"
    "line-height:1.8;min-height:106px;"
    "box-shadow:0 0 28px rgba(255,159,67,0.10),inset 0 0 12px rgba(255,159,67,0.04);"
    "transition:border-color 0.2s,box-shadow 0.3s;margin-bottom:6px}"
)

if OLD in src:
    src = src.replace(OLD, NEW, 1)
    log.append('✅ vision-ta base rule: amber left border + glow applied')
else:
    # Try without the closing brace (might be followed by newline)
    OLD2 = (
        "width:100%;background:rgba(169,70,29,0.07);"
        "border:1px solid rgba(169,70,29,0.48);"
        "border-radius:12px"
    )
    if OLD2 in src:
        # Replace just the background + border portion
        src = src.replace(
            "background:rgba(169,70,29,0.07);border:1px solid rgba(169,70,29,0.48);border-radius:12px",
            "background:rgba(255,159,67,0.025);border:1px solid rgba(169,70,29,0.2);border-left:3px solid rgba(255,159,67,0.75);border-radius:12px",
            1
        )
        # Also inject box-shadow before the transition
        src = src.replace(
            "min-height:106px;transition:border-color 0.2s,box-shadow 0.2s",
            "min-height:106px;box-shadow:0 0 28px rgba(255,159,67,0.10),inset 0 0 12px rgba(255,159,67,0.04);transition:border-color 0.2s,box-shadow 0.3s",
            1
        )
        log.append('✅ vision-ta: amber border + glow (partial match)')
    else:
        log.append('⚠️  vision-ta base rule not found — manual check needed')

# ─────────────────────────────────────────────────────────────────────────────
# Also fix the focus state — the existing focus rule uses yellow #FFD93D
# Upgrade it to amber and stronger glow
# ─────────────────────────────────────────────────────────────────────────────

OLD_FOCUS = "border-color:rgba(255,217,61,0.48);box-shadow:rgba(255,217,61,0.07) 0px 0px 0px 3px"
# This is computed style — in source it'll be different format
OLD_FOCUS_SRC = "border-color:rgba(255,217,61,0.48);box-shadow:0 0 0 3px rgba(255,217,61,0.07)"
NEW_FOCUS_SRC = "border-left:3px solid rgba(255,159,67,1);box-shadow:0 0 32px rgba(255,159,67,0.18),inset 0 0 14px rgba(255,159,67,0.06)"

if OLD_FOCUS_SRC in src:
    src = src.replace(OLD_FOCUS_SRC, NEW_FOCUS_SRC, 1)
    log.append('✅ vision-ta focus: amber intensified')
else:
    # Try alternate format
    for old_f in [
        "border-color:rgba(255,217,61,.48);box-shadow:0 0 0 3px rgba(255,217,61,.07)",
        "border-color:rgba(255,217,61,0.48)",
    ]:
        if old_f in src:
            idx = src.find(old_f)
            # Find end of this focus rule
            end = src.find('}', idx)
            focus_rule = src[idx:end]
            new_focus_rule = "border-left-color:rgba(255,159,67,1);box-shadow:0 0 32px rgba(255,159,67,0.18),inset 0 0 14px rgba(255,159,67,0.06)"
            src = src[:idx] + new_focus_rule + src[end:]
            log.append(f'✅ vision-ta focus: upgraded (pattern: {old_f[:40]})')
            break
    else:
        log.append('⚠️  vision-ta focus rule not found (non-critical)')

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
changed = src != original
if changed:
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'\n✅ {SRC} written\n')
else:
    print('\n⚠️  No changes — need to inspect source manually\n')
    print('Run this to find the exact line:')
    print('  grep -n "vision-ta" src/App.jsx')
    print('  grep -n "169,70,29,0.07" src/App.jsx')

print('─' * 60)
for line in log:
    print(line)
applied = sum(1 for l in log if l.startswith('✅'))
warned  = sum(1 for l in log if l.startswith('⚠️'))
print('─' * 60)
print(f'Applied: {applied}  |  Warned: {warned}')
if changed:
    print('\nNext:')
    print('  git add src/App.jsx && git commit -m "fix: Session 14 — vision textarea amber border direct override" && git push')
