// The Lighthouse: its bosses. Bigger things come up out of the sea with the drowned in the later rounds, each in a
// model of its own, with its own walk and its own way of hurting you, telegraphed so you can get out of the way:
//  - the Diver (here): a drowned salvage diver, half as tall again as a man, in a canvas suit and a brass helmet
//    whose ports glow sea-green, hauling a ship's anchor. Close in he sweeps the anchor round at you; further off he
//    heaves it up over his helmet, a ring glows on the floor where it will come down, and when it does everyone in
//    the ring on their feet takes the blow (jump, or get out of the ring).
//  - the Mooncusser and the Keelback (src/zmboss2.js): a wrecker with his false light, and a crab of fused wrecks
//    that charges in straight lines.
// The schedule (zbPlan): boss rounds from round 10, every fourth round (10, 14, 18, 22, ...): the Diver first, the
// Mooncusser at 14, the Keelback at 18, then any of the three; one at a time to round 19, two from 20, three from 30,
// four from 40, five from 50; and from round 25 a stray one now and then in the rounds between. Each is
//   zmHp(round) x its own multiplier x 1.25 (BOOST: every boss a quarter stronger) x (1 + 0.75 for each more player)
//   x (1 + 0.06 per round past 10), so later they outgrow the drowned (zbHpOf).
// Each comes up out of the sea outside a window it fits (zbWindow: the Diver only by the ground's windows and the
// sea wall; the Mooncusser up the jetty's ladders and the tower's walls too; the Keelback up over the jetty's edge),
// takes all its boards in at once and climbs through; inside, it goes after the nearest of you by the walk,
// shouldering through tight corners, and lost for long goes back out and comes in again by the window nearest you.
// They count towards the round (it isn't held until they're down), each is worth points on top of the kill and
// always drops salvage. The Black Spot only makes them bleed faster, and a Lamp Flash only scorches them; each takes
// the Lamp's fire its own way. Their strength shows in bars at the top of the screen (the nearest three).
// Together: the host runs them like the rest (src/zmnet.js streams them with them, and in `bo`, for each, its kind,
// its strength, its blow in progress and where it'll land); each player judges their blows on themselves, as with
// the others' swings.
// Hooks into src/zombies.js (zmRounds, zmZombies, zmCrowd, zmHurt, zmKill, zmTick, zmSpeedK, zmModel, zmPose, zmHud)
// and src/zmnet.js (znHostSend, znApply) are single lines marked [boss]; fpsRay (src/fps.js) reads a body's own size.

const ZBC = {
  FROM: 10, EVERY: 4, HP: 12, BOOST: 1.25, HP_MORE: 0.75, LATE: 0.06, MAX: 5, STRAY_FROM: 25, STRAY: 0.3,
  DMG: 2, PTS: 500, PAD: 0.45, RAD: 0.85, TALL: 2.75, HEADZ: 2.15,
  REACH: 2.6, NEAR: 2.0, SLAM_R: 4.2, SLAM_AT: 2.0, SLAM_RANGE: 6.5, OUT: 6,
};
// his blows: when each lands, and when he's ready to move again
const ZB_T = { swing: { hit: 0.75, end: 1.3 }, slam: { hit: 1.6, end: 2.7 }, smash: { hit: 0.9, end: 1.5 } };
// every blow of every one of them, by number (for the wire)
const ZB_ACT = ['', 'swing', 'slam', 'smash', 'lure', 'pole', 'charge', 'pinch', 'reel'];
// the kinds, by number (for the wire); each kind's own table is ZBT[kind] (the Diver's below, the others' in zmboss2.js)
const ZB_KINDS = ['diver', 'moon', 'crab'];
const ZBT = {};
const ZB = { g: null, round: 0, plan: [], wait: 0, seen: new Set(), pool: [], grp: null, bars: new Map(), lure: null, glare: 0 };
const zbIsRound = r => r >= ZBC.FROM && (r - ZBC.FROM) % ZBC.EVERY === 0;
// how many come in a boss round
const zbCount = r => r < ZBC.FROM ? 0 : Math.min(ZBC.MAX, Math.max(1, Math.floor(r / 10)));
// how much more there is to them, the later it gets (1 at round 10)
const zbLate = r => 1 + ZBC.LATE * Math.max(0, r - ZBC.FROM);
// one of a kind's strength, that round, with n of you
const zbHpOf = (kind, r, n) => zmHp(r) * ZBT[kind].hp * ZBC.BOOST * (1 + ZBC.HP_MORE * (Math.max(1, n) - 1)) * zbLate(r) * zbRaidK();
// [raid] in Maren's End every boss is a little tougher (RAIDC.BOSS_HP, before the share for each of you)
const zbRaidK = () => typeof RAID !== 'undefined' && RAID.on && typeof RAIDC !== 'undefined' ? RAIDC.BOSS_HP : 1;
const zbT = z => ZBT[z.bt] || ZBT.diver;
const zbActT = z => (zbT(z).acts[z.act] || ZB_T.smash);
const zbEnd = z => z.aEnd || zbActT(z).end;
function zbNew() { if (ZB.g !== FPS.g) { ZB.g = FPS.g; ZB.round = 0; ZB.plan = []; ZB.seen = new Set(); ZB.bars = new Map(); ZB.lure = null; ZB.glare = 0; ZB.theme = null; ZB.themeRound = -1; ZB.planAll = []; } }

// ---------- the schedule ----------
// which of them come in round r (a list of kinds, in the order they come; rnd: a random source, for tests)
function zbPlan(r, rnd) {
  rnd = rnd || Math.random;
  if (!zbIsRound(r)) return r >= ZBC.STRAY_FROM && rnd() < ZBC.STRAY ? [ZB_KINDS[(rnd() * 3) | 0]] : [];
  // (each one's first night: on its own)
  if (r === ZBC.FROM) return ['diver'];
  if (r === ZBC.FROM + ZBC.EVERY) return ['moon'];
  if (r === ZBC.FROM + 2 * ZBC.EVERY) return ['crab'];
  // then the lead goes round the three in turn, and the rest are drawn as from a bag (each kind once before any twice)
  const n = zbCount(r), lead = ZB_KINDS[((r - ZBC.FROM) / ZBC.EVERY) % 3], out = [lead];
  let bag = [];
  while (out.length < n) {
    if (!bag.length) bag = ZB_KINDS.slice(0, 3).filter(k => out.length >= 3 || !out.includes(k));
    out.push(bag.splice((rnd() * bag.length) | 0, 1)[0]);
  }
  return out;
}

