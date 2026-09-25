// Draws the cover masthead into two canvases the size of the render target:
//   color: the finished logo (gradient letters, pattern fill, block extrusion, kicker, credits)
//   ink:   the same letterforms as line art (Inks / Pencils stages)
// The composite shader layers it between the backdrop and the hero, so the hero can break the logo.
//
// cfg: {title, kicker, credits, font, pattern: 'web'|'halftone'|'stripes'|'none',
//       face: [top, mid, bottom], extrude, kickerColor, left, right, baseline, arch}

function layout(ctx, W, H, cfg) {
  const T = cfg.title;
  const left = W * (cfg.left ?? 0.235), right = W * (cfg.right ?? 0.975);
  const baseY = H * (cfg.baseline ?? 0.192);
  const n = T.length;
  const arch = cfg.arch ?? (n > 12 ? 0.12 : 0.3);
  const sizes = [...T].map((_, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    return 0.82 + arch * (1 - Math.pow(Math.abs(t - 0.5) * 2, 1.6)); // bulge in the middle
  });
  const base = 100;
  const widths = [...T].map((ch, i) => {
    ctx.font = `${base * sizes[i]}px ${cfg.font}`;
    return ctx.measureText(ch).width * (ch === '-' ? 0.9 : 1);
  });
  const gap = -0.02 * base;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (n - 1);
  // fit the span, but never taller than ~15% of the cover
  const k = Math.min((right - left) / total, (H * 0.15) / (base * Math.max(...sizes) * 0.72));
  let x = right - total * k; // right-align: the corner box sits on the left
  return [...T].map((ch, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const L = {ch, x, y: baseY - Math.sin(t * Math.PI) * H * 0.012 * (arch / 0.3), size: base * sizes[i] * k, rot: (t - 0.5) * 0.12 * (arch / 0.3)};
    x += widths[i] * k + gap * k;
    return L;
  });
}

function each(ctx, letters, font, fn) {
  for (const L of letters) {
    if (L.ch === ' ') continue;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate(L.rot);
    ctx.font = `${L.size}px ${font}`;
    ctx.textBaseline = 'alphabetic';
    fn(ctx, L);
    ctx.restore();
  }
}

function pattern(ctx, kind, W, H, S, color, cx) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, S * 0.018);
  if (kind === 'web') {
    const cy = H * 0.02, R = W * 0.9, spokes = 22;
    for (let i = 0; i < spokes; i++) {
      const a = i / spokes * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    }
    for (let r = R * 0.05; r < R; r *= 1.32) {
      ctx.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const a0 = i / spokes * Math.PI * 2, a1 = (i + 1) / spokes * Math.PI * 2, am = (a0 + a1) / 2;
        if (i === 0) ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
        ctx.quadraticCurveTo(cx + Math.cos(am) * r * 0.9, cy + Math.sin(am) * r * 0.9, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      }
      ctx.stroke();
    }
  } else if (kind === 'halftone') {
    const step = Math.max(4, S * 0.07);
    for (let y = 0; y < H * 0.25; y += step) for (let x = 0; x < W; x += step) {
      const r = step * 0.42 * Math.min(1, Math.max(0, (y - H * 0.06) / (H * 0.14)));
      if (r > 0.3) { ctx.beginPath(); ctx.arc(x + ((y / step) % 2) * step / 2, y, r, 0, 7); ctx.fill(); }
    }
  } else if (kind === 'stripes') {
    const step = Math.max(5, S * 0.12);
    ctx.lineWidth = step * 0.35;
    for (let x = -H; x < W + H; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * 0.3, H * 0.3); ctx.stroke(); }
  }
  ctx.restore();
}

