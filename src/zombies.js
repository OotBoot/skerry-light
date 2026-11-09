// The Lighthouse: a fourth game, on foot and indoors. You and the keeper's station against the drowned, round after
// round, with the Wreckers' Night weapons (and their skins), its outfits, and one weapon of its own.
//
// Played like the old wave-survival "zombies" games, in this game's own clothes:
//  - Rounds: the drowned come up out of the sea and climb in through the station's windows. Each round brings more
//    of them, tougher and quicker (shamblers at first, then joggers, then runners). Kill them all and there's a
//    short break before the next round.
//  - Points: 10 for each hit, 60 for a kill, 100 for one through the head, 130 with the cutlass. You start with 500
//    and a pepperbox. Points buy everything:
//  - Wall buys: weapons hang on the walls, each with its price chalked on a board. Buy one, or buy its ammunition
//    again for half. You carry two weapons; a third replaces the one in your hand.
//  - Door buys: the station is shut up. Open doors (and clear fallen wreckage) to reach the rest of it.
//  - Windows: the drowned tear the boards off the windows to get in. Hold Use at a window to nail them back
//    (10 points a board).
//  - The wreck chest: 950 points for whatever's in it. It sits in one of five places round the station, one of
//    them at the very top, in the lantern room beside the great lens; after a few goes a gull takes it, and it
//    turns up somewhere else.
//  - The Fresnel Lamp, only from the chest: a signal lantern with a lighthouse lens in it, that throws a beam of the
//    Light's own fire. Hold the trigger and the beam burns whatever stands in it to ash, and each one it burns
//    throws a spark to the next.
//  - Tonics on the shelves: Stout Heart (take twice the knocks), Quick Hands (reload in half the time), Fleet Foot
//    (quicker on your feet) and Second Wind (get back up once when they drag you down).
//  - Salvage: now and then one of them drops something that floats, glowing: a Powder Keg (full ammunition), Double
//    Salvage (double points for half a minute), the Black Spot (anything dies to one hit, for half a minute) or a
//    Lamp Flash (every one of them in the station burns).
// The map: the keeper's station at the Light. Ten rooms round the tower: the Keeper's Quarters (where you start),
// the Oil Store, the Fog-Signal House, the East Passage, the Net Loft, the Store Hall, the Lamp Passage, the
// Boathouse, the Wreck Store, and the tower itself, with a stair winding up round its core to the lantern room
// at the top. Between the buildings, two walled yards the drowned come across.
// Built from the same props and solids as Wreckers' Night's islands (src/fpsisle.js), with a few new kinds of its
// own (floors, ceilings, stairs, doors). Unlike the islands, here some solids are floors: stairs and the tower's
// core can be walked up, and everything (you, the drowned, shots) knows how high it stands.
// The drowned find their way about on a grid laid over the station, by the shortest walk to you (opened doors
// change it). Weapon damage is scaled to the mode (the drowned get tougher every round), and kills count towards
// weapon and outfit crates as in Wreckers' Night, a little more slowly.
// Alone, for now: no network. Uses Wreckers' Night's engine (src/fps.js), which hands over to this file when FPS.zm.

const ZMC = {
  RISE: 0.28, TREAD: 0.75, CEIL: 3.6, STEP: 0.6, START: 500, BREAK: 10, ALIVE: 24, NAV: 0.5, HP: 3, HP_STOUT: 6, BOX: 950,
};
// The tower: round, whitewashed with two red bands, fifteen metres wide inside and five floors high, a spiral stair
// of ninety steps round a stone newel up through the middle, one turn to a floor, and the lantern room of glass on
// top. Floors (heights above the ground): 0 the Tower Foot, 5, 10, 15, 20 two rooms each, 25 the lantern.
const ZMT = { X: 0, Y: 1.5, R: 10, TH: 0.6, N: 32, L: [0, 5, 10, 15, 20, 25], HOLE: 3.6, PER: 18, R0: 0.95, R1: 3.45, GLASS: 6.5 };
ZMT.RISE = 5 / ZMT.PER;
ZMC.HT = ZMT.L[5];   // the lantern room's floor
const ZM_TROOMS = { tower: 'the Tower Foot', tw1n: 'the Watch Room', tw1s: 'the Oil Room', tw2n: 'the Chart Room', tw2s: 'the Bunk Room',
  tw3n: 'the Clock Room', tw3s: 'the Lamp-Wright’s Store', tw4n: 'the Service Room', tw4s: 'the Keeper’s Study', top: 'the Lantern Room' };
const ZM = { on: false, own: ['pepperbox'], res: {}, pts: 0, round: 0, items: [], z: [], drops: [], perks: {}, fx: [] };
// what each weapon carries in reserve, and how much harder it hits the drowned than a wrecker
const ZM_AMMO = { pepperbox: 60, blunderbuss: 28, longarm: 36, harpoon: 20, avtomat: 225, cutlass: 0, fresnel: 240 };
const ZM_DMG = { p: 1, b: 1, l: 4, h: 5, c: 2.5, a: 1.15, f: 1, k: 1 };
// the knife: always to hand, never runs out (V, middle mouse, R3, the knife button; or Fire with nothing left to fire)
// boarding windows pays 10 a board, up to this many points a round for each player (then the boards are free work)
const ZM_BOARD_CAP = 500;
const ZM_KNIFE = { reach: 2.1, arc: 0.95, dmg: 3, rate: 0.55 };
const ZM_PIERCE = { l: 3 };
const ZM_PERKS = {
  stout: { n: 'Stout Heart', cost: 2500, c: '#e0504a', what: 'take twice the knocks' },
  quick: { n: 'Quick Hands', cost: 3000, c: '#5ac87a', what: 'reload in half the time' },
  fleet: { n: 'Fleet Foot', cost: 2000, c: '#e8c050', what: 'quicker on your feet' },
  wind: { n: 'Second Wind', cost: 500, c: '#6aa8f0', what: 'get back up once' },
};
const ZM_DROPS = {
  keg: { n: 'Powder Keg', c: '#e0a050' }, double: { n: 'Double Salvage', c: '#f0d060' },
  spot: { n: 'The Black Spot', c: '#d8d8e0' }, flash: { n: 'Lamp Flash', c: '#fff0b0' },
};
const ZM_BOXW = [['avtomat', 18], ['longarm', 14], ['blunderbuss', 14], ['harpoon', 14], ['cutlass', 7], ['pepperbox', 7], ['fresnel', 9]];

// ---------- the rooms ----------
// [x0, x1, y0, y1] relative to the island's middle; north is +y
const ZM_ZONES = {
  quarters: { n: "the Keeper's Quarters", r: [-10, 10, -21, -9.5], floor: 'boards', wall: '#bcb4a2' },
  oil: { n: 'the Oil Store', r: [10, 26, -21, -9.5], floor: 'flags', wall: '#a8a294' },
  fog: { n: 'the Fog-Signal House', r: [-26, -10, -21, -9.5], floor: 'flags', wall: '#aeaa9c' },
  east: { n: 'the East Passage', r: [16, 26, -9.5, 14], floor: 'flags', wall: '#b0aa98' },
  west: { n: 'the Net Loft', r: [-26, -16, -9.5, 14], floor: 'boards', wall: '#b2ab98' },
  hall: { n: 'the Store Hall', r: [-26, 26, 14, 26], floor: 'flags', wall: '#b8b2a2' },
  lamp: { n: 'the Lamp Passage', r: [-2.5, 2.5, 11.3, 14], floor: 'flags', wall: '#c0baa8' },
  tower: { n: 'the Tower Foot', r: [-10.3, 10.3, -8.8, 11.8], floor: 'flags' },
  boat: { n: 'the Boathouse', r: [26, 44, -21, 2], floor: 'boards', wall: null },
  wreck: { n: 'the Wreck Store', r: [-44, -26, -21, 2], floor: 'flags', wall: null },
};
const ZM_TC = [ZMT.X, ZMT.Y];   // the middle of the tower

FPS_ISLES.light = { name: 'the Lighthouse', ground: '#7a786e', ground2: '#5e5c54', wet: '#34363a', path: '#5c5a52', tint: 0.32, mound: 0, dune: 0,
  rocks: [0, 3, 6, 1], wrecks: [0], tintRock: null, sky: '120,130,160', skyA: 0.06, fog: ['#0c0e12', 70, 520], mist: '60,66,80', mistA: 0.08,
  birds: ['bat', 0], tufts: ['#4a5038', 0], pebbles: 0, pools: 0, wrack: 0, indoor: true, nLights: 6 };

// ---------- props of its own ----------
const ZMP = { plaster: '#b4ae9e', tar: '#221e19', boards: ['#5a4430', '#634b35', '#4e3b2a'], flags: ['#6c6a62', '#625f58', '#74716a', '#5c5a54'], iron: '#2a2c30', brass: '#9a7a34' };
Object.assign(FPI_K, {
  // the floor of a room: planks or flagstones (only to look at)
  floor: {
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, 0.04, { mv: false, ray: false, occ: false, col: p.style === 'boards' ? '#5a4430' : '#6a6862' })]; },
    b3(p, A) {
      if (p.style === 'boards') {
        const n = Math.max(1, Math.round(p.d / 0.32));
        for (let i = 0; i < n; i++) { const v = -p.d / 2 + (i + 0.5) * p.d / n; A.box(ZMP.boards[i % 3], 0, v, -0.1, p.w, p.d / n * 0.96, 0.14); }
      } else {
        const S = 1.25, nu = Math.max(1, Math.round(p.w / S)), nv = Math.max(1, Math.round(p.d / S)), su = p.w / nu, sv = p.d / nv;
        A.box('#2c2a26', 0, 0, -0.12, p.w, p.d, 0.14);
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) A.box(ZMP.flags[(i * 7 + j * 3 + Math.floor(A.r() * 2)) % 4], -p.w / 2 + (i + 0.5) * su + ((j % 2) ? su * 0.25 : 0) * 0, -p.d / 2 + (j + 0.5) * sv, -0.1, su * 0.95, sv * 0.95, 0.15);
      }
    },
  },
  // a ceiling, with its beams
  ceil: {
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.z0 + 0.3, { z0: p.z0, mv: false, occ: false, col: '#8a8476' })]; },
    b3(p, A) {
      A.box(p.col || '#9a9484', 0, 0, p.z0, p.w, p.d, 0.3);
      if (p.beams !== false) { const n = Math.max(1, Math.round(p.w / 2.4)); for (let i = 0; i <= n; i++) A.box(FPI_C.wood3, -p.w / 2 + i * p.w / n, 0, p.z0 - 0.2, 0.2, p.d, 0.22); }
    },
  },
  // a stair tread (or a landing): you walk up onto it
  step: {
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, { fl: true, col: FPI_C.stone3 })]; },
    b3(p, A) { A.box(p.col || '#6e6b62', 0, 0, -0.2, p.w, p.d, p.hh + 0.2); A.box('#4e4c46', 0, 0, p.hh - 0.06, p.w * 1.005, p.d * 1.01, 0.07); },
  },
  // the tower's great core of dressed stone, its top the lantern room's floor
  core: {
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, { fl: true, col: FPI_C.stone })]; },
    b3(p, A) {
      const nc = Math.round(p.hh / 0.6), ch = p.hh / nc;
      for (let j = 0; j < nc; j++) A.box(j % 2 ? '#5e5c56' : '#686660', 0, 0, j * ch, p.w * (j % 2 ? 1.0 : 1.01), p.d * (j % 2 ? 1.01 : 1.0), ch);
      A.box('#4a4842', 0, 0, p.hh - 0.08, p.w * 1.02, p.d * 1.02, 0.1);
      // the floor of the lantern room: polished boards
      const n = Math.round(p.d / 0.3); for (let i = 0; i < n; i++) A.box(ZMP.boards[i % 3], 0, -p.d / 2 + (i + 0.5) * p.d / n, p.hh - 0.02, p.w * 0.98, p.d / n * 0.95, 0.05);
    },
  },
  // a door that has to be paid for: only its solid here (it's drawn, and taken away, by the mode itself)
  zdoor: { sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, { col: FPI_C.wood })]; } },
  // a railing of iron round the lantern room's floor (the solid reaches down to the ground, into the core)
  rail: {
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.14, p.base + 1.0, { col: ZMP.iron })]; },
    b3(p, A) {
      const n = Math.max(2, Math.round(p.w / 0.5));
      for (let i = 0; i <= n; i++) A.box(ZMP.iron, -p.w / 2 + i * p.w / n, 0, p.base, 0.05, 0.05, 1.0);
      A.box(ZMP.brass, 0, 0, p.base + 0.95, p.w, 0.09, 0.07); A.box(ZMP.iron, 0, 0, p.base + 0.45, p.w, 0.04, 0.04);
    },
  },
  table: {
    col: FPI_C.wood,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, 0.82)]; },
    b3(p, A) {
      A.box(FPI_C.wood2, 0, 0, 0.74, p.w, p.d, 0.08);
      for (const su of [-1, 1]) for (const sv of [-1, 1]) A.box(FPI_C.wood3, su * (p.w / 2 - 0.08), sv * (p.d / 2 - 0.08), -0.1, 0.08, 0.08, 0.86);
      if (p.cloth) A.box(p.cloth, 0, 0, 0.82, p.w * 0.6, p.d * 1.04, 0.02);
      for (let i = 0; i < 3; i++) A.cyl(A.r() < 0.5 ? '#c8c0a8' : '#6a7a8a', (A.r() - 0.5) * p.w * 0.7, (A.r() - 0.5) * p.d * 0.6, 0.82, 0.06, 0.1);
    },
  },
  bench: {
    col: FPI_C.wood,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.22, 0.46)]; },
    b3(p, A) { A.box(FPI_C.wood2, 0, 0, 0.4, p.w, 0.36, 0.06); for (const s of [-1, 1]) A.box(FPI_C.wood3, s * (p.w / 2 - 0.12), 0, -0.1, 0.07, 0.3, 0.5); },
  },
  bunk: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, 0, 1.0, 0.45, 1.9)]; },
    b3(p, A) {
      for (const su of [-1, 1]) for (const sv of [-1, 1]) A.box(FPI_C.wood3, su * 0.95, sv * 0.4, -0.1, 0.08, 0.08, 2.0);
      for (const h of [0.35, 1.25]) { A.box(FPI_C.wood2, 0, 0, h, 2.0, 0.86, 0.08); A.box('#8a8270', 0, 0, h + 0.08, 1.9, 0.78, 0.14); A.box(A.r() < 0.5 ? '#5a2a26' : '#2e3a4e', 0.2, 0, h + 0.2, 1.3, 0.8, 0.05); A.box('#c8c0aa', -0.75, 0, h + 0.2, 0.35, 0.6, 0.1); }
    },
  },
  stove: {
    col: ZMP.iron,
    sol(p) { return [fpiBox(p, 0, 0, 0.65, 0.4, 1.0), fpiCirc(p, 0.3, 0.2, 0.12, ZMC.CEIL, { mv: false, occ: false })]; },
    b3(p, A) {
      A.box(ZMP.iron, 0, 0, -0.1, 1.3, 0.8, 1.0); A.box('#3a3c40', 0, 0, 0.92, 1.36, 0.86, 0.06);
      A.box('#1a1a1c', -0.25, -0.41, 0.2, 0.45, 0.04, 0.4); A.glow('#ff8a30', -0.25, -0.43, 0.38, 0.3);
      A.cyl(ZMP.iron, 0.3, 0.2, 0.95, 0.1, ZMC.CEIL - 0.95);
      for (const u of [-0.35, 0.3]) A.cyl('#4a4c50', u, 0.05, 0.98, 0.16, 0.05);
      A.cyl('#6a5a40', 0.3, 0.05, 1.03, 0.11, 0.18);
    },
  },
  // the oil store's tanks, and the fog-signal house's air receivers
  tank: {
    col: '#3a4a44',
    sol(p) { return [fpiCirc(p, 0, 0, p.r, p.hh)]; },
    b3(p, A) {
      A.cyl(p.c || '#3a4a44', 0, 0, -0.1, p.r, p.hh + 0.1, 0, 0, 0, 'cyl8');
      for (const h of [0.2, p.hh * 0.5, p.hh - 0.15]) A.cyl('#24282a', 0, 0, h, p.r * 1.03, 0.08, 0, 0, 0, 'cyl8');
      A.part('sph', p.c || '#3a4a44', 0, 0, p.hh, p.r * 2, p.r * 0.6, p.r * 2);
      A.box(ZMP.brass, p.r * 0.9, 0, 0.35, 0.25, 0.08, 0.08); A.cyl(ZMP.brass, p.r + 0.15, 0, 0.3, 0.05, 0.12);
      A.box('#c8c0a8', 0, -p.r * 0.98, p.hh * 0.55, p.r * 0.8, 0.02, 0.35);
    },
  },
  // the fog signal's engine, with its flywheel, and the horn out through the wall
  engine: {
    col: '#2e3a3a',
    sol(p) { return [fpiBox(p, 0, 0, 1.3, 0.75, 1.6)]; },
    b3(p, A) {
      A.box('#2a3434', 0, 0, -0.1, 2.6, 1.5, 1.2); A.box('#3a4646', 0.3, 0, 1.1, 1.6, 1.0, 0.5);
      for (const u of [-0.2, 0.4, 1.0]) A.cyl('#4a5656', u, 0, 1.55, 0.18, 0.25);
      A.part('torus', '#1e2424', -1.0, -0.82, 0.95, 1.8, 1.8, 1.8, 0, 0, 0);
      A.box('#1e2424', -1.0, -0.78, 0.95, 0.12, 0.1, 0.12);
      A.cyl(ZMP.brass, 0.9, 0.2, 1.6, 0.06, 1.8);
      A.part('cone', ZMP.brass, 0.9, 2.0, 3.3, 1.1, 2.4, 1.1, 0, -Math.PI / 2, 0);
    },
  },
  shelf: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.24, 2.1)]; },
    b3(p, A) {
      for (const s of [-1, 1]) A.box(FPI_C.wood3, s * (p.w / 2 - 0.04), 0, -0.1, 0.07, 0.46, 2.2);
      A.box(FPI_C.wood3, 0, 0.22, -0.1, p.w, 0.03, 2.2);
      for (const h of [0.2, 0.7, 1.2, 1.7]) {
        A.box(FPI_C.wood2, 0, 0, h, p.w, 0.46, 0.04);
        for (let u = -p.w / 2 + 0.2; u < p.w / 2 - 0.15; u += 0.18 + A.r() * 0.16) {
          if (A.r() < 0.25) continue;
          const k = p.goods || 'cans';
          if (k === 'cans') A.cyl(A.r() < 0.5 ? '#6a3a2a' : '#3a4a5a', u, 0, h + 0.04, 0.08, 0.2 + A.r() * 0.08);
          else if (k === 'jars') A.cyl(A.r() < 0.5 ? '#6a7a5a' : '#8a7a5a', u, 0, h + 0.04, 0.06, 0.16);
          else if (k === 'prisms') { A.part('ico', '#cfe0e8', u, 0, h + 0.15, 0.18, 0.2, 0.14, A.r() * 3, 0, 0, 'glow'); }
          else A.box(A.r() < 0.5 ? '#6a5438' : '#5a4630', u, 0, h + 0.04, 0.16, 0.3, 0.2 + A.r() * 0.15);
        }
      }
    },
  },
  // the great lens in the lantern room: a pedestal, and the lens itself, a beehive of glass rings
  lens: {
    col: ZMP.brass,
    sol(p) { return [fpiCirc(p, 0, 0, 1.0, p.base + 2.9)]; },
    b3(p, A) {
      const b = p.base;
      A.cyl('#2a2c30', 0, 0, b, 0.95, 0.2, 0, 0, 0, 'cyl8'); A.cyl(ZMP.brass, 0, 0, b + 0.2, 0.55, 0.9, 0, 0, 0, 'cyl8'); A.cyl('#2a2c30', 0, 0, b + 1.05, 0.9, 0.12, 0, 0, 0, 'cyl8');
      for (let i = 0; i < 9; i++) { const h = b + 1.2 + i * 0.17, r = 0.78 - Math.abs(i - 4) * 0.055; A.part('cyl8', '#fff2c8', 0, 0, h + 0.07, r * 2, 0.12, r * 2, i * 0.3, 0, 0, 'glow'); A.cyl(ZMP.brass, 0, 0, h + 0.13, r * 1.02, 0.035, 0, 0, 0, 'cyl8'); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; A.box(ZMP.brass, Math.cos(a) * 0.72, Math.sin(a) * 0.72, b + 1.15, 0.05, 0.05, 1.65); }
      A.part('sph', ZMP.brass, 0, 0, b + 2.85, 0.9, 0.35, 0.9);
    },
  },
  // a tonic cabinet: shelves of glowing bottles under a painted sign
  tonic: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, 0, 0.65, 0.32, 2.1)]; },
    b3(p, A) {
      A.box(FPI_C.wood3, 0, 0.05, -0.1, 1.3, 0.55, 2.15); A.box('#1a1612', 0, -0.2, 0.15, 1.15, 0.12, 1.6);
      for (const h of [0.45, 0.95, 1.45]) { A.box(FPI_C.wood2, 0, -0.18, h - 0.05, 1.15, 0.2, 0.04); for (let i = 0; i < 6; i++) A.part('cyl6', p.c, -0.45 + i * 0.18, -0.2, h + 0.12, 0.1, 0.24, 0.1, 0, 0, 0, 'glow'); }
      A.box(FPI_C.wood2, 0, -0.05, 2.08, 1.4, 0.12, 0.42); A.box(p.c, 0, -0.12, 2.16, 1.15, 0.03, 0.26, 0, 0, 0);
      A.part('box', p.c, 0, -0.13, 2.29, 1.0, 0.18, 0.02, 0, 0, 0, 'glow');
    },
  },
  // a plinth where the wreck chest can stand (base: the floor it stands on)
  plinth: {
    col: FPI_C.stone3,
    sol(p) { return [fpiBox(p, 0, 0, 0.85, 0.48, (p.base || 0) + 0.32)]; },
    b3(p, A) {
      const b = p.base || 0;
      A.box('#5a5650', 0, 0, b - 0.1, 1.7, 0.96, 0.42); A.box('#6a665e', 0, 0, b + 0.26, 1.78, 1.02, 0.06);
      A.part('disc', '#3a1a16', 0, 0, b + 0.02, 3.0, 1, 2.1, 0, 0, 0);
    },
  },
  // a wall buy's board, chalked by the mode on its face
  board: { sol() { return []; }, b3(p, A) { A.box('#2a2622', 0, 0, 0.85, 1.9, 0.06, 1.1); A.box(FPI_C.wood3, 0, 0, 0.8, 2.0, 0.08, 0.06); A.box(FPI_C.wood3, 0, 0, 1.95, 2.0, 0.08, 0.06); } },
  // a lantern hanging on a chain
  hlamp: {
    sol() { return []; },
    b3(p, A) {
      const z = p.z, top = p.top || ZMC.CEIL;
      A.box('#1a1a1c', 0, 0, z + 0.35, 0.025, 0.025, top - z - 0.35);
      A.box('#1a1a1c', 0, 0, z + 0.28, 0.24, 0.24, 0.05); A.box('#1a1a1c', 0, 0, z - 0.08, 0.2, 0.2, 0.05);
      for (const [u, v] of [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]]) A.box('#1a1a1c', u, v, z - 0.05, 0.025, 0.025, 0.35);
      A.glow(p.c || '#ffc070', 0, 0, z + 0.1, 0.17);
    },
  },
  // wreckage blocking a way through: only its solid is the map's (drawn by the mode, and cleared by it)
  coil: { col: FPI_C.rope, sol(p) { return [fpiCirc(p, 0, 0, 0.55, 0.35)]; }, b3(p, A) { for (let i = 0; i < 4; i++) A.part('torus', FPI_C.rope, 0, 0, 0.06 + i * 0.08, 1.0 - i * 0.08, 1.0 - i * 0.08, 1.0 - i * 0.08, 0, Math.PI / 2, 0); } },
});

