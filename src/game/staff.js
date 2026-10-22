// Staff simulation: cleaners, mechanics, lifeguards, security, entertainers.
// Hired counts live in state.staff.counts; visible walker units mirror them.

import { STAFF_BY_ID } from './catalog.js';
import { findPath, isLand } from '../world/map.js';
import { clamp } from '../core/rng.js';
import { bus } from '../core/bus.js';
import { lifeguardCovered } from './guests.js';

export function makeStaffSystem() {
  return {
    counts: { cleaner: 0, mechanic: 0, lifeguard: 0, security: 0, entertainer: 0 },
    units: [], // {role, x, y, path, pathI, task, anim}
  };
}

// Can we hire one more of this role? Requires the base building.
export function canHire(state, role) {
  const def = STAFF_BY_ID[role];
  if (!def) return false;
  // lifeguards may be hired per tower, others just need the base present
  const bases = state.bs.buildings.filter(b => b.id === def.base);
  if (bases.length === 0) return false;
  if (role === 'lifeguard') return state.staff.counts.lifeguard < bases.length;
  return state.staff.counts[role] < bases.length * 4;
}

export function hire(state, role) {
  if (!canHire(state, role)) return false;
  state.staff.counts[role]++;
  syncUnits(state);
  bus.emit('hud:dirty');
  return true;
}

export function fire(state, role) {
  if (state.staff.counts[role] <= 0) return false;
  state.staff.counts[role]--;
  syncUnits(state);
  bus.emit('hud:dirty');
  return true;
}

export function syncUnits(state) {
  const counts = state.staff.counts;
  // grow/shrink walker units to match hired counts
  for (const role of Object.keys(counts)) {
    const have = state.staff.units.filter(u => u.role === role).length;
    if (have < counts[role]) {
      for (let i = have; i < counts[role]; i++) {
        const base = baseFor(state, role, i);
        state.staff.units.push({
          role, x: base.x + 0.5, y: base.y + 1.5, path: null, pathI: 0,
          task: null, anim: state.rng.range(0, 10),
        });
      }
    } else if (have > counts[role]) {
      const idx = state.staff.units.findIndex(u => u.role === role);
      if (idx >= 0) state.staff.units.splice(idx, 1);
    }
  }
  // link lifeguard towers -> staffed flag
  for (const b of state.bs.buildings) b.staffed = false;
  let lg = counts.lifeguard;
  for (const b of state.bs.buildings) {
    if (b.def.staffBase === 'lifeguard' && lg > 0) { b.staffed = true; lg--; }
  }
  state.noiseLevel = 0; // recomputed below each tick when venues staffed
}

function baseFor(state, role, i) {
  const def = STAFF_BY_ID[role];
  const bases = state.bs.buildings.filter(b => b.id === def.base);
  return bases[i % Math.max(1, bases.length)] || state.map.dock;
}

function assignStaffPath(u, state, tx, ty) {
  const p = findPath(state.map, state.bs.block, u.x, u.y, tx, ty);
  if (!p) return false;
  u.path = p; u.pathI = 0;
  return true;
}

