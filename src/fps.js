// Wreckers' Night: a separate multiplayer first-person shooter mode, on foot on a skerry at night.
//
// It borrows the game's world and its rules of light, and keeps nothing it does from the real game:
// no crates, no voyages, no crew. Everyone in the mode shares one island and one clock.
//  - Darkness: you only see what light reaches. The lighthouse beam sweeps the island and lights
//    anyone it crosses; flares light a wide circle for everyone; your lantern lights what's near
//    you, and shows you to the whole island while it burns.
//  - The bell: everyone in earshot shows on your bearing strip for a few seconds, and so do you.
//  - The skerries and old wrecks are cover; the drowned crew wade ashore now and then.
//  - Your colours are your equipped skin's.
// Rounds last five minutes on the wall clock, so everyone's round turns over together, and each
// round the island moves to the next of the six seas.
// Connected through the same room or server as crews, but on its own key (`fps`) in presence, so
// the two never mix. Alone, a few wreckers (bots) keep you company.

const FPSC = {
  CX: 0, CY: 640, R: 140, GROUND: 0.35, EYE: 1.7, BODY: 0.55, TALL: 1.85,
  SPEED: 6.5, SPRINT: 10, HP: 4, MAG: 6, RATE: 0.26, RELOAD: 1.7, RESPAWN: 3.5, FLARES: 2,
  ROUND: 300000, PERIOD: 16, RANGE: 420, SEND: 0.1, BOTS: 3, PROTECT: 2,
};
const FPS = {
  on: false, saved: null, g: null, me: null, keys: {}, mouse: false, look: [0, 0],
  remote: new Map(), bots: [], drowned: [], tracers: [], parts: [], feed: [], pings: [],
  round: 0, sh: {}, kb: {}, deaths: 0, seenSh: {}, fire: 0, bell: 0, flare: 0, flareAt: [0, 0],
  sendT: 0, hitT: 0, hurtT: 0, flash: 0, recoil: 0, step: 0, board: false, menu: false,
  roundMsg: null, drownT: 30, lastBoard: [], stick: null, lookTouch: null,
};
const FPS_BOT_NAMES = ['Wrecker Abe', 'Black Nell', 'Silas Crane', 'Old Tobias', 'Mother Carey', 'Jory Pengelly'];
const FPS_SEAS = ['skerry', 'fjord', 'ember', 'lagoon', 'barrows', 'shoals'];

// ---------- the island ----------
function fpsArena(round) {
  const rng = seeded(0x5ee7 + 17);
  const R = (a, b) => a + rng() * (b - a);
  const rocks = [], wrecks = [];
  const free = (x, y, r) => Math.hypot(x - FPSC.CX, y - FPSC.CY) < FPSC.R - r - 6 && !rocks.concat(wrecks).some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 9);
  for (let tries = 0; rocks.length < 18 && tries < 2000; tries++) {
    const a = R(0, 6.283), d = Math.sqrt(R(0.02, 1)) * (FPSC.R - 12), x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d, r = R(3, 9);
    if (!free(x, y, r)) continue;
    const prof = []; for (let i = 0; i < 7; i++) prof.push(R(0.35, 1)); prof[0] = R(0.15, 0.45); prof[6] = R(0.15, 0.45);
    rocks.push({ x, y, r, prof, ph: R(0, 6.28) });
  }
  for (let tries = 0; wrecks.length < 3 && tries < 500; tries++) {
    const a = R(0, 6.283), d = R(40, FPSC.R - 40), x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d, r = R(8, 12);
    if (!free(x, y, r)) continue;
    wrecks.push({ x, y, r, ang: R(0, 6.28), lean: R(-1, 1), name: 'a wreck', ribs: 5 });
  }
  return {
    fps: true, t: 0, beam: 0, period: FPSC.PERIOD, flares: [], rocks, wrecks, timber: [], pickups: [], lures: [],
    mods: { lantern: 1 }, biome: FPS_SEAS[round % FPS_SEAS.length], minVis: 0.5,
    island: { x: FPSC.CX, y: FPSC.CY, r: FPSC.R, z: FPSC.GROUND },
    backrooms: false, sky: false, enemies: { drowned: [], knocks: [] }, maren: { active: false }, lightning: 0, parts: [],
  };
}
const fpsRoundNow = () => Math.floor(Date.now() / FPSC.ROUND);
function fpsSkin() { try { return mySkin(); } catch (e) { return { hull: '#3a2a1e', sail: '#d8d0bc', rail: '#7a5a3a', lantern: '#ffd88a' }; } }
function fpsColours() { const s = fpsSkin(); return [s.hull, s.sail, s.rail, s.lantern || '#ffd88a']; }

// ---------- entering and leaving ----------
function fpsOpen() {
  try { audioInit(); } catch (e) {}
  $('titleCard').hidden = true;
  $('fpsCard').hidden = false;
  const n = $('fpsNick'); if (n && !n.value) n.value = NET.nick || ($('nick') && $('nick').value) || '';
  fpsLobbyStatus();
  if (!FPS.lobbyTimer) FPS.lobbyTimer = setInterval(() => { if (!$('fpsCard').hidden) fpsLobbyStatus(); }, 1000);
  setTimeout(() => $('fpsPlay').focus(), 30);
}
function fpsCloseCard() { $('fpsCard').hidden = true; $('titleCard').hidden = false; }
function fpsLobbyStatus() {
  const n = fpsPeers().length;
  $('fpsStatus').textContent = NET.status === 'ready'
    ? (n ? `${n} ${n === 1 ? 'wrecker is' : 'wreckers are'} on the island now.` : 'Nobody is on the island yet. Go ashore and others can join you; until they do, a few wreckers will keep you busy.')
    : NET.status === 'connecting' ? 'Looking for other players…' : 'No connection for other players here, so you\'ll be on the island with a few wreckers.';
}
function fpsStart() {
  if (FPS.on) return;
  const nick = ($('fpsNick').value || '').trim().slice(0, 16);
  FPS.nick = nick || 'Wrecker';
  FPS.on = true;
  FPS.saved = { state };
  state = 'fps';
  paused = false;
  $('fpsCard').hidden = true; $('titleCard').hidden = true; $('hud').hidden = true; $('logbox').hidden = true; $('biomeBanner').hidden = true;
  $('stage').classList.add('fpsmode');
  $('fpsPad').hidden = !matchMedia('(pointer: coarse)').matches;
  FPS.round = fpsRoundNow();
  FPS.g = fpsArena(FPS.round);
  FPS.me = { id: NET.sid, x: FPSC.CX, y: FPSC.CY, h: 0, p: 0, v: 0, z: 0, rudder: 0, bob: 0, boat: 'brig', inv: 0, pitch: 0,
    hp: FPSC.HP, ammo: FPSC.MAG, reload: 0, cd: 0, flares: FPSC.FLARES, lan: true, dead: 0, protect: 0, killer: null };
  FPS.sh = {}; FPS.kb = {}; FPS.deaths = 0; FPS.seenSh = {}; FPS.remote.clear(); FPS.feed = []; FPS.pings = []; FPS.tracers = []; FPS.parts = []; FPS.drowned = [];
  FPS.bots = []; FPS.drownT = 25; FPS.roundMsg = null; FPS.menu = false; $('fpsMenu').hidden = true;
  fpsRespawn(FPS.me);
  fpsSend(true);
  fpsFeed('You come ashore on the skerry. Keep out of the beam.');
  try { cv.focus(); } catch (e) {}
}
function fpsStop() {
  if (!FPS.on) return;
  FPS.on = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  if (NET.room) NET.room.presence({ fps: null }).catch(() => {});
  $('stage').classList.remove('fpsmode');
  $('fpsPad').hidden = true; $('fpsMenu').hidden = true;
  state = FPS.saved ? FPS.saved.state : 'title';
  if (state !== 'title') state = 'title';
  toTitle();
}
function fpsSetMenu(on) {
  FPS.menu = on; $('fpsMenu').hidden = !on;
  if (on) { try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {} setTimeout(() => $('fpsResume').focus(), 20); }
}

