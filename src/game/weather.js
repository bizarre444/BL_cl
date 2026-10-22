// Weather state machine + hazard events (shark / jellyfish).
// States: sun, cloud, rain, storm, heat (жара), wind (ветер).

import { clamp } from '../core/rng.js';

export const SUN = 'sun', CLOUD = 'cloud', RAIN = 'rain', STORM = 'storm',
             HEAT = 'heat', WIND = 'wind';

const TRANSITIONS = {
  sun:   [[SUN, 34], [CLOUD, 26], [RAIN, 12], [STORM, 2], [HEAT, 16], [WIND, 10]],
  cloud: [[SUN, 30], [CLOUD, 24], [RAIN, 22], [STORM, 4], [HEAT, 8], [WIND, 12]],
  rain:  [[SUN, 24], [CLOUD, 38], [RAIN, 26], [STORM, 6], [HEAT, 2], [WIND, 4]],
  storm: [[CLOUD, 46], [RAIN, 32], [STORM, 10], [SUN, 6], [WIND, 6]],
  heat:  [[HEAT, 24], [SUN, 34], [CLOUD, 16], [RAIN, 10], [STORM, 6], [WIND, 10]],
  wind:  [[WIND, 20], [SUN, 28], [CLOUD, 26], [RAIN, 12], [STORM, 10], [HEAT, 4]],
};

// scenario bias: { storm: +weight, heat: +weight, ... }
export function makeWeather(bias = null) {
  return { type: SUN, hoursLeft: 5, bias };
}

export function updateWeather(w, rng, dtHours, bus, hazardState) {
  w.hoursLeft -= dtHours;
  if (w.hoursLeft <= 0) {
    const prev = w.type;
    const rows = TRANSITIONS[prev].map(([t, wt]) => {
      if (w.bias && w.bias[t]) wt += w.bias[t];
      return [t, wt];
    });
    const total = rows.reduce((s, [, wt]) => s + wt, 0);
    let roll = rng() * total;
    let next = prev;
    for (const [t, wt] of rows) { roll -= wt; if (roll <= 0) { next = t; break; } }
    w.type = next;
    w.hoursLeft = rng.range(2.5, 7);
    if (next !== prev) {
      bus.emit('weather:changed', next);
      if (next === STORM) bus.emit('log:warn', { key: 'w.storm' });
      if (next === HEAT) bus.emit('log:info', { key: 'w.heat' });
      if (next === WIND) bus.emit('log:info', { key: 'w.wind' });
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

export function beachOpen(w, hz) {
  if (w.type === STORM || w.type === WIND || hz.shark) return false;
  return true;
}
export function swimRisk(w) {
  if (w.type === STORM) return 5;
  if (w.type === WIND) return 1.8;
  if (w.type === RAIN) return 1.6;
  return 1;
}
export function outdoorFunMul(w) {
  switch (w.type) {
    case STORM: return 0.1;
    case RAIN: return 0.45;
    case CLOUD: return 0.85;
    case HEAT: return 0.9;  // midday scorch
    case WIND: return 0.7;  // sand in the face
    default: return 1;
  }
}
// extra thirst burn during a heatwave (multiplier on thirst decay)
export function thirstMul(w) { return w.type === HEAT ? 1.8 : 1; }
