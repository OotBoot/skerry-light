// The Lighthouse: two more bosses, on the framework in src/zmboss.js (their kinds' tables, ZBT.moon and ZBT.crab).
//
// The Mooncusser (from round 14): a wrecker hanged in chains on the point and given back by the sea, a gaunt thing
// a head taller than a man in a long tarred coat cut to rags, iron gibbet bands round his ribs and a broken chain
// from the collar at his throat, a slouch hat dripping weed, eyes like coals; he carries the false light the wreckers
// lured ships onto the rocks with, a ship's lantern hung from the hook of a long boathook pole.
//  - Lighter on his feet than the Diver, and he comes in by any window: up the jetty's ladders and the tower's walls
//    too, and he burns the boards off with his lantern.
//  - The false light: from 4.5 m to 22 m, where his lantern can see you, he lifts it high over his hat and opens its
//    shutter; it swells and brightens for 1.6 s (a cone of light reaches out of it, a rising note, his bar's edge
//    burns, and "Look away from the false light" across the screen), then flares. Anyone looking at it (within about
//    35 degrees of straight at it), with nothing solid between, is dazzled white for three seconds and dragged
//    towards him for 1.7 s (nearly five metres) at half pace (no knock: he means to finish you with the pole). Look away (or get behind
//    something) and it's only a flash. But he's open while he holds it up: a hit then is worth 1.6 times as much.
//  - Close in he swings the pole round at you (one knock).
//  - He carries his own fire: the Lamp's burn hurts him at a quarter the rate.
// The Keelback (from round 18): a great crab made of wrecks fused together, its back the upturned hull of a boat,
// planked and ribbed and crusted with barnacles, a stub of mast and its keel along the top; six legs of spars and
// oars, two great iron claws, and for eyes a ship's sidelights on stalks, red to port and green to starboard.
//  - Wide and low; it heaves itself up over the jetty's edge or comes in by a window on the ground or the sea wall
//    (never up the tower). It scuttles at about the Diver's pace.
//  - The charge: on your floor, 4.5 m to 15 m from you, with a clear run, it rears up and rattles its legs, and a
//    lane glows on the floor from it through you and on (to 4 m past you or the first thing in the way) for 1.2 s
//    (for the first 0.6 s it turns to follow you, the lane with it; then the lane is set); then it runs down the
//    lane at 13 m/s. Anyone it passes over takes two knocks and is thrown aside. Step out of
//    the lane. If the lane ends in something solid, it crashes into it and reels, upturned, for nearly two seconds
//    (and any boards on a window it hits come off).
//  - Its shell takes only 0.6 of any hit; reeling, its soft underside shows and it takes 1.75 times as much.
//  - Close in it snaps its claws (one knock).
// Each always drops salvage, and is worth points on top of the kill (the Mooncusser 600, the Keelback 650).

const ZBM = { HP: 9, PTS: 600, RAD: 0.55, TALL: 2.45, HEADZ: 2.0, PAD: 0.33, LURE_MIN: 4.5, LURE_MAX: 22, LURE_SEE: 26, FACE: 0.62, PULL: 2.8, PULL_T: 1.7, GLARE: 3.0, OPEN_K: 1.6, REACH: 2.6 };
const ZBK2 = { HP: 10, PTS: 650, RAD: 1.05, TALL: 1.55, HEADZ: 1.25, PAD: 0.45, WIND: 1.2, AIM: 0.6, SPEED: 13, MIN: 4.5, MAX: 15, PAST: 4, HIT: 1.3, SHELL: 0.6, SOFT: 1.75, REACH: 2.2 };
const ZBM_T = { lure: { hit: 1.6, end: 2.5 }, pole: { hit: 0.5, end: 1.05 }, smash: { hit: 0.8, end: 1.3 } };
const ZBK_T = { charge: { hit: 99, end: 3 }, reel: { hit: 0.05, end: 1.9 }, pinch: { hit: 0.55, end: 1.1 }, smash: { hit: 0.7, end: 1.3 } };

// where his lantern is (in the world), held up or at his side
function zbmLantern(z) {
  const up = z.act === 'lure' ? 1 : 0, f = up ? 0.55 : 0.35;
  return [z.x + Math.sin(z.h) * f + Math.cos(z.h) * 0.25, z.y + Math.cos(z.h) * f - Math.sin(z.h) * 0.25, FPSC.GROUND + (z.jz || 0) + (up ? 2.75 : 1.5)];
}
// can his lantern see (px, py) at eye height ez: nothing solid between
function zbmSees(z, px, py, ez) {
  const [lx, ly, lz] = zbmLantern(z), dh = Math.hypot(px - lx, py - ly);
  if (dh < 0.3) return true;
  const r = fpsRay(lx, ly, lz, bearingOf(px - lx, py - ly), Math.atan2(ez - lz, dh), null, [], dh);
  return !(r.kind !== 'none' && r.t < dh - 0.3);
}

ZBT.moon = {
  n: 'the Mooncusser', N: 'The Mooncusser', sub: 'a wrecker, and his false light', col: '#ffc860', bar: ['#a8641c', '#ffd27a'], warn: '255,214,120', big: 'lure', puff: '200,150,80',
  hp: ZBM.HP, pts: ZBM.PTS, rad: ZBM.RAD, tall: ZBM.TALL, headZ: ZBM.HEADZ, pad: ZBM.PAD, crowd: 0.8, near: 1.6, scale: 2.2, ladder: 1.8, through: 1.3,
  sp: r => 2.2 + Math.min(0.6, Math.max(0, r - 14) * 0.03),
  win: () => true,
  acts: ZBM_T,
  arriveLine: zn => `A light comes up out of the sea${zn ? ' by ' + zn : ''}: the Mooncusser, with his false light.`,
  smashLine: zn => `The Mooncusser burns his way in through a window of ${zn}.`,
  killLine: (who, pts) => `${who} put out the Mooncusser's light (+${pts}).`,
  init(z) { z.lureCd = 4; },
  cool(z, dt) { if (z.lureCd > 0) z.lureCd -= dt; },
  think(z, p, d, dz, level) {
    if (level && d < ZBM.REACH - 0.3 && z.swCd <= 0) return 'pole';
    if (d > ZBM.LURE_MIN && d < ZBM.LURE_MAX && z.lureCd <= 0 && Math.abs(dz) < 4) {
      if (zbmSees(z, p.x, p.y, FPSC.GROUND + FPSC.EYE + (p.jz || 0))) return 'lure';
      z.lureCd = 0.4;   // (not in sight: look again in a moment)
    }
    return null;
  },
  start(z, act) {
    if (act === 'lure') { z.lureCd = 7 + Math.random() * 2.5; z.swCd = Math.max(z.swCd, 1.0); }
    if (act === 'pole') z.swCd = 1.5 + Math.random() * 0.5;
  },
  during(z, dt, nearest) {
    const T = ZBM_T[z.act];
    if ((z.act === 'lure' || z.act === 'pole') && z.at < T.hit * 0.8) { const p = nearest(z.x, z.y, z.jz); if (p) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * (z.act === 'pole' ? 5 : 3)); }
  },
  strike(z) {
    const m = FPS.me;
    if (z.act === 'pole') { zbmSound('whoosh', Math.hypot(z.x - m.x, z.y - m.y)); zbMelee(z, ZBM.REACH, 1.1, 1); return; }
    if (z.act !== 'lure') return;
    // the light flares: whoever's looking into it, with nothing between, is dazzled and drawn in
    const [lx, ly, lz] = zbmLantern(z), ez = FPSC.GROUND + FPSC.EYE + (m.jz || 0), dh = Math.hypot(lx - m.x, ly - m.y);
    zbmSound('flare', dh);
    z.flare = 0.01;
    if (!zbOk() || (typeof zmIsDown === 'function' && zmIsDown()) || dh > ZBM.LURE_SEE || !zbmSees(z, m.x, m.y, ez)) return;
    const face = Math.abs(angDiff(bearingOf(lx - m.x, ly - m.y), m.h)), pe = Math.atan2(lz - ez, dh);
    if (face < ZBM.FACE && Math.abs(pe - (m.p || 0)) < 0.75) {
      ZB.glare = ZBM.GLARE; ZB.lure = { zn: z.zn, t: ZBM.PULL_T };
      fpsFeed('The false light has you: you stumble towards it, blind.');
      zbmSound('dazzle');
    } else ZB.glare = Math.max(ZB.glare, 0.45 * Math.max(0, 1 - dh / ZBM.LURE_SEE) + 0.1);
  },
  // (his own fire: the Lamp burns him at a quarter the rate; holding the light up, he's open)
  hurtK: (z, how) => (how === 'burn' ? 0.25 : 1) * (z.act === 'lure' && (z.at || 0) < ZBM_T.lure.hit ? ZBM.OPEN_K : 1),
  actSound(z, act) { const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y); if (act === 'lure') zbmSound('raise', d); else if (act === 'smash') zbmSound('burn', d); },
  sound: (k, d) => zbmSound(k, d),
  build: () => zbBuildMoon(),
  reset(z, M) { M.coat.emissive.set(0); M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1); M.glass.color.set(0xffc860); },
  pose: (z, M, dt) => zbPoseMoon(z, M, dt),
};
// (each frame, on my screen) dragged towards his light while it has me
function zbLureTick(dt) {
  const L = ZB.lure, m = FPS.me, z = ZM.z.find(q => q.zn === L.zn && q.boss && !q.dead && !q.gone);
  L.t -= dt;
  if (!z || L.t <= 0 || m.dead > 0 || (typeof zmIsDown === 'function' && zmIsDown())) { ZB.lure = null; return; }
  const dx = z.x - m.x, dy = z.y - m.y, d = Math.hypot(dx, dy);
  if (d > 2.2) zmMove(m, dx / d * ZBM.PULL * dt, dy / d * ZBM.PULL * dt);
  // (and your eyes are drawn to it)
  m.h = wrapPi(m.h + angDiff(bearingOf(dx, dy), m.h) * Math.min(1, dt * 1.2));
}

