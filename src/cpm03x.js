'use strict';
// The Chronicle of the Light, mission 3, Lighting the Light (1841): its three stages (the mission itself, its
// cinematics and the Light's kit are in src/cpm03.js).
//
// The rock in 1841: the tower stands finished to its lantern, whitewashed, a timber scaffold still up its south face to
// the gallery and a hoist on it (a jib off the gallery, a rope down to a crab winch at the foot); round its foot the
// keeper's station is a ring of foundations and half-raised walls, heaps of dressed granite, timber, a tool shed and the
// workmen's fire; the jetty is a timber pier with its T-head half built, the supply lugger alongside. No sea wall yet,
// no courtyard: the shingle runs up from the harbour to the works. Laid out in the Lighthouse's own look (src/cpm03.js
// cplight), so it's recognisably the same rock, forty-odd years younger.
//
//  I.   The Landing (cp_m03land). Late in the day. The lugger's hold has the lens's crates (5 + one for each of you):
//       take one off her at the T-head (Use), carry it up the pier to the hoist at the tower's foot (slowly: no gun in
//       your hands), and set it down there (Use). At the crab winch beside it, hold Use to wind a crate up to the
//       gallery (two at the handle wind quicker). Every so often a big sea breaks over the outer pier (warned a few
//       seconds before): anyone out there is thrown down, and a crate in their arms goes in the water (the lugger's
//       men fish it out, and it's back in her hold). Done once every crate is up.
//  II.  The Haar (cp_m03haar). Night, and a fog off Lantern Rock, the old fire red in it. The lens's heart (the great
//       bull's-eye, in its own crate) went over the side in the last of the seas, and fetched up on the north rocks,
//       the far side of the rock. Five work braziers stand cold on the way out there: hold Use at one to light it.
//       Every one lit pushes the fog back a little, and the things that come up out of the sea (crabs, as big as dogs)
//       won't cross into a lit brazier's light. Every so often a breath of the haar comes off Lantern Rock and puts out
//       a lit brazier nobody's standing by. Take up the heart (Use), carry it back round the tower to the hoist (slower
//       still), set it down, and wind it up. Downed with it, you drop it where you fall.
//  III. The Lantern (cp_m03lamp). Up in the lantern room, the lens's frame stands empty on its pedestal. Six panels of
//       prisms, each marked with its numeral, in the crates out on the gallery: take one, and seat it in the frame at
//       the place marked with the same numeral (hold Use). Then the lamp: oil from the Service Room below (the floor
//       under the lantern), poured in at the lamp; then hold Use at the lamp with the Lampwright's taper to light it.
//       The outro is the first light.
// Together: the host keeps it all in RAID.st and sends it in the stage's word; joined players ask with raidAsk.

const M3 = { LUG: [-7, -69.6], PILE: [-7.6, -63.1], FOOT: [0, -12.3], WINCH: [2.6, -12.9], ROPE: [0, ZMT.Y - 12.9], DT: 0.9, WIND: 7, WAVE: [17, 24], WARN: 3.2,
  HEART: [-6, 71], BRAZ: [[1.5, 15.5], [9, 28], [-5, 41], [5, 54], [-4.5, 65]], BR_R: 5.5, HUFF: [22, 30], SLOW: 0.72, SLOW2: 0.58 };
var M3N = { npc: [] };   // (each stage's people, built in its b3 and freed as it ends)