// ---------- their coming (hosting, or alone) ----------
// from zmRounds, while a round is on: the first a few seconds in, the rest a few seconds apart (or at once, if the
// rest of the drowned are all up already, so the round can't end before they've come)
function zbRounds(dt) {
  zbNew();
  if (ZB.round !== ZM.round) { ZB.round = ZM.round; ZB.plan = zbPlan(ZM.round); ZB.planAll = ZB.plan.slice(); ZB.wait = 5 + Math.random() * 5; }
  if (ZB.plan.length) {
    ZB.wait -= dt;
    if (ZB.wait <= 0 || ZM.left <= 0) {
      if (zbSpawn(ZB.plan[0])) { ZB.plan.shift(); ZB.wait = 6 + Math.random() * 6; } else ZB.wait = 1;
    }
  }
}
// the window one comes in by: one of the open rooms' that it fits, nearest by the walk to you
function zbWindow(kind) {
  const T = ZBT[kind || 'diver'], list = [];
  for (const w of ZM.windows) {
    if (!zmOpen(w.zone) || w.hatch || !T.win(w)) continue;
    const d = zmNavDist(w.x - w.nx * 1.0, w.y - w.ny * 1.0, w.z || 0);
    list.push([w, d < 1e8 ? d : 9999]);
  }
  if (!list.length) return null;
  list.sort((a, b) => a[1] - b[1]);
  return list[Math.random() < 0.7 || list.length < 2 ? 0 : 1][0];
}
function zbSpawn(kind) {
  kind = kind || 'diver';
  let w = zbWindow(kind);
  // (none that fits it open yet: once they've all been seen, another kind that does fit comes instead; the Diver's
  // first night, with only the jetty open, he doesn't come)
  if (!w && ZM.round >= ZBC.FROM + 2 * ZBC.EVERY) for (const k of ZB_KINDS.slice(0, 3)) if (k !== kind && (w = zbWindow(k))) { kind = k; break; }
  if (!w) return false;
  const T = ZBT[kind], hp = zbHpOf(kind, ZM.round, ZM.hum.length);
  const zn = ++ZM.zc, side = (Math.random() - 0.5) * 2 * ((w.z || 0) > 0 ? 0.4 : 1), out = w.sea ? 4.5 : (w.z || 0) > 0 ? 1.4 : ZBC.OUT;
  const z = {
    drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss',
    x: w.x + w.nx * out - w.ny * side, y: w.y + w.ny * out + w.nx * side, jz: (w.z || 0) > 0 ? 0 : -2.6, fl: 0,
    hp, max: hp, sp: T.sp(ZM.round),
    st: 'out', win: w, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: 0, iy: 0, ax: 0, ay: 0,
  };
  if (T.init) T.init(z);
  zbMake(z, kind);
  z.h = bearingOf(w.x - z.x, w.y - z.y);
  ZM.z.push(z); FPS.drowned = ZM.z;
  ZB.seen.add(zn);
  if (typeof ztPick === 'function') ztPick(kind);   // [theme] the round's music (src/zmtheme.js)
  zbArrive(z);
  return true;
}
// what makes one of the drowned one of them: its size (for shots: fpsRay reads rad, tall and headZ), its footing
function zbMake(z, kind) {
  kind = ZBT[kind] ? kind : 'diver';
  if (z.mdl && z.mdl.bt !== kind) zmFreeModel(z);
  const T = ZBT[kind];
  Object.assign(z, { boss: true, bt: kind, n: T.n, kind: 'boss', rad: T.rad, tall: T.tall, headZ: T.headZ, zpad: T.pad, crowdR: T.crowd });
  if (z.aseq == null) z.aseq = 0;
}
// everyone hears it come
function zbArrive(z) {
  const T = zbT(z), zn = z.win ? zmZoneName(z.win.zone) : '';
  ZM.banner = { text: T.N, t: 3.6, col: T.col, sub: T.sub };
  fpsFeed(T.arriveLine(zn));
  T.sound('arrive');
}

