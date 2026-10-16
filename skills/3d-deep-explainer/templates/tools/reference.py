#!/usr/bin/env python3
"""Independent numpy reference for dx-compute.js -> writes tools/fixtures.json.
Run:  uv run --no-project --with numpy python tools/reference.py
Re-implement your computation here (or train/export your tiny model and dump its intermediates)."""
import json, pathlib
import numpy as np

ITEMS = {  # name: (key [sweet, sour, red, crunchy], value = RGB colour)
    "strawberry": ([0.8, 0.3, 0.9, 0.1], [0.86, 0.13, 0.22]),
    "lemon": ([0.1, 1.0, 0.0, 0.2], [0.98, 0.85, 0.15]),
    "apple": ([0.5, 0.6, 0.1, 1.0], [0.45, 0.8, 0.2]),
    "blueberry": ([0.7, 0.2, 0.0, 0.0], [0.25, 0.32, 0.85]),
    "carrot": ([0.4, 0.0, 0.3, 0.9], [1.0, 0.52, 0.1]),
}
QUERIES = {"sweet+red": [1, 0, 1, 0], "sour": [0, 1, 0, 0], "crunchy": [0, 0, 0, 1], "sweet, not red": [1, 0, -1, 0]}

K = np.array([k for k, _ in ITEMS.values()])
V = np.array([v for _, v in ITEMS.values()])
cases = []
for qn, q in QUERIES.items():
    for tau in (0.2, 0.5, 1.0, 3.0):
        for mode in ("soft", "hard"):
            s = K @ np.array(q, float)
            z = s / tau
            w = np.exp(z - z.max()); w /= w.sum()
            if mode == "hard":
                w = np.eye(len(s))[int(np.argmax(s))]
            out = w @ V
            ent = float(-(w[w > 0] * np.log(w[w > 0])).sum())
            cases.append({"state": {"query": qn, "tau": tau, "mode": mode},
                          "scores": s.tolist(), "weights": w.tolist(), "out": out.tolist(), "entropy": ent})
p = pathlib.Path(__file__).with_name("fixtures.json")
p.write_text(json.dumps(cases, indent=1))
print(f"wrote {len(cases)} cases to {p}")
