// Freebooters' Sea: combat at sea. The cutter's four swivel guns, and the Mooncussers' black sloops that sail the Wide
// Water looking for her. All of it hangs off the open sea's stage (src/fbsail.js) through fbHook('sail', ...).
//
// The swivel guns. Four little bronze guns on iron posts in the cutter's rails, two a side (FAG: one on each bow, one on
// each quarter), drawn on deck in the deck's own frame (src/gwsail.js GW3.DG, local u across and v along her). Use at
// one to man it: you stand behind it and your view is its aim, held to its arc over the rail (FAC.ARC each way from
// square off her side, and FAC.ELEV up and down), and a ring on the water shows where a ball would fall. Fire (the
// mouse, the trigger, the fire button) and it goes off with a flash and a cloud of smoke; the ball flies out over the
// sea and falls under gravity, carrying her own way with it, and lands in a splash or holes whatever it strikes. Each
// gun takes FAC.RELOAD seconds to load again. Use again (or go down) and you let go of it. With a gun manned your own
// weapon is put away (fbNoGun) and your move keys do nothing: you're at the gun.
//
// The Mooncusser sloops. Small single-masted sloops, tarred black, black sails, a green lantern at the stern (the old
// wreckers' false light), sailing the fixed sea on their own: FAC.N (two, and one more for each more of you, up to
// four) at a time, each one more turned up far away some minutes after one goes down. Each one:
//  - patrols, sailing from one far point of the sea to the next, keeping off the islands and the rocks (roughly: they
//    look ahead and bear away, and are pushed off if they get on) and out of Saltcote's waters;
//  - sees the cutter inside FAC.SEE and gives chase, never faster than FAC.VMAX (well under what the cutter makes with
//    her sail up: she can always run, and her own sailing is never touched), and gives it up if she gets well away;
//  - comes up alongside, a few dozen metres off her beam, and fires a broadside when she bears (three balls, aimed
//    with a gunner's eye for the range, and a fair spread). A ball that strikes the cutter stoves a plank in, as a
//    rock does (gwsStove): a hole to patch;
//  - now and then, lying close alongside, sends boarders over: the drowned come up out of the water on that side and
//    in over the rail, as the drowned do anyway out there (src/gwsail.js gwsSpawn);
//  - has FAC.HP planks; each ball of yours that strikes her hull stoves one in. With none left she lists and goes down
//    by the stern, and what she carried floats: a strongbox, a cask of brandy, her lantern. Bring the cutter alongside
//    and Use at the rail nearest to haul it in: straight into the hold (fbStowKind).
//
// Together it's host-authoritative. The host (or you alone) sails the sloops, flies the cannonballs and works out what
// they hit; joined players ask with raidAsk ('man' i, 'aim' [i, yaw, pitch] a few times a second while it changes,
// 'fire' [i, yaw, pitch], 'unman' i, 'haul' id). The word goes in the sea stage's word (pack/apply, 'fa' keys): fas
// the sloops, fag the guns (who has each, its aim, its reload), fal what's floating, fae the last few things that
// happened (a gun fired, a broadside, a hit, a sloop gone down) for every screen to see and hear; a joined screen
// flies the balls itself from those, for the look of it, and sails the sloops on between the host's words.
// The sloops and what's floating are the session's (FA, kept between stages, fresh for each session: FB.sid), not the
// stage's, so they're where they were when you come back aboard.
//
// For the other parts (voyages): fbSloopSpawn(x, y, opts) (hosting or alone: a sloop at x, y in the sea's frame;
// opts.quarry, anything, marks her as a voyage's quarry, shown gold on the strip; opts.loot, a kind or a list of kinds,
// what floats when she goes down; opts.hp, opts.n her name, opts.chase to come straight for the cutter; returns her).
// She doesn't count toward the sea's own few and isn't replaced. When any sloop goes down: fbEvent('sunk', text,
// [id, quarry, x, y, loot]), heard everywhere as fbOn('sunk', cb) with that list. fbSloops() is the list of them.
// For tests: fbGunsDebug() (a sloop near the ship, chasing), fbGunsDebug('alongside'), fbGunsDebug('man', i),
// fbGunsDebug('sink'), fbGunsDebug('float').
// Hooks in shared files, each marked [fbsea]: src/fps.js (fpsShoot: fire the gun you've manned, fagShoot; your move
// keys held while you're at one, fagPin), src/fbsea.js (fbNoGun: no weapon in your hands at a gun).

const FAC = {
  ARC: 1.25, ELEV: [-0.14, 0.5], RELOAD: 3.5, SPEED: 72, GRAV: 9.8, R: 0.14,
  SEE: 400, LOSE: 760, VMAX: 13, VPAT: 6.5, TURN: 0.42, HP: 5, SINK: 16, FLOAT_T: 420, HAUL: 10,
  BROAD: 11, BROAD_R: 150, AIM: 0.3, BOARD_T: [26, 44], RESPAWN: [150, 240], FAR: [700, 1300],
  LEN: 8.3, AFT: 7.7, BEAM: 2.3,
};
// the guns: where each stands in her rail (local v along her; side +1 starboard, -1 port) and what it's called
const FAG = [{ v: 5.0, s: 1, n: 'starboard bow' }, { v: 5.0, s: -1, n: 'port bow' }, { v: -5.6, s: 1, n: 'starboard quarter' }, { v: -5.6, s: -1, n: 'port quarter' }]
  .map(g => Object.assign(g, { u: g.s * (gwsHw(g.v) - 0.12), su: g.s * (gwsHw(g.v) - 0.85), a0: g.s * Math.PI / 2 }));
const FA_NAMES = ['the Black Nan', 'the Corpse Candle', 'the False Dawn', 'the Jack-a-Lantern', 'the Nightjar', 'the Gallows Bird', 'the Moonless', 'the Wisp', 'the Hollow Moon', 'the Drowned Light', 'the Lantern Jaw', 'the Pitch Kettle'];
// what a sloop carries, besides: her brandy and her green lantern
fbLootKind('brandy', { n: 'a cask of contraband brandy', N: 'brandy cask', v: 140, shape: 'crate', col: '#6a4a2a' });
fbLootKind('greenlamp', { n: 'a Mooncusser’s green lantern', N: 'green lantern', v: 80, shape: 'small', col: '#5a8a50', trinket: true });

// the session's (kept between stages): the sloops, what's floating, the balls in flight, what happened, my gun
var FA = { sid: null, sl: [], fl: [], balls: [], ev: [], eseq: 0, evSeen: -1, seq: 0, bseq: 0, spT: 0, init: false, my: -1, aimT: 0, sentAim: '', fx: [] };
function faSession() {
  if (FA.sid === FB.sid) return;
  Object.assign(FA, { sid: FB.sid, sl: [], fl: [], balls: [], ev: [], eseq: 0, evSeen: -1, seq: 0, bseq: 0, spT: 0, init: false, my: -1, fx: [] });
}
const faOn = () => typeof FB !== 'undefined' && FB.on && RAID.on && RAID_ORDER[RAID.stage] === 'fbsail' && !!(RAID.st && RAID.st.B);
const faHost = () => ZM.net !== 'client';
const faV = () => RAID.st.V || RAID.st.B;
// the sea's frame and the deck's (u across, v along her), at her pose V
function faToSea(V, u, v) { const c = Math.cos(V.h), s = Math.sin(V.h); return [V.x + u * c + v * s, V.y - u * s + v * c]; }
function faToDeck(V, x, y) { const c = Math.cos(V.h), s = Math.sin(V.h), dx = x - V.x, dy = y - V.y; return [dx * c - dy * s, dx * s + dy * c]; }
// a gun's pivot over the sea (its height over the water: the deck, the rail, the post)
const FA_PZ = () => FPSC.GROUND + GWS.D + 1.38;
// a sloop's half width at a along her (bow +)
const faHw = a => a > 2 ? FAC.BEAM * Math.sqrt(Math.max(0, 1 - Math.pow((a - 2) / (FAC.LEN - 2), 2))) : FAC.BEAM - Math.max(0, -a - 4) * 0.08;
// is (x, y, z) in her hull?
function faInSloop(s, x, y, z) {
  if (z > 2.4 || z < -1.5) return false;
  const dx = x - s.x, dy = y - s.y, a = dx * Math.sin(s.h) + dy * Math.cos(s.h), c = dx * Math.cos(s.h) - dy * Math.sin(s.h);
  return a < FAC.LEN && a > -FAC.AFT && Math.abs(c) < faHw(a) + FAC.R + 0.15;
}
const faSnd = (x, y) => { const V = faV(), d = Math.hypot(x - V.x, y - V.y); return { d, pan: gwsPan(x, y), vol: clamp(1 - d / 800, 0.06, 1) }; };
function faBoom(x, y, k) { try { if (soundOff()) return; const o = faSnd(x, y); if (!sfxPlay('cannon', { vol: o.vol * (k || 1), pan: o.pan, vary: 0.15 })) sfxCannon(); } catch (e) {} }
function faSplashSnd(x, y) { try { if (soundOff()) return; const o = faSnd(x, y); sfxSplash(o.pan, o.vol); } catch (e) {} }
function faCrackSnd(x, y) { try { if (soundOff()) return; const o = faSnd(x, y); if (!sfxPlay('debris', { vol: o.vol, pan: o.pan })) sfxSmash(o.vol); } catch (e) {} }

