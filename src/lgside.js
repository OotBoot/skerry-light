'use strict';
// Skerry League: Spindrift. The League's second way to play, picked on its card (Game: The Harbour Pool or Spindrift),
// seen side-on: the Sluice, the old tide-lock under the Light, a vaulted stone chamber half full of sea, with a lock
// gate for a goal in each end wall. One or two a side, Blue on the left (attacking the right-hand gate) and Orange on
// the right. The ships ride the water, leap out of it, turn over in the air and fly on the Gale; the ball (the same
// great striped buoy) floats, bounces off the walls and the vault and drops back into the water.
//
// It shares everything else with the Harbour Pool (src/league.js): LG's state, the phases (count, play, goal, end),
// the clock, overtime, the score and the goals, the end card, the record (kept apart: srec and sonl), the bots' names
// and skills, and the online lobby and its seats (src/lgnet.js, with md 'sd' on the host's lob and st). This file is
// its rules: the ships, the ball, the buoys, the bots, and the net hooks lgnet.js calls when LG.side is set
// (sdPose, sdHeard, sdPlace, sdBallFly, sdTakeClamp). src/lgside2d.js draws it on a canvas of its own (#sdCv).
//
// The frame: x across (Blue's gate at x = -W, Orange's at +W), y up, the still water's surface at y = 0, the vault at
// y = H, the floor at y = -D. Each gate is a box W..W+GD deep, set into the end wall above the water: open from its
// sill at GL up to its lintel at GH, so the ball has to be lifted in. A goal is the whole ball past the line, between
// sill and lintel.
// A ship (fields shared with the Harbour Pool's where they fit, so the net code carries them): x, y her waist; h the
// way her bow points (0 along +x, anticlockwise); v, bv her speed along x and y; w how fast she's turning in the air;
// face (+1 or -1) which way she sails on the water; up (+1 or -1) which side of her is her deck in the air (h turned a
// quarter towards up); air; jumps (0 on the water, 1 after the leap, 2 after the second); jt time since the leap;
// flipT the flip's time left; gale and galeOn as in the Pool.
// The controls: A and D (or the arrows) sail left and right on the water and turn her over in the air; W, Up or Space
// leaps out of the water, and again in the air within SDC.DJ seconds flips her the way you're holding (A or D, S to
// dive), or with nothing held jumps again; Shift (or K) the Gale, which drives her the way her bow points, in the air
// too. Every ship goes as fast as the others on the water (accel sets how soon she gets there); the Gale and a flip
// take her faster. Never slowed: there's no speed in this mode that's less than she had.
// Bots (sdBot): the nearer of a side goes for the ball from behind it, leaps at a high one and flips into it; the
// other keeps the gate. Skill sets their pace, how far ahead they see the ball and whether they use the Gale.

var SDC = { W: 118, H: 74, D: 24, GL: 10, GH: 42, GD: 18, R: 7, BG: 30, G: 50, VMAX: 46, ACC: 44, BRAKE: 130, JUMP: 33, JUMP2: 25, FLIP: 36, FLIPT: 0.5, DJ: 1.6, SPIN: 4.4, GALE: 82, GALE_USE: 34, VCAP: 96, HIT: 0.5, BFLOAT: 2.2 };

// the solid stone round the chamber, as boxes (x0, y0, x1, y1): the vault, the floor, each end wall above its gate's
// lintel, and the back of each gate. A circle against them is pushed out of the nearest.
function sdSolids() {
  if (LG.sdSol) return LG.sdSol;
  const { W, H, D, GL, GH, GD } = SDC, F = 999;
  return (LG.sdSol = [[-F, H, F, F], [-F, -F, F, -D], [W, GH, F, F], [-F, GH, -W, F], [W, -F, F, GL], [-F, -F, -W, GL], [W + GD, -F, F, F], [-F, -F, -W - GD, F]]);
}
function sdPush(x, y, r) {
  let best = null;
  for (const b of sdSolids()) {
    const cx = lgClamp(x, b[0], b[2]), cy = lgClamp(y, b[1], b[3]), dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d >= r) continue;
    let nx, ny, pen;
    if (d > 1e-4) { nx = dx / d; ny = dy / d; pen = r - d; }
    else { // (the centre inside the stone: out by the nearest face)
      const o = [[x - b[0], -1, 0], [b[2] - x, 1, 0], [y - b[1], 0, -1], [b[3] - y, 0, 1]].sort((p, q) => p[0] - q[0])[0]; nx = o[1]; ny = o[2]; pen = o[0] + r;
    }
    if (!best || pen > best.pen) best = { nx, ny, pen };
  }
  return best;
}

