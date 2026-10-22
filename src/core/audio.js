// Procedural audio: everything is synthesized with WebAudio — no sound files.
// Ocean ambience, seagulls, UI clicks, build/cash effects, rain/wind beds.

import { bus } from './bus.js';

let ac = null;
let master = null;
let beds = null;      // { ocean, rain, wind } gain nodes
let gullTimer = 0;
let muted = localStorage.getItem('blcl_mute') === '1';
let lastWeather = 'sun';

function noiseBuffer(ac, seconds = 2) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // slight brown tilt
    d[i] = last * 3.2;
  }
  return buf;
}

function makeBed(ac, buf, filterType, freq, q, gain) {
  const src = ac.createBufferSource();
  src.buffer = buf; src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start();
  return { src, f, g };
}

// Slow LFO breathing on a gain node's param (e.g. surf swell).
function lfoGain(ac, gainNode, rate, depth) {
  const osc = ac.createOscillator();
  osc.frequency.value = rate;
  const lg = ac.createGain();
  lg.gain.value = depth;
  osc.connect(lg);
  lg.connect(gainNode.gain);
  osc.start();
}

export function initAudio() {
  if (ac) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('audio unavailable', e);
    return;
  }
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ac.destination);

  const buf = noiseBuffer(ac, 3);

  // ocean: low-passed noise with two slow swell LFOs
  const ocean = makeBed(ac, buf, 'lowpass', 420, 0.7, 0.16);
  lfoGain(ac, ocean.g, 0.11, 0.05);
  const ocean2 = makeBed(ac, buf, 'lowpass', 900, 0.7, 0.05);
  lfoGain(ac, ocean2.g, 0.073, 0.025);

  // rain: bright hiss, silent until weather says otherwise
  const rain = makeBed(ac, buf, 'highpass', 2400, 0.5, 0);

  // wind: mid band with wobble
  const wind = makeBed(ac, buf, 'bandpass', 420, 0.9, 0);
  lfoGain(ac, wind.g, 0.17, 0.03);

  beds = { ocean, rain, wind };
  applyWeather(lastWeather, true);
  scheduleGull(3 + Math.random() * 6);
}

function scheduleGull(delay) {
  if (!ac) return;
  clearTimeout(gullTimer);
  gullTimer = setTimeout(() => {
    gull();
    scheduleGull(7 + Math.random() * 22);
  }, delay * 1000);
}

function gull() {
  if (!ac || muted) return;
  const t0 = ac.currentTime;
  const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
  const dest = pan ? pan : master;
  if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(master); }
  const chirps = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < chirps; i++) {
    const t = t0 + i * 0.16;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    const g = ac.createGain();
    const f0 = 1150 + Math.random() * 350;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 1.2;
    o.connect(bp).connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.18);
  }
}

// ---- one-shot effects ----

export function sfxClick() {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(720, t);
  o.frequency.exponentialRampToValueAtTime(560, t + 0.05);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.08);
}

export function sfxBuild() {
  if (!ac || muted) return;
  const t = ac.currentTime;
  // thud
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.25);
  // two hammer knocks
  for (const dt of [0.1, 0.24]) {
    const s = ac.createBufferSource();
    s.buffer = beds.ocean.src.buffer;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.5;
    const gg = ac.createGain();
    gg.gain.setValueAtTime(0.18, t + dt);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.05);
    s.connect(f).connect(gg).connect(master);
    s.start(t + dt, Math.random(), 0.08);
  }
}

export function sfxCash() {
  if (!ac || muted) return;
  const t = ac.currentTime;
  for (const [f, dt] of [[1320, 0], [1760, 0.07]]) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.06, t + dt);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.12);
    o.connect(g).connect(master);
    o.start(t + dt); o.stop(t + dt + 0.15);
  }
}

export function sfxBad() {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(110, t + 0.2);
  g.gain.setValueAtTime(0.07, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.25);
}

// ---- weather beds ----

function applyWeather(type, instant = false) {
  lastWeather = type;
  if (!ac || !beds) return;
  const t = ac.currentTime;
  const fade = (g, v) => {
    const T = instant ? 0.01 : 1.2;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(v, t + T);
  };
  fade(beds.rain.g, type === 'rain' ? 0.05 : type === 'storm' ? 0.1 : 0);
  fade(beds.wind.g, type === 'wind' ? 0.16 : type === 'storm' ? 0.12 : 0);
  fade(beds.ocean.g, type === 'storm' ? 0.26 : 0.16);
}

// ---- mute ----

export function setMuted(m) {
  muted = m;
  localStorage.setItem('blcl_mute', m ? '1' : '0');
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted() { return muted; }

let lastCash = 0;

// ---- wiring ----

bus.on('weather:changed', (type) => applyWeather(type));
bus.on('building:placed', () => sfxBuild());
bus.on('toast', (m) => { if (m.bad) sfxBad(); });
bus.on('sfx:cash', () => {
  // many purchases can land in one tick — throttle the ding
  const now = performance.now();
  if (now - lastCash > 1400) {
    lastCash = now;
    sfxCash();
  }
});
