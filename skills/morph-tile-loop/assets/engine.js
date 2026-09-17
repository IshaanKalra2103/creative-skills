// morph-tile-loop engine — no libraries.
//
// A loop file calls defineLoop({...}). Contract:
//   loop      seconds per loop (default 8)
//   bg        background colour
//   lattice   { type: 'square' | 'hex', spacing, radius }   (both × min(viewport w, h))
//   spin      lattice turns per loop; must match the lattice symmetry
//             (square: multiples of 1/4, hex: multiples of 1/6) or the loop jumps
//   zoom      { depth, out: [t0, t1], curve, back: [t0, t1], nbrFade: [zLo, zHi] }
//             zooms out to 1/depth over `out`, dives back to 1 over `back`.
//             Neighbour tiles fade in as z drops from zHi to zLo, so frame 0 is one tile.
//   channels  { name: [[t, v], [t, v], ...] }  eased keyframes, held before/after.
//             The value at t=0 must equal the value at t=loop.
//   layers    [{ fill, tiny?, r, e, rot?, points?, show? }], drawn back to front.
//             r, e, rot, show are numbers or fns (ch) => value, where ch holds every channel
//             plus s (seconds into the loop).
//             r: radius × tile radius.  e: 1 circle, <1 towards polygon, >1 pinched star.
//             points: symmetry (4 default, 6 for hex, 3, 5…). rot: radians.
//             fill: colour string, or ['#a', '#b', ...] for a diagonal gradient across the tile.
//             tiny: flat colour used when the tile is < 3 px (defaults to the first stop).
//   outline   optional { color, width: (ch) => fraction of R }  stroke on a circle of radius R
//   wobble    optional (ch) => radians added to every tile's rotation
//
// Globals for loop files: lerp, clamp, ease.
// URL: ?t=3.2 freezes a frame, ?speed=0.5. Keys: space pauses.

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

function defineLoop(cfg) {
  const LOOP = cfg.loop || 8;
  const lat = Object.assign({ type: 'square', spacing: 0.8, radius: 0.24 }, cfg.lattice);
  const zoom = Object.assign({ depth: 30, out: [0.8, 7.2], curve: 1.7, back: [7.2, LOOP], nbrFade: [0.55, 0.9] }, cfg.zoom);
  const spin = cfg.spin || 0;
  const val = (v, ch) => typeof v === 'function' ? v(ch) : v;

  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  Object.assign(document.body.style, { margin: 0, height: '100vh', overflow: 'hidden', background: cfg.bg });
  Object.assign(canvas.style, { display: 'block', width: '100vw', height: '100vh' });
  const ctx = canvas.getContext('2d');

  let W, H, DPR;
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
  }
  resize();

  function channel(keys, s) {
    if (s <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
      if (s <= t1) return lerp(v0, v1, ease((s - t0) / (t1 - t0 || 1)));
    }
    return keys[keys.length - 1][1];
  }

  function state(s) {
    const ch = { s };
    for (const k in cfg.channels || {}) ch[k] = channel(cfg.channels[k], s);
    const [o0, o1] = zoom.out, [b0, b1] = zoom.back;
    const out = 1 - Math.pow(1 - clamp((s - o0) / (o1 - o0)), zoom.curve);
    const back = Math.pow(clamp((s - b0) / (b1 - b0)), 2.2);
    const z = Math.exp(-Math.log(zoom.depth) * out * (1 - back));
    const rot = ease((s - o0) / (o1 - o0)) * spin * Math.PI * 2;
    return { ch, z, rot };
  }

  // polar superellipse with k-fold symmetry
  function shape(r, e, rot, k, steps) {
    ctx.beginPath();
    const p = 2 / e;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const phi = a * k / 4;
      const rr = r * Math.pow(Math.pow(Math.abs(Math.cos(phi)), p) + Math.pow(Math.abs(Math.sin(phi)), p), -e / 2);
      const x = rr * Math.cos(a + rot), y = rr * Math.sin(a + rot);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function fillStyle(fill, R) {
    if (typeof fill === 'string') return fill;
    const g = ctx.createLinearGradient(-R, -R, R, R);
    fill.forEach((c, i) => g.addColorStop(i / (fill.length - 1), c));
    return g;
  }

  function tile(R, ch, spinRot) {
    const tiny = R < 3;
    for (const L of cfg.layers) {
      if (L.show !== undefined && !val(L.show, ch)) continue;
      const r = R * val(L.r, ch);
      if (r < 0.3) continue;
      const k = L.points || 4;
      const e = val(L.e, ch);
      // pinched stars need more samples to keep their points
      const steps = Math.max(16, Math.min(e > 1.5 ? 160 : 90, Math.round(r * (e > 1.5 ? 3 : 1.4))));
      shape(r, e, spinRot + (val(L.rot, ch) || 0), k, steps);
      ctx.fillStyle = tiny ? (L.tiny || (typeof L.fill === 'string' ? L.fill : L.fill[0])) : fillStyle(L.fill, R);
      ctx.fill();
    }
    if (cfg.outline && !tiny) {
      const w = val(cfg.outline.width, ch);
      if (w > 0.001) {
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(0.6, R * w);
        ctx.strokeStyle = cfg.outline.color; ctx.stroke();
      }
    }
  }

  function frame(s) {
    const { ch, z, rot } = state(s);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = cfg.bg; ctx.fillRect(0, 0, W, H);

    const unit = Math.min(W, H);
    const R = unit * lat.radius * z;
    const S = unit * lat.spacing * z;
    const nbr = 1 - ease((z - zoom.nbrFade[0]) / (zoom.nbrFade[1] - zoom.nbrFade[0]));
    const wob = cfg.wobble ? cfg.wobble(ch) : 0;

    // lattice basis vectors
    const [ax, ay, bx, by] = lat.type === 'hex'
      ? [S, 0, S / 2, S * Math.sqrt(3) / 2]
      : [S, 0, 0, S];
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const cx = W / 2, cy = H / 2, pad = R * 1.4;
    const reach = Math.hypot(W, H) / 2 + pad;
    const n = Math.ceil(reach / (lat.type === 'hex' ? S * 0.866 : S)) + 1;

    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const lx = i * ax + j * bx, ly = i * ay + j * by;
        if (lx * lx + ly * ly > reach * reach) continue;
        const x = cx + lx * cr - ly * sr, y = cy + lx * sr + ly * cr;
        if (x < -pad || x > W + pad || y < -pad || y > H + pad) continue;
        const r = (i === 0 && j === 0) ? R : R * nbr;
        if (r < 0.4) continue;
        ctx.setTransform(DPR, 0, 0, DPR, x * DPR, y * DPR);
        tile(r, ch, rot + wob);
      }
    }
  }

  const q = new URLSearchParams(location.search);
  const frozen = q.get('t');
  const speed = parseFloat(q.get('speed') || '1');
  if (frozen !== null) {
    const draw = () => frame(parseFloat(frozen) % LOOP);
    addEventListener('resize', () => { resize(); draw(); });
    requestAnimationFrame(draw);
    return;
  }
  addEventListener('resize', resize);
  let paused = false, clock = 0, last = performance.now();
  addEventListener('keydown', e => { if (e.code === 'Space') { paused = !paused; e.preventDefault(); } });
  (function loop(now) {
    if (!paused) clock += (now - last) / 1000 * speed;
    last = now;
    frame(clock % LOOP);
    requestAnimationFrame(loop);
  })(last);
}