ZBT.crab = {
  n: 'the Keelback', N: 'The Keelback', sub: 'a crab of a hundred wrecks', col: '#ff8a6a', bar: ['#8a3a26', '#ffa07a'], warn: '255,90,60', big: 'charge', puff: '140,110,80',
  hp: ZBK2.HP, pts: ZBK2.PTS, rad: ZBK2.RAD, tall: ZBK2.TALL, headZ: ZBK2.HEADZ, pad: ZBK2.PAD, crowd: 1.3, near: 1.9, ladder: 2.3, through: 1.5, warnT: ZBK2.WIND,
  sp: r => 1.9 + Math.min(0.5, Math.max(0, r - 18) * 0.03),
  // (the jetty's ladders, the sea wall and the ground's windows: never up the tower)
  win: w => !!w.sea || !((w.z || 0) > 0),
  acts: ZBK_T,
  arriveLine: zn => `Something vast heaves itself out of the sea${zn ? ' by ' + zn : ''}, clattering: the Keelback.`,
  smashLine: zn => `The Keelback tears its way in through a window of ${zn}.`,
  killLine: (who, pts) => `${who} broke the Keelback apart (+${pts}).`,
  init(z) { z.chCd = 3; },
  cool(z, dt) { if (z.chCd > 0) z.chCd -= dt; },
  think(z, p, d, dz, level) {
    if (level && d < ZBK2.REACH && z.swCd <= 0) return 'pinch';
    if (Math.abs(dz) < 0.4 && d > ZBK2.MIN && d < ZBK2.MAX && z.chCd <= 0) {
      const L = zbkLane(z, p, d);
      if (L) { z.lane = L; return 'charge'; }
      z.chCd = 0.5;   // (no clear run at you: look again in a moment)
    }
    return null;
  },
  start(z, act) {
    if (act === 'charge') {
      const L = z.lane;
      z.ax = z.x; z.ay = z.y; z.ix = L[0]; z.iy = L[1]; z.wall = L[3]; z.h = bearingOf(L[0] - z.x, L[1] - z.y);
      z.aEnd = ZBK2.WIND + L[2] / ZBK2.SPEED; z.chCd = 6 + Math.random() * 2.5; z.swCd = Math.max(z.swCd, 1.2); z.chHit = false;
    }
    if (act === 'pinch') z.swCd = 1.4 + Math.random() * 0.5;
    if (act === 'reel') { z.chCd = Math.max(z.chCd, 3); z.crashed = false; }
  },
  endOf: (z, act) => act === 'charge' ? ZBK2.WIND + Math.hypot(z.ix - z.ax, z.iy - z.ay) / ZBK2.SPEED : ZBK_T[act] ? ZBK_T[act].end : 1,
  during(z, dt, nearest, was) {
    if (z.act === 'pinch' && z.at < ZBK_T.pinch.hit * 0.8) { const p = nearest(z.x, z.y, z.jz); if (p) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 4); }
    if (z.act === 'reel' && !z.crashed) {
      // (hosting) what it ran into: any boards on a window there come off
      z.crashed = true;
      for (const w of ZM.windows) if (w.boards > 0 && Math.abs((w.z || 0) - (z.jz || 0)) < 1 && Math.hypot(w.x - z.x, w.y - z.y) < z.rad + 1.2) {
        for (let i = w.boards - 1; i >= 0; i--) w.fall.push({ i, t: 0 });
        w.boards = 0;
        const line = `The Keelback crashes into a window of ${zmZoneName(w.zone)}, and its boards fly.`;
        fpsFeed(line); if (typeof zmnEvent === 'function' && ZM.net === 'host') zmnEvent('feed', line);
      }
    }
    if (z.act !== 'charge') return;
    // down the lane: where it should be by now, and whether it got there
    const L = Math.hypot(z.ix - z.ax, z.iy - z.ay), ux = (z.ix - z.ax) / (L || 1), uy = (z.iy - z.ay) / (L || 1);
    ZBT.crab.judge(z, was, z.at);
    if (z.at < ZBK2.WIND) {
      // (for the first half of the wind-up it follows you round, the lane with it; then it's set)
      if (z.at < ZBK2.AIM) {
        const p = nearest(z.x, z.y, z.jz), d = p ? Math.hypot(p.x - z.x, p.y - z.y) : 0;
        const nl = p && d > 2.5 && Math.abs((p.jz || 0) - (z.jz || 0)) < 0.4 ? zbkLane(z, p, d) : null;
        if (nl) { z.ix = nl[0]; z.iy = nl[1]; z.wall = nl[3]; z.aEnd = ZBK2.WIND + nl[2] / ZBK2.SPEED; }
      }
      z.h = bearingOf(z.ix - z.ax, z.iy - z.ay);
      return;
    }
    const s = Math.min(L, (z.at - ZBK2.WIND) * ZBK2.SPEED), tx = z.ax + ux * s, ty = z.ay + uy * s, dx = tx - z.x, dy = ty - z.y, want = Math.hypot(dx, dy);
    const x0 = z.x, y0 = z.y;
    if (want > 0.01) zmMove(z, dx, dy);
    z.walk = true;
    // (the rest of them, bowled aside)
    zbJostle(z, z.rad + 0.6);
    const got = Math.hypot(z.x - x0, z.y - y0);
    if ((want > 0.05 && got < want * 0.5) || s >= L - 0.01) {
      if (z.wall || s < L - 0.01) { zbStart(z, 'reel'); return; }
      z.act = null; z.at = 0; z.aEnd = 0; z.swCd = Math.max(z.swCd, 0.6);
    }
  },
  // (on every screen, for its own player) did the charge pass over me between at0 and at1
  judge(z, at0, at1) {
    if (z.act !== 'charge' || z.chHit || at1 <= ZBK2.WIND) return;
    const L = Math.hypot(z.ix - z.ax, z.iy - z.ay); if (L < 0.1) return;
    const ux = (z.ix - z.ax) / L, uy = (z.iy - z.ay) / L, s0 = clamp((at0 - ZBK2.WIND) * ZBK2.SPEED, 0, L), s1 = clamp((at1 - ZBK2.WIND) * ZBK2.SPEED, 0, L);
    if (s1 <= s0) return;
    const m = FPS.me, rx = m.x - z.ax, ry = m.y - z.ay, along = clamp(rx * ux + ry * uy, s0, s1), side = rx * uy - ry * ux;
    const d = Math.hypot(m.x - (z.ax + ux * along), m.y - (z.ay + uy * along));
    if (d < ZBK2.HIT && zbOk() && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.2) {
      z.chHit = true;
      fpsHurt(2, null, null); zmSound('hit'); FPS.hurtT = 1.0;
      zbkSound('trample');
      // (thrown aside, out of its way)
      const sg = side >= 0 ? 1 : -1, px = uy * sg, py = -ux * sg;
      for (let i = 0; i < 6; i++) zmMove(m, px * 0.3 + ux * 0.12, py * 0.3 + uy * 0.12);
      FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.3, -0.8, 0.8);
    }
  },
  strike(z) {
    const m = FPS.me, d = Math.hypot(z.x - m.x, z.y - m.y);
    if (z.act === 'pinch') { zbkSound('snap', d); zbMelee(z, ZBK2.REACH + 0.3, 1.0, 1); return; }
    if (z.act === 'reel') {
      zbkSound('crash', d);
      if (d < 10) FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.15 * (1 - d / 10), -0.8, 0.8);
      for (let i = 0; i < 12; i++) fpsPuff(z.x + Math.sin(z.h) * 1.1 + (Math.random() - 0.5) * 1.6, z.y + Math.cos(z.h) * 1.1 + (Math.random() - 0.5) * 1.6, FPSC.GROUND + (z.jz || 0) + 0.3 + Math.random() * 1.2, '130,110,90', 3);
    }
  },
  // (its shell: 0.6 of any hit; reeling, its soft underside shows)
  hurtK: z => z.act === 'reel' ? ZBK2.SOFT : ZBK2.SHELL,
  actSound(z, act) { const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y); if (act === 'charge') zbkSound('rear', d); else if (act === 'smash') zbkSound('rear', d * 1.3); },
  sound: (k, d) => zbkSound(k, d),
  build: () => zbBuildCrab(),
  reset(z, M) { M.wood.emissive.set(0); M.iron.emissive.set(0); M.belly.emissive.set(0); M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1); },
  pose: (z, M, dt) => zbPoseCrab(z, M, dt),
};
// a clear run at p, straight, on its own floor: [end x, end y, length, whether it ends in something solid], or null
function zbkLane(z, p, d) {
  const ux = (p.x - z.x) / d, uy = (p.y - z.y) / d, jz = z.jz || 0, want = d + ZBK2.PAST;
  let s = 0, wall = false;
  const node = (x, y) => { const a = zmNodeIn(zmCell(x, y), jz, 0.3); return a >= 0 && ZM.nav.d[a] < 1e8; };
  const ok = (x, y) => node(x, y) && !zmBlockedAt(x, y, ZBK2.PAD, jz);
  while (s < want) {
    const n = Math.min(want, s + 0.35), x = z.x + ux * n, y = z.y + uy * n;
    if (!ok(x, y) || !node(x - uy * 0.5, y + ux * 0.5) || !node(x + uy * 0.5, y - ux * 0.5)) { wall = true; break; }
    s = n;
  }
  if (s < d - 0.5) return null;   // (something in the way before it reaches you)
  if (!wall) { const x = z.x + ux * (s + 0.6), y = z.y + uy * (s + 0.6); wall = !ok(x, y); }
  return [z.x + ux * s, z.y + uy * s, s, wall];
}