// ---------- each tick (hosting, or alone): from zmZombies, for them instead of the usual ----------
function zbTick(z, dt, nearest) {
  const T = zbT(z);
  if (T.cool) T.cool(z, dt);
  if (z.slamCd > 0) z.slamCd -= dt; if (z.swCd > 0) z.swCd -= dt;
  // a blow under way: it stands (or charges) and sees it through
  if (z.act) {
    const A = zbActT(z), was = z.at, a0 = z.act;
    z.at += dt; z.walk = false;
    if (T.during) T.during(z, dt, nearest, was);
    if (z.act !== a0) return;   // (ended early, or turned into another: the charge struck something)
    if (was < A.hit && z.at >= A.hit) {
      if (z.act === 'smash') zbSmashWindow(z);
      zbStrike(z);
    }
    if (z.at >= zbEnd(z)) {
      const a = z.act; z.act = null; z.at = 0; z.aEnd = 0;
      if (a === 'smash') { z.st = 'climb'; z.t = 0; z.jz0 = z.jz; }
      else if (T.after) T.after(z, a);
    }
    return;
  }
  if (z.st === 'out') return zbOut(z, dt);
  if (z.st === 'climb') return zbClimb(z, dt);
  // inside: after the nearest of you, by the shortest walk
  const p = nearest(z.x, z.y, z.jz);
  if (!p) { z.walk = false; return; }
  const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy), dz = (p.jz || 0) - (z.jz || 0), level = Math.abs(dz) < 1;
  const a = T.think(z, p, d, dz, level);
  if (a) { zbStart(z, a, p); return; }
  let tx = p.x, ty = p.y;
  if (!(d < 3 && Math.abs(dz) < 0.8)) { const nx = zmNavNext(z.x, z.y, z.jz || 0); if (nx) { tx = nx[0]; ty = nx[1]; } }
  const hx = tx - z.x, hy = ty - z.y, hl = Math.hypot(hx, hy), near = d < T.near && level;
  const step = z.sp * dt * (z.slow > 0 && typeof zmpSlowK === 'function' ? zmpSlowK(z) : 1);   // [pap] (slowed by the Equinox Gale)
  const x0 = z.x, y0 = z.y;
  z.walk = false;
  if (hl > 0.05 && !near) {
    z.h += angDiff(bearingOf(hx, hy), z.h) * Math.min(1, dt * 3);
    const s = Math.min(hl, step), want = bearingOf(hx, hy);
    if (z.shove > 0) {
      // (shouldering through a corner too tight for it: straight on along the way, whatever's in it)
      z.shove -= dt; z.x += Math.sin(want) * s; z.y += Math.cos(want) * s; zmSettle(z); z.walk = true;
    } else {
      for (const dh of [0, 0.5, -0.5, 1.0, -1.0]) { const a = want + dh * (z.side || 1), ax = z.x, ay = z.y; if (zmMove(z, Math.sin(a) * s, Math.cos(a) * s) && Math.hypot(z.x - ax, z.y - ay) > s * 0.3) { z.walk = true; if (dh) z.side = Math.sign(dh * (z.side || 1)); break; } }
    }
  } else if (d > 0.1) z.h += angDiff(bearingOf(dx, dy), z.h) * Math.min(1, dt * 3);
  if ((z.jz || 0) > z.fl) z.jz = Math.max(z.fl, z.jz - 9 * dt);
  // getting nowhere: shoulder through for a moment; lost for long, far from you: back out, and in by another window
  const moved = Math.hypot(z.x - x0, z.y - y0);
  if (!near && hl > 0.05 && moved < step * 0.25) z.stuck += dt; else z.stuck = Math.max(0, z.stuck - dt);
  if (z.stuck > 1.2 && !(z.shove > 0)) { z.shove = 1.0; z.stuck = 0; }
  // (lost: no nearer to you by the walk for a long while)
  const nd = zmNavDist(z.x, z.y, z.jz || 0);
  if (near || nd < (z.best == null ? 1e9 : z.best) - 0.5) { z.best = nd; z.lost = 0; } else z.lost += dt;
  if (z.lost > 8) z.best = nd;   // (you moved off: count again from here)
  if (z.lost > 14 && d > 10) zbReenter(z);
  zbJostle(z);
  z.lx = z.x; z.ly = z.y;
}
// the rest of them keep out from under its feet
function zbJostle(z, R) {
  R = R || (z.rad || 0.85) + 0.4;
  for (const o of ZM.z) {
    if (o === z || o.dead || o.st !== 'in' || o.boss || Math.abs((o.jz || 0) - (z.jz || 0)) > 1) continue;
    const ox = o.x - z.x, oy = o.y - z.y, od = Math.hypot(ox, oy);
    if (od < R && od > 0.001) zmMove(o, ox / od * (R - od) * 0.5, oy / od * (R - od) * 0.5);
  }
}
// up out of the sea, and across to its window: wading in to a ladder at the jetty's edge, up the foot of the tower's
// wall to a window up there, or across the ground to one there
function zbOut(z, dt) {
  const w = z.win, wz = w.z || 0, T = zbT(z);
  const off = w.sea ? 0.75 : wz > 0 ? 1.0 : 1.5, ox = w.x + w.nx * off, oy = w.y + w.ny * off, dx = ox - z.x, dy = oy - z.y, d = Math.hypot(dx, dy);
  if (z.jz < 0 || !wz) {
    if (z.jz < 0) z.jz = Math.min(0, z.jz + dt * 1.1);
    if (typeof zmSeaDepth === 'function') z.jz = Math.min(z.jz, -zmSeaDepth(z.x, z.y) * (w.sea ? 1.25 : 1));   // (still in the harbour's water: wading up out of it)
  }
  z.scaling = false;
  if (d > 0.08) { const s = Math.min(d, z.sp * dt * (w.sea ? 0.8 : 1)); z.x += dx / d * s; z.y += dy / d * s; z.h += angDiff(bearingOf(dx, dy), z.h) * Math.min(1, dt * 4); z.walk = true; return; }
  z.walk = false; z.h = bearingOf(-w.nx, -w.ny);
  if (w.sea) { z.st = 'climb'; z.t = 0; z.jz0 = z.jz; return; }   // (a ladder has no boards: straight up it)
  if (wz > 0 && z.jz < wz) { z.jz = Math.min(wz, Math.max(0, z.jz) + dt * (T.scale || 1.6)); z.scaling = true; return; }   // (hand over hand up the wall)
  if (z.jz < wz - 0.01) return;
  if (T.alwaysSmash || w.boards > 0) zbStart(z, 'smash'); else { z.st = 'climb'; z.t = 0; z.jz0 = z.jz; }
}
// through the empty frame, stooping (or up the ladder and over the jetty's edge)
function zbClimb(z, dt) {
  const w = z.win, wz = w.z || 0, T = zbT(z);
  if (w.sea) {
    const D = T.ladder || 2.0, k = Math.min(1, z.t / D), j0 = z.jz0 != null ? z.jz0 : -1;
    if (k < 0.6) { const q = zbE(k / 0.6); z.x = w.x + w.nx * 0.75; z.y = w.y + w.ny * 0.75; z.jz = j0 + (wz - 0.3 - j0) * q; z.scaling = true; }
    else { const q = (k - 0.6) / 0.4; z.x = w.x + w.nx * (0.75 - 2.1 * q); z.y = w.y + w.ny * (0.75 - 2.1 * q); z.jz = wz - 0.3 + 0.3 * Math.sin(q * Math.PI / 2) + 0.25 * Math.sin(q * Math.PI); z.scaling = false; }
    z.h = bearingOf(-w.nx, -w.ny); z.walk = true;
  } else {
    const D = T.through || 1.6, k = Math.min(1, z.t / D), a = wz > 0 ? 1.0 : 1.5;
    z.x = w.x + w.nx * (a - (a + 1.2) * k); z.y = w.y + w.ny * (a - (a + 1.2) * k); z.jz = wz + Math.sin(k * Math.PI) * 0.9; z.walk = true; z.scaling = false;
  }
  if (z.t >= (w.sea ? T.ladder || 2.0 : T.through || 1.6)) { z.st = 'in'; z.jz = wz; z.fl = wz; z.t = 0; z.lx = z.x; z.ly = z.y; z.jz0 = null; zmSettle(z); }
}
function zbStart(z, act, p) {
  z.act = act; z.at = 0; z.aseq = (z.aseq + 1) % 1000; z.walk = false; z.aEnd = 0; z.judged = false; z.chHit = false;
  zbT(z).start(z, act, p);
  zbT(z).actSound(z, act);
}
function zbReenter(z) {
  const w = zbWindow(z.bt); if (!w) { z.lost = 0; return; }
  const out = w.sea ? 4.5 : (w.z || 0) > 0 ? 1.4 : ZBC.OUT;
  Object.assign(z, { st: 'out', win: w, x: w.x + w.nx * out, y: w.y + w.ny * out, jz: (w.z || 0) > 0 ? 0 : -2.6, fl: 0, t: 0, act: null, at: 0, aEnd: 0, lost: 0, stuck: 0, shove: 0, best: null });
  z.h = bearingOf(w.x - z.x, w.y - z.y);
}
// the boards: all of them in at once
function zbSmashWindow(z) {
  const w = z.win; if (!w) return;
  for (let i = w.boards - 1; i >= 0; i--) w.fall.push({ i, t: 0 });
  w.boards = 0;
  const line = zbT(z).smashLine(zmZoneName(w.zone));
  if (typeof zmnEvent === 'function' && ZM.net === 'host') zmnEvent('feed', line);
  fpsFeed(line);
}

// ---------- their blows land (on every screen; each judges only its own player) ----------
const zbOk = () => { const m = FPS.me; return !(m.dead > 0) && !(m.protect > 0) && !ZM.over; };
function zbStrike(z) {
  if (z.act === 'smash') return zbSmashFx(z);
  zbT(z).strike(z);
}
// boards going in: splinters, and the sound of it
function zbSmashFx(z) {
  const G0 = FPSC.GROUND, ix = z.win ? z.win.x : z.x, iy = z.win ? z.win.y : z.y, iz = z.win ? z.win.z || 0 : z.jz || 0;
  zbT(z).sound('smash', Math.hypot(ix - FPS.me.x, iy - FPS.me.y));
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; fpsPuff(ix + Math.cos(a) * 1.2 * (0.4 + Math.random() * 0.6), iy + Math.sin(a) * 1.2 * (0.4 + Math.random() * 0.6), G0 + iz + 0.15, '120,100,80', 2); }
}
// a melee blow in an arc in front of one of them: is it me it hits?
function zbMelee(z, reach, arc, dmg) {
  const m = FPS.me, d = Math.hypot(m.x - z.x, m.y - z.y);
  if (zbOk() && d < reach && Math.abs(angDiff(bearingOf(m.x - z.x, m.y - z.y), z.h)) < arc && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.3) { fpsHurt(dmg, null, null); zmSound('hit'); FPS.hurtT = 0.9; return true; }
  return false;
}

// ---------- hurting them, and putting them down (hosting, or alone) ----------
// from zmHurt: what a hit does to one (the Black Spot doesn't kill outright; each takes the rest its own way)
function zbHurtK(z, dmg, how) { return dmg * (ZM.insta > 0 ? 3 : 1) * zbT(z).hurtK(z, how, dmg); }
// a Lamp Flash only scorches them
function zbFlash(z) { if (zbT(z).noFlash && zbT(z).noFlash(z)) return; z.hp = Math.max(1, z.hp - z.max * 0.2); z.scorch = 1; z.hitT = 0.3; }
// from zmKill: its reward, and its salvage
function zbKilled(z, how, by) {
  const T = zbT(z);
  zmPoints(T.pts, false, by);
  const r = Math.random(), k = r < 0.35 ? 'keg' : r < 0.6 ? 'double' : r < 0.8 ? 'spot' : 'flash';
  ZM.drops.push({ k, x: z.x, y: z.y, z: z.jz || 0, t: 30, ph: Math.random() * 6, id: ++ZM.zc });
  zmSound('drop');
  const who = !by || by === FPS.me.id ? 'You' : ((ZM.hum.find(h => h[0] === by) || [])[1] || 'Someone');
  const line = T.killLine(who, T.pts);
  fpsFeed(line);
  if (typeof zmnEvent === 'function' && ZM.net === 'host') zmnEvent('feed', line);
  zbDeathFx(z);
}
function zbDeathFx(z) {
  if (z.dfx) return; z.dfx = true;
  const m = FPS.me, T = zbT(z);
  if (z.bt === 'moon' && ZB.lure && ZB.lure.zn === z.zn) ZB.lure = null;
  ZM.banner = { text: T.N + ' goes down', t: 3, small: true, col: T.col };
  T.sound('die', Math.hypot(z.x - m.x, z.y - m.y));
  for (let i = 0; i < 4; i++) fpsPuff(z.x + (Math.random() - 0.5) * 1.2, z.y + (Math.random() - 0.5) * 1.2, FPSC.GROUND + (z.jz || 0) + 0.8 + i * 0.4, T.puff || '90,140,120', 8);
}