// ---------- the sloops (hosting or alone) ----------
const faCount = () => 2 + Math.min(2, Math.max(0, (ZM.hum || []).length - 1));
function faInSea(x, y, m) { const [x0, x1, y0, y1] = FBS.SEA; return x > x0 + m && x < x1 - m && y > y0 + m && y < y1 - m; }
function faClear(x, y, r) { const sea = fbSea(); return !FB_ISLES.some(I => Math.hypot(I.x - x, I.y - y) < I.r + r) && !sea.rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r * 0.4); }
// somewhere out on the open sea, clear of land, between lo and hi metres from (x, y) and well off Saltcote
function faFarSpot(x, y, lo, hi) {
  const P = FB_ISLES[0];
  for (let n = 0; n < 400; n++) {
    const a = Math.random() * 6.283, d = lo + Math.random() * (hi - lo), px = x + Math.sin(a) * d, py = y + Math.cos(a) * d;
    if (faInSea(px, py, 120) && Math.hypot(px - P.x, py - P.y) > 600 && faClear(px, py, 40)) return [px, py];
  }
  return [clamp(x, FBS.SEA[0] + 200, FBS.SEA[1] - 200), FBS.SEA[3] - 300];
}
function fbSloopSpawn(x, y, opts) {
  if (ZM.net === 'client' || !(typeof FB !== 'undefined' && FB.on)) return null;
  faSession(); opts = opts || {};
  const used = new Set(FA.sl.map(s => s.n)), names = FA_NAMES.filter(n => !used.has(n));
  const loot = opts.loot ? [].concat(opts.loot).filter(k => FB_LOOT[k]) : null;
  const s = { id: ++FA.seq, x: +x || 0, y: +y || 0, h: Math.random() * 6.283, v: FAC.VPAT, hp: opts.hp | 0 || FAC.HP, max: 0, st: opts.chase ? 1 : 0, sinkT: 0, n: opts.n || names[(Math.random() * names.length) | 0] || 'a black sloop',
    q: opts.quarry != null ? opts.quarry : null, loot, extra: !!opts.extra || opts.quarry != null || !!opts.loot || !!opts.debug, wp: null, wpT: 0, fireT: 4 + Math.random() * 4, bdT: FAC.BOARD_T[0] + Math.random() * 10, loseT: 0, side: 1, floated: false, shots: 0, roll: 0 };
  s.max = s.hp;
  if (opts.h != null) s.h = +opts.h;
  FA.sl.push(s);
  return s;
}
const fbSloops = () => FA.sl;
// (hosting) keep the sea's few on it: all of them at first, far off; one more some minutes after one goes down
function faStock(dt) {
  const B = RAID.st.B, own = FA.sl.filter(s => !s.extra && s.st < 2).length, N = faCount();
  if (!FA.init) { FA.init = true; for (let i = own; i < N; i++) { const [x, y] = faFarSpot(B.x, B.y, FAC.FAR[0], FAC.FAR[1]); fbSloopSpawn(x, y); } FA.spT = FAC.RESPAWN[0]; return; }
  if (own >= N) { FA.spT = Math.max(FA.spT, 30); return; }
  FA.spT -= dt;
  if (FA.spT <= 0) { const [x, y] = faFarSpot(B.x, B.y, FAC.FAR[0] + 200, FAC.FAR[1] + 300); fbSloopSpawn(x, y); FA.spT = FAC.RESPAWN[0] + Math.random() * (FAC.RESPAWN[1] - FAC.RESPAWN[0]); }
}
// (hosting) a new far point of the sea to make for
function faWaypoint(s) { const [x, y] = faFarSpot(s.x, s.y, 400, 1100); s.wp = [x, y]; s.wpT = 90 + Math.random() * 60; }
// (hosting) her helm: a heading to make for, bent away from land and the rocks ahead, Saltcote and the sea's edge
function faSteer(s, want) {
  let gx = Math.sin(want), gy = Math.cos(want);
  const sea = fbSea(), ax = s.x + Math.sin(s.h) * 30, ay = s.y + Math.cos(s.h) * 30;
  for (const I of FB_ISLES) {
    const d = Math.hypot(ax - I.x, ay - I.y), R = I.r + 70 + (I.port ? 300 : 0);
    if (d < R) { const k = (R - d) / R * 3, nx = (ax - I.x) / (d || 1), ny = (ay - I.y) / (d || 1); gx += nx * k; gy += ny * k; }
  }
  for (const r of sea.rocks) {
    if (Math.abs(r.x - ax) > 50 || Math.abs(r.y - ay) > 50) continue;
    const d = Math.hypot(ax - r.x, ay - r.y), R = r.r + 26; if (d < R) { const k = (R - d) / R * 2.2; gx += (ax - r.x) / (d || 1) * k; gy += (ay - r.y) / (d || 1) * k; }
  }
  if (!faInSea(s.x, s.y, 80)) { const [x0, x1, y0, y1] = FBS.SEA; gx += ((x0 + x1) / 2 - s.x) / 400; gy += ((y0 + y1) / 2 - s.y) / 400; }
  return bearingOf(gx, gy);
}
// (hosting) pushed off any land or rock she's on, and off the cutter and the other sloops (the cutter never moves for her)
function faPush(s, B) {
  const sea = fbSea();
  for (const I of FB_ISLES) { const d = Math.hypot(s.x - I.x, s.y - I.y), R = I.r + 6; if (d < R) { s.x = I.x + (s.x - I.x) / (d || 1) * R; s.y = I.y + (s.y - I.y) / (d || 1) * R; s.v = Math.min(s.v, 3); } }
  for (const r of sea.rocks) { if (Math.abs(r.x - s.x) > 30 || Math.abs(r.y - s.y) > 30) continue; const d = Math.hypot(s.x - r.x, s.y - r.y), R = r.r + 3.5; if (d < R) { s.x = r.x + (s.x - r.x) / (d || 1) * R; s.y = r.y + (s.y - r.y) / (d || 1) * R; s.v = Math.min(s.v, 3); } }
  if (B) { const [u, v] = faToDeck(B, s.x, s.y); if (Math.abs(v) < 14 && Math.abs(u) < 7.5) { const [x, y] = faToSea(B, (u >= 0 ? 1 : -1) * 7.5, v); s.x = x; s.y = y; } }
  for (const o of FA.sl) { if (o === s) continue; const d = Math.hypot(s.x - o.x, s.y - o.y); if (d < 18 && d > 0.01) { const k = (18 - d) / 2; s.x += (s.x - o.x) / d * k; s.y += (s.y - o.y) / d * k; } }
}
function faSloopTick(s, dt, B, S) {
  if (s.st === 2) {
    s.sinkT += dt; s.v = Math.max(0, s.v - dt * 2); s.x += Math.sin(s.h) * s.v * dt; s.y += Math.cos(s.h) * s.v * dt;
    if (s.sinkT > 2.5 && !s.floated) faFloatLoot(s);
    return;
  }
  const d = Math.hypot(B.x - s.x, B.y - s.y), live = S.ph === 'sail';
  // (seeing her, giving up on her)
  if (s.st === 0 && live && d < FAC.SEE) { s.st = 1; s.loseT = 0; faEv(['k', s.id]); faSpotted(s); }
  if (s.st === 1) { if (d > FAC.LOSE || !live) s.loseT += dt; else s.loseT = 0; if (s.loseT > 20) { s.st = 0; faWaypoint(s); } }
  let want, vT;
  if (s.st === 0) {
    if (!s.wp || (s.wpT -= dt) <= 0 || Math.hypot(s.wp[0] - s.x, s.wp[1] - s.y) < 60) faWaypoint(s);
    want = bearingOf(s.wp[0] - s.x, s.wp[1] - s.y); vT = FAC.VPAT;
  } else {
    // alongside her, on whichever side of her we're on now, a few dozen metres off her beam
    const [u] = faToDeck(B, s.x, s.y); if (d > 120 || Math.abs(u) > 12) s.side = u >= 0 ? 1 : -1;
    const fx = Math.sin(B.h), fy = Math.cos(B.h), px = Math.cos(B.h) * s.side, py = -Math.sin(B.h) * s.side, off = 34;
    if (d > 170) {
      const t = d / Math.max(6, FAC.VMAX), tx = B.x + fx * B.v * t * 0.6 + px * off, ty = B.y + fy * B.v * t * 0.6 + py * off;
      want = bearingOf(tx - s.x, ty - s.y); vT = FAC.VMAX;
    } else {
      const tx = B.x + px * off + fx * 3, ty = B.y + py * off + fy * 3, e = Math.hypot(tx - s.x, ty - s.y), ahead = (tx - s.x) * fx + (ty - s.y) * fy;
      want = e > 26 ? bearingOf(tx - s.x, ty - s.y) : wrapPi(B.h + clamp(((tx - s.x) * px + (ty - s.y) * py) * 0.02, -0.4, 0.4));
      vT = clamp(B.v + clamp(ahead * 0.25, -4, 6), 2, FAC.VMAX);
    }
  }
  const head = faSteer(s, want), da = angDiff(head, s.h);
  s.h = wrapPi(s.h + clamp(da, -FAC.TURN * dt, FAC.TURN * dt));
  s.v += clamp(vT - s.v, -2.2 * dt, 1.4 * dt);
  s.x += Math.sin(s.h) * s.v * dt; s.y += Math.cos(s.h) * s.v * dt;
  s.roll += (clamp(-da, -0.5, 0.5) * 0.25 - s.roll) * Math.min(1, dt);
  faPush(s, B);
  if (s.st !== 1 || !live) return;
  // a broadside, when she bears and the guns are loaded
  s.fireT -= dt;
  const rb = angDiff(bearingOf(B.x - s.x, B.y - s.y), s.h);
  if (s.fireT <= 0 && d < FAC.BROAD_R && Math.abs(Math.abs(rb) - Math.PI / 2) < 0.55) { s.fireT = FAC.BROAD + Math.random() * 3; faBroadside(s, B, rb > 0 ? 1 : -1, d); }
  // boarders: close alongside, now and then
  s.bdT -= dt;
  if (s.bdT <= 0 && d < 55) { s.bdT = FAC.BOARD_T[0] + Math.random() * (FAC.BOARD_T[1] - FAC.BOARD_T[0]); faBoarders(s, B); }
}
// (hosting) three balls from her side at the cutter, a quarter second apart, laid for the range with a gunner's spread
function faBroadside(s, B, side, d) {
  for (let k = 0; k < 3; k++) {
    s.shots = (s.shots | 0) + 1;
    setTimeout(() => {
      if (!faOn() || s.st === 2 || !FA.sl.includes(s)) return;
      const Bn = RAID.st.B, al = (k - 1) * 3.2, gx = s.x + Math.sin(s.h) * al + Math.cos(s.h) * side * 2.4, gy = s.y + Math.cos(s.h) * al - Math.sin(s.h) * side * 2.4, gz = 1.8;
      // (where she'll be when it gets there, near enough; aimed somewhere along her length; most go over or fall short)
      const R0 = Math.hypot(Bn.x - gx, Bn.y - gy), t = R0 / (FAC.SPEED * 0.85), along = (Math.random() - 0.5) * 12;
      const tx = Bn.x + Math.sin(Bn.h) * (Bn.v * t + along), ty = Bn.y + Math.cos(Bn.h) * (Bn.v * t + along), R = Math.hypot(tx - gx, ty - gy);
      const sp = FAC.SPEED * 0.85, miss = Math.random() > FAC.AIM * clamp(1.2 - R / 160, 0.35, 1), el = 0.5 * Math.asin(clamp(FAC.GRAV * R / (sp * sp), 0, 1)) + (Math.random() - 0.5) * 0.012 + 0.004 + (miss ? (Math.random() < 0.5 ? -0.07 - Math.random() * 0.06 : 0.05 + Math.random() * 0.05) : 0), yaw = bearingOf(tx - gx, ty - gy) + (Math.random() - 0.5) * 0.05;
      const vx = Math.sin(yaw) * Math.cos(el) * sp + Math.sin(s.h) * s.v, vy = Math.cos(yaw) * Math.cos(el) * sp + Math.cos(s.h) * s.v, vz = Math.sin(el) * sp;
      faShot('b', gx, gy, gz, vx, vy, vz, '', s.id);
    }, k * 260 + Math.random() * 80);
  }
}
// (hosting) a ball away: in flight here, and the word for everyone
function faShot(kind, x, y, z, vx, vy, vz, by, from) {
  const id = ++FA.bseq, r = v => Math.round(v * 10) / 10;
  FA.balls.push({ id, x, y, z, vx, vy, vz, by, from, kind, t: 0 });
  faEv([kind, id, r(x), r(y), r(z), r(vx), r(vy), r(vz), by || '', from]);
  faShotFx(kind, x, y, z, vx, vy, from, by);
}
// (hosting) the drowned come up out of the water on her side and in over the rail, as they do anyway out there
function faBoarders(s, B) {
  const [u] = faToDeck(B, s.x, s.y), side = u >= 0 ? 1 : -1, n = 1 + (Math.random() < 0.5 ? 1 : 0) + ((ZM.hum || []).length > 2 ? 1 : 0);
  let sent = 0;
  for (let i = 0; i < n; i++) {
    const W = ZM.windows.filter(w => w.gws && w.q.length < 2 && w.nx === side); if (!W.length) break;
    const w = W[(Math.random() * W.length) | 0], out = 3 + Math.random() * 2, along = (Math.random() - 0.5) * 2, sx = w.x + w.nx * out, sy = w.y + along;
    const kind = Math.random() < 0.3 ? 'run' : 'jog', np = Math.max(1, ZM.hum.length), hp = zmHp(RAIDC.ROUND + 2) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (np - 1)), zn = ++ZM.zc;
    const z = { drowned: true, zm: true, zn, id: 'z' + zn.toString(36), n: 'a Mooncusser', x: sx, y: sy, jz: -1.2, fl: 0, zpad: 0.27, hp, max: hp, kind, sp: kind === 'run' ? 5.0 + Math.random() * 0.5 : 3.2 + Math.random() * 0.4,
      st: 'out', win: w, t: 0, ph: Math.random() * 6, hitT: 0, atk: 0.6, swing: -1, stuck: 0, h: bearingOf(w.x - sx, w.y - sy), seed: (Math.random() * 1e6) | 0, rise: 1, hist: [], raid: true };
    w.q.push(z); ZM.z.push(z); FPS.drowned = ZM.z; sent++;
  }
  if (sent) { faEv(['p', s.id, side]); faHear(['p', s.id, side]); }
}
// (hosting) gone down: what she carried, floating where she went
function faFloatLoot(s) {
  s.floated = true;
  const L = s.loot && s.loot.length ? s.loot.slice() : [Math.random() < 0.4 ? 'strongbox' : 'brandy'].concat(Math.random() < 0.55 ? ['greenlamp'] : [], Math.random() < 0.3 ? ['brandy'] : []);
  L.forEach((k, i) => { const a = Math.random() * 6.283, d = 3 + i * 3 + Math.random() * 3; FA.fl.push({ id: ++FA.seq, x: s.x + Math.sin(a) * d, y: s.y + Math.cos(a) * d, k, t: 0, ph: Math.random() * 6 }); });
  fbEvent('sunk', `${s.n[0].toUpperCase() + s.n.slice(1)} goes down. What she carried is floating: bring her alongside and haul it in from the rail.`, [s.id, s.q, Math.round(s.x), Math.round(s.y), L]);
}
// (hosting) a ball's flight, a step: gravity, and what it strikes (a sloop's hull, the cutter's, or the sea)
function faBallHost(b, dt, B) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy, b.vz) * dt / 1.2)), h = dt / n;
  for (let i = 0; i < n; i++) {
    b.vz -= FAC.GRAV * h; b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h; b.t += h;
    if (b.kind === 'g') {
      for (const s of FA.sl) if (s.st < 2 && faInSloop(s, b.x, b.y, b.z)) { faHitSloop(s, b); return false; }
    } else if (b.t > 0.15) {
      const [u, v] = faToDeck(B, b.x, b.y), zt = b.z - FPSC.GROUND;
      if (v > GWS.STERN - 0.2 && v < GWS.BOW + 0.2 && Math.abs(u) < gwsHw(v) + 0.25 && zt < GWS.D + 1.0 && zt > -2.5) { faHitCutter(b, u, v); return false; }
    }
    if (b.z <= 0) { faEv(['w', b.id, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10]); faSplashFx(b.x, b.y, 1); return false; }
  }
  return b.t < 12;
}
function faHitSloop(s, b) {
  s.hp--; const r = v => Math.round(v * 10) / 10;
  faEv(['h', b.id, r(b.x), r(b.y), r(b.z), s.id, s.hp, b.by || '']); faHitFx(b.x, b.y, b.z, s, b.by);
  if (s.hp <= 0 && s.st < 2) { s.st = 2; s.sinkT = 0; s.list = (Math.random() < 0.5 ? -1 : 1); faEv(['s', s.id]); faSinkFx(s); }
  else if (s.st === 0) { s.st = 1; s.loseT = 0; }
}
function faHitCutter(b, u, v) {
  const S = RAID.st;
  gwsStove(v, u >= 0 ? 1 : -1);
  faEv(['c', b.id, Math.round(u * 10) / 10, Math.round(v * 10) / 10, (S.hitN | 0)]);
  faCutterFx(u, v);
}
function faEv(e) { e.unshift(++FA.eseq); FA.ev.push(e); if (FA.ev.length > 28) FA.ev.shift(); }

