// Isometric camera: world tiles -> screen, pan/zoom, clamped to island bounds.

import { clamp } from '../core/rng.js';

export const TILE_W = 64, TILE_H = 32;

export function makeCamera(canvas, mapSize) {
  const cam = {
    x: 0, y: 0,            // screen offset of the map origin (rotated 45°)
    zoom: 1,
    minZoom: 0.55,
    maxZoom: 2.2,
    canvasW: 0,
    canvasH: 0,
  };

  function tileToScreen(x, y, elevation = 0) {
    return {
      x: cam.x + (x - y) * TILE_W * 0.5 * cam.zoom,
      y: cam.y + (x + y) * TILE_H * 0.5 * cam.zoom - elevation * cam.zoom,
    };
  }

  function screenToTile(sx, sy, elevation = 0) {
    const px = (sx - cam.x) / cam.zoom;
    const py = (sy - cam.y + elevation * cam.zoom) / cam.zoom;
    return { x: (px / (TILE_W * 0.5) + py / (TILE_H * 0.5)) / 2, y: (py / (TILE_H * 0.5) - px / (TILE_W * 0.5)) / 2 };
  }

  function resize(w, h) {
    cam.canvasW = w; cam.canvasH = h;
    clampCenter();
  }

  function clampCenter() {
    const m = mapSize;
    const halfW = TILE_W * 0.5 * cam.zoom;
    const halfH = TILE_H * 0.5 * cam.zoom;
    const pad = 140;
    const mapW = 2 * m * halfW;
    const mapH = 2 * m * halfH;

    // Map diamond on screen: x spans [cam.x - m*halfW, cam.x + m*halfW],
    // y spans [cam.y, cam.y + mapH]. Keep it covering the viewport (with pad).
    if (mapW < cam.canvasW - pad * 2) {
      cam.x = (cam.canvasW - mapW) / 2;
    } else {
      cam.x = clamp(cam.x, cam.canvasW - pad - m * halfW, pad + m * halfW);
    }
    if (mapH < cam.canvasH - pad * 2) {
      cam.y = (cam.canvasH - mapH) / 2;
    } else {
      cam.y = clamp(cam.y, cam.canvasH - pad - mapH, pad);
    }
  }

  function centerOn(x, y) {
    cam.x = cam.canvasW / 2 - (x - y) * TILE_W * 0.5 * cam.zoom;
    cam.y = cam.canvasH / 2 - (x + y) * TILE_H * 0.5 * cam.zoom;
    clampCenter();
  }

  function pan(dx, dy) {
    cam.x += dx; cam.y += dy;
    clampCenter();
  }

  function zoomAt(sx, sy, factor) {
    const before = screenToTile(sx, sy);
    cam.zoom = clamp(cam.zoom * factor, cam.minZoom, cam.maxZoom);
    const after = screenToTile(sx, sy);
    // keep the tile under the cursor stable
    cam.x += (before.x - after.x === 0 && before.y - after.y === 0) ? 0 : 0;
    const b2 = tileToScreen(before.x, before.y);
    cam.x += sx - b2.x;
    cam.y += sy - b2.y;
    clampCenter();
  }

  return { cam, tileToScreen, screenToTile, resize, centerOn, pan, zoomAt };
}
