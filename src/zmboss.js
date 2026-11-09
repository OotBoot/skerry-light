// The Lighthouse: the Diver. From round 10, and every fifth round after (10, 15, 20, ...), something bigger comes up
// out of the sea with the rest of them: a drowned salvage diver, half as tall again as a man, in a canvas suit and a
// brass helmet whose ports glow sea-green, hauling a ship's anchor behind him on its ring.
//  - He comes up out of the sea outside the nearest window, walks to it and smashes the boards in all at once, and
//    climbs through.
//  - Slow on his feet, but hard to put down (twelve times one of the others of that round, more with more of you),
//    and every blow of his takes two knocks.
//  - Close in he sweeps the anchor round at you. Further off (six metres or so) he heaves it up over his helmet, and
//    a ring glows on the floor where it will come down; when it does, the shock goes through the floor to the edge of
//    the ring, and knocks down everyone inside it who's on their feet (jump, or get out of the ring).
//  - He shoulders through tight corners rather than getting stuck in a door; if he's lost for long, he goes back out
//    and comes in again by the window nearest you.
//  - He counts towards the round: it isn't held until he's down. 500 points on top of the kill, and he always drops
//    salvage. The Black Spot only makes him bleed faster, the Lamp's fire burns him slowly and a Lamp Flash only
//    scorches him. His strength shows in a bar at the top of the screen while he's about.
// Together: the host runs him like the rest (src/zmnet.js streams him with them, and his strength, his blow in
// progress and where it'll land in `bo`); each player judges his blows on themselves, as with the others' swings.
// Hooks into src/zombies.js (zmRounds, zmZombies, zmCrowd, zmHurt, zmKill, zmTake, zmModel, zmPose, zmHud) and
// src/zmnet.js (znHostSend, znApply) are single lines marked [boss]; fpsRay (src/fps.js) reads a body's own size.

const ZBC = {
  FROM: 10, EVERY: 5, HP: 12, HP_MORE: 0.75, DMG: 2, PTS: 500, PAD: 0.45, RAD: 0.85, TALL: 2.75, HEADZ: 2.15,
  REACH: 2.6, NEAR: 2.0, SLAM_R: 4.2, SLAM_AT: 2.0, SLAM_RANGE: 6.5, OUT: 6,
};
// his blows: when each lands, and when he's ready to move again
const ZB_T = { swing: { hit: 0.75, end: 1.3 }, slam: { hit: 1.6, end: 2.7 }, smash: { hit: 0.9, end: 1.5 } };
const ZB_ACT = ['', 'swing', 'slam', 'smash'];
const ZB = { g: null, round: 0, pending: 0, wait: 0, seen: new Set(), pool: [], grp: null, bar: 0 };
const zbIsRound = r => r >= ZBC.FROM && (r - ZBC.FROM) % ZBC.EVERY === 0;
function zbNew() { if (ZB.g !== FPS.g) { ZB.g = FPS.g; ZB.round = 0; ZB.pending = 0; ZB.seen = new Set(); } }

