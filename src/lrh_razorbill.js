'use strict';
// The Lamp Road: Razorbill, the marksman. Her kit, her bot, her glass and crosshair, the tar pot and its pool, the
// broadside, their sounds and events, and (below) her art. A hero file as the guide at the top of src/lr.js has it.

// ---------- the play ----------
lrDefHero({
  id: 'razorbill', n: 'Razorbill', title: 'The Wrecker’s Eye', role: 'damage', hp: 200, spd: 6.0, r: 0.4, h: 1.8, mag: 18, reloadT: 1.5, ultCost: 1700,
  cd: { a1: 8, a2: 10, alt: 0 }, range: 70, botKeep: 9, zoom: 2, own: ['a1'],
  blurb: 'A lean marksman in a tarred oilskin with a long fowling piece. She picks people off from afar.',
  kit: {
    pri: ['Fowling Piece', 'Quick, accurate shots. Head shots do double.'],
    alt: ['Sight', 'Hold to aim through the glass: closer, and dead steady.'],
    a1: ['Gull’s Rise', 'Leap high into the air. Hold Space to glide down.'],
    a2: ['Tar Pot', 'Lob a pot of burning tar that leaves a pool that burns and slows.'],
    ult: ['Broadside', 'Mark a strip of ground ahead; a ship’s guns hammer it a moment later.'],
  },
  how: { gun: 'Fowling Piece', tar: 'Tar Pot', broadside: 'Broadside' },
  // the Fowling Piece: quick shots that spread a little as she keeps firing (none through the glass), double to the
  // head, weaker past 30 m
  fire(p, dt, I, H) {
    if (p.fireT > 0.25) p.spr = Math.max(0, p.spr - dt * 0.12);
    if (!(I.fire && p.fireT >= 0.14 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--;
    const sp = I.alt ? 0 : 0.006 + p.spr; p.spr = Math.min(0.045, p.spr + 0.005);
    const d = lrDir(p.yaw + (Math.random() - 0.5) * 2 * sp, p.pitch + (Math.random() - 0.5) * 2 * sp), ey = p.y + lrEyeH(p);
    const h = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 120 });
    lrFxPush('tracer', { x: p.x, y: ey - 0.15, z: p.z, x2: h.x, y2: h.y, z2: h.z, team: p.team, v: p.i, a: p.i });
    if (h.p) { const fall = h.t <= 30 ? 1 : h.t >= 50 ? 0.6 : 1 - 0.4 * (h.t - 30) / 20; lrHurt(h.p, 26 * fall * (h.head ? 2 : 1), p, 'gun', h.head); }
    else if (h.wall) lrWallHurt(h.wall, 26, p);
    else if (h.t < 120) lrFxPush('spark', { x: h.x, y: h.y, z: h.z });
  },
  // the Tar Pot, lobbed
  a2(p, dt, I, H) {
    if (!(I.a2 && p.cd.a2 <= 0)) return;
    p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    lrSpawnProj(p, 'tar', 24);
    lrFxPush('throw', { v: p.i, x: p.x, y: p.y + 1.5, z: p.z, w: 'tar' });
  },
  // Broadside: the strip where she looks (out to 45 m), kept in the town
  ult(p) {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    const d = lrDir(p.yaw, p.pitch), ey = p.y + lrEyeH(p), t = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 45, noBodies: true }).t;
    let x = p.x + d[0] * t, z = p.z + d[2] * t; if (t >= 45) { x = p.x + fx * 45 * Math.cos(Math.min(0.5, Math.abs(p.pitch))); z = p.z + fz * 45 * Math.cos(Math.min(0.5, Math.abs(p.pitch))); }
    const B = LR_MAP.bounds; x = lrClamp(x, B.x0 + 1, B.x1 - 1); z = lrClamp(z, B.z0 + 1, B.z1 - 1);
    lrAddZone({ k: 'broadside', team: p.team, owner: p.i, x, y: lrGround(x, z), z, r: 11, yaw: p.yaw, t: 1.4 });
    lrFxPush('broadside', { x, z, yaw: p.yaw, t: 1.4, team: p.team, v: p.i });
  },
  // through the glass she walks slower
  speed: (p, I) => I.alt ? 0.7 : 1,
  // (on whichever screen moves her) Gull's Rise: up eight metres, and the glide (holding jump) on the way down
  body(p, dt, I, H) { if (I.a1 && p.cd.a1 <= 0) { p.vy = Math.sqrt(2 * LR_G * 8); p.gnd = false; p.glide = true; p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 }; lrFxPush('rise', { x: p.x, y: p.y, z: p.z, v: p.i }); } },
  ownUse(p, k) { if (k === 'a1') lrLocalFx({ k: 'rise', x: p.x, y: p.y, z: p.z, v: p.i }); },
  ownHost(p, k, u) { p.glide = true; lrFxPush('rise', { x: u[2], y: u[3], z: u[4], v: p.i }); },
  // a guest's own shot: the tracer at once, to where it would go
  guestFire(p, I, H, ey) {
    if (!(I.fire && p.fireT >= 0.14 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--; LRM.shotAt = performance.now();
    const sp = I.alt ? 0 : 0.006, d2 = lrDir(p.yaw + (Math.random() - 0.5) * 2 * sp, p.pitch + (Math.random() - 0.5) * 2 * sp), h = lrRayHit(p.x, ey, p.z, d2[0], d2[1], d2[2], { team: p.team, skip: p.i, max: 120 });
    lrLocalFx({ k: 'tracer', x: p.x, y: ey - 0.15, z: p.z, x2: h.x, y2: h.y, z2: h.z, team: p.team, v: p.i, a: p.i });
  },
  // the bot: picks off the weakest in range, uses the glass at a distance, backs off from anyone close; the broadside
  // into a clump (best of all on the Wain), the tar on two together or on the Wain, the rise to get out or up
  botPick(p, foes) { const w = foes.filter(f => f.d < 40).sort((a, b) => a.q.hp - b.q.hp)[0]; return w && w.q.hp < 120 ? w : null; },
  botAlt: (p, ai, tg, d, S, hurt) => d > 22 && S.strafe >= 0.5 && !hurt,
  bot(p, ai, B) {
    const { S, I, tg, hpF, hurt, foes, C, at, mode } = B;
    if (p.ult >= 1) {
      // a clump of them, best of all on the Wain: the strip laid along the line to them
      for (const f of foes) { if (f.d > 44 || f.d < 8) continue; const yaw = Math.atan2(-(f.q.x - p.x), -(f.q.z - p.z)), fx = -Math.sin(yaw), fz = -Math.cos(yaw); const n = foes.filter(g => { const ox = g.q.x - f.q.x, oz = g.q.z - f.q.z; return Math.abs(ox * fx + oz * fz) < 10 && Math.abs(-ox * fz + oz * fx) < 3; }).length; if (n >= S.clump || (n >= 2 && Math.hypot(f.q.x - C.x, f.q.z - C.z) < 6)) { mode({ at: at(f.q, 0), press: 'ult', pressAt: LRM.t + 0.35 }); return; } }
    }
    if (p.cd.a2 <= 0 && tg && ai.tgtD > 5 && ai.tgtD < 26) { const n = foes.filter(g => Math.hypot(g.q.x - tg.x, g.q.z - tg.z) < 4.5).length; if (n >= 2 || Math.hypot(tg.x - C.x, tg.z - C.z) < 5) { mode({ at: at(tg, 0), lob: 24, press: 'a2', pressAt: LRM.t + 0.3 }); return; } }
    if (p.cd.a1 <= 0 && ((hurt && hpF < 0.45) || (tg && ai.tgtD > 18 && Math.random() < 0.12))) I.a1 = true;
  },
  // her crosshair: four ticks spread as her shots do; through the glass, fine cross hairs (the glass itself is the HUD's)
  cross(c, cx, cy, me, zoom) {
    if (zoom) { c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - 200, cy); c.lineTo(cx - 8, cy); c.moveTo(cx + 8, cy); c.lineTo(cx + 200, cy); c.moveTo(cx, cy + 8); c.lineTo(cx, cy + 200); c.moveTo(cx, cy - 200); c.lineTo(cx, cy - 8); c.stroke(); c.beginPath(); c.arc(cx, cy, 1.5, 0, 7); c.fill(); }
    else { const g = 5 + (me.spr || 0) * 600 + (me.fireT < 0.1 ? 3 : 0); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(cx + dx * g, cy + dy * g); c.lineTo(cx + dx * (g + 8), cy + dy * (g + 8)); c.stroke(); } c.beginPath(); c.arc(cx, cy, 1.4, 0, 7); c.fill(); }
  },
});
// the tar pot: lobbed; it bursts on whatever it meets (30 to a body it hits) and leaves a pool of 4 m for four seconds
lrDefProj('tar', { step(j, dt, M) {
  const l = lrLobLand(j, M); if (!l) return false;
  if (l.h.p) lrHurt(l.h.p, 30, M.a, 'tar');
  lrAddZone({ k: 'tar', team: j.team, owner: j.owner, x: l.x, y: l.y, z: l.z, r: 4, t: 4 }); lrFxPush('blast', { x: l.x, y: l.y + 0.3, z: l.z, r: 4, k2: 'tar' });
  return true;
} });
// the pool: burns (25 a second) and slows the other side
lrDefZone('tar', { touch(z, q, dt, a) { if (q.team !== z.team) { lrHurt(q, 25 * dt, a, 'tar', false, true); lrSlow(q, 0.7, 0.25, 'tar'); } } });
// the broadside's strip, 6 m by 22 along its yaw: when its time is up, 220 to everyone (and every wall) on it
lrDefZone('broadside', { turn: true, fix: { w: 6, l: 22 }, tick(z, dt, a) {
  if (z.t > 0) return;
  const fx = -Math.sin(z.yaw), fz = -Math.cos(z.yaw), rx = Math.cos(z.yaw), rz = -Math.sin(z.yaw);
  lrFxPush('volley', { x: z.x, z: z.z, yaw: z.yaw, team: z.team });
  for (const q of LRM.P) { if (!q.alive || q.team === z.team) continue; const ox = q.x - z.x, oz = q.z - z.z; if (Math.abs(ox * fx + oz * fz) <= z.l / 2 + q.r && Math.abs(ox * rx + oz * rz) <= z.w / 2 + q.r && q.y < z.y + 6) lrHurt(q, 220, a, 'broadside'); }
  for (const w of LRM.walls) { const ox = w.x - z.x, oz = w.z - z.z; if (Math.abs(ox * fx + oz * fz) <= z.l / 2 + 2 && Math.abs(ox * rx + oz * rz) <= z.w / 2 + 2) lrWallHurt(w, 220, a); }
} });
lrDefEvent('rise', { own: true, sound: (f, at) => at('rise') });
lrDefEvent('broadside', { sound: f => lrSnd('warn', f.x, 0, f.z, 1.4) });
lrDefEvent('volley', { sound: f => lrSnd('volley', f.x, 0, f.z, 1.5), shake: (f, me) => Math.hypot(f.x - me.x, f.z - me.z) < 30 ? 0.8 : 0 });
lrDefSnd('tar', (v, e, rec, o) => { if (!rec('splat', 0.8 * v)) noise('lowpass', 400, 0.8, 0.002, 0.5 * v, 0.4, o); noise('bandpass', 1800, 0.8, 0.05, 0.12 * v, 0.9, o); });
lrDefSnd('rise', (v, e, rec, o) => { if (!rec('gull', 0.5 * v)) tone(500, 'sine', 0.005, 0.12 * v, 0.3, { to: 1200, pan: e.pan }); noise('bandpass', 700, 1, 0.05, 0.2 * v, 0.5, o); });
lrDefSnd('warn', (v, e) => { if (typeof sfxHorn === 'function') sfxHorn(e.pan, 0.5 * v + 0.2); });
lrDefSnd('volley', (v, e, rec) => { for (let i = 0; i < 4; i++) if (!rec('cannon', 0.9 * Math.max(v, 0.35), { delay: i * 0.12 })) noise('lowpass', 500, 0.7, 0.002, 0.8 * Math.max(v, 0.35), 0.7, { pan: e.pan, delay: i * 0.12 }); });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
// ---------- Razorbill: the marksman in the tarred longcoat ----------
function lrhRazorbill(team) {
  const m = lrhRig('razorbill', team), TC = m.TC, t = m.team;
  const coat = t ? 0x241f1c : 0x22303e, coat2 = t ? 0x1a1614 : 0x1a2632, lapel = t ? TC.main : TC.trim, scarf = TC.main, breech = t ? 0x4a3c30 : 0x5a5044;
  lrhLegs(m, 0.11, 0.47, 0.46, (L, S, s, a, b) => {
    L.L.add('cyl:8:1.2', breech, 0, -a / 2, 0, 0, 0, 0, 0.075, a, 0.075);
    S.L.add('cyl:8:1.1', 0x1c1a18, 0, -b * 0.45, 0, 0, 0, 0, 0.07, b * 0.85, 0.07);   // sea boots
    S.L.add('cyl:8', 0x2a2622, 0, -0.04, 0, 0, 0, 0, 0.085, 0.1, 0.085);
    S.L.add('box', 0x1c1a18, 0, -b + 0.04, -0.06, 0, 0, 0, 0.11, 0.08, 0.26);
  });
  m.P(m.hips).L.add('cyl:10', breech, 0, -0.03, 0, 0, 0, 0, 0.14, 0.14, 0.1);
  m.spine = lrhNode(m.hips, 0, 0.05, 0, 'spine');
  const sp = m.P(m.spine);
  sp.L.add('cyl:10:1.25', coat, 0, 0.2, 0, 0, 0, 0, 0.16, 0.42, 0.12);
  sp.L.add('box', coat, 0, 0.36, 0, 0, 0, 0, 0.42, 0.16, 0.24);
  // lapels in the crew's colour, a sash across her, the scarf, a bandolier of cartridges
  for (const s of [-1, 1]) sp.L.add('box', lapel, s * 0.07, 0.28, -0.125, 0, 0, s * 0.25, 0.08, 0.3, 0.02);
  sp.L.add('box', TC.main, 0, 0.2, -0.01, 0, 0, 0.75, 0.07, 0.62, 0.27);
  sp.L.add('box', 0x3a2a1e, 0, 0.02, 0, 0, 0, 0, 0.36, 0.06, 0.26);
  sp.L.add('box', LRH_BRASS, 0, 0.02, -0.135, 0, 0, 0, 0.06, 0.05, 0.02);
  sp.L.add('tor:12:0.4', scarf, 0, 0.46, -0.01, Math.PI / 2, 0, 0, 0.12, 0.12, 0.16);
  sp.L.add('box', scarf, 0.05, 0.36, -0.14, 0.1, 0, 0.15, 0.08, 0.2, 0.03);
  for (let k = 0; k < 6; k++) sp.L.add('cyl:5', LRH_BRASS, -0.13 + k * 0.05, 0.34 - k * 0.055, -0.135, 0, 0, 0.75, 0.012, 0.05, 0.012);
  m.head = lrhNode(m.spine, 0, 0.5, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('sph:10', LRH_SKIN, 0, 0.11, -0.01, 0, 0, 0, 0.1, 0.12, 0.11);
  hd.L.add('box', 0x2a1e18, 0, 0.1, 0.07, 0, 0, 0, 0.18, 0.14, 0.06);      // hair tied back
  hd.L.add('sph:6', 0x2a1e18, 0, 0.06, 0.12, 0, 0, 0, 0.05, 0.07, 0.05);
  hd.L.add('box', 0x1a1210, 0, 0.12, -0.105, 0, 0, 0, 0.14, 0.02, 0.01);  // a hard brow
  hd.L.add('cone:4', 0xc89878, 0, 0.08, -0.12, -Math.PI / 2, Math.PI / 4, 0, 0.025, 0.05, 0.025);
  // the tricorn: three upturned sides, a band in the crew's colour, the razorbill's black and white feathers, goggles on the brim
  const hy = 0.22;
  hd.L.add('cyl:10', 0x161412, 0, hy + 0.04, 0, 0, 0, 0, 0.11, 0.09, 0.11);
  hd.L.add('cyl:10', TC.main, 0, hy + 0.005, 0, 0, 0, 0, 0.113, 0.025, 0.113);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + Math.PI; hd.L.add('box', 0x161412, Math.sin(a) * 0.14, hy + 0.03, Math.cos(a) * 0.14, -0.55, a, 0, 0.26, 0.1, 0.03); }
  hd.L.add('cyl:3', 0x161412, 0, hy - 0.005, 0, 0, Math.PI, 0, 0.24, 0.02, 0.24);
  hd.L.add('box', 0x101010, 0.08, hy + 0.16, 0.06, -0.5, 0, -0.35, 0.04, 0.24, 0.012);
  hd.L.add('box', 0xf0f0ec, 0.115, hy + 0.17, 0.05, -0.6, 0, -0.55, 0.035, 0.2, 0.012);
  hd.L.add('box', 0x101010, 0.12, hy + 0.15, 0.04, -0.62, 0, -0.6, 0.015, 0.14, 0.014);
  for (const s of [-1, 1]) { hd.L.add('cyl:10', LRH_BRASS, s * 0.045, hy + 0.05, -0.105, Math.PI / 2 - 0.4, 0, 0, 0.035, 0.03, 0.035); hd.G.add('cyl:10', 0x9ad0e0, s * 0.045, hy + 0.05, -0.12, Math.PI / 2 - 0.4, 0, 0, 0.026, 0.01, 0.026); }
  hd.L.add('box', 0x3a2a1e, 0, hy + 0.04, -0.1, 0, 0, 0, 0.2, 0.015, 0.01);
  lrhArms(m, 0.2, 0.42, 0, 0.3, 0.28, (A, F, H, s, a, b) => {
    A.L.add('sph:8', coat, 0, -0.01, 0, 0, 0, 0, 0.075, 0.07, 0.075);
    A.L.add('cyl:8:1.15', coat, 0, -a / 2, 0, 0, 0, 0, 0.055, a, 0.055);
    F.L.add('cyl:8:1.0', coat, 0, -b * 0.4, 0, 0, 0, 0, 0.05, b * 0.8, 0.05);
    F.L.add('cyl:8', lapel, 0, -b * 0.78, 0, 0, 0, 0, 0.068, 0.07, 0.068);     // turned-back cuffs
    H.L.add('box', 0x3a2a1e, 0, -0.04, 0, 0, 0, 0, 0.06, 0.09, 0.08);
  });
  // the coat's skirts, hung from the hips, that swing and flare
  m.coat = [];
  for (const [x, z, ry, w] of [[0, 0.09, 0, 0.3], [-0.12, -0.02, -Math.PI / 2 + 0.3, 0.2], [0.12, -0.02, Math.PI / 2 - 0.3, 0.2], [-0.07, -0.09, Math.PI - 0.15, 0.13], [0.07, -0.09, Math.PI + 0.15, 0.13]]) {
    const pv = lrhNode(m.hips, x, 0.06, z); pv.rotation.y = ry; const panel = lrhNode(pv, 0, 0, 0); const B = m.P(panel);
    B.L.add('box', coat2, 0, -0.33, 0.02, 0, 0, 0, w, 0.68, 0.025);
    B.L.add('box', lapel, 0, -0.66, 0.02, 0, 0, 0, w, 0.04, 0.03);
    m.coat.push(panel);
  }
  // the fowling piece: along -z, the butt at the shoulder (the origin), a long octagonal barrel, a brass sight-glass
  m.gun = lrhNode(m.spine, 0.1, 0.38, -0.05, 'gun');
  const gn = m.P(m.gun);
  gn.L.add('box', LRH_WOOD, 0, -0.04, 0.0, 0.12, 0, 0, 0.05, 0.11, 0.3);
  gn.L.add('box', LRH_WOOD, 0, -0.035, -0.34, 0, 0, 0, 0.045, 0.06, 0.48);
  gn.L.add('box', 0x2a2420, 0, -0.06, -0.14, 0.4, 0, 0, 0.04, 0.12, 0.05);
  gn.L.add('cyl:8', LRH_IRON, 0, 0.0, -0.75, Math.PI / 2, 0, 0, 0.018, 1.0, 0.018);
  gn.L.add('cyl:8', LRH_BRASS, 0, 0.0, -1.24, Math.PI / 2, 0, 0, 0.024, 0.04, 0.024);
  for (const z of [-0.2, -0.5]) gn.L.add('cyl:8', LRH_BRASS, 0, -0.01, z, Math.PI / 2, 0, 0, 0.032, 0.03, 0.032);
  gn.L.add('cyl:8', LRH_BRASS, 0, 0.05, -0.3, Math.PI / 2, 0, 0, 0.022, 0.32, 0.022);
  gn.L.add('box', LRH_BRASS, 0, -0.02, 0.14, 0, 0, 0, 0.055, 0.11, 0.02);
  gn.L.add('box', TC.main, 0, -0.03, 0.04, 0, 0, 0, 0.052, 0.04, 0.06);
  m.muzzle = lrhNode(m.gun, 0, 0, -1.28, 'muzzle');
  // the pot of tar (her left hand, while she throws) and the flare she calls the broadside with
  m.pot = lrhNode(m.handL, 0, -0.1, 0); { const B = m.P(m.pot); B.L.add('sph:8', 0x8a4a2a, 0, 0, 0, 0, 0, 0, 0.09, 0.1, 0.09); B.L.add('cyl:6', 0x6a3a22, 0, 0.09, 0, 0, 0, 0, 0.04, 0.05, 0.04); B.G.add('cone:5', 0xff8030, 0, 0.15, 0, 0, 0, 0, 0.035, 0.08, 0.035); } m.pot.visible = false;
  m.flare = lrhNode(m.handL, 0, -0.08, 0); { const B = m.P(m.flare); B.L.add('cyl:6', 0x8a2a1a, 0, 0, 0, 0, 0, 0, 0.022, 0.26, 0.022); B.G.add('sph:6', 0xff5030, 0, -0.15, 0, 0, 0, 0, 0.05); } m.flare.visible = false;
  m.flareGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xff5a30, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.flareGlow.position.set(0, -0.15, 0); m.flareGlow.scale.setScalar(0.9); m.flare.add(m.flareGlow);
  m.anim = lrhAnimRazorbill;
  return m.finish();
}

