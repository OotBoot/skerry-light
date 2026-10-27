// Game state, the update step, voyages, input and the main loop.

const $ = id => document.getElementById(id);
let state = 'title', g = null, ship = null;
let run = { voyages: 0, hits: 0 };
let best = 0;
try { best = parseInt(localStorage.getItem('skerry-helm-best') || '0', 10) || 0; } catch (e) {}
const keys = {}, touches = new Map();
let sailHold = 0;   // the on-screen sail buttons

function newVoyage(n, attract, seed, slot) {
  const v = makeVoyage(n, attract, seed);
  ship = v.ship;
  // crewmates start abreast of each other, 40 m apart, alternating left and right of the leader
  // (in the Backrooms the rooms are too tight for that: three abreast, in rows going forward)
  if (slot && v.backrooms) { const lat = (slot % 3 - 1) * 15, fwd = Math.floor(slot / 3) * 20; ship.x += Math.cos(ship.h) * lat + Math.sin(ship.h) * fwd; ship.y += -Math.sin(ship.h) * lat + Math.cos(ship.h) * fwd; }
  else if (slot) { const lat = Math.ceil(slot / 2) * 40 * (slot % 2 ? -1 : 1); ship.x += Math.cos(ship.h) * lat; ship.y -= Math.sin(ship.h) * lat; }
  const beam0 = seed != null ? (seed % 1000) / 1000 * 3 - 1.5 : rand(-1.5, 1.5);
  g = {
    t: 0, n, attract, beam: beam0, beam0, launchAt: 0, launchId: null, period: Math.min(9, 6 + n * 0.5), marenPeriod: Math.min(11, 6 + n * 0.8), marenClock: 0,
    rocks: v.rocks, wrecks: v.wrecks, timber: v.timber, path: v.path,
    backrooms: !!v.backrooms, exit: v.exit, rooms: v.rooms,
    walls: v.walls || [
      { x1: SK.HARBOUR.x - 23, y1: -2, x2: SK.HARBOUR.x - 23, y2: 46, r: 3, what: 'the pier' },
      { x1: SK.HARBOUR.x + 23, y1: -2, x2: SK.HARBOUR.x + 23, y2: 46, r: 3, what: 'the pier' },
    ],
    parts: [], glare: 0, shake: 0, log: [], bell: 0, bellFlash: 0, wasLit: false, scareT: 0,
    flares: [], flareCd: 0, repairT: 0, shoutT: 0, knockScare: 0, knockKill: false,
    stats: { hits: 0, bells: 0, flares: 0, patched: 0, eaten: 0 },
  };
  g.enemies = newEnemies(v.lures);
  // this voyage's three enemies from the pool
  // the rare seas (the Nether, the Wine-Dark Sea, the Places In Between) have their own three and nothing else
  g.trio = attract ? [] : v.special ? SPECIAL_TRIOS[v.special].slice() : pickTrio(seed);
  g.foes = newFoes(g.trio); g.hazards = []; g.flash = 0; g.splat = 0; g.spinT = 0; g.capT = 0; resetMods();
  g.plim = newPlimsoll(v.path);
  g.maren = newMaren(!attract && !v.special, v.wrecks.find(w => w.name === 'Gannet'));
  g.cannon = newCannon();
  g.pickups = v.pickups || []; g.found = 0; if (typeof renderFound === 'function') renderFound();
  g.verity = newVerity(v.backrooms); g.verityScare = 0; g.lightsOut = 0;
  g.biome = v.special || biomeFor(n, attract);
  g.portal = null;
  if (v.nether) startPortal(biomeFor(n - 1));
  renderHud();
}

