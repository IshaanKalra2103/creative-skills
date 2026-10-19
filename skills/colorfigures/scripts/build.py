#!/usr/bin/env python3
"""Turn a Colorfigures figure page into one self-contained HTML file.

    python3 build.py figure.html [OUT.html]

figure.html loads the engine with <script src="core.js"></script> (handy while working: put a copy of
assets/core.js next to it). The build replaces that tag with the engine itself, so OUT.html (default:
figure.built.html) runs on its own — open it from disk, email it, host it anywhere.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CORE = os.path.join(HERE, '..', 'assets', 'core.js')

def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    src = argv[1]
    out = argv[2] if len(argv) > 2 else re.sub(r'\.html?$', '', src) + '.built.html'
    page = open(src, encoding='utf-8').read()
    core = open(CORE, encoding='utf-8').read()
    tag = re.search(r'<script\s+src=["\'](?:\./)?core\.js["\']\s*>\s*</script>', page)
    if not tag:
        sys.exit('no <script src="core.js"></script> in ' + src)
    if '</script' in core.lower():
        sys.exit('core.js contains "</script" and cannot be inlined')
    page = page[:tag.start()] + '<script>\n' + core + '\n</script>' + page[tag.end():]
    open(out, 'w', encoding='utf-8').write(page)
    print(f'wrote {out}')

if __name__ == '__main__':
    main(sys.argv)
