'use strict';
// The Lamp Road: Linnet, the keeper's apprentice, who mends. Her kit, her bot, her crosshair, the lamp bolt, the
// kindled lantern and the beacon, their sounds and events, and (below) her art. A hero file as the guide at the top of
// src/lr.js has it.

// ---------- the play ----------
lrDefHero({
  id: 'linnet', n: 'Linnet', title: 'The Keeper’s Apprentice', role: 'support', hp: 225, spd: 5.6, r: 0.4, h: 1.7, mag: 20, reloadT: 1.4, ultCost: 1600,
  cd: { a1: 12, a2: 7, alt: 0 }, range: 55, projSpeed: 60, heals: true, healRange: 15, own: ['a2'],
  blurb: 'A young keeper with a storm lantern on a long iron staff. Its light mends her crew and burns the rest.',
  kit: {
    pri: ['Lamp Bolt', 'A bolt of light: hurts enemies, mends allies it passes through.'],
    alt: ['Mending Light', 'Hold on an ally near you to mend them steadily.'],
    a1: ['Kindle', 'Throw a lantern that hangs where it lands and mends allies near it.'],
    a2: ['Will-o’-the-Wisp', 'Blink a short way the way you’re moving.', 'Wisp'],
    ult: ['Beacon', 'Plant the staff: allies near it mend fast and can’t fall.'],
  },
  how: { bolt: 'Lamp Bolt' },
  // the Lamp Bolt
  fire(p, dt, I, H) {
    if (!(I.fire && p.fireT >= 0.32 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--;
    lrSpawnProj(p, 'bolt', 60, { dy: -0.1 });
    lrFxPush('cast', { v: p.i, x: p.x, y: p.y + 1.4, z: p.z });
  },
  // Mending Light: held on an ally in view within 16 m, aimed within about 12 degrees, and kept once caught (p.beam,
  // which the view draws and the HUD names)
  alt(p, dt, I) {
    p.beam = -1;
    if (I.alt) {
      const eye = { x: p.x, y: p.y + lrEyeH(p), z: p.z }, d = lrDir(p.yaw, p.pitch); let best = null, bestA = 0.21;
      const ang = q => { const dx = q.x - eye.x, dy = q.y + q.h * 0.6 - eye.y, dz = q.z - eye.z, l = Math.hypot(dx, dy, dz) || 1; return { a: Math.acos(lrClamp((dx * d[0] + dy * d[1] + dz * d[2]) / l, -1, 1)), l }; };
      const ok = (q, lim, far) => { if (!q || !q.alive || q.team !== p.team || q === p) return false; const g = ang(q); return g.l <= far && g.a <= lim && lrSees(eye, { x: q.x, y: q.y + q.h * 0.6, z: q.z }) && lrBlockRay(eye.x, eye.y, eye.z, (q.x - eye.x) / g.l, (q.y + q.h * 0.6 - eye.y) / g.l, (q.z - eye.z) / g.l, g.l) >= g.l - 0.1; };
      const was = LRM.P[p.beamWas];
      if (ok(was, 0.6, 17.5)) best = was;
      else for (const q of LRM.P) { if (!ok(q, bestA, 16)) continue; const g = ang(q); if (g.a < bestA) { bestA = g.a; best = q; } }
      if (best) { p.beam = best.i; lrHeal(best, 60 * dt, p); }
    }
    p.beamWas = p.beam;
  },
  // Kindle: the lantern thrown
  a1(p, dt, I, H) {
    if (!(I.a1 && p.cd.a1 <= 0)) return;
    p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 };
    lrSpawnProj(p, 'lantern', 16);
    lrFxPush('throw', { v: p.i, x: p.x, y: p.y + 1.5, z: p.z, w: 'lantern' });
  },
  // Beacon: the staff planted where she stands, 12 m round, six seconds
  ult(p) {
    lrAddZone({ k: 'beacon', team: p.team, owner: p.i, x: p.x, y: p.y, z: p.z, r: 12, t: 6 });
    lrFxPush('beacon', { x: p.x, y: p.y, z: p.z, team: p.team, v: p.i });
  },
  // (on whichever screen moves her) Will-o'-the-Wisp: 8 m the way she's walking (or looking)
  body(p, dt, I, H, M) {
    if (!(I.a2 && p.cd.a2 <= 0)) return;
    const f = lrBlinkTo(p, M.wl > 0.2 ? M.wx : -M.sy, M.wl > 0.2 ? M.wz : -M.cy, 8);
    p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    lrFxPush('blink', { x: f.x, y: f.y + 1, z: f.z, x2: p.x, y2: p.y + 1, z2: p.z, v: p.i });
  },
  ownUse(p, k) { if (k === 'a2') lrLocalFx({ k: 'blink', x: p.px, y: p.py + 1, z: p.pz, x2: p.x, y2: p.y + 1, z2: p.z, v: p.i }); },
  ownHost(p, k, u, S) { lrFxPush('blink', { x: u[2], y: u[3] + 1, z: u[4], x2: S.x, y2: S.y + 1, z2: S.z, v: p.i }); },
  // a guest's own bolt: flown on its screen until it meets something (its kind is own, so the host's echo is skipped)
  guestFire(p, I, H, ey, d) {
    if (!(I.fire && p.fireT >= 0.32 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--; LRM.shotAt = performance.now();
    LRM.proj.push({ id: -(++LRM.nid), k: 'bolt', team: p.team, owner: p.i, x: p.x, y: ey - 0.1, z: p.z, vx: d[0] * 60, vy: d[1] * 60, vz: d[2] * 60, t: 0, hit: [], own: 1 });
    lrLocalFx({ k: 'cast', v: p.i, x: p.x, y: p.y + 1.4, z: p.z });
  },
  // the bot (the generic bot already holds her light on whoever's hurt, as she heals): the beacon when the crew's
  // hurt, the lantern on someone hurt (or at her feet), the wisp away when she's in trouble
  bot(p, ai, B) {
    const { S, I, hpF, hurt, foes, pals, at, mode } = B;
    const hurtN = pals.filter(f => f.q.alive && f.q.hp / f.q.maxHp < 0.6 && f.d < 12).length + (hpF < 0.6 ? 1 : 0);
    if (p.ult >= 1 && (hurtN >= Math.max(2, S.clump) || (hurtN >= 1 && foes.length >= 3))) { I.ult = true; return; }
    if (p.cd.a1 <= 0) {
      const w = pals.find(f => f.q.alive && f.q.hp / f.q.maxHp < 0.7 && f.d < 13);
      if (hpF < 0.55 && (!w || Math.random() < 0.5)) { mode({ at: { x: p.x - Math.sin(p.yaw) * 0.8, y: p.y, z: p.z - Math.cos(p.yaw) * 0.8 }, lob: 16, press: 'a1', pressAt: LRM.t + 0.25 }); return; }
      if (w) { mode({ at: at(w.q, 0), lob: 16, press: 'a1', pressAt: LRM.t + 0.3 }); return; }
    }
    if (p.cd.a2 <= 0 && hurt && hpF < 0.4) { I.a2 = true; ai.retreat = true; }
  },
  cross(c, cx, cy, me) { c.beginPath(); c.arc(cx, cy, 11, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, 1.8, 0, 7); c.fill(); if (me.beam >= 0) { const q = LRM.P[me.beam]; c.fillStyle = '#fff0a0'; c.font = '600 12px "Courier Prime", monospace'; c.textAlign = 'center'; if (q) c.fillText('Mending ' + q.name, cx, cy + 32); } },
});
// the lamp bolt: flies straight; through allies, mending each once (30), and burns the first enemy (22, double to the
// head) or wall it meets
lrDefProj('bolt', { grav: false, own: true, step(j, dt, M) {
  const { sx, sy, sz, L, dx, dy, dz, a } = M;
  for (let k = 0; k < 4; k++) { const h = lrRayHit(sx, sy, sz, dx, dy, dz, { team: j.team, skip: j.owner, who: 'ally', pad: 0.12, max: L, noWalls: true }); if (!h.p || j.hit.includes(h.p.i)) break; j.hit.push(h.p.i); lrHeal(h.p, 30, a); }
  const h = lrRayHit(sx, sy, sz, dx, dy, dz, { team: j.team, skip: j.owner, pad: 0.12, max: L });
  let gone = false;
  if (h.t < L) { gone = true; if (h.p) lrHurt(h.p, 22 * (h.head ? 2 : 1), a, 'bolt', h.head); else if (h.wall) lrWallHurt(h.wall, 22, a); lrFxPush('spark', { x: h.x, y: h.y, z: h.z, bolt: 1 }); }
  return gone || j.t > 1.2;
} });
// the kindled lantern: lobbed through bodies; it hangs where it lands (0.6 to 2.2 m up), mending allies within 5 m for six seconds
lrDefProj('lantern', { step(j, dt, M) {
  const l = lrLobLand(j, M, true); if (!l) return false;
  const hy = Math.max(l.y + 0.6, Math.min(l.met ? l.h.y : j.y, l.y + 2.2));
  lrAddZone({ k: 'lantern', team: j.team, owner: j.owner, x: l.x, y: hy, z: l.z, gy: l.y, r: 5, t: 6 }); lrFxPush('kindle', { x: l.x, y: hy, z: l.z, team: j.team });
  return true;
} });
lrDefZone('lantern', { touch(z, q, dt, a) { if (q.team === z.team) lrHeal(q, 25 * dt, a); } });
// the beacon: 80 a second to allies within 12 m, who can't fall there
lrDefZone('beacon', { touch(z, q, dt, a) { if (q.team === z.team) lrHeal(q, 80 * dt, a); }, nofall: (z, q) => z.team === q.team && Math.hypot(q.x - z.x, q.z - z.z) < z.r });
lrDefEvent('cast', { own: true, sound: (f, at) => at('bolt') });
lrDefEvent('blink', { own: true, sound: (f, at) => at('blink') });
lrDefEvent('kindle', { sound: (f, at) => at('kindle') });
lrDefEvent('beacon', { sound: (f, at) => at('beacon', 1.3) });
lrDefSnd('bolt', (v, e, rec, o) => { tone(1180, 'sine', 0.002, 0.12 * v, 0.16, { to: 1760, pan: e.pan }); noise('highpass', 4000, 1, 0.002, 0.05 * v, 0.1, o); });
lrDefSnd('blink', (v, e, rec) => { if (!rec('whisper', 0.5 * v, { rate: 1.6 })) tone(900, 'sine', 0.005, 0.12 * v, 0.25, { to: 300, pan: e.pan }); });
lrDefSnd('kindle', (v, e, rec) => { if (!rec('lampcatch', 0.7 * v)) tone(660, 'triangle', 0.005, 0.12 * v, 0.5, { pan: e.pan }); });
lrDefSnd('beacon', (v, e, rec) => { if (!rec('beaconcatch', 1 * v)) { tone(523, 'sine', 0.01, 0.2 * v, 1.4, { pan: e.pan }); tone(784, 'sine', 0.01, 0.15 * v, 1.6, { delay: 0.1, pan: e.pan }); } });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
// ---------- Linnet: the lamp-keeper's apprentice ----------
function lrhLinnet(team) {
  const m = lrhRig('linnet', team), TC = m.TC, t = m.team;
  const gansey = t ? TC.main : TC.trim, gansey2 = t ? 0xa83a30 : 0x346ea4, cape = t ? 0x2a2522 : TC.main, capeEdge = t ? TC.main : 0xd8a838, cap = t ? 0x2a2522 : 0x2c4a6a, trou = 0x3a3a40;
  lrhLegs(m, 0.1, 0.44, 0.42, (L, S, s, a, b) => {
    L.L.add('cyl:8:1.25', trou, 0, -a / 2, 0, 0, 0, 0, 0.072, a, 0.072);
    S.L.add('cyl:8', trou, 0, -b * 0.3, 0, 0, 0, 0, 0.062, b * 0.6, 0.062);
    S.L.add('cyl:8:1.15', 0x5a3e28, 0, -b * 0.75, 0, 0, 0, 0, 0.066, b * 0.5, 0.066);   // leather boots, rolled
    S.L.add('cyl:8', 0x6a4a30, 0, -b * 0.5, 0, 0, 0, 0, 0.076, 0.05, 0.076);
    S.L.add('box', 0x4a3220, 0, -b + 0.035, -0.05, 0, 0, 0, 0.1, 0.07, 0.22);
  });
  m.spine = lrhNode(m.hips, 0, 0.05, 0, 'spine');
  const sp = m.P(m.spine);
  // the gansey: knitted ribs across the chest
  sp.L.add('cyl:10:1.2', gansey, 0, 0.17, 0, 0, 0, 0, 0.15, 0.48, 0.115);
  m.P(m.hips).L.add('cyl:10', trou, 0, -0.02, 0, 0, 0, 0, 0.16, 0.14, 0.11);
  for (let k = 0; k < 4; k++) sp.L.add('cyl:10', gansey2, 0, 0.26 + k * 0.035, 0, 0, 0, 0, 0.162 + k * 0.006, 0.014, 0.128 + k * 0.004);
  sp.L.add('cyl:10', gansey2, 0, -0.06, 0, 0, 0, 0, 0.155, 0.06, 0.118);
  // the short cape over the shoulders, its hem in the crew's colour
  sp.L.add('cyl:12:0.42', cape, 0, 0.3, 0.02, 0, 0, 0, 0.25, 0.3, 0.19);
  sp.L.add('cyl:12', capeEdge, 0, 0.15, 0.02, 0, 0, 0, 0.252, 0.035, 0.192);
  sp.L.add('box', cape, 0, 0.27, -0.17, 0, 0, 0, 0.06, 0.26, 0.04);
  for (const s of [-1, 1]) sp.L.add('sph:4', LRH_BRASS, s * 0.03, 0.4, -0.12, 0, 0, 0, 0.018);
  sp.L.add('cyl:10', cape, 0, 0.45, 0, 0, 0, 0, 0.085, 0.06, 0.08);
  // the satchel strap and the satchel of wicks on her left hip
  sp.L.add('box', LRH_LEATH, 0, 0.2, -0.002, 0, 0, -0.75, 0.04, 0.55, 0.245);
  m.satchel = lrhNode(m.hips, -0.17, 0.0, 0); { const B = m.P(m.satchel); B.L.add('box', LRH_LEATH, 0, 0, 0, 0, 0, 0, 0.08, 0.2, 0.24); B.L.add('box', 0x4a2e1a, -0.01, 0.06, 0, 0, 0, 0, 0.085, 0.09, 0.245); for (let k = 0; k < 4; k++) B.L.add('cyl:5', 0xe8e0c8, -0.02, 0.13, -0.08 + k * 0.05, 0, 0, 0, 0.012, 0.08, 0.012); B.L.add('box', LRH_BRASS, -0.045, 0.04, 0, 0, 0, 0, 0.01, 0.03, 0.03); }
  m.head = lrhNode(m.spine, 0, 0.47, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('sph:10', LRH_SKIN, 0, 0.11, 0, 0, 0, 0, 0.105, 0.115, 0.105);
  hd.L.add('sph:8', 0xb87a40, 0, 0.1, 0.03, 0, 0, 0, 0.11, 0.1, 0.1);      // copper hair under the cap
  hd.L.add('sph:8', 0xb87a40, 0, 0.02, 0.08, 0, 0, 0, 0.09, 0.08, 0.05);
  for (const s of [-1, 1]) hd.L.add('sph:6', 0xb87a40, s * 0.09, 0.07, 0.0, 0, 0, 0, 0.03, 0.07, 0.05);
  hd.L.add('cone:4', 0xc89878, 0, 0.09, -0.11, -Math.PI / 2, Math.PI / 4, 0, 0.02, 0.04, 0.02);
  for (const s of [-1, 1]) hd.L.add('sph:4', 0x201814, s * 0.04, 0.13, -0.098, 0, 0, 0, 0.012);
  // a knitted watch cap, a bobble on top
  hd.L.add('hemi:10', cap, 0, 0.15, 0.005, 0, 0, 0, 0.115, 0.12, 0.115);
  hd.L.add('cyl:10', t ? TC.main : TC.main, 0, 0.16, 0.005, 0, 0, 0, 0.118, 0.04, 0.118);
  hd.L.add('sph:6', t ? TC.main : TC.main, 0, 0.28, 0.0, 0, 0, 0, 0.04);
  lrhArms(m, 0.18, 0.4, 0, 0.28, 0.27, (A, F, H, s, a, b) => {
    A.L.add('sph:8', cape, 0, 0, 0, 0, 0, 0, 0.07, 0.065, 0.07);
    A.L.add('cyl:8:1.1', gansey, 0, -a / 2, 0, 0, 0, 0, 0.048, a, 0.048);
    F.L.add('cyl:8', gansey, 0, -b * 0.4, 0, 0, 0, 0, 0.045, b * 0.8, 0.045);
    F.L.add('cyl:8', gansey2, 0, -b * 0.85, 0, 0, 0, 0, 0.05, 0.06, 0.05);
    H.L.add('box', 0x6a4a30, 0, -0.035, 0, 0, 0, 0, 0.055, 0.08, 0.07);   // mittens
  });
  // the staff: iron, a crook at the top the storm lantern hangs from (its own node, to swing)
  m.staff = lrhNode(m.spine, 0, 0, 0, 'staff');
  const sf = m.P(m.staff);
  sf.L.add('cyl:6', 0x2e3034, 0, 0.35, 0, 0, 0, 0, 0.018, 1.9, 0.018);
  sf.L.add('cone:6', 0x2e3034, 0, -0.65, 0, Math.PI, 0, 0, 0.025, 0.1, 0.025);
  sf.L.add('tor:10:0.15', 0x2e3034, 0, 1.36, -0.08, 0, Math.PI / 2, 0, 0.08, 0.08, 0.08);
  sf.L.add('cyl:6', TC.main, 0, 0.06, 0, 0, 0, 0, 0.026, 0.14, 0.026);
  sf.L.add('cyl:6', LRH_BRASS, 0, 1.28, 0, 0, 0, 0, 0.026, 0.05, 0.026);
  m.lantern = lrhNode(m.staff, 0, 1.36, -0.16, 'lantern');
  const ln = m.P(m.lantern);
  ln.L.add('tor:8:0.2', LRH_BRASS, 0, -0.02, 0, 0, 0, 0, 0.035, 0.035, 0.035);
  ln.L.add('cone:8', LRH_BRASS, 0, -0.08, 0, 0, 0, 0, 0.085, 0.07, 0.085);
  ln.G.add('cyl:8', TC.glow, 0, -0.18, 0, 0, 0, 0, 0.07, 0.14, 0.07);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; ln.L.add('box', LRH_BRASS, Math.sin(a) * 0.078, -0.18, Math.cos(a) * 0.078, 0, a, 0, 0.015, 0.16, 0.015); }
  ln.L.add('cyl:8', LRH_BRASS, 0, -0.27, 0, 0, 0, 0, 0.085, 0.04, 0.085);
  m.lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.lanternGlow.position.set(0, -0.18, 0); m.lanternGlow.scale.setScalar(1.1); m.lantern.add(m.lanternGlow);
  m.muzzle = lrhNode(m.lantern, 0, -0.18, 0, 'muzzle');
  // the little lantern she throws (Kindle), in her left hand while she does
  m.kindle = lrhNode(m.handL, 0, -0.1, 0); { const B = m.P(m.kindle); B.L.add('cone:6', LRH_BRASS, 0, 0.06, 0, 0, 0, 0, 0.05, 0.05, 0.05); B.G.add('cyl:6', TC.glow, 0, -0.02, 0, 0, 0, 0, 0.04, 0.09, 0.04); } m.kindle.visible = false;
  m.anim = lrhAnimLinnet;
  return m.finish();
}

function lrhAnimLinnet(m, pose, dt) {
  const b = lrhBase(m, pose, dt), act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3() }), st = m.st;
  const sf = m.staff;
  // held upright before her, the lantern hung out in front; a flick of the staff for each bolt
  const fl = pose.fire != null && pose.fire >= 0 && pose.fire < 0.28 ? Math.sin(pose.fire / 0.28 * Math.PI) : 0;
  sf.position.set(0.24, -0.02 - fl * 0.02, -0.28 - fl * 0.12);
  sf.rotation.set(-0.22 - p * 0.35 - fl * 0.7, 0, 0.06);
  m.spine.rotation.x += p * 0.15; m.head.rotation.x = p * 0.6 - m.spine.rotation.x;
  let TR = lrhAt(sf, 0, 0, 0, V.b), TL = V.a.set(-0.2, 0.02, -0.12);
  let glowK = 1;
  if (Math.min(1, st.run) > 0.3) TL = V.a.set(-0.2, 0.05 + Math.sin(st.ph) * 0.05, -0.05 + Math.sin(st.ph) * 0.12);
  if (pose.alt) {
    // the mending light: staff levelled at whoever she's mending, both hands on it
    sf.position.set(0.12, 0.25, -0.2); sf.rotation.set(p - Math.PI / 2 + 0.08, 0, 0);
    TR = lrhAt(sf, 0, 0, 0, V.b); TL = lrhAt(sf, 0, 0.32, 0, V.a); glowK = 1.6;
  }
  if (pose.reload > 0) { sf.rotation.z = 0.4; sf.rotation.x = -0.1; TR = lrhAt(sf, 0, 0, 0, V.b); TL = lrhAt(sf, 0, 1.05, 0, V.a); glowK = 0.5 + Math.abs(Math.sin(pose.reload * 6)) * 0.4; }
  // Kindle: the little lantern tossed underarm
  m.kindle.visible = k === 'a1' && t < 0.32;
  if (k === 'a1' && t < 0.6) {
    const w = lrhSm(0, 0.18, t), th = lrhSm(0.18, 0.34, t), back = lrhSm(0.4, 0.6, t);
    TL = V.a.set(-0.22, lrhLerp(lrhLerp(0.0, -0.18, w), 0.38, th), lrhLerp(lrhLerp(-0.1, 0.22, w), -0.48, th)).lerp(V.b.clone().set(-0.2, 0.02, -0.12), back);
    TR = lrhAt(sf, 0, 0, 0, V.b);
  }
  // the wisp: a moment of light where she was
  if (k === 'a2' && t < 0.35) { const f = Math.sin(t / 0.35 * Math.PI); m.body.scale.set(1 - f * 0.25, 1 + f * 0.15, 1 - f * 0.25); glowK = 1 + f * 2; } else m.body.scale.set(1, 1, 1);
  // the Beacon: the staff raised high and driven into the ground before her, and she kneels to it
  if (k === 'ult' && t < 1.4) {
    const up = lrhSm(0, 0.35, t), dn = lrhSm(0.35, 0.55, t), off = lrhSm(1.15, 1.4, t);
    const hy = -(m.S.hipY + 0.05) + 0.62;
    sf.position.set(lrhLerp(0.12, 0.05, dn), lrhLerp(lrhLerp(0.0, 0.62, up), hy + 0.38 + 0.18, dn), lrhLerp(-0.2, -0.5, dn));
    sf.rotation.set(lrhLerp(lrhLerp(-0.2, 0.05, up), 0, dn), 0, 0);
    if (off > 0) { sf.position.lerp(V.a.set(0.24, -0.02, -0.28), off); }
    m.hips.position.y -= 0.36 * dn * (1 - off); m.legL.rotation.x += 1.3 * dn * (1 - off); m.shinL.rotation.x -= 1.45 * dn * (1 - off); m.legR.rotation.x -= 0.2 * dn * (1 - off); m.shinR.rotation.x -= 1.5 * dn * (1 - off);
    m.spine.rotation.x += 0.1 * dn;
    TR = lrhAt(sf, 0, 0.0, 0, V.b); TL = lrhAt(sf, 0, 0.2, 0, V.a); glowK = 1 + dn * 1.5;
  }
  // the lantern hangs plumb, swinging a little
  sf.updateMatrixWorld(true);
  const sx = sf.rotation.x + m.spine.rotation.x, sz = sf.rotation.z;
  st.sw = (st.sw || 0) + dt; m.lantern.rotation.set(-sx + Math.sin(st.sw * 3) * 0.08 * (0.3 + Math.min(1, st.run)), 0, -sz + Math.sin(st.sw * 2.3) * 0.05);
  if (lrhDead(m, pose, 1)) { TL = V.a.set(-0.45, 0.2, 0.1); TR = V.b.set(0.45, 0.25, 0.1); sf.position.set(0.55, -0.4, -0.2); sf.rotation.set(-1.3, 0, 0.3); glowK = Math.max(0.15, 1 - pose.dead * 0.5); }
  lrhHands(m, TL, TR);
  m.glow.color.setScalar(Math.min(1.4, glowK)); m.lanternGlow.material.opacity = Math.min(1, 0.6 * glowK); m.lanternGlow.scale.setScalar(0.9 + 0.35 * glowK);
}

// the hands and the weapon in first person (V: what src/lrhero.js's lrViewModel gives a view to build in)
function lrhLinnetView(V) {
  const { g, root, st, mk, B, flashSpr, lit, glow } = V; let muzzle, anim, flash = null;
  // the lantern staff, up from the bottom right, the lantern hung out ahead of her; her mitten on it
  const sf = mk(root, 0.2, -0.32, -0.42), b = B(sf);
  b.L.add('cyl:6', 0x2e3034, 0, 0.32, 0, 0, 0, 0, 0.012, 0.9, 0.012);
  b.L.add('tor:10:0.15', 0x2e3034, 0, 0.76, -0.05, 0, Math.PI / 2, 0, 0.05, 0.05, 0.05);
  b.L.add('cyl:6', LRH_BRASS, 0, 0.7, 0, 0, 0, 0, 0.017, 0.03, 0.017);
  const lan = mk(sf, 0, 0.76, -0.1), ln = B(lan);
  ln.L.add('tor:8:0.2', LRH_BRASS, 0, -0.01, 0, 0, 0, 0, 0.022, 0.022, 0.022);
  ln.L.add('cone:8', LRH_BRASS, 0, -0.05, 0, 0, 0, 0, 0.055, 0.045, 0.055);
  ln.G.add('cyl:8', 0xffd27a, 0, -0.115, 0, 0, 0, 0, 0.045, 0.09, 0.045);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; ln.L.add('box', LRH_BRASS, Math.sin(a) * 0.05, -0.115, Math.cos(a) * 0.05, 0, a, 0, 0.01, 0.1, 0.01); }
  ln.L.add('cyl:8', LRH_BRASS, 0, -0.17, 0, 0, 0, 0, 0.055, 0.025, 0.055);
  const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xffd27a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  lg.position.set(0, -0.115, 0); lg.scale.setScalar(0.35); lan.add(lg);
  const hR = mk(sf, 0, 0.05, 0), r = B(hR);
  r.L.add('box', 0x6a4a30, 0.0, 0, 0, 0, 0, 0, 0.06, 0.07, 0.07); r.L.add('cyl:8', 0x3d7fb8, 0.015, -0.06, 0.1, 2.1, 0, 0, 0.038, 0.2, 0.038); r.L.add('cyl:8', 0x346ea4, 0.01, -0.02, 0.035, 2.1, 0, 0, 0.042, 0.03, 0.042);
  const hL = mk(root, -0.22, -0.3, -0.4), l = B(hL);
  l.L.add('box', 0x6a4a30, 0, 0, 0, 0, 0, 0, 0.06, 0.07, 0.07); l.L.add('box', 0x6a4a30, 0.035, 0.01, -0.01, 0, 0, -0.5, 0.025, 0.05, 0.03); l.L.add('cyl:8', 0x3d7fb8, -0.01, -0.06, 0.1, 2.1, 0, 0, 0.038, 0.2, 0.038);
  const kin = mk(hL, 0, 0.06, -0.02), kb = B(kin); kb.L.add('cone:6', LRH_BRASS, 0, 0.04, 0, 0, 0, 0, 0.03, 0.03, 0.03); kb.G.add('cyl:6', 0xffd27a, 0, -0.01, 0, 0, 0, 0, 0.025, 0.05, 0.025);
  muzzle = mk(lan, 0, -0.115, 0);
  anim = (s, dt) => {
    const fl = s.fire != null && s.fire >= 0 && s.fire < 0.25 ? Math.sin(s.fire / 0.25 * Math.PI) : 0, aim = st.aim = lrhLerp(st.aim || 0, s.alt ? 1 : 0, Math.min(1, dt * 10));
    const k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
    sf.position.set(lrhLerp(0.31, 0.13, aim), lrhLerp(-0.4, -0.26, aim) - fl * 0.02, lrhLerp(-0.42, -0.48, aim) - fl * 0.08);
    sf.rotation.set(lrhLerp(-0.15, -0.85, aim) - fl * 0.55, 0, lrhLerp(-0.06, 0.08, aim));
    hL.position.set(lrhLerp(-0.22, -0.04, aim), lrhLerp(-0.3, -0.2, aim), lrhLerp(-0.4, -0.38, aim)); hL.rotation.set(0.2 + aim * 0.6, 0, 0.3);
    kin.visible = false;
    let gk = 1 + aim * 0.6;
    if (s.reload > 0) { sf.rotation.z = 0.35; sf.rotation.x = -0.05; gk = 0.4 + Math.abs(Math.sin(s.reload * 6)) * 0.5; }
    if (k === 'a1' && t < 0.6) { kin.visible = t < 0.32; const w = lrhSm(0, 0.18, t), th = lrhSm(0.18, 0.34, t), back = lrhSm(0.4, 0.6, t); hL.position.set(-0.2, lrhLerp(lrhLerp(-0.3, -0.42, w), -0.1, th) * (1 - back) - 0.3 * back, lrhLerp(lrhLerp(-0.4, -0.3, w), -0.62, th) * (1 - back) - 0.4 * back); }
    if (k === 'a2' && t < 0.35) gk += Math.sin(t / 0.35 * Math.PI) * 2;
    if (k === 'ult' && t < 1.3) { const u = lrhSm(0, 0.35, t), d = lrhSm(0.35, 0.55, t), o = lrhSm(1.1, 1.3, t); sf.position.y += (0.22 * u - 0.32 * d) * (1 - o); sf.rotation.x = lrhLerp(sf.rotation.x, 0.0, (u) * (1 - o)); gk += 1.5 * d * (1 - o); }
    const sx = sf.rotation.x; st.sw += dt; lan.rotation.set(-sx + Math.sin(st.sw * 3) * 0.06, 0, -sf.rotation.z);
    glow.color.setScalar(Math.min(1.3, gk)); lg.material.opacity = Math.min(1, 0.55 * gk); lg.scale.setScalar(0.3 + 0.12 * gk);
  };
  return { muzzle, anim };
}
lrDefHeroArt('linnet', { spec: { h: 1.7, hipY: 0.88, stride: 1.6, spd: 5.6 }, model: lrhLinnet, view: lrhLinnetView });