// ---------- the network ----------
function fpsPeers() {
  const out = [];
  for (const p of NET.peers || []) {
    const pr = p.presence; if (!pr || !pr.fps || p.isMe || pr.sid === NET.sid) continue;
    if (typeof pr.fps !== 'object' || typeof pr.fps.id !== 'string') continue;
    out.push(pr.fps);
  }
  return out;
}
function fpsSend(force) {
  if (!NET.room) return;
  const m = FPS.me, r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  NET.room.presence({ fps: {
    id: NET.sid, n: FPS.nick, r: FPS.round, x: r1(m.x), y: r1(m.y), h: r2(m.h), p: r2(m.p), hp: m.hp, dead: m.dead > 0 ? 1 : 0,
    lan: m.lan ? 1 : 0, fire: FPS.fire, sh: FPS.sh, kb: FPS.kb, d: FPS.deaths, bl: FPS.bell, fl: [FPS.flare, r1(FPS.flareAt[0]), r1(FPS.flareAt[1])],
    c: fpsColours(), wk: m.walk ? 1 : 0,
  } }).catch(() => {});
}
function fpsNetTick(dt) {
  const seen = new Set();
  for (const f of fpsPeers()) {
    seen.add(f.id);
    let r = FPS.remote.get(f.id);
    if (!r) {
      r = { id: f.id, x: f.x, y: f.y, h: f.h, p: f.p, fire: f.fire, bl: f.bl, fl: f.fl ? f.fl[0] : 0, hitT: 0, flashT: 0, dead: f.dead, d: f.d || 0, kills: 0 };
      FPS.remote.set(f.id, r);
      FPS.seenSh[f.id] = (f.sh && f.sh[NET.sid]) || 0;
      fpsFeed(`${f.n || 'A wrecker'} came ashore.`);
    }
    r.n = f.n || 'Wrecker'; r.tx = f.x; r.ty = f.y; r.th = f.h; r.p = f.p; r.hp = f.hp; r.lan = !!f.lan; r.c = Array.isArray(f.c) ? f.c : null; r.walk = !!f.wk;
    r.kb = f.r === FPS.round && f.kb && typeof f.kb === 'object' ? f.kb : {};
    r.r = f.r;
    if (f.dead && !r.dead) { r.x = f.x; r.y = f.y; }
    if (!f.dead && r.dead) { r.x = f.x; r.y = f.y; r.h = f.h; }   // respawned: jump, don't slide
    // a death: the victim names its killer
    if ((f.d || 0) > r.d && f.r === FPS.round) {
      const killer = fpsKillerOf(f, r);
      fpsFeed(killer ? `${killer} shot ${r.n}.` : `${r.n} was taken by the sea.`);
    }
    r.d = f.d || 0; r.dead = f.dead;
    // shots fired: a flash at the muzzle and the crack, quieter with distance
    if (f.fire > r.fire) { r.flashT = 0.12; fpsGunSound(Math.hypot(f.x - FPS.me.x, f.y - FPS.me.y), angDiff(bearingOf(f.x - FPS.me.x, f.y - FPS.me.y), FPS.me.h)); fpsTracer(r, f); }
    r.fire = f.fire;
    if (f.bl > r.bl) { FPS.pings.push({ x: f.x, y: f.y, t: 4, n: r.n }); fpsBellSound(Math.hypot(f.x - FPS.me.x, f.y - FPS.me.y)); }
    r.bl = f.bl;
    if (f.fl && f.fl[0] > r.fl) { FPS.g.flares.push({ x: f.fl[1], y: f.fl[2], t: SK.FLARE_TIME, skin: FLARES[0] }); }
    if (f.fl) r.fl = f.fl[0];
    // hits they've landed on me
    const n = (f.sh && f.sh[NET.sid]) || 0, prev = FPS.seenSh[f.id] || 0;
    if (n > prev) { FPS.seenSh[f.id] = n; fpsHurt(n - prev, f.id, r.n); }
  }
  for (const id of [...FPS.remote.keys()]) if (!seen.has(id)) { fpsFeed(`${FPS.remote.get(id).n} left the island.`); FPS.remote.delete(id); }
  // smooth everyone towards where they last said they were
  const k = Math.min(1, dt * 12);
  for (const r of FPS.remote.values()) {
    if (r.tx == null) continue;
    r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.h += angDiff(r.th, r.h) * k;
    if (r.flashT > 0) r.flashT -= dt; if (r.hitT > 0) r.hitT -= dt;
  }
  FPS.sendT -= dt;
  if (FPS.sendT <= 0) { FPS.sendT = FPSC.SEND; fpsSend(); }
}
function fpsKillerOf(f, r) {
  // the victim's kill book grew for someone: that's who
  const prev = r.prevKb || {}, now = f.kb || {};
  r.prevKb = Object.assign({}, now);
  for (const id in now) if ((now[id] || 0) > (prev[id] || 0)) return id === NET.sid ? 'You' : FPS.remote.get(id) ? FPS.remote.get(id).n : (FPS.bots.find(b => b.id === id) || {}).n || 'someone';
  return null;
}

// ---------- the people on the island ----------
function fpsEveryone() {
  const out = [Object.assign({ me: true, n: FPS.nick, c: fpsColours() }, FPS.me)];
  for (const r of FPS.remote.values()) out.push(r);
  for (const b of FPS.bots) out.push(b);
  return out;
}
function fpsRespawn(m) {
  // somewhere clear of rocks, as far as can be from everyone else
  const others = fpsEveryone().filter(o => o.id !== m.id && !(o.dead > 0));
  let best = null, bestD = -1;
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * (FPSC.R - 20);
    const x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (fpsBlocked(x, y, 1.5)) continue;
    const near = others.reduce((s, o) => Math.min(s, Math.hypot(o.x - x, o.y - y)), 1e9);
    if (near > bestD) { bestD = near; best = [x, y]; }
  }
  if (!best) best = [FPSC.CX, FPSC.CY - FPSC.R * 0.5];
  m.x = best[0]; m.y = best[1]; m.h = bearingOf(FPSC.CX - m.x, FPSC.CY - m.y); m.p = 0;
  m.hp = FPSC.HP; m.ammo = FPSC.MAG; m.reload = 0; m.cd = 0; m.flares = FPSC.FLARES; m.dead = 0; m.protect = FPSC.PROTECT;
}
function fpsBlocked(x, y, pad) {
  if (Math.hypot(x - FPSC.CX, y - FPSC.CY) > FPSC.R - 1.5) return true;
  for (const o of FPS.g.rocks) if (Math.hypot(o.x - x, o.y - y) < o.r * 1.02 + pad) return true;
  for (const o of FPS.g.wrecks) if (Math.hypot(o.x - x, o.y - y) < o.r * 0.75 + pad) return true;
  return false;
}
// move with sliding along whatever is in the way
function fpsMove(m, dx, dy) {
  if (!fpsBlocked(m.x + dx, m.y + dy, 0.5)) { m.x += dx; m.y += dy; return true; }
  if (!fpsBlocked(m.x + dx, m.y, 0.5)) { m.x += dx; return true; }
  if (!fpsBlocked(m.x, m.y + dy, 0.5)) { m.y += dy; return true; }
  return false;
}
// how well I can see a point: the beam, flares, my lantern (or the moon close by), their own lantern
function fpsSeeAt(x, y, theirLantern) {
  const me = FPS.me, d = Math.hypot(x - me.x, y - me.y);
  const mine = me.lan ? Math.max(0, 1 - d / SK.LANTERN) * 1.6 : Math.max(0, 1 - d / 14) * 0.9;
  const own = theirLantern ? 0.85 : 0;
  return Math.min(1, litAt(x, y) * 1.3 + flareAt(x, y) + mine + own);
}

