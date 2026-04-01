#!/usr/bin/env python3
"""
Session 14 Patch — 1 Bag Nomad  
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_final.py

Changes:
  1. Dream Console CSS — vision-ta amber glow, vibe-tag hover scale,
     sec-label amber tint, f-label cyan tint, shimmer keyframe,
     dream-glow expands to include cyan+purple+green accent hints
  2. Phase card — date row brightened from 0.38 → 0.80 opacity
  3. Phase card — country name color: #00E5FF → #FF9F43 amber
     (currently uses e.color||'#00E5FF', we override to amber)
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
log = []

# ─────────────────────────────────────────────────────────────────────────────
# P1  Dream Console CSS upgrades
# We patch each CSS class string directly — exact matches from live bundle
# ─────────────────────────────────────────────────────────────────────────────

# 1a. vision-ta — amber left border + glow + focus state
OLD = '.vision-ta{font-size:15px;padding:16px 20px}'
NEW = (
    '.vision-ta{'
    'font-size:15px;'
    'padding:16px 20px;'
    'border-left:2px solid rgba(255,159,67,0.6);'
    'box-shadow:0 0 24px rgba(255,159,67,0.09),inset 0 0 10px rgba(255,159,67,0.03);'
    'background:rgba(255,159,67,0.025);'
    'transition:box-shadow 0.3s ease,border-color 0.3s ease'
    '}'
    '.vision-ta:focus{'
    'border-left:2px solid rgba(255,159,67,0.9);'
    'box-shadow:0 0 32px rgba(255,159,67,0.16),inset 0 0 14px rgba(255,159,67,0.05);'
    'outline:none'
    '}'
)
if OLD in src:
    src = src.replace(OLD, NEW, 1)
    log.append('✅ P1a: vision-ta — amber glow border + focus state')
else:
    log.append('⚠️  P1a: vision-ta not found')

# 1b. vibe-tag — hover scale + transition
OLD = '.vibe-tag{font-size:11px;padding:6px 16px}'
NEW = (
    '.vibe-tag{'
    'font-size:11px;'
    'padding:6px 16px;'
    'transition:transform 0.15s ease,border-color 0.15s ease,background 0.15s ease,box-shadow 0.15s ease'
    '}'
    '.vibe-tag:hover{'
    'transform:scale(1.04);'
    'box-shadow:0 0 10px rgba(255,159,67,0.2)'
    '}'
)
if OLD in src:
    src = src.replace(OLD, NEW, 1)
    log.append('✅ P1b: vibe-tag — hover scale + shadow transition')
else:
    log.append('⚠️  P1b: vibe-tag not found')

# 1c. sec-label — amber tint + slightly warmer
OLD = '.sec-label{font-size:12px;letter-spacing:5px}'
NEW = (
    '.sec-label{'
    'font-size:12px;'
    'letter-spacing:5px;'
    'color:rgba(255,159,67,0.6)'
    '}'
)
if OLD in src:
    src = src.replace(OLD, NEW, 1)
    log.append('✅ P1c: sec-label — amber tint rgba(255,159,67,0.6)')
else:
    log.append('⚠️  P1c: sec-label not found')

# 1d. f-label — cyan tint (field labels like DESTINATION, TRAVEL STYLE)
OLD = '.f-label{font-size:11px;letter-spacing:3px}'
NEW = (
    '.f-label{'
    'font-size:11px;'
    'letter-spacing:3px;'
    'color:rgba(0,229,255,0.5)'
    '}'
)
if OLD in src:
    src = src.replace(OLD, NEW, 1)
    log.append('✅ P1d: f-label — cyan tint rgba(0,229,255,0.5)')
else:
    log.append('⚠️  P1d: f-label not found')

# 1e. launch-btn — upgrade with subtle amber glow on hover
OLD = '.launch-btn{font-size:15px;padding:20px}'
NEW = (
    '.launch-btn{'
    'font-size:15px;'
    'padding:20px;'
    'transition:box-shadow 0.2s ease,transform 0.15s ease'
    '}'
    '.launch-btn:hover{'
    'box-shadow:0 0 28px rgba(255,159,67,0.35);'
    'transform:translateY(-1px)'
    '}'
)
if OLD in src:
    src = src.replace(OLD, NEW, 1)
    log.append('✅ P1e: launch-btn — amber hover glow + lift')
else:
    log.append('⚠️  P1e: launch-btn not found')

# 1f. dream-glow — expand to include cyan + purple accent wisps
OLD = (
    '.dream-glow{position:fixed;top:-80px;left:50%;transform:translateX(-50%);'
    'width:700px;height:280px;'
    'background:radial-gradient(ellipse,rgba(169,70,29,0.4) 0%,rgba(255,217,61,0.07) 45%,transparent 70%);'
    'pointer-events:none;z-index:0;animation:glowPulse 7s ease-in-out infinite}'
)
NEW = (
    '.dream-glow{position:fixed;top:-80px;left:50%;transform:translateX(-50%);'
    'width:700px;height:280px;'
    'background:radial-gradient(ellipse,rgba(169,70,29,0.4) 0%,rgba(255,217,61,0.07) 45%,transparent 70%);'
    'pointer-events:none;z-index:0;animation:glowPulse 7s ease-in-out infinite}'
    '.dream-glow::after{'
    'content:"";'
    'position:absolute;'
    'top:60px;left:-80px;'
    'width:200px;height:120px;'
    'background:radial-gradient(ellipse,rgba(0,229,255,0.07) 0%,transparent 70%);'
    'pointer-events:none'
    '}'
    '.dream-glow::before{'
    'content:"";'
    'position:absolute;'
    'top:80px;right:-60px;'
    'width:160px;height:100px;'
    'background:radial-gradient(ellipse,rgba(162,155,254,0.08) 0%,transparent 70%);'
    'pointer-events:none'
    '}'
)
if OLD in src:
    src = src.replace(OLD, NEW, 1)
    log.append('✅ P1f: dream-glow — cyan + purple accent wisps via ::before/::after')
else:
    log.append('⚠️  P1f: dream-glow exact string not found — check spacing')

# 1g. Add shimmer keyframe + dream-divider class after dream-content rule
OLD = '.dream-content{max-width:780px;padding:40px 52px 70px}'
NEW = (
    '.dream-content{max-width:780px;padding:40px 52px 70px}'
    '@keyframes shimmerOnce{'
    '0%{background-position:-200% center}'
    '65%{background-position:200% center}'
    '100%{background-position:200% center}'
    '}'
    '.dream-big-shimmer{'
    'background:linear-gradient(90deg,#FFD93D 25%,#fff 45%,#FF9F43 55%,#FFD93D 75%);'
    'background-size:200% auto;'
    '-webkit-background-clip:text;'
    '-webkit-text-fill-color:transparent;'
    'background-clip:text;'
    'animation:shimmerOnce 2s ease forwards'
    '}'
    '.dream-divider{'
    'width:100%;height:1px;'
    'background:linear-gradient(90deg,transparent,rgba(255,159,67,0.22),rgba(0,229,255,0.12),rgba(162,155,254,0.1),transparent);'
    'margin:4px 0 16px 0;'
    'border:none'
    '}'
    '.dream-accent-green{'
    'color:rgba(105,240,174,0.45)'
    '}'
)
if OLD in src:
    src = src.replace(OLD, NEW, 1)
    log.append('✅ P1g: shimmerOnce keyframe + dream-divider + dream-big-shimmer class added')
else:
    log.append('⚠️  P1g: dream-content rule not found')

# ─────────────────────────────────────────────────────────────────────────────
# P2  Apply dream-big-shimmer className to the DREAM BIG span/div
# Find: fontWeight:900 near children:`DREAM BIG`  (Fraunces header)
# The DREAM BIG element uses letterSpacing:6 — unique identifier
# ─────────────────────────────────────────────────────────────────────────────
# Strategy: find the DREAM BIG text node and add className to its parent div
# In the bundle: children:`DREAM BIG` with letterSpacing:6
dreambig_target = "letterSpacing:6},children:`DREAM BIG`"
dreambig_idx = src.find(dreambig_target)
if dreambig_idx > 0:
    # Find the style:{ opening of this element
    style_open = src.rfind('{style:{', 0, dreambig_idx)
    # Find the jsx element opening ('div',{ or 'span',{) just before style
    for tag in ["'div',{", '"div",{']:
        tag_pos = src.rfind(tag, 0, dreambig_idx)
        if tag_pos > 0 and dreambig_idx - tag_pos < 350:
            # Insert className after the opening brace
            if 'dream-big-shimmer' not in src[tag_pos:tag_pos+50]:
                src = src[:tag_pos+7] + "className:'dream-big-shimmer'," + src[tag_pos+7:]
                log.append('✅ P2: dream-big-shimmer className → DREAM BIG element')
            else:
                log.append('⏭️  P2: dream-big-shimmer already on DREAM BIG')
            break
    else:
        log.append('⚠️  P2: Could not find DREAM BIG parent div within 350 chars')
else:
    log.append('⚠️  P2: letterSpacing:6 + DREAM BIG not found')

# ─────────────────────────────────────────────────────────────────────────────
# P3  Phase card — date row: brighten color from rgba(255,255,255,0.38) → 0.78
# Confirmed in bundle: `rgba(255,255,255,0.38)` on the nights/date row
# ─────────────────────────────────────────────────────────────────────────────
OLD_DATE = 'color:`rgba(255,255,255,0.38)`,marginLeft:`auto`'
NEW_DATE = 'color:`rgba(255,255,255,0.78)`,marginLeft:`auto`'
if OLD_DATE in src:
    src = src.replace(OLD_DATE, NEW_DATE)
    log.append('✅ P3: Phase card date/nights row → rgba(255,255,255,0.78) brighter')
else:
    log.append('⚠️  P3: Phase date row color string not found')

# ─────────────────────────────────────────────────────────────────────────────
# P4  Phase card Row 1 — country name color: #00E5FF → #FF9F43 amber
# From bundle: color:e.color||`#00E5FF` on the flag+name span
# ─────────────────────────────────────────────────────────────────────────────
OLD_COUNTRY = "color:e.color||`#00E5FF`,whiteSpace:`nowrap`,fontWeight:700},children:[e.flag,` `,e.name]"
NEW_COUNTRY = "color:`#FF9F43`,whiteSpace:`nowrap`,fontWeight:700},children:[e.flag,` `,e.name]"
if OLD_COUNTRY in src:
    src = src.replace(OLD_COUNTRY, NEW_COUNTRY, 1)
    log.append('✅ P4: Phase card country name → amber #FF9F43')
else:
    log.append('⚠️  P4: Phase card country name color pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# P5  Phase card Row 2 — nights/dives font size bump (15 → already 15, good)
#     But the date text color at 0.38 is already handled above in P3
#     Bump the date fontSize from 15 to match — already 15, confirmed
# ─────────────────────────────────────────────────────────────────────────────
# Nothing extra needed — P3 handles the visibility

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
changed = src != original
if changed:
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'\n✅ {SRC} written — {len(log)} patches\n')
else:
    print('\n⚠️  No changes written — all patches were no-ops\n')

print('─' * 62)
for line in log:
    print(line)
applied = sum(1 for l in log if l.startswith('✅'))
warned  = sum(1 for l in log if l.startswith('⚠️'))
skipped = sum(1 for l in log if l.startswith('⏭️'))
print('─' * 62)
print(f'Applied: {applied}  |  Warned: {warned}  |  Skipped: {skipped}')
print()
if changed:
    print('Next step:')
    print('  git add src/App.jsx && git commit -m "feat: Session 14 — Dream Console polish, phase card amber" && git push')
