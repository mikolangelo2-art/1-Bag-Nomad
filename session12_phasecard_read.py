#!/usr/bin/env python3
"""
Phase card 2-row layout — line number approach
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

results = []

# Find the PhaseCard onClick div by locating minHeight:62 near padding:"10px 12px"
# Then replace the ENTIRE block from that div to the closing </div> of the click handler
target_line = -1
for i, line in enumerate(lines):
    if 'minHeight:62' in line and ('padding:"10px 12px"' in line or 'padding:"14px 16px"' in line or 'cursor:"pointer"' in line) and 'borderLeft' in line:
        target_line = i
        print(f"Found PhaseCard onClick div at line {i+1}")
        print(f"Content: {line.strip()[:120]}")
        break

if target_line == -1:
    # Try alternate search
    for i, line in enumerate(lines):
        if 'minHeight:62' in line:
            print(f"Found minHeight:62 at line {i+1}: {line.strip()[:120]}")
            target_line = i
            break

if target_line > -1:
    # Print surrounding context to understand the full block
    print("\n--- LINES AROUND TARGET ---")
    for j in range(max(0, target_line-2), min(len(lines), target_line+60)):
        print(f"{j+1:4d}: {lines[j].rstrip()[:120]}")
else:
    print("NOT FOUND - searching all lines with 'phase.id' near 'phase.color':")
    for i, line in enumerate(lines):
        if 'phase.id}' in line and 'phase.color' in line:
            print(f"  line {i+1}: {line.strip()[:100]}")
