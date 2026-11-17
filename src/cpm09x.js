'use strict';
// The Chronicle of the Light, mission 9: Keeper's Last Light. Its three nights at the keeper's station (src/cpm09.js
// has the mission itself and its cinematics), and the tools they're built with, which mission 13 (src/cpm13x.js,
// Wrackhaven) borrows too.
//
// The place: the station is laid out as the Lighthouse lays it out (src/zombies.js FPI_GEN.light), the same jetty, the
// same courtyard and rooms round the same tower, and then stripped of the Lighthouse's own trade (FPI_GEN.cp9): no
// prices on the walls, no tonics for sale, no wreck chest, no bench, no lever for points. Every door stands open (the
// keeper keeps no locks against his own crew). What's chalked on the boards is gone; the boards stay.
//
// The nights:
//  I.   The First Night (cp_m09dusk). Dusk on the jetty. Up through the sea gate to the keeper Holm in the courtyard;
//       nail the boards over the courtyard's six windows before the light goes (a dusk that really darkens as the
//       clock runs); then hold the courtyard through three waves: up the shingle to the sea wall, then up the jetty's
//       ladders and in through the gate, then the first Diver, out of the harbour onto the T-head. The drowned go for
//       Holm as readily as for you, and he has only his lantern.
//  II.  The Ninth Night (cp_m09oil). The lamp is drinking the last of its oil. Holm tends it at the top of the tower;
//       carry the casks up to him, one at a time, ninety steps a trip, from the Oil Store, the Boathouse and the
//       courtyard. A crab tide pours in at the ground's windows, and the drowned climb the tower's walls to the stair.
//       Let the lamp run dry and the Light goes out.
//  III. The Worst Night (cp_m09worst). A winter storm, and the lantern room under siege: the drowned come up the
//       outside of the tower and over the gallery's rail, in at the two gallery doors, and paw at the lamp. Holm keeps
//       it burning while nobody is on him. Halfway to dawn the Mooncusser hauls himself over the rail, and while his
//       false light is up the true one falters (and dawn won't come while he stands). Put him down and Holm throws
//       the lever: the Light comes up full and its beam burns them off the tower until the sun is up.
//
// The tools (c9..., used by both missions; all host-authoritative, as the raid is):
//  - People (c9Npc*): figures of the period (src/cpkit.js cpkNpc) with a name, a strength the drowned can take off them,
//    and a way of moving: walked to a place (n.to), or following someone (n.f, a player's id, or another of them, by
//    the trail its leader left: no grid needed, so they go wherever a player has walked). The drowned come for them as
//    they come for you (the stage's players hook). Packed in the host's word as rows; joined screens ease to them.
//  - The drowned in at a window (c9Drown), up out of the ground or a floor (c9Rise), a crab at a window (c9Crab), a
//    boss inside or rising (c9Boss): src/zombies.js's own, made here so each night decides where they come from.
//  - Ammunition: a powder chest you can take a full load from (c9Ammo*).
//  - The sky: dusk to night to dawn, a storm's lightning (c9Sky).
//  - Actors for the cinematics: drowned, bosses and crabs built from their own models and posed by hand (c9Act).

// ---------- the station, without its trade ----------
FPS_ISLES.cp9 = FPS_ISLES.light;
var C9_KEEP = ['doors', 'windows', 'buys', 'perks', 'spawns', 'lights', 'glass', 'glassQ', 'tower', 'top', 'keep', 'bay', 'decks', 'far'];
FPI_GEN.cp9 = {
  built: true,
  set(H) {
    FPI_GEN.light.set(H);
    const Z = H.I.zm;
    // (only the station itself: nothing of the Lighthouse's own nights)
    for (const k of Object.keys(Z)) if (!C9_KEEP.includes(k)) delete Z[k];
    Z.buys.length = 0; Z.perks.length = 0; Z.spawns.length = 0;
    const S = RAID_STAGES[RAID_ORDER[RAID.stage]];
    if (S && S.lay) S.lay(H, zmKit(H, Z), Z);
  },
  decor() {},
};
// the station's map, for a stage laid out on it
function c9Map(start, top) {
  return { isle: 'cp9', start, top, zones: Object.assign({}, ZM_MAPS.light.zones), nav: [-46, 46, -68, 28], shore: ZM_SHORE0 };
}
// (raidMapFor: the tower's rooms count as rooms while one of these is laid out; put back as it's left)
function c9Tower(on) { ZM_MAPS.campaign.tower = !!on; }

// ---------- shared: the stage made ready ----------
// every door open, without a sound; every room open to the drowned; nothing to buy; the round set (their strength)
function c9Ready(round) {
  const I = FPS.g.isle;
  let ch = false;
  for (const d of ZM.doors) if (!d.open) { d.open = true; d.openT = 9; I.solids = I.solids.filter(s => !d.solids.includes(s)); ch = true; }
  if (ch) fpiIndex(I);
  ZM.open = new Set(['raid'].concat(Object.keys(ZM_ZONES), Object.keys(ZM_TROOMS)));
  ZM.buys = []; ZM.perksAt = []; ZM.spawns = [];
  ZM.round = round || 4;
  if (typeof ZB !== 'undefined') { ZB.round = ZM.round; ZB.plan = []; }
  for (const w of ZM.windows) { w.boards = w.sea ? 0 : 6; w.q = []; w.fall = []; }
  zmNavBuild(); ZM.navT = 0;
  // (a full load to start each night with)
  c9AmmoFill(true);
}
const c9N = () => Math.max(1, (ZM.hum || []).length);
const c9L = (x, y) => [FPSC.CX + x, FPSC.CY + y];
// where someone is (hosting: anyone; joined: only you)
function c9Who(sid) {
  const m = FPS.me;
  if (!sid || sid === m.id) return m.dead > 0 ? null : { x: m.x, y: m.y, jz: m.jz || 0, down: zmIsDown(), me: true };
  const r = FPS.remote.get(sid); return r && !r.dead && r.x != null ? { x: r.x, y: r.y, jz: r.jz || 0, down: !!r.down } : null;
}
// everyone standing, hosting (you and the rest), as [sid, x, y, jz]
function c9All() {
  const out = [], m = FPS.me;
  if (!(m.dead > 0)) out.push([m.id, m.x, m.y, m.jz || 0, zmIsDown()]);
  if (ZM.net === 'host') for (const r of FPS.remote.values()) if (!r.dead && r.x != null) out.push([r.id, r.x, r.y, r.jz || 0, !!r.down]);
  return out;
}

