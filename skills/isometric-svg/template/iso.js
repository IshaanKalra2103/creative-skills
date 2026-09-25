// iso.js — isometric SVG line-art primitives. No dependencies; load with <script src="iso.js">.
//
// World axes (right-handed, z up):
//   u  across the object      → screen ↘   (visible face normal +u)
//   d  depth / along a lane   → screen ↗   (visible face normal −d, faces the viewer)
//   z  up                     → screen ↑   (visible face normal +z)
// The viewer sits at (+u, −d, +z), so only those three faces of any axis-aligned box show.
// One world unit = one SVG user unit, so a drag of N px along a world axis moves N units.
//
// Everything returns SVG markup strings; build a frame by concatenating in painter's
// order (back to front) and assign it to a <g>'s innerHTML.
(function () {
  const C = Math.cos(Math.PI / 6), S = 0.5;

  const P = ([u, d, z]) => [(u + d) * C, (u - d) * S - z];
  const f2 = n => (+n).toFixed(2);
  const pd = (pts, close = true) =>
    'M' + pts.map(p => { const q = P(p); return f2(q[0]) + ',' + f2(q[1]); }).join('L') + (close ? 'Z' : '');
  const attr = (cls, extra) => (cls ? ` class="${cls}"` : '') + (extra ? ' ' + extra : '');

  // filled polygon in world space (class '' = ink fill + line stroke; 'w' = solid line colour)
  const poly = (pts, cls = '', extra = '') => `<path${attr(cls, extra)} d="${pd(pts)}"/>`;
  // open polyline
  const line = (pts, cls = 'ln', extra = '') => `<path${attr(cls, extra)} d="${pd(pts, false)}"/>`;
  // outlined tube (a line drawn thick in line colour, then thin in ink): halos, handles, suspension
  const tube = pts => line(pts, 'tube') + line(pts, 'tubei');
  // polygon already in screen space
  const screenPoly = (pts2, cls = '') =>
    `<path${attr(cls)} d="M${pts2.map(q => f2(q[0]) + ',' + f2(q[1])).join('L')}Z"/>`;

  // the three visible faces of an axis-aligned box. T maps local → world (moving/lifting parts).
  function box(u0, u1, d0, d1, z0, z1, T = p => p, extra = '') {
    return poly([[u1, d0, z0], [u1, d1, z0], [u1, d1, z1], [u1, d0, z1]].map(T), '', extra) +
           poly([[u0, d0, z1], [u1, d0, z1], [u1, d1, z1], [u0, d1, z1]].map(T), '', extra) +
           poly([[u0, d0, z0], [u1, d0, z0], [u1, d0, z1], [u0, d0, z1]].map(T), '', extra);
  }

  // a CONVEX side profile [(d, z)…] extruded across u0..u1: the strips that face the viewer,
  // then the +u cap. Split concave shapes into convex pieces and draw them back to front.
  function extrude(profile, u0, u1, T = p => p) {
    let a = 0;
    for (let i = 0; i < profile.length; i++) {
      const [y0, z0] = profile[i], [y1, z1] = profile[(i + 1) % profile.length];
      a += y0 * z1 - y1 * z0;
    }
    const pr = a > 0 ? profile : [...profile].reverse();
    let s = '';
    for (let i = 0; i < pr.length; i++) {
      const [ya, za] = pr[i], [yb, zb] = pr[(i + 1) % pr.length];
      const ny = zb - za, nz = -(yb - ya);
      if (-ny + nz > 1e-6) s += poly([[u0, ya, za], [u0, yb, zb], [u1, yb, zb], [u1, ya, za]].map(T));
    }
    return s + poly(pr.map(([y, z]) => [u1, y, z]).map(T));
  }

  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of pts.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  // circle of radius r in a plane of constant `axis` ('u' | 'd' | 'z') through centre c
  function ring(c, r, axis = 'u', n = 40) {
    return Array.from({ length: n }, (_, i) => {
      const a = i / n * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (axis === 'u') return [c[0], c[1] + x, c[2] + y];
      if (axis === 'd') return [c[0] + x, c[1], c[2] + y];
      return [c[0] + x, c[1] + y, c[2]];
    });
  }

  // cylinder with its axis along u (wheels, barrels, rollers): silhouette = hull of both caps,
  // then the +u cap on top. opts: stripe (white band ratio pair), spin (radians) for rotation marks.
  function cylinderU(uc, dc, zc, r, w, opts = {}) {
    const u0 = uc - w / 2, u1 = uc + w / 2;
    let s = screenPoly(hull([...ring([u0, dc, zc], r), ...ring([u1, dc, zc], r)].map(P)));
    s += poly(ring([u1, dc, zc], r));
    if (opts.stripe) {
      const [a, b] = opts.stripe;
      s += `<path class="w" fill-rule="evenodd" d="${pd(ring([u1, dc, zc], r * b))}${pd(ring([u1, dc, zc], r * a).reverse())}"/>`;
    }
    if (opts.rim !== false) s += poly(ring([u1, dc, zc], r * (opts.rim || 0.6)));
    if (opts.spin != null) {
      for (let k = 0; k < 5; k++) {
        const t = opts.spin + k / 5 * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
        s += line([[u1, dc + c * r * 0.26, zc + sn * r * 0.26], [u1, dc + c * r * 0.52, zc + sn * r * 0.52]]);
      }
    }
    return s;
  }

  // rounded rectangle in the plane z (plates, lids, icons). Use with hull() for a thick plate.
  function roundRect(u0, u1, d0, d1, r, z) {
    const pts = [], arc = (cu, cd, a0) => { for (let k = 0; k <= 8; k++) {
      const a = a0 + k / 8 * Math.PI / 2; pts.push([cu + Math.cos(a) * r, cd + Math.sin(a) * r, z]); } };
    arc(u1 - r, d0 + r, -Math.PI / 2); arc(u1 - r, d1 - r, 0);
    arc(u0 + r, d1 - r, Math.PI / 2);  arc(u0 + r, d0 + r, Math.PI);
    return pts;
  }
  // a rounded slab: side band (hull of top + bottom outlines) then the top face
  const slab = (u0, u1, d0, d1, r, z0, z1) =>
    screenPoly(hull([...roundRect(u0, u1, d0, d1, r, z1), ...roundRect(u0, u1, d0, d1, r, z0)].map(P))) +
    poly(roundRect(u0, u1, d0, d1, r, z1));

  // Sutherland–Hodgman against the plane d = 0: keep the front (d ≤ 0) or back (d ≥ 0) part.
  // Use it for things that pass through an opening: draw the back part clipped to the opening,
  // the body with its hole, then the front part on top.
  function clipD(poly3, keepFront, plane = 0) {
    const inside = p => keepFront ? p[1] <= plane : p[1] >= plane;
    const out = [];
    for (let i = 0; i < poly3.length; i++) {
      const a = poly3[i], b = poly3[(i + 1) % poly3.length], ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) {
        const t = (a[1] - plane) / (a[1] - b[1]);
        out.push([a[0] + (b[0] - a[0]) * t, plane, a[2] + (b[2] - a[2]) * t]);
      }
    }
    return out;
  }

  // screen-space path data for a world polygon (for clipPath <path d=…>)
  const dOf = pts => pd(pts);

  // timeline helpers
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const seg = (t, [a, b]) => clamp01((t - a) / (b - a));
  const ease = x => x * x * (3 - 2 * x);
  const easeOut = x => 1 - Math.pow(1 - x, 3);

  window.ISO = { C, S, P, f2, pd, poly, line, tube, screenPoly, box, extrude, hull, ring, cylinderU,
    roundRect, slab, clipD, dOf, clamp01, seg, ease, easeOut };
})();
