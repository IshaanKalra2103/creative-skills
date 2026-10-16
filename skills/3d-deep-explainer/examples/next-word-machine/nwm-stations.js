/* The Next-Word Machine — the ten stations. Each station: build hardware, setData(R), enter(), update(dt, S). */
(function () {
  "use strict";
  const NWMX = (window.NWMX = window.NWMX || {});

  NWMX.stations = function (THREE, A, K, ctx, W) {
    const { M, mesh, RB, CSS, COL, hdr, seg, ease, clamp, lerp, damp, fmt, MatrixDisplay, TokenChip, Beam, Rays, Dial, tag, textPlane, FONT, MONO } = K;
    const LAY = NWMX.LAY;
    const scene = ctx.scene;
    const V = ctx.DATA.vocab;
    const VOC = V.length;
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const subs = "₀₁₂₃₄₅₆₇₈₉";
    const sub = (n) => String(n).split("").map((d) => subs[+d]).join("");
    const hover = ctx.hover;

    // a small stand (dark foot + two brass posts) that holds a floating display
    function stand(parent, x, z, yTop, w = 1.6) {
      const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
      mesh(RB(w + 0.3, 0.12, 0.7, 0.04), M.dark, 0, 0.06, 0, g);
      for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.035, 0.035, Math.max(0.05, yTop - 0.12), 10), M.brass, sx * w / 2, (yTop + 0.12) / 2, 0, g);
      return g;
    }
    function glyph(parent, kind, x, y, z, color = CSS.cyan, s = 0.34) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      const m = new THREE.MeshBasicMaterial({ color: hdr(color, 2.6), toneMapped: false });
      if (kind === "+") { mesh(new THREE.BoxGeometry(s, s * 0.22, 0.06), m, 0, 0, 0, g); mesh(new THREE.BoxGeometry(s * 0.22, s, 0.06), m, 0, 0, 0, g); }
      else if (kind === "=") { mesh(new THREE.BoxGeometry(s, s * 0.18, 0.06), m, 0, s * 0.2, 0, g); mesh(new THREE.BoxGeometry(s, s * 0.18, 0.06), m, 0, -s * 0.2, 0, g); }
      else if (kind === "Σ") { const t = textPlane(0.6, 0.6, 200); t.draw((c, w, h) => { c.fillStyle = color; c.font = `700 ${h * 0.8}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("Σ", w / 2, h / 2); }); g.add(t.mesh); }
      g.userData.mat = m;
      return g;
    }
    const regHover = (display) => hover.push({ obj: display.cells, info: (hit) => display.hover(hit.instanceId) });

    /* ===================================================================== S1 TOKENIZER GATE */
    const gate = (() => {
      const S1 = { id: 1 };
      const g = new THREE.Group(); g.position.set(LAY.gate, 0.22, 0.2); scene.add(g);
      const frame = new THREE.Group(); g.add(frame);
      mesh(RB(0.6, 0.28, 2.7, 0.06), M.dark, 0, 0.14, 0, frame);
      for (const z of [-1.08, 1.08]) {
        mesh(RB(0.28, 3.4, 0.28, 0.06), M.dark, 0, 1.84, z, frame);
        mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 24), M.brass, 0, 3.6, z, frame);
        mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 24), M.brass, 0, 0.33, z, frame);
      }
      mesh(RB(0.36, 0.26, 2.56, 0.06), M.dark, 0, 3.5, 0, frame);
      const pane = mesh(new THREE.BoxGeometry(0.05, 2.9, 1.86), M.glass, 0, 1.86, 0, frame); pane.renderOrder = 3; pane.castShadow = false;
      const em = M.glow(CSS.cyan, 2.4);
      for (const [y, h, z, d] of [[0.42, 0.03, 0, 1.86], [3.3, 0.03, 0, 1.86], [1.86, 2.9, 0.93, 0.03], [1.86, 2.9, -0.93, 0.03]]) mesh(new THREE.BoxGeometry(0.06, h, d), em, 0, y, z, frame).castShadow = false;
      for (const y of [0.55, 3.15]) for (const z of [-0.8, 0.8]) mesh(new THREE.SphereGeometry(0.05, 12, 8), M.brass, 0.05, y, z, frame);
      // scanning line
      const scan = mesh(new THREE.BoxGeometry(0.08, 0.025, 1.8), M.glow(CSS.cyan, 4), 0.02, 1.8, 0, frame); scan.castShadow = false;
      // raw string ribbon
      const ribbon = textPlane(4.6, 0.62, 260, { renderOrder: 7 });
      ribbon.mesh.position.set(-3.4, 1.86, 0.35); g.add(ribbon.mesh);
      // token chips + id badges
      const chips = [], badges = [];
      for (let i = 0; i < 10; i++) {
        const c = new TokenChip("…", { color: CSS.cyan }); c.visible = false; g.add(c); chips.push(c);
        const b = textPlane(1.0, 0.3, 300); b.mesh.visible = false; g.add(b.mesh); badges.push(b);
      }
      const chipX = 2.3, rowY = (i, n) => 0.62 + (n - 1 - i) * 0.47;
      const t1 = tag("Tokenizer gate", "split · look up ids", { stages: [1], cy: 1 }); t1.position.set(0, 3.9, 0); g.add(t1);
      const t2 = tag("raw string", "", { stages: [1], dot: CSS.amber, cy: 1 }); t2.position.set(-3.4, 2.35, 0.35); g.add(t2);
      const t3 = tag("tokens → integer ids", "", { stages: [1], cy: 1 }); g.add(t3);
      S1.tau = 99; S1.words = []; S1.ids = [];
      S1.setData = (R) => {
        const words = R.words, ids = R.ids;
        const changed = words.join(" ") !== S1.words.join(" ");
        S1.words = words; S1.ids = ids;
        const raw = words.filter((w) => w !== "<s>").join(" ");
        ribbon.draw((c, Wp, Hp, ppu) => {
          c.font = `600 ${0.26 * ppu}px ${FONT}`;
          const tw = Math.min(Wp - 20, c.measureText("“" + raw + "”").width + 0.5 * ppu);
          const x0 = (Wp - tw) / 2;
          K.roundRect(c, x0, 0.08 * ppu, tw, Hp - 0.16 * ppu, (Hp - 0.16 * ppu) / 2);
          c.fillStyle = "rgba(10,14,18,0.85)"; c.fill(); c.strokeStyle = CSS.amber; c.lineWidth = 0.02 * ppu; c.stroke();
          c.fillStyle = "#f4f7fa"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("“" + raw + "”", Wp / 2, Hp / 2 + 2);
        });
        const n = words.length;
        for (let i = 0; i < 10; i++) {
          const on = i < n;
          chips[i].visible = on; badges[i].mesh.visible = on;
          if (!on) continue;
          chips[i].setWord(words[i]);
          chips[i].setGlow(words[i] === "<s>" ? CSS.amber : CSS.cyan, 2.2);
          badges[i].draw((c, Wp, Hp, ppu) => {
            c.font = `600 ${0.16 * ppu}px ${MONO}`; c.textBaseline = "middle"; c.textAlign = "left";
            c.fillStyle = "#7d8894"; c.fillText("id", 0.02 * ppu, Hp / 2);
            c.fillStyle = CSS.cyan; c.font = `700 ${0.2 * ppu}px ${MONO}`; c.fillText(String(ids[i]), 0.26 * ppu, Hp / 2);
          });
        }
        t3.position.set(chipX + 0.4, rowY(0, n) + 0.42, 0);
        if (changed) S1.tau = 99;
      };
      S1.enter = (d = 0) => { S1.tau = -d; };
      S1.update = (dt, S) => {
        S1.tau += dt;
        const t = S1.tau, n = S1.words.length;
        const rib = ease.inOut(seg(t, 0.1, 1.5));
        ribbon.mesh.position.x = lerp(-3.6, -0.4, rib);
        ribbon.mat.opacity = 1 - seg(t, 1.0, 1.6);
        ribbon.mesh.visible = ribbon.mat.opacity > 0.01;
        const sweep = seg(t, 0.9, 1.9);
        scan.position.y = lerp(0.5, 3.2, sweep); scan.visible = sweep > 0 && sweep < 1;
        const ex = S.explodeAmt;
        frame.position.x = -0.2 * ex;
        for (let i = 0; i < n; i++) {
          const k = ease.out(seg(t, 1.2 + i * 0.13, 2.0 + i * 0.13));
          const c = chips[i];
          const tx = chipX + ex * 0.3, ty = rowY(i, n) + Math.sin(S.time * 1.4 + i) * 0.015;
          c.position.set(lerp(0, tx, k), lerp(1.86, ty, k), lerp(0, 0, k));
          c.scale.setScalar(lerp(0.25, 1, k));
          c.visible = k > 0.001;
          const bx = tx + c.w / 2 + 0.55;
          badges[i].mesh.position.set(bx, ty, 0.05);
          badges[i].mat.opacity = seg(t, 2.2 + i * 0.08, 2.7 + i * 0.08);
        }
      };
      S1.focus = () => ({ target: v3(LAY.gate + 1.3, 1.9, 0.2), pos: v3(LAY.gate - 2.2, 3.9, 12.6) });
      return S1;
    })();

    /* ===================================================================== S2 EMBEDDING CABINET */
    const cabinet = (() => {
      const S2 = { id: 2 };
      const g = new THREE.Group(); g.position.set(LAY.emb, 0.22, -0.55); scene.add(g);
      const pitch = 0.41, H = VOC * pitch + 0.5, Wd = 2.55;
      const body = new THREE.Group(); g.add(body);
      mesh(RB(Wd, H, 1.7, 0.06), M.dark, 0, H / 2 + 0.25, 0, body);
      mesh(RB(Wd + 0.3, 0.26, 1.95, 0.06), M.darker, 0, 0.13, 0, body);
      mesh(RB(Wd + 0.3, 0.32, 1.95, 0.06), M.brassDim, 0, H + 0.4, 0, body);
      for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.05, H, 0.05), M.brass, sx * (Wd / 2 + 0.01), H / 2 + 0.25, 0.86, body);
      const crest = textPlane(2.6, 0.3, 300, { brightness: 0.95 }); crest.mesh.position.set(0, H + 0.4, 0.985); body.add(crest.mesh);
      crest.draw((c, Wp, Hp, ppu) => { c.fillStyle = "#1c1206"; c.font = `800 ${0.15 * ppu}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(`E  ·  V × d = ${VOC} × 8`, Wp / 2, Hp / 2 + 2); });
      const drawers = [];
      const cellG = RB(1, 1, 1, 0.12, 2);
      for (let id = 0; id < VOC; id++) {
        const d = new THREE.Group();
        const y = 0.25 + 0.25 + (VOC - 1 - id) * pitch + pitch / 2;
        d.position.set(0, y, 0.85); g.add(d);
        mesh(RB(Wd - 0.22, pitch - 0.06, 0.08, 0.03), M.dark, 0, 0, 0, d);
        mesh(new THREE.BoxGeometry(Wd - 0.3, 0.012, 0.01), M.brass, 0, -(pitch - 0.06) / 2 + 0.02, 0.045, d);
        mesh(new THREE.SphereGeometry(0.045, 12, 8), M.brass, 0.95, 0, 0.07, d);
        mesh(new THREE.BoxGeometry(Wd - 0.3, 0.05, 1.45), M.darker, 0, -0.12, -0.75, d);
        const lbl = textPlane(1.9, pitch - 0.08, 300, { brightness: 0.95 }); lbl.mesh.position.set(-0.08, 0, 0.045); d.add(lbl.mesh);
        lbl.draw((c, Wp, Hp, ppu) => {
          c.textBaseline = "middle"; c.font = `600 ${0.14 * ppu}px ${MONO}`; c.fillStyle = "#8b96a3"; c.textAlign = "right"; c.fillText(String(id), 0.28 * ppu, Hp / 2);
          c.font = `600 ${0.17 * ppu}px ${FONT}`; c.fillStyle = "#dfe7ee"; c.textAlign = "left"; c.fillText(V[id], 0.42 * ppu, Hp / 2 + 1);
        });
        // the row E[id] glowing inside the drawer tray
        const cells = new THREE.InstancedMesh(cellG, new THREE.MeshBasicMaterial({ toneMapped: false }), 8);
        const m4 = new THREE.Matrix4(), col = new THREE.Color();
        for (let c = 0; c < 8; c++) {
          m4.compose(v3(-0.84 + c * 0.24, -0.05, -0.62), new THREE.Quaternion(), v3(0.2, 0.08, 0.2)); cells.setMatrixAt(c, m4);
          K.divColor(ctx.DATA.dense.E[id][c], 1.2, col).multiplyScalar(2.2); cells.setColorAt(c, col);
        }
        d.add(cells); d.userData.cells = cells;
        drawers.push(d);
      }
      // C display (looked-up rows, one per position)
      const C = new MatrixDisplay({ maxRows: 10, cols: 8, pitch: 0.27, title: "C = E[ids]   (n × 8)", sym: (r, c) => `c${sub(r + 1)}[${c + 1}]`, titleColor: CSS.cyan });
      C.position.set(LAY.embC, 0.75, 0.3); scene.add(C); regHover(C);
      stand(scene, LAY.embC, 0.3, 0.75, 1.9);
      const flyers = [];
      for (let i = 0; i < 10; i++) {
        const f = new MatrixDisplay({ maxRows: 1, cols: 8, pitch: 0.27, numbers: false, case: false, rails: false, labelW: 0.05 });
        f.visible = false; scene.add(f); flyers.push(f);
      }
      const t1 = tag("Embedding table E", `${VOC} × 8 · ${VOC * 8} params`, { stages: [2], cy: 1 }); t1.position.set(0, H + 0.75, 0.6); g.add(t1);
      const t2 = tag("drawer = one row = one word type", "", { stages: [2], dot: CSS.amber, cy: 0.5, cx: 1 }); t2.position.set(-1.45, H * 0.55, 0.9); g.add(t2);
      const t3 = tag("C · looked-up rows", "hover a cell", { stages: [2, 3], cy: 1 }); scene.add(t3);
      S2.tau = 99; S2.ids = [];
      S2.setData = (R) => {
        const changed = R.ids.join(",") !== S2.ids.join(",");
        S2.ids = R.ids;
        S2.E = R.model.E;
        C.setData(R.F.c, R.words, { scale: 1.2 });
        flyers.forEach((f, i) => { if (i < R.ids.length) f.setData([R.F.c[i]], [""], { scale: 1.2 }); });
        drawers.forEach((d, id) => {
          const col = new THREE.Color();
          for (let c = 0; c < 8; c++) { K.divColor(R.model.E[id][c], 1.2, col).multiplyScalar(2.2); d.userData.cells.setColorAt(c, col); }
          d.userData.cells.instanceColor.needsUpdate = true;
        });
        t3.position.set(LAY.embC, 0.75 + R.ids.length * 0.27 + 0.62, 0.3);
        if (changed) S2.tau = 99;
      };
      S2.enter = (d = 0) => { S2.tau = -d; };
      S2.update = (dt, S) => {
        S2.tau += dt;
        const t = S2.tau, n = S2.ids.length, st = 0.42;
        const pull = new Array(VOC).fill(0);
        const tEnd = 0.6 + st * (n - 1) + 0.9;
        for (let i = 0; i < n; i++) {
          const id = S2.ids[i];
          const open = ease.out(seg(t, 0.15 + st * i, 0.6 + st * i)) * (1 - 0.7 * ease.inOut(seg(t, tEnd + 0.2, tEnd + 0.9)));
          pull[id] = Math.max(pull[id], open);
          const k = ease.inOut(seg(t, 0.55 + st * i, 1.35 + st * i));
          const f = flyers[i];
          f.visible = k > 0 && k < 1;
          if (f.visible) {
            const d = drawers[id];
            const from = v3(LAY.emb + 0.15, 0.22 + d.position.y, -0.55 + 0.85 + 1.0);
            const to = v3(LAY.embC, 0.75 + C.rowY(i) - 0.135, 0.3);
            const mid = from.clone().lerp(to, 0.5); mid.y += 0.9; mid.z += 0.6;
            const p = new THREE.QuadraticBezierCurve3(from, mid, to).getPoint(k);
            f.position.copy(p); f.update();
          }
          C.setRowAmt(i, t > 50 ? 1 : ease.outBack(seg(t, 1.2 + st * i, 1.5 + st * i)));
        }
        C.numAlpha = t > 50 ? 1 : seg(t, tEnd - 0.4, tEnd + 0.2);
        const ex = S.explodeAmt;
        drawers.forEach((d, id) => {
          const target = Math.max(pull[id], ex * 0.45 * ((id % 3) + 1) / 3);
          d.userData.pull = damp(d.userData.pull || 0, target, 10, dt);
          d.position.z = 0.85 + d.userData.pull * 1.15;
        });
        C.update();
      };
      S2.focus = () => ({ target: v3(LAY.emb + 2.2, 2.9, 0), pos: v3(LAY.emb + 0.9, 4.9, 14.6) });
      return S2;
    })();

    /* ===================================================================== S3 POSITION */
    const position = (() => {
      const S3 = { id: 3 };
      const P = new MatrixDisplay({ maxRows: 10, cols: 8, pitch: 0.27, title: "P[1..n]  (learned positions)", titleColor: CSS.pos, labelW: 0.55,
        labelColor: CSS.pos, sym: (r, c) => `p${sub(r + 1)}[${c + 1}]` });
      P.position.set(LAY.pos, 0.75, 0.3); scene.add(P); regHover(P);
      stand(scene, LAY.pos, 0.3, 0.75, 1.9);
      // brown rack frame around P
      const rack = new THREE.Group(); rack.position.set(LAY.pos, 0, 0.3); scene.add(rack);
      const brownGlow = M.glow(CSS.pos, 1.6);
      const rl = mesh(new THREE.BoxGeometry(0.04, 1, 0.04), brownGlow, -1.17, 0, 0.0, rack), rr = mesh(new THREE.BoxGeometry(0.04, 1, 0.04), brownGlow, 1.17, 0, 0.0, rack);
      const plus = glyph(scene, "+", LAY.plus, 1.5, 0.35);
      const eq = glyph(scene, "=", LAY.eq, 1.5, 0.35);
      const rays = new Rays(CSS.pos, { intensity: 1.6, density: 2.5 }); scene.add(rays);
      const raysC = new Rays(CSS.cyan, { intensity: 1.4, density: 2.5 }); scene.add(raysC);
      const t1 = tag("Position rack P", "10 × 8 · max length 10", { stages: [3], dot: CSS.pos, cy: 1 }); scene.add(t1);
      const t2 = tag("x = c + p", "→ enters layer 1", { stages: [3], cy: 1 }); scene.add(t2);
      S3.tau = 99; S3.n = 0;
      S3.setData = (R) => {
        const n = R.ids.length; S3.n = n;
        P.setData(R.F.p, R.words.map((_, i) => "p" + sub(i + 1)), { scale: 1.2 });
        const h = n * 0.27;
        rl.scale.y = h + 0.3; rr.scale.y = h + 0.3; rl.position.y = rr.position.y = 0.75 + h / 2;
        plus.position.y = eq.position.y = 0.75 + h / 2;
        t1.position.set(LAY.pos, 0.75 + h + 0.62, 0.3);
        t2.position.set(LAY.zin, 0.75 + h + 0.95, 0.3);
        const segsP = [], segsC = [];
        for (let i = 0; i < n; i++) {
          const y = 0.75 + P.rowY(i);
          segsC.push([v3(LAY.embC + 1.12, y, 0.3), v3(LAY.pos - 1.66, y, 0.3), 0, 0.5]);
          segsP.push([v3(LAY.pos + 1.12, y, 0.3), v3(LAY.zin - 1.95, y, 0.3), 0.5, 1]);
        }
        rays.setSegments(segsP); raysC.setSegments(segsC);
      };
      S3.enter = (d = 0) => { S3.tau = -d; };
      S3.update = (dt, S) => {
        S3.tau += dt;
        const t = S3.tau, n = S3.n;
        for (let i = 0; i < n; i++) P.setRowAmt(i, t > 50 ? 1 : ease.outBack(seg(t, 0.1 + i * 0.12, 0.5 + i * 0.12)));
        P.numAlpha = t > 50 ? 1 : seg(t, 0.6, 1.2);
        const flow = t > 50 ? 0.55 : seg(t, 1.0, 1.6) * (1 - 0.45 * seg(t, 3.6, 4.4));
        rays.material.uniforms.uOpacity.value = flow; raysC.material.uniforms.uOpacity.value = flow;
        const pulse = 2.2 + Math.sin(S.time * 3) * 0.4 + 2 * seg(t, 1.0, 1.5) * (1 - seg(t, 2.2, 3.0));
        plus.userData.mat.color.copy(hdr(CSS.cyan, pulse)); eq.userData.mat.color.copy(hdr(CSS.cyan, pulse));
        const xIn = layers[0].zin;
        if (S3.tau < 50) for (let i = 0; i < n; i++) xIn.setRowAmt(i, ease.outBack(seg(t, 1.8 + i * 0.12, 2.3 + i * 0.12)));
        P.update();
      };
      S3.vis = (S) => { const on = S.stage <= 4 || S.stage === 7; rays.visible = raysC.visible = on; };
      S3.focus = () => ({ target: v3(LAY.pos + 0.9, 1.45, 0.3), pos: v3(LAY.pos + 1.1, 4.0, 15.4) });
      return S3;
    })();

    /* ===================================================================== LAYER MODULES (S4 Q/K/V, S5 attention, S6 FFN/MoE) */
    function LayerModule(l) {
      const L = { l };
      const g = new THREE.Group(); scene.add(g); L.group = g;
      const sup = l === 0 ? "¹" : "²", supIn = l === 0 ? "⁰" : "¹";
      const stg = [4, 5, 6, 7];
      // ---- input display ----
      const zin = new MatrixDisplay({ maxRows: 10, cols: 8, pitch: 0.27, title: l === 0 ? "x = c + p   (z⁰)" : "z¹  (layer-1 output)", titleColor: CSS.cyan,
        sym: (r, c) => `${l === 0 ? "x" : "z¹"}${sub(r + 1)}[${c + 1}]` });
      zin.position.set(LAY.zin, 0.49, 0.3); g.add(zin); regHover(zin); L.zin = zin;
      stand(g, LAY.zin, 0.3, 0.49, 1.9);
      // ---- Q/K/V lenses ----
      const kinds = ["q", "k", "v"], names = ["W_q", "W_k", "W_v"];
      const lenses = [], qkv = [], qkvRays = [];
      kinds.forEach((kd, j) => {
        const lg = new THREE.Group(); lg.position.set(LAY.lens[j], 0.95, 0.42); g.add(lg);
        const col = CSS[kd];
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 48).rotateX(Math.PI / 2), M.tint(col, 0.22, 0.1)); disc.renderOrder = 4; lg.add(disc);
        const rimL = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 10, 64), M.glow(col, 1.7)); lg.add(rimL);
        const gear = mesh(K.gearGeo(0.62, 0.55, 36, 0.05, 0.1), M.brass, 0, 0, -0.02, lg);
        mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12), M.brass, 0, -0.84, -0.02, lg);
        mesh(RB(0.62, 0.12, 0.62, 0.04), M.dark, 0, -1.1, -0.02, lg);
        mesh(new THREE.SphereGeometry(0.06, 12, 8), M.brass, 0.66, 0, 0.02, lg);
        lenses.push({ lg, gear, disc });
        const d = new MatrixDisplay({ maxRows: 10, cols: 4, pitch: 0.27, kind: kd, title: "", titleColor: col, labelW: 0.24, padR: 0.06, scale: 1.4,
          sym: (r, c) => `${kd}${sub(r + 1)}[${c + 1}]`, labelColor: CSS.mute });
        d.position.set(LAY.lens[j], 1.8, 0.3); g.add(d); regHover(d); qkv.push(d);
        const rays = new Rays(col, { intensity: 0.75, density: 2.2, opacity: 0.6 }); g.add(rays); qkvRays.push(rays);
        const tg = tag(`${names[j]}`, "4 × 8", { stages: [4], dot: col, layer: l, cy: 0 }); tg.position.set(0, -0.72, 0.4); lg.add(tg);
      });
      L.qkv = qkv;
      // ---- attention plane ----
      const NMAX = 10;
      const att = new THREE.Group(); att.position.set(LAY.attn, 0, 0.1); g.add(att);
      const back = mesh(RB(1, 1, 0.12, 0.05), M.screen, 0, 0, -0.12, att);
      const frameM = M.brass;
      const fr = [0, 1, 2, 3].map(() => mesh(new THREE.BoxGeometry(1, 1, 1), frameM, 0, 0, 0, att));
      const tileG = new THREE.BoxGeometry(1, 1, 1);
      const tiles = new THREE.InstancedMesh(tileG, new THREE.MeshBasicMaterial({ toneMapped: false }), NMAX * NMAX);
      tiles.count = 0; att.add(tiles);
      const attText = textPlane(5.6, 5.6, 200, { renderOrder: 7 }); att.add(attText.mesh);
      // front stage: query chip, key pucks, v bars, beams, h_t collector
      const qChip = new TokenChip("is", { color: CSS.q, glow: 2.6 }); att.add(qChip);
      const pucks = [], vbars = [], beams = [];
      const puckG = new THREE.CylinderGeometry(0.17, 0.2, 0.1, 28);
      for (let s = 0; s < NMAX; s++) {
        const pm = new THREE.MeshStandardMaterial({ color: 0x111418, metalness: 0.6, roughness: 0.35, emissive: new THREE.Color(CSS.k), emissiveIntensity: 1.2 });
        const p = mesh(puckG, pm, 0, 0, 0, att); p.visible = false; pucks.push(p);
        const vb = new MatrixDisplay({ maxRows: 1, cols: 4, pitch: 0.12, kind: "v", numbers: false, case: false, rails: false, labelW: 0.02, padR: 0.02, depth: 0.05, scale: 1.4 });
        vb.visible = false; att.add(vb); vbars.push(vb);
        const b = new Beam(CSS.q, { density: 3, speed: 1.1, intensity: 2.2, opacity: 0.9 }); b.visible = false; att.add(b); beams.push(b);
      }
      const hOut = new MatrixDisplay({ maxRows: 1, cols: 4, pitch: 0.24, kind: "v", title: "", titleColor: CSS.v, labelW: 0.05, padR: 0.05, scale: 1.4,
        sym: (r, c) => `h${sub(0)}`.replace(sub(0), "") + `[${c + 1}]` });
      att.add(hOut); regHover(hOut);
      const sigma = glyph(att, "Σ", 0, 0.62, 1.7, CSS.v);
      const vFly = [];
      for (let s = 0; s < NMAX; s++) {
        const f = new MatrixDisplay({ maxRows: 1, cols: 4, pitch: 0.12, kind: "v", numbers: false, case: false, rails: false, labelW: 0.02, padR: 0.02, depth: 0.05, scale: 1.4 });
        f.visible = false; att.add(f); vFly.push(f);
      }
      const ht = tag("Attention plane", "rows = queries · cols = keys", { stages: [5], layer: l, cy: 1, cls: "big" }); att.add(ht);
      const tq = tag("query", "", { stages: [5], layer: l, dot: CSS.q, cy: 1 }); att.add(tq);
      const tk = tag("keys", "beam ∝ weight", { stages: [5], layer: l, dot: CSS.k, cy: 0 }); att.add(tk);
      const th = tag("h_t = Σ a·v", "", { stages: [5, 6], layer: l, dot: CSS.v, cy: 1 }); att.add(th);
      const tMask = tag("masked → −∞", "", { stages: [5], layer: l, dot: CSS.bad, cls: "warn", cy: 0.5 }); att.add(tMask);
      L.attHover = { obj: tiles, info: (hit) => L.attInfo(hit.instanceId) };
      hover.push(L.attHover);
      // ---- FFN / MoE ----
      const concat = new MatrixDisplay({ maxRows: 1, cols: 8, pitch: 0.22, title: "[h¹ ; h²]  concat", titleColor: CSS.ink2, labelW: 0.05, padR: 0.05, scale: 1.2,
        sym: (r, c) => `[h¹;h²][${c + 1}]` });
      concat.position.set(LAY.concat, 2.55, 0.3); g.add(concat); regHover(concat);
      stand(g, LAY.concat, 0.3, 2.55, 1.6);
      const ffn = new THREE.Group(); ffn.position.set(LAY.ffn, 0, 0.1); g.add(ffn);
      const dense = new THREE.Group(); ffn.add(dense);
      const housingTop = new THREE.Group(); dense.add(housingTop);
      mesh(RB(2.4, 1.95, 1.35, 0.1), M.dark, 0, 1.3, -0.05, dense);
      mesh(RB(2.5, 0.16, 1.45, 0.05), M.brassDim, 0, 0.3, -0.05, dense);
      mesh(RB(2.5, 0.16, 1.45, 0.05), M.brassDim, 0, 0, 0, housingTop); housingTop.position.y = 2.32;
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.45, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x0a1016, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.3, clearcoat: 1, envMapIntensity: 0.5, depthWrite: false }));
      win.position.set(0, 1.3, 0.8); win.renderOrder = 3; dense.add(win);
      mesh(new THREE.BoxGeometry(2.05, 1.5, 0.05), M.screen, 0, 1.3, 0.63, dense);
      const bulbG = new THREE.SphereGeometry(0.085, 16, 12);
      const bulbs = [];
      for (let i = 0; i < 16; i++) {
        const bm = new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false });
        const b = new THREE.Mesh(bulbG, bm); b.position.set(-0.69 + (i % 4) * 0.46, 1.78 - Math.floor(i / 4) * 0.33, 0.7); dense.add(b); bulbs.push(b);
      }
      const ffText = textPlane(2.0, 1.45, 260, { renderOrder: 7 }); ffText.mesh.position.set(0, 1.3, 0.83); dense.add(ffText.mesh);
      for (const sx of [-1, 1]) for (const sy of [0.6, 2.0]) mesh(new THREE.SphereGeometry(0.05, 10, 8), M.brass, sx * 1.1, sy, 0.66, dense);
      // residual bypass: a brass arch that carries z over the block (input side -> "+" side)
      const ring = new THREE.Group(); ring.position.set(0.4, 1.0, -0.9); ffn.add(ring);
      mesh(new THREE.TorusGeometry(1.75, 0.07, 14, 96, Math.PI), M.brass, 0, 0, 0, ring);
      const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.032, 10, 96, Math.PI), K.flowMaterial(CSS.cyan, { density: 10, speed: -0.5, intensity: 2.6 }));
      ringGlow.position.z = 0.08; ring.add(ringGlow);
      for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 20), M.brassDim, sx * 1.75, 0.0, 0, ring);
      // MoE: router dial + 4 experts
      const moe = new THREE.Group(); ffn.add(moe);
      const router = new THREE.Group(); router.position.set(-0.95, 1.35, 0.35); moe.add(router);
      mesh(new THREE.CylinderGeometry(0.72, 0.75, 0.16, 48).rotateX(Math.PI / 2), M.dark, 0, 0, -0.06, router);
      mesh(new THREE.TorusGeometry(0.7, 0.045, 12, 64), M.brass, 0, 0, 0.03, router);
      const rFace = textPlane(1.36, 1.36, 300, { renderOrder: 6 }); rFace.mesh.position.z = 0.04; router.add(rFace.mesh);
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 10), M.brass, 0, -0.95, -0.06, router);
      const experts = [];
      for (let e = 0; e < 4; e++) {
        const eg = new THREE.Group(); eg.position.set(0.45 + (e % 2) * 1.05, 0.85 + Math.floor((3 - e) / 2) * 0.98, 0); moe.add(eg);
        mesh(RB(0.9, 0.8, 0.9, 0.07), M.dark, 0, 0, 0, eg);
        const rimM = new THREE.MeshBasicMaterial({ color: 0x111111, toneMapped: false });
        const rimE = mesh(RB(0.95, 0.85, 0.85, 0.07), rimM, 0, 0, -0.04, eg);
        const ebulbs = [];
        for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false })); b.position.set(-0.27 + (i % 4) * 0.18, 0.1 - Math.floor(i / 4) * 0.2, 0.46); eg.add(b); ebulbs.push(b); }
        const lab = textPlane(0.9, 0.24, 300, { renderOrder: 7 }); lab.mesh.position.set(0, 0.27, 0.46); eg.add(lab.mesh);
        const tgE = tag(`E${e + 1}`, "", { stages: [6], layer: l, cy: 0.5, cx: 0, cond: (S) => S.model === "moe" }); tgE.position.set(0.5, -0.22, 0.4); eg.add(tgE);
        experts.push({ eg, rimM, ebulbs, lab, tgE });
      }
      const add = new MatrixDisplay({ maxRows: 3, cols: 8, pitch: 0.23, title: "", titleColor: CSS.ink2, labelW: 1.0, scale: 1.2,
        sym: (r, c) => [`z${supIn}`, `W_z(·)`, `z${sup}`][r] + `[${c + 1}]` });
      add.position.set(LAY.add, 1.45, 0.3); g.add(add); regHover(add);
      stand(g, LAY.add, 0.3, 1.45, 1.8);
      const ffRays = new Rays(CSS.amber, { intensity: 1.4, density: 2.5, opacity: 0.6 }); g.add(ffRays);
      const tFF = tag(`W_z  (layer ${l + 1})`, "8 → 16 → 8 · ReLU", { stages: [6], layer: l, cy: 1, cond: (S) => S.model === "dense" }); tFF.position.set(0, 2.62, 0); ffn.add(tFF);
      const tMoE = tag("Router W_r", "4 × 8 · softmax · top-2", { stages: [6], layer: l, cy: 1, cond: (S) => S.model === "moe" }); tMoE.position.set(-0.95, 2.15, 0.35); ffn.add(tMoE);
      const tRing = tag("residual bypass", "z skips the block", { stages: [6, 7], layer: l, dot: CSS.cyan, cy: 0.5, cx: 0 }); tRing.position.set(0.5, 2.95, -0.9); ffn.add(tRing);
      const tAdd = tag("+ residual", `z${sup} = z${supIn} + W_z([h¹;h²])`, { stages: [6, 7], layer: l, cy: 0 }); tAdd.position.set(LAY.add, 1.1, 0.4); g.add(tAdd);
      const tLayer = tag(`Layer ${l + 1}`, "own W_q, W_k, W_v, W_z", { stages: [7], cy: 0.5, cls: "big" }); tLayer.position.set(LAY.deckX0 - 0.4, 1.0, 1.8); g.add(tLayer);

      // ---------------- data ----------------
      L.R = null; L.tauQ = 99; L.tauA = 99; L.tauF = 99;
      L.setData = (R, S) => {
        L.R = R;
        const F = R.F, lay = F.layers[l], n = F.n, h = S.head, t = S.t;
        const words = R.words;
        zin.setData(lay.zin, words, { scale: l === 0 ? 1.2 : 1.6 });
        zin.setHighlight(S.stage === 6 ? t : -1);
        const hd = lay.heads[h];
        [hd.q, hd.k, hd.v].forEach((M_, j) => {
          qkv[j].setData(M_, words.map((_, i) => String(i + 1)), { title: `${kinds[j].toUpperCase()}  (head ${h + 1})`, scale: 1.4 });
        });
        qkv[0].setHighlight(S.stage === 5 ? t : -1);
        // rays: zin rows -> lens -> output rows
        qkvRays.forEach((rays, j) => {
          const segs = [];
          const lc = v3(LAY.lens[j], 0.95, 0.42);
          for (let i = 0; i < n; i++) {
            const y = 0.49 + zin.rowY(i);
            segs.push([v3(LAY.zin + 1.12, y, 0.3), lc, 0, 0.6]);
            segs.push([lc, v3(LAY.lens[j] - 0.56, 1.8 + qkv[j].rowY(i), 0.3), 0.6, 1]);
          }
          rays.setSegments(segs);
        });
        // ---- attention plane layout ----
        const pa = Math.min(0.6, 3.0 / n), gw = n * pa, base = 1.2;
        L.pa = pa; L.gw = gw; L.base = base;
        back.scale.set(gw + 1.9, gw + 1.15, 1); back.position.set(-0.35, base + gw / 2 + 0.2, -0.14);
        const fw = 0.06;
        fr[0].scale.set(gw + 0.2, fw, 0.12); fr[0].position.set(0, base - 0.1, 0);
        fr[1].scale.set(gw + 0.2, fw, 0.12); fr[1].position.set(0, base + gw + 0.1, 0);
        fr[2].scale.set(fw, gw + 0.2, 0.12); fr[2].position.set(-gw / 2 - 0.1, base + gw / 2, 0);
        fr[3].scale.set(fw, gw + 0.2, 0.12); fr[3].position.set(gw / 2 + 0.1, base + gw / 2, 0);
        attText.mesh.position.set(-0.4, base + gw / 2 + 0.3, 0.05);
        L.drawAtt(S);
        // key pucks / v bars / beams (front stage)
        const a = hd.attn[t];
        L.puckX = (s) => -gw / 2 + (s + 0.5) * pa;
        for (let s = 0; s < NMAX; s++) {
          const on = s < n;
          pucks[s].visible = on; vbars[s].visible = on; beams[s].visible = on && F.allowed[t][s];
          if (!on) continue;
          const allowed = F.allowed[t][s];
          pucks[s].position.set(L.puckX(s), 0.06, 1.55);
          pucks[s].material.emissive.set(allowed ? CSS.k : CSS.bad);
          pucks[s].material.emissiveIntensity = allowed ? 0.3 + 2.4 * a[s] : 0.8;
          vbars[s].setData([hd.v[s]], [""], { scale: 1.4 });
          vbars[s].position.set(L.puckX(s), 0.16, 1.55);
          vbars[s].scale.setScalar(Math.min(1, pa / 0.55));
          if (allowed) {
            const qp = v3(-gw / 2 - 1.05, 0.62, 1.9);
            const kp = v3(L.puckX(s), 0.12, 1.55);
            const mid = qp.clone().lerp(kp, 0.5); mid.y += 0.55 + 0.15 * Math.abs(s - t); mid.z += 0.35;
            beams[s].setCurve(new THREE.QuadraticBezierCurve3(qp, mid, kp), 0.006 + 0.07 * Math.sqrt(a[s]));
          }
        }
        qChip.setWord(words[t]);
        qChip.position.set(-gw / 2 - 1.05, 0.62, 1.9);
        hOut.setData([hd.h[t]], [""], { scale: 1.4, title: `h${sub(t + 1)}${l === 0 ? "" : ""}  (head ${h + 1})` });
        hOut.o.sym = (r, c) => `h${sub(t + 1)}[${c + 1}] (head ${h + 1}, layer ${l + 1})`;
        hOut.position.set(gw / 2 + 0.95, 0.12, 1.55);
        sigma.position.set(gw / 2 + 0.3, 0.32, 1.6);
        ht.position.set(0, base + gw + 0.95, 0.1);
        tq.position.set(-gw / 2 - 1.05, 0.95, 1.9);
        tk.position.set(0, -0.08, 1.75);
        th.position.set(gw / 2 + 0.95, 0.75, 1.55);
        const firstMasked = F.allowed[t].findIndex((ok) => !ok);
        tMask.userData.cond = () => firstMasked >= 0 && S.attnMode !== "scores";
        if (firstMasked >= 0) tMask.position.set(gw / 2 + 0.55, base + (n - 1 - (n - 1)) * pa + pa / 2 + 0.0, 0.15);
        tMask.position.set(gw / 2 + 0.2, base + gw - pa * 0.5 - (S.t) * pa * 0 , 0.15);
        tMask.center.set(0, 0.5);
        // vFly data
        for (let s = 0; s < NMAX; s++) if (s < n) vFly[s].setData([hd.v[s].map((x) => x * a[s])], [""], { scale: 1.4 });
        // ---- FFN / MoE ----
        concat.setData([lay.concat[t]], [""], { title: `[h¹ ; h²]   (t = ${t + 1}, ${words[t]})`, scale: 1.2 });
        add.setData([lay.zin[t], lay.ff[t], lay.z[t]], [`z${supIn}  (in)`, `+ W_z(·)`, `= z${sup}`], { title: `residual add  ·  t = ${t + 1}`, scale: 1.6 });
        if (lay.ffn) {
          const hid = lay.ffn.hid[t], pre = lay.ffn.pre[t];
          bulbs.forEach((b, i) => b.material.color.copy(hid[i] > 0 ? hdr(CSS.amber, 0.25 + 2.6 * Math.min(1, hid[i] / 1.5)) : new THREE.Color(0x1d2126)));
          const zeros = hid.filter((x) => x <= 0).length;
          L.zeros = zeros;
          ffText.draw((c, Wp, Hp, ppu) => {
            c.textAlign = "center"; c.textBaseline = "middle";
            for (let i = 0; i < 16; i++) {
              const x = (1.0 - 0.69 + (i % 4) * 0.46) * ppu, y = (0.725 - (1.78 - Math.floor(i / 4) * 0.33 - 1.3) + 0.15) * ppu;
              c.font = `600 ${0.09 * ppu}px ${MONO}`;
              c.fillStyle = hid[i] > 0 ? "#ffe2b0" : "#5d6670";
              c.fillText(hid[i] > 0 ? fmt(hid[i]) : "0", x, y);
            }

          });
        }
        if (lay.moe) {
          const gts = lay.moe.gates[t], top = lay.moe.top[t], topw = lay.moe.topw[t];
          L.gates = gts; L.top = top; L.topw = topw;
          rFace.draw((c, Wp, Hp, ppu) => {
            const cx = Wp / 2, cy = Hp / 2, R = 0.66 * ppu;
            const gr = c.createRadialGradient(cx, cy - R * 0.3, R * 0.1, cx, cy, R); gr.addColorStop(0, "#18212a"); gr.addColorStop(1, "#06090c");
            c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
            c.textAlign = "center"; c.textBaseline = "middle";
            c.fillStyle = "#8b96a3"; c.font = `600 ${0.075 * ppu}px ${FONT}`; c.fillText("g = softmax(W_r x)", cx, cy - R * 0.68);
            const bw = R * 0.26, x0 = cx - R * 0.62, by = cy + R * 0.38, bh = R * 0.75;
            for (let e = 0; e < 4; e++) {
              const on = top.includes(e), x = x0 + e * R * 0.42;
              c.fillStyle = "rgba(255,255,255,0.07)"; c.fillRect(x, by - bh, bw, bh);
              c.fillStyle = on ? CSS.cyan : "#4a535d"; c.fillRect(x, by - bh * gts[e], bw, bh * gts[e]);
              c.fillStyle = on ? "#e9eef3" : "#6b7580"; c.font = `600 ${0.085 * ppu}px ${MONO}`; c.fillText(gts[e].toFixed(2), x + bw / 2, by - bh * gts[e] - 0.07 * ppu);
              c.fillStyle = on ? CSS.cyan : "#6b7580"; c.font = `700 ${0.08 * ppu}px ${FONT}`; c.fillText("E" + (e + 1), x + bw / 2, by + 0.08 * ppu);
            }
          });
          experts.forEach((ex, e) => {
            const r = top.indexOf(e), on = r >= 0;
            ex.rimM.color.copy(on ? hdr(r === 0 ? CSS.cyan : CSS.amber, 2.2) : new THREE.Color(0x15181c));
            const out = lay.moe.experts[t][e];
            ex.ebulbs.forEach((b, i) => b.material.color.copy(on && out.hid[i] > 0 ? hdr(CSS.amber, 0.3 + 2.4 * Math.min(1, out.hid[i] / 1.5)) : new THREE.Color(on ? 0x2a2f35 : 0x131518)));
            ex.lab.draw((c, Wp, Hp, ppu) => {
              c.textAlign = "center"; c.textBaseline = "middle"; c.font = `700 ${0.12 * ppu}px ${MONO}`;
              c.fillStyle = on ? "#e9eef3" : "#59626c";
              c.fillText(on ? `g=${topw[r].toFixed(2)}` : "off", Wp / 2, Hp / 2);
            });
            ex.tgE.setText(`E${e + 1}`, on ? `active · g ${topw[r].toFixed(2)}` : "never run");
            ex.tgE.element.classList.toggle("warn", !on);
            ex.tgE.element.classList.toggle("hot", on);
          });
        }
        // FFN rays: concat -> block, block -> add row 2
        const fsegs = [];
        const cRight = v3(LAY.concat + 0.95, 2.55 + 0.11, 0.3), blockIn = v3(LAY.ffn - 1.25, 1.3, 0.35), blockOut = v3(LAY.ffn + 1.25, 1.3, 0.35);
        fsegs.push([cRight, blockIn, 0, 0.5], [blockOut, v3(LAY.add - 1.0, 1.45 + add.rowY(1), 0.3), 0.5, 1]);
        ffRays.setSegments(fsegs);
      };
      L.drawAtt = (S) => {
        const R = L.R; if (!R) return;
        const F = R.F, hd = F.layers[l].heads[S.head], n = F.n, t = S.t, pa = L.pa, gw = L.gw, base = L.base;
        const mode = S.attnMode;
        const m4 = new THREE.Matrix4(), col = new THREE.Color();
        let i = 0;
        const sMax = Math.max(1e-6, ...hd.scores.flat().map(Math.abs));
        for (let r = 0; r < n; r++) for (let s = 0; s < n; s++) {
          const ok = F.allowed[r][s];
          const x = -gw / 2 + (s + 0.5) * pa, y = base + (n - 1 - r) * pa + pa / 2;
          m4.compose(v3(x, y, 0), new THREE.Quaternion(), v3(pa * 0.9, pa * 0.9, 0.04));
          tiles.setMatrixAt(i, m4);
          const rowK = r === t ? 1.25 : 0.8;
          if (mode === "scores") K.divColor(hd.scores[r][s], sMax, col).multiplyScalar(1.1 * rowK);
          else if (!ok) col.set(CSS.bad).multiplyScalar(r === t ? 0.55 : 0.32);
          else if (mode === "masked") K.divColor(hd.scores[r][s], sMax, col).multiplyScalar(1.1 * rowK);
          else col.set("#2fd3cc").multiplyScalar((0.04 + 1.05 * Math.pow(hd.attn[r][s], 0.8)) * rowK);
          tiles.setColorAt(i, col);
          i++;
        }
        tiles.count = i; tiles.instanceMatrix.needsUpdate = true; if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
        const W_ = attText.wu, H_ = attText.hu;
        const ox = attText.mesh.position.x, oy = attText.mesh.position.y;
        attText.draw((c, Wp, Hp, ppu) => {
          const X = (x) => (x - ox + W_ / 2) * ppu, Y = (y) => (oy + H_ / 2 - y) * ppu;
          c.textBaseline = "middle";
          const fs = Math.min(0.17, pa * 0.27) * ppu;
          for (let r = 0; r < n; r++) for (let s = 0; s < n; s++) {
            const ok = F.allowed[r][s];
            const x = -gw / 2 + (s + 0.5) * pa, y = base + (n - 1 - r) * pa + pa / 2;
            let txt;
            if (mode === "scores") txt = fmt(hd.scores[r][s]);
            else if (!ok) txt = "−∞";
            else if (mode === "masked") txt = fmt(hd.scores[r][s]);
            else txt = fmt(hd.attn[r][s]);
            c.font = `${r === t ? 700 : 600} ${fs}px ${MONO}`; c.textAlign = "center";
            c.lineWidth = fs * 0.22; c.strokeStyle = "rgba(0,0,0,.8)"; c.lineJoin = "round";
            c.strokeText(txt, X(x), Y(y));
            c.fillStyle = !ok && mode !== "scores" ? "#ffb3ba" : (r === t ? "#ffffff" : "#d5dde4");
            c.fillText(txt, X(x), Y(y));
          }
          // row labels (queries, blue) and column labels (keys, green)
          const lf = Math.min(0.2, pa * 0.36) * ppu;
          for (let r = 0; r < n; r++) {
            const y = base + (n - 1 - r) * pa + pa / 2;
            c.font = `${r === t ? 700 : 500} ${lf}px ${FONT}`; c.textAlign = "right";
            c.fillStyle = r === t ? "#9fc2ff" : CSS.q; c.fillText(R.words[r], X(-gw / 2 - 0.16), Y(y));
          }
          for (let s = 0; s < n; s++) {
            const x = -gw / 2 + (s + 0.5) * pa;
            c.font = `600 ${lf}px ${FONT}`;
            const wpx = c.measureText(R.words[s]).width, fit = Math.min(lf, lf * (pa * 0.94 * ppu) / Math.max(1, wpx));
            c.font = `600 ${fit}px ${FONT}`; c.textAlign = "center"; c.fillStyle = CSS.k; c.fillText(R.words[s], X(x), Y(base + gw + 0.2));
          }
          // highlight row t
          c.strokeStyle = CSS.q; c.lineWidth = 0.025 * ppu;
          K.roundRect(c, X(-gw / 2 - 0.03), Y(base + (n - t) * pa + 0.03), (gw + 0.06) * ppu, (pa + 0.06) * ppu, 0.04 * ppu); c.stroke();
          // axis captions + formula
          c.fillStyle = "#8b96a3"; c.font = `600 ${0.13 * ppu}px ${FONT}`; c.textAlign = "center";
          const capt = { scores: "step 1 · scores  q·k / √4", masked: "step 2 · mask  (−∞ where not allowed)", softmax: "step 3 · softmax across each row" }[mode];
          c.fillText(capt, X(0), Y(base - 0.3));
          c.save(); c.translate(X(-gw / 2 - 1.12), Y(base + gw / 2)); c.rotate(-Math.PI / 2); c.fillStyle = CSS.q; c.font = `700 ${0.13 * ppu}px ${FONT}`; c.fillText("QUERIES (rows)", 0, 0); c.restore();
          c.fillStyle = CSS.k; c.font = `700 ${0.13 * ppu}px ${FONT}`; c.textAlign = "center"; c.fillText("KEYS (cols)", X(0), Y(base + gw + 0.46));
        });
      };
      L.attInfo = (id) => {
        const R = L.R, S = ctx.S; if (!R) return null;
        const n = R.F.n, r = Math.floor(id / n), s = id % n, hd = R.F.layers[l].heads[S.head];
        const ok = R.F.allowed[r][s];
        return `q<sub>${r + 1}</sub>·k<sub>${s + 1}</sub> = ${hd.raw[r][s].toFixed(4)} &nbsp;/√4 = ${hd.scores[r][s].toFixed(4)}<br>` +
          (ok ? `a<sub>${r + 1},${s + 1}</sub> = <b>${hd.attn[r][s].toFixed(4)}</b>` : `<span style="color:#ff8a95">masked → −∞ → a = 0</span>`) +
          `<br><span style="color:#7d8894">${R.words[r]} → ${R.words[s]} · layer ${l + 1} head ${S.head + 1}</span>`;
      };
      L.enter = (stage, d = 0) => { if (stage === 4) L.tauQ = -d; if (stage === 5) L.tauA = -d; if (stage === 6) L.tauF = -d; };
      L.update = (dt, S) => {
        L.tauQ += dt; L.tauA += dt; L.tauF += dt;
        g.position.y = l === 0 ? LAY.deckFloor : W.deck2Y + 0.02;
        const R = L.R; if (!R) return;
        const n = R.F.n, ex = S.explodeAmt, active = S.layer === l;
        // Q/K/V intro: rays sweep, rows appear
        const tq = L.tauQ;
        qkv.forEach((d, j) => {
          for (let i = 0; i < n; i++) d.setRowAmt(i, tq > 50 ? 1 : ease.outBack(seg(tq, 0.6 + j * 0.35 + i * 0.06, 1.0 + j * 0.35 + i * 0.06)));
          d.numAlpha = tq > 50 ? 1 : seg(tq, 1.4 + j * 0.3, 1.9 + j * 0.3);
          d.position.x = LAY.lens[j] + (j - 1) * 0.5 * ex;
          d.update();
        });
        qkvRays.forEach((r, j) => { r.material.uniforms.uOpacity.value = (active || S.stage === 7 ? 0.65 : 0.25) * (tq > 50 ? 1 : seg(tq, 0.2 + j * 0.3, 0.7 + j * 0.3)); r.position.x = (j - 1) * 0.5 * ex; });
        lenses.forEach((ln, j) => {
          ln.gear.rotation.z += dt * 0.15 * (j % 2 ? -1 : 1);
          ln.lg.position.x = LAY.lens[j] + (j - 1) * 0.5 * ex;
          ln.lg.position.z = 0.42 + 0.5 * ex;
          const pulse = tq < 50 ? seg(tq, 0.3 + j * 0.35, 0.6 + j * 0.35) * (1 - seg(tq, 1.1 + j * 0.35, 1.6 + j * 0.35)) : 0;
          ln.disc.material.emissiveIntensity = 0.1 + 0.9 * pulse;
        });
        // attention intro: tiles fade in, beams grow, v's fly into h_t
        const ta = L.tauA;
        att.position.z = 0.1 + 0.9 * ex; att.position.y = 0.4 * ex;
        const beamK = ta > 50 ? 1 : seg(ta, 0.8, 1.8);
        const a = R.F.layers[l].heads[S.head].attn[S.t];
        for (let s = 0; s < n; s++) {
          beams[s].material.uniforms.uOpacity.value = 0.9 * beamK * (active || S.stage === 7 ? 1 : 0.35);
          const fk = ta > 50 ? 1 : ease.inOut(seg(ta, 2.0 + s * 0.12, 3.0 + s * 0.12));
          const f = vFly[s];
          f.visible = fk > 0 && fk < 1 && R.F.allowed[S.t][s];
          if (f.visible) {
            const from = v3(L.puckX(s), 0.16, 1.55), to = v3(L.gw / 2 + 0.95, 0.12, 1.55);
            const mid = from.clone().lerp(to, 0.5); mid.y += 0.5;
            f.position.copy(new THREE.QuadraticBezierCurve3(from, mid, to).getPoint(fk));
            f.scale.setScalar(0.4 + 0.6 * Math.sqrt(a[s]));
            f.update();
          }
          vbars[s].update();
        }
        hOut.setRowAmt(0, ta > 50 ? 1 : ease.outBack(seg(ta, 3.0, 3.5)));
        hOut.numAlpha = ta > 50 ? 1 : seg(ta, 3.2, 3.7);
        hOut.update();
        qChip.position.y = 0.62 + Math.sin(S.time * 1.6) * 0.03;
        // FFN intro
        const tf = L.tauF;
        concat.setRowAmt(0, tf > 50 ? 1 : ease.outBack(seg(tf, 0.2, 0.7)));
        for (let r = 0; r < 3; r++) add.setRowAmt(r, tf > 50 ? 1 : ease.outBack(seg(tf, 1.4 + r * 0.45, 1.8 + r * 0.45)));
        add.numAlpha = tf > 50 ? 1 : seg(tf, 2.4, 3.0);
        ffRays.material.uniforms.uOpacity.value = (active || S.stage === 7 ? 0.6 : 0.25) * (tf > 50 ? 1 : seg(tf, 0.6, 1.3));
        const isMoE = S.model === "moe";
        L.moeAmt = damp(L.moeAmt == null ? (isMoE ? 1 : 0) : L.moeAmt, isMoE ? 1 : 0, 6, dt);
        const mA = L.moeAmt;
        dense.scale.setScalar(Math.max(0.001, 1 - mA)); dense.visible = mA < 0.999;
        moe.scale.setScalar(Math.max(0.001, mA)); moe.visible = mA > 0.001;
        housingTop.position.y = 2.32 + 0.7 * ex;
        ring.position.y = 1.0 + 0.6 * ex;
        experts.forEach((e, i) => { e.eg.position.z = (i % 2 ? 0.3 : -0.1) * ex; e.eg.position.x = 0.45 + (i % 2) * (1.05 + 0.4 * ex); });
        router.position.x = -0.95 - 0.4 * ex;
        concat.update(); add.update(); zin.update();
      };
      L.focusQKV = () => { const y = L.group.position.y; return { target: v3(LAY.lens[1] - 1.6, y + 2.0, 0.3), pos: v3(LAY.lens[1] - 2.2, y + 4.0, 12.6) }; };
      L.focusAttn = () => { const y = L.group.position.y; return { target: v3(LAY.attn + 0.3, y + 1.95, 0.7), pos: v3(LAY.attn + 0.3, y + 4.0, 11.6) }; };
      L.focusFFN = () => { const y = L.group.position.y; return { target: v3(LAY.ffn + 0.35, y + 1.7, 0.3), pos: v3(LAY.ffn + 0.1, y + 3.9, 13.6) }; };
      return L;
    }
    const layers = [LayerModule(0), LayerModule(1)];

    /* ===================================================================== S8 OUTPUT HEAD */
    const output = (() => {
      const S8 = { id: 8 };
      const zL = new MatrixDisplay({ maxRows: 1, cols: 8, pitch: 0.24, title: "z²", titleColor: CSS.cyan, labelW: 0.05, padR: 0.05, scale: 1.6,
        sym: (r, c) => `z²[${c + 1}]` });
      zL.position.set(LAY.out - 3.7, 2.08, 0.25); scene.add(zL); regHover(zL);
      stand(scene, LAY.out - 3.7, 0.25, 2.08, 1.7);
      const lens = new THREE.Group(); lens.position.set(LAY.out - 1.35, 2.2, 0.25); scene.add(lens);
      const barrel = mesh(K.knurlGeo(0.98, 0.95, 140, 0.05).rotateZ(Math.PI / 2), M.dark, 0, 0, 0, lens);
      const gear = new THREE.Group(); lens.add(gear);
      const gm = mesh(K.gearGeo(1.1, 0.92, 56, 0.08, 0.2), M.brass, 0, 0, 0, gear); gm.rotation.y = Math.PI / 2;
      gear.position.x = -0.62;
      const ringF = mesh(new THREE.TorusGeometry(0.9, 0.06, 14, 72), M.brass, 0, 0, 0, lens); ringF.rotation.y = Math.PI / 2;
      const front = new THREE.Mesh(new THREE.SphereGeometry(0.88, 48, 24), M.tint(CSS.cyan, 0.32, 0.45)); front.scale.set(0.24, 1, 1); front.renderOrder = 4; lens.add(front);
      const rear = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 24), M.tint(CSS.cyan, 0.3, 0.3)); rear.scale.set(0.2, 1, 1); rear.renderOrder = 4; lens.add(rear);
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), M.glow(CSS.cyan, 0.55)); core.rotation.y = Math.PI / 2; lens.add(core);
      mesh(RB(1.2, 0.2, 1.2, 0.05), M.dark, 0, -2.0, 0, lens);
      mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 12), M.brass, 0, -1.5, 0, lens);
      mesh(new THREE.BoxGeometry(0.5, 0.12, 1.4), M.brassDim, 0, -1.02, 0, lens);
      // histogram board
      const bx = LAY.out + 2.3, rows = VOC, rp = 0.3, by0 = 0.5;
      const board = mesh(RB(4.8, rows * rp + 0.75, 0.12, 0.05), M.screen, bx, by0 + (rows * rp + 0.75) / 2 - 0.15, -0.15, scene);
      const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), rows);
      scene.add(bars);
      const hText = textPlane(4.8, rows * rp + 0.75, 220, { renderOrder: 7 });
      hText.mesh.position.set(bx, by0 + (rows * rp + 0.75) / 2 - 0.15, -0.07); scene.add(hText.mesh);
      const raysTop = new Rays(CSS.cyan, { intensity: 2.2, density: 3, opacity: 0.9 }); scene.add(raysTop);
      const raysRest = new Rays("#7fb9c0", { intensity: 0.8, density: 3, opacity: 0.45 }); scene.add(raysRest);
      const raysIn = new Rays(CSS.cyan, { intensity: 1.6, density: 3, opacity: 0.7 }); scene.add(raysIn);
      const tl = tag("Output lens W_o", `${VOC} × 8 → ${VOC} logits`, { stages: [8], cy: 1 }); tl.position.set(LAY.out - 1.35, 3.55, 0.25); scene.add(tl);
      const tTop = tag("", "", { stages: [8], cy: 0.5, cx: 0, cls: "hot big" }); scene.add(tTop);
      const BAR0 = bx - 2.4 + 1.25, BARW = 2.5;
      S8.order = []; S8.ys = new Array(VOC).fill(null); S8.tau = 99;
      hover.push({ obj: bars, info: (hit) => { const R = S8.R; if (!R) return null; const w = hit.instanceId; return `P(<b>${V[w]}</b> | prefix) = <b>${R.p[w].toFixed(4)}</b><br>logit = ${R.logit[w].toFixed(4)}`; } });
      S8.setData = (R, S) => {
        const t = S.t, F = R.F;
        const p = F.probs[t], logit = F.logits[t];
        S8.R = { p, logit };
        zL.setData([F.layers[1].z[t]], [""], { title: `z²${sub(t + 1)}  (after “${R.words[t]}”)`, scale: 1.6 });
        const order = p.map((_, i) => i).sort((a, b) => p[b] - p[a]);
        S8.order = order; S8.p = p; S8.logit = logit;
        const top = order[0];
        tTop.setText(`▲ ${V[top]}`, `p = ${p[top].toFixed(3)}`);
        S8.redraw(S);
      };
      S8.rowY = (rank) => by0 + (VOC - 1 - rank) * rp + rp / 2;
      S8.redraw = () => {
        const p = S8.p, logit = S8.logit, order = S8.order;
        hText.draw((c, Wp, Hp, ppu) => {
          const top = order[0];
          const X = (x) => (x - (bx - 2.4)) * ppu, Y = (y) => (by0 + (VOC * rp + 0.75) - 0.15 - y) * ppu;
          c.textBaseline = "middle";
          c.fillStyle = "#8b96a3"; c.font = `600 ${0.13 * ppu}px ${FONT}`; c.textAlign = "left";
          c.fillText("softmax(W_o z) · next-word distribution", X(bx - 2.25), Y(by0 + VOC * rp + 0.28));
          order.forEach((w, rank) => {
            const y = S8.ys[w] == null ? S8.rowY(rank) : S8.ys[w];
            c.font = `${w === top ? 700 : 500} ${0.16 * ppu}px ${FONT}`; c.textAlign = "right";
            c.fillStyle = w === top ? CSS.cyan : "#c5ced6"; c.fillText(V[w], X(BAR0 - 0.1), Y(y));
            c.font = `${w === top ? 700 : 500} ${0.13 * ppu}px ${MONO}`; c.textAlign = "left";
            c.fillStyle = w === top ? "#ffffff" : "#8b96a3";
            c.fillText(p[w].toFixed(3), X(BAR0 + Math.max(0.02, p[w] * BARW) + 0.08), Y(y));
            c.fillStyle = "#47505a"; c.font = `500 ${0.1 * ppu}px ${MONO}`; c.textAlign = "right";
            c.fillText(fmt(logit[w], 1), X(bx + 2.33), Y(y));
          });
          c.fillStyle = "#5c6672"; c.font = `600 ${0.09 * ppu}px ${FONT}`; c.textAlign = "right"; c.fillText("logit", X(bx + 2.33), Y(by0 + VOC * rp + 0.28));
        });
      };
      S8.enter = (d = 0) => { S8.tau = -d; };
      S8.update = (dt, S) => {
        S8.tau += dt;
        const t = S8.tau, ex = S.explodeAmt;
        front.position.x = 0.52 + 0.75 * ex; ringF.position.x = 0.52 + 0.75 * ex;
        rear.position.x = -0.42 - 0.55 * ex; gear.position.x = -0.62 - 0.95 * ex; barrel.position.x = 0.0;
        gm.rotation.x += dt * 0.12;
        if (!S8.p) return;
        const m4 = new THREE.Matrix4(), col = new THREE.Color();
        const grow = t > 50 ? 1 : ease.out(seg(t, 0.8, 1.8));
        let moved = false;
        const segsT = [], segsR = [];
        const lensOut = v3(LAY.out - 1.35 + 0.75 + 0.75 * ex, 2.2, 0.25);
        S8.order.forEach((w, rank) => {
          const yT = S8.rowY(rank);
          const y0 = S8.ys[w] == null ? yT : S8.ys[w];
          const y = damp(y0, yT, 8, dt);
          if (Math.abs(y - y0) > 1e-4) moved = true;
          S8.ys[w] = y;
          const len = Math.max(0.015, S8.p[w] * BARW * grow);
          m4.compose(v3(BAR0 + len / 2, y, -0.03), new THREE.Quaternion(), v3(len, 0.19, 0.12));
          bars.setMatrixAt(w, m4);
          if (rank === 0) col.set(CSS.cyan).multiplyScalar(1.45); else col.set("#3c8f96").multiplyScalar(0.5 + 1.2 * Math.sqrt(S8.p[w]));
          bars.setColorAt(w, col);
          (rank === 0 ? segsT : segsR).push([lensOut, v3(BAR0 - 0.02, y, -0.02), 0.5, 1]);
        });
        bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
        if (moved) S8.redraw(S);
        if (moved || !S8._raysOk || ex !== S8._ex) {
          raysTop.setSegments(segsT); raysRest.setSegments(segsR); S8._raysOk = true; S8._ex = ex;
          const zr = v3(LAY.out - 3.7 + 1.0, 2.2, 0.25), lensIn = v3(LAY.out - 1.35 - 0.5 - 0.55 * ex, 2.2, 0.25);
          const ins = [];
          for (let k = 0; k < 8; k++) ins.push([v3(LAY.out - 3.7 - 0.84 + k * 0.24, 2.2, 0.32), lensIn, 0, 0.5]);
          void zr; raysIn.setSegments(ins);
        }
        const k = t > 50 ? 1 : seg(t, 0.2, 0.9);
        raysIn.material.uniforms.uOpacity.value = 0.7 * k;
        raysTop.material.uniforms.uOpacity.value = 0.9 * grow; raysRest.material.uniforms.uOpacity.value = 0.45 * grow;
        tTop.position.set(BAR0 + S8.p[S8.order[0]] * BARW + 0.75, S8.rowY(0), 0.1);
        zL.update();
      };
      S8.focus = () => ({ target: v3(LAY.out + 0.1, 2.3, 0.1), pos: v3(LAY.out - 1.2, 4.3, 14.4) });
      return S8;
    })();

    /* ===================================================================== S9 LOSS & PERPLEXITY */
    const loss = (() => {
      const S9 = { id: 9 };
      const dA = new Dial({ r: 1.0, min: 0, max: 5, major: 1, minor: 0.25, label: "−log p(true word)", sub: "nats · this one prediction", color: CSS.amber });
      dA.position.set(LAY.loss - 1.95, 3.55, 0.25); scene.add(dA);
      const dB = new Dial({ r: 1.0, min: 1, max: 13, major: 2, minor: 1, label: "PPL = exp(NLL)", sub: "effective # of equal choices", color: CSS.cyan,
        marks: [{ v: 13, label: "uniform", color: CSS.bad }] });
      dB.position.set(LAY.loss + 1.95, 3.55, 0.25); scene.add(dB);
      for (const d of [dA, dB]) { mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 12), M.brass, d.position.x, 2.0, 0.05, scene); }
      const bw = 6.6, bh = 2.25, bx = LAY.loss, by = 0.32;
      mesh(RB(bw, bh, 0.12, 0.05), M.screen, bx, by + bh / 2, -0.2, scene);
      const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), 12);
      bars.count = 0; scene.add(bars);
      const nllLine = mesh(new THREE.BoxGeometry(1, 0.018, 0.02), M.glow(CSS.cyan, 1.5), bx, 1, 0.02, scene); nllLine.castShadow = false;
      const txt = textPlane(bw, bh, 220, { renderOrder: 7 }); txt.mesh.position.set(bx, by + bh / 2, -0.12); scene.add(txt.mesh);
      const tl = tag("Teacher forcing", "all positions in ONE parallel pass", { stages: [9], cy: 1 }); tl.position.set(bx, by + bh + 0.05, -0.1); scene.add(tl);
      const tn = tag("NLL = mean", "", { stages: [9], cy: 0.5, cx: 0, cls: "hot" }); scene.add(tn);
      S9.tau = 99; S9.n = 0;
      const H = (x) => Math.min(1.3, x * 1.45);
      hover.push({ obj: bars, info: (hit) => { const L = S9.L; if (!L) return null; const i = hit.instanceId; return `−log p(<b>${L.targets[i]}</b> | ${L.ctx[i]}) = <b>${L.loss[i].toFixed(4)}</b><br>p = ${L.p[i].toFixed(4)}`; } });
      S9.setData = (R, S) => {
        const L = R.tf; S9.L = L; S9.n = L.loss.length;
        dA.setValue(Math.min(5, R.stepLoss), `${R.stepLoss.toFixed(2)}`);
        dB.setValue(Math.min(13, L.ppl), `${L.ppl.toFixed(2)}`);
        const n = L.loss.length, pitch = Math.min(0.78, (bw - 1.0) / n), x0 = bx - (n - 1) * pitch / 2;
        S9.x = (i) => x0 + i * pitch; S9.pitch = pitch;
        txt.draw((c, Wp, Hp, ppu) => {
          const X = (x) => (x - bx + bw / 2) * ppu, Y = (y) => (by + bh - y) * ppu;
          c.textBaseline = "middle"; c.textAlign = "center";
          c.fillStyle = "#8b96a3"; c.font = `600 ${0.12 * ppu}px ${FONT}`;
          c.fillText(`per-position loss on “${L.words.join(" ")}”`, X(bx), Y(by + bh - 0.2));
          for (let i = 0; i < n; i++) {
            const x = S9.x(i);
            c.font = `600 ${0.13 * ppu}px ${FONT}`; c.fillStyle = "#dfe6ec"; c.fillText(L.targets[i], X(x), Y(by + 0.17));
            c.font = `500 ${0.085 * ppu}px ${FONT}`; c.fillStyle = "#6f7a86"; c.fillText(`after ${L.ctx[i]}`, X(x), Y(by + 0.04));
            c.font = `700 ${0.12 * ppu}px ${MONO}`; c.fillStyle = L.loss[i] > 0.3 ? CSS.amber : "#c5ced6";
            c.lineWidth = 0.03 * ppu; c.strokeStyle = "rgba(0,0,0,.85)"; c.lineJoin = "round";
            const ly = Y(by + 0.32 + H(L.loss[i]) + 0.14);
            c.strokeText(L.loss[i].toFixed(2), X(x), ly); c.fillText(L.loss[i].toFixed(2), X(x), ly);
          }
        });
        tn.setText(`NLL = ${L.nll.toFixed(3)}`, `PPL = e^${L.nll.toFixed(3)} = ${L.ppl.toFixed(2)}`);
      };
      S9.enter = (d = 0) => { S9.tau = -d; };
      S9.update = (dt, S) => {
        S9.tau += dt; dA.update(dt); dB.update(dt);
        const L = S9.L; if (!L) return;
        const t = S9.tau, n = S9.n;
        const grow = t > 50 ? 1 : ease.out(seg(t, 0.5, 1.5));
        const m4 = new THREE.Matrix4(), col = new THREE.Color();
        for (let i = 0; i < n; i++) {
          const h = Math.max(0.02, H(L.loss[i]) * grow);
          m4.compose(v3(S9.x(i), by + 0.32 + h / 2, -0.08), new THREE.Quaternion(), v3(Math.min(0.42, S9.pitch * 0.6), h, 0.12));
          bars.setMatrixAt(i, m4);
          col.set(CSS.amber).lerp(new THREE.Color(CSS.bad), clamp(L.loss[i] / 1.5)).multiplyScalar(0.55 + 0.6 * clamp(L.loss[i]));
          bars.setColorAt(i, col);
        }
        bars.count = n; bars.instanceMatrix.needsUpdate = true; if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
        const lineK = t > 50 ? 1 : seg(t, 1.5, 2.1);
        const w = (n - 1) * S9.pitch + 0.7;
        nllLine.scale.x = Math.max(0.001, w * lineK); nllLine.position.set(bx, by + 0.32 + H(L.nll), -0.02);
        tn.position.set(bx + w / 2 + 0.05, by + 0.32 + H(L.nll), 0);
        // needles start from 0 on enter
        if (t < 0.4) { dA.shown = dA.o.min; dB.shown = dB.o.min; }
      };
      S9.focus = () => ({ target: v3(LAY.loss, 2.3, 0.1), pos: v3(LAY.loss + 0.2, 4.0, 11.8) });
      return S9;
    })();

    /* ===================================================================== S10 DECODER + KV CACHE */
    const decoder = (() => {
      const S10 = { id: 10 };
      const x0 = LAY.decX0, P = LAY.decPitch, NM = 10;
      const X = (i) => x0 + i * P;
      const chips = [];
      for (let i = 0; i < NM; i++) { const c = new TokenChip("…", { color: CSS.cyan }); c.visible = false; scene.add(c); chips.push(c); }
      // shelf
      const shelfZ = -0.75, ys = [1.45, 2.2, 2.95, 3.7];
      const sw = (NM - 1) * P + 1.4, scx = x0 + (NM - 1) * P / 2;
      ys.forEach((y) => { mesh(RB(sw, 0.07, 1.0, 0.03), M.dark, scx, y - 0.06, shelfZ, scene); mesh(new THREE.BoxGeometry(sw, 0.03, 0.04), M.brass, scx, y - 0.03, shelfZ + 0.5, scene); });
      for (const sx of [-1, 1]) mesh(RB(0.12, 3.4, 1.0, 0.04), M.dark, scx + sx * (sw / 2 + 0.06), 2.3, shelfZ, scene);
      mesh(RB(sw + 0.4, 0.14, 1.1, 0.04), M.brassDim, scx, 4.08, shelfZ, scene);
      const rowNames = ["L1 · K", "L1 · V", "L2 · K", "L2 · V"], rowCol = [CSS.k, CSS.v, CSS.k, CSS.v];
      rowNames.forEach((nm, r) => { const tg = tag(nm, r % 2 ? "values" : "keys", { stages: [10], dot: rowCol[r], cx: 1 }); tg.position.set(scx - sw / 2 - 0.25, ys[r] + 0.2, shelfZ); scene.add(tg); });
      const cache = rowNames.map((_, r) => {
        const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), NM * 8);
        im.count = 0; scene.add(im); return im;
      });
      const stale = [];
      for (let i = 0; i < NM; i++) { const s = mesh(new THREE.BoxGeometry(P * 0.9, 2.55, 1.05), new THREE.MeshBasicMaterial({ color: hdr(CSS.bad, 0.6), transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false }), X(i), 2.55, shelfZ, scene); s.visible = false; s.castShadow = false; stale.push(s); }
      const brText = textPlane(sw, 0.5, 220, { renderOrder: 7 }); brText.mesh.position.set(scx, 4.42, shelfZ + 0.2); scene.add(brText.mesh);
      // gantry + chute
      mesh(new THREE.CylinderGeometry(0.05, 0.05, sw + 0.6, 12).rotateZ(Math.PI / 2), M.steel, scx, 4.95, 1.5, scene);
      for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.9, 12), M.steel, scx + sx * (sw / 2 + 0.3), 2.5, 1.5, scene);
      const carriage = new THREE.Group(); carriage.position.set(X(5), 4.95, 1.5); scene.add(carriage);
      mesh(RB(0.8, 0.36, 0.5, 0.05), M.brass, 0, 0, 0, carriage);
      const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.75, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x20262d, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); chute.position.y = -0.55; carriage.add(chute);
      mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 32).rotateX(Math.PI / 2), M.glow(CSS.amber, 2.2), 0, -0.93, 0, carriage);
      const qBar = new MatrixDisplay({ maxRows: 1, cols: 8, pitch: 0.13, kind: "q", title: "q (new token)", titleColor: CSS.q, labelW: 0.02, padR: 0.02, case: false, numbers: false, depth: 0.06, scale: 1.4, titleSize: 0.12 });
      qBar.visible = false; scene.add(qBar);
      const qRays = new Rays(CSS.q, { intensity: 1.8, density: 3, opacity: 0.8 }); scene.add(qRays);
      const tQ = tag("q used once, then thrown away", "queries are NOT cached", { stages: [10], dot: CSS.q, cy: 0 }); scene.add(tQ);
      const tCache = tag("KV cache", "grows +1 column per token, per layer, per head", { stages: [10], cy: 1, cls: "big" }); tCache.position.set(scx, 4.85, shelfZ); scene.add(tCache);
      const tStale = tag("stale K/V", "bidirectional mask: old tokens changed", { stages: [10], cls: "warn", cy: 1 }); scene.add(tStale);
      S10.tau = 99; S10.genTau = 99; S10.n = 0; S10.promptLen = 0; S10.stale = [];
      hover.push(...cache.map((im, r) => ({ obj: im, info: (hit) => {
        const R = S10.R; if (!R) return null; const i = Math.floor(hit.instanceId / 8), c = hit.instanceId % 8;
        const lay = R.F.layers[r >> 1], hd = lay.heads[c >> 2], vec = (r % 2 ? hd.v : hd.k)[i];
        return `${r % 2 ? "v" : "k"}<sub>${i + 1}</sub> layer ${(r >> 1) + 1} head ${(c >> 2) + 1} [${(c % 4) + 1}] = <b>${vec[c % 4].toFixed(4)}</b><br><span style="color:#7d8894">token “${R.words[i]}”</span>`; } })));
      S10.setData = (R, S) => {
        S10.R = R;
        const n = R.ids.length; const grew = n === S10.n + 1 && S10.n > 0;
        S10.n = n; S10.promptLen = R.promptLen;
        for (let i = 0; i < NM; i++) {
          const on = i < n; chips[i].visible = on; if (!on) continue;
          chips[i].setWord(R.words[i]);
          chips[i].setGlow(i >= R.promptLen ? CSS.amber : CSS.cyan, 2.2);
        }
        // cache contents: per layer K and V = [head1; head2]
        const m4 = new THREE.Matrix4(), col = new THREE.Color();
        cache.forEach((im, r) => {
          const lay = R.F.layers[r >> 1];
          let k = 0;
          for (let i = 0; i < n; i++) for (let c = 0; c < 8; c++) {
            const hd = lay.heads[c >> 2];
            const val = (r % 2 ? hd.v : hd.k)[i][c % 4];
            const hh = 0.04 + 0.42 * clamp(Math.abs(val) / 1.6);
            m4.compose(v3(X(i) - 0.455 + c * 0.13, ys[r] - 0.02 + hh / 2, shelfZ + 0.2), new THREE.Quaternion(), v3(0.1, hh, 0.06));
            im.setMatrixAt(k, m4);
            col.set(rowCol[r]).multiplyScalar(0.25 + 1.2 * clamp(Math.abs(val) / 1.6));
            if (val < 0) col.lerp(new THREE.Color(0.25, 0.25, 0.28), 0.45);
            im.setColorAt(k, col);
            k++;
          }
          im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        });
        S10.stale = R.stale || [];
        for (let i = 0; i < NM; i++) stale[i].visible = !!S10.stale[i];
        const si = S10.stale.findIndex(Boolean);
        tStale.userData.cond = () => si >= 0;
        if (si >= 0) tStale.position.set(X(si), 4.0, shelfZ + 0.6);
        const pl = R.promptLen;
        brText.draw((c, Wp, Hp, ppu) => {
          const XX = (x) => (x - scx + sw / 2) * ppu;
          c.textBaseline = "middle"; c.lineWidth = 0.02 * ppu;
          const seg2 = (a, b, color, label) => {
            if (b < a) return;
            const xa = XX(X(a) - P / 2 + 0.06), xb = XX(X(b) + P / 2 - 0.06);
            c.strokeStyle = color; c.beginPath(); c.moveTo(xa, Hp * 0.8); c.lineTo(xa, Hp * 0.6); c.lineTo(xb, Hp * 0.6); c.lineTo(xb, Hp * 0.8); c.stroke();
            c.fillStyle = color; c.font = `700 ${0.13 * ppu}px ${FONT}`; c.textAlign = "center"; c.fillText(label, (xa + xb) / 2, Hp * 0.3);
          };
          seg2(0, Math.min(pl, n) - 1, CSS.cyan, `PREFILL · ${pl} tokens in parallel`);
          if (n > pl) seg2(pl, n - 1, CSS.amber, n - pl === 1 ? "DECODE" : `DECODE · ${n - pl} steps`);
        });
        if (grew) S10.genTau = 0;
        // q of the newest token (layer 1, both heads) for the decode visual
        const lay = R.F.layers[0];
        qBar.setData([[...lay.heads[0].q[n - 1], ...lay.heads[1].q[n - 1]]], [""], { scale: 1.4 });
        const qs = [];
        for (let i = 0; i < n; i++) qs.push([v3(X(n - 1), 1.05, 2.25), v3(X(i), ys[0] + 0.15, shelfZ + 0.3), 0, 1]);
        qRays.setSegments(qs);
        qBar.position.set(X(n - 1), 0.98, 2.25);
        tQ.position.set(X(n - 1), 1.42, 2.25);
      };
      S10.enter = (d = 0) => { S10.tau = -d; };
      S10.update = (dt, S) => {
        S10.tau += dt; S10.genTau += dt;
        const n = S10.n, pl = S10.promptLen, t = S10.tau, gt = S10.genTau;
        // carriage parks above the next free slot
        const nextX = X(Math.min(NM - 1, n));
        const dropping = gt < 1.4;
        const target = dropping ? X(n - 1) : nextX;
        carriage.position.x = damp(carriage.position.x, target, 6, dt);
        for (let i = 0; i < n; i++) {
          const c = chips[i];
          let y = 0.62, s = 1;
          if (i === n - 1 && i >= pl && gt < 50) {
            const k = seg(gt, 0.35, 1.05);
            y = lerp(4.1, 0.62, ease.outBack(k)); s = lerp(0.6, 1, k);
            c.visible = gt > 0.35;
          } else c.visible = true;
          const pre = i < pl ? (t > 50 ? 1 : ease.outBack(seg(t, 0.2 + i * 0.05, 0.6 + i * 0.05))) : 1;
          c.position.set(X(i), y, 1.5); c.scale.setScalar(s * Math.max(0.001, pre));
        }
        // cache columns: prefill columns light together, decode columns fill after the drop
        const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
        void m4; void p; void q; void sc;
        cache.forEach((im) => {
          const prefillK = t > 50 ? 1 : seg(t, 0.4, 1.1);
          const decK = gt > 50 ? 1 : seg(gt, 1.5, 2.2);
          im.material.opacity = 1;
          im.userData.k = [prefillK, decK];
        });
        // scale cache rows via group visibility trick: dim by colour multiplier
        cache.forEach((im) => { im.visible = true; im.scale.y = 1; });
        const decK = gt > 50 ? 1 : seg(gt, 1.5, 2.2);
        const prefK = t > 50 ? 1 : seg(t, 0.4, 1.1);
        // per-column reveal by scaling instance matrices would be costly; emulate with a sweeping clip using count
        cache.forEach((im) => { im.count = 8 * (prefK < 1 ? Math.round(pl * prefK) : (n > pl && decK < 1 ? n - 1 : n)); });
        const showQ = n > pl && gt < 3.2;
        qBar.visible = showQ && gt > 1.0;
        qBar.update();
        qRays.visible = showQ && gt > 1.2;
        qRays.material.uniforms.uOpacity.value = seg(gt, 1.2, 1.6) * (1 - seg(gt, 2.4, 3.1)) * 0.85;
        qBar.scale.setScalar(Math.max(0.001, 1 - seg(gt, 2.4, 3.1)));
        tQ.userData.cond = () => showQ && gt > 1.0;
      };
      S10.focus = () => ({ target: v3(LAY.dec + 1.0, 2.3, 0.2), pos: v3(LAY.dec + 0.2, 5.4, 16.8) });
      return S10;
    })();

    return { gate, cabinet, position, layers, output, loss, decoder };
  };
})();