function renderHud() {
  $('voyage').textContent = g.n;
  const hull = $('hull'); hull.textContent = '';
  for (let i = 0; i < ship.maxHull; i++) { const s = document.createElement('span'); s.className = 'plank' + (i < ship.hull ? '' : ' off'); hull.appendChild(s); }
  if (typeof renderCannon === 'function') renderCannon();
}
function addLog(text, cls) {
  if (!text || g.attract) return;
  g.log.unshift({ text, cls }); g.log.length = Math.min(g.log.length, 3);
  const ul = $('log'); ul.textContent = '';
  for (const e of g.log) { const li = document.createElement('li'); li.textContent = e.text; if (e.cls) li.className = e.cls; ul.appendChild(li); }
}
function burst(x, y, colors, n, spd, up) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), v = rand(spd * 0.3, spd);
    g.parts.push({ x, y, z: 1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(up * 0.4, up), life: rand(0.6, 1.3), max: 1.3, c: pickOne(colors) });
  }
}

function hit(nx, ny, what) {
  if (ship.inv > 0 || state !== 'play') return;
  ship.inv = 1.4; ship.v = 1.5;
  ship.h += angDiff(bearingOf(nx, ny), ship.h) * 0.6;
  g.shake = 0.5;
  burst(ship.x + Math.sin(ship.h) * 6, ship.y + Math.cos(ship.h) * 6, ['#ece4cf', '#c8d6e8', '#8a6a4a'], 30, 8, 9);
  sfxHit();
  ship.hull--; run.hits++; g.stats.hits++;
  if (typeof padRumble === 'function') padRumble(0.8, 0.5, 260);
  renderHud();
  if (ship.hull <= 0) { addLog('She struck ' + what + ' and is going down.', 'w'); endRun('sunk'); }
  else addLog('Struck ' + what + '. ' + (ship.hull === 1 ? 'Taking water fast.' : 'Hull still holding.'), 'w');
}

function wrapPi(a) { return ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; }
// Crew voyages run the light off the shared launch clock so every ship sees the same sweep.
// Returns true each time the beam completes a full turn (as it comes round behind the land).
function advanceBeam(dt) {
  const prev = g.beam;
  if (g.launchAt) g.beam = wrapPi(g.beam0 + (Date.now() - g.launchAt) / 1000 / g.period * Math.PI * 2);
  else { g.beam += (Math.PI * 2 / g.period) * dt; if (g.beam > Math.PI) g.beam -= Math.PI * 2; }
  return g.beam < prev - Math.PI;
}

// ---------- flares and sailing in company ----------
function fireFlare() {
  if (state !== 'play' || g.flareCd > 0) return;
  g.flareCd = SK.FLARE_COOLDOWN;
  g.stats.flares++;
  addFlare(ship.x, ship.y, myFlare().id);
  foesSeeFlare(ship.x, ship.y);
  if (flareShoosVerity()) addLog('In the flare\u2019s glare Verity rolls back over the rail into the water, still smiling. He will be back.', 'p');
  sfxFlare();
  addLog('Flare away. Everything within ' + SK.FLARE_RADIUS + ' m is lit for a few seconds.', 'p');
  if (crewMode) { NET.flares++; NET.flare = { n: NET.flares, x: Math.round(ship.x), y: Math.round(ship.y), skin: myFlare().id }; send(); }
}
function addFlare(x, y, skin) { g.flares.push({ x, y, t: SK.FLARE_TIME, skin: FLARE_BY_ID[skin] || FLARES[0] }); }
function flareAt(x, y) {
  let best = 0;
  for (const f of g.flares) {
    const d = Math.hypot(x - f.x, y - f.y);
    if (d < SK.FLARE_RADIUS) best = Math.max(best, (1 - d / SK.FLARE_RADIUS) * Math.min(1, f.t / 1.5) * 1.4);
  }
  return Math.min(1, best);
}
// the Brig's carpenter patches a stove-in plank every so often, even out of company
function carpenter(dt) {
  const b = BOAT_BY_ID[ship.boat] || BOATS[0];
  if (!b.carpenter || g.attract || state !== 'play' || ship.hull >= ship.maxHull) { g.carpT = 0; return; }
  g.carpT = (g.carpT || 0) + dt;
  if (g.carpT >= b.carpenter) {
    g.carpT = 0; ship.hull++; renderHud(); sfxChime();
    addLog('The carpenter has patched a plank. ' + (ship.hull === ship.maxHull ? 'She\u2019s sound again.' : 'Still ' + (ship.maxHull - ship.hull) + ' to go.'), 'p');
  }
}
function sailInCompany(dt) {
  if (!crewMode || ship.hull >= ship.maxHull) { g.repairT = 0; return; }
  const mate = matesAtSea().find(m => Math.hypot(m.x - ship.x, m.y - ship.y) < SK.REPAIR_DIST);
  if (!mate) { g.repairT = Math.max(0, g.repairT - dt * 0.5); return; }
  if (g.repairT === 0) addLog('Sailing in company with ' + mate.name + '. Stay close and the carpenters can patch a plank.');
  g.repairT += dt;
  if (g.repairT >= SK.REPAIR_TIME) {
    g.repairT = 0; ship.hull++; g.stats.patched++; renderHud(); sfxChime();
    addLog('With ' + mate.name + ' alongside, the carpenters patched a plank.', 'p');
  }
}