// the tower's own: its curved wall in pieces, floors, the spiral's treads, railings, the newel, glass, and things
// that make it a home (plants, a telescope, the clockwork that turns the lens)
const ZM_TOWER_BANDS = [[7.4, 9.6], [16.4, 18.6]];   // the red bands round the outside
Object.assign(FPI_K, {
  // a piece of the tower's wall (or any wall standing on a floor), from z0 to z1: whitewashed, with a skirting and a
  // painted rail inside on each floor it crosses, and the red bands outside
  zwall: {
    noShadow: true, col: '#d8d2c0',
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.th / 2, p.z1, { z0: p.z0, col: '#d8d2c0' })]; },
    b3(p, A) {
      A.box(p.col || '#d8d2c0', 0, 0, p.z0, p.len, p.th, p.z1 - p.z0);
      if (p.ring) {
        for (const [b0, b1] of ZM_TOWER_BANDS) { const a = Math.max(b0, p.z0), b = Math.min(b1, p.z1); if (b > a) A.box('#9a2a22', 0, -(p.th / 2 + 0.02), a, p.len * 1.01, 0.04, b - a); }
        for (const L of ZMT.L) if (L >= p.z0 && L < p.z1 && L < 25) { A.box('#3a3228', 0, p.th / 2 + 0.02, L, p.len * 1.01, 0.04, 0.22); A.box('#3e6a6a', 0, p.th / 2 + 0.02, L + 1.0, p.len * 1.01, 0.04, 0.07); }
      }
    },
  },
  // a floor of the tower: boards on joists, whitewashed underneath (the ceiling of the floor below)
  slab: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.top, { z0: p.top - 0.3, fl: true, col: '#6a5440' })]; },
    b3(p, A) {
      A.box('#d4cebc', 0, 0, p.top - 0.32, p.w, p.d, 0.22);
      const n = Math.max(1, Math.round(p.d / 0.25));
      for (let i = 0; i < n; i++) A.box(ZMP.boards[i % 3], 0, -p.d / 2 + (i + 0.5) * p.d / n, p.top - 0.1, p.w, p.d / n * 0.95, 0.1);
    },
  },
  // a tread of the spiral stair, and (except where the floors are) its iron rail on the outside
  tread: {
    noShadow: true,
    sol(p) {
      const out = [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, { z0: p.hh - 0.25, fl: true, col: FPI_C.stone3 })];
      if (p.rail) out.push(fpiBox(p, p.w / 2 - 0.04, 0, 0.05, p.d / 2, p.hh + 1.0, { z0: p.hh - 0.05, ray: false, col: ZMP.iron }));
      return out;
    },
    b3(p, A) {
      A.box('#8a8476', 0, 0, p.hh - 0.25, p.w, p.d, 0.25); A.box('#5e594e', 0, -p.d / 2 + 0.04, p.hh - 0.06, p.w, 0.08, 0.07);
      if (p.rail) { A.box(ZMP.iron, p.w / 2 - 0.04, 0, p.hh, 0.04, 0.04, 0.95); A.box(ZMP.brass, p.w / 2 - 0.04, 0, p.hh + 0.95, 0.06, p.d * 1.1, 0.05); }
    },
  },
  // the newel: the stone column the stair winds round, the lens on its top
  newel: { noShadow: true, col: '#d8d2c0', sol(p) { return [fpiCirc(p, 0, 0, p.r, p.hh, { col: '#d8d2c0' })]; }, b3(p, A) { A.cyl('#d0cab8', 0, 0, -0.1, p.r, p.hh + 0.1, 0, 0, 0, 'cyl8'); for (const L of ZMT.L) A.cyl('#3e6a6a', 0, 0, L + 1.0, p.r * 1.03, 0.07, 0, 0, 0, 'cyl8'); } },
  // a railing standing on a floor (base), round the stairwell
  zrail: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.07, p.base + 1.0, { z0: p.base, ray: false, col: ZMP.iron })]; },
    b3(p, A) {
      const n = Math.max(2, Math.round(p.w / 0.45));
      for (let i = 0; i <= n; i++) A.box(ZMP.iron, -p.w / 2 + i * p.w / n, 0, p.base, 0.045, 0.045, 1.0);
      A.box(ZMP.brass, 0, 0, p.base + 0.96, p.w, 0.08, 0.06); A.box(ZMP.iron, 0, 0, p.base + 0.5, p.w, 0.035, 0.035);
    },
  },
  // the lantern's glass (drawn with the mode's own glass; here only what stops you walking through it)
  glasspane: { noShadow: true, sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.05, p.z1, { z0: p.z0, ray: false, col: '#a8c8d8' })]; } },
  // a pot plant: geraniums on a sill, a fern in a corner, a palm by the stair
  plant: {
    col: '#8a4a30',
    sol(p) { return [fpiCirc(p, 0, 0, (p.s || 1) * 0.3, (p.s || 1) * 0.9)]; },
    b3(p, A) {
      const s = p.s || 1, n = Math.round(7 + s * 6);
      A.cyl('#8a4a30', 0, 0, 0, 0.22 * s, 0.32 * s, 0, 0, 0, 'cyl8'); A.cyl('#3a2a1c', 0, 0, 0.3 * s, 0.2 * s, 0.03, 0, 0, 0, 'cyl8');
      for (let i = 0; i < n; i++) { const a = i / n * 6.283 + A.r(), r = A.r() * 0.12 * s; A.part('blade', A.r() < 0.5 ? '#4e7a3a' : '#3e6a30', Math.cos(a) * r, Math.sin(a) * r, 0.32 * s, 0.18 * s, (0.4 + A.r() * 0.5) * s, 1, a, (A.r() - 0.5) * 0.9, (A.r() - 0.5) * 0.9); }
      if (p.flowers) for (let i = 0; i < 6; i++) { const a = A.r() * 6.283, r = A.r() * 0.2 * s; A.part('sph', p.flowers, Math.cos(a) * r, Math.sin(a) * r, (0.65 + A.r() * 0.35) * s, 0.09 * s, 0.07 * s, 0.09 * s); }
    },
  },
  // a bush in the yard, and a bed of sea-pinks and grass at the foot of a wall
  bush: {
    col: '#3e5a30',
    sol(p) { return [fpiCirc(p, 0, 0, (p.s || 1) * 0.7, (p.s || 1) * 1.1)]; },
    b3(p, A) {
      const s = p.s || 1;
      for (let i = 0; i < 7; i++) { const a = A.r() * 6.283, r = A.r() * 0.45 * s; A.part('ico', A.r() < 0.5 ? '#3e5a30' : '#4e6a36', Math.cos(a) * r, Math.sin(a) * r, (0.4 + A.r() * 0.5) * s, (0.7 + A.r() * 0.4) * s, (0.6 + A.r() * 0.4) * s, (0.7 + A.r() * 0.4) * s, A.r() * 3, 0, 0, 'leaf'); }
      if (p.flowers) for (let i = 0; i < 8; i++) { const a = A.r() * 6.283, r = A.r() * 0.6 * s; A.part('sph', p.flowers, Math.cos(a) * r, Math.sin(a) * r, (0.7 + A.r() * 0.5) * s, 0.1, 0.08, 0.1); }
    },
  },
  bed: {
    sol() { return []; },
    b3(p, A) {
      A.box('#4a3a2a', 0, 0, -0.05, p.w, p.d, 0.12);
      const n = Math.round(p.w * p.d * 9);
      for (let i = 0; i < n; i++) { const u = (A.r() - 0.5) * p.w, v = (A.r() - 0.5) * p.d; A.part('blade', A.r() < 0.6 ? '#5a7a40' : '#6a8a48', u, v, 0.05, 0.12, 0.25 + A.r() * 0.3, 1, A.r() * 3, (A.r() - 0.5) * 0.6, (A.r() - 0.5) * 0.6); if (A.r() < 0.35) A.part('sph', p.flowers || '#e88aa8', u, v, 0.32 + A.r() * 0.15, 0.08, 0.06, 0.08); }
    },
  },
  // a telescope on its tripod, at a window
  telescope: {
    col: ZMP.brass,
    sol(p) { return [fpiCirc(p, 0, 0, 0.35, 1.5)]; },
    b3(p, A) { for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283; A.box('#4a3020', Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0, 0.04, 0.04, 1.25, 0, Math.sin(a) * 0.2, -Math.cos(a) * 0.2); } A.log(ZMP.brass, 0.1, 0, 1.35, 0.06, 1.1, 0, 0.25); A.log('#2a2a2c', 0.62, 0, 1.48, 0.075, 0.12, 0, 0.25); },
  },
  // the clockwork that turns the lens: a frame of gears, its governor, a weight on a chain
  clockwork: {
    col: '#3a3c40',
    sol(p) { return [fpiBox(p, 0, 0, 1.1, 0.6, 1.9)]; },
    b3(p, A) {
      A.box('#2a2c30', 0, 0, 0, 2.2, 1.2, 0.15); for (const u of [-1, 1]) A.box('#2a2c30', u * 1.0, 0, 0, 0.12, 1.1, 1.8);
      A.box('#2a2c30', 0, 0, 1.75, 2.2, 1.2, 0.1);
      for (const [u, h, r] of [[-0.45, 0.9, 0.42], [0.35, 1.15, 0.3], [0.5, 0.55, 0.22], [-0.1, 1.45, 0.2]]) { A.part('torus', ZMP.brass, u, 0, h, r * 2, r * 2, r * 2, 0, Math.PI / 2, 0); A.part('cyl8', ZMP.brass, u, 0, h, r * 1.6, 0.05, r * 1.6, 0, Math.PI / 2, 0); }
      for (const s of [-1, 1]) A.part('sph', '#6a6a70', 0.75 + s * 0.12, -0.5, 1.4 - Math.abs(s) * 0.1, 0.14, 0.14, 0.14);
    },
  },
  // a globe on a stand
  globe: { col: '#6a5a3a', sol(p) { return [fpiCirc(p, 0, 0, 0.35, 1.2)]; }, b3(p, A) { A.cyl('#4a3020', 0, 0, 0, 0.05, 0.8); A.part('sph', '#c8b888', 0, 0, 1.0, 0.55, 0.55, 0.55); A.part('torus', ZMP.brass, 0, 0, 1.0, 0.6, 0.6, 0.6, 0, 0.3, 0); } },
  // bunches of herbs and wrack drying under a beam (only to look at)
  herbs: { sol() { return []; }, b3(p, A) { A.box(FPI_C.wood3, 0, 0, p.z, p.w, 0.06, 0.06); for (let u = -p.w / 2 + 0.2; u < p.w / 2; u += 0.3) { A.box('#3a2a1c', u, 0, p.z - 0.25, 0.01, 0.01, 0.25); A.part('cone', A.r() < 0.5 ? '#6a7a40' : '#7a6a40', u, 0, p.z - 0.45, 0.16, 0.35, 0.16, 0, Math.PI, 0); } } },
  // a picture or a chart on a wall (only to look at)
  picture: { sol() { return []; }, b3(p, A) { A.box(FPI_C.wood3, 0, 0, p.z, p.w + 0.08, 0.05, p.h + 0.08); A.box(p.c || '#b8a878', 0, -0.03, p.z + 0.04, p.w, 0.02, p.h); if (p.sea) { A.box('#3a5a6a', 0, -0.045, p.z + 0.04, p.w, 0.01, p.h * 0.45); A.box('#e8e0c8', p.w * 0.15, -0.05, p.z + p.h * 0.4, 0.06, 0.01, p.h * 0.4); } } },
  // a rug (only to look at)
  rug: { sol() { return []; }, b3(p, A) { A.box(p.c || '#6a2a24', 0, 0, 0.0, p.w, p.d, 0.025); A.box('#c8a050', 0, 0, 0.0, p.w * 0.84, p.d * 0.8, 0.03); A.box(p.c || '#6a2a24', 0, 0, 0.0, p.w * 0.78, p.d * 0.72, 0.035); } },
  // a washing line across a yard
  washline: {
    sol(p) { return [fpiCirc(p, -p.len / 2, 0, 0.08, 2.0), fpiCirc(p, p.len / 2, 0, 0.08, 2.0)]; },
    b3(p, A) {
      for (const s of [-1, 1]) A.cyl(FPI_C.wood3, s * p.len / 2, 0, 0, 0.06, 2.1);
      A.box('#c8c0a8', 0, 0, 1.95, p.len, 0.01, 0.01);
      for (let u = -p.len / 2 + 0.6; u < p.len / 2 - 0.4; u += 0.9 + A.r() * 0.4) A.box(A.r() < 0.5 ? '#d8d0bc' : A.r() < 0.5 ? '#3e5a7a' : '#8a3a30', u, 0, 1.3 + A.r() * 0.2, 0.5 + A.r() * 0.3, 0.02, 0.6 - A.r() * 0.1);
    },
  },
});

