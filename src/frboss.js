'use strict';
// Fog Run: Lantern Rock and the Fog-Keeper (RAID_STAGES.fr_boss, registered with frKind('boss', ...), src/frrun.js).
// The last stop of every run, out in the Haar, where the fog is thickest.
//
// Lantern Rock is a bare skerry a little smaller than the islands (FKC.R across its radius) with the stump of an older,
// dead lighthouse in its middle: its stone tower broken off at about ten metres, its lantern long gone, a doorway black
// at its foot. Round it, three iron lamp braziers on cairns (FK_BRAZ), lit when you land. South, where the cutter is
// run up, the landing, and by it a flare stand.
//  - The Fog-Keeper: the keeper of that dead light, drowned with it, more than twice a man's height, in a keeper's long
//    oilskin coat gone black with the sea; where his head should be a lamp-glass, its brass astragals green, fog pouring
//    out of it all the while; in his right fist a cold lantern on a chain. He's the one who has been putting the lights
//    out. He comes up out of the rock at the foot of his tower.
//  - He can only be hurt while there's light on him (the Gannet's Wake Captain Crane rule): standing inside a lit
//    brazier's ring (FKC.RING), under a flare, or while the Light's beam sweeps over the rock (far to the south, once
//    a turn of the beam, src/gannet.js gwBeam, the same clock on every screen). In the dark a shot glances off him.
//  - His fog: every FKC.FOG seconds he draws a breath and breathes out a bank of fog that rolls across the rock to one
//    of the lit braziers and puts it out. Hold Use at a dark brazier for FKC.USE seconds to light it again.
//  - His lantern: swung round on its chain in a wide arc in front of him. The lantern goes dark first (a black glow,
//    and the rock under the arc darkens) so you can get out of the way; what it hits it knocks flying, for half your
//    health.
//  - The drowned come up out of the fog at the rock's edge all fight long, more the more of you there are.
//  - The flare stand by the landing (Use): a flare over the rock that lights all of it, and him, for FKC.FLARE seconds,
//    then FKC.RELOAD to reload.
//  - At half his strength he climbs his tower. Nothing touches him on the way up; at the top he puts out the Light's
//    beam (from then on it never reaches the rock), then drops back down. From then on only the braziers and flares
//    light him, his fog comes more often, and a brazier's ring only counts while at least two of the three are lit:
//    the crew has to keep two burning. Anyone lost in the fog is brought back when he climbs.
//  - When he falls, the dead light comes on again at the top of the tower, its beam sweeps away the fog right across
//    the sea, everyone lost is brought back, and a few seconds later the run is won (frWin: the victory screen).
// Together it's host-authoritative, as the Quarterdeck (src/gwcapt.js): the host runs the stage and him (a boss kind of
// his own on src/zmboss.js's framework, ZBT.fogkeeper) and sends the stage in `fk` (fkPack / fkApply); a joined player
// asks to light a brazier or fire the flare (raidAsk 'light', 'fl'). Whether he's lit is worked out on every side alike
// (the beam from the shared clock, the braziers and the flare from the host's word, his place from the boss stream).
// The shooter's side says whether a hit does anything; the host takes a joined player's hit if he was lit a moment
// before (FKC.LIT_GRACE).
// For tests: frDebug('fr_boss') goes straight to Lantern Rock.

const FKC = {
  R: 34,   // (the rock's radius)
  TOWER: [0, 3], TR: 3.3, TOP: 10,   // (the dead light: where, its radius, how tall the stump stands)
  RING: 6.2, USE: 3,   // (a lit brazier's ring of light; how long to hold Use to light one)
  FOG: 20, FOG2: 14, FOG_FIRST: 12,   // (his fog: how often, and from half strength; the first)
  FLARE: 7, FLARE_UP: 0.9, RELOAD: 30, RELOAD2: 20, FLARE_Z: 26,
  BEAM_W: 1.86, LY: -820,   // (the Light's beam: how wide either side it lights the rock: three times what it was, about four seconds a sweep; the Light, far to the south)
  HP: 40, ROUND: 12, PTS: 4000, RAD: 0.95, TALL: 4.4, HEADZ: 3.85, PAD: 0.6, SP: 2.6, S: 2.25,
  SWING_R: 7.2, SWING_ARC: 1.55, SWING_KB: 13,
  ALIVE: 5, ALIVE_MORE: 3, TRICKLE: [4, 7],
  P2: 0.5, WON: 8, LIT_GRACE: 0.7,
};
const FK_ST = ['intro', 'fight', 'won'];
// the braziers: local x, y (round the tower, about twelve metres out)
const FK_BRAZ = [[10.4, 9], [-10.4, 9], [0, -9]];
const FK_NAME = ['east', 'west', 'south'];
const FK_LAND = [0, -(FKC.R - 6)], FK_FLARE = [3.4, -FKC.R + 9.5];
const FK_RISE = [0, FKC.TOWER[1] + FKC.TR + 2.2];   // (where he comes up: the foot of his tower, at its door, north side)
const FKW = { on: false, st: 'intro' };
const fkL = o => [o.x - FPSC.CX, o.y - FPSC.CY];

// ---------- the rock ----------
FPS_ISLES.frrock = Object.assign({}, FPS_ISLES.reef, { name: 'Lantern Rock', ground: '#5e6466', ground2: '#454c4a', wet: '#262a2e', path: '#4e5250', mound: 0.03, dune: 0.05,
  rocks: [6, 2, 4, 1.1], wrecks: [1, 6, 8], tintRock: ['#2a3034', 0.4], fog: ['#0c1014', 12, 50], mist: '60,70,78', mistA: 0.2, birds: ['gull', 0], tufts: ['#2e3a30', 0], pebbles: 90, pools: 5, wrack: 50, indoor: false, keep: false, arena: false, noGround: false });
const FK_MAP = { start: FK_LAND.slice(), top: 0, R: FKC.R, isle: 'frrock', shore: () => -999, nav: [-FKC.R, FKC.R, -FKC.R, FKC.R], zones: { isle: { n: 'Lantern Rock', r: [-FKC.R, FKC.R, -FKC.R, FKC.R], sky: true } } };
FPI_GEN.frrock = {
  built: true,
  set(H) {
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }, { CX, CY } = H;
    // the dead light in the middle, its door north
    H.put('frdeadlight', CX + FKC.TOWER[0], CY + FKC.TOWER[1], Math.PI / 2, {});
    // the three braziers on their cairns
    for (const [x, y] of FK_BRAZ) H.put('frbraz', CX + x, CY + y, H.R(0, H.TAU), {});
    // the landing: the cutter's boat drawn up, a lamp on a post, the flare stand
    H.put('boat', CX + FK_LAND[0] - 2.2, CY + FK_LAND[1] - 3.2, Math.PI / 2 + 0.25, { len: 4.6, beam: 1.6, paint: '#34465a' });
    fpiLanternPost(H, CX + FK_LAND[0] + 2.4, CY + FK_LAND[1] - 1.5, -Math.PI / 2);
    H.put('frflare', CX + FK_FLARE[0], CY + FK_FLARE[1], 0, {});
    // crags round the north shore, behind the tower, and a path worn up from the landing
    for (let i = -5; i <= 5; i++) {
      const a = Math.PI / 2 + i * 0.2 + H.R(-0.04, 0.04), d = H.IR + H.R(2, 5), r = H.R(5, 8) - Math.abs(i) * 0.3, [x, y] = H.polar(a, d);
      const prof = []; for (let k = 0; k < 7; k++) prof.push(H.R(0.6, 1)); prof[0] = H.R(0.3, 0.5); prof[6] = H.R(0.3, 0.5);
      H.rocks.push({ x, y, r, prof, ph: H.R(0, 6.28), rk: { h: 1.5 - Math.abs(i) * 0.08, tint: ['#2a3034', 0.4] }, crag: true });
    }
    H.track([[CX + FK_LAND[0], CY + FK_LAND[1]], [CX + 1, CY - 16], [CX + FK_BRAZ[2][0], CY + FK_BRAZ[2][1] - 1.5]]);
    ZMD.START = FK_LAND.slice(); FK_MAP.start = FK_LAND.slice();
  },
  props(H) {},
  decor() {},
};
// the dead light: the stump of a round stone tower, its courses green with weed at the foot and broken off ragged at
// the top, a doorway on one side (black: it doesn't open), the iron stubs of its old gallery, and its lantern's
// rusted frame lying in the rubble at its foot
FPI_K.frdeadlight = {
  col: FPI_C.stone, noShadow: false,
  sol(p) { return [fpiCirc(p, 0, 0, FKC.TR, FKC.TOP)]; },
  b3(p, A) {
    const R0 = FKC.TR, T = FKC.TOP, n = 18;
    A.cyl(FPI_C.stone3, 0, 0, -0.1, R0 + 0.5, 0.7, 0, 0, 0, 'cyl8');   // (its plinth)
    for (let c = 0; c < 9; c++) {
      const z = c * 1.12, rr = R0 - c * 0.05;
      for (let i = 0; i < n; i++) {
        const a = (i + (c % 2) * 0.5) / n * Math.PI * 2, top = T - 2 + 2 * Math.sin(a * 2 + 1) + 1.2 * Math.sin(a * 5);   // (the ragged break)
        if (z > top) continue;
        const col = c < 2 ? (i % 3 ? '#3a4a3e' : '#46564a') : (i + c) % 4 ? FPI_C.stone : FPI_C.stone2;
        if (Math.abs(angDiff(a, 0)) < 0.28 && c < 2) continue;   // (the doorway)
        A.part('box', col, Math.cos(a) * rr, Math.sin(a) * rr, z + 0.56, 0.62, 1.1, rr * 6.283 / n + 0.06, -a, 0, 0);
      }
    }
    // the doorway: a dark recess under a lintel
    A.part('box', '#050607', R0 - 0.2, 0, 1.15, 0.4, 2.3, 1.2, 0, 0, 0);
    A.part('box', FPI_C.stone3, R0 + 0.02, 0, 2.45, 0.5, 0.3, 1.7, 0, 0, 0);
    // the gallery's iron stubs, bent
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + 0.4; A.part('box', FPI_C.iron, Math.cos(a) * (R0 + 0.35), Math.sin(a) * (R0 + 0.35), T - 3.4 + A.r() * 0.6, 0.12, 0.12, 0.9, -a, 0, 0.5 + A.r() * 0.6); }
    // the lantern's old frame, fallen: a cage of rusted bars in the rubble by the tower
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; A.part('box', '#3a2a20', -R0 - 2 + Math.cos(a) * 0.9, 1.6 + Math.sin(a) * 0.9, 0.8, 0.07, 1.7, 0.07, 0, 0.4, 0.2); }
    A.part('torus', '#3a2a20', -R0 - 2, 1.6, 1.5, 0.95, 0.95, 0.5, 0.4, 0.2, 0);
    for (let i = 0; i < 14; i++) { const a = A.r() * 6.283, d = R0 + 0.6 + A.r() * 2.4; A.part('ico', A.r() < 0.5 ? FPI_C.stone : FPI_C.stone2, Math.cos(a) * d, Math.sin(a) * d, 0.15, 0.35 + A.r() * 0.35, 0.3, 0.35, A.r() * 3); }
  },
};
// a lamp brazier: an iron bowl on three legs, on a cairn of stones (its fire is the stage's 3D: it goes out)
FPI_K.frbraz = {
  col: FPI_C.iron,
  sol(p) { return [fpiCirc(p, 0, 0, 0.9, 1.9)]; },
  b3(p, A) {
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + A.r() * 0.3, d = 0.7 + A.r() * 0.3; A.part('ico', i % 3 ? FPI_C.stone : FPI_C.stone2, Math.cos(a) * d, Math.sin(a) * d, 0.18 + A.r() * 0.2, 0.45, 0.38, 0.42, A.r() * 3); }
    A.cyl(FPI_C.stone3, 0, 0, 0, 0.75, 0.6, 0, 0, 0, 'cyl8');
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; A.part('cyl6', FPI_C.iron, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 1.15, 0.07, 1.2, 0.07, a, 0, 0.22); }
    A.part('cone', FPI_C.iron, 0, 0, 1.8, 0.95, -0.55, 0.95);
    for (let i = 0; i < 4; i++) A.log(FPI_C.tar, (A.r() - 0.5) * 0.4, (A.r() - 0.5) * 0.4, 1.75, 0.07, 0.8, i * 0.8, (A.r() - 0.5) * 0.4);
  },
};
// the flare stand: a post with a painted box of flares and a short brass flare gun clipped to it
FPI_K.frflare = {
  col: FPI_C.wood,
  sol(p) { return [fpiBox(p, 0, 0, 0.45, 0.35, 1.3)]; },
  b3(p, A) {
    A.cyl(FPI_C.wood2, 0, 0, 0, 0.1, 1.6, 0, 0, 0, 'cyl6');
    A.box('#7a2a22', 0, 0, 0.9, 0.85, 0.6, 0.45);
    A.box('#e8d8b0', 0, -0.31, 1.05, 0.5, 0.02, 0.12);
    A.box('#8a7a3a', 0.25, -0.33, 1.3, 0.3, 0.06, 0.08);
  },
};