// ---------- sounds ----------
function zbmSound(k, d) {
  try {
    if (soundOff()) return;
    const v = d == null ? 1 : Math.max(0.08, 1 - d / 45);
    { const R = { arrive: 'mooncusser', smash: 'debris' }[k]; if (R && sfxPlay(R, { vol: (k === 'arrive' ? 0.95 : 0.85) * v, vary: 0.05 })) return; }   // (the recordings: src/sfxbank.js)
    if (k === 'arrive') {
      // a wrecker's whistle across the water, and the lantern's iron creaking as it swings
      tone(880, 'sine', 0.05, 0.08, 0.5, { to: 1320 }); tone(1320, 'sine', 0.05, 0.07, 0.7, { delay: 0.55, to: 660 });
      tone(110, 'sawtooth', 0.6, 0.08, 2.6, { delay: 0.3, to: 92 }); noise('bandpass', 700, 6, 0.4, 0.1, 2.0, { delay: 0.4, to: 420 });
      for (let i = 0; i < 4; i++) noise('bandpass', 1800 + i * 300, 12, 0.01, 0.06, 0.25, { delay: 1.2 + i * 0.45 });
    } else if (k === 'step') { noise('lowpass', 260, 1, 0.005, 0.12 * v, 0.14); if (Math.random() < 0.6) noise('bandpass', 3200 + Math.random() * 800, 14, 0.002, 0.05 * v, 0.1, { delay: 0.04 }); }
    else if (k === 'raise') {
      // the shutter opening, and the light rising to a whine
      noise('bandpass', 2400, 8, 0.01, 0.12 * v, 0.15);
      tone(330, 'sine', 1.4, 0.12 * v, 1.7, { to: 1480 }); tone(495, 'triangle', 1.4, 0.06 * v, 1.7, { to: 2220 });
    } else if (k === 'flare') { noise('highpass', 2500, 1, 0.003, 0.3 * v, 0.5); tone(1760, 'sine', 0.003, 0.14 * v, 0.9, { to: 1200 }); tone(2637, 'sine', 0.003, 0.08 * v, 1.1); }
    else if (k === 'dazzle') { tone(2093, 'sine', 0.01, 0.12, 2.4, { to: 1900 }); tone(2217, 'sine', 0.01, 0.08, 2.4, { to: 2000 }); noise('highpass', 4000, 1, 0.02, 0.08, 2.0); }
    else if (k === 'whoosh') { noise('bandpass', 520, 2, 0.06, 0.26 * v, 0.28, { to: 220 }); }
    else if (k === 'burn') { for (let i = 0; i < 10; i++) noise('bandpass', 900 + Math.random() * 1600, 4, 0.004, 0.14 * v, 0.1, { delay: i * 0.08 + Math.random() * 0.05 }); noise('lowpass', 500, 1, 0.1, 0.15 * v, 1.0); }
    else if (k === 'smash') { for (let i = 0; i < 5; i++) noise('bandpass', 600 + Math.random() * 900, 2, 0.003, 0.3 * v, 0.25, { delay: i * 0.07 }); noise('lowpass', 400, 1, 0.01, 0.25 * v, 0.8); }
    else if (k === 'groan') { tone(150 + Math.random() * 40, 'sawtooth', 0.15, 0.05 * v, 0.9, { to: 95 }); noise('bandpass', 900, 5, 0.1, 0.07 * v, 0.6, { to: 500 }); }
    else if (k === 'die') {
      // the lantern's glass going, and the light with it
      for (let i = 0; i < 9; i++) noise('bandpass', 3000 + Math.random() * 3000, 9, 0.002, 0.12 * v, 0.12, { delay: i * 0.05 + Math.random() * 0.04 });
      tone(1200, 'sine', 0.01, 0.1 * v, 1.6, { to: 120 }); tone(140, 'sawtooth', 0.1, 0.1 * v, 1.8, { to: 60 });
    }
  } catch (e) {}
}
function zbkSound(k, d) {
  try {
    if (soundOff()) return;
    const v = d == null ? 1 : Math.max(0.08, 1 - d / 45);
    { const R = { arrive: 'keelback', rush: 'charge', crash: 'slam', smash: 'debris' }[k]; if (R && sfxPlay(R, { vol: (k === 'arrive' ? 0.95 : 0.85) * v, vary: 0.05 })) return; }   // (the recordings: src/sfxbank.js)
    if (k === 'arrive') {
      // a hull groaning on the rocks, and the clatter of a hundred joints
      tone(48, 'sawtooth', 0.5, 0.16, 2.6, { to: 40 }); noise('bandpass', 320, 3, 0.4, 0.18, 2.2, { to: 180 });
      for (let i = 0; i < 16; i++) noise('bandpass', 1400 + Math.random() * 1800, 10, 0.002, 0.07, 0.05, { delay: 0.6 + i * 0.07 + Math.random() * 0.03 });
      tone(64, 'square', 0.3, 0.05, 1.6, { delay: 1.4, to: 50 });
    } else if (k === 'step') { for (let i = 0; i < 3; i++) noise('bandpass', 1500 + Math.random() * 1500, 9, 0.002, 0.07 * v, 0.05, { delay: i * 0.045 }); noise('lowpass', 200, 1, 0.005, 0.1 * v, 0.12); }
    else if (k === 'rear') {
      // rattling, faster and faster, and the timbers creaking as it digs in
      for (let i = 0; i < 18; i++) noise('bandpass', 1200 + Math.random() * 2000, 10, 0.002, 0.09 * v, 0.04, { delay: i * 0.065 * (1 - i / 30) });
      tone(60, 'sawtooth', 0.8, 0.1 * v, 1.2, { to: 92 }); noise('bandpass', 260, 4, 0.5, 0.12 * v, 0.9, { to: 520 });
    } else if (k === 'rush') { noise('lowpass', 300, 1, 0.02, 0.3 * v, 0.9, { to: 900 }); tone(70, 'sine', 0.02, 0.2 * v, 0.8, { to: 45 }); }
    else if (k === 'crash') {
      noise('lowpass', 160, 1, 0.003, 0.7 * v, 1.0); tone(38, 'sine', 0.003, 0.5 * v, 0.9, { to: 26 });
      for (let i = 0; i < 8; i++) noise('bandpass', 400 + Math.random() * 1200, 3, 0.003, 0.2 * v, 0.2, { delay: 0.05 + i * 0.07 });
    } else if (k === 'trample') { noise('lowpass', 240, 1, 0.003, 0.5, 0.5); tone(55, 'sine', 0.003, 0.35, 0.5, { to: 35 }); }
    else if (k === 'snap') { noise('bandpass', 2400, 3, 0.002, 0.35 * v, 0.08); noise('bandpass', 700, 2, 0.002, 0.25 * v, 0.15, { delay: 0.02 }); }
    else if (k === 'smash') { for (let i = 0; i < 6; i++) noise('bandpass', 500 + Math.random() * 900, 2, 0.003, 0.35 * v, 0.3, { delay: i * 0.06 }); noise('lowpass', 220, 1, 0.005, 0.45 * v, 0.7); }
    else if (k === 'groan') { tone(44 + Math.random() * 10, 'sawtooth', 0.4, 0.07 * v, 1.4, { to: 38 }); noise('bandpass', 240, 4, 0.4, 0.1 * v, 1.2, { to: 160 }); }
    else if (k === 'die') {
      tone(52, 'sawtooth', 0.1, 0.15 * v, 2.2, { to: 28 }); noise('lowpass', 260, 1, 0.05, 0.45 * v, 1.8, { to: 70 });
      for (let i = 0; i < 12; i++) noise('bandpass', 400 + Math.random() * 1400, 4, 0.003, 0.14 * v, 0.12, { delay: 0.2 + i * 0.12 + Math.random() * 0.08 });
    }
  } catch (e) {}
}