// ---------- laying out the station ----------
FPI_GEN.light = {
  built: true,
  set(H) {
    const { I } = H, OX = FPSC.CX, OY = FPSC.CY, HT = ZMC.HT, CE = ZMC.CEIL, TH = 0.5, TOP = HT + 4.2;
    const Z = I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    const W = (x, y) => [OX + x, OY + y];
    const put = (k, x, y, ang, o, opt) => H.put(k, OX + x, OY + y, ang || 0, o || {}, opt);
    const light = (x, y, z, c, r, k) => H.light(OX + x, OY + y, z, c || '#ffc070', r || 9, k || 'lantern');
    const lamp = (x, y, z, c, top) => { put('hlamp', x, y, 0, { z: z || 2.7, c: c || '#ffc070', top }); light(x, y, (z || 2.7) + 0.1, c || '#ffc070', 10); };
    // an axis-aligned wall with its openings: o.mat, o.hh; opens: [{ at, w, k: 'door' | 'arch' | 'win' | 'high' | 'debris', ... }]
    const wall = (x0, y0, x1, y1, o, opens) => {
      const horiz = y0 === y1, a0 = horiz ? Math.min(x0, x1) - TH / 2 : Math.min(y0, y1) - TH / 2, a1 = horiz ? Math.max(x0, x1) + TH / 2 : Math.max(y0, y1) + TH / 2;
      const L = a1 - a0, hh = o.hh || CE, ang = horiz ? 0 : Math.PI / 2, gaps = [], lift = o.lift || 0;
      const at = a => horiz ? [a, y0] : [x0, a];
      const wo = Object.assign({ mat: 'plaster', hh, th: TH, jag: 0, cap: false, noslit: true }, o);
      for (const op of opens || []) {
        const w = op.w || (op.k === 'win' ? 1.6 : op.k === 'arch' ? 2.6 : 2.2);
        gaps.push([(op.at - w / 2 - a0) / L, (op.at + w / 2 - a0) / L]);
        const [mx, my] = at(op.at), lc = wo.mat === 'plaster' ? (o.col2 || ZMP.plaster) : wo.mat === 'wood' ? FPI_C.wood3 : FPI_C.stone3;
        const lintel = z0 => put('block', mx, my, ang, { w: w + 0.04, d: TH + 0.02, hh, z0, col: lc, lift });
        if (op.k === 'door' || op.k === 'debris') {
          lintel(2.5);
          const [wx, wy] = W(mx, my);
          const p = put('zdoor', mx, my, ang, { w: w + 0.1, d: TH * 0.8, hh: 2.5, lift });
          Z.doors.push({ x: wx, y: wy, z: lift, ang, w, cost: op.cost, zones: op.z, kind: op.k, solids: p.sol.slice(), prop: p, open: false, id: Z.doors.length });
        } else if (op.k === 'arch') lintel(2.9);
        else if (op.k === 'win') {
          lintel(2.35);
          put('block', mx, my, ang, { w: w + 0.04, d: TH, hh: 1.0, col: lc, trim: FPI_C.wood3 });
          const [wx, wy] = W(mx, my), [nx, ny] = horiz ? [0, op.out] : [op.out, 0];
          Z.windows.push({ x: wx, y: wy, nx, ny, zone: op.z, boards: 6, id: Z.windows.length, q: [] });
        } else if (op.k === 'high') {
          // a window high up in the tower: solid wall up to its sill, a lintel over it
          put('block', mx, my, ang, { w: w + 0.04, d: TH, hh: op.s0, col: FPI_C.stone3 });
          lintel(op.s1);
        }
      }
      return H.wall(...W(...(horiz ? [a0, y0] : [x0, a0])), ...W(...(horiz ? [a1, y0] : [x0, a1])), wo, gaps);
    };
    const room = (k, extra) => {
      const Zr = ZM_ZONES[k], [x0, x1, y0, y1] = Zr.r, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, d = y1 - y0;
      put('floor', cx, cy, 0, { w: w - 0.1, d: d - 0.1, style: Zr.floor });
      if (!extra || extra.ceil !== false) put('ceil', cx, cy, 0, { w: w + 0.4, d: d + 0.4, z0: (extra && extra.ceilZ) || CE, col: Zr.floor === 'boards' ? '#8a8270' : '#9a9484' });
    };
    for (const k of Object.keys(ZM_ZONES)) if (k !== 'tower') room(k);
    const PL = c => ({ mat: 'plaster', col2: c });
    // the south front, facing the sea
    wall(-44, -21, -26, -21, { mat: 'stone' }, [{ at: -35, k: 'win', out: -1, z: 'wreck' }]);
    wall(-26, -21, -10, -21, PL(ZM_ZONES.fog.wall), [{ at: -18, k: 'win', out: -1, z: 'fog' }]);
    wall(-10, -21, 10, -21, PL(ZM_ZONES.quarters.wall), [{ at: -5, k: 'win', out: -1, z: 'quarters' }, { at: 5, k: 'win', out: -1, z: 'quarters' }]);
    wall(10, -21, 26, -21, PL(ZM_ZONES.oil.wall), [{ at: 18, k: 'win', out: -1, z: 'oil' }]);
    wall(26, -21, 44, -21, { mat: 'wood' }, [{ at: 35, k: 'win', out: -1, z: 'boat' }]);
    // the ends
    wall(-44, -21, -44, 2, { mat: 'stone' }, [{ at: -14, k: 'win', out: -1, z: 'wreck' }, { at: -4, k: 'win', out: -1, z: 'wreck' }]);
    wall(44, -21, 44, 2, { mat: 'wood' }, [{ at: -14, k: 'win', out: 1, z: 'boat' }, { at: -4, k: 'win', out: 1, z: 'boat' }]);
    wall(-44, 2, -26, 2, { mat: 'stone' });
    wall(26, 2, 44, 2, { mat: 'wood' });
    // between the south rooms
    wall(-26, -21, -26, -9.5, { mat: 'stone' }, [{ at: -15, k: 'door', cost: 1000, z: ['fog', 'wreck'] }]);
    wall(-10, -21, -10, -9.5, PL(ZM_ZONES.quarters.wall), [{ at: -15, k: 'door', cost: 750, z: ['quarters', 'fog'] }]);
    wall(10, -21, 10, -9.5, PL(ZM_ZONES.quarters.wall), [{ at: -15, k: 'door', cost: 750, z: ['quarters', 'oil'] }]);
    wall(26, -21, 26, -9.5, { mat: 'wood' }, [{ at: -15, k: 'debris', cost: 1000, z: ['oil', 'boat'] }]);
    // the north sides of the south rooms: onto the passages, the yards and the tower
    wall(-26, -9.5, -16, -9.5, PL(ZM_ZONES.west.wall), [{ at: -21, k: 'door', cost: 1000, z: ['fog', 'west'] }]);
    wall(-16, -9.5, -7.5, -9.5, PL(ZM_ZONES.fog.wall), [{ at: -13, k: 'win', out: 1, z: 'fog' }]);
    wall(7.5, -9.5, 16, -9.5, PL(ZM_ZONES.oil.wall), [{ at: 13, k: 'win', out: 1, z: 'oil' }]);
    wall(16, -9.5, 26, -9.5, PL(ZM_ZONES.east.wall), [{ at: 21, k: 'door', cost: 1000, z: ['oil', 'east'] }]);
    // the passages
    wall(-26, -9.5, -26, 14, { mat: 'stone' });
    wall(-16, -9.5, -16, 14, PL(ZM_ZONES.west.wall), [{ at: -2, k: 'win', out: 1, z: 'west' }, { at: 8, k: 'win', out: 1, z: 'west' }]);
    wall(16, -9.5, 16, 14, PL(ZM_ZONES.east.wall), [{ at: -2, k: 'win', out: -1, z: 'east' }, { at: 8, k: 'win', out: -1, z: 'east' }]);
    wall(26, -9.5, 26, 14, { mat: 'stone' });
    // the hall: its south wall onto the passages, the yards and the lamp passage; its north wall to the sea
    wall(-26, 14, 26, 14, PL(ZM_ZONES.hall.wall), [
      { at: -21, k: 'debris', cost: 1000, z: ['west', 'hall'] }, { at: -9, k: 'win', out: -1, z: 'hall' },
      { at: 0, k: 'door', cost: 1250, z: ['hall', 'lamp'] }, { at: 9, k: 'win', out: -1, z: 'hall' }, { at: 21, k: 'debris', cost: 1000, z: ['east', 'hall'] }]);
    wall(-26, 26, 26, 26, PL(ZM_ZONES.hall.wall), [{ at: -16, k: 'win', out: 1, z: 'hall' }, { at: 0, k: 'win', out: 1, z: 'hall' }, { at: 16, k: 'win', out: 1, z: 'hall' }]);
    wall(-26, 14, -26, 26, { mat: 'stone' });
    wall(26, 14, 26, 26, { mat: 'stone' });
    wall(-2.5, 11.2, -2.5, 14, PL(ZM_ZONES.lamp.wall));
    wall(2.5, 11.2, 2.5, 14, PL(ZM_ZONES.lamp.wall));
    // the Quarters' north wall, onto the yards (the tower stands clear of it now)
    wall(-10, -9.5, 10, -9.5, PL(ZM_ZONES.quarters.wall));
    // ---------- the tower ----------
    const TX = ZMT.X, TY = ZMT.Y, RT = ZMT.R, L5 = ZMT.L[5], TW = (rx, ry) => [TX + rx, TY + ry];
    const tput = (k, rx, ry, ang, o) => put(k, TX + rx, TY + ry, ang || 0, o || {});
    Z.glass = []; Z.tower = { x: OX + TX, y: OY + TY, r: RT, L: ZMT.L.slice() };
    // its wall: thirty-two pieces round, one band to each floor, with windows; the door at the foot onto the passage
    // (z: zombie windows, with boards; g: glazed windows; a: the arch)
    const OPEN = { 0: { 8: 'a', 0: 'z', 16: 'z', 24: 'g', 4: 'g', 12: 'g', 20: 'g', 28: 'g' },
      1: { 4: 'z', 12: 'g', 20: 'g', 28: 'z' }, 2: { 4: 'g', 12: 'z', 20: 'z', 28: 'g' }, 3: { 4: 'z', 12: 'g', 20: 'g', 28: 'z' }, 4: { 4: 'g', 12: 'z', 20: 'z', 28: 'g' } };
    const RC = RT + ZMT.TH / 2, SEG = 2 * RC * Math.sin(Math.PI / ZMT.N) * 1.04;
    for (let i = 0; i < ZMT.N; i++) {
      const a = i / ZMT.N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ang = a + Math.PI / 2, px = TX + ca * RC, py = TY + sa * RC;
      for (let k = 0; k < 6; k++) {
        const z0 = k === 0 ? 0 : ZMT.L[k] - 0.3, z1 = k < 5 ? ZMT.L[k + 1] - 0.3 : L5 + 1.05, Lk = ZMT.L[k];
        const o = (OPEN[k] || {})[i], piece = (zz0, zz1) => put('zwall', px, py, ang, { len: SEG, th: ZMT.TH, z0: zz0, z1: zz1, ring: true });
        if (!o) { piece(z0, z1); continue; }
        if (o === 'a') { piece(Lk + 2.9, z1); continue; }
        piece(z0, Lk + 1.0); piece(Lk + 2.35, z1);
        const zone = k === 0 ? 'tower' : 'tw' + k + (sa >= 0 ? 'n' : 's');
        if (o === 'z') Z.windows.push({ x: OX + px, y: OY + py, nx: ca, ny: sa, zone, z: Lk, boards: 6, id: Z.windows.length, q: [] });
        else Z.glass.push({ x: OX + px, y: OY + py, ang, w: SEG * 0.92, z0: Lk + 1.0, z1: Lk + 2.35, frame: true });
      }
    }
    // the floors, in strips across, round the stairwell (a square hole, railed)
    const HO = ZMT.HOLE;
    for (let k = 1; k <= 5; k++) {
      const top = ZMT.L[k], strips = [];
      for (let y = -RT; y < -HO - 0.01; y += 1) strips.push([y, Math.min(y + 1, -HO)]);
      strips.push([-HO, HO]);
      for (let y = HO; y < RT - 0.01; y += 1) strips.push([y, Math.min(y + 1, RT)]);
      for (const [y0, y1] of strips) {
        const ym = Math.min(Math.abs(y0), Math.abs(y1)) * (y0 < 0 && y1 > 0 ? 0 : 1), xm = Math.sqrt(Math.max(0, (RT + 0.25) ** 2 - ym * ym));
        const pieces = y0 >= -HO && y1 <= HO ? [[-xm, -HO], [HO, xm]] : [[-xm, xm]];
        for (const [x0, x1] of pieces) if (x1 - x0 > 0.2) tput('slab', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0, top });
      }
      // the railing round the stairwell, open on the north side where the stair comes off
      tput('zrail', 0, -HO, 0, { w: 2 * HO, base: top });
      tput('zrail', HO, 0, Math.PI / 2, { w: 2 * HO, base: top });
      tput('zrail', -HO, 0, Math.PI / 2, { w: 2 * HO, base: top });
      for (const sx of [-1, 1]) tput('zrail', sx * (HO + 1.3) / 2, HO, 0, { w: HO - 1.3, base: top });
    }
    // the newel, and the spiral round it: eighteen treads a turn, a turn a floor, each floor's landing on the north side
    tput('newel', 0, 0, 0, { r: 0.9, hh: L5 + 0.9 });
    const nT = ZMT.PER * 5;
    for (let n = 1; n <= nT; n++) {
      const a = Math.PI / 2 + n / ZMT.PER * Math.PI * 2, rm = (ZMT.R0 + ZMT.R1) / 2, near = n % ZMT.PER;
      tput('tread', Math.cos(a) * rm, Math.sin(a) * rm, a, { w: ZMT.R1 - ZMT.R0, d: 1.25, hh: n * ZMT.RISE, rail: !(near <= 1 || near >= ZMT.PER - 1) });
    }
    // a gate across the stair a few steps above each floor: each floor of the tower is bought, on the way up
    const gateCost = [1000, 1250, 1500, 1750, 2000];
    for (let k = 0; k < 5; k++) {
      const n = k * ZMT.PER + 3, a = Math.PI / 2 + (n - 0.5) / ZMT.PER * Math.PI * 2, rm = (ZMT.R0 + ZMT.R1) / 2, h = (n - 1) * ZMT.RISE;
      const [gx, gy] = TW(Math.cos(a) * rm, Math.sin(a) * rm);
      const p = put('zdoor', gx, gy, a, { w: ZMT.R1 - ZMT.R0 + 0.1, d: 0.16, hh: 2.6, lift: h - 0.3 });
      Z.doors.push({ x: OX + gx, y: OY + gy, z: h, ang: a, w: ZMT.R1 - ZMT.R0, cost: gateCost[k], zones: [k === 0 ? 'tower' : 'tw' + k + 'n', k === 4 ? 'top' : 'tw' + (k + 1) + 'n'], kind: 'gate', solids: p.sol.slice(), prop: p, open: false, id: Z.doors.length });
    }
    // each floor's two rooms: a wall across from the stairwell to the tower wall on each side, a door in the east one
    for (let k = 1; k <= 4; k++) {
      const Lk = ZMT.L[k], hh = ZMT.L[k + 1] - 0.3 - Lk;
      wall(TX + HO + 0.1, TY, TX + RT + 0.2, TY, { mat: 'plaster', col2: '#d8d2c0', hh, lift: Lk }, [{ at: TX + 7, k: 'door', cost: 750, z: ['tw' + k + 'n', 'tw' + k + 's'] }]);
      wall(TX - RT - 0.2, TY, TX - HO - 0.1, TY, { mat: 'plaster', col2: '#d8d2c0', hh, lift: Lk });
    }
    // the lantern: a ring of glass on the top floor, with a door east and west onto the gallery outside
    const GR = ZMT.GLASS, NG = 24;
    for (let i = 0; i < NG; i++) {
      const a = (i + 0.5) / NG * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), w = 2 * GR * Math.sin(Math.PI / NG) * 1.02;
      if (i === 0 || i === NG - 1 || i === NG / 2 || i === NG / 2 - 1) continue;   // (the doors)
      tput('glasspane', ca * GR, sa * GR, a + Math.PI / 2, { w, z0: L5 + 0.05, z1: L5 + 4.4 });
    }
    Z.top = { x: OX + TX, y: OY + TY, r: GR - 0.2, z: L5 };
    // the lights: the Light itself, and a lamp in every room
    light(...TW(0, 0), L5 + 1.8, '#fff0c0', 20, 'lens');
    for (let k = 0; k <= 4; k++) {
      const top = k < 4 ? ZMT.L[k + 1] - 0.3 : ZMT.L[5] - 0.3, z = ZMT.L[k] + 3.0;
      if (k === 0) { for (const [x, y] of [[-6, 5], [6, 5], [-6, -4], [6, -4]]) lamp(...TW(x, y), z, '#ffc070', top); }
      else { lamp(...TW(-6.5, 5.5), z, '#ffc070', top); lamp(...TW(6.5, -5.5), z, '#ffc070', top); }
    }
    // ---------- growing things: the yards, the foot of the tower, the rooms ----------
    for (const sx of [-1, 1]) {
      put('bush', sx * 15.1, -8.4, 0, { s: 0.8, flowers: sx > 0 ? '#e8e0d0' : '#e88aa8' });
      put('bush', sx * 14.9, 12.6, 0, { s: 0.9 });
      put('bed', sx * 15.25, 3, Math.PI / 2, { w: 4, d: 0.8, flowers: '#e88aa8' });
      put('bed', sx * 12.6, 13.25, 0, { w: 3.4, d: 0.7, flowers: sx > 0 ? '#f0d060' : '#e8e0d0' });
      put('bed', sx * 12.8, -8.8, 0, { w: 2.6, d: 0.7, flowers: '#d84050' });
    }
    put('washline', 4.2, 9.6, 0.35, { len: 4.2 });
    // round the foot of the tower, ivy and thrift
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.2; if (Math.abs(Math.sin(a) - 1) < 0.25) continue; put('bed', ZMT.X + Math.cos(a) * (ZMT.R + 0.9), ZMT.Y + Math.sin(a) * (ZMT.R + 0.9), a + Math.PI / 2, { w: 2.6, d: 0.55, flowers: i % 3 ? '#e88aa8' : '#e8e0d0' }); }
    // grass in the yards, and round the station outside
    { const rr = seeded(0x5ea9); let n = 0;
      for (let t = 0; t < 2400 && n < 420; t++) {
        const x = (rr() - 0.5) * 120, y = (rr() - 0.5) * 90 - 0;
        const inYard = Math.abs(x) > 10.9 && Math.abs(x) < 15.7 && y > -9.2 && y < 13.7, inTowerYard = Math.abs(x) < 15.7 && y > -9.2 && y < 13.7 && Math.hypot(x - ZMT.X, y - ZMT.Y) > ZMT.R + 0.7 && Math.abs(x) > 2.8;
        const outside = (x < -44.5 || x > 44.5 || y < -21.5 || y > 26.5) && Math.hypot(x, y) < FPSC.R - 4;
        if (!(inYard || inTowerYard || outside)) continue;
        H.decor('tuft', OX + x, OY + y, { s: 0.7 + rr() * 0.8, c: rr() < 0.5 ? '#4e6a38' : '#5e7040' }); n++;
      }
      for (let i = 0; i < 26; i++) { const a = rr() * 6.283, d = 52 + rr() * 26, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.8; if (Math.hypot(x, y) < FPSC.R - 6) put('stone', x, y, rr() * 6.283, { w: 0.9 + rr(), d: 0.6 + rr() * 0.5, hh: 0.6 + rr() * 1.2, lean: (rr() - 0.5) * 0.3 }); }
    }
    // pot plants about the rooms below
    for (const [x, y, sz, fl] of [[8.8, -12.2, 1.2, '#d84050'], [-8.8, -20, 0.9, null], [24.5, -4, 1.0, null], [-24.4, 1.5, 1.1, '#e8e0d0'], [-24.8, 15.2, 1.3, null], [24.6, 24.6, 1.2, '#e8a0c0'], [1.6, 13.3, 0.9, null], [-1.6, 13.3, 0.9, null], [43, -19.8, 1.0, null], [-42.8, -19.8, 1.0, '#d84050']]) put('plant', x, y, 0, { s: sz, flowers: fl || undefined });
    // ---------- in the tower's rooms ----------
    // (a thing against the tower wall at angle a: where, and which way round)
    const atWall = (a, r) => [TX + Math.cos(a) * r, TY + Math.sin(a) * r, a + Math.PI / 2];
    const onFloor = (k, kind, x, y, ang, o) => put(kind, x, y, ang || 0, Object.assign({ lift: ZMT.L[k] }, o || {}));
    // the Tower Foot: casks of oil, coils, ferns by the door
    fpiBarrels(H, OX + TX - 7, OY + TY - 4.5); fpiBarrels(H, OX + TX + 7.2, OY + TY - 3.5);
    put('coil', TX - 6, TY + 6.2, 0, {}); put('plant', TX - 2.3, TY + 8.4, 0, { s: 1.4 }); put('plant', TX + 2.3, TY + 8.4, 0, { s: 1.4 });
    put('cart', TX + 6.2, TY + 4.6, 0.6, {}); put('rug', TX, TY + 6.2, 0, { w: 3, d: 1.8, c: '#3e5a6a' });
    put('picture', ...atWall(-Math.PI / 2, RT - 0.05).slice(0, 2), Math.PI, { z: 1.4, w: 1.4, h: 0.9, sea: true });
    // 1: the Watch Room (a desk, the log, a telescope at the window) and the Oil Room
    { const k = 1;
      onFloor(k, 'table', TX - 6.2, TY + 5.4, 0.5, { w: 2.0, d: 1.0, cloth: '#c8b890' }); onFloor(k, 'bench', TX - 6.6, TY + 4.5, 0.5, { w: 1.4 });
      onFloor(k, 'telescope', ...TW(Math.cos(Math.PI * 0.3) * 8.3, Math.sin(Math.PI * 0.3) * 8.3), 0.9);
      onFloor(k, 'plant', TX - 2.8, TY + 8.9, 0, { s: 1.1, flowers: '#d84050' }); onFloor(k, 'plant', TX + 8.2, TY + 2.6, 0, { s: 0.9, flowers: '#e8e0d0' });
      { const [x, y, a] = atWall(Math.PI * 0.62, RT - 0.3); onFloor(k, 'shelf', x, y, a, { w: 2.0, goods: 'books' }); }
      onFloor(k, 'picture', ...atWall(Math.PI * 0.82, RT - 0.04).slice(0, 2), Math.PI * 0.82 + Math.PI / 2, { z: 1.5, w: 1.2, h: 0.8, c: '#c8b890' });
      for (const [x, y] of [[-6.6, -5.2], [-4.6, -7.4]]) onFloor(k, 'tank', TX + x, TY + y, 0, { r: 0.75, hh: 1.9, c: '#4a5a4a' });
      { const [x, y, a] = atWall(-Math.PI * 0.25, RT - 0.3); onFloor(k, 'shelf', x, y, a, { w: 2.2, goods: 'cans' }); }
      onFloor(k, 'plant', TX + 4.4, TY - 8.6, 0, { s: 1.0 });
    }
    // 2: the Chart Room (a table of charts, books, a globe) and the Bunk Room
    { const k = 2;
      onFloor(k, 'table', TX + 6, TY + 4.8, -0.5, { w: 2.4, d: 1.3, cloth: '#d8ccaa' }); onFloor(k, 'globe', TX - 6.4, TY + 5.6, 0, {});
      { const [x, y, a] = atWall(Math.PI * 0.4, RT - 0.3); onFloor(k, 'shelf', x, y, a, { w: 2.2, goods: 'books' }); }
      onFloor(k, 'rug', TX + 5.5, TY + 4.6, -0.5, { w: 3.2, d: 2.2, c: '#5a2a2a' }); onFloor(k, 'plant', TX + 8.6, TY + 1.4, 0, { s: 1.2 });
      onFloor(k, 'picture', ...atWall(Math.PI * 0.18, RT - 0.04).slice(0, 2), Math.PI * 0.18 + Math.PI / 2, { z: 1.4, w: 1.6, h: 1.0, c: '#d8ccaa', sea: true });
      for (const a of [-0.62, -0.88]) { const [x, y, ang] = atWall(Math.PI * (a), RT - 0.8); onFloor(k, 'bunk', x, y, ang, {}); }
      onFloor(k, 'crates', TX - 7.4, TY - 3.0, 0.3, { items: [{ u: 0, v: 0, s: 0.9, h0: 0, ry: 0.1 }] });
      onFloor(k, 'plant', TX - 3.0, TY - 8.8, 0, { s: 0.9, flowers: '#e8a0c0' });
    }
    // 3: the Clock Room (the clockwork that turns the lens) and the Lamp-Wright's Store
    { const k = 3;
      onFloor(k, 'clockwork', TX - 6.2, TY + 4.6, 0.6, {}); onFloor(k, 'clockwork', TX + 6.3, TY + 4.4, -0.6, {});
      onFloor(k, 'plant', TX + 1.0, TY + 9.0, 0, { s: 1.0 });
      { const [x, y, a] = atWall(-Math.PI * 0.3, RT - 0.3); onFloor(k, 'shelf', x, y, a, { w: 2.2, goods: 'prisms' }); }
      { const [x, y, a] = atWall(-Math.PI * 0.7, RT - 0.3); onFloor(k, 'shelf', x, y, a, { w: 2.2, goods: 'prisms' }); }
      onFloor(k, 'crates', TX - 7.4, TY - 3.2, 0.2, { items: [{ u: 0, v: 0, s: 1.0, h0: 0, ry: 0.1 }, { u: 1.05, v: 0, s: 0.9, h0: 0, ry: -0.1 }] });
    }
    // 4: the Service Room (wicks and oil, herbs drying) and the Keeper's Study
    { const k = 4;
      onFloor(k, 'table', TX - 6, TY + 5.2, 0.6, { w: 2.2, d: 1.0 }); onFloor(k, 'herbs', TX - 6, TY + 5.2, 0.6, { w: 2.2, z: 3.4 });
      onFloor(k, 'plant', TX + 7.6, TY + 4.2, 0, { s: 1.3, flowers: '#d84050' }); onFloor(k, 'plant', TX - 1.6, TY + 9.0, 0, { s: 1.0 });
      onFloor(k, 'table', TX + 5.6, TY - 5.4, -0.6, { w: 1.8, d: 1.0, cloth: '#3a4a3a' }); onFloor(k, 'rug', TX + 4.6, TY - 5.0, -0.6, { w: 3, d: 2, c: '#2e3e5a' });
      { const [x, y, a] = atWall(-Math.PI * 0.75, RT - 0.3); onFloor(k, 'shelf', x, y, a, { w: 2.2, goods: 'books' }); }
      onFloor(k, 'picture', ...atWall(-Math.PI * 0.52, RT - 0.04).slice(0, 2), -Math.PI * 0.52 + Math.PI / 2, { z: 1.4, w: 1.0, h: 1.2, c: '#6a5a4a' });
      onFloor(k, 'plant', TX - 7.8, TY - 2.4, 0, { s: 1.4 });
    }
    // ---------- what's in the rooms ----------
    // the Keeper's Quarters: a table by the range, bunks, a dresser, a clock, a rug
    put('stove', -7.6, -19.6, 0, {}); light(-7.85, -20.1, 0.5, '#ff8a30', 7, 'fire');
    put('table', -3, -14.5, 0, { w: 2.6, d: 1.3, cloth: '#7a2a24' });
    put('bench', -3, -15.6, 0, { w: 2.2 }); put('bench', -3, -13.4, 0, { w: 2.2 });
    put('bunk', 7.6, -19.8, 0, {});
    put('shelf', -9.5, -18.2, Math.PI / 2, { w: 2.2, goods: 'jars' });
    put('shelf', 3, -10.2, 0, { w: 2.0, goods: 'books' });
    lamp(-3, -14.5, 2.7); lamp(5, -17, 2.7);
    // the Oil Store: tanks, drums and cans
    for (const [x, y] of [[23.4, -19], [20.6, -19]]) put('tank', x, y, 0, { r: 1.1, hh: 2.3, c: '#3a4a44' });
    fpiBarrels(H, OX + 13, OY + -19.5); fpiBarrels(H, OX + 17.5, OY + -13);
    put('shelf', 24, -10.2, 0, { w: 2.4, goods: 'cans' });
    lamp(17, -15, 2.7); lamp(23, -13, 2.7);
    // the Fog-Signal House: the engine, its air receivers, the horn out through the wall
    put('engine', -17.5, -17.6, 0, {});
    for (const [x, y] of [[-12.6, -18.8], [-12.6, -16.2]]) put('tank', x, y, 0, { r: 0.85, hh: 2.0, c: '#4a3a34' });
    put('shelf', -24.3, -10.2, 0, { w: 2.0, goods: 'cans' });
    lamp(-18, -14, 2.7); lamp(-12.5, -12, 2.7);
    // the East Passage: stores along the way
    fpiCrates(H, OX + 24.4, OY + -5, true); fpiCrates(H, OX + 17.8, OY + 11.8, false); fpiBarrels(H, OX + 24.6, OY + 2.8);
    put('coil', 24.8, 11.5, 0, {});
    lamp(21, -4, 2.7); lamp(21, 6, 2.7);
    // the Net Loft: nets drying, oars, floats
    put('rack', -24.6, -4, Math.PI / 2, { len: 3.6, nets: true }); put('rack', -24.6, 10.5, Math.PI / 2, { len: 3, nets: true });
    fpiPots(H, OX + -17.6, OY + 12); put('coil', -17.8, -7.6, 0, {});
    lamp(-21, -3, 2.7); lamp(-21, 7, 2.7);
    // the Store Hall: shelves of stores and spare prisms, crates, a long table
    for (const x of [-18, -4]) put('shelf', x, 15.2, 0, { w: 3, goods: x < -10 ? 'crates' : 'prisms' });
    put('shelf', 22, 25.3, 0, { w: 3, goods: 'crates' });
    put('table', 12.5, 19, 0, { w: 4, d: 1.2 }); put('bench', 12.5, 17.9, 0, { w: 3.4 });
    fpiCrates(H, OX + -19, OY + 23.5, true); fpiCrates(H, OX + 23.5, OY + 19.5, true); fpiBarrels(H, OX + -24, OY + 24.5);
    for (const x of [-18, -6, 6, 18]) lamp(x, 20, 2.7);
    // the Lamp Passage
    lamp(0, 12.6, 2.7);
    // the Boathouse: the lifeboat on her slip, oars, the winch
    put('boat', 35, -10, 0, { len: 6.2, beam: 2.0, paint: '#2e4a6a', upright: true });
    put('rack', 42.6, 0, Math.PI / 2, { len: 2.4, nets: true }); fpiCrates(H, OX + 29, OY + -18.8, false); put('coil', 40.5, -19.5, 0, {});
    lamp(30, -14, 2.7); lamp(39, -6, 2.7);
    // the Wreck Store: what the sea gave back
    put('anchor', -38, -17.5, 0.4, {}); put('cannon', -32, -5.5, 0.2, { len: 2.4 }); fpiCrates(H, OX + -41.5, OY + 0, true); fpiBarrels(H, OX + -29, OY + -18.6);
    put('shelf', -35, 1.3, 0, { w: 3, goods: 'crates' });
    lamp(-35, -14, 2.7); lamp(-35, -4, 2.7);
    // the yards: a few things against the walls
    fpiBarrels(H, OX + -9, OY + -8); fpiBarrels(H, OX + 9, OY + -8); fpiCrates(H, OX + -9.4, OY + 12.6, false); fpiCrates(H, OX + 9.4, OY + 12.6, false);
    // ---------- what's for sale ----------
    // wall buys: the weapon on its board on a wall (x, y: the wall's face; ang: the way the board faces)
    // (nx, ny: the way out from the wall, into the room)
    const buy = (id, cost, x, y, nx, ny) => { put('board', x, y, ny ? 0 : Math.PI / 2, {}); const [wx, wy] = W(x, y); Z.buys.push({ id, cost, x: wx, y: wy, nx, ny, z: 0 }); };
    buy('longarm', 500, 0, -20.7, 0, 1);
    buy('blunderbuss', 500, -9.7, -11.8, 1, 0);
    buy('pepperbox', 250, 17.8, -9.8, 0, -1);
    buy('cutlass', 750, -25.7, -11.8, 1, 0);
    buy('avtomat', 1200, 25.7, 8, -1, 0);
    buy('harpoon', 1000, -25.7, 6, 1, 0);
    buy('blunderbuss', 500, 43.7, -9, -1, 0);
    // tonics (x, y: the cabinet; face: the way its front looks)
    // (a cabinet's front faces (sin a, -cos a))
    const perk = (k, x, y, a) => { put('tonic', x, y, a, { c: ZM_PERKS[k].c }); const [wx, wy] = W(x, y), nx = Math.round(Math.sin(a)), ny = Math.round(-Math.cos(a)); Z.perks.push({ k, x: wx, y: wy, nx, ny, z: 0 }); light(x + nx * 0.7, y + ny * 0.7, 1.5, ZM_PERKS[k].c, 5, 'lantern'); };
    perk('wind', 6.2, -10.2, 0);
    perk('stout', -10, 25.3, 0);
    perk('quick', -43.3, -9, Math.PI / 2);
    perk('fleet', 30.5, 1.3, 0);
    // where the wreck chest can be: four on the ground floor, one at the top of the tower
    // (nx, ny: the way the chest faces)
    const spot = (x, y, nx, ny, base, zone) => { put('plinth', x, y, ny ? 0 : Math.PI / 2, { base }); const [wx, wy] = W(x, y); Z.spawns.push({ x: wx, y: wy, nx, ny, z: (base || 0) + 0.32, zone }); };
    spot(-24.6, -17.8, 1, 0, 0, 'fog');
    spot(17.2, 3, 1, 0, 0, 'east');
    spot(6, 25, 0, -1, 0, 'hall');
    spot(-38, 0.9, 0, -1, 0, 'wreck');
    spot(ZMT.X, ZMT.Y - 5.6, 0, 1, ZMT.L[5], 'top');
    // wall buys up the tower
    { const at = (a, k, id, cost) => { const r = ZMT.R - 0.07, x = ZMT.X + Math.cos(a) * r, y = ZMT.Y + Math.sin(a) * r; put('board', x, y, a + Math.PI / 2, { lift: ZMT.L[k] }); const [wx, wy] = W(x, y); Z.buys.push({ id, cost, x: wx, y: wy, nx: -Math.cos(a), ny: -Math.sin(a), z: ZMT.L[k] }); };
      at(Math.PI * 0.9, 2, 'avtomat', 1200); at(Math.PI * 0.12, 4, 'longarm', 500); at(-Math.PI * 0.12, 3, 'harpoon', 1000); }
    if (typeof zmpPlace === 'function') zmpPlace(put, light, W, Z);   // [pap] the Lampwright's Bench (src/zmpap.js)
  },
  decor(H) {},
};

// ---------- the arena ----------
function zmArena() {
  const G = {
    fps: true, zm: true, t: 0, beam: Math.PI, period: FPSC.PERIOD, flares: [], rocks: [], wrecks: [], timber: [], pickups: [], lures: [],
    mods: { lantern: 1 }, biome: 'skerry', minVis: 0.5, island: { x: FPSC.CX, y: FPSC.CY, r: FPSC.R, z: FPSC.GROUND },
    backrooms: false, sky: false, enemies: { drowned: [], knocks: [] }, maren: { active: false }, lightning: 0, parts: [],
  };
  fpsIsleGen(G, 0, seeded(0x11947), 'light');
  G.island.key = G.isle.key = 'light:' + Date.now();
  return G;
}
// which room a place is in (and the lantern room, up the tower)
function zmZoneAt(x, y, z) {
  const lx = x - FPSC.CX, ly = y - FPSC.CY, tx = lx - ZMT.X, ty = ly - ZMT.Y;
  // in the tower: which floor, and which half of it
  if (Math.hypot(tx, ty) < ZMT.R + 0.2) {
    let k = 0; for (let i = 1; i < 6; i++) if ((z || 0) >= ZMT.L[i] - 0.6) k = i;
    return k === 0 ? 'tower' : k === 5 ? 'top' : 'tw' + k + (ty >= 0 ? 'n' : 's');
  }
  for (const k in ZM_ZONES) { if (k === 'tower') continue; const [x0, x1, y0, y1] = ZM_ZONES[k].r; if (lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1) return k; }
  return null;
}
const zmZoneName = k => ZM_TROOMS[k] || (ZM_ZONES[k] ? ZM_ZONES[k].n : '');
// is this room open to you yet (and so to them)?
const zmOpen = k => ZM.open.has(k);