// ---------- collision ----------
// The hull is a capsule from bow to stern, sampled at five points along the keel. Anything that
// overlaps it is pushed clear. Only a real impact (closing on it faster than SK.IMPACT m/s) stoves
// in a plank; a glancing touch just scrapes, slows her a little and turns her along the obstacle.
function hullPoints() {
  const b = BOAT_BY_ID[ship.boat] || BOATS[0];
  const sx = Math.sin(ship.h), sy = Math.cos(ship.h), pts = [];
  for (let i = 0; i < 5; i++) {
    const off = b.bow - (b.len * 0.8) * i / 4;
    const w = b.beam * (i === 0 ? 0.55 : i === 4 ? 0.75 : 1);   // narrow at the bow, a little at the stern
    pts.push({ x: ship.x + sx * off, y: ship.y + sy * off, w });
  }
  return pts;
}
function closestOnSeg(px, py, s) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = dx * dx + dy * dy || 1;
  const t = clamp(((px - s.x1) * dx + (py - s.y1) * dy) / L, 0, 1);
  return { x: s.x1 + dx * t, y: s.y1 + dy * t };
}
// deepest overlap of the hull with a circle (cx, cy, r) or a wall segment; null if clear
function hullContact(pts, cx, cy, r, seg) {
  let best = null;
  for (const p of pts) {
    let qx = cx, qy = cy;
    if (seg) { const q = closestOnSeg(p.x, p.y, seg); qx = q.x; qy = q.y; }
    const dx = p.x - qx, dy = p.y - qy, d = Math.hypot(dx, dy) || 0.001;
    const pen = r + p.w - d;
    if (pen > 0 && (!best || pen > best.pen)) best = { pen, nx: dx / d, ny: dy / d };
  }
  return best;
}
// resolve one contact: push out, then either a hit or a scrape. Returns true if it was a hit.
function resolveContact(c, what, soft) {
  ship.x += c.nx * c.pen; ship.y += c.ny * c.pen;
  const vx = Math.sin(ship.h) * ship.v, vy = Math.cos(ship.h) * ship.v;
  const closing = -(vx * c.nx + vy * c.ny);   // speed into the obstacle
  if (closing <= 0) return false;
  // a hit needs both real speed into it and a real angle (more than about 25°); shallower is a scrape
  if (closing > SK.IMPACT && closing > ship.v * 0.42 && !soft) {
    hit(c.nx, c.ny, what);
    return true;
  }
  // glancing: lose the speed going into it, keep the speed along it, and swing her parallel
  const tx = vx + c.nx * closing, ty = vy + c.ny * closing, tv = Math.hypot(tx, ty);
  if (tv > 0.5) ship.h += angDiff(bearingOf(tx, ty), ship.h) * 0.35;
  ship.v = Math.max(2, ship.v - closing * 0.6);
  if (!g.scrapeT || g.scrapeT <= 0) { g.scrapeT = 0.6; sfxCreak(); g.shake = Math.max(g.shake, 0.12); }
  return false;
}
// returns true if she hit something or arrived (so the stepped move stops for this frame)
function checkCollisions() {
  const hull0 = ship.hull;
  const pts = hullPoints();
  let c;
  for (const r of g.rocks) {
    if (r.doomed || r.gone) continue;
    if (Math.abs(r.x - ship.x) > r.r + 40 || Math.abs(r.y - ship.y) > r.r + 40) continue;
    if ((c = hullContact(pts, r.x, r.y, r.r)) && resolveContact(c, 'a skerry')) break;
  }
  for (const o of g.wrecks) {
    if (Math.hypot(o.x - ship.x, o.y - ship.y) > o.r + 40) continue;
    if ((c = hullContact(pts, o.x, o.y, o.r * 0.8)) && resolveContact(c, 'the wreck of the ' + o.name)) break;
  }
  for (const o of g.timber) {
    if (Math.hypot(o.x - ship.x, o.y - ship.y) > o.r + 40) continue;
    if ((c = hullContact(pts, o.x, o.y, o.r))) {
      if (resolveContact(c, 'drifting timber')) { Object.assign(o, spawnTimber(ship.x, ship.y)); break; }
      o.x -= c.nx * 1.5; o.y -= c.ny * 1.5;   // nudge the log aside
    }
  }
  for (const w of g.walls) {
    if (Math.max(Math.abs(closestOnSeg(ship.x, ship.y, w).x - ship.x), Math.abs(closestOnSeg(ship.x, ship.y, w).y - ship.y)) > 40) continue;
    if ((c = hullContact(pts, 0, 0, w.r || 1, w)) && resolveContact(c, w.what || 'the pier')) break;
  }
  if (!g.backrooms) {
    const inGap = Math.abs(ship.x - SK.HARBOUR.x) < 18;
    if (!inGap) {
      const lowest = pts.reduce((m, p) => Math.min(m, p.y - p.w), Infinity);
      if (lowest < 5) resolveContact({ pen: 5 - lowest, nx: 0, ny: 1 }, 'the shore');
    }
    if (state === 'play' && inGap && ship.y < 36 && ship.y > 0) { arrive(); return true; }
  } else if (state === 'play' && Math.hypot(ship.x - g.exit.x, ship.y - g.exit.y) < g.exit.r) { arrive(); return true; }
  return ship.hull !== hull0 || state !== 'play';
}
// crewmates' ships bump apart rather than through each other, and nobody takes damage for it
function bumpMates() {
  if (!crewMode || typeof matesAtSea !== 'function') return;
  const mine = BOAT_BY_ID[ship.boat] || BOATS[0];
  for (const m of matesAtSea()) {
    const theirs = BOAT_BY_ID[m.boat] || BOATS[0];
    const dx = ship.x - m.x, dy = ship.y - m.y, d = Math.hypot(dx, dy) || 0.01;
    const need = (mine.len + theirs.len) * 0.3 + mine.beam + theirs.beam;
    if (d < need) {
      const push = Math.min(3, (need - d) * 0.5);
      ship.x += dx / d * push; ship.y += dy / d * push;
      if (!g.scrapeT || g.scrapeT <= 0) { g.scrapeT = 0.8; sfxCreak(); }
    }
  }
}

