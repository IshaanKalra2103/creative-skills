// Registry shared by the scene files (loaded before them): VO word lookup, SFX cues, scene list.
(() => {
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
const words = (window.VO_WORDS || []).map(w => ({ ...w, n: norm(w.w) }));
const find = (word, nth = 0, after = 0) => {
  const hits = words.filter(w => w.n === norm(word) && w.s >= after);
  if (!hits[nth]) { console.warn('VO word not found', word, nth, after); return { s: 0, e: 0 }; }
  return hits[nth];
};
// W('viral') -> start time of that VO word; W('you', 1, 8) -> 2nd "you" after 8 s; WE() -> end time
window.W = (word, nth = 0, after = 0) => find(word, nth, after).s;
window.WE = (word, nth = 0, after = 0) => find(word, nth, after).e;
window.SFX = [];
window.sfx = (t, type, gain = 1, opt = {}) => window.SFX.push({ t: +t.toFixed(3), type, gain, ...opt });
window.SCENE_DEFS = [];
window.scene = def => window.SCENE_DEFS.push(def);
})();
