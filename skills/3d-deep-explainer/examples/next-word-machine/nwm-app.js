/* The Next-Word Machine — app: renderer + post, state, UI, camera director, tour, record mode. */
(function () {
  "use strict";
  const NWMX = (window.NWMX = window.NWMX || {});

  NWMX.start = async function (THREE, A) {
    const D = window.NWM_DATA, NWM = window.NWM;
    const $ = (id) => document.getElementById(id);
    const params = new URLSearchParams(location.search);
    const RECORD = params.has("record");
    const lmsg = $("lmsg"), lfill = $("lfill");
    const progress = (p, m) => { lfill.style.width = Math.round(p * 100) + "%"; if (m) lmsg.textContent = m; };
    if (RECORD) document.body.classList.add("record");
    progress(0.2, "loading fonts…");
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      await Promise.race([Promise.all([
        document.fonts.load('600 40px "Outfit"'), document.fonts.load('700 40px "Outfit"'), document.fonts.load('500 40px "Outfit"'),
        document.fonts.load('600 40px "JetBrains Mono"'), document.fonts.load('700 40px "JetBrains Mono"'), document.fonts.load('500 40px "JetBrains Mono"'),
      ]), wait(3500)]);
    } catch (e) { /* fonts are optional */ }

    progress(0.35, "building the machine…");
    const K = NWMX.core(THREE, A);
    const { CSS } = K;

    // ---------------- renderer + post ----------------
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: RECORD });
    } catch (e) { lmsg.textContent = "WebGL is not available in this browser."; return; }
    let PR = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(PR);
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    $("stage").appendChild(renderer.domElement);
    const labelRenderer = new A.CSS2DRenderer({ element: $("labels") });
    labelRenderer.setSize(innerWidth, innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 400);
    camera.position.set(-26, 4, 9);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new A.RoomEnvironment(renderer), 0.04).texture;

    // MSAA only when pixels are big; at retina density it costs a lot and buys little
    const rt = new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType, samples: PR >= 1.75 ? 0 : 4 });
    const composer = new A.EffectComposer(renderer, rt);
    composer.setPixelRatio(PR);
    composer.setSize(innerWidth, innerHeight);
    composer.addPass(new A.RenderPass(scene, camera));
    const bloom = new A.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.55, 0.9);
    composer.addPass(bloom);
    const grain = new A.ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmt: { value: 0.045 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmt; uniform vec2 uRes; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){ vec2 d = vUv - 0.5; float r2 = dot(d, d); vec2 off = d * r2 * 0.004;
          vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
          float vig = smoothstep(1.05, 0.28, length(d * vec2(1.0, 1.15)));
          c *= mix(0.42, 1.0, vig);
          float n = hash(floor(vUv * uRes) + fract(uTime * 7.0) * 113.0) - 0.5;
          c += n * uAmt * (0.25 + c);
          gl_FragColor = vec4(max(c, 0.0), 1.0); }`,
    });
    composer.addPass(grain);
    composer.addPass(new A.OutputPass());

    const controls = new A.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 2.5; controls.maxDistance = 45; controls.maxPolarAngle = Math.PI * 0.53;
    controls.screenSpacePanning = true; controls.rotateSpeed = 0.6; controls.zoomSpeed = 0.8;
    if (RECORD) controls.enabled = false;

    // ---------------- state ----------------
    const VOC = D.vocab, ID = {};
    VOC.forEach((w, i) => (ID[w] = i));
    const S = {
      stage: 1, model: "dense", mask: "causal", layer: 0, head: 0, t: 4, tFollow: true, attnMode: "softmax", trueWord: "Claude",
      explode: 0, explodeAmt: 0, decMethod: "greedy", k: 3, p: 0.9, seed: 723, genCount: 0, time: 0,
      ids: [], prompt: [], promptLen: 0, prevF: null, staleMap: [], lastDec: null,
    };
    const ctx = { scene, hover: [], DATA: D, S };
    progress(0.5, "assembling stations…");
    const world = NWMX.world(THREE, A, K, ctx);
    const ST = NWMX.stations(THREE, A, K, ctx, world);
    const { gate, cabinet, position, layers, output, loss, decoder } = ST;

    // ---------------- model run ----------------
    let R = null;
    function blockBoundary(ids) { const i = ids.indexOf(ID.LLM); return i > 0 ? i : Math.max(1, Math.floor(ids.length / 2)); }
    function compute(opts = {}) {
      const model = D[S.model];
      const ids = S.ids, n = ids.length;
      if (S.tFollow || S.t > n - 1) S.t = n - 1;
      const blockB = blockBoundary(ids);
      const mask = { kind: S.mask, W: 2, block: blockB };
      const F = NWM.forward(model, ids, { mask });
      const words = ids.map((i) => VOC[i]);
      // teacher forcing: current sequence + the true next word (+ "." after an LLM name)
      const tfIds = ids.concat([ID[S.trueWord]]);
      if (["Claude", "ChatGPT", "Gemini", "Qwen"].includes(S.trueWord) && tfIds.length < 10) tfIds.push(ID["."]);
      const tfIdsC = tfIds.slice(0, 10);
      const Ft = NWM.forward(model, tfIdsC, { mask: { kind: S.mask, W: 2, block: blockBoundary(tfIdsC) } });
      const tf = { words: tfIdsC.map((i) => VOC[i]), targets: [], ctx: [], loss: [], p: [] };
      for (let i = 0; i < tfIdsC.length - 1; i++) {
        const p = Ft.probs[i][tfIdsC[i + 1]];
        tf.targets.push(VOC[tfIdsC[i + 1]]); tf.ctx.push(VOC[tfIdsC[i]]); tf.p.push(p); tf.loss.push(-Math.log(p));
      }
      tf.nll = tf.loss.reduce((a, b) => a + b, 0) / tf.loss.length;
      tf.ppl = Math.exp(tf.nll);
      const stepP = F.probs[n - 1][ID[S.trueWord]];
      // receptive field of the last token after L layers (boolean A^L)
      let reach = F.allowed[n - 1].slice();
      for (let l = 1; l < model.layers.length; l++) {
        const nx = new Array(n).fill(false);
        for (let j = 0; j < n; j++) if (reach[j]) for (let s = 0; s < n; s++) if (F.allowed[j][s]) nx[s] = true;
        reach = nx;
      }
      // stale-cache detection after a decode step
      let stale = S.staleMap;
      if (opts.decoded && S.prevF) {
        stale = [];
        for (let i = 0; i < S.prevF.n; i++) {
          let diff = 0;
          for (let l = 0; l < 2; l++) for (let h = 0; h < 2; h++) {
            const a = S.prevF.layers[l].heads[h], b = F.layers[l].heads[h];
            for (let e = 0; e < 4; e++) diff = Math.max(diff, Math.abs(a.k[i][e] - b.k[i][e]), Math.abs(a.v[i][e] - b.v[i][e]));
          }
          stale[i] = diff > 1e-9 || !!S.staleMap[i];
        }
      } else if (!opts.keepStale) stale = [];
      S.staleMap = stale;
      R = { F, words, ids, model, promptLen: S.promptLen, tf, stepP, stepLoss: -Math.log(stepP), params: NWM.paramCounts(model), blockB,
        receptive: reach.filter(Boolean).length, unreachable: reach.map((ok, i) => (ok ? -1 : i)).filter((i) => i >= 0), stale, dec: S.lastDec };
      gate.setData(R, S); cabinet.setData(R, S); position.setData(R, S);
      layers.forEach((L) => L.setData(R, S));
      output.setData(R, S); loss.setData(R, S); decoder.setData(R, S);
      updateUI();
    }

    // ---------------- input parsing ----------------
    const PRESETS = ["My favorite LLM is", "My least favorite LLM is", "Your favorite LLM is", "Your least favorite LLM is",
      "My favorite LLM is Claude", "My favorite LLM is Claude .", "My favorite", "LLM is", "is LLM favorite My"];
    const lower = {}; VOC.forEach((w) => (lower[w.toLowerCase()] = w));
    function parse(text) {
      const raw = text.replace(/([.])/g, " $1 ").trim().split(/\s+/).filter(Boolean);
      const out = [], bad = [];
      for (const r of raw) { const w = lower[r.toLowerCase()]; if (w) out.push(w); else bad.push(r); }
      if (bad.length) return { err: `“${bad.join(" ")}” isn't in this ${VOC.length}-word vocab. Try: ${VOC.filter((w) => !w.startsWith("<")).join(" · ")}` };
      if (out[0] !== "<s>") out.unshift("<s>");
      if (out.length > 10) return { err: "Max 10 tokens: the learned position table P only has 10 rows." };
      if (out.length < 2) return { err: "Type at least one word." };
      return { ids: out.map((w) => ID[w]) };
    }
    function setInput(text) {
      const r = parse(text);
      $("inErr").textContent = r.err || "";
      if (r.err) return false;
      S.prompt = r.ids.slice(); S.ids = r.ids.slice(); S.promptLen = r.ids.length; S.tFollow = true; S.genCount = 0; S.prevF = null; S.staleMap = []; S.lastDec = null;
      $("inText").value = text;
      compute();
      gate.enter(); cabinet.enter();
      return true;
    }

    // ---------------- UI ----------------
    const stagesDef = NWMX.STAGES;
    const film = $("film");
    stagesDef.forEach((st) => {
      const f = document.createElement("div");
      f.className = "frame"; f.dataset.stage = st.n;
      f.innerHTML = `<span><b>${String(st.n).padStart(2, "0")}</b>${st.short}</span>`;
      f.onclick = () => { stopTour(); goStage(st.n); };
      film.appendChild(f);
    });
    const pick = $("inPick");
    pick.innerHTML = `<option value="" disabled selected>▾</option>` + PRESETS.map((p) => `<option>${p}</option>`).join("");
    pick.onchange = () => { stopTour(); setInput(pick.value); pick.selectedIndex = 0; };
    $("inText").addEventListener("keydown", (e) => { if (e.key === "Enter") { stopTour(); setInput(e.target.value); e.target.blur(); } e.stopPropagation(); });
    const trueSeg = $("trueSeg");
    trueSeg.style.flexWrap = "wrap";
    VOC.filter((w) => w !== "<s>").forEach((w) => {
      const b = document.createElement("button"); b.dataset.v = w; b.textContent = w; b.style.flex = "0 0 auto"; b.style.padding = "4px 7px";
      trueSeg.appendChild(b);
    });
    document.querySelectorAll(".seg[data-key]").forEach((seg) => {
      seg.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        stopTour();
        setKey(seg.dataset.key, b.dataset.v);
      });
    });
    function setKey(key, v) {
      if (key === "model") { S.model = v; compute({ keepStale: true }); }
      else if (key === "explode") { S.explode = +v; refocus(1.4); }
      else if (key === "mask") { S.mask = v; S.staleMap = []; compute(); }
      else if (key === "layer") { S.layer = +v; compute({ keepStale: true }); refocus(1.3); }
      else if (key === "head") { S.head = +v; compute({ keepStale: true }); }
      else if (key === "attnMode") { S.attnMode = v; layers.forEach((L) => L.drawAtt(S)); updateUI(); }
      else if (key === "trueWord") { S.trueWord = v; compute({ keepStale: true }); loss.enter(); }
      else if (key === "decMethod") { S.decMethod = v; updateUI(); }
    }
    $("tSlider").addEventListener("input", (e) => { stopTour(); S.t = +e.target.value; S.tFollow = S.t === S.ids.length - 1; compute({ keepStale: true }); });
    $("kSlider").addEventListener("input", (e) => { S.k = +e.target.value; updateUI(); });
    $("pSlider").addEventListener("input", (e) => { S.p = +e.target.value; updateUI(); });
    $("genBtn").onclick = () => { stopTour(); generate(); };
    $("resetBtn").onclick = () => { stopTour(); resetGen(); };
    $("tourBtn").onclick = () => (tour.on ? stopTour() : startTour());
    $("helpBtn").onclick = () => $("help").classList.toggle("on");
    $("prevBtn").onclick = () => { stopTour(); goStage(Math.max(1, S.stage - 1)); };
    $("nextBtn").onclick = () => { stopTour(); goStage(Math.min(10, S.stage + 1)); };
    $("sheetToggle").onclick = () => $("panel").classList.toggle("open");
    $("scrub").addEventListener("click", (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      stopTour(); goStage(1 + Math.round(K.clamp((e.clientX - r.left) / r.width) * 9));
    });
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" && e.target.type === "text") return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) { stopTour(); goStage(k === "0" ? 10 : +k); }
      else if (k === "ArrowRight") { stopTour(); goStage(Math.min(10, S.stage + 1)); }
      else if (k === "ArrowLeft") { stopTour(); goStage(Math.max(1, S.stage - 1)); }
      else if (k === "x" || k === "X") { stopTour(); setKey("explode", S.explode ? 0 : 1); }
      else if (k === "m" || k === "M") { stopTour(); setKey("model", S.model === "dense" ? "moe" : "dense"); }
      else if (k === "l" || k === "L") { stopTour(); setKey("layer", S.layer ? 0 : 1); }
      else if (k === "h" || k === "H") { stopTour(); setKey("head", S.head ? 0 : 1); }
      else if (k === "t" || k === "T") { tour.on ? stopTour() : startTour(); }
      else if (k === "g" || k === "G") { stopTour(); generate(); }
      else if (k === "?") $("help").classList.toggle("on");
      else return;
      e.preventDefault();
    });

    function updateUI() {
      if (!R) return;
      const n = S.ids.length;
      document.querySelectorAll(".seg[data-key]").forEach((seg) => {
        const key = seg.dataset.key;
        const cur = { model: S.model, explode: String(S.explode), mask: S.mask, layer: String(S.layer), head: String(S.head), attnMode: S.attnMode, trueWord: S.trueWord, decMethod: S.decMethod }[key];
        seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === cur));
      });
      const sl = $("tSlider"); sl.max = n - 1; sl.value = S.t;
      $("tVal").textContent = `t=${S.t + 1} · ${R.words[S.t]}`;
      // sequence chips
      $("seq").innerHTML = R.words.map((w, i) => `<button class="tok${i === S.t ? " on" : ""}${i >= S.promptLen ? " gen" : ""}" data-i="${i}">${w.replace(/</g, "&lt;")}<sub>${S.ids[i]}</sub></button>`).join("");
      $("seq").querySelectorAll(".tok").forEach((b) => (b.onclick = () => { stopTour(); S.t = +b.dataset.i; S.tFollow = S.t === n - 1; compute({ keepStale: true }); }));
      // stage chrome
      const st = stagesDef[S.stage - 1];
      $("stageName").innerHTML = `<b>${String(st.n).padStart(2, "0")}</b>${st.name}`;
      film.querySelectorAll(".frame").forEach((f) => f.classList.toggle("on", +f.dataset.stage === S.stage));
      const fr = film.querySelector(".frame.on"); if (fr && !RECORD) fr.scrollIntoView({ block: "nearest", inline: "nearest" });
      if (!tour.on) { const pct = ((S.stage - 1) / 9) * 100; $("scrubFill").style.width = pct + "%"; $("scrubThumb").style.left = pct + "%"; }
      $("ctx-attn").hidden = S.stage !== 5; $("ctx-loss").hidden = S.stage !== 9; $("ctx-dec").hidden = S.stage !== 10;
      // explanation + chips
      const T = NWMX.text(S.stage, R, S, D);
      $("chips").innerHTML = T.chips.map(([k, v]) => `<div class="chip"><span>${k}</span><b>${v}</b></div>`).join("");
      $("explain").innerHTML = `<div class="kick"><b>${String(st.n).padStart(2, "0")}</b>${st.name}${S.stage >= 4 && S.stage <= 6 ? ` · layer ${S.layer + 1}${S.stage < 6 ? ` · head ${S.head + 1}` : ""}` : ""}</div>` + T.html;
      // decoding panel
      $("kRow").style.display = S.decMethod === "topk" ? "" : "none";
      $("pRow").style.display = S.decMethod === "topp" ? "" : "none";
      $("kVal").textContent = `k = ${S.k}`; $("pVal").textContent = `p = ${S.p.toFixed(2)}`;
      const probs = R.F.probs[n - 1];
      const res = NWM.decode(probs, S.decMethod, { k: S.k, p: S.p }, () => 0.5);
      const order = res.order.slice(0, 7);
      $("dist").innerHTML = order.map((i) => {
        const kept = res.kept.includes(i);
        return `<span class="w">${VOC[i].replace(/</g, "&lt;")}</span><span class="bar"><s class="${kept ? "kept" : ""}" style="width:${(probs[i] * 100).toFixed(1)}%"></s></span><span class="p${kept ? " kept" : ""}">${probs[i].toFixed(3)}</span>`;
      }).join("");
      const keptP = res.kept.reduce((a, i) => a + probs[i], 0);
      const full = n >= 10, ended = S.ids[n - 1] === ID["<eos>"];
      $("genBtn").disabled = full || ended;
      $("decNote").innerHTML = (S.lastDec ? S.lastDec.note + "<br>" : "") +
        (ended ? "Hit &lt;eos&gt;: generation stops. Reset to go again." : full ? "Max length 10 reached (P has 10 rows)." :
          `${S.decMethod === "greedy" ? "Greedy keeps the argmax" : S.decMethod === "sample" ? "Ancestral sampling: all words, ∝ p" : S.decMethod === "topk" ? `Top-k keeps ${res.kept.length} words` : `Top-p keeps ${res.kept.length} words (cum ${keptP.toFixed(2)} ≥ ${S.p.toFixed(2)})`}.`);
    }

    // ---------------- decoding ----------------
    function generate() {
      const n = S.ids.length;
      if (n >= 10 || S.ids[n - 1] === ID["<eos>"]) return;
      const probs = R.F.probs[n - 1];
      const rng = NWM.mulberry32(S.seed * 31 + n * 7919 + S.genCount * 104729);
      const res = NWM.decode(probs, S.decMethod, { k: S.k, p: S.p }, rng);
      S.genCount++;
      S.prevF = R.F;
      const w = VOC[res.choice];
      S.lastDec = { note: `Last step (${S.decMethod}): picked <b style="color:#ffb547">${w.replace(/</g, "&lt;")}</b>, p = ${probs[res.choice].toFixed(3)}.`, msg: `step ${S.genCount}: P(· | ${R.words.slice(1).join(" ")}) → <b>${w.replace(/</g, "&lt;")}</b> (${probs[res.choice].toFixed(3)})` };
      S.ids = S.ids.concat([res.choice]); S.tFollow = true;
      compute({ decoded: true });
      if (S.stage !== 10) goStage(10);
    }
    function resetGen() { S.ids = S.prompt.slice(); S.genCount = 0; S.prevF = null; S.staleMap = []; S.lastDec = null; S.tFollow = true; compute(); decoder.enter(); }

    // ---------------- camera director ----------------
    const dir = { t: 1, dur: 1.8, from: null, to: null };
    function focusFor(k) {
      const L = layers[S.layer];
      if (k === 1) return gate.focus();
      if (k === 2) return cabinet.focus();
      if (k === 3) return position.focus();
      if (k === 4) return L.focusQKV();
      if (k === 5) return L.focusAttn();
      if (k === 6) return L.focusFFN();
      if (k === 7) {
        const y = (world.deck2Y + 2.4) / 2 + 1.0;
        return { target: new THREE.Vector3(4.6, y, 0), pos: new THREE.Vector3(-7.5, y + 6.5 + 2 * S.explode, 25 + 4 * S.explode) };
      }
      if (k === 8) return output.focus();
      if (k === 9) return loss.focus();
      return decoder.focus();
    }
    function fly(to, dur) {
      // longer inputs make the matrices taller: back the camera off a little
      const extra = Math.max(0, S.ids.length - 6) * 0.11;
      if (extra && [2, 3, 4, 5].includes(S.stage)) {
        const d = to.pos.clone().sub(to.target);
        to = { target: to.target.clone().add(new THREE.Vector3(0, extra * 0.9, 0)), pos: to.target.clone().add(d.multiplyScalar(1 + extra)).add(new THREE.Vector3(0, extra * 0.9, 0)) };
      }
      dir.from = { pos: camera.position.clone(), target: controls.target.clone() };
      dir.to = to; dir.t = 0; dir.dur = dur; controls.enabled = false;
    }
    function refocus(dur = 1.4) {
      if ([4, 5, 6, 7].includes(S.stage)) {
        // deck 2 moves while exploding; aim at where it will be
        const save = world.deck2Y;
        world.deck2Y = K.lerp(NWMX.LAY.deck2[0], NWMX.LAY.deck2[1], S.explode);
        layers[1].group.position.y = world.deck2Y + 0.02;
        const f = focusFor(S.stage);
        world.deck2Y = save; layers[1].group.position.y = save + 0.02;
        fly(f, dur);
      }
    }
    function goStage(k, dur = 1.9) {
      if (k < 1 || k > 10) return;
      const prev = S.stage;
      S.stage = k;
      const save = world.deck2Y;
      world.deck2Y = K.lerp(NWMX.LAY.deck2[0], NWMX.LAY.deck2[1], S.explode); layers[1].group.position.y = world.deck2Y + 0.02;
      const f = focusFor(k);
      world.deck2Y = save; layers[1].group.position.y = save + 0.02;
      const dist = camera.position.distanceTo(f.pos);
      const fd = Math.min(2.6, Math.max(1.1, dur * (0.55 + dist / 40)));
      const d = fd * 0.7; // start the station's intro as the camera settles
      if (k === 1) gate.enter(d);
      if (k === 2) cabinet.enter(d);
      if (k === 3) position.enter(d);
      if (k >= 4 && k <= 6) layers.forEach((L) => L.enter(k, d));
      if (k === 8) output.enter(d);
      if (k === 9) loss.enter(d);
      if (k === 10) decoder.enter(d);
      if (S.stage === 6 || prev === 6 || S.stage === 5 || prev === 5) compute({ keepStale: true }); else updateUI();
      fly(f, fd);
      if (!RECORD) { const ex = $("explain"); ex.classList.add("fade"); setTimeout(() => ex.classList.remove("fade"), 160); }
    }
    const tmpV = new THREE.Vector3();
    function updateDirector(dt) {
      if (dir.t >= 1) return false;
      dir.t = Math.min(1, dir.t + dt / dir.dur);
      const e = K.ease.inOut(dir.t);
      const a = dir.from, b = dir.to;
      camera.position.lerpVectors(a.pos, b.pos, e);
      const lift = Math.sin(Math.PI * e) * Math.min(2.5, a.pos.distanceTo(b.pos) * 0.07);
      camera.position.y += lift;
      tmpV.lerpVectors(a.target, b.target, e);
      controls.target.copy(tmpV);
      camera.lookAt(tmpV);
      if (dir.t >= 1) controls.enabled = !RECORD;
      return true;
    }

    // ---------------- tour ----------------
    const setL = (l) => { S.layer = l; compute({ keepStale: true }); refocus(1.6); };
    const TOUR = [
      { stage: 1, dur: 6.0 },
      { stage: 2, dur: 6.5 },
      { stage: 3, dur: 6.0 },
      { stage: 4, dur: 6.5 },
      { stage: 5, dur: 13.5, acts: [[0.1, () => setKey("attnMode", "scores")], [2.0, () => setKey("attnMode", "masked")], [3.8, () => setKey("attnMode", "softmax")],
        [6.0, () => { S.head = 1; setL(1); }], [9.0, () => setKey("mask", "sliding")], [12.0, () => setKey("mask", "causal")]] },
      { stage: 6, dur: 9.0, pre: () => { S.head = 0; S.layer = 0; compute({ keepStale: true }); }, acts: [[4.3, () => setKey("model", "moe")], [8.8, () => setKey("model", "dense")]] },
      { stage: 7, dur: 7.0, acts: [[1.6, () => setKey("explode", 1)], [5.2, () => setKey("explode", 0)]] },
      { stage: 8, dur: 6.5 },
      { stage: 9, dur: 7.5, acts: [[3.6, () => setKey("trueWord", "Qwen")], [6.6, () => setKey("trueWord", "Claude")]] },
      { stage: 10, dur: 8.5, acts: [[2.4, generate], [5.2, generate]] },
    ];
    const TOUR_LEN = TOUR.reduce((a, s) => a + s.dur, 0);
    const tour = { on: false, i: 0, tau: 0, fired: 0, total: 0, done: false };
    function startTour() {
      tour.on = true; tour.i = -1; tour.total = 0; tour.done = false;
      document.body.classList.add("touring"); $("tourBtn").textContent = "■ Stop tour";
      S.model = "dense"; S.mask = "causal"; S.layer = 0; S.head = 0; S.attnMode = "softmax"; S.trueWord = "Claude"; S.decMethod = "greedy"; S.explode = 0;
      setInput("My favorite LLM is");
      nextTourStep();
    }
    function nextTourStep() {
      tour.i++; tour.tau = 0; tour.fired = 0;
      if (tour.i >= TOUR.length) { tour.done = true; stopTour(); resetGen(); goStage(1, 2.4); return; }
      if (TOUR[tour.i].pre) TOUR[tour.i].pre();
      goStage(TOUR[tour.i].stage, tour.i === 0 ? 1.2 : 1.9);
    }
    function stopTour() {
      if (!tour.on) return;
      tour.on = false; document.body.classList.remove("touring"); $("tourBtn").textContent = "▶ Tour (≈75 s)";
      updateUI();
    }
    function updateTour(dt) {
      if (!tour.on) return;
      tour.tau += dt; tour.total += dt;
      const st = TOUR[tour.i];
      const acts = st.acts || [];
      while (tour.fired < acts.length && tour.tau >= acts[tour.fired][0]) { acts[tour.fired][1](); tour.fired++; }
      const pct = Math.min(100, (tour.total / TOUR_LEN) * 100);
      $("tourFill").style.width = pct + "%"; $("scrubFill").style.width = pct + "%"; $("scrubThumb").style.left = pct + "%";
      if (tour.tau >= st.dur) nextTourStep();
    }

    // ---------------- tags + hover ----------------
    function updateTags() {
      for (const o of K.TAGS) {
        const u = o.userData;
        let on = !u.stages || u.stages.includes(S.stage);
        if (on && u.layer != null && S.stage !== 7) on = u.layer === S.layer;
        if (on && u.cond) on = !!u.cond(S);
        if (on) { o.getWorldPosition(tmpV); if (tmpV.distanceTo(camera.position) > 34) on = false; }
        if (o.userData._on !== on) { o.userData._on = on; o.element.classList.toggle("off", !on); }
      }
    }
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let mouseDirty = false, mouseXY = [0, 0];
    renderer.domElement.addEventListener("pointermove", (e) => { mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); mouseXY = [e.clientX, e.clientY]; mouseDirty = true; });
    renderer.domElement.addEventListener("pointerleave", () => $("tip").classList.remove("on"));
    renderer.domElement.addEventListener("pointerdown", () => { if (tour.on) stopTour(); });
    function updateHover() {
      if (!mouseDirty || RECORD) return; mouseDirty = false;
      ray.setFromCamera(mouse, camera);
      const objs = ctx.hover.filter((h) => { let o = h.obj, vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; } return vis; });
      const hits = ray.intersectObjects(objs.map((h) => h.obj), false);
      const tip = $("tip");
      if (hits.length) {
        const hit = hits[0], h = objs.find((x) => x.obj === hit.object);
        const html = h && hit.instanceId != null ? h.info(hit) : null;
        if (html) { tip.innerHTML = html; tip.style.left = mouseXY[0] + "px"; tip.style.top = mouseXY[1] + "px"; tip.classList.add("on"); renderer.domElement.style.cursor = "crosshair"; return; }
      }
      tip.classList.remove("on"); renderer.domElement.style.cursor = "";
    }

    // ---------------- frame ----------------
    function step(dt) {
      S.time += dt; K.timeU.value = S.time; grain.uniforms.uTime.value = S.time;
      S.explodeAmt = K.damp(S.explodeAmt, S.explode, 3.0, dt);
      updateTour(dt);
      gate.update(dt, S); cabinet.update(dt, S); position.update(dt, S);
      layers.forEach((L) => L.update(dt, S));
      output.update(dt, S); loss.update(dt, S); decoder.update(dt, S);
      position.vis(S);
      world.update(dt, S, controls.target);
      const flying = updateDirector(dt);
      if (!flying) controls.update();
      // gentle handheld drift (re-set every frame by lookAt, so it never accumulates)
      camera.rotateY(Math.sin(S.time * 0.31) * 0.0035);
      camera.rotateX(Math.sin(S.time * 0.23 + 1.0) * 0.0025);
      camera.updateMatrixWorld();
      updateTags();
      updateHover();
    }
    function render() { composer.render(); labelRenderer.render(scene, camera); }

    function resize() {
      const w = innerWidth, h = innerHeight;
      camera.aspect = w / h; camera.fov = w / h < 1.2 ? 52 : 36;
      // shift the optical centre so subjects sit in the free area between the HUD panels and above the console
      if (w > 860) camera.setViewOffset(w, h, -w * 0.012, h * 0.065, w, h); else camera.setViewOffset(w, h, 0, h * 0.08, w, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h); composer.setPixelRatio(PR); composer.setSize(w, h); labelRenderer.setSize(w, h);
      bloom.resolution.set(w, h); grain.uniforms.uRes.value.set(w * PR, h * PR);
    }
    window.addEventListener("resize", resize);

    // ---------------- boot ----------------
    S.prompt = []; setInput(params.get("q") || "My favorite LLM is");
    if (params.get("model") === "moe") S.model = "moe";
    if (params.get("mask")) S.mask = params.get("mask");
    if (params.get("layer")) S.layer = +params.get("layer") - 1;
    if (params.get("head")) S.head = +params.get("head") - 1;
    if (params.get("explode")) S.explode = S.explodeAmt = 1;
    if (params.get("attn")) S.attnMode = params.get("attn");
    compute();
    resize();
    // settle everything once, then capture real thumbnails for the filmstrip
    progress(0.75, "rendering stage thumbnails…");
    for (let i = 0; i < 3; i++) step(0.02);
    [gate, cabinet, position, output, loss, decoder].forEach((s) => (s.tau = 99));
    layers.forEach((L) => { L.tauQ = L.tauA = L.tauF = 99; });
    for (let i = 0; i < 2; i++) step(0.02);
    const thumb = document.createElement("canvas"); thumb.width = 256; thumb.height = 144;
    const tctx = thumb.getContext("2d");
    for (let k = 1; k <= 10; k++) {
      S.stage = k;
      const f = focusFor(k);
      camera.position.copy(f.pos); controls.target.copy(f.target); camera.lookAt(f.target); camera.updateMatrixWorld();
      composer.render();
      const src = renderer.domElement;
      const ar = src.width / src.height, tw = ar > 16 / 9 ? src.height * 16 / 9 : src.width, th = tw * 9 / 16;
      tctx.drawImage(src, (src.width - tw) / 2, (src.height - th) / 2, tw, th, 0, 0, 256, 144);
      film.children[k - 1].style.backgroundImage = `url(${thumb.toDataURL("image/jpeg", 0.8)})`;
    }
    const startStage = Math.max(1, Math.min(10, +(params.get("stage") || 1)));
    S.stage = startStage;
    const f0 = focusFor(startStage);
    camera.position.copy(f0.pos).add(new THREE.Vector3(-3, 1.5, 4)); controls.target.copy(f0.target); camera.lookAt(f0.target);
    compute({ keepStale: true });
    goStage(startStage, 2.4);
    if (params.get("dec")) { const nGen = +params.get("dec"); for (let i = 0; i < nGen; i++) generate(); }
    progress(1, "ready");
    setTimeout(() => $("loader").classList.add("done"), RECORD ? 0 : 250);
    if (RECORD) $("loader").style.display = "none";

    // ---------------- loop / record mode ----------------
    window.__nwm = { S, get R() { return R; }, goStage, setKey, generate, startTour, TOUR_LEN, camera, controls, renderer, step, render };
    if (RECORD) {
      const FPS = +(params.get("fps") || 30);
      let frameIdx = -1;
      window.__tourLength = TOUR_LEN;
      grain.uniforms.uAmt.value = 0.014;
      window.__frame = (i) => {
        if (frameIdx < 0) { startTour(); frameIdx = 0; }
        while (frameIdx < i) { step(1 / FPS); frameIdx++; }
        render();
        return { t: frameIdx / FPS, done: tour.done, stage: S.stage };
      };
      window.__ready = true;
    } else {
      let last = performance.now(), acc = 0, frames = 0, settle = 0;
      const loop = (now) => {
        const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
        // adaptive resolution: if we average under ~52 fps for 2 s, step the pixel ratio down (never below 1)
        if (document.visibilityState === "visible" && raw < 0.5) { acc += raw; frames++; }
        settle += raw;
        if (acc > 2 && settle > 4) {
          const fps = frames / acc; acc = 0; frames = 0;
          if (fps < 52 && PR > 1) { PR = Math.max(1, PR - 0.25); renderer.setPixelRatio(PR); resize(); settle = 0; }
        }
        step(dt); render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      window.__ready = true;
    }
  };
})();
