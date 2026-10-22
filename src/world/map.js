// Procedural tropical island: heightmap -> water / sand / grass / rock,
// scattered palms, a dock on the east coast. Deterministic from seed.

import { makeRng, makeNoise2D, clamp } from '../core/rng.js';

export const WATER = 0, SAND = 1, GRASS = 2, ROCK = 3;

export function generateIsland(seed, size = 72) {
  const rng = makeRng(seed);
  const noise = makeNoise2D(rng);
  const n = size;
  const terrain = new Uint8Array(n * n);
  const height = new Float32Array(n * n);

  const cx = n / 2 + rng.range(-3, 3);
  const cy = n / 2 + rng.range(-3, 3);
  const maxR = n * 0.46;

  // Bumpy superellipse island mask + fbm detail
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const r = Math.sqrt(dx * dx * 1.12 + dy * dy);       // slightly squashed
      const wobble = 0.16 * noise.fbm(x * 0.055 + 40, y * 0.055 + 40, 4);
      const mask = clamp(1 - (r + wobble), 0, 1);
      let h = mask * 1.35;
      h += 0.16 * noise.fbm(x * 0.11 + 9, y * 0.11 + 9, 4) * mask;
      h = clamp(h, 0, 1);
      height[y * n + x] = h;

      if (h < 0.18) terrain[y * n + x] = WATER;
      else if (h < 0.30) terrain[y * n + x] = SAND;
      else if (h > 0.74) terrain[y * n + x] = ROCK;
      else terrain[y * n + x] = GRASS;
    }
  }

  // Clean single-tile islands / noise specks: keep the main landmass + nearby.
  const landComp = labelComponents(terrain, n);
  keepLargestPlusNear(terrain, landComp, n);

  // Dock: sand tile on the east coast (largest x) adjacent to water on the east.
  const dock = findEastCoastDock(terrain, n);

  // Palms on grass near the beach ring, rocks as decorations on ROCK tiles.
  const palms = [];
  const rocks = [];
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const t = terrain[y * n + x];
      const h = height[y * n + x];
      if (t === GRASS && h < 0.5 && nearWater(terrain, n, x, y, 5) && rng.chance(0.10)) {
        palms.push({ x: x + rng.range(-0.35, 0.35), y: y + rng.range(-0.35, 0.35),
                     variant: rng.int(0, 2), phase: rng.range(0, Math.PI * 2), scale: rng.range(0.85, 1.2) });
      } else if (t === ROCK && rng.chance(0.18)) {
        rocks.push({ x: x + rng.range(-0.3, 0.3), y: y + rng.range(-0.3, 0.3), scale: rng.range(0.7, 1.3) });
      }
    }
  }

  return { size: n, seed, terrain, height, palms, rocks, dock };
}

function labelComponents(terrain, n) {
  const label = new Int32Array(n * n).fill(0);
  let next = 1;
  const stack = [];
  for (let i = 0; i < n * n; i++) {
    if (terrain[i] === WATER || label[i]) continue;
    const id = next++;
    stack.push(i); label[i] = id;
    while (stack.length) {
      const p = stack.pop();
      const px = p % n, py = (p / n) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= n || qy >= n) continue;
        const q = qy * n + qx;
        if (terrain[q] !== WATER && !label[q]) { label[q] = id; stack.push(q); }
      }
    }
  }
  return label;
}

function keepLargestPlusNear(terrain, label, n) {
  const sizes = new Map();
  for (let i = 0; i < n * n; i++) {
    if (label[i]) sizes.set(label[i], (sizes.get(label[i]) || 0) + 1);
  }
  let mainId = 0, mainSize = 0;
  for (const [id, s] of sizes) if (s > mainSize) { mainSize = s; mainId = id; }
  for (let i = 0; i < n * n; i++) {
    if (terrain[i] !== WATER && label[i] !== mainId) {
      // keep small satellites with >= 6 tiles, drop specks
      if ((sizes.get(label[i]) || 0) < 6) terrain[i] = WATER;
    }
  }
}

function nearWater(terrain, n, x, y, dist) {
  for (let dy = -dist; dy <= dist; dy++) {
    for (let dx = -dist; dx <= dist; dx++) {
      const qx = x + dx, qy = y + dy;
      if (qx < 0 || qy < 0 || qx >= n || qy >= n) continue;
      if (terrain[qy * n + qx] === WATER) return true;
    }
  }
  return false;
}

