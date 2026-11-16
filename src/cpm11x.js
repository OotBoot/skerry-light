'use strict';
// The Chronicle of the Light, mission 11 (Fog Run): its last stage, Lantern Rock and the Fog-Keeper (cp_m11rock).
// The sail and Chapel Islet are src/cpm11.js; the cinematics src/cpm11y.js.
//
// Lantern Rock in 1889 is the rock Fog Run's src/frboss.js lays out (the dead light's broken stump in its middle, its
// door north; the three iron braziers on their cairns round it; the landing to the south with the cutter's boat drawn
// up and a lamp on a post; crags round the north shore), but this time the fight goes round to the north side, under
// the crags, where nobody has looked for fifty years: the Fire Step (src/cpm01.js CPA.FIRE), the fire-keepers' old
// stone hearth from mission 1, its grate rusted and its stones grown over; and on the west strand below it a timber
// wreck, broken open, its planking strewn along the shingle.
// The Fog-Keeper here is his own kind (ZBT.cpfogk, on src/zmboss.js's framework, his model and walk his own from
// src/frboss.js fkBuild / fkPose), and fought his own way, in three parts:
//  I.  The braziers are cold: he's put them out. Hold Use at one for C11R.USE seconds to light it. He can only be hurt
//      in their light, and the more of them burn the worse (C11R.MULT: nothing with none, 60% with one, all with two,
//      a quarter more with three). He swings his lantern on its chain close in (as in Fog Run), and:
//       - his gaze: he stops and turns his lamp-glass on you, and a cold beam sweeps across the rock. Whoever it
//         touches in the open is hurt and chilled (slowed); stone between you and him (the tower, a cairn, a crag, a
//         wreck) stops it. A brazier it crosses goes out.
//       - he fades: goes to fog where he stands and comes out of it again behind one of you.
//  II. At C11R.P2 of his strength he climbs his tower (m11_climb) and every brazier goes out. Up there nothing touches
//      him, and he throws cold lanterns down (a ring on the rock where each will burst: get out of it). Carry timber
//      from the wreck on the west strand up to the Fire Step (the fire-keeping kit, src/cpm01.js: 2 + one for each of
//      you) and hold Use at it to light the old fire. It catches (m11_oldfire), and he comes down to it.
//  III. Now only the old fire hurts him: near it (within C11R.FIRE_NEAR) he takes a little more than full, further
//      off about half, and nothing while it's out. Keep it burning: it burns its wood, the drowned kick at it, fog
//      banks roll in off the sea for it, he breathes more fog at it, and his gaze across it takes some of its height.
//      Brands from it burn the fog off (as in mission 1). Let it go out and he's untouchable until it's lit again
//      (feed it, or hold Use to blow the embers back).
// When he falls, the dead light at the top of his tower comes on again (the outro).
// Together it's host-authoritative: the stage's word is m11r (what part it is, the braziers, his number, the end's
// clock) and the kit's ka; he streams as the bosses do (bo: his blow, how far in, and where a thrown lantern lands).
// Each screen judges his blows on its own player (the swing, the gaze, the lantern). Joined players ask: 'brz' i, and
// the kit's 'take', 'feed', 'brand', 'light'.

const C11R = {
  HP: 34, P2: 0.6, TOP: 10, WAIT: 4.5, MULT: [0, 0.6, 1, 1.25], FIRE_NEAR: 20, NEAR_K: 1.15, FAR_K: 0.55, USE: 3,
  GAZE_R: 30, GAZE_W: 0.07, GAZE_SW: 0.95, GAZE: [8, 11], GAZE_FIRE: 18, FADE: [15, 20], BREATHE: [13, 17], THROW: [2.3, 3.3], THROW_R: 3.4,
  CHILL: 2.4, CHILL_K: 0.6, KB: 13, STOCK: 6, WOOD: [0, 1, 2, 3], RISE: [0, 8.6], DOWN: [0, 9.6], WON: 5,
  FOG: [52, 44, 58], FOGC: '#1e252c',
};
const C11R_ST = ['intro', 'p1', 'climb', 'p2', 'fall', 'p3', 'won'];
const C11R_NAME = ['east', 'west', 'south'];

// ---------- the rock ----------
FPS_ISLES.cpm11rock = Object.assign({}, FPS_ISLES.frrock, { name: 'Lantern Rock', wrecks: [0], rocks: [5, 2, 3.8, 1.1], fog: [C11R.FOGC, 12, 60], birds: ['gull', 0] });
const C11R_MAP = { start: [0, -26], top: 0, R: CPA.R, isle: 'cpm11rock', seed: 0x1889, shore: () => -999, nav: [-CPA.R, CPA.R, -CPA.R, CPA.R], zones: { isle: { n: 'Lantern Rock', r: [-CPA.R, CPA.R, -CPA.R, CPA.R], sky: true } } };
FPI_GEN.cpm11rock = {
  built: true,
  set(H) {
    H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    const { CX, CY } = H;
    // Fog Run's Lantern Rock: the dead light, its door north; the braziers on their cairns; the landing
    H.put('frdeadlight', CX + CPA.TOWER[0], CY + CPA.TOWER[1], Math.PI / 2, {});
    for (const [x, y] of CPA.CAIRN) H.put('frbraz', CX + x, CY + y, H.R(0, H.TAU), {});
    H.put('boat', CX + CPA.LAND[0] - 2.2, CY + CPA.LAND[1] - 3.2, Math.PI / 2 + 0.25, { len: 4.6, beam: 1.6, paint: '#34465a' });
    fpiLanternPost(H, CX + CPA.LAND[0] + 2.4, CY + CPA.LAND[1] - 1.5, -Math.PI / 2);
    cpaCrags(H);
    // round the north side: the Fire Step, gone to moss and rust; the timber wreck on the west strand below it
    H.put('cpahearth', CX + CPA.FIRE[0], CY + CPA.FIRE[1], 0, { old: true });
    H.wrecks.push({ x: CX + CPA.WRECK2[0] - 4, y: CY + CPA.WRECK2[1] + 1, r: 6, ang: 0.5, lean: 0.35, name: 'a timber wreck', ribs: 5 });
    for (const [x, y, a] of [[-17, 12, 0.4], [-20.5, 6, 1.9], [-12, 18.5, 2.6]]) H.put('log', CX + x, CY + y, a, { len: H.R(2.2, 3.2), rad: 0.16 });
    H.track([cpaW(CPA.LAND), [CX + 1, CY - 16], [CX - 9, CY - 2], [CX - 13, CY + 14], [CX - 3, CY + 19]]);
    ZMD.START = [0, -26]; C11R_MAP.start = [0, -26];
  },
  props(H) { cpaClearSpots(H); },
  decor() {},
};

// ---------- the state ----------
const c11rR = () => RAID.st && RAID.st.r;
const c11rBoss = () => { const R = c11rR(); return R && R.cz ? ZM.z.find(z => z.zn === R.cz && z.bt === 'cpfogk') || null : null; };
const c11rLitN = () => { const R = c11rR(); return R ? R.br.filter(Boolean).length : 0; };
const c11rFireOn = () => { const K = cpkS(); return !!(K && K.lit && K.fuel > 0); };
const c11rTopAt = () => cpaW([CPA.TOWER[0], CPA.TOWER[1] - 0.6]);
// how much a hit on him does now (0: nothing)
function c11rMult(z) {
  const R = c11rR(); if (!R || !z || z.dead) return 0;
  if (z.act === 'rise' || (z.act === 'fade' && z.at > 0.6)) return 0;
  if (R.st === 'p1') return C11R.MULT[c11rLitN()] || 0;
  if (R.st === 'p3') { if (!c11rFireOn()) return 0; const [fx, fy] = RAID.st.fire; return Math.hypot(z.x - fx, z.y - fy) < C11R.FIRE_NEAR ? C11R.NEAR_K : C11R.FAR_K; }
  return 0;
}
// (my side's own: knocked flying, chilled, the hold at a brazier, the glance of a shot)
const C11RL = { kb: [0, 0], chill: 0, useT: 0, useI: -1, pend: 0, dark: 0, gSeq: -1, gPrev: null, tink: 0, hide: false, k: 0 };

