// Maren's End, the raid's third and last stage: the stone sea fort at the end of the world, and Maren herself.
//
// Through the door at the end of the bridge (stage two) you come out in the Sally Port of an old Spanish sea fort
// on a headland, its south front a sea wall over the open ocean. Round the Plaza de Armas (the great courtyard) run
// the ranges of the fort: the Powder Magazine, the Guardroom, the Chapel of Our Lady of the Sea, the Cookhouse, the
// Governor's Rooms, the Barracks, the Officers' Mess, and three apothecaries, one on each side: San Telmo (west),
// Santa Bárbara (east) and San Lázaro (north). Along the south side of the Plaza, up a grand stair, the Sea Battery:
// a gun terrace on top of the sea wall, its cannon pointing out to sea, a sentry box (garita) at each end.
//  - The hunt: a Mooncusser keeps each apothecary. Step into one and he lifts his false light; put him down. The
//    drowned come in at the fort's windows and up ladders out of the sea onto the Battery the whole time.
//  - The Knock: when the third Mooncusser falls, her bat comes up through the Plaza's flagstones first (src/raidknock.js).
//    Put it down and “Maren is angered”; a pause, and she rises.
//  - Maren: when the Knock falls, Maren Holm comes up out of the sea onto the Sea Battery, three times the
//    height of a man (her model is built after her picture, assets/maren.png: a drowned woman in a long dark dress,
//    one arm raised, her face lost in shadow). She can't be hurt while her soul is out of her: a yellow light, Maren's
//    Soul, darting and jinking over the water beyond the sea wall. It takes 30 (weak-spot hits) to burst, and then she can be hurt for 30 seconds; then the soul
//    rises out of the sea again somewhere else, and she's untouchable until it's shot again. Over and over, until
//    she's dead. All through the fight the drowned keep coming, and now and then another boss (the Diver, a
//    Mooncusser or the Keelback) climbs in too.
//  - Her blows: close in she sweeps her arm through you; further off she raises her arm (as in her
//    picture) and the sea answers: a ring glows sea-green on the floor round one of you and erupts 2.4 seconds later
//    (jump, or get out of the ring; each of her blows takes half your health). She keeps to the Plaza and the Battery: she's too big for the doors.
//  - Her death: she drops a pirate token (Maren's Piece of Eight): walk over it and it's yours, one for each of you
//    (the same pirate tokens as the Lighthouse's, src/zmegg.js ptGrant, spent on the Keeper's Last Light card).
// Built on the Lighthouse's engine: the fort is a map of its own (ZM_MAPS.fort, FPI_GEN.fort, laid out with zmKit),
// Maren is a boss kind of her own on src/zmboss.js's framework (ZBT.maren), the Mooncussers are zmboss2.js's.
// Together it's host-authoritative like the rest (src/zmnet.js): the host runs the stage and sends it in `rf`; a
// client's shot at the soul goes to the host as a request ('rf', 'orb').
// Hooks: src/zombies.js (zmReset, zmTick, zmKill, zmHurt, zmResolveShot, zm3dBuild, zmScene3D, zmHud), src/zmnet.js
// (znHostSend, znApply, znRequestFrom), src/zmboss.js (zbPlan and zbSpawn keep to the three old kinds; zbFlash
// spares her), each a single line marked [raid3]. The raid's stages (src/raid.js) hand over with rfBegin().

const RFC = {
  RT: 3.2, WH: 5.4,   // (the Sea Battery's height over the Plaza; the height of the fort's walls)
  ROUND: 10,   // (how strong the drowned are here, as a Lighthouse round, at the least)
  VUL: 30, ORB_GAP: 3.5, ORB_R: 1.25, ORB_HP: 30, ORB_SEND: 0.15,   // (how long she can be hurt once her soul's shot; before it's back; how big it is to hit;
  // how much it takes to burst it, as weak-spot hits; how often a joined player's hits on it go to the host)
  HP: 64, PTS: 2500, BOOST: 1.25, HP_MORE: 0.75,
  RAD: 1.35, TALL: 6.3, HEADZ: 5.55, PAD: 0.9, SP: 3.2, S: 3.05,   // (her size: S times a woman's)
  SWEEP: 4.7, SWEEP_ARC: 1.15, CALL_R: 4.08, CALL_RANGE: 34,
  ALIVE: [8, 13], ALIVE_MORE: 3, BOSS_T: [32, 48],
  ANGER: [1.2, 4.2],   // (from the Knock's fall to “Maren is angered”; from that to her rising)
  BOX: [-22.6, 22.6, -21.2, 28.6],   // (where she can go: the Plaza and the Battery)
};
const RF_APOS = {
  apoW: { n: 'the Apothecary of San Telmo', c: '#6aa8ff', at: [-37, 0], h: Math.PI / 2 },
  apoE: { n: 'the Apothecary of Santa Bárbara', c: '#ff7262', at: [37, 0], h: -Math.PI / 2 },
  apoN: { n: 'the Apothecary of San Lázaro', c: '#7aff9a', at: [0, 41.5], h: Math.PI },
};
const RF_APO_IDS = Object.keys(RF_APOS);
const RF_ST = ['hunt', 'rise', 'maren', 'won', 'knock', 'anger'];
const RF_START = [-16, 40.5], RF_FACE = Math.PI;   // (where you come in, by the Sally Port's great door, facing the Plaza)
const RF = { on: false, st: 'hunt', apo: {}, wait: 0, mz: 0, vul: 0, orbUp: false, orbGap: 0, orbT: 0, orb: [0, -40, 8], bossT: 30, tok: null, mine: false, won: 0, seen: {}, grab: 0, shot: 0 };

// the fort's own props: an apothecary's cabinet of drawers and bottles, its counter, the show globes in its window,
// the great door, a sentry box, a pyramid of shot
const RFP = { wood: '#3a2a1c', wood2: '#4a3424', brass: '#9a7a3a', stone: '#8a7e66', stone2: '#a29274', glass: ['#3a6a9a', '#3a7a4a', '#8a5a2a', '#7a2a2a', '#5a4a7a', '#2a6a6a'] };
Object.assign(FPI_K, {
  // a tall cabinet against the wall: little drawers with brass pulls below, open shelves of bottles above (a few of
  // them glowing: the tinctures), a cornice on top; w wide, its front out along -v, lit in its apothecary's colour c
  rfcab: {
    col: RFP.wood,
    sol(p) { return [fpiBox(p, 0, 0, (p.w || 2.6) / 2, 0.26, 2.7)]; },
    b3(p, A) {
      const w = p.w || 2.6, c = p.c || '#7aff9a';
      A.box(RFP.wood, 0, 0.04, -0.1, w, 0.48, 2.85);
      A.box(RFP.wood2, 0, -0.02, 2.62, w + 0.14, 0.58, 0.16);
      const nu = Math.max(3, Math.round(w / 0.32)), du = (w - 0.16) / nu;
      for (let i = 0; i < nu; i++) for (let j = 0; j < 4; j++) {
        const u = -w / 2 + 0.08 + (i + 0.5) * du, z = 0.12 + j * 0.27;
        A.box(j % 2 === i % 2 ? '#5a4030' : '#4e3828', u, -0.24, z, du * 0.92, 0.04, 0.24);
        A.box(RFP.brass, u, -0.27, z + 0.1, 0.06, 0.03, 0.04);
      }
      A.box(RFP.wood2, 0, -0.22, 1.2, w, 0.1, 0.06);
      for (const h of [1.3, 1.75, 2.2]) {
        A.box(RFP.wood2, 0, 0, h, w - 0.08, 0.44, 0.04);
        for (let u = -w / 2 + 0.16; u < w / 2 - 0.12; u += 0.17 + A.r() * 0.12) {
          if (A.r() < 0.18) continue;
          const tall = 0.14 + A.r() * 0.18, r = 0.045 + A.r() * 0.04, k = A.r();
          if (k < 0.12) { A.glow(c, u, -0.05, h + 0.04 + tall / 2, r * 2.2); continue; }
          A.cyl(RFP.glass[Math.floor(A.r() * RFP.glass.length)], u, -0.05, h + 0.04, r, tall);
          A.cyl('#c8bca0', u, -0.05, h + 0.04 + tall, r * 0.5, 0.05);
        }
      }
      // a label plate over it, and two pale jars on top
      A.box('#d8ccaa', 0, -0.3, 2.66, Math.min(1.2, w * 0.4), 0.02, 0.1);
      for (const s of [-1, 1]) { A.cyl('#c8c0a8', s * w * 0.32, 0, 2.78, 0.12, 0.3); A.cyl(RFP.brass, s * w * 0.32, 0, 3.08, 0.08, 0.06); }
    },
  },
  // the counter: a long table with a stone top, a mortar and pestle, brass scales, a row of bottles, the day book
  rfcounter: {
    col: RFP.wood,
    sol(p) { return [fpiBox(p, 0, 0, (p.w || 3.4) / 2, 0.5, 1.0)]; },
    b3(p, A) {
      const w = p.w || 3.4, c = p.c || '#7aff9a';
      A.box(RFP.wood, 0, 0, -0.1, w, 0.9, 1.0);
      A.box('#8e8676', 0, 0, 0.94, w + 0.1, 1.0, 0.07);
      for (let i = 0; i < 4; i++) A.box('#4e3828', -w / 2 + (i + 0.5) * w / 4, -0.46, 0.2, w / 4 * 0.86, 0.03, 0.6);
      A.cyl('#6e6a60', -w * 0.3, 0, 1.0, 0.16, 0.16); A.log('#5a5650', -w * 0.3 + 0.06, 0, 1.2, 0.03, 0.32, 0.5, -0.8);
      A.box(RFP.brass, w * 0.05, 0.1, 1.0, 0.04, 0.04, 0.45); A.box(RFP.brass, w * 0.05, 0.1, 1.43, 0.6, 0.03, 0.03);
      for (const s of [-1, 1]) { A.cyl(RFP.brass, w * 0.05 + s * 0.28, 0.1, 1.2, 0.1, 0.03); A.box(RFP.brass, w * 0.05 + s * 0.28, 0.1, 1.22, 0.01, 0.01, 0.22); }
      for (let i = 0; i < 5; i++) A.cyl(RFP.glass[i % RFP.glass.length], w * 0.22 + i * 0.13, -0.2, 1.0, 0.05, 0.16 + (i % 3) * 0.05);
      A.box('#5a2a24', -w * 0.08, -0.2, 1.0, 0.5, 0.36, 0.08); A.box('#e0d6bc', -w * 0.08, -0.2, 1.08, 0.46, 0.32, 0.02);
      A.glow(c, w * 0.42, 0.25, 1.15, 0.2);
    },
  },
  // a show globe: the apothecary's sign, a great glass globe of coloured water on a turned stand, lit
  rfglobe: {
    col: RFP.wood,
    sol(p) { return [fpiCirc(p, 0, 0, 0.35, 1.6)]; },
    b3(p, A) {
      A.cyl(RFP.wood2, 0, 0, -0.1, 0.3, 0.12); A.cyl(RFP.wood, 0, 0, 0, 0.08, 0.9); A.cyl(RFP.brass, 0, 0, 0.88, 0.16, 0.06);
      A.part('sph', p.c || '#7aff9a', 0, 0, 1.25, 0.66, 0.74, 0.66, 0, 0, 0, 'glow');
      A.cyl(RFP.brass, 0, 0, 1.58, 0.06, 0.16); A.part('cone', RFP.brass, 0, 0, 1.82, 0.12, 0.24, 0.12);
    },
  },
  // the fort's great door, shut for good: two leaves of studded planks in a round-headed stone frame (to look at)
  rfgreatdoor: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const w = p.w || 3.2;
      A.box(RFP.stone2, 0, 0, -0.1, w + 0.9, 0.3, 4.4);
      A.box('#2a1e14', 0, -0.08, -0.05, w, 0.3, 3.7);
      for (let i = 0; i < 8; i++) A.box(i % 2 ? '#4a3424' : '#3e2c1e', -w / 2 + (i + 0.5) * w / 8, -0.2, 0, w / 8 * 0.94, 0.06, 3.5);
      for (const z of [0.5, 1.7, 2.9]) A.box('#24262a', 0, -0.24, z, w * 0.98, 0.04, 0.12);
      for (let i = 0; i < 6; i++) for (const z of [0.5, 1.7, 2.9]) A.part('sph', '#3a3c40', -w / 2 + 0.3 + i * (w - 0.6) / 5, -0.27, z + 0.06, 0.07, 0.07, 0.07);
      for (const s of [-1, 1]) A.part('torus', RFP.brass, s * 0.3, -0.3, 1.5, 0.3, 0.3, 0.3, 0, Math.PI / 2, 0);
      A.box(RFP.stone, 0, -0.1, 3.7, w + 0.5, 0.36, 0.5);
    },
  },
  // a garita: the stone sentry box at a corner of the walls, round, on a corbel, a little dome and a finial on top
  rfgarita: {
    col: RFP.stone,
    sol(p) { return p.solid ? [fpiCirc(p, 0, 0, 0.95, 2.9)] : []; },
    b3(p, A) {
      A.part('cone', RFP.stone, 0, 0, -0.35, 1.9, -0.9, 1.9);
      A.cyl(RFP.stone2, 0, 0, 0, 0.95, 2.2, 0, 0, 0, 'cyl8');
      A.cyl(RFP.stone, 0, 0, 2.15, 1.05, 0.18, 0, 0, 0, 'cyl8');
      A.part('sph', RFP.stone2, 0, 0, 2.33, 1.9, 1.3, 1.9);
      A.part('cone', RFP.stone, 0, 0, 3.05, 0.25, 0.5, 0.25); A.part('sph', RFP.stone2, 0, 0, 3.35, 0.2, 0.2, 0.2);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; A.box('#14120e', Math.cos(a) * 0.93, Math.sin(a) * 0.93, 1.1, 0.12, 0.12, 0.7, -a); }
    },
  },
  // round shot stacked in a pyramid on a little frame
  rfballs: {
    col: FPI_C.iron,
    sol(p) { return [fpiBox(p, 0, 0, 0.55, 0.55, 0.7)]; },
    b3(p, A) {
      A.box(RFP.wood, 0, 0, -0.05, 1.15, 1.15, 0.1);
      for (let k = 0; k < 3; k++) { const n = 3 - k; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A.part('sph', '#2a2c30', (i - (n - 1) / 2) * 0.32, (j - (n - 1) / 2) * 0.32, 0.2 + k * 0.25, 0.32, 0.32, 0.32); }
    },
  },
});