// ---------- the guns ----------
const faGuns = () => RAID.st.fa || (RAID.st.fa = FAG.map(g => ({ by: '', a: g.a0, p: 0.06, rl: 0 })));
// clamp an aim to a gun's arc
function faClampAim(i, a, p) { const g = FAG[i]; return [wrapPi(g.a0 + clamp(angDiff(a, g.a0), -FAC.ARC, FAC.ARC)), clamp(p, FAC.ELEV[0], FAC.ELEV[1])]; }
// a ball from gun i at aim a, p (deck bearing, elevation), with her way on: [x, y, z, vx, vy, vz] in the sea's frame
function faMuzzle(i, a, p, V) {
  const g = FAG[i], du = Math.sin(a) * Math.cos(p), dv = Math.cos(a) * Math.cos(p), dz = Math.sin(p);
  const [x, y] = faToSea(V, g.u + du * 0.8, g.v + dv * 0.8), sh = bearingOf(du, dv) + V.h, hc = Math.hypot(du, dv);
  return [x, y, FA_PZ() + dz * 0.8, Math.sin(sh) * hc * FAC.SPEED + Math.sin(V.h) * V.v, Math.cos(sh) * hc * FAC.SPEED + Math.cos(V.h) * V.v, dz * FAC.SPEED];
}
// (hosting) fire gun i for sid, if it's theirs and loaded
function faFire(sid, i, a, p) {
  const G = faGuns()[i], S = RAID.st; if (!G || G.by !== sid || G.rl > 0 || S.ph === 'sunk') return;
  if (a != null) { [G.a, G.p] = faClampAim(i, +a || 0, +p || 0); }
  G.rl = FAC.RELOAD;
  const m = faMuzzle(i, G.a, G.p, S.B);
  faShot('g', m[0], m[1], m[2], m[3], m[4], m[5], sid, i);
}
// the gun I'm on: man it, let it go
function faMan(i) {
  const S = RAID.st; if (FPS.helm) gwsLetGo();
  FA.my = i; FA.sentAim = ''; FA.aimT = 0; FA.wantT = 1.2;
  const m = FPS.me, g = FAG[i], G = faGuns()[i]; m.h = G.a; m.p = clamp(G.p + 0.1, FAC.ELEV[0], FAC.ELEV[1]);
  raidAsk('man', i); void S;
  fpsFeed(`You man the ${g.n} gun: look to aim, fire to fire. It takes ${FAC.RELOAD} s to load again. Use to let go.`);
}
function faUnman(quiet) { const i = FA.my; if (i < 0) return; FA.my = -1; raidAsk('unman', i); if (!quiet) fpsFeed('You let go of the gun.'); }
// (src/fps.js fpsShoot) at a gun, fire it instead of your own weapon
function fagShoot() {
  if (FA.my < 0 || !faOn()) return false;
  const i = FA.my, G = faGuns()[i], m = FPS.me;
  if (G.rl > 0 || FA.pend > 0) return true;
  if (zmIsDown() || m.dead > 0) return true;
  const [a, p] = faClampAim(i, m.h, m.p - FA_DIP);
  if (ZM.net === 'client') {
    // (joined: the flash and the ball here at once, the host's word for where it really goes)
    G.rl = FAC.RELOAD; FA.pend = 0.5;
    const mz = faMuzzle(i, a, p, faV());
    FA.balls.push({ id: 'L' + (++FA.bseq), x: mz[0], y: mz[1], z: mz[2], vx: mz[3], vy: mz[4], vz: mz[5], by: m.id, from: i, kind: 'g', t: 0, mine: true });
    faShotFx('g', mz[0], mz[1], mz[2], mz[3], mz[4], i, m.id);
    raidAsk('fire', [i, Math.round(a * 1e3) / 1e3, Math.round(p * 1e3) / 1e3]);
  } else { G.a = a; G.p = p; faFire(m.id, i, a, p); }
  FPS.recoil = 1.2; if (typeof padRumble === 'function') padRumble(0.7, 0.6, 200);
  return true;
}
// (a gun's aim is your eye's: the barrel sits just under it, near enough; the ring shows where a ball would fall)
const FA_DIP = 0;
// where the gunner stands: behind the gun, the way it's laid (on her deck, clear of the rail)
function faStand(i, a) { const g = FAG[i], v = g.v - Math.cos(a) * 1.4, u = g.u - Math.sin(a) * 1.4, hw = gwsHw(v) - 0.45; return [clamp(u, -hw, hw), v]; }
// (src/fps.js) at a gun, your move keys move nothing
const fagPin = () => FA.my >= 0 && faOn();
const fagManning = () => FA.my >= 0 && faOn();

