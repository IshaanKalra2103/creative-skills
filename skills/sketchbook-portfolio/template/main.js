/* sketchbook-portfolio engine. Content lives in index.html (markup + window.SITE);
   this file is identical across the template and every example. */
const SITE = window.SITE || {};
const params = new URLSearchParams(location.search);
const SHOT_Y = params.has("y") ? Number(params.get("y")) || 0 : null; // ?y=1800 → static screenshot at that scroll
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

/* ---------- stamps: the tiles down both edges ---------- */
const STAMPS = (SITE.stamps || [["d-ball", "Hello"]]).map(([icon, label]) => ({
  icon, label, vb: document.getElementById(icon)?.getAttribute("viewBox") || "0 0 100 100",
}));
const VARIANTS = ["a", "b", "a", "c", "a", "b"];

function stampEl(s, i) {
  const el = document.createElement("div");
  el.className = `stamp stamp--${VARIANTS[i % VARIANTS.length]}`;
  el.dataset.label = s.label;
  el.style.setProperty("--tilt", `${((i * 37) % 7) - 3}deg`);
  el.innerHTML = `<svg viewBox="${s.vb}"><g filter="url(#rough)"><use href="#${s.icon}"/></g></svg>`;
  return el;
}

$$(".stamps__track").forEach((track, side) => {
  // enough tiles to cover a tall screen, then doubled so the scroll loops seamlessly
  const perScreen = Math.ceil(window.screen.height / 62) + 2;
  const run = [];
  for (let i = 0; i < perScreen; i++) run.push(STAMPS[(i + side * 5) % STAMPS.length]);
  [...run, ...run].forEach((s, i) => track.appendChild(stampEl(s, i + side)));
});

const tip = $(".stamp-tip");
$$(".stamps").forEach((col) => {
  col.addEventListener("mouseover", (e) => {
    const s = e.target.closest(".stamp");
    if (!s || !tip) return;
    const r = s.getBoundingClientRect();
    tip.textContent = s.dataset.label;
    const left = col.classList.contains("stamps--left");
    tip.style.top = `${r.top + r.height / 2}px`;
    tip.style.left = left ? `${r.right + 12}px` : "auto";
    tip.style.right = left ? "auto" : `${innerWidth - r.left + 12}px`;
    tip.classList.add("show");
  });
  col.addEventListener("mouseleave", () => tip?.classList.remove("show"));
});

/* sticker sheet (about section): SITE.stickers = indices into SITE.stamps */
const stickers = $(".stickers");
if (stickers) {
  (SITE.stickers || STAMPS.map((_, i) => i).slice(0, 6)).forEach((idx, i) => {
    const s = STAMPS[idx % STAMPS.length];
    const li = document.createElement("li");
    li.style.setProperty("--tilt", `${[-4, 3, -2, 5, -3, 2][i % 6]}deg`);
    li.appendChild(stampEl(s, i));
    const cap = document.createElement("span");
    cap.textContent = s.label;
    li.appendChild(cap);
    stickers.appendChild(li);
  });
}

/* ---------- line boil: re-seed the noise a few times a second ---------- */
if (!reduceMotion && SHOT_Y === null) {
  const turbs = $$("filter[data-boil] feTurbulence:first-of-type");
  const seeds = [2, 11, 23];
  let f = 0;
  setInterval(() => {
    if (document.hidden) return;
    f = (f + 1) % seeds.length;
    turbs.forEach((t, k) => t.setAttribute("seed", seeds[f] + k));
  }, 170);
}

