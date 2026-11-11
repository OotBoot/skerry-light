'use strict';
// Maren's End, Part III: Verity, a secret boss. The README doesn't say where he is, and nor should the chat or a
// commit message; here in the code it's fine to say:
//  - The way in: a little Verity, the size of a cat, smiling, a candle stub either side of him, sits in one of nine
//    places, three in each part of the raid (RV_SPOTS), picked at random as each raid begins (the host's pick, for
//    everyone): in the Swallow, on the Long Pier against its rail, or in a corner of the Deep Path's wall at one of
//    two braziers; at the Black Water, in a corner of the near bank or of the far bank; in the fort, under the
//    chapel's altar, on the Officers' Mess table or on the Cookhouse table. His eyes follow you, he glows softly, and he
//    giggles the first time you come near. Face him close up and the prompt shows: Use, and you're in his room. Only
//    in his own part (and in the fort, only while the apothecaries are still being hunted, RF.st 'hunt'); once a raid.
//  - His room: the Yellow Room, a low room of damp yellow wallpaper, wet carpet and buzzing strip lights, laid out
//    with each part somewhere nobody can walk to it (RV_ROOMS: past the fort's north wall, behind the Black Water's
//    near wall, in the rock inside the Deep Path's loop; off the drowned's walking grid, so none follow you in).
//    The door you came by won't open while he's smiling; once he's down it takes you back to where he sat.
//  - The fight, in two phases, built after his two pictures (assets/verity.png, assets/verity2.png):
//      I.  the orb: the smiling yellow egg. He hops after you; close in he bumps you (a knock); further off he rolls
//          at you, straight and fast, along a line that glows on the carpet first (half your health; get out of the
//          line, or behind a pillar), or grins and laughs, and three rings of yellow light run out across the floor
//          from him (half your health; jump them).
//      II. at half his strength he stands up (nothing hurts him while he does): the tall, starved yellow thing with
//          the grin, stooped under the ceiling, quicker. Close in he reaches for you with his long arms (half your
//          health); further off he leaps at where you stand, a ring glowing there first (step out of it), or the
//          lights go out and he's suddenly behind you, and reaching.
//  - Down, he leaves a pirate token where he fell (Verity's Piece of Eight), one for each of you: walk over it (the
//    same tokens as Maren's and the Lighthouse's, src/zmegg.js ptGrant). Anyone who bled out is back on their feet.
// A boss kind of his own on src/zmboss.js's framework (ZBT.verity), host-authoritative like the rest: the host runs
// him and the room's state (packed into the fort's word as `rv`); each player judges his blows on themselves.
// Hooks: each part's stage hooks wrapped here (set, enter, me, pack, apply, q, kill, hud, b3, f3, consider, prompt,
// use), src/raidfort.js rfLay (rvLay, and the headland's grass kept out of the room) and src/raidmusic.js rmWant
// (rvMusic), each a single line marked [verity]; rfLampsK (src/raidmaren2.js) wrapped for his flickering lights, and
// rswInLight (src/raid.js) so his room counts as lit in the Swallow (the dark doesn't drain you in there); and in
// src/zmboss.js zbHud, his bar shown in the Swallow, where no other boss's is.

const RVC = {
  LITTLE: 0.19,   // (the little one's size against the boss's)
  HP: 34, PTS: 1500, P2: 0.5,
  O: { RAD: 0.85, TALL: 1.9, HEADZ: 1.3, SP: 3.4 },   // (the orb: his size for shots, and his pace)
  T: { RAD: 0.6, TALL: 3.25, HEADZ: 3.0, SP: 4.7, S: 3.3 },   // (stood up: the same, and his model's height)
  BUMP: 2.1, ROLL_L: 17, ROLL_V: 16, ROLL_W: 1.3,
  RINGS: [0.75, 1.2, 1.65], RING_V: 9, RING_R: 13, RING_W: 0.8,
  REACH: 4.3, REACH_ARC: 1.25, LUNGE_R: 3.0, LUNGE_MAX: 15, LUNGE_UP: 0.5, BEHIND: 2.3,
};
const RV_T = { wake: { hit: 99, end: 2.6 }, bump: { hit: 0.42, end: 0.9 }, roll: { hit: 0.9, end: 0.9 + RVC.ROLL_L / RVC.ROLL_V + 0.35 }, grin: { hit: 0.6, end: 2.4 },
  stand: { hit: 99, end: 3.4 }, reach: { hit: 0.48, end: 0.95 }, lunge: { hit: 1.15, end: 1.7 }, blink: { hit: 0.75, end: 0.8 }, smash: { hit: 0.8, end: 1.3 } };
ZB_KINDS.push('verity');
for (const a of ['wake', 'bump', 'roll', 'grin', 'stand', 'reach', 'lunge', 'blink']) if (!ZB_ACT.includes(a)) ZB_ACT.push(a);
// his room in each part ([x0, x1, y0, y1], local, on the ground: you come in at its south end, he waits at its north)
const RV_ROOMS = { descent: [28, 48, 3, 21], bridge: [-10, 10, -76, -58], fort: [-10, 10, 56, 74] };
// the nine places the little one can sit: the part, where (local), how high (what he sits on), which way he faces,
// and where the door puts you back (and how high that floor is)
const RV_SPOTS = (function () {
  const out = [], add = (stage, x, y, z, h, fz) => out.push({ stage, at: [x, y], z, h, out: [x + Math.sin(h) * 1.6, y + Math.cos(h) * 1.6], fz: fz == null ? 0 : fz });
  // the Swallow: on the Long Pier against its west rail between two lamps; in a corner of the Deep Path's wall by a
  // brazier on its outside loop (east) and on its last stretch in (west)
  add('descent', -RSWP.PW / 2 + 0.55, -45.5, RSW.DECK, Math.PI / 2, RSW.DECK);
  const wallBy = (bx, by) => { const p = RSG.N.find(q => q.x === bx && q.y === by), f = (p.w - 2) / p.w, sx = p.x + (p.L[0] - p.x) * f, sy = p.y + (p.L[1] - p.y) * f; add('descent', sx, sy, 0, bearingOf(p.x - sx, p.y - sy)); };
  wallBy(72, 10); wallBy(-40, 0);
  // the Black Water: the near bank's two far corners, and the far bank's west corner
  add('bridge', RBC.X0 + 1.4, RBC.Y0 + 1.4, 0, Math.PI / 4);
  add('bridge', RBC.X1 - 1.4, RBC.Y0 + 1.4, 0, -Math.PI / 4);
  add('bridge', RBC.X0 + 1.4, RBC.Y1 - 1.4, 0, Math.PI * 3 / 4);
  // the fort: under the chapel's altar (on its step, facing the nave), on the Officers' Mess table, on the Cookhouse table
  add('fort', -32, 27.75, 0.2, Math.PI); out[out.length - 1].out = [-32, 25.6];
  add('fort', 34.1, 37, 0.84, -Math.PI / 2); out[out.length - 1].out = [34.1, 34.6];
  add('fort', 32.6, 18.2, 0.84, Math.PI); out[out.length - 1].out = [32.6, 16.2];
  return out;
})();
// his room among each part's rooms (its name shown as you come in; in the fort its floor and ceiling laid with the rest)
const rvZone = r => ({ n: 'the Yellow Room', r: r.slice(), zr: [-1, 6], floor: 'boards', wall: '#c2b25c' });
RF_ZONES.vroom = rvZone(RV_ROOMS.fort);
RSW_MAP.zones = Object.assign({ vroom: rvZone(RV_ROOMS.descent) }, RSW_MAP.zones);
RAID_STAGES.bridge.map.zones.vroom = rvZone(RV_ROOMS.bridge);

