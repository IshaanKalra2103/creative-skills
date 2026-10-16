/* 3D deep explainer — engine. Topic-agnostic: renderer + post (bloom, grain, vignette), orbit camera with eased
   fly-throughs, overlay UI generated from the explainer config (title, stat chips, explain box, control panel,
   filmstrip with live thumbnails, scrubber), CSS2D labels, hover tooltips, keyboard, guided Tour, deterministic
   ?record mode, adaptive resolution. The explainer registers itself with DX.define({...}) (see dx-explainer.js).

   URL params: ?stage=N  ?record&fps=30  plus anything your explainer reads from DX.params.
   Window API: window.__dx = { api, stations }   window.__ready   window.__frame(i) / __tourLength (record mode) */
(function () {
  "use strict";
  const DX = (window.DX = window.DX || {});
  DX.define = (cfg) => { DX.cfg = cfg; };
  DX.params = new URLSearchParams(location.search);

  DX.start = async function (THREE, A) {
    const cfg = DX.cfg;
    const $ = (id) => document.getElementById(id);
    const params = DX.params;
    const RECORD = params.has("record");
    const progress = (p, m) => { $("lfill").style.width = Math.round(p * 100) + "%"; if (m) $("lmsg").textContent = m; };
    if (!cfg) { $("lmsg").textContent = "No explainer registered (DX.define was never called)."; return; }
    if (RECORD) document.body.classList.add("record");

    // fonts first: canvas text drawn before the webfont arrives would be baked in a fallback face
    progress(0.2, "loading fonts…");
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      await Promise.race([Promise.all(["500", "600", "700"].flatMap((w) => [document.fonts.load(`${w} 40px "Outfit"`), document.fonts.load(`${w} 40px "JetBrains Mono"`)])), wait(3500)]);
    } catch (e) { /* fonts are optional */ }

    progress(0.35, "building the machine…");
    const K = DX.core(THREE, A);
    if (cfg.colors) K.semantic(cfg.colors);

    // ---------------- renderer + post ----------------
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: RECORD });
    } catch (e) { $("lmsg").textContent = "WebGL is not available in this browser."; return; }
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
    camera.position.set(0, 4, 14);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new A.RoomEnvironment(renderer), 0.04).texture;

    // MSAA only at low pixel density: at DPR 2 it roughly halves the frame rate and buys little
    const rt = new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType, samples: PR >= 1.75 ? 0 : 4 });
    const composer = new A.EffectComposer(renderer, rt);
    composer.setPixelRatio(PR);
    composer.setSize(innerWidth, innerHeight);
    composer.addPass(new A.RenderPass(scene, camera));
    // threshold 0.9: only toneMapped:false materials pushed above 1 (glow, beams, rims) bloom; text stays crisp
    const bloom = new A.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.55, 0.9);
    composer.addPass(bloom);
    const grain = new A.ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmt: { value: RECORD ? 0.014 : 0.045 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
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

    // ---------------- state, world, stations ----------------
    const initState = () => JSON.parse(JSON.stringify(cfg.state || {}));
    const S = Object.assign({ stage: 1, explode: 0, explodeAmt: 0, time: 0 }, initState());
    const N = cfg.stations.length;
    const ctx = { THREE, A, K, scene, camera, hover: [], S, cfg, params };
    progress(0.5, "assembling stations…");
    const world = DX.world(THREE, A, K, ctx, cfg);
    ctx.world = world;
    const ST = cfg.build(ctx);                          // array of station objects, same order as cfg.stations
    if (!Array.isArray(ST) || ST.length !== N) throw new Error("cfg.build must return one station object per cfg.stations entry");

    let R = null;
    const api = {
      S, K, ctx, get R() { return R; },
      rerun, refresh: () => updateUI(), goStage, set, startTour, stopTour, isTouring: () => tour.on,
      camera, controls, renderer, scene,
    };
    ctx.api = api;
    function rerun() {
      R = cfg.compute(S);                               // the REAL computation, every intermediate in R
      ST.forEach((st) => st.setData && st.setData(R, S));
      updateUI();
    }
    function set(key, v) {
      const c = (cfg.controls || []).find((x) => x.key === key);
      if (key === "explode") { S.explode = +v; if (cfg.onExplode) cfg.onExplode(api); refocus(1.4); updateUI(); return; }
      S[key] = typeof S[key] === "number" && v !== "" && !isNaN(+v) ? +v : v;
      if (c && c.onChange) c.onChange(api, S[key]);
      if (!c || c.rerun !== false) rerun(); else updateUI();
      if (c && c.refocus) refocus(1.3);
    }

    // ---------------- UI (generated from cfg) ----------------
    $("t1").textContent = cfg.title[0]; $("t2").textContent = cfg.title[1];
    document.title = cfg.pageTitle || `${cfg.title[0]} ${cfg.title[1]}`.replace(/\s+/g, " ");
    $("desc").innerHTML = cfg.description || "";
    if (cfg.backLink) { $("back").href = cfg.backLink.href; $("back").innerHTML = cfg.backLink.text; } else $("back").style.display = "none";
    const panelBody = $("panelBody");
    const segHTML = (c) => `<div class="seg" data-key="${c.key}">${c.options.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join("")}</div>`;
    function controlHTML(c) {
      const lab = `<div class="plab">${c.label || ""} <i>${c.hint || ""}</i></div>`;
      if (c.type === "seg") return lab + segHTML(c);
      if (c.type === "range") return lab + `<div class="slider"><input type="range" data-key="${c.key}" min="${c.min}" max="${c.max}" step="${c.step || 1}" aria-label="${c.label}"><span class="sval" data-val="${c.key}"></span></div>`;
      if (c.type === "button") return `<button class="btn ${c.primary ? "pri" : ""}" style="width:100%" data-btn="${c.key}">${c.label}</button>`;
      return "";
    }
    const allControls = (cfg.explode === false ? [] : [{ key: "explode", label: "View", hint: "X", type: "seg", options: [["0", "Assembled"], ["1", "Exploded"]], half: true }]).concat(cfg.controls || []);
    let html = "", ctxHtml = "";
    for (let i = 0; i < allControls.length; i++) {
      const c = allControls[i];
      const target = c.stages ? "ctx" : "main";
      let block;
      if (c.half && allControls[i + 1] && allControls[i + 1].half && !!allControls[i + 1].stages === !!c.stages) {
        block = `<div class="prow"><div class="pcol">${controlHTML(c)}</div><div class="pcol">${controlHTML(allControls[i + 1])}</div></div>`; i++;
      } else block = `<div class="prow" ${c.stages ? `data-stages="${c.stages.join(",")}"` : ""}><div class="pcol">${controlHTML(c)}</div></div>`;
      if (target === "ctx") ctxHtml += block; else html += block;
    }
    panelBody.innerHTML = html + (ctxHtml ? `<div class="ctx">${ctxHtml}</div>` : "");
    panelBody.querySelectorAll(".seg[data-key]").forEach((seg) => seg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; stopTour(); set(seg.dataset.key, b.dataset.v);
    }));
    panelBody.querySelectorAll("input[type=range]").forEach((r) => r.addEventListener("input", (e) => { stopTour(); set(r.dataset.key, +e.target.value); }));
    panelBody.querySelectorAll("[data-btn]").forEach((b) => b.addEventListener("click", () => {
      stopTour(); const c = allControls.find((x) => x.key === b.dataset.btn); if (c && c.onClick) c.onClick(api);
    }));
    const film = $("film");
    cfg.stations.forEach((st, i) => {
      const f = document.createElement("div");
      f.className = "frame"; f.dataset.stage = i + 1;
      f.innerHTML = `<span><b>${String(i + 1).padStart(2, "0")}</b>${st.short || st.name}</span>`;
      f.onclick = () => { stopTour(); goStage(i + 1); };
      film.appendChild(f);
    });
    $("tourBtn").onclick = () => (tour.on ? stopTour() : startTour());
    $("helpBtn").onclick = () => $("help").classList.toggle("on");
    $("prevBtn").onclick = () => { stopTour(); goStage(Math.max(1, S.stage - 1)); };
    $("nextBtn").onclick = () => { stopTour(); goStage(Math.min(N, S.stage + 1)); };
    $("sheetToggle").onclick = () => $("panel").classList.toggle("open");
    $("scrub").addEventListener("click", (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      stopTour(); goStage(1 + Math.round(K.clamp((e.clientX - r.left) / r.width) * (N - 1)));
    });
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" && e.target.type === "text") return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) { const n = k === "0" ? 10 : +k; if (n <= N) { stopTour(); goStage(n); } }
      else if (k === "ArrowRight") { stopTour(); goStage(Math.min(N, S.stage + 1)); }
      else if (k === "ArrowLeft") { stopTour(); goStage(Math.max(1, S.stage - 1)); }
      else if ((k === "x" || k === "X") && cfg.explode !== false) { stopTour(); set("explode", S.explode ? 0 : 1); }
      else if (k === "t" || k === "T") { tour.on ? stopTour() : startTour(); }
      else if (k === "?") $("help").classList.toggle("on");
      else if (cfg.keys && cfg.keys[k]) { stopTour(); cfg.keys[k](api); }
      else return;
      e.preventDefault();
    });

    function updateUI() {
      if (!R) return;
      panelBody.querySelectorAll(".seg[data-key]").forEach((seg) => {
        const cur = String(S[seg.dataset.key]);
        seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === cur));
      });
      panelBody.querySelectorAll("input[type=range]").forEach((r) => {
        const c = allControls.find((x) => x.key === r.dataset.key);
        r.value = S[c.key];
        const out = panelBody.querySelector(`[data-val="${c.key}"]`);
        if (out) out.textContent = c.fmt ? c.fmt(S[c.key], S, R) : String(S[c.key]);
      });
      panelBody.querySelectorAll("[data-stages]").forEach((row) => { row.hidden = !row.dataset.stages.split(",").map(Number).includes(S.stage); });
      const ctxBox = panelBody.querySelector(".ctx");
      if (ctxBox) ctxBox.hidden = ![...ctxBox.querySelectorAll("[data-stages]")].some((r) => !r.hidden);
      const st = cfg.stations[S.stage - 1];
      $("stageName").innerHTML = `<b>${String(S.stage).padStart(2, "0")}</b>${st.name}`;
      film.querySelectorAll(".frame").forEach((f) => f.classList.toggle("on", +f.dataset.stage === S.stage));
      if (!tour.on) { const pct = ((S.stage - 1) / Math.max(1, N - 1)) * 100; $("scrubFill").style.width = pct + "%"; $("scrubThumb").style.left = pct + "%"; }
      const T = cfg.text(S.stage, R, S, api) || { chips: [], html: "" };
      $("chips").innerHTML = (T.chips || []).map(([k, v]) => `<div class="chip"><span>${k}</span><b>${v}</b></div>`).join("");
      $("explain").innerHTML = `<div class="kick"><b>${String(S.stage).padStart(2, "0")}</b>${st.name}${T.kick ? " · " + T.kick : ""}</div>` + T.html;
      if (cfg.console) $("seq").innerHTML = cfg.console(R, S, api) || "";
      if (cfg.onUI) cfg.onUI(api);
    }

    // ---------------- camera director ----------------
    const dir = { t: 1, dur: 1.8, from: null, to: null };
    const focusFor = (k) => ST[k - 1].focus(S);
    /* A station's focus may declare fit: <world width>. Then the camera backs off until that width fits the strip
       of screen the HUD leaves free, and slides sideways so the content centres in that strip. Without this, the
       left explanation panel hides the first part of wide stations on 1280-px laptops. */
    function fitFocus(f) {
      if (!f.fit) return f;
      const narrow = innerWidth <= 860;
      const hl = $("hud-left").querySelector(".explain").getBoundingClientRect(), pr = $("panel").getBoundingClientRect();
      const hudL = narrow ? 0 : hl.right + 16;
      const hudR = narrow || pr.bottom < innerHeight * 0.45 ? 16 : innerWidth - pr.left + 16;
      const free = Math.max(0.35, (innerWidth - hudL - hudR) / innerWidth);
      const dir = f.pos.clone().sub(f.target); let dist = dir.length(); dir.normalize();
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      dist = Math.max(dist, ((narrow ? 0.8 : 1) * f.fit / 2) / (free * tanH));
      const right = new THREE.Vector3().crossVectors(dir.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
      const shift = ((hudL - hudR) / 2) * (2 * dist * tanH) / innerWidth;
      const target = f.target.clone().addScaledVector(right, -shift);
      return { target, pos: target.clone().addScaledVector(dir, dist) };
    }
    function fly(to, dur) {
      dir.from = { pos: camera.position.clone(), target: controls.target.clone() };
      dir.to = to; dir.t = 0; dir.dur = dur; controls.enabled = false;
    }
    function refocus(dur = 1.4) { fly(fitFocus(focusFor(S.stage)), dur); }
    function goStage(k, dur = 1.9) {
      if (k < 1 || k > N) return;
      S.stage = k;
      const f = fitFocus(focusFor(k));
      const dist = camera.position.distanceTo(f.pos);
      const fd = Math.min(2.6, Math.max(1.1, dur * (0.55 + dist / 40)));
      if (ST[k - 1].enter) ST[k - 1].enter(fd * 0.7);   // the station's intro starts as the camera settles
      updateUI();
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
      camera.position.y += Math.sin(Math.PI * e) * Math.min(2.5, a.pos.distanceTo(b.pos) * 0.07);   // gentle crane arc
      tmpV.lerpVectors(a.target, b.target, e);
      controls.target.copy(tmpV);
      camera.lookAt(tmpV);
      if (dir.t >= 1) controls.enabled = !RECORD;
      return true;
    }

    // ---------------- tour ----------------
    const TOUR = cfg.tour || cfg.stations.map((_, i) => ({ stage: i + 1, dur: 6 }));
    const TOUR_LEN = TOUR.reduce((a, s) => a + s.dur, 0);
    const tour = { on: false, i: 0, tau: 0, fired: 0, total: 0, done: false };
    function startTour() {
      tour.on = true; tour.i = -1; tour.total = 0; tour.done = false;
      document.body.classList.add("touring"); $("tourBtn").textContent = "■ Stop tour";
      Object.assign(S, initState(), { explode: 0 });
      rerun();
      nextTourStep();
    }
    function nextTourStep() {
      tour.i++; tour.tau = 0; tour.fired = 0;
      if (tour.i >= TOUR.length) { tour.done = true; stopTour(); goStage(1, 2.4); return; }
      if (TOUR[tour.i].pre) TOUR[tour.i].pre(api);
      goStage(TOUR[tour.i].stage, tour.i === 0 ? 1.2 : 1.9);
    }
    function stopTour() {
      if (!tour.on) return;
      tour.on = false; document.body.classList.remove("touring"); $("tourBtn").textContent = `▶ Tour (≈${Math.round(TOUR_LEN / 5) * 5} s)`;
      updateUI();
    }
    function updateTour(dt) {
      if (!tour.on) return;
      tour.tau += dt; tour.total += dt;
      const st = TOUR[tour.i];
      const acts = st.acts || [];
      while (tour.fired < acts.length && tour.tau >= acts[tour.fired][0]) { acts[tour.fired][1](api); tour.fired++; }
      const pct = Math.min(100, (tour.total / TOUR_LEN) * 100);
      $("tourFill").style.width = pct + "%"; $("scrubFill").style.width = pct + "%"; $("scrubThumb").style.left = pct + "%";
      if (tour.tau >= st.dur) nextTourStep();
    }
    $("tourBtn").textContent = `▶ Tour (≈${Math.round(TOUR_LEN / 5) * 5} s)`;

    // ---------------- labels + hover ----------------
    function updateTags() {
      for (const o of K.TAGS) {
        const u = o.userData;
        let on = !u.stages || u.stages.includes(S.stage);
        if (on && u.cond) on = !!u.cond(S);
        if (on) { o.getWorldPosition(tmpV); if (tmpV.distanceTo(camera.position) > (cfg.labelRange || 34)) on = false; }
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
      const objs = ctx.hover.filter((h) => { let o = h.obj; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
      const hits = ray.intersectObjects(objs.map((h) => h.obj), false);
      const tip = $("tip");
      if (hits.length) {
        const hit = hits[0], h = objs.find((x) => x.obj === hit.object);
        const html = h ? h.info(hit) : null;
        if (html) { tip.innerHTML = html; tip.style.left = mouseXY[0] + "px"; tip.style.top = mouseXY[1] + "px"; tip.classList.add("on"); renderer.domElement.style.cursor = "crosshair"; return; }
      }
      tip.classList.remove("on"); renderer.domElement.style.cursor = "";
    }

    // ---------------- frame ----------------
    function step(dt) {
      S.time += dt; K.timeU.value = S.time; grain.uniforms.uTime.value = S.time;
      S.explodeAmt = K.damp(S.explodeAmt, S.explode, 3.0, dt);
      updateTour(dt);
      ST.forEach((st) => st.update && st.update(dt, S));
      world.update(dt, S, controls.target);
      if (cfg.update) cfg.update(dt, api);
      if (!updateDirector(dt)) controls.update();
      // handheld drift; lookAt re-sets the orientation every frame so it never accumulates
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
      // shift the optical centre so subjects sit between the HUD panels and above the console
      if (w > 860) camera.setViewOffset(w, h, -w * 0.012, h * 0.065, w, h); else camera.setViewOffset(w, h, 0, h * 0.08, w, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h); composer.setPixelRatio(PR); composer.setSize(w, h); labelRenderer.setSize(w, h);
      bloom.resolution.set(w, h); grain.uniforms.uRes.value.set(w * PR, h * PR);
    }
    let refitT = 0;
    window.addEventListener("resize", () => { resize(); clearTimeout(refitT); refitT = setTimeout(() => !tour.on && refocus(0.8), 250); });

    // ---------------- boot ----------------
    // any state key can be preset from the URL (?query=sour&tau=0.3), handy for screenshots of variants
    for (const k of Object.keys(cfg.state || {})) if (params.has(k)) { const v = params.get(k); S[k] = typeof S[k] === "number" ? +v : v; }
    if (params.get("explode") === "1") S.explode = S.explodeAmt = 1;
    if (cfg.init) cfg.init(api);
    rerun();
    resize();
    progress(0.75, "rendering station thumbnails…");
    for (let i = 0; i < 3; i++) step(0.02);
    ST.forEach((st) => st.skipIntro && st.skipIntro());   // thumbnails show finished stations
    for (let i = 0; i < 2; i++) step(0.02);
    const thumb = document.createElement("canvas"); thumb.width = 256; thumb.height = 144;
    const tctx = thumb.getContext("2d");
    for (let k = 1; k <= N; k++) {
      S.stage = k;
      const f = focusFor(k);
      camera.position.copy(f.pos); controls.target.copy(f.target); camera.lookAt(f.target); camera.updateMatrixWorld();
      composer.render();
      const src = renderer.domElement;
      const ar = src.width / src.height, tw = ar > 16 / 9 ? src.height * 16 / 9 : src.width, th = tw * 9 / 16;
      tctx.drawImage(src, (src.width - tw) / 2, (src.height - th) / 2, tw, th, 0, 0, 256, 144);
      film.children[k - 1].style.backgroundImage = `url(${thumb.toDataURL("image/jpeg", 0.8)})`;
    }
    const startStage = Math.max(1, Math.min(N, +(params.get("stage") || 1)));
    S.stage = startStage;
    const f0 = fitFocus(focusFor(startStage));
    camera.position.copy(f0.pos).add(new THREE.Vector3(-3, 1.5, 4)); controls.target.copy(f0.target); camera.lookAt(f0.target);
    goStage(startStage, 2.4);
    progress(1, "ready");
    setTimeout(() => $("loader").classList.add("done"), RECORD ? 0 : 250);
    if (RECORD) $("loader").style.display = "none";

    window.__dx = { api, stations: cfg.stations.map((s) => s.name), tourLength: TOUR_LEN };
    if (RECORD) {
      // deterministic capture: the page only advances when asked, by exactly 1/fps per frame
      const FPS = +(params.get("fps") || 30);
      let frameIdx = -1;
      window.__tourLength = TOUR_LEN;
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
