// ---------- soundtrack: score + foley mixed in audio/mix.py on the film's own clock ----------
// main.js calls startAudio / stopAudio / audioAt; while the track plays, the film follows its clock.
(function () {
  const el = new Audio();
  el.preload = 'auto';
  el.src = window.__SOUNDTRACK || 'audio/soundtrack.m4a';
  let failed = false;
  window.startAudio = (from) => {
    failed = false;
    try { el.currentTime = from; } catch (e) {}
    const p = el.play();
    if (p) p.catch(() => { failed = true; });
  };
  window.stopAudio = () => el.pause();
  // film time from the audio clock, or null (no sound yet / blocked) so main.js uses the wall clock
  window.audioClock = () => (!failed && !el.paused && el.readyState >= 2) ? el.currentTime : null;
  window.audioAt = () => {};
  window.__audioEl = el;
})();