// ---------- the map: its rooms, and where you come in ----------
// [x0, x1, y0, y1] from the island's middle, north +y; the sea to the south, past the sea wall at y -22
const RF_ZONES = {
  battery: { n: 'the Sea Battery', r: [-24, 24, -22, -14], sky: true },
  plaza: { n: 'the Plaza de Armas', r: [-24, 24, -14, 30], sky: true },
  store: { n: 'the Powder Magazine', r: [-40, -24, -22, -10], floor: 'flags', wall: '#b8a684' },
  apoW: { n: RF_APOS.apoW.n, r: [-40, -24, -10, 10], floor: 'flags', wall: '#c4b48e' },
  chapel: { n: 'the Chapel of Our Lady of the Sea', r: [-40, -24, 10, 30], floor: 'flags', wall: '#cfc2a2' },
  guard: { n: 'the Guardroom', r: [24, 40, -22, -10], floor: 'boards', wall: '#b8a684' },
  apoE: { n: RF_APOS.apoE.n, r: [24, 40, -10, 10], floor: 'flags', wall: '#c4b48e' },
  cook: { n: 'the Cookhouse', r: [24, 40, 10, 30], floor: 'flags', wall: '#ae9c7a' },
  gov: { n: 'the Governor\u2019s Rooms', r: [-40, -24, 30, 44], floor: 'boards', wall: '#c8b892' },
  gate: { n: 'the Sally Port', r: [-24, -8, 30, 44], floor: 'flags', wall: '#b8a684' },
  apoN: { n: RF_APOS.apoN.n, r: [-8, 8, 30, 44], floor: 'flags', wall: '#c4b48e' },
  barracks: { n: 'the Barracks', r: [8, 24, 30, 44], floor: 'boards', wall: '#b8a684' },
  mess: { n: 'the Officers\u2019 Mess', r: [24, 40, 30, 44], floor: 'boards', wall: '#c8b892' },
};
const RF_SHORE = () => -23;
// its look by night, out under the sky (src/raid.js lays it out by this isle if it passes a stage's own through;
// else under the raid's, and the same layout either way)
FPS_ISLES.fort = Object.assign({}, FPS_ISLES.light, { name: 'Maren\u2019s End' });
FPI_GEN.fort = { built: true, set(H) { const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }; rfLay(H, zmKit(H, Z), Z); }, decor() {} };
function rfLay(H, K, Z) {
  {
    // far off over the sea, on the shore across the water, the Lighthouse, lit and turning (seen from the Battery)
    Z.far = { X: 120, Y: -330, shore: true };
    const { I } = H, OX = FPSC.CX, OY = FPSC.CY, RT = RFC.RT, WH = RFC.WH;
    const { W, put, light, lamp, wall, room, buy, perk, spot } = K;
    const ZZ = RF_ZONES, ST = { mat: 'stone', hh: WH, cap: true }, PL = k => ({ mat: 'plaster', col2: ZZ[k].wall, hh: WH });
    const vput = (k, x, y, a, o) => FPI_K[k] ? put(k, x, y, a, o) : null;
    for (const k of Object.keys(ZZ)) if (!ZZ[k].sky) room(k);
    // the flat roofs over the ranges, at the walls' tops
    for (const [x0, x1, y0, y1] of [[-40, -24, -22, 30], [24, 40, -22, 30], [-40, 40, 30, 44]]) put('ceil', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0 + 0.5, d: y1 - y0 + 0.5, z0: WH - 0.25, col: '#6e6452', beams: false });
    // ---------- the outer walls ----------
    wall(-40, -22, -40, 44, ST, [{ at: -16, k: 'win', out: -1, z: 'store' }, { at: -4, k: 'win', out: -1, z: 'apoW' }, { at: 4, k: 'win', out: -1, z: 'apoW' },
      { at: 15, k: 'win', out: -1, z: 'chapel' }, { at: 25, k: 'win', out: -1, z: 'chapel' }, { at: 37, k: 'win', out: -1, z: 'gov' }]);
    wall(40, -22, 40, 44, ST, [{ at: -16, k: 'win', out: 1, z: 'guard' }, { at: -4, k: 'win', out: 1, z: 'apoE' }, { at: 4, k: 'win', out: 1, z: 'apoE' },
      { at: 15, k: 'win', out: 1, z: 'cook' }, { at: 25, k: 'win', out: 1, z: 'cook' }, { at: 37, k: 'win', out: 1, z: 'mess' }]);
    wall(-40, 44, 40, 44, ST, [{ at: -32, k: 'win', out: 1, z: 'gov' }, { at: 0, k: 'win', out: 1, z: 'apoN' }, { at: 12, k: 'win', out: 1, z: 'barracks' },
      { at: 20, k: 'win', out: 1, z: 'barracks' }, { at: 32, k: 'win', out: 1, z: 'mess' }]);
    // the sea front: the two ranges' ends over the rocks (the drowned wade up out of the water to their windows)
    wall(-40, -22, -24, -22, ST, [{ at: -32, k: 'win', out: -1, z: 'store', shore: true }]);
    wall(24, -22, 40, -22, ST, [{ at: 32, k: 'win', out: -1, z: 'guard', shore: true }]);
    // and between them the sea wall, under the Battery: only a parapet stands over its top, broken by four
    // embrasures; the drowned come up iron ladders out of the sea and in over the gun platforms there
    const EMB = [-15, -5, 5, 15];
    wall(-24, -22, 24, -22, { mat: 'stone', hh: RT + 1.05, cap: true }, EMB.map(at => ({ at, k: 'gap', w: 1.8 })));
    for (const x of EMB) {
      const [wx, wy] = W(x, -22);
      Z.windows.push({ x: wx, y: wy, nx: 0, ny: -1, zone: 'battery', z: RT, boards: 0, sea: true, id: Z.windows.length, q: [], hw: 0.9, th: 0.25 });
      put('ladder', x, -22.32, Math.PI, { top: RT });
    }
    // ---------- round the Plaza ----------
    wall(-24, -22, -24, 30, ST, [{ at: -12, k: 'arch', w: 2.4 }, { at: -5, k: 'glass' }, { at: 0, k: 'arch' }, { at: 5, k: 'glass' }, { at: 14, k: 'glass' }, { at: 20, k: 'arch' }, { at: 26, k: 'glass' }]);
    wall(24, -22, 24, 30, ST, [{ at: -12, k: 'arch', w: 2.4 }, { at: -5, k: 'glass' }, { at: 0, k: 'arch' }, { at: 5, k: 'glass' }, { at: 14, k: 'glass' }, { at: 20, k: 'arch' }, { at: 26, k: 'glass' }]);
    wall(-40, 30, 40, 30, ST, [{ at: -32, k: 'arch' }, { at: -20, k: 'glass' }, { at: -16, k: 'arch', w: 3 }, { at: -5, k: 'glass' }, { at: 0, k: 'arch' }, { at: 5, k: 'glass' },
      { at: 16, k: 'arch', w: 3 }, { at: 20, k: 'glass' }, { at: 32, k: 'arch' }]);
    // ---------- between the rooms ----------
    wall(-40, -10, -24, -10, PL('store')); wall(-40, 10, -24, 10, PL('apoW'));
    wall(24, -10, 40, -10, PL('guard')); wall(24, 10, 40, 10, PL('apoE'));
    wall(-24, 30, -24, 44, PL('gov'), [{ at: 37, k: 'arch' }]);
    wall(-8, 30, -8, 44, PL('gate')); wall(8, 30, 8, 44, PL('barracks'));
    wall(24, 30, 24, 44, PL('mess'), [{ at: 37, k: 'arch' }]);
    // ---------- the Plaza de Armas: flagstones, the cistern, braziers ----------
    put('floor', 0, 8, 0, { w: 47.6, d: 43.8, style: 'flags' });
    put('well', 0, 14, 0.4, { r: 1.3, lamp: true }); light(1.3, 14.6, 1.0, '#ffc070', 7, 'lantern');
    for (const [x, y] of [[-12, 2], [12, 2], [-12, 22], [12, 22]]) { put('brazier', x, y, 0, {}); light(x, y, 1.9, '#ff8a30', 11, 'fire'); }
    for (const [x, y, a] of [[-21.5, 27.5, 0.3], [21.5, 27.5, -0.2], [-21.8, -11.6, 0], [21.8, -11.6, 0.4]]) put('rfballs', x, y, a, {});
    fpiBarrels(H, OX - 22.4, OY + 11); fpiBarrels(H, OX + 22.4, OY + 9); put('cart', 19, 18, 0.5, {});
    put('flagpole', 0, 26.5, 0, {});
    for (const [x, y, a] of [[-23.4, 8, Math.PI / 2], [23.4, 8, -Math.PI / 2], [-6, 29.5, 0], [6, 29.5, 0]]) put('wlamp', x, y, a, { z: 2.6 });
    buy('avtomat', 1200, -10, 29.7, 0, -1); buy('harpoon', 1000, 10, 29.7, 0, -1);
    // ---------- the Sea Battery: up a grand stair from the Plaza, its guns over the sea ----------
    put('step', 0, -18, 0, { w: 48, d: 8, hh: RT, col: '#7e745f' });
    for (let n = 1; n <= 16; n++) {
      put('step', 0, -6 - (n - 0.5) * 0.5, 0, { w: 6, d: 0.54, hh: n * RT / 16, col: '#857a64' });
      for (const s of [-1, 1]) put('step', s * 15, -6 - (n - 0.5) * 0.5, 0, { w: 3.6, d: 0.54, hh: n * RT / 16, col: '#857a64' });
    }
    for (const x of [-20, -10, 0, 10, 20]) put('cannon', x, -20.4, -Math.PI / 2, { len: 2.6, lift: RT });
    for (const [x, y] of [[-12.5, -15.2], [12.5, -15.2]]) put('rfballs', x, y, 0, { lift: RT });
    for (const s of [-1, 1]) { put('rfgarita', s * 22.9, -20.9, 0, { lift: RT, solid: true }); put('rfgarita', s * 40, -22, 0, { lift: WH }); put('rfgarita', s * 40, 44, 0, { lift: WH }); }
    for (const x of [-18, -6, 6, 18]) { put('post', x, -14.5, 0, { r: 0.12, hh: 2.4, lamp: true, lift: RT }); light(x + 0.5, -14.5, RT + 2.1, '#ffc070', 9, 'lantern'); }
    // ---------- the sea, and the rocks in it ----------
    {
      Z.bay = true; Z.decks = [];
      put('seaguard', 0, -44, 0, { w: 120, d: 43 });
      for (const [x, y, w, hh, gl] of [[-30, -34, 2.6, 1.8, 1], [34, -36, 2.2, 1.4, 0], [-12, -52, 2.0, 1.2, 1], [22, -55, 2.8, 2.0, 0], [-42, -48, 2.4, 1.5, 0], [6, -64, 3.0, 2.2, 1]]) put('gullrock', x, y, w * 2, { w, d: w * 0.8, hh, gull: !!gl, lean: (x % 3) * 0.05 });
    }
    // ---------- the three apothecaries ----------
    const apo = (k, cx, cy, ax) => {
      const A = RF_APOS[k], c = A.c;
      light(cx, cy, 1.5, c, 8, 'lantern');
      lamp(cx + (ax ? 0 : -4), cy + (ax ? -4 : 0), 3.2, '#ffc070'); lamp(cx + (ax ? 0 : 4), cy + (ax ? 4 : 0), 3.2, '#ffc070');
    };
    // San Telmo (west): the door in from the Plaza at its east side
    for (const x of [-36.6, -32, -27.4]) { put('rfcab', x, 9.5, 0, { w: 3.2, c: RF_APOS.apoW.c }); put('rfcab', x, -9.5, Math.PI, { w: 3.2, c: RF_APOS.apoW.c }); }
    put('rfcab', -39.5, 0, Math.PI / 2, { w: 2.6, c: RF_APOS.apoW.c });
    put('rfcounter', -31, 0, Math.PI / 2, { w: 4.4, c: RF_APOS.apoW.c });
    for (const y of [-5.5, 5.5]) put('rfglobe', -25.1, y, 0, { c: RF_APOS.apoW.c });
    put('herbs', -31, -4.5, 0, { w: 8, z: 3.2 }); put('herbs', -31, 4.5, 0, { w: 8, z: 3.2 });
    apo('apoW', -32, 0, true);
    // Santa Bárbara (east)
    for (const x of [36.6, 32, 27.4]) { put('rfcab', x, 9.5, 0, { w: 3.2, c: RF_APOS.apoE.c }); put('rfcab', x, -9.5, Math.PI, { w: 3.2, c: RF_APOS.apoE.c }); }
    put('rfcab', 39.5, 0, -Math.PI / 2, { w: 2.6, c: RF_APOS.apoE.c });
    put('rfcounter', 31, 0, -Math.PI / 2, { w: 4.4, c: RF_APOS.apoE.c });
    for (const y of [-5.5, 5.5]) put('rfglobe', 25.1, y, 0, { c: RF_APOS.apoE.c });
    put('herbs', 31, -4.5, 0, { w: 8, z: 3.2 }); put('herbs', 31, 4.5, 0, { w: 8, z: 3.2 });
    apo('apoE', 32, 0, true);
    // San Lázaro (north)
    for (const y of [34.5, 40.5]) { put('rfcab', -7.5, y, Math.PI / 2, { w: 3.6, c: RF_APOS.apoN.c }); put('rfcab', 7.5, y, -Math.PI / 2, { w: 3.6, c: RF_APOS.apoN.c }); }
    for (const x of [-4.4, 4.4]) put('rfcab', x, 43.5, 0, { w: 2.6, c: RF_APOS.apoN.c });
    put('rfcounter', 0, 37, 0, { w: 4.6, c: RF_APOS.apoN.c });
    for (const x of [-3.2, 3.2]) put('rfglobe', x, 30.9, 0, { c: RF_APOS.apoN.c });
    put('herbs', 0, 40.5, 0, { w: 10, z: 3.2 });
    apo('apoN', 0, 37, false);
    // ---------- the Powder Magazine ----------
    fpiBarrels(H, OX - 38.6, OY - 20.6); fpiBarrels(H, OX - 25.4, OY - 20.6); fpiBarrels(H, OX - 38.6, OY - 11.4);
    put('rfballs', -31, -11.2, 0, {}); put('rfballs', -35, -15, 0.3, {}); fpiCrates(H, OX - 28, OY - 16, true);
    lamp(-32, -16, 3.2, '#ffb060');
    buy('blunderbuss', 500, -39.7, -11.5, 1, 0);
    // ---------- the Guardroom ----------
    put('table', 32, -16, 0, { w: 3.4, d: 1.2 }); put('bench', 32, -17.2, 0, { w: 3 }); put('bench', 32, -14.8, 0, { w: 3 });
    put('rack', 39.3, -14, Math.PI / 2, { len: 3 }); put('rack', 26, -21.3, 0, { len: 3 });
    lamp(32, -16, 3.2); buy('longarm', 500, 39.7, -19.5, -1, 0);
    // ---------- the Chapel of Our Lady of the Sea ----------
    for (const y of [14, 17, 20, 23]) for (const x of [-35.5, -29.5]) { if (!vput('vpew', x, y, Math.PI, { w: 3.6 })) put('bench', x, y, 0, { w: 3.6 }); }
    put('table', -32, 27.6, 0, { w: 3, d: 1.0, cloth: '#e8e0d0' }); put('step', -32, 27.6, 0, { w: 6, d: 3.2, hh: 0.2 });
    put('cross', -32, 29.3, 0, {}); put('rug', -32, 19, Math.PI / 2, { w: 16, d: 2, c: '#5a2a2a' });
    light(-33, 27.6, 1.3, '#ffd090', 6, 'lantern'); light(-31, 27.6, 1.3, '#ffd090', 6, 'lantern'); lamp(-32, 16, 3.2);
    spot(-39.2, 20, 1, 0, 0, 'chapel');
    // ---------- the Cookhouse ----------
    put('stove', 39.2, 20, -Math.PI / 2, {}); light(38.7, 20, 0.5, '#ff8a30', 7, 'fire');
    put('table', 31, 18, 0, { w: 4, d: 1.4 }); put('shelf', 31, 10.6, Math.PI, { w: 3, goods: 'jars' }); fpiPots(H, OX + 26, OY + 12); put('sacks', 26, 27.5, 0.2, { c: '#6a5a40' });
    put('herbs', 31, 22, 0, { w: 6, z: 3.0 }); lamp(31, 18, 3.2);
    spot(39.2, 26, -1, 0, 0, 'cook');
    // ---------- the Governor's Rooms ----------
    put('rug', -32, 37, 0, { w: 7, d: 4, c: '#3e2a4a' }); put('table', -32, 37.5, 0, { w: 2.6, d: 1.2 }); put('globe', -26, 42.6, 0, {});
    vput('vbookcase', -36.5, 43.75, 0, { w: 3, goods: 'books' });
    put('picture', -39.73, 41, Math.PI / 2, { z: 2.0, w: 1.4, h: 1.0, c: '#b8a878', sea: true });
    lamp(-32, 37, 3.2);
    if (typeof zmpPlace === 'function') zmpPlace(put, light, W, Z, { x: -28, y: 43.25, z: 0, nx: 0, ny: -1, zone: 'gov' });   // [pap] the Lampwright's Bench
    // ---------- the Sally Port: the great door you came in by, shut behind you ----------
    put('rfgreatdoor', -16, 43.6, 0, { w: 3.2 });
    put('bench', -22.8, 37, Math.PI / 2, { w: 2.4 }); fpiBarrels(H, OX - 9.4, OY + 42.6);
    lamp(-16, 37, 3.2); wl0(put, light, -16, 30.4, 0, 1);
    buy('pepperbox', 250, -8.3, 40, -1, 0); buy('longarm', 500, -23.7, 33, 1, 0);
    // ---------- the Barracks ----------
    for (const x of [11, 15, 19]) { put('table', x, 41.8, 0, { w: 1.1, d: 2.2 }); put('table', x, 33.5, 0, { w: 1.1, d: 2.2 }); }
    put('rack', 23.3, 37, -Math.PI / 2, { len: 3 }); lamp(16, 37.5, 3.2);
    // ---------- the Officers' Mess ----------
    put('table', 32, 37, 0, { w: 5, d: 1.4, cloth: '#5a2a2a' }); put('bench', 32, 35.8, 0, { w: 4.4 }); put('bench', 32, 38.2, 0, { w: 4.4 });
    put('picture', 39.73, 37, -Math.PI / 2, { z: 2.0, w: 1.6, h: 1.1, c: '#a89070' }); lamp(32, 37, 3.2);
    // (no tonics here: in Maren's End you go without)
    // ---------- the headland round the fort: grass and stones ----------
    { const rr = seeded(0x51a3); let n = 0;
      for (let t = 0; t < 4000 && n < 420; t++) {
        const x = (rr() - 0.5) * 170, y = (rr() - 0.5) * 150;
        if ((Math.abs(x) < 41 && y > -23 && y < 45) || Math.hypot(x, y) > FPSC.R - 4 || y < ZM_SHORE(x) + 1) continue;
        H.decor('tuft', OX + x, OY + y, { s: 0.7 + rr() * 0.8, c: rr() < 0.5 ? '#4e6a38' : '#5e7040' }); n++;
      }
      for (let i = 0; i < 18; i++) { const a = rr() * 6.283, d = 50 + rr() * 30, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9; if (Math.hypot(x, y) < FPSC.R - 6 && y > ZM_SHORE(x) + 2 && !(Math.abs(x) < 44 && y < 48)) put('stone', x, y, rr() * 6.283, { w: 0.6 + rr() * 0.8, d: 0.5 + rr() * 0.6, hh: 0.3 + rr() * 0.5 }); }
    }
    Z.glass = (Z.glassQ || []).slice();
  }
}
// a lamp on a wall, its light just out from it (as Wrackhaven's)
function wl0(put, light, x, y, nx, ny, z) { put('wlamp', x, y, Math.atan2(-nx, ny), { z: z || 2.3 }); light(x + nx * 0.42, y + ny * 0.42, (z || 2.3) + 0.05, '#ffc070', 9, 'lantern'); }

