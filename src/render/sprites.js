// Procedural sprite drawing: every building/unit is drawn by code, no image assets.
// Building sprites are composed once into offscreen canvases and cached.

const SS = 2; // supersample for crisp zoom-in

const cache = new Map();

// ---- low-level iso helpers (work in "screen px at scale 1") ----

function iso(ctx, sx, sy, w, h, color) { // diamond
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + w / 2, sy + h / 2);
  ctx.lineTo(sx, sy + h);
  ctx.lineTo(sx - w / 2, sy + h / 2);
  ctx.closePath();
  ctx.fill();
}

// Box with iso projection: wT/hT in tiles, hPx tall. (x,y) = screen pos of the top tile's top corner.
function box(ctx, x, y, wT, hT, hPx, top, left, right) {
  const W = wT * 32, H = hT * 16; // half-extents of footprint in iso
  // top face
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + W, y + H);
  ctx.lineTo(x, y + 2 * H);
  ctx.lineTo(x - W, y + H);
  ctx.closePath(); ctx.fill();
  // left face (facing SW)
  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(x - W, y + H);
  ctx.lineTo(x, y + 2 * H);
  ctx.lineTo(x, y + 2 * H + hPx);
  ctx.lineTo(x - W, y + H + hPx);
  ctx.closePath(); ctx.fill();
  // right face (facing SE)
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(x + W, y + H);
  ctx.lineTo(x, y + 2 * H);
  ctx.lineTo(x, y + 2 * H + hPx);
  ctx.lineTo(x + W, y + H + hPx);
  ctx.closePath(); ctx.fill();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f) | 0;
  const g = Math.min(255, ((n >> 8) & 255) * f) | 0;
  const b = Math.min(255, (n & 255) * f) | 0;
  return `rgb(${r},${g},${b})`;
}