// ---------- shooting ----------
// the first thing along a ray from (x, y, z) heading h, pitched p: a person, a rock, a wreck or the ground
function fpsRay(x, y, z, h, p, skipId) {
  const sx = Math.sin(h), sy = Math.cos(h), tp = Math.tan(p);
  let best = { t: FPSC.RANGE, kind: 'none' };
  if (p < -0.001) { const tg = (z - FPSC.GROUND) / -tp; if (tg < best.t) best = { t: tg, kind: 'ground' }; }
  const circle = (cx, cy, r) => {
    const ox = cx - x, oy = cy - y, along = ox * sx + oy * sy; if (along < 0) return null;
    const side2 = ox * ox + oy * oy - along * along; if (side2 > r * r) return null;
    return along - Math.sqrt(r * r - side2);
  };
  const B = curBiome();
  for (const o of FPS.g.rocks) {
    const t = circle(o.x, o.y, o.r * 0.95); if (t == null || t > best.t) continue;
    if (z + tp * Math.max(0, t) < o.r * 0.85 * B.rock.h * 0.85) best = { t: Math.max(0, t), kind: 'rock' };
  }
  for (const o of FPS.g.wrecks) {
    const t = circle(o.x, o.y, o.r * 0.6); if (t == null || t > best.t) continue;
    if (z + tp * Math.max(0, t) < o.r * 0.45) best = { t: Math.max(0, t), kind: 'wreck' };
  }
  const targets = [];
  for (const o of fpsEveryone()) if (o.id !== skipId && !(o.dead > 0)) targets.push(o);
  for (const d of FPS.drowned) targets.push(d);
  for (const o of targets) {
    const t = circle(o.x, o.y, FPSC.BODY); if (t == null || t > best.t) continue;
    const hz = z + tp * t - FPSC.GROUND;
    if (hz < 0 || hz > FPSC.TALL + 0.1) continue;
    best = { t, kind: 'body', who: o, head: hz > 1.5 };
  }
  best.x = x + sx * best.t; best.y = y + sy * best.t; best.z = z + tp * best.t;
  return best;
}
function fpsShoot() {
  const m = FPS.me;
  if (m.dead > 0 || m.reload > 0 || m.cd > 0 || FPS.menu) return;
  if (m.ammo <= 0) { fpsReload(); return; }
  m.ammo--; m.cd = FPSC.RATE; FPS.fire++; FPS.flash = 0.07; FPS.recoil = 1;
  m.protect = 0;
  fpsGunSound(0, 0);
  const z = FPSC.GROUND + FPSC.EYE;
  const hit = fpsRay(m.x, m.y, z, m.h, m.p, m.id);
  FPS.tracers.push({ a: [m.x + Math.sin(m.h) * 0.6 + Math.cos(m.h) * 0.3, m.y + Math.cos(m.h) * 0.6 - Math.sin(m.h) * 0.3, z - 0.25], b: [hit.x, hit.y, hit.z], t: 0.08 });
  if (hit.kind === 'body') {
    const dmg = hit.head ? 2 : 1, w = hit.who;
    FPS.hitT = 0.18; FPS.hitHead = hit.head;
    fpsHitSound(hit.head);
    if (w.drowned) { w.hp -= dmg; w.hitT = 0.2; if (w.hp <= 0) { w.dead = 1; fpsFeed('You put a drowned man back in the sea.'); fpsPuff(w.x, w.y, FPSC.GROUND + 1, '170,210,200', 14); } }
    else if (w.bot) fpsBotHurt(w, dmg, m.id);
    else { FPS.sh[w.id] = (FPS.sh[w.id] || 0) + dmg; const r = FPS.remote.get(w.id); if (r) r.hitT = 0.2; fpsSend(); }
  } else if (hit.kind !== 'none') fpsPuff(hit.x, hit.y, hit.z, hit.kind === 'ground' ? '150,140,120' : '190,190,180', 6);
  if (m.ammo <= 0) setTimeout(fpsReload, 250);
}
function fpsReload() { const m = FPS.me; if (m.dead > 0 || m.reload > 0 || m.ammo >= FPSC.MAG) return; m.reload = FPSC.RELOAD; fpsClick(); }
function fpsHurt(n, fromId, fromName) {
  const m = FPS.me; if (m.dead > 0 || m.protect > 0) return;
  m.hp -= n; FPS.hurtT = 0.5; FPS.calm = 0;
  try { sfxHit(); } catch (e) {}
  if (m.hp <= 0) fpsDie(fromId, fromName);
}
function fpsDie(fromId, fromName) {
  const m = FPS.me;
  m.hp = 0; m.dead = FPSC.RESPAWN; m.killer = fromName || null; m.lan = m.lan;
  FPS.deaths++;
  if (fromId) FPS.kb[fromId] = (FPS.kb[fromId] || 0) + 1;
  fpsFeed(fromName ? `${fromName} shot you.` : 'The sea took you.');
  fpsSend();
}
function fpsFlare() {
  const m = FPS.me; if (m.dead > 0 || m.flares <= 0) return;
  m.flares--; FPS.flare++; FPS.flareAt = [m.x + Math.sin(m.h) * 30, m.y + Math.cos(m.h) * 30];
  FPS.g.flares.push({ x: FPS.flareAt[0], y: FPS.flareAt[1], t: SK.FLARE_TIME, skin: FLARES[0] });
  try { sfxFlare(); } catch (e) {}
  fpsSend();
}
function fpsBell() {
  const m = FPS.me; if (m.dead > 0 || (FPS.bellCd || 0) > 0) return;
  FPS.bellCd = 8; FPS.bell++;
  try { sfxBell(); } catch (e) {}
  for (const o of fpsEveryone()) if (!o.me && !(o.dead > 0)) FPS.pings.push({ x: o.x, y: o.y, t: 3, n: o.n });
  fpsSend();
}
function fpsLantern() { FPS.me.lan = !FPS.me.lan; try { sfxTick(); } catch (e) {} fpsSend(); }

// ---------- sounds (made from the game's own noises) ----------
function fpsGunSound(d, pan) {
  try {
    if (soundOff()) return;
    const v = Math.max(0.05, 1 - d / 350);
    noise('lowpass', 1600 * v + 300, 0.7, 0.002, 0.55 * v, 0.28 + (1 - v) * 0.3, { pan: Math.max(-1, Math.min(1, pan || 0)) });
    tone(90, 'triangle', 0.002, 0.3 * v, 0.18, { to: 45 });
  } catch (e) {}
}
function fpsBellSound(d) { try { sfxBellFar(0, Math.max(0.15, 1 - d / 400)); } catch (e) {} }
function fpsHitSound(head) { try { tone(head ? 1250 : 900, 'square', 0.001, 0.06, 0.05); } catch (e) {} }
function fpsClick() { try { tone(420, 'square', 0.001, 0.05, 0.04); tone(300, 'square', 0.001, 0.05, 0.04, { delay: 0.5 }); } catch (e) {} }
function fpsFeed(text) { FPS.feed.push({ text, t: 5 }); if (FPS.feed.length > 5) FPS.feed.shift(); }
function fpsPuff(x, y, z, col, n) { for (let i = 0; i < n; i++) FPS.parts.push({ x, y, z, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: Math.random() * 3, t: 0.6, c: col }); }
function fpsTracer(r, f) {
  const hit = fpsRay(f.x, f.y, FPSC.GROUND + FPSC.EYE, f.h, f.p || 0, f.id);
  FPS.tracers.push({ a: [f.x + Math.sin(f.h) * 0.6, f.y + Math.cos(f.h) * 0.6, FPSC.GROUND + FPSC.EYE - 0.25], b: [hit.x, hit.y, hit.z], t: 0.08 });
}