// ---------- the rock in 1841 ----------
function m3Lay(H, K, Z, o) {
  const { put, light } = K, OX = FPSC.CX, OY = FPSC.CY, DT = M3.DT;
  const T = cplTower(H, K, Z, { lamps: !!o.lamps, top: o.top });
  // the jetty: the pier, and the T-head across its end (its east arm still only piles)
  Z.bay = true; Z.decks = [];
  const deck = (x0, x1, y0, y1) => { put('deck', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0, top: DT }); Z.decks.push([OX + x0, OX + x1, OY + y0, OY + y1]); };
  deck(-3, 3, -60.2, -41.25); deck(-12, 4.5, -66, -60);
  for (let x = 6; x <= 12; x += 2) for (const y of [-60.4, -65.6]) put('post', x, y, 0, { r: 0.16, hh: 0.6 });
  put('step', 0, -40.75, 0, { w: 6.0, d: 1.0, hh: DT * 2 / 3 }); put('step', 0, -39.75, 0, { w: 6.0, d: 1.0, hh: DT / 3 });
  for (const [x0, x1, y0, y1] of [[-34, -3, -60, -41.25], [3, 34, -60, -41.25], [-34, -12, -66, -60], [4.5, 34, -66, -60], [-34, 34, -82, -66]]) put('seaguard', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0 });
  (Z.keep = Z.keep || []).push(...[[-34, -3.2], [3.2, 34]].map(([x0, x1]) => ({ b: [OX + x0, OX + x1, OY - 41.6, OY - 40.4] })));
  for (const [x, y, r] of [[-2.66, -45.2, 1], [2.66, -52.6, 0], [-2.66, -58.4, 1], [-4.6, -60.36, 1], [-9.6, -65.64, 1], [3.2, -65.64, 0]]) put('bollard', x, y, 0, { rope: !!r, free: true, lift: DT });
  for (const [x, y, a] of [[2.62, -43.6, Math.PI], [-2.62, -53.5, 0], [-11.6, -60.5, 0]]) { const pp = put('post', x, y, a, { r: 0.13, hh: 2.5, lamp: true, lift: DT }); light(x + Math.cos(a) * 0.5, y + Math.sin(a) * 0.5, DT + 2.15, '#ffc070', 10, 'lantern'); H.I.lights[H.I.lights.length - 1].p = pp; }
  for (const [x, y, w, hh, gl] of [[-19, -55, 2.2, 1.5, 1], [17.5, -50.5, 1.8, 1.1, 0], [21, -70, 3.0, 2.0, 1], [-24, -72, 2.4, 1.3, 0], [26, -44.5, 1.6, 0.9, 1], [-30, -62, 2.0, 1.6, 1]]) put('gullrock', x, y, w * 2, { w, d: w * 0.8, hh, gull: !!gl });
  // the works: the station's foundations, a course or three of granite, and the walls of its south front half raised
  const fw = (x0, y0, x1, y1, hh, jag) => { const len = Math.hypot(x1 - x0, y1 - y0); put('wall', (x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(y1 - y0, x1 - x0), { len, th: 0.55, hh, mat: 'stone', cap: false, jag: jag == null ? 0.5 : jag }); };
  fw(-26, -21, -12.5, -21, 1.6); fw(-7.5, -21, 7.5, -21, 2.2, 0.35); fw(12.5, -21, 26, -21, 1.3);
  fw(-26, -21, -26, -9.5, 0.9); fw(26, -21, 26, -9.5, 1.0); fw(-10, -21, -10, -9.5, 1.8); fw(10, -21, 10, -9.5, 1.5);
  fw(-26, -9.5, -16, -9.5, 0.7); fw(16, -9.5, 26, -9.5, 0.8); fw(-16, -9.5, -16, 14, 0.6, 0.3); fw(16, -9.5, 16, 14, 0.6, 0.3); fw(-26, 14, -8, 14, 0.6, 0.3); fw(8, 14, 26, 14, 0.6, 0.3);
  // dressed stone waiting, timber, a cart, the tool shed and the workmen's fire
  for (const [x, y, a, n] of [[-17, -27, 0.2, 3], [14, -26, -0.3, 2], [-20, 4, 0.5, 2], [21, 20, 0.1, 3]]) for (let i = 0; i < n; i++) put('block', x + (i % 2) * 1.3, y + Math.floor(i / 2) * 1.1, a, { w: 1.2, d: 0.9, hh: 0.6 + (i === n - 1 ? 0.6 : 0), col: '#8a8a84' });
  put('log', 18, -30, 0.3, { len: 6, rad: 0.25 }); put('log', 18.3, -31, 0.32, { len: 5.5, rad: 0.22 }); put('log', -22, -32, -0.2, { len: 6, rad: 0.24 });
  put('cart', -6.5, -27, 0.4, {}); put('shed', 21, -36, 0, { w: 3.6, d: 4.4, door: 1.0 });
  put('fire', -12, -33, 0, {}); light(-12, -33, 0.6, '#ff8a30', 9, 'fire');
  fpiBarrels(H, OX + 9.5, OY - 33); fpiCrates(H, OX - 15, OY - 36.5, false);
  for (const [x, y, a] of [[-4, -29, 0], [6, -18.5, Math.PI], [-8, 18, 0]]) fpiLanternPost(H, OX + x, OY + y, a);
  // the scaffold up the tower's south face: its standards (two rows), and the hoist's winch at the foot
  for (const r of [11.7, 13.1]) for (const da of [-0.62, -0.31, 0, 0.31, 0.62]) { const a = -Math.PI / 2 + da; if (r < 12 && Math.abs(da) < 0.1) continue; put('post', ZMT.X + Math.cos(a) * r, ZMT.Y + Math.sin(a) * r, 0, { r: 0.11, hh: 26.2 }); }
  put('block', M3.WINCH[0], M3.WINCH[1], 0, { w: 1.3, d: 0.9, hh: 0.9, col: '#4a3a28' });
  // the north rocks: the far side of the rock, broken granite down to the sea
  { const rr = seeded(0x3b81);
    for (let i = 0; i < 26; i++) { const a = Math.PI * (0.18 + rr() * 0.64), d = 52 + rr() * 30, x = Math.cos(a) * d, y = Math.sin(a) * d; if (Math.hypot(x - M3.HEART[0], y - M3.HEART[1]) < 4 || M3.BRAZ.some(b => Math.hypot(x - b[0], y - b[1]) < 3.4)) continue; put('stone', x, y, rr() * 6.283, { w: 1.2 + rr() * 2.4, d: 1 + rr() * 1.6, hh: 0.6 + rr() * 1.6 }); }
    for (let i = 0; i < 40; i++) { const x = (rr() - 0.5) * 120, y = -36 + rr() * 110; if (Math.hypot(x, y - 1.5) < 13 || (Math.abs(x) < 14 && y < -38)) continue; H.decor('tuft', OX + x, OY + y, { s: 0.6 + rr() * 0.7, c: rr() < 0.5 ? '#4e6a38' : '#5e7040' }); }
  }
  return T;
}
// the scaffold and the hoist's jib, rope and wheel (only to look at: its standards are solids already)
function m3Scaffold(grp) {
  const G0 = FPSC.GROUND, TX = FPSC.CX + ZMT.X, TY = FPSC.CY + ZMT.Y, wood = z3Lam('#6a5236'), plank = z3Lam('#8a7050'), parts = [], planks = [];
  const at = (r, a, h) => z3v(TX + Math.cos(a) * r, TY + Math.sin(a) * r, G0 + h);
  const beam = (p, q, th, list) => { const d = q.clone().sub(p), L = d.length(), b = new THREE.BoxGeometry(th, L, th); const m = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); b.applyMatrix4(m); const c = p.clone().add(q).multiplyScalar(0.5); b.translate(c.x, c.y, c.z); list.push(b); };
  const das = [-0.62, -0.31, 0, 0.31, 0.62];
  for (const r of [11.7, 13.1]) for (const da of das) { if (r < 12 && Math.abs(da) < 0.1) continue; const a = -Math.PI / 2 + da; beam(at(r, a, -0.2), at(r, a, 26.2), 0.2, parts); }
  for (let h = 2.5; h <= 25; h += 2.5) {
    for (const r of [11.7, 13.1]) for (let i = 0; i < das.length - 1; i++) beam(at(r, -Math.PI / 2 + das[i], h), at(r, -Math.PI / 2 + das[i + 1], h), 0.12, parts);
    for (const da of das) beam(at(11.6, -Math.PI / 2 + da, h), at(13.2, -Math.PI / 2 + da, h), 0.12, parts);
    if (h % 5 === 0) for (let i = 0; i < das.length - 1; i++) { if (Math.abs(das[i] + das[i + 1]) < 0.1) continue; for (const rr of [11.95, 12.4, 12.85]) beam(at(rr, -Math.PI / 2 + das[i] + 0.02, h + 0.06), at(rr, -Math.PI / 2 + das[i + 1] - 0.02, h + 0.06), 0.4, planks); }
  }
  for (let i = 0; i < das.length - 1; i++) for (let h = 0; h < 25; h += 5) beam(at(13.1, -Math.PI / 2 + das[i], h), at(13.1, -Math.PI / 2 + das[i + 1], h + 5), 0.1, parts);
  const mp = z3Merge(parts); if (mp) grp.add(new THREE.Mesh(mp, wood));
  const mq = z3Merge(planks); if (mq) grp.add(new THREE.Mesh(mq, plank));
  // the jib off the gallery, its wheel, and the rope down to the winch
  const jib = []; const a = -Math.PI / 2; beam(at(9.6, a, ZMT.L[5] + 1.2), at(13.4, a, ZMT.L[5] + 1.6), 0.28, jib); beam(at(9.6, a, ZMT.L[5] + 0.1), at(12.9, a, ZMT.L[5] + 1.5), 0.18, jib);
  const mj = z3Merge(jib); if (mj) grp.add(new THREE.Mesh(mj, wood));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 16), z3Lam('#2a2a2c')); wheel.position.copy(at(12.9, a, ZMT.L[5] + 1.25)); grp.add(wheel);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5), z3Lam('#b8a680')); grp.add(rope);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 10), z3Lam('#4a3a28')); drum.rotation.x = Math.PI / 2; drum.position.copy(z3v(FPSC.CX + M3.WINCH[0], FPSC.CY + M3.WINCH[1], G0 + 1.2)); grp.add(drum);
  const crank = new THREE.Group(); crank.position.copy(drum.position); grp.add(crank);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), z3Lam('#2a2a2c')); arm.position.set(0, 0.25, 0.62); crank.add(arm);
  return { rope, crank, top: at(12.9, a, ZMT.L[5] + 1.0), foot: z3v(FPSC.CX + M3.ROPE[0], FPSC.CY + M3.ROPE[1], G0 + 0.3) };
}
// a crate, for piles (the carried ones are src/cpm03.js cplCarryModel)
function m3Crate(s) { const g3 = new THREE.Group(), wood = z3Lam('#7a5a38'), dark = z3Lam('#3a2a1c'); const b = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.8, s), wood); g3.add(b); for (const y of [-s * 0.3, s * 0.3]) { const r = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, 0.05, s * 1.02), dark); r.position.y = y; g3.add(r); } return g3; }
// a pile of n crates (up to max), laid out from a point
function m3Pile(grp, x, y, z, max, s) {
  const list = [];
  for (let i = 0; i < max; i++) { const c = m3Crate(s || 0.6), row = i % 3, lay = Math.floor(i / 3); c.position.copy(z3v(FPSC.CX + x + (row - 1) * 0.68 + (lay % 2) * 0.2, FPSC.CY + y + ((i * 7) % 3 - 1) * 0.15, FPSC.GROUND + z + 0.24 + lay * 0.5)); c.rotation.y = (i * 1.7) % 0.5 - 0.25; grp.add(c); list.push(c); }
  return n => list.forEach((c, i) => { c.visible = i < n; });
}
// the people of a stage: [castKey, cols, x, y, h, opts]; built in b3, posed each frame, freed at its exit
function m3People(list) {
  for (const P of M3N.npc) cpkNpcFree(P.F);
  M3N.npc = list.map(([k, cols, x, y, h, o]) => Object.assign({ k, F: cpkNpc(cols), x, y, h, z: 0 }, o || {}));
}
function m3PeoplePose(dt) { for (const P of M3N.npc) if (P.F) cpkNpcPose(P.F, { x: FPSC.CX + P.x, y: FPSC.CY + P.y, h: P.h, jz: P.z || 0, spd: P.spd || 0, dt, lan: !!P.lan, noGun: true, p: P.p || 0 }), cplGunAway(P.F); }
function m3PeopleFree() { for (const P of M3N.npc) cpkNpcFree(P.F); M3N.npc = []; }
const M3C = { lamp: ['#2a2420', '#d8d0bc', '#8a6a3a', '#ffd88a'], fore: ['#4a3a2a', '#c8c0aa', '#6a5a3a', '#ffd88a'], hand: ['#5a4a38', '#b8b0a0', '#4a3a28', '#ffd88a'], hand2: ['#3a3a40', '#c8c0b0', '#5a4a3a', '#ffd88a'] };
const m3Nick = sid => { if (sid === FPS.me.id) return 'You'; const r = FPS.remote.get(sid); return r && r.n ? r.n : 'Someone'; };

