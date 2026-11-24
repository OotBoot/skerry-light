'use strict';
// The Lamp Road: Bollard, the tank. His kit (the play, on the host unless said), his bot, his crosshair, his sounds
// and events, and (below) his art: the figure, the hands and the bar in first person, the bulkhead, his effects.
// A hero file as the guide at the top of src/lr.js has it.

// ---------- the play ----------
lrDefHero({
  id: 'bollard', n: 'Bollard', title: 'The Harbourmaster', role: 'tank', hp: 600, spd: 4.8, r: 0.7, h: 2.3, mag: 0, reloadT: 0, ultCost: 1500,
  cd: { a1: 8, a2: 10, alt: 12 }, range: 4.2, melee: true, botClose: 12, actT: { a1: 0.9 }, own: ['a1'], stepVol: 1.6,
  blurb: 'A huge old harbourmaster in a riveted iron diving dress. He holds the line and takes the blows.',
  kit: {
    pri: ['Capstan Bar', 'Swing the bar: hits everyone in front of you, close in.'],
    alt: ['Bulkhead', 'Set down an iron wall ahead. It stops shots and bodies, both sides’.'],
    a1: ['Ballast Rush', 'Charge forward. Anyone in the way is hurt and shoved aside.'],
    a2: ['Brace', 'Take half damage for three seconds, and stand firm.'],
    ult: ['Spring Tide', 'Drive the anchor down: a wave ahead hurts, knocks back and slows.'],
  },
  how: { bar: 'Capstan Bar', rush: 'Ballast Rush', tide: 'Spring Tide' },
  // Capstan Bar: everyone close in front (or touching), in sight; and enemy walls ahead
  fire(p, dt, I, H) {
    if (!(I.fire && p.fireT >= 0.85)) return;
    p.fireT = 0; lrFxPush('sweep', { x: p.x, y: p.y + 1.3, z: p.z, yaw: p.yaw, v: p.i });
    const eye = { x: p.x, y: p.y + lrEyeH(p), z: p.z };
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > H.range + q.r || Math.abs(q.y - p.y) > 2.5) continue;
      const a = Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)); if (a > 0.87 && d > p.r + q.r + 0.3) continue;
      if (!lrSees(eye, { x: q.x, y: q.y + q.h * 0.6, z: q.z })) continue;
      lrHurt(q, 75, p, 'bar');
    }
    for (const w of LRM.walls) { if (w.team === p.team) continue; const dx = w.x - p.x, dz = w.z - p.z; if (Math.hypot(dx, dz) < H.range + 1 && Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) < 1) lrWallHurt(w, 75, p); }
  },
  // Bulkhead: one up at a time; its cooldown starts when it falls (the wall's gone hook)
  alt(p, dt, I, H) {
    if (!(I.alt && p.cd.alt <= 0 && !LRM.walls.some(w => w.owner === p.i))) return;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), d = Math.max(1.2, Math.min(4, lrRay(p.x, p.y + 1.2, p.z, fx, 0, fz, 4.6) - 0.6));
    const x = p.x + fx * d, z = p.z + fz * d, y = lrGround(x, z, p.y + 0.6);
    lrAddWall(p, 'bulkhead', x, y, z, p.yaw, 800, 10);
    p.cd.alt = 99; p.act = { k: 'alt', t: 0 }; lrFxPush('wall', { x, y, z, yaw: p.yaw, team: p.team, v: p.i });
  },
  // Ballast Rush (started by body, wherever he's moved): while it runs, each enemy he meets is hurt once and shoved aside
  a1(p) {
    if (!(p.act.k === 'a1' && p.act.t < 0.9)) return;
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team || p.rushHit.includes(q.i)) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > p.r + q.r + 0.5 || Math.abs(q.y - p.y) > 2) continue;
      p.rushHit.push(q.i); lrHurt(q, 50, p, 'rush');
      const rx = Math.cos(p.rushYaw), rz = -Math.sin(p.rushYaw), sd = (dx * rx + dz * rz) >= 0 ? 1 : -1;
      lrKnock(q, rx * sd * 9 - Math.sin(p.rushYaw) * 4, 3.5, rz * sd * 9 - Math.cos(p.rushYaw) * 4, 0.35);
    }
  },
  // Brace: half damage for three seconds, and firm
  a2(p, dt, I, H) { if (I.a2 && p.cd.a2 <= 0) { lrGuard(p, 0.5, 3, true); p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 }; lrFxPush('brace', { x: p.x, y: p.y + 1, z: p.z, v: p.i }); } },
  // Spring Tide: everyone in a 70 degree wedge out to 14 m, in the open: hurt, knocked back (less further off) and slowed
  ult(p) {
    lrFxPush('wave', { x: p.x, y: p.y, z: p.z, yaw: p.yaw, v: p.i });
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > 14 || Math.abs(q.y - p.y) > 3) continue;
      if (Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) > 0.61 && d > 1.5) continue;
      if (lrRay(p.x, p.y + 0.8, p.z, dx / (d || 1), 0, dz / (d || 1), d) < d - 0.3) continue;
      lrHurt(q, 120, p, 'tide');
      if (q.alive) { const k = 13 * (1 - d / 20); lrKnock(q, (dx / (d || 1)) * k, 6, (dz / (d || 1)) * k, 0.6); }
      lrSlow(q, 0.6, 3, 'tide');
    }
  },
  // (on whichever screen moves him) the rush starts, and drives him while it runs
  body(p, dt, I, H) { if (I.a1 && p.cd.a1 <= 0 && p.act.k !== 'a1') { p.act = { k: 'a1', t: 0 }; p.cd.a1 = H.cd.a1; p.rushYaw = p.yaw; p.rushHit = []; lrFxPush('rush', { x: p.x, y: p.y + 1, z: p.z, v: p.i }); } },
  move(p) { if (p.act.k === 'a1' && p.act.t < 0.9) { p.vx = -Math.sin(p.rushYaw) * 14; p.vz = -Math.cos(p.rushYaw) * 14; return true; } return false; },
  // online: a guest's own rush, seen there at once; the host told of it; a guest's own swing
  ownUse(p, k) { if (k === 'a1') lrLocalFx({ k: 'rush', x: p.x, y: p.y + 1, z: p.z, v: p.i }); },
  ownHost(p, k, u) { p.rushYaw = lrAng(u[5]); p.rushHit = []; lrFxPush('rush', { x: p.x, y: p.y + 1, z: p.z, v: p.i }); },
  guestFire(p, I) { if (I.fire && p.fireT >= 0.85) { p.fireT = 0; lrLocalFx({ k: 'sweep', x: p.x, y: p.y + 1.3, z: p.z, yaw: p.yaw, v: p.i }); } },
  // the HUD: Brace lit while it holds, the Bulkhead "up" while it stands
  abil(p, k) { const wall = k === 'alt' && LRM.walls.some(w => w.owner === p.i); return { on: (k === 'a2' && p.drT > 0) || wall, up: wall }; },
  // the bot: the tide into a clump, a wall when he's taking it at range, Brace when hurt, the rush at someone lined up
  bot(p, ai, B) {
    const { S, I, tg, hpF, hurt, at, inCone, mode } = B;
    if (p.ult >= 1 && tg && inCone(Math.atan2(-(tg.x - p.x), -(tg.z - p.z)), 12, 0.5) >= S.clump) mode({ at: at(tg), press: 'ult', pressAt: LRM.t + 0.12 });
    else if (p.cd.alt <= 0 && tg && hpF < 0.65 && hurt && ai.tgtD > 6 && ai.tgtD < 30 && !LRM.walls.some(w => w.owner === p.i)) mode({ at: at(tg), press: 'alt', pressAt: LRM.t + 0.1 });
    else if (p.cd.a2 <= 0 && hurt && hpF < 0.75) I.a2 = true;
    else if (p.cd.a1 <= 0 && tg && ai.tgtD > 4.5 && ai.tgtD < 11 && Math.abs(lrAng(Math.atan2(-(tg.x - p.x), -(tg.z - p.z)) - p.yaw)) < 0.2) I.a1 = true;
  },
  cross(c, cx, cy) { c.beginPath(); c.arc(cx, cy + 6, 30, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.beginPath(); c.arc(cx, cy, 2, 0, 7); c.fill(); },
});
// the bulkhead: 6 m by 3; when it falls (or its ten seconds are up) his cooldown starts
lrDefWall('bulkhead', { w: 6, h: 3, gone(w, o) { o.cd.alt = LR_HEROES.bollard.cd.alt; } });
lrDefEvent('sweep', { own: true, sound: (f, at) => at('swing') });
lrDefEvent('rush', { own: true, sound: (f, at) => at('rush') });
lrDefEvent('brace', { sound: (f, at) => at('brace') });
lrDefEvent('wave', { sound: (f, at) => at('wave', 1.4), shake: (f, me) => Math.hypot(f.x - me.x, f.z - me.z) < 16 ? 0.5 : 0 });
lrDefSnd('swing', (v, e, rec, o) => { if (!rec('swish', 0.8 * v, { rate: 0.7 })) noise('bandpass', 900, 1.2, 0.03, 0.3 * v, 0.25, o); });
lrDefSnd('rush', (v, e, rec, o) => { if (!rec('charge', 0.8 * v)) noise('lowpass', 300, 1, 0.05, 0.4 * v, 0.6, o); });
lrDefSnd('brace', (v, e, rec, o) => { if (!rec('chock', 0.8 * v)) tone(180, 'square', 0.001, 0.2 * v, 0.15, { pan: e.pan }); });
lrDefSnd('wave', (v, e, rec, o) => { if (!rec('wavesweep', 1 * v)) noise('lowpass', 600, 0.7, 0.05, 0.7 * v, 1.2, o); tone(55, 'sine', 0.01, 0.5 * v, 0.8, { pan: e.pan }); });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
// ---------- Bollard: the harbourmaster in his diving dress ----------
function lrhBollard(team) {
  const m = lrhRig('bollard', team), TC = m.TC, t = m.team;
  const suit = t ? 0x2e2824 : 0x2f5f8c, suit2 = t ? 0x241f1c : 0x264e74, band = TC.main, plate = t ? 0x4a3a34 : 0x4a5058, rivet = 0x7a7c80;
  // the legs: canvas, patched, laced; weighted boots with brass toes and lead soles
  lrhLegs(m, 0.27, 0.48, 0.46, (L, S, s, a, b) => {
    L.L.add('cyl:10:1.15', suit, 0, -a / 2, 0, 0, 0, 0, 0.17, a, 0.17);
    L.L.add('box', band, 0, -0.04, 0, 0, 0, 0, 0.4, 0.1, 0.4);
    S.L.add('cyl:10:1.1', suit2, 0, -b * 0.35, 0, 0, 0, 0, 0.15, b * 0.7, 0.15);
    S.L.add('box', 0x3a3a3e, 0, -b + 0.16, -0.03, 0, 0, 0, 0.32, 0.3, 0.42);
    S.L.add('box', 0x55585e, 0, -b + 0.03, -0.04, 0, 0, 0, 0.36, 0.08, 0.5);       // lead sole
    S.L.add('box', LRH_BRASS, 0, -b + 0.14, -0.23, 0, 0, 0, 0.3, 0.2, 0.08);          // brass toecap
    S.L.add('box', 0x6a4a2a, 0, -b + 0.32, 0, 0, 0, 0, 0.34, 0.06, 0.38);
  });
  m.spine = lrhNode(m.hips, 0, 0.08, 0, 'spine');
  const sp = m.P(m.spine);
  // the dress: a barrel of canvas, an iron corselet over the shoulders riveted to it, a belt of lead weights
  sp.L.add('sph:12', suit, 0, 0.3, 0, 0, 0, 0, 0.5, 0.5, 0.4);
  sp.L.add('cyl:12', suit, 0, 0.12, 0, 0, 0, 0, 0.44, 0.3, 0.36);
  sp.L.add('cyl:12:0.75', plate, 0, 0.58, 0, 0, 0, 0, 0.56, 0.22, 0.45);
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; sp.L.add('sph:4', rivet, Math.sin(a) * 0.53, 0.5, Math.cos(a) * 0.43, 0, 0, 0, 0.03); }
  sp.L.add('cyl:12', band, 0, 0.47, 0, 0, 0, 0, 0.57, 0.06, 0.46);     // a painted band round the corselet: the crew's colour
  sp.L.add('cyl:12', 0x3a3026, 0, -0.02, 0, 0, 0, 0, 0.47, 0.14, 0.39);
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * Math.PI * 2; sp.L.add('box', 0x6a6c70, Math.sin(a) * 0.47, -0.02, Math.cos(a) * 0.39, 0, a, 0, 0.14, 0.18, 0.06); }
  // a big painted plate on the chest (gold sun-lamp / rust hook) and his back plate
  sp.L.add('box', plate, 0, 0.3, -0.38, 0, 0, 0, 0.42, 0.34, 0.06);
  sp.L.add('box', band, 0, 0.3, -0.415, 0, 0, 0, 0.3, 0.22, 0.02);
  sp.L.add('box', TC.trim === 0x2a2522 ? 0x1a1614 : TC.trim, 0, 0.3, -0.43, 0, 0, Math.PI / 4, 0.1, 0.1, 0.02);
  // the helmet's three ports glow; the helmet sits on the corselet
  m.head = lrhNode(m.spine, 0, 0.72, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('sph:14', LRH_BRASS, 0, 0.2, 0, 0, 0, 0, 0.3, 0.31, 0.3);
  hd.L.add('cyl:14', 0xa07a30, 0, -0.02, 0, 0, 0, 0, 0.3, 0.1, 0.3);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; hd.L.add('sph:4', 0xe0c070, Math.sin(a) * 0.3, -0.02, Math.cos(a) * 0.3, 0, 0, 0, 0.03); }
  for (const [a, r] of [[0, 0.14], [Math.PI / 2, 0.1], [-Math.PI / 2, 0.1]]) {
    const dx = -Math.sin(a), dz = -Math.cos(a);
    hd.L.add('cyl:14', 0x8a6a28, dx * 0.27, 0.2, dz * 0.27, Math.PI / 2, a, 0, r + 0.04, 0.1, r + 0.04);
    hd.G.add('cyl:14', TC.glow, dx * 0.31, 0.2, dz * 0.31, Math.PI / 2, a, 0, r, 0.02, r);
    for (const o of [-1, 1]) hd.L.add('box', 0x6a5020, dx * 0.33 + (a === 0 ? o * r * 0.45 : 0), 0.2, dz * 0.33 + (a !== 0 ? o * r * 0.45 : 0), 0, a, 0, 0.02, r * 2, 0.02);
  }
  hd.L.add('cyl:8', LRH_BRASS, 0, 0.5, 0.06, 0, 0, 0, 0.06, 0.06, 0.06);
  hd.L.add('cyl:8', 0x8a6a28, 0.12, 0.38, 0.22, 0.6, 0, 0, 0.05, 0.12, 0.05);   // the air valve at the back
  // the arms: canvas sleeves, iron gauntlets
  lrhArms(m, 0.6, 0.48, 0, 0.42, 0.42, (A, F, H, s, a, b) => {
    A.L.add('sph:10', plate, 0, -0.02, 0, 0, 0, 0, 0.2, 0.17, 0.2);
    A.L.add('box', band, 0, 0.06, 0, 0, 0, 0, 0.3, 0.06, 0.3);
    A.L.add('cyl:10:1.1', suit, 0, -a / 2, 0, 0, 0, 0, 0.13, a, 0.13);
    F.L.add('cyl:10:1.0', suit2, 0, -b * 0.35, 0, 0, 0, 0, 0.12, b * 0.7, 0.12);
    F.L.add('cyl:10:0.85', LRH_IRON, 0, -b * 0.78, 0, 0, 0, 0, 0.16, b * 0.4, 0.16);
    for (let k = 0; k < 6; k++) { const q = k / 6 * Math.PI * 2; F.L.add('sph:4', rivet, Math.sin(q) * 0.15, -b * 0.62, Math.cos(q) * 0.15, 0, 0, 0, 0.025); }
    H.L.add('box', LRH_IRON, 0, -0.06, 0, 0, 0, 0, 0.18, 0.16, 0.2);
    H.L.add('box', 0x2c2e32, 0, -0.14, -0.04, 0, 0, 0, 0.17, 0.08, 0.14);
  });
  // the capstan bar, held from its grip at the origin, running up its +y
  m.bar = lrhNode(m.spine, 0, 0, 0, 'bar');
  const br = m.P(m.bar);
  br.L.add('cyl:8:1.25', LRH_WOOD, 0, 0.62, 0, 0, 0, 0, 0.06, 1.5, 0.06);
  for (const y of [0.02, 0.5, 1.0, 1.3]) br.L.add('cyl:8', LRH_IRON, 0, y, 0, 0, 0, 0, 0.085, 0.07, 0.085);
  br.L.add('cyl:8', LRH_IRON, 0, 1.38, 0, 0, 0, 0, 0.095, 0.06, 0.095);
  br.L.add('cyl:8', band, 0, 0.75, 0, 0, 0, 0, 0.078, 0.12, 0.078);
  m.muzzle = lrhNode(m.bar, 0, 1.3, 0, 'muzzle');
  // the anchor: on his back on a chain; and the same anchor in his hands for the Spring Tide
  const anchor = (B, y0, col) => {
    B.add('cyl:8', col, 0, y0 - 0.5, 0, 0, 0, 0, 0.055, 1.0, 0.055);                 // shank
    B.add('tor:12:0.22', col, 0, y0 + 0.06, 0, 0, Math.PI / 2, 0, 0.1);              // ring
    B.add('box', 0x6a4a2a, 0, y0 - 0.14, 0, 0, 0, Math.PI / 2, 0.08, 0.8, 0.08);     // the stock, wood
    B.add('arc:16:0.16', col, 0, y0 - 0.7, 0, 0, 0, Math.PI, 0.34, 0.34, 0.4);       // the arms, curving up from the crown
    for (const s of [-1, 1]) B.add('cone:4', col, s * 0.36, y0 - 0.62, 0, 0, 0, -s * 0.45, 0.12, 0.26, 0.05);   // the flukes
    B.add('cone:6', col, 0, y0 - 1.08, 0, Math.PI, 0, 0, 0.07, 0.1, 0.07);
  };
  m.anchorBack = lrhNode(m.spine, 0.05, 0.62, 0.44, 'anchorBack'); m.anchorBack.rotation.set(0.12, 0, 0.18);
  anchor(m.P(m.anchorBack).L, 0, 0x4a4c52);
  { const B = m.P(m.spine).L; for (let k = 0; k < 9; k++) { const f = k / 8; B.add('tor:6:0.3', 0x5a5c62, 0.3 - f * 0.55, 0.66 - Math.sin(f * Math.PI) * 0.1 - f * 0.4, 0.38 - f * 0.78 + Math.max(0, f - 0.5) * 0.2, k % 2 ? Math.PI / 2 : 0, 0.6, 0, 0.05); } }
  m.anchorHand = lrhNode(m.spine, 0, 0, 0, 'anchorHand'); anchor(m.P(m.anchorHand).L, 0, 0x4a4c52); m.anchorHand.visible = false;
  // a soft glow at the ports (so a Bollard reads by his lights at a distance)
  m.portGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.portGlow.position.set(0, 0.2, -0.38); m.portGlow.scale.setScalar(0.7); m.head.add(m.portGlow);
  m.anim = lrhAnimBollard;
  return m.finish();
}

