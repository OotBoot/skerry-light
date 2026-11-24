'use strict';
// The Lamp Road: Dirk, the boarder. His kit (the play, on the host unless said), his bot, his crosshair, the powder
// smoke (a zone that blinds: src/lr.js lrSightCut, so lrSees, the bots and the HUD's names can't see through it), the
// boarding hook and the dashes of Boarders Away, their sounds and events, and (below) his art: the figure, the brace of
// pistols in first person, the rope, the smoke and the strikes. A hero file as the guide at the top of src/lr.js has it.

// ---------- the play ----------
lrDefHero({
  id: 'dirk', n: 'Dirk', title: 'The Boarder', role: 'damage', hp: 225, spd: 6.4, r: 0.4, h: 1.8, mag: 12, reloadT: 1.3, ultCost: 1700,
  cd: { a1: 8, a2: 12, alt: 0.8 }, range: 32, botClose: 11, actT: { a1: 1.1, a2: 0.6, alt: 0.45, ult: 0.4 }, own: ['a1'],
  blurb: 'A swaggering boarder with a brace of pistols in his sash and a long dirk at his hip. First over the rail.',
  kit: {
    pri: ['Brace of Pistols', 'Quick shots, a pistol in each hand in turn. Weaker past 25 m.'],
    alt: ['Dirk', 'A quick slash close in; harder from behind.'],
    a1: ['Boarding Hook', 'Grapple a wall, a roof edge or a body within 22 m and haul yourself there.', 'Hook'],
    a2: ['Powder Smoke', 'A thick cloud where you stand: nobody in it can be seen from outside.', 'Smoke'],
    ult: ['Boarders Away', 'For six seconds, each shot dashes you blade first at the nearest enemy in sight.', 'Boarders'],
  },
  how: { dirkgun: 'Brace of Pistols', dirkblade: 'Dirk', dirkult: 'Boarders Away' },
  // the Brace of Pistols: one hand then the other, a little spread, half again to the head, weaker past 25 m (half by
  // 45); while Boarders Away lasts, each pull of the trigger is a dash and a strike instead (lrhDirkStrike)
  fire(p, dt, I, H) {
    if (lrhDirkStrike(p, I)) return;
    if (!(I.fire && p.fireT >= 0.2 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--; p.dirkHand = (p.dirkHand || 0) ^ 1;
    const h = lrhDirkShot(p, p.y + lrEyeH(p));
    if (h.p) { const fall = h.t <= 25 ? 1 : h.t >= 45 ? 0.5 : 1 - 0.5 * (h.t - 25) / 20; lrHurt(h.p, 30 * fall * (h.head ? 1.5 : 1), p, 'dirkgun', h.head); }
    else if (h.wall) lrWallHurt(h.wall, 30, p);
    else if (h.t < 80) lrFxPush('spark', { x: h.x, y: h.y, z: h.z });
  },
  // the Dirk: a slash 3 m ahead in a wide wedge, 65 (90 from behind)
  alt(p, dt, I, H) {
    if (!(I.alt && p.cd.alt <= 0)) return;
    p.cd.alt = H.cd.alt; p.act = { k: 'alt', t: 0 }; p.fireT = Math.min(p.fireT, 0.1);
    lrFxPush('dirkslash', { v: p.i, x: p.x, y: p.y + 1.25, z: p.z, yaw: p.yaw, team: p.team });
    const ey = p.y + lrEyeH(p);
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > 3 + q.r || Math.abs(q.y - p.y) > 2) continue;
      if (Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) > 0.75 && d > p.r + q.r + 0.3) continue;
      const cy = q.y + q.h * 0.6 - ey, l = Math.hypot(dx, cy, dz) || 1; if (lrBlockRay(p.x, ey, p.z, dx / l, cy / l, dz / l, l) < l - q.r - 0.2) continue;
      const behind = Math.abs(lrAng(Math.atan2(-(p.x - q.x), -(p.z - q.z)) - q.yaw)) > 1.9;
      lrHurt(q, behind ? 90 : 65, p, 'dirkblade');
    }
    for (const w of LRM.walls) { if (w.team === p.team) continue; const dx = w.x - p.x, dz = w.z - p.z; if (Math.hypot(dx, dz) < 3.6 && Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) < 0.9) lrWallHurt(w, 65, p); }
  },
  // Powder Smoke: a cloud 5 m round where he stands, for five seconds
  a2(p, dt, I, H) {
    if (!(I.a2 && p.cd.a2 <= 0)) return;
    p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    const y = lrGround(p.x, p.z, p.y + 0.3);
    lrAddZone({ k: 'dirksmoke', team: p.team, owner: p.i, x: p.x, y, z: p.z, r: 5, t: 5 });
    lrFxPush('dirksmoke', { v: p.i, x: p.x, y, z: p.z, team: p.team });
  },
  // Boarders Away: six seconds, five dashes
  ult(p) { p.dirkUltT = 6; p.dirkN = 5; p.dirkMoves = 0; p.dirkHostCd = 0; p.dirkPend = null; lrFxPush('dirkult', { v: p.i, x: p.x, y: p.y + 1, z: p.z, team: p.team }); },
  // (on whichever screen moves him) the hook: thrown along his look, caught on the first wall, roof or body within 22 m,
  // and a dash of Boarders Away (moved here, struck on the host)
  body(p, dt, I, H) {
    if (I.a1 && p.cd.a1 <= 0 && !p.dirkHook) {
      const ey = p.y + lrEyeH(p), d = lrDir(p.yaw, p.pitch), h = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, who: 'any', max: 22 });
      if (h.t < 22) {
        p.dirkHook = { x: h.x - d[0] * 0.3, y: h.y, z: h.z - d[2] * 0.3, q: h.p ? h.p.i : -1, t: 0, lx: p.x, ly: p.y, lz: p.z, still: 0 };
        p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 };
        lrFxPush('dirkhook', { v: p.i, x: p.x, y: ey - 0.3, z: p.z, x2: h.x, y2: h.y, z2: h.z, q: h.p ? h.p.i : -1 });
      }
    }
    if (p.dirkUltT > 0 && I.fire && !(p.dirkDashCd > 0) && (p.dirkMoves || 0) < 5 && !p.dirkDash) {
      const q = lrhDirkPick(p);
      if (q) {
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1, go = Math.max(0, d - q.r - p.r - 0.35), T = Math.max(0.06, go / 30);
        p.dirkDash = { ux: dx / d, uz: dz / d, t: T, vy: lrClamp((q.y - p.y) / T, -8, 10), q: q.i }; p.dirkHook = null;
        p.dirkDashCd = 0.45; p.dirkMoves = (p.dirkMoves || 0) + 1; p.act = { k: 'ult', t: 0 };
      }
    }
  },
  // the dash drives him straight at his mark; the hook hauls him to its anchor (following a body it caught), and lets go
  // there with a hop up (onto a roof's edge), or when he stops making way, or after a second and a half
  move(p, dt) {
    const D = p.dirkDash;
    if (D) { D.t -= dt; if (D.t <= 0 || p.knockT > 0) { p.dirkDash = null; p.vx *= 0.25; p.vz *= 0.25; p.vy = Math.min(p.vy, 2); return false; } p.vx = D.ux * 30; p.vz = D.uz * 30; p.vy = D.vy + LR_G * dt; p.gnd = false; return true; }
    const k = p.dirkHook; if (!k) return false;
    k.t += dt;
    if (k.q >= 0) { const q = LRM.P[k.q]; if (q && q.alive) { k.x = q.x; k.y = q.y + q.h * 0.55; k.z = q.z; } else k.q = -1; }
    const dx = k.x - p.x, dy = k.y - (p.y + 0.9), dz = k.z - p.z, L = Math.hypot(dx, dy, dz);
    k.still = Math.hypot(p.x - k.lx, p.y - k.ly, p.z - k.lz) < 0.03 ? k.still + dt : 0; k.lx = p.x; k.ly = p.y; k.lz = p.z;
    if (L < (k.q >= 0 ? p.r + 1.1 : 1.0) || k.t > 1.5 || k.still > 0.12 || p.knockT > 0 || p.root > 0) {
      p.dirkHook = null; p.vx *= 0.45; p.vz *= 0.45; if (k.q < 0 && dy > -0.5) p.vy = Math.max(p.vy, 6); else p.vy = Math.min(p.vy, 3);
      return false;
    }
    const sp = Math.min(25, 9 + k.t * 45); p.vx = dx / L * sp; p.vy = dy / L * sp + 2; p.vz = dz / L * sp; p.gnd = false;
    return true;
  },
  tick(p, dt) {
    if (p.dirkUltT > 0) p.dirkUltT = Math.max(0, p.dirkUltT - dt);
    if (p.dirkDashCd > 0) p.dirkDashCd -= dt; if (p.dirkHostCd > 0) p.dirkHostCd -= dt;
    if (p.dirkPend) { p.dirkPend.t -= dt; if (p.stun > 0) p.dirkPend = null; }
  },
  reset(p) { p.dirkHook = null; p.dirkDash = null; p.dirkUltT = 0; p.dirkN = 0; p.dirkMoves = 0; p.dirkPend = null; p.dirkDashCd = 0; p.dirkHostCd = 0; },
  // online: the rope seen on the guest's own screen at once; the host, told of it, throws it (for everyone else's eyes)
  // from where he was along his look then; the ult's time and dashes left go with the snapshot
  ownUse(p, k) { const K = p.dirkHook; if (k === 'a1' && K) lrLocalFx({ k: 'dirkhook', v: p.i, x: p.px, y: p.py + lrEyeH(p) - 0.3, z: p.pz, x2: K.x, y2: K.y, z2: K.z, q: K.q }); },
  ownHost(p, k, u, S) {
    const ey = u[3] + lrEyeH(p), d = lrDir(u[5], S.pitch || 0), h = lrRayHit(u[2], ey, u[4], d[0], d[1], d[2], { team: p.team, skip: p.i, who: 'any', max: 22 });
    lrFxPush('dirkhook', { v: p.i, x: u[2], y: ey - 0.3, z: u[4], x2: h.x, y2: h.y, z2: h.z, q: h.p ? h.p.i : -1 });
  },
  snap: p => p.dirkUltT > 0 ? [lrR(p.dirkUltT, 10), p.dirkN | 0] : 0,
  unsnap(p, x) { const u = +x[0] || 0; if (u > (p.dirkUltT || 0) + 0.5) p.dirkMoves = 0; p.dirkUltT = u; p.dirkN = x[1] | 0; },
  // a guest's own shots and slashes, seen and heard at once (what they hit is the host's to say)
  guestFire(p, I, H, ey) {
    const now = performance.now();
    if (I.alt && p.cd.alt <= 0 && now - (p.dirkSlashAt || 0) > 780) { p.dirkSlashAt = now; p.act = { k: 'alt', t: 0 }; lrLocalFx({ k: 'dirkslash', v: p.i, x: p.x, y: p.y + 1.25, z: p.z, yaw: p.yaw, team: p.team }); }
    if (p.dirkUltT > 0 || !(I.fire && p.fireT >= 0.2 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--; LRM.shotAt = now; p.dirkHand = (p.dirkHand || 0) ^ 1;
    lrhDirkShot(p, ey, true);
  },
  // the HUD: the hook lit while it hauls, the smoke while his cloud stands, the blade while it swings
  abil(p, k) { return { on: k === 'a1' ? !!p.dirkHook : k === 'a2' ? LRM.zones.some(z => z.k === 'dirksmoke' && z.owner === p.i) : k === 'alt' && p.act.k === 'alt' }; },
  // the bot: closes in, slashes anyone within reach, hooks in at someone a way off (or away up onto something when he's in
  // trouble), smokes himself when he's hurt or the Wain when it's fought over in the open, and boards a clump
  botAlt: (p, ai, tg, d) => d < 2.7 + tg.r && !(p.dirkUltT > 0),
  bot(p, ai, B) {
    const { S, I, tg, hpF, hurt, foes, C, at, mode } = B;
    if (p.ult >= 1 && !(p.dirkUltT > 0)) {
      const near = foes.filter(f => f.q.alive && f.d < 12).length;
      if (near >= Math.max(2, S.clump) || (near >= 1 && hpF > 0.4 && tg && tg.hp < 240)) { I.ult = true; return; }
    }
    if (p.cd.a2 <= 0) {
      if (hurt && hpF < 0.5 && foes.some(f => f.d < 20)) { I.a2 = true; ai.retreat = true; return; }
      if (Math.hypot(C.x - p.x, C.z - p.z) < 4 && foes.filter(f => f.d > 7).length >= 2) { I.a2 = true; return; }
    }
    if (p.cd.a1 <= 0 && !p.dirkHook && !(p.dirkUltT > 0)) {
      if (hurt && hpF < 0.4) { const pt = lrhDirkEscape(p, tg); if (pt) { ai.retreat = true; mode({ at: pt, press: 'a1', pressAt: LRM.t + 0.25 }); return; } }
      if (tg && ai.tgtD > 8 && ai.tgtD < 21 && hpF > 0.5 && Math.random() < 0.4) { mode({ at: at(tg), press: 'a1', pressAt: LRM.t + 0.2 }); return; }
    }
  },
  // his crosshair: a bracket either side for the pistols; in Boarders Away, a ring with a pip for each dash left
  cross(c, cx, cy, me) {
    c.beginPath(); c.arc(cx, cy, 1.6, 0, 7); c.fill();
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 9, cy - 6); c.lineTo(cx + s * 13, cy); c.lineTo(cx + s * 9, cy + 6); c.stroke(); }
    if (me.dirkUltT > 0) {
      c.beginPath(); c.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * me.dirkUltT / 6); c.stroke();
      for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(cx + (k - 2) * 10, cy + 38, 3.2, 0, 7); if (k < (me.dirkN | 0)) c.fill(); else c.stroke(); }
    }
  },
});
// a pistol shot from one hand or the other (p.dirkHand): its line and its tracer (shown here only, for a guest's own)
function lrhDirkShot(p, ey, local) {
  const sp = 0.012, d = lrDir(p.yaw + (Math.random() - 0.5) * 2 * sp, p.pitch + (Math.random() - 0.5) * 2 * sp);
  const h = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 80 }), s = p.dirkHand ? -1 : 1, rx = Math.cos(p.yaw) * 0.28 * s, rz = -Math.sin(p.yaw) * 0.28 * s;
  const f = { k: 'dirkshot', x: p.x + rx, y: ey - 0.3, z: p.z + rz, x2: h.x, y2: h.y, z2: h.z, hd: p.dirkHand ? 1 : 0, team: p.team, v: p.i, a: p.i };
  if (local) lrLocalFx(f); else lrFxPush(f.k, f);
  return h;
}
// the nearest enemy he can see within 12 m, more or less ahead of him (for a dash of Boarders Away)
function lrhDirkPick(p) {
  const eye = { x: p.x, y: p.y + lrEyeH(p), z: p.z }; let best = null, bd = 12;
  for (const q of LRM.P) {
    if (!q.alive || q.team === p.team || q.spawnT > 0) continue;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) - q.r; if (d > bd || Math.abs(q.y - p.y) > 4) continue;
    if (d > 1.5 && Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) > 1.2) continue;
    const c = { x: q.x, y: q.y + q.h * 0.6, z: q.z }, l = Math.hypot(c.x - eye.x, c.y - eye.y, c.z - eye.z) || 1;
    if (!lrSees(eye, c) || lrBlockRay(eye.x, eye.y, eye.z, (c.x - eye.x) / l, (c.y - eye.y) / l, (c.z - eye.z) / l, l) < l - 0.3) continue;
    bd = d; best = q;
  }
  return best;
}
// on the host: a pull of the trigger in Boarders Away starts a strike at the one he dashes at (the same he picked moving
// himself, here, or the nearest as the host sees him), which lands as he gets there: 120 if he's within reach of them.
// True while the ult lasts (the pistols are put by)
function lrhDirkStrike(p, I) {
  const P = p.dirkPend;
  if (P && P.t <= 0) {
    const q = LRM.P[P.q]; p.dirkPend = null;
    if (q && q.alive && Math.hypot(q.x - p.x, q.z - p.z) < q.r + p.r + 4 && Math.abs(q.y - p.y) < 3) { lrHurt(q, 120, p, 'dirkult'); lrFxPush('dirkstrike', { x: q.x, y: q.y + q.h * 0.6, z: q.z, yaw: p.yaw, team: p.team, v: p.i }); }
  }
  if (!(p.dirkUltT > 0)) return false;
  if (I.fire && !(p.dirkHostCd > 0) && (p.dirkN || 0) > 0 && !p.dirkPend) {
    const D = !p.remote && p.dirkDash && p.dirkDash.t > 0 ? LRM.P[p.dirkDash.q] : null, q = D && D.alive ? D : lrhDirkPick(p);
    if (q) {
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      p.dirkN--; p.dirkHostCd = 0.45; p.act = { k: 'ult', t: 0 }; p.dirkPend = { q: q.i, t: lrClamp((d - q.r - p.r) / 30, 0.06, 0.4) };
      lrFxPush('dirkdash', { v: p.i, x: p.x, y: p.y + 1, z: p.z, x2: q.x, y2: q.y + 1, z2: q.z, team: p.team });
      if (p.dirkN <= 0) p.dirkUltT = Math.min(p.dirkUltT, 0.6);
    }
  }
  return true;
}
// a way out for a bot in trouble: something to hook onto 8 to 21 m off, away from whoever's after him (up a little)
function lrhDirkEscape(p, tg) {
  const ey = p.y + lrEyeH(p), away = tg ? Math.atan2(tg.x - p.x, tg.z - p.z) : p.yaw + Math.PI; let best = null, bd = 8;
  for (let k = 0; k < 9; k++) {
    const yaw = away + (k - 4) * 0.35, d = lrDir(yaw, 0.3), h = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 21, noBodies: true });
    if (h.t < 21 && h.t > bd) { bd = h.t; best = { x: h.x, y: h.y, z: h.z }; }
  }
  return best;
}
// the powder smoke: anyone in it can't be seen from outside, nor anything beyond it through it (an upright drum 5 m
// round, 4 m high); two inside see each other, and anyone within arm's length is seen anyway
lrDefZone('dirksmoke', { blind(z, a, b, d) {
  if (d < 2.5) return false;
  const R = z.r, y0 = z.y - 0.5, y1 = z.y + 4.2, inside = q => Math.hypot(q.x - z.x, q.z - z.z) < R && q.y > y0 && q.y < y1;
  const ia = inside(a), ib = inside(b); if (ia && ib) return false; if (ia || ib) return true;
  const dx = b.x - a.x, dz = b.z - a.z, fx = a.x - z.x, fz = a.z - z.z, A = dx * dx + dz * dz; if (A < 1e-6) return false;
  const Bq = 2 * (fx * dx + fz * dz), Cq = fx * fx + fz * fz - R * R, disc = Bq * Bq - 4 * A * Cq; if (disc <= 0) return false;
  const s = Math.sqrt(disc), t0 = Math.max(0, (-Bq - s) / (2 * A)), t1 = Math.min(1, (-Bq + s) / (2 * A)); if (t0 >= t1) return false;
  const ya = a.y + (b.y - a.y) * t0, yb = a.y + (b.y - a.y) * t1; return Math.max(ya, yb) > y0 && Math.min(ya, yb) < y1;
} });
lrDefEvent('dirkshot', { own: true, sound: (f, at, me, mine) => at('dirkpistol', mine ? 1 : 0.85) });
lrDefEvent('dirkslash', { own: true, sound: (f, at) => at('dirkslash') });
lrDefEvent('dirkhook', { own: true, sound: (f, at) => at('dirkhook') });
lrDefEvent('dirksmoke', { sound: (f, at) => at('dirksmoke', 1.2) });
lrDefEvent('dirkult', { sound: (f, at) => at('dirkult', 1.4) });
lrDefEvent('dirkdash', { sound: (f, at) => at('dirkdash') });
lrDefEvent('dirkstrike', { sound: (f, at) => at('dirkstrike', 1.2), shake: (f, me) => Math.hypot(f.x - me.x, f.z - me.z) < 1.5 ? 0.4 : 0 });
lrDefSnd('dirkpistol', (v, e, rec, o) => { if (!rec('pepperbox', 0.5 * v, { rate: 1.45 })) { noise('lowpass', 2600 * v + 500, 0.8, 0.001, 0.38 * v, 0.12, o); tone(170, 'triangle', 0.001, 0.12 * v, 0.07, { to: 70, pan: e.pan }); } });
lrDefSnd('dirkslash', (v, e, rec, o) => { if (!rec('swish', 0.7 * v, { rate: 1.35 })) noise('bandpass', 1500, 1.4, 0.02, 0.25 * v, 0.18, o); tone(2400, 'sine', 0.002, 0.03 * v, 0.12, { to: 1800, pan: e.pan }); });
lrDefSnd('dirkhook', (v, e, rec, o) => { if (!rec('grapnel', 0.8 * v)) { noise('bandpass', 900, 1, 0.01, 0.25 * v, 0.3, o); tone(600, 'square', 0.001, 0.06 * v, 0.05, { delay: 0.25, pan: e.pan }); } rec('ropecreak', 0.4 * v, { delay: 0.2 }); });
lrDefSnd('dirksmoke', (v, e, rec, o) => { if (!rec('fogsmother', 0.6 * v)) noise('lowpass', 700, 0.7, 0.05, 0.35 * v, 1.2, o); noise('lowpass', 300, 1, 0.002, 0.3 * v, 0.25, o); });
lrDefSnd('dirkult', (v, e, rec, o) => { if (!rec('board', 0.9 * v)) { tone(330, 'sawtooth', 0.01, 0.1 * v, 0.4, { to: 440, pan: e.pan }); noise('bandpass', 700, 1, 0.05, 0.2 * v, 0.5, o); } });
lrDefSnd('dirkdash', (v, e, rec, o) => { if (!rec('swish', 0.6 * v, { rate: 0.85 })) noise('bandpass', 800, 1.2, 0.02, 0.25 * v, 0.25, o); });
lrDefSnd('dirkstrike', (v, e, rec, o) => { if (!rec('axechop', 0.6 * v, { rate: 1.4 })) noise('lowpass', 1200, 1, 0.001, 0.4 * v, 0.15, o); tone(2000, 'sine', 0.001, 0.05 * v, 0.2, { to: 1500, pan: e.pan }); });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
// a flintlock pistol into a batch, along -z from its grip at (x, y, z), scaled by s: walnut stock and curved butt with
// a brass cap, an iron barrel, the lock, the trigger guard
function lrhDirkPistol(L, x, y, z, s) {
  L.add('box', 0x6a4226, x, y - 0.045 * s, z + 0.03 * s, 0.55, 0, 0, 0.032 * s, 0.11 * s, 0.045 * s);
  L.add('sph:8', LRH_BRASS, x, y - 0.1 * s, z + 0.065 * s, 0, 0, 0, 0.026 * s, 0.022 * s, 0.03 * s);
  L.add('box', 0x6a4226, x, y + 0.005 * s, z - 0.09 * s, 0, 0, 0, 0.03 * s, 0.03 * s, 0.2 * s);
  L.add('cyl:8', LRH_IRON, x, y + 0.02 * s, z - 0.15 * s, Math.PI / 2, 0, 0, 0.012 * s, 0.26 * s, 0.012 * s);
  L.add('cyl:8', LRH_BRASS, x, y + 0.02 * s, z - 0.28 * s, Math.PI / 2, 0, 0, 0.016 * s, 0.02 * s, 0.016 * s);
  L.add('box', LRH_IRON, x + 0.018 * s, y + 0.01 * s, z - 0.01 * s, 0, 0, 0, 0.008 * s, 0.03 * s, 0.06 * s);
  L.add('box', 0x2a2a2e, x + 0.01 * s, y + 0.04 * s, z + 0.0 * s, 0.4, 0, 0, 0.01 * s, 0.03 * s, 0.012 * s);
  L.add('tor:8:0.2', LRH_BRASS, x, y - 0.025 * s, z - 0.035 * s, 0, Math.PI / 2, 0, 0.022 * s);
}
// the boarding dirk into a batch, from its grip at the origin along -z: a brass guard, a long tapering blade
function lrhDirkBlade(L, G, glow) {
  L.add('cyl:8', 0x2a1a12, 0, 0, 0.05, Math.PI / 2, 0, 0, 0.016, 0.11, 0.016);
  L.add('sph:8', LRH_BRASS, 0, 0, 0.11, 0, 0, 0, 0.022);
  L.add('box', LRH_BRASS, 0, 0, -0.01, 0, 0, 0, 0.11, 0.018, 0.022);
  L.add('box', 0xc8ccd4, 0, 0, -0.22, 0, 0, 0, 0.03, 0.008, 0.38);
  L.add('cone:4', 0xc8ccd4, 0, 0, -0.44, -Math.PI / 2, Math.PI / 4, 0, 0.022, 0.08, 0.006);
  if (G && glow != null) G.add('box', glow, 0, 0.005, -0.22, 0, 0, 0, 0.006, 0.006, 0.36);
}
// ---------- Dirk: the boarder with his brace of pistols ----------
function lrhDirk(team) {
  const m = lrhRig('dirk', team), TC = m.TC, t = m.team;
  const jak = t ? 0x2a2522 : 0x2f5f8c, jak2 = t ? 0x1e1a18 : 0x264e74, face = TC.main, shirt = 0xe8e0cc, sash = 0xa81e1c, sash2 = 0x7a1210;
  const tro = 0xe4dccb, stripe = t ? TC.main : TC.trim, scarf = TC.main, boot = 0x1e1a18, skin = 0xc89676, hair = 0x2a1a10;
  lrhLegs(m, 0.1, 0.47, 0.45, (L, S, s, a, b) => {
    // striped slops, in the crew's colour
    L.L.add('cyl:10:1.15', tro, 0, -a / 2, 0, 0, 0, 0, 0.082, a, 0.082);
    for (let k = 0; k < 5; k++) { const q = k / 5 * Math.PI * 2 + 0.3; L.L.add('box', stripe, Math.sin(q) * 0.083, -a / 2, Math.cos(q) * 0.083, 0, q, 0, 0.022, a, 0.006); }
    S.L.add('sph:8', tro, 0, 0, 0, 0, 0, 0, 0.074);
    S.L.add('cyl:10:1.1', tro, 0, -0.08, 0, 0, 0, 0, 0.072, 0.16, 0.072);
    for (let k = 0; k < 5; k++) { const q = k / 5 * Math.PI * 2 + 0.3; S.L.add('box', stripe, Math.sin(q) * 0.073, -0.08, Math.cos(q) * 0.073, 0, q, 0, 0.02, 0.16, 0.006); }
    // the boots, turned down at the top
    S.L.add('cyl:10:1.0', boot, 0, -b * 0.58, 0, 0, 0, 0, 0.064, b * 0.6, 0.064);
    S.L.add('cyl:10:1.25', 0x3a2a20, 0, -0.17, 0, 0, 0, 0, 0.072, 0.07, 0.072);
    S.L.add('box', boot, 0, -b + 0.04, -0.05, 0, 0, 0, 0.11, 0.08, 0.24);
    S.L.add('box', 0x120e0c, 0, -b - 0.0, -0.06, 0, 0, 0, 0.115, 0.02, 0.26);
    S.L.add('box', 0x120e0c, 0, -b + 0.01, 0.06, 0, 0, 0, 0.09, 0.05, 0.05);
  });
  const hp = m.P(m.hips);
  hp.L.add('cyl:10', tro, 0, -0.03, 0, 0, 0, 0, 0.16, 0.14, 0.12);
  // the red sash wound round his waist, knotted on the left with its ends hanging, and two pistols thrust in it
  hp.L.add('cyl:12', sash, 0, 0.06, 0, 0, 0, 0, 0.168, 0.12, 0.128);
  hp.L.add('tor:12:0.25', sash2, 0, 0.03, 0, Math.PI / 2, 0, 0, 0.165, 0.128, 0.1);
  hp.L.add('sph:8', sash2, -0.15, 0.05, -0.05, 0, 0, 0, 0.045, 0.04, 0.04);
  for (const s of [-1, 1]) { hp.L.add('box', 0x6a4226, s * 0.07, 0.11, -0.14, -0.5, s * 0.3, s * 0.35, 0.03, 0.11, 0.04); hp.L.add('sph:8', LRH_BRASS, s * 0.09, 0.16, -0.17, 0, 0, 0, 0.022); hp.L.add('cyl:6', LRH_IRON, s * 0.05, 0.03, -0.13, 0, 0, 0, 0.01, 0.12, 0.01); }
  m.sashEnds = [];
  for (const [x, w] of [[-0.16, 0.06], [-0.13, 0.05]]) { const n = lrhNode(m.hips, x, 0.04, -0.06), B = m.P(n); B.L.add('box', sash, 0, -0.16, 0, 0, 0, 0, w, 0.32, 0.015); B.L.add('box', LRH_BRASS, 0, -0.33, 0, 0, 0, 0, w, 0.03, 0.017); m.sashEnds.push(n); }
  // the scabbard on his right hip; the dirk's hilt shows in it while it's sheathed
  hp.L.add('box', 0x3a2418, 0.17, -0.18, 0.02, -0.25, 0, 0.12, 0.035, 0.42, 0.02);
  hp.L.add('box', LRH_BRASS, 0.19, -0.38, 0.07, -0.25, 0, 0.12, 0.04, 0.04, 0.025);
  m.hilt = lrhNode(m.hips, 0.15, 0.06, -0.04); { const B = m.P(m.hilt); B.L.add('box', LRH_BRASS, 0, 0, 0, 0, 0, 0.12, 0.1, 0.018, 0.022); B.L.add('cyl:8', 0x2a1a12, -0.01, 0.06, 0.01, 0.25, 0, 0.12, 0.015, 0.1, 0.015); B.L.add('sph:8', LRH_BRASS, -0.02, 0.12, 0.02, 0, 0, 0, 0.02); }
  m.spine = lrhNode(m.hips, 0, 0.06, 0, 'spine');
  const sp = m.P(m.spine);
  // the shirt, open at the throat; the short jacket over it, its facings and brass buttons, the collar turned up
  sp.L.add('cyl:10:1.12', shirt, 0, 0.22, -0.01, 0, 0, 0, 0.145, 0.44, 0.1);
  sp.L.add('box', 0xc89676, 0, 0.42, -0.105, 0.2, 0, 0, 0.06, 0.08, 0.01);
  for (const s of [-1, 1]) {
    sp.L.add('box', jak, s * 0.105, 0.24, -0.04, 0, s * 0.18, 0, 0.12, 0.46, 0.15);
    sp.L.add('box', face, s * 0.06, 0.26, -0.115, 0, s * 0.18, s * -0.14, 0.035, 0.42, 0.012);
    for (let k = 0; k < 4; k++) sp.L.add('sph:6', 0xe8c050, s * 0.088, 0.38 - k * 0.09, -0.118, 0, 0, 0, 0.014);
    sp.L.add('box', face, s * 0.1, 0.5, -0.02, 0.25, 0, s * 0.35, 0.09, 0.08, 0.13);
  }
  sp.L.add('box', jak, 0, 0.25, 0.06, 0, 0, 0, 0.32, 0.46, 0.14);
  sp.L.add('box', jak, 0, 0.46, 0, 0, 0, 0, 0.36, 0.1, 0.22);
  sp.L.add('box', face, 0, 0.04, 0.075, 0, 0, 0, 0.3, 0.035, 0.09);
  sp.L.add('box', jak2, 0, 0.25, 0.132, 0, 0, 0, 0.012, 0.36, 0.01);
  m.head = lrhNode(m.spine, 0, 0.52, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('cyl:8', skin, 0, 0.03, 0, 0, 0, 0, 0.05, 0.08, 0.05);
  hd.L.add('sph:12', skin, 0, 0.14, -0.005, 0, 0, 0, 0.095, 0.115, 0.102);
  hd.L.add('sph:10', 0x8a6a54, 0, 0.085, -0.03, 0, 0, 0, 0.088, 0.055, 0.08);      // a dark jaw of stubble
  hd.L.add('box', 0x2a1a10, 0, 0.1, -0.1, 0, 0, 0, 0.07, 0.018, 0.02);           // the moustache, its ends turned down
  for (const s of [-1, 1]) { hd.L.add('box', 0x2a1a10, s * 0.042, 0.085, -0.095, 0, 0, s * 0.6, 0.018, 0.04, 0.016); hd.L.add('box', 0x2a1a10, s * 0.035, 0.175, -0.098, 0, 0, s * -0.2, 0.04, 0.012, 0.01); hd.L.add('sph:6', 0x1a1210, s * 0.034, 0.155, -0.096, 0, 0, 0, 0.012, 0.01, 0.006); hd.L.add('sph:6', skin, s * 0.098, 0.14, 0.005, 0, 0, 0, 0.02, 0.03, 0.014); }
  hd.L.add('cone:4', 0xb88464, 0, 0.13, -0.11, -Math.PI / 2, Math.PI / 4, 0, 0.022, 0.05, 0.022);
  hd.L.add('tor:10:0.25', 0xf0c850, -0.1, 0.1, 0.0, 0, Math.PI / 2, 0, 0.022);     // the gold earring
  // the headscarf in the crew's colour, knotted at the back with its tails, and his hair in a queue below it
  hd.L.add('hemi:12', scarf, 0, 0.165, 0.0, -0.15, 0, 0, 0.104, 0.11, 0.108);
  hd.L.add('box', scarf, 0, 0.19, -0.098, -0.15, 0, 0, 0.17, 0.035, 0.02);
  hd.L.add('sph:8', scarf, 0, 0.17, 0.1, 0, 0, 0, 0.03);
  for (let k = 0; k < 5; k++) hd.L.add('sph:6', t ? 0x2a2522 : 0xf8f0e0, Math.cos(k * 1.3) * 0.07, 0.2 + Math.sin(k * 2.1) * 0.03, -0.05 + (k % 3) * 0.05, 0, 0, 0, 0.012);
  hd.L.add('cyl:6:0.7', hair, 0, 0.06, 0.1, 0.5, 0, 0, 0.022, 0.16, 0.022);
  m.tails = [];
  for (const s of [-1, 1]) { const n = lrhNode(m.head, s * 0.02, 0.17, 0.11), B = m.P(n); B.L.add('box', scarf, 0, -0.08, 0.01, 0, 0, 0, 0.035, 0.16, 0.012); m.tails.push(n); }
  lrhArms(m, 0.2, 0.43, 0, 0.29, 0.27, (A, F, Hn, s, a, b) => {
    A.L.add('sph:8', jak, 0, -0.01, 0, 0, 0, 0, 0.075, 0.07, 0.075);
    A.L.add('cyl:8:1.15', jak, 0, -a / 2, 0, 0, 0, 0, 0.058, a, 0.058);
    F.L.add('cyl:8:1.05', jak, 0, -b * 0.4, 0, 0, 0, 0, 0.052, b * 0.8, 0.052);
    F.L.add('cyl:8', face, 0, -b * 0.8, 0, 0, 0, 0, 0.064, 0.07, 0.064);           // cuffs in the crew's colour
    F.L.add('cyl:8:1.3', shirt, 0, -b * 0.92, 0, 0, 0, 0, 0.05, 0.04, 0.05);
    Hn.L.add('box', skin, 0, -0.04, 0, 0, 0, 0, 0.055, 0.08, 0.07);
  });
  // the brace in his hands, the dirk (drawn to slash, and for Boarders Away), the hook and the smoke pot (left hand)
  m.pisL = lrhNode(m.spine, -0.2, 0.36, -0.3, 'pisL'); lrhDirkPistol(m.P(m.pisL).L, 0, 0, 0, 1.3);
  m.pisR = lrhNode(m.spine, 0.2, 0.36, -0.3, 'pisR'); lrhDirkPistol(m.P(m.pisR).L, 0, 0, 0, 1.3);
  m.muzzle = lrhNode(m.pisR, 0, 0.026, -0.38, 'muzzle');
  m.blade = lrhNode(m.spine, 0.2, 0.36, -0.3, 'blade'); { const B = m.P(m.blade); lrhDirkBlade(B.L, B.G, TC.glow); } m.blade.visible = false;
  m.hook = lrhNode(m.handL, 0, -0.08, 0); { const B = m.P(m.hook); B.L.add('cyl:6', LRH_IRON, 0, 0, 0, 0, 0, 0, 0.014, 0.16, 0.014); B.L.add('tor:8:0.3', LRH_IRON, 0, 0.09, 0, 0, 0, 0, 0.02); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; B.L.add('cone:5', LRH_IRON, Math.cos(a) * 0.04, -0.09, Math.sin(a) * 0.04, 0, -a, -2.3, 0.012, 0.08, 0.012); } } m.hook.visible = false;
  m.pot = lrhNode(m.handL, 0, -0.08, 0); { const B = m.P(m.pot); B.L.add('sph:8', 0x8a6a4a, 0, 0, 0, 0, 0, 0, 0.055); B.L.add('cyl:6', 0x6a4a2a, 0, 0.055, 0, 0, 0, 0, 0.02, 0.03, 0.02); B.G.add('sph:6', 0xffa040, 0, 0.08, 0, 0, 0, 0, 0.012); } m.pot.visible = false;
  m.anim = lrhAnimDirk;
  return m.finish();
}