// ---------- the stage ----------
cpStage('m11rock', {
  n: 'Lantern Rock', map: C11R_MAP, mend: true, open: true,
  banner: () => ({ text: 'Lantern Rock', t: 4.5, sub: 'Part III · the dead light', col: '#c8d4e0' }),
  music: () => { const R = c11rR(); return !R ? 'cpm11boss' : R.st === 'p3' ? 'cpm11fire' : R.st === 'p2' || R.st === 'climb' || R.st === 'fall' ? 'cpm11boss2' : 'cpm11boss'; },
  set() {},
  enter() {
    const n = cpaN();
    cpkEnter({ lit: false, need: 2 + n, piles: false, drain: 0, relight: 35,
      onLight: sid => c11rLit(sid),
      onEmbers: () => { if (c11rR().st === 'p3') { cpaOnce('e1', 'mate', 'She’s down to embers! Wood on her, quick!', 'cp_m11_37'); cpaBan('Embers', 'feed the old fire: he can’t be hurt while it’s out', '#ff9a7a'); } },
      onOut: () => { const R = c11rR(); if (R.st === 'p3' && !R.out) { R.out = 1; cpaFeed('The old fire is out. Nothing touches him now: feed it, or hold Use to blow the embers back.'); } },
      onSmother: () => cpaFeed('A bank of fog rolled over the old fire and smothered half of it.'),
      onFeed: () => c11rFed() });
    Object.assign(RAID.st, { r: { st: 'intro', wait: C11R.WAIT, cz: 0, br: [0, 0, 0], t: 0, spT: 6, stockT: C11R.STOCK, wonT: 0, out: 0 }, rSeen: { br: [0, 0, 0], st: 'intro' } });
    Object.assign(C11RL, { kb: [0, 0], chill: 0, useT: 0, useI: -1, pend: 0, dark: 0, gSeq: -1, gPrev: null, hide: false, k: 0 });
    FKW.fogI = -1; FKW.litK = 0;
    ZM.round = Math.max(ZM.round, 12); ZB.round = ZM.round; ZB.plan = [];
    if (ZM.net !== 'client') { cpObjective('Lantern Rock. Whatever is putting the lights out is here'); cpWaypoint(null); }
    FPS.me.h = 0;
  },
  tick: dt => c11rTick(dt),
  me: dt => c11rMe(dt),
  pack(o) { cpkPack(o); const R = c11rR(); if (!R) return; let b = 0; R.br.forEach((v, i) => { if (v) b |= 1 << i; }); o.m11r = [C11R_ST.indexOf(R.st), b, R.cz | 0, Math.round(R.wonT * 10), R.out | 0]; },
  apply(o) { cpkApply(o); const R = c11rR(); if (!R || !Array.isArray(o.m11r)) return; const a = o.m11r; R.st = C11R_ST[a[0] | 0] || 'intro'; R.br = [0, 1, 2].map(i => ((a[1] | 0) >> i) & 1); R.cz = a[2] | 0; R.wonT = (+a[3] || 0) / 10; R.out = a[4] | 0; if (R.cz) ZB.seen.add(R.cz); },
  q(sid, k, a) {
    const R = c11rR(); if (!R) return;
    if (k === 'brz') { const i = clamp(a | 0, 0, 2); if (R.st === 'p1' && !R.br[i] && cpaUp(sid)) { R.br[i] = 1; cpaFeed(`${cpaNick(sid)} lit the ${C11R_NAME[i]} brazier.`); if (c11rLitN() === 1) cpaOnce('b1', 'mate', 'That’s one! Get him in its light!', 'cp_m11_24'); } return; }
    if (R.st === 'p2' || R.st === 'p3') cpkQ(sid, k, a);
  },
  kill: (d, how, by) => c11rKill(d, how, by),
  hurt: (d, dmg, code, by) => c11rHurt(d, dmg, code, by),
  consider(c) {
    const R = c11rR(); if (!R) return;
    if (R.st === 'p1') CPA.CAIRN.forEach(([x, y], i) => { if (!R.br[i]) c({ k: 'c11br', i }, FPSC.CX + x, FPSC.CY + y, 0, 2.6, false); });
    if (R.st === 'p2' || R.st === 'p3') cpkConsider(c);
  },
  prompt(o) { if (o.k === 'c11br') return { text: `Hold to light the ${C11R_NAME[o.i]} brazier`, hold: true }; return cpkPrompt(o); },
  use(o) { if (o.k === 'c11br') return true; return cpkUse(o); },
  players: P => cpkPlayers(P),
  speedK: () => cpkSpeedK() * (C11RL.chill > 0 ? C11R.CHILL_K : 1),
  hud: (phone, mono, fell) => c11rHud(phone, mono, fell),
  b3(grp) { cpk3dBuild(grp); c11r3dBuild(grp); },
  f3(dt) { cpk3d(dt); c11r3d(dt); },
  exit() { cpk3dExit(); C11R3.on = false; cpaNightOff(); C11RL.hide = false; },
});

