// The Lighthouse: the wreck chest's own weapons. Eight more things washed up from the wrecks, found only in the
// chest (like the Fresnel Lamp), never on a wall and never on Wreckers' Night's islands. Each plays its own way, and
// each has its own reforging at the Lampwright's Bench (src/zmpap.js), which grows with every time it goes back into
// the fire (t, zmpTier):
//  - Duck's-Foot (d): a volley pistol, four barrels splayed like a duck's foot: each pull fires all four in a flat
//    fan, a ball for each of a crowd. Reforged, the Skein: more barrels (4 + t, up to 9), a wider fan, and a ball
//    that would miss turns in flight, like a goose in a skein, onto the nearest of them by its line.
//  - Bomb-Lance (w): a whaler's shoulder gun: a lance with a bomb behind its head, that sticks in what it strikes
//    (one of them, a wall, the floor) and goes off a second later, throwing back all round it. Reforged, the
//    Thunder-Pod: the blast throws a pod of smaller irons (1 + t, up to 6) that each go off in turn where they fall.
//  - Grapnel Gun (g): a four-tined hook on a line: it catches one of them and the line hauls it off its feet and to
//    yours, where it lies a moment. Reforged, the Mooring Line: the hook runs on through 1 + t of them (up to 7),
//    hauls them all into a heap in front of you and lashes them there, held, each taking a blow for each other.
//  - Flare Pistol (s): a fat-bored signal pistol: its burning star sets alight what it strikes, and wherever it
//    comes to rest it burns on the floor, in a ring of fire, for six seconds, and lights the room. Reforged, the
//    Star Shell: it climbs and bursts into a shower of burning stars (3 + t, up to 9), each burning where it falls.
//  - Boarding Axe (x): a bearded axe on a long haft: a wide, heavy sweep that hits all in front of you, and every
//    third stroke a chop from overhead that knocks them down. Reforged, the Homeward Axe: the third stroke throws it,
//    spinning, out through all of them in its way (14 + 2t m), and it comes back to your hand, cutting again.
//  - Punt Gun (u): a wildfowler's gun as long as a boat-hook: one enormous load of shot in a tight column that goes
//    through three of them each ball and throws them back, and kicks you back a couple of metres. Slow to load.
//    Reforged, the Breakwater: its shot goes on through walls and floors (1 + t of them, up to 5), through every
//    one of them in its line, and hurls them across the room and down.
//  - Net Mortar (n): a short brass mortar that lobs a weighted net: wherever it falls it opens, and everything
//    under it, and anything that walks into it for the next four seconds, is tangled and held. Reforged, the
//    Barbed Trawl: a wider net that holds longer, hauls shut (those under it dragged in to the middle), and its
//    barbs bite those held, twice a second.
//  - Chain-Shot (y): a twin-barrelled cannonette firing two balls joined by a chain, that spin out sideways into a
//    whirling bar over two metres wide: it cuts through every one it passes, slowing them, until a wall stops it.
//    Reforged, the Reaping Chain: a longer chain (wider swath), those it cuts are crippled for longer, and it
//    rebounds off walls (t times, up to 4), cutting again.
// Damage, as everywhere here, is in pepperbox body shots scaled by ZM_DMG (and by zmpK when reforged). The fire of
// the flares is a fixed fraction of a drowned man's strength that round, like the Fresnel Lamp's.
// Together (src/zmnet.js): every shot is resolved on the shooter's screen; hits go to the host through zmHurt, and
// what's done to them (hauled, knocked down, tangled, slowed) through zmpStatus ('pst'), so the host applies it.
// The others see and hear each shot (zxShotFx): what it throws flies on their screens too, only to look at.

// what each carries in reserve, and how hard it hits the drowned
Object.assign(ZM_AMMO, { duckfoot: 40, bomblance: 12, grapnel: 24, flaregun: 20, axe: 0, puntgun: 10, netmortar: 14, chainshot: 18 });
Object.assign(ZM_DMG, { d: 1.8, w: 1.5, g: 1.5, s: 1, x: 3, u: 2.2, n: 1, y: 1.6 });
// the chest's odds: each weight against the others' (the seven before these come to 83 between them)
ZM_BOXW.push(['duckfoot', 10], ['bomblance', 6], ['grapnel', 8], ['flaregun', 8], ['axe', 8], ['puntgun', 5], ['netmortar', 7], ['chainshot', 7]);
// (what each becomes at the Lampwright's Bench: ZM_PAP_W, in src/zmpap.js)
const ZX_ID = { d: 'duckfoot', w: 'bomblance', g: 'grapnel', s: 'flaregun', x: 'axe', u: 'puntgun', n: 'netmortar', y: 'chainshot' };
const ZX = { proj: [], pools: [], nets: [], booms: [], burn: [], later: [], shove: null, axeOut: false, n: 0 };
function zxReset() { ZX.proj = []; ZX.pools = []; ZX.nets = []; ZX.booms = []; ZX.burn = []; ZX.later = []; ZX.shove = null; ZX.axeOut = false; if (typeof zrReset === 'function') zrReset(); }   // [crab] src/zmcrab.js
const zxT = id => (typeof zmpTier === 'function' ? zmpTier(id) : 0);
const zxG = o => FPSC.GROUND + (o.jz || 0);
const zxHp = () => zmHp(Math.max(1, ZM.round));
const zxFloor = (x, y, zr) => { try { return zmFloorAt(x, y, Math.max(0, zr), 0.35); } catch (e) { return 0; } };
const zxMark = head => { FPS.hitT = 0.18; FPS.hitHead = !!head; fpsHitSound(!!head); };

