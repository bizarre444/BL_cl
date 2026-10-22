// Main scene renderer: terrain, animated water, entities with depth sorting,
// day/night tint, weather overlays, placement ghost, minimap.

import { tileAt, WATER, SAND, GRASS, ROCK, inBounds } from '../world/map.js';
import { getBuildingSprite, drawGuest, drawStaff } from './sprites.js';

const TILE_W = 64, TILE_H = 32;

// Per-tile base colors with gentle deterministic variance.
function tileColor(map, x, y, t) {
  const h = map.height[y * map.size + x];
  const v = Math.sin(x * 127.1 + y * 311.7 + map.seed) * 0.5 + 0.5;
  if (t === SAND) return `hsl(45, ${52 + v * 8}%, ${74 + v * 6}%)`;
  if (t === GRASS) return `hsl(${105 + v * 14}, ${38 + v * 10}%, ${34 + v * 8}%)`;
  if (t === ROCK) return `hsl(${220 + v * 10}, 8%, ${42 + v * 10}%)`;
  return null;
}

function elevationPx(map, x, y) {
  const h = map.height[y * map.size + x];
  return Math.max(0, (h - 0.30)) * 30; // lift above beach level
}

export function makeRenderer(canvas, minimapCanvas) {
  const ctx = canvas.getContext('2d');
  let coastCache = null;
  let shimmerSeeds = null;

  function render(state, camApi, tReal, ui, mouse) {
    const { cam, tileToScreen, screenToTile } = camApi;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!state) return;

    const n = state.map.size;
    const time = tReal;
    const windK = state.weather.type === 'wind' ? 2.6 : state.weather.type === 'storm' ? 2.0 : 1;

    // --- ocean background ---
    const og = ctx.createLinearGradient(0, 0, 0, H);
    og.addColorStop(0, '#0a5f8f');
    og.addColorStop(0.5, '#0b79a8');
    og.addColorStop(1, '#0d8fbb');
    ctx.fillStyle = og;
    ctx.fillRect(0, 0, W, H);

    // --- visible tile bounds ---
    const tl = screenToTile(0, 0), tr = screenToTile(W, 0);
    const bl = screenToTile(0, H), br = screenToTile(W, H);
    const minX = Math.max(0, Math.floor(Math.min(tl.x, bl.x)) - 2);
    const maxX = Math.min(n - 1, Math.ceil(Math.max(tr.x, br.x)) + 2);
    const minY = Math.max(0, Math.floor(Math.min(tl.y, tr.y)) - 3);
    const maxY = Math.min(n - 1, Math.ceil(Math.max(bl.y, br.y)) + 2);

    if (!coastCache) buildCoastCache(state.map);
    if (!shimmerSeeds) buildShimmer(state.map);

    // --- water shimmer ---
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (const s of shimmerSeeds) {
      if (s.x < minX - 6 || s.x > maxX + 6 || s.y < minY - 6 || s.y > maxY + 6) continue;
      const ph = Math.sin(time * 1.4 + s.phase);
      if (ph < 0.3) continue;
      const p = tileToScreen(s.x, s.y, 0);
      ctx.globalAlpha = (ph - 0.3) * 0.6;
      ctx.fillRect(p.x - 8 * cam.zoom, p.y, 16 * cam.zoom, 2 * cam.zoom);
    }
    ctx.globalAlpha = 1;

    // --- terrain pass (row-major = painter order for iso) ---
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = tileAt(state.map, x, y);
        if (t === WATER) continue;
        const elev = elevationPx(state.map, x, y);
        const p = tileToScreen(x, y, 0);
        const py = p.y - elev * cam.zoom;
        const w = TILE_W * cam.zoom, h = TILE_H * cam.zoom;
        const col = tileColor(state.map, x, y, t);
        // skirts: fill down to neighbor/water level
        const elevS = x + 1 < n ? Math.max(elevationPx(state.map, x + 1, y), 0) : elev;
        const elevE = y + 1 < n ? Math.max(elevationPx(state.map, x, y + 1), 0) : elev;
        const dropS = Math.max(0, elev - elevS), dropE = Math.max(0, elev - elevE);
        if (dropS > 0.5 || dropE > 0.5) {
          ctx.fillStyle = t === ROCK ? '#7d7466' : '#9c8b5f';
          ctx.beginPath();
          ctx.moveTo(p.x - w / 2, py + h / 2);
          ctx.lineTo(p.x, py + h);
          ctx.lineTo(p.x + w / 2, py + h / 2);
          ctx.lineTo(p.x + w / 2, py + h / 2 + Math.max(dropS, dropE) * cam.zoom);
          ctx.lineTo(p.x, py + h + Math.max(dropS, dropE) * cam.zoom);
          ctx.lineTo(p.x - w / 2, py + h / 2 + Math.max(dropS, dropE) * cam.zoom);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(p.x, py);
        ctx.lineTo(p.x + w / 2, py + h / 2);
        ctx.lineTo(p.x, py + h);
        ctx.lineTo(p.x - w / 2, py + h / 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    // --- coast foam ---
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.6 * cam.zoom;
    for (const c of coastCache) {
      if (c.x < minX - 1 || c.x > maxX + 1 || c.y < minY - 1 || c.y > maxY + 1) continue;
      const p = tileToScreen(c.x, c.y, 0);
      const w = TILE_W * cam.zoom, h = TILE_H * cam.zoom;
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 + (c.x + c.y) * 0.8);
      ctx.globalAlpha = 0.25 + pulse * 0.45;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 2 * cam.zoom * pulse);
      ctx.lineTo(p.x + w / 2, p.y + h / 2 - 2 * cam.zoom * pulse);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // --- ferry ---
    if (state.ferry) drawFerry(state, camApi, time);

    // --- entity list with depth sort ---
    const drawables = [];
    for (const b of state.bs.buildings) {
      drawables.push({
        depth: (b.x + b.def.w) + (b.y + b.def.h) + 0.5,
        kind: 'building', b,
      });
    }
    for (const p of state.map.palms) {
      drawables.push({ depth: p.x + p.y + 1, kind: 'palm', p });
    }
    for (const r of state.map.rocks) {
      drawables.push({ depth: r.x + r.y + 1, kind: 'rock', r });
    }
    for (const l of state.litter) {
      drawables.push({ depth: l.x + l.y + 1, kind: 'litter', l });
    }
    for (const g of state.guests) {
      if (g.state === 'gone' || g.state === 'ferry') continue;
      drawables.push({ depth: g.x + g.y + 1.2, kind: 'guest', g });
    }
    for (const u of state.staff.units) {
      drawables.push({ depth: u.x + u.y + 1.2, kind: 'staff', u });
    }
    if (state.hazard.shark && state.hazard.sharkPos) {
      drawables.push({ depth: state.hazard.sharkPos.x + state.hazard.sharkPos.y, kind: 'shark', p: state.hazard.sharkPos });
    }
    if (ui?.selected?.building) {
      const b = ui.selected.building;
      drawables.push({ depth: (b.x + b.def.w) + (b.y + b.def.h) + 0.6, kind: 'selRect', b });
    }
    drawables.sort((a, b) => a.depth - b.depth);

    for (const d of drawables) {
      switch (d.kind) {
        case 'building': drawBuilding(ctx, camApi, d.b, state, time); break;
        case 'palm': drawPalm(ctx, camApi, d.p, time, windK); break;
        case 'rock': drawRock(ctx, camApi, d.r); break;
        case 'litter': drawLitter(ctx, camApi, d.l); break;
        case 'guest': {
          const g = d.g;
          const elev = tileElevAt(state.map, g.x, g.y);
          const p = tileToScreen(g.x, g.y, elev);
          drawGuest(ctx, p.x, p.y, g, cam.zoom, time);
          if (ui?.selected?.guest === g) {
            ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 7 * cam.zoom, 3.4 * cam.zoom, 0, 0, 7);
            ctx.stroke();
          }
          break;
        }
        case 'staff': {
          const u = d.u;
          const elev = tileElevAt(state.map, u.x, u.y);
          const p = tileToScreen(u.x, u.y, elev);
          drawStaff(ctx, p.x, p.y, u, cam.zoom);
          break;
        }
        case 'shark': drawShark(ctx, camApi, d.p, time); break;
        case 'selRect': drawSelRect(ctx, camApi, d.b, '#ffd166'); break;
      }
    }

    // --- placement ghost ---
    if (ui?.tool === 'place' && ui.pendingDef && mouse?.tile) {
      const def = ui.pendingDef;
      const ax = Math.round(mouse.tile.x - def.w / 2);
      const ay = Math.round(mouse.tile.y - def.h / 2);
      drawGhost(ctx, state, camApi, def, { x: ax, y: ay });
    }

    // --- day/night ---
    const hour = state.hour;
    let nightA = 0;
    if (hour >= 20 || hour < 5.5) nightA = 0.5;
    else if (hour >= 18) nightA = ((hour - 18) / 2) * 0.5;
    else if (hour < 7) nightA = ((7 - hour) / 1.5) * 0.5;
    if (nightA > 0) {
      ctx.fillStyle = `rgba(8,14,48,${nightA})`;
      ctx.fillRect(0, 0, W, H);
      // window glows
      ctx.fillStyle = `rgba(255,214,120,${0.5 * nightA * 2 * 0.5})`;
      for (const b of state.bs.buildings) {
        if (!['bungalow', 'hotel', 'luxhotel', 'disco', 'stage', 'cafe', 'restaurant', 'bar'].includes(b.id)) continue;
        if (b.id === 'bar') continue;
        const elev = tileElevAt(state.map, b.x + b.def.w / 2, b.y + b.def.h / 2);
        const p = tileToScreen(b.x + b.def.w / 2, b.y + b.def.h / 2, elev);
        const g = ctx.createRadialGradient(p.x, p.y - 10 * cam.zoom, 2, p.x, p.y - 10 * cam.zoom, 26 * cam.zoom);
        g.addColorStop(0, `rgba(255,214,120,${0.35 * nightA * 2})`);
        g.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - 30 * cam.zoom, p.y - 40 * cam.zoom, 60 * cam.zoom, 60 * cam.zoom);
      }
      // lamps
      for (const b of state.bs.buildings) {
        if (b.id !== 'lamp') continue;
        const p = tileToScreen(b.x + 0.5, b.y + 0.5, 0);
        const g = ctx.createRadialGradient(p.x, p.y - 14 * cam.zoom, 1, p.x, p.y - 14 * cam.zoom, 20 * cam.zoom);
        g.addColorStop(0, `rgba(255,214,120,${0.5 * nightA * 2})`);
        g.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - 22 * cam.zoom, p.y - 36 * cam.zoom, 44 * cam.zoom, 44 * cam.zoom);
      }
    }
    // dusk warm tint
    if (hour >= 17 && hour < 20) {
      const k = 1 - Math.abs(hour - 18.5) / 1.5;
      if (k > 0) {
        ctx.fillStyle = `rgba(255,140,60,${0.16 * k})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // --- weather overlays ---
    const w = state.weather.type;
    if (w === 'cloud') {
      ctx.fillStyle = 'rgba(200,210,220,0.13)';
      ctx.fillRect(0, 0, W, H);
    } else if (w === 'heat') {
      // scorched warm shimmer + sun glare
      ctx.fillStyle = 'rgba(255,140,40,0.10)';
      ctx.fillRect(0, 0, W, H);
      const gx = W * 0.78, gy = H * 0.16;
      const g = ctx.createRadialGradient(gx, gy, 8, gx, gy, 300);
      g.addColorStop(0, 'rgba(255,240,180,0.5)');
      g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - 300, gy - 300, 600, 600);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const sx = (Math.sin(i * 513.3) * 0.5 + 0.5) * W;
        const sy = ((time * 26 + i * 211) % (H + 30)) - 15;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 10, sy + 3);
      }
      ctx.stroke();
    } else if (w === 'wind') {
      ctx.fillStyle = 'rgba(190,205,215,0.10)';
      ctx.fillRect(0, 0, W, H);
      // gusts: fast horizontal streaks
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 46; i++) {
        const sy = (Math.sin(i * 771.7) * 0.5 + 0.5) * H;
        const sx = ((time * (500 + (i % 5) * 120) + i * 467) % (W + 240)) - 120;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 60 + (i % 7) * 10, sy - 4);
      }
      ctx.stroke();
    } else if (w === 'rain' || w === 'storm') {
      const dark = w === 'storm' ? 0.38 : 0.22;
      ctx.fillStyle = `rgba(30,40,60,${dark})`;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(190,215,255,0.5)';
      ctx.lineWidth = 1;
      const drops = w === 'storm' ? 140 : 80;
      ctx.beginPath();
      for (let i = 0; i < drops; i++) {
        const sx = (Math.sin(i * 999.7) * 0.5 + 0.5) * W;
        const sy = ((time * (900 + (i % 7) * 90) + i * 331) % (H + 40)) - 20;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 4, sy + 14);
      }
      ctx.stroke();
      if (w === 'storm' && Math.sin(time * 3.1) > 0.985) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    // --- shark warning banner handled via log; draw dock sign ---
    drawDock(ctx, state, camApi, time);
  }

  function tileElevAt(map, x, y) {
    const xi = Math.max(0, Math.min(map.size - 1, x | 0));
    const yi = Math.max(0, Math.min(map.size - 1, y | 0));
    return elevationPx(map, xi, yi);
  }

  function drawBuilding(ctx, camApi, b, state, time) {
    const { cam, tileToScreen } = camApi;
    const def = b.def;
    const sprite = getBuildingSprite(def);
    // anchor: bottom-center of footprint
    const cx = b.x + def.w / 2, cy = b.y + def.h / 2;
    const elev = tileElevAt(state.map, cx, cy);
    const p = tileToScreen(cx, cy, elev);
    const k = cam.zoom / 2; // sprite is SS=2 supersampled
    ctx.drawImage(
      sprite.canvas,
      p.x - (sprite.w / 2) * k,
      p.y - (sprite.h - 26) * k + 26 * cam.zoom - 26 * cam.zoom,
      sprite.w * k,
      sprite.h * k
    );
    // closed badge
    if (!b.open) {
      ctx.font = `${10 * cam.zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚠️', p.x, p.y - (sprite.h - 40) * k);
      ctx.textAlign = 'left';
    }
    // wear smoke
    if (b.wear > 70 && b.open) {
      const ph = Math.sin(time * 2 + b.uid);
      ctx.fillStyle = 'rgba(120,120,120,0.4)';
      ctx.beginPath();
      ctx.arc(p.x + 10 * cam.zoom, p.y - (sprite.h - 20) * k - ph * 4, 4 * cam.zoom, 0, 7);
      ctx.fill();
    }
    // queue dots above door
    if (b.users >= (def.cap || 1)) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8 * cam.zoom, 3 * cam.zoom, 0, 7);
      ctx.fill();
    }
  }

  function drawPalm(ctx, camApi, p, time, windK) {
    const { cam, tileToScreen } = camApi;
    const sway = Math.sin(time * (windK > 1 ? 2.2 : 1.1) + p.phase) * (0.06 * windK);
    const s = tileToScreen(p.x, p.y, 0);
    const z = cam.zoom * p.scale;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = 'rgba(0,20,30,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 * z, 4 * z, 0, 0, 7);
    ctx.fill();
    ctx.rotate(sway * 0.3);
    // trunk
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 3.2 * z;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(3 * z, -12 * z, sway * 20 * z, -24 * z);
    ctx.stroke();
    // fronds
    const topX = sway * 20 * z, topY = -24 * z;
    const colors = ['#2e8b57', '#3cb371', '#2d6a4f'];
    ctx.strokeStyle = colors[p.variant % colors.length];
    ctx.lineWidth = 2.6 * z;
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI / 2 + (i - 2.5) * 0.55 + sway;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + Math.cos(ang) * 10 * z, topY + Math.sin(ang) * 10 * z - 2 * z,
        topX + Math.cos(ang) * 15 * z, topY + Math.sin(ang) * 11 * z + 3 * z
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRock(ctx, camApi, r) {
    const { cam, tileToScreen } = camApi;
    const p = tileToScreen(r.x, r.y, 0);
    const z = cam.zoom * r.scale;
    ctx.fillStyle = '#8d8d8d';
    ctx.beginPath();
    ctx.moveTo(p.x - 10 * z, p.y);
    ctx.lineTo(p.x - 4 * z, p.y - 9 * z);
    ctx.lineTo(p.x + 5 * z, p.y - 7 * z);
    ctx.lineTo(p.x + 9 * z, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a9a9a9';
    ctx.beginPath();
    ctx.moveTo(p.x - 4 * z, p.y - 9 * z);
    ctx.lineTo(p.x + 5 * z, p.y - 7 * z);
    ctx.lineTo(p.x + 2 * z, p.y - 3 * z);
    ctx.closePath();
    ctx.fill();
  }

  function drawLitter(ctx, camApi, l) {
    const { cam, tileToScreen } = camApi;
    const p = tileToScreen(l.x, l.y, 0);
    const z = cam.zoom;
    ctx.fillStyle = 'rgba(250,250,250,0.75)';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 1 * z, 1.7 * z, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,120,60,0.6)';
    ctx.beginPath();
    ctx.arc(p.x + 3 * z, p.y, 1.4 * z, 0, 7);
    ctx.fill();
  }

  function drawShark(ctx, camApi, pos, time) {
    const { cam, tileToScreen } = camApi;
    const wig = Math.sin(time * 3) * 0.15;
    const p = tileToScreen(pos.x, pos.y, 0);
    const z = cam.zoom;
    ctx.fillStyle = '#4a5759';
    ctx.beginPath();
    ctx.moveTo(p.x - 7 * z, p.y + wig * 6 * z);
    ctx.lineTo(p.x, p.y - 10 * z + wig * 4 * z);
    ctx.lineTo(p.x + 7 * z, p.y + wig * 6 * z);
    ctx.closePath();
    ctx.fill();
    // ripple
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * z, (9 + Math.sin(time * 4) * 2) * z, 3 * z, 0, 0, 7);
    ctx.stroke();
  }

  function drawFerry(state, camApi, time) {
    const { cam, tileToScreen } = camApi;
    const f = state.ferry;
    const dock = state.map.dock;
    const T = 9; // seconds to cross
    const k = Math.min(1, f.t / T);
    const fx = dock.x + 8 + (state.map.size - dock.x) * (1 - k) * 0.9;
    const fy = dock.y - 2 + Math.sin(time * 1.2) * 0.08;
    const p = tileToScreen(fx, fy, 0);
    const z = cam.zoom;
    // hull
    ctx.fillStyle = '#eae2b7';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 30 * z, 10 * z, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#003049';
    ctx.fillRect(p.x - 14 * z, p.y - 16 * z, 28 * z, 12 * z);
    ctx.fillStyle = '#669bbc';
    ctx.fillRect(p.x - 10 * z, p.y - 13 * z, 8 * z, 6 * z);
    ctx.fillRect(p.x + 2 * z, p.y - 13 * z, 8 * z, 6 * z);
    // wake
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2 * z;
    ctx.beginPath();
    ctx.moveTo(p.x - 32 * z, p.y + 2 * z);
    ctx.lineTo(p.x - 44 * z, p.y + 6 * z);
    ctx.moveTo(p.x - 32 * z, p.y + 2 * z);
    ctx.lineTo(p.x - 40 * z, p.y - 4 * z);
    ctx.stroke();
  }

  function drawDock(ctx, state, camApi, time) {
    const { cam, tileToScreen } = camApi;
    const dock = state.map.dock;
    const p = tileToScreen(dock.x + 0.5, dock.y + 0.5, 0);
    const z = cam.zoom;
    // pier planks toward water (east)
    ctx.fillStyle = '#b08968';
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(28 * z, 14 * z);
    ctx.lineTo(28 * z, 22 * z);
    ctx.lineTo(0, 8 * z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7f5539';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(4 * z + i * 6 * z, 2 * z + i * 3 * z, 4 * z, 2 * z);
    }
    ctx.restore();
    // sign
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold ${8 * z}px sans-serif`;
    ctx.fillText('⚓', p.x - 12 * z, p.y - 4 * z);
  }

  function drawSelRect(ctx, camApi, b, color) {
    const { cam, tileToScreen } = camApi;
    const pts = [];
    for (const [dx, dy] of [[0, 0], [b.def.w, 0], [b.def.w, b.def.h], [0, b.def.h]]) {
      const p = tileToScreen(b.x + dx, b.y + dy, 0);
      pts.push(p);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGhost(ctx, state, camApi, def, tile) {
    const { cam, tileToScreen } = camApi;
    const ok = state.bs.canPlace(def, tile.x, tile.y) && state.econ.cash >= def.cost;
    const pts = [];
    for (const [dx, dy] of [[0, 0], [def.w, 0], [def.w, def.h], [0, def.h]]) {
      const p = tileToScreen(tile.x + dx, tile.y + dy, 0);
      pts.push(p);
    }
    ctx.fillStyle = ok ? 'rgba(80,220,120,0.30)' : 'rgba(240,80,80,0.30)';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ok ? '#50dc78' : '#f05050';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (ok) {
      const sprite = getBuildingSprite(def);
      const cx = tile.x + def.w / 2, cy = tile.y + def.h / 2;
      const p = tileToScreen(cx, cy, 0);
      const k = cam.zoom / 2;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(sprite.canvas, p.x - (sprite.w / 2) * k, p.y - (sprite.h - 26) * k, sprite.w * k, sprite.h * k);
      ctx.globalAlpha = 1;
    }
  }

  function buildCoastCache(map) {
    coastCache = [];
    for (let y = 0; y < map.size; y++) {
      for (let x = 0; x < map.size; x++) {
        if (tileAt(map, x, y) === WATER) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (tileAt(map, x + dx, y + dy) === WATER) { coastCache.push({ x, y }); break; }
        }
      }
    }
  }

  function buildShimmer(map) {
    shimmerSeeds = [];
    for (let i = 0; i < 340; i++) {
      const x = Math.random() * map.size;
      const y = Math.random() * map.size;
      if (tileAt(map, x | 0, y | 0) === WATER) shimmerSeeds.push({ x, y, phase: Math.random() * 7 });
    }
  }

  // pick a plausible shark position once per hazard
  function ensureSharkPos(state) {
    if (state.hazard.shark && !state.hazard.sharkPos && coastCache.length) {
      state.hazard.sharkPos = coastCache[(state.day * 31 + (state.hour | 0) * 7) % coastCache.length];
    }
    if (!state.hazard.shark) state.hazard.sharkPos = null;
  }

  // ---- Minimap ----
  let mmTerrain = null;
  function renderMinimap(state, camApi, force = false) {
    if (!minimapCanvas) return;
    const mc = minimapCanvas.getContext('2d');
    const n = state.map.size;
    if (!mmTerrain || force) {
      mmTerrain = document.createElement('canvas');
      mmTerrain.width = n; mmTerrain.height = n;
      const tc = mmTerrain.getContext('2d');
      const img = tc.createImageData(n, n);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const t = state.map.terrain[y * n + x];
          let r, g, b;
          if (t === WATER) { r = 14; g = 108; b = 160; }
          else if (t === SAND) { r = 240; g = 215; b = 160; }
          else if (t === GRASS) { r = 78; g = 148; b = 82; }
          else { r = 130; g = 128; b = 122; }
          const i = (y * n + x) * 4;
          img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
        }
      }
      tc.putImageData(img, 0, 0);
    }
    const s = minimapCanvas.width / n;
    mc.imageSmoothingEnabled = false;
    mc.drawImage(mmTerrain, 0, 0, minimapCanvas.width, minimapCanvas.height);
    // buildings
    for (const b of state.bs.buildings) {
      mc.fillStyle = b.def.cat === 'accom' ? '#ffd166' : '#ef476f';
      mc.fillRect(b.x * s, b.y * s, Math.max(2, b.def.w * s), Math.max(2, b.def.h * s));
    }
    // guests
    mc.fillStyle = '#ffffff';
    for (const g of state.guests) {
      mc.fillRect(g.x * s, g.y * s, 2, 2);
    }
    // camera viewport
    const { cam, screenToTile } = camApi;
    const tl = screenToTile(0, 0), br = screenToTile(cam.canvasW, cam.canvasH);
    mc.strokeStyle = 'rgba(255,255,255,0.8)';
    mc.lineWidth = 1;
    mc.strokeRect(tl.x * s, tl.y * s, (br.x - tl.x) * s, (br.y - tl.y) * s);
  }

  return { render, renderMinimap, ensureSharkPos, tileElevAt };
}
