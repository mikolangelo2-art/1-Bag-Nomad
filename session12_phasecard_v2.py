#!/usr/bin/env python3
"""
Phase card 2-row layout — direct line replacement
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

# Find the PhaseCard onClick div — search for the exact pattern
# From screenshot we can see it's around line 1040 area
# Search for the onClick div that wraps the whole phase card header

start_line = -1
end_line = -1

for i, line in enumerate(lines):
    if 'onClick={()=>setOpen(o=>!o)}' in line and 'minHeight:62' in line and 'borderLeft' in line:
        start_line = i
        print(f"Found onClick div at line {i+1}")
        break

if start_line == -1:
    # Try finding by unique combo
    for i, line in enumerate(lines):
        if 'minHeight:62' in line and 'borderLeft' in line:
            start_line = i
            print(f"Found via minHeight:62 at line {i+1}: {line.strip()[:80]}")
            break

if start_line == -1:
    print("Could not find start line. Printing all lines with 'phase.totalBudget':")
    for i, line in enumerate(lines):
        if 'phase.totalBudget' in line:
            print(f"  {i+1}: {line.strip()[:100]}")
else:
    # Find the end of this div block — look for the closing of the PhaseCard header
    # It ends before the {open&&( for the expanded content
    for i in range(start_line, min(start_line + 60, len(lines))):
        if '{open&&(' in lines[i]:
            end_line = i
            print(f"Found end at line {i+1}")
            break
    
    if end_line > -1:
        print(f"\nBlock is lines {start_line+1} to {end_line}")
        print("\n--- CURRENT BLOCK ---")
        for j in range(start_line, end_line):
            print(f"{j+1:4d}: {lines[j].rstrip()}")
        
        # Build the new 2-row layout
        # Get indentation from first line
        indent = len(lines[start_line]) - len(lines[start_line].lstrip())
        ind = ' ' * indent
        
        new_block = f'''{ind}<div onClick={{()=>setOpen(o=>!o)}} style={{{{padding:isMobile?"10px 12px":"14px 16px",cursor:"pointer",minHeight:isMobile?54:62,borderLeft:`3px solid ${{open?phase.color:phase.color+"50"}}`}}}}>
{ind}  <div style={{{{display:"flex",alignItems:"center",gap:8,marginBottom:5}}}}>
{ind}    <div style={{{{width:20,height:20,borderRadius:"50%",background:`${{phase.color}}14`,border:`1.5px solid ${{phase.color}}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:phase.color,fontFamily:"'Space Mono',monospace",flexShrink:0}}}}>{'{'}phase.id{'}'}</div>
{ind}    <span style={{{{fontSize:14,flexShrink:0}}}}>{'{'}phase.flag{'}'}</span>
{ind}    <span style={{{{flex:1,fontSize:isMobile?13:15,fontWeight:600,color:open?phase.color:"rgba(255,255,255,0.92)",fontFamily:"'Space Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",transition:"color 0.2s"}}}}>{'{'}phase.name{'}'}</span>
{ind}    {'{'}isNow&&<span style={{{{fontSize:9,color:"#69F0AE",background:"rgba(105,240,174,0.1)",border:"1px solid rgba(105,240,174,0.28)",borderRadius:8,padding:"1px 5px",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}}}>ACTIVE</span>{'}'} 
{ind}    <span style={{{{fontSize:isMobile?12:15,fontWeight:600,color:"rgba(255,217,61,0.85)",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",flexShrink:0}}}}>{'{'}fmt(phase.totalBudget){'}'}</span>
{ind}    <div style={{{{width:16,height:16,borderRadius:"50%",border:`1px solid rgba(255,255,255,${{open?"0.2":"0.08"}})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}}}>
{ind}      <span style={{{{fontSize:8,color:open?phase.color:"rgba(255,255,255,0.4)",display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}}}>▼</span>
{ind}    </div>
{ind}  </div>
{ind}  <div style={{{{display:"flex",alignItems:"center",gap:8,paddingLeft:28,flexWrap:"nowrap"}}}}>
{ind}    <span style={{{{fontSize:10,color:"rgba(255,255,255,0.62)",fontFamily:"'Space Mono',monospace",fontWeight:500,whiteSpace:"nowrap"}}}}>{'{'}fD(phase.arrival){'}'}&ndash;{'{'}fD(phase.departure){'}'}</span>
{ind}    <span style={{{{fontSize:10,color:phase.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}}}>🌙{'{'}phase.totalNights{'}'}n</span>
{ind}    {'{'}phase.totalDives>0&&<span style={{{{fontSize:10,color:"#00E5FF",whiteSpace:"nowrap",flexShrink:0}}}}>🤿{'{'}phase.totalDives{'}'}</span>{'}'}
{ind}    {'{'}pct>0&&<div style={{{{width:isMobile?40:80,height:2,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",flexShrink:0}}}}><div style={{{{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${{phase.color}}55,${{phase.color}}99)`,borderRadius:2}}}}/></div>{'}'}
{ind}    <span style={{{{fontSize:9,color:"rgba(255,255,255,0.25)",fontFamily:"monospace",whiteSpace:"nowrap",marginLeft:"auto",flexShrink:0}}}}>{'{'}isPast?"done":isNow?"active":`${{dUntil}}d`{'}'}</span>
{ind}  </div>
{ind}</div>
'''
        
        lines[start_line:end_line] = [new_block]
        
        with open('src/App.jsx', 'w') as f:
            f.writelines(lines)
        
        print("\n✅ Phase card 2-row layout written!")
        print("\nNext: git add src/App.jsx && git commit -m 'fix: phase card clean 2-row mobile layout' && git push")
    else:
        print("❌ Could not find end_line ({open&&()")