// ---------- wreckers (bots), only when you're alone ----------
function fpsBotsTick(dt) {
  const want = FPS.remote.size === 0 ? FPSC.BOTS : 0;
  while (FPS.bots.length < want) {
    const b = { id: 'bot' + FPS.bots.length + Math.random().toString(36).slice(2, 5), bot: true, n: FPS_BOT_NAMES[FPS.bots.length % FPS_BOT_NAMES.length], x: 0, y: 0, h: 0, p: 0,
      c: [['#2a3a4a', '#c8c0aa', '#6a4a2a', '#ffd88a'], ['#4a2420', '#d8ccb4', '#8a6a3a', '#ffb070'], ['#25352a', '#cfc8b0', '#5a4a3a', '#d8f0ff']][FPS.bots.length % 3],
      kb: {}, d: 0, lan: Math.random() < 0.5, cd: 1, aim: 0, goal: null, flashT: 0, hitT: 0, walk: false, see: 0 };
    fpsRespawn(b); b.protect = 0; FPS.bots.push(b);
  }
  while (FPS.bots.length > want) FPS.bots.pop();
  for (const b of FPS.bots) {
    if (b.flashT > 0) b.flashT -= dt; if (b.hitT > 0) b.hitT -= dt;
    if (b.dead > 0) { b.dead -= dt; if (b.dead <= 0) { fpsRespawn(b); b.protect = 0; } continue; }
    // pick the nearest target it can see
    let tgt = null, td = 1e9;
    for (const o of fpsEveryone()) {
      if (o.id === b.id || o.dead > 0) continue;
      const d = Math.hypot(o.x - b.x, o.y - b.y); if (d > 170) continue;
      const lit = Math.min(1, litAt(o.x, o.y) * 1.3 + flareAt(o.x, o.y) + (o.lan ? 0.9 : 0) + Math.max(0, 1 - d / (b.lan ? SK.LANTERN : 16)) + ((o.flashT || 0) > 0 || (o.me && FPS.flash > 0) ? 1 : 0));
      if (lit < 0.35) continue;
      const ray = fpsRay(b.x, b.y, FPSC.GROUND + FPSC.EYE, bearingOf(o.x - b.x, o.y - b.y), 0, b.id);
      if (ray.kind !== 'body' || ray.who.id !== o.id) continue;
      if (d < td) { td = d; tgt = o; }
    }
    b.cd -= dt;
    if (tgt) {
      const want_h = bearingOf(tgt.x - b.x, tgt.y - b.y);
      b.h += angDiff(want_h, b.h) * Math.min(1, dt * 5);
      b.see += dt;
      // close in a little, or back off if too close
      const step = (td > 45 ? 1 : td < 15 ? -0.6 : 0.3) * FPSC.SPEED * 0.6 * dt;
      b.walk = fpsMove(b, Math.sin(b.h) * step, Math.cos(b.h) * step);
      if (b.cd <= 0 && b.see > 0.6 && Math.abs(angDiff(want_h, b.h)) < 0.15) {
        b.cd = 0.55 + Math.random() * 0.6; b.flashT = 0.12;
        fpsGunSound(Math.hypot(b.x - FPS.me.x, b.y - FPS.me.y), angDiff(bearingOf(b.x - FPS.me.x, b.y - FPS.me.y), FPS.me.h));
        const moving = tgt.me ? (FPS.me.walk ? 0.65 : 1) : 1;
        const chance = Math.max(0.1, Math.min(0.55, 0.68 - td / 240)) * moving;
        const miss = Math.random() > chance ? (Math.random() - 0.5) * 0.12 : 0;
        const ray = fpsRay(b.x, b.y, FPSC.GROUND + FPSC.EYE, b.h + miss, miss ? 0.04 : -0.005, b.id);
        FPS.tracers.push({ a: [b.x + Math.sin(b.h) * 0.6, b.y + Math.cos(b.h) * 0.6, FPSC.GROUND + FPSC.EYE - 0.25], b: [ray.x, ray.y, ray.z], t: 0.08 });
        if (!miss && ray.kind === 'body') {
          if (ray.who.me) fpsHurt(1, b.id, b.n);
          else if (ray.who.bot) fpsBotHurt(ray.who, 1, b.id);
          else if (ray.who.drowned) { ray.who.hp -= 1; if (ray.who.hp <= 0) ray.who.dead = 1; }
        }
      }
    } else {
      b.see = 0;
      if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.y) < 4 || Math.random() < dt * 0.05) {
        const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * (FPSC.R - 20);
        b.goal = [FPSC.CX + Math.cos(a) * d, FPSC.CY + Math.sin(a) * d];
      }
      const wh = bearingOf(b.goal[0] - b.x, b.goal[1] - b.y);
      b.h += angDiff(wh, b.h) * Math.min(1, dt * 3);
      const st = FPSC.SPEED * 0.55 * dt;
      b.walk = fpsMove(b, Math.sin(b.h) * st, Math.cos(b.h) * st);
      if (!b.walk) b.goal = null;
      if (Math.random() < dt * 0.02) b.lan = !b.lan;
    }
  }
}
function fpsBotHurt(b, dmg, fromId) {
  if (b.dead > 0) return;
  b.hp -= dmg; b.hitT = 0.2;
  if (b.hp <= 0) {
    b.dead = FPSC.RESPAWN; b.d++;
    if (fromId) b.kb[fromId] = (b.kb[fromId] || 0) + 1;
    const who = fromId === FPS.me.id ? 'You' : (FPS.bots.find(o => o.id === fromId) || {}).n || 'Someone';
    fpsFeed(`${who} shot ${b.n}.`);
  }
}

// ---------- the drowned crew wade ashore ----------
function fpsDrownedTick(dt) {
  FPS.drownT -= dt;
  if (FPS.drownT <= 0 && FPS.drowned.length < 3) {
    FPS.drownT = 30 + Math.random() * 25;
    const a = Math.random() * 6.283;
    FPS.drowned.push({ drowned: true, id: 'dr' + Math.random(), n: 'a drowned man', x: FPSC.CX + Math.cos(a) * (FPSC.R + 6), y: FPSC.CY + Math.sin(a) * (FPSC.R + 6), hp: 3, rise: 0, bite: 0, ph: Math.random() * 6, hitT: 0 });
    fpsFeed('Something is wading ashore.');
    try { sfxSplash(0, 0.5); } catch (e) {}
  }
  for (const d of FPS.drowned) {
    if (d.hitT > 0) d.hitT -= dt;
    d.rise = Math.min(1, d.rise + dt * 0.4); d.ph += dt * 3;
    let tgt = null, td = 1e9;
    for (const o of fpsEveryone()) { if (o.dead > 0) continue; const dd = Math.hypot(o.x - d.x, o.y - d.y); if (dd < td) { td = dd; tgt = o; } }
    if (!tgt) continue;
    const h = bearingOf(tgt.x - d.x, tgt.y - d.y), st = 2.6 * dt * d.rise;
    if (td > 1.1) { const nx = d.x + Math.sin(h) * st, ny = d.y + Math.cos(h) * st; if (!FPS.g.rocks.some(o => Math.hypot(o.x - nx, o.y - ny) < o.r)) { d.x = nx; d.y = ny; } else { d.x += Math.cos(h) * st; d.y -= Math.sin(h) * st; } }
    d.bite -= dt;
    if (td < 1.3 && d.bite <= 0) {
      d.bite = 1.1;
      if (tgt.me) fpsHurt(1, null, null); else if (tgt.bot) fpsBotHurt(tgt, 1, null);
    }
  }
  FPS.drowned = FPS.drowned.filter(d => !d.dead);
}

