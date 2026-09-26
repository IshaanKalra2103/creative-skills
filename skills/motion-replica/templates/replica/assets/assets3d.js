/* Procedural 3D asset kit for motion replicas, built with three.js.
   Classic script (not a module) so pages still open from file:// — local ES-module
   imports are blocked there. Call Assets3D(THREE, addons) from an inline module.

   Builders: Stage (a WebGL layer), makePack (crimped foil pouch), makeBill / makeStack
   ($100 notes), makeBall (basketball), makeWatch (diver's watch), orangeCoin / tokenCoin
   (lathed coins incl. glass-glyph and cel-shaded variants), loadCar / makeCar (any GLB,
   repainted by material name), makeMegapotText (extruded, bevelled digits from a typeface).
   Reskin them: colours, glyphs and textures are all plain parameters or canvas draws. */
window.Assets3D = function (THREE, X) {
  const { RoomEnvironment, GLTFLoader, MeshoptDecoder, FontLoader, TextGeometry, RoundedBoxGeometry } = X;
  const D2R = Math.PI / 180;
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const ss = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  /* ------------------------------------------------------------------
     Stage: one transparent WebGL canvas covering a w×h cell.
     The camera is set so one world unit = one cell pixel at z = 0, so
     DOM layout numbers and 3D positions share one coordinate system.
     Stack several Stages (DOM order = paint order) for depth-of-field
     planes: blur a whole canvas with CSS filter, keep another sharp.
     ------------------------------------------------------------------ */
  class Stage {
    constructor(parent, { w = 1920, h = 1080, fov = 26, exposure = 1, env = 1, before = null } = {}) {
      this.w = w; this.h = h;
      const c = this.canvas = document.createElement('canvas');
      c.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;pointer-events:none`;
      before ? parent.insertBefore(c, before) : parent.appendChild(c);
      const r = this.renderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
      r.setClearColor(0x000000, 0);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.NeutralToneMapping;
      r.toneMappingExposure = exposure;
      r.setSize(w, h, false);
      const pm = new THREE.PMREMGenerator(r);
      this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      pm.dispose();
      this.envIntensity = env;
      this.camera = new THREE.PerspectiveCamera(fov, w / h, 10, 20000);
      this.camera.position.set(0, 0, h / 2 / Math.tan(fov / 2 * D2R));
      this.scene = this.addScene();
      this.root = new THREE.Group(); this.scene.add(this.root);
    }
    addScene() {
      const s = new THREE.Scene();
      s.environment = this.envTex; s.environmentIntensity = this.envIntensity;
      const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-700, 1100, 1400); s.add(key);
      const rim = new THREE.DirectionalLight(0xf2ffe0, 0.55); rim.position.set(900, 250, -500); s.add(rim);
      return s;
    }
    setPixelRatio(pr) { this.renderer.setPixelRatio(pr); this.renderer.setSize(this.w, this.h, false); }
    render(scene = this.scene) { this.renderer.render(scene, this.camera); }
    // cell pixel coords (y down) → world (y up) for this stage's size
    place(o, x, y, z = 0) { o.position.set(x - this.w / 2, this.h / 2 - y, z); }
  }
  // same, for the default 1920×1080 cell
  const place = (o, x, y, z = 0) => o.position.set(x - 960, 540 - y, z);
  // CSS rotateZ(rz) rotateX(rx) rotateY(ry) (degrees, y down) → three.js Euler
  const cssRot = (o, rx, ry, rz) => o.rotation.set(-rx * D2R, ry * D2R, -rz * D2R, 'ZXY');

  /* ------------------------------------------------------------------
     cero pack — pillow surfaces that pinch into crimped, zig-zag ends
     ------------------------------------------------------------------ */
  function makePack() {
    const W = 330, H = 480, CR = 60, D = 62, c = CR / H;
    const skin = text => canvasTex(660, 960, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#93cc22'); gr.addColorStop(0.5, '#b2e63c'); gr.addColorStop(1, '#93cc22');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const ch = h * c;
      // baked shading: darker toward the pinched sides and crimp lines, bright pillow in the middle
      const sh = g.createLinearGradient(0, 0, w, 0);
      sh.addColorStop(0, 'rgba(40,80,0,.34)'); sh.addColorStop(.16, 'rgba(40,80,0,.06)'); sh.addColorStop(.5, 'rgba(255,255,255,.1)'); sh.addColorStop(.84, 'rgba(40,80,0,.06)'); sh.addColorStop(1, 'rgba(40,80,0,.34)');
      g.fillStyle = sh; g.fillRect(0, 0, w, h);
      for (const [y0, y1] of [[ch, ch + h * .1], [h - ch, h - ch - h * .1]]) { const v = g.createLinearGradient(0, y0, 0, y1); v.addColorStop(0, 'rgba(40,80,0,.28)'); v.addColorStop(1, 'rgba(40,80,0,0)'); g.fillStyle = v; g.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0)); }
      for (const y0 of [0, h - ch]) for (let k = 0; k < 8; k++) {
        const y = y0 + ch * (k + 0.5) / 8;
        g.fillStyle = k % 2 ? 'rgba(60,100,0,.08)' : 'rgba(255,255,255,.16)'; g.fillRect(0, y - 3, w, 6);
      }
      if (text) {
        g.save(); g.translate(w / 2 + 6, h * 0.55); g.rotate(-0.075);
        g.font = '900 420px "Roboto Slab"'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(64,104,2,.82)'; g.fillText('cero', 0, 0); g.restore();
      }
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      const n = 11, step = w / n, a = h * 13 / 480;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const x = i * step;
        g.moveTo(x, 0); g.lineTo(x + step, 0); g.lineTo(x + step / 2, a); g.closePath();
        g.moveTo(x, h); g.lineTo(x + step, h); g.lineTo(x + step / 2, h - a); g.closePath();
      }
      g.fill();
    });
    const surf = (v0, v1, sign, yOff = 0) => {
      const nx = 48, ny = Math.max(8, Math.round((v1 - v0) * 96));
      const pos = [], uv = [], idx = [];
      for (let j = 0; j <= ny; j++) {
        const v = v0 + (v1 - v0) * j / ny;
        for (let i = 0; i <= nx; i++) {
          const u = i / nx, bx = Math.pow(Math.sin(Math.PI * u), 0.72);
          const body = ss(c - 0.005, c + 0.3, v) * ss(1 - c + 0.005, 1 - c - 0.3, v);
          const crimp = v < c || v > 1 - c ? 1 : 0;
          const z = D * bx * Math.pow(body, 0.8) + 1.6 * bx + crimp * 1.1 * Math.sin(v * H / (CR / 8) * Math.PI) * bx;
          pos.push((u - 0.5) * W * (0.97 + 0.04 * body), (v - 0.5) * H - yOff, sign * z); uv.push(u, v);
        }
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, cc = a + nx + 1, d = cc + 1;
        sign > 0 ? idx.push(a, b, d, a, d, cc) : idx.push(a, d, b, a, cc, d);
      }
      const gm = new THREE.BufferGeometry();
      gm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      gm.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      gm.setIndex(idx); gm.computeVertexNormals();
      return gm;
    };
    const mat = t => new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.44, clearcoat: 0.4, clearcoatRoughness: 0.28, alphaTest: 0.5 });
    const fm = mat(skin(true)), bm = mat(skin(false));
    const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
    const vTop = 1 - c, yPivot = (vTop - 0.5) * H;
    body.add(new THREE.Mesh(surf(0, vTop, 1), fm), new THREE.Mesh(surf(0, vTop, -1), bm));
    const top = new THREE.Group(); top.position.y = yPivot; group.add(top);
    top.add(new THREE.Mesh(surf(vTop, 1, 1, yPivot), fm), new THREE.Mesh(surf(vTop, 1, -1, yPivot), bm));
    const money = new THREE.Group(); group.add(money);
    [[-72, -8, 9], [0, 6, -3], [72, -6, -12]].forEach(([x, dy, r]) => {
      const s = makeStack(150, 16); s.rotation.set(0, 0, (90 + r) * D2R); s.position.set(x, yPivot - 40 + dy, 0); money.add(s);
    });
    return { group, top, money };
  }

  /* ------------------------------------------------------------------
     $100 notes: curled single bills and banded stacks
     ------------------------------------------------------------------ */
  let BT;
  function billTextures() {
    if (BT) return BT;
    const draw = back => canvasTex(1024, 436, (g, w, h) => {
      const r = rng(back ? 9 : 4);
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#e9ede4'); gr.addColorStop(0.5, '#d6ddd0'); gr.addColorStop(1, '#e3e8de');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const pw = g.createRadialGradient(w * 0.62, h * 0.5, 10, w * 0.62, h * 0.5, w * 0.36);
      pw.addColorStop(0, 'rgba(238,192,166,.5)'); pw.addColorStop(1, 'rgba(238,192,166,0)');
      g.fillStyle = pw; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(105,125,100,.16)'; g.lineWidth = 1.5;
      for (let k = 0; k < 44; k++) { g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * 0.5 + Math.sin(x * 0.02 + k * 0.5) * h * 0.46 * (k / 44); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.strokeStyle = '#8d9b88'; g.lineWidth = 7; g.strokeRect(16, 16, w - 32, h - 32);
      g.strokeStyle = 'rgba(141,155,136,.6)'; g.lineWidth = 3; g.strokeRect(30, 30, w - 60, h - 60);
      g.textAlign = 'center';
      if (!back) {
        const px = w * 0.42, py = h * 0.5;
        g.save(); g.beginPath(); g.ellipse(px, py, w * 0.12, h * 0.36, 0, 0, 7); g.clip();
        const pg = g.createRadialGradient(px, py - 20, 10, px, py, w * 0.14);
        pg.addColorStop(0, '#c5cdc0'); pg.addColorStop(1, '#8c9888'); g.fillStyle = pg; g.fillRect(0, 0, w, h);
        g.fillStyle = '#5d695a'; g.beginPath(); g.ellipse(px, py - 24, w * 0.05, h * 0.16, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(px, py + h * 0.31, w * 0.115, h * 0.21, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(55,65,52,.35)'; g.lineWidth = 2;
        for (let k = -22; k < 22; k++) { g.beginPath(); g.moveTo(px + k * 8, py - h * 0.4); g.lineTo(px + k * 8 + 30, py + h * 0.4); g.stroke(); }
        g.restore();
        g.strokeStyle = '#7a8875'; g.lineWidth = 5; g.beginPath(); g.ellipse(px, py, w * 0.12, h * 0.36, 0, 0, 7); g.stroke();
        g.fillStyle = '#4d7ec8'; g.fillRect(w * 0.6, 0, w * 0.028, h);
        g.fillStyle = 'rgba(255,255,255,.5)'; for (let y = 10; y < h; y += 34) g.fillRect(w * 0.6 + 4, y, w * 0.028 - 8, 10);
        g.fillStyle = '#c88a5c'; g.beginPath(); g.ellipse(w * 0.72, h * 0.53, w * 0.045, h * 0.14, 0, 0, 7); g.fill();
        g.fillStyle = '#70806c'; g.font = '900 78px Inter'; g.textAlign = 'left';
        g.fillText('100', 48, 112); g.fillText('100', 48, h - 44);
        g.fillStyle = '#5b8480'; g.font = '900 124px Inter'; g.textAlign = 'right'; g.fillText('100', w - 46, h - 40);
        g.fillStyle = '#6e7c69'; g.font = '700 24px Inter'; g.textAlign = 'center';
        g.fillText('THE UNITED STATES OF AMERICA', w * 0.5, 62); g.fillText('ONE HUNDRED DOLLARS', w * 0.5, h - 34);
      } else {
        g.fillStyle = '#8e9c89'; g.fillRect(w * 0.33, h * 0.24, w * 0.34, h * 0.5);
        g.fillStyle = '#b8c2b2'; for (let k = 0; k < 9; k++) g.fillRect(w * 0.35 + k * w * 0.035, h * 0.36, w * 0.018, h * 0.34);
        g.fillStyle = '#70806c'; g.font = '900 110px Inter'; g.fillText('100', w * 0.16, h * 0.62); g.fillText('100', w * 0.84, h * 0.62);
        g.font = '700 24px Inter'; g.fillText('IN GOD WE TRUST', w * 0.5, 70);
      }
      for (let k = 0; k < 1600; k++) { g.fillStyle = `rgba(90,100,85,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 2, 2); }
    });
    const f = draw(false), b = draw(true);
    b.wrapS = THREE.RepeatWrapping; b.repeat.x = -1;
    const edge = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#e8ede5'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 3) { g.fillStyle = x % 6 ? '#c7d0c2' : '#f5f7f2'; g.fillRect(x, 0, 1.5, h); } });
    return BT = { f, b, edge };
  }
  function makeBill(w = 156, curl = 0.3) {
    const { f, b } = billTextures();
    const g = new THREE.PlaneGeometry(1, 0.423, 24, 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, curl * (x * x * 1.1 - 0.1) + 0.05 * curl * Math.sin(y * 7 + x * 3)); }
    g.computeVertexNormals();
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: f, roughness: 0.78 })));
    grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: b, roughness: 0.78, side: THREE.BackSide })));
    grp.scale.setScalar(w);
    const o = new THREE.Group(); o.add(grp); return o;
  }
  function makeStack(w = 156, t = 18) {
    const { f, b, edge } = billTextures(), hh = w * 0.423;
    const em = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.85 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, t), [em, em, em, em, new THREE.MeshStandardMaterial({ map: f, roughness: 0.78 }), new THREE.MeshStandardMaterial({ map: b, roughness: 0.78 })]);
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.13, hh + 2, t + 2), new THREE.MeshStandardMaterial({ color: '#d9c89e', roughness: 0.6 }));
    const o = new THREE.Group(); o.add(m, band); return o;
  }

  /* ------------------------------------------------------------------
     basketball — pebbled leather with the eight-panel seam layout
     ------------------------------------------------------------------ */
  function makeBall(r = 90) {
    const seams = (g, w, h) => {
      const line = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i && Math.abs(x - pts[i - 1][0]) < w / 2) ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
      line([[0, h / 2], [w, h / 2]]); line([[w * 0.25, 0], [w * 0.25, h]]); line([[w * 0.75, 0], [w * 0.75, h]]);
      for (const cx of [-1, 1]) {
        const a = 58 * D2R, c = new THREE.Vector3(cx, 0, 0), e1 = new THREE.Vector3(0, 1, 0), e2 = new THREE.Vector3(0, 0, 1), pts = [];
        for (let k = 0; k <= 180; k++) {
          const s = k / 180 * Math.PI * 2;
          const p = c.clone().multiplyScalar(Math.cos(a)).add(e1.clone().multiplyScalar(Math.sin(a) * Math.cos(s))).add(e2.clone().multiplyScalar(Math.sin(a) * Math.sin(s)));
          let phi = Math.atan2(p.z, -p.x); if (phi < 0) phi += Math.PI * 2;
          pts.push([phi / (Math.PI * 2) * w, Math.acos(p.y) / Math.PI * h]);
        }
        line(pts);
      }
    };
    const map = canvasTex(1024, 512, (g, w, h) => {
      const r2 = rng(3); g.fillStyle = '#dd5a1c'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 26000; k++) { g.fillStyle = r2() < 0.5 ? 'rgba(120,35,5,.18)' : 'rgba(255,160,110,.14)'; g.fillRect(r2() * w, r2() * h, 2.2, 2.2); }
      g.strokeStyle = '#1e0b03'; g.lineWidth = 9; seams(g, w, h);
    });
    const bump = canvasTex(1024, 512, (g, w, h) => {
      const r2 = rng(5); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 30000; k++) { g.fillStyle = r2() < 0.5 ? '#9a9a9a' : '#6a6a6a'; g.beginPath(); g.arc(r2() * w, r2() * h, 1.6, 0, 7); g.fill(); }
      g.strokeStyle = '#000'; g.lineWidth = 14; seams(g, w, h);
    }, false);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 72, 48), new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2.2, roughness: 0.72 }));
    m.rotation.set(0.5, 0.7, 0.2); const o = new THREE.Group(); o.add(m); return o;
  }

  /* ------------------------------------------------------------------
     steel diver's watch on a link bracelet
     ------------------------------------------------------------------ */
  function makeWatch() {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: '#e1e4e8', metalness: 1, roughness: 0.18 });
    const brushed = new THREE.MeshStandardMaterial({ color: '#c8cdd3', metalness: 1, roughness: 0.34 });
    const caseM = new THREE.Mesh(new THREE.CylinderGeometry(60, 63, 24, 72), steel); caseM.rotation.x = Math.PI / 2; g.add(caseM);
    const bezelTex = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = '#16181c'; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2);
      for (let k = 0; k < 60; k++) { c.save(); c.rotate(k * Math.PI / 30); c.fillStyle = '#e8e8e8'; k % 5 ? c.fillRect(-2, -250, 4, 16) : c.fillRect(-5, -252, 10, 34); c.restore(); }
      c.fillStyle = '#e8e8e8'; c.beginPath(); c.moveTo(0, -250); c.lineTo(-20, -214); c.lineTo(20, -214); c.fill();
    });
    const bezel = new THREE.Mesh(new THREE.RingGeometry(49, 64, 96), new THREE.MeshStandardMaterial({ map: bezelTex, roughness: 0.25, metalness: 0.2 }));
    bezel.position.z = 12.4; g.add(bezel);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(63.5, 3, 12, 96), steel); edge.position.z = 11; g.add(edge);
    const dialTex = canvasTex(512, 512, (c, w, h) => {
      const rg = c.createRadialGradient(w * 0.4, h * 0.35, 20, w / 2, h / 2, w / 2); rg.addColorStop(0, '#3a3f45'); rg.addColorStop(1, '#16191c');
      c.fillStyle = rg; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2);
      for (let k = 0; k < 12; k++) { c.save(); c.rotate(k * Math.PI / 6); c.fillStyle = '#f4f4ee'; if (k === 0) c.fillRect(-14, -230, 28, 60); else if (k % 3 === 0) c.fillRect(-10, -228, 20, 58); else { c.beginPath(); c.arc(0, -205, 16, 0, 7); c.fill(); } c.restore(); }
      c.fillStyle = '#d9d9d2'; c.font = '600 30px Inter'; c.textAlign = 'center'; c.fillText('CERO', 0, -90);
      c.fillStyle = '#fff'; c.fillRect(150, -18, 44, 36); c.fillStyle = '#111'; c.font = '700 26px Inter'; c.fillText('25', 172, 10);
    });
    const dial = new THREE.Mesh(new THREE.CircleGeometry(49, 72), new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.35, metalness: 0.3 }));
    dial.position.z = 12.2; g.add(dial);
    const white = new THREE.MeshStandardMaterial({ color: '#f5f5f0', metalness: 0.5, roughness: 0.3 });
    const hand = (w, l, rot, z, m = white) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, l, 1.2), m); b.geometry.translate(0, l / 2 - 6, 0); b.rotation.z = rot; b.position.z = z; g.add(b); };
    hand(6, 30, -0.9, 13, white); hand(4.5, 42, 2.1, 13.6, white); hand(1.6, 46, 0.4, 14.2, new THREE.MeshStandardMaterial({ color: '#e04a3a', roughness: 0.4 }));
    const glass = new THREE.Mesh(new THREE.CircleGeometry(50, 72), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.14, roughness: 0, clearcoat: 1 }));
    glass.position.z = 15; g.add(glass);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 12, 24), steel); crown.rotation.z = Math.PI / 2; crown.position.set(68, 0, 2); g.add(crown);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const lug = new THREE.Mesh(new RoundedBoxGeometry(14, 26, 16, 3, 3), steel); lug.position.set(sx * 25, sy * 62, -2); g.add(lug); }
    for (const sy of [-1, 1]) {
      const R = 120;
      for (let k = 0; k < 7; k++) {
        const a = 0.12 + k * 0.2, y = sy * (70 + R * Math.sin(a)), z = -R * (1 - Math.cos(a)) - 2;
        const link = new THREE.Group(); link.position.set(0, y, z); link.rotation.x = -sy * a;
        const mid = new THREE.Mesh(new RoundedBoxGeometry(19, 23, 10, 3, 3.5), steel);
        const l = new THREE.Mesh(new RoundedBoxGeometry(15, 25, 11, 3, 4), brushed); l.position.x = -17.5;
        const r = new THREE.Mesh(new RoundedBoxGeometry(15, 25, 11, 3, 4), brushed); r.position.x = 17.5;
        link.add(mid, l, r); g.add(link);
      }
    }
    const o = new THREE.Group(); o.add(g); return o;
  }

  /* ------------------------------------------------------------------
     coins — lathed body with a raised rim, printed/embossed faces
     ------------------------------------------------------------------ */
  const GLYPH = {
    bnb: g => g.fill(new Path2D('M50 14 64 28 57 35 50 28 43 35 36 28Z M24 40 31 47 24 54 17 47Z M76 40 83 47 76 54 69 47Z M50 40 57 47 50 54 43 47Z M36 60 43 53 50 60 57 53 64 60 50 74Z M30 34 37 41 30 48 23 41Z M70 34 77 41 70 48 63 41Z')),
    poly: g => { g.lineWidth = 11; g.lineJoin = 'round'; g.stroke(new Path2D('M16 50 33 33 50 50 67 67 84 50 67 33 50 50 33 67Z')); },
    op: g => { g.font = '800 44px Inter'; g.textAlign = 'center'; g.fillText('OP', 50, 66); },
    eth: g => g.fill(new Path2D('M50 10 76 52 50 67 24 52Z M50 73 76 58 50 92 24 58Z')),
    sol: g => g.fill(new Path2D('M28 26H80L71 36H19Z M19 45H71L80 55H28Z M28 64H80L71 74H19Z')),
    sq: g => { g.lineWidth = 13; g.beginPath(); g.roundRect(24, 24, 52, 52, 14); g.stroke(); },
    bow: g => g.fill(new Path2D('M16 30c13 0 23 12 34 20 11-8 21-20 34-20 9 0 9 40 0 40-13 0-23-12-34-20-11 8-21 20-34 20-9 0-9-40 0-40Z')),
    none: () => {},
  };
  function faceTex({ bg, glyph, color, emoji, size = 512, stroke }) {
    return canvasTex(size, size, (g, w, h) => {
      if (typeof bg === 'function') bg(g, w, h); else { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
      g.save(); g.scale(w / 100, h / 100); g.fillStyle = g.strokeStyle = color;
      if (stroke) { g.save(); g.strokeStyle = stroke; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; glyph && glyph(g, true); g.restore(); g.strokeStyle = color; }
      glyph && glyph(g, false); g.restore();
      if (emoji) { g.font = `${w * 0.56}px "Apple Color Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, w / 2, h * 0.53); }
    });
  }
  function glyphBump(glyph) {
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.filter = 'blur(5px)';
      g.save(); g.scale(w / 100, h / 100); g.fillStyle = g.strokeStyle = '#fff'; glyph(g, false); g.restore();
    }, false);
  }
  function coinGeo(R, h) {
    const rw = R * 0.11, rh = R * 0.035;
    return new THREE.LatheGeometry([V2(0.01, -h), V2(R - rw, -h), V2(R - rw * 0.7, -h - rh), V2(R - rw * 0.25, -h - rh), V2(R, -h - rh * 0.2),
      V2(R, h + rh * 0.2), V2(R - rw * 0.25, h + rh), V2(R - rw * 0.7, h + rh), V2(R - rw, h), V2(0.01, h)], 120);
  }
  function makeCoin({ d, body, face, faceMat, outline = false, extra = null }) {
    const R = d / 2, h = d * 0.05, geo = coinGeo(R, h);
    const o = new THREE.Group(), inner = new THREE.Group(); inner.rotation.x = Math.PI / 2; o.add(inner);
    inner.add(new THREE.Mesh(geo, body));
    const fg = new THREE.CircleGeometry(R * 0.89 + 0.5, 120);
    const f1 = new THREE.Mesh(fg, faceMat); f1.rotation.x = -Math.PI / 2; f1.position.y = h + 0.3; inner.add(f1);
    const f2 = new THREE.Mesh(fg, faceMat); f2.rotation.x = Math.PI / 2; f2.position.y = -h - 0.3; inner.add(f2);
    if (outline) {
      const hull = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x050808, side: THREE.BackSide }));
      hull.scale.set(1 + 5 / R, 1 + 0.35, 1 + 5 / R); inner.add(hull);
    }
    if (extra) extra(o, R, h);
    o.userData.d = d;
    return o;
  }
  const ORANGE_BG = (g, w, h) => { const rg = g.createRadialGradient(w * 0.34, h * 0.28, 10, w / 2, h / 2, w * 0.62); rg.addColorStop(0, '#ffb45c'); rg.addColorStop(0.55, '#f5823a'); rg.addColorStop(1, '#e45a24'); g.fillStyle = rg; g.fillRect(0, 0, w, h); };
  function orangeCoin(glyphName, d) {
    const body = new THREE.MeshStandardMaterial({ color: '#ec6a2a', metalness: 0.1, roughness: 0.4, envMapIntensity: 0.7 });
    const gl = GLYPH[glyphName];
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex({ bg: ORANGE_BG, glyph: gl, color: '#f9d66b' }), bumpMap: glyphName === 'none' ? null : glyphBump(gl), bumpScale: 3, metalness: 0, roughness: 0.46, envMapIntensity: 0.6 });
    return makeCoin({ d, body, faceMat });
  }
  const TOON_RAMP = (() => { const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  function tokenCoin(kind, d) {
    if (kind === 'cat') {
      return makeCoin({ d, body: new THREE.MeshStandardMaterial({ color: '#dfe2e6', metalness: 1, roughness: 0.22 }),
        faceMat: new THREE.MeshStandardMaterial({ map: faceTex({ bg: '#f8f8f7', emoji: '🐈' }), roughness: 0.4 }) });
    }
    if (kind === 'leaf') {
      const leaf = g => { g.fillStyle = '#4c9a27'; g.fill(new Path2D('M26 72C22 45 38 24 72 20c2 30-14 50-46 52Z')); g.strokeStyle = '#e8f5dc'; g.lineWidth = 4; g.stroke(new Path2D('M28 70C42 55 52 44 66 28')); g.strokeStyle = '#f29a1e'; g.lineWidth = 8; g.setLineDash([6, 4]); g.beginPath(); g.arc(64, 66, 13, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = '#f29a1e'; g.beginPath(); g.arc(64, 66, 5, 0, 7); g.fill(); };
      return makeCoin({ d, body: new THREE.MeshPhysicalMaterial({ color: '#72bd3e', roughness: 0.3, clearcoat: 0.8 }),
        faceMat: new THREE.MeshStandardMaterial({ map: faceTex({ bg: '#f9fbf6', glyph: leaf, color: '#4c9a27' }), roughness: 0.35 }) });
    }
    if (kind === 'pglass') {
      return makeCoin({ d, body: new THREE.MeshStandardMaterial({ color: '#e7e9eb', metalness: 0.85, roughness: 0.28 }),
        faceMat: new THREE.MeshStandardMaterial({ map: faceTex({ bg: (g, w, h) => { const rg = g.createRadialGradient(w * 0.42, h * 0.36, 10, w / 2, h / 2, w * 0.6); rg.addColorStop(0, '#ffffff'); rg.addColorStop(1, '#dcdcdc'); g.fillStyle = rg; g.fillRect(0, 0, w, h); } }), roughness: 0.3, metalness: 0.2 }),
        extra: (o, R, h) => {
          const s = new THREE.Shape(); // slanted glassy "P", 100-unit box
          s.moveTo(34, 16); s.lineTo(44, 72); s.bezierCurveTo(46, 82, 52, 86, 60, 86); s.lineTo(68, 86); s.bezierCurveTo(78, 86, 83, 78, 81, 68);
          s.lineTo(79, 57); s.bezierCurveTo(77, 47, 70, 42, 60, 42); s.lineTo(52, 42); s.lineTo(48, 16); s.closePath();
          const hole = new THREE.Path(); hole.moveTo(54, 54); hole.lineTo(62, 54); hole.bezierCurveTo(67, 54, 69, 57, 70, 62); hole.lineTo(70.6, 66); hole.bezierCurveTo(71, 71, 68, 74, 63, 74); hole.lineTo(57, 74); hole.closePath();
          s.holes.push(hole);
          const eg = new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 6, curveSegments: 24 });
          eg.translate(-57, -51, 0); const k = R * 1.5 / 100; eg.scale(k, k, k);
          const glass = new THREE.MeshPhysicalMaterial({ color: '#b9d3c1', roughness: 0.12, transmission: 0.55, thickness: 22, ior: 1.5, attenuationColor: '#8fb39a', attenuationDistance: 40, clearcoat: 1 });
          const m = new THREE.Mesh(eg, glass); m.position.z = h + 1; o.add(m);
          const m2 = m.clone(); m2.rotation.y = Math.PI; m2.position.z = -h - 1; o.add(m2);
        } });
    }
    // stonk: cel-shaded with ink outlines
    const S = (g, isStroke) => { g.lineWidth = isStroke ? 26 : 14; g.lineCap = 'round'; g.stroke(new Path2D('M66 20C52 14 34 20 36 34c2 12 26 14 28 28 2 14-16 22-32 16')); };
    return makeCoin({ d, outline: true, body: new THREE.MeshToonMaterial({ color: '#9fcddb', gradientMap: TOON_RAMP }),
      faceMat: new THREE.MeshBasicMaterial({ map: faceTex({ bg: (g, w, h) => { g.fillStyle = '#0a1313'; g.fillRect(0, 0, w, h); }, glyph: S, color: '#b8d8e2', stroke: '#000' }) }) });
  }

  /* ------------------------------------------------------------------
     the car (GLB) repainted in lime
     ------------------------------------------------------------------ */
  let CAR;
  // b64 defaults to window.CAR_GLB (a base64 GLB from scripts/prep-glb.sh). The repaint
  // matches material names from the Khronos "CarConcept" model — adjust for other GLBs.
  async function loadCar(b64 = window.CAR_GLB) {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.parseAsync(bytes.buffer, '');
    const car = gltf.scene;
    const paint = new THREE.MeshPhysicalMaterial({ color: '#8fdc22', metalness: 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2d2c', metalness: 0.85, roughness: 0.3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#040505', metalness: 0, roughness: 0.05, clearcoat: 1, envMapIntensity: 0.55 });
    const rubber = new THREE.MeshStandardMaterial({ color: '#141515', roughness: 0.85 });
    car.traverse(o => {
      if (!o.isMesh) return;
      const n = o.material && o.material.name || '';
      if (/^Paint/.test(n)) o.material = paint;
      else if (n === 'Glass') o.material = glass;
      else if (/^Rim/.test(n)) o.material = dark;
      else if (n === 'Tireside') o.material = rubber; // sidewalls carry a trademark logo
      else if (n === 'License') o.visible = false;
    });
    const box = new THREE.Box3().setFromObject(car), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    car.position.sub(ctr);
    const holder = new THREE.Group(); holder.add(car);
    const L = Math.max(size.x, size.z);
    holder.userData.len = L;
    CAR = holder;
    return holder;
  }
  function makeCar(len = 560) {
    const inner = CAR.clone(true); inner.scale.setScalar(len / CAR.userData.len);
    inner.rotation.set(0.38, -0.93, 0.1, 'XYZ');
    const o = new THREE.Group(); o.add(inner); return o;
  }

  /* ------------------------------------------------------------------
     MEGAPOT — extruded, bevelled Rubik Black digits
     ------------------------------------------------------------------ */
  let FONT;
  function makeMegapotText(str = '$1,100,000', size = 330) {
    FONT = FONT || new FontLoader().parse(window.RUBIK_TYPEFACE);
    const mat = [new THREE.MeshPhysicalMaterial({ color: '#b4f24a', roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.18, emissive: '#3c6a00', emissiveIntensity: 0.1 }),
                 new THREE.MeshPhysicalMaterial({ color: '#6fb01a', roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.2 })]; // caps, sides
    const group = new THREE.Group(), chars = [];
    const scale = size / window.RUBIK_TYPEFACE.resolution;
    let x = 0;
    for (const ch of str) {
      const geo = new TextGeometry(ch, { font: FONT, size, depth: 58, curveSegments: 10, bevelEnabled: true, bevelThickness: 18, bevelSize: 10, bevelOffset: 0, bevelSegments: 10 });
      geo.computeBoundingBox(); const bb = geo.boundingBox;
      geo.translate(-(bb.min.x + bb.max.x) / 2, -size * 0.36, -30);
      const adv = window.RUBIK_TYPEFACE.glyphs[ch].ha * scale;
      const piv = new THREE.Group(); piv.position.x = x + adv / 2; piv.add(new THREE.Mesh(geo, mat));
      group.add(piv); chars.push(piv); x += adv + size * 0.015;
    }
    for (const c of chars) c.position.x -= x / 2;
    const o = new THREE.Group(); o.add(group); return { group: o, chars };
  }

  return { Stage, place, cssRot, makePack, makeBill, makeStack, makeBall, makeWatch, orangeCoin, tokenCoin, loadCar, makeCar, makeMegapotText, D2R };
};