// ---------- I. The Landing ----------
cpStage('m03land', {
  n: 'The Landing',
  map: { start: [0, -57], top: M3.DT, isle: 'cplight', shore: CPL_SHORE, nav: [-80, 80, -80, 80], zones: { jetty: { n: 'the jetty', r: [-12.3, 12.3, -66.3, -39.3], sky: true }, works: { n: 'the works', r: [-60, 60, -39.3, 80], sky: true } } },
  set(H, K, Z) { m3Lay(H, K, Z, { lamps: false, top: false }); },
  enter() {
    const n = Math.max(1, ZM.hum.length || 1);
    Object.assign(RAID.st, { N: 5 + n, boat: 5 + n, foot: 0, up: 0, lift: 0, winders: {}, carry: {}, waveT: M3.WAVE[0] + 4, wseq: 0, warn: 0, said: {}, t: 0 });
    if (ZM.net !== 'client') { cpObjective('Carry the lens’s crates from the lugger to the hoist'); cpWaypoint(M3.PILE[0], M3.PILE[1], 'The lugger', 1.6); }
  },
  speedK() { return cplCarrying() ? M3.SLOW : 1; },
  tick(dt) {
    const S = RAID.st; S.t += dt;
    if (cpCineOn()) return;
    // the winch: wound while someone's at the handle (two wind quicker)
    const now = RAID.t; let w = 0; for (const sid in S.winders) if (now - S.winders[sid] < 0.45) w++; else delete S.winders[sid];
    if (S.foot > 0 && w > 0) { S.lift += dt * (w > 1 ? 1.5 : 1) / M3.WIND; if (S.lift >= 1) { S.lift = 0; S.foot--; S.up++; m3LandSay('up'); } }
    // the seas: warned, then breaking over the outer pier
    S.waveT -= dt;
    if (!S.warn && S.waveT <= M3.WARN) { S.warn = 1; cpEvent('m3warn', 1); }
    if (S.waveT <= 0) {
      S.warn = 0; S.wseq++; S.waveT = M3.WAVE[0] + Math.random() * (M3.WAVE[1] - M3.WAVE[0]);
      for (const [sid, x, y, jz] of cplPeople()) if (m3InSea(x, y, jz) && S.carry[sid]) { delete S.carry[sid]; S.boat++; if (!S.said.lost) { S.said.lost = 1; cpSay('fore', 'That sea had it out of your arms! It’s fetched up back aboard the lugger. Go between the seas.', 'cp_m03_21'); } }
    }
    // the objective
    if (S.up >= S.N) { cpObjective(''); cpWaypoint(null); cpDone(); return; }
    const mineAny = Object.keys(S.carry).length;
    if (S.boat > 0 && !mineAny && S.foot === 0) { cpObjective(`Carry the lens’s crates from the lugger to the hoist · ${S.up} of ${S.N} up`); cpWaypoint(M3.PILE[0], M3.PILE[1], 'The lugger', 1.6); }
    else if (S.foot > 0) { cpObjective(`Wind the crates up to the gallery at the crab winch · ${S.up} of ${S.N} up`); cpWaypoint(M3.WINCH[0], M3.WINCH[1], 'The winch', 1.4); }
    else if (mineAny) { cpObjective(`Carry it to the hoist at the tower’s foot · ${S.up} of ${S.N} up`); cpWaypoint(M3.FOOT[0], M3.FOOT[1], 'The hoist', 1.2); }
    // a word now and then
    if (S.t > 25 && !S.said.a) { S.said.a = 1; cpSay('lamp', 'Gently with them. There’s a year of grinding in every one of those crates.', 'cp_m03_22'); }
    if (S.up >= Math.ceil(S.N / 2) && !S.said.b) { S.said.b = 1; cpSay('lamp', 'Half of her up. The light’s going; keep at it.', 'cp_m03_23'); }
  },
  q(sid, k) {
    const S = RAID.st, P = cplPeople().find(p => p[0] === sid); if (!P) return;
    const [, x, y] = P, near = (q, r) => Math.hypot(x - FPSC.CX - q[0], y - FPSC.CY - q[1]) < r;
    if (k === 'take' && !S.carry[sid] && S.boat > 0 && near(M3.PILE, 3.2)) { S.boat--; S.carry[sid] = 'crate'; if (!S.said.take) { S.said.take = 1; cpSay('fore', 'That’s it. Up the pier with her, and mind the seas.', 'cp_m03_24'); } }
    else if (k === 'set' && S.carry[sid] === 'crate' && near(M3.FOOT, 3.4)) { delete S.carry[sid]; S.foot++; if (!S.said.set) { S.said.set = 1; cpSay('lamp', 'Now wind her up. Steady at the handle.', 'cp_m03_25'); } }
    else if (k === 'wind' && S.foot > 0 && near(M3.WINCH, 2.6)) S.winders[sid] = RAID.t;
  },
  me(dt) {
    const S = RAID.st, m = FPS.me;
    // winding: hold Use at the handle
    S.myWind = cplHeld() && ZM.near && ZM.near.k === 'm3winch' && S.foot > 0 && !cpCineOn();
    if (S.myWind) { S.windAsk = (S.windAsk || 0) - dt; if (S.windAsk <= 0) { S.windAsk = 0.2; raidAsk('wind'); } } else S.windAsk = 0;
    // a sea breaking: anyone out on the outer pier is knocked down and thrown back
    if (S.wseq !== S.wseen) {
      if (S.wseen != null && m3InSea(m.x, m.y, m.jz) && !(m.dead > 0)) { m.vz = 4.5; m.y += 1.2; FPS.shake = Math.max(FPS.shake || 0, 0.8); ZM.banner = { text: 'The sea knocked you down', t: 1.8, small: true, col: '#cfe6ff' }; }
      if (S.wseen != null) { try { if (!soundOff()) sfxSplash(0, 1); } catch (e) {} S.crestT = 0; }
      S.wseen = S.wseq;
    }
    if (S.crestT != null) S.crestT += dt;
  },
  pack(o) { const S = RAID.st; o.m = [S.N, S.boat, S.foot, S.up, Math.round(S.lift * 100) / 100, S.wseq, S.warn, Math.round(S.waveT * 10) / 10]; o.c = S.carry; },
  apply(o) {
    const S = RAID.st, a = o.m; if (!Array.isArray(a)) return;
    [S.N, S.boat, S.foot, S.up, S.lift, S.wseq, S.warn, S.waveT] = a.map(v => +v || 0);
    S.carry = o.c && typeof o.c === 'object' ? o.c : {};
  },
  consider(c) {
    const S = RAID.st, W = (q, z) => [FPSC.CX + q[0], FPSC.CY + q[1], z || 0], mine = cplCarryOf(FPS.me.id);
    if (!mine && S.boat > 0) c({ k: 'm3take', id: 'pile' }, ...W(M3.PILE, M3.DT), 2.8, false);
    if (mine === 'crate') c({ k: 'm3set', id: 'foot' }, ...W(M3.FOOT), 3.0, false);
    if (!mine && S.foot > 0) c({ k: 'm3winch', id: 'winch' }, ...W(M3.WINCH), 2.2, false);
  },
  prompt(o) {
    const S = RAID.st;
    if (o.k === 'm3take') return { text: `Take a crate off the lugger (${S.boat} aboard)` };
    if (o.k === 'm3set') return { text: 'Set the crate down at the hoist' };
    if (o.k === 'm3winch') return { text: `Hold to wind the crate up (${S.foot} waiting)`, hold: true };
    return null;
  },
  use(o) {
    if (o.k === 'm3take') { raidAsk('take'); return true; }
    if (o.k === 'm3set') { raidAsk('set'); return true; }
    return o.k === 'm3winch';
  },
  hud(phone, mono, fell) {
    const S = RAID.st;
    cplBar(phone, mono, `THE LENS · ${S.up} OF ${S.N} CRATES UP${S.foot ? ` · ${S.foot} AT THE HOIST` : ''}`, S.up / Math.max(1, S.N), 0);
    if (S.foot > 0 && S.lift > 0) cplBar(phone, mono, 'WINDING UP', S.lift, 1, '#e8d8a8');
    if (S.warn) { ctx.textAlign = 'center'; ctx.font = fell(phone ? 18 : 26); ctx.fillStyle = `rgba(200,230,255,${0.7 + 0.3 * Math.sin(g.t * 9)})`; ctx.fillText('A big sea is coming! Off the outer pier!', cx, H * 0.3); }
  },
  b3(grp) {
    const S = RAID.st;
    m3Common3d(grp);
    const sc = m3Scaffold(grp);
    S.g3 = { sc, boatPile: m3Pile(grp, M3.PILE[0], M3.PILE[1], M3.DT, 12, 0.6), footPile: m3Pile(grp, M3.FOOT[0] - 1.6, M3.FOOT[1] - 0.6, 0, 9, 0.6), topPile: m3Pile(grp, 0, ZMT.Y - 8.4, ZMT.L[5], 12, 0.6), lifting: m3Crate(0.6), lug: cplBrig({ lug: true, lights: false }) };
    grp.add(S.g3.lifting, S.g3.lug);
    // the crest of a breaking sea, sweeping across the outer pier
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 30, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xe8f0f4, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
    crest.rotation.x = Math.PI / 2; grp.add(crest); S.g3.crest = crest;
    m3People([['lamp', M3C.lamp, -2.8, -13.6, Math.PI * 0.1], ['fore', M3C.fore, -5.2, -64.2, Math.PI * 0.6], ['hand', M3C.hand, -9.4, -63.6, 0.4], ['hand', M3C.hand2, 0.6, -18, 0, {}],
      ['hand', M3C.hand, ZMT.X - 1.6, ZMT.Y - 12.4, Math.PI, { z: 10.06 }], ['hand', M3C.hand2, ZMT.X + 3.4, ZMT.Y - 12.1, Math.PI + 0.3, { z: 20.06 }]]);
  },
  f3(dt) {
    const S = RAID.st, G = S.g3; if (!G) return;
    cplSky({ amb: 0.62, moon: 0.4, ambC: [1, 0.86, 0.74], fog: [0.2, 0.17, 0.18], near: 60, far: 640 });
    cplLensSet(0, 0, { rings: 0 }); cplFireSet(1);
    G.boatPile(S.boat); G.footPile(Math.max(0, S.foot - (S.lift > 0 ? 1 : 0))); G.topPile(S.up);
    // the crate going up, and the rope
    const lifting = S.foot > 0 && S.lift > 0, top = G.sc.top, foot = G.sc.foot;
    G.lifting.visible = lifting;
    const hz = foot.y + 0.4 + (top.y - foot.y - 1.2) * S.lift;
    G.lifting.position.set(top.x, hz, top.z); G.lifting.rotation.y = Math.sin(g.t * 0.8) * 0.2;
    const ry0 = lifting ? hz + 0.3 : foot.y + 0.2, len = top.y - ry0;
    G.sc.rope.scale.y = Math.max(0.1, len); G.sc.rope.position.set(top.x, ry0 + len / 2, top.z);
    G.sc.crank.rotation.z = (S.myWind || lifting) ? -g.t * 4 : G.sc.crank.rotation.z;
    // the lugger alongside, rising and falling
    G.lug.position.copy(z3v(FPSC.CX + M3.LUG[0], FPSC.CY + M3.LUG[1], FPSC.GROUND - 0.25 + Math.sin(g.t * 0.9) * 0.18)); G.lug.rotation.set(Math.sin(g.t * 0.7) * 0.04, 0, Math.sin(g.t * 0.9) * 0.03);
    // the sea breaking over the pier: it rises off the east, sweeps across and falls
    const warnK = S.warn ? clamp(1 - S.waveT / M3.WARN, 0, 1) : 0, ct = S.crestT != null ? S.crestT : 9;
    const sweep = ct < 1.6 ? ct / 1.6 : -1;
    G.crest.visible = warnK > 0 || sweep >= 0;
    if (sweep >= 0) { G.crest.position.copy(z3v(FPSC.CX + 20 - sweep * 40, FPSC.CY - 58, FPSC.GROUND + 1.2 + 1.4 * Math.sin(sweep * Math.PI))); G.crest.material.opacity = 0.75 * (1 - sweep * 0.6); G.crest.scale.set(1, 1, 1.4); }
    else if (warnK > 0) { G.crest.position.copy(z3v(FPSC.CX + 30, FPSC.CY - 58, FPSC.GROUND - 1 + warnK * 2.2)); G.crest.material.opacity = 0.5 * warnK; }
    if (sweep >= 0 && Math.random() < dt * 40) fpsPuff(FPSC.CX + 20 - sweep * 40 + (Math.random() - 0.5) * 3, FPSC.CY - 58 + (Math.random() - 0.5) * 14, FPSC.GROUND + 1 + Math.random() * 2.5, '230,240,245', 2.2);
    m3PeoplePose(dt);
    cplCarry3d();
  },
  exit() { m3PeopleFree(); },
  music() { return 'cpm03work'; },
  mend: true,
});
// out on the outer pier, where the seas break?
function m3InSea(x, y, jz) { const lx = x - FPSC.CX, ly = y - FPSC.CY; return ly < -50 && ly > -67 && lx > -12.5 && lx < 5 && (jz || 0) < M3.DT + 1.5; }
function m3LandSay(k) {
  const S = RAID.st;
  if (k === 'up') { if (S.up === 1) cpSay('lamp', 'First of her safe on the gallery.', 'cp_m03_26'); else if (S.up === S.N) cpSay('lamp', 'That’s the last of the prisms. Every one. Well done, all of you.', 'cp_m03_27'); }
}
// (every stage) Lantern Rock out to the north, and the carried things
function m3Common3d(grp) { cplLanternRock(grp); cplCarryBuild(grp); }
cpOn('m3warn', () => { try { if (!soundOff()) sfxSwell(0); } catch (e) {} });

