// ---------- SHOT 1: the sleeping forest (wide establishing) ----------
(function () {
  const M = 110;
  const PW = W + M * 2, PH = H + M * 2;
  const sh = { name: 'forest', dur: 8, fadeIn: 2.2 };
  sh.base = new Cam([6, 3.2, 46], [-0.5, 6.8, 0], 38);
  sh.cam = (lt) => {
    const k = easeInOut(clamp(lt / sh.dur));
    return new Cam([lerp(6, 4.8, k), lerp(3.2, 3.0, k), lerp(46, 40, k)], [lerp(-0.5, -0.8, k), lerp(6.8, 6.7, k), 0], 38);
  };
  sh.build = () => {
    const B = sh.base;
    const rb = B.project([0, 0, 0]);
    const RX = rb[0] + M, RY = rb[1] + M; // robot base in plate coords
    sh.rb = rb;
    const L = [0.72, -0.69];
    const P = {};
    // haze: bright misty forest depth with the sun behind
    P.haze = new Plate(PW, PH, 3000, -M, -M);
    paintHaze(P.haze.g, PW, PH, { stops: [[0, hx('aab6c4')], [0.25, hx('dccfc4')], [0.45, hx('f6e3c4')], [0.62, hx('fbeccc')], [0.8, hx('e9dccb')], [1, hx('d7d0c2')]], sun: [RX + 380, RY - 420, 700] }, new RNG(11));
    // distant tree ranks dissolving into the glow
    P.row1 = new Plate(PW, PH, 300, -M, -M);
    paintTrunkRow(P.row1.g, PW, { base: RY - 40, top: -60, gapMin: 90, gapMax: 220, wMin: 7, wMax: 15, fog: hx('f3e6d2'), fogAmt: 0.86, light: L, moss: 0, bark: 0.3, crownY: [M - 40, M + 300], crownR: [80, 170], leaf: 9, lightAmt: 0.5, crownsMax: 2, lean: 0.04 }, new RNG(21));
    P.row2 = new Plate(PW, PH, 170, -M, -M);
    paintTrunkRow(P.row2.g, PW, { base: RY - 22, top: -60, gapMin: 150, gapMax: 330, wMin: 13, wMax: 26, fog: hx('ecdecc'), fogAmt: 0.7, light: L, moss: 0.1, bark: 0.4, limbs: 0.5, limbLeaves: true, crownY: [M - 60, M + 330], crownR: [100, 200], leaf: 11, lightAmt: 0.6, lean: 0.05 }, new RNG(22));
    P.mistBack = new Plate(PW, PH, 140, -M, -M);
    paintMist(P.mistBack.g, PW, { y: RY - 70, thick: 160, col: hx('f6e8d4'), alpha: 0.3, count: 120, size: 80 }, new RNG(31));
    // clearing edge: old trees with mossy trunks + understory
    P.row3 = new Plate(PW, PH, 90, -M, -M);
    {
      const g = P.row3.g, rng = new RNG(23);
      const fog = hx('e3d5c4');
      paintTrunkRow(g, PW, { base: RY - 6, top: -60, gapMin: 260, gapMax: 460, wMin: 28, wMax: 46, fog, fogAmt: 0.42, light: L, moss: 0.4, bark: 0.8, limbs: 0.7, limbLeaves: true, skip: [RX - 300, RX + 280], crownY: [M - 80, M + 260], crownR: [150, 250], leaf: 13, lightAmt: 0.75, holes: 3, sky: hx('f7e8cc'), bigChance: 0.4 }, rng);
      const lp = fogged(PAL.leaf, 0.38, fog);
      for (let i = 0; i < 22; i++) {
        const x = rng.range(-60, PW + 60);
        if (x > RX - 240 && x < RX + 280 && rng.next() < 0.75) continue;
        paintCrown(g, { cx: x, cy: RY - 28 + rng.range(-25, 12), rx: rng.range(60, 150), ry: rng.range(32, 70), seed: rng.int(1, 1e6), pal: lp, light: L, leaf: 9, lightAmt: 0.85 });
      }
      // a young tree or two in the clearing
      paintTree(g, { x: RX - 520, base: RY + 6, h: 300, w0: 10, w1: 5, seed: 2301, lpal: fogged(PAL.leaf, 0.3, fog), tpal: fogged(PAL.trunk, 0.35, fog), crowns: [{ dx: 0, dy: 20, rx: 110, ry: 80, leaf: 10 }, { dx: -40, dy: 90, rx: 70, ry: 50, leaf: 9 }], light: L, flare: 0.2, moss: 0 });
    }
    // the clearing floor
    P.ground = new Plate(PW, PH, 46, -M, -M);
    {
      const g = P.ground.g, rng = new RNG(41);
      const y0 = RY - 60;
      paintForestFloor(g, PW, y0, PH, { pal: { far: hx('b8b096'), mid: hx('7d8158'), near: hx('3f4c34'), dark: hx('2b352c'), moss: hx('6f8442'), earth: hx('5e4d39'), grass: hx('8a9550') }, fog: hx('ecdcc6'), fogAmt: 0.6, density: 1.2, sNear: 130, mounds: 0, fadeH: 70 }, rng);
      // long shadows of trees across the clearing, light between
      // long shadows of the clearing-edge trees, falling toward camera-left (sun is behind-right)
      for (let k = 0; k < 7; k++) {
        const fx = RX + rng.range(-700, 900), fy = y0 + rng.range(8, 40);
        const len = rng.range(500, 900), ang = Math.PI * rng.range(0.78, 0.86);
        paintShadowStreak(g, fx, fy, fx + Math.cos(ang) * len, fy + Math.sin(ang) * len * 0.42, rng.range(5, 9), rng.range(20, 38), hx('3a4a42'), 0.42, rng);
      }
      paintLightPatch(g, RX + 140, RY + 6, 230, 16, hx('ead08e'), rng, 0.8);
      paintLightPatch(g, RX - 150, RY + 150, 180, 22, hx('d6bf7c'), rng, 0.55);
      paintGrassBand(g, PW, y0 + 10, PH, { hFar: 6, hNear: 30, cols: [hx('5c6c3c'), hx('7b8848'), hx('3f5032'), hx('97a058')], fog: hx('ded0b8'), fogAmt: 0.55, n: 1100, blades: 6, wNear: 2.8 }, rng);
      for (let i = 0; i < 90; i++) paintFlowers(g, rng.range(0, PW), rng.range(y0 + 30, PH), rng.range(10, 34), 6, PAL.flowers, rng, rng.range(2, 4.5));
      // mossy rocks
      for (let i = 0; i < 4; i++) {
        const x = rng.range(0, PW), t = rng.range(0.4, 1), y = lerp(y0 + 20, PH, t), s = lerp(14, 60, t);
        leafMass(g, x, y, s, s * 0.45, mixc(hx('5d6550'), PAL.fog, (1 - t) * 0.4), rng, s * 0.25, { stamp: 0.7 });
        leafMass(g, x - s * 0.15, y - s * 0.18, s * 0.7, s * 0.25, mixc(hx('7f9147'), PAL.fog, (1 - t) * 0.4), rng, s * 0.2, { stamp: 0.6 });
      }
      resetG(g);
    }
    // near flanking giants
    P.near = new Plate(PW, PH, 26, -M, -M);
    {
      const g = P.near.g, rng = new RNG(61);
      const lp = { deep: hx('15241e'), dark: hx('203629'), mid: hx('3b5636'), light: hx('7c8c45'), hi: hx('e9c36e'), sky: hx('f6e6c8') };
      const tp = { dark: hx('1c1f1d'), mid: hx('343731'), light: hx('5f5d4a'), rim: hx('f2c072'), moss: hx('4d6230') };
      // overhead canopy
      for (let i = 0; i < 12; i++) {
        const x = lerp(-120, PW + 120, i / 11) + rng.range(-50, 50);
        const gap = x > RX + 120 && x < RX + 620;
        paintCrown(g, { cx: x, cy: M + (gap ? rng.range(-150, -90) : rng.range(-60, 30)), rx: rng.range(200, 300), ry: rng.range(90, 150), seed: rng.int(1, 1e6), pal: lp, light: L, leaf: 15, holes: 7, lightAmt: 0.55 });
      }
      paintTree(g, { x: M + 90, base: PH + 60, h: PH + 220, w0: 150, w1: 95, seed: 62, lpal: lp, tpal: tp, crowns: [], light: L, flare: 0.45, rimW: 1.6, moss: 0.5, bark: 1.2, branches: [{ at: 0.62, dx: 330, dy: -150, w: 30 }] });
      paintTree(g, { x: PW - M - 70, base: PH + 40, h: PH + 220, w0: 118, w1: 80, seed: 63, lpal: lp, tpal: tp, crowns: [], light: L, rimW: 1.3, moss: 0.4, bark: 1.1, branches: [{ at: 0.66, dx: -300, dy: -110, w: 26 }] });
      // leaf masses hanging off the near limbs
      paintCrown(g, { cx: 560, cy: M + 120, rx: 230, ry: 90, seed: 64, pal: lp, light: L, leaf: 14, lightAmt: 0.6 });
      paintCrown(g, { cx: PW - 460, cy: M + 150, rx: 200, ry: 80, seed: 65, pal: lp, light: L, leaf: 14, lightAmt: 0.7 });
      const fc = { dark: hx('1f3123'), mid: hx('34502f'), light: hx('6d8540') };
      for (let i = 0; i < 30; i++) {
        const left = i % 2 === 0;
        const x = left ? rng.range(-20, 560) : rng.range(PW - 600, PW + 20);
        paintFern(g, x, PH - rng.range(0, 160), { len: rng.range(140, 240), ang: -Math.PI / 2 + (left ? 1 : -1) * rng.range(0.3, 1.0), curl: rng.range(0.4, 1.0), dir: left ? 1 : -1, cols: fc, leaf: rng.range(18, 28), litSide: left ? 1 : -1 }, rng);
      }
    }
    P.fg = new Plate(PW, PH, 10, -M, -M);
    {
      const g = P.fg.g, rng = new RNG(71);
      paintGrassBand(g, PW, PH - 60, PH + 30, { hFar: 60, hNear: 120, cols: [hx('17251a'), hx('1f3020'), hx('2b4127'), hx('41592d')], n: 140, blades: 9, wNear: 5.5, lean: 0.2 }, rng);
    }
    P.mistLow = new Plate(PW, PH, 38, -M, -M);
    paintMist(P.mistLow.g, PW, { y: RY - 20, thick: 80, col: hx('f7ead6'), alpha: 0.22, count: 80, size: 55 }, new RNG(81));
    P.shafts = paintShafts(PW, PH, { depth: 60, ox: -M, oy: -M, col: hx('ffe6ad'), shafts: [
      { x: RX + 330, y: -60, w: 110, ang: 0.5, len: 1300, a: 0.55 }, { x: RX + 470, y: -60, w: 60, ang: 0.47, len: 1200, a: 0.45 }, { x: RX + 200, y: -60, w: 170, ang: 0.52, len: 1300, a: 0.32 }, { x: RX + 640, y: -60, w: 70, ang: 0.45, len: 1100, a: 0.3 }] });
    sh.P = P;
    for (const k in P) applyGrain(P[k].g, P[k].w, P[k].h, k === 'shafts' ? 0 : 0.12);
  };
  sh.pose = null;
  sh.gplants = null;
  sh.draw = (g, lt) => {
    if (!sh.pose) { sh.pose = P_KNEEL({ yaw: 0.55 }); sh.gplants = baseGrowth(77); }
    const cam = sh.cam(lt), B = sh.base, P = sh.P;
    const drift = lt * 6;
    drawPlate(g, P.haze, B, cam);
    drawPlate(g, P.row1, B, cam);
    drawPlate(g, P.row2, B, cam);
    drawPlate(g, P.mistBack, B, cam, { dx: drift * 0.5, alpha: 0.9 });
    drawPlate(g, P.row3, B, cam);
    drawPlate(g, P.ground, B, cam);
    robotLayer(g, cam, sh.pose, LIGHT_FOREST, { seed: 1, lineW: 1.25, t: lt, gplants: sh.gplants, moss: 1.35 });
    drawPlate(g, P.mistLow, B, cam, { dx: -drift, alpha: 0.85 });
    drawPlate(g, P.shafts, B, cam, { comp: 'screen', alpha: 0.6 });
    drawPlate(g, P.near, B, cam);
    drawPlate(g, P.fg, B, cam);
  };
  SHOTS.push(sh);
})();
