'use strict';
// Skerry League: Spindrift, drawn (a 2D canvas of its own, #sdCv): the Sluice seen side-on, as if the near wall of the
// lock were cut away. Behind, the back wall's ashlar with three relieving arches, the weed of the tide line, lanterns
// and the chains of the old gate gear under the vault; the two lock gates, each with its lintel beam and its side's
// lamp; the water, clear enough to see a ship's keel and the buoy under the surface; the ships in profile in their
// skins with their sails in their side's colour; the ball; the gale buoys; spray, wakes and the goal's burst.
// src/lgside.js owns the state; this only reads it. The still parts are drawn once into two world-sized canvases
// (behind and in front of the water) at the scale in use, and laid down each frame.
// The camera shows the whole chamber when the screen is wide enough; on a tall narrow screen it follows the play.

var SD2 = { cv: null, c: null, k: 1, camX: 0, camY: 0, back: null, front: null, bk: 0, fx: [], flash: [0, 0], w: 0, h: 0, dpr: 1, t: 0 };
const SD_SPAN = { x0: -SDC.W - SDC.GD - 8, x1: SDC.W + SDC.GD + 8, y0: -SDC.D - 6, y1: SDC.H + 8 };
// (the still layers reach well past what's fitted, so a screen of any shape is stone to its edges)
const SD_LAY = { x0: SD_SPAN.x0 - 60, x1: SD_SPAN.x1 + 60, y0: SD_SPAN.y0 - 90, y1: SD_SPAN.y1 + 90 };