function lrhAnimDirk(m, pose, dt) {
  lrhBase(m, pose, dt);
  const act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, st = m.st, run = Math.min(1, st.run);
  const V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() });
  // each new shot (the shot clock starting again) is the other hand's: its pistol kicks up
  const f = pose.fire != null ? pose.fire : 9; if (f < (st.lf == null ? 9 : st.lf) - 0.01) st.side = st.side ? 0 : 1; st.lf = f;
  const rec = f >= 0 && f < 0.14 ? 1 - f / 0.14 : 0, rR = st.side ? 0 : rec, rL = st.side ? rec : 0;
  // a swagger: a little lean and a roll of the shoulders when he stands; the pistols up and forward, lower as he runs
  m.spine.rotation.z += 0.04 * (1 - run); m.spine.rotation.x += p * 0.15; m.head.rotation.x = p * 0.6 - m.spine.rotation.x; m.head.rotation.z = -0.05 * (1 - run);
  const low = run * 0.35;
  m.pisR.position.set(0.19, 0.36 - low * 0.14, -0.32 + rR * 0.05); m.pisR.rotation.set(p - low * 0.7 + rR * 0.5, 0.06, -0.08, 'YXZ');
  m.pisL.position.set(-0.19, 0.36 - low * 0.14 + Math.sin(st.ph) * 0.02 * run, -0.32 + rL * 0.05); m.pisL.rotation.set(p - low * 0.7 + rL * 0.5, -0.06, 0.08, 'YXZ');
  m.pisR.visible = m.pisL.visible = true; m.blade.visible = false; m.hilt.visible = true; m.hook.visible = false; m.pot.visible = false;
  let TR = lrhAt(m.pisR, 0, -0.06, 0.04, V.a), TL = lrhAt(m.pisL, 0, -0.06, 0.04, V.b);
  // the sash's ends and the scarf's tails swing
  m.sashEnds.forEach((n, i) => n.rotation.set(-0.15 - run * 0.5 - st.air * 0.6 + Math.sin(st.ph + i) * 0.15 * run, 0, 0.1));
  m.tails.forEach((n, i) => n.rotation.set(0.3 + run * 0.6 + st.air * 0.5 + Math.sin(st.ph * 2 + i) * 0.1, 0, (i ? 0.15 : -0.15)));
  // reloading: both pistols tipped up, the ramrod hand working at one and then the other
  if (pose.reload > 0) {
    const u = 1 - lrhClamp(pose.reload / 1.3, 0, 1), w = Math.sin(u * Math.PI * 6) * 0.04;
    m.pisR.rotation.set(1.1, 0.3, 0, 'YXZ'); m.pisR.position.set(0.16, 0.28, -0.22); m.pisL.rotation.set(-0.9, -0.3, 0.3, 'YXZ'); m.pisL.position.set(-0.12, 0.2, -0.26);
    TR = lrhAt(m.pisR, 0, -0.06, 0.04, V.a); TL = lrhAt(m.pisL, 0, -0.06, 0.04, V.b); TL.y += w; m.head.rotation.x -= 0.3;
  }
  // the slash: the right-hand pistol put by, the dirk drawn and swept across from high right to low left
  if (k === 'alt' && t < 0.45) {
    const a = lrhSm(0, 0.08, t), s = lrhSm(0.08, 0.24, t), back = lrhSm(0.32, 0.45, t);
    m.pisR.visible = false; m.blade.visible = true; m.hilt.visible = false;
    m.blade.position.set(lrhLerp(lrhLerp(0.25, 0.32, a), -0.22, s), lrhLerp(lrhLerp(0.36, 0.58, a), 0.2, s), lrhLerp(-0.25, -0.42, s));
    m.blade.rotation.set(lrhLerp(0.8, -0.2, s), lrhLerp(-0.9, 0.9, s), lrhLerp(1.4, 1.2, s), 'YXZ');
    TR = lrhAt(m.blade, 0, 0, 0.05, V.a); if (back > 0) TR.lerp(lrhAt(m.pisR, 0, -0.06, 0.04, V.c), back);
    m.spine.rotation.y += lrhLerp(lrhLerp(0, -0.3, a), 0.4, s) * (1 - back);
  }
  // the hook: thrown out ahead and up, his left arm out along the rope while it hauls him, legs trailing
  if (k === 'a1' && t < 1.1) {
    const th = lrhSm(0, 0.12, t), hold = 1 - lrhSm(0.85, 1.1, t);
    m.hook.visible = t < 0.08; m.pisL.visible = false;
    TL = V.b.set(-0.12, lrhLerp(0.62, 0.72, th), lrhLerp(-0.1, -0.52, th)).lerp(TL, 1 - hold);
    if (st.air > 0.3) { const q = st.air * hold; m.legL.rotation.x = lrhLerp(m.legL.rotation.x, -0.4, q); m.legR.rotation.x = lrhLerp(m.legR.rotation.x, 0.2, q); m.shinL.rotation.x = lrhLerp(m.shinL.rotation.x, -0.8, q); m.shinR.rotation.x = lrhLerp(m.shinR.rotation.x, -0.3, q); m.spine.rotation.x -= 0.25 * q; }
  }
  // the smoke: a pot dashed down at his feet
  if (k === 'a2' && t < 0.6) {
    const up = lrhSm(0, 0.12, t), dn = lrhSm(0.12, 0.26, t), back = lrhSm(0.4, 0.6, t);
    m.pot.visible = t < 0.22; m.pisL.visible = t > 0.4;
    TL = V.b.set(-0.2, lrhLerp(lrhLerp(0.3, 0.6, up), -0.05, dn), lrhLerp(-0.1, -0.35, dn)).lerp(TL, back);
    m.spine.rotation.x -= 0.3 * dn * (1 - back); m.hips.position.y -= 0.12 * dn * (1 - back);
  }
  // a dash of Boarders Away: the dirk out ahead in a lunge, his left arm flung back, legs in a long stride
  if (k === 'ult' && t < 0.4) {
    const q = lrhSm(0, 0.06, t) * (1 - lrhSm(0.28, 0.4, t));
    m.pisR.visible = false; m.blade.visible = true; m.hilt.visible = false;
    m.blade.position.set(lrhLerp(0.2, 0.08, q), lrhLerp(0.36, 0.38, q), lrhLerp(-0.3, -0.6, q)); m.blade.rotation.set(p * 0.5 + 0.05, 0.05, 1.5 * q, 'YXZ');
    TR = lrhAt(m.blade, 0, 0, 0.05, V.a); TL = TL.lerp(V.c.set(-0.38, 0.32, 0.3), q);
    m.spine.rotation.x -= 0.4 * q; m.legL.rotation.x = lrhLerp(m.legL.rotation.x, 0.9, q); m.legR.rotation.x = lrhLerp(m.legR.rotation.x, -0.6, q); m.shinR.rotation.x = lrhLerp(m.shinR.rotation.x, -0.5, q);
  }
  if (lrhDead(m, pose, -1)) { TL = V.c.set(-0.5, 0.25, 0.15); TR = V.d.set(0.5, 0.25, 0.1); m.pisR.rotation.set(-1.2, 0.4, 0.6, 'YXZ'); m.pisL.rotation.set(-1.2, -0.4, -0.6, 'YXZ'); }
  lrhHands(m, TL, TR);
}

