// Drawing the night: a simple perspective camera on the ship's deck, the sea, the skerries,
// the lighthouse and its beam, the bow of your brig, and the bearing strip.

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let W = 0, H = 0, dpr = 1, fov = 1.2, focal = 1, cx = 0, hy = 0;
let camX = 0, camY = 0, yaw = 0;

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
function proj(c) { const k = focal / c.f; return { x: cx + c.r * k, y: hy + (SK.CAM_H - c.z) * k, s: k, f: c.f }; }
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
function visibility(x, y) { return Math.min(1, litAt(x, y) * 1.3 + lanternAt(x, y) + flareAt(x, y)); }

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
  const hullVis = Math.max(vis, Math.max(0, 1 - d / 140) * 0.85);
  const col = SLOT_COLORS[m.slot] || SLOT_COLORS[1];
  const L = 20 * p.s, { lat, dir } = sideOn(m.x, m.y, m.h);
  const w = L * (0.28 + 0.72 * lat), hh = Math.max(1.2, L * 0.12);
  const x = p.x, y = p.y + Math.sin(m.bob * 2.2) * L * 0.01;
  const sailH = L * 0.58;
  if (hullVis > 0.02) {
    ctx.globalAlpha = hullVis;
    const skin = m.skin || SKINS[0];
    ctx.fillStyle = skin.hull;
    ctx.beginPath();
    ctx.moveTo(x - dir * w / 2, y - hh); ctx.lineTo(x + dir * (w / 2 + L * 0.08), y - hh * 1.15);
    ctx.lineTo(x + dir * w * 0.42, y); ctx.lineTo(x - dir * w * 0.45, y); ctx.closePath(); ctx.fill();
    const sailW = L * 0.17 * (1.35 - 0.6 * lat);
    for (const mm of [-0.2, 0.18]) {
      const mx = x + dir * mm * w * 1.6;
      ctx.strokeStyle = '#2a2018'; ctx.lineWidth = Math.max(0.8, L * 0.025);
      ctx.beginPath(); ctx.moveTo(mx, y - hh); ctx.lineTo(mx, y - hh - sailH * 1.08); ctx.stroke();
      ctx.fillStyle = skin.sail;
      ctx.beginPath();
      ctx.moveTo(mx - sailW * 0.55, y - hh - sailH * 0.12); ctx.lineTo(mx + sailW * 0.55, y - hh - sailH * 0.12);
      ctx.lineTo(mx + sailW * 0.4, y - hh - sailH); ctx.lineTo(mx - sailW * 0.4, y - hh - sailH); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  lamp(x, y - hh - sailH * 0.3, col, Math.max(1.8, 1.3 * Math.sqrt(p.s)));
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
    lamp(q.x, q.y, '#ff8a5a', Math.max(3, 2.4 * Math.sqrt(q.s)) * (age < 1 ? 1.6 : 1));
    ctx.fillStyle = '#fff3d6'; ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
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
  hy = H * 0.46 + Math.sin(ship.bob * 1.1) * H * 0.006;
  camX = ship.x; camY = ship.y; yaw = ship.h;
  const roll = reduceMotion ? 0 : Math.sin(ship.bob * 0.9) * 0.018 + ship.rudder * 0.025;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.translate(cx, hy); ctx.rotate(roll); ctx.translate(-cx, -hy);
  if (g.shake > 0 && !reduceMotion) ctx.translate(rand(-6, 6) * g.shake, rand(-6, 6) * g.shake);

  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, '#03060d'); sky.addColorStop(1, '#0c1530');
  ctx.fillStyle = sky; ctx.fillRect(-W, -H, W * 3, hy + H);
  const sea = ctx.createLinearGradient(0, hy, 0, H);
  sea.addColorStop(0, '#0a1424'); sea.addColorStop(1, '#040912');
  ctx.fillStyle = sea; ctx.fillRect(-W, hy, W * 3, H * 2);

  for (const st of stars) {
    const d = angDiff(st.b, yaw); if (Math.abs(d) > fov / 2 + 0.2) continue;
    const x = cx + Math.tan(d) * focal, y = hy - Math.tan(st.e) * focal;
    if (y < -40) continue;
    ctx.fillStyle = `rgba(236,228,207,${0.2 + 0.55 * st.m * (0.7 + 0.3 * Math.sin(g.t * 2 + st.ph))})`;
    const sz = st.m > 0.8 ? 1.6 : 1; ctx.fillRect(x, y, sz, sz);
  }

  const HB = SK.HARBOUR;
  fillPoly([[-15000, 0, 1.5], [15000, 0, 1.5], [15000, -15000, 1.5], [-15000, -15000, 1.5]], '#070b09');
  fillPoly([[-15000, -30, 30], [15000, -30, 30], [15000, -15000, 60], [-15000, -15000, 60]], '#0a100c');
  fillPoly([[-40, 4, 22], [40, 4, 22], [55, -60, 22], [-60, -60, 22]], '#0b120d');
  fillPoly([[HB.x - 26, -2, 2], [HB.x - 20, -2, 2], [HB.x - 20, 46, 2], [HB.x - 26, 46, 2]], '#1a1612');
  fillPoly([[HB.x + 20, -2, 2], [HB.x + 26, -2, 2], [HB.x + 26, 46, 2], [HB.x + 20, 46, 2]], '#1a1612');

  const far = SK.BEAM_RANGE;
  const beamOn = Math.abs(g.beam) < SK.SHADE + SK.HALF_BEAM;
  const fl = [Math.sin(g.beam - SK.HALF_BEAM) * far, Math.cos(g.beam - SK.HALF_BEAM) * far];
  const fr = [Math.sin(g.beam + SK.HALF_BEAM) * far, Math.cos(g.beam + SK.HALF_BEAM) * far];
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

  // everything on the water, far to near
  const items = [];
  const add = (kind, o) => { const c = cam(o.x, o.y, 0); if (c.f > SK.NEAR + 2) items.push({ kind, o, c }); };
  for (const o of g.rocks) add('rock', o);
  for (const o of g.wrecks) add('wreck', o);
  for (const o of g.timber) add('timber', o);
  add('plim', g.plim);
  if (crewMode) for (const m of matesAtSea()) if (m.peer !== NET.watch) add('mate', m);
  if (!NET.watch) { for (const d of g.enemies.drowned) add('drowned', d); for (const k of g.enemies.knocks) add('knock', k); }
  if (g.maren.active) add('maren', g.maren);
  items.sort((a, b) => b.c.f - a.c.f);
  for (const it of items) {
    const q = proj(it.c); if (q.x < -500 || q.x > W + 500) continue;
    const o = it.o, vis = visibility(o.x, o.y);
    if (it.kind === 'rock') drawRock(o, q, vis);
    else if (it.kind === 'wreck') drawWreck(o, q, vis);
    else if (it.kind === 'timber') drawTimber(o, q, vis);
    else if (it.kind === 'plim') drawPlimsoll(q, vis);
    else if (it.kind === 'mate') drawMate(o, q, vis);
    else if (it.kind === 'drowned') drawDrowned(o, q, vis);
    else if (it.kind === 'knock') drawKnock(o, q, vis);
    else drawMaren(q, vis);
  }

  // lighthouse tower and lamp
  const base = cam(0, 0, 22), top = cam(0, 0, 52);
  if (base.f > SK.NEAR) {
    const b = proj(base), t = proj(top), hw = 4 * b.s;
    ctx.fillStyle = '#2a2925';
    ctx.beginPath(); ctx.moveTo(b.x - hw * 1.3, b.y); ctx.lineTo(b.x + hw * 1.3, b.y); ctx.lineTo(t.x + hw, t.y); ctx.lineTo(t.x - hw, t.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a2420';
    const mid = (b.y + t.y) / 2;
    ctx.fillRect(b.x - hw * 1.15, mid - (b.y - t.y) * 0.08, hw * 2.3, (b.y - t.y) * 0.16);
    const facing = 1 - Math.min(1, Math.abs(angDiff(g.beam, bearingOf(camX, camY))) / 0.5);
    const shown = Math.abs(bearingOf(camX, camY)) < SK.SHADE ? facing : 0;
    lamp(t.x, t.y - 2, '#ffd88a', Math.max(2.5, 2 * Math.sqrt(t.s)) * (1 + shown * 6));
  }
  if (beamOn) {
    const L = [0, 0, 54], spread = far * Math.tan(SK.HALF_BEAM) * 0.35;
    ctx.globalCompositeOperation = 'lighter';
    fillPoly([L, [fl[0], fl[1], 54 + spread], [fr[0], fr[1], 54 + spread]], 'rgba(255,216,138,0.06)');
    fillPoly([L, [fl[0], fl[1], 54 - spread], [fr[0], fr[1], 54 - spread]], 'rgba(255,216,138,0.05)');
    ctx.globalCompositeOperation = 'source-over';
  }

  for (const tl of town) {
    const c = cam(tl.x, tl.y, tl.z); if (c.f < SK.NEAR) continue;
    const q = proj(c); if (q.x < -10 || q.x > W + 10) continue;
    ctx.fillStyle = `rgba(255,200,120,${0.45 + 0.2 * Math.sin(g.t * 0.7 + tl.ph)})`;
    ctx.fillRect(q.x, q.y, Math.max(1.5, q.s * 1.2), Math.max(1.5, q.s * 1.2));
  }
  for (const [hx, col] of [[-23, '#e46c4f'], [23, '#86cfae']]) {
    const c = cam(HB.x + hx, 46, 7); if (c.f > SK.NEAR) { const q = proj(c); lamp(q.x, q.y, col, Math.max(2.4, 1.4 * Math.sqrt(q.s))); }
  }
  drawLures();
  drawFlares();
  for (const q of g.parts) {
    const c = cam(q.x, q.y, q.z); if (c.f < SK.NEAR) continue;
    const s = proj(c);
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.c; const sz = Math.max(1.5, 0.4 * s.s); ctx.fillRect(s.x, s.y, sz, sz);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawDeck();
  drawBowspritApparition();

  if (g.glare > 0.01) { ctx.fillStyle = `rgba(255,238,200,${g.glare * 0.55})`; ctx.fillRect(0, 0, W, H); }
  if (ship.inv > 1.1) { ctx.fillStyle = `rgba(228,108,79,${(ship.inv - 1.1) * 0.8})`; ctx.fillRect(0, 0, W, H); }
  if (g.bellFlash > 0) { ctx.fillStyle = `rgba(236,228,207,${g.bellFlash * 0.25})`; ctx.fillRect(0, 0, W, H); }
  drawDread();
  drawCompass();
}

// the bow of the brig, from just aft of the foremast
function drawDeck() {
  const tipY = H * 0.72, lit = g.glare;
  const deck = ctx.createLinearGradient(0, tipY, 0, H);
  const skin = ship.skin || mySkin();
  deck.addColorStop(0, mix(skin.deck[0], '#6a5034', lit * 0.7)); deck.addColorStop(1, mix(skin.deck[1], '#3a2a1a', lit * 0.7));
  ctx.fillStyle = deck;
  ctx.beginPath(); ctx.moveTo(cx - W * 0.75, H + 2); ctx.lineTo(cx, tipY); ctx.lineTo(cx + W * 0.75, H + 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(cx, tipY); ctx.lineTo(cx + i * W * 0.14, H + 2); ctx.stroke(); }
  ctx.strokeStyle = skin.rail; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(cx - W * 0.75, H - 4); ctx.lineTo(cx - 6, tipY + 2); ctx.moveTo(cx + W * 0.75, H - 4); ctx.lineTo(cx + 6, tipY + 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,216,138,0.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - W * 0.75, H - 9); ctx.lineTo(cx - 6, tipY - 2); ctx.moveTo(cx + W * 0.75, H - 9); ctx.lineTo(cx + 6, tipY - 2); ctx.stroke();
  ctx.fillStyle = skin.wood;
  ctx.beginPath(); ctx.moveTo(cx - 9, tipY + 6); ctx.lineTo(cx + 9, tipY + 6); ctx.lineTo(cx + 2, hy + H * 0.07); ctx.lineTo(cx - 2, hy + H * 0.07); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,10,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, hy + H * 0.07); ctx.lineTo(cx - W * 0.2, -10); ctx.moveTo(cx, hy + H * 0.07); ctx.lineTo(cx + W * 0.05, -10); ctx.stroke();
  const sp = Math.min(1, ship.v / 12);
  ctx.strokeStyle = `rgba(220,232,245,${0.15 + 0.3 * sp})`; ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + s * 14, tipY + 4);
    ctx.quadraticCurveTo(cx + s * W * 0.12, tipY + 2 + Math.sin(g.t * 6) * 2, cx + s * W * 0.22, tipY + 18); ctx.stroke();
  }
  const lx = cx + Math.min(W * 0.28, 220), ly = H * 0.8;
  const flick = g.maren.stage >= 3 && !reduceMotion ? (Math.random() < 0.15 ? 0.4 : 1) : 1;
  ctx.strokeStyle = '#2a1e14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly - 30); ctx.lineTo(lx, ly - 10); ctx.stroke();
  ctx.globalAlpha = flick; lamp(lx, ly, skin.lantern, 7); ctx.fillStyle = mix(skin.lantern, '#ffffff', 0.5); ctx.fillRect(lx - 4, ly - 6, 8, 10); ctx.globalAlpha = 1;
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
  const w = Math.min(W - 32, 560), x0 = cx - w / 2, y = 72, h = 26, span = 2.2;
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
  const HB = SK.HARBOUR;
  const hb = bearingOf(HB.x - ship.x, HB.y - ship.y), hx = xb(hb);
  if (inStrip(hx)) { ctx.fillStyle = '#e46c4f'; ctx.fillRect(hx - 6, y + 7, 4, 6); ctx.fillStyle = '#86cfae'; ctx.fillRect(hx + 2, y + 7, 4, 6); }
  else edgeArrow(hb, '#86cfae');
  const pb = bearingOf(g.plim.x - ship.x, g.plim.y - ship.y), px = xb(pb);
  if (inStrip(px)) {
    ctx.fillStyle = '#5fd3ff';
    ctx.beginPath(); ctx.arc(px, y + 18, 3, 0, 6.28); ctx.fill();
    if (Math.hypot(g.plim.x - ship.x, g.plim.y - ship.y) < SK.PLIMSOLL_GUARD) { ctx.strokeStyle = 'rgba(95,211,255,0.7)'; ctx.beginPath(); ctx.arc(px, y + 18, 6, 0, 6.28); ctx.stroke(); }
  } else edgeArrow(pb, '#5fd3ff');
  if (crewMode) for (const m of matesAtSea()) {
    const mx = xb(bearingOf(m.x - ship.x, m.y - ship.y));
    if (!inStrip(mx) || m.peer === NET.watch) continue;
    ctx.fillStyle = SLOT_COLORS[m.slot] || SLOT_COLORS[1];
    ctx.fillRect(mx - 2.5, y + 15, 5, 5);
  }
  const lb = bearingOf(-ship.x, -ship.y), lx = xb(lb);
  if (inStrip(lx)) {
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