// =====================================================================================================================
// the stage
// =====================================================================================================================
RAID_STAGES.fort = {
  n: 'Maren’s End', mend: true,   // (up here you mend as at the Lighthouse: no braziers)
  map: { start: RF_START.slice(), top: 0, zones: RF_ZONES, nav: [-46, 46, -24, 50], isle: 'fort', shore: RF_SHORE },
  set: (H, K, Z) => rfLay(H, K, Z),
  enter: () => rfEnter(),
  tick: dt => rfTick(dt),
  me: dt => rfMe(dt),
  pack: o => rfPack(o),
  apply: o => rfApply(o),
  q: (sid, k, a) => { if (k === 'orb') rfOrbHit(sid, a); },
  kill: (d, how, by) => rfKill(d, how, by),
  hurt: (d, dmg, code) => rfHurt(d, dmg, code),
  shot: (x, y, z, lh, lp, by, dmg) => rfShot(x, y, z, lh, lp, dmg),
  hud: (phone, mono, fell) => rfHud(phone, mono, fell),
  b3: grp => rf3dBuild(grp),
  f3: dt => rf3d(dt),
  exit: () => { RF.on = false; },
};
RAID_ORDER.push('fort');
const rfBox = () => RF_ZONES;   // (for tests)

// everyone, once the fort's laid out: its state made fresh; every room open to the drowned; you face the Plaza
function rfEnter() {
  Object.assign(RF, { on: true, st: 'hunt', apo: { apoW: 0, apoE: 0, apoN: 0 }, apoZ: {}, wait: 0, mz: 0, vul: 0, orbUp: false, orbGap: 0, orbT: 0, orbPh: 0, orb: [FPSC.CX, FPSC.CY - 40, 8], orbS: null, orbHp: RFC.ORB_HP, orbAcc: 0,
    bossT: RFC.BOSS_T[0], tok: null, mine: false, wonT: 0, kz: 0, angerT: 0, angered: false, grab: 0, shot: 0, spawnT: 3, t: 0, seenSt: 'hunt', burst: 0, hintT: 9 });
  if (typeof rf2Reset === 'function') rf2Reset();   // [p2] her second phase (src/raidmaren2.js)
  ZM.open = new Set(['raid'].concat(Object.keys(RF_ZONES)));
  ZM.round = Math.max(ZM.round, RFC.ROUND);
  ZB.round = ZM.round; ZB.plan = [];
  FPS.me.h = RF_FACE;
  if (typeof ztStop === 'function') ztStop(1);
}
const rfN = () => Math.max(1, ZM.hum.length);
// one of the bosses, already inside at (x, y) (a local place), facing h
function rfBoss(kind, x, y, h, jz) {
  const T = ZBT[kind], hp = kind === 'maren' ? zmHp(ZM.round) * RFC.HP * RFC.BOOST * (1 + RFC.HP_MORE * (rfN() - 1)) * zbRaidK() : zbHpOf(kind, ZM.round, rfN());
  const zn = ++ZM.zc, wx = FPSC.CX + x, wy = FPSC.CY + y;
  const z = {
    drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss',
    x: wx, y: wy, jz: jz || 0, fl: jz || 0, hp, max: hp, sp: T.sp(ZM.round),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: h || 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy,
  };
  if (T.init) T.init(z);
  zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z;
  ZB.seen.add(zn);
  return z;
}