function lrhAnimRazorbill(m, pose, dt) {
  const b = lrhBase(m, pose, dt), act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3() }), st = m.st;
  const gun = m.gun, rec = pose.fire != null && pose.fire >= 0 && pose.fire < 0.12 ? 1 - pose.fire / 0.12 : 0;
  // shouldered and aimed, lowered a little while she runs
  const low = Math.min(1, st.run) * 0.4 * (pose.alt ? 0 : 1);
  gun.position.set(pose.alt ? 0.06 : 0.1, 0.38 - low * 0.12, -0.05 + rec * 0.05);
  gun.rotation.set(p - low * 0.6 + rec * 0.12, low * 0.35, 0, 'YXZ');
  m.spine.rotation.x += p * 0.2;
  m.head.rotation.x = p * 0.6 - m.spine.rotation.x;
  if (pose.alt) { m.head.rotation.z = -0.25; m.head.rotation.x -= 0.1; m.spine.rotation.y -= 0.12; }
  let TL = lrhAt(gun, 0, -0.04, -0.42, V.a), TR = lrhAt(gun, 0.0, -0.08, -0.1, V.b);
  if (pose.reload > 0) {
    const w = Math.sin(pose.reload * 9) * 0.04;
    gun.rotation.set(-0.5, 0.25, 0.55, 'YXZ'); gun.position.set(0.12, 0.3, -0.12);
    TR = lrhAt(gun, 0, -0.08, -0.1, V.b); TL = V.a.set(0.02 + w, 0.26, -0.3);
  }
  // the coat swings as she runs, flares as she glides
  let flare = 0;
  if ((k === 'a1' && !(pose.gnd !== false)) || pose.glide) flare = 1;
  st.flare = lrhLerp(st.flare || 0, flare, Math.min(1, dt * 6));
  const r = Math.min(1, st.run);
  m.coat.forEach((c, i) => {
    // (out is -x for a panel: its bottom swings away from her)
    const sw = i === 0 ? 0.35 * r + Math.abs(Math.sin(st.ph)) * 0.12 * r : i < 3 ? 0.1 * r : Math.max(0, i === 3 ? m.legL.rotation.x : m.legR.rotation.x) * 0.8;
    c.rotation.set(-(0.1 + sw + st.flare * (i === 0 ? 1.2 : 1.0) + st.air * 0.3), 0, 0);
  });
  if (k === 'a1' && t < 0.3) { const f = Math.sin(t / 0.3 * Math.PI); m.hips.position.y -= 0.18 * f; m.shinL.rotation.x -= 0.6 * f; m.shinR.rotation.x -= 0.6 * f; m.legL.rotation.x += 0.4 * f; m.legR.rotation.x += 0.4 * f; }
  if (st.flare > 0.05) {
    // gliding: arms out like wings, the piece held down in her right hand
    const f = st.flare;
    m.legL.rotation.x = lrhLerp(m.legL.rotation.x, -0.15, f); m.legR.rotation.x = lrhLerp(m.legR.rotation.x, -0.3, f); m.shinL.rotation.x = lrhLerp(m.shinL.rotation.x, -0.3, f); m.shinR.rotation.x = lrhLerp(m.shinR.rotation.x, -0.5, f);
    m.spine.rotation.x -= 0.25 * f;
    gun.position.lerp(V.b.set(0.45, 0.0, -0.1), f); gun.rotation.set(lrhLerp(gun.rotation.x, -1.2, f), 0, lrhLerp(0, 0.2, f), 'YXZ');
    TR = lrhAt(gun, 0, -0.08, -0.1, V.b);
    TL = V.a.set(-0.62, 0.42, 0.02);
  }
  // the tar pot: back over her shoulder, then lobbed
  m.pot.visible = k === 'a2' && t < 0.3;
  if (k === 'a2' && t < 0.6) {
    const w = lrhSm(0, 0.18, t), th = lrhSm(0.18, 0.32, t), back = lrhSm(0.35, 0.6, t);
    TL = V.a.set(lrhLerp(lrhLerp(-0.28, -0.3, w), -0.18, th), lrhLerp(lrhLerp(0.2, 0.62, w), 0.55, th), lrhLerp(lrhLerp(-0.1, 0.25, w), -0.5, th));
    if (back > 0) TL.lerp(lrhAt(gun, 0, -0.04, -0.42, V.b.clone()), back);
    m.spine.rotation.y += lrhLerp(lrhLerp(0, 0.35, w), -0.25, th) * (1 - back);
    TR = lrhAt(gun, 0.0, -0.08, -0.1, V.b);
  }
  // the broadside: the flare thrown up and pointed at the strip
  m.flare.visible = k === 'ult' && t < 1.4;
  if (m.flare.visible) {
    const f = lrhSm(0, 0.25, t) * (1 - lrhSm(1.2, 1.4, t));
    TL.lerp(V.a.set(-0.32, 0.85, -0.42), f);
    gun.position.lerp(V.b.set(0.3, 0.05, -0.1), f); gun.rotation.x = lrhLerp(gun.rotation.x, -1.0, f);
    TR = lrhAt(gun, 0, -0.08, -0.1, V.b);
    m.head.rotation.x += 0.25 * f;
  }
  if (lrhDead(m, pose, 1)) { TL = V.a.set(-0.5, 0.3, 0.1); TR = V.b.set(0.5, 0.2, 0.2); m.coat.forEach(c => c.rotation.set(0, 0, 0)); }
  lrhHands(m, TL, TR);
}