// ---------- standing, walking and climbing ----------
// the solids near a place (the index the islands use)
function zmNear(x, y) { const I = FPS.g.isle; return I.sh.get(Math.floor(x / 6) * 65536 + Math.floor(y / 6)) || []; }
// in the way of something whose feet are at height feet? (stairs and floors low enough to step up onto aren't)
function zmBlockedAt(x, y, pad, feet) {
  if (Math.hypot(x - FPSC.CX, y - FPSC.CY) > FPSC.R - 1.5) return true;
  for (const s of zmNear(x, y)) {
    // (only what stands across the height of your body: not a floor above your head, nor one you can step up on,
    // nor anything below your feet)
    const bot = s.z0 != null ? s.z0 - FPSC.GROUND : 0, top = s.z1 - FPSC.GROUND;
    if (bot >= feet + 1.9 || top <= feet + (s.fl ? ZMC.STEP : 0.05)) continue;
    if (fpiDist(s, x, y) < pad) return true;
  }
  return false;
}
// the height of the floor under a place, for something standing at feet
function zmFloorAt(x, y, feet, pad) {
  let fl = 0;
  for (const s of zmNear(x, y)) {
    if (!s.fl) continue;
    const top = s.z1 - FPSC.GROUND;
    if (top > fl && top <= feet + ZMC.STEP && fpiDist(s, x, y) < (pad == null ? 0.22 : pad)) fl = top;
  }
  return fl;
}
// move with sliding, then stand on whatever's underneath: step up onto it, step down a stair, or fall
function zmMove(m, dx, dy) {
  const feet = m.jz || 0, pad = m.zpad || 0.5;
  // (you can't walk through them: the drowned crowd you in)
  const free = m === FPS.me ? (x, y) => !zmBlockedAt(x, y, pad, feet) && !zmCrowd(m, x, y) : (x, y) => !zmBlockedAt(x, y, pad, feet);
  let ok = true;
  if (free(m.x + dx, m.y + dy)) { m.x += dx; m.y += dy; }
  else if (free(m.x + dx, m.y)) m.x += dx;
  else if (free(m.x, m.y + dy)) m.y += dy;
  else ok = false;
  zmSettle(m);
  return ok;
}
function zmCrowd(m, x, y) {
  for (const z of ZM.z) {
    if (z.dead || z.st !== 'in' || Math.abs((z.jz || 0) - (m.jz || 0)) > 1.2) continue;
    const d = Math.hypot(z.x - x, z.y - y);
    if (d < (z.boss ? 1.3 : 0.7) && d < Math.hypot(z.x - m.x, z.y - m.y) - 0.001) return true;   // [boss] he's broader
  }
  return false;
}
function zmSettle(m) {
  const jz = m.jz || 0, fl = zmFloorAt(m.x, m.y, jz), air = (m.vz || 0) !== 0 || jz > (m.fl || 0) + 0.02;
  m.fl = fl;
  if (air) return;
  if (fl > jz || jz - fl <= ZMC.STEP + 0.05) {
    if (m === FPS.me) FPS.eyeLag = clamp((FPS.eyeLag || 0) + (fl - jz), -0.8, 0.8);
    m.jz = fl;
  }
}
function zmSpeedK() { return ZM.perks.fleet ? 1.22 : 1; }
function zmReloadK() { return ZM.perks.quick ? 0.5 : 1; }
function zmCanReload() { const w = fpsW(); return w.melee || (ZM.res[FPS.weapon] || 0) > 0; }

