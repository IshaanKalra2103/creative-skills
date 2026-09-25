// dither-diorama engine — isometric cutaway diorama, dithered, with a live
// crowd, scroll-driven group highlights and a pull-back into a city.
//
//   import { createDiorama } from './engine.js';
//   createDiorama({ room, build(k) {...}, staff: [...], visitors: {...}, steps: [...], city: {...} });
//
// Everything is boxes. Each frame renders three passes:
//   1. mask  — every mesh drawn flat in its group's wash amount (0 inked … 1 washed)
//   2. scene — lit, shadowed, into a target at 2× the cell grid, with depth
//   3. post  — one square per 3-px cell, sized by tone; outlines from silhouette,
//              depth steps and tone steps; saturated colour survives; washed
//              cells fall back to paper with ghost outlines.
//
// Coordinates: x → right-back, z → left-front, y up. The camera sits at +x,+z.
// The two far walls (x = room.x0, z = room.z0) are full height; the two near
// walls are low; the door is on the x = room.x1 wall, with a porch outside it.
// See references/config.md for the full config contract.

import * as THREE from 'three';

export const DEFAULT_LOOK = {
  cellCss: 3,                       // cell size in CSS px
  exposure: 1.12, levels: 5,
  minBlock: 0.09, maxBlock: 0.42,   // half-size of the square, in cells
  black: 0.24, white: 0.86,         // luminance range mapped onto the ramp
  pen: 0.6,                         // outline tone (never full black)
  light: [210, 214, 225], dark: [11, 16, 20],
};

export function mulberry(seed) {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) | 0; let e = Math.imul(t ^ (t >>> 15), 1 | t);
    e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e; return ((e ^ (e >>> 14)) >>> 0) / 4294967296; };
}
const clamp01 = v => Math.min(1, Math.max(0, v));
const smoother = x => x * x * x * (x * (6 * x - 15) + 10);
const angleLerp = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
const V = (x, z) => new THREE.Vector3(x, 0, z);