const RV = { pick: 0, fight: false, done: false, zn: 0, tok: null, mine: false, grab: 0, fade: 0, giggle: false, doneSeen: false, wait: 0 };
const rvW = (x, y) => [FPSC.CX + x, FPSC.CY + y];
const rvKey = () => typeof RAID !== 'undefined' && RAID.on ? RAID_ORDER[RAID.stage] : null;
const rvRoom = () => RV_ROOMS[rvKey()] || null;
const rvSpot = () => RV_SPOTS[RV.pick] || RV_SPOTS[0];
// where his room is in this part: its door, where you come in, where he waits
const rvAt = () => { const R = rvRoom(), cx = (R[0] + R[1]) / 2; return { door: [cx, R[2] + 0.3], in: [cx, R[2] + 1.8], boss: [cx, R[3] - 4] }; };
const rvInRoom = (x, y, jz) => { const R = rvRoom(); if (!R || (jz || 0) > 6) return false; const lx = x - FPSC.CX, ly = y - FPSC.CY; return lx > R[0] && lx < R[1] && ly > R[2] && ly < R[3]; };
const rvMeIn = () => rvInRoom(FPS.me.x, FPS.me.y, FPS.me.jz);
// the little one sits in this part, and can still be found
const rvSeatHere = () => !RV.done && rvSpot().stage === rvKey() && (rvKey() !== 'fort' || RF.st === 'hunt');
// a place kept inside his room's walls (pad in from them)
function rvClampIn(x, y, pad) { const R = rvRoom() || RV_ROOMS.fort, p = (pad || 1) + 0.25; return [clamp(x, FPSC.CX + R[0] + p, FPSC.CX + R[1] - p), clamp(y, FPSC.CY + R[2] + p, FPSC.CY + R[3] - p)]; }
const rvBoss = () => ZM.z.find(z => z.bt === 'verity' && !z.dead) || null;
// (each part) his fight made fresh; (a new raid) where the little one sits, picked again, and he's to be found again
function rvReset() { Object.assign(RV, { fight: false, zn: 0, tok: null, mine: false, grab: 0, fade: 0, giggle: false, doneSeen: RV.done, wait: 0 }); }
function rvNewRaid() { RV.pick = (Math.random() * RV_SPOTS.length) | 0; RV.done = false; RV.doneSeen = false; }

// ---------- the room, laid out with the fort (src/raidfort.js rfLay) ----------
function rvLay(H, K, Z, key) {
  key = key || 'fort'; const R = RV_ROOMS[key]; if (!R) return;
  const { put, light, wall } = K, WH = ZMC.CEIL, PAP = { mat: 'plaster', col2: '#c2b25c', hh: WH + 0.2 }, cx = (R[0] + R[1]) / 2, cy = (R[2] + R[3]) / 2;
  // (out of the fort, its floor and ceiling, as the fort's own rooms are given theirs)
  if (key !== 'fort') { put('floor', cx, cy, 0, { w: R[1] - R[0] - 0.1, d: R[3] - R[2] - 0.1, style: 'boards' }); put('ceil', cx, cy, 0, { w: R[1] - R[0] + 0.4, d: R[3] - R[2] + 0.4, z0: WH, col: '#8a8270' }); }
  wall(R[0], R[2], R[1], R[2], PAP); wall(R[0], R[3], R[1], R[3], PAP); wall(R[0], R[2], R[0], R[3], PAP); wall(R[1], R[2], R[1], R[3], PAP);
  // over the room's own floor, the wet carpet; on its walls, the wallpaper; the door you came by
  put('rvcarpet', cx, cy, 0, { w: R[1] - R[0] - 0.5, d: R[3] - R[2] - 0.5 });
  put('rvpaper', cx, R[3] - 0.26, 0, { len: R[1] - R[0] - 0.5 }); put('rvpaper', cx, R[2] + 0.26, Math.PI, { len: R[1] - R[0] - 0.5 });
  put('rvpaper', R[0] + 0.26, cy, Math.PI / 2, { len: R[3] - R[2] - 0.5 }); put('rvpaper', R[1] - 0.26, cy, -Math.PI / 2, { len: R[3] - R[2] - 0.5 });
  put('rvdoor', cx, R[2] + 0.27, Math.PI, {});
  // four pillars to hide behind (his roll stops at them)
  for (const [x, y] of [[-4.5, -3], [4.5, -3], [-4.5, 3.5], [4.5, 3.5]]) { put('block', cx + x, cy + y, 0, { w: 1.1, d: 1.1, hh: WH, col: '#c4b25e', trim: '#8a7a3e' }); put('rvpaper', cx + x, cy + y - 0.56, 0, { len: 1.1, low: true }); }
  // the strip lights in the ceiling, buzzing
  for (const x of [-6.5, 0, 6.5]) for (const y of [-5.5, 0.2, 6]) put('rvstrip', cx + x, cy + y, 0, { z: WH });
  for (const [x, y] of [[-6.5, -5.5], [6.5, -5.5], [0, 0.2], [-6.5, 6], [6.5, 6], [0, 6]]) light(cx + x, cy + y, WH - 0.35, '#fff0c0', 11, 'lantern');
  // and the little one's place, if he sits in this part: two candle stubs and their wax, a saucer
  for (const S of RV_SPOTS) if (S.stage === key) put('rvshrine', S.at[0], S.at[1], S.h + Math.PI, { z: S.z });
}
const RVP = { paper: '#c2b25c', stripe: '#b2a24c', damp: '#9c8c48', base: '#7e6e38', carpet: '#8e7e42', wet: '#6e6232' };
Object.assign(FPI_K, {
  // the carpet: mustard, stained darker where it's wet through (only to look at)
  rvcarpet: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, 0.06, { mv: false, ray: false, occ: false, col: RVP.carpet })]; },
    b3(p, A) {
      A.box(RVP.carpet, 0, 0, -0.1, p.w, p.d, 0.16);
      for (let i = 0; i < 26; i++) { const w = 0.6 + A.r() * 2.4, d = 0.5 + A.r() * 2; A.box(i % 3 ? RVP.wet : '#7a6c38', (A.r() - 0.5) * (p.w - w), (A.r() - 0.5) * (p.d - d), -0.1, w, d, 0.166, A.r() * 3); }
    },
  },
  // the wallpaper on one wall's face: faint stripes, damp stains, a skirting board (only to look at); front out along -v
  rvpaper: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const L = p.len || 4, top = p.low ? 3.4 : 3.5;
      for (let u = -L / 2 + 0.25; u < L / 2 - 0.1; u += 0.5) A.box(RVP.stripe, u, -0.012, 0.15, 0.1, 0.02, top - 0.15);
      A.box(RVP.base, 0, -0.035, -0.05, L, 0.07, 0.2);
      if (!p.low) for (let i = 0; i < Math.round(L / 3); i++) { const w = 0.5 + A.r() * 1.4, h = 0.4 + A.r() * 1.6; A.box(RVP.damp, (A.r() - 0.5) * (L - w), -0.018, A.r() < 0.5 ? 0.15 : top - h, w, 0.02, h); }
    },
  },
  // a strip light in the ceiling: a long pale diffuser in a metal frame
  rvstrip: {
    noShadow: true, sol() { return []; },
    b3(p, A) { const z = (p.z || 3.6) - 0.08; A.box('#a8a088', 0, 0, z, 1.5, 0.42, 0.07); A.part('box', '#fff6d6', 0, 0, z - 0.01, 1.36, 0.03, 0.3, 0, 0, 0, 'glow'); },
  },
  // the door you came in by: painted the yellow of the walls, a brass knob, a frame (to look at; the wall's behind it)
  rvdoor: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      A.box('#8a7a3e', -0.68, -0.03, 0, 0.12, 0.08, 2.3); A.box('#8a7a3e', 0.68, -0.03, 0, 0.12, 0.08, 2.3); A.box('#8a7a3e', 0, -0.03, 2.22, 1.48, 0.08, 0.12);
      A.box('#d4c46e', 0, -0.025, 0, 1.24, 0.05, 2.22); A.box('#c4b462', 0, -0.05, 1.2, 1.0, 0.02, 0.8); A.box('#c4b462', 0, -0.05, 0.2, 1.0, 0.02, 0.8);
      A.part('sph', '#c8a040', -0.48, -0.08, 1.05, 0.08, 0.08, 0.08);
    },
  },
  // under the altar: two candle stubs, their wax run out over the step, a little saucer before him
  rvshrine: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const z = p.z || 0;
      for (const s of [-1, 1]) {
        A.cyl('#e8e0c8', s * 0.36, 0.05, z, 0.06, 0.13); A.cyl('#e0d8c0', s * 0.36, 0.05, z, 0.11, 0.015);
        A.box('#1a1410', s * 0.36, 0.05, z + 0.13, 0.008, 0.008, 0.03);
        A.part('sph', '#ffc860', s * 0.36, 0.05, z + 0.185, 0.035, 0.07, 0.035, 0, 0, 0, 'glow');
      }
      A.cyl('#d8d0c0', 0, -0.32, z, 0.13, 0.02); A.cyl('#b8b0a0', 0, -0.32, z + 0.02, 0.08, 0.008);
      A.part('sph', '#8a3a3a', 0.02, -0.32, z + 0.04, 0.05, 0.03, 0.04);
    },
  },
});