// ---------- a shot: from zmResolveShot (my own) ----------
function zxShot(sh, mine) {
  const [, x, y, z, h, p, by, code, seed] = sh, id = ZX_ID[code];
  if (!id) return false;
  const t = mine ? zxT(id) : 0;
  zxSound(code, 0, 0);
  if (code === 'x') zxAxe(x, y, z, h, mine, t);
  else if (code === 'd') zxVolley(x, y, z, h, p, by, mine, t);
  else if (code === 'u') zxPunt(x, y, z, h, p, by, seed, mine, t);
  else if (code === 'r') zrShot(x, y, z, h, p, by, mine, t);   // [crab] the Hermit's Claw (src/zmcrab.js)
  else zxLaunch(code, x, y, z, h, p, by, mine, t);
  return true;
}
// someone else's (together): what it throws, to see and hear, and nothing more (their hits come from them)
function zxShotFx(r, code, x, y, z, h, p, d, pan) {
  if (!ZX_ID[code]) return false;
  zxSound(code, d, pan);
  if (code === 'x') { r.slashT = 0.3; return true; }
  if (code === 'r') { zrShot(x, y, z, h, p, r.id, false, 0); return true; }   // [crab]
  if (code === 'd' || code === 'u') {
    const n = code === 'd' ? FPSW.duckfoot.fan : 6;
    for (let i = 0; i < n; i++) {
      const lh = code === 'd' ? h - FPSW.duckfoot.fanW + 2 * FPSW.duckfoot.fanW * i / (n - 1) : h + (Math.random() - 0.5) * 0.06, lp = code === 'd' ? p : p + (Math.random() - 0.5) * 0.04;
      const ray = fpsRay(x, y, z, lh, lp, r.id, ZM.z.filter(q => !q.dead), FPSW[ZX_ID[code]].range);
      FPS.tracers.push({ a: [x + Math.sin(lh) * 0.6, y + Math.cos(lh) * 0.6, z - 0.25], b: [ray.x, ray.y, ray.z], t: 0.08, k: code });
    }
    return true;
  }
  zxLaunch(code, x, y, z, h, p, r.id, false, 0);
  return true;
}
// a ray that goes through n of them (and, with walls, through that many walls); hits: [{ o, head }], end: where it stopped
function zxPierce(x, y, z, h, p, by, range, n, walls) {
  const hits = [], skip = new Set(), sx = Math.sin(h), sy = Math.cos(h), tp = Math.tan(p);
  let ox = x, oy = y, oz = z, gone = 0, left = n, wl = walls || 0, end = null, wallAt = -9;
  const thru = [];
  for (let guard = 0; guard < 48 && left > 0 && gone < range; guard++) {
    const r = fpsRay(ox, oy, oz, h, p, by, ZM.z.filter(q => !q.dead && !skip.has(q)), range - gone);
    end = r;
    let step;
    if (r.kind === 'body') { hits.push({ o: r.who, head: r.head, x: r.x, y: r.y, z: r.z }); skip.add(r.who); left--; step = 0.6; }
    else if (r.kind !== 'none' && r.kind !== 'ground' && (wl > 0 || gone + r.t - wallAt < 0.9)) {
      // (on through the wall: a wall hit again within a step of the last is the same wall)
      if (gone + r.t - wallAt >= 0.9) { wl--; thru.push([r.x, r.y, r.z]); }
      wallAt = gone + r.t; step = 0.45;
    } else break;
    gone += r.t + step; ox = r.x + sx * step; oy = r.y + sy * step; oz = r.z + tp * step;
  }
  return { hits, end: end || { x, y, z, kind: 'none' }, thru };
}
// hits made: each one hurt once with all that struck it
function zxDeal(hits, code, mine) {
  if (!mine) return;
  let any = null;
  for (const [o, e] of hits) { any = any || e; o.hitT = 0.2; zmHurt(o, e.dmg, e.head, code, FPS.me.id); }
  if (any) zxMark(any.head);
}
const zxAdd = (hits, o, dmg, head) => { const e = hits.get(o) || { dmg: 0, head: false }; e.dmg += dmg; e.head = e.head || !!head; hits.set(o, e); };

// ---------- Duck's-Foot: four balls in a flat fan (the Skein: more, and they turn onto them) ----------
function zxVolley(x, y, z, h, p, by, mine, t) {
  const w = FPSW.duckfoot, n = t ? Math.min(9, w.fan + t) : w.fan, half = w.fanW + (t ? Math.min(0.15, 0.03 * t) : 0);
  const hits = new Map();
  for (let i = 0; i < n; i++) {
    const lh = h - half + 2 * half * i / (n - 1), a = [x + Math.sin(lh) * 0.6, y + Math.cos(lh) * 0.6, z - 0.25];
    const R = zxPierce(x, y, z, lh, p, by, w.range, 1, 0), e = R.end;
    if (mine && typeof zeShot === 'function') zeShot(x, y, z, lh, p, by);   // [egg hook]
    if (R.hits.length) { zxAdd(hits, R.hits[0].o, R.hits[0].head ? w.head : w.dmg, R.hits[0].head); FPS.tracers.push({ a, b: [e.x, e.y, e.z], t: 0.07, k: 'd' }); continue; }
    const q = t ? zxSeek(x, y, z, lh, p, 0.26 + Math.min(0.3, 0.05 * t), 45, hits) : null;
    if (q) {
      // the Skein: the ball bends in flight onto the nearest by its line
      zxAdd(hits, q.o, w.dmg, false);
      const tz = FPSC.GROUND + zmMid(q.o), d = Math.hypot(q.o.x - x, q.o.y - y), mid = [x + Math.sin(lh) * d * 0.55, y + Math.cos(lh) * d * 0.55, z + Math.tan(p) * d * 0.55];
      let prev = a;
      for (let k = 1; k <= 7; k++) {
        const u = k / 7, v = 1 - u, pt = [v * v * a[0] + 2 * v * u * mid[0] + u * u * q.o.x, v * v * a[1] + 2 * v * u * mid[1] + u * u * q.o.y, v * v * a[2] + 2 * v * u * mid[2] + u * u * tz];
        FPS.tracers.push({ a: prev, b: pt, t: 0.22, life: 0.22, col: '255,230,160', w: 2 }); prev = pt;
      }
      continue;
    }
    FPS.tracers.push({ a, b: [e.x, e.y, e.z], t: 0.07, k: 'd' });
    if (e.kind !== 'none') fpsPuff(e.x, e.y, e.z, e.kind === 'ground' ? '150,140,120' : '190,190,180', 3);
  }
  zxDeal(hits, 'd', mine);
}
// the nearest of them to a line (within cone of it, and in sight), the fewest balls on it first
function zxSeek(x, y, z, h, p, cone, range, hits) {
  let best = null, bs = 1e9;
  for (const o of ZM.z) {
    if (o.dead) continue;
    const d = Math.hypot(o.x - x, o.y - y); if (d > range || d < 0.5) continue;
    const off = Math.abs(angDiff(bearingOf(o.x - x, o.y - y), h)); if (off > cone) continue;
    const s = off + (hits.has(o) ? 0.4 : 0) + d * 0.004; if (s >= bs) continue;
    const r = fpsRay(x, y, z, bearingOf(o.x - x, o.y - y), Math.atan2(FPSC.GROUND + zmMid(o) - z, d), FPS.me.id, [o], d + 2);
    if (r.kind !== 'body') continue;
    bs = s; best = { o };
  }
  return best;
}

// ---------- Punt Gun: a column of heavy shot through three of them each, and it throws you back ----------
function zxPunt(x, y, z, h, p, by, seed, mine, t) {
  const w = FPSW.puntgun, rng = seeded(((seed || 7) ^ 0x5a5a) >>> 0), walls = t ? Math.min(5, 1 + t) : 0, pierce = t ? 14 : 3;
  const hits = new Map();
  for (let i = 0; i < w.shot; i++) {
    const a = rng() * 6.283, r = Math.sqrt(rng()) * w.spread, lh = h + Math.cos(a) * r, lp = p + Math.sin(a) * r * 0.7;
    const R = zxPierce(x, y, z, lh, lp, by, w.range * (t ? 1.6 : 1), pierce, walls), e = R.end;
    for (const q of R.hits) zxAdd(hits, q.o, q.head ? w.head : w.dmg, q.head);
    if (i % 2 === 0) FPS.tracers.push({ a: [x + Math.sin(lh) * 0.6, y + Math.cos(lh) * 0.6, z - 0.25], b: [e.x, e.y, e.z], t: t ? 0.3 : 0.1, life: t ? 0.3 : 0.1, col: t ? '190,225,255' : '255,225,170', w: t ? 2.2 : 1.6 });
    for (const q of R.thru) fpsPuff(q[0], q[1], q[2], '200,200,190', 4);
    if (e.kind !== 'none' && e.kind !== 'body') fpsPuff(e.x, e.y, e.z, e.kind === 'ground' ? '150,140,120' : '190,190,180', 3);
    if (mine && i < 3 && typeof zeShot === 'function') zeShot(x, y, z, lh, lp, by);   // [egg hook]
  }
  // the smoke of it
  for (let i = 0; i < 26; i++) { const a = h + (Math.random() - 0.5) * 0.5, sp = 2 + Math.random() * 6; FPS.parts.push({ x: x + Math.sin(h) * 1.2, y: y + Math.cos(h) * 1.2, z: z - 0.3, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp, vz: Math.random() * 1.2, t: 0.9, c: '170,170,165', up: true }); }
  zxDeal(hits, 'u', mine);
  if (!mine) return;
  // thrown back where they stood, and down (the Breakwater: hurled across the room)
  const kb = t ? Math.min(7, 4 + 0.5 * (t - 1)) : 1.6, down = t ? Math.min(3, 1.5 + 0.2 * (t - 1)) : 0.5;
  for (const o of hits.keys()) zmpStatus(o, 'kb', Math.sin(h) * kb, Math.cos(h) * kb, down);
  // and you, back the way you came
  if (!zmIsDown() && !(FPS.me.dead > 0)) ZX.shove = { vx: -Math.sin(h) * w.shove / 0.28, vy: -Math.cos(h) * w.shove / 0.28, t: 0.28 };
}