function update(dt) {
  g.t += dt;
  advanceBeam(dt);
  // the lamp swings round quicker than it used to, but Maren keeps to the old pace: one stage nearer
  // every marenPeriod seconds (what a full turn of the beam used to take)
  g.marenClock += dt;
  if (g.marenClock >= g.marenPeriod) { g.marenClock -= g.marenPeriod; marenTurn(); if (g.backrooms && !g.attract) { g.lightsOut = 0.7; sfxLightsOut(); } }
  if (state === 'scare') return;

  // the helm
  let steer = 0, sailIn = 0;
  if (g.attract) {
    steer = clamp(angDiff(bearingOf(g.plim.x - ship.x, g.plim.y - ship.y), ship.h) * 2, -1, 1);
    if (Math.hypot(ship.x - SK.HARBOUR.x, ship.y - SK.HARBOUR.y) < 170) { newVoyage(1, true); return; }
  } else {
    steer = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    sailIn = (keys.ArrowUp || keys.w ? 1 : 0) - (keys.ArrowDown || keys.s ? 1 : 0);
    for (const t of touches.values()) { if (t === 'L') steer -= 1; else if (t === 'R') steer += 1; else sailIn -= 1; }
    sailIn += sailHold;
    if (typeof PAD !== 'undefined' && PAD.connected) { steer += PAD.steer; sailIn += PAD.sail; }
    steer += g.mods.pull;
    if (g.mods.spinDir) steer = g.mods.spinDir;
    steer = clamp(steer, -1, 1); sailIn = clamp(sailIn, -1, 1);
  }
  const boat = BOAT_BY_ID[ship.boat] || BOATS[0];
  ship.rudder += (steer - ship.rudder) * Math.min(1, dt * 4 * boat.turn);
  // no top speed: keep making sail and she keeps going faster (and the longer you hold it, the quicker it climbs)
  if (sailIn > 0) g.sailHeld = (g.sailHeld || 0) + dt; else g.sailHeld = 0;
  const rate = (sailIn > 0 ? 1.6 * (1 + g.sailHeld * 1.2) : 1.6) * boat.accel;
  // shortening sail is quick too, even from a great speed
  ship.sail = Math.max(0.15, ship.sail + (sailIn > 0 ? sailIn * rate : sailIn * (1.6 + ship.sail * 1.8)) * dt);
  const vTarget = Math.min(g.mods.cap, (3 + ship.sail * 12) * g.mods.slow * (boat.top || 1));
  ship.v += (vTarget - ship.v) * Math.min(1, dt * 4 * boat.accel);   // she answers the sail almost at once
  ship.h += ship.rudder * 0.55 * boat.turn * dt * (0.35 + 0.65 * Math.min(1, ship.v / 10));
  // move in short steps so a fast ship can't jump clean over a rock between frames
  const steps = Math.min(60, Math.max(1, Math.ceil(ship.v * dt / 2)));
  for (let i = 0; i < steps; i++) {
    ship.x += Math.sin(ship.h) * ship.v * dt / steps;
    ship.y += Math.cos(ship.h) * ship.v * dt / steps;
    if (!g.attract && state === 'play' && checkCollisions()) break;
  }
  if (!g.attract && state === 'play') bumpMates();
  if (g.scrapeT > 0) g.scrapeT -= dt;
  ship.bob += dt;
  if (ship.inv > 0) ship.inv -= dt;

  for (const o of g.timber) {
    o.x += o.vx * dt; o.y += o.vy * dt; o.ang += o.spin * dt;
    if (o.y < 60 || Math.hypot(o.x, o.y) > 1250 * SK.WORLD || Math.hypot(o.x - SK.HARBOUR.x, o.y - SK.HARBOUR.y) < 110) Object.assign(o, spawnTimber(ship.x, ship.y));
  }



  updatePlimsoll(dt);
  updateMaren(dt);
  updateEnemies(dt);
  updateFoes(dt);
  updateVerity(dt);
  updatePortal(dt);
  updateJet(dt);
  updateCannon(dt);
  carpenter(dt);
  updatePickups();
  sailInCompany(dt);
  for (const f of g.flares) f.t -= dt;
  g.flares = g.flares.filter(f => f.t > 0);
  if (g.flareCd > 0) g.flareCd = Math.max(0, g.flareCd - dt);
  if (g.shoutT > 0) g.shoutT -= dt;

  if (g.lightsOut > 0) g.lightsOut -= dt;
  const meLit = g.backrooms ? 0 : litAt(ship.x, ship.y);
  const facing = Math.abs(angDiff(bearingOf(-ship.x, -ship.y), ship.h)) < fov / 2;
  g.glare = Math.max(g.glare - dt * 2.5, meLit * (facing ? 0.75 : 0.3));
  const nowLit = meLit > 0.3;
  if (nowLit && !g.wasLit && state === 'play') { sfxWhoosh(); maybeApparition(); }
  g.wasLit = nowLit;

  if (g.bell > 0) g.bell = Math.max(0, g.bell - dt);
  if (g.bellFlash > 0) g.bellFlash -= dt * 2;

  for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.z = Math.max(0, q.z + q.vz * dt); q.vz -= 20 * dt; q.life -= dt; }
  g.parts = g.parts.filter(q => q.life > 0);
  if (g.shake > 0) g.shake -= dt;

  if (!g.attract) {
    audioTick(dt, g.maren.stage);
    $('knots').textContent = Math.round(ship.v * 0.97);
    const goal = g.backrooms ? g.exit : SK.HARBOUR;
    const d = Math.hypot(ship.x - goal.x, ship.y - goal.y);
    $('dist').textContent = d > 1000 ? (d / 1852).toFixed(1) + 'nm' : Math.round(d) + 'm';
    updateBellButton();
    updateFlareButton();
    updateJetButton();
  }
}

