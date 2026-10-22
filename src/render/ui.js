// DOM UI: HUD wiring, build bar, inspect panel, modals (finance/staff/objectives/help),
// toasts, event log, minimap toggle. Talks to game logic via the bus + passed actions.

import { bus } from '../core/bus.js';
import { t, L, setLang, getLang } from '../core/i18n.js';
import { BUILDINGS, CATS, STAFF, STAFF_BY_ID, BUILDING_BY_ID, ARCH_BY_ID } from '../game/catalog.js';
import { isUnlocked, evalObjectives } from '../game/scenarios.js';
import { money } from '../game/economy.js';
import { starsText } from '../game/rating.js';
import { getBuildingThumb } from './sprites.js';
import { canHire } from '../game/staff.js';

const WEATHER_ICO = { sun: '☀️', cloud: '⛅', rain: '🌧️', storm: '⛈️' };

export function makeUI(actions) {
  // actions: { getState, build(def,tile), demolish(b), hire(role), fire(role),
  //           setSpeed(n), save(), load(), toMenu(), screenshot(), pick(tileWorld) }
  const $ = (id) => document.getElementById(id);

  const ui = {
    tool: 'select',       // select | place | demolish
    pendingDef: null,
    selected: { building: null, guest: null },
    activeCat: 'accom',
    minimapOn: true,
  };

  const hudCash = $('hud-cash-val');
  const hudRating = $('hud-rating-val');
  const hudGuests = $('hud-guests-val');
  const hudStaff = $('hud-staff-val');
  const hudDay = $('hud-day');
  const hudTime = $('hud-time');
  const hudWeather = $('hud-weather-ico');

  // ---------- HUD refresh ----------
  let hudDirty = true;
  bus.on('hud:dirty', () => { hudDirty = true; });
  bus.on('hud:tick', () => {
    const st = actions.getState();
    if (!st) return;
    hudTime.textContent = fmtTime(st.hour);
    // cheap frequently-updating fields
    hudGuests.textContent = `${st.guests.length}/${beds(st)}`;
  });
  bus.on('day:closed', () => { hudDirty = true; });
  bus.on('lang:changed', () => { rebuildBuildbar(); refreshAll(); applyStaticTexts(); });

  function beds(st) {
    return st.bs.buildings.reduce((s, b) => s + (b.def.beds || 0), 0);
  }

  function fmtTime(h) {
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  function refreshAll() {
    const st = actions.getState();
    if (!st) return;
    hudCash.textContent = money(st.econ.cash);
    hudCash.classList.toggle('negative', st.econ.cash < 0);
    hudRating.textContent = ` ${st.rating.stars.toFixed(1)} ${starsText(st.rating)}`;
    hudStaff.textContent = Object.values(st.staff.counts).reduce((a, b) => a + b, 0);
    hudDay.textContent = `${t('hud.day')} ${st.day}`;
    hudWeather.textContent = WEATHER_ICO[st.weather.type] || '☀️';
    hudGuests.textContent = `${st.guests.length}/${beds(st)}`;
    hudDirty = false;
    refreshBuildbarAffordability();
    if (!$('inspect').classList.contains('hidden')) refreshInspect();
    if (!$('modal-backdrop').classList.contains('hidden')) refreshOpenModal();
  }

  // throttle heavy HUD refresh to ~2/s
  setInterval(() => { if (hudDirty) refreshAll(); }, 500);

  // ---------- Log & toasts ----------
  const logEl = $('log');
  bus.on('log:info', (m) => addLog(m, 'info'));
  bus.on('log:warn', (m) => addLog(m, 'warn'));

  function addLog(m, cls) {
    const el = document.createElement('div');
    el.className = `log-entry ${cls}`;
    el.textContent = logText(m);
    logEl.appendChild(el);
    while (logEl.children.length > 6) logEl.removeChild(logEl.firstChild);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 1s'; }, 7000);
    setTimeout(() => el.remove(), 8200);
  }

  function logText(m) {
    let s = t(m.key);
    if (m.name) s = `${m.name}: ${s}`;
    if (m.n) s += ` ${m.n}`;
    if (m.stars) s += ` ${'★'.repeat(m.stars)}`;
    if (m.day) s += ` ${m.day}`;
    if (m.target?.def) s += ` ${L(m.target.def.name)}`;
    return s;
  }

  bus.on('toast', (m) => {
    const el = document.createElement('div');
    el.className = 'toast' + (m.bad ? ' bad' : '');
    el.textContent = m.name ? `${t(m.key)} ${m.name?.name ? L(m.name) : L(m.name || '')}`.trim() : t(m.key);
    $('toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .5s'; }, 2600);
    setTimeout(() => el.remove(), 3200);
  });

  // ---------- Build bar ----------
  function rebuildBuildbar() {
    const tabs = $('build-tabs');
    tabs.innerHTML = '';
    for (const cat of CATS) {
      const b = document.createElement('button');
      b.textContent = t(`cat.${cat}`);
      b.className = ui.activeCat === cat ? 'active' : '';
      b.onclick = () => { ui.activeCat = cat; rebuildBuildbar(); };
      tabs.appendChild(b);
    }
    const wrap = $('build-items');
    wrap.innerHTML = '';
    const st = actions.getState();
    if (!st) return;
    for (const def of BUILDINGS) {
      if (def.cat !== ui.activeCat) continue;
      const unlocked = isUnlocked(st.scen, def.id);
      const card = document.createElement('div');
      card.className = 'bcard' + (unlocked ? '' : ' locked');
      card.title = `${L(def.name)} — ${L(def.desc)}`;
      const thumb = getBuildingThumb(def);
      thumb.style.width = '84px'; thumb.style.height = '64px';
      card.appendChild(thumb);
      const nm = document.createElement('div');
      nm.className = 'bname';
      nm.textContent = unlocked ? L(def.name) : '🔒 ' + L(def.name);
      card.appendChild(nm);
      const pr = document.createElement('div');
      pr.className = 'bprice';
      pr.textContent = money(def.cost);
      pr.dataset.cost = def.cost;
      card.appendChild(pr);
      const sz = document.createElement('div');
      sz.className = 'bsize';
      sz.textContent = `${def.w}×${def.h}` + (def.waterfront ? ` · ${t('u.waterfront')}` : '') + (def.beachOnly ? ` · ${t('u.beach')}` : '');
      card.appendChild(sz);
      card.onclick = () => {
        if (!unlocked) return;
        setTool('place', def);
      };
      wrap.appendChild(card);
    }
    // demolish tab-button
    const demo = document.createElement('button');
    demo.textContent = '⚒ ' + t('tool.demolish');
    demo.className = ui.tool === 'demolish' ? 'active' : '';
    demo.onclick = () => setTool('demolish');
    tabs.appendChild(demo);
  }

  function refreshBuildbarAffordability() {
    const st = actions.getState();
    if (!st) return;
    for (const el of document.querySelectorAll('.bcard .bprice')) {
      const cost = +el.dataset.cost;
      el.classList.toggle('na', cost > st.econ.cash);
    }
  }

  function setTool(tool, def = null) {
    ui.tool = tool;
    ui.pendingDef = def;
    ui.selected = { building: null, guest: null };
    document.querySelectorAll('.bcard').forEach(el => el.classList.remove('selected'));
    if (tool === 'place') {
      // highlight card
      const idx = BUILDINGS.filter(d => d.cat === ui.activeCat).findIndex(d => d === def);
      const cards = document.querySelectorAll(`#build-items .bcard`);
      if (cards[idx]) cards[idx].classList.add('selected');
    }
    bus.emit('tool:changed', tool);
  }
  ui.setTool = setTool;

  // ---------- Inspect panel ----------
  const inspectEl = $('inspect');
  function showInspect(html) {
    inspectEl.innerHTML = html;
    inspectEl.classList.remove('hidden');
    const x = inspectEl.querySelector('.close-x');
    if (x) x.onclick = () => { inspectEl.classList.add('hidden'); ui.selected = { building: null, guest: null }; };
    const demoBtn = inspectEl.querySelector('.btn-demolish');
    if (demoBtn) demoBtn.onclick = () => {
      if (ui.selected.building) actions.demolish(ui.selected.building);
      inspectEl.classList.add('hidden');
      ui.selected.building = null;
    };
  }

  function refreshInspect() {
    const st = actions.getState();
    if (!st) return;
    if (ui.selected.guest) {
      const g = ui.selected.guest;
      if (!st.guests.includes(g)) { ui.selected.guest = null; inspectEl.classList.add('hidden'); return; }
      const arch = ARCH_BY_ID[g.archId];
      let html = `<button class="close-x">✕</button>
        <h3>${arch.emoji} ${g.name}</h3>
        <div class="row"><span>${t('insp.mood')}</span><b>${Math.round(g.mood)}%</b></div>
        <div class="bar"><i style="width:${g.mood}%" class="${g.mood < 30 ? 'low' : ''}"></i></div>
        <div class="row"><span>${t('insp.money')}</span><b>${money(g.money)}</b></div>
        <h3>${t('insp.needs')}</h3>`;
      for (const k of ['energy', 'hunger', 'thirst', 'bladder', 'hygiene', 'fun']) {
        const v = g.needs[k];
        html += `<div class="row"><span>${t(`need.${k}`)}</span><b>${Math.round(v)}</b></div>
                 <div class="bar"><i style="width:${v}%" class="${v < 25 ? 'low' : ''}"></i></div>`;
      }
      if (g.thought) html += `<p class="thought">${t(g.thought)}</p>`;
      showInspect(html);
    } else if (ui.selected.building) {
      const b = ui.selected.building;
      if (!st.bs.buildings.includes(b)) { ui.selected.building = null; inspectEl.classList.add('hidden'); return; }
      const def = b.def;
      let html = `<button class="close-x">✕</button>
        <h3>${L(def.name)}</h3>
        <p style="color:var(--text-dim);font-size:.8rem">${L(def.desc)}</p>`;
      if (def.beds) html += `<div class="row"><span>${t('cat.accom')}</span><b>${b.occupancy || 0}/${def.beds}</b></div>
        <div class="row"><span>${t('u.perNight')}</span><b>${money(def.roomFee)}</b></div>`;
      if (def.needs) html += `<div class="row"><span>${t('insp.users')}</span><b>${b.users}${def.cap ? '/' + def.cap : ''}</b></div>
        <div class="row"><span>${t('insp.price')}</span><b>${def.price ? money(def.price) : '—'}</b></div>`;
      html += `<div class="row"><span>${t('insp.wear')}</span><b>${Math.round(b.wear)}%</b></div>
        <div class="bar"><i style="width:${Math.min(100, b.wear)}%" class="${b.wear > 70 ? 'low' : ''}"></i></div>
        <div class="row"><span>${t('insp.upkeep')}</span><b>${money(def.upkeep)}</b></div>`;
      if (!b.open) html += `<p style="color:var(--danger)">${t('insp.closed')}</p>`;
      html += `<div class="actions"><button class="danger btn-demolish">⚒ ${t('insp.demolish')} (+${money(def.cost * 0.5)})</button></div>`;
      showInspect(html);
    }
  }

  ui.selectBuilding = (b) => { ui.selected = { building: b, guest: null }; refreshInspect(); };
  ui.selectGuest = (g) => { ui.selected = { building: null, guest: g }; refreshInspect(); };
  ui.clearSelection = () => {
    if (ui.tool === 'select') {
      ui.selected = { building: null, guest: null };
      inspectEl.classList.add('hidden');
    }
  };

  // ---------- Modals ----------
  const backdrop = $('modal-backdrop');
  const modal = $('modal');
  let modalKind = null;

  function openModal(kind) {
    modalKind = kind;
    backdrop.classList.remove('hidden');
    renderModal();
  }
  function closeModal() { modalKind = null; backdrop.classList.add('hidden'); }
  ui.closeModal = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

  function renderModal() {
    const st = actions.getState();
    if (!st || !modalKind) return;
    if (modalKind === 'objectives') {
      let html = `<h2>🎯 ${t('obj.title')} — ${L(st.scen.name)}</h2>`;
      if (st.scen.sandbox) {
        html += `<p>${t('scen.sandboxDesc')}</p>`;
      } else {
        html += `<p>${t('obj.deadline')} ${st.scen.days}</p>`;
        for (const r of evalObjectives(st.scen, st)) {
          const shown = r.obj.key === 'build' ? (r.done ? 1 : 0) : Math.round(r.value);
          html += `<div class="obj ${r.done ? 'done' : ''}"><span class="st">${r.done ? '✅' : '⬜'}</span>
            <span>${L(r.obj.label)} — ${shown}${r.obj.key === 'rating' ? '★' : ''}</span></div>`;
        }
      }
      html += `<div class="modal-actions"><button class="btn primary" id="m-close">${t('help.close')}</button></div>`;
      modal.innerHTML = html;
    } else if (modalKind === 'finance') {
      const tod = st.econ.today;
      let html = `<h2>📊 ${t('fin.title')}</h2>
        <h3>${t('fin.today')}</h3>
        <table>
          <tr><td>${t('fin.income')}</td><td class="plus">+$${Math.round(tod.income).toLocaleString('en-US')}</td></tr>
          <tr><td>${t('fin.upkeep')}</td><td class="minus">-$${Math.round(tod.upkeep).toLocaleString('en-US')}</td></tr>
          <tr><td>${t('fin.wages')}</td><td class="minus">-$${Math.round(tod.wages).toLocaleString('en-US')}</td></tr>
        </table>
        <h3>${t('fin.history')}</h3>
        <table><tr><th></th><th>${t('fin.income')}</th><th>${t('fin.upkeep')}</th><th>${t('fin.wages')}</th><th>${t('fin.net')}</th></tr>`;
      for (const h of [...st.econ.history].reverse().slice(0, 7)) {
        html += `<tr><td>${t('hud.day')} ${h.day}</td><td>+${h.income}</td><td>-${h.upkeep}</td><td>-${h.wages}</td>
          <td class="${h.net >= 0 ? 'plus' : 'minus'}">${h.net >= 0 ? '+' : ''}${h.net}</td></tr>`;
      }
      html += `</table><div class="modal-actions"><button class="btn primary" id="m-close">${t('help.close')}</button></div>`;
      modal.innerHTML = html;
    } else if (modalKind === 'staff') {
      let html = `<h2>🧑‍💼 ${t('staff.title')}</h2>`;
      for (const s of STAFF) {
        const count = st.staff.counts[s.id];
        const canH = canHire(st, s.id);
        const baseDef = BUILDING_BY_ID[s.base];
        html += `<div class="staff-row">
          <div class="ico">${s.emoji}</div>
          <div class="info"><b>${t(`role.${s.id}`)}</b> <small>${L(s.desc)} · $${s.wage} ${t('staff.wage')}</small>
          ${canH ? '' : `<span class="need-base">${t('staff.needBase')} ${L(baseDef.name)}</span>`}</div>
          <div class="cnt">${count}</div>
          <button data-fire="${s.id}" ${count ? '' : 'disabled'}>−</button>
          <button data-hire="${s.id}" ${canH ? '' : 'disabled'}>+</button>
        </div>`;
      }
      html += `<div class="modal-actions"><button class="btn primary" id="m-close">${t('help.close')}</button></div>`;
      modal.innerHTML = html;
      modal.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { actions.hire(b.dataset.hire); renderModal(); hudDirty = true; });
      modal.querySelectorAll('[data-fire]').forEach(b => b.onclick = () => { actions.fire(b.dataset.fire); renderModal(); hudDirty = true; });
    } else if (modalKind === 'help') {
      modal.innerHTML = `<h2>❓ ${t('help.title')}</h2>${t('help.body')}
        <div class="modal-actions"><button class="btn primary" id="m-close">${t('help.close')}</button></div>`;
    } else if (modalKind === 'gameover') {
      const won = st.overWon;
      modal.innerHTML = `<h2>${won ? '🏆 ' + t('obj.won') : '💀 ' + t(gameOverKey || 'obj.lostTime')}</h2>
        <p>${t('hud.rating')}: ${st.rating.stars.toFixed(1)}★ · ${t('hud.guests')}: ${st.servedTotal}</p>
        <div class="modal-actions">
          <button class="btn" id="m-menu">${t('obj.toMenu')}</button>
          <button class="btn primary" id="m-continue">${t('obj.continueAnyWay')}</button>
        </div>`;
      $('m-menu').onclick = actions.toMenu;
      $('m-continue').onclick = () => { st.over = false; closeModal(); };
    }
    const mc = modal.querySelector('#m-close');
    if (mc) mc.onclick = closeModal;
  }

  let gameOverKey = null;
  function refreshOpenModal() {
    if (modalKind && modalKind !== 'gameover') renderModal();
  }

  bus.on('game:over', ({ key }) => { gameOverKey = key; openModal('gameover'); });

  // ---------- Buttons ----------
  $('spd-pause').onclick = () => actions.setSpeed(0);
  $('spd-1').onclick = () => actions.setSpeed(1);
  $('spd-2').onclick = () => actions.setSpeed(2);
  $('spd-4').onclick = () => actions.setSpeed(4);
  bus.on('speed:changed', (s) => {
    for (const [id, v] of [['spd-pause', 0], ['spd-1', 1], ['spd-2', 2], ['spd-4', 4]]) {
      $(id).classList.toggle('active', s === v);
    }
  });
  $('btn-objectives').onclick = () => openModal('objectives');
  $('btn-finance').onclick = () => openModal('finance');
  $('btn-staff-panel').onclick = () => openModal('staff');
  $('btn-help').onclick = () => openModal('help');
  $('btn-save').onclick = () => actions.save();
  $('btn-load').onclick = () => actions.load();
  $('btn-menu').onclick = actions.toMenu;
  $('btn-shot').onclick = actions.screenshot;
  $('btn-lang').onclick = () => { setLang(getLang() === 'ru' ? 'en' : 'ru'); $('btn-lang').textContent = getLang() === 'ru' ? 'EN' : 'RU'; };
  $('btn-minimap').onclick = () => {
    ui.minimapOn = !ui.minimapOn;
    $('minimap-wrap').classList.toggle('hidden', !ui.minimapOn);
  };

  // keyboard speed shortcuts handled in main.js; expose openModal for help-on-start
  ui.openModal = openModal;
  ui.refreshAll = refreshAll;
  ui.rebuildBuildbar = rebuildBuildbar;

  // ---------- Static menu text (menu screen lives in index.html) ----------
  function applyStaticTexts() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    const langBtn = $('btn-lang');
    if (langBtn) langBtn.textContent = getLang() === 'ru' ? 'EN' : 'RU';
    const menuLang = $('menu-lang');
    if (menuLang) menuLang.textContent = 'RU / EN';
  }
  applyStaticTexts();

  return ui;
}
