// The storyboard: one GSAP timeline, 100 units long, scrubbed by scroll. Per film — edit freely.
// Units line up with the chapter --len values in index.html (they must sum to 100).
// Camera frames are in model units (M.l length, M.w width, M.h height) so any model fits; overhead
// shots aim at the top plane (ty = M.h) so tall models don't balloon toward the camera.
//
//   set(t, {...})            hard cut at t
//   to(t, dur, {...}, ease)  ramp S values from t to t+dur
//   flash(t, dur, on, off)   set `on` at t, `off` at t+dur
//   show / hide(sel, t, dur) fade an overlay element
// State keys (S) and effect recipes: references/film.md

export default function film({ tl, S, M, focus: F, focusSize: fs, set, to, show, hide, flash, ALL0, WHITE }) {
  const cam = 'power2.inOut';
  const gain = S.gain;

  // initial state (t = 0): whole model, pixelated on the black grid, logo up
  Object.assign(S, { az: 0, el: 4, fw: 2.3 * M.w, fh: 1.75 * M.h, tx: 0, ty: 0.63 * M.h, tz: 0, mosaic: 26, dark: 1, grid: 1 });

  // 00 ACQUIRE: blocks grow, then cut
  to(3, 2, { mosaic: 64 }, 'power2.in');
  hide('.logo', 3.5, 1);

  // 01 LEAD: white x-ray, build starts from the front
  set(5, { ...WHITE, ...ALL0, blur: 16 });
  to(5, 4, { lead: 1, blur: 0 }, 'power2.out');
  to(5, 9, { fw: 2.0 * M.w, fh: 1.5 * M.h, ty: 0.71 * M.h }, cam);
  to(8.5, 4, { base: 1 }, 'power3.out');
  to(10, 4, { frame: 0.45 }, 'power2.out');
  flash(11.6, 0.7, { dark: 1, grid: 1, mosaic: 10 }, { dark: 0, grid: 0, mosaic: 0 });

  // 02 FRAME: tracker locks onto the front nodes
  show('.trace-head', 14, 0.6);
  to(14, 6, { frame: 1 }, 'power2.out');
  set(15, { trackSet: 0 });
  to(15, 6, { track: 1 });
  to(14, 12, { fw: 2.2 * M.w, fh: 1.65 * M.h, el: 2 }, cam);
  to(23.5, 2, { track: 0 });

  // 03 CALIBRATE: mosaic hit, checker markers, core fills in
  flash(26, 0.6, { mosaic: 18 }, { mosaic: 0 });
  tl.fromTo('.mk', { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.18, ease: 'back.out(3)' }, 26.2);
  show('.freq', 27.2, 0.2);
  to(26.5, 6, { core: 1 }, 'power2.out');
  flash(29.8, 0.5, { mosaic: 34 }, { mosaic: 0 });
  hide('.mk', 32.5, 0.6);
  hide('.freq', 32.5, 0.3);

  // 04 SHELL: outer body drops on, camera rises, floor reflection comes up
  to(34, 6, { shell: 1 }, 'power2.out');
  to(36, 5, { skin: 1 }, 'power2.out');
  to(34, 12, { el: 11, fw: 2.6 * M.w, fh: 2.6 * M.h, ty: 0.21 * M.h }, cam);
  to(35, 6, { mirror: 0.55 });
  set(40.5, { dark: 1, grid: 1, mosaic: 22 });
  show('.logo', 40.5, 0.05);
  set(42.3, { dark: 0, grid: 0, mosaic: 0 });
  hide('.logo', 42.3, 0.05);
  hide('.trace-head', 44, 0.6);

  // 05 SIGNAL: push into the front, red glow, scanlines, NO SIGNAL
  to(46, 2.2, { fw: 0.84 * M.w, fh: 1.2 * M.h, ty: 0.46 * M.h, el: 5, mirror: 0 }, 'power3.in');
  flash(46.6, 0.5, { dark: 1, grid: 1, mosaic: 8 }, { dark: 0, grid: 0, mosaic: 0 });
  set(48.2, { dark: 1, red: 1 });
  set(49.6, { scan: 1 });
  set(51, { stat: 1, scan: 0 });
  show('.nosignal', 51, 0.05);
  // hard cut to the overhead camera, hidden under the static
  set(52.4, { ...ALL0, az: 0, el: 89.5, fw: 1.24 * M.w, fh: 1.26 * M.l, tx: 0, ty: M.h, tz: 0.022 * M.l, trackSet: 1 });
  set(53, { ...WHITE, mosaic: 30 });
  hide('.nosignal', 53, 0.05);

  // 06 OVERHEAD: rebuild from the ground contacts up
  to(53, 3, { base: 1 }, 'power2.out');
  to(53.2, 3.2, { mosaic: 0 }, 'power2.in');
  to(55.5, 4, { frame: 1, lead: 1 }, 'power2.out');
  to(58, 5, { core: 1 }, 'power2.out');
  to(60, 5, { track: 1 });
  to(62, 5, { shell: 1 }, 'power2.out');
  to(64, 4, { skin: 1 }, 'power2.out');
  to(53, 15, { fh: 1.15 * M.l, fw: 1.15 * M.w }, cam);
  to(66.2, 1.5, { track: 0 });
  set(68, { dark: 1, red: 1 });
  set(69.8, { scan: 1 });
  set(70.6, { scan: 0, red: 0, dark: 0, smear: 1 });

  // 07 DETAIL: datamosh cut to the focus node, slow drift
  set(71.6, { tx: F.x, ty: F.y, tz: F.z - 0.05 * fs, fw: 1.33 * fs, fh: 1.33 * fs, el: 89.5, shift: 0.16, trackSet: 2 });
  to(72, 1.2, { smear: 0 }, 'power2.out');
  to(72, 15.5, { tx: F.x - 0.05 * fs, tz: F.z + 0.19 * fs, fw: 1.05 * fs, fh: 1.05 * fs }, 'sine.inOut');
  to(74, 5, { track: 1 });
  set(79.5, { dark: 1, grid: 1, mosaic: 16 });
  set(80.2, { dark: 0, grid: 0, mosaic: 0 });
  to(84.5, 1.5, { track: 0 });
  flash(86, 0.4, { smear: 0.6 }, { smear: 0 });
  set(87, { dark: 1, grid: 1, mosaic: 12 });

  // 08 END: pull back to the whole model on the grid, logo, dissolve
  to(87.5, 4, { tx: 0, ty: M.h, tz: 0.022 * M.l, fw: 1.42 * M.w, fh: 1.29 * M.l, shift: 0 }, cam);
  to(88, 4, { mosaic: 20 }, 'power1.inOut');
  show('.logo', 91, 0.05);
  to(93, 7, { mosaic: 46, gain: gain * 0.46 }, 'power1.in');
}
