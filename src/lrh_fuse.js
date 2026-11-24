'use strict';
// The Lamp Road: Fuse, the powder monkey. His kit (the play, on the host unless said), his bot, his crosshair, the
// bombs, the sea mine and the fire ship, their sounds and events, and (below) his art: the figure, the mortar in first
// person, what he throws and sets down, and his blasts. A hero file as the guide at the top of src/lr.js has it.

// ---------- the play ----------
lrDefHero({
  id: 'fuse', n: 'Fuse', title: 'The Powder Monkey', role: 'damage', hp: 200, spd: 5.9, r: 0.4, h: 1.7, mag: 5, reloadT: 1.6, ultCost: 1800,
  cd: { a1: 7, a2: 10, alt: 0 }, range: 26, botKeep: 7, projSpeed: 25, actT: { a1: 0.8, a2: 0.5, alt: 0.3, ult: 1.0 }, own: ['a1'],
  blurb: 'A wiry young bombardier, black with soot, a brass swivel mortar braced on his hip. Round corners, over walls, bang.',
  kit: {
    pri: ['Swivel Mortar', 'Lob bombs in an arc: they bounce once and burst on the second touch, or on a body.'],
    alt: ['Short Fuse', 'Burst every bomb you have in the air, at once.'],
    a1: ['Powder Hop', 'A blast at your feet throws you high and forward. It doesn’t hurt you.', 'Hop'],
    a2: ['Sea Mine', 'Set a spiked mine where you aim. It goes off under the first enemy to come near.', 'Mine'],
    ult: ['Fire Ship', 'Launch a burning skiff along the ground: it blows up at a wall, at the end, or on anyone.', 'Fire Ship'],
  },
  how: { fusebomb: 'Swivel Mortar', fusemine: 'Sea Mine', fuseship: 'Fire Ship' },
  // the Swivel Mortar: a bomb lobbed along his look (gravity does the rest)
  fire(p, dt, I, H) {
    if (!(I.fire && p.fireT >= 0.6 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--;
    lrSpawnProj(p, 'fusebomb', 25, { dy: -0.15 });
    lrFxPush('fusefire', { v: p.i, x: p.x, y: p.y + 1.1, z: p.z, yaw: p.yaw, team: p.team });
  },
  // Short Fuse: a tug on the lanyard, and every bomb of his in the air bursts where it is
  alt(p, dt, I) {
    const was = p.fuseAltWas; p.fuseAltWas = !!I.alt; if (!I.alt || was) return;
    let n = 0; for (const j of LRM.proj) if (j.k === 'fusebomb' && j.owner === p.i) { j.det = 1; n++; }
    if (n) { p.act = { k: 'alt', t: 0 }; lrFxPush('fusedet', { v: p.i, x: p.x, y: p.y + 1.1, z: p.z }); }
  },
  // Sea Mine: set where he aims (up to 15 m, on the ground under that point); one at a time, armed after a moment
  a2(p, dt, I, H) {
    if (!(I.a2 && p.cd.a2 <= 0)) return;
    const ey = p.y + lrEyeH(p), d = lrDir(p.yaw, p.pitch), h = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 15, noBodies: true });
    const B = LR_MAP.bounds, x = lrClamp(h.x - d[0] * 0.35, B.x0 + 1, B.x1 - 1), z = lrClamp(h.z - d[2] * 0.35, B.z0 + 1, B.z1 - 1), y = lrGround(x, z, h.y + 0.3);
    LRM.zones = LRM.zones.filter(q => !(q.k === 'fusemine' && q.owner === p.i));
    lrAddZone({ k: 'fusemine', team: p.team, owner: p.i, x, y, z, r: 2.5, t: 999, arm: 0.6 });
    p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    lrFxPush('fusemineset', { v: p.i, x: p.x, y: ey - 0.4, z: p.z, x2: x, y2: y, z2: z, team: p.team });
  },
  // Fire Ship: a burning skiff set off along the ground the way he faces
  ult(p) {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), d = Math.max(0, Math.min(1.2, lrBlockRay(p.x, p.y + 0.7, p.z, fx, 0, fz, 1.6) - 0.5)), x = p.x + fx * d, z = p.z + fz * d;
    const j = lrSpawnProj(p, 'fuseship', 0); j.x = x; j.y = lrGround(x, z, p.y + 0.6); j.z = z; j.vx = fx * 13; j.vy = 0; j.vz = fz * 13; j.run = 0;
    lrFxPush('fuseshipgo', { v: p.i, x, y: j.y, z, yaw: p.yaw, team: p.team });
  },
  // (on whichever screen moves him) Powder Hop: thrown up about four metres and on the way he walks (or looks), held on
  // that course until he lands
  body(p, dt, I, H, M) {
    if (!(I.a1 && p.cd.a1 <= 0)) return;
    const fx = M.wl > 0.2 ? M.wx : -M.sy, fz = M.wl > 0.2 ? M.wz : -M.cy;
    p.vx = fx * 10; p.vz = fz * 10; p.vy = 12; p.gnd = false; p.fuseHop = 0.001;
    p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 };
    lrFxPush('fusehop', { x: p.x, y: p.y, z: p.z, v: p.i, team: p.team });
  },
  move(p, dt) {
    if (!p.fuseHop) return false;
    p.fuseHop += dt; if ((p.gnd && p.fuseHop > 0.15) || p.knockT > 0 || p.root > 0 || p.fuseHop > 3) { p.fuseHop = 0; return false; }
    return true;
  },
  ownUse(p, k) { if (k === 'a1') lrLocalFx({ k: 'fusehop', x: p.px, y: p.py, z: p.pz, v: p.i, team: p.team }); },
  ownHost(p, k, u) { lrFxPush('fusehop', { x: u[2], y: u[3], z: u[4], v: p.i, team: p.team }); },
  // a guest's own shot: the thump and the puff at once (the bomb itself is the host's, and its arc and bounce with it)
  guestFire(p, I) {
    if (!(I.fire && p.fireT >= 0.6 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--; LRM.shotAt = performance.now();
    lrLocalFx({ k: 'fusefire', v: p.i, x: p.x, y: p.y + 1.1, z: p.z, yaw: p.yaw, team: p.team });
  },
  // a bot's Short Fuse is judged every tick (a bomb goes seven metres between its bot's thoughts): a bomb of his, well
  // clear of him, that has just gone past an enemy (or bounced beside one) is burst; one still on its way in is left to hit
  tick(p) {
    if (!p.bot || !p.alive || LRM.ph !== 'play' || !lrHost()) return;
    for (const j of LRM.proj) {
      if (j.k !== 'fusebomb' || j.owner !== p.i || j.t < 0.12 || Math.hypot(j.x - p.x, j.z - p.z) < 4) continue;
      if (LRM.P.some(q => { if (!q.alive || q.team === p.team || Math.abs(q.y + 0.9 - j.y) > 1.8) return false; const dx = q.x - j.x, dz = q.z - j.z; return Math.hypot(dx, dz) < (j.b ? 2.2 : 1.9) && (j.b || dx * j.vx + dz * j.vz < 0); })) { p.inp.alt = true; return; }
    }
  },
  reset(p, why) { p.fuseHop = 0; p.fuseAltWas = false; if (why === 'hero') LRM.zones = LRM.zones.filter(z => !(z.k === 'fusemine' && z.owner === p.i)); },
  // the HUD: Short Fuse lit while bombs are out, the mine lit while it's set, the hop while he's in the air
  abil(p, k) { return { on: k === 'alt' ? LRM.proj.some(j => j.k === 'fusebomb' && j.owner === p.i) : k === 'a2' ? LRM.zones.some(z => z.k === 'fusemine' && z.owner === p.i) : k === 'a1' && !!p.fuseHop }; },
  // the bot: lobs every bomb with the arc and the lead worked out; the fire ship down a line of them (or one on the
  // Wain); the mine at the feet of whoever's close, or by the Wain; the hop away when hurt, or in at someone far
  bot(p, ai, B) {
    const { S, I, tg, hpF, hurt, foes, C, at, inCone, mode } = B;
    if (p.ult >= 1 && tg && ai.tgtD < 26 && ai.tgtD > 3) {
      const yaw = Math.atan2(-(tg.x - p.x), -(tg.z - p.z)), n = inCone(yaw, 28, 0.2), clear = lrBlockRay(p.x, p.y + 0.7, p.z, -Math.sin(yaw), 0, -Math.cos(yaw), ai.tgtD) >= ai.tgtD - 1;
      if (clear && (n >= S.clump || (n >= 1 && foes.length >= 2 && Math.hypot(tg.x - C.x, tg.z - C.z) < 5) || (n >= 1 && tg.hp < 160))) { mode({ at: at(tg, 0), press: 'ult', pressAt: LRM.t + 0.25 }); return; }
    }
    if (p.cd.a2 <= 0) {
      if (tg && ai.tgtD < 13 && ai.tgtD > 3) { mode({ at: { x: tg.x + tg.vx * 0.5, y: tg.y, z: tg.z + tg.vz * 0.5 }, press: 'a2', pressAt: LRM.t + 0.25 }); return; }
      const dc = Math.hypot(C.x - p.x, C.z - p.z);
      if (!tg && dc < 13 && dc > 3 && !LRM.zones.some(z => z.k === 'fusemine' && z.owner === p.i && Math.hypot(z.x - C.x, z.z - C.z) < 6)) { const s = p.team ? 1.5 : -1.5; mode({ at: { x: C.x + Math.sin(C.yaw) * s, y: 0, z: C.z + Math.cos(C.yaw) * s }, press: 'a2', pressAt: LRM.t + 0.3 }); return; }
    }
    if (p.cd.a1 <= 0 && ((hurt && hpF < 0.45) || (tg && ai.tgtD > 18 && ai.tgtD < 30 && hpF > 0.7 && Math.random() < 0.15))) { I.a1 = true; if (hpF < 0.45) ai.retreat = true; }
    // the mortar: aimed at a point that keeps itself up to date (where the target will be when the bomb comes down), at
    // the lob's pitch, pressed while it lasts
    if (tg && ai.tgtD < 26 && ai.react <= 0) {
      const lead = () => { const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz), dy = tg.y + 0.8 - (p.y + lrEyeH(p)), pt = lrLobPitch(d, dy, 25), tt = d / (25 * Math.max(0.3, Math.cos(pt))) * S.lead; return [tg.x + tg.vx * tt, tg.y + 0.8, tg.z + tg.vz * tt]; };
      mode({ at: { get x() { return lead()[0]; }, get y() { return lead()[1]; }, get z() { return lead()[2]; } }, lob: 25, press: 'fire', pressAt: LRM.t + 0.08, once: false, until: LRM.t + 0.45 });
    }
  },
  // his crosshair: a ring, and below it the marks of where a bomb falls (nearer marks for longer lobs)
  cross(c, cx, cy) {
    c.beginPath(); c.arc(cx, cy, 9, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, 1.6, 0, 7); c.fill();
    for (let k = 1; k <= 3; k++) { const y = cy + 10 + k * k * 4, w = 10 - k * 2; c.beginPath(); c.moveTo(cx - w, y); c.lineTo(cx + w, y); c.stroke(); }
  },
});
// a blast at (x, y, z) of radius R: full at the middle, edge at the rim, to everyone of the other side in the open (and
// to its maker, times selfK), and their walls; skip is one already hit square on; knock throws them up
function lrhFuseBlast(x, y, z, a, team, R, full, edge, how, skip, selfK, knock) {
  const oy = y + 0.25;
  for (const q of LRM.P) {
    if (!q.alive || q === skip) continue; const me = a && q === a; if ((q.team === team && !me) || (me && !selfK)) continue;
    const cy = lrClamp(oy, q.y + 0.2, q.y + q.h - 0.2), dx = q.x - x, dy = cy - oy, dz = q.z - z, l = Math.hypot(dx, dy, dz), d = Math.max(0, l - q.r); if (d > R) continue;
    if (l > 0.3 && lrRay(x, oy, z, dx / l, dy / l, dz / l, l) < l - q.r - 0.3) continue;
    lrHurt(q, (full - (full - edge) * d / R) * (me ? selfK : 1), a, how);
    if (knock && q.alive && !me) { const hl = Math.hypot(dx, dz) || 1; lrKnock(q, dx / hl * knock * 0.4, knock, dz / hl * knock * 0.4, 0.5); }
  }
  for (const w of LRM.walls) { if (w.team === team) continue; const ux = Math.cos(w.yaw), uz = -Math.sin(w.yaw), ox = x - w.x, oz = z - w.z, u = lrClamp(ox * ux + oz * uz, -w.w / 2, w.w / 2), d = Math.hypot(ox - ux * u, oz - uz * u); if (d < R && y > w.y - 1 && y < w.y + w.h + 1) lrWallHurt(w, full - (full - edge) * d / R, a); }
}
// the bomb: bounces off the first thing it meets (the ground, a wall, a bulkhead), bursts on the second, on a body, at
// Short Fuse, or after three seconds: 75 to a body it hits, 50 round it in 3 m (falling off a little), half to Fuse
lrDefProj('fusebomb', { step(j, dt, M) {
  const go = (x, y, z, direct) => { if (direct) lrHurt(direct, 75, M.a, 'fusebomb'); lrhFuseBlast(x, y, z, M.a, j.team, 3, 50, 30, 'fusebomb', direct, 0.5); lrFxPush('fuseboom', { x, y: y + 0.2, z, r: 3, team: j.team }); return true; };
  if (j.det || j.t > 3) return go(j.x, j.y, j.z);
  const h = lrRayHit(M.sx, M.sy, M.sz, M.dx, M.dy, M.dz, { team: j.team, skip: j.owner, pad: 0.15, max: M.L });
  if (h.t >= M.L) return false;
  if (h.p) return go(h.x, h.y, h.z, h.p);
  const x = h.x - M.dx * 0.12, y = h.y - M.dy * 0.12, z = h.z - M.dz * 0.12;
  if (j.b) return go(x, Math.max(y, lrGround(x, z, y + 0.3)), z);
  // the bounce: whichever way is blocked, turned back and slowed; struck square into a corner, straight back
  j.b = 1; const r = 0.2; let f = 0;
  if (Math.abs(j.vx) > 0.01 && lrBlockRay(M.sx, M.sy, M.sz, Math.sign(j.vx), 0, 0, Math.abs(j.vx) * dt + r) < Math.abs(j.vx) * dt + r) { j.vx = -j.vx * 0.5; f++; }
  if (Math.abs(j.vz) > 0.01 && lrBlockRay(M.sx, M.sy, M.sz, 0, 0, Math.sign(j.vz), Math.abs(j.vz) * dt + r) < Math.abs(j.vz) * dt + r) { j.vz = -j.vz * 0.5; f++; }
  if (Math.abs(j.vy) > 0.01 && lrBlockRay(M.sx, M.sy, M.sz, 0, Math.sign(j.vy), 0, Math.abs(j.vy) * dt + r) < Math.abs(j.vy) * dt + r) { j.vy = -j.vy * 0.45; j.vx *= 0.7; j.vz *= 0.7; f++; }
  if (!f) { j.vx *= -0.4; j.vy *= -0.4; j.vz *= -0.4; }
  j.x = x; j.y = y; j.z = z;
  lrFxPush('fusebounce', { x, y, z });
  return false;
} });
// the sea mine: arms after a moment, and then the first enemy within 2.5 m sets it off: 110 to every enemy within 3 m,
// and a throw up into the air
lrDefZone('fusemine', { fix: { arm: 0 }, tick(z, dt) { if (z.gone) return; z.t = 999; if (z.arm > 0) z.arm -= dt; }, touch(z, q, dt, a) {
  if (z.arm > 0 || z.gone || q.team === z.team) return;
  z.gone = 1; z.t = 0;
  lrhFuseBlast(z.x, z.y, z.z, a, z.team, 3, 110, 110, 'fusemine', null, 0, 9);
  lrFxPush('fuseminego', { x: z.x, y: z.y, z: z.z, team: z.team });
} });
// the fire ship: runs along the ground (up steps, down drops) for 30 m, and blows up at the end, at a wall, or on the
// first enemy it meets: 260 within 6 m, falling off to 80 at the edge
lrDefProj('fuseship', { grav: false, step(j, dt, M) {
  const sp = Math.hypot(j.vx, j.vz) || 1, ux = j.vx / sp, uz = j.vz / sp, L = sp * dt;
  j.run = (j.run || 0) + L;
  const wall = lrBlockRay(j.x, j.y + 0.7, j.z, ux, 0, uz, L + 0.8) < L + 0.8;
  const hit = LRM.P.find(q => q.alive && q.team !== j.team && Math.hypot(q.x - j.x, q.z - j.z) < q.r + 1.0 && q.y < j.y + 1.6 && q.y + q.h > j.y);
  if (wall || hit || j.run >= 30 || j.t > 4) {
    lrhFuseBlast(j.x, j.y + 0.4, j.z, M.a, j.team, 6, 260, 80, 'fuseship', null, 0, 6);
    lrFxPush('fuseshipboom', { x: j.x, y: j.y + 0.4, z: j.z, r: 6, team: j.team });
    return true;
  }
  const g = lrGround(j.x + j.vx * dt, j.z + j.vz * dt, j.y + 0.6);
  j.vy = g > j.y ? (g - j.y) / dt : g < j.y - 0.02 ? Math.max((g - j.y) / dt, Math.min(0, j.vy) - LR_G * dt) : 0;
  return false;
} });
lrDefEvent('fusefire', { own: true, sound: (f, at, me, mine) => at('fusemortar', mine ? 1 : 0.85) });
lrDefEvent('fusehop', { own: true, sound: (f, at) => at('fusehop') });
lrDefEvent('fuseboom', { sound: (f, at) => at('fuseboom'), shake: (f, me) => { const d = Math.hypot(f.x - me.x, f.z - me.z); return d < 6 ? 0.35 * (1 - d / 6) : 0; } });
lrDefEvent('fusebounce', { sound: (f, at) => at('fusebounce') });
lrDefEvent('fusedet', { sound: (f, at) => at('fusedet') });
lrDefEvent('fusemineset', { sound: (f, at) => at('fusemineset') });
lrDefEvent('fuseminego', { sound: (f, at) => at('fuseminego', 1.3), shake: (f, me) => Math.hypot(f.x - me.x, f.z - me.z) < 8 ? 0.5 : 0 });
lrDefEvent('fuseshipgo', { sound: (f, at) => at('fuseshipgo', 1.3) });
lrDefEvent('fuseshipboom', { sound: (f, at) => at('fuseshipboom', 1.6), shake: (f, me) => { const d = Math.hypot(f.x - me.x, f.z - me.z); return d < 20 ? 0.9 * (1 - d / 25) : 0; } });
lrDefSnd('fusemortar', (v, e, rec, o) => { if (!rec('netmortar', 0.6 * v, { rate: 1.3 })) noise('lowpass', 700, 0.9, 0.002, 0.45 * v, 0.22, o); tone(95, 'sine', 0.002, 0.3 * v, 0.18, { to: 55, pan: e.pan }); });
lrDefSnd('fuseboom', (v, e, rec, o) => { if (!rec('explode', 0.55 * v, { rate: 1.25 })) noise('lowpass', 520, 0.8, 0.002, 0.5 * v, 0.4, o); tone(70, 'sine', 0.004, 0.25 * v, 0.3, { to: 40, pan: e.pan }); });
lrDefSnd('fusebounce', (v, e, rec) => { if (!rec('caskthud', 0.35 * v, { rate: 1.8 })) tone(240, 'square', 0.001, 0.06 * v, 0.06, { to: 160, pan: e.pan }); });
lrDefSnd('fusedet', (v, e, rec, o) => { tone(1600, 'square', 0.001, 0.05 * v, 0.03, { pan: e.pan }); noise('highpass', 3500, 1, 0.005, 0.12 * v, 0.18, o); });
lrDefSnd('fusehop', (v, e, rec, o) => { if (!rec('explode', 0.45 * v, { rate: 1.6 })) noise('lowpass', 900, 0.8, 0.002, 0.4 * v, 0.3, o); noise('bandpass', 600, 1, 0.05, 0.2 * v, 0.5, o); });
lrDefSnd('fusemineset', (v, e, rec) => { if (!rec('chock', 0.6 * v, { rate: 0.8 })) tone(160, 'square', 0.001, 0.15 * v, 0.12, { pan: e.pan }); tone(900, 'triangle', 0.002, 0.05 * v, 0.08, { delay: 0.25, pan: e.pan }); });
lrDefSnd('fuseminego', (v, e, rec, o) => { if (!rec('explode', 0.8 * v)) noise('lowpass', 400, 0.8, 0.002, 0.7 * v, 0.6, o); if (!rec('splash', 0.6 * v, { delay: 0.05 })) noise('bandpass', 1500, 0.6, 0.05, 0.3 * v, 0.9, o); });
lrDefSnd('fuseshipgo', (v, e, rec, o) => { if (!rec('fireroar', 0.7 * v)) noise('bandpass', 500, 0.7, 0.05, 0.4 * v, 1.0, o); if (!rec('creak', 0.4 * v)) tone(120, 'sawtooth', 0.05, 0.05 * v, 0.6, { pan: e.pan }); });
lrDefSnd('fuseshipboom', (v, e, rec, o) => { const w = Math.max(v, 0.4); if (!rec('cannon', 0.9 * w)) noise('lowpass', 380, 0.7, 0.002, 0.9 * w, 1.0, o); if (!rec('explode', 0.9 * w, { delay: 0.06 })) noise('lowpass', 600, 0.8, 0.002, 0.6 * w, 0.8, o); rec('debris', 0.5 * w, { delay: 0.3 }); tone(45, 'sine', 0.01, 0.5 * w, 1.0, { pan: e.pan }); });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
// a bomb (a black iron ball, a band and a fuse) into a batch at (x, y, z), radius r, its spark into the glow batch G
function lrhFuseBall(L, G, x, y, z, r, band) {
  L.add('sph:10', 0x1c1c20, x, y, z, 0, 0, 0, r);
  if (band != null) L.add('cyl:12', band, x, y, z, 0, 0, 0, r * 1.03, r * 0.28, r * 1.03);
  L.add('cyl:6', LRH_IRON, x, y + r * 0.95, z, 0, 0, 0, r * 0.3, r * 0.3, r * 0.3);
  L.add('cyl:4', 0x8a7a5a, x + r * 0.15, y + r * 1.35, z, 0, 0, -0.5, r * 0.08, r * 0.6, r * 0.08);
  if (G) G.add('sph:6', 0xffb040, x + r * 0.35, y + r * 1.6, z, 0, 0, 0, r * 0.16);
}
// a spiked sea mine into a batch: an iron ball with horns all round and on top, a band in the crew's colour, a lamp
function lrhFuseMineB(L, G, x, y, z, r, band, lamp) {
  L.add('sph:12', 0x2a2c30, x, y, z, 0, 0, 0, r);
  L.add('cyl:14', band, x, y, z, 0, 0, 0, r * 1.04, r * 0.3, r * 1.04);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, e = k % 2 ? 0.45 : -0.15; L.add('cone:6', 0x4a4c52, x + Math.cos(a) * Math.cos(e) * r * 1.05, y + Math.sin(e) * r * 1.05, z + Math.sin(a) * Math.cos(e) * r * 1.05, 0, -a, -Math.PI / 2 + e, r * 0.16, r * 0.5, r * 0.16); }
  L.add('cone:6', 0x4a4c52, x, y + r * 1.1, z, 0, 0, 0, r * 0.16, r * 0.5, r * 0.16);
  if (G && lamp != null) G.add('sph:6', lamp, x, y + r * 0.55, z - r * 0.85, 0, 0, 0, r * 0.14);
}
// ---------- Fuse: the powder monkey with the swivel mortar ----------
function lrhFuse(team) {
  const m = lrhRig('fuse', team), TC = m.TC, t = m.team;
  const s1 = t ? TC.main : TC.trim, s2 = t ? 0x2a2522 : 0xece2c8, cap = t ? 0x2a2522 : TC.main, capB = t ? TC.main : TC.trim, bob = t ? TC.main : 0xece2c8;
  const breech = 0x8a7656, soot = 0x2a2624, skin = 0xc8967a, hand = 0x8a6450, hair = 0xc0602a, kerch = t ? 0xe0c070 : 0xb83428;
  lrhLegs(m, 0.09, 0.42, 0.4, (L, S, s, a, b) => {
    L.L.add('cyl:8:1.2', breech, 0, -a / 2, 0, 0, 0, 0, 0.068, a, 0.068);
    L.L.add('cyl:8', 0x6e5c40, 0, -a + 0.03, 0, 0, 0, 0, 0.074, 0.07, 0.074);           // breeches rolled at the knee
    L.L.add('box', 0x5a4a34, s * 0.06, -a * 0.5, -0.03, 0, 0, 0, 0.02, 0.1, 0.06);       // a patch
    S.L.add('cyl:6:1.25', skin, 0, -b * 0.42, 0, 0, 0, 0, 0.042, b * 0.8, 0.042);        // bare, sooty shins
    S.L.add('cyl:6', soot, 0, -b * 0.55, -0.005, 0, 0, 0, 0.044, 0.06, 0.044);
    S.L.add('cyl:8', 0x4a3424, 0, -b + 0.12, 0, 0, 0, 0, 0.058, 0.08, 0.058);            // the ankle boots
    S.L.add('box', 0x3a2a1e, 0, -b + 0.05, -0.04, 0, 0, 0, 0.1, 0.1, 0.21);
    S.L.add('box', 0x1e1814, 0, -b - 0.005, -0.05, 0, 0, 0, 0.11, 0.025, 0.23);
  });
  const hp = m.P(m.hips);
  hp.L.add('cyl:10', breech, 0, -0.02, 0, 0, 0, 0, 0.14, 0.14, 0.105);
  hp.L.add('cyl:10', LRH_LEATH, 0, 0.045, 0, 0, 0, 0, 0.145, 0.045, 0.11);
  hp.L.add('box', LRH_BRASS, 0, 0.045, -0.11, 0, 0, 0, 0.05, 0.04, 0.015);
  // the powder horn on his left hip, slung from the belt
  hp.L.add('cone:8', 0xe4d6b2, -0.16, -0.06, -0.05, 0.2, 0, -2.2, 0.04, 0.24, 0.04);
  hp.L.add('cyl:8', LRH_BRASS, -0.06, -0.01, -0.04, 0, 0, -2.2 + Math.PI / 2, 0.045, 0.03, 0.045);
  hp.L.add('cyl:5', LRH_BRASS, -0.25, -0.12, -0.06, 0, 0, -2.2, 0.012, 0.05, 0.012);
  hp.L.add('box', LRH_LEATH, -0.12, 0.0, -0.06, 0, 0, 0.6, 0.012, 0.14, 0.012);
  m.spine = lrhNode(m.hips, 0, 0.05, 0, 'spine');
  const sp = m.P(m.spine);
  // the striped jersey, in the crew's colours, a little wider at the chest
  for (let k = 0; k < 7; k++) { const w = 0.132 + k * 0.005; sp.L.add('cyl:10', k % 2 ? s2 : s1, 0, 0.035 + k * 0.064, 0, 0, 0, 0, w, 0.064, w * 0.74); }
  sp.L.add('sph:10', s1, 0, 0.45, 0, 0, 0, 0, 0.17, 0.07, 0.12);
  // the neckerchief, knotted at the throat
  sp.L.add('tor:10:0.5', kerch, 0, 0.5, 0, Math.PI / 2, 0, 0, 0.065, 0.065, 0.11);
  sp.L.add('cone:3', kerch, 0.02, 0.44, -0.11, 0.25, 0, Math.PI + 0.2, 0.04, 0.08, 0.02);
  // the bandolier of bombs from his left shoulder to his right hip, and the strap round the back
  sp.L.add('box', LRH_LEATH, 0, 0.26, -0.112, 0, 0, -0.85, 0.045, 0.52, 0.02);
  sp.L.add('box', LRH_LEATH, 0, 0.26, 0.112, 0, 0, 0.85, 0.045, 0.52, 0.02);
  for (let k = 0; k < 5; k++) { const f = (k + 0.5) / 5, x = lrhLerp(-0.14, 0.15, f), y = lrhLerp(0.44, 0.07, f); lrhFuseBall(sp.L, null, x, y, -0.135 - Math.sin(f * Math.PI) * 0.012, 0.034, k % 2 ? TC.main : null); }
  m.head = lrhNode(m.spine, 0, 0.5, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('cyl:8', skin, 0, 0.03, 0, 0, 0, 0, 0.045, 0.07, 0.045);
  hd.L.add('sph:12', skin, 0, 0.13, -0.005, 0, 0, 0, 0.092, 0.108, 0.098);
  // the soot: a black band across the eyes from ear to ear, and smudges down the cheeks and chin
  hd.L.add('sph:12', soot, 0, 0.145, -0.012, 0, 0, 0, 0.096, 0.042, 0.094);
  for (const s of [-1, 1]) hd.L.add('sph:6', soot, s * 0.045, 0.098, -0.07, 0, 0, s * 0.3, 0.035, 0.03, 0.03);
  hd.L.add('sph:6', soot, 0.01, 0.055, -0.072, 0, 0, 0, 0.04, 0.022, 0.03);
  // bright eyes in it, a wide grin, a snub nose, ears that stick out
  for (const s of [-1, 1]) { hd.G.add('sph:8', 0xfaf6ea, s * 0.035, 0.146, -0.101, 0, 0, 0, 0.025, 0.019, 0.012); hd.L.add('sph:6', 0x3a2410, s * 0.033, 0.145, -0.112, 0, 0, 0, 0.01, 0.011, 0.005); hd.L.add('sph:6', skin, s * 0.095, 0.13, 0, 0, 0, 0, 0.022, 0.032, 0.015); }
  hd.L.add('box', 0x4a1a14, 0, 0.08, -0.092, 0, 0, 0, 0.052, 0.02, 0.012);
  hd.G.add('box', 0xf2ecdc, 0, 0.084, -0.098, 0, 0, 0, 0.044, 0.01, 0.006);
  hd.L.add('sph:6', 0xb88066, 0, 0.115, -0.1, 0, 0, 0, 0.018, 0.016, 0.016);
  // ginger tufts out from under the cap
  for (const [x, y, z, rz] of [[-0.08, 0.17, 0.02, 0.9], [0.085, 0.17, 0.0, -0.9], [-0.05, 0.16, 0.08, 0.5], [0.04, 0.155, 0.085, -0.4], [0.0, 0.15, 0.095, 0]]) hd.L.add('cone:4', hair, x, y, z, 0.4, 0, rz, 0.03, 0.07, 0.03);
  // the knitted stocking cap in the crew's colour: a rolled brim, the crown, a long tail flopped back with its bobble
  hd.L.add('cyl:12:0.85', cap, 0, 0.215, 0.0, 0, 0, 0, 0.1, 0.09, 0.104);
  hd.L.add('tor:12:0.35', capB, 0, 0.18, 0.0, Math.PI / 2, 0, 0, 0.1, 0.104, 0.12);
  hd.L.add('cone:8', cap, 0, 0.27, 0.07, -1.9, 0, 0, 0.075, 0.2, 0.075);
  hd.L.add('sph:8', bob, 0, 0.23, 0.2, 0, 0, 0, 0.045);
  // goggles pushed up on the brim
  for (const s of [-1, 1]) { hd.L.add('tor:10:0.3', LRH_BRASS, s * 0.035, 0.205, -0.098, 0.25, 0, 0, 0.026); hd.G.add('cyl:10', 0x9ad0e0, s * 0.035, 0.205, -0.1, Math.PI / 2 + 0.25, 0, 0, 0.022, 0.006, 0.022); }
  hd.L.add('box', LRH_LEATH, 0, 0.205, -0.094, 0.25, 0, 0, 0.19, 0.012, 0.008);
  lrhArms(m, 0.175, 0.44, 0, 0.27, 0.25, (A, F, Hn, s, a, b) => {
    A.L.add('sph:8', s1, 0, -0.01, 0, 0, 0, 0, 0.058, 0.058, 0.058);
    A.L.add('cyl:8', s2, 0, -a * 0.3, 0, 0, 0, 0, 0.048, a * 0.32, 0.048);
    A.L.add('cyl:8', s1, 0, -a * 0.62, 0, 0, 0, 0, 0.047, a * 0.32, 0.047);
    A.L.add('cyl:8', s2, 0, -a + 0.02, 0, 0, 0, 0, 0.054, 0.06, 0.054);               // the sleeve rolled to the elbow
    F.L.add('cyl:6:1.2', skin, 0, -b / 2, 0, 0, 0, 0, 0.034, b, 0.034);
    F.L.add('cyl:6', soot, 0, -b * 0.8, 0, 0, 0, 0, 0.037, 0.06, 0.037);
    Hn.L.add('box', hand, 0, -0.035, 0, 0, 0, 0, 0.045, 0.07, 0.055);
  });
  // the swivel mortar, braced on his right hip: a short fat brass barrel with a flared mouth, bands in the crew's colour,
  // on an iron fork with a pin; a wooden tiller back under his arm, and the slow-match glowing at the touch-hole
  m.gun = lrhNode(m.spine, 0.13, 0.13, -0.14, 'gun');
  const gn = m.P(m.gun);
  gn.L.add('box', LRH_WOOD, 0, -0.03, 0.12, 0, 0, 0, 0.045, 0.055, 0.3);
  gn.L.add('box', LRH_WOOD, 0, -0.06, 0.26, -0.45, 0, 0, 0.055, 0.1, 0.08);
  gn.L.add('box', LRH_IRON, 0, -0.035, 0.04, 0, 0, 0, 0.05, 0.03, 0.06);
  for (const s of [-1, 1]) gn.L.add('box', LRH_IRON, s * 0.08, -0.01, -0.07, 0, 0, 0, 0.02, 0.1, 0.05);
  gn.L.add('cyl:8', LRH_IRON, 0, -0.0, -0.07, 0, 0, Math.PI / 2, 0.016, 0.18, 0.016);
  gn.L.add('cyl:8', LRH_IRON, 0, -0.06, -0.07, 0, 0, 0, 0.02, 0.06, 0.02);
  gn.L.add('sph:10', LRH_BRASS, 0, 0.0, 0.0, 0, 0, 0, 0.07, 0.07, 0.07);
  gn.L.add('cyl:12', LRH_BRASS, 0, 0.0, -0.17, Math.PI / 2, 0, 0, 0.072, 0.32, 0.072);
  gn.L.add('cyl:12:1.4', LRH_BRASS, 0, 0.0, -0.37, -Math.PI / 2, 0, 0, 0.074, 0.1, 0.074);
  gn.L.add('cyl:12', 0x0c0a08, 0, 0.0, -0.418, Math.PI / 2, 0, 0, 0.082, 0.006, 0.082);
  for (const z of [-0.09, -0.28]) gn.L.add('cyl:12', TC.main, 0, 0.0, z, Math.PI / 2, 0, 0, 0.078, 0.035, 0.078);
  gn.L.add('cyl:5', 0x6a5a40, 0.03, 0.07, 0.0, 0, 0, -0.6, 0.008, 0.06, 0.008);
  gn.G.add('sph:6', 0xff8a30, 0.05, 0.095, 0.0, 0, 0, 0, 0.014);
  m.muzzle = lrhNode(m.gun, 0, 0.0, -0.44, 'muzzle');
  // in his left hand: a bomb (reloading), the sea mine (setting it), the match (the fire ship)
  m.bomb = lrhNode(m.handL, 0, -0.08, 0); { const B = m.P(m.bomb); lrhFuseBall(B.L, B.G, 0, 0, 0, 0.06, TC.main); } m.bomb.visible = false;
  m.mine = lrhNode(m.handL, 0, -0.12, 0); { const B = m.P(m.mine); lrhFuseMineB(B.L, B.G, 0, 0, 0, 0.09, TC.main, 0xff5030); } m.mine.visible = false;
  m.match = lrhNode(m.handL, 0, -0.07, 0); { const B = m.P(m.match); B.L.add('cyl:5', 0x6a4a2a, 0, 0, 0, 0, 0, 0, 0.01, 0.2, 0.01); B.G.add('sph:6', 0xffd060, 0, -0.11, 0, 0, 0, 0, 0.022); } m.match.visible = false;
  m.matchGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xff9a30, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.matchGlow.position.set(0, -0.11, 0); m.matchGlow.scale.setScalar(0.5); m.match.add(m.matchGlow);
  m.anim = lrhAnimFuse;
  return m.finish();
}

function lrhAnimFuse(m, pose, dt) {
  lrhBase(m, pose, dt);
  const act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, st = m.st, gun = m.gun;
  const V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() });
  const rec = pose.fire != null && pose.fire >= 0 && pose.fire < 0.3 ? 1 - pose.fire / 0.3 : 0, run = Math.min(1, st.run);
  // braced on the hip and tipped up to lob, more as he looks up; a kick up and back as it fires
  gun.position.set(0.13, 0.13 + Math.max(0, p) * 0.08 - run * 0.02, -0.14 + rec * 0.06);
  gun.rotation.set(0.3 + p * 0.55 + rec * 0.4 - run * 0.12, -0.05, 0, 'YXZ');
  m.spine.rotation.x += p * 0.12 - rec * 0.1; m.spine.rotation.y -= 0.14;
  m.head.rotation.x = p * 0.6 - m.spine.rotation.x; m.head.rotation.y = 0.12;
  let TR = lrhAt(gun, 0, -0.04, 0.16, V.a), TL = lrhAt(gun, -0.01, -0.07, -0.18, V.b);
  m.bomb.visible = false; m.mine.visible = false; m.match.visible = false;
  // reloading: the mouth tipped up, a bomb from the bandolier and down the barrel, again and again
  if (pose.reload > 0) {
    const u = 1 - lrhClamp(pose.reload / 1.6, 0, 1), c = (u * 2.5) % 1;
    gun.rotation.set(1.05, -0.1, 0.1, 'YXZ'); gun.position.set(0.12, 0.08, -0.1); TR = lrhAt(gun, 0, -0.04, 0.16, V.a);
    const from = V.c.set(-0.08, 0.3, -0.15), to = lrhAt(gun, 0, 0.08, -0.46, V.b);
    TL = c < 0.5 ? from.lerp(to, lrhSm(0.05, 0.45, c)) : to.lerp(from, lrhSm(0.55, 0.95, c));
    m.bomb.visible = c < 0.5; m.head.rotation.x -= 0.2;
  }
  // Powder Hop: a crouch, then thrown up with his knees tucked and his free arm flung out
  if (k === 'a1' && t < 0.8) {
    const c = 1 - lrhSm(0, 0.12, t), u = lrhSm(0.05, 0.2, t) * (1 - lrhSm(0.6, 0.8, t));
    m.hips.position.y -= 0.12 * c;
    m.legL.rotation.x = lrhLerp(m.legL.rotation.x, 1.1, u); m.legR.rotation.x = lrhLerp(m.legR.rotation.x, 0.7, u);
    m.shinL.rotation.x = lrhLerp(m.shinL.rotation.x, -1.7, u); m.shinR.rotation.x = lrhLerp(m.shinR.rotation.x, -1.5, u);
    m.spine.rotation.x -= 0.2 * u; TL = TL.lerp(V.d.set(-0.42, 0.62, 0.05), u); m.head.rotation.x += 0.2 * u;
  }
  // Short Fuse: a tug on the lanyard
  if (k === 'alt' && t < 0.3) TL = TL.lerp(V.d.set(-0.15, 0.2, 0.05), Math.sin(t / 0.3 * Math.PI));
  // the sea mine: swung back and lobbed underarm
  if (k === 'a2' && t < 0.5) {
    const w = lrhSm(0, 0.2, t), th = lrhSm(0.2, 0.34, t), back = lrhSm(0.36, 0.5, t);
    m.mine.visible = t < 0.3;
    TL = V.d.set(lrhLerp(lrhLerp(-0.2, -0.24, w), -0.12, th), lrhLerp(lrhLerp(0.12, 0.0, w), 0.3, th), lrhLerp(lrhLerp(-0.1, 0.22, w), -0.42, th)).lerp(TL, back);
    m.spine.rotation.x -= 0.15 * (w - th); m.spine.rotation.y += 0.25 * w * (1 - th);
  }
  // the fire ship: the match struck and held up, then flung forward at it
  if (k === 'ult' && t < 1.0) {
    const up = lrhSm(0, 0.25, t), fl = lrhSm(0.4, 0.6, t), back = lrhSm(0.8, 1.0, t);
    m.match.visible = t < 0.7; m.matchGlow.material.opacity = 0.6 + Math.random() * 0.4;
    TL = TL.lerp(V.d.set(lrhLerp(-0.12, -0.2, fl), lrhLerp(0.55, 0.42, fl), lrhLerp(-0.2, -0.55, fl)), up * (1 - back));
    m.spine.rotation.x -= 0.25 * fl * (1 - back); m.head.rotation.x -= 0.15 * up * (1 - back);
  }
  if (lrhDead(m, pose, 1)) { TL = V.c.set(-0.45, 0.3, 0.15); TR = V.d.set(0.45, 0.25, 0.2); gun.rotation.set(-0.6, 0.3, 0.6, 'YXZ'); }
  lrhHands(m, TL, TR);
}

