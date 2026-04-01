#!/usr/bin/env python3
with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

print("=== ENTER TRIP CONSOLE button ===")
for i, line in enumerate(lines):
    if 'ENTER TRIP CONSOLE' in line:
        print(f"{i+1}: {line.rstrip()}")

print("\n=== CoArchitect useEffect (first 5) ===")
count = 0
for i, line in enumerate(lines):
    if 'function CoArchitect' in line:
        print(f"CoArchitect starts at line {i+1}")
    if count < 8 and 'useEffect' in line and i > 0:
        # check if near CoArchitect
        context = ''.join(lines[max(0,i-50):i])
        if 'CoArchitect' in context and 'function MissionConsole' not in context:
            print(f"{i+1}: {line.rstrip()[:120]}")
            count += 1

print("\n=== scrollTo occurrences ===")
for i, line in enumerate(lines):
    if 'scrollTo' in line:
        print(f"{i+1}: {line.rstrip()[:120]}")