let flareShown = -1;
function updateFlareButton() {
  const p = g.flareCd > 0 ? 1 - g.flareCd / SK.FLARE_COOLDOWN : 1, v = Math.round(p * 50);
  if (v === flareShown) return;
  flareShown = v;
  const b = $('flareBtn');
  b.style.setProperty('--p', p.toFixed(2));
  b.classList.toggle('ready', p >= 1);
  $('flareState').textContent = p >= 1 ? 'Ready' : 'Loading';
}

let jetShown = -1;
function updateJetButton() {
  const b = $('jetBtn'); if (!b) return;
  const on = ship.boat === 'carrier' && !g.attract;
  if (b.hidden === on) b.hidden = !on;
  if (!on) return;
  const busy = !!g.jet, p = busy ? 0 : g.jetCd > 0 ? 1 - g.jetCd / JET.CD : 1, v = Math.round(p * 50) + (busy ? 100 : 0);
  if (v === jetShown) return;
  jetShown = v;
  b.style.setProperty('--p', p.toFixed(2));
  b.classList.toggle('ready', p >= 1);
  $('jetState').textContent = busy ? 'Flying' : p >= 1 ? 'Ready' : 'Refuelling';
}

let bellShown = -1;
function updateBellButton() {
  const max = bellCooldown(), p = g.bell > 0 ? 1 - g.bell / max : 1;
  const v = Math.round(p * 50);
  if (v === bellShown) return;
  bellShown = v;
  const b = $('bellBtn');
  b.style.setProperty('--p', p.toFixed(2));
  b.classList.toggle('ready', p >= 1);
  $('bellState').textContent = p >= 1 ? 'Ready' : 'Swinging';
}