// ---------- the way in, and out ----------
function rvConsider(consider) {
  if (!rvRoom()) return;
  if (rvSeatHere() && !rvMeIn()) { const S = rvSpot(), [x, y] = rvW(S.at[0] + Math.sin(S.h) * 0.25, S.at[1] + Math.cos(S.h) * 0.25); consider({ k: 'rvseat' }, x, y, S.fz != null ? Math.max(S.fz, S.z - 0.6) : S.z, 1.7, true); }
  if (rvMeIn()) { const [x, y] = rvW(...rvAt().door); consider({ k: 'rvdoor' }, x, y + 0.5, 0, 2.2, false); }
}
function rvPrompt(o) {
  if (o.k === 'rvseat') return { text: 'Something small is smiling at you. Let it help', free: true };
  if (o.k === 'rvdoor') return RV.fight && !RV.done ? { text: 'The door won’t open while he’s smiling' } : { text: 'Go back through the door', free: true };
  return null;
}
function rvUse(o) {
  if (!o || (o.k !== 'rvseat' && o.k !== 'rvdoor')) return false;
  if (RV.wait > 0) return true;
  RV.wait = 1;
  if (o.k === 'rvseat') { rvGo(rvAt().in, 0, 0); fpsFeed('Everything round you is gone. A low yellow room, buzzing lights, and something at the far end, smiling.'); rvSound('enter', 0); raidAsk('vin'); }
  else if (!(RV.fight && !RV.done)) { const S = rvSpot(); if (S.stage === rvKey()) rvGo(S.out, S.h + Math.PI, S.fz); else rvGo(ZMD.START, 0, ZMD.TOP); fpsFeed('Back where he sat. There\u2019s nothing there now.'); rvSound('out', 0); }
  else rvSound('locked', 0);
  return true;
}
// you, somewhere else, at once (a moment's yellow glare over it)
function rvGo(at, h, jz) {
  const m = FPS.me, [x, y] = rvW(...at);
  m.x = x; m.y = y; m.jz = m.fl = jz || 0; m.vz = 0; m.h = h; m.p = 0; m.protect = Math.max(m.protect || 0, 1.2); zmSettle(m);
  RV.fade = 1.2;
}
// (hosting or alone) someone came in: he's there waiting, once
function rvReq(sid, k) {
  if (k !== 'vin' || RV.fight || RV.done || !rvRoom()) return;
  const z = rvSpawn(...rvAt().boss);
  RV.fight = true; RV.zn = z.zn;
  zbStart(z, 'wake');
  zbArrive(z);
}
// (hosting or alone) him, already inside his room at (x, y) (local), facing the door: as strong as at the fort, whichever
// part he's in (src/raidfort.js rfBoss, for the rest)
function rvSpawn(x, y) {
  const T = ZBT.verity, hp = zbHpOf('verity', Math.max(ZM.round, RFC.ROUND), rfN()), zn = ++ZM.zc, wx = FPSC.CX + x, wy = FPSC.CY + y;
  const z = { drowned: true, zm: true, boss: true, bt: 'verity', zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x: wx, y: wy, jz: 0, fl: 0, hp, max: hp, sp: T.sp(),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: Math.PI, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy };
  T.init(z); zbMake(z, 'verity');
  ZM.z.push(z); FPS.drowned = ZM.z; ZB.seen.add(zn);
  return z;
}
// (hosting or alone) his fall: his token where he fell
function rvKill(d) {
  if (d.bt !== 'verity' || RV.done) return;
  RV.done = true; RV.fight = false; RV.tok = rvClampIn(d.x, d.y, 1).concat([0]);
  rfLine('Verity stops smiling. He leaves a pirate token where he fell: one for each of you.');
}

// ---------- each frame ----------
function rvMe(dt) {
  if (!rvRoom()) return;
  const m = FPS.me;
  if (RV.wait > 0) RV.wait -= dt; if (RV.fade > 0) RV.fade -= dt; if (RV.grab > 0) RV.grab -= dt;
  try { loadVerityVoice(); } catch (e) {}
  // the little one giggles the first time you come near him
  if (!RV.giggle && rvSeatHere()) { const S = rvSpot(), [x, y] = rvW(...S.at); if (Math.hypot(m.x - x, m.y - y) < 3.2 && Math.abs((m.jz || 0) - S.z) < 2.5) { RV.giggle = true; rvSound('giggle', 0); } }
  // down: everyone who bled out is back
  if (RV.done && !RV.doneSeen) { RV.doneSeen = true; if (typeof raidRespawn === 'function') raidRespawn(); }
  // his token: walk over it and it's yours
  if (RV.tok && !RV.mine && !(m.dead > 0) && Math.hypot(m.x - RV.tok[0], m.y - RV.tok[1]) < 1.9 && Math.abs((m.jz || 0) - RV.tok[2]) < 1.5) {
    RV.mine = true; RV.grab = 6;
    if (typeof ptGrant === 'function') ptGrant();
    RV.suite = typeof vyGrant === 'function' ? vyGrant() : 0;   // [verity] and his whole wardrobe, the first time (src/verityfx.js)
    if (typeof cloudSaveSoon === 'function') try { cloudSaveSoon(); } catch (e) {}
    fpsFeed('You take Verity’s pirate token: yours to keep.');
    rvSound('token', 0);
  }
}
// on the wire: [fighting, down, his number, where the little one sits, token?, its place (tenths, from the island's middle)]
function rvPack(o) { const r10 = v => Math.round(v * 10); o.rv = [RV.fight ? 1 : 0, RV.done ? 1 : 0, RV.zn | 0, RV.pick | 0, RV.tok ? 1 : 0].concat(RV.tok ? [r10(RV.tok[0] - FPSC.CX), r10(RV.tok[1] - FPSC.CY), r10(RV.tok[2])] : []); }
function rvApply(o) {
  if (!o || !Array.isArray(o.rv)) return;
  const f = o.rv.map(v => +v || 0);
  RV.fight = !!f[0]; RV.done = !!f[1]; RV.zn = f[2] | 0; RV.pick = clamp(f[3] | 0, 0, RV_SPOTS.length - 1);
  RV.tok = f[4] ? [FPSC.CX + f[5] / 10, FPSC.CY + f[6] / 10, f[7] / 10] : null;
}
// his lights: in his room, while he's stood up they stutter, and when he blinks they go out
function rvLampsK() {
  if (!rvMeIn()) return 1;
  const z = rvBoss(); if (!z) return 1;
  if (z.act === 'blink') return 0.04 + 0.1 * (Math.random() < 0.15 ? 1 : 0);
  if (z.act === 'stand') return Math.random() < 0.35 ? 0.1 : 1;
  if (z.p2) return reduceMotion ? 0.8 : (Math.sin(g.t * 37) > 0.93 || Math.random() < 0.02 ? 0.15 : 0.85);
  return 1;
}
if (typeof rfLampsK === 'function') { const rfLampsK0 = rfLampsK; rfLampsK = function () { return rfLampsK0() * rvLampsK(); }; }
// (the Swallow) his room's lit: the dark doesn't drain you in there, nor Maren's Weight settle on you
if (typeof rswInLight === 'function') { const rswInLight0 = rswInLight; rswInLight = function (x, y, jz) { return rvInRoom(x, y, jz) || rswInLight0(x, y, jz); }; }
// (src/raidmusic.js) what plays in his room: the dark of the caves before, the Knock's suspense while he's an orb,
// the wailing choir once he's stood up
function rvMusic() {
  if (!rvMeIn()) return undefined;
  const z = rvBoss();
  return z ? (z.p2 ? 'raidmaren' : 'raidknock') : 'raidcave';
}