// the gale buoys, on the water: small ones in the middle of each half, big ones by the walls
function sdPadsNew() {
  const P = [];
  for (const x of [-78, -36, 36, 78]) P.push({ x, y: 0, big: false, amt: 34, back: 4, t: 0 });
  for (const x of [-104, 104]) P.push({ x, y: 0, big: true, amt: 100, back: 10, t: 0 });
  P.push({ x: 0, y: 0, big: false, amt: 34, back: 4, t: 0 });
  return P;
}
function sdHalf(s) { return lgClamp(3.5 + s.boat.len * 0.27, 7, 14.5); }   // half her length, stem to stern, in this view
function sdRad(s) { return 3 + Math.min(2, s.boat.beam * 0.3); }
function sdNew(s) { Object.assign(s, { face: s.team === 0 ? 1 : -1, up: s.team === 0 ? 1 : -1, air: false, jumps: 0, jt: 9, flipT: 0, jHeld: false, roll: 1, turnP: s.team === 0 ? 1 : -1, pitch: 0 }); }

function sdKickoff() {
  const marks = { 1: [-62], 2: [-56, -96] }[Math.min(2, LGC_size())] || [-62];
  for (const s of LG.ships) {
    if (s.face == null) sdNew(s);
    const sg = s.team === 0 ? 1 : -1;
    s.x = (marks[s.slot] || -62) * sg; s.y = 0; s.v = 0; s.bv = 0; s.w = 0; s.h = sg > 0 ? 0 : Math.PI;
    Object.assign(s, { face: sg, up: sg, air: false, jumps: 0, jt: 9, flipT: 0, jHeld: false, roll: 1, turnP: sg, pitch: 0 });
    s.gale = Math.max(s.gale, 33); s.galeOn = false; s.ai.back = 0; s.ai.stuck = 0;
  }
  Object.assign(LG.ball, { x: 0, y: 26, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, gone: false });
  for (const p of LG.pads) p.t = 0;
  LG.ph = 'count'; LG.phT = LGC.KICK; LG.last = null; LG.ko++;
  lgSnd('tick');
}