/* ---------- click burst: little ink dashes fly out of every click ---------- */
const SVGNS = "http://www.w3.org/2000/svg";
function burst(x, y) {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "burst");
  svg.style.left = `${x}px`;
  svg.style.top = `${y}px`;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const deg = -165 + (150 / (n - 1)) * i + (Math.random() * 16 - 8);
    const a = (deg * Math.PI) / 180;
    const cos = Math.cos(a), sin = Math.sin(a);
    const r0 = 12, len = 12 + Math.random() * 7, bend = Math.random() > 0.5 ? 3 : -3;
    const x0 = cos * r0, y0 = sin * r0, x1 = cos * (r0 + len), y1 = sin * (r0 + len);
    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", `M${x0} ${y0}Q${(x0 + x1) / 2 - sin * bend} ${(y0 + y1) / 2 + cos * bend} ${x1} ${y1}`);
    svg.appendChild(path);
    const d = 18 + Math.random() * 10;
    path.animate(
      [
        { transform: "translate(0px, 0px)", opacity: 1, strokeWidth: 3.4 },
        { transform: `translate(${cos * d * 0.7}px, ${sin * d * 0.7}px)`, opacity: 1, strokeWidth: 2.6, offset: 0.45 },
        { transform: `translate(${cos * d}px, ${sin * d}px)`, opacity: 0, strokeWidth: 1 },
      ],
      { duration: 520, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }
    );
  }
  document.body.appendChild(svg);
  setTimeout(() => svg.remove(), 580);
}
if (!reduceMotion) addEventListener("pointerdown", (e) => { if (e.button === 0) burst(e.clientX, e.clientY); });

/* ---------- live clock: <span id="clock" data-tz="America/New_York"> ---------- */
const clock = $("#clock");
if (clock) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: clock.dataset.tz || undefined, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const tick = () => { clock.textContent = fmt.format(new Date()).replace(/AM|PM/, (m) => m.toLowerCase()); };
  tick();
  setInterval(tick, 20_000);
}

/* ---------- board: row numbers + fake screen data ---------- */
const rows = $(".board__rows");
if (rows) for (let i = 1; i <= 18; i++) rows.insertAdjacentHTML("beforeend", `<li>${i}</li>`);

$$("[data-viz]").forEach((v) => {
  for (let i = 0; i < 18; i++) {
    const s = document.createElement("span");
    s.style.setProperty("--h", `${35 + ((i * 53) % 65)}%`);
    s.style.animationDelay = `${-(i * 0.13).toFixed(2)}s`;
    s.style.animationDuration = `${0.45 + ((i * 7) % 5) / 10}s`;
    v.appendChild(s);
  }
});
$$("[data-heat]").forEach((h) => {
  for (let i = 0; i < 36; i++) {
    const s = document.createElement("span");
    const lvl = (i * 17 + (i % 5) * 3) % 7;
    if (lvl > 3) s.className = `l${Math.min(lvl - 3, 3)}`;
    h.appendChild(s);
  }
});

/* ---------- gallery: polaroids of each card's screen, drifting at different speeds ---------- */
const board = $(".board");
const cardEls = board ? $$(".card", board) : [];
const GALLERY = SITE.gallery || [
  { side: "left", x: "1%", y: 40, w: 300, rot: -6, speed: 1.3 },
  { side: "right", x: "2%", y: 0, w: 290, rot: 5, speed: 0.8 },
  { side: "left", x: "11%", y: 560, w: 280, rot: 4, speed: 0.85 },
  { side: "right", x: "9%", y: 520, w: 300, rot: -4, speed: 1.25 },
  { side: "left", x: "0%", y: 1040, w: 290, rot: -3, speed: 1.15 },
  { side: "right", x: "1%", y: 1020, w: 280, rot: 6, speed: 0.9 },
  { side: "left", x: "12%", y: 1480, w: 270, rot: 5, speed: 0.8 },
  { side: "right", x: "11%", y: 1460, w: 290, rot: -5, speed: 1.2 },
];
const galleryInner = $(".gallery__inner");
if (galleryInner && cardEls.length) {
  GALLERY.forEach((g, i) => {
    const src = cardEls[(g.card ?? i) % cardEls.length];
    const fig = document.createElement("figure");
    fig.className = "polaroid";
    fig.style.cssText = `${g.side}:${g.x};top:${g.y}px;width:${g.w}px;rotate:${g.rot}deg`;
    fig.dataset.speed = g.speed;
    fig.dataset.rot = g.rot;
    fig.appendChild($(".scr", src).cloneNode(true));
    const cap = document.createElement("figcaption");
    cap.textContent = $("h3", src)?.textContent || "";
    fig.appendChild(cap);
    galleryInner.appendChild(fig);
  });
}

/* ---------- scroll choreography ---------- */
const root = document.documentElement;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const range = (v, a, b) => clamp01((v - a) / (b - a)); // 0 at a → 1 at b (a may be > b)
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) ** 3;