// ---------- Boarding Axe: a wide sweep; every third stroke a chop (the Homeward Axe: a throw) ----------
function zxAxe(x, y, z, h, mine, t) {
  const w = FPSW.axe, k = ((FPS.swing || 1) - 1) % 3, chop = k === 2;
  if (!mine) return;
  if (typeof zeMelee === 'function') zeMelee(x, y, z, h, w, 'x');   // [egg hook] (the bell, the net)
  if (t && chop) {
    // thrown: out through them all, and home
    ZX.axeOut = true;
    ZX.proj.push({ k: 'X', by: FPS.me.id, mine: true, t: 0, x: x + Math.sin(h) * 0.8, y: y + Math.cos(h) * 0.8, z: z - 0.35, fz: FPS.me.jz || 0, h, out: 0, max: Math.min(26, 14 + 2 * t), back: false, hitO: new Set(), hitB: new Set(), spin: 0 });
    zxSound('throw');
    return;
  }
  let any = false;
  for (const o of ZM.z) {
    if (o.dead) continue;
    const d = Math.hypot(o.x - x, o.y - y), b = bearingOf(o.x - x, o.y - y);
    if (d > w.reach + FPSC.BODY + (o.rad ? o.rad - 0.3 : 0) || Math.abs(angDiff(b, h)) > (chop ? 0.62 : w.arc) || Math.abs((o.jz || 0) - (FPS.me.jz || 0)) > 1.2) continue;
    // (at the middle of its near side, as the knife does; one right at your feet struck anyway: src/zombies.js zmMelee)
    const rad = o.rad || FPSC.BODY, r = d < rad + 0.35 ? null : fpsRay(x, y, z - 0.4, b, Math.atan2(zmMid(o) - (z - FPSC.GROUND - 0.4), Math.max(0.3, d - rad * 0.8)), FPS.me.id, [o], w.reach + 1.5);
    if (r && r.kind !== 'body') continue;
    zmHurt(o, w.dmg * (chop ? 1.6 : 1), false, 'x', FPS.me.id); o.hitT = 0.25; any = true;
    if (chop) zmpStatus(o, 'kb', Math.sin(b) * 0.8, Math.cos(b) * 0.8, 1.1);
    for (let i = 0; i < 5; i++) FPS.parts.push({ x: o.x, y: o.y, z: zxG(o) + 1 + Math.random() * 0.5, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: Math.random() * 2, t: 0.45, c: '90,120,105' });
  }
  if (any) { zxMark(false); zxSound(chop ? 'chop' : 'cleave'); }
}

