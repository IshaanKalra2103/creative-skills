// Registry shared by the scene files (loaded before them): VO word lookup, line spans, SFX cues, scene list, reel length.
(() => {
const F = window.FILM;
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
const words = (window.VO_WORDS || []).map(w => ({ ...w, n: norm(w.w) }));
const find = (word, nth = 0, after = 0) => {
  const hits = words.filter(w => w.n === norm(word) && w.s >= after);
  if (!hits[nth]) { console.warn('VO word not found', word, nth, after); return { s: 0, e: 0 }; }
  return hits[nth];
};
// W('finger') -> start time of that VO word; W('you', 1, 8) -> 2nd "you" after 8 s; WE() -> its end time
window.W = (word, nth = 0, after = 0) => find(word, nth, after).s;
window.WE = (word, nth = 0, after = 0) => find(word, nth, after).e;
// LINE(k) -> {s, e, words} of script line k (0-based): scene windows hang off these
window.LINE = k => {
  const ws = words.filter(w => w.line === k);
  if (!ws.length) { console.warn('VO line not found', k); return { s: 0, e: 0, words: [] }; }
  return { s: ws[0].s, e: ws[ws.length - 1].e, words: ws };
};
window.NLINES = words.reduce((m, w) => Math.max(m, w.line + 1), 0);
if (F.dur === 'auto') F.dur = Math.ceil((window.VO_END || 10) * F.fps) / F.fps;
window.SFX = [];
window.sfx = (t, type, gain = 1, opt = {}) => window.SFX.push({ t: +t.toFixed(3), type, gain, ...opt });
window.SCENE_DEFS = [];
window.scene = def => window.SCENE_DEFS.push(def);
})();