function lrhAnimBollard(m, pose, dt) {
  const b = lrhBase(m, pose, dt), act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3() });
  const bar = m.bar;
  // ready: the bar held slanting up across him, both gauntlets on it
  bar.position.set(0.32, 0.05, -0.42); bar.rotation.set(-0.5 + p * 0.3, 0, 0.75);
  let two = true, portK = 1;
  const sweep = pose.fire != null && pose.fire >= 0 && pose.fire < 0.6 ? pose.fire : -1;
  if (sweep >= 0 && k !== 'ult') {
    // the sweep: from out on his right, round in front, to his left, then back to ready
    const f = lrhSm(0, 0.28, sweep), back = lrhSm(0.32, 0.6, sweep);
    const a = lrhLerp(lrhLerp(-1.5, 1.3, f), 0, back);
    bar.position.set(lrhLerp(0.1, 0.32, back), lrhLerp(0.3, 0.05, back), lrhLerp(-0.25, -0.42, back));
    bar.rotation.set(lrhLerp(-Math.PI / 2 + 0.15, -0.5, back), a * (1 - back), lrhLerp(0, 0.75, back), 'YXZ');
    m.spine.rotation.y += lrhLerp(lrhLerp(-0.5, 0.5, f), 0, back);
  }
  if (k === 'a1' && t < 1.1) {
    // the rush: bent low, the bar held across him like a ram
    const f = lrhSm(0, 0.12, t) * (1 - lrhSm(0.9, 1.1, t));
    m.spine.rotation.x -= 0.45 * f; m.head.rotation.x += 0.4 * f;
    bar.position.lerp(V.a.set(-0.05, 0.25, -0.55), f); bar.rotation.set(lrhLerp(bar.rotation.x, -Math.PI / 2, f), lrhLerp(bar.rotation.y, Math.PI / 2, f), lrhLerp(bar.rotation.z, 0, f), 'YXZ');
    m.st.ph += dt * 6 * f;
  }
  if (k === 'a2' && t < 3.2) {
    // the brace: feet planted wide, low, the bar stood up before him, his ports blazing
    const f = lrhSm(0, 0.2, t) * (1 - lrhSm(3.0, 3.2, t));
    m.legL.rotation.z = -0.32 * f; m.legR.rotation.z = 0.32 * f; m.shinL.rotation.z = 0.3 * f; m.shinR.rotation.z = -0.3 * f;
    m.hips.position.y -= 0.14 * f; m.spine.rotation.x -= 0.15 * f;
    bar.position.lerp(V.a.set(0.0, -0.35, -0.6), f); bar.rotation.set(lrhLerp(bar.rotation.x, 0.08, f), 0, lrhLerp(bar.rotation.z, 0, f));
    portK = 1 + f * 1.2;
  }
  // the Spring Tide: the anchor off his back, swung up over his head and down into the ground before him
  const ult = k === 'ult' && t < 1.6;
  m.anchorBack.visible = !ult; m.anchorHand.visible = ult;
  let TL = null, TR = null;
  if (ult) {
    const up = lrhSm(0, 0.45, t), slam = lrhSm(0.45, 0.62, t), rise = lrhSm(1.25, 1.6, t);
    const ah = m.anchorHand;
    ah.position.set(0, lrhLerp(lrhLerp(0.6, 1.05, up), 0.05, slam), lrhLerp(lrhLerp(0.3, 0.05, up), -0.62, slam));
    ah.rotation.set(lrhLerp(lrhLerp(2.6, 3.78, up), 0.8, slam) * (1 - rise), 0, 0);
    m.spine.rotation.x += lrhLerp(lrhLerp(0, 0.2, up), -0.55, slam) * (1 - rise);
    m.hips.position.y -= 0.28 * slam * (1 - rise);
    m.legL.rotation.x += 0.5 * slam * (1 - rise); m.shinL.rotation.x -= 0.6 * slam * (1 - rise); m.legR.rotation.x -= 0.35 * slam * (1 - rise);
    bar.position.set(0.55, -0.2, 0.1); bar.rotation.set(0.2, 0, 0.1);
    TL = lrhAt(ah, -0.11, -0.02, 0, V.a); TR = lrhAt(ah, 0.11, -0.02, 0, V.b);
    two = false;
  } else {
    TR = lrhAt(bar, 0, 0.0, 0, V.b); TL = lrhAt(bar, 0, 0.42, 0, V.a);
    if (pose.alt) TL = V.a.set(-0.3, 0.42, -0.72);   // setting down the bulkhead: his left hand flat out
  }
  if (lrhDead(m, pose, -1)) { TL = V.a.set(-0.7, 0.2, -0.3); TR = V.b.set(0.7, 0.1, -0.2); m.anchorBack.visible = true; m.anchorHand.visible = false; portK = Math.max(0, 1 - pose.dead); }
  lrhHands(m, TL, TR);
  m.glow.color.setScalar(portK); m.portGlow.material.opacity = 0.35 * portK;
  void two;
}

