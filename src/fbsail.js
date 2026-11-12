// Freebooters' Sea: the open sea (RAID_STAGES.fbsail). The Gannet's Wake's Part I (src/gwsail.js) once more: the same
// cutter, deck, helm, holes and flood, bell, flare locker, and the drowned over the rail, sailing just as the Brig
// does, on a sea of its own with no mark to make, no Maren and no Plimsoll.
//  - The sea, the Wide Water, is fixed: the same on every screen and every session. About 3 km square north of the
//    Light (FBS.SEA), with the outpost of Saltcote at its south end and twelve islands across it (FB_ISLES), and rocks
//    between them (fbSea: from a fixed seed, thicker round the reefs). Each island is drawn on the water in its own
//    look (src/fpsisle.js FPS_ISLES: its ground, its beach, and a mark of its kind: a chapel's gable, a signal tower,
//    a jetty, a wreck's ribs, reeds, a cairn). She runs up against an island's shore and is pushed off it, unharmed
//    (gwsail's sea.shore); a rock holes her as ever.
//  - The nearest island is the mark on the bearing strip, its name and how far off its shore under it.
//  - Within FBS.REACH of an island's shore (or Saltcote's) she can drop anchor: at the wheel (Use, while you hold
//    it) or at the capstan forward (Use, anyone). A moment later everyone's ashore: that island's stage
//    (src/fbisle.js). Back aboard, she lies where she anchored, her head as it was, her holes, flood and hold kept,
//    and her sail struck.
//  - The rocks show inside FBS.SEE of her, in the deck lantern's light, the Light's beam and a flare's. The night is a
//    little brighter out here (GWS_LEG.amb) so the islands show as shapes against the sea.
//  - The drowned climb her side out on the open water, though not within FBS.CALM of Saltcote.
// It's done through gwsail's GWS_LEG, as Fog Run's sail is (src/frsail.js): this file's prep fills it in from the ship
// as she lies (FB.ship), and its exit clears it. Together it's the Gannet's Wake's word (g* keys), as is; dropping
// anchor is raidAsk('anchor').
// For the parts to come, fbHook('sail', h) (src/fbsea.js) adds to this stage; FB_ISLES, fbSea, fbNearest, fbInReach
// and fbAnchor are here.