// ---------- shared: the drowned, from where the night says ----------
// one in at window w (as src/zombies.js zmSpawn, but at the window given): o.kind, o.hp (times the round's), o.w (a tag)
function c9Drown(w, o) {
  o = o || {};
  const r = ZM.round, run = clamp((r - 5) * 0.1, 0, 0.7), jog = clamp((r - 2) * 0.15, 0, 1 - run), u = Math.random();
  const kind = o.kind || (u < run ? 'run' : u < run + jog ? 'jog' : 'walk');
  const [sx, sy] = zmSpawnPoint(w), hp = zmHp(r) * (o.hp || 1) * (0.9 + Math.random() * 0.2), zn = ++ZM.zc;
  const z = {
    drowned: true, zm: true, zn, id: 'z' + zn.toString(36), n: 'a drowned man', x: sx, y: sy, jz: 0, fl: 0, zpad: 0.27,
    hp, max: hp, kind, sp: kind === 'run' ? 5.0 + Math.random() * 0.6 : kind === 'jog' ? 3.2 + Math.random() * 0.4 : 1.55 + Math.random() * 0.35,
    st: 'out', win: w, t: 0, ph: Math.random() * 6, hitT: 0, atk: 0.6, swing: -1, stuck: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [], c9w: o.w,
  };
  z.h = bearingOf(w.x - z.x, w.y - z.y);
  w.q.push(z); ZM.z.push(z); FPS.drowned = ZM.z;
  return z;
}
// one rising up out of the ground, or up over the edge of a floor jz high (world x, y)
function c9Rise(x, y, jz, o) {
  o = o || {};
  const z = raidSpawnAt(x, y, { kind: o.kind || (Math.random() < 0.5 ? 'walk' : 'jog'), hp: zmHp(ZM.round) * (o.hp || 1) * (0.9 + Math.random() * 0.2), rise: o.rise || 1.3 });
  z.rb = jz || 0; z.fl = jz || 0; z.jz = (jz || 0) - 1.9; z.c9w = o.w;
  if (o.h != null) z.h = o.h;
  return z;
}
// a crab in at window w
function c9Crab(w, o) {
  o = o || {};
  const [sx, sy] = zmSpawnPoint(w), hp = zmHp(ZM.round) * ZWC.HP * (o.hp || 1) * (0.85 + Math.random() * 0.3), zn = ++ZM.zc;
  const z = zwDress({
    drowned: true, zm: true, zn, id: 'z' + zn.toString(36), x: sx, y: sy, jz: 0, fl: 0,
    hp, max: hp, sp: ZWC.SP[0] + Math.random() * (ZWC.SP[1] - ZWC.SP[0]),
    st: 'out', win: w, t: 0, ph: Math.random() * 6, hitT: 0, atk: 0.4, swing: -1, stuck: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    lane: (Math.random() - 0.5) * 1.4, c9w: o.w,
  });
  z.h = bearingOf(w.x - z.x, w.y - z.y);
  ZM.z.push(z); FPS.drowned = ZM.z;
  return z;
}
// a boss (diver, moon, crab), already in at world (x, y) on a floor jz high; o.rise: up out of it; o.k: its strength
// against the Lighthouse's at round o.r (10 if not said), for this many of you
function c9Boss(kind, x, y, jz, o) {
  o = o || {};
  const T = ZBT[kind], hp = zbHpOf(kind, o.r || 10, c9N()) * (o.k || 1), zn = ++ZM.zc;
  const z = {
    drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss',
    x, y, jz: jz || 0, fl: jz || 0, hp, max: hp, sp: T.sp(o.r || 10),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: o.h || 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: x, iy: y, ax: 0, ay: 0, lx: x, ly: y, c9w: o.w,
  };
  if (T.init) T.init(z);
  zbMake(z, kind);
  if (o.rise) { z.rr = z.rr0 = o.rise; z.rb = jz || 0; z.jz = (jz || 0) - 2.4; }
  ZM.z.push(z); FPS.drowned = ZM.z;
  ZB.seen.add(zn);
  return z;
}
const c9Alive = tag => ZM.z.filter(z => !z.dead && (tag == null || z.c9w === tag)).length;