// the hands and the weapon in first person (V: what src/lrhero.js's lrViewModel gives a view to build in)
function lrhRazorbillView(V) {
  const { g, root, st, mk, B, flashSpr, lit, glow } = V; let muzzle, anim, flash = null;
  // the fowling piece, from low right out towards the middle; her right hand at the wrist of the stock, left under the barrel
  const gun = mk(root, 0.14, -0.15, -0.26), b = B(gun);
  b.L.add('box', LRH_WOOD, 0, -0.035, 0.1, 0.12, 0, 0, 0.045, 0.09, 0.28);
  b.L.add('box', LRH_WOOD, 0, -0.03, -0.22, 0, 0, 0, 0.04, 0.05, 0.42);
  b.L.add('cyl:8', LRH_IRON, 0, 0.0, -0.55, Math.PI / 2, 0, 0, 0.016, 0.82, 0.016);
  for (const z of [-0.08, -0.36]) b.L.add('cyl:8', LRH_BRASS, 0, -0.008, z, Math.PI / 2, 0, 0, 0.028, 0.025, 0.028);
  b.L.add('cyl:8', LRH_BRASS, 0, 0.0, -0.95, Math.PI / 2, 0, 0, 0.021, 0.03, 0.021);
  b.L.add('box', 0x2a2420, 0, -0.05, 0.0, 0.4, 0, 0, 0.035, 0.08, 0.04);
  b.L.add('box', LRH_IRON, 0.02, 0.02, -0.02, 0, 0, 0, 0.02, 0.04, 0.06);   // the lock
  // the sight-glass on top: brass tube, a ring at each end
  b.L.add('cyl:10', LRH_BRASS, 0, 0.045, -0.2, Math.PI / 2, 0, 0, 0.017, 0.3, 0.017);
  for (const z of [-0.06, -0.34]) b.L.add('cyl:10', 0x8a6a28, 0, 0.045, z, Math.PI / 2, 0, 0, 0.022, 0.015, 0.022);
  b.G.add('cyl:10', 0x9ad0e0, 0, 0.045, -0.052, Math.PI / 2, 0, 0, 0.014, 0.004, 0.014);
  const hR = mk(gun, 0.0, -0.06, 0.02), r = B(hR);
  r.L.add('box', 0x3a2a1e, 0.01, 0, 0, 0, 0, 0, 0.05, 0.07, 0.08); r.L.add('cyl:8', 0x22303e, 0.02, -0.03, 0.12, 1.1, 0, 0, 0.04, 0.2, 0.04);
  r.L.add('cyl:8', 0x3d7fb8, 0.02, -0.0, 0.05, 1.1, 0, 0, 0.045, 0.04, 0.045);
  const hL = mk(gun, -0.02, -0.06, -0.36), l = B(hL);
  l.L.add('box', 0x3a2a1e, -0.01, 0.0, 0, 0, 0, 0, 0.06, 0.05, 0.09); l.L.add('cyl:8', 0x22303e, -0.07, -0.08, 0.1, 1.0, 0.5, 0, 0.04, 0.24, 0.04);
  muzzle = mk(gun, 0, 0, -0.98);
  flash = flashSpr(0xffc070, 0.22); flash.position.set(0, 0, -1.02); gun.add(flash);
  anim = (s, dt) => {
    const rec = s.fire != null && s.fire >= 0 && s.fire < 0.12 ? 1 - s.fire / 0.12 : 0, aim = st.aim = lrhLerp(st.aim || 0, s.alt ? 1 : 0, Math.min(1, dt * 12));
    gun.position.set(lrhLerp(0.14, 0.0, aim), lrhLerp(-0.15, -0.088, aim), lrhLerp(-0.26, -0.12, aim) + rec * 0.045);
    gun.rotation.set(rec * 0.08 + lrhLerp(0.04, 0, aim), lrhLerp(0.06, 0, aim), lrhLerp(0.04, 0, aim));
    hL.position.set(-0.02, -0.06, -0.36); hL.visible = true;
    if (s.reload > 0) { const w = Math.sin(s.reload * 8) * 0.03; gun.rotation.set(-0.35, 0.3, 0.6); gun.position.set(0.16, -0.2, -0.3); hL.position.set(-0.02 + w, -0.06 - Math.abs(w), -0.08); }
    const k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
    if ((k === 'a2' && t < 0.5) || (k === 'ult' && t < 1.3)) { const q = k === 'a2' ? Math.sin(Math.min(1, t / 0.5) * Math.PI) : lrhSm(0, 0.2, t) * (1 - lrhSm(1.1, 1.3, t)); gun.position.y -= 0.12 * q; gun.rotation.x -= 0.4 * q; hL.visible = q < 0.3; }
    flash.material.opacity = rec > 0.6 ? (rec - 0.6) * 2.5 : 0; flash.material.rotation = Math.random() * 6;
  };
  return { muzzle, anim };
}
lrDefHeroArt('razorbill', { spec: { h: 1.8, hipY: 0.95, stride: 1.7, spd: 6.0 }, model: lrhRazorbill, view: lrhRazorbillView });