// =====================================================================================================================
// the stage
// =====================================================================================================================
frKind('boss', { n: 'Lantern Rock', mark: '☗', weight: 0 }, {
  n: 'Lantern Rock', map: FK_MAP, mend: true, open: true,
  music: () => FKW.p2 ? FR_MUSIC.boss2 : FR_MUSIC.boss,
  prep(i) { const p = FR.plan[i]; if (p) p.reach = 3; },   // (always out in the Haar, however it was reached)
  set: () => {},
  enter: () => { frEnterStage(); fkEnter(); },
  banner: () => ({ text: 'Lantern Rock', t: 4.5, sub: 'The Haar · the last light', col: '#c8d8e0' }),
  tick: dt => fkTick(dt),
  me: dt => fkMe(dt),
  pack: o => fkPack(o),
  apply: o => fkApply(o),
  q: (sid, k, a) => fkAsk(sid, k, a),
  kill: (d, how, by) => fkKill(d, how, by),
  hurt: (d, dmg, code, by) => fkHurt(d, dmg, code, by),
  consider: c => fkConsider(c),
  prompt: o => fkPrompt(o),
  use: o => fkUse(o),
  hud: (phone, mono, fell) => fkHud(phone, mono, fell),
  b3: grp => fk3dBuild(grp),
  f3: dt => fk3d(dt),
  exit: () => fkExit(),
});

const fkN = () => Math.max(1, (ZM.hum || []).length);
function fkLine(s) { fpsFeed(s); if (ZM.net === 'host' && typeof zmnEvent === 'function') zmnEvent('feed', s); }
const fkBoss = () => ZM.z.find(z => z.zn === FKW.cz && z.bt === 'fogkeeper') || null;

// everyone, once the rock's laid out
function fkEnter() {
  Object.assign(FKW, { on: true, st: 'intro', t: 0, wait: 5, cz: 0, p2: 0, beamOff: 0, wonT: 0,
    br: FK_BRAZ.map(() => ({ lit: 1, out: 0 })), brSeen: FK_BRAZ.map(() => 1), fogT: FKC.FOG_FIRST, fogI: -1, fogSeq: 0, fogSeen: 0,
    fl: { t: 0, cd: 0, seq: 0, drift: 0 }, flSeen: 0, trickT: 3, litAgo: 9, dark: 0, darkWhy: '', hintT: 12, useT: 0, useI: -1, pend: 0,
    kb: [0, 0], lit: 0, litK: 0, mile: 0, dawn: 0, tink: 0 });
  ZM.open = new Set(['raid', 'isle']);
  ZM.round = Math.max(ZM.round, FKC.ROUND); ZB.round = ZM.round; ZB.plan = [];
  FPS.me.h = 0;
  fpsFeed('Lantern Rock. The braziers round the dead light are burning. Whatever has been putting the lights out is here.');
}
function fkExit() { FKW.on = false; FK3.on = false; }

// ---------- the light on him ----------
// the Light's beam over the rock now? (the Light is far to the south: the whole rock at once)
const fkBeamOn = () => !FKW.beamOff && gwInBeam(bearingOf(0, -FKC.LY), FKC.BEAM_W);
function fkBeamIn() { const w = 2 * Math.PI / GW.PERIOD, d = ((bearingOf(0, -FKC.LY) - FKC.BEAM_W - gwBeam()) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI); return d / w; }
const fkFlareOn = () => FKW.fl && FKW.fl.t > 0 && FKW.fl.t <= FKC.FLARE;
const fkLitN = () => FKW.br ? FKW.br.filter(b => b.lit).length : 0;
// do the braziers' rings count now? (from half strength, only while two of them burn)
const fkRingsOn = () => !FKW.p2 || fkLitN() >= 2;
// the brazier whose ring a place is in (-1: none), lit or not
function fkRingAt(x, y) { for (let i = 0; i < FK_BRAZ.length; i++) if (Math.hypot(x - FPSC.CX - FK_BRAZ[i][0], y - FPSC.CY - FK_BRAZ[i][1]) < FKC.RING) return i; return -1; }
// is a place lit (a burning brazier's ring that counts, the flare, the beam)?
function fkLitAt(x, y) {
  if (fkBeamOn() || fkFlareOn()) return true;
  if (!fkRingsOn()) return false;
  for (let i = 0; i < FK_BRAZ.length; i++) if (FKW.br[i].lit && Math.hypot(x - FPSC.CX - FK_BRAZ[i][0], y - FPSC.CY - FK_BRAZ[i][1]) < FKC.RING) return true;
  return false;
}
function fkLit() { const M = fkBoss(); return !!(M && !M.dead && fkLitAt(M.x, M.y)); }
// what lights him now, for the screen: 'beam', 'flare', 'ring', or ''
function fkLitBy() { const M = fkBoss(); if (!M) return ''; if (fkFlareOn()) return 'flare'; if (fkBeamOn()) return 'beam'; return fkLitAt(M.x, M.y) ? 'ring' : ''; }