// ---------- the hooks ----------
fbHook('sail', {
  enter() { faSession(); FA.my = -1; FA.balls = []; FA.fx = []; FA.pend = 0; faGuns(); },
  exit() { if (FA.my >= 0) FA.my = -1; FA.balls = []; FA.fx = []; FA3.on = false; },
  tick(dt) {
    faSession();
    const S = RAID.st, B = S.B; if (!B) return;
    const G = faGuns();
    for (const g of G) { if (g.rl > 0) g.rl = Math.max(0, g.rl - dt); if (g.by && (!ZM.hum.some(h => h[0] === g.by) || gwsIsDown(g.by))) g.by = ''; }
    faStock(dt);
    for (const s of FA.sl) faSloopTick(s, dt, B, S);
    FA.sl = FA.sl.filter(s => !(s.st === 2 && s.sinkT > FAC.SINK));
    FA.balls = FA.balls.filter(b => faBallHost(b, dt, B));
    for (const f of FA.fl) { f.t += dt; f.x += Math.sin(f.ph + f.t * 0.05) * 0.15 * dt; f.y += 0.1 * dt; }
    FA.fl = FA.fl.filter(f => f.t < FAC.FLOAT_T);
  },
  q(sid, k, a) {
    const G = faGuns();
    if (k === 'man') { const g = G[a | 0]; if (g && (!g.by || g.by === sid)) { for (const o of G) if (o.by === sid) o.by = ''; g.by = sid; } return true; }
    if (k === 'unman') { const g = G[a | 0]; if (g && g.by === sid) g.by = ''; return true; }
    if (k === 'aim') { if (Array.isArray(a)) { const g = G[a[0] | 0]; if (g && g.by === sid) [g.a, g.p] = faClampAim(a[0] | 0, +a[1] || 0, +a[2] || 0); } return true; }
    if (k === 'fire') { if (Array.isArray(a)) faFire(sid, a[0] | 0, a[1], a[2]); return true; }
    if (k === 'haul') { const i = FA.fl.findIndex(f => f.id === (a | 0)); if (i >= 0) { const f = FA.fl.splice(i, 1)[0]; fbStowKind(f.k, sid); faEv(['l', f.id]); } return true; }
    return null;
  },
  pack(o) {
    const r = v => Math.round(v * 10) / 10;
    o.fas = FA.sl.map(s => [s.id, r(s.x), r(s.y), Math.round(s.h * 1e3) / 1e3, r(s.v), s.hp, s.max, s.st, r(s.sinkT), s.q != null ? 1 : 0, s.n, s.list | 0, Math.round(s.roll * 100) / 100]);
    o.fag = faGuns().map(g => [g.by, Math.round(g.a * 1e3) / 1e3, Math.round(g.p * 1e3) / 1e3, r(g.rl)]);
    o.fal = FA.fl.map(f => [f.id, r(f.x), r(f.y), f.k]);
    o.fae = FA.ev.slice(-20);
  },
  apply(o) {
    faSession();
    if (Array.isArray(o.fas)) {
      const old = new Map(FA.sl.map(s => [s.id, s]));
      FA.sl = o.fas.filter(Array.isArray).map(a => {
        const id = a[0] | 0, s = old.get(id) || { id, x: +a[1], y: +a[2], h: +a[3], roll: 0 };
        Object.assign(s, { gx: +a[1] || 0, gy: +a[2] || 0, gh: +a[3] || 0, v: +a[4] || 0, hp: a[5] | 0, max: a[6] | 0, st: a[7] | 0, q: a[9] ? 1 : null, n: String(a[10] || 'a black sloop').slice(0, 40), list: a[11] | 0, groll: +a[12] || 0 });
        if (s.st === 2) { if (!(s.sinkT > 0) || Math.abs(s.sinkT - (+a[8] || 0)) > 1.5) s.sinkT = +a[8] || 0; } else s.sinkT = 0;
        return s;
      });
    }
    if (Array.isArray(o.fag)) { const G = faGuns(); o.fag.forEach((a, i) => { const g = G[i]; if (!g || !Array.isArray(a)) return; g.by = String(a[0] || ''); if (FA.my !== i || g.by !== FPS.me.id) { g.a = +a[1] || 0; g.p = +a[2] || 0; } if (!(FA.pend > 0)) g.rl = +a[3] || 0; });
      // (the host has it as someone else's, or not mine after all: let go)
      if (FA.my >= 0 && !(FA.wantT > 0) && G[FA.my].by !== FPS.me.id) { FA.my = -1; fpsFeed('Someone else has that gun.'); } }
    if (Array.isArray(o.fal)) FA.fl = o.fal.filter(Array.isArray).map(a => { const f = FA.fl.find(q => q.id === (a[0] | 0)); return Object.assign(f || { ph: Math.random() * 6, t: 0 }, { id: a[0] | 0, x: +a[1] || 0, y: +a[2] || 0, k: FB_LOOT[a[3]] ? a[3] : 'crate' }); }).filter(f => !(FA.hauled && FA.hauled[f.id]));
    if (Array.isArray(o.fae)) {
      if (FA.evSeen < 0) { FA.evSeen = 0; for (const e of o.fae) if (Array.isArray(e)) FA.evSeen = Math.max(FA.evSeen, e[0] | 0); }
      for (const e of o.fae) { if (!Array.isArray(e) || !((e[0] | 0) > FA.evSeen)) continue; FA.evSeen = e[0] | 0; faHear(e.slice(1)); }
    }
  },
  me(dt) {
    const S = RAID.st, m = FPS.me, V = faV(); if (!V) return;
    if (FA.wantT > 0) FA.wantT -= dt;
    if (FA.pend > 0) FA.pend -= dt;
    if (ZM.net === 'client') {
      // the sloops sailed on between the host's words, eased to them; the balls flown for the look of them
      for (const s of FA.sl) {
        if (s.st === 2) s.sinkT += dt;
        s.gx += Math.sin(s.gh) * s.v * dt; s.gy += Math.cos(s.gh) * s.v * dt;
        const k = Math.min(1, dt * 3); if (Math.hypot(s.gx - s.x, s.gy - s.y) > 40) { s.x = s.gx; s.y = s.gy; s.h = s.gh; }
        s.x += (s.gx - s.x) * k + Math.sin(s.h) * s.v * dt * (1 - k); s.y += (s.gy - s.y) * k + Math.cos(s.h) * s.v * dt * (1 - k); s.h = wrapPi(s.h + angDiff(s.gh, s.h) * k); s.roll += (s.groll - s.roll) * k;
      }
      const G = faGuns(); for (const g of G) if (g.rl > 0) g.rl = Math.max(0, g.rl - dt);
      FA.balls = FA.balls.filter(b => { const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy, b.vz) * dt / 2)), h = dt / n; for (let i = 0; i < n; i++) { b.vz -= FAC.GRAV * h; b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h; b.t += h; if (b.z <= 0) { faSplashFx(b.x, b.y, 1); return false; } } return b.t < 12; });
    }
    // at a gun: standing behind it, your view its aim, held to its arc; let go when you go down
    const alive = !(m.dead > 0) && !zmIsDown() && !ZM.over && S.ph !== 'sunk' && S.ph !== 'beach';
    if (FA.my >= 0 && !alive) faUnman(true);
    if (FA.my >= 0) {
      const i = FA.my, g = FAG[i], G = faGuns()[i], [x, y] = gwsW(...faStand(i, G.a));
      if (FPS.helm) gwsLetGo();
      m.x += (x - m.x) * Math.min(1, dt * 10); m.y += (y - m.y) * Math.min(1, dt * 10);
      const [a, p] = faClampAim(i, m.h, m.p); m.h = a; m.p = p;
      const [ga, gp] = faClampAim(i, m.h, m.p - FA_DIP); G.a = ga; G.p = gp;
      if (ZM.net === 'client') { FA.aimT -= dt; const key = `${ga.toFixed(2)},${gp.toFixed(2)}`; if (FA.aimT <= 0 && key !== FA.sentAim) { FA.aimT = 0.2; FA.sentAim = key; raidAsk('aim', [i, Math.round(ga * 1e3) / 1e3, Math.round(gp * 1e3) / 1e3]); } }
    }
    // the effects: smoke, splashes, flashes
    for (const f of FA.fx) f.t += dt;
  },
  consider(c) {
    const S = RAID.st; if (!S.B || S.ph === 'sunk') return;
    const D = GWS.D, m = FPS.me;
    // at a gun: Use lets go (right where you stand, so nothing else is nearer)
    if (FA.my >= 0) { c({ k: 'faman', i: FA.my }, m.x, m.y, D, 3, false); return; }
    FAG.forEach((g, i) => { const [x, y] = gwsW(g.su, g.v); c({ k: 'faman', i }, x, y, D, 1.3, false); });
    // something floating close alongside: haul it in from the rail nearest it
    const V = faV();
    for (const f of FA.fl) {
      const [u, v] = faToDeck(V, f.x, f.y); if (v < GWS.STERN - 4 || v > GWS.BOW + 4) continue;
      const vv = clamp(v, GWS.STERN + 1, GWS.BOW - 2), hw = gwsHw(vv); if (Math.abs(u) - hw > FAC.HAUL) continue;
      const [x, y] = gwsW((u >= 0 ? 1 : -1) * (hw - 0.6), vv); c({ k: 'fahaul', id: f.id, kind: f.k }, x, y, D, 2.6, false);
    }
  },
  prompt(o) {
    if (o.k === 'faman') {
      const G = faGuns()[o.i], g = FAG[o.i];
      if (FA.my === o.i) return { text: G.rl > 0 ? `Let go of the gun (loading: ${Math.ceil(G.rl)} s)` : 'Let go of the gun' };
      if (G.by && G.by !== FPS.me.id) return { text: `${gwsNick(G.by)} is on the ${g.n} gun` };
      return { text: `Man the ${g.n} swivel gun`, free: true };
    }
    if (o.k === 'fahaul') return { text: `Haul in ${fbLootOf(o.kind).n} (${fbLootOf(o.kind).v} sov)`, free: true };
    return null;
  },
  use(o) {
    if (o.k === 'faman') {
      if (FA.my === o.i) { faUnman(); return true; }
      const G = faGuns()[o.i]; if (G.by && G.by !== FPS.me.id) { zmSound('no'); return true; }
      faMan(o.i); return true;
    }
    if (o.k === 'fahaul') {
      raidAsk('haul', o.id);
      if (ZM.net === 'client') { FA.hauled = FA.hauled || {}; FA.hauled[o.id] = 1; FA.fl = FA.fl.filter(f => f.id !== o.id); }
      try { if (!soundOff()) { sfxSplash(0, 0.6); sfxPickup(); } } catch (e) {}
      return true;
    }
    return null;
  },
  b3(grp) { fa3dBuild(); },
  f3(dt) { fa3d(dt); },
  hud(phone, mono, fell) { faHud(phone, mono, fell); },
});