export function drawMasthead(W, H, cfg) {
  const font = cfg.font || 'Bangers';
  const color = document.createElement('canvas');
  const ink = document.createElement('canvas');
  color.width = ink.width = W;
  color.height = ink.height = H;
  const c = color.getContext('2d'), k = ink.getContext('2d');
  const letters = layout(c, W, H, {...cfg, font});
  const S = Math.max(...letters.map((l) => l.size));
  const outline = S * 0.075;
  const depth = Math.max(4, Math.round(S * 0.09));
  const face = cfg.face || ['#ff4a3d', '#e0202a', '#9e0f1d'];
  const extrude = cfg.extrude || '#1c2a6b';
  const mid = letters[Math.floor(letters.length / 2)];

  // ---------- colour
  for (let d = depth; d >= 1; d--) {
    each(c, letters, font, (g, L) => {
      g.fillStyle = d === depth ? '#0a0a18' : extrude;
      g.lineJoin = 'round'; g.strokeStyle = '#0a0a18'; g.lineWidth = outline;
      g.strokeText(L.ch, d * 0.7, d); g.fillText(L.ch, d * 0.7, d);
    });
  }
  each(c, letters, font, (g, L) => { g.lineJoin = 'round'; g.strokeStyle = '#0a0a12'; g.lineWidth = outline * 2; g.strokeText(L.ch, 0, 0); });
  const faceC = document.createElement('canvas');
  faceC.width = W; faceC.height = H;
  const f = faceC.getContext('2d');
  const grad = f.createLinearGradient(0, H * 0.07, 0, H * 0.2);
  grad.addColorStop(0, face[0]); grad.addColorStop(0.55, face[1]); grad.addColorStop(1, face[2]);
  each(f, letters, font, (g, L) => { g.fillStyle = grad; g.fillText(L.ch, 0, 0); });
  f.globalCompositeOperation = 'source-atop';
  pattern(f, cfg.pattern ?? 'none', W, H, S, cfg.patternColor || 'rgba(25,0,8,0.85)', mid.x);
  f.fillStyle = 'rgba(255,255,255,0.18)';
  f.fillRect(0, H * 0.06, W, H * 0.035);
  c.drawImage(faceC, 0, 0);
  each(c, letters, font, (g, L) => {
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,235,220,0.55)'; g.lineWidth = Math.max(1, S * 0.012);
    g.strokeText(L.ch, -S * 0.012, -S * 0.012);
  });

  const kx = W * 0.965;
  const kSize = H * 0.022, cSize = H * 0.0125;
  const small = (g, text, size, weight, y, fill, stroke) => {
    if (!text) return;
    g.font = `${weight} ${size}px Oswald, Impact, sans-serif`;
    g.textAlign = 'right'; g.lineJoin = 'round';
    g.letterSpacing = `${size * 0.12}px`;
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = size * 0.3; g.strokeText(text, kx, y); }
    g.fillStyle = fill; g.fillText(text, kx, y);
  };
  small(c, cfg.kicker, kSize, 700, H * 0.058, cfg.kickerColor || '#ffd23f', '#0a0a12');
  small(c, cfg.credits, cSize, 500, H * 0.222, '#f4efe3', '#0a0a12');

  // ---------- ink
  for (let d = depth; d >= 1; d--) each(k, letters, font, (g, L) => { g.fillStyle = '#0f0d12'; g.fillText(L.ch, d * 0.7, d); });
  each(k, letters, font, (g, L) => {
    g.lineJoin = 'round'; g.strokeStyle = '#0f0d12'; g.lineWidth = outline * 2; g.strokeText(L.ch, 0, 0);
    g.fillStyle = '#f7f3ea'; g.fillText(L.ch, 0, 0);
  });
  const faceI = document.createElement('canvas');
  faceI.width = W; faceI.height = H;
  const fi = faceI.getContext('2d');
  each(fi, letters, font, (g, L) => { g.fillStyle = '#fff'; g.fillText(L.ch, 0, 0); });
  fi.globalCompositeOperation = 'source-atop';
  pattern(fi, cfg.pattern ?? 'none', W, H, S, '#0f0d12', mid.x);
  k.drawImage(faceI, 0, 0);
  small(k, cfg.kicker, kSize, 700, H * 0.058, '#0f0d12');
  small(k, cfg.credits, cSize, 500, H * 0.222, '#0f0d12');
  return {color, ink};
}