// ---------- flow ----------
function hideCards() { for (const id of ['titleCard', 'portCard', 'endCard']) $(id).hidden = true; }

function startRun() {
  audioInit();
  crewMode = false;
  run = { voyages: 0, hits: 0 };
  beginVoyage(1);
  $('hint').style.opacity = 1;
  setTimeout(() => { $('hint').style.opacity = 0; }, 10000);
}

function beginVoyage(n) {
  state = 'play';
  newVoyage(n, false);
  bellShown = -1; flareShown = -1;
  hideCards();
  $('hud').hidden = false; $('logbox').hidden = false;
  $('log').textContent = '';
  addLog(n === 1 ? 'Under way. Follow the blue shoes.' : 'Voyage ' + n + '. More wreckage, and the light turns slower.');
  enteredBackrooms();
  if (!g.backrooms) addLog(biomeLine());
  addLog(trioLine(), 'w');
  cv.focus({ preventScroll: true });
}

function beginCrewVoyage(L, slot) {
  if (L.voy === 1) run = { voyages: 0, hits: 0 };
  state = 'play';
  newVoyage(L.voy, false, L.seed, slot);
  g.launchAt = L.at; g.launchId = L.id;
  bellShown = -1; flareShown = -1;
  stopSpectating();
  hideCards(); $('crewCard').hidden = true;
  $('hud').hidden = false; $('logbox').hidden = false;
  $('log').textContent = '';
  addLog(L.voy === 1 ? 'Under way with your crew. Follow the blue shoes, and keep together.' : 'Voyage ' + L.voy + '. More wreckage, and the light turns slower.');
  enteredBackrooms();
  if (!g.backrooms) addLog(biomeLine());
  addLog(trioLine(), 'w');
  cv.focus({ preventScroll: true });
}