// the hands and the weapon in first person (V: what src/lrhero.js's lrViewModel gives a view to build in)
function lrhBollardView(V) {
  const { g, root, st, mk, B, flashSpr, lit, glow } = V; let muzzle, anim, flash = null;
  // two great iron gauntlets, the capstan bar in the right; the bar's grip pivot is low right
  const bar = mk(root, 0.2, -0.24, -0.38), b = B(bar);
  b.L.add('cyl:8:1.2', LRH_WOOD, 0, 0.42, 0, 0, 0, 0, 0.035, 0.95, 0.035);
  for (const y of [0.0, 0.3, 0.62, 0.86]) b.L.add('cyl:8', LRH_IRON, 0, y, 0, 0, 0, 0, 0.05, 0.04, 0.05);
  b.L.add('cyl:8', 0x4a3a2a, 0, 0.45, 0, 0, 0, 0, 0.045, 0.06, 0.045);
  // an iron gauntlet round the grip: knuckle plates, fingers curled, a riveted cuff running back towards the eye
  const gauntlet = (o, sx) => {
    o.L.add('box', LRH_IRON, 0, 0, 0.02, 0, 0, 0, 0.1, 0.09, 0.1);
    for (let k = 0; k < 4; k++) o.L.add('box', k % 2 ? 0x4a4c52 : LRH_IRON, sx * -0.06, 0.035 - k * 0.025, 0.0, 0, 0, 0, 0.04, 0.022, 0.09);
    o.L.add('box', 0x55585e, sx * 0.0, 0.0, -0.035, 0, 0, 0, 0.11, 0.1, 0.025);
    o.L.add('box', LRH_IRON, sx * 0.05, 0.05, 0.0, 0, 0, sx * 0.5, 0.035, 0.07, 0.04);
    o.L.add('cyl:10:0.85', 0x3a3c42, 0, -0.03, 0.1, 2.0, 0, 0, 0.07, 0.12, 0.07);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; o.L.add('sph:4', 0x9a9ca0, Math.sin(a) * 0.066, -0.03 + Math.cos(a) * 0.03, 0.1 + Math.cos(a) * 0.055, 0, 0, 0, 0.01); }
  };
  const gR = mk(bar, 0, 0.02, 0), r = B(gR); gauntlet(r, 1);
  const gL = mk(root, -0.2, -0.26, -0.4), l = B(gL); gauntlet(l, -1);
  muzzle = mk(bar, 0, 0.9, 0);
  anim = (s, dt) => {
    const f = s.fire != null && s.fire >= 0 && s.fire < 0.55 ? s.fire : -1, k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
    bar.position.set(0.36, -0.32, -0.38); bar.rotation.set(-0.95, 0, 0.12, 'YXZ'); gL.position.set(-0.24, -0.27, -0.42); gL.rotation.set(0.2, 0, 0.3);
    if (f >= 0) {
      const a = lrhSm(0, 0.2, f), back = lrhSm(0.28, 0.55, f);
      bar.position.set(lrhLerp(lrhLerp(0.34, -0.12, a), 0.36, back), lrhLerp(-0.1, -0.32, back), lrhLerp(-0.36, -0.38, back));
      bar.rotation.set(lrhLerp(-1.4, -0.35, back), lrhLerp(lrhLerp(-0.6, 0.9, a), 0, back), lrhLerp(lrhLerp(1.3, 1.6, a), 0.12, back), 'YXZ');
    }
    if (k === 'a1' && t < 1) { const q = lrhSm(0, 0.1, t) * (1 - lrhSm(0.85, 1, t)); bar.position.y -= 0.08 * q; bar.rotation.z += 0.9 * q; gL.position.set(-0.12 * q - 0.22 * (1 - q), -0.2, -0.42); }
    if (k === 'a2' && t < 3.1) { const q = lrhSm(0, 0.15, t) * (1 - lrhSm(2.9, 3.1, t)); bar.position.lerp(new THREE.Vector3(0.16, -0.34, -0.42), q); bar.rotation.set(-0.25, 0, lrhLerp(0.42, 0.12, q)); gL.position.lerp(new THREE.Vector3(-0.08, -0.12, -0.36), q); gL.rotation.set(0.9 * q, 0, 0.6 * q); }
    if (s.alt) { gL.position.set(-0.12, -0.14, -0.5); gL.rotation.set(1.3, 0, 0); }
    if (k === 'ult' && t < 1.2) { const u = lrhSm(0, 0.4, t), d = lrhSm(0.45, 0.6, t), o = lrhSm(1.0, 1.2, t); const y = lrhLerp(lrhLerp(-0.24, 0.1, u), -0.45, d) * (1 - o) + -0.24 * o; bar.position.y = y; gL.position.y = y - 0.02; gL.position.x = -0.1; }
  };
  return { muzzle, anim };
}
lrDefHeroArt('bollard', { spec: { h: 2.3, hipY: 1.0, stride: 2.1, spd: 4.8 }, model: lrhBollard, view: lrhBollardView, portraitY: 0.38 });