// ---------- Verity: a boss of his own ----------
const rvGrounded = m => (m.jz || 0) - (m.fl || 0) < 0.25 && !((m.vz || 0) > 0.5);
const rvSize = (z, p2) => { const S = p2 ? RVC.T : RVC.O; z.rad = S.RAD; z.tall = S.TALL; z.headZ = S.HEADZ; z.crowdR = S.RAD + 0.5; };
ZBT.verity = {
  n: 'Verity', N: 'Verity', sub: 'he only wants to help', col: '#f2d21c', warn: '255,230,90', big: 'roll', puff: '230,210,90',
  get bar() { return ['#5a4a08', '#f2d21c']; },
  hp: RVC.HP, pts: RVC.PTS, rad: RVC.O.RAD, tall: RVC.O.TALL, headZ: RVC.O.HEADZ, pad: 0.9, crowd: 1.4, near: 1.6, through: 1.6, scale: 1.6,
  sp: () => RVC.O.SP,
  win: () => false,
  noFlash: () => true,   // (a Lamp Flash out in the fort doesn't reach in here)
  acts: RV_T,
  arriveLine: () => 'At the far end of the yellow room, something round and yellow, smiling. It says it wants to help.',
  smashLine: () => '',
  killLine: (who, pts) => `${who} put Verity down (+${pts}).`,
  init(z) { z.kCd = 2; z.last = ''; z.p2 = 0; z.spin = 0; },
  cool(z, dt) { if (z.kCd > 0) z.kCd -= dt; },
  think(z, p, d, dz, level) {
    if (!z.p2 && z.hp / z.max <= RVC.P2) return 'stand';
    if (!z.p2) {
      if (level && d < RVC.BUMP && z.swCd <= 0) return 'bump';
      if (z.kCd > 0) return null;
      const can = [];
      if (d > 4.5) can.push('roll');
      if (d < RVC.RING_R - 2) can.push('grin');
      return rvPick(z, can);
    }
    if (level && d < RVC.REACH - 0.6 && z.swCd <= 0) return 'reach';
    if (z.kCd > 0) return null;
    const can = [];
    if (d > 4 && d < RVC.LUNGE_MAX) can.push('lunge');
    if (d > 5) can.push('blink');
    return rvPick(z, can);
  },
  start(z, act, p) {
    if (act === 'wake') return;
    if (act === 'bump') { z.swCd = 1.1 + Math.random() * 0.4; return; }
    if (act === 'reach') { z.swCd = 0.8 + Math.random() * 0.4; return; }
    if (act === 'stand') { z.p2 = 1; rvSize(z, true); return; }
    z.last = act; z.kCd = (z.p2 ? 1.3 : 1.9) + Math.random() * 1.1; z.swCd = Math.max(z.swCd, 0.6);
    z.ax = z.x; z.ay = z.y; z.ix = z.x; z.iy = z.y;
    if (p) rvAim(z, p, act);
  },
  during(z, dt, nearest, was) {
    const T = RV_T[z.act], p = nearest(z.x, z.y, z.jz), at = z.at;
    if (!T || z.act === 'wake' || z.act === 'stand') return;
    if (p && (z.act === 'bump' || z.act === 'reach') && at < T.hit * 0.7) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 5);
    if (z.act === 'roll') {
      if (p && at < T.hit * 0.6) rvAim(z, p, 'roll');
      if (at >= T.hit) {
        // (rolling: straight on along the line, as fast as he goes, stopped by anything in the way)
        const dx = z.ix - z.x, dy = z.iy - z.y, d = Math.hypot(dx, dy), s = Math.min(d, RVC.ROLL_V * dt);
        if (d > 0.05) { zmMove(z, dx / d * s, dy / d * s); z.walk = true; }
        z.spin = (z.spin || 0) + s / RVC.O.RAD;
      }
    } else if (z.act === 'grin') {
      if (p && at < T.hit) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 4);
    } else if (z.act === 'lunge') {
      if (p && at < RVC.LUNGE_UP * 0.8) rvAim(z, p, 'lunge');
      if (at >= RVC.LUNGE_UP && at < T.hit) {
        // (in the air: up off the carpet and down where you stood)
        const u = zbE((at - RVC.LUNGE_UP) / (T.hit - RVC.LUNGE_UP));
        z.x = zbL(z.ax, z.ix, u); z.y = zbL(z.ay, z.iy, u); z.jz = Math.sin(u * Math.PI) * 1.6;
      }
      if (was < T.hit && at >= T.hit) { z.x = z.ix; z.y = z.iy; z.jz = 0; zmSettle(z); }
    } else if (z.act === 'blink') {
      if (p && at < T.hit * 0.7) { z.bx = p.x; z.by = p.y; }
      if (was < T.hit && at >= T.hit && z.bx != null) {
        // (gone, and behind whoever he's after: the far side of them from where he was)
        const dx = z.bx - z.x, dy = z.by - z.y, d = Math.hypot(dx, dy) || 1;
        const [x, y] = rvClampIn(z.bx + dx / d * RVC.BEHIND, z.by + dy / d * RVC.BEHIND, RVC.T.RAD);
        z.x = x; z.y = y; zmSettle(z); z.h = bearingOf(z.bx - z.x, z.by - z.y); z.ix = z.x; z.iy = z.y;
      }
    }
    ZBT.verity.judge(z, was, at);
  },
  // (on every screen, for its own player) what his blows did between at0 and at1
  judge(z, at0, at1) {
    if (z.kSeq !== z.aseq) { z.kSeq = z.aseq; z.kh = 0; z.ks = 0; }
    const m = FPS.me, ok = zbOk(), G0 = FPSC.GROUND, dm = Math.hypot(z.x - m.x, z.y - m.y);
    if (z.act === 'roll') {
      const T = RV_T.roll;
      if (at1 >= T.hit && !(z.kh & 1) && ok && dm < (z.rad || 0.85) + 0.6 && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.4) { z.kh |= 1; rfkHurt(rfHalf(), z.x, z.y); }
    } else if (z.act === 'grin') {
      const d = Math.hypot(m.x - z.ix, m.y - z.iy);
      RVC.RINGS.forEach((ti, i) => {
        const b = 1 << (i + 1);
        if (at0 < ti && at1 >= ti && !(z.ks & b)) { z.ks |= b; rvSound('ring', dm); for (let j = 0; j < 12; j++) { const a = j / 12 * 6.283; fpsPuff(z.ix + Math.cos(a) * 0.9, z.iy + Math.sin(a) * 0.9, G0 + 0.25, '255,230,110', 2.5); } }
        const r0 = Math.max(0, (at0 - ti) * RVC.RING_V), r1 = (at1 - ti) * RVC.RING_V;
        if (r1 <= 0 || r0 > RVC.RING_R || (z.kh & b)) return;
        if (ok && d > r0 - RVC.RING_W && d < r1 + RVC.RING_W * 0.5 && Math.abs(m.jz || 0) < 1.2 && rvGrounded(m)) { z.kh |= b; rfkHurt(rfHalf(), z.ix, z.iy); }
      });
    }
  },
  strike(z) {
    const m = FPS.me, d = Math.hypot(z.x - m.x, z.y - m.y), G0 = FPSC.GROUND, facing = Math.abs(angDiff(bearingOf(m.x - z.x, m.y - z.y), z.h));
    if (z.act === 'bump') { rvSound('bump', d); if (zbOk() && d < RVC.BUMP + 0.5 && facing < 1.5 && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.3) rfkHurt(1, z.x, z.y); return; }
    if (z.act === 'reach') { rvSound('reach', d); if (zbOk() && d < RVC.REACH && facing < RVC.REACH_ARC && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.6) rfkHurt(rfHalf(), z.x, z.y); return; }
    if (z.act === 'roll') { rvSound('roll', d); return; }
    if (z.act === 'lunge') {
      rvSound('land', Math.hypot(z.ix - m.x, z.iy - m.y));
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; fpsPuff(z.ix + Math.cos(a) * RVC.LUNGE_R * 0.8, z.iy + Math.sin(a) * RVC.LUNGE_R * 0.8, G0 + 0.2, '200,180,90', 3); }
      if (zbOk() && Math.hypot(z.ix - m.x, z.iy - m.y) < RVC.LUNGE_R && rvGrounded(m)) rfkHurt(rfHalf(), z.ix, z.iy);
      return;
    }
    if (z.act === 'blink') { rvSound('blink', d); for (let i = 0; i < 10; i++) fpsPuff(z.x + (Math.random() - 0.5), z.y + (Math.random() - 0.5), G0 + 0.5 + Math.random() * 2.5, '255,236,140', 3); }
  },
  after(z, a) {
    if (a === 'wake') z.kCd = 0.8;
    if (a === 'stand') { z.sp = RVC.T.SP; z.kCd = 1; z.swCd = 0.4; }
    if (a === 'blink') { z.swCd = 0; zbStart(z, 'reach'); }
    if (a === 'roll') z.spin = 0;
  },
  // (nothing hurts him while he stands up)
  hurtK(z, how) { return z.act === 'stand' ? 0 : how === 'burn' ? 0.6 : 1; },
  endOf: (z, act) => RV_T[act] ? RV_T[act].end : 0,
  actSound(z, act) {
    const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y);
    if (act === 'stand') {
      if (!z.p2) { z.p2 = 1; rvSize(z, true); }
      ZM.banner = { text: 'Verity stands up', t: 3.4, col: '#f2d21c', sub: 'he stops pretending', small: false };
      fpsFeed('Verity stops smiling the small smile. He stands up.');
    }
    rvSound(act, d);
  },
  sound: (k, d) => rvSound(k, d),
  build: () => rvBuild(),
  reset(z, M) { M.root.rotation.set(0, 0, 0); M.root.visible = true; },
  pose: (z, M, dt) => rvPose(z, M, dt),
};
function rvPick(z, can) { const pick = can.filter(a => a !== z.last), L = pick.length ? pick : can; return L.length ? L[(Math.random() * L.length) | 0] : null; }
// his roll's line (on past you, kept inside the walls), or where his leap comes down (where you are)
function rvAim(z, p, act) {
  z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * 0.5;
  const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1;
  z.ax = z.x; z.ay = z.y;
  if (act === 'roll') { const L = Math.min(RVC.ROLL_L, d + 4); [z.ix, z.iy] = rvClampIn(z.x + dx / d * L, z.y + dy / d * L, RVC.O.RAD); }
  else if (act === 'lunge') { const L = Math.min(RVC.LUNGE_MAX, d); [z.ix, z.iy] = rvClampIn(z.x + dx / d * L, z.y + dy / d * L, RVC.T.RAD); }
}
// his sounds: his own voice (src/audio.js: the clip, faster or dragged down), and the recordings
function rvSound(k, d) {
  const v = clamp(1 - (d || 0) / 40, 0.2, 1), play = (n, vol) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, { vol: vol * v, vary: 0.05 }); } catch (e) { return false; } };
  const voice = (rate, vol) => { try { if (typeof sfxVerity === 'function') sfxVerity(rate, vol * v); } catch (e) {} };
  if (k === 'giggle') { voice(1.35, 0.35); return; }
  if (k === 'enter') { voice(1, 0.9); play('door', 0.5); return; }
  if (k === 'out') { play('door', 0.8); return; }
  if (k === 'locked') { play('deny', 0.8); return; }
  if (k === 'arrive' || k === 'wake') { voice(1, 0.9); return; }
  if (k === 'groan') { if (Math.random() < 0.5) voice(0.85 + Math.random() * 0.4, 0.45); return; }
  if (k === 'bump') { play('swish', 0.7); play('splat', 0.4); return; }
  if (k === 'roll') { play('charge', 0.8); return; }
  if (k === 'grin') { voice(1.2, 0.9); return; }
  if (k === 'ring') { play('slam', 0.5); return; }
  if (k === 'stand') { try { stopVerity(); } catch (e) {} voice(0.62, 1); try { sfxCreak(); } catch (e) {} try { if (typeof sfxScream === 'function') sfxScream(1.3, 0.75); } catch (e) {} play('thunder', 0.5); return; }
  if (k === 'reach') { play('swish', 1); return; }
  if (k === 'lunge') { voice(0.7, 0.8); return; }
  if (k === 'land') { play('slam', 1); play('debris', 0.6); return; }
  if (k === 'blink') { voice(0.5, 0.6); try { if (typeof sfxSting === 'function') sfxSting(); } catch (e) {} return; }
  if (k === 'die') { try { stopVerity(); } catch (e) {} voice(0.45, 1); play('thunder', 0.8); return; }
  if (k === 'token') { play('pickup', 1); play('chest', 0.6); return; }
}