// ---------- what happened, on every screen (a joined one from the host's word; the host's straight off) ----------
function faHear(e) {
  const k = e[0];
  if (k === 'g' || k === 'b') {
    const [, id, x, y, z, vx, vy, vz, by, from] = e;
    if (k === 'g' && by === FPS.me.id) return;   // (mine: flown already)
    FA.balls.push({ id, x: +x, y: +y, z: +z, vx: +vx, vy: +vy, vz: +vz, by, from, kind: k, t: 0 });
    faShotFx(k, +x, +y, +z, +vx, +vy, from, by);
  } else if (k === 'h') { const [, id, x, y, z, sid, hp, by] = e; faKillBall(id, +x, +y); const s = FA.sl.find(q => q.id === sid); if (s) s.hp = hp; faHitFx(+x, +y, +z, s, by); }
  else if (k === 'c') { const [, id, u, v] = e; const [x, y] = faToSea(faV(), +u, +v); faKillBall(id, x, y); faCutterFx(+u, +v); }
  else if (k === 'w') { const [, id, x, y] = e; if (faKillBall(id, +x, +y)) faSplashFx(+x, +y, 1); }
  else if (k === 's') { const s = FA.sl.find(q => q.id === e[1]); if (s) { s.st = 2; faSinkFx(s); } }
  else if (k === 'k') { const s = FA.sl.find(q => q.id === e[1]); if (s) faSpotted(s); }
  else if (k === 'p') { const s = FA.sl.find(q => q.id === e[1]); fpsFeed(`${s ? s.n[0].toUpperCase() + s.n.slice(1) : 'The sloop'} sends boarders over: the drowned are coming up your ${e[2] > 0 ? 'starboard' : 'port'} side!`); ZM.banner = { text: 'Boarders!', t: 2.4, small: true, col: '#b8ffc8' }; }
}
// a ball's gone (struck something): the one with that id, or (one of mine, flown here) the nearest
function faKillBall(id, x, y) {
  let i = FA.balls.findIndex(b => b.id === id);
  if (i < 0) { let bd = 14; FA.balls.forEach((b, j) => { const d = Math.hypot(b.x - x, b.y - y); if (b.mine && d < bd) { bd = d; i = j; } }); }
  if (i < 0) return true;
  FA.balls.splice(i, 1); return true;
}
function faSpotted(s) {
  const V = faV(); if (!V) return;
  fpsFeed(`A black sloop is bearing down on you, ${fbsSide(V, s.x, s.y)}: ${s.n}, her green lantern lit. Man the guns!`);
  ZM.banner = { text: 'A Mooncusser', t: 3, sub: `${s.n}, ${fbsSide(V, s.x, s.y)}`, col: '#b8ffc8', small: true };
  try { if (!soundOff()) sfxPlay('mooncusser', { vol: 0.6, pan: gwsPan(s.x, s.y) }); } catch (e) {}
}
// on the host the word's heard as it's made (faEv only sends it): these play here too
function faShotFx(kind, x, y, z, vx, vy, from, by) {
  faBoom(x, y, kind === 'g' ? 1 : 0.85);
  faFx('flash', x, y, z, { s: kind === 'g' ? 3.2 : 4.5 });
  for (let k = 0; k < 4; k++) faFx('smoke', x + vx * 0.012 * k, y + vy * 0.012 * k, z, { s: 1.4 + k * 0.4, life: 3 + Math.random(), dx: vx * 0.01, dy: vy * 0.01 });
  if (kind === 'g') faGunFlash(from | 0);
}
function faSplashFx(x, y, k) { faFx('splash', x, y, 0, { s: 2.6 * (k || 1), life: 1.3 }); faFx('ring', x, y, 0.2, { s: 1.5, life: 2.2 }); faSplashSnd(x, y); }
function faHitFx(x, y, z, s, by) {
  faFx('flash', x, y, z, { s: 2.2, col: 0xffc080, life: 0.25 });
  for (let k = 0; k < 6; k++) faFx('chip', x, y, z, { s: 0.5, life: 1.1, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10, dz: 4 + Math.random() * 6 });
  faFx('smoke', x, y, z, { s: 2, life: 2.4 });
  faCrackSnd(x, y);
  if (by === FPS.me.id && s) { fpsFeed(s.hp > 0 ? `A hit! ${s.n[0].toUpperCase() + s.n.slice(1)} has ${s.hp} plank${s.hp === 1 ? '' : 's'} left.` : `A hit! ${s.n[0].toUpperCase() + s.n.slice(1)} is holed through and going down.`); }
}
function faCutterFx(u, v) {
  const V = faV(); if (!V) return; const [x, y] = faToSea(V, u, v), z = FPSC.GROUND + GWS.D + 0.4;
  faFx('flash', x, y, z, { s: 2.5, col: 0xffc080, life: 0.25 }); faFx('smoke', x, y, z, { s: 1.8, life: 2.2 });
  for (let k = 0; k < 6; k++) faFx('chip', x, y, z, { s: 0.45, life: 1.0, dx: (Math.random() - 0.5) * 6, dy: (Math.random() - 0.5) * 6, dz: 3 + Math.random() * 5 });
  ZM.banner = { text: 'A shot holed her', t: 2.6, sub: 'A plank stove in: patch the hole', col: '#ffd8a0' };
}
function faSinkFx(s) {
  try { if (!soundOff()) { sfxPlay('creak', { vol: 0.9, pan: gwsPan(s.x, s.y), rate: 0.7 }); faCrackSnd(s.x, s.y); } } catch (e) {}
  if (FA.sl.includes(s)) fpsFeed(`${s.n[0].toUpperCase() + s.n.slice(1)} is holed through: she’s listing, going down by the stern.`);
}

