# The Next-Word Machine (gold reference)

A real 2-layer Transformer LM (13-word vocab, d=8, 2 heads, learned positions, ReLU FFN or a 4-expert top-2 MoE),
trained with PyTorch on 40 sentences, walked through in 10 stations as "My favorite LLM is" becomes a next-word
prediction. It was built for a grad NLP course's exam review, and it's the explainer this skill was extracted from.
Open `index.html` from file:// (the "← study hub" and BPE links point at its original study-kit home and are dead here).

It was written before the generic engine, so its code is `nwm-*` rather than `dx-*`. The ideas map 1:1:

| file | role | template equivalent |
|---|---|---|
| `nwm-core.js` | kit: materials, MatrixDisplay, TokenChip, Beam, Rays, Dial, tag | `dx-core.js` (same code, generalised) |
| `nwm-world.js` | room, bench, layer decks, residual-stream rail | `dx-world.js` (decks/rail moved to the cookbook) |
| `nwm-stations.js` | the 10 stations | your stations in `dx-explainer.js` |
| `nwm-text.js` | per-station narration from live numbers | `cfg.text` |
| `nwm-app.js` | renderer, UI, camera director, tour, record mode | `dx-engine.js` |
| `model.js` + `weights.js` | JS forward pass returning ALL intermediates + real weights | `dx-compute.js` |

## Station patterns it demonstrates

1. Tokenizer gate: string ribbon → glass gate with scan line → chips + id badges (**Chip**, staged intro).
2. Embedding cabinet: V drawers, used ones slide out, rows fly along bezier arcs onto a matrix (**cabinet of drawers**, **flyers**).
3. Position: `c + p = x` with glowing glyphs and ray bundles (**"+"/"=" glyphs**, **Rays**).
4. Q/K/V lenses: one geared glass lens per weight matrix, rays fan from each input row through the lens to output bars (**lens**).
5. Attention plane: n×n instanced grid with a 3-step toggle (raw scores → masked → softmax), masked cells red with −∞, beams query→key with radius ∝ √weight, values flying into a Σ (**grid plane**, **beams ∝ weight**, **Σ assembly**).
6. FFN / MoE: dark housing with hidden-unit bulbs (ReLU zeros dark), brass residual arch; router dial with gate bars, top-2 experts lit, the rest dark with "never run" labels (**router dial + experts**, **residual bypass arch**).
7. Stack ×L: second deck on telescoping posts, Exploded lifts it; the residual stream is one glowing CatmullRom tube through both decks (**exploded stacks**).
8. Output head: knurled lens barrel, rays to a sorted histogram that re-sorts with damped motion (**histogram**).
9. Loss & perplexity: two analog gauges plus teacher-forcing bars with a mean line (**gauge dial**, **bar row + mean line**).
10. Decoder + KV cache: carriage drops generated chips; a shelf gains one K/V column per token, stale columns turn red under non-causal masks (**shelf that grows**).

Toggles that re-run the real model: input text, Dense/MoE, mask (causal / bidirectional / sliding W=2 / block),
layer, head, query position, attention step, true next word, decoding method (greedy/sample/top-k/top-p).

## Training + verification (`training/`)

```bash
cd training
uv run --no-project --with torch --with numpy python train.py model.json   # trains dense + MoE, writes model.json + model_tests.json
python3 export_js.py ../weights.js                                         # wraps model.json as window.NWM_DATA = {...}
node verify.js                                                              # JS forward vs PyTorch: max |diff| = 5.0e-5 over 8,658 numbers
uv run --no-project --with torch --with numpy python sweep.py 1 7          # seed sweep for readable attention heads
```

Key choices (see `references/real-model.md`): AdamW lr 1e-2 cosine, 4,000 steps, label smoothing 0.02 and a 1e-3 L2
penalty on the residual stream (no LayerNorm, so activations otherwise grow to |z|≈50 and logits ≈50), seeds 6
(dense) / 2 (MoE) picked from a sweep. Final train CE 0.296 vs the corpus entropy floor 0.278.
Its recorded tour (via the same ?record pipeline) ran 77 s at 1080p30 and was 24 MB at CRF 24.