// ---------- alone or hosting, each tick ----------
function c11rTick(dt) {
  const S = RAID.st, R = S.r, K = S.kp, n = cpaN(); if (!R || !K) return;
  R.t += dt;
  cpkTick(dt);
  const M = c11rBoss(), m = FPS.me;
  if (R.st === 'intro') { R.wait -= dt; if (R.wait <= 0) { c11rRise(); R.st = 'p1'; R.t = 0; c11rObj(); } return; }
  if (R.st === 'won') { R.wonT -= dt; if (R.wonT <= 0 && R.wonT > -50) { R.wonT = -99; cpDone(); } return; }
  if (R.st === 'climb' || R.st === 'fall') return;
  if (R.st === 'p1') {
    if (R.t > 4) cpaOnce('p1', 'mate', 'The braziers! Light them! He’s only to be hurt where the light falls on him.', 'cp_m11_23');
    if (R.t > 20 && !c11rLitN()) cpaOnce('p1b', 'fog', 'Dark. Let it be dark.', 'cp_m11_25');
    c11rObj();
    let b = -1, bd = 1e9; CPA.CAIRN.forEach(([x, y], i) => { if (R.br[i]) return; const d = Math.hypot(FPSC.CX + x - m.x, FPSC.CY + y - m.y); if (d < bd) { bd = d; b = i; } });
    if (b >= 0) cpWaypoint(CPA.CAIRN[b][0], CPA.CAIRN[b][1], 'A cold brazier', 2); else cpWaypoint(null);
    if (M && !M.dead && M.act !== 'rise' && M.hp <= M.max * C11R.P2) c11rClimb(M);
  } else if (R.st === 'p2') {
    if (M && !M.dead) c11rTop(M);
    // more timber turns up on the wreck's strand while there isn't enough of it
    const have = C11R.WOOD.filter(i => K.piles[i]).length + Object.keys(K.carry).length + K.stack;
    R.stockT -= dt; if (have < K.need && R.stockT <= 0) { R.stockT = C11R.STOCK; const free = C11R.WOOD.filter(i => !K.piles[i]); if (free.length) K.piles[free[(Math.random() * free.length) | 0]] = 1; }
    c11rObj();
    const me = cpkMine();
    if (K.stack >= K.need) cpWaypoint(CPA.FIRE[0], CPA.FIRE[1], 'Light the old fire', 1.4);
    else if (me.carry) cpWaypoint(CPA.FIRE[0], CPA.FIRE[1], 'The Fire Step', 1.4);
    else { let b = -1, bd = 1e9; K.piles.forEach((v, i) => { if (!v) return; const [x, y] = cpaW(CPA_SPOTS[i]), d = Math.hypot(x - m.x, y - m.y); if (d < bd) { bd = d; b = i; } }); if (b >= 0) cpWaypoint(CPA_SPOTS[b][0], CPA_SPOTS[b][1], 'Timber'); else cpWaypoint(null); }
  } else if (R.st === 'p3') {
    if (c11rFireOn()) R.out = 0;
    if (R.t > 3) cpaOnce('p3', 'mate', 'Keep him by the fire! He burns where its light reaches him.', 'cp_m11_35');
    c11rObj();
    if (K.banks.length) { let b = null, bd = 1e9; for (const B of K.banks) { const d = Math.hypot(B.x - m.x, B.y - m.y); if (d < bd) { bd = d; b = B; } } cpWaypoint(b.x - FPSC.CX, b.y - FPSC.CY, 'Fog', 1.5); }
    else if (!c11rFireOn()) cpWaypoint(CPA.FIRE[0], CPA.FIRE[1], 'The old fire', 1.4);
    else if (K.fuel < 50) { let b = -1, bd = 1e9; K.piles.forEach((v, i) => { if (!v) return; const [x, y] = cpaW(CPA_SPOTS[i]), d = Math.hypot(x - m.x, y - m.y); if (d < bd) { bd = d; b = i; } }); if (b >= 0) cpWaypoint(CPA_SPOTS[b][0], CPA_SPOTS[b][1], 'Wood'); else cpWaypoint(null); }
    else cpWaypoint(null);
    // he keeps to the rock
    if (M && !M.dead) { const lx = M.x - FPSC.CX, ly = M.y - FPSC.CY, d = Math.hypot(lx, ly); if (d > CPA.R - 4) { M.x = FPSC.CX + lx / d * (CPA.R - 4); M.y = FPSC.CY + ly / d * (CPA.R - 4); } }
  }
  if (R.st === 'p1' && M && !M.dead) { const lx = M.x - FPSC.CX, ly = M.y - FPSC.CY, d = Math.hypot(lx, ly); if (d > CPA.R - 4) { M.x = FPSC.CX + lx / d * (CPA.R - 4); M.y = FPSC.CY + ly / d * (CPA.R - 4); } }
  // the drowned, up out of the fog at the rock's edge, more of them while he's up his tower
  R.spT -= dt;
  const cap = { p1: 2 + n, p2: 4 + 2 * n, p3: 3 + 2 * n }[R.st] || 0;
  if (R.spT <= 0) { R.spT = (R.st === 'p2' ? 3.6 : 5.2) * (0.75 + Math.random() * 0.5) / Math.sqrt(1 + 0.5 * (n - 1)); if (ZM.z.filter(z => !z.dead && !z.boss).length < cap) cpaSpawn({ kind: cpaKind(R.st === 'p2' ? 0.3 : 0.18), hp: cpaHp(R.st === 'p3' ? 6 : 4) }); }
}
// what's to be done, for the objective line
function c11rObj() {
  if (ZM.net === 'client') return;
  const R = c11rR(), K = cpkS(); if (!R || !K) return;
  if (R.st === 'p1') { const l = c11rLitN(); cpObjective(l ? `Fight him in the braziers’ light (${l} of 3 lit: your shots do ${Math.round(C11R.MULT[l] * 100)}%)` : 'Light the braziers round the dead light: in the dark he can’t be hurt'); }
  else if (R.st === 'p2') cpObjective(K.stack >= K.need ? 'Light the old fire on the Fire Step (hold Use at it)' : `Carry timber from the wreck on the west strand up to the old Fire Step (${K.stack} of ${K.need})`);
  else if (R.st === 'p3') cpObjective(c11rFireOn() ? `Bring him down by the old fire: he burns in its light · the fire ${Math.round(K.fuel)}%` : 'The old fire is out: feed it, or hold Use at it to blow the embers back');
}
// (hosting or alone) he comes up out of the rock at the foot of his tower
function c11rRise() {
  const kind = 'cpfogk', T = ZBT[kind], n = cpaN(), R = c11rR();
  const hp = zmHp(12) * C11R.HP * ZBC.BOOST * (1 + ZBC.HP_MORE * (n - 1)) * zbRaidK();
  const zn = ++ZM.zc, [wx, wy] = cpaW(C11R.RISE);
  const z = { drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x: wx, y: wy, jz: -4.6, fl: 0, hp, max: hp, sp: T.sp(),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: Math.PI, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 2, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy };
  T.init(z); zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z; ZB.seen.add(zn);
  R.cz = zn;
  zbStart(z, 'rise'); zbArrive(z);
}
// (hosting or alone) at C11R.P2: up his tower (the cinematic), the braziers out
function c11rClimb(M) {
  const R = c11rR(); R.st = 'climb'; M.act = null; M.at = 0;
  R.br = [0, 0, 0];
  cpCine('m11_climb', () => c11rPerch());
}
function c11rPerch() {
  const R = c11rR(), K = cpkS(), M = c11rBoss(), n = cpaN(); if (!R || R.st !== 'climb') return;
  R.st = 'p2'; R.t = 0; R.br = [0, 0, 0]; R.stockT = C11R.STOCK;
  K.need = 2 + n; K.stack = 0; for (const i of C11R.WOOD.slice(0, Math.min(4, K.need))) K.piles[i] = 1;
  if (M) { c11rTop(M); M.act = null; M.thCd = 2; }
  cpaBan('He’s up his tower', 'carry timber from the wreck to the old Fire Step, under the crags', '#c8d4dc');
  cpaOnce('c2', 'mate', 'Timber from the wreck, up to the old hearth. Mind what he throws!', 'cp_m11_30');
  c11rObj();
}
// (hosting or alone) he stands at the top of his stump
function c11rTop(M) { const [x, y] = c11rTopAt(); M.x = x; M.y = y; M.jz = M.fl = C11R.TOP; M.walk = false; }
// the old fire: stacked, then lit (the first time: the cinematic, and he comes down); blown back after
function c11rFed() { const R = c11rR(), K = cpkS(); if (R.st === 'p2' && K.stack >= K.need) cpaOnce('c3', 'mate', 'She’s stacked. Put a flame to her!', 'cp_m11_31'); c11rObj(); }
function c11rLit(sid) {
  const R = c11rR();
  if (R.st === 'p2') { R.st = 'fall'; cpaFeed(`${cpaNick(sid)} lit the old fire on the Fire Step.`); cpObjective(''); cpWaypoint(null); for (const z of ZM.z) if (!z.dead && !z.boss) zmKill(z, false, '', 'flash'); cpCine('m11_oldfire', () => c11rDown()); return; }
  if (R.st === 'p3') { R.out = 0; cpaFeed(`${cpaNick(sid)} blew the old fire back to flame.`); }
}
function c11rDown() {
  const R = c11rR(), K = cpkS(), M = c11rBoss(), n = cpaN(); if (!R || R.st !== 'fall') return;
  R.st = 'p3'; R.t = 0; R.out = 0;
  Object.assign(RAID.st.kcfg, { drain: 0.42, wash: 6.5, bankEvery: [12, 17], bankTwo: 0.2 });
  K.bankT = 9; K.washT = 4; K.fuel = Math.max(K.fuel, 75);
  for (const i of [5, 8, 11]) K.piles[i] = 1;
  if (M) { const [x, y] = cpaW(C11R.DOWN); M.x = x; M.y = y; M.jz = M.fl = 0; M.h = 0; M.act = null; zbStart(M, 'land'); M.gzCd = 6; M.brCd = 9; M.fdCd = 14; }
  cpaBan('The old fire burns', 'he can only be hurt in its light now: keep it burning', '#ffd88a');
  void n; c11rObj();
}
// (hosting or alone) he falls
function c11rKill(d, how, by) {
  const R = c11rR(); if (!R || !d.boss || d.bt !== 'cpfogk' || R.st === 'won') return;
  R.st = 'won'; R.wonT = C11R.WON; R.br = [1, 1, 1];
  for (const z of ZM.z) if (!z.dead && !z.boss) zmKill(z, false, '', 'flash');
  const K = cpkS(); if (K) { K.banks.length = 0; K.fuel = Math.max(K.fuel, 60); }
  cpObjective(''); cpWaypoint(null);
  cpaFeed('The Fog-Keeper goes down by the old fire, and the fog goes out of him. Above you, the dead light comes on.');
  void how; void by;
}
// (the shooter's side) how much a hit on him does: by the light on him
function c11rHurt(d, dmg, code, by) {
  if (!d || d.bt !== 'cpfogk') return dmg;
  const mine = !by || by === FPS.me.id; if (!mine) return dmg;
  const k = c11rMult(d);
  if (k <= 0) { c11rGlance(d); return 0; }
  raidBossDamage(dmg * k * (ZM_DMG[code] == null ? 1 : ZM_DMG[code]));
  return dmg * k;
}
// my shot glances off him: sparks off the lamp-glass
function c11rGlance(d) {
  const m = FPS.me, dx = m.x - d.x, dy = m.y - d.y, l = Math.hypot(dx, dy) || 1, z0 = FPSC.GROUND + (d.jz || 0) + 1.8 + Math.random() * 1.8, x = d.x + dx / l * 0.9, y = d.y + dy / l * 0.9;
  for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283, s = 0.25 + Math.random() * 0.35; ZM.sparks.push({ a: [x, y, z0], b: [x + Math.cos(a) * s, y + Math.sin(a) * s, z0 + (Math.random() - 0.3) * s], t: 0.22, col: '190,210,230' }); }
  C11RL.dark = 1.4; d.ward = 0.35;
  if (!(C11RL.tink > 0)) { C11RL.tink = 0.12; try { if (!soundOff()) { tone(2200 + Math.random() * 600, 'triangle', 0.002, 0.05, 0.12); tone(3100, 'sine', 0.002, 0.025, 0.08, { delay: 0.02 }); } } catch (e) {} }
}