// ---------- each step ----------
function sdStep(dt) {
  const frozen = LG.ph === 'count' || LG.ph === 'end';
  for (const s of LG.ships) {
    if (s.face == null) sdNew(s);
    if (!lgOwn(s)) { s.bob += dt; sdLook(s, dt); continue; }
    let mv = 0, jump = false, dive = false, gale = false;
    if (s.bot) { sdBot(s, dt); mv = s.ai.steer; jump = s.ai.jump; dive = s.ai.dive; gale = s.ai.gale; }
    else { const K = LG.keys, T = LG.touch; mv = (K.r || T.r ? 1 : 0) - (K.l || T.l ? 1 : 0) + (LG.padSteer || 0) + (LG.stickX || 0); jump = !!(K.u || T.u || LG.padJump); dive = !!(K.d || T.d || (LG.padSail || 0) < -0.5 || (LG.stickY || 0) < -0.55); gale = !!(K.g || T.g || LG.padGale); }
    mv = lgClamp(mv, -1, 1);
    if (frozen) { s.bob += dt; s.jHeld = jump; sdLook(s, dt); continue; }
    sdShip(s, dt, mv, jump, dive, gale);
    sdLook(s, dt);
  }
  if (frozen) return;
  sdBump();
  sdBall(dt);
  for (const p of LG.pads) if (p.t > 0) p.t -= dt;
}
// one ship: on the water she sails, in the air she turns over; the leap, the flip and the Gale; then the stone
function sdShip(s, dt, mv, jump, dive, gale) {
  const b = s.boat, acc = b.accel || 1, spin = SDC.SPIN * (0.75 + 0.25 * (b.turn || 1));
  const press = jump && !s.jHeld; s.jHeld = jump;
  s.jt += dt; if (s.flipT > 0) s.flipT = Math.max(0, s.flipT - dt);
  if (!s.air) {
    // on the water: she turns about at once and gathers way (harder when she's going the wrong way)
    if (mv) {
      const want = Math.sign(mv); s.face = want;
      const vt = mv * SDC.VMAX;
      if (s.v * want < 0) s.v += want * SDC.BRAKE * dt;
      else if (Math.abs(s.v) < Math.abs(vt)) s.v = want > 0 ? Math.min(vt, s.v + SDC.ACC * acc * Math.abs(mv) * dt * (1.4 - Math.min(0.9, Math.abs(s.v) / SDC.VMAX))) : Math.max(vt, s.v - SDC.ACC * acc * Math.abs(mv) * dt * (1.4 - Math.min(0.9, Math.abs(s.v) / SDC.VMAX)));
    } else s.v *= Math.exp(-dt * 0.9);
    s.h = s.face > 0 ? 0 : Math.PI; s.up = s.face; s.w = 0;
    // she floats: the water holds her up at the surface, and a hard landing ducks her under for a moment
    s.bv += (-s.y * 70 - s.bv * 11) * dt;
    if (press) { s.air = true; s.jumps = 1; s.jt = 0; s.bv = Math.max(s.bv, 0) + SDC.JUMP; s.h = s.face > 0 ? 0.22 : Math.PI - 0.22; s.y = Math.max(s.y, 0.5); lgSnd('jump'); }
  } else {
    // in the air: she falls, and A and D turn her over
    s.bv -= SDC.G * dt;
    if (s.flipT <= 0) { const wt = -mv * spin; s.w += (wt - s.w) * Math.min(1, dt * (mv ? 9 : 3)); }
    s.h = lgAng(s.h + s.w * dt);
    if (press && s.jumps === 1 && s.jt < SDC.DJ) {
      s.jumps = 2;
      const dx = mv, dy = dive ? -1 : 0;
      if (dx || dy) { // a flip: a shove the way you're holding, and over she goes
        const L = Math.hypot(dx, dy), nx = dx / L, ny = dy / L;
        s.bv = Math.max(s.bv, 0) * 0.3; s.v += nx * SDC.FLIP; s.bv += ny * SDC.FLIP * 0.9 + (dy ? 0 : 6);
        s.flipT = SDC.FLIPT; s.w = (dx ? -Math.sign(dx) : -(Math.sign(Math.cos(s.h)) || 1)) * Math.PI * 2 / SDC.FLIPT;
        lgSnd('flip');
      } else { s.bv = Math.max(s.bv, 0) + SDC.JUMP2; lgSnd('jump'); }
    }
  }
  // the Gale: the way her bow points
  s.galeOn = gale && s.gale > 0;
  if (s.galeOn) {
    s.gale = Math.max(0, s.gale - SDC.GALE_USE * dt);
    const k = SDC.GALE * Math.min(1, acc * 0.6 + 0.55) * dt; s.v += Math.cos(s.h) * k; s.bv += Math.sin(s.h) * k;
    if (!s.air && Math.abs(s.v) > SDC.VMAX * 0.6 && s.v * s.face > 0) { /* skimming */ }
  }
  { const sp = Math.hypot(s.v, s.bv); if (sp > SDC.VCAP) { s.v *= SDC.VCAP / sp; s.bv *= SDC.VCAP / sp; } }
  s.x += s.v * dt; s.y += s.bv * dt;
  // down on the water again: she lands the right way up (rolling over if she came down on her deck)
  if (s.air && s.y <= 0 && s.bv <= 0 && s.jt > 0.12) {
    s.air = false; s.jumps = 0;
    const c = Math.cos(s.h), upY = Math.cos(s.h) * s.up;   // (her deck's way up: the bow turned a quarter towards up)
    s.face = Math.abs(c) > 0.25 ? Math.sign(c) : (s.v ? Math.sign(s.v) : s.face);
    if (upY * s.face < 0 && Math.abs(c) > 0.25) s.roll = -1;
    s.pitch = lgAng(s.h - (s.face > 0 ? 0 : Math.PI)) * s.face; s.turnP = s.face;
    s.bv *= 0.35; if (s.bv < -10) lgSnd('splash', Math.min(1, -s.bv / 40));
  }
  // the stone: bow, waist and stern
  const L = sdHalf(s), r = sdRad(s), c = Math.cos(s.h), sn = Math.sin(s.h);
  for (const t of [L * 0.85, 0, -L * 0.85]) {
    const d = sdPush(s.x + c * t, s.y + sn * t, r); if (!d) continue;
    s.x += d.nx * d.pen; s.y += d.ny * d.pen;
    const vn = s.v * d.nx + s.bv * d.ny; if (vn < 0) { s.v -= 1.25 * vn * d.nx; s.bv -= 1.25 * vn * d.ny; if (-vn > 12) lgSnd('wall', Math.min(1, -vn / 50)); }
  }
  s.bob += dt;
  // the gale buoys
  for (const p of LG.pads) if (p.t <= 0 && s.gale < 100 && Math.abs(p.x - s.x) < (p.big ? 7 : 5) + L * 0.6 && Math.abs(s.y - p.y) < 8) { s.gale = Math.min(100, s.gale + p.amt); p.t = p.back; if (s.me) lgSnd('pad', p.big ? 1 : 0.6); if (LG.net && !lgHost() && s.me && typeof lgnPad === 'function') lgnPad(LG.pads.indexOf(p)); }
}
// what's only for the eye: her turn about on the water, her roll upright, her pitch settling
function sdLook(s, dt) {
  if (s.turnP == null) { s.turnP = s.face || 1; s.roll = 1; s.pitch = 0; }
  s.turnP += ((s.face || 1) - s.turnP) * Math.min(1, dt * 12);
  s.roll += (1 - s.roll) * Math.min(1, dt * 7);
  s.pitch *= Math.exp(-dt * 7);
}
// ships knock each other aside by their weight
function sdBump() {
  const S = LG.ships;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], b = S[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr = (sdHalf(a) + sdHalf(b)) * 0.62;
    if (d >= rr || d < 1e-3) continue;
    const nx = dx / d, ny = dy / d, pen = rr - d, ia = 1 / a.m, ib = 1 / b.m, sum = ia + ib;
    const oa = lgOwn(a), ob = lgOwn(b);
    if (oa) { a.x -= nx * pen * ia / sum; a.y -= ny * pen * ia / sum; }
    if (ob) { b.x += nx * pen * ib / sum; b.y += ny * pen * ib / sum; }
    const vn = (b.v - a.v) * nx + (b.bv - a.bv) * ny; if (vn >= 0) continue;
    const J = -(1 + 0.4) * vn / sum;
    if (oa) { a.v -= nx * J * ia; a.bv -= ny * J * ia; } if (ob) { b.v += nx * J * ib; b.bv += ny * J * ib; }
    if (-vn > 10 && (a.me || b.me)) lgSnd('bump', Math.min(1, -vn / 50));
  }
}