// ---------- alone or hosting, each frame ----------
function fkTick(dt) {
  if (!FKW.on) return;
  FKW.t += dt;
  const n = fkN(), M = fkBoss(), f = FKW.fl;
  if (f.t > 0) f.t = Math.max(0, f.t - dt); if (f.cd > 0) f.cd = Math.max(0, f.cd - dt);
  FKW.litAgo = fkLit() ? 0 : FKW.litAgo + dt;
  if (FKW.st === 'intro') { FKW.wait -= dt; if (FKW.wait <= 0) fkRise(); return; }
  if (FKW.st === 'fight') {
    if (M && !M.dead) {
      // at half strength: up his tower
      if (!FKW.p2 && M.act !== 'rise' && M.hp <= M.max * FKC.P2) { FKW.p2 = 1; if (M.act) { M.act = null; M.at = 0; } zbStart(M, 'climb'); frBringBack(); }
      FKW.fogT -= dt;
      // he keeps to the rock
      const [lx, ly] = fkL(M), d = Math.hypot(lx, ly); if (d > FKC.R - 4 && M.act !== 'climb') { M.x = FPSC.CX + lx / d * (FKC.R - 4); M.y = FPSC.CY + ly / d * (FKC.R - 4); }
    }
    // the drowned, up out of the fog at the rock's edge
    const alive = ZM.z.filter(z => !z.dead && !z.boss).length, cap = FKC.ALIVE + FKC.ALIVE_MORE * (n - 1) + (FKW.p2 ? 2 : 0);
    FKW.trickT -= dt;
    if (FKW.trickT <= 0) { FKW.trickT = (FKC.TRICKLE[0] + Math.random() * (FKC.TRICKLE[1] - FKC.TRICKLE[0])) / (FKW.p2 ? 1.3 : 1) / (1 + 0.3 * (n - 1)); if (alive < cap && M && M.act !== 'rise') fkSpawn(); }
  } else if (FKW.st === 'won') {
    FKW.wonT -= dt;
    if (FKW.wonT <= 0) { FKW.wonT = 99; frWin(); }
  }
}
// hosting or alone: one of the drowned, up out of the fog at the rock's edge, away from all of you
function fkSpawn() {
  const P = ZM.players || [], n = fkN();
  for (let t = 0; t < 20; t++) {
    const a = Math.random() * 6.283, d = FKC.R - 3 - Math.random() * 4, x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (P.some(p => Math.hypot(p.x - x, p.y - y) < 10)) continue;
    if (zmBlockedAt(x, y, 0.5, 0)) continue;
    const u = Math.random(), kind = u < (FKW.p2 ? 0.35 : 0.22) ? 'run' : u < 0.8 ? 'jog' : 'walk';
    const z = raidSpawnAt(x, y, { kind, hp: zmHp(RAIDC.ROUND + 8) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)) });
    if (z) fpsPuff(x, y, FPSC.GROUND + 0.6, '170,185,195', 6);
    return z;
  }
  return null;
}
// the Fog-Keeper comes up out of the rock at the foot of his tower
function fkRise() {
  const kind = 'fogkeeper', T = ZBT[kind], n = fkN();
  const hp = zmHp(FKC.ROUND) * FKC.HP * ZBC.BOOST * (1 + ZBC.HP_MORE * (n - 1)) * zbRaidK();
  const zn = ++ZM.zc, wx = FPSC.CX + FK_RISE[0], wy = FPSC.CY + FK_RISE[1];
  const z = { drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x: wx, y: wy, jz: -4.6, fl: 0, hp, max: hp, sp: T.sp(),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: Math.PI, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 2, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy };
  T.init(z); zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z; ZB.seen.add(zn);
  FKW.cz = zn; FKW.st = 'fight';
  zbStart(z, 'rise'); zbArrive(z);
}
// hosting or alone: one of them sent back (him: the dead light comes on)
function fkKill(d, how, by) {
  if (!FKW.on || !d.boss || d.bt !== 'fogkeeper' || FKW.st !== 'fight') return;
  FKW.st = 'won'; FKW.wonT = FKC.WON;
  fkLine('The Fog-Keeper goes down on the rock at the foot of his tower, and the fog goes out of him. Above you, the dead light comes on.');
  for (const z of ZM.z) if (!z.dead && !z.boss) zmKill(z, false, '', 'flash');
  for (const b of FKW.br) b.lit = 1;
  FR.lit = (FR.lit | 0) + 1;   // (the last light, lit: it counts as an island lit)
  frBringBack();
}
// how much a hit on him does (the shooter's side, and the host's for a joined player's): nothing in the dark
function fkHurt(d, dmg, code, by) {
  if (!FKW.on || !d || d.bt !== 'fogkeeper') return dmg;
  const mine = !by || by === FPS.me.id;
  const lit = fkLitAt(d.x, d.y) || (!mine && FKW.litAgo < FKC.LIT_GRACE);
  if (!lit || d.act === 'rise' || d.act === 'climb') { if (mine) fkDarkHit(d, !lit ? 'dark' : d.act); return 0; }
  if (mine) raidBossDamage(dmg * (ZM_DMG[code] == null ? 1 : ZM_DMG[code]));
  return dmg;
}
// my shot on him in the dark: sparks off the lamp-glass, and the word that he's in the dark
function fkDarkHit(d, why) {
  const m = FPS.me, dx = m.x - d.x, dy = m.y - d.y, l = Math.hypot(dx, dy) || 1, r = FKC.RAD * 0.9, z0 = FPSC.GROUND + (d.jz || 0) + 1.8 + Math.random() * 1.8;
  const x = d.x + dx / l * r, y = d.y + dy / l * r;
  for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283, s = 0.25 + Math.random() * 0.35; ZM.sparks.push({ a: [x, y, z0], b: [x + Math.cos(a) * s, y + Math.sin(a) * s, z0 + (Math.random() - 0.3) * s], t: 0.22, col: '190,210,230' }); }
  fpsPuff(x, y, z0, '170,185,200', 3);
  FKW.dark = 1.4; FKW.darkWhy = why; d.ward = 0.35;
  if (!(FKW.tink > 0)) { FKW.tink = 0.12; try { if (!soundOff()) { tone(2200 + Math.random() * 600, 'triangle', 0.002, 0.05, 0.12); tone(3100, 'sine', 0.002, 0.025, 0.08, { delay: 0.02 }); } } catch (e) {} }
}

// ---------- the braziers and the flare ----------
function fkAsk(sid, k, a) {
  if (!FKW.on || FKW.st === 'won') return;
  if (k === 'light') { const i = clamp(a | 0, 0, FK_BRAZ.length - 1), b = FKW.br[i]; if (!b.lit) { b.lit = 1; fkLine(`${friNick(sid)} lit the ${FK_NAME[i]} brazier again.`); } }
  if (k === 'fl') { const f = FKW.fl; if (f.cd > 0) return; f.t = FKC.FLARE + FKC.FLARE_UP; f.cd = FKW.p2 ? FKC.RELOAD2 : FKC.RELOAD; f.seq = (f.seq + 1) % 1000; f.drift = Math.random() * 6.283; fkLine(`${friNick(sid)} fired a flare over the rock.`); }
}
// (hosting or alone) his fog puts out brazier i
function fkDouse(i) {
  const b = FKW.br[i]; if (!b || !b.lit) return;
  b.lit = 0; b.out = (b.out + 1) % 1000;
  fkLine(`His fog rolls over the ${FK_NAME[i]} brazier and puts it out. Light it again (hold Use at it).`);
}
function fkConsider(c) {
  if (!FKW.on) return;
  FK_BRAZ.forEach(([x, y], i) => { if (!FKW.br[i].lit) c({ k: 'fkbr', i }, FPSC.CX + x, FPSC.CY + y, 0, 2.6, false); });
  c({ k: 'fkfl' }, FPSC.CX + FK_FLARE[0], FPSC.CY + FK_FLARE[1], 0, 1.9, true);
}
function fkPrompt(o) {
  if (o.k === 'fkbr') return { text: `Hold to light the ${FK_NAME[o.i]} brazier again`, hold: true };
  if (o.k === 'fkfl') { const f = FKW.fl; if (fkFlareOn() || f.t > FKC.FLARE) return { text: 'The flare: burning' }; return f.cd > 0 ? { text: `The flare stand: reloading (${Math.ceil(f.cd)} s)` } : { text: `Fire a flare (lights him, wherever he is, for ${FKC.FLARE} seconds)`, free: true }; }
  return null;
}
function fkUse(o) {
  if (o.k === 'fkbr') return true;
  if (o.k === 'fkfl') { if (FKW.fl.cd > 0) { zmSound('no'); return true; } if (typeof rmvAdd === 'function') rmvAdd('fl'); raidAsk('fl', 0); return true; }
  return false;
}

// ---------- everyone, each frame ----------
function fkMe(dt) {
  if (!FKW.on) return;
  const m = FPS.me, cl = ZM.net === 'client', alive = !(m.dead > 0) && !zmIsDown() && !ZM.over;
  if (cl) { const f = FKW.fl; if (f.t > 0) f.t = Math.max(0, f.t - dt); if (f.cd > 0) f.cd = Math.max(0, f.cd - dt); }
  for (const k of ['dark', 'tink', 'hintT', 'pend']) if (FKW[k] > 0) FKW[k] -= dt;
  if (FKW.st === 'won') FKW.dawn = Math.min(1, FKW.dawn + dt / 3);
  // the flare going up; a brazier going out or catching again (seen and heard on every screen, by their counts)
  if (FKW.fl.seq !== FKW.flSeen) { if (FKW.flSeen || FKW.fl.seq) { fkSound('flare', Math.hypot(FPSC.CX + FK_FLARE[0] - m.x, FPSC.CY + FK_FLARE[1] - m.y)); fpsPuff(FPSC.CX + FK_FLARE[0], FPSC.CY + FK_FLARE[1], FPSC.GROUND + 1.4, '255,190,170', 8); } FKW.flSeen = FKW.fl.seq; }
  FKW.br.forEach((b, i) => { if (b.lit !== FKW.brSeen[i]) { const [x, y] = FK_BRAZ[i], d = Math.hypot(FPSC.CX + x - m.x, FPSC.CY + y - m.y); fkSound(b.lit ? 'catch' : 'douse', d); if (!b.lit) fpsPuff(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + 2, '150,160,170', 14); FKW.brSeen[i] = b.lit; } });
  const lit = fkLit(); if (lit && !FKW.lit && FKW.st === 'fight') fkSound('lit', 0); FKW.lit = lit;
  FKW.litK += ((lit ? 1 : 0) - FKW.litK) * Math.min(1, dt * 8);
  // up on your feet when he falls
  if (FKW.st === 'won' && zmIsDown()) zmGetUp();
  // knocked flying by his lantern: carried off, slowing
  if (Math.hypot(FKW.kb[0], FKW.kb[1]) > 0.1) { zmMove(m, FKW.kb[0] * dt, FKW.kb[1] * dt); const k = Math.exp(-dt * 3.2); FKW.kb[0] *= k; FKW.kb[1] *= k; } else FKW.kb = [0, 0];
  // holding Use at a dark brazier lights it
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
  if (hold && o && o.k === 'fkbr' && alive && !(FKW.pend > 0) && !FKW.br[o.i].lit) {
    if (FKW.useI !== o.i) { FKW.useI = o.i; FKW.useT = 0; }
    FKW.useT += dt;
    if (FKW.useT >= FKC.USE) { FKW.useT = 0; FKW.pend = 1.2; if (typeof rmvAdd === 'function') rmvAdd('bl'); raidAsk('light', o.i); }
  } else { FKW.useT = 0; FKW.useI = -1; }
}