function shadowEllipse(ctx, x, y, rx, ry, a = 0.25) {
  ctx.fillStyle = `rgba(0,20,30,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function palmInSprite(ctx, x, y, scale, color = '#2e8b57') {
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(x - 1.5 * scale, y - 16 * scale, 3 * scale, 16 * scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2 * scale;
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + (i - 2.5) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 16 * scale);
    ctx.quadraticCurveTo(
      x + Math.cos(ang) * 9 * scale, y - 16 * scale + Math.sin(ang) * 9 * scale - 3 * scale,
      x + Math.cos(ang) * 13 * scale, y - 16 * scale + Math.sin(ang) * 10 * scale + 2 * scale
    );
    ctx.stroke();
  }
}

function umbrella(ctx, x, y, scale, c1 = '#ef476f', c2 = '#ffffff') {
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(x - 0.8 * scale, y - 14 * scale, 1.6 * scale, 14 * scale);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.beginPath();
    ctx.moveTo(x, y - 20 * scale);
    ctx.arc(x, y - 20 * scale, 9 * scale, Math.PI + (i * Math.PI) / 8, Math.PI + ((i + 1) * Math.PI) / 8);
    ctx.closePath();
    ctx.fill();
  }
}

// ---- Building sprite composers ----
// Each receives (ctx, W, H) with origin at bottom-diamond center = (W/2, H-16).
// Returns {ax, ay} anchor offset in final (scale-1) pixels, applied by renderer.

const drawers = {
  bungalow(c, W, H) {
    const x = W / 2, y = H - 64;
    shadowEllipse(c, x, H - 24, 30, 13);
    box(c, x, y - 10, 1.4, 1.4, 26, '#e9c46a', shade('#e9c46a', 0.72), shade('#e9c46a', 0.55));
    // thatch roof
    box(c, x, y - 32, 1.7, 1.7, 12, '#c98f4a', shade('#c98f4a', 0.75), shade('#c98f4a', 0.6));
    iso(c, x, y - 30, 1.7 * 64 * 0.98, 1.7 * 32 * 0.98, '#ddae66');
    c.fillStyle = '#6b4b2a';
    c.fillRect(x - 4, y + 8, 8, 12); // door hint
    palmInSprite(c, x - 30, y + 20, 0.8);
  },
  hotel(c, W, H) {
    const x = W / 2, y = H - 88;
    shadowEllipse(c, x, H - 24, 46, 18);
    box(c, x, y, 2.2, 2.2, 66, '#f1faee', shade('#f1faee', 0.72), shade('#f1faee', 0.55));
    // windows grid on front faces
    c.fillStyle = '#48cae4';
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 3; k++) {
        const wx = x - 46 + k * 18 + r * 6, wy = y + 76 + r * 14;
        c.fillRect(wx, wy, 7, 8); // left face
        const wx2 = x + 8 + k * 18 - r * 6;
        c.fillRect(wx2, wy, 7, 8); // right face
      }
    }
    box(c, x, y - 14, 2.4, 2.4, 10, '#e76f51', shade('#e76f51', 0.75), shade('#e76f51', 0.6));
    iso(c, x, y - 12, 2.4 * 64 * 0.95, 2.4 * 32 * 0.95, '#f4a261');
  },
  luxhotel(c, W, H) {
    const x = W / 2, y = H - 100;
    shadowEllipse(c, x, H - 24, 58, 22);
    box(c, x, y, 2.9, 2.9, 88, '#f8f9fa', shade('#f8f9fa', 0.74), shade('#f8f9fa', 0.56));
    c.fillStyle = '#90e0ef';
    for (let r = 0; r < 6; r++) {
      for (let k = 0; k < 4; k++) {
        c.fillRect(x - 62 + k * 20 + r * 7, y + 96 + r * 13, 8, 9);
        c.fillRect(x + 6 + k * 20 - r * 7, y + 96 + r * 13, 8, 9);
      }
    }
    box(c, x, y - 16, 3.1, 3.1, 12, '#ffd166', shade('#ffd166', 0.78), shade('#ffd166', 0.62));
    iso(c, x, y - 14, 3.1 * 64 * 0.95, 3.1 * 32 * 0.95, '#ffe29a');
    umbrella(c, x - 40, y + 30, 1);
    umbrella(c, x + 42, y + 34, 0.9, '#06d6a0', '#eafff7');
  },
  drinks(c, W, H) {
    const x = W / 2, y = H - 44;
    shadowEllipse(c, x, H - 24, 20, 9);
    box(c, x, y, 0.8, 0.8, 20, '#ffe8b6', shade('#ffe8b6', 0.7), shade('#ffe8b6', 0.55));
    umbrella(c, x, y - 8, 1.2, '#48cae4', '#eafcff');
    c.fillStyle = '#ef476f';
    c.fillRect(x - 5, y + 6, 10, 6);
  },
  icecream(c, W, H) {
    const x = W / 2, y = H - 44;
    shadowEllipse(c, x, H - 24, 20, 9);
    box(c, x, y, 0.8, 0.8, 22, '#fff1e6', shade('#fff1e6', 0.7), shade('#fff1e6', 0.55));
    umbrella(c, x, y - 10, 1.2, '#ff9f1c', '#fff5e1');
    // cone
    c.fillStyle = '#e09f3e';
    c.beginPath();
    c.moveTo(x - 4, y + 2); c.lineTo(x + 4, y + 2); c.lineTo(x, y + 12);
    c.closePath(); c.fill();
    c.fillStyle = '#fff0f3';
    c.beginPath(); c.arc(x, y - 1, 4.4, 0, 7); c.fill();
  },
  bbq(c, W, H) {
    const x = W / 2, y = H - 48;
    shadowEllipse(c, x, H - 24, 26, 11);
    box(c, x, y, 1.5, 1.5, 12, '#adb5bd', shade('#adb5bd', 0.72), shade('#adb5bd', 0.55));
    c.fillStyle = '#495057';
    c.fillRect(x - 10, y - 12, 20, 9);
    // grill glow
    c.fillStyle = 'rgba(255,120,30,0.75)';
    c.fillRect(x - 8, y - 10, 16, 4);
    c.fillStyle = 'rgba(200,200,200,0.5)';
    c.beginPath(); c.arc(x + 4, y - 18, 5, 0, 7); c.fill();
    c.fillStyle = 'rgba(200,200,200,0.35)';
    c.beginPath(); c.arc(x + 9, y - 26, 7, 0, 7); c.fill();
  },
  cafe(c, W, H) {
    const x = W / 2, y = H - 62;
    shadowEllipse(c, x, H - 24, 30, 13);
    box(c, x, y, 1.5, 1.5, 30, '#ffe5d9', shade('#ffe5d9', 0.72), shade('#ffe5d9', 0.55));
    box(c, x, y - 16, 1.8, 1.8, 8, '#e07a5f', shade('#e07a5f', 0.75), shade('#e07a5f', 0.6));
    iso(c, x, y - 14, 1.8 * 64 * 0.95, 1.8 * 32 * 0.95, '#f2b29b');
    c.fillStyle = '#f9c74f';
    c.fillRect(x - 22, y + 12, 8, 10);
    c.fillRect(x + 14, y + 12, 8, 10);
  },
  beachbar(c, W, H) {
    const x = W / 2, y = H - 62;
    shadowEllipse(c, x, H - 24, 30, 13);
    box(c, x, y, 1.5, 1.5, 28, '#ffd6a5', shade('#ffd6a5', 0.72), shade('#ffd6a5', 0.55));
    // roof of palm leaves
    c.strokeStyle = '#2a9d8f'; c.lineWidth = 4;
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI + (i / 6) * Math.PI;
      c.beginPath();
      c.moveTo(x, y - 26);
      c.lineTo(x + Math.cos(ang) * 30, y - 26 + Math.sin(ang) * 16 + 6);
      c.stroke();
    }
    c.fillStyle = '#ef476f';
    c.fillRect(x - 6, y + 8, 12, 12);
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(x + 9, y + 4, 3, 0, 7); c.fill();
  },
  restaurant(c, W, H) {
    const x = W / 2, y = H - 78;
    shadowEllipse(c, x, H - 24, 42, 16);
    box(c, x, y, 2.1, 2.1, 42, '#f8edeb', shade('#f8edeb', 0.73), shade('#f8edeb', 0.55));
    box(c, x, y - 18, 2.3, 2.3, 9, '#9d4edd', shade('#9d4edd', 0.78), shade('#9d4edd', 0.62));
    iso(c, x, y - 16, 2.3 * 64 * 0.95, 2.3 * 32 * 0.95, '#c77dff');
    // candle tables
    for (const [dx, dy] of [[-26, 26], [26, 26], [0, 38]]) {
      c.fillStyle = '#d9ed92';
      c.beginPath(); c.ellipse(x + dx, y + dy, 6, 3, 0, 0, 7); c.fill();
      c.fillStyle = '#ffb703';
      c.fillRect(x + dx - 1, y + dy - 6, 2, 4);
    }
  },
  loungers(c, W, H) {
    const x = W / 2, y = H - 40;
    iso(c, x, y + 12, 100, 50, '#fde8c8'); // sand pad
    for (const [dx, dy] of [[-24, 12], [4, 4], [-8, 26], [20, 20]]) {
      c.fillStyle = '#ef476f';
      c.fillRect(x + dx, y + dy, 18, 6);
      c.fillStyle = '#fff0f3';
      c.fillRect(x + dx, y + dy - 2, 18, 3);
    }
    umbrella(c, x - 18, y + 14, 1.1);
    umbrella(c, x + 16, y + 22, 0.9, '#06d6a0', '#eafff7');
  },
  volley(c, W, H) {
    const x = W / 2, y = H - 44;
    iso(c, x, y + 14, 128, 64, '#f7e1b5');
    c.strokeStyle = '#e0a458'; c.lineWidth = 2;
    c.strokeRect(x - 46, y + 4, 92, 28); // court outline (iso-ish)
    // net
    c.strokeStyle = '#fafafa'; c.lineWidth = 1.6;
    for (let i = 0; i <= 8; i++) {
      c.beginPath(); c.moveTo(x - 12 + i * 3, y + 2); c.lineTo(x - 12 + i * 3, y - 14); c.stroke();
    }
    c.beginPath(); c.moveTo(x - 12, y - 14); c.lineTo(x + 12, y - 14); c.stroke();
    c.fillStyle = '#89d2ff';
    c.beginPath(); c.arc(x + 20, y - 2, 3.4, 0, 7); c.fill();
  },
  pool(c, W, H) {
    const x = W / 2, y = H - 52;
    iso(c, x, y + 10, 140, 70, '#d8f3dc'); // deck
    iso(c, x, y + 14, 104, 52, '#3aa8d8'); // water
    iso(c, x - 16, y + 6, 40, 20, '#57cc99'); // shallow
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x - 30, y + 16); c.lineTo(x - 14, y + 24); c.stroke();
    c.beginPath(); c.moveTo(x - 6, y + 12); c.lineTo(x + 10, y + 20); c.stroke();
    umbrella(c, x - 34, y + 16, 1.15);
    umbrella(c, x + 36, y + 26, 1.0, '#06d6a0', '#eafff7');
  },
  jacuzzi(c, W, H) {
    const x = W / 2, y = H - 46;
    iso(c, x, y + 12, 84, 42, '#cad2c5');
    iso(c, x, y + 14, 62, 31, '#4ea5d9');
    c.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 5; i++) {
      c.beginPath(); c.arc(x - 14 + i * 7, y + 16 + (i % 2) * 4, 1.6, 0, 7); c.fill();
    }
    c.strokeStyle = '#adb5bd'; c.lineWidth = 2.5;
    c.strokeRect(x - 34, y + 2, 6, 16);
    c.strokeRect(x + 28, y + 4, 6, 16);
  },
  pedalo(c, W, H) {
    const x = W / 2, y = H - 46;
    iso(c, x, y + 14, 92, 46, '#f1faee');
    for (const [dx, col] of [[-14, '#ef476f'], [14, '#ffd166']]) {
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(x + dx, y + 18, 16, 7, 0, 0, 7);
      c.fill();
      c.fillStyle = shade(col, 0.6);
      c.fillRect(x + dx - 10, y + 6, 20, 6);
      c.strokeStyle = '#495057'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(x + dx - 8, y + 6); c.lineTo(x + dx + 8, y + 6); c.stroke();
    }
  },
  surf(c, W, H) {
    const x = W / 2, y = H - 46;
    iso(c, x, y + 14, 92, 46, '#f1faee');
    c.fillStyle = '#e63946';
    c.beginPath(); c.ellipse(x + 16, y + 20, 18, 6, -0.3, 0, 7); c.fill();
    c.fillStyle = '#457b9d';
    c.beginPath(); c.ellipse(x - 12, y + 24, 17, 5.5, 0.25, 0, 7); c.fill();
    c.fillStyle = '#f1c40f';
    c.beginPath(); c.ellipse(x + 2, y + 12, 15, 5, -0.1, 0, 7); c.fill();
    c.strokeStyle = '#6c757d'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 30, y + 8); c.lineTo(x + 30, y + 8); c.stroke(); // rack
  },
  stage(c, W, H) {
    const x = W / 2, y = H - 56;
    shadowEllipse(c, x, H - 24, 38, 15);
    box(c, x, y, 2.2, 1.4, 16, '#8e9aaf', shade('#8e9aaf', 0.72), shade('#8e9aaf', 0.55));
    // backdrop
    c.fillStyle = '#2274a5';
    c.fillRect(x - 44, y - 34, 88, 36);
    c.fillStyle = '#e83f6f';
    c.beginPath(); c.arc(x, y - 18, 9, 0, 7); c.fill();
    c.fillStyle = '#ffd166';
    c.font = 'bold 11px sans-serif'; c.textAlign = 'center';
    c.fillText('♪', x - 22, y - 12);
    c.fillText('♫', x + 22, y - 8);
    // speakers
    c.fillStyle = '#343a40';
    c.fillRect(x - 56, y + 4, 10, 18);
    c.fillRect(x + 46, y + 4, 10, 18);
  },
  disco(c, W, H) {
    const x = W / 2, y = H - 80;
    shadowEllipse(c, x, H - 24, 46, 18);
    box(c, x, y, 2.2, 2.2, 48, '#22223b', shade('#22223b', 1.6), shade('#22223b', 1.3));
    box(c, x, y - 16, 2.5, 2.5, 8, '#4a4e69', shade('#4a4e69', 1.5), shade('#4a4e69', 1.2));
    iso(c, x, y - 14, 2.5 * 64 * 0.94, 2.5 * 32 * 0.94, '#9a8c98');
    // neon sign
    c.fillStyle = '#f72585';
    c.font = 'bold 12px sans-serif'; c.textAlign = 'center';
    c.fillText('D I S C O', x, y + 26);
    // door light
    c.fillStyle = '#4cc9f0';
    c.fillRect(x - 6, y + 34, 12, 14);
    // disco ball
    c.strokeStyle = '#dee2e6'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x, y - 26); c.stroke();
    c.fillStyle = '#e0e0e0';
    c.beginPath(); c.arc(x, y - 30, 5, 0, 7); c.fill();
  },
  loo(c, W, H) {
    const x = W / 2, y = H - 40;
    shadowEllipse(c, x, H - 24, 18, 8);
    box(c, x, y, 0.8, 0.8, 24, '#edf6f9', shade('#edf6f9', 0.7), shade('#edf6f9', 0.55));
    c.fillStyle = '#219ebc';
    c.fillRect(x - 5, y + 4, 10, 12);
    c.fillStyle = '#023047';
    c.font = 'bold 9px sans-serif'; c.textAlign = 'center';
    c.fillText('WC', x, y - 4);
  },
  shower(c, W, H) {
    const x = W / 2, y = H - 38;
    shadowEllipse(c, x, H - 24, 16, 7);
    c.strokeStyle = '#6c757d'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 8, y + 16); c.lineTo(x - 8, y - 18); c.lineTo(x + 6, y - 18); c.stroke();
    c.fillStyle = '#4cc9f0';
    c.beginPath(); c.arc(x + 6, y - 14, 3.6, 0, 7); c.fill();
    c.fillStyle = 'rgba(120, 200, 255, 0.55)';
    c.fillRect(x - 12, y - 8, 5, 22);
  },
  store(c, W, H) {
    const x = W / 2, y = H - 58;
    shadowEllipse(c, x, H - 24, 30, 12);
    box(c, x, y, 1.4, 1.4, 26, '#ffe8d6', shade('#ffe8d6', 0.72), shade('#ffe8d6', 0.55));
    // striped awning
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? '#e63946' : '#f1faee';
      c.beginPath();
      c.moveTo(x - 36 + i * 12, y + 12);
      c.lineTo(x - 30 + i * 12, y + 24);
      c.lineTo(x - 18 + i * 12, y + 18);
      c.lineTo(x - 24 + i * 12, y + 6);
      c.closePath(); c.fill();
    }
    c.fillStyle = '#a8dadc';
    c.fillRect(x - 8, y + 8, 16, 12);
  },
  baywatch(c, W, H) {
    const x = W / 2, y = H - 52;
    shadowEllipse(c, x, H - 24, 16, 7);
    c.fillStyle = '#f1faee';
    c.fillRect(x - 9, y + 10, 18, 6); // platform
    // legs
    c.strokeStyle = '#d2d2d2'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 7, y + 14); c.lineTo(x - 5, y - 6); c.stroke();
    c.beginPath(); c.moveTo(x + 7, y + 14); c.lineTo(x + 5, y - 6); c.stroke();
    c.beginPath(); c.moveTo(x - 6, y + 4); c.lineTo(x + 6, y + 4); c.stroke();
    // cabin
    c.fillStyle = '#e63946';
    c.fillRect(x - 11, y - 26, 22, 20);
    c.fillStyle = '#fff';
    c.font = 'bold 8px sans-serif'; c.textAlign = 'center';
    c.fillText('RESCUE', x, y - 14);
    c.fillStyle = '#a8dadc';
    c.beginPath(); c.moveTo(x - 13, y - 26); c.lineTo(x, y - 34); c.lineTo(x + 13, y - 26); c.closePath(); c.fill();
  },
  firstaid(c, W, H) {
    const x = W / 2, y = H - 56;
    shadowEllipse(c, x, H - 24, 28, 12);
    box(c, x, y, 1.4, 1.4, 26, '#ffffff', shade('#ffffff', 0.75), shade('#ffffff', 0.58));
    c.fillStyle = '#e63946';
    c.fillRect(x - 3, y - 4, 6, 16);
    c.fillRect(x - 8, y + 1, 16, 6);
    box(c, x, y - 12, 1.6, 1.6, 5, '#e63946', shade('#e63946', 0.78), shade('#e63946', 0.62));
  },
  cleanershack(c, W, H) {
    const x = W / 2, y = H - 50;
    shadowEllipse(c, x, H - 24, 26, 11);
    box(c, x, y, 1.3, 1.3, 20, '#b8c0ff', shade('#b8c0ff', 0.72), shade('#b8c0ff', 0.55));
    iso(c, x, y - 6, 1.5 * 64 * 0.9, 1.5 * 32 * 0.9, '#7c90f0');
    c.strokeStyle = '#495057'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(x + 16, y + 18); c.lineTo(x + 26, y - 6); c.stroke();
    c.fillStyle = '#ffb703';
    c.fillRect(x - 4, y + 6, 8, 8);
  },
  security(c, W, H) {
    const x = W / 2, y = H - 54;
    shadowEllipse(c, x, H - 24, 28, 12);
    box(c, x, y, 1.3, 1.3, 24, '#cdb4db', shade('#cdb4db', 0.72), shade('#cdb4db', 0.55));
    box(c, x, y - 10, 1.5, 1.5, 7, '#5a189a', shade('#5a189a', 0.8), shade('#5a189a', 0.65));
    c.fillStyle = '#3c096c';
    c.font = 'bold 9px sans-serif'; c.textAlign = 'center';
    c.fillText('SECURITY', x, y + 16);
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(x + 16, y + 2, 3.4, 0, 7); c.fill();
  },
  workshop(c, W, H) {
    const x = W / 2, y = H - 54;
    shadowEllipse(c, x, H - 24, 28, 12);
    box(c, x, y, 1.3, 1.3, 24, '#ffe169', shade('#ffe169', 0.72), shade('#ffe169', 0.55));
    iso(c, x, y - 10, 1.5 * 64 * 0.9, 1.5 * 32 * 0.9, '#b5838d');
    // gear
    c.fillStyle = '#6c757d';
    c.beginPath(); c.arc(x - 14, y + 14, 5, 0, 7); c.fill();
    c.fillStyle = '#ffe169';
    c.beginPath(); c.arc(x - 14, y + 14, 2.2, 0, 7); c.fill();
    c.fillStyle = '#adb5bd';
    c.fillRect(x + 8, y + 8, 10, 8);
  },
  palm(c, W, H) {
    palmInSprite(c, W / 2, H - 22, 1.25);
    shadowEllipse(c, W / 2, H - 20, 12, 5, 0.2);
  },
  flowerbed(c, W, H) {
    const x = W / 2, y = H - 30;
    iso(c, x, y + 6, 40, 20, '#8a5a44');
    const cols = ['#ef476f', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585'];
    for (let i = 0; i < 7; i++) {
      c.fillStyle = cols[i % cols.length];
      const fx = x - 14 + (i * 5) % 30, fy = y + 2 + ((i * 7) % 10);
      c.beginPath(); c.arc(fx, fy, 2.6, 0, 7); c.fill();
      c.fillStyle = '#2d6a4f';
      c.fillRect(fx - 0.8, fy + 1, 1.6, 3.4);
    }
  },
  lamp(c, W, H) {
    const x = W / 2, y = H - 30;
    shadowEllipse(c, x, H - 24, 8, 4, 0.18);
    c.strokeStyle = '#495057'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x, y - 22); c.stroke();
    c.fillStyle = '#ffd166';
    c.beginPath(); c.ellipse(x, y - 26, 4.4, 5.6, 0, 0, 7); c.fill();
    c.strokeStyle = '#495057'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x - 4, y - 30); c.lineTo(x + 4, y - 30); c.stroke();
  },
};

const FALLBACK = (c, W, H, def) => {
  const x = W / 2, y = H - 50;
  box(c, x, y, def.w * 0.8, def.h * 0.8, 24, '#cccccc', '#999999', '#777777');
};

export function getBuildingSprite(def) {
  if (cache.has(def.id)) return cache.get(def.id);
  const w = (def.w + def.h) * 32 + 80;
  const h = (def.w + def.h) * 16 + 130;
  const cnv = document.createElement('canvas');
  cnv.width = w * SS; cnv.height = h * SS;
  const c = cnv.getContext('2d');
  c.scale(SS, SS);
  (drawers[def.id] || FALLBACK)(c, w, h, def);
  const sprite = { canvas: cnv, w, h };
  cache.set(def.id, sprite);
  return sprite;
}

// Small card preview for the build bar.
export function getBuildingThumb(def, tw = 84, th = 64) {
  const s = getBuildingSprite(def);
  const cnv = document.createElement('canvas');
  cnv.width = tw * 2; cnv.height = th * 2;
  const c = cnv.getContext('2d');
  c.scale(2, 2);
  // fit sprite into thumb
  const k = Math.min((tw - 6) / s.w, (th - 6) / s.h) * 0.94;
  const dw = s.w * k, dh = s.h * k;
  c.drawImage(s.canvas, (tw - dw) / 2, (th - dh) / 2 + 2, dw, dh);
  return cnv;
}

// ---- Units (guests/staff) drawn directly, cached by kind+color ----

const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

export function drawGuest(ctx, sx, sy, g, zoom, time) {
  const z = zoom;
  const bob = g.state === 'walk' || g.state === 'leave' ? Math.abs(Math.sin(g.anim)) * 2.2 : Math.sin(time * 2 + g.uid) * 0.5;
  const h = 13 * z;
  ctx.fillStyle = 'rgba(0,20,30,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 3.6 * z, 1.6 * z, 0, 0, 7);
  ctx.fill();

  const skin = SKIN[g.uid % SKIN.length];
  // legs
  ctx.strokeStyle = skin; ctx.lineWidth = 1.6 * z;
  ctx.beginPath();
  ctx.moveTo(sx - 1.4 * z, sy - h * 0.4);
  ctx.lineTo(sx - 1.4 * z + Math.sin(g.anim) * 1.2 * z, sy);
  ctx.moveTo(sx + 1.4 * z, sy - h * 0.4);
  ctx.lineTo(sx + 1.4 * z - Math.sin(g.anim) * 1.2 * z, sy);
  ctx.stroke();
  // swimsuit torso
  ctx.fillStyle = g.color;
  ctx.beginPath();
  ctx.ellipse(sx, sy - h * 0.62 - bob * z * 0.4, 2.8 * z, 3.4 * z, 0, 0, 7);
  ctx.fill();
  // head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(sx, sy - h - bob * z * 0.4, 2.6 * z, 0, 7);
  ctx.fill();
  // drunk indicator
  if (g.drunk > 0) {
    ctx.font = `${7 * z}px sans-serif`;
    ctx.fillText('🍺', sx + 2.6 * z, sy - h - 5 * z);
  }
  // thought bubble
  if (g.thought) {
    const icons = { 'th.hungry': '🍖', 'th.thirsty': '🥤', 'th.bored': '💤', 'th.tired': '😴', 'th.toilet': '🚽', 'th.dirty': '🤢', 'th.happy': '😀', 'th.angry': '😡' };
    const ico = icons[g.thought];
    if (ico) {
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath();
      ctx.arc(sx + 8 * z, sy - h - 9 * z, 5.6 * z, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + 4.4 * z, sy - h - 3.4 * z, 1.6 * z, 0, 7);
      ctx.fill();
      ctx.font = `${7.4 * z}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ico, sx + 8 * z, sy - h - 8.8 * z);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }
}

