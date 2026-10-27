// The Barque's bow cannon. When a rock is dead ahead and she's about to run onto it, the cannon fires
// on its own and blows it apart before she hits. It holds one charge and reloads SK.CANNON_RELOAD seconds after firing. In a crew the rock is gone
// for everyone (rocks are the same, in the same order, on every ship of a crew voyage).

const CANNON_LOOK_S = 1.4;   // how far ahead (in seconds at your speed) it watches, up to SK.CANNON_RANGE metres

function newCannon() { return { charges: ship.boat === 'barque' ? SK.CANNON_CHARGES : 0, cd: 0, shots: [], muzzle: 0, reload: 0 }; }

function updateCannon(dt) {
  const C = g.cannon; if (!C || g.sky) return;
  if (C.cd > 0) C.cd -= dt;
  if (C.muzzle > 0) C.muzzle -= dt;
  // reloading: one charge back every SK.CANNON_RELOAD seconds until she's full
  if (ship.boat === 'barque' && C.charges < SK.CANNON_CHARGES && state === 'play') {
    C.reload -= dt;
    if (C.reload <= 0) { C.charges++; C.reload = C.charges < SK.CANNON_CHARGES ? SK.CANNON_RELOAD : 0; sfxReload(); }
    renderCannon();
  }
  // cannonballs in flight
  for (const s of C.shots) {
    s.t += dt;
    if (!s.hit && s.t >= s.dur) { s.hit = true; smash(s.rock, true); }
  }
  C.shots = C.shots.filter(s => s.t < s.dur + 1.2);
  if (g.attract || state !== 'play' || C.charges <= 0 || C.cd > 0 || g.backrooms) return;
  // anything in the hull's path within the next couple of seconds?
  const boat = BOAT_BY_ID[ship.boat] || BOATS[0];
  const sx = Math.sin(ship.h), sy = Math.cos(ship.h), look = Math.min(SK.CANNON_RANGE, Math.max(16, ship.v * CANNON_LOOK_S));
  let target = null, best = Infinity;
  for (const r of g.rocks) {
    if (r.gone || r.doomed) continue;
    const dx = r.x - ship.x, dy = r.y - ship.y;
    if (Math.abs(dx) > look + 30 || Math.abs(dy) > look + 30) continue;
    const fwd = dx * sx + dy * sy, lat = dx * sy - dy * sx;
    if (fwd < boat.bow + 4 || fwd > look + r.r) continue;
    if (Math.abs(lat) > r.r + boat.beam + 0.5) continue;
    if (fwd < best) { best = fwd; target = r; }
  }
  if (target) fireCannon(target);
}

function fireCannon(r) {
  const C = g.cannon;
  C.charges--; C.cd = 0.8; C.muzzle = 0.35;
  if (C.reload <= 0) C.reload = SK.CANNON_RELOAD;
  r.doomed = true;   // she can no longer hit it; it shatters when the ball lands
  const boat = BOAT_BY_ID[ship.boat] || BOATS[0];
  const x0 = ship.x + Math.sin(ship.h) * boat.bow, y0 = ship.y + Math.cos(ship.h) * boat.bow;
  const d = Math.hypot(r.x - x0, r.y - y0);
  C.shots.push({ x0, y0, rock: r, t: 0, dur: Math.max(0.12, Math.min(0.6, d / 140)), hit: false });
  sfxCannon();
  if (typeof padRumble === 'function') padRumble(0.9, 0.3, 220);
  g.shake = Math.max(g.shake, 0.35);
  burst(x0, y0, ['#d8d2c4', '#9a948a', '#6e6a64'], 14, 4, 4);
  addLog('The bow gun fires at the rock ahead! Reloading.', 'p');
  renderCannon();
  if (crewMode) { NET.cannonN = (NET.cannonN || 0) + 1; NET.cannon = { n: NET.cannonN, i: g.rocks.indexOf(r) }; send(); }
}

// break a rock apart: it's gone, with stone and spray thrown up where it stood
function smash(r, mine) {
  if (!r || r.gone) return;
  r.gone = true; r.doomed = true;
  const near = Math.hypot(r.x - ship.x, r.y - ship.y);
  burst(r.x, r.y, ['#5a5f68', '#7d828b', '#33373e', '#e8eef8', '#c8d6e8'], Math.min(60, 20 + r.r * 2.5), 10 + r.r * 0.4, 12);
  if (near < 900) sfxSmash(Math.max(0.15, 1 - near / 900));
  if (!mine && near < 900 && state === 'play') addLog('A crewmate’s gun blew a rock apart.', 'p');
}

// a crewmate's cannon took out a rock: it's gone on this ship too
function mateCannon(i) {
  if (!g || g.attract || !Number.isFinite(i)) return;
  const r = g.rocks[i | 0]; if (r) smash(r, false);
}