// ---------- shared: people ----------
// n: { k (CP_CAST), x, y, jz, h (world), hp, max, cols, lan, to: [x, y, jz] (walking there), pace, f: who they follow,
// trail, gone, safe, at: anything of the stage's own }
function c9NpcNew(k, x, y, jz, o) {
  const [wx, wy] = c9L(x, y);
  return Object.assign({ k, x: wx, y: wy, jz: jz || 0, h: 0, hp: 10, max: 10, cols: null, lan: true, to: null, pace: 1.7, f: null, trail: [], gone: 0, safe: 0, spd: 0, hitT: 0, mend: 0 }, o || {});
}
// (hosting or alone) each person this frame: walking, following, hurt
function c9NpcTick(list, dt) {
  for (const n of list) {
    if (n.gone) { n.spd = 0; continue; }
    const x0 = n.x, y0 = n.y;
    if (n.f != null) c9NpcFollow(n, list, dt);
    else if (n.to || (n.route && n.route.length)) {
      // (walking to a place, or along a route of them; a height with it is climbed evenly on the way, as up a stair)
      if (!n.to) { n.to = n.route.shift(); n.from = null; }
      if (!n.from) n.from = [n.x, n.y, n.jz];
      const dx = n.to[0] - n.x, dy = n.to[1] - n.y, d = Math.hypot(dx, dy), d0 = Math.max(0.01, Math.hypot(n.to[0] - n.from[0], n.to[1] - n.from[1]));
      if (d < 0.08) { if (n.to[2] != null) n.jz = n.to[2]; n.to = null; n.from = null; if (!(n.route && n.route.length) && n.face != null) n.h = n.face; }
      else { const s = Math.min(d, n.pace * dt); n.x += dx / d * s; n.y += dy / d * s; n.h += angDiff(bearingOf(dx, dy), n.h) * Math.min(1, dt * 8); if (n.to[2] != null) n.jz = n.from[2] + (n.to[2] - n.from[2]) * clamp(1 - (d - s) / d0, 0, 1); }
    }
    n.spd = Math.hypot(n.x - x0, n.y - y0) / Math.max(1e-4, dt);
    // the drowned's blows: each swing that lands near enough, as it would on you
    if (n.hp > 0 && !n.safe) {
      for (const z of ZM.z) {
        if (z.dead || z.st !== 'in' || z.rr > 0) continue;
        const d = Math.hypot(z.x - n.x, z.y - n.y); if (d > (z.boss ? 2.6 : 1.7) || Math.abs((z.jz || 0) - n.jz) > 1.3) continue;
        if (z.boss) { if (z.act) n.hp -= dt * 1.6; continue; }
        if (z.swing >= 0.28 && !z.c9h) { z.c9h = 1; n.hp -= z.skit ? 0.5 : 1; n.hitT = 0.4; if (Math.hypot(FPS.me.x - n.x, FPS.me.y - n.y) < 30) zmSound('hit'); }
        if (z.swing < 0) z.c9h = 0;
      }
      if (n.hitT > 0) n.hitT -= dt; else if (n.mend > 0) n.hp = Math.min(n.max, n.hp + n.mend * dt);
      if (n.hp <= 0) { n.hp = 0; n.down = 1; }
    }
  }
}
// following: along the trail its leader left (a player, or the person in front of it in the line)
function c9NpcFollow(n, list, dt) {
  const L = typeof n.f === 'number' ? list[n.f] : c9Who(n.f);
  if (!L || L.gone) { n.f = null; n.trail = []; return; }
  const lx = L.x, ly = L.y, lz = L.jz || 0, T = n.trail, last = T[T.length - 1] || [n.x, n.y, n.jz];
  if (Math.hypot(lx - last[0], ly - last[1]) > 0.35 || Math.abs(lz - last[2]) > 0.3) T.push([lx, ly, lz]);
  if (T.length > 400) T.splice(0, T.length - 400);
  const gap = Math.hypot(lx - n.x, ly - n.y), keep = 1.5;
  let left = n.pace * dt * (gap > 6 ? 1.6 : 1);
  if (gap < keep && Math.abs(lz - n.jz) < 0.8) { if (gap > 0.1) n.h += angDiff(bearingOf(lx - n.x, ly - n.y), n.h) * Math.min(1, dt * 5); return; }
  while (left > 0 && T.length) {
    const p = T[0], dx = p[0] - n.x, dy = p[1] - n.y, d = Math.hypot(dx, dy);
    if (d <= left) { n.x = p[0]; n.y = p[1]; n.jz = p[2]; left -= d; T.shift(); if (T.length < 3) break; }
    else { n.x += dx / d * left; n.y += dy / d * left; n.jz += (p[2] - n.jz) * Math.min(1, left / Math.max(0.01, d)); n.h += angDiff(bearingOf(dx, dy), n.h) * Math.min(1, dt * 8); left = 0; }
  }
}
// (the stage's players hook) the people the drowned can come for, with you
function c9NpcTargets(P, list) {
  const out = P.slice();
  list.forEach((n, i) => { if (!n.gone && !n.safe && !n.wait && n.hp > 0 && !n.hide) out.push({ sid: 'npc' + i, x: n.x, y: n.y, jz: n.jz, npc: true }); });
  return out;
}
// the host's word: [k, x, y, jz, h, hp, max, moving, gone|safe<<1|hidden<<2, who they follow (an id, or '#' and another's place)]
function c9NpcPack(list) {
  return list.map(n => [n.k, Math.round((n.x - FPSC.CX) * 50) / 50, Math.round((n.y - FPSC.CY) * 50) / 50, Math.round(n.jz * 50) / 50, Math.round(n.h * 50) / 50, Math.round(n.hp * 10) / 10, n.max, n.spd > 0.2 ? Math.round(n.spd * 10) / 10 : 0, (n.gone ? 1 : 0) | (n.safe ? 2 : 0) | (n.hide ? 4 : 0), typeof n.f === 'string' ? n.f : typeof n.f === 'number' ? '#' + n.f : '']);
}
function c9NpcApply(list, rows, cols) {
  if (!Array.isArray(rows)) return;
  rows.forEach((r, i) => {
    if (!Array.isArray(r)) return;
    let n = list[i];
    if (!n || n.k !== String(r[0])) { n = list[i] = c9NpcNew(String(r[0]), +r[1] || 0, +r[2] || 0, +r[3] || 0, { cols: cols ? cols(String(r[0]), i) : null }); n.tx = n.x; n.ty = n.y; }
    n.tx = FPSC.CX + (+r[1] || 0); n.ty = FPSC.CY + (+r[2] || 0); n.tz = +r[3] || 0; n.th = +r[4] || 0;
    n.hp = +r[5] || 0; n.max = +r[6] || 1; n.spd = +r[7] || 0; n.gone = r[8] & 1; n.safe = (r[8] & 2) ? 1 : 0; n.hide = (r[8] & 4) ? 1 : 0; n.f = !r[9] ? null : String(r[9])[0] === '#' ? +String(r[9]).slice(1) : String(r[9]);
  });
  list.length = rows.length;
}
// (joined) eased towards the host's word
function c9NpcEase(list, dt) {
  for (const n of list) {
    if (n.tx == null) continue;
    const k = Math.min(1, dt * 8), far = Math.hypot(n.tx - n.x, n.ty - n.y) > 6;
    n.x = far ? n.tx : n.x + (n.tx - n.x) * k; n.y = far ? n.ty : n.y + (n.ty - n.y) * k; n.jz += (n.tz - n.jz) * k; n.h += angDiff(n.th, n.h) * k;
  }
}
// their figures (every screen): built as they're first seen, posed each frame, freed with the stage
var C9F = new Map();
function c9NpcDraw(list, dt) {
  if (typeof GL3D === 'undefined' || !GL3D.scene) return;
  const seen = new Set();
  list.forEach((n, i) => {
    if (n.gone || n.hide) return;
    let F = C9F.get(n);
    if (!F) { F = cpkNpc(n.cols || ['#2a2a30', '#d8d0bc', '#7a5a3a', '#ffd88a'], n.outfit || ''); if (!F) return; C9F.set(n, F); }
    seen.add(n);
    cpkNpcPose(F, { x: n.x, y: n.y, jz: n.jz, h: n.h, spd: Math.min(n.spd, 4), lan: n.lan !== false, noGun: true, dt, cr: n.down ? 0.8 : 0 });
  });
  for (const [n, F] of C9F) if (!seen.has(n)) { cpkNpcFree(F); C9F.delete(n); }
}
function c9NpcFreeAll() { for (const F of C9F.values()) cpkNpcFree(F); C9F.clear(); }
// their names and strength over their heads (every screen)
function c9NpcHud(list, phone, mono, all) {
  const m = FPS.me;
  for (const n of list) {
    if (n.gone || n.hide || (!all && !n.max)) continue;
    const d = Math.hypot(n.x - m.x, n.y - m.y); if (d > 45) continue;
    const c = cam(n.x, n.y, FPSC.GROUND + n.jz + 2.15); if (c.f < 0.4) continue;
    const p = proj(c), C = CP_CAST[n.k] || { n: n.k, c: '#ece4cf' }, w = phone ? 44 : 60, k = clamp(n.hp / Math.max(1, n.max), 0, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = C.c;
    ctx.fillText((n.label || C.n).toUpperCase(), p.x, p.y - 7);
    if (n.max > 0 && !n.safe) {
      ctx.fillStyle = 'rgba(8,10,14,0.65)'; ctx.fillRect(p.x - w / 2 - 1, p.y - 5, w + 2, 5);
      ctx.fillStyle = n.hitT > 0 ? '#ff8a6a' : k < 0.35 ? '#e4a060' : '#d8e8c0'; ctx.fillRect(p.x - w / 2, p.y - 4, w * k, 3);
    }
  }
  ctx.textBaseline = 'alphabetic';
}

// ---------- shared: powder and shot ----------
// a chest where you take a full load (each of you on your own screen): its place (world), and a short wait between goes
var C9A = { t: 0 };
function c9AmmoFill(quiet) {
  const m = FPS.me;
  for (const id of ZM.own) { if (ZM_AMMO[id] != null) ZM.res[id] = Math.max(ZM.res[id] || 0, ZM_AMMO[id]); m.mags[id] = zmMag(id); }
  if (FPS.weapon && ZM.own.includes(FPS.weapon)) m.ammo = zmMag(FPS.weapon);
  if (!quiet) { zmSound('buy'); fpsFeed('Powder and shot: every gun you carry, full.'); }
}
function c9AmmoConsider(consider, at) { if (at) consider({ k: 'c9ammo' }, at[0], at[1], at[2] || 0, 1.9, false); }
function c9AmmoPrompt(o) { return o.k === 'c9ammo' ? (C9A.t > 0 ? { text: `The powder chest (again in ${Math.ceil(C9A.t)} s)` } : { text: 'Take powder and shot', free: true }) : null; }
function c9AmmoUse(o) { if (o.k !== 'c9ammo') return false; if (C9A.t <= 0) { C9A.t = 20; c9AmmoFill(); } return true; }
function c9AmmoTick(dt) { if (C9A.t > 0) C9A.t -= dt; }
// the chest itself, put down by a stage's lay (local x, y, a floor z high)
function c9AmmoLay(K, x, y, z, ang) { K.put('crates', x, y, ang || 0, { lift: z || 0, items: [{ u: 0, v: 0, s: 0.7, h0: 0, ry: 0 }, { u: 0.72, v: 0.05, s: 0.6, h0: 0, ry: 0.3 }] }); K.light(x, y, (z || 0) + 1.6, '#ffc070', 5, 'lantern'); }

// ---------- shared: the sky ----------
// night k (0 a winter dusk, 1 the dead of night), dawn d (0 to 1), a lightning flash f (0 to 1); every screen, each frame
var C9S = { bg: null };
function c9Sky(k, d, f) {
  if (typeof GL3D === 'undefined' || !GL3D.scene) return;
  const day = clamp(1 - k, 0, 1), dawn = clamp(d || 0, 0, 1), fl = clamp(f || 0, 0, 1);
  GL3D.amb.intensity = 0.42 + 0.5 * day + 0.55 * dawn + 1.4 * fl; GL3D.moon.intensity = 0.12 + 0.35 * day + 0.4 * dawn + 0.8 * fl;
  const r = 0.047 + 0.27 * day + 0.33 * dawn + 0.3 * fl, gg = 0.055 + 0.18 * day + 0.25 * dawn + 0.32 * fl, b = 0.07 + 0.16 * day + 0.26 * dawn + 0.36 * fl;
  const F = GL3D.scene.fog; if (F) { F.color.setRGB(r, gg, b); RAID.fog0 = true; }
  const B = GL3D.scene.background;
  if (B && B.isColor) { if (!C9S.bg) C9S.bg = B.clone(); B.setRGB(r * 0.8, gg * 0.8, b * 0.85); }
}
function c9SkyBack() { if (C9S.bg && typeof GL3D !== 'undefined' && GL3D.scene && GL3D.scene.background && GL3D.scene.background.isColor) GL3D.scene.background.copy(C9S.bg); C9S.bg = null; }

// ---------- shared: actors for the cinematics ----------
// one of them built from its own model (kind: 'walk', 'jog' for the drowned; 'diver', 'moon', 'crab' a boss; 'skit' a
// crab), at local (x, y), jz up, facing h; posed by c9ActPose each frame; freed by c9ActFree
function c9Act(kind, x, y, jz, h, seed) {
  const [wx, wy] = c9L(x, y), boss = ['diver', 'moon', 'crab'].includes(kind);
  const z = { drowned: true, zm: true, actor: true, x: wx, y: wy, jz: jz || 0, fl: jz || 0, h: h || 0, kind: boss ? 'boss' : kind === 'skit' ? 'skit' : kind, st: 'in', t: 0, ph: Math.random() * 6,
    sp: kind === 'jog' ? 3.4 : kind === 'skit' ? 3.5 : 1.6, swing: -1, hitT: 0, dead: 0, seed: seed == null ? (Math.random() * 1e6) | 0 : seed, rise: 1, hist: [], walk: false, act: null, at: 0, hp: 1, max: 1, lane: 0 };
  if (boss) zbMake(z, kind);
  if (kind === 'skit') zwDress(z);
  if (typeof Z3 !== 'undefined' && Z3.grp) try { zmModel(z); } catch (e) {}   // (the world not ready yet: c9ActPose builds it)
  return z;
}
function c9ActAt(z, x, y, jz, h, walk) { const [wx, wy] = c9L(x, y); if (walk == null) walk = Math.hypot(wx - z.x, wy - z.y) > 0.002; z.x = wx; z.y = wy; if (jz != null) z.jz = jz; if (h != null) z.h = h; z.walk = walk; }
function c9ActPose(z) { if (z && !z.mdl && !z.noMdl && typeof Z3 !== 'undefined' && Z3.grp) { try { zmModel(z); } catch (e) { z.tries = (z.tries || 0) + 1; if (z.tries > 30) z.noMdl = 1; } }   // (built late, when the world wasn't ready for it yet)
  if (!z || !z.mdl) return; const dt = Math.min(0.05, FPS.dtLast || 0.016); z.t += dt; z.groanT = 99; try { zmPose(z, z.mdl, dt); } catch (e) {} }
function c9ActFree(list) { for (const z of list || []) if (z && z.mdl) zmFreeModel(z); }
// a person for a cinematic (local x, y): cpkit's figure, and posed the same way
function c9Fig(cols, x, y, jz, h) { const F = cpkNpc(cols); if (F) { F.c9 = { x, y, jz: jz || 0, h: h || 0, spd: 0 }; c9FigPose(F); } return F; }
function c9FigPose(F, x, y, jz, h, spd) { if (!F) return; const P = F.c9; if (x != null) { P.spd = spd != null ? spd : 0; P.x = x; P.y = y; } if (jz != null) P.jz = jz; if (h != null) P.h = h; const [wx, wy] = c9L(P.x, P.y); cpkNpcPose(F, { x: wx, y: wy, jz: P.jz, h: P.h, spd: P.spd, noGun: true, lan: P.lan !== false }); }

// ---------- shared: a marker of your own ----------
// (the waypoint goes out in the host's word; this one is each screen's own: the nearest window to you, your own cask)
function c9Mark(X, Y, Z, label, phone, mono) {
  const m = FPS.me, c = cam(X, Y, FPSC.GROUND + Z), d = Math.hypot(X - m.x, Y - m.y);
  let px, py, edge = false;
  if (c.f > 0.3) { const p = proj(c); px = p.x; py = p.y; } else { px = c.r >= 0 ? W - 30 : 30; py = H * 0.5; edge = true; }
  const mg = 30; if (px < mg || px > W - mg || py < mg + 40 || py > H - mg - 60) edge = true;
  px = clamp(px, mg, W - mg); py = clamp(py, mg + 40, H - mg - 60);
  const s = (phone ? 7 : 9) * (1 + 0.12 * Math.sin(g.t * 4));
  ctx.save(); ctx.translate(px, py);
  ctx.fillStyle = 'rgba(160,220,255,0.9)'; ctx.strokeStyle = 'rgba(8,10,14,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(220,240,255,0.95)';
  ctx.fillText((label ? label.toUpperCase() + ' · ' : '') + Math.round(d) + ' M' + (edge ? (c.r >= 0 ? ' ›' : ' ‹') : ''), 0, s + 4);
  ctx.restore(); ctx.textBaseline = 'alphabetic';
}

// ---------- shared: a meter on the right of the screen ----------
function c9Meter(i, label, k, col, phone, mono, blink) {
  const w = phone ? 120 : 180, h = phone ? 7 : 9, x = W - Math.max(14, FPS.safeRight || 0) - w, y = fpsHudTop() + (phone ? 60 : 84) + i * (phone ? 28 : 34);
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = blink && Math.sin(g.t * 9) > 0 ? '#ff7a5a' : col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
  ctx.font = mono(phone ? 9 : 10); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(236,228,207,0.8)';
  ctx.fillText(label.toUpperCase(), x, y - 3); ctx.textBaseline = 'alphabetic';
}

// =====================================================================================================================
// Part I: the First Night
// =====================================================================================================================
// T: the minutes before dark (boarding up); the waves: how many each, and one more of them each for each of you after
const C9D = { T: 80, W1: [7, 3], W2: [11, 4], W3: [8, 3], GAP: [1.0, 1.7], CAP: [6, 2], PAUSE: 7, HOLM: 16, HOLM_MORE: 5, AMMO: [-4.6, -31.6] };
const C9D_COLS = { holm: ['#23303c', '#d8d0bc', '#9a7a34', '#ffd88a'] };
// the windows to board up: the courtyard's four, the Coal Store's and the Signal Hut's
const c9dWins = () => ZM.windows.filter(w => !w.sea && ['yard', 'coal', 'shed'].includes(w.zone));
const c9dLadders = () => ZM.windows.filter(w => w.sea);
const C9D_PH = ['land', 'board', 'w1', 'p1', 'w2', 'p2', 'w3', 'won'];
cpStage('m09dusk', {
  n: 'The First Night', mend: true,
  map: c9Map([0, -56.5], 0.9),
  prep() { c9Tower(true); },
  lay(H, K) { c9AmmoLay(K, C9D.AMMO[0], C9D.AMMO[1], 0, 0.3); },
  enter() {
    c9Ready(3);
    const S = RAID.st;
    Object.assign(S, { ph: 'land', T: C9D.T, dark: 0, wv: 0, wleft: 0, wsp: 1, pause: 0, said: {}, flash: 0, diver: 0, npc: [] });
    for (const w of c9dWins()) w.boards = 0;
    if (ZM.net !== 'client') {
      const n = c9N();
      S.npc = [c9NpcNew('holm', -0.4, -38.2, 0, { cols: C9D_COLS.holm, hp: C9D.HOLM + C9D.HOLM_MORE * (n - 1), max: C9D.HOLM + C9D.HOLM_MORE * (n - 1), h: Math.PI, mend: 0.15 })];
      cpObjective('Up through the sea gate to the keeper'); cpWaypoint(0, -37, 'The sea gate');
    }
  },
  tick(dt) { c9dTick(dt); },
  me(dt) { c9AmmoTick(dt); if (ZM.net === 'client') c9NpcEase(RAID.st.npc || [], dt); c9LadderSnd(); },
  players(P) { return c9NpcTargets(P, RAID.st.npc || []); },
  kill(d) { },
  pack(o) { const S = RAID.st; o.a = [C9D_PH.indexOf(S.ph), Math.round(S.T * 10) / 10, Math.round(S.dark * 100) / 100, S.wleft + c9Alive(S.wv)]; o.np = c9NpcPack(S.npc); },
  apply(o) { const S = RAID.st; if (Array.isArray(o.a)) { S.ph = C9D_PH[o.a[0] | 0] || S.ph; S.T = +o.a[1] || 0; S.dark = +o.a[2] || 0; S.left = o.a[3] | 0; } S.npc = S.npc || []; c9NpcApply(S.npc, o.np, k => C9D_COLS[k]); },
  consider(c) { c9AmmoConsider(c, [...c9L(...C9D.AMMO), 0]); },
  prompt(o) { return c9AmmoPrompt(o); },
  use(o) { return c9AmmoUse(o); },
  hud(phone, mono, fell) {
    const S = RAID.st; c9NpcHud(S.npc || [], phone, mono);
    const Hn = (S.npc || [])[0]; if (Hn) c9Meter(0, 'The keeper', Hn.hp / Hn.max, '#d8e8c0', phone, mono, Hn.hp / Hn.max < 0.3);
    if (S.ph === 'board') {
      c9Meter(1, `Daylight · ${Math.ceil(S.T)} s`, S.T / C9D.T, '#e8b070', phone, mono, S.T < 15);
      const m = FPS.me, left = c9dWins().filter(w => w.boards < 6).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
      if (left[0]) c9Mark(left[0].x - left[0].nx * 0.9, left[0].y - left[0].ny * 0.9, 1.6, 'Board it up', phone, mono);
    }
  },
  b3() { c9NpcFreeAll(); },
  f3(dt) { const S = RAID.st; c9NpcDraw(S.npc || [], dt); c9Sky(S.dark || 0, 0, 0); },
  music() { const S = RAID.st; return S.ph === 'w3' ? 'cpm09diver' : S.ph === 'land' || S.ph === 'board' ? 'cpm09dusk' : 'cpm09night'; },
  exit() { c9NpcFreeAll(); c9SkyBack(); c9Tower(false); },
});
function c9dSay(k, who, text, vo) { const S = RAID.st; if (S.said[k]) return; S.said[k] = 1; cpSay(who, text, vo); }
// a recording at world (x, y), quieter with distance and from its side, as src/zombies.js zmSound does (false: none)
function c9Snd(name, x, y, vol, o) { const m = FPS.me, d = Math.hypot(x - m.x, y - m.y); return sfxPlay(name, Object.assign({ vol: vol * Math.max(0.05, 1 - d / 40), pan: fpsDir(fpsEar(x, y)) }, o || {})); }
// the drowned hauling themselves up the jetty's ladders (each once, on every screen: the state is the host's word)
function c9LadderSnd() { for (const z of ZM.z) if (!z.dead && !z.c9lad && z.st === 'climb' && z.win && z.win.sea) { z.c9lad = 1; c9Snd('ladderclimb', z.x, z.y, 0.8); } }
function c9dTick(dt) {
  const S = RAID.st, n = c9N(), H = S.npc[0];
  if (!S.ph || typeof cpCineOn === 'function' && cpCineOn()) return;
  c9NpcTick(S.npc, dt);
  if (H && H.hp <= 0) { cpFail('The keeper fell in his own courtyard'); return; }
  if (S.ph === 'land') {
    // (everyone up off the jetty, or anyone at his side: on to the boarding)
    const P = c9All(), inside = P.filter(p => p[2] - FPSC.CY > -38.6).length;
    if (H && P.some(p => Math.hypot(p[1] - H.x, p[2] - H.y) < 5) || (P.length && inside === P.length)) {
      S.ph = 'board'; S.T = C9D.T;
      cpSay('holm', 'Six windows on this yard, and the light going. Nail them shut while you can still see the nails.', 'cp_m09_05');
      H.to = [...c9L(0.6, -24.4)]; H.face = Math.PI;
    }
    return;
  }
  if (S.ph === 'board') {
    S.T = Math.max(0, S.T - dt); S.dark = clamp(1 - S.T / C9D.T, 0, 1) * 0.9;
    const left = c9dWins().filter(w => w.boards < 6);
    cpObjective(`Board up the windows before dark · ${6 - left.length} of 6`);
    cpWaypoint(null);
    if (S.T < 30 && left.length) c9dSay('late', 'holm', 'Quicker. The sun is in the sea already.', 'cp_m09_06');
    if (!left.length || S.T <= 0) {
      if (!left.length) cpSay('holm', 'That will hold them a while. Not all night.', 'cp_m09_07');
      else cpSay('holm', 'No more time. Leave it, and get your back to the wall.', 'cp_m09_08');
      cpWaypoint(null); S.dark = 1;
      cpCine('m09_dark', () => c9dWave(1));
    }
    return;
  }
  if (S.ph === 'p1' || S.ph === 'p2') {
    S.pause -= dt; cpObjective('Hold the courtyard · a lull');
    if (S.pause <= 0) { if (S.ph === 'p1') c9dWave(2); else cpCine('m09_diver', () => c9dWave(3)); }
    return;
  }
  if (S.ph === 'w1' || S.ph === 'w2' || S.ph === 'w3') {
    const alive = c9Alive(S.wv), cap = C9D.CAP[0] + C9D.CAP[1] * (n - 1);
    S.wsp -= dt;
    if (S.wleft > 0 && S.wsp <= 0 && alive < cap) {
      S.wsp = C9D.GAP[0] + Math.random() * (C9D.GAP[1] - C9D.GAP[0]);
      const W = S.ph === 'w1' ? c9dWins() : c9dWins().concat(c9dLadders(), c9dLadders());
      const w = W[(Math.random() * W.length) | 0];
      if (w) { c9Drown(w, { w: S.wv }); S.wleft--; }
    }
    const D = S.diver && ZM.z.find(z => z.zn === S.diver);
    cpObjective(S.ph === 'w3' ? (D && !D.dead ? 'Put down the Diver · keep him off the keeper' : `Hold the courtyard · ${S.wleft + alive} left`) : `Hold the courtyard · ${S.wleft + alive} left`);
    if (S.ph === 'w1' && S.wleft <= 0 && alive <= 2) c9dSay('w1end', 'holm', 'Thinning. They will come again, harder.', 'cp_m09_09');
    if (S.ph === 'w2' && !S.said.lad && S.wleft < (C9D.W2[0] + C9D.W2[1] * (n - 1)) - 3) c9dSay('lad', 'holm', 'They are on the jetty ladders. Mind the gate!', 'cp_m09_10');
    if (H && H.hp < H.max * 0.45) c9dSay('hurt' + S.ph, 'holm', ...(S.ph === 'w1' ? ['Off me. Get them off me!', 'cp_m09_11'] : S.ph === 'w2' ? ['They have hold of my coat! Shoot, man!', 'cp_m09_12'] : ['I am down to the bone here. Help me!', 'cp_m09_13']));
    const done = S.wleft <= 0 && alive === 0 && (S.ph !== 'w3' || !D || D.dead);
    if (done) {
      if (S.ph === 'w1') { S.ph = 'p1'; S.pause = C9D.PAUSE; cpSay('holm', 'Breathe while you can. Pick up what you dropped.', 'cp_m09_14'); }
      else if (S.ph === 'w2') { S.ph = 'p2'; S.pause = C9D.PAUSE - 2; cpSay('holm', 'Hear that? Something heavy, coming up the T-head.', 'cp_m09_15'); }
      else { S.ph = 'won'; cpObjective(''); cpSay('holm', 'That is the first night. There will be others.', 'cp_m09_18'); cpDone(); }
    }
    if (D && !D.dead && D.hp < D.max * 0.5) c9dSay('dhalf', 'holm', 'His anchor! When the ring shows, get out of it!', 'cp_m09_17');
  }
}
function c9dWave(i) {
  const S = RAID.st, n = c9N(), W = [null, C9D.W1, C9D.W2, C9D.W3][i];
  S.ph = 'w' + i; S.wv = i; S.wleft = W[0] + W[1] * (n - 1); S.wsp = 1.5; ZM.round = 2 + i;
  if (i === 3) {
    const [x, y] = c9L(0, -63.5), D = c9Boss('diver', x, y, ZMD.TOP, { r: 10, k: 0.75, h: 0, w: 3, rise: 1.6 });
    S.diver = D.zn; ZM.banner = { text: 'The Diver', t: 3.6, col: '#9ad8c0', sub: 'Out of the harbour, onto the T-head' };
    cpSay('holm', 'Hold the gate. Do not let him into the yard.', 'cp_m09_16');
  }
  if (i === 1) cpSay('holm', 'On the sea wall. Listen for the boards.', 'cp_m09_19');
}

// =====================================================================================================================
// Part II: the Ninth Night
// =====================================================================================================================
// the lamp: how full it starts, how fast it burns (a second), what a cask puts back; the casks wanted (and one more for
// each of you after); the crabs and the climbers up at once; where the casks are; carrying, your pace
const C9O = { L0: 62, BURN: 0.42, CASK: 28, NEED: [3, 1], CRABS: [9, 4], CLIMB: [2, 1], SPEED: 0.74, AMMO: [-5.4, 7.6],
  SRC: [{ n: 'the Oil Store', at: [17.2, -15.6] }, { n: 'the Boathouse', at: [31, -15.8] }, { n: 'the courtyard', at: [-10.4, -26.4] }], LAMP: [0, 1.5], LAMP_Z: 25 };
const C9O_PH = ['go', 'won'];
cpStage('m09oil', {
  n: 'The Ninth Night', mend: true,
  map: c9Map([0, 7.4], 0),
  prep() { c9Tower(true); },
  lay(H, K) {
    c9AmmoLay(K, C9O.AMMO[0], C9O.AMMO[1], 0, 0.6);
    // the casks, stood ready at each place
    for (const S of C9O.SRC) { fpiBarrels(H, FPSC.CX + S.at[0] + 0.6, FPSC.CY + S.at[1] + 0.9); K.light(S.at[0], S.at[1], 2.2, '#ffc070', 6, 'lantern'); }
  },
  enter() {
    c9Ready(5);
    const S = RAID.st;
    Object.assign(S, { ph: 'go', L: C9O.L0, got: 0, need: C9O.NEED[0] + C9O.NEED[1] * (c9N() - 1), car: {}, csp: 2, dsp: 6, tide: 0, said: {}, npc: [] });
    S.npc = [c9NpcNew('holm', 4.4, 2.6, C9O.LAMP_Z, { cols: C9D_COLS.holm, hp: 1, max: 0, h: -Math.PI / 2, safe: 1 })];
    if (ZM.net !== 'client') cpObjective('');
  },
  tick(dt) { c9oTick(dt); },
  me(dt) {
    c9AmmoTick(dt); if (ZM.net === 'client') c9NpcEase(RAID.st.npc || [], dt);
    // the wick coughing while the oil's under a quarter: faint, and fainter the further from the lamp you are
    const S = RAID.st; if (S.ph === 'go' && S.L > 0 && S.L < 25 && !(typeof cpCineOn === 'function' && cpCineOn())) { const [x, y] = c9L(...C9O.LAMP), m = FPS.me; c9Snd('wickcough', x, y, 0.35 * Math.max(0.3, 1 - Math.abs(C9O.LAMP_Z - (m.jz || 0)) / 40), { gap: 2.6 }); }
  },
  speedK() { return RAID.st.car && RAID.st.car[FPS.me.id] ? C9O.SPEED : 1; },
  players(P) { return P; },
  q(sid, k, a) { if (k === 'c9take') c9oTake(sid, a | 0); },
  pack(o) { const S = RAID.st; o.a = [Math.round(S.L * 10) / 10, S.got, S.need, S.tide]; o.cr = Object.keys(S.car); o.np = c9NpcPack(S.npc); },
  apply(o) { const S = RAID.st; if (Array.isArray(o.a)) { S.L = +o.a[0] || 0; if ((o.a[1] | 0) === (S.got | 0) + 1 && !sfxPlay('caskthud', { vol: 0.8 })) zmSound('drink'); S.got = o.a[1] | 0; S.need = o.a[2] | 0; S.tide = o.a[3] | 0; } S.car = {}; if (Array.isArray(o.cr)) for (const s of o.cr) S.car[String(s)] = 1; S.npc = S.npc || []; c9NpcApply(S.npc, o.np, k => C9D_COLS[k]); },
  consider(c) {
    c9AmmoConsider(c, [...c9L(...C9O.AMMO), 0]);
    if (!RAID.st.car || RAID.st.car[FPS.me.id]) return;
    C9O.SRC.forEach((S, i) => { const [x, y] = c9L(...S.at); c({ k: 'c9cask', i }, x, y, 0, 2.2, false); });
  },
  prompt(o) { return o.k === 'c9cask' ? { text: `Shoulder a cask of lamp oil (${C9O.SRC[o.i].n})`, free: true } : c9AmmoPrompt(o); },
  use(o) { if (o.k === 'c9cask') { raidAsk('c9take', o.i); return true; } return c9AmmoUse(o); },
  hud(phone, mono, fell) {
    const S = RAID.st; c9NpcHud(S.npc || [], phone, mono, true);
    c9Meter(0, `The lamp's oil · ${Math.round(S.L || 0)}%`, (S.L || 0) / 100, '#f0c070', phone, mono, S.L < 25);
    c9Meter(1, `Casks up the tower · ${S.got || 0} of ${S.need || 0}`, (S.got || 0) / Math.max(1, S.need || 1), '#c8d8e8', phone, mono);
    const m = FPS.me;
    if (S.car && S.car[m.id]) { ctx.textAlign = 'center'; ctx.font = mono(phone ? 11 : 13); ctx.fillStyle = 'rgba(255,226,170,0.9)'; ctx.fillText('A CASK ON YOUR SHOULDER · UP THE STAIR TO THE LAMP', cx, H * (phone ? 0.72 : 0.76)); const [x, y] = c9L(...C9O.LAMP); c9Mark(x, y, C9O.LAMP_Z + 1.4, 'The lamp', phone, mono); }
    else if (S.ph === 'go') { const src = C9O.SRC.map(s => c9L(...s.at)).sort((a, b) => Math.hypot(a[0] - m.x, a[1] - m.y) - Math.hypot(b[0] - m.x, b[1] - m.y))[0]; c9Mark(src[0], src[1], 1.2, 'Lamp oil', phone, mono); }
  },
  b3(grp) { c9NpcFreeAll(); c9oCaskBuild(grp); },
  f3(dt) { const S = RAID.st; c9NpcDraw(S.npc || [], dt); c9oCaskDraw(); c9Sky(1, 0, 0); },
  music() { return RAID.st.tide ? 'cpm09tide' : 'cpm09oil'; },
  exit() { c9NpcFreeAll(); c9SkyBack(); c9Tower(false); },
});
function c9oTake(sid, i) {
  const S = RAID.st, src = C9O.SRC[i], P = c9Who(sid); if (!src || !P || P.down || S.car[sid] || S.ph !== 'go') return;
  const [x, y] = c9L(...src.at); if (Math.hypot(P.x - x, P.y - y) > 3.2 || P.jz > 1) return;
  S.car[sid] = 1;
  if (!S.said.first) { S.said.first = 1; cpSay('holm', 'Up the stair with it. Ninety steps, and do not drop it on the drowned.', 'cp_m09_22'); }
}
function c9oTick(dt) {
  const S = RAID.st, n = c9N();
  if (S.ph !== 'go' || typeof cpCineOn === 'function' && cpCineOn()) return;
  c9NpcTick(S.npc, dt);
  S.L = Math.max(0, S.L - C9O.BURN * dt);
  if (S.L <= 0) { cpFail('The lamp ran dry, and the Light went out'); return; }
  if (S.L < 25) c9dSay('low', 'holm', 'She is guttering! Oil, for pity’s sake!', 'cp_m09_23');
  // the casks: up the tower to the lamp
  const [lx, ly] = c9L(...C9O.LAMP);
  for (const p of c9All()) {
    const [sid, x, y, jz, down] = p;
    if (!S.car[sid]) continue;
    if (down) { delete S.car[sid]; continue; }   // (dropped, going down)
    if (jz > C9O.LAMP_Z - 1.5 && Math.hypot(x - lx, y - ly) < 6.2) {
      delete S.car[sid]; S.got++; S.L = Math.min(100, S.L + C9O.CASK);
      if (!sfxPlay('caskthud', { vol: 0.8 })) zmSound('drink');
      const left = S.need - S.got;
      if (left > 0) cpSay('holm', ...(left === 1 ? ['One more and she will see the night out.', 'cp_m09_26'] : S.got === 1 ? ['That is one. Back down for the next.', 'cp_m09_24'] : ['Another. More yet, and quick about it.', 'cp_m09_25']));
      if (S.got === 1 && !S.tide) { S.tide = 1; cpCine('m09_tide'); }
      if (left <= 0) { S.ph = 'won'; cpObjective(''); cpWaypoint(null); cpSay('holm', 'Full. She will burn till morning now.', 'cp_m09_27'); cpDone(); return; }
    }
  }
  for (const sid of Object.keys(S.car)) if (!c9Who(sid)) delete S.car[sid];   // (gone)
  // what to do: a cask, or up with it
  cpObjective(`Bring the lamp oil up the tower to the keeper · ${S.got} of ${S.need}`);
  // the crab tide, at the ground's windows nearest you; the drowned up the tower's walls
  const crabs = ZM.z.filter(z => !z.dead && z.skit).length, cap = Math.round((C9O.CRABS[0] + C9O.CRABS[1] * (n - 1)) * (S.tide ? 1.5 : 1));
  S.csp -= dt;
  if (S.csp <= 0 && crabs < cap) {
    S.csp = (S.tide ? 0.45 : 0.8) + Math.random() * 0.6;
    const w = zwPickWindow(); if (w) c9Crab(w);
  }
  const climb = ZM.z.filter(z => !z.dead && !z.skit && !z.boss).length;
  S.dsp -= dt;
  if (S.dsp <= 0 && climb < C9O.CLIMB[0] + C9O.CLIMB[1] * (n - 1)) {
    S.dsp = 5 + Math.random() * 4;
    const T = ZM.windows.filter(w => w.tw && (w.z || 0) > 0); const w = T[(Math.random() * T.length) | 0];
    if (w) c9Drown(w, { kind: 'jog' });
  }
}
// the cask on a shoulder: yours in front of you, low at the right; the others' on theirs
var C9O3 = { mine: null, theirs: [] };
function c9oCaskMesh() {
  const g = new THREE.Group(), wood = z3Lam('#6a4a2a'), iron = z3Lam('#2a2a2c');
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.62, 12), wood); b.rotation.z = Math.PI / 2; g.add(b);
  for (const x of [-0.24, 0, 0.24]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.018, 4, 14), iron); h.rotation.y = Math.PI / 2; h.position.x = x; g.add(h); }
  return g;
}
function c9oCaskBuild(grp) { C9O3.mine = c9oCaskMesh(); C9O3.mine.scale.setScalar(0.8); grp.add(C9O3.mine); C9O3.theirs = []; C9O3.grp = grp; }
function c9oCaskDraw() {
  const S = RAID.st, m = FPS.me; if (!C9O3.mine) return;
  const mine = !!(S.car && S.car[m.id]) && !(m.dead > 0) && !fpsThird() && !(typeof cpCineOn === 'function' && cpCineOn());
  C9O3.mine.visible = mine;
  if (mine) {
    const h = m.h, ez = FPSC.GROUND + FPSC.EYE + (m.jz || 0) - (FPS.crouchEye || 0), fx = Math.sin(h), fy = Math.cos(h), sw = Math.sin((FPS.step || 0) * 0.5) * 0.03;
    C9O3.mine.position.copy(z3v(m.x + fx * 0.75 + fy * 0.42, m.y + fy * 0.75 - fx * 0.42, ez - 0.5 + sw)); C9O3.mine.rotation.set(0, -h + 0.3, 0.2);
  }
  const list = [...FPS.remote.values()].filter(r => S.car && S.car[r.id] && !r.dead && r.x != null);
  while (C9O3.theirs.length < list.length) { const c = c9oCaskMesh(); C9O3.grp.add(c); C9O3.theirs.push(c); }
  C9O3.theirs.forEach((c, i) => { const r = list[i]; c.visible = !!r; if (r) { const h = r.h || 0; c.position.copy(z3v(r.x + Math.cos(h) * 0.3, r.y - Math.sin(h) * 0.3, FPSC.GROUND + (r.jz || 0) + 1.65)); c.rotation.set(0, -h, 0); } });
}