// the tar pot in flight, its pool, and the broadside's strip
lrDefProjArt('tar', (g, TC, add, team) => {
  const B = lrBatch();
  B.add('sph:10', 0x9a5a34, 0, 0, 0, 0, 0, 0, 0.16, 0.18, 0.16); B.add('cyl:8:1.3', 0x7a4228, 0, 0.18, 0, 0, 0, 0, 0.07, 0.08, 0.07); B.add('tor:10:0.3', 0x5a3020, 0, 0.0, 0, Math.PI / 2, 0, 0, 0.165);
  B.add('box', 0x1a1612, 0, 0.24, 0, 0, 0, 0.3, 0.1, 0.06, 0.04);
  const pot = add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
  const fl = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xff8030, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }))); fl.position.y = 0.26; fl.scale.setScalar(0.5);
  const smoke = new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0x3a3430, transparent: true, opacity: 0.5, depthWrite: false });
  lrhTrailer(g, pot, 7, smoke, 0.35); g.userData.point = false;
  g.children.forEach((c, i) => { if (c.isSprite && c !== fl) c.scale.setScalar(0.35 + i * 0.06); });
  const t0 = performance.now(); const ob = pot.onBeforeRender; pot.onBeforeRender = (...a) => { pot.rotation.set((performance.now() - t0) / 120, 0, (performance.now() - t0) / 200); ob(...a); };
});
lrDefZoneArt('tar', (g, TC, spr, team) => {
  let upd;
  // a pool of burning tar: black and glossy, flames licking round it, smoke going up
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshPhongMaterial({ color: 0x0e0c0a, specular: 0x6a5040, shininess: 80 }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.04; g.add(pool);
  const rim = lrhRingMesh(0.85, 1.0, 0xff6a20, 0.5); g.add(rim);
  const fl = [], sm = [];
  for (let k = 0; k < 16; k++) { const s = spr(k % 2 ? 0xff7a20 : 0xffb040, 1, 0.8); fl.push({ s, a: k / 16 * Math.PI * 2 + Math.random(), r: 0.2 + Math.random() * 0.75, p: Math.random() * 6 }); }
  for (let k = 0; k < 5; k++) { const s = spr(0x2a2420, 1, 0.4, false); sm.push({ s, p: k / 5 }); }
  upd = (z, dt, T) => {
    const R = z.r || 4, life = z.t != null ? lrhClamp(z.t / 0.6, 0, 1) : 1;
    pool.scale.setScalar(R); rim.scale.setScalar(R);
    rim.material.opacity = (0.35 + Math.sin(T * 8) * 0.1) * life;
    for (const f of fl) { const h = (0.8 + Math.abs(Math.sin(T * 7 + f.p)) * 0.9) * (0.6 + R * 0.12); f.s.position.set(Math.cos(f.a) * f.r * R, h * 0.5, Math.sin(f.a) * f.r * R); f.s.scale.set(0.9 * h, 1.6 * h, 1); f.s.material.opacity = 0.75 * life; }
    for (const q of sm) { const u = (T * 0.35 + q.p) % 1; q.s.position.set(Math.sin(q.p * 9) * R * 0.3, 0.5 + u * 4, Math.cos(q.p * 7) * R * 0.3); q.s.scale.setScalar(1 + u * 2.5); q.s.material.opacity = 0.35 * (1 - u) * life; }
  };
  return upd;
});
lrDefZoneArt('broadside', (g, TC, spr, team) => {
  let upd;
  // the broadside's strip: 6 m by 22 m along zone.yaw, ahead of the point; warning stripes that pulse faster as it falls
  const strip = new THREE.Group(); g.add(strip);
  const tex = lrhStripeTex().clone(); tex.needsUpdate = true; tex.repeat.set(3, 11);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: TC.main, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 22), mat); pl.rotation.x = -Math.PI / 2; pl.position.set(0, 0.06, -11); strip.add(pl);
  const edgeM = new THREE.MeshBasicMaterial({ color: TC.main, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const [x, z, w, d] of [[-3, -11, 0.18, 22], [3, -11, 0.18, 22], [0, 0, 6, 0.18], [0, -22, 6, 0.18]]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(w, d), edgeM); e.rotation.x = -Math.PI / 2; e.position.set(x, 0.07, z); strip.add(e); }
  const markers = []; for (let k = 0; k < 6; k++) { const s = spr(TC.main, 1.4, 0.6); s.position.set((k % 2 ? 1 : -1) * 3, 0.5, -2 - k * 3.6); markers.push(s); }
  upd = (z, dt, T) => {
    if (z.yaw != null) strip.rotation.y = z.yaw;
    const left = z.t != null ? z.t : 1, rate = 3 + 14 * (1 - lrhClamp(left / 1.4, 0, 1)), pu = 0.5 + 0.5 * Math.sin(T * rate);
    mat.opacity = 0.25 + 0.35 * pu; edgeM.opacity = 0.6 + 0.4 * pu; tex.offset.y = T * 0.8;
    for (const s of markers) { s.material.opacity = 0.3 + 0.6 * pu; s.position.y = 0.4 + pu * 0.3; }
  };
  return upd;
});