// ---------- what's thrown: lances, hooks, flares, nets, chain-shot (and the pods' irons, the shells' stars) ----------
function zxLaunch(code, x, y, z, h, p, by, mine, t) {
  const w = FPSW[ZX_ID[code]], cp = Math.cos(p);
  let ox = x + Math.sin(h) * cp * 0.7, oy = y + Math.cos(h) * cp * 0.7, oz = z - 0.2 + Math.sin(p) * 0.7;
  // (up against a wall: it leaves from your eyes)
  if (fpsRay(x, y, z, h, p, by, [], 0.8).kind !== 'none') { ox = x; oy = y; oz = z - 0.05; }
  const P = { k: code, by, mine, t: 0, tier: t, x: ox, y: oy, z: oz, vx: Math.sin(h) * cp * w.pv, vy: Math.cos(h) * cp * w.pv, vz: Math.sin(p) * w.pv, gr: w.gr, skip: new Set(), life: w.range / w.pv + (code === 'g' || code === 'y' ? 0 : 0.6), id: ++ZX.n, h };
  if (code === 'g') { P.caught = []; P.max = t ? Math.min(7, 1 + t) : 1; P.from = [x, y, z - 0.3]; }
  if (code === 'y') { P.hw = t ? Math.min(3, w.chainW + 0.3 * t) : w.chainW; P.bounces = t ? Math.min(4, t) : 0; P.hit = new Set(); P.spin = 0; }
  if (code === 's' && t) P.burstT = 0.5;
  ZX.proj.push(P);
}
function zxTick(dt) {
  if (!ZM.on) return;
  const m = FPS.me;
  // the Punt Gun's kick, carrying you back
  if (ZX.shove) { const S = ZX.shove; zmMove(m, S.vx * dt, S.vy * dt); S.t -= dt; if (S.t <= 0) ZX.shove = null; }
  for (const L of ZX.later) { L.t -= dt; if (L.t <= 0) { L.done = true; try { L.fn(); } catch (e) {} } }
  ZX.later = ZX.later.filter(L => !L.done);
  for (const P of ZX.proj) zxProj(P, dt);
  ZX.proj = ZX.proj.filter(P => !P.done);
  ZX.axeOut = ZX.proj.some(P => P.k === 'X' && P.mine);
  // (the Homeward Axe out of your hand: nothing to swing till it's back; a gun in your hand fires as ever)
  if (ZX.axeOut && FPS.weapon === 'axe') m.cd = Math.max(m.cd, 0.05);
  zxPools(dt); zxNets(dt);
  if (typeof zrTick === 'function') zrTick(dt);   // [crab]
  // set alight by a flare: they burn on a while
  for (const B of ZX.burn) {
    B.t -= dt; B.k -= dt;
    if (B.o.dead) { B.t = 0; continue; }
    B.o.scorch = 1;
    if (Math.random() < dt * 20) FPS.parts.push({ x: B.o.x + (Math.random() - 0.5) * 0.5, y: B.o.y + (Math.random() - 0.5) * 0.5, z: zxG(B.o) + 0.4 + Math.random() * 1.4, vx: 0, vy: 0, vz: 1.5, t: 0.5, c: Math.random() < 0.5 ? '255,170,70' : '255,220,120', up: true });
    if (B.k <= 0) { B.k = 0.3; zmHurt(B.o, zxHp() * 0.05, false, 's', FPS.me.id); }
  }
  ZX.burn = ZX.burn.filter(B => B.t > 0);
  for (const b of ZX.booms) b.t += dt;
  ZX.booms = ZX.booms.filter(b => b.t < 0.55);
}
function zxProj(P, dt) {
  P.t += dt;
  if (P.k === 'X') return zxAxeFly(P, dt);
  if (P.st === 'stuck') {
    // a lance (or a pod's iron) in something, its fuse burning down
    if (P.on) { if (!P.on.dead) { P.x = P.on.x + P.ox; P.y = P.on.y + P.oy; P.z = zxG(P.on) + P.oz; } else P.on = null; }
    P.fuse -= dt;
    if (Math.random() < dt * 30) FPS.parts.push({ x: P.x, y: P.y, z: P.z + 0.1, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, vz: 1 + Math.random(), t: 0.3, c: '255,210,120' });
    if (P.fuse <= 0) { P.done = true; zxBlast(P); }
    return;
  }
  if (P.st === 'reel') { P.reelT -= dt; if (P.reelT <= 0) P.done = true; return; }
  if (P.burstT != null && P.t >= P.burstT) { P.done = true; zxStarBurst(P); return; }
  if (P.k === 's' || P.k === 't') { if (Math.random() < dt * 60) FPS.parts.push({ x: P.x, y: P.y, z: P.z, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), vz: -0.5 + Math.random(), t: 0.45, c: Math.random() < 0.6 ? '255,120,60' : '255,230,170' }); }
  if (P.k === 'w' && Math.random() < dt * 30) FPS.parts.push({ x: P.x, y: P.y, z: P.z, vx: 0, vy: 0, vz: 0.4, t: 0.6, c: '150,150,145', up: true });
  if (P.k === 'y') P.spin += dt * 22;
  if (P.t > P.life || Math.hypot(P.x - FPSC.CX, P.y - FPSC.CY) > FPSC.R) { zxLand(P, { kind: 'none', x: P.x, y: P.y, z: P.z }); return; }
  const steps = 4, sdt = dt / steps;
  for (let i = 0; i < steps && !P.done && !P.st; i++) {
    const ox = P.x, oy = P.y, oz = P.z;
    P.vz -= P.gr * sdt; P.x += P.vx * sdt; P.y += P.vy * sdt; P.z += P.vz * sdt;
    const seg = Math.hypot(P.x - ox, P.y - oy), hh = bearingOf(P.vx, P.vy), pp = Math.atan2(P.vz, Math.max(0.01, Math.hypot(P.vx, P.vy)));
    // (and the floor under it, wherever it is: the stair's treads and the tower's floors)
    const fl = FPSC.GROUND + zxFloor(P.x, P.y, P.z - FPSC.GROUND);
    if (P.k === 'y') {
      zxChainCut(P, ox, oy, oz);
      const r = fpsRay(ox, oy, oz, hh, pp, P.by, [], seg + 0.05);
      if (r.kind !== 'none' || P.z < fl) {
        if (P.bounces > 0 && r.kind !== 'ground' && P.z >= fl) { zxBounce(P, ox, oy, oz); continue; }
        P.x = r.kind !== 'none' ? r.x : P.x; P.y = r.kind !== 'none' ? r.y : P.y; zxLand(P, r);
      }
      continue;
    }
    const tg = P.k === 'w' || P.k === 'g' || P.k === 's' || P.k === 'n' ? ZM.z.filter(q => !q.dead && !P.skip.has(q)) : [];
    const r = fpsRay(ox, oy, oz, hh, pp, P.by, tg, seg + 0.05);
    if (r.kind === 'none' && P.z >= fl) continue;
    if (r.kind === 'none') { r.kind = 'ground'; r.x = P.x; r.y = P.y; r.z = fl; }
    P.x = r.x; P.y = r.y; P.z = r.z;
    zxContact(P, r);
  }
}
// what it does where it strikes (r: what fpsRay found)
function zxContact(P, r) {
  const mine = P.mine, w = FPSW[ZX_ID[P.k]] || FPSW.bomblance;
  // (a step back along its flight, out of the wall, for blasts and fires)
  const v = Math.hypot(P.vx, P.vy, P.vz) || 1, bx = P.x - P.vx / v * 0.3, by = P.y - P.vy / v * 0.3, bz = P.z - P.vz / v * 0.3;
  if (P.k === 'w' || P.k === 'i') {
    P.st = 'stuck'; P.fuse = P.k === 'w' ? w.fuse : P.fuse || 0.3;
    if (r.kind === 'body') {
      const o = r.who; P.on = o; P.ox = (r.x - o.x) * 0.6; P.oy = (r.y - o.y) * 0.6; P.oz = r.z - zxG(o);
      fpsPuff(r.x, r.y, r.z, '160,30,20', 8);
      if (mine && P.k === 'w') { zmHurt(o, r.head ? w.head : w.dmg, r.head, 'w', FPS.me.id); o.hitT = 0.25; zxMark(r.head); }
    } else { P.x = bx; P.y = by; P.z = bz; fpsPuff(r.x, r.y, r.z, '190,190,180', 5); }
    zxSound('stick', mine ? 0 : zxDist(P));
    return;
  }
  if (P.k === 'g') {
    if (r.kind === 'body') {
      const o = r.who;
      fpsPuff(r.x, r.y, r.z, '160,30,20', 6);
      if (mine) { zmHurt(o, r.head ? w.head : w.dmg, r.head, 'g', FPS.me.id); o.hitT = 0.25; zxMark(r.head); }
      P.caught.push(o); P.skip.add(o);
      if (P.caught.length < P.max && !o.boss) { zxSound('stick', 0); return; }   // (the Mooring Line: on it runs)
    } else fpsPuff(r.x, r.y, r.z, '190,190,180', 4);
    zxHaul(P);
    return;
  }
  if (P.k === 's') {
    if (r.kind === 'body') {
      const o = r.who; fpsPuff(r.x, r.y, r.z, '255,170,70', 10);
      if (mine) { zmHurt(o, r.head ? w.head : w.dmg, r.head, 's', FPS.me.id); o.hitT = 0.25; zxMark(r.head); if (!o.dead) ZX.burn.push({ o, t: 3, k: 0.3 }); }
      if (P.burstT != null) { P.done = true; P.x = bx; P.y = by; P.z = bz; zxStarBurst(P); return; }
      P.done = true; zxPool(o.x, o.y, o.jz || 0, 2.4, 6, mine, P.by, false); return;
    }
    if (P.burstT != null) { P.done = true; P.x = bx; P.y = by; P.z = bz; zxStarBurst(P); return; }
    P.done = true; zxPool(bx, by, zxFloor(bx, by, bz - FPSC.GROUND), 2.4, 6, mine, P.by, false); zxSound('fizz', mine ? 0 : zxDist(P));
    return;
  }
  if (P.k === 't') { P.done = true; zxPool(bx, by, zxFloor(bx, by, bz - FPSC.GROUND), 1.7, 5, mine, P.by, true); return; }
  if (P.k === 'n') {
    P.done = true;
    const fz = r.kind === 'body' ? (r.who.jz || 0) : zxFloor(bx, by, bz - FPSC.GROUND);
    zxNet(r.kind === 'body' ? r.who.x : bx, r.kind === 'body' ? r.who.y : by, fz, mine, P.tier);
    return;
  }
  P.done = true;
}
// came down with nothing struck (or flew its course)
function zxLand(P, r) {
  if (P.k === 'y') { P.done = true; fpsPuff(P.x, P.y, P.z, '190,190,180', 8); if (r.kind !== 'none') zxSound('clang', P.mine ? 0 : zxDist(P)); return; }
  if (P.k === 'g') { zxHaul(P); return; }
  zxContact(P, Object.assign({ kind: 'ground' }, r, { x: P.x, y: P.y, z: P.z }));
}
const zxDist = P => Math.hypot(P.x - FPS.me.x, P.y - FPS.me.y);

