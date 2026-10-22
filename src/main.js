// Entry point: menu, camera input, game loop, save/load, screenshot.

import { makeCamera } from './world/camera.js';
import { makeLoop } from './core/loop.js';
import { makeRenderer } from './render/renderer.js';
import { makeUI } from './render/ui.js';
import { newGame, tick, tryBuild, tryDemolish, serialize, deserialize, setSpeed } from './game/state.js';
import { hire, fire } from './game/staff.js';
import { SCENARIOS } from './game/scenarios.js';
import { BUILDING_BY_ID } from './game/catalog.js';
import { saveGame, loadGame, hasSave } from './core/save.js';
import { bus } from './core/bus.js';
import { setLang, getLang, L, t as i18nT } from './core/i18n.js';
import { initAudio } from './core/audio.js';
import { tileAt, WATER } from './world/map.js';

const $ = (id) => document.getElementById(id);

const canvas = $('game-canvas');
const minimapCanvas = $('minimap');
let state = null;
let camApi = null;
let renderer = null;
let ui = null;
let loop = null;

// ---------------- Menu ----------------
function buildMenu() {
  const wrap = $('menu-scenarios');
  wrap.innerHTML = '';
  for (const s of SCENARIOS) {
    const card = document.createElement('button');
    card.className = 'scenario-card' + (s.sandbox ? ' sandbox' : '');
    card.innerHTML = `
      <div class="diff">${s.sandbox ? '∞' : '★'.repeat(s.diff)}</div>
      <h3>${s.sandbox ? L({ ru: 'Песочница', en: 'Sandbox' }) : L(s.name)}</h3>
      <p>${L(s.desc)}</p>`;
    card.onclick = () => startGame(s.id);
    wrap.appendChild(card);
  }
  const cont = $('menu-continue');
  cont.disabled = !hasSave() && !hasSave({ auto: true });
  cont.onclick = () => {
    const data = loadGame() || loadGame({ auto: true });
    if (data) startGame(null, data);
  };
  $('menu-lang').onclick = () => {
    setLang(getLang() === 'ru' ? 'en' : 'ru');
    buildMenu();
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = i18nT(el.dataset.i18n); });
  };
}

// ---------------- Game lifecycle ----------------
function startGame(scenarioId, saveData = null) {
  state = saveData ? deserialize(saveData) : newGame(scenarioId, (Math.random() * 99999) | 0);

  camApi = makeCamera(canvas, state.map.size);
  if (!renderer) renderer = makeRenderer(canvas, minimapCanvas);
  resize();

  // center the view on the grassy heart of the island (where building happens)
  let gx = 0, gy = 0, gcount = 0, lx = 0, ly = 0, lcount = 0;
  const n = state.map.size;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const t = state.map.terrain[y * n + x];
      if (t !== 0) { lx += x; ly += y; lcount++; }
      if (t === 2) { gx += x; gy += y; gcount++; }
    }
  }
  const cx = gcount ? gx / gcount : lcount ? lx / lcount : n / 2;
  const cy = gcount ? gy / gcount : lcount ? ly / lcount : n / 2;
  camApi.cam.zoom = 0.8;
  camApi.centerOn(cx, cy);

  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('buildbar').classList.remove('hidden');
  $('minimap-wrap').classList.remove('hidden');

  if (!ui) {
    ui = makeUI(actions);
  }
  ui.rebuildBuildbar();
  ui.refreshAll();
  if (!saveData) ui.openModal('help');

  if (!loop) {
    loop = makeLoop({
      update: (dt) => {
        if (!state) return;
        tick(state, dt);
        // advance ferry visual
        if (state.ferry) {
          state.ferry.t += dt * state.speed;
          if (state.ferry.t > 26) state.ferry = null;
        }
      },
      render: (dtReal) => {
        if (!state || !camApi) return;
        renderer.ensureSharkPos(state);
        renderer.render(state, camApi, performance.now() / 1000, ui, mouse);
        mmAcc += dtReal;
        if (mmAcc > 0.4) { mmAcc = 0; renderer.renderMinimap(state, camApi); }
      },
    });
  }
  loop.setSpeed(state.speed || 1);
  bus.emit('speed:changed', state.speed || 1);
  loop.start();

  // debug/testing handle
  window.__blcl = { state, camApi, actions, ui, BUILDING_BY_ID };
}

let mmAcc = 0;

function stopGame() {
  if (loop) loop.stop();
  state = null;
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('buildbar').classList.add('hidden');
  $('minimap-wrap').classList.add('hidden');
  $('inspect').classList.add('hidden');
  $('modal-backdrop').classList.add('hidden');
  $('log').innerHTML = '';
  buildMenu();
}

