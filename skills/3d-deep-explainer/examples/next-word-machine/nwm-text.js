/* The Next-Word Machine — per-stage narration (casual, precise, prof's framing). Every number is pulled from the live model. */
(function () {
  "use strict";
  const NWMX = (window.NWMX = window.NWMX || {});

  NWMX.STAGES = [
    { n: 1, name: "Tokenizer gate", short: "Tokenize" },
    { n: 2, name: "Embedding cabinet", short: "Embed" },
    { n: 3, name: "Position", short: "Position" },
    { n: 4, name: "Q / K / V lenses", short: "Q·K·V" },
    { n: 5, name: "Attention plane", short: "Attention" },
    { n: 6, name: "Concat + W_z / MoE", short: "FFN / MoE" },
    { n: 7, name: "Stack × L", short: "Stack ×L" },
    { n: 8, name: "Output head W_o", short: "Output" },
    { n: 9, name: "Loss & perplexity", short: "Loss · PPL" },
    { n: 10, name: "Decoder + KV cache", short: "Decode" },
  ];

  const f2 = (x) => x.toFixed(2), f3 = (x) => x.toFixed(3);
  const esc = (w) => String(w).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sub = (n) => "<sub>" + n + "</sub>";

  NWMX.text = function (stage, R, S, D) {
    const F = R.F, n = F.n, t = S.t, W = R.words, V = D.vocab;
    const tw = esc(W[t]);
    const last = F.probs[n - 1];
    const order = last.map((_, i) => i).sort((a, b) => last[b] - last[a]);
    const top4 = order.slice(0, 4).map((i) => `${esc(V[i])} ${f3(last[i])}`).join(", ");
    const pc = R.params;
    const maskName = { causal: "causal", bidirectional: "bidirectional", sliding: "sliding window W=2", block: "block" }[S.mask];
    const out = { chips: [], html: "" };

    if (stage === 1) {
      out.chips = [["Tokens n", String(n)], ["Vocab V", String(V.length)], ["ids", R.ids.join(" ")]];
      out.html = `<p>Text comes in as a raw <em>string</em>. The gate splits it into <em>tokens</em> and swaps each one for an <em>integer id</em>. Those ids are all the model ever sees. We also prepend <span class="am-c">&lt;s&gt;</span> so the first word has something to be predicted from.</p>
        <p class="note">Our toy splits on spaces over a ${V.length}-type word vocab. Real LLMs use <a href="../topics/07-tokenization.html">BPE subwords</a>, so nothing is ever &lt;UNK&gt;.</p>
        <div class="fx">“${esc(W.filter((w) => w !== "<s>").join(" "))}” → [${W.map(esc).join(", ")}] → [${R.ids.join(", ")}]</div>`;
    } else if (stage === 2) {
      out.chips = [["V × d", `${V.length} × 8`], ["params in E", String(pc.E)], ["this row", `c${t + 1}`]];
      const c = F.c[t].map(f2).join(", ");
      out.html = `<p><em>E</em> is a V × d table: one drawer (row) per word type. Looking up token id ${R.ids[t]} just pulls out row ${R.ids[t]}. That row is <em>c${sub(t + 1)}</em>, the embedding of “${tw}”.</p>
        <p>Same word, same row, wherever it shows up. The 8 numbers were learned by backprop; no single dimension “means” anything on its own.</p>
        <div class="fx">c${sub(t + 1)} = E[${R.ids[t]}] = [${c}]</div>`;
    } else if (stage === 3) {
      out.chips = [["P", "10 × 8"], ["max length", "10"], ["params in P", String(pc.P)]];
      out.html = `<p>Self-attention on its own has no idea about <em>order</em>. So each position i gets its own learned vector <span class="p-c">p${sub("i")}</span>, simply <em>added</em> to the word vector: x${sub("i")} = c${sub("i")} + <span class="p-c">p${sub("i")}</span>.</p>
        <p class="note">Learned absolute positions (GPT-2 style): hard max length (10 here), no length extrapolation. NoPE drops p entirely and the causal mask leaks position instead.</p>
        <div class="fx">x${sub(t + 1)} = c${sub(t + 1)} + p${sub(t + 1)} = [${F.x[t].map(f2).join(", ")}]</div>`;
    } else if (stage === 4) {
      const L = F.layers[S.layer], hd = L.heads[S.head];
      out.chips = [["W_q, W_k, W_v", "4 × 8"], ["heads", "2 · d_h = 4"], ["layer", String(S.layer + 1)]];
      out.html = `<p>Every input row goes through three learned lenses: <span class="q-c">q = W_q z</span>, <span class="k-c">k = W_k z</span>, <span class="v-c">v = W_v z</span>. Each head has its own three; they're <em>shared across positions</em>, not across heads or layers.</p>
        <p>The q/k/v <em>vectors</em> are not parameters. Only the W's are.</p>
        <div class="fx"><span class="q-c">q${sub(t + 1)}</span> = [${hd.q[t].map(f2).join(", ")}]<br><span class="k-c">k${sub(t + 1)}</span> = [${hd.k[t].map(f2).join(", ")}]<br><span class="v-c">v${sub(t + 1)}</span> = [${hd.v[t].map(f2).join(", ")}]</div>`;
    } else if (stage === 5) {
      const L = F.layers[S.layer], hd = L.heads[S.head], a = hd.attn[t];
      const parts = a.map((w, s) => ({ w, s })).filter((o) => F.allowed[t][o.s]).sort((x, y) => y.w - x.w).slice(0, 3)
        .map((o) => `${esc(W[o.s])} <b class="mono">${f2(o.w)}</b>`).join(", ");
      const allowedN = F.allowed[t].filter(Boolean).length;
      out.chips = [["mask", maskName], [`row t=${t + 1} sums to`, f2(a.reduce((x, y) => x + y, 0))], ["dot products", `${n}² = ${n * n}`]];
      let maskNote = "";
      if (S.mask === "causal") maskNote = `Causal = lower triangle: no peeking at the future. “${tw}” can see ${allowedN} keys (itself and everything before).`;
      else if (S.mask === "bidirectional") maskNote = `<span class="bad-c">Bidirectional</span>: every token sees every token (encoder-style). This model was <em>trained causal</em>, so flipping the mask at inference is a train/test mismatch. Same weights, different prediction: ${top4}.`;
      else if (S.mask === "sliding") {
        const gone = R.unreachable.map((i) => esc(W[i])).join(", ");
        maskNote = `<span class="bad-c">Sliding W=2</span>: each query sees only itself + 1 before. The field grows with depth (prof: ≈ L·W; exact L(W−1)+1 = 3 tokens after 2 layers)${gone ? `, so ${gone} ${R.unreachable.length > 1 ? "are" : "is"} out of reach for the last token` : ""}. Trained causal, so it breaks: ${top4}.`;
      }
      else maskNote = `<span class="bad-c">Block mask</span> “${esc(W.slice(1, R.blockB).join(" "))} | ${esc(W.slice(R.blockB).join(" "))}”: causal inside each block, nothing crosses the boundary, in any layer, ever. Prediction now: ${top4}.`;
      out.html = `<p><em>Rows = queries, cols = keys.</em> Each cell is q${sub("t")}·k${sub("s")}/√4; masked cells get −∞, then softmax runs across each row. Query “${tw}” puts its weight on: ${parts}.</p>
        <p>${maskNote}</p>
        <div class="fx">h${sub(t + 1)} = Σ${sub("s")} a${sub(t + 1 + ",s")} v${sub("s")} = [${hd.h[t].map(f2).join(", ")}]</div>`;
    } else if (stage === 6) {
      const L = F.layers[S.layer];
      if (S.model === "moe") {
        const g = L.moe.gates[t], top = L.moe.top[t], tw2 = L.moe.topw[t];
        const off = [0, 1, 2, 3].filter((e) => !top.includes(e)).map((e) => "E" + (e + 1)).join(" and ");
        out.chips = [["experts", "N=4 · K=2"], ["total params", pc.total.toLocaleString()], ["active / token", pc.active.toLocaleString()]];
        out.html = `<p>MoE swaps W_z for <em>4 experts</em>. Router: s = W_r x, gates g = softmax(s) = [${g.map(f2).join(", ")}]. Keep the <em>top-2</em> (E${top[0] + 1}, E${top[1] + 1}) and renormalise to ${f2(tw2[0])}, ${f2(tw2[1])}.</p>
          <p>${off} are <em>never run</em> for “${tw}”. Params grow with N, compute per token grows with K. Each layer, each token routes on its own.</p>
          <div class="fx">z${sub(t + 1)} ← z${sub(t + 1)} + ${f2(tw2[0])}·E${top[0] + 1}(x) + ${f2(tw2[1])}·E${top[1] + 1}(x)</div>`;
      } else {
        const zeros = L.ffn.hid[t].filter((x) => x <= 0).length;
        out.chips = [["W_z", "8 → 16 → 8"], ["FFN params / layer", "256"], ["ReLU zeros", `${zeros} / 16`]];
        out.html = `<p>The two heads get concatenated, <em>[h¹; h²]</em> (8 numbers), and pushed through <em>W_z</em>, a position-wise ReLU feed-forward layer. ReLU zeroed ${zeros} of its 16 hidden units here.</p>
          <p>Its output is <em>added</em> to the residual stream, not swapped in: the brass bypass ring carries the old z around the block. In big models, most parameters live in W_z.</p>
          <div class="fx">z${sub(t + 1)}${S.layer ? "²" : "¹"} = z${sub(t + 1)}${S.layer ? "¹" : "⁰"} + W_z([h¹; h²])</div>`;
      }
    } else if (stage === 7) {
      const rf = R.receptive;
      out.chips = [["layers L", "2"], ["residual width", "8"], ["last token sees", `${rf} / ${n}`]];
      out.html = `<p>Same block, stacked: <em>layer 2 has its own</em> W_q, W_k, W_v, W_z. The glowing rail is the <em>residual stream</em>: every block reads z and adds an update, so gradients get a highway back down.</p>
        <p>The mask is applied in <em>every</em> layer, or layer 2 would leak the future. Under the current mask (${maskName}), the last token can draw on ${rf} of ${n} positions after 2 layers.</p>
        <div class="fx">z⁰ = x → z¹ = z⁰ + block₁ → z² = z¹ + block₂ → W_o</div>`;
    } else if (stage === 8) {
      const p = F.probs[t], o2 = p.map((_, i) => i).sort((a, b) => p[b] - p[a]);
      const top = o2.slice(0, 4).map((i) => `${esc(V[i])} <b class="mono">${f3(p[i])}</b>`).join(", ");
      out.chips = [["W_o", `${V.length} × 8`], ["top word", esc(V[o2[0]])], ["p", f3(p[o2[0]])]];
      out.html = `<p><em>W_o</em> turns z (8 numbers) into ${V.length} <em>logits</em>, one per word type. Softmax makes them a distribution. After “${esc(W.slice(1, t + 1).join(" "))}”: ${top}.</p>
        <p class="note">Corpus counts after “My favorite LLM is” were Claude 13, Gemini 4, ChatGPT 2, Qwen 1 (of 20). MLE ≈ counting, but the shared weights also generalise to prefixes it never saw.</p>`;
    } else if (stage === 9) {
      const L = R.tf;
      out.chips = [[`−log p(${esc(S.trueWord)})`, f2(R.stepLoss)], ["NLL", f3(L.nll)], ["PPL", f2(L.ppl)]];
      out.html = `<p>Training signal = <em>−log p(true word)</em>. If the truth is “${esc(S.trueWord)}”: −ln ${f3(R.stepP)} = <b class="mono">${f2(R.stepLoss)}</b> nats. Low prob → big loss → big update.</p>
        <p><em>Teacher forcing</em> scores the whole sentence in one parallel pass (one loss per position). Average = <em>NLL</em> = ${f3(L.nll)}; <em>PPL = e^NLL = ${f2(L.ppl)}</em>, i.e. like choosing between ~${f2(L.ppl)} equally likely words. Uniform over ${V.length} words → PPL ${V.length}.</p>`;
    } else if (stage === 10) {
      const dec = R.dec || {};
      out.chips = [["cache columns", String(n)], ["prefill / decode", `${R.promptLen} / ${n - R.promptLen}`], ["per step", "1 token"]];
      out.html = `<p><em>Prefill</em> computes K and V for the whole prompt in parallel and parks them on the shelf. Then <em>decoding</em> adds one token per step: only the new token's q, k, v get computed. Its q attends over the cached K/V and is thrown away; its k, v are appended.</p>
        <p>The cache grows linearly: per layer, per head, per token. Training never needs it (whole sequence known).${S.mask !== "causal" ? ` <span class="bad-c">With a ${maskName} mask, earlier tokens' K/V change when new tokens arrive, so the cache goes stale.</span>` : ""}</p>
        ${dec.msg ? `<div class="fx">${dec.msg}</div>` : ""}`;
    }
    return out;
  };
})();