// the brace in first person: one pistol low at each side of the view, well clear of the crosshair (the right a little
// nearer the middle); the dirk sweeps across from the right to slash. (Sleeves and cuffs in the crew's colours are built
// for both crews, those of his side shown.)
function lrhDirkView(V) {
  const { root, st, mk, B, flashSpr } = V;
  const side = sx => {
    const g = mk(root, sx > 0 ? 0.24 : 0.07, sx > 0 ? -0.21 : -0.28, -0.42), b = B(g); lrhDirkPistol(b.L, 0, 0, 0, 1);
    const h = mk(g, 0, -0.04, 0.03), hb = B(h); hb.L.add('box', 0xc89676, 0, 0, 0, 0.5, 0, 0, 0.05, 0.06, 0.065); hb.L.add('cyl:8', 0xe8e0cc, 0, -0.035, 0.07, 1.1, 0, 0, 0.034, 0.03, 0.034);
    const sl = [0, 1].map(tm => { const n = mk(h, 0, 0, 0), c = B(n), T = LRH_TEAM[tm]; c.L.add('cyl:8', T.main, 0, -0.055, 0.11, 1.1, 0, 0, 0.044, 0.05, 0.044); c.L.add('cyl:8', tm ? 0x2a2522 : 0x2f5f8c, 0, -0.1, 0.2, 1.1, 0, 0, 0.04, 0.16, 0.04); return n; });
    const fl = flashSpr(0xffd090, 0.16); fl.position.set(0, 0.02, -0.31); g.add(fl);
    return { g, sl, fl, mz: mk(g, 0, 0.02, -0.3) };
  };
  const R = side(1), L = side(-1);
  const blade = mk(root, 0.25, -0.2, -0.4), bb = B(blade); lrhDirkBlade(bb.L, bb.G, 0xffe0a0); blade.visible = false;
  const bh = mk(blade, 0, -0.02, 0.05), bhb = B(bh); bhb.L.add('box', 0xc89676, 0, 0, 0, 0, 0, 0, 0.05, 0.06, 0.07);
  const hook = mk(root, 0.08, -0.2, -0.5), hk = B(hook); hk.L.add('cyl:6', LRH_IRON, 0, 0, 0, 0.3, 0, 0, 0.01, 0.12, 0.01); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; hk.L.add('cone:5', LRH_IRON, Math.cos(a) * 0.03, 0.07, Math.sin(a) * 0.03, 0, -a, 2.3, 0.009, 0.06, 0.009); } hook.visible = false;
  const pot = mk(root, 0.08, -0.24, -0.45), pb = B(pot); pb.L.add('sph:8', 0x8a6a4a, 0, 0, 0, 0, 0, 0, 0.04); pb.G.add('sph:6', 0xffa040, 0, 0.045, 0, 0, 0, 0, 0.01); pot.visible = false;
  const anim = (s, dt) => {
    const me = typeof lrMe === 'function' ? lrMe() : null, tm = me ? me.team : 0; for (const S of [R, L]) { S.sl[0].visible = tm === 0; S.sl[1].visible = tm === 1; }
    const f = s.fire != null ? s.fire : 9; if (f < (st.lf == null ? 9 : st.lf) - 0.01) st.side = me ? (me.dirkHand ? 1 : 0) : st.side ? 0 : 1; st.lf = f;
    const rec = f >= 0 && f < 0.14 ? 1 - f / 0.14 : 0, k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
    for (const [S, sx, r] of [[R, 1, st.side ? 0 : rec], [L, -1, st.side ? rec : 0]]) { S.g.visible = true; S.g.position.set(sx > 0 ? 0.24 : 0.07, (sx > 0 ? -0.21 : -0.28) - r * 0.01, -0.42 + r * 0.05); S.g.rotation.set(0.04 + r * 0.3, sx > 0 ? 0.07 : 0.03, sx * -0.05); S.fl.material.opacity = r > 0.6 ? (r - 0.6) * 2.5 : 0; S.fl.material.rotation = Math.random() * 6; }
    if (s.reload > 0) { const u = 1 - lrhClamp(s.reload / 1.3, 0, 1), w = Math.sin(u * Math.PI * 6) * 0.02; R.g.rotation.set(0.45, 0.5, 0.5); R.g.position.set(0.26, -0.29, -0.38); L.g.rotation.set(-0.5, -0.3, -0.4); L.g.position.set(0.08, -0.32 + w, -0.38); }
    blade.visible = false; hook.visible = false; pot.visible = false;
    if (k === 'alt' && t < 0.45) {
      const a = lrhSm(0, 0.08, t), sw = lrhSm(0.08, 0.24, t), back = lrhSm(0.32, 0.45, t);
      R.g.visible = back > 0.5; blade.visible = back < 0.5;
      blade.position.set(lrhLerp(lrhLerp(0.28, 0.34, a), -0.12, sw), lrhLerp(lrhLerp(-0.22, -0.13, a), -0.27, sw), -0.42);
      blade.rotation.set(lrhLerp(0.2, -0.4, sw), lrhLerp(0.3, -0.3, sw), lrhLerp(-0.6, 1.9, sw));
    }
    if (k === 'a1' && t < 1.1) { const th = lrhSm(0, 0.12, t), hold = 1 - lrhSm(0.85, 1.1, t); L.g.visible = hold < 0.4; hook.visible = t < 0.12; hook.position.set(0.08, lrhLerp(-0.26, -0.16, th), lrhLerp(-0.4, -0.6, th)); }
    if (k === 'a2' && t < 0.6) { const dn = lrhSm(0.1, 0.25, t); L.g.visible = t > 0.4; pot.visible = t < 0.22; pot.position.set(0.08, lrhLerp(-0.24, -0.4, dn), -0.45); }
    if (k === 'ult' && t < 0.4) { const q = lrhSm(0, 0.06, t) * (1 - lrhSm(0.28, 0.4, t)); R.g.visible = false; blade.visible = true; blade.position.set(lrhLerp(0.22, 0.1, q), lrhLerp(-0.2, -0.15, q), lrhLerp(-0.38, -0.6, q)); blade.rotation.set(0.05, 0.1, 1.5); }
  };
  return { muzzle: R.mz, anim };
}
lrDefHeroArt('dirk', { spec: { h: 1.8, hipY: 0.95, stride: 1.8, spd: 6.4 }, model: lrhDirk, view: lrhDirkView, portraitY: 0.27 });

