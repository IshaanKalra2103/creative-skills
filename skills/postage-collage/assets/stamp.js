// postage-collage runtime: barcodes, QR blocks, pixel-fragment grids, entrance, zoom view (?z=N deep link)
// icon kit: globe, globe2, cross, spark, warn, postmark — use as <svg class="i"><use href="#globe"/></svg>
// postmark text comes from window.POSTMARK = { ring: '…', center: ['LINE', 'LINE', 'LINE'] }
{
  const pm = Object.assign({ ring: 'THE LONG POST ✦ 25 SEP 2026 ✦ SERIES 01 ✦', center: ['LATER', 'STILL', 'ARRIVES'] }, window.POSTMARK || {});
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <symbol id="globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4.4" ry="10"/><path d="M12 2v20M2 12h20M3.34 7h17.32M3.34 17h17.32"/></symbol>
    <symbol id="globe2" viewBox="0 0 36 24"><ellipse cx="18" cy="12" rx="16" ry="10"/><ellipse cx="18" cy="12" rx="7" ry="10"/><path d="M18 2v20M2 12h32M4.5 7h27M4.5 17h27"/></symbol>
    <symbol id="cross" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 0v24M0 12h24"/></symbol>
    <symbol id="spark" viewBox="0 0 24 24"><path d="M12 0C12.9 8.2 15.8 11.1 24 12 15.8 12.9 12.9 15.8 12 24 11.1 15.8 8.2 12.9 0 12 8.2 11.1 11.1 8.2 12 0Z"/></symbol>
    <symbol id="warn" viewBox="0 0 24 24"><path d="M12 2 23 21H1Z"/><path d="M12 9v6M12 17.5v1.5"/></symbol>
    <symbol id="postmark" viewBox="-60 -60 250 120">
      <g fill="none" stroke="currentColor">
        <circle r="46" stroke-width="2.2"/><circle r="31" stroke-width="1.2"/>
        <path d="M58 -24c10-6 20 6 30 0s20-6 30 0 20 6 30 0 20-6 30 0" stroke-width="2.2"/>
        <path d="M58 -8c10-6 20 6 30 0s20-6 30 0 20 6 30 0 20-6 30 0" stroke-width="2.2"/>
        <path d="M58 8c10-6 20 6 30 0s20-6 30 0 20 6 30 0 20-6 30 0" stroke-width="2.2"/>
        <path d="M58 24c10-6 20 6 30 0s20-6 30 0 20 6 30 0 20-6 30 0" stroke-width="2.2"/>
        <path id="pmArc" d="M-38.5 0a38.5 38.5 0 1 1 77 0a38.5 38.5 0 1 1-77 0"/>
      </g>
      <text font-family="IBM Plex Mono" font-size="8.6" letter-spacing="2.6" fill="currentColor"><textPath href="#pmArc">${pm.ring}</textPath></text>
      <text font-family="IBM Plex Mono" font-size="8" font-weight="600" letter-spacing="1.4" fill="currentColor" text-anchor="middle">${pm.center.map((t, k) => `<tspan x="0" y="${-8 + k * 11}">${t}</tspan>`).join('')}</text>
    </symbol>
  </defs></svg>`);
}

// seeded rng so barcodes/QRs are stable between loads
const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

// barcodes
document.querySelectorAll('.bc').forEach(el => {
  const r = rng(+el.dataset.seed || 1); let x = 0, bars = '';
  while (x < 100) { const w = 0.6 + r() * 2.4; if (r() > .38) bars += `<rect x="${x}" width="${w}" height="10"/>`; x += w + 0.5 + r() * 1.4; }
  el.innerHTML = el.hasAttribute('data-vertical')
    ? `<svg viewBox="0 0 10 100" preserveAspectRatio="none" fill="currentColor">${bars.replace(/<rect x="([\d.]+)" width="([\d.]+)" height="10"\/>/g, '<rect y="$1" height="$2" width="10"/>')}</svg>`
    : `<svg viewBox="0 0 100 10" preserveAspectRatio="none" fill="currentColor">${bars}</svg>`;
});

// QR-ish blocks: finder squares + seeded noise
document.querySelectorAll('.qr').forEach(el => {
  const r = rng(+el.dataset.seed || 1), n = 21; let c = '';
  const finder = (x, y) => (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (finder(x, y)) { const fx = x > n - 8 ? x - (n - 7) : x, fy = y > n - 8 ? y - (n - 7) : y;
      const ring = Math.max(Math.abs(fx - 3), Math.abs(fy - 3)); if (ring !== 2) c += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }
    else if (r() > .52) c += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
  }
  el.innerHTML = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="#111">${c}</svg>`;
});

// pixel fragments: '.' show image, K black, b blue, c cream, s shifted chunk
document.querySelectorAll('.art[data-pattern]').forEach(el => {
  const rows = el.dataset.pattern.split('|'), R = rows.length, C = rows[0].length;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const i = document.createElement('i');
    if (ch === 's') { const sx = (x + 2) % C, sy = (y + R - 2) % R;
      i.style.cssText = `background:${getComputedStyle(el).getPropertyValue('--img')} ${sx / (C - 1) * 100}% ${sy / (R - 1) * 100}%/${C * 100}% ${R * 100}%`; }
    else if (ch !== '.') i.className = ch;
    el.appendChild(i);
  }));
});

// entrance
const stamps = [...document.querySelectorAll('.board .stamp')];
stamps.forEach((s, k) => s.style.setProperty('--d', (k % 4) * 0.08 + 's'));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
// ?still skips the entrance (screenshots, print): headless Chrome can capture before the observer fires
if (new URLSearchParams(location.search).has('still')) stamps.forEach(s => { s.style.transition = 'none'; s.classList.add('in'); });
else stamps.forEach(s => io.observe(s));

// zoom view
let zoom = null, idx = -1;
const open = k => {
  idx = (k + stamps.length) % stamps.length;
  const s = stamps[idx], tile = s.closest('.tile'), bg = getComputedStyle(tile).backgroundColor;
  if (!zoom) { zoom = document.createElement('div'); zoom.className = 'zoom'; document.body.appendChild(zoom);
    zoom.addEventListener('click', close); requestAnimationFrame(() => zoom.classList.add('on')); }
  zoom.style.setProperty('--bg', bg);
  zoom.classList.toggle('light', tile.classList.contains('t-cream'));
  zoom.innerHTML = ''; const c = s.cloneNode(true); c.classList.add('in'); zoom.appendChild(c);
  const cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = s.dataset.cap; zoom.appendChild(cap);
};
const close = () => { if (!zoom) return; const z = zoom; zoom = null; z.classList.remove('on'); setTimeout(() => z.remove(), 350); };
stamps.forEach((s, k) => s.addEventListener('click', () => open(k)));
// ?z=N opens stamp N in the zoom view (debug / deep link)
const zq = new URLSearchParams(location.search).get('z'); if (zq !== null) open(+zq);
addEventListener('keydown', e => {
  if (!zoom) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowRight') open(idx + 1);
  if (e.key === 'ArrowLeft') open(idx - 1);
});