// ---------- together ----------
// (hosting) fk: [state, phase 2, the beam put out, his number, the fog's target, its count, the braziers lit (bits),
// each brazier's count of times put out, the flare (tenths), its reload (tenths), its count, drift (hundredths), the
// fog's clock (tenths)]
function fkPack(o) {
  if (!FKW.on) return;
  const r10 = v => Math.round(v * 10), f = FKW.fl;
  let bits = 0; FKW.br.forEach((b, i) => { if (b.lit) bits |= 1 << i; });
  o.fk = [FK_ST.indexOf(FKW.st), FKW.p2 ? 1 : 0, FKW.beamOff ? 1 : 0, FKW.cz | 0, FKW.fogI, FKW.fogSeq, bits, ...FKW.br.map(b => b.out), r10(f.t), r10(f.cd), f.seq, Math.round(f.drift * 100), r10(Math.max(0, FKW.fogT))];
}
function fkApply(o) {
  if (!FKW.on || !o || !Array.isArray(o.fk)) return;
  const a = o.fk.map(v => +v || 0), nb = FK_BRAZ.length;
  FKW.st = FK_ST[a[0] | 0] || 'intro'; FKW.p2 = a[1] ? 1 : 0; FKW.beamOff = a[2] ? 1 : 0; FKW.cz = a[3] | 0; FKW.fogI = a[4] | 0; FKW.fogSeq = a[5] | 0;
  FKW.br.forEach((b, i) => { b.lit = (a[6] >> i) & 1; b.out = a[7 + i] | 0; });
  const f = FKW.fl, k = 7 + nb; f.t = a[k] / 10; f.cd = a[k + 1] / 10; f.seq = a[k + 2] | 0; f.drift = a[k + 3] / 100; FKW.fogT = a[k + 4] / 10;
  if (FKW.cz) ZB.seen.add(FKW.cz);
}

// =====================================================================================================================
// the Fog-Keeper: a boss of his own, on src/zmboss.js's framework
// =====================================================================================================================
// rise: up out of the rock at the foot of his tower; swing: the lantern on its chain, round in a wide arc; breathe: a
// breath drawn and a bank of fog breathed out at a brazier, which puts it out; climb: up his tower at half strength,
// the Light's beam put out from the top, and down again (nothing touches him meanwhile)
const FK_ACT = { rise: { hit: 99, end: 3.8 }, swing: { hit: 1.2, end: 1.9 }, breathe: { hit: 1.7, end: 2.8 }, climb: { hit: 6.6, end: 9.2 }, smash: { hit: 0.8, end: 1.3 } };
ZB_KINDS.push('fogkeeper');
for (const a of Object.keys(FK_ACT)) if (!ZB_ACT.includes(a)) ZB_ACT.push(a);
const fkHalf = () => Math.max(1, Math.ceil((ZM.perks && ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP) / 2));
// (is a place in his swing's arc, from where he stands, as he faces)
function fkInArc(z, x, y) { const d = Math.hypot(x - z.x, y - z.y); return d < FKC.SWING_R && Math.abs(angDiff(bearingOf(x - z.x, y - z.y), z.h)) < FKC.SWING_ARC; }
// (the climb: where he goes up the tower's side, and where he comes down, by the side he came to it from)
function fkClimbAt(z) { const tx = FPSC.CX + FKC.TOWER[0], ty = FPSC.CY + FKC.TOWER[1], a = Math.atan2(z.y - ty, z.x - tx), r = FKC.TR + 0.8; return { a, x0: z.x, y0: z.y, ex: tx + Math.cos(a) * r, ey: ty + Math.sin(a) * r, dx: tx + Math.cos(a) * (r + 3.5), dy: ty + Math.sin(a) * (r + 3.5), tx, ty }; }
ZBT.fogkeeper = {
  n: 'the Fog-Keeper', N: 'The Fog-Keeper', sub: 'keeper of the dead light, who puts the others out', col: '#c8d4dc', warn: '200,170,255', big: 'swing', puff: '170,180,190',
  get bar() { return FKW.lit ? ['#8a4a14', '#ffd27a'] : ['#2a3440', '#8a9aa8']; },
  hp: FKC.HP, pts: FKC.PTS, rad: FKC.RAD, tall: FKC.TALL, headZ: FKC.HEADZ, pad: FKC.PAD, crowd: 1.4, near: 2.8, through: 1.6, scale: 1.6,
  sp: () => FKC.SP * (FKW.p2 ? 1.12 : 1),
  win: () => false,
  acts: FK_ACT,
  noFlash: () => !fkLit(),
  arriveLine: () => 'Up out of the rock at the foot of the dead light: the Fog-Keeper. Only light hurts him: a lit brazier’s ring, a flare, or the Light’s beam as it sweeps over.',
  smashLine: () => '',
  killLine: (who, pts) => `${who} put down the Fog-Keeper (+${pts}).`,
  init(z) { z.swCd = 2; },
  cool() {},
  think(z, p, d, dz, level) {
    if (ZM.net !== 'client' && FKW.fogT <= 0) { if (fkLitN()) return 'breathe'; FKW.fogT = 3; }
    if (level && d < FKC.SWING_R - 1.2 && z.swCd <= 0) return 'swing';
    return null;
  },
  start(z, act) {
    if (act === 'swing') z.swCd = (2.2 + Math.random() * 1.2) * (FKW.p2 ? 0.8 : 1);
    if (act === 'breathe') {
      FKW.fogT = FKW.p2 ? FKC.FOG2 : FKC.FOG;
      // (at the lit brazier nearest him; the host's choice, sent in the stage's word)
      let best = -1, bd = 1e9; FK_BRAZ.forEach(([x, y], i) => { if (!FKW.br[i].lit) return; const d = Math.hypot(FPSC.CX + x - z.x, FPSC.CY + y - z.y); if (d < bd) { bd = d; best = i; } });
      if (ZM.net !== 'client') { FKW.fogI = best; FKW.fogSeq = (FKW.fogSeq + 1) % 1000; }
      z.swCd = Math.max(z.swCd, 1);
    }
    if (act === 'climb') z.climb = fkClimbAt(z);
  },
  during(z, dt, nearest) {
    const T = FK_ACT[z.act];
    if (z.act === 'rise') {
      const e = zbE(Math.min(1, z.at / T.end));
      z.jz = -4.6 * (1 - e); z.fl = 0; z.h = 0;
      if (z.at + dt >= T.end) { z.jz = z.fl = 0; z.lx = z.x; z.ly = z.y; }
      return;
    }
    if (z.act === 'climb') {
      // (to the tower's foot, up its side, a moment at the top, and the drop back down outside it)
      const C = z.climb || (z.climb = fkClimbAt(z)), t = z.at;
      if (t < 2) { const k = zbE(t / 2); z.x = zbL(C.x0, C.ex, k); z.y = zbL(C.y0, C.ey, k); z.jz = 0; z.h = bearingOf(C.tx - z.x, C.ty - z.y); }
      else if (t < 5.4) { const k = zbE((t - 2) / 3.4); z.x = C.ex; z.y = C.ey; z.jz = FKC.TOP * k; z.h = bearingOf(C.tx - C.ex, C.ty - C.ey); }
      else if (t < 7.8) { const k = zbE(Math.min(1, (t - 5.4) / 0.8)); z.x = zbL(C.ex, C.tx + Math.cos(C.a) * 1.2, k); z.y = zbL(C.ey, C.ty + Math.sin(C.a) * 1.2, k); z.jz = FKC.TOP; z.h = Math.PI; }   // (facing the Light, far to the south)
      else { const k = Math.min(1, (t - 7.8) / 1.0); z.x = zbL(C.tx + Math.cos(C.a) * 1.2, C.dx, k); z.y = zbL(C.ty + Math.sin(C.a) * 1.2, C.dy, k); z.jz = FKC.TOP * (1 - k * k) + Math.sin(k * Math.PI) * 1.2; z.h = bearingOf(Math.cos(C.a), Math.sin(C.a)); }
      z.fl = z.jz;
      return;
    }
    if (z.act === 'breathe') {
      // (turned to face the brazier he breathes at)
      const i = FKW.fogI; if (i >= 0 && FK_BRAZ[i]) { const [x, y] = FK_BRAZ[i]; z.h += angDiff(bearingOf(FPSC.CX + x - z.x, FPSC.CY + y - z.y), z.h) * Math.min(1, dt * 3); }
      return;
    }
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
        const a = bearingOf(m.x - z.x, m.y - z.y); FKW.kb = [Math.sin(a) * FKC.SWING_KB, Math.cos(a) * FKC.SWING_KB]; m.vz = Math.max(m.vz || 0, 4.6);
        fpsFeed('His lantern catches you and throws you across the rock.');
      }
      return;
    }
    if (z.act === 'breathe') {
      fkSound('breathe', dm);
      if (ZM.net !== 'client' && FKW.fogI >= 0) fkDouse(FKW.fogI);
      return;
    }
    if (z.act === 'climb') {
      // (at the top: the Light's beam put out)
      FKW.beamOff = 1; fkSound('dark', 0);
      ZM.banner = { text: 'The Light goes out', t: 4, col: '#9ab0c8', sub: 'from now on only the braziers and the flare light him, and a ring only counts while two braziers burn' };
      if (ZM.net !== 'client') fkLine('From the top of his tower the Fog-Keeper lifts his cold lantern, and out at sea the Light’s beam goes dark. Keep two braziers burning.');
    }
  },
  after(z, a) {
    if (a === 'rise') { z.st = 'in'; z.jz = z.fl = 0; zmSettle(z); }
    if (a === 'climb') { z.jz = z.fl = 0; z.climb = null; zmSettle(z); FKW.beamOff = 1; }
  },
  // (nothing while he rises or climbs; the light's say is the stage's: fkHurt)
  hurtK: (z, how) => z.act === 'rise' || z.act === 'climb' ? 0 : how === 'burn' ? 0.5 : 1,
  endOf: (z, act) => FK_ACT[act] ? FK_ACT[act].end : 0,
  actSound(z, act) {
    const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y);
    if (act === 'rise') { fkSound('rise', d); for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, r = Math.random() * 2.4; fpsPuff(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, FPSC.GROUND + Math.random() * 3, '160,170,180', 3); } }
    else if (act === 'swing') fkSound('draw', d);
    else if (act === 'breathe') fkSound('inhale', d);
    else if (act === 'climb') { fkSound('climb', d); ZM.banner = { text: 'He climbs his tower', t: 3, small: true, col: '#c8d4dc' }; }
  },
  sound: (k, d) => fkSound(k, d),
  build: () => fkBuild(),
  reset(z, M) { M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1); M.root.visible = true; },
  pose: (z, M, dt) => fkPose(z, M, dt),
};
// his sounds and the rock's: the recordings (src/sfxbank.js) where there's one, else the synth (src/audio.js)
function fkSound(k, d) {
  const v = clamp(1 - (d || 0) / 60, 0.15, 1), play = (n, vol, o) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, Object.assign({ vol: vol * v, vary: 0.05 }, o || {})); } catch (e) { return false; } };
  const syn = f => { try { if (!soundOff() && AUD.ctx) f(); } catch (e) {} };
  if (k === 'arrive' || k === 'rise') { play('creak', 0.8); play('bossdiver', 0.7); syn(() => { tone(50, 'sawtooth', 0.5, 0.06, 2.6, { to: 38 }); noise('lowpass', 400, 1, 0.6, 0.08, 2.4); }); return; }
  if (k === 'draw') { syn(() => { noise('lowpass', 600, 1, 0.25, 0.05, 0.9); tone(140, 'triangle', 0.1, 0.03, 0.9, { to: 90 }); }); return; }
  if (k === 'swing') { play('swish', 1); syn(() => tone(90, 'square', 0.01, 0.04, 0.3, { to: 50 })); return; }
  if (k === 'inhale') { syn(() => noise('bandpass', 700, 1, 1.2, 0.08, 1.6)); return; }
  if (k === 'breathe') { play('foghorn', 0.9, { vary: 0.03 }); syn(() => noise('lowpass', 350, 1, 0.1, 0.12, 2.2)); return; }
  if (k === 'douse') { syn(() => { noise('highpass', 2400, 1, 0.01, 0.1, 0.9); tone(220, 'sine', 0.01, 0.03, 0.4, { to: 120 }); }); return; }
  if (k === 'catch') { try { if (!soundOff() && typeof sfxFlare === 'function') sfxFlare(); } catch (e) {} return; }
  if (k === 'climb') { play('creak', 0.9); syn(() => noise('lowpass', 500, 1, 1.0, 0.06, 3)); return; }
  if (k === 'dark') { syn(() => { tone(62, 'sawtooth', 0.2, 0.08, 3.2, { to: 40 }); tone(93, 'sine', 0.2, 0.05, 3, { to: 60 }); }); return; }
  if (k === 'die') { play('thunder', 0.6); syn(() => tone(48, 'sawtooth', 0.1, 0.08, 3, { to: 30 })); return; }
  if (k === 'dawn') { try { if (!soundOff() && typeof sfxBell === 'function') sfxBell(); } catch (e) {} syn(() => { for (const [f, dl] of [[392, 0], [494, 0.25], [587, 0.5], [784, 0.75]]) tone(f, 'sine', 0.02, 0.05, 2.4, { delay: dl }); }); return; }
  if (k === 'flare') { play('flaregun', 1); return; }
  if (k === 'lit') { syn(() => tone(880, 'sine', 0.01, 0.025, 0.5)); return; }
  if (k === 'smash') return;
}