// the bulkhead: 6 x 3 m, centred at its bottom middle, faces +-z
function lrhBulkhead(team) {
  const TC = LRH_TEAM[team ? 1 : 0], B = lrBatch(), G2 = lrBatch(), g = new THREE.Group(); g.name = 'lrWall';
  const W = 6, H = 3, T = 0.22, iron = team ? 0x3e3634 : 0x40464e, iron2 = team ? 0x342e2c : 0x363c44, rv = 0x8a8c90;
  B.box(-W / 2, 0, -T / 2, W / 2, H, T / 2, iron2);
  // plates, two rows of three, each a little proud and riveted round
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x0 = -W / 2 + i * 2 + 0.04, x1 = x0 + 1.92, y0 = 0.04 + j * 1.48, y1 = y0 + 1.42;
    for (const s of [-1, 1]) {
      B.box(x0, y0, s > 0 ? T / 2 : -T / 2 - 0.03, x1, y1, s > 0 ? T / 2 + 0.03 : -T / 2, lrJ(iron, Math.random, 0.06));
      for (let k = 0; k <= 8; k++) for (const [x, y] of [[x0 + 0.08 + k * (x1 - x0 - 0.16) / 8, y0 + 0.08], [x0 + 0.08 + k * (x1 - x0 - 0.16) / 8, y1 - 0.08]]) B.add('sph:4', rv, x, y, s * (T / 2 + 0.035), 0, 0, 0, 0.03);
      for (let k = 1; k < 6; k++) for (const x of [x0 + 0.08, x1 - 0.08]) B.add('sph:4', rv, x, y0 + 0.08 + k * (y1 - y0 - 0.16) / 6, s * (T / 2 + 0.035), 0, 0, 0, 0.03);
    }
  }
  // a band of the crew's colour along the top and bottom, a round port, braces and feet behind
  for (const s of [-1, 1]) {
    B.box(-W / 2, H - 0.22, s > 0 ? T / 2 + 0.03 : -T / 2 - 0.05, W / 2, H - 0.04, s > 0 ? T / 2 + 0.05 : -T / 2 - 0.03, TC.main);
    B.box(-W / 2, 0.0, s > 0 ? T / 2 + 0.03 : -T / 2 - 0.05, W / 2, 0.12, s > 0 ? T / 2 + 0.05 : -T / 2 - 0.03, team ? TC.trim : TC.trim);
    B.add('tor:16:0.18', LRH_BRASS, 0, 1.55, s * (T / 2 + 0.05), 0, 0, 0, 0.26);
    for (const x of [-2, 0, 2]) { B.rod([x, 0, s * 0.9], [x, 2.2, s * (T / 2)], 0.06, iron2, 6); B.box(x - 0.18, 0, s * 0.8 - 0.25, x + 0.18, 0.08, s * 0.8 + 0.25, iron2); }
  }
  G2.add('cyl:16', TC.glow, 0, 1.55, 0, Math.PI / 2, 0, 0, 0.22, T + 0.06, 0.22);
  B.box(-W / 2 - 0.08, 0, -T / 2 - 0.08, -W / 2 + 0.08, H + 0.1, T / 2 + 0.08, iron); B.box(W / 2 - 0.08, 0, -T / 2 - 0.08, W / 2 + 0.08, H + 0.1, T / 2 + 0.08, iron);
  g.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); g.add(G2.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  return g;
}
lrDefWallArt('bulkhead', lrhBulkhead);