// shells whistling in from the sea along the strip, landing as it falls; and the volley's blasts
lrDefFx('broadside', (o, X) => {
  const { gy, later, rod, sprite, K } = X;
  const t = o.t != null ? o.t : 1.4, yaw = o.yaw || 0, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx;
  for (let k = 0; k < 8; k++) {
    const d = 1.5 + k * 2.7 + (Math.random() - 0.5), lx = o.x + fx * d + rx * (Math.random() - 0.5) * 4, lz = o.z + fz * d + rz * (Math.random() - 0.5) * 4, ly = gy(lx, lz);
    const lead = 0.5, when = Math.max(0, t - lead) + k * 0.04;
    later.push([when, () => { rod(lx + rx * 30, ly + 22, lz + rz * 30, lx, ly, lz, 0.05, 0xffc080, lead, 0.5); sprite(lx + rx * 30, ly + 22, lz + rz * 30, 0xffe0a0, 0.8, lead, -rx * 60, -44, -rz * 60); }]);
    later.push([t + k * 0.04, () => K.blast({ x: lx, y: ly + 0.4, z: lz, r: 2.4 })]);
  }
});
lrDefFx('volley', (o, X) => {
  const { gy, later, K } = X, yaw = o.yaw || 0, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx;
  for (let k = 0; k < 8; k++) { const d = 1.5 + k * 2.7, lx = o.x + fx * d + rx * (Math.random() - 0.5) * 4, lz = o.z + fz * d + rz * (Math.random() - 0.5) * 4; later.push([k * 0.05, () => K.blast({ x: lx, y: gy(lx, lz) + 0.4, z: lz, r: 2.6 })]); }
});