function enteredBackrooms() {
  $('distLabel').textContent = g.backrooms ? 'Exit' : 'Harbour';
  $('portTitle').textContent = g.backrooms ? 'Out of the Rooms' : 'Safe in Harbour';
  $('stage').classList.toggle('rooms', !!g.backrooms);
  if (!g.backrooms) return;
  $('log').textContent = ''; g.log = [];
  addLog('Plimsoll knows the way out. Follow the shoes to the green EXIT sign.', 'p');
  addLog('The pier lamps went out. When the light came back, the sea had walls.', 'w');
  sfxLightsOut();
}

for (const b of document.querySelectorAll('.menuBtn')) b.addEventListener('click', () => { if (state === 'port' || state === 'over') toTitle(); });

function toTitle() {
  state = 'title';
  hideCards(); $('crewCard').hidden = true;
  $('hud').hidden = true; $('logbox').hidden = true;
  newVoyage(1, true);
  $('stage').classList.remove('rooms');
  $('titleCard').hidden = false;
  renderTogether();
}

function arrive() {
  grantCrate(harbourReward() + g.found * 2, true);
  stopVerity();
  if (crewMode) {
    state = 'port';
    audioTick(0, 0);
    sfxChime();
    addLog(g.backrooms ? 'Out through the green door, and back on the real sea.' : 'Made harbour between the pier lamps.', 'p');
    myStatus('port');
    $('hud').hidden = true; $('logbox').hidden = true;
    showCrewCard();
    return;
  }
  state = 'port';
  audioTick(0, 0);
  run.voyages++;
  if (run.voyages > best) { best = run.voyages; try { localStorage.setItem('skerry-helm-best', String(best)); } catch (e) {} }
  sfxChime();
  const page = g.backrooms ? SK.BACKROOMS_LOG : SK.LOG[(run.voyages - 1) % SK.LOG.length];
  $('portEyebrow').textContent = 'Voyage ' + g.n + (g.backrooms ? ' · found the way out' : ' · made harbour');
  $('portText').textContent = g.backrooms ? 'Through the green-lit door, and the sea is the sea again: cold, black, and the pier lamps right ahead. Behind you there is no door, only fog.' : ship.hull === ship.maxHull ? 'Not a scratch on her. Plimsoll sits down on the pier and takes his shoes off.' :
    'She limps in with ' + (ship.maxHull - ship.hull) + (ship.maxHull - ship.hull === 1 ? ' plank' : ' planks') + ' stove in. The shipwright will patch her overnight.';
  $('logDate').textContent = page.date;
  $('logText').textContent = page.text;
  $('portCard').hidden = false;
  setTimeout(() => $('nextBtn').focus(), 50);
}

function startScare() {
  if (typeof padRumble === 'function') padRumble(1, 1, SK.SCARE_TIME * 1000);
  state = 'scare';
  g.scareT = 0;
  $('hud').hidden = true; $('logbox').hidden = true;
  sfxScream();
}

function endRun(how) {
  state = 'over';
  stopVerity();
  grantCrate();
  audioTick(0, 0);
  const taken = how === 'taken', knocked = how === 'knock' || how === 'verity', verity = how === 'verity';
  if (crewMode) {
    myStatus(taken ? 'taken' : 'sunk');
    setTimeout(() => { $('hud').hidden = true; $('logbox').hidden = true; if (crewMode && state === 'over') showCrewCard(); }, (taken || knocked) ? 0 : 900);
    return;
  }
  $('endEyebrow').textContent = 'Voyage ' + g.n + (taken ? ' · taken' : ' · lost');
  $('endTitle').textContent = taken ? 'Maren Came Aboard' : verity ? 'Verity Helped' : knocked ? 'Knocked Under' : 'Lost on the Skerries';
  $('endText').textContent = taken
    ? 'She stood at the bow, and then she was on the deck. The brig was found at dawn drifting off the Gannet, with her lantern still lit and nobody aboard.'
    : verity ? 'He only wanted to help. The ship was found at dawn with nobody aboard and a wide, yellow smile scratched into the deck.'
    : knocked ? 'Three knocks on the hull, and the fourth came straight through the planks. They say the Gannet\u2019s figurehead is still smiling.'
    : (run.voyages === 0 ? 'She went down before you sighted the pier lamps. The skerries keep their reputation.' :
      'You brought her in ' + run.voyages + (run.voyages === 1 ? ' time' : ' times') + ' before the rocks had the last word.');
  $('sVoy').textContent = run.voyages; $('sHits').textContent = run.hits; $('sBest').textContent = best;
  setTimeout(() => {
    $('hud').hidden = true; $('logbox').hidden = true;
    $('endCard').hidden = false; $('againBtn').focus();
  }, (taken || knocked) ? 0 : 900);
}