const FBS = { SEA: [-1500, 1500, 900, 3900], REACH: 55, SEE: 150, CALM: 260, ROCKS: 230, SEED: 0xfb5ea, FOGC: '#0c1424', AMB: [0.62, 0.34], PROG: 0.15 };
// the islands: their names, where they lie (the sea's frame: x east, y north, from the Light), their size on the water
// (r, m), their look (FPS_ISLES) and the seed each is laid out from. The first is Saltcote, the outpost.
var FB_ISLES = [
  { n: 'Saltcote', x: -40, y: 1060, r: 62, look: 'cove', seed: 0x5a17c, port: true, say: 'the outpost: a quay, the factor’s table' },
  { n: 'Gullstone', x: -560, y: 1380, r: 46, look: 'shingle', seed: 0x9011, say: 'grey shingle and gulls' },
  { n: 'Widow’s Teeth', x: 470, y: 1540, r: 44, look: 'reef', seed: 0x71d0, say: 'black rock and broken hulls' },
  { n: 'St Brannoc’s Isle', x: -1140, y: 1820, r: 50, look: 'chapel', seed: 0xb4a6, say: 'a roofless chapel and its graves' },
  { n: 'Tallow Cove', x: 1150, y: 1270, r: 48, look: 'cove', seed: 0x7a11, say: 'a smugglers’ jetty' },
  { n: 'Beacon Knoll', x: -220, y: 2080, r: 52, look: 'cliff', seed: 0xbe4c, say: 'heather and a ruined signal tower' },
  { n: 'Marrowfen', x: 860, y: 2230, r: 50, look: 'marsh', seed: 0x3a40, say: 'mud, reeds and marsh lights' },
  { n: 'Crowsnest Rock', x: -1250, y: 2720, r: 46, look: 'cliff', seed: 0xc405, say: 'crags and a stair cut in them' },
  { n: 'The Coffin Stones', x: 300, y: 2780, r: 46, look: 'reef', seed: 0xc0ff, say: 'wrecks on the rocks' },
  { n: 'Hangman’s Holm', x: 1300, y: 2920, r: 44, look: 'shingle', seed: 0x4a46, say: 'a bleak shingle holm' },
  { n: 'Gilt Strand', x: -640, y: 3360, r: 48, look: 'cove', seed: 0x6117, say: 'a golden beach and a boathouse' },
  { n: 'Mother Carey’s Rest', x: 760, y: 3600, r: 50, look: 'chapel', seed: 0xca4e, say: 'an old chapel among the stones' },
  { n: 'Blackwater Holm', x: -1320, y: 3740, r: 46, look: 'marsh', seed: 0xb1ac, say: 'black pools and peat' },
];
// the sea: its rocks (fixed), and the islands' shores she runs up against; laid out once, the same on every side
var FBS_SEA = null;
function fbSea() {
  if (FBS_SEA) return FBS_SEA;
  const R = seeded(FBS.SEED), rnd = (a, b) => a + R() * (b - a), rocks = [], [x0, x1, y0, y1] = FBS.SEA, S0 = fbFreshShip();
  const ok = (x, y, r) => Math.hypot(x - S0.x, y - S0.y) > 90 && !FB_ISLES.some(I => Math.hypot(I.x - x, I.y - y) < I.r + r + 40) && !rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 22);
  const add = (x, y, r) => { const prof = []; for (let i = 0; i < 7; i++) prof.push(rnd(0.35, 1)); prof[0] = rnd(0.15, 0.45); prof[6] = rnd(0.15, 0.45); rocks.push({ x, y, r, prof, ph: rnd(0, 6.28), seen: -99, lit: 0, i: rocks.length }); };
  // round the reefs, a ring of rocks, open to the south (the way in)
  for (const I of FB_ISLES) if (I.look === 'reef') for (let k = 0; k < 11; k++) { const a = k / 11 * 6.283 + rnd(-0.2, 0.2); if (a > 2.7 && a < 3.6) continue; const d = I.r + rnd(48, 80), x = I.x + Math.sin(a) * d, y = I.y + Math.cos(a) * d, r = rnd(4, 9); if (ok(x, y, r)) add(x, y, r); }
  // and the rest across the open water, more of them the further north
  for (let n = 0; n < 20000 && rocks.length < FBS.ROCKS; n++) { const y = y0 + Math.sqrt(rnd(0, 1)) * (y1 - y0), x = rnd(x0, x1), r = rnd(4, 15); if (ok(x, y, r)) add(x, y, r); }
  const shore = FB_ISLES.map((I, i) => ({ x: I.x, y: I.y, r: I.r - 6, i }));
  return FBS_SEA = { rocks, shore, path: [{ x: S0.x, y: S0.y }, { x: S0.x, y: S0.y + 1 }], spars: [], len: y1 - y0 };
}
// the nearest island to (x, y) in the sea's frame: which, and how far off its shore
function fbNearest(x, y) { let b = { i: 0, d: 1e9 }; FB_ISLES.forEach((I, i) => { const d = Math.hypot(I.x - x, I.y - y) - I.r; if (d < b.d) b = { i, d }; }); return b; }
// the island she can anchor off now (-1: none in reach)
function fbInReach(B) { if (!B) return -1; const n = fbNearest(B.x, B.y); return n.d < FBS.REACH ? n.i : -1; }
const fbsNear = () => { const S = RAID.st, V = S && (S.V || S.B); return V ? fbNearest(V.x, V.y) : { i: 0, d: 1e9 }; };
const fbsReach = () => { const S = RAID.st; return S && S.ph === 'sail' ? fbInReach(S.V || S.B) : -1; };
// a bearing in words, from her bow: ahead, off the starboard bow...
function fbsSide(V, x, y) {
  const a = angDiff(bearingOf(x - V.x, y - V.y), V.h), A = Math.abs(a), s = a > 0 ? 'starboard' : 'port';
  return A < 0.25 ? 'dead ahead' : A < 1.1 ? `off the ${s} bow` : A < 2.0 ? `on the ${s} beam` : A < 2.9 ? `on the ${s} quarter` : 'astern';
}