// ---------- his model ----------
// More than twice the height of one of you: sea boots, oilskin trousers, and a keeper's long oilskin coat gone black
// and green with the sea, its skirts torn and hung with weed, a sou'wester's flap at his collar. Where his head should
// be, a lamp-glass: a tall glass drum in a brass frame gone green (the astragals), a domed cap with its vent ball,
// grey fog churning inside it and two cold points of light. Fog pours up and out of it all the while. In his right
// fist a chain, and on it a cold lantern burning a pale blue-white; when he winds it back to swing, it goes dark (a
// black glow round it). His left hand is bare bone and sinew.
const FKG = {};
function fkGeo() {
  if (FKG.ok) return FKG;
  const Q = FKG;
  Q.skirt = new THREE.CylinderGeometry(0.21, 0.36, 0.82, 28, 6, true); Q.skirt.translate(0, -0.41, 0);
  { const P = Q.skirt.attributes.position, rnd = seeded(0xf06c); for (let i = 0; i < P.count; i++) { const y = P.getY(i), a = Math.atan2(P.getX(i), P.getZ(i)), dd = -y / 0.82, k = 1 + 0.08 * dd * Math.sin(a * 6) + 0.05 * dd * Math.sin(a * 11 + 2); P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k * 0.85); if (y < -0.75) P.setY(i, y + rnd() * 0.16); } Q.skirt.computeVertexNormals(); }
  Q.chest = new THREE.CylinderGeometry(0.25, 0.19, 0.56, 16); Q.chest.translate(0, 0.28, 0);
  Q.collar = new THREE.CylinderGeometry(0.13, 0.2, 0.16, 16, 1, true);
  Q.glass = new THREE.CylinderGeometry(0.1, 0.1, 0.22, 16, 1, true);
  Q.band = new THREE.TorusGeometry(0.104, 0.012, 5, 18);
  Q.bar = new THREE.BoxGeometry(0.012, 0.22, 0.012);
  Q.dome = new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  Q.ball = new THREE.SphereGeometry(0.03, 8, 6);
  Q.eye = new THREE.SphereGeometry(0.014, 6, 5);
  Q.up = new THREE.CylinderGeometry(0.064, 0.056, 0.32, 10); Q.up.translate(0, -0.16, 0);
  Q.fore = new THREE.CylinderGeometry(0.056, 0.046, 0.3, 10); Q.fore.translate(0, -0.15, 0);
  Q.bone = new THREE.CylinderGeometry(0.018, 0.014, 0.3, 6); Q.bone.translate(0, -0.15, 0);
  Q.hand = new THREE.SphereGeometry(0.045, 8, 6); Q.hand.scale(0.9, 1.2, 0.8);
  Q.finger = new THREE.CylinderGeometry(0.008, 0.005, 0.09, 4); Q.finger.translate(0, -0.045, 0);
  Q.thigh = new THREE.CylinderGeometry(0.065, 0.055, 0.42, 8); Q.thigh.translate(0, -0.21, 0);
  Q.shin = new THREE.CylinderGeometry(0.062, 0.054, 0.44, 8); Q.shin.translate(0, -0.22, 0);
  Q.foot = new THREE.BoxGeometry(0.11, 0.07, 0.21);
  Q.link = new THREE.TorusGeometry(0.018, 0.005, 4, 8);
  Q.lbox = new THREE.BoxGeometry(0.13, 0.17, 0.13);
  Q.lcap = new THREE.ConeGeometry(0.1, 0.07, 4); Q.lcap.rotateY(Math.PI / 4);
  Q.lring = new THREE.TorusGeometry(0.03, 0.006, 4, 10);
  Q.weed = new THREE.BoxGeometry(0.018, 0.3, 0.006); Q.weed.translate(0, -0.15, 0);
  Q.cold = z3Soft('rgba(200,225,255,0.9)', 'rgba(160,200,255,0)');
  Q.fog = z3Soft('rgba(190,200,210,0.75)', 'rgba(170,180,190,0)');
  Q.gold = z3Soft('rgba(255,220,140,0.9)', 'rgba(255,190,90,0)');
  Q.black = z3Soft('rgba(0,0,0,0.95)', 'rgba(0,0,0,0)');
  Q.ok = true;
  return Q;
}
function fkBuild() {
  const Q = fkGeo(), root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(FKC.S);
  const oil = new THREE.MeshPhongMaterial({ color: 0x1e2620, specular: 0x6a7a68, shininess: 70, side: THREE.DoubleSide });
  const oil2 = new THREE.MeshPhongMaterial({ color: 0x2a3026, specular: 0x5a6a58, shininess: 55, side: THREE.DoubleSide });
  const boot = new THREE.MeshPhongMaterial({ color: 0x0c0d0e, specular: 0x404850, shininess: 70 });
  const verd = new THREE.MeshPhongMaterial({ color: 0x4a7a64, specular: 0x90b0a0, shininess: 40 });
  const glassM = new THREE.MeshPhongMaterial({ color: 0x9ab0b8, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const boneM = new THREE.MeshPhongMaterial({ color: 0x8a8670, specular: 0x404030, shininess: 20 });
  const iron = new THREE.MeshPhongMaterial({ color: 0x2a2826, specular: 0x605a50, shininess: 50 });
  const weedM = new THREE.MeshLambertMaterial({ color: 0x1a3a26, emissive: 0x031208, side: THREE.DoubleSide });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xd8ecff });
  const lampM = new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.9 });
  const mesh = (geo, mat, x, y, z, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); parent.add(o); return o; };
  const weed = (parent, x, y, z, n, s) => { for (let i = 0; i < n; i++) { const w = mesh(Q.weed, weedM, x + (Math.random() - 0.5) * 0.08, y, z + (Math.random() - 0.5) * 0.05, parent); w.scale.y = (0.5 + Math.random() * 0.8) * (s || 1); w.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4); } };
  const sprite = (map, op, blend) => new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: blend === false ? THREE.NormalBlending : THREE.AdditiveBlending, fog: false, opacity: op == null ? 1 : op }));
  const hips = new THREE.Group(); hips.position.y = 0.92; body.add(hips);
  const legs = [-1, 1].map(s => {
    const th = new THREE.Group(); th.position.set(s * 0.09, 0, 0); hips.add(th);
    mesh(Q.thigh, oil2, 0, 0, 0, th);
    const kn = new THREE.Group(); kn.position.y = -0.42; th.add(kn);
    mesh(Q.shin, boot, 0, 0, 0, kn).scale.set(1.12, 1, 1.12);
    mesh(Q.foot, boot, 0, -0.45, -0.04, kn);
    return { th, kn };
  });
  const skirt = mesh(Q.skirt, oil, 0, 0.14, 0, hips);
  weed(skirt, 0.2, -0.6, 0.05, 3, 1.3); weed(skirt, -0.22, -0.55, -0.06, 3, 1.1); weed(skirt, 0.02, -0.62, 0.22, 2);
  const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso);
  mesh(Q.chest, oil, 0, 0, 0, torso).scale.set(1.08, 1, 0.76);
  for (let i = 0; i < 4; i++) mesh(Q.ball, verd, 0, 0.1 + i * 0.11, -0.17, torso).scale.setScalar(0.45);
  mesh(Q.collar, oil2, 0, 0.6, 0.0, torso).scale.set(1.1, 1, 0.9);
  for (let i = 0; i < 6; i++) mesh(Q.ball, verd, 0.15 + Math.random() * 0.08, 0.5, (Math.random() - 0.5) * 0.14, torso).scale.setScalar(0.4 + Math.random() * 0.3);
  weed(torso, -0.2, 0.48, 0.06, 3);
  // the lamp-glass head
  const head = new THREE.Group(); head.position.set(0, 0.76, 0); torso.add(head);
  mesh(Q.glass, glassM, 0, 0, 0, head);
  for (const y of [-0.11, 0.11]) mesh(Q.band, verd, 0, y, 0, head).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(Q.bar, verd, Math.cos(a) * 0.102, 0, Math.sin(a) * 0.102, head); }
  mesh(Q.dome, verd, 0, 0.11, 0, head); mesh(Q.ball, verd, 0, 0.23, 0, head);
  const inner = sprite(Q.fog, 0.85, false); inner.scale.set(0.2, 0.22, 1); head.add(inner);
  const eyes = [-1, 1].map(s => mesh(Q.eye, eyeM, s * 0.035, 0.01, -0.06, head));
  const eyeGlow = sprite(Q.cold, 0.9); eyeGlow.position.set(0, 0.01, -0.08); eyeGlow.scale.setScalar(0.18); head.add(eyeGlow);
  // arms: his right with the chain and the lantern, his left bare bone
  const arm = (s, bony) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.26, 0.52, 0); torso.add(sh);
    mesh(Q.up, oil, 0, 0, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.32; sh.add(el);
    if (bony) { mesh(Q.bone, boneM, -0.012, 0, 0, el); mesh(Q.bone, boneM, 0.012, 0, 0, el); } else mesh(Q.fore, oil, 0, 0, 0, el);
    const hd = new THREE.Group(); hd.position.y = -0.31; el.add(hd);
    if (bony) for (let i = 0; i < 4; i++) { const f = mesh(Q.finger, boneM, (i - 1.5) * 0.014, 0, -0.01, hd); f.rotation.x = -0.3 - i * 0.1; }
    else mesh(Q.hand, boneM, 0, 0, 0, hd);
    return { sh, el, hd };
  };
  const arms = [arm(1, false), arm(-1, true)];
  // the chain from his fist, and the lantern on it
  const chain = new THREE.Group(); arms[0].hd.add(chain);
  for (let i = 0; i < 9; i++) { const l = mesh(Q.link, iron, 0, -0.03 - i * 0.032, 0, chain); l.rotation.y = i % 2 ? Math.PI / 2 : 0; }
  const lan = new THREE.Group(); lan.position.y = -0.36; chain.add(lan);
  mesh(Q.lring, iron, 0, 0.02, 0, lan);
  mesh(Q.lcap, iron, 0, -0.03, 0, lan);
  mesh(Q.lbox, glassM, 0, -0.15, 0, lan);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(new THREE.BoxGeometry(0.012, 0.18, 0.012), iron, x * 0.065, -0.15, z * 0.065, lan);
  mesh(new THREE.BoxGeometry(0.15, 0.02, 0.15), iron, 0, -0.245, 0, lan);
  const flame = mesh(new THREE.SphereGeometry(0.035, 8, 6), lampM, 0, -0.15, 0, lan); flame.scale.y = 1.5;
  const lglow = sprite(Q.cold, 0.8); lglow.position.y = -0.15; lglow.scale.setScalar(0.6); lan.add(lglow);
  const lblack = sprite(Q.black, 0, false); lblack.position.y = -0.15; lblack.scale.setScalar(0.9); lan.add(lblack);
  // the glows: a grey haze about him in the dark, burnt gold in the light
  const haze = sprite(Q.fog, 0.3, false); haze.position.y = 1.1; haze.scale.set(1.8, 2.6, 1); body.add(haze);
  const gold = sprite(Q.gold, 0); gold.position.y = 1.0; gold.scale.set(1.9, 2.6, 1); body.add(gold);
  return { root, body, hips, torso, head, legs, skirt, arms, chain, lan, flame, lglow, lblack, lampM, eyes, eyeM, eyeGlow, inner, oil, oil2, haze, gold };
}
function fkPose(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, act = z.dead ? null : z.act, at = z.at || 0, sw = reduceMotion ? 0 : 1;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  const moving = z.walk && !act && !z.dead;
  const mv = z.mvK = (z.mvK || 0) + ((moving ? 1 : 0) - (z.mvK || 0)) * Math.min(1, dt * 6);
  z.ph = (z.ph || 0) + dt * (moving ? 4.2 : 1);
  const st = Math.sin(z.ph) * mv;
  M.legs[0].th.rotation.x = st * 0.45; M.legs[1].th.rotation.x = -st * 0.45;
  M.legs[0].kn.rotation.x = -Math.max(0, -Math.cos(z.ph)) * 0.6 * mv; M.legs[1].kn.rotation.x = -Math.max(0, Math.cos(z.ph)) * 0.6 * mv;
  M.body.position.y = Math.abs(Math.cos(z.ph)) * 0.025 * mv;
  M.hips.rotation.set(0, st * 0.08, 0);
  M.skirt.rotation.set(-0.06 * mv + Math.sin(t * 1.5) * 0.03 * sw, 0, st * 0.05);
  M.torso.rotation.set(0.06 + Math.sin(t * 0.7) * 0.02 * sw, -st * 0.1, 0);
  M.head.rotation.set(Math.sin(t * 0.5 + z.seed) * 0.05 * sw, Math.sin(t * 0.35) * 0.15 * sw, 0);
  // arms: [shoulder x (forward), shoulder z (out), elbow x (bend)]; the chain: [swing out, swing forward]
  let R = [0.25 - st * 0.2, 0.22, 0.5], L = [0.2 + st * 0.25, -0.18, 0.6], C = [Math.sin(t * 1.3) * 0.08 * sw + st * 0.15, 0], dark = 0;
  if (act === 'swing') {
    const T = FK_ACT.swing, k1 = zbE(Math.min(1, at / (T.hit - 0.15))), k2 = zbE(clamp((at - T.hit + 0.2) / 0.35, 0, 1)), k3 = zbE(clamp((at - T.hit - 0.15) / (T.end - T.hit - 0.15), 0, 1));
    // (wound back out to his right, the lantern swinging up behind him on its chain, then round in front of him)
    R = [zbL(zbL(zbL(0.25, 0.6, k1), 1.5, k2), 0.25, k3), zbL(zbL(zbL(0.22, 1.5, k1), 0.2, k2), 0.22, k3), 0.2];
    C = [zbL(zbL(zbL(0, 1.2, k1), 0.3, k2), 0, k3), zbL(zbL(-1.4 * k1, 1.6, k2), 0, k3)];
    M.torso.rotation.y += zbL(zbL(zbL(0, 0.8, k1), -0.7, k2), 0, k3);
    dark = at < T.hit + 0.1 ? Math.min(1, at / 0.35) : Math.max(0, 1 - (at - T.hit) / 0.3);
  } else if (act === 'breathe') {
    const T = FK_ACT.breathe, up = zbE(Math.min(1, at / T.hit)), out = at > T.hit ? zbE(Math.min(1, (at - T.hit) / 0.4)) * (1 - zbE(clamp((at - T.hit - 0.5) / (T.end - T.hit - 0.5), 0, 1))) : 0;
    M.torso.rotation.x = 0.06 - 0.3 * up * (1 - out) + 0.35 * out; M.head.rotation.x = -0.3 * up * (1 - out) + 0.25 * out;
    L = [zbL(0.2, 1.1, up), zbL(-0.18, -0.9, up), 0.4];
    // (fog pours out of the lamp-glass and rolls away towards the brazier)
    if (out > 0 && Math.random() < dt * 60 * out) { const hp = new THREE.Vector3(); M.head.getWorldPosition(hp); const i = FKW.fogI, tx = i >= 0 && FK_BRAZ[i] ? FPSC.CX + FK_BRAZ[i][0] : z.x + Math.sin(z.h) * 10, ty = i >= 0 && FK_BRAZ[i] ? FPSC.CY + FK_BRAZ[i][1] : z.y + Math.cos(z.h) * 10, l = Math.hypot(tx - hp.x, ty + hp.z) || 1, sp = 6 + Math.random() * 4; FPS.parts.push({ x: hp.x, y: -hp.z, z: hp.y, vx: (tx - hp.x) / l * sp + (Math.random() - 0.5) * 2, vy: (ty + hp.z) / l * sp + (Math.random() - 0.5) * 2, vz: -1.2 - Math.random(), t: 1.6, c: '175,185,195' }); }
  } else if (act === 'climb') {
    const c = at * 3.2, a = Math.sin(c), b = Math.sin(c + Math.PI), up = at > 2 && at < 5.4;
    if (up) { R = [2.5 + 0.5 * a, 0.25, 0.5 + 0.4 * a]; L = [2.5 + 0.5 * b, -0.25, 0.5 + 0.4 * b]; M.torso.rotation.x = -0.15; }
    else if (at >= 5.4 && at < 7.8) { const k = zbE(clamp((at - 6) / 0.6, 0, 1)); R = [zbL(0.3, 2.8, k), 0.3, 0.2]; C = [0, 0.2 * k]; M.head.rotation.x = -0.3 * k; }
  } else if (act === 'rise') { R = [0.1, 0.25, 0.3]; L = [0.1, -0.25, 0.3]; M.head.rotation.x = 0.4 * (1 - Math.min(1, at / 3)); }
  M.arms[0].sh.rotation.set(R[0], 0, R[1]); M.arms[0].el.rotation.set(R[2], 0, 0);
  M.arms[1].sh.rotation.set(L[0], 0, L[1]); M.arms[1].el.rotation.set(L[2], 0, 0);
  M.chain.rotation.set(C[1] - R[0] - R[2] + Math.min(0.1, R[0]), 0, C[0] - R[1]);
  // the lantern: cold and pale, black as he winds it back
  const lk = FKW.litK || 0, flash = z.hitT > 0 ? Math.min(1, z.hitT / 0.15) : 0, ward = z.ward > 0 ? z.ward / 0.35 : 0, pulse = 0.5 + 0.5 * Math.sin(t * (lk > 0.5 ? 9 : 2));
  if (z.ward > 0) z.ward -= dt;
  M.lglow.material.opacity = z.dead ? 0 : (0.75 + 0.15 * Math.sin(t * 11)) * (1 - dark);
  M.lblack.material.opacity = z.dead ? 0 : 0.9 * dark; M.lblack.scale.setScalar(0.9 + 1.4 * dark);
  M.lampM.color.setRGB(0.8 - 0.6 * dark, 0.9 - 0.7 * dark, 1 - 0.5 * dark);
  M.oil.emissive.setRGB(0.15 * lk * (0.8 + 0.2 * pulse) + flash * 0.3, 0.08 * lk + flash * 0.22 + ward * 0.06, 0.02 * lk + flash * 0.2 + ward * 0.12 + 0.01);
  M.oil2.emissive.copy(M.oil.emissive).multiplyScalar(0.8);
  M.haze.material.opacity = z.dead ? 0 : (1 - lk) * (0.22 + 0.08 * pulse) + ward * 0.3;
  M.gold.material.opacity = z.dead ? 0 : lk * (0.5 + 0.25 * pulse);
  M.eyeM.color.setRGB(0.8 + 0.2 * lk, 0.92, 1 - 0.3 * lk); M.eyeGlow.material.opacity = z.dead ? 0 : 0.9;
  M.inner.material.opacity = z.dead ? 0.2 : 0.7 + 0.2 * Math.sin(t * 2.3);
  // the fog pouring up out of his lamp-glass, all the while
  if (!z.dead && Math.random() < dt * 9) { const hp = new THREE.Vector3(); M.head.getWorldPosition(hp); FPS.parts.push({ x: hp.x + (Math.random() - 0.5) * 0.3, y: -hp.z + (Math.random() - 0.5) * 0.3, z: hp.y + 0.3, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, vz: 0.6 + Math.random() * 0.6, t: 1.2, c: '130,140,150' }); }
  if (z.dead) {
    // down: to his knees, and over, the glass going dark, and he goes to mist
    const k = Math.min(1, (z.deadT || 0) / 3.4), k1 = zbE(Math.min(1, k * 2)), k2 = zbE(clamp((k - 0.4) / 0.6, 0, 1));
    M.legs[0].th.rotation.x = M.legs[1].th.rotation.x = -1.3 * k1; M.legs[0].kn.rotation.x = M.legs[1].kn.rotation.x = 1.8 * k1;
    M.body.position.y = -0.4 * k1;
    M.root.rotation.set(-1.2 * k2, -z.h, 0, 'YXZ');
    if (Math.random() < dt * 30 && k < 1) fpsPuff(z.x + (Math.random() - 0.5) * 2, z.y + (Math.random() - 0.5) * 2, G0 + Math.random() * 3, '180,190,200', 2);
    M.root.visible = k < 1;
  }
}