// Bomb-Lance: the blast (the Thunder-Pod: and its irons thrown out to go off in turn)
function zxBlast(P) {
  const w = FPSW.bomblance, small = P.k === 'i';
  zxBoom(P.x, P.y, P.z, small ? 2.6 : w.br, w.blast * (small ? 0.45 : 1), 'w', P.mine, small ? 0.5 : 1.2);
  if (!small && P.tier) {
    const n = Math.min(6, 1 + P.tier);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + Math.random() * 0.6, sp = 4 + Math.random() * 3;
      ZX.proj.push({ k: 'i', by: P.by, mine: P.mine, t: 0, tier: 0, x: P.x, y: P.y, z: P.z + 0.3, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp, vz: 4 + Math.random() * 2, gr: 12, skip: new Set(), life: 2.5, fuse: 0.18 + i * 0.14, id: ++ZX.n });
    }
  }
}
// a blast: everyone in reach (and in sight of it) hurt, more the nearer, and thrown back a little
function zxBoom(x, y, z, R, dmg, code, mine, kb) {
  ZX.booms.push({ x, y, z, R, t: 0 });
  zxSound('boom', mine ? 0 : Math.hypot(x - FPS.me.x, y - FPS.me.y), R);
  for (let i = 0; i < 24 + R * 4; i++) { const a = Math.random() * 6.283, sp = 2 + Math.random() * R * 2; FPS.parts.push({ x, y, z, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp, vz: Math.random() * 5, t: 0.5 + Math.random() * 0.3, c: Math.random() < 0.5 ? '255,190,90' : '120,110,100' }); }
  if (!mine) return;
  let any = false;
  for (const o of ZM.z) {
    if (o.dead) continue;
    const cz = zxG(o) + 1.0, d = Math.hypot(o.x - x, o.y - y, cz - z);
    if (d > R + (o.rad || 0.3)) continue;
    const hd = Math.hypot(o.x - x, o.y - y);
    if (hd > 0.6 && fpsRay(x, y, z, bearingOf(o.x - x, o.y - y), Math.atan2(cz - z, hd), FPS.me.id, [o], hd + 2).kind !== 'body') continue;
    zmHurt(o, dmg * (1 - 0.6 * Math.min(1, d / R)), false, code, FPS.me.id); o.hitT = 0.3; any = true;
    if (kb && hd > 0.05) zmpStatus(o, 'kb', (o.x - x) / hd * kb, (o.y - y) / hd * kb, 0.4);
  }
  if (any) zxMark(false);
}

// Grapnel: haul in what it caught (the Mooring Line: into a heap in front of you, lashed there)
function zxHaul(P) {
  P.st = 'reel'; P.reelT = 0.4; P.vx = P.vy = P.vz = 0;
  zxSound('reel', P.mine ? 0 : zxDist(P));
  if (!P.mine) return;
  const m = FPS.me, caught = P.caught.filter(o => !o.dead && !o.boss && o.st === 'in');
  if (!caught.length) return;
  if (!P.tier) {
    const o = caught[0], d = Math.hypot(m.x - o.x, m.y - o.y), pull = clamp(d - 1.5, 0, 8);
    if (d > 0.05) zmpStatus(o, 'kb', (m.x - o.x) / d * pull, (m.y - o.y) / d * pull, 1.3);
    return;
  }
  const tx = m.x + Math.sin(m.h) * 2.2, ty = m.y + Math.cos(m.h) * 2.2, n = caught.length;
  caught.forEach((o, i) => {
    const ax = tx + Math.cos(i * 2.4) * 0.35 * Math.min(1, i), ay = ty + Math.sin(i * 2.4) * 0.35 * Math.min(1, i);
    const dx = ax - o.x, dy = ay - o.y, d = Math.hypot(dx, dy), k = d > 8 ? 8 / d : 1;
    zmpStatus(o, 'kb', dx * k, dy * k, 0.7);
  });
  ZX.later.push({ t: 0.55, fn: () => {
    for (const o of caught) {
      if (o.dead) continue;
      zmpStatus(o, 'pin', Math.min(8, 2.5 + 0.5 * P.tier));
      if (n > 1) zmHurt(o, FPSW.grapnel.dmg * 0.5 * (n - 1), false, 'g', FPS.me.id);
    }
    zxSound('lash', 0);
  } });
}

// Flare Pistol: a ring of fire on the floor (r metres, T seconds); small: one of the Star Shell's stars
function zxPool(x, y, fz, r, T, mine, by, small) {
  ZX.pools.push({ x, y, fz, r, T, t: T, k: 0.2, mine, small, seed: Math.random() * 100 });
  if (ZX.pools.length > 24) ZX.pools.shift();
}
function zxPools(dt) {
  for (const F of ZX.pools) {
    F.t -= dt; F.k -= dt;
    const fade = Math.min(1, F.t / 1.2);
    if (!reduceMotion && Math.random() < dt * (F.small ? 14 : 30) * fade) { const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * F.r; FPS.parts.push({ x: F.x + Math.sin(a) * rr, y: F.y + Math.cos(a) * rr, z: FPSC.GROUND + F.fz + 0.1, vx: 0, vy: 0, vz: 1.2 + Math.random(), t: 0.5, c: Math.random() < 0.5 ? '255,150,60' : '255,215,120', up: true }); }
    if (!F.mine || F.k > 0) continue;
    F.k = 0.35;
    for (const o of ZM.z) {
      if (o.dead || Math.abs((o.jz || 0) - F.fz) > 1.3 || Math.hypot(o.x - F.x, o.y - F.y) > F.r + 0.25) continue;
      o.scorch = Math.min(1, (o.scorch || 0) + 0.4); o.hitT = 0.12;
      zmHurt(o, zxHp() * (F.small ? 0.05 : 0.07), false, 's', FPS.me.id);
    }
  }
  ZX.pools = ZX.pools.filter(F => F.t > 0);
}
// the Star Shell: up it bursts into burning stars that fall round where it was
function zxStarBurst(P) {
  const n = Math.min(9, 3 + (P.tier || 0));
  zxSound('burst', P.mine ? 0 : zxDist(P));
  ZX.booms.push({ x: P.x, y: P.y, z: P.z, R: 1.2, t: 0, star: true });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + Math.random() * 0.5, sp = 1.5 + Math.random() * (1.5 + 0.35 * P.tier);
    ZX.proj.push({ k: 't', by: P.by, mine: P.mine, t: 0, tier: 0, x: P.x, y: P.y, z: P.z, vx: Math.sin(a) * sp + P.vx * 0.15, vy: Math.cos(a) * sp + P.vy * 0.15, vz: 1 + Math.random() * 2, gr: 7, skip: new Set(), life: 4, id: ++ZX.n });
  }
}

// Net Mortar: the net opens where it falls, and holds what's under it (and what walks in)
function zxNet(x, y, fz, mine, t) {
  const N = { x, y, fz, r: t ? Math.min(4.5, 2.8 + 0.3 * t) : 2.8, T: t ? Math.min(9, 4 + 0.5 * t) : 4, caught: new Set(), k: 0, bite: 0.5, tier: t || 0, mine, seed: Math.random() * 6 };
  N.t = N.T;
  ZX.nets.push(N); if (ZX.nets.length > 8) ZX.nets.shift();
  zxSound('net', mine ? 0 : Math.hypot(x - FPS.me.x, y - FPS.me.y));
  if (mine) zxNetCatch(N, true);
}
function zxNetCatch(N, first) {
  let any = false;
  for (const o of ZM.z) {
    if (o.dead || N.caught.has(o) || o.st !== 'in' || Math.abs((o.jz || 0) - N.fz) > 1.4) continue;
    const d = Math.hypot(o.x - N.x, o.y - N.y); if (d > N.r + 0.2) continue;
    N.caught.add(o); any = true; o.hitT = 0.2;
    // (the Barbed Trawl hauls shut: those under it are dragged in towards the middle)
    const k = N.tier && d > 0.8 ? 0.45 : 0, px = o.x + (N.x - o.x) * k, py = o.y + (N.y - o.y) * k;
    zmpStatus(o, 'pin', Math.max(1, N.t), k ? px - FPSC.CX : undefined, k ? py - FPSC.CY : undefined);
    zmHurt(o, FPSW.netmortar.dmg, false, 'n', FPS.me.id);
  }
  if (any) zxMark(false);
}
function zxNets(dt) {
  for (const N of ZX.nets) {
    N.t -= dt; N.k -= dt; N.bite -= dt;
    if (!N.mine) continue;
    if (N.k <= 0) { N.k = 0.2; zxNetCatch(N, false); }
    if (N.tier && N.bite <= 0) {
      N.bite = 0.5;
      let any = false;
      for (const o of N.caught) if (!o.dead && Math.hypot(o.x - N.x, o.y - N.y) < N.r + 0.6) { zmHurt(o, 1.2, false, 'n', FPS.me.id); o.hitT = 0.15; any = true; }
      if (any) zxSound('bite', 0);
    }
  }
  ZX.nets = ZX.nets.filter(N => N.t > 0);
}