// ---------- alone or hosting, each frame ----------
function rfTick(dt) {
  if (!RF.on) return;
  RF.t += dt;
  if (RF.practice && typeof rf2PracticeTick === 'function') rf2PracticeTick();   // [p2] practice: straight to her storm
  const P = ZM.players || [], n = rfN();
  // the drowned keep coming, in at the windows and up out of the sea (more of them once she's up)
  const alive = ZM.z.filter(z => !z.dead && !z.boss).length, cap = RFC.ALIVE[RF.st === 'hunt' ? 0 : 1] + RFC.ALIVE_MORE * (n - 1);
  RF.spawnT -= dt;
  if (RF.st !== 'won' && alive < cap && RF.spawnT <= 0) RF.spawnT = (zmSpawn() ? (RF.st === 'hunt' ? 1.7 : 1.05) : 0.5) * (0.7 + Math.random() * 0.6);
  if (RF.st === 'hunt') {
    // stepping into an apothecary wakes its keeper
    for (const k of RF_APO_IDS) if (!RF.apo[k] && P.some(p => zmZoneAt(p.x, p.y, p.jz) === k)) rfWake(k);
    if (RF_APO_IDS.every(k => RF.apo[k] === 2)) { RF.wait -= dt; if (RF.wait <= 0) rfKnock(); }
  } else if (RF.st === 'knock') {
    // the Knock keeps to the Plaza and the Battery too
    const K = ZM.z.find(z => z.zn === RF.kz);
    RF.kbrk = K && K.act === 'song' ? K.brk / K.brkMax : 0;
    if (K && !K.dead && K.act !== 'emerge') { const B = RFC.BOX; K.x = clamp(K.x, FPSC.CX + B[0], FPSC.CX + B[1]); K.y = clamp(K.y, FPSC.CY + B[2], FPSC.CY + B[3]); }
  } else if (RF.st === 'anger') {
    RF.wait -= dt; if (RF.wait <= 0) rfMaren();
  } else if (RF.st === 'maren') {
    const M = ZM.z.find(z => z.zn === RF.mz);
    if (typeof rf2Host === 'function') rf2Host(M, dt);   // [p2] at a third of her health, the storm; then the bell
    // her soul over the water: up, shot, and up again
    if (RF.vul > 0) { RF.vul -= dt; if (RF.vul <= 0) { RF.vul = 0; RF.orbGap = RFC.ORB_GAP; rfLine('Maren’s soul sinks back into the sea. She can’t be hurt again until it’s shot.'); } }
    else if (!RF.orbUp && M && !(M.act === 'rise')) { RF.orbGap -= dt; if (RF.orbGap <= 0) { RF.orbUp = true; RF.orbPh = Math.random() * 60; RF.orbHp = RFC.ORB_HP; } }
    if (RF.orbUp) { RF.orbT += dt; RF.orb = rfOrbAt(RF.orbT + RF.orbPh); }
    // now and then another of them climbs in too
    RF.bossT -= dt;
    if (RF.bossT <= 0) {
      RF.bossT = RFC.BOSS_T[0] + Math.random() * (RFC.BOSS_T[1] - RFC.BOSS_T[0]);
      const live = ZM.z.filter(z => z.boss && !z.dead && z.bt !== 'maren').length;
      if (live < 1 + Math.floor(n / 2)) zbSpawn(['diver', 'moon', 'crab'][(Math.random() * 3) | 0]);
    }
    // she keeps to the Plaza and the Battery
    if (M && !M.dead && M.act !== 'rise') { const B = RFC.BOX; M.x = clamp(M.x, FPSC.CX + B[0], FPSC.CX + B[1]); M.y = clamp(M.y, FPSC.CY + B[2], FPSC.CY + B[3]); }
  } else if (RF.st === 'won' && RF.wonT > 0) {
    RF.wonT -= dt;
    if (typeof rmvAllTook === 'function' && rmvAllTook()) RF.wonT = Math.min(RF.wonT, 2.5);   // [mvp] everyone has her token: on to the end (src/raidmvp.js)
    if (RF.wonT <= 0) { if (RF.practice) zmEnd(); else if (typeof raidWin === 'function') raidWin(); }   // [p2] (practice: no win, no rewards)
  }
}
// where her soul is at time t: drifting over the water beyond the sea wall, rising and falling
// (a third quicker than it was, and jinking: quicker wobbles laid over the long drift, so it darts and doubles back;
// the same sums on every screen)
function rfOrbAt(t) {
  const q = t * 1.35;
  return [FPSC.CX + 19 * Math.sin(q * 0.19) + 4 * Math.sin(q * 0.53) + 2.6 * Math.sin(t * 1.9 + Math.sin(t * 0.8) * 2) + 1.2 * Math.sin(t * 3.7),
    FPSC.CY - 37 - 5 * Math.sin(q * 0.27 + 1) + 1.8 * Math.sin(t * 2.3 + 0.7) * Math.sin(t * 0.61),
    FPSC.GROUND + 7.6 + 1.3 * Math.sin(q * 0.7) + 0.9 * Math.sin(t * 2.9 + Math.sin(t * 1.3) * 1.5)];
}
// a Mooncusser wakes in an apothecary
function rfWake(k) {
  const A = RF_APOS[k], z = rfBoss('moon', A.at[0], A.at[1], A.h, 0);
  z.apo = k; z.lureCd = 2.5; RF.apo[k] = 1; RF.apoZ[k] = z.zn;
  rfArrive(k);
}
function rfArrive(k) {
  ZM.banner = { text: 'The Mooncusser', t: 3.6, col: ZBT.moon.col, sub: 'keeper of ' + RF_APOS[k].n };
  fpsFeed(`In ${RF_APOS[k].n} a false light opens: its Mooncusser.`);
  ZBT.moon.sound('arrive');
}
// all three keepers down: first her bat, the Knock, up through the flagstones of the Plaza
function rfKnock() {
  const z = rfBoss('knock', RFK.AT[0], RFK.AT[1], Math.PI, RFK.DEEP);
  RF.kz = z.zn; RF.st = 'knock';
  zbStart(z, 'emerge');
  zbArrive(z);
}
// the Knock down: Maren is angered (on every screen, a moment after it falls)
function rfAngered() {
  RF.angered = true;
  ZM.banner = { text: 'Maren is angered', t: 4, col: '#ff6a7a', sub: 'out at sea, the water heaves' };
  fpsFeed('Maren is angered. Out at sea, the water heaves.');
  rfSound('anger', 0);
}
// the Knock down and her anger told: Maren comes up out of the sea onto the Battery
function rfMaren() {
  const z = rfBoss('maren', 0, -30, 0, -7);
  RF.mz = z.zn; RF.st = 'maren'; RF.orbGap = 6; RF.bossT = 20;
  zbStart(z, 'rise');
  zbArrive(z);
}
// hosting or alone: one of them sent back
function rfKill(d, how, by) {
  if (!RF.on || !d.boss) return;
  if (d.apo && RF.apo[d.apo] !== 2) {
    RF.apo[d.apo] = 2;
    const left = RF_APO_IDS.filter(k => RF.apo[k] !== 2).length;
    rfLine(left ? `The keeper of ${RF_APOS[d.apo].n} is down. ${left === 1 ? 'One apothecary' : left + ' apothecaries'} still kept.` : 'The last false light goes out. Somewhere in the Plaza, three knocks on wood.');
    if (!left) RF.wait = 4.5;
  }
  if (d.bt === 'knock' && RF.st === 'knock') {
    RF.st = 'anger'; RF.angerT = 0; RF.angered = false; RF.wait = RFC.ANGER[0] + RFC.ANGER[1];
  }
  if (d.bt === 'maren' && RF.st === 'maren') {
    RF.st = 'won'; RF.vul = 0; RF.orbUp = false; RF.wonT = 45;   // (at most: sooner once you've all taken her token)
    RF.tok = RF.practice ? null : [d.x, d.y, d.jz || 0];   // [p2] (no token from practice)
    rfLine(RF.practice ? 'Maren Holm is laid to rest. (Practice: no token, no score.)' : 'Maren Holm is laid to rest. She leaves a pirate token where she fell: one for each of you.');
    if (RF.practice) RF.wonT = 5;
    // the rest of them go back into the sea with her
    for (const z of ZM.z) if (!z.dead && !z.boss) zmKill(z, false, '', 'flash');
  }
}
// a line for everyone's feed
function rfLine(s) { fpsFeed(s); if (ZM.net === 'host' && typeof zmnEvent === 'function') zmnEvent('feed', s); }
// how much a hit on one of them does (the shooter's side): nothing on Maren while her soul's out of her
function rfHurt(d, dmg, code) {
  if (!RF.on || !d || !d.boss) return dmg;
  if (d.bt === 'maren' && !(RF.vul > 0)) { d.ward = 0.35; return 0; }
  if (typeof raidBossDamage === 'function') raidBossDamage(dmg * (ZM_DMG[code] == null ? 1 : ZM_DMG[code]));
  return dmg;
}
// hosting or alone: someone's shots hit her soul (dmg of its thirty); burst, she can be hurt
function rfOrbHit(sid, dmg) {
  if (RF.st !== 'maren' || !RF.orbUp) return;
  RF.orbHp -= clamp(+dmg || 0, 0, 40);
  if (RF.orbHp > 0) return;
  RF.orbHp = 0; RF.orbUp = false; RF.vul = RFC.VUL; RF.burst = 1;
  const who = sid === FPS.me.id ? 'You' : ((ZM.hum.find(h => h[0] === sid) || [])[1] || 'Someone');
  rfLine(`${who} shot Maren’s soul. She can be hurt: thirty seconds.`);
  rfBurst();
}
// my own shot: through her soul? (the line from the muzzle, against a ball round it, with nothing solid between)
function rfShot(x, y, z, lh, lp, dmg) {
  if (RF.st !== 'maren' || !RF.orbUp) return;
  const [ox, oy, oz] = RF.orb, cp = Math.cos(lp), dx = Math.sin(lh) * cp, dy = Math.cos(lh) * cp, dz = Math.sin(lp);
  const qx = ox - x, qy = oy - y, qz = oz - z, t = qx * dx + qy * dy + qz * dz;
  if (t < 0 || t > 420) return;
  const miss = Math.hypot(qx - dx * t, qy - dy * t, qz - dz * t);
  if (miss > RFC.ORB_R) return;
  const r = fpsRay(x, y, z, lh, lp, FPS.me.id, [], t);
  if (r.kind !== 'none' && r.t < t - 0.6) return;
  FPS.hitT = 0.25; FPS.hitHead = true; fpsHitSound(true);
  if (typeof rmvAdd === 'function') rmvAdd('so');   // [mvp]
  dmg = dmg == null ? 1 : dmg;
  // (joined: what I've done to it gathers here and goes to the host every few frames; meanwhile it shows here at once)
  if (ZM.net === 'client') { RF.orbAcc = (RF.orbAcc || 0) + dmg; RF.orbHp = Math.max(0, RF.orbHp - dmg); }
  else rfOrbHit(FPS.me.id, dmg);
}
// her soul bursting: gold sparks, and the sea flaring under it
function rfBurst() {
  const [ox, oy, oz] = RF.orb;
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, r = 0.6 + Math.random() * 1.6; fpsPuff(ox + Math.cos(a) * r, oy + Math.sin(a) * r, oz + (Math.random() - 0.5) * 2, '255,226,120', 3); }
  rfSound('orb', Math.hypot(ox - FPS.me.x, oy - FPS.me.y));
  ZM.banner = { text: 'Maren can be hurt', t: 3.2, col: '#ffe27a', sub: 'her soul is struck: thirty seconds', small: true };
}