const STAFF_LOOK = {
  cleaner: { color: '#ffb703', emoji: '🧹' },
  mechanic: { color: '#8d99ae', emoji: '🔧' },
  lifeguard: { color: '#ef476f', emoji: '🛟' },
  security: { color: '#577399', emoji: '👮' },
  entertainer: { color: '#f72585', emoji: '🎤' },
};

export function drawStaff(ctx, sx, sy, u, zoom) {
  const z = zoom;
  const look = STAFF_LOOK[u.role];
  const h = 14 * z;
  ctx.fillStyle = 'rgba(0,20,30,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 3.8 * z, 1.7 * z, 0, 0, 7);
  ctx.fill();
  const bob = Math.abs(Math.sin(u.anim)) * 2.0;
  // legs (trousers)
  ctx.strokeStyle = '#34495e'; ctx.lineWidth = 1.8 * z;
  ctx.beginPath();
  ctx.moveTo(sx - 1.5 * z, sy - h * 0.4); ctx.lineTo(sx - 1.5 * z, sy);
  ctx.moveTo(sx + 1.5 * z, sy - h * 0.4); ctx.lineTo(sx + 1.5 * z, sy);
  ctx.stroke();
  // torso
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.ellipse(sx, sy - h * 0.6 - bob * z * 0.3, 3 * z, 3.8 * z, 0, 0, 7);
  ctx.fill();
  // head + cap
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(sx, sy - h - bob * z * 0.3, 2.6 * z, 0, 7);
  ctx.fill();
  ctx.font = `${8 * z}px sans-serif`;
  ctx.fillText(look.emoji, sx + 3 * z, sy - h - 2 * z);
}