// ---------- each frame ----------
function fpsFrame(dt) {
  const G = FPS.g, m = FPS.me;
  const saved = [g, ship];
  g = G; ship = m;
  try {
    G.t += dt;
    G.beam = wrapPi(Date.now() / 1000 / FPSC.PERIOD * Math.PI * 2);
    for (const f of G.flares) f.t -= dt;
    G.flares = G.flares.filter(f => f.t > 0);
    G.mods.lantern = m.lan ? 1 : 0.3;
    // a new round: the scores go back to nothing, and the island moves to the next sea
    const rn = fpsRoundNow();
    if (rn !== FPS.round) {
      const top = fpsScores()[0];
      FPS.roundMsg = { t: 6, text: top && top.k > 0 ? `${top.me ? 'You' : top.n} won the round with ${top.k} ${top.k === 1 ? 'kill' : 'kills'}.` : 'The round is over.' };
      FPS.round = rn; FPS.kb = {}; FPS.deaths = 0;
      for (const b of FPS.bots) { b.kb = {}; b.d = 0; }
      for (const r of FPS.remote.values()) r.prevKb = {};
      G.biome = FPS_SEAS[rn % FPS_SEAS.length];
      fpsRespawn(m); fpsSend(true);
    }
    if (FPS.roundMsg) { FPS.roundMsg.t -= dt; if (FPS.roundMsg.t <= 0) FPS.roundMsg = null; }
    fpsInput(dt);
    if (m.dead > 0) { m.dead -= dt; if (m.dead <= 0) { fpsRespawn(m); fpsSend(); } }
    if (m.protect > 0) m.protect -= dt;
    // patch yourself up: a point of health back after six quiet seconds, and every four after that
    FPS.calm = (FPS.calm || 0) + dt;
    if (m.dead <= 0 && m.hp < FPSC.HP && FPS.calm > 6) { m.hp++; FPS.calm = 2; }
    if (m.cd > 0) m.cd -= dt;
    if (m.reload > 0) { m.reload -= dt; if (m.reload <= 0) { m.reload = 0; m.ammo = FPSC.MAG; } }
    if ((FPS.bellCd || 0) > 0) FPS.bellCd -= dt;
    for (const k of ['flash', 'hitT', 'hurtT']) if (FPS[k] > 0) FPS[k] -= dt;
    FPS.recoil = Math.max(0, FPS.recoil - dt * 6);
    for (const p of FPS.pings) p.t -= dt; FPS.pings = FPS.pings.filter(p => p.t > 0);
    for (const t of FPS.tracers) t.t -= dt; FPS.tracers = FPS.tracers.filter(t => t.t > 0);
    for (const f of FPS.feed) f.t -= dt; FPS.feed = FPS.feed.filter(f => f.t > 0);
    for (const p of FPS.parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 9 * dt; }
    FPS.parts = FPS.parts.filter(p => p.t > 0);
    fpsNetTick(dt);
    fpsBotsTick(dt);
    fpsDrownedTick(dt);
    fpsDraw();
  } finally { g = saved[0]; ship = saved[1]; }
}
function fpsInput(dt) {
  const m = FPS.me, K = FPS.keys;
  // looking: mouse (pointer lock), the right stick, or a finger on the right of the screen
  const sens = 0.0023;
  m.h = wrapPi(m.h + FPS.look[0] * sens); m.p = clamp(m.p - FPS.look[1] * sens, -0.6, 0.6);
  FPS.look = [0, 0];
  let fx = 0, fz = 0, fire = false;
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
  if (pad) {
    const dz = v => Math.abs(v) < 0.15 ? 0 : v;
    fx += dz(pad.axes[0] || 0); fz -= dz(pad.axes[1] || 0);
    m.h = wrapPi(m.h + dz(pad.axes[2] || 0) * dt * 2.6); m.p = clamp(m.p - dz(pad.axes[3] || 0) * dt * 1.8, -0.6, 0.6);
    const b = i => pad.buttons[i] && pad.buttons[i].pressed, was = FPS.padWas || {};
    if (b(7) || b(5)) fire = true;
    const tap = (i, fn) => { if (b(i) && !was[i]) fn(); };
    tap(2, fpsReload); tap(3, fpsLantern); tap(1, fpsFlare); tap(4, fpsBell); tap(9, () => fpsSetMenu(!FPS.menu)); tap(8, () => { FPS.board = !FPS.board; });
    FPS.padWas = {}; for (let i = 0; i < pad.buttons.length; i++) FPS.padWas[i] = b(i);
    FPS.padSprint = b(10);
  }
  if (K.KeyW || K.ArrowUp) fz += 1; if (K.KeyS || K.ArrowDown) fz -= 1;
  if (K.KeyD) fx += 1; if (K.KeyA) fx -= 1;
  if (K.ArrowLeft) m.h = wrapPi(m.h - dt * 2.2); if (K.ArrowRight) m.h = wrapPi(m.h + dt * 2.2);
  if (FPS.stick) { fx += FPS.stick.dx; fz -= FPS.stick.dy; }
  if (FPS.mouseDown || FPS.touchFire || fire) fpsShoot();
  const len = Math.hypot(fx, fz);
  m.walk = false;
  if (m.dead <= 0 && len > 0.05 && !FPS.menu) {
    const sp = (K.ShiftLeft || K.ShiftRight || FPS.padSprint ? FPSC.SPRINT : FPSC.SPEED) * Math.min(1, len) / len * dt;
    const s = Math.sin(m.h), c = Math.cos(m.h);
    m.walk = fpsMove(m, (s * fz + c * fx) * sp, (c * fz - s * fx) * sp);
    if (m.walk) FPS.step += dt * (K.ShiftLeft || K.ShiftRight ? 11 : 8);
  }
}

