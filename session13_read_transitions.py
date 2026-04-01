#!/usr/bin/env python3
"""
Read transition component strings for transition audit patch
Prints GenerationScreen, HandoffScreen, VisionReveal key sections
Run from: /Users/admin/1bag-nomad/
"""

with open('src/App.jsx', 'r') as f:
    content = f.read()
    lines = content.split('\n')

sections = [
    ('GenerationScreen', '// ─── GenerationScreen', '// ─── DreamScreen'),
    ('HandoffScreen', '// ─── HandoffScreen', '// ─── SegmentDetailField'),
    ('VisionReveal typewriter', 'let i=0;const txt=vd.narrative', 'setShowPhases'),
    ('ConsoleHeader wordmark', '1 Bag Nomad', 'Sharegood Co.'),
]

for name, start_str, end_str in sections:
    start = content.find(start_str)
    end = content.find(end_str, start + 1)
    if start > -1:
        snippet = content[start:min(start+2000, end if end>-1 else start+2000)]
        print(f"\n{'='*60}")
        print(f"SECTION: {name}")
        print('='*60)
        print(snippet[:1500])
    else:
        print(f"\n❌ NOT FOUND: {name} (looking for '{start_str}')")

# Also find the logo text in ConsoleHeader
logo_idx = content.find('"1 Bag Nomad"')
if logo_idx > -1:
    print(f"\n{'='*60}")
    print("LOGO TEXT CONTEXT:")
    print('='*60)
    print(content[logo_idx-100:logo_idx+300])