// ---------- the grid the drowned find their way by ----------
// Cells half a metre across over the whole station. A cell can have several places to stand, one above another
// (the ground, a stair tread, each floor of the tower): each is a node, with its height. From wherever you are (all
// of you, together), how far each node is from the nearest of you, walking round walls and up and down stairs.
function zmNavBuild() {
  const S = ZMC.NAV, x0 = FPSC.CX - 46, y0 = FPSC.CY - 23, nx = Math.ceil(92 / S), ny = Math.ceil(51 / S), nc = nx * ny;
  const first = new Int32Array(nc + 1), hs = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + (i + 0.5) * S, y = y0 + (j + 0.5) * S, k = j * nx + i, near = zmNear(x, y);
    first[k] = hs.length;
    // what you could stand on here: the ground, and the top of every floor under the point
    // (a hair over the edges, so a cell on the line between two treads stands on the higher)
    const cand = [0];
    for (const s of near) if (s.fl && fpiDist(s, x, y) < 0.06) cand.push(s.z1 - FPSC.GROUND);
    cand.sort((a, b) => b - a);
    let last = 1e9;
    for (const h of cand) {
      if (last - h < 0.45) continue;   // (treads close together count as one place, the higher)
      let ok = true;
      for (const s of near) {
        const bot = s.z0 != null ? s.z0 - FPSC.GROUND : 0, top = s.z1 - FPSC.GROUND;
        if (bot >= h + 1.85 || top <= h + (s.fl ? ZMC.STEP : 0.05)) continue;
        if (fpiDist(s, x, y) < 0.3) { ok = false; break; }
      }
      last = h;
      if (ok) hs.push(h);
    }
  }
  first[nc] = hs.length;
  const nn = hs.length, cellOf = new Int32Array(nn);
  for (let k = 0; k < nc; k++) for (let a = first[k]; a < first[k + 1]; a++) cellOf[a] = k;
  ZM.nav = { S, x0, y0, nx, ny, first, h: Float32Array.from(hs), cellOf, d: new Float32Array(nn).fill(1e9) };
}
function zmCell(x, y) {
  const N = ZM.nav, i = Math.floor((x - N.x0) / N.S), j = Math.floor((y - N.y0) / N.S);
  if (i < 0 || j < 0 || i >= N.nx || j >= N.ny) return -1;
  return j * N.nx + i;
}
// the place in cell c nearest height jz (within reach), or -1
function zmNodeIn(c, jz, tol) {
  const N = ZM.nav; if (c < 0) return -1;
  let best = -1, bd = tol == null ? 0.8 : tol;
  for (let a = N.first[c]; a < N.first[c + 1]; a++) { const d = Math.abs(N.h[a] - jz); if (d < bd) { bd = d; best = a; } }
  return best;
}
// the place in a neighbouring cell you can walk to from node a, or -1
function zmStepTo(a, c2) {
  const N = ZM.nav, h = N.h[a];
  for (let b = N.first[c2]; b < N.first[c2 + 1]; b++) if (Math.abs(N.h[b] - h) <= ZMC.STEP + 0.02) return b;
  return -1;
}
function zmEdgeTo(a, di, dj) {
  const N = ZM.nav, c = N.cellOf[a], ci = c % N.nx, cj = (c - ci) / N.nx, i = ci + di, j = cj + dj;
  if (i < 0 || j < 0 || i >= N.nx || j >= N.ny) return -1;
  const b = zmStepTo(a, j * N.nx + i); if (b < 0) return -1;
  if (di && dj && (zmStepTo(a, c + di) < 0 || zmStepTo(a, c + dj * N.nx) < 0)) return -1;
  return b;
}
const ZM_NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
// the node to count from for someone standing at (x, y, jz), or -1 (at an edge: the nearest good place at your height)
function zmNavStart(x, y, jz) {
  const N = ZM.nav, c = zmCell(x, y); if (c < 0) return -1;
  let s = zmNodeIn(c, jz, 0.7);
  if (s >= 0) return s;
  const ci = c % N.nx, cj = (c - ci) / N.nx; let bd = 1e9;
  for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
    const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N.nx || j >= N.ny) continue;
    const a = zmNodeIn(j * N.nx + i, jz, 0.7); if (a < 0) continue;
    const dd = di * di + dj * dj; if (dd < bd) { bd = dd; s = a; }
  }
  return s;
}
// distances from everyone still on their feet, each place to the nearest of them (Dijkstra, with a small binary heap)
function zmNavFrom(players) {
  const N = ZM.nav, d = N.d, starts = [];
  for (const p of players) { const s = zmNavStart(p.x, p.y, p.jz || 0); if (s >= 0) starts.push(s); }
  if (!starts.length) return;   // (nowhere to start from: keep the last distances)
  d.fill(1e9);
  const heap = [];
  const up = i => { while (i > 0) { const p = (i - 1) >> 1; if (d[heap[p]] <= d[heap[i]]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const down = i => { for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && d[heap[l]] < d[heap[m]]) m = l; if (r < heap.length && d[heap[r]] < d[heap[m]]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } };
  for (const s of starts) { d[s] = 0; heap.push(s); up(heap.length - 1); }
  const done = new Uint8Array(d.length);
  while (heap.length) {
    const a = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; down(0); }
    if (done[a]) continue; done[a] = 1;
    for (const [di, dj, cost] of ZM_NB) {
      const b = zmEdgeTo(a, di, dj); if (b < 0 || done[b]) continue;
      const nd = d[a] + cost; if (nd < d[b]) { d[b] = nd; heap.push(b); up(heap.length - 1); }
    }
  }
}
// how far a place is from the nearest of you, by the walk (1e9: no way there)
function zmNavDist(x, y, jz) { const a = zmNodeIn(zmCell(x, y), jz || 0, 0.8); return a < 0 ? 1e9 : ZM.nav.d[a]; }
// where to head next from (x, y) at height jz: a point a couple of cells further along the shortest way to you
function zmNavNext(x, y, jz) {
  const N = ZM.nav; let a = zmNodeIn(zmCell(x, y), jz || 0, 0.8);
  if (a < 0) return null;
  let target = null;
  for (let hop = 0; hop < 3; hop++) {
    let best = -1, bd = N.d[a];
    for (const [di, dj] of ZM_NB) { const b = zmEdgeTo(a, di, dj); if (b >= 0 && N.d[b] < bd) { bd = N.d[b]; best = b; } }
    if (best < 0) break;
    a = best; const c = N.cellOf[a], bi = c % N.nx, bj = (c - bi) / N.nx; target = [N.x0 + (bi + 0.5) * N.S, N.y0 + (bj + 0.5) * N.S];
  }
  return target;
}

// ---------- a game ----------
function zmReset() {
  const I = FPS.g.isle, Zd = I.zm;
  Object.assign(ZM, {
    on: true, own: ['pepperbox'], res: { pepperbox: 48 }, pts: ZMC.START, round: 0, phase: 'pre', t: 3, left: 0, spawnT: 0,
    z: [], drops: [], perks: {}, windBuys: 0, double: 0, insta: 0, dropsRound: 0, kills: 0, heads: 0, downs: 0, spent: 0, doorsOpened: 0,
    open: new Set(['quarters']), zone: 'quarters', zoneT: 4, banner: null, pops: [], fx: [], sparks: [], over: null, earnK: 0, navT: 0,
    box: { at: 0, uses: 0, spins: 0, st: 'idle', t: 0, item: null, cyc: 0, show: 'avtomat', owner: null }, near: null, rebuildT: 0, groanT: 2,
    zc: 0, credit: {}, players: [], downT: 0, ghost: false, revT: 0, revOf: null, boardBy: {}, boardPts: 0,
    doors: Zd.doors, windows: Zd.windows, buys: Zd.buys, perksAt: Zd.perks, spawns: Zd.spawns, glass: Zd.glass || [],
  });
  for (const w of ZM.windows) { w.boards = 6; w.q = []; w.fall = []; }
  if (typeof zmpReset === 'function') zmpReset();   // [pap]
  if (typeof zeReset === 'function') zeReset();   // [egg hook] src/zmegg.js
}
// opts (playing together, src/zmnet.js): { net: 'host' | 'client', hum: [[sid, nick], ...] }
function zmStart(opts) {
  if (FPS.on) return;
  opts = opts && opts.net ? opts : {};
  FPS.nick = (typeof NET !== 'undefined' && NET.nick) || 'Keeper';
  FPS.on = true; FPS.zm = true;
  FPS.saved = { state };
  state = 'fps'; paused = false;
  try { audioInit(); } catch (e) {}
  $('titleCard').hidden = true; $('hud').hidden = true; $('logbox').hidden = true; $('biomeBanner').hidden = true;
  $('stage').classList.add('fpsmode', 'zmmode');
  FPS.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window && navigator.maxTouchPoints > 0;
  $('fpsPad').hidden = !FPS.touch; FPS.hintT = 8; if (FPS.touch) fpsSafeArea();
  { const e = document.querySelector('#fpsMenu .eyebrow'); if (e) e.textContent = 'The Lighthouse waits for you'; $('fpsLeave').textContent = 'Leave the Lighthouse'; $('fpsResume').textContent = 'Back to the Light'; }
  FPS.g = zmArena();
  const [sx, sy] = [FPSC.CX, FPSC.CY - 15];
  FPS.me = { id: (typeof NET !== 'undefined' && NET.sid) || 'me', x: sx, y: sy, h: 0, p: 0, v: 0, z: 0, rudder: 0, bob: 0, boat: 'brig', inv: 0, pitch: 0,
    hp: ZMC.HP, ammo: 6, mags: {}, reload: 0, cd: 0, flares: 0, lan: true, dead: 0, protect: 2, killer: null, jz: 0, vz: 0, fl: 0, me: true };
  for (const id in FPSW) FPS.me.mags[id] = FPSW[id].mag;
  FPS.kb = {}; FPS.deaths = 0; FPS.seq = 0; FPS.shots = []; FPS.seenSeq = {}; FPS.hist = []; FPS.host = true; FPS.joinedAt = performance.now(); FPS.ai = null;
  FPS.remote.clear(); FPS.feed = []; FPS.pings = []; FPS.tracers = []; FPS.parts = []; FPS.drowned = []; FPS.bots = [];
  FPS.roundMsg = null; FPS.menu = false; $('fpsMenu').hidden = true; FPS.eyeLag = 0; FPS.landed = 0; FPS.calm = 0; FPS.climb = 0;
  FPS.weapon = FPS.last = 'pepperbox'; FPS.harps = []; FPS.swings = []; FPS.scoped = false; FPS.reloadDur = 0; FPS.drawT = 0.45;
  zmReset();
  ZM.net = opts.net || null; ZM.hum = opts.hum || [[FPS.me.id, FPS.nick]];
  // (together: each comes up in a different corner of the Quarters)
  const slot = Math.max(0, ZM.hum.findIndex(h => h[0] === FPS.me.id));
  if (ZM.net) { FPS.me.x += [0, 4, -4, 0][slot % 4]; FPS.me.y += [0, -2, -2, 3][slot % 4]; }
  zmNavBuild();
  $('zmOver').hidden = true;
  $('zmAgain').textContent = ZM.net ? 'Back to the lobby' : 'Hold it again';
  fpsFeed(ZM.net ? `You come up from the boat into the Keeper’s Quarters, ${ZM.hum.length} of you. Hold the Light.` : 'You come up from the boat into the Keeper’s Quarters. Hold the Light.');
  try { cv.focus(); } catch (e) {}
}
function zmStop() {
  if (ZM.net && typeof zmnStop === 'function') zmnStop();
  if (typeof zmpStop === 'function') zmpStop();   // [pap]
  ZM.on = false; ZM.net = null; FPS.zm = false; FPS.eyeLag = 0;
  $('stage').classList.remove('zmmode'); $('zmOver').hidden = true;
  { const e = document.querySelector('#fpsMenu .eyebrow'); if (e) e.textContent = "Wreckers' Night carries on without you"; $('fpsLeave').textContent = 'Leave the island'; $('fpsResume').textContent = 'Back to the fight'; }
  if (Z3.grp) Z3.grp.visible = false;
  if (typeof GL3D !== 'undefined' && GL3D.tower) GL3D.tower.visible = true;
  if (typeof GL3D !== 'undefined' && GL3D.amb) { GL3D.amb.intensity = 0.9; GL3D.moon.intensity = 0.35; }
  for (const d of FPS.drowned) if (d.mdl) zmFreeModel(d);
  FPS.drowned = [];
}

// ---------- each frame ----------
function zmFrame(dt) {
  FPS.dtLast = dt;
  const G = FPS.g, m = FPS.me, saved = [g, ship];
  g = G; ship = m;
  try {
    G.t += dt; G.beam = Math.PI;
    G.mods.lantern = m.lan ? 1 : 0.3;
    // (alone, the menu holds everything still; together, the night goes on)
    const live = (!FPS.menu || ZM.net) && !ZM.over;
    if (live && !FPS.menu) fpsInput(dt); else { FPS.look = [0, 0]; FPS.mlook = [0, 0]; m.walk = false; }
    if (FPS.menu) fpsMenuPad(dt);
    if (live) {
      if (m.protect > 0) m.protect -= dt;
      // patched up quickly, if they leave you alone for a few seconds
      FPS.calm = (FPS.calm || 0) + dt;
      const max = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
      if (m.dead <= 0 && m.hp < max && FPS.calm > 3.2) m.hp = max;
      if (ZM.downT > 0) { ZM.downT -= dt; if (ZM.downT <= 0) zmBleedOut(); }
      if (m.cd > 0) m.cd -= dt;
      if (m.reload > 0) { m.reload -= dt; if (m.reload <= 0) { m.reload = 0; zmReloaded(); } }
      if (FPS.drawT > 0) FPS.drawT -= dt;
      if (FPS.knifeT > 0) FPS.knifeT -= dt;
      fpsJumpTick(m, dt);
      if (FPS.landed > 0) FPS.landed -= dt;
      if (FPS.meFlashT > 0) FPS.meFlashT -= dt; if (FPS.meSlashT > 0) FPS.meSlashT -= dt;
      if (!FPS.mouseDown && !FPS.touchFire && !FPS.padFire) FPS.heldFire = false;
      fpsHarpoonsTick(dt);
      FPS.recoil = Math.max(0, FPS.recoil - dt * 6);
      FPS.sinceShot = (FPS.sinceShot || 0) + dt;
      if ((FPS.climb || 0) > 0 && FPS.sinceShot > 0.14) { const d = Math.min(FPS.climb, dt * 0.4); m.p = clamp(m.p - d, -0.6, 0.6); FPS.climb -= d; }
      zmTick(dt);
    }
    FPS.eyeLag = (FPS.eyeLag || 0) * Math.pow(0.0005, dt);
    if ((FPS.hintT || 0) > 0 && (FPS.stick || FPS.lookTouch)) FPS.hintT -= dt * 2; else if ((FPS.hintT || 0) > 0) FPS.hintT -= dt * 0.25;
    for (const k of ['flash', 'hitT', 'hurtT']) if (FPS[k] > 0) FPS[k] -= dt;
    for (const t of FPS.tracers) t.t -= dt; FPS.tracers = FPS.tracers.filter(t => t.t > 0);
    for (const f of FPS.feed) f.t -= dt; FPS.feed = FPS.feed.filter(f => f.t > 0);
    for (const p of FPS.parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= (p.up ? -1 : 9) * dt; }
    FPS.parts = FPS.parts.filter(p => p.t > 0);
    if (FPS.parts.length > 400) FPS.parts.splice(0, FPS.parts.length - 400);
    if (ZM.over) { ZM.over.t += dt; if (ZM.over.t > 2.2 && $('zmOver').hidden) zmShowOver(); if (ZM.net === 'host') zmnHost(dt); }
    fpsDraw();
  } finally { g = saved[0]; ship = saved[1]; }
}
// a reload finished: the magazine filled from what you carry
function zmReloaded() {
  const m = FPS.me, w = fpsW(), id = FPS.weapon;
  if (w.melee) return;
  const take = Math.min(w.mag - m.ammo, ZM.res[id] || 0);
  m.ammo += take; ZM.res[id] = (ZM.res[id] || 0) - take; m.mags[id] = m.ammo;
}

function zmTick(dt) {
  const m = FPS.me;
  // where you are
  const zn = zmZoneAt(m.x, m.y, m.jz);
  if (zn && zn !== ZM.zone) { ZM.zone = zn; ZM.zoneT = 3.5; }
  if (ZM.zoneT > 0) ZM.zoneT -= dt;
  if (ZM.net === 'client') zmnClient(dt);
  else {
    if (ZM.net === 'host') zmnHost(dt);
    ZM.players = zmPlayers();
    // the grid's distances from everyone standing, a few times a second
    ZM.navT -= dt;
    if (ZM.navT <= 0) { ZM.navT = 0.25; zmNavFrom(ZM.players); }
    zmRounds(dt);
    zmZombies(dt);
    zmDropsTick(dt);
    zmBoxTick(dt);
    if (ZM.double > 0) ZM.double -= dt; if (ZM.insta > 0) ZM.insta -= dt;
    zmCheckOver();
  }
  zmWindows(dt);
  zmMoans(dt);
  for (const p of ZM.pops) p.t -= dt; ZM.pops = ZM.pops.filter(p => p.t > 0);
  if (ZM.banner) { ZM.banner.t -= dt; if (ZM.banner.t <= 0) ZM.banner = null; }
  for (const s of ZM.sparks) s.t -= dt; ZM.sparks = ZM.sparks.filter(s => s.t > 0);
  if (FPS.beamT > 0) FPS.beamT -= dt;
  if (typeof zmpTick === 'function') zmpTick(dt);   // [pap]
  if (typeof zeTick === 'function') zeTick(dt);   // [egg hook] src/zmegg.js
  zmNearest();
  // holding Use at a window nails its boards back; beside someone who's down, gets them up
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse;
  ZM.rebuildT -= dt;
  if (hold && ZM.near && ZM.near.k === 'win' && ZM.rebuildT <= 0 && !(m.dead > 0)) {
    const w = ZM.near.w;
    if (w.boards < 6 && !ZM.z.some(z => z.win === w && z.st === 'climb')) {
      ZM.rebuildT = 0.55; zmSound('board');
      if (ZM.net === 'client') { zmnRequest('board', w.id); ZM.boardPts = Math.min(ZM_BOARD_CAP, (ZM.boardPts || 0) + 10); }
      else { w.boards++; zmBoardPay(FPS.me.id); }
    }
  }
  if (hold && ZM.near && ZM.near.k === 'rev' && !(m.dead > 0)) {
    if (ZM.revOf !== ZM.near.sid) { ZM.revOf = ZM.near.sid; ZM.revT = 0; }
    ZM.revT += dt;
    if (ZM.revT >= 3) { ZM.revT = 0; ZM.revOf = null; zmnRevive(ZM.near.sid); }
  } else { ZM.revT = 0; ZM.revOf = null; }
}
// (hosting or alone) a board back on a window: 10 points to whoever did it, until they've had their round's worth
function zmBoardPay(sid) {
  const by = ZM.boardBy = ZM.boardBy || {}, had = by[sid] || 0;
  if (had >= ZM_BOARD_CAP) return;
  by[sid] = had + 10;
  if (sid === FPS.me.id) ZM.boardPts = by[sid];
  zmPoints(10, true, sid);
}
// who's standing: you, and (hosting) everyone else not down
function zmPlayers() {
  const m = FPS.me, out = [];
  if (!(m.dead > 0)) out.push({ sid: m.id, x: m.x, y: m.y, jz: m.jz || 0, me: true });
  if (ZM.net === 'host') for (const r of FPS.remote.values()) if (!r.dead && !r.down && r.tx != null) out.push({ sid: r.id, x: r.x, y: r.y, jz: r.jz || 0 });
  return out;
}
// everyone down at once, or gone: the night is over
function zmCheckOver() {
  if (!ZM.net || ZM.over) return;
  const m = FPS.me;
  if (!(m.dead > 0)) return;
  for (const r of FPS.remote.values()) if (!r.dead && !r.down && !r.left) return;
  zmEnd();
}
function zmEnd() {
  if (ZM.over) return;
  FPS.me.dead = FPSC.RESPAWN - 0.6; FPS.scoped = false;
  ZM.over = { t: 0 };
  zmSound('over');
  if (typeof scoreReport === 'function') scoreReport('zm', Math.max(0, ZM.round - 1), ZM.kills);
}

// ---------- rounds ----------
const zmCount = r => r <= 5 ? [6, 8, 13, 18, 24][r - 1] : Math.round(24 + (r - 5) * 3.2 + (r - 5) * (r - 5) * 0.06);
// a drowned man's strength (in pepperbox body shots, before ZM_DMG): in the old games' manner, a fixed step each round
// to round nine, then a tenth more every round, compounding:
//   hp(r) = 2.5 + 2 (r - 1)          for r <= 9   (round 1: 2.5, three pepperbox shots; round 5: 10.5; round 9: 18.5)
//   hp(r) = 18.5 * 1.1^(r - 9)       from r = 10  (round 10: 20.4; 15: 32.8; 20: 52.8; 25: 85; 30: 137)
// each one spawns with this, give or take a tenth; the Fresnel Lamp's burn and its sparks are fractions of it
const zmHp = r => r <= 9 ? 2.5 + 2 * (r - 1) : (2.5 + 2 * 8) * Math.pow(1.1, r - 9);
function zmRounds(dt) {
  ZM.t -= dt;
  if (ZM.phase === 'pre' || ZM.phase === 'break') {
    if (ZM.t <= 0) {
      ZM.round++; ZM.phase = 'round'; ZM.left = Math.round(zmCount(ZM.round) * (1 + 0.5 * (ZM.hum.length - 1))); ZM.spawnT = 2; ZM.dropsRound = 0; ZM.boardBy = {}; ZM.boardPts = 0;
      zmRoundBegins();
      ZM.banner = { text: 'Round ' + ZM.round, t: 4 };
      zmSound('round');
      if (ZM.round > 1) fpsFeed(`Round ${ZM.round}: ${ZM.left} of them.`);
    }
    return;
  }
  // round on: bring them up, a few at a time
  if (typeof zbRounds === 'function') zbRounds(dt);   // [boss] the Diver, in his rounds (src/zmboss.js)
  const alive = ZM.z.filter(z => !z.dead).length, cap = Math.min(ZMC.ALIVE, 6 + ZM.round * 2);
  ZM.spawnT -= dt;
  if (ZM.left > 0 && alive < cap && ZM.spawnT <= 0) {
    if (zmSpawn()) { ZM.left--; ZM.spawnT = Math.max(0.35, 2.1 - ZM.round * 0.16) * (0.7 + Math.random() * 0.6); }
    else ZM.spawnT = 0.5;
  }
  if (ZM.left <= 0 && alive === 0) {
    ZM.phase = 'break'; ZM.t = ZMC.BREAK;
    zmSound('end');
    ZM.banner = { text: `Round ${ZM.round} held`, t: 3.5, small: true };
    zmRoundHeld();
  }
}
function zmRoundHeld() {
  if (typeof scoreReport === 'function') scoreReport('zm', ZM.round, ZM.kills);
  // crates: one of each for every five rounds held
  if (ZM.round % 5 === 0) { if (typeof wcEarn === 'function') wcEarn('round'); if (typeof ocEarn === 'function') ocEarn('round'); }
}
// a new round: anyone who bled out comes back, with a pepperbox, beside someone still standing
function zmRoundBegins() {
  if (!ZM.ghost) return;
  const m = FPS.me, others = [...FPS.remote.values()].filter(r => !r.dead && !r.down && r.tx != null);
  const at = others[0];
  if (at) { m.x = at.x; m.y = at.y; m.jz = at.jz || 0; m.fl = m.jz; zmSettle(m); }
  ZM.ghost = false; m.dead = 0; m.hp = ZMC.HP; m.protect = 3;
  ZM.own = ['pepperbox']; ZM.res = { pepperbox: 48 }; FPS.weapon = FPS.last = 'pepperbox'; m.ammo = 6; m.mags.pepperbox = 6; FPS.drawT = 0.45;
  fpsFeed('You’re back on your feet, with a pepperbox.');
}
// which window the next one climbs in at: one of the open rooms' windows nearest you (by the walk to you)
function zmPickWindow() {
  const N = ZM.nav, list = [];
  for (const w of ZM.windows) {
    if (!zmOpen(w.zone) || w.q.length >= 4) continue;
    const d = zmNavDist(w.x - w.nx * 1.0, w.y - w.ny * 1.0, w.z || 0);
    list.push([w, d < 1e8 ? d : 9999]);
  }
  if (!list.length) return null;
  list.sort((a, b) => a[1] - b[1]);
  const pool = list.slice(0, Math.min(list.length, 3));
  return pool[(Math.random() * pool.length) | 0][0];
}
// where one comes up for a window: out on open ground in front of it (never inside the tower, never in a wall); for a
// window up the tower, at the foot of the wall below it, to climb
function zmSpawnPoint(w) {
  const tx = -w.ny, ty = w.nx, T = ZM_TC, CX = FPSC.CX, CY = FPSC.CY;
  if ((w.z || 0) > 0) { const side = (Math.random() - 0.5) * 1.2; return [w.x + w.nx * 1.3 + tx * side, w.y + w.ny * 1.3 + ty * side]; }
  for (const out of [4 + Math.random() * 2.5, 3.2, 2.4, 1.6]) {
    const side = (Math.random() - 0.5) * Math.min(3, out * 0.6), x = w.x + w.nx * out + tx * side, y = w.y + w.ny * out + ty * side;
    if (Math.hypot(x - CX - T[0], y - CY - T[1]) > ZMT.R + 1.4 && !zmBlockedAt(x, y, 0.4, 0)) return [x, y];
  }
  return [w.x + w.nx * 1.4, w.y + w.ny * 1.4];
}
function zmSpawn() {
  const w = zmPickWindow(); if (!w) return false;
  const r = ZM.round, run = clamp((r - 5) * 0.1, 0, 0.7), jog = clamp((r - 2) * 0.15, 0, 1 - run), u = Math.random();
  const kind = u < run ? 'run' : u < run + jog ? 'jog' : 'walk';
  const [sx, sy] = zmSpawnPoint(w);
  const hp = zmHp(r) * (0.9 + Math.random() * 0.2);
  const zn = ++ZM.zc;
  const z = {
    drowned: true, zm: true, zn, id: 'z' + zn.toString(36), n: 'a drowned man', x: sx, y: sy, jz: 0, fl: 0, zpad: 0.27,
    hp, max: hp, kind, sp: kind === 'run' ? 5.0 + Math.random() * 0.6 : kind === 'jog' ? 3.2 + Math.random() * 0.4 : 1.55 + Math.random() * 0.35,
    st: 'out', win: w, t: 0, ph: Math.random() * 6, hitT: 0, atk: 0.6, swing: -1, stuck: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
  };
  z.h = bearingOf(w.x - z.x, w.y - z.y);
  w.q.push(z);
  ZM.z.push(z); FPS.drowned = ZM.z;
  return true;
}

// ---------- the drowned ----------
function zmZombies(dt) {
  const all = ZM.z, P = ZM.players;
  const nearest = (x, y, jz) => { let best = null, bd = 1e9; for (const p of P) { const d = Math.hypot(p.x - x, p.y - y) + Math.abs((p.jz || 0) - (jz || 0)) * 2; if (d < bd) { bd = d; best = p; } } return best; };
  for (const z of all) {
    if (z.hitT > 0) z.hitT -= dt;
    z.t += dt;
    if (z.dead) { z.deadT = (z.deadT || 0) + dt; continue; }
    if (z.boss && typeof zbTick === 'function') { zbTick(z, dt, nearest); continue; }   // [boss] he goes his own way (src/zmboss.js)
    const step = z.sp * dt * (z.slow > 0 && typeof zmpSlowK === 'function' ? zmpSlowK(z) : 1);   // [pap] (slowed by the Equinox Gale)
    if (z.st === 'out') {
      // across the yard (or up the beach) to the window, waiting behind any already at it
      const w = z.win, k = w.q.indexOf(z), lane = Math.max(0, k);
      const ox = w.x + w.nx * (0.95 + lane * 0.9) + (-w.ny) * (lane % 2 ? 0.5 : -0.5) * Math.min(1, lane), oy = w.y + w.ny * (0.95 + lane * 0.9) + w.nx * (lane % 2 ? 0.5 : -0.5) * Math.min(1, lane);
      const dx = ox - z.x, dy = oy - z.y, d = Math.hypot(dx, dy);
      if (d > 0.05) { const s = Math.min(d, step); z.x += dx / d * s; z.y += dy / d * s; z.h = bearingOf(dx, dy); z.walk = true; }
      else { z.walk = false; z.h = bearingOf(-w.nx, -w.ny); }
      // (a window up the tower: up the outside of the wall they go, hand over hand)
      const wz = w.z || 0;
      if (z.jz < wz) { z.jz = Math.min(wz, z.jz + dt * 2.4); z.scaling = true; z.h = bearingOf(-w.nx, -w.ny); } else z.scaling = false;
      if (k === 0 && d < 0.1 && z.jz >= wz - 0.01) { z.st = 'tear'; z.t = 0; }
      continue;
    }
    if (z.st === 'tear') {
      const w = z.win; z.walk = false; z.h = bearingOf(-w.nx, -w.ny);
      if (w.boards > 0) {
        // a board off every second or so (quicker as the rounds go on)
        if (z.t > Math.max(0.55, 1.25 - ZM.round * 0.03)) { z.t = 0; w.boards--; w.fall.push({ i: w.boards, t: 0 }); zmSound('tear', Math.hypot(w.x - FPS.me.x, w.y - FPS.me.y)); }
        // and a swipe through the gap at whoever's right there
        if (P.some(p => Math.hypot(p.x - w.x, p.y - w.y) < 1.5 && Math.abs(p.jz || 0) < 1)) zmSwipe(z, dt);
      } else { z.st = 'climb'; z.t = 0; }
      continue;
    }
    if (z.st === 'climb') {
      const w = z.win, k = Math.min(1, z.t / 1.0);
      z.x = w.x + w.nx * 0.95 * (1 - 2 * k); z.y = w.y + w.ny * 0.95 * (1 - 2 * k); z.jz = (w.z || 0) + Math.sin(k * Math.PI) * 1.05;
      if (k >= 1) { z.st = 'in'; z.jz = z.fl = w.z || 0; w.q = w.q.filter(q => q !== z); z.t = 0; z.lx = z.x; z.ly = z.y; }
      continue;
    }
    if (typeof zmpHeld === 'function' && zmpHeld(z, dt)) continue;   // [pap] swept off its feet, or nailed to the wall
    // inside: after the nearest of you, by the shortest walk
    const m = nearest(z.x, z.y, z.jz);
    if (!m) { z.walk = false; continue; }
    const dx = m.x - z.x, dy = m.y - z.y, d = Math.hypot(dx, dy), dz = (m.jz || 0) - (z.jz || 0);
    let tx = m.x, ty = m.y;
    if (!(d < 3 && Math.abs(dz) < 0.8)) { const nx = zmNavNext(z.x, z.y, z.jz); if (nx) { tx = nx[0]; ty = nx[1]; } }
    const hx = tx - z.x, hy = ty - z.y, hl = Math.hypot(hx, hy);
    const near = d < 1.15 && Math.abs(dz) < 1;
    if (hl > 0.05 && !near) {
      z.h += angDiff(bearingOf(hx, hy), z.h) * Math.min(1, dt * 8);
      const s = Math.min(hl, step), want = bearingOf(hx, hy);
      // (a corner in the way: try a little to either side, the side that worked last first)
      z.walk = false;
      for (const dh of [0, 0.6, -0.6, 1.2, -1.2]) { const a = want + dh * (z.side || 1), x0 = z.x, y0 = z.y; if (zmMove(z, Math.sin(a) * s, Math.cos(a) * s) && Math.hypot(z.x - x0, z.y - y0) > s * 0.3) { z.walk = true; if (dh) z.side = Math.sign(dh * (z.side || 1)); break; } }
    } else { z.walk = false; if (d > 0.1) z.h += angDiff(bearingOf(dx, dy), z.h) * Math.min(1, dt * 6); }
    // (falling off a ledge: down they go)
    if ((z.jz || 0) > z.fl) z.jz = Math.max(z.fl, z.jz - 9 * dt);
    if (near || (d < 1.6 && Math.abs(dz) < 1)) zmSwipe(z, dt);
    // stuck for a long while, far from you: back out to a window
    z.stuck = Math.hypot(z.x - (z.lx || z.x), z.y - (z.ly || z.y)) < 0.02 && !near ? z.stuck + dt : Math.max(0, z.stuck - dt * 2);
    z.lx = z.x; z.ly = z.y;
    if ((z.stuck > 9 && d > 12) || z.stuck > 15) { z.dead = 1; z.gone = true; z.deadT = 99; ZM.left++; }
  }
  // the drowned keep a little apart from one another
  const ins = all.filter(z => !z.dead && z.st === 'in');
  for (let i = 0; i < ins.length; i++) for (let j = i + 1; j < ins.length; j++) {
    const a = ins[i], b = ins[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 0.7 && d > 0.001 && Math.abs((a.jz || 0) - (b.jz || 0)) < 1) { const push = (0.7 - d) * 0.5; zmMove(a, -dx / d * push, -dy / d * push); zmMove(b, dx / d * push, dy / d * push); }
  }
  // and from all of you
  for (const z of ins) for (const m of P) {
    const dx = z.x - m.x, dy = z.y - m.y, d = Math.hypot(dx, dy);
    if (d < 0.72 && d > 0.001 && Math.abs((z.jz || 0) - (m.jz || 0)) < 1.2) zmMove(z, dx / d * (0.72 - d), dy / d * (0.72 - d));
  }
  // the dead sink away
  for (const z of all) if (z.dead && z.deadT > (z.burn ? 1.3 : 2.4)) { if (z.mdl) zmFreeModel(z); z.remove = true; }
  ZM.z = all.filter(z => !z.remove); FPS.drowned = ZM.z;
}
// moans from the nearest of them
function zmMoans(dt) {
  const m = FPS.me;
  ZM.groanT -= dt;
  if (ZM.groanT <= 0) {
    ZM.groanT = 1.2 + Math.random() * 2.5;
    let best = null, bd = 30;
    for (const z of ZM.z) { if (z.dead) continue; const d = Math.hypot(z.x - m.x, z.y - m.y) * (0.7 + Math.random() * 0.6); if (d < bd) { bd = d; best = z; } }
    if (best) zmSound('moan', Math.hypot(best.x - m.x, best.y - m.y), angDiff(bearingOf(best.x - m.x, best.y - m.y), m.h), best.kind);
  }
}
// a swing at you: wound up, then, if you're still in reach, a knock
function zmSwipe(z, dt) {
  const m = FPS.me;
  z.atk -= dt;
  if (z.swing < 0 && z.atk <= 0) { z.swing = 0; z.atk = 1.15; }
  if (z.swing >= 0) {
    const was = z.swing; z.swing += dt;
    if (was < 0.28 && z.swing >= 0.28) {
      const reach = z.st === 'tear' ? 1.6 : 1.55;
      if (Math.hypot(m.x - z.x, m.y - z.y) < reach && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.2 && !(m.dead > 0) && !(m.protect > 0)) { fpsHurt(1, null, null); zmSound('hit'); }
    }
    if (z.swing > 0.6) z.swing = -1;
  }
}
function zmWindows(dt) { for (const w of ZM.windows) { for (const f of w.fall) f.t += dt; w.fall = w.fall.filter(f => f.t < 1.2); w.q = w.q.filter(z => !z.dead); } }

// ---------- points, hits and kills ----------
function zmPoints(n, raw, by) {
  const v = raw ? n : n * (ZM.double > 0 ? 2 : 1);
  if (by && by !== FPS.me.id) { const c = ZM.credit[by] = ZM.credit[by] || [0, 0, 0]; c[0] += v; return; }
  ZM.pts += v;
  // (points earned in a quick burst rise together, as one number)
  const last = ZM.pops[ZM.pops.length - 1];
  if (last && last.t > 0.95) { last.v += v; last.t = 1.1; } else ZM.pops.push({ v, t: 1.1, dx: (Math.random() - 0.5) * 30 });
  if (ZM.pops.length > 4) ZM.pops.shift();
}
// (by: who hit it, for the points; joined to someone else's game, the hit goes to the host to be judged)
function zmHurt(d, dmg, head, code, by, how) {
  if (!d || d.dead) return;
  d.hitT = 0.15;
  if (typeof zmpDmg === 'function') dmg = zmpDmg(dmg, code, by);   // [pap] reforged weapons hit harder (the shooter's side)
  if (ZM.net === 'client') { zmnHit(d, dmg, head, code, how); return; }
  const k = (ZM_DMG[code] == null ? 1 : ZM_DMG[code]) * (d.mark > 0 ? 1.5 : 1);   // [pap] (lit by the Leading Light: hurt worse)
  d.hp -= d.boss && typeof zbHurtK === 'function' ? zbHurtK(d, dmg * k, how) : ZM.insta > 0 ? 1e9 : dmg * k;   // [boss] no one-hit kills on him
  if (d.hp <= 0) { zmKill(d, head, code, how, by); if (how === 'burn') zmChain(d, 2, by); } else zmPoints(10, false, by);
}
function zmKill(d, head, code, how, by) {
  if (d.dead) return;
  d.dead = 1; d.deadT = 0; d.burn = how === 'burn'; d.head = !!head;
  if (d.win) d.win.q = d.win.q.filter(q => q !== d);
  if (how !== 'flash') zmPoints(how === 'burn' ? 80 : head ? 100 : code === 'c' || code === 'k' ? 130 : 60, false, by);
  zmKillFx(d);
  if (by && by !== FPS.me.id) { const c = ZM.credit[by] = ZM.credit[by] || [0, 0, 0]; c[1]++; if (head) c[2]++; }
  else if (how !== 'flash' || !ZM.net) { ZM.kills++; if (head) ZM.heads++; zmEarnKill(); }
  zmMaybeDrop(d, how);
  if (d.boss && typeof zbKilled === 'function') zbKilled(d, how, by);   // [boss] his reward and his salvage
  if (typeof zeKill === 'function') zeKill(d, how, by);   // [egg hook] src/zmegg.js
}
// crates (as for Wreckers' Night, every third kill here)
function zmEarnKill() {
  ZM.earnK++;
  if (ZM.earnK >= 3) { ZM.earnK = 0; if (typeof wcEarn === 'function') wcEarn('kill'); if (typeof ocEarn === 'function') ocEarn('kill'); }
}
// how one goes: burning to ash, or a burst of the sea
function zmKillFx(d) {
  if (d.burn) for (let i = 0; i < 10; i++) FPS.parts.push({ x: d.x + (Math.random() - 0.5) * 0.6, y: d.y + (Math.random() - 0.5) * 0.6, z: FPSC.GROUND + (d.jz || 0) + Math.random() * 1.7, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, vz: Math.random() * 1.2, t: 1.2, c: '255,170,80', up: true });
  else fpsPuff(d.x, d.y, FPSC.GROUND + (d.jz || 0) + (d.head ? 1.6 : 1.1), d.head ? '120,150,140' : '70,100,90', d.head ? 12 : 6);
}
// salvage: now and then something floats free
function zmMaybeDrop(d, how) {
  if (ZM.dropsRound < 4 && Math.random() < 0.03 && how !== 'flash') {
    ZM.dropsRound++;
    const r = Math.random(), k = r < 0.35 ? 'keg' : r < 0.6 ? 'double' : r < 0.8 ? 'spot' : 'flash';
    ZM.drops.push({ k, x: d.x, y: d.y, z: d.jz || 0, t: 26, ph: Math.random() * 6, id: ++ZM.zc });
    zmSound('drop');
  }
}
// a shot here: what it hits, as the islands judge it, but against the drowned standing where they are now (there's
// nobody else's view to be fair to); long shots go through a few of them
function zmResolveShot(sh, mine) {
  const [, x, y, z, h, p, by, code] = sh, w = fpsWOf(code);
  if (w.melee) { fpsSwishSound(0); zmMelee(x, y, z, h, w); return; }
  fpsWeaponSound(code, 0, 0);
  if (w.speed) {
    const cp = Math.cos(p);
    FPS.harps.push({ sh, by, x: x + Math.sin(h) * 0.8, y: y + Math.cos(h) * 0.8, z: z - 0.2, vx: Math.sin(h) * cp * w.speed, vy: Math.cos(h) * cp * w.speed, vz: Math.sin(p) * w.speed, t: 0, stuck: 0, mine, from: by });
    return;
  }
  const hits = new Map();
  for (const [lh, lp] of fpsLines(sh)) {
    let left = (mine && typeof zmpPierce === 'function' && zmpPierce(code)) || ZM_PIERCE[code] || 1, ox = x, oy = y, oz = z, gone = 0;
    const skip = new Set();
    let last = null;
    while (left > 0) {
      const targets = ZM.z.filter(q => !q.dead && !skip.has(q));
      const r = fpsRay(ox, oy, oz, lh, lp, by, targets, w.range - gone);
      last = r;
      if (r.kind !== 'body') break;
      const o = r.who, prev = hits.get(o) || { dmg: 0, head: false };
      prev.dmg += r.head ? w.head : w.dmg; prev.head = prev.head || r.head; hits.set(o, prev);
      skip.add(o); left--;
      gone += r.t + 0.6; ox = r.x + Math.sin(lh) * 0.6; oy = r.y + Math.cos(lh) * 0.6; oz = r.z + Math.tan(lp) * 0.6;
    }
    FPS.tracers.push({ a: [x + Math.sin(lh) * 0.6, y + Math.cos(lh) * 0.6, z - 0.25], b: [last.x, last.y, last.z], t: w.pellets ? 0.06 : 0.08, k: w.code });
    if (typeof zeShot === 'function' && mine) zeShot(x, y, z, lh, lp, by);   // [egg hook] src/zmegg.js
    if (last.kind !== 'body' && last.kind !== 'none') fpsPuff(last.x, last.y, last.z, last.kind === 'ground' ? '150,140,120' : '190,190,180', w.pellets ? 2 : 6);
  }
  if (mine && typeof zmpShot === 'function') zmpShot(sh, hits);   // [pap] what a reforged weapon does
  let any = null;
  for (const [o, hit] of hits) { any = any || hit; zmHurt(o, hit.dmg, hit.head, code, FPS.me.id); }
  if (any && mine) { FPS.hitT = 0.18; FPS.hitHead = any.head; fpsHitSound(any.head); }
}
// a slash with the knife: whatever's in front of you and in reach, whatever's in your hands
function zmKnife() {
  const m = FPS.me;
  if (!FPS.zm || m.dead > 0 || FPS.menu || ZM.over || (FPS.knifeT || 0) > 0) return;
  FPS.knifeT = ZM_KNIFE.rate; FPS.knifeN = (FPS.knifeN || 0) + 1; FPS.meSlashT = 0.3; m.protect = 0; FPS.scoped = false;
  fpsSwishSound(0);
  const z = FPSC.GROUND + FPSC.EYE + (m.jz || 0);
  zmMelee(m.x, m.y, z, m.h, ZM_KNIFE, 'k');
  if (typeof zmnShot === 'function') zmnShot('c', m.h, m.p);
}
function zmMelee(x, y, z, h, w, code) {
  code = code || 'c';
  if (typeof zeMelee === 'function') zeMelee(x, y, z, h, w, code);   // [egg hook] src/zmegg.js
  if (code === 'c' && typeof zmpSwing === 'function') zmpSwing(x, y, z, h);   // [pap] the Keel-Splitter's crescent
  let any = false;
  for (const o of ZM.z) {
    if (o.dead) continue;
    const d = Math.hypot(o.x - x, o.y - y), b = bearingOf(o.x - x, o.y - y);
    if (d > w.reach + FPSC.BODY || Math.abs(angDiff(b, h)) > w.arc || Math.abs((o.jz || 0) - (FPS.me.jz || 0)) > 1.2) continue;
    const r = fpsRay(x, y, z - 0.4, b, Math.atan2((o.jz || 0) + 1.2 - (z - FPSC.GROUND - 0.4), Math.max(0.3, d)), FPS.me.id, [o], w.reach + 1);
    if (r.kind !== 'body') continue;
    zmHurt(o, w.dmg, false, code, FPS.me.id); o.hitT = 0.2; any = true;
  }
  if (any) { FPS.hitT = 0.18; FPS.hitHead = false; fpsHitSound(false); }
}
// the Fresnel Lamp: a cone of the Light's fire, every tenth of a second the trigger's held
function zmBeam() {
  const m = FPS.me, w = FPSW.fresnel, ex = m.x, ey = m.y, ez = FPSC.GROUND + FPSC.EYE + (m.jz || 0);
  FPS.beamT = 0.16;
  const sx = Math.sin(m.h) * Math.cos(m.p), sy = Math.cos(m.h) * Math.cos(m.p), sz = Math.sin(m.p);
  // how far it reaches before a wall
  const wall = fpsRay(ex, ey, ez, m.h, m.p, m.id, [], w.range);
  FPS.beamLen = Math.max(1.5, wall.t);
  const burn = Math.max(1.2, zmHp(Math.max(1, ZM.round)) * 0.36);
  let any = false; const lit = [];
  for (const o of ZM.z) {
    if (o.dead) continue;
    const ox = o.x - ex, oy = o.y - ey, oz = FPSC.GROUND + (o.jz || 0) + 1.1 - ez, d = Math.hypot(ox, oy, oz);
    if (d > FPS.beamLen + 0.6) continue;
    const along = ox * sx + oy * sy + oz * sz; if (along < 0.3) continue;
    const off = Math.sqrt(Math.max(0, d * d - along * along)), rad = 0.45 + along * 0.06;
    if (off > rad + 0.35) continue;
    const ray = fpsRay(ex, ey, ez, bearingOf(ox, oy), Math.atan2(oz, Math.hypot(ox, oy)), m.id, [o], w.range + 2);
    if (ray.kind !== 'body') continue;
    any = true; o.hitT = 0.2; o.scorch = Math.min(1, (o.scorch || 0) + 0.5);
    lit.push(o);
    zmHurt(o, burn, false, 'f', FPS.me.id, 'burn');
  }
  if (typeof zmpBeam === 'function') zmpBeam(lit, burn);   // [pap] the First-Order Lamp's prism
  if (any) { FPS.hitT = 0.12; FPS.hitHead = false; }
  zmSound('beam');
}
// a spark off one that burned, to the nearest that hasn't (and on, a hop or two)
function zmChain(from, hops, by) {
  let best = null, bd = 7;
  for (const o of ZM.z) { if (o.dead || o === from) continue; const d = Math.hypot(o.x - from.x, o.y - from.y); if (d < bd && Math.abs((o.jz || 0) - (from.jz || 0)) < 2) { bd = d; best = o; } }
  if (!best) return;
  ZM.sparks.push({ a: [from.x, from.y, FPSC.GROUND + (from.jz || 0) + 1.2], b: [best.x, best.y, FPSC.GROUND + (best.jz || 0) + 1.2], t: 0.25 });
  best.hitT = 0.2; best.scorch = 1;
  best.hp -= zmHp(Math.max(1, ZM.round)) * 0.6;
  if (best.hp <= 0) { zmKill(best, false, 'f', 'burn', by); if (hops > 1) zmChain(best, hops - 1, by); }
}

// ---------- salvage ----------
function zmDropsTick(dt) {
  for (const d of ZM.drops) {
    d.t -= dt; d.ph += dt;
    for (const m of ZM.players) if (d.t > 0 && Math.hypot(d.x - m.x, d.y - m.y) < 1.4 && Math.abs(d.z - (m.jz || 0)) < 1.6) { d.t = 0; zmTake(d.k); if (ZM.net) zmnEvent('take', d.k); }
  }
  ZM.drops = ZM.drops.filter(d => d.t > 0);
}
// (heard: joined, and told by the host that it was taken; the host has done the rest)
function zmTake(k, heard) {
  const D = ZM_DROPS[k]; ZM.banner = { text: D.n + '!', t: 2.6, col: D.c };
  zmSound('take');
  if (k === 'keg') { for (const id of ZM.own) ZM.res[id] = typeof zmpAmmo === 'function' ? zmpAmmo(id) : ZM_AMMO[id];   // [pap] (a reforged reserve)
    fpsFeed('A Powder Keg: everything you carry, full.'); }
  else if (k === 'double') { if (!heard) ZM.double = 30; fpsFeed('Double Salvage: double points for thirty seconds.'); }
  else if (k === 'spot') { if (!heard) ZM.insta = 30; fpsFeed('The Black Spot: one hit kills, for thirty seconds.'); }
  else if (heard) { FPS.flash = 0.6; fpsFeed('A Lamp Flash: every one of them burned where they stood.'); }
  else if (k === 'flash') {
    let n = 0; for (const z of ZM.z) if (!z.dead) { if (z.boss && typeof zbFlash === 'function') { zbFlash(z); continue; } zmKill(z, false, '', 'flash'); z.burn = true; n++; }   // [boss] only scorched
    zmPoints(400, true); for (const h of ZM.hum) if (h[0] !== FPS.me.id) zmPoints(400, true, h[0]);
    FPS.flash = 0.6; fpsFeed(n ? `A Lamp Flash: ${n} of them burned where they stood.` : 'A Lamp Flash.');
  }
}

// ---------- the wreck chest ----------
function zmBoxRoll(own) {
  const pool = ZM_BOXW.filter(([id]) => !(own || ZM.own).includes(id)), list = pool.length ? pool : ZM_BOXW;
  let r = Math.random() * list.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of list) { r -= w; if (r <= 0) return id; }
  return list[0][0];
}
function zmBoxTick(dt) {
  const B = ZM.box; B.t += dt;
  if (B.st === 'spin') {
    // the weapons turn over above it, slower and slower
    B.cyc += dt * (14 - B.t * 3);
    if (B.cyc > 1) { B.cyc = 0; const ids = ZM_BOXW.map(a => a[0]); B.show = ids[(ids.indexOf(B.show) + 1 + ((Math.random() * 3) | 0)) % ids.length]; zmSound('tick'); }
    if (B.t > 4) {
      B.t = 0; B.show = B.item;
      if (B.moving) { B.st = 'gull'; zmPoints(ZMC.BOX, true, B.owner); zmSound('gull'); fpsFeed('A gull takes the chest. The points are back; look for it somewhere else.'); if (ZM.net) zmnEvent('feed', 'A gull takes the chest. The points are back; look for it somewhere else.'); }
      else { B.st = 'offer'; zmSound('offer'); }
    }
  } else if (B.st === 'offer') { if (B.t > 12) { B.st = 'idle'; B.t = 0; } }
  else if (B.st === 'gull') { if (B.t > 3) { B.st = 'gone'; B.t = 0; } }
  else if (B.st === 'gone') {
    if (B.t > 4) {
      const choices = ZM.spawns.map((s, i) => i).filter(i => i !== B.at);
      B.at = choices[(Math.random() * choices.length) | 0]; B.uses = 0; B.st = 'idle'; B.t = 0;
      fpsFeed(`The chest has turned up in ${zmZoneName(ZM.spawns[B.at].zone)}.`);
      if (ZM.net) zmnEvent('feed', `The chest has turned up in ${zmZoneName(ZM.spawns[B.at].zone)}.`);
    }
  }
}
function zmBoxUse() {
  const B = ZM.box;
  if (B.st === 'idle') {
    if (ZM.pts < ZMC.BOX) { zmSound('no'); return; }
    ZM.pts -= ZMC.BOX; ZM.spent += ZMC.BOX;
    if (ZM.net === 'client') { zmnRequest('box', ZM.own.join(',')); zmSound('open'); return; }
    zmBoxSpin(FPS.me.id, ZM.own);
  } else if (B.st === 'offer' && B.owner === FPS.me.id) {
    if (ZM.net === 'client') zmnRequest('take', 0); else { B.st = 'idle'; B.t = 0; }
    zmGive(B.item);
  }
}
// (hosting or alone) the chest opens for someone: what's in it, and whether the gull comes for it
function zmBoxSpin(by, own) {
  const B = ZM.box;
  if (B.st !== 'idle') { zmPoints(ZMC.BOX, true, by); return; }   // (beaten to it: the points go back)
  B.st = 'spin'; B.t = 0; B.cyc = 0; B.item = zmBoxRoll(own); B.spins++; B.uses++; B.owner = by;
  B.moving = B.spins > 1 && B.uses > 3 && Math.random() < 0.35;
  zmSound('open');
}
// a weapon in hand: a third replaces the one you're holding
function zmGive(id) {
  const m = FPS.me, w = FPSW[id];
  if (!ZM.own.includes(id)) {
    if (ZM.own.length < 2) ZM.own.push(id);
    else { const i = Math.max(0, ZM.own.indexOf(FPS.weapon)); ZM.own[i] = id; }
  }
  m.mags[id] = w.mag; ZM.res[id] = ZM_AMMO[id];
  if (FPS.weapon !== id) { m.mags[FPS.weapon] = m.ammo; FPS.last = ZM.own.includes(FPS.weapon) ? FPS.weapon : FPS.last; FPS.weapon = id; m.ammo = w.mag; m.reload = 0; m.cd = 0; FPS.drawT = 0.45; FPS.scoped = false; FPS.heldFire = true; }
  else { m.ammo = w.mag; }
  zmSound('buy');
}
function zmSlot(i) { const id = ZM.own[i]; if (id) fpsSwitch(id); }