// ---------- drawing ----------
function fpsDraw() {
  const m = FPS.me;
  camX = m.x; camY = m.y; yaw = m.h;
  camH = FPSC.GROUND + FPSC.EYE + (reduceMotion ? 0 : Math.sin(FPS.step) * 0.05) - (m.dead > 0 ? 1.2 * Math.min(1, (FPSC.RESPAWN - m.dead) * 2) : 0);
  hy = H * 0.5 + Math.tan(m.p) * focal;
  const roll = m.dead > 0 ? 0.25 * Math.min(1, (FPSC.RESPAWN - m.dead) * 2) : 0;
  const gl = gl3dWanted() && (GL3D.ok || (!GL3D.tried && gl3dInit()));
  gl3dShow(gl);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (gl) ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(cx, hy); ctx.rotate(roll); ctx.translate(-cx, -hy);
  const far = SK.BEAM_RANGE, beamOn = Math.abs(g.beam) < SK.SHADE + SK.HALF_BEAM;
  const fl = [Math.sin(g.beam - SK.HALF_BEAM) * far, Math.cos(g.beam - SK.HALF_BEAM) * far], fr = [Math.sin(g.beam + SK.HALF_BEAM) * far, Math.cos(g.beam + SK.HALF_BEAM) * far];
  let shown = 0;
  if (gl) {
    gl3dBackdrop(roll, 0, 0);
    shown = gl3dRender(roll, 0, 0, beamOn);
    drawSeaFx(curBiome()); gl3dLandGlows();
  } else {
    drawSky(); drawSea(); drawCoast();
    // the island, a low disc of rock and shingle
    const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; pts.push([FPSC.CX + Math.cos(a) * FPSC.R, FPSC.CY + Math.sin(a) * FPSC.R, FPSC.GROUND]); }
    fillPoly(pts, mix(curBiome().ground.length === 7 ? curBiome().ground : '#0a0d0c', '#55524a', 0.35));
  }
  // everything standing on the island, far to near
  const items = [];
  const add = (kind, o, z) => { const c = cam(o.x, o.y, z == null ? FPSC.GROUND : z); if (c.f > 0.6) items.push({ kind, o, c }); };
  if (!gl) { for (const o of g.rocks) add('rock', o, 0); for (const o of g.wrecks) add('wreck', o, 0); }
  for (const o of FPS.remote.values()) if (!o.dead) add('person', o);
  for (const o of FPS.bots) if (!(o.dead > 0)) add('person', o);
  for (const d of FPS.drowned) add('drowned', d);
  items.sort((a, b) => b.c.f - a.c.f);
  for (const it of items) {
    ctx.save();
    try {
      if (gl) gl3dClip(it.c.f);
      const q = proj(it.c), o = it.o;
      if (it.kind === 'rock') drawRockDetailed(o, q, Math.max(0.5, visibility(o.x, o.y)));
      else if (it.kind === 'wreck') drawWreck(o, q, Math.max(0.5, visibility(o.x, o.y)));
      else if (it.kind === 'person') fpsDrawPerson(o, it.c);
      else if (it.kind === 'drowned') fpsDrawDrowned(o, it.c);
    } finally { ctx.restore(); }
  }
  if (gl) gl3dGlows(shown); else drawLighthouse(beamOn, fl, fr, far);
  drawFlares();
  // tracers and smoke
  for (const t of FPS.tracers) {
    const p = polyProj([t.a, t.b]); if (p.length < 2) continue;
    ctx.strokeStyle = `rgba(255,220,150,${t.t / 0.08 * 0.6})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke();
  }
  for (const p of FPS.parts) { const c = cam(p.x, p.y, p.z); if (c.f < 0.6) continue; const q = proj(c); ctx.fillStyle = `rgba(${p.c},${p.t / 0.6})`; const s = Math.max(1.5, 0.12 * q.s); ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s); }
  ctx.restore();
  fpsDrawHands();
  drawAtmosphere();
  fpsHud();
}
// a wrecker: boots, long coat in their colours, a hat, a pistol, and their lantern if it's lit
function fpsDrawPerson(o, c) {
  const vis = o.me ? 1 : Math.max(fpsSeeAt(o.x, o.y, o.lan), o.flashT > 0 ? 1 : 0);
  const foot = proj(c), head = proj(cam(o.x, o.y, FPSC.GROUND + FPSC.TALL));
  const hgt = foot.y - head.y, w = hgt * 0.3, x = foot.x;
  const col = o.c || ['#3a2a1e', '#d8d0bc', '#7a5a3a', '#ffd88a'];
  const dark = (hex, k) => { try { return mix(String(hex).length === 7 ? hex : '#444444', '#06080c', 1 - (0.25 + 0.75 * vis) * (k || 1)); } catch (e) { return '#222'; } };
  // their lantern shows from anywhere on the island, even if they don't
  const facing = angDiff(o.h, bearingOf(camX - o.x, camY - o.y));
  const side = Math.sin(facing) >= 0 ? 1 : -1;
  if (o.lan) {
    const lx = x + side * w * 0.75, ly = foot.y - hgt * 0.42;
    lamp(lx, ly, String(col[3]).length === 7 ? col[3] : '#ffd88a', Math.max(2.2, hgt * 0.06));
  }
  if (vis < 0.04) return;
  ctx.globalAlpha = Math.min(1, vis * 1.2);
  const stride = o.walk ? Math.sin(g.t * 9 + (o.x + o.y)) * w * 0.25 : 0;
  // boots and legs
  ctx.fillStyle = dark('#1a1612');
  ctx.fillRect(x - w * 0.32 + stride, foot.y - hgt * 0.38, w * 0.26, hgt * 0.38);
  ctx.fillRect(x + w * 0.06 - stride, foot.y - hgt * 0.38, w * 0.26, hgt * 0.38);
  // the coat: hull colour, flaring at the hem, trimmed in the rail colour
  ctx.fillStyle = dark(col[0]);
  ctx.beginPath(); ctx.moveTo(x - w * 0.5, foot.y - hgt * 0.24); ctx.lineTo(x + w * 0.5, foot.y - hgt * 0.24); ctx.lineTo(x + w * 0.4, foot.y - hgt * 0.8); ctx.lineTo(x - w * 0.4, foot.y - hgt * 0.8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark(col[2]); ctx.fillRect(x - w * 0.04, foot.y - hgt * 0.8, w * 0.08, hgt * 0.56);
  ctx.fillRect(x - w * 0.46, foot.y - hgt * 0.5, w * 0.92, hgt * 0.04);
  // arms: one with the pistol, one with the lantern
  ctx.fillStyle = dark(col[0], 0.85);
  ctx.fillRect(x - side * w * 0.62 - w * 0.1, foot.y - hgt * 0.78, w * 0.2, hgt * 0.34);
  ctx.save(); ctx.translate(x + side * w * 0.45, foot.y - hgt * 0.76); ctx.rotate(-side * 0.9 * Math.cos(facing));
  ctx.fillRect(-w * 0.1, 0, w * 0.2, hgt * 0.3); ctx.fillStyle = dark('#2a2420'); ctx.fillRect(-w * 0.06, hgt * 0.28, w * 0.12, hgt * 0.12); ctx.restore();
  // head and a three-cornered hat
  ctx.fillStyle = dark('#c8a888'); ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.88, hgt * 0.075, 0, 6.28); ctx.fill();
  ctx.fillStyle = dark('#141210');
  ctx.beginPath(); ctx.moveTo(x - hgt * 0.13, foot.y - hgt * 0.93); ctx.lineTo(x + hgt * 0.13, foot.y - hgt * 0.93); ctx.lineTo(x + hgt * 0.06, foot.y - hgt * 1.0); ctx.lineTo(x - hgt * 0.06, foot.y - hgt * 1.0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark(col[1]); ctx.fillRect(x - hgt * 0.1, foot.y - hgt * 0.945, hgt * 0.2, hgt * 0.012);
  if (o.hitT > 0) { ctx.globalAlpha = o.hitT * 3; ctx.fillStyle = '#ff6040'; ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.6, w * 0.5, 0, 6.28); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (o.flashT > 0) { const mx = x + side * w * 0.6, my = foot.y - hgt * 0.62; lamp(mx, my, '#ffd890', Math.max(3, hgt * 0.07)); }
  // a name over their head when you can see them well
  if (vis > 0.45 && hgt > 22) {
    ctx.font = `600 ${Math.round(Math.min(16, 9 + hgt * 0.04))}px "Courier Prime", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = `rgba(236,228,207,${Math.min(1, vis)})`; ctx.fillText(o.n || '', x, foot.y - hgt * 1.04);
    if (!o.me && o.hp != null) { for (let i = 0; i < FPSC.HP; i++) { ctx.fillStyle = i < o.hp ? 'rgba(228,108,79,0.9)' : 'rgba(80,70,60,0.6)'; ctx.fillRect(x - 14 + i * 7.5, foot.y - hgt * 1.04 + 2, 6, 3); } }
  }
}
function fpsDrawDrowned(d, c) {
  const foot = proj(c), hgt = (foot.y - proj(cam(d.x, d.y, FPSC.GROUND + FPSC.TALL * 0.95)).y) * (0.4 + 0.6 * d.rise);
  const vis = fpsSeeAt(d.x, d.y, false), x = foot.x + Math.sin(d.ph) * hgt * 0.03, w = hgt * 0.26;
  // their eyes catch any light at all, so you can always see them coming
  ctx.fillStyle = `rgba(200,235,225,${0.3 + 0.6 * vis})`;
  const e = Math.max(1, hgt * 0.02);
  ctx.fillRect(x - hgt * 0.04 - e / 2, foot.y - hgt * 0.9, e, e); ctx.fillRect(x + hgt * 0.04 - e / 2, foot.y - hgt * 0.9, e, e);
  if (vis < 0.05) return;
  ctx.globalAlpha = Math.min(1, vis * 1.2);
  ctx.fillStyle = '#3c5650';
  ctx.beginPath(); ctx.moveTo(x - w * 0.5, foot.y); ctx.lineTo(x + w * 0.5, foot.y); ctx.lineTo(x + w * 0.38, foot.y - hgt * 0.82); ctx.lineTo(x - w * 0.38, foot.y - hgt * 0.82); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f8a80'; ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.89, hgt * 0.08, 0, 6.28); ctx.fill();
  // arms out in front, and weed hanging off them
  ctx.fillStyle = '#4c665e'; ctx.fillRect(x - w * 0.6, foot.y - hgt * 0.72, w * 0.18, hgt * 0.34); ctx.fillRect(x + w * 0.42, foot.y - hgt * 0.72, w * 0.18, hgt * 0.34);
  ctx.fillStyle = 'rgba(30,60,40,0.8)'; for (let i = 0; i < 4; i++) ctx.fillRect(x - w * 0.3 + i * w * 0.18, foot.y - hgt * 0.6, Math.max(1, w * 0.05), hgt * 0.25);
  ctx.fillStyle = 'rgba(200,235,225,0.9)'; ctx.fillRect(x - hgt * 0.04 - e / 2, foot.y - hgt * 0.9, e, e); ctx.fillRect(x + hgt * 0.04 - e / 2, foot.y - hgt * 0.9, e, e);
  if (d.hitT > 0) { ctx.globalAlpha = d.hitT * 3; ctx.fillStyle = '#c8f0e0'; ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.5, w * 0.5, 0, 6.28); ctx.fill(); }
  ctx.globalAlpha = 1;
}
// your hands: a pepperbox pistol on the right, your lantern on the left
function fpsDrawHands() {
  const m = FPS.me; if (m.dead > 0) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = Math.min(W, H) / 600, bob = reduceMotion ? 0 : Math.sin(FPS.step) * 6 * s, sway = reduceMotion ? 0 : Math.cos(FPS.step * 0.5) * 5 * s;
  const rl = m.reload > 0 ? Math.sin(Math.min(1, (FPSC.RELOAD - m.reload) / FPSC.RELOAD) * Math.PI) : 0;
  const x = W * 0.68 + sway, y = H * 0.86 + bob + FPS.recoil * 18 * s + rl * 120 * s;
  const skin = fpsSkin();
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12 - FPS.recoil * 0.25 + rl * 0.6); ctx.scale(s, s);
  // sleeve and hand
  ctx.fillStyle = mix(String(skin.hull).length === 7 ? skin.hull : '#3a2a1e', '#000000', 0.35); ctx.fillRect(40, 30, 120, 70);
  ctx.fillStyle = '#7a5c46'; ctx.beginPath(); ctx.ellipse(30, 40, 34, 26, 0, 0, 6.28); ctx.fill();
  // the grip, the lock and the turning barrels
  ctx.fillStyle = '#4a2e1c'; ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(50, 20); ctx.lineTo(40, 90); ctx.lineTo(8, 84); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b08a3c'; ctx.fillRect(6, 80, 36, 8);
  ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-10, 0, 66, 26);
  const turn = (FPSC.MAG - m.ammo) * 0.5;
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#3a3a40' : '#24242a'; ctx.fillRect(-120, 2 + i * 8 + Math.sin(turn + i) * 1.5, 112, 7); }
  ctx.fillStyle = '#16161a'; ctx.fillRect(-124, 0, 8, 26);
  ctx.fillStyle = '#5a5a60'; ctx.fillRect(20, -8, 10, 12);
  ctx.restore();
  if (FPS.flash > 0) { const fx = x - 120 * s * Math.cos(0.12), fy = y - 14 * s; lamp(fx, fy, '#ffd890', 18 * s * (FPS.flash / 0.07)); ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.beginPath(); ctx.arc(fx, fy, 10 * s, 0, 6.28); ctx.fill(); }
  // the lantern in your other hand
  const lx = W * 0.2 - sway * 0.6, ly = H * 0.9 + bob * 0.8;
  ctx.save(); ctx.translate(lx, ly); ctx.scale(s, s);
  ctx.fillStyle = '#1c1814'; ctx.fillRect(-26, -70, 52, 8); ctx.fillRect(-22, 10, 44, 10);
  ctx.strokeStyle = '#1c1814'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -78, 14, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = m.lan ? `rgba(255,214,140,${0.75 + 0.1 * Math.sin(g.t * 13)})` : 'rgba(60,56,50,0.8)'; ctx.fillRect(-20, -62, 40, 72);
  ctx.fillStyle = '#1c1814'; for (const bx of [-20, -2, 16]) ctx.fillRect(bx, -62, 4, 72);
  ctx.restore();
  if (m.lan) lamp(lx, ly - 26 * s, String(skin.lantern).length === 7 ? skin.lantern : '#ffd88a', 22 * s);
}
function fpsScores() {
  const list = fpsEveryone().map(o => ({ id: o.id, n: o.me ? FPS.nick : o.n, me: !!o.me, bot: !!o.bot, k: 0, d: o.me ? FPS.deaths : o.d || 0 }));
  const books = [{ kb: FPS.kb }].concat([...FPS.remote.values()].map(r => ({ kb: r.kb || {} })), FPS.bots.map(b => ({ kb: b.kb })));
  for (const p of list) for (const b of books) p.k += b.kb[p.id] || 0;
  return list.sort((a, b) => b.k - a.k || a.d - b.d);
}
function fpsHud() {
  const m = FPS.me;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mono = px => `600 ${px}px "Courier Prime", monospace`;
  // hurt and dying
  if (FPS.hurtT > 0) { ctx.fillStyle = `rgba(160,20,10,${FPS.hurtT * 0.6})`; ctx.fillRect(0, 0, W, H); }
  if (m.protect > 0) { ctx.fillStyle = `rgba(200,220,255,${0.06 + 0.04 * Math.sin(g.t * 10)})`; ctx.fillRect(0, 0, W, H); }
  // crosshair, and a mark when you hit
  const cy = H / 2;
  if (m.dead <= 0) {
    ctx.strokeStyle = 'rgba(236,228,207,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
    const gap = 5 + FPS.recoil * 6;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(cx + dx * gap, cy + dy * gap); ctx.lineTo(cx + dx * (gap + 7), cy + dy * (gap + 7)); }
    ctx.stroke();
    if (FPS.hitT > 0) { ctx.strokeStyle = FPS.hitHead ? 'rgba(255,90,60,0.95)' : 'rgba(255,240,200,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(cx + dx * 6, cy + dy * 6); ctx.lineTo(cx + dx * 13, cy + dy * 13); } ctx.stroke(); }
  }
  // the bearing strip, with the bell's pings
  const sw = Math.min(520, W * 0.6), sx = cx - sw / 2, sy = 14;
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(sx, sy, sw, 22);
  ctx.font = mono(11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const span = 1.6;
  for (const [lab, b] of [['N', 0], ['NE', 0.785], ['E', 1.571], ['SE', 2.356], ['S', 3.1416], ['SW', -2.356], ['W', -1.571], ['NW', -0.785]]) {
    const d = angDiff(b, m.h); if (Math.abs(d) > span / 2) continue;
    ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText(lab, cx + d / span * sw, sy + 11);
  }
  { const d = angDiff(bearingOf(-m.x, -m.y), m.h); if (Math.abs(d) < span / 2) { ctx.fillStyle = '#ffd88a'; ctx.fillRect(cx + d / span * sw - 2, sy + 2, 4, 4); } }
  for (const p of FPS.pings) {
    const d = angDiff(bearingOf(p.x - m.x, p.y - m.y), m.h), xx = cx + clamp(d / span, -0.5, 0.5) * sw;
    ctx.globalAlpha = Math.min(1, p.t); ctx.fillStyle = '#e46c4f'; ctx.beginPath(); ctx.moveTo(xx, sy + 24); ctx.lineTo(xx - 5, sy + 32); ctx.lineTo(xx + 5, sy + 32); ctx.fill();
    ctx.font = mono(10); ctx.fillText(`${p.n} ${Math.round(Math.hypot(p.x - m.x, p.y - m.y))}m`, xx, sy + 42); ctx.globalAlpha = 1;
  }
  // round clock and sea
  const left = FPSC.ROUND - (Date.now() % FPSC.ROUND), mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(13); ctx.fillStyle = 'rgba(236,228,207,0.85)';
  ctx.fillText(`ROUND ${mm}:${String(ss).padStart(2, '0')}`, 16, 14);
  ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.55)'; ctx.fillText((BIOMES[g.biome] || BIOMES.skerry).name.replace(/^the /, 'The '), 16, 32);
  const sc = fpsScores(), mine = sc.find(p => p.me) || { k: 0, d: 0 };
  ctx.textAlign = 'right'; ctx.font = mono(13); ctx.fillStyle = 'rgba(236,228,207,0.85)'; ctx.fillText(`KILLS ${mine.k}  ·  DEATHS ${mine.d}`, W - 16, 14);
  ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.55)'; ctx.fillText(sc[0] && sc[0].k ? `Leader: ${sc[0].me ? 'you' : sc[0].n} (${sc[0].k})` : `${sc.length} on the island`, W - 16, 32);
  // kill feed
  ctx.font = mono(12);
  FPS.feed.forEach((f, i) => { ctx.fillStyle = `rgba(236,228,207,${Math.min(1, f.t) * 0.85})`; ctx.fillText(f.text, W - 16, 56 + i * 17, W - 80); });
  // health, ammo, flares, lantern
  const by = H - 22;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < FPSC.HP; i++) { ctx.fillStyle = i < m.hp ? '#ffd88a' : 'rgba(80,70,60,0.7)'; ctx.fillRect(16 + i * 26, by - 12, 22, 10); }
  ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.6)'; ctx.fillText('HEALTH', 16, by - 18);
  // (on a phone the buttons sit bottom right, so the ammo goes above them)
  const pad = $('fpsPad'), padTop = pad && !pad.hidden ? pad.getBoundingClientRect().top - cv.getBoundingClientRect().top - 12 : by;
  const ay = Math.min(by, padTop);
  ctx.textAlign = 'right'; ctx.font = mono(22); ctx.fillStyle = m.ammo ? 'rgba(236,228,207,0.9)' : '#e46c4f';
  ctx.fillText(m.reload > 0 ? 'RELOADING' : `${m.ammo} / ${FPSC.MAG}`, W - 16, ay);
  ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.6)';
  ctx.fillText(`FLARES ${m.flares}  ·  LANTERN ${m.lan ? 'LIT' : 'DARK'}  ·  BELL ${(FPS.bellCd || 0) > 0 ? Math.ceil(FPS.bellCd) + 's' : 'READY'}`, W - 16, ay - 28);
  // being lit up by the beam: a warning
  if (m.dead <= 0 && litAt(m.x, m.y) > 0) { ctx.textAlign = 'center'; ctx.font = mono(12); ctx.fillStyle = 'rgba(255,216,138,0.9)'; ctx.fillText('IN THE BEAM — EVERYONE CAN SEE YOU', cx, H * 0.5 + 60); }
  // dead
  if (m.dead > 0) {
    ctx.fillStyle = 'rgba(10,4,4,0.45)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e46c4f'; ctx.font = '400 34px "IM Fell English SC", serif';
    ctx.fillText(m.killer ? `Shot by ${m.killer}` : 'Taken by the sea', cx, H * 0.42);
    ctx.font = mono(13); ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText(`Back ashore in ${Math.ceil(m.dead)}…`, cx, H * 0.42 + 36);
  }
  if (FPS.roundMsg) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '400 30px "IM Fell English SC", serif'; ctx.fillStyle = `rgba(255,216,138,${Math.min(1, FPS.roundMsg.t)})`; ctx.fillText(FPS.roundMsg.text, cx, H * 0.3); ctx.font = mono(12); ctx.fillText(`A new round begins on ${(BIOMES[g.biome] || BIOMES.skerry).name}.`, cx, H * 0.3 + 30); }
  // scoreboard
  if (FPS.board) {
    const rows = sc, bw = Math.min(420, W - 32), bh = 54 + rows.length * 24, bx = cx - bw / 2, by2 = H * 0.18;
    ctx.fillStyle = 'rgba(8,10,14,0.85)'; ctx.fillRect(bx, by2, bw, bh);
    ctx.strokeStyle = 'rgba(236,228,207,0.25)'; ctx.strokeRect(bx + 0.5, by2 + 0.5, bw - 1, bh - 1);
    ctx.textBaseline = 'middle'; ctx.font = '400 22px "IM Fell English SC", serif'; ctx.fillStyle = '#ffd88a'; ctx.textAlign = 'left'; ctx.fillText("Wreckers' Night", bx + 14, by2 + 22);
    ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.55)'; ctx.textAlign = 'right'; ctx.fillText('KILLS   DEATHS', bx + bw - 14, by2 + 22);
    rows.forEach((r, i) => {
      const yy = by2 + 50 + i * 24;
      ctx.font = mono(13); ctx.textAlign = 'left'; ctx.fillStyle = r.me ? '#ffd88a' : 'rgba(236,228,207,0.85)';
      ctx.fillText(`${i + 1}. ${r.n}${r.bot ? ' (bot)' : ''}`, bx + 14, yy);
      ctx.textAlign = 'right'; ctx.fillText(`${String(r.k).padStart(3)}   ${String(r.d).padStart(4)}`, bx + bw - 14, yy);
    });
  }
  if (!FPS.mouse && !matchMedia('(pointer: coarse)').matches && !FPS.menu) {
    ctx.textAlign = 'center'; ctx.font = mono(12); ctx.fillStyle = 'rgba(236,228,207,0.6)'; ctx.fillText('Click to aim with the mouse', cx, H * 0.5 + 40);
  }
}