// ---------- II. The Haar ----------
// a cold brazier (or a lit one): an iron bowl on three legs, its fire, its light
function m3Brazier(grp, x, y) {
  const g3 = new THREE.Group(), iron = z3Lam('#2a2a2c'); g3.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND)); grp.add(g3);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 5), iron); l.position.set(Math.cos(a) * 0.25, 0.6, Math.sin(a) * 0.25); l.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); g3.add(l); }
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.25, 0.35, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x2a2a2c, side: THREE.DoubleSide })); bowl.position.y = 1.3; g3.add(bowl);
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), new THREE.MeshBasicMaterial({ color: 0x1a1410 })); coals.rotation.x = -Math.PI / 2; coals.position.y = 1.4; g3.add(coals);
  const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,180,90,0.95)', 'rgba(255,90,30,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); fire.position.y = 1.85; fire.scale.set(1.3, 1.8, 1); g3.add(fire);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,170,90,0.35)', 'rgba(255,140,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.position.y = 1.6; halo.scale.setScalar(9); g3.add(halo);
  const L = new THREE.PointLight(0xffa050, 0, 14, 1.4); L.position.y = 1.9; g3.add(L);
  return { g3, fire, halo, L, coals };
}
function m3BrazierSet(B, lit, t) {
  const fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 11 + B.g3.id) * Math.sin(t * 4.3);
  B.fire.visible = B.halo.visible = !!lit; B.fire.scale.set(1.3 * fl, 1.8 * fl, 1); B.L.intensity = lit ? 2.2 * fl : 0;
  B.coals.material.color.setHex(lit ? 0xff7030 : 0x1a1410);
}
const m3BrazNear = (x, y, r) => RAID.st.brz && M3.BRAZ.some((b, i) => RAID.st.brz[i] && Math.hypot(x - FPSC.CX - b[0], y - FPSC.CY - b[1]) < (r || M3.BR_R));
cpStage('m03haar', {
  n: 'The Haar',
  map: { start: [0, -16], top: 0, isle: 'cplight', shore: CPL_SHORE, nav: [-84, 84, -70, 86], zones: { works: { n: 'the works', r: [-60, 60, -39.3, 46], sky: true }, rocks: { n: 'the north rocks', r: [-84, 84, 46, 90], sky: true } } },
  set(H, K, Z) { m3Lay(H, K, Z, { lamps: false, top: false }); },
  enter() {
    const n = Math.max(1, ZM.hum.length || 1);
    Object.assign(RAID.st, { brz: [0, 0, 0, 0, 0], carry: {}, heart: 'rocks', hx: M3.HEART[0], hy: M3.HEART[1], lift: 0, winders: {}, huffT: M3.HUFF[1], spawnT: 6, n, said: {}, t: 0, huffs: 0, hseq: 0 });
    if (ZM.net !== 'client') { cpObjective('Light the braziers out to the north rocks'); cpWaypoint(M3.BRAZ[0][0], M3.BRAZ[0][1], 'A brazier', 1.6); }
  },
  speedK() { return cplCarryOf(FPS.me.id) === 'heart' ? M3.SLOW2 : 1; },
  tick(dt) {
    const S = RAID.st; S.t += dt;
    if (cpCineOn()) return;
    const P = cplPeople(), lit = S.brz.reduce((a, b) => a + b, 0);
    // the heart in someone's arms when they go down: dropped where they fell
    for (const [sid, x, y, jz, down] of P) if (S.carry[sid] === 'heart' && down) { delete S.carry[sid]; S.heart = 'dropped'; S.hx = x - FPSC.CX; S.hy = y - FPSC.CY; cpSay('lamp', 'Pick it up! Don’t leave it lying for them!', 'cp_m03_28'); }
    for (const sid in S.carry) if (!P.some(p => p[0] === sid)) { delete S.carry[sid]; S.heart = 'dropped'; }
    // the winch
    const now = RAID.t; let w = 0; for (const sid in S.winders) if (now - S.winders[sid] < 0.45) w++; else delete S.winders[sid];
    if (S.heart === 'foot' && w > 0) { S.lift += dt * (w > 1 ? 1.5 : 1) / (M3.WIND + 2); if (S.lift >= 1) { S.heart = 'up'; cpObjective(''); cpWaypoint(null); cpDone(); return; } }
    // a breath of the haar off Lantern Rock: a lit brazier with nobody by it goes out
    S.huffT -= dt;
    if (S.huffT <= 0) {
      S.huffT = M3.HUFF[0] + Math.random() * (M3.HUFF[1] - M3.HUFF[0]);
      const can = M3.BRAZ.map((b, i) => i).filter(i => S.brz[i] && !P.some(p => Math.hypot(p[1] - FPSC.CX - M3.BRAZ[i][0], p[2] - FPSC.CY - M3.BRAZ[i][1]) < 6.5));
      if (can.length) { const i = can[(Math.random() * can.length) | 0]; S.brz[i] = 0; S.hseq++; cpEvent('m3huff', i); S.huffs++; if (S.huffs === 1) cpSay('lamp', 'It’s putting them out. Stand by them, or light them again.', 'cp_m03_29'); }
    }
    // the things out of the sea: crabs, up out of the water round the north of the rock, more on the way back
    S.spawnT -= dt;
    const alive = ZM.z.filter(z => !z.dead).length, back = S.heart !== 'rocks', cap = 4 + 2 * S.n + (back ? 3 : 0);
    if (S.spawnT <= 0 && alive < cap && S.t > 8) {
      S.spawnT = (back ? 1.4 : 2.4) / Math.sqrt(S.n);
      for (let tries = 0; tries < 8; tries++) {
        const a = Math.PI * (0.1 + Math.random() * 0.8), r = 78 + Math.random() * 6, x = FPSC.CX + Math.cos(a) * r, y = FPSC.CY + Math.sin(a) * r;
        if (m3BrazNear(x, y, M3.BR_R + 3) || P.some(p => Math.hypot(p[1] - x, p[2] - y) < 12)) continue;
        const z = raidSpawnAt(x, y, { kind: 'jog', hp: zmHp(ZM.round) * 0.45, rise: 0.8 });
        if (typeof zwDress === 'function') zwDress(z); z.sp = 3.3 + Math.random() * 0.7; z.m3 = 1;
        break;
      }
    }
    // a lit brazier's light: they won't come into it
    for (const z of ZM.z) { if (z.dead) continue; for (let i = 0; i < 5; i++) { if (!S.brz[i]) continue; const bx = FPSC.CX + M3.BRAZ[i][0], by = FPSC.CY + M3.BRAZ[i][1], d = Math.hypot(z.x - bx, z.y - by); if (d < M3.BR_R && d > 0.01) { const k = (M3.BR_R - d) / d; z.x += (z.x - bx) * k * Math.min(1, dt * 6); z.y += (z.y - by) * k * Math.min(1, dt * 6); } } }
    // the objective
    const nextB = S.brz.findIndex(b => !b);
    if (S.heart === 'rocks' || S.heart === 'dropped') {
      if (nextB >= 0 && S.heart === 'rocks' && nextB < 4) { cpObjective(`Light the braziers out to the north rocks · ${lit} of 5 lit`); cpWaypoint(M3.BRAZ[nextB][0], M3.BRAZ[nextB][1], 'A brazier', 1.6); }
      else { cpObjective(S.heart === 'dropped' ? 'Take up the lens’s heart again' : 'Take up the lens’s heart, on the rocks'); cpWaypoint(S.hx, S.hy, 'The heart', 1.0); }
    } else if (S.heart === 'carried') { cpObjective('Carry the heart back round the tower to the hoist'); cpWaypoint(M3.FOOT[0], M3.FOOT[1], 'The hoist', 1.2); }
    else if (S.heart === 'foot') { cpObjective('Wind the heart up to the gallery, and hold them off'); cpWaypoint(M3.WINCH[0], M3.WINCH[1], 'The winch', 1.4); }
    if (S.t > 20 && !S.said.a) { S.said.a = 1; cpSay('fore', 'Something on the rocks, sir. Moving.', 'cp_m03_30'); }
    if (S.t > 26 && !S.said.b) { S.said.b = 1; cpSay('lamp', 'Crabs. Big as dogs. They hate the fire; keep the braziers lit.', 'cp_m03_31'); }
  },
  q(sid, k, a) {
    const S = RAID.st, P = cplPeople().find(p => p[0] === sid); if (!P) return;
    const [, x, y] = P, near = (q, r) => Math.hypot(x - FPSC.CX - q[0], y - FPSC.CY - q[1]) < r;
    if (k === 'light') { const i = a | 0; if (i >= 0 && i < 5 && !S.brz[i] && near(M3.BRAZ[i], 3)) { S.brz[i] = 1; if (S.brz.every(b => b) && !S.said.all) { S.said.all = 1; cpSay('lamp', 'That’s all five. Now the heart, and quick.', 'cp_m03_32'); } } }
    else if (k === 'take' && !S.carry[sid] && (S.heart === 'rocks' || S.heart === 'dropped') && near([S.hx, S.hy], 3)) { S.carry[sid] = 'heart'; if (S.heart === 'rocks') cpSay('lamp', 'That’s her. Not a scratch on the crate. Now bring her home.', 'cp_m03_33'); S.heart = 'carried'; }
    else if (k === 'drop' && S.carry[sid] === 'heart') { delete S.carry[sid]; S.heart = 'dropped'; S.hx = x - FPSC.CX; S.hy = y - FPSC.CY; }
    else if (k === 'set' && S.carry[sid] === 'heart' && near(M3.FOOT, 3.4)) { delete S.carry[sid]; S.heart = 'foot'; cpSay('lamp', 'Hook her on. Wind, and don’t stop for anything.', 'cp_m03_34'); }
    else if (k === 'wind' && S.heart === 'foot' && near(M3.WINCH, 2.6)) S.winders[sid] = RAID.t;
  },
  me(dt) {
    const S = RAID.st;
    const o = ZM.near;
    if (o && o.k === 'm3brz' && cplHold('m3brz', dt, 1.4)) raidAsk('light', o.i);
    S.myWind = cplHeld() && o && o.k === 'm3winch' && S.heart === 'foot' && !cpCineOn();
    if (S.myWind) { S.windAsk = (S.windAsk || 0) - dt; if (S.windAsk <= 0) { S.windAsk = 0.2; raidAsk('wind'); } } else S.windAsk = 0;
  },
  pack(o) { const S = RAID.st; o.m = [S.brz.join(''), S.heart, Math.round(S.hx * 10) / 10, Math.round(S.hy * 10) / 10, Math.round(S.lift * 100) / 100]; o.c = S.carry; },
  apply(o) {
    const S = RAID.st, a = o.m; if (!Array.isArray(a)) return;
    S.brz = String(a[0] || '00000').split('').map(c => c === '1' ? 1 : 0); S.heart = String(a[1] || 'rocks'); S.hx = +a[2] || 0; S.hy = +a[3] || 0; S.lift = +a[4] || 0;
    S.carry = o.c && typeof o.c === 'object' ? o.c : {};
  },
  consider(c) {
    const S = RAID.st, mine = cplCarryOf(FPS.me.id), Z = FPSC.CX, Y = FPSC.CY;
    M3.BRAZ.forEach((b, i) => { if (!S.brz[i]) c({ k: 'm3brz', i, id: 'b' + i }, Z + b[0], Y + b[1], 0, 2.4, false); });
    if (!mine && (S.heart === 'rocks' || S.heart === 'dropped')) c({ k: 'm3heart', id: 'h' }, Z + S.hx, Y + S.hy, 0, 2.6, false);
    if (mine === 'heart') { if (Math.hypot(FPS.me.x - Z - M3.FOOT[0], FPS.me.y - Y - M3.FOOT[1]) < 3.2) c({ k: 'm3set', id: 'foot' }, Z + M3.FOOT[0], Y + M3.FOOT[1], 0, 3.2, false); else c({ k: 'm3drop', id: 'drop' }, FPS.me.x, FPS.me.y, FPS.me.jz || 0, 1, false); }
    if (!mine && S.heart === 'foot') c({ k: 'm3winch', id: 'winch' }, Z + M3.WINCH[0], Y + M3.WINCH[1], 0, 2.2, false);
  },
  prompt(o) {
    if (o.k === 'm3brz') return { text: 'Hold to light the brazier', hold: true };
    if (o.k === 'm3heart') return { text: 'Take up the lens’s heart' };
    if (o.k === 'm3drop') return { text: 'Set the heart down (to fight)' };
    if (o.k === 'm3set') return { text: 'Set the heart down at the hoist' };
    if (o.k === 'm3winch') return { text: 'Hold to wind the heart up', hold: true };
    return null;
  },
  use(o) {
    if (o.k === 'm3heart') { raidAsk('take'); return true; }
    if (o.k === 'm3drop') { raidAsk('drop'); return true; }
    if (o.k === 'm3set') { raidAsk('set'); return true; }
    return o.k === 'm3brz' || o.k === 'm3winch';
  },
  hud(phone, mono, fell) {
    const S = RAID.st, lit = S.brz.reduce((a, b) => a + b, 0);
    cplBar(phone, mono, `BRAZIERS LIT · ${lit} OF 5`, lit / 5, 0, '#ff9a50');
    if (S.heart === 'foot') cplBar(phone, mono, 'WINDING THE HEART UP', S.lift, 1, '#e8d8a8');
    cplHoldHud();
  },
  b3(grp) {
    const S = RAID.st;
    m3Common3d(grp);
    const sc = m3Scaffold(grp);
    S.g3 = { sc, braz: M3.BRAZ.map(([x, y]) => m3Brazier(grp, x, y)), heart: cplCarryModel('heart'), topPile: m3Pile(grp, 0, ZMT.Y - 8.4, ZMT.L[5], 12, 0.6), lug: cplBrig({ lug: true, lights: true }) };
    grp.add(S.g3.heart, S.g3.lug);
    m3People([['lamp', M3C.lamp, -2.8, -13.6, Math.PI * 0.1, { lan: true }], ['fore', M3C.fore, 3.6, -15.2, -0.5, { lan: true }]]);
  },
  f3(dt) {
    const S = RAID.st, G = S.g3; if (!G) return;
    const lit = S.brz.reduce((a, b) => a + b, 0), cine = cpCineOn();
    cplSky({ amb: 0.3, moon: 0.08, fog: [0.11, 0.13, 0.15], near: 1.5, far: cine ? 150 : 20 + lit * 7 });
    cplLensSet(0, 0, { rings: 0 }); cplFireSet(1);
    G.braz.forEach((B, i) => m3BrazierSet(B, S.brz[i], g.t));
    G.topPile(7);
    const onRock = S.heart === 'rocks' || S.heart === 'dropped' || S.heart === 'foot';
    G.heart.visible = onRock || (S.heart === 'up');
    if (S.heart === 'foot') { const top = G.sc.top, foot = G.sc.foot, hz = foot.y + 0.4 + (top.y - foot.y - 1.2) * S.lift; G.heart.position.set(top.x, hz, top.z); }
    else G.heart.position.copy(z3v(FPSC.CX + S.hx, FPSC.CY + S.hy, FPSC.GROUND + 0.35));
    const top = G.sc.top, foot = G.sc.foot, ry0 = S.heart === 'foot' ? G.heart.position.y + 0.4 : foot.y + 0.2, len = top.y - ry0;
    G.sc.rope.scale.y = Math.max(0.1, len); G.sc.rope.position.set(top.x, ry0 + len / 2, top.z);
    if (S.myWind) G.sc.crank.rotation.z = -g.t * 4;
    G.lug.position.copy(z3v(FPSC.CX + M3.LUG[0], FPSC.CY + M3.LUG[1], FPSC.GROUND - 0.25 + Math.sin(g.t * 0.9) * 0.18)); G.lug.rotation.set(Math.sin(g.t * 0.7) * 0.05, 0, Math.sin(g.t * 0.9) * 0.04);
    // (the crabs: no sea-glow about them; they're not the drowned)
    for (const z of ZM.z) if (z.mdl && z.mdl.rglow) z.mdl.rglow.visible = false;
    m3PeoplePose(dt);
    cplCarry3d();
  },
  exit() { m3PeopleFree(); },
  music() { return 'cpm03haar'; },
  mend: true,
});
cpOn('m3huff', i => { fpsFeed('A breath of the haar off Lantern Rock: a brazier’s out.'); try { if (!soundOff()) sfxWhoosh(); } catch (e) {} });