// ---------- everyone, each frame ----------
function rfMe(dt) {
  if (!RF.on) return;
  const m = FPS.me;
  if (RF.shot > 0) RF.shot -= dt; if (RF.orbAcc > 0 && RF.shot <= 0) { RF.shot = RFC.ORB_SEND; raidAsk('orb', RF.orbAcc); RF.orbAcc = 0; }
  if (RF.grab > 0) RF.grab -= dt; if (RF.hintT > 0) RF.hintT -= dt;
  if (typeof rf2Me === 'function' && RF.bell) rf2Me(dt);   // [p2]
  if (RF.st === 'anger') { RF.angerT += dt; if (!RF.angered && RF.angerT >= RFC.ANGER[0]) rfAngered(); }
  if (ZM.net === 'client' && RF.vul > 0) RF.vul = Math.max(0, RF.vul - dt);
  // joined: her soul glides between the host's words
  if (ZM.net === 'client' && RF.orbS) { const k = Math.min(1, dt * 8); for (let i = 0; i < 3; i++) RF.orb[i] += (RF.orbS[i] - RF.orb[i]) * k; }
  // her pirate token: walk over it and it's yours
  if (RF.tok && !RF.mine && !(m.dead > 0) && Math.hypot(m.x - RF.tok[0], m.y - RF.tok[1]) < 1.9 && Math.abs((m.jz || 0) - RF.tok[2]) < 1.5) {
    RF.mine = true; RF.grab = 6;
    if (typeof ptGrant === 'function') ptGrant();
    if (typeof cloudSaveSoon === 'function') try { cloudSaveSoon(); } catch (e) {}
    fpsFeed('You take Maren’s pirate token: yours to keep.');
    rfSound('token', 0);
  }
}

// ---------- together ----------
// (hosting) f: [stage state, each apothecary's state (0 kept, 1 awake, 2 down), her soul's thirty seconds (tenths),
// soul up, its place (tenths, from the island's middle), the token (and its place), Maren's number, the keepers' numbers]
function rfPack(o) {
  if (!RF.on) return;
  const CX = FPSC.CX, CY = FPSC.CY, r10 = v => Math.round(v * 10);
  o.f = [RF_ST.indexOf(RF.st), RF_APO_IDS.reduce((a, k, i) => a + (RF.apo[k] | 0) * Math.pow(3, i), 0), r10(RF.vul), RF.orbUp ? 1 : 0, r10(RF.orb[0] - CX), r10(RF.orb[1] - CY), r10(RF.orb[2]),
    RF.tok ? 1 : 0, RF.tok ? r10(RF.tok[0] - CX) : 0, RF.tok ? r10(RF.tok[1] - CY) : 0, RF.tok ? r10(RF.tok[2]) : 0, RF.mz | 0].concat(RF_APO_IDS.map(k => RF.apoZ[k] | 0), [Math.round(clamp(RF.kbrk || 0, 0, 1) * 1000), r10(RF.orbHp || 0)], rf2Pack());   // [p2] (and her second phase's: src/raidmaren2.js)
}
// (joined) the host's word of it: and what's changed is shown here as it would be there
function rfApply(o) {
  if (!RF.on || !o || !Array.isArray(o.f)) return;
  const f = o.f.map(v => +v || 0), CX = FPSC.CX, CY = FPSC.CY;
  const st = RF_ST[f[0] | 0] || 'hunt';
  if (st === 'anger' && RF.st !== 'anger') { RF.angerT = 0; RF.angered = false; }
  RF_APO_IDS.forEach((k, i) => {
    const v = Math.floor(f[1] / Math.pow(3, i)) % 3, zn = f[12 + i] | 0;
    if (zn && !RF.apoZ[k]) { RF.apoZ[k] = zn; ZB.seen.add(zn); }   // (his coming is told here, not as one up out of the sea)
    if (v >= 1 && !RF.apo[k]) rfArrive(k);
    RF.apo[k] = v;
  });
  const vul = f[2] / 10;
  if (vul > 0 && !(RF.vul > 0)) { RF.orbUp = true; rfBurst(); }
  RF.vul = vul; RF.orbUp = !!f[3];
  RF.orbS = [CX + f[4] / 10, CY + f[5] / 10, f[6] / 10];
  if (!RF.orbUp) RF.orb = RF.orbS.slice();
  RF.tok = f[7] ? [CX + f[8] / 10, CY + f[9] / 10, f[10] / 10] : null;
  RF.mz = f[11] | 0; RF.st = st; RF.kbrk = (f[15] || 0) / 1000;
  // (her soul's health: the host's, less what I've hit it for and not yet sent)
  if (f[16] != null) RF.orbHp = Math.max(0, f[16] / 10 - (RF.orbAcc || 0));
  if (f[17] != null) rf2Apply(f, 17);   // [p2]
}