const bookTop = $(".book__top");
const bookBottom = $(".book__bottom");
const sheet = $(".book__sheet");
const boardWrap = $(".board-wrap");
const notePins = $$(".note-pin");
const parEls = $$(".polaroid, .doodle[data-speed]");
const cards = cardEls.map((el, i) => {
  const side = [-1, 0, 1][i % 3] || (i % 2 ? 1 : -1);
  return { el, dx: side * (150 + ((i * 67) % 150)), dy: 380 + ((i * 97) % 260), rot: side * (9 + ((i * 5) % 9)), jit: ((i * 41) % 3) * 40, landed: true };
});
const STICK = 130; // must match .note-pin { top: calc(50vh - 130px) }

let fxOn = false;
let m = null; // measured document positions

function clearFx() {
  [bookTop, bookBottom, sheet, boardWrap].forEach((el) => el && (el.style.transform = ""));
  [...notePins, ...parEls, ...cardEls].forEach((el) => { el.style.translate = ""; el.style.scale = ""; });
  cardEls.forEach((el) => (el.style.rotate = ""));
  cards.forEach((c) => (c.landed = true));
}

// the board is as tall as its lowest card plus room for the caption (desktop layout only)
function fitBoard() {
  if (!board) return;
  if (innerWidth <= 1100 || !cardEls.length) { board.style.height = ""; return; }
  const bottom = Math.max(...cardEls.map((c) => c.offsetTop + c.offsetHeight));
  board.style.height = `${bottom + 140}px`;
}

function measure() {
  clearFx();
  const y = scrollY;
  const bb = bookBottom.getBoundingClientRect();
  m = {
    bottomTop: bb.top + y,
    bottomH: bb.height,
    notes: notePins.map((el) => {
      const r = el.parentElement.getBoundingClientRect();
      return { el, top: r.top + y, cx: r.left + r.width / 2 };
    }),
    par: parEls.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, cy: r.top + y + r.height / 2, speed: +el.dataset.speed, rot: el.dataset.rot == null ? null : +el.dataset.rot };
    }),
    boardTop: boardWrap ? boardWrap.getBoundingClientRect().top + y : 0,
  };
  cards.forEach((c) => (c.slotTop = c.el.offsetTop));
}

function frame() {
  if (!fxOn || !m) return;
  const y = scrollY, vh = innerHeight, vw = innerWidth;

  // 1. top page leans back as it scrolls away
  const lean = smooth(range(y, 0, vh * 0.9));
  bookTop.style.transform = `rotateX(${(-3 + 13 * lean).toFixed(2)}deg)`;

  // 2. bottom page is hinged at the fold: tilted toward you, opens flat as it rises, tips away as it leaves
  const T = m.bottomTop - y;
  const open = smooth(range(T, vh * 0.18, vh * 0.78));
  bookBottom.style.transform = `rotateX(${(40 * open).toFixed(2)}deg)`;
  const close = smooth(range(T + m.bottomH, vh * 0.65, 0));
  sheet.style.transform = `rotateX(${(-24 * close).toFixed(2)}deg)`;

  // 3. notes peel off the page: CSS sticky pins them, this slides them to centre and shrinks them a touch
  for (const n of m.notes) {
    const stick = vh / 2 - STICK;
    const p = smooth(range(n.top - y, stick + 40, stick - 280));
    n.el.style.translate = `${((vw / 2 - n.cx) * p).toFixed(1)}px 0`;
    n.el.style.scale = (1 - 0.14 * p).toFixed(3);
  }

  // 4. parallax: speed > 1 moves faster than the page, < 1 slower
  for (const it of m.par) {
    const c = it.cy - y - vh / 2;
    it.el.style.translate = `0 ${((it.speed - 1) * c).toFixed(1)}px`;
    if (it.rot != null) it.el.style.rotate = `${(it.rot + c * 0.004).toFixed(2)}deg`;
  }

  // 5. the board tilts up off the table and the cards drop into their slots
  if (!boardWrap) return;
  const bt = m.boardTop - y;
  const up = smooth(range(bt, vh, vh * 0.3));
  boardWrap.style.transform = `rotateX(${(26 * (1 - up)).toFixed(2)}deg)`;
  for (const c of cards) {
    const t = easeOut(range(bt + c.slotTop, vh * 1.2 + c.jit, vh * 0.5 + c.jit));
    const k = 1 - t;
    c.el.style.translate = `${(c.dx * k).toFixed(1)}px ${(c.dy * k).toFixed(1)}px`;
    c.el.style.scale = (1 + 0.32 * k).toFixed(3);
    c.el.style.rotate = `${(c.rot * k).toFixed(2)}deg`;
    c.landed = t > 0.995;
  }
}