// ---------- on every screen, each frame: from zmTick ----------
// (joined: their blows run on between the host's word, and land here when they're due); and what their blows have
// done to me goes on: dragged towards the false light, and the glare of it
function zbMe(dt) {
  zbNew();
  if (ZM.net === 'client') for (const z of ZM.z) {
    if (!z.boss || z.dead || !z.act) continue;
    const A = zbActT(z), was = z.at || 0;
    z.at = Math.min(zbEnd(z), was + dt);
    if (zbT(z).judge) zbT(z).judge(z, was, z.at);
    if (!z.judged && was < A.hit && z.at >= A.hit) { z.judged = true; zbStrike(z); }
  }
  if (ZB.glare > 0) ZB.glare = Math.max(0, ZB.glare - dt);
  if (ZB.lure && typeof zbLureTick === 'function') zbLureTick(dt);
  if (typeof zbStareTick === 'function') zbStareTick(dt);
}
// how quick on my feet I am, for their part (dragged by the false light: half pace)
function zbSpeedK() { return ZB.lure ? 0.45 : 1; }

// ---------- together ----------
// (hosting) them and their blows, for the others: zn, strength (per mille), the blow and how far into it, which blow
// (a count), where it'll land (the anchor's ring, the end of a charge), the kind, and where a charge set off from
function zbHostSend(o) {
  const CX = FPSC.CX, CY = FPSC.CY, list = ZM.z.filter(q => q.boss && !q.gone);
  if (ZB.theme && ZB.themeRound === ZM.round) o.bm = ZB_KINDS.indexOf(ZB.theme);   // [theme] which music everyone plays
  if (!list.length) return;
  o.bo = list.map(q => [q.zn, Math.round(clamp(q.hp / q.max, 0, 1) * 1000), ZB_ACT.indexOf(q.act || ''), Math.round((q.at || 0) * 100), q.aseq | 0, Math.round((q.ix - CX) * 10), Math.round((q.iy - CY) * 10), Math.max(0, ZB_KINDS.indexOf(q.bt)), Math.round(((q.ax || CX) - CX) * 10), Math.round(((q.ay || CY) - CY) * 10)]);
}
// (joined) what the host says of them: and a blow landing is judged here, on me
function zbApply(hz) {
  zbNew();
  if (hz.bm != null && typeof ztHeard === 'function') ztHeard(hz.bm);   // [theme]
  const CX = FPSC.CX, CY = FPSC.CY;
  if (Array.isArray(hz.bo)) for (const r of hz.bo) {
    if (!Array.isArray(r)) continue;
    const zn = r[0] | 0, z = ZM.z.find(q => q.zn === zn);
    if (!z) continue;
    const kind = ZB_KINDS[r[7] | 0] || 'diver';
    if (!z.boss || z.bt !== kind) zbMake(z, kind);
    if (!ZB.seen.has(zn)) { ZB.seen.add(zn); if (!z.dead) zbArrive(z); }
    z.hpk = clamp((+r[1] || 0) / 1000, 0, 1);
    const act = ZB_ACT[r[2] | 0] || null, at = (+r[3] || 0) / 100, seq = r[4] | 0;
    z.ix = CX + (+r[5] || 0) / 10; z.iy = CY + (+r[6] || 0) / 10;
    z.ax = CX + (+r[8] || 0) / 10; z.ay = CY + (+r[9] || 0) / 10;
    const T = zbT(z);
    if (seq !== z.aseq) { z.aseq = seq; z.judged = false; z.chHit = false; if (act) T.actSound(z, act); }
    const was = z.act === act ? z.at || 0 : at;
    z.act = act; z.at = act ? at : 0;
    if (act && T.endOf) z.aEnd = T.endOf(z, act); else z.aEnd = 0;
    if (act && T.judge && at > was) T.judge(z, was, at);
    if (act && !z.judged && at >= zbActT(z).hit) { z.judged = true; zbStrike(z); }
  }
  for (const z of ZM.z) if (z.boss && z.dead && !z.dfx) zbDeathFx(z);
}

// ---------- in 3D: each kind's model (a pool of its own, in the mode's group), and its pose ----------
function zbModel(z) {
  if (ZB.grp !== Z3.grp) { ZB.grp = Z3.grp; ZB.pool = []; }
  const kind = ZBT[z.bt] ? z.bt : 'diver';
  let M = ZB.pool.find(p => !p.used && p.bt === kind);
  if (!M) { M = ZBT[kind].build(); M.boss = true; M.bt = kind; M.used = false; ZB.pool.push(M); Z3.grp.add(M.root); }
  M.used = true; M.root.visible = true;
  ZBT[kind].reset(z, M);
  z.mdl = M; z.duck = z.duck || 0; z.stepS = 0; z.groanT = 3 + Math.random() * 4;
  return M;
}
function zbPose(z, M, dt) {
  if (M.bt !== z.bt) { zmFreeModel(z); return; }
  zbT(z).pose(z, M, dt);
  if (typeof raidPose === 'function' && typeof RAID !== 'undefined' && RAID.on && raidStage() && raidStage().noBars) raidPose(z, M);   // [raid] the Swallow's Divers glow too
  // a groan now and then
  z.groanT = (z.groanT || 3) - dt;
  if (z.groanT <= 0 && !z.dead) { z.groanT = 4 + Math.random() * 5; zbT(z).sound('groan', Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y)); }
}