// the mortar in first person, on the right hip at the bottom of the view; his left hand under the barrel. (The parts in
// the crew's colours are built for both crews, and those of the side he's on shown.)
function lrhFuseView(V) {
  const { root, mk, B, flashSpr } = V; let muzzle, anim, flash;
  const gun = mk(root, 0.25, -0.25, -0.42), b = B(gun);
  b.L.add('box', LRH_WOOD, 0.0, -0.05, 0.16, -0.25, 0, 0, 0.045, 0.05, 0.3);
  b.L.add('box', LRH_IRON, 0, -0.035, 0.03, 0, 0, 0, 0.05, 0.03, 0.06);
  for (const s of [-1, 1]) b.L.add('box', LRH_IRON, s * 0.07, -0.015, -0.05, 0, 0, 0, 0.018, 0.08, 0.045);
  b.L.add('cyl:8', LRH_IRON, 0, -0.01, -0.05, 0, 0, Math.PI / 2, 0.013, 0.16, 0.013);
  b.L.add('sph:10', LRH_BRASS, 0, 0, 0.02, 0, 0, 0, 0.062);
  b.L.add('cyl:14', LRH_BRASS, 0, 0, -0.13, Math.PI / 2, 0, 0, 0.062, 0.28, 0.062);
  b.L.add('cyl:14:1.4', LRH_BRASS, 0, 0, -0.31, -Math.PI / 2, 0, 0, 0.064, 0.09, 0.064);
  b.L.add('cyl:14', 0x0c0a08, 0, 0, -0.354, Math.PI / 2, 0, 0, 0.072, 0.006, 0.072);
  b.L.add('cyl:5', 0x6a5a40, 0.025, 0.065, 0.02, 0, 0, -0.6, 0.007, 0.05, 0.007);
  b.G.add('sph:6', 0xff8a30, 0.042, 0.088, 0.02, 0, 0, 0, 0.011);
  const bands = [0, 1].map(tm => { const n = mk(gun, 0, 0, 0), c = B(n), col = LRH_TEAM[tm].main; for (const z of [-0.06, -0.23]) c.L.add('cyl:14', col, 0, 0, z, Math.PI / 2, 0, 0, 0.067, 0.03, 0.067); return n; });
  // his hands: the right on the tiller, the left under the barrel; striped cuffs in the crew's colours
  const hR = mk(gun, 0.0, -0.06, 0.2), r = B(hR); r.L.add('box', 0x8a6450, 0.01, 0, 0, 0, 0, 0, 0.05, 0.06, 0.08); r.L.add('cyl:8', 0xc8967a, 0.03, -0.05, 0.13, 1.1, 0, 0, 0.035, 0.18, 0.035);
  const hL = mk(root, 0.13, -0.32, -0.5), l = B(hL); l.L.add('box', 0x8a6450, 0, 0, 0, 0.3, 0, 0, 0.06, 0.05, 0.08); l.L.add('cyl:8', 0xc8967a, -0.05, -0.06, 0.12, 1.0, 0.4, 0, 0.034, 0.22, 0.034); l.L.add('cyl:8', 0x2a2624, -0.035, -0.04, 0.07, 1.0, 0.4, 0, 0.037, 0.05, 0.037);
  const cuff = [0, 1].map(tm => { const n = mk(hL, 0, 0, 0), c = B(n), T = LRH_TEAM[tm], a = tm ? T.main : T.trim, z = tm ? 0x2a2522 : 0xece2c8; c.L.add('cyl:8', a, -0.085, -0.1, 0.2, 1.0, 0.4, 0, 0.043, 0.05, 0.043); c.L.add('cyl:8', z, -0.1, -0.12, 0.24, 1.0, 0.4, 0, 0.043, 0.05, 0.043); return n; });
  // what the left hand holds: a bomb (reloading), the mine, the match
  const ball = mk(hL, 0, 0.06, 0), bb = B(ball); lrhFuseBall(bb.L, bb.G, 0, 0, 0, 0.045, 0x8a2a20);
  const mine = mk(hL, 0, 0.08, -0.02), mb = B(mine); lrhFuseMineB(mb.L, mb.G, 0, 0, 0, 0.07, 0x5a5a5a, 0xff5030);
  const match = mk(hL, 0, 0.06, 0), ma = B(match); ma.L.add('cyl:5', 0x6a4a2a, 0, 0, 0, 0.3, 0, 0, 0.007, 0.14, 0.007); ma.G.add('sph:6', 0xffd060, 0, 0.075, -0.02, 0, 0, 0, 0.016);
  const mglow = flashSpr(0xff9a30, 0.12); mglow.position.set(0, 0.075, -0.02); match.add(mglow);
  muzzle = mk(gun, 0, 0, -0.36);
  flash = flashSpr(0xffb060, 0.35); flash.position.set(0, 0.02, -0.4); gun.add(flash);
  anim = (s, dt) => {
    const tm = typeof lrMe === 'function' && lrMe() ? lrMe().team : 0; bands[0].visible = cuff[0].visible = tm === 0; bands[1].visible = cuff[1].visible = tm === 1;
    const rec = s.fire != null && s.fire >= 0 && s.fire < 0.3 ? 1 - s.fire / 0.3 : 0, k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
    gun.position.set(0.25, -0.25 - rec * 0.02, -0.42 + rec * 0.06); gun.rotation.set(0.1 + rec * 0.22, 0.08, 0.03);
    hL.position.set(0.13, -0.32 - rec * 0.02, -0.5 + rec * 0.05); hL.rotation.set(0, 0, 0); ball.visible = mine.visible = match.visible = false;
    if (s.reload > 0) {
      const u = 1 - lrhClamp(s.reload / 1.6, 0, 1), c = (u * 2.5) % 1, q = lrhSm(0.05, 0.4, c) * (1 - lrhSm(0.6, 0.95, c));
      gun.rotation.set(0.42, 0.35, 0.3); gun.position.set(0.27, -0.31, -0.4); hL.position.set(lrhLerp(0.04, 0.16, q), lrhLerp(-0.32, -0.19, q), lrhLerp(-0.38, -0.6, q)); ball.visible = c < 0.55;
    }
    if (k === 'a1' && t < 0.8) { const q = lrhSm(0, 0.1, t) * (1 - lrhSm(0.5, 0.8, t)); gun.position.y -= 0.06 * q; gun.rotation.x -= 0.3 * q; hL.position.set(0.03, -0.3 + 0.04 * q, -0.45); }
    if (k === 'alt' && t < 0.3) hL.position.z += 0.08 * Math.sin(t / 0.3 * Math.PI);
    if (k === 'a2' && t < 0.5) { const w = lrhSm(0, 0.18, t), th = lrhSm(0.18, 0.32, t); mine.visible = t < 0.3; hL.position.set(lrhLerp(0.04, 0.07, th), lrhLerp(lrhLerp(-0.3, -0.38, w), -0.22, th), lrhLerp(lrhLerp(-0.45, -0.3, w), -0.7, th)); }
    if (k === 'ult' && t < 1.0) { const up = lrhSm(0, 0.25, t), fl = lrhSm(0.4, 0.6, t); match.visible = t < 0.7; mglow.material.opacity = 0.7 + Math.random() * 0.3; hL.position.set(lrhLerp(0.02, 0.06, fl), lrhLerp(lrhLerp(-0.32, -0.21, up), -0.2, fl), lrhLerp(-0.42, -0.72, fl)); }
    flash.material.opacity = rec > 0.7 ? (rec - 0.7) * 3.3 : 0; flash.material.rotation = Math.random() * 6;
  };
  return { muzzle, anim };
}
lrDefHeroArt('fuse', { spec: { h: 1.7, hipY: 0.86, stride: 1.6, spd: 5.9 }, model: lrhFuse, view: lrhFuseView, portraitY: 0.3 });