export function createDiorama(cfg) {
  const params = new URLSearchParams(location.search);
  const look = { ...DEFAULT_LOOK, ...(cfg.look || {}) };
  const ACCENT = new THREE.Color(cfg.accent ?? 0xe09a42);
  const MARKER = new THREE.Color(cfg.marker ?? 0x2c63ff);
  const rnd = mulberry(cfg.seed ?? 7);
  const rr = (a, b) => a + (b - a) * rnd();
  const pick = arr => arr[(rnd() * arr.length) | 0];
  const steps = cfg.steps?.length ? cfg.steps : [{ title: 'Floor', show: null }];
  const useUI = cfg.ui !== false;
  const hasCity = cfg.city !== false && steps.some(s => s.city);

  // ───────────────────────────────────────────────────── renderer + ui ──
  if (useUI) injectUI(steps, cfg);
  const host = cfg.host || document.querySelector('.dd-stage');
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 90);
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-2.2, 4.2, 2.8).normalize().multiplyScalar(30);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 70;
  key.shadow.bias = -0.0008; key.shadow.radius = 3;
  if ('intensity' in key.shadow) key.shadow.intensity = 0.55;
  scene.add(key, key.target);
  let shadowSpan = 0;
  const setShadowSpan = s => { if (s === shadowSpan) return; shadowSpan = s; const c = key.shadow.camera;
    c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.updateProjectionMatrix(); };
  const fill = new THREE.DirectionalLight(0xd8e4ff, 0.65); fill.position.set(3, 1.6, -2.4); scene.add(fill);
  const under = new THREE.DirectionalLight(0xf2f6ff, 0.35); under.position.set(-0.5, -3, 1.5); scene.add(under);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d93a3, 0.6));

  // ─────────────────────────────────────────────────────────── the kit ──
  const GEO = new THREE.BoxGeometry(1, 1, 1);
  const matCache = new Map();
  const mat = (tone, tint) => {
    const k = (tint ? tint.getHexString() : '') + tone.toFixed(3);
    if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({
      color: tint ? tint.clone().multiplyScalar(tone) : new THREE.Color().setScalar(tone), roughness: 0.55 }));
    return matCache.get(k);
  };
  let G = 'room';
  const tagged = [], groupsSeen = new Set(['room']);
  const obstacles = [], staffZones = [], seats = [], ticks = [];
  function box(x, y, z, w, h, d, tone, parent = scene, tint = null) {
    const m = new THREE.Mesh(GEO, mat(tone, tint));
    m.scale.set(w, h, d); m.position.set(x, y + h / 2, z);
    m.castShadow = m.receiveShadow = true;
    m.userData.g = G; tagged.push(m); groupsSeen.add(G);
    parent.add(m);
    return m;
  }
  const slab = (x0, x1, y0, y1, z0, z1, tone, parent, tint) =>
    box((x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, tone, parent, tint);
  const SEG = { a:[0,1,1,1], b:[1,1,1,.5], c:[1,.5,1,0], d:[0,0,1,0], e:[0,.5,0,0], f:[0,1,0,.5], g:[0,.5,1,.5] };
  const DIGITS = { 0:'abcdef', 1:'bc', 2:'abged', 3:'abgcd', 4:'fgbc', 5:'afgcd', 6:'afgedc', 7:'abc', 8:'abcdefg', 9:'abcdfg' };
  const kit = {
    THREE, scene, rnd, rr, pick, ACCENT, MARKER,
    group(name) { G = name; groupsSeen.add(name); },
    box, slab,
    accent: (x, y, z, w, h, d, tone = 1, parent = scene) => box(x, y, z, w, h, d, tone, parent, ACCENT),
    block: (x0, x1, z0, z1) => obstacles.push({ x0, x1, z0, z1 }),
    staffOnly: (x0, x1, z0, z1) => staffZones.push({ x0, x1, z0, z1 }),
    seat(s) { const seat = { pool: 'default', anim: null, ...s, pos: V(s.x, s.z), who: null,
        plate: s.plate ? new THREE.Vector3(...s.plate) : null }; seats.push(seat); return seat; },
    tick(fn) { ticks.push(fn); },
    // seven-segment digits drawn on a wall plane facing +z at depth z
    digits(str, cx, cy, z, w, h, tone = 0.95, gap = .05, tint = null) {
      [...String(str)].forEach((ch, i) => {
        const x = cx + i * (w + gap);
        for (const s of DIGITS[ch] || '') {
          const [x0, y0, x1, y1] = SEG[s], t = Math.max(.012, w * .18);
          const X0 = x - w/2 + x0*w, X1 = x - w/2 + x1*w, Y0 = cy - h/2 + y0*h, Y1 = cy - h/2 + y1*h;
          if (Y0 === Y1) slab(Math.min(X0, X1) - t/2, Math.max(X0, X1) + t/2, Y0 - t/2, Y0 + t/2, z, z + .012, tone, scene, tint);
          else slab(X0 - t/2, X0 + t/2, Math.min(Y0, Y1), Math.max(Y0, Y1), z, z + .012, tone, scene, tint);
        }
      });
    },
    plant(x, z, s = 1) { box(x, 0, z, .18*s, .2*s, .18*s, 0.55); box(x, .2*s, z, .26*s, .22*s, .26*s, 0.3);
      box(x, .42*s, z, .16*s, .14*s, .16*s, 0.25); box(x + .06*s, .5*s, z - .05*s, .08*s, .1*s, .08*s, 0.4);
      obstacles.push({ x0: x - .15*s, x1: x + .15*s, z0: z - .15*s, z1: z + .15*s }); },
  };

  // ────────────────────────────────────────────────────────────── room ──
  const R = { x0: -3, x1: 3, z0: -2.4, z1: 2.6, wallH: 1.15, frontH: .26, porch: .75, ...(cfg.room || {}) };
  R.door = { z0: R.z1 - 1.22, z1: R.z1 - .58, ...(cfg.room?.door || {}) };
  const PORCH = { x0: R.x1, x1: R.x1 + R.porch, z0: R.door.z0 - .16, z1: R.door.z1 + .16 };
  const doorMid = (R.door.z0 + R.door.z1) / 2;
  kit.room = R; kit.porch = PORCH;
  G = 'room';
  slab(R.x0 - .08, R.x1 + .08, -.16, 0, R.z0 - .08, R.z1 + .08, R.floorTone ?? 0.93);
  slab(PORCH.x0, PORCH.x1, -.16, -.005, PORCH.z0, PORCH.z1, 0.9);
  slab(R.x0 - .08, R.x1 + .08, 0, R.wallH, R.z0 - .08, R.z0, 0.97);
  slab(R.x0 - .08, R.x0, 0, R.wallH, R.z0, R.z1 + .08, 0.97);
  slab(R.x0, R.x1 + .08, 0, R.frontH, R.z1, R.z1 + .08, 0.96);
  slab(R.x1, R.x1 + .08, 0, R.frontH, R.z0, R.door.z0, 0.96);
  slab(R.x1, R.x1 + .08, 0, R.frontH, R.door.z1, R.z1, 0.96);
  slab(R.x1, R.x1 + .08, 0, .9, R.door.z0 - .06, R.door.z0, 0.6);
  slab(R.x1, R.x1 + .08, 0, .9, R.door.z1, R.door.z1 + .06, 0.6);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(R.x1 + .04, 0, R.door.z0);
  scene.add(doorPivot);
  const dw = R.door.z1 - R.door.z0;
  box(0, 0, dw / 2, .03, .86, dw, 0.82, doorPivot);
  box(0, .3, dw / 2, .035, .38, dw - .12, 0.97, doorPivot);
  box(-.03, .42, dw - .08, .03, .03, .06, 0.2, doorPivot);
  slab(PORCH.x0 + .2, PORCH.x1 - .2, 0, .012, R.door.z0 + .07, R.door.z1 - .07, 0.55);

  cfg.build?.(kit);
  G = 'room';

  // ──────────────────────────────────────────────── shell (city view) ──
  const shell = new THREE.Group(); scene.add(shell);
  const shellWalls = new THREE.Group(), shellRoof = new THREE.Group();
  shell.add(shellWalls, shellRoof);
  G = 'shell';
  if (hasCity) {
    const H = R.wallH;
    slab(R.x0, R.x1 + .08, 0, H * .87, R.z1, R.z1 + .08, 0.95, shellWalls);
    slab(R.x1, R.x1 + .08, 0, H * .87, R.z0, R.door.z0 - .06, 0.95, shellWalls);
    slab(R.x1, R.x1 + .08, 0, H * .87, R.door.z1 + .06, R.z1, 0.95, shellWalls);
    slab(R.x1 + .08, R.x1 + .09, H * .3, H * .7, R.z0 + .5, R.door.z0 - .3, 0.55, shellWalls);
    slab(R.x0 + .4, R.x1 - .4, H * .3, H * .7, R.z1 + .08, R.z1 + .09, 0.55, shellWalls);
    slab(R.x0 - .1, R.x1 + .1, H, H + .09, R.z0 - .1, R.z1 + .1, 0.92, shellRoof);
    for (const [a, b, c, d, t] of [[R.x0 - .12, R.x1 + .12, R.z1 + .02, R.z1 + .12, .82], [R.x0 - .12, R.x1 + .12, R.z0 - .12, R.z0 - .02, .78],
                                    [R.x1 + .02, R.x1 + .12, R.z0 - .12, R.z1 + .12, .82], [R.x0 - .12, R.x0 - .02, R.z0 - .12, R.z1 + .12, .78]])
      slab(a, b, H + .09, H + .19, c, d, t, shellRoof);
    const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
    slab(cx - 1.4, cx - .2, H + .09, H + .4, cz - 2.1, cz - 1.1, 0.72, shellRoof);
    slab(cx + .8, cx + 1.5, H + .09, H + .3, cz + .2, cz + .8, 0.76, shellRoof);
    for (let i = 0; i < 3; i++) slab(cx + .85 + i * .22, cx + 1 + i * .22, H + .3, H + .32, cz + .25, cz + .75, 0.4, shellRoof);
    slab(R.x1 + .12, R.x1 + .16, H * .83, H * .96, R.door.z0 - .4, R.door.z1 + .4, 0.12, shellRoof);
    box(R.x0 + .6, H + .09, R.z0 + .5, .32, 2.1, .32, 1, shellRoof, MARKER);
  }
  shell.visible = false;
  G = 'room';

  // ──────────────────────────────────────────────────────── walk grid ──
  const GRID = { x0: R.x0, z0: R.z0 - .05, s: .06 };
  GRID.nx = Math.ceil((PORCH.x1 - GRID.x0) / GRID.s);
  GRID.nz = Math.ceil((R.z1 + .05 - GRID.z0) / GRID.s);
  const walkableBase = (x, z) =>
    (x > R.x0 + .1 && x < R.x1 - .1 && z > R.z0 + .08 && z < R.z1 - .1) ||
    (x >= R.x1 - .15 && x <= R.x1 + .15 && z > R.door.z0 + .1 && z < R.door.z1 - .1) ||
    (x > R.x1 + .1 && x < PORCH.x1 - .05 && z > PORCH.z0 + .06 && z < PORCH.z1 - .06);
  function makeGrid(extra) {
    const g = new Uint8Array(GRID.nx * GRID.nz), pad = .1, all = obstacles.concat(extra);
    for (let j = 0; j < GRID.nz; j++) for (let i = 0; i < GRID.nx; i++) {
      const x = GRID.x0 + (i + .5) * GRID.s, z = GRID.z0 + (j + .5) * GRID.s;
      let free = walkableBase(x, z);
      if (free) for (const o of all) if (x > o.x0 - pad && x < o.x1 + pad && z > o.z0 - pad && z < o.z1 + pad) { free = false; break; }
      g[j * GRID.nx + i] = free ? 0 : 1;
    }
    return g;
  }
  const gridStaff = makeGrid([]), gridVisitor = makeGrid(staffZones);
  const cellOf = (x, z) => [Math.floor((x - GRID.x0) / GRID.s), Math.floor((z - GRID.z0) / GRID.s)];
  const isFree = (g, i, j) => i >= 0 && j >= 0 && i < GRID.nx && j < GRID.nz && g[j * GRID.nx + i] === 0;
  function nearestFree(g, i, j) {
    if (isFree(g, i, j)) return [i, j];
    for (let r = 1; r < 14; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++)
      if (Math.max(Math.abs(di), Math.abs(dj)) === r && isFree(g, i + di, j + dj)) return [i + di, j + dj];
    return [i, j];
  }
  function lineFree(g, a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (GRID.s * .5));
    for (let k = 1; k < n; k++) { const [i, j] = cellOf(a.x + (b.x - a.x) * k / n, a.z + (b.z - a.z) * k / n); if (!isFree(g, i, j)) return false; }
    return true;
  }
  // A* on an 8-connected grid, string-pulled into straight legs
  function findPath(g, from, to) {
    const [si, sj] = nearestFree(g, ...cellOf(from.x, from.z));
    const [gi, gj] = nearestFree(g, ...cellOf(to.x, to.z));
    const N = GRID.nx * GRID.nz, start = sj * GRID.nx + si, goal = gj * GRID.nx + gi;
    const gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
    const push = (id, f) => { heap.push([f, id]); let k = heap.length - 1;
      while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop();
      if (heap.length) { heap[0] = last; let k = 0;
        for (;;) { const l = 2*k+1, r = l+1; let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
      return top[1]; };
    const h = (i, j) => { const dx = Math.abs(i - gi), dz = Math.abs(j - gj); return Math.max(dx, dz) + .414 * Math.min(dx, dz); };
    gs[start] = 0; push(start, h(si, sj));
    while (heap.length) {
      const cur = pop();
      if (cur === goal) break;
      if (closed[cur]) continue; closed[cur] = 1;
      const ci = cur % GRID.nx, cj = (cur / GRID.nx) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!isFree(g, ni, nj) || (di && dj && (!isFree(g, ci + di, cj) || !isFree(g, ci, cj + dj)))) continue;
        const nid = nj * GRID.nx + ni, cost = gs[cur] + (di && dj ? 1.414 : 1);
        if (cost < gs[nid]) { gs[nid] = cost; came[nid] = cur; push(nid, cost + h(ni, nj)); }
      }
    }
    if (came[goal] === -1 && goal !== start) return [to.clone()];
    const pts = [];
    for (let c = goal; c !== -1; c = came[c]) {
      pts.unshift(V(GRID.x0 + (c % GRID.nx + .5) * GRID.s, GRID.z0 + (((c / GRID.nx) | 0) + .5) * GRID.s));
      if (c === start) break;
    }
    pts.push(to.clone());
    const out = []; let anchor = from.clone(), k = 0;
    while (k < pts.length) {
      let far = k;
      for (let m = pts.length - 1; m > k; m--) if (lineFree(g, anchor, pts[m])) { far = m; break; }
      out.push(pts[far]); anchor = pts[far]; k = far + 1;
    }
    return out;
  }

  // ─────────────────────────────────────────────────────────── people ──
  const people = [];
  function makePerson({ group, tone = .6, head = .3, pos, yaw = 0, apron = false, holds = null }) {
    const prevG = G; G = group;
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body); root.position.copy(pos); root.rotation.y = yaw;
    body.scale.setScalar(1.3);
    const limb = (x, y, w, h, d, t) => { const p = new THREE.Group(); p.position.set(x, y, 0);
      box(0, -h, 0, w, h, d, t, p); body.add(p); return p; };
    const legL = limb(-.04, .19, .055, .19, .065, tone * .8), legR = limb(.04, .19, .055, .19, .065, tone * .8);
    box(0, .19, .005, .16, .2, .1, tone, body);
    if (apron) box(0, .15, .052, .13, .2, .01, 0.97, body);
    box(0, .395, .005, .1, .1, .1, head, body);
    const armL = limb(-.102, .37, .045, .17, .055, tone * .95), armR = limb(.102, .37, .045, .17, .055, tone * .95);
    if (holds === 'clipboard') { const c = box(0, -.17, .04, .09, .005, .12, 1.0, armL); }
    if (holds === 'phone') box(0, -.17, .03, .04, .06, .012, 0.1, armR);
    if (holds === 'mop') { box(0, -.5, .07, .02, .42, .02, .55, armR); box(0, -.52, .07, .14, .03, .07, .85, armR); }
    G = prevG;
    scene.add(root);
    const p = { group, root, body, legL, legR, armL, armR, pos: root.position, yaw, targetYaw: yaw, path: [],
      speed: rr(.42, .56), walked: rr(0, 10), state: 'idle', anim: 'idle', timer: 0, phase: rnd() * 6, grow: 1, item: null };
    people.push(p);
    return p;
  }
  function stepPath(p, dt) {
    if (!p.path.length) return true;
    const tgt = p.path[0], dx = tgt.x - p.pos.x, dz = tgt.z - p.pos.z, d = Math.hypot(dx, dz), s = p.speed * dt;
    if (d > 1e-4) p.targetYaw = Math.atan2(dx, dz);
    p.walked += s;
    if (d <= s) { p.pos.x = tgt.x; p.pos.z = tgt.z; p.path.shift(); return p.path.length === 0; }
    p.pos.x += dx / d * s; p.pos.z += dz / d * s;
    return false;
  }
  const walkTo = (p, grid, target, state) => { p.path = findPath(grid, p.pos, target); p.state = state; p.moving = true; };

  // ──────────────────────────────────────────────────────────── items ──
  const ITEMS = {
    tray: { build: (k, g) => { k.box(0, 0, 0, .2, .012, .15, .55, g); k.accent(-.04, .012, 0, .09, .03, .08, .55, g);
      k.box(-.04, .042, 0, .08, .015, .07, .22, g); k.accent(-.04, .057, 0, .085, .02, .075, .62, g);
      k.accent(.06, .012, -.03, .05, .06, .04, .45, g); k.box(.06, .012, .04, .045, .08, .045, .95, g); } },
    bag: { hand: true, build: (k, g) => { k.accent(0, 0, 0, .11, .13, .07, .5, g); k.box(0, .13, 0, .06, .02, .02, .3, g); } },
    cup: { hand: true, build: (k, g) => { k.box(0, 0, 0, .045, .08, .045, .95, g); k.box(0, .08, 0, .05, .012, .05, .3, g); } },
    box: { build: (k, g) => { k.box(0, 0, 0, .17, .12, .14, .72, g); k.box(0, .12, 0, .17, .004, .03, .45, g); } },
    paper: { build: (k, g) => { k.box(0, 0, 0, .1, .006, .13, 1, g); k.box(0, .006, -.03, .07, .004, .01, .4, g); } },
    laptop: { build: (k, g) => { k.box(0, 0, 0, .18, .012, .13, .25, g); const s = k.box(0, .012, -.06, .18, .11, .008, .18, g); s.rotation.x = -.25; } },
    ...(cfg.items || {}),
  };
  function makeItem(name) {
    const spec = ITEMS[name] || ITEMS.box;
    const prevG = G; G = 'visitors';
    const g = new THREE.Group(); spec.build(kit, g); g.userData.kind = name; g.userData.hand = !!spec.hand;
    G = prevG; scene.add(g); return g;
  }
  const holdItem = (p, item) => {
    p.item = item; p.body.attach(item); item.rotation.set(0, 0, 0);
    if (item.userData.hand) item.position.set(.13, .12, .02); else item.position.set(0, .3, .13);
  };

  // ──────────────────────────────────────────────────────────── staff ──
  const staffByName = {};
  for (const s of cfg.staff || []) {
    const p = makePerson({ group: s.group || 'staff', tone: s.tone ?? .3, head: s.head ?? .22,
      pos: V(...s.at), yaw: s.yaw ?? 0, apron: s.apron, holds: s.holds });
    Object.assign(p, { role: s.role || 'post', spec: s, anim: s.anim || 'idle', home: V(...s.at), homeYaw: s.yaw ?? 0 });
    p.speed = s.speed ?? (s.role === 'courier' ? .6 : .4);
    if (p.role === 'patrol') { p.stop = 0; p.state = 'dwell'; p.timer = rr(...(s.stops[0].t || [2, 4])); p.anim = s.stops[0].anim || 'idle'; }
    if (p.role === 'courier') { p.state = 'home'; p.orders = []; }
    if (s.name) staffByName[s.name] = p;
  }
  function updateStaff(dt) {
    for (const p of people) {
      if (!p.role) continue;
      if (p.role === 'patrol') {
        if (p.state === 'walk') {
          if (stepPath(p, dt)) { const st = p.spec.stops[p.stop]; p.state = 'dwell'; p.moving = false;
            p.targetYaw = st.yaw ?? p.targetYaw; p.anim = st.anim || 'idle'; p.timer = rr(...(st.t || [2, 4])); }
        } else if ((p.timer -= dt) <= 0) {
          p.stop = (p.stop + 1) % p.spec.stops.length;
          walkTo(p, gridStaff, V(...p.spec.stops[p.stop].at), 'walk');
        }
      } else if (p.role === 'courier') updateCourier(p, dt);
    }
  }
  function updateCourier(r, dt) {
    switch (r.state) {
      case 'home':
        r.targetYaw = r.homeYaw; r.anim = r.spec.anim || 'cook';
        if (r.orders.length) { r.order = r.orders.shift(); r.state = 'prep'; r.timer = rr(...(r.order.fetch.prep || [1.2, 2.2])); }
        break;
      case 'prep':
        if ((r.timer -= dt) <= 0) {
          const { fetch, visitor } = r.order;
          const next = route[visitor.ri + 1];
          const seatsFull = next?.type === 'seat' && !seats.some(s => s.pool === (next.pool || 'default') && !s.who);
          const takeout = fetch.takeout && (seatsFull || rnd() < (fetch.takeout.chance ?? .2));
          r.carry = makeItem(takeout ? fetch.takeout.item : fetch.item);
          r.carry.userData.takeout = !!takeout;
          holdItem(r, r.carry);
          walkTo(r, gridStaff, V(...fetch.stand(visitor.spotIdx, visitor.spot)), 'deliver');
        }
        break;
      case 'deliver':
        if (stepPath(r, dt)) {
          const { fetch, visitor } = r.order;
          r.moving = false; r.targetYaw = fetch.standYaw ?? 0;
          scene.attach(r.carry); r.carry.position.set(...fetch.drop(visitor.spotIdx, visitor.spot)); r.carry.rotation.set(0, 0, 0);
          r.item = null;
          visitor.pending = r.carry; visitor.state = 'pickupWait'; visitor.timer = .6;
          r.carry = null; r.state = 'return'; r.timer = .5; r.path = findPath(gridStaff, r.pos, r.home);
        }
        break;
      case 'return':
        if ((r.timer -= dt) > 0) break;
        r.moving = true;
        if (stepPath(r, dt)) { r.state = 'home'; r.moving = false; }
        break;
    }
  }

  // ───────────────────────────────────────────────────────── visitors ──
  const VIS = { rate: [3, 6], rushRate: [1.4, 2.6], max: 16, tone: [.3, .6], route: [], ...(cfg.visitors || {}) };
  const route = VIS.route;
  route.forEach((st, i) => {
    if (st.type === 'queue') st.list = [];
    if (st.type === 'counter') st.spotState = st.spots.map(s => ({ ...s, busy: null }));
  });
  const DOOR_IN = V(R.x1 - .38, doorMid);
  const OUTSIDE = () => V(PORCH.x1 - .13, doorMid + rr(-.2, .2));
  let served = 0;

  function makeVisitor(pos, yaw) {
    const p = makePerson({ group: 'visitors', tone: rr(...VIS.tone), head: rnd() < .75 ? rr(.06, .16) : rr(.4, .55), pos, yaw });
    p.visitor = true; p.ri = -1;
    return p;
  }
  function spawn() {
    const p = makeVisitor(OUTSIDE(), -Math.PI / 2);
    p.grow = 0; p.path = [DOOR_IN.clone()]; p.state = 'entering'; p.moving = true;
    if (VIS.carry) holdItem(p, makeItem(VIS.carry));
  }
  function advance(p) { p.ri++; enter(p); }
  function enter(p) {
    const st = route[p.ri];
    if (!st) return leave(p);
    if (st.chance != null && rnd() > st.chance) return advance(p);
    if (st.type === 'queue') {
      if (st.list.length >= (st.max ?? 6)) return leave(p);
      st.list.push(p); p.slot = st.list.length - 1;
      walkTo(p, gridVisitor, V(...st.slot(p.slot)), 'toQueue');
    } else if (st.type === 'counter') {
      if (!claimSpot(p, st)) { p.state = 'hold'; p.moving = false; }
    } else if (st.type === 'seat') {
      if (p.item?.userData.takeout) return advance(p);
      const open = seats.filter(s => s.pool === (st.pool || 'default') && !s.who);
      if (!open.length) return st.ifFull === 'skip' ? advance(p) : leave(p);
      const seat = pick(open); seat.who = p; p.seat = seat;
      walkTo(p, gridVisitor, seat.pos, 'toSeat');
    } else if (st.type === 'visit') {
      st.taken ??= new Set();
      const free = st.points.filter(pt => !st.taken.has(pt));
      if (!free.length) return st.ifFull === 'exit' ? leave(p) : advance(p);
      const pt = pick(free); st.taken.add(pt); p.visitPt = pt; p.visitSt = st; p.visitYaw = pt[2];
      walkTo(p, gridVisitor, V(pt[0], pt[1]), 'toVisit');
    }
  }
  function claimSpot(p, st) {
    const i = st.spotState.findIndex(s => !s.busy);
    if (i < 0) return false;
    st.spotState[i].busy = p; p.spotIdx = i; p.spot = st.spotState[i];
    walkTo(p, gridVisitor, V(p.spot.x, p.spot.z), 'toSpot');
    return true;
  }
  function releaseSpot(p) { if (p.spot) { p.spot.busy = null; p.spot = null; } }
  function leave(p) {
    if (p.seat) { p.seat.who = null; p.seat = null; }
    if (p.visitPt) { p.visitSt.taken.delete(p.visitPt); p.visitPt = null; }
    if (p.placed) { scene.remove(p.placed); p.placed = null; }
    releaseSpot(p);
    if (p.ri > 0) served++;
    p.path = [...findPath(gridVisitor, p.pos, DOOR_IN), OUTSIDE()];
    p.state = 'leave'; p.moving = true;
  }

  let spawnIn = 1.2;
  function updateVisitors(dt, t) {
    spawnIn -= dt;
    if (spawnIn <= 0) {
      if (people.filter(p => p.visitor).length < VIS.max) spawn();
      spawnIn = Math.sin(t * .09) > .3 ? rr(...VIS.rushRate) : rr(...VIS.rate);
    }
    // queues feed the counter that follows them
    route.forEach((st, i) => {
      if (st.type !== 'queue') return;
      const next = route[i + 1];
      const head = st.list[0];
      if (head && head.state === 'queued' && next?.type === 'counter' && next.spotState.some(s => !s.busy)) {
        st.list.shift(); head.ri = i + 1; claimSpot(head, next);
        st.list.forEach((q, k) => { if (q.slot !== k) { q.slot = k;
          if (q.state === 'queued' || q.state === 'toQueue') walkTo(q, gridVisitor, V(...st.slot(k)), 'toQueue'); } });
      }
    });
    for (const p of people) {
      if (!p.visitor) continue;
      const st = route[p.ri];
      switch (p.state) {
        case 'entering': if (stepPath(p, dt)) advance(p); break;
        case 'toQueue': if (stepPath(p, dt)) { p.state = 'queued'; p.moving = false; p.targetYaw = st.face ?? Math.PI; } break;
        case 'queued': p.targetYaw = st.face ?? Math.PI; break;
        case 'hold': claimSpot(p, st); break;
        case 'toSpot':
          if (stepPath(p, dt)) { p.state = 'dwell'; p.moving = false; p.targetYaw = p.spot.yaw ?? Math.PI; p.timer = rr(...(st.dwell || [1.6, 3])); }
          break;
        case 'dwell':
          if ((p.timer -= dt) <= 0) {
            if (st.fetch) { const c = staffByName[st.fetch.courier]; if (c) { c.orders.push({ visitor: p, fetch: st.fetch }); p.state = 'waitItem'; break; } }
            if (st.give) holdItem(p, makeItem(st.give));
            releaseSpot(p); advance(p);
          }
          break;
        case 'pickupWait':
          if ((p.timer -= dt) <= 0) { holdItem(p, p.pending); p.pending = null; p.state = 'pickup'; p.timer = .35; }
          break;
        case 'pickup': if ((p.timer -= dt) <= 0) { releaseSpot(p); advance(p); } break;
        case 'toSeat':
          if (stepPath(p, dt)) {
            p.state = 'seated'; p.moving = false; p.targetYaw = p.seat.yaw; p.timer = rr(...(st.dwell || [9, 17]));
            if (p.item && p.seat.plate) { scene.attach(p.item); p.item.position.copy(p.seat.plate); p.item.rotation.set(0, p.seat.yaw, 0); p.placed = p.item; p.item = null; }
          } break;
        case 'seated':
          p.targetYaw = p.seat.yaw;
          if ((p.timer -= dt) <= 0) {
            if (p.placed) { if (st.consume !== false) scene.remove(p.placed); else holdItem(p, p.placed); p.placed = null; }
            p.seat.who = null; p.seat = null; advance(p);
          } break;
        case 'toVisit':
          if (stepPath(p, dt)) { p.state = 'visiting'; p.moving = false; p.targetYaw = p.visitYaw ?? p.targetYaw; p.timer = rr(...(st.dwell || [2, 4])); }
          break;
        case 'visiting': if ((p.timer -= dt) <= 0) { p.visitSt.taken.delete(p.visitPt); p.visitPt = null; advance(p); } break;
        case 'leave': if (stepPath(p, dt)) p.state = 'gone'; break;
        case 'gone':
          p.grow -= dt / .35;
          if (p.grow <= 0) { scene.remove(p.root); p.dead = true; }
          break;
      }
      if (p.state !== 'gone' && p.grow < 1) p.grow = Math.min(1, p.grow + dt / .35);
    }
    for (let i = people.length - 1; i >= 0; i--) if (people[i].dead) people.splice(i, 1);
  }
  // a few people already seated when the page opens
  const firstSeat = route.findIndex(s => s.type === 'seat');
  if (firstSeat >= 0) {
    const st = route[firstSeat];
    const pool = seats.filter(s => s.pool === (st.pool || 'default'));
    for (let k = 0; k < (VIS.startSeated ?? 3) && pool.length; k++) {
      const seat = pool.splice((rnd() * pool.length) | 0, 1)[0];
      const p = makeVisitor(seat.pos.clone(), seat.yaw);
      p.ri = firstSeat; p.seat = seat; seat.who = p; p.state = 'seated'; p.timer = rr(3, 12); p.targetYaw = p.yaw = seat.yaw;
      if (st.startItem && seat.plate) { const it = makeItem(st.startItem); it.position.copy(seat.plate); it.rotation.y = seat.yaw; p.placed = it; }
    }
  }

  // ───────────────────────────────────────────────────────────── pose ──
  const SEATED_ANIMS = { eat: 1, type: 1, talk: 1, read: 1 };
  function pose(p, dt, t) {
    p.yaw = angleLerp(p.yaw, p.targetYaw, 1 - Math.exp(-dt / .12));
    p.root.rotation.y = p.yaw;
    const moving = p.moving && p.path.length > 0;
    const seated = p.state === 'seated';
    const swing = moving ? .55 * Math.sin(8 * p.walked) : 0;
    const bob = moving ? .014 * Math.abs(Math.sin(8 * p.walked)) : 0;
    let aL = -.7 * swing, aR = .7 * swing, lean = moving ? .06 : 0;
    let anim = seated ? (p.seat.anim || route[p.ri]?.anim || 'eat') : p.anim;
    if (p.visitor && !seated) anim = p.state === 'dwell' ? 'order' : p.state === 'visiting' ? (route[p.ri]?.anim || 'idle') : 'idle';
    if (anim === 'serve') anim = people.some(v => v.visitor && v.state === 'dwell' && v.pos.distanceTo(p.pos) < 1.0) ? 'type' : 'idle';
    if (p.item && (moving || !['load', 'fold', 'reach'].includes(anim))) aL = aR = p.item.userData.hand ? -.1 : -1.5;
    else if (!moving) switch (anim) {
      case 'cook':  aL = -1.1 + .35 * Math.sin(6.5 * t); aR = -.9 + .3 * Math.sin(6.5 * t + 2); break;
      case 'stir':  aL = -.8 + .2 * Math.sin(3 * t + p.phase); aR = -1.2; break;
      case 'type':  aL = -1.0 + .1 * Math.sin(13 * t); aR = -1.0 + .1 * Math.sin(14 * t + 1); break;
      case 'write': aL = -1.2; aR = -1.0 + .25 * Math.sin(9 * t); lean = .08; break;
      case 'order': aR = -.5 + .15 * Math.sin(4 * t + p.phase); break;
      case 'talk':  aL = -.5 + .35 * Math.sin(1.7 * t + p.phase); aR = -.3 + .3 * Math.sin(2.3 * t + p.phase * 2); break;
      case 'read':  aL = aR = -1.2; lean = .1; break;
      case 'reach': aL = -.3; aR = -2.4 + .2 * Math.sin(2 * t + p.phase); break;
      case 'load':  aL = -1.3 + .2 * Math.sin(3 * t + p.phase); aR = -1.3 + .2 * Math.sin(3 * t + p.phase + 1.5); lean = .22; break;
      case 'fold':  aL = -1.0 + .5 * Math.max(0, Math.sin(2.2 * t + p.phase)); aR = -1.0 + .5 * Math.max(0, Math.sin(2.2 * t + p.phase + .4)); lean = .1; break;
      case 'mop':   aL = -.7 + .25 * Math.sin(3 * t); aR = -.5 + .25 * Math.sin(3 * t); lean = .1; p.body.rotation.y = .35 * Math.sin(3 * t); break;
      case 'eat': { const bite = .16 * Math.max(0, Math.sin(2.6 * t + p.phase)); aL = aR = -1.1 - bite; break; }
    }
    p.armL.rotation.x = aL; p.armR.rotation.x = aR;
    p.legL.rotation.x = seated ? -1.4 : swing;
    p.legR.rotation.x = seated ? -1.4 : -swing;
    p.body.position.y = seated ? .02 : bob;
    p.body.position.z = seated ? -.02 : 0;
    p.body.rotation.x = lean;
    if (anim !== 'mop' || moving) p.body.rotation.y = 0;
    p.body.rotation.z = !moving && !seated ? .02 * Math.sin(1.3 * t + p.phase) : 0;
    p.root.scale.setScalar(Math.max(1e-4, p.grow < 1 ? 1 - Math.pow(1 - p.grow, 3) : 1));
  }
  let doorAngle = 0;
  function updateDoor(dt) {
    const near = people.some(p => Math.abs(p.pos.x - R.x1) < .55 && p.pos.z > R.door.z0 - .2 && p.pos.z < R.door.z1 + .2);
    doorAngle += ((near ? -1.35 : 0) - doorAngle) * (1 - Math.exp(-dt / .14));
    doorPivot.rotation.y = doorAngle;
  }

  // ───────────────────────────────────────────────────────────── city ──
  const CITY = { stores: 4, seed: 11, maxHeight: 6.2, ...(cfg.city || {}) };
  const crnd = mulberry(CITY.seed);
  const cr = (a, b) => a + (b - a) * crnd();
  const S = Math.max(R.x1 - R.x0, R.z1 - R.z0) / 6;
  const SW = 1.4 * S, WALK = .6 * S;
  const lotX = [R.x0 - 1.3 * S, PORCH.x1 + .65 * S], lotZ = [R.z0 - 1.5 * S, R.z1 + 1.6 * S];
  const PX = 5.2 * S, PZ = 4.8 * S;
  const XS = [lotX[0] - SW / 2 - 2 * PX, lotX[0] - SW / 2 - PX, lotX[0] - SW / 2, lotX[1] + SW / 2, lotX[1] + SW / 2 + PX, lotX[1] + SW / 2 + 2 * PX];
  const ZS = [lotZ[0] - SW / 2 - 2 * PZ, lotZ[0] - SW / 2 - PZ, lotZ[0] - SW / 2, lotZ[1] + SW / 2, lotZ[1] + SW / 2 + PZ, lotZ[1] + SW / 2 + 2 * PZ];
  const RC = V((R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2);
  const cityItems = [];
  const citem = (x, y0, z, w, h, d, tone, delay, kind = 'build', tint = null) =>
    cityItems.push({ x, y0, z, w, h, d, tone, delay: clamp01(delay), kind, tint });
  const cityDelay = (x, z) => clamp01(Math.hypot(x - RC.x, z - RC.z) / (20 * S)) * .55 + crnd() * .08;
  const EXT = { x0: XS[0] - 2 * S, x1: XS[5] + 2 * S, z0: ZS[0] - 2 * S, z1: ZS[5] + 2 * S };
  let cityMesh = null, moverMesh = null;
  const movers = [];
  if (hasCity) {
    for (const x of XS) citem(x, -.26, (EXT.z0 + EXT.z1) / 2, SW + .02, .2, EXT.z1 - EXT.z0 - 1.2, 0.07, 0, 'ground');
    for (const z of ZS) citem((EXT.x0 + EXT.x1) / 2, -.26, z, EXT.x1 - EXT.x0 - 1.2, .2, SW + .02, 0.07, 0, 'ground');
    for (const x of XS) for (let z = EXT.z0 + 1; z < EXT.z1 - 1; z += .9)
      if (!ZS.some(zz => Math.abs(z - zz) < SW / 2)) citem(x, -.06, z, .05, .012, .4, 0.95, cityDelay(x, z), 'ground');
    for (const z of ZS) for (let x = EXT.x0 + 1; x < EXT.x1 - 1; x += .9)
      if (!XS.some(xx => Math.abs(x - xx) < SW / 2)) citem(x, -.06, z, .4, .012, .05, 0.95, cityDelay(x, z), 'ground');
    const tower = (cx, cz, w, d, H, tone, delay) => {
      if (H < 1.2) {
        citem(cx, 0, cz, w, H, d, tone, delay); citem(cx, H, cz, w * 1.04, .05, d * 1.04, tone * .78, delay);
        if (crnd() < .5) citem(cx + w * .2, H, cz - d * .15, .3, .18, .3, .6, delay);
        return;
      }
      let y = H * cr(.45, .62), tw = w, td = d;
      citem(cx, 0, cz, tw, y, td, tone, delay);
      for (let f = .55; f < y - .2; f += .55) citem(cx, f, cz, tw * 1.012, .035, td * 1.012, tone * .72, delay);
      const tiers = H > 4.5 ? 2 : 1;
      for (let i = 0; i < tiers; i++) {
        const h = (H - y) * (i === tiers - 1 ? 1 : .62);
        tw *= .72; td *= .72;
        citem(cx, y, cz, tw * 1.08, .06, td * 1.08, tone * .8, delay);
        citem(cx, y, cz, tw, h, td, tone, delay);
        for (let f = y + .55; f < y + h - .2; f += .55) citem(cx, f, cz, tw * 1.012, .035, td * 1.012, tone * .72, delay);
        y += h;
      }
      citem(cx, H - .05, cz, tw * 1.07, .08, td * 1.07, .62, delay);
      if (H > 4 && crnd() < .55) citem(cx, H, cz, .06, cr(.6, 1.1), .06, .5, delay);
      else citem(cx + tw * .2, H, cz, .28, .25, .28, .6, delay);
    };
    const tree = (x, z, delay) => { citem(x, 0, z, .07, .22, .07, .4, delay); citem(x, .2, z, .36, .3, .36, cr(.42, .55), delay); citem(x, .5, z, .24, .14, .24, cr(.45, .6), delay); };
    const otherStore = (cx, cz, w, d, delay) => {
      const sw = Math.min(3, w * .85), sd = Math.min(2.4, d * .8);
      citem(cx, 0, cz, sw, .95, sd, .92, delay); citem(cx, .95, cz, sw + .08, .1, sd + .08, .8, delay);
      citem(cx + .6, 1.05, cz - .3, .7, .22, .5, .7, delay); citem(cx + sw / 2 + .02, .6, cz, .04, .16, sd * .5, .2, delay);
      citem(cx - sw * .3, 1.05, cz - sd * .3, .32, 2.1, .32, 1, delay, 'build', MARKER);
    };
    const blocks = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) blocks.push([i, j]);
    const candidates = blocks.filter(([i, j]) => !(i === 2 && j === 2) && Math.abs(i - 2) + Math.abs(j - 2) <= 3);
    const storeSet = new Set();
    while (storeSet.size < Math.min(CITY.stores, candidates.length)) storeSet.add(candidates[(crnd() * candidates.length) | 0].join(','));
    for (const [i, j] of blocks) {
      const x0 = XS[i] + SW / 2, x1 = XS[i + 1] - SW / 2, z0 = ZS[j] + SW / 2, z1 = ZS[j + 1] - SW / 2;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, q = (cx - RC.x) + (cz - RC.z);
      if (Math.abs(((cx - RC.x) - (cz - RC.z)) * .7071) > 15 * S) continue;
      const home = i === 2 && j === 2, del = cityDelay(cx, cz);
      citem(cx, -.16, cz, x1 - x0, home ? .15 : .18, z1 - z0, 0.93, del, 'ground');
      citem(cx, home ? -.01 : .02, cz, x1 - x0 + .02, .02, z1 - z0 + .02, 0.7, del, 'ground');
      if (home) {
        for (let x = R.x0 + .5; x < R.x1; x += 1.25) tree(x, R.z1 + .85 * S, del + .1);
        for (let z = R.z0 + .2; z < R.z1; z += 1.3) tree(R.x0 - .7 * S, z, del + .1);
        continue;
      }
      const ix0 = x0 + WALK, ix1 = x1 - WALK, iz0 = z0 + WALK, iz1 = z1 - WALK;
      for (let x = x0 + .4; x < x1; x += 1.3) if (crnd() < .6) tree(x, z1 - .28, del + .05);
      if (storeSet.has(i + ',' + j)) { otherStore(cx, cz, ix1 - ix0, iz1 - iz0, del); continue; }
      if (crnd() < .1) { for (let k = 0; k < 5; k++) tree(cr(ix0, ix1), cr(iz0, iz1), del); continue; }
      const back = clamp01((-q + 3 * S) / (22 * S));
      const splitX = crnd() < .5, lots = crnd() < .55 ? 2 : 1;
      for (let k = 0; k < lots; k++) {
        let bx0 = ix0, bx1 = ix1, bz0 = iz0, bz1 = iz1;
        if (lots === 2) { if (splitX) { const m = (ix0 + ix1) / 2; k ? bx0 = m + .15 : bx1 = m - .15; } else { const m = (iz0 + iz1) / 2; k ? bz0 = m + .15 : bz1 = m - .15; } }
        const w = (bx1 - bx0) * cr(.75, 1), d = (bz1 - bz0) * cr(.75, 1);
        let H = Math.min(CITY.maxHeight * S, (.5 + 5.6 * Math.pow(back, 1.3)) * S * cr(.6, 1.2));
        if (q > 2 * S) H = cr(.35, .9);             // the near side stays low so it never hides the store
        tower((bx0 + bx1) / 2 + cr(-.1, .1), (bz0 + bz1) / 2 + cr(-.1, .1), w, d, H, crnd() < .15 ? cr(.5, .6) : cr(.78, .9), del + k * .04);
      }
    }
    cityMesh = new THREE.InstancedMesh(GEO, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55 }), cityItems.length);
    cityMesh.castShadow = cityMesh.receiveShadow = true; cityMesh.frustumCulled = false;
    const c = new THREE.Color();
    cityItems.forEach((it, i) => cityMesh.setColorAt(i, it.tint ? c.copy(it.tint) : c.setScalar(it.tone)));
    scene.add(cityMesh);
    for (const [axis, list, span] of [['x', ZS, [EXT.x0, EXT.x1]], ['z', XS, [EXT.z0, EXT.z1]]])
      for (const at of list) {
        for (const lane of [-1, 1]) {
          const n = 2 + ((crnd() * 2) | 0);
          for (let k = 0; k < n; k++) movers.push({ car: true, axis, lane: at + lane * .32 * S, dir: lane, span,
            speed: 1.1 + crnd() * .8, phase: (k + crnd() * .7) / n, tone: crnd() < .5 ? .1 + crnd() * .1 : .75 + crnd() * .2, cab: .55 + crnd() * .35 });
        }
        for (let k = 0; k < 6; k++) movers.push({ car: false, axis, lane: at + (k % 2 ? 1 : -1) * (SW / 2 + .3), dir: crnd() < .5 ? 1 : -1,
          span, speed: .28 + crnd() * .12, phase: crnd(), tone: .25 + crnd() * .35 });
      }
    moverMesh = new THREE.InstancedMesh(GEO, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55 }), movers.length * 2);
    moverMesh.castShadow = true; moverMesh.frustumCulled = false;
    moverMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(moverMesh);
  }
  const tmpO = new THREE.Object3D(), tmpC = new THREE.Color();
  let lastGrow = -1;
  function growCity(f) {
    if (!cityMesh) return;
    cityMesh.visible = f > .001;
    if (Math.abs(f - lastGrow) < 1e-4) return;
    lastGrow = f;
    cityItems.forEach((it, i) => {
      const g = smoother(clamp01((f * 1.6 - it.delay) / .6));
      if (it.kind === 'ground') { tmpO.position.set(it.x, it.y0 + it.h / 2, it.z); tmpO.scale.set(Math.max(1e-4, it.w * g), it.h, Math.max(1e-4, it.d * g)); }
      else { tmpO.position.set(it.x, (it.y0 + it.h / 2) * g, it.z); tmpO.scale.set(it.w, Math.max(1e-4, it.h * g), it.d); }
      tmpO.updateMatrix(); cityMesh.setMatrixAt(i, tmpO.matrix);
    });
    cityMesh.instanceMatrix.needsUpdate = true;
  }
  function updateMovers(t, f) {
    if (!moverMesh) return;
    const g = smoother(clamp01((f - .35) / .5));
    moverMesh.visible = g > .001;
    if (!moverMesh.visible) return;
    let n = 0;
    const put = (x, y, z, w, h, d, tone) => {
      tmpO.position.set(x, y + h / 2 * g, z); tmpO.scale.set(w * g + 1e-4, h * g + 1e-4, d * g + 1e-4);
      tmpO.updateMatrix(); moverMesh.setMatrixAt(n, tmpO.matrix); moverMesh.setColorAt(n, tmpC.setScalar(tone)); n++;
    };
    for (const m of movers) {
      const len = m.span[1] - m.span[0];
      let u = (m.phase + t * m.speed / len) % 1;
      if (m.dir < 0) u = 1 - u;
      const a = m.span[0] + u * len, along = m.axis === 'x';
      const x = along ? a : m.lane, z = along ? m.lane : a;
      if (m.car) { put(x, -.06, z, along ? .8 : .38, .2, along ? .38 : .8, m.tone); put(x, .08, z, along ? .42 : .32, .15, along ? .32 : .42, m.tone * m.cab + .3); }
      else { const bob = .012 * Math.abs(Math.sin(t * 7 + m.phase * 20)); put(x, .02 + bob, z, .12, .3, .1, m.tone); put(x, .32 + bob, z, .1, .1, .1, .15); }
    }
    moverMesh.instanceMatrix.needsUpdate = true;
    if (moverMesh.instanceColor) moverMesh.instanceColor.needsUpdate = true;
  }
  function updateShell(f) {
    if (!hasCity) return;
    const w = smoother(clamp01(f / .35)), r = smoother(clamp01((f - .2) / .35));
    shell.visible = w > .001;
    shellWalls.scale.y = Math.max(1e-4, w);
    shellRoof.visible = r > .001;
    shellRoof.position.y = (1 - r) * (1 - r) * 5;
  }

  // ──────────────────────────────────────────────────────── the passes ──
  const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const frag = `
    uniform sampler2D uScene, uDepth, uMask;
    uniform vec2 uGrid; uniform float uCell;
    uniform float uExposure, uLevels, uMinBlock, uMaxBlock, uBlack, uWhite, uPen;
    uniform vec3 uLight, uDark;
    vec3 toSRGB(vec3 c){ return mix(pow(max(c,vec3(0.)),vec3(1./2.4))*1.055-.055, c*12.92, vec3(lessThanEqual(c,vec3(.0031308)))); }
    // an object's own colour, even on a half-covered edge cell
    vec3 unmix(vec4 c){ return c.rgb / max(c.a, .02); }
    float lumAt(vec4 s){ vec3 c = toSRGB(unmix(s) * uExposure); return dot(c, vec3(.2126,.7152,.0722)); }
    void main(){
      vec2 cell = floor(gl_FragCoord.xy / uCell);
      vec2 uv = (cell + .5) / uGrid, tx = 1. / uGrid;
      vec4 s = texture2D(uScene, uv);
      vec3 col = toSRGB(unmix(s) * uExposure);
      float lum = dot(col, vec3(.2126,.7152,.0722));
      float cov = smoothstep(.3, .72, s.a);
      // washed groups fall back to paper, keeping ghost outlines
      vec4 mk = texture2D(uMask, uv);
      float wash = clamp(mk.r / max(mk.a, .02), 0., 1.) * step(.5, mk.a);
      lum = mix(lum, .97, wash * .92);
      float t = clamp((uWhite - lum) / (uWhite - uBlack), 0., 1.);
      float level = floor(t * uLevels + .5) / uLevels;
      float d0 = texture2D(uDepth, uv).r, minCov = 1., lumStep = 0., depthEdge = 0.;
      for (int k = 0; k < 2; k++) {
        vec2 o = k == 0 ? vec2(tx.x, 0.) : vec2(0., tx.y);
        vec4 a = texture2D(uScene, uv + o), b = texture2D(uScene, uv - o);
        float ca = smoothstep(.3,.72,a.a), cb = smoothstep(.3,.72,b.a);
        minCov = min(minCov, min(ca, cb));
        lumStep = max(lumStep, max(abs(lum - lumAt(a)) * step(.5, ca), abs(lum - lumAt(b)) * step(.5, cb)));
        // compare far and near neighbour, so sloped faces never ink
        float dA = texture2D(uDepth, uv + o).r - d0, dB = texture2D(uDepth, uv - o).r - d0;
        depthEdge = max(depthEdge, step(.0016 + min(abs(dA), abs(dB)) * 2.5, max(dA, dB)));
      }
      float on = step(.5, cov);
      float line = max(on * (1. - step(.5, minCov)), max(depthEdge * on * .85, step(.18, lumStep) * on * .5 * (1. - wash)));
      line *= 1. - wash * .5;
      float shade = max(level, line * uPen), weight = max(level, line);
      vec3 mono = mix(uLight, uDark, shade);
      float peak = max(col.r, max(col.g, col.b));
      float sat = (peak - min(col.r, min(col.g, col.b))) / max(peak, 1e-3);
      float colorAmt = smoothstep(.14, .42, sat) * (1. - wash);
      vec3 outC = mix(mono, col * mix(1., .82, shade), colorAmt);
      weight = max(weight, colorAmt * .8);
      vec2 local = fract(gl_FragCoord.xy / uCell) - .5;
      float half_ = mix(uMinBlock, uMaxBlock, weight) * cov;
      float d = max(abs(local.x), abs(local.y)), aa = fwidth(d) + 1e-5;
      float blk = (1. - smoothstep(half_ - aa, half_ + aa, d)) * step(.001, cov);
      float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
      float idle = (1. - smoothstep(.05 - aa, .05 + aa, d)) * step(.5, h) * .35 * (1. - cov);
      gl_FragColor = vec4(mix(mix(vec3(1.), uLight, .6), outC, step(.001, cov)), max(blk, idle));
    }`;
  const depthTex = new THREE.DepthTexture(1, 1);
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthTexture: depthTex });
  const maskRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const v3 = a => new THREE.Vector3(a[0] / 255, a[1] / 255, a[2] / 255);
  const U = {
    uScene: { value: sceneRT.texture }, uDepth: { value: depthTex }, uMask: { value: maskRT.texture },
    uGrid: { value: new THREE.Vector2(1, 1) }, uCell: { value: look.cellCss * dpr },
    uExposure: { value: look.exposure }, uLevels: { value: look.levels },
    uMinBlock: { value: look.minBlock }, uMaxBlock: { value: look.maxBlock },
    uBlack: { value: look.black }, uWhite: { value: look.white }, uPen: { value: look.pen },
    uLight: { value: v3(look.light) }, uDark: { value: v3(look.dark) },
  };
  const post = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: U, transparent: true, depthTest: false, depthWrite: false }));
  quad.frustumCulled = false; post.add(quad);

  // highlight groups: each step names the groups that stay inked
  const GROUPS = [...new Set([...groupsSeen, 'visitors', 'staff', 'shell'])];
  const wash = Object.fromEntries(GROUPS.map(g => [g, 0]));
  const maskMats = Object.fromEntries(GROUPS.map(g => [g, new THREE.MeshBasicMaterial({ color: 0 })]));
  const maskZero = new THREE.MeshBasicMaterial({ color: 0 });
  function updateWash(step, dt) {
    const show = steps[step]?.show;
    for (const g of GROUPS) {
      const target = !show || g === 'shell' || show.includes(g) ? 0 : 1;
      wash[g] += (target - wash[g]) * (1 - Math.exp(-dt / .22));
      maskMats[g]?.color.setScalar(wash[g]);
    }
  }
  function renderMask() {
    for (const m of tagged) { m.userData.mat = m.material; m.material = maskMats[m.userData.g] || maskZero; }
    const cm = cityMesh?.material, mm = moverMesh?.material;
    if (cityMesh) cityMesh.material = maskZero;
    if (moverMesh) moverMesh.material = maskZero;
    renderer.setRenderTarget(maskRT); renderer.render(scene, camera);
    for (const m of tagged) m.material = m.userData.mat;
    if (cityMesh) cityMesh.material = cm;
    if (moverMesh) moverMesh.material = mm;
  }

  // ──────────────────────────────────────────────────── camera + fit ──
  const ROOM_SHOT = { az: .785, el: .62, ...(cfg.camera || {}) };
  const CITY_SHOT = { az: .785, el: .3, zoom: .4, ...(cfg.city?.camera || {}) };
  const CAM = { dist: 34, focus: new THREE.Vector3(), halfH: 3, shift: 0 };
  let aspect = 1, roomFit = { focus: new THREE.Vector3(), halfH: 3 }, padFrac = 0;
  const lookOff = { x: 0, y: 0, tx: 0, ty: 0 };
  function aimCamera(az, el, focus) {
    camera.position.set(focus.x + Math.sin(az) * Math.cos(el) * CAM.dist, focus.y + Math.sin(el) * CAM.dist, focus.z + Math.cos(az) * Math.cos(el) * CAM.dist);
    camera.lookAt(focus); camera.updateMatrixWorld();
  }
  // frame the room + porch so it fills the free part of the canvas
  function fitRoom() {
    const c0 = V((R.x0 + PORCH.x1) / 2, (R.z0 + R.z1) / 2); c0.y = R.wallH * .3;
    aimCamera(ROOM_SHOT.az, ROOM_SHOT.el, c0);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const p = new THREE.Vector3();
    for (const x of [R.x0 - .1, PORCH.x1]) for (const z of [R.z0 - .1, R.z1 + .1]) for (const y of [-.16, R.wallH]) {
      p.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const focus = c0.clone().addScaledVector(right, (x0 + x1) / 2).addScaledVector(up, (y0 + y1) / 2);
    const usable = 1 - padFrac, m = 1.03 * (cfg.camera?.margin ?? 1);
    roomFit = { focus, halfH: Math.max((y1 - y0) / 2, (x1 - x0) / 2 / (aspect * usable)) * m };
  }
  function place(cityT) {
    const t = smoother(cityT);
    const az = ROOM_SHOT.az + (CITY_SHOT.az - ROOM_SHOT.az) * t + lookOff.x * .09;
    const el = ROOM_SHOT.el + (CITY_SHOT.el - ROOM_SHOT.el) * t + lookOff.y * .04;
    const cityFocus = V(RC.x, RC.z - 1.2 * S); cityFocus.y = 2.4 * S;
    CAM.focus.lerpVectors(roomFit.focus, cityFocus, t);
    const halfH = Math.exp(Math.log(roomFit.halfH) + (Math.log(roomFit.halfH / CITY_SHOT.zoom) - Math.log(roomFit.halfH)) * t);
    aimCamera(az, el, CAM.focus);
    const halfW = halfH * aspect, shift = padFrac * halfW;   // push the picture right of the step list
    camera.left = -halfW - shift; camera.right = halfW - shift; camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    const cell = look.cellCss * dpr, gx = Math.ceil(w * dpr / cell), gy = Math.ceil(h * dpr / cell);
    U.uGrid.value.set(gx, gy); U.uCell.value = cell;
    sceneRT.setSize(gx * 2, gy * 2); maskRT.setSize(gx * 2, gy * 2);
    aspect = w / h;
    padFrac = useUI && w > 900 ? 290 / w : 0;
    fitRoom(); readScroll();
  }

  // ──────────────────────────────────────────────────── scroll + loop ──
  let stepTarget = params.has('step') ? +params.get('step') : 0, cityT = 0;
  function readScroll() {
    if (params.has('step') || !useUI) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    stepTarget = max > 0 ? Math.min(steps.length - 1, Math.floor(scrollY / max * steps.length * .999)) : 0;
  }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', resize);
  addEventListener('pointermove', e => { lookOff.tx = e.clientX / innerWidth - .5; lookOff.ty = e.clientY / innerHeight - .5; });
  const stepEls = [...document.querySelectorAll('.dd-steps li')];
  stepEls.forEach((el, i) => el.addEventListener('click', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTo({ top: (i + .5) / steps.length * max, behavior: 'smooth' });
  }));
  resize();

  const world = { people, route, seats };
  const stats = () => {
    const v = people.filter(p => p.visitor && p.state !== 'gone');
    return { inside: v.length, queued: route.reduce((n, s) => n + (s.list?.length || 0), 0),
             seated: v.filter(p => p.state === 'seated').length, served };
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = +(params.get('speed') || 1);
  let last = performance.now(), T = 0, frameNo = 0, activeStep = -1;
  function frame(now) {
    const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;
    const sdt = (reduced ? dt * .5 : dt) * SPEED;
    T += sdt;
    updateVisitors(sdt, T); updateStaff(sdt); updateDoor(sdt);
    for (const f of ticks) f(T, sdt, world);
    for (const p of people) pose(p, sdt, T);
    const step = Math.max(0, Math.min(steps.length - 1, Math.round(stepTarget)));
    cityT += ((steps[step].city ? 1 : 0) - cityT) * (reduced ? 1 : 1 - Math.exp(-dt / .3));
    if (Math.abs(cityT - (steps[step].city ? 1 : 0)) < 1e-3) cityT = steps[step].city ? 1 : 0;
    updateWash(step, reduced ? 1 : dt);
    growCity(cityT); updateShell(cityT); updateMovers(T, cityT);
    setShadowSpan(cityT > .02 ? 17 * S : Math.max(5, 5 * S));
    lookOff.x += (lookOff.tx - lookOff.x) * (1 - Math.exp(-dt / .5));
    lookOff.y += (lookOff.ty - lookOff.y) * (1 - Math.exp(-dt / .5));
    place(cityT);
    renderMask();
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(post, postCam);
    if (step !== activeStep) { activeStep = step; stepEls.forEach((el, i) => el.classList.toggle('on', i === step)); }
    if (useUI && frameNo++ % 10 === 0) {
      const s = stats();
      for (const el of document.querySelectorAll('[data-dd-stat]')) el.textContent = s[el.dataset.ddStat];
      const hint = document.querySelector('.dd-hint'); if (hint) hint.style.opacity = step > 0 ? 0 : 1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const api = { scene, camera, kit, people, seats, stats, route, get T() { return T; },
    setStep(v) { params.set('step', v); stepTarget = v; } };
  window.__diorama = api;
  return api;
}

// ─────────────────────────────────────────────────────── default ui ──
function injectUI(steps, cfg) {
  const css = `
  :root { --dd-ink:#0b1014; --dd-mute:#8a909c; --dd-accent:${cfg.uiAccent || '#2c63ff'}; --dd-dot:${'#' + new THREE.Color(cfg.accent ?? 0xe09a42).getHexString()}; }
  html, body { margin:0; background:#fff; color:var(--dd-ink); }
  body { font:11px/1.4 ui-monospace,"SF Mono",Menlo,monospace; letter-spacing:.04em; }
  .dd-stage { position:fixed; inset:0; }
  .dd-track { height:${steps.length * 130}vh; }
  .dd-steps { position:fixed; left:12px; top:14px; width:250px; margin:0; padding:8px 8px 0; list-style:none; background:rgba(255,255,255,.88); z-index:2; }
  .dd-steps h1 { font:500 13px/1.3 inherit; margin:0 0 12px; text-transform:uppercase; letter-spacing:.08em; }
  .dd-steps li { padding:9px 0 10px; border-top:1px solid #e3e6ec; color:var(--dd-mute); cursor:pointer; transition:color .3s; }
  .dd-steps li b { font-weight:500; margin-left:10px; text-transform:uppercase; }
  .dd-steps li p { margin:0; max-height:0; overflow:hidden; opacity:0; line-height:1.55; transition:max-height .45s cubic-bezier(.2,.8,.2,1), opacity .3s, margin .3s; }
  .dd-steps li.on { color:var(--dd-ink); } .dd-steps li.on b { color:var(--dd-accent); }
  .dd-steps li.on p { max-height:90px; opacity:1; margin-top:7px; }
  .dd-hud { position:fixed; left:20px; bottom:18px; display:flex; gap:22px; text-transform:uppercase; color:var(--dd-mute); pointer-events:none; }
  .dd-hud b { color:var(--dd-ink); font-weight:500; }
  .dd-hud i { display:inline-block; width:6px; height:6px; background:var(--dd-dot); margin-right:7px; vertical-align:1px; animation:dd-blink 1.6s steps(2) infinite; }
  @keyframes dd-blink { 50% { opacity:.2; } }
  .dd-hint { position:fixed; right:20px; bottom:18px; color:var(--dd-mute); text-transform:uppercase; transition:opacity .4s; pointer-events:none; }
  @media (max-width:700px) { .dd-steps { width:auto; right:12px; } .dd-hud { gap:12px; } .dd-hint { display:none; } }`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const labels = cfg.hud ?? { inside: 'Inside', queued: 'In line', seated: 'Seated', served: 'Served' };
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="dd-stage"></div><div class="dd-track"></div>
    <ol class="dd-steps">${cfg.title ? `<h1>${esc(cfg.title)}</h1>` : ''}${steps.map((s, i) =>
      `<li><span>${String(i + 1).padStart(2, '0')}</span><b>${esc(s.title)}</b><p>${esc(s.body)}</p></li>`).join('')}</ol>
    <div class="dd-hud"><span><i></i>Live</span>${Object.entries(labels).map(([k, l]) => `<span>${esc(l)} <b data-dd-stat="${k}">0</b></span>`).join('')}</div>
    <div class="dd-hint">Scroll ↓</div>`);
}