// (prep) the sea, into GWS_LEG, from the ship as she lies; before the world's laid out
function fbsLeg() {
  const Sh = FB.ship || fbFreshShip(), sea = fbSea();
  GWS_LEG = { key: 'fbsail', n: 0, seed: FBS.SEED, start: [Sh.x, Sh.y], h0: Sh.h, mark: [FB_ISLES[0].x, FB_ISLES[0].y], isleR: FB_ISLES[0].r, markIn: -1, rocks: sea.rocks.length, fog: FBS.SEE, maren: false, plim: false,
    sea, amb: FBS.AMB, look: 'cove', ground: FPS_ISLES.cove.ground, ground2: FPS_ISLES.cove.ground2,
    // (her state as she was: anchored, so her way is off her and her sail struck, never her speed to come)
    enter(S) { const B = S.B; B.v = 0; B.sail = 0.15; B.rudder = 0; S.V = Object.assign({}, B); S.holes = (Sh.holes || []).slice(); S.flood = Sh.flood || 0; S.patched = Sh.patched | 0; },
    sunk: () => fbSunk(),
    prog: () => FBS.PROG,
    spawnOk: () => { const B = RAID.st.B; return !B || Math.hypot(B.x - FB_ISLES[0].x, B.y - FB_ISLES[0].y) > FBS.CALM; },
    row: () => ['HOLD', FB.hold.length ? `${FB.hold.length} · ${fbHoldValue().toLocaleString('en')} SOV` : 'EMPTY', FB.hold.length ? '#ffd88a' : null],
    markLab: () => { const n = fbsNear(); return `${FB_ISLES[n.i].n} · ${Math.max(0, Math.round(n.d))} m`; },
    line: (S, dm) => { const n = fbsNear(), I = FB_ISLES[n.i], V = S.V || S.B;
      if (S.ph === 'beach') return `The anchor’s down off ${FB_ISLES[S.fbAt | 0].n}. Going ashore…`;
      if (S.ph === 'sunk') return 'She’s going down.';
      if (fbsReach() >= 0) return `Off ${I.n}: drop anchor (Use at the wheel, or at the capstan forward) to go ashore`;
      return `The Wide Water · ${I.n}, ${Math.max(0, Math.round(n.d)).toLocaleString('en')} m ${fbsSide(V, I.x, I.y)}`; },
    b3: fbs3dBuild, f3: fbs3d };
  FPS_ISLES.fbsail.fog = [FBS.FOGC, 600, 4200];
}
FPS_ISLES.fbsail = Object.assign({}, FPS_ISLES.gwsail, { name: 'the Wide Water', fog: [FBS.FOGC, 600, 4200] });
FPI_GEN.fbsail = FPI_GEN.gwsail;
const FBS_MAP = Object.assign({}, GWS_MAP, { isle: 'fbsail' });