// the bomb in flight: a black ball turning over, its fuse fizzing, a thread of smoke behind
lrDefProjArt('fusebomb', (g, TC, add) => {
  const B = lrBatch(), G = lrBatch(); lrhFuseBall(B, G, 0, 0, 0, 0.13, TC.main);
  const ball = add(new THREE.Group()), mesh = B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })); ball.add(mesh); ball.add(G.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xffa040, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(0.32); sp.position.y = 0.2; ball.add(sp);
  const smoke = new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0x4a4440, transparent: true, opacity: 0.5, depthWrite: false });
  lrhTrailer(g, mesh, 6, smoke, 0.3); g.userData.point = false;
  g.children.forEach((c, i) => { if (c.isSprite) c.scale.setScalar(0.22 + i * 0.05); });
  const t0 = performance.now(), ob = mesh.onBeforeRender;
  mesh.onBeforeRender = (...a) => { const T = (performance.now() - t0) / 1000; ball.rotation.set(T * 9, 0, T * 5); sp.scale.setScalar(0.26 + Math.random() * 0.14); ob.apply(mesh, a); };
});
// the sea mine where it's set: half sunk, horned, its lamp blinking slow (and quick until it's armed), a faint ring
// where it reaches
lrDefZoneArt('fusemine', (g, TC, spr) => {
  const B = lrBatch(); lrhFuseMineB(B, null, 0, 0.12, 0, 0.26, TC.main, null);
  B.add('cyl:12', 0x4a4038, 0, 0.01, 0, 0, 0, 0, 0.32, 0.03, 0.32);
  const mine = new THREE.Group(); mine.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); g.add(mine);
  const lamp = spr(TC.glow, 0.45, 0.9); lamp.position.set(0, 0.48, 0);
  const ring = lrhRingMesh(0.94, 1.0, TC.main, 0.25); g.add(ring);
  return (z, dt, T) => {
    ring.scale.setScalar(z.r || 2.5);
    const bl = T >= 0.6 ? (Math.sin(T * 3) > 0.6 ? 1 : 0.15) : (Math.sin(T * 25) > 0 ? 1 : 0.2);
    lamp.material.opacity = bl; lamp.scale.setScalar(0.3 + bl * 0.25); ring.material.opacity = 0.12 + 0.1 * bl;
    mine.rotation.y = Math.sin(T * 0.7) * 0.15; mine.position.y = Math.sin(T * 1.3) * 0.015;
  };
});
// the fire ship: a little skiff stuffed with powder kegs, a stubby mast with its sail ablaze, a strake in the crew's
// colour along each side, a pennant; flames and smoke streaming back
lrDefProjArt('fuseship', (g, TC, add) => {
  const B = lrBatch(), G = lrBatch();
  B.add('box', 0x5a3c24, 0, 0.25, 0, 0, 0, 0, 0.9, 0.36, 2.0);
  B.add('box', 0x4a3020, 0, 0.12, 0, 0, 0, 0, 0.7, 0.22, 1.9);
  B.add('cone:4', 0x5a3c24, 0, 0.25, -1.25, -Math.PI / 2, Math.PI / 4, 0, 0.64, 0.6, 0.26);
  B.add('box', 0x3a2618, 0, 0.32, 0.98, 0, 0, 0, 0.88, 0.4, 0.06);
  for (const s of [-1, 1]) { B.add('box', TC.main, s * 0.455, 0.36, 0, 0, 0, 0, 0.02, 0.08, 1.9); B.add('box', 0x2a1a10, s * 0.46, 0.43, 0, 0, 0, 0, 0.03, 0.03, 2.0); }
  for (const [x, z] of [[-0.2, -0.4], [0.2, -0.4], [0, 0.1], [-0.2, 0.55], [0.2, 0.55]]) { B.add('cyl:10', 0x6a4a2a, x, 0.52, z, 0, 0, 0, 0.16, 0.3, 0.16); B.add('cyl:10', LRH_IRON, x, 0.62, z, 0, 0, 0, 0.165, 0.03, 0.165); B.add('cyl:10', LRH_IRON, x, 0.42, z, 0, 0, 0, 0.165, 0.03, 0.165); }
  B.add('cyl:6', 0x3a2a1a, 0, 1.1, -0.15, 0, 0, 0, 0.035, 1.5, 0.035);
  B.add('box', 0x3a2a1a, 0, 1.5, -0.15, 0, 0, Math.PI / 2, 0.03, 0.9, 0.03);
  B.add('box', 0x2a1a10, 0, 1.2, -0.13, 0, 0, 0, 0.8, 0.6, 0.02);
  G.add('box', 0xff8a30, 0, 1.2, -0.12, 0, 0, 0, 0.6, 0.45, 0.01);
  const hull = add(new THREE.Group()), mesh = B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })); hull.add(mesh); hull.add(G.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  const pen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshBasicMaterial({ color: TC.main, side: THREE.DoubleSide })); pen.position.set(0, 1.85, 0.1); pen.rotation.y = Math.PI / 2; hull.add(pen);
  const fl = []; for (let k = 0; k < 12; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: k % 3 ? 0xff7a20 : 0xffc040, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); hull.add(s); fl.push({ s, x: (Math.random() - 0.5) * 0.7, y: 0.6 + Math.random() * 1.2, z: (Math.random() - 0.5) * 1.6, p: Math.random() * 6 }); }
  const smoke = new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0x2a2624, transparent: true, opacity: 0.55, depthWrite: false });
  lrhTrailer(g, mesh, 9, smoke, 0.6); g.userData.point = false;
  g.children.forEach((c, i) => { if (c.isSprite) c.scale.setScalar(0.9 + i * 0.25); });
  // (the group is turned to the way it goes; the hull is kept level whatever slope it climbs)
  const t0 = performance.now(), ob = mesh.onBeforeRender;
  mesh.onBeforeRender = (...a) => {
    const T = (performance.now() - t0) / 1000; hull.rotation.set(-g.rotation.x + Math.sin(T * 7) * 0.03, 0, Math.sin(T * 5) * 0.05); pen.rotation.y = Math.PI / 2 + Math.sin(T * 14) * 0.3;
    for (const f of fl) { const h = 0.7 + Math.abs(Math.sin(T * 9 + f.p)) * 0.7; f.s.position.set(f.x, f.y + h * 0.3, f.z + 0.2); f.s.scale.set(0.6 * h, 1.1 * h, 1); }
    ob.apply(mesh, a);
  };
});