// ---------- his model: built after his two pictures ----------
// The orb (assets/verity.png): a yellow egg, a little taller than wide, two small black eyes, a great open D of a
// grin with a pale tongue in it, and a little black mole low on his left cheek. Built to its own size in metres
// (about 1.9 high, floating). Stood up (assets/verity2.png): a starved, bald, yellow-olive man-shape, ribs and hip
// bones showing, a thin neck, a small head with a grin of teeth from ear to ear, arms down past his knees; built to a
// height of 1 and scaled to RVC.T.S. Fronts are -z (as all of them).
const RVO = { A: 0.75, B: 0.92, C: 0.7, Y: 1.0 };   // (the egg's radii and the height of its middle)
const rvShell = (x, y, out) => -(RVO.C + (out || 0)) * Math.sqrt(Math.max(0, 1 - (x / RVO.A) ** 2 - ((y - RVO.Y) / RVO.B) ** 2));
// a patch on the egg's face, laid onto its curve: a half-ellipse w wide, its top edge bowing up by up, its bottom
// down by dn, centred at cy
function rvPatch(w, cy, up, dn, out) {
  const N = 28, M = 7, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = Math.PI * (1 - i / N), x = w * Math.cos(a), top = cy + up * Math.sin(a), bot = cy - dn * Math.sin(a);
    for (let j = 0; j <= M; j++) { const y = zbL(top, bot, j / M); pos.push(x, y, rvShell(x, y, out)); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const RVG = {};
function rvGeo() {
  if (RVG.ok) return RVG;
  const Q = RVG;
  Q.egg = new THREE.SphereGeometry(1, 40, 30); Q.egg.scale(RVO.A, RVO.B, RVO.C);
  Q.eye = new THREE.SphereGeometry(1, 16, 12);
  Q.mouth = rvPatch(0.37, 0.93, 0.035, 0.3, 0.004);
  Q.tongue = rvPatch(0.2, 0.74, 0.05, 0.08, 0.008);
  Q.dot = new THREE.SphereGeometry(0.022, 8, 6);
  // stood up (to a height of 1)
  Q.head = new THREE.SphereGeometry(0.052, 20, 16); Q.head.scale(0.86, 1.12, 0.95);
  Q.jaw = new THREE.SphereGeometry(0.044, 16, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55); Q.jaw.scale(1.05, 1, 1);
  Q.tooth = new THREE.BoxGeometry(0.0072, 0.0105, 0.005);
  Q.lip = new THREE.TorusGeometry(0.0425, 0.005, 5, 24, Math.PI * 0.95); Q.lip.rotateX(Math.PI / 2); Q.lip.rotateY(Math.PI * 0.025 + Math.PI);
  Q.socket = new THREE.SphereGeometry(0.0105, 10, 8);
  Q.neck = new THREE.CylinderGeometry(0.011, 0.014, 0.09, 8); Q.neck.translate(0, 0.045, 0);
  Q.chest = new THREE.SphereGeometry(0.07, 18, 14); Q.chest.scale(0.78, 1.1, 0.5);
  Q.belly = new THREE.CylinderGeometry(0.045, 0.036, 0.11, 12); Q.belly.translate(0, 0.055, 0); Q.belly.scale(1, 1, 0.62);
  Q.pelvis = new THREE.SphereGeometry(0.05, 14, 10); Q.pelvis.scale(1, 0.7, 0.62);
  Q.rib = new THREE.TorusGeometry(0.052, 0.0032, 4, 18, Math.PI * 0.8); Q.rib.rotateX(Math.PI / 2); Q.rib.rotateY(Math.PI * 0.1 + Math.PI / 2 + Math.PI / 2);
  Q.limb = new THREE.CylinderGeometry(0.011, 0.008, 1, 8); Q.limb.translate(0, -0.5, 0);
  Q.leg = new THREE.CylinderGeometry(0.017, 0.011, 1, 8); Q.leg.translate(0, -0.5, 0);
  Q.joint = new THREE.SphereGeometry(0.014, 8, 6);
  Q.hand = new THREE.SphereGeometry(0.014, 8, 6); Q.hand.scale(0.8, 1.5, 0.5);
  Q.finger = new THREE.CylinderGeometry(0.003, 0.002, 0.045, 4); Q.finger.translate(0, -0.022, 0);
  Q.foot = new THREE.BoxGeometry(0.026, 0.012, 0.07); Q.foot.translate(0, 0.006, -0.022);
  Q.ok = true;
  return Q;
}
// the orb (a group, its foot at the origin): yellow, b the black, t the tongue
function rvOrb(Q, yellow, black, tongue) {
  const o = new THREE.Group(), body = new THREE.Group(); o.add(body);
  const egg = new THREE.Mesh(Q.egg, yellow); egg.position.y = RVO.Y; body.add(egg);
  const face = new THREE.Group(); body.add(face);
  const eyes = [];
  for (const s of [-1, 1]) { const x = s * 0.2, y = 1.3, e = new THREE.Mesh(Q.eye, black); e.scale.set(0.055, 0.1, 0.03); e.position.set(x, y, rvShell(x, y, -0.01)); face.add(e); eyes.push(e); }
  face.add(new THREE.Mesh(Q.mouth, black));
  face.add(new THREE.Mesh(Q.tongue, tongue));
  const dot = new THREE.Mesh(Q.dot, black); dot.position.set(-0.17, 0.57, rvShell(-0.17, 0.57, -0.008)); face.add(dot);
  return { o, body, face, eyes };
}
function rvBuild() {
  const Q = rvGeo(), root = new THREE.Group();
  const yellow = new THREE.MeshPhongMaterial({ color: 0xe8d41a, emissive: 0x3a3200, specular: 0x605010, shininess: 28 });
  const black = new THREE.MeshBasicMaterial({ color: 0x060504, side: THREE.DoubleSide });
  const tongue = new THREE.MeshLambertMaterial({ color: 0xf0e070, emissive: 0x302808, side: THREE.DoubleSide });
  const skin = new THREE.MeshPhongMaterial({ color: 0xa89842, emissive: 0x1a1604, specular: 0x302810, shininess: 12 });
  const bone = new THREE.MeshPhongMaterial({ color: 0x958436, specular: 0x201808, shininess: 8 });
  const teeth = new THREE.MeshPhongMaterial({ color: 0xf4f0e0, specular: 0x888888, shininess: 60 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x1a1206 });
  const orb = rvOrb(Q, yellow, black, tongue); root.add(orb.o);
  // stood up
  const tall = new THREE.Group(); root.add(tall); tall.scale.setScalar(RVC.T.S); tall.visible = false;
  const body = new THREE.Group(); tall.add(body);
  const mesh = (geo, mat, x, y, zz, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, zz || 0); parent.add(o); return o; };
  const hips = new THREE.Group(); hips.position.y = 0.5; body.add(hips);
  mesh(Q.pelvis, skin, 0, 0.015, 0, hips);
  for (const s of [-1, 1]) mesh(Q.joint, bone, s * 0.04, 0.03, -0.018, hips).scale.set(0.9, 0.7, 0.5);   // (hip bones)
  const torso = new THREE.Group(); torso.position.y = 0.04; hips.add(torso);
  mesh(Q.belly, skin, 0, 0, 0, torso);
  mesh(Q.chest, skin, 0, 0.19, 0, torso);
  // his ribs, standing out on his chest, and his breastbone
  for (let i = 0; i < 6; i++) { const r = mesh(Q.rib, bone, 0, 0.245 - i * 0.022, -0.004, torso); r.scale.set(1 - i * 0.03, 1, 0.58); }
  mesh(Q.limb, bone, 0, 0.25, -0.037, torso).scale.set(0.6, 0.12, 0.4);
  // his neck and head
  const neck = new THREE.Group(); neck.position.y = 0.255; torso.add(neck);
  mesh(Q.neck, skin, 0, 0, 0, neck);
  const head = new THREE.Group(); head.position.y = 0.125; neck.add(head);
  mesh(Q.head, skin, 0, 0, 0, head);
  mesh(Q.jaw, skin, 0, -0.012, -0.004, head);
  for (const s of [-1, 1]) mesh(Q.socket, dark, s * 0.018, 0.016, -0.044, head).scale.set(1.1, 0.8, 0.4);
  // the grin: a dark mouth from ear to ear, two rows of teeth along it
  const grin = new THREE.Group(); grin.position.set(0, -0.019, 0); head.add(grin);
  mesh(Q.lip, dark, 0, 0, 0, grin).scale.set(1, 1, 1);
  for (const [row, yy] of [[0, 0.005], [1, -0.006]]) for (let i = 0; i < 14; i++) {
    const a = -1.0 + i / 13 * 2.0, r = 0.0445, t = mesh(Q.tooth, teeth, Math.sin(a) * r, yy + Math.cos(a) * 0.004 * (row ? 1 : -1), -Math.cos(a) * r, grin);
    t.rotation.y = -a;
  }
  // his arms: long and thin, his hands down past his knees, long fingers
  const arm = s => {
    const sh = new THREE.Group(); sh.position.set(s * 0.075, 0.25, 0); torso.add(sh);
    mesh(Q.joint, skin, 0, 0, 0, sh);
    mesh(Q.limb, skin, 0, 0, 0, sh).scale.y = 0.19;
    const el = new THREE.Group(); el.position.y = -0.19; sh.add(el);
    mesh(Q.joint, bone, 0, 0, 0, el).scale.setScalar(0.75);
    mesh(Q.limb, skin, 0, 0, 0, el).scale.set(0.85, 0.18, 0.85);
    const hd = new THREE.Group(); hd.position.y = -0.18; el.add(hd);
    mesh(Q.hand, skin, 0, -0.012, 0, hd);
    for (let i = 0; i < 4; i++) { const f = mesh(Q.finger, skin, (i - 1.5) * 0.0055, -0.03, -0.002, hd); f.rotation.x = 0.25; f.rotation.z = (i - 1.5) * 0.06; }
    return { sh, el, hd };
  };
  const arms = [arm(1), arm(-1)];
  const leg = s => {
    const hp = new THREE.Group(); hp.position.set(s * 0.032, -0.005, 0); hips.add(hp);
    mesh(Q.leg, skin, 0, 0, 0, hp).scale.y = 0.25;
    const kn = new THREE.Group(); kn.position.y = -0.25; hp.add(kn);
    mesh(Q.joint, bone, 0, 0, 0, kn).scale.setScalar(1.05);
    mesh(Q.leg, skin, 0, 0, 0, kn).scale.set(0.8, 0.235, 0.8);
    const ft = new THREE.Group(); ft.position.y = -0.235; kn.add(ft);
    mesh(Q.foot, skin, 0, -0.008, 0, ft);
    return { hp, kn, ft };
  };
  const legs = [leg(1), leg(-1)];
  return { root, orb, tall, body, hips, torso, neck, head, grin, arms, legs, mats: [yellow, skin, bone] };
}
// the little one under the altar: the orb, small, his eyes on you
function rvBuildLittle() { const Q = rvGeo(); return rvOrb(Q, new THREE.MeshPhongMaterial({ color: 0xe8d41a, emissive: 0x4a4000, specular: 0x605010, shininess: 28 }), new THREE.MeshBasicMaterial({ color: 0x060504, side: THREE.DoubleSide }), new THREE.MeshLambertMaterial({ color: 0xf0e070, emissive: 0x302808, side: THREE.DoubleSide })); }

// his pose: the orb hopping, rolling, laughing; standing up; stalking, reaching, leaping; his fall
function rvPose(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, act = z.dead ? null : z.act, at = z.at || 0, sw = reduceMotion ? 0 : 1;
  if (z.p2 && !z.sized) { z.sized = true; rvSize(z, true); }
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  const moving = z.walk && !z.dead;
  z.ph = (z.ph || 0) + dt * (moving ? (z.p2 ? 2.6 : 5) : 0);
  const flash = z.hitT > 0 ? Math.min(1, z.hitT / 0.15) : 0;
  for (const m of M.mats) m.emissive.setRGB(0.23 + flash * 0.4, 0.2 + flash * 0.35, flash * 0.15);
  M.mats[1].emissive.setRGB(0.05 + flash * 0.4, 0.045 + flash * 0.35, 0.01 + flash * 0.15); M.mats[2].emissive.setRGB(0.03 + flash * 0.4, 0.027 + flash * 0.35, flash * 0.15);
  // standing up: the tall body grows up out of the floor under him, and the orb goes up to be its head
  const sk = act === 'stand' ? zbE(clamp(at / (RV_T.stand.end - 0.3), 0, 1)) : z.p2 ? 1 : 0;
  M.orb.o.visible = sk < 0.98;
  M.tall.visible = sk > 0.02;
  if (sk < 0.98) {
    const O = M.orb, hop = moving && act !== 'roll' ? Math.abs(Math.sin(z.ph)) : 0;
    let sq = 1 - 0.12 * (moving ? Math.max(0, Math.cos(z.ph * 2)) : 0) * sw, lift = 0.12 + hop * 0.45 * sw + Math.sin(t * 2 + z.seed) * 0.04 * sw;
    O.body.rotation.set(0, 0, 0); O.face.scale.set(1, 1, 1);
    if (act === 'roll') {
      // (squashed back for the wind-up, then spinning along the line)
      const T = RV_T.roll, w = zbE(Math.min(1, at / T.hit));
      if (at < T.hit) { sq = 1 - 0.25 * w; O.body.rotation.x = 0.35 * w; lift = 0.05; }
      else { O.body.rotation.x = -(z.spin || (at - T.hit) * RVC.ROLL_V / RVC.O.RAD); lift = 0.05; }
    } else if (act === 'grin') {
      // (laughing: shaking, his grin stretched wide)
      const k = Math.min(1, at / 0.4) * (1 - clamp((at - RV_T.grin.end + 0.4) / 0.4, 0, 1));
      O.face.scale.set(1 + 0.12 * k, 1 + 0.1 * k * Math.abs(Math.sin(at * 18)), 1); O.body.rotation.z = Math.sin(at * 30) * 0.06 * k * sw; lift += 0.1 * k;
    } else if (act === 'bump') {
      const T = RV_T.bump, k = Math.sin(clamp(at / T.end, 0, 1) * Math.PI);
      O.body.rotation.x = 0.5 * k; lift += 0.3 * k;
    } else if (act === 'wake') {
      O.body.rotation.z = Math.sin(at * 2.4) * 0.15 * sw;
    }
    O.body.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
    O.body.position.y = lift * (1 - sk);
    // (standing up: up, and smaller, to be his head)
    const S = RVC.T.S, hy = S * 0.94;
    O.o.position.y = zbL(0, hy - RVO.Y * 0.18, sk); O.o.scale.setScalar(zbL(1, 0.18, sk));
  }
  if (sk > 0.02) {
    const S = RVC.T.S;
    M.tall.scale.set(S * (0.4 + 0.6 * sk), S * sk, S * (0.4 + 0.6 * sk));
    M.head.visible = sk > 0.9;
    const st = Math.sin(z.ph), stalk = moving && act !== 'lunge';
    // (stooped under the ceiling, his head pushed forward)
    M.torso.rotation.set(0.32, Math.sin(z.ph) * 0.05 * sw, Math.sin(t * 0.7 + z.seed) * 0.03 * sw);
    M.neck.rotation.set(0.35, 0, 0); M.head.rotation.set(-0.55 + Math.sin(t * 1.3) * 0.05 * sw, Math.sin(t * 0.8 + z.seed) * 0.25 * sw, Math.sin(t * 0.5) * 0.1 * sw);
    let LR = stalk ? [st * 0.42, 0.15 + Math.max(0, -st) * 0.7] : [0.1, 0.18], LL = stalk ? [-st * 0.42, 0.15 + Math.max(0, st) * 0.7] : [-0.05, 0.16];
    let R = [0.15 - st * 0.25, 0.08, 0.15], L = [0.15 + st * 0.25, -0.08, 0.15], crouch = 0.08;
    if (act === 'stand') { R = [0, 0.4 * (1 - sk), 0]; L = [0, -0.4 * (1 - sk), 0]; M.torso.rotation.x = 0.32 * sk; }
    else if (act === 'reach') {
      // (both arms up and out, then raking down through you)
      const T = RV_T.reach, w = zbE(Math.min(1, at / (T.hit - 0.1))), go = zbE(clamp((at - T.hit + 0.1) / 0.2, 0, 1)), back = zbE(clamp((at - T.hit - 0.2) / (T.end - T.hit - 0.2), 0, 1));
      const a = zbL(zbL(0.15, 2.4, w), 0.6, go) * (1 - back) + 0.15 * back;
      R = [a, 0.35 * w * (1 - back), 0.3 * (1 - go)]; L = [a, -0.35 * w * (1 - back), 0.3 * (1 - go)];
      M.torso.rotation.x += 0.3 * go * (1 - back); crouch = 0.15 + 0.2 * go * (1 - back);
    } else if (act === 'lunge') {
      // (crouched to spring, in the air arms flung forward, landing low)
      const T = RV_T.lunge, c = zbE(Math.min(1, at / RVC.LUNGE_UP)), air = at >= RVC.LUNGE_UP && at < T.hit, land = zbE(clamp((at - T.hit) / 0.15, 0, 1)) * (1 - zbE(clamp((at - T.hit - 0.2) / (T.end - T.hit - 0.2), 0, 1)));
      crouch = air ? 0.05 : Math.max(0.6 * c * (at < RVC.LUNGE_UP ? 1 : 0), 0.7 * land);
      if (air) { R = [2.2, 0.3, 0.2]; L = [2.2, -0.3, 0.2]; LR = [0.6, 1.0]; LL = [-0.2, 0.6]; }
      else { R = [0.5 * c, 0.4 * c, 0.2]; L = [0.5 * c, -0.4 * c, 0.2]; }
    } else if (act === 'blink') { R = [0.1, 0.05, 0.05]; L = [0.1, -0.05, 0.05]; M.head.rotation.z += Math.sin(at * 40) * 0.4 * sw; }
    else if (act === 'wake' || act === 'grin') { R = [0.2, 0.1, 0.3]; L = [0.2, -0.1, 0.3]; }
    if (crouch > 0) { M.torso.rotation.x += 0.4 * crouch; M.body.position.y = -0.18 * crouch; LR = [LR[0] + 0.5 * crouch, LR[1] + 1.0 * crouch]; LL = [LL[0] + 0.5 * crouch, LL[1] + 1.0 * crouch]; } else M.body.position.y = 0;
    for (const [i, A] of [R, L].entries()) { M.arms[i].sh.rotation.set(A[0], 0, A[1]); M.arms[i].el.rotation.set(A[2], 0, 0); }
    for (const [i, A] of [LR, LL].entries()) { M.legs[i].hp.rotation.set(-A[0], 0, 0); M.legs[i].kn.rotation.set(A[1], 0, 0); M.legs[i].ft.rotation.set(-A[0] + A[1] * 0.3, 0, 0); }
  }
  if (z.dead) {
    // down: he folds over and sinks into the carpet, and is gone
    const k = Math.min(1, (z.deadT || 0) / 1.2), s = Math.min(1, Math.max(0, (z.deadT || 0) - 1.5) / 2);
    M.root.rotation.set(zbE(k) * (z.p2 ? 1.4 : 0.5), -z.h, 0, 'YXZ');
    M.root.position.y -= s * s * 3.5;
    if (k >= 1 && !z.thud) { z.thud = true; rvSound('die', Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y)); for (let i = 0; i < 18; i++) fpsPuff(z.x + (Math.random() - 0.5) * 2.4, z.y + (Math.random() - 0.5) * 2.4, G0 + 0.3, '230,210,90', 3); }
    M.root.visible = s < 1;
  }
}

