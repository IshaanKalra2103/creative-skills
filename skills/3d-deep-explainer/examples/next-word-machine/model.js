/* The Next-Word Machine — plain-JS forward pass of the tiny Transformer LM.
   Returns EVERY intermediate so the 3D machine can show real numbers.
   Notation (Prof. Iyyer): c_i = E[w_i], p_i = P[i], x_i = c_i + p_i = z^0,
   q = W_q z, k = W_k z, v = W_v z per head; h_t^j = sum_s a_ts v_s;
   z_t^l = z_t^{l-1} + W_z([h_t^1; h_t^2]);  logits = W_o z_t^L.
   Works as a classic <script> (window.NWM) and in node (module.exports). */
(function (root) {
  "use strict";

  const matvec = (W, x) => W.map((row) => row.reduce((s, w, j) => s + w * x[j], 0));
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const relu = (a) => a.map((v) => (v > 0 ? v : 0));

  function softmax(xs) {
    let m = -Infinity;
    for (const v of xs) if (v > m) m = v;
    const e = xs.map((v) => (v === -Infinity ? 0 : Math.exp(v - m)));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((v) => v / s);
  }

  /* allowed[i][j]: may query i look at key j?  rows = queries, cols = keys. */
  function maskMatrix(n, opts) {
    const o = opts || {};
    const kind = o.kind || "causal";
    const W = o.W || 2;
    const b = o.block != null ? o.block : Math.floor(n / 2);
    const m = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        let ok;
        if (kind === "bidirectional") ok = true;
        else if (kind === "sliding") ok = j <= i && i - j < W;
        else if (kind === "block") ok = j <= i && (i < b) === (j < b);
        else ok = j <= i; // causal
        row.push(ok);
      }
      m.push(row);
    }
    return m;
  }

  function forward(model, ids, opts) {
    const o = opts || {};
    const W = model;
    const n = ids.length;
    const d = W.E[0].length;
    const H = W.layers[0].heads.length;
    const dh = W.layers[0].heads[0].Wq.length;
    const allowed = maskMatrix(n, o.mask);
    const scale = 1 / Math.sqrt(dh);

    const c = ids.map((id) => W.E[id].slice());
    const p = ids.map((_, i) => W.P[i].slice());
    const x = c.map((ci, i) => add(ci, p[i]));
    let z = x.map((r) => r.slice());
    const layers = [];

    for (let l = 0; l < W.layers.length; l++) {
      const LW = W.layers[l];
      const zin = z.map((r) => r.slice());
      const heads = LW.heads.map((hw) => {
        const q = zin.map((zt) => matvec(hw.Wq, zt));
        const k = zin.map((zt) => matvec(hw.Wk, zt));
        const v = zin.map((zt) => matvec(hw.Wv, zt));
        const raw = q.map((qi) => k.map((kj) => dot(qi, kj)));            // q_i . k_j
        const scores = raw.map((r) => r.map((s) => s * scale));            // / sqrt(d_head)
        const masked = scores.map((r, i) => r.map((s, j) => (allowed[i][j] ? s : -Infinity)));
        const attn = masked.map(softmax);
        const h = attn.map((a) => {
          const out = new Array(dh).fill(0);
          a.forEach((w, j) => { if (w) for (let e = 0; e < dh; e++) out[e] += w * v[j][e]; });
          return out;
        });
        return { q, k, v, raw, scores, masked, attn, h };
      });
      const concat = zin.map((_, t) => [].concat(...heads.map((hd) => hd.h[t])));   // [h_t^1; h_t^2]
      const layer = { zin, heads, concat };
      let ff;
      if (LW.moe) {
        const M = LW.moe;
        const N = M.Wr.length;
        const K = o.topK || 2;
        layer.moe = { scores: [], gates: [], top: [], topw: [], experts: [], out: [] };
        ff = concat.map((xt) => {
          const s = matvec(M.Wr, xt);                    // s_t = W_r x_t  (one score per expert)
          const g = softmax(s);                          // g_t = softmax(s_t)
          const order = g.map((v, i) => i).sort((a, b) => g[b] - g[a]);
          const top = order.slice(0, K);                 // active set T_t
          const tot = top.reduce((acc, i) => acc + g[i], 0);
          const topw = top.map((i) => g[i] / tot);       // renormalised over the chosen K
          const ex = new Array(N).fill(null);            // the N-K inactive experts are never run
          const out = new Array(d).fill(0);
          top.forEach((i, r) => {
            const pre = matvec(M.experts[i].W1, xt);
            const hid = relu(pre);
            const eo = matvec(M.experts[i].W2, hid);
            ex[i] = { pre, hid, out: eo };
            for (let e = 0; e < d; e++) out[e] += topw[r] * eo[e];
          });
          layer.moe.scores.push(s); layer.moe.gates.push(g); layer.moe.top.push(top);
          layer.moe.topw.push(topw); layer.moe.experts.push(ex); layer.moe.out.push(out);
          return out;
        });
      } else {
        const F = LW.ffn;
        layer.ffn = { pre: [], hid: [], out: [] };
        ff = concat.map((xt) => {
          const pre = matvec(F.W1, xt);
          const hid = relu(pre);
          const out = matvec(F.W2, hid);
          layer.ffn.pre.push(pre); layer.ffn.hid.push(hid); layer.ffn.out.push(out);
          return out;
        });
      }
      z = zin.map((zt, t) => add(zt, ff[t]));          // residual: z^l = z^{l-1} + W_z(...)
      layer.ff = ff;
      layer.z = z.map((r) => r.slice());
      layers.push(layer);
    }
    const logits = z.map((zt) => matvec(W.Wo, zt));
    const probs = logits.map(softmax);
    return { n, ids: ids.slice(), allowed, c, p, x, layers, logits, probs };
  }

  /* ---- decoding helpers (deterministic given an rng) ---- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Returns {kept: [ids], dist: renormalised probs over kept, choice} */
  function decode(probs, method, opt, rng) {
    const o = opt || {};
    const order = probs.map((p, i) => i).sort((a, b) => probs[b] - probs[a]);
    let kept;
    if (method === "greedy") kept = [order[0]];
    else if (method === "topk") kept = order.slice(0, Math.max(1, o.k || 3));
    else if (method === "topp") {
      kept = [];
      let cum = 0;
      for (const i of order) { kept.push(i); cum += probs[i]; if (cum >= (o.p || 0.9) - 1e-12) break; }
    } else kept = order.slice(); // ancestral sampling over the full vocab
    const tot = kept.reduce((s, i) => s + probs[i], 0);
    const dist = new Array(probs.length).fill(0);
    kept.forEach((i) => (dist[i] = probs[i] / tot));
    let choice = kept[0];
    if (method !== "greedy") {
      const r = (rng || Math.random)();
      let acc = 0;
      for (const i of kept) { acc += dist[i]; if (r < acc) { choice = i; break; } choice = i; }
    }
    return { kept, dist, choice, order };
  }

  function paramCounts(model) {
    const sz = (m) => m.length * m[0].length;
    const E = sz(model.E), P = sz(model.P), Wo = sz(model.Wo);
    let attn = 0, ffTotal = 0, ffActive = 0, router = 0;
    model.layers.forEach((L) => {
      L.heads.forEach((h) => (attn += sz(h.Wq) + sz(h.Wk) + sz(h.Wv)));
      if (L.moe) {
        router += sz(L.moe.Wr);
        const per = L.moe.experts.map((e) => sz(e.W1) + sz(e.W2));
        ffTotal += per.reduce((a, b) => a + b, 0);
        ffActive += per[0] * 2; // top-2 of equal-size experts
      } else {
        const s = sz(L.ffn.W1) + sz(L.ffn.W2);
        ffTotal += s; ffActive += s;
      }
    });
    const total = E + P + Wo + attn + ffTotal + router;
    const active = E + P + Wo + attn + ffActive + router;
    return { E, P, Wo, attn, ffTotal, ffActive, router, total, active };
  }

  const api = { forward, maskMatrix, softmax, decode, mulberry32, paramCounts };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NWM = api;
})(typeof window !== "undefined" ? window : this);
