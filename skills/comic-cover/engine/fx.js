import * as THREE from 'three';
import {flatMaterial, ID, U} from './materials.js';

// ------------------------------------------------------------------ SFX lettering (HTML over the canvas)
const SFX_STYLES = [
  {fill: '#ffd23f', shade: '#e8631c'},
  {fill: '#ffffff', shade: '#57b5ff'},
  {fill: '#ff4a3d', shade: '#ffd23f'},
];

export function createFX({scene, camera, layer, scale = 1, power = {}}) {
  // scale: hero height / 1.2 m, so strands and bursts stay in proportion for any model
  const webs = [];
  const beams = [];
  const bolts = [];
  const tmp = new THREE.Vector3();

  function toCover(v) {
    tmp.copy(v).project(camera);
    return {x: (tmp.x * 0.5 + 0.5) * 100, y: (-tmp.y * 0.5 + 0.5) * 100, behind: tmp.z > 1};
  }

  function sfx(text, at, {size = 1, style = 0, rot = null, dx = 0, dy = 0} = {}) {
    const p = typeof at.x === 'number' && at.isVector3 ? toCover(at) : at;
    const el = document.createElement('div');
    el.className = 'sfx';
    const s = SFX_STYLES[style % SFX_STYLES.length];
    el.style.setProperty('--fill', s.fill);
    el.style.setProperty('--shade', s.shade);
    el.style.setProperty('--rot', `${rot ?? (Math.random() * 24 - 12)}deg`);
    el.style.setProperty('--size', size);
    el.style.left = `${p.x + dx}%`;
    el.style.top = `${Math.min(Math.max(p.y + dy, 8), 92)}%`;
    el.innerHTML = [...text].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    el.dataset.text = text;
    layer.appendChild(el);
    // keep the whole word on the cover
    const half = el.offsetWidth / layer.clientWidth * 50 + 3;
    el.style.left = `${Math.min(Math.max(p.x + dx, half), 100 - half)}%`;
    el.addEventListener('animationend', (e) => { if (e.target === el) el.remove(); });
    return el;
  }

  // ------------------------------------------------------------------ webs
  const webMat = () => flatMaterial({color: power.color || 0xf6f4ff, id: ID.web});
  const splatTex = makeSplatTexture();

  function shootWeb(from, to, normal) {
    // The strand leaves a hand that is already in front of him, so draw it over the hero
    // instead of letting his head swallow it on the way to the wall.
    const m = webMat();
    m.depthTest = false;
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(from, from.clone().addScalar(1e-3)), 1, 0.001, 3), m);
    mesh.renderOrder = 10;
    mesh.frustumCulled = false;
    scene.add(mesh);
    const splat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flatMaterial({color: 0xf6f4ff, id: ID.web, map: splatTex, alphaTest: 0.5}));
    const nrm = normal || new THREE.Vector3(0, 0, 1);
    splat.position.copy(to).addScaledVector(nrm, 0.05);
    splat.lookAt(tmp.copy(to).add(nrm));
    splat.rotateZ(Math.random() * Math.PI);
    splat.scale.setScalar(0.001);
    splat.visible = false;
    scene.add(splat);
    const len = from.distanceTo(to);
    webs.push({mesh, splat, from: from.clone(), to: to.clone(), t0: performance.now() / 1000, len, splatSize: THREE.MathUtils.clamp(len * 0.06, 0.8, 2.6)});
    if (!normal) { splat.visible = false; webs[webs.length - 1].noSplat = true; }
  }

  function webCurve(w, t) {
    // shoot (0..0.16s) → taut (..2.6s) → snap and fall away (..3.4s)
    const age = t - w.t0;
    const shoot = Math.min(age / 0.16, 1);
    const snap = Math.max(0, (age - 2.6) / 0.8);
    const pts = [];
    const N = 28;
    const tip = new THREE.Vector3().lerpVectors(w.from, w.to, shoot);
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const p = new THREE.Vector3().lerpVectors(w.from, tip, s);
      const sag = Math.sin(s * Math.PI) * (0.02 * w.len * (shoot < 1 ? 0.2 : 1) + snap * snap * w.len * 0.5);
      p.y -= sag;
      // wiggle while in flight
      if (shoot < 1) p.x += Math.sin(s * 30 + age * 60) * 0.01 * (1 - s);
      pts.push(p);
    }
    return {pts, shoot, snap, age};
  }

  function updateWebs(t) {
    for (let i = webs.length - 1; i >= 0; i--) {
      const w = webs[i];
      const {pts, shoot, snap, age} = webCurve(w, t);
      if (snap >= 1) {
        scene.remove(w.mesh, w.splat);
        w.mesh.geometry.dispose();
        webs.splice(i, 1);
        continue;
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const radius = 0.018 * scale * (1 - snap * 0.7);
      w.mesh.geometry.dispose();
      w.mesh.geometry = new THREE.TubeGeometry(curve, 40, radius, 5, false);
      if (shoot >= 1 && !w.noSplat) {
        w.splat.visible = true;
        const k = Math.min((age - 0.16) / 0.12, 1);
        const pop = k < 1 ? 1.25 * Math.sin(k * Math.PI * 0.5) : 1;
        w.splat.scale.setScalar(w.splatSize * pop * (1 - snap));
      }
    }
  }

  // ------------------------------------------------------------------ beam: an energy blast from the emitter
  const beamCore = flatMaterial({color: 0xffffff, id: ID.web});
  const beamHalo = flatMaterial({color: power.color || 0x7fe8ff, id: ID.web + 0.02});
  for (const m of [beamCore, beamHalo]) m.depthTest = false;
  const starTex = makeStarTexture();
  function fireBeam(from, to) {
    const group = new THREE.Group();
    const r = 0.022 * scale;
    const path = new THREE.LineCurve3(from.clone(), to.clone());
    const core = new THREE.Mesh(new THREE.TubeGeometry(path, 1, r, 8), beamCore);
    const halo = new THREE.Mesh(new THREE.TubeGeometry(path, 1, r * 2.3, 8), beamHalo);
    core.renderOrder = 11; halo.renderOrder = 10;
    const star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flatMaterial({color: power.color || 0x7fe8ff, id: ID.web, map: starTex, alphaTest: 0.5}));
    star.material.depthTest = false; star.renderOrder = 12;
    star.position.copy(to);
    group.add(halo, core, star);
    scene.add(group);
    beams.push({group, star, t0: performance.now() / 1000, len: from.distanceTo(to)});
  }
  function updateBeams(t) {
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      const age = api.hold ? 0.2 : t - b.t0;
      b.group.visible = !(age > 0.12 && age < 0.16); // one flicker
      b.star.quaternion.copy(camera.quaternion);
      const k = Math.min(age / 0.1, 1);
      b.star.scale.setScalar(Math.max(0.001, THREE.MathUtils.clamp(b.len * 0.08, 0.6, 3) * scale * (k < 1 ? k * 1.3 : 1.3 - Math.min((age - 0.1) * 2, 1))));
      if (age > 0.45) {
        scene.remove(b.group);
        b.group.traverse((o) => o.geometry && o.geometry.dispose());
        beams.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------ club: a billy club thrown on its cable, a ricochet, then reeled in
  const clubs = [];
  const clubMat = flatMaterial({color: power.color || 0xd8262c, id: ID.web + 0.02});
  const cableMat = flatMaterial({color: power.cable || 0xc8202c, id: ID.web});
  for (const m of [clubMat, cableMat]) m.depthTest = false;
  function throwClub(from, to, normal, onHit) {
    const cable = new THREE.Mesh(new THREE.BufferGeometry(), cableMat);
    const club = new THREE.Mesh(new THREE.CapsuleGeometry(0.03 * scale, 0.5 * scale, 4, 10), clubMat);
    const star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flatMaterial({color: 0xfff3c4, id: ID.web, map: starTex, alphaTest: 0.5}));
    star.material.depthTest = false;
    cable.renderOrder = 10; club.renderOrder = 11; star.renderOrder = 12;
    for (const o of [cable, club, star]) { o.frustumCulled = false; scene.add(o); }
    star.visible = false;
    const len = from.distanceTo(to);
    const back = from.clone().sub(to).normalize();
    if (normal) back.lerp(normal.clone().normalize(), 0.5).normalize();
    clubs.push({cable, club, star, from: from.clone(), to: to.clone(), len, back, onHit, hit: false,
      t0: performance.now() / 1000, fly: THREE.MathUtils.clamp(len * 0.018, 0.14, 0.32)});
  }
  function updateClubs(t) {
    const view = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
    for (let i = clubs.length - 1; i >= 0; i--) {
      const c = clubs[i];
      const T1 = c.fly, T2 = T1 + 0.4, T3 = T2 + 0.42;
      const age = api.hold ? T1 + 0.06 : t - c.t0;
      if (age > T3) {
        scene.remove(c.cable, c.club, c.star);
        c.cable.geometry.dispose(); c.club.geometry.dispose(); c.star.material.dispose();
        clubs.splice(i, 1);
        continue;
      }
      const p = new THREE.Vector3();
      let sag = 0;
      const rebound = c.to.clone().addScaledVector(c.back, Math.min(c.len * 0.12, 1.6)).add(new THREE.Vector3(0, -0.25 * scale, 0));
      if (age < T1) {
        const k = age / T1;
        p.lerpVectors(c.from, c.to, 1 - (1 - k) * (1 - k));
        sag = 0.01;
      } else if (age < T2) {
        const k = (age - T1) / (T2 - T1);
        p.lerpVectors(c.to, rebound, Math.sin(k * Math.PI / 2));
        sag = 0.02 + k * 0.08;
      } else {
        const k = (age - T2) / (T3 - T2);
        p.lerpVectors(rebound, c.from, k * k * (3 - 2 * k));
        sag = 0.1 * (1 - k);
      }
      if (age >= T1 && !c.hit) { c.hit = true; c.onHit?.(c.to.clone()); }
      // spin end over end in the picture plane, slowing as it's reeled in
      c.club.position.copy(p);
      c.club.quaternion.setFromAxisAngle(view, age * (age < T1 ? 30 : 14));
      // cable: a sagging line from the hand to the club
      const pts = [];
      const d = c.from.distanceTo(p);
      for (let k = 0; k <= 20; k++) {
        const s = k / 20;
        pts.push(new THREE.Vector3().lerpVectors(c.from, p, s).add(new THREE.Vector3(0, -Math.sin(s * Math.PI) * sag * d, 0)));
      }
      c.cable.geometry.dispose();
      c.cable.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.016 * scale, 6, false);
      // impact star
      const ks = (age - T1) / 0.22;
      c.star.visible = ks >= 0 && ks < 1;
      if (c.star.visible) {
        c.star.position.copy(c.to);
        c.star.quaternion.copy(camera.quaternion);
        c.star.scale.setScalar(Math.max(0.001, THREE.MathUtils.clamp(c.len * 0.06, 0.5, 2.2) * scale * Math.sin(Math.min(ks * 1.4, 1) * Math.PI * 0.5) * (1 - ks * 0.6)));
      }
    }
  }

  // ------------------------------------------------------------------ lightning
  const boltMat = flatMaterial({color: 0xfffbe6, id: ID.bolt});
  const haloMat = flatMaterial({color: 0x9fe3ff, id: ID.bolt + 0.02});
  // Jagged bolt between two world points: recursive midpoint displacement in the picture plane.
  function jag(a, b, depth, amp, side) {
    let pts = [a.clone(), b.clone()];
    for (let d = 0; d < depth; d++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const m = pts[i].clone().lerp(pts[i + 1], 0.5).addScaledVector(side, (Math.random() - 0.5) * amp);
        next.push(m, pts[i + 1]);
      }
      pts = next;
      amp *= 0.56;
    }
    return pts;
  }
  function lightning(from, to) {
    const side = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const len = from.distanceTo(to);
    const group = new THREE.Group();
    const addStroke = (P, r) => {
      // straight segments, so the bolt keeps its hard zig-zag corners
      const path = new THREE.CurvePath();
      for (let i = 0; i < P.length - 1; i++) path.add(new THREE.LineCurve3(P[i], P[i + 1]));
      const core = new THREE.Mesh(new THREE.TubeGeometry(path, P.length * 3, r, 5, false), boltMat);
      const halo = new THREE.Mesh(new THREE.TubeGeometry(path, P.length * 3, r * 2.3, 5, false), haloMat);
      core.renderOrder = 1;
      // push the halo slightly behind so the core wins the depth test
      halo.position.copy(camera.position).sub(P[0]).normalize().multiplyScalar(-r * 3);
      group.add(halo, core);
    };
    const main = jag(from, to, 5, len * 0.35, side);
    addStroke(main, len * 0.011);
    for (let b = 0; b < 3; b++) {
      const i0 = 4 + Math.floor(Math.random() * (main.length * 0.6));
      const a = main[i0];
      const dir = to.clone().sub(from).normalize();
      const end = a.clone().addScaledVector(dir, len * (0.2 + Math.random() * 0.2))
        .addScaledVector(side, (Math.random() < 0.5 ? -1 : 1) * len * (0.15 + Math.random() * 0.15));
      addStroke(jag(a, end, 3, len * 0.12, side), len * 0.0045);
    }
    scene.add(group);
    bolts.push({group, t0: performance.now() / 1000});
    U.uFlashDir.value.copy(from).sub(camera.position).normalize();
    return from;
  }
  function updateBolts(t) {
    let flash = 0;
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      const age = api.hold ? 0.05 : t - b.t0;
      // flicker: on, off, on, fade
      const on = age < 0.14 || (age > 0.2 && age < 0.5);
      b.group.visible = on;
      flash = Math.max(flash, on ? 1 : Math.max(0, 1 - (age - 0.5) * 2.5) * 0.4);
      if (age > 0.9) {
        scene.remove(b.group);
        b.group.traverse(o => o.geometry && o.geometry.dispose());
        bolts.splice(i, 1);
      }
    }
    return flash;
  }

  function update(t) {
    updateWebs(t);
    updateBeams(t);
    updateClubs(t);
    return updateBolts(t);
  }

  const api = {sfx, shootWeb, fireBeam, throwClub, lightning, update, toCover, hold: false};
  return api;
}

function makeSplatTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.translate(s / 2, s / 2);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const spokes = 9;
  const angles = [];
  for (let i = 0; i < spokes; i++) angles.push(i / spokes * Math.PI * 2 + (Math.random() - 0.5) * 0.35);
  const lens = angles.map(() => s * (0.36 + Math.random() * 0.12));
  const draw = (w, color) => {
    g.strokeStyle = color; g.lineWidth = w;
    angles.forEach((a, i) => { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * lens[i], Math.sin(a) * lens[i]); g.stroke(); });
    for (let r = s * 0.08; r < s * 0.38; r += s * 0.075) {
      g.beginPath();
      angles.forEach((a, i) => {
        const b = angles[(i + 1) % spokes] + (i === spokes - 1 ? Math.PI * 2 : 0);
        const x0 = Math.cos(a) * r, y0 = Math.sin(a) * r;
        const x1 = Math.cos(b) * r, y1 = Math.sin(b) * r;
        const m = (a + b) / 2;
        if (i === 0) g.moveTo(x0, y0);
        g.quadraticCurveTo(Math.cos(m) * r * 0.78, Math.sin(m) * r * 0.78, x1, y1);
      });
      g.stroke();
    }
  };
  draw(11, '#000');
  draw(5, '#fff');
  // keep only the white strokes as alpha; the ink outline comes from the id edges
  const img = g.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = img.data[i];
    img.data[i + 3] = img.data[i + 3] > 0 && v > 128 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function makeStarTexture() {
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.translate(s / 2, s / 2);
  g.beginPath();
  const n = 12;
  for (let i = 0; i <= n * 2; i++) {
    const a = i / (n * 2) * Math.PI * 2, r = (i % 2 ? 0.2 : 0.46 + Math.random() * 0.04) * s;
    i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fillStyle = '#fff'; g.fill();
  return new THREE.CanvasTexture(c);
}