// the powder smoke: a rolling bank of grey puffs 5 m round (thinned where the camera is inside it, so a body in it still
// sees a little), gathering fast and thinning away at the end
lrDefZoneArt('dirksmoke', (g, TC, spr) => {
  const P = [], W = new THREE.Vector3(), cam = () => typeof LR3 !== 'undefined' && LR3.cam ? LR3.cam.position : null;
  for (let k = 0; k < 36; k++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()), s = spr(k % 3 ? 0x8a8680 : 0x6e6a66, 3, 0.8, false); P.push({ s, a, r, y: 0.3 + Math.random() * 3.4, sz: 3 + Math.random() * 2.2, ph: Math.random() * 6, sp: (Math.random() - 0.5) * 0.4 }); }
  const tint = spr(TC.main, 7, 0.08, true); tint.position.y = 1.2;
  return (z, dt, T) => {
    const R = z.r || 5, left = z.t != null ? z.t : 5, grow = lrhSm(0, 0.6, Math.max(T, 5 - left)), fade = lrhClamp(left / 0.9, 0, 1), c = cam();
    for (const q of P) {
      q.a += q.sp * dt; const rr = q.r * R * (0.55 + 0.45 * grow);
      q.s.position.set(Math.cos(q.a) * rr, q.y * (0.4 + 0.6 * grow) + Math.sin(T * 0.6 + q.ph) * 0.15, Math.sin(q.a) * rr);
      q.s.scale.setScalar(q.sz * (0.5 + 0.5 * grow) * (1 + 0.08 * Math.sin(T * 0.8 + q.ph)));
      let op = 0.95 * grow * fade;
      if (c) { q.s.getWorldPosition(W); const d = W.distanceTo(c); if (d < 2.6) op *= Math.max(0.12, d / 2.6); }
      q.s.material.opacity = op; q.s.material.rotation = q.ph + T * 0.1;
    }
    tint.material.opacity = 0.06 * fade * grow;
  };
});

