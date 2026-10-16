/* The explainer: everything topic-specific lives in this one file (plus dx-compute.js).
   Example topic: "The Soft Lookup", three stations on a rail:
     1 MATCH    query q x keys k_i -> scores (dot products)
     2 SOFTMAX  scores / tau -> weights (histogram) + "effective choices" gauge
     3 BLEND    weights x values (colours) -> sum -> output colour
   Every number on screen comes from DXC.compute(S). Controls re-run it live.
   Station contract: { setData(R, S), enter(delay), update(dt, S), focus(S) -> {target, pos}, skipIntro() } */
(function () {
  "use strict";
  const C = window.DXC;
  const esc = (w) => String(w).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const f2 = (x) => x.toFixed(2);
  const pct = (x) => (x * 100).toFixed(x > 0.995 || x < 0.005 ? 0 : 1) + "%";
  const rgbCss = (v) => `rgb(${v.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255)).join(",")})`;

  // layout along the rail (world x). Data flows left -> right.
  const X = { q: -9.0, lens: -6.9, keys: -4.4, scores: -1.2, hist: 5.2, dial: 9.3, pucks: 14.4, sigma: 17.4, out: 19.6 };

  DX.define({
    title: ["THE SOFT", "LOOKUP"],
    pageTitle: "The Soft Lookup",
    description: "A query asks a tiny table of foods what it's craving. Dot products score every item, softmax turns scores into weights, and the answer is a <b>weighted blend</b> of the items. Same maths as attention. Every number is live.",
    backLink: null, // e.g. { href: "../index.html", text: "&larr; study hub" }
    colors: { query: "blue", key: "green", value: "purple", weight: "cyan", hard: "red" },   // one concept = one colour, everywhere
    bench: { x0: -12.5, x1: 22.5 },
    stations: [
      { name: "Match: q · k", short: "Match", plinth: { x: -5.1, w: 10.4, label: "match" } },
      { name: "Softmax with temperature", short: "Softmax", plinth: { x: 6.9, w: 8.8, label: "softmax" } },
      { name: "Blend: Σ w·v", short: "Blend", plinth: { x: 17.0, w: 8.6, label: "blend" } },
    ],
    state: { query: "sweet+red", tau: 1, mode: "soft" },
    controls: [
      { key: "query", label: "Query", hint: "what are you craving?", type: "seg", options: Object.keys(C.QUERIES).map((k) => [k, k]) },
      { key: "tau", label: "Temperature τ", hint: "drag", type: "range", min: 0.1, max: 3, step: 0.05, fmt: (v) => `τ = ${(+v).toFixed(2)}` },
      { key: "mode", label: "Selection", hint: "soft vs hard", type: "seg", options: [["soft", "Soft (softmax)"], ["hard", "Hard (argmax)"]] },
    ],
    compute: (S) => C.compute(S),
    // optional live strip in the bottom console
    console: (R) => C.ITEMS.map((it, i) => `<span class="tok${i === R.argmax ? " on" : ""}">${esc(it.name)}<sub>${pct(R.weights[i])}</sub></span>`).join(""),
    text,
    tour: [
      { stage: 1, dur: 8, acts: [[3.6, (api) => api.set("query", "crunchy")], [6.4, (api) => api.set("query", "sweet+red")]] },
      { stage: 2, dur: 9, acts: [[2.4, (api) => api.set("tau", 0.25)], [4.8, (api) => api.set("tau", 3)], [7.4, (api) => api.set("tau", 1)]] },
      { stage: 3, dur: 9.5, acts: [[2.6, (api) => api.set("mode", "hard")], [5.0, (api) => api.set("mode", "soft")], [6.4, (api) => api.set("explode", 1)], [8.6, (api) => api.set("explode", 0)]] },
    ],
    build,
  });

  /* ---------------------------------------------------------------- narration (numbers from R) */
  function text(stage, R, S) {
    const names = C.ITEMS.map((it) => it.name);
    const order = R.weights.map((w, i) => i).sort((a, b) => R.weights[b] - R.weights[a]);
    if (stage === 1) {
      const top = R.scores.map((s, i) => i).sort((a, b) => R.scores[b] - R.scores[a]);
      const k = C.ITEMS[R.argmax].key;
      return {
        chips: [["query", esc(S.query)], ["items", String(names.length)], ["best score", f2(R.scores[R.argmax])]],
        html: `<p>The <span class="c" style="--c:var(--c-query)">query</span> is a vector of what you want. Each item has a <span class="c" style="--c:var(--c-key)">key</span> describing what it is. Their <em>dot product</em> is the match score: big when they point the same way.</p>
          <p>Ranking for “${esc(S.query)}”: ${top.slice(0, 3).map((i) => `${esc(names[i])} <b class="mono">${f2(R.scores[i])}</b>`).join(", ")}.</p>
          <div class="fx">q · k<sub>${esc(names[R.argmax])}</sub> = ${R.q.map((x, j) => `${x}·${k[j]}`).join(" + ")} = ${f2(R.scores[R.argmax])}</div>`,
      };
    }
    if (stage === 2) {
      const hard = S.mode === "hard";
      return {
        chips: [["τ", f2(R.tau)], ["top weight", pct(R.weights[order[0]])], ["effective choices", f2(R.effective)]],
        html: `<p><em>Softmax</em> turns scores into weights that are positive and sum to 1: w = softmax(s / τ). ${hard ? `<span class="bad-c">Hard mode</span> skips it and puts 100% on the argmax.` : `Right now ${esc(names[order[0]])} gets ${pct(R.weights[order[0]])}.`}</p>
          <p><em>Temperature</em> τ sets how picky it is: low τ → nearly all weight on the winner, high τ → spread evenly. The gauge shows e<sup>H</sup>, the effective number of items being mixed (1 = one item, ${names.length} = all equally).</p>
          <div class="fx">w = softmax([${R.scores.map(f2).join(", ")}] / ${f2(R.tau)}) = [${R.weights.map(f2).join(", ")}]</div>`,
      };
    }
    const top = order.slice(0, 2);
    return {
      chips: [["output RGB", R.out.map(f2).join(" ")], ["biggest share", esc(names[order[0]])], ["mode", S.mode]],
      html: `<p>Each item carries a <span class="c" style="--c:var(--c-value)">value</span>, its colour. The answer is the <em>weighted sum</em> Σ w<sub>i</sub>·v<sub>i</sub>: beams are as thick as the weights, ${S.mode === "hard" ? `and only ${esc(names[top[0]])} has a beam at all.` : `so ${esc(names[top[0]])} (${pct(R.weights[top[0]])}) and ${esc(names[top[1]])} (${pct(R.weights[top[1]])}) dominate the blend.`}</p>
        <p>${S.mode === "hard" ? "Hard selection returns exactly one item's colour: crisp, but not differentiable." : "Soft selection blends, so small changes to the query nudge the colour smoothly (that's why models use it)."}</p>
        <div class="fx">out = Σ w·v = [${R.out.map(f2).join(", ")}]</div>`,
    };
  }

  /* ---------------------------------------------------------------- the machine */
  function build(ctx) {
    const { THREE, K, scene, hover } = ctx;
    const { M, mesh, RB, CSS, hdr, seg, ease, lerp, damp, MatrixDisplay, Rays, Beam, Dial, tag, textPlane, FONT, MONO } = K;
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const N = C.ITEMS.length;
    const names = C.ITEMS.map((it) => it.name);
    const regHover = (d) => hover.push({ obj: d.cells, info: (hit) => d.hover(hit.instanceId) });
    function stand(x, z, yTop, w = 1.6) {
      const g = new THREE.Group(); g.position.set(x, 0.22, z); scene.add(g);
      mesh(RB(w + 0.3, 0.12, 0.7, 0.04), M.dark, 0, 0.06, 0, g);
      for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.035, 0.035, Math.max(0.05, yTop - 0.12), 10), M.brass, sx * w / 2, (yTop + 0.12) / 2, 0, g);
      return g;
    }

    /* ======================= 1 · MATCH ======================= */
    const s1 = (() => {
      const st = { tau: 99 };
      const qD = new MatrixDisplay({ maxRows: 1, cols: 4, pitch: 0.36, kind: "query", title: "query q", titleColor: CSS.query, labelW: 0.1, padR: 0.08,
        scale: 1, colLabels: C.FEATURES, sym: (r, c) => `q[${C.FEATURES[c]}]` });
      qD.position.set(X.q, 2.35, 0.3); scene.add(qD); regHover(qD); stand(X.q, 0.3, 2.13, 1.6);
      const kD = new MatrixDisplay({ maxRows: N, cols: 4, pitch: 0.36, kind: "key", title: "keys k (one row per item)", titleColor: CSS.key, labelW: 1.25,
        scale: 1, colLabels: C.FEATURES, sym: (r, c) => `k<sub>${esc(names[r])}</sub>[${C.FEATURES[c]}]` });
      kD.position.set(X.keys, 0.75, 0.3); scene.add(kD); regHover(kD); stand(X.keys, 0.3, 0.53, 1.6);
      const sD = new MatrixDisplay({ maxRows: N, cols: 1, pitch: 0.36, kind: "div", title: "score q·k", titleColor: CSS.accent, labelW: 0.1, padR: 0.08,
        scale: 1.6, sym: (r) => `q · k<sub>${esc(names[r])}</sub>` });
      sD.position.set(X.scores, 0.75, 0.3); scene.add(sD); regHover(sD); stand(X.scores, 0.3, 0.53, 0.6);
      // the lens: the query "shines through" every key row
      const lens = new THREE.Group(); lens.position.set(X.lens, 1.9, 0.45); scene.add(lens);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 48).rotateX(Math.PI / 2), M.tint(CSS.query, 0.14, 0.05)); disc.renderOrder = 4; lens.add(disc);
      lens.add(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 10, 64), M.glow(CSS.query, 1.7)));
      const gear = mesh(K.gearGeo(0.62, 0.55, 36, 0.05, 0.1), M.brass, 0, 0, -0.02, lens);
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 12), M.brass, 0, -1.25, -0.02, lens);
      mesh(RB(0.62, 0.12, 0.62, 0.04), M.dark, 0, -1.92, -0.02, lens);
      const raysQ = new Rays(CSS.query, { intensity: 0.9, density: 2.2, opacity: 0.6 }); scene.add(raysQ);
      const raysS = new Rays(CSS.accent, { intensity: 1.2, density: 2.5, opacity: 0.6 }); scene.add(raysS);
      const tq = tag("query", "what you want", { stages: [1], dot: CSS.query, cy: 1 }); tq.position.set(X.q, 3.45, 0.3); scene.add(tq);
      const tk = tag("keys", "what each item is", { stages: [1], dot: CSS.key, cy: 1 }); scene.add(tk);
      const ts = tag("score = q · k", "hover a cell", { stages: [1], dot: CSS.accent, cy: 1 }); scene.add(ts);
      st.setData = (R) => {
        qD.setData([R.q], ["q"]);
        kD.setData(R.keys, names);
        sD.setData(R.scores.map((s) => [s]), [""]);
        sD.setHighlight(-1);
        kD.dimRows = null;
        const segsQ = [], segsS = [];
        for (let c = 0; c < 4; c++) segsQ.push([v3(X.q - 0.54 + c * 0.36, 2.35 + 0.18, 0.38), v3(X.lens, 1.9, 0.45), 0, 0.5]);
        for (let i = 0; i < N; i++) {
          const y = 0.75 + kD.rowY(i);
          segsQ.push([v3(X.lens, 1.9, 0.45), v3(X.keys - 0.78, y, 0.35), 0.5, 1]);
          segsS.push([v3(X.keys + 0.78, y, 0.35), v3(X.scores - 0.22, 0.75 + sD.rowY(i), 0.35), 0, 1]);
        }
        raysQ.setSegments(segsQ); raysS.setSegments(segsS);
        tk.position.set(X.keys - 0.3, 0.75 + N * 0.36 + 0.9, 0.3);
        ts.position.set(X.scores, 0.75 + N * 0.36 + 0.75, 0.3);
      };
      st.enter = (d = 0) => { st.tau = -d; };
      st.skipIntro = () => { st.tau = 99; };
      st.update = (dt, S) => {
        st.tau += dt; const t = st.tau, ex = S.explodeAmt;
        for (let i = 0; i < N; i++) {
          kD.setRowAmt(i, t > 50 ? 1 : ease.outBack(seg(t, 0.2 + i * 0.08, 0.6 + i * 0.08)));
          sD.setRowAmt(i, t > 50 ? 1 : ease.outBack(seg(t, 1.3 + i * 0.12, 1.7 + i * 0.12)));
        }
        sD.numAlpha = t > 50 ? 1 : seg(t, 1.6, 2.4);
        raysQ.material.uniforms.uOpacity.value = 0.6 * (t > 50 ? 1 : seg(t, 0.4, 1.0));
        raysS.material.uniforms.uOpacity.value = 0.6 * (t > 50 ? 1 : seg(t, 1.2, 1.8));
        disc.material.emissiveIntensity = 0.1 + 0.9 * (t < 50 ? seg(t, 0.4, 0.8) * (1 - seg(t, 1.2, 1.8)) : 0);
        gear.rotation.z += dt * 0.15;
        // exploded: pull the parts apart in depth so the light paths read as separate stages
        qD.position.z = 0.3 + 1.0 * ex; lens.position.z = 0.45 + 0.5 * ex; sD.position.z = 0.3 - 0.6 * ex;
        raysQ.position.z = 0; qD.update(); kD.update(); sD.update();
      };
      st.focus = () => ({ target: v3(-5.2, 1.75, 0.3), pos: v3(-5.6, 4.0, 12.6), fit: 10.4 });
      return st;
    })();

    /* ======================= 2 · SOFTMAX ======================= */
    const s2 = (() => {
      const st = { tau: 99, ys: new Array(N).fill(null) };
      const bx = X.hist, rp = 0.42, by0 = 0.62, bw = 4.4, bh = N * rp + 0.95;
      mesh(RB(bw, bh, 0.12, 0.05), M.screen, bx, by0 + bh / 2 - 0.2, -0.15, scene);
      const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), N); scene.add(bars);
      const txt = textPlane(bw, bh, 220, { renderOrder: 7 }); txt.mesh.position.set(bx, by0 + bh / 2 - 0.2, -0.07); scene.add(txt.mesh);
      const BAR0 = bx - bw / 2 + 1.25, BARW = 2.3;
      const dial = new Dial({ r: 0.95, min: 1, max: N, major: 1, minor: 0.25, label: "effective choices", sub: "e^H of the weights", color: CSS.accent });
      dial.position.set(X.dial, 2.7, 0.3); scene.add(dial);
      mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 12), M.brass, X.dial, 1.0, 0.1, scene);
      mesh(RB(1.0, 0.14, 0.8, 0.04), M.dark, X.dial, 0.29, 0.1, scene);
      const th = tag("w = softmax(s / τ)", "bars sum to 1", { stages: [2], dot: CSS.weight, cy: 1 }); th.position.set(bx, by0 + bh - 0.1, -0.1); scene.add(th);
      const tHard = tag("hard: argmax", "100% on the winner", { stages: [2, 3], dot: CSS.hard, cls: "warn", cy: 0.5, cx: 0, cond: (S) => S.mode === "hard" }); scene.add(tHard);
      hover.push({ obj: bars, info: (hit) => { const R = st.R; if (!R) return null; const i = hit.instanceId;
        return `w<sub>${esc(names[i])}</sub> = <b>${R.weights[i].toFixed(4)}</b><br>score ${R.scores[i].toFixed(3)} / τ ${R.tau.toFixed(2)} = ${R.logits[i].toFixed(3)}`; } });
      st.rowY = (rank) => by0 + (N - 1 - rank) * rp + rp / 2;
      st.setData = (R) => {
        st.R = R;
        st.order = R.weights.map((w, i) => i).sort((a, b) => R.weights[b] - R.weights[a] || a - b);
        dial.setValue(R.effective, R.effective.toFixed(2));
        tHard.position.set(BAR0 + BARW + 0.2, st.rowY(0), 0);
        st.redraw();
      };
      st.redraw = () => {
        const R = st.R;
        txt.draw((c, Wp, Hp, ppu) => {
          const Xp = (x) => (x - (bx - bw / 2)) * ppu, Yp = (y) => (by0 + bh - 0.2 - y) * ppu;
          c.textBaseline = "middle";
          c.fillStyle = "#8b96a3"; c.font = `600 ${0.13 * ppu}px ${FONT}`; c.textAlign = "left";
          c.fillText(`weights · τ = ${R.tau.toFixed(2)}${R.mode === "hard" ? " · HARD" : ""}`, Xp(bx - bw / 2 + 0.15), Yp(by0 + N * rp + 0.32));
          c.textAlign = "right"; c.fillStyle = "#5c6672"; c.font = `600 ${0.09 * ppu}px ${FONT}`; c.fillText("score / τ", Xp(bx + bw / 2 - 0.1), Yp(by0 + N * rp + 0.32));
          st.order.forEach((i, rank) => {
            const y = st.ys[i] == null ? st.rowY(rank) : st.ys[i];
            c.font = `${rank === 0 ? 700 : 500} ${0.17 * ppu}px ${FONT}`; c.textAlign = "right";
            c.fillStyle = rank === 0 ? CSS.accent : "#c5ced6"; c.fillText(names[i], Xp(BAR0 - 0.1), Yp(y));
            c.font = `${rank === 0 ? 700 : 500} ${0.14 * ppu}px ${MONO}`; c.textAlign = "left"; c.fillStyle = rank === 0 ? "#fff" : "#8b96a3";
            c.fillText(pct(R.weights[i]), Xp(BAR0 + Math.max(0.02, R.weights[i] * BARW) + 0.08), Yp(y));
            c.fillStyle = "#59636e"; c.font = `500 ${0.11 * ppu}px ${MONO}`; c.textAlign = "right"; c.fillText(K.fmt(R.logits[i], 1), Xp(bx + bw / 2 - 0.1), Yp(y));
          });
        });
      };
      st.enter = (d = 0) => { st.tau = -d; };
      st.skipIntro = () => { st.tau = 99; };
      st.update = (dt, S) => {
        st.tau += dt; dial.update(dt);
        const R = st.R; if (!R) return;
        const t = st.tau, grow = t > 50 ? 1 : ease.out(seg(t, 0.4, 1.4));
        if (t < 0.3 && t > -5) dial.shown = dial.o.min;
        const m4 = new THREE.Matrix4(), col = new THREE.Color();
        let moved = false;
        st.order.forEach((i, rank) => {
          const yT = st.rowY(rank), y0 = st.ys[i] == null ? yT : st.ys[i], y = damp(y0, yT, 8, dt);
          if (Math.abs(y - y0) > 1e-4) moved = true;
          st.ys[i] = y;
          const len = Math.max(0.015, R.weights[i] * BARW * grow);
          m4.compose(v3(BAR0 + len / 2, y, -0.03), new THREE.Quaternion(), v3(len, 0.26, 0.12));
          bars.setMatrixAt(i, m4);
          col.setRGB(...C.ITEMS[i].value).multiplyScalar(0.35 + 1.25 * Math.sqrt(R.weights[i]));   // tinted by the item's own colour
          bars.setColorAt(i, col);
        });
        bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
        if (moved) st.redraw();
        dial.position.z = 0.3 + 0.9 * S.explodeAmt;
      };
      st.focus = () => ({ target: v3(6.7, 2.0, 0.2), pos: v3(6.3, 3.8, 11.0), fit: 9.2 });
      return st;
    })();

    /* ======================= 3 · BLEND ======================= */
    const s3 = (() => {
      const st = { tau: 99 };
      const puckX = (i) => X.pucks - 1.6 + i * 0.8;
      const pucks = [], beams = [], flyers = [];
      for (let i = 0; i < N; i++) {
        const col = new THREE.Color().setRGB(...C.ITEMS[i].value);
        const g = new THREE.Group(); g.position.set(puckX(i), 0.22, 1.3); scene.add(g);
        mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.12, 32), M.dark, 0, 0.06, 0, g);
        // true colours: keep swatches below the bloom threshold (0.9) so they read as the actual RGB, not white glare
        const sw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.85), toneMapped: false }));
        sw.position.y = 0.36; g.add(sw);
        const lab = textPlane(1.0, 0.36, 260); lab.mesh.position.set(0, 0.02, 0.44); g.add(lab.mesh);
        pucks.push({ g, sw, lab });
        const b = new Beam("#ffffff", { density: 3, speed: 1.0, intensity: 2.0, opacity: 0.9 });
        b.material.uniforms.uColor.value.copy(col); scene.add(b); beams.push(b);
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2), toneMapped: false }));
        f.visible = false; scene.add(f); flyers.push(f);
      }
      // the Σ funnel: a brass cone that collects the weighted values
      const fun = new THREE.Group(); fun.position.set(X.sigma, 1.25, 0.6); scene.add(fun);
      mesh(new THREE.CylinderGeometry(0.62, 0.16, 0.9, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xb98432, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }), 0, 0, 0, fun);
      mesh(new THREE.TorusGeometry(0.62, 0.04, 10, 48).rotateX(Math.PI / 2), M.brass, 0, 0.45, 0, fun);
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 12), M.brass, 0, -0.95, 0, fun);
      mesh(RB(0.8, 0.12, 0.8, 0.04), M.dark, 0, -1.5, 0, fun);
      const sig = textPlane(0.6, 0.6, 220); sig.draw((c, w, h) => { c.fillStyle = CSS.accent; c.font = `700 ${h * 0.8}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("Σ", w / 2, h / 2); });
      sig.mesh.position.set(0, 0.0, 0.66); fun.add(sig.mesh);
      // output: a glowing orb in the blended colour + its RGB numbers
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 24), orbMat); orb.position.set(X.out, 2.0, 0.4); scene.add(orb);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 12, 64), M.brass); halo.position.copy(orb.position); scene.add(halo);
      const haloGlow = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.012, 8, 96), M.glow(CSS.accent, 2.2)); haloGlow.position.copy(orb.position); scene.add(haloGlow);
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 12), M.brass, X.out, 0.95, 0.4, scene);
      mesh(RB(1.0, 0.12, 0.8, 0.04), M.dark, X.out, 0.28, 0.4, scene);
      const outD = new MatrixDisplay({ maxRows: 1, cols: 3, pitch: 0.36, kind: "div", title: "out = Σ w·v", titleColor: CSS.accent, labelW: 0.1, padR: 0.08,
        scale: 1, colLabels: ["R", "G", "B"], sym: (r, c) => `out[${"RGB"[c]}]` });
      outD.position.set(X.out, 2.9, 0.4); scene.add(outD); regHover(outD);
      const outRay = new Rays(CSS.accent, { intensity: 1.4, density: 2.5, opacity: 0.7 }); scene.add(outRay);
      outRay.setSegments([[v3(X.sigma, 0.8, 0.6), v3(X.out - 0.45, 2.0, 0.4), 0, 1]]);
      const tv = tag("values v = colours", "", { stages: [3], dot: CSS.value, cy: 0 }); tv.position.set(X.pucks, -0.15, 1.6); scene.add(tv);
      const tsum = tag("Σ w·v", "beam width ∝ weight", { stages: [3], dot: CSS.weight, cy: 1 }); tsum.position.set(X.sigma, 2.2, 0.6); scene.add(tsum);
      st.setData = (R) => {
        st.R = R;
        outD.setData([R.out], ["out"]);
        orbMat.color.setRGB(...R.out).multiplyScalar(0.88);
        for (let i = 0; i < N; i++) {
          const w = R.weights[i];
          pucks[i].lab.draw((c, Wp, Hp, ppu) => {
            c.textAlign = "center"; c.textBaseline = "middle";
            c.font = `600 ${0.13 * ppu}px ${FONT}`; c.fillStyle = "#dfe6ec"; c.fillText(names[i], Wp / 2, Hp * 0.3);
            c.font = `700 ${0.13 * ppu}px ${MONO}`; c.fillStyle = w > 0.005 ? CSS.accent : "#59636e"; c.fillText("w " + pct(w), Wp / 2, Hp * 0.75);
          });
          beams[i].visible = w > 1e-4;
        }
        st.layoutBeams(ctx.S.explodeAmt);
      };
      // beams are rebuilt when weights change or the pucks move (exploded view)
      st.layoutBeams = (ex) => {
        st._ex = ex;
        for (let i = 0; i < N; i++) {
          const a = v3(puckX(i), 0.6, 1.3 + 0.8 * ex * ((i % 2) ? 1 : -0.4)), b = v3(X.sigma, 1.62 + 0.4 * ex, 0.6);
          const mid = a.clone().lerp(b, 0.5); mid.y += 1.2;
          beams[i].curve = new THREE.QuadraticBezierCurve3(a, mid, b);
          beams[i].setCurve(beams[i].curve, 0.004 + 0.075 * Math.sqrt(st.R.weights[i]));
        }
      };
      st.enter = (d = 0) => { st.tau = -d; };
      st.skipIntro = () => { st.tau = 99; };
      st.update = (dt, S) => {
        st.tau += dt; const t = st.tau, ex = S.explodeAmt, R = st.R; if (!R) return;
        if (Math.abs(ex - st._ex) > 0.004) st.layoutBeams(ex);
        const bk = t > 50 ? 1 : seg(t, 0.4, 1.2);
        for (let i = 0; i < N; i++) {
          beams[i].material.uniforms.uOpacity.value = 0.9 * bk;
          const fk = t > 50 ? 1 : ease.inOut(seg(t, 1.0 + i * 0.15, 2.2 + i * 0.15));
          flyers[i].visible = fk > 0 && fk < 1 && R.weights[i] > 0.01;
          if (flyers[i].visible) { flyers[i].position.copy(beams[i].curve.getPoint(fk)); flyers[i].scale.setScalar(0.5 + 1.5 * Math.sqrt(R.weights[i])); }
          pucks[i].g.position.z = 1.3 + 0.8 * ex * ((i % 2) ? 1 : -0.4);
          pucks[i].sw.position.y = 0.36 + Math.sin(S.time * 1.4 + i) * 0.02;
        }
        const ok = t > 50 ? 1 : ease.outBack(seg(t, 2.2, 2.8));
        orb.scale.setScalar(Math.max(0.001, ok)); outD.setRowAmt(0, ok); outD.numAlpha = t > 50 ? 1 : seg(t, 2.6, 3.0);
        outRay.material.uniforms.uOpacity.value = 0.7 * (t > 50 ? 1 : seg(t, 2.0, 2.6));
        halo.rotation.y += dt * 0.6; haloGlow.rotation.x = Math.sin(S.time * 0.8) * 0.4; outD.update();
        fun.position.y = 1.25 + 0.4 * ex;
      };
      st.focus = () => ({ target: v3(16.9, 1.8, 0.6), pos: v3(16.4, 3.7, 11.2), fit: 8.8 });
      return st;
    })();

    return [s1, s2, s3];
  }
})();
