#!/usr/bin/env python3
"""
Fix phase card - &ndash; → actual dash, remove duplicate date row
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()

results = []

# Fix 1: &ndash; → – (HTML entity doesn't work in JSX)
if '&ndash;' in content:
    content = content.replace('&ndash;', '–')
    results.append("✅  Fixed &ndash; → – in JSX")
else:
    results.append("ℹ️   No &ndash; found")

# Fix 2: Check for and remove any old date row that's still lurking
# The old date div used fD(phase.arrival) with flexWrap:"nowrap" 
# If it's still present alongside the new Row 2, remove it
old_date_row = '''          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"nowrap"}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.82)",fontFamily:"'Space Mono',monospace",fontWeight:600,whiteSpace:"nowrap"}}>{fD(phase.arrival)}–{fD(phase.departure)}</span>
            <span style={{fontSize:10,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🌙{phase.totalNights}n</span>
            {phase.totalDives>0&&<span style={{fontSize:10,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}>🤿{phase.totalDives}</span>}
          </div>'''

if old_date_row in content:
    content = content.replace(old_date_row, '')
    results.append("✅  Removed duplicate old date row")
else:
    results.append("ℹ️   No duplicate date row found")

# Fix 3: The icons (chevron/dive) showing in wrong row — 
# check if the progress bar pct section is in right place
# Also make sure the name row doesn't show "Honduras" country name twice

with open('src/App.jsx', 'w') as f:
    f.write(content)

print("\n📝 File written.\n")
print("─" * 55)
for r in results:
    print(r)
print("─" * 55)
print("\nNext: git add src/App.jsx && git commit -m 'fix: phase card JSX dash + remove duplicate date' && git push")