// =====================================================================================================================
// Maren Holm: a boss of her own, on src/zmboss.js's framework
// =====================================================================================================================
// rise: up out of the sea and over the sea wall onto the Battery (4 s, nothing hurts her blows yet); sweep: her arm
// through whoever's close; call: her arm raised as in her picture, a ring on the floor round one of you, and the sea
// comes up through it
// (each of her blows takes half your health: rfHalf)
const rfHalf = () => Math.max(1, Math.ceil((ZM.perks && ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP) / 2));
const RFM_T = { rise: { hit: 99, end: 4.2 }, sweep: { hit: 0.62, end: 1.1 }, call: { hit: 1.6, end: 2.1 }, smash: { hit: 0.8, end: 1.3 }, wrath: { hit: 99, end: 4.6 } };   // (wrath: her storm call, src/raidmaren2.js)
ZB_KINDS.push('maren');
for (const a of ['sweep', 'call', 'rise', 'wrath']) if (!ZB_ACT.includes(a)) ZB_ACT.push(a);
const RF_RISE = [[0, -30, -7], [0, -24.5, 2.2], [0, -18.5, RFC.RT]];   // (where she comes up: local x, y, height)
ZBT.maren = {
  n: 'Maren Holm', N: 'Maren Holm', sub: 'drowned, and not at rest', col: '#9ae8d8', warn: '120,255,220', big: 'call', puff: '120,200,190',
  get bar() { return RF.vul > 0 ? ['#7a1a2a', '#ff6a7a'] : ['#3a5a62', '#a8d8d8']; },
  hp: RFC.HP, pts: RFC.PTS, rad: RFC.RAD, tall: RFC.TALL, headZ: RFC.HEADZ, pad: RFC.PAD, crowd: 1.7, near: 3.2, through: 1.6, scale: 1.6,
  sp: () => RFC.SP,
  win: () => false,
  acts: RFM_T,
  noFlash: () => !(RF.vul > 0),
  arriveLine: () => 'Out of the sea and over the wall onto the Sea Battery: Maren Holm. Shoot her soul, the light over the water, and she can be hurt.',
  smashLine: () => '',
  killLine: (who, pts) => `${who} laid Maren Holm to rest (+${pts}).`,
  init(z) { z.callCd = 3; },
  cool(z, dt) { if (z.callCd > 0) z.callCd -= dt; },
  think(z, p, d, dz, level) {
    if (level && d < RFC.SWEEP - 0.4 && z.swCd <= 0) return 'sweep';
    if (d < RFC.CALL_RANGE && z.callCd <= 0) return 'call';
    return null;
  },
  start(z, act, p) {
    const q = RF.p2 ? RF2.CD : 1;   // [p2] (quicker, in her second phase)
    if (act === 'sweep') z.swCd = (0.9 + Math.random() * 0.4) * q;
    if (act === 'call') { z.callCd = ((RF.vul > 0 ? 2.2 : 3) + Math.random() * 1.2) * q; z.swCd = Math.max(z.swCd, 0.5); if (p) { z.ix = p.x; z.iy = p.y; } }
  },
  during(z, dt, nearest) {
    const T = RFM_T[z.act];
    // [p2] her storm call: up off the floor, arms raised, and down again at the end
    if (z.act === 'wrath') { const k = Math.min(1, z.at / T.end), w0 = z.wj0 != null ? z.wj0 : z.fl || 0; z.jz = w0 + RF2.LIFT * Math.sin(Math.min(1, k * 2.5) * Math.PI / 2) * (k > 0.85 ? (1 - k) / 0.15 : 1); return; }
    if (z.act === 'rise') {
      // (up out of the water, over the wall, and down onto the Battery)
      const k = Math.min(1, z.at / T.end), i = k < 0.6 ? 0 : 1, q = i ? (k - 0.6) / 0.4 : k / 0.6, e = zbE(q), a = RF_RISE[i], b = RF_RISE[i + 1];
      z.x = FPSC.CX + zbL(a[0], b[0], e); z.y = FPSC.CY + zbL(a[1], b[1], e); z.jz = zbL(a[2], b[2], e) + (i ? Math.sin(q * Math.PI) * 1.2 : 0);
      z.h = 0; z.fl = RFC.RT;
      if (z.at + dt >= T.end) { z.jz = RFC.RT; z.fl = RFC.RT; z.lx = z.x; z.ly = z.y; }
      return;
    }
    const p = nearest(z.x, z.y, z.jz);
    if (!p) return;
    if (z.act === 'sweep' && z.at < T.hit * 0.75) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 3.5);
    if (z.act === 'call') {
      z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 2);
      // (the ring follows whoever it's for, for the first half; then it's set)
      if (z.at < T.hit * 0.5) { const k = Math.min(1, dt * 5); z.ix += (p.x - z.ix) * k; z.iy += (p.y - z.iy) * k; }
    }
  },
  strike(z) {
    const m = FPS.me, G0 = FPSC.GROUND;
    if (z.act === 'sweep') { rfSound('sweep', Math.hypot(z.x - m.x, z.y - m.y)); zbMelee(z, RFC.SWEEP, RFC.SWEEP_ARC, rfHalf()); return; }
    if (z.act !== 'call') return;
    const ix = z.ix, iy = z.iy, iz = zmFloorAt(ix, iy, 12, 0.3), dm = Math.hypot(ix - m.x, iy - m.y);
    rfSound('erupt', dm);
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, r = RFC.CALL_R * (0.2 + Math.random() * 0.8); fpsPuff(ix + Math.cos(a) * r, iy + Math.sin(a) * r, G0 + iz + 0.2 + Math.random() * 1.6, '150,220,210', 3); }
    z.wave = 0.01;
    const grounded = (m.jz || 0) - (m.fl || 0) < 0.25 && !((m.vz || 0) > 0.5);
    if (zbOk() && dm < RFC.CALL_R && Math.abs((m.jz || 0) - iz) < 1.3 && grounded) { fpsHurt(rfHalf(), null, null); zmSound('hit'); FPS.hurtT = 0.9; FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.25, -0.8, 0.8); }
  },
  after(z, a) { if (a === 'rise') { z.st = 'in'; z.jz = z.fl = RFC.RT; zmSettle(z); } if (a === 'wrath') z.jz = z.fl || 0; },
  // (while her soul's out of her nothing touches her; struck, the Lamp burns her at half the rate)
  // (and in her second phase: nothing while she calls the storm, then three quarters of every hit) [p2]
  hurtK: (z, how) => RF.vul > 0 && z.act !== 'wrath' ? (how === 'burn' ? 0.5 : 1) * (RF.p2 ? RF2.RESIST : 1) : 0,
  endOf: (z, act) => RFM_T[act] ? RFM_T[act].end : 0,
  actSound(z, act) {
    const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y);
    if (act === 'call') rfSound('call', d);
    else if (act === 'wrath') { rfSound('wrath', d); for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, r = 1 + Math.random() * 4; fpsPuff(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, FPSC.GROUND + (z.jz || 0) + Math.random() * 6, '140,215,255', 4); } }   // [p2]
    else if (act === 'rise') {
      rfSound('rise', d);
      // (the sea bursts up where she comes)
      const x = FPSC.CX + RF_RISE[0][0], y = FPSC.CY + RF_RISE[0][1];
      for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, r = Math.random() * 3.5; fpsPuff(x + Math.cos(a) * r, y + Math.sin(a) * r, FPSC.GROUND + ZMD.WATER + Math.random() * 9, '150,220,210', 4); }
    }
  },
  sound: (k, d) => rfSound(k, d),
  build: () => rfBuildMaren(),
  reset(z, M) { M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1); M.root.visible = true; },
  pose: (z, M, dt) => rfPoseMaren(z, M, dt),
};
// her sounds, and the stage's: from the recordings where there's one (src/sfxbank.js), else Maren's own whisper and
// sting from the sea (src/audio.js)
function rfSound(k, d) {
  const v = clamp(1 - (d || 0) / 70, 0.15, 1), play = (n, vol) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, { vol: vol * v, vary: 0.05 }); } catch (e) { return false; } };
  const whisper = vol => { try { if (typeof sfxWhisper === 'function') sfxWhisper(0, vol * v); } catch (e) {} };
  const sting = () => { try { if (typeof sfxSting === 'function') sfxSting(); } catch (e) {} };
  if (k === 'arrive' || k === 'rise') { play('thunder', 0.9); play('splash', 0.8); whisper(1); if (k === 'arrive') sting(); return; }
  if (k === 'groan') { whisper(0.55); return; }
  if (k === 'sweep') { play('swish', 0.9); return; }
  if (k === 'call') { whisper(0.9); play('sea', 0.6); return; }
  if (k === 'erupt') { play('splash', 1); play('slam', 0.6); return; }
  if (k === 'die') { play('thunder', 1); sting(); whisper(1); return; }
  if (k === 'wrath') { play('sea', 1); sting(); whisper(1); return; }
  if (k === 'anger') { play('thunder', 1); play('sea', 0.8); sting(); whisper(1); return; }
  if (k === 'orb') { play('powerup', 0.9); sting(); return; }
  if (k === 'token') { play('pickup', 1); play('chest', 0.6); return; }
}

