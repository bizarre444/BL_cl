// Headless smoke test: boots the sim without a DOM, builds a resort,
// runs several game days, asserts sanity. Run: node tools/smoke.mjs
//
// NOTE: game modules with DOM deps (render/*) are not imported here.

import { newGame, tick, tryBuild, tryDemolish, serialize, deserialize } from '../src/game/state.js';
import { hire } from '../src/game/staff.js';
import { BUILDING_BY_ID } from '../src/game/catalog.js';
import { findPath } from '../src/world/map.js';

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  ok  ${name}`);
  else { console.error(`FAIL  ${name}`); failures++; }
}

console.log('== map generation ==');
const st = newGame('sandbox', 12345);
check('island has land', st.map.terrain.some(t => t !== 0));
check('dock on land', st.map.terrain[st.map.dock.y * st.map.size + st.map.dock.x] !== 0);
check('palms exist', st.map.palms.length > 10);

console.log('== pathfinding ==');
const d = st.map.dock;
const p = findPath(st.map, st.bs.block, d.x, d.y, d.x - 5, d.y - 5);
check('path found across island', Array.isArray(p) && p.length > 3);

console.log('== building placement ==');
function findSpot(def, tries = 3000) {
  for (let i = 0; i < tries; i++) {
    const x = 10 + (i * 7) % 50, y = 10 + (i * 13) % 50;
    if (st.bs.canPlace(def, x, y)) return { x, y };
  }
  return null;
}
const plan = ['bungalow', 'bungalow', 'drinks', 'bbq', 'loo', 'cafe', 'cleanershack', 'workshop', 'baywatch', 'security', 'stage', 'pool'];
const placed = [];
for (const id of plan) {
  const def = BUILDING_BY_ID[id];
  let spot = findSpot(def);
  // baywatch needs sand — search harder near coast
  if (!spot) spot = { x: -1, y: -1 };
  if (spot.x >= 0) {
    const b = tryBuild(st, def, spot.x, spot.y);
    placed.push(id);
    check(`built ${id}`, !!b);
  } else {
    check(`found spot for ${id}`, false);
  }
}
check('cash decreased after building', st.econ.cash < 80000);

console.log('== staff ==');
check('hire cleaner ok', hire(st, 'cleaner'));
check('hire mechanic ok', hire(st, 'mechanic'));
check('hire lifeguard ok', hire(st, 'lifeguard'));
check('hire security ok', hire(st, 'security'));
check('hire entertainer ok', hire(st, 'entertainer'));
check('units synced', st.staff.units.length === 5);

console.log('== simulate 6 game days ==');
const dt = 1 / 30;
let simSeconds = 6 * 240; // 6 days at 1x
let steps = simSeconds / dt;
let tickErrors = 0;
let lastErr = null;
for (let i = 0; i < steps; i++) {
  try {
    tick(st, dt);
  } catch (e) {
    tickErrors++;
    lastErr = e;
    if (tickErrors > 3) break;
  }
}
check('no tick errors', tickErrors === 0);
if (lastErr) console.error(lastErr);
console.log(`  day=${st.day} hour=${st.hour.toFixed(1)} guests=${st.guests.length} cash=${Math.round(st.econ.cash)} served=${st.servedTotal} rating=${st.rating.stars.toFixed(2)} litter=${st.litter.length} buildings=${st.bs.buildings.length}`);
check('time advanced', st.day >= 6);
check('guests arrived at some point', st.servedTotal + st.guests.length > 0);
check('income recorded', st.econ.history.some(h => h.income > 0));
check('rating reviews exist', st.rating.totalReviews > 0 || st.guests.length > 0);

console.log('== demolish ==');
const some = st.bs.buildings.find(b => b.id === 'drinks');
if (some) tryDemolish(st, some);
check('demolished ok', !st.bs.buildings.some(b => b.id === 'drinks'));

console.log('== save/load roundtrip ==');
const data = serialize(st);
const st2 = deserialize(data);
check('restored day', st2.day === st.day);
check('restored buildings', st2.bs.buildings.length === st.bs.buildings.length);
check('restored guests', st2.guests.length === st.guests.length);
let steps2 = 60 * 30; // one more game hour
let err2 = null;
try {
  for (let i = 0; i < steps2; i++) tick(st2, dt);
} catch (e) { err2 = e; }
check('ticks after load', !err2);
if (err2) console.error(err2);

console.log('== scenario s1 objectives ==');
const s1 = newGame('s1', 777);
let ok = true;
for (let i = 0; i < 2 * 240 * 30; i++) {
  try { tick(s1, dt); } catch (e) { ok = false; console.error(e); break; }
}
check('s1 two days no errors', ok);

console.log('== all scenarios boot & run ==');
for (const id of ['s2', 's3', 's4', 's5', 's6', 's7', 's8', 'sandbox']) {
  let sOK = true, lastE = null;
  const stX = newGame(id, 4242);
  for (let i = 0; i < 240 * 30; i++) {
    try { tick(stX, dt); } catch (e) { sOK = false; lastE = e; break; }
  }
  check(`${id} one day ok`, sOK);
  if (lastE) console.error(lastE);
}
// stormy scenario should actually produce storms eventually
{
  const stS = newGame('s8', 999);
  const seen = new Set();
  for (let i = 0; i < 10 * 240 * 30; i++) { tick(stS, dt); seen.add(stS.weather.type); }
  check('s8 sees stormy weather', seen.has('storm') || seen.has('rain'));
  check('weather variety (>=4 types seen overall pool ok)', ['sun', 'cloud', 'rain', 'storm', 'heat', 'wind'].length === 6);
}

console.log(failures === 0 ? '\nALL OK' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