// ---------- the Mooncusser in 3D ----------
const ZBMG = {};
function zbmGeo() {
  if (ZBMG.ok) return ZBMG;
  const Q = ZBMG;
  Q.leg = new THREE.CylinderGeometry(0.09, 0.065, 1.25, 8); Q.leg.translate(0, -0.625, 0);
  Q.boot = new THREE.BoxGeometry(0.17, 0.16, 0.34);
  Q.body = new THREE.CylinderGeometry(0.25, 0.32, 0.95, 10); Q.body.translate(0, 0.475, 0);
  // the coat's skirt, cut to rags at the hem
  Q.skirt = new THREE.CylinderGeometry(0.34, 0.6, 1.1, 18, 3, true); Q.skirt.translate(0, -0.5, 0);
  { const P = Q.skirt.attributes.position, rnd = seeded(77); for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y < -0.9) { P.setY(i, y + rnd() * 0.32); const k = 0.9 + rnd() * 0.25; P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k); } } Q.skirt.computeVertexNormals(); }
  Q.cape = new THREE.CylinderGeometry(0.22, 0.46, 0.4, 14, 1, true);
  Q.band = new THREE.TorusGeometry(0.3, 0.026, 6, 20); Q.band.rotateX(Math.PI / 2);
  Q.strap = new THREE.BoxGeometry(0.05, 0.62, 0.025);
  Q.collar = new THREE.TorusGeometry(0.13, 0.03, 6, 14); Q.collar.rotateX(Math.PI / 2);
  Q.link = new THREE.TorusGeometry(0.035, 0.011, 4, 8);
  Q.skull = new THREE.SphereGeometry(0.15, 12, 10);
  Q.jaw = new THREE.BoxGeometry(0.15, 0.07, 0.13);
  Q.eye = new THREE.SphereGeometry(0.024, 6, 5);
  Q.brim = new THREE.CylinderGeometry(0.4, 0.43, 0.025, 18);
  Q.crown = new THREE.CylinderGeometry(0.15, 0.19, 0.2, 12);
  Q.arm = new THREE.CylinderGeometry(0.06, 0.045, 0.85, 8); Q.arm.translate(0, -0.425, 0);
  Q.hand = new THREE.SphereGeometry(0.065, 8, 6);
  Q.weed = new THREE.BoxGeometry(0.035, 0.42, 0.01); Q.weed.translate(0, -0.21, 0);
  // the boathook pole: its grip at the origin, the hook at the top
  Q.pole = new THREE.CylinderGeometry(0.03, 0.036, 2.7, 7); Q.pole.translate(0, 0.35, 0);
  Q.hook = new THREE.TorusGeometry(0.11, 0.02, 5, 12, Math.PI * 1.3);
  Q.spike = new THREE.ConeGeometry(0.03, 0.18, 6);
  // the lantern: a cap, a brass cage, the glass lit from inside
  Q.cap = new THREE.ConeGeometry(0.12, 0.12, 8); Q.cap.translate(0, -0.08, 0);
  Q.cage = new THREE.BoxGeometry(0.018, 0.26, 0.018);
  Q.glass = new THREE.CylinderGeometry(0.085, 0.085, 0.22, 10);
  Q.base = new THREE.CylinderGeometry(0.11, 0.1, 0.05, 10);
  Q.ringT = new THREE.TorusGeometry(0.04, 0.01, 4, 10);
  // the false light's reach: a cone out of the lantern
  Q.beam = new THREE.ConeGeometry(1.3, 5, 24, 1, true); Q.beam.translate(0, -2.5, 0); Q.beam.rotateX(Math.PI / 2);
  Q.coatM = '#2a2a24'; Q.ironM = z3Lam('#4a3e36'); Q.bootM = z3Lam('#1c1a18'); Q.hatM = z3Lam('#2c241a'); Q.poleM = z3Lam('#4a3826');
  Q.brassM = z3Lam('#a07a36', { emissive: 0x201406 });
  Q.boneM = z3Lam('#a8b4a2'); Q.weedM = new THREE.MeshLambertMaterial({ color: 0x223e26, emissive: 0x061a0c });
  Q.eyeM = new THREE.MeshBasicMaterial({ color: 0xffb040 });
  Q.halo = z3Soft('rgba(255,214,130,0.95)', 'rgba(255,190,90,0)');
  Q.ok = true;
  return Q;
}
function zbBuildMoon() {
  const Q = zbmGeo(), root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 1.3;
  const coat = z3Lam(Q.coatM, { side: THREE.DoubleSide });
  const mesh = (geo, mat, x, y, zz, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, zz || 0); (parent || hips).add(o); return o; };
  const sprite = (parent, x, y, zz, s) => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); o.position.set(x, y, zz); o.scale.setScalar(s); parent.add(o); return o; };
  const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.14, 0, 0); hips.add(p); mesh(Q.leg, Q.bootM, 0, 0, 0, p); mesh(Q.boot, Q.bootM, 0, -1.26, -0.06, p); return p; });
  const torso = new THREE.Group(); hips.add(torso);
  mesh(Q.body, coat, 0, 0, 0, torso).scale.set(1, 1, 0.75);
  mesh(Q.skirt, coat, 0, 0.12, 0, hips).scale.set(1, 1, 0.8);
  mesh(Q.cape, coat, 0, 0.82, 0, torso).scale.set(1, 1, 0.8);
  // hanged in chains: iron bands round his ribs, straps down front and back, a collar and a broken chain
  for (const y of [0.32, 0.6]) mesh(Q.band, Q.ironM, 0, y, 0, torso).scale.set(1, 1, 0.82);
  for (const zz of [-0.25, 0.25]) mesh(Q.strap, Q.ironM, 0, 0.48, zz, torso);
  mesh(Q.collar, Q.ironM, 0, 1.02, -0.01, torso);
  for (let i = 0; i < 6; i++) { const l = mesh(Q.link, Q.ironM, -0.08 + Math.sin(i * 0.5) * 0.02, 0.97 - i * 0.06, -0.13 - i * 0.01, torso); l.rotation.y = i % 2 ? Math.PI / 2 : 0; }
  for (let i = 0; i < 5; i++) { const k = mesh(Q.weed, Q.weedM, -0.2 + i * 0.1, 0.9 - (i % 2) * 0.25, 0.27, torso); k.rotation.z = (i - 2) * 0.12; }
  // his head: a drowned man's skull under the skin, coals for eyes, a weed beard, the slouch hat
  const head = new THREE.Group(); head.position.set(0, 1.2, -0.04); torso.add(head);
  mesh(Q.skull, Q.boneM, 0, 0, 0, head).scale.set(0.85, 1.15, 0.95);
  mesh(Q.jaw, Q.boneM, 0, -0.13, -0.04, head);
  for (const s of [-1, 1]) mesh(Q.eye, Q.eyeM, s * 0.05, 0.02, -0.128, head);
  sprite(head, 0, 0.02, -0.16, 0.3);
  for (let i = 0; i < 4; i++) { const k = mesh(Q.weed, Q.weedM, -0.06 + i * 0.04, -0.15, -0.1, head); k.rotation.x = -0.2; k.scale.y = 0.8; }
  const hat = new THREE.Group(); hat.position.y = 0.12; hat.rotation.x = 0.1; head.add(hat);
  mesh(Q.brim, Q.hatM, 0, 0, 0, hat); mesh(Q.crown, Q.hatM, 0, 0.1, 0, hat);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.3, k = mesh(Q.weed, Q.weedM, Math.cos(a) * 0.38, -0.01, Math.sin(a) * 0.38, hat); k.scale.y = 0.6 + (i % 3) * 0.25; }
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.32, 0.88, 0); torso.add(p); mesh(Q.arm, coat, 0, 0, 0, p); mesh(Q.hand, Q.boneM, 0, -0.88, 0, p); return p; });
  // the pole in his right hand, the lantern hung from its hook
  const pole = new THREE.Group(); torso.add(pole);
  mesh(Q.pole, Q.poleM, 0, 0, 0, pole);
  const hk = mesh(Q.hook, Q.ironM, 0.1, 1.72, 0, pole); hk.rotation.z = -0.4;
  mesh(Q.spike, Q.ironM, 0, 1.78, 0, pole);
  const lan = new THREE.Group(); lan.position.set(0.2, 1.66, 0); pole.add(lan);
  mesh(Q.ringT, Q.brassM, 0, 0, 0, lan);
  mesh(Q.cap, Q.brassM, 0, 0, 0, lan);
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.78; mesh(Q.cage, Q.brassM, Math.cos(a) * 0.09, -0.27, Math.sin(a) * 0.09, lan); }
  const glassM = new THREE.MeshBasicMaterial({ color: 0xffc860 });
  mesh(Q.glass, glassM, 0, -0.27, 0, lan);
  mesh(Q.base, Q.brassM, 0, -0.41, 0, lan);
  const halo = sprite(lan, 0, -0.27, 0, 1.1);
  // (the false light's cone, in his own space: out ahead of the lantern when it's held up)
  const beamM = new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Mesh(Q.beam, beamM); beam.renderOrder = 2; beam.visible = false; root.add(beam);
  return { root, hips, legs, arms, torso, head, pole, lan, glass: glassM, halo, beam, coat };
}
const ZBMV = {};
function zbPoseMoon(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, m = FPS.me;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  // a long, loping stride, stooped, the pole planted with each step
  const walking = z.walk && !z.act && !z.dead;
  if (walking) z.ph += dt * z.sp * 1.9;
  const A = walking ? 0.55 : 0.05, ph = z.ph, s = Math.sin(ph);
  if (walking && Math.sign(s) !== z.stepS && z.stepS) zbmSound('step', Math.hypot(z.x - m.x, z.y - m.y));
  z.stepS = Math.sign(s) || 1;
  let duck = z.st === 'climb' ? 1 : 0;
  if (!duck) for (const d of ZM.doors) if (Math.hypot(d.x - z.x, d.y - z.y) < 1.6) { duck = 1; break; }
  z.duck = zbL(z.duck || 0, duck, Math.min(1, dt * 4));
  M.legs[0].rotation.x = s * A; M.legs[1].rotation.x = -s * A;
  M.hips.position.y = 1.3 - Math.abs(Math.cos(ph)) * 0.08 * A * 2 - z.duck * 0.25;
  let pitch = -0.28 - z.duck * 0.4, roll = Math.sin(ph) * 0.07 * (walking ? 1 : 0.3);
  // the pole: where his right hand grips it (torso space) and which way it runs from there
  let gx = 0.4, gy = 0.18, gz = -0.22, dx = 0.06, dy = 1, dz = -0.1 + Math.sin(ph) * 0.18 * (walking ? 1 : 0), left = null;
  const at = z.at || 0;
  // the light: how bright, and its cone
  let glow = 1.1 + Math.sin(t * 13 + z.seed) * 0.06 + Math.sin(t * 7.3) * 0.05, beam = 0;
  if (z.act === 'lure' && !z.dead) {
    const T = ZBM_T.lure, k = zbE(at / 0.6);
    gx = zbL(0.4, 0.26, k); gy = zbL(0.18, 1.08, k); gz = zbL(-0.22, -0.32, k); dx = zbL(0.06, 0.02, k); dy = zbL(1, 0.72, k); dz = zbL(dz, -0.7, k);
    pitch = zbL(pitch, 0.05, k);
    left = [-0.12, 1.12, -0.36];   // (his other arm up, shielding his own eyes)
    if (at < T.hit) { const q = at / T.hit; glow = 1.2 + 3.0 * q * q + Math.sin(t * (20 + q * 30)) * 0.25 * q; beam = 0.03 + 0.12 * q * q; }
    else { const q = (at - T.hit) / (T.end - T.hit); glow = zbL(7, 1.3, Math.min(1, q * 2.5)); beam = Math.max(0, 0.3 * (1 - q * 3)); }
  } else if (z.act === 'pole' && !z.dead) {
    const T = ZBM_T.pole;
    if (at < 0.3) { const k = zbE(at / 0.3); gx = zbL(0.4, 0.52, k); gy = zbL(0.18, 0.75, k); gz = zbL(-0.22, 0.22, k); dx = zbL(0.06, 0.9, k); dy = zbL(1, 0.25, k); dz = zbL(dz, 0.35, k); roll = zbL(roll, -0.18, k); }
    else if (at < T.hit + 0.1) { const k = zbE((at - 0.3) / (T.hit + 0.1 - 0.3)); gx = zbL(0.52, -0.2, k); gy = zbL(0.75, 0.6, k); gz = zbL(0.22, -0.5, k); dx = zbL(0.9, -0.75, k); dy = 0.25; dz = zbL(0.35, -0.6, k); roll = zbL(-0.18, 0.2, k); }
    else { const k = zbE((at - T.hit - 0.1) / (T.end - T.hit - 0.1)); gx = zbL(-0.2, 0.4, k); gy = zbL(0.6, 0.18, k); gz = zbL(-0.5, -0.22, k); dx = zbL(-0.75, 0.06, k); dy = zbL(0.25, 1, k); dz = zbL(-0.6, -0.1, k); }
    left = [gx - 0.1, gy - 0.25, gz + 0.05];
  } else if (z.act === 'smash' && !z.dead) {
    // the lantern held to the boards, and they catch
    const k = zbE(at / 0.4);
    gx = zbL(0.4, 0.22, k); gy = zbL(0.18, 0.55, k); gz = zbL(-0.22, -0.5, k); dx = zbL(0.06, 0.1, k); dy = zbL(1, 0.45, k); dz = zbL(dz, -0.9, k);
    glow = 1.2 + 2.5 * k + Math.sin(t * 30) * 0.3;
    if (Math.random() < dt * 14 && z.win) fpsPuff(z.win.x + (Math.random() - 0.5) * 1.2, z.win.y + (Math.random() - 0.5) * 1.2, G0 + (z.win.z || 0) + 0.6 + Math.random() * 1.2, '255,150,60', 1.5);
  } else if (z.scaling) {
    // (hand over hand up the wall, the pole slung)
    pitch = 0.3; gx = 0.3; gy = 0.9; gz = 0.25; dx = 0.2; dy = 0.9; dz = 0.4; left = [-0.25, 1.4, -0.3];
  }
  M.torso.rotation.set(pitch, 0, roll);
  M.pole.position.set(gx, gy, gz);
  const V = ZBMV.v || (ZBMV.v = new THREE.Vector3()), U = ZBMV.u || (ZBMV.u = new THREE.Vector3(0, 1, 0)), Qi = ZBMV.q || (ZBMV.q = new THREE.Quaternion());
  V.set(dx, dy, dz).normalize();
  M.pole.quaternion.setFromUnitVectors(U, V);
  // (the lantern hangs straight down from its hook, swinging)
  Qi.copy(M.pole.quaternion).invert(); M.lan.quaternion.copy(Qi);
  M.lan.rotateX(Math.sin(t * 2.1 + z.seed) * 0.15 + (walking ? Math.sin(ph) * 0.2 : 0)); M.lan.rotateZ(Math.sin(t * 1.7) * 0.1);
  zbReach(M.arms[1], gx + 0.02, gy, gz);
  if (left) zbReach(M.arms[0], left[0], left[1], left[2]);
  else { M.arms[0].quaternion.identity(); M.arms[0].rotation.set(-0.15 - Math.sin(ph) * 0.4 * A, 0, -0.1); }
  M.head.rotation.set((z.act === 'lure' ? -0.2 : 0.15) + Math.sin(t * 0.6 + z.seed) * 0.05, Math.sin(t * 0.35 + z.seed) * 0.25, Math.sin(t * 0.8) * 0.06);
  if (z.dead) { glow = Math.max(0, 1 - (z.deadT || 0)) * 1.1; beam = 0; }
  M.halo.scale.setScalar(Math.max(0.01, glow)); M.halo.material.opacity = Math.min(1, 0.5 + glow * 0.2);
  M.glass.color.setRGB(1, 0.78 + Math.min(0.22, glow * 0.02), 0.38 + Math.min(0.6, glow * 0.05)).multiplyScalar(z.dead ? Math.max(0.1, 1 - (z.deadT || 0)) : 1);
  // the cone: from the lantern (held high and ahead) out towards whoever he's looking at
  if (beam > 0.005) {
    M.beam.visible = true; M.beam.material.opacity = beam;
    M.beam.position.set(0.2, 2.62 - z.duck * 0.3, -0.55); M.beam.rotation.set(-0.12, 0, 0);
  } else M.beam.visible = false;
  // hit: a pale flash on the coat; burning: a dull glow; dead: down on his knees, over, and the light goes out
  const flash = z.hitT > 0 ? z.hitT / 0.15 : 0, hot = (z.scorch || 0) * 0.7;
  M.coat.emissive.setRGB(0.2 * flash + hot * 0.5, 0.2 * flash + hot * 0.25, 0.18 * flash + hot * 0.05);
  if (z.scorch > 0) z.scorch = Math.max(0, z.scorch - dt * 0.8);
  if (z.dead) {
    const k = zbE((z.deadT || 0) / 1.1);
    M.root.rotation.set(-k * 1.4, -z.h, 0, 'YXZ');
    M.root.position.y -= Math.max(0, (z.deadT || 0) - 1.2) * 0.9;
  }
}