function sdResize() {
  const cv = SD2.cv = $('sdCv'); if (!cv) return;
  const dpr = SD2.dpr = Math.min(2, window.devicePixelRatio || 1), w = SD2.w = innerWidth, h = SD2.h = innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); SD2.c = cv.getContext('2d');
  const sx = w / (SD_SPAN.x1 - SD_SPAN.x0), sy = (h * 0.9) / (SD_SPAN.y1 - SD_SPAN.y0);
  // (a tall screen: the chamber's full height, and the camera follows along it)
  SD2.k = w / h < 1.25 ? Math.max(Math.min(sx, sy), sy * 0.62) : Math.min(sx, sy);
  SD2.back = null;
}
// a seeded random, so the stones lie the same every time
function sdRng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function sdLayers() {
  const k = SD2.k * SD2.dpr, X0 = SD_LAY.x0, Y1 = SD_LAY.y1, Wd = Math.ceil((SD_LAY.x1 - X0) * k), Ht = Math.ceil((Y1 - SD_LAY.y0) * k);
  const mk = () => { const c = document.createElement('canvas'); c.width = Wd; c.height = Ht; return c; };
  const X = x => (x - X0) * k, Y = y => (Y1 - y) * k, { W, H, D, GH, GD } = SDC;
  // behind the water: the back wall, the arches, the weed, the vault's ribs, the inside of the gates
  const B = mk(), b = B.getContext('2d'), rnd = sdRng(7);
  let g = b.createLinearGradient(0, Y(H), 0, Y(-D)); g.addColorStop(0, '#2b2430'); g.addColorStop(0.55, '#3a3138'); g.addColorStop(1, '#1b2226');
  b.fillStyle = g; b.fillRect(X(-W), Y(H), (2 * W) * k, (H + D) * k);
  // the ashlar
  for (let y = -D; y < H; y += 6) {
    const off = ((y / 6) & 1) * 5;
    for (let x = -W - off; x < W; x += 10) {
      const l = 22 + rnd() * 14 | 0; b.fillStyle = `rgba(${l + 30},${l + 22},${l + 26},${0.35 + rnd() * 0.25})`;
      b.fillRect(X(x) + 1, Y(y + 6) + 1, 10 * k - 2, 6 * k - 2);
    }
  }
  // three relieving arches, each with a barred window on the dusk outside
  for (const ax of [-62, 0, 62]) {
    const r = 22, cy = 34;
    b.fillStyle = 'rgba(10,8,14,0.55)'; b.beginPath(); b.moveTo(X(ax - r), Y(8)); b.lineTo(X(ax - r), Y(cy)); b.arc(X(ax), Y(cy), r * k, Math.PI, 0); b.lineTo(X(ax + r), Y(8)); b.closePath(); b.fill();
    b.strokeStyle = 'rgba(150,130,120,0.35)'; b.lineWidth = 2.2 * k; b.beginPath(); b.arc(X(ax), Y(cy), (r + 1.5) * k, Math.PI, 0); b.stroke();
    for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8; b.strokeStyle = 'rgba(0,0,0,0.25)'; b.lineWidth = 0.6 * k; b.beginPath(); b.moveTo(X(ax + Math.cos(a) * r), Y(cy - Math.sin(a) * r)); b.lineTo(X(ax + Math.cos(a) * (r + 3)), Y(cy - Math.sin(a) * (r + 3))); b.stroke(); }
    if (ax === 0) continue;
    const wx = ax, wy = 44, ww = 9, wh = 12;
    g = b.createLinearGradient(0, Y(wy + wh), 0, Y(wy)); g.addColorStop(0, '#36355f'); g.addColorStop(0.6, '#b0667a'); g.addColorStop(1, '#f2a25e');
    b.fillStyle = g; b.beginPath(); b.moveTo(X(wx - ww / 2), Y(wy)); b.lineTo(X(wx - ww / 2), Y(wy + wh - ww / 2)); b.arc(X(wx), Y(wy + wh - ww / 2), ww / 2 * k, Math.PI, 0); b.lineTo(X(wx + ww / 2), Y(wy)); b.closePath(); b.fill();
    b.fillStyle = 'rgba(255,240,210,0.9)'; b.beginPath(); b.arc(X(wx + 2), Y(wy + 8), 0.9 * k, 0, 7); b.fill();   // (a star)
    b.strokeStyle = '#120e12'; b.lineWidth = 0.8 * k; for (let i = -1; i <= 1; i++) { b.beginPath(); b.moveTo(X(wx + i * 2.6), Y(wy)); b.lineTo(X(wx + i * 2.6), Y(wy + wh)); b.stroke(); }
  }
  // the middle arch: the Light's own badge, a lamp in a ring, worn into the stone
  b.strokeStyle = 'rgba(230,200,140,0.28)'; b.lineWidth = 1.2 * k; b.beginPath(); b.arc(X(0), Y(34), 9 * k, 0, 7); b.stroke();
  b.fillStyle = 'rgba(230,200,140,0.22)'; b.beginPath(); b.moveTo(X(-2.5), Y(28)); b.lineTo(X(-1.5), Y(38)); b.lineTo(X(1.5), Y(38)); b.lineTo(X(2.5), Y(28)); b.closePath(); b.fill();
  b.beginPath(); b.arc(X(0), Y(39.5), 2 * k, 0, 7); b.fill();
  // the tide line's weed and the wet below it
  g = b.createLinearGradient(0, Y(7), 0, Y(-2)); g.addColorStop(0, 'rgba(40,70,40,0)'); g.addColorStop(0.5, 'rgba(46,82,44,0.55)'); g.addColorStop(1, 'rgba(20,40,30,0.7)');
  b.fillStyle = g; b.fillRect(X(-W), Y(7), 2 * W * k, 9 * k);
  for (let x = -W; x < W; x += 1.6) { b.strokeStyle = `rgba(${50 + rnd() * 30 | 0},${90 + rnd() * 40 | 0},${40 + rnd() * 20 | 0},0.6)`; b.lineWidth = 0.5 * k; b.beginPath(); b.moveTo(X(x), Y(2)); b.lineTo(X(x + (rnd() - 0.5) * 1.5), Y(2 + 1.5 + rnd() * 4)); b.stroke(); }
  // the vault's ribs and the chains of the gate gear
  for (let x = -W + 20; x < W; x += 40) { b.strokeStyle = 'rgba(0,0,0,0.35)'; b.lineWidth = 3 * k; b.beginPath(); b.moveTo(X(x), Y(H)); b.lineTo(X(x), Y(H - 5)); b.stroke(); }
  for (const cx of [-96, -30, 30, 96]) {
    const len = 12 + rnd() * 10; b.strokeStyle = 'rgba(70,64,62,0.85)'; b.lineWidth = 0.7 * k;
    for (let y = H; y > H - len; y -= 1.6) { b.beginPath(); b.ellipse(X(cx), Y(y - 0.8), 0.5 * k, 0.9 * k, 0, 0, 7); b.stroke(); }
    b.fillStyle = 'rgba(60,54,52,0.9)'; b.beginPath(); b.moveTo(X(cx - 1.5), Y(H - len)); b.lineTo(X(cx + 1.5), Y(H - len)); b.lineTo(X(cx), Y(H - len - 3)); b.closePath(); b.fill();
  }
  // the gates' insides: the dark of the culvert, a rope net, the iron grate at the back
  const GL = SDC.GL;
  for (const sg of [-1, 1]) {
    const x0 = sg > 0 ? W : -W - GD;
    b.fillStyle = '#0d1418'; b.fillRect(X(x0), Y(GH), GD * k, (GH - GL) * k);
    b.strokeStyle = 'rgba(220,200,160,0.22)'; b.lineWidth = 0.5 * k;
    for (let y = GL; y < GH; y += 3) { b.beginPath(); b.moveTo(X(x0), Y(y)); b.lineTo(X(x0 + GD), Y(y)); b.stroke(); }
    for (let x = x0; x <= x0 + GD; x += 3) { b.beginPath(); b.moveTo(X(x), Y(GL)); b.lineTo(X(x), Y(GH)); b.stroke(); }
  }
  // in front of the water: the end walls above the lintels and behind the gates, the floor, the vault, the beams
  const F = mk(), f = F.getContext('2d'), rn2 = sdRng(11);
  const stone = (x0, y0, x1, y1) => {
    g = f.createLinearGradient(X(x0), 0, X(x1), 0); g.addColorStop(0, '#4a4248'); g.addColorStop(1, '#2e292f');
    f.fillStyle = g; f.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k);
    f.strokeStyle = 'rgba(0,0,0,0.35)'; f.lineWidth = 0.6 * k;
    for (let y = Math.ceil(y0 / 7) * 7; y < y1; y += 7) { f.beginPath(); f.moveTo(X(x0), Y(y)); f.lineTo(X(x1), Y(y)); f.stroke(); const off = ((y / 7) & 1) * 6; for (let x = Math.floor(x0 / 12) * 12 + off; x < x1; x += 12) { if (x < x0) continue; f.beginPath(); f.moveTo(X(x), Y(y)); f.lineTo(X(x), Y(Math.min(y1, y + 7))); f.stroke(); } }
    for (let i = 0; i < (x1 - x0) * (y1 - y0) / 60; i++) { f.fillStyle = `rgba(255,240,220,${rn2() * 0.05})`; f.fillRect(X(x0 + rn2() * (x1 - x0)), Y(y0 + rn2() * (y1 - y0)), 2 * k, 1.2 * k); }
  };
  const XE = SD_LAY.x1;
  stone(X0, SDC.H, XE, Y1); stone(X0, SD_LAY.y0, XE, -D);
  stone(W, GH, XE, H); stone(X0, GH, -W, H); stone(W + GD, -D, XE, GH); stone(X0, -D, -W - GD, GH);
  stone(W, -D, W + GD, GL); stone(-W - GD, -D, -W, GL);   // (below each gate's sill: the gates stand above the water)
  // the vault's arch over the chamber, and the sea's own light through a grating far above
  f.fillStyle = 'rgba(0,0,0,0.25)'; f.fillRect(X(-W), Y(H + 4), 2 * W * k, 4 * k);
  for (let x = -W + 20; x < W; x += 40) { f.fillStyle = 'rgba(255,220,180,0.06)'; f.fillRect(X(x - 3), Y(H + 30), 6 * k, 30 * k); }
  // the edges of the stone, lit from the lanterns
  f.strokeStyle = 'rgba(255,210,160,0.35)'; f.lineWidth = 1.1 * k;
  f.beginPath(); f.moveTo(X(-W), Y(H)); f.lineTo(X(W), Y(H)); f.moveTo(X(-W), Y(-D)); f.lineTo(X(W), Y(-D)); f.moveTo(X(W), Y(H)); f.lineTo(X(W), Y(GH)); f.moveTo(X(-W), Y(H)); f.lineTo(X(-W), Y(GH)); f.moveTo(X(W), Y(SDC.GL)); f.lineTo(X(W), Y(-D)); f.moveTo(X(-W), Y(SDC.GL)); f.lineTo(X(-W), Y(-D)); f.stroke();
  // the lintel beams, banded in each side's colour (Blue's gate on the left)
  for (const [sg, T] of [[-1, LG_TEAMS[0]], [1, LG_TEAMS[1]]]) {
    const x0 = sg > 0 ? W - 2 : -W - GD, x1 = x0 + GD + 2;
    f.fillStyle = '#3b2a1c'; f.fillRect(X(x0), Y(GH + 3), (x1 - x0) * k, 3 * k);
    f.fillStyle = T.col; f.fillRect(X(x0), Y(GH + 1.3), (x1 - x0) * k, 1.3 * k);
    f.fillStyle = '#3b2a1c'; f.fillRect(X(x0), Y(SDC.GL), (x1 - x0) * k, 2.4 * k); f.fillStyle = T.col; f.fillRect(X(x0), Y(SDC.GL - 0.9), (x1 - x0) * k, 0.9 * k);   // (the sill)
    f.fillStyle = '#2a1d13'; f.fillRect(X(sg > 0 ? W - 2 : -W), Y(GH + 3), 2 * k, (GH + 3 - SDC.GL + 2.4) * k);   // (the gate post)
  }
  SD2.back = B; SD2.front = F; SD2.bk = k;
}