// ---------- buying things ----------
// what's in front of you to use, if anything
function zmNearest() {
  const m = FPS.me, mz = m.jz || 0;
  let best = null, bd = 1e9;
  const consider = (o, x, y, z, range, facing) => {
    const d = Math.hypot(x - m.x, y - m.y);
    if (d > range || Math.abs(z - mz) > 1.6) return;
    if (facing && d > 0.6 && Math.abs(angDiff(bearingOf(x - m.x, y - m.y), m.h)) > 1.25) return;
    if (d < bd) { bd = d; best = o; }
  };
  for (const b of ZM.buys) consider({ k: 'buy', b }, b.x + b.nx * 0.7, b.y + b.ny * 0.7, 0, 1.6, true);
  for (const p of ZM.perksAt) consider({ k: 'perk', p }, p.x + p.nx * 0.9, p.y + p.ny * 0.9, 0, 1.7, true);
  for (const d of ZM.doors) if (!d.open) consider({ k: 'door', d }, d.x, d.y, d.z || 0, 2.3, false);
  const B = ZM.box, S = ZM.spawns[B.at];
  if (S && (B.st === 'idle' || (B.st === 'offer' && B.owner === m.id))) consider({ k: 'box' }, S.x + S.nx * 0.9, S.y + S.ny * 0.9, S.z - 0.32, 1.8, true);
  if (typeof zmpConsider === 'function') zmpConsider(consider);   // [pap] the bench
  // someone down: you can get them up
  if (ZM.net) for (const r of FPS.remote.values()) if (r.down && !r.dead) consider({ k: 'rev', sid: r.id, n: r.n }, r.x, r.y, r.jz || 0, 1.8, false);
  for (const w of ZM.windows) if (w.boards < 6 && zmOpen(w.zone)) consider({ k: 'win', w }, w.x - w.nx * 0.95, w.y - w.ny * 0.95, w.z || 0, 1.9, false);
  if (typeof zeNearest === 'function') zeNearest(consider);   // [egg hook] src/zmegg.js
  ZM.near = best;
  ZM.prompt = best ? zmPrompt(best) : null;
}
function zmPrompt(o) {
  { const r = typeof zmpPrompt === 'function' && zmpPrompt(o); if (r) return r; }   // [pap] the bench, a reforged weapon's ammunition
  if (o.k === 'egg') return typeof zePrompt === 'function' ? zePrompt(o) : null;   // [egg hook] src/zmegg.js
  if (o.k === 'buy') {
    const w = FPSW[o.b.id], own = ZM.own.includes(o.b.id);
    if (own && w.melee) return { text: `${w.n}: in hand` };
    if (own) return { text: `${w.n} ammunition`, cost: Math.round(o.b.cost / 2) };
    return { text: `the ${w.n}`, cost: o.b.cost };
  }
  if (o.k === 'perk') { const P = ZM_PERKS[o.p.k]; if (ZM.perks[o.p.k]) return { text: `${P.n}: you've had it` }; if (o.p.k === 'wind' && ZM.windBuys >= 3) return { text: `${P.n}: none left` }; return { text: `${P.n} (${P.what})`, cost: P.cost }; }
  if (o.k === 'door') { const [a, b] = o.d.zones, to = zmOpen(a) ? b : a; return { text: `${o.d.kind === 'debris' ? 'Clear the wreckage to' : o.d.kind === 'gate' ? 'Unlock the gate up to' : 'Open the door to'} ${zmZoneName(to)}`, cost: o.d.cost }; }
  if (o.k === 'box') { const B = ZM.box; if (B.st === 'offer') return { text: `Take the ${FPSW[B.item].n}`, free: true }; return { text: 'The wreck chest', cost: ZMC.BOX }; }
  if (o.k === 'win') return { text: (ZM.boardPts || 0) >= ZM_BOARD_CAP ? 'Hold to nail the boards back (no more points for it this round)' : 'Hold to nail the boards back', hold: true };
  if (o.k === 'rev') return { text: `Hold to get ${o.n || 'them'} up${ZM.revT > 0 ? ' ' + '▮'.repeat(Math.ceil(ZM.revT)) : ''}`, hold: true };
  return null;
}
function zmUse() {
  const o = ZM.near, m = FPS.me; if (!o || m.dead > 0 || ZM.over) return;
  if (typeof zmpUse === 'function' && zmpUse(o)) return;   // [pap]
  if (o.k === 'egg') { if (typeof zeUse === 'function') zeUse(o); return; }   // [egg hook] src/zmegg.js
  const pay = c => { if (ZM.pts < c) { zmSound('no'); fpsFeed('Not enough points.'); return false; } ZM.pts -= c; ZM.spent += c; return true; };
  if (o.k === 'buy') {
    const id = o.b.id, w = FPSW[id], own = ZM.own.includes(id);
    if (own && w.melee) return;
    if (own) { if ((ZM.res[id] || 0) >= ZM_AMMO[id] && (FPS.weapon !== id || m.ammo >= w.mag)) { fpsFeed('You can’t carry any more.'); return; } if (!pay(Math.round(o.b.cost / 2))) return; ZM.res[id] = ZM_AMMO[id]; if (FPS.weapon === id) { m.ammo = w.mag; } m.mags[id] = w.mag; zmSound('buy'); return; }
    if (!pay(o.b.cost)) return; zmGive(id); return;
  }
  if (o.k === 'perk') {
    const k = o.p.k, P = ZM_PERKS[k]; if (ZM.perks[k] || (k === 'wind' && ZM.windBuys >= 3)) return;
    if (!pay(P.cost)) return;
    ZM.perks[k] = true; if (k === 'wind') ZM.windBuys++;
    if (k === 'stout') m.hp = ZMC.HP_STOUT;
    zmSound('drink'); fpsFeed(`${P.n}: ${P.what}.`); return;
  }
  if (o.k === 'door') { if (!pay(o.d.cost)) return; if (ZM.net === 'client') { zmnRequest('door', o.d.id); zmOpenDoor(o.d); } else zmOpenDoor(o.d); return; }
  if (o.k === 'box') zmBoxUse();
}
function zmOpenDoor(d) {
  const I = FPS.g.isle;
  if (d.open) return;
  d.open = true; d.openT = 0; ZM.doorsOpened++;
  I.solids = I.solids.filter(s => !d.solids.includes(s)); fpiIndex(I);
  for (const k of d.zones) ZM.open.add(k);
  if (d.zones.includes('lamp')) ZM.open.add('tower');
  zmNavBuild(); ZM.navT = 0;
  zmSound(d.kind === 'debris' ? 'debris' : 'door');
  for (let i = 0; i < 14; i++) FPS.parts.push({ x: d.x + (Math.random() - 0.5) * 2, y: d.y + (Math.random() - 0.5) * 2, z: FPSC.GROUND + Math.random() * 2.2, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, vz: Math.random() * 1.5, t: 0.9, c: '150,140,120' });
}

// ---------- going down ----------
function zmDown() {
  const m = FPS.me;
  ZM.downs++;
  if (ZM.perks.wind) {
    // Second Wind: back up, everything near you thrown back, and every tonic gone
    ZM.perks = {}; m.hp = ZMC.HP; m.protect = 3; FPS.hurtT = 0.8;
    for (const z of ZM.z) { if (z.dead || z.st !== 'in') continue; const dx = z.x - m.x, dy = z.y - m.y, d = Math.hypot(dx, dy) || 1; if (d < 6) for (let k = 0; k < 6; k++) zmMove(z, dx / d * 0.5, dy / d * 0.5); z.atk = 1.5; }
    ZM.banner = { text: 'Second Wind', t: 2.5, col: ZM_PERKS.wind.c };
    zmSound('wind');
    return;
  }
  if (ZM.net) {
    // together: down on the floor for half a minute; a friend can get you up (and your tonics are gone)
    m.hp = 0; m.dead = FPSC.RESPAWN - 0.6; FPS.scoped = false; ZM.perks = {}; ZM.downT = 30;
    ZM.banner = { text: 'You’re down', t: 3 };
    zmSound('over');
    return;
  }
  zmEnd();
}
// half a minute down and nobody came: out until the next round
function zmBleedOut() {
  ZM.downT = 0; ZM.ghost = true;
  fpsFeed('You bled out. You’ll be back next round, if anyone holds that long.');
}
// up again (a friend got to you)
function zmGetUp() {
  const m = FPS.me; if (!(ZM.downT > 0)) return;
  ZM.downT = 0; m.dead = 0; m.hp = ZMC.HP; m.protect = 2; FPS.drawT = 0.45;
  ZM.banner = { text: 'Back on your feet', t: 2, small: true };
  zmSound('wind');
}
function zmShowOver() {
  const r = ZM.round, held = Math.max(0, r - 1);
  $('zmOverHead').textContent = held ? `The light went out on round ${r}` : 'The light went out';
  $('zmOverStats').textContent = (ZM.net ? `${ZM.hum.length} of you. ` : '') + `You held ${held} ${held === 1 ? 'round' : 'rounds'}. ${ZM.kills} drowned sent back (${ZM.heads} through the head), ${ZM.doorsOpened} ${ZM.doorsOpened === 1 ? 'door' : 'doors'} opened, ${ZM.pts + ZM.spent} points earned.`;
  const best = typeof BOARD !== 'undefined' && BOARD.mine && BOARD.mine.zm;
  $('zmOverBest').textContent = best && best.s ? `Your best: round ${best.s + 1} reached, ${best.b} kills in one game.` : '';
  $('zmOver').hidden = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  setTimeout(() => $('zmAgain').focus(), 30);
}
function zmAgain() { const net = ZM.net; fpsStop(); if (!net) setTimeout(zmStart, 0); else if (typeof zmnBackToLobby === 'function') zmnBackToLobby(); }

// ---------- sounds ----------
function zmSound(k, d, pan, kind) {
  try {
    if (soundOff()) return;
    const v = d == null ? 1 : Math.max(0.05, 1 - d / 40), o = { pan: clamp(pan || 0, -1, 1) };
    if (k === 'moan') { const f = kind === 'run' ? 260 : 170 + Math.random() * 60; noise('bandpass', f, 6, 0.12, 0.22 * v, 0.7, Object.assign({ to: f * 0.7 }, o)); tone(f * 0.5, 'sawtooth', 0.1, 0.05 * v, 0.6, Object.assign({ to: f * 0.35 }, o)); }
    else if (k === 'tear') { noise('bandpass', 700, 2, 0.003, 0.3 * v, 0.18); noise('lowpass', 300, 1, 0.02, 0.2 * v, 0.3, { delay: 0.12 }); }
    else if (k === 'board') { noise('bandpass', 1400, 3, 0.002, 0.25, 0.08); tone(520, 'square', 0.001, 0.05, 0.05); tone(980, 'triangle', 0.001, 0.04, 0.12, { delay: 0.05 }); }
    else if (k === 'hit') { noise('lowpass', 500, 1, 0.004, 0.4, 0.25); tone(90, 'sine', 0.005, 0.25, 0.2, { to: 50 }); }
    else if (k === 'round') { sfxBellFar(0, 0.8); tone(110, 'sine', 0.3, 0.12, 2.4, { to: 82 }); }
    else if (k === 'end') { for (let i = 0; i < 3; i++) tone(392 - i * 49, 'triangle', 0.01, 0.12, 0.9, { delay: i * 0.45 }); }
    else if (k === 'buy') { tone(880, 'triangle', 0.002, 0.12, 0.12); tone(1320, 'triangle', 0.002, 0.1, 0.2, { delay: 0.08 }); }
    else if (k === 'no') tone(140, 'square', 0.002, 0.06, 0.18);
    else if (k === 'door') { noise('bandpass', 380, 4, 0.2, 0.18, 0.9, { to: 220 }); noise('lowpass', 200, 1, 0.01, 0.4, 0.4, { delay: 0.9 }); }
    else if (k === 'debris') { for (let i = 0; i < 4; i++) noise('lowpass', 400 + Math.random() * 600, 1, 0.005, 0.3, 0.3, { delay: i * 0.12 }); }
    else if (k === 'open') { noise('bandpass', 500, 5, 0.1, 0.16, 0.5, { to: 300 }); }
    else if (k === 'tick') tone(1200 + Math.random() * 800, 'triangle', 0.001, 0.05, 0.06);
    else if (k === 'offer') { tone(660, 'triangle', 0.01, 0.1, 0.4); tone(990, 'triangle', 0.01, 0.08, 0.6, { delay: 0.1 }); }
    else if (k === 'gull') { for (let i = 0; i < 3; i++) tone(1800 - i * 200, 'sawtooth', 0.01, 0.05, 0.15, { delay: i * 0.18, to: 1100 }); }
    else if (k === 'drop') { tone(1500, 'sine', 0.01, 0.06, 0.5, { to: 1900 }); }
    else if (k === 'take') { tone(523, 'triangle', 0.005, 0.12, 0.2); tone(784, 'triangle', 0.005, 0.12, 0.3, { delay: 0.1 }); tone(1046, 'triangle', 0.005, 0.12, 0.5, { delay: 0.2 }); }
    else if (k === 'drink') { for (let i = 0; i < 3; i++) noise('bandpass', 300 + i * 40, 8, 0.02, 0.12, 0.1, { delay: i * 0.18 }); tone(330, 'triangle', 0.01, 0.08, 0.4, { delay: 0.6 }); }
    else if (k === 'wind') { noise('bandpass', 900, 1, 0.3, 0.25, 1.0, { to: 300 }); }
    else if (k === 'over') { tone(196, 'sine', 0.2, 0.2, 3.0, { to: 98 }); sfxBellFar(0, 0.6); }
    else if (k === 'beam') { if (Math.random() < 0.5) noise('bandpass', 260 + Math.random() * 80, 2, 0.02, 0.09, 0.14); }
  } catch (e) {}
}

