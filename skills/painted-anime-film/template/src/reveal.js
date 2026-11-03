// ---------- two-state world: paint each plate twice (before / after) and reveal one through a matte ----------
// Both states are painted by the same function with the same seeds and two palettes, so they line up stroke
// for stroke. The change then reads as the same place coming alive, not a crossfade between two pictures.
// The matte is anchored to the ground plane (world space), so it does not swim when the camera moves.

// paint(g, which, w, h) is called twice: which = 0 (before) and 1 (after). Returns [before, after] plates.
function platePair(w, h, depth, ox, oy, paint) {
  const a = new Plate(w, h, depth, ox, oy), b = new Plate(w, h, depth, ox, oy);
  paint(a.g, 0, w, h); resetG(a.g);
  paint(b.g, 1, w, h); resetG(b.g);
  return [a, b];
}
// pick a value per state; mixes colours when given a fraction
const pick = (which, a, b) => (which === 0 ? a : which === 1 ? b : Array.isArray(a) ? mixc(a, b, which) : lerp(a, b, which));

const RV = { div: 3, fa: null, fb: null, mask: null, edge: null, mImg: null, eImg: null, tab: null };
function rvInit() {
  if (RV.fa) return;
  RV.fa = mkCanvas(W, H); RV.fb = mkCanvas(W, H);
  const mw = Math.ceil(W / RV.div), mh = Math.ceil(H / RV.div);
  RV.mw = mw; RV.mh = mh;
  RV.mask = mkCanvas(mw, mh); RV.edge = mkCanvas(mw, mh);
  RV.mImg = RV.mask.getContext('2d').createImageData(mw, mh);
  RV.eImg = RV.edge.getContext('2d').createImageData(mw, mh);
  // ground noise table, 256 x 256 cells, tiles every 64 world units
  RV.tab = new Float32Array(256 * 256);
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) RV.tab[j * 256 + i] = fbm2(i / 256 * 12, j / 256 * 12, 4) + 0.35 * (vnoise2(i / 256 * 64, j / 256 * 64) - 0.5);
}
// smooth tiling noise on the ground plane, roughly 0..1
function rvNoise(x, z, scale = 1) {
  const u = (x * scale / 64 % 1 + 1) % 1 * 256, v = (z * scale / 64 % 1 + 1) % 1 * 256;
  const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, T_ = RV.tab;
  const a = T_[(j & 255) * 256 + (i & 255)], b = T_[(j & 255) * 256 + ((i + 1) & 255)];
  const c = T_[((j + 1) & 255) * 256 + (i & 255)], d = T_[((j + 1) & 255) * 256 + ((i + 1) & 255)];
  return lerp(lerp(a, b, fu), lerp(c, d, fu), fv);
}

// Build this frame's matte.
// arrive(hit, sx, sy) -> arrival time in seconds for the pixel; hit = [x, y, z] on the plane y = o.groundY, or null
// for rays that miss the ground (sky). t = current time (hold it on twos). o: {groundY, soft (s), band (s)}
// Returns {any, all}: whether anything / everything is revealed.
function revealMatte(cam, arrive, t, o = {}) {
  rvInit();
  const gy = o.groundY || 0, soft = o.soft ?? 0.08, band = o.band ?? 0.45;
  const { mw, mh, div } = RV, md = RV.mImg.data, ed = RV.eImg.data;
  const p0 = cam.unproject(0, 0, 1), px = V3.sub(cam.unproject(1, 0, 1), p0), py = V3.sub(cam.unproject(0, 1, 1), p0);
  const d0 = V3.sub(p0, cam.pos), C = cam.pos;
  let any = false, all = true;
  for (let j = 0; j < mh; j++) {
    const sy = (j + 0.5) * div;
    for (let i = 0; i < mw; i++) {
      const sx = (i + 0.5) * div;
      const dx = d0[0] + px[0] * sx + py[0] * sy, dy = d0[1] + px[1] * sx + py[1] * sy, dz = d0[2] + px[2] * sx + py[2] * sy;
      let hit = null;
      if (dy < -1e-5) { const k = (gy - C[1]) / dy; if (k > 0) hit = [C[0] + dx * k, gy, C[2] + dz * k]; }
      const a = arrive(hit, sx, sy);
      const u = t - a, r = clamp(u / soft), e = u > 0 ? Math.min(1, 2 * clamp(u / Math.max(soft, 1e-3)) * clamp(1 - u / band)) : 0; // the glow ramps in with the matte, so the front has no hard rim
      const q = (j * mw + i) * 4;
      md[q] = md[q + 1] = md[q + 2] = 255; md[q + 3] = r * 255;
      ed[q] = 255; ed[q + 1] = 226; ed[q + 2] = 160; ed[q + 3] = e * e * 255;
      if (r > 0) any = true; if (r < 1) all = false;
    }
  }
  RV.mask.getContext('2d').putImageData(RV.mImg, 0, 0);
  RV.edge.getContext('2d').putImageData(RV.eImg, 0, 0);
  RV.any = any; RV.all = all;
  return { any, all };
}

// Draw a stack of plates in both states through the current matte.
// drawState(gg, which) draws the plates for state 0 or 1 onto gg (a full-frame context).
// o: {edge: glow strength of the travelling front (0..1), edgeCol, edgeComp}
function revealDraw(g, drawState, o = {}) {
  if (!RV.any) { drawState(g, 0); return; }
  if (RV.all && !(o.edge > 0)) { drawState(g, 1); return; }
  const fa = RV.fa.getContext('2d'), fb = RV.fb.getContext('2d');
  for (const q of [fa, fb]) { q.setTransform(1, 0, 0, 1, 0, 0); q.globalAlpha = 1; q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, W, H); }
  if (!RV.all) drawState(fa, 0);
  drawState(fb, 1);
  if (!RV.all) {
    fb.save(); fb.globalCompositeOperation = 'destination-in'; fb.imageSmoothingEnabled = true; fb.imageSmoothingQuality = 'high';
    fb.drawImage(RV.mask, 0, 0, W, H); fb.restore();
    g.drawImage(RV.fa, 0, 0);
  }
  g.drawImage(RV.fb, 0, 0);
  if (o.edge > 0) {
    // the front glows where it has just passed, only on what these plates painted (never on empty sky behind them)
    if (!RV.ec) RV.ec = mkCanvas(W, H);
    const ec = RV.ec.getContext('2d');
    ec.setTransform(1, 0, 0, 1, 0, 0); ec.globalCompositeOperation = 'source-over'; ec.globalAlpha = 1; ec.clearRect(0, 0, W, H);
    ec.imageSmoothingEnabled = true; ec.drawImage(RV.edge, 0, 0, W, H);
    ec.globalCompositeOperation = 'destination-in'; ec.drawImage(RV.fb, 0, 0); ec.globalCompositeOperation = 'source-over';
    g.save(); g.globalCompositeOperation = o.edgeComp || 'screen'; g.globalAlpha = o.edge; g.drawImage(RV.ec, 0, 0); g.restore();
  }
}