// ---------- everyone, each frame ----------
function c11rMe(dt) {
  const S = RAID.st, R = S.r; if (!R) return;
  cpkMe(dt);
  const m = FPS.me, L = C11RL, Sn = S.rSeen, alive = !(m.dead > 0) && !zmIsDown() && !ZM.over && !cpCineOn();
  for (const k of ['chill', 'pend', 'dark', 'tink']) if (L[k] > 0) L[k] -= dt;
  // the braziers catching and going out; the part changing
  R.br.forEach((v, i) => { if (v !== Sn.br[i]) { const [x, y] = CPA.CAIRN[i], d = Math.hypot(FPSC.CX + x - m.x, FPSC.CY + y - m.y); fkSound(v ? 'catch' : 'douse', d); if (!v) fpsPuff(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + 2, '150,160,170', 14); Sn.br[i] = v; } });
  if (R.st !== Sn.st) { if (R.st === 'won') { fkSound('die', 0); setTimeout(() => fkSound('dawn', 0), 900); } Sn.st = R.st; }
  const M = c11rBoss();
  FKW.litK = (FKW.litK || 0) + (((M && c11rMult(M) > 0) ? 1 : 0) - (FKW.litK || 0)) * Math.min(1, dt * 8);
  if (R.st === 'won' && zmIsDown()) zmGetUp();
  // knocked flying by his lantern
  if (Math.hypot(L.kb[0], L.kb[1]) > 0.1) { zmMove(m, L.kb[0] * dt, L.kb[1] * dt); const k = Math.exp(-dt * 3.2); L.kb[0] *= k; L.kb[1] *= k; } else L.kb = [0, 0];
  // his gaze sweeping over the rock: judged here, on me
  if (M && !M.dead && M.act === 'gaze') {
    const A = C11R_ACT.gaze, at = M.at || 0;
    if (L.gSeq !== M.aseq) { L.gSeq = M.aseq; L.gPrev = null; L.gHit = false; }
    if (at >= A.hit && at <= A.hit + 2.1 && alive && !L.gHit && zbOk()) {
      const d = Math.hypot(m.x - M.x, m.y - M.y), bm = bearingOf(m.x - M.x, m.y - M.y), w = C11R.GAZE_W + Math.atan(0.45 / Math.max(1, d));
      const b = angDiff(bm, M.h), a = L.gPrev == null ? b : angDiff(bm, L.gPrev);
      if (d < C11R.GAZE_R && (Math.abs(b) < w || (a * b < 0 && Math.abs(a) < 1 && Math.abs(b) < 1)) && c11rClear(M.x, M.y, m.x, m.y)) {
        L.gHit = true; fpsHurt(1, null, null); zmSound('hit'); FPS.hurtT = 0.7; L.chill = C11R.CHILL; c11rSound('chill', 0);
        fpsFeed('His gaze passes over you, and the cold goes into your bones.');
      }
    }
    L.gPrev = M.h;
  }
  // holding Use at a cold brazier lights it
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
  if (hold && o && o.k === 'c11br' && alive && !(L.pend > 0) && R.st === 'p1' && !R.br[o.i]) {
    if (L.useI !== o.i) { L.useI = o.i; L.useT = 0; }
    L.useT += dt;
    if (L.useT >= C11R.USE) { L.useT = 0; L.pend = 1.2; raidAsk('brz', o.i); }
  } else { L.useT = 0; L.useI = -1; }
}
// (is the way between two places clear of stone: the tower, a cairn, a crag, a wreck)
function c11rClear(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(d / 0.8);
  for (let i = 2; i < n - 1; i++) { const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; if (Math.hypot(x - FPSC.CX, y - FPSC.CY) > FPSC.R - 2) continue; if (zmBlockedAt(x, y, 0.05, 0.5)) return false; }
  return true;
}