// ---------- the ball ----------
// its flight: gravity in the air, the water holding it up at the surface and slowing it, the stone (no ships, no goals)
function sdBallPhys(B, dt, loud) {
  const R = SDC.R, fl = SDC.BFLOAT;
  if (B.y < fl + 0.5) { // in the water
    B.vy += ((fl - B.y) * 34 - B.vy * 3.2) * dt - (B.y > fl ? SDC.BG * dt : 0);
    const k = Math.exp(-dt * 0.5); B.vx *= k;
    if (loud && B.vy < -14 && B.y > fl - 1) lgSnd('splash', Math.min(1, -B.vy / 40));
  } else { B.vy -= SDC.BG * dt; const k = Math.exp(-dt * 0.06); B.vx *= k; }
  B.x += B.vx * dt; B.y += B.vy * dt;
  const d = sdPush(B.x, B.y, R);
  if (d) {
    B.x += d.nx * d.pen; B.y += d.ny * d.pen;
    const vn = B.vx * d.nx + B.vy * d.ny; if (vn < 0) { B.vx -= 1.8 * vn * d.nx; B.vy -= 1.8 * vn * d.ny; if (loud && -vn > 7) lgSnd(Math.abs(Math.abs(B.x) - SDC.W) < R + 2 && Math.abs(B.y - SDC.GH) < R + 2 ? 'post' : 'wall', Math.min(1, -vn / 40)); }
  }
  B.rx = (B.rx || 0) - B.vx * dt / R;
}
function sdBall(dt) {
  const B = LG.ball; if (B.gone) return;
  sdBallPhys(B, dt, true);
  for (const s of LG.ships) if (!LG.net || lgOwn(s) || !lgHost()) sdBallShip(B, s);
  // a goal: the whole ball past the line, under the lintel (online, only the host's screen says so)
  if (lgHost() && LG.ph === 'play' && Math.abs(B.x) > SDC.W + SDC.R && B.y > SDC.GL && B.y < SDC.GH) lgGoal(B.x > 0 ? 0 : 1);
}
// a ship strikes the ball: her hull a line from stern to bow with her beam round it
function sdBallShip(B, s) {
  const R = SDC.R, L = sdHalf(s), r = sdRad(s), c = Math.cos(s.h), sn = Math.sin(s.h);
  const ox = B.x - s.x, oy = B.y - s.y, t = lgClamp(ox * c + oy * sn, -L, L);
  const cx = s.x + c * t, cy = s.y + sn * t, dx = B.x - cx, dy = B.y - cy, d = Math.hypot(dx, dy), rr = R + r;
  if (d >= rr || d < 1e-4) return;
  const nx = dx / d, ny = dy / d;
  B.x = cx + nx * rr; B.y = cy + ny * rr;
  // her speed at that point, with her turning (the ends swing)
  const svx = s.v - s.w * t * sn, svy = s.bv + s.w * t * c;
  const rvx = B.vx - svx, rvy = B.vy - svy, vn = rvx * nx + rvy * ny;
  if (vn >= 0) return;
  const mb = 0.35, J = -(1 + 0.5) * vn / (1 / mb + 1 / s.m);
  const push = Math.max(0, svx * nx + svy * ny) * SDC.HIT + (s.flipT > 0 ? 16 : 0) + (s.galeOn ? 4 : 0);
  B.vx += nx * (J / mb + push); B.vy += ny * (J / mb + push);
  if (lgOwn(s)) { s.v -= nx * J / s.m * 0.4; s.bv -= ny * J / s.m * 0.4; }
  const sp = Math.hypot(B.vx, B.vy); if (sp > 115) { B.vx *= 115 / sp; B.vy *= 115 / sp; }
  const hard = -vn;
  if (LG.net && !lgHost()) { if (s.me && typeof lgnHit === 'function') lgnHit(B); if (hard > 3 && s.me) lgSnd('hit', Math.min(1, hard / 45)); return; }
  if (LG.last !== s || hard > 4) { s.touches++; LG.hits++; }
  LG.prev = LG.last && LG.last !== s ? LG.last : LG.prev; LG.last = s; LG.lastHitT = LG.t; LG.lastHitBy = s;
  if (hard > 3) lgSnd('hit', Math.min(1, hard / 45));
}

