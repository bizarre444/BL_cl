// Central game state: creation, ticking, daily settlement, arrivals, win/lose.

import { generateIsland, serializeMap } from '../world/map.js';
import { makeBuildingSystem, bedCapacity } from './buildings.js';
import { makeStaffSystem, updateStaff, syncUnits } from './staff.js';
import { makeEconomy, pay as econPay } from './economy.js';
import { makeWeather, updateWeather } from './weather.js';
import { makeRating, addReview } from './rating.js';
import { spawnGuest, updateGuests, arriveGuests } from './guests.js';
import { ARCHETYPES, STAFF, BUILDING_BY_ID } from './catalog.js';
import { scenarioById, evalObjectives } from './scenarios.js';
import { makeRng } from '../core/rng.js';
import { bus } from '../core/bus.js';

const DAY_REAL_SECONDS = 240; // one game day at 1x speed
const HOURS_PER_SECOND = 24 / DAY_REAL_SECONDS;

export function newGame(scenarioId, seed = Date.now() % 100000) {
  const scen = scenarioById(scenarioId);
  const map = generateIsland(seed, 72);
  const bs = makeBuildingSystem(map);

  const state = {
    version: 1,
    scenarioId,
    scen,
    seed,
    map,
    bs,
    staff: makeStaffSystem(),
    econ: makeEconomy(scen.cash),
    weather: makeWeather(),
    hazard: { shark: false, sharkT: 0, jellyT: 0 },
    rating: makeRating(),
    guests: [],
    litter: [],
    pendingFights: [],
    noiseLevel: 0,
    servedTotal: 0,
    peakGuests: 0,
    drownings: 0,
    day: 1,
    hour: 7.5,
    speed: 1,
    paused: false,
    over: false, overWon: false,
    rng: makeRng(seed ^ 0x9e3779b9),
    arrivalsScheduled: true,
  };

  state.economyEarn = (amt) => {
    state.econ.cash += amt;
    state.econ.today.income += amt;
  };
  state.ratingAdd = (stars) => addReview(state.rating, stars);

  bus.emit('log:info', { key: 'msg.newDay', day: 1 });
  return state;
}

export function tick(state, dt) {
  if (state.over || state.paused) return;
  const dtHours = dt * HOURS_PER_SECOND * state.speed;
  const rng = state.rng;

  // time
  const prevHour = state.hour;
  state.hour += dtHours;
  let dayRolled = false;
  while (state.hour >= 24) {
    state.hour -= 24;
    state.day++;
    dayRolled = true;
  }

  updateWeather(state.weather, rng, dtHours, bus, state.hazard);
  state.bs.update(dtHours, state.weather, rng);
  updateGuests(state, dt, dtHours);
  updateStaff(state, dt, dtHours);
  scheduleArrivals(state, prevHour, state.hour, rng);

  if (dayRolled) closeDay(state);

  // bankruptcy
  if (!state.scen.sandbox && state.econ.cash < -8000 && !state.over) {
    endGame(state, false, 'obj.lostCash');
  }
  bus.emit('hud:tick');
}

// ---- Ferry arrivals: two windows per day (9-11, 15-17) ----
function scheduleArrivals(state, prevHour, hour, rng) {
  const windows = [[9, 11], [15, 17]];
  for (const [a, b] of windows) {
    // trigger once when crossing the window start
    if (prevHour < a && hour >= a) {
      const beds = bedCapacity(state.bs);
      const occupied = state.guests.length;
      const stars = state.rating.stars;
      if (beds <= occupied) continue;
      // demand: rating drives the fill fraction; a floor keeps the resort alive at start
      const factor = Math.min(1, 0.35 + stars * 0.15);
      let want = Math.min(
        beds - occupied,
        Math.max(1, Math.round((beds * 0.25 + 2) * factor * rng.range(0.7, 1.2)))
      );
      if (want <= 0) continue;
      // fresh reviews only matter with something built
      const guests = [];
      for (let i = 0; i < want; i++) {
        const arch = rng.pick(ARCHETYPES);
        guests.push(spawnGuest(rng, arch.id, Math.min(4, Math.floor(stars))));
      }
      arriveGuests(state, guests);
      state.ferry = { x: state.map.size + 6, y: state.map.dock.y - 1, t: 0, arriving: true };
    }
  }
}

function closeDay(state) {
  // upkeep
  let upkeep = 0;
  for (const b of state.bs.buildings) upkeep += b.def.upkeep || 0;
  if (upkeep) econPay(state.econ, upkeep, 'upkeep');
  // wages
  let wages = 0;
  for (const s of STAFF) wages += state.staff.counts[s.id] * s.wage;
  if (wages) econPay(state.econ, wages, 'wages');

  const entry = closeLedger(state, state.day - 1);
  for (const g of state.guests) g.stayLeft--;
  bus.emit('log:info', { key: 'msg.newDay', day: state.day });
  bus.emit('day:closed', entry);
  bus.emit('hud:dirty');

  // scenario deadline / objectives
  if (!state.scen.sandbox && !state.over) {
    const done = evalObjectives(state.scen, state);
    const allDone = done.every(d => d.done);
    if (allDone) {
      endGame(state, true, 'obj.won');
    } else if (state.day > state.scen.days) {
      endGame(state, false, 'obj.lostTime');
    }
  }
}

