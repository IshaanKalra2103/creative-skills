// THE SET: one 3D world for the whole reel, so every change of view is a camera move, never a cut.
// A scanned head (Lee Perry-Smith) on a call with Apple's iPhone 17 AR model; the IR proximity sensor in the
// Dynamic Island; the screen is a live canvas (call UI -> off -> share sheet). Overlays read window.SET for the
// projected positions of parts and the live sensor count, so labels and numbers sit on the parts and agree with them.
//   hook   (line 0): the phone rises to the cheek, the screen dies on "ear"
//   inside (line 1): the camera glides to the island; a gold IR pulse is "always blinking"
//   count  (line 2): the pulse bounces off the cheek into the sensor; the phone backs off and returns, the count follows
//   end    (line 3): the phone comes off the face toward us, wakes, and the share sheet sends it to a friend
(() => {
const { p, clamp, lerp, ease } = L;
const Q = new URLSearchParams(location.search);

scene({
  name: 'set', t0: 0, t1: 1e9, z: -10, gl: true,
  async build() {
    const S = this, T = GL.THREE, g = S.gl;
    const V3 = (x, y, z) => new T.Vector3(x, y, z);

    // backdrop: a warm, dark studio falloff (screen-space, so it never swims)
    const bg = document.createElement('canvas'); bg.width = 540; bg.height = 960;
    const bx = bg.getContext('2d'), gr = bx.createRadialGradient(300, 430, 20, 270, 480, 700);
    gr.addColorStop(0, '#2a221d'); gr.addColorStop(0.45, '#15120f'); gr.addColorStop(1, '#070707');
    bx.fillStyle = gr; bx.fillRect(0, 0, 540, 960);
    GL.scene.background = new T.CanvasTexture(bg); GL.scene.background.colorSpace = T.SRGBColorSpace;

    // ---- the head: 0.052 m per model unit puts chin-to-crown at ~23 cm ----
    const head = await GL.glb('assets/models/head.glb');
    head.traverse(o => { if (o.isCamera || o.isLight) o.visible = false; });
    const skin = head.getObjectByName('LeePerrySmith');
    const [col, nrm, spec] = await Promise.all([GL.tex('assets/models/Map-COL.jpg'), GL.tex('assets/models/Infinite-Level_02_Tangent_SmoothUV.jpg', { srgb: false }),
      GL.tex('assets/models/Map-SPEC.jpg', { srgb: false })]);
    skin.material = new T.MeshPhysicalMaterial({ map: col, normalMap: nrm, normalScale: new T.Vector2(0.9, 0.9), roughness: 0.58,
      specularIntensityMap: spec, specularIntensity: 0.7, sheen: 0.35, sheenColor: new T.Color(0xff9a7a), sheenRoughness: 0.55 });
    head.scale.setScalar(0.052);
    g.add(head);
    head.updateMatrixWorld(true);
    S.head = head; S.skin = skin;
    // cutaway: a clip plane fixed to the phone slices the head just past the sensor, so the gap reads in profile.
    // Through the cut you see a dark section (back faces, flat colour); the removed part stays as a faint glass ghost.
    GL.renderer.localClippingEnabled = true;
    S.clip = new T.Plane(new T.Vector3(0, 1, 0), 1e3); S.clipInv = new T.Plane(new T.Vector3(0, -1, 0), -1e3);
    skin.material.clippingPlanes = [S.clip]; skin.material.clipShadows = true;
    S.cap = new T.Mesh(skin.geometry, new T.MeshBasicMaterial({ color: 0x3a221d, side: T.BackSide, clippingPlanes: [S.clip] }));
    S.xray = GL.onGlow(new T.Mesh(skin.geometry, new T.ShaderMaterial({
      uniforms: { uColor: { value: new T.Color(0xbcd0ec) }, uOpacity: { value: 0 } }, clipping: true, clippingPlanes: [S.clipInv],
      vertexShader: '#include <clipping_planes_pars_vertex>\nvarying vec3 vN; varying vec3 vV; void main(){ vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz); gl_Position = projectionMatrix * mvPosition;\n#include <clipping_planes_vertex>\n}',
      fragmentShader: '#include <clipping_planes_pars_fragment>\nuniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; void main(){\n#include <clipping_planes_fragment>\nfloat f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(uColor * (0.004 + 0.22 * f) * uOpacity, 1.0); }',
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
    })));
    S.cap.visible = S.xray.visible = false; skin.add(S.cap, S.xray);
    GL.dof._materialDepth.clippingPlanes = [S.clip];   // keep depth of field in step with the cut
    const H = (x, y, z) => head.localToWorld(V3(x, y, z));

    // ---- the phone, on a call: top at the ear, bottom along the jaw, screen facing the cheek ----
    const phone = await GL.glb('assets/models/iphone.glb');
    S.ph = new T.Group(); S.ph.add(phone); g.add(S.ph);
    const scr = phone.getObjectByName('Screen');
    S.ui = GL.screen(scr.material, { w: 1080, h: 2353, draw: (ctx, t, w, h) => drawScreen(S, ctx, t, w, h) });
    const E = H(1.5, 1.05, 0.5), J = H(0.8, 0.15, 2.05);  // top just in front of the ear (sensor faces the flat cheek), bottom at the mouth
    const u = E.clone().sub(J).normalize();
    const n = V3(-1, 0, 0).addScaledVector(u, u.x).normalize();
    const x = new T.Vector3().crossVectors(u, n);
    S.qCall = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, u, n));
    S.pCall = E.clone().addScaledVector(u, -0.067).addScaledVector(n, -0.0057 - 0.003);
    // slide the phone along its normal until the nearest point of its face is 1.5 mm off the skin
    const rc = new T.Raycaster(); let minD = 1;
    for (let ix = -1; ix <= 1; ix += 0.5) for (let iy = -1; iy <= 1; iy += 0.125) {
      const w = V3(ix * 0.033, iy * 0.073, 0.0057).applyQuaternion(S.qCall).add(S.pCall);
      rc.set(w.addScaledVector(n, -0.05), n);
      const hit = rc.intersectObject(skin)[0];
      if (hit) minD = Math.min(minD, hit.distance - 0.05);
    }
    S.pCall.addScaledVector(n, minD - 0.0015);
    S.n = n; S.u = u;
    S.PL = (x, y, z, q = S.qCall, pos = S.pCall) => V3(x, y, z).applyQuaternion(q).add(pos);  // phone-local -> world (call pose)

    // ---- the sensor: IR emitter + receiver hide in the left of the Dynamic Island ----
    S.EMIT = V3(-0.0064, 0.0671, 0.0059); S.RECV = V3(0.0040, 0.0671, 0.0059);   // spaced out for clarity (magnified illustration)
    // cut plane in phone-local terms: keep the side `n` points to; the plane passes through `p` (just past the emitter)
    S.CUT = { n: V3(-1, 0, 0), p: V3(-0.0064 + 0.0015, 0, 0) };
    // soft light: a radial falloff for dots, spots and packets; a fake-volumetric cone (bright core, soft edges) for beams
    const rad = document.createElement('canvas'); rad.width = rad.height = 128;
    { const c = rad.getContext('2d'), rg = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.2, 'rgba(255,255,255,.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = rg; c.fillRect(0, 0, 128, 128); }
    const radT = new T.CanvasTexture(rad), GOLD = new T.Color(FILM.theme.signal).multiplyScalar(2.2);
    const softDot = (r, op = 1) => { const m = GL.glow(undefined, op); m.map = radT; return GL.onGlow(new T.Mesh(new T.PlaneGeometry(2 * r, 2 * r), m)); };
    const cone = op => {
      const u = { uColor: { value: GOLD }, uOpacity: { value: op } };
      const m = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false,
        vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vL; void main(){ vL = 0.5 - position.y / max(1e-6, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying float vL; void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(uColor * f * uOpacity * (0.45 + 0.55 * vL), 1.0); }' });
      Object.defineProperty(m, 'opacity', { get: () => u.uOpacity.value, set: v => { u.uOpacity.value = v; } });
      return m;
    };
    S.emit = softDot(0.0013); S.emit.position.copy(S.EMIT);
    S.recvGlow = softDot(0.0012); S.recvGlow.position.copy(S.RECV);
    phone.add(S.emit, S.recvGlow);
    // beam, travelling packets, the spot on the skin: all in world space, rebuilt from the pose every frame
    S.beam = GL.onGlow(new T.Mesh(new T.CylinderGeometry(1, 1, 1, 32, 1, true), cone(0.3)));
    S.back = GL.onGlow(new T.Mesh(new T.CylinderGeometry(1, 1, 1, 32, 1, true), cone(0.2)));
    S.pk = [0, 1, 2].map(() => GL.onGlow(new T.Sprite(new T.SpriteMaterial({ map: radT, color: GOLD, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }))));
    S.pk.forEach(m => m.scale.setScalar(0.0022));
    S.spot = softDot(0.0045, 0.6);
    g.add(S.beam, S.back, S.spot, ...S.pk);
    // screen light spilling on the cheek (dies with the screen)
    S.spill = new T.PointLight(0xa9c2ff, 0, 0.3, 2); g.add(S.spill);

    // ---- calibrate the sensor count on the real geometry: ~230 on contact, screen off above TH ----
    S.d0 = S.gap(S.pCall, S.qCall);
    S.TH = 150;

    // ---- timing, from the voice ----
    S.tEar = W('ear'); S.L1 = LINE(1).s; S.L2 = LINE(2).s; S.L3 = LINE(3).s;
    S.tLight = W('light'); S.tSensor = W('sensor'); S.tCounts = W('counts'); S.tGlow = W('glow'); S.tSend = W('send'); S.tFriend = W('friend'); S.tFace = W('face');
    S.tPick = WE('friend') + 0.05; S.tTap = S.tFace + 0.12;

    // ---- the away pose (start) and the end pose (facing the camera) ----
    const C0 = V3(0.40, 0.085, 0.50);
    S.pAway = S.pCall.clone().add(V3(0.035, -0.115, 0.085));
    S.qAway = facing(T, S.pAway, C0, V3(-0.12, 1, 0));
    const CE = V3(0.36, 0.03, 0.40), AE = V3(0.09, -0.005, 0.10);
    // 0.44 m out the phone fits between the caption band and IG's bottom UI, so Send stays visible
    S.pEnd = CE.clone().addScaledVector(AE.clone().sub(CE).normalize(), 0.44); S.pEnd.y -= 0.005;
    S.qEnd = facing(T, S.pEnd, CE, V3(0, 1, 0));

    // ---- the camera path: one move through the whole reel ----
    const tgt = S.PL(-0.003, 0.064, 0.011).toArray();          // between the island and the cheek
    S.keys = [
      [0, { pos: [0.50, 0.12, 0.62], at: [0.04, 0.03, 0.06], aperture: 0.05 }],
      [S.tEar, { pos: [0.43, 0.125, 0.53], at: S.PL(0, 0.035, 0).toArray(), aperture: 0.06 }],
      [S.L1 + 0.55, { pos: S.PL(0.20, 0.07, 0.07).toArray(), at: S.PL(-0.002, 0.06, 0.008).toArray(), aperture: 0.08 }],
      [S.tLight, { pos: S.PL(0.09, 0.05, 0.062).toArray(), at: tgt, aperture: 0.12 }],
      [S.L2, { pos: S.PL(0.075, 0.042, 0.052).toArray(), at: tgt, aperture: 0.12 }],
      [S.tSensor, { pos: S.PL(0.078, 0.03, 0.033).toArray(), at: S.PL(-0.002, 0.064, 0.001).toArray(), aperture: 0.12 }],
      [S.tGlow + 0.4, { pos: S.PL(0.085, 0.034, 0.03).toArray(), at: S.PL(-0.002, 0.064, 0.0).toArray(), aperture: 0.12 }],
      [S.L3 + 0.45, { pos: S.PL(0.22, 0.06, 0.02).toArray(), at: S.PL(0, 0.04, -0.01).toArray(), aperture: 0.08 }],
      [S.L3 + 1.2, { pos: CE.toArray(), at: AE.toArray(), aperture: 0.3 }],
      [FILM.dur, { pos: [CE.x - 0.008, CE.y + 0.003, CE.z - 0.006], at: AE.toArray(), aperture: 0.3, ease: 'lin' }],
    ];
    if (Q.get('lcam')) { const c = Q.get('lcam').split(',').map(Number); S.keys = [[0, { pos: S.PL(...c.slice(0, 3)).toArray(), at: S.PL(...c.slice(3, 6)).toArray(), aperture: c[6] ?? 0.3, roll: c[7] ?? 0 }]]; }
    if (Q.get('cam')) { const c = Q.get('cam').split(',').map(Number); S.keys = [[0, { pos: c.slice(0, 3), at: c.slice(3, 6), aperture: c[6] ?? 0.05 }]]; }

    // the real part, sourced with scripts/web_images.py: TechInsights' teardown photo of the iPhone 14 Pro proximity module
    // (emitter + detector windows), on a card that floats into the empty corner of the shot while the line says you can't see it.
    // On the GLOW layer so the DOF depth pass (which carries the cutaway clip) reads the phone behind it instead of the card.
    S.card = GL.onGlow(await GL.picture('assets/img/prox/module.jpg', { h: 0.0072, frame: 'card' }));
    S.tCard = W('always') - 0.3; S.tCardOut = S.L2 + 0.25;
    const cs = GL.inShot(S.tCard + 0.5, S.keys, 0.69, 0.645, 0.072);   // nearer than the phone glass, or its far edge sinks into it
    S.card.position.copy(cs.pos); S.card.quaternion.copy(cs.quat); S.card.rotateY(-0.26); S.card.rotateX(0.08);
    S.cardQ = S.card.quaternion.clone();
    GL.scene.add(S.card);

    // lights: warm key from front-right, cool rim from behind-left to cut the head out of the dark
    GL.lights.key.position.set(0.9, 0.9, 0.9); GL.lights.key.intensity = 2.6;
    GL.lights.rim.position.set(-0.6, 0.5, -0.9); GL.lights.rim.intensity = 1.7;
    GL.lights.fill.intensity = 0.18;
    GL.shadowFit(head, 1.1);

    sfx(S.tEar, 'click', 0.7); sfx(S.L1 - 0.25, 'whoosh', 0.6); sfx(S.L3 + 0.1, 'whoosh_down', 0.5);
    sfx(S.tPick, 'pop', 0.6); sfx(S.tTap, 'send', 0.7);
    window.SET = S;
  },

  // phone pose at time t -> {pos, q}
  poseAt(t) {
    const S = this, T = GL.THREE;
    let pos = new T.Vector3(), q = new T.Quaternion();
    // hook: away -> call, an arc that lands on "ear"
    const k = p(t, 0.15, S.tEar - 0.15, ease.inOutCubic);
    pos.lerpVectors(S.pAway, S.pCall, k).addScaledVector(S.n, -0.02 * Math.sin(Math.PI * k));
    q.slerpQuaternions(S.qAway, S.qCall, ease.outCubic(clamp(k * 1.1)));
    // count: back off the cheek on "counts", return on "glow"
    const off = p(t, S.tSensor + 0.1, 0.45, ease.inOutCubic) - p(t, S.tGlow + 0.05, 0.45, ease.inOutCubic);
    pos.addScaledVector(S.n, -0.013 * off);
    // end: off the face and toward the camera, turning to face it
    const e = p(t, S.L3 - 0.05, 1.05, ease.inOutCubic);
    if (e > 0) { pos.lerp(S.pEnd, e).addScaledVector(S.n, -0.03 * Math.sin(Math.PI * e)); q.slerp(S.qEnd, e); }
    // a hand never holds still: tiny drift
    pos.x += 0.0008 * L.noise1(t * 0.9 + 3); pos.y += 0.0008 * L.noise1(t * 0.8 + 11);
    return { pos, q };
  },
  pose(t) { const P = this.poseAt(t); this.ph.position.copy(P.pos); this.ph.quaternion.copy(P.q); this.ph.updateMatrixWorld(true); return P; },
  // distance from the emitter to the skin along the phone's normal (Infinity if it misses)
  gap(pos, q) {
    const T = GL.THREE, o = this.EMIT.clone().applyQuaternion(q).add(pos), d = new T.Vector3(0, 0, 1).applyQuaternion(q);
    const hit = new T.Raycaster(o, d, 0, 0.3).intersectObject(this.skin)[0];
    this.hit = hit ? hit.point : o.clone().addScaledVector(d, 0.3);
    return hit ? hit.distance : Infinity;
  },
  // what the sensor reads at gap d (inverse square, clipped to 8 bits)
  countAt(d) { return Math.round(255 * clamp(Math.pow(this.d0 * 1.05 / d, 2))); },

  update(t) {
    const S = this, T = GL.THREE;
    const P = S.pose(t);
    const d = S.gap(P.pos, P.q);
    S.count = S.countAt(d);
    // the screen is driven by the count, so it dies exactly when the reading crosses the threshold
    S.bright = 1 - clamp((S.count - (S.TH - 25)) / 25);
    S.ui.material.emissiveIntensity = 1.25 * S.bright;
    S.spill.position.copy(S.PL(0, 0, 0.02, P.q, P.pos));
    S.spill.intensity = 0.0012 * S.bright;
    // the cut opens as the camera arrives at the sensor and closes as the phone leaves the face
    const ck = Q.has('ck') ? +Q.get('ck') : p(t, S.L1 - 0.3, 0.65, ease.inOutCubic) * (1 - p(t, S.L3 + 0.55, 0.5, ease.inOutCubic));
    const cn = S.CUT.n.clone().applyQuaternion(P.q), cp = S.CUT.p.clone().applyQuaternion(P.q).add(P.pos).addScaledVector(cn, -(1 - ck) * 0.16);
    S.clip.setFromNormalAndCoplanarPoint(cn, cp); S.clipInv.copy(S.clip).negate();
    // the glass ghost only in the close-up: while the camera is still near the ear (cut opening/closing) it fills the
    // frame and reads as smoke
    const gh = ck * p(t, S.tLight, 0.4) * (1 - p(t, S.L3, 0.3));
    S.cap.visible = ck > 0.001; S.xray.visible = gh > 0.001; S.xray.material.uniforms.uOpacity.value = clamp(gh * 1.5);
    if (Q.has('dbg')) console.warn('dbg', t.toFixed(2), 'count', S.count, 'gap', d.toFixed(4));

    // IR: visible from "light" until the phone leaves the face; pulses at 4 Hz ("slowed down")
    const vis = p(t, S.tLight - 0.1, 0.3) * (1 - p(t, S.L3 + 0.3, 0.3));
    const RATE = 4, ph = (t * RATE) % 1;
    const flash = Math.exp(-ph * 9);                      // the blink, at the emitter
    const o = S.EMIT.clone().applyQuaternion(P.q).add(P.pos), r = S.RECV.clone().applyQuaternion(P.q).add(P.pos);
    const hit = S.hit, near = isFinite(d) && d < 0.06;
    S.emit.material.opacity = vis * (0.35 + 0.65 * flash);
    stretch(S.beam, o, hit, 0.0006, 0.0034); S.beam.material.opacity = vis * near * (0.06 + 0.24 * flash);
    stretch(S.back, hit, r, 0.0030, 0.0006);
    const ret = Math.exp(-((ph - 0.28 + 1) % 1) * 7);     // the echo arrives a beat later
    S.back.material.opacity = vis * near * (0.05 + 0.25 * ret) * clamp(S.count / 200);
    S.recvGlow.material.opacity = vis * (0.15 + 0.85 * ret * clamp(S.count / 160));
    S.spot.position.copy(hit).addScaledVector(new T.Vector3(0, 0, 1).applyQuaternion(P.q), -0.0006);
    S.spot.quaternion.copy(P.q); S.spot.material.opacity = vis * near * (0.15 + 0.5 * flash);
    // packets: out to the cheek in the first 0.28 of each cycle, back to the sensor in the next 0.28
    S.pk.forEach((m, i) => {
      const f = ((ph - i * 0.07) % 1 + 1) % 1;
      if (f < 0.28) m.position.lerpVectors(o, hit, f / 0.28); else if (f < 0.56) m.position.lerpVectors(hit, r, (f - 0.28) / 0.28);
      m.material.opacity = vis * near * (f < 0.56 ? 1 - i * 0.3 : 0) * (f >= 0.28 ? clamp(S.count / 180) : 1);
    });
    S.beam.visible = S.back.visible = S.spot.visible = near && vis > 0;

    // photo card: pops in, settles with a slow turn, drops out as line 2 starts
    const cin = p(t, S.tCard, 0.45, ease.outBack), cout = p(t, S.tCardOut, 0.3, ease.inCubic), csz = cin * (1 - cout);
    S.card.visible = csz > 0.001;
    S.card.scale.setScalar(Math.max(csz, 0.001));
    S.card.quaternion.copy(S.cardQ); S.card.rotateY(0.25 * (1 - cin) - 0.06 * (t - S.tCard));
    S.cardVis = csz;

    // overlay anchors (screen px), for labels and numbers
    GL.cam(t, S.keys);
    S.at = { emit: GL.project(o), recv: GL.project(r), hit: GL.project(hit), spk: GL.project(S.PL(0, 0.0735, 0.0045, P.q, P.pos)),
      card: GL.project(S.card.localToWorld(new GL.THREE.Vector3(0, -0.0072 * 0.6, 0))) };
  },
});

// a quaternion whose +Z faces `target` from `pos`, with `up` as near as possible to +Y
function facing(T, pos, target, up) {
  const z = target.clone().sub(pos).normalize(), y = up.clone().normalize().addScaledVector(z, -up.clone().normalize().dot(z)).normalize();
  const x = new T.Vector3().crossVectors(y, z);
  return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
}
// stretch a unit open cylinder (axis Y) between a and b with end radii ra (at a) and rb (at b)
function stretch(m, a, b, ra, rb) {
  const T = GL.THREE, d = b.clone().sub(a), len = Math.max(d.length(), 1e-5);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  m.scale.set(1, len, 1);
  const pos = m.geometry.attributes.position, base = m.geometry.userData.base || (m.geometry.userData.base = Float32Array.from(pos.array));
  for (let i = 0; i < pos.count; i++) {
    const y = base[i * 3 + 1], r = y > 0 ? rb : ra;   // +Y end sits at b
    pos.setXYZ(i, base[i * 3] * r, y, base[i * 3 + 2] * r);
  }
  pos.needsUpdate = true;
}

// ---- the phone screen (a 2D canvas the size of the panel) ----
function drawScreen(S, ctx, t, w, h) {
  const end = p(t, S.L3 + 0.35, 0.35);
  if (end <= 0) return drawCall(ctx, t, w, h);
  drawCall(ctx, t, w, h);
  ctx.globalAlpha = end; drawShare(S, ctx, t, w, h); ctx.globalAlpha = 1;
  return 'share' + t.toFixed(3);
}
function statusBar(ctx, w) {
  ctx.fillStyle = '#fff'; ctx.font = '600 50px Inter'; ctx.textAlign = 'left'; ctx.fillText('9:41', 120, 112);
  const x = w - 120;  // battery, wifi, signal
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.5)'; rr(ctx, x - 78, 80, 70, 36, 11); ctx.stroke();
  ctx.fillStyle = '#fff'; rr(ctx, x - 73, 85, 54, 26, 7); ctx.fill(); ctx.fillRect(x - 4, 92, 5, 12);
  for (let i = 0; i < 4; i++) ctx.fillRect(x - 250 + i * 16, 112 - 10 - i * 7, 11, 10 + i * 7);
  ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(x - 128, 112); ctx.arc(x - 128, 112, 12 + i * 11, -Math.PI * 0.75, -Math.PI * 0.25); } ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke();
}
function drawCall(ctx, t, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#6a7f9e'); g.addColorStop(0.45, '#33405a'); g.addColorStop(1, '#151a26');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const rg = ctx.createRadialGradient(w * 0.3, h * 0.2, 10, w * 0.3, h * 0.2, w); rg.addColorStop(0, 'rgba(255,190,150,.35)'); rg.addColorStop(1, 'rgba(255,190,150,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  statusBar(ctx, w);
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '500 46px Inter'; ctx.fillText('mobile', w / 2, 330);
  ctx.fillStyle = '#fff'; ctx.font = '300 150px Inter'; ctx.fillText('Mom', w / 2, 490);
  const s = 7 + Math.floor(t);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '500 50px Inter'; ctx.fillText(`0:${String(s).padStart(2, '0')}`, w / 2, 570);
  const icons = ['speaker', 'facetime', 'mute', 'more', 'end', 'keypad'], names = ['speaker', 'FaceTime', 'mute', 'more', 'end', 'keypad'];
  icons.forEach((ic, i) => {
    const cx = w / 2 + (i % 3 - 1) * 310, cy = 1640 + Math.floor(i / 3) * 330;
    ctx.fillStyle = ic === 'end' ? '#ff3b30' : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(cx, cy, 104, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '500 38px Inter'; ctx.fillText(names[i], cx, cy + 170);
    icon(ctx, ic, cx, cy);
  });
  return 'call' + s;
}
function icon(ctx, ic, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  if (ic === 'speaker') { ctx.beginPath(); ctx.moveTo(-34, -14); ctx.lineTo(-16, -14); ctx.lineTo(8, -36); ctx.lineTo(8, 36); ctx.lineTo(-16, 14); ctx.lineTo(-34, 14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(10, 0, 22, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(10, 0, 40, -0.8, 0.8); ctx.stroke(); }
  if (ic === 'facetime') { rr(ctx, -40, -24, 54, 48, 12); ctx.fill(); ctx.beginPath(); ctx.moveTo(20, -6); ctx.lineTo(40, -20); ctx.lineTo(40, 20); ctx.lineTo(20, 6); ctx.fill(); }
  if (ic === 'mute') { rr(ctx, -14, -40, 28, 52, 14); ctx.fill(); ctx.beginPath(); ctx.arc(0, -4, 28, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, 40); ctx.stroke(); }
  if (ic === 'more') for (const dx of [-30, 0, 30]) { ctx.beginPath(); ctx.arc(dx, 0, 9, 0, 7); ctx.fill(); }
  if (ic === 'keypad') for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((i % 3 - 1) * 26, (Math.floor(i / 3) - 1) * 26, 8, 0, 7); ctx.fill(); }
  if (ic === 'end') { ctx.rotate(Math.PI * 0.75); ctx.beginPath(); ctx.ellipse(0, 0, 44, 16, 0, Math.PI, 0); ctx.lineWidth = 14; ctx.stroke(); }
  ctx.restore();
}
function drawShare(S, ctx, t, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, w, h);
  const rise = 1 - p(t, S.L3 + 0.35, 0.45, ease.outCubic);
  ctx.save(); ctx.translate(0, rise * 900);
  const top = 980;
  ctx.fillStyle = '#262626'; rr(ctx, 0, top, w, h - top + 60, 56); ctx.fill();
  ctx.fillStyle = '#555'; rr(ctx, w / 2 - 60, top + 26, 120, 12, 6); ctx.fill();
  ctx.fillStyle = '#363636'; rr(ctx, 60, top + 80, w - 120, 96, 26); ctx.fill();
  ctx.fillStyle = '#9a9a9a'; ctx.font = '500 42px Inter'; ctx.textAlign = 'left'; ctx.fillText('Search', 150, top + 143);
  ctx.beginPath(); ctx.arc(110, top + 126, 16, 0, 7); ctx.lineWidth = 5; ctx.strokeStyle = '#9a9a9a'; ctx.stroke();
  const ppl = [['Maya', '#f7c59f'], ['Leo', '#9ad1d4'], ['Sam', '#c3b1e1'], ['Priya', '#ffd6a5'], ['Jordan', '#b5e48c'], ['Alex', '#ffadad']];
  const pick = t >= S.tPick, pk = L.pop(t, S.tPick);
  ppl.forEach(([nm, c], i) => {
    const cx = 210 + (i % 3) * 330, cy = top + 400 + Math.floor(i / 3) * 360;
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, 116, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.font = '700 84px Inter'; ctx.textAlign = 'center'; ctx.fillText(nm[0], cx, cy + 30);
    ctx.fillStyle = '#e8e8e8'; ctx.font = '500 40px Inter'; ctx.fillText(nm, cx, cy + 180);
    if (i === 1 && pick) {
      ctx.save(); ctx.translate(cx + 82, cy + 82); ctx.scale(pk, pk);
      ctx.fillStyle = '#0095f6'; ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#262626'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-5, 15); ctx.lineTo(20, -12); ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.stroke(); ctx.restore();
    }
  });
  // Send rises once a friend is picked, gets tapped, then reads "Sent"
  const sb = p(t, S.tPick + 0.05, 0.3, ease.outCubic);
  if (sb > 0) {
    const sent = t >= S.tTap + 0.15, press = 1 - 0.05 * Math.sin(Math.PI * clamp((t - S.tTap) / 0.18));
    ctx.save(); ctx.translate(w / 2, h - 230 + (1 - sb) * 300); ctx.scale(press, press);
    ctx.fillStyle = sent ? '#363636' : '#0095f6'; rr(ctx, -(w - 120) / 2, -60, w - 120, 120, 28); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 52px Inter'; ctx.textAlign = 'center'; ctx.fillText(sent ? 'Sent' : 'Send', 0, 18); ctx.restore();
    const rp = clamp((t - S.tTap) / 0.5);  // tap ripple
    if (rp > 0 && rp < 1) { ctx.beginPath(); ctx.arc(w / 2 + 120, h - 230, 40 + 160 * rp, 0, 7); ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - rp)})`; ctx.fill(); }
  }
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
})();