// ---------- the bots ----------
// where the ball will be in t seconds (roughly: its arc, the water and the end walls)
function sdBallAt(t) {
  const B = LG.ball, T = { x: B.x, y: B.y, vx: B.vx, vy: B.vy, rx: 0 };
  for (let k = 0; k < t; k += 1 / 30) sdBallPhys(T, 1 / 30, false);
  return T;
}
function sdBot(s, dt) {
  const A = s.ai, K = LG_SKILL[LG.set.skill] || LG_SKILL.fair;
  A.t -= dt; A.jump = false; A.dive = false;
  const dir = s.team === 0 ? 1 : -1, B = LG.ball, own = -dir * SDC.W;
  // the roles: the nearer of a side (to where it's going) goes for it, the other keeps the gate
  if (A.t <= 0) {
    A.t = K.react;
    const mates = LG.ships.filter(o => o.team === s.team);
    const far = o => Math.abs(o.x - B.x) + Math.abs(o.y - B.y) * 0.5 + ((o.x - B.x) * dir > 0 ? 30 : 0);
    A.role = mates.length < 2 || mates.slice().sort((a, b) => far(a) - far(b))[0] === s ? 'go' : 'keep';
    const P = sdBallAt(0.15 + K.see * 0.55);
    A.tx = P.x + (Math.random() - 0.5) * K.err * 20; A.ty = P.y;
  }
  const pace = lgClamp(K.v / 70, 0.5, 1);
  let tx = A.tx, mv = 0;
  // the ball coming at our gate fast, near it: everyone goes
  const danger = (B.x - own) * dir < 55 && B.vx * dir < -8;
  if (A.role === 'keep' && !danger) {
    tx = own + dir * 22; mv = Math.abs(tx - s.x) > 6 ? Math.sign(tx - s.x) * pace : 0;
    if (!mv && !s.air) s.face = dir;
    if (Math.abs(B.x - s.x) < 22 && B.y < 26 && B.y > 9 && !s.air) A.jump = true;
  } else {
    // from behind it: the right side of the ball is the side away from their gate
    const wrong = (s.x - tx) * dir > -4;
    if (wrong && !s.air) {
      const back = tx - dir * 22; mv = Math.sign(back - s.x) * pace;
      if (Math.abs(tx - s.x) < 16 && A.tx !== undefined && B.y < 14) A.jump = true;   // (over it, if it's in the way)
    } else mv = Math.sign(tx - s.x) * pace;
    const dx = B.x - s.x, dy = B.y - s.y;
    if (!s.air && Math.abs(dx) < 18 + Math.abs(s.v) * 0.25 && dy > 9 && dy < 40) A.jump = true;
    // near their gate the ball has to go up to the sill: leap under it and flip into it
    if (!s.air && (dir * SDC.W - B.x) * dir < 60 && Math.abs(dx) < 15 + Math.abs(s.v) * 0.15 && dx * dir > 0 && !wrong) A.jump = true;
    if (s.air) {
      // in the air: turn the bow at the ball, flip into it when it's close, and fly at it on the Gale if she can
      const want = Math.atan2(dy, dx), err = lgAng(want - s.h);
      mv = lgClamp(-err * 1.6, -1, 1);
      if (s.jumps === 1 && Math.hypot(dx, dy) < 18 && s.jt > 0.15) { A.jump = true; mv = Math.sign(dx) || dir; A.dive = dy < -4; }
    }
    A.gale = K.gale > 0 && s.gale > 5 && ((!s.air && Math.abs(dx) > 40 && Math.sign(dx) === s.face && (wrong ? false : true)) || (s.air && K.gale >= 1 && Math.abs(lgAng(Math.atan2(dy, dx) - s.h)) < 0.5 && Math.hypot(dx, dy) < 60));
    if (!s.air && Math.abs(dx) < 30 && (B.x - s.x) * dir > 0 && Math.abs(dy) < 10 && K.gale >= 0.5 && s.gale > 20 && Math.sign(dx) === s.face) A.gale = true;
  }
  if (A.role === 'keep' && !danger) A.gale = false;
  // stuck in a gate, or against a wall: out of it
  if (Math.abs(s.x) > SDC.W - 2 && !s.air) mv = -Math.sign(s.x) * pace;
  // (a held key: the leap is a press, so let go between them)
  if (A.jump && s.jHeld) A.jump = false;
  A.steer = mv;
}