function findEastCoastDock(terrain, n) {
  let best = null;
  for (let x = n - 3; x >= Math.floor(n * 0.55); x--) {
    for (let y = 2; y < n - 2; y++) {
      if (terrain[y * n + x] !== SAND && terrain[y * n + x] !== GRASS) continue;
      if (terrain[y * n + x + 1] !== WATER) continue;
      // prefer wider coast here (sand above and below)
      const bonus = (terrain[(y - 1) * n + x] === SAND ? 1 : 0) + (terrain[(y + 1) * n + x] === SAND ? 1 : 0);
      if (!best || bonus > best.bonus) best = { x, y, bonus };
    }
    if (best) break; // easternmost coast column wins
  }
  return best ? { x: best.x, y: best.y } : { x: Math.floor(n / 2), y: Math.floor(n / 2) };
}

// ---- Queries ----

export function inBounds(map, x, y) {
  return x >= 0 && y >= 0 && x < map.size && y < map.size;
}
export function tileAt(map, x, y) {
  if (!inBounds(map, x, y)) return WATER;
  return map.terrain[(y | 0) * map.size + (x | 0)];
}
export function isLand(map, x, y) { return tileAt(map, x, y) !== WATER; }
export function isBuildableTerrain(map, x, y) {
  const t = tileAt(map, x, y);
  return t === SAND || t === GRASS;
}
export function touchesWater(map, x, y, w, h) {
  for (let dy = -1; dy <= h; dy++) {
    for (let dx = -1; dx <= w; dx++) {
      const inside = dx >= 0 && dy >= 0 && dx < w && dy < h;
      if (inside) continue;
      const qx = x + dx, qy = y + dy;
      if (inBounds(map, qx, qy) && tileAt(map, qx, qy) === WATER) return true;
    }
  }
  return false;
}
export function onSandOnly(map, x, y, w, h) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      if (tileAt(map, x + dx, y + dy) !== SAND) return false;
  return true;
}
export function nearWaterCount(map, x, y, dist = 4) {
  return nearWater(map.terrain, map.size, x, y, dist);
}

// A* on walkable land (4-dir). Buildings block via `block` grid (0 = free).
// Start and goal are snapped to the nearest walkable tile (radius <= 3),
// so coastal/fractional positions never dead-end the search.
export function findPath(map, block, sx, sy, tx, ty, maxNodes = 4000) {
  const n = map.size;
  const start = snapWalkable(map, block, Math.round(sx), Math.round(sy));
  const goal = snapWalkable(map, block, Math.round(tx), Math.round(ty));
  if (!start || !goal) return null;
  const s = start.y * n + start.x;
  const e = goal.y * n + goal.x;
  if (s === e) return [];

  const open = [s];
  const cameFrom = new Map([[s, -1]]);
  const g = new Map([[s, 0]]);
  const hEst = (i) => Math.abs((i % n) - goal.x) + Math.abs(((i / n) | 0) - goal.y);
  let expanded = 0;

  while (open.length && expanded < maxNodes) {
    // linear scan min (grid is small)
    let bi = 0, bf = Infinity;
    for (let k = 0; k < open.length; k++) {
      const f = g.get(open[k]) + hEst(open[k]);
      if (f < bf) { bf = f; bi = k; }
    }
    const cur = open.splice(bi, 1)[0];
    expanded++;
    if (cur === e) {
      const path = [];
      let p = cur;
      while (p !== -1 && p !== s) { path.push({ x: p % n, y: (p / n) | 0 }); p = cameFrom.get(p); }
      return path.reverse();
    }
    const cx = cur % n, cy = (cur / n) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const qx = cx + dx, qy = cy + dy;
      if (qx < 0 || qy < 0 || qx >= n || qy >= n) continue;
      const q = qy * n + qx;
      if (!walkableAt(map, block, qx, qy)) continue;
      if (!cameFrom.has(q)) {
        cameFrom.set(q, cur);
        g.set(q, g.get(cur) + 1);
        open.push(q);
      }
    }
  }
  return null;
}

function walkableAt(map, block, x, y) {
  return inBounds(map, x, y) && isLand(map, x, y) && !(block && block[(y | 0) * map.size + (x | 0)] !== 0);
}

function snapWalkable(map, block, x, y) {
  if (walkableAt(map, block, x, y)) return { x, y };
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (walkableAt(map, block, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

// Serialize just the seed + decorations; terrain regenerates on load.
export function serializeMap(map) {
  return {
    size: map.size,
    seed: map.seed,
    palms: map.palms,
    rocks: map.rocks,
    dock: map.dock,
  };
}