// ---------- his coming (hosting, or alone) ----------
// from zmRounds, while a round is on: in a round of his, he comes up a few seconds in (or at once, if the rest are
// all up already, so the round can't end before he's come)
function zbRounds(dt) {
  zbNew();
  if (ZB.round !== ZM.round) { ZB.round = ZM.round; ZB.pending = zbIsRound(ZM.round) ? 1 : 0; ZB.wait = 5 + Math.random() * 5; }
  if (ZB.pending > 0) {
    ZB.wait -= dt;
    if (ZB.wait <= 0 || ZM.left <= 0) { if (zbSpawn()) ZB.pending--; else ZB.wait = 1; }
  }
}
// the window he comes in by: one of the open rooms', nearest by the walk to you
function zbWindow() {
  const N = ZM.nav, list = [];
  for (const w of ZM.windows) {
    if (!zmOpen(w.zone) || w.z > 0) continue;   // (too big for the windows up the tower)
    const d = zmNavDist(w.x - w.nx * 1.0, w.y - w.ny * 1.0, 0);
    list.push([w, d < 1e8 ? d : 9999]);
  }
  if (!list.length) return null;
  list.sort((a, b) => a[1] - b[1]);
  return list[Math.random() < 0.7 || list.length < 2 ? 0 : 1][0];
}
function zbSpawn() {
  const w = zbWindow(); if (!w) return false;
  const n = Math.max(1, ZM.hum.length), hp = zmHp(ZM.round) * ZBC.HP * (1 + ZBC.HP_MORE * (n - 1));
  const zn = ++ZM.zc, side = (Math.random() - 0.5) * 2;
  const z = {
    drowned: true, zm: true, boss: true, zn, id: 'z' + zn.toString(36), n: 'the Diver', kind: 'boss',
    x: w.x + w.nx * ZBC.OUT - w.ny * side, y: w.y + w.ny * ZBC.OUT + w.nx * side, jz: -2.6, fl: 0,
    hp, max: hp, sp: 1.3 + Math.min(0.45, (ZM.round - ZBC.FROM) * 0.025),
    st: 'out', win: w, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: 0, iy: 0,
  };
  zbMake(z);
  z.h = bearingOf(w.x - z.x, w.y - z.y);
  ZM.z.push(z); FPS.drowned = ZM.z;
  ZB.seen.add(zn);
  zbArrive(z);
  return true;
}
// what makes one of the drowned the Diver: his size (for shots: fpsRay reads rad, tall and headZ), his footing
function zbMake(z) {
  if (z.mdl && !z.mdl.boss) zmFreeModel(z);
  Object.assign(z, { boss: true, n: 'the Diver', kind: 'boss', rad: ZBC.RAD, tall: ZBC.TALL, headZ: ZBC.HEADZ, zpad: ZBC.PAD });
  if (z.aseq == null) z.aseq = 0;
}
// everyone hears him come
function zbArrive(z) {
  const zn = z.win ? zmZoneName(z.win.zone) : '';
  ZM.banner = { text: 'The Diver', t: 3.6, col: '#8affd0' };
  fpsFeed(`Something huge comes up out of the sea${zn ? ' outside ' + zn : ''}: the Diver, dragging his anchor.`);
  zbSound('arrive');
}