// ---------- controls ----------
const FPS_KEYS = { KeyR: fpsReload, KeyL: fpsLantern, KeyF: fpsFlare, KeyB: fpsBell, Space: fpsBell };
addEventListener('keydown', e => {
  if (!FPS.on) return;
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  e.stopImmediatePropagation();
  if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); fpsSetMenu(!FPS.menu); return; }
  if (FPS.menu) return;
  if (e.code === 'Tab') { e.preventDefault(); FPS.board = true; return; }
  FPS.keys[e.code] = true;
  if (!e.repeat && FPS_KEYS[e.code]) { e.preventDefault(); FPS_KEYS[e.code](); }
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
}, true);
addEventListener('keyup', e => {
  if (!FPS.on) return;
  e.stopImmediatePropagation();
  FPS.keys[e.code] = false;
  if (e.code === 'Tab') FPS.board = false;
}, true);
addEventListener('blur', () => { FPS.keys = {}; FPS.mouseDown = false; });
// the mouse: click to lock it to the view, then it aims; hold the button to fire
addEventListener('pointerdown', e => {
  if (!FPS.on || e.target !== cv || e.pointerType === 'touch') return;
  e.stopImmediatePropagation(); e.preventDefault();
  if (FPS.menu) return;
  if (document.pointerLockElement !== cv) { try { cv.requestPointerLock(); } catch (err) {} return; }
  if (e.button === 0) FPS.mouseDown = true;
  if (e.button === 2) fpsReload();
}, true);
addEventListener('pointerup', e => { if (FPS.on && e.pointerType !== 'touch') FPS.mouseDown = false; }, true);
addEventListener('contextmenu', e => { if (FPS.on && e.target === cv) e.preventDefault(); }, true);
addEventListener('mousemove', e => { if (FPS.on && document.pointerLockElement === cv && !FPS.menu) { FPS.look[0] += e.movementX; FPS.look[1] += e.movementY; } });
document.addEventListener('pointerlockchange', () => { FPS.mouse = document.pointerLockElement === cv; if (FPS.on && !FPS.mouse) FPS.mouseDown = false; });
// touch: the left half of the screen is a stick to walk with, the right half drags to look
addEventListener('touchstart', e => {
  if (!FPS.on || e.target !== cv) return;
  e.stopImmediatePropagation(); e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && !FPS.stick) FPS.stick = { id: t.identifier, x0: t.clientX, y0: t.clientY, dx: 0, dy: 0 };
    else if (!FPS.lookTouch) FPS.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
  }
}, { capture: true, passive: false });
addEventListener('touchmove', e => {
  if (!FPS.on) return;
  for (const t of e.changedTouches) {
    if (FPS.stick && t.identifier === FPS.stick.id) { FPS.stick.dx = clamp((t.clientX - FPS.stick.x0) / 50, -1, 1); FPS.stick.dy = clamp((t.clientY - FPS.stick.y0) / 50, -1, 1); }
    if (FPS.lookTouch && t.identifier === FPS.lookTouch.id) { FPS.look[0] += (t.clientX - FPS.lookTouch.x) * 1.6; FPS.look[1] += (t.clientY - FPS.lookTouch.y) * 1.6; FPS.lookTouch.x = t.clientX; FPS.lookTouch.y = t.clientY; }
  }
  if (e.target === cv) e.preventDefault();
}, { capture: true, passive: false });
const fpsTouchEnd = e => {
  if (!FPS.on) return;
  for (const t of e.changedTouches) {
    if (FPS.stick && t.identifier === FPS.stick.id) FPS.stick = null;
    if (FPS.lookTouch && t.identifier === FPS.lookTouch.id) FPS.lookTouch = null;
  }
};
addEventListener('touchend', fpsTouchEnd, true); addEventListener('touchcancel', fpsTouchEnd, true);

// the buttons
$('fpsBtn').addEventListener('click', fpsOpen);
$('fpsBack').addEventListener('click', fpsCloseCard);
$('fpsPlay').addEventListener('click', fpsStart);
$('fpsNick').addEventListener('keydown', e => { if (e.key === 'Enter') fpsStart(); });
$('fpsResume').addEventListener('click', () => fpsSetMenu(false));
$('fpsLeave').addEventListener('click', fpsStop);
$('fpsCard').addEventListener('keydown', e => { if (e.key === 'Escape') fpsCloseCard(); });
for (const [id, fn] of [['fpsPadReload', fpsReload], ['fpsPadLantern', fpsLantern], ['fpsPadFlare', fpsFlare], ['fpsPadBell', fpsBell], ['fpsPadMenu', () => fpsSetMenu(true)], ['fpsPadBoard', () => { FPS.board = !FPS.board; }]]) {
  $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
}
$('fpsPadFire').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); FPS.touchFire = true; });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('fpsPadFire').addEventListener(ev, () => { FPS.touchFire = false; });
// leaving the page: off the island
addEventListener('pagehide', () => { if (FPS.on && NET.room) NET.room.presence({ fps: null }).catch(() => {}); });
