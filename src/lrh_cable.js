'use strict';
// The Lamp Road: Cable, the Ropewalk Giant, a tank. A towering ropemaker who works at rope's length: a hawser cracked
// across a narrow band ahead, a rope net held up across the street, a hook flung to haul someone in, a belay that pegs
// him to the ground, and the Snatch Block that ropes in everyone round him. His kit (the play, on the host unless
// said), his bot, his crosshair, his sounds and events, and (below) his art: the figure, his hands and the coil in first
// person, the net, the hook, his effects. A hero file as the guide at the top of src/lr.js has it.

// ---------- the play ----------
// the net: 5 m by 2.5, held just over two metres ahead; its health is his (p.netHp), kept while it's down
const LRH_CABLE = { netW: 5, netH: 2.5, netD: 2.1, netHp: 700, netBack: 60, lash: 8, band: 0.24, lashDmg: 50, hook: 45, hookR: 18 };
function lrhCableNet(p) { for (const w of LRM.walls) if (w.k === 'cablenet' && w.owner === p.i) return w; return null; }
// the net set before him, square to his look (nearer when he's against a wall, never so near it pushes him)
function lrhCablePlace(p, w) {
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), d = lrClamp(lrRay(p.x, p.y + 1.2, p.z, fx, 0, fz, LRH_CABLE.netD + 0.8) - 0.5, 1.4, LRH_CABLE.netD);
  w.x = p.x + fx * d; w.z = p.z + fz * d; w.y = lrGround(w.x, w.z, p.y + 0.6); w.yaw = p.yaw;
}
// a body yanked towards a, to land gap short of him in about T seconds (a knock, so a body moved by its own screen is
// told); none for a body standing firm
function lrhCableYank(a, q, gap, T) {
  const dx = a.x - q.x, dz = a.z - q.z, D = Math.hypot(dx, dz) || 1, go = Math.max(0, D - gap), v = Math.min(36, go / (T * 0.84));
  return lrKnock(q, dx / D * v, LR_G * T / 2 + lrClamp((a.y - q.y) / T, -2, 4), dz / D * v, T + 0.05);
}
// a clear line from a's eye to q (the map and the walls)
function lrhCableClear(a, q) {
  const ex = a.x, ey = a.y + lrEyeH(a), ez = a.z, dx = q.x - ex, dy = q.y + q.h * 0.6 - ey, dz = q.z - ez, l = Math.hypot(dx, dy, dz) || 1;
  return lrBlockRay(ex, ey, ez, dx / l, dy / l, dz / l, l) >= l - 0.3;
}
// how often he can lash: quicker while he's belayed; and whether he's holding the net (no lashing then)
const lrhCableLashT = p => p.firm > 0 && p.dr < 1 ? 0.65 : 0.8;
const lrhCableHolding = (p, I) => I.alt && p.cd.alt <= 0 && (p.netHp == null || p.netHp > 1);
lrDefHero({
  id: 'cable', n: 'Cable', title: 'The Ropewalk Giant', role: 'tank', hp: 575, spd: 4.9, r: 0.65, h: 2.25, mag: 0, reloadT: 0, ultCost: 1500,
  cd: { a1: 9, a2: 12, alt: 5 }, range: 8, botClose: 11, actT: { a1: 0.7, a2: 3, ult: 1.6 }, stepVol: 1.5,
  blurb: 'A towering ropemaker from the ropewalk on the quay. He fights at rope’s length and hauls his foes in.',
  kit: {
    pri: ['Hawser Lash', 'Crack a hawser ahead: hits everyone in a narrow band out to 8 m.', 'Lash'],
    alt: ['Bight', 'Hold to stretch a rope net across the street ahead. Shots stop on it; no lashing while it’s up.', 'Net'],
    a1: ['Haul Away', 'Fling the hook up to 18 m: the first enemy it catches is hauled to your feet.', 'Haul'],
    a2: ['Belay', 'Rope yourself down for 3 s: no knocks, stuns or slows, 30% less damage, quicker lashes, half speed.', 'Belay'],
    ult: ['Snatch Block', 'Ropes fly out to every enemy within 11 m in view: dragged to you and held fast.', 'Snatch'],
  },
  how: { lash: 'Hawser Lash', haul: 'Haul Away', snatch: 'Snatch Block' },
  reset(p) {
    p.netHp = LRH_CABLE.netHp; p.netBroke = false;
    if (LRM.walls.some(w => w.k === 'cablenet' && w.owner === p.i)) LRM.walls = LRM.walls.filter(w => !(w.k === 'cablenet' && w.owner === p.i));
  },
  // Hawser Lash: everyone in a 27 degree band out to 8 m (and not far off his look up or down), in the clear; and
  // enemy walls in it
  fire(p, dt, I, H) {
    if (!(I.fire && p.fireT >= lrhCableLashT(p)) || lrhCableHolding(p, I)) return;
    p.fireT = 0;
    const ey = p.y + lrEyeH(p), R = LRH_CABLE.lash, sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    lrFxPush('lash', { x: p.x - sy * 0.3 + cy * 0.35, y: ey - 0.35, z: p.z - cy * 0.3 - sy * 0.35, yaw: p.yaw, pitch: p.pitch, v: p.i, team: p.team });
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > R + q.r) continue;
      if (Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) > LRH_CABLE.band + Math.atan2(q.r, Math.max(0.5, d)) && d > p.r + q.r + 0.3) continue;
      const el = Math.atan2(q.y + q.h * 0.55 - ey, Math.max(0.5, d)); if (Math.abs(el - p.pitch) > 0.55 && d > 2) continue;
      if (!lrhCableClear(p, q)) continue;
      lrHurt(q, LRH_CABLE.lashDmg, p, 'lash');
    }
    for (const w of LRM.walls) { if (w.team === p.team) continue; const dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz); if (d < R + 0.5 && Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) < LRH_CABLE.band + 0.35) lrWallHurt(w, LRH_CABLE.lashDmg, p); }
  },
  // Bight: held up while the button is; it follows his look, takes the hits, and mends while it's down; broken, it's
  // down five seconds (the wall's gone hook) and comes back at half
  alt(p, dt, I, H) {
    let w = lrhCableNet(p);
    if (p.netBroke && p.cd.alt <= 0) { p.netBroke = false; p.netHp = Math.max(p.netHp, LRH_CABLE.netHp / 2); }
    if (lrhCableHolding(p, I)) {
      if (!w) { w = lrAddWall(p, 'cablenet', p.x, p.y, p.z, p.yaw, p.netHp, 0.25); lrhCablePlace(p, w); p.act = { k: 'alt', t: 0 }; lrFxPush('netup', { x: w.x, y: w.y + 1.6, z: w.z, yaw: w.yaw, v: p.i, team: p.team }); }
      lrhCablePlace(p, w); w.t = 0.25; p.netHp = w.hp;
    } else if (w) { if (w.hp > 0) { p.netHp = w.hp; LRM.walls = LRM.walls.filter(o => o !== w); } }
    else p.netHp = Math.min(LRH_CABLE.netHp, p.netHp + LRH_CABLE.netBack * dt);
  },
  // Haul Away: the hook flung along his look
  a1(p, dt, I, H) {
    if (!(I.a1 && p.cd.a1 <= 0)) return;
    p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 };
    lrSpawnProj(p, 'cablehook', LRH_CABLE.hook, { dy: -0.25 });
    lrFxPush('hookthrow', { x: p.x, y: p.y + 1.8, z: p.z, v: p.i });
  },
  // Belay: three seconds pegged down: firm (no knocks, stuns or roots), slows shaken off, 30% less damage
  a2(p, dt, I, H) {
    if (!(I.a2 && p.cd.a2 <= 0)) return;
    lrGuard(p, 0.7, 3, true); p.root = 0; p.slows = {}; p.slow = 1;
    p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    lrFxPush('belay', { x: p.x, y: p.y, z: p.z, v: p.i, team: p.team });
  },
  // Snatch Block: every enemy within 11 m before him (160 degrees), in the clear: hurt, dragged in, held fast
  ult(p) {
    const vs = [];
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > 11 + q.r || Math.abs(q.y - p.y) > 4) continue;
      if (Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) > 1.4 && d > 2) continue;
      if (!lrhCableClear(p, q)) continue;
      vs.push(q.i);
    }
    lrFxPush('snatch', { x: p.x, y: p.y + 1.7, z: p.z, v: p.i, team: p.team, vs });
    for (const i of vs) {
      const q = LRM.P[i]; lrHurt(q, 60, p, 'snatch');
      if (q.alive) { lrhCableYank(p, q, p.r + q.r + 0.9, 0.4); lrRoot(q, 2.0, p); }
    }
  },
  // (wherever he's moved) Belay's half speed; no slows while it holds; his net kept before him, so he never walks into it
  speed: p => p.firm > 0 && p.dr < 1 ? 0.5 : 1,
  tick(p) { if (p.firm > 0 && p.dr < 1) p.slow = 1; },
  move(p) { const w = lrhCableNet(p); if (w) lrhCablePlace(p, w); return false; },
  // online: a guest's own lash, seen and heard at once
  guestFire(p, I, H, ey) {
    if (!(I.fire && p.fireT >= lrhCableLashT(p)) || lrhCableHolding(p, I)) return;
    p.fireT = 0; LRM.shotAt = performance.now();
    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    lrLocalFx({ k: 'lash', x: p.x - sy * 0.3 + cy * 0.35, y: ey - 0.35, z: p.z - cy * 0.3 - sy * 0.35, yaw: p.yaw, pitch: p.pitch, v: p.i, team: p.team });
  },
  // the net's health, for a guest's crosshair (nothing while it's whole)
  snap: p => p.netHp < LRH_CABLE.netHp - 0.5 ? [Math.round(Math.max(0, p.netHp))] : 0,
  unsnap(p, x) { p.netHp = x.length ? x[0] : LRH_CABLE.netHp; },
  abil(p, k) { return { on: (k === 'alt' && !!lrhCableNet(p)) || (k === 'a2' && p.firm > 0 && p.dr < 1) }; },
  // the bot: the Snatch Block into a clump, the hook at someone just out of reach, Belay when it's getting hot (or he's
  // held or slowed), the net up a moment when he's taking it from further off than he can reach
  bot(p, ai, B) {
    const { S, I, tg, hpF, hurt, C, at, inCone, mode } = B, yawTo = q => Math.atan2(-(q.x - p.x), -(q.z - p.z));
    if (p.ult >= 1 && tg && ai.tgtD < 10.5) {
      const n = inCone(yawTo(tg), 10.5, 1.2);
      if (n >= S.clump || (n >= 2 && Math.hypot(tg.x - C.x, tg.z - C.z) < 7) || (p.team === 1 && C.n > 0 && Math.hypot(tg.x - C.x, tg.z - C.z) < 5)) { mode({ at: at(tg), press: 'ult', pressAt: LRM.t + 0.1 }); return; }
    }
    if (p.cd.a1 <= 0 && tg && ai.tgtD > 8.5 && ai.tgtD < 16.5 && !(tg.firm > 0)) { const tt = ai.tgtD / LRH_CABLE.hook * S.lead; mode({ at: { x: tg.x + tg.vx * tt, y: tg.y + tg.h * 0.55, z: tg.z + tg.vz * tt }, press: 'a1', pressAt: LRM.t + 0.15 }); return; }
    if (p.cd.a2 <= 0 && ((hurt && hpF < 0.6) || p.root > 0 || p.slow < 0.75)) { I.a2 = true; return; }
    if (p.cd.alt <= 0 && tg && hurt && ai.tgtD > 9 && p.netHp > 250 && hpF < 0.9) mode({ at: at(tg), press: 'alt', pressAt: LRM.t, once: false, until: LRM.t + 1.2 + Math.random() * 1.2 });
  },
  // his crosshair: the band his lash covers, a chevron either side; the net's health beneath while it's up or hurt
  cross(c, cx, cy, me) {
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 24, cy - 10); c.lineTo(cx + s * 32, cy); c.lineTo(cx + s * 24, cy + 10); c.stroke(); }
    c.beginPath(); c.arc(cx, cy, 2, 0, 7); c.fill();
    const f = lrClamp((me.netHp == null ? LRH_CABLE.netHp : me.netHp) / LRH_CABLE.netHp, 0, 1), up = !!lrhCableNet(me);
    if (up || f < 0.999) { const w = 70, y = cy + 34; c.save(); c.globalAlpha = up ? 0.9 : 0.5; c.strokeRect(cx - w / 2, y, w, 6); c.fillRect(cx - w / 2 + 1, y + 1, (w - 2) * f, 4); c.restore(); }
  },
});
// the hook: flies straight for 18 m; the first enemy it meets takes 40 and is hauled in
lrDefProj('cablehook', { grav: false, step(j, dt, M) {
  const a = M.a;
  if (j.t * LRH_CABLE.hook > LRH_CABLE.hookR) { lrFxPush('hookmiss', { x: j.x, y: j.y, z: j.z, v: j.owner }); return true; }
  const h = lrRayHit(M.sx, M.sy, M.sz, M.dx, M.dy, M.dz, { team: j.team, skip: j.owner, pad: 0.3, max: M.L });
  if (h.t >= M.L) return false;
  if (h.p) {
    const q = h.p; lrHurt(q, 40, a, 'haul');
    if (q.alive && a && a.alive) { lrhCableYank(a, q, a.r + q.r + 0.8, 0.45); lrFxPush('haul', { x: q.x, y: q.y + 1, z: q.z, v: j.owner, q: q.i, team: j.team }); }
  } else { if (h.wall) lrWallHurt(h.wall, 40, a); lrFxPush('hookmiss', { x: h.x, y: h.y, z: h.z, v: j.owner, hit: 1 }); }
  return true;
} });
// the net: when it's broken his five seconds start; when it's only let go (or he was stunned holding it) it keeps its health
lrDefWall('cablenet', { w: LRH_CABLE.netW, h: LRH_CABLE.netH, gone(w, o) { if (!o || o.hero !== 'cable') return; if (w.hp > 0) { o.netHp = w.hp; return; } o.netHp = 0; o.netBroke = true; o.cd.alt = LR_HEROES.cable.cd.alt; } });
lrDefEvent('lash', { own: true, sound: (f, at) => at('cablelash') });
lrDefEvent('netup', { sound: (f, at) => at('cablenet') });
lrDefEvent('hookthrow', { sound: (f, at) => at('cablethrow') });
lrDefEvent('hookmiss', { sound: (f, at) => at(f.hit ? 'cableclank' : 'cableslack', 0.8) });
lrDefEvent('haul', { sound: (f, at) => at('cablehaul') });
lrDefEvent('belay', { sound: (f, at) => at('cablebelay') });
lrDefEvent('snatch', { sound: (f, at) => at('cablesnatch', 1.4), shake: (f, me) => (f.vs || []).includes(me.i) ? 0.6 : Math.hypot(f.x - me.x, f.z - me.z) < 12 ? 0.3 : 0 });
lrDefSnd('cablelash', (v, e, rec, o) => { if (!rec('kwlash', 0.8 * v, { rate: 1.1 })) { noise('bandpass', 1400, 1.5, 0.005, 0.25 * v, 0.12, o); noise('highpass', 3000, 1, 0.001, 0.35 * v, 0.05, Object.assign({ delay: 0.09 }, o)); } });
lrDefSnd('cablenet', (v, e, rec, o) => { if (!rec('kwnet', 0.7 * v)) noise('bandpass', 600, 0.8, 0.03, 0.3 * v, 0.35, o); if (!rec('ropecreak', 0.4 * v, { delay: 0.05 })) tone(160, 'triangle', 0.02, 0.1 * v, 0.3, { to: 120, pan: e.pan }); });
lrDefSnd('cablethrow', (v, e, rec, o) => { if (!rec('grapnel', 0.8 * v)) noise('bandpass', 900, 1.2, 0.02, 0.3 * v, 0.3, o); });
lrDefSnd('cableslack', (v, e, rec, o) => noise('lowpass', 500, 1, 0.01, 0.15 * v, 0.3, o));
lrDefSnd('cableclank', (v, e, rec, o) => { tone(900, 'square', 0.001, 0.08 * v, 0.12, { to: 500, pan: e.pan }); noise('highpass', 2500, 1, 0.001, 0.15 * v, 0.08, o); });
lrDefSnd('cablehaul', (v, e, rec, o) => { if (!rec('winchclank', 0.7 * v, { rate: 1.3 })) tone(120, 'sawtooth', 0.01, 0.15 * v, 0.35, { to: 70, pan: e.pan }); rec('ropecreak', 0.6 * v); });
lrDefSnd('cablebelay', (v, e, rec, o) => { if (!rec('chock', 0.9 * v, { rate: 0.8 })) tone(150, 'square', 0.001, 0.2 * v, 0.15, { pan: e.pan }); if (!rec('halyard', 0.5 * v, { delay: 0.1 })) noise('bandpass', 700, 1, 0.05, 0.15 * v, 0.4, o); });
lrDefSnd('cablesnatch', (v, e, rec, o) => { if (!rec('harpoon', 0.9 * v)) noise('bandpass', 1100, 1, 0.01, 0.4 * v, 0.4, o); if (!rec('winchclank', 0.9 * v, { delay: 0.25 })) tone(90, 'sawtooth', 0.02, 0.25 * v, 0.6, { to: 50, pan: e.pan, delay: 0.25 }); });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
const LRH_TAR = 0x2c2418;
// a coil of tarred hawser: turns of rope laid side by side (every other a shade lighter) into batch L, centred at
// (x, y, z), its axis turned (rx, ry, rz) from +z, of radius r, n turns of rope th thick
function lrhCableCoil(L, x, y, z, rx, ry, rz, r, n, th) {
  const ax = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * th * 1.7; L.add('tor:14:' + (th / r).toFixed(3), k % 2 ? LRH_TAR : 0x3e3222, x + ax.x * o, y + ax.y * o, z + ax.z * o, rx, ry, rz, r * (1 - Math.abs(k - (n - 1) / 2) * 0.04)); }
}
// a unit rod, from its origin up its +y a metre (one shared geometry), for ropes laid between two points each frame
function lrhCableUnitRod() { if (!LRHM.tex.cableRod) { const g = new THREE.CylinderGeometry(0.03, 0.03, 1, 5, 1, true); g.translate(0, 0.5, 0); LRHM.tex.cableRod = g; } return LRHM.tex.cableRod; }
const LRH_CABLE_V = typeof THREE !== 'undefined' ? { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) } : null;
// a rod mesh laid from A to B (world or its parent's space), r times as thick as the unit rod
function lrhCableLay(rod, A, B, r) { const W = LRH_CABLE_V; W.c.copy(B).sub(A); const L = W.c.length() || 1e-3; rod.position.copy(A); rod.quaternion.setFromUnitVectors(W.up, W.c.multiplyScalar(1 / L)); rod.scale.set(r, L, r); }
// the iron hook: an eye, a shank, the bend and its barbed point, s its scale (along its -y, the point curling up +z)
function lrhCableHookParts(L, s) {
  L.add('tor:10:0.3', LRH_IRON, 0, 0, 0, 0, Math.PI / 2, 0, 0.06 * s);
  L.add('cyl:8', LRH_IRON, 0, -0.17 * s, 0, 0, 0, 0, 0.035 * s, 0.24 * s, 0.035 * s);
  L.add('arc:12:0.28', 0x4a4c52, 0, -0.29 * s, 0.1 * s, Math.PI, Math.PI / 2, 0, 0.11 * s);
  L.add('cone:6', 0x5a5c62, 0, -0.22 * s, 0.21 * s, 0, 0, 0, 0.035 * s, 0.12 * s, 0.035 * s);
}
// ---------- Cable: the ropemaker in his apron, hawsers over both shoulders ----------
function lrhCable(team) {
  const m = lrhRig('cable', team), TC = m.TC, t = m.team;
  const jer = TC.cloth, jer2 = t ? 0x1e1a18 : 0x2a5076, stripe = TC.main, trou = t ? 0x3a3630 : 0x4a4a42, apron = 0x6a4428, apron2 = 0x553620, skin = 0xc89474, boot = 0x1e1c1a;
  // the legs: canvas trousers, sea boots turned down at the knee
  lrhLegs(m, 0.22, 0.5, 0.48, (L, S, s, a, b) => {
    L.L.add('cyl:10:1.15', trou, 0, -a / 2, 0, 0, 0, 0, 0.15, a, 0.15);
    S.L.add('cyl:10:1.1', trou, 0, -b * 0.2, 0, 0, 0, 0, 0.13, b * 0.4, 0.13);
    S.L.add('cyl:10:1.15', boot, 0, -b * 0.62, 0, 0, 0, 0, 0.13, b * 0.7, 0.13);
    S.L.add('cyl:10', 0x2e2a26, 0, -b * 0.27, 0, 0, 0, 0, 0.16, 0.08, 0.16);       // the turned-down top
    S.L.add('box', boot, 0, -b + 0.04, -0.06, 0, 0, 0, 0.22, 0.1, 0.38);
    S.L.add('box', 0x141210, 0, -b, -0.06, 0, 0, 0, 0.23, 0.03, 0.4);
  });
  m.P(m.hips).L.add('cyl:12', trou, 0, -0.04, 0, 0, 0, 0, 0.37, 0.18, 0.3);
  m.spine = lrhNode(m.hips, 0, 0.08, 0, 'spine');
  const sp = m.P(m.spine);
  // the jersey: a barrel chest over a belly, rounded shoulders, knitted bands of the crew's colour, a neckerchief
  sp.L.add('cyl:14:0.9', jer, 0, 0.36, 0, 0, 0, 0, 0.44, 0.64, 0.32);
  sp.L.add('sph:14', jer, 0, 0.66, 0, 0, 0, 0, 0.43, 0.17, 0.3);
  for (let k = 0; k < 3; k++) { const y = 0.2 + k * 0.14, f = 1 - (y - 0.04) / 0.64 * 0.1; sp.L.add('cyl:14', stripe, 0, y, 0, 0, 0, 0, 0.44 * f + 0.012, 0.055, 0.32 * f + 0.012); }
  sp.L.add('cyl:12', jer2, 0, 0.74, 0, 0, 0, 0, 0.2, 0.08, 0.18);
  sp.L.add('tor:10:0.35', stripe, 0, 0.73, -0.02, Math.PI / 2, 0, 0, 0.17, 0.17, 0.12);
  sp.L.add('box', stripe, 0.04, 0.62, -0.2, 0.2, 0, 0.35, 0.1, 0.16, 0.04); sp.L.add('box', stripe, -0.03, 0.6, -0.19, 0.2, 0, -0.3, 0.08, 0.13, 0.04);
  // the belt and the leather apron: a narrow bib up the chest on straps, a skirt to the knee with a pocket of fids and a knife
  sp.L.add('cyl:14', 0x2a1e14, 0, -0.02, 0, 0, 0, 0, 0.375, 0.09, 0.305);
  sp.L.add('box', LRH_IRON, 0, -0.02, -0.31, 0, 0, 0, 0.1, 0.08, 0.03);
  sp.L.add('box', apron, 0, 0.27, -0.325, -0.06, 0, 0, 0.3, 0.46, 0.04);
  sp.L.add('box', apron2, 0, 0.47, -0.34, -0.06, 0, 0, 0.3, 0.04, 0.02);
  for (const s of [-1, 1]) sp.L.add('box', apron2, s * 0.13, 0.62, -0.12, 0.95, 0, 0, 0.045, 0.42, 0.02);
  m.apron = lrhNode(m.hips, 0, 0.02, -0.3, 'apron');
  { const A = m.P(m.apron).L; A.add('box', apron, 0, -0.28, -0.02, 0, 0, 0, 0.6, 0.56, 0.04); A.add('box', apron2, 0, -0.54, -0.03, 0, 0, 0, 0.6, 0.04, 0.03); A.add('box', apron2, 0.14, -0.14, -0.045, 0, 0, 0, 0.18, 0.16, 0.02); for (let k = 0; k < 3; k++) A.add('cone:5', 0xd8c8a0, 0.08 + k * 0.05, -0.02, -0.05, 0, 0, 0, 0.012, 0.12, 0.012); A.add('box', 0x8a8c90, -0.18, -0.12, -0.05, 0, 0, 0.1, 0.03, 0.18, 0.015); A.add('box', LRH_WOOD, -0.18, 0.0, -0.05, 0, 0, 0.1, 0.04, 0.1, 0.03); }
  // the hawsers: a great coil hung over each shoulder, front and back, and a smaller one slung on his back
  lrhCableCoil(sp.L, 0.43, 0.47, 0.02, 0.2, Math.PI / 2, 0, 0.3, 4, 0.045);
  lrhCableCoil(sp.L, -0.43, 0.47, 0.02, -0.2, Math.PI / 2, 0, 0.3, 4, 0.045);
  lrhCableCoil(sp.L, 0, 0.36, 0.36, 0, 0, 0, 0.22, 3, 0.05);
  sp.L.add('box', LRH_TAR, 0, 0.36, 0.33, 0, 0, 0.6, 0.6, 0.05, 0.04);
  // the hook on the end of the right coil, hanging at his left hip (gone while it's flung)
  m.hipHook = lrhNode(m.spine, -0.42, 0.04, -0.1, 'hipHook'); m.hipHook.rotation.set(0, 0.4, 0.25);
  lrhCableHookParts(m.P(m.hipHook).L, 1);
  // the head: a broad jaw and a cropped beard, a knitted cap in the crew's colour with its turn-up and a bobble
  m.head = lrhNode(m.spine, 0, 0.78, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('cyl:10', skin, 0, 0.0, 0, 0, 0, 0, 0.13, 0.12, 0.13);
  hd.L.add('sph:12', skin, 0, 0.16, -0.01, 0, 0, 0, 0.16, 0.17, 0.155);
  hd.L.add('box', skin, 0, 0.07, -0.08, 0, 0, 0, 0.24, 0.12, 0.16);
  hd.L.add('sph:10', 0x3a2618, 0, 0.06, -0.06, 0, 0, 0, 0.165, 0.1, 0.13);            // the beard
  hd.L.add('box', 0x3a2618, 0, 0.12, -0.16, 0, 0, 0, 0.14, 0.03, 0.02);              // the moustache
  hd.L.add('cone:4', 0xb88464, 0, 0.17, -0.17, -Math.PI / 2, Math.PI / 4, 0, 0.03, 0.06, 0.03);
  hd.L.add('box', 0x2a1a10, 0, 0.22, -0.145, 0, 0, 0, 0.2, 0.035, 0.03);              // a heavy brow
  for (const s of [-1, 1]) { hd.L.add('sph:5', 0x141010, s * 0.055, 0.19, -0.148, 0, 0, 0, 0.018); hd.L.add('sph:6', skin, s * 0.16, 0.15, 0, 0, 0, 0, 0.035, 0.05, 0.03); }
  hd.L.add('hemi:12', stripe, 0, 0.24, 0.0, 0, 0, 0, 0.17, 0.16, 0.165);
  hd.L.add('cyl:12', t ? 0x8a2e26 : 0xc89a30, 0, 0.255, 0, 0, 0, 0, 0.175, 0.07, 0.17);
  hd.L.add('sph:8', TC.trim, 0, 0.42, 0.02, 0, 0, 0, 0.065);
  // the arms: the jersey to the elbow, then bare forearms like hawsers and great hands
  lrhArms(m, 0.5, 0.58, 0, 0.42, 0.42, (A, F, Hn, s, a, b) => {
    A.L.add('sph:10', jer, 0, -0.02, 0, 0, 0, 0, 0.17, 0.16, 0.17);
    A.L.add('cyl:10:1.1', jer, 0, -a / 2, 0, 0, 0, 0, 0.13, a, 0.13);
    A.L.add('cyl:10', stripe, 0, -a * 0.45, 0, 0, 0, 0, 0.148, 0.06, 0.148);
    A.L.add('cyl:10', jer2, 0, -a + 0.02, 0, 0, 0, 0, 0.14, 0.08, 0.14);              // the rolled sleeve
    F.L.add('cyl:10:0.75', skin, 0, -b * 0.45, 0, 0, 0, 0, 0.13, b * 0.95, 0.13);
    F.L.add('cyl:8', 0x2a1e14, 0, -b * 0.85, 0, 0, 0, 0, 0.105, 0.06, 0.105);          // a leather wrist strap
    Hn.L.add('sph:8', skin, 0, -0.08, -0.01, 0, 0, 0, 0.09, 0.1, 0.085);
    Hn.L.add('box', 0xb88464, 0, -0.12, -0.06, 0, 0, 0, 0.14, 0.06, 0.06);
    Hn.L.add('sph:6', 0xb88464, s * -0.08, -0.06, -0.05, 0, 0, 0, 0.035, 0.05, 0.035);
  });
  // the coil in his right fist he cracks the lash from, and the rope's free end in his left
  m.coil = lrhNode(m.handR, 0, -0.1, -0.02, 'coil'); { const C = m.P(m.coil).L; lrhCableCoil(C, 0, -0.04, 0, 0, Math.PI / 2, 0, 0.17, 3, 0.03); C.add('cyl:6', LRH_TAR, 0, -0.18, -0.1, 0.9, 0, 0, 0.025, 0.32, 0.025); }
  m.muzzle = lrhNode(m.handR, 0, -0.15, -0.15, 'muzzle');
  m.lineL = lrhNode(m.handL, 0, -0.08, 0, 'lineL'); m.P(m.lineL).L.add('cyl:6', LRH_TAR, 0, -0.18, 0, 0, 0, 0, 0.025, 0.36, 0.025);
  // the hook in his fist as he flings it
  m.handHook = lrhNode(m.handR, 0, -0.12, 0, 'handHook'); lrhCableHookParts(m.P(m.handHook).L, 0.8); m.handHook.visible = false;
  // the two guy ropes from his fists out to the net's top corners while he holds it (laid in the figure's own space)
  m.guys = [0, 1].map(() => { const n = new THREE.Mesh(lrhCableUnitRod(), new THREE.MeshLambertMaterial({ color: LRH_TAR })); n.visible = false; m.g.add(n); return n; });
  m.anim = lrhAnimCable;
  return m.finish();
}
function lrhAnimCable(m, pose, dt) {
  lrhBase(m, pose, dt);
  const act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() });
  // ready: the coil low at his right hip, the free end in his left fist before him; the head follows his look
  let TL = V.a.set(-0.3, 0.12 + p * 0.15, -0.36), TR = V.b.set(0.4, 0.1 + p * 0.15, -0.3);
  m.head.rotation.x += p * 0.45; m.spine.rotation.x += p * 0.12;
  m.apron.rotation.x = -Math.max(0, m.legL.rotation.x, m.legR.rotation.x) * 0.7;
  m.coil.visible = true; m.lineL.visible = true; m.handHook.visible = false; m.hipHook.visible = true;
  let guys = false;
  const f = pose.fire != null && pose.fire >= 0 && pose.fire < 0.5 ? pose.fire : -1;
  if (f >= 0 && k !== 'ult') {
    // the lash: the coil hand swung back over his shoulder, then cracked forward and down, the body turning into it
    const wind = lrhSm(0, 0.1, f), crack = lrhSm(0.1, 0.2, f), back = lrhSm(0.25, 0.5, f);
    TR.set(lrhLerp(lrhLerp(0.4, 0.55, wind), 0.2, crack), lrhLerp(lrhLerp(0.1, 0.95, wind), 0.45 + p * 0.3, crack), lrhLerp(lrhLerp(-0.3, 0.25, wind), -0.75, crack));
    if (back > 0) TR.lerp(V.c.set(0.4, 0.1 + p * 0.15, -0.3), back);
    m.spine.rotation.y += lrhLerp(0.35 * wind, -0.4, crack) * (1 - back);
    TL.set(-0.35, 0.3, -0.42);
  }
  if (pose.alt && k !== 'ult') {
    // holding the net: both fists up before him on the guy ropes, leaning back against it
    TL.set(-0.42, 0.72 + p * 0.2, -0.5); TR.set(0.42, 0.72 + p * 0.2, -0.5);
    m.spine.rotation.x += 0.1; m.coil.visible = false; m.lineL.visible = false; guys = true;
  }
  if (k === 'a1' && t < 0.7) {
    // Haul Away: the hook swung up behind and flung overarm, his left hand pointing it out
    const wind = lrhSm(0, 0.14, t), fling = lrhSm(0.14, 0.26, t), back = lrhSm(0.4, 0.7, t);
    TR.set(lrhLerp(lrhLerp(0.4, 0.5, wind), 0.25, fling), lrhLerp(lrhLerp(0.1, 1.0, wind), 0.75, fling), lrhLerp(lrhLerp(-0.3, 0.35, wind), -0.7, fling));
    if (back > 0) TR.lerp(V.c.set(0.4, 0.1, -0.3), back);
    TL.set(lrhLerp(-0.3, -0.2, fling), lrhLerp(0.12, 0.7, fling * (1 - back)), lrhLerp(-0.36, -0.7, fling * (1 - back)));
    m.spine.rotation.y += lrhLerp(0.4 * wind, -0.35, fling) * (1 - back);
    m.handHook.visible = t < 0.2; m.hipHook.visible = t > 0.62; m.coil.visible = t > 0.2;
  }
  if (k === 'a2' && t < 3.1) {
    // Belay: feet planted wide, sat down into it, both fists on the line at his belt, leaning back
    const q = lrhSm(0, 0.2, t) * (1 - lrhSm(2.85, 3.1, t));
    m.legL.rotation.z = -0.35 * q; m.legR.rotation.z = 0.35 * q; m.shinL.rotation.z = 0.32 * q; m.shinR.rotation.z = -0.32 * q;
    m.legL.rotation.x += 0.35 * q; m.legR.rotation.x += 0.35 * q; m.shinL.rotation.x -= 0.5 * q; m.shinR.rotation.x -= 0.5 * q;
    m.hips.position.y -= 0.18 * q; m.spine.rotation.x += 0.2 * q;
    TL.lerp(V.c.set(-0.15, 0.02, -0.4), q); TR.lerp(V.d.set(0.18, -0.05, -0.32), q);
  }
  if (k === 'ult' && t < 1.6) {
    // Snatch Block: both arms flung out wide, then hauling hand over hand, leaning back into it
    const out = lrhSm(0, 0.2, t), haul = lrhSm(0.2, 0.35, t) * (1 - lrhSm(1.3, 1.6, t)), ph = Math.max(0, t - 0.25) * 11;
    TL.set(-0.75, 0.65, -0.55); TR.set(0.75, 0.65, -0.55);
    if (haul > 0) { const l = 0.5 + 0.5 * Math.sin(ph), r = 0.5 - 0.5 * Math.sin(ph); TL.lerp(V.c.set(-0.2, lrhLerp(0.6, 0.15, l), lrhLerp(-0.7, -0.15, l)), haul); TR.lerp(V.d.set(0.2, lrhLerp(0.6, 0.15, r), lrhLerp(-0.7, -0.15, r)), haul); }
    TL.lerp(V.c.set(-0.3, 0.12, -0.36), 1 - out); TR.lerp(V.d.set(0.4, 0.1, -0.3), 1 - out);
    m.spine.rotation.x += 0.22 * haul; m.hips.position.y -= 0.1 * haul; m.legL.rotation.x += 0.4 * haul; m.shinL.rotation.x -= 0.3 * haul;
    m.coil.visible = false; m.lineL.visible = false;
  }
  if (lrhDead(m, pose, -1)) { TL = V.a.set(-0.75, 0.25, -0.2); TR = V.b.set(0.75, 0.2, -0.1); guys = false; m.coil.visible = true; m.handHook.visible = false; m.hipHook.visible = true; }
  lrhHands(m, TL, TR);
  // the guy ropes to the net (2.1 m ahead, its top corners 2.5 either side, 2.4 up), from where his fists are
  for (let s = 0; s < 2; s++) m.guys[s].visible = guys;
  if (guys) {
    m.g.updateMatrixWorld(true); const W = LRH_CABLE_V;
    for (let s = 0; s < 2; s++) { (s ? m.handR : m.handL).getWorldPosition(W.a); m.g.worldToLocal(W.a); W.b.set((s ? 1 : -1) * 2.45, 2.42, -2.0); lrhCableLay(m.guys[s], W.a, W.b, 1.2); }
  }
}

