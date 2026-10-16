const fs = require("fs"), vm = require("vm");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/../weights.js", "utf8"), ctx);
const DATA = ctx.window.NWM_DATA;
const NWM = require(__dirname + "/../model.js");
const tests = JSON.parse(fs.readFileSync(__dirname + "/model_tests.json", "utf8"));
let worst = 0, count = 0;
const cmp = (a, b, path) => {
  if (Array.isArray(a)) { a.forEach((v, i) => cmp(v, b[i], path + "[" + i + "]")); return; }
  const d = Math.abs(a - b); count++;
  if (d > worst) worst = d;
  if (d > 1e-3) console.log("MISMATCH", path, a, b);
};
for (const key of ["dense", "moe"]) {
  for (const tc of tests[key]) {
    const f = NWM.forward(DATA[key], tc.ids, { mask: { kind: tc.mask, W: tc.W, block: tc.block } });
    cmp(f.x, tc.x, key + " x");
    tc.layers.forEach((L, l) => {
      const attn = f.layers[l].heads.map((h) => h.attn);
      cmp(attn, L.attn, `${key} L${l} attn`);
      cmp(f.layers[l].concat, L.concat, `${key} L${l} concat`);
      cmp(f.layers[l].z, L.z, `${key} L${l} z`);
      if (L.gates) {
        cmp(f.layers[l].moe.gates, L.gates, `${key} L${l} gates`);
        const same = JSON.stringify(f.layers[l].moe.top) === JSON.stringify(L.top);
        if (!same) console.log("TOPK MISMATCH", key, l, JSON.stringify(f.layers[l].moe.top), JSON.stringify(L.top));
      }
    });
    cmp(f.probs, tc.probs, key + " probs");
    const last = f.probs[f.n - 1];
    const top = last.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).slice(0, 4).map(([p, i]) => DATA.vocab[i] + " " + p.toFixed(3));
    console.log(key.padEnd(5), tc.mask.padEnd(13), tc.words.join(" ").padEnd(46), "->", top.join(", "));
  }
}
console.log(`compared ${count} numbers, max |JS - PyTorch| = ${worst.toExponential(3)}`);
console.log("params dense", JSON.stringify(NWM.paramCounts(DATA.dense)));
console.log("params moe  ", JSON.stringify(NWM.paramCounts(DATA.moe)));