// ---------- on top: what's to be done; the light on him; the braziers and the flare ----------
function fkHud(phone, mono, fell) {
  if (!FKW.on) return;
  const t = g.t, m = FPS.me, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 46), dy = phone ? 14 : 17;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const line = (s, y, c, f) => { ctx.font = f || mono(phone ? 10 : 12); ctx.fillStyle = c; ctx.fillText(s, L, y, W * 0.55); fpsHudNote(y + (f ? (phone ? 20 : 26) : dy)); };
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
  const M = fkBoss(), big = fell(phone ? 15 : 20);
  let y = top;
  if (FKW.st === 'intro') line('Something stirs at the foot of the dead light', y, 'rgba(200,212,224,0.9)', big);
  else if (FKW.st === 'fight' && M && !M.dead) {
    const by = fkLitBy();
    if (M.act === 'rise') line('The Fog-Keeper', y, 'rgba(210,222,232,0.95)', big);
    else if (M.act === 'climb') line('He climbs his tower: nothing touches him', y, 'rgba(170,190,210,0.95)', big);
    else if (by) line(by === 'flare' ? 'The flare lights him: shoot!' : by === 'beam' ? 'The Light’s beam is on him: shoot!' : 'He’s in a brazier’s light: shoot!', y, `rgba(255,214,120,${0.8 + 0.2 * Math.sin(t * 9)})`, big);
    else line('He’s in the dark: draw him into a brazier’s light', y, 'rgba(170,190,205,0.9)', big);
    y += phone ? 20 : 26;
    if (!FKW.beamOff) { line(fkBeamOn() ? 'The Light’s beam is crossing the rock' : `The Light’s beam comes round in ${fkBeamIn().toFixed(1)} s`, y, 'rgba(236,228,207,0.7)'); y += dy; }
    else { const n = fkLitN(); line(n >= 2 ? `The Light is out. ${n} braziers burning: their light holds` : `The Light is out. Only ${n} brazier${n === 1 ? '' : 's'} burning: light another, or he can’t be hurt in them`, y, n >= 2 ? 'rgba(170,200,220,0.85)' : `rgba(255,150,110,${0.75 + 0.25 * Math.sin(t * 6)})`); y += dy; }
    FK_BRAZ.forEach((_, i) => { const b = FKW.br[i], to = FKW.fogI === i && M.act === 'breathe'; line(`${b.lit ? '•' : '◦'} The ${FK_NAME[i]} brazier: ${b.lit ? (to ? 'his fog is coming for it' : 'burning') : 'out (hold Use to light it)'}`, y, !b.lit ? 'rgba(150,170,190,0.75)' : to ? `rgba(255,170,130,${0.75 + 0.25 * Math.sin(t * 8)})` : 'rgba(255,200,130,0.9)'); y += dy; });
    { const f = FKW.fl, s = fkFlareOn() ? `burning, ${Math.ceil(f.t)} s` : f.t > FKC.FLARE ? 'going up' : f.cd > 0 ? `reloading, ${Math.ceil(f.cd)} s` : 'ready'; line(`${f.cd > 0 ? '◦' : '•'} The flare stand, by the landing: ${s}`, y, f.cd > 0 ? 'rgba(236,228,207,0.45)' : 'rgba(255,170,150,0.9)'); y += dy; }
    if (M.act !== 'breathe' && FKW.fogT > 0 && FKW.fogT < 5 && fkLitN()) { line(`He draws breath for his fog in ${Math.ceil(FKW.fogT)} s`, y, 'rgba(200,210,220,0.75)'); y += dy; }
  } else if (FKW.st === 'won') line('The Fog-Keeper is down, and the dead light burns again.', y, 'rgba(255,214,140,0.95)', big);
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (FKW.dark > 0) {
    const a = Math.min(1, FKW.dark / 0.4);
    ctx.font = fell(phone ? 17 : 24); ctx.fillStyle = `rgba(190,210,230,${0.9 * a})`; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8;
    ctx.fillText(FKW.darkWhy === 'climb' ? 'Nothing touches him while he climbs' : FKW.darkWhy === 'rise' ? 'Not yet: he’s still rising' : 'He’s in the dark: your shots glance off', cx, H * 0.6, W * 0.9);
    ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = `rgba(236,228,207,${0.75 * a})`;
    if (FKW.darkWhy === 'dark') ctx.fillText(FKW.p2 && fkLitN() < 2 ? 'Light a second brazier: one alone isn’t enough now' : FKW.beamOff ? 'Fight him inside a lit brazier’s ring, or fire the flare' : 'Fight him inside a lit brazier’s ring, wait for the beam, or fire the flare', cx, H * 0.6 + (phone ? 18 : 24), W * 0.9);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
  if (M && !M.dead && M.act === 'swing' && (M.at || 0) < FK_ACT.swing.hit && fkInArc(M, m.x, m.y) && !(m.dead > 0)) {
    ctx.font = fell(phone ? 16 : 24); ctx.fillStyle = `rgba(210,190,255,${0.7 + 0.3 * Math.sin(t * 14)})`; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8;
    ctx.fillText('His lantern goes dark: get out of its swing', cx, H * (phone ? 0.42 : 0.4));
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
  // lighting a brazier: a ring round the sights filling
  if (FKW.useT > 0) {
    const k = Math.min(1, FKW.useT / FKC.USE);
    ctx.strokeStyle = 'rgba(255,192,112,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#ffc070'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
  }
  if (FKW.litK > 0.02 && FKW.st === 'fight') {
    const a = FKW.litK * 0.2, gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.45, cx, H / 2, Math.max(W, H) * 0.75);
    gr.addColorStop(0, 'rgba(255,200,100,0)'); gr.addColorStop(1, `rgba(255,200,100,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  if (FKW.hintT > 0 && FKW.st !== 'won') {
    ctx.font = fell(phone ? 15 : 20); ctx.fillStyle = `rgba(236,228,207,${Math.min(1, FKW.hintT) * 0.85})`; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
    ctx.fillText('Only light hurts him: a lit brazier’s ring, the flare, or the Light’s beam as it sweeps over. His fog puts the braziers out: light them again.', cx, H * 0.74, W * 0.92);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// =====================================================================================================================
// in 3D: the braziers' fires and their rings, the Light's beam sweeping over from the south, the flare, his swing's
// shadow on the rock, the dead light coming on at the end, and the fog
// =====================================================================================================================
const FK3 = { on: false };
function fk3dBuild(grp) {
  const CX = FPSC.CX, CY = FPSC.CY, G0 = FPSC.GROUND;
  const soft = z3Soft('rgba(255,210,150,0.95)', 'rgba(255,170,90,0)'), cold = z3Soft('rgba(220,235,255,0.95)', 'rgba(180,210,255,0)');
  const spr = (map, op) => new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: op == null ? 1 : op }));
  FK3.br = FK_BRAZ.map(([x, y]) => {
    const Z = G0 + fpsIsleH(FPS.g.isle, CX + x, CY + y) + 2.05;
    const fire = spr(soft); fire.position.copy(z3v(CX + x, CY + y, Z)); fire.scale.set(1.5, 2.1, 1); grp.add(fire);
    const halo = spr(soft, 0.35); halo.position.copy(fire.position); halo.scale.setScalar(8); grp.add(halo);
    const L = new THREE.PointLight(0xffa860, 0, FKC.RING * 2.4, 1.4); L.position.copy(z3v(CX + x, CY + y, Z + 0.6)); grp.add(L);
    // its ring of light on the rock: where he can be hurt
    const ring = new THREE.Mesh(new THREE.RingGeometry(FKC.RING - 0.25, FKC.RING, 64), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(z3v(CX + x, CY + y, G0 + 0.08)); grp.add(ring);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(FKC.RING, 48), new THREE.MeshBasicMaterial({ color: 0xff9a40, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.copy(z3v(CX + x, CY + y, G0 + 0.06)); grp.add(pool);
    return { fire, halo, L, ring, pool, k: 1 };
  });
  // the Light, far to the south in the fog: its beam a broad fan sweeping round, over the rock once a turn
  {
    const fade = z3Fade([[0, 'rgba(255,236,180,0.34)'], [0.5, 'rgba(255,226,160,0.12)'], [1, 'rgba(255,220,150,0)']]);
    const geo = new THREE.CylinderGeometry(1, 0.05, 1, 32, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(-Math.PI / 2);
    const beam = FK3.beam = new THREE.Group(); beam.position.copy(z3v(CX, CY + FKC.LY, G0 + 34)); grp.add(beam);
    const bm = FK3.beamM = new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    { const b = new THREE.Mesh(geo, bm); b.scale.set(330, 14, -FKC.LY + 120); b.frustumCulled = false; b.renderOrder = 9; beam.add(b); }
    { const b = new THREE.Mesh(geo, bm); b.scale.set(90, 6, -FKC.LY + 100); b.frustumCulled = false; b.renderOrder = 9; beam.add(b); }
    const lamp = FK3.lamp = spr(z3Soft('rgba(255,236,180,0.9)', 'rgba(255,220,150,0)'), 0.5); lamp.scale.setScalar(40); lamp.position.copy(z3v(CX, CY + FKC.LY, G0 + 34)); grp.add(lamp);
  }
  // the flare
  { const g2 = FK3.fl = new THREE.Group(); g2.visible = false; grp.add(g2);
    FK3.flCore = spr(z3Soft('rgba(255,250,245,1)', 'rgba(255,160,150,0)')); FK3.flCore.scale.setScalar(2.2); g2.add(FK3.flCore);
    FK3.flHaze = spr(z3Soft('rgba(255,140,120,0.5)', 'rgba(255,110,90,0)')); FK3.flHaze.scale.setScalar(26); g2.add(FK3.flHaze);
    FK3.flL = new THREE.PointLight(0xffc8b8, 0, 90, 1.1); grp.add(FK3.flL); }
  // his swing's shadow on the rock: a dark fan in front of him as he winds it back
  { const arc = new THREE.Mesh(new THREE.CircleGeometry(FKC.SWING_R, 40, Math.PI / 2 - FKC.SWING_ARC, FKC.SWING_ARC * 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    arc.rotation.x = -Math.PI / 2; const g2 = FK3.arc = new THREE.Group(); g2.add(arc); g2.visible = false; grp.add(g2);
    const rim = new THREE.Mesh(new THREE.RingGeometry(FKC.SWING_R - 0.3, FKC.SWING_R, 40, 1, Math.PI / 2 - FKC.SWING_ARC, FKC.SWING_ARC * 2), new THREE.MeshBasicMaterial({ color: 0x9a70ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.01; g2.add(rim); FK3.arcM = arc.material; FK3.rimM = rim.material; }
  // the dead light: its lamp at the top of the stump (dark until he falls), and its beam
  { const top = z3v(CX + FKC.TOWER[0], CY + FKC.TOWER[1], G0 + FKC.TOP + 0.8);
    FK3.dl = spr(cold, 0); FK3.dl.position.copy(top); FK3.dl.scale.setScalar(14); grp.add(FK3.dl);
    FK3.dlL = new THREE.PointLight(0xe8f0ff, 0, 80, 1.1); FK3.dlL.position.copy(top); grp.add(FK3.dlL);
    const fade = z3Fade([[0, 'rgba(235,245,255,0.5)'], [0.5, 'rgba(220,235,255,0.14)'], [1, 'rgba(210,230,255,0)']]);
    const geo = new THREE.CylinderGeometry(1, 0.05, 1, 32, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(-Math.PI / 2);
    const b2 = FK3.dlBeam = new THREE.Group(); b2.position.copy(top); b2.visible = false; grp.add(b2);
    const bm = FK3.dlBeamM = new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
    for (const s of [1, -1]) { const b = new THREE.Mesh(geo, bm); b.scale.set(60, 8, 700 * s); b.frustumCulled = false; b.renderOrder = 9; b2.add(b); } }
  FK3.on = true; FK3.mistT = 0;
}
function fk3d(dt) {
  if (!FKW.on || !FK3.on) return;
  const t = g.t, CX = FPSC.CX, CY = FPSC.CY, G0 = FPSC.GROUND;
  // the braziers
  FK3.br.forEach((B, i) => {
    const lit = FKW.br[i].lit || FKW.st === 'won', counts = lit && fkRingsOn();
    B.k += ((lit ? 1 : 0) - B.k) * Math.min(1, dt * 3);
    const fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 17 + i) * Math.sin(t * 5.3 + i * 2);
    B.fire.visible = B.halo.visible = B.k > 0.02;
    B.fire.scale.set(1.5 * fl * B.k, 2.2 * (2 - fl) * B.k, 1); B.halo.material.opacity = 0.32 * fl * B.k;
    B.L.intensity = 2.4 * fl * B.k;
    B.ring.material.opacity = counts ? 0.35 + 0.1 * Math.sin(t * 2 + i) : lit ? 0.12 : 0.04; B.ring.material.color.setHex(counts ? 0xffc070 : 0x6a7a8a);
    B.pool.material.opacity = 0.09 * B.k * (counts ? 1 : 0.4);
    // (a dark brazier smokes)
    if (!lit && Math.random() < dt * 4) { const [x, y] = FK_BRAZ[i]; FPS.parts.push({ x: CX + x + (Math.random() - 0.5) * 0.4, y: CY + y + (Math.random() - 0.5) * 0.4, z: G0 + 2, vx: 0, vy: 0, vz: 0.8, t: 1.2, c: '110,115,120' }); }
  });
  // the Light's beam: turned with the shared clock, until he puts it out
  FK3.beam.rotation.y = -gwBeam();
  FK3.beamK = (FK3.beamK == null ? 1 : FK3.beamK) + ((FKW.beamOff ? 0 : 1) - (FK3.beamK == null ? 1 : FK3.beamK)) * Math.min(1, dt * 1.5);
  FK3.beamM.opacity = FK3.beamK; FK3.beam.visible = FK3.beamK > 0.01; FK3.lamp.material.opacity = 0.5 * FK3.beamK;
  const bk = fkBeamOn() ? 1 : 0;
  // the flare: up from the stand, then hanging and drifting down as it burns
  { const f = FKW.fl, up = f.t > FKC.FLARE, on = f.t > 0; FK3.fl.visible = on; FK3.flL.intensity = 0;
    if (on) {
      const k = up ? 1 - (f.t - FKC.FLARE) / FKC.FLARE_UP : (FKC.FLARE - f.t) / FKC.FLARE, [x, y] = FK_FLARE;
      let px, py, pz;
      if (up) { px = x * (1 - k); py = y * (1 - 0.7 * k); pz = 1.4 + (FKC.FLARE_Z - 1.4) * zbE(k); }
      else { px = Math.cos(f.drift) * 4 * k + Math.sin(t * 1.3) * 0.6; py = y * 0.3 + Math.sin(f.drift) * 4 * k; pz = FKC.FLARE_Z - 10 * k; }
      const p = z3v(CX + px, CY + py, G0 + pz); FK3.fl.position.copy(p); FK3.flL.position.copy(p);
      const fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 13), burn = up ? 0.25 : clamp(Math.min(f.t, 0.6) / 0.6, 0, 1);
      FK3.flCore.scale.setScalar((up ? 0.8 : 2.4) * fl); FK3.flHaze.material.opacity = 0.6 * burn * fl; FK3.flL.intensity = (up ? 0.4 : 2.8) * burn * fl;
    } }
  const flK = fkFlareOn() ? clamp(Math.min(FKW.fl.t, FKC.FLARE - FKW.fl.t + 0.4) / 0.6, 0, 1) : 0;
  // his swing's shadow
  { const M = fkBoss(); let show = false;
    if (M && !M.dead && M.act === 'swing') { const at = M.at || 0, T = FK_ACT.swing; if (at < T.hit + 0.25) { show = true; const k = clamp(at / T.hit, 0, 1); FK3.arc.position.copy(z3v(M.x, M.y, G0 + (M.jz || 0) + 0.09)); FK3.arc.rotation.y = -M.h; FK3.arcM.opacity = at < T.hit ? 0.2 + 0.35 * k : 0.55 * (1 - (at - T.hit) / 0.25); FK3.rimM.opacity = at < T.hit ? 0.25 + 0.5 * k * (0.7 + 0.3 * Math.sin(t * (10 + k * 14))) : 0; } }
    FK3.arc.visible = show; }
  // the dead light, coming on when he falls: its lamp, and its beam turning, the fog swept away
  { const d = FKW.dawn || 0; FK3.dl.material.opacity = d; FK3.dlL.intensity = 3 * d; FK3.dlBeam.visible = d > 0.01; FK3.dlBeamM.opacity = d; FK3.dlBeam.rotation.y = -t * 0.9;
    if (d > 0 && !FK3.dawnHeard) { FK3.dawnHeard = true; fkSound('dawn', 0); } }
  // the night: dark in the haar; brighter while the beam's over the rock or the flare burns, and at the end
  if (GL3D.amb) GL3D.amb.intensity = 0.22 + 0.2 * bk * FK3.beamK + 0.12 * flK + 0.35 * (FKW.dawn || 0);
  if (GL3D.scene && GL3D.scene.fog) {
    const F = GL3D.scene.fog, d = FKW.dawn || 0, far = zbL(Math.max(40, frFog()) + 18 * bk + 25 * flK, 600, d * d);
    F.far += (far - F.far) * Math.min(1, dt * (d > 0 ? 1.2 : 3)); F.near = F.far * 0.15;
    F.color.setRGB(0.05 + 0.04 * bk + 0.05 * d, 0.06 + 0.04 * bk + 0.06 * d, 0.075 + 0.03 * bk + 0.08 * d); RAID.fog0 = true;
  }
  // the fog rolling in over the edge of the rock
  FK3.mistT -= dt;
  if (FK3.mistT <= 0 && FKW.st !== 'won') { FK3.mistT = 0.08; const a = Math.random() * 6.283, r = FKC.R - 2 + Math.random() * 6; FPS.parts.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, z: G0 + 0.5 + Math.random() * 1.5, vx: -Math.cos(a) * 0.8, vy: -Math.sin(a) * 0.8, vz: 0.1, t: 2.5, c: '150,160,170' }); }
}