export function updateStaff(state, dt, dtHours) {
  const rng = state.rng;
  const counts = state.staff.counts;

  // -- noise level: disco/stage running with entertainer annoy quiet guests
  state.noiseLevel = state.bs.buildings.filter(b => b.def.noisy && b.open).length;

  // -- fights resolution (security)
  for (const f of state.pendingFights) {
    f.t -= dtHours;
    if (counts.security > 0) {
      // security in range calms it down fast
      const guard = state.staff.units.find(u => u.role === 'security' &&
        Math.hypot(u.x - f.x, u.y - f.y) < 16);
      if (guard) {
        f.t -= dtHours * 3;
        if (f.t <= 0) bus.emit('log:info', { key: 'msg.fightStop' });
      }
    }
  }
  const liveFights = state.pendingFights.filter(f => f.t > -1); // -1 buffer for message
  state.pendingFights = liveFights.filter(f => f.t > 0);
  if (liveFights.length > counts.security ? 0 : 0) { /* fights annoy nearby guests */ }
  if (state.pendingFights.length > 0 && counts.security === 0) {
    for (const g of state.guests) {
      if (Math.hypot(g.x - state.pendingFights[0].x, g.y - state.pendingFights[0].y) < 10) {
        g.mood = clamp(g.mood - dtHours * 2.5, 0, 100);
      }
    }
  }

  // -- lifeguards: stationed at their tower
  for (const u of state.staff.units) {
    if (u.role !== 'lifeguard') continue;
    const tower = nearestBase(state, u, 'baywatch');
    if (tower) { u.x = tower.x + 0.5; u.y = tower.y + 0.3; }
  }

  // -- cleaners: seek nearest litter
  for (const u of state.staff.units) {
    if (u.role !== 'cleaner') continue;
    if (u.task) {
      u.task.t -= dtHours;
      const lit = u.task.litter;
      if (u.task.t <= 0 || !state.litter.includes(lit)) {
        state.litter = state.litter.filter(l => l !== lit);
        u.task = null;
      } else {
        // walk toward the litter
        stepToward(u, state, lit.x, lit.y, dtHours, 14);
        if (Math.hypot(u.x - lit.x, u.y - lit.y) < 0.4) {
          state.litter = state.litter.filter(l => l !== lit);
          u.task = null;
        }
      }
    } else if (state.litter.length) {
      let best = null, bd = Infinity;
      for (const l of state.litter) {
        const d = Math.hypot(u.x - l.x, u.y - l.y);
        if (d < bd) { bd = d; best = l; }
      }
      if (best && bd < 40) {
        if (assignStaffPath(u, state, Math.round(best.x), Math.round(best.y))) {
          u.task = { litter: best, t: 1.5 };
        }
      }
    } else {
      wanderUnit(u, state, dtHours);
    }
  }

  // -- mechanics: repair the most worn closed/nearly-closed building
  for (const u of state.staff.units) {
    if (u.role !== 'mechanic') continue;
    if (u.task) {
      const b = u.task.building;
      if (!state.bs.buildings.includes(b) || b.wear <= 8) { u.task = null; }
      else {
        stepToward(u, state, b.x + b.def.w / 2, b.y + b.def.h, dtHours, 10);
        if (nearBuilding(u, b)) {
          b.wear = Math.max(0, b.wear - dtHours * 55);
          if (b.wear <= 8 && !b.open) {
            b.open = true;
            bus.emit('log:info', { key: 'msg.repaired', target: b });
          }
        }
      }
    } else {
      let best = null, bw = 55;
      for (const b of state.bs.buildings) {
        if (b.wear > bw) { bw = b.wear; best = b; }
      }
      if (best) u.task = { building: best };
      else wanderUnit(u, state, dtHours);
    }
  }

  // -- security: patrol toward active fights, else wander
  for (const u of state.staff.units) {
    if (u.role !== 'security') continue;
    const fight = state.pendingFights[0];
    if (fight) stepToward(u, state, fight.x, fight.y, dtHours, 13);
    else wanderUnit(u, state, dtHours);
  }

  // -- entertainers: wander near their venue, boosting fun of nearby guests
  for (const u of state.staff.units) {
    if (u.role !== 'entertainer') continue;
    const venue = nearestBase(state, u, 'stage') || nearestBase(state, u, 'disco');
    if (venue) {
      if (!u.task || rng.chance(0.02)) {
        const tx = venue.x + rng.int(-2, venue.def.w + 1);
        const ty = venue.y + rng.int(-1, venue.def.h + 2);
        if (isLand(state.map, tx, ty)) assignStaffPath(u, state, tx, ty);
        u.task = { venue };
      }
      walkPath(u, state, dtHours, 9);
      for (const g of state.guests) {
        if (Math.hypot(g.x - u.x, g.y - u.y) < 7) {
          g.needs.fun = clamp(g.needs.fun + dtHours * 4, 0, 100);
          g.mood = clamp(g.mood + dtHours * 0.8, 0, 100);
        }
      }
    } else wanderUnit(u, state, dtHours);
  }

  // dirty island warning
  if (state.litter.length > 25 && rng.chance(dtHours * 0.1)) {
    bus.emit('log:warn', { key: 'msg.dirty' });
  }
}

function nearestBase(state, u, buildingId) {
  let best = null, bd = Infinity;
  for (const b of state.bs.buildings) {
    if (b.id !== buildingId) continue;
    const d = Math.hypot(u.x - (b.x + 0.5), u.y - (b.y + 0.5));
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

function nearBuilding(u, b) {
  const cx = b.x + b.def.w / 2, cy = b.y + b.def.h / 2;
  return Math.hypot(u.x - cx, u.y - cy) < Math.max(b.def.w, b.def.h) + 0.8;
}

// walk along assigned path (or teleport-free straight step if no path)
function stepToward(u, state, tx, ty, dtHours, speed) {
  const step = speed * dtHours;
  const dx = tx - u.x, dy = ty - u.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-4) return;
  // simple greedy: step toward target along axis with larger delta (isometric-ish walk)
  u.x += (dx / dist) * step;
  u.y += (dy / dist) * step;
  u.anim += dtHours * 90;
}

function walkPath(u, state, dtHours, speed) {
  if (!u.path || u.pathI >= u.path.length) return;
  const node = u.path[u.pathI];
  const step = speed * dtHours;
  const dx = node.x - u.x, dy = node.y - u.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= step || dist < 1e-4) { u.x = node.x; u.y = node.y; u.pathI++; }
  else { u.x += (dx / dist) * step; u.y += (dy / dist) * step; }
  u.anim += dtHours * 90;
}

function wanderUnit(u, state, dtHours) {
  if (!u.path || u.pathI >= u.path.length) {
    if (state.rng.chance(0.06)) {
      const tx = Math.round(clamp(u.x + state.rng.range(-9, 9), 1, state.map.size - 2));
      const ty = Math.round(clamp(u.y + state.rng.range(-9, 9), 1, state.map.size - 2));
      if (isLand(state.map, tx, ty)) assignStaffPath(u, state, tx, ty);
    }
  }
  walkPath(u, state, dtHours, 7);
}

export { lifeguardCovered };