// a shot's tracer and flash, from the hand it left (in first person, the view's pistol that side)
lrDefFx('dirkshot', (o, X) => {
  const { rod, sprite, smoke, TCol } = X, me = typeof lrMe === 'function' ? lrMe() : null, cam = typeof LR3 !== 'undefined' ? LR3.cam : null; let a = { x: o.x, y: o.y, z: o.z };
  if (me && o.v === me.i && me.alive && cam && LRM.ph !== 'over') { const v = new THREE.Vector3(o.hd ? 0.07 : 0.23, o.hd ? -0.25 : -0.18, -0.72).applyQuaternion(cam.quaternion).add(cam.position); a = { x: v.x, y: v.y, z: v.z }; }
  const c = TCol(o.team);
  rod(a.x, a.y, a.z, o.x2, o.y2, o.z2, 0.02, c.glow, 0.08, 0.85); rod(a.x, a.y, a.z, o.x2, o.y2, o.z2, 0.007, 0xfff8e0, 0.05, 1);
  sprite(a.x, a.y, a.z, 0xffd080, 0.45, 0.06); smoke(a.x, a.y, a.z, 1, 0.25, 0.6, 0x8a8278);
});
// the slash: a bright arc swept across in front of him
lrDefFx('dirkslash', (o, X) => {
  const { sprite } = X, yaw = o.yaw || 0;
  for (let k = 0; k < 9; k++) { const a = yaw + 0.8 - k * 0.2, d = 1.6 + Math.sin(k / 8 * Math.PI) * 0.4; sprite(o.x - Math.sin(a) * d, o.y + 0.25 - k * 0.06, o.z - Math.cos(a) * d, k % 2 ? 0xe8f0ff : 0xfff4d8, 0.35, 0.16 + k * 0.012, -Math.cos(a) * 2, 0, Math.sin(a) * 2); }
});
// the boarding hook's rope: from his hand to where it caught (or the body it caught), shot out at once and kept while he's
// hauled; a pool of four, each following its thrower every frame
lrDefFx('dirkhook', {
  init(X) {
    const rodG = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true); rodG.translate(0, 0.5, 0);
    const R = []; for (let k = 0; k < 4; k++) {
      const g = new THREE.Group(), rope = new THREE.Mesh(rodG, new THREE.MeshLambertMaterial({ color: 0x8a7050 })), B = lrBatch();
      B.add('sph:6', LRH_IRON, 0, 0, 0, 0, 0, 0, 0.06); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; B.add('cone:5', LRH_IRON, Math.cos(a) * 0.08, -0.04, Math.sin(a) * 0.08, 0, -a, -2.4, 0.025, 0.16, 0.025); }
      const head = B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })); g.add(rope); g.add(head); g.visible = false; X.root.add(g); R.push({ g, rope, head, life: 0, o: null });
    }
    return { R, A: new THREE.Vector3(), Bv: new THREE.Vector3(), Q: new THREE.Quaternion(), UP: new THREE.Vector3(0, 1, 0) };
  },
  spawn(o, X, S) { for (const q of S.R) if (q.o && q.o.v === o.v) { q.life = 0; q.g.visible = false; } const r = S.R.find(q => q.life <= 0) || S.R[0]; r.o = o; r.life = 1.6; r.age = 0; r.g.visible = true; },
  update(dt, X, S) {
    const me = typeof lrMe === 'function' ? lrMe() : null, cam = typeof LR3 !== 'undefined' ? LR3.cam : null, A = LRM.alpha || 0;
    for (const r of S.R) {
      if (r.life <= 0) continue; r.life -= dt; r.age += dt; const o = r.o, p = LRM.P[o.v];
      if (!p || !p.alive || r.life <= 0 || (r.age > 0.15 && p.act.k !== 'a1')) { r.life = 0; r.g.visible = false; continue; }
      const q = o.q >= 0 ? LRM.P[o.q] : null, x2 = q && q.alive ? lrhLerp(q.px, q.x, A) : o.x2, y2 = q && q.alive ? lrhLerp(q.py, q.y, A) + q.h * 0.55 : o.y2, z2 = q && q.alive ? lrhLerp(q.pz, q.z, A) : o.z2;
      if (me && p === me && cam && LRM.ph !== 'over') S.A.set(-0.2, -0.12, -0.55).applyQuaternion(cam.quaternion).add(cam.position);
      else { const x = lrhLerp(p.px, p.x, A), y = lrhLerp(p.py, p.y, A), z = lrhLerp(p.pz, p.z, A); S.A.set(x - Math.cos(p.yaw) * 0.15 - Math.sin(p.yaw) * 0.4, y + 1.45, z + Math.sin(p.yaw) * 0.15 - Math.cos(p.yaw) * 0.4); }
      S.Bv.set(x2, y2, z2).sub(S.A); const L = S.Bv.length(); if (L < 1.2 && r.age > 0.2) { r.life = 0; r.g.visible = false; continue; }
      const f = lrhSm(0, 0.12, r.age), l = Math.max(0.01, L * f); S.Bv.multiplyScalar(1 / (L || 1));
      r.g.position.copy(S.A); S.Q.setFromUnitVectors(S.UP, S.Bv); r.rope.quaternion.copy(S.Q); r.rope.scale.set(0.018, l, 0.018);
      r.head.position.copy(S.Bv).multiplyScalar(l); r.head.quaternion.copy(S.Q);
    }
  },
});
// the smoke going up: a burst of grey and a flash at his feet (the bank itself is the zone's)
lrDefFx('dirksmoke', (o, X) => {
  const { sprite, ring } = X;
  sprite(o.x, o.y + 0.3, o.z, 0xffd080, 1.4, 0.1);
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; sprite(o.x, o.y + 0.4, o.z, 0x8a8680, 0.8, 1.2, Math.cos(a) * 5, 1 + Math.random() * 2, Math.sin(a) * 5, 2.5, 0, true); }
  ring(o.x, o.y + 0.08, o.z, 0.3, 5, 0xd8d0c0, 0.5, 0.5);
});
// Boarders Away: a flare of the crew's colour round him as he calls it, and while it lasts a glow about him and embers
// shed behind him (for everyone who can see him; his own view shows the ring on the crosshair)
lrDefFx('dirkult', {
  init(X) { const A = []; for (let k = 0; k < 10; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.visible = false; X.root.add(s); A.push(s); } return { A, e: 0 }; },
  spawn(o, X) { const c = X.TCol(o.team); X.sprite(o.x, o.y, o.z, c.glow, 2.6, 0.4, 0, 0, 0, 4); X.burst(o.x, o.y, o.z, c.main, 14, 4, 0.25, 0.6, 1); X.ring(o.x, X.gy(o.x, o.z) + 0.06, o.z, 0.4, 3, c.main, 0.6, 0.8); },
  update(dt, X, S) {
    const me = typeof lrMe === 'function' ? lrMe() : null, A = LRM.alpha || 0, fp = me && me.alive && LRM.ph !== 'over'; S.e -= dt; const emit = S.e <= 0; if (emit) S.e = 0.06;
    for (let i = 0; i < S.A.length; i++) {
      const s = S.A[i], p = LRM.P[i]; if (!p || p.hero !== 'dirk' || !p.alive || !(p.dirkUltT > 0) || (fp && p === me)) { s.visible = false; continue; }
      const c = X.TCol(p.team), x = lrhLerp(p.px, p.x, A), y = lrhLerp(p.py, p.y, A) + 1.0, z = lrhLerp(p.pz, p.z, A);
      s.visible = true; s.position.set(x, y, z); s.material.color.setHex(c.glow); s.material.opacity = 0.35 + Math.random() * 0.2; s.scale.setScalar(2.2 + Math.sin(performance.now() / 90) * 0.2);
      if (emit) X.sprite(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.4) * 1.2, z + (Math.random() - 0.5) * 0.6, Math.random() < 0.5 ? c.main : 0xffe0a0, 0.16, 0.5, 0, 0.6, 0);
    }
  },
});
// a dash: a streak along it; a strike: a cross of bright cuts and sparks on whoever he reached
lrDefFx('dirkdash', (o, X) => { const c = X.TCol(o.team); X.rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.12, c.glow, 0.25, 0.45); X.rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.03, 0xfff4e0, 0.18, 0.9); X.smoke(o.x, o.y - 0.7, o.z, 2, 0.5, 0.6, 0x7a7470); });
lrDefFx('dirkstrike', (o, X) => {
  const { rod, burst, sprite } = X, c = X.TCol(o.team), yaw = o.yaw || 0, rx = Math.cos(yaw) * 0.55, rz = -Math.sin(yaw) * 0.55;
  rod(o.x - rx, o.y + 0.5, o.z - rz, o.x + rx, o.y - 0.5, o.z + rz, 0.03, 0xfff4e0, 0.22, 1); rod(o.x + rx, o.y + 0.5, o.z + rz, o.x - rx, o.y - 0.5, o.z - rz, 0.03, c.glow, 0.22, 1);
  sprite(o.x, o.y, o.z, 0xfff0d0, 1.2, 0.1); burst(o.x, o.y, o.z, c.glow, 10, 4, 0.16, 0.35, 1);
});
