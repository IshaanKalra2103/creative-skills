/* 3D deep explainer — world: dark studio room, long workbench with a ruler rail, station plinths with brass
   nameplates, framed wall screens, ring lights, drifting motes, and a key light that follows the camera.
   DX.world(THREE, A, K, ctx, cfg) -> { update(dt, S, camTarget), plinth(x, w, label), bench } */
(function () {
  "use strict";
  const DX = (window.DX = window.DX || {});

  DX.world = function (THREE, A, K, ctx, cfg) {
    const { M, mesh, RB, CSS } = K;
    const scene = ctx.scene;
    const bench = Object.assign({ x0: -14, x1: 22, depth: 7.2 }, cfg.bench || {});
    const W = { bench };

    // ---------------- lights ----------------
    // hemisphere = ambient fill, warm key with soft shadows (follows the camera target so shadows stay crisp),
    // cool rim from behind for edge separation, cyan practicals along the bench for the "glow" mood.
    scene.add(new THREE.HemisphereLight(0x3d4d5e, 0x0a0806, 0.55));
    const key = new THREE.DirectionalLight(0xffe4c4, 2.1);
    key.position.set(-6, 16, 12); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -8, near: 1, far: 60 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x7fdcff, 0.9); rim.position.set(4, 9, -14); scene.add(rim);
    const fill = new THREE.DirectionalLight(0x9fb4ff, 0.35); fill.position.set(14, 4, 14); scene.add(fill);
    for (let x = bench.x0 + 4; x < bench.x1; x += 18) {
      const p = new THREE.PointLight(0x45e6e0, 6, 12, 2); p.position.set(x, 3.2, 3.5); scene.add(p);
    }

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
      c.strokeStyle = "#0a0b0c"; c.lineWidth = 4; c.strokeRect(0, 0, 512, 512);
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      return t;
    })();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.42, metalness: 0.25, envMapIntensity: 0.6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -6.6; floor.receiveShadow = true; scene.add(floor);

    const wallZ = -15, cx = (bench.x0 + bench.x1) / 2, span = bench.x1 - bench.x0 + 60;
    mesh(new THREE.BoxGeometry(span, 30, 0.5), M.matte, cx, 8, wallZ - 0.25, scene).castShadow = false;
    for (let x = cx - span / 2; x <= cx + span / 2; x += 5) mesh(new THREE.BoxGeometry(0.08, 30, 0.12), M.darker, x, 8, wallZ + 0.04, scene).castShadow = false;
    mesh(new THREE.BoxGeometry(span, 0.25, 0.3), M.dark, cx, 3.6, wallZ + 0.1, scene).castShadow = false;
    mesh(new THREE.BoxGeometry(span, 0.4, 0.4), M.dark, cx, -6.4, wallZ + 0.15, scene).castShadow = false;

    // framed wall screens: pass cfg.wallScreens = [{ x, caption, art(ctx2d, w, h) }] or get abstract defaults
    function wallScreen(x, y, w, h, art, caption) {
      const g = new THREE.Group(); g.position.set(x, y, wallZ + 0.3);
      mesh(RB(w + 0.5, h + 0.5, 0.3, 0.08), M.dark, 0, 0, 0, g);
      const bm = M.glow(CSS.cyan, 1.4);
      [[0, h / 2 + 0.12, w + 0.2, 0.04], [0, -h / 2 - 0.12, w + 0.2, 0.04], [-w / 2 - 0.12, 0, 0.04, h + 0.2], [w / 2 + 0.12, 0, 0.04, h + 0.2]]
        .forEach(([bx, by, bw, bh]) => mesh(new THREE.BoxGeometry(bw, bh, 0.05), bm, bx, by, 0.16, g));
      const tp = K.textPlane(w, h, 110, { renderOrder: 1, brightness: 0.75 });
      tp.mesh.position.z = 0.17; g.add(tp.mesh);
      tp.draw((c, Wp, Hp) => {
        c.fillStyle = "#04070a"; c.fillRect(0, 0, Wp, Hp); art(c, Wp, Hp);
        if (caption) { c.fillStyle = "rgba(69,230,224,.7)"; c.font = `600 ${Hp * 0.08}px Outfit`; c.fillText(caption, Wp * 0.08, Hp * 0.94); }
      });
      scene.add(g);
      return g;
    }
    const teal = (a) => `rgba(69,230,224,${a})`;
    const ARTS = [
      (c, w, h) => { for (let r = 0; r < 8; r++) for (let k = 0; k < 12; k++) { const v = Math.sin(r * 1.7 + k * 0.9) * Math.cos(k * 0.37 + r);
        c.fillStyle = v > 0 ? `rgba(255,140,40,${0.15 + 0.6 * v})` : `rgba(50,120,255,${0.15 - 0.6 * v})`; c.fillRect(w * 0.1 + k * w * 0.067, h * 0.14 + r * h * 0.09, w * 0.06, h * 0.08); } },
      (c, w, h) => { c.strokeStyle = teal(0.85); c.lineWidth = 3; c.beginPath();
        for (let i = 0; i <= 60; i++) { const x = w * 0.08 + i / 60 * w * 0.84, y = h * 0.2 + h * 0.6 * Math.exp(-i / 12) + Math.sin(i * 1.3) * 3; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); },
      (c, w, h) => { [0.61, 0.14, 0.22, 0.03, 0.4].forEach((v, i) => { c.fillStyle = i % 2 ? "rgba(120,130,140,.35)" : teal(0.85); c.fillRect(w * 0.15 + i * w * 0.14, h * 0.78 - v * h * 0.9, w * 0.09, v * h * 0.9); }); },
      (c, w, h) => { const n = 7, s = h * 0.1; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        c.fillStyle = j <= i ? teal(0.15 + 0.7 * Math.abs(Math.sin(i * 3.1 + j))) : "rgba(255,80,100,.18)"; c.fillRect(w * 0.32 + j * s, h * 0.12 + i * s, s - 3, s - 3); } },
    ];
    const screens = cfg.wallScreens || [];
    if (screens.length) screens.forEach((sc, i) => wallScreen(sc.x, sc.y || 8.6, sc.w || 7, sc.h || 4, sc.art || ARTS[i % ARTS.length], sc.caption));
    else for (let x = bench.x0 + 3, i = 0; x < bench.x1; x += 15, i++) wallScreen(x, 8.6, 7, 4, ARTS[i % ARTS.length], "");
    // ring lights on the wall read as bokeh behind the stations
    for (let x = bench.x0 - 2, i = 0; x < bench.x1 + 6; x += 9.5, i++) {
      const r = 0.9 + (i % 3) * 0.15, y = 2.6 + (i % 2) * 0.6;
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 12, 64), M.glow(CSS.cyan, 2.2)); t.position.set(x, y, wallZ + 0.4); scene.add(t);
      const back = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 48), M.darker); back.position.set(x, y, wallZ + 0.35); scene.add(back);
    }
    for (const [x, y] of [[bench.x0 - 4, 10], [bench.x1 + 4, 11], [cx, 13]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), M.glow("#ffc58a", 4)); b.position.set(x, y, wallZ + 1.2); scene.add(b);
    }
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
    plant(bench.x0 - 4, -6, 1.15); plant(bench.x1 + 4, -5, 1.0);

    // ---------------- workbench + rail ----------------
    const bx0 = bench.x0, bx1 = bench.x1, bw = bx1 - bx0, bcx = (bx0 + bx1) / 2;
    mesh(RB(bw, 0.55, bench.depth, 0.12, 3), M.dark, bcx, -0.275, 0, scene);
    mesh(new THREE.BoxGeometry(bw - 0.4, 3.0, bench.depth - 0.6), M.matte, bcx, -2.05, -0.1, scene);
    mesh(new THREE.BoxGeometry(bw - 0.2, 0.06, 0.08), M.brass, bcx, -0.56, bench.depth / 2 + 0.02, scene);
    for (let x = bx0 + 1.5; x < bx1 - 4; x += 6.5) {
      mesh(RB(5.6, 2.1, 0.12, 0.06), M.darker, x + 2.8, -2.0, bench.depth / 2 - 0.33, scene);
      mesh(new THREE.BoxGeometry(0.9, 0.05, 0.02), M.glow(CSS.amber, 1.6), x + 2.8, -3.1, bench.depth / 2 - 0.25, scene);
    }
    mesh(new THREE.BoxGeometry(bw + 2, 0.5, bench.depth + 1), M.darker, bcx, -6.35, -0.1, scene);
    const rodM = new THREE.MeshStandardMaterial({ color: 0x5d636b, metalness: 0.9, roughness: 0.48, envMapIntensity: 0.3 });
    for (const z of [1.55, -1.25]) mesh(new THREE.CylinderGeometry(0.07, 0.07, bw - 1.2, 16).rotateZ(Math.PI / 2), rodM, bcx, 0.07, z, scene).castShadow = false;
    const ruler = (() => {
      const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 64;
      const c = cv.getContext("2d"); c.fillStyle = "#14171b"; c.fillRect(0, 0, 1024, 64);
      for (let i = 0; i <= 100; i++) { const x = i * 10.24; c.fillStyle = i % 10 === 0 ? "#c9cfd6" : "#6b737c"; c.fillRect(x, 0, 2, i % 10 === 0 ? 30 : i % 5 === 0 ? 20 : 12); }
      const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(bw / 5, 1); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    })();
    const rul = new THREE.Mesh(new THREE.PlaneGeometry(bw - 1, 0.42), new THREE.MeshStandardMaterial({ map: ruler, roughness: 0.5, metalness: 0.3 }));
    rul.rotation.x = -Math.PI / 2; rul.position.set(bcx, 0.012, bench.depth / 2 - 0.55); rul.receiveShadow = true; scene.add(rul);
    mesh(new THREE.BoxGeometry(bw - 1, 0.03, 0.05), M.brass, bcx, 0.02, bench.depth / 2 - 0.32, scene);

    // station plinth with an engraved brass nameplate ("01 · SIMILARITY")
    W.plinth = function (x, w, label, d = 3.6, zc = 0.15) {
      const g = new THREE.Group(); g.position.set(x, 0, zc); scene.add(g);
      mesh(RB(w, 0.22, d, 0.07, 3), M.dark, 0, 0.11, 0, g);
      mesh(new THREE.BoxGeometry(w - 0.1, 0.03, 0.05), M.brass, 0, 0.2, d / 2 - 0.03, g);
      const plate = new THREE.Group(); plate.position.set(0, 0.12, d / 2 + 0.03); g.add(plate);
      const pw = Math.min(2.8, w * 0.6);
      mesh(RB(pw, 0.2, 0.05, 0.03), M.brass, 0, 0, 0, plate);
      const tp = K.textPlane(pw, 0.2, 300, { brightness: 0.9 });
      tp.mesh.position.z = 0.03; plate.add(tp.mesh);
      tp.draw((c, Wp, Hp, ppu) => { c.fillStyle = "#1c1206"; c.font = `700 ${0.11 * ppu}px Outfit`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, Wp / 2, Hp / 2 + 2); });
      return g;
    };
    (cfg.stations || []).forEach((st, i) => { if (st.plinth) W.plinth(st.plinth.x, st.plinth.w || 5, `${String(i + 1).padStart(2, "0")} · ${(st.plinth.label || st.name).toUpperCase()}`); });

    // ---------------- motes: drifting dust in the light ----------------
    const NM = 600;
    const mp = new Float32Array(NM * 3), ms = new Float32Array(NM);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < NM; i++) { mp[i * 3] = bx0 - 6 + rnd() * (bw + 12); mp[i * 3 + 1] = -1 + rnd() * 14; mp[i * 3 + 2] = -12 + rnd() * 22; ms[i] = rnd(); }
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

    W.update = function (dt, S, camTarget) {
      key.position.set(camTarget.x - 6, 16, 12); key.target.position.set(camTarget.x, 0, 0); key.target.updateMatrixWorld();
    };
    return W;
  };
})();