// ---------- III. The Lantern ----------
const M3L = { SOCK_R: 1.55, STAND_R: 2.4, CRATES: [0, ZMT.Y - 8.3], OIL: [ZMT.X - 6, ZMT.Y + 5.2], NUM: ['I', 'II', 'III', 'IV', 'V', 'VI'] };
const m3SockAt = i => { const a = Math.PI / 2 - i * Math.PI / 3; return [ZMT.X + Math.cos(a), ZMT.Y + Math.sin(a), a]; };
// a numeral, painted, as a sprite
function m3NumSprite(txt, col) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  x.font = '600 44px "IM Fell English SC", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col || '#ffe0a0'; x.fillText(txt, 64, 34);
  const t = new THREE.CanvasTexture(c); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); s.scale.set(0.6, 0.3, 1); return s;
}
cpStage('m03lamp', {
  n: 'The Lantern',
  map: { start: [0, ZMT.Y - 4.6], top: ZMT.L[5], isle: 'cplight', shore: CPL_SHORE, nav: [-30, 30, -30, 30], zones: { top: { n: 'the lantern room', r: [-11, 11, -10, 13], zr: [ZMT.L[5], 99] } } },
  set(H, K, Z) {
    const T = m3Lay(H, K, Z, { lamps: true, top: true });
    // the Service Room below: the table, and the lamp oil on it
    T.onFloor(4, 'table', ...M3L.OIL, 0.6, { w: 2.2, d: 1.0 }); T.onFloor(4, 'shelf', ...T.atWall(-Math.PI * 0.75, ZMT.R - 0.3), { w: 2.2, goods: 'cans' });
    T.onFloor(3, 'clockwork', ZMT.X - 6.2, ZMT.Y + 4.6, 0.6, {});
  },
  enter() {
    const order = [0, 1, 2, 3, 4, 5]; for (let i = 5; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    Object.assign(RAID.st, { seat: [0, 0, 0, 0, 0, 0], order, carry: {}, oil: 0, lit: 0, said: {}, t: 0 });
    if (ZM.net !== 'client') { cpObjective('Take a panel of the lens from the crates on the gallery'); cpWaypoint(M3L.CRATES[0], M3L.CRATES[1], 'The crates', ZMT.L[5] + 1); }
  },
  speedK() { return 1; },
  tick(dt) {
    const S = RAID.st; S.t += dt;
    if (cpCineOn() || S.lit) return;
    const n = S.seat.reduce((a, b) => a + b, 0), mineK = cplCarryOf(FPS.me.id);
    if (n < 6) {
      const out = Object.values(S.carry).filter(v => /^panel/.test(v)).length;
      if (S.order.length) { cpObjective(`Seat the panels of the lens in its frame · ${n} of 6`); if (!/^panel/.test(mineK || '')) cpWaypoint(M3L.CRATES[0], M3L.CRATES[1], 'The crates', ZMT.L[5] + 1); }
      else if (out) cpObjective(`Seat the last panels · ${n} of 6`);
      if (/^panel/.test(mineK || '')) { const i = +mineK.slice(5); const [x, y] = m3SockAt(i); cpWaypoint(x, y, 'Seat ' + M3L.NUM[i], ZMT.L[5] + 1.6); }
    } else if (!S.oil || S.oil === 'carried') { cpObjective(S.oil ? 'Pour the oil into the lamp' : 'Fetch the lamp oil from the Service Room, the floor below'); cpWaypoint(...(S.oil ? [ZMT.X, ZMT.Y] : M3L.OIL), S.oil ? 'The lamp' : 'The oil', S.oil ? ZMT.L[5] + 1.4 : ZMT.L[4] + 1.2); }
    else { cpObjective('Light the lamp'); cpWaypoint(ZMT.X, ZMT.Y, 'The lamp', ZMT.L[5] + 1.4); }
    if (S.t > 4 && !S.said.a) { S.said.a = 1; cpSay('lamp', 'Each panel has its numeral, and so has its place in the frame. Match them.', 'cp_m03_35'); }
    if (n >= 3 && !S.said.b) { S.said.b = 1; cpSay('lamp', 'Look at her. She’s taking the lamp’s glow already, and there’s no lamp.', 'cp_m03_36'); }
    if (n >= 6 && !S.said.c) { S.said.c = 1; cpSay('lamp', 'All six. Now oil, from the Service Room. The best colza; don’t spill it.', 'cp_m03_37'); }
  },
  q(sid, k, a) {
    const S = RAID.st, P = cplPeople().find(p => p[0] === sid); if (!P) return;
    const [, x, y, jz] = P, near = (q, r, z) => Math.hypot(x - FPSC.CX - q[0], y - FPSC.CY - q[1]) < r && Math.abs(jz - z) < 2;
    if (k === 'panel' && !S.carry[sid] && S.order.length && near(M3L.CRATES, 3, ZMT.L[5])) S.carry[sid] = 'panel' + S.order.shift();
    else if (k === 'seat') { const i = a | 0, c = S.carry[sid]; if (c === 'panel' + i && !S.seat[i] && near(m3SockAt(i), M3L.STAND_R + 1, ZMT.L[5])) { S.seat[i] = 1; delete S.carry[sid]; cpEvent('m3seat', i); } }
    else if (k === 'oil' && !S.carry[sid] && !S.oil && S.seat.every(v => v) && near(M3L.OIL, 2.6, ZMT.L[4])) { S.carry[sid] = 'oil'; S.oil = 'carried'; }
    else if (k === 'pour' && S.carry[sid] === 'oil' && near([ZMT.X, ZMT.Y], 3.2, ZMT.L[5])) { delete S.carry[sid]; S.oil = 1; cpSay('lamp', 'Full. Here: take the taper. She’s yours to light.', 'cp_m03_38'); }
    else if (k === 'light' && S.oil === 1 && !S.lit && near([ZMT.X, ZMT.Y], 3.2, ZMT.L[5])) { S.lit = 1; cpObjective(''); cpWaypoint(null); cpDone(); }
    // (anyone who goes down with something: it goes back where it came from)
    for (const p of cplPeople()) if (p[4] && S.carry[p[0]]) { const c = S.carry[p[0]]; delete S.carry[p[0]]; if (/^panel/.test(c)) S.order.unshift(+c.slice(5)); else if (c === 'oil') S.oil = 0; }
  },
  me(dt) {
    const o = ZM.near;
    if (o && o.k === 'm3seat' && cplHold('m3seat', dt, 1.6)) raidAsk('seat', o.i);
    if (o && o.k === 'm3light' && cplHold('m3light', dt, 3)) raidAsk('light');
  },
  pack(o) { const S = RAID.st; o.m = [S.seat.join(''), S.order.join(''), S.oil === 'carried' ? 2 : S.oil ? 1 : 0, S.lit]; o.c = S.carry; },
  apply(o) {
    const S = RAID.st, a = o.m; if (!Array.isArray(a)) return;
    S.seat = String(a[0] || '000000').split('').map(c => c === '1' ? 1 : 0); S.order = String(a[1] || '').split('').filter(c => /[0-5]/.test(c)).map(Number);
    S.oil = a[2] === 2 ? 'carried' : a[2] ? 1 : 0; S.lit = a[3] | 0; S.carry = o.c && typeof o.c === 'object' ? o.c : {};
  },
  consider(c) {
    const S = RAID.st, mine = cplCarryOf(FPS.me.id), X = FPSC.CX, Y = FPSC.CY, L5 = ZMT.L[5];
    if (!mine && S.order.length) c({ k: 'm3panel', id: 'cr' }, X + M3L.CRATES[0], Y + M3L.CRATES[1], L5, 2.6, false);
    if (/^panel/.test(mine || '')) for (let i = 0; i < 6; i++) if (!S.seat[i]) { const [x, y] = m3SockAt(i); c({ k: 'm3seat', i, id: 's' + i }, X + x, Y + y, L5, 2.2, true); }
    if (!mine && !S.oil && S.seat.every(v => v)) c({ k: 'm3oil', id: 'oil' }, X + M3L.OIL[0], Y + M3L.OIL[1], ZMT.L[4], 2.4, false);
    if (mine === 'oil') c({ k: 'm3pour', id: 'pour' }, X + ZMT.X, Y + ZMT.Y, L5, 3.0, false);
    if (!mine && S.oil === 1 && !S.lit) c({ k: 'm3light', id: 'light' }, X + ZMT.X, Y + ZMT.Y, L5, 3.0, false);
  },
  prompt(o) {
    const S = RAID.st, mine = cplCarryOf(FPS.me.id);
    if (o.k === 'm3panel') return { text: `Take a panel of the lens (${S.order.length} in the crates)` };
    if (o.k === 'm3seat') { const want = /^panel/.test(mine || '') ? +mine.slice(5) : -1; return want === o.i ? { text: `Hold to seat panel ${M3L.NUM[o.i]} in the frame`, hold: true } : { text: `This place is marked ${M3L.NUM[o.i]}; your panel is ${M3L.NUM[want] || '?'}` }; }
    if (o.k === 'm3oil') return { text: 'Take the can of lamp oil' };
    if (o.k === 'm3pour') return { text: 'Pour the oil into the lamp' };
    if (o.k === 'm3light') return { text: 'Hold to light the lamp', hold: true };
    return null;
  },
  use(o) {
    if (o.k === 'm3panel') { raidAsk('panel'); return true; }
    if (o.k === 'm3oil') { raidAsk('oil'); return true; }
    if (o.k === 'm3pour') { raidAsk('pour'); return true; }
    return o.k === 'm3seat' || o.k === 'm3light';
  },
  hud(phone, mono, fell) {
    const S = RAID.st, n = S.seat.reduce((a, b) => a + b, 0), mine = cplCarryOf(FPS.me.id);
    cplBar(phone, mono, `THE LENS · ${n} OF 6 PANELS SEATED`, n / 6, 0, '#fff0c0');
    if (/^panel/.test(mine || '')) { ctx.textAlign = 'center'; ctx.font = fell(phone ? 16 : 22); ctx.fillStyle = '#ffe0a0'; ctx.fillText(`You carry panel ${M3L.NUM[+mine.slice(5)]}`, cx, H - (phone ? 120 : 96)); }
    cplHoldHud();
  },
  b3(grp) {
    const S = RAID.st;
    m3Common3d(grp);
    m3Scaffold(grp);
    const G = S.g3 = { crates: m3Pile(grp, M3L.CRATES[0], M3L.CRATES[1], ZMT.L[5], 7, 0.6), heart: m3Crate(0.75), nums: [], panels: [], oil: cplCarryModel('oil') };
    G.heart.position.copy(z3v(FPSC.CX + 1.6, FPSC.CY + ZMT.Y - 8.0, FPSC.GROUND + ZMT.L[5] + 0.3)); grp.add(G.heart);
    G.oil.position.copy(z3v(FPSC.CX + M3L.OIL[0], FPSC.CY + M3L.OIL[1], FPSC.GROUND + ZMT.L[4] + 1.05)); grp.add(G.oil);
    for (let i = 0; i < 6; i++) {
      const [x, y, a] = m3SockAt(i), s = m3NumSprite(M3L.NUM[i]); s.position.copy(z3v(FPSC.CX + x * 1, FPSC.CY + y, FPSC.GROUND + ZMT.L[5] + 2.9)); grp.add(s); G.nums.push(s);
      const p = cplCarryModel('panel' + i); p.position.copy(z3v(FPSC.CX + ZMT.X + Math.cos(a) * 1.02, FPSC.CY + ZMT.Y + Math.sin(a) * 1.02, FPSC.GROUND + ZMT.L[5] + 2.05)); p.rotation.y = a - Math.PI / 2 + Math.PI; p.scale.set(1.2, 2.4, 1); grp.add(p); G.panels.push(p);
    }
    m3People([['lamp', M3C.lamp, ZMT.X + 2.4, ZMT.Y - 2.2, -0.9, { z: ZMT.L[5] }], ['fore', M3C.fore, ZMT.X - 7.6, ZMT.Y - 3.4, Math.PI * 0.7, { z: ZMT.L[5] }]]);
  },
  f3(dt) {
    const S = RAID.st, G = S.g3; if (!G) return;
    const n = S.seat.reduce((a, b) => a + b, 0), mine = cplCarryOf(FPS.me.id), want = /^panel/.test(mine || '') ? +mine.slice(5) : -1;
    cplSky({ amb: 0.34, moon: 0.16, fog: [0.03, 0.04, 0.06], near: 60, far: 700 });
    cplLensSet(0.04 * n, 0, { rings: Math.round(11 * n / 6), noBeam: true }); cplFireSet(1);
    G.crates(Math.ceil(S.order.length * 7 / 6)); G.oil.visible = !S.oil;
    G.panels.forEach((p, i) => { p.visible = !!S.seat[i]; });
    G.nums.forEach((s, i) => { s.visible = !S.seat[i]; s.material.opacity = i === want ? 0.75 + 0.25 * Math.sin(g.t * 6) : 0.45; s.scale.set(i === want ? 0.8 : 0.6, i === want ? 0.4 : 0.3, 1); });
    m3PeoplePose(dt);
    cplCarry3d();
  },
  exit() { m3PeopleFree(); },
  music() { return 'cpm03lamp'; },
  mend: true,
});
cpOn('m3seat', i => { try { if (!soundOff()) sfxChime(); } catch (e) {} fpsFeed(`Panel ${M3L.NUM[i]} seated in the frame.`); });
