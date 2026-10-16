/* The Next-Word Machine — core 3D kit: palette, materials, canvas text, matrix displays, chips, beams, dials.
   Classic script; NWMX.core(THREE, addons) is called from the bootstrap module. */
(function () {
  "use strict";
  const NWMX = (window.NWMX = window.NWMX || {});

  NWMX.core = function (THREE, A) {
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
    const ease = {
      inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      out: (t) => 1 - Math.pow(1 - t, 3),
      outBack: (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
      sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    };

    // ---------------- palette (consistent colour language) ----------------
    const CSS = {
      cyan: "#45e6e0", q: "#6aa0ff", k: "#45e08e", v: "#bd86ff", pos: "#d29a5a", bad: "#ff5a68",
      amber: "#ffb547", brass: "#d6a24e", ink: "#e6edf3", ink2: "#aab4bf", mute: "#7d8894", dark: "#0b0f14",
      h1: "#45e6e0", h2: "#ffb547",
    };
    const COL = {};
    for (const k in CSS) COL[k] = new THREE.Color(CSS[k]);
    const hdr = (c, k) => new THREE.Color(c).multiplyScalar(k);

    // diverging blue <-> orange for raw vector values
    const NEG = new THREE.Color("#2a6dff"), POS = new THREE.Color("#ff8418"), ZERO = new THREE.Color("#1a2029");
    function divColor(v, s, out) {
      out = out || new THREE.Color();
      const t = clamp(v / s, -1, 1);
      return out.copy(ZERO).lerp(t < 0 ? NEG : POS, Math.pow(Math.abs(t), 0.75));
    }
    function divCss(v, s) { return "#" + divColor(v, s).getHexString(); }

    // ---------------- materials ----------------
    const M = {};
    M.dark = new THREE.MeshStandardMaterial({ color: 0x1a1e24, metalness: 0.65, roughness: 0.42, envMapIntensity: 0.9 });
    M.darker = new THREE.MeshStandardMaterial({ color: 0x0d1014, metalness: 0.5, roughness: 0.55, envMapIntensity: 0.7 });
    M.matte = new THREE.MeshStandardMaterial({ color: 0x15181c, metalness: 0.2, roughness: 0.78, envMapIntensity: 0.6 });
    M.wood = new THREE.MeshStandardMaterial({ color: 0x24170f, metalness: 0.1, roughness: 0.6, envMapIntensity: 0.6 });
    M.brass = new THREE.MeshStandardMaterial({ color: 0xb98432, metalness: 1.0, roughness: 0.32, envMapIntensity: 0.95 });
    M.brassDim = new THREE.MeshStandardMaterial({ color: 0x8a6327, metalness: 1.0, roughness: 0.4, envMapIntensity: 1.0 });
    M.steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 1.0, roughness: 0.22, envMapIntensity: 1.1 });
    M.rubber = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, metalness: 0.0, roughness: 0.9 });
    M.glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe9ff, metalness: 0.0, roughness: 0.06, transparent: true, opacity: 0.16,
      envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    M.glassDark = new THREE.MeshPhysicalMaterial({ color: 0x0b1218, metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.78,
      envMapIntensity: 1.2, clearcoat: 1, clearcoatRoughness: 0.08 });
    M.caseGlass = new THREE.MeshPhysicalMaterial({ color: 0xcfefff, metalness: 0.0, roughness: 0.12, transparent: true, opacity: 0.05,
      envMapIntensity: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.1, depthWrite: false, side: THREE.FrontSide });
    M.screen = new THREE.MeshStandardMaterial({ color: 0x05080b, metalness: 0.3, roughness: 0.3, envMapIntensity: 0.8 });
    const glowCache = {};
    M.glow = (css, k = 2.5) => {
      const key = css + "_" + k;
      if (!glowCache[key]) glowCache[key] = new THREE.MeshBasicMaterial({ color: hdr(css, k), toneMapped: false });
      return glowCache[key];
    };
    M.tint = (css, opacity = 0.35, emiss = 0.25) => new THREE.MeshPhysicalMaterial({
      color: css, metalness: 0, roughness: 0.18, transparent: true, opacity, envMapIntensity: 0.45, clearcoat: 0,
      emissive: css, emissiveIntensity: emiss, depthWrite: false, side: THREE.DoubleSide });

    // ---------------- geometry helpers ----------------
    const RB = (w, h, d, r = 0.06, s = 3) => new A.RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
    function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      if (parent) parent.add(m);
      return m;
    }
    function gearGeo(rOut, rIn, teeth, toothH, thick) {
      const s = new THREE.Shape();
      const da = (Math.PI * 2) / teeth;
      for (let k = 0; k < teeth; k++) {
        const a0 = k * da;
        const pts = [[0, rOut], [0.18, rOut + toothH], [0.52, rOut + toothH], [0.7, rOut]];
        pts.forEach(([f, r], i) => {
          const a = a0 + f * da;
          if (k === 0 && i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        });
      }
      s.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
      s.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1, curveSegments: 48 });
      g.translate(0, 0, -thick / 2);
      return g;
    }
    function knurlGeo(r, h, ridges = 120, depth = 0.045) {
      const g = new THREE.CylinderGeometry(r, r, h, ridges, 1, true);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const col = i % (ridges + 1);
        if (col % 2 === 1) { const x = p.getX(i), z = p.getZ(i); const f = (r - depth) / r; p.setX(i, x * f); p.setZ(i, z * f); }
      }
      g.computeVertexNormals();
      return g;
    }
    function ringGeo(rOut, rIn, thick, seg = 64) {
      const s = new THREE.Shape(); s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
      const h = new THREE.Path(); h.absarc(0, 0, rIn, 0, Math.PI * 2, true); s.holes.push(h);
      const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: seg });
      g.translate(0, 0, -thick / 2);
      return g;
    }

    // ---------------- canvas text ----------------
    const FONT = "Outfit, ui-sans-serif, system-ui, sans-serif";
    const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
    function textPlane(wu, hu, ppu = 256, opts = {}) {
      const cv = document.createElement("canvas");
      cv.width = Math.max(4, Math.round(wu * ppu)); cv.height = Math.max(4, Math.round(hu * ppu));
      const ctx = cv.getContext("2d");
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: opts.opacity == null ? 1 : opts.opacity });
      if (opts.brightness) mat.color.setScalar(opts.brightness);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wu, hu), mat);
      m.renderOrder = opts.renderOrder == null ? 6 : opts.renderOrder;
      const api = {
        mesh: m, cv, ctx, tex, ppu, wu, hu, mat,
        draw(fn) { ctx.clearRect(0, 0, cv.width, cv.height); ctx.save(); fn(ctx, cv.width, cv.height, ppu); ctx.restore(); tex.needsUpdate = true; },
      };
      return api;
    }
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function fmt(v, d = 2) {
      if (v === -Infinity) return "−∞";
      if (v === Infinity) return "∞";
      const s = Math.abs(v) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : v.toFixed(d);
      return s.replace("-", "−");
    }

    // ---------------- per-instance glow material for cells ----------------
    function cellMaterial(glowU) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.15, envMapIntensity: 0.8 });
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uGlow = glowU;
        sh.vertexShader = sh.vertexShader.replace("void main() {", "varying vec3 vInstCol;\nvoid main() {\n#ifdef USE_INSTANCING_COLOR\n vInstCol = instanceColor;\n#else\n vInstCol = vec3(0.0);\n#endif");
        sh.fragmentShader = sh.fragmentShader
          .replace("void main() {", "uniform float uGlow;\nvarying vec3 vInstCol;\nvoid main() {")
          .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n totalEmissiveRadiance += vInstCol * uGlow;");
      };
      return mat;
    }
    const CELL_GEO = RB(1, 1, 1, 0.14, 2);

    /* ======================================================================
       MatrixDisplay: rows x cols glowing cells (rows = positions/tokens),
       crisp numbers on a canvas overlay, glass case, brass rails.
       Anchored bottom-centre (grid grows upward; row 0 on top).
       kind: 'div' (diverging blue/orange) | 'q' | 'k' | 'v' | 'h1' | 'h2' (type-tinted bars)
       ====================================================================== */
    class MatrixDisplay extends THREE.Group {
      constructor(o) {
        super();
        this.o = Object.assign({ maxRows: 10, cols: 8, pitch: 0.27, kind: "div", scale: 1.6, title: "", titleColor: CSS.ink2,
          numbers: true, labelW: 0.95, padR: 0.12, decimals: 2, glow: 0.55, case: true, rails: true, sym: "x", ppu: 300,
          labelColor: CSS.ink, depth: 0.09, titleSize: 0.15 }, o);
        const { maxRows, cols } = this.o;
        this.rows = 0; this.values = []; this.labels = []; this.rowAmt = new Array(maxRows).fill(1);
        this.highlight = -1; this.dimRows = null; this.numAlpha = 1;
        this.glowU = { value: this.o.glow };
        this.cells = new THREE.InstancedMesh(CELL_GEO, cellMaterial(this.glowU), maxRows * cols);
        this.cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.cells.castShadow = false; this.cells.receiveShadow = false;
        this.cells.count = 0;
        this.cells.userData.display = this;
        this.add(this.cells);
        const p = this.o.pitch;
        this.left = -cols * p / 2 - this.o.labelW; this.right = cols * p / 2 + this.o.padR;
        this.top = maxRows * p + 0.42;
        this.text = textPlane(this.right - this.left, this.top, this.o.ppu);
        this.text.mesh.position.set((this.left + this.right) / 2, this.top / 2, (this.o.kind === "div" ? 0.5 : 2.9) * this.o.depth + 0.008);
        this.add(this.text.mesh);
        if (this.o.case) {
          this.caseMesh = new THREE.Mesh(RB(1, 1, 1, 0.05, 2), M.caseGlass);
          this.caseMesh.renderOrder = 2;
          this.add(this.caseMesh);
        }
        if (this.o.rails) {
          const w = cols * p + 0.22;
          const geo = new THREE.CylinderGeometry(0.028, 0.028, w, 12); geo.rotateZ(Math.PI / 2);
          this.railB = mesh(geo, M.brass, 0, -0.07, 0, this);
          this.railT = mesh(geo, M.brass, 0, 1, 0, this);
          const capG = new THREE.SphereGeometry(0.045, 12, 8);
          this.caps = [-1, 1].flatMap((sx) => [mesh(capG, M.brass, sx * w / 2, -0.07, 0, this), mesh(capG, M.brass, sx * w / 2, 1, 0, this)]);
        }
        this._tmpM = new THREE.Matrix4(); this._tmpC = new THREE.Color(); this._q = new THREE.Quaternion();
        this._dirty = true;
      }
      setData(values, labels, opts = {}) {
        this.values = values; this.labels = labels || [];
        this.rows = values.length;
        if (opts.title != null) this.o.title = opts.title;
        if (opts.scale) this.o.scale = opts.scale;
        this._dirty = true;
        this.redrawText();
      }
      setHighlight(r) { if (r !== this.highlight) { this.highlight = r; this._dirty = true; this.redrawText(); } }
      cellColor(v, out) {
        const k = this.o.kind, s = this.o.scale;
        if (k === "div") return divColor(v, s, out);
        const base = COL[k] || COL.cyan;
        const t = clamp(Math.abs(v) / s);
        // bright = positive, dim = negative (magnitude also shows as bar depth; the sign is printed)
        out.copy(base).multiplyScalar(v >= 0 ? 0.16 + 0.95 * Math.pow(t, 0.8) : 0.05 + 0.22 * t);
        return out;
      }
      layoutGrid() {
        const { cols, pitch: p, depth, kind } = this.o;
        const n = this.rows;
        const bars = kind !== "div";
        let i = 0;
        for (let r = 0; r < n; r++) {
          const amt = this.rowAmt[r];
          const dim = this.dimRows && this.dimRows[r] ? 0.25 : 1;
          const hi = this.highlight === r ? 1.6 : (this.highlight >= 0 ? 0.55 : 1);
          for (let c = 0; c < cols; c++) {
            const v = (this.values[r] || [])[c] || 0;
            const s = Math.max(0.0001, amt);
            const d = bars ? depth * (0.8 + 2.6 * clamp(Math.abs(v) / this.o.scale)) : depth;
            const x = (c - (cols - 1) / 2) * p, y = (n - 1 - r) * p + p / 2;
            this._tmpM.compose(new THREE.Vector3(x, y, d / 2 - depth / 2), this._q, new THREE.Vector3(p * 0.86 * s, p * 0.86 * s, d * s));
            this.cells.setMatrixAt(i, this._tmpM);
            this.cellColor(v, this._tmpC).multiplyScalar(dim * hi);
            this.cells.setColorAt(i, this._tmpC);
            i++;
          }
        }
        this.cells.count = i;
        this.cells.instanceMatrix.needsUpdate = true;
        if (this.cells.instanceColor) this.cells.instanceColor.needsUpdate = true;
        const h = Math.max(1, n) * p;
        if (this.caseMesh) { this.caseMesh.scale.set(cols * p + 0.16, h + 0.14, 0.36); this.caseMesh.position.set(0, h / 2, 0); this.caseMesh.visible = n > 0; }
        if (this.railT) { this.railT.position.y = h + 0.07; this.caps[1].position.y = h + 0.07; this.caps[3].position.y = h + 0.07; }
      }
      redrawText() {
        const o = this.o, n = this.rows, p = o.pitch;
        const L = this.left, T = this.top;
        this.text.draw((ctx, W, H, ppu) => {
          const X = (x) => (x - L) * ppu, Y = (y) => (T - y) * ppu;
          ctx.textBaseline = "middle";
          // title just above the grid
          if (o.title) {
            ctx.font = `600 ${o.titleSize * ppu}px ${FONT}`;
            ctx.fillStyle = o.titleColor; ctx.textAlign = "center";
            ctx.fillText(o.title, X(0), Y(n * p + 0.25));
          }
          for (let r = 0; r < n; r++) {
            const yc = (n - 1 - r) * p + p / 2;
            const lab = this.labels[r];
            if (lab != null) {
              ctx.font = `${this.highlight === r ? 700 : 500} ${Math.min(0.17, p * 0.62) * ppu}px ${FONT}`;
              ctx.textAlign = "right";
              ctx.fillStyle = this.highlight === r ? CSS.q : (typeof o.labelColor === "function" ? o.labelColor(r) : o.labelColor);
              if (this.dimRows && this.dimRows[r]) ctx.fillStyle = "#4a535d";
              ctx.fillText(lab, X(-o.cols * p / 2 - 0.08), Y(yc));
            }
            if (o.numbers) {
              ctx.font = `600 ${p * 0.3 * ppu}px ${MONO}`;
              ctx.textAlign = "center";
              for (let c = 0; c < o.cols; c++) {
                const v = (this.values[r] || [])[c];
                if (v == null) continue;
                const x = (c - (o.cols - 1) / 2) * p;
                const s = fmt(v, o.decimals);
                ctx.lineWidth = p * 0.07 * ppu; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.lineJoin = "round";
                ctx.strokeText(s, X(x), Y(yc));
                ctx.fillStyle = (this.dimRows && this.dimRows[r]) ? "#56606a" : "#eef3f7";
                ctx.fillText(s, X(x), Y(yc));
              }
            }
            if (this.highlight === r) {
              ctx.strokeStyle = CSS.q; ctx.lineWidth = 0.022 * ppu;
              roundRect(ctx, X(-o.cols * p / 2 - 0.03), Y(yc + p / 2 + 0.02), (o.cols * p + 0.06) * ppu, (p + 0.04) * ppu, 0.05 * ppu);
              ctx.stroke();
            }
          }
        });
        this._dirty = true;
      }
      update() {
        if (this._dirty) { this.layoutGrid(); this._dirty = false; }
        this.text.mat.opacity = this.numAlpha;
      }
      setRowAmt(r, a) { if (Math.abs(this.rowAmt[r] - a) > 1e-4) { this.rowAmt[r] = a; this._dirty = true; } }
      setAllRows(a) { for (let r = 0; r < this.rowAmt.length; r++) this.setRowAmt(r, a); }
      rowY(r) { return (this.rows - 1 - r) * this.o.pitch + this.o.pitch / 2; }
      width() { return this.o.cols * this.o.pitch; }
      height() { return this.rows * this.o.pitch; }
      hover(id) {
        const r = Math.floor(id / this.o.cols), c = id % this.o.cols;
        const v = (this.values[r] || [])[c];
        if (v == null) return null;
        const nm = typeof this.o.sym === "function" ? this.o.sym(r, c) : `${this.o.sym}<sub>${r + 1}</sub>[${c + 1}]`;
        return `${nm} = <b>${v.toFixed(4)}</b>`;
      }
    }

    // ---------------- token chip ----------------
    const chipW = (w) => 0.36 + 0.118 * Math.max(2, w.length);
    class TokenChip extends THREE.Group {
      constructor(word, o = {}) {
        super();
        this.o = Object.assign({ color: CSS.cyan, glow: 2.2, h: 0.36, idText: null }, o);
        this.word = null;
        this.rimMat = new THREE.MeshBasicMaterial({ color: hdr(this.o.color, this.o.glow), toneMapped: false });
        this.body = mesh(RB(1, 1, 1, 0.1, 3), M.glassDark, 0, 0, 0, this);
        this.rim = mesh(RB(1, 1, 1, 0.1, 3), this.rimMat, 0, 0, -0.03, this);
        this.rim.castShadow = false;
        this.text = textPlane(1.6, 0.5, 280);
        this.text.mesh.position.z = 0.072;
        this.add(this.text.mesh);
        this.setWord(word, o.idText);
      }
      setWord(word, idText) {
        if (word === this.word && idText === this.idText) return;
        this.word = word; this.idText = idText;
        const w = chipW(word), h = this.o.h;
        this.w = w;
        this.body.scale.set(w, h, 0.13);
        this.rim.scale.set(w + 0.05, h + 0.05, 0.07);
        this.text.draw((ctx, W, H, ppu) => {
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.font = `600 ${0.2 * ppu}px ${FONT}`;
          ctx.fillStyle = "#f2f6f9";
          ctx.fillText(word, W / 2, H / 2 + 0.01 * ppu);
        });
      }
      setGlow(css, k) { this.rimMat.color.copy(hdr(css, k)); }
    }

    // ---------------- flowing light: tube beams + ray bundles ----------------
    const FLOW_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
    const FLOW_FS = `uniform float uTime, uOpacity, uSpeed, uDensity, uIntensity; uniform vec3 uColor; varying vec2 vUv;
      void main(){ float p = fract(vUv.x * uDensity - uTime * uSpeed);
        float pulse = smoothstep(0.0, 0.12, p) * (1.0 - smoothstep(0.12, 0.55, p));
        float core = 0.45 + 0.9 * pulse;
        float fade = smoothstep(0.0, 0.05, vUv.x) * (1.0 - smoothstep(0.95, 1.0, vUv.x));
        gl_FragColor = vec4(uColor * uIntensity * core, uOpacity * fade); }`;
    const timeU = { value: 0 };
    function flowMaterial(css, o = {}) {
      return new THREE.ShaderMaterial({
        uniforms: { uTime: timeU, uColor: { value: new THREE.Color(css) }, uOpacity: { value: o.opacity == null ? 0.9 : o.opacity },
          uSpeed: { value: o.speed || 0.8 }, uDensity: { value: o.density || 5 }, uIntensity: { value: o.intensity || 2.4 } },
        vertexShader: FLOW_VS, fragmentShader: FLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      });
    }
    class Beam extends THREE.Mesh {
      constructor(css, o = {}) {
        super(new THREE.BufferGeometry(), flowMaterial(css, o));
        this.renderOrder = 8; this.frustumCulled = false; this.radial = o.radial || 8; this.segs = o.segs || 40;
      }
      setCurve(curve, radius) {
        this.geometry.dispose();
        this.geometry = new THREE.TubeGeometry(curve, this.segs, Math.max(0.002, radius), this.radial, false);
      }
    }
    const RAY_VS = `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
    const RAY_FS = `uniform float uTime, uOpacity, uSpeed, uDensity, uIntensity; uniform vec3 uColor; varying float vT;
      void main(){ float p = fract(vT * uDensity - uTime * uSpeed); float pulse = smoothstep(0.0,0.1,p) * (1.0 - smoothstep(0.1,0.5,p));
        gl_FragColor = vec4(uColor * uIntensity * (0.35 + 1.1 * pulse), uOpacity); }`;
    class Rays extends THREE.LineSegments {
      constructor(css, o = {}) {
        const mat = new THREE.ShaderMaterial({
          uniforms: { uTime: timeU, uColor: { value: new THREE.Color(css) }, uOpacity: { value: o.opacity == null ? 0.85 : o.opacity },
            uSpeed: { value: o.speed || 0.9 }, uDensity: { value: o.density || 3 }, uIntensity: { value: o.intensity || 1.8 } },
          vertexShader: RAY_VS, fragmentShader: RAY_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        });
        super(new THREE.BufferGeometry(), mat);
        this.renderOrder = 7; this.frustumCulled = false;
      }
      /* segs: array of [p0, p1, t0, t1] (THREE.Vector3s, t = position along the light path for the flow) */
      setSegments(segs) {
        const pos = new Float32Array(segs.length * 6), t = new Float32Array(segs.length * 2);
        segs.forEach((s, i) => {
          pos.set([s[0].x, s[0].y, s[0].z, s[1].x, s[1].y, s[1].z], i * 6);
          t[i * 2] = s[2] == null ? 0 : s[2]; t[i * 2 + 1] = s[3] == null ? 1 : s[3];
        });
        this.geometry.dispose();
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        this.geometry.setAttribute("aT", new THREE.BufferAttribute(t, 1));
      }
    }

    // ---------------- analog dial ----------------
    class Dial extends THREE.Group {
      constructor(o) {
        super();
        this.o = Object.assign({ r: 1.0, min: 0, max: 5, major: 1, minor: 0.25, label: "", sub: "", color: CSS.amber, fmt: (v) => v.toFixed(2), unit: "", marks: [] }, o);
        const r = this.o.r;
        mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.16, 0.22, 64).rotateX(Math.PI / 2), M.dark, 0, 0, -0.08, this);
        const bez = mesh(new THREE.TorusGeometry(r * 1.06, r * 0.055, 16, 96), M.brass, 0, 0, 0.04, this);
        bez.castShadow = false;
        mesh(gearGeo(r * 1.13, r * 1.0, 60, 0.05, 0.08), M.brassDim, 0, 0, -0.04, this);
        this.face = textPlane(2 * r, 2 * r, 360, { renderOrder: 3 });
        this.face.mesh.position.z = 0.035;
        this.add(this.face.mesh);
        this.needle = new THREE.Group(); this.needle.position.z = 0.09; this.add(this.needle);
        const nm = new THREE.MeshBasicMaterial({ color: hdr(this.o.color, 3.2), toneMapped: false });
        const nd = new THREE.Mesh(new THREE.BoxGeometry(0.035, r * 0.84, 0.02), nm); nd.position.y = r * 0.38; this.needle.add(nd);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, r * 0.2, 0.02), M.brass); tail.position.y = -r * 0.08; this.needle.add(tail);
        mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 24).rotateX(Math.PI / 2), M.brass, 0, 0, 0.1, this);
        this.value = this.o.min; this.shown = this.o.min; this.readout = "";
        this.drawFace();
      }
      ang(v) { const o = this.o; const t = clamp((v - o.min) / (o.max - o.min)); return (2 / 3 - (4 / 3) * t) * Math.PI; }
      theta(v) { const o = this.o; const t = clamp((v - o.min) / (o.max - o.min)); return Math.PI * (5 / 6 + (4 / 3) * t); }
      drawFace() {
        const o = this.o, r = o.r;
        this.face.draw((ctx, W, H, ppu) => {
          const cx = W / 2, cy = H / 2, R = r * ppu;
          const P = (v, k) => { const th = this.theta(v); return [cx + Math.cos(th) * R * k, cy + Math.sin(th) * R * k]; };
          const g = ctx.createRadialGradient(cx, cy - R * 0.3, R * 0.1, cx, cy, R);
          g.addColorStop(0, "#1b232b"); g.addColorStop(1, "#080b0e");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.99, 0, Math.PI * 2); ctx.fill();
          for (const m of o.bands || []) {
            ctx.strokeStyle = m.color; ctx.lineWidth = R * 0.05; ctx.beginPath();
            ctx.arc(cx, cy, R * 0.8, this.theta(m.from), this.theta(m.to)); ctx.stroke();
          }
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const nT = Math.round((o.max - o.min) / o.minor);
          for (let i = 0; i <= nT; i++) {
            const v = o.min + i * o.minor;
            const major = Math.abs((v - o.min) / o.major - Math.round((v - o.min) / o.major)) < 1e-6;
            const [x0, y0] = P(v, major ? 0.73 : 0.79), [x1, y1] = P(v, 0.86);
            ctx.strokeStyle = major ? "#dfe6ec" : "#6f7a86"; ctx.lineWidth = major ? R * 0.022 : R * 0.011;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            if (major) {
              const [tx, ty] = P(v, 0.61);
              ctx.fillStyle = "#cfd8df"; ctx.font = `500 ${R * 0.11}px ${MONO}`;
              ctx.fillText(o.tick ? o.tick(v) : String(+v.toFixed(2)), tx, ty);
            }
          }
          for (const m of o.marks) {
            const [mx, my] = P(m.v, 0.93);
            ctx.fillStyle = m.color || CSS.cyan;
            ctx.beginPath(); ctx.arc(mx, my, R * 0.03, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = "#e9eef3"; ctx.font = `700 ${R * 0.105}px ${FONT}`;
          ctx.fillText(o.label, cx, cy + R * 0.36);
          ctx.fillStyle = "#8b96a3"; ctx.font = `500 ${R * 0.072}px ${FONT}`;
          ctx.fillText(o.sub, cx, cy + R * 0.48);
          ctx.fillStyle = o.color; ctx.font = `700 ${R * 0.19}px ${MONO}`;
          ctx.fillText(this.readout, cx, cy + R * 0.68);
        });
      }
      setValue(v, readout) { this.value = v; if (readout !== this.readout) { this.readout = readout; this.drawFace(); } }
      update(dt) { this.shown = damp(this.shown, this.value, 4.5, dt); this.needle.rotation.z = this.ang(this.shown); }
    }

    // ---------------- CSS2D pill labels ----------------
    const TAGS = [];
    function tag(text, sub, o = {}) {
      const el = document.createElement("div");
      el.className = "tag3d" + (o.cls ? " " + o.cls : "");
      el.innerHTML = `<i style="background:${o.dot || CSS.cyan};color:${o.dot || CSS.cyan}"></i><span class="tt">${text}</span><span class="ts">${sub || ""}</span>`;
      const obj = new A.CSS2DObject(el);
      obj.userData.stages = o.stages || null; // null = always eligible
      obj.userData.layer = o.layer == null ? null : o.layer;
      obj.userData.cond = o.cond || null;
      obj.center.set(o.cx == null ? 0.5 : o.cx, o.cy == null ? 0.5 : o.cy);
      TAGS.push(obj);
      obj.setText = (t, s) => {
        el.querySelector(".tt").innerHTML = t;
        const ts = el.querySelector(".ts");
        if (ts && s != null) ts.innerHTML = s;
      };
      return obj;
    }

    // ---------------- soft dot sprite ----------------
    function dotTexture() {
      const cv = document.createElement("canvas"); cv.width = cv.height = 64;
      const c = cv.getContext("2d");
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(cv); return t;
    }

    return { clamp, lerp, seg, damp, ease, CSS, COL, hdr, divColor, divCss, M, RB, mesh, gearGeo, knurlGeo, ringGeo, textPlane, roundRect, fmt,
      FONT, MONO, MatrixDisplay, TokenChip, chipW, Beam, Rays, flowMaterial, timeU, Dial, tag, TAGS, dotTexture };
  };
})();