// =====================================================================================================================
// in 3D: the guns on deck (GW3.DG), the sloops, balls, floating loot and the smoke and splashes out on the sea (GW3.SG)
// =====================================================================================================================
const FA3 = { on: false };
// a sloop's hull: lofted from stations along her (a: bow +), a deck on top; three's -z is her bow
function faHullGeo() {
  const N = 18, pos = [], idx = [], st = [];
  for (let i = 0; i <= N; i++) { const a = -FAC.AFT + (FAC.LEN + FAC.AFT) * i / N, w = Math.max(0.05, faHw(a)), sheer = 1.15 + Math.max(0, a - 4) * 0.12 + Math.max(0, -a - 5) * 0.06; st.push([a, w, sheer]); }
  // each station: deck edge port, deck edge starboard, bilge port, bilge starboard, keel
  for (const [a, w, sh] of st) { const z = -a, kd = a > 6 ? -1.4 + (a - 6) * 0.5 : -1.5; pos.push(-w, sh, z, w, sh, z, -w * 0.72, -0.6, z, w * 0.72, -0.6, z, 0, kd, z); }
  const q = (a, b, c, d) => idx.push(a, b, c, a, c, d);
  for (let i = 0; i < N; i++) {
    const o = i * 5, p = (i + 1) * 5;
    q(o + 0, o + 2, p + 2, p + 0); q(o + 1, p + 1, p + 3, o + 3);   // (sides)
    q(o + 2, o + 4, p + 4, p + 2); q(o + 3, p + 3, p + 4, o + 4);   // (bottom)
  }
  // the transom
  q(0, 1, 3, 2); idx.push(2, 3, 4);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const dk = []; const di = [];
  for (const [a, w, sh] of st) dk.push(-w + 0.12, sh - 0.25, -a, w - 0.12, sh - 0.25, -a);
  for (let i = 0; i < N; i++) { const o = i * 2, p = (i + 1) * 2; di.push(o, o + 1, p + 1, o, p + 1, p); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dk, 3)); dg.setIndex(di); dg.computeVertexNormals();
  return { hull: g, deck: dg, st };
}
// a sail between corners (each [x, y, z]), as a flat fan
function faSailGeo(P) { const pos = []; for (const p of P) pos.push(...p); const idx = []; for (let i = 1; i < P.length - 1; i++) idx.push(0, i, i + 1); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
function faSloopMesh(s) {
  const G = new THREE.Group(), T = FA3.T, inner = new THREE.Group(); G.add(inner);
  inner.add(new THREE.Mesh(T.hull, T.tar)); inner.add(new THREE.Mesh(T.deck, T.deckM));
  // a rail along her, her mast, the boom and gaff, the bowsprit
  for (const s2 of [-1, 1]) for (let i = 1; i < T.st.length; i++) { const [a0, w0, h0] = T.st[i - 1], [a1, w1, h1] = T.st[i], L = Math.hypot(a1 - a0, (w1 - w0)); const r = new THREE.Mesh(T.railG, T.rail); r.scale.set(1, 1, L + 0.05); r.position.set(s2 * (w0 + w1) / 2, (h0 + h1) / 2 + 0.25, -(a0 + a1) / 2); r.rotation.y = s2 * Math.atan2(w1 - w0, a1 - a0); inner.add(r); }
  const mast = new THREE.Mesh(T.mastG, T.spar); mast.position.set(0, 1 + 6.5, -(1.6)); inner.add(mast);
  const spr = new THREE.Mesh(T.sprG, T.spar); spr.rotation.x = Math.PI / 2 - 0.12; spr.position.set(0, 1.9, -(FAC.LEN + 1.8)); inner.add(spr);
  const rig = new THREE.Group(); rig.position.set(0, 0, -1.6); rig.rotation.y = 0.35; inner.add(rig); G.userData.rig = rig;
  const boom = new THREE.Mesh(T.boomG, T.spar); boom.rotation.x = Math.PI / 2; boom.position.set(0, 2.5, 4); rig.add(boom);
  rig.add(new THREE.Mesh(T.main, T.sail));
  inner.add(new THREE.Mesh(T.jib, T.sail));
  // her guns' muzzles through the bulwarks, three a side
  for (const s2 of [-1, 1]) for (const a of [-3.2, 0, 3.2]) { const g0 = new THREE.Mesh(T.gunG, T.iron); g0.rotation.z = Math.PI / 2; g0.position.set(s2 * (faHw(a) + 0.15), 1.4, -a); inner.add(g0); }
  // the green lantern on its pole at the stern: its glow near, and a fainter one to see her by across the water
  const pole = new THREE.Mesh(T.poleG, T.spar); pole.position.set(0, 2.4, FAC.AFT - 0.4); inner.add(pole);
  const lan = new THREE.Mesh(T.lanG, T.lanM); lan.position.set(0, 3.7, FAC.AFT - 0.4); inner.add(lan);
  const gl = GW3.glowSp(0x60ff90, 3.2, { opacity: 0.9 }); gl.position.copy(lan.position); inner.add(gl);
  const gl2 = GW3.glowSp(0x40ff70, 16, { opacity: 0.22 }); gl2.position.copy(lan.position); inner.add(gl2);
  // (a voyage's quarry: a faint gold halo over her masthead)
  const qg = GW3.glowSp(0xffd070, 7, { opacity: 0 }); qg.position.set(0, 14.5, -1.6); inner.add(qg);
  G.userData = Object.assign(G.userData, { inner, gl, gl2, qg, id: s.id });
  GW3.SG.add(G);
  return G;
}
function fa3dBuild() {
  if (!GW3.SG || !GW3.DG) return;
  const lam = (c, o) => z3Lam(c, o), D = GWS.D;
  const H = faHullGeo();
  FA3.T = { hull: H.hull, deck: H.deck, st: H.st, tar: lam('#1a1816', { emissive: 0x050505, side: THREE.DoubleSide }), deckM: lam('#3a3026'), rail: lam('#2a241e'), spar: lam('#2e2620'), iron: lam('#1e1e20'),
    sail: lam('#141416', { side: THREE.DoubleSide, emissive: 0x070809 }), lanM: new THREE.MeshBasicMaterial({ color: 0x80ffa0 }),
    railG: new THREE.BoxGeometry(0.14, 0.5, 1), mastG: new THREE.CylinderGeometry(0.13, 0.2, 13, 8), sprG: new THREE.CylinderGeometry(0.08, 0.12, 4.5, 6), boomG: new THREE.CylinderGeometry(0.09, 0.09, 8.4, 6),
    gunG: new THREE.CylinderGeometry(0.1, 0.12, 0.7, 8), poleG: new THREE.CylinderGeometry(0.05, 0.05, 2.6, 5), lanG: new THREE.BoxGeometry(0.34, 0.45, 0.34),
    main: faSailGeo([[0, 2.7, 0.2], [0, 2.7, 8.1], [0, 10.6, 5.6], [0, 12.2, 0.15]]), jib: faSailGeo([[0, 2.0, -(FAC.LEN + 3.6)], [0, 12.0, -1.8], [0, 2.4, -2.6]]) };
  FA3.sl = new Map();
  // the guns on deck: an iron post in her rail, a swivel yoke on it, a bronze barrel with its tiller
  const iron = lam('#2a2a2c'), bronze = lam('#5e4a2c', { emissive: 0x0a0602 }), wood = lam('#4a3826');
  FA3.guns = FAG.map(g => {
    const P = new THREE.Group(); P.position.copy(gdv(g.u, g.v, D + 0.92)); GW3.DG.add(P);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.34, 8), iron); post.position.y = 0.15; P.add(post);
    const Y = new THREE.Group(); Y.position.y = 0.33; P.add(Y);
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.09), iron); Y.add(yoke);
    for (const sx of [-0.14, 0.14]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.09), iron); ch.position.set(sx, 0.09, 0); Y.add(ch); }
    const Pt = new THREE.Group(); Pt.position.y = 0.13; Y.add(Pt);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 1.05, 12).rotateX(Math.PI / 2), bronze); bar.position.z = -0.25; Pt.add(bar);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.02, 6, 14), bronze); ring.position.z = -0.77; Pt.add(ring);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bronze); knob.position.z = 0.3; Pt.add(knob);
    const til = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 6).rotateX(Math.PI / 2 + 0.25), wood); til.position.set(0, -0.08, 0.66); Pt.add(til);
    const fl = GW3.glowSp(0xffb060, 1.2, { opacity: 0 }); fl.position.z = -0.95; Pt.add(fl);
    return { P, Y, Pt, fl, flT: 0 };
  });
  // balls, floating loot and effects are made as they're needed; the flash's light (made now, so no shader's rebuilt)
  FA3.balls = new Map(); FA3.fl = new Map(); FA3.fxs = [];
  FA3.ballG = new THREE.SphereGeometry(FAC.R, 10, 8); FA3.ballM = lam('#1a1a1c');
  FA3.light = new THREE.PointLight(0xffb070, 0, 90, 1.4); GW3.SG.add(FA3.light);
  FA3.aim = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.75, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  FA3.aim.position.y = 0.35; FA3.aim.visible = false; GW3.SG.add(FA3.aim);
  FA3.smokeTex = z3Soft('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)');
  FA3.on = true;
}
// an effect: k 'flash', 'smoke', 'splash', 'ring', 'chip'; in the sea's frame
function faFx(k, x, y, z, o) { FA.fx.push(Object.assign({ k, x, y, z, t: 0, life: k === 'flash' ? 0.18 : 2, s: 1, dx: 0, dy: 0, dz: 0 }, o || {})); if (FA.fx.length > 140) FA.fx.splice(0, FA.fx.length - 140); if (k === 'flash') FA.lightT = Math.max(FA.lightT || 0, 0.15), FA.lightAt = [x, y, z]; }
function faFxMesh(f) {
  const G = GW3;
  if (f.k === 'flash') return G.glowSp(f.col || 0xffb060, f.s, { opacity: 1 });
  if (f.k === 'smoke') return new THREE.Sprite(new THREE.SpriteMaterial({ map: FA3.smokeTex, color: 0x8a8c90, transparent: true, depthWrite: false, opacity: 0.6, fog: true }));
  if (f.k === 'splash') { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: FA3.smokeTex, color: 0xd8e8f0, transparent: true, depthWrite: false, opacity: 0.85, fog: true })); return s; }
  if (f.k === 'ring') return new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc8dce8, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  if (f.k === 'chip') return new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.5), FA3.T.deckM);
  return new THREE.Object3D();
}
function fa3d(dt) {
  if (!FA3.on || !GW3.SG) return;
  const S = RAID.st, V = faV(), t = g.t, m = FPS.me; if (!V) return;
  // the guns: each at its aim (mine as I look), its flash
  const G = faGuns();
  FA3.guns.forEach((o, i) => { const q = G[i]; o.Y.rotation.y = -q.a; o.Pt.rotation.x = q.p; if (o.flT > 0) o.flT -= dt; o.fl.material.opacity = Math.max(0, o.flT / 0.15); });
  // the sloops: on the water, bobbing and heeling; listing and going down by the stern when they're done for
  const seen = new Set();
  for (const s of FA.sl) {
    let M = FA3.sl.get(s.id); if (!M) { M = faSloopMesh(s); FA3.sl.set(s.id, M); }
    seen.add(s.id);
    const U = M.userData, d = Math.hypot(s.x - V.x, s.y - V.y);
    M.visible = d < 4200;
    M.position.set(s.x, Math.sin(t * 1.1 + s.id) * 0.18, -s.y); M.rotation.set(0, -s.h, 0);
    let roll = (s.roll || 0) + Math.sin(t * 0.9 + s.id * 2) * 0.04, pitch = Math.sin(t * 0.7 + s.id) * 0.025, sink = 0;
    if (s.st === 2) { const k = clamp(s.sinkT / 7, 0, 1); roll += (s.list || 1) * 0.55 * k; pitch -= 0.28 * clamp((s.sinkT - 3) / 8, 0, 1); sink = -Math.max(0, s.sinkT - 2.5) * 0.85; }
    U.inner.rotation.set(pitch, 0, roll); U.inner.position.y = sink;
    U.gl.material.opacity = s.st === 2 ? Math.max(0, 0.9 - s.sinkT * 0.1) : 0.75 + 0.25 * Math.sin(t * 3 + s.id);
    U.gl2.material.opacity = s.st === 2 ? 0 : 0.18 + 0.06 * Math.sin(t * 2.2 + s.id);
    U.qg.material.opacity = s.q != null && s.st < 2 ? 0.35 + 0.15 * Math.sin(t * 2) : 0;
    // (going down: the sea boiling round her now and then)
    if (s.st === 2 && s.sinkT < FAC.SINK - 2 && Math.random() < dt * 3) faFx('splash', s.x + (Math.random() - 0.5) * 10, s.y + (Math.random() - 0.5) * 10, 0, { s: 1.4, life: 1 });
  }
  for (const [id, M] of FA3.sl) if (!seen.has(id)) { GW3.SG.remove(M); FA3.sl.delete(id); }
  // the balls in flight
  const bs = new Set();
  for (const b of FA.balls) {
    let M = FA3.balls.get(b.id); if (!M) { M = new THREE.Mesh(FA3.ballG, FA3.ballM); const gl = GW3.glowSp(0xffd8b0, 0.9, { opacity: 0.45 }); M.add(gl); GW3.SG.add(M); FA3.balls.set(b.id, M); }
    bs.add(b.id); M.position.set(b.x, b.z, -b.y);
  }
  for (const [id, M] of FA3.balls) if (!bs.has(id)) { GW3.SG.remove(M); FA3.balls.delete(id); }
  // what's floating: a box on the water, bobbing, with a pale glint to find it by
  const fs = new Set();
  for (const f of FA.fl) {
    let M = FA3.fl.get(f.id);
    if (!M) {
      const L = fbLootOf(f.k), sz = L.shape === 'small' ? [0.4, 0.35, 0.4] : L.shape === 'box' ? [0.8, 0.55, 0.6] : [1.0, 0.75, 0.75];
      M = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(...sz), z3Lam(L.col, { emissive: 0x0a0804 })); b.position.y = 0.1; M.add(b);
      if (L.shape === 'box' || L.shape === 'crate') { const band = new THREE.Mesh(new THREE.BoxGeometry(sz[0] + 0.04, 0.08, sz[2] + 0.04), z3Lam('#8a7a50')); band.position.y = 0.25; M.add(band); }
      if (f.k === 'greenlamp') { const s2 = GW3.glowSp(0x60ff90, 1.4, { opacity: 0.7 }); s2.position.y = 0.4; M.add(s2); }
      const gl = GW3.glowSp(0xffe0a0, 3.5, { opacity: 0.4 }); gl.position.y = 0.6; M.add(gl); M.userData.gl = gl;
      GW3.SG.add(M); FA3.fl.set(f.id, M);
    }
    fs.add(f.id);
    M.position.set(f.x, Math.sin(t * 1.6 + f.ph) * 0.12 + 0.1, -f.y); M.rotation.set(Math.sin(t * 1.3 + f.ph) * 0.15, f.ph + t * 0.05, Math.cos(t * 1.1 + f.ph) * 0.12);
    M.userData.gl.material.opacity = 0.25 + 0.2 * Math.sin(t * 2.5 + f.ph);
  }
  for (const [id, M] of FA3.fl) if (!fs.has(id)) { GW3.SG.remove(M); FA3.fl.delete(id); }
  // smoke, flashes, splashes
  for (const f of FA.fx) {
    if (!f.m) { f.m = faFxMesh(f); GW3.SG.add(f.m); if (f.k === 'chip') f.m.rotation.set(Math.random() * 3, Math.random() * 3, 0); }
    const k = clamp(f.t / f.life, 0, 1), M = f.m;
    if (f.k === 'flash') { M.position.set(f.x, f.z, -f.y); M.scale.setScalar(f.s * (1 + k)); M.material.opacity = 1 - k; }
    else if (f.k === 'smoke') { M.position.set(f.x + f.dx * f.t * 0.4, f.z + f.t * 0.6, -(f.y + f.dy * f.t * 0.4)); M.scale.setScalar(f.s * (1 + k * 3)); M.material.opacity = 0.55 * (1 - k); }
    else if (f.k === 'splash') { const h = Math.sin(Math.min(1, k * 1.4) * Math.PI); M.position.set(f.x, h * f.s * 0.9, -f.y); M.scale.set(f.s * (0.6 + k * 0.6), f.s * (0.4 + h * 2.2), 1); M.material.opacity = 0.85 * (1 - k); }
    else if (f.k === 'ring') { M.position.set(f.x, 0.32, -f.y); M.scale.setScalar(f.s * (1 + k * 4)); M.material.opacity = 0.5 * (1 - k); }
    else if (f.k === 'chip') { f.dz -= 9.8 * dt; f.x += f.dx * dt; f.y += f.dy * dt; f.z = Math.max(0.2, f.z + f.dz * dt); M.position.set(f.x, f.z, -f.y); M.rotation.x += dt * 8; }
  }
  for (const f of FA.fx) if (f.t >= f.life && f.m) { GW3.SG.remove(f.m); if (f.m.material && f.k !== 'chip') f.m.material.dispose(); if (f.m.isMesh && f.m.geometry) f.m.geometry.dispose(); f.m = null; f.dead = true; }
  FA.fx = FA.fx.filter(f => !f.dead);
  // the flash's light
  if (FA.lightT > 0) { FA.lightT -= dt; const p = FA.lightAt; FA3.light.position.set(p[0], p[2] + 1, -p[1]); FA3.light.intensity = Math.max(0, FA.lightT / 0.15) * 3; } else FA3.light.intensity = 0;
  // my gun: its flash at the muzzle, and the ring on the water where a ball would fall now
  if (FA.my >= 0) {
    const q = G[FA.my], mz = faMuzzle(FA.my, q.a, q.p, V); let [x, y, z, vx, vy, vz] = mz;
    for (let i = 0; i < 400 && z > 0; i++) { const h = 0.02; vz -= FAC.GRAV * h; x += vx * h; y += vy * h; z += vz * h; }
    FA3.aim.visible = z <= 0; FA3.aim.position.set(x, 0.35, -y); const dd = Math.hypot(x - V.x, y - V.y); FA3.aim.scale.setScalar(clamp(dd / 60, 0.8, 5)); FA.aimR = dd;
    FA3.aim.material.opacity = q.rl > 0 ? 0.25 : 0.6 + 0.2 * Math.sin(t * 5);
  } else FA3.aim.visible = false;
}
// (a gun just fired here: its flash at the muzzle on deck)
const faGunFlash = i => { if (FA3.on && FA3.guns && FA3.guns[i]) FA3.guns[i].flT = 0.15; };