function closeLedger(econState, day) {
  const t = econState.econ.today;
  const entry = {
    day,
    income: Math.round(t.income),
    upkeep: Math.round(t.upkeep),
    wages: Math.round(t.wages),
    other: Math.round(t.other),
    net: Math.round(t.income - t.upkeep - t.wages - t.other),
  };
  econState.econ.history.push(entry);
  if (econState.econ.history.length > 21) econState.econ.history.shift();
  econState.econ.today = { income: 0, upkeep: 0, wages: 0, other: 0 };
  return entry;
}

function endGame(state, won, key) {
  state.over = true;
  state.overWon = won;
  bus.emit('game:over', { won, key });
  bus.emit('log:warn', { key });
}

// ---- Player actions ----

export function tryBuild(state, def, x, y) {
  if (state.econ.cash < def.cost) { bus.emit('toast', { key: 'build.noMoney', bad: true }); return null; }
  if (!state.bs.canPlace(def, x, y)) { bus.emit('toast', { key: 'build.blocked', bad: true }); return null; }
  const b = state.bs.place(def, x, y);
  state.econ.cash -= def.cost;
  state.econ.today.other += def.cost;
  syncUnits(state);
  bus.emit('toast', { key: 'build.built', name: def });
  bus.emit('hud:dirty');
  return b;
}

export function tryDemolish(state, building) {
  // guests using it are kicked out
  for (const g of state.guests) {
    if (g.useVenue === building) { g.useVenue = null; g.state = 'idle'; g.mood = Math.max(0, g.mood - 8); }
    if (g.room === building.uid) { g.room = null; g.roomB = null; }
  }
  if (building.occupancy) building.occupancy = 0;
  state.bs.remove(building);
  const refund = Math.round(building.def.cost * 0.5);
  state.econ.cash += refund;
  state.econ.today.other -= refund;
  syncUnits(state);
  bus.emit('hud:dirty');
}

export function setSpeed(state, s) {
  state.speed = s;
  state.paused = s === 0;
  bus.emit('hud:dirty');
}

// ---- Serialization ----

export function serialize(state) {
  return {
    version: 1,
    scenarioId: state.scenarioId,
    seed: state.seed,
    day: state.day,
    hour: state.hour,
    econ: state.econ,
    weather: { type: state.weather.type, hoursLeft: state.weather.hoursLeft },
    hazard: state.hazard,
    rating: state.rating,
    servedTotal: state.servedTotal,
    peakGuests: state.peakGuests,
    drownings: state.drownings,
    buildings: state.bs.buildings.map(b => ({
      id: b.id, x: b.x, y: b.y, wear: b.wear, open: b.open,
      occupancy: b.occupancy || 0, totalUses: b.totalUses,
    })),
    staffCounts: state.staff.counts,
    guests: state.guests.map(g => ({
      name: g.name, archId: g.archId, money: g.money, mood: g.mood, moodAvg: g.moodAvg,
      needs: g.needs, state: g.state === 'ferry' ? 'dockWait' : g.state,
      x: g.x, y: g.y, stayLeft: g.stayLeft, drunk: g.drunk, spent: g.spent,
      room: g.room, waitingSince: g.waitingSince,
    })),
    litter: state.litter,
    rngState: state.rng(),
    over: state.over,
  };
}

export function deserialize(data) {
  const state = newGame(data.scenarioId, data.seed);
  state.day = data.day;
  state.hour = data.hour;
  state.econ = data.econ;
  state.weather = { type: data.weather.type, hoursLeft: data.weather.hoursLeft };
  state.hazard = data.hazard;
  state.rating = data.rating;
  state.servedTotal = data.servedTotal || 0;
  state.peakGuests = data.peakGuests || 0;
  state.drownings = data.drownings || 0;
  state.over = !!data.over;

  for (const bd of data.buildings || []) {
    const def = BUILDING_BY_ID[bd.id];
    if (!def) continue;
    const b = state.bs.place(def, bd.x, bd.y);
    b.wear = bd.wear; b.open = bd.open; b.occupancy = bd.occupancy; b.totalUses = bd.totalUses || 0;
  }
  for (const [role, n] of Object.entries(data.staffCounts || {})) {
    state.staff.counts[role] = n;
  }
  syncUnits(state);
  for (const gd of data.guests || []) {
    const g = spawnGuest(state.rng, gd.archId, 0);
    Object.assign(g, gd);
    if (g.room) g.roomB = state.bs.byId(g.room) || null;
    state.guests.push(g);
  }
  state.litter = data.litter || [];
  return state;
}