function setMode() {
  const want = !reduceMotion && innerWidth > 1100;
  if (want !== fxOn) {
    fxOn = want;
    root.classList.toggle("fx", fxOn);
  }
  fitBoard();
  if (fxOn) { measure(); frame(); } else clearFx();
}

let queued = false;
addEventListener("scroll", () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; frame(); });
}, { passive: true });
let resizeT;
addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(setMode, 120); });
setMode();
document.fonts?.ready.then(setMode);
addEventListener("load", setMode);

if (SHOT_Y !== null) {
  // screenshot mode: no smooth scroll, reveal everything, jump straight to ?y=
  history.scrollRestoration = "manual";
  const go = () => { $$(".reveal").forEach((el) => el.classList.add("in")); setMode(); scrollTo(0, SHOT_Y); frame(); };
  document.fonts?.ready.then(go);
  addEventListener("load", go);
} else if (!reduceMotion && typeof Lenis !== "undefined") {
  // Lenis drives the native scroll position, so CSS sticky and the scroll listener above keep working
  window.lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.1 });
}

/* ---------- draggable cards (once they've landed) ---------- */
const canDrag = () => matchMedia("(min-width: 1101px)").matches;
let z = 10;
cards.forEach((c) => {
  const card = c.el;
  card.addEventListener("pointerdown", (e) => {
    if (!canDrag() || !c.landed || e.button !== 0) return;
    const startX = e.clientX, startY = e.clientY;
    const ox = card.offsetLeft, oy = card.offsetTop;
    const maxX = board.clientWidth - card.offsetWidth * 0.4;
    const maxY = board.clientHeight - card.offsetHeight * 0.4;
    card.setPointerCapture(e.pointerId);
    card.classList.add("dragging");
    card.style.zIndex = ++z;
    const move = (ev) => {
      const x = Math.max(-card.offsetWidth * 0.3, Math.min(maxX, ox + ev.clientX - startX));
      const y = Math.max(-40, Math.min(maxY, oy + ev.clientY - startY));
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
    };
    const up = () => {
      card.classList.remove("dragging");
      c.slotTop = card.offsetTop;
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", up);
      card.removeEventListener("pointercancel", up);
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", up);
    card.addEventListener("pointercancel", up);
  });
});

/* ---------- keepy-uppy toy (optional: .juggle__ball) ---------- */
const ball = $(".juggle__ball");
if (ball) {
  const count = $(".juggle__count");
  let n = 0, best = 0;
  try { best = Number(localStorage.getItem("keepyups-best")) || 0; } catch {}
  let kick = null;
  ball.addEventListener("click", () => {
    n += 1;
    if (n > best) {
      best = n;
      try { localStorage.setItem("keepyups-best", String(best)); } catch {}
    }
    count.textContent = `keepy-ups: ${n}  (best ${best})`;
    if (reduceMotion) return;
    kick?.cancel();
    ball.classList.add("kicked");
    const h = 110 + Math.min(n, 10) * 8;
    kick = ball.animate(
      [
        { transform: "translateY(0) rotate(0deg)", easing: "cubic-bezier(.15,.6,.35,1)" },
        { transform: `translateY(-${h}px) rotate(200deg)`, easing: "cubic-bezier(.65,0,.85,.4)" },
        { transform: "translateY(0) rotate(360deg)" },
      ],
      { duration: 900 }
    );
    kick.onfinish = () => ball.classList.remove("kicked");
  });
}

/* ---------- placeholder links ---------- */
$$("[data-todo]").forEach((a) =>
  a.addEventListener("click", (e) => { e.preventDefault(); a.textContent = "coming soon"; })
);

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }),
  { threshold: 0.08 }
);
$$(".reveal").forEach((el) => io.observe(el));
