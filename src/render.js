// Drawing the night: a simple perspective camera on the ship's deck, the sea, the skerries,
// the lighthouse and its beam, the bow of your brig, and the bearing strip.

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let W = 0, H = 0, dpr = 1, fov = 1.2, focal = 1, cx = 0, hy = 0;
let camX = 0, camY = 0, yaw = 0, camH = 5;

const waves = [], stars = [], town = [];
for (let i = 0; i < 460; i++) waves.push({ x: rand(0, 600), y: rand(0, 600), len: rand(1.5, 4), ph: rand(0, 6.28) });
for (let i = 0; i < 220; i++) stars.push({ b: rand(-Math.PI, Math.PI), e: rand(0.03, 0.8), m: rand(0.3, 1), ph: rand(0, 6.28) });
for (let i = 0; i < 14; i++) town.push({ x: SK.HARBOUR.x + rand(-140, 160), y: rand(-60, -15), z: rand(6, 20), ph: rand(0, 6.28) });

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  fov = W < 600 ? 1.4 : 1.15;
  focal = (W / 2) / Math.tan(fov / 2);
  cx = W / 2;
}

// camera space: r = right, f = forward
function cam(x, y, z) {
  const dx = x - camX, dy = y - camY, s = Math.sin(yaw), c = Math.cos(yaw);
  return { r: dx * c - dy * s, f: dx * s + dy * c, z };
}
function proj(c) { const k = focal / c.f; return { x: cx + c.r * k, y: hy + (camH - c.z) * k, s: k, f: c.f }; }
function polyProj(pts) {
  const c = pts.map(p => cam(p[0], p[1], p[2] || 0)), out = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[i], b = c[(i + 1) % c.length], ain = a.f >= SK.NEAR, bin = b.f >= SK.NEAR;
    if (ain) out.push(a);
    if (ain !== bin) { const t = (SK.NEAR - a.f) / (b.f - a.f); out.push({ r: a.r + (b.r - a.r) * t, f: SK.NEAR, z: a.z + (b.z - a.z) * t }); }
  }
  return out.map(proj);
}
function fillPoly(pts, style) {
  const p = polyProj(pts); if (p.length < 3) return;
  ctx.fillStyle = style; ctx.beginPath();
  p.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.fill();
}
function mix(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
  return 'rgb(' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',') + ')';
}
function lamp(x, y, c, r) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  gr.addColorStop(0, c); gr.addColorStop(0.3, c + '88'); gr.addColorStop(1, c + '00');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 6.28); ctx.fill();
}