// ---------- her model: built after her picture ----------
// A drowned woman three times the height of a man: a long dark dress, close at the waist and flaring to a hem torn
// ragged by the sea, that hides her feet (she glides); a dark bodice; bare grey arms, her right one raised and bent
// over her head as in the picture; long hair down her back; her face lost in shadow but for two pale points. While
// her soul's out of her a sea-green light hangs about her; struck, it's gone and she's flushed with red.
const RFMG = {};
function rfMarenGeo() {
  if (RFMG.ok) return RFMG;
  const Q = RFMG;
  Q.skirt = new THREE.CylinderGeometry(0.2, 0.66, 1.08, 26, 5, true); Q.skirt.translate(0, 0.54, 0);
  { const P = Q.skirt.attributes.position, rnd = seeded(0x3a7e); for (let i = 0; i < P.count; i++) { const y = P.getY(i), a = Math.atan2(P.getZ(i), P.getX(i)); if (y < 0.02) P.setY(i, y + rnd() * 0.16 + 0.04 * Math.sin(a * 7)); const k = 1 + (y < 0.5 ? 0.06 * Math.sin(a * 5 + y * 6) : 0); P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k * (y > 0.7 ? 0.82 : 0.92)); } Q.skirt.computeVertexNormals(); }
  Q.hips = new THREE.SphereGeometry(0.25, 16, 12);
  Q.waist = new THREE.CylinderGeometry(0.17, 0.15, 0.34, 16); Q.waist.translate(0, 0.17, 0);
  Q.chest = new THREE.SphereGeometry(0.21, 16, 12);
  Q.shoul = new THREE.CylinderGeometry(0.075, 0.075, 0.44, 10); Q.shoul.rotateZ(Math.PI / 2);
  Q.neck = new THREE.CylinderGeometry(0.05, 0.06, 0.14, 10);
  Q.head = new THREE.SphereGeometry(0.115, 16, 12);
  Q.hair = new THREE.CylinderGeometry(0.12, 0.2, 0.62, 12, 2, true); Q.hair.translate(0, -0.31, 0);
  { const P = Q.hair.attributes.position, rnd = seeded(0x41a); for (let i = 0; i < P.count; i++) { if (P.getY(i) < -0.55) P.setY(i, P.getY(i) + rnd() * 0.18); } Q.hair.computeVertexNormals(); }
  Q.up = new THREE.CylinderGeometry(0.042, 0.036, 0.3, 8); Q.up.translate(0, -0.15, 0);
  Q.fore = new THREE.CylinderGeometry(0.034, 0.026, 0.28, 8); Q.fore.translate(0, -0.14, 0);
  Q.hand = new THREE.SphereGeometry(0.038, 8, 6); Q.hand.scale(0.8, 1.5, 0.5);
  Q.finger = new THREE.CylinderGeometry(0.008, 0.005, 0.09, 4); Q.finger.translate(0, -0.045, 0);
  Q.eye = new THREE.SphereGeometry(0.014, 6, 5);
  Q.weed = new THREE.BoxGeometry(0.02, 0.36, 0.006); Q.weed.translate(0, -0.18, 0);
  Q.ring = new THREE.TorusGeometry(0.5, 0.05, 6, 40); Q.ring.rotateX(Math.PI / 2);
  Q.halo = z3Soft('rgba(150,255,230,0.9)', 'rgba(120,220,210,0)');
  Q.ok = true;
  return Q;
}
function rfBuildMaren() {
  const Q = rfMarenGeo(), S = RFC.S, root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(S);
  const dress = new THREE.MeshPhongMaterial({ color: 0x10131a, specular: 0x30404a, shininess: 30, side: THREE.DoubleSide });
  const skin = new THREE.MeshPhongMaterial({ color: 0x3a434c, specular: 0x202a30, shininess: 20 });
  const hairM = new THREE.MeshLambertMaterial({ color: 0x0a0b0e, side: THREE.DoubleSide });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xc8fff0 });
  const weedM = new THREE.MeshLambertMaterial({ color: 0x1e3a2a, emissive: 0x04140a, side: THREE.DoubleSide });
  const aura = new THREE.MeshBasicMaterial({ color: 0x70f0d0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const mesh = (geo, mat, x, y, zz, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, zz || 0); parent.add(o); return o; };
  const hips = new THREE.Group(); body.add(hips); hips.position.y = 0;
  const skirt = mesh(Q.skirt, dress, 0, 0, 0, hips);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.2, w = mesh(Q.weed, weedM, Math.cos(a) * 0.4, 0.55, Math.sin(a) * 0.36, hips); w.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.35); w.scale.y = 0.7 + (i % 3) * 0.3; }
  const torso = new THREE.Group(); torso.position.y = 1.0; hips.add(torso);
  mesh(Q.hips, dress, 0, 0.02, 0, torso).scale.set(1.12, 0.62, 0.86);
  mesh(Q.waist, dress, 0, 0.04, 0, torso).scale.set(1, 1, 0.8);
  mesh(Q.chest, dress, 0, 0.42, -0.02, torso).scale.set(1.0, 0.82, 0.74);
  mesh(Q.shoul, skin, 0, 0.53, 0.02, torso).scale.set(1, 1, 0.8);
  mesh(Q.neck, skin, 0, 0.62, 0.0, torso);
  const head = new THREE.Group(); head.position.set(0, 0.76, 0.0); torso.add(head);
  mesh(Q.head, hairM, 0, 0, 0, head).scale.set(0.92, 1.12, 1.0);
  const eyes = [-1, 1].map(s => mesh(Q.eye, eyeM, s * 0.035, 0.0, -0.105, head));
  const hair = mesh(Q.hair, hairM, 0, 0.06, 0.05, head); hair.scale.set(1, 1, 0.75);
  // her arms: from the shoulder down (each: the upper arm, the elbow, the forearm and hand)
  const arm = s => {
    const sh = new THREE.Group(); sh.position.set(s * 0.21, 0.53, 0.02); torso.add(sh);
    mesh(Q.up, skin, 0, 0, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    mesh(Q.fore, skin, 0, 0, 0, el);
    const hd = mesh(Q.hand, skin, 0, -0.3, 0, el);
    for (let i = 0; i < 4; i++) { const f = mesh(Q.finger, skin, (i - 1.5) * 0.012, -0.33, 0, el); f.rotation.z = (i - 1.5) * 0.12; }
    return { sh, el, hd };
  };
  const arms = [arm(1), arm(-1)];   // (her right, raised; her left)
  // the light about her while she can't be hurt: a shell over her dress, and a glow
  const shell = new THREE.Mesh(Q.skirt, aura); shell.scale.set(1.08, 1.03, 1.08); hips.add(shell);
  const shell2 = new THREE.Mesh(Q.chest, aura); shell2.position.y = 1.42; shell2.scale.set(1.12, 1.3, 0.92); hips.add(shell2);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.position.y = 1.0; glow.scale.set(1.8, 2.6, 1); body.add(glow);
  const foot = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  foot.position.y = 0.05; foot.scale.set(1.8, 0.5, 1); body.add(foot);
  return { root, body, hips, torso, head, hair, arms, skirt, eyes, dress, skin, eyeM, aura, shell, shell2, glow, foot };
}
// her pose: gliding, her dress swaying, her blows; and how she looks, struck or not
function rfPoseMaren(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, me = FPS.me, act = z.dead ? null : z.act, at = z.at || 0;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  const moving = z.walk && !act && !z.dead, sw = reduceMotion ? 0 : 1;
  z.ph = (z.ph || 0) + dt * (moving ? 2.2 : 0.9);
  M.body.position.y = (0.05 + 0.06 * Math.sin(t * 1.3 + z.seed)) * sw;
  M.hips.rotation.set(moving ? -0.08 : 0, 0, Math.sin(z.ph) * 0.03 * sw);
  M.skirt.rotation.y = Math.sin(t * 0.9) * 0.08 * sw;
  M.torso.rotation.set(0.04 + Math.sin(t * 0.7) * 0.03 * sw, Math.sin(t * 0.5) * 0.08 * sw, 0);
  M.head.rotation.set(0.28 + Math.sin(t * 0.6 + z.seed) * 0.05 * sw, Math.sin(t * 0.37) * 0.2 * sw, -0.12);
  M.hair.rotation.set(-0.12 + Math.sin(t * 1.1) * 0.06 * sw, 0, Math.sin(t * 0.8) * 0.05 * sw);
  // arms: [shoulder x (forward), shoulder z (out), elbow z (bend)] for her right (raised) and left
  let R = [-0.15, 2.35, -1.25], L = [0.1, -0.16, 0.2];
  R[1] += Math.sin(t * 1.4) * 0.06 * sw; L[0] += Math.sin(z.ph) * 0.08 * sw;
  if (act === 'sweep') {
    const T = RFM_T.sweep;
    if (at < T.hit - 0.15) { const k = zbE(at / (T.hit - 0.15)); R = [zbL(-0.15, -0.6, k), zbL(2.35, 2.9, k), zbL(-1.25, -0.4, k)]; }
    else if (at < T.hit + 0.2) { const k = zbE((at - T.hit + 0.15) / 0.35); R = [zbL(-0.6, 1.5, k), zbL(2.9, 0.4, k), zbL(-0.4, -0.2, k)]; M.torso.rotation.y += zbL(0.3, -0.5, k); }
    else { const k = zbE((at - T.hit - 0.2) / (T.end - T.hit - 0.2)); R = [zbL(1.5, -0.15, k), zbL(0.4, 2.35, k), zbL(-0.2, -1.25, k)]; M.torso.rotation.y += zbL(-0.5, 0, k); }
  } else if (act === 'call' || act === 'rise' || act === 'wrath') {
    const T = RFM_T[act], up = act !== 'call' ? 1 : zbE(Math.min(1, at / 0.6)), down = act === 'call' && at > T.hit ? zbE(Math.min(1, (at - T.hit) / 0.3)) : 0;
    R = [zbL(-0.15, -0.2, up), zbL(2.35, 2.95, up), zbL(-1.25, -0.25, up)]; L = [zbL(0.1, -0.2, up), zbL(-0.16, -2.95, up), zbL(0.2, 0.25, up)];
    if (down) { R = [zbL(R[0], 1.2, down), zbL(R[1], 0.6, down), R[2]]; L = [zbL(L[0], 1.2, down), zbL(L[1], -0.6, down), L[2]]; }
    M.head.rotation.x = zbL(0.28, -0.35, up) + down * 0.6;
  }
  M.arms[0].sh.rotation.set(R[0], 0, R[1]); M.arms[0].el.rotation.set(0, 0, R[2]);
  M.arms[1].sh.rotation.set(L[0], 0, L[1]); M.arms[1].el.rotation.set(0, 0, L[2]);
  // struck or not: the sea-green light about her, or flushed red; a pale flash where a shot lands
  const vul = RF.vul > 0, flash = z.hitT > 0 ? Math.min(1, z.hitT / 0.15) : 0, ward = z.ward > 0 ? z.ward / 0.35 : 0;
  if (z.ward > 0) z.ward -= dt;
  const pulse = 0.5 + 0.5 * Math.sin(t * (vul ? 7 : 2.2));
  const lit = 1 - (RF.storm || 0) * 0.97;   // [p2] (in the dark, nothing of her shows but her eyes)
  M.aura.opacity = (vul ? 0 : 0.1 + 0.08 * pulse + ward * 0.25) * lit;
  M.shell.visible = M.shell2.visible = !vul && !z.dead && lit > 0.2;
  M.glow.material.opacity = (z.dead ? 0 : vul ? 0.25 + 0.2 * pulse : 0.55 + 0.25 * pulse) * lit;
  M.glow.material.color.setRGB(vul ? 1 : 0.6, vul ? 0.4 : 1, vul ? 0.45 : 0.9);
  M.foot.material.opacity = z.dead ? 0 : 0.5;
  M.dress.emissive.setRGB((vul ? 0.22 * pulse : 0) + flash * 0.25, flash * 0.2 + (vul ? 0 : 0.03), flash * 0.2 + (vul ? 0.02 : 0.05));
  M.skin.emissive.setRGB(vul ? 0.15 * pulse : 0.02, vul ? 0.02 : 0.08, vul ? 0.04 : 0.08);
  M.eyeM.color.setRGB(vul ? 1 : 0.78, vul ? 0.5 : 1, vul ? 0.5 : 0.94);
  // water running off her, while she comes up
  if (act === 'rise' && Math.random() < dt * 30) fpsPuff(z.x + (Math.random() - 0.5) * 3, z.y + (Math.random() - 0.5) * 2, G0 + (z.jz || 0) + Math.random() * 5, '150,200,200', 2);
  if (z.dead) {
    // down: she sinks to her knees and goes, as the sea takes her back
    const k = Math.min(1, (z.deadT || 0) / 3);
    M.root.position.y -= k * k * 6.5;
    M.root.rotation.set(-k * 0.5, -z.h + k * 0.8, 0, 'YXZ');
    if (Math.random() < dt * 20 && k < 1) fpsPuff(z.x + (Math.random() - 0.5) * 3, z.y + (Math.random() - 0.5) * 3, G0 + (z.jz || 0) + Math.random() * 4, '150,220,210', 2.5);
    M.root.visible = k < 1;
  }
}

