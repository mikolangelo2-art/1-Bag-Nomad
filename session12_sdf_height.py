#!/usr/bin/env python3
"""
Fix native date input height in Stay drawer
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()

original = content
results = []

# The SDF component renders a plain <input> for date type
# Native date inputs on iOS render taller — add explicit height
# Current SDF input style: fontSize:12,padding:"5px 8px"
# Add height constraint for date inputs specifically

# Target: the SDF component's input style — add maxHeight
old = 'const s={background:"rgba(0,8,20,0.6)",border:`1px solid ${accent}18`,borderRadius:6,color:"#FFF",fontSize:15,padding:multiline?"8px 10px":"7px 10px",fontFamily:"\'Space Mono\',monospace",outline:"none",width:"100%",lineHeight:1.6,resize:multiline?"none":undefined};'
new = 'const s={background:"rgba(0,8,20,0.6)",border:`1px solid ${accent}18`,borderRadius:6,color:"#FFF",fontSize:12,padding:multiline?"6px 8px":"5px 8px",fontFamily:"\'Space Mono\',monospace",outline:"none",width:"100%",lineHeight:1.5,resize:multiline?"none":undefined,height:multiline?undefined:32};'

if old in content:
    content = content.replace(old, new)
    results.append("✅  SDF base style: fontSize 15→12, padding tighter, height:32 on inputs")
else:
    # Try finding current version
    idx = content.find('const s={background:"rgba(0,8,20,0.6)"')
    if idx > -1:
        results.append(f"ℹ️   SDF style found at char {idx}, attempting targeted fix")
        # Find and patch just the fontSize and padding
        import re
        # Replace fontSize in SDF style
        for old_f, new_f in [
            ('fontSize:15,padding:multiline?"8px 10px":"7px 10px"', 'fontSize:12,padding:multiline?"6px 8px":"5px 8px"'),
            ('fontSize:13,padding:multiline?"7px 9px":"6px 9px"', 'fontSize:12,padding:multiline?"6px 8px":"5px 8px"'),
            ('fontSize:12,padding:multiline?"6px 8px":"5px 8px"', 'fontSize:12,padding:multiline?"6px 8px":"5px 8px",height:multiline?undefined:32'),
        ]:
            if old_f in content:
                content = content.replace(old_f, new_f)
                results.append(f"✅  SDF style patched: {old_f[:40]}...")
                break
    else:
        results.append("❌  SDF style not found at all")

if content != original:
    with open('src/App.jsx', 'w') as f:
        f.write(content)
    print("\n📝 File written.\n")
else:
    print("\n⚠️  No changes — printing SDF style context:\n")
    idx = content.find('const s={background')
    if idx > -1:
        print(repr(content[idx:idx+200]))

print("─" * 55)
for r in results:
    print(r)
print("─" * 55)
print("\nNext: git add src/App.jsx && git commit -m 'polish: SDF input height constrained, date boxes tighter' && git push")