// (hosting or alone) drop anchor off the island in reach, and a moment later everyone's ashore
function fbAnchor(sid) {
  const S = RAID.st; if (!S.B || S.ph !== 'sail' || ZM.net === 'client') return false;
  const i = fbInReach(S.B); if (i < 0) return false;
  const I = FB_ISLES[i];
  S.ph = 'beach'; S.beachT = 0; S.fbAt = i; S.helm = null;
  fbKeepShip(S);
  gwsSay(`${sid && sid !== FPS.me.id ? fbNick(sid) + ' lets go the anchor' : 'The anchor’s down'} off ${I.n}. Ashore!`, true);
  GWS_LEG.arrive = () => { fbKeepShip(S); fbEvent('ashore', '', i); fbGo(I.port ? 'fb_port' : 'fb_isle', i); };
  return true;
}
const fbsCall = (k, ...a) => fbHooks('sail', k, ...a);
RAID_STAGES.fbsail = Object.assign({}, RAID_STAGES.gwsail, {
  n: 'At sea', map: FBS_MAP, gws: true,
  music: () => fbsCall('music') || FB_MUSIC.sail,
  prep(i) { fbsLeg(); fbsCall('prep', i); },
  enter() {
    if (!GWS_LEG) fbsLeg();
    RAID_STAGES.gwsail.enter();
    RAID.st.fbAt = -1;
    ZM.banner = this.banner();
    fpsFeed(RAID.stage === 0 ? 'The keeper’s cutter, lying off Saltcote. Take the wheel (Use) and sail her anywhere: the nearest island is on the strip at the top.' : 'Back aboard, where she lay. Take the wheel (Use) and make sail.');
    fbsCall('enter');
  },
  banner() { return { text: 'The Wide Water', t: 4.5, sub: RAID.stage === 0 ? 'Freebooters’ Sea · off Saltcote' : 'Back aboard', col: '#ffd88a' }; },
  tick(dt) { gwsTick(dt); fbsCall('tick', dt); },
  me(dt) {
    gwsMe(dt);
    // (the strip's mark: the nearest island)
    const S = RAID.st, V = S.V || S.B; if (V && GWS_LEG) { const n = fbNearest(V.x, V.y), I = FB_ISLES[n.i]; GWS_LEG.mark = [I.x, I.y]; GWS_LEG.isleR = I.r; }
    fbsCall('me', dt);
  },
  q(sid, k, a) { if (k === 'anchor') { fbAnchor(sid); return; } if (fbsCall('q', sid, k, a)) return; gwsQ(sid, k, a); },
  pack(o) { gwsPack(o); fbsCall('pack', o); },
  apply(o) { gwsApply(o); fbsCall('apply', o); },
  consider(c) {
    gwsConsider(c);
    // the anchor's capstan forward: let go the anchor, when she's in reach of an island
    if (fbsReach() >= 0) { const [x, y] = gwsW(2.35, 7.4); c({ k: 'fbanchor' }, x, y, GWS.D, 1.6, false); }
    fbsCall('consider', c);
  },
  prompt(o) {
    const i = fbsReach();
    if (o.k === 'fbanchor') return i >= 0 ? { text: `Let go the anchor off ${FB_ISLES[i].n}, and go ashore`, free: true } : null;
    if (o.k === 'gwhelm' && FPS.helm && i >= 0) return { text: `Drop anchor off ${FB_ISLES[i].n}, and go ashore`, free: true };
    return fbsCall('prompt', o) || gwsPrompt(o);
  },
  use(o) {
    if ((o.k === 'fbanchor' || (o.k === 'gwhelm' && FPS.helm)) && fbsReach() >= 0) { if (FPS.helm) gwsLetGo(); raidAsk('anchor'); return true; }
    if (o.k === 'fbanchor') return true;
    return !!fbsCall('use', o) || gwsUse(o);
  },
  hud(phone, mono, fell) { gwsHud(phone, mono, fell); fbsCall('hud', phone, mono, fell); },
  b3(grp) { gws3dBuild(grp); fbsCall('b3', grp); },
  f3(dt) { gws3d(dt); fbsCall('f3', dt); },
  block(x, y, pad, feet) { return RAID_STAGES.gwsail.block(x, y, pad, feet) || !!fbsCall('block', x, y, pad, feet); },
  kill(d, how, by) { fbsCall('kill', d, how, by); },
  hurt(d, dmg, code, by) { return fbHookHurt('sail', d, dmg, code, by); },
  players(P) { return fbHookPlayers('sail', P); },
  shot(...a) { fbsCall('shot', ...a); },
  exit() { fbsCall('exit'); gwsExit(); GWS_LEG = null; if (typeof GL3D !== 'undefined' && GL3D.scene) GL3D.scene.fog = null; },
});