// ---------- the Keelback in 3D ----------
const ZBKG = {};
function zbkGeo() {
  if (ZBKG.ok) return ZBKG;
  const Q = ZBKG;
  // its back: half a boat's hull, upturned, flattened, along its length (forward is -z)
  Q.hull = new THREE.CylinderGeometry(1.0, 1.0, 2.4, 18, 1, true, Math.PI / 2, Math.PI); Q.hull.rotateX(Math.PI / 2);
  Q.rib = new THREE.TorusGeometry(1.03, 0.045, 5, 16, Math.PI);
  Q.keel = new THREE.BoxGeometry(0.12, 0.16, 2.6);
  Q.strake = new THREE.BoxGeometry(0.03, 0.03, 2.38);
  Q.end = new THREE.CircleGeometry(1.0, 16, 0, Math.PI);
  Q.under = new THREE.SphereGeometry(0.85, 14, 10);
  Q.barn = new THREE.ConeGeometry(0.06, 0.07, 6);
  Q.mast = new THREE.CylinderGeometry(0.07, 0.09, 1.2, 7); Q.mast.translate(0, 0.6, 0);
  Q.weed = new THREE.BoxGeometry(0.05, 0.5, 0.012); Q.weed.translate(0, -0.25, 0);
  // the legs: spars and oars, each in two lengths
  Q.upper = new THREE.CylinderGeometry(0.075, 0.06, 0.85, 7); Q.upper.translate(0, 0.425, 0);
  Q.lower = new THREE.CylinderGeometry(0.06, 0.025, 1.38, 7); Q.lower.translate(0, -0.69, 0);
  Q.blade = new THREE.BoxGeometry(0.16, 0.45, 0.025); Q.blade.translate(0, -0.95, 0);
  Q.knee = new THREE.SphereGeometry(0.085, 7, 6);
  // the claws: an iron arm, and a pincer of two jaws
  Q.carm = new THREE.CylinderGeometry(0.11, 0.09, 0.75, 8); Q.carm.translate(0, -0.375, 0); Q.carm.rotateX(Math.PI / 2);
  Q.jawA = new THREE.ConeGeometry(0.17, 0.8, 6); Q.jawA.rotateX(-Math.PI / 2); Q.jawA.translate(0, 0, -0.4); Q.jawA.scale(1, 0.55, 1);
  Q.jawB = new THREE.ConeGeometry(0.11, 0.65, 6); Q.jawB.rotateX(-Math.PI / 2); Q.jawB.translate(0, 0, -0.32); Q.jawB.scale(1, 0.55, 1);
  Q.palm = new THREE.SphereGeometry(0.2, 10, 8);
  // the eyes: a ship's sidelights on stalks
  Q.stalk = new THREE.CylinderGeometry(0.03, 0.04, 0.55, 6); Q.stalk.translate(0, 0.275, 0);
  Q.light = new THREE.CylinderGeometry(0.075, 0.075, 0.13, 8);
  Q.lcap = new THREE.ConeGeometry(0.09, 0.08, 8);
  Q.lane = new THREE.PlaneGeometry(1, 1); Q.lane.rotateX(-Math.PI / 2);
  Q.edge = new THREE.PlaneGeometry(0.14, 1); Q.edge.rotateX(-Math.PI / 2);
  Q.woodC = '#5a4630'; Q.ironC = '#5e3826'; Q.bellyC = '#b89a86';
  Q.darkM = z3Lam('#241c18'); Q.ribM = z3Lam('#3a2a1c'); Q.barnM = z3Lam('#bab4a6'); Q.copperM = z3Lam('#3f7a62'); Q.oarM = z3Lam('#7a6448');
  Q.weedM = new THREE.MeshLambertMaterial({ color: 0x1e4a32, emissive: 0x08200f });
  Q.portM = new THREE.MeshBasicMaterial({ color: 0xff3a2a }); Q.stbdM = new THREE.MeshBasicMaterial({ color: 0x3aff7a });
  Q.portH = z3Soft('rgba(255,70,50,0.9)', 'rgba(255,70,50,0)'); Q.stbdH = z3Soft('rgba(70,255,130,0.9)', 'rgba(70,255,130,0)');
  Q.ok = true;
  return Q;
}
function zbBuildCrab() {
  const Q = zbkGeo(), root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 0.95;
  const wood = z3Lam(Q.woodC, { side: THREE.DoubleSide }), iron = z3Lam(Q.ironC), belly = z3Lam(Q.bellyC);
  const mesh = (geo, mat, x, y, zz, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, zz || 0); (parent || body).add(o); return o; };
  const rnd = seeded(4242);
  // the hull on its back, ribs and strakes, its keel along the top, barnacles, copper sheathing, a stub of mast
  const shell = new THREE.Group(); shell.position.y = 0.05; body.add(shell);
  mesh(Q.hull, wood, 0, 0, 0, shell).scale.set(1.05, 0.62, 1);
  for (const e of [-1.2, 1.2]) mesh(Q.end, Q.darkM, 0, 0, e, shell).scale.set(1.05, 0.62, 1);
  for (const zz of [-1.0, -0.5, 0, 0.5, 1.0]) mesh(Q.rib, Q.ribM, 0, 0, zz, shell).scale.set(1.05, 0.62, 1);
  for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI; mesh(Q.strake, Q.ribM, Math.cos(a) * 1.06, Math.sin(a) * 0.645, 0, shell); }
  mesh(Q.keel, Q.ribM, 0, 0.66, 0, shell);
  for (let i = 0; i < 26; i++) { const a = 0.25 + rnd() * (Math.PI - 0.5), zz = (rnd() - 0.5) * 2.2, b = mesh(Q.barn, Q.barnM, Math.cos(a) * 1.07, Math.sin(a) * 0.66, zz, shell); b.rotation.z = a - Math.PI / 2; b.scale.setScalar(0.6 + rnd() * 0.9); }
  for (let i = 0; i < 3; i++) { const a = 0.5 + i * 0.9, p = mesh(new THREE.BoxGeometry(0.4, 0.02, 0.5), Q.copperM, Math.cos(a) * 1.07, Math.sin(a) * 0.665, 0.3 - i * 0.5, shell); p.rotation.z = a - Math.PI / 2; }
  const mast = mesh(Q.mast, Q.oarM, 0.15, 0.6, 0.55, shell); mast.rotation.set(0.55, 0, -0.3);
  for (let i = 0; i < 9; i++) { const s = i % 2 ? 1 : -1, k = mesh(Q.weed, Q.weedM, s * (0.95 + rnd() * 0.12), 0.05, -1.0 + i * 0.25, shell); k.rotation.z = s * 0.25; k.scale.y = 0.7 + rnd() * 0.6; }
  // under it all, the thing itself: dark and wet, a pale belly (it shows when it's upturned)
  mesh(Q.under, Q.darkM, 0, -0.08, 0).scale.set(1.05, 0.42, 1.3);
  mesh(Q.under, belly, 0, -0.22, 0).scale.set(0.8, 0.3, 1.05);
  // mouthparts, a broken figurehead's face set in among them
  for (let i = 0; i < 4; i++) { const r = mesh(Q.stalk, Q.darkM, -0.18 + i * 0.12, -0.15, -1.15, body); r.rotation.x = Math.PI * 0.85; r.scale.set(1, 0.6, 1); }
  mesh(new THREE.SphereGeometry(0.17, 10, 8), Q.barnM, 0, 0.0, -1.18).scale.set(0.85, 1.1, 0.6);
  // eyes on stalks: red to port, green to starboard
  const eyes = [-1, 1].map(s => {
    const p = new THREE.Group(); p.position.set(s * 0.32, 0.25, -1.0); body.add(p);
    mesh(Q.stalk, Q.darkM, 0, 0, 0, p);
    const head = new THREE.Group(); head.position.y = 0.58; p.add(head);
    mesh(Q.light, s < 0 ? Q.portM : Q.stbdM, 0, 0, 0, head); mesh(Q.lcap, iron, 0, 0.1, 0, head);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: s < 0 ? Q.portH : Q.stbdH, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); h.scale.setScalar(0.7); head.add(h);
    return p;
  });
  // six legs, three a side
  const legs = [];
  for (const s of [-1, 1]) for (const [i, zz] of [[0, -0.7], [1, 0], [2, 0.7]].map(a => a)) {
    const hip = new THREE.Group(); hip.position.set(s * 0.82, -0.08, zz); body.add(hip);
    const up = new THREE.Group(); hip.add(up); mesh(Q.upper, Q.oarM, 0, 0, 0, up);
    const kn = new THREE.Group(); kn.position.y = 0.85; up.add(kn); mesh(Q.knee, Q.darkM, 0, 0, 0, kn); mesh(Q.lower, Q.oarM, 0, 0, 0, kn);
    if ((i + (s > 0 ? 1 : 0)) % 2) mesh(Q.blade, Q.oarM, 0, 0, 0, kn);
    legs.push({ s, i, hip, up, kn, par: (i + (s > 0 ? 1 : 0)) % 2 });
  }
  // two great claws
  const claws = [-1, 1].map(s => {
    const sh = new THREE.Group(); sh.position.set(s * 0.6, -0.05, -0.95); body.add(sh);
    mesh(Q.carm, iron, 0, 0, 0, sh);
    const hand = new THREE.Group(); hand.position.set(0, 0, -0.72); sh.add(hand);
    mesh(Q.palm, iron, 0, 0, 0, hand).scale.set(1, 0.8, 1.2);
    mesh(Q.jawA, iron, 0, 0.05, -0.1, hand);
    const dac = new THREE.Group(); dac.position.set(0, -0.06, -0.1); hand.add(dac); mesh(Q.jawB, iron, 0, 0, 0, dac);
    for (let i = 0; i < 3; i++) { const b = mesh(Q.barn, Q.barnM, (i - 1) * 0.08, 0.12, -0.05 - i * 0.12, hand); b.scale.setScalar(0.7); }
    return { sh, hand, dac };
  });
  // the lane it'll charge down, on the floor (in its own space, set each frame)
  const laneM = new THREE.MeshBasicMaterial({ color: 0xff4a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const edgeM = new THREE.MeshBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const lane = new THREE.Mesh(Q.lane, laneM), edges = [-1, 1].map(() => new THREE.Mesh(Q.edge, edgeM)), cap = new THREE.Mesh(Q.edge, edgeM);
  for (const o of [lane, cap, ...edges]) { o.renderOrder = 2; o.visible = false; root.add(o); }
  return { root, body, shell, legs, claws, eyes, wood, iron, belly, lane, edges, cap };
}
function zbPoseCrab(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, m = FPS.me, at = z.at || 0;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  const charge = z.act === 'charge' && !z.dead, wind = charge && at < ZBK2.WIND, run = charge && !wind, reel = z.act === 'reel' && !z.dead;
  if (run && z.rushed !== z.aseq) { z.rushed = z.aseq; zbkSound('rush', Math.hypot(z.x - m.x, z.y - m.y)); }
  const walking = (z.walk || z.st === 'out') && !z.act && !z.dead;
  // its legs: a scuttle, three down and three up at a time; rattling in place as it rears; a blur down the lane
  const rate = run ? 26 : wind ? 16 : reel ? 12 : walking ? z.sp * 3.2 : 0;
  z.ph += dt * rate;
  const ph = z.ph, A = run ? 0.45 : wind ? 0.25 : reel ? 0.7 : walking ? 0.38 : 0.03;
  if ((walking || run) && Math.sign(Math.sin(ph)) !== z.stepS && z.stepS) zbkSound('step', Math.hypot(z.x - m.x, z.y - m.y) * (run ? 0.6 : 1));
  z.stepS = Math.sign(Math.sin(ph)) || 1;
  for (const L of M.legs) {
    const q = ph + L.par * Math.PI, sw = Math.sin(q) * A, lift = Math.max(0, Math.cos(q)) * A * 0.9;
    L.hip.rotation.set(0, sw * L.s * 0.9 + (L.i - 1) * 0.45 * L.s, 0);
    L.up.rotation.set(0, 0, -L.s * (1.0 - lift * 0.6));
    L.kn.rotation.set(0, 0, L.s * (2.05 - lift * 0.5));
  }
  // its body: low and bobbing; reared up to charge; nose-down in it; upturned, reeling
  let pitch = Math.sin(ph * 2) * 0.02 * (walking ? 1 : 0), roll = Math.sin(ph) * 0.03 * (walking ? 1 : 0), y = 0.95 + Math.abs(Math.sin(ph)) * 0.04 * (walking ? 1 : 0);
  if (wind) { const k = zbE(at / 0.4); pitch = 0.32 * k + Math.sin(t * 40) * 0.02; y = 0.95 + 0.25 * k; }
  if (run) { pitch = -0.12; y = 0.9; }
  if (reel) { const k = zbE(at / 0.25) * (1 - zbE((at - 1.4) / 0.5)); roll = 0.75 * k + Math.sin(t * 18) * 0.06 * k; pitch = 0.25 * k; y = 0.95 + 0.2 * k; }
  if (z.scaling || z.st === 'climb') { pitch = 0.35; y = 0.95; }
  M.body.position.y = y; M.body.rotation.set(pitch, 0, roll);
  // the claws: carried before it; spread wide and up as it rears; together ahead of it in the charge; one snapping
  for (const [i, C] of M.claws.entries()) {
    const s = i ? 1 : -1;
    let yaw = s * 0.25, lift = -0.1, open = 0.25 + Math.sin(t * 2 + i) * 0.08;
    if (wind) { const k = zbE(at / 0.5); yaw = s * zbL(0.25, 0.75, k); lift = zbL(-0.1, 0.75, k); open = 0.6 + Math.sin(t * 25 + i) * 0.15; }
    if (run) { yaw = s * 0.08; lift = 0.05; open = 0.15; }
    if (reel) { yaw = s * 0.9; lift = 0.4 + Math.sin(t * 14 + i * 2) * 0.3; open = 0.5; }
    if (z.act === 'pinch' && !z.dead && i === 1) { const T = ZBK_T.pinch; if (at < T.hit) { const k = zbE(at / T.hit); lift = zbL(-0.1, 0.35, k); open = zbL(0.25, 0.8, k); yaw = zbL(0.25, -0.05, k); } else { const k = zbE((at - T.hit) / 0.12); open = zbL(0.8, 0.0, k); lift = zbL(0.35, 0, k); yaw = -0.05; } }
    if (z.act === 'smash' && !z.dead) { const k = Math.sin(Math.min(1, at / ZBK_T.smash.hit) * Math.PI * 2); lift = 0.3 + 0.3 * k; yaw = s * 0.1; open = 0.4; }
    C.sh.rotation.set(lift, yaw, 0);
    C.dac.rotation.set(-open, 0, 0);
  }
  for (const [i, E] of M.eyes.entries()) E.rotation.set(Math.sin(t * 1.3 + i * 2 + z.seed) * 0.15 - (wind ? 0.25 : 0), 0, (i ? 1 : -1) * (0.12 + Math.sin(t * 0.9 + i) * 0.08));
  // the lane on the floor, from where it set off to where it'll stop: brighter and quicker as it comes; then fading behind it
  if (charge) {
    const ch = Math.cos(z.h), sh = Math.sin(z.h);
    const loc = (wx, wy) => { const fx = wx - z.x, fy = wy - z.y; return [fx * ch - fy * sh, -(fx * sh + fy * ch)]; };
    const [ax, az] = loc(z.ax, z.ay), [ix, iz] = loc(z.ix, z.iy), L = Math.hypot(ix - ax, iz - az), rot = Math.atan2(-(ix - ax), -(iz - az));
    const k = clamp(at / ZBK2.WIND, 0, 1), pulse = 0.5 + 0.5 * Math.sin(t * (8 + k * 20)), op = wind ? (0.12 + 0.3 * k) * (0.65 + 0.35 * pulse) : 0.3 * Math.max(0, 1 - (at - ZBK2.WIND) * 2);
    const W = ZBK2.HIT * 2, mx = (ax + ix) / 2, mz = (az + iz) / 2, ex = Math.cos(rot), ez = -Math.sin(rot);
    M.lane.visible = op > 0.01; M.lane.position.set(mx, 0.05, mz); M.lane.rotation.set(0, rot, 0); M.lane.scale.set(W, 1, Math.max(0.1, L)); M.lane.material.opacity = op * 0.55;
    for (const [j, E] of M.edges.entries()) { const sg = j ? 1 : -1; E.visible = M.lane.visible; E.position.set(mx + ex * sg * W / 2, 0.06, mz + ez * sg * W / 2); E.rotation.set(0, rot, 0); E.scale.set(1, 1, Math.max(0.1, L)); }
    M.cap.visible = M.lane.visible; M.cap.position.set(ix, 0.06, iz); M.cap.rotation.set(0, rot + Math.PI / 2, 0); M.cap.scale.set(1, 1, W);
    M.edges[0].material.opacity = Math.min(1, op * 1.6);
    if (run && Math.random() < dt * 20) fpsPuff(z.x + (Math.random() - 0.5) * 1.6, z.y + (Math.random() - 0.5) * 1.6, G0 + (z.jz || 0) + 0.15, '140,120,100', 2);
  } else { M.lane.visible = M.cap.visible = false; for (const E of M.edges) E.visible = false; }
  // hit: a pale flash on the planks; reeling: its belly glows (hit it there); burning: the wood smoulders
  const flash = z.hitT > 0 ? z.hitT / 0.15 : 0, hot = (z.scorch || 0) * 0.7, soft = reel ? 0.25 + 0.15 * Math.sin(t * 10) : 0;
  M.wood.emissive.setRGB(0.18 * flash + hot * 0.5, 0.16 * flash + hot * 0.2, 0.14 * flash + hot * 0.04);
  M.iron.emissive.setRGB(0.15 * flash + hot * 0.3, 0.12 * flash, 0.1 * flash);
  M.belly.emissive.setRGB(soft + 0.3 * flash, soft * 0.55 + 0.25 * flash, soft * 0.4 + 0.2 * flash);
  if (z.scorch > 0) z.scorch = Math.max(0, z.scorch - dt * 0.8);
  // dead: its legs fold under it, and it settles, and sinks
  if (z.dead) {
    const k = zbE((z.deadT || 0) / 1.0);
    for (const L of M.legs) { L.up.rotation.z = -L.s * zbL(1.0, 0.3, k); L.kn.rotation.z = L.s * zbL(2.05, 2.6, k); }
    M.body.position.y = zbL(0.95, 0.45, k); M.body.rotation.set(0.1 * k, 0, 0.3 * k);
    M.root.position.y -= Math.max(0, (z.deadT || 0) - 1.2) * 0.9;
  }
}