// ---------- painted on top ----------
// the sloops near enough on the bearing strip (black, a green light; gold for a voyage's quarry), what's floating near,
// and at a gun its sights, its reload and the range
function faHud(phone, mono, fell) {
  const S = RAID.st, V = faV(), m = FPS.me, t = g.t; if (!V) return;
  const sw = phone ? Math.min(300, W * 0.42) : Math.min(560, W * 0.5), sy = phone ? Math.max(10, FPS.safeTop || 0) + 44 : 84, sh = phone ? 20 : 26, span = 1.9, sx = cx - sw / 2;
  const lb = sb => angDiff(wrapPi(sb - V.h), m.h), xb = d => cx + d / span * sw, inS = d => Math.abs(d) < span / 2 - 0.02;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const s of FA.sl) {
    const dd = Math.hypot(s.x - V.x, s.y - V.y); if (dd > 1100 || s.st === 2 && s.sinkT > 8) continue;
    const d = lb(bearingOf(s.x - V.x, s.y - V.y)), col = s.q != null ? '#ffd070' : '#8affa8';
    if (!inS(d)) { if (dd < FAC.SEE + 100) { const left = d < 0, ex = left ? sx + 8 : sx + sw - 8, ym = sy + sh / 2; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex + (left ? -4 : 4), ym); ctx.lineTo(ex + (left ? 3 : -3), ym - 5); ctx.lineTo(ex + (left ? 3 : -3), ym + 5); ctx.closePath(); ctx.fill(); } continue; }
    const xx = xb(d), yy = sy + sh * 0.45;
    ctx.fillStyle = '#0a0a0c'; ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(xx, yy - 6); ctx.lineTo(xx + 5, yy + 4); ctx.lineTo(xx - 5, yy + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xx, yy - 7, 1.8 + (s.st === 1 ? 0.8 * Math.sin(t * 6) : 0), 0, 6.28); ctx.fill();
    if (!phone || dd < 300) { ctx.font = mono(phone ? 8 : 9); ctx.fillStyle = col; ctx.fillText(s.st === 2 ? 'SINKING' : `${Math.round(dd)} m`, xx, sy - 7); }
    // her planks, small, when she's close
    if (dd < 350 && s.st < 2) { const n = s.max || FAC.HP; for (let i = 0; i < n; i++) { ctx.fillStyle = i < s.hp ? 'rgba(138,255,168,0.85)' : 'rgba(200,80,60,0.6)'; ctx.fillRect(xx - n * 2.5 + i * 5, sy + sh + 2, 4, 3); } }
  }
  let near = null; for (const f of FA.fl) { const dd = Math.hypot(f.x - V.x, f.y - V.y); if (!near || dd < near.d) near = { f, d: dd }; }
  for (const f of FA.fl) {
    const dd = Math.hypot(f.x - V.x, f.y - V.y); if (dd > 700) continue;
    const d = lb(bearingOf(f.x - V.x, f.y - V.y)); if (!inS(d)) continue;
    const xx = xb(d); ctx.fillStyle = '#ffd88a'; ctx.fillRect(xx - 3, sy + sh - 9, 6, 5);
    if (!phone && near.f === f) { ctx.font = mono(8); ctx.fillText(`FLOATING ${Math.round(dd)} m`, xx, sy + sh + 14); }
  }
  ctx.textBaseline = 'alphabetic';
  // at a gun: its sights, its name, loaded or not, the range
  if (FA.my >= 0 && !ZM.over) {
    const q = faGuns()[FA.my], gn = FAG[FA.my], y0 = H - (phone ? 168 : 128), bw = phone ? 170 : 260, x0 = cx - bw / 2;
    ctx.strokeStyle = q.rl > 0 ? 'rgba(236,228,207,0.35)' : 'rgba(255,216,138,0.85)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, H / 2, 18, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 30, H / 2); ctx.lineTo(cx - 22, H / 2); ctx.moveTo(cx + 22, H / 2); ctx.lineTo(cx + 30, H / 2); ctx.moveTo(cx, H / 2 + 22); ctx.lineTo(cx, H / 2 + 34); ctx.stroke();
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x0 - 10, y0 - 22, bw + 20, phone ? 56 : 62);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = '#ffd88a';
    ctx.fillText(`THE ${gn.n.toUpperCase()} GUN · ${FPS.touch ? 'FIRE TO FIRE' : FPS.padLast ? 'RT FIRES' : 'CLICK TO FIRE'} · USE TO LET GO`, cx, y0 - 17, bw + 16);
    ctx.fillStyle = 'rgba(80,70,60,0.7)'; ctx.fillRect(x0, y0, bw, 6);
    ctx.fillStyle = q.rl > 0 ? '#c8a878' : '#ffd88a'; ctx.fillRect(x0, y0, bw * (1 - q.rl / FAC.RELOAD), 6);
    ctx.font = mono(phone ? 8 : 10); ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.textAlign = 'left';
    ctx.fillText(q.rl > 0 ? `LOADING · ${q.rl.toFixed(1)} s` : 'LOADED', x0, y0 + 10);
    ctx.textAlign = 'right'; ctx.fillText(`ELEVATION ${Math.round(q.p * 57.3)}° · FALLS ${FA3.aim && FA3.aim.visible ? Math.round(FA.aimR || 0) + ' m' : 'FAR OFF'}`, x0 + bw, y0 + 10);
    ctx.textBaseline = 'alphabetic';
  }
  void S; void fell;
}

