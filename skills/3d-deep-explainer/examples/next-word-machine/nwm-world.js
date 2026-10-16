/* The Next-Word Machine — world: dark studio room, workbench, rail, layer decks, lights, motes, residual stream. */
(function () {
  "use strict";
  const NWMX = (window.NWMX = window.NWMX || {});

  // Station layout along the rail (world x). Data flows left -> right.
  NWMX.LAY = {
    gate: -25.6, gateChips: -23.3,
    emb: -19.4, embC: -15.0,
    plus: -13.3, pos: -11.4, eq: -9.75,
    deckX0: -9.3, deckX1: 18.1,
    zin: -6.2, lens: [-3.6, -2.1, -0.6],
    attn: 4.3,
    concat: 9.75, ffn: 12.55, add: 15.95,
    out: 23.8, loss: 33.2, dec: 44.6, decX0: 39.2, decPitch: 1.2,
    benchX0: -30.5, benchX1: 52.5,
    deckFloor: 0.26, deck2: [6.5, 10.8],
  };

  NWMX.world = function (THREE, A, K, ctx) {
    const { M, mesh, RB, CSS, hdr } = K;
    const LAY = NWMX.LAY;
    const scene = ctx.scene;
    const W = { deck2Y: LAY.deck2[0] };

    // ---------------- lights ----------------
    const hemi = new THREE.HemisphereLight(0x3d4d5e, 0x0a0806, 0.55); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffe4c4, 2.1);
    key.position.set(-6, 16, 12); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 12; sc.bottom = -8; sc.near = 1; sc.far = 60;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    scene.add(key); scene.add(key.target);
    const rim = new THREE.DirectionalLight(0x7fdcff, 0.9); rim.position.set(4, 9, -14); scene.add(rim);
    const fill = new THREE.DirectionalLight(0x9fb4ff, 0.35); fill.position.set(14, 4, 14); scene.add(fill);
    const cyanPts = [];
    for (const x of [-16, 4, 24, 40]) {
      const p = new THREE.PointLight(0x45e6e0, 6, 12, 2); p.position.set(x, 3.2, 3.5); scene.add(p); cyanPts.push(p);
    }
    W.key = key;

    // ---------------- room ----------------
    scene.background = new THREE.Color(0x07090c);
    scene.fog = new THREE.FogExp2(0x07090c, 0.018);
    const floorTex = (() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 512;
      const c = cv.getContext("2d");
      c.fillStyle = "#16181b"; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const v = 20 + ((i + j) % 2) * 4; c.fillStyle = `rgb(${v},${v + 1},${v + 3})`; c.fillRect(i * 256 + 2, j * 256 + 2, 252, 252);
      }
      c.strokeStyle = "#0a0b0c"; c.lineWidth = 4; c.strokeRect(0, 0, 512, 512); c.beginPath(); c.moveTo(256, 0); c.lineTo(256, 512); c.moveTo(0, 256); c.lineTo(512, 256); c.stroke();
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      return t;
    })();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.42, metalness: 0.25, envMapIntensity: 0.6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -6.6; floor.receiveShadow = true; scene.add(floor);

    // back wall: dark panels, seams, molding
    const wallZ = -15;
    const wall = mesh(new THREE.BoxGeometry(140, 30, 0.5), M.matte, 9, 8, wallZ - 0.25, scene); wall.castShadow = false;
    for (let x = -60; x <= 80; x += 5) mesh(new THREE.BoxGeometry(0.08, 30, 0.12), M.darker, x, 8, wallZ + 0.04, scene).castShadow = false;
    mesh(new THREE.BoxGeometry(140, 0.25, 0.3), M.dark, 9, 3.6, wallZ + 0.1, scene).castShadow = false;
    mesh(new THREE.BoxGeometry(140, 0.4, 0.4), M.dark, 9, -6.4, wallZ + 0.15, scene).castShadow = false;

    // framed wall screens with glyph art
    function wallScreen(x, y, w, h, art) {
      const g = new THREE.Group(); g.position.set(x, y, wallZ + 0.3);
      mesh(RB(w + 0.5, h + 0.5, 0.3, 0.08), M.dark, 0, 0, 0, g);
      const bm = M.glow(CSS.cyan, 1.4);
      [[0, h / 2 + 0.12, w + 0.2, 0.04], [0, -h / 2 - 0.12, w + 0.2, 0.04], [-w / 2 - 0.12, 0, 0.04, h + 0.2], [w / 2 + 0.12, 0, 0.04, h + 0.2]]
        .forEach(([bx, by, bw, bh]) => mesh(new THREE.BoxGeometry(bw, bh, 0.05), bm, bx, by, 0.16, g));
      const tp = K.textPlane(w, h, 110, { renderOrder: 1, brightness: 0.75 });
      tp.mesh.position.z = 0.17; g.add(tp.mesh);
      tp.draw((c, Wp, Hp) => { c.fillStyle = "#04070a"; c.fillRect(0, 0, Wp, Hp); art(c, Wp, Hp); });
      scene.add(g);
      return g;
    }
    const teal = "rgba(69,230,224,";
    wallScreen(-19, 8.6, 7, 4, (c, w, h) => { // embedding grid
      for (let r = 0; r < 8; r++) for (let k = 0; k < 12; k++) {
        const v = Math.sin(r * 1.7 + k * 0.9) * Math.cos(k * 0.37 + r);
        c.fillStyle = v > 0 ? `rgba(255,140,40,${0.15 + 0.6 * v})` : `rgba(50,120,255,${0.15 - 0.6 * v})`;
        c.fillRect(w * 0.1 + k * w * 0.067, h * 0.14 + r * h * 0.09, w * 0.06, h * 0.08);
      }
      c.fillStyle = teal + ".7)"; c.font = `600 ${h * 0.08}px Outfit`; c.fillText("E  ·  V × d", w * 0.1, h * 0.94);
    });
    wallScreen(-3, 8.6, 7, 4, (c, w, h) => { // causal attention
      const n = 7, s = h * 0.1, x0 = w * 0.32, y0 = h * 0.12;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        c.fillStyle = j <= i ? teal + (0.15 + 0.7 * Math.abs(Math.sin(i * 3.1 + j))) + ")" : "rgba(255,80,100,.18)";
        c.fillRect(x0 + j * s, y0 + i * s, s - 3, s - 3);
      }
      c.fillStyle = teal + ".7)"; c.font = `600 ${h * 0.08}px Outfit`; c.fillText("softmax(mask(QKᵀ)/√d)", w * 0.08, h * 0.94);
    });
    wallScreen(13, 8.6, 7, 4, (c, w, h) => { // experts / router
      const g = [0.61, 0.14, 0.22, 0.03];
      g.forEach((v, i) => { c.fillStyle = i === 0 || i === 2 ? teal + ".85)" : "rgba(120,130,140,.35)"; c.fillRect(w * 0.2 + i * w * 0.16, h * 0.78 - v * h * 0.9, w * 0.1, v * h * 0.9); });
      c.fillStyle = teal + ".7)"; c.font = `600 ${h * 0.08}px Outfit`; c.fillText("router · top-2 of 4", w * 0.08, h * 0.94);
    });
    wallScreen(29, 8.6, 7, 4, (c, w, h) => { // loss curve
      c.strokeStyle = teal + ".85)"; c.lineWidth = 3; c.beginPath();
      for (let i = 0; i <= 60; i++) { const x = w * 0.08 + i / 60 * w * 0.84; const y = h * 0.2 + h * 0.6 * Math.exp(-i / 12) + Math.sin(i * 1.3) * 3; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
      c.fillStyle = teal + ".7)"; c.font = `600 ${h * 0.08}px Outfit`; c.fillText("NLL ↓   PPL = e^NLL", w * 0.08, h * 0.94);
    });
    // ring lights on the wall (bokeh)
    for (const [x, y, r] of [[-26, 3.0, 1.1], [-11, 2.6, 0.9], [6, 3.2, 1.2], [21, 2.6, 0.9], [37, 3.0, 1.1], [45, 7.5, 0.8]]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 12, 64), M.glow(CSS.cyan, 2.2));
      t.position.set(x, y, wallZ + 0.4); scene.add(t);
      const back = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 48), M.darker); back.position.set(x, y, wallZ + 0.35); scene.add(back);
    }
    // warm practicals far away
    for (const [x, y] of [[-34, 10], [52, 11], [-6, 13], [33, 13.5]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), M.glow("#ffc58a", 4)); b.position.set(x, y, wallZ + 1.2); scene.add(b);
    }
    // wall shelf with props (far left, behind the tokenizer)
    const shelf = new THREE.Group(); shelf.position.set(-36, 0, wallZ + 1.4); scene.add(shelf);
    mesh(new THREE.BoxGeometry(9, 0.18, 1.6), M.dark, 0, 1.2, 0, shelf);
    mesh(new THREE.BoxGeometry(9, 0.18, 1.6), M.dark, 0, 3.6, 0, shelf);
    for (let i = 0; i < 7; i++) mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5 + (i % 3) * 0.25, 20), i % 2 ? M.brassDim : M.darker, -3.6 + i * 1.15, 1.55 + (i % 3) * 0.12, 0, shelf);
    for (let i = 0; i < 5; i++) mesh(RB(0.8, 0.9 + (i % 2) * 0.4, 0.8, 0.05), M.matte, -3 + i * 1.6, 4.15 + (i % 2) * 0.2, 0, shelf);

    // plants (stylised, low-poly) for life at the ends of the bench
    function plant(x, z, s) {
      const g = new THREE.Group(); g.position.set(x, -6.6, z); g.scale.setScalar(s); scene.add(g);
      mesh(new THREE.CylinderGeometry(1.1, 0.85, 2.0, 24), M.matte, 0, 1.0, 0, g);
      const leafM = new THREE.MeshStandardMaterial({ color: 0x24402c, roughness: 0.65, metalness: 0, flatShading: true });
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4, h = 2.4 + (i % 3) * 0.9;
        const leaf = mesh(new THREE.ConeGeometry(0.42, h * 1.4, 5), leafM, Math.cos(a) * 0.5, 2 + h * 0.6, Math.sin(a) * 0.5, g);
        leaf.rotation.z = Math.cos(a) * 0.45; leaf.rotation.x = Math.sin(a) * 0.45;
      }
    }
    plant(-34.5, -6, 1.15); plant(56.5, -5, 1.0);

    // ---------------- workbench ----------------
    const bx0 = LAY.benchX0, bx1 = LAY.benchX1, bw = bx1 - bx0, bcx = (bx0 + bx1) / 2;
    mesh(RB(bw, 0.55, 7.2, 0.12, 3), M.dark, bcx, -0.275, 0, scene);
    mesh(new THREE.BoxGeometry(bw - 0.4, 3.0, 6.6), M.matte, bcx, -2.05, -0.1, scene);
    // front apron with inset panels, brass trim and glowing slits (like the reference console)
    mesh(new THREE.BoxGeometry(bw - 0.2, 0.06, 0.08), M.brass, bcx, -0.56, 3.62, scene);
    for (let x = bx0 + 3; x < bx1 - 2; x += 6.5) {
      mesh(RB(5.6, 2.1, 0.12, 0.06), M.darker, x + 2.8, -2.0, 3.27, scene);
      mesh(new THREE.BoxGeometry(0.9, 0.05, 0.02), M.glow(CSS.amber, 1.6), x + 2.8, -3.1, 3.35, scene);
    }
    mesh(new THREE.BoxGeometry(bw + 2, 0.5, 8.2), M.darker, bcx, -6.35, -0.1, scene);
    // rail: two steel rods + ruler strip with ticks
    const rodM = new THREE.MeshStandardMaterial({ color: 0x5d636b, metalness: 0.9, roughness: 0.48, envMapIntensity: 0.3 });
    for (const z of [1.55, -1.25]) {
      const rod = mesh(new THREE.CylinderGeometry(0.07, 0.07, bw - 1.2, 16).rotateZ(Math.PI / 2), rodM, bcx, 0.07, z, scene);
      rod.castShadow = false;
    }
    const ruler = (() => {
      const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 64;
      const c = cv.getContext("2d"); c.fillStyle = "#14171b"; c.fillRect(0, 0, 1024, 64);
      for (let i = 0; i <= 100; i++) { const x = i * 10.24; c.fillStyle = i % 10 === 0 ? "#c9cfd6" : "#6b737c"; c.fillRect(x, 0, 2, i % 10 === 0 ? 30 : i % 5 === 0 ? 20 : 12); }
      const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(bw / 5, 1); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    })();
    const rul = new THREE.Mesh(new THREE.PlaneGeometry(bw - 1, 0.42), new THREE.MeshStandardMaterial({ map: ruler, roughness: 0.5, metalness: 0.3 }));
    rul.rotation.x = -Math.PI / 2; rul.position.set(bcx, 0.012, 3.05); rul.receiveShadow = true; scene.add(rul);
    mesh(new THREE.BoxGeometry(bw - 1, 0.03, 0.05), M.brass, bcx, 0.02, 3.28, scene);

    // station plinths with engraved brass nameplates
    function plinth(x, w, label, d = 3.6, zc = 0.15) {
      const g = new THREE.Group(); g.position.set(x, 0, zc); scene.add(g);
      mesh(RB(w, 0.22, d, 0.07, 3), M.dark, 0, 0.11, 0, g);
      mesh(new THREE.BoxGeometry(w - 0.1, 0.03, 0.05), M.brass, 0, 0.2, d / 2 - 0.03, g);
      const plate = new THREE.Group(); plate.position.set(0, 0.12, d / 2 + 0.03); g.add(plate);
      mesh(RB(Math.min(2.6, w * 0.6), 0.2, 0.05, 0.03), M.brass, 0, 0, 0, plate);
      const tp = K.textPlane(Math.min(2.6, w * 0.6), 0.2, 300, { brightness: 0.9 });
      tp.mesh.position.z = 0.03; plate.add(tp.mesh);
      tp.draw((c, Wp, Hp, ppu) => { c.fillStyle = "#1c1206"; c.font = `700 ${0.11 * ppu}px Outfit`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, Wp / 2, Hp / 2 + 2); });
      return g;
    }
    plinth(LAY.gate + 1.2, 5.4, "01 · TOKENIZER GATE");
    plinth(LAY.emb + 1.8, 8.0, "02 · EMBEDDING CABINET");
    plinth(LAY.pos - 0.3, 4.2, "03 · POSITION");
    plinth(LAY.out + 0.6, 9.4, "08 · OUTPUT HEAD  W_o");
    plinth(LAY.loss, 7.6, "09 · LOSS & PERPLEXITY");
    plinth(LAY.dec + 0.6, 14.4, "10 · DECODER + KV CACHE");

    // ---------------- layer decks (layer 1 on the rail, layer 2 stacked above) ----------------
    const dx0 = LAY.deckX0, dx1 = LAY.deckX1, dw = dx1 - dx0, dcx = (dx0 + dx1) / 2;
    const deck1 = new THREE.Group(); scene.add(deck1);
    mesh(RB(dw, LAY.deckFloor, 5.2, 0.06, 3), M.dark, dcx, LAY.deckFloor / 2, 0, deck1);
    mesh(new THREE.BoxGeometry(dw - 0.2, 0.04, 0.05), M.brass, dcx, LAY.deckFloor - 0.01, 2.6, deck1);
    const deck2 = new THREE.Group(); scene.add(deck2);
    const d2frame = mesh(RB(dw, 0.2, 5.2, 0.06, 3), M.dark, dcx, -0.1, 0, deck2);
    d2frame.scale.set(1, 1, 1);
    const d2glass = new THREE.Mesh(new THREE.BoxGeometry(dw - 1.2, 0.05, 4.2), new THREE.MeshPhysicalMaterial({ color: 0x0e1820, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 1.3 }));
    d2glass.position.set(dcx, 0.02, 0); deck2.add(d2glass);
    mesh(new THREE.BoxGeometry(dw - 0.2, 0.04, 0.05), M.brass, dcx, 0.01, 2.6, deck2);
    // the deck-2 frame is a hollow ring: carve by overlaying the glass (frame mainly visible at edges)
    d2frame.scale.set(1, 1, 1);
    // nameplates
    function deckPlate(group, y, text) {
      const plate = new THREE.Group(); plate.position.set(dx0 + 1.9, y, 2.64); group.add(plate);
      mesh(RB(2.8, 0.22, 0.05, 0.03), M.brass, 0, 0, 0, plate);
      const tp = K.textPlane(2.8, 0.22, 300, { brightness: 0.9 }); tp.mesh.position.z = 0.03; plate.add(tp.mesh);
      tp.draw((c, Wp, Hp, ppu) => { c.fillStyle = "#1c1206"; c.font = `800 ${0.12 * ppu}px Outfit`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, Wp / 2, Hp / 2 + 2); });
    }
    deckPlate(deck1, 0.12, "LAYER 1  ·  BLOCK z¹");
    deckPlate(deck2, -0.08, "LAYER 2  ·  BLOCK z²");
    // telescoping brass posts between the decks
    const posts = [];
    for (const x of [dx0 + 0.3, dcx - 4.2, dx1 - 0.3]) for (const z of [-2.35]) {
      const outer = mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 16), M.brass, x, 0, z, scene);
      const inner = mesh(new THREE.CylinderGeometry(0.065, 0.065, 1, 16), M.steel, x, 0, z, scene);
      const collar = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 20), M.brassDim, x, 0, z, scene);
      posts.push({ outer, inner, collar });
    }
    W.deck1 = deck1; W.deck2 = deck2;

    // ---------------- residual stream (glowing rail through both layers) ----------------
    const resid = new K.Beam(CSS.cyan, { density: 22, speed: 0.35, intensity: 2.6, opacity: 0.95, segs: 400, radial: 10 });
    const residHalo = new K.Beam(CSS.cyan, { density: 22, speed: 0.35, intensity: 0.55, opacity: 0.35, segs: 400, radial: 10 });
    scene.add(resid, residHalo);
    const zr = -2.05;
    function residCurve(d2) {
      const y1 = LAY.deckFloor + 0.45, y2 = d2 + 0.45;
      const P = (x, y, z) => new THREE.Vector3(x, y, z);
      return new THREE.CatmullRomCurve3([
        P(LAY.eq + 0.2, 0.55, -0.6), P(dx0 + 0.6, y1, zr + 0.4), P(dx0 + 1.5, y1, zr), P(dcx, y1, zr), P(dx1 - 1.2, y1, zr),
        P(dx1 + 0.4, y1 + 0.6, zr - 0.6), P(dx1 + 0.6, (y1 + y2) / 2, zr - 1.1), P(dx1 - 0.6, y2 - 0.6, zr - 1.3),
        P(dcx, y2 - 0.5, zr - 1.4), P(dx0 + 0.2, y2 - 0.3, zr - 1.2), P(dx0 + 0.3, y2, zr - 0.4), P(dx0 + 1.5, y2, zr),
        P(dcx, y2, zr), P(dx1 - 1.2, y2, zr), P(dx1 + 0.6, y2 - 0.6, zr + 0.2), P(dx1 + 1.4, (y2 + 2) / 2, -0.8),
        P(LAY.out - 4.4, 2.2, -0.2), P(LAY.out - 3.6, 2.0, 0),
      ], false, "catmullrom", 0.35);
    }
    let lastD2 = -1;
    function updateResid() {
      if (Math.abs(lastD2 - W.deck2Y) < 1e-3) return;
      lastD2 = W.deck2Y;
      const c = residCurve(W.deck2Y);
      resid.setCurve(c, 0.05); residHalo.setCurve(c, 0.13);
      W.residCurve = c;
    }
    W.resid = resid;

    // ---------------- motes (drifting dust in the light) ----------------
    const NM = 700;
    const mp = new Float32Array(NM * 3), ms = new Float32Array(NM);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < NM; i++) { mp[i * 3] = -34 + rnd() * 90; mp[i * 3 + 1] = -1 + rnd() * 14; mp[i * 3 + 2] = -12 + rnd() * 22; ms[i] = rnd(); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3)); mg.setAttribute("aS", new THREE.BufferAttribute(ms, 1));
    const motes = new THREE.Points(mg, new THREE.ShaderMaterial({
      uniforms: { uTime: K.timeU, uTex: { value: K.dotTexture() }, uPR: { value: Math.min(2, window.devicePixelRatio || 1) } },
      vertexShader: `attribute float aS; uniform float uTime; uniform float uPR; varying float vA; varying float vS;
        void main(){ vec3 p = position; float t = uTime * (0.05 + 0.08 * aS);
          p.x += sin(t + aS * 40.0) * 0.8; p.y += sin(t * 0.7 + aS * 17.0) * 0.6 + mod(uTime * 0.04 * aS, 1.0); p.z += cos(t * 0.9 + aS * 23.0) * 0.7;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uPR * (14.0 + 26.0 * aS) / -mv.z; vA = 0.25 + 0.75 * abs(sin(uTime * 0.6 + aS * 30.0)); vS = aS; }`,
      fragmentShader: `uniform sampler2D uTex; varying float vA; varying float vS;
        void main(){ vec4 t = texture2D(uTex, gl_PointCoord); vec3 c = mix(vec3(1.0, 0.82, 0.6), vec3(0.4, 0.95, 0.92), step(0.55, vS));
          gl_FragColor = vec4(c * 0.9, t.a * vA * 0.32); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    motes.frustumCulled = false; scene.add(motes);

    // ---------------- per-frame ----------------
    W.update = function (dt, S, camTarget) {
      W.deck2Y = K.lerp(LAY.deck2[0], LAY.deck2[1], S.explodeAmt);
      deck2.position.y = W.deck2Y;
      posts.forEach((p) => {
        const h = W.deck2Y - LAY.deckFloor - 0.2;
        p.outer.scale.y = h * 0.52; p.outer.position.y = LAY.deckFloor + h * 0.26;
        p.inner.scale.y = h; p.inner.position.y = LAY.deckFloor + h * 0.5;
        p.collar.position.y = LAY.deckFloor + h * 0.52;
      });
      updateResid();
      // the shadow-casting key light follows the area we look at
      key.position.set(camTarget.x - 6, 16, 12); key.target.position.set(camTarget.x, 0, 0); key.target.updateMatrixWorld();
    };
    updateResid();
    return W;
  };
})();
