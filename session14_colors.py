#!/usr/bin/env python3
"""
Session 14 Color Accents — full palette pass on Dream Console
Adds: electric blue #4D9FFF, cyan #00E5FF, purple #A29BFE, green #69F0AE
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_colors.py
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
log = []

# ─────────────────────────────────────────────────────────────────────────────
# 1. g-card.on selected state — upgrade from plain yellow border
#    to a multi-color glow using the full palette
#    Current: box-shadow:0 0 0 1.5px #FFD93D,0 0 28px rgba(255,217,61,0.22)
#    New: amber border + electric blue outer glow + tighter feel
# ─────────────────────────────────────────────────────────────────────────────
OLD_ON = (
    ".g-card.on{background:linear-gradient(148deg,#311400,#200e00,#150900);"
    "box-shadow:0 0 0 1.5px #FFD93D,0 0 28px rgba(255,217,61,0.22),0 6px 22px rgba(0,0,0,0.65);"
    "transform:translateY(-2px)}"
)
NEW_ON = (
    ".g-card.on{background:linear-gradient(148deg,#311400,#200e00,#150900);"
    "box-shadow:0 0 0 1.5px #FF9F43,0 0 20px rgba(255,159,67,0.3),0 0 40px rgba(77,159,255,0.12),0 6px 22px rgba(0,0,0,0.65);"
    "transform:translateY(-2px)}"
)
if OLD_ON in src:
    src = src.replace(OLD_ON, NEW_ON, 1)
    log.append('✅ C1: g-card.on — amber border + electric blue outer glow')
else:
    log.append('⚠️  C1: g-card.on not found')

# ─────────────────────────────────────────────────────────────────────────────
# 2. g-card.off:hover — add electric blue lift glow
#    Current: transform:translateY(-3px)
#    New: add box-shadow electric blue
# ─────────────────────────────────────────────────────────────────────────────
OLD_OFF_HOVER = ".g-card.off:hover{transform:translateY(-3px)}"
NEW_OFF_HOVER = ".g-card.off:hover{transform:translateY(-3px);box-shadow:0 4px 18px rgba(0,0,0,0.55),0 0 20px rgba(77,159,255,0.1),inset 0 1px 0 rgba(255,255,255,0.07)}"
if OLD_OFF_HOVER in src:
    src = src.replace(OLD_OFF_HOVER, NEW_OFF_HOVER, 1)
    log.append('✅ C2: g-card.off:hover — electric blue hover glow')
else:
    log.append('⚠️  C2: g-card.off:hover not found')

# ─────────────────────────────────────────────────────────────────────────────
# 3. dream-divider — upgrade gradient to full multi-color spectrum
#    Current: transparent → amber → cyan → transparent
#    New: full palette sweep
# ─────────────────────────────────────────────────────────────────────────────
OLD_DIV = (
    ".dream-divider{width:100%;height:1px;"
    "background:linear-gradient(90deg,transparent,rgba(255,159,67,0.22),"
    "rgba(0,229,255,0.12),rgba(162,155,254,0.1),transparent);"
    "margin:4px 0 16px 0;border:none}"
)
NEW_DIV = (
    ".dream-divider{width:100%;height:1px;"
    "background:linear-gradient(90deg,transparent,rgba(255,159,67,0.3),"
    "rgba(77,159,255,0.25),rgba(0,229,255,0.2),rgba(162,155,254,0.2),"
    "rgba(105,240,174,0.15),transparent);"
    "margin:4px 0 16px 0;border:none}"
)
if OLD_DIV in src:
    src = src.replace(OLD_DIV, NEW_DIV, 1)
    log.append('✅ C3: dream-divider — full palette gradient spectrum')
else:
    log.append('⚠️  C3: dream-divider not found — trying partial')
    # Try partial match
    old_partial = "rgba(255,159,67,0.22),rgba(0,229,255,0.12),rgba(162,155,254,0.1)"
    new_partial = "rgba(255,159,67,0.3),rgba(77,159,255,0.25),rgba(0,229,255,0.2),rgba(162,155,254,0.2),rgba(105,240,174,0.15)"
    if old_partial in src:
        src = src.replace(old_partial, new_partial, 1)
        log.append('✅ C3: dream-divider gradient — partial match')
    else:
        log.append('⚠️  C3: dream-divider partial also not found')

# ─────────────────────────────────────────────────────────────────────────────
# 4. YOUR in "WHAT'S YOUR VISION?" — upgrade from plain yellow to electric blue
#    Current: color:`#FFD93D`,fontWeight:900
#    It's the highlighted word — electric blue makes it pop as interactive/AI
# ─────────────────────────────────────────────────────────────────────────────
OLD_YOUR = "style:{color:`#FFD93D`,fontWeight:900},children:`YOUR`"
NEW_YOUR = "style:{color:`#4D9FFF`,fontWeight:900},children:`YOUR`"
if OLD_YOUR in src:
    src = src.replace(OLD_YOUR, NEW_YOUR, 1)
    log.append('✅ C4: YOUR in WHAT\'S YOUR VISION? → electric blue #4D9FFF')
else:
    log.append('⚠️  C4: YOUR span not found')

# ─────────────────────────────────────────────────────────────────────────────
# 5. g-icon font size — add color tints per card via CSS
#    Current: .g-icon{font-size:22px;margin-bottom:6px;display:block}
#    Add: filter + text-shadow for subtle glow on icons
# ─────────────────────────────────────────────────────────────────────────────
OLD_ICON = ".g-icon{font-size:22px;margin-bottom:6px;display:block}"
NEW_ICON = ".g-icon{font-size:24px;margin-bottom:6px;display:block;filter:drop-shadow(0 0 6px rgba(77,159,255,0.3));transition:filter 0.2s ease}"
if OLD_ICON in src:
    src = src.replace(OLD_ICON, NEW_ICON, 1)
    log.append('✅ C5: g-icon — electric blue drop-shadow glow on icons')
else:
    log.append('⚠️  C5: g-icon not found')

# ─────────────────────────────────────────────────────────────────────────────
# 6. g-label — add letter-spacing + subtle cyan tint to card labels
#    Current: .g-label{font-size:16px}
#    But there are multiple g-label rules — find the base one
# ─────────────────────────────────────────────────────────────────────────────
# From diagnostic: .g-label{font-size:16px} appears at the start of the block
OLD_GLABEL = ".g-label{font-size:16px}"
NEW_GLABEL = ".g-label{font-size:14px;letter-spacing:1px;color:rgba(255,255,255,0.92)}"
count_gl = src.count(OLD_GLABEL)
if count_gl > 0:
    src = src.replace(OLD_GLABEL, NEW_GLABEL, 1)
    log.append(f'✅ C6: g-label — letter-spacing + crisp white ({count_gl} found, replaced 1)')
else:
    log.append('⚠️  C6: g-label base not found')

# ─────────────────────────────────────────────────────────────────────────────
# 7. co-architect ready message — already green rgba(105,240,174,0.6) ✓
#    Confirmed from bundle: color:`rgba(105,240,174,0.6)` — good, keep it
# ─────────────────────────────────────────────────────────────────────────────
log.append('⏭️  C7: co-architect green already applied — no change needed')

# ─────────────────────────────────────────────────────────────────────────────
# 8. sec-label — already amber rgba(255,159,67,0.6) ✓ from earlier patch
#    Add: ✦ prefix accent in cyan before section labels via content
#    Do this by upgrading the .sec-label rule
# ─────────────────────────────────────────────────────────────────────────────
OLD_SEC = ".sec-label{font-size:12px;letter-spacing:5px;color:rgba(255,159,67,0.6)}"
NEW_SEC = (
    ".sec-label{font-size:12px;letter-spacing:5px;color:rgba(255,159,67,0.6)}"
    ".sec-label::before{content:'✦ ';color:rgba(0,229,255,0.5);font-size:8px;vertical-align:middle}"
)
if OLD_SEC in src:
    src = src.replace(OLD_SEC, NEW_SEC, 1)
    log.append('✅ C8: sec-label — cyan ✦ prefix via ::before')
else:
    log.append('⚠️  C8: sec-label rule not found (may already be patched differently)')

# ─────────────────────────────────────────────────────────────────────────────
# 9. dream-glow wisps — strengthen the cyan and purple accents
#    The ::before/::after may not be rendering due to position:fixed on parent
#    Replace with stronger values and absolute positioning fix
# ─────────────────────────────────────────────────────────────────────────────
OLD_AFTER = (
    ".dream-glow::after{content:\"\";position:absolute;"
    "top:60px;left:-80px;width:200px;height:120px;"
    "background:radial-gradient(ellipse,rgba(0,229,255,0.07) 0%,transparent 70%);"
    "pointer-events:none}"
    ".dream-glow::before{content:\"\";position:absolute;"
    "top:80px;right:-60px;width:160px;height:100px;"
    "background:radial-gradient(ellipse,rgba(162,155,254,0.08) 0%,transparent 70%);"
    "pointer-events:none}"
)
NEW_AFTER = (
    ".dream-glow::after{content:\"\";position:absolute;"
    "top:40px;left:-60px;width:240px;height:140px;"
    "background:radial-gradient(ellipse,rgba(77,159,255,0.12) 0%,rgba(0,229,255,0.06) 40%,transparent 70%);"
    "pointer-events:none}"
    ".dream-glow::before{content:\"\";position:absolute;"
    "top:60px;right:-40px;width:200px;height:120px;"
    "background:radial-gradient(ellipse,rgba(162,155,254,0.14) 0%,rgba(105,240,174,0.04) 50%,transparent 70%);"
    "pointer-events:none}"
)
if OLD_AFTER in src:
    src = src.replace(OLD_AFTER, NEW_AFTER, 1)
    log.append('✅ C9: dream-glow wisps — electric blue left, purple+green right (stronger)')
else:
    log.append('⚠️  C9: dream-glow ::after/::before not found — trying partial')
    old_p = "rgba(0,229,255,0.07) 0%,transparent 70%"
    if old_p in src:
        src = src.replace(old_p, "rgba(77,159,255,0.12) 0%,rgba(0,229,255,0.06) 40%,transparent 70%", 1)
        log.append('✅ C9a: dream-glow left wisp strengthened')
    old_p2 = "rgba(162,155,254,0.08) 0%,transparent 70%"
    if old_p2 in src:
        src = src.replace(old_p2, "rgba(162,155,254,0.14) 0%,rgba(105,240,174,0.04) 50%,transparent 70%", 1)
        log.append('✅ C9b: dream-glow right wisp strengthened')

# ─────────────────────────────────────────────────────────────────────────────
# 10. f-input (text input fields) — add subtle electric blue focus glow
# ─────────────────────────────────────────────────────────────────────────────
OLD_FINPUT = ".f-input{font-size:15px;padding:12px 16px}"
NEW_FINPUT = (
    ".f-input{font-size:15px;padding:12px 16px;"
    "transition:border-color 0.2s,box-shadow 0.2s}"
    ".f-input:focus{border-color:rgba(77,159,255,0.6)!important;"
    "box-shadow:0 0 16px rgba(77,159,255,0.12)!important;outline:none}"
)
if OLD_FINPUT in src:
    src = src.replace(OLD_FINPUT, NEW_FINPUT, 1)
    log.append('✅ C10: f-input focus — electric blue glow on text fields')
else:
    log.append('⚠️  C10: f-input not found')

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

print('─' * 62)
for line in log:
    print(line)
applied = sum(1 for l in log if l.startswith('✅'))
warned  = sum(1 for l in log if l.startswith('⚠️'))
skipped = sum(1 for l in log if l.startswith('⏭️'))
print('─' * 62)
print(f'Applied: {applied}  |  Warned: {warned}  |  Skipped: {skipped}')
if changed:
    print('\nNext:')
    print('  git add src/App.jsx && git commit -m "feat: Session 14 — Dream Console full color palette pass" && git push')