// =====================================================================================================================
// Part III: the Worst Night
// =====================================================================================================================
// NIGHT: seconds to dawn; MOON: how far through the night the Mooncusser comes; HOLD: dawn waits there while he stands;
// BURN: once he's down, the seconds of the Light at full before the sun's up; the lamp: what each of them near it takes
// from it (a second), his false light, what Holm puts back; the climbers up at once and how often
const C9W = { NIGHT: 200, MOON: 0.42, HOLD: 0.86, BURN: 26, PAW: 1.4, NEAR: 2.6, FALSE: 6.5, TEND: 2.2, UP: [5, 2], GAP: [2.4, 1.0], AMMO: [-4.4, 4.4],
  C: [0, 1.5], Z: 25, GR: 9.25, R_IN: 6.6 };
const C9W_PH = ['hold', 'moon', 'burn', 'won'];
cpStage('m09worst', {
  n: 'The Worst Night', mend: true,
  map: c9Map([0, -3.6], 25),
  prep() { c9Tower(true); },
  lay(H, K) { c9AmmoLay(K, C9W.AMMO[0], C9W.AMMO[1], C9W.Z, 0.8); },
  enter() {
    c9Ready(7);
    const S = RAID.st, n = c9N();
    Object.assign(S, { ph: 'hold', night: 0, L: 100, sp: 3, dsp: 9, moon: 0, burnT: 0, said: {}, flash: 0, boltT: 6, npc: [] });
    S.npc = [c9NpcNew('holm', 4.6, 1.6, C9W.Z, { cols: C9D_COLS.holm, hp: 18 + 6 * (n - 1), max: 18 + 6 * (n - 1), h: -Math.PI / 2, mend: 0.2 })];
    if (ZM.net !== 'client') { cpObjective('Keep the Light burning until dawn'); cpWaypoint(null); }
    if (typeof zmlReset === 'function') zmlReset();
    // (each of us on the lantern's floor, round the south side of the stairwell)
    { const m = FPS.me, slot = Math.max(0, ZM.hum.findIndex(h => h[0] === m.id)), a = -Math.PI / 2 + ((slot % 4) - 1.5) * 0.32, [x, y] = c9L(C9W.C[0] + Math.cos(a) * 5.05, C9W.C[1] + Math.sin(a) * 5.05);
      m.x = x; m.y = y; m.jz = m.fl = C9W.Z; m.vz = 0; const [tx, ty] = c9L(...C9W.C); m.h = bearingOf(tx - x, ty - y); }
  },
  tick(dt) { c9wTick(dt); },
  me(dt) {
    c9AmmoTick(dt); const S = RAID.st;
    if (ZM.net === 'client') c9NpcEase(S.npc || [], dt);
    // the storm: lightning now and then, and the thunder after it
    S.boltT = (S.boltT == null ? 6 : S.boltT) - dt; S.flash = Math.max(0, (S.flash || 0) - dt * 3);
    if (S.boltT <= 0 && S.ph !== 'won') { S.boltT = 7 + Math.random() * 9; S.flash = 1; if (!sfxPlay('gallerybolt', { vol: 0.8 })) setTimeout(() => { try { sfxPlay('thunder', { vol: 0.7 }); } catch (e) {} }, 300 + Math.random() * 900); }
    // the drowned pawing at the lamp's glass (where the host reckons the drain: in the lantern room, close by the lamp)
    if (S.ph !== 'won' && !(typeof cpCineOn === 'function' && cpCineOn())) { const [cx0, cy0] = c9L(...C9W.C), z = ZM.z.find(z => !z.dead && z.st === 'in' && (z.jz || 0) >= C9W.Z - 1.2 && Math.hypot(z.x - cx0, z.y - cy0) < C9W.NEAR + 1); if (z) c9Snd('glassscrape', z.x, z.y, 0.7, { gap: 2.2 }); }
  },
  players(P) { return c9NpcTargets(P, RAID.st.npc || []); },
  pack(o) { const S = RAID.st; o.a = [C9W_PH.indexOf(S.ph), Math.round(S.night * 1000) / 1000, Math.round(S.L * 10) / 10]; o.np = c9NpcPack(S.npc); },
  apply(o) { const S = RAID.st; if (Array.isArray(o.a)) { S.ph = C9W_PH[o.a[0] | 0] || S.ph; S.night = +o.a[1] || 0; S.L = +o.a[2] || 0; } S.npc = S.npc || []; c9NpcApply(S.npc, o.np, k => C9D_COLS[k]); },
  consider(c) { c9AmmoConsider(c, [...c9L(...C9W.AMMO), C9W.Z]); },
  prompt(o) { return c9AmmoPrompt(o); },
  use(o) { return c9AmmoUse(o); },
  hud(phone, mono, fell) {
    const S = RAID.st; c9NpcHud(S.npc || [], phone, mono);
    const Hn = (S.npc || [])[0];
    c9Meter(0, `The Light · ${Math.round(S.L || 0)}%`, (S.L || 0) / 100, '#ffe2a0', phone, mono, S.L < 30);
    if (Hn) c9Meter(1, 'The keeper', Hn.hp / Math.max(1, Hn.max), '#d8e8c0', phone, mono, Hn.hp / Hn.max < 0.3);
    const left = Math.max(0, (1 - (S.night || 0)) * C9W.NIGHT);
    c9Meter(2, S.ph === 'moon' && S.night >= C9W.HOLD - 0.001 ? 'Dawn will not come while his light burns' : `Dawn · ${raidClock(left)}`, S.night || 0, '#e8b8a0', phone, mono);
  },
  b3() { c9NpcFreeAll(); },
  f3(dt) { const S = RAID.st; c9NpcDraw(S.npc || [], dt); c9Sky(1, clamp(((S.night || 0) - 0.88) / 0.12, 0, 1), S.flash || 0); },
  music() { const S = RAID.st; return S.ph === 'moon' ? 'cpm09moon' : S.ph === 'burn' || S.ph === 'won' ? 'cpm09dawn' : 'cpm09storm'; },
  exit() { c9NpcFreeAll(); c9SkyBack(); c9Tower(false); if (typeof zmlReset === 'function') zmlReset(); },
});
// a place on the gallery (world), round from the east by angle a
const c9wG = (a, r) => c9L(C9W.C[0] + Math.cos(a) * (r || C9W.GR), C9W.C[1] + Math.sin(a) * (r || C9W.GR));
function c9wTick(dt) {
  const S = RAID.st, n = c9N(), H = S.npc[0];
  if (S.ph === 'won' || typeof cpCineOn === 'function' && cpCineOn()) return;
  c9NpcTick(S.npc, dt);
  if (H && H.hp <= 0) { cpFail('The keeper fell at his lamp'); return; }
  // the night goes on (dawn holds off while the Mooncusser stands)
  const M = S.moon && ZM.z.find(z => z.zn === S.moon);
  const rate = S.ph === 'burn' ? (1 - C9W.HOLD) / C9W.BURN : 1 / C9W.NIGHT;
  S.night = Math.min(S.ph === 'burn' ? 1 : C9W.HOLD, S.night + rate * dt);
  // the lamp: pawed at by any of them in the lantern room, faltering under his false light; Holm keeps it
  const [cx0, cy0] = c9L(...C9W.C);
  let drain = 0, onHolm = 0;
  for (const z of ZM.z) {
    if (z.dead || z.st !== 'in' || (z.jz || 0) < C9W.Z - 1.2 || z.rr > 0) continue;
    const d = Math.hypot(z.x - cx0, z.y - cy0);
    if (d < C9W.R_IN) drain += (d < C9W.NEAR + 1 ? 2 : 1) * C9W.PAW;
    if (H && Math.hypot(z.x - H.x, z.y - H.y) < 3) onHolm++;
  }
  if (M && !M.dead && M.act === 'lure') drain += C9W.FALSE;
  const tend = H && H.hp > 0 && !onHolm && !(M && !M.dead && M.act === 'lure') ? C9W.TEND : 0;
  if (S.ph !== 'burn') S.L = clamp(S.L - drain * dt + tend * dt, 0, 100); else S.L = Math.min(100, S.L + 20 * dt);
  if (S.L <= 0) { cpFail('The Light went out on the worst night of the winter'); return; }
  if (S.L < 35) c9dSay('low' + (S.ph === 'moon' ? 'm' : ''), 'holm', ...(S.ph === 'moon' ? ['His light is drinking mine. Shoot him while he holds it up!', 'cp_m09_36'] : ['They are at the lamp! Get them off the glass!', 'cp_m09_31']));
  if (onHolm && H.hp < H.max * 0.5) c9dSay('holm' + S.ph, 'holm', ...(S.ph === 'moon' ? ['Get them off me! I cannot reach the wick!', 'cp_m09_37'] : ['I cannot tend her with these on my back!', 'cp_m09_32']));
  // the climbers: up over the gallery's rail, anywhere round it but the doors; and now and then up the stair
  const alive = ZM.z.filter(z => !z.dead && !z.boss).length, k = S.night, cap = C9W.UP[0] + C9W.UP[1] * (n - 1) + (S.ph === 'burn' ? 4 : 0);
  S.sp -= dt;
  if (S.sp <= 0 && alive < cap) {
    S.sp = (C9W.GAP[0] - (C9W.GAP[0] - C9W.GAP[1]) * k) * (0.7 + Math.random() * 0.6) / (1 + 0.25 * (n - 1));
    let a = Math.random() * Math.PI * 2; if (Math.abs(Math.sin(a)) < 0.3) a += Math.PI / 2;
    const [x, y] = c9wG(a);
    c9Rise(x, y, C9W.Z, { kind: k > 0.5 && Math.random() < 0.4 ? 'run' : 'jog', rise: 1.5, h: a + Math.PI });
  }
  S.dsp -= dt;
  if (S.dsp <= 0 && alive < cap) { S.dsp = 10 + Math.random() * 6; const T = ZM.windows.filter(w => w.tw && (w.z || 0) >= 15); const w = T[(Math.random() * T.length) | 0]; if (w) c9Drown(w, { kind: 'jog' }); }
  if (S.night > 0.18) c9dSay('n1', 'holm', 'Over the rail, the both sides. They climb like men who have nothing left to lose.', 'cp_m09_33');
  // the Mooncusser, up over the rail on the west side
  if (S.ph === 'hold' && S.night >= C9W.MOON) {
    S.ph = 'moon';
    cpCine('m09_moon', () => { const [x, y] = c9wG(Math.PI); const z = c9Boss('moon', x, y, C9W.Z, { r: 12, k: 0.9, h: 0, rise: 1.4 }); S.moon = z.zn; ZM.banner = { text: 'The Mooncusser', t: 3.6, col: '#e8c870', sub: 'Look away from the false light' }; });
    return;
  }
  if (S.ph === 'moon') {
    cpObjective(M && !M.dead ? 'Put down the Mooncusser · look away from his false light' : 'Keep the Light burning until dawn');
    if (M && !M.dead && M.hp < M.max * 0.5) c9dSay('mhalf', 'holm', 'He is weakening. His light is going yellow.', 'cp_m09_38');
    if (S.moon && (!M || M.dead)) {
      S.ph = 'burn'; S.burnT = 0;
      if (typeof zmlReset === 'function' && !ZM.lamp) zmlReset();
      if (typeof zmlLight === 'function') zmlLight(FPS.me.id);
      cpCine('m09_burn', () => { cpObjective('Hold on until the sun is up'); });
    }
    return;
  }
  if (S.ph === 'burn') {
    // the lamp at full: its beam goes round burning them off the tower (src/zmlamp.js), until dawn
    if (typeof zmlReset === 'function' && !ZM.lamp) zmlReset();
    if (ZM.lamp) { if (!(ZM.lamp.t > 0)) zmlLight(FPS.me.id); ZM.lamp.t = Math.max(ZM.lamp.t, 12); }
    if (S.night >= 0.95) c9dSay('sun', 'holm', 'There. The sun. Look at them go.', 'cp_m09_41');
    if (S.night >= 1) {
      S.ph = 'won'; cpObjective('');
      if (ZM.lamp) ZM.lamp.t = 0;
      for (const z of ZM.z) if (!z.dead) { z.dead = 1; z.gone = true; z.deadT = 99; }
      cpDone();
    }
  }
}