// where a puff from the mortar comes from: in first person the view's muzzle (roughly), else the figure's hip
function lrhFuseFrom(o, side) {
  const me = typeof lrMe === 'function' ? lrMe() : null, cam = typeof LR3 !== 'undefined' ? LR3.cam : null;
  if (me && o.v === me.i && me.alive && cam && LRM.ph !== 'over') { const v = new THREE.Vector3(0.17, -0.12, -0.8).applyQuaternion(cam.quaternion).add(cam.position); return { x: v.x, y: v.y, z: v.z, fp: true }; }
  const yaw = o.yaw || 0; return { x: o.x - Math.sin(yaw) * 0.55 + Math.cos(yaw) * side, y: o.y + 0.15, z: o.z - Math.cos(yaw) * 0.55 - Math.sin(yaw) * side, fp: false };
}
lrDefFx('fusefire', (o, X) => {
  const { sprite, smoke } = X, a = lrhFuseFrom(o, 0.15), yaw = o.yaw || 0, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  sprite(a.x, a.y, a.z, 0xffd080, a.fp ? 0.35 : 0.7, 0.08);
  for (let k = 0; k < (a.fp ? 2 : 4); k++) sprite(a.x + fx * 0.2, a.y + 0.05, a.z + fz * 0.2, 0x8a8078, (a.fp ? 0.18 : 0.35) + Math.random() * 0.2, 0.7 + Math.random() * 0.4, fx * 1.2 + (Math.random() - 0.5), 0.8 + Math.random(), fz * 1.2 + (Math.random() - 0.5), 0.6, 0, true);
  if (!a.fp) smoke(a.x, a.y, a.z, 1, 0.4, 0.8, 0x6a625a);
});
lrDefFx('fuseboom', (o, X) => {
  const { sprite, burst, smoke, ring, gy } = X, r = o.r || 2.5, y = gy(o.x, o.z);
  sprite(o.x, o.y, o.z, 0xfff0c0, r * 1.1, 0.12, 0, 0, 0, r * 7); sprite(o.x, o.y, o.z, 0xff9a40, r * 0.9, 0.3, 0, 0.5, 0, r * 2);
  burst(o.x, o.y, o.z, 0xffa040, 10, r * 3, 0.3, 0.45, 2);
  for (let k = 0; k < 5; k++) { const a = Math.random() * 6.28, s = 3 + Math.random() * 4; sprite(o.x, o.y, o.z, 0x2a2420, 0.12, 0.7, Math.cos(a) * s, 4 + Math.random() * 4, Math.sin(a) * s, 0, 18); }
  smoke(o.x, o.y, o.z, 5, r * 0.7, 1.5, 0x3a3430); ring(o.x, y + 0.08, o.z, 0.3, r * 1.1, 0xffb060, 0.35, 0.7);
});
lrDefFx('fusebounce', (o, X) => { X.burst(o.x, o.y, o.z, 0xffc080, 4, 2, 0.1, 0.18); X.smoke(o.x, o.y, o.z, 1, 0.25, 0.5, 0x5a5450); });
lrDefFx('fusedet', (o, X) => { X.sprite(o.x, o.y + 0.1, o.z, 0xffd070, 0.3, 0.12); });
// Powder Hop: a flash and a ring of smoke at his feet, and grit thrown out
lrDefFx('fusehop', (o, X) => {
  const { sprite, ring, smoke, gy } = X, y = gy(o.x, o.z);
  sprite(o.x, y + 0.2, o.z, 0xffd080, 1.6, 0.12, 0, 0, 0, 8); ring(o.x, y + 0.08, o.z, 0.3, 2.6, 0xffb060, 0.4, 0.8);
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; sprite(o.x + Math.cos(a) * 0.4, y + 0.2, o.z + Math.sin(a) * 0.4, 0x7a7068, 0.5, 0.9, Math.cos(a) * 3.5, 0.6, Math.sin(a) * 3.5, 1.2, 0, true); }
  smoke(o.x, y + 0.2, o.z, 2, 0.6, 1.0, 0x4a4440);
});
// the mine thrown out in an arc (a dark ball on the line it takes, a spark with it) to where it's set, and a clank there
lrDefFx('fusemineset', (o, X) => {
  const { sprite, later, ring } = X, T = Math.max(0.25, Math.min(0.6, Math.hypot(o.x2 - o.x, o.z2 - o.z) / 22)), g = 20;
  const vx = (o.x2 - o.x) / T, vz = (o.z2 - o.z) / T, vy = (o.y2 + 0.15 - o.y + 0.5 * g * T * T) / T;
  sprite(o.x, o.y, o.z, 0x202024, 0.32, T, vx, vy, vz, 0, g, true); sprite(o.x, o.y, o.z, 0xff6040, 0.18, T, vx, vy, vz, 0, g);
  later.push([T, () => { ring(o.x2, o.y2 + 0.06, o.z2, 0.2, 1.0, 0xd8d0c0, 0.3, 0.6); X.smoke(o.x2, o.y2 + 0.1, o.z2, 2, 0.4, 0.7, 0x6a6058); }]);
});
// the mine going off: a flash, a spout of spray and grit, a ring of smoke
lrDefFx('fuseminego', (o, X) => {
  const { sprite, burst, smoke, ring } = X;
  sprite(o.x, o.y + 0.5, o.z, 0xfff0c0, 4, 0.14, 0, 0, 0, 22); burst(o.x, o.y + 0.4, o.z, 0xff9a40, 14, 7, 0.35, 0.5, 3);
  for (let k = 0; k < 12; k++) { const a = Math.random() * 6.28, s = Math.random() * 1.6; sprite(o.x + Math.cos(a) * 0.3, o.y + 0.3, o.z + Math.sin(a) * 0.3, k % 2 ? 0xd8e8f0 : 0x9aa8b0, 0.5 + Math.random() * 0.4, 1.0, Math.cos(a) * s, 9 + Math.random() * 5, Math.sin(a) * s, 0.8, 16, true); }
  smoke(o.x, o.y + 0.4, o.z, 6, 1.6, 1.8, 0x3a3430); ring(o.x, o.y + 0.08, o.z, 0.4, 4, 0xffc070, 0.45, 0.8);
});
lrDefFx('fuseshipgo', (o, X) => { const { sprite, smoke } = X; sprite(o.x, o.y + 0.8, o.z, 0xffb050, 2.2, 0.35, 0, 0.5, 0, 2); smoke(o.x, o.y + 0.5, o.z, 3, 0.8, 1.2, 0x3a3430); });
// the fire ship blowing up: a great flash, a fireball rising, burning wreck flung about, a wide ring of smoke
lrDefFx('fuseshipboom', (o, X) => {
  const { sprite, burst, smoke, ring, later, gy } = X, r = o.r || 6, y = gy(o.x, o.z);
  sprite(o.x, o.y + 0.5, o.z, 0xfff4d0, r * 1.4, 0.18, 0, 0, 0, r * 10);
  for (let k = 0; k < 6; k++) sprite(o.x + (Math.random() - 0.5) * 2, o.y + 0.6 + k * 0.3, o.z + (Math.random() - 0.5) * 2, k % 2 ? 0xff8a30 : 0xffc050, r * 0.5, 0.7 + k * 0.1, 0, 2.5 + k * 0.5, 0, r * 0.4);
  burst(o.x, o.y + 0.6, o.z, 0xff9a40, 20, r * 2.2, 0.5, 0.7, 3);
  for (let k = 0; k < 10; k++) { const a = Math.random() * 6.28, s = 4 + Math.random() * 6; sprite(o.x, o.y + 0.5, o.z, k % 2 ? 0xff7a20 : 0x3a2418, 0.3, 1.2, Math.cos(a) * s, 6 + Math.random() * 6, Math.sin(a) * s, 0, 18, !(k % 2)); }
  ring(o.x, y + 0.1, o.z, 0.5, r * 1.15, 0xffb060, 0.6, 0.85); ring(o.x, y + 0.12, o.z, 0.3, r * 0.8, 0xfff0c0, 0.3, 0.9);
  smoke(o.x, o.y + 0.5, o.z, 8, r * 0.6, 2.4, 0x2a2624);
  later.push([0.35, () => smoke(o.x, o.y + 2.5, o.z, 4, r * 0.5, 2.2, 0x3a3430)]);
});
