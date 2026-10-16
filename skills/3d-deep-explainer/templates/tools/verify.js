// Check the page's computation (dx-compute.js) against the independent reference (tools/fixtures.json).
// Run: node tools/verify.js   -> prints the max abs difference; exits 1 if anything is off by > 1e-6.
const path = require("path");
const DXC = require(path.join(__dirname, "..", "dx-compute.js"));
const cases = require(path.join(__dirname, "fixtures.json"));
let worst = 0, n = 0;
const cmp = (a, b, where) => {
  if (Array.isArray(a)) return a.forEach((x, i) => cmp(x, b[i], where + "[" + i + "]"));
  const d = Math.abs(a - b); n++; if (d > worst) worst = d;
  if (!(d <= 1e-6)) console.log("MISMATCH", where, a, b);
};
for (const c of cases) {
  const r = DXC.compute(c.state);
  const tag = JSON.stringify(c.state);
  cmp(r.scores, c.scores, tag + " scores"); cmp(r.weights, c.weights, tag + " weights");
  cmp(r.out, c.out, tag + " out"); cmp(r.entropy, c.entropy, tag + " entropy");
}
console.log(`${cases.length} cases, ${n} numbers, max |JS - reference| = ${worst.toExponential(2)}`);
process.exit(worst <= 1e-6 ? 0 : 1);
