/* The computation the machine shows: a SOFT LOOKUP.
   A query vector q (what you're craving) is compared with every item's key k_i by a dot product,
   the scores are turned into weights with softmax(score / tau), and the answer is the weighted
   average of the items' values v_i (here: their colours). Same maths as attention, kernel regression
   and "soft" dictionary lookup.

   Pure function, no DOM: runs in the page (window.DXC) and in node (module.exports) so
   tools/verify.js can check it against the numpy reference in tools/reference.py.
   REPLACE THIS FILE with your own real computation; return EVERY intermediate the stations show. */
(function (root) {
  "use strict";

  const FEATURES = ["sweet", "sour", "red", "crunchy"];
  const ITEMS = [
    { name: "strawberry", key: [0.8, 0.3, 0.9, 0.1], value: [0.86, 0.13, 0.22] },
    { name: "lemon", key: [0.1, 1.0, 0.0, 0.2], value: [0.98, 0.85, 0.15] },
    { name: "apple", key: [0.5, 0.6, 0.1, 1.0], value: [0.45, 0.8, 0.2] },
    { name: "blueberry", key: [0.7, 0.2, 0.0, 0.0], value: [0.25, 0.32, 0.85] },
    { name: "carrot", key: [0.4, 0.0, 0.3, 0.9], value: [1.0, 0.52, 0.1] },
  ];
  const QUERIES = {
    "sweet+red": [1, 0, 1, 0],
    sour: [0, 1, 0, 0],
    crunchy: [0, 0, 0, 1],
    "sweet, not red": [1, 0, -1, 0],
  };

  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

  /* state: { query: name in QUERIES, tau: temperature > 0, mode: "soft" | "hard" } */
  function compute(state) {
    const q = QUERIES[state.query];
    const tau = Math.max(1e-6, +state.tau);
    const keys = ITEMS.map((it) => it.key);
    const values = ITEMS.map((it) => it.value);
    const scores = keys.map((k) => dot(q, k));                 // s_i = q . k_i
    const logits = scores.map((s) => s / tau);                 // s_i / tau
    const m = Math.max(...logits);
    const ex = logits.map((z) => Math.exp(z - m));
    const Z = ex.reduce((a, b) => a + b, 0);
    const soft = ex.map((e) => e / Z);                         // softmax
    let argmax = 0;
    scores.forEach((s, i) => { if (s > scores[argmax]) argmax = i; });
    const weights = state.mode === "hard" ? soft.map((_, i) => (i === argmax ? 1 : 0)) : soft;
    const contrib = values.map((v, i) => v.map((x) => weights[i] * x));   // w_i * v_i
    const out = [0, 1, 2].map((c) => contrib.reduce((s, v) => s + v[c], 0));
    const entropy = -weights.reduce((s, w) => s + (w > 0 ? w * Math.log(w) : 0), 0);
    return { q, keys, values, scores, logits, soft, weights, argmax, contrib, out, entropy, effective: Math.exp(entropy), tau, mode: state.mode };
  }

  const api = { FEATURES, ITEMS, QUERIES, compute };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DXC = api;
})(typeof window !== "undefined" ? window : this);
