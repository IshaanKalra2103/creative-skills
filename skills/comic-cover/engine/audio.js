// Tiny synthesized foley. Created lazily on the first user gesture.
let ctx = null, master = null, muted = false;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(sec) {
  const a = ac();
  const b = a.createBuffer(1, Math.floor(a.sampleRate * sec), a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; }
export function isMuted() { return muted; }

export function thwip() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  const src = a.createBufferSource(); src.buffer = noiseBuffer(0.25);
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
  bp.frequency.setValueAtTime(5200, t); bp.frequency.exponentialRampToValueAtTime(900, t + 0.18);
  const g = a.createGain(); g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  src.connect(bp).connect(g).connect(master); src.start(t);
  const o = a.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.12);
  const og = a.createGain(); og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o.connect(og).connect(master); o.start(t); o.stop(t + 0.15);
}

export function thunder() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  const src = a.createBufferSource(); src.buffer = noiseBuffer(3.2);
  const lp = a.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(120, t + 2.4);
  const g = a.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.0, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.5); g.gain.linearRampToValueAtTime(0.5, t + 0.9);
  g.gain.exponentialRampToValueAtTime(0.001, t + 3.0);
  src.connect(lp).connect(g).connect(master); src.start(t);
}

export function tingle() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  for (let i = 0; i < 3; i++) {
    const o = a.createOscillator(); o.type = 'sine';
    const f = 1400 + i * 470;
    o.frequency.setValueAtTime(f, t + i * 0.04);
    const lfo = a.createOscillator(); lfo.frequency.value = 28 + i * 7;
    const lg = a.createGain(); lg.gain.value = 60; lfo.connect(lg).connect(o.frequency);
    const g = a.createGain(); g.gain.setValueAtTime(0, t + i * 0.04); g.gain.linearRampToValueAtTime(0.08, t + i * 0.04 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + i * 0.05);
    o.connect(g).connect(master); o.start(t + i * 0.04); lfo.start(t + i * 0.04); o.stop(t + 0.8); lfo.stop(t + 0.8);
  }
}

export function click() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  const o = a.createOscillator(); o.type = 'square'; o.frequency.value = 1100;
  const g = a.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.06);
}

export function pencil() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  const src = a.createBufferSource(); src.buffer = noiseBuffer(0.8);
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
  const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.1); g.gain.linearRampToValueAtTime(0.12, t + 0.5); g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  src.connect(hp).connect(g).connect(master); src.start(t);
}

export function zap() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  const o = a.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(1400, t + 0.08); o.frequency.exponentialRampToValueAtTime(90, t + 0.4);
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 8;
  const g = a.createGain(); g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + 0.5);
}

export function pow() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  const o = a.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
  const g = a.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.32);
  const src = a.createBufferSource(); src.buffer = noiseBuffer(0.12);
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800;
  const ng = a.createGain(); ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  src.connect(bp).connect(ng).connect(master); src.start(t);
}

// Church bell: inharmonic partials (hum, prime, tierce, quint, nominal) with a long, beating decay.
export function bell() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  const f = 196;
  for (const [r, amp, dec] of [[0.5, 0.35, 4.5], [1, 0.5, 3.2], [1.19, 0.3, 2.4], [1.5, 0.18, 2.0], [2, 0.32, 1.6], [2.52, 0.12, 1.1], [3.01, 0.08, 0.8]]) {
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.value = f * r;
    const o2 = a.createOscillator(); o2.type = 'sine';
    o2.frequency.value = f * r * 1.003;              // a slightly detuned twin makes it beat
    const g = a.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * 0.22, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dec);
    o.connect(g); o2.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + dec + 0.1); o2.stop(t + dec + 0.1);
  }
  const src = a.createBufferSource(); src.buffer = noiseBuffer(0.06);
  const hp = a.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 2;
  const ng = a.createGain(); ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  src.connect(hp).connect(ng).connect(master); src.start(t);
}

// A thrown club: an air swish, then (clack) a hard wooden knock on stone.
export function swish() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  const src = a.createBufferSource(); src.buffer = noiseBuffer(0.3);
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5;
  bp.frequency.setValueAtTime(700, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.12); bp.frequency.exponentialRampToValueAtTime(900, t + 0.26);
  const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7, t + 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  src.connect(bp).connect(g).connect(master); src.start(t);
}
export function clack() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  for (const [f, d] of [[820, 0.09], [1310, 0.06], [2150, 0.04]]) {
    const o = a.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.8, t + d);
    const g = a.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  const src = a.createBufferSource(); src.buffer = noiseBuffer(0.05);
  const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  src.connect(g).connect(master); src.start(t);
}

// Radar sense: a low sonar ping that rings out.
export function radar() {
  if (muted) return;
  const a = ac(), t = a.currentTime;
  for (let i = 0; i < 2; i++) {
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1150, t + i * 0.32); o.frequency.exponentialRampToValueAtTime(980, t + i * 0.32 + 0.9);
    const g = a.createGain(); g.gain.setValueAtTime(0, t + i * 0.32); g.gain.linearRampToValueAtTime(i ? 0.05 : 0.12, t + i * 0.32 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, t + i * 0.32 + 1.1);
    o.connect(g).connect(master); o.start(t + i * 0.32); o.stop(t + i * 0.32 + 1.2);
  }
}
