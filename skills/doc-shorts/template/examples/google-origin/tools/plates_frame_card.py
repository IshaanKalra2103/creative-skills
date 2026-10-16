"""Regression plates for the Google remake's frame_card shot: pad each per-tick card crop
(nightmare_tNN.jpg, the visible part of the card, cut by the frame edge) to the full card
(1.571:1) so the generic frame_card kind can draw it into its card rect.

usage: uv run --with pillow --with numpy python tools/plates_frame_card.py SPEC_ASSETS_DIR
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ASPECT = 1.571
# card centre x and height per tick (frame_card.rs defaults); visible crops start at max(0, left)
CX = [594.5, 495.3, 446.9, 416.5, 390.9, 379.2, 369.1, 367.6, 362.0]
HT = [380, 376, 378, 380, 378, 386, 396, 426, 484]

d = Path(sys.argv[1])
for i, (cx, h) in enumerate(zip(CX, HT)):
    crop = np.asarray(Image.open(d / f"nightmare_t{i:02d}.jpg").convert("RGB"))
    w = round(ASPECT * h)
    left = cx - ASPECT * h / 2
    off = round(max(0.0, -left))  # visible crop starts at screen 0 when the card is cut on the left
    out = np.zeros((crop.shape[0], w, 3), np.uint8)
    n = min(crop.shape[1], w - off)
    out[:, off:off + n] = crop[:, :n]
    out[:, :off] = crop[:, :1]                      # edge-extend the hidden parts
    out[:, off + n:] = crop[:, n - 1:n]
    Image.fromarray(out).save(d / f"frame_card_t{i:02d}.jpg", quality=95)
    print(f"t{i:02d}: crop {crop.shape[1]}x{crop.shape[0]} -> {w}x{crop.shape[0]} (offset {off})")