// ---------- on top: what's to be done, her soul's mark, the token ----------
function rfHud(phone, mono, fell) {
  if (!RF.on) return;
  const m = FPS.me, t = g.t, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 46);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const line = (s, y, c, f) => { ctx.font = f || mono(phone ? 10 : 12); ctx.fillStyle = c; ctx.fillText(s, L, y, W * 0.5); fpsHudNote(y + (f ? (phone ? 20 : 26) : (phone ? 14 : 17))); };
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
  if (RF.st === 'hunt') {
    const down = RF_APO_IDS.filter(k => RF.apo[k] === 2).length;
    line(`The apothecaries’ keepers: ${down} of 3 put down`, top, 'rgba(255,214,140,0.9)');
    RF_APO_IDS.forEach((k, i) => line(`${RF.apo[k] === 2 ? '✓' : RF.apo[k] === 1 ? '•' : '◦'} ${RF_APOS[k].n.replace(/^the /, '')}${RF.apo[k] === 1 ? ' · awake' : ''}`, top + (i + 1) * (phone ? 13 : 16), RF.apo[k] === 2 ? 'rgba(236,228,207,0.4)' : RF_APOS[k].c));
  } else if (RF.st === 'knock') {
    const K = ZM.z.find(z => z.zn === RF.kz && !z.dead);
    if (K && K.act === 'song') {
      // (its song: the words, line by line, and what to do)
      line('The Knock sings: shoot it to break its song', top, `rgba(255,120,130,${0.8 + 0.2 * Math.sin(t * 8)})`, fell(phone ? 15 : 20));
      const li = Math.min(3, Math.floor((K.at || 0) / RFK.SONG * 4));
      RFK_WORDS.forEach((w, i) => line(w, top + (phone ? 20 : 26) + i * (phone ? 13 : 17), i === li ? 'rgba(255,214,200,0.95)' : i < li ? 'rgba(255,214,200,0.4)' : 'rgba(255,214,200,0.15)', `italic ${phone ? 11 : 14}px "IM Fell English", serif`));
    } else {
      line('The Knock, Bat of Maren', top, 'rgba(240,180,110,0.95)', fell(phone ? 15 : 20));
      line('Put it down, and Maren comes', top + (phone ? 20 : 26), 'rgba(240,200,150,0.8)');
    }
  } else if (RF.st === 'anger') {
    if (RF.angered) line('Maren is angered', top, `rgba(255,110,120,${0.8 + 0.2 * Math.sin(t * 8)})`, fell(phone ? 15 : 20));
  } else if (RF.st === 'maren') {
    const M = ZM.z.find(z => z.zn === RF.mz);
    const t2 = typeof rf2Hud === 'function' ? rf2Hud(phone, mono, fell, line, top) : top;   // [p2] the storm call, the bell
    if (RF.p2i) { /* (her storm call says it all) */ }
    else if (RF.vul > 0) line(`Maren can be hurt: ${Math.ceil(RF.vul)} s`, t2, `rgba(255,120,130,${0.8 + 0.2 * Math.sin(t * 8)})`, fell(phone ? 15 : 20));
    else if (M && M.act === 'rise') line('Maren rises', t2, 'rgba(160,240,220,0.9)', fell(phone ? 15 : 20));
    else { line('Maren can\u2019t be hurt', t2, 'rgba(160,240,220,0.9)', fell(phone ? 15 : 20)); line(RF.orbUp ? 'Shoot her soul: the light over the water' : 'Her soul is under the sea', t2 + (phone ? 20 : 26), 'rgba(160,240,220,0.8)'); }
  } else if (RF.st === 'won') line(RF.mine ? 'Maren is laid to rest.' : 'Maren is laid to rest. Take her pirate token, where she fell.', top, 'rgba(255,214,140,0.95)', fell(phone ? 15 : 20));
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  // her soul's mark: a gold diamond over it, wherever it is in front of you
  if (RF.st === 'maren' && RF.orbUp && !ZM.over) {
    const [ox, oy, oz] = RF.orb, c = cam(ox, oy, oz);
    if (c.f > 0.4) {
      const q = proj(c), x = clamp(q.x, 30, W - 30), y = clamp(q.y - 26, 30, H - 30), a = 0.65 + 0.35 * Math.sin(t * 5), s = 7;
      ctx.fillStyle = `rgba(255,226,120,${a})`; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = mono(phone ? 10 : 11); ctx.fillStyle = `rgba(255,226,140,${a})`;
      ctx.fillText(`Maren’s Soul · ${Math.round(Math.hypot(ox - m.x, oy - m.y))} m`, x, y - s - 4);
      // (and how much it has left: a thin gold bar under the diamond)
      const bw = phone ? 44 : 60, bh = 4, k = clamp((RF.orbHp == null ? RFC.ORB_HP : RF.orbHp) / RFC.ORB_HP, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - bw / 2 - 1, y + s + 5, bw + 2, bh + 2);
      ctx.fillStyle = `rgba(255,226,120,${0.6 + 0.4 * a})`; ctx.fillRect(x - bw / 2, y + s + 6, bw * k, bh);
    }
  }
  // the token, taken: a gold coin, and what it is
  if (RF.grab > 0) {
    const a = Math.min(1, RF.grab, 6 - RF.grab) , r = phone ? 34 : 48, y = H * 0.36;
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const gr = ctx.createRadialGradient(cx - r * 0.3, y - r * 0.3, r * 0.1, cx, y, r);
    gr.addColorStop(0, '#ffeaa0'); gr.addColorStop(0.6, '#d0a040'); gr.addColorStop(1, '#7a5a1a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, y, r, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#6a4a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, r * 0.8, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#5a3c10'; ctx.font = fell(r * 0.9); ctx.fillText('8', cx, y + 2);
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffe2a0'; ctx.font = fell(phone ? 18 : 26); ctx.fillText('Maren’s Piece of Eight', cx, y + r + (phone ? 20 : 30));
    ctx.fillStyle = 'rgba(236,228,207,0.9)'; ctx.font = mono(phone ? 10 : 13);
    const n = typeof ptTokens === 'function' ? ptTokens() : 1;
    ctx.fillText(`A pirate token: yours to keep (${n} to spend on the Keeper’s Last Light card)`, cx, y + r + (phone ? 40 : 58), W * 0.9);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
  }
  if (RF.hintT > 0 && RF.st === 'hunt') {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 15 : 20); ctx.fillStyle = `rgba(236,228,207,${Math.min(1, RF.hintT) * 0.85})`;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
    ctx.fillText('A Mooncusser keeps each of the three apothecaries. Find them, and put out their lights.', cx, H * 0.72, W * 0.9);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
}

// ---------- in 3D: her soul over the water, the rings she calls the sea up through, her token ----------
const RF3 = { orb: null };
function rf3dBuild(grp) {
  RF3.orb = null;
  if (!RF.on) return;
  if (typeof rfk3dBuild === 'function') rfk3dBuild(grp);
  if (typeof rf2Build3d === 'function') rf2Build3d(grp);   // [p2]
  const soft = (c0, c1) => new THREE.SpriteMaterial({ map: z3Soft(c0, c1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  // the soul: a hot core, a gold glow round it, a wider haze, and its light on the sea under it
  const orb = RF3.orb = new THREE.Group(); grp.add(orb); orb.visible = false;
  orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false })));
  const g1 = RF3.g1 = new THREE.Sprite(soft('rgba(255,230,120,1)', 'rgba(255,200,60,0)')); g1.scale.setScalar(3.2); orb.add(g1);
  const g2 = RF3.g2 = new THREE.Sprite(soft('rgba(255,220,110,0.45)', 'rgba(255,190,60,0)')); g2.scale.setScalar(9); orb.add(g2);
  const refl = RF3.refl = new THREE.Sprite(soft('rgba(255,220,120,0.55)', 'rgba(255,200,80,0)')); refl.scale.set(6, 1.4, 1); grp.add(refl); refl.visible = false;
  RF3.light = new THREE.PointLight(0xffd880, 0, 30, 1.4); grp.add(RF3.light);
  // the rings of her call: sea-green, on the floor
  RF3.rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Group(); r.visible = false; grp.add(r);
    const ringM = new THREE.MeshBasicMaterial({ color: 0x80ffe0, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x40d0b0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    disc.rotation.x = -Math.PI / 2; r.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48), ringM); ring.rotation.x = -Math.PI / 2; r.add(ring);
    r.disc = disc; r.ring = ring; RF3.rings.push(r);
  }
  // her token: a gold coin standing on its edge, turning, a glow under it
  const tok = RF3.tok = new THREE.Group(); grp.add(tok); tok.visible = false;
  const gold = new THREE.MeshPhongMaterial({ color: 0xd8a840, emissive: 0x4a3008, specular: 0xffe0a0, shininess: 70 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 28), gold); coin.rotation.x = Math.PI / 2; tok.add(coin);
  for (const s of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 6, 24), gold); face.position.z = s * 0.032; tok.add(face);
    const sk = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshPhongMaterial({ color: 0xe8e0c8, emissive: 0x302820 })); sk.position.set(0, 0.03, s * 0.045); sk.scale.set(1, 1, 0.35); tok.add(sk);
    for (const a of [0.7, -0.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.02), sk.material); b.position.set(0, -0.08, s * 0.045); b.rotation.z = a; tok.add(b); }
  }
  const tg = new THREE.Sprite(soft('rgba(255,220,120,0.9)', 'rgba(255,200,80,0)')); tg.scale.setScalar(2.2); tok.add(tg);
}
function rf3d(dt) {
  if (!RF.on || !RF3.orb) return;
  if (typeof rfk3d === 'function') rfk3d(dt);
  if (typeof rf2Frame3d === 'function') rf2Frame3d(dt);   // [p2]
  const t = g.t, G0 = FPSC.GROUND;
  // the soul
  const up = RF.st === 'maren' && RF.orbUp;
  RF3.orb.visible = RF3.refl.visible = up;
  RF3.light.intensity = up ? 2.2 + 0.4 * Math.sin(t * 6) : 0;
  if (up) {
    const [ox, oy, oz] = RF.orb, p = 1 + 0.12 * Math.sin(t * 6) + 0.06 * Math.sin(t * 17);
    RF3.orb.position.copy(z3v(ox, oy, oz)); RF3.g1.scale.setScalar(3.2 * p); RF3.g2.scale.setScalar(9 * (2 - p));
    RF3.refl.position.copy(z3v(ox, oy, G0 + ZMD.WATER + 0.05)); RF3.light.position.copy(z3v(ox, oy, oz - 1));
  }
  // her call's rings
  let i = 0;
  for (const z of ZM.z) {
    if (i >= RF3.rings.length) break;
    if (z.bt !== 'maren' || z.dead || z.act !== 'call' || (z.at || 0) > RFM_T.call.hit + 0.15) continue;
    const r = RF3.rings[i++], k = clamp((z.at || 0) / RFM_T.call.hit, 0, 1), iz = zmFloorAt(z.ix, z.iy, 12, 0.3);
    r.visible = true; r.position.copy(z3v(z.ix, z.iy, G0 + iz + 0.06)); r.scale.setScalar(RFC.CALL_R);
    r.ring.material.opacity = 0.35 + 0.6 * k * (0.75 + 0.25 * Math.sin(t * (10 + k * 20)));
    r.disc.material.opacity = 0.08 + 0.3 * k * k;
  }
  for (; i < RF3.rings.length; i++) RF3.rings[i].visible = false;
  // the token
  const tk = RF.tok && !RF.mine;
  RF3.tok.visible = !!tk;
  if (tk) { RF3.tok.position.copy(z3v(RF.tok[0], RF.tok[1], G0 + RF.tok[2] + 1.0 + 0.15 * Math.sin(t * 2.2))); RF3.tok.rotation.y = t * 1.8; }
}