// a fist seen in first person, gripping along its x (s: 1 the right hand, -1 the left), its forearm running back
// towards the eye: bare skin to a rolled sleeve in the crew's colours
function lrhCableFist(o, s, TC, skin) {
  const dk = 0x9a6448;
  o.L.add('box', skin, 0, 0, 0, 0, 0, 0, 0.075, 0.07, 0.08);
  for (let k = 0; k < 4; k++) o.L.add('box', k % 2 ? skin : 0xbe8a6a, -s * 0.004, 0.026 - k * 0.019, -0.045, 0.2, 0, 0, 0.08, 0.017, 0.03);
  o.L.add('box', dk, -s * 0.0, -0.045, -0.02, 0, 0, 0, 0.07, 0.012, 0.05);
  o.L.add('box', skin, -s * 0.04, 0.03, -0.03, 0.3, 0, s * 0.5, 0.025, 0.05, 0.03);
  o.L.add('cyl:8', 0x2a1e14, 0, -0.004, 0.06, Math.PI / 2, 0, 0, 0.046, 0.035, 0.042);
  o.L.add('cyl:10:0.82', skin, 0, -0.008, 0.2, Math.PI / 2, 0, 0, 0.056, 0.25, 0.05);
  o.L.add('cyl:10', TC.cloth, 0, -0.01, 0.35, Math.PI / 2, 0, 0, 0.068, 0.07, 0.062);
  o.L.add('cyl:10', TC.main, 0, -0.01, 0.39, Math.PI / 2, 0, 0, 0.07, 0.022, 0.064);
}
// his hands and the coil in first person (V: what src/lrhero.js's lrViewModel gives a view to build in)
function lrhCableView(V) {
  const { root, mk, B } = V, me = typeof lrMe === 'function' && LRM.P.length ? lrMe() : null, TC = LRH_TEAM[me && me.team ? 1 : 0], skin = 0xc89474;
  const RP = [0.27, -0.24, -0.42], LP = [-0.3, -0.27, -0.44];
  const R = mk(root, ...RP), Lf = mk(root, ...LP); lrhCableFist(B(R), 1, TC, skin); lrhCableFist(B(Lf), -1, TC, skin);
  // the coil in the right fist, hanging below it, and the line from it across to the left fist
  const coil = mk(R, 0.0, -0.08, -0.01), c = B(coil); lrhCableCoil(c.L, 0, -0.02, 0, 0, Math.PI / 2, 0, 0.07, 3, 0.013); c.L.add('cyl:6', LRH_TAR, 0.0, -0.1, -0.02, 0.2, 0, 0.1, 0.012, 0.08, 0.012);
  const line = mk(root, 0, 0, 0); line.add(new THREE.Mesh(lrhCableUnitRod(), V.lit)); const lineM = line.children[0]; lineM.material = new THREE.MeshLambertMaterial({ color: LRH_TAR }); lineM.frustumCulled = false;
  // the guy ropes run forward and up from both fists while the net's held
  const guy = [R, Lf].map(n => { const g = mk(n, 0, 0.01, -0.03), r = new THREE.Mesh(lrhCableUnitRod(), new THREE.MeshLambertMaterial({ color: LRH_TAR })); r.frustumCulled = false; r.rotation.x = -1.2; r.scale.set(0.45, 1.2, 0.45); g.add(r); return g; });
  // the hook, in the right fist while it's flung
  const hook = mk(R, 0.0, -0.02, -0.06), hk = B(hook); lrhCableHookParts(hk.L, 0.35); hook.visible = false;
  const muzzle = mk(R, 0, 0, -0.12), W = LRH_CABLE_V;
  const anim = (s) => {
    const f = s.fire != null && s.fire >= 0 && s.fire < 0.5 ? s.fire : -1, k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
    R.position.set(...RP); R.rotation.set(0, 0, 0); Lf.position.set(...LP); Lf.rotation.set(0, 0, 0); hook.visible = false; coil.visible = true; for (const g of guy) g.visible = false;
    if (f >= 0) {
      // the lash: up and back, then cracked forward
      const w = lrhSm(0, 0.1, f), c2 = lrhSm(0.1, 0.2, f), u = 1 - lrhSm(0.25, 0.5, f);
      R.position.set(lrhLerp(RP[0], lrhLerp(0.32, 0.22, c2), u), lrhLerp(RP[1], lrhLerp(-0.12, -0.24, c2), u * Math.max(w, c2)), lrhLerp(RP[2], lrhLerp(-0.34, -0.58, c2), u));
      R.rotation.set(lrhLerp(0, lrhLerp(0.7 * w, -0.6, c2), u), 0, lrhLerp(0, -0.3 * c2, u));
    }
    if (s.alt) { R.position.set(0.24, -0.2, -0.48); R.rotation.set(0.6, 0, -0.25); Lf.position.set(-0.24, -0.2, -0.48); Lf.rotation.set(0.6, 0, 0.25); coil.visible = false; for (const g of guy) g.visible = true; }
    if (k === 'a1' && t < 0.7) { const w = lrhSm(0, 0.14, t), fl = lrhSm(0.14, 0.26, t), bk = 1 - lrhSm(0.4, 0.7, t); R.position.set(RP[0], lrhLerp(RP[1], lrhLerp(-0.12, -0.22, fl), Math.max(w, fl) * bk), lrhLerp(RP[2], lrhLerp(-0.3, -0.6, fl), bk)); R.rotation.set(lrhLerp(0, lrhLerp(0.8 * w, -0.5, fl), bk), 0, 0); hook.visible = t < 0.2; coil.visible = t > 0.2; Lf.position.set(-0.28, lrhLerp(LP[1], -0.22, fl * bk), -0.5); }
    if (k === 'a2' && t < 3.1) { const q = lrhSm(0, 0.15, t) * (1 - lrhSm(2.85, 3.1, t)); R.position.y -= 0.07 * q; Lf.position.y -= 0.07 * q; R.position.x -= 0.05 * q; Lf.position.x += 0.05 * q; R.rotation.z = 0.5 * q; Lf.rotation.z = -0.5 * q; }
    if (k === 'ult' && t < 1.6) { const o = lrhSm(0, 0.2, t) * (1 - lrhSm(1.3, 1.6, t)), ph = t * 11; R.position.set(lrhLerp(RP[0], 0.32, o), RP[1] + o * (0.04 + 0.05 * Math.sin(ph)), RP[2] + o * 0.12 * Math.sin(ph)); Lf.position.set(lrhLerp(LP[0], -0.34, o), LP[1] + o * (0.04 - 0.05 * Math.sin(ph)), LP[2] - o * 0.12 * Math.sin(ph)); coil.visible = o < 0.5; }
    // the line between the fists, sagging a little
    line.visible = !s.alt && !(k === 'ult' && t < 1.4); W.a.set(R.position.x - 0.03, R.position.y - 0.06, R.position.z - 0.01); W.b.set(Lf.position.x + 0.04, Lf.position.y - 0.01, Lf.position.z - 0.02); lrhCableLay(lineM, W.b, W.a, 0.4);
  };
  return { muzzle, anim };
}
lrDefHeroArt('cable', { spec: { h: 2.25, hipY: 1.02, stride: 2.0, spd: 4.9 }, model: lrhCable, view: lrhCableView, portraitY: 0.32 });