// ---------- each tick (hosting, or alone): from zmZombies, for him instead of the usual ----------
function zbTick(z, dt, nearest) {
  const m = FPS.me;
  if (z.slamCd > 0) z.slamCd -= dt; if (z.swCd > 0) z.swCd -= dt;
  // a blow under way: he stands and sees it through
  if (z.act) {
    const T = ZB_T[z.act], was = z.at;
    z.at += dt; z.walk = false;
    if (z.act === 'slam' && z.at < T.hit * 0.6) {
      // (turning to follow you for the first of the wind-up; then it's set, and the ring shows where)
      const p = nearest(z.x, z.y, z.jz);
      if (p) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 2.5);
      zbAim(z);
    }
    if (z.act === 'swing' && z.at < T.hit * 0.7) { const p = nearest(z.x, z.y, z.jz); if (p) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 4); }
    if (was < T.hit && z.at >= T.hit) {
      if (z.act === 'smash') zbSmashWindow(z);
      zbStrike(z);
    }
    if (z.at >= T.end) {
      const a = z.act; z.act = null; z.at = 0;
      if (a === 'smash') { z.st = 'climb'; z.t = 0; }
    }
    return;
  }
  if (z.st === 'out') {
    // up out of the sea, and across to the window
    const w = z.win, ox = w.x + w.nx * 1.5, oy = w.y + w.ny * 1.5, dx = ox - z.x, dy = oy - z.y, d = Math.hypot(dx, dy);
    if (z.jz < 0) z.jz = Math.min(0, z.jz + dt * 1.1);
    if (typeof zmSeaDepth === 'function') z.jz = Math.min(z.jz, -zmSeaDepth(z.x, z.y));   // (still in the harbour's water: wading up out of it)
    if (d > 0.08) { const s = Math.min(d, z.sp * dt); z.x += dx / d * s; z.y += dy / d * s; z.h += angDiff(bearingOf(dx, dy), z.h) * Math.min(1, dt * 4); z.walk = true; }
    else if (z.jz >= 0) { z.walk = false; z.h = bearingOf(-w.nx, -w.ny); zbStart(z, 'smash'); }
    return;
  }
  if (z.st === 'climb') {
    // through the empty frame, stooping
    const w = z.win, k = Math.min(1, z.t / 1.6);
    z.x = w.x + w.nx * (1.5 - 2.7 * k); z.y = w.y + w.ny * (1.5 - 2.7 * k); z.jz = Math.sin(k * Math.PI) * 0.9; z.walk = true;
    if (k >= 1) { z.st = 'in'; z.jz = 0; z.fl = 0; z.t = 0; z.lx = z.x; z.ly = z.y; zmSettle(z); }
    return;
  }
  // inside: after the nearest of you, by the shortest walk
  const p = nearest(z.x, z.y, z.jz);
  if (!p) { z.walk = false; return; }
  const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy), dz = (p.jz || 0) - (z.jz || 0), level = Math.abs(dz) < 1;
  if (level && d < ZBC.REACH - 0.3 && z.swCd <= 0) { zbStart(z, z.slamCd <= 0 && Math.random() < 0.3 ? 'slam' : 'swing'); return; }
  if (level && d < ZBC.SLAM_RANGE && d > 2.6 && z.slamCd <= 0) { zbStart(z, 'slam'); return; }
  let tx = p.x, ty = p.y;
  if (!(d < 3 && Math.abs(dz) < 0.8)) { const nx = zmNavNext(z.x, z.y, z.jz || 0); if (nx) { tx = nx[0]; ty = nx[1]; } }
  const hx = tx - z.x, hy = ty - z.y, hl = Math.hypot(hx, hy), near = d < ZBC.NEAR && level, step = z.sp * dt;
  const x0 = z.x, y0 = z.y;
  z.walk = false;
  if (hl > 0.05 && !near) {
    z.h += angDiff(bearingOf(hx, hy), z.h) * Math.min(1, dt * 3);
    const s = Math.min(hl, step), want = bearingOf(hx, hy);
    if (z.shove > 0) {
      // (shouldering through a corner too tight for him: straight on along the way, whatever's in it)
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
  // the rest of them keep out from under his feet
  for (const o of ZM.z) {
    if (o === z || o.dead || o.st !== 'in' || Math.abs((o.jz || 0) - (z.jz || 0)) > 1) continue;
    const ox = o.x - z.x, oy = o.y - z.y, od = Math.hypot(ox, oy);
    if (od < 1.25 && od > 0.001) zmMove(o, ox / od * (1.25 - od) * 0.5, oy / od * (1.25 - od) * 0.5);
  }
  z.lx = z.x; z.ly = z.y;
}
function zbStart(z, act) {
  z.act = act; z.at = 0; z.aseq = (z.aseq + 1) % 1000; z.walk = false;
  if (act === 'slam') { z.slamCd = 6.5 + Math.random() * 2.5; z.swCd = Math.max(z.swCd, 1.2); zbAim(z); }
  if (act === 'swing') z.swCd = 1.7 + Math.random() * 0.5;
  zbActSound(z, act);
}
// where the anchor will come down: in front of him
function zbAim(z) { z.ix = z.x + Math.sin(z.h) * ZBC.SLAM_AT; z.iy = z.y + Math.cos(z.h) * ZBC.SLAM_AT; }
function zbReenter(z) {
  const w = zbWindow(); if (!w) { z.lost = 0; return; }
  Object.assign(z, { st: 'out', win: w, x: w.x + w.nx * ZBC.OUT, y: w.y + w.ny * ZBC.OUT, jz: -2.6, fl: 0, t: 0, act: null, at: 0, lost: 0, stuck: 0, shove: 0, best: null });
  z.h = bearingOf(w.x - z.x, w.y - z.y);
}
// the boards: all of them in at once
function zbSmashWindow(z) {
  const w = z.win; if (!w) return;
  for (let i = w.boards - 1; i >= 0; i--) w.fall.push({ i, t: 0 });
  w.boards = 0;
  if (typeof zmnEvent === 'function' && ZM.net === 'host') zmnEvent('feed', `The Diver smashes in through a window of ${zmZoneName(w.zone)}.`);
  fpsFeed(`The Diver smashes in through a window of ${zmZoneName(w.zone)}.`);
}

// ---------- his blows land (on every screen; each judges only its own player) ----------
function zbStrike(z) {
  const m = FPS.me, act = z.act, G0 = FPSC.GROUND;
  const ok = () => !(m.dead > 0) && !(m.protect > 0) && !ZM.over;
  if (act === 'slam' || act === 'smash') {
    const ix = act === 'slam' ? z.ix : z.win ? z.win.x : z.x, iy = act === 'slam' ? z.iy : z.win ? z.win.y : z.y;
    const dm = Math.hypot(ix - m.x, iy - m.y);
    zbSound(act === 'slam' ? 'slam' : 'smash', dm);
    // dust and spray, round the ring
    const n = act === 'slam' ? 22 : 10, R = act === 'slam' ? ZBC.SLAM_R : 1.2;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283; fpsPuff(ix + Math.cos(a) * R * (0.4 + Math.random() * 0.6), iy + Math.sin(a) * R * (0.4 + Math.random() * 0.6), G0 + (z.jz || 0) + 0.15, act === 'slam' ? '150,170,160' : '120,100,80', 2); }
    if (act === 'slam') {
      z.wave = 0.01;
      if (dm < 9) { FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.18 * (1 - dm / 9), -0.8, 0.8); }
      // in the ring, at his level, feet on the floor, and nothing solid between: two knocks
      const grounded = (m.jz || 0) - (m.fl || 0) < 0.25 && !((m.vz || 0) > 0.5);
      if (ok() && dm < ZBC.SLAM_R && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.2 && grounded) {
        const r = fpsRay(ix, iy, G0 + (z.jz || 0) + 0.6, bearingOf(m.x - ix, m.y - iy), 0, null, [], dm);
        if (!(r.kind !== 'none' && r.t < dm - 0.3)) { fpsHurt(ZBC.DMG, null, null); zmSound('hit'); FPS.hurtT = 0.9; }
      }
    }
    return;
  }
  if (act === 'swing') {
    zbSound('whoosh', Math.hypot(z.x - m.x, z.y - m.y));
    const d = Math.hypot(m.x - z.x, m.y - z.y);
    if (ok() && d < ZBC.REACH && Math.abs(angDiff(bearingOf(m.x - z.x, m.y - z.y), z.h)) < 1.25 && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.3) { fpsHurt(ZBC.DMG, null, null); zmSound('hit'); FPS.hurtT = 0.9; }
  }
}

