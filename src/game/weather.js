// Weather state machine + hazard events (shark / jellyfish).

import { clamp } from '../core/rng.js';

export const SUN = 'sun', CLOUD = 'cloud', RAIN = 'rain', STORM = 'storm';

const TRANSITIONS = {
  // to: [ [type, weight] ... ]
  sun:    [[SUN, 55], [CLOUD, 30], [RAIN, 13], [STORM, 2]],
  cloud:  [[SUN, 40], [CLOUD, 32], [RAIN, 23], [STORM, 5]],
  rain:   [[SUN, 28], [CLOUD, 40], [RAIN, 27], [STORM, 5]],
  storm:  [[CLOUD, 55], [RAIN, 30], [STORM, 10], [SUN, 5]],
};

export function makeWeather() {
  return { type: SUN, hoursLeft: 5 };
}

export function updateWeather(w, rng, dtHours, bus, hazardState) {
  w.hoursLeft -= dtHours;
  if (w.hoursLeft <= 0) {
    const prev = w.type;
    const total = TRANSITIONS[prev].reduce((s, [, wt]) => s + wt, 0);
    let roll = rng() * total;
    let next = prev;
    for (const [t, wt] of TRANSITIONS[prev]) { roll -= wt; if (roll <= 0) { next = t; break; } }
    w.type = next;
    w.hoursLeft = rng.range(2.5, 7);
    if (next !== prev) {
      bus.emit('weather:changed', next);
      if (next === STORM) bus.emit('log:warn', { key: 'w.storm' });
    }
  }
  updateHazard(hazardState, rng, dtHours, bus, w);
}

function updateHazard(hz, rng, dtHours, bus, w) {
  if (hz.sharkT > 0) {
    hz.sharkT -= dtHours;
    if (hz.sharkT <= 0) {
      hz.shark = null;
      bus.emit('log:info', { key: 'msg.sharkGone' });
    }
  } else if (rng.chance(dtHours * 0.006)) {
    hz.shark = true; hz.sharkT = rng.range(1.5, 3);
    bus.emit('log:warn', { key: 'msg.shark' });
  }
  if (hz.jellyT > 0) hz.jellyT -= dtHours;
  else if (rng.chance(dtHours * 0.004)) {
    hz.jellyT = rng.range(1, 2);
    bus.emit('log:warn', { key: 'msg.jelly' });
  }
}

export function beachOpen(w, hz) { return w.type !== STORM && !hz.shark; }
export function swimRisk(w) { return w.type === STORM ? 5 : w.type === RAIN ? 1.6 : 1; }
export function outdoorFunMul(w) { return w.type === STORM ? 0.1 : w.type === RAIN ? 0.45 : w.type === CLOUD ? 0.85 : 1; }
