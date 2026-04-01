#!/usr/bin/env python3
"""
Session 14 Diagnostic — extracts exact JSX source strings for the 3 failing patches
Run from: /Users/admin/1bag-nomad/
Command: python3 session14_diag.py
"""

SRC = 'src/App.jsx'

with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

print(f'File length: {len(src)} chars\n')
print('=' * 70)

# ── DREAM BIG ──────────────────────────────────────────────────────────────
print('\n[1] DREAM BIG context (±200 chars):')
idx = src.find('DREAM BIG')
if idx >= 0:
    print(repr(src[max(0,idx-250):idx+80]))
else:
    print('NOT FOUND')

# ── rgba(255,255,255,0.38) occurrences ────────────────────────────────────
print('\n[2] All rgba(255,255,255,0.38) occurrences:')
idx = 0
count = 0
while True:
    idx = src.find('0.38', idx)
    if idx < 0: break
    ctx = src[max(0,idx-60):idx+80]
    if '255,255,255' in ctx or 'rgba' in ctx:
        print(f'  pos {idx}: {repr(ctx)}')
        count += 1
    idx += 1
print(f'  Total: {count}')

# ── Phase card country / destination / flag rendering ─────────────────────
print('\n[3] e.flag occurrences (first 6):')
idx = 0
count = 0
while count < 6:
    idx = src.find('e.flag', idx)
    if idx < 0: break
    print(f'  pos {idx}: {repr(src[max(0,idx-120):idx+120])}')
    count += 1
    idx += 1

print('\n[4] e.destination occurrences (first 4):')
idx = 0
count = 0
while count < 4:
    idx = src.find('e.destination', idx)
    if idx < 0: break
    print(f'  pos {idx}: {repr(src[max(0,idx-80):idx+120])}')
    count += 1
    idx += 1

print('\n[5] e.country occurrences:')
idx = 0
count = 0
while count < 4:
    idx = src.find('e.country', idx)
    if idx < 0: break
    print(f'  pos {idx}: {repr(src[max(0,idx-80):idx+120])}')
    count += 1
    idx += 1

print('\n[6] CSS class strings in source (vision-ta, vibe-tag, sec-label etc):')
for cls in ['vision-ta', 'vibe-tag', 'launch-btn', 'sec-label', 'f-label', 'dream-content', 'dream-glow']:
    idx = src.find(cls)
    if idx >= 0:
        print(f'  .{cls} @ pos {idx}: {repr(src[max(0,idx-10):idx+60])}')
    else:
        print(f'  .{cls}: NOT FOUND')

print('\n' + '=' * 70)
print('Done. Paste this output back to Claude.')