// the sweep's arc (a pool of six), the rush's dust, the wave's sector with its crest of foam (a pool of four)
lrDefFx('sweep', {
  init(X) {
    const arcG = new THREE.RingGeometry(1.2, 4, 24, 1, Math.PI / 2 - 0.87, 1.75); arcG.rotateX(-Math.PI / 2);
    { const p = arcG.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)), f = lrhClamp((r - 1.2) / 2.8, 0, 1); c.push(f, f, f); } arcG.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
    return X.pool(6, () => ({ obj: new THREE.Mesh(arcG, new THREE.MeshBasicMaterial({ color: 0xe8f0ff, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })) }));
  },
  spawn(o, X, SW) {
    const s = X.take(SW); s.obj.position.set(o.x, o.y, o.z); s.obj.rotation.set(0, o.yaw || 0, 0); s.obj.scale.setScalar(1); s.obj.material.opacity = 0.7; s.op = 0.7; s.obj.visible = true; s.life = s.max = 0.25;
    for (let k = 0; k < 6; k++) { const a = (o.yaw || 0) + (k / 5 - 0.5) * 1.75, d = 3.2; X.sprite(o.x - Math.sin(a) * d, o.y, o.z - Math.cos(a) * d, 0xd8e8ff, 0.35, 0.2, -Math.sin(a) * 2, 0, -Math.cos(a) * 2); }
  },
  update(dt, X, SW) { for (const o of SW) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = 1 - o.life / o.max; o.obj.scale.setScalar(1 + f * 0.15); o.obj.material.opacity = o.op * (1 - f); } },
});
lrDefFx('rush', (o, X) => { const { sprite, gy } = X, y = gy(o.x, o.z); for (let k = 0; k < 4; k++) sprite(o.x + (Math.random() - 0.5) * 1.2, y + 0.2 + Math.random() * 0.4, o.z + (Math.random() - 0.5) * 1.2, 0x8a8478, 0.5 + Math.random() * 0.4, 0.6, (Math.random() - 0.5), 0.6, (Math.random() - 0.5), 1.2, 0, true); sprite(o.x, (o.y || y) + 1.2, o.z, 0xd8e8ff, 1.4, 0.12); });
lrDefFx('wave', {
  // a 70 degree sector whose front edge is a crest of foam
  init(X) {
    const waveG = new THREE.RingGeometry(0.75, 1, 24, 1, Math.PI / 2 - 0.61, 1.22); waveG.rotateX(-Math.PI / 2);
    return X.pool(4, () => { const g = new THREE.Group(); const body = new THREE.Mesh(waveG, new THREE.MeshBasicMaterial({ color: 0x4a9ac8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); const crest = new THREE.Mesh(waveG, new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); crest.position.y = 0.5; g.add(body); g.add(crest); return { obj: g, body, crest }; });
  },
  spawn(o, X, WV) {
    const { take, gy, later, sprite } = X, w = take(WV), y = gy(o.x, o.z); w.obj.position.set(o.x, y + 0.05, o.z); w.obj.rotation.set(0, o.yaw || 0, 0); w.obj.visible = true; w.life = w.max = 0.8; w.obj.scale.setScalar(1);
    for (let k = 0; k < 14; k++) { const a = (o.yaw || 0) + (Math.random() - 0.5) * 1.2, d = 2 + Math.random() * 11; later.push([d / 17, () => { sprite(o.x - Math.sin(a) * d, y + 0.3, o.z - Math.cos(a) * d, 0xd8ecff, 0.8, 0.6, -Math.sin(a) * 2, 3, -Math.cos(a) * 2, 1.5, 9, true); }]); }
  },
  update(dt, X, WV) { for (const o of WV) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = 1 - o.life / o.max, R = 1 + 13 * Math.sqrt(f); o.obj.scale.set(R, 1, R); o.crest.scale.set(1, 1, 1); o.crest.position.y = 0.6 * (1 - f) + 0.1; o.body.material.opacity = 0.55 * (1 - f); o.crest.material.opacity = 0.9 * (1 - f); } },
});
