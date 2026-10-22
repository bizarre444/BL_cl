// Guest simulation: needs, archetypes, decision-making, walking, spending, reviews.
// FSM: ferry -> dockWait -> (room | leave) -> idle -> walk -> use/room/swim -> ... -> leave.

import { ARCH_BY_ID, FIRST_NAMES, LAST_NAMES } from './catalog.js';
import { findPath, isLand } from '../world/map.js';
import { clamp } from '../core/rng.js';
import { bus } from '../core/bus.js';
import * as Weather from './weather.js';

const NEED_KEYS = ['energy', 'hunger', 'thirst', 'bladder', 'hygiene', 'fun'];
const DECAY = { energy: 3.2, hunger: 4.0, thirst: 5.2, bladder: 4.5, hygiene: 2.4, fun: 3.6 };
const WALK_TILES_PER_HOUR = 26; // base, scaled by archetype walkSpeed

let guestSeq = 1;

export function spawnGuest(rng, archId, tier) {
  const arch = ARCH_BY_ID[archId];
  return {
    uid: guestSeq++,
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    archId,
    color: arch.color,
    money: Math.round(rng.range(140, 320) * (1 + tier * 0.35) * arch.spendMul),
    mood: 72, moodAvg: 72,
    needs: {
      energy: rng.range(60, 95), hunger: rng.range(50, 90), thirst: rng.range(45, 85),
      bladder: rng.range(60, 95), hygiene: rng.range(60, 95), fun: rng.range(35, 70),
    },
    state: 'ferry',
    x: 0, y: 0,
    path: null, pathI: 0,
    target: null,
    useTimer: 0, useVenue: null,
    room: null, roomB: null,
    stayLeft: rng.int(arch.stayDays[0], arch.stayDays[1]),
    drunk: 0,
    waitingSince: 0,
    thought: null,
    anim: rng.range(0, 10),
    spent: 0,
  };
}

function needsDecay(g, dtHours, sleeping, swimming, weatherType) {
  for (const k of NEED_KEYS) {
    let d = DECAY[k];
    if (k === 'thirst') d *= Weather.thirstMul({ type: weatherType || 'sun' });
    if (sleeping) d = k === 'energy' ? -26 : d * 0.25;
    if (swimming && k === 'hygiene') d = -30;
    g.needs[k] = clamp(g.needs[k] - d * dtHours, 0, 100);
  }
}

function worstNeed(g) {
  let wk = null, wv = 101;
  for (const k of NEED_KEYS) if (g.needs[k] < wv) { wv = g.needs[k]; wk = k; }
  return { key: wk, value: wv };
}

function thoughtFor(g) {
  const n = g.needs;
  if (g.mood < 25) return 'th.angry';
  if (g.mood > 88) return 'th.happy';
  if (n.bladder < 15) return 'th.toilet';
  if (n.hunger < 18) return 'th.hungry';
  if (n.thirst < 18) return 'th.thirsty';
  if (n.fun < 18) return 'th.bored';
  if (n.energy < 18) return 'th.tired';
  return null;
}

// ---- Decision ----

function chooseVenue(g, state) {
  const arch = ARCH_BY_ID[g.archId];
  const { key } = worstNeed(g);
  const hour = state.hour;
  const isNight = hour >= 21 || hour < 6;
  let best = null, bestScore = -1;

  for (const b of state.bs.buildings) {
    const def = b.def;
    if (!def.needs || !b.open) continue;
    if (state.bs.freeSlots(b) <= 0) continue;
    if (isNight && !def.night && def.cat !== 'need') continue;
    const relief = def.needs[key] || 0;
    if (relief <= 0) continue;

    let score = relief * 1.2;
    for (const nk of NEED_KEYS) {
      const v = def.needs[nk] || 0;
      if (v > 0 && g.needs[nk] < 45) score += v * 0.35;
    }
    score *= (arch.weights[def.id] ?? 1);
    if (def.cat === 'fun' || def.cat === 'food') score *= Weather.outdoorFunMul(state.weather);
    const price = def.price * arch.spendMul;
    if (price > g.money * 0.5) score *= 0.25;
    if (def.price === 0) score *= 1.15;
    if (def.night && !isNight) score *= 0.55; // disco by day is sad
    const dist = Math.abs(g.x - (b.x + def.w / 2)) + Math.abs(g.y - (b.y + def.h / 2));
    score *= clamp(1 - dist / 60, 0.25, 1);
    if (score > bestScore) { bestScore = score; best = b; }
  }
  return best;
}