// ---------- hurting him, and putting him down (hosting, or alone) ----------
// from zmHurt: what a hit does to him (the Black Spot doesn't kill him outright, and the Lamp burns him slowly)
function zbHurtK(z, dmg, how) { return dmg * (ZM.insta > 0 ? 3 : 1) * (how === 'burn' ? 0.5 : 1); }
// a Lamp Flash only scorches him
function zbFlash(z) { z.hp = Math.max(1, z.hp - z.max * 0.2); z.scorch = 1; z.hitT = 0.3; }
// from zmKill: his reward, and his salvage
function zbKilled(z, how, by) {
  zmPoints(ZBC.PTS, false, by);
  const r = Math.random(), k = r < 0.35 ? 'keg' : r < 0.6 ? 'double' : r < 0.8 ? 'spot' : 'flash';
  ZM.drops.push({ k, x: z.x, y: z.y, z: z.jz || 0, t: 30, ph: Math.random() * 6, id: ++ZM.zc });
  zmSound('drop');
  const who = !by || by === FPS.me.id ? 'You' : ((ZM.hum.find(h => h[0] === by) || [])[1] || 'Someone');
  const line = `${who} sent the Diver back to the deep (+${ZBC.PTS}).`;
  fpsFeed(line);
  if (typeof zmnEvent === 'function' && ZM.net === 'host') zmnEvent('feed', line);
  zbDeathFx(z);
}
function zbDeathFx(z) {
  if (z.dfx) return; z.dfx = true;
  const m = FPS.me;
  ZM.banner = { text: 'The Diver goes down', t: 3, small: true, col: '#8affd0' };
  zbSound('die', Math.hypot(z.x - m.x, z.y - m.y));
  for (let i = 0; i < 4; i++) fpsPuff(z.x + (Math.random() - 0.5) * 1.2, z.y + (Math.random() - 0.5) * 1.2, FPSC.GROUND + (z.jz || 0) + 0.8 + i * 0.4, '90,140,120', 8);
}

// ---------- together ----------
// (hosting) him and his blow, for the others: zn, strength (per mille), the blow and how far into it, which blow
// (a count), and where the anchor's coming down
function zbHostSend(o) {
  const CX = FPSC.CX, CY = FPSC.CY, list = ZM.z.filter(q => q.boss && !q.gone);
  if (!list.length) return;
  o.bo = list.map(q => [q.zn, Math.round(clamp(q.hp / q.max, 0, 1) * 1000), ZB_ACT.indexOf(q.act || ''), Math.round((q.at || 0) * 100), q.aseq | 0, Math.round((q.ix - CX) * 10), Math.round((q.iy - CY) * 10)]);
}
// (joined) what the host says of him: and a blow landing is judged here, on me
function zbApply(hz) {
  zbNew();
  const CX = FPSC.CX, CY = FPSC.CY;
  if (Array.isArray(hz.bo)) for (const r of hz.bo) {
    if (!Array.isArray(r)) continue;
    const zn = r[0] | 0, z = ZM.z.find(q => q.zn === zn);
    if (!z) continue;
    if (!z.boss) zbMake(z);
    if (!ZB.seen.has(zn)) { ZB.seen.add(zn); if (!z.dead) zbArrive(z); }
    z.hpk = clamp((+r[1] || 0) / 1000, 0, 1);
    const act = ZB_ACT[r[2] | 0] || null, at = (+r[3] || 0) / 100, seq = r[4] | 0;
    z.ix = CX + (+r[5] || 0) / 10; z.iy = CY + (+r[6] || 0) / 10;
    if (seq !== z.aseq) { z.aseq = seq; z.judged = false; if (act) zbActSound(z, act); }
    z.act = act; z.at = act ? at : 0;
    if (act && !z.judged && at >= ZB_T[act].hit) { z.judged = true; zbStrike(z); }
  }
  for (const z of ZM.z) if (z.boss && z.dead && !z.dfx) zbDeathFx(z);
}