// How brightly the beam lights a point right now. Hard-edged: outside the beam, nothing.
function litAt(x, y) {
  const b = bearingOf(x, y), d = Math.hypot(x, y);
  if (Math.abs(b) > SK.SHADE || d > SK.BEAM_RANGE) return 0;
  if (Math.abs(angDiff(b, g.beam)) > SK.HALF_BEAM) return 0;
  return 1 - d / (SK.BEAM_RANGE * 1.3);
}
function lanternAt(x, y) {
  const d = Math.hypot(x - ship.x, y - ship.y);
  return d < SK.LANTERN ? Math.min(1, (1 - d / SK.LANTERN) * 1.6) : 0;
}
function visibility(x, y) {
  if (g.backrooms) return Math.min(1, roomLight(x, y) + lanternAt(x, y) + flareAt(x, y));
  return Math.min(1, litAt(x, y) * 1.3 + lanternAt(x, y) + flareAt(x, y));
}
// ---------- the Backrooms ----------
// the tubes buzz and flicker; each time the lamp would have turned they go out for a moment
function roomLevel() {
  if (g.lightsOut > 0) return 0.05;
  return 0.88 + 0.12 * Math.sin(g.t * 37) * Math.sin(g.t * 5.3);
}
function roomLight(x, y) { return Math.max(0, 1 - Math.hypot(x - ship.x, y - ship.y) / 300) * roomLevel(); }
const ROOM_FOG = '#211c0b';
function drawRoomsBack() {
  const L = roomLevel();
  const ceil = ctx.createLinearGradient(0, -H * 0.2, 0, hy);
  ceil.addColorStop(0, mix('#0c0a05', '#8a7c3e', L)); ceil.addColorStop(1, ROOM_FOG);
  ctx.fillStyle = ceil; ctx.fillRect(-W, -H, W * 3, hy + H);
  const fl = ctx.createLinearGradient(0, hy, 0, H);
  fl.addColorStop(0, ROOM_FOG); fl.addColorStop(1, mix('#070602', '#4a4119', L));
  ctx.fillStyle = fl; ctx.fillRect(-W, hy, W * 3, H * 2);
  // fluorescent panels on the ceiling
  const Z = SK.BACKROOMS_CEIL - 0.05;
  for (const lt of g.rooms.lights) {
    const d = Math.hypot(lt.x - ship.x, lt.y - ship.y); if (d > 330) continue;
    const c = cam(lt.x, lt.y, Z); if (c.f < SK.NEAR + 1) continue;
    let on = L * (1 - d / 330);
    if (lt.bad) on *= Math.sin(g.t * 23 + lt.ph) > 0.2 ? 1 : 0.1;   // a failing tube
    if (on < 0.03) continue;
    for (const [ox, oy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
      fillPoly([[lt.x + ox - 3, lt.y + oy - 1, Z], [lt.x + ox + 3, lt.y + oy - 1, Z], [lt.x + ox + 3, lt.y + oy + 1, Z], [lt.x + ox - 3, lt.y + oy + 1, Z]], `rgba(255,250,215,${on.toFixed(3)})`);
    }
  }
  // ripples on the flooded carpet
  ctx.beginPath();
  const T = 400;
  for (const w of waves) {
    const wx = camX + ((((w.x - camX) % T) + T * 1.5) % T - T / 2), wy = camY + ((((w.y - camY) % T) + T * 1.5) % T - T / 2);
    const c = cam(wx, wy, 0); if (c.f < 4 || c.f > 60) continue;
    const q = proj(c); if (q.x < -20 || q.x > W + 20) continue;
    ctx.moveTo(q.x - w.len * q.s / 2, q.y + Math.sin(g.t * 1.3 + w.ph) * 0.2 * q.s); ctx.lineTo(q.x + w.len * q.s / 2, q.y);
  }
  ctx.strokeStyle = `rgba(240,225,150,${0.14 * L})`; ctx.lineWidth = 1; ctx.stroke();
}
function drawWall(w) {
  const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
  const d = Math.hypot(mx - ship.x, my - ship.y);
  const light = Math.min(1, Math.max(roomLight(mx, my), lanternAt(mx, my) * 0.6, flareAt(mx, my)));
  const along = Math.abs(w.x2 - w.x1) > Math.abs(w.y2 - w.y1);
  const base = along ? '#d9c25a' : '#c2aa45';
  const fog = Math.min(1, d / 320);
  const col = mix(mix('#120f05', base, 0.25 + 0.75 * light), ROOM_FOG, fog * 0.75);
  const Z = SK.BACKROOMS_CEIL;
  fillPoly([[w.x1, w.y1, 0], [w.x2, w.y2, 0], [w.x2, w.y2, Z], [w.x1, w.y1, Z]], col);
  // the wallpaper's faint stripes, and a damp dark line where the water meets it
  if (d < 160) {
    const n = 8;
    for (let i = 1; i < n; i++) {
      const t = i / n, x = w.x1 + (w.x2 - w.x1) * t, y = w.y1 + (w.y2 - w.y1) * t;
      const a = cam(x, y, 0.8), b = cam(x, y, Z);
      if (a.f < SK.NEAR || b.f < SK.NEAR) continue;
      const pa = proj(a), pb = proj(b);
      ctx.strokeStyle = `rgba(80,66,20,${0.25 * (1 - d / 160)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
  }
  fillPoly([[w.x1, w.y1, 0], [w.x2, w.y2, 0], [w.x2, w.y2, 1.1], [w.x1, w.y1, 1.1]], mix(mix('#050402', '#4a3d16', light), ROOM_FOG, fog * 0.8));
}
// The maze walls, ray cast one screen column at a time against the room grid, so the nearest wall
// always wins (no walls sliding through each other). Fills ZBUF with each column's wall distance,
// which drawScene uses to hide anything standing behind a wall.
let ZBUF = new Float32Array(0), ZSTEP = 2;
const wallShades = new Map();
function wallShade(side, li, fi, stripe) {
  const k = side + ':' + li + ':' + fi + ':' + stripe;
  let c = wallShades.get(k);
  if (!c) {
    const base = side ? '#c2aa45' : '#d9c25a';
    c = mix(mix('#120f05', stripe ? '#9c8a3a' : base, 0.25 + 0.75 * li / 15), ROOM_FOG, fi / 15 * 0.78);
    wallShades.set(k, c);
  }
  return c;
}
function drawRoomWalls() {
  const R = g.rooms; if (!R || !R.east) return;
  const { X0, Y0, C, N, east, north } = R;
  ZSTEP = W > 900 ? 2 : W > 500 ? 2 : 1;
  const cols = Math.ceil(W / ZSTEP) + 1;
  if (ZBUF.length !== cols) ZBUF = new Float32Array(cols);
  const id = (i, j) => j * N + i;
  const Z = SK.BACKROOMS_CEIL, L = roomLevel();
  const px = (camX - X0) / C, py = (camY - Y0) / C;
  const cutAway = typeof VIEW !== 'undefined' && VIEW.third;
  for (let ci = 0; ci < cols; ci++) {
    const sxp = ci * ZSTEP;
    const off = Math.atan((sxp - cx) / focal), ang = yaw + off;
    const dx = Math.sin(ang), dy = Math.cos(ang);
    let i = Math.floor(px), j = Math.floor(py);
    const stepI = dx > 0 ? 1 : -1, stepJ = dy > 0 ? 1 : -1;
    const tdx = Math.abs(1 / (dx || 1e-9)), tdy = Math.abs(1 / (dy || 1e-9));
    let tx = dx > 0 ? (i + 1 - px) * tdx : (px - i) * tdx;
    let ty = dy > 0 ? (j + 1 - py) * tdy : (py - j) * tdy;
    let t = 0, side = 0, hit = false;
    for (let n = 0; n < 64 && !hit; n++) {
      if (tx < ty) {
        t = tx; tx += tdx; side = 0;
        // crossing the boundary between column i and i + stepI
        const bi = stepI > 0 ? i : i - 1;
        if (bi < 0 || bi >= N - 1 || j < 0 || j >= N) hit = true;
        else if (east[id(bi, j)]) hit = true;
        i += stepI;
      } else {
        t = ty; ty += tdy; side = 1;
        const bj = stepJ > 0 ? j : j - 1;
        if (bj < 0 || bj >= N - 1 || i < 0 || i >= N) hit = true;
        else if (north[id(i, bj)]) hit = true;
        j += stepJ;
      }
      // third person: walls between the camera and your ship are cut away, so they never hide it
      if (hit && cutAway && t * C * Math.cos(off) < CHASE.cut) hit = false;
    }
    const dist = t * C, f = Math.max(SK.NEAR, dist * Math.cos(off));
    ZBUF[ci] = hit ? f : 1e9;
    if (!hit) continue;
    const hx = camX + dx * dist, hy2 = camY + dy * dist;
    const k = focal / f;
    const yb = hy + camH * k, yt = hy + (camH - Z) * k;
    const light = Math.min(1, Math.max(roomLight(hx, hy2), lanternAt(hx, hy2) * 0.6, flareAt(hx, hy2)));
    const fog = Math.min(1, dist / 320);
    // wallpaper stripes: every 8 m along the wall, a thin darker line
    const u = side === 0 ? hy2 : hx, stripe = dist < 160 && ((u % 8) + 8) % 8 < 0.35 ? 1 : 0;
    const li = Math.round(light * 15), fi = Math.round(fog * 15);
    ctx.fillStyle = wallShade(side, li, fi, stripe);
    ctx.fillRect(sxp - 0.5, yt, ZSTEP + 1, yb - yt);
    // damp skirting where the water meets the wall
    ctx.fillStyle = wallShade(1, Math.round(li * 0.35), fi, 0);
    ctx.fillRect(sxp - 0.5, yb - 1.1 * k, ZSTEP + 1, 1.1 * k);
  }
}
// clip to the screen columns where something at forward distance f is in front of the walls
function clipToVisible(f) {
  ctx.beginPath();
  let start = -1;
  for (let ci = 0; ci <= ZBUF.length; ci++) {
    const open = ci < ZBUF.length && ZBUF[ci] > f;
    if (open && start < 0) start = ci;
    if (!open && start >= 0) { ctx.rect(start * ZSTEP - 1, -H, (ci - start) * ZSTEP + 1, H * 3); start = -1; }
  }
  ctx.clip();
}

function drawExitSign() {
  const e = g.exit, c = cam(e.x, e.y, SK.BACKROOMS_CEIL - 2.5); if (c.f < SK.NEAR + 1) return;
  const q = proj(c), w = 5 * q.s, h = 1.6 * q.s;
  lamp(q.x, q.y, '#3dff7a', Math.max(3, 1.6 * Math.sqrt(q.s)));
  ctx.fillStyle = '#0c3a1a'; ctx.fillRect(q.x - w / 2, q.y - h / 2, w, h);
  if (h > 7) {
    ctx.fillStyle = '#6dffa0'; ctx.font = `700 ${Math.round(h * 0.75)}px "Courier Prime", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', q.x, q.y + 1);
  }
  const f = cam(e.x, e.y, 0);
  if (f.f > SK.NEAR + 1) { const p = proj(f); ctx.globalAlpha = 0.5; lamp(p.x, p.y, '#3dff7a', Math.max(3, 1.2 * Math.sqrt(p.s))); ctx.globalAlpha = 1; }
}


// An image cut into horizontal strips that slip sideways, for anything that should look wrong.
function drawGlitch(img, x, y, w, h, amt) {
  if (amt <= 0.01 || reduceMotion) { ctx.drawImage(img, x, y, w, h); return; }
  const strips = 12, iw = img.naturalWidth, ih = img.naturalHeight;
  for (let i = 0; i < strips; i++) {
    const off = Math.random() < 0.45 ? (Math.random() - 0.5) * amt * w * 0.35 : 0;
    ctx.drawImage(img, 0, ih * i / strips, iw, ih / strips, x + off, y + h * i / strips, w, h / strips + 0.6);
  }
}

// ---------- obstacles ----------
// Once the beam has swept over a rock (or a wreck, or a log), it starts to fade as soon as the beam
// leaves it (after SK.SEEN_HOLD, now 0) and is gone SK.SEEN_FADE seconds later. Called every frame for everything on the water.
function rememberLit(list) {
  for (const o of list) {
    const l = litAt(o.x, o.y);
    if (l > 0.02) { o.seenT = g.t; o.seenV = Math.min(1, l * 1.3); }
  }
}
function afterglow(o) {
  if (o.seenT == null) return 0;
  const age = g.t - o.seenT;
  if (age < 0) { o.seenT = null; return 0; }
  if (age <= SK.SEEN_HOLD) return o.seenV;
  return Math.max(0, o.seenV * (1 - (age - SK.SEEN_HOLD) / SK.SEEN_FADE));
}
function drawRock(r, p, vis) {
  if (vis < 0.02) return;
  const w = r.r * 2.2 * p.s, h = r.r * 0.8 * p.s, x = p.x, y = p.y;
  ctx.globalAlpha = vis;
  ctx.fillStyle = 'rgba(225,235,248,0.4)';
  ctx.beginPath(); ctx.ellipse(x, y, w * 0.7 + Math.sin(g.t * 1.7 + r.ph) * w * 0.04, Math.max(1, w * 0.06), 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#5b5f66';
  ctx.beginPath(); ctx.moveTo(x - w / 2, y);
  r.prof.forEach((v, i) => ctx.lineTo(x - w / 2 + w * i / (r.prof.length - 1), y - v * h));
  ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7d828b';
  ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - r.prof[1] * h * 0.9);
  r.prof.slice(1, 5).forEach((v, i) => ctx.lineTo(x - w * 0.3 + w * 0.15 * (i + 1), y - v * h * 0.97));
  ctx.lineTo(x + w * 0.05, y - h * 0.15); ctx.lineTo(x - w * 0.25, y - h * 0.2); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}

function sideOn(x, y, ang) {
  const a = cam(x, y, 0), b = cam(x + Math.sin(ang), y + Math.cos(ang), 0);
  const dr = b.r - a.r, df = b.f - a.f;
  return { lat: Math.abs(dr) / (Math.hypot(dr, df) || 1), dir: dr >= 0 ? 1 : -1 };
}

function drawWreck(o, p, vis) {
  if (vis < 0.02) return;
  const { lat, dir } = sideOn(o.x, o.y, o.ang);
  const L = o.r * 2 * p.s, w = L * (0.35 + 0.65 * lat), hh = Math.max(1.2, L * 0.13), x = p.x, y = p.y;
  ctx.globalAlpha = vis;
  ctx.fillStyle = 'rgba(225,235,248,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y, w * 0.62, Math.max(1, w * 0.05), 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#3e3128';
  ctx.beginPath();
  ctx.moveTo(x - dir * w / 2, y);
  ctx.lineTo(x - dir * w * 0.42, y - hh * 1.3);
  ctx.lineTo(x + dir * w * 0.1, y - hh * 0.8);
  ctx.lineTo(x + dir * w * 0.36, y - hh * 1.05);
  ctx.lineTo(x + dir * w / 2, y - hh * 0.2);
  ctx.lineTo(x + dir * w / 2, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#261c15'; ctx.lineWidth = Math.max(1, L * 0.02);
  ctx.beginPath();
  for (let i = 1; i <= o.ribs; i++) { const rx = x - dir * w / 2 + dir * w * i / (o.ribs + 1); ctx.moveTo(rx, y - hh * 0.2); ctx.lineTo(rx + dir * hh * 0.2, y - hh * (1 + (i % 2) * 0.5)); }
  ctx.stroke();
  ctx.lineWidth = Math.max(1, L * 0.035);
  ctx.beginPath(); ctx.moveTo(x - dir * w * 0.08, y - hh); ctx.lineTo(x - dir * w * 0.08 + o.lean * L * 0.25, y - hh - L * 0.42); ctx.stroke();
  ctx.globalAlpha = 1;
}

// a crewmate's brig: their own lantern always shows, the hull when lit or close
function drawMate(m, p, vis) {
  const d = Math.hypot(m.x - ship.x, m.y - ship.y);
  // their own lanterns light their hull and sails, so you can see a crewmate's skin from a fair way off
  const hullVis = Math.max(vis, Math.max(0, 1 - d / 320) * 0.95);
  const col = SLOT_COLORS[m.slot] || SLOT_COLORS[1];
  const boat = BOAT_BY_ID[m.boat] || BOATS[0];
  const skin = m.skin || SKINS[0];
  let head = null;
  if (hullVis > 0.02) head = drawShip3D(m, skin, boat, hullVis, { alpha: Math.min(1, hullVis + 0.15), pennant: m.pennant, lantern: col, brace: 0.5 });
  const L = boat.len * p.s, x = p.x, hh = Math.max(1.2, L * 0.12), sailH = head ? Math.max(4, p.y - head.y - hh) : L * 0.58, y = p.y;
  if (d < 700 || m.shoutT > 0) {
    ctx.font = '700 11px "Courier Prime", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = col; ctx.globalAlpha = 0.9;
    ctx.fillText(m.name, x, y - hh - sailH - 6);
    if (m.shoutT > 0) {
      ctx.globalAlpha = Math.min(1, m.shoutT);
      ctx.font = '700 13px "Courier Prime", monospace';
      const text = m.shoutText, tw = ctx.measureText(text).width + 14, ty = y - hh - sailH - 22;
      ctx.fillStyle = 'rgba(6,10,20,0.85)'; ctx.fillRect(x - tw / 2, ty - 18, tw, 20);
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(x - tw / 2 + 0.5, ty - 17.5, tw - 1, 19);
      ctx.fillStyle = col; ctx.fillText(text, x, ty);
    }
    ctx.globalAlpha = 1;
  }
}

// a flare climbs, hangs and falls, lighting the water under it
function drawFlares() {
  for (const f of g.flares) {
    const age = SK.FLARE_TIME - f.t;
    const z = age < 1 ? 10 + age * 50 : 60 - (age - 1) * 5;
    const c = cam(f.x, f.y, z); if (c.f < SK.NEAR) continue;
    const q = proj(c), a = Math.min(1, f.t / 1.5);
    ctx.globalAlpha = a;
    const fs = f.skin || FLARES[0], col = flareColour(fs, age);
    if (col.startsWith('#')) lamp(q.x, q.y, col, Math.max(3, 2.4 * Math.sqrt(q.s)) * (age < 1 ? 1.6 : 1));
    else { ctx.fillStyle = col; ctx.globalAlpha = a * 0.5; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(3, 2.4 * Math.sqrt(q.s)) * 4, 0, 6.28); ctx.fill(); ctx.globalAlpha = a; }
    if (fs.sparks && !reduceMotion) { ctx.fillStyle = fs.core; for (let i = 0; i < 8; i++) { const an = i * 0.8 + age * 2, d = (6 + (i % 3) * 4) * Math.sqrt(q.s); ctx.fillRect(q.x + Math.cos(an) * d, q.y + Math.sin(an) * d + age * 3, 2, 2); } }
    ctx.fillStyle = fs.core; ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
    ctx.globalAlpha = 1;
  }
}

function drawTimber(o, p, vis) {
  if (vis < 0.02) return;
  const { lat } = sideOn(o.x, o.y, o.ang);
  const w = o.len * p.s * (0.25 + 0.75 * lat), h = Math.max(1, 0.7 * p.s);
  ctx.globalAlpha = vis;
  ctx.fillStyle = 'rgba(225,235,248,0.3)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.62, Math.max(1, h * 0.5), 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#4a3a2b';
  ctx.beginPath(); ctx.ellipse(p.x, p.y - h * 0.3, w / 2, h / 2, 0, 0, 6.28); ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------- the scene ----------
function drawScene() {
  hy = H * (VIEW.third ? (W < 600 ? CHASE.phoneHorizon : CHASE.horizon) : 0.46) + Math.sin(ship.bob * 1.1) * H * 0.006;
  const third = VIEW.third;
  if (third) { const c = chaseCamera(ship); camX = c.x; camY = c.y; camH = c.z; if (c.horizon != null) hy = Math.max(H * 0.08, c.horizon) + Math.sin(ship.bob * 1.1) * H * 0.006; }
  else { camX = ship.x; camY = ship.y; camH = SK.CAM_H; }
  yaw = ship.h;
  const roll = reduceMotion ? 0 : (Math.sin(ship.bob * 0.9) * 0.018 + ship.rudder * 0.025) * (third ? 0.3 : 1);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.translate(cx, hy); ctx.rotate(roll); ctx.translate(-cx, -hy);
  if (g.shake > 0 && !reduceMotion) ctx.translate(rand(-6, 6) * g.shake, rand(-6, 6) * g.shake);

  if (g.backrooms) drawRoomsBack();
  else {
  drawSky();
  drawSea();

  var HB = SK.HARBOUR;
  drawCoast();

  var far = SK.BEAM_RANGE;
  var beamOn = Math.abs(g.beam) < SK.SHADE + SK.HALF_BEAM;
  var fl = [Math.sin(g.beam - SK.HALF_BEAM) * far, Math.cos(g.beam - SK.HALF_BEAM) * far];
  var fr = [Math.sin(g.beam + SK.HALF_BEAM) * far, Math.cos(g.beam + SK.HALF_BEAM) * far];
  if (beamOn) {
    ctx.globalCompositeOperation = 'lighter';
    fillPoly([[0, 0, 0], [fl[0], fl[1], 0], [fr[0], fr[1], 0]], 'rgba(120,150,190,0.16)');
    ctx.globalCompositeOperation = 'source-over';
  }

  // waves near the ship, tiled so they never run out
  ctx.beginPath();
  const T = 600, drift = g.t * 0.8;
  for (const w of waves) {
    const wx = camX + ((((w.x + drift - camX) % T) + T * 1.5) % T - T / 2);
    const wy = camY + ((((w.y - camY) % T) + T * 1.5) % T - T / 2);
    const c = cam(wx, wy, 0); if (c.f < 4) continue;
    const q = proj(c); if (q.x < -20 || q.x > W + 20) continue;
    const lit = beamOn ? litAt(wx, wy) : 0, local = Math.max(0, 1 - c.f / 40);
    if (0.08 + 0.45 * lit + 0.25 * local < 0.1) continue;
    ctx.moveTo(q.x - w.len * q.s / 2, q.y + Math.sin(g.t * 1.3 + w.ph) * 0.2 * q.s); ctx.lineTo(q.x + w.len * q.s / 2, q.y);
  }
  ctx.strokeStyle = 'rgba(170,200,235,0.28)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // everything on the water, far to near
  if (!g.backrooms) { rememberLit(g.rocks); rememberLit(g.wrecks); rememberLit(g.timber); }
  const items = [];
  const add = (kind, o) => { const c = cam(o.x, o.y, 0); if (c.f > SK.NEAR + 2) items.push({ kind, o, c }); };
  for (const o of g.rocks) if (!o.gone) add('rock', o);
  for (const o of g.wrecks) add('wreck', o);
  for (const o of g.timber) add('timber', o);
  if (g.backrooms) { add('exit', g.exit); drawRoomWalls(); }
  for (const o of g.pickups || []) if (!o.taken) add('pickup', o);
  if (third) { const c = cam(ship.x, ship.y, 0); if (c.f > SK.NEAR) items.push({ kind: 'self', o: ship, c }); }
  add('plim', g.plim);
  if (crewMode) for (const m of matesAtSea()) if (m.peer !== NET.watch) add('mate', m);
  if (!NET.watch) { for (const d of g.enemies.drowned) add('drowned', d); for (const k of g.enemies.knocks) add('knock', k); }
  if (g.maren.active) add('maren', g.maren);
  items.sort((a, b) => b.c.f - a.c.f);
  for (const it of items) {
    // in the rooms, anything behind a wall is hidden by it, column by column
    const clip = g.backrooms;
    if (clip) { ctx.save(); clipToVisible(it.c.f); }
    try {
    if (it.kind === 'exit') { drawExitSign(); continue; }
    const q = proj(it.c); if (q.x < -500 || q.x > W + 500) continue;
    const o = it.o;
    let vis = visibility(o.x, o.y);
    if (it.kind === 'rock' || it.kind === 'wreck' || it.kind === 'timber') vis = Math.max(vis, afterglow(o));
    if (it.kind === 'rock') drawRockDetailed(o, q, vis);
    else if (it.kind === 'wreck') drawWreck(o, q, vis);
    else if (it.kind === 'timber') drawTimber(o, q, vis);
    else if (it.kind === 'self') drawShip3D(ship, ship.skin || mySkin(), BOAT_BY_ID[ship.boat] || BOATS[0], 1, { pennant: 'pennant' in ship ? ship.pennant : myPennant(), minLit: 1, sailAlpha: 0.7, brace: 0.95 + ship.rudder * 0.25 });
    else if (it.kind === 'pickup') drawPickup(o, q, vis);
    else if (it.kind === 'plim') drawPlimsoll(q, vis);
    else if (it.kind === 'mate') drawMate(o, q, vis);
    else if (it.kind === 'drowned') drawDrowned(o, q, vis);
    else if (it.kind === 'knock') drawKnock(o, q, vis);
    else drawMaren(q, vis);
    } finally { if (clip) ctx.restore(); }
  }

  if (!g.backrooms) {
  drawLighthouse(beamOn, fl, fr, far);

  for (const [hx, col] of [[-23, '#e46c4f'], [23, '#86cfae']]) {
    const c = cam(HB.x + hx, 46, 7); if (c.f > SK.NEAR) { const q = proj(c); lamp(q.x, q.y, col, Math.max(2.4, 1.4 * Math.sqrt(q.s))); }
  }
  drawLures();
  }
  drawFlares();
  drawCannonShots();
  for (const q of g.parts) {
    const c = cam(q.x, q.y, q.z); if (c.f < SK.NEAR) continue;
    const s = proj(c);
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.c; const sz = Math.max(1.5, 0.4 * s.s); ctx.fillRect(s.x, s.y, sz, sz);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (!third) { drawDeck(); drawBowspritApparition(); }
  drawVerity();

  if (g.glare > 0.01) { ctx.fillStyle = `rgba(255,238,200,${g.glare * 0.55})`; ctx.fillRect(0, 0, W, H); }
  if (ship.inv > 1.1) { ctx.fillStyle = `rgba(228,108,79,${(ship.inv - 1.1) * 0.8})`; ctx.fillRect(0, 0, W, H); }
  if (g.bellFlash > 0) { ctx.fillStyle = `rgba(236,228,207,${g.bellFlash * 0.25})`; ctx.fillRect(0, 0, W, H); }
  drawDread();
  drawAtmosphere();
  drawCompass();
}

// the bow of the brig, from just aft of the foremast
function drawDeck() {
  const boat = BOAT_BY_ID[ship.boat] || BOATS[0];
  const tipY = H * boat.tipY, lit = g.glare, DW = W * boat.deckW;
  const skin = ship.skin || mySkin();
  // the planked deck, rails and rope come from a cached picture; the light on them is added here
  ctx.drawImage(buildDeck(boat, skin), 0, 0, W, H);
  if (lit > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(150,115,70,${lit * 0.45})`;
    ctx.beginPath(); ctx.moveTo(cx - DW, H + 2); ctx.lineTo(cx, tipY); ctx.lineTo(cx + DW, H + 2); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  drawDeckFx(skin, tipY, DW, boat.rail);
  // the deck lantern's warm pool on the wet planks
  { const lx0 = cx + Math.min(W * 0.28, 220), ly0 = H * 0.8;
    const pool = ctx.createRadialGradient(lx0, ly0 + 30, 4, lx0, ly0 + 30, Math.min(W, H) * 0.3);
    pool.addColorStop(0, 'rgba(255,196,120,0.16)'); pool.addColorStop(1, 'rgba(255,196,120,0)');
    ctx.fillStyle = pool; ctx.fillRect(lx0 - W * 0.4, ly0 - H * 0.3, W * 0.8, H * 0.6); }
  // the barque's heavy catheads and anchors either side of the bow
  if (boat.id === 'barque') for (const sd of [-1, 1]) {
    const ax = cx + sd * DW * 0.34, ay = tipY + (H - tipY) * 0.42;
    ctx.fillStyle = skin.wood; ctx.fillRect(ax - 14, ay - 4, 28, 8);
    ctx.strokeStyle = '#1a1714'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax + sd * 12, ay); ctx.lineTo(ax + sd * 12, ay + 22); ctx.arc(ax + sd * 12, ay + 14, 9, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  // a cutter's long running bowsprit is thin; a barque's is a tree trunk
  const bsw = boat.id === 'cutter' ? 6 : boat.id === 'barque' ? 13 : 9;
  const bsg = ctx.createLinearGradient(cx - bsw, 0, cx + bsw, 0);
  bsg.addColorStop(0, mix(skin.wood, '#000000', 0.4)); bsg.addColorStop(0.45, mix(skin.wood, '#ffffff', 0.18)); bsg.addColorStop(1, mix(skin.wood, '#000000', 0.5));
  ctx.fillStyle = bsg;
  ctx.beginPath(); ctx.moveTo(cx - bsw, tipY + 6); ctx.lineTo(cx + bsw, tipY + 6); ctx.lineTo(cx + 2, hy + H * (boat.id === 'cutter' ? 0.03 : 0.07)); ctx.lineTo(cx - 2, hy + H * (boat.id === 'cutter' ? 0.03 : 0.07)); ctx.closePath(); ctx.fill();
  // your pennant, flying from a short staff at the tip of the bowsprit
  const pen = 'pennant' in ship ? ship.pennant : myPennant();
  if (pen) {
    const px = cx, py = hy + H * 0.07, staff = Math.max(14, H * 0.03);
    ctx.strokeStyle = skin.wood; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - staff); ctx.stroke();
    ctx.globalAlpha = Math.max(0.55, Math.min(1, 0.55 + g.glare));
    drawPennant(ctx, px + 1, py - staff + 2, Math.min(56, W * 0.06), pen, g.t);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = 'rgba(20,14,10,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, hy + H * 0.07); ctx.lineTo(cx - W * 0.2, -10); ctx.moveTo(cx, hy + H * 0.07); ctx.lineTo(cx + W * 0.05, -10); ctx.stroke();
  const sp = Math.min(1, ship.v / 12);
  ctx.strokeStyle = `rgba(220,232,245,${0.15 + 0.3 * sp})`; ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + s * 14, tipY + 4);
    ctx.quadraticCurveTo(cx + s * W * 0.12, tipY + 2 + Math.sin(g.t * 6) * 2, cx + s * W * 0.22, tipY + 18); ctx.stroke();
  }
  drawCannonDeck(tipY, DW, skin);
  updateSpray(tipY);
  const lx = cx + Math.min(W * 0.28, 220), ly = H * 0.8;
  const flick = g.maren.stage >= 3 && !reduceMotion ? (Math.random() < 0.15 ? 0.4 : 1) : 1;
  drawLantern(lx, ly - 8, skin.lantern, flick);
}

// red closing in at the edges as she comes nearer
function drawDread() {
  const st = g.maren.active ? g.maren.stage : 0;
  if (st < 2) return;
  const a = [0, 0, 0.22, 0.38, 0.58][st] * (0.85 + 0.15 * Math.sin(g.t * (st * 2.2)));
  const gr = ctx.createRadialGradient(cx, H * 0.5, Math.min(W, H) * 0.25, cx, H * 0.5, Math.max(W, H) * 0.75);
  gr.addColorStop(0, 'rgba(60,0,0,0)'); gr.addColorStop(1, `rgba(60,0,0,${a})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}

function drawCompass() {
  if (W <= 520) return;   // no compass strip on phones
  const w = Math.min(W - 32, 560), x0 = cx - w / 2, y = W <= 520 ? 116 : 72, h = 26, span = 2.2;
  const xb = b => cx + (angDiff(b, ship.h) / span) * (w / 2);
  const inStrip = x => x > x0 + 3 && x < x0 + w - 3;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = 'rgba(6,10,20,0.66)'; ctx.fillRect(x0, y, w, h);
  ctx.strokeStyle = 'rgba(236,228,207,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(236,228,207,0.06)'; ctx.fillRect(cx - (fov / 2 / span) * (w / 2), y, (fov / span) * w / 2, h);
  ctx.fillStyle = 'rgba(255,216,138,0.9)'; ctx.fillRect(cx - 0.75, y, 1.5, 5);
  ctx.font = '700 10px "Courier Prime", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let i = 0; i < 32; i++) {
    const xx = xb(i / 32 * Math.PI * 2); if (!inStrip(xx)) continue;
    const cardinal = i % 4 === 0;
    if (cardinal) { ctx.fillStyle = 'rgba(143,152,171,0.95)'; ctx.fillText(names[i / 4], xx, y + h - 7); }
    ctx.fillStyle = 'rgba(143,152,171,0.5)'; ctx.fillRect(xx - 0.5, y, 1, cardinal ? 4 : 2.5);
  }
  const edgeArrow = (b, col) => {
    const left = angDiff(b, ship.h) < 0, ex = left ? x0 + 8 : x0 + w - 8;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(ex + (left ? -4 : 4), y + 10); ctx.lineTo(ex + (left ? 3 : -3), y + 5); ctx.lineTo(ex + (left ? 3 : -3), y + 15); ctx.closePath(); ctx.fill();
  };
  const HB = g.backrooms ? g.exit : SK.HARBOUR;
  const hb = bearingOf(HB.x - ship.x, HB.y - ship.y), hx = xb(hb);
  if (inStrip(hx) && g.backrooms) { ctx.fillStyle = '#3dff7a'; ctx.fillRect(hx - 5, y + 7, 10, 6); }
  else if (inStrip(hx)) { ctx.fillStyle = '#e46c4f'; ctx.fillRect(hx - 6, y + 7, 4, 6); ctx.fillStyle = '#86cfae'; ctx.fillRect(hx + 2, y + 7, 4, 6); }
  else edgeArrow(hb, '#86cfae');
  const pb = bearingOf(g.plim.x - ship.x, g.plim.y - ship.y), px = xb(pb);
  if (inStrip(px)) {
    ctx.fillStyle = '#5fd3ff';
    ctx.beginPath(); ctx.arc(px, y + 18, 3, 0, 6.28); ctx.fill();
    if (Math.hypot(g.plim.x - ship.x, g.plim.y - ship.y) < SK.PLIMSOLL_GUARD) { ctx.strokeStyle = 'rgba(95,211,255,0.7)'; ctx.beginPath(); ctx.arc(px, y + 18, 6, 0, 6.28); ctx.stroke(); }
  } else edgeArrow(pb, '#5fd3ff');
  for (const q of g.pickups || []) {
    if (q.taken || Math.hypot(q.x - ship.x, q.y - ship.y) > 600) continue;
    const qx = xb(bearingOf(q.x - ship.x, q.y - ship.y)); if (!inStrip(qx)) continue;
    ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.moveTo(qx, y + 3); ctx.lineTo(qx + 3, y + 6); ctx.lineTo(qx, y + 9); ctx.lineTo(qx - 3, y + 6); ctx.closePath(); ctx.fill();
  }
  if (crewMode) for (const m of matesAtSea()) {
    const mx = xb(bearingOf(m.x - ship.x, m.y - ship.y));
    if (!inStrip(mx) || m.peer === NET.watch) continue;
    ctx.fillStyle = SLOT_COLORS[m.slot] || SLOT_COLORS[1];
    ctx.fillRect(mx - 2.5, y + 15, 5, 5);
  }
  const lb = bearingOf(-ship.x, -ship.y), lx = xb(lb);
  if (inStrip(lx) && !g.backrooms) {
    const f = 1 - Math.min(1, Math.abs(angDiff(g.beam, bearingOf(ship.x, ship.y))) / 0.6);
    ctx.fillStyle = `rgba(255,216,138,${0.5 + 0.5 * f})`;
    ctx.beginPath(); ctx.moveTo(lx, y + 4); ctx.lineTo(lx + 3, y + 14); ctx.lineTo(lx - 3, y + 14); ctx.closePath(); ctx.fill();
  }
}

// ---------- Knock's jumpscare: his face, lunging at the glass ----------
function drawKnockScare(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const T = SK.KNOCK_SCARE_TIME;
  // the first instant: the scene goes black with an amber flicker
  ctx.fillStyle = Math.floor(t * 30) % 2 ? '#1a0d02' : '#000';
  ctx.fillRect(0, 0, W, H);
  if (!imgReady(IMG.knock)) return;
  const img = IMG.knock, iw = img.naturalWidth, ih = img.naturalHeight;
  // just his head and grin: the right-hand part of the picture (the bat is on the left), top third
  const fx = iw * 0.42, fw = iw * 0.56, faceH = ih * 0.36;
  const lunge = Math.min(1, t / 0.12);
  const k = 0.3 + lunge * 0.62 + Math.max(0, t - 0.12) * 0.18;
  const dw = Math.max(W, H * 0.9) * k, dh = dw * faceH / fw;
  const shake = reduceMotion ? 0 : 40 * (1 - t / T) + 10;
  const x = cx - dw / 2 + rand(-shake, shake), y = H * 0.42 - dh / 2 + rand(-shake, shake);
  const strips = reduceMotion ? 1 : 14;
  for (let i = 0; i < strips; i++) {
    const off = !reduceMotion && Math.random() < 0.4 ? (Math.random() - 0.5) * dw * 0.12 : 0;
    ctx.drawImage(img, fx, faceH * i / strips, fw, faceH / strips, x + off, y + dh * i / strips, dw, dh / strips + 0.6);
  }
  // he blinks out and back, nearer each time
  if (!reduceMotion && t > 0.3 && Math.random() < 0.12) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = `rgba(150,70,0,${0.18 + 0.15 * Math.sin(t * 50)})`;
  ctx.fillRect(0, 0, W, H);
  if (!reduceMotion && Math.random() < 0.15) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // the blow lands: a crack of white
  if (t > 0.62 && t < 0.72) { ctx.fillStyle = 'rgba(255,240,210,0.7)'; ctx.fillRect(0, 0, W, H); }
}

// ---------- the jumpscare ----------
function drawScare(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const flick = Math.floor(t * 28) % 2;
  ctx.fillStyle = flick ? '#160000' : '#000';
  ctx.fillRect(0, 0, W, H);
  if (!imgReady(IMG.maren)) return;
  const grow = Math.min(1, t / 0.18);
  const k = 0.55 + grow * 0.85 + Math.max(0, t - 0.18) * 0.35;
  const h = H * k, w = h * SK.MAREN_ASPECT;
  const shake = reduceMotion ? 0 : 34 * (1 - t / SK.SCARE_TIME) + 8;
  const x = cx - w / 2 + rand(-shake, shake), y = H * 0.56 - h * 0.5 + rand(-shake, shake);
  drawGlitch(IMG.maren, x, y, w, h, 0.7);
  if (!reduceMotion && t < SK.SCARE_TIME - 0.4) {
    ctx.globalAlpha = 0.35;
    drawGlitch(IMG.maren, x + rand(-30, 30), y + rand(-20, 20), w * 1.08, h * 1.08, 1);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = `rgba(170,0,0,${0.22 + 0.18 * Math.sin(t * 47)})`;
  ctx.fillRect(0, 0, W, H);
  if (!reduceMotion && Math.random() < 0.18) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
}
