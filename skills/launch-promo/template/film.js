// The one place to configure a film. Everything else reads from here:
//  - main.js: size, fps, length, HUD text, which fonts to wait for, preview audio
//  - style.css vars + components.js: the palette (theme keys map to --paper, --ink, --lime, --purple, ...)
//  - render.py: w/h/fps/dur (read from the page)        - audio.py: the mix settings (via build/film.json)
window.FILM = {
  w: 1920, h: 1080, fps: 60, dur: 20,
  brand: 'Orbit',
  theme: {
    paper: '#F1EFEB',    // light background
    ink: '#1F1D19',      // text, outlines, hard shadows
    accent: '#D1FD4E',   // the loud colour: stickers, keywords on dark, highlight boxes   (css --lime)
    accent2: '#6233D9',  // the brand field colour for the logo beat and price beat        (css --purple)
    accent2Text: '#5B2FE0', // accent2 tuned for type on paper                             (css --violet)
    dark: '#201E1A',     // dark scenes
    card: '#292722',     // dark cards
    well: '#151311',     // insets inside dark cards
    alert: '#E0364C',    // badges, "missed" stamps                                        (css --red)
    pink: '#EF5A6F',     // the bad word ("lose.")
  },
  // corner HUD: off by default (corner brackets + labels read as template furniture). ?hud=1 or render.py --hud
  hud: { left: 'ORBIT', right: 'REPLIES ON AUTOPILOT', footer: 'ORBIT · LAUNCH FILM' },
  fonts: ['900 100px Inter', '500 20px DM', '600 20px DM', '700 20px DM', '400 20px Mono', '700 20px Mono'],
  audio: {
    musicGain: 0.3,          // music bed level before ducking
    duck: 0.5,               // music drops by this fraction under the voice (0.5 ≈ -6 dB)
    bassCut: [15.5, 18.4],   // high-pass the music here (the end-card breakdown); [] to skip
    fadeOut: [18.6, 19.9],   // music fade
  },
  preview: { audio: 'build/mix.wav' },
};