// ---------- in 3D ----------
// Everything that moves or changes: the drowned, the doors and wreckage, the window boards, the weapons on the walls
// and their chalked prices, the wreck chest (and its light, and the gull), salvage, and the Fresnel Lamp's beam.
const Z3 = { grp: null, key: '', pool: [], doors: [], boards: [], chest: null, wpn: {}, drops: [], beam: null };
const z3v = (x, y, z) => new THREE.Vector3(x, z, -y);
// (darkened for the night, as the station's own props are)
function z3Lam(c, extra) { const m = new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra || {})); m.color.multiplyScalar(0.62); return m; }
function z3Soft(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const q = c.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function z3Fade(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const q = c.getContext('2d'), gr = q.createLinearGradient(0, 64, 0, 0);
  for (const [k, col] of stops) gr.addColorStop(k, col);
  q.fillStyle = gr; q.fillRect(0, 0, 4, 64);
  return new THREE.CanvasTexture(c);
}
// a weapon model to hang on a wall or turn over the chest: the first-person one, without hands
function z3Weapon(id) {
  try {
    if (!(typeof vmInit === 'function' && vmInit() && VM_BUILD[id])) return null;
    const b = VM_BUILD[id](vmMatsFor(id, true));
    for (const h of [b.hand, b.left]) if (h) h.visible = false;
    // (its materials made for the night scene: a little darker than in your hands)
    const seen = new Map();
    b.root.traverse(o => { if (!o.isMesh) return; const one = mt => { if (!mt || !mt.color) return mt; if (!seen.has(mt)) { const c = mt.clone(); if (!mt.emissive || !mt.emissiveIntensity) c.color.multiplyScalar(0.5); if (c.specular) c.specular.multiplyScalar(0.5); seen.set(mt, c); } return seen.get(mt); }; o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); });
    for (const o of ['fresh', 'spent', 'old']) if (b[o] && b[o].parent && b[o].parent !== b.root) b[o].parent.remove(b[o]);
    for (const o of ['fresh', 'spent', 'old']) if (b[o]) b[o].visible = false;
    return b.root;
  } catch (e) { return null; }
}
function z3Chalk(lines, w, h) {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w);
  const q = c.getContext('2d');
  q.fillStyle = 'rgba(0,0,0,0)'; q.clearRect(0, 0, c.width, c.height);
  q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillStyle = 'rgba(232,228,214,0.9)';
  lines.forEach(([t, px], i) => { q.font = `${px}px "IM Fell English SC", Georgia, serif`; q.fillText(t, c.width / 2, c.height * (i + 0.5) / lines.length); });
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
}
function zm3dBuild() {
  if (Z3.grp) { GL3D.scene.remove(Z3.grp); Z3.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  for (const z of ZM.z) z.mdl = null;
  Z3.pool = []; Z3.wpn = {};
  const grp = Z3.grp = new THREE.Group(); GL3D.scene.add(grp);
  Z3.key = FPS.g.isle.key;
  const G0 = FPSC.GROUND;
  // the doors and the wreckage across the ways through
  const wood = z3Lam('#4a3626'), wood2 = z3Lam('#5a4430'), iron = z3Lam('#24262a'), brass = z3Lam('#8a6a2c');
  Z3.doors = ZM.doors.map(d => {
    const g = new THREE.Group(); g.position.copy(z3v(d.x, d.y, G0 + (d.z || 0))); g.rotation.y = d.ang; grp.add(g);
    if (d.kind === 'gate') {
      // an iron gate across the stair, with a brass lock
      const bar = new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6);
      for (let i = 0; i <= 9; i++) { const b = new THREE.Mesh(bar, iron); b.position.set(-d.w / 2 + i * d.w / 9, 1.15, 0); g.add(b); }
      for (const y of [0.15, 1.2, 2.25]) { const b = new THREE.Mesh(new THREE.BoxGeometry(d.w, 0.06, 0.05), iron); b.position.set(0, y, 0); g.add(b); }
      const lk = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.1), brass); lk.position.set(0, 1.1, 0); g.add(lk);
    } else if (d.kind === 'door') {
      const n = 5; for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(d.w / n * 0.96, 2.45, 0.12), i % 2 ? wood : wood2); b.position.set(-d.w / 2 + (i + 0.5) * d.w / n, 1.22, 0); g.add(b); }
      for (const y of [0.45, 1.9]) { const b = new THREE.Mesh(new THREE.BoxGeometry(d.w * 0.98, 0.1, 0.16), iron); b.position.set(0, y, 0); g.add(b); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 14), brass); ring.position.set(d.w * 0.3, 1.1, 0.1); g.add(ring);
      const ring2 = ring.clone(); ring2.position.z = -0.1; g.add(ring2);
    } else {
      // wreckage: timbers fallen across, a cask, a spar
      const rnd = seeded(d.id * 97 + 5);
      for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(d.w * (0.8 + rnd() * 0.5), 0.2 + rnd() * 0.15, 0.25 + rnd() * 0.2), rnd() < 0.5 ? wood : wood2); b.position.set((rnd() - 0.5) * 0.4, 0.2 + i * 0.32, (rnd() - 0.5) * 0.3); b.rotation.set(rnd() * 0.3, rnd() * 0.3, (rnd() - 0.5) * 0.7); g.add(b); }
      const cask = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 10), wood2); cask.rotation.z = Math.PI / 2; cask.position.set(0.3, 0.32, 0.25); g.add(cask);
      const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.0, 8), wood); spar.position.set(0, 1.3, 0.05); spar.rotation.z = 0.9; g.add(spar);
    }
    return g;
  });
  // the boards over each window, outside it
  const boardM = [z3Lam('#6a5236'), z3Lam('#5a4630'), z3Lam('#7a6040')];
  Z3.boards = ZM.windows.map(w => {
    const g = new THREE.Group(); g.position.copy(z3v(w.x + w.nx * 0.33, w.y + w.ny * 0.33, G0 + (w.z || 0))); grp.add(g);
    // (turned so its boards run along the wall, and its local z points out of the window)
    g.rotation.y = Math.atan2(w.nx, -w.ny);
    const rnd = seeded(w.id * 131 + 7), list = [], out = 1;
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.17, 0.06), boardM[i % 3]); b.position.set(0, 1.12 + i * 0.2, 0); b.rotation.z = (rnd() - 0.5) * 0.22; g.add(b); list.push({ m: b, y: b.position.y, rz: b.rotation.z }); }
    return { g, list, out };
  });
  // weapons on the walls, and their prices chalked under them
  for (const b of ZM.buys) {
    const g = new THREE.Group(); g.position.copy(z3v(b.x + b.nx * 0.07, b.y + b.ny * 0.07, G0)); g.rotation.y = Math.atan2(b.ny, b.nx) - Math.PI / 2; grp.add(g);
    const model = z3Weapon(b.id);
    if (model) { model.scale.setScalar(2.0); model.rotation.set(0, Math.PI / 2, 0); model.position.set(0.15, 1.62, -0.08); g.add(model); }
    const ch = z3Chalk([[FPSW[b.id].n.replace(' gun', '').toUpperCase(), 34], [String(b.cost), 44]], 1.5, 0.52); ch.position.set(0, 1.12, -0.01); ch.rotation.y = Math.PI; g.add(ch);
  }
  // the chest, its lid, its lock, the light standing over it, the gull
  {
    const g = new THREE.Group(); grp.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.62, 0.72), z3Lam('#3e2a1c')); body.position.y = 0.31; g.add(body);
    for (const x of [-0.55, 0, 0.55]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.64, 0.74), iron); b.position.set(x, 0.31, 0); g.add(b); }
    const lid = new THREE.Group(); lid.position.set(0, 0.62, 0.36); g.add(lid);
    const lg = new THREE.CylinderGeometry(0.36, 0.36, 1.47, 12, 1, false, 0, Math.PI); lg.rotateZ(Math.PI / 2);
    const lm = new THREE.Mesh(lg, z3Lam('#4a3222', { side: THREE.DoubleSide })); lm.position.set(0, 0, -0.36); lid.add(lm);
    for (const x of [-0.55, 0.55]) { const bg = new THREE.TorusGeometry(0.365, 0.03, 4, 12, Math.PI); bg.rotateY(Math.PI / 2); const b = new THREE.Mesh(bg, iron); b.position.set(x, 0, -0.36); lid.add(b); }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.04), new THREE.MeshBasicMaterial({ color: 0x9ff0d8 })); lock.position.set(0, 0.5, -0.37); g.add(lock);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: z3Soft('rgba(160,255,220,0.8)', 'rgba(160,255,220,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.set(0, 0.62, 0); glow.rotation.x = -Math.PI / 2; g.add(glow);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 9, 18, 1, true), new THREE.MeshBasicMaterial({ map: z3Fade([[0, 'rgba(170,255,225,0.55)'], [0.4, 'rgba(170,255,225,0.18)'], [1, 'rgba(170,255,225,0)']]), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    shaft.position.y = 4.5 + 0.6; g.add(shaft);
    const show = new THREE.Group(); g.add(show);
    const gull = new THREE.Group(); g.add(gull);
    const white = z3Lam('#e8e8e4'), gb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), white); gb.scale.set(0.8, 0.8, 2.0); gull.add(gb);
    const wings = [-1, 1].map(s => { const wg = new THREE.Group(); wg.position.set(s * 0.08, 0.05, 0); const wm = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.02, 0.26), white); wm.position.x = s * 0.38; wg.add(wm); gull.add(wg); return wg; });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), z3Lam('#e0a030')); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.02, -0.36); gull.add(beak);
    const light = new THREE.PointLight(0x9ff0d8, 0.8, 7, 1.5); light.position.y = 1.2; g.add(light);
    Z3.chest = { g, lid, shaft, show, gull, wings, light, glow, at: -1 };
  }
  // salvage
  const halo = z3Soft('rgba(255,240,180,0.9)', 'rgba(255,240,180,0)');
  Z3.dropMeshes = {};
  const mk = k => {
    const g = new THREE.Group(), C = ZM_DROPS[k].c;
    if (k === 'keg') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 12), z3Lam('#6a4a2a', { emissive: 0x2a1a08 })); g.add(c); for (const y of [-0.14, 0.14]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.02, 6, 16), brass); b.rotation.x = Math.PI / 2; b.position.y = y; g.add(b); } }
    else if (k === 'double') { for (const [x, y] of [[-0.12, 0], [0.12, 0.05]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 18), z3Lam('#e8c050', { emissive: 0x504010 })); c.rotation.x = Math.PI / 2; c.position.set(x, y, 0); g.add(c); } }
    else if (k === 'spot') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20), new THREE.MeshBasicMaterial({ color: 0x050505 })); c.rotation.x = Math.PI / 2; g.add(c); const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 20), new THREE.MeshBasicMaterial({ color: 0xe8e8f0 })); g.add(r); }
    else { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), iron); g.add(b); const gl = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.24), new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); g.add(gl); const top = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 8), iron); top.position.y = 0.21; g.add(top); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: new THREE.Color(C), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(1.3); g.add(s);
    g.visible = false; grp.add(g); return g;
  };
  Z3.drops = []; Z3.mk = mk;
  // the Fresnel Lamp's beam: a cone of light, brightest at the lens, and a core inside it
  {
    const fade = z3Fade([[0, 'rgba(255,236,170,0.75)'], [0.55, 'rgba(255,220,140,0.25)'], [1, 'rgba(255,210,120,0)']]);
    const geo = new THREE.CylinderGeometry(1, 0.06, 1, 28, 1, true); geo.translate(0, 0.5, 0);
    const outer = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: fade, color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    const g = new THREE.Group(); g.add(outer); g.add(core); g.visible = false; grp.add(g);
    const L = new THREE.PointLight(0xffd890, 0, 14, 1.4); grp.add(L);
    Z3.beam = { g, outer, core, L };
  }
  if (typeof ze3dBuild === 'function') ze3dBuild(grp);   // [egg hook] src/zmegg.js
  zm3dLantern(grp);
}
// the glazed windows of the tower, and the lantern on top: its ring of glass in brass astragals, the gallery rail, the
// copper dome with its ventilator ball and lightning rod, and the Light itself, a great lens turning on the newel
// with its two beams sweeping out over the sea
function zm3dLantern(grp) {
  const G0 = FPSC.GROUND, L5 = ZMT.L[5], T = ZM_TC, cx = FPSC.CX + T[0], cy = FPSC.CY + T[1];
  const glassM = new THREE.MeshPhongMaterial({ color: 0x9ab8c8, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const frameM = z3Lam('#2e5a5a'), brassM = new THREE.MeshPhongMaterial({ color: 0x8a6a2c, specular: 0xb09060, shininess: 60 });
  for (const w of ZM.glass) {
    const g = new THREE.Group(); g.position.copy(z3v(w.x, w.y, G0 + w.z0)); g.rotation.y = w.ang; grp.add(g);
    const h = w.z1 - w.z0, pane = new THREE.Mesh(new THREE.PlaneGeometry(w.w, h), glassM); pane.position.y = h / 2; g.add(pane);
    for (const x of [-w.w / 2, 0, w.w / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.08), frameM); b.position.set(x, h / 2, 0); g.add(b); }
    for (const y of [0.02, h / 2, h - 0.02]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w.w, 0.06, 0.08), frameM); b.position.set(0, y, 0); g.add(b); }
    // a box of flowers on the sill
    const bx = new THREE.Mesh(new THREE.BoxGeometry(w.w * 0.7, 0.18, 0.25), z3Lam('#5a3a24')); bx.position.set(0, 0.09, -0.32); g.add(bx);
    for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), z3Lam(i % 2 ? '#d84050' : '#e8e0d0')); f.position.set(-w.w * 0.3 + i * w.w * 0.15, 0.24, -0.32); g.add(f); }
  }
  const top = new THREE.Group(); top.position.copy(z3v(cx, cy, G0 + L5)); grp.add(top);
  const R = ZMT.GLASS, HG = 4.4;
  // the glass, and the astragals
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HG, 48, 1, true), glassM); ring.position.y = HG / 2 + 0.05; top.add(ring);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.1, HG, 0.1), brassM); b.position.set(Math.cos(a) * R, HG / 2, -Math.sin(a) * R); top.add(b); }
  for (const y of [0.05, HG / 2, HG]) { const t = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 6, 48), brassM); t.rotation.x = Math.PI / 2; t.position.y = y; top.add(t); }
  // the cornice and the dome, the ball and the rod
  const red = z3Lam('#7a2a22'), dark = z3Lam('#22282a');
  const corn = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.3, 0.5, 48), dark); corn.position.y = HG + 0.25; top.add(corn);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R + 0.4, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), red); dome.scale.y = 0.42; dome.position.y = HG + 0.5; top.add(dome);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10), dark); ball.position.y = HG + 0.5 + (R + 0.4) * 0.42 + 0.4; top.add(ball);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 2.4, 6), brassM); rod.position.y = ball.position.y + 1.4; top.add(rod);
  // the gallery's rail, outside on the parapet
  const rail = new THREE.Mesh(new THREE.TorusGeometry(ZMT.R + 0.3, 0.05, 6, 64), dark); rail.rotation.x = Math.PI / 2; rail.position.y = 1.15; top.add(rail);
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), dark); b.position.set(Math.cos(a) * (ZMT.R + 0.3), 0.85, -Math.sin(a) * (ZMT.R + 0.3)); top.add(b); }
  // the Light: a pedestal on the newel, a beehive of glass rings in a brass cage, turning
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 0.9, 16), brassM); ped.position.y = 0.45; top.add(ped);
  const lens = new THREE.Group(); lens.position.y = 0.9; top.add(lens);
  const lensM = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 11; i++) { const r = 0.95 - Math.abs(i - 5) * 0.07, t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.17, 24, 1, true), lensM); t.position.y = 0.15 + i * 0.2; lens.add(t); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 0.06), brassM); b.position.set(Math.cos(a) * 1.0, 1.15, Math.sin(a) * 1.0); lens.add(b); }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); core.position.y = 1.15; lens.add(core);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,236,180,0.95)', 'rgba(255,220,150,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.setScalar(5); glow.position.y = 1.15; lens.add(glow);
  // two beams, opposite each other, out of the lens and across the sea
  const fade = z3Fade([[0, 'rgba(255,240,190,0.5)'], [0.25, 'rgba(255,236,180,0.22)'], [1, 'rgba(255,230,170,0)']]);
  const bgeo = new THREE.CylinderGeometry(9, 0.9, 140, 24, 1, true); bgeo.translate(0, 70, 0); bgeo.rotateZ(-Math.PI / 2);
  const beamM = new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  for (const s of [0, Math.PI]) { const b = new THREE.Mesh(bgeo, beamM); b.rotation.y = s; b.position.y = 1.15; lens.add(b); }
  const L = new THREE.PointLight(0xfff0c8, 2.2, 22, 1.2); L.position.y = 1.4; top.add(L);
  Z3.lens = { lens, L, beamM };
}
// the drowned: one model each (from a pool), coloured for the sea they came out of
const Z3G = {};
function z3Geo() {
  if (Z3G.ok) return Z3G;
  Z3G.leg = new THREE.BoxGeometry(0.16, 0.92, 0.18); Z3G.leg.translate(0, -0.46, 0);
  Z3G.torso = new THREE.BoxGeometry(0.46, 0.62, 0.27); Z3G.torso.translate(0, 0.31, 0);
  Z3G.skirt = new THREE.BoxGeometry(0.5, 0.36, 0.3); Z3G.skirt.translate(0, -0.12, 0);
  Z3G.head = new THREE.SphereGeometry(0.13, 12, 10);
  Z3G.jaw = new THREE.BoxGeometry(0.15, 0.05, 0.12);
  Z3G.arm = new THREE.CylinderGeometry(0.055, 0.045, 0.62, 8); Z3G.arm.translate(0, -0.31, 0);
  Z3G.hand = new THREE.SphereGeometry(0.06, 8, 6);
  Z3G.eye = new THREE.SphereGeometry(0.022, 6, 5);
  Z3G.kelp = new THREE.BoxGeometry(0.035, 0.5, 0.01); Z3G.kelp.translate(0, -0.25, 0);
  Z3G.hat = new THREE.CylinderGeometry(0.2, 0.22, 0.12, 12);
  Z3G.brim = new THREE.CylinderGeometry(0.28, 0.3, 0.03, 14);
  Z3G.eyeM = new THREE.MeshBasicMaterial({ color: 0xc8ffd8 });
  Z3G.trous = z3Lam('#22282a'); Z3G.kelpM = z3Lam('#2a4a30'); Z3G.hatM = z3Lam('#3a3020');
  Z3G.ok = true;
  return Z3G;
}
const ZM_COATS = ['#3a4a50', '#4a3a30', '#2e3a44', '#4a4a40', '#3a2e2e', '#5a5040', '#2a3530'];
function zmModel(z) {
  if (z.boss && typeof zbModel === 'function') return zbModel(z);   // [boss] a model of his own (src/zmboss.js)
  let M = Z3.pool.find(p => !p.used);
  if (!M) {
    const Q = z3Geo(), root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 0.95;
    const coat = z3Lam('#3a4a50'), skin = z3Lam('#8a9e94');
    const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.11, 0, 0); const l = new THREE.Mesh(Q.leg, Q.trous); p.add(l); hips.add(p); return p; });
    const torso = new THREE.Group(); hips.add(torso);
    torso.add(new THREE.Mesh(Q.torso, coat)); const sk = new THREE.Mesh(Q.skirt, coat); torso.add(sk);
    const head = new THREE.Group(); head.position.set(0, 0.76, -0.02); torso.add(head);
    const hm = new THREE.Mesh(Q.head, skin); hm.scale.set(0.95, 1.12, 1); head.add(hm);
    const jaw = new THREE.Mesh(Q.jaw, skin); jaw.position.set(0, -0.12, -0.03); head.add(jaw);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(Q.eye, Q.eyeM); e.position.set(s * 0.045, 0.02, -0.115); head.add(e); }
    const hat = new THREE.Group(); hat.add(new THREE.Mesh(Q.hat, Q.hatM)); const brim = new THREE.Mesh(Q.brim, Q.hatM); brim.position.y = -0.05; hat.add(brim); hat.position.y = 0.13; head.add(hat);
    const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.29, 0.56, 0); const a = new THREE.Mesh(Q.arm, coat); p.add(a); const h = new THREE.Mesh(Q.hand, skin); h.position.y = -0.64; p.add(h); const k = new THREE.Mesh(Q.kelp, Q.kelpM); k.position.set(s * 0.04, -0.3, 0.05); p.add(k); torso.add(p); return p; });
    for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(Q.kelp, Q.kelpM); k.position.set(-0.18 + i * 0.12, 0.55 - (i % 2) * 0.2, 0.14); k.rotation.z = (i - 1.5) * 0.15; torso.add(k); }
    M = { root, hips, legs, arms, torso, head, hat, coat, skin, used: false };
    Z3.pool.push(M); Z3.grp.add(root);
  }
  M.used = true; M.root.visible = true;
  const rnd = seeded(z.seed);
  M.coat.color.set(ZM_COATS[(rnd() * ZM_COATS.length) | 0]).multiplyScalar(0.7); M.coat.emissive.set(0);
  // drowned skin: grey-green, bloodless, darker in the later rounds
  M.skin.color.setHSL(0.36 + rnd() * 0.1, 0.1 + rnd() * 0.08, 0.3 + rnd() * 0.07 - Math.min(0.08, ZM.round * 0.004)); M.skin.emissive.set(0);
  M.hat.visible = rnd() < 0.4;
  M.root.scale.setScalar(0.94 + rnd() * 0.12);
  M.root.rotation.set(0, 0, 0);
  z.mdl = M;
  return M;
}
function zmFreeModel(z) { if (z.mdl) { z.mdl.used = false; z.mdl.root.visible = false; z.mdl = null; } }
function zmPose(z, M, dt) {
  if (z.boss && typeof zbPose === 'function') return zbPose(z, M, dt);   // [boss]
  const G0 = FPSC.GROUND;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.y = -z.h;
  const t = g.t, run = z.kind === 'run', jog = z.kind === 'jog';
  if (z.walk || z.st === 'out') z.ph += dt * z.sp * (run ? 2.2 : 2.6);
  const A = z.walk ? (run ? 1 : jog ? 0.8 : 0.55) : 0.08, ph = z.ph;
  M.legs[0].rotation.x = Math.sin(ph) * 0.7 * A; M.legs[1].rotation.x = -Math.sin(ph) * 0.7 * A;
  // shamblers drag a little and lurch; runners lean right into it
  M.hips.position.y = 0.95 - Math.abs(Math.cos(ph)) * 0.05 * A - (z.st === 'climb' ? Math.sin(Math.min(1, z.t) * Math.PI) * 0.3 : 0);
  M.torso.rotation.x = -(run ? 0.38 : jog ? 0.22 : 0.12) - (z.st === 'climb' ? 0.5 : 0);
  M.torso.rotation.z = Math.sin(ph * 0.5) * (run ? 0.05 : 0.14);
  M.head.rotation.z = Math.sin(t * 0.9 + z.seed) * 0.25; M.head.rotation.x = 0.15 + Math.sin(t * 1.3 + z.seed) * 0.1;
  // arms out in front; tearing at boards; a swing at you
  let ax = -1.35, bx = -1.35;
  if (z.st === 'tear') { ax = -1.6 + Math.sin(t * 9) * 0.5; bx = -1.6 - Math.sin(t * 9) * 0.5; }
  if (z.scaling) { ax = -2.8 + Math.sin(t * 7) * 0.45; bx = -2.8 - Math.sin(t * 7) * 0.45; M.legs[0].rotation.x = Math.sin(t * 7) * 0.5; M.legs[1].rotation.x = -Math.sin(t * 7) * 0.5; }
  if (z.swing >= 0) { const k = z.swing / 0.6; ax = -2.2 + Math.sin(k * Math.PI) * 1.6; }
  ax += Math.sin(ph * 0.5) * 0.12 * A; bx += Math.sin(ph * 0.5 + 1) * 0.12 * A;
  M.arms[0].rotation.x = ax; M.arms[1].rotation.x = bx;
  M.arms[0].rotation.z = -0.1; M.arms[1].rotation.z = 0.1;
  // hit: a pale flash; burning: alight and going to ash; dead: down they go, and sink
  const hot = z.burn ? 0.6 + 0.4 * Math.sin(t * 17 + z.seed) : (z.scorch || 0) * 0.7;
  const flash = z.hitT > 0 ? z.hitT / 0.15 : 0;
  M.skin.emissive.setRGB(0.2 * flash + hot * 0.55, 0.24 * flash + hot * 0.22, 0.22 * flash + hot * 0.04);
  M.coat.emissive.setRGB(0.12 * flash + hot * 0.4, 0.12 * flash + hot * 0.14, 0.1 * flash);
  if (z.burn && !z.charred) { z.charred = true; M.skin.color.multiplyScalar(0.35); M.coat.color.multiplyScalar(0.35); }
  if (z.scorch > 0 && !z.burn) z.scorch = Math.max(0, z.scorch - dt * 0.8);
  if (z.dead) {
    const k = Math.min(1, z.deadT / 0.6);
    if (z.burn) { const s = Math.max(0.01, 1 - z.deadT / 1.2); M.root.scale.set(s, s * (0.6 + 0.4 * s), s); }
    else { M.root.rotation.x = k * 1.45 * (z.head ? 1.1 : 1); M.root.position.y -= Math.max(0, z.deadT - 1.2) * 0.6; }
  }
}
// each frame, before the 3D scene is drawn
function zmScene3D() {
  if (typeof GL3D === 'undefined' || !GL3D.scene) return;
  if (!Z3.grp || Z3.key !== FPS.g.isle.key) zm3dBuild();
  Z3.grp.visible = true;
  if (GL3D.tower) GL3D.tower.visible = false;
  // indoors, at night: dimmer all over, so the lamps make pools of light
  GL3D.amb.intensity = 0.42; GL3D.moon.intensity = 0.12;
  const dt = Math.min(0.05, FPS.dtLast || 0.016), t = g.t, G0 = FPSC.GROUND, m = FPS.me;
  // the drowned
  for (const z of ZM.z) {
    const far = Math.hypot(z.x - m.x, z.y - m.y) > 90;
    if (far) { if (z.mdl) zmFreeModel(z); continue; }
    const M = z.mdl || zmModel(z);
    zmPose(z, M, dt);
  }
  // doors: up into the lintel and gone; wreckage: down into the floor
  ZM.doors.forEach((d, i) => {
    const g3 = Z3.doors[i]; if (!g3) return;
    if (!d.open) { g3.visible = true; g3.position.y = G0 + (d.z || 0); return; }
    d.openT = (d.openT || 0) + dt;
    const k = Math.min(1, d.openT / 0.9);
    g3.visible = k < 1;
    g3.position.y = G0 + (d.z || 0) + (d.kind === 'debris' ? -k * 2.8 : k * 2.6);
  });
  // window boards: on, or flying off
  ZM.windows.forEach((w, i) => {
    const B = Z3.boards[i]; if (!B) return;
    B.list.forEach((b, j) => {
      const on = j < w.boards, f = w.fall.find(q => q.i === j);
      if (f) { b.m.visible = true; const k = f.t / 1.2; b.m.position.set(0, b.y - k * k * 1.6, 0.9 * k * B.out); b.m.rotation.set(k * 2 * B.out, 0, b.rz + k * 1.5); }
      else { b.m.visible = on; b.m.position.set(0, b.y, 0); b.m.rotation.set(0, 0, b.rz); }
    });
  });
  // the chest
  const C = Z3.chest, B = ZM.box, S = ZM.spawns[B.at];
  if (C && S) {
    C.g.position.copy(z3v(S.x, S.y, G0 + S.z)); C.g.rotation.y = Math.atan2(S.ny, S.nx) - Math.PI / 2;
    const here = B.st !== 'gone';
    C.g.visible = here || B.t < 0.1;
    const open = B.st === 'spin' || B.st === 'offer' ? Math.min(1, B.t * 4) : B.st === 'gull' ? Math.max(0, 1 - B.t) : 0;
    C.lid.rotation.x = open * 1.9 * (B.st === 'offer' || B.st === 'gull' || B.st === 'spin' ? 1 : 0);
    C.shaft.visible = B.st === 'idle'; C.shaft.material.opacity = 0.75 + 0.25 * Math.sin(t * 2);
    C.light.intensity = (B.st === 'idle' ? 0.6 : 1.2) * (here ? 1 : 0);
    C.glow.visible = B.st === 'spin' || B.st === 'offer';
    // the weapon turning over above it
    const showing = B.st === 'spin' || B.st === 'offer';
    for (const id in Z3.wpn) Z3.wpn[id].visible = false;
    if (showing) {
      let w = Z3.wpn[B.show];
      if (w === undefined) { w = Z3.wpn[B.show] = z3Weapon(B.show); if (w) { w.scale.setScalar(1.35); C.show.add(w); } }
      if (w) {
        w.visible = true;
        const rise = B.st === 'spin' ? Math.min(1, B.t / 4) : 1 - Math.max(0, (B.t - 9) / 3) * 0.6;
        C.show.position.set(0, 0.8 + rise * 0.55, 0); C.show.rotation.set(0, B.st === 'spin' ? B.t * 3 : Math.PI / 2 + Math.sin(t) * 0.25, 0);
      }
    }
    // the gull: up out of the chest and away with it
    C.gull.visible = B.st === 'gull';
    if (C.gull.visible) { const k = B.t / 3; C.gull.position.set(Math.sin(k * 3) * 0.8, 0.8 + k * 5, -k * 2); C.gull.rotation.set(-0.3, k * 2, 0); C.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * Math.sin(t * 16) * 0.7; }); }
  }
  // salvage, bobbing and turning, blinking as it's about to go
  while (Z3.drops.length < ZM.drops.length) Z3.drops.push(null);
  const used = new Set();
  ZM.drops.forEach((d, i) => {
    let g3 = d.g3; if (!g3) { g3 = d.g3 = Z3.mk(d.k); }
    used.add(g3);
    g3.visible = d.t > 6 || Math.sin(d.t * 12) > 0;
    g3.position.copy(z3v(d.x, d.y, G0 + d.z + 1.0 + Math.sin(d.ph * 2) * 0.12)); g3.rotation.y = d.ph * 1.5;
  });
  for (const o of Z3.grp.children.slice()) if (o.userData.drop && !used.has(o)) Z3.grp.remove(o);
  for (const d of ZM.drops) d.g3.userData.drop = true;
  // the Light turns, once every twelve seconds, its beams sweeping out over the sea and through the rooms' windows
  if (Z3.lens) { Z3.lens.lens.rotation.y = reduceMotion ? 0.6 : -g.t * Math.PI * 2 / 12; Z3.lens.L.intensity = 2.0 + (reduceMotion ? 0 : 0.2 * Math.sin(g.t * 3)); }
  // the beam
  const Bm = Z3.beam, on = FPS.beamT > 0 && FPS.weapon === 'fresnel' && !(m.dead > 0);
  Bm.g.visible = on; Bm.L.intensity = on ? 2.4 : 0;
  if (on) {
    const len = FPS.beamLen || 10, h = m.h, p = m.p, ez = G0 + FPSC.EYE + (m.jz || 0) - (FPS.eyeLag || 0);
    const fx = Math.sin(h) * Math.cos(p), fy = Math.cos(h) * Math.cos(p), fz = Math.sin(p);
    const third = fpsThird();
    const ox = m.x + fx * 0.5 + Math.cos(h) * (third ? 0.25 : 0.1), oy = m.y + fy * 0.5 - Math.sin(h) * (third ? 0.25 : 0.1), oz = ez + fz * 0.5 - (third ? 0.3 : 0.12);
    Bm.g.position.copy(z3v(ox, oy, oz));
    Bm.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(fx, fz, -fy).normalize());
    const flick = reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 40);
    Bm.outer.scale.set(0.3 + len * 0.055, len, 0.3 + len * 0.055); Bm.core.scale.set(0.08 + len * 0.012, len * 0.9, 0.08 + len * 0.012);
    Bm.outer.material.opacity = 0.55 * flick; Bm.core.material.opacity = 0.95 * flick;
    Bm.L.position.copy(z3v(ox + fx * Math.min(len, 5), oy + fy * Math.min(len, 5), oz + fz * Math.min(len, 5)));
  }
  if (typeof zmp3d === 'function') zmp3d(dt);   // [pap] the bench
  if (typeof ze3d === 'function') ze3d(dt);   // [egg hook] src/zmegg.js
}
// painted over the 3D view: sparks between the burning, the chest's offer, and anyone down
function zmDrawOver() {
  if (ZM.net) for (const r of FPS.remote.values()) {
    if (!r.down || r.dead) continue;
    const c = cam(r.x, r.y, FPSC.GROUND + (r.tjz || 0) + 1.2); if (c.f < 0.8) continue;
    const q = proj(c), pulse = 0.6 + 0.4 * Math.sin(g.t * 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 13px "Courier Prime", monospace';
    ctx.fillStyle = `rgba(228,108,79,${pulse})`; ctx.fillText(`${r.n} is down`, q.x, q.y - 14);
    ctx.beginPath(); ctx.arc(q.x, q.y + 4, 6, 0, 6.283); ctx.fill();
  }
  for (const s of ZM.sparks) {
    const pts = []; for (let i = 0; i <= 6; i++) { const k = i / 6, j = i && i < 6 ? 0.25 : 0; pts.push([s.a[0] + (s.b[0] - s.a[0]) * k + (Math.random() - 0.5) * j, s.a[1] + (s.b[1] - s.a[1]) * k + (Math.random() - 0.5) * j, s.a[2] + (s.b[2] - s.a[2]) * k + (Math.random() - 0.5) * j]); }
    const p = polyProj(pts); if (p.length < 2) continue;
    ctx.strokeStyle = `rgba(${s.col || '255,220,140'},${s.t / (s.beam ? 0.14 : 0.25)})`; ctx.lineWidth = s.beam ? 3 : 2; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  if (typeof zmpDrawOver === 'function') zmpDrawOver();   // [pap]
  const B = ZM.box, S = ZM.spawns[B.at];
  if (S && B.st === 'offer') {
    const c = cam(S.x, S.y, FPSC.GROUND + S.z + 1.9);
    if (c.f > 0.8 && c.f < 25) { const q = proj(c); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `400 ${Math.round(clamp(q.s * 0.28, 12, 26))}px "IM Fell English SC", serif`; ctx.fillStyle = 'rgba(190,255,230,0.9)'; ctx.fillText(FPSW[B.item].n, q.x, q.y); }
  }
}
// the Classic renderer: just the doors still shut, as dark slabs (the drowned are painted as on the islands)
function zmDrawFlat() {
  for (const d of ZM.doors) {
    if (d.open) continue;
    const c = Math.cos(d.ang), s = Math.sin(d.ang), hw = d.w / 2, pts = [[d.x - c * hw, d.y - s * hw, FPSC.GROUND], [d.x + c * hw, d.y + s * hw, FPSC.GROUND], [d.x + c * hw, d.y + s * hw, FPSC.GROUND + 2.5], [d.x - c * hw, d.y - s * hw, FPSC.GROUND + 2.5]];
    fillPoly(pts, d.kind === 'debris' ? '#2a2018' : '#3a2a1c');
  }
}

// ---------- what you see on top ----------
function zmHud() {
  const m = FPS.me, phone = FPS.touch, t = g.t;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mono = px => `600 ${px}px "Courier Prime", monospace`, fell = px => `400 ${px}px "IM Fell English SC", serif`;
  const max = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
  // hurt: red creeping in from the edges, the more the closer to going down
  const hurt = clamp(1 - m.hp / max, 0, 1) * (m.dead > 0 ? 0 : 1);
  if (hurt > 0 || FPS.hurtT > 0) {
    const a = Math.min(0.85, hurt * 0.7 + (FPS.hurtT || 0) * 0.5), gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.25, cx, H / 2, Math.max(W, H) * 0.7);
    gr.addColorStop(0, 'rgba(140,10,8,0)'); gr.addColorStop(1, `rgba(140,10,8,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  if (m.protect > 0 && !ZM.over) { ctx.fillStyle = `rgba(200,220,255,${0.05 + 0.03 * Math.sin(t * 10)})`; ctx.fillRect(0, 0, W, H); }
  if (ZM.insta > 0) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, W, H); }
  // crosshair
  const cy = H / 2, w = fpsW();
  if (!(m.dead > 0)) {
    if (!(FPS.scoped && w.ads)) {
      ctx.strokeStyle = 'rgba(236,228,207,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
      if (w.beam) { ctx.arc(cx, cy, 9, 0, 6.283); }
      else { const gap = 5 + FPS.recoil * (w.climb ? 14 : 6); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(cx + dx * gap, cy + dy * gap); ctx.lineTo(cx + dx * (gap + 7), cy + dy * (gap + 7)); } }
      ctx.stroke();
    }
    if (typeof zmpHud === 'function') zmpHud(cx, cy);   // [pap] the Equinox Gale
    if (FPS.hitT > 0) { ctx.strokeStyle = FPS.hitHead ? 'rgba(255,90,60,0.95)' : 'rgba(255,240,200,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(cx + dx * 6, cy + dy * 6); ctx.lineTo(cx + dx * 13, cy + dy * 13); } ctx.stroke(); }
  }
  const L = Math.max(14, FPS.safeLeft || 0), R = W - Math.max(14, FPS.safeRight || 0), top = phone ? Math.max(10, FPS.safeTop || 0) : 14;
  // the round, bottom left: chalk tallies for the first five, then the number
  const rb = phone ? H * 0.36 : H - 22, rs = phone ? 0.7 : 1;
  ctx.save(); ctx.translate(L, rb); ctx.scale(rs, rs);
  const glowR = ZM.phase === 'break' ? 0.55 + 0.45 * Math.sin(t * 4) : 1;
  ctx.fillStyle = ctx.strokeStyle = `rgba(178,24,18,${glowR})`; ctx.lineCap = 'round';
  const r = ZM.round;
  if (r > 0 && r <= 5) {
    ctx.lineWidth = 6;
    for (let i = 0; i < Math.min(r, 4); i++) { ctx.beginPath(); ctx.moveTo(8 + i * 18, -6); ctx.lineTo(4 + i * 18, -60); ctx.stroke(); }
    if (r === 5) { ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(74, -48); ctx.stroke(); }
  } else if (r > 5) { ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = fell(64); ctx.fillText(String(r), 0, -2); }
  ctx.restore();
  // points, over it, with what you've just earned rising off them
  let py = rb - 74 * rs;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = mono(phone ? 18 : 22); ctx.fillStyle = 'rgba(236,228,207,0.95)';
  ctx.fillText(ZM.pts.toLocaleString('en'), L, py);
  for (const p of ZM.pops) { ctx.globalAlpha = Math.min(1, p.t * 1.5); ctx.font = mono(phone ? 12 : 14); ctx.fillStyle = p.v >= 60 ? '#ffd88a' : 'rgba(236,228,207,0.9)'; ctx.fillText('+' + p.v, L + (phone ? 140 : 190) + p.dx * 0.5, py - 8 - (1.1 - p.t) * 40); }
  ctx.globalAlpha = 1;
  // your health, over the points: a bar in as many parts as the knocks you can take, filling back up when you heal
  {
    const bw = phone ? 120 : 168, bh = phone ? 9 : 11, by = py - (phone ? 30 : 36), n = max, gap = 3, seg = (bw - gap * (n - 1)) / n;
    const hp = m.dead > 0 ? 0 : clamp(m.hp, 0, n), low = hp <= 1 && !(m.dead > 0);
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(L - 3, by - 3, bw + 6, bh + 6);
    for (let i = 0; i < n; i++) {
      const on = i < hp;
      ctx.fillStyle = on ? (low ? `rgba(228,${60 + 40 * Math.sin(t * 8)},50,0.95)` : hp < n ? '#e4a04f' : '#7ac46a') : 'rgba(80,70,60,0.6)';
      ctx.fillRect(L + i * (seg + gap), by, seg, bh);
    }
    ctx.font = mono(phone ? 9 : 10); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(236,228,207,0.65)';
    ctx.fillText(`HEALTH ${Math.ceil(hp)}/${n}`, L, by - 3);
    ctx.textBaseline = 'alphabetic';
  }
  // tonics drunk, over the health
  let px = L; py -= phone ? 34 : 42;
  for (const k of Object.keys(ZM_PERKS)) {
    if (!ZM.perks[k]) continue;
    const P = ZM_PERKS[k]; ctx.fillStyle = P.c; ctx.beginPath(); ctx.arc(px + 11, py - 36, 11, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#16120e'; ctx.font = mono(11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(P.n.split(' ').map(s => s[0]).join(''), px + 11, py - 35.5); px += 28;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  // salvage running: a timer each
  const run = [['double', ZM.double], ['spot', ZM.insta]].filter(a => a[1] > 0);
  run.forEach(([k, s], i) => {
    const x = cx + (i - (run.length - 1) / 2) * 120, y = H - (phone ? 120 : 70), blink = s > 5 || Math.sin(t * 14) > 0;
    if (!blink) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 11 : 13); ctx.fillStyle = ZM_DROPS[k].c; ctx.fillText(`${ZM_DROPS[k].n.toUpperCase()} ${Math.ceil(s)}`, x, y);
  });
  // your weapons and ammunition, bottom right
  if (!phone) {
    const by = H - 22;
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.font = mono(24);
    ctx.fillStyle = w.melee || m.ammo ? 'rgba(236,228,207,0.92)' : '#e46c4f';
    ctx.fillText(m.reload > 0 ? (w.melee ? 'WIPING' : 'RELOADING') : w.melee ? 'CUTLASS' : `${m.ammo} / ${ZM.res[FPS.weapon] || 0}`, R, by);
    ctx.font = mono(11); let wx = R;
    for (let i = ZM.own.length - 1; i >= 0; i--) { const id = ZM.own[i], lab = `${i + 1} ${(typeof zmpName === 'function' ? zmpName(id) : FPSW[id].n).toUpperCase()}`; ctx.fillStyle = id === FPS.weapon ? '#ffd88a' : 'rgba(236,228,207,0.4)'; ctx.fillText(lab, wx, by - 30); wx -= ctx.measureText(lab).width + 14; }
    if (!w.melee && (m.ammo === 0 || (m.ammo < w.mag && m.ammo <= Math.ceil(w.mag * 0.25))) && !(m.reload > 0) && !ZM.over) { ctx.textAlign = 'center'; ctx.font = mono(13); ctx.fillStyle = (ZM.res[FPS.weapon] || 0) > 0 ? 'rgba(236,228,207,0.8)' : '#e46c4f'; ctx.fillText((ZM.res[FPS.weapon] || 0) > 0 ? 'R TO RELOAD' : m.ammo ? 'LOW AMMUNITION' : 'NO AMMUNITION · V OR FIRE TO KNIFE', cx, cy + 46); }
  } else { zmPadState(); zmDrawStick(); }
  // together: everyone's points, down the right (yours lit), and anyone down marked
  let feedY = phone ? top + 48 : 16;
  if (ZM.net) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 12);
    const rows = ZM.hum.map(([sid, nick]) => { const me = sid === m.id, r = FPS.remote.get(sid); return { me, nick, pts: me ? ZM.pts : r ? r.pts || 0 : 0, down: me ? ZM.downT > 0 : r && r.down, out: me ? ZM.ghost : r && (r.dead || r.left) }; });
    rows.forEach((r, i) => { ctx.fillStyle = r.out ? 'rgba(236,228,207,0.3)' : r.down ? '#e46c4f' : r.me ? '#ffd88a' : 'rgba(236,228,207,0.75)'; ctx.fillText(`${r.nick}${r.down ? ' · DOWN' : r.out ? ' · out' : ''}  ${r.pts.toLocaleString('en')}`, R, feedY + i * (phone ? 13 : 16), W * 0.4); });
    feedY += rows.length * (phone ? 13 : 16) + 8;
  }
  // the feed, top right
  ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 12);
  FPS.feed.slice(phone ? -2 : -5).forEach((f, i) => { ctx.fillStyle = `rgba(236,228,207,${Math.min(1, f.t) * 0.85})`; ctx.fillText(f.text, R, feedY + i * (phone ? 13 : 17), W * (phone ? 0.5 : 0.45)); });
  if (typeof zbHud === 'function') zbHud(phone, top);   // [boss] his strength, top middle
  // the room you've come into
  if (ZM.zoneT > 0) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = fell(phone ? 16 : 22); ctx.fillStyle = `rgba(236,228,207,${Math.min(1, ZM.zoneT) * 0.8})`; const nm = zmZoneName(ZM.zone); ctx.fillText(nm.charAt(0).toUpperCase() + nm.slice(1), cx, phone ? top + 30 : 18); }
  // a round beginning, salvage taken
  if (ZM.banner) {
    const b = ZM.banner, a = Math.min(1, b.t, 4 - b.t);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(b.small ? (phone ? 22 : 30) : (phone ? 34 : 54));
    ctx.fillStyle = b.col ? b.col : `rgba(190,30,22,${Math.max(0, a)})`; ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillText(b.text, cx, H * 0.3); ctx.globalAlpha = 1;
  }
  if (ZM.phase === 'pre' && ZM.t > 0) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 11 : 13); ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText('They are coming up out of the sea…', cx, H * 0.3 + 40); }
  // what's in front of you
  const P = ZM.prompt;
  if (P && !(m.dead > 0)) {
    const key = phone ? 'USE' : FPS.padLast ? 'X' : 'F';
    const can = P.cost == null || ZM.pts >= P.cost;
    const text = P.hold ? `Hold ${key}: ${P.text.replace(/^Hold to /, '')}` : P.cost != null ? `${key}: ${P.text} — ${P.cost.toLocaleString('en')}` : P.free ? `${key}: ${P.text}` : P.text;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 12 : 15);
    const tw = ctx.measureText(text).width + 24, yy = H * (phone ? 0.6 : 0.64);
    ctx.fillStyle = 'rgba(8,10,14,0.6)'; ctx.fillRect(cx - tw / 2, yy - 15, tw, 30);
    ctx.fillStyle = can ? 'rgba(236,228,207,0.95)' : '#e46c4f'; ctx.fillText(text, cx, yy);
  }
  // the board: how the night's going
  if (FPS.board) {
    const rows = [['Round', ZM.round], ['Points', ZM.pts.toLocaleString('en')], ['Kills', ZM.kills], ['Through the head', ZM.heads], ['Doors opened', ZM.doorsOpened], ['Second winds', ZM.downs]];
    const bw = Math.min(380, W - 32), bh = 60 + rows.length * 24, bx = cx - bw / 2, by2 = H * 0.18;
    ctx.fillStyle = 'rgba(8,10,14,0.85)'; ctx.fillRect(bx, by2, bw, bh); ctx.strokeStyle = 'rgba(236,228,207,0.25)'; ctx.strokeRect(bx + 0.5, by2 + 0.5, bw - 1, bh - 1);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = fell(22); ctx.fillStyle = '#ffd88a'; ctx.fillText('The Lighthouse', bx + 14, by2 + 24);
    rows.forEach(([k, v], i) => { const yy = by2 + 58 + i * 24; ctx.font = mono(13); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText(k, bx + 14, yy); ctx.textAlign = 'right'; ctx.fillStyle = '#ffd88a'; ctx.fillText(String(v), bx + bw - 14, yy); });
  }
  // down, waiting for a friend; or out until the next round
  if (!ZM.over && (ZM.downT > 0 || ZM.ghost)) {
    ctx.fillStyle = 'rgba(30,4,4,0.35)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 24 : 34); ctx.fillStyle = '#e46c4f';
    ctx.fillText(ZM.ghost ? 'You bled out' : 'You’re down', cx, H * 0.42);
    ctx.font = mono(phone ? 11 : 13); ctx.fillStyle = 'rgba(236,228,207,0.85)';
    ctx.fillText(ZM.ghost ? 'You’ll be back when the next round begins.' : `${Math.ceil(ZM.downT)}s: someone can get you up by holding Use beside you.`, cx, H * 0.42 + 34);
  }
  if (ZM.over) { ctx.fillStyle = `rgba(20,2,2,${Math.min(0.6, ZM.over.t * 0.4)})`; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 28 : 40); ctx.fillStyle = `rgba(200,40,30,${Math.min(1, ZM.over.t)})`; ctx.fillText('They dragged you down', cx, H * 0.42); }
  if (!FPS.mouse && !phone && !FPS.menu && !ZM.over) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(12); ctx.fillStyle = 'rgba(236,228,207,0.6)'; ctx.fillText('Click to aim with the mouse', cx, H * 0.5 + 40); }
  if (typeof zeHud === 'function') zeHud();   // [egg hook] src/zmegg.js
}
// the walking stick, where your thumb came down (as on the islands), with its outer circle for running
function zmDrawStick() {
  if (!FPS.stick) return;
  const r0 = cv.getBoundingClientRect(), bx = FPS.stick.x0 - r0.left, by = FPS.stick.y0 - r0.top;
  ctx.strokeStyle = 'rgba(236,228,207,0.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 52, 0, 6.28); ctx.stroke();
  ctx.setLineDash([4, 6]); ctx.strokeStyle = FPS.stickRun ? 'rgba(255,216,138,0.55)' : 'rgba(236,228,207,0.16)'; ctx.beginPath(); ctx.arc(bx, by, 52 * 1.35, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
  const L = FPS.stick.L || 0, d = Math.hypot(FPS.stick.dx, FPS.stick.dy) || 1, k = L > 0.12 ? Math.min(1.6, L) * 52 / d : 0;
  ctx.fillStyle = FPS.stickRun ? 'rgba(255,216,138,0.4)' : 'rgba(236,228,207,0.3)'; ctx.beginPath(); ctx.arc(bx + FPS.stick.dx * k, by + FPS.stick.dy * k, 22, 0, 6.28); ctx.fill();
}
// the phone's buttons: ammunition on Fire, the weapon's name, Use lit when there's something to use
function zmPadState() {
  const m = FPS.me, w = fpsW(), set = (id, on, text) => { const el = $(id); if (!el) return; el.classList.toggle('on', !!on); if (text != null && el.dataset.t !== text) { el.dataset.t = text; const c = el.querySelector('.cnt'); if (c) c.textContent = text; } };
  // (nothing left at all: Fire is the knife)
  const dry = !w.melee && m.ammo <= 0 && !((ZM.res[FPS.weapon] || 0) > 0);
  set('fpsPadFire', (w.melee || m.ammo > 0 || dry) && !(m.reload > 0), m.reload > 0 ? '…' : w.melee || dry ? '⚔' : String(m.ammo));
  { const f = $('fpsPadFire').querySelector('small'); const lab = w.melee ? 'SWING' : dry ? 'KNIFE' : `/${ZM.res[FPS.weapon] || 0}`; if (f && f.textContent !== lab) f.textContent = lab; }
  set('fpsPadKnife', !((FPS.knifeT || 0) > 0) && !(m.dead > 0));
  { const b = $('fpsPadWeapon'); if (b) { const c = b.querySelector('.wn'); if (c && c.textContent !== w.n) c.textContent = w.n; } }
  { const b = $('fpsPadScope'); if (b) { b.hidden = !(w.scope || w.ads); b.classList.toggle('on', FPS.scoped); } }
  set('fpsPadLantern', m.lan); set('fpsPadView', FPS.third);
  set('fpsPadJump', !((m.jz || 0) > (m.fl || 0) + 0.02) && !(m.dead > 0));
  set('fpsPadReload', !w.melee && m.ammo < w.mag && !(m.reload > 0) && (ZM.res[FPS.weapon] || 0) > 0);
  set('fpsPadUse', !!ZM.near);
}

// ---------- controls ----------
const ZM_KEYS = { KeyF: () => zmUse(), KeyE: () => zmUse(), KeyV: () => zmKnife(), KeyB: null, Digit1: () => zmSlot(0), Digit2: () => zmSlot(1), Digit3: () => zmSlot(2), Digit4: null, Digit5: null, Digit6: null };
{
  const kn = $('fpsPadKnife');
  if (kn) kn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); zmKnife(); });
  const use = $('fpsPadUse');
  if (use) {
    use.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); FPS.touchUse = true; zmUse(); try { use.setPointerCapture(e.pointerId); } catch (err) {} });
    for (const ev of ['pointerup', 'pointercancel']) use.addEventListener(ev, () => { FPS.touchUse = false; });
  }
  $('zmPlay').addEventListener('click', zmStart);
  $('zmSettings').addEventListener('click', () => $('titleSettings').click());
  $('zmBanner').addEventListener('click', () => { $('zmTitle').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('zmPlay').focus({ preventScroll: true }), 400); });
  $('zmAgain').addEventListener('click', zmAgain);
  $('zmLeave').addEventListener('click', () => fpsStop());
  // the shared crates: the same buttons as on Wreckers' Night's card
  $('zmWcrate').addEventListener('click', () => $('wcrateBtn').click());
  $('zmOcrate').addEventListener('click', () => $('ocrateBtn').click());
  // your best, on the card
  setInterval(() => { const b = typeof BOARD !== 'undefined' && BOARD.mine && BOARD.mine.zm, el = $('zmRecord'); if (el && b) { const s = b.s ? `Your best: ${b.s} ${b.s === 1 ? 'round' : 'rounds'} held, and ${b.b} kills in one game.` : ''; if (el.textContent !== s) el.textContent = s; } }, 1500);
}