// =====================================================================================================================
// the Fog-Keeper of 1889: a kind of his own, on src/zmboss.js's framework (his model and walk are src/frboss.js's)
// =====================================================================================================================
// rise: up out of the rock; swing: his lantern on its chain (Fog Run's); gaze: the cold beam swept across the rock;
// fade: to fog, and out of it again behind one of you; throw: a cold lantern lobbed down from his tower; roost: a
// moment stood on it; breathe: fog breathed out at the old fire (two banks of it); land: down off his tower
const C11R_ACT = { rise: FK_ACT.rise, swing: FK_ACT.swing, breathe: FK_ACT.breathe, gaze: { hit: 0.9, end: 3.3 }, fade: { hit: 1.0, end: 2.2 }, throw: { hit: 1.5, end: 2.1 }, roost: { hit: 99, end: 0.5 }, land: { hit: 99, end: 1.2 } };
ZB_KINDS.push('cpfogk');
for (const a of Object.keys(C11R_ACT)) if (!ZB_ACT.includes(a)) ZB_ACT.push(a);
const c11rRnd = a => a[0] + Math.random() * (a[1] - a[0]);
ZBT.cpfogk = {
  n: 'the Fog-Keeper', N: 'The Fog-Keeper', sub: 'the last fire-keeper of Lantern Rock', col: '#c8d4dc', warn: '200,170,255', big: 'swing', puff: '170,180,190',
  get bar() { return FKW.litK > 0.5 ? ['#8a4a14', '#ffd27a'] : ['#2a3440', '#8a9aa8']; },
  hp: C11R.HP, pts: 4000, rad: FKC.RAD, tall: FKC.TALL, headZ: FKC.HEADZ, pad: FKC.PAD, crowd: 1.4, near: 2.8, through: 1.6, scale: 1.6,
  sp: () => FKC.SP * (c11rR() && c11rR().st === 'p3' ? 1.1 : 1),
  win: () => false,
  acts: C11R_ACT,
  noFlash: () => !(c11rMult(c11rBoss()) > 0),
  arriveLine: () => 'Up out of the rock at the foot of the dead light: the Fog-Keeper. Light the braziers: in the dark he can’t be hurt.',
  smashLine: () => '',
  killLine: (who, pts) => `${who} put down the Fog-Keeper (+${pts}).`,
  init(z) { z.swCd = 2; z.gzCd = 7; z.fdCd = 16; z.brCd = 10; z.thCd = 2; },
  cool(z, dt) { for (const k of ['gzCd', 'fdCd', 'brCd', 'thCd']) if (z[k] > 0) z[k] -= dt; },
  think(z, p, d, dz, level) {
    const R = c11rR(); if (!R) return 'roost';
    if (R.st === 'p2') return z.thCd <= 0 ? 'throw' : 'roost';
    if (R.st !== 'p1' && R.st !== 'p3') return 'roost';
    if (R.st === 'p3' && z.brCd <= 0 && c11rFireOn()) return 'breathe';
    if (z.gzCd <= 0 && d > 5 && d < C11R.GAZE_R - 4) return 'gaze';
    if (z.fdCd <= 0 && d > 13) return 'fade';
    if (level && d < FKC.SWING_R - 1.2 && z.swCd <= 0) return 'swing';
    return null;
  },
  start(z, act, p) {
    const n = cpaN(), P = (ZM.players || []).filter(q => !q.beacon && !q.dead && !q.down);
    if (act === 'swing') z.swCd = 2.2 + Math.random() * 1.2;
    if (act === 'gaze') { z.gzCd = c11rRnd(C11R.GAZE) / (1 + 0.15 * (n - 1)); z.g0 = p ? bearingOf(p.x - z.x, p.y - z.y) : z.h; z.gDir = Math.random() < 0.5 ? -1 : 1; z.gBr = 0; z.gFire = 0; z.swCd = Math.max(z.swCd, 1); }
    if (act === 'fade') {
      z.fdCd = c11rRnd(C11R.FADE);
      // (behind one of you: the one furthest from the rest)
      let t = p; if (P.length > 1) { let best = -1; for (const q of P) { const s = P.reduce((a, o) => a + Math.hypot(o.x - q.x, o.y - q.y), 0); if (s > best) { best = s; t = q; } } }
      const pa = t && cpaAt(t.sid), hh = pa ? pa.h || 0 : 0, tx = t ? t.x : z.x, ty = t ? t.y : z.y;
      let fx = tx - Math.sin(hh) * 6, fy = ty - Math.cos(hh) * 6;
      for (let k = 0; k < 10 && (zmBlockedAt(fx, fy, 1, 0) || Math.hypot(fx - FPSC.CX, fy - FPSC.CY) > CPA.R - 5); k++) { const a = hh + Math.PI + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5; fx = tx + Math.sin(a) * 6; fy = ty + Math.cos(a) * 6; }
      z.ix = fx; z.iy = fy; z.ax = tx; z.ay = ty;
    }
    if (act === 'throw') {
      z.thCd = c11rRnd(C11R.THROW) / (1 + 0.25 * (n - 1));
      // (at one of you: whoever's carrying first)
      const K = cpkS(), c = P.filter(q => K && K.carry[q.sid]), pool = c.length && Math.random() < 0.6 ? c : P, t = pool[(Math.random() * pool.length) | 0] || p;
      const a = Math.random() * 6.283, r = Math.random() * 1.6;
      z.ix = t ? t.x + Math.cos(a) * r : z.x; z.iy = t ? t.y + Math.sin(a) * r : z.y;
    }
    if (act === 'breathe') { z.brCd = c11rRnd(C11R.BREATHE); z.swCd = Math.max(z.swCd, 1); }
  },
  during(z, dt, nearest) {
    const T = C11R_ACT[z.act], R = c11rR();
    if (z.act === 'rise') { const e = zbE(Math.min(1, z.at / T.end)); z.jz = -4.6 * (1 - e); z.fl = 0; z.h = 0; if (z.at + dt >= T.end) { z.jz = z.fl = 0; z.lx = z.x; z.ly = z.y; } return; }
    if (R && (R.st === 'p2' || R.st === 'climb')) c11rTop(z);
    if (z.act === 'roost') { const p = nearest(z.x, z.y, 0); if (p) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 2); return; }
    if (z.act === 'throw') { z.h += angDiff(bearingOf(z.ix - z.x, z.iy - z.y), z.h) * Math.min(1, dt * 5); return; }
    if (z.act === 'gaze') {
      const k = clamp((z.at - T.hit) / 2.0, 0, 1);
      z.h = z.g0 + z.gDir * C11R.GAZE_SW * (k * 2 - 1);
      if (ZM.net === 'client' || z.at < T.hit || k >= 1) return;
      // (what the beam crosses: a lit brazier goes out; the old fire loses its height)
      if (R.st === 'p1' && !z.gBr) CPA.CAIRN.forEach(([x, y], i) => { if (z.gBr || !R.br[i]) return; const bx = FPSC.CX + x, by = FPSC.CY + y, d = Math.hypot(bx - z.x, by - z.y); if (d < C11R.GAZE_R && Math.abs(angDiff(bearingOf(bx - z.x, by - z.y), z.h)) < 0.06 + Math.atan(1 / Math.max(1, d)) && c11rClear(z.x, z.y, bx, by)) { z.gBr = 1; R.br[i] = 0; cpaFeed(`His gaze passes over the ${C11R_NAME[i]} brazier and it goes out.`); } });
      if (R.st === 'p3' && !z.gFire && c11rFireOn()) { const [fx, fy] = RAID.st.fire, d = Math.hypot(fx - z.x, fy - z.y); if (d < C11R.GAZE_R && Math.abs(angDiff(bearingOf(fx - z.x, fy - z.y), z.h)) < 0.06 + Math.atan(1.2 / Math.max(1, d))) { z.gFire = 1; const K = cpkS(); K.fuel = Math.max(1, K.fuel - C11R.GAZE_FIRE); cpaFeed('His gaze passes over the old fire, and it shrinks from it.'); } }
      return;
    }
    if (z.act === 'breathe') { const [fx, fy] = RAID.st.fire; z.h += angDiff(bearingOf(fx - z.x, fy - z.y), z.h) * Math.min(1, dt * 3); return; }
    if (z.act === 'fade' || z.act === 'land') return;
    const p = nearest(z.x, z.y, z.jz); if (!p) return;
    const turn = z.act === 'swing' ? (z.at < FK_ACT.swing.hit * 0.6 ? 3.2 : 0) : 1.5;
    if (turn) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * turn);
  },
  strike(z) {
    const m = FPS.me, dm = Math.hypot(z.x - m.x, z.y - m.y);
    if (z.act === 'swing') {
      fkSound('swing', dm);
      for (let i = 0; i < 18; i++) { const a = z.h + (i / 17 - 0.5) * 2 * FKC.SWING_ARC, r = FKC.SWING_R * (0.6 + Math.random() * 0.4); fpsPuff(z.x + Math.sin(a) * r, z.y + Math.cos(a) * r, FPSC.GROUND + 0.4, '120,110,150', 1); }
      if (zbOk() && fkInArc(z, m.x, m.y) && Math.abs((m.jz || 0) - (z.jz || 0)) < 2) {
        fpsHurt(fkHalf(), null, null); zmSound('hit'); FPS.hurtT = 0.9;
        const a = bearingOf(m.x - z.x, m.y - z.y); C11RL.kb = [Math.sin(a) * C11R.KB, Math.cos(a) * C11R.KB]; m.vz = Math.max(m.vz || 0, 4.6);
        fpsFeed('His lantern catches you and throws you across the rock.');
      }
      return;
    }
    if (z.act === 'gaze') { c11rSound('gaze', dm); return; }
    if (z.act === 'throw') {
      const d = Math.hypot(z.ix - m.x, z.iy - m.y);
      c11rSound('smash', d);
      for (let i = 0; i < 16; i++) { const a = Math.random() * 6.283, r = Math.random() * C11R.THROW_R; fpsPuff(z.ix + Math.cos(a) * r, z.iy + Math.sin(a) * r, FPSC.GROUND + 0.3 + Math.random(), '190,215,240', 2); }
      if (zbOk() && d < C11R.THROW_R && (m.jz || 0) < 1.2) { fpsHurt(1, null, null); zmSound('hit'); FPS.hurtT = 0.7; C11RL.chill = C11R.CHILL; const a = bearingOf(m.x - z.ix, m.y - z.iy); C11RL.kb = [Math.sin(a) * 6, Math.cos(a) * 6]; fpsFeed('A cold lantern bursts at your feet.'); }
      return;
    }
    if (z.act === 'fade') {
      for (let i = 0; i < 24; i++) { const a = Math.random() * 6.283, r = Math.random() * 1.8; fpsPuff(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, FPSC.GROUND + Math.random() * 4, '160,170,180', 3); fpsPuff(z.ix + Math.cos(a) * r, z.iy + Math.sin(a) * r, FPSC.GROUND + Math.random() * 4, '160,170,180', 3); }
      c11rSound('fade', Math.hypot(z.ix - m.x, z.iy - m.y));
      if (ZM.net !== 'client') { z.x = z.ix; z.y = z.iy; z.lx = z.x; z.ly = z.y; z.h = bearingOf(z.ax - z.x, z.ay - z.y); }
      if (Math.hypot(z.ix - m.x, z.iy - m.y) < 9) cpaOnce('fd', 'mate', 'He’s gone into the fog. Watch your backs!', 'cp_m11_26');
      return;
    }
    if (z.act === 'breathe') {
      fkSound('breathe', dm);
      if (ZM.net === 'client') return;
      const K = cpkS(); if (!K) return;
      const [fx, fy] = RAID.st.fire, a = bearingOf(fx - z.x, fy - z.y);
      for (let j = 0; j < (cpaN() > 1 ? 2 : 1); j++) { const s = j ? 1 : -1; K.banks.push({ id: ++K.bid % 1000, x: z.x + Math.sin(a) * 3 + Math.cos(a) * 2.4 * s, y: z.y + Math.cos(a) * 3 - Math.sin(a) * 2.4 * s, hp: 1, age: 0 }); }
      cpaOnce('br', 'mate', 'He’s breathing fog at the fire! Brands, quick, and burn it off!', 'cp_m11_36');
    }
  },
  after(z, a) {
    if (a === 'rise' || a === 'land') { z.st = 'in'; z.jz = z.fl = 0; zmSettle(z); }
  },
  hurtK: (z, how) => z.act === 'rise' ? 0 : how === 'burn' ? 0.5 : 1,
  endOf: (z, act) => C11R_ACT[act] ? C11R_ACT[act].end : 0,
  actSound(z, act) {
    const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y);
    if (act === 'rise') { fkSound('rise', d); for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, r = Math.random() * 2.4; fpsPuff(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, FPSC.GROUND + Math.random() * 3, '160,170,180', 3); } }
    else if (act === 'swing') fkSound('draw', d);
    else if (act === 'breathe') fkSound('inhale', d);
    else if (act === 'gaze') { c11rSound('look', d); ZM.banner = { text: 'His gaze', t: 2.2, small: true, col: '#b8d0f0', sub: 'get stone between you and him' }; }
    else if (act === 'throw') c11rSound('throw', d);
    else if (act === 'fade') fkSound('inhale', d);
  },
  sound: (k, d) => fkSound(k, d),
  build: () => fkBuild(),
  reset(z, M) { M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1); M.root.visible = true; },
  pose: (z, M, dt) => { fkPose(z, M, dt); c11rPose(z, M, dt); },
};
// his own blows, over Fog Run's pose; and where he stands, on every screen, while he's up his tower
function c11rPose(z, M, dt) {
  const R = c11rR(), at = z.at || 0;
  if (R && (R.st === 'p2' || R.st === 'climb') && !z.dead) { const [x, y] = c11rTopAt(); M.root.position.copy(z3v(x, y, FPSC.GROUND + C11R.TOP)); }
  if (z.dead) return;
  if (z.act === 'gaze') {
    const k = zbE(Math.min(1, at / C11R_ACT.gaze.hit));
    M.head.rotation.x = 0.25 * k; M.torso.rotation.x = 0.06 + 0.12 * k;
    M.arms[1].sh.rotation.set(zbL(0.2, 1.35, k), 0, zbL(-0.18, -0.05, k)); M.arms[1].el.rotation.set(0.15, 0, 0);
  } else if (z.act === 'throw') {
    const T = C11R_ACT.throw, k1 = zbE(Math.min(1, at / (T.hit * 0.55))), k2 = zbE(clamp((at - T.hit * 0.55) / (T.hit * 0.45), 0, 1));
    M.arms[0].sh.rotation.set(zbL(zbL(0.25, -2.6, k1), 1.4, k2), 0, 0.25); M.arms[0].el.rotation.set(zbL(0.5, 0.2, k2), 0, 0);
    M.torso.rotation.x = 0.06 - 0.2 * k1 + 0.35 * k2;
  }
  // (gone to fog, partway through a fade; hidden while a cinematic plays him itself)
  M.root.visible = !C11RL.hide && !(z.act === 'fade' && at > 0.75 && at < 1.55);
}
function c11rSound(k, d) {
  const v = clamp(1 - (d || 0) / 60, 0.15, 1), play = (n, vol) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, { vol: vol * v, vary: 0.05 }); } catch (e) { return false; } };
  const syn = f => { try { if (!soundOff() && AUD.ctx) f(); } catch (e) {} };
  if (k === 'look') { syn(() => { tone(1320, 'sine', 0.3, 0.025 * v, 0.9, { to: 1180 }); tone(1980, 'sine', 0.3, 0.012 * v, 0.9); }); return; }
  if (k === 'gaze') { syn(() => { noise('highpass', 3000, 1, 0.05, 0.05 * v, 2); tone(990, 'sine', 0.05, 0.03 * v, 2, { to: 880 }); tone(1480, 'triangle', 0.05, 0.012 * v, 2); }); return; }
  if (k === 'chill') { syn(() => { noise('highpass', 4000, 1, 0.01, 0.08, 0.6); tone(2600, 'sine', 0.005, 0.03, 0.5, { to: 1800 }); }); return; }
  if (k === 'throw') { play('swish', 0.8); syn(() => noise('bandpass', 900, 1, 0.3, 0.05 * v, 0.6)); return; }
  if (k === 'smash') { play('glass', 0.8); syn(() => { noise('highpass', 2600, 1, 0.005, 0.12 * v, 0.5); tone(1760, 'sine', 0.005, 0.03 * v, 0.6, { to: 900 }); }); return; }
  if (k === 'fade') { play('foghorn', 0.4); syn(() => noise('lowpass', 500, 1, 0.3, 0.08 * v, 1.4)); return; }
}

