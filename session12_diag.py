#!/usr/bin/env python3
"""
Session 12 — Diagnostic: find exact strings for patches 1 and 6b
Run from: /Users/admin/1bag-nomad/
"""
with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

print("=== SEARCHING FOR PHASE CARD DATE ROW (around 'fD(phase.arrival)') ===")
for i, line in enumerate(lines):
    if 'fD(phase.arrival)' in line:
        start = max(0, i-3)
        end = min(len(lines), i+4)
        print(f"\n--- Found at line {i+1} ---")
        for j in range(start, end):
            print(f"{j+1:4d}: {lines[j]}", end='')

print("\n\n=== SEARCHING FOR SEGMENT HEADER DIVIDER (around 'TAP TO EXPAND') ===")
for i, line in enumerate(lines):
    if 'TAP TO EXPAND' in line and 'PhaseCard' not in line:
        start = max(0, i-4)
        end = min(len(lines), i+3)
        print(f"\n--- Found at line {i+1} ---")
        for j in range(start, end):
            print(f"{j+1:4d}: {lines[j]}", end='')