// Chain-Shot: everything the whirling bar passes, cut (and slowed)
function zxChainCut(P, ox, oy, oz) {
  const dx = P.x - ox, dy = P.y - oy, L = Math.hypot(dx, dy) || 1e-3, ux = dx / L, uy = dy / L, w = FPSW.chainshot;
  for (const o of ZM.z) {
    if (o.dead || P.hit.has(o)) continue;
    const rx = o.x - ox, ry = o.y - oy, along = rx * ux + ry * uy, side = Math.abs(rx * uy - ry * ux);
    if (along < -0.35 || along > L + 0.35 || side > P.hw + (o.rad || 0.3)) continue;
    const hz = P.z - zxG(o); if (hz < -0.3 || hz > (o.tall || 1.9) + 0.2) continue;
    P.hit.add(o); o.hitT = 0.25;
    for (let i = 0; i < 6; i++) FPS.parts.push({ x: o.x, y: o.y, z: zxG(o) + 0.6 + Math.random() * 0.8, vx: ux * 4 + (Math.random() - 0.5) * 2, vy: uy * 4 + (Math.random() - 0.5) * 2, vz: Math.random() * 2, t: 0.45, c: '90,120,105' });
    if (P.mine) { zmHurt(o, w.dmg, false, 'y', FPS.me.id); zmpStatus(o, 'slow', P.tier ? Math.min(10, 4 + P.tier) : 2.5); zxMark(false); }
  }
}
// the Reaping Chain: off the wall it goes, and cuts again
function zxBounce(P, ox, oy, oz) {
  // (which way the wall faces: feel along each axis for it)
  const reach = 0.9, bx = Math.abs(P.vx) > 0.5 && fpsRay(ox, oy, oz, P.vx > 0 ? Math.PI / 2 : -Math.PI / 2, 0, P.by, [], reach).kind !== 'none';
  const by = Math.abs(P.vy) > 0.5 && fpsRay(ox, oy, oz, P.vy > 0 ? 0 : Math.PI, 0, P.by, [], reach).kind !== 'none';
  if (bx || !by) P.vx = -P.vx; if (by || !bx) P.vy = -P.vy;
  P.x = ox; P.y = oy; P.z = oz; P.bounces--; P.hit = new Set(); P.life = P.t + 1.1;
  fpsPuff(ox, oy, oz, '200,200,190', 6);
  zxSound('clang', P.mine ? 0 : zxDist(P));
}

// the Homeward Axe, thrown: out (through them all) and home again to the hand that threw it
function zxAxeFly(P, dt) {
  const w = FPSW.axe, who = P.by === FPS.me.id ? FPS.me : FPS.remote.get(P.by);
  P.spin += dt * 18;
  const sp = P.back ? 24 : 21;
  let nx, ny;
  if (!P.back) { nx = P.x + Math.sin(P.h) * sp * dt; ny = P.y + Math.cos(P.h) * sp * dt; P.out += sp * dt; }
  else {
    if (!who) { P.done = true; return; }
    const tx = who.x, ty = who.y, d = Math.hypot(tx - P.x, ty - P.y);
    if (d < 1.0 || P.t > 5) { P.done = true; zxSound('catch', P.mine ? 0 : zxDist(P)); return; }
    nx = P.x + (tx - P.x) / d * sp * dt; ny = P.y + (ty - P.y) / d * sp * dt;
    P.z += ((FPSC.GROUND + FPSC.EYE - 0.4 + (who.jz || 0)) - P.z) * Math.min(1, dt * 4); P.fz = who.jz || 0;
  }
  if (!P.back && (P.out >= P.max || zmBlockedAt(nx, ny, 0.2, P.fz))) { P.back = true; if (P.out < P.max) { fpsPuff(P.x, P.y, P.z, '190,190,180', 6); zxSound('clang', P.mine ? 0 : zxDist(P)); } return; }
  P.x = nx; P.y = ny;
  const set = P.back ? P.hitB : P.hitO;
  for (const o of ZM.z) {
    if (o.dead || set.has(o) || Math.hypot(o.x - P.x, o.y - P.y) > 0.9 + (o.rad || 0.3) || Math.abs(zxG(o) + 1 - P.z) > 1.3) continue;
    set.add(o); o.hitT = 0.25;
    fpsPuff(o.x, o.y, zxG(o) + 1.2, '90,120,105', 6);
    if (P.mine) { zmHurt(o, w.dmg * 1.25, false, 'x', FPS.me.id); zxMark(false); zxSound('cleave', 0); }
  }
}