function renderCannon() {
  const box = $('cannonBox'); if (!box) return;
  const C = g && g.cannon;
  box.hidden = !C || !C.charges && ship.boat !== 'barque' || ship.boat !== 'barque';
  if (box.hidden) return;
  const marks = $('cannon');
  // a filling ring while it reloads
  const p = C.charges >= SK.CANNON_CHARGES ? 1 : 1 - Math.max(0, C.reload) / SK.CANNON_RELOAD;
  const key = C.charges + ':' + Math.round(p * 20);
  if (marks.dataset.key === key) return;
  marks.dataset.key = key;
  marks.textContent = '';
  for (let i = 0; i < SK.CANNON_CHARGES; i++) {
    const s = document.createElement('span'); s.className = 'shot' + (i < C.charges ? '' : ' off');
    if (i === C.charges) s.style.background = `conic-gradient(#c9ced6 ${Math.round(p * 360)}deg, transparent 0)`;
    marks.appendChild(s);
  }
}

// cannonballs in the air, drawn with the rest of the scene
function drawCannonShots() {
  const C = g.cannon; if (!C) return;
  for (const s of C.shots) {
    if (s.hit) continue;
    const k = Math.min(1, s.t / s.dur);
    const x = s.x0 + (s.rock.x - s.x0) * k, y = s.y0 + (s.rock.y - s.y0) * k, z = 3 + Math.sin(k * Math.PI) * 4 - k * 2;
    // a short smoke trail behind it
    for (let j = 1; j <= 5; j++) {
      const kk = Math.max(0, k - j * 0.06);
      const c = cam(s.x0 + (s.rock.x - s.x0) * kk, s.y0 + (s.rock.y - s.y0) * kk, 3 + Math.sin(kk * Math.PI) * 4 - kk * 2);
      if (c.f < SK.NEAR) continue;
      const q = proj(c); ctx.fillStyle = `rgba(200,200,205,${0.25 - j * 0.04})`;
      ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.5, 0.6 * q.s * (1 + j * 0.3)), 0, 6.28); ctx.fill();
    }
    const c = cam(x, y, z); if (c.f < SK.NEAR) continue;
    const q = proj(c);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.8, 0.35 * q.s), 0, 6.28); ctx.fill();
  }
}

// the gun on the foredeck, and its flash and smoke when it fires
function drawCannonDeck(tipY, DW, skin) {
  if (ship.boat !== 'barque' || !g.cannon) return;
  const C = g.cannon;
  const gx = cx + DW * 0.06, gy = tipY + (H - tipY) * 0.33, L = Math.max(34, (H - tipY) * 0.32);
  const recoil = C.muzzle > 0 ? (C.muzzle / 0.35) * 8 : 0;
  // carriage
  ctx.fillStyle = mix(skin.wood, '#000000', 0.25);
  ctx.fillRect(gx - L * 0.28, gy + recoil, L * 0.56, L * 0.22);
  ctx.fillStyle = '#1a1714';
  for (const sx of [-0.2, 0.2]) { ctx.beginPath(); ctx.arc(gx + sx * L, gy + L * 0.24 + recoil, L * 0.09, 0, 6.28); ctx.fill(); }
  // barrel, tapering towards the muzzle (up the screen, towards the bow)
  const bg = ctx.createLinearGradient(gx - L * 0.12, 0, gx + L * 0.12, 0);
  bg.addColorStop(0, '#16181b'); bg.addColorStop(0.45, '#4d535b'); bg.addColorStop(1, '#0e1012');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(gx - L * 0.13, gy + recoil); ctx.lineTo(gx + L * 0.13, gy + recoil);
  ctx.lineTo(gx + L * 0.07, gy - L * 0.62 + recoil); ctx.lineTo(gx - L * 0.07, gy - L * 0.62 + recoil); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0b0c0e'; ctx.fillRect(gx - L * 0.09, gy - L * 0.66 + recoil, L * 0.18, L * 0.06);
  ctx.fillStyle = '#5d636b'; ctx.fillRect(gx - L * 0.135, gy - L * 0.2 + recoil, L * 0.27, L * 0.04);
  if (C.muzzle > 0) {
    const k = C.muzzle / 0.35, mx = gx, my = gy - L * 0.7;
    ctx.globalCompositeOperation = 'lighter';
    lamp(mx, my, '#ffb050', 10 + 30 * k);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(210,205,198,${0.55 * (1 - k)})`;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(mx + Math.sin(i * 2.1) * 16 * (1.5 - k), my - (1 - k) * 40 - i * 6, 10 + (1 - k) * 18, 0, 6.28); ctx.fill(); }
  }
}
