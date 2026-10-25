// Game state, the update step, voyages, input and the main loop.

const $ = id => document.getElementById(id);
let state = 'title', g = null, ship = null;
let run = { voyages: 0, hits: 0 };
let best = 0;
try { best = parseInt(localStorage.getItem('skerry-helm-best') || '0', 10) || 0; } catch (e) {}
const keys = {}, touches = new Map();

function newVoyage(n, attract, seed, slot) {
  const v = makeVoyage(n, attract, seed);
  ship = v.ship;
  // crewmates start abreast of each other, 40 m apart
  if (slot) { const lat = (slot === 1 ? -1 : 1) * 40; ship.x += Math.cos(ship.h) * lat; ship.y -= Math.sin(ship.h) * lat; }
  const beam0 = seed != null ? (seed % 1000) / 1000 * 3 - 1.5 : rand(-1.5, 1.5);
  g = {
    t: 0, n, attract, beam: beam0, beam0, launchAt: 0, launchId: null, period: Math.min(11, 6 + n * 0.8),
    rocks: v.rocks, wrecks: v.wrecks, timber: v.timber, path: v.path,
    parts: [], glare: 0, shake: 0, log: [], bell: 0, bellFlash: 0, wasLit: false, scareT: 0,
  };
  g.plim = newPlimsoll(v.path);
  g.maren = newMaren(!attract, v.wrecks.find(w => w.name === 'Gannet'));
  renderHud();
}

function renderHud() {
  $('voyage').textContent = g.n;
  const hull = $('hull'); hull.textContent = '';
  for (let i = 0; i < SK.HULL; i++) { const s = document.createElement('span'); s.className = 'plank' + (i < ship.hull ? '' : ' off'); hull.appendChild(s); }
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
  ship.hull--; run.hits++;
  renderHud();
  if (ship.hull <= 0) { addLog('She struck ' + what + ' and is going down.', 'w'); endRun('sunk'); }
  else addLog('Struck ' + what + '. ' + (ship.hull === 1 ? 'Taking water fast.' : 'Hull still holding.'), 'w');
}

function wrapPi(a) { return ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; }
// Crew voyages run the light off the shared launch clock so every ship sees the same sweep.
// Returns true when the beam has just completed a turn.
function advanceBeam(dt) {
  const prev = g.beam;
  if (g.launchAt) g.beam = wrapPi(g.beam0 + (Date.now() - g.launchAt) / 1000 / g.period * Math.PI * 2);
  else { g.beam += (Math.PI * 2 / g.period) * dt; if (g.beam > Math.PI) g.beam -= Math.PI * 2; }
  return g.beam < prev - Math.PI;
}

function update(dt) {
  g.t += dt;
  if (advanceBeam(dt)) marenTurn();
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
    steer = clamp(steer, -1, 1);
  }
  ship.rudder += (steer - ship.rudder) * Math.min(1, dt * 4);
  ship.sail = clamp(ship.sail + sailIn * 0.5 * dt, 0.15, 1);
  ship.v += (3 + ship.sail * 12 - ship.v) * Math.min(1, dt * 0.6);
  ship.h += ship.rudder * 0.55 * dt * (0.35 + 0.65 * Math.min(1, ship.v / 10));
  ship.x += Math.sin(ship.h) * ship.v * dt;
  ship.y += Math.cos(ship.h) * ship.v * dt;
  ship.bob += dt;
  if (ship.inv > 0) ship.inv -= dt;

  for (const o of g.timber) {
    o.x += o.vx * dt; o.y += o.vy * dt; o.ang += o.spin * dt;
    if (o.y < 60 || Math.hypot(o.x, o.y) > 1250 || Math.hypot(o.x - SK.HARBOUR.x, o.y - SK.HARBOUR.y) < 110) Object.assign(o, spawnTimber(ship.x, ship.y));
  }

  // collisions; the bow is a few metres ahead of where you stand
  if (!g.attract && state === 'play') {
    const bx = ship.x + Math.sin(ship.h) * 5, by = ship.y + Math.cos(ship.h) * 5;
    for (const r of g.rocks) if (Math.hypot(bx - r.x, by - r.y) < r.r + 2.5) { hit(bx - r.x, by - r.y, 'a skerry'); break; }
    for (const o of g.wrecks) if (Math.hypot(bx - o.x, by - o.y) < o.r * 0.8 + 2.5) { hit(bx - o.x, by - o.y, 'the wreck of the ' + o.name); break; }
    for (const o of g.timber) if (Math.hypot(bx - o.x, by - o.y) < o.r + 2.5) { hit(bx - o.x, by - o.y, 'drifting timber'); Object.assign(o, spawnTimber(ship.x, ship.y)); break; }
    const inGap = Math.abs(ship.x - SK.HARBOUR.x) < 18;
    if (ship.y < 5 && !inGap) { ship.y = 6; hit(0, 1, 'the shore'); }
    for (const px of [SK.HARBOUR.x - 23, SK.HARBOUR.x + 23]) {
      if (Math.abs(bx - px) < 3.5 && by < 48 && by > -2) { hit(bx - px, 0.3, 'the pier'); ship.x += Math.sign(ship.x - px) * 2; }
    }
    if (state === 'play' && inGap && ship.y < 36 && ship.y > 0) arrive();
  }

  updatePlimsoll(dt);
  updateMaren(dt);

  const meLit = litAt(ship.x, ship.y);
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
    const d = Math.hypot(ship.x - SK.HARBOUR.x, ship.y - SK.HARBOUR.y);
    $('dist').textContent = d > 1000 ? (d / 1852).toFixed(1) + 'nm' : Math.round(d) + 'm';
    updateBellButton();
  }
}

