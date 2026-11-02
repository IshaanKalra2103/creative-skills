// The one place to configure a reel. main.js, caption.js, the components, render.py and audio.py all read it.
window.FILM = {
  w: 1080, h: 1920, fps: 60,
  dur: 'auto',              // 'auto' = last VO word + 1.6 s (VO_END, written by vo.py); or a number of seconds
  theme: {                  // -> CSS vars --bg --ink --dim --signal --anti --bad --good --select --light
    bg: '#0d0d0d',          // near-black canvas (faint grid + vignette come from style.css)
    ink: '#f2f2f2',         // text and outlines on dark
    dim: '#6f6f6f',         // caption words that aren't being spoken
    signal: '#f5b83d',      // THE invisible actor (charge, field, signal, zones). Gold unless the subject owns a colour.
    anti: '#4aa8ff',        // its opposite, if the story has one (anti-noise, the other side)
    bad: '#ff5a4f',         // damage, heat, refusal, error
    good: '#3ddc84',        // ok, healthy, passed
    select: '#0d99ff',      // the caption keyword's selection box (Figma blue)
    light: '#f3f2ee',       // the occasional white scene
  },
  caption: {
    top: 300,               // y of the caption's top edge: under IG's top bar, in the top ~15-20%
    width: 960, size: 70, min: 48,   // px; one chunk = one line; a long chunk shrinks toward `min`
    chunk: 3,               // words per chunk (1-4 reads best; a multi-word keyword is never split)
    emoji: {},              // optional: { gloves: '🧤' } puts the emoji before that word (sparingly)
  },
  // Instagram's own UI covers the bottom ~380 px (name, caption, audio) and the right ~130 px (buttons).
  // Nothing that must be read goes there. Hero objects can pass behind them.
  gl: {                     // the 3D layer (src/gl.js). The hero is a real model; see assets/models/SOURCES.md
    fov: 30, exposure: 1.0, envIntensity: 0.4,   // camera lens; tone-mapping exposure; studio reflections strength
    aperture: 0.012, maxblur: 0.008,             // depth of field (per camera key: focus, aperture)
    bloom: { strength: 0.6, radius: 0.45, threshold: 1.1 },    // only HDR-bright bits glow (the gold signal)
  },
  safe: { top: 200, bottom: 380, right: 130 },
  fonts: ['700 60px Inter', '500 20px Inter', '400 20px Mono', '700 20px Mono'],
  audio: { musicGain: 0.16, duck: 0.6, bassCut: [] },   // audio.py: music bed level, ducking under the voice
  preview: { audio: 'build/mix.wav' },
};
