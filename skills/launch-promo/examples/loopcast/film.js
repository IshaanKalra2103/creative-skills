// Loopcast launch film: 57.5 s, 1920x1080 @ 60, same structure and timing as the reference it was studied from.
window.FILM = {
  w: 1920, h: 1080, fps: 60, dur: 57.5,
  brand: 'Loopcast',
  theme: { paper: '#F1EFEB', ink: '#1F1D19', accent: '#D1FD4E', accent2: '#6233D9', accent2Text: '#5B2FE0',
           dark: '#201E1A', card: '#292722', well: '#151311', alert: '#E0364C', pink: '#EF5A6F' },
  hud: { left: 'LOOPCAST', right: 'CONTENT ON AUTOPILOT', footer: 'LOOPCAST · BUILT ON TINYFISH' },
  fonts: ['880 100px Inter', '900 100px Inter', '500 20px DM', '600 20px DM', '700 20px DM', '400 20px Mono', '700 20px Mono'],
  audio: { musicGain: 0.3, duck: 0.5, bassCut: [50.7, 54.52], fadeOut: [55.6, 57.4] },
  preview: { audio: 'build/mix.wav' },
};