// ---------- in 3D: the little one, the roll's line, the rings, the leap's ring, his token ----------
const RV3 = { ok: false };
function rv3dBuild(grp) {
  RV3.ok = false;
  if (!rvRoom()) return;
  const add = (geo, col, op) => { const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); o.visible = false; grp.add(o); return o; };
  const soft = (c0, c1) => new THREE.SpriteMaterial({ map: z3Soft(c0, c1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  // the little one, sat on the altar step
  const L = RV3.little = rvBuildLittle(); L.o.scale.setScalar(RVC.LITTLE); grp.add(L.o);
  RV3.halo = new THREE.Sprite(soft('rgba(255,226,90,0.55)', 'rgba(255,210,60,0)')); RV3.halo.scale.setScalar(0.9); grp.add(RV3.halo);
  // his roll's line on the carpet, his rings, the ring where he'll come down
  const strip = new THREE.PlaneGeometry(1, 1); strip.translate(0, 0.5, 0); strip.rotateX(-Math.PI / 2);
  RV3.line = add(strip, 0xffe060, 0.35);
  const ring = new THREE.RingGeometry(0.9, 1, 56); ring.rotateX(-Math.PI / 2);
  RV3.rings = RVC.RINGS.map(() => add(ring, 0xffe070, 0.8));
  RV3.land = add(new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2), 0xffd040, 0.7);
  RV3.landD = add(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), 0xffc030, 0.15);
  // his token: a gold coin on its edge, turning, his smile on both faces
  const tok = RV3.tok = new THREE.Group(); grp.add(tok); tok.visible = false;
  const gold = new THREE.MeshPhongMaterial({ color: 0xe8c040, emissive: 0x4a3808, specular: 0xffe0a0, shininess: 70 }), blk = new THREE.MeshBasicMaterial({ color: 0x1a1206 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 28), gold); coin.rotation.x = Math.PI / 2; tok.add(coin);
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 6, 24), gold); rim.position.z = s * 0.032; tok.add(rim);
    for (const e of [-1, 1]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), blk); o.scale.set(0.7, 1.3, 0.3); o.position.set(e * 0.08, 0.07, s * 0.034); tok.add(o); }
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 16, Math.PI), blk); m.rotation.z = Math.PI; m.position.set(0, -0.01, s * 0.034); m.scale.z = 0.3; tok.add(m);
  }
  const tg = new THREE.Sprite(soft('rgba(255,230,110,0.9)', 'rgba(255,210,80,0)')); tg.scale.setScalar(2.2); tok.add(tg);
  RV3.ok = true;
}
function rv3d(dt) {
  if (!rvRoom() || !RV3.ok) return;
  const G0 = FPSC.GROUND, t = g.t, m = FPS.me;
  // the little one: there (in his own part) while he can be found, breathing his glow, his eyes on you
  const L = RV3.little, S = rvSpot(), lit = rvSeatHere();
  L.o.visible = RV3.halo.visible = lit;
  if (lit) {
    const [sx, sy] = rvW(...S.at), d = Math.hypot(m.x - sx, m.y - sy), near = clamp(1 - d / 6, 0, 1), b = 0.5 + 0.5 * Math.sin(t * 1.7);
    L.o.position.copy(z3v(sx, sy, G0 + S.z)); L.o.rotation.set(0, -S.h, 0); RV3.halo.position.copy(z3v(sx, sy, G0 + S.z + 0.2));
    RV3.halo.material.opacity = 0.35 + 0.35 * b + 0.3 * near;
    L.body.position.y = Math.sin(t * 2.1) * 0.03;
    // (his eyes, and his whole face a little, turned to you)
    const rel = angDiff(bearingOf(m.x - sx, m.y - sy), S.h);
    L.face.rotation.y = clamp(-rel, -0.6, 0.6) * 0.5; L.body.rotation.z = Math.sin(t * 0.9) * 0.06;
    for (const e of L.eyes) e.position.x = Math.sign(e.position.x) * 0.2 + clamp(-rel * 0.04, -0.05, 0.05);
  }
  const K = rvBoss(), act = K ? K.act : null, at = K ? K.at || 0 : 0;
  // the roll's line
  const rl = act === 'roll' && at < RV_T.roll.hit + 0.3;
  RV3.line.visible = rl;
  if (rl) {
    const Lr = Math.hypot(K.ix - K.ax, K.iy - K.ay) || 1, h = bearingOf(K.ix - K.ax, K.iy - K.ay), k = clamp(at / RV_T.roll.hit, 0, 1);
    RV3.line.position.copy(z3v(K.ax, K.ay, G0 + 0.07)); RV3.line.rotation.set(0, -h, 0); RV3.line.scale.set(RVC.ROLL_W * 2, 1, Lr);
    RV3.line.material.opacity = (0.12 + 0.4 * k * (0.7 + 0.3 * Math.sin(t * (8 + k * 16)))) * (at > RV_T.roll.hit ? Math.max(0, 1 - (at - RV_T.roll.hit) / 0.3) : 1);
  }
  // the rings of his laugh
  RV3.rings.forEach((w, i) => {
    const r = act === 'grin' ? (at - RVC.RINGS[i]) * RVC.RING_V : -1;
    w.visible = r > 0.2 && r < RVC.RING_R;
    if (w.visible) { w.position.copy(z3v(K.ix, K.iy, G0 + 0.08)); w.scale.set(r, 1, r); w.material.opacity = 0.85 * (1 - r / RVC.RING_R); }
  });
  // where he'll come down
  const lg = act === 'lunge' && at < RV_T.lunge.hit + 0.1;
  RV3.land.visible = RV3.landD.visible = lg;
  if (lg) {
    const k = clamp(at / RV_T.lunge.hit, 0, 1);
    for (const o of [RV3.land, RV3.landD]) { o.position.copy(z3v(K.ix, K.iy, G0 + 0.08)); o.scale.setScalar(RVC.LUNGE_R); }
    RV3.land.material.opacity = 0.35 + 0.6 * k * (0.75 + 0.25 * Math.sin(t * (10 + k * 20))); RV3.landD.material.opacity = 0.06 + 0.25 * k * k;
  }
  // his token
  const tk = RV.tok && !RV.mine;
  RV3.tok.visible = !!tk;
  if (tk) { RV3.tok.position.copy(z3v(RV.tok[0], RV.tok[1], G0 + RV.tok[2] + 1.0 + 0.15 * Math.sin(t * 2.2))); RV3.tok.rotation.y = t * 1.8; }
}