// ---------- for tests ----------
// fbGunsDebug(): a sloop 260 m off her starboard beam, chasing; ('alongside'): one 40 m off her starboard beam, on her
// course; ('man', i): man gun i; ('sink'): the nearest sloop holed through; ('float'): a strongbox floating alongside
function fbGunsDebug(what, a) {
  if (!faOn() || ZM.net === 'client') return null;
  const B = RAID.st.B;
  if (what === 'man') { faMan(a | 0); return FA.my; }
  if (what === 'sink') { const s = FA.sl.filter(q => q.st < 2).sort((p, q) => Math.hypot(p.x - B.x, p.y - B.y) - Math.hypot(q.x - B.x, q.y - B.y))[0]; if (s) { s.hp = 1; faHitSloop(s, { id: 0, x: s.x, y: s.y, z: 1, by: FPS.me.id }); } return s || null; }
  if (what === 'float') { const [x, y] = faToSea(B, 7, 0); const f = { id: ++FA.seq, x, y, k: a || 'strongbox', t: 0, ph: 0 }; FA.fl.push(f); return f; }
  const off = what === 'alongside' ? 40 : 260, [x, y] = faToSea(B, off, what === 'alongside' ? 0 : 40);
  return fbSloopSpawn(x, y, { chase: true, debug: true, h: what === 'alongside' ? B.h : wrapPi(B.h - Math.PI / 2) });
}
