// 1. lantern: insert. A moss-grey stone lantern in the blue hour; a dew drop gathers at a roof corner and falls.
(function () {
  const sh = { name: 'lantern', dur: 4.5, fadeIn: 1.6 };
  const L = HOLLOW.lantern, Ly = HOLLOW.lanternYaw;
  const cp = [L[0] - 0.55, 1.22, L[2] + 2.6], tg = [L[0] + 0.36, 1.36, L[2]];
  sh.base = new Cam(cp, tg, 19);
  sh.cam = (lt) => { const k = easeInOut(lt / sh.dur); return new Cam([cp[0] + 0.05 * k, cp[1], cp[2] - 0.14 * k], tg, 19); };
  let drop = null;
  sh.build = () => {
    sh.P = paintHollow(sh.base, { states: [0], seed: 11 });
    for (const k of ['sky', 'trunk', 'ground', 'roots']) blurPlate(sh.P[k][0], k === 'sky' ? 6 : 9);
    // the roof corner the drop hangs from: the front corner furthest right on screen
    const M = MUL(T(...L), RY(Ly));
    let best = null;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + i * Math.PI / 3, p = M4.xform(M, [0.49 * Math.cos(a), 1.458, 0.49 * Math.sin(a)]), q = sh.base.project(p);
      if (p[2] > L[2] + 0.05 && (!best || q[0] > best.q[0])) best = { p, q };
    }
    drop = best.p;
  };
  // drop timeline (seconds, held on twos): grows, necks, lets go, falls; a new bead starts
  const FALL = 2.75;
  function drawDrop(g, cam, t) {
    const q = cam.project(drop), pxm = cam.f / q[2];
    const bead = (r, neck, x, y, a = 1) => {
      g.save(); g.globalAlpha = a; g.translate(x, y);
      const R = r * pxm, N = neck * pxm;
      g.beginPath(); g.moveTo(-R * 0.35, -N); g.bezierCurveTo(-R * 0.4, -N * 0.4, -R, -R * 0.2, -R, R * 0.15);
      g.arc(0, R * 0.15, R, Math.PI, 0, true); g.bezierCurveTo(R, -R * 0.2, R * 0.4, -N * 0.4, R * 0.35, -N); g.closePath();
      const gr = g.createLinearGradient(0, -N, 0, R * 1.2);
      gr.addColorStop(0, css(hx('8a92ac'), 0.55)); gr.addColorStop(0.55, css(hx('c9d0e2'), 0.85)); gr.addColorStop(1, css(hx('39405a'), 0.95));
      g.fillStyle = gr; g.fill();
      g.strokeStyle = css(hx('1d2030'), 0.7); g.lineWidth = 1; g.stroke();
      g.fillStyle = css(hx('ffffff'), 0.95); g.beginPath(); g.ellipse(-R * 0.35, R * 0.0, R * 0.22, R * 0.3, -0.4, 0, TAU); g.fill();
      g.restore();
    };
    if (t < FALL) {
      const k = smooth(0.2, FALL - 0.25, t), r = lerp(0.006, 0.02, k), neck = lerp(0.004, 0.026, smooth(FALL - 0.6, FALL, t));
      bead(r, neck, q[0], q[1] + (r + neck * 0.4) * pxm * 0.6, 1);
    } else {
      const ft = t - FALL, dy = 0.5 * 9.8 * ft * ft, v = 9.8 * ft;
      const p = cam.project([drop[0], drop[1] - 0.02 - dy, drop[2]]);
      if (p[1] < H + 40) drawDrip(g, p[0], p[1], 0.018 * pxm, v * pxm, hx('c3cadc'), 0.9);
      // the corner keeps a wet glint, then a new bead begins
      const r2 = lerp(0.003, 0.009, smooth(FALL + 0.4, sh.dur, t));
      bead(r2, 0.002, q[0], q[1] + r2 * pxm * 0.6, 0.9);
    }
  }
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt);
    drawHollow(g, P, B, cam, 0);
    // slow mist in the out-of-focus distance (atmosphere moves on ones)
    const rng = new RNG(5);
    for (let i = 0; i < 14; i++) {
      const x = (rng.range(-200, W + 200) + lt * rng.range(6, 14)) % (W + 400) - 200, y = rng.range(H * 0.42, H * 0.78);
      dab(g, 'soft', rng.int(0, 1), x, y, rng.range(380, 620), rng.range(70, 120), 0, hx('8f97ae'), rng.range(0.06, 0.12));
    }
    resetG(g);
    celLayer(g, cam, lanternItems(L, Ly, 0, 0), GL_PRE, { seed: 7, sat: 0.3, lineW: 1.7 });
    drawDrop(g, cam, tt);
  };
  SHOTS.push(sh);
})();
