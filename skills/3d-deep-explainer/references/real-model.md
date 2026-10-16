# The tiny-real-model pipeline

When the topic is a learned model, train a tiny one for real. This is how the Next-Word Machine's numbers came
to be genuine (`examples/next-word-machine/training/`).

```
design data  →  train (uv + torch, seeded)  →  export JSON (4 decimals)  →  reload rounded weights, dump test cases
     →  JS forward returning ALL intermediates  →  node verify vs PyTorch (< 1e-3)  →  weights.js (window.X = {...})
```

## 1. Design the data so the behaviour is readable

The model only teaches if its outputs are interpretable. Write the corpus *backwards* from the probabilities you
want on screen:
- Decide the headline distribution: after "My favorite LLM is": Claude 13, Gemini 4, ChatGPT 2, Qwen 1
  (= .65 / .20 / .10 / .05). A model that fits the data reproduces counts (MLE ≈ counting), so the screen shows
  those numbers within ~0.01.
- Add a contrast prefix that flips the answer ("My least favorite LLM is" → ChatGPT .6 / Qwen .3), so context
  visibly matters, plus a third ("Your favorite …") so the model must actually read the context.
- Make some continuations deterministic ("Claude" → "." → `<eos>`). Those give the near-1.0 probabilities and
  near-0 losses that make a loss chart readable.
- Keep the vocab tiny (12–16 types) so every row, bar and label fits on screen. Max length ~10 so n×n boards stay legible.
- Compute the **entropy floor** of the corpus (the best achievable mean NLL) and print it next to the train loss. If
  train loss ≈ floor, the model has learned the distribution and its probabilities can be trusted.

## 2. Architecture: displayable first

d_model = 8, 2 heads × d_head 4, 2 layers, learned absolute positions, causal mask with 1/√d_head, residuals,
ReLU FFN (hidden 16), untied output, **no LayerNorm and no biases**. Every intermediate is then a short vector you
can print, and the forward pass is ~150 lines of JS. MoE twin: the same, with each FFN = 4 experts (hidden 8),
router `W_r` (N × d), softmax gates, top-2 renormalised, plus a Switch-style load-balance aux loss
(`N · Σ frac_e · prob_e`, weight 0.01).

## 3. Training recipe that keeps numbers small and readable

```bash
uv run --no-project --with torch --with numpy python train.py model.json
```
- Seed everything (`torch.manual_seed`, `np.random.seed`, `random.seed`). Full-batch AdamW, lr 1e-2, cosine to
  2% over 4,000 steps, weight decay 0.01. That converges in ~15 s on CPU.
- **Without LayerNorm the residual stream explodes**: the first run hit |z| ≈ 28–55 and logits ≈ 50, so every
  displayed probability was 0.000 or 1.000 and the bars looked binary. Two small fixes:
  - **label smoothing 0.02**: logits stop racing to ±∞; deterministic steps land at 0.98 instead of 1.0;
  - **an L2 penalty on the residual stream** (1e-3 × mean z² over valid positions): activations stay around |z| ≤ 2,
    so cell colours and numbers are meaningful.
  Cost: train CE 0.296 vs floor 0.278. Say so in the README; the probabilities are still ≈ the corpus counts.
- **Seed sweep for interpretability** (`sweep.py`): train 6 seeds × {dense, MoE} for 4k steps, and for each print
  where the last query's attention goes on the contrast prefixes (does some head look at "least"? at "Your"?).
  Pick the seed whose heads do something nameable. Same loss, very different teaching value.

## 4. Export so JS sees exactly what PyTorch used

- Round every weight to 4 decimals into JSON.
- **Load the rounded weights back into the PyTorch model**, then generate test cases. Otherwise PyTorch's
  reference uses unrounded weights and verification fails by ~1e-3 for no real reason.
- Test cases cover each prefix, a longer sequence, and every mask variant you'll expose (bidirectional, sliding,
  block), with `x`, per-layer attention, concat, z, gates/top-k and final probs.
- Ship the weights as `weights.js` containing `window.NWM_DATA = {...};`, loaded by a classic `<script>`. `fetch()`
  of a local JSON fails under file:// (see gotchas).

## 5. The JS forward pass returns everything

Pure function, UMD (`module.exports` in node, `window.X` in the page). Signature
`forward(model, ids, { mask: { kind, W, block } })`. Returns
`{ c, p, x, layers: [{ zin, heads: [{ q, k, v, raw, scores, masked, attn, h }], concat, ffn: { pre, hid, out } | moe: { scores, gates, top, topw, experts }, ff, z }], logits, probs, allowed }`.
- The **mask is a parameter**, not baked in: `maskMatrix(n, {kind})` → `allowed[i][j]` (rows = queries). The UI
  can then run the causal-trained model under other masks, a real train/test mismatch that the viewer sees.
- `-Infinity` before softmax for masked cells, and softmax must treat −∞ as 0 weight.
- MoE: compute only the top-K experts per token (store `null` for the others: "never run" is then literally true).
- Decoding helpers (greedy / sample / top-k / top-p) with a **seeded RNG** (mulberry32), so the tour and
  recordings are reproducible.

## 6. Verify

```bash
node verify.js     # → "compared 8658 numbers, max |JS - PyTorch| = 5.011e-5"
```
Compare every exported intermediate, plus the top-k index sets exactly. Print the top-4 predictions per test case.
That table is also your sanity check that the data design worked. Re-run after any change to the JS forward.

## Algorithms (no training)

Same shape, without step 3: `dx-compute.js` is the implementation, and `tools/reference.py` is an independent one
(numpy, or the textbook algorithm) that writes `fixtures.json` over a grid of states. `tools/verify.js` compares.
Keep the state grid wide enough to hit edge cases (ties, extreme temperatures, hard vs soft, empty inputs).