// ---------- each frame ----------
function sdW2S(x, y) { return [SD2.w / 2 + (x - SD2.camX) * SD2.k, SD2.h / 2 - (y - SD2.camY) * SD2.k]; }
function sdDraw(dt) {
  if (!SD2.c || SD2.w !== innerWidth || SD2.h !== innerHeight) sdResize();
  const c = SD2.c; if (!c) return;
  if (!SD2.back) sdLayers();
  SD2.t += dt;
  const k = SD2.k, w = SD2.w, h = SD2.h, B = LG.ball, me = lgMeShip();
  // the camera: the middle of the chamber, or (a narrow screen) between the ball and my ship
  const half = w / 2 / k, mid = (SD_SPAN.y0 + SD_SPAN.y1) / 2;
  let tx = 0; if (half * 2 < SD_SPAN.x1 - SD_SPAN.x0) { const fx = me ? (B.x * 0.6 + me.x * 0.4) : B.x; tx = lgClamp(fx, SD_SPAN.x0 + half, SD_SPAN.x1 - half); }
  SD2.camX += (tx - SD2.camX) * Math.min(1, dt * 4); SD2.camY = mid;
  c.setTransform(SD2.dpr, 0, 0, SD2.dpr, 0, 0);
  c.fillStyle = '#16131a'; c.fillRect(0, 0, w, h);
  const [ox, oy] = sdW2S(SD_LAY.x0, SD_LAY.y1), bw = SD2.back.width / SD2.dpr, bh = SD2.back.height / SD2.dpr;
  c.drawImage(SD2.back, ox, oy, bw, bh);
  // the lanterns' glow on the back wall
  for (const lx of [-92, -31, 31, 92]) { const [sx, sy] = sdW2S(lx, 52), r = 26 * k, fl = 0.85 + Math.sin(SD2.t * 7 + lx) * 0.05; const g = c.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, `rgba(255,200,120,${0.32 * fl})`); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(sx - r, sy - r, r * 2, r * 2); c.fillStyle = '#ffd890'; c.fillRect(sx - 1.2 * k, sy - 1.8 * k, 2.4 * k, 3.2 * k); c.strokeStyle = '#2a1d13'; c.lineWidth = Math.max(1, 0.5 * k); c.strokeRect(sx - 1.4 * k, sy - 2 * k, 2.8 * k, 3.6 * k); }
  // each gate's lamp over its lintel (it blazes when a goal goes in there)
  for (let tm = 0; tm < 2; tm++) {
    SD2.flash[tm] = Math.max(0, SD2.flash[tm] - dt * 0.6);
    const T = LG_TEAMS[tm], gx = tm === 0 ? -SDC.W - SDC.GD / 2 : SDC.W + SDC.GD / 2, [sx, sy] = sdW2S(gx, SDC.GH + 8), f = SD2.flash[tm];
    const r = (14 + f * 60) * k, g = c.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, T.col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = 0.45 + f * 0.5; c.fillStyle = g; c.fillRect(sx - r, sy - r, r * 2, r * 2); c.globalAlpha = 1;
    c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(sx, sy, 1.8 * k, 0, 7); c.fill();
  }
  // under the surface, the water's deep colour behind everything in it
  { const [, sy] = sdW2S(0, 0), [, fy] = sdW2S(0, -SDC.D), [x0] = sdW2S(-SDC.W, 0), [x1] = sdW2S(SDC.W, 0); const g = c.createLinearGradient(0, sy, 0, fy); g.addColorStop(0, 'rgba(30,90,100,0.55)'); g.addColorStop(1, 'rgba(6,20,30,0.9)'); c.fillStyle = g; c.fillRect(x0, sy, x1 - x0, fy - sy); }
  // the gale buoys
  for (const p of LG.pads) {
    const bob = Math.sin(SD2.t * 2.2 + p.x) * 0.5, [sx, sy] = sdW2S(p.x, p.y + 1.2 + bob), r = (p.big ? 2.8 : 1.9) * k, down = p.t > 0;
    c.globalAlpha = down ? 0.3 : 1;
    c.fillStyle = '#e8b830'; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill(); c.fillStyle = '#7a4c10'; c.fillRect(sx - r, sy - r * 0.2, r * 2, r * 0.4);
    if (!down) { const gl = c.createRadialGradient(sx, sy - r * 1.6, 0, sx, sy - r * 1.6, r * 3); gl.addColorStop(0, 'rgba(255,230,120,0.7)'); gl.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = gl; c.fillRect(sx - r * 3, sy - r * 4.6, r * 6, r * 6); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(sx, sy - r * 1.5, r * 0.45, 0, 7); c.fill(); }
    c.globalAlpha = 1;
  }
  // the ball's shadow on the water when it's up
  if (!B.gone && B.y > 6) { const [sx, sy] = sdW2S(B.x, 0.2), s = Math.max(0.2, 1 - B.y / 70); c.fillStyle = `rgba(0,0,0,${0.3 * s})`; c.beginPath(); c.ellipse(sx, sy, SDC.R * k * s, 1.2 * k * s, 0, 0, 7); c.fill(); }
  // the ships, then the ball, then the water's surface over what's under it
  for (const s of LG.ships) sdShipFx(s, dt);
  for (const s of LG.ships) if (!s.me) sdDrawShip(c, s);
  if (me) sdDrawShip(c, me);
  if (!B.gone) sdDrawBall(c, B);
  sdWater(c);
  c.drawImage(SD2.front, ox, oy, bw, bh);
  sdDrawFx(c, dt);
  // names over the others' ships, and a ring round mine
  c.font = `600 ${Math.max(11, Math.round(2.6 * k))}px system-ui, sans-serif`; c.textAlign = 'center';
  for (const s of LG.ships) {
    const [sx, sy] = sdW2S(s.x, s.y + sdHalf(s) * 1.5 + 4);
    if (s.me) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(sx - 1.6 * k, sy - 1.6 * k); c.lineTo(sx + 1.6 * k, sy - 1.6 * k); c.lineTo(sx, sy + 0.4 * k); c.closePath(); c.fill(); continue; }
    if (LG.ph === 'end') continue;
    c.fillStyle = 'rgba(0,0,0,0.55)'; const t = s.nm + (LG.net && s.bot && s.sid ? ' · bot' : ''); const tw = c.measureText(t).width + 8; c.fillRect(sx - tw / 2, sy - 2.2 * k - 6, tw, 2.6 * k + 6);
    c.fillStyle = LG_TEAMS[s.team].col; c.fillText(t, sx, sy - 2);
  }
  // off the screen (a narrow one): an arrow at the edge towards the ball
  if (!B.gone) { const [bx, by] = sdW2S(B.x, B.y); if (bx < 0 || bx > w) { const x = bx < 0 ? 14 : w - 14; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + (bx < 0 ? -8 : 8), by); c.lineTo(x + (bx < 0 ? 6 : -6), by - 8); c.lineTo(x + (bx < 0 ? 6 : -6), by + 8); c.closePath(); c.fill(); } }
}
// the surface: a wave along it, a lighter line on top, and the water's tint over everything below it
function sdWater(c) {
  const k = SD2.k, t = SD2.t, x0 = -SDC.W, x1 = SDC.W, [, fy] = sdW2S(0, -SDC.D);
  const wave = x => Math.sin(x * 0.11 + t * 1.6) * 0.45 + Math.sin(x * 0.27 - t * 2.3) * 0.25;
  c.beginPath(); let first = true;
  for (let x = x0; x <= x1; x += 2) { const [sx, sy] = sdW2S(x, wave(x)); if (first) { c.moveTo(sx, sy); first = false; } else c.lineTo(sx, sy); }
  const [ex] = sdW2S(x1, 0), [sx0] = sdW2S(x0, 0); c.lineTo(ex, fy); c.lineTo(sx0, fy); c.closePath();
  const [, sy] = sdW2S(0, 0), g = c.createLinearGradient(0, sy, 0, fy); g.addColorStop(0, 'rgba(70,160,170,0.42)'); g.addColorStop(0.3, 'rgba(30,100,120,0.5)'); g.addColorStop(1, 'rgba(8,30,44,0.75)');
  c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(210,240,240,0.7)'; c.lineWidth = Math.max(1, 0.5 * k); c.beginPath(); first = true;
  for (let x = x0; x <= x1; x += 2) { const [px, py] = sdW2S(x, wave(x)); if (first) { c.moveTo(px, py); first = false; } else c.lineTo(px, py); }
  c.stroke();
  // light through the surface
  c.strokeStyle = 'rgba(180,230,230,0.07)'; c.lineWidth = 3 * k;
  for (let i = 0; i < 9; i++) { const x = -100 + i * 25 + Math.sin(t * 0.4 + i) * 6, [a, b] = sdW2S(x, 0), [d, e] = sdW2S(x - 8, -SDC.D); c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }
}
function sdMix(a, b, t) { const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; try { const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; } catch (e) { return b; } }
const sdHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null;
// a ship in profile: her hull in her skin, a band of her side's colour along her wale, her masts and sails, her pennant
function sdDrawShip(c, s) {
  const k = SD2.k, L = sdHalf(s), T = LG_TEAMS[s.team], sk = s.skin || {}, hull = sdHex(sk.hull) || '#4b3a2b', rail = sdHex(sk.rail) || '#1e140c', sailC = sdMix(sdHex(sk.sail) || '#d8cdb0', T.col, 0.45);
  const [sx, sy] = sdW2S(s.x, s.y);
  c.save(); c.translate(sx, sy);
  if (s.air) { c.rotate(-s.h); c.scale(k, -k * (s.up || 1)); }
  else { const bob = Math.sin(s.bob * 2.4) * 0.03; c.rotate(-(s.pitch || 0) * (s.face || 1) - bob); c.scale(k * (s.turnP == null ? 1 : s.turnP), -k * (s.roll == null ? 1 : s.roll)); }
  // (in her own frame now: bow along +x, deck up +y, in metres)
  const carrier = s.boat.id === 'carrier';
  // the Gale's blast from her stern
  if (s.galeOn) { const fl = 0.7 + Math.random() * 0.3, g = c.createLinearGradient(-L, 0, -L - 14 * fl, 0); g.addColorStop(0, 'rgba(255,250,220,0.95)'); g.addColorStop(0.4, 'rgba(160,220,255,0.6)'); g.addColorStop(1, 'rgba(160,220,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-L, 2.2); c.lineTo(-L - 14 * fl, 0.4); c.lineTo(-L, -1.6); c.closePath(); c.fill(); }
  // the hull
  c.beginPath();
  if (carrier) { c.moveTo(-L, 2.4); c.lineTo(L * 1.05, 2.6); c.lineTo(L * 0.82, -1.8); c.lineTo(-L * 0.9, -2); c.lineTo(-L, -0.6); }
  else { c.moveTo(-L * 0.98, 2.3); c.quadraticCurveTo(0, 1.3, L * 0.98, 2.9); c.quadraticCurveTo(L * 0.86, -1.2, L * 0.55, -2.3); c.lineTo(-L * 0.7, -2.3); c.quadraticCurveTo(-L * 0.95, -1.8, -L * 1.02, 0.4); }
  c.closePath(); c.fillStyle = carrier ? sdMix(hull, '#7a8088', 0.5) : hull; c.fill();
  c.lineWidth = 0.35; c.strokeStyle = rail; c.stroke();
  // her side's band along the wale, and her keel
  c.strokeStyle = T.col; c.lineWidth = 0.75; c.beginPath(); c.moveTo(-L * 0.92, 1.2); c.quadraticCurveTo(0, 0.4, L * 0.88, 1.7); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-L * 0.7, -2.2); c.lineTo(L * 0.55, -2.2); c.stroke();
  if (carrier) {
    c.fillStyle = '#5a6068'; c.fillRect(L * 0.1, 2.5, L * 0.28, 4.5); c.fillStyle = '#ffd890'; c.fillRect(L * 0.14, 5.4, L * 0.2, 0.8);
    c.fillStyle = T.col; c.fillRect(-L, 2.4, L * 2.02, 0.35);
    c.strokeStyle = '#2b2f35'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(L * 0.24, 7); c.lineTo(L * 0.24, 10); c.stroke();
    c.fillStyle = T.col; c.beginPath(); c.moveTo(L * 0.24, 10); c.lineTo(L * 0.24 + 3, 9.4); c.lineTo(L * 0.24, 8.8); c.closePath(); c.fill();
  } else {
    // the bowsprit, the masts, and the sails (square, bellied by the wind she makes)
    c.strokeStyle = sdHex(sk.wood) || '#3a2c20'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(L * 0.9, 2.6); c.lineTo(L * 1.35, 4.2); c.stroke();
    const masts = s.boat.masts && s.boat.masts.length ? s.boat.masts : [0], mh = L * 1.05 + 3.5, belly = Math.min(1.6, Math.abs(s.v) / 25 + (s.galeOn ? 0.8 : 0.2));
    masts.forEach((m, i) => {
      const x = m * L * 2, top = mh * (i === masts.length - 1 && masts.length > 1 ? 0.92 : 1);
      c.strokeStyle = '#2a1d13'; c.lineWidth = 0.45; c.beginPath(); c.moveTo(x, 1.6); c.lineTo(x, 1.6 + top); c.stroke();
      for (const [y0, y1, wd] of [[4, top * 0.55, 0.42], [top * 0.58, top * 0.92, 0.3]]) {
        const hw = L * wd; c.fillStyle = sailC; c.beginPath(); c.moveTo(x - hw, 1.6 + y1); c.lineTo(x + hw, 1.6 + y1); c.quadraticCurveTo(x + hw + belly, 1.6 + (y0 + y1) / 2, x + hw * 0.9, 1.6 + y0); c.lineTo(x - hw * 0.9, 1.6 + y0); c.quadraticCurveTo(x - hw + belly, 1.6 + (y0 + y1) / 2, x - hw, 1.6 + y1); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.2; c.stroke();
      }
      if (i === 0) { const fl = Math.sin(SD2.t * 9 + s.i) * 0.5; c.fillStyle = T.col; c.beginPath(); c.moveTo(x, 1.6 + top); c.lineTo(x - 4.2, 1.6 + top - 0.6 + fl); c.lineTo(x, 1.6 + top - 1.4); c.closePath(); c.fill(); }
    });
    // a lantern at her stern
    c.fillStyle = sdHex(sk.lantern) || '#ffcf86'; c.beginPath(); c.arc(-L * 0.92, 3.3, 0.55, 0, 7); c.fill();
  }
  c.restore();
}
function sdDrawBall(c, B) {
  const k = SD2.k, R = SDC.R, [sx, sy] = sdW2S(B.x, B.y);
  c.save(); c.translate(sx, sy);
  c.beginPath(); c.arc(0, 0, R * k, 0, 7); c.fillStyle = '#f3efe4'; c.fill();
  c.save(); c.clip(); c.rotate(-(B.rx || 0));
  c.fillStyle = '#c8322c'; for (const y of [-0.62, 0, 0.62]) c.fillRect(-R * k * 1.2, (y - 0.14) * R * k, R * k * 2.4, 0.28 * R * k);
  c.restore();
  const g = c.createRadialGradient(-R * k * 0.35, -R * k * 0.4, R * k * 0.1, 0, 0, R * k); g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * k, 0, 7); c.fill();
  c.strokeStyle = '#2a1d13'; c.lineWidth = Math.max(1, 0.35 * k); c.beginPath(); c.arc(0, 0, R * k, 0, 7); c.stroke();
  c.restore();
}
// spray, wakes, the Gale's streaks and the goal's sparks, as particles in the world
function sdShipFx(s, dt) {
  if (s._air && !s.air) for (let i = 0; i < 14; i++) SD2.fx.push({ x: s.x + (Math.random() - 0.5) * sdHalf(s) * 2, y: 0.5, vx: (Math.random() - 0.5) * 18, vy: 8 + Math.random() * 16, t: 0.9, c: 'rgba(220,240,245,0.85)', r: 0.6 });
  if (!s._air && s.air) for (let i = 0; i < 8; i++) SD2.fx.push({ x: s.x + (Math.random() - 0.5) * sdHalf(s) * 1.4, y: 0.5, vx: (Math.random() - 0.5) * 8, vy: 6 + Math.random() * 10, t: 0.7, c: 'rgba(220,240,245,0.8)', r: 0.5 });
  s._air = s.air;
  if (!s.air && Math.abs(s.v) > 12 && Math.random() < dt * Math.abs(s.v) * 0.5) SD2.fx.push({ x: s.x - Math.sign(s.v) * sdHalf(s), y: 0.4, vx: -s.v * 0.2, vy: 3 + Math.random() * 3, t: 0.5, c: 'rgba(230,245,250,0.7)', r: 0.5 });
  if (s.galeOn && Math.random() < dt * 40) { const c0 = Math.cos(s.h), s0 = Math.sin(s.h); SD2.fx.push({ x: s.x - c0 * sdHalf(s) * 1.2, y: s.y - s0 * sdHalf(s) * 1.2, vx: -c0 * 30 + s.v * 0.3, vy: -s0 * 30 + s.bv * 0.3, t: 0.35, c: 'rgba(190,230,255,0.8)', r: 0.45, line: 1 }); }
  if (s.flipT > 0 && Math.random() < dt * 30) SD2.fx.push({ x: s.x, y: s.y, vx: 0, vy: 0, t: 0.25, c: 'rgba(255,255,255,0.5)', r: sdHalf(s) * 0.9, ring: 1 });
}
function sdDrawFx(c, dt) {
  const k = SD2.k, F = SD2.fx;
  for (let i = F.length - 1; i >= 0; i--) {
    const p = F[i]; p.t -= dt; if (p.t <= 0) { F.splice(i, 1); continue; }
    if (!p.ring) { p.vy -= (p.g == null ? 30 : p.g) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    const [sx, sy] = sdW2S(p.x, p.y);
    c.globalAlpha = Math.min(1, p.t * 2.5);
    if (p.ring) { c.strokeStyle = p.c; c.lineWidth = 1; c.beginPath(); c.arc(sx, sy, p.r * k * (1.4 - p.t * 2), 0, 7); c.stroke(); }
    else if (p.line) { c.strokeStyle = p.c; c.lineWidth = Math.max(1, p.r * k); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - p.vx * 0.04 * k, sy + p.vy * 0.04 * k); c.stroke(); }
    else { c.fillStyle = p.c; c.beginPath(); c.arc(sx, sy, Math.max(1, p.r * k), 0, 7); c.fill(); }
  }
  c.globalAlpha = 1;
  if (F.length > 600) F.splice(0, F.length - 600);
}
// a goal: the lamp over that gate blazes, and the gate throws out sparks of the scoring side's colour
function sdGoalFx(team) {
  const into = team === 0 ? 1 : 0; SD2.flash[into] = 1;
  const gx = (team === 0 ? 1 : -1) * (SDC.W + SDC.GD * 0.4), T = LG_TEAMS[team];
  for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, v = 10 + Math.random() * 40; SD2.fx.push({ x: gx, y: (SDC.GL + SDC.GH) / 2, vx: Math.cos(a) * v - (team === 0 ? 20 : -20), vy: Math.sin(a) * v + 15, t: 1.2 + Math.random() * 0.8, c: i % 3 ? T.col : '#fff3c0', r: 0.55, g: 18 }); }
  for (let i = 0; i < 30; i++) SD2.fx.push({ x: gx + (Math.random() - 0.5) * 10, y: SDC.GL + 1, vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 25, t: 1, c: 'rgba(220,240,245,0.85)', r: 0.7 });
}

