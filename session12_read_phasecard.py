#!/usr/bin/env python3
"""Print exact PhaseCard header string for precise patching"""
with open('src/App.jsx', 'r') as f:
    content = f.read()

# Find the PhaseCard onClick div
idx = content.find('minHeight:62,borderLeft')
if idx > -1:
    print("FOUND at char", idx)
    print("\n--- EXACT STRING (300 chars before to 800 after) ---")
    print(repr(content[idx-200:idx+800]))
else:
    print("minHeight:62,borderLeft NOT FOUND")
    # Try finding the phase card click handler another way
    idx2 = content.find('isPast?"DONE":isNow?"ACTIVE"')
    if idx2 > -1:
        print("\nFound isPast check at char", idx2)
        print(repr(content[idx2-400:idx2+200]))