function assignPath(g, state, tx, ty) {
  const p = findPath(state.map, state.bs.block, g.x, g.y, tx, ty);
  if (!p) return false;
  g.path = p; g.pathI = 0;
  return true;
}

function venueTile(b) {
  return { x: b.x + Math.floor(b.def.w / 2), y: b.y + b.def.h };
}

// ---- Main update ----

export function updateGuests(state, dt, dtHours) {
  const rng = state.rng;
  const wtype = state.weather.type;
  const beachOpen = Weather.beachOpen(state.weather, state.hazard);

  for (const g of state.guests) {
    if (g.state === 'gone') continue;
    const a = ARCH_BY_ID[g.archId];
    if (g.drunk > 0) g.drunk = Math.max(0, g.drunk - dtHours * 0.5);

    switch (g.state) {
      case 'ferry': break; // placed by arriveGuests()

      case 'dockWait': {
        needsDecay(g, dtHours, false, false, wtype);
        g.mood = clamp(g.mood - dtHours * 1.2, 0, 100);
        const room = findRoom(state, a);
        if (room) {
          g.room = room.uid; g.roomB = room;
          room.occupancy = (room.occupancy || 0) + 1;
          const fee = Math.min(Math.round(room.def.roomFee * (0.9 + rng() * 0.2)), g.money);
          g.money -= fee; g.spent += fee;
          state.economyEarn(fee);
          bus.emit('sfx:cash');
          g.state = 'idle';
        } else if (state.hour - g.waitingSince > 3.5) {
          leaveAngry(state, g);
        }
        break;
      }

      case 'idle': decide(state, g, a, dtHours); break;
      case 'walk': walkStep(state, g, a, dtHours); break;
      case 'use': useTick(state, g, a, dtHours); break;

      case 'room': {
        needsDecay(g, dtHours, true, false, wtype);
        g.mood = clamp(g.mood + dtHours * 2.2, 0, 100);
        if (state.hour >= 7 && state.hour < 21 && g.needs.energy > 78) g.state = 'idle';
        break;
      }

      case 'swim': {
        needsDecay(g, dtHours, false, true, wtype);
        g.needs.fun = clamp(g.needs.fun + dtHours * 7, 0, 100);
        g.mood = clamp(g.mood + dtHours * (state.weather.type === 'sun' ? 1.4 : 0.2), 0, 100);
        const risk = Weather.swimRisk(state.weather) * (g.drunk > 0 ? 2.2 : 1) * (a.id === 'family' ? 1.3 : 1);
        if (rng.chance(dtHours * 0.010 * risk)) {
          const tower = lifeguardCovered(state, g.x, g.y);
          if (tower) {
            bus.emit('log:info', { key: 'msg.rescued' });
            g.needs.energy = clamp(g.needs.energy - 30, 0, 100);
            g.x = tower.x + 0.5; g.y = tower.y + 0.5;
          } else {
            state.drownings++;
            for (const o of state.guests) o.mood = clamp(o.mood - 18, 0, 100);
            bus.emit('log:warn', { key: 'msg.drowned' });
            g.state = 'gone';
          }
        }
        if (!beachOpen || g.needs.fun > 88 || g.needs.energy < 30) g.state = 'idle';
        break;
      }

      case 'leave': walkStep(state, g, a, dtHours); break;
    }

    if (g.state !== 'room' && g.state !== 'gone') {
      let dm = 0.15;
      const w = state.weather.type;
      if (w === 'storm') dm -= 1.6;
      else if (w === 'rain') dm -= 0.7;
      else if (w === 'wind') dm -= 0.4;
      else if (w === 'heat' && state.hour > 11 && state.hour < 16) dm -= 0.5;
      if (worstNeed(g).value < 12) dm -= 0.9;
      if (state.litter.length > 12) dm -= 0.4;
      if (a.hatesNoise && state.noiseLevel > 0) dm -= 0.5;
      if (g.drunk > 0) dm += 0.6;
      g.mood = clamp(g.mood + dm * dtHours, 0, 100);
    }
    g.moodAvg = g.moodAvg * 0.996 + g.mood * 0.004;
    g.thought = thoughtFor(g);
  }

  const before = state.guests.length;
  state.guests = state.guests.filter(g => g.state !== 'gone');
  if (state.guests.length > state.peakGuests) state.peakGuests = state.guests.length;
  if (before !== state.guests.length) bus.emit('hud:dirty');
}

// Find accommodation: prefer quality matching archetype wealth; any free bed otherwise.
function findRoom(state, a) {
  const want = a.id === 'party' ? 3 : a.id === 'quiet' ? 4 : 3;
  const hotels = state.bs.buildings.filter(b => b.def.beds > (b.occupancy || 0));
  if (!hotels.length) return null;
  hotels.sort((x, y) => Math.abs(x.def.quality - want) - Math.abs(y.def.quality - want));
  return hotels[0];
}