// ---------- online (src/lgnet.js calls these when LG.side) ----------
// a ship as heard: [x, y, h, v, bv, up/face, w, gale, galeOn, air, flipT]
function sdPose(s) { return [lgnR(s.x, 100), lgnR(s.y, 100), lgnR(s.h, 1000), lgnR(s.v, 100), lgnR(s.bv, 100), (s.air ? s.up : s.face) || 1, lgnR(s.w, 1000), Math.round(s.gale), s.galeOn ? 1 : 0, s.air ? 1 : 0, lgnR(s.flipT, 100)]; }
function sdHeard(s, a, now) {
  if (!Array.isArray(a) || a.length < 11 || !a.slice(0, 7).every(Number.isFinite)) return;
  const x = lgClamp(a[0], -SDC.W - SDC.GD, SDC.W + SDC.GD), y = lgClamp(a[1], -SDC.D, SDC.H);
  const first = !LGN.samp[s.i], fu = a[5] < 0 ? -1 : 1, air = !!a[9];
  LGN.samp[s.i] = { t: now, x, y, h: lgAng(a[2]), v: lgClamp(a[3], -120, 120), bv: lgClamp(a[4], -120, 120), w: lgClamp(a[6], -20, 20), gale: lgClamp(+a[7] || 0, 0, 100), galeOn: !!a[8], air, fu, flipT: lgClamp(+a[10] || 0, 0, 1) };
  if (first) { s.x = x; s.y = y; s.h = lgAng(a[2]); }
}
function sdPlace(dt, now) {
  const lead = lgClamp(LGN.rtt / 2000, 0, 0.15);
  for (const s of LG.ships) {
    if (lgOwn(s)) continue;
    const S = LGN.samp[s.i]; if (!S) continue;
    if (s.face == null) sdNew(s);
    const age = lgClamp((now - S.t) / 1000 + lead, 0, 0.3), frozen = LG.ph === 'count' || LG.ph === 'end';
    const tx = frozen ? S.x : S.x + S.v * age, ty = frozen ? S.y : Math.max(S.air ? -2 : -SDC.D, S.y + S.bv * age - (S.air ? SDC.G * age * age / 2 : 0)), th = frozen ? S.h : lgAng(S.h + S.w * age);
    if (Math.hypot(tx - s.x, ty - s.y) > 30) { s.x = tx; s.y = ty; s.h = th; }
    else { const k = Math.min(1, dt * 14); s.x += (tx - s.x) * k; s.y += (ty - s.y) * k; s.h = lgAng(s.h + lgAng(th - s.h) * k); }
    if (s.air && !S.air) { s.pitch = 0; s.turnP = S.fu; }
    s.air = S.air; if (S.air) s.up = S.fu; else s.face = S.fu;
    s.v = S.v; s.bv = S.bv; s.w = S.w; s.gale = S.gale; s.galeOn = S.galeOn; s.flipT = S.flipT;
  }
}
function sdBallFly(B, dt) { sdBallPhys(B, dt, false); }
// the host: a player's hit, put where they saw it
function sdTakeClamp(B, h) {
  B.x = lgClamp(h[1], -SDC.W - SDC.GD + SDC.R, SDC.W + SDC.GD - SDC.R); B.y = lgClamp(h[2], -SDC.D + SDC.R, SDC.H - SDC.R); B.z = 0;
  B.vx = lgClamp(h[4], -115, 115); B.vy = lgClamp(h[5], -115, 115); B.vz = 0;
}
function sdDebugGoal(team) { if (LG.ph !== 'play') LG.ph = 'play'; const B = LG.ball; B.x = (SDC.W + SDC.R + 2) * (team === 0 ? 1 : -1); B.y = SDC.GL + SDC.R + 2; B.vx = 0; B.vy = 0; sdBall(0.001); }