// ---------- on top: the glare as you go, his token taken ----------
function rvHud(phone, mono, fell) {
  if (!rvRoom()) return;
  if (RV.fade > 0) { ctx.fillStyle = `rgba(255,236,140,${clamp(RV.fade / 1.2, 0, 1) * 0.9})`; ctx.fillRect(0, 0, W, H); }
  const K = rvBoss();
  if (K && K.act === 'blink' && rvMeIn()) { ctx.fillStyle = `rgba(0,0,0,${0.75 * Math.sin(clamp((K.at || 0) / RV_T.blink.end, 0, 1) * Math.PI)})`; ctx.fillRect(0, 0, W, H); }
  if (RV.grab > 0) {
    const a = Math.min(1, RV.grab, 6 - RV.grab), r = phone ? 34 : 48, y = H * 0.36;
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const gr = ctx.createRadialGradient(cx - r * 0.3, y - r * 0.3, r * 0.1, cx, y, r);
    gr.addColorStop(0, '#fff2a0'); gr.addColorStop(0.6, '#e0b830'); gr.addColorStop(1, '#7a6010');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, y, r, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#6a5010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, r * 0.8, 0, 6.2832); ctx.stroke();
    // (his smile on it)
    ctx.fillStyle = '#2a1e06'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * r * 0.22, y - r * 0.2, r * 0.07, r * 0.13, 0, 0, 6.2832); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(cx - r * 0.38, y + r * 0.05); ctx.quadraticCurveTo(cx, y + r * 0.12, cx + r * 0.38, y + r * 0.05); ctx.ellipse(cx, y + r * 0.05, r * 0.38, r * 0.34, 0, 0, Math.PI); ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff0a0'; ctx.font = fell(phone ? 18 : 26); ctx.fillText('Verity’s Piece of Eight', cx, y + r + (phone ? 20 : 30));
    ctx.fillStyle = 'rgba(236,228,207,0.9)'; ctx.font = mono(phone ? 10 : 13);
    const n = typeof ptTokens === 'function' ? ptTokens() : 1;
    ctx.fillText(`A pirate token: yours to keep (${n} to spend on the Keeper’s Last Light card)`, cx, y + r + (phone ? 40 : 58), W * 0.9);
    if (RV.suite) { ctx.fillStyle = '#ffe24a'; ctx.font = fell(phone ? 14 : 19); ctx.fillText('And Verity’s Wardrobe, all of it: ' + RV.suite + ' things no crate holds', cx, y + r + (phone ? 60 : 86), W * 0.9); ctx.fillStyle = 'rgba(236,228,207,0.85)'; ctx.font = mono(phone ? 9 : 12); ctx.fillText('His outfit, a finish for every weapon, a skin for every boat and a banner, with your others', cx, y + r + (phone ? 76 : 106), W * 0.9); }
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
  }
}

