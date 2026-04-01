#!/usr/bin/env python3
"""
Fix Stay/Activities input box height to match Transport's compact feel
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()

original = content
results = []

def rep(old, new, label):
    global content
    if old in content:
        content = content.replace(old, new)
        results.append(f"✅  {label}")
    else:
        results.append(f"❌  {label}")

# ── SDF input padding — the main culprit for tall boxes
# Current: padding:multiline?"7px 9px":"6px 9px"
# Transport looks good — Stay/Activities use same SDF but boxes look bigger
# The issue is the grid gap and section gap making it feel tall
# Reduce the gap inside stay/activities grids

# SDF input itself — reduce padding further
rep(
    'padding:multiline?"7px 9px":"6px 9px"',
    'padding:multiline?"6px 8px":"5px 8px"',
    'SDF input padding: tighter boxes'
)

# Also the fontSize in SDF inputs — currently 13
rep(
    'fontSize:13,padding:multiline?"6px 8px":"5px 8px"',
    'fontSize:12,padding:multiline?"6px 8px":"5px 8px"',
    'SDF input fontSize: 13→12'
)

# Stay grid gap — currently gap:7 inside the grid
rep(
    'display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>\n              <SDF label="PROPERTY"',
    'display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>\n              <SDF label="PROPERTY"',
    'Stay grid gap: 8→6'
)

# Activities add form grid gap
rep(
    'display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>\n                <SDF label="ACTIVITY"',
    'display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>\n                <SDF label="ACTIVITY"',
    'Activities form grid gap: 7→5'
)

# Misc add form grid gap  
rep(
    'display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>\n                <SDF label="ITEM"',
    'display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>\n                <SDF label="ITEM"',
    'Misc form grid gap: 7→5'
)

# Stay section overall gap (between fields)
rep(
    'cat==="stay"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}',
    'cat==="stay"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}',
    'Stay section flex gap: 7→5'
)

# Food section gap
rep(
    'cat==="food"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}',
    'cat==="food"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}',
    'Food section flex gap: 7→5'
)

# Intel section gap
rep(
    'cat==="intel"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}',
    'cat==="intel"&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}',
    'Intel section flex gap: 7→5'
)

# Transport section gap (keep consistent)
rep(
    'padding:"10px 12px",display:"flex",flexDirection:"column",gap:9}}>\n            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8',
    'padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>\n            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6',
    'Transport section + grid gap: consistent with others'
)

# Notes textarea rows — reduce from 2 to 1 for tighter feel on mobile
# (The placeholder text wraps anyway so 1 row is fine, user can expand by typing)
rep(
    'rows={2} style={s}',
    'rows={1} style={s}',
    'Textarea rows: 2→1 (tighter default height)'
)

if content != original:
    with open('src/App.jsx', 'w') as f:
        f.write(content)
    print("\n📝 File written.\n")
else:
    print("\n⚠️  No changes.\n")

print("─" * 55)
for r in results:
    print(r)
passed = sum(1 for r in results if r.startswith("✅"))
failed = sum(1 for r in results if r.startswith("❌"))
print("─" * 55)
print(f"  {passed} passed  ·  {failed} failed")
print("─" * 55)
print("\nNext: git add src/App.jsx && git commit -m 'polish: drawer input boxes tighter - match transport feel' && git push")