function decide(state, g, a, dtHours) {
  const wtype = state.weather.type;
  needsDecay(g, dtHours, false, false, wtype);
  const hour = state.hour;

  if (hour >= 22 || hour < 6.5) {
    if (g.roomB && g.needs.energy < 82) { startWalkTo(state, g, g.roomB, 'room'); return; }
  }
  if (g.stayLeft <= 0 || (g.money < 4 && g.needs.fun < 20)) { startDeparture(state, g); return; }

  const venue = chooseVenue(g, state);
  if (venue) {
    venue.reserved++;
    g.useVenue = venue;
    startWalkTo(state, g, venue, 'use');
    return;
  }

  // free fun: swim
  if (Weather.beachOpen(state.weather, state.hazard)) {
    const wantSwim = a.id === 'sun' ? 0.010 : a.id === 'sport' ? 0.008 : 0.003;
    if (state.rng.chance(wantSwim * dtHours * 60)) {
      const spot = findSwimSpot(state, g);
      if (spot && assignPath(g, state, spot.tx, spot.ty)) {
        g.state = 'walk';
        g.target = { kind: 'swim' };
        return;
      }
    }
  }
  // wander
  for (let tries = 0; tries < 4; tries++) {
    const tx = Math.round(clamp(g.x + state.rng.range(-8, 8), 1, state.map.size - 2));
    const ty = Math.round(clamp(g.y + state.rng.range(-8, 8), 1, state.map.size - 2));
    if (isLand(state.map, tx, ty) && assignPath(g, state, tx, ty)) {
      g.state = 'walk';
      g.target = { kind: 'wander' };
      return;
    }
  }
  g.mood = clamp(g.mood - dtHours * 1.5, 0, 100);
}

function startWalkTo(state, g, building, after) {
  const t = venueTile(building);
  if (!assignPath(g, state, t.x, t.y)) {
    if (after === 'use' && g.useVenue) { g.useVenue.reserved--; g.useVenue = null; }
    g.mood = clamp(g.mood - 3, 0, 100);
    g.state = 'idle';
    return;
  }
  g.state = 'walk';
  g.target = { kind: after === 'use' ? 'venue' : after, uid: building.uid };
}

function walkStep(state, g, a, dtHours) {
  const wtype = state.weather.type;
  needsDecay(g, dtHours, false, false, wtype);
  const stepLen = WALK_TILES_PER_HOUR * a.walkSpeed * dtHours;

  if (!g.path || g.pathI >= g.path.length) {
    const kind = g.target?.kind;
    if (kind === 'venue') {
      const b = state.bs.byId(g.target.uid);
      if (!b || !b.open) {
        if (g.useVenue) { g.useVenue.reserved--; g.useVenue = null; }
        g.state = 'idle';
        return;
      }
      if (state.bs.freeSlots(b) <= 0) {
        g.state = 'use';           // queue at the door
        g.useTimer = -0.2;
        return;
      }
      enterVenue(state, g, a, b);
      return;
    }
    if (kind === 'room') {
      if (!state.bs.byId(g.target.uid)) { g.room = null; g.roomB = null; g.state = 'idle'; return; }
      g.state = 'room';
      return;
    }
    if (kind === 'swim') {
      if (Weather.beachOpen(state.weather, state.hazard)) g.state = 'swim';
      else g.state = 'idle';
      return;
    }
    if (kind === 'dock') { finishDeparture(state, g); return; }
    g.state = 'idle';
    return;
  }

  const node = g.path[g.pathI];
  const dx = node.x - g.x, dy = node.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= stepLen || dist < 1e-4) {
    g.x = node.x; g.y = node.y;
    g.pathI++;
  } else {
    g.x += (dx / dist) * stepLen;
    g.y += (dy / dist) * stepLen;
  }
  g.anim += dtHours * 90;
}

function enterVenue(state, g, a, b) {
  b.users++; b.totalUses++;
  b.wear += b.def.wearPerUse || 0;
  g.state = 'use';
  g.useTimer = (b.def.useMin / 60) * (0.8 + state.rng() * 0.5);
  const price = Math.round(b.def.price * a.spendMul);
  if (price > 0) {
    const paid = Math.min(price, g.money);
    g.money -= paid; g.spent += paid;
    state.economyEarn(paid);
    bus.emit('sfx:cash');
  }
  if ((b.def.litter || 0) > 0 && state.rng.chance(Math.min(0.85, 0.35 + b.def.litter * 0.15))) dropLitter(state, g);
  if (b.def.drink && state.rng.chance(a.dragged ?? a.drinky ?? 0)) {
    g.drunk = Math.min(3, g.drunk + 1);
    if (state.rng.chance(a.rowdy)) {
      state.pendingFights.push({ x: g.x, y: g.y, guest: g.uid, t: 2 });
      bus.emit('log:warn', { key: 'msg.fight' });
    }
  }
}