// ---------- on top ----------
function c11rHud(phone, mono, fell) {
  const R = c11rR(), K = cpkS(); if (!R || !K || ZM.over) return;
  const L = Math.max(14, FPS.safeLeft || 0), t = g.t, M = c11rBoss(), w = phone ? 150 : 214;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  let y = fpsHudTop() + (phone ? 68 : 92);
  if (R.st === 'p3' || R.st === 'p2') { y = cpkHud(phone, mono, fell) || y; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; }
  else {
    // the braziers: three lamps, and what your shots do
    const n = c11rLitN(), bh = phone ? 34 : 44;
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(L - 4, y - 4, w + 8, bh);
    for (let i = 0; i < 3; i++) { const x = L + 10 + i * (phone ? 18 : 22), on = R.br[i] || R.st === 'won'; ctx.fillStyle = on ? `rgba(255,${180 + 30 * Math.sin(t * 9 + i)},100,1)` : 'rgba(110,125,140,0.6)'; ctx.beginPath(); ctx.arc(x, y + (phone ? 6 : 8), phone ? 5 : 6, 0, 6.283); ctx.fill(); }
    ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.85)';
    ctx.fillText(R.st === 'p1' ? `BRAZIERS ${n} OF 3 · YOUR SHOTS DO ${Math.round((C11R.MULT[n] || 0) * 100)}%` : 'THE BRAZIERS', L, y + (phone ? 16 : 20));
    y += bh + 4; fpsHudNote(y);
  }
  ctx.font = mono(phone ? 9 : 11);
  if (R.st === 'p2') { ctx.fillStyle = 'rgba(200,212,224,0.85)'; ctx.fillText('HE’S UP HIS TOWER: NOTHING TOUCHES HIM THERE', L, y); y += phone ? 13 : 16; }
  if (R.st === 'p3' && M && !M.dead) { const k = c11rMult(M); ctx.fillStyle = k >= 1 ? '#ffe08a' : k > 0 ? '#ffb070' : `rgba(160,180,200,${0.75 + 0.25 * Math.sin(t * 5)})`; ctx.fillText(k >= 1 ? 'HE’S IN THE FIRE’S LIGHT · FULL' : k > 0 ? `HE’S FAR FROM THE FIRE · YOUR SHOTS DO ${Math.round(k * 100)}%` : 'THE FIRE’S OUT · NOTHING TOUCHES HIM', L, y); y += phone ? 13 : 16; }
  if (C11RL.dark > 0 && R.st !== 'p2') { ctx.fillStyle = `rgba(170,190,210,${Math.min(1, C11RL.dark)})`; ctx.fillText(R.st === 'p3' ? 'YOUR SHOT GLANCES OFF HIM: THE OLD FIRE MUST BURN' : 'YOUR SHOT GLANCES OFF HIM IN THE DARK: LIGHT A BRAZIER', L, y); }
  // his gaze coming: a warning in the middle; chilled: frost at the edges
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  if (M && !M.dead && M.act === 'gaze' && (M.at || 0) < C11R_ACT.gaze.hit + 0.3) { ctx.font = mono(phone ? 11 : 14); ctx.fillStyle = `rgba(190,215,255,${0.7 + 0.3 * Math.sin(t * 14)})`; ctx.fillText('HIS LAMP-GLASS TURNS ON YOU · GET BEHIND STONE', cx, H * 0.36); }
  if (C11RL.chill > 0) { const a = Math.min(1, C11RL.chill / C11R.CHILL) * 0.5, gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.3, cx, H / 2, Math.max(W, H) * 0.7); gr.addColorStop(0, 'rgba(180,210,255,0)'); gr.addColorStop(1, `rgba(190,220,255,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(200,225,255,0.85)'; ctx.fillText('CHILLED · SLOWED', cx, H - (phone ? 130 : 90)); }
  // lighting a brazier: a ring round the sights filling
  if (C11RL.useT > 0) { const k = Math.min(1, C11RL.useT / C11R.USE); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,192,112,0.25)'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke(); ctx.strokeStyle = '#ffc070'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke(); }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
}

// ---------- in 3D: the braziers, the dead light, his gaze, his lanterns, his swing's shadow; the night ----------
const C11R3 = { on: false };
function c11r3dBuild(grp) {
  const G0 = FPSC.GROUND, Q = C11R3;
  const soft = z3Soft('rgba(255,210,150,0.95)', 'rgba(255,170,90,0)'), cold = z3Soft('rgba(220,235,255,0.95)', 'rgba(180,210,255,0)');
  const spr = (map, op) => new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: op == null ? 1 : op }));
  Q.br = CPA.CAIRN.map(([x, y]) => {
    const [wx, wy] = cpaW([x, y]), Z = G0 + fpsIsleH(FPS.g.isle, wx, wy) + 2.05;
    const fire = spr(soft); fire.position.copy(z3v(wx, wy, Z)); fire.scale.set(1.5, 2.1, 1); grp.add(fire);
    const halo = spr(soft, 0.35); halo.position.copy(fire.position); halo.scale.setScalar(8); grp.add(halo);
    const L = new THREE.PointLight(0xffa860, 0, 16, 1.4); L.position.copy(z3v(wx, wy, Z + 0.6)); grp.add(L);
    return { fire, halo, L, k: 0, x: wx, y: wy };
  });
  // the dead light at the top of the stump: dark until he falls
  { const [tx, ty] = cpaW(CPA.TOWER), top = z3v(tx, ty, G0 + C11R.TOP + 0.8);
    Q.dl = spr(cold, 0); Q.dl.position.copy(top); Q.dl.scale.setScalar(14); grp.add(Q.dl);
    Q.dlL = new THREE.PointLight(0xe8f0ff, 0, 80, 1.1); Q.dlL.position.copy(top); grp.add(Q.dlL);
    const fade = z3Fade([[0, 'rgba(235,245,255,0.5)'], [0.5, 'rgba(220,235,255,0.14)'], [1, 'rgba(210,230,255,0)']]);
    const geo = new THREE.CylinderGeometry(1, 0.05, 1, 32, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(-Math.PI / 2);
    Q.dlB = new THREE.Group(); Q.dlB.position.copy(top); Q.dlB.visible = false; grp.add(Q.dlB);
    Q.dlBM = new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
    for (const s of [1, -1]) { const b = new THREE.Mesh(geo, Q.dlBM); b.scale.set(60, 8, 700 * s); b.frustumCulled = false; b.renderOrder = 9; Q.dlB.add(b); } }
  // his gaze: a long cold cone out of his lamp-glass
  { const fade = z3Fade([[0, 'rgba(210,230,255,0.75)'], [0.6, 'rgba(190,215,255,0.25)'], [1, 'rgba(180,205,255,0)']]);
    const geo = new THREE.CylinderGeometry(1, 0.12, 1, 20, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(-Math.PI / 2);
    Q.gz = new THREE.Group(); Q.gz.rotation.order = 'YXZ'; Q.gz.visible = false; grp.add(Q.gz);
    Q.gzM = new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
    const b = new THREE.Mesh(geo, Q.gzM); b.scale.set(1.3, 1.3, C11R.GAZE_R); b.frustumCulled = false; b.renderOrder = 9; Q.gz.add(b);
    Q.gzEye = spr(cold, 0); Q.gzEye.scale.setScalar(3); grp.add(Q.gzEye); }
  // a thrown lantern: the lantern itself, and the ring where it'll burst
  { Q.th = spr(cold, 0); Q.th.scale.setScalar(1.6); grp.add(Q.th);
    Q.ring = new THREE.Mesh(new THREE.RingGeometry(C11R.THROW_R - 0.3, C11R.THROW_R, 48), new THREE.MeshBasicMaterial({ color: 0xa8c8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    Q.ring.rotation.x = -Math.PI / 2; grp.add(Q.ring);
    Q.pool = new THREE.Mesh(new THREE.CircleGeometry(C11R.THROW_R, 40), new THREE.MeshBasicMaterial({ color: 0x6080b0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    Q.pool.rotation.x = -Math.PI / 2; grp.add(Q.pool); }
  // his swing's shadow: a dark fan in front of him as he winds it back
  { const arc = new THREE.Mesh(new THREE.CircleGeometry(FKC.SWING_R, 40, Math.PI / 2 - FKC.SWING_ARC, FKC.SWING_ARC * 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    arc.rotation.x = -Math.PI / 2; Q.arc = new THREE.Group(); Q.arc.add(arc); Q.arc.visible = false; grp.add(Q.arc); Q.arcM = arc.material;
    const rim = new THREE.Mesh(new THREE.RingGeometry(FKC.SWING_R - 0.3, FKC.SWING_R, 40, 1, Math.PI / 2 - FKC.SWING_ARC, FKC.SWING_ARC * 2), new THREE.MeshBasicMaterial({ color: 0x9a70ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.01; Q.arc.add(rim); Q.rimM = rim.material; }
  Q.on = true; Q.mistT = 0; Q.dawn = 0; Q.dawnSeen = false;
}
function c11r3d(dt) {
  const Q = C11R3, R = c11rR(); if (!Q.on || !R) return;
  const t = g.t, G0 = FPSC.GROUND, won = R.st === 'won', M = c11rBoss();
  // the braziers
  Q.br.forEach((B, i) => {
    const lit = R.br[i] || won; B.k += ((lit ? 1 : 0) - B.k) * Math.min(1, dt * 3);
    const fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 17 + i) * Math.sin(t * 5.3 + i * 2);
    B.fire.visible = B.halo.visible = B.k > 0.02; B.fire.scale.set(1.5 * fl * B.k, 2.2 * (2 - fl) * B.k, 1); B.halo.material.opacity = 0.32 * fl * B.k; B.L.intensity = 2.4 * fl * B.k;
    if (!lit && Math.random() < dt * 3) FPS.parts.push({ x: B.x + (Math.random() - 0.5) * 0.4, y: B.y + (Math.random() - 0.5) * 0.4, z: G0 + 2, vx: 0, vy: 0, vz: 0.8, t: 1.2, c: '110,115,120' });
  });
  // the dead light: on when he falls
  Q.dawn = won ? Math.min(1, Q.dawn + dt / 3) : 0;
  Q.dl.material.opacity = Q.dawn; Q.dlL.intensity = 3 * Q.dawn; Q.dlB.visible = Q.dawn > 0.01; Q.dlBM.opacity = Q.dawn; Q.dlB.rotation.y = -t * 0.9;
  // his gaze
  { const on = M && !M.dead && M.act === 'gaze' && !C11RL.hide, at = on ? M.at || 0 : 0, A = C11R_ACT.gaze;
    Q.gz.visible = !!on; Q.gzEye.material.opacity = 0;
    if (on) {
      const hz = G0 + (M.jz || 0) + FKC.HEADZ * 1.02, k = at < A.hit ? at / A.hit : at < A.hit + 2.0 ? 1 : Math.max(0, 1 - (at - A.hit - 2.0) / 0.3);
      Q.gz.position.copy(z3v(M.x + Math.sin(M.h) * 0.4, M.y + Math.cos(M.h) * 0.4, hz)); Q.gz.rotation.set(-0.1, -M.h, 0);
      Q.gzM.opacity = at < A.hit ? 0.12 * k * (0.6 + 0.4 * Math.sin(t * 20)) : 0.85 * k; Q.gz.scale.set(at < A.hit ? 0.25 : 1, at < A.hit ? 0.25 : 1, 1);
      Q.gzEye.position.copy(Q.gz.position); Q.gzEye.material.opacity = 0.9 * k; Q.gzEye.scale.setScalar(2 + 2 * k);
    } }
  // a thrown lantern: from his hand up on the tower, arcing down to where it bursts
  { const on = M && !M.dead && M.act === 'throw' && !C11RL.hide, at = on ? M.at || 0 : 0, A = C11R_ACT.throw;
    Q.ring.visible = Q.pool.visible = !!on && at < A.hit + 0.15; Q.th.material.opacity = 0;
    if (on) {
      const k = clamp(at / A.hit, 0, 1), gz = G0 + fpsIsleH(FPS.g.isle, M.ix, M.iy) + 0.07;
      Q.ring.position.copy(z3v(M.ix, M.iy, gz)); Q.pool.position.copy(z3v(M.ix, M.iy, gz - 0.01));
      Q.ring.material.opacity = 0.3 + 0.5 * k * (0.7 + 0.3 * Math.sin(t * (8 + k * 16))); Q.pool.material.opacity = 0.08 + 0.14 * k;
      const f = clamp((at - A.hit * 0.55) / (A.hit * 0.45), 0, 1), sx = M.x + Math.sin(M.h) * 1.2, sy = M.y + Math.cos(M.h) * 1.2, sz = G0 + (M.jz || 0) + 4.6;
      if (at < A.hit) { Q.th.material.opacity = 0.95; Q.th.position.copy(z3v(zbL(sx, M.ix, f), zbL(sy, M.iy, f), zbL(sz, gz + 0.4, f) + Math.sin(f * Math.PI) * 4)); }
    } }
  // his swing's shadow
  { let show = false;
    if (M && !M.dead && M.act === 'swing' && !C11RL.hide) { const at = M.at || 0, T = FK_ACT.swing; if (at < T.hit + 0.25) { show = true; const k = clamp(at / T.hit, 0, 1); Q.arc.position.copy(z3v(M.x, M.y, G0 + (M.jz || 0) + 0.09)); Q.arc.rotation.y = -M.h; Q.arcM.opacity = at < T.hit ? 0.2 + 0.35 * k : 0.55 * (1 - (at - T.hit) / 0.25); Q.rimM.opacity = at < T.hit ? 0.25 + 0.5 * k * (0.7 + 0.3 * Math.sin(t * (10 + k * 14))) : 0; } }
    Q.arc.visible = show; }
  // the haar on the rock, and at the end swept away
  const far = won ? 60 + 340 * Q.dawn * Q.dawn : R.st === 'p2' || R.st === 'climb' ? C11R.FOG[1] : R.st === 'p3' || R.st === 'fall' ? C11R.FOG[2] : C11R.FOG[0];
  cpaNight(far, C11R.FOGC, 0.24 + 0.3 * Q.dawn, dt);
  Q.mistT -= dt;
  if (Q.mistT <= 0 && !won) { Q.mistT = 0.09; const a = Math.random() * 6.283, r = CPA.R - 2 + Math.random() * 6; FPS.parts.push({ x: FPSC.CX + Math.cos(a) * r, y: FPSC.CY + Math.sin(a) * r, z: G0 + 0.5 + Math.random() * 1.5, vx: -Math.cos(a) * 0.8, vy: -Math.sin(a) * 0.8, vz: 0.1, t: 2.5, c: '150,160,170' }); }
}