// ---------- into the fort's stage (src/raidfort.js): its hooks, with his ----------
for (const key of ['descent', 'bridge', 'fort']) {
  const S = RAID_STAGES[key]; if (!S) continue;
  const wrap = (k, f) => { const o = S[k]; S[k] = function (...a) { const r = o ? o.apply(this, a) : undefined; const r2 = f(...a); return r === undefined ? r2 : r; }; };
  if (key !== 'fort') wrap('set', (H, K, Z) => rvLay(H, K, Z, key));   // (the fort lays his room out in rfLay)
  wrap('enter', () => { if (key === 'descent' && RAID.stage === 0 && ZM.net !== 'client') rvNewRaid(); rvReset(); });
  wrap('me', dt => rvMe(dt));
  wrap('pack', o => rvPack(o));
  wrap('apply', o => rvApply(o));
  wrap('q', (sid, k) => rvReq(sid, k));
  wrap('kill', d => { if (d && d.boss) rvKill(d); });
  wrap('hud', (phone, mono, fell) => rvHud(phone, mono, fell));
  wrap('b3', grp => rv3dBuild(grp));
  wrap('f3', dt => rv3d(dt));
  wrap('consider', c => rvConsider(c));
  wrap('prompt', o => rvPrompt(o) || undefined);
  wrap('use', o => rvUse(o) || undefined);
}