// ---------- sounds ----------
function zxSound(k, d, extra) {
  try {
    if (soundOff()) return;
    const v = Math.max(0.05, 1 - (d || 0) / 300), o = {};
    { const R = { d: 'duckfoot', w: 'harpoon', g: 'grapnel', s: 'flaregun', x: 'axechop', u: 'puntgun', n: 'netmortar', y: 'chainshot', boom: 'explode' }[k]; if (R && sfxPlay(R, { vol: (k === 'x' ? 0.6 : k === 'boom' ? ((extra || 3) > 3 ? 1 : 0.7) : 0.95) * v, vary: 0.1 })) return; }   // (the recordings: src/sfxbank.js)
    if (k === 'd') { for (let i = 0; i < 4; i++) noise('lowpass', 1500 * v + 300, 0.7, 0.002, 0.42 * v, 0.24, { delay: i * 0.022 }); tone(110, 'triangle', 0.002, 0.25 * v, 0.2, { to: 50 }); }
    else if (k === 'w') { noise('lowpass', 700, 0.8, 0.003, 0.55 * v, 0.35); tone(80, 'triangle', 0.003, 0.35 * v, 0.25, { to: 40 }); noise('highpass', 2500, 0.8, 0.05, 0.1 * v, 0.7); }
    else if (k === 'g') { tone(240, 'sawtooth', 0.002, 0.12 * v, 0.25, { to: 120 }); noise('lowpass', 600, 0.8, 0.002, 0.35 * v, 0.2); noise('bandpass', 1800, 2, 0.03, 0.08 * v, 0.5, { to: 900 }); }
    else if (k === 's') { noise('lowpass', 1200, 0.8, 0.002, 0.4 * v, 0.2); noise('bandpass', 3200, 1.5, 0.02, 0.14 * v, 1.0, { to: 1800 }); }
    else if (k === 'x') { noise('bandpass', 900, 1.4, 0.04, 0.26 * v, 0.24, { to: 500 }); }
    else if (k === 'u') { noise('lowpass', 650 * v + 200, 0.6, 0.002, 1.0 * v, 1.2); tone(42, 'sawtooth', 0.002, 0.5 * v, 0.6, { to: 24 }); noise('highpass', 1800, 0.7, 0.002, 0.25 * v, 0.4); }
    else if (k === 'n') { tone(70, 'sine', 0.003, 0.45 * v, 0.3, { to: 40 }); noise('lowpass', 500, 1, 0.003, 0.4 * v, 0.3); noise('bandpass', 700, 3, 0.05, 0.1 * v, 0.5); }
    else if (k === 'y') { noise('lowpass', 900 * v + 250, 0.6, 0.002, 0.7 * v, 0.5); noise('lowpass', 900 * v + 250, 0.6, 0.002, 0.5 * v, 0.4, { delay: 0.03 }); noise('bandpass', 1400, 4, 0.05, 0.12 * v, 0.9, { to: 700 }); }
    else if (k === 'boom') { const big = (extra || 3) > 3; noise('lowpass', big ? 500 : 900, 0.7, 0.003, (big ? 0.9 : 0.5) * v, big ? 1.1 : 0.5); tone(big ? 48 : 70, 'sawtooth', 0.003, 0.4 * v, big ? 0.7 : 0.3, { to: 25 }); }
    else if (k === 'stick') { noise('bandpass', 600, 3, 0.002, 0.2 * v, 0.12); tone(160, 'triangle', 0.002, 0.1 * v, 0.1); }
    else if (k === 'reel') { for (let i = 0; i < 5; i++) tone(900 + i * 40, 'square', 0.001, 0.03 * v, 0.03, { delay: i * 0.06 }); }
    else if (k === 'lash') { noise('bandpass', 400, 2, 0.01, 0.25, 0.3); tone(90, 'triangle', 0.003, 0.2, 0.3, { to: 50 }); }
    else if (k === 'fizz') { noise('highpass', 3000, 0.8, 0.02, 0.1 * v, 1.2); }
    else if (k === 'burst') { noise('lowpass', 1500, 0.8, 0.002, 0.45 * v, 0.4); for (let i = 0; i < 4; i++) noise('highpass', 2500, 1, 0.01, 0.08 * v, 0.3, { delay: 0.1 + i * 0.08 }); }
    else if (k === 'net') { noise('bandpass', 500, 1.2, 0.02, 0.25 * v, 0.35, { to: 250 }); tone(60, 'sine', 0.01, 0.15 * v, 0.2); }
    else if (k === 'bite') { noise('bandpass', 2400, 4, 0.002, 0.06, 0.08); }
    else if (k === 'clang') { tone(620, 'square', 0.001, 0.08 * v, 0.25, { to: 520 }); tone(1310, 'sine', 0.001, 0.05 * v, 0.4); }
    else if (k === 'throw') { noise('bandpass', 1200, 2, 0.02, 0.2, 0.5, { to: 600 }); }
    else if (k === 'catch') { tone(300, 'triangle', 0.002, 0.15 * v, 0.12); noise('bandpass', 800, 3, 0.002, 0.12 * v, 0.1); }
    else if (k === 'cleave') { noise('bandpass', 500, 2, 0.002, 0.22, 0.14); }
    else if (k === 'chop') { noise('lowpass', 400, 1, 0.002, 0.35, 0.25); tone(70, 'triangle', 0.002, 0.25, 0.2, { to: 40 }); }
  } catch (e) {}
}

// ---------- in 3D: the light of the flares, their fires and the blasts (three lamps, given to the nearest) ----------
const ZX3 = { grp: null, L: [] };
function zx3d(dt) {
  if (!Z3.grp) return;
  if (typeof zr3d === 'function') zr3d(dt);   // [crab] the Hermit's Claw's crabs
  if (ZX3.grp !== Z3.grp) { ZX3.grp = Z3.grp; ZX3.L = []; for (let i = 0; i < 3; i++) { const L = new THREE.PointLight(0xff9a40, 0, 9, 1.6); Z3.grp.add(L); ZX3.L.push(L); } }
  const m = FPS.me, src = [], t = g.t;
  for (const F of ZX.pools) src.push([F.x, F.y, FPSC.GROUND + F.fz + 0.6, (F.small ? 1.0 : 1.8) * Math.min(1, F.t / 1.2) * (reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 19 + F.seed)), 0xff9a40, F.small ? 6 : 9]);
  for (const P of ZX.proj) if (P.k === 's' || P.k === 't') src.push([P.x, P.y, P.z, 1.6, 0xff6a3a, 8]);
  for (const b of ZX.booms) src.push([b.x, b.y, b.z, (b.star ? 3 : 5) * (1 - b.t / 0.55), b.star ? 0xffd0a0 : 0xffc070, b.R * 3.5]);
  src.sort((a, b) => Math.hypot(a[0] - m.x, a[1] - m.y) - Math.hypot(b[0] - m.x, b[1] - m.y));
  ZX3.L.forEach((L, i) => {
    const s = src[i];
    if (!s) { L.intensity = 0; return; }
    L.position.copy(z3v(s[0], s[1], s[2])); L.intensity = s[3] * flashK(); L.color.setHex(s[4]); L.distance = s[5];
  });
}