// ---------- the phone's joystick ----------
// On a touch screen Spindrift steers with a stick: put a thumb down anywhere on the left of the screen and the stick
// appears under it; drag it left and right to sail and to turn her over in the air, down to dive. Leap and the Gale
// are the two round buttons on the right (src/league.js's touch pad, its left-hand buttons hidden in this game).
// It sets LG.stickX and LG.stickY (-1 to 1, y up), which src/lgside.js reads with the keys.
function sdStickInit() {
  const ui = $('lgUI'); if (!ui || $('sdStickZone')) return;
  const zone = document.createElement('div'); zone.id = 'sdStickZone'; zone.className = 'sd-zone'; zone.hidden = true;
  const base = document.createElement('div'); base.className = 'sd-stick'; base.hidden = true;
  const knob = document.createElement('div'); knob.className = 'sd-knob'; base.append(knob); zone.append(base); ui.append(zone);
  let id = null, cx = 0, cy = 0; const RAD = 52;
  const set = (x, y) => { let dx = x - cx, dy = y - cy; const d = Math.hypot(dx, dy); if (d > RAD) { dx *= RAD / d; dy *= RAD / d; } knob.style.transform = `translate(${dx}px, ${dy}px)`; const nx = dx / RAD, ny = -dy / RAD; LG.stickX = Math.abs(nx) < 0.15 ? 0 : nx; LG.stickY = Math.abs(ny) < 0.15 ? 0 : ny; };
  zone.addEventListener('pointerdown', e => { if (id !== null) return; e.preventDefault(); id = e.pointerId; try { zone.setPointerCapture(id); } catch (er) {} const r = zone.getBoundingClientRect(); cx = e.clientX; cy = e.clientY; base.style.left = (cx - r.left) + 'px'; base.style.top = (cy - r.top) + 'px'; base.hidden = false; set(cx, cy); });
  zone.addEventListener('pointermove', e => { if (e.pointerId === id) { e.preventDefault(); set(e.clientX, e.clientY); } });
  const up = e => { if (e.pointerId !== id) return; id = null; base.hidden = true; LG.stickX = 0; LG.stickY = 0; knob.style.transform = ''; };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(t, up);
}
// shown in Spindrift on a touch screen, and only then
function sdStickShow(on) { sdStickInit(); const z = $('sdStickZone'); if (z) z.hidden = !on; LG.stickX = 0; LG.stickY = 0; }