// ---------- sounds ----------
function zbActSound(z, act) {
  const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y);
  if (act === 'slam') zbSound('heave', d); else if (act === 'smash') zbSound('heave', d * 0.8);
}
function zbSound(k, d) {
  try {
    if (soundOff()) return;
    const v = d == null ? 1 : Math.max(0.08, 1 - d / 45);
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

// ---------- in 3D: his model (a pool of its own, in the mode's group), and his pose ----------
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
function zbModel(z) {
  if (ZB.grp !== Z3.grp) { ZB.grp = Z3.grp; ZB.pool = []; }
  let M = ZB.pool.find(p => !p.used);
  if (!M) {
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
    M = { boss: true, root, hips, legs, arms, torso, head, anc, suit, brass, rim, disc, wave, used: false };
    ZB.pool.push(M); Z3.grp.add(root);
  }
  M.used = true; M.root.visible = true;
  M.suit.color.set('#6a6450').multiplyScalar(0.62); M.suit.emissive.set(0); M.brass.emissive.set(0x140e04);
  M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1);
  z.mdl = M; z.duck = z.duck || 0; z.stepS = 0; z.groanT = 3 + Math.random() * 4;
  return M;
}
const ZBV = {};
// one arm reaching for the anchor's ring (or hanging, swinging)
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
function zbPose(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, m = FPS.me;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  // (joined: his blow runs on between the host's word)
  if (ZM.net === 'client' && z.act && !z.dead) z.at = Math.min(ZB_T[z.act].end, (z.at || 0) + dt);
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
  // a groan inside the helmet now and then
  z.groanT = (z.groanT || 3) - dt;
  if (z.groanT <= 0 && !z.dead) { z.groanT = 4 + Math.random() * 5; zbSound('groan', Math.hypot(z.x - m.x, z.y - m.y)); }
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

// ---------- on top: his strength, in a bar at the top of the screen ----------
function zbHud(phone, top) {
  const b = ZM.z.find(q => q.boss && !q.gone && !q.dead) || ZM.z.find(q => q.boss && q.dead && (q.deadT || 0) < 2);
  const frac = b ? (b.dead ? 0 : ZM.net === 'client' ? (b.hpk == null ? 1 : b.hpk) : clamp(b.hp / b.max, 0, 1)) : 0;
  const dt = Math.min(0.1, FPS.dtLast || 0.016);
  ZB.bar = b ? Math.min(1, ZB.bar + dt * 3) : Math.max(0, ZB.bar - dt * 3);
  if (!b || ZB.bar <= 0) return;
  const bw = Math.min(380, W * (phone ? 0.46 : 0.42)), bh = phone ? 7 : 10, x0 = cx - bw / 2, y0 = phone ? top + 70 : 68;
  ctx.globalAlpha = ZB.bar * (b.dead ? Math.max(0, 1 - (b.deadT || 0) / 2) : 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = `400 ${phone ? 15 : 20}px "IM Fell English SC", serif`; ctx.fillStyle = '#8affd0';
  ctx.fillText('The Diver', cx, y0 - 6);
  ctx.fillStyle = 'rgba(8,10,14,0.7)'; ctx.fillRect(x0 - 2, y0 - 2, bw + 4, bh + 4);
  const gr = ctx.createLinearGradient(x0, 0, x0 + bw, 0); gr.addColorStop(0, '#2f9a7a'); gr.addColorStop(1, '#8affd0');
  ctx.fillStyle = gr; ctx.fillRect(x0, y0, bw * frac, bh);
  // (a blow coming: the bar's edge burns)
  if (b.act === 'slam' && !b.dead) { ctx.strokeStyle = `rgba(255,122,64,${0.5 + 0.5 * Math.sin(g.t * 20)})`; ctx.lineWidth = 2; ctx.strokeRect(x0 - 2, y0 - 2, bw + 4, bh + 4); }
  ctx.globalAlpha = 1;
}