// ---------- on top: their strength, in bars at the top of the screen; and the false light's glare ----------
function zbHud(phone, top) {
  zbNew();
  const m = FPS.me, dt = Math.min(0.1, FPS.dtLast || 0.016);
  // the glare: white-gold over everything, the lantern's shape burnt in the middle
  if (ZB.glare > 0) {
    const a = clamp(ZB.glare / 1.4, 0, 1) * 0.94, gr = ctx.createRadialGradient(cx, H * 0.48, 0, cx, H * 0.48, Math.max(W, H) * 0.75);
    gr.addColorStop(0, `rgba(255,252,236,${a})`); gr.addColorStop(0.35, `rgba(255,236,180,${a * 0.95})`); gr.addColorStop(1, `rgba(255,190,90,${a * 0.85})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  const live = (typeof RAID !== 'undefined' && RAID.on && raidStage() && raidStage().noBars) ? [] : ZM.z.filter(q => q.boss && !q.gone && (!q.dead || (q.deadT || 0) < 2));   // [raid] no bars in the Swallow
  for (const q of live) ZB.bars.set(q.zn, Math.min(1, (ZB.bars.get(q.zn) || 0) + dt * 3));
  for (const [zn, v] of ZB.bars) if (!live.some(q => q.zn === zn)) { if (v - dt * 3 <= 0) ZB.bars.delete(zn); else ZB.bars.set(zn, v - dt * 3); }
  if (!live.length) return;
  // the nearest three (the living first), one under another; more than that, a count
  live.sort((a, b) => (a.dead ? 1 : 0) - (b.dead ? 1 : 0) || Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
  const show = live.slice(0, 3), more = live.filter(q => !q.dead).length - show.filter(q => !q.dead).length;
  const bw = Math.min(380, W * (phone ? 0.46 : 0.42)) * (show.length > 1 ? 0.85 : 1), bh = phone ? 6 : show.length > 1 ? 8 : 10, gap = phone ? 20 : 27;
  let y0 = phone ? top + 70 : 68;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (const b of show) {
    const T = zbT(b), x0 = cx - bw / 2;
    const frac = b.dead ? 0 : ZM.net === 'client' ? (b.hpk == null ? 1 : b.hpk) : clamp(b.hp / b.max, 0, 1);
    ctx.globalAlpha = (ZB.bars.get(b.zn) || 0) * (b.dead ? Math.max(0, 1 - (b.deadT || 0) / 2) : 1);
    ctx.font = `400 ${phone ? 14 : show.length > 1 ? 17 : 20}px "IM Fell English SC", serif`; ctx.fillStyle = T.col;
    ctx.fillText(T.N, cx, y0 - 5);
    ctx.fillStyle = 'rgba(8,10,14,0.7)'; ctx.fillRect(x0 - 2, y0 - 2, bw + 4, bh + 4);
    const gr = ctx.createLinearGradient(x0, 0, x0 + bw, 0); gr.addColorStop(0, T.bar[0]); gr.addColorStop(1, T.bar[1]);
    ctx.fillStyle = gr; ctx.fillRect(x0, y0, bw * frac, bh);
    // (its big blow coming: the bar's edge burns)
    if (b.act && b.act === T.big && !b.dead && (b.at || 0) < (T.warnT || zbActT(b).hit)) { ctx.strokeStyle = `rgba(${T.warn},${0.5 + 0.5 * Math.sin(g.t * 20)})`; ctx.lineWidth = 2; ctx.strokeRect(x0 - 2, y0 - 2, bw + 4, bh + 4); }
    // [raid3] a second bar under it (the Knock's song: how far it's sung; under that, how near it is to breaking)
    const sb = T.songBar && T.songBar(b);
    if (sb) {
      const sy = y0 + bh + 5, sh = Math.max(4, Math.round(bh * 0.8));
      ctx.fillStyle = 'rgba(8,10,14,0.75)'; ctx.fillRect(x0 - 2, sy - 2, bw + 4, sh + 9);
      ctx.fillStyle = sb.c; ctx.fillRect(x0, sy, bw * sb.k, sh);
      ctx.fillStyle = sb.bc; ctx.fillRect(x0, sy + sh + 2, bw * sb.b, 3);
      y0 += sh + 14;
    }
    y0 += bh + gap;
  }
  ctx.globalAlpha = 1;
  // (the false light being raised where it could see me: a word of warning)
  if (live.some(q => q.bt === 'moon' && q.act === 'lure' && !q.dead && (q.at || 0) < ZBM_T.lure.hit && Math.hypot(q.x - m.x, q.y - m.y) < ZBM.LURE_SEE)) {
    ctx.font = `400 ${phone ? 16 : 24}px "IM Fell English SC", serif`; ctx.fillStyle = `rgba(255,224,150,${0.7 + 0.3 * Math.sin(g.t * 14)})`;
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 1;
    ctx.fillText('Look away from the false light', cx, H * (phone ? 0.42 : 0.4));
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }
  if (more > 0) { ctx.font = `400 ${phone ? 12 : 14}px "IM Fell English SC", serif`; ctx.fillStyle = 'rgba(236,228,207,0.75)'; ctx.fillText(`and ${more} more`, cx, y0 - gap + 14); }
}

// ======================================================================================================
// the Diver
// ======================================================================================================
ZBT.diver = {
  n: 'the Diver', N: 'The Diver', col: '#8affd0', bar: ['#2f9a7a', '#8affd0'], warn: '255,122,64', big: 'slam', puff: '90,140,120',
  hp: ZBC.HP, pts: ZBC.PTS, rad: ZBC.RAD, tall: ZBC.TALL, headZ: ZBC.HEADZ, pad: ZBC.PAD, crowd: 1.05, near: ZBC.NEAR, alwaysSmash: true,
  sp: r => 1.3 + Math.min(0.45, (r - ZBC.FROM) * 0.025),
  // (too big for the windows up the tower, and too heavy for the jetty's ladders)
  win: w => !w.sea && !((w.z || 0) > 0),
  acts: ZB_T,
  arriveLine: zn => `Something huge comes up out of the sea${zn ? ' outside ' + zn : ''}: the Diver, dragging his anchor.`,
  smashLine: zn => `The Diver smashes in through a window of ${zn}.`,
  killLine: (who, pts) => `${who} sent the Diver back to the deep (+${pts}).`,
  think(z, p, d, dz, level) {
    if (level && d < ZBC.REACH - 0.3 && z.swCd <= 0) return z.slamCd <= 0 && Math.random() < 0.3 ? 'slam' : 'swing';
    if (level && d < ZBC.SLAM_RANGE && d > 2.6 && z.slamCd <= 0) return 'slam';
    return null;
  },
  start(z, act) {
    if (act === 'slam') { z.slamCd = 6.5 + Math.random() * 2.5; z.swCd = Math.max(z.swCd, 1.2); zbAim(z); }
    if (act === 'swing') z.swCd = 1.7 + Math.random() * 0.5;
  },
  during(z, dt, nearest) {
    const T = ZB_T[z.act];
    if (z.act === 'slam' && z.at < T.hit * 0.6) {
      // (turning to follow you for the first of the wind-up; then it's set, and the ring shows where)
      const p = nearest(z.x, z.y, z.jz);
      if (p) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 2.5);
      zbAim(z);
    }
    if (z.act === 'swing' && z.at < T.hit * 0.7) { const p = nearest(z.x, z.y, z.jz); if (p) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 4); }
  },
  strike(z) {
    const m = FPS.me, G0 = FPSC.GROUND;
    if (z.act === 'slam') {
      const ix = z.ix, iy = z.iy, dm = Math.hypot(ix - m.x, iy - m.y);
      zbSound('slam', dm);
      for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283; fpsPuff(ix + Math.cos(a) * ZBC.SLAM_R * (0.4 + Math.random() * 0.6), iy + Math.sin(a) * ZBC.SLAM_R * (0.4 + Math.random() * 0.6), G0 + (z.jz || 0) + 0.15, '150,170,160', 2); }
      z.wave = 0.01;
      if (dm < 9) { FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.18 * (1 - dm / 9), -0.8, 0.8); }
      // in the ring, at his level, feet on the floor, and nothing solid between: two knocks
      const grounded = (m.jz || 0) - (m.fl || 0) < 0.25 && !((m.vz || 0) > 0.5);
      if (zbOk() && dm < ZBC.SLAM_R && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.2 && grounded) {
        const r = fpsRay(ix, iy, G0 + (z.jz || 0) + 0.6, bearingOf(m.x - ix, m.y - iy), 0, null, [], dm);
        if (!(r.kind !== 'none' && r.t < dm - 0.3)) { fpsHurt(ZBC.DMG, null, null); zmSound('hit'); FPS.hurtT = 0.9; }
      }
      return;
    }
    if (z.act === 'swing') { zbSound('whoosh', Math.hypot(z.x - m.x, z.y - m.y)); zbMelee(z, ZBC.REACH, 1.25, ZBC.DMG); }
  },
  // (the Lamp's fire burns him at half the rate)
  hurtK: (z, how) => how === 'burn' ? 0.5 : 1,
  actSound(z, act) {
    const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y);
    if (act === 'slam') zbSound('heave', d); else if (act === 'smash') zbSound('heave', d * 0.8);
  },
  sound: (k, d) => zbSound(k, d),
  build: () => zbBuildDiver(),
  reset(z, M) { M.suit.color.set('#6a6450').multiplyScalar(0.62); M.suit.emissive.set(0); M.brass.emissive.set(0x140e04); M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1); },
  pose: (z, M, dt) => zbPoseDiver(z, M, dt),
};
// where the anchor will come down: in front of him
function zbAim(z) { z.ix = z.x + Math.sin(z.h) * ZBC.SLAM_AT; z.iy = z.y + Math.cos(z.h) * ZBC.SLAM_AT; }

// ---------- the Diver's sounds ----------
function zbSound(k, d) {
  try {
    if (soundOff()) return;
    const v = d == null ? 1 : Math.max(0.08, 1 - d / 45);
    { const R = { arrive: 'diver', slam: 'slam', smash: 'debris' }[k]; if (R && sfxPlay(R, { vol: (k === 'arrive' ? 0.95 : 0.85) * v, vary: 0.05 })) return; }   // (the recordings: src/sfxbank.js)
    if (k === 'arrive') {
      // a fog signal out of the deep, flat and wrong
      tone(58, 'sawtooth', 0.5, 0.16, 2.8, { to: 49 }); tone(87, 'square', 0.5, 0.05, 2.6, { to: 74 }); noise('lowpass', 160, 1, 0.6, 0.25, 2.4);
      sfxBellFar(0, 0.5); tone(46, 'sine', 0.3, 0.3, 3.2, { delay: 1.2, to: 38 });
    } else if (k === 'step') { tone(52, 'sine', 0.005, 0.32 * v, 0.28, { to: 34 }); noise('lowpass', 180, 1, 0.005, 0.18 * v, 0.2); if (Math.random() < 0.4) noise('bandpass', 2600, 6, 0.003, 0.05 * v, 0.12, { delay: 0.05 }); }
    else if (k === 'heave') {
      // the chain running up, and a groan inside the helmet
      for (let i = 0; i < 6; i++) noise('bandpass', 2200 + Math.random() * 1500, 7, 0.002, 0.09 * v, 0.07, { delay: i * 0.09 });
      tone(70, 'sawtooth', 0.4, 0.09 * v, 1.0, { to: 120 }); noise('bandpass', 260, 3, 0.4, 0.14 * v, 0.9, { to: 420 });
    } else if (k === 'slam') {
      noise('lowpass', 140, 1, 0.003, 0.7 * v, 0.9); tone(42, 'sine', 0.003, 0.5 * v, 0.8, { to: 28 }); noise('bandpass', 900, 2, 0.002, 0.35 * v, 0.25);
      for (let i = 0; i < 4; i++) noise('lowpass', 500 + Math.random() * 500, 1, 0.005, 0.12 * v, 0.25, { delay: 0.15 + i * 0.11 });
    } else if (k === 'smash') {
      for (let i = 0; i < 6; i++) noise('bandpass', 500 + Math.random() * 900, 2, 0.003, 0.35 * v, 0.3, { delay: i * 0.06 });
      noise('lowpass', 220, 1, 0.005, 0.5 * v, 0.7); tone(60, 'sine', 0.003, 0.35 * v, 0.5, { to: 40 });
    } else if (k === 'whoosh') { noise('bandpass', 380, 2, 0.08, 0.3 * v, 0.3, { to: 160 }); }
    else if (k === 'groan') { tone(64 + Math.random() * 12, 'sawtooth', 0.3, 0.07 * v, 1.1, { to: 50 }); noise('bandpass', 200, 4, 0.3, 0.12 * v, 1.0, { to: 140 }); }
    else if (k === 'die') {
      tone(90, 'sawtooth', 0.1, 0.14 * v, 2.2, { to: 30 }); noise('lowpass', 300, 1, 0.05, 0.4 * v, 1.6, { to: 80 });
      for (let i = 0; i < 8; i++) noise('bandpass', 500 + Math.random() * 700, 9, 0.005, 0.1 * v, 0.08, { delay: 0.4 + i * 0.14 + Math.random() * 0.1 });
    }
  } catch (e) {}
}

// ---------- the Diver in 3D ----------
const ZBG = {};
function zbGeo() {
  if (ZBG.ok) return ZBG;
  ZBG.leg = new THREE.CylinderGeometry(0.18, 0.15, 1.0, 10); ZBG.leg.translate(0, -0.5, 0);
  ZBG.boot = new THREE.BoxGeometry(0.34, 0.22, 0.5);
  ZBG.body = new THREE.CylinderGeometry(0.5, 0.42, 1.0, 14); ZBG.body.translate(0, 0.5, 0);
  ZBG.belt = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 14);
  ZBG.corselet = new THREE.CylinderGeometry(0.56, 0.64, 0.24, 16);
  ZBG.bolt = new THREE.SphereGeometry(0.035, 6, 5);
  ZBG.weight = new THREE.BoxGeometry(0.24, 0.32, 0.07);
  ZBG.dome = new THREE.SphereGeometry(0.38, 18, 14);
  ZBG.port = new THREE.TorusGeometry(0.17, 0.04, 8, 20);
  ZBG.glass = new THREE.CircleGeometry(0.16, 20);
  ZBG.sport = new THREE.TorusGeometry(0.1, 0.03, 6, 16);
  ZBG.sglass = new THREE.CircleGeometry(0.095, 16);
  ZBG.bar = new THREE.BoxGeometry(0.025, 0.3, 0.03);
  ZBG.vent = new THREE.CylinderGeometry(0.07, 0.09, 0.12, 10);
  ZBG.neck = new THREE.CylinderGeometry(0.3, 0.36, 0.16, 14);
  ZBG.arm = new THREE.CylinderGeometry(0.15, 0.12, 0.9, 10); ZBG.arm.translate(0, -0.45, 0);
  ZBG.glove = new THREE.SphereGeometry(0.19, 10, 8);
  ZBG.kelp = new THREE.BoxGeometry(0.05, 0.6, 0.012); ZBG.kelp.translate(0, -0.3, 0);
  ZBG.lamp = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8);
  // the anchor, hanging from its ring (the grip) down its shank to the crown and the flukes
  ZBG.ring = new THREE.TorusGeometry(0.13, 0.035, 6, 14);
  ZBG.stock = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8); ZBG.stock.rotateX(Math.PI / 2);
  ZBG.shank = new THREE.CylinderGeometry(0.075, 0.09, 1.8, 8); ZBG.shank.translate(0, -0.9, 0);
  ZBG.crown = new THREE.TorusGeometry(0.55, 0.08, 6, 16, Math.PI); ZBG.crown.rotateZ(Math.PI);
  ZBG.fluke = new THREE.ConeGeometry(0.22, 0.45, 4); ZBG.fluke.scale(1, 1, 0.4);
  // the warning ring on the floor, and the shock going out
  ZBG.rim = new THREE.RingGeometry(ZBC.SLAM_R - 0.18, ZBC.SLAM_R, 56); ZBG.rim.rotateX(-Math.PI / 2);
  ZBG.disc = new THREE.CircleGeometry(ZBC.SLAM_R, 56); ZBG.disc.rotateX(-Math.PI / 2);
  ZBG.wave = new THREE.RingGeometry(0.82, 1.0, 56); ZBG.wave.rotateX(-Math.PI / 2);
  ZBG.glassM = new THREE.MeshBasicMaterial({ color: 0x8affd0 });
  ZBG.lampM = new THREE.MeshBasicMaterial({ color: 0xb8ffe0 });
  ZBG.bootM = z3Lam('#26272a'); ZBG.ironM = z3Lam('#5a4c42'); ZBG.leadM = z3Lam('#3a3c40'); ZBG.beltM = z3Lam('#2a2018'); ZBG.hoseM = z3Lam('#24221e'); ZBG.darkM = z3Lam('#1a1a1c');
  ZBG.weedM = new THREE.MeshLambertMaterial({ color: 0x1e4a32, emissive: 0x0e5a3a });
  ZBG.halo = z3Soft('rgba(140,255,210,0.85)', 'rgba(140,255,210,0)');
  ZBG.ok = true;
  return ZBG;
}
function zbBuildDiver() {
  const Q = zbGeo(), root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 1.2;
  const suit = z3Lam('#6a6450'), brass = z3Lam('#b08436', { emissive: 0x140e04 });
  const mesh = (geo, mat, x, y, zz, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, zz || 0); (parent || hips).add(o); return o; };
  const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.23, 0, 0); hips.add(p); mesh(Q.leg, suit, 0, 0, 0, p); mesh(Q.boot, Q.bootM, 0, -1.09, -0.07, p); return p; });
  const torso = new THREE.Group(); hips.add(torso);
  mesh(Q.body, suit, 0, 0, 0, torso).scale.set(1, 1, 0.8);
  mesh(Q.belt, Q.beltM, 0, 0.08, 0, torso).scale.set(1, 1, 0.82);
  mesh(Q.corselet, brass, 0, 1.0, 0, torso).scale.set(1, 1, 0.86);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; mesh(Q.bolt, brass, Math.cos(a) * 0.62, 0.96, Math.sin(a) * 0.53, torso); }
  for (const s of [-1, 1]) mesh(Q.weight, Q.leadM, s * 0.2, 0.62, -0.38, torso).rotation.x = 0.12;
  // a lamp on his chest, still burning green
  mesh(Q.lamp, Q.lampM, 0, 0.32, -0.42, torso);
  const lh = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lh.position.set(0, 0.32, -0.5); lh.scale.setScalar(0.7); torso.add(lh);
  mesh(Q.neck, brass, 0, 1.16, -0.02, torso);
  // the helmet: a brass dome, its faceplate barred, the glass lit from inside, ports at the sides
  const head = new THREE.Group(); head.position.set(0, 1.42, -0.04); torso.add(head);
  mesh(Q.dome, brass, 0, 0, 0, head);
  mesh(Q.port, brass, 0, 0, -0.355, head);
  mesh(Q.glass, Q.glassM, 0, 0, -0.35, head).rotation.y = Math.PI;
  for (const x of [-0.07, 0, 0.07]) mesh(Q.bar, Q.darkM, x, 0, -0.375, head);
  for (const s of [-1, 1]) { mesh(Q.sport, brass, s * 0.345, 0.03, -0.07, head).rotation.y = Math.PI / 2; mesh(Q.sglass, Q.glassM, s * 0.35, 0.03, -0.07, head).rotation.y = s * Math.PI / 2; }
  mesh(Q.vent, brass, 0, 0.38, 0.03, head);
  const hh = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); hh.position.set(0, 0, -0.48); hh.scale.setScalar(1.0); head.add(hh);
  for (let i = 0; i < 3; i++) { const k = mesh(Q.kelp, Q.weedM, -0.2 + i * 0.2, -0.05, 0.3, head); k.rotation.x = 0.3; }
  // the air hose, torn off, trailing behind him
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.5, 0.3), new THREE.Vector3(0.12, 1.15, 0.75), new THREE.Vector3(0.35, 0.2, 1.25), new THREE.Vector3(0.5, -1.1, 2.0), new THREE.Vector3(0.7, -1.18, 2.6)]);
  mesh(new THREE.TubeGeometry(curve, 24, 0.06, 6, false), Q.hoseM, 0, 0, 0, torso);
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.64, 0.86, 0); torso.add(p); mesh(Q.arm, suit, 0, 0, 0, p); mesh(Q.glove, suit, 0, -0.95, 0, p); const k = mesh(Q.kelp, Q.weedM, s * 0.1, -0.35, 0.08, p); k.rotation.z = s * 0.2; return p; });
  // the anchor
  const anc = new THREE.Group(); torso.add(anc);
  mesh(Q.ring, Q.ironM, 0, 0.08, 0, anc); mesh(Q.stock, Q.ironM, 0, -0.22, 0, anc); mesh(Q.shank, Q.ironM, 0, 0, 0, anc);
  mesh(Q.crown, Q.ironM, 0, -1.25, 0, anc);
  for (const s of [-1, 1]) mesh(Q.fluke, Q.ironM, s * 0.55, -1.1, 0, anc);
  for (let i = 0; i < 5; i++) { const k = mesh(Q.kelp, Q.weedM, -0.45 + i * 0.22, -1.25 - Math.abs(i - 2) * 0.12, 0.06, anc); k.rotation.z = (i - 2) * 0.25; }
  // the ring on the floor where it'll come down, and the shock going out (in his own space: ahead of him)
  const warnM = new THREE.MeshBasicMaterial({ color: 0xff7a40, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const fillM = new THREE.MeshBasicMaterial({ color: 0xff5a30, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const waveM = new THREE.MeshBasicMaterial({ color: 0xc8fff0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const rim = new THREE.Mesh(Q.rim, warnM), disc = new THREE.Mesh(Q.disc, fillM), wave = new THREE.Mesh(Q.wave, waveM);
  for (const o of [rim, disc, wave]) { o.position.set(0, 0.04, -ZBC.SLAM_AT); o.renderOrder = 2; root.add(o); }
  return { root, hips, legs, arms, torso, head, anc, suit, brass, rim, disc, wave };
}
const ZBV = {};
// one arm reaching for a point (torso space): the anchor's ring, a lantern's pole
function zbReach(arm, gx, gy, gz) {
  const V = ZBV.v || (ZBV.v = new THREE.Vector3()), D = ZBV.d || (ZBV.d = new THREE.Vector3(0, -1, 0));
  V.set(gx - arm.position.x, gy - arm.position.y, gz - arm.position.z);
  if (V.lengthSq() < 1e-4) return;
  arm.quaternion.setFromUnitVectors(D, V.normalize());
}
// which way the anchor's shank runs from the ring, in his hands (torso space; forward is -z): hanging and trailing
// behind, raised up beside his right shoulder, and laid out in front of him on the floor
const ZBK = { hang: [0, -0.58, 0.81], up: [0.45, 0.62, 0.62], down: [0, -0.05, -1] };
function zbV3(a, b, k, arc) {
  const V = ZBV.q || (ZBV.q = new THREE.Vector3()), lift = arc ? Math.sin(k * Math.PI) * arc : 0;
  V.set(zbL(a[0], b[0], k), zbL(a[1], b[1], k) + lift, zbL(a[2], b[2], k));
  if (V.lengthSq() < 1e-4) V.set(0, -1, 0);
  return V.normalize();
}
const zbE = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const zbL = (a, b, k) => a + (b - a) * k;
function zbPoseDiver(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, m = FPS.me;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  // the walk: slow, heavy, rolling from one lead boot to the other; each one lands with a thud
  const walking = z.walk && !z.act && !z.dead;
  if (walking) z.ph += dt * z.sp * 1.7;
  const A = walking ? 0.5 : 0.05, ph = z.ph, s = Math.sin(ph);
  if (walking && Math.sign(s) !== z.stepS && z.stepS) { const d = Math.hypot(z.x - m.x, z.y - m.y); zbSound('step', d); if (d < 10) FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.03 * (1 - d / 10), -0.8, 0.8); }
  z.stepS = Math.sign(s) || 1;
  // stooping under a door's lintel, or through a window
  let duck = z.st === 'climb' || z.st === 'out' && z.act === 'smash' ? 1 : 0;
  if (!duck) for (const d of ZM.doors) if (Math.hypot(d.x - z.x, d.y - z.y) < 2.0) { duck = 1; break; }
  z.duck = zbL(z.duck || 0, duck, Math.min(1, dt * 4));
  M.legs[0].rotation.x = s * 0.5 * A * 1.6; M.legs[1].rotation.x = -s * 0.5 * A * 1.6;
  M.hips.position.y = 1.2 - Math.abs(Math.cos(ph)) * 0.1 * A * 2 - z.duck * 0.32;
  let pitch = -0.2 - z.duck * 0.5, roll = Math.sin(ph) * 0.1 * (walking ? 1 : 0.2);
  // where the anchor's ring is in his hands (torso space), which way it hangs, and whether both hands are on it
  let gx = 0.66, gy = -0.08, gz = 0.12, ax = -0.95 + Math.sin(ph) * 0.06, ay = 0, az = 0, both = false, qd = null;
  const at = z.at || 0;
  if (z.act === 'slam' || z.act === 'smash') {
    const T = ZB_T[z.act], up = T.hit - 0.16;
    both = true;
    if (at < up) {
      // heaved up over his shoulder (under the ceiling), held there trembling
      const k = zbE(at / Math.min(up, 0.9)), shake = at > 0.9 ? Math.sin(t * 40) * 0.02 : 0;
      gx = zbL(0.66, 0.42, k); gy = zbL(-0.08, 1.2, k) + shake; gz = zbL(0.12, 0.1, k); qd = zbV3(ZBK.hang, ZBK.up, k); pitch = zbL(pitch, 0.12, k);
    } else if (at < T.hit) {
      // and down
      const k = zbE((at - up) / 0.16);
      gx = zbL(0.42, 0, k); gy = zbL(1.2, 0.25, k); gz = zbL(0.1, -0.95, k); qd = zbV3(ZBK.up, ZBK.down, k, 0.8); pitch = zbL(0.12, -0.55, k);
    } else {
      // buried in the floor a moment, then dragged out again
      const k = zbE((at - T.hit - 0.5) / Math.max(0.1, T.end - T.hit - 0.5));
      gx = zbL(0, 0.66, k); gy = zbL(0.25, -0.08, k); gz = zbL(-0.95, 0.12, k); qd = zbV3(ZBK.down, ZBK.hang, k); pitch = zbL(-0.55, pitch, k);
      both = k < 0.6;
    }
  } else if (z.act === 'swing') {
    const T = ZB_T.swing, w0 = 0.55;
    both = true;
    if (at < w0) { const k = zbE(at / w0); gx = zbL(0.66, 0.6, k); gy = zbL(-0.08, 0.55, k); gz = zbL(0.12, 0.3, k); ax = zbL(-0.95, 0, k); ay = zbL(0, -0.9, k); az = zbL(0, 1.45, k); roll = zbL(roll, -0.15, k); }
    else if (at < T.hit + 0.1) { const k = zbE((at - w0) / (T.hit + 0.1 - w0)); gx = zbL(0.6, -0.45, k); gy = zbL(0.55, 0.45, k); gz = zbL(0.3, -0.6, k); ax = 0; ay = zbL(-0.9, 2.4, k); az = 1.45; roll = zbL(-0.15, 0.2, k); }
    else { const k = zbE((at - T.hit - 0.1) / (T.end - T.hit - 0.1)); gx = zbL(-0.45, 0.66, k); gy = zbL(0.45, -0.08, k); gz = zbL(-0.6, 0.12, k); ax = zbL(0, -0.95, k); ay = zbL(2.4, 0, k); az = zbL(1.45, 0, k); both = k < 0.5; }
  }
  M.torso.rotation.set(pitch, 0, roll);
  M.anc.position.set(gx, gy, gz);
  if (qd) M.anc.quaternion.setFromUnitVectors(ZBV.d || (ZBV.d = new THREE.Vector3(0, -1, 0)), qd); else M.anc.rotation.set(ax, ay, az);
  zbReach(M.arms[1], gx + 0.08, gy, gz);
  if (both) zbReach(M.arms[0], gx - 0.08, gy, gz);
  else { M.arms[0].quaternion.identity(); M.arms[0].rotation.set(-0.25 - Math.sin(ph) * 0.35 * A * 1.6, 0, -0.12); }
  M.head.rotation.set(0.1 + Math.sin(t * 0.7 + z.seed) * 0.06, Math.sin(t * 0.4 + z.seed) * 0.2, Math.sin(t * 0.9) * 0.05);
  // the ring on the floor: brighter and quicker the nearer the anchor is to coming down; the shock, once it has
  const slam = z.act === 'slam' && !z.dead, Tq = ZB_T.slam;
  if (slam && at < Tq.hit) {
    const k = at / Tq.hit, pulse = 0.5 + 0.5 * Math.sin(t * (8 + k * 18));
    M.rim.visible = M.disc.visible = true;
    M.rim.material.opacity = (0.35 + 0.55 * k) * (0.6 + 0.4 * pulse); M.disc.material.opacity = 0.05 + 0.18 * k * k;
    // (set where the host aimed it, in his own space)
    const fx = (z.ix || z.x) - z.x, fy = (z.iy || z.y) - z.y, ch = Math.cos(z.h), sh = Math.sin(z.h);
    const lx = fx * ch - fy * sh, lf = fx * sh + fy * ch;
    for (const o of [M.rim, M.disc, M.wave]) o.position.set(lx, 0.04, -lf);
  } else { M.rim.visible = M.disc.visible = false; }
  if (slam && at >= Tq.hit && at < Tq.hit + 0.5) {
    const k = (at - Tq.hit) / 0.5, r = 0.4 + k * ZBC.SLAM_R * 1.05;
    M.wave.visible = true; M.wave.scale.set(r, 1, r); M.wave.material.opacity = 0.95 * (1 - k);
  } else M.wave.visible = false;
  // hit: a pale flash on the canvas; burning: the brass glows; dead: over he goes, the light in the helmet dies, and he sinks
  const flash = z.hitT > 0 ? z.hitT / 0.15 : 0, hot = (z.scorch || 0) * 0.7;
  M.suit.emissive.setRGB(0.18 * flash + hot * 0.5, 0.2 * flash + hot * 0.2, 0.18 * flash + hot * 0.04);
  M.brass.emissive.setRGB(0.08 + 0.2 * flash + hot * 0.4, 0.055 + 0.2 * flash + hot * 0.15, 0.016 + 0.15 * flash);
  if (z.scorch > 0) z.scorch = Math.max(0, z.scorch - dt * 0.8);
  if (z.dead) {
    const k = zbE((z.deadT || 0) / 1.0);
    M.root.rotation.set(-k * 1.35, -z.h, 0, 'YXZ');
    M.root.position.y -= Math.max(0, (z.deadT || 0) - 1.2) * 0.9;
    M.brass.emissive.setRGB(0.02, 0.015, 0.005);
  }
}