// the net: 5 x 2.5 m, centred at its bottom middle, facing +-z: a mesh of tarred rope on a head rope, cork floats in
// the crew's colours along the top, leads along the foot, a boathook stood at each end with a pennant, and a faint glow
// so it reads as something shots stop on
function lrhCableNetArt(team) {
  const TC = LRH_TEAM[team ? 1 : 0], B = lrBatch(), g = new THREE.Group(); g.name = 'lrWall:cablenet';
  const W = LRH_CABLE.netW, H = LRH_CABLE.netH, n = 15, m = 8;
  for (let i = 0; i <= n; i++) { const x = -W / 2 + i * W / n, sag = Math.sin(i / n * Math.PI) * 0.06; B.rod([x, 0.12, sag], [x, H - 0.1, sag * 0.5], 0.016, LRH_TAR, 4); }
  for (let j = 0; j <= m; j++) { const y = 0.12 + j * (H - 0.22) / m; for (let i = 0; i < n; i++) { const x0 = -W / 2 + i * W / n, x1 = x0 + W / n; B.rod([x0, y - 0.03 * (i % 2), 0], [x1, y - 0.03 * ((i + 1) % 2), 0], 0.014, j % 3 ? LRH_TAR : 0x4a3a26, 4); } }
  B.rod([-W / 2 - 0.1, H - 0.08, 0], [W / 2 + 0.1, H - 0.08, 0], 0.04, 0x3a2e1e, 6);      // the head rope
  B.rod([-W / 2, 0.08, 0], [W / 2, 0.08, 0], 0.03, 0x3a2e1e, 6);                         // the foot rope
  for (let i = 0; i < 10; i++) { const x = -W / 2 + 0.25 + i * (W - 0.5) / 9; B.add('cyl:8', TC.main, x, H - 0.08, 0, 0, 0, Math.PI / 2, 0.08, 0.2, 0.08); B.add('cyl:8', TC.trim, x, H - 0.08, 0, 0, 0, Math.PI / 2, 0.085, 0.05, 0.085); }
  for (let i = 0; i < 8; i++) B.add('cyl:6', 0x5a5c62, -W / 2 + 0.35 + i * (W - 0.7) / 7, 0.08, 0, 0, 0, Math.PI / 2, 0.045, 0.12, 0.045);
  for (const s of [-1, 1]) {
    B.rod([s * (W / 2 + 0.1), 0, 0], [s * (W / 2 + 0.1), H + 0.35, 0], 0.045, LRH_WOOD, 6);
    B.add('cone:6', LRH_IRON, s * (W / 2 + 0.1), H + 0.42, 0, 0, 0, 0, 0.05, 0.16, 0.05);
    B.add('box', TC.main, s * (W / 2 + 0.1) - s * 0.2, H + 0.18, 0, 0, 0, 0, 0.36, 0.18, 0.02);   // a pennant in the crew's colour
    B.add('box', TC.trim, s * (W / 2 + 0.1) - s * 0.2, H + 0.18, 0, 0, 0, 0, 0.36, 0.05, 0.025);
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }), mesh = B.mesh(mat); g.add(mesh);
  // (seen faint by Cable himself through his own eyes, so it doesn't blind him)
  mesh.onBeforeRender = () => {
    let own = false; const me = lrMe();
    if (me && me.alive && me.hero === 'cable') for (const w of LRM.walls) if (w.k === 'cablenet' && w.owner === me.i && Math.abs(w.x - g.position.x) < 0.01 && Math.abs(w.z - g.position.z) < 0.01) own = true;
    const op = own ? 0.35 : 1; if (mat.opacity !== op) { mat.opacity = op; mat.depthWrite = op === 1; }
  };
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W, H - 0.1), new THREE.MeshBasicMaterial({ color: TC.glow, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  glow.position.y = H / 2; g.add(glow);
  let T = 0; glow.onBeforeRender = () => { T += 0.016; glow.material.opacity = 0.07 + 0.03 * Math.sin(T * 5); };
  return g;
}
lrDefWallArt('cablenet', lrhCableNetArt);

// the hook in flight: the iron hook, point first, and the rope paid out behind it back to his hand
lrDefProjArt('cablehook', (g) => {
  const B = lrBatch(), h = new THREE.Group(); h.rotation.x = Math.PI / 2; g.add(h);
  lrhCableHookParts(B, 1.1); h.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
  const rope = new THREE.Mesh(lrhCableUnitRod(), new THREE.MeshLambertMaterial({ color: LRH_TAR })); rope.frustumCulled = false; g.add(rope);
  const A = new THREE.Vector3(), Bv = new THREE.Vector3(), Z = new THREE.Vector3();
  rope.onBeforeRender = () => {
    g.getWorldPosition(A); let best = null, bd = 4;
    for (const j of LRM.proj) { if (j.k !== 'cablehook') continue; const d = Math.hypot(j.x - A.x, j.y - A.y, j.z - A.z); if (d < bd) { bd = d; best = j; } }
    const o = best && LRM.P[best.owner]; if (!o) { rope.scale.set(0.001, 0.001, 0.001); rope.updateMatrixWorld(true); return; }
    const me = lrMe(), fp = o === me && me.alive, sy = Math.sin(o.yaw), cy = Math.cos(o.yaw);
    Bv.set(o.x + cy * (fp ? 0.3 : 0.45) - sy * 0.3, o.y + o.h * (fp ? 0.72 : 0.8), o.z - sy * (fp ? 0.3 : 0.45) - cy * 0.3);
    g.worldToLocal(Bv); lrhCableLay(rope, Z, Bv, 0.8); rope.updateMatrixWorld(true);
  };
});

// the effects: the lash's crack (a pool of eight ropes, each a run of segments thrown out along his look), the net
// shaken out, the haul (a taut rope from him to whoever's caught, while they fly), the belay's pegs and lines round
// his feet, the Snatch Block's ropes out to everyone it takes
lrDefFx('lash', {
  init(X) {
    const N = 12;
    return X.pool(8, () => { const g = new THREE.Group(), seg = []; for (let k = 0; k < N; k++) { const s = new THREE.Mesh(lrhCableUnitRod(), new THREE.MeshLambertMaterial({ color: LRH_TAR, transparent: true })); s.frustumCulled = false; g.add(s); seg.push(s); } return { obj: g, seg, pts: Array.from({ length: N + 1 }, () => new THREE.Vector3()) }; });
  },
  spawn(o, X, P) {
    const s = X.take(P); s.obj.visible = true; s.life = s.max = 0.3; s.o = o; s.cracked = false; const me = lrMe(); s.mine = !!(me && o.v === me.i && me.alive);
    s.d = lrDir(o.yaw || 0, Math.max(-0.6, Math.min(0.6, o.pitch || 0))); s.rx = Math.cos(o.yaw || 0); s.rz = -Math.sin(o.yaw || 0); s.sd = Math.random() < 0.5 ? 1 : -1;
  },
  update(dt, X, P) {
    const R = LRH_CABLE.lash;
    for (const s of P) {
      if (s.life <= 0) continue; s.life -= dt; if (s.life <= 0) { s.obj.visible = false; continue; }
      const T = s.max - s.life, ext = lrhSm(0, 0.11, T), o = s.o, N = s.seg.length, fade = 1 - lrhSm(0.16, 0.3, T);
      // the rope rolls out along a travelling wave that dies as it straightens, bellied up a little, then snaps
      for (let k = 0; k <= N; k++) {
        const u = k / N, L = (s.mine ? 0.7 : 0) + u * R * ext, wv = Math.sin(u * 7 - T * 40) * 0.35 * (1 - u * 0.4) * (1 - ext * 0.7) * s.sd;
        s.pts[k].set(o.x + s.d[0] * L + s.rx * wv, o.y + s.d[1] * L + Math.sin(u * Math.PI) * 0.25 * (1 - ext * 0.5) - u * u * 0.3 * (1 - ext), o.z + s.d[2] * L + s.rz * wv);
      }
      for (let k = 0; k < N; k++) { const g = s.seg[k], w = lrhLerp(2.6, 1.0, k / N) * (s.mine ? 0.45 : 1); lrhCableLay(g, s.pts[k], s.pts[k + 1], w); g.scale.y *= 1.05; g.material.opacity = fade; }
      if (!s.cracked && T > 0.1) { s.cracked = true; const e = s.pts[N]; X.sprite(e.x, e.y, e.z, 0xfff4d8, 0.8, 0.1); X.burst(e.x, e.y, e.z, 0xe8d8b0, 6, 3, 0.12, 0.25); X.smoke(e.x, e.y, e.z, 1, 0.3, 0.5, 0x6a6058); }
    }
  },
});
lrDefFx('netup', (o, X) => { const fx = -Math.sin(o.yaw || 0), fz = -Math.cos(o.yaw || 0), rx = -fz, rz = fx; for (let k = 0; k < 8; k++) { const u = (k / 7 - 0.5) * 5; X.sprite(o.x + rx * u, o.y + 0.6, o.z + rz * u, 0x9a8a68, 0.35, 0.5, 0, 0.6, 0, 0.3, 0, true); } X.sprite(o.x, o.y, o.z, X.TCol(o.team).glow, 1.6, 0.18); });
lrDefFx('hookmiss', (o, X) => { if (o.hit) { X.burst(o.x, o.y, o.z, 0xffd090, 8, 3, 0.12, 0.3); X.sprite(o.x, o.y, o.z, 0xfff0c0, 0.5, 0.08); } else X.smoke(o.x, o.y, o.z, 1, 0.3, 0.4, 0x7a7064); });
lrDefFx('hookthrow', (o, X) => { const me = lrMe(); if (!(me && o.v === me.i && me.alive)) X.sprite(o.x, o.y, o.z, 0xd8d0c0, 0.6, 0.12); });
lrDefFx('haul', {
  init(X) { return X.pool(4, () => { const r = new THREE.Mesh(lrhCableUnitRod(), new THREE.MeshLambertMaterial({ color: LRH_TAR })); r.frustumCulled = false; const hk = lrBatch(); lrhCableHookParts(hk, 0.9); const h = hk.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })); const g = new THREE.Group(); g.add(r); g.add(h); return { obj: g, r, h }; }); },
  spawn(o, X, P) { const s = X.take(P); s.o = o; s.obj.visible = true; s.life = s.max = 0.5; X.burst(o.x, o.y, o.z, 0xffd090, 8, 3, 0.14, 0.3); },
  update(dt, X, P) {
    const W = LRH_CABLE_V;
    for (const s of P) {
      if (s.life <= 0) continue; s.life -= dt; if (s.life <= 0) { s.obj.visible = false; continue; }
      const a = LRM.P[s.o.v], q = LRM.P[s.o.q]; if (!a || !q) { s.obj.visible = false; s.life = 0; continue; }
      const me = lrMe(), fp = a === me && me.alive;
      W.a.set(a.x + Math.cos(a.yaw) * 0.4, a.y + a.h * (fp ? 0.7 : 0.75), a.z - Math.sin(a.yaw) * 0.4); W.b.set(q.x, q.y + q.h * 0.6, q.z);
      lrhCableLay(s.r, W.a, W.b, 1.8); s.h.position.copy(W.b); s.h.quaternion.copy(s.r.quaternion);
    }
  },
});
lrDefFx('belay', {
  // three iron pegs driven in round his feet, a line from each to his belt, a ring of the crew's colour, for the three seconds
  init(X) {
    return X.pool(4, () => {
      const g = new THREE.Group(), pegs = [], lines = [];
      for (let k = 0; k < 3; k++) { const pb = lrBatch(); pb.add('cyl:6', LRH_IRON, 0, 0.12, 0, 0, 0, 0, 0.035, 0.3, 0.035); pb.add('tor:8:0.3', 0x5a5c62, 0, 0.29, 0, 0, Math.PI / 2, 0, 0.05); pb.add('cone:6', LRH_IRON, 0, -0.06, 0, Math.PI, 0, 0, 0.04, 0.12, 0.04); const pm = pb.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })); g.add(pm); pegs.push(pm); const l = new THREE.Mesh(lrhCableUnitRod(), new THREE.MeshLambertMaterial({ color: LRH_TAR })); l.frustumCulled = false; g.add(l); lines.push(l); }
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.1, 32), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; g.add(ring);
      return { obj: g, pegs, lines, ring };
    });
  },
  spawn(o, X, P) { const s = X.take(P); s.o = o; s.obj.visible = true; s.life = s.max = 3; s.ring.material.color.setHex(X.TCol(o.team).glow); const y = X.gy(o.x, o.z); X.smoke(o.x, y + 0.1, o.z, 4, 0.5, 0.8, 0x7a7064); X.ring(o.x, y + 0.06, o.z, 0.3, 1.6, X.TCol(o.team).main, 0.4, 0.7); },
  update(dt, X, P) {
    const W = LRH_CABLE_V;
    for (const s of P) {
      if (s.life <= 0) continue; s.life -= dt; const a = LRM.P[s.o.v]; if (s.life <= 0 || !a || !a.alive) { s.obj.visible = false; s.life = 0; continue; }
      const y = X.gy(a.x, a.z); s.ring.position.set(a.x, y + 0.05, a.z); s.ring.material.opacity = 0.35 + 0.2 * Math.sin(s.life * 8);
      for (let k = 0; k < 3; k++) {
        const ang = a.yaw + Math.PI + (k - 1) * 1.6, px = a.x + Math.sin(ang) * 1.0, pz = a.z + Math.cos(ang) * 1.0;
        s.pegs[k].position.set(px, y, pz); W.a.set(px, y + 0.28, pz); W.b.set(a.x, a.y + 0.95, a.z); lrhCableLay(s.lines[k], W.a, W.b, 0.9);
      }
    }
  },
});
lrDefFx('snatch', {
  // a rope to each of them (up to five) from the block at his chest, taut while they come, and a flash of the crew's colour
  init(X) {
    return X.pool(3, () => { const g = new THREE.Group(), ropes = []; for (let k = 0; k < 5; k++) { const r = new THREE.Mesh(lrhCableUnitRod(), new THREE.MeshLambertMaterial({ color: LRH_TAR })); r.frustumCulled = false; g.add(r); ropes.push(r); } const bb = lrBatch(); bb.add('cyl:10', LRH_WOOD, 0, 0, 0, Math.PI / 2, 0, 0, 0.16, 0.08, 0.16); bb.add('box', LRH_IRON, 0, 0.1, 0, 0, 0, 0, 0.1, 0.24, 0.1); bb.add('tor:8:0.3', LRH_IRON, 0, 0.25, 0, 0, 0, 0, 0.06); const blk = bb.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })); g.add(blk); return { obj: g, ropes, blk }; });
  },
  spawn(o, X, P) {
    const s = X.take(P); s.o = o; s.obj.visible = true; s.life = s.max = 0.7;
    const c = X.TCol(o.team); X.sprite(o.x, o.y, o.z, c.glow, 3, 0.25); X.ring(o.x, X.gy(o.x, o.z) + 0.08, o.z, 0.5, 11, c.main, 0.5, 0.6);
    for (const i of o.vs || []) { const q = LRM.P[i]; if (q) X.burst(q.x, q.y + 1, q.z, 0xffd090, 6, 3, 0.14, 0.3); }
  },
  update(dt, X, P) {
    const W = LRH_CABLE_V;
    for (const s of P) {
      if (s.life <= 0) continue; s.life -= dt; const a = LRM.P[s.o.v]; if (s.life <= 0 || !a) { s.obj.visible = false; s.life = 0; continue; }
      const out = lrhSm(0, 0.12, s.max - s.life); W.a.set(a.x - Math.sin(a.yaw) * 0.35, a.y + a.h * 0.72, a.z - Math.cos(a.yaw) * 0.35); s.blk.position.copy(W.a); s.blk.rotation.y = a.yaw;
      const vs = s.o.vs || [];
      for (let k = 0; k < 5; k++) {
        const q = LRM.P[vs[k]], r = s.ropes[k]; if (!q || !q.alive) { r.visible = false; continue; } r.visible = true;
        W.b.set(q.x, q.y + q.h * 0.55, q.z).sub(W.a).multiplyScalar(out).add(W.a); lrhCableLay(r, W.a, W.b, 2.0);
      }
    }
  },
});