// ---------- painted over the view: what's flying, the fires, the nets, the blasts, the hauling lines ----------
function zxDrawOver() {
  if (typeof zrDrawOver === 'function') zrDrawOver();   // [crab]
  const tm = FPS.g ? FPS.g.t : 0, G0 = FPSC.GROUND;
  const line = (pts, col, lw) => { const p = polyProj(pts); if (p.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); ctx.stroke(); };
  const dot = (x, y, z, r, col, glow) => {
    const c = cam(x, y, z); if (c.f < 0.4) return; const q = proj(c), s = Math.max(1.5, r * q.s);
    if (glow) { const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s * 4); gr.addColorStop(0, glow); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, s * 4, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, 6.283); ctx.fill();
  };
  const ring = (x, y, z, r, n) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283; pts.push([x + Math.sin(a) * r, y + Math.cos(a) * r, z]); } return pts; };
  ctx.save(); ctx.lineCap = 'round';
  // the fires on the floor: a glowing ring, and tongues of flame
  for (const F of ZX.pools) {
    const fade = Math.min(1, F.t / 1.2), z = G0 + F.fz + 0.03, p = polyProj(ring(F.x, F.y, z, F.r, 20));
    if (p.length > 2) { ctx.fillStyle = `rgba(255,120,40,${0.16 * fade})`; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = `rgba(255,170,80,${0.5 * fade})`; ctx.lineWidth = 2; ctx.stroke(); }
    const n = F.small ? 7 : 14;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + F.seed, rr = F.r * Math.sqrt((i + 0.5) / n), x = F.x + Math.sin(a) * rr, y = F.y + Math.cos(a) * rr;
      const ht = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(tm * 11 + i * 1.7 + F.seed))) * fade * (F.small ? 0.8 : 1);
      line([[x, y, z], [x + Math.sin(tm * 5 + i) * 0.06, y, z + ht]], `rgba(255,${150 + (i % 3) * 30},70,${0.75 * fade})`, 3.5);
      line([[x, y, z], [x, y, z + ht * 0.55]], `rgba(255,240,180,${0.8 * fade})`, 1.6);
    }
  }
  // the nets: a mesh on the floor, lead weights round its edge, and wound round those it holds
  for (const N of ZX.nets) {
    const a0 = Math.min(1, N.t / 0.6), open = Math.min(1, (N.T - N.t) / 0.25), r = N.r * open, z = G0 + N.fz + 0.06;
    const col = `rgba(200,190,150,${0.55 * a0})`;
    for (let i = -3; i <= 3; i++) for (const dir of [0, 1]) {
      const c = i / 3.5 * r, half = Math.sqrt(Math.max(0, r * r - c * c)), ca = N.seed + dir * Math.PI / 2, ux = Math.sin(ca), uy = Math.cos(ca);
      line([[N.x + ux * c - uy * half, N.y + uy * c + ux * half, z], [N.x + ux * c + uy * half, N.y + uy * c - ux * half, z]], col, 1.2);
    }
    line(ring(N.x, N.y, z, r, 18).concat([[N.x + Math.sin(0) * r, N.y + Math.cos(0) * r, z]]), `rgba(170,150,110,${0.7 * a0})`, 2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; dot(N.x + Math.sin(a) * r, N.y + Math.cos(a) * r, z + 0.05, 0.06, `rgba(70,70,75,${a0})`); }
    for (const o of N.caught) {
      if (o.dead || Math.hypot(o.x - N.x, o.y - N.y) > N.r + 0.8) continue;
      const b = zxG(o);
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + N.seed; line([[o.x + Math.sin(a) * 0.38, o.y + Math.cos(a) * 0.38, b + 0.1], [o.x + Math.sin(a + 2) * 0.32, o.y + Math.cos(a + 2) * 0.32, b + 1.75]], `rgba(220,205,160,${0.75 * a0})`, 1.3); }
      if (N.tier) dot(o.x, o.y, b + 1.0, 0.05, `rgba(255,200,120,${a0})`);
    }
  }
  // what's flying
  for (const P of ZX.proj) {
    const v = Math.hypot(P.vx || 0, P.vy || 0, P.vz || 0) || 1, dx = (P.vx || 0) / v, dy = (P.vy || 0) / v, dz = (P.vz || 0) / v;
    if (P.k === 'w') {
      const L = 1.5, tail = [P.x - dx * L, P.y - dy * L, P.z - dz * L];
      if (P.st === 'stuck') { const a = P.on ? bearingOf(P.on.x - FPS.me.x, P.on.y - FPS.me.y) : 0; tail[0] = P.x - Math.sin(P.h || a) * 0.9; tail[1] = P.y - Math.cos(P.h || a) * 0.9; tail[2] = P.z + 0.15; }
      line([tail, [P.x, P.y, P.z]], '#2a2a30', 3);
      dot(tail[0] * 0.7 + P.x * 0.3, tail[1] * 0.7 + P.y * 0.3, tail[2] * 0.7 + P.z * 0.3, 0.07, '#5a4a30');
      if (P.st === 'stuck') dot(P.x, P.y, P.z + 0.1, 0.03, 'rgba(255,230,160,1)', `rgba(255,190,90,${0.5 + 0.5 * Math.sin(tm * 30)})`);
    } else if (P.k === 'i') { dot(P.x, P.y, P.z, 0.06, '#3a3a40', P.st === 'stuck' ? `rgba(255,200,100,${0.5 + 0.5 * Math.sin(tm * 40)})` : null); }
    else if (P.k === 'g') {
      const who = P.by === FPS.me.id ? FPS.me : FPS.remote.get(P.by); let hx = P.x, hy = P.y, hz = P.z;
      if (P.st === 'reel' && who) { const k = 1 - P.reelT / 0.4; hx += (who.x - hx) * k; hy += (who.y - hy) * k; hz += (G0 + FPSC.EYE - 0.4 + (who.jz || 0) - hz) * k; }
      if (who) {
        const a = who === FPS.me ? [who.x + Math.sin(who.h) * 0.6, who.y + Math.cos(who.h) * 0.6, G0 + FPSC.EYE - 0.4 + (who.jz || 0)] : [who.x, who.y, G0 + 1.3 + (who.jz || 0)], pts = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([a[0] + (hx - a[0]) * u, a[1] + (hy - a[1]) * u, a[2] + (hz - a[2]) * u - Math.sin(u * Math.PI) * (P.st === 'reel' ? 0.05 : 0.25)]); }
        line(pts, 'rgba(200,180,130,0.85)', 1.4);
      }
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + P.t * 4; line([[hx, hy, hz], [hx + Math.sin(a) * 0.2 + dx * 0.1, hy + Math.cos(a) * 0.2 + dy * 0.1, hz + 0.12]], '#3a3a42', 2.4); }
    } else if (P.k === 's' || P.k === 't') { dot(P.x, P.y, P.z, P.k === 's' ? 0.07 : 0.05, 'rgba(255,240,200,1)', 'rgba(255,110,50,0.7)'); }
    else if (P.k === 'n') {
      dot(P.x, P.y, P.z, 0.22, 'rgba(150,135,100,0.95)');
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + P.t * 3; dot(P.x + Math.sin(a) * 0.3, P.y + Math.cos(a) * 0.3, P.z, 0.06, '#3a3a40'); }
    } else if (P.k === 'y') {
      const sx = Math.cos(P.spin), sy = Math.sin(P.spin), px = -dy, py = dx;   // (the bar whirls flat, across its flight)
      const ax = P.x + (px * sx + dx * sy) * P.hw, ay = P.y + (py * sx + dy * sy) * P.hw, bx = P.x - (px * sx + dx * sy) * P.hw, by = P.y - (py * sx + dy * sy) * P.hw;
      line([[ax, ay, P.z], [bx, by, P.z]], 'rgba(60,60,64,0.95)', 2.5);
      line([[ax, ay, P.z], [bx, by, P.z]], `rgba(200,210,220,${P.tier ? 0.55 : 0.25})`, 1);
      dot(ax, ay, P.z, 0.12, '#2a2a2e'); dot(bx, by, P.z, 0.12, '#2a2a2e');
    } else if (P.k === 'X') {
      for (let k = 0; k < 2; k++) { const a = P.spin + k * Math.PI; line([[P.x - Math.sin(a) * 0.45 * Math.sin(P.h + 1.57), P.y - Math.sin(a) * 0.45 * Math.cos(P.h + 1.57), P.z - Math.cos(a) * 0.45], [P.x + Math.sin(a) * 0.45 * Math.sin(P.h + 1.57), P.y + Math.sin(a) * 0.45 * Math.cos(P.h + 1.57), P.z + Math.cos(a) * 0.45]], k ? 'rgba(255,200,110,0.9)' : '#5a3a22', k ? 4 : 3); }
      dot(P.x, P.y, P.z, 0.08, 'rgba(255,220,150,0.9)', 'rgba(255,180,80,0.35)');
    }
  }
  // the blasts: a flash and a ring going out
  for (const b of ZX.booms) {
    const c = cam(b.x, b.y, b.z); if (c.f < 0.4) continue;
    const q = proj(c), k = b.t / 0.55, s = Math.max(6, b.R * q.s * (0.4 + k * 0.8));
    const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s);
    gr.addColorStop(0, b.star ? `rgba(255,240,210,${0.9 * (1 - k)})` : `rgba(255,236,190,${0.95 * (1 - k)})`); gr.addColorStop(0.4, `rgba(255,150,60,${0.55 * (1 - k)})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, 6.283); ctx.fill();
    if (!b.star) line(ring(b.x, b.y, b.z - 0.6, b.R * (0.3 + k * 0.8), 20).concat([[b.x, b.y + b.R * (0.3 + k * 0.8), b.z - 0.6]]), `rgba(255,210,150,${0.6 * (1 - k)})`, 2);
  }
  ctx.restore();
}
