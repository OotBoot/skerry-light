// The other things in the water.
//
// The drowned crew of the Gannet swim after any ship that comes into the skerries. They are slow,
// but if one reaches a ship sailing slowly it climbs aboard and tears out a plank. Ships going fast
// shake them off, the bell drives them under, and Plimsoll eats any he can catch.
//
// Knock is the Gannet's carved figurehead, walked off the wreck with a belaying pin. He moves only
// while nobody is looking at him: put him in your view in the beam, your lantern or a flare and he
// stops dead. You hear him coming, three knocks on wood, quicker and louder as he closes. If he
// reaches the hull he strikes it and is thrown back into the dark. The bell freezes him for a while.
//
// The wreckers' lights are a red and a green lamp, like the harbour piers, hung over a cluster of
// rocks to lure ships in. The lighthouse beam shows them for what they are: they go dark when it
// passes over them, and snuff out for good when a ship gets close.

function newEnemies(lures) {
  return { drowned: [], spawnT: 10, lures: lures || [], warnedLure: false, knocks: [], knockT: 22 };
}

// ---------- Knock ----------
function placeKnock(k, near) {
  for (let tries = 0; tries < 20; tries++) {
    const b = ship.h + Math.PI + rand(-1.6, 1.6), d = near ? rand(200, 260) : rand(240, 320);
    const x = ship.x + Math.sin(b) * d, y = ship.y + Math.cos(b) * d;
    if (y < 40) continue;
    k.x = x; k.y = y; return;
  }
  k.x = ship.x; k.y = ship.y + 280;
}
function knockSeen(k) {
  if (flareAt(k.x, k.y) > 0.2) return true;
  const inView = Math.abs(angDiff(bearingOf(k.x - ship.x, k.y - ship.y), ship.h)) < fov / 2;
  return inView && visibility(k.x, k.y) > 0.25;
}
function updateKnocks(dt) {
  const E = g.enemies;
  E.knockT -= dt;
  const max = g.n >= 4 ? 2 : 1;
  if (E.knockT <= 0 && E.knocks.length < max) {
    const k = { x: 0, y: 0, ph: 0, wait: 0, stun: 0, knockT: 1, seen: false, warned: false };
    placeKnock(k, false);
    E.knocks.push(k);
    E.knockT = 30;
    if (!E.knockWarned) { E.knockWarned = true; addLog('Somewhere behind you, three knocks on wood.', 'w'); }
  }
  for (const k of E.knocks) {
    if (k.stun > 0) k.stun -= dt;
    if (k.wait > 0) { k.wait -= dt; continue; }
    const dx = ship.x - k.x, dy = ship.y - k.y, dist = Math.hypot(dx, dy) || 1;
    k.seen = knockSeen(k);
    const moving = !k.seen && k.stun <= 0;
    if (moving) {
      const sp = (SK.KNOCK_SPEED + g.n * 0.5) * dt;
      k.x += dx / dist * sp; k.y += dy / dist * sp; k.ph += dt * 8;
      k.knockT -= dt;
      if (k.knockT <= 0 && dist < 420) {
        const pan = clamp(angDiff(bearingOf(k.x - ship.x, k.y - ship.y), ship.h) / (fov / 2), -1, 1);
        const near = 1 - dist / 420;
        sfxKnock(pan, 0.25 + near * 0.85, 0.22 - near * 0.1);
        k.knockT = 2.6 - near * 1.9;
      }
    }
    if (dist < 9) {
      k.wait = 15; placeKnock(k, true);
      if (ship.inv > 0 || state !== 'play') continue;
      ship.inv = 1.4; g.shake = 0.6;
      sfxKnock(0, 1.2, 0.09); sfxHit();
      burst(ship.x + Math.sin(ship.h) * 4, ship.y + Math.cos(ship.h) * 4, ['#c98a4a', '#ece4cf', '#8a6a4a'], 26, 7, 8);
      ship.hull--; run.hits++; g.stats.hits++;
      renderHud();
      if (ship.hull <= 0) { addLog('Knock beat the hull in, three blows, and she went down.', 'w'); endRun('sunk'); return; }
      addLog('Knock struck the hull. Keep a light on him and he cannot move.', 'w');
    }
  }
}
function bellStunsKnock() {
  let n = 0;
  for (const k of g.enemies.knocks) if (Math.hypot(k.x - ship.x, k.y - ship.y) < 160 && k.wait <= 0) { k.stun = SK.KNOCK_STUN; n++; }
  return n;
}
function drawKnock(k, q, vis) {
  if (vis < 0.02 || k.wait > 0 || !imgReady(IMG.knock)) return;
  const h = 5.2 * q.s, w = h * SK.KNOCK_ASPECT;
  const moving = !k.seen && k.stun <= 0;
  const bob = moving ? Math.abs(Math.sin(k.ph)) * 0.05 * h : 0;
  const tilt = reduceMotion ? 0 : (moving ? Math.sin(k.ph) * 0.07 : (Math.random() - 0.5) * 0.01);
  ctx.save();
  ctx.translate(q.x, q.y - bob);
  ctx.rotate(tilt);
  ctx.globalAlpha = vis * 0.2;
  ctx.save(); ctx.scale(1, -0.4); ctx.drawImage(IMG.knock, -w / 2, -h, w, h); ctx.restore();
  ctx.globalAlpha = vis;
  ctx.drawImage(IMG.knock, -w / 2, -h, w, h);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------- the drowned ----------
function spawnDrowned() {
  for (let tries = 0; tries < 20; tries++) {
    const b = ship.h + rand(-1.3, 1.3), d = rand(110, 170);
    const x = ship.x + Math.sin(b) * d, y = ship.y + Math.cos(b) * d;
    if (y < 40) continue;
    g.enemies.drowned.push({ x, y, ph: rand(0, 6.28), splashT: rand(0, 2), dead: false });
    return;
  }
}

function updateEnemies(dt) {
  const E = g.enemies;
  if (g.attract || state !== 'play') return;

  E.spawnT -= dt;
  const max = 2 + Math.min(4, g.n);
  if (E.spawnT <= 0) {
    if (E.drowned.length < max) spawnDrowned();
    E.spawnT = Math.max(5, 13 - g.n * 1.2) * rand(0.75, 1.25);
  }
  const sp = SK.DROWNED_SPEED + g.n * 0.4;
  for (const d of E.drowned) {
    const dx = ship.x - d.x, dy = ship.y - d.y, dist = Math.hypot(dx, dy) || 1;
    d.x += dx / dist * sp * dt; d.y += dy / dist * sp * dt; d.ph += dt * 3;
    const pan = clamp(angDiff(bearingOf(d.x - ship.x, d.y - ship.y), ship.h) / (fov / 2), -1, 1);
    d.splashT -= dt;
    if (dist < 90 && d.splashT <= 0) { d.splashT = rand(1.2, 2.6); sfxSplash(pan, 1 - dist / 90); }
    if (Math.hypot(g.plim.x - d.x, g.plim.y - d.y) < 12) {
      d.dead = true;
      g.stats.eaten++;
      burst(d.x, d.y, ['#c8d6e8', '#ece4cf'], 14, 6, 6);
      squeakFrom(g.plim, Math.hypot(g.plim.x - ship.x, g.plim.y - ship.y), 1.8);
      addLog('Plimsoll caught one of the drowned. Good shark.', 'p');
      continue;
    }
    if (dist < 7) {
      d.dead = true;
      if (ship.v > SK.DROWNED_OUTRUN) addLog('A drowned hand slid off the hull. She was going too fast for it.');
      else boarded();
    }
  }
  E.drowned = E.drowned.filter(d => !d.dead && Math.hypot(d.x - ship.x, d.y - ship.y) < 400);
  updateKnocks(dt);
  if (state !== 'play') return;

  for (const l of E.lures) {
    if (l.gone) continue;
    if (Math.hypot(l.x - ship.x, l.y - ship.y) < 45) {
      l.gone = true;
      const pan = clamp(angDiff(bearingOf(l.x - ship.x, l.y - ship.y), ship.h) / (fov / 2), -1, 1);
      sfxCackle(pan);
      addLog(E.warnedLure ? 'Another pair of false lights went out. Rocks below.' :
        'Those lamps went out. They were never the harbour. Wreckers hang false lights over rocks; trust the bearing strip.', 'w');
      E.warnedLure = true;
    }
  }
}

function boarded() {
  if (ship.inv > 0 || state !== 'play') return;
  ship.inv = 1.4; g.shake = 0.45;
  sfxClaw();
  ship.hull--; run.hits++; g.stats.hits++;
  renderHud();
  if (ship.hull <= 0) { addLog('The drowned crew pulled her under.', 'w'); endRun('sunk'); }
  else addLog('A drowned sailor climbed aboard and tore out a plank. Sail faster to shake them off.', 'w');
}

// the bell sends the drowned back under
function bellDrownsThem() {
  const E = g.enemies;
  let n = 0;
  for (const d of E.drowned) if (Math.hypot(d.x - ship.x, d.y - ship.y) < 90) { d.dead = true; n++; }
  E.drowned = E.drowned.filter(d => !d.dead);
  return n;
}

function drawDrowned(d, q, vis) {
  const s = q.s, r = Math.max(1.2, 0.32 * s);
  const x = q.x, y = q.y + Math.sin(d.ph) * 0.12 * s;
  // their eyes catch any light at all, so you can always see them coming
  ctx.fillStyle = `rgba(200,235,225,${0.22 + 0.55 * vis})`;
  const e = Math.max(1, r * 0.2);
  ctx.fillRect(x - r * 0.4 - e / 2, y - r * 1.05, e, e);
  ctx.fillRect(x + r * 0.4 - e / 2, y - r * 1.05, e, e);
  if (vis < 0.02) return;
  ctx.globalAlpha = vis;
  ctx.strokeStyle = 'rgba(225,235,248,0.35)'; ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.beginPath(); ctx.ellipse(x, y, r * 2.4, Math.max(1, r * 0.35), 0, 0, 6.28); ctx.stroke();
  ctx.fillStyle = '#8fa39a';
  ctx.beginPath(); ctx.arc(x, y - r * 0.85, r, Math.PI, 0); ctx.lineTo(x + r, y); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2c3a34'; ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) { ctx.moveTo(x + i * r * 0.35, y - r * 1.7); ctx.lineTo(x + i * r * 0.45, y - r * 0.2); }
  ctx.stroke();
  ctx.strokeStyle = '#7f938a'; ctx.lineWidth = Math.max(1, r * 0.32); ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const reach = Math.sin(d.ph * 0.9 + side) * 0.4;
    const hx = x + side * r * 2.1, hy = y - r * (3 + reach);
    ctx.beginPath(); ctx.moveTo(x + side * r * 0.9, y - r * 0.3); ctx.quadraticCurveTo(x + side * r * 2.2, y - r * 1.2, hx, hy); ctx.stroke();
    ctx.lineWidth = Math.max(0.8, r * 0.12);
    ctx.beginPath();
    for (let f = -1; f <= 1; f++) { ctx.moveTo(hx, hy); ctx.lineTo(hx + side * r * 0.25 + f * r * 0.25, hy - r * 0.55); }
    ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.32);
  }
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 1;
}

// ---------- the wreckers' lights ----------
function lureLamps(l) {
  const sway = Math.sin(g.t * 0.6 + l.ph) * 2;
  const qx = l.py, qy = -l.px;   // across the line of approach, so the "gap" faces the ships
  return [[l.x - qx * 23 + sway, l.y - qy * 23, '#e46c4f'], [l.x + qx * 23 + sway, l.y + qy * 23, '#86cfae']];
}
function drawLures() {
  for (const l of g.enemies.lures) {
    if (l.gone || litAt(l.x, l.y) > 0) continue;   // the beam shows them up: no lamps there at all
    for (const [x, y, col] of lureLamps(l)) {
      const c = cam(x, y, 7); if (c.f < SK.NEAR) continue;
      const q = proj(c);
      const flick = 0.85 + 0.15 * Math.sin(g.t * 3 + l.ph);
      ctx.globalAlpha = flick;
      lamp(q.x, q.y, col, Math.max(2.4, 1.4 * Math.sqrt(q.s)));
      ctx.globalAlpha = 1;
    }
  }
}
