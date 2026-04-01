#!/usr/bin/env python3
"""
Session 14 Fix Patch v2 — exact JSX source strings from diagnostic
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_fix2.py
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
log = []

# ─────────────────────────────────────────────────────────────────────────────
# FIX P2: DREAM BIG shimmer
# From diagnostic pos ~129xxx:
# style={{fontFamily:"\'Fraunces\'",serif",fontSize:isMobile?13:22,fontWeight:900,color:"#FFD93D",letterSpacing:3,textShadow:"0 0 30px rgba(255,217,61,0.5)",lineHeight:1}}
# ─────────────────────────────────────────────────────────────────────────────

OLD_DB = 'fontWeight:900,color:"#FFD93D",letterSpacing:3,textShadow:"0 0 30px rgba(255,217,61,0.5)",lineHeight:1}}'
NEW_DB = 'fontWeight:900,letterSpacing:3,textShadow:"0 0 30px rgba(255,217,61,0.5)",lineHeight:1,WebkitTextFillColor:"transparent",background:"linear-gradient(90deg,#FFD93D 25%,#fff 45%,#FF9F43 55%,#FFD93D 75%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",backgroundClip:"text",animation:"shimmerOnce 2s ease forwards"}}'

if OLD_DB in src:
    src = src.replace(OLD_DB, NEW_DB, 1)
    log.append('✅ FIX P2: DREAM BIG shimmer applied via inline style')
else:
    # Try alternate quote style
    OLD_DB2 = "fontWeight:900,color:'#FFD93D',letterSpacing:3,textShadow:'0 0 30px rgba(255,217,61,0.5)',lineHeight:1}}"
    if OLD_DB2 in src:
        NEW_DB2 = "fontWeight:900,letterSpacing:3,textShadow:'0 0 30px rgba(255,217,61,0.5)',lineHeight:1,WebkitTextFillColor:'transparent',background:'linear-gradient(90deg,#FFD93D 25%,#fff 45%,#FF9F43 55%,#FFD93D 75%)',backgroundSize:'200% auto',WebkitBackgroundClip:'text',backgroundClip:'text',animation:'shimmerOnce 2s ease forwards'}}"
        src = src.replace(OLD_DB2, NEW_DB2, 1)
        log.append('✅ FIX P2: DREAM BIG shimmer applied (single-quote variant)')
    else:
        log.append('⚠️  FIX P2: DREAM BIG — trying broader search')
        # Broadest match — just find color:#FFD93D near lineHeight:1 near DREAM BIG
        db_idx = src.find('DREAM BIG')
        if db_idx > 0:
            window = src[max(0,db_idx-400):db_idx+20]
            # Find color setting in this window
            for color_str in ['color:"#FFD93D"', "color:'#FFD93D'"]:
                ci = window.rfind(color_str)
                if ci >= 0:
                    abs_ci = max(0,db_idx-400) + ci
                    # Replace just the color with shimmer style
                    src = src[:abs_ci] + src[abs_ci:].replace(
                        color_str + ',letterSpacing:3',
                        'letterSpacing:3,WebkitTextFillColor:"transparent",background:"linear-gradient(90deg,#FFD93D 25%,#fff 45%,#FF9F43 55%,#FFD93D 75%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",backgroundClip:"text",animation:"shimmerOnce 2s ease forwards"',
                        1
                    )
                    log.append('✅ FIX P2: DREAM BIG shimmer (broad match)')
                    break
            else:
                log.append('⚠️  FIX P2: DREAM BIG color not found — needs manual check')


# ─────────────────────────────────────────────────────────────────────────────
# FIX P3: Phase card date row brightness
# From diagnostic pos 56969:
# <span style={{fontSize:15,color:"rgba(255,255,255,0.38)",marginLeft:"auto"}}>🌙 {p.nights}n</span>
# ─────────────────────────────────────────────────────────────────────────────

OLD_DATE = 'fontSize:15,color:"rgba(255,255,255,0.38)",marginLeft:"auto"'
NEW_DATE = 'fontSize:15,color:"rgba(255,255,255,0.82)",marginLeft:"auto"'

count = src.count(OLD_DATE)
if count > 0:
    src = src.replace(OLD_DATE, NEW_DATE, 1)  # Only first — phase card, not briefing
    log.append(f'✅ FIX P3: Date/nights row → rgba 0.38→0.82 ({count} found, replaced 1)')
else:
    OLD_DATE2 = "fontSize:15,color:'rgba(255,255,255,0.38)',marginLeft:'auto'"
    count2 = src.count(OLD_DATE2)
    if count2 > 0:
        src = src.replace(OLD_DATE2, OLD_DATE2.replace('0.38','0.82'), 1)
        log.append(f'✅ FIX P3: Date/nights row → 0.82 (single-quote variant)')
    else:
        log.append('⚠️  FIX P3: date row pattern not found')


# ─────────────────────────────────────────────────────────────────────────────
# FIX P4a: Phase card Row 1 — destination/name amber
# From diagnostic pos 129578 (moon context):
# <span style={{fontSize:15,fontWeight:700,color:"#FFF"}}>{phase.flag} {phase.name}'
# Also pos 134142: style={{fontSize:15,fontWeight:700,color:"#FFF"}}>{phase.name}
# ─────────────────────────────────────────────────────────────────────────────

# The phase card row 1 header: flag + phase name
# Multiple candidates — target the one with phase.flag + phase.name together
OLD_P4a = 'fontSize:15,fontWeight:700,color:"#FFF"}}>{{phase.flag}} {{phase.name}}'
# That's JSX so curly braces won't have double-braces — try actual JSX
OLD_P4a = 'fontSize:15,fontWeight:700,color:"#FFF"}}>{phase.flag} {phase.name}'
NEW_P4a = 'fontSize:15,fontWeight:700,color:"#FF9F43"}}>{phase.flag} {phase.name}'

if OLD_P4a in src:
    src = src.replace(OLD_P4a, NEW_P4a, 1)
    log.append('✅ FIX P4a: Phase row flag+name → amber #FF9F43')
else:
    OLD_P4a2 = "fontSize:15,fontWeight:700,color:'#FFF'}}>{phase.flag} {phase.name}"
    if OLD_P4a2 in src:
        src = src.replace(OLD_P4a2, OLD_P4a2.replace("'#FFF'","'#FF9F43'"), 1)
        log.append('✅ FIX P4a: Phase row flag+name → amber (single-quote)')
    else:
        # Broader: find phase.flag near phase.name with color #FFF
        flag_idx = src.find('{phase.flag}')
        while flag_idx >= 0:
            ctx = src[max(0,flag_idx-100):flag_idx+60]
            if 'phase.name' in ctx and ('#FFF' in ctx or '"#FFF"' in ctx or "'#FFF'" in ctx):
                for c in ['"#FFF"', "'#FFF'"]:
                    if c in ctx:
                        abs_start = max(0,flag_idx-100)
                        src = src[:abs_start] + src[abs_start:].replace(
                            f'fontWeight:700,color:{c}' + '}}>',
                            'fontWeight:700,color:"#FF9F43"}>',
                            1
                        )
                        log.append('✅ FIX P4a: Phase row flag+name amber (broad match)')
                        break
                break
            flag_idx = src.find('{phase.flag}', flag_idx+1)
        else:
            log.append('⚠️  FIX P4a: phase.flag+name pattern not found')


# ─────────────────────────────────────────────────────────────────────────────
# FIX P4b: Phase card — country label amber
# From diagnostic pos 129798:
# style={{fontSize:isMobile?11:13,color:"rgba(255,255,255,0.55)"}}>{phase.nights}n · {phase.country}
# This is the Row 2 of the collapsed phase card — nights + country
# Make country stand out: keep nights dim but country amber
# Actually from the request: country name should be amber, dates/nights same size
# Let's target the country display separately
# From diagnostic also: style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,0.75)",marginBottom:3,letterSpacing:.5}}>{phase.country}  (expanded view?)
# Let's fix both
# ─────────────────────────────────────────────────────────────────────────────

# Target: the country in the row - e.country / phase.country
OLD_P4b = 'fontWeight:700,color:"rgba(255,255,255,0.75)",marginBottom:3,letterSpacing:.5'
NEW_P4b = 'fontWeight:700,color:"#FF9F43",marginBottom:3,letterSpacing:.5'
if OLD_P4b in src:
    src = src.replace(OLD_P4b, NEW_P4b, 1)
    log.append('✅ FIX P4b: phase.country expanded label → amber #FF9F43')
else:
    OLD_P4b2 = "fontWeight:700,color:'rgba(255,255,255,0.75)',marginBottom:3,letterSpacing:.5"
    if OLD_P4b2 in src:
        src = src.replace(OLD_P4b2, OLD_P4b2.replace("'rgba(255,255,255,0.75)'","'#FF9F43'"), 1)
        log.append('✅ FIX P4b: phase.country label amber (single-quote)')
    else:
        log.append('⚠️  FIX P4b: phase.country label pattern not found')

# Also target the e.color usage on phase card row 1 from bundle analysis
# From bundle: color:e.color||`#00E5FF` — in JSX this is color:e.color||"#00E5FF" or phase.color
for old_color in [
    'color:phase.color,marginBottom:3',
    'fontWeight:700,color:phase.color}',
    'fontWeight:600,color:phase.color}',
    'color:phase.color||"#00E5FF"',
    "color:phase.color||'#00E5FF'",
]:
    if old_color in src:
        new_color = old_color.replace('phase.color', '"#FF9F43"').replace('||"#00E5FF"','').replace("||'#00E5FF'",'')
        src = src.replace(old_color, new_color, 1)
        log.append(f'✅ FIX P4c: phase.color → #FF9F43 (pattern: {old_color[:40]})')
        break


# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
changed = src != original
if changed:
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'\n✅ {SRC} written\n')
else:
    print('\n⚠️  No changes — patterns still not matching\n')
    print('MANUAL FALLBACK — run these greps to find exact lines:')
    print('  grep -n "DREAM BIG" src/App.jsx | head -5')
    print('  grep -n "0.38" src/App.jsx | grep -i "margin\\|night\\|date"')
    print('  grep -n "phase.flag\\|phase.name\\|phase.country" src/App.jsx | head -10')

print('─' * 60)
for line in log:
    print(line)
applied = sum(1 for l in log if l.startswith('✅'))
warned  = sum(1 for l in log if l.startswith('⚠️'))
print('─' * 60)
print(f'Applied: {applied}  |  Warned: {warned}')
if changed:
    print('\nNext:')
    print('  git add src/App.jsx && git commit -m "fix: Session 14b — DREAM BIG shimmer, phase amber, date row" && git push')
