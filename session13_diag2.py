#!/usr/bin/env python3
"""Read current DreamScreen + GenerationScreen state"""
with open('src/App.jsx', 'r') as f:
    content = f.read()

# Find fadeOut related code
print("=== FADEOUT STATE ===")
idx = content.find('fadeOut')
while idx > -1:
    print(f"  char {idx}: ...{content[max(0,idx-30):idx+60]}...")
    idx = content.find('fadeOut', idx+1)

# Find GenerationScreen mount
print("\n=== GENERATION SCREEN START ===")
idx = content.find('function GenerationScreen')
print(content[idx:idx+400])

# Find App root screen transitions  
print("\n=== APP ROOT SCREEN RENDERS ===")
idx = content.find('screen===\"gen\"')
if idx > -1:
    print(content[max(0,idx-50):idx+200])

# Find handleReveal
print("\n=== handleReveal ===")
idx = content.find('async function handleReveal')
print(content[idx:idx+300])