// ---------- input ----------
const zone = x => x < W / 3 ? 'L' : x > W * 2 / 3 ? 'R' : 'M';
cv.addEventListener('pointerdown', e => {
  if (state !== 'play' || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const r = cv.getBoundingClientRect();
  touches.set(e.pointerId, zone(e.clientX - r.left));
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
});
cv.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return;
  const r = cv.getBoundingClientRect(); touches.set(e.pointerId, zone(e.clientX - r.left));
});
const liftTouch = e => touches.delete(e.pointerId);
cv.addEventListener('pointerup', liftTouch);
cv.addEventListener('pointercancel', liftTouch);

const keyName = e => e.key.length === 1 ? e.key.toLowerCase() : e.key;
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = keyName(e);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(k)) {
    keys[k] = true; if (state === 'play') e.preventDefault();
  } else if ((k === ' ' || k === 'b') && state === 'play') {
    e.preventDefault(); if (!e.repeat) ringBell();
  } else if (k === 'v') {
    toggleView();
  } else if (k === 'f' && state === 'play') {
    if (!e.repeat) fireFlare();
  } else if (k === 'j' && state === 'play') {
    if (!e.repeat) launchJet();
  } else if (k === 'm') {
    toggleSound();
  }
});
addEventListener('keyup', e => { keys[keyName(e)] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; touches.clear(); sailHold = 0; });

function toggleSound() {
  setMuted(!AUD.muted);
  $('soundBtn').textContent = AUD.muted ? 'Sound off' : 'Sound on';
  $('soundBtn').setAttribute('aria-pressed', String(!AUD.muted));
}

$('startBtn').addEventListener('click', startRun);
$('viewBtn').addEventListener('click', e => { toggleView(); e.currentTarget.blur(); cv.focus({ preventScroll: true }); });
setThirdPerson(VIEW.third);
$('nextBtn').addEventListener('click', () => beginVoyage(g.n + 1));
$('againBtn').addEventListener('click', startRun);
$('bellBtn').addEventListener('click', e => { ringBell(); e.currentTarget.blur(); cv.focus({ preventScroll: true }); });
$('soundBtn').addEventListener('click', e => { audioInit(); toggleSound(); e.currentTarget.blur(); });
$('jetBtn').addEventListener('click', e => { launchJet(); e.currentTarget.blur(); cv.focus({ preventScroll: true }); });
$('flareBtn').addEventListener('click', e => { fireFlare(); e.currentTarget.blur(); cv.focus({ preventScroll: true }); });
// hold to make or shorten sail, for phones
for (const [id, dir] of [['sailUp', 1], ['sailDown', -1]]) {
  const b = $(id);
  const stop = () => { if (sailHold === dir) sailHold = 0; b.classList.remove('held'); };
  b.addEventListener('pointerdown', e => { e.preventDefault(); sailHold = dir; b.classList.add('held'); try { b.setPointerCapture(e.pointerId); } catch (err) {} });
  b.addEventListener('pointerup', stop);
  b.addEventListener('pointercancel', stop);
  b.addEventListener('lostpointercapture', stop);
  b.addEventListener('contextmenu', e => e.preventDefault());
}
$('soundBtn').textContent = AUD.muted ? 'Sound off' : 'Sound on';
addEventListener('resize', resize);

