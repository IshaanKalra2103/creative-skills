/* slide-craft runtime: meta row, thumbnail rail, keyboard + trackpad navigation,
   presenter mode with speaker notes, light table, print. Authors touch nothing here. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wraps = $$('.slide-wrap');
  const title = (document.title || '').trim();
  const dateLabel = (document.body.dataset.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })).toUpperCase();
  let idx = 0;

  // meta row + body wrapper, injected so slides stay plain HTML
  wraps.forEach((w, i) => {
    w.id = w.id || `slide-${i + 1}`;
    const canvas = $('.slide-canvas', w);
    if (!canvas) return;
    const kids = [...canvas.children].filter(n => !n.classList.contains('slide-meta') && !n.classList.contains('full-img'));
    const meta = document.createElement('div');
    meta.className = 'slide-meta';
    meta.innerHTML = `<span>${dateLabel}</span><span>${title}</span><span>${String(i + 1).padStart(2, '0')} / ${String(wraps.length).padStart(2, '0')}</span>`;
    const body = document.createElement('div');
    body.className = 'slide-body';
    kids.forEach(k => body.appendChild(k));
    canvas.prepend(body);
    canvas.prepend(meta);
  });

  // thumbnails: real slides, cloned and scaled
  const list = $('#thumbs');
  wraps.forEach((w, i) => {
    const t = document.createElement('button');
    t.className = 'thumb'; t.type = 'button';
    t.setAttribute('aria-label', `Slide ${i + 1}: ${w.dataset.title || ''}`);
    const inner = document.createElement('div');
    inner.className = 'thumb-inner';
    inner.appendChild($('.slide-canvas', w).cloneNode(true));
    const n = document.createElement('span');
    n.className = 'thumb-n'; n.textContent = i + 1;
    t.append(inner, n);
    t.onclick = () => go(i);
    list.appendChild(t);
    const fit = () => { inner.style.transform = `scale(${t.clientWidth / 1280})`; };
    fit(); new ResizeObserver(fit).observe(t);
  });
  const thumbs = $$('.thumb', list);

  const notes = $('#notes'), counter = $('#counter');
  function mark(i) {
    idx = Math.max(0, Math.min(wraps.length - 1, i));
    thumbs.forEach((t, k) => t.setAttribute('aria-current', k === idx ? 'true' : 'false'));
    thumbs[idx].scrollIntoView({ block: 'nearest' });
    counter.textContent = `${idx + 1} / ${wraps.length}`;
    notes.textContent = wraps[idx].dataset.notes || '';
    history.replaceState(null, '', `#${wraps[idx].id}`);
  }
  function go(i) { const t = Math.max(0, Math.min(wraps.length - 1, i)); wraps[t].scrollIntoView({ behavior: 'smooth', block: 'center' }); mark(t); }

  new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (v && !document.body.classList.contains('grid-view')) mark(wraps.indexOf(v.target)); }, { threshold: [.5, .75] })
    .observe && wraps.forEach(w => new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting && !document.body.classList.contains('grid-view')) mark(wraps.indexOf(e.target)); }); }, { threshold: .6 }).observe(w));

  // one slide per gesture, Google-Slides style
  let lock = false;
  $('#stage').addEventListener('wheel', e => {
    if (document.body.classList.contains('grid-view')) return;
    if (Math.abs(e.deltaY) < 12) return;
    e.preventDefault();
    if (lock) return;
    lock = true; setTimeout(() => (lock = false), 520);
    go(idx + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  addEventListener('keydown', e => {
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown') { e.preventDefault(); go(idx + 1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); go(idx - 1); }
    else if (k === 'Home') go(0); else if (k === 'End') go(wraps.length - 1);
    else if (k.toLowerCase() === 'p') present();
    else if (k.toLowerCase() === 'g') grid();
    else if (k === 'Escape') { document.body.classList.remove('presenting', 'grid-view'); if (document.fullscreenElement) document.exitFullscreen(); }
  });

  function present() {
    const on = document.body.classList.toggle('presenting');
    document.body.classList.remove('grid-view');
    if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    else if (!on && document.fullscreenElement) document.exitFullscreen();
    go(idx);
  }
  function grid() { document.body.classList.toggle('grid-view'); if (!document.body.classList.contains('grid-view')) go(idx); }

  $('#present').onclick = present; $('#gridView').onclick = grid;
  $('#prev').onclick = () => go(idx - 1); $('#next').onclick = () => go(idx + 1);
  $('#pprev').onclick = () => go(idx - 1); $('#pnext').onclick = () => go(idx + 1);
  $('#deckName').textContent = title;

  const fromHash = wraps.findIndex(w => '#' + w.id === location.hash);
  mark(fromHash > 0 ? fromHash : 0);
  if (fromHash > 0) wraps[fromHash].scrollIntoView({ behavior: 'instant', block: 'center' });
})();
