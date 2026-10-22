// Building placement, occupancy grid, wear & tear, service buildings.

import { BUILDING_BY_ID } from './catalog.js';
import { isBuildableTerrain, touchesWater, onSandOnly, WATER } from '../world/map.js';
import { bus } from '../core/bus.js';

let nextId = 1;

export function makeBuildingSystem(map) {
  const n = map.size;
  const block = new Int32Array(n * n); // 0 = free walkable, buildingId otherwise
  const buildings = [];

  function canPlace(def, x, y) {
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const tx = x + dx, ty = y + dy;
        if (!isBuildableTerrain(map, tx, ty)) return false;
        if (block[(ty | 0) * n + (tx | 0)] !== 0) return false;
      }
    }
    if (def.waterfront && !touchesWater(map, x, y, def.w, def.h)) return false;
    if (def.beachOnly && !onSandOnly(map, x, y, def.w, def.h)) return false;
    return true;
  }

  function place(def, x, y) {
    const b = {
      uid: nextId++,
      id: def.id,
      def,
      x, y,
      wear: 0,
      open: true,
      users: 0,          // guests currently using
      totalUses: 0,
      reserved: 0,       // reserved slots (walking there)
    };
    for (let dy = 0; dy < def.h; dy++)
      for (let dx = 0; dx < def.w; dx++)
        block[(y + dy) * n + (x + dx)] = b.uid;
    buildings.push(b);
    bus.emit('building:placed', b);
    return b;
  }

  function remove(b) {
    const idx = buildings.indexOf(b);
    if (idx >= 0) buildings.splice(idx, 1);
    for (let dy = 0; dy < b.def.h; dy++)
      for (let dx = 0; dx < b.def.w; dx++)
        block[(b.y + dy) * n + (b.x + dx)] = 0;
    bus.emit('building:removed', b);
  }

  function byId(uid) { return buildings.find(b => b.uid === uid); }

  function hasBase(buildingId) {
    return buildings.some(b => b.id === buildingId);
  }

  // All open service buildings matching a need key, with free slots.
  function openVenues(needKey) {
    return buildings.filter(b => b.def.needs && b.def.needs[needKey] > 0 && b.open);
  }

  function freeSlots(b) {
    return (b.def.cap ?? 0) - b.users - b.reserved;
  }

  // wear grows with use and storms; buildings close at wear >= 100 until repaired.
  function update(dtHours, weather, rng) {
    for (const b of buildings) {
      if (weather.type === 'storm' && rng.chance(dtHours * 0.15)) b.wear += rng.range(2, 6);
      if (b.open && b.wear >= 100) {
        b.open = false;
        bus.emit('log:warn', { key: 'msg.wearClosed', target: b });
      }
    }
  }

  function efficiency(b) {
    if (!b.open) return 0;
    return Math.max(0.35, 1 - b.wear / 140);
  }

  return { block, buildings, canPlace, place, remove, byId, hasBase, openVenues, freeSlots, update, efficiency };
}

export function bedCapacity(bs) {
  return bs.buildings.reduce((s, b) => s + (b.def.beds || 0), 0);
}

export function occupiedBeds(state) {
  return state.guests.filter(g => g.room).length;
}

export function demolishRefund(b) {
  return Math.round(b.def.cost * 0.5);
}
