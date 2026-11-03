// 11. lit: medium, static, fade out. Morning in the hollow: the stone lantern now holds a small flame, the shade where
// the pool was is full of blue flowers, the bellflower stands open. A last few petals come down; the flame leans over
// into the same curl as the ghost's wick, and holds it.
(function () {
  const sh = { name: 'lit', dur: 6.5, fadeOut: 3 };
  const L = HOLLOW.lantern, Ly = HOLLOW.lanternYaw;
  sh.base = new Cam([-1.45, 1.05, 3.25], [-0.8, 0.78, -1.0], 40);
  sh.cam = () => sh.base; // locked off: nothing in this shot moves but the flame, the petals and the motes
  const LEAN = 2.6; // when the flame takes the ghost's curl
  // the lantern's tall window (local angle 2pi/3 on the hex, centre 1.19 m up, 0.12 x 0.17 m) turned to face the camera
  const WA = Math.PI / 2 + Math.PI / 6, AP = 0.175 * Math.cos(Math.PI / 6) - 0.004;
  const winM = (yaw) => MUL(T(...L), RY(yaw), T(Math.cos(WA) * AP, 1.19, Math.sin(WA) * AP), RY(-WA + Math.PI / 2));
  const winQuad = (cam, yaw) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => cam.project(M4.xform(winM(yaw), [a * 0.06, b * 0.085, 0.006])));
  const area = (q) => Math.abs(q.reduce((s, p, i) => { const r = q[(i + 1) % 4]; return s + p[0] * r[1] - r[0] * p[1]; }, 0)) / 2;
  sh.build = () => {
    const axis = sh.base.project([L[0], 1.19, L[2]])[2];
    let best = -1; for (let y = -Math.PI; y < Math.PI; y += 0.01) { const q = winQuad(sh.base, y), c = sh.base.project(M4.xform(winM(y), [0, 0, 0]));
      if (c[2] < axis && area(q) > best) { best = area(q); sh.yaw = y; } }
    sh.P = paintHollow(sh.base, { states: [1], seed: 11, flowers: 90 });
    const rng = new RNG(1111); sh.petals = [];
    for (let i = 0; i < 9; i++) sh.petals.push({ x: rng.range(-2.8, 1.6), z: rng.range(-1.6, 0.6), y0: rng.range(2.2, 3.6), t0: rng.range(-2, 3.5), v: rng.range(0.28, 0.42), col: rng.int(0, 4), ph: rng.range(0, TAU), spin: rng.range(3, 6), wob: rng.range(0, TAU) });
  };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt);
    drawHollow(g, P, B, cam, 1);
    // soft shafts of morning light through the canopy, from the upper right
    g.save(); g.globalCompositeOperation = 'screen';
    for (const [x0, w, a] of [[1350, 120, 0.1], [1560, 80, 0.08], [1130, 60, 0.06]]) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, css([1, 0.92, 0.72], a * (0.85 + 0.15 * Math.sin(lt * 0.8 + x0)))); gr.addColorStop(1, css([1, 0.92, 0.72], 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, -20); g.lineTo(x0 + w, -20); g.lineTo(x0 + w - 520, H); g.lineTo(x0 - 520 - w * 0.6, H); g.closePath(); g.fill();
    }
    g.restore();
    contactShadow(g, cam, L, 0.42, 0, 0.45);
    celLayer(g, cam, lanternItems(L, sh.yaw, 1, 0.5), GL_DAWN, { seed: 7, lineW: 1.7 }); // a prop: one drawing, no boil
    // the flame sits in the fire box and is only seen through the window; upright and flickering, then it leans over
    // into the ghost's wick-curl and stays there
    const wq = winQuad(cam, sh.yaw), wc = cam.project(M4.xform(winM(sh.yaw), [0, -0.055, -0.08])), s = 0.095 * cam.f / wc[2] / 30;
    const curl = lerp(0.04 * Math.sin(tt * 9), 0.32, easeInOut(smooth(LEAN, LEAN + 0.9, tt))) + 0.03 * Math.sin(tt * 5.3);
    glowFx(g, wc[0], wc[1] - 12 * s, 300 * s, [1, 0.74, 0.4], 0.3, 'screen'); // light spilling out of the opening
    g.save(); g.beginPath(); wq.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.clip();
    glowFx(g, wc[0], wc[1] - 12 * s, 90 * s, [1, 0.8, 0.5], 0.5, 'screen');
    drawWickFlame(g, wc[0], wc[1], s, curl, Math.floor(lt * 12), 1);
    g.restore();
    drawFlowerAt(g, cam, 1, 1, 41);
    // a last few petals drift down through the light
    for (const p of sh.petals) {
      const u = tt - p.t0, y = p.y0 - p.v * u; if (u < 0 || y < 0.02) continue;
      const q = cam.project([p.x + 0.15 * Math.sin(u * 1.3 + p.wob), y, p.z]); if (q[2] < 0.3) continue;
      drawPetal(g, q[0], q[1], clamp(0.05 * cam.f / q[2], 4, 60), p.ph + u * p.spin, p.col, p.wob + u * 0.6, smooth(0, 0.4, u));
    }
    const rng = new RNG(31); // dust motes turning in the shafts
    for (let i = 0; i < 40; i++) { const x = rng.range(700, 1700) - 0.4 * rng.range(0, 500) + 12 * Math.sin(lt * rng.range(0.3, 0.7) + i), y = rng.range(60, 820) + 8 * Math.sin(lt * rng.range(0.2, 0.5) + i * 2);
      drawMote(g, x, y, rng.range(1.2, 2.6), 0.25 + 0.25 * Math.sin(lt * 1.3 + i)); }
    drawPlate(g, P.fg[1], B, cam);
  };
  SHOTS.push(sh);
})();