// the lamp bolt and the thrown lantern in flight, the hung lantern, the beacon
lrDefProjArt('bolt', (g, TC, add, team) => {
  const core = add(new THREE.Mesh(lrProto('sph:8'), new THREE.MeshBasicMaterial({ color: 0xfff4d0 }))); core.scale.set(0.07, 0.07, 0.5);
  const sh = add(new THREE.Mesh(lrProto('sph:8'), new THREE.MeshBasicMaterial({ color: TC.glow, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }))); sh.scale.set(0.16, 0.16, 0.9); sh.position.z = 0.2;
  const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))); s.scale.setScalar(1.1);
  lrhTrailer(g, core, 4, new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }), 0.5);
  g.children.forEach(c => { if (c.isSprite && c !== s) c.scale.setScalar(0.6); });
});
lrDefProjArt('lantern', (g, TC, add, team) => {
  const B = lrBatch(), G2 = lrBatch();
  B.add('cone:8', LRH_BRASS, 0, 0.12, 0, 0, 0, 0, 0.11, 0.08, 0.11); B.add('tor:8:0.2', LRH_BRASS, 0, 0.2, 0, 0, 0, 0, 0.04);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; B.add('box', LRH_BRASS, Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1, 0, a, 0, 0.018, 0.2, 0.018); }
  B.add('cyl:8', LRH_BRASS, 0, -0.11, 0, 0, 0, 0, 0.11, 0.03, 0.11);
  G2.add('cyl:8', TC.glow, 0, 0, 0, 0, 0, 0, 0.085, 0.18, 0.085);
  const body = add(new THREE.Group()); body.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); body.add(G2.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }))); s.scale.setScalar(1.4);
  const t0 = performance.now(); s.onBeforeRender = () => { const t = (performance.now() - t0) / 1000; body.rotation.set(t * 9, t * 3, 0); body.updateMatrixWorld(true); };
});
lrDefZoneArt('lantern', (g, TC, spr, team) => {
  let upd;
  // the lantern hung from three iron legs, its mending light on the ground in a ring of 5 m
  const B = lrBatch(), G2 = lrBatch();
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; B.rod([Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7], [0, 1.9, 0], 0.025, 0x2e3034, 5); }
  B.add('tor:8:0.2', LRH_BRASS, 0, 1.85, 0, 0, 0, 0, 0.04);
  const lanN = new THREE.Group(); lanN.position.y = 1.82; g.add(lanN);
  const L2 = lrBatch();
  L2.add('cone:8', LRH_BRASS, 0, -0.08, 0, 0, 0, 0, 0.11, 0.08, 0.11);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; L2.add('box', LRH_BRASS, Math.sin(a) * 0.1, -0.24, Math.cos(a) * 0.1, 0, a, 0, 0.018, 0.22, 0.018); }
  L2.add('cyl:8', LRH_BRASS, 0, -0.36, 0, 0, 0, 0, 0.11, 0.03, 0.11);
  G2.add('cyl:8', TC.glow, 0, -0.24, 0, 0, 0, 0, 0.085, 0.2, 0.085);
  g.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); lanN.add(L2.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); lanN.add(G2.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  const halo = spr(TC.glow, 2.2, 0.85); halo.position.y = 1.58;
  const ring = lrhRingMesh(4.75, 5.0, TC.glow, 0.6); g.add(ring);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshBasicMaterial({ color: TC.glow, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.04; g.add(fill);
  const motes = []; for (let k = 0; k < 8; k++) { const s = spr(TC.glow, 0.25, 0.7); motes.push({ s, a: Math.random() * 6, r: 1 + Math.random() * 3.5, p: Math.random() }); }
  upd = (z, dt, T) => {
    const life = z.t != null ? lrhClamp(z.t / 0.5, 0, 1) : 1, pu = 0.8 + Math.sin(T * 4) * 0.2;
    lanN.rotation.set(Math.sin(T * 1.7) * 0.06, 0, Math.sin(T * 2.1) * 0.06);
    halo.material.opacity = 0.8 * pu * life; ring.material.opacity = 0.55 * pu * life; fill.material.opacity = 0.08 * pu * life;
    for (const q of motes) { const u = (T * 0.4 + q.p) % 1; q.s.position.set(Math.cos(q.a) * q.r, u * 2.2, Math.sin(q.a) * q.r); q.s.material.opacity = 0.8 * Math.sin(u * Math.PI) * life; }
  };
  return upd;
});
lrDefZoneArt('beacon', (g, TC, spr, team) => {
  let upd;
  // the staff planted, the lantern on it blazing, rays turning, the ring of 12 m
  const B = lrBatch(), G2 = lrBatch();
  B.add('cyl:6', 0x2e3034, 0, 1.1, 0, 0, 0, 0, 0.03, 2.2, 0.03); B.add('tor:10:0.15', 0x2e3034, 0, 2.2, -0.1, 0, Math.PI / 2, 0, 0.12);
  B.add('cone:8', LRH_BRASS, 0, 2.08, -0.2, 0, 0, 0, 0.13, 0.1, 0.13); B.add('cyl:8', LRH_BRASS, 0, 1.78, -0.2, 0, 0, 0, 0.13, 0.04, 0.13);
  G2.add('cyl:8', 0xfff0c0, 0, 1.93, -0.2, 0, 0, 0, 0.1, 0.24, 0.1);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; B.add('ico', 0x6a6458, Math.sin(a) * 0.3, 0.05, Math.cos(a) * 0.3, 0, a, 0, 0.18, 0.1, 0.14); }
  g.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); g.add(G2.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  const core = spr(0xfff0c0, 2.5, 1); core.position.set(0, 1.93, -0.2);
  const big = spr(TC.glow, 7, 0.5); big.position.set(0, 1.93, -0.2);
  const rays = new THREE.Group(); rays.position.set(0, 1.93, -0.2); g.add(rays);
  const rayG = new THREE.ConeGeometry(0.5, 9, 6, 1, true); rayG.translate(0, 4.5, 0);
  { const p = rayG.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const f = 1 - p.getY(i) / 9; c.push(f, f, f); } rayG.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
  const rayM = new THREE.MeshBasicMaterial({ color: TC.glow, vertexColors: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(rayG, rayM); r.rotation.set(Math.PI / 2 - 0.15, k / 6 * Math.PI * 2, 0, 'YXZ'); rays.add(r); }
  const ring = lrhRingMesh(11.6, 12, TC.glow, 0.7); g.add(ring);
  const ring2 = lrhRingMesh(0.2, 0.6, 0xfff0c0, 0.6); g.add(ring2);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshBasicMaterial({ color: TC.glow, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false })); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.04; g.add(fill);
  upd = (z, dt, T) => {
    const life = z.t != null ? lrhClamp(z.t / 0.6, 0, 1) : 1, pu = 0.85 + Math.sin(T * 9) * 0.1 + Math.sin(T * 23) * 0.05;
    rays.rotation.y = T * 0.8; rayM.opacity = 0.3 * pu * life; core.material.opacity = pu * life; big.material.opacity = 0.45 * pu * life; big.scale.setScalar(6 + Math.sin(T * 3) * 0.8);
    ring.material.opacity = (0.5 + Math.sin(T * 5) * 0.2) * life; fill.material.opacity = 0.07 * life;
    const u = (T * 0.6) % 1; ring2.scale.setScalar(1 + u * 18); ring2.material.opacity = 0.5 * (1 - u) * life;
  };
  return upd;
});

// the wisp's blink: a burst where she was and where she is, and the streak between
lrDefFx('blink', (o, X) => { const { burst, rod, sprite } = X; burst(o.x, o.y, o.z, 0xb8e8ff, 10, 1.6, 0.3, 0.5); burst(o.x2, o.y2, o.z2, 0xffe8a0, 10, 1.6, 0.3, 0.5); rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.15, 0xb8d8ff, 0.3, 0.4); sprite(o.x2, o.y2, o.z2, 0xfff0c0, 1.8, 0.25); });