function useTick(state, g, a, dtHours) {
  const wtype = state.weather.type;
  needsDecay(g, dtHours, false, false, wtype);
  const b = g.useVenue;
  if (!b) { g.state = 'idle'; return; }

  if (g.useTimer < 0) { // queueing at the door
    g.useTimer += dtHours;
    g.mood = clamp(g.mood - dtHours * 1.4, 0, 100);
    if (g.useTimer > 0 && state.bs.freeSlots(b) > 0) {
      enterVenue(state, g, a, b);
    } else if (g.useTimer > 0.8) { // gave up
      b.reserved = Math.max(0, b.reserved - 1);
      g.useVenue = null;
      g.state = 'idle';
    }
    return;
  }

  g.useTimer -= dtHours;
  const eff = state.bs.efficiency(b);
  for (const [k, v] of Object.entries(b.def.needs)) {
    if (v > 0) {
      // a full visit delivers v*eff points: rate = v / visitHours
      const rate = (v * 60) / Math.max(1, b.def.useMin);
      g.needs[k] = clamp(g.needs[k] + rate * eff * dtHours, 0, 100);
    } else {
      g.needs[k] = clamp(g.needs[k] + v * dtHours, 0, 100); // negatives drain (e.g. sport energy)
    }
  }
  g.mood = clamp(g.mood + dtHours * (0.5 + b.def.quality * 0.35), 0, 100);

  if (g.useTimer <= 0) {
    b.users = Math.max(0, b.users - 1);
    b.reserved = Math.max(0, b.reserved - 1);
    g.useVenue = null;
    g.state = 'idle';
  }
}

function dropLitter(state, g) {
  if (state.litter.length > 250) return;
  state.litter.push({ x: g.x + state.rng.range(-0.8, 0.8), y: g.y + state.rng.range(-0.8, 0.8) });
}

function findSwimSpot(state, g) {
  const { map } = state;
  for (let tries = 0; tries < 30; tries++) {
    const tx = Math.round(clamp(g.x + state.rng.range(-14, 14), 1, map.size - 2));
    const ty = Math.round(clamp(g.y + state.rng.range(-14, 14), 1, map.size - 2));
    if (!isLand(map, tx, ty)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!isLand(map, tx + dx, ty + dy)) return { tx, ty };
    }
  }
  return null;
}

export function lifeguardCovered(state, x, y) {
  for (const t of state.bs.buildings) {
    if (t.def.staffBase !== 'lifeguard' || !t.staffed) continue;
    if (Math.hypot(x - (t.x + 0.5), y - (t.y + 0.5)) <= 14) return t;
  }
  return null;
}

function startDeparture(state, g) {
  if (g.useVenue) { g.useVenue.reserved--; g.useVenue = null; }
  const dock = state.map.dock;
  if (assignPath(g, state, dock.x, dock.y + 1)) {
    g.state = 'leave';
    g.target = { kind: 'dock' };
  } else {
    finishDeparture(state, g);
  }
}

function finishDeparture(state, g) {
  if (g.roomB) g.roomB.occupancy = Math.max(0, (g.roomB.occupancy || 0) - 1);
  const stars = clamp(Math.round(g.moodAvg / 18) + (g.drunk > 1 ? 1 : 0), 1, 5);
  state.ratingAdd(stars);
  state.servedTotal++;
  bus.emit('log:info', { key: 'msg.leave', name: g.name, stars });
  g.state = 'gone';
}

function leaveAngry(state, g) {
  if (g.roomB) g.roomB.occupancy = Math.max(0, (g.roomB.occupancy || 0) - 1);
  state.ratingAdd(1);
  bus.emit('log:warn', { key: 'msg.noRoom', name: g.name });
  g.state = 'gone';
}

export function arriveGuests(state, guests) {
  const dock = state.map.dock;
  for (const g of guests) {
    g.x = dock.x;
    g.y = dock.y;
    g.state = 'dockWait';
    g.waitingSince = state.hour;
  }
  state.guests.push(...guests);
  bus.emit('log:info', { key: 'msg.arrivals', n: guests.length });
  bus.emit('hud:dirty');
}