let bellShown = -1;
function updateBellButton() {
  const max = SK.BELL_COOLDOWN + g.n * 1.5, p = g.bell > 0 ? 1 - g.bell / max : 1;
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
  bellShown = -1;
  hideCards();
  $('hud').hidden = false; $('logbox').hidden = false;
  $('log').textContent = '';
  addLog(n === 1 ? 'Under way. Follow the blue shoes.' : 'Voyage ' + n + '. More wreckage, and the light turns slower.');
  cv.focus({ preventScroll: true });
}

function beginCrewVoyage(L, slot) {
  if (L.voy === 1) run = { voyages: 0, hits: 0 };
  state = 'play';
  newVoyage(L.voy, false, L.seed, slot);
  g.launchAt = L.at; g.launchId = L.id;
  bellShown = -1;
  hideCards(); $('crewCard').hidden = true;
  $('hud').hidden = false; $('logbox').hidden = false;
  $('log').textContent = '';
  addLog(L.voy === 1 ? 'Under way with your crew. Follow the blue shoes, and keep together.' : 'Voyage ' + L.voy + '. More wreckage, and the light turns slower.');
  cv.focus({ preventScroll: true });
}

function toTitle() {
  state = 'title';
  hideCards(); $('crewCard').hidden = true;
  $('hud').hidden = true; $('logbox').hidden = true;
  newVoyage(1, true);
  $('titleCard').hidden = false;
  renderTogether();
}

function arrive() {
  if (crewMode) {
    state = 'port';
    audioTick(0, 0);
    sfxChime();
    addLog('Made harbour between the pier lamps.', 'p');
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
  const page = SK.LOG[(run.voyages - 1) % SK.LOG.length];
  $('portEyebrow').textContent = 'Voyage ' + g.n + ' · made harbour';
  $('portText').textContent = ship.hull === SK.HULL ? 'Not a scratch on her. Plimsoll sits down on the pier and takes his shoes off.' :
    'She limps in with ' + (SK.HULL - ship.hull) + (SK.HULL - ship.hull === 1 ? ' plank' : ' planks') + ' stove in. The shipwright will patch her overnight.';
  $('logDate').textContent = page.date;
  $('logText').textContent = page.text;
  $('portCard').hidden = false;
  setTimeout(() => $('nextBtn').focus(), 50);
}

function startScare() {
  state = 'scare';
  g.scareT = 0;
  $('hud').hidden = true; $('logbox').hidden = true;
  sfxScream();
}

function endRun(how) {
  state = 'over';
  audioTick(0, 0);
  const taken = how === 'taken';
  if (crewMode) {
    myStatus(taken ? 'taken' : 'sunk');
    setTimeout(() => { $('hud').hidden = true; $('logbox').hidden = true; if (crewMode && state === 'over') showCrewCard(); }, taken ? 0 : 900);
    return;
  }
  $('endEyebrow').textContent = 'Voyage ' + g.n + (taken ? ' · taken' : ' · lost');
  $('endTitle').textContent = taken ? 'Maren Came Aboard' : 'Lost on the Skerries';
  $('endText').textContent = taken
    ? 'She stood at the bow, and then she was on the deck. The brig was found at dawn drifting off the Gannet, with her lantern still lit and nobody aboard.'
    : (run.voyages === 0 ? 'She went down before you sighted the pier lamps. The skerries keep their reputation.' :
      'You brought her in ' + run.voyages + (run.voyages === 1 ? ' time' : ' times') + ' before the rocks had the last word.');
  $('sVoy').textContent = run.voyages; $('sHits').textContent = run.hits; $('sBest').textContent = best;
  setTimeout(() => {
    $('hud').hidden = true; $('logbox').hidden = true;
    $('endCard').hidden = false; $('againBtn').focus();
  }, taken ? 0 : 900);
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
  } else if (k === 'm') {
    toggleSound();
  }
});
addEventListener('keyup', e => { keys[keyName(e)] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; touches.clear(); });

function toggleSound() {
  setMuted(!AUD.muted);
  $('soundBtn').textContent = AUD.muted ? 'Sound off' : 'Sound on';
  $('soundBtn').setAttribute('aria-pressed', String(!AUD.muted));
}

$('startBtn').addEventListener('click', startRun);
$('nextBtn').addEventListener('click', () => beginVoyage(g.n + 1));
$('againBtn').addEventListener('click', startRun);
$('bellBtn').addEventListener('click', e => { ringBell(); e.currentTarget.blur(); cv.focus({ preventScroll: true }); });
$('soundBtn').addEventListener('click', e => { audioInit(); toggleSound(); e.currentTarget.blur(); });
$('soundBtn').textContent = AUD.muted ? 'Sound off' : 'Sound on';
addEventListener('resize', resize);

