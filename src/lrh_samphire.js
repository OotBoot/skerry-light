'use strict';
// The Lamp Road: Samphire, the shore-wife, a forager of the strand who mends with sea water. Her kit, her bot, her
// crosshair, the brine bottle, the shrimp net's sweep, the rockpool, the kelp snare and the Second Tide (which brings
// back allies who fell in the last moments where they fell), their sounds and events, and (below) her art. A hero file
// as the guide at the top of src/lr.js has it.

// ---------- the play ----------
lrDefHero({
  id: 'samphire', n: 'Samphire', title: 'The Shore-Wife', role: 'support', hp: 225, spd: 5.5, r: 0.4, h: 1.7, mag: 7, reloadT: 1.3, ultCost: 1800,
  cd: { a1: 12, a2: 10, alt: 0.9 }, range: 0.01, projSpeed: 20, heals: true, healRange: 0.01, botKeep: 6, actT: { alt: 0.45, a1: 0.7, a2: 0.6, ult: 1.4 },
  blurb: 'A weathered forager of the strand with a creel on her back and a shrimping net. Her bottles of brine mend her crew and scald the rest.',
  kit: {
    pri: ['Brine Bottle', 'Lob a bottle that bursts where it lands: it mends allies and hurts enemies round it.'],
    alt: ['Shrimp Net', 'Sweep the net before you: it hurts and slows enemies close by.', 'Net'],
    a1: ['Rockpool', 'Throw down a rockpool where you aim: allies in it mend, and shake off slows, stuns and roots.', 'Pool'],
    a2: ['Kelp Snare', 'Lob a tangle of kelp that roots the first enemy to step in it. Two at a time.', 'Kelp'],
    ult: ['Second Tide', 'Calls back allies who fell in the last few seconds, where they fell. If none fell, mends everyone near.', 'Tide'],
  },
  how: { samBottle: 'Brine Bottle', samNet: 'Shrimp Net' },
  // the Brine Bottle, lobbed from her left hand
  fire(p, dt, I, H) {
    if (!(I.fire && p.fireT >= 0.8 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--;
    lrSpawnProj(p, 'samBottle', 20, { dy: -0.2 });
    lrFxPush('samThrow', { v: p.i, x: p.x, y: p.y + 1.4, z: p.z });
  },
  // the Shrimp Net: a sweep before her, 4 m and about 120 degrees across: 25 and a slow of 35% for a second and a half
  alt(p, dt, I, H) {
    if (!(I.alt && p.cd.alt <= 0)) return;
    p.cd.alt = H.cd.alt; p.act = { k: 'alt', t: 0 };
    const eye = { x: p.x, y: p.y + 1.1, z: p.z };
    for (const q of lrFoesIn(p, p.x, p.z, 4)) { if (Math.abs(q.y - p.y) > 2 || !lrFacing(p, q, 1.05) || !lrSees(eye, { x: q.x, y: q.y + 1, z: q.z })) continue; lrHurt(q, 25, p, 'samNet'); lrSlow(q, 0.65, 1.5, 'samNet'); }
    for (const w of LRM.walls) if (w.team !== p.team && Math.hypot(w.x - p.x, w.z - p.z) < 4 + w.w / 2 && lrFacing(p, w, 1.05)) lrWallHurt(w, 25, p);
    lrFxPush('samNet', { v: p.i, x: p.x, y: p.y + 0.6, z: p.z, yaw: p.yaw, team: p.team });
  },
  // Rockpool: where she aims, up to 15 m off (the ground under the end of her look), about 5 m across, seven seconds
  a1(p, dt, I, H) {
    if (!(I.a1 && p.cd.a1 <= 0)) return;
    const d = lrDir(p.yaw, p.pitch), ey = p.y + lrEyeH(p), h = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 15, noBodies: true });
    const t = Math.max(0, h.t - 0.5), x = p.x + d[0] * t, z = p.z + d[2] * t, y = lrGround(x, z, p.y + d[1] * t + lrEyeH(p) * 0.5 + 0.3);
    p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 };
    lrAddZone({ k: 'samPool', team: p.team, owner: p.i, x, y, z, r: 2.4, t: 7 });
    lrFxPush('samPool', { v: p.i, x, y, z, team: p.team, fx: p.x, fz: p.z });
  },
  // Kelp Snare, lobbed
  a2(p, dt, I, H) {
    if (!(I.a2 && p.cd.a2 <= 0)) return;
    p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    lrSpawnProj(p, 'samKelp', 16, { dy: -0.2 });
    lrFxPush('samThrow', { v: p.i, x: p.x, y: p.y + 1.4, z: p.z, kelp: 1 });
  },
  // Second Tide: every ally down (they fell less than eight seconds ago, as nobody stays down longer) back on their feet
  // with half their health, where they fell if it's within 25 m of her, else at her side; with nobody down, 150 to
  // every ally within 15 m
  ult(p) {
    const fell = LRM.P.filter(q => q.team === p.team && q !== p && q.hero && !q.alive && q.deadT > 0 && 8 - q.deadT <= 10);
    let n = 0;
    for (const q of fell) {
      let x = q.x, z = q.z;
      if (!(Math.hypot(q.x - p.x, q.z - p.z) <= 25)) {
        const a = p.yaw + Math.PI / 2 + n * 1.1 * (n % 2 ? -1 : 1), dx = -Math.sin(a), dz = -Math.cos(a), far = lrBlockRay(p.x, p.y + 1, p.z, dx, 0, dz, 2);
        x = p.x + dx * Math.max(0, Math.min(1.3, far - 0.6)); z = p.z + dz * Math.max(0, Math.min(1.3, far - 0.6));
      }
      lrhSamphireRaise(q, x, z, p); n++;
    }
    if (!n) for (const q of lrAlliesIn(p, p.x, p.z, 15)) if (Math.abs(q.y - p.y) < 5) lrHeal(q, 150, p);
    lrFxPush('samTide', { v: p.i, x: p.x, y: p.y, z: p.z, team: p.team, n });
  },
  abil: (p, k) => ({ on: p.act.k === k }),
  // a guest's own bottle and sweep, seen and heard at once (the bottle itself comes with the host's next word)
  guestFire(p, I, H) {
    if (I.alt && p.cd.alt <= 0) { p.cd.alt = H.cd.alt; p.act = { k: 'alt', t: 0 }; lrLocalFx({ k: 'samNet', v: p.i, x: p.x, y: p.y + 0.6, z: p.z, yaw: p.yaw, team: p.team }); }
    if (!(I.fire && p.fireT >= 0.8 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--; LRM.shotAt = performance.now();
    lrLocalFx({ k: 'samThrow', v: p.i, x: p.x, y: p.y + 1.4, z: p.z });
  },
  // the bot: the tide when anyone has fallen (or the crew's badly hurt); the net on anyone at arm's length; the pool
  // under the hurt (or anyone held fast); the kelp before an enemy's feet; and her bottles lobbed on the most hurt of
  // her crew, else on the enemy (the generic bot never fires them: it doesn't lob)
  bot(p, ai, B) {
    const { S, I, tg, hpF, hurt, foes, pals, at, mode } = B;
    if (p.ult >= 1 && LRM.ph === 'play') {
      const late = LRM.P.filter(q => q.team === p.team && q !== p && q.hero && !q.alive && q.deadT > 2.5).length, hurtN = pals.filter(f => f.d < 14 && f.q.hp / f.q.maxHp < 0.5).length + (hpF < 0.5 ? 1 : 0);
      if (late >= 2 || (late >= 1 && (foes.length || S.clump <= 2)) || hurtN >= 3) { I.ult = true; return; }
    }
    if (tg && p.cd.alt <= 0 && ai.tgtD < 4.2) { if (lrFacing(p, tg, 0.8)) I.alt = true; else { mode({ at: at(tg), press: 'alt', pressAt: LRM.t + 0.15, until: LRM.t + 0.3 }); return; } }
    if (p.cd.a1 <= 0) {
      const held = pals.find(f => f.d < 14 && (f.q.stun > 0 || f.q.root > 0 || f.q.slow < 0.9));
      const sore = pals.find(f => f.d < 14 && f.q.hp / f.q.maxHp < 0.6 && (pals.some(g => g !== f && Math.hypot(g.q.x - f.q.x, g.q.z - f.q.z) < 3) || Math.hypot(p.x - f.q.x, p.z - f.q.z) < 3 || f.q.hp / f.q.maxHp < 0.35));
      const w = held || sore;
      if (w) { mode({ at: at(w.q, 0), press: 'a1', pressAt: LRM.t + 0.25 }); return; }
      if (hpF < 0.45 && hurt) { mode({ at: { x: p.x - Math.sin(p.yaw) * 1.2, y: p.y, z: p.z - Math.cos(p.yaw) * 1.2 }, press: 'a1', pressAt: LRM.t + 0.2 }); return; }
    }
    // (in trouble: back to the crew, a snare at the feet of whoever's after her)
    if (hurt && hpF < 0.4) { ai.retreat = true; if (p.cd.a2 <= 0 && tg && ai.tgtD < 9) { mode({ at: { x: (p.x + tg.x) / 2, y: p.y, z: (p.z + tg.z) / 2 }, lob: 16, press: 'a2', pressAt: LRM.t + 0.2 }); return; } }
    if (p.cd.a2 <= 0 && tg && ai.tgtD > 3 && ai.tgtD < 16) { mode({ at: { x: tg.x + tg.vx * 0.5, y: tg.y, z: tg.z + tg.vz * 0.5 }, lob: 16, press: 'a2', pressAt: LRM.t + 0.25 }); return; }
    if (p.ammo > 0 && p.reload <= 0 && p.fireT >= 0.62) {
      const w = pals.find(f => f.q.alive && f.q.hp / f.q.maxHp < 0.9 && f.d < 24);
      if (w && (!tg || ai.tgtD > 6 || w.q.hp / w.q.maxHp < 0.5) && !(tg && ai.tgtD < 20 && w.q.hp / w.q.maxHp > 0.7 && Math.random() < 0.4)) { mode({ at: { x: w.q.x + w.q.vx * 0.4, y: w.q.y, z: w.q.z + w.q.vz * 0.4 }, lob: 20, press: 'fire', pressAt: LRM.t + 0.2, until: LRM.t + 0.4 }); return; }
      if (hpF < 0.5 && (!tg || ai.tgtD > 5)) { mode({ at: { x: p.x - Math.sin(p.yaw) * 1.5, y: p.y, z: p.z - Math.cos(p.yaw) * 1.5 }, lob: 20, press: 'fire', pressAt: LRM.t + 0.2, until: LRM.t + 0.4 }); return; }
      if (tg && ai.tgtD < 28) { const tt = ai.tgtD / 18 * S.lead; mode({ at: { x: tg.x + tg.vx * tt, y: tg.y, z: tg.z + tg.vz * tt }, lob: 20, press: 'fire', pressAt: LRM.t + 0.2, until: LRM.t + 0.4 }); return; }
    }
  },
  // her crosshair: a small ring, and three dots below it where a lobbed bottle drops at about 10, 20 and 30 m
  cross(c, cx, cy) { c.beginPath(); c.arc(cx, cy, 7, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, 1.5, 0, 7); c.fill(); for (const k of [1, 2, 3]) { c.beginPath(); c.arc(cx, cy + 6 + k * k * 4, 1.6, 0, 7); c.fill(); } },
});
// a fallen ally up again where it lay (x, z), with half its health, a moment's protection, its kit as at a spawn
function lrhSamphireRaise(q, x, z, a) {
  q.x = x; q.z = z; q.y = lrGround(x, z, q.y + 0.6); q.vx = q.vy = q.vz = 0; q.gnd = true;
  if (typeof lrMove === 'function') lrMove(q, 0.0001); q.vx = q.vz = 0;
  const H = LR_HEROES[q.hero];
  q.alive = true; q.deadT = 0; q.hp = Math.ceil(q.maxHp * 0.5); q.spawnT = 1; q.reload = 0; q.ammo = H ? H.mag : q.ammo; q.act = { k: null, t: 0 }; lrClearStatus(q); q.hitBy = {};
  if (H && H.reset) H.reset(q, 'spawn');
  q.px = q.x; q.py = q.y; q.pz = q.z; q.sn++;
  if (q.ai) { q.ai.path = null; q.ai.stuckT = 0; }
  if (a) { a.heal += q.hp; }
  lrFxPush('samRise', { x: q.x, y: q.y, z: q.z, team: q.team, v: q.i, a: a ? a.i : -1 });
}
// the brine bottle: lobbed; it bursts on the ground or an enemy: 40 to enemies within 3.5 m, 70 to allies (to her only
// while she's under half)
lrDefProj('samBottle', { step(j, dt, M) {
  const l = lrLobLand(j, M); if (!l) return false;
  const a = M.a, x = l.met && l.h.p ? l.h.x : l.x, y = l.met && l.h.p ? l.h.y : l.y + 0.2, z = l.met && l.h.p ? l.h.z : l.z;
  for (const q of LRM.P) {
    if (!q.alive || Math.hypot(q.x - x, q.z - z) > 3.5 + q.r || y < q.y - 1.5 || y > q.y + q.h + 1.5) continue;
    if (q.team !== j.team) lrHurt(q, 40, a, 'samBottle');
    else if (q === a) { const cap = q.maxHp * 0.5 - q.hp; if (cap > 0) lrHeal(q, Math.min(70, cap), a); }
    else lrHeal(q, 70, a);
  }
  for (const w of LRM.walls) if (w.team !== j.team && Math.hypot(w.x - x, w.z - z) < 3.5 + w.w / 2 && Math.abs(w.y + 1 - y) < 3) lrWallHurt(w, 40, a);
  lrFxPush('samSplash', { x, y, z, team: j.team, a: j.owner });
  return true;
} });
// the kelp: lobbed through bodies; it lies where it lands, 2 m across, for 15 s (her oldest goes if she has two down)
lrDefProj('samKelp', { step(j, dt, M) {
  const l = lrLobLand(j, M, true); if (!l) return false;
  const mine = LRM.zones.filter(z => z.k === 'samKelp' && z.owner === j.owner && z.t > 0).sort((a, b) => a.id - b.id);
  while (mine.length >= 2) mine.shift().t = 0;
  lrAddZone({ k: 'samKelp', team: j.team, owner: j.owner, x: l.x, y: l.y, z: l.z, r: 2, t: 15 });
  lrFxPush('samKelpDown', { x: l.x, y: l.y, z: l.z, team: j.team });
  return true;
} });
// the rockpool: 40 a second to allies in it, and it washes off their slows, stuns and roots
lrDefZone('samPool', { touch(z, q, dt, a) {
  if (q.team !== z.team) return;
  lrHeal(q, 40 * dt, a);
  for (const k in q.slows) if (q.slows[k][0] < 1) delete q.slows[k];
  if (q.stun > 0 || q.root > 0) { q.stun = 0; q.root = 0; }
} });
// the snare: the first enemy to step in it (who can be held) is rooted for a second and a half, and it's spent
lrDefZone('samKelp', { touch(z, q, dt, a) {
  if (z.t <= 0 || q.team === z.team || q.spawnT > 0) return;
  if (lrRoot(q, 1.5, a)) { z.t = 0; lrFxPush('samSnare', { x: q.x, y: q.y, z: q.z, team: z.team, v: q.i, a: z.owner }); }
} });
lrDefEvent('samThrow', { own: true, sound: (f, at) => at(f.kelp ? 'throw' : 'samThrow') });
lrDefEvent('samSplash', { sound: (f, at) => at('samSplash') });
lrDefEvent('samNet', { own: true, sound: (f, at) => at('samNet') });
lrDefEvent('samPool', { sound: (f, at) => at('samPool', 1.1) });
lrDefEvent('samKelpDown', { sound: (f, at) => at('samKelp', 0.8) });
lrDefEvent('samSnare', { sound: (f, at) => at('samSnare') });
lrDefEvent('samTide', { sound: (f, at) => at('samTide', 1.5), shake: (f, me) => me.team === f.team && Math.hypot(f.x - me.x, f.z - me.z) < 15 ? 0.25 : 0 });
lrDefEvent('samRise', { sound: (f, at) => at('samRise', 1.2) });
lrDefSnd('samThrow', (v, e, rec, o) => { noise('bandpass', 1300, 1.4, 0.02, 0.14 * v, 0.2, o); tone(2400, 'triangle', 0.002, 0.05 * v, 0.08, { pan: e.pan, delay: 0.02 }); tone(3100, 'triangle', 0.002, 0.03 * v, 0.06, { pan: e.pan, delay: 0.06 }); });
lrDefSnd('samSplash', (v, e, rec, o) => { if (!rec('splash', 0.55 * v)) noise('lowpass', 900, 0.8, 0.002, 0.4 * v, 0.35, o); noise('highpass', 5200, 1, 0.001, 0.18 * v, 0.12, o); for (const [f, d] of [[3200, 0], [4100, 0.03], [3700, 0.07]]) tone(f, 'triangle', 0.001, 0.05 * v, 0.09, { pan: e.pan, delay: d }); });
lrDefSnd('samNet', (v, e, rec, o) => { if (!rec('swish', 0.6 * v)) noise('bandpass', 900, 1.2, 0.01, 0.25 * v, 0.22, Object.assign({ to: 2400 }, o)); noise('bandpass', 400, 2, 0.02, 0.08 * v, 0.2, o); });
lrDefSnd('samPool', (v, e, rec, o) => { if (!rec('splash', 0.7 * v, { rate: 0.8 })) noise('lowpass', 700, 0.8, 0.005, 0.45 * v, 0.5, o); for (let i = 0; i < 4; i++) tone(260 + i * 90, 'sine', 0.005, 0.06 * v, 0.12, { to: 520 + i * 140, pan: e.pan, delay: 0.15 + i * 0.09 }); });
lrDefSnd('samKelp', (v, e, rec, o) => { if (!rec('splat', 0.5 * v)) noise('lowpass', 500, 1, 0.003, 0.3 * v, 0.25, o); });
lrDefSnd('samSnare', (v, e, rec, o) => { if (!rec('splat', 0.7 * v, { rate: 0.7 })) noise('lowpass', 380, 1, 0.003, 0.4 * v, 0.3, o); noise('bandpass', 1500, 3, 0.02, 0.1 * v, 0.3, o); });
lrDefSnd('samTide', (v, e, rec, o) => { if (!rec('wavesweep', 0.9 * v)) noise('lowpass', 600, 0.7, 0.4, 0.5 * v, 1.2, Object.assign({ to: 200 }, o)); [262, 330, 392, 523].forEach((f, i) => tone(f, 'sine', 0.08, 0.08 * v, 1.4, { pan: e.pan, delay: i * 0.12 })); });
lrDefSnd('samRise', (v, e, rec, o) => { if (!rec('splash', 0.6 * v, { rate: 1.2 })) noise('lowpass', 1000, 0.8, 0.01, 0.35 * v, 0.4, o); tone(330, 'sine', 0.02, 0.12 * v, 0.7, { to: 990, pan: e.pan }); tone(495, 'sine', 0.02, 0.08 * v, 0.7, { to: 1320, pan: e.pan, delay: 0.1 }); });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
// the shrimping net's head into batch b: a D of bent ash on the pole's top (y top), its twine bag trailing behind
// (+z), cork floats in the crew's colour (col); and the twine as lines over it (returned, to add to the same node)
function lrhSamphireNet(b, top, col) {
  b.L.add('cyl:6', 0x8a6a40, 0, top / 2 - 0.4, 0, 0, 0, 0, 0.017, top + 0.8, 0.017);
  b.L.add('cone:6', 0x5a4a30, 0, -0.82, 0, Math.PI, 0, 0, 0.02, 0.05, 0.02);
  b.L.add('box', 0x6a5030, 0, top, 0, 0, 0, 0, 0.5, 0.03, 0.03);
  b.L.add('arc:14:0.07', 0x6a5030, 0, top, 0, 0, 0, 0, 0.25, 0.25, 0.25);
  for (const a of [0.5, 1.57, 2.64]) b.L.add('sph:6', col, Math.cos(a) * 0.25, top + Math.sin(a) * 0.25, 0, 0, 0, 0, 0.03, 0.03, 0.03);
  b.L.add('box', col, 0.03, top - 0.12, -0.02, 0, 0, 0.2, 0.05, 0.16, 0.01);
  b.L.add('box', 0x8a6a40, 0, top - 0.04, -0.012, 0, 0, 0, 0.04, 0.05, 0.03);
  const cg = new THREE.ConeGeometry(1, 1, 12, 5, true), w = new THREE.Group(), bag = new THREE.Mesh(cg, new THREE.MeshLambertMaterial({ color: 0xd8d0b0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  w.add(bag); w.add(new THREE.LineSegments(new THREE.WireframeGeometry(cg), new THREE.LineBasicMaterial({ color: 0xe8e0c0 })));
  w.rotation.x = Math.PI / 2; w.position.set(0, top + 0.11, 0.24); w.scale.set(0.2, 0.46, 0.15); return w;
}
// a bottle of brine (glowing a little) with its cork wrapped in the crew's colour
function lrhSamphireBottle(b, col, s) {
  s = s || 1;
  b.L.add('cyl:8', 0x2e7a5a, 0, 0, 0, 0, 0, 0, 0.035 * s, 0.11 * s, 0.035 * s); b.L.add('cyl:8:0.4', 0x2e7a5a, 0, 0.07 * s, 0, 0, 0, 0, 0.035 * s, 0.03 * s, 0.035 * s);
  b.L.add('cyl:6', 0x2e7a5a, 0, 0.1 * s, 0, 0, 0, 0, 0.013 * s, 0.04 * s, 0.013 * s); b.L.add('cyl:6', 0xc8a070, 0, 0.13 * s, 0, 0, 0, 0, 0.012 * s, 0.025 * s, 0.012 * s);
  b.L.add('cyl:6', col, 0, 0.115 * s, 0, 0, 0, 0, 0.016 * s, 0.015 * s, 0.016 * s);
  b.G.add('cyl:8', 0x6af0c8, 0, -0.01 * s, 0, 0, 0, 0, 0.028 * s, 0.07 * s, 0.028 * s);
}
// two nodes' worth of a point: the point in the inner node's space, in the outer node's parent's
const lrhSamphireAt = (outer, inner, x, y, z, out) => { outer.updateMatrix(); inner.updateMatrix(); return out.set(x, y, z).applyMatrix4(inner.matrix).applyMatrix4(outer.matrix); };
// ---------- Samphire: the shore-wife ----------
function lrhSamphire(team) {
  const m = lrhRig('samphire', team), TC = m.TC, t = m.team;
  const shawl = t ? TC.main : TC.main, fringe = t ? 0x1e1a18 : TC.trim, skirt = t ? 0x2a2522 : 0x2c5a86, hem = t ? TC.main : TC.main, band = t ? TC.main : TC.trim;
  const skin = 0xc48a68, blouse = 0xe6dcc4, straw = 0xd8b870, straw2 = 0xb08a50, hair = 0xa8a098, boot = 0x26332c, wick = 0x9a7a48, wick2 = 0x6a5030;
  lrhLegs(m, 0.095, 0.44, 0.42, (L, S, s, a, b) => {
    L.L.add('cyl:8:1.2', 0x4a3a34, 0, -a / 2, 0, 0, 0, 0, 0.068, a, 0.068);                              // woollen stockings
    S.L.add('cyl:8:1.18', boot, 0, -b * 0.48, 0, 0, 0, 0, 0.07, b * 0.86, 0.07);                          // sea boots to the knee
    S.L.add('cyl:8', 0x33443a, 0, -0.04, 0, 0, 0, 0, 0.085, 0.08, 0.085);
    S.L.add('box', boot, 0, -b + 0.04, -0.05, 0, 0, 0, 0.11, 0.08, 0.25);
  });
  // the skirt kilted up to the knee over a striped petticoat, the gathered roll of it at the hips, a sacking apron
  m.skirt = lrhNode(m.hips, 0, 0.06, 0, 'skirt');
  { const K = m.P(m.skirt);
    K.L.add('cyl:12:0.62', skirt, 0, -0.22, 0, 0, 0, 0, 0.25, 0.42, 0.22);
    K.L.add('cyl:12', hem, 0, -0.42, 0, 0, 0, 0, 0.252, 0.05, 0.222);
    K.L.add('cyl:12', 0xe8dccc, 0, -0.47, 0, 0, 0, 0, 0.24, 0.05, 0.21); K.L.add('cyl:12', 0xa83a30, 0, -0.475, 0, 0, 0, 0, 0.242, 0.015, 0.212);
    K.L.add('tor:12:0.4', skirt, 0, -0.02, 0, Math.PI / 2, 0, 0, 0.17, 0.15, 0.13);
    K.L.add('box', 0x9a8a68, 0, -0.2, -0.17, -0.18, 0, 0, 0.22, 0.38, 0.015); K.L.add('box', 0x7a6a48, 0, -0.39, -0.205, -0.18, 0, 0, 0.22, 0.02, 0.016);
    K.L.add('box', 0x7a5a3a, -0.08, -0.12, -0.19, -0.18, 0, 0, 0.08, 0.08, 0.02); }
  m.spine = lrhNode(m.hips, 0, 0.05, 0, 'spine');
  const sp = m.P(m.spine);
  sp.L.add('cyl:10:1.15', blouse, 0, 0.18, 0, 0, 0, 0, 0.14, 0.44, 0.11);
  sp.L.add('box', 0x5a3a28, 0, 0.1, -0.095, 0, 0, 0, 0.16, 0.2, 0.03); for (let k = 0; k < 4; k++) sp.L.add('box', 0xd8c8a0, 0, 0.03 + k * 0.045, -0.112, 0, 0, k % 2 ? 0.6 : -0.6, 0.05, 0.006, 0.004);
  // the shawl over her shoulders, a point down her back, knotted in front, fringed
  sp.L.add('cyl:12:0.45', shawl, 0, 0.32, 0.0, 0, 0, 0, 0.23, 0.22, 0.17);
  sp.L.add('box', shawl, 0, 0.2, 0.12, 0, 0, Math.PI / 4, 0.24, 0.24, 0.025);
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.36; sp.L.add('box', fringe, Math.sin(a) * 0.225, 0.2, Math.cos(a) * 0.165, 0, a, 0, 0.012, 0.07, 0.006); }
  for (let k = 0; k < 5; k++) sp.L.add('box', fringe, (k - 2) * 0.03, 0.03 + Math.abs(k - 2) * 0.035, 0.135, 0, 0, 0, 0.01, 0.07, 0.006);
  sp.L.add('sph:6', shawl, 0, 0.3, -0.15, 0, 0, 0, 0.05, 0.045, 0.035); for (const s of [-1, 1]) sp.L.add('box', shawl, s * 0.03, 0.22, -0.15, 0, 0, s * 0.3, 0.05, 0.13, 0.02);
  sp.L.add('cyl:10', skin, 0, 0.44, -0.01, 0, 0, 0, 0.06, 0.07, 0.06);
  // the creel on her back: wicker, bands, a crab on the rim; kelp and bottles in it; leather straps over her shoulders
  m.creel = lrhNode(m.spine, 0, 0.2, 0.22, 'creel');
  { const C = m.P(m.creel);
    C.L.add('cyl:10:1.25', wick, 0, 0, 0, 0, 0, 0, 0.14, 0.38, 0.12); for (let k = 0; k < 4; k++) C.L.add('cyl:10', wick2, 0, -0.15 + k * 0.1, 0, 0, 0, 0, 0.13 + k * 0.012, 0.02, 0.11 + k * 0.01);
    C.L.add('tor:12:0.15', wick2, 0, 0.19, 0, Math.PI / 2, 0, 0, 0.175, 0.15, 0.17);
    for (const [x, z, h, rz, c] of [[-0.06, 0.02, 0.36, -0.3, 0x2e5a2a], [0.05, 0.04, 0.3, 0.4, 0x4a6a2a], [0.0, -0.05, 0.42, 0.1, 0x3a5a22]]) C.L.add('box', c, x + Math.sin(rz) * h * 0.4, 0.19 + h * 0.4, z, 0, 0.3, rz, 0.05, h, 0.012);
    for (const [x, z, c] of [[0.07, -0.05, 0x2e7a5a], [-0.08, -0.04, 0x6a3a1a], [0.02, 0.07, 0x2e7a5a]]) { C.L.add('cyl:8', c, x, 0.2, z, 0.1, 0, x * 2, 0.03, 0.16, 0.03); C.L.add('cyl:6', 0xc8a070, x + x * 0.2, 0.3, z, 0, 0, 0, 0.012, 0.03, 0.012); }
    C.L.add('sph:8', 0xc8482a, 0.12, 0.2, 0.08, 0, 0, 0, 0.045, 0.025, 0.035); for (const s of [-1, 1]) C.L.add('cone:5', 0xd85a32, 0.12 + s * 0.04, 0.21, 0.04, -1.2, s * 0.4, 0, 0.018, 0.05, 0.018);
    C.L.add('box', band, 0, 0.0, 0.135, 0, 0, 0, 0.24, 0.05, 0.01); }
  for (const s of [-1, 1]) { sp.L.add('box', LRH_LEATH, s * 0.1, 0.36, 0.04, 0, 0, 0, 0.04, 0.03, 0.3); sp.L.add('box', LRH_LEATH, s * 0.1, 0.22, -0.11, 0, 0, 0, 0.04, 0.26, 0.012); }
  m.head = lrhNode(m.spine, 0, 0.47, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('sph:10', skin, 0, 0.11, 0, 0, 0, 0, 0.1, 0.115, 0.105);
  hd.L.add('cone:4', 0xb07858, 0, 0.09, -0.112, -Math.PI / 2, Math.PI / 4, 0, 0.022, 0.045, 0.022);
  for (const s of [-1, 1]) { hd.L.add('sph:4', 0x201814, s * 0.038, 0.13, -0.096, 0, 0, 0, 0.011); hd.L.add('sph:5', 0xd06a5a, s * 0.06, 0.08, -0.08, 0, 0, 0, 0.025, 0.018, 0.012); hd.L.add('sph:6', hair, s * 0.085, 0.1, 0.03, 0, 0, s * 0.2, 0.025, 0.06, 0.05); hd.L.add('box', 0x8a5a44, s * 0.04, 0.155, -0.098, 0, 0, s * -0.15, 0.04, 0.01, 0.01); }
  hd.L.add('sph:8', hair, 0, 0.1, 0.12, 0, 0, 0, 0.055, 0.055, 0.05); hd.L.add('tor:8:0.4', 0x8a8278, 0, 0.1, 0.12, 0, 0, 0, 0.04); hd.L.add('sph:8', hair, 0, 0.15, 0.04, 0, 0, 0, 0.1, 0.06, 0.09);
  hd.L.add('box', 0x8a5a44, 0, 0.055, -0.103, 0, 0, 0, 0.04, 0.008, 0.008);
  // the wide straw hat, its band in the crew's colour, gull feathers stuck in it
  m.hat = lrhNode(m.head, 0, 0.19, 0, 'hat'); m.hat.rotation.set(0.12, 0, 0.05);
  { const T = m.P(m.hat);
    T.L.add('cyl:18', straw, 0, 0, 0, 0, 0, 0, 0.28, 0.016, 0.27); T.L.add('cyl:18', straw2, 0, -0.002, 0, 0, 0, 0, 0.29, 0.012, 0.28);
    for (let k = 0; k < 3; k++) T.L.add('cyl:18', straw2, 0, 0.009, 0, 0, 0, 0, 0.27 - k * 0.05, 0.004, 0.26 - k * 0.05);
    T.L.add('cyl:12:0.88', straw, 0, 0.055, 0, 0, 0, 0, 0.115, 0.1, 0.11); T.L.add('cyl:12', band, 0, 0.03, 0, 0, 0, 0, 0.118, 0.035, 0.113);
    for (const [x, z, ry, rz, c] of [[0.1, 0.04, 0.4, -0.5, 0xf4f4ee], [0.09, 0.07, 0.8, -0.35, 0xc8ccd4], [0.11, 0.0, 0.1, -0.65, 0xf4f4ee]]) { T.L.add('box', c, x + 0.07, 0.1, z + 0.03, 0.3, ry, rz, 0.03, 0.22, 0.006); T.L.add('box', 0x2a2a2e, x + 0.12, 0.19, z + 0.06, 0.3, ry, rz, 0.031, 0.05, 0.007); } }
  lrhArms(m, 0.17, 0.4, 0, 0.27, 0.26, (A, F, H, s) => {
    A.L.add('sph:8', shawl, 0, 0, 0, 0, 0, 0, 0.065, 0.06, 0.065);
    A.L.add('cyl:8:1.1', blouse, 0, -0.135, 0, 0, 0, 0, 0.05, 0.27, 0.05);
    F.L.add('cyl:8', blouse, 0, -0.02, 0, 0, 0, 0, 0.058, 0.06, 0.058);                                // sleeves rolled to the elbow
    F.L.add('cyl:8', skin, 0, -0.13, 0, 0, 0, 0, 0.04, 0.22, 0.04);
    H.L.add('box', skin, 0, -0.035, 0, 0, 0, 0, 0.05, 0.075, 0.065);
  });
  // the shrimping net on its long pole, in her right hand
  m.net = lrhNode(m.spine, 0.26, 0.0, -0.12, 'net'); m.net.rotation.order = 'YXZ'; m.netIn = lrhNode(m.net, 0, 0, 0, 'netIn');
  m.netIn.add(lrhSamphireNet(m.P(m.netIn), 1.15, TC.main));
  // in her left hand: a bottle of brine (and while she throws them, shells for the pool, a tangle of kelp)
  m.bottle = lrhNode(m.handL, 0, -0.1, 0); lrhSamphireBottle(m.P(m.bottle), TC.main);
  m.shells = lrhNode(m.handL, 0, -0.09, 0); { const B = m.P(m.shells); B.L.add('ico', 0x8a8478, 0, 0, 0, 0.3, 0.2, 0, 0.05, 0.04, 0.05); B.L.add('sph:6', 0xf0c8c0, 0.04, 0.02, 0, 0, 0, 0.5, 0.03, 0.015, 0.03); } m.shells.visible = false;
  m.kelp = lrhNode(m.handL, 0, -0.1, 0); { const B = m.P(m.kelp); B.L.add('tor:8:0.35', 0x2e5a2a, 0, 0, 0, 0.6, 0, 0.3, 0.06); B.L.add('tor:8:0.35', 0x4a6a2a, 0, 0.01, 0, -0.5, 1.2, 0, 0.055); B.L.add('sph:5', 0xb89a40, 0.05, 0.02, 0.02, 0, 0, 0, 0.02); } m.kelp.visible = false;
  m.muzzle = lrhNode(m.handL, 0, -0.1, 0, 'muzzle');
  m.anim = lrhSamphireAnim;
  return m.finish();
}

function lrhSamphireAnim(m, pose, dt) {
  lrhBase(m, pose, dt);
  const act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, st = m.st, r = Math.min(1, st.run);
  const V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() }), net = m.net, nin = m.netIn;
  m.spine.rotation.x += p * 0.15; m.head.rotation.x += p * 0.55 - m.spine.rotation.x * 0.5;
  // the net carried upright like a staff in her right hand, the head above her shoulder
  net.position.set(0.26, 0.0, -0.12); net.rotation.set(-0.08 - r * 0.25, 0, -0.1); nin.position.set(0, 0, 0);
  let TR = null, TL = V.a.set(-0.2, 0.06 + Math.sin(st.ph) * 0.05 * r, -0.16 + Math.sin(st.ph) * 0.1 * r), bottle = true;
  // a bottle lobbed: flung forward and up from the shoulder, and another fetched from the creel
  const fz = pose.fire != null && pose.fire >= 0 && pose.fire < 0.6;
  if (fz) {
    const f = pose.fire, out = lrhSm(0, 0.12, f), back = lrhSm(0.2, 0.55, f);
    TL = V.a.set(lrhLerp(-0.24, -0.16, out), lrhLerp(0.58, 0.62, out), lrhLerp(0.12, -0.5, out)).lerp(V.c.set(-0.2, 0.06, -0.16), back);
    m.spine.rotation.y += (0.3 - 0.6 * out) * (1 - back); bottle = f < 0.04 || f > 0.4;
  }
  // the reload: a hand back over her shoulder into the creel, and out with another
  if (pose.reload > 0) { const w = Math.sin(pose.reload * 10) * 0.03; TL = V.a.set(-0.12 + w, 0.62, 0.12 + w); m.head.rotation.y = -0.3; m.spine.rotation.y += 0.25; bottle = pose.reload < 0.5; }
  // the Shrimp Net: swept low across before her from right to left, both hands on the pole near its butt
  if (k === 'alt' && t < 0.45) {
    const u = lrhSm(0, 0.38, t), w = Math.sin(Math.min(1, t / 0.45) * Math.PI);
    net.position.set(0.05, 0.1, -0.12); net.rotation.set(-Math.PI / 2 - 0.35, lrhLerp(-1.1, 1.1, u), 0); nin.position.set(0, 0.55 * Math.min(1, w * 3), 0);
    m.spine.rotation.y += lrhLerp(-0.5, 0.5, u); m.spine.rotation.x += 0.15; m.hips.position.y -= 0.05;
    TR = lrhSamphireAt(net, nin, 0, -0.75, 0, V.b); TL = lrhSamphireAt(net, nin, 0, -0.45, 0, V.a); bottle = false;
  }
  // the Rockpool: shells flung down where it's to be, the pole jabbed at the spot
  m.shells.visible = k === 'a1' && t < 0.22;
  if (k === 'a1' && t < 0.7) { const w = lrhSm(0, 0.15, t), th = lrhSm(0.15, 0.3, t), back = lrhSm(0.45, 0.7, t); TL = V.a.set(-0.2, lrhLerp(lrhLerp(0.06, 0.5, w), 0.2, th), lrhLerp(lrhLerp(-0.16, 0.15, w), -0.6, th)).lerp(V.c.set(-0.2, 0.06, -0.16), back); m.spine.rotation.x += 0.3 * th * (1 - back); net.rotation.x -= 0.5 * th * (1 - back); bottle = false; }
  // the Kelp Snare: tossed underarm
  m.kelp.visible = k === 'a2' && t < 0.3;
  if (k === 'a2' && t < 0.6) { const w = lrhSm(0, 0.16, t), th = lrhSm(0.16, 0.3, t), back = lrhSm(0.38, 0.6, t); TL = V.a.set(-0.22, lrhLerp(lrhLerp(0.02, -0.2, w), 0.4, th), lrhLerp(lrhLerp(-0.1, 0.25, w), -0.5, th)).lerp(V.c.set(-0.2, 0.06, -0.16), back); bottle = false; }
  // the Second Tide: the net raised high over her head in both hands, then swept down before her like a breaking wave
  if (k === 'ult' && t < 1.4) {
    const up = lrhSm(0, 0.35, t), dn = lrhSm(0.7, 0.95, t), off = lrhSm(1.15, 1.4, t), f = up * (1 - off);
    net.position.lerp(V.c.set(0.45, lrhLerp(0.85, 0.55, dn), lrhLerp(-0.05, -0.3, dn)), f); net.rotation.set(lrhLerp(net.rotation.x, -0.9 * dn, f), 0, lrhLerp(net.rotation.z, Math.PI / 2, f));
    m.head.rotation.x -= 0.35 * up * (1 - dn); m.spine.rotation.x += (-0.15 * up + 0.35 * dn) * (1 - off);
    if (f > 0.05) { TR = lrhAt(net, 0, -0.05, 0, V.b); TL = lrhAt(net, 0, 0.5, 0, V.a); }
    bottle = false;
  }
  m.bottle.visible = bottle;
  // the skirt swings as she goes
  m.skirt.rotation.set(-0.06 * r - st.air * 0.15 + Math.sin(st.ph * 2) * 0.03 * r, 0, Math.sin(st.ph) * 0.04 * r);
  if (!TR) TR = lrhAt(net, 0, 0, 0, V.b);
  if (lrhDead(m, pose, -1)) { TL = V.a.set(-0.45, 0.25, -0.1); TR = V.b.set(0.45, 0.25, -0.1); net.position.set(0.5, -0.3, -0.2); net.rotation.set(1.3, 0, 0.3); m.bottle.visible = false; }
  lrhHands(m, TL, TR);
}

// the hands, the net and the bottle in first person: the net's pole up from the lower right, a bottle in her left hand
// at the lower left (V: what src/lrhero.js's lrViewModel gives a view to build in)
function lrhSamphireView(V) {
  const { root, st, mk, B } = V; let muzzle, anim;
  const me = typeof lrMe === 'function' ? lrMe() : null, TC = LRH_TEAM[me && me.team ? 1 : 0];
  const pole = mk(root, 0.26, -0.4, -0.42); pole.rotation.order = 'YXZ';
  const pin = mk(pole, 0, 0, 0), pb = B(pin); pin.add(lrhSamphireNet(pb, 0.95, TC.main));
  const hR = mk(pole, 0, 0.06, 0), r = B(hR);
  r.L.add('box', 0xc48a68, 0.0, 0, 0, 0, 0, 0, 0.055, 0.075, 0.07); r.L.add('cyl:8', 0xc48a68, 0.02, -0.07, 0.1, 2.1, 0, 0, 0.034, 0.18, 0.034); r.L.add('cyl:8', 0xe6dcc4, 0.025, -0.13, 0.2, 2.1, 0, 0, 0.05, 0.06, 0.05);
  const hL = mk(root, -0.22, -0.3, -0.4), l = B(hL);
  l.L.add('box', 0xc48a68, 0, 0, 0, 0, 0, 0, 0.055, 0.07, 0.07); l.L.add('box', 0xc48a68, 0.035, 0.015, -0.01, 0, 0, -0.5, 0.025, 0.05, 0.03); l.L.add('cyl:8', 0xc48a68, -0.01, -0.06, 0.1, 2.1, 0, 0, 0.034, 0.2, 0.034); l.L.add('cyl:8', 0xe6dcc4, -0.015, -0.12, 0.2, 2.1, 0, 0, 0.05, 0.06, 0.05);
  const bot = mk(hL, 0, 0.05, -0.01), bb = B(bot); lrhSamphireBottle(bb, TC.main, 0.9); bot.rotation.set(-0.3, 0, 0.25);
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0x6af0c8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); bg.scale.setScalar(0.14); bot.add(bg);
  const kel = mk(hL, 0, 0.06, -0.02), kb = B(kel); kb.L.add('tor:8:0.35', 0x2e5a2a, 0, 0, 0, 0.6, 0, 0.3, 0.05); kb.L.add('tor:8:0.35', 0x4a6a2a, 0, 0.01, 0, -0.5, 1.2, 0, 0.045); kb.L.add('sph:5', 0xb89a40, 0.04, 0.02, 0.02, 0, 0, 0, 0.016);
  const shl = mk(hL, 0, 0.05, -0.02), sb = B(shl); sb.L.add('ico', 0x8a8478, 0, 0, 0, 0.3, 0.2, 0, 0.04, 0.03, 0.04); sb.L.add('sph:6', 0xf0c8c0, 0.03, 0.02, 0, 0, 0, 0.5, 0.025, 0.012, 0.025);
  muzzle = mk(hL, 0, 0.08, -0.02);
  anim = (s, dt) => {
    const k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
    pole.position.set(0.27, -0.42, -0.42); pole.rotation.set(-0.22, 0, -0.12); pin.position.set(0, 0, 0);
    hL.position.set(-0.22, -0.3, -0.4); hL.rotation.set(0.15, 0, 0.25); bot.visible = true; kel.visible = false; shl.visible = false;
    const fz = s.fire != null && s.fire >= 0 && s.fire < 0.7;
    if (fz) { const f = s.fire, out = lrhSm(0, 0.12, f), down = lrhSm(0.14, 0.3, f), up = lrhSm(0.4, 0.7, f); hL.position.set(lrhLerp(-0.22, -0.1, out) * (1 - down) - 0.24 * down, lrhLerp(lrhLerp(-0.3, -0.1, out), -0.62, down) + 0.32 * up, lrhLerp(-0.4, -0.62, out) * (1 - down) - 0.4 * down); hL.rotation.x = 0.15 - 0.8 * out * (1 - down); bot.visible = f < 0.05 || f > 0.3; }
    if (s.reload > 0) { const q = Math.min(1, s.reload * 3), w = Math.sin(s.reload * 9) * 0.02; hL.position.set(-0.26 + w, -0.3 - 0.35 * q, -0.36); bot.visible = s.reload < 0.35; }
    if (k === 'alt' && t < 0.45) { const u = lrhSm(0, 0.38, t), w = Math.sin(Math.min(1, t / 0.45) * Math.PI); pole.position.set(0.08, -0.36, -0.3); pole.rotation.set(-Math.PI / 2 + 0.12, lrhLerp(-1.0, 1.0, u), 0); pin.position.set(0, 0.35 * Math.min(1, w * 3), 0); hL.position.set(-0.1 + 0.2 * u, -0.4, -0.32); bot.visible = false; }
    if (k === 'a1' && t < 0.7) { const w = lrhSm(0, 0.15, t), th = lrhSm(0.15, 0.3, t), back = lrhSm(0.45, 0.7, t); shl.visible = t < 0.22; bot.visible = false; hL.position.set(-0.18, lrhLerp(lrhLerp(-0.3, -0.12, w), -0.35, th) * (1 - back) - 0.3 * back, lrhLerp(lrhLerp(-0.4, -0.3, w), -0.7, th) * (1 - back) - 0.4 * back); pole.rotation.x -= 0.25 * th * (1 - back); }
    if (k === 'a2' && t < 0.6) { const w = lrhSm(0, 0.16, t), th = lrhSm(0.16, 0.3, t), back = lrhSm(0.38, 0.6, t); kel.visible = t < 0.3; bot.visible = false; hL.position.set(-0.2, lrhLerp(lrhLerp(-0.3, -0.45, w), -0.12, th) * (1 - back) - 0.3 * back, lrhLerp(lrhLerp(-0.4, -0.3, w), -0.65, th) * (1 - back) - 0.4 * back); }
    if (k === 'ult' && t < 1.4) { const up = lrhSm(0, 0.35, t), dn = lrhSm(0.7, 0.95, t), off = lrhSm(1.15, 1.4, t), f = up * (1 - off); pole.position.set(lrhLerp(0.27, 0.35, f), lrhLerp(-0.42, lrhLerp(0.05, -0.3, dn), f), -0.5); pole.rotation.set(lrhLerp(-0.22, -0.9 * dn, f), 0, lrhLerp(-0.12, Math.PI / 2, f)); hL.position.set(-0.22, lrhLerp(-0.3, lrhLerp(0.02, -0.3, dn), f), -0.45); bot.visible = f < 0.2; }
    st.t += dt; bg.material.opacity = 0.3 + Math.sin(st.t * 3) * 0.1;
  };
  return { muzzle, anim };
}
lrDefHeroArt('samphire', { spec: { h: 1.7, hipY: 0.88, stride: 1.55, spd: 5.5 }, model: lrhSamphire, view: lrhSamphireView, portraitY: 0.3 });

// the bottle in flight, turning end over end, dripping brine; the tangle of kelp likewise
lrDefProjArt('samBottle', (g, TC, add) => {
  const B = lrBatch(); lrhSamphireBottle(B, TC.main, 2.2); const body = add(new THREE.Group()); body.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
  const G = lrBatch(); G.add('cyl:8', 0x6af0c8, 0, -0.02, 0, 0, 0, 0, 0.062, 0.15, 0.062); body.add(G.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0x6af0c8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }))); s.scale.setScalar(0.7);
  lrhTrailer(g, s, 5, new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0x9af8e0, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }), 0.35); g.userData.point = false;
  g.children.forEach(c => { if (c.isSprite && c !== s) c.scale.setScalar(0.18); });
  const t0 = performance.now(); s.onBeforeRender = () => { const u = (performance.now() - t0) / 1000; body.rotation.set(u * 11, u * 2, 0.4); body.updateMatrixWorld(true); };
});
lrDefProjArt('samKelp', (g, TC, add) => {
  const B = lrBatch();
  B.add('ico', 0x2a4a22, 0, 0, 0, 0, 0, 0, 0.13); B.add('tor:8:0.3', 0x2e5a2a, 0, 0, 0, 0.6, 0, 0.3, 0.17); B.add('tor:8:0.3', 0x4a6a2a, 0, 0, 0, -0.5, 1.2, 0, 0.16); B.add('tor:8:0.3', 0x3a5a22, 0, 0, 0, 1.4, 0.4, 0.8, 0.15);
  for (const [x, y, z] of [[0.12, 0.05, 0.04], [-0.1, 0.08, -0.05], [0.02, -0.12, 0.08]]) B.add('sph:5', 0xb89a40, x, y, z, 0, 0, 0, 0.035);
  B.add('box', TC.main, 0, 0.15, 0, 0, 0, 0.3, 0.03, 0.12, 0.01);
  const body = add(new THREE.Group()); body.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
  lrhTrailer(g, body.children[0], 4, new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0x6a9a5a, transparent: true, opacity: 0.3, depthWrite: false }), 0.4); g.userData.point = false;
  g.children.forEach(c => { if (c.isSprite) c.scale.setScalar(0.2); });
  const t0 = performance.now(), m0 = body.children[0], ob = m0.onBeforeRender; m0.onBeforeRender = (...a) => { const u = (performance.now() - t0) / 1000; body.rotation.set(u * 7, u * 4, 0); body.updateMatrixWorld(true); ob(...a); };
});
// the rockpool: a ring of stones round still water, weed and anemones and a starfish in it, ripples and bubbles, and
// a glow in the crew's colour at its rim
lrDefZoneArt('samPool', (g, TC, spr) => {
  const R = 2.4, B = lrBatch(), K = new THREE.Group(); g.add(K);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + Math.sin(k * 7) * 0.1, s = 0.2 + ((k * 37) % 7) * 0.035; B.add('ico', k % 3 ? 0x6a6458 : 0x8a7e6a, Math.cos(a) * (R + 0.05), s * 0.35, Math.sin(a) * (R + 0.05), k, k * 2, 0, s, s * 0.7, s * 0.9); }
  for (let k = 0; k < 6; k++) { const a = k * 1.9, d = 0.6 + (k % 3) * 0.5; B.add('box', k % 2 ? 0x2e5a2a : 0x4a6a2a, Math.cos(a) * d, 0.12, Math.sin(a) * d, 0, a, 0.3, 0.05, 0.28, 0.01); }
  for (const [x, z, c] of [[0.8, -0.9, 0xc83a4a], [-1.1, 0.4, 0x8a4ab0], [0.3, 1.2, 0xd8604a], [-0.5, -1.3, 0x4ab070]]) { B.add('sph:6', c, x, 0.05, z, 0, 0, 0, 0.08, 0.05, 0.08); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; B.add('box', c, x + Math.cos(a) * 0.06, 0.1, z + Math.sin(a) * 0.06, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, 0.012, 0.07, 0.012); } }
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; B.add('box', 0xe8782a, -0.9 + Math.cos(a) * 0.08, 0.03, -0.3 + Math.sin(a) * 0.08, 0, -a, 0, 0.16, 0.025, 0.05); }
  K.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
  const water = new THREE.Mesh(new THREE.CircleGeometry(R, 32), new THREE.MeshPhongMaterial({ color: 0x2a7a8a, specular: 0x9af0ff, shininess: 90, transparent: true, opacity: 0.72, depthWrite: false })); water.rotation.x = -Math.PI / 2; water.position.y = 0.07; K.add(water);
  const deep = new THREE.Mesh(new THREE.CircleGeometry(R * 0.6, 24), new THREE.MeshBasicMaterial({ color: 0x0e3a48, transparent: true, opacity: 0.5, depthWrite: false })); deep.rotation.x = -Math.PI / 2; deep.position.y = 0.05; K.add(deep);
  const rim = lrhRingMesh(R + 0.15, R + 0.45, TC.glow, 0.5); K.add(rim);
  const rip = [0, 1, 2].map(() => { const m = lrhRingMesh(0.9, 1, 0xc8fff0, 0.4); m.position.y = 0.09; K.add(m); return m; });
  const bub = []; for (let k = 0; k < 10; k++) { const s = spr(0xb8fff0, 0.16, 0.7); bub.push({ s, a: Math.random() * 6.28, d: Math.random() * R * 0.9, p: Math.random() }); }
  const mist = spr(0x6af0c8, R * 2.4, 0.25); mist.position.y = 0.5;
  return (z, dt, T) => {
    const left = z.t != null ? z.t : 7, life = lrhClamp(left / 0.5, 0, 1), grow = lrhSm(0, 0.35, T);
    K.scale.setScalar(Math.max(0.01, grow * (0.7 + 0.3 * life))); K.position.y = -0.15 * (1 - life);
    rim.material.opacity = (0.35 + Math.sin(T * 4) * 0.12) * life; water.material.opacity = 0.72 * life; mist.material.opacity = 0.22 * life * grow;
    rip.forEach((m, i) => { const u = (T * 0.5 + i / 3) % 1; m.scale.setScalar(0.2 + u * R); m.material.opacity = 0.4 * (1 - u) * life; });
    for (const q of bub) { const u = (T * 0.6 + q.p) % 1; q.s.position.set(Math.cos(q.a) * q.d, 0.1 + u * 1.4, Math.sin(q.a) * q.d); q.s.material.opacity = 0.7 * Math.sin(u * Math.PI) * life * grow; }
  };
});
// the kelp lying in wait: fronds splayed on the ground, bladders, a faint ring in the crew's colour
lrDefZoneArt('samKelp', (g, TC, spr) => {
  const B = lrBatch(), K = new THREE.Group(); g.add(K);
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28 + Math.sin(k * 3) * 0.3, l = 0.7 + (k % 3) * 0.35; for (let j = 0; j < 3; j++) { const d = (j + 0.5) / 3 * l, w = a + Math.sin(j + k) * 0.35; B.add('box', [0x2e5a2a, 0x4a6a2a, 0x5a5a22][(k + j) % 3], Math.cos(w) * d, 0.03 + j * 0.005, Math.sin(w) * d, 0, -w, 0, l / 3 + 0.05, 0.015, 0.09 - j * 0.02); } B.add('sph:5', 0xb89a40, Math.cos(a) * l * 0.55, 0.05, Math.sin(a) * l * 0.55, 0, 0, 0, 0.045); }
  B.add('ico', 0x2a4a22, 0, 0.06, 0, 0, 0, 0, 0.16, 0.08, 0.16);
  K.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
  const ring = lrhRingMesh(1.85, 2.0, TC.glow, 0.25); g.add(ring);
  const glint = spr(TC.glow, 0.5, 0.3); glint.position.y = 0.2;
  return (z, dt, T) => {
    const left = z.t != null ? z.t : 15, life = lrhClamp(left / 0.4, 0, 1), grow = lrhSm(0, 0.3, T);
    K.scale.set(grow, 1, grow); K.rotation.y = Math.sin(T * 0.7) * 0.05; ring.material.opacity = (0.18 + Math.sin(T * 2) * 0.07) * life; glint.material.opacity = 0.25 * life;
  };
});
// the bottle bursting: brine flung up and falling, a ring in the crew's colour (3.5 m), glass glinting
lrDefFx('samSplash', (o, X) => {
  const c = X.TCol(o.team), y = X.gy(o.x, o.z) + 0.08;
  for (let k = 0; k < 16; k++) { const a = Math.random() * 6.28, sp = 1 + Math.random() * 3; X.sprite(o.x, o.y + 0.1, o.z, k % 3 ? 0x8af0e0 : 0xffffff, 0.18 + Math.random() * 0.15, 0.6 + Math.random() * 0.4, Math.cos(a) * sp, 3 + Math.random() * 3, Math.sin(a) * sp, -0.1, 14); }
  for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28; X.sprite(o.x, o.y + 0.1, o.z, 0xe8fff8, 0.08, 0.35, Math.cos(a) * 5, 2 + Math.random() * 2, Math.sin(a) * 5, 0, 12); }
  X.ring(o.x, y, o.z, 0.3, 3.5, c.glow, 0.5, 0.75); X.ring(o.x, y + 0.03, o.z, 0.2, 2.8, 0x8af0e0, 0.6, 0.6); X.sprite(o.x, o.y + 0.3, o.z, 0xc8fff0, 1.6, 0.18);
});
// the net's sweep: a ribbon of twine-coloured light drawn round before her, right to left
lrDefFx('samNet', (o, X) => {
  const yaw = o.yaw || 0;
  for (let k = 0; k < 9; k++) { const a = yaw - 1.0 + k * 0.25, d = 2.6; X.later.push([k * 0.03, () => { X.sprite(o.x - Math.sin(a) * d, o.y + 0.1, o.z - Math.cos(a) * d, 0xe8dcb0, 0.7, 0.25, 0, 0, 0, 1); X.sprite(o.x - Math.sin(a) * d * 1.4, o.y, o.z - Math.cos(a) * d * 1.4, 0xb8a880, 0.4, 0.3, -Math.sin(a) * 2, 0.5, -Math.cos(a) * 2); }]); }
});
// the pool thrown down: a splash where it falls and a line of drops from her hand to it
lrDefFx('samPool', (o, X) => {
  const c = X.TCol(o.team), y = X.gy(o.x, o.z) + 0.1;
  X.ring(o.x, y, o.z, 0.2, 2.8, 0x8af0e0, 0.7, 0.7); X.ring(o.x, y + 0.02, o.z, 0.4, 2.4, c.glow, 0.5, 0.6);
  for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28, sp = 1 + Math.random() * 2; X.sprite(o.x, y + 0.1, o.z, 0xc8fff0, 0.22, 0.8, Math.cos(a) * sp, 4 + Math.random() * 2, Math.sin(a) * sp, -0.1, 12); }
  if (o.fx != null) for (let k = 0; k < 6; k++) { const f = k / 6; X.sprite(o.fx + (o.x - o.fx) * f, y + 1.2 * Math.sin(f * Math.PI) + 0.4, (o.fz) + (o.z - o.fz) * f, 0x8af0e0, 0.2, 0.3 + f * 0.3); }
});
lrDefFx('samKelpDown', (o, X) => { const y = X.gy(o.x, o.z) + 0.08; X.ring(o.x, y, o.z, 0.2, 2, 0x6a9a5a, 0.5, 0.6); for (let k = 0; k < 8; k++) { const a = Math.random() * 6.28; X.sprite(o.x, y + 0.1, o.z, 0x5a8a4a, 0.2, 0.5, Math.cos(a) * 1.5, 2, Math.sin(a) * 1.5, -0.1, 10, true); } });
// the snare closing: kelp whipping up round whoever stepped in it
lrDefFx('samSnare', (o, X) => { const y = X.gy(o.x, o.z); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; X.rod(o.x + Math.cos(a) * 0.6, y, o.z + Math.sin(a) * 0.6, o.x + Math.cos(a + 0.8) * 0.25, y + 1.0 + (k % 3) * 0.2, o.z + Math.sin(a + 0.8) * 0.25, 0.05, k % 2 ? 0x2e6a2a : 0x5a7a2a, 1.4, 0.9); } X.burst(o.x, y + 0.4, o.z, 0x7aaa5a, 10, 2, 0.2, 0.5, 1); });
// the Second Tide: a wave rolling out from her; and for each one brought back, a column of sea water and foam
lrDefFx('samTide', (o, X) => {
  const y = X.gy(o.x, o.z) + 0.1, c = X.TCol(o.team);
  X.ring(o.x, y, o.z, 0.5, 15, 0x8af0e0, 1.1, 0.8); X.ring(o.x, y + 0.05, o.z, 0.5, 11, 0xffffff, 0.9, 0.5); X.ring(o.x, y + 0.02, o.z, 0.3, 6, c.glow, 0.7, 0.7);
  for (let k = 0; k < 24; k++) { const a = k / 24 * 6.28; X.sprite(o.x + Math.cos(a) * 1.2, y + 0.3, o.z + Math.sin(a) * 1.2, k % 2 ? 0xe8fff8 : 0x8af0e0, 0.5, 1.1, Math.cos(a) * 9, 1.2, Math.sin(a) * 9, 0.6, 2); }
  X.sprite(o.x, o.y + 1.4, o.z, 0xc8fff0, 3, 0.4);
});
lrDefFx('samRise', (o, X) => {
  const y = X.gy(o.x, o.z), c = X.TCol(o.team);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; X.rod(o.x + Math.cos(a) * 0.5, y, o.z + Math.sin(a) * 0.5, o.x + Math.cos(a) * 0.3, y + 2.6 + (k % 2) * 0.6, o.z + Math.sin(a) * 0.3, 0.09, k % 2 ? 0x8af0e0 : 0xe8fff8, 0.9, 0.6); }
  for (let k = 0; k < 18; k++) { const a = Math.random() * 6.28, sp = 0.5 + Math.random() * 2; X.sprite(o.x, y + 2.5, o.z, k % 3 ? 0xc8fff0 : c.glow, 0.25, 1, Math.cos(a) * sp, 2 + Math.random() * 2, Math.sin(a) * sp, -0.1, 9); }
  X.ring(o.x, y + 0.08, o.z, 0.4, 2.4, c.glow, 0.8, 0.8); X.ring(o.x, y + 0.1, o.z, 0.2, 1.6, 0x8af0e0, 0.6, 0.7); X.sprite(o.x, y + 1, o.z, 0xe8fff8, 2.4, 0.35);
});