// ---------- the islands out there, in 3D (in the sea's group: GWS_LEG.b3 and f3) ----------
function fbs3dBuild(SG, G) {
  const lam = c => z3Lam(c), rk = lam('#4e5052'), rk2 = lam('#3e403e'), wood = lam('#3a2e22'), stone = lam('#6a6a64');
  G.fbI = [];
  FB_ISLES.forEach((I, i) => {
    const T = FPS_ISLES[I.look] || FPS_ISLES.shingle, R = seeded(I.seed ^ 0x15e), g0 = new THREE.Group(); g0.position.set(I.x, 0, -I.y); SG.add(g0);
    const hi = I.look === 'cliff' ? 9 : I.look === 'marsh' ? 1.6 : I.look === 'chapel' ? 5 : I.look === 'reef' ? 3 : 4;
    // a hump of the island's own ground, a beach round it, a few rocks on it
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 10), lam(T.ground)); mound.scale.set(I.r * 0.92, hi, I.r * 0.92); mound.position.y = -0.6; g0.add(mound);
    const beach = new THREE.Mesh(new THREE.CylinderGeometry(I.r, I.r + 5, 0.9, 36), lam(T.ground2)); beach.position.y = -0.25; g0.add(beach);
    for (let k = 0; k < 10; k++) { const a = R() * 6.283, d = I.r * (0.35 + R() * 0.6), r = 1.5 + R() * 3.5; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), k % 2 ? rk : rk2); m.position.set(Math.cos(a) * d, r * 0.3 + hi * (1 - d / I.r) * 0.8, Math.sin(a) * d); m.rotation.set(R() * 3, R() * 3, R() * 3); g0.add(m); }
    const top = hi - 0.6;
    // and a mark of its kind, to know it by from the water
    if (I.look === 'chapel') { const nave = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 12), stone); nave.position.set(4, top + 1.2, 2); nave.rotation.y = 0.4; g0.add(nave); const gab = new THREE.Mesh(new THREE.BoxGeometry(6, 6.5, 1), stone); gab.position.set(4 + Math.sin(0.4) * 6, top + 2.6, 2 + Math.cos(0.4) * 6); gab.rotation.y = 0.4; g0.add(gab); }
    else if (I.look === 'cliff') { const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 9, 12), stone); tw.position.set(-6, top + 4, 4); g0.add(tw); const s = G.glowSp(0xffb060, 10, { opacity: 0.55 }); s.position.set(-6, top + 9.6, 4); g0.add(s); }
    else if (I.look === 'cove') { const j = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 22), wood); const a = I.port ? Math.PI * 0.6 : R() * 6.283; j.position.set(Math.cos(a) * (I.r + 8), 0.6, Math.sin(a) * (I.r + 8)); j.rotation.y = -a + Math.PI / 2; g0.add(j); const bh = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 10), wood); bh.position.set(Math.cos(a) * (I.r - 14), top * 0.4 + 2, Math.sin(a) * (I.r - 14)); bh.rotation.y = -a; g0.add(bh); }
    else if (I.look === 'reef') { for (let k = 0; k < 2; k++) { const a = R() * 6.283, w = new THREE.Group(); w.position.set(Math.cos(a) * I.r * 0.5, 0.5, Math.sin(a) * I.r * 0.5); w.rotation.set(0.25, R() * 6.28, 0.1); g0.add(w); for (let r = 0; r < 6; r++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.18, 4, 10, Math.PI), wood); rib.position.z = r * 1.4 - 3.5; w.add(rib); } } }
    else if (I.look === 'marsh') { const reed = lam('#6a7040'); for (let k = 0; k < 40; k++) { const a = R() * 6.283, d = R() * I.r * 0.9, m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4 + R() * 1.6, 4), reed); m.position.set(Math.cos(a) * d, 1.2, Math.sin(a) * d); g0.add(m); } const s = G.glowSp(0xb8ffb0, 4, { opacity: 0.35 }); s.position.set(5, 2, -6); g0.add(s); }
    else { const c = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.6, 2.6, 7), stone); c.position.set(2, top + 1.2, -3); g0.add(c); }
    // Saltcote: its quay's lamps and its windows, warm across the water
    if (I.port) { for (let k = 0; k < 6; k++) { const a = Math.PI * 0.6 + (k - 2.5) * 0.28, s = G.glowSp(0xffc070, 7, { opacity: 0.7 }); s.position.set(Math.cos(a) * (I.r - 6), top * 0.5 + 3, Math.sin(a) * (I.r - 6)); g0.add(s); }
      for (let k = 0; k < 4; k++) { const hut = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), wood); const a = Math.PI * 0.6 + (k - 1.5) * 0.45; hut.position.set(Math.cos(a) * (I.r - 22), top * 0.6 + 2, Math.sin(a) * (I.r - 22)); hut.rotation.y = -a; g0.add(hut); } }
    // a faint lantern at its landing, so there's something to steer for at night
    const lg = G.glowSp(0xffd8a0, I.port ? 18 : 6, { opacity: 0 }); lg.position.set(0, top + 3, 0); g0.add(lg);
    G.fbI.push({ g: g0, lg, I });
  });
}
function fbs3d(dt, V) {
  const G = GW3; if (!G.fbI) return;
  for (const o of G.fbI) { const d = Math.hypot(o.I.x - V.x, o.I.y - V.y) - o.I.r; o.lg.material.opacity = clamp(1.2 - d / 1400, 0.08, 0.5) * (0.85 + 0.15 * Math.sin(g.t * 1.3 + o.I.x)); }
  if (GL3D.scene && GL3D.scene.fog) { const F = GL3D.scene.fog; F.near = 600; F.far = 4200; }
}