// ---------------- Actions bridge for UI ----------------
const actions = {
  getState: () => state,
  build: (def, tile) => { if (state) return tryBuild(state, def, tile.x, tile.y); },
  demolish: (b) => { if (state) tryDemolish(state, b); },
  hire: (role) => { if (state) hire(state, role); },
  fire: (role) => { if (state) fire(state, role); },
  setSpeed: (s) => {
    if (!state) return;
    setSpeed(state, s);
    loop.setSpeed(s);
    bus.emit('speed:changed', s);
  },
  save: () => {
    if (!state) return;
    saveGame(serialize(state));
    bus.emit('toast', { key: 'msg.saved' });
  },
  load: () => {
    const data = loadGame() || loadGame({ auto: true });
    if (!data) { bus.emit('toast', { key: 'msg.noSave', bad: true }); return; }
    const wasRunning = !!state;
    if (wasRunning) { loop.stop(); }
    startGame(null, data);
    bus.emit('toast', { key: 'msg.loaded' });
  },
  toMenu: stopGame,
  screenshot: () => {
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `beach-life-club-day-${state ? state.day : 0}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    bus.emit('toast', { key: 'msg.shot' });
  },
  pick: (tile) => {
    if (!state || !ui) return;
    if (ui.tool === 'place' && ui.pendingDef) {
      // center the footprint under the cursor
      const def = ui.pendingDef;
      const ax = Math.round(tile.x - def.w / 2);
      const ay = Math.round(tile.y - def.h / 2);
      actions.build(def, { x: ax, y: ay });
      return;
    }
    if (ui.tool === 'demolish') {
      const b = buildingAt(state, tile.x, tile.y);
      if (b) actions.demolish(b);
      return;
    }
    // select
    const g = guestAt(state, tile.x, tile.y);
    if (g) { ui.selectGuest(g); return; }
    const b = buildingAt(state, tile.x, tile.y);
    if (b) { ui.selectBuilding(b); return; }
    ui.clearSelection();
  },
};

function buildingAt(st, x, y) {
  for (const b of st.bs.buildings) {
    if (x >= b.x && x < b.x + b.def.w && y >= b.y && y < b.y + b.def.h) return b;
  }
  return null;
}

function guestAt(st, x, y) {
  let best = null, bd = 1.1;
  for (const g of st.guests) {
    if (g.state === 'gone' || g.state === 'ferry') continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

// ---------------- Input ----------------
const mouse = { x: 0, y: 0, tile: null, down: false, dragged: false, downX: 0, downY: 0, button: 0 };

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  if (camApi) {
    camApi.resize(canvas.clientWidth, canvas.clientHeight);
  }
}
window.addEventListener('resize', resize);

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  mouse.down = true;
  mouse.dragged = false;
  mouse.button = e.button;
  mouse.downX = e.clientX; mouse.downY = e.clientY;
});

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  if (mouse.down && camApi) {
    const dx = e.clientX - mouse.downX, dy = e.clientY - mouse.downY;
    if (Math.hypot(dx, dy) > 6) mouse.dragged = true;
    if (mouse.dragged && (mouse.button === 0 && (!ui || ui.tool === 'select') || mouse.button === 2)) {
      // damped 1:0.65 mapping — raw movementX feels twitchy
      camApi.pan(-(e.movementX || 0) * 0.65, -(e.movementY || 0) * 0.65);
    }
  }
  if (camApi) mouse.tile = camApi.screenToTile(mouse.x, mouse.y);
});

window.addEventListener('pointerup', (e) => {
  if (mouse.down && !mouse.dragged && state && camApi && e.target === canvas) {
    const rect = canvas.getBoundingClientRect();
    const tile = camApi.screenToTile(e.clientX - rect.left, e.clientY - rect.top);
    if (e.button === 0) {
      actions.pick({ x: Math.floor(tile.x), y: Math.floor(tile.y) });
    } else if (e.button === 2) {
      if (ui && ui.tool !== 'select') {
        ui.setTool('select');
        bus.emit('tool:changed', 'select');
      }
    }
  }
  mouse.down = false;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (!camApi) return;
  const rect = canvas.getBoundingClientRect();
  camApi.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
}, { passive: false });

// keyboard
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (!state) return;
  if (e.code === 'Space') {
    e.preventDefault();
    const s = state.speed === 0 ? 1 : 0;
    actions.setSpeed(s);
  } else if (e.key === '1') actions.setSpeed(1);
  else if (e.key === '2') actions.setSpeed(2);
  else if (e.key === '3' || e.key === '4') actions.setSpeed(4);
  else if (e.key === 'Escape') {
    if (ui && ui.tool !== 'select') { ui.setTool('select'); bus.emit('tool:changed', 'select'); }
    else if (ui) ui.closeModal();
  } else {
    keys.add(e.code);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

setInterval(() => {
  if (!state || !camApi) return;
  const k = 7; // px per tick (~210 px/s) — calm camera
  let dx = 0, dy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  if (dx || dy) camApi.pan(dx * k, dy * k);
}, 33);

// minimap click -> center camera
minimapCanvas.addEventListener('pointerdown', (e) => {
  if (!state || !camApi) return;
  const rect = minimapCanvas.getBoundingClientRect();
  const fx = (e.clientX - rect.left) / rect.width;
  const fy = (e.clientY - rect.top) / rect.height;
  camApi.centerOn(fx * state.map.size, fy * state.map.size);
});

// autosave each game day
bus.on('day:closed', () => {
  if (state) {
    saveGame(serialize(state), { auto: true });
    bus.emit('log:info', { key: 'msg.autosave' });
  }
});

// boot
buildMenu();
resize();

// audio context must start after a user gesture (autoplay policy)
const initAudioOnce = () => { initAudio(); window.removeEventListener('pointerdown', initAudioOnce); window.removeEventListener('keydown', initAudioOnce); };
window.addEventListener('pointerdown', initAudioOnce);
window.addEventListener('keydown', initAudioOnce);
