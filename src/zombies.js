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
//  - The wreck chest: 950 points for whatever's in it. It sits in one of six places round the station, one of
//    them at the very top, in the lantern room beside the great lens; after a few goes a gull takes it, and it
//    turns up somewhere else.
//  - The Fresnel Lamp, only from the chest: a signal lantern with a lighthouse lens in it, that throws a beam of the
//    Light's own fire. Hold the trigger and the beam burns whatever stands in it to ash, and each one it burns
//    throws a spark to the next.
//  - Tonics on the shelves: Stout Heart (take twice the knocks), Quick Hands (reload in half the time), Fleet Foot
//    (quicker on your feet), Second Wind (get back up once when they drag you down) and Grog Ration (patched up in
//    half the time, and getting others up in half the time too).
//  - Salvage: now and then one of them drops something that floats, glowing: a Powder Keg (full ammunition), Double
//    Salvage (double points for half a minute), the Black Spot (anything dies to one hit, for half a minute) or a
//    Lamp Flash (every one of them in the station burns).
// The map: the keeper's station at the Light. You come ashore on the jetty out on the harbour (the drowned climb up
// its ladders out of the water), and up through the sea gate into the courtyard (with the Coal Store and the
// Signal Hut off it), open to the sky; from there a door into the station. Ten rooms round the tower: the Keeper's
// Quarters, the Oil Store, the Fog-Signal House, the East Passage, the Net Loft, the Store Hall, the Lamp Passage,
// the Boathouse, the Wreck Store, and the tower itself, with a stair winding up round its core to the lantern room
// at the top. Between the buildings, two walled yards the drowned come across.
// Built from the same props and solids as Wreckers' Night's islands (src/fpsisle.js), with a few new kinds of its
// own (floors, ceilings, stairs, doors). Unlike the islands, here some solids are floors: stairs and the tower's
// core can be walked up, and everything (you, the drowned, shots) knows how high it stands.
// The drowned find their way about on a grid laid over the station, by the shortest walk to you (opened doors
// change it). Weapon damage is scaled to the mode (the drowned get tougher every round), and kills count towards
// weapon and outfit crates as in Wreckers' Night, a little more slowly.
// Alone, for now: no network. Uses Wreckers' Night's engine (src/fps.js), which hands over to this file when FPS.zm.

const ZMC = {
  // (BODY: how close one of the drowned and you can come, middle to middle; SPRINT: your run here, a touch
  //  slower than on Wreckers' Night)
  BODY: 0.5, SPRINT: 9.8,
  // (PAD: how close your middle comes to a wall, a rail or the newel: a little under the drowned's 0.5 of old, so
  //  the stairs and doorways leave you room)
  PAD: 0.4,
  // (IFRAME_HIT: after a knock, how long before the next can land; IFRAME_UP: untouchable that long once got up)
  IFRAME_HIT: 0.5, IFRAME_UP: 3,
  RISE: 0.28, TREAD: 0.75, CEIL: 3.6, STEP: 0.6, START: 500, BREAK: 15, ALIVE: 24, NAV: 0.5, HP: 3, HP_STOUT: 6, BOX: 950,
};
// The tower: round, whitewashed with two red bands, fifteen metres wide inside and five floors high, a spiral stair
// of ninety steps round a stone newel up through the middle, one turn to a floor, and the lantern room of glass on
// top. Floors (heights above the ground): 0 the Tower Foot, 5, 10, 15, 20 two rooms each, 25 the lantern.
// (R0 to R1: the spiral's treads, out from the middle, round a newel NEWEL across; the stairwell's square hole is HOLE
// from the middle each way, so R1 stays a little inside it)
const ZMT = { X: 0, Y: 1.5, R: 10, TH: 0.6, N: 32, L: [0, 5, 10, 15, 20, 25], HOLE: 3.6, PER: 18, NEWEL: 0.6, R0: 0.65, R1: 3.52, GLASS: 6.5 };
ZMT.RISE = 5 / ZMT.PER;
ZMC.HT = ZMT.L[5];   // the lantern room's floor
// Over the lantern, the Roof Room: a windowless iron drum on the lantern's cornice under the red dome, its floor RF,
// RW the inside of its wall, RH high. An iron stair (ST) climbs round the inside of the glass to it, against the
// glass on the north side: N rises from the lantern's floor (the last is the Roof Room's floor), tread 1 at A0 and
// each DA further round (clockwise, from beside the west door to beside the east), R0 to R1 out from the newel. It
// comes up through SLOT, an opening in the Roof Room's floor along its wall (angles a0 to a1, from r out).
ZMT.RF = ZMT.L[5] + 5; ZMT.RW = 6.35; ZMT.RH = 3.3;
ZMT.ST = { N: 16, A0: 158 * Math.PI / 180, DA: 9 * Math.PI / 180, R0: 4.95, R1: 6.3, D: 1.0 };
ZMT.ST.RISE = (ZMT.RF - ZMT.L[5]) / ZMT.ST.N;
ZMT.SLOT = [26 * Math.PI / 180, 98 * Math.PI / 180, 4.8];
const ZM_TROOMS = { tower: 'the Tower Foot', tw1n: 'the Watch Room', tw1s: 'the Oil Room', tw2n: 'the Chart Room', tw2s: 'the Bunk Room',
  tw3n: 'the Clock Room', tw3s: 'the Lamp-Wright’s Store', tw4n: 'the Service Room', tw4s: 'the Keeper’s Study', top: 'the Lantern Room', roof: 'the Roof Room' };
const ZM = { on: false, own: ['pepperbox'], res: {}, pts: 0, round: 0, items: [], z: [], drops: [], perks: {}, fx: [] };
// what each weapon carries in reserve, and how much harder it hits the drowned than a wrecker
const ZM_AMMO = { pepperbox: 60, blunderbuss: 28, longarm: 36, harpoon: 30, avtomat: 225, cutlass: 0, fresnel: 240 };
const ZM_DMG = { p: 1, b: 2, l: 4, h: 10, c: 2.5, a: 1.15, f: 1, k: 1 };
// how a weapon loads here, where it differs from Wreckers' Night (FPSW is shared, and left as it is there): the
// blunderbuss takes a heavier charge of shot in a wider cone. Each ball is its own hit (and can find a different one
// of them), at full weight out to near, falling away to far (times ZM_DMG) by ZM_FALL; a harpoon that kills goes on
// through, into up to thru more
const ZM_SHOT = { b: { pellets: 15, spread: 0.15, near: 6, far: 24, min: 0.15 } };
const ZM_HARPOON_THRU = 4;
// (a ball's weight at d metres: whole to near, then down in a line to min at far, and no less)
const ZM_FALL = (code, d) => { const o = ZM_SHOT[code]; return o && o.far ? clamp(1 - (d - o.near) / (o.far - o.near) * (1 - o.min), o.min, 1) : 1; };
// the knife: always to hand, never runs out (V, middle mouse, R3, the knife button; or Fire with nothing left to fire)
// boarding windows pays 10 a board, up to this many points a round for each player (then the boards are free work)
const ZM_BOARD_CAP = 500;
const ZM_KNIFE = { reach: 2.1, arc: 0.95, dmg: 3, rate: 0.55 };
// down on the floor (together): how long before you bleed out, how long a friend holds Use to get you up, how fast
// you can drag yourself along, how far your eyes drop, and the reserve of the pepperbox you hold while you're down
const ZM_DOWN = { T: 45, REV: 3, CRAWL: 0.6, EYE: 1.15, RES: 12, UP: 2.5, NOTE: 4 };
// how long it takes me to get someone up: half the time with the Grog Ration in me
const zmRevTime = () => ZM_DOWN.REV * (ZM.perks && ZM.perks.grog ? 0.5 : 1);
const ZM_PIERCE = { l: 3 };
const ZM_PERKS = {
  stout: { n: 'Stout Heart', cost: 2500, c: '#e0504a', what: 'take twice the knocks' },
  quick: { n: 'Quick Hands', cost: 3000, c: '#5ac87a', what: 'reload in half the time' },
  fleet: { n: 'Fleet Foot', cost: 2000, c: '#e8c050', what: 'quicker on your feet' },
  wind: { n: 'Second Wind', cost: 500, c: '#6aa8f0', what: 'get back up once' },
  grog: { n: 'Grog Ration', cost: 1500, c: '#d8903a', what: 'patched up, and get others up, in half the time' },
};
// how each tonic's cabinet is dressed (FPI_K.tonic, and its plate and bubbles in zm3dBuild): its wood or iron and
// trim, the bottles on its shelves, the crest over it and the emblem on that, what's on its lower doors
//   Stout Heart: a riveted cast-iron safe of a thing, brass bound, a heart on a gothic crest, round flasks
//   Quick Hands: mahogany, a clock dial and a crank, a gear on a pediment, slim vials
//   Fleet Foot: ivory paint on turned legs, gilt, wings on a stepped crest, tall tapered phials
//   Second Wind: sea-green paint and nickel, a lifebuoy on a gothic crest, a barometer and a speaking horn, bulbs
//   Grog Ration: a cask of a cabinet, staves and iron hoops, a little keg on its pediment, stoneware jugs
const ZM_TONIC = {
  stout: { body: '#34363b', body2: '#24262a', trim: '#a8843a', bottle: 'flask', crest: 'arch', emb: 'heart', low: 'rivets', dial: 'gauge', side: 'crank' },
  quick: { body: '#6a2e20', body2: '#4a2018', trim: '#b08a3c', bottle: 'vial', crest: 'tri', emb: 'gear', low: 'panels', dial: 'clock', side: 'crank' },
  fleet: { body: '#d8d0bc', body2: '#9a8e74', trim: '#d0a848', bottle: 'cone', crest: 'step', emb: 'wings', low: 'legs', dial: 'gauge', side: 'crank' },
  wind: { body: '#2e5258', body2: '#203a40', trim: '#b8bab4', bottle: 'bulb', crest: 'arch', emb: 'buoy', low: 'panels', dial: 'baro', side: 'horn' },
  grog: { body: '#4a3220', body2: '#32221a', trim: '#2a2c30', bottle: 'jug', crest: 'tri', emb: 'cask', low: 'staves', dial: 'gauge', side: 'tap2' },
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
  // the way up from the sea: the jetty you land on (its pier and the T-head out on the water, r2), the courtyard
  // inside the sea wall, and its two small rooms. Open to the sky (sky: no floor or ceiling laid by room())
  dock: { n: 'the Jetty', r: [-3.3, 3.3, -60, -39.3], r2: [-12.3, 12.3, -66.3, -60], sky: true },
  yard: { n: 'the Courtyard', r: [-13, 13, -39, -21], sky: true },
  coal: { n: 'the Coal Store', r: [-21, -13, -37, -29], floor: 'flags', wall: null },
  shed: { n: 'the Signal Hut', r: [13, 21, -37, -29], floor: 'boards', wall: null },
};
// the jetty and the courtyard (relative to the island's middle): the deck's height over the ground, where you come
// ashore, and the sea wall's line. South of the shore (ZM_SHORE) the island lies under the harbour's water: nobody
// walks there, the drowned wade up out of it (zmSeaDepth: how deep the seabed lies under the water there)
const ZMD = { TOP: 0.9, START: [0, -56.5], WATER: 0.13 };
// (a map can draw its own shore: ZM_MAPS[..].shore)
const ZM_SHORE0 = lx => -41.5 + Math.max(0, Math.abs(lx) - 22) * 0.4;
const ZM_SHORE = lx => ((typeof ZM_MAPS !== 'undefined' && ZM_MAPS[ZM_MAP] && ZM_MAPS[ZM_MAP].shore) || ZM_SHORE0)(lx);
function zmSeaDepth(x, y) {
  if (!(FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.bay)) return 0;
  const lx = x - FPSC.CX, ly = y - FPSC.CY;
  return clamp((ZM_SHORE(lx) - ly) * 0.6, 0, 2.2);
}
// out on the open air (the jetty, the courtyard), or under a roof?
function zmOutdoors(x, y, z) { const k = zmZoneAt(x, y, z); return !!(k && ZM_ZONES[k] && ZM_ZONES[k].sky) || (!k && !(zmTower() && Math.hypot(x - FPSC.CX - ZMT.X, y - FPSC.CY - ZMT.Y) < ZMT.R)); }
const ZM_TC = [ZMT.X, ZMT.Y];   // the middle of the tower

// ---------- the maps ----------
// Two places to hold the night in: the Lighthouse (the keeper's station, above) and Wrackhaven, a fishing village the
// sea took back (FPI_GEN.wrack, below). ZM_MAP is the one being played. zmUseMap swaps its rooms into ZM_ZONES and its
// landing into ZMD before the arena is laid out, so everything that asks which room a place is in, or where you come
// ashore, asks the map being played. The tower (its floors, the lantern, the Roof Room and the Light's lever) and the
// Easter egg belong to the Lighthouse alone. The pick on the card is kept on the device (ZM_PICK); together, the
// host's pick goes out with the start of the night (src/zmnet.js), and everyone lays out the same place.
var ZM_MAP = 'light';
const ZM_MAPS = {
  light: { n: 'the Lighthouse', N: 'The Lighthouse', isle: 'light', tower: true, noBox: ['hermit'], zones: Object.assign({}, ZM_ZONES), start: [0, -56.5], top: 0.9, seed: 0x11947,
    blurb: 'The keeper\u2019s station at the Light: a tower five floors high, the lantern at its top.',
    land: n => `The boat leaves you on the jetty below the Light${n ? ', ' + n + ' of you' : ''}. Up through the sea gate, and hold the Light.` },
  wrack: { n: 'Wrackhaven', N: 'Wrackhaven', isle: 'wrack', tower: false, noBox: ['fresnel'], start: [0, -49], top: 0.45, seed: 0x3a71d,
    blurb: 'A fishing village the sea took back: the quay, Fish Street, the houses round the Square, and the town hall in the middle of it, three floors up to the Belfry.',
    land: n => `The boat leaves you on the quay at Wrackhaven${n ? ', ' + n + ' of you' : ''}. Up through the harbour gate, and hold the village.`,
    // (the harbour's edge, further out than at the Lighthouse; the grid the drowned walk by, over the whole village)
    shore: lx => -45 + Math.max(0, Math.abs(lx) - 48) * 0.5, nav: [-44, 44, -57, 46],
    // [x0, x1, y0, y1] relative to the island's middle, as ZM_ZONES; the sea to the south, as at the Lighthouse. The
    // town hall's rooms come first (whichever matches first is the room you're in), each with zr, the height of its
    // floor and of the one above: the Belfry at the top, the two rooms of the first floor, then the ground floor's
    // two. Round the hall the Square, and round that a ring of houses, Fish Street running down from it to the quay.
    zones: {
      belfry: { n: 'the Belfry', r: [-3.5, 3.5, 7, 13], zr: [8.8, 99] },
      records: { n: 'the Records Room', r: [-11, 11, -9, 1], zr: [4.4, 8.8] },
      council: { n: 'the Council Chamber', r: [-11, 11, 1, 13], zr: [4.4, 8.8] },
      moot: { n: 'the Moot Hall', r: [-11, 11, -9, 7], zr: [0, 4.4], floor: 'flags', wall: '#c8c0aa' },
      clerk: { n: 'the Clerk\u2019s Office', r: [-11, 11, 7, 13], zr: [0, 4.4], floor: 'boards', wall: '#b8ae96' },
      dock: { n: 'the Quay', r: [-22, 22, -55, -42.25], sky: true },
      street: { n: 'Fish Street', r: [-4, 4, -42, -16], sky: true },
      square: { n: 'the Square', r: [-18, 18, -16, 20], sky: true },
      chandler: { n: 'the Chandlery', r: [-18, -4, -42, -16], floor: 'boards', wall: '#b8ae96' },
      market: { n: 'the Fish Market', r: [4, 18, -42, -16], floor: 'flags', wall: '#a8a898' },
      smoke: { n: 'the Smokehouse', r: [-42, -18, -42, -16], floor: 'flags', wall: '#8e8272' },
      cooper: { n: 'the Cooperage', r: [18, 42, -42, -16], floor: 'boards', wall: '#a49680' },
      inn: { n: 'the Drowned Man', r: [-42, -18, -16, 6], floor: 'boards', wall: '#b09a80' },
      kitchen: { n: 'the Inn Kitchen', r: [-42, -18, 6, 20], floor: 'flags', wall: '#b4a690' },
      chapel: { n: 'the Seamen\u2019s Chapel', r: [18, 42, -16, 12], floor: 'flags', wall: '#c4beae' },
      vestry: { n: 'the Vestry', r: [18, 42, 12, 20], floor: 'boards', wall: '#bcb4a0' },
      byard: { n: 'the Boatyard', r: [-42, -18, 20, 44], sky: true },
      forge: { n: 'the Forge', r: [-18, 0, 20, 44], floor: 'flags', wall: '#8a8274' },
      school: { n: 'the School House', r: [0, 18, 20, 44], floor: 'boards', wall: '#c0b69e' },
      yard: { n: 'the Churchyard', r: [18, 42, 20, 44], sky: true },
    } },
};
const ZM_MAP_IDS = Object.keys(ZM_MAPS);
// the map picked on the card (kept on the device)
var ZM_PICK = 'light';
try { const v = localStorage.getItem('skerry-zm-map'); if (v && ZM_MAPS[v]) ZM_PICK = v; } catch (e) {}
function zmPickMap(id) { if (!ZM_MAPS[id]) return; ZM_PICK = id; try { localStorage.setItem('skerry-zm-map', id); } catch (e) {} zmMapCard(); if (typeof ZN !== 'undefined' && ZN.code && typeof znSendLobby === 'function') znSendLobby(); if (typeof znRender === 'function') znRender(); }
function zmUseMap(id) {
  const k = ZM_MAPS[id] ? id : 'light', D = ZM_MAPS[k]; ZM_MAP = k;
  for (const z of Object.keys(ZM_ZONES)) delete ZM_ZONES[z];
  Object.assign(ZM_ZONES, D.zones);
  ZMD.START = D.start.slice(); ZMD.TOP = D.top;
  return D;
}
const zmTower = () => !!ZM_MAPS[ZM_MAP].tower;
// the picker on the card: which is chosen, and what it is
function zmMapCard() {
  for (const b of document.querySelectorAll('#zmMaps [data-map]')) b.setAttribute('aria-pressed', String(b.dataset.map === ZM_PICK));
  const d = $('zmMapNote'); if (d) d.textContent = ZM_MAPS[ZM_PICK].blurb;
  const pl = $('zmPlay'); if (pl) pl.textContent = ZM_PICK === 'light' ? 'Hold the Light' : 'Hold ' + ZM_MAPS[ZM_PICK].N;
}

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
  // a tonic cabinet (one for each tonic, dressed by ZM_TONIC): a plinth, lower doors with a tap, a dial and a crank,
  // a glass case of glowing bottles round a bubbling column, a cornice with a lamp and a steam pipe, and a crest with
  // the tonic's emblem. Its front is -v. (Its enamel name plate, the glass, the glow and the bubbles: zm3dBuild)
  tonic: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, 0, 0.65, 0.32, 2.1)]; },
    b3(p, A) {
      const S = ZM_TONIC[p.pk] || ZM_TONIC.stout, c = p.c, B = S.body, B2 = S.body2, T = S.trim, BR = '#a8843a', CU = '#a8603a';
      const mx = (a, b, k) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
      const lt = mx(c, '#ffffff', 0.5), dk = mx(c, '#000000', 0.35), blk = mx(B2, '#000000', 0.55), F = Math.PI / 2;
      // a disc facing the front (centre u, h; radius r; just in front of v)
      const face = (col, u, h, v, r, into) => A.part('cyl8', col, u, v, h, r * 2, 0.02, r * 2, 0, F, 0, into);
      // ---- the base: a plinth (or, Fleet Foot, turned legs), the lower doors
      const z0 = S.low === 'legs' ? 0.3 : 0.14;
      if (S.low === 'legs') {
        for (const su of [-1, 1]) for (const sv of [-1, 1]) { A.cyl(B2, su * 0.56, sv * 0.22 + 0.02, -0.1, 0.045, 0.42, 0, 0, 0, 'cyl6'); A.cyl(T, su * 0.56, sv * 0.22 + 0.02, 0.02, 0.05, 0.03, 0, 0, 0, 'cyl6'); A.part('sph', B2, su * 0.56, sv * 0.22 + 0.02, 0.2, 0.12, 0.08, 0.12); }
        A.box(B2, 0, 0.02, 0.1, 1.1, 0.04, 0.03); A.box(B2, 0, 0.02, 0.22, 1.24, 0.56, 0.08);
      } else {
        A.box(B2, 0, 0.01, -0.1, 1.32, 0.62, 0.24); A.box(T, 0, -0.302, 0.03, 1.3, 0.02, 0.05);
      }
      A.box(B, 0, 0.02, z0, 1.26, 0.56, 0.96 - z0);
      for (const s of [-1, 1]) A.box(T, s * 0.615, -0.25, z0, 0.045, 0.045, 0.96 - z0);
      const ph = 0.96 - z0 - 0.16;   // (the doors' height)
      if (S.low === 'staves') {
        // a cask's staves across the front, two iron hoops, a brass bung
        for (let i = 0; i < 9; i++) A.box(i % 2 ? B : B2, -0.52 + i * 0.13, -0.27 - 0.012 * Math.sin(i / 8 * Math.PI), z0 + 0.04, 0.122, 0.03, 0.96 - z0 - 0.08);
        for (const h of [z0 + 0.14, 0.82]) { A.box(T, 0, -0.295, h, 1.22, 0.02, 0.05); for (let i = 0; i < 7; i++) A.box('#5a5c60', -0.48 + i * 0.16, -0.307, h + 0.015, 0.02, 0.01, 0.02); }
      } else {
        for (const s of [-1, 1]) {
          A.box(B2, s * 0.3, -0.265, z0 + 0.08, 0.52, 0.02, ph); A.box(B, s * 0.3, -0.275, z0 + 0.12, 0.44, 0.02, ph - 0.08);
          if (S.low !== 'rivets') A.box(T, s * 0.3, -0.288, z0 + 0.12 + ph - 0.1, 0.3, 0.008, 0.012);
        }
        if (S.low === 'rivets') {
          // boiler plate: rows of rivets round the doors, and an iron strap across
          for (const h of [z0 + 0.04, 0.9]) for (let i = 0; i < 11; i++) A.part('cyl6', '#6a6c70', -0.55 + i * 0.11, -0.272, h, 0.03, 0.02, 0.03, 0, F, 0);
          A.box('#1c1e22', 0, -0.285, z0 + ph * 0.5 + 0.04, 1.2, 0.02, 0.06);
          for (let i = 0; i < 6; i++) A.part('cyl6', BR, -0.5 + i * 0.2, -0.3, z0 + ph * 0.5 + 0.07, 0.03, 0.02, 0.03, 0, F, 0);
        }
      }
      // the tap, in the middle, over a little brass grate
      A.box(BR, 0, -0.27, 0.72, 0.1, 0.04, 0.12); A.log(BR, 0, -0.33, 0.78, 0.022, 0.12, F); A.cyl(BR, 0, -0.39, 0.66, 0.022, 0.12, 0, 0, 0, 'cyl6');
      A.box(BR, 0, -0.39, 0.86, 0.1, 0.02, 0.02); A.cyl(BR, 0, -0.39, 0.79, 0.012, 0.07, 0, 0, 0, 'cyl6');
      A.part('sph', c, 0, -0.39, 0.635, 0.03, 0.04, 0.03, 0, 0, 0, 'glow');
      A.box(BR, 0, -0.33, z0 + 0.06, 0.18, 0.1, 0.02); A.box(blk, 0, -0.33, z0 + 0.075, 0.14, 0.08, 0.01);
      // the dial on the left door: a pressure gauge, a clock (twelve marks), or a barometer (bigger, with a pointer)
      {
        const u = -0.3, h = 0.58, r = S.dial === 'baro' ? 0.14 : 0.11;
        face(BR, u, h, -0.29, r + 0.02); face(S.dial === 'clock' ? '#d8cca8' : '#c8c0a0', u, h, -0.305, r, 'glow');
        if (S.dial === 'clock') for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; A.box('#2a2622', u + Math.sin(a) * r * 0.8, -0.318, h + Math.cos(a) * r * 0.8 - 0.01, 0.012, 0.004, 0.025, 0, 0, -a); }
        else for (let i = 0; i < 5; i++) { const a = -1.1 + i * 0.55; A.box(i === 4 ? '#a02a20' : '#2a2622', u + Math.sin(a) * r * 0.78, -0.318, h + Math.cos(a) * r * 0.78 - 0.01, 0.01, 0.004, 0.022, 0, 0, -a); }
        A.box('#1a1614', u + 0.03, -0.322, h - 0.005, 0.012, 0.004, r * 0.8, 0, 0, -0.7); A.box('#1a1614', u - 0.01, -0.322, h - 0.005, 0.01, 0.004, r * 0.55, 0, 0, 2.3);
        A.part('sph', BR, u, -0.325, h, 0.025, 0.025, 0.012);
      }
      // the right door: a crank, a speaking horn, or a second tap on its barrel
      {
        const u = 0.3, h = 0.58;
        if (S.side === 'crank') {
          face(BR, u, h, -0.29, 0.07); A.box(BR, u + 0.07, -0.31, h - 0.03, 0.18, 0.025, 0.05, 0, 0, -0.6);
          A.log(B2, u + 0.14, -0.36, h + 0.09, 0.022, 0.1, F, 0, 'cyl6'); A.part('sph', BR, u, -0.31, h, 0.05, 0.05, 0.04);
        } else if (S.side === 'horn') {
          face(T, u, h, -0.29, 0.07); A.part('cone', T, u, -0.36, h, 0.17, 0.14, 0.17, 0, -F, 0); A.part('cyl8', '#141210', u, -0.432, h, 0.15, 0.005, 0.15, 0, F, 0);
          A.part('torus', BR, u, -0.43, h, 0.34, 0.34, 0.5, 0, 0, 0);
        } else {
          A.cyl('#6a4628', u, -0.3, h - 0.1, 0.12, 0.2, 0, F, 0); for (const k of [-1, 1]) A.cyl(T, u, -0.3 + k * 0.07, h - 0.0125, 0.125, 0.025, 0, F, 0);
          A.log(BR, u, -0.39, h - 0.02, 0.02, 0.1, F); A.cyl(BR, u, -0.44, h - 0.1, 0.018, 0.09, 0, 0, 0, 'cyl6'); A.box(BR, u, -0.44, h + 0.02, 0.09, 0.02, 0.02);
        }
      }
      // ---- the counter, and the glass case on it
      A.box(B2, 0, 0.01, 0.96, 1.34, 0.62, 0.06); A.box(T, 0, -0.305, 0.96, 1.34, 0.02, 0.06);
      A.box(blk, 0, 0.25, 1.02, 1.14, 0.04, 0.84);                                                   // (the back, dark)
      for (const s of [-1, 1]) { A.box(B, s * 0.6, 0.02, 1.02, 0.1, 0.56, 0.84); A.box(T, s * 0.555, -0.265, 1.02, 0.03, 0.03, 0.84); }
      A.box(T, 0, -0.265, 1.02, 1.14, 0.03, 0.03); A.box(T, 0, -0.265, 1.83, 1.14, 0.03, 0.03);
      A.box(T, -0.27, -0.27, 1.02, 0.015, 0.015, 0.84); A.box(T, 0.27, -0.27, 1.02, 0.015, 0.015, 0.84);   // (the glazing bars)
      A.box(B2, 0, 0.03, 1.4, 1.1, 0.44, 0.03); A.box(T, 0, -0.195, 1.4, 1.1, 0.015, 0.035);
      // the bottles: six on each shelf, either side of the column
      for (const h0 of [1.02, 1.43]) for (const u of [-0.47, -0.35, -0.21, 0.21, 0.35, 0.47]) {
        const v = -0.05 + (A.r() - 0.5) * 0.08, k = 0.9 + A.r() * 0.2, liq = A.r() < 0.3 ? lt : c;
        if (S.bottle === 'flask') { A.part('sph', liq, u, v, h0 + 0.085, 0.15, 0.15, 0.15, 0, 0, 0, 'glow'); A.cyl(liq, u, v, h0 + 0.14, 0.022, 0.08, 0, 0, 0, 'cyl6'); A.cyl(BR, u, v, h0 + 0.22, 0.028, 0.03, 0, 0, 0, 'cyl6'); }
        else if (S.bottle === 'vial') { A.cyl(liq, u, v, h0, 0.03, 0.3 * k, 0, 0, 0, 'cyl6'); A.cyl('#6a4a2a', u, v, h0 + 0.3 * k, 0.026, 0.035, 0, 0, 0, 'cyl6'); A.cyl(BR, u, v, h0 + 0.02, 0.034, 0.02, 0, 0, 0, 'cyl6'); }
        else if (S.bottle === 'cone') { A.part('cone', liq, u, v, h0 + 0.13 * k, 0.12, 0.26 * k, 0.12, 0, 0, 0, 'glow'); A.cyl(T, u, v, h0 + 0.26 * k, 0.015, 0.06, 0, 0, 0, 'cyl6'); A.part('sph', T, u, v, h0 + 0.33 * k, 0.04, 0.04, 0.04); }
        else if (S.bottle === 'bulb') { A.part('sph', liq, u, v, h0 + 0.07, 0.13, 0.12, 0.13, 0, 0, 0, 'glow'); A.cyl(liq, u, v, h0 + 0.12, 0.018, 0.14 * k, 0, 0, 0, 'cyl6'); A.cyl(T, u, v, h0 + 0.12 + 0.14 * k, 0.024, 0.025, 0, 0, 0, 'cyl6'); }
        else { A.cyl('#b8ad90', u, v, h0, 0.06, 0.2 * k, 0, 0, 0, 'cyl8'); A.cyl(liq, u, v - 0.003, h0 + 0.08 * k, 0.062, 0.05, 0, 0, 0, 'cyl8'); A.cyl('#8a7a5a', u, v, h0 + 0.2 * k, 0.025, 0.05, 0, 0, 0, 'cyl6'); A.box('#8a7e64', u + 0.06, v, h0 + 0.08, 0.02, 0.02, 0.1); }
        if ((S.bottle === 'flask' || S.bottle === 'bulb') && A.r() < 0.5) A.box('#d8ccaa', u, v - 0.078, h0 + 0.045, 0.06, 0.004, 0.05);   // (a paper label)
      }
      // the column in the middle: the tonic itself, standing in glass between brass caps, bubbling (bubbles: zm3dBuild)
      A.cyl(BR, 0, -0.02, 1.02, 0.1, 0.07, 0, 0, 0, 'cyl8'); A.cyl(BR, 0, -0.02, 1.76, 0.1, 0.07, 0, 0, 0, 'cyl8');
      A.part('cyl8', c, 0, -0.02, 1.34, 0.14, 0.5, 0.14, 0, 0, 0, 'glow'); A.part('cyl8', lt, 0, -0.02, 1.59, 0.142, 0.015, 0.142, 0, 0, 0, 'glow');
      A.cyl(mx(c, '#000000', 0.7), 0, -0.02, 1.6, 0.07, 0.16, 0, 0, 0, 'cyl8');
      for (const h of [1.2, 1.5]) A.cyl(BR, 0, -0.02, h, 0.082, 0.025, 0, 0, 0, 'cyl8');
      A.cyl(CU, 0, -0.02, 1.83, 0.025, 0.12, 0, 0, 0, 'cyl6');
      // ---- the cornice: a lamp on the left, a steam pipe and its valve on the right, the pipe down the back corner
      A.box(B2, 0, 0.01, 1.86, 1.36, 0.62, 0.06); A.box(B, 0, 0.01, 1.92, 1.3, 0.58, 0.08); A.box(T, 0, -0.282, 1.94, 1.3, 0.02, 0.03);
      for (let i = 0; i < 9; i++) A.box(B2, -0.6 + i * 0.15, -0.3, 1.88, 0.05, 0.03, 0.04);                // (dentils)
      A.cyl(BR, -0.5, -0.12, 2.0, 0.07, 0.04, 0, 0, 0, 'cyl8'); A.cyl(lt, -0.5, -0.12, 2.04, 0.04, 0.13, 0, 0, 0, 'cyl6');
      A.part('cyl6', mx(c, '#fff4d8', 0.7), -0.5, -0.12, 2.1, 0.06, 0.08, 0.06, 0, 0, 0, 'glow');
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.78; A.box('#1e1c1a', -0.5 + Math.cos(a) * 0.055, -0.12 + Math.sin(a) * 0.055, 2.03, 0.012, 0.012, 0.16); }
      A.part('cone', BR, -0.5, -0.12, 2.24, 0.15, 0.08, 0.15); A.part('torus', BR, -0.5, -0.12, 2.32, 0.08, 0.08, 0.2, 0, 0, 0);
      A.cyl(CU, 0.57, 0.15, 2.0, 0.03, 0.3, 0, 0, 0, 'cyl6'); A.part('sph', CU, 0.57, 0.15, 2.3, 0.07, 0.07, 0.07);
      A.part('torus', '#8a2a20', 0.57, 0.15, 2.36, 0.14, 0.14, 0.4, 0, F, 0); A.cyl(BR, 0.57, 0.15, 2.3, 0.012, 0.08, 0, 0, 0, 'cyl6');
      A.cyl(BR, 0.57, 0.15, 2.12, 0.05, 0.06, 0, 0, 0, 'cyl8'); A.part('cyl8', '#c8c0a0', 0.57, 0.1, 2.15, 0.08, 0.01, 0.08, 0, F, 0, 'glow');
      // ---- the crest, with the emblem on it (the name plate goes across its foot)
      const cv = 0.05;
      A.box(B, 0, cv, 2.0, 1.0, 0.1, 0.24); A.box(T, 0, cv - 0.052, 2.0, 1.0, 0.01, 0.02); A.box(T, 0, cv - 0.052, 2.22, 1.0, 0.01, 0.02);
      for (const s of [-1, 1]) A.part('sph', T, s * 0.5, cv, 2.24, 0.08, 0.08, 0.08);
      if (S.crest === 'arch') { A.part('cyl8', B, 0, cv, 2.22, 0.92, 0.08, 0.66, 0, F, 0); A.part('cyl8', T, 0, cv + 0.005, 2.22, 0.98, 0.07, 0.71, 0, F, 0); A.part('sph', T, 0, cv, 2.58, 0.08, 0.08, 0.08); }
      else if (S.crest === 'tri') { A.part('tri', T, 0, cv + 0.005, 2.35, 1.24, 0.07, 0.56, 0, -F, 0); A.part('tri', B, 0, cv, 2.34, 1.12, 0.08, 0.5, 0, -F, 0); A.part('cone', T, 0, cv, 2.58, 0.06, 0.1, 0.06); }
      else { A.box(B, 0, cv, 2.24, 0.72, 0.09, 0.14); A.box(T, 0, cv - 0.048, 2.37, 0.72, 0.01, 0.02); A.box(B, 0, cv, 2.38, 0.42, 0.09, 0.14); A.box(T, 0, cv, 2.52, 0.46, 0.1, 0.025); }
      // the emblem
      const eh = 2.38, ev = cv - 0.06;
      if (S.emb === 'heart') {
        A.part('torus', T, 0, ev + 0.01, eh, 0.34, 0.34, 0.6, 0, 0, 0);
        for (const s of [-1, 1]) A.part('sph', c, s * 0.04, ev, eh + 0.025, 0.1, 0.1, 0.05, 0, 0, 0, 'glow');
        A.box(c, 0, ev, eh - 0.08, 0.1, 0.05, 0.1, 0, 0, Math.PI / 4); A.part('box', c, 0, ev, eh - 0.03, 0.1, 0.1, 0.05, 0, 0, Math.PI / 4, 'glow');
      } else if (S.emb === 'gear') {
        A.part('torus', BR, 0, ev, eh, 0.3, 0.3, 0.8, 0, 0, 0);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; A.box(BR, Math.cos(a) * 0.16, ev, eh + Math.sin(a) * 0.16 - 0.02, 0.04, 0.04, 0.04, 0, 0, -a); }
        A.part('cyl8', c, 0, ev + 0.005, eh, 0.18, 0.03, 0.18, 0, F, 0, 'glow');
        A.box('#1a1614', 0, ev - 0.02, eh, 0.012, 0.01, 0.08, 0, 0, 0); A.box('#1a1614', 0.02, ev - 0.02, eh, 0.012, 0.01, 0.055, 0, 0, -1.6);
      } else if (S.emb === 'wings') {
        A.part('sph', c, 0, ev, eh, 0.12, 0.12, 0.06, 0, 0, 0, 'glow'); A.part('torus', T, 0, ev, eh, 0.14, 0.14, 0.5, 0, 0, 0);
        // (a wing either side: five feathers fanning up from the hub, the topmost lit)
        for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const th = -0.15 + i * 0.27, L = 0.3 - i * 0.04; A.part('box', i === 4 ? c : T, s * (0.06 + L / 2 * Math.cos(th)), ev + 0.01 - i * 0.002, eh + L / 2 * Math.sin(th), L, 0.035, 0.02, 0, 0, s * th, i === 4 ? 'glow' : undefined); }
      } else if (S.emb === 'buoy') {
        for (const r of [0.36, 0.32, 0.28]) A.part('torus', '#e8e2d2', 0, ev, eh, r, r, 0.6, 0, 0, 0);
        for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.78; A.part('box', c, Math.cos(a) * 0.16, ev - 0.03, eh + Math.sin(a) * 0.16, 0.045, 0.085, 0.02, 0, 0, a, 'glow'); }
        A.part('torus', '#a89a78', 0, ev - 0.005, eh, 0.42, 0.42, 0.5, 0, 0, 0);
      } else {
        A.log('#6a4628', 0, ev, eh, 0.1, 0.24, 0, 0, 'cyl8'); A.part('sph', '#6a4628', 0, ev, eh, 0.26, 0.21, 0.21);
        for (const u of [-0.08, 0.08]) A.log('#2a2c30', u, ev, eh, 0.106, 0.025, 0, 0, 'cyl8');
        A.part('cyl8', c, 0, ev - 0.105, eh, 0.05, 0.02, 0.05, 0, F, 0, 'glow'); A.log(BR, 0, ev - 0.12, eh - 0.05, 0.015, 0.06, F);
      }
    },
  },
  // a plinth where the wreck chest can stand (base: the floor it stands on)
  plinth: {
    col: FPI_C.stone3,
    sol(p) { return [fpiBox(p, 0, 0, 0.85, 0.48, (p.base || 0) + 0.32, p.base ? { z0: p.base - 0.05 } : undefined)]; },   // (up the tower: only as tall as itself, not a column down through the floors below)
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
// The tower's outside is one smooth skin (zm3dTower), whitewashed, a little wider at the foot than under the gallery;
// the wall pieces draw only their inner half (the plaster inside), so their flat faces never show through it. Its
// radius at height z (r), the granite plinth round its foot, the red band under the gallery, and the half-angle
// of a window's opening in it (a little over half a wall piece: neat, deep-set openings)
const ZM_SKIN = { RB: 10.95, RT: 10.5, Z0: 0.95, Z1: 24.3, PL: 11.12, PZ: 0.8, BAND: [22.8, 23.95], HA: 0.56 * Math.PI / ZMT.N, IN: 0.3 };
ZM_SKIN.r = z => { const t = clamp((z - ZM_SKIN.Z0) / (ZM_SKIN.Z1 - ZM_SKIN.Z0), 0, 1); return ZM_SKIN.RT + (ZM_SKIN.RB - ZM_SKIN.RT) * Math.pow(1 - t, 1.2); };
Object.assign(FPI_K, {
  // a piece of the tower's wall (or any wall standing on a floor), from z0 to z1: whitewashed, with a skirting and a
  // painted rail inside on each floor it crosses. (One of the ring round the tower draws only its inner half, and
  // nothing above the gallery's floor, where the gallery's iron rail stands on it: the skin is its outside)
  zwall: {
    noShadow: true, col: '#d8d2c0',
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.th / 2, p.z1, { z0: p.z0, col: '#d8d2c0' })]; },
    b3(p, A) {
      if (!p.ring) { A.box(p.col || '#d8d2c0', 0, 0, p.z0, p.len, p.th, p.z1 - p.z0); return; }
      const z1 = Math.min(p.z1, ZMT.L[5]), ti = ZM_SKIN.IN;
      if (z1 > p.z0) A.box(p.col || '#d8d2c0', 0, (p.th - ti) / 2, p.z0, p.len, ti, z1 - p.z0);
      if (p.jamb) return;
      for (const L of ZMT.L) if (L >= p.z0 && L < z1 && L < 25) { A.box('#3a3228', 0, p.th / 2 + 0.02, L, p.len * 1.01, 0.04, 0.22); A.box('#3e6a6a', 0, p.th / 2 + 0.02, L + 1.0, p.len * 1.01, 0.04, 0.07); }
    },
  },
  // the plaster either side of a window up the tower, where the skin's opening is narrower than the wall piece's:
  // drawn as the wall, but nothing solid (the window keeps its own width for the drowned and its boards)
  zjamb: { noShadow: true, sol() { return []; }, b3(p, A) { FPI_K.zwall.b3(p, A); } },
  // a floor of the tower: boards on joists, whitewashed underneath (the ceiling of the floor below)
  slab: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.top, { z0: p.top - 0.3, fl: true, col: '#6a5440' })]; },
    b3(p, A) {
      const n = Math.max(1, Math.round(p.d / 0.25));
      // (in the tower, each board is cut to the circle at its far edge, so no corner of the floor pokes out through the
      // skin: the strips' rectangles reach out past the wall, the boards stop inside it)
      for (let i = 0; i < n; i++) {
        const v = -p.d / 2 + (i + 0.5) * p.d / n;
        let u0 = -p.w / 2, u1 = p.w / 2;
        if (p.clip) { const ya = p.cy + v - p.d / n / 2, yb = p.cy + v + p.d / n / 2, ym = Math.max(Math.abs(ya), Math.abs(yb)), xl = Math.sqrt(Math.max(0, p.clip * p.clip - ym * ym)); u0 = Math.max(u0, -xl - p.cx); u1 = Math.min(u1, xl - p.cx); if (u1 - u0 < 0.02) continue; }
        A.box('#d4cebc', (u0 + u1) / 2, v, p.top - 0.32, u1 - u0, p.d / n, 0.22);
        A.box(ZMP.boards[i % 3], (u0 + u1) / 2, v, p.top - 0.1, u1 - u0, p.d / n * 0.95, 0.1);
      }
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
  // a tread of the iron stair up from the lantern to the Roof Room (u: out from the newel, +v: down the stair): a
  // chequered iron plate with a brass nosing, on curved stringers, its rail on the open (inner) side, and here and
  // there a slender iron column down to the lantern's floor (base)
  rtread: {
    noShadow: true,
    sol(p) {
      const out = [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, { z0: p.hh - 0.2, fl: true, col: ZMP.iron })];
      // (the rail's solid stands a little inside the rail itself, so the stair is wide enough to climb between it and
      // the glass: you can't step off, and you still brush the rail)
      if (p.rail) out.push(fpiBox(p, -p.w / 2 - 0.2, 0, 0.05, p.d / 2, p.hh + 1.0, { z0: p.hh - 0.05, ray: false, col: ZMP.iron }));
      if (p.post) out.push(fpiCirc(p, -p.w / 2 + 0.1, 0, 0.06, p.hh - 0.2, { z0: p.base, ray: false, col: ZMP.iron }));
      return out;
    },
    b3(p, A) {
      const S = ZMT.ST, IR = '#2a2e31', IR2 = '#3c4144', BR = '#c09040', h = p.hh, w = p.w, d = p.d;
      // (the slope of the stair along its inner and outer edges)
      const sIn = -Math.atan(S.RISE / (S.R0 * S.DA)), sOut = -Math.atan(S.RISE / (S.R1 * S.DA));
      A.box(IR, 0, 0, h - 0.06, w, d * 0.97, 0.06);
      for (let i = 0; i < 5; i++) A.box(IR2, -w / 2 + (i + 0.5) * w / 5, 0, h - 0.005, 0.03, d * 0.9, 0.012);
      A.box(BR, 0, d * 0.485 - 0.03, h - 0.055, w * 0.99, 0.06, 0.06);
      A.box(IR, -w / 2 + 0.03, 0, h - 0.24, 0.06, d * 1.06, 0.22, 0, sIn); A.box(IR, w / 2 - 0.03, 0, h - 0.24, 0.06, d * 1.06, 0.22, 0, sOut);
      if (p.rail) {
        A.box(IR, -w / 2 + 0.04, 0, h - 0.02, 0.035, 0.035, 0.96); A.box(IR, -w / 2 + 0.04, d * 0.33, h - 0.02 - S.RISE * 0.33, 0.025, 0.025, 0.96);
        A.box(BR, -w / 2 + 0.04, 0, h + 0.92, 0.07, d * 1.08, 0.06, 0, sIn); A.box(IR, -w / 2 + 0.04, 0, h + 0.45, 0.025, d * 1.06, 0.025, 0, sIn);
      }
      if (p.post) { A.cyl(IR, -w / 2 + 0.1, 0, p.base, 0.05, h - 0.2 - p.base); A.cyl(BR, -w / 2 + 0.1, 0, p.base, 0.09, 0.1); A.box(IR, -w / 4, 0, h - 0.3, w / 2, 0.06, 0.08); }
    },
  },
  // a strip of the Roof Room's floor (boards on iron plate: the plate is the lantern's ceiling, seen from below)
  rfloor: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.top, { z0: p.top - 0.3, fl: true, col: '#5a4634' })]; },
    b3(p, A) {
      A.box('#262a2c', 0, 0, p.top - 0.3, p.w, p.d, 0.2);
      A.box(ZMP.boards[p.i % 3], 0, 0, p.top - 0.1, p.w, p.d * 0.94, 0.1);
    },
  },
  // the Roof Room's wall and ceiling: only what stops you (the drum and its ceiling are drawn by zm3dLantern)
  rwall: { noShadow: true, sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.th / 2, p.z1, { z0: p.z0, col: '#2a2e30' })]; } },
  rpipe: { noShadow: true, sol(p) { return [fpiCirc(p, 0, 0, p.r, p.z1, { z0: p.z0, col: ZMP.brass })]; } },
  rceil: { noShadow: true, sol(p) { return [fpiCirc(p, 0, 0, p.r, p.z0 + 0.3, { z0: p.z0, mv: false, occ: false, col: '#5a4634' })]; } },
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

// the way up from the sea: the jetty and its gear, the courtyard's things, the coal store and the signal hut
Object.assign(FPI_K, {
  // a deck of planks on piles, top above the ground (a floor you walk on: anything comes up onto it from the steps);
  // the planks run across its length, on stringers, on piles braced under it, weed and barnacles at the waterline
  deck: {
    noShadow: true, col: FPI_C.wood,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.top, { z0: -1.5, fl: true, col: FPI_C.wood })]; },
    b3(p, A) {
      const T = p.top, along = p.w >= p.d, L = along ? p.w : p.d, S = along ? p.d : p.w;
      const at = (a, c) => along ? [a, c] : [c, a];   // (a: along its length, c: across it)
      const bx = (col, a, c, h0, la, lc, hh, tilt) => { const [u, v] = at(a, c); if (along) A.box(col, u, v, h0, la, lc, hh, tilt || 0); else A.box(col, u, v, h0, lc, la, hh, tilt || 0); };
      const n = Math.round(L / 0.3);
      for (let i = 0; i < n; i++) {
        const a = -L / 2 + (i + 0.5) * L / n, r = A.r(), col = r < 0.1 ? '#3a2e24' : r < 0.2 ? '#6e5a44' : ZMP.boards[i % 3];
        bx(col, a, (A.r() - 0.5) * 0.05, T - 0.09, L / n * 0.88, S - (A.r() < 0.15 ? 0.3 : 0), 0.09, (A.r() - 0.5) * 0.015);
      }
      // the stringers, and a fascia board down each side
      for (const k of S > 4 ? [-0.45, -0.15, 0.15, 0.45] : [-0.42, 0, 0.42]) bx(FPI_C.wood3, 0, k * S, T - 0.36, L, 0.18, 0.27);
      for (const s of [-1, 1]) bx('#3e3024', 0, s * (S / 2 + 0.03), T - 0.4, L + 0.06, 0.06, 0.34);
      // the piles, braced across under the deck
      const m = Math.max(1, Math.round(L / 2.4)), rows = S > 4 ? [-1, 0, 1] : [-1, 1];
      for (let i = 0; i <= m; i++) {
        const a = -L / 2 + 0.15 + i * (L - 0.3) / m;
        for (const s of rows) {
          const [u, v] = at(a, s * (S / 2 - 0.12));
          A.cyl(FPI_C.wood3, u, v, -2.6, 0.15, T + 2.55, 0, 0, 0, 'cyl6');
          A.cyl('#1e2a1c', u, v, -0.7, 0.165, 0.78, 0, 0, 0, 'cyl6');
          A.cyl('#7a7a6e', u, v, 0.02, 0.17, 0.12, 0, 0, 0, 'cyl6');
        }
        bx(FPI_C.wood3, a, 0, T - 0.78, 0.14, S - 0.2, 0.14);
        const [u, v] = at(a, 0), ang = Math.atan2(S - 0.3, T + 0.6);
        if (along) A.part('box', '#3a2c20', u, v, T * 0.5 - 0.35, 0.1, Math.hypot(T + 0.6, S - 0.3), 0.1, 0, i % 2 ? ang : -ang, 0);
        else A.part('box', '#3a2c20', u, v, T * 0.5 - 0.35, 0.1, Math.hypot(T + 0.6, S - 0.3), 0.1, 0, 0, i % 2 ? ang : -ang);
      }
    },
  },
  // the harbour's water round the jetty: nobody walks out onto it (only stands in the way; nothing to draw)
  seaguard: { noShadow: true, sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, 3.2, { z0: -2, ray: false, occ: false, col: '#14202a' })]; } },
  // an iron ladder down the jetty's side into the water, where the drowned come up (v: out over the water)
  ladder: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const T = p.top;
      for (const s of [-1, 1]) {
        A.box(ZMP.iron, s * 0.24, 0, -1.4, 0.05, 0.05, T + 1.4);
        A.box(ZMP.iron, s * 0.24, 0, T - 0.02, 0.05, 0.05, 0.75); A.box(ZMP.iron, s * 0.24, -0.2, T + 0.7, 0.05, 0.45, 0.05);
        A.box('#1e2a1c', s * 0.24, 0, -0.6, 0.07, 0.07, 0.7);
      }
      for (let h = -1.2; h < T - 0.1; h += 0.3) A.box(ZMP.iron, 0, 0, h, 0.5, 0.04, 0.04);
    },
  },
  // a cast-iron bollard
  bollard: {
    col: ZMP.iron,
    sol(p) { return p.free ? [] : [fpiCirc(p, 0, 0, 0.24, 0.6)]; },
    b3(p, A) {
      A.cyl('#24262a', 0, 0, -0.05, 0.17, 0.5, 0, 0, 0, 'cyl8'); A.cyl('#24262a', 0, 0, 0.42, 0.23, 0.08, 0, 0, 0, 'cyl8');
      A.part('sph', '#2a2c30', 0, 0, 0.52, 0.36, 0.16, 0.36);
      if (p.rope) for (let i = 0; i < 3; i++) A.part('torus', FPI_C.rope, 0, 0, 0.18 + i * 0.07, 0.5, 0.5, 0.5, 0, Math.PI / 2, 0);
    },
  },
  // a rowing boat on the water, moored (u: her length)
  rowboat: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const c = p.paint || '#34465a', L = p.len || 4.2, B = p.beam || 1.35;
      A.part('half', c, 0, 0, 0.66, 1.0, L, B, 0, 0, -Math.PI / 2);
      A.box('#2a2018', 0, 0, 0.17, L * 0.8, B * 0.56, 0.05);
      for (const s of [-1, 1]) A.box('#e8e0cc', 0, s * B * 0.49, 0.62, L * 0.9, 0.06, 0.07);
      for (const u of [-0.28, 0.1, 0.42]) A.box(FPI_C.wood2, u * L, 0, 0.46, 0.24, B * 0.92, 0.05);
      A.log(FPI_C.wood2, -0.1, 0.18, 0.56, 0.035, L * 0.78, 0.04); A.log(FPI_C.wood2, 0.05, -0.15, 0.54, 0.035, L * 0.78, -0.05);
      A.box(FPI_C.rope, L * 0.5 + 0.6, 0, 0.55, 1.3, 0.04, 0.04, p.rope || 0);
    },
  },
  // the tide-signal mast at the end of the jetty: a white pole and its yard, a black ball and cone hoisted on it
  mast: {
    col: FPI_C.wood3,
    sol(p) { return [fpiCirc(p, 0, 0, 0.32, 3.0)]; },
    b3(p, A) {
      const H = p.hh || 8, y = H * 0.78;
      A.box(FPI_C.stone3, 0, 0, -0.1, 0.8, 0.8, 0.35);
      A.cyl('#d8d0bc', 0, 0, 0, 0.12, H, 0, 0, 0, 'cyl8'); A.cyl('#2a2c30', 0, 0, H, 0.16, 0.12, 0, 0, 0, 'cyl8');
      A.box(FPI_C.wood3, 0, 0, y, 2.8, 0.1, 0.1);
      A.part('sph', '#101012', 1.15, 0, y - 0.62, 0.62, 0.62, 0.62); A.part('cone', '#101012', -1.15, 0, y - 0.66, 0.64, 0.62, 0.64, 0, 0, Math.PI);
      for (const s of [-1, 1]) A.box('#8a7a5a', s * 1.15, 0, y - 0.3, 0.015, 0.015, 0.3);
      A.box(FPI_C.rope, 0.16, 0, 0.6, 0.015, 0.015, H - 0.7);
      for (const s of [-1, 1]) { const L = Math.hypot(1.7, H * 0.9); A.part('box', FPI_C.rope, s * 0.85, 0, H * 0.45, 0.02, L, 0.02, 0, 0, s * Math.asin(1.7 / L)); }
      A.glow('#ff5a3a', 0, 0, H + 0.3, 0.22);
    },
  },
  // a fog bell in its timber frame, a rope down from its wheel
  bellframe: {
    col: FPI_C.wood3,
    sol(p) { return [fpiCirc(p, -1.05, 0, 0.2, 2.5), fpiCirc(p, 1.05, 0, 0.2, 2.5), fpiCirc(p, 0, 0, 0.45, 2.1, { z0: 1.0 })]; },
    b3(p, A) {
      for (const s of [-1, 1]) {
        A.box(FPI_C.wood3, s * 1.05, 0, -0.1, 0.2, 0.2, 2.6); A.box(FPI_C.wood3, s * 1.05, 0, 0, 0.16, 1.1, 0.14);
        for (const d of [-1, 1]) A.part('box', '#3a2c20', s * 1.05, d * 0.3, 0.45, 0.08, 0.95, 0.08, 0, d * 0.6, 0);
      }
      A.box(FPI_C.wood2, 0, 0, 2.4, 2.5, 0.22, 0.22); A.box(FPI_C.wood3, 0, 0, 2.08, 0.5, 0.26, 0.32);
      A.part('cone', '#6e5226', 0, 0, 1.55, 0.92, 0.8, 0.92); A.part('sph', '#6e5226', 0, 0, 1.9, 0.56, 0.36, 0.56);
      A.cyl('#5a4220', 0, 0, 1.12, 0.47, 0.07, 0, 0, 0, 'cyl8'); A.part('sph', '#222', 0, 0, 1.12, 0.14, 0.14, 0.14);
      A.part('torus', '#3a2c20', 0.42, 0, 2.15, 0.7, 0.7, 0.7, 0, Math.PI / 2, 0); A.box(FPI_C.rope, 0.72, 0, 0.7, 0.025, 0.025, 1.4);
    },
  },
  // a flagpole on a stone foot, the station's ensign at the top
  flagpole: {
    col: '#d8d0bc',
    sol(p) { return [fpiCirc(p, 0, 0, 0.36, 0.5), fpiCirc(p, 0, 0, 0.12, 7)]; },
    b3(p, A) {
      A.box(FPI_C.stone3, 0, 0, -0.1, 0.75, 0.75, 0.5); A.cyl('#d8d0bc', 0, 0, 0.4, 0.08, 6.8, 0, 0, 0, 'cyl8'); A.part('sph', '#b8a050', 0, 0, 7.25, 0.2, 0.2, 0.2);
      A.box('#8a2a24', 0.78, 0, 6.15, 1.5, 0.02, 0.9, 0.05, 0, -0.03); A.box('#26304e', 0.42, -0.012, 6.6, 0.68, 0.02, 0.44, 0.05, 0, -0.03);
      A.box('#d8d0bc', 0.42, -0.016, 6.78, 0.68, 0.02, 0.06, 0.05); A.box('#d8d0bc', 0.42, -0.016, 6.6, 0.06, 0.02, 0.44, 0.05);
      A.box(FPI_C.rope, 0.1, 0, 0.6, 0.015, 0.015, 6.1);
    },
  },
  // a heap of coal against a wall (r: how far it spreads)
  coalheap: {
    col: '#18181a',
    sol(p) { return [fpiCirc(p, 0, 0, p.r * 0.75, p.hh * 0.8)]; },
    b3(p, A) {
      A.part('cone', '#141416', 0, 0, p.hh / 2 - 0.05, p.r * 2, p.hh, p.r * 2);
      for (let i = 0; i < 40; i++) { const a = A.r() * 6.283, d = Math.sqrt(A.r()) * p.r, h = Math.max(0, p.hh * (1 - d / p.r)); A.part('ico', A.r() < 0.5 ? '#1c1c20' : '#2a2a2e', Math.cos(a) * d, Math.sin(a) * d, h * 0.95, 0.14 + A.r() * 0.18, 0.1 + A.r() * 0.12, 0.14 + A.r() * 0.16, A.r() * 3, A.r() * 3, 0); }
      if (p.shovel) { A.box(FPI_C.wood2, p.r * 0.5, -0.2, 0.55, 0.05, 0.05, 1.1, 0.4, 0.5); A.box('#3a3c40', p.r * 0.62, -0.3, 0.1, 0.26, 0.04, 0.3, 0.4, 0.5); }
    },
  },
  // sacks: coal, or the keeper's potatoes
  sacks: {
    col: '#6a5a3e',
    sol(p) { return [fpiBox(p, 0, 0, 0.8, 0.4, 0.75)]; },
    b3(p, A) { for (let i = 0; i < 4; i++) { const u = -0.5 + (i % 3) * 0.5, up = i === 3; A.part('sph', A.r() < 0.5 ? (p.c || '#6a5a3e') : '#5a4a32', up ? 0 : u, (A.r() - 0.5) * 0.1, up ? 0.62 : 0.26, 0.5, 0.52, 0.42, A.r() * 0.6); } },
  },
  // a rock with the gulls' whitewash on it, and maybe a gull asleep on top
  gullrock: {
    col: '#5a5c58',
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh)]; },
    b3(p, A) {
      A.part('taper', '#55585a', 0, 0, p.hh / 2 - 0.4, p.w, p.hh + 0.8, p.d, 0, 0, p.lean || 0);
      A.part('ico', '#62645f', 0, 0, p.hh - 0.05, p.w * 0.75, 0.32, p.d * 0.8, 0, 0, p.lean || 0);
      for (let i = 0; i < 9; i++) A.part('ico', '#e4e2d8', (A.r() - 0.5) * p.w * 0.7, (A.r() - 0.5) * p.d * 0.7, p.hh * (0.55 + A.r() * 0.45), 0.12 + A.r() * 0.2, 0.05, 0.1 + A.r() * 0.16, A.r() * 3);
      for (let i = 0; i < 4; i++) A.box('#d8d6cc', (A.r() - 0.5) * p.w * 0.8, -p.d / 2 - 0.01, p.hh * 0.3, 0.04, 0.02, p.hh * 0.5 * A.r());
      if (p.gull) {
        const z = p.hh + 0.1;
        A.part('sph', '#ecece6', 0, 0, z + 0.12, 0.2, 0.2, 0.42); A.part('sph', '#ecece6', 0, 0.14, z + 0.27, 0.15, 0.15, 0.15);
        for (const s of [-1, 1]) A.box('#8a9096', s * 0.09, -0.04, z + 0.12, 0.04, 0.4, 0.12);
        A.part('cone', '#e0a030', 0, 0.27, z + 0.26, 0.05, 0.12, 0.05, 0, Math.PI / 2, 0);
      }
    },
  },
  // a lantern on an iron bracket out from a wall (v: out from the wall)
  wlamp: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const z = p.z || 2.4;
      A.box('#1a1a1c', 0, 0.06, z + 0.32, 0.12, 0.12, 0.3); A.box('#1a1a1c', 0, 0.24, z + 0.4, 0.03, 0.42, 0.03);
      A.box('#1a1a1c', 0, 0.42, z + 0.22, 0.02, 0.02, 0.2);
      A.box('#1a1a1c', 0, 0.42, z + 0.2, 0.22, 0.22, 0.04); A.box('#1a1a1c', 0, 0.42, z - 0.12, 0.2, 0.2, 0.04);
      for (const [u, v] of [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]]) A.box('#1a1a1c', u, 0.42 + v, z - 0.1, 0.022, 0.022, 0.3);
      A.part('cone', '#1a1a1c', 0, 0.42, z + 0.28, 0.26, 0.14, 0.26);
      A.glow(p.c || '#ffc070', 0, 0.42, z + 0.04, 0.16);
    },
  },
  // the little shed out on the jetty: planked walls, a door and a lit window, a tarred roof, a lifebuoy on the wall
  shed: {
    col: FPI_C.wood,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, 2.5)]; },
    b3(p, A) {
      const W = p.w, D = p.d, H = 2.4;
      for (const s of [-1, 1]) {
        const n = Math.round(W / 0.22); for (let i = 0; i < n; i++) A.box(i % 2 ? FPI_C.wood : '#4e3e2e', -W / 2 + (i + 0.5) * W / n, s * D / 2, 0, W / n * 1.02, 0.08, H);
        const m = Math.round(D / 0.22); for (let i = 0; i < m; i++) A.box(i % 2 ? FPI_C.wood : '#4e3e2e', s * W / 2, -D / 2 + (i + 0.5) * D / m, 0, 0.08, D / m * 1.02, H);
      }
      for (const s of [-1, 1]) A.part('box', '#1c1a18', 0, s * D / 4, H + 0.45, W + 0.5, 0.08, D / 2 * 1.25, 0, -s * 0.62, 0);   // (each side sloping down and away from the ridge)
      A.box(FPI_C.wood3, 0, 0, H + 0.82, W + 0.5, 0.12, 0.12);
      // the door in its front (+u), a window lit in the side (-v)
      const dv = p.door || 0; A.box('#3a2a1e', W / 2 + 0.03, dv, 0, 0.06, 0.95, 1.95); A.box(FPI_C.iron, W / 2 + 0.07, dv + 0.3, 0.95, 0.04, 0.06, 0.06); A.box(FPI_C.wood3, W / 2 + 0.05, dv, 1.95, 0.08, 1.1, 0.1);
      A.box('#2a2622', 0, -D / 2 - 0.03, 1.1, 0.8, 0.04, 0.6); A.part('box', '#ffcf80', 0, -D / 2 - 0.05, 1.4, 0.66, 0.46, 0.02, 0, 0, 0, 'glow');
      A.part('torus', '#d8d0c0', -0.6, D / 2 + 0.07, 1.45, 0.6, 0.6, 2.8, 0, Math.PI / 2, 0);
      for (const a of [0, 1.57, 3.14, 4.71]) A.box('#b03028', -0.6 + Math.cos(a) * 0.25, D / 2 + 0.09, 1.45 + Math.sin(a) * 0.25, 0.09, 0.03, 0.09);
      A.box(FPI_C.net, W / 2 - 0.2, D / 2 + 0.05, 0.6, 0.6, 0.03, 1.4);
    },
  },
  // the signal hut's flag locker: pigeonholes of rolled flags in every colour
  signals: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, 0, 0.9, 0.3, 1.9)]; },
    b3(p, A) {
      A.box(FPI_C.wood3, 0, 0.04, -0.1, 1.8, 0.56, 2.0); A.box('#1a1612', 0, -0.2, 0.15, 1.66, 0.1, 1.6);
      const cols = ['#b02a24', '#e8d040', '#26407a', '#e8e4d8', '#2a6a3a', '#d06a20', '#101012'];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) A.part('cyl6', cols[(r * 3 + c * 5) % cols.length], -0.68 + c * 0.27, -0.22, 0.32 + r * 0.38, 0.17, 0.3, 0.17, 0, Math.PI / 2, 0);
      for (let r = 0; r <= 4; r++) A.box(FPI_C.wood2, 0, -0.2, 0.13 + r * 0.38, 1.66, 0.12, 0.03);
    },
  },
});

// ---------- laying out the station ----------
// the tools a map is laid out with (each map's set(H) takes them from here): W, the island's own place for a point
// relative to its middle; put, light and lamp; wall, an axis-aligned wall with its openings; room, a room's floor and
// ceiling; buy, perk and spot: a wall buy, a tonic cabinet and a place the wreck chest can stand
function zmKit(H, Z) {
  const OX = FPSC.CX, OY = FPSC.CY, CE = ZMC.CEIL, TH = 0.5;
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
      const w = op.w || (op.k === 'win' || op.k === 'glass' ? 1.6 : op.k === 'arch' ? 2.6 : 2.2);
      gaps.push([(op.at - w / 2 - a0) / L, (op.at + w / 2 - a0) / L]);
      const [mx, my] = at(op.at), lc = wo.mat === 'plaster' ? (o.col2 || ZMP.plaster) : wo.mat === 'wood' ? FPI_C.wood3 : FPI_C.stone3;
      const lintel = z0 => put('block', mx, my, ang, { w: w + 0.04, d: TH + 0.02, hh, z0, col: lc, lift });
      if (op.k === 'door' || op.k === 'debris') {
        lintel(2.5);
        const [wx, wy] = W(mx, my);
        const p = put('zdoor', mx, my, ang, { w: w + 0.1, d: TH * 0.8, hh: 2.5, lift });
        Z.doors.push({ x: wx, y: wy, z: lift, ang, w, cost: op.cost, zones: op.z, also: op.also, kind: op.k, solids: p.sol.slice(), prop: p, open: false, id: Z.doors.length });
      } else if (op.k === 'arch') lintel(2.9);
      else if (op.k === 'win') {
        lintel(2.35);
        put('block', mx, my, ang, { w: w + 0.04, d: TH, hh: 1.0, col: lc, trim: FPI_C.wood3, lift });
        const [wx, wy] = W(mx, my), [nx, ny] = horiz ? [0, op.out] : [op.out, 0];
        Z.windows.push({ x: wx, y: wy, nx, ny, zone: op.z, z: lift || undefined, boards: 6, id: Z.windows.length, q: [], hw: w / 2, th: TH / 2, shore: op.shore || undefined });
      } else if (op.k === 'glass') {
        // a glazed window: sill, lintel, and a pane nobody comes through (drawn with the tower's glass)
        lintel(2.35);
        put('block', mx, my, ang, { w: w + 0.04, d: TH, hh: 1.0, col: lc, trim: FPI_C.wood3, lift });
        put('glasspane', mx, my, ang, { w, z0: (lift || 0) + 1.0, z1: (lift || 0) + 2.35 });
        const [wx, wy] = W(mx, my); (Z.glassQ = Z.glassQ || []).push({ x: wx, y: wy, ang, w: w + 0.02, z0: (lift || 0) + 1.0, z1: (lift || 0) + 2.35, frame: true, flat: true });
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
  const buy = (id, cost, x, y, nx, ny, z) => { put('board', x, y, ny ? 0 : Math.PI / 2, z ? { lift: z } : {}); const [wx, wy] = W(x, y); Z.buys.push({ id, cost, x: wx, y: wy, nx, ny, z: z || 0 }); };
  const perk = (k, x, y, a, z) => { put('tonic', x, y, a, Object.assign({ c: ZM_PERKS[k].c, pk: k }, z ? { lift: z } : {})); const [wx, wy] = W(x, y), nx = Math.round(Math.sin(a)), ny = Math.round(-Math.cos(a)); Z.perks.push({ k, x: wx, y: wy, nx, ny, z: z || 0 }); light(x + nx * 0.7, y + ny * 0.7, (z || 0) + 1.5, ZM_PERKS[k].c, 5, 'lantern'); };
  const spot = (x, y, nx, ny, base, zone) => { put('plinth', x, y, ny ? 0 : Math.PI / 2, { base }); const [wx, wy] = W(x, y); Z.spawns.push({ x: wx, y: wy, nx, ny, z: (base || 0) + 0.32, zone }); };
  return { W, put, light, lamp, wall, room, buy, perk, spot };
}

FPI_GEN.light = {
  built: true,
  set(H) {
    const { I } = H, OX = FPSC.CX, OY = FPSC.CY, HT = ZMC.HT, CE = ZMC.CEIL, TH = 0.5, TOP = HT + 4.2;
    const Z = I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    const { W, put, light, lamp, wall, room, buy, perk, spot } = zmKit(H, Z);
    for (const k of Object.keys(ZM_ZONES)) if (k !== 'tower' && !ZM_ZONES[k].sky) room(k);
    const PL = c => ({ mat: 'plaster', col2: c });
    // the south front, facing the sea
    wall(-44, -21, -26, -21, { mat: 'stone' }, [{ at: -35, k: 'win', out: -1, z: 'wreck' }]);
    wall(-26, -21, -10, -21, PL(ZM_ZONES.fog.wall), [{ at: -18, k: 'win', out: -1, z: 'fog' }]);
    // (the Quarters' south wall faces the courtyard now: glazed windows in it, solid, for the look of the place; the
    // drowned come in at the back instead, by two windows in its north wall out of the walled corners by the tower)
    wall(-10, -21, 10, -21, PL(ZM_ZONES.quarters.wall), [{ at: -5.5, k: 'glass' }, { at: 2.6, k: 'door', cost: 1000, z: ['yard', 'quarters'] }, { at: 6.6, k: 'glass' }]);
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
    // (they stop at the Quarters, whose own north wall carries on between: running on to ±7.5, as they did when the
    // tower stood there, they'd fill in the Quarters' two back windows)
    wall(-16, -9.5, -10, -9.5, PL(ZM_ZONES.fog.wall), [{ at: -13, k: 'win', out: 1, z: 'fog' }]);
    wall(10, -9.5, 16, -9.5, PL(ZM_ZONES.oil.wall), [{ at: 13, k: 'win', out: 1, z: 'oil' }]);
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
    wall(-10, -9.5, 10, -9.5, PL(ZM_ZONES.quarters.wall), [{ at: -7.8, k: 'win', out: 1, z: 'quarters' }, { at: 7.8, k: 'win', out: 1, z: 'quarters' }]);
    // ---------- the tower ----------
    const TX = ZMT.X, TY = ZMT.Y, RT = ZMT.R, L5 = ZMT.L[5], TW = (rx, ry) => [TX + rx, TY + ry];
    const tput = (k, rx, ry, ang, o) => put(k, TX + rx, TY + ry, ang || 0, o || {});
    Z.glass = (Z.glassQ || []).slice();
    // its wall: thirty-two pieces round, one band to each floor, with windows; the door at the foot onto the passage
    // (z: zombie windows, with boards; g: glazed windows; a: the arch)
    const OPEN = { 0: { 8: 'a', 0: 'z', 16: 'z', 24: 'g', 4: 'g', 12: 'g', 20: 'g', 28: 'g' },
      1: { 4: 'z', 12: 'g', 20: 'g', 28: 'z' }, 2: { 4: 'g', 12: 'z', 20: 'z', 28: 'g' }, 3: { 4: 'z', 12: 'g', 20: 'g', 28: 'z' }, 4: { 4: 'g', 12: 'z', 20: 'z', 28: 'g' } };
    Z.tower = { x: OX + TX, y: OY + TY, r: RT, L: ZMT.L.slice(), open: OPEN };   // (the skin is cut to OPEN)
    const RC = RT + ZMT.TH / 2, SEG = 2 * RC * Math.sin(Math.PI / ZMT.N) * 1.04;
    for (let i = 0; i < ZMT.N; i++) {
      const a = i / ZMT.N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ang = a + Math.PI / 2, px = TX + ca * RC, py = TY + sa * RC;
      for (let k = 0; k < 6; k++) {
        const z0 = k === 0 ? 0 : ZMT.L[k] - 0.3, z1 = k < 5 ? ZMT.L[k + 1] - 0.3 : L5 + 1.05, Lk = ZMT.L[k];
        const o = (OPEN[k] || {})[i], piece = (zz0, zz1) => put('zwall', px, py, ang, { len: SEG, th: ZMT.TH, z0: zz0, z1: zz1, ring: true });
        if (!o) { piece(z0, z1); continue; }
        if (o === 'a') { piece(Lk + 2.9, z1); continue; }
        piece(z0, Lk + 1.0); piece(Lk + 2.35, z1);
        // (the plaster either side of the skin's narrower opening)
        const hw = (RC - ZMT.TH / 2) * Math.tan(ZM_SKIN.HA), jl = SEG / 2 - hw;
        for (const s of [-1, 1]) put('zjamb', px - sa * s * (hw + jl / 2), py + ca * s * (hw + jl / 2), ang, { len: jl, th: ZMT.TH, z0: Lk + 1.0, z1: Lk + 2.35, ring: true, jamb: true });
        const zone = k === 0 ? 'tower' : 'tw' + k + (sa >= 0 ? 'n' : 's');
        if (o === 'z') Z.windows.push({ x: OX + px, y: OY + py, nx: ca, ny: sa, zone, z: Lk, boards: 6, id: Z.windows.length, q: [], hw: SEG / 2, th: ZMT.TH / 2, tw: true });
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
        for (const [x0, x1] of pieces) if (x1 - x0 > 0.2) tput('slab', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0, top, clip: RT + 0.3, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
      }
      // the railing round the stairwell, open on the north side where the stair comes off
      tput('zrail', 0, -HO, 0, { w: 2 * HO, base: top });
      tput('zrail', HO, 0, Math.PI / 2, { w: 2 * HO, base: top });
      tput('zrail', -HO, 0, Math.PI / 2, { w: 2 * HO, base: top });
      for (const sx of [-1, 1]) tput('zrail', sx * (HO + 1.3) / 2, HO, 0, { w: HO - 1.3, base: top });
    }
    // the newel, and the spiral round it: eighteen treads a turn, a turn a floor, each floor's landing on the north side
    tput('newel', 0, 0, 0, { r: ZMT.NEWEL, hh: L5 + 0.9 });
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
      Z.doors.push({ x: OX + gx, y: OY + gy, z: h, ang: a, w: ZMT.R1 - ZMT.R0, cost: gateCost[k], zones: [k === 0 ? 'tower' : 'tw' + k + 'n', k === 4 ? 'top' : 'tw' + (k + 1) + 'n'], kind: 'gate', also: k === 4 ? ['roof'] : undefined, solids: p.sol.slice(), prop: p, open: false, id: Z.doors.length });
    }
    // each floor's two rooms: a wall across from the stairwell to the tower wall on each side, a door in the east one
    for (let k = 1; k <= 4; k++) {
      const Lk = ZMT.L[k], hh = ZMT.L[k + 1] - 0.3 - Lk;
      wall(TX + HO + 0.1, TY, TX + RT + 0.05, TY, { mat: 'plaster', col2: '#d8d2c0', hh, lift: Lk }, [{ at: TX + 7, k: 'door', cost: 750, z: ['tw' + k + 'n', 'tw' + k + 's'] }]);
      wall(TX - RT - 0.05, TY, TX - HO - 0.1, TY, { mat: 'plaster', col2: '#d8d2c0', hh, lift: Lk });
    }
    // the lantern: a ring of glass on the top floor, with a door east and west onto the gallery outside
    const GR = ZMT.GLASS, NG = 24;
    for (let i = 0; i < NG; i++) {
      const a = (i + 0.5) / NG * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), w = 2 * GR * Math.sin(Math.PI / NG) * 1.02;
      if (i === 0 || i === NG - 1 || i === NG / 2 || i === NG / 2 - 1) continue;   // (the doors)
      tput('glasspane', ca * GR, sa * GR, a + Math.PI / 2, { w, z0: L5 + 0.05, z1: L5 + 4.4 });
    }
    Z.top = { x: OX + TX, y: OY + TY, r: GR - 0.2, z: L5 };
    // the iron stair round the inside of the glass, from beside the west door up over the head of the spiral stair
    // to the Roof Room (each tread rises ZMT.ST.RISE; the last rise is onto the Roof Room's floor)
    const RF = ZMT.RF, RW = ZMT.RW, RH = ZMT.RH, ST = ZMT.ST;
    for (let n = 1; n < ST.N; n++) {
      const a = ST.A0 - (n - 1) * ST.DA, rm = (ST.R0 + ST.R1) / 2, hh = L5 + n * ST.RISE;
      tput('rtread', Math.cos(a) * rm, Math.sin(a) * rm, a, { w: ST.R1 - ST.R0, d: ST.D, hh, base: L5, rail: n >= 3, post: n % 4 === 0 && n < 13 });
    }
    // the Roof Room's floor, in strips across, cut to the circle and to the opening the stair comes up through
    { const [a0, a1, rs] = ZMT.SLOT, R = RW + 0.15, SW = 0.2, DX = 0.05;
      const slot = (x, y) => { const a = Math.atan2(y, x); return Math.hypot(x, y) > rs - 0.02 && a > a0 - 0.01 && a < a1 + 0.01; };
      let i = 0;
      for (let y0 = -R; y0 < R - 1e-6; y0 += SW) {
        const y1 = Math.min(R, y0 + SW), ym = Math.max(Math.abs(y0), Math.abs(y1)) * (y0 < 0 && y1 > 0 ? 0 : 1), xm = Math.sqrt(Math.max(0, R * R - ym * ym));
        let run = null; const runs = [];
        for (let x = -xm; x <= xm + 1e-6; x += DX) {
          const ok = !slot(x, y0) && !slot(x, y1) && !slot(x, (y0 + y1) / 2);
          if (ok && !run) run = [x, x]; else if (ok) run[1] = x; else if (run) { runs.push(run); run = null; }
        }
        if (run) runs.push(run);
        for (const [x0, x1] of runs) if (x1 - x0 > 0.1) tput('rfloor', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0 + DX, d: y1 - y0, top: RF, i: i++ });
      }
      // a rail round the opening, and across its low end
      const NR = 7;
      for (let k = 0; k < NR; k++) {
        const b0 = a0 + (a1 - a0) * k / NR, b1 = a0 + (a1 - a0) * (k + 1) / NR, bm = (b0 + b1) / 2, r = rs - 0.06;
        tput('zrail', Math.cos(bm) * r, Math.sin(bm) * r, bm + Math.PI / 2, { w: 2 * r * Math.sin((b1 - b0) / 2) + 0.04, base: RF });
      }
      { const r0 = rs - 0.06, r1 = RW - 0.05, rm = (r0 + r1) / 2, b = a1 + 0.012; tput('zrail', Math.cos(b) * rm, Math.sin(b) * rm, b, { w: r1 - r0, base: RF }); }
    }
    // its wall (no windows) and its ceiling, under the dome
    { const NW = 32, RC = RW + 0.25, SEGW = 2 * RC * Math.sin(Math.PI / NW) * 1.06;
      for (let i = 0; i < NW; i++) { const a = (i + 0.5) / NW * Math.PI * 2; tput('rwall', Math.cos(a) * RC, Math.sin(a) * RC, a + Math.PI / 2, { len: SEGW, th: 0.5, z0: RF, z1: RF + RH }); }
      tput('rceil', 0, 0, 0, { r: RW + 0.3, z0: RF + RH });
      tput('rpipe', 0, 0, 0, { r: 0.32, z0: RF, z1: RF + RH });   // (the lamp's flue, up through the middle)
    }
    // in it: two lanterns, the oil and the stores of a lamp room, and the lever that lights the lamp ([lamp] src/zmlamp.js)
    lamp(...TW(-2.6, 1.6), RF + 2.45, '#ffc070', RF + RH); lamp(...TW(2.4, -2.4), RF + 2.45, '#ffc070', RF + RH);
    { const onRoof = (kind, x, y, ang, o) => put(kind, x, y, ang || 0, Object.assign({ lift: RF }, o || {}));
      const at = (a, r) => [TX + Math.cos(a) * r, TY + Math.sin(a) * r, a + Math.PI / 2];
      { const [x, y, a] = at(Math.PI * 0.86, RW - 0.3); onRoof('shelf', x, y, a, { w: 1.8, goods: 'cans' }); }
      { const [x, y, a] = at(-Math.PI * 0.86, RW - 0.3); onRoof('shelf', x, y, a, { w: 1.6, goods: 'jars' }); }
      for (const [a, r] of [[Math.PI * 1.16, 5.3], [Math.PI * 1.25, 5.55]]) onRoof('tank', TX + Math.cos(a) * r, TY + Math.sin(a) * r, 0, { r: 0.42, hh: 1.1, c: '#4a3a2a' });
      onRoof('coil', TX + Math.cos(-0.25) * 5.2, TY + Math.sin(-0.25) * 5.2, 0, {});
      onRoof('crates', TX + Math.cos(Math.PI * 0.62) * 3.2, TY + Math.sin(Math.PI * 0.62) * 3.2, 0.4, { items: [{ u: 0, v: 0, s: 0.75, h0: 0, ry: 0.2 }] });
      if (typeof zmlPlace === 'function') zmlPlace(put, light, W, Z, onRoof);   // [lamp] the lever that lights the lamp (src/zmlamp.js)
    }
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
    put('washline', 9.0, 11.4, -0.25, { len: 4.2 });   // (out in the yard, clear of the tower's foot)
    // round the foot of the tower, ivy and thrift
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.2; if (Math.abs(Math.sin(a) - 1) < 0.25 || Math.sin(a) < -0.8) continue; put('bed', ZMT.X + Math.cos(a) * (ZM_SKIN.PL + 0.4), ZMT.Y + Math.sin(a) * (ZM_SKIN.PL + 0.4), a + Math.PI / 2, { w: 2.6, d: 0.55, flowers: i % 3 ? '#e88aa8' : '#e8e0d0' }); }
    // grass in the yards, and round the station outside
    { const rr = seeded(0x5ea9); let n = 0;
      for (let t = 0; t < 2400 && n < 420; t++) {
        const x = (rr() - 0.5) * 120, y = (rr() - 0.5) * 90 - 0;
        const inYard = Math.abs(x) > 10.9 && Math.abs(x) < 15.7 && y > -9.2 && y < 13.7, inTowerYard = Math.abs(x) < 15.7 && y > -9.2 && y < 13.7 && Math.hypot(x - ZMT.X, y - ZMT.Y) > ZM_SKIN.PL + 0.2 && Math.abs(x) > 2.8;
        const outside = (x < -44.5 || x > 44.5 || y < -21.5 || y > 26.5) && Math.hypot(x, y) < FPSC.R - 4 && y > ZM_SHORE(x) + 0.6 && !(Math.abs(x) < 21.6 && y < -20.8);
        if (!(inYard || inTowerYard || outside)) continue;
        H.decor('tuft', OX + x, OY + y, { s: 0.7 + rr() * 0.8, c: rr() < 0.5 ? '#4e6a38' : '#5e7040' }); n++;
      }
      for (let i = 0; i < 26; i++) { const a = rr() * 6.283, d = 52 + rr() * 26, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.8; if (Math.hypot(x, y) < FPSC.R - 6 && !(Math.abs(x) < 17 && y < -36)) put('stone', x, y, rr() * 6.283, { w: 0.9 + rr(), d: 0.6 + rr() * 0.5, hh: 0.6 + rr() * 1.2, lean: (rr() - 0.5) * 0.3 }); }
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
    put('bunk', 9.45, -18.9, Math.PI / 2, {});   // (against the east wall, clear of the window)
    put('shelf', -9.5, -18.2, Math.PI / 2, { w: 2.2, goods: 'jars' });
    put('shelf', 2.5, -10.2, 0, { w: 2.0, goods: 'books' });
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
    fpiCrates(H, OX + -9.4, OY + 12.6, false); fpiCrates(H, OX + 9.4, OY + 12.6, false);
    // ---------- what's for sale ----------
    // wall buys: the weapon on its board on a wall (x, y: the wall's face; ang: the way the board faces)
    // (nx, ny: the way out from the wall, into the room)
    buy('longarm', 500, 0, -20.7, 0, 1);
    buy('blunderbuss', 500, -9.7, -11.8, 1, 0);
    buy('pepperbox', 250, 17.8, -9.8, 0, -1);
    buy('cutlass', 750, -25.7, -11.8, 1, 0);
    buy('avtomat', 1200, 25.7, 8, -1, 0);
    buy('harpoon', 1000, -25.7, 6, 1, 0);
    buy('blunderbuss', 500, 43.7, -9, -1, 0);
    // tonics (x, y: the cabinet; face: the way its front looks)
    // (a cabinet's front faces (sin a, -cos a))
    perk('wind', 5.4, -10.2, 0);   // (clear of the back window at 7.8)
    perk('stout', -10, 25.3, 0);
    perk('quick', -43.3, -9, Math.PI / 2);
    perk('fleet', 30.5, 1.3, 0);
    // where the wreck chest can be: four on the ground floor, one at the top of the tower
    // (nx, ny: the way the chest faces)
    spot(-24.6, -17.8, 1, 0, 0, 'fog');
    spot(17.2, 3, 1, 0, 0, 'east');
    spot(6, 25, 0, -1, 0, 'hall');
    spot(-38, 0.9, 0, -1, 0, 'wreck');
    spot(ZMT.X, ZMT.Y - 5.6, 0, 1, ZMT.L[5], 'top');
    // wall buys up the tower
    { const at = (a, k, id, cost) => { const r = ZMT.R - 0.07, x = ZMT.X + Math.cos(a) * r, y = ZMT.Y + Math.sin(a) * r; put('board', x, y, a + Math.PI / 2, { lift: ZMT.L[k] }); const [wx, wy] = W(x, y); Z.buys.push({ id, cost, x: wx, y: wy, nx: -Math.cos(a), ny: -Math.sin(a), z: ZMT.L[k] }); };
      at(Math.PI * 0.9, 2, 'avtomat', 1200); at(Math.PI * 0.12, 4, 'longarm', 500); at(-Math.PI * 0.12, 3, 'harpoon', 1000); }
    // ---------- the way up from the sea: the jetty, the courtyard and its two rooms ----------
    // You come ashore on the jetty, out on the harbour's water south of the station (its pier from the sea wall out
    // to a T-head, the deck ZMD.TOP over the ground), up two steps to the sea gate (750) into the courtyard, and from
    // the courtyard through the Keeper's Quarters' door (1000) into the station. Off the courtyard: the Coal Store
    // (through an arch, open with the courtyard) and the Signal Hut (500), with the Grog Ration. The drowned come up
    // the jetty's ladders out of the water, wade up the shingle to the gaps boarded up in the sea wall, and climb in
    // over the courtyard's walls.
    {
      const DT = ZMD.TOP, YW = 2.6;
      const lifted = (p, h) => { p.lift = h; for (const s of p.sol) { s.z1 += h; s.z0 = (s.z0 != null ? s.z0 : FPSC.GROUND) + h; } return p; };
      const onDeck = (k, x, y, ang, o) => put(k, x, y, ang || 0, Object.assign({ lift: DT }, o || {}));
      Z.bay = true; Z.decks = [];
      const deck = (x0, x1, y0, y1) => { put('deck', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0, top: DT }); Z.decks.push([OX + x0, OX + x1, OY + y0, OY + y1]); };
      // the jetty: the pier, and the T-head across its end
      deck(-3, 3, -60.2, -41.25); deck(-12, 12, -66, -60);
      // up from the courtyard's sea gate: two stone steps between the quay's walls
      put('step', 0, -39.75, 0, { w: 6.0, d: 1.0, hh: DT / 3 }); put('step', 0, -40.75, 0, { w: 6.0, d: 1.0, hh: DT * 2 / 3 });
      for (const sx of [-1, 1]) put('wall', sx * 3.42, -40.3, Math.PI / 2, { len: 2.5, th: 0.6, hh: 1.75, mat: 'stone', cap: true, jag: 0 });
      // the water round it: out of everyone's reach (the drowned in it come up by the ladders)
      for (const [x0, x1, y0, y1] of [[-34, -3, -60, -41.25], [3, 34, -60, -41.25], [-34, -12, -66, -60], [12, 34, -66, -60], [-34, 34, -82, -66]]) put('seaguard', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0 });
      // where the drowned come up: a ladder down into the water at each (no boards: nothing to nail back)
      const seaWin = (x, y, nx, ny) => { const [wx, wy] = W(x, y); Z.windows.push({ x: wx, y: wy, nx, ny, zone: 'dock', z: DT, boards: 0, sea: true, id: Z.windows.length, q: [], hw: 0.9, th: 0.1 }); put('ladder', x + nx * 0.07, y + ny * 0.07, Math.atan2(-nx, ny), { top: DT }); };
      seaWin(-3, -51, -1, 0); seaWin(3, -46.5, 1, 0); seaWin(-8, -60, 0, 1); seaWin(8, -60, 0, 1);
      seaWin(-6, -66, 0, -1); seaWin(0.5, -66, 0, -1); seaWin(6.5, -66, 0, -1); seaWin(12, -63, 1, 0);
      // on the jetty: bollards, coiled ropes, lobster pots, fish boxes, lamps on posts, the shed and the tide mast
      for (const [x, y, r] of [[-2.66, -45.2, 1], [2.66, -52.6, 0], [-2.66, -58.4, 1], [4.4, -60.36, 0], [-4.6, -60.36, 1], [-9.6, -65.64, 1], [3.2, -65.64, 0], [9.6, -65.64, 1]]) onDeck('bollard', x, y, 0, { rope: !!r, free: true });
      // (the deck itself is kept clear: nothing underfoot to catch on, the bollards at its edge only for show)
      onDeck('shed', -10.2, -63, 0, { w: 3.2, d: 4.0, door: 1.0 });
      onDeck('mast', 10.6, -64.7, 0, { hh: 8 });
      for (const [x, y, a] of [[2.62, -43.6, Math.PI], [-2.62, -53.5, 0], [11.6, -60.5, Math.PI], [-6.6, -65.62, Math.PI / 2], [2.62, -59.2, Math.PI]]) {
        const pp = onDeck('post', x, y, a, { r: 0.13, hh: 2.5, lamp: true }), [lx, ly] = [x + Math.cos(a) * 0.5, y + Math.sin(a) * 0.5];
        light(lx, ly, DT + 2.15, '#ffc070', 10, 'lantern'); I.lights[I.lights.length - 1].p = pp;
      }
      // boats moored alongside, and rocks out in the harbour, white with the gulls
      put('rowboat', 5.5, -54.2, Math.PI / 2 + 0.08, { paint: '#2e4a3a', rope: 0.3 }); put('rowboat', -10.4, -68.4, 0.06, { paint: '#6a3428', len: 4.6 });
      put('rowboat', -6.4, -45.6, -Math.PI / 2 - 0.12, { paint: '#34465a', len: 3.8, beam: 1.25 });
      for (const [x, y, w, hh, gl] of [[-19, -55, 2.2, 1.5, 1], [17.5, -50.5, 1.8, 1.1, 0], [21, -70, 3.0, 2.0, 1], [-24, -72, 2.4, 1.3, 0], [26, -44.5, 1.6, 0.9, 1], [-15, -46, 1.4, 0.7, 0], [-30, -62, 2.0, 1.6, 1]]) put('gullrock', x, y, w * 2, { w, d: w * 0.8, hh, gull: !!gl, lean: (x % 3) * 0.05 });
      // ---------- the courtyard: a sea wall with the gate in it, walls up either side to the station ----------
      const ST = { mat: 'stone', hh: YW, cap: true };
      wall(-13, -39, 13, -39, ST, [{ at: -9.5, k: 'win', out: -1, z: 'yard', shore: true }, { at: 0, k: 'door', cost: 750, z: ['dock', 'yard'], also: ['coal'] }, { at: 9.5, k: 'win', out: -1, z: 'yard', shore: true }]);
      wall(-13, -39, -13, -37, ST); wall(-13, -29, -13, -21, ST, [{ at: -24.6, k: 'win', out: -1, z: 'yard' }]);
      wall(13, -39, 13, -37, ST); wall(13, -29, 13, -21, ST, [{ at: -24.6, k: 'win', out: 1, z: 'yard' }]);
      // the Coal Store, through an arch on the west side; the Signal Hut, through a door on the east
      wall(-13, -37, -13, -29, { mat: 'stone' }, [{ at: -33, k: 'arch', w: 2.4 }]);
      wall(-21, -37, -13, -37, { mat: 'stone' }); wall(-21, -29, -13, -29, { mat: 'stone' });
      wall(-21, -37, -21, -29, { mat: 'stone' }, [{ at: -33, k: 'win', out: -1, z: 'coal' }]);
      wall(13, -37, 13, -29, { mat: 'wood' }, [{ at: -33, k: 'door', cost: 500, z: ['yard', 'shed'] }]);
      wall(13, -37, 21, -37, { mat: 'wood' }); wall(13, -29, 21, -29, { mat: 'wood' });
      wall(21, -37, 21, -29, { mat: 'wood' }, [{ at: -33, k: 'win', out: 1, z: 'shed' }]);
      put('roof', -17, -33, 0, { w: 8.8, d: 8.8, z0: CE + 0.3, rise: 1.6, mat: 'wood' }); put('roof', 17, -33, 0, { w: 8.8, d: 8.8, z0: CE + 0.3, rise: 1.6, mat: 'wood' });
      // flagstones: a path from the gate to the Quarters' door, across from the Coal Store to the Signal Hut, and
      // along the foot of the station; grass and beds between
      put('floor', 0, -31.4, 0, { w: 3.0, d: 14.8, style: 'flags' }); put('floor', 0, -33, 0, { w: 25.4, d: 2.6, style: 'flags' }); put('floor', 0, -22.6, 0, { w: 25.4, d: 2.7, style: 'flags' });
      { const rr = seeded(0x7a9d); let n = 0;
        for (let t = 0; t < 900 && n < 150; t++) {
          const x = (rr() - 0.5) * 25, y = -38.6 + rr() * 14.4;
          if (Math.abs(x) < 1.7 || Math.abs(y + 33) < 1.5) continue;
          if (I.solids.some(s => s.mv !== false && Math.abs(s.x - OX - x) < 6 && Math.abs(s.y - OY - y) < 6 && fpiDist(s, OX + x, OY + y) < 0.25)) continue;
          H.decor('tuft', OX + x, OY + y, { s: 0.6 + rr() * 0.9, c: rr() < 0.5 ? '#4e6a38' : '#5e7040' }); n++;
        }
        // and the shingle outside the sea wall: tufts of thrift
        for (let t = 0; t < 120; t++) { const x = (rr() - 0.5) * 60, y = -39.6 - rr() * 1.6; if (Math.abs(x) < 4 || y < ZM_SHORE(x) + 0.3) continue; H.decor('tuft', OX + x, OY + y, { s: 0.5 + rr() * 0.6, c: '#5a6a40' }); }
      }
      // the north-west: the well and its pump, a handcart, casks of lamp oil
      put('well', -8.5, -28.3, 0.3, { r: 0.8, lamp: true }); light(-8.5 + 1.3 * Math.cos(0.3), -28.3 + 1.3 * Math.sin(0.3), 0.9, '#ffc070', 6, 'lantern');
      put('cart', -4.6, -29.9, 0.25, {}); fpiBarrels(H, OX - 11.5, OY - 27.1);
      put('bed', -11.9, -30.4, Math.PI / 2, { w: 2.0, d: 0.8, flowers: '#e8e0d0' });
      // the north-east: the keeper's garden, in low drystone walls, cabbages and kale
      const low = (x, y, len, ang) => put('wall', x, y, ang || 0, { len, th: 0.45, hh: 0.7, mat: 'stone', cap: true, jag: 0, moss: true });
      low(9.3, -31.2, 5.4); low(9.3, -26.2, 5.4); low(11.8, -28.7, 4.6, Math.PI / 2); low(6.8, -30.3, 1.4, Math.PI / 2); low(6.8, -27.1, 1.4, Math.PI / 2);
      put('bed', 9.4, -29.6, 0, { w: 4.0, d: 1.1, flowers: '#7aa048' }); put('bed', 9.4, -27.8, 0, { w: 4.0, d: 1.1, flowers: '#c8c060' });
      // the south-west: the washing line, lobster pots stacked, a gull-stained rock in the corner
      put('washline', -5.6, -35.9, 0, { len: 4.6 }); fpiPots(H, OX - 11.0, OY - 36.4); put('gullrock', -12.05, -38.15, 0.4, { w: 0.9, d: 0.8, hh: 0.8, gull: true });
      // the south-east: the fog bell on its frame, the flagpole, lamp oil in crates and casks
      put('bellframe', 5.4, -37.6, 0, {}); put('flagpole', 11.9, -34.9, 0, {}); fpiCrates(H, OX + 2.9, OY - 37.9, false); fpiBarrels(H, OX + 11.7, OY - 37.7);
      put('bench', -1.7, -21.6, 0, { w: 1.8 }); put('plant', 7.8, -21.7, 0, { s: 1.1, flowers: '#d84050' }); put('plant', -12.2, -21.8, 0, { s: 0.9 });
      // the lights: lanterns on the walls, two on posts
      const wl = (x, y, nx, ny, z) => { put('wlamp', x, y, Math.atan2(-nx, ny), { z: z || 2.3 }); light(x + nx * 0.42, y + ny * 0.42, (z || 2.3) + 0.05, '#ffc070', 9, 'lantern'); };
      wl(0.75, -21.25, 0, -1); wl(-7.4, -21.25, 0, -1); wl(-1.75, -38.75, 0, 1); wl(1.75, -38.75, 0, 1); wl(-12.75, -27, 1, 0); wl(12.75, -27.2, -1, 0);
      fpiLanternPost(H, OX + 2.0, OY - 28.4, 0); fpiLanternPost(H, OX - 2.0, OY - 36.4, Math.PI);
      // the Coal Store: the heaps, sacks, a shovel, a shelf
      put('coalheap', -19.3, -35.5, 0, { r: 1.6, hh: 1.3, shovel: true }); put('coalheap', -19.4, -30.6, 0, { r: 1.0, hh: 0.8 });
      put('sacks', -15.0, -36.3, 0.1, { c: '#4a4036' }); put('shelf', -16.6, -29.7, 0, { w: 2.0, goods: 'cans' }); put('bench', -14.0, -30.4, Math.PI / 2, { w: 1.4 });
      lamp(-17, -33, 2.7);
      // the Signal Hut: the flag locker, a table with the signal lamp and the log, a telescope at the window, the tonic
      put('signals', 19.4, -36.4, Math.PI, {}); put('table', 15.4, -35.8, 0, { w: 1.7, d: 0.9, cloth: '#2e3e5a' }); put('telescope', 19.9, -30.4, -0.6, {});
      put('picture', 15.4, -29.27, 0, { z: 1.5, w: 1.2, h: 0.8, c: '#d8ccaa', sea: true }); put('shelf', 13.7, -31.2, Math.PI / 2, { w: 1.6, goods: 'books' });
      lamp(17, -33, 2.7);
      // for sale: a blunderbuss on the sea wall, a pepperbox on the jetty's shed; the Grog Ration in the Signal Hut;
      // and the wreck chest may turn up on a plinth at the foot of the station's wall
      buy('blunderbuss', 500, -5, -38.72, 0, 1);
      buy('pepperbox', 250, -8.56, -64.1, 1, 0, DT);
      perk('grog', 17.6, -29.7, 0);
      spot(-9, -21.75, 0, -1, 0, 'yard');
    }
    if (typeof zmpPlace === 'function') zmpPlace(put, light, W, Z);   // [pap] the Lampwright's Bench (src/zmpap.js)
  },
  decor(H) {},
};

// ---------- Wrackhaven: the second map ----------
// A fishing village on the harbour, gone under one winter night and given back by the sea, laid out round its Square.
// You come ashore on the stone quay, through the harbour gate in the sea wall, and up Fish Street (the Chandlery on
// one side of it, the Fish Market on the other) to the Square. In the middle of the Square stands the town hall, of
// dressed stone, three floors high: the Moot Hall and the Clerk's Office on the ground, a stair up to the Records Room
// and the Council Chamber, and another up into the Belfry in its clock tower over the flat leaded roof. Round the
// Square a ring of houses, each with a door onto it and one through to its neighbours: the Smokehouse and the
// Cooperage at the harbour corners, the Drowned Man (the inn) and its kitchen on the west side, the Seamen's Chapel
// and its vestry on the east, and along the top the Forge and the School House, between the Boatyard and the
// Churchyard (both walled, open to the sky). The drowned come up the quay's ladders out of the water, in at the
// windows on the village's landward sides, and up the town hall's walls to its upper windows.
FPS_ISLES.wrack = Object.assign({}, FPS_ISLES.light, { name: 'Wrackhaven' });
FPI_GEN.wrack = {
  built: true,
  set(H) {
    const { I } = H, OX = FPSC.CX, OY = FPSC.CY, CE = ZMC.CEIL, DT = ZMD.TOP;
    const Z = I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    const { W, put, light, lamp, wall, room, buy, perk, spot } = zmKit(H, Z);
    const ZZ = ZM_MAPS.wrack.zones, PL = c => ({ mat: 'plaster', col2: c }), ST = { mat: 'stone' }, LOW = { mat: 'stone', hh: 2.6, cap: true };
    // (the town hall: its two floors, the height of each, and the Belfry's floor)
    const F1 = 4.4, F2 = 8.8, HS = { mat: 'stone', hh: F1 }, HS1 = { mat: 'stone', hh: F1, lift: F1 }, HP1 = { mat: 'plaster', col2: '#d0c8b2', hh: F1, lift: F1 };
    // (the new props of src/zmvillage.js, where they're loaded)
    const vput = (k, x, y, a, o) => FPI_K[k] ? put(k, x, y, a, o) : null;
    for (const k of Object.keys(ZZ)) if (!ZZ[k].sky && !ZZ[k].zr) room(k);
    room('moot', { ceil: false }); room('clerk', { ceil: false });
    const wl = (x, y, nx, ny, z) => { put('wlamp', x, y, Math.atan2(-nx, ny), { z: z || 2.3 }); light(x + nx * 0.42, y + ny * 0.42, (z || 2.3) + 0.05, '#ffc070', 9, 'lantern'); };
    // ---------- the walls round the village ----------
    // the front onto the harbour: the corner houses over the shingle (the drowned wade up out of the water to their
    // windows), the Chandlery's and the Fish Market's glazed windows onto the quay, the harbour gate between
    wall(-42, -42, -18, -42, ST, [{ at: -35, k: 'win', out: -1, z: 'smoke', shore: true }, { at: -27, k: 'win', out: -1, z: 'smoke', shore: true }]);
    wall(-18, -42, -4, -42, PL(ZZ.chandler.wall), [{ at: -14, k: 'glass' }, { at: -8, k: 'glass' }]);
    wall(-4, -42, 4, -42, ST, [{ at: 0, k: 'door', cost: 750, z: ['dock', 'street'] }]);
    wall(4, -42, 18, -42, ST, [{ at: 8, k: 'glass' }, { at: 14, k: 'glass' }]);
    wall(18, -42, 42, -42, PL(ZZ.cooper.wall), [{ at: 27, k: 'win', out: -1, z: 'cooper', shore: true }, { at: 35, k: 'win', out: -1, z: 'cooper', shore: true }]);
    // the landward sides
    wall(-42, -42, -42, -16, ST, [{ at: -36, k: 'win', out: -1, z: 'smoke' }, { at: -23, k: 'win', out: -1, z: 'smoke' }]);
    wall(-42, -16, -42, 6, PL(ZZ.inn.wall), [{ at: -10, k: 'win', out: -1, z: 'inn' }, { at: 0, k: 'win', out: -1, z: 'inn' }]);
    wall(-42, 6, -42, 20, PL(ZZ.kitchen.wall), [{ at: 13, k: 'win', out: -1, z: 'kitchen' }]);
    wall(-42, 20, -42, 44, LOW, [{ at: 27, k: 'win', out: -1, z: 'byard' }, { at: 37, k: 'win', out: -1, z: 'byard' }]);
    wall(42, -42, 42, -16, PL(ZZ.cooper.wall), [{ at: -35, k: 'win', out: 1, z: 'cooper' }, { at: -23, k: 'win', out: 1, z: 'cooper' }]);
    wall(42, -16, 42, 12, ST, [{ at: -9, k: 'win', out: 1, z: 'chapel' }, { at: 6, k: 'win', out: 1, z: 'chapel' }]);
    wall(42, 12, 42, 20, ST, [{ at: 16, k: 'win', out: 1, z: 'vestry' }]);
    wall(42, 20, 42, 44, LOW, [{ at: 27, k: 'win', out: 1, z: 'yard' }, { at: 37, k: 'win', out: 1, z: 'yard' }]);
    wall(-42, 44, -18, 44, LOW, [{ at: -36, k: 'win', out: 1, z: 'byard' }, { at: -24, k: 'win', out: 1, z: 'byard' }]);
    wall(-18, 44, 0, 44, ST, [{ at: -14, k: 'win', out: 1, z: 'forge' }, { at: -4, k: 'win', out: 1, z: 'forge' }]);
    wall(0, 44, 18, 44, PL(ZZ.school.wall), [{ at: 4, k: 'win', out: 1, z: 'school' }, { at: 14, k: 'win', out: 1, z: 'school' }]);
    wall(18, 44, 42, 44, LOW, [{ at: 25, k: 'win', out: 1, z: 'yard' }, { at: 35, k: 'win', out: 1, z: 'yard' }]);
    // ---------- round the ring, house to house ----------
    wall(-18, -42, -18, -16, PL(ZZ.chandler.wall), [{ at: -29, k: 'door', cost: 1000, z: ['chandler', 'smoke'] }]);
    wall(18, -42, 18, -16, ST, [{ at: -29, k: 'door', cost: 1000, z: ['market', 'cooper'] }]);
    wall(-42, -16, -18, -16, ST, [{ at: -30, k: 'door', cost: 1000, z: ['smoke', 'inn'] }]);
    wall(18, -16, 42, -16, PL(ZZ.cooper.wall), [{ at: 30, k: 'debris', cost: 1000, z: ['cooper', 'chapel'] }]);
    wall(-42, 6, -18, 6, PL(ZZ.inn.wall), [{ at: -30, k: 'door', cost: 750, z: ['inn', 'kitchen'] }]);
    wall(18, 12, 42, 12, PL(ZZ.vestry.wall), [{ at: 36, k: 'door', cost: 750, z: ['chapel', 'vestry'] }]);
    wall(-42, 20, -18, 20, PL(ZZ.kitchen.wall), [{ at: -24, k: 'door', cost: 1000, z: ['kitchen', 'byard'] }]);
    wall(18, 20, 42, 20, ST, [{ at: 30, k: 'door', cost: 1000, z: ['vestry', 'yard'] }]);
    wall(-18, 20, -18, 44, ST, [{ at: 32, k: 'debris', cost: 1000, z: ['forge', 'byard'] }]);
    wall(0, 20, 0, 44, PL(ZZ.school.wall), [{ at: 32, k: 'door', cost: 750, z: ['forge', 'school'] }]);
    wall(18, 20, 18, 44, PL(ZZ.school.wall), [{ at: 32, k: 'debris', cost: 1000, z: ['school', 'yard'] }]);
    // ---------- Fish Street's two sides, and the house fronts round the Square ----------
    wall(-4, -42, -4, -16, PL(ZZ.chandler.wall), [{ at: -34, k: 'glass' }, { at: -28, k: 'door', cost: 750, z: ['street', 'chandler'] }, { at: -21, k: 'glass' }]);
    wall(4, -42, 4, -16, ST, [{ at: -34, k: 'glass' }, { at: -28, k: 'door', cost: 750, z: ['street', 'market'] }, { at: -21, k: 'glass' }]);
    wall(-18, -16, -4, -16, PL(ZZ.chandler.wall), [{ at: -14, k: 'glass' }, { at: -9, k: 'door', cost: 1000, z: ['chandler', 'square'] }]);
    wall(-4, -16, 4, -16, LOW, [{ at: 0, k: 'debris', cost: 1000, z: ['street', 'square'] }]);
    wall(4, -16, 18, -16, ST, [{ at: 9, k: 'glass' }, { at: 14, k: 'glass' }]);
    wall(-18, -16, -18, 6, PL(ZZ.inn.wall), [{ at: -11, k: 'glass' }, { at: -4, k: 'door', cost: 1000, z: ['square', 'inn'] }, { at: 2, k: 'glass' }]);
    wall(-18, 6, -18, 20, PL(ZZ.kitchen.wall), [{ at: 13, k: 'glass' }]);
    wall(18, -16, 18, 12, ST, [{ at: -9, k: 'glass' }, { at: -2, k: 'door', cost: 1250, z: ['square', 'chapel'], w: 2.6 }, { at: 5, k: 'glass' }]);
    wall(18, 12, 18, 20, ST, [{ at: 16, k: 'glass' }]);
    wall(-18, 20, 0, 20, ST, [{ at: -13, k: 'glass' }, { at: -7, k: 'door', cost: 1000, z: ['square', 'forge'], w: 2.8 }]);
    wall(0, 20, 18, 20, PL(ZZ.school.wall), [{ at: 7, k: 'door', cost: 1000, z: ['square', 'school'] }, { at: 13, k: 'glass' }]);
    // ---------- the town hall ----------
    // its ground floor: the front onto the Square with the great door between two windows, the Clerk's Office at the
    // back with a door of its own
    wall(-11, -9, 11, -9, HS, [{ at: -8, k: 'win', out: -1, z: 'moot' }, { at: -4, k: 'glass' }, { at: 0, k: 'door', cost: 1250, z: ['square', 'moot'], w: 2.6 }, { at: 4, k: 'glass' }, { at: 8, k: 'win', out: -1, z: 'moot' }]);
    wall(-11, -9, -11, 7, HS);
    wall(11, -9, 11, 7, HS, [{ at: -4, k: 'win', out: 1, z: 'moot' }, { at: 3, k: 'win', out: 1, z: 'moot' }]);
    wall(-11, 7, -11, 13, HS, [{ at: 10, k: 'win', out: -1, z: 'clerk' }]);
    wall(11, 7, 11, 13, HS, [{ at: 10, k: 'glass' }]);
    wall(-11, 13, 11, 13, HS, [{ at: -6, k: 'win', out: 1, z: 'clerk' }, { at: 0, k: 'door', cost: 1000, z: ['square', 'clerk'] }, { at: 6, k: 'glass' }]);
    wall(-11, 7, 11, 7, PL(ZZ.moot.wall), [{ at: 6, k: 'door', cost: 750, z: ['moot', 'clerk'] }]);
    // its first floor (the drowned climb its walls to the windows)
    wall(-11, -9, 11, -9, HS1, [{ at: -8, k: 'win', out: -1, z: 'records' }, { at: 0, k: 'glass' }, { at: 8, k: 'win', out: -1, z: 'records' }]);
    wall(-11, -9, -11, 13, HS1, [{ at: -5, k: 'glass' }, { at: 9, k: 'win', out: -1, z: 'council' }]);
    wall(11, -9, 11, 13, HS1, [{ at: -4, k: 'win', out: 1, z: 'records' }, { at: 4, k: 'glass' }, { at: 10, k: 'win', out: 1, z: 'council' }]);
    wall(-11, 13, 11, 13, HS1, [{ at: -7, k: 'glass' }, { at: 7, k: 'glass' }]);
    wall(-8.2, 1, 11, 1, HP1, [{ at: 5, k: 'door', cost: 1000, z: ['council', 'records'], lift: F1 }]);
    // the parapet round the flat roof
    for (const [x, y, a, len] of [[0, -9.25, 0, 22.5], [0, 13.25, Math.PI, 22.5], [-11.25, 2, -Math.PI / 2, 22.5], [11.25, 2, Math.PI / 2, 22.5]]) {
      if (!vput('vparapet', x, y, a, { len, lift: F2 })) put('block', x - Math.sin(a) * 0.25, y + Math.cos(a) * 0.25, a, { w: len, d: 0.4, hh: 1.0, lift: F2 });
    }
    // the Belfry: the clock tower over the roof, louvred openings on three sides, on the fourth (over the Square's
    // north side) two windows the drowned climb all the way up to
    wall(-3.5, 7, 3.5, 7, { mat: 'stone', hh: 3.6, lift: F2 });
    wall(-3.5, 7, -3.5, 13, { mat: 'stone', hh: 3.6, lift: F2 }, [{ at: 10, k: 'arch', w: 1.6 }]);
    wall(3.5, 7, 3.5, 13, { mat: 'stone', hh: 3.6, lift: F2 }, [{ at: 10, k: 'arch', w: 1.6 }]);
    wall(-3.5, 13, 3.5, 13, { mat: 'stone', hh: 3.6, lift: F2 }, [{ at: -1.6, k: 'win', out: 1, z: 'belfry' }, { at: 1.6, k: 'win', out: 1, z: 'belfry' }]);
    // (the louvres in the arches: nobody goes out that way)
    for (const [x, y, a] of [[-3.5, 10, Math.PI / 2], [3.5, 10, Math.PI / 2]]) {
      if (!vput('vlouvre', x, y, a, { w: 1.6, z0: F2, z1: F2 + 2.9 })) put('glasspane', x, y, a, { w: 1.6, z0: F2, z1: F2 + 2.9 });
    }
    // the first floor's boards, round the hole the stair comes up through; the Belfry's, round its own
    for (const [x0, x1, y0, y1] of [[-11, 11, -9, -4], [-8.2, 11, -4, 5], [-11, 11, 5, 13]]) put('slab', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0, top: F1 });
    put('slab', 0, 11.025, 0, { w: 7, d: 3.45, top: F2 });   // (y 9.3 to 12.75: the stair comes up along its south side)
    put('slab', -2.75, 8.15, 0, { w: 1.5, d: 2.3, top: F2 });   // (and the landing at its head, against the west wall)
    // the ceilings: the first floor's under the leads (not over the Belfry); the Belfry's under its spire
    for (const [x0, x1, y0, y1] of [[-11, 11, -9, 7], [-11, -3.5, 7, 13], [3.5, 11, 7, 13]]) put('ceil', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0 + 0.4, d: y1 - y0 + (y0 === 7 ? 0.2 : 0.4), z0: F2 - 0.3, col: '#a8a290' });
    put('ceil', 0, 10, 0, { w: 7.2, d: 6.2, z0: F2 + 3.3, col: '#6a5440' });
    vput('vpyramid', 0, 10, 0, { w: 8.2, d: 6.9, z0: F2 + 3.6, rise: 3.4 });
    // the stairs: up the Moot Hall's west wall to the first floor (a gate across it), and from the Council Chamber
    // up into the Belfry (another)
    const RS = F1 / 16, stair = (x, y, a, n, base, w) => { const o = Object.assign({ w, d: 0.76, hh: n * RS }, base ? { lift: base } : {}); return vput('vstair', x, y, a, o) || put('step', x, y, a, o); };
    for (let n = 1; n <= 16; n++) stair(-9.55, -7 + (n - 0.5) * 0.75, 0, n, 0, 2.3);
    for (let n = 1; n <= 15; n++) stair(3.25 - (n - 8.5) * 0.75, 8.15, Math.PI / 2, n, F1, 1.4);
    // (along the stairs' open sides, unseen, from the floor to well over a tread: nobody jumps up onto a flight past
    // its gate, from the floor or from a tread below it)
    const side = (x, y, a, base, h) => put('glasspane', x, y, a, { w: 0.78, z0: base, z1: base + h + 1.7 });
    for (let n = 1; n <= 9; n++) { side(-8.35, -7 + (n - 0.5) * 0.75, Math.PI / 2, 0, n * RS); for (const y of [7.4, 8.9]) side(3.25 - (n - 8.5) * 0.75, y, 0, F1, n * RS); }
    const gate = (x, y, a, w, h, cost, zones) => { const p = put('zdoor', x, y, a, { w: w + 0.1, d: 0.16, hh: 2.6, lift: h - 0.3 }); const [gx, gy] = W(x, y); Z.doors.push({ x: gx, y: gy, z: h, ang: a, w, cost, zones, kind: 'gate', solids: p.sol.slice(), prop: p, open: false, id: Z.doors.length }); };
    gate(-9.55, -7 + 3 * 0.75, 0, 2.3, 3 * RS, 1500, ['moot', 'council']);
    gate(3.25 - (3 - 8.5) * 0.75 - 0.375, 8.15, Math.PI / 2, 1.4, F1 + 3 * RS, 1500, ['council', 'belfry']);
    // the rails round the stair holes, and the banisters up the flights
    // (only to look at: a fall into a stairwell lands you on the stair, past its gate, where you'd come from anyway)
    vput('vbanister', -11, -4, -Math.PI / 2, { len: 2.8, rise: 0, base: F1 }); vput('vbanister', -8.2, -4, 0, { len: 9, rise: 0, base: F1 });
    vput('vbanister', 3.25, 9.3, Math.PI / 2, { len: 4.5, rise: 0, base: F2 });
    vput('vbanister', -8.4, -7, 0, { len: 12, rise: F1, base: 0 });
    vput('vbanister', 9.25, 7.45, Math.PI / 2, { len: 11.25, rise: 15 * RS, base: F1 }); vput('vbanister', 9.25, 8.85, Math.PI / 2, { len: 7.5, rise: 10 * RS, base: F1 });
    // the portico on the Square: four columns, the entablature on them and a pediment over
    for (const x of [-4.6, -1.9, 1.9, 4.6]) { if (!vput('vcolumn', x, -10.6, 0, { r: 0.32, hh: F1 - 0.4 })) put('post', x, -10.6, 0, { r: 0.3, hh: F1 - 0.4 }); }
    put('block', 0, -10.4, 0, { w: 10.6, d: 1.4, hh: F1 + 0.3, z0: F1 - 0.4, col: '#9a968a' });
    vput('vpediment', 0, -11.1, 0, { w: 10.8, rise: 1.7, lift: F1 + 0.3 });
    put('step', 0, -10.2, 0, { w: 10.4, d: 2.0, hh: 0.12 });
    // ---------- the quay ----------
    {
      const onDeck = (k, x, y, ang, o) => put(k, x, y, ang || 0, Object.assign({ lift: DT }, o || {}));
      Z.bay = true; Z.decks = [];
      put('deck', 0, -48.625, 0, { w: 44, d: 12.75, top: DT }); Z.decks.push([OX - 22, OX + 22, OY - 55, OY - 42.25]);
      for (const [x0, x1, y0, y1] of [[-56, -22, -66, -42.25], [22, 56, -66, -42.25], [-56, 56, -80, -55]]) put('seaguard', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0 });
      const seaWin = (x, y, nx, ny) => { const [wx, wy] = W(x, y); Z.windows.push({ x: wx, y: wy, nx, ny, zone: 'dock', z: DT, boards: 0, sea: true, id: Z.windows.length, q: [], hw: 0.9, th: 0.1 }); put('ladder', x + nx * 0.07, y + ny * 0.07, Math.atan2(-nx, ny), { top: DT }); };
      seaWin(-16, -55, 0, -1); seaWin(-5.5, -55, 0, -1); seaWin(5.5, -55, 0, -1); seaWin(16, -55, 0, -1); seaWin(-22, -48.5, -1, 0); seaWin(22, -48.5, 1, 0);
      put('step', 0, -41.3, 0, { w: 7.4, d: 0.9, hh: DT * 0.5 });
      for (const [x, y, r] of [[-19.5, -54.66, 1], [-11, -54.66, 0], [0, -54.66, 1], [11, -54.66, 0], [19.5, -54.66, 1], [-21.66, -44.5, 0], [21.66, -52, 1]]) onDeck('bollard', x, y, 0, { rope: !!r, free: true });
      onDeck('shed', -17.6, -45.6, 0, { w: 3.2, d: 3.4, door: 1.0 });
      onDeck('mast', 18.6, -51.6, 0, { hh: 7 });
      onDeck('coil', -7.5, -44, 0, {}); onDeck('coil', 9, -53.6, 0, {});
      onDeck('crates', 8, -44.2, 0.2, { items: [{ u: 0, v: 0, s: 0.8, h0: 0, ry: 0.1 }, { u: 0.85, v: 0.1, s: 0.7, h0: 0, ry: -0.2 }, { u: 0.4, v: 0, s: 0.65, h0: 0.8, ry: 0.4 }] });
      onDeck('crates', -11.5, -52.8, -0.3, { items: [{ u: 0, v: 0, s: 0.75, h0: 0, ry: 0 }] });
      onDeck('rack', 13.5, -43.3, 0, { len: 3.4, nets: true });
      for (const [x, y, a] of [[-13, -54.4, Math.PI / 2], [13.2, -54.4, Math.PI / 2], [-21.4, -50.2, 0], [21.4, -45.2, Math.PI]]) {
        const pp = onDeck('post', x, y, a, { r: 0.13, hh: 2.5, lamp: true });
        light(x + Math.cos(a) * 0.5, y + Math.sin(a) * 0.5, DT + 2.15, '#ffc070', 10, 'lantern'); I.lights[I.lights.length - 1].p = pp;
      }
      wl(-2.6, -42.3, 0, -1, DT + 2.2); wl(2.6, -42.3, 0, -1, DT + 2.2);
      put('rowboat', -8.5, -57.6, 0.05, { paint: '#5a3a28', rope: 0.2 }); put('rowboat', 10.5, -57.8, -0.08, { paint: '#2e4a3a', len: 4.6 }); put('rowboat', -24.8, -50, Math.PI / 2 + 0.1, { paint: '#34465a', len: 3.8, beam: 1.25 });
      for (const [x, y, w, hh, gl] of [[-34, -61, 2.4, 1.6, 1], [28, -65, 2.8, 1.8, 1], [-12, -71, 2.0, 1.2, 0], [36, -51, 1.6, 0.9, 0], [8, -74, 2.2, 1.5, 1]]) put('gullrock', x, y, w * 2, { w, d: w * 0.8, hh, gull: !!gl, lean: (x % 3) * 0.05 });
      buy('pepperbox', 250, -15.5, -42.3, 0, -1, DT);
    }
    // ---------- Fish Street ----------
    put('floor', 0, -29, 0, { w: 7.5, d: 25.6, style: 'flags' });
    fpiLanternPost(H, OX - 3.1, OY - 36, 0); fpiLanternPost(H, OX + 3.1, OY - 24, Math.PI); fpiLanternPost(H, OX - 3.1, OY - 18.5, 0);
    put('cart', 2.4, -33, 0.2, {}); fpiBarrels(H, OX + 2.9, OY - 39.5); fpiPots(H, OX - 2.8, OY - 39); put('bench', -3.3, -31.5, Math.PI / 2, { w: 1.8 });
    put('plant', -3.2, -25, 0, { s: 1.0, flowers: '#d84050' }); put('plant', 3.2, -19.5, 0, { s: 0.9 }); put('coil', 2.9, -17.5, 0, {});
    buy('cutlass', 750, -3.7, -24, 1, 0);
    wl(-3.75, -31, 1, 0); wl(3.75, -31, -1, 0); wl(-3.75, -19, 1, 0); wl(3.75, -36.5, -1, 0);
    // ---------- the Square, round the town hall ----------
    for (const [x0, x1, y0, y1] of [[-18, 18, -16, -9], [-18, 18, 13, 20], [-18, -11, -9, 13], [11, 18, -9, 13]]) put('floor', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0 - 0.3, d: y1 - y0 - 0.1, style: 'flags' });
    put('well', -13.5, -12.5, 0.3, { r: 0.8, lamp: true }); light(-13.5 + 1.3 * Math.cos(0.3), -12.5 + 1.3 * Math.sin(0.3), 0.9, '#ffc070', 6, 'lantern');
    put('cross', 13.5, -12.5, 0, {});
    for (const [x, y, a] of [[-16.6, -14.6, 0], [16.6, -14.6, Math.PI], [-16.6, 18.6, 0], [16.6, 18.6, Math.PI], [-16.6, 2, 0], [16.6, 2, Math.PI]]) fpiLanternPost(H, OX + x, OY + y, a);
    for (const [x, y] of [[-14.5, -4], [-14.5, 8], [14.5, -4], [14.5, 8]]) put('tree', x, y, 0, { hh: 5.5 });
    put('bench', -12.3, 2, Math.PI / 2, { w: 2 }); put('bench', 12.3, 2, Math.PI / 2, { w: 2 }); put('bench', -12, 18.6, 0, { w: 2 }); put('bench', 12, 18.6, 0, { w: 2 });
    put('flagpole', 0, 17.2, 0, {});
    for (const [x, y] of [[-11.8, -9.6], [11.8, -9.6], [-11.8, 13.6], [11.8, 13.6]]) put('bush', x, y, 0, { s: 0.8, flowers: '#e8e0d0' });
    spot(15.2, 16.5, -1, 0, 0, 'square');
    // ---------- the Moot Hall: benches facing the dais, the Lampwright's Bench on it ----------
    put('step', 2, 5.6, 0, { w: 13, d: 2.4, hh: 0.3 });
    for (const y of [-5.5, -3, -0.5, 2]) for (const x of [-2.5, 6]) { if (!vput('vpew', x, y, Math.PI, { w: 4.2 })) put('bench', x, y, 0, { w: 4.2 }); }
    put('rug', 1.8, -2.5, Math.PI / 2, { w: 11, d: 2.2, c: '#5a2a2a' });
    for (const [x, y, a] of [[-10.7, -1.5, Math.PI / 2], [10.7, -0.5, -Math.PI / 2], [-4, 6.73, 0], [8, 6.73, 0]]) put('picture', x, y, a, { z: 2.2, w: 1.5, h: 1.0, c: '#b8a878' });
    for (const [x, y] of [[-3, -5], [6, -5], [-3, 2], [6, 2]]) lamp(x, y, 3.3, '#ffc070', F1 - 0.3);
    buy('longarm', 500, 10.7, -6.5, -1, 0);
    put('table', 2, 6.0, 0, { w: 2.4, d: 0.9, cloth: '#3e2a4a', lift: 0.3 });
    // ---------- the Clerk's Office ----------
    put('table', -6, 10, 0, { w: 2.2, d: 1.1 }); put('table', 6, 10, 0, { w: 2.2, d: 1.1 }); put('bench', -6, 9, 0, { w: 1.4 }); put('bench', 6, 9, 0, { w: 1.4 });
    if (!vput('vbookcase', 3.4, 12.75, 0, { w: 2.6, goods: 'ledgers' })) put('shelf', 3.4, 12.4, 0, { w: 2.6, goods: 'jars' });
    vput('vbookcase', 10.75, 10, -Math.PI / 2, { w: 2.4, goods: 'ledgers' });
    put('shelf', -3, 7.5, Math.PI, { w: 2.4, goods: 'crates' }); fpiCrates(H, OX - 9.6, OY + 8.3, false);
    lamp(-5, 10, 3.3, '#ffc070', F1 - 0.3); lamp(5, 10, 3.3, '#ffc070', F1 - 0.3);
    // ---------- the Records Room (up the stair): shelves of the parish's books, the drowned's names in them ----------
    for (const x of [-3, 1.5, 6]) { if (!vput('vbookcase', x, -4, 0, { w: 3.2, goods: 'ledgers', lift: F1 })) put('shelf', x, -4, 0, { w: 3.2, goods: 'jars', lift: F1 }); }
    vput('vbookcase', -5, -8.75, Math.PI, { w: 4, goods: 'books', lift: F1 }); vput('vbookcase', 5, -8.75, Math.PI, { w: 4, goods: 'books', lift: F1 });
    put('table', 3, -1, 0, { w: 3, d: 1.2, lift: F1 }); put('globe', 9, -1, 0, { lift: F1 });
    lamp(-3, -6, F1 + 3.0, '#ffc070', F2 - 0.3); lamp(5, -6, F1 + 3.0, '#ffc070', F2 - 0.3); lamp(3, -1, F1 + 3.0, '#ffc070', F2 - 0.3);
    buy('harpoon', 1000, -10.7, -7.2, 1, 0, F1);
    spot(-6.5, 0.2, 0, -1, F1, 'records');
    if (typeof zmpPlace === 'function') zmpPlace(put, light, W, Z, { x: 10.25, y: -7.3, z: F1, nx: -1, ny: 0, zone: 'records' });   // [pap] up in the Records Room
    // ---------- the Council Chamber: the long table, the Grog Ration ----------
    if (!vput('vcounciltable', -2.5, 4.2, 0, { w: 7, d: 1.8, lift: F1 })) put('table', -1.5, 3.6, 0, { w: 7, d: 1.8, lift: F1 });
    put('rug', -2, 4.2, 0, { w: 10, d: 4, c: '#3e2a4a', lift: F1 });
    for (const [x, y, a] of [[-10.7, 4, Math.PI / 2], [2, 12.73, 0], [10.7, 7, -Math.PI / 2]]) put('picture', x, y, a, { z: 2.0, w: 1.2, h: 1.5, c: '#a89070', lift: F1 });
    lamp(-6, 5, F1 + 3.0, '#ffc070', F2 - 0.3); lamp(3, 4, F1 + 3.0, '#ffc070', F2 - 0.3); lamp(-6, 10.5, F1 + 3.0, '#ffc070', F2 - 0.3);
    perk('grog', -5, 12.3, 0, F1);
    // ---------- the Belfry: the old bell, hung again ----------
    put('bellframe', 0.4, 11.0, 0, { lift: F2 });
    lamp(-2.4, 9.4, F2 + 2.6, '#ffc070', F2 + 3.3);
    // ---------- the Chandlery: rope, nets, lamp oil, everything a boat wants ----------
    put('table', -11, -33, 0, { w: 5, d: 1.1 });
    put('shelf', -16.6, -16.6, 0, { w: 2.2, goods: 'cans' }); put('shelf', -17.4, -24, Math.PI / 2, { w: 2.4, goods: 'jars' }); put('shelf', -17.4, -37, Math.PI / 2, { w: 2.2, goods: 'crates' });
    put('coil', -16, -27, 0, {}); put('coil', -16.5, -40.4, 0, {}); fpiCrates(H, OX - 6.5, OY - 40.5, false); fpiBarrels(H, OX - 16.4, OY - 35);
    put('rack', -11, -41.3, 0, { len: 3, nets: true }); put('anchor', -6.5, -36.5, 0.4, {});
    lamp(-11, -36); lamp(-11, -24);
    buy('blunderbuss', 500, -4.3, -24, -1, 0);
    // ---------- the Fish Market: trestles, brine vats, boxes ----------
    for (const [x, y] of [[8.5, -36], [14, -36], [8.5, -27], [14, -27]]) put('table', x, y, 0, { w: 3.6, d: 1.2 });
    for (const [x, y] of [[16.8, -40.6], [16.8, -17.6]]) put('tank', x, y, 0, { r: 0.85, hh: 1.4, c: '#3a4a44' });
    fpiBarrels(H, OX + 5.3, OY - 17.4); fpiCrates(H, OX + 11, OY - 17.3, true); fpiPots(H, OX + 11, OY - 31.5);
    lamp(11, -36); lamp(11, -24);
    buy('longarm', 500, 17.7, -31.5, -1, 0);
    // ---------- the Smokehouse: the fish hanging over the fires ----------
    for (const y of [-38, -34, -30, -26, -22, -18.5]) put('herbs', -28, y, 0, { w: 18, z: 3.3 });
    put('stove', -39.6, -41.1, 0, {}); light(-39.85, -40.6, 0.5, '#ff8a30', 7, 'fire'); put('stove', -20.4, -41.1, 0, {}); light(-20.65, -40.6, 0.5, '#ff8a30', 7, 'fire');
    fpiBarrels(H, OX - 40.6, OY - 17.6); put('rack', -19, -21, Math.PI / 2, { len: 3 }); put('sacks', -23, -17.2, 0.2, { c: '#5a4a36' });
    lamp(-34, -30, 2.7, '#ffa060'); lamp(-24, -30, 2.7, '#ffa060');
    buy('harpoon', 1000, -31, -41.7, 0, 1);
    perk('quick', -41.3, -29.5, Math.PI / 2);
    // ---------- the Cooperage: casks on the cradle, hoops and staves ----------
    for (const [x, y, a] of [[24, -36, 0], [24, -31, 0.1], [36, -36, -0.1]]) { if (!vput('vcask', x, y, a, { s: 1 })) fpiBarrels(H, OX + x, OY + y); }
    vput('vhoops', 36, -30, 0.3, {}); vput('vhoops', 22, -19, 0, {});
    put('table', 30, -24, 0, { w: 4, d: 1.2 }); fpiBarrels(H, OX + 40.4, OY - 40.4); fpiBarrels(H, OX + 40.4, OY - 18); fpiBarrels(H, OX + 19.8, OY - 40.5);
    put('rack', 41.3, -29, Math.PI / 2, { len: 3 }); put('sacks', 33, -17.3, 0.3, { c: '#6a5a40' });
    lamp(24, -29); lamp(36, -24);
    buy('avtomat', 1200, 24, -16.3, 0, -1);
    spot(41.3, -38, -1, 0, 0, 'cooper');
    // ---------- the Drowned Man: the tap room, the hearth, the bar ----------
    put('stove', -36, 5.25, 0, {}); light(-36.25, 4.75, 0.5, '#ff8a30', 7, 'fire');
    put('table', -21, -6, Math.PI / 2, { w: 6, d: 1.0 }); fpiBarrels(H, OX - 19.2, OY - 13.6); fpiBarrels(H, OX - 19.2, OY + 1.5);
    for (const [x, y, c] of [[-36, -12, '#7a2a24'], [-36, -4, '#3e5a6a'], [-36, 2, '#7a2a24'], [-28, -11, '#3e5a6a'], [-28, -3, '#7a2a24']]) { put('table', x, y, 0, { w: 2.2, d: 1.1, cloth: c }); put('bench', x, y - 0.95, 0, { w: 1.9 }); put('bench', x, y + 0.95, 0, { w: 1.9 }); }
    put('shelf', -24.5, -15.4, 0, { w: 2.4, goods: 'jars' }); put('rug', -35, 1.5, 0, { w: 3.2, d: 2, c: '#5a2a2a' });
    put('picture', -24, 5.73, Math.PI, { z: 1.8, w: 1.4, h: 0.9, c: '#c8b890', sea: true });
    lamp(-36, -8); lamp(-28, -7); lamp(-22, -2);
    perk('stout', -41.3, -5, Math.PI / 2);
    // ---------- the Inn Kitchen ----------
    put('stove', -40.8, 9, Math.PI / 2, {}); light(-40.3, 9, 0.5, '#ff8a30', 6, 'fire');
    put('table', -30, 13, 0, { w: 4, d: 1.4 }); put('shelf', -31, 19.4, 0, { w: 3, goods: 'jars' }); put('shelf', -37, 19.4, 0, { w: 3, goods: 'cans' });
    put('sacks', -21, 7.2, 0.2, { c: '#6a5a40' }); fpiBarrels(H, OX - 19.4, OY + 18.4); fpiPots(H, OX - 24, OY + 9);
    put('herbs', -30, 16, 0, { w: 6, z: 3.0 });
    lamp(-30, 13);
    spot(-19.3, 11, -1, 0, 0, 'kitchen');
    // ---------- the Seamen's Chapel: pews, the altar, Second Wind ----------
    for (const y of [-12, -9, -6, -3, 0, 3]) for (const x of [24, 35]) { if (!vput('vpew', x, y, Math.PI, { w: 6 })) put('bench', x, y, 0, { w: 6 }); }
    put('table', 29.5, 9.6, 0, { w: 3.2, d: 1.1, cloth: '#e8e0d0' }); put('step', 29.5, 9.6, 0, { w: 7, d: 3.6, hh: 0.2 });
    put('rug', 29.5, -2, Math.PI / 2, { w: 22, d: 2.2, c: '#3e2a4a' });
    for (const [x, y] of [[19.2, 10.6], [40.8, 10.6]]) put('plant', x, y, 0, { s: 1.2, flowers: '#e8e0d0' });
    for (const [x, y, a] of [[41.73, 0, -Math.PI / 2], [18.27, 9, Math.PI / 2], [29.5, 11.73, 0]]) put('picture', x, y, a, { z: 1.9, w: 1.1, h: 1.4, c: '#b8a878' });
    lamp(24, -6); lamp(35, -6); lamp(29.5, 6); lamp(29.5, -12);
    buy('blunderbuss', 500, 41.7, -13, -1, 0);
    perk('wind', 41.3, -2, -Math.PI / 2);
    // ---------- the Vestry ----------
    put('table', 30, 16, 0, { w: 3, d: 1.2 }); vput('vbookcase', 21, 19.75, 0, { w: 2.4, goods: 'books' }); put('shelf', 38, 19.4, 0, { w: 2.4, goods: 'jars' });
    put('picture', 41.73, 16, -Math.PI / 2, { z: 1.8, w: 1.0, h: 1.3, c: '#a89070' }); lamp(30, 16);
    // ---------- the Forge: the hearth, the anvil, Fleet Foot ----------
    if (!vput('vforge', -9, 43.75, 0, { w: 2.6, d: 1.8 })) put('stove', -9, 43, 0, {});
    light(-9, 42.85, 1.0, '#ff7a2a', 9, 'fire');
    if (!vput('vanvil', -7, 38.5, 0.3, {})) put('block', -7, 38.5, 0, { w: 0.6, d: 0.4, hh: 0.8 });
    put('coalheap', -16, 42, 0, { r: 1.0, hh: 0.8, shovel: true }); fpiBarrels(H, OX - 1.5, OY + 42.4); put('rack', -17.4, 27, Math.PI / 2, { len: 3 }); put('table', -5, 31, 0, { w: 3, d: 1.2 });
    lamp(-9, 26); lamp(-5, 37);
    perk('fleet', -17.3, 38, Math.PI / 2);
    spot(-1.3, 25, -1, 0, 0, 'forge');
    // ---------- the School House: desks in rows, the slate, the master's desk ----------
    for (const y of [26, 29, 32, 35]) for (const x of [5, 9, 13]) { if (!vput('vdesk', x, y, Math.PI, { w: 1.4 })) put('table', x, y, 0, { w: 1.3, d: 0.6 }); }
    vput('vboard', 9, 43.73, 0, { w: 3.2 }); put('table', 9, 40, 0, { w: 2.4, d: 1.0 }); put('globe', 15.5, 40.5, 0, {});
    vput('vbookcase', 17.75, 30, -Math.PI / 2, { w: 2.4, goods: 'books' }); put('shelf', 1.3, 38, Math.PI / 2, { w: 2.2, goods: 'jars' });
    lamp(6, 30); lamp(12, 30); lamp(9, 39);
    buy('avtomat', 1200, 0.3, 26, 1, 0);
    // ---------- the Boatyard: a boat on the stocks, timber, oars ----------
    put('floor', -30, 32, 0, { w: 4.2, d: 10, style: 'boards' });
    put('boat', -30, 32, 0, { len: 7.2, beam: 2.3, paint: '#6a3428', upright: true });
    put('rack', -41.2, 33, Math.PI / 2, { len: 3, nets: true }); put('coil', -21, 24, 0, {}); fpiCrates(H, OX - 40.5, OY + 42.5, true); fpiBarrels(H, OX - 20.5, OY + 42.5);
    put('anchor', -36, 25, 1.2, {}); put('bench', -24, 38, 0.3, { w: 2.2 });
    fpiLanternPost(H, OX - 34.5, OY + 22, 0); fpiLanternPost(H, OX - 22.5, OY + 41.5, Math.PI);
    buy('blunderbuss', 500, -41.7, 40, 1, 0);
    spot(-19, 30, -1, 0, 0, 'byard');
    // ---------- the Churchyard: the village's graves, under the chapel's wall ----------
    { const rr = seeded(0x6a5e);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        const x = 22.5 + i * 5 + (rr() - 0.5), y = 25 + j * 6.5 + (rr() - 0.5), k = (i * 3 + j) % 5;
        if (k === 4) { if (!vput('vtomb', x, y + 0.6, 0, { w: 1.0, d: 2.0 })) put('headstone', x, y, 0, { w: 0.9, hh: 1.0, style: 1 }); }
        else if (!vput('vgrave', x, y, (rr() - 0.5) * 0.2, { kind: k })) put('headstone', x, y, (rr() - 0.5) * 0.2, { w: 0.7, hh: 0.9, style: k % 3, lean: (rr() - 0.5) * 0.2 });
      }
      put('cross', 39.5, 41.5, 0, {}); put('bush', 21, 42.4, 0, { s: 1.3 }); put('bush', 40.5, 22.5, 0, { s: 1.1, flowers: '#e8e0d0' });
      fpiLanternPost(H, OX + 20, OY + 34, 0);
    }
    spot(40.6, 32, -1, 0, 0, 'yard');
    // ---------- the roofs: slate on the houses, the chapel's steeper; chimneys ----------
    for (const [cx, cy, w, d, rise, a] of [[-11, -29, 14, 26, 3.2, 0], [11, -29, 14, 26, 3.0, 0], [-30, -29, 24, 26, 4.0, 0], [30, -29, 24, 26, 3.8, 0], [-30, 2, 24, 36, 4.2, 0], [30, 2, 24, 36, 6.4, 0], [-9, 32, 18, 24, 3.4, 0], [9, 32, 18, 24, 3.6, 0]])
      put('roof', cx, cy, a, { w: w + 0.8, d: d + 0.8, z0: CE + 0.3, rise, mat: 'wood' });
    for (const [x, y, hh] of [[-36, -40, 4.2], [-30, 4.8, 4.8], [-38, 13, 4.6], [-9, 43.2, 4.4], [12, -40.6, 3.6], [36, -40.6, 4.4]]) vput('vchimney', x, y, 0, { w: 1.0, d: 0.8, z0: CE, hh });
    // ---------- grass in the boatyard, the churchyard and round the village; stones out on the hill ----------
    { const rr = seeded(0x77ac); let n = 0;
      for (let t = 0; t < 5000 && n < 560; t++) {
        const x = (rr() - 0.5) * 170, y = (rr() - 0.5) * 150;
        const inYard = ((x > -41.4 && x < -18.6) || (x > 18.6 && x < 41.4)) && y > 20.6 && y < 43.4 && !(Math.abs(x + 30) < 2.4 && Math.abs(y - 32) < 5.4);
        const outside = (x < -42.6 || x > 42.6 || y > 44.6) && Math.hypot(x, y) < FPSC.R - 4 && y > ZM_SHORE(x) + 0.6;
        if (!(inYard || outside)) continue;
        if (inYard && I.solids.some(s => s.mv !== false && Math.abs(s.x - OX - x) < 6 && Math.abs(s.y - OY - y) < 6 && fpiDist(s, OX + x, OY + y) < 0.3)) continue;
        H.decor('tuft', OX + x, OY + y, { s: 0.7 + rr() * 0.8, c: rr() < 0.5 ? '#4e6a38' : '#5e7040' }); n++;
      }
      for (let i = 0; i < 24; i++) { const a = rr() * 6.283, d = 56 + rr() * 26, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9; if (Math.hypot(x, y) < FPSC.R - 6 && y > ZM_SHORE(x) + 2 && !(Math.abs(x) < 47 && y < 49)) put('stone', x, y, rr() * 6.283, { w: 0.9 + rr(), d: 0.6 + rr() * 0.5, hh: 0.6 + rr() * 1.2, lean: (rr() - 0.5) * 0.3 }); }
    }
    Z.glass = (Z.glassQ || []).slice();
    // ---------- dressing the fronts ----------
    // (a wall prop goes on a wall's face, its front out along (sin a, -cos a): fa gives that angle)
    const fa = (nx, ny) => Math.atan2(nx, -ny), at0 = (x, y, z) => zmZoneAt(OX + x, OY + y, z || 0), out = k => !k || ZZ[k].sky;
    // shutters at every window that looks out onto the street, the Square or the hills (not on the town hall), a box
    // of flowers under some of them; a hood over each house door onto the street or the Square
    { let i = 0;
      const dress = (x, y, ang, z, door, w) => {
        const nx = Math.round(Math.sin(ang)), ny = Math.round(-Math.cos(ang));
        for (const s of [1, -1]) {
          const ox = nx * s, oy = ny * s, k = at0(x + ox * 1.2, y + oy * 1.2, z);
          if (!out(k) || (Math.abs(x) < 11.6 && y > -9.6 && y < 13.6)) continue;
          if (!door && (z || 0) < 0.5 && (k || at0(x - ox * 1.2, y - oy * 1.2) !== 'dock')) { vput('vshutters', x + ox * 0.26, y + oy * 0.26, fa(ox, oy), { w: w || 1.6 }); if (i++ % 3 === 0 && k) vput('vwinbox', x + ox * 0.26, y + oy * 0.26, fa(ox, oy), { w: 1.4, flowers: ['#d84050', '#e8e0d0', '#e8c050'][i % 3] }); }
          if (door && k && ZZ[k].sky && k !== 'dock') vput('vcanopy', x + ox * 0.26, y + oy * 0.26, fa(ox, oy), { w: (w || 2.2) + 0.5 });
          break;
        }
      };
      for (const g of Z.glassQ || []) { const x = g.x - OX, y = g.y - OY; dress(x, y, Math.abs(Math.sin(g.ang)) > 0.5 ? Math.PI / 2 : 0, g.z0 - 1.0, false, g.w); }
      for (const w of Z.windows) if (!w.sea) dress(w.x - OX, w.y - OY, w.ny ? 0 : Math.PI / 2, w.z, false, 1.6);
      for (const d of Z.doors) if (d.kind === 'door' && !d.z) dress(d.x - OX, d.y - OY, Math.abs(Math.sin(d.ang)) > 0.5 ? Math.PI / 2 : 0, 0, true, d.w);
    }
    // half-timbering on the plaster fronts onto the street and the Square
    const G = (u, w) => ({ u, w: w || 1.6, z0: 1.0, z1: 2.35 }), DR = (u, w) => ({ u, w: w || 2.2, z0: 0, z1: 2.5 });
    for (const [x, y, a, len, opens] of [
      [-3.75, -29, Math.PI / 2, 26, [G(-5), DR(1), G(8)]], [-17.75, -5, Math.PI / 2, 22, [G(-6), DR(1), G(7)]], [-17.75, 13, Math.PI / 2, 14, [G(0)]],
      [9, 19.75, 0, 18, [DR(-2), G(4)]], [-11, -15.75, Math.PI, 14, [G(3), DR(-2)]]]) vput('vtimber', x, y, a, { len, opens });
    // trade signs over the doors
    for (const [x, y, a, glyph] of [[-3.75, -26.4, Math.PI / 2, 'rope'], [3.75, -26.4, -Math.PI / 2, 'fish'], [-17.75, -1.8, Math.PI / 2, 'mug'], [-9.2, 19.75, 0, 'anvil'],
      [9.2, 19.75, 0, 'book'], [17.75, 0.2, -Math.PI / 2, 'bell'], [-11.2, -15.75, Math.PI, 'key']]) vput('vsign', x, y, a, { glyph });
    // dressed stone at the village's corners and the town hall's; the hall's plinth, its cornices and its clock
    for (const [x, y, a, hh] of [[-42.25, -42.25, 0, CE], [42.25, -42.25, Math.PI / 2, CE], [42.25, 44.25, Math.PI, 2.6], [-42.25, 44.25, -Math.PI / 2, 2.6],
      [-11.25, -9.25, 0, F2], [11.25, -9.25, Math.PI / 2, F2], [11.25, 13.25, Math.PI, F2], [-11.25, 13.25, -Math.PI / 2, F2]]) vput('vquoins', x, y, a, { hh });
    for (const [x, y, a] of [[0, -9.25, 0], [0, 13.25, Math.PI], [-11.25, 2, -Math.PI / 2], [11.25, 2, Math.PI / 2]]) {
      vput('vbase', x, y, a, { len: 22.5 });
      vput('vcornice', x, y, a, { len: 22.5, lift: F2, e0: a === 0 || a === Math.PI, e1: a === 0 || a === Math.PI });
      vput('vcornice', x, y, a, { len: 22.5, lift: F1, c: '#8e8a7e' });
    }
    vput('vclock', 0, 6.75, 0, { r: 0.95, z: 1.9, lift: F2 });
    for (const [x, y, a] of [[-3.75, -41.75, 0], [17.75, -41.75, 0], [-41.75, 5.8, -Math.PI / 2], [41.75, 11.8, Math.PI / 2], [-0.25, 43.75, Math.PI]]) vput('vdownpipe', x, y, a, { hh: CE });
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
  const D = ZM_MAPS[ZM_MAP];
  fpsIsleGen(G, 0, seeded(D.seed), D.isle);
  G.island.key = G.isle.key = D.isle + ':' + Date.now();
  return G;
}
// which room a place is in (and the lantern room, up the tower)
function zmZoneAt(x, y, z) {
  const lx = x - FPSC.CX, ly = y - FPSC.CY, tx = lx - ZMT.X, ty = ly - ZMT.Y;
  // in the tower: which floor, and which half of it
  if (zmTower() && Math.hypot(tx, ty) < ZMT.R + 0.2) {
    if ((z || 0) >= ZMT.RF - 0.6 && Math.hypot(tx, ty) < ZMT.RW + 0.5) return 'roof';
    let k = 0; for (let i = 1; i < 6; i++) if ((z || 0) >= ZMT.L[i] - 0.6) k = i;
    return k === 0 ? 'tower' : k === 5 ? 'top' : 'tw' + k + (ty >= 0 ? 'n' : 's');
  }
  for (const k in ZM_ZONES) {
    if (k === 'tower') continue;
    // (a room on an upper floor, or under one: zr, the height of its floor and of the next one up)
    const zr = ZM_ZONES[k].zr; if (zr && ((z || 0) < zr[0] - 0.6 || (z || 0) >= zr[1] - 0.6)) continue;
    for (const r of ZM_ZONES[k].r2 ? [ZM_ZONES[k].r, ZM_ZONES[k].r2] : [ZM_ZONES[k].r]) { const [x0, x1, y0, y1] = r; if (lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1) return k; }
  }
  return null;
}
const zmZoneName = k => ZM_TROOMS[k] || (ZM_ZONES[k] ? ZM_ZONES[k].n : '');
// is this room open to you yet (and so to them)?
const zmOpen = k => ZM.open.has(k);

// the middle of one of them, to aim a beam, a blade or a spark at (feet up): chest-high on the drowned, lower on
// anything shorter (a crab's shell sits well under where a man's chest would be, and a line to there passed over it)
const zmMid = o => (o.jz || 0) + (o.tall ? Math.min(1.2, o.tall * 0.6) : 1.2);

// ---------- standing, walking and climbing ----------
// the solids near a place (the index the islands use)
function zmNear(x, y) { const I = FPS.g.isle; return I.sh.get(Math.floor(x / 6) * 65536 + Math.floor(y / 6)) || []; }
// in the way of something whose feet are at height feet? (stairs and floors low enough to step up onto aren't)
function zmBlockedAt(x, y, pad, feet) {
  if (Math.hypot(x - FPSC.CX, y - FPSC.CY) > FPSC.R - 1.5) return true;
  if (typeof raidBlock === 'function' && raidBlock(x, y, pad, feet)) return true;   // [raid] src/raid.js
  for (const s of zmNear(x, y)) {
    // (only what stands across the height of your body: not a floor above your head, nor one you can step up on,
    // nor anything below your feet)
    const bot = s.z0 != null ? s.z0 - FPSC.GROUND : 0, top = s.z1 - FPSC.GROUND;
    if (bot >= feet + 1.9 || top <= feet + (s.fl ? ZMC.STEP : 0.05)) continue;
    if (fpiDist(s, x, y) < pad) return true;
  }
  return false;
}
// how much room there is round a place (the nearest solid in the way, less pad: below 0 is in it), for sliding along
function zmRoom(x, y, pad, feet) {
  let d = 9;
  for (const s of zmNear(x, y)) {
    const bot = s.z0 != null ? s.z0 - FPSC.GROUND : 0, top = s.z1 - FPSC.GROUND;
    if (bot >= feet + 1.9 || top <= feet + (s.fl ? ZMC.STEP : 0.05)) continue;
    d = Math.min(d, fpiDist(s, x, y) - pad);
  }
  return d;
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
// The windows are the drowned's way in, never yours out: for a player each window's opening is filled, sill to
// lintel and a little either side, boarded or not, walking or jumping. How far into that a place is (0: clear of
// every one); n points out of the station, so the room's side is a < 0
function zmWinPen(x, y, pad, feet) {
  let pen = 0;
  for (const w of ZM.windows || []) {
    if (w.hatch) continue;
    const wz = w.z || 0; if (feet < wz - 0.6 || feet > wz + 2.4) continue;
    const dx = x - w.x, dy = y - w.y, a = dx * w.nx + dy * w.ny, t = -dx * w.ny + dy * w.nx, in0 = (w.th || 0.3) + 0.05 + pad;
    if (a > -in0 && a < 1.2 && Math.abs(t) < (w.hw || 0.8) + 0.05) pen = Math.max(pen, a + in0);
  }
  return pen;
}
// move with sliding, then stand on whatever's underneath: step up onto it, step down a stair, or fall
function zmMove(m, dx, dy) {
  const me = m === FPS.me, feet = m.jz || 0, pad = m.zpad || (me ? ZMC.PAD : 0.5);
  // (you can't walk through them: the drowned crowd you in; nor out through a window: only further back from one)
  const pen0 = m === FPS.me ? zmWinPen(m.x, m.y, pad, feet) : 0;
  const free = m === FPS.me ? (x, y) => !zmBlockedAt(x, y, pad, feet) && !zmCrowd(m, x, y) && (pen0 => { const p = zmWinPen(x, y, pad, feet); return p <= 0 || p < pen0 - 1e-6; })(pen0) : (x, y) => !zmBlockedAt(x, y, pad, feet);
  let ok = true;
  let sx = 0, sy = 0;
  // (you, against something: slide along it rather than stop, whichever way it runs: the wall's lie from how the room
  // round you changes, and whatever of the step goes into it taken off)
  if (me && !free(m.x + dx, m.y + dy)) {
    const e = 0.04, gx = zmRoom(m.x + e, m.y, pad, feet) - zmRoom(m.x - e, m.y, pad, feet), gy = zmRoom(m.x, m.y + e, pad, feet) - zmRoom(m.x, m.y - e, pad, feet), g = Math.hypot(gx, gy);
    if (g > 1e-6) {
      const nx = gx / g, ny = gy / g, into = Math.min(0, dx * nx + dy * ny); sx = dx - nx * into; sy = dy - ny * into;
      // (in a corner, or along a rail of short straight lengths, that can run straight into the next: turn the step
      // further away from the wall, a little at a time, shorter as it turns)
      if (!free(m.x + sx, m.y + sy)) {
        let done = false;
        for (let k = 1; k <= 6 && !done; k++) for (const side of [1, -1]) {
          const t = side * k * 0.25, c = Math.cos(t), sn = Math.sin(t), f = Math.max(0.3, Math.cos(k * 0.25));
          const rx = (dx * c - dy * sn) * f, ry = (dx * sn + dy * c) * f;
          // (only a way that doesn't go further into the wall than the slide does)
          if (rx * nx + ry * ny >= -1e-4 && free(m.x + rx, m.y + ry)) { sx = rx; sy = ry; done = true; break; }
        }
      }
    }
  }
  if (free(m.x + dx, m.y + dy)) { m.x += dx; m.y += dy; }
  else if ((sx || sy) && free(m.x + sx, m.y + sy)) { m.x += sx; m.y += sy; }
  else if ((sx || sy) && free(m.x + sx * 0.5, m.y + sy * 0.5)) { m.x += sx * 0.5; m.y += sy * 0.5; }
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
    // (they still block you, but only about as wide as a body: you can slip past one at a doorway's edge)
    if (d < (z.boss ? z.crowdR || 1.05 : ZMC.BODY) && d < Math.hypot(z.x - m.x, z.y - m.y) - 0.001) return true;   // [boss] they're broader
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
function zmSpeedK() { return (ZM.perks.fleet ? 1.22 : 1) * (typeof zbSpeedK === 'function' ? zbSpeedK() : 1) * (typeof raidSpeedK === 'function' ? raidSpeedK() : 1); }   // [boss] (dragged by the false light)
function zmReloadK() { return (ZM.perks.quick ? 0.5 : 1) * (typeof rclReloadK === 'function' ? rclReloadK() : 1); }   // [classes] (Maren's End: the blunderbuss quicker)
function zmCanReload() { const w = fpsW(); return w.melee || (ZM.res[FPS.weapon] || 0) > 0; }

// ---------- the grid the drowned find their way by ----------
// Cells half a metre across over the whole station. A cell can have several places to stand, one above another
// (the ground, a stair tread, each floor of the tower): each is a node, with its height. From wherever you are (all
// of you, together), how far each node is from the nearest of you, walking round walls and up and down stairs.
function zmNavBuild() {
  // (from the Store Hall's north wall down to the end of the jetty, from the Wreck Store to the Boathouse)
  const B = ZM_MAPS[ZM_MAP].nav || [-46, 46, -68, 28], S = ZMC.NAV, x0 = FPSC.CX + B[0], y0 = FPSC.CY + B[2], nx = Math.ceil((B[1] - B[0]) / S), ny = Math.ceil((B[3] - B[2]) / S), nc = nx * ny;
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
  if (a < 0) {
    // (squeezed off the grid, hard against a wall or the newel: back to the nearest place on it at this height that
    // leads to you)
    const c = zmCell(x, y); if (c < 0) return null;
    const ci = c % N.nx, cj = (c - ci) / N.nx; let bd = 1e9, bc = -1;
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N.nx || j >= N.ny) continue;
      const b = zmNodeIn(j * N.nx + i, jz || 0, 0.7); if (b < 0 || N.d[b] >= 1e8) continue;
      const k = (di * di + dj * dj) * 4 + N.d[b]; if (k < bd) { bd = k; bc = j * N.nx + i; }
    }
    if (bc < 0) return null;
    const bi = bc % N.nx, bj = (bc - bi) / N.nx;
    return [N.x0 + (bi + 0.5) * N.S, N.y0 + (bj + 0.5) * N.S];
  }
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
    z: [], drops: [], perks: {}, windBuys: 0, double: 0, insta: 0, dropsRound: 0, swarm: false, skitT: 0, kills: 0, heads: 0, downs: 0, spent: 0, doorsOpened: 0,
    open: new Set(['dock']), zone: 'dock', zoneT: 4, banner: null, pops: [], fx: [], sparks: [], over: null, earnK: 0, navT: 0,
    box: { at: 0, uses: 0, spins: 0, st: 'idle', t: 0, item: null, cyc: 0, show: 'avtomat', owner: null }, near: null, rebuildT: 0, groanT: 2,
    zc: 0, credit: {}, players: [], downT: 0, unstickAt: 0, unstickMine: 0, ghost: false, revT: 0, revOf: null, upT: {}, downNotes: [], downKit: null, beat: 0, boardBy: {}, boardPts: 0,
    doors: Zd.doors, windows: Zd.windows, buys: Zd.buys, perksAt: Zd.perks, spawns: Zd.spawns, glass: Zd.glass || [],
  });
  for (const w of ZM.windows) { w.boards = w.sea ? 0 : 6; w.q = []; w.fall = []; }
  if (typeof zmpReset === 'function') zmpReset();   // [pap]
  if (typeof zmlReset === 'function') zmlReset();   // [lamp] the Light dark again, the lever at its first price
  if (typeof zxReset === 'function') zxReset();   // [chest] src/zmchest.js
  if (typeof zeReset === 'function') zeReset();   // [egg hook] src/zmegg.js
  if (typeof zhReset === 'function') zhReset();   // [egg2 hook] src/zmegg2.js
}
// opts: { map: which map (ZM_MAPS; else the one picked on the card) } and, playing together (src/zmnet.js),
// { net: 'host' | 'client', hum: [[sid, nick], ...] }
function zmStart(opts) {
  if (FPS.on) return;
  opts = opts && (opts.net || opts.map) ? opts : {};
  FPS.nick = (typeof NET !== 'undefined' && NET.nick) || 'Keeper';
  FPS.on = true; FPS.zm = true;
  FPS.saved = { state };
  state = 'fps'; paused = false;
  try { audioInit(); } catch (e) {}
  $('titleCard').hidden = true; $('hud').hidden = true; $('logbox').hidden = true; $('biomeBanner').hidden = true;
  $('stage').classList.add('fpsmode', 'zmmode');
  FPS.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window && navigator.maxTouchPoints > 0;
  $('fpsPad').hidden = !FPS.touch; FPS.hintT = 8; if (FPS.touch) fpsSafeArea();
  { const e = document.querySelector('#fpsMenu .eyebrow'); if (e) e.textContent = 'Keeper’s Last Light'; $('fpsLeave').textContent = 'Leave the Lighthouse'; $('fpsResume').textContent = 'Back to the Light'; }
  if ($('zmUnstick')) $('zmUnstick').hidden = false;
  if (typeof raidBegin === 'function') raidBegin(opts.map || ZM_PICK);   // [raid] Maren's End (src/raid.js)
  const MAP = zmUseMap(opts.map || ZM_PICK);
  FPS.g = zmArena();
  const [sx, sy] = [FPSC.CX + ZMD.START[0], FPSC.CY + ZMD.START[1]];
  FPS.me = { id: (typeof NET !== 'undefined' && NET.sid) || 'me', x: sx, y: sy, h: 0, p: 0, v: 0, z: 0, rudder: 0, bob: 0, boat: 'brig', inv: 0, pitch: 0,
    hp: ZMC.HP, ammo: 6, mags: {}, reload: 0, cd: 0, flares: 0, lan: true, dead: 0, protect: 2, killer: null, jz: ZMD.TOP, vz: 0, fl: ZMD.TOP, me: true };
  for (const id in FPSW) FPS.me.mags[id] = FPSW[id].mag;
  FPS.kb = {}; FPS.deaths = 0; FPS.seq = 0; FPS.shots = []; FPS.seenSeq = {}; FPS.hist = []; FPS.host = true; FPS.joinedAt = performance.now(); FPS.ai = null;
  FPS.remote.clear(); FPS.feed = []; FPS.pings = []; FPS.tracers = []; FPS.parts = []; FPS.drowned = []; FPS.bots = [];
  FPS.roundMsg = null; FPS.menu = false; $('fpsMenu').hidden = true; FPS.eyeLag = 0; FPS.downEye = 0; FPS.crouch = false; FPS.crouchK = 0; FPS.crouchEye = 0; FPS.landed = 0; FPS.calm = 0; FPS.climb = 0;
  FPS.weapon = FPS.last = 'pepperbox'; FPS.harps = []; FPS.swings = []; FPS.scoped = false; FPS.reloadDur = 0; FPS.drawT = 0.45;
  zmReset();
  ZM.net = opts.net || null; ZM.hum = opts.hum || [[FPS.me.id, FPS.nick]];
  // (together: each steps off the boat at a different place along the jetty's pier)
  const slot = Math.max(0, ZM.hum.findIndex(h => h[0] === FPS.me.id));
  if (ZM.net) { FPS.me.x += [0, 1.5, -1.5, 0][slot % 4]; FPS.me.y += [0, -1.6, -1.6, 1.8][slot % 4]; }
  zmNavBuild();
  $('zmOver').hidden = true;
  $('zmAgain').textContent = ZM.net ? 'Back to the lobby' : 'Hold it again';
  fpsFeed(MAP.land(ZM.net ? ZM.hum.length : 0));
  if (typeof raidAfterStart === 'function') raidAfterStart();   // [raid]
  if (typeof scorePlayed === 'function') scorePlayed(typeof RAID !== 'undefined' && RAID.on ? 'raid' : 'zm');   // the scoreboard (src/scores.js)
  try { cv.focus(); } catch (e) {}
}
function zmStop() {
  if (typeof scoreLeaving === 'function') scoreLeaving();   // the scoreboard: a night (or a raid) left before its end still counts
  if (ZM.net && typeof zmnStop === 'function') zmnStop();
  if (typeof zmpStop === 'function') zmpStop();   // [pap]
  if (typeof zxReset === 'function') zxReset();   // [chest]
  if (typeof ztStop === 'function') ztStop(0.6);   // [theme]
  if (typeof raidStop === 'function') raidStop();   // [raid]
  ZM.on = false; ZM.net = null; FPS.zm = false; FPS.eyeLag = 0; FPS.downEye = 0; ZM.spec = null; FPS.specId = null;
  $('stage').classList.remove('zmmode'); $('zmOver').hidden = true;
  { const e = document.querySelector('#fpsMenu .eyebrow'); if (e) e.textContent = "Wreckers' Night carries on without you"; $('fpsLeave').textContent = 'Leave the island'; $('fpsResume').textContent = 'Back to the fight'; }
  if ($('zmUnstick')) $('zmUnstick').hidden = true;
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
    if (live && !FPS.menu && zmSpecOn()) zmSpecInput();   // (out, watching someone: src below, zmSpecTick)
    else if (live && !FPS.menu) { const was = [m.x, m.y]; fpsInput(dt); if (zmIsDown()) zmCrawl(m, was, dt); }
    else { FPS.look = [0, 0]; FPS.mlook = [0, 0]; m.walk = false; }
    if (FPS.menu) fpsMenuPad(dt);
    if (live) {
      if (m.protect > 0) m.protect -= dt;
      if (m.iframe > 0) m.iframe -= dt;
      // patched up quickly, if they leave you alone for a few seconds
      FPS.calm = (FPS.calm || 0) + dt;
      const max = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
      if (m.dead <= 0 && !zmIsDown() && m.hp < max && FPS.calm > (ZM.perks.grog ? 1.6 : 3.2) * (typeof RAID !== 'undefined' && RAID.on ? RAIDC.CALM : 1) && !(typeof RAID !== 'undefined' && RAID.on && !(raidStage() || {}).mend)) m.hp = max;   // [raid] (there, unless the part says so, only a lit brazier mends you)
      if (ZM.downT > 0) zmDownTick(dt);
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
      if ((FPS.climb || 0) > 0 && FPS.sinceShot > 0.14) { const d = Math.min(FPS.climb, dt * 0.4); m.p = clamp(m.p - d, -FPSC.PMAX, FPSC.PMAX); FPS.climb -= d; }
      zmTick(dt);
    }
    if (typeof ztTick === 'function') ztTick(dt);   // [theme] the bosses' music (src/zmtheme.js)
    FPS.eyeLag = (FPS.eyeLag || 0) * Math.pow(0.0005, dt);
    // (down, your eyes sink to the floor; up again, they rise)
    FPS.downEye = (FPS.downEye || 0) + ((zmIsDown() && !ZM.over ? ZM_DOWN.EYE : 0) - (FPS.downEye || 0)) * Math.min(1, dt * 5);
    if ((FPS.hintT || 0) > 0 && (FPS.stick || FPS.lookTouch)) FPS.hintT -= dt * 2; else if ((FPS.hintT || 0) > 0) FPS.hintT -= dt * 0.25;
    for (const k of ['flash', 'hitT', 'hurtT']) if (FPS[k] > 0) FPS[k] -= dt;
    for (const t of FPS.tracers) t.t -= dt; FPS.tracers = FPS.tracers.filter(t => t.t > 0);
    for (const f of FPS.feed) f.t -= dt; FPS.feed = FPS.feed.filter(f => f.t > 0);
    for (const p of FPS.parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= (p.up ? -1 : 9) * dt; }
    FPS.parts = FPS.parts.filter(p => p.t > 0);
    if (FPS.parts.length > 400) FPS.parts.splice(0, FPS.parts.length - 400);
    if (ZM.over) { ZM.over.t += dt; if (ZM.over.t > 2.2 && $('zmOver').hidden) zmShowOver(); if (ZM.net === 'host') zmnHost(dt); }
    zmSpecTick(dt);
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
  const m = FPS.me, down = zmIsDown();
  // (down, nothing touches you: they've left you for the ones still standing)
  if (down) m.protect = Math.max(m.protect || 0, 0.5);
  // where you are
  const zn = zmZoneAt(m.x, m.y, m.jz);
  if (zn && zn !== ZM.zone) { ZM.zone = zn; ZM.zoneT = 3.5; }
  if (ZM.zoneT > 0) ZM.zoneT -= dt;
  if (ZM.net === 'client') zmnClient(dt);
  else {
    if (ZM.net === 'host') zmnHost(dt);
    ZM.players = zmPlayers();
    if ((typeof RAID !== 'undefined' && RAID.on)) ZM.players = raidPlayers(ZM.players);   // [raid] (who they can come after)
    // the grid's distances from everyone standing, a few times a second
    ZM.navT -= dt;
    if (ZM.navT <= 0) { ZM.navT = 0.25; zmNavFrom(ZM.players); }
    if ((typeof RAID !== 'undefined' && RAID.on)) raidHostTick(dt); else zmRounds(dt);   // [raid] no rounds there: its parts instead
    zmZombies(dt);
    zmDropsTick(dt);
    zmBoxTick(dt);
    if (ZM.double > 0) ZM.double -= dt; if (ZM.insta > 0) ZM.insta -= dt;
    zmCheckOver();
  }
  zmWindows(dt);
  zmMoans(dt);
  if (typeof zwTick === 'function') zwTick(dt);   // [swarm] the crabs scuttling
  for (const p of ZM.pops) p.t -= dt; ZM.pops = ZM.pops.filter(p => p.t > 0);
  if (ZM.banner) { ZM.banner.t -= dt; if (ZM.banner.t <= 0) ZM.banner = null; }
  for (const s of ZM.sparks) s.t -= dt; ZM.sparks = ZM.sparks.filter(s => s.t > 0);
  if (FPS.beamT > 0) FPS.beamT -= dt;
  if (typeof zmpTick === 'function') zmpTick(dt);   // [pap]
  if (typeof zmlTick === 'function') zmlTick(dt);   // [lamp] the Light, while it burns
  if (typeof zxTick === 'function') zxTick(dt);   // [chest] what the chest's weapons throw, and what they leave burning
  if (typeof zeTick === 'function') zeTick(dt);   // [egg hook] src/zmegg.js
  if (typeof zhTick === 'function') zhTick(dt);   // [egg2 hook] src/zmegg2.js
  if ((typeof RAID !== 'undefined' && RAID.on)) raidMe(dt);   // [raid] your own side of it
  if (typeof zbMe === 'function') zbMe(dt);   // [boss] their blows running on (joined), and what they've done to me (src/zmboss.js)
  zmNearest();
  // holding Use at a window nails its boards back; beside someone who's down, gets them up
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse;
  ZM.rebuildT -= dt;
  if (hold && ZM.near && ZM.near.k === 'win' && ZM.rebuildT <= 0 && !(m.dead > 0) && !down) {
    const w = ZM.near.w;
    if (w.boards < 6 && !ZM.z.some(z => z.win === w && z.st === 'climb')) {
      ZM.rebuildT = 0.55; zmSound('board');
      if (ZM.net === 'client') { zmnRequest('board', w.id); ZM.boardPts = Math.min(ZM_BOARD_CAP, (ZM.boardPts || 0) + 10); }
      else { w.boards++; zmBoardPay(FPS.me.id); }
    }
  }
  if (hold && ZM.near && ZM.near.k === 'rev' && !(m.dead > 0) && !down) {
    if (ZM.revOf !== ZM.near.sid) { ZM.revOf = ZM.near.sid; ZM.revT = 0; }
    ZM.revT += dt;
    if (ZM.revT >= zmRevTime()) { const sid = ZM.near.sid; zmUpNow(sid); zmnRevive(sid); }
  } else { ZM.revT = 0; ZM.revOf = null; }
  for (const sid in ZM.upT) if ((ZM.upT[sid] -= dt) <= 0) delete ZM.upT[sid];
  for (const n of ZM.downNotes) n.t -= dt; ZM.downNotes = ZM.downNotes.filter(n => n.t > 0);
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
  if (!(m.dead > 0) && !zmIsDown()) out.push({ sid: m.id, x: m.x, y: m.y, jz: m.jz || 0, me: true });
  if (ZM.net === 'host') for (const r of FPS.remote.values()) if (!r.dead && !r.down && r.tx != null) out.push({ sid: r.id, x: r.x, y: r.y, jz: r.jz || 0 });
  return out;
}
// everyone down at once, or gone: the night is over
function zmCheckOver() {
  if (!ZM.net || ZM.over) return;
  const m = FPS.me;
  if (!(m.dead > 0) && !zmIsDown()) return;
  for (const r of FPS.remote.values()) if (!r.dead && !r.down && !r.left) return;
  zmEnd();
}
function zmEnd() {
  if (ZM.over) return;
  FPS.me.dead = FPSC.RESPAWN - 0.6; FPS.scoped = false;
  ZM.over = { t: 0 };
  zmSound('over');
  if ((typeof RAID !== 'undefined' && RAID.on)) raidReport();   // [raid]
  else if (typeof scoreReport === 'function') scoreReport('zm', Math.max(0, ZM.round - 1), ZM.kills, 0, true);
}

// ---------- rounds ----------
const zmCount = r => r <= 5 ? [6, 8, 13, 18, 24][r - 1] : Math.round(24 + (r - 5) * 3.2 + (r - 5) * (r - 5) * 0.06);
// a drowned man's strength (in pepperbox body shots, before ZM_DMG): a gentle step each round to round ten, so the
// wall weapons hold up through the early game and there's time to save for the Lampwright's Bench; then 14% more
// every round, compounding, so the late rounds outgrow anything that hasn't been reforged (and reforged again):
//   hp(r) = 2 + 0.75 (r - 1)         for r <= 10  (round 1: 2, two pepperbox shots; round 5: 5; round 10: 8.75)
//   hp(r) = 8.75 * 1.14^(r - 10)     after       (round 15: 16.8; 20: 32.4; 25: 62.4; 30: 120; 35: 231; 40: 444)
// each one spawns with this, give or take a tenth; the Fresnel Lamp's burn and its sparks are fractions of it
const zmHp = r => r <= 10 ? 2 + 0.75 * (r - 1) : 8.75 * Math.pow(1.14, r - 10);
function zmRounds(dt) {
  ZM.t -= dt;
  if (ZM.phase === 'pre' || ZM.phase === 'break') {
    if (ZM.t <= 0) {
      ZM.round++; ZM.phase = 'round'; ZM.left = Math.round(zmCount(ZM.round) * (1 + 0.5 * (ZM.hum.length - 1))); ZM.spawnT = 2; ZM.dropsRound = 0; ZM.boardBy = {}; ZM.boardPts = 0;
      zmRoundBegins();
      ZM.banner = { text: 'Round ' + ZM.round, t: 4 };
      zmSound('round');
      const crabs = typeof zwBegin === 'function' && zwBegin();   // [swarm] a crab round (src/zmswarm.js)
      if (ZM.round > 1 && !crabs) fpsFeed(`Round ${ZM.round}: ${ZM.left} of them.`);
    }
    return;
  }
  // round on: bring them up, a few at a time
  if (!ZM.swarm && typeof zbRounds === 'function') zbRounds(dt);   // [boss] the bosses, in their rounds (src/zmboss.js)
  const alive = ZM.z.filter(z => !z.dead).length, cap = ZM.swarm ? ZWC.ALIVE : Math.min(ZMC.ALIVE, 6 + ZM.round * 2);
  ZM.spawnT -= dt;
  if (ZM.left > 0 && alive < cap && ZM.spawnT <= 0) {
    if (ZM.swarm) { if (zwSpawn()) { ZM.left--; ZM.spawnT = zwGap(); } else ZM.spawnT = 0.5; }   // [swarm] pouring in
    else if (zmSpawn()) { ZM.left--; ZM.spawnT = Math.max(0.35, 2.1 - ZM.round * 0.16) * (0.7 + Math.random() * 0.6); }
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
  // (beside them, on the grid at their height: not inside them, a wall or the stair; with nobody up, on the jetty)
  if (at) { const [x, y] = zmBeside(at.x, at.y, at.jz || 0); m.x = x; m.y = y; m.jz = at.jz || 0; m.fl = m.jz; zmSettle(m); }
  else { m.x = FPSC.CX + ZMD.START[0]; m.y = FPSC.CY + ZMD.START[1]; m.jz = m.fl = ZMD.TOP; zmSettle(m); }
  ZM.ghost = false; m.dead = 0; m.hp = ZMC.HP; m.protect = 3;
  ZM.own = ['pepperbox']; ZM.res = { pepperbox: 48 }; FPS.weapon = FPS.last = 'pepperbox'; m.ammo = 6; m.mags.pepperbox = 6; FPS.drawT = 0.45;
  fpsFeed('You’re back on your feet, with a pepperbox.');
}
// a place to stand next to (x, y, jz): a step or so off to one side, somewhere the drowned could walk (on the grid,
// leading to you), clear of everything solid; else (x, y) itself
function zmBeside(x, y, jz) {
  for (const r of [1.1, 1.6, 0.8, 2.2]) for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + 0.4, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, n = zmNodeIn(zmCell(px, py), jz, 0.3);
    if (n >= 0 && !zmBlockedAt(px, py, 0.5, jz) && zmWinPen(px, py, 0.5, jz) <= 0) return [px, py];
  }
  return [x, y];
}
// on the jetty's deck? (w: a margin round it)
function zmOnDeck(x, y, w) { for (const [x0, x1, y0, y1] of (FPS.g.isle.zm.decks || [])) if (x > x0 - w && x < x1 + w && y > y0 - w && y < y1 + w) return true; return false; }
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
  // (a ladder down the jetty, or a gap in the sea wall: out in the harbour, under the water, clear of the jetty)
  if (w.hatch) return [w.x + (Math.random() - 0.5) * 0.4, w.y + (Math.random() - 0.5) * 0.4];
  if (w.sea || w.shore) {
    for (let i = 0; i < 16; i++) {
      const out = (w.sea ? 3.0 : 4.2) + Math.random() * 3, side = (Math.random() - 0.5) * 2.4, x = w.x + w.nx * out + tx * side, y = w.y + w.ny * out + ty * side;
      if (!zmOnDeck(x, y, 0.9)) return [x, y];
    }
    return [w.x + w.nx * 3.5, w.y + w.ny * 3.5];
  }
  if ((w.z || 0) > 0) { const side = (Math.random() - 0.5) * 1.2; return [w.x + w.nx * 1.3 + tx * side, w.y + w.ny * 1.3 + ty * side]; }
  for (const out of [4 + Math.random() * 2.5, 3.2, 2.4, 1.6]) {
    const side = (Math.random() - 0.5) * Math.min(3, out * 0.6), x = w.x + w.nx * out + tx * side, y = w.y + w.ny * out + ty * side;
    if ((!zmTower() || Math.hypot(x - CX - T[0], y - CY - T[1]) > ZMT.R + 1.4) && !zmBlockedAt(x, y, 0.4, 0)) return [x, y];
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
  z.h = w.hatch ? Math.random() * 6.28 : bearingOf(w.x - z.x, w.y - z.y);
  if (w.hatch) z.jz = w.hatch + 0.25;   // (up in the loft, over the hatch)
  w.q.push(z);
  ZM.z.push(z); FPS.drowned = ZM.z;
  return true;
}

// ---------- the drowned ----------
// How each one walks, its own way: a weave from side to side (how far, how quick, and a lean to one side), a pace
// that comes and goes, now and then a stumble or a stop to sway on the spot, and the side it comes at you from (fan:
// how far round from its own line in to you; ring: how far out from you it aims for, until it's close)
function zmGait(z) {
  if (z.gait) return z.gait;
  const R = Math.random, run = z.kind === 'run', walk = z.kind === 'walk';
  return z.gait = {
    amp: (walk ? 0.32 : run ? 0.16 : 0.24) * (0.6 + R() * 0.8), f: 0.22 + R() * 0.4, ph: R() * 6.28, f2: 0.7 + R() * 0.6, ph2: R() * 6.28,
    lean: (R() - 0.5) * 0.3, pace: 0.1 + R() * 0.12, paceF: 0.08 + R() * 0.12, fan: ((z.zn * 0.618034) % 1 - 0.5) * 2.6 + (R() - 0.5) * 0.4,
    ring: 1.8 + R() * 2.6, lane: (R() - 0.5) * 1.8, next: 1.5 + R() * 5, hold: 0, stum: 0, open: 1, openT: 0, clear: false, clearT: 0, side: R() < 0.5 ? -1 : 1,
  };
}
// a pace this tick (1: its own), after any stumble or stop; and now and then the next stumble or stop (not close to you)
function zmPace(z, G, dt, far) {
  if (G.hold > 0) G.hold -= dt;
  if (G.stum > 0) G.stum -= dt;
  G.next -= dt;
  if (G.next <= 0) {
    const u = Math.random(), walk = z.kind === 'walk', run = z.kind === 'run';
    G.next = (run ? 5 : 3) + Math.random() * 6;
    if (far && u < (walk ? 0.4 : run ? 0.08 : 0.2)) G.hold = 0.35 + Math.random() * (walk ? 0.9 : 0.4);
    else if (u < 0.6) G.stum = 0.35 + Math.random() * 0.4;
  }
  if (G.hold > 0 && far) return 0;
  const k = 1 + G.pace * Math.sin(z.t * G.paceF * 6.28 + G.ph2);
  return G.stum > 0 ? k * (0.3 + 0.7 * Math.max(0, 0.75 - G.stum) / 0.75) : k;
}
// its sway this tick, as an angle off its way (radians)
const zmSway = (z, G) => G.lean * G.side + G.amp * (Math.sin(z.t * G.f * 6.28 + G.ph) + 0.35 * Math.sin(z.t * G.f * G.f2 * 14 + G.ph2));
// can it walk straight from (x0, y0) to (x1, y1) at height jz: somewhere to stand at its height all the way, that
// leads to you (the grid's nodes: walls, furniture, the stairwell and the floor's edge all leave none)
function zmWalkable(x0, y0, x1, y1, jz) {
  const N = ZM.nav, L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L / 0.35));
  for (let i = 1; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, a = zmNodeIn(zmCell(x, y), jz, 0.3);
    if (a < 0 || N.d[a] >= 1e8) return false;
  }
  return true;
}
function zmZombies(dt) {
  const all = ZM.z, P = ZM.players;
  const nearest = (x, y, jz) => { let best = null, bd = 1e9; for (const p of P) { const d = Math.hypot(p.x - x, p.y - y) + Math.abs((p.jz || 0) - (jz || 0)) * 2; if (d < bd) { bd = d; best = p; } } return best; };
  for (const z of all) {
    if (z.hitT > 0) z.hitT -= dt;
    z.t += dt;
    if (z.dead) { z.deadT = (z.deadT || 0) + dt; continue; }
    if (z.rr > 0 && typeof raidRise === 'function') { raidRise(z, dt); continue; }   // [raid] rising out of the ground
    if (z.boss && typeof zbTick === 'function') { zbTick(z, dt, nearest); continue; }
    if (z.skit && z.st === 'out') { zwOut(z, dt); continue; }   // [swarm] a crab, straight in at its window   // [boss] each goes its own way (src/zmboss.js)
    const step = z.sp * dt * (z.slow > 0 && typeof zmpSlowK === 'function' ? zmpSlowK(z) : 1);   // [pap] (slowed by the Equinox Gale)
    const G = zmGait(z);
    if (z.win && z.win.hatch && (z.st === 'out' || z.st === 'tear' || z.st === 'climb')) {
      // a hatch in the ceiling: waiting up in the loft over it (each in turn), tearing its boards up, then dropping
      // down through it into the room
      const w = z.win, top = w.hatch + 0.25; z.walk = false; z.scaling = false;
      if (z.st === 'out') { z.jz = top; z.x = w.x; z.y = w.y; if (w.q.indexOf(z) === 0) { z.st = 'tear'; z.t = 0; } continue; }
      if (z.st === 'tear') {
        z.jz = top; z.x = w.x; z.y = w.y;
        if (w.boards > 0) { if (z.t > Math.max(0.55, 1.25 - ZM.round * 0.03)) { z.t = 0; w.boards--; w.fall.push({ i: w.boards, t: 0 }); zmSound('tear', Math.hypot(w.x - FPS.me.x, w.y - FPS.me.y)); } }
        else { z.st = 'climb'; z.t = 0; zmSound('tear', Math.hypot(w.x - FPS.me.x, w.y - FPS.me.y)); }
        continue;
      }
      const k = Math.min(1, z.t / 0.55);
      z.x = w.x; z.y = w.y; z.jz = top * (1 - k * k);
      if (k >= 1) { z.st = 'in'; z.jz = z.fl = 0; w.q = w.q.filter(q => q !== z); z.t = 0; z.lx = z.x; z.ly = z.y; z.stum = 0.4; }
      continue;
    }
    if (z.st === 'out' && z.win.sea) {
      // up out of the harbour: wading in under the jetty's ladder, head and shoulders out of the water, deeper the
      // further out (waiting behind any already at it); then up the ladder
      const w = z.win, k = w.q.indexOf(z), lane = Math.max(0, k);
      const ox = w.x + w.nx * (0.55 + lane * 0.85) + (-w.ny) * (lane % 2 ? 0.55 : -0.55) * Math.min(1, lane), oy = w.y + w.ny * (0.55 + lane * 0.85) + w.nx * (lane % 2 ? 0.55 : -0.55) * Math.min(1, lane);
      const dx = ox - z.x, dy = oy - z.y, d = Math.hypot(dx, dy);
      if (d > 0.05) {
        const pace = zmPace(z, G, dt, d > 2.5) * 0.8, s = Math.min(d, step * pace), a = bearingOf(dx, dy) + zmSway(z, G) * 0.8 * clamp((d - 0.4) / 2.5, 0, 1);
        if (s > 0) { z.x += Math.sin(a) * s; z.y += Math.cos(a) * s; z.walk = true; } else z.walk = false;
        z.h += angDiff(a, z.h) * Math.min(1, dt * 5);
      } else { z.walk = false; z.h = bearingOf(-w.nx, -w.ny); }
      const off = (z.x - w.x) * w.nx + (z.y - w.y) * w.ny;
      z.jz = -0.95 - clamp((off - 0.6) * 0.55, 0, 1.4); z.scaling = false;
      if (k === 0 && d < 0.1) { z.st = 'climb'; z.t = 0; z.jz0 = z.jz; }
      continue;
    }
    if (z.st === 'out') {
      // across the yard (or up the beach) to the window, waiting behind any already at it; weaving as it comes, the
      // weave dying away as it reaches its place
      const w = z.win, k = w.q.indexOf(z), lane = Math.max(0, k);
      const ox = w.x + w.nx * (0.95 + lane * 0.9) + (-w.ny) * (lane % 2 ? 0.5 : -0.5) * Math.min(1, lane), oy = w.y + w.ny * (0.95 + lane * 0.9) + w.nx * (lane % 2 ? 0.5 : -0.5) * Math.min(1, lane);
      const dx = ox - z.x, dy = oy - z.y, d = Math.hypot(dx, dy);
      if (d > 0.05) {
        const pace = zmPace(z, G, dt, d > 2.5), s = Math.min(d, step * pace), a = bearingOf(dx, dy) + zmSway(z, G) * 1.6 * clamp((d - 0.4) / 2.5, 0, 1);
        if (s > 0) { z.x += Math.sin(a) * s; z.y += Math.cos(a) * s; z.walk = true; } else z.walk = false;
        z.h += angDiff(a, z.h) * Math.min(1, dt * 6);
      }
      else { z.walk = false; z.h = bearingOf(-w.nx, -w.ny); }
      // (a window up the tower: up the outside of the wall they go, hand over hand)
      const wz = w.z || 0;
      // (on the ground: up out of the harbour's water, if it came that way)
      if (!wz) { z.jz = -zmSeaDepth(z.x, z.y); z.scaling = false; }
      else if (z.jz < wz) { z.jz = Math.min(wz, z.jz + dt * 2.4); z.scaling = true; z.h = bearingOf(-w.nx, -w.ny); } else z.scaling = false;
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
    if (z.st === 'climb' && z.win.sea) {
      // hauling itself up the ladder, hand over hand, and over the edge onto the deck on its belly
      const w = z.win, T = 1.7, k = Math.min(1, z.t / T), top = w.z, j0 = z.jz0 != null ? z.jz0 : -0.95;
      if (k < 0.6) { const q = k / 0.6; z.x = w.x + w.nx * 0.55; z.y = w.y + w.ny * 0.55; z.jz = j0 + (top - 0.45 - j0) * q * q * (3 - 2 * q); z.scaling = true; }
      else { const q = (k - 0.6) / 0.4; z.x = w.x + w.nx * (0.55 - 1.35 * q); z.y = w.y + w.ny * (0.55 - 1.35 * q); z.jz = top - 0.45 + 0.45 * Math.sin(q * Math.PI / 2) + 0.2 * Math.sin(q * Math.PI); z.scaling = false; }
      z.h = bearingOf(-w.nx, -w.ny); z.walk = false;
      if (k >= 1) { z.st = 'in'; z.jz = z.fl = top; w.q = w.q.filter(q => q !== z); z.t = 0; z.lx = z.x; z.ly = z.y; z.jz0 = null; }
      continue;
    }
    if (z.st === 'climb') {
      // (a crab: quick, low, through between the boards)
      const w = z.win, k = Math.min(1, z.t / (z.skit ? ZWC.CLIMB : 1.0));
      z.x = w.x + w.nx * 0.95 * (1 - 2 * k); z.y = w.y + w.ny * 0.95 * (1 - 2 * k); z.jz = (w.z || 0) + Math.sin(k * Math.PI) * (z.skit ? 0.75 : 1.05);
      if (k >= 1) { z.st = 'in'; z.jz = z.fl = w.z || 0; w.q = w.q.filter(q => q !== z); z.t = 0; z.lx = z.x; z.ly = z.y; }
      continue;
    }
    if (typeof zmpHeld === 'function' && zmpHeld(z, dt)) continue;   // [pap] swept off its feet, or nailed to the wall
    // inside: after the nearest of you, by the shortest walk
    const m = nearest(z.x, z.y, z.jz);
    if (!m) { z.walk = false; continue; }
    const dx = m.x - z.x, dy = m.y - z.y, d = Math.hypot(dx, dy), dz = (m.jz || 0) - (z.jz || 0);
    let tx = m.x, ty = m.y;
    // on the same floor and in the open, not too far off: it comes at you from its own side (a point out round you,
    // drawn in as it closes), if it can walk straight there; otherwise by the grid, the shortest walk
    const level = Math.abs(dz) < 0.8;
    G.clearT -= dt; G.openT -= dt;
    let ax = m.x, ay = m.y;
    if (level && d > 1.6 && d < 16) {
      const ring = Math.min(G.ring, (d - 1.2) * 0.55), b = bearingOf(z.x - m.x, z.y - m.y) + G.fan;
      ax = m.x + Math.sin(b) * ring; ay = m.y + Math.cos(b) * ring;
      if (G.clearT <= 0) { G.clearT = 0.3 + Math.random() * 0.15; G.clear = zmWalkable(z.x, z.y, ax, ay, z.jz || 0); }
    } else G.clear = false;
    if (G.clear) { tx = ax; ty = ay; }
    else if (!(d < 3 && level)) {
      const nx = zmNavNext(z.x, z.y, z.jz);
      if (nx) {
        tx = nx[0]; ty = nx[1];
        // (in the open, each keeps to its own lane, a little to one side of the shortest way, so they come on
        // abreast rather than nose to tail)
        const ll = Math.hypot(tx - z.x, ty - z.y);
        if (G.open > 0.5 && ll > 0.2 && d > 4) {
          const lx = tx + (ty - z.y) / ll * G.lane, ly = ty - (tx - z.x) / ll * G.lane, a = zmNodeIn(zmCell(lx, ly), z.jz || 0, 0.3);
          if (a >= 0 && ZM.nav.d[a] < 1e8) { tx = lx; ty = ly; }
        }
      }
    }
    // (the weave: full out in the open, a little in a doorway or on the stair, none at all right on you)
    if (G.openT <= 0) {
      G.openT = 0.3 + Math.random() * 0.1;
      const hb = bearingOf(tx - z.x, ty - z.y), side = s => zmNodeIn(zmCell(z.x + Math.cos(hb) * s, z.y - Math.sin(hb) * s), z.jz || 0, 0.25) >= 0;
      G.open = side(0.9) && side(-0.9) ? 1 : 0.25;
    }
    const hx = tx - z.x, hy = ty - z.y, hl = Math.hypot(hx, hy);
    const near = d < 1.15 && Math.abs(dz) < 1;
    const pace = zmPace(z, G, dt, d > 5);
    if (hl > 0.05 && !near && pace > 0) {
      const want = bearingOf(hx, hy) + zmSway(z, G) * G.open * clamp((d - 1.4) / 3, 0, 1);
      z.h += angDiff(want, z.h) * Math.min(1, dt * 8);
      const s = Math.min(hl, step * pace);
      // (a corner in the way: try a little to either side, the side that worked last first)
      z.walk = false;
      for (const dh of [0, 0.6, -0.6, 1.2, -1.2]) { const a = want + dh * (z.side || 1), x0 = z.x, y0 = z.y; if (zmMove(z, Math.sin(a) * s, Math.cos(a) * s) && Math.hypot(z.x - x0, z.y - y0) > s * 0.3) { z.walk = true; if (dh) z.side = Math.sign(dh * (z.side || 1)); break; } }
    } else { z.walk = false; if (d > 0.1) z.h += angDiff(bearingOf(dx, dy), z.h) * Math.min(1, dt * (pace > 0 ? 6 : 1.5)); }
    // (how long since it last got any nearer you by the walk, measured from where it was a second ago against the
    // same distances, so you running off doesn't count against it: for the menu's Unstick, zmUnstick)
    G.navT = (G.navT || 0) - dt;
    if (G.navT <= 0) {
      G.navT = 1;
      const nd = zmNavDist(z.x, z.y, z.jz), was = G.at ? zmNavDist(G.at[0], G.at[1], G.at[2]) : 1e9;
      if (nd < 3 || (nd < 1e8 && nd < was - 0.4)) z.farT = 0;
      G.at = [z.x, z.y, z.jz || 0];
    }
    z.farT = (z.farT || 0) + dt;
    // (falling off a ledge: down they go)
    if ((z.jz || 0) > z.fl) z.jz = Math.max(z.fl, z.jz - 9 * dt);
    if (near || (d < 1.6 && Math.abs(dz) < 1)) zmSwipe(z, dt);
    // stuck for a long while, far from you: back out to a window
    z.stuck = Math.hypot(z.x - (z.lx || z.x), z.y - (z.ly || z.y)) < 0.02 && !near ? z.stuck + dt : Math.max(0, z.stuck - dt * 2);
    z.lx = z.x; z.ly = z.y;
    // (or jostling on the spot, no nearer by the walk for half a minute)
    if ((z.stuck > 9 && d > 12) || z.stuck > 15 || (z.farT > 30 && d > 8)) { z.dead = 1; z.gone = true; z.deadT = 99; ZM.left++; }
  }
  // the drowned keep apart from one another: hard at a body's width, and a softer give out to arm's length, so they
  // spread instead of filing in nose to tail
  const ins = all.filter(z => !z.dead && z.st === 'in');
  for (let i = 0; i < ins.length; i++) for (let j = i + 1; j < ins.length; j++) {
    const a = ins[i], b = ins[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const R0 = a.skit && b.skit ? 0.5 : 0.6, R1 = a.skit && b.skit ? 0.8 : 1.0;   // ([swarm] crabs pack closer)
    if (d < R1 && d > 0.001 && Math.abs((a.jz || 0) - (b.jz || 0)) < 1) {
      const push = d < R0 ? (R0 - d) * 0.5 + 0.4 * dt : (R1 - d) * 1.6 * dt;
      zmMove(a, -dx / d * push, -dy / d * push); zmMove(b, dx / d * push, dy / d * push);
    }
  }
  // and from all of you
  for (const z of ins) for (const m of P) {
    const dx = z.x - m.x, dy = z.y - m.y, d = Math.hypot(dx, dy);
    if (d < ZMC.BODY + 0.02 && d > 0.001 && Math.abs((z.jz || 0) - (m.jz || 0)) < 1.2) zmMove(z, dx / d * (ZMC.BODY + 0.02 - d), dy / d * (ZMC.BODY + 0.02 - d));
  }
  // the dead sink away
  for (const z of all) if (z.dead && z.deadT > (z.burn ? 1.3 : 2.4)) { if (z.mdl) zmFreeModel(z); z.remove = true; }
  ZM.z = all.filter(z => !z.remove); FPS.drowned = ZM.z;
}
// ---------- the menu's "Unstick a drowned" ----------
// One that's stuck somewhere out of reach (the one that's gone longest without getting any nearer you by the walk,
// else the furthest off) is taken back out to sea and comes up again outside the window nearest you, to tear its way
// in afresh. Once in ZM_UNSTICK s for everyone; joined, you ask the host (an 'unstick' request)
const ZM_UNSTICK = 20;
function zmUnstickPick() {
  const live = ZM.z.filter(z => !z.dead && !z.gone && !z.boss);
  if (!live.length) return null;
  const inside = live.filter(z => z.st === 'in'), stale = inside.filter(z => (z.farT || 0) > 6 && zmNavDist(z.x, z.y, z.jz) > 5);
  if (stale.length) return stale.sort((a, b) => b.farT - a.farT)[0];
  const far = z => { const d = zmNavDist(z.x, z.y, z.jz); return d < 1e8 ? d : 1e6 + Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y); };
  return (inside.length ? inside : live).map(z => [z, far(z)]).sort((a, b) => b[1] - a[1])[0][0];
}
// (alone or hosting) by: who asked. Returns a line for the asker if nothing was done
function zmUnstick(by) {
  if (!ZM.on || ZM.over) return 'Not now.';
  if (ZM.phase !== 'round') return 'There are none of them to unstick between rounds.';
  const now = zmNow();
  if (now < (ZM.unstickAt || 0)) return `Not yet: ${Math.ceil(ZM.unstickAt - now)} s.`;
  const z = zmUnstickPick(); if (!z) return 'None of them is left to unstick.';
  // the window nearest you all, by the walk, of the rooms that are open
  let w = null, bd = 1e12;
  for (const q of ZM.windows) { if (!zmOpen(q.zone)) continue; const d = zmNavDist(q.x - q.nx * 1.0, q.y - q.ny * 1.0, q.z || 0) + q.q.length * 4; if (d < bd) { bd = d; w = q; } }
  if (!w) return 'There’s no window to send it to.';
  if (z.win) z.win.q = z.win.q.filter(q => q !== z);
  const [sx, sy] = zmSpawnPoint(w);
  Object.assign(z, { st: 'out', win: w, x: sx, y: sy, jz: 0, fl: 0, t: 0, stuck: 0, swing: -1, atk: 0.6, walk: false, scaling: false, farT: 0,
    pin: 0, stun: 0, kvx: 0, kvy: 0, slow: 0, lx: sx, ly: sy, hist: [] });
  z.h = bearingOf(w.x - z.x, w.y - z.y); if (z.gait) z.gait.at = null;
  w.q.push(z);
  ZM.unstickAt = now + ZM_UNSTICK;
  const nick = by && by !== FPS.me.id ? ((ZM.hum.find(h => h[0] === by) || [])[1] || 'Someone') : 'You';
  const line = `${nick} sent a stuck one back to sea: it comes again by a window in ${zmZoneName(w.zone) || 'the station'}.`;
  fpsFeed(line); if (ZM.net) zmnEvent('feed', line);
  return null;
}
// (the clock for the cooldown: game time, so it holds still while the menu holds a night alone still)
const zmNow = () => (FPS.g && FPS.g.t) || 0;
// the button
function zmUnstickAsk() {
  if (!FPS.zm || !ZM.on) return;
  const now = zmNow();
  if (now < (ZM.unstickMine || 0)) { fpsFeed(`Not yet: ${Math.ceil(ZM.unstickMine - now)} s.`); return; }
  if (ZM.net === 'client') { zmnRequest('unstick', 1); ZM.unstickMine = now + ZM_UNSTICK; fpsFeed('You ask for a stuck one to be sent back to sea.'); }
  else { const no = zmUnstick(FPS.me.id); if (no) fpsFeed(no); else ZM.unstickMine = now + ZM_UNSTICK; }
  fpsSetMenu(false);
}
function zmUnstickLabel() {
  const b = $('zmUnstick'); if (!b) return;
  const left = Math.ceil(Math.max(ZM.unstickMine || 0, ZM.net === 'client' ? 0 : ZM.unstickAt || 0) - zmNow());
  b.disabled = left > 0; b.textContent = left > 0 ? `Unstick a drowned (${left} s)` : 'Unstick a drowned';
}
if ($('zmUnstick')) { $('zmUnstick').addEventListener('click', zmUnstickAsk); setInterval(() => { if (FPS.zm && FPS.menu) zmUnstickLabel(); }, 250); }
// moans from the nearest of them
function zmMoans(dt) {
  const m = FPS.me;
  ZM.groanT -= dt;
  if (ZM.groanT <= 0) {
    ZM.groanT = 1.2 + Math.random() * 2.5;
    let best = null, bd = 30;
    for (const z of ZM.z) { if (z.dead || z.skit) continue; const d = Math.hypot(z.x - m.x, z.y - m.y) * (0.7 + Math.random() * 0.6); if (d < bd) { bd = d; best = z; } }
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
      const reach = z.skit ? ZWC.REACH : z.st === 'tear' ? 1.6 : 1.55;
      if ((z.skit ? zwCanNip(m, z.x, z.y, z.jz || 0) : Math.hypot(m.x - z.x, m.y - z.y) < reach && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.2) && !(m.dead > 0) && !(m.protect > 0) && !(m.iframe > 0) && !zmIsDown()) { fpsHurt(z.skit ? ZWC.NIP : 1, null, null); zmSound('hit'); }   // ([swarm] a crab's nip: half a knock)
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
  if (typeof raidHurtK === 'function') dmg = raidHurtK(d, dmg, code, by);   // [raid] the stage's say (the shooter's side)
  if (!(dmg > 0)) return;   // [raid3] (nothing at all: Maren, while her soul's out of her)
  if (ZM.net === 'client') { zmnHit(d, dmg, head, code, how); return; }
  const k = (ZM_DMG[code] == null ? 1 : ZM_DMG[code]) * (d.mark > 0 ? 1.5 : 1);   // [pap] (lit by the Leading Light: hurt worse)
  d.hp -= d.boss && typeof zbHurtK === 'function' ? zbHurtK(d, dmg * k, how) : ZM.insta > 0 ? 1e9 : dmg * k;   // [boss] no one-hit kills on them
  if (d.hp <= 0) { zmKill(d, head, code, how, by); if (how === 'burn') zmChain(d, 2, by); } else zmPoints(10, false, by);
}
function zmKill(d, head, code, how, by) {
  if (d.dead) return;
  d.dead = 1; d.deadT = 0; d.burn = how === 'burn' || how === 'lamp'; d.head = !!head;   // [lamp] (burned by the Light's beam)
  if (d.win) d.win.q = d.win.q.filter(q => q !== d);
  if (how !== 'flash') zmPoints(how === 'burn' ? 80 : head ? 100 : code === 'c' || code === 'k' ? 130 : 60, false, by);
  zmKillFx(d);
  if (by && by !== FPS.me.id) { const c = ZM.credit[by] = ZM.credit[by] || [0, 0, 0]; c[1]++; if (head) c[2]++; }
  else if (how !== 'flash' || !ZM.net) { ZM.kills++; if (head) ZM.heads++; zmEarnKill(); }
  zmMaybeDrop(d, how);
  if (d.skit && typeof zwKilled === 'function') zwKilled(d);   // [swarm] the last crab's Powder Keg
  if (d.boss && typeof zbKilled === 'function') zbKilled(d, how, by);   // [boss] its reward and its salvage
  if (typeof zeKill === 'function') zeKill(d, how, by);   // [egg hook] src/zmegg.js
  if (typeof zhKill === 'function') zhKill(d, how, by);   // [egg2 hook] src/zmegg2.js
  if (typeof raidKill === 'function') raidKill(d, how, by);   // [raid]
}
// crates (as for Wreckers' Night, every third kill here)
function zmEarnKill() {
  ZM.earnK++;
  if (ZM.earnK >= 3) { ZM.earnK = 0; if (typeof wcEarn === 'function') wcEarn('kill'); if (typeof ocEarn === 'function') ocEarn('kill'); }
}
// how one goes: burning to ash, or a burst of the sea
function zmKillFx(d) {
  if (d.skit) {   // [swarm] a crab: a crack of shell, and bits of it
    if (typeof zwSound === 'function') zwSound('crunch', Math.hypot(d.x - FPS.me.x, d.y - FPS.me.y));
    fpsPuff(d.x, d.y, FPSC.GROUND + (d.jz || 0) + 0.35, d.burn ? '255,170,80' : '150,60,40', 8);
    return;
  }
  if (!d.burn && typeof sfxPlay === 'function') sfxPlay('splat', { vol: 0.55 * Math.max(0.1, 1 - Math.hypot(d.x - FPS.me.x, d.y - FPS.me.y) / 35), gap: 0.04, vary: 0.2 });
  if (d.burn) for (let i = 0; i < 10; i++) FPS.parts.push({ x: d.x + (Math.random() - 0.5) * 0.6, y: d.y + (Math.random() - 0.5) * 0.6, z: FPSC.GROUND + (d.jz || 0) + Math.random() * 1.7, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, vz: Math.random() * 1.2, t: 1.2, c: '255,170,80', up: true });
  else fpsPuff(d.x, d.y, FPSC.GROUND + (d.jz || 0) + (d.head ? 1.6 : 1.1), d.head ? '120,150,140' : '70,100,90', d.head ? 12 : 6);
}
// salvage: now and then something floats free
function zmMaybeDrop(d, how) {
  if (ZM.dropsRound < 4 && !ZM.swarm && Math.random() < 0.03 && how !== 'flash') {
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
  if (typeof zxShot === 'function' && zxShot(sh, mine)) return;   // [chest] the wreck chest's own weapons (src/zmchest.js)
  if (w.melee) { fpsSwishSound(0); zmMelee(x, y, z, h, w, code); return; }   // (the weapon's own code: the Cutlass of Plimsoll's is 'P')
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
      prev.dmg += (r.head ? w.head : w.dmg) * ZM_FALL(code, gone + r.t); prev.head = prev.head || r.head; hits.set(o, prev);
      skip.add(o); left--;
      gone += r.t + 0.6; ox = r.x + Math.sin(lh) * 0.6; oy = r.y + Math.cos(lh) * 0.6; oz = r.z + Math.tan(lp) * 0.6;
    }
    FPS.tracers.push({ a: [x + Math.sin(lh) * 0.6, y + Math.cos(lh) * 0.6, z - 0.25], b: [last.x, last.y, last.z], t: w.pellets ? 0.06 : 0.08, k: w.code });
    if (typeof zeShot === 'function' && mine) zeShot(x, y, z, lh, lp, by);   // [egg hook] src/zmegg.js
    if (typeof zhShot === 'function' && mine) zhShot(x, y, z, lh, lp, by);   // [egg2 hook] src/zmegg2.js
    if (typeof raidShot === 'function' && mine) raidShot(x, y, z, lh, lp, by);   // [raid]
    if (last.kind !== 'body' && last.kind !== 'none') fpsPuff(last.x, last.y, last.z, last.kind === 'ground' ? '150,140,120' : '190,190,180', w.pellets ? 2 : 6);
  }
  if (mine && typeof zmpShot === 'function') zmpShot(sh, hits);   // [pap] what a reforged weapon does
  let any = null;
  for (const [o, hit] of hits) { any = any || hit; zmHurt(o, hit.dmg, hit.head, code, FPS.me.id); }
  if (any && mine) { FPS.hitT = 0.18; FPS.hitHead = any.head; fpsHitSound(any.head); }
}
// (from fpsHarpoonsTick) my harpoon has just struck one of them (o): if that killed it, true, and the iron goes on
// through into the next, up to ZM_HARPOON_THRU more. Joined to someone's night, whether it killed is the host's to
// say, so here it's judged against the round's strength
function zmHarpoonOn(hp, o) {
  if (!o || !o.zm || o.boss || !hp.mine || (hp.thruN || 0) >= ZM_HARPOON_THRU) return false;
  const hit = (typeof zmpDmg === 'function' ? zmpDmg(FPSW.harpoon.dmg, 'h', FPS.me.id) : FPSW.harpoon.dmg) * ZM_DMG.h * (o.mark > 0 ? 1.5 : 1);
  if (!(o.dead || (ZM.net === 'client' && (ZM.insta > 0 || hit >= zmHp(ZM.round) * 1.1)))) return false;
  hp.thruN = (hp.thruN || 0) + 1; (hp.thru = hp.thru || new Set()).add(o);
  hp.vx *= 0.9; hp.vy *= 0.9; hp.stuck = 0;
  return true;
}
// a slash with the knife: whatever's in front of you and in reach, whatever's in your hands
function zmKnife() {
  const m = FPS.me;
  if (!FPS.zm || m.dead > 0 || zmIsDown() || FPS.menu || ZM.over || (FPS.knifeT || 0) > 0) return;
  FPS.knifeT = ZM_KNIFE.rate; FPS.knifeN = (FPS.knifeN || 0) + 1; FPS.meSlashT = 0.3; m.protect = 0; FPS.scoped = false;
  fpsSwishSound(0);
  const z = FPSC.GROUND + FPSC.EYE + (m.jz || 0);
  zmMelee(m.x, m.y, z, m.h, ZM_KNIFE, 'k');
  if (typeof zmnShot === 'function') zmnShot('c', m.h, m.p);
}
function zmMelee(x, y, z, h, w, code) {
  code = code || 'c';
  if (typeof zeMelee === 'function') zeMelee(x, y, z, h, w, code);   // [egg hook] src/zmegg.js
  if (typeof zhMelee === 'function') zhMelee(x, y, z, h, w, code);   // [egg2 hook] src/zmegg2.js
  if (code === 'c' && typeof zmpSwing === 'function') zmpSwing(x, y, z, h);   // [pap] the Keel-Splitter's crescent
  let any = false;
  for (const o of ZM.z) {
    if (o.dead) continue;
    const d = Math.hypot(o.x - x, o.y - y), b = bearingOf(o.x - x, o.y - y);
    if (d > w.reach + FPSC.BODY || Math.abs(angDiff(b, h)) > w.arc || Math.abs((o.jz || 0) - (FPS.me.jz || 0)) > 1.2) continue;
    // (aimed at the middle of its height where the blade meets its near side, not its centre: from up at your chest
    // to a crab at your feet, a line to its centre passed over its shell; one right at your feet is struck anyway)
    const rad = o.rad || FPSC.BODY, close = d < rad + 0.35;
    const r = close ? null : fpsRay(x, y, z - 0.4, b, Math.atan2(zmMid(o) - (z - FPSC.GROUND - 0.4), Math.max(0.3, d - rad * 0.8)), FPS.me.id, [o], w.reach + 1);
    if (r && r.kind !== 'body') continue;
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
    const ox = o.x - ex, oy = o.y - ey, oz = FPSC.GROUND + Math.min(zmMid(o), (o.jz || 0) + 1.1) - ez, d = Math.hypot(ox, oy, oz);
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
  ZM.sparks.push({ a: [from.x, from.y, FPSC.GROUND + zmMid(from)], b: [best.x, best.y, FPSC.GROUND + zmMid(best)], t: 0.25 });
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
  if (typeof sfxAnnounce === 'function') sfxAnnounce(k, D.n + '!');
  if (k === 'keg') { if (ZM.downKit) ZM.downKit.keg = true;   // (down: what you really carry is filled when you're up)
    for (const id of ZM.own) ZM.res[id] = typeof zmpAmmo === 'function' ? zmpAmmo(id) : ZM_AMMO[id];   // [pap] (a reforged reserve)
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
// what this place's chest can give: the Lighthouse's has the Fresnel Lamp, Wrackhaven's the Hermit's Claw (noBox)
// (ZM_BOXW itself stays whole, as co-op sends the chest's weapon by its place in it)
const zmBoxList = () => { const no = (ZM_MAPS[ZM_MAP] && ZM_MAPS[ZM_MAP].noBox) || []; return ZM_BOXW.filter(([id]) => !no.includes(id)); };
function zmBoxRoll(own) {
  const all = zmBoxList(), pool = all.filter(([id]) => !(own || ZM.own).includes(id)), list = pool.length ? pool : all;
  let r = Math.random() * list.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of list) { r -= w; if (r <= 0) return id; }
  return list[0][0];
}
function zmBoxTick(dt) {
  const B = ZM.box; B.t += dt;
  if (B.st === 'spin') {
    // the weapons turn over above it, slower and slower
    B.cyc += dt * (14 - B.t * 3);
    if (B.cyc > 1) { B.cyc = 0; const ids = zmBoxList().map(a => a[0]); B.show = ids[(ids.indexOf(B.show) + 1 + ((Math.random() * 3) | 0)) % ids.length]; zmSound('tick'); }
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
// a weapon in hand. You carry two guns and, beside them, one blade (the cutlass, the Boarding Axe): a blade never
// takes a gun's place, nor a gun a blade's. A third gun replaces the gun you're holding (or, with the blade out, the
// one you held last); a second blade replaces the first. (It once took a gun's place, and with the gun gone the
// cutlass was all you had left)
const zmBlade = id => !!(FPSW[id] && FPSW[id].melee) && id !== 'plimsoll';
function zmGive(id) {
  const m = FPS.me, w = FPSW[id], was = FPS.weapon;
  if (!ZM.own.includes(id)) {
    const blade = zmBlade(id), kin = ZM.own.filter(k => zmBlade(k) === blade && k !== 'plimsoll');
    if (kin.length < (blade ? 1 : 2)) ZM.own.splice(blade ? ZM.own.length : ZM.own.filter(k => !zmBlade(k) && k !== 'plimsoll').length, 0, id);
    else { const out = blade ? kin[0] : kin.includes(was) ? was : kin.includes(FPS.last) ? FPS.last : kin[kin.length - 1]; ZM.own[ZM.own.indexOf(out)] = id; }
  }
  m.mags[id] = w.mag; ZM.res[id] = ZM_AMMO[id];
  if (was !== id) { m.mags[was] = m.ammo; FPS.weapon = id; m.ammo = w.mag; m.reload = 0; m.cd = 0; FPS.drawT = 0.45; FPS.scoped = false; FPS.heldFire = true; }
  else { m.ammo = w.mag; }
  zmFixLast();
  zmSound('buy');
}
// (Q, the last weapon) always something you still carry, and never the one in your hands
function zmFixLast() { if (!ZM.own.includes(FPS.last) || FPS.last === FPS.weapon) FPS.last = ZM.own.find(k => k !== FPS.weapon) || FPS.weapon; }
function zmLastWeapon() { zmFixLast(); fpsSwitch(FPS.last); }
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
  for (const b of ZM.buys) consider({ k: 'buy', b }, b.x + b.nx * 0.7, b.y + b.ny * 0.7, b.z || 0, 1.6, true);
  for (const p of ZM.perksAt) consider({ k: 'perk', p }, p.x + p.nx * 0.9, p.y + p.ny * 0.9, p.z || 0, 1.7, true);
  for (const d of ZM.doors) if (!d.open) consider({ k: 'door', d }, d.x, d.y, d.z || 0, 2.3, false);
  const B = ZM.box, S = ZM.spawns[B.at];
  if (S && (B.st === 'idle' || (B.st === 'offer' && B.owner === m.id))) consider({ k: 'box' }, S.x + S.nx * 0.9, S.y + S.ny * 0.9, S.z - 0.32, 1.8, true);
  if (typeof zmpConsider === 'function') zmpConsider(consider);   // [pap] the bench
  if (typeof zmlConsider === 'function') zmlConsider(consider);   // [lamp] the lever that lights the lamp
  // someone down: you can get them up
  if (ZM.net) for (const r of FPS.remote.values()) if (r.down && !r.dead) consider({ k: 'rev', sid: r.id, n: r.n }, r.x, r.y, r.jz || 0, 1.8, false);
  for (const w of ZM.windows) if (!w.sea && w.boards < 6 && zmOpen(w.zone)) consider({ k: 'win', w }, w.x - w.nx * 0.95, w.y - w.ny * 0.95, w.z || 0, w.hatch ? 1.6 : 1.9, false);
  if (typeof zeNearest === 'function') zeNearest(consider);   // [egg hook] src/zmegg.js
  if (typeof zhNearest === 'function') zhNearest(consider);   // [egg2 hook] src/zmegg2.js
  if (typeof raidConsider === 'function') raidConsider(consider);   // [raid]
  // (down on the floor, nothing's in reach but your pepperbox)
  ZM.near = zmIsDown() ? null : best;
  ZM.prompt = ZM.near ? zmPrompt(ZM.near) : null;
}
function zmPrompt(o) {
  { const r = typeof zmpPrompt === 'function' && zmpPrompt(o); if (r) return r; }   // [pap] the bench, a reforged weapon's ammunition
  { const r = typeof zmlPrompt === 'function' && zmlPrompt(o); if (r) return r; }   // [lamp] the lever
  { const r = typeof raidPrompt === 'function' && raidPrompt(o); if (r) return r; }   // [raid]
  if (o.k === 'egg') return typeof zePrompt === 'function' ? zePrompt(o) : null;   // [egg hook] src/zmegg.js
  if (o.k === 'egg2') return typeof zhPrompt === 'function' ? zhPrompt(o) : null;   // [egg2 hook] src/zmegg2.js
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
  if (o.k === 'rev') return ZM.revT > 0 ? null : { text: `Hold to get ${o.n || 'them'} up`, hold: true };
  return null;
}
function zmUse() {
  const o = ZM.near, m = FPS.me; if (!o || m.dead > 0 || zmIsDown() || ZM.over) return;
  if (typeof zmpUse === 'function' && zmpUse(o)) return;   // [pap]
  if (typeof zmlUse === 'function' && zmlUse(o)) return;   // [lamp]
  if (typeof raidUse === 'function' && raidUse(o)) return;   // [raid]
  if (o.k === 'egg') { if (typeof zeUse === 'function') zeUse(o); return; }   // [egg hook] src/zmegg.js
  if (o.k === 'egg2') { if (typeof zhUse === 'function') zhUse(o); return; }   // [egg2 hook] src/zmegg2.js
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
  for (const k of d.also || []) ZM.open.add(k);
  if (d.zones.includes('lamp')) ZM.open.add('tower');
  zmNavBuild(); ZM.navT = 0;
  zmSound(d.kind === 'debris' ? 'debris' : 'door');
  for (let i = 0; i < 14; i++) FPS.parts.push({ x: d.x + (Math.random() - 0.5) * 2, y: d.y + (Math.random() - 0.5) * 2, z: FPSC.GROUND + Math.random() * 2.2, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, vz: Math.random() * 1.5, t: 0.9, c: '150,140,120' });
}

// ---------- going down ----------
function zmDown() {
  const m = FPS.me;
  if (zmIsDown()) return;
  ZM.downs++;
  if (ZM.perks.wind) {
    // Second Wind: back up, everything near you thrown back, and every tonic gone
    ZM.perks = {}; m.hp = ZMC.HP; m.protect = 3; m.iframe = ZMC.IFRAME_UP; FPS.hurtT = 0.8;
    for (const z of ZM.z) { if (z.dead || z.st !== 'in') continue; const dx = z.x - m.x, dy = z.y - m.y, d = Math.hypot(dx, dy) || 1; if (d < 6) for (let k = 0; k < 6; k++) zmMove(z, dx / d * 0.5, dy / d * 0.5); z.atk = 1.5; }
    ZM.banner = { text: 'Second Wind', t: 2.5, col: ZM_PERKS.wind.c };
    zmSound('wind');
    return;
  }
  if (ZM.net) {
    // together: down on the floor, your tonics gone, with a pepperbox in your hand until a friend gets you up
    m.hp = 0; FPS.scoped = false; ZM.perks = {}; ZM.downT = ZM_DOWN.T; ZM.beat = 0;
    zmDownArm();
    ZM.banner = { text: 'You’re down', t: 3 };
    fpsFeed('You’re down. Keep firing: someone can get you up by holding Use beside you.');
    zmSound('over');
    return;
  }
  zmEnd();
}
// down (together), and no one's got you up yet
const zmIsDown = () => ZM.downT > 0 && !ZM.ghost;
// what you held, put by; a pepperbox to hold instead: a full cylinder and a couple more loads (a reforged one, if
// yours is), whether you still carry one or not. Nothing to switch to while you're down
function zmDownArm() {
  const m = FPS.me;
  m.mags[FPS.weapon] = m.ammo;
  ZM.downKit = { own: ZM.own.slice(), res: Object.assign({}, ZM.res), mags: Object.assign({}, m.mags), weapon: FPS.weapon, last: FPS.last, keg: false,
    pap: ZM.pap ? Object.assign({}, ZM.pap) : null };   // ([pap] what's been reforged, kept for when you're up)
  ZM.own = ['pepperbox']; ZM.res = { pepperbox: ZM_DOWN.RES };
  FPS.weapon = FPS.last = 'pepperbox';
  m.ammo = m.mags.pepperbox = fpsW().mag; m.reload = 0; m.cd = 0; FPS.drawT = 0.45; FPS.beamT = 0; FPS.heldFire = true; FPS.knifeT = 0;
}
// up again: everything you carried back in your hands, as it was (filled, if a Powder Keg came while you were down)
function zmDownDisarm() {
  const m = FPS.me, K = ZM.downKit; if (!K) return;
  ZM.downKit = null;
  ZM.own = K.own; ZM.res = K.res; m.mags = K.mags;
  if (K.pap) ZM.pap = Object.assign(ZM.pap || {}, K.pap);
  if (K.keg) for (const id of ZM.own) { ZM.res[id] = typeof zmpAmmo === 'function' ? zmpAmmo(id) : ZM_AMMO[id]; }
  FPS.weapon = ZM.own.includes(K.weapon) ? K.weapon : ZM.own[0] || 'pepperbox'; FPS.last = K.last;
  m.ammo = m.mags[FPS.weapon] != null ? m.mags[FPS.weapon] : fpsW().mag; m.reload = 0; m.cd = 0; FPS.drawT = 0.45; FPS.scoped = false;
}
// dragging yourself along the floor: whatever fpsInput moved you, cut down to a crawl, and no running
function zmCrawl(m, was, dt) {
  FPS.runK = 0; FPS.padRun = false;
  const dx = m.x - was[0], dy = m.y - was[1], d = Math.hypot(dx, dy), most = ZM_DOWN.CRAWL * dt;
  if (d <= most) return;
  m.x = was[0]; m.y = was[1];
  fpsMove(m, dx / d * most, dy / d * most);
}
// the clock on the floor, and your heart in your ears: a double beat, quicker as the time runs out
function zmDownTick(dt) {
  ZM.downT -= dt;
  if (ZM.downT <= 0) { zmBleedOut(); return; }
  // ([pap] a weapon on the bench waits there until you're up)
  if (ZM.forge && ZM.forge.st === 'work' && typeof ZM_PAP !== 'undefined') ZM.forge.t = Math.min(ZM.forge.t, ZM_PAP.TIME - 0.2);
  const was = ZM.beat;
  ZM.beat += dt * (0.9 + 1.5 * (1 - ZM.downT / ZM_DOWN.T));
  if (Math.floor(was) !== Math.floor(ZM.beat)) zmSound('beat');
}
// someone's just been got up: they're up for everyone at once (no ring left filling, no marker over them, nobody
// starting on them again), though their own word of it may be a moment behind; until it comes, or UP seconds pass
function zmUpNow(sid) {
  ZM.upT[sid] = ZM_DOWN.UP;
  if (ZM.revOf === sid) { ZM.revT = 0; ZM.revOf = null; }
  const r = FPS.remote.get(sid); if (r) { r.down = false; r.wasDn = false; r.dn = 0; }
  if (ZM.near && ZM.near.k === 'rev' && ZM.near.sid === sid) { ZM.near = null; ZM.prompt = null; }
}
// someone else went down: their name across everyone's screen for a few seconds, and in the feed
function zmDownNote(n) {
  ZM.downNotes = (ZM.downNotes || []).filter(o => o.n !== n).concat([{ n, t: ZM_DOWN.NOTE }]).slice(-3);
  fpsFeed(`${n} is down! Hold Use beside them to get them up.`);
}
// who's getting me up just now, and how far along they are (from their presence: src/zmnet.js)
function zmReviver() {
  for (const r of FPS.remote.values()) if (r.rv && r.rv[0] === FPS.me.id && !r.dead && !r.down) return { n: r.n, k: r.rv[1] };
  return null;
}
// the time on the floor ran out and nobody came: out until the next round
function zmBleedOut() {
  const m = FPS.me;
  ZM.downT = 0; ZM.ghost = true; ZM.downKit = null; m.dead = FPSC.RESPAWN - 0.6; m.reload = 0; FPS.scoped = false;
  fpsFeed('You bled out. You’ll be back next round, if anyone holds that long.');
}
// up again (a friend got to you): your own weapons back in your hands
function zmGetUp(by) {
  const m = FPS.me; if (!(ZM.downT > 0)) return;
  ZM.downT = 0; m.dead = 0; m.hp = ZMC.HP; m.protect = 2; m.iframe = ZMC.IFRAME_UP;   // (three seconds no knock can land, firing or not)
  zmDownDisarm();
  ZM.banner = { text: 'Back on your feet', t: 2, small: true };
  if (by) fpsFeed(`${by} got you up.`);
  zmSound('wind');
}
function zmShowOver() {
  if ((typeof RAID !== 'undefined' && RAID.on)) return raidShowOver();   // [raid]
  const r = ZM.round, held = Math.max(0, r - 1);
  if ($('zmOverEye')) $('zmOverEye').textContent = 'Keeper’s Last Light';
  $('zmOverHead').textContent = held ? `The light went out on round ${r}` : 'The light went out';
  $('zmOverStats').textContent = (ZM.net ? `${ZM.hum.length} of you. ` : '') + `You held ${held} ${held === 1 ? 'round' : 'rounds'}. ${ZM.kills} drowned sent back (${ZM.heads} through the head), ${ZM.doorsOpened} ${ZM.doorsOpened === 1 ? 'door' : 'doors'} opened, ${ZM.pts + ZM.spent} points earned.`;
  const best = typeof BOARD !== 'undefined' && BOARD.mine && BOARD.mine.zm;
  $('zmOverBest').textContent = best && best.s ? `Your best: round ${best.s + 1} reached, ${best.b} kills in one game.` : '';
  $('zmOver').hidden = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  setTimeout(() => $('zmAgain').focus(), 30);
}
function zmAgain() { const net = ZM.net; fpsStop(); if (!net) { const map = ZM_MAP; setTimeout(() => zmStart({ map }), 0); } else if (typeof zmnBackToLobby === 'function') zmnBackToLobby(); }

// ---------- sounds ----------
function zmSound(k, d, pan, kind) {
  try {
    if (soundOff()) return;
    const v = d == null ? 1 : Math.max(0.05, 1 - d / 40), o = { pan: clamp(pan || 0, -1, 1) };
    // (the recordings, where there's one: src/sfxbank.js)
    { const R = { moan: kind === 'run' ? 'snarl' : 'moan', tear: 'tear', board: 'board', hit: 'hit', round: 'roundstart', end: 'roundend', buy: 'buy', no: 'deny', door: 'door', debris: 'debris', open: 'chest', gull: 'gull', drop: 'powerup', take: 'pickup', drink: 'drink', beat: 'heartbeat', over: 'gameover', beam: 'beam' }[k];
      const VOL = { moan: 0.55, tear: 0.95, board: 0.85, round: 0.9, end: 0.8, buy: 0.6, no: 0.5, gull: 0.5, drop: 0.6, beat: 0.9, beam: 0.3 };
      if (R && sfxPlay(R, { vol: (VOL[k] || 0.85) * v, pan: o.pan, gap: k === 'beam' ? 1.1 : 0, vary: k === 'moan' ? 0.2 : 0.08 })) return; }
    if (k === 'moan') { const f = kind === 'run' ? 260 : 170 + Math.random() * 60; noise('bandpass', f, 6, 0.12, 0.22 * v, 0.7, Object.assign({ to: f * 0.7 }, o)); tone(f * 0.5, 'sawtooth', 0.1, 0.05 * v, 0.6, Object.assign({ to: f * 0.35 }, o)); }
    // (the boards: a deep knock, like a fist on a door)
    else if (k === 'tear') { tone(95, 'sine', 0.002, 0.4 * v, 0.28, Object.assign({ to: 55 }, o)); noise('lowpass', 420, 1, 0.002, 0.3 * v, 0.16, o); }
    else if (k === 'board') { tone(110, 'sine', 0.002, 0.38, 0.22, { to: 65 }); noise('lowpass', 480, 1, 0.002, 0.28, 0.12); }
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
    else if (k === 'beat') { tone(58, 'sine', 0.005, 0.32, 0.16, { to: 42 }); tone(52, 'sine', 0.005, 0.22, 0.16, { to: 38, delay: 0.2 }); }
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
// several geometries as one (positions and normals; for one material)
function z3Merge(list) {
  if (!list.length) return null;
  const P = [], Nn = [];
  for (const g0 of list) { const g1 = g0.index ? g0.toNonIndexed() : g0; P.push(...g1.attributes.position.array); Nn.push(...g1.attributes.normal.array); if (g1 !== g0) g1.dispose(); g0.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.computeBoundingSphere();
  return g;
}
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
// The tonic cabinets' living parts (their wood and brass and bottles are the island's, FPI_K.tonic): an enamel plate
// with the tonic's name across the crest's foot, a faint tint and a highlight on the glass, a glow behind it that
// slowly breathes, and bubbles rising up the column. Animated by zm3dTonicsTick
function zm3dTonics(grp, G0) {
  Z3.tonics = [];
  const Zd = FPS.g.isle.zm; if (!Zd || !Zd.perks) return;
  const halo = z3Soft('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)'), bubG = new THREE.SphereGeometry(1, 6, 4);
  const paneG = new THREE.PlaneGeometry(1.1, 0.8), streakG = new THREE.PlaneGeometry(0.07, 0.9);
  for (const q of Zd.perks) {
    const P = ZM_PERKS[q.k]; if (!P) continue;
    const g = new THREE.Group(); grp.add(g);
    g.position.copy(z3v(q.x, q.y, G0 + (q.z || 0) + (typeof fpsIsleH === 'function' ? fpsIsleH(FPS.g.isle, q.x, q.y) : 0) - 0.03));
    g.rotation.y = Math.atan2(q.nx, -q.ny);
    const C = new THREE.Color(P.c);
    // the plate: dark enamel in a brass rim, the name in gilt, a small star either side
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const x = cv.getContext('2d'), en = C.clone().multiplyScalar(0.22);
    x.fillStyle = '#7a5e26'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#c8a050'; x.fillRect(4, 4, 504, 88);
    x.fillStyle = `rgb(${en.r * 255 | 0},${en.g * 255 | 0},${en.b * 255 | 0})`; x.fillRect(12, 12, 488, 72);
    x.strokeStyle = 'rgba(220,190,120,0.7)'; x.lineWidth = 2; x.strokeRect(18, 18, 476, 60);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '48px "IM Fell English SC", Georgia, serif';
    x.fillStyle = '#f0dca0'; x.shadowColor = P.c; x.shadowBlur = 10; x.fillText(P.n, 256, 51);
    x.shadowBlur = 0; x.fillStyle = P.c; for (const sx of [40, 472]) { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? 5 : 12; x.lineTo(sx + Math.cos(a) * r, 48 + Math.sin(a) * r); } x.fill(); }
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.16), new THREE.MeshBasicMaterial({ map: tex, color: 0xb8b0a0, fog: true }));
    plate.position.set(0, 2.115, 0.005); g.add(plate);
    // the glass: a tint of the tonic's colour, and a highlight across it
    const pane = new THREE.Mesh(paneG, new THREE.MeshBasicMaterial({ color: C, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending }));
    pane.position.set(0, 1.43, 0.275); g.add(pane);
    const streak = new THREE.Mesh(streakG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending }));
    streak.position.set(-0.32, 1.43, 0.278); streak.rotation.z = -0.5; g.add(streak);
    // the glow in the case (it breathes), and a softer one on the floor in front
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: C, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(1.3, 1.0, 1); glow.position.set(0, 1.42, 0.05); g.add(glow);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: halo, color: C, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.05, 0.6); g.add(pool);
    // the bubbles, up the front of the column
    const bm = new THREE.MeshBasicMaterial({ color: C.clone().lerp(new THREE.Color('#ffffff'), 0.6) }), bub = [];
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(bubG, bm); b.scale.setScalar(0.014 + (i % 3) * 0.004); b.position.set(((i * 37) % 7 - 3) * 0.012, 1.1 + i * 0.08, 0.1); g.add(b); bub.push({ m: b, k: i / 6, u: b.position.x, s: b.scale.x }); }
    Z3.tonics.push({ g, glow, pool, bub, ph: Zd.perks.indexOf(q) * 1.7 });
  }
}
function zm3dTonicsTick(t) {
  if (!Z3.tonics) return;
  const m = FPS.me;
  for (const T of Z3.tonics) {
    // (beyond a room or two away, none of it: the plate's unreadable there, and it spares the draws)
    const p = T.g.position, near = Math.hypot(p.x - m.x, -p.z - m.y) < 30;
    T.g.visible = near; if (!near) continue;
    if (reduceMotion) { T.glow.material.opacity = 0.4; continue; }
    const br = 0.5 + 0.5 * Math.sin(t * 1.3 + T.ph);
    T.glow.material.opacity = 0.32 + 0.16 * br; T.pool.material.opacity = 0.17 + 0.08 * br;
    for (const b of T.bub) {
      const k = (t * 0.32 + b.k) % 1;
      b.m.position.set(b.u + Math.sin(t * 3 + b.k * 9) * 0.008, 1.1 + k * 0.47, 0.1);
      b.m.scale.setScalar(b.s * (0.6 + k * 0.6) * Math.min(1, (1 - k) * 8));
    }
  }
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
    if (w.sea) return { g, list, out };
    if (w.hatch) {
      // (the group turned flat: its local y runs across the hatch, its local z up into the loft)
      g.position.copy(z3v(w.x, w.y, G0 + w.hatch - 0.22)); g.rotation.set(-Math.PI / 2, 0, 0);
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0x07090c, side: THREE.DoubleSide })); hole.position.z = 0.13; g.add(hole);
      for (const [x, y, a, b] of [[0, 0.8, 1.7, 0.1], [0, -0.8, 1.7, 0.1], [0.8, 0, 0.1, 1.5], [-0.8, 0, 0.1, 1.5]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(a, b, 0.24), boardM[2]); f.position.set(x, y, 0.1); g.add(f); }
      for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.2, 0.05), boardM[i % 3]); b.position.set(0, -0.62 + i * 0.25, 0); b.rotation.z = (rnd() - 0.5) * 0.12; g.add(b); list.push({ m: b, y: b.position.y, rz: b.rotation.z }); }
      return { g, list, out: -1 };
    }
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(w.tw ? 1.32 : 1.95, 0.17, 0.06), boardM[i % 3]); b.position.set(0, 1.12 + i * 0.2, 0); b.rotation.z = (rnd() - 0.5) * 0.22; g.add(b); list.push({ m: b, y: b.position.y, rz: b.rotation.z }); }
    return { g, list, out };
  });
  // weapons on the walls, and their prices chalked under them
  for (const b of ZM.buys) {
    const g = new THREE.Group(); g.position.copy(z3v(b.x + b.nx * 0.07, b.y + b.ny * 0.07, G0 + (b.z || 0))); g.rotation.y = Math.atan2(b.ny, b.nx) - Math.PI / 2; grp.add(g);
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
  zm3dTonics(grp, G0);
  if (typeof ze3dBuild === 'function') ze3dBuild(grp);   // [egg hook] src/zmegg.js
  if (typeof zh3dBuild === 'function') zh3dBuild(grp);   // [egg2 hook] src/zmegg2.js
  if (typeof raid3dBuild === 'function') raid3dBuild(grp);   // [raid]
  zm3dTower(grp);
  zm3dLantern(grp);
  zm3dWater(grp);
  zm3dFarLight(grp);
}
// Wrackhaven: out across the harbour, far off on its own skerry, the Lighthouse, lit and turning. Only to look at,
// from the quay and anywhere with a view of the sea: a whitewashed tower with two red bands, the gallery and the
// lantern on top, the lamp blazing in it and its beam sweeping round over the water; when it swings your way the
// lantern flares. Its materials ignore the fog, darkened instead to the night, so it stands out against the dark.
const ZFL = { X: -70, Y: -330, H: 34, R: 4.2, SPIN: 0.39 };
function zm3dFarLight(grp) {
  Z3.far = null;
  const Z = FPS.g.isle.zm; if (!Z || Z.tower || !Z.bay) return;
  const g = new THREE.Group(), M = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k == null ? 0.3 : k), fog: false });
  g.position.copy(z3v(FPSC.CX + ZFL.X, FPSC.CY + ZFL.Y, 0));
  const H = ZFL.H, R = ZFL.R, add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
  // the skerry, the keeper's cottage at its foot, the tower (wider at the foot), its bands
  add(new THREE.CylinderGeometry(R * 3.2, R * 4.6, 3.2, 10), M('#3a3c40', 0.35), -0.6);
  { const c = add(new THREE.BoxGeometry(7, 3.2, 4.4), M('#d8d4c8', 0.22), 2.6); c.position.x = R * 2.1; const r = add(new THREE.ConeGeometry(4.6, 1.8, 4), M('#3a2a24', 0.25), 5.1); r.position.x = R * 2.1; r.rotation.y = Math.PI / 4; r.scale.z = 0.62; }
  add(new THREE.CylinderGeometry(R * 0.72, R, H, 20), M('#e8e4d8', 0.34), H / 2 + 1);
  for (const y of [H * 0.32, H * 0.62]) add(new THREE.CylinderGeometry(R * (1 - y / H * 0.28) + 0.03, R * (1 - (y - 3) / H * 0.28) + 0.03, 3, 20), M('#b03028', 0.32), y + 1);
  // the gallery, the lantern room (glass, lit from inside), the dome and its vane
  const T = H + 1, RT = R * 0.72;
  add(new THREE.CylinderGeometry(RT + 1.1, RT + 0.6, 0.6, 20), M('#202224', 0.6), T + 0.3);
  add(new THREE.CylinderGeometry(RT * 0.78, RT * 0.78, 3.4, 16), new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false }), T + 2.3);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = add(new THREE.BoxGeometry(0.18, 3.4, 0.18), M('#202224', 0.6), T + 2.3); b.position.x = Math.cos(a) * RT * 0.8; b.position.z = Math.sin(a) * RT * 0.8; }
  add(new THREE.ConeGeometry(RT * 0.95, 2.2, 16), M('#902a24', 0.3), T + 5.1);
  add(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), M('#202224', 0.6), T + 6.8);
  // the glow round the lamp, and the flare when the beam faces you
  const halo = z3Soft('rgba(255,236,180,0.95)', 'rgba(255,220,150,0)');
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.scale.setScalar(14); glow.position.y = T + 2.3; g.add(glow);
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })); flare.scale.setScalar(60); flare.position.y = T + 2.3; g.add(flare);
  // the beam: two cones of light back to back from the lamp, out over the water
  const fade = z3Fade([[0, 'rgba(255,236,180,0.5)'], [0.35, 'rgba(255,226,160,0.16)'], [1, 'rgba(255,220,150,0)']]);
  const geo = new THREE.CylinderGeometry(1, 0.05, 1, 24, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(-Math.PI / 2);
  const beam = new THREE.Group(); beam.position.y = T + 2.3; g.add(beam);
  for (const s of [1, -1]) { const b = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false })); b.scale.set(18, 4, 320); b.rotation.y = s > 0 ? 0 : Math.PI; b.frustumCulled = false; b.renderOrder = 9; beam.add(b); }
  grp.add(g);
  Z3.far = { g, beam, flare };
}
// (each frame) turn the beam, and flare as it passes over you
function zm3dFarTick(t) {
  const F = Z3.far; if (!F) return;
  const a = (reduceMotion ? 0.6 : t * ZFL.SPIN) % (Math.PI * 2); F.beam.rotation.y = a;
  const m = FPS.me, toMe = Math.atan2(m.x - (FPSC.CX + ZFL.X), m.y - (FPSC.CY + ZFL.Y));
  // (turned by a, the beam's two ends point along the bearings -a and PI - a)
  const off = Math.min(Math.abs(angDiff(-a, toMe)), Math.abs(angDiff(Math.PI - a, toMe)));
  F.flare.material.opacity = clamp(1 - off / 0.22, 0, 1) * 0.9;
}
// The harbour: water laid over the island south of the shore (ZM_SHORE), round the jetty and out past the island's
// edge, where it slopes down into the open sea. A grid a metre square, its height a hair over the ground (dipping
// under it along the shore, so the ground cuts a clean waterline), swaying gently; a ripple in its light, so the
// moon and the jetty's lamps glint on it
const ZW = { t: { value: 0 } };
function zm3dWater(grp) {
  if (!FPS.g.isle.zm || !FPS.g.isle.zm.bay) return;
  const OX = FPSC.CX, OY = FPSC.CY, G0 = FPSC.GROUND, IR = FPSC.R, X0 = -96, Y0 = -96, NX = 193, NY = 83;
  const edge = a => IR * (1 + 0.035 * Math.sin(a * 5 + 1) + 0.02 * Math.sin(a * 13));
  const pos = new Float32Array(NX * NY * 3), amp = new Float32Array(NX * NY), keep = new Uint8Array(NX * NY), idx = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const lx = X0 + i, ly = Y0 + j, v = j * NX + i, r = Math.hypot(lx, ly), e = edge(Math.atan2(ly, lx)), dIn = ZM_SHORE(lx) - ly;
    const out = clamp((r - e) / 7, 0, 1), L = ZMD.WATER - (ZMD.WATER + FPSC.GROUND) * out;
    pos[v * 3] = OX + lx; pos[v * 3 + 1] = G0 + (dIn >= 0 ? L : L + dIn * 0.6); pos[v * 3 + 2] = -(OY + ly);
    amp[v] = clamp(dIn / 2.5, 0, 1) * (1 - out * 0.7);
    keep[v] = dIn > -1.5 && r < e + 7.5 ? 1 : 0;
  }
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
    if (keep[a] && keep[b] && keep[c] && keep[d]) idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('amp', new THREE.BufferAttribute(amp, 1));
  geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
  const mat = new THREE.MeshPhongMaterial({ color: 0x06121a, specular: 0x9aaab8, shininess: 80, emissive: 0x02060a, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = ZW.t;
    sh.vertexShader = 'uniform float uT;\nattribute float amp;\nvarying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 w0 = modelMatrix * vec4(position, 1.0);
    transformed.y += amp * (0.022 * sin(w0.x * 0.45 + uT * 1.3) + 0.016 * sin(w0.z * 0.6 - uT * 1.1) + 0.01 * sin((w0.x + w0.z) * 1.1 + uT * 2.0)); }
  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = 'uniform float uT;\nvarying vec3 vWp;\n' + sh.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  { vec2 p = vWp.xz;
    vec2 gr = 0.06 * cos(dot(p, vec2(1.3, 0.9)) + uT * 1.9) * vec2(1.3, 0.9) + 0.05 * cos(dot(p, vec2(-0.8, 1.7)) + uT * 2.3) * vec2(-0.8, 1.7)
            + 0.03 * cos(dot(p, vec2(2.9, -1.4)) - uT * 3.1) * vec2(2.9, -1.4) + 0.02 * cos(dot(p, vec2(-4.1, -2.6)) + uT * 3.7) * vec2(-4.1, -2.6);
    normal = normalize((viewMatrix * vec4(normalize(vec3(-gr.x, 1.0, -gr.y)), 0.0)).xyz); }`);
  };
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 0; grp.add(m);
  Z3.water = m;
}
// The tower from outside: one smooth whitewashed skin, wider at the foot and drawing in towards the gallery, on a
// granite plinth; a red band under the gallery; the openings cut neat and deep, with granite sills, and the doorway
// in a granite surround; at the top a corbel flaring out under the gallery's black deck. All one mesh (and the
// gallery's railing another), built in world space; quads are wound to face their normals, so it's drawn one-sided
function zm3dTower(grp) {
  const Z = FPS.g.isle.zm; if (!Z || !Z.tower) return;
  const G0 = FPSC.GROUND, cx = Z.tower.x, cy = Z.tower.y, S = ZM_SKIN, N = ZMT.N, DA = Math.PI / N, OPEN = Z.tower.open || {};
  const RIN = ZMT.R, L = ZMT.L, pos = [], nor = [], col = [];
  const C = (h, k) => { const c = new THREE.Color(h); return [c.r * k, c.g * k, c.b * k]; };
  const WHITE = C('#f6f1e6', 0.86), RED = C('#b02c22', 0.62), GRAN = C('#62656a', 0.5), GRAN2 = C('#4a4c50', 0.5), DECK = C('#24282b', 0.6), REV = C('#e8e2d4', 0.78);
  const P = (a, r, h) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, h];
  // a quad from four world points (x, y, h), its normal (world), a colour or four; turned to face its normal
  const quad = (q, n, c, shade) => {
    const t = q.map(([x, y, h]) => [x, G0 + h, -y]), nn = [n[0], n[2], -n[1]];
    const ux = t[1][0] - t[0][0], uy = t[1][1] - t[0][1], uz = t[1][2] - t[0][2], vx = t[2][0] - t[0][0], vy = t[2][1] - t[0][1], vz = t[2][2] - t[0][2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx, flip = fx * nn[0] + fy * nn[1] + fz * nn[2] < 0;
    const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const i of order) {
      pos.push(...t[i]);
      const ni = Array.isArray(n[0]) ? [n[i][0], n[i][2], -n[i][1]] : nn; nor.push(...ni);
      const ci = Array.isArray(c[0]) ? c[i] : c, k = shade ? shade(q[i]) : 1; col.push(ci[0] * k, ci[1] * k, ci[2] * k);
    }
  };
  // a box: centre (x, y, h), along u (a unit (x, y)), half-sizes along u, across it, and up
  const box = (x, y, h, u, a, b, c, colr) => {
    const v = [-u[1], u[0]], pt = (i, j, k) => [x + u[0] * a * i + v[0] * b * j, y + u[1] * a * i + v[1] * b * j, h + c * k];
    quad([pt(1, -1, -1), pt(1, 1, -1), pt(1, 1, 1), pt(1, -1, 1)], [u[0], u[1], 0], colr);
    quad([pt(-1, -1, -1), pt(-1, 1, -1), pt(-1, 1, 1), pt(-1, -1, 1)], [-u[0], -u[1], 0], colr);
    quad([pt(-1, 1, -1), pt(1, 1, -1), pt(1, 1, 1), pt(-1, 1, 1)], [v[0], v[1], 0], colr);
    quad([pt(-1, -1, -1), pt(1, -1, -1), pt(1, -1, 1), pt(-1, -1, 1)], [-v[0], -v[1], 0], colr);
    quad([pt(-1, -1, 1), pt(1, -1, 1), pt(1, 1, 1), pt(-1, 1, 1)], [0, 0, 1], colr);
    quad([pt(-1, -1, -1), pt(1, -1, -1), pt(1, 1, -1), pt(-1, 1, -1)], [0, 0, -1], colr);
  };
  // the openings: for each wall piece round, what's cut out of it, and from where to where
  const holes = [];
  for (let i = 0; i < N; i++) for (let k = 0; k < 5; k++) {
    const o = (OPEN[k] || {})[i]; if (!o) continue;
    const ai = i / N * Math.PI * 2;
    if (o === 'a') holes.push({ i, a0: ai - DA, a1: ai + DA, z0: -1, z1: L[k] + 2.9, arch: true });
    else holes.push({ i, a0: ai - S.HA, a1: ai + S.HA, z0: L[k] + 1.0, z1: L[k] + 2.35, glazed: o === 'g' });
  }
  const cut = (a, z0, z1) => holes.some(hh => a > hh.a0 - 1e-6 && a < hh.a1 + 1e-6 && z0 >= hh.z0 - 1e-6 && z1 <= hh.z1 + 1e-6);
  // the columns round: each wall piece in four, its window's edges among them
  const cols = [];
  for (let i = 0; i < N; i++) { const ai = i / N * Math.PI * 2; for (const f of [-1, -S.HA / DA, 0, S.HA / DA]) cols.push(ai + f * DA); }
  cols.push(Math.PI * 2 - DA);
  // (weathered a little: a soft streaking round and up, darker towards the foot)
  const shade = q => { const a = Math.atan2(q[1] - cy, q[0] - cx), z = q[2]; return (0.95 + 0.035 * Math.sin(a * 7 + 1.3) * Math.sin(z * 0.37 + a * 3) + 0.015 * Math.sin(a * 23)) * (0.9 + 0.1 * clamp(z / 4, 0, 1)); };
  const ring = (zs, rOf, colOf, cutOk) => {
    for (let j = 0; j < zs.length - 1; j++) {
      const za = zs[j], zb = zs[j + 1], ra = rOf(za), rb = rOf(zb), slope = (ra - rb) / Math.max(1e-3, zb - za), c = colOf((za + zb) / 2);
      for (let m = 0; m < cols.length - 1; m++) {
        const a0 = cols[m], a1 = cols[m + 1];
        if (cutOk && cut((a0 + a1) / 2, za, zb)) continue;
        const n = a => { const l = Math.hypot(1, slope); return [Math.cos(a) / l, Math.sin(a) / l, slope / l]; };
        quad([P(a0, ra, za), P(a1, ra, za), P(a1, rb, zb), P(a0, rb, zb)], [n(a0), n(a1), n(a1), n(a0)], c, shade);
      }
    }
  };
  // the plinth: granite, a weathered slope up onto the shaft
  ring([-0.5, S.PZ], () => S.PL, () => GRAN, true);
  ring([S.PZ, S.Z0], z => S.PL + (S.RB - S.PL) * (z - S.PZ) / (S.Z0 - S.PZ), () => GRAN2, true);
  // the shaft: rows at every window's head and sill, the band's edges, and enough between for the curve
  const zs = new Set([S.Z0, S.Z1, ...S.BAND, L[0] + 2.9]);
  for (let k = 0; k < 5; k++) { zs.add(L[k] + 1.0); zs.add(L[k] + 2.35); }
  for (let z = S.Z0; z < S.Z1; z += 2.5) zs.add(z);
  const zl = [...zs].filter(z => z >= S.Z0 && z <= S.Z1).sort((a, b) => a - b);
  ring(zl, S.r, z => z > S.BAND[0] && z < S.BAND[1] ? RED : WHITE, true);
  // the corbel under the gallery: a cavetto flaring out, then the deck's edge
  const DR = 11.45, DZ = L[5] + 0.03, cav = [];
  for (let j = 0; j <= 5; j++) { const t = j / 5; cav.push([S.RT + (DR - 0.12 - S.RT) * (1 - Math.cos(t * Math.PI / 2)), S.Z1 + (DZ - 0.2 - S.Z1) * Math.sin(t * Math.PI / 2)]); }
  for (let j = 0; j < cav.length - 1; j++) {
    const [ra, za] = cav[j], [rb, zb] = cav[j + 1], dz = zb - za, dr = rb - ra, l = Math.hypot(dz, dr), nr = dz / l, nz = -dr / l;
    for (let m = 0; m < cols.length - 1; m++) { const a0 = cols[m], a1 = cols[m + 1]; quad([P(a0, ra, za), P(a1, ra, za), P(a1, rb, zb), P(a0, rb, zb)], [Math.cos((a0 + a1) / 2) * nr, Math.sin((a0 + a1) / 2) * nr, nz], WHITE); }
  }
  // the gallery's deck: black, overhanging, its edge and its underside
  for (let m = 0; m < cols.length - 1; m++) {
    const a0 = cols[m], a1 = cols[m + 1], am = (a0 + a1) / 2, ce = Math.cos(am), se = Math.sin(am);
    quad([P(a0, RIN, DZ), P(a1, RIN, DZ), P(a1, DR, DZ), P(a0, DR, DZ)], [0, 0, 1], DECK);
    quad([P(a0, DR, DZ - 0.2), P(a1, DR, DZ - 0.2), P(a1, DR, DZ), P(a0, DR, DZ)], [ce, se, 0], DECK);
    quad([P(a0, DR - 0.12, DZ - 0.2), P(a1, DR - 0.12, DZ - 0.2), P(a1, DR, DZ - 0.2), P(a0, DR, DZ - 0.2)], [0, 0, -1], DECK);
  }
  // the openings' reveals: jambs, heads and sills, from the skin in to the plaster; granite sills; the doorway's surround
  for (const hh of holes) {
    const ai = hh.i / N * Math.PI * 2, zb = Math.max(hh.z0, -0.5), zt = hh.z1, rin = a => (RIN) / Math.cos(a - ai);
    const rOut = z => z < S.PZ ? S.PL : z < S.Z0 ? S.PL + (S.RB - S.PL) * (z - S.PZ) / (S.Z0 - S.PZ) : S.r(z);
    for (const [a, sgn] of [[hh.a0, 1], [hh.a1, -1]]) {
      const t = [-Math.sin(a) * sgn, Math.cos(a) * sgn, 0], zz = hh.arch ? [zb, S.PZ, S.Z0, zt] : [zb, zt];
      for (let j = 0; j < zz.length - 1; j++) quad([P(a, rin(a), zz[j]), P(a, rOut(zz[j]), zz[j]), P(a, rOut(zz[j + 1]), zz[j + 1]), P(a, rin(a), zz[j + 1])], t, REV);
    }
    const am = (hh.a0 + hh.a1) / 2, sub = [hh.a0, am, hh.a1];
    for (let m = 0; m < 2; m++) {
      const a0 = sub[m], a1 = sub[m + 1];
      quad([P(a0, rin(a0), zt), P(a1, rin(a1), zt), P(a1, rOut(zt), zt), P(a0, rOut(zt), zt)], [0, 0, -1], REV);
      if (!hh.arch) quad([P(a0, rin(a0), zb), P(a1, rin(a1), zb), P(a1, rOut(zb), zb), P(a0, rOut(zb), zb)], [0, 0, 1], REV);
    }
    const u = [-Math.sin(am), Math.cos(am)], ro = rOut(zb);
    if (!hh.arch) {
      // a granite sill, proud of the wall
      const w = ro * Math.tan(S.HA) + 0.12, [x, y] = P(am, ro + 0.02, 0);
      box(x, y, zb - 0.07, u, w, 0.16, 0.07, GRAN);
    } else {
      // the doorway: a granite surround, a lintel over it, a step
      const w = ro * Math.tan(DA), top = S.r(zt);
      for (const s of [-1, 1]) { const [x, y] = P(am, S.r(1.5) + 0.04, 0); box(x + u[0] * s * (w + 0.18), y + u[1] * s * (w + 0.18), (zt - 0.2) / 2, u, 0.18, 0.14, (zt + 0.2) / 2, GRAN); }
      { const [x, y] = P(am, top + 0.02, 0); box(x, y, zt + 0.25, u, w + 0.42, 0.14, 0.25, GRAN); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x1a1915 }));
  grp.add(m); Z3.skin = m;
  // the gallery's railing: iron stanchions and three rails, standing on the deck over the parapet's line
  pos.length = nor.length = col.length = 0;
  const RR = RIN + 0.12, IRON = C('#1c1f22', 0.7), NS = 64;
  for (let i = 0; i < NS; i++) { const a = (i + 0.5) / NS * Math.PI * 2, [x, y] = P(a, RR, 0); box(x, y, DZ + 0.53, [-Math.sin(a), Math.cos(a)], 0.025, 0.025, 0.53, IRON); }
  for (const [h, t] of [[0.15, 0.025], [0.6, 0.025], [1.06, 0.045]]) for (let i = 0; i < NS; i++) {
    const a0 = i / NS * Math.PI * 2, a1 = (i + 1) / NS * Math.PI * 2, am = (a0 + a1) / 2, [x, y] = P(am, RR, 0);
    box(x, y, DZ + h, [-Math.sin(am), Math.cos(am)], RR * Math.sin(Math.PI / NS) + 0.005, t, t, IRON);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  rg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  rg.computeBoundingSphere();
  grp.add(new THREE.Mesh(rg, new THREE.MeshLambertMaterial({ vertexColors: true })));
}
// the glazed windows of the tower, and the lantern on top: its ring of glass in brass astragals, the gallery rail, the
// Roof Room over it (an iron drum) under the copper dome with its ventilator ball and lightning rod, and the Light
// itself, a great lens on the newel, dark until it's lit, and then turning, its one beam sweeping out over the sea
function zm3dLantern(grp) {
  const G0 = FPSC.GROUND, L5 = ZMT.L[5], T = ZM_TC, cx = FPSC.CX + T[0], cy = FPSC.CY + T[1];
  const glassM = new THREE.MeshPhongMaterial({ color: 0x9ab8c8, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const frameM = z3Lam('#2e5a5a'), brassM = new THREE.MeshPhongMaterial({ color: 0x8a6a2c, specular: 0xb09060, shininess: 60 });
  for (const w of ZM.glass) {
    // (set back in the skin's opening: as wide as the opening, a hand's breadth out from the plaster; in a flat wall,
    // the Quarters', as wide as its own opening, and in the middle of the wall's thickness)
    const nx = Math.cos(w.ang - Math.PI / 2), ny = Math.sin(w.ang - Math.PI / 2), ww = w.flat ? w.w : 2 * (ZMT.R + 0.42) * Math.tan(ZM_SKIN.HA);
    const off = w.flat ? 0 : 0.12, g = new THREE.Group(); g.position.copy(z3v(w.x + nx * off, w.y + ny * off, G0 + w.z0)); g.rotation.y = w.ang; grp.add(g);
    const h = w.z1 - w.z0, pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, h), glassM); pane.position.y = h / 2; g.add(pane);
    for (const x of [-ww / 2, 0, ww / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.08), frameM); b.position.set(x, h / 2, 0); g.add(b); }
    for (const y of [0.03, h / 2, h - 0.03]) { const b = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.07, 0.08), frameM); b.position.set(0, y, 0); g.add(b); }
    // a box of flowers on the sill inside
    const bx = new THREE.Mesh(new THREE.BoxGeometry(ww * 0.8, 0.18, 0.25), z3Lam('#5a3a24')); bx.position.set(0, 0.09, -0.44); g.add(bx);
    for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), z3Lam(i % 2 ? '#d84050' : '#e8e0d0')); f.position.set(-ww * 0.32 + i * ww * 0.16, 0.24, -0.44); g.add(f); }
  }
  // (no tower on this map: only its glazed windows)
  if (!FPS.g.isle.zm.top) { Z3.lens = null; return; }
  const top = new THREE.Group(); top.position.copy(z3v(cx, cy, G0 + L5)); grp.add(top);
  const R = ZMT.GLASS, HG = 4.4, MH = 0.95, DOOR = Math.PI / 12;
  // (the doors, east and west, left open: the lantern's base, its glass and its rings stop either side of them)
  const arcs = [[DOOR, Math.PI - 2 * DOOR], [Math.PI + DOOR, Math.PI - 2 * DOOR]];
  const arc3 = ([a, l]) => [a + Math.PI / 2, l];   // (from round the tower to three's cylinder angles)
  // the base of the lantern: an iron murette below the glass, and the glass above it in brass astragals
  const ironM = new THREE.MeshPhongMaterial({ color: 0x1e2224, specular: 0x404850, shininess: 30, side: THREE.DoubleSide });
  for (const ar of arcs) {
    const [t0, tl] = arc3(ar);
    const mu = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, MH, 32, 1, true, t0, tl), ironM); mu.position.y = MH / 2 + 0.03; top.add(mu);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HG - MH, 32, 1, true, t0, tl), glassM); gl.position.y = MH + (HG - MH) / 2; top.add(gl);
    for (const [y, rr] of [[MH, 0.07], [MH + (HG - MH) / 2, 0.045], [HG, 0.07]]) { const tg = new THREE.TorusGeometry(R, rr, 6, 32, tl); tg.rotateX(Math.PI / 2); const t = new THREE.Mesh(tg, brassM); t.rotation.y = ar[0] + tl; t.position.y = y; top.add(t); }
  }
  { // (the astragals, merged: one mesh)
    const bars = [];
    for (let i = 0; i < 24; i++) { if (i % 12 === 0) continue; const a = i / 24 * Math.PI * 2, b = new THREE.BoxGeometry(0.1, HG - MH, 0.1); b.translate(Math.cos(a) * R, MH + (HG - MH) / 2, -Math.sin(a) * R); bars.push(b); }
    for (const s of [-1, 1]) for (const a0 of [0, Math.PI]) { const a = a0 + s * DOOR, b = new THREE.BoxGeometry(0.16, HG, 0.16); b.translate(Math.cos(a) * R, HG / 2, -Math.sin(a) * R); bars.push(b); }
    const mg = z3Merge(bars); if (mg) top.add(new THREE.Mesh(mg, brassM));
  }
  // the cornice over the glass: a ring, open in the middle (inside, the lantern's ceiling is the Roof Room's floor:
  // its iron plate, ribbed, with the stair's opening in it), and an iron band inside up to that floor
  const red = new THREE.MeshPhongMaterial({ color: 0x8a261c, specular: 0x503028, shininess: 25 }), dark = z3Lam('#22282a');
  const RF = ZMT.RF - L5, RH = ZMT.RH, RW = ZMT.RW, [sa0, sa1, srr] = ZMT.SLOT;
  const corn = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.55, R + 0.25, 0.55, 48, 1, true), dark); corn.position.y = HG + 0.27; top.add(corn);
  { const cu = new THREE.RingGeometry(R - 0.1, R + 0.26, 48); cu.rotateX(Math.PI / 2); const m = new THREE.Mesh(cu, dark); m.position.y = HG; top.add(m); }
  { const band = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.07, R - 0.07, RF - 0.1 - HG, 48, 1, true), z3Lam('#1e2326', { side: THREE.DoubleSide })); band.position.y = (HG + RF - 0.1) / 2; top.add(band); }
  { // (the ceiling's ribs, out from a boss over the lens, round the opening)
    const ribs = [], inSlot = a => { const w = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return w > sa0 - 0.05 && w < sa1 + 0.05; };
    for (let i = 0; i < 16; i++) {
      const a = (i + 0.5) / 16 * Math.PI * 2, r1 = inSlot(a) ? srr - 0.05 : R - 0.1, len = r1 - 0.7;
      const b = new THREE.BoxGeometry(len, 0.14, 0.08); b.translate(0.7 + len / 2, RF - 0.37, 0); b.rotateY(a); ribs.push(b);
    }
    const ring = new THREE.TorusGeometry(0.75, 0.07, 6, 20); ring.rotateX(Math.PI / 2); ring.translate(0, RF - 0.37, 0); ribs.push(ring);
    const mg = z3Merge(ribs); if (mg) top.add(new THREE.Mesh(mg, ironM));
  }
  // the lamp's flue, from the top of the lens up through the Roof Room to the ventilator
  { const flM = z3Lam('#33383a'), fl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, RF + RH - 3.25, 12), flM); fl.position.y = 3.25 + (RF + RH - 3.25) / 2; top.add(fl);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.55, 0.35, 14, 1, true), brassM); hood.position.y = 3.32; top.add(hood);
    for (const y of [RF - 0.25, RF + 0.08, RF + 1.6, RF + RH - 0.1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 12), z3Lam('#8a6a34')); c.position.y = y; top.add(c); } }
  // the Roof Room: a windowless drum of cast-iron plates on the cornice, ribbed, between two brass bands; inside,
  // boarded and varnished, a dado rail and a skirting, under a boarded ceiling on radial beams
  const D0 = HG + 0.55, D1 = RF + RH + 0.02, DR = R + 0.24;
  const drumM = new THREE.MeshPhongMaterial({ color: 0x1c2526, specular: 0x34403f, shininess: 18 });
  { const d = new THREE.Mesh(new THREE.CylinderGeometry(DR, DR, D1 - D0, 48, 1, true), drumM); d.position.y = (D0 + D1) / 2; top.add(d);
    const parts = [];
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = new THREE.BoxGeometry(0.12, D1 - D0, 0.08); b.translate(DR + 0.03, (D0 + D1) / 2, 0); b.rotateY(a); parts.push(b); }
    for (const y of [D0 + 0.55, D1 - 0.5]) { const t = new THREE.TorusGeometry(DR + 0.03, 0.03, 4, 48); t.rotateX(Math.PI / 2); t.translate(0, y, 0); parts.push(t); }
    const mg = z3Merge(parts); if (mg) top.add(new THREE.Mesh(mg, drumM));
    for (const y of [D0 + 0.08, D1 - 0.08]) { const t = new THREE.TorusGeometry(DR + 0.05, 0.07, 6, 48); t.rotateX(Math.PI / 2); const m = new THREE.Mesh(t, brassM); m.position.y = y; top.add(m); }
  }
  { // (below the dado rail, boards painted a dark lighthouse green; above it, boards painted stone; the ceiling dark)
    const DADO = 1.05, lowM = z3Lam('#3e5a4c', { side: THREE.BackSide }), upM = z3Lam('#a49a86', { side: THREE.BackSide }), wood2 = z3Lam('#4e3826');
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(RW, RW, DADO + 0.15, 48, 1, true), lowM); lo.position.y = RF - 0.15 + (DADO + 0.15) / 2; top.add(lo);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(RW, RW, RH - DADO + 0.02, 48, 1, true), upM); up.position.y = RF + DADO + (RH - DADO + 0.02) / 2; top.add(up);
    const parts = [], lines = [];
    for (let i = 0; i < 72; i++) { const a = (i + 0.5) / 72 * Math.PI * 2, b = new THREE.BoxGeometry(0.015, DADO, 0.02); b.translate(RW - 0.005, RF + DADO / 2, 0); b.rotateY(a); lines.push(b); }
    for (let i = 0; i < 48; i++) { const a = (i + 0.5) / 48 * Math.PI * 2, b = new THREE.BoxGeometry(0.012, RH - DADO, 0.015); b.translate(RW - 0.005, RF + DADO + (RH - DADO) / 2, 0); b.rotateY(a); parts.push(b); }
    { const ml = z3Merge(lines); if (ml) top.add(new THREE.Mesh(ml, z3Lam('#2a3e34'))); const mp = z3Merge(parts); if (mp) top.add(new THREE.Mesh(mp, z3Lam('#7a705e'))); }
    const trims = [];
    for (const [y, hh, th] of [[RF + 0.1, 0.2, 0.05], [RF + DADO, 0.08, 0.07], [RF + RH - 0.12, 0.16, 0.06]]) { const c = new THREE.CylinderGeometry(RW - th / 2, RW - th / 2, hh, 48, 1, true); c.translate(0, y, 0); trims.push(c); }
    const mt = z3Merge(trims); if (mt) top.add(new THREE.Mesh(mt, z3Lam('#3a2a1e', { side: THREE.DoubleSide })));
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(RW + 0.02, 48), z3Lam('#6a4e34')); ceil.rotation.x = Math.PI / 2; ceil.position.y = RF + RH; top.add(ceil);
    const beams = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = new THREE.BoxGeometry(RW - 0.3, 0.2, 0.16); b.translate(0.3 + (RW - 0.3) / 2, RF + RH - 0.1, 0); b.rotateY(a); beams.push(b); }
    const mb = z3Merge(beams); if (mb) top.add(new THREE.Mesh(mb, wood2));
    // (the stair's opening: an iron kerb round its edge, on the floor)
    const kt = new THREE.TorusGeometry(srr - 0.06, 0.04, 4, 20, sa1 - sa0); kt.rotateX(-Math.PI / 2); const k = new THREE.Mesh(kt, ironM); k.position.y = RF + 0.01; k.rotation.y = sa0; top.add(k);
  }
  // over it, the eaves, and the red dome with its ventilator and ball, and the lightning rod
  const eave = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.32, 0.45, 48, 1, true), dark); eave.position.y = D1 + 0.175; top.add(eave);
  for (const [y, r0, r1, up] of [[D1 - 0.05, DR - 0.02, R + 0.33, false], [D1 + 0.4, R + 0.3, R + 0.61, true]]) { const rg = new THREE.RingGeometry(r0, r1, 48); rg.rotateX(up ? -Math.PI / 2 : Math.PI / 2); const m = new THREE.Mesh(rg, dark); m.position.y = y; top.add(m); }
  const DH = 0.55, dome = new THREE.Mesh(new THREE.SphereGeometry(R + 0.45, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), red); dome.scale.y = DH; dome.position.y = D1 + 0.4; top.add(dome);
  const dTop = D1 + 0.4 + (R + 0.45) * DH;
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.7, 16), dark); vent.position.y = dTop + 0.25; top.add(vent);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 16), dark); cap.position.y = dTop + 0.64; top.add(cap);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10), dark); ball.position.y = dTop + 1.15; top.add(ball);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 2.8, 6), brassM); rod.position.y = ball.position.y + 1.6; top.add(rod);
  // (the gallery's deck and its railing are the tower's skin: zm3dTower)
  // the Light: a pedestal on the newel, a beehive of glass rings in a brass cage. Dark and still until the lamp is lit
  // from the Roof Room (src/zmlamp.js); then it turns, its one beam sweeping out over the station and the sea
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.95, ZMT.NEWEL + 0.04, 0.9, 16), brassM); ped.position.y = 0.45; top.add(ped);   // (flaring out from the newel to hold the lens)
  const lens = new THREE.Group(); lens.position.y = 0.9; top.add(lens);
  const lensM = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 11; i++) { const r = 0.95 - Math.abs(i - 5) * 0.07, t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.17, 24, 1, true), lensM); t.position.y = 0.15 + i * 0.2; lens.add(t); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 0.06), brassM); b.position.set(Math.cos(a) * 1.0, 1.15, Math.sin(a) * 1.0); lens.add(b); }
  const coreM = new THREE.MeshBasicMaterial({ color: 0xffffff }), core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), coreM); core.position.y = 1.15; lens.add(core);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,236,180,0.95)', 'rgba(255,220,150,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.setScalar(5); glow.position.y = 1.15; lens.add(glow);
  // the beam: a wide soft cone out of the lens and a brighter core inside it, tilted a touch down over the station
  const beam = new THREE.Group(); beam.position.y = 1.15; beam.rotation.z = -0.045; lens.add(beam);
  const BL = 170, fade = z3Fade([[0, 'rgba(255,242,200,0.06)'], [0.04, 'rgba(255,242,200,0.2)'], [0.12, 'rgba(255,240,196,0.45)'], [0.3, 'rgba(255,236,184,0.24)'], [0.65, 'rgba(255,232,176,0.08)'], [1, 'rgba(255,230,170,0)']]);
  const bgeo = new THREE.CylinderGeometry(BL * Math.tan(0.095), 0.95, BL, 24, 1, true); bgeo.translate(0, BL / 2, 0); bgeo.rotateZ(-Math.PI / 2);
  const beamM = new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  beam.add(new THREE.Mesh(bgeo, beamM));
  const cfade = z3Fade([[0, 'rgba(255,250,225,0.12)'], [0.05, 'rgba(255,250,225,0.35)'], [0.15, 'rgba(255,250,225,0.75)'], [0.4, 'rgba(255,244,205,0.3)'], [1, 'rgba(255,240,200,0)']]);
  const cgeo = new THREE.CylinderGeometry(BL * 0.75 * Math.tan(0.035), 0.55, BL * 0.75, 16, 1, true); cgeo.translate(0, BL * 0.75 / 2, 0); cgeo.rotateZ(-Math.PI / 2);
  const coreBM = new THREE.MeshBasicMaterial({ map: cfade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  beam.add(new THREE.Mesh(cgeo, coreBM));
  const L = new THREE.PointLight(0xfff0c8, 2.2, 22, 1.2); L.position.y = 1.4; top.add(L);
  Z3.lens = { lens, L, beamM, coreBM, lensM, coreM, glow, beam };
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
  // arms in two halves, an elbow between them, so they reach and club like arms and not like broom handles
  Z3G.arm = new THREE.CylinderGeometry(0.068, 0.058, 0.33, 8); Z3G.arm.translate(0, -0.165, 0);
  Z3G.fore = new THREE.CylinderGeometry(0.056, 0.044, 0.3, 8); Z3G.fore.translate(0, -0.15, 0);
  Z3G.shoulder = new THREE.SphereGeometry(0.08, 10, 8); Z3G.elbow = new THREE.SphereGeometry(0.06, 8, 6);
  Z3G.hand = new THREE.SphereGeometry(0.06, 8, 6);
  Z3G.finger = new THREE.BoxGeometry(0.018, 0.09, 0.018); Z3G.finger.translate(0, -0.045, 0);
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
  if (z.boss && typeof zbModel === 'function') return zbModel(z);
  if (z.skit && typeof zwModel === 'function') return zwModel(z);   // [swarm]   // [boss] a model of its own (src/zmboss.js, src/zmboss2.js)
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
    // (shoulder in at the coat's edge, upper arm, elbow, forearm, a bony hand with three long fingers)
    const elbows = [];
    const arms = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(s * 0.265, 0.53, 0); torso.add(p);
      p.add(new THREE.Mesh(Q.shoulder, coat)); p.add(new THREE.Mesh(Q.arm, coat));
      const el = new THREE.Group(); el.position.y = -0.33; p.add(el); elbows.push(el);
      el.add(new THREE.Mesh(Q.elbow, coat)); el.add(new THREE.Mesh(Q.fore, skin));
      const h = new THREE.Mesh(Q.hand, skin); h.position.y = -0.33; h.scale.set(0.9, 1.15, 0.65); el.add(h);
      for (let f = -1; f <= 1; f++) { const fg = new THREE.Mesh(Q.finger, skin); fg.position.set(f * 0.028, -0.37, -0.01); fg.rotation.set(-0.35, 0, f * 0.18); el.add(fg); }
      const k = new THREE.Mesh(Q.kelp, Q.kelpM); k.position.set(s * 0.04, -0.12, 0.05); el.add(k);
      return p;
    });
    for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(Q.kelp, Q.kelpM); k.position.set(-0.18 + i * 0.12, 0.55 - (i % 2) * 0.2, 0.14); k.rotation.z = (i - 1.5) * 0.15; torso.add(k); }
    M = { root, hips, legs, arms, elbows, torso, head, hat, jaw, coat, skin, used: false };
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
  if (z.skit && typeof zwPose === 'function') return zwPose(z, M, dt);   // [swarm]
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
  let ax = -1.35, bx = -1.35, ea = -0.3 - Math.sin(t * 1.7 + z.seed) * 0.08, eb = -0.3 - Math.sin(t * 1.5 + z.seed + 2) * 0.08;
  if (z.st === 'tear') { ax = -1.6 + Math.sin(t * 9) * 0.5; bx = -1.6 - Math.sin(t * 9) * 0.5; ea = -0.5 - Math.sin(t * 9) * 0.45; eb = -0.5 + Math.sin(t * 9) * 0.45; }
  if (z.scaling || (ZM.net === 'client' && z.st === 'climb' && z.win && z.win.sea && z.t < 1.0)) { ax = -2.8 + Math.sin(t * 7) * 0.45; bx = -2.8 - Math.sin(t * 7) * 0.45; M.legs[0].rotation.x = Math.sin(t * 7) * 0.5; M.legs[1].rotation.x = -Math.sin(t * 7) * 0.5; }
  // the swing (zmSwipe: 0.6 s, the knock landing at 0.28): rear back with one arm up over its head, then lunge in and
  // club it down and across, then stagger back. Drawn on a clock of its own (z.swv) that runs on smoothly between a
  // joined player's word from the host, and plays out the stagger even after the host's swing has ended
  if (z.swing >= 0 && (z.swv == null || z.swv < 0 || Math.abs(z.swv - z.swing) > 0.12)) { if (!(z.swv >= 0)) z.lead = z.lead ? 0 : 1; z.swv = z.swing; }
  else if (z.swv >= 0) { z.swv += dt; if (z.swv > 0.6 || z.dead) z.swv = -1; }
  let lean = 0, twist = 0, lunge = 0, drop = 0, jaw = 0, az = 0;
  if (z.swv >= 0 && !z.dead) {
    const k = z.swv, ease = x => x * x * (3 - 2 * x);
    const wind = ease(Math.min(1, k / 0.2)), hit = ease(Math.min(1, Math.max(0, (k - 0.2) / 0.1))), back = ease(Math.min(1, Math.max(0, (k - 0.32) / 0.28)));
    const up = wind * (1 - hit), down = hit * (1 - back), sh = back > 0 && back < 1 ? Math.sin(back * Math.PI * 3) * (1 - back) : 0;
    // the lead arm: back and up, then down hard past the shoulder; the other claws in after it
    const la = -1.35 - up * 1.6 + down * 0.45 + sh * 0.2, oa = -1.35 + up * 0.35 - down * 0.45;
    const le = -0.3 - up * 1.2 + down * 0.3 + sh * 0.15, oe = -0.3 - down * 0.5;   // (the elbow cocked, then whipped straight)
    if (z.lead) { bx = la; ax = oa; eb = le; ea = oe; } else { ax = la; bx = oa; ea = le; eb = oe; }
    az = down * 0.55 - up * 0.15;                          // (across the body as it comes down)
    lean = up * 0.32 - down * 0.5 + sh * 0.06;             // back as it winds up, right over into the blow
    twist = (up * 0.35 - down * 0.4) * (z.lead ? -1 : 1);  // the shoulder turned back, then thrown round
    lunge = down * 0.28 + up * -0.06; drop = down * 0.07; jaw = up * 0.5 + down;
  }
  ax += Math.sin(ph * 0.5) * 0.12 * A; bx += Math.sin(ph * 0.5 + 1) * 0.12 * A;
  // (the angles above are reckoned the old way round, which had the arms reaching out behind them; the model faces -z,
  // so they're turned over here to put the arms out in front, and the elbows bending up, as they always should have)
  M.arms[0].rotation.x = -ax; M.arms[1].rotation.x = -bx;
  if (M.elbows) { M.elbows[0].rotation.x = Math.max(0, -ea); M.elbows[1].rotation.x = Math.max(0, -eb); }
  M.arms[0].rotation.z = -0.1 + (z.lead ? 0 : az); M.arms[1].rotation.z = 0.1 - (z.lead ? az : 0);
  M.torso.rotation.x += lean; M.torso.rotation.y = twist; M.hips.position.z = -lunge; M.hips.position.y -= drop;
  M.head.rotation.x -= lean * 0.6; if (M.jaw) { M.jaw.position.y = -0.12 - jaw * 0.05; M.jaw.rotation.x = jaw * 0.5; }
  // hit: a pale flash; burning: alight and going to ash; dead: down they go, and sink
  const hot = z.burn ? 0.6 + 0.4 * Math.sin(t * 17 + z.seed) : (z.scorch || 0) * 0.7;
  const flash = z.hitT > 0 ? z.hitT / 0.15 : 0;
  M.skin.emissive.setRGB(0.2 * flash + hot * 0.55, 0.24 * flash + hot * 0.22, 0.22 * flash + hot * 0.04);
  M.coat.emissive.setRGB(0.12 * flash + hot * 0.4, 0.12 * flash + hot * 0.14, 0.1 * flash);
  if (z.burn && !z.charred) { z.charred = true; M.skin.color.multiplyScalar(0.35); M.coat.color.multiplyScalar(0.35); }
  if (z.scorch > 0 && !z.burn) z.scorch = Math.max(0, z.scorch - dt * 0.8);
  if (typeof raidPose === 'function') raidPose(z, M);   // [raid] they glow
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
  zm3dFarTick(FPS.g.t);   // Wrackhaven's view of the Light, far off
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
      if (f && w.hatch) { const k = Math.min(1, f.t / 0.7); b.m.visible = f.t < 1.15; b.m.position.set(0.1 * k, b.y, -k * k * (w.hatch - 0.1)); b.m.rotation.set(k * 1.2, 0, b.rz + k * 0.8); }   // (down onto the floor)
      else if (f) { b.m.visible = true; const k = f.t / 1.2; b.m.position.set(0, b.y - k * k * 1.6, 0.9 * k * B.out); b.m.rotation.set(k * 2 * B.out, 0, b.rz + k * 1.5); }
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
  ZW.t.value = reduceMotion ? 0 : t;
  zm3dTonicsTick(t);
  // the Light: lit or dark, turning with its beam
  if (Z3.lens) {
    // ([lamp] dark and still, but for a faint glint in its glass, until the lamp is lit from the Roof Room; then it
    // comes up, turns with the beam, and fades out again: src/zmlamp.js)
    const Q = Z3.lens, B = typeof zmlBeam === 'function' ? zmlBeam() : { k: 0, ang: 0 }, k = B.k, on = k > 0.002;
    const glint = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(g.t * 0.7);
    Q.lens.rotation.y = Math.PI / 2 - B.ang;
    Q.beam.visible = on; Q.beamM.opacity = k; Q.coreBM.opacity = k;
    Q.glow.visible = on; Q.glow.material.opacity = k; Q.glow.scale.setScalar(2 + 4 * k);
    Q.lensM.color.setRGB(0.3 + 0.7 * k, 0.34 + 0.6 * k, 0.38 + 0.4 * k); Q.lensM.opacity = 0.3 + 0.08 * glint * (1 - k) + 0.55 * k;
    Q.coreM.color.setRGB(0.1 + 0.9 * k, 0.1 + 0.9 * k, 0.11 + 0.87 * k);
    Q.L.intensity = 0.2 + (2.6 + (reduceMotion ? 0 : 0.2 * Math.sin(g.t * 3))) * k;
  }
  // the beam
  const Bm = Z3.beam, on = FPS.beamT > 0 && FPS.weapon === 'fresnel' && !(m.dead > 0);
  Bm.g.visible = on; Bm.L.intensity = on ? 2.4 : 0;
  if (on) {
    const len = FPS.beamLen || 10, h = m.h, p = m.p, ez = G0 + FPSC.EYE + (m.jz || 0) - (FPS.eyeLag || 0) - (FPS.crouchEye || 0);
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
  if (typeof zml3d === 'function') zml3d(dt);   // [lamp] the lever
  if (typeof zx3d === 'function') zx3d(dt);   // [chest] the light of flares and blasts
  if (typeof ze3d === 'function') ze3d(dt);   // [egg hook] src/zmegg.js
  if (typeof zh3d === 'function') zh3d(dt);   // [egg2 hook] src/zmegg2.js
  if (typeof raid3d === 'function') raid3d(dt);   // [raid] (its own light and fog)
}
// painted over the 3D view: sparks between the burning, the chest's offer, and anyone down
function zmDrawOver() {
  if (ZM.net) for (const r of FPS.remote.values()) if (r.down && !r.dead) zmDownMarker(r);
  for (const s of ZM.sparks) {
    const pts = []; for (let i = 0; i <= 6; i++) { const k = i / 6, j = i && i < 6 ? 0.25 : 0; pts.push([s.a[0] + (s.b[0] - s.a[0]) * k + (Math.random() - 0.5) * j, s.a[1] + (s.b[1] - s.a[1]) * k + (Math.random() - 0.5) * j, s.a[2] + (s.b[2] - s.a[2]) * k + (Math.random() - 0.5) * j]); }
    const p = polyProj(pts); if (p.length < 2) continue;
    ctx.strokeStyle = `rgba(${s.col || '255,220,140'},${s.t / (s.beam ? 0.14 : 0.25)})`; ctx.lineWidth = s.beam ? 3 : 2; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  if (typeof zmpDrawOver === 'function') zmpDrawOver();   // [pap]
  if (typeof zxDrawOver === 'function') zxDrawOver();   // [chest]
  if (typeof rclDrawOver === 'function') rclDrawOver();   // [classes] grenades, clouds, Wellsprings, the others' callings (src/rclass.js)
  const B = ZM.box, S = ZM.spawns[B.at];
  if (S && B.st === 'offer') {
    const c = cam(S.x, S.y, FPSC.GROUND + S.z + 1.9);
    if (c.f > 0.8 && c.f < 25) { const q = proj(c); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `400 ${Math.round(clamp(q.s * 0.28, 12, 26))}px "IM Fell English SC", serif`; ctx.fillStyle = 'rgba(190,255,230,0.9)'; ctx.fillText(FPSW[B.item].n, q.x, q.y); }
  }
}
// someone down, marked over them wherever they are (seen through walls): their name, a ring draining with the time
// they've left on the floor, inside it a gold one filling as someone gets them up, and how far off they are
function zmDownMarker(r) {
  const m = FPS.me, c = cam(r.x, r.y, FPSC.GROUND + (r.tjz || 0) + 1.0); if (c.f < 0.4) return;
  const q = proj(c), x = clamp(q.x, 30, W - 30), y = clamp(q.y, 40, H - 40), t = g.t;
  const left = r.dn || 0, k = clamp(left / ZM_DOWN.T, 0, 1), low = left > 0 && left < 10;
  let rev = ZM.revOf === r.id ? ZM.revT / ZM_DOWN.REV : 0;
  for (const o of FPS.remote.values()) if (o.rv && o.rv[0] === r.id) rev = Math.max(rev, o.rv[1]);
  const pulse = 0.65 + 0.35 * Math.sin(t * (low ? 12 : 6)), rr = 13;
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.beginPath(); ctx.arc(x, y, rr + 4, 0, 6.2832); ctx.fill();
  zmRing(x, y, rr, k || 1, `rgba(228,${low ? 60 : 90},${low ? 50 : 70},${pulse})`, 4);
  if (rev > 0) zmRing(x, y, rr - 6, rev, '#ffd88a', 3);
  else { ctx.fillStyle = `rgba(228,108,79,${pulse})`; ctx.fillRect(x - 1.5, y - 6, 3, 12); ctx.fillRect(x - 6, y - 1.5, 12, 3); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 13px "Courier Prime", monospace';
  ctx.fillStyle = rev > 0 ? '#ffd88a' : `rgba(236,140,110,${0.75 + 0.25 * pulse})`;
  ctx.fillText(rev > 0 ? `${r.n} · getting up` : `${r.n} is down`, x, y - rr - 12);
  ctx.font = '600 11px "Courier Prime", monospace'; ctx.fillStyle = 'rgba(236,228,207,0.8)';
  ctx.fillText(`${left > 0 ? Math.ceil(left) + ' s · ' : ''}${Math.round(Math.hypot(r.x - m.x, r.y - m.y))} m`, x, y + rr + 12);
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
// (on a phone) the foot of the column down the left (the round, points, health, tonics), low enough that its top
// stays under the buttons and whatever words are top left
function zmLeftRb() {
  const perks = Object.keys(ZM_PERKS).some(k => ZM.perks[k]);
  return Math.min(H - 40, Math.max(H * 0.36, Math.max(FPS.hudLPrev || 0, fpsHudTop()) + 100 + (perks ? 40 : 0)));
}
function zmHud() {
  const m = FPS.me, phone = FPS.touch, t = g.t, down = zmIsDown() && !ZM.over, spec = zmSpecOn();
  FPS.hudLPrev = FPS.hudL || 0; FPS.hudL = 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mono = px => `600 ${px}px "Courier Prime", monospace`, fell = px => `400 ${px}px "IM Fell English SC", serif`;
  const max = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
  // hurt: red creeping in from the edges, the more the closer to going down
  const hurt = clamp(1 - m.hp / max, 0, 1) * (m.dead > 0 || down ? 0 : 1);
  if (down) zmHudDownGlow(t);
  if (hurt > 0 || FPS.hurtT > 0) {
    const a = Math.min(0.85, hurt * 0.7 + (FPS.hurtT || 0) * 0.5), gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.25, cx, H / 2, Math.max(W, H) * 0.7);
    gr.addColorStop(0, 'rgba(140,10,8,0)'); gr.addColorStop(1, `rgba(140,10,8,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  if ((m.protect > 0 || m.iframe > 1) && !ZM.over && !down) { ctx.fillStyle = `rgba(200,220,255,${0.05 + 0.03 * Math.sin(t * 10)})`; ctx.fillRect(0, 0, W, H); }
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
  const L = Math.max(14, FPS.safeLeft || 0), R = W - Math.max(14, FPS.safeRight || 0), top = phone ? Math.max(10, FPS.safeTop || 0) : 14, hudTop = phone ? fpsHudTop() : 14;
  // the round, bottom left: chalk tallies for the first five, then the number
  const rb = phone ? zmLeftRb() : H - 22, rs = phone ? 0.7 : 1;
  ctx.save(); ctx.translate(L, rb); ctx.scale(rs, rs);
  const glowR = ZM.phase === 'break' ? 0.55 + 0.45 * Math.sin(t * 4) : 1;
  ctx.fillStyle = ctx.strokeStyle = `rgba(178,24,18,${glowR})`; ctx.lineCap = 'round';
  const r = (typeof RAID !== 'undefined' && RAID.on) ? 0 : ZM.round;   // [raid] (no rounds there)
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
  // (not while you're out watching someone: theirs is in the band at the bottom)
  if (!spec) {
    const bw = phone ? 120 : 168, bh = phone ? 9 : 11, by = py - (phone ? 30 : 36), n = max, gap = 3, seg = (bw - gap * (n - 1)) / n;
    const hp = m.dead > 0 || down ? 0 : clamp(m.hp, 0, n), low = hp <= 1 && !(m.dead > 0);
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(L - 3, by - 3, bw + 6, bh + 6);
    for (let i = 0; i < n; i++) {
      const on = clamp(hp - i, 0, 1);   // (a part can be half full: a crab's nip takes half a knock)
      ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(L + i * (seg + gap), by, seg, bh);
      if (on > 0) { ctx.fillStyle = low ? `rgba(228,${60 + 40 * Math.sin(t * 8)},50,0.95)` : hp < n ? '#e4a04f' : '#7ac46a'; ctx.fillRect(L + i * (seg + gap), by, seg * on, bh); }
    }
    ctx.font = mono(phone ? 9 : 10); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(236,228,207,0.65)';
    ctx.fillText(`HEALTH ${hp % 1 ? hp.toFixed(1) : hp}/${n}`, L, by - 3);
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
  // your weapons and ammunition, bottom right (none while you're out watching someone)
  if (spec) { /* nothing in your hands */ }
  else if (!phone) {
    const by = H - 22;
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.font = mono(24);
    ctx.fillStyle = w.melee || m.ammo ? 'rgba(236,228,207,0.92)' : '#e46c4f';
    ctx.fillText(m.reload > 0 ? (w.melee ? 'WIPING' : 'RELOADING') : w.melee ? (FPS.weapon === 'cutlass' ? 'CUTLASS' : FPSW[FPS.weapon].n.toUpperCase()) : `${m.ammo} / ${ZM.res[FPS.weapon] || 0}`, R, by);
    ctx.font = mono(11); let wx = R;
    for (let i = ZM.own.length - 1; i >= 0; i--) { const id = ZM.own[i], lab = `${i + 1} ${(typeof zmpName === 'function' ? zmpName(id) : FPSW[id].n).toUpperCase()}`; ctx.fillStyle = id === FPS.weapon ? '#ffd88a' : 'rgba(236,228,207,0.4)'; ctx.fillText(lab, wx, by - 30); wx -= ctx.measureText(lab).width + 14; }
    if (!w.melee && (m.ammo === 0 || (m.ammo < w.mag && m.ammo <= Math.ceil(w.mag * 0.25))) && !(m.reload > 0) && !ZM.over) { ctx.textAlign = 'center'; ctx.font = mono(13); ctx.fillStyle = (ZM.res[FPS.weapon] || 0) > 0 ? 'rgba(236,228,207,0.8)' : '#e46c4f'; ctx.fillText((ZM.res[FPS.weapon] || 0) > 0 ? 'R TO RELOAD' : m.ammo ? 'LOW AMMUNITION' : down ? 'NO AMMUNITION' : 'NO AMMUNITION · V OR FIRE TO KNIFE', cx, cy + 46); }
  } else { zmPadState(); zmDrawStick(); }
  // together: everyone's points, down the right (yours lit), and anyone down marked
  // (on a phone: under the buttons if they reach across to it, as they do held upright)
  const feedW = W * (phone ? 0.42 : 0.45), feedUnder = phone && fpsHudBtnRight() > R - feedW - 8;
  let feedY = phone ? (feedUnder ? hudTop : top + 4) : 16;
  if (ZM.net) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 12);
    const rows = ZM.hum.map(([sid, nick]) => { const me = sid === m.id, r = FPS.remote.get(sid); return { me, nick, pts: me ? ZM.pts : r ? r.pts || 0 : 0, down: me ? ZM.downT > 0 : r && r.down, out: me ? ZM.ghost : r && (r.dead || r.left) }; });
    rows.forEach((r, i) => { ctx.fillStyle = r.out ? 'rgba(236,228,207,0.3)' : r.down ? '#e46c4f' : r.me ? '#ffd88a' : 'rgba(236,228,207,0.75)'; ctx.fillText(`${r.nick}${r.down ? ' · DOWN' : r.out ? ' · out' : ''}  ${r.pts.toLocaleString('en')}`, R, feedY + i * (phone ? 13 : 16), W * 0.4); });
    feedY += rows.length * (phone ? 13 : 16) + 8;
  }
  // the feed, top right
  ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 12);
  const feedN = FPS.feed.slice(phone ? -2 : -5);
  feedN.forEach((f, i) => { ctx.fillStyle = `rgba(236,228,207,${Math.min(1, f.t) * 0.85})`; ctx.fillText(f.text, R, feedY + i * (phone ? 13 : 17), feedW); });
  // anything top middle (a room's name, a boss's strength, the bridge) goes under the words top left, and under
  // the feed when that's come down under the buttons too
  const ctop = phone ? Math.max(hudTop, (FPS.hudLPrev || 0) + 8, feedUnder ? feedY + feedN.length * 13 + 6 : 0) : 14;
  FPS.hudCtop = ctop;
  if (typeof rclHud === 'function') rclHud(phone, mono, fell);   // [classes] your calling's grenade and ultimate (src/rclass.js)
  if (typeof zbHud === 'function') zbHud(phone, phone ? ctop - 50 : top);   // [boss] their strength, top middle (and the false light's glare)
  // the room you've come into
  if (ZM.zoneT > 0) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = fell(phone ? 16 : 22); ctx.fillStyle = `rgba(236,228,207,${Math.min(1, ZM.zoneT) * 0.8})`; const nm = zmZoneName(ZM.zone); ctx.fillText(nm.charAt(0).toUpperCase() + nm.slice(1), cx, phone ? ctop : 18); }
  // a round beginning, salvage taken
  if (ZM.banner) {
    const b = ZM.banner, a = Math.min(1, b.t, 4 - b.t);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(b.small ? (phone ? 22 : 30) : (phone ? 34 : 54));
    ctx.fillStyle = b.col ? b.col : `rgba(190,30,22,${Math.max(0, a)})`; ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillText(b.text, cx, H * 0.3);
    if (b.sub) { ctx.font = fell(phone ? 14 : 19); ctx.fillText(b.sub, cx, H * 0.3 + (phone ? 28 : 44)); }   // [boss] (what it is)
    ctx.globalAlpha = 1;
  }
  if (ZM.phase === 'pre' && ZM.t > 0 && !(ZM.downNotes && ZM.downNotes.length)) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 11 : 13); ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText('They are coming up out of the sea…', cx, H * 0.3 + 40); }
  // what's in front of you
  const P = ZM.prompt;
  if (P && !(m.dead > 0)) {
    const key = phone ? 'USE' : FPS.padLast ? 'X' : 'E';
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
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = fell(22); ctx.fillStyle = '#ffd88a'; ctx.fillText('Keeper’s Last Light', bx + 14, by2 + 24);
    rows.forEach(([k, v], i) => { const yy = by2 + 58 + i * 24; ctx.font = mono(13); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText(k, bx + 14, yy); ctx.textAlign = 'right'; ctx.fillStyle = '#ffd88a'; ctx.fillText(String(v), bx + bw - 14, yy); });
  }
  // down, waiting for a friend (your clock on the floor); or out until the next round
  if (down) zmHudDown(phone, mono, fell, t);
  else if (spec) zmSpecHud(phone, mono, fell, t);
  else if (!ZM.over && ZM.ghost) {
    ctx.fillStyle = 'rgba(30,4,4,0.35)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 24 : 34); ctx.fillStyle = '#e46c4f';
    ctx.fillText('You bled out', cx, H * 0.42);
    ctx.font = mono(phone ? 11 : 13); ctx.fillStyle = 'rgba(236,228,207,0.85)';
    ctx.fillText('You’ll be back when the next round begins.', cx, H * 0.42 + 34);
  }
  // getting someone up: a ring round the sights filling as you hold
  if (ZM.revOf && ZM.revT > 0 && !ZM.over) zmHudReviving(phone, mono, t);
  // someone else down: their name, big and red, for everyone
  if (ZM.downNotes && ZM.downNotes.length && !ZM.over) zmHudDownNotes(phone, mono, fell, down);
  if (ZM.over) { ctx.fillStyle = `rgba(20,2,2,${Math.min(0.6, ZM.over.t * 0.4)})`; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 28 : 40); ctx.fillStyle = `rgba(200,40,30,${Math.min(1, ZM.over.t)})`; ctx.fillText('They dragged you down', cx, H * 0.42); }
  if (!FPS.mouse && !phone && !FPS.menu && !ZM.over) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(12); ctx.fillStyle = 'rgba(236,228,207,0.6)'; ctx.fillText('Click to aim with the mouse', cx, H * 0.5 + 40); }
  if (typeof zeHud === 'function') zeHud();   // [egg hook] src/zmegg.js
  if (typeof zhHud === 'function') zhHud();   // [egg2 hook] src/zmegg2.js
  if (typeof raidHud === 'function') raidHud(phone, mono, fell);   // [raid]
}
// down: the edges of the screen going red, thumping with your heart, deeper as the time runs out
function zmHudDownGlow(t) {
  const k = clamp(ZM.downT / ZM_DOWN.T, 0, 1), urg = 1 - k, ph = ZM.beat % 1;
  const thump = Math.exp(-ph * 10) + (ph > 0.2 ? 0.7 * Math.exp(-(ph - 0.2) * 10) : 0);
  const a = Math.min(0.95, 0.5 + urg * 0.35 + thump * (0.12 + urg * 0.18));
  const gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * (0.3 - urg * 0.14), cx, H / 2, Math.max(W, H) * 0.62);
  gr.addColorStop(0, 'rgba(120,6,6,0)'); gr.addColorStop(0.55, `rgba(120,6,6,${a * 0.55})`); gr.addColorStop(1, `rgba(90,0,0,${a})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  // (and the colour going out of everything, a little)
  ctx.fillStyle = `rgba(20,0,0,${0.08 + urg * 0.14})`; ctx.fillRect(0, 0, W, H);
}
// a ring: a dark track, then an arc from twelve o'clock round for the part k
function zmRing(x, y, r, k, col, lw) {
  ctx.lineWidth = lw; ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(8,10,14,0.6)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
  if (k > 0) { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * clamp(k, 0, 1)); ctx.stroke(); }
}
// down: your clock on the floor, draining, high in the middle of the screen; who's getting you up, if anyone
function zmHudDown(phone, mono, fell, t) {
  const left = Math.max(0, ZM.downT), k = clamp(left / ZM_DOWN.T, 0, 1), low = left < 10, help = zmReviver();
  const x = cx, y = H * (phone ? 0.2 : 0.22), r = phone ? 26 : 38, beat = 1 + (low ? 0.06 : 0.03) * Math.exp(-(ZM.beat % 1) * 8);
  ctx.save(); ctx.translate(x, y); ctx.scale(beat, beat);
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, 6.2832); ctx.fill();
  zmRing(0, 0, r, k, low ? `rgba(255,${70 + 50 * Math.sin(t * 10)},50,0.95)` : '#e0504a', phone ? 5 : 7);
  if (help) zmRing(0, 0, r - (phone ? 8 : 11), help.k, '#ffd88a', phone ? 4 : 5);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 18 : 26); ctx.fillStyle = low ? '#ff8a6a' : 'rgba(236,228,207,0.95)';
  ctx.fillText(String(Math.ceil(left)), 0, 1);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // (a dark band behind the words, so they read over anything)
  { const bw = Math.min(W - 24, phone ? 300 : 560), by = y + r + (phone ? 8 : 12), bh = phone ? 70 : 92, gr = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
    gr.addColorStop(0, 'rgba(8,4,4,0)'); gr.addColorStop(0.2, 'rgba(8,4,4,0.6)'); gr.addColorStop(0.8, 'rgba(8,4,4,0.6)'); gr.addColorStop(1, 'rgba(8,4,4,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - bw / 2, by, bw, bh); }
  ctx.font = fell(phone ? 20 : 30); ctx.fillStyle = '#ff7a5c';
  ctx.fillText(`You’re down — ${Math.ceil(left)} s`, x, y + r + (phone ? 22 : 32));
  ctx.font = mono(phone ? 11 : 13);
  const ly = y + r + (phone ? 42 : 60);
  if (help) {
    ctx.fillStyle = '#ffd88a'; ctx.fillText(`${help.n} is getting you up`, x, ly);
    const bw = phone ? 140 : 200, bh = 6;
    ctx.fillStyle = 'rgba(8,10,14,0.6)'; ctx.fillRect(x - bw / 2 - 2, ly + 12, bw + 4, bh + 4);
    ctx.fillStyle = '#ffd88a'; ctx.fillRect(x - bw / 2, ly + 14, bw * help.k, bh);
  } else {
    ctx.fillStyle = low ? `rgba(255,140,110,${0.7 + 0.3 * Math.sin(t * 8)})` : 'rgba(236,228,207,0.85)';
    ctx.fillText(low ? 'Hold on…' : 'Hold on… someone can get you up by holding Use beside you.', x, ly);
    ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.55)';
    ctx.fillText('You can still fire your pepperbox.', x, ly + (phone ? 15 : 19));
  }
}
// the others who've gone down: a line each, a little above the middle (below it, while you're down yourself)
function zmHudDownNotes(phone, mono, fell, down) {
  let y = H * (down ? 0.64 : 0.4);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const o of ZM.downNotes) {
    const a = clamp(Math.min(o.t, (ZM_DOWN.NOTE - o.t) * 4), 0, 1), text = `${o.n} is down!`;
    ctx.globalAlpha = a; ctx.font = fell(phone ? 20 : 28);
    const tw = ctx.measureText(text).width + 40, bh = phone ? 46 : 60, gr = ctx.createLinearGradient(cx - tw / 2 - 30, 0, cx + tw / 2 + 30, 0);
    gr.addColorStop(0, 'rgba(8,4,4,0)'); gr.addColorStop(0.2, 'rgba(8,4,4,0.6)'); gr.addColorStop(0.8, 'rgba(8,4,4,0.6)'); gr.addColorStop(1, 'rgba(8,4,4,0)');
    ctx.fillStyle = gr; ctx.fillRect(cx - tw / 2 - 30, y - (phone ? 16 : 20), tw + 60, bh);
    ctx.fillStyle = '#ff7a5c'; ctx.fillText(text, cx, y);
    ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(236,228,207,0.85)'; ctx.fillText('Hold Use beside them to get them up', cx, y + (phone ? 19 : 25));
    y += bh + 4;
  }
  ctx.globalAlpha = 1;
}
// getting someone up: a ring round the sights filling over the time it takes, their name, and their clock
function zmHudReviving(phone, mono, t) {
  const r = FPS.remote.get(ZM.revOf), k = clamp(ZM.revT / zmRevTime(), 0, 1), y = H / 2, rr = phone ? 24 : 30;
  zmRing(cx, y, rr, k, '#ffd88a', phone ? 5 : 6);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 12 : 15);
  const text = `Getting ${(r && r.n) || 'them'} up · ${Math.round(k * 100)}%`, tw = ctx.measureText(text).width + 24, ty = y + rr + (phone ? 22 : 30);
  ctx.fillStyle = 'rgba(8,10,14,0.6)'; ctx.fillRect(cx - tw / 2, ty - 14, tw, 28);
  ctx.fillStyle = '#ffd88a'; ctx.fillText(text, cx, ty);
  if (r && r.dn > 0) { ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = r.dn < 10 ? '#ff8a6a' : 'rgba(236,228,207,0.7)'; ctx.fillText(`Keep holding · ${Math.ceil(r.dn)} s before they bleed out`, cx, ty + (phone ? 20 : 24)); }
}
// ---------- watching, after bleeding out ----------
// together, out until the next round: your view goes to someone still in the night, through their eyes (from their
// presence: where they stand, their floor, which way they look, and how low they are if they're down). Click, Space,
// RB (or A) or a tap moves on to the next; LB the one before. Your own inputs move nothing. Back next round, it's you
const zmSpecOn = () => !!(ZM.net && ZM.ghost && !ZM.over && ZM.spec && ZM.spec.id && FPS.remote.get(ZM.spec.id));
// who there is to watch: everyone still in the night (standing first, then any down), in the order they joined
function zmSpecList() {
  const out = [];
  for (const [sid] of ZM.hum || []) { const r = FPS.remote.get(sid); if (r && !r.dead && !r.left && r.tx != null) out.push(r); }
  return out.filter(r => !r.down).concat(out.filter(r => r.down));
}
function zmSpecNext(dir) {
  const L = zmSpecList(), S = ZM.spec; if (!S || !L.length) return;
  const i = L.findIndex(r => r.id === S.id);
  const r = L[((i < 0 ? 0 : i + (dir || 1)) % L.length + L.length) % L.length];
  if (r.id !== S.id) { S.id = r.id; S.snap = true; if (L.length > 1) zmSound('board'); }
}
// each frame (together): keep an eye on someone while you're out; you, moved along with them (unseen, since you're
// out), so what you hear, what's lit and the room's name are theirs; nothing at all once you're back
function zmSpecTick(dt) {
  if (!(ZM.net && ZM.ghost && !ZM.over)) { if (ZM.spec) { ZM.spec = null; FPS.specId = null; } return; }
  const S = ZM.spec = ZM.spec || { id: null, snap: true, x: 0, y: 0, z: 0, h: 0, p: 0, was: {} };
  const L = zmSpecList();
  // (the one you were watching bled out or left: on to someone else)
  if (!L.some(r => r.id === S.id)) { S.id = L.length ? L[0].id : null; S.snap = true; }
  FPS.specId = S.id;
  if (!S.id) return;
  const r = FPS.remote.get(S.id), m = FPS.me;
  const eye = FPSC.GROUND + FPSC.EYE + (r.tjz || 0) - (r.down ? ZM_DOWN.EYE : 0), k = S.snap ? 1 : 1 - Math.exp(-dt * 14);
  S.x = r.x; S.y = r.y;
  S.z += (eye - S.z) * (S.snap ? 1 : 1 - Math.exp(-dt * 8));
  S.h = wrapPi(S.h + angDiff(r.h, S.h) * k); S.p += (clamp(r.p || 0, -FPSC.PMAX, FPSC.PMAX) - S.p) * k;
  S.snap = false;
  // (and facing their way, so you come back next round looking where you were looking)
  m.x = r.x; m.y = r.y; m.jz = m.fl = r.tjz || 0; m.h = S.h; m.p = S.p;
}
// the view from the one you're watching, for fpsDrawScene (src/fps.js); null when you're not watching anyone
function zmSpecView() {
  if (!zmSpecOn()) return null;
  const S = ZM.spec;
  return { x: S.x, y: S.y, h: S.h, p: S.p, jz: S.z - FPSC.GROUND - FPSC.EYE, dead: 0 };
}
// while watching: nothing moves you; a click, Space, a tap, A or RB moves on to the next, LB back; Start the menu
function zmSpecInput() {
  const S = ZM.spec, was = S.was;
  FPS.look = [0, 0]; FPS.mlook = [0, 0]; FPS.me.walk = false;
  const edge = (k, on) => { const e = on && !was[k]; was[k] = on; return e; };
  if (edge('mouse', !!FPS.mouseDown) | edge('space', !!FPS.keys.Space) | edge('fire', !!FPS.touchFire)) zmSpecNext(1);
  const tch = FPS.lookTouch || FPS.stick || null;
  if (tch && tch !== was.touch) zmSpecNext(1);
  was.touch = tch;
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
  if (pad) {
    const b = i => !!(pad.buttons[i] && pad.buttons[i].pressed), pw = FPS.padWas || {};
    if ((b(5) && !pw[5]) || (b(0) && !pw[0]) || (b(15) && !pw[15])) zmSpecNext(1);
    if ((b(4) && !pw[4]) || (b(14) && !pw[14])) zmSpecNext(-1);
    if (b(9) && !pw[9]) fpsSetMenu(!FPS.menu);
    if (b(8) && !pw[8]) FPS.board = !FPS.board;
    FPS.padWas = {}; for (let i = 0; i < pad.buttons.length; i++) FPS.padWas[i] = b(i);
  }
}
// a row of segments, one for each knock someone can take: green whole, amber hurt, red on the last; down, an empty
// bar edged in red. Centred on x, its top at y
function zmHpSegs(x, y, w, h, hp, max, down, a) {
  max = Math.max(1, max | 0); const gap = Math.max(1, Math.round(h * 0.3)), seg = (w - gap * (max - 1)) / max, x0 = x - w / 2;
  const n = down ? 0 : clamp(hp || 0, 0, max), low = n <= 1, t = g.t;
  ctx.globalAlpha = a == null ? 1 : a;
  ctx.fillStyle = 'rgba(8,10,14,0.6)'; ctx.fillRect(x0 - 2, y - 2, w + 4, h + 4);
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < n ? (low ? `rgba(228,${60 + 40 * Math.sin(t * 8)},50,0.95)` : n < max ? '#e4a04f' : '#7ac46a') : down ? 'rgba(120,24,20,0.7)' : 'rgba(80,70,60,0.6)';
    ctx.fillRect(x0 + i * (seg + gap), y, seg, h);
  }
  if (down) { ctx.strokeStyle = '#e0504a'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 1.5, y - 1.5, w + 3, h + 3); }
  ctx.globalAlpha = 1;
}
// watching: a band low in the middle, "Watching <name> — back next round", their health, and how to move on
function zmSpecHud(phone, mono, fell, t) {
  const r = FPS.remote.get(ZM.spec.id), n = zmSpecList().length; if (!r) return;
  // (a little dark round the edges: you're only looking on)
  const gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.35, cx, H / 2, Math.max(W, H) * 0.7);
  gr.addColorStop(0, 'rgba(10,14,22,0)'); gr.addColorStop(1, 'rgba(10,14,22,0.55)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  const y = H - (phone ? 96 : 104), bw = Math.min(W - 24, phone ? 340 : 560), bh = phone ? 78 : 88;
  { const b = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
    b.addColorStop(0, 'rgba(8,8,10,0)'); b.addColorStop(0.2, 'rgba(8,8,10,0.65)'); b.addColorStop(0.8, 'rgba(8,8,10,0.65)'); b.addColorStop(1, 'rgba(8,8,10,0)');
    ctx.fillStyle = b; ctx.fillRect(cx - bw / 2, y - bh / 2, bw, bh); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fell(phone ? 18 : 24); ctx.fillStyle = 'rgba(236,228,207,0.95)';
  ctx.fillText(`Watching ${r.n} — back next round`, cx, y - (phone ? 22 : 26), bw - 20);
  const max = r.hm || ZMC.HP, hw = Math.min(phone ? 110 : 150, 26 * max);
  zmHpSegs(cx, y - 4, hw, phone ? 7 : 9, r.hp, max, r.down);
  ctx.font = mono(phone ? 10 : 12); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = r.down ? '#ff8a6a' : 'rgba(236,228,207,0.7)';
  ctx.fillText(r.down ? `${r.n} is down${r.dn > 0 ? ' — ' + Math.ceil(r.dn) + ' s' : ''}` : `HEALTH ${Math.ceil(clamp(r.hp || 0, 0, max))}/${max}`, cx, y + (phone ? 14 : 18));
  if (n > 1) {
    ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.5)';
    ctx.fillText(phone ? 'Tap to watch someone else' : FPS.padLast ? 'RB: watch someone else' : 'Click or Space: watch someone else', cx, y + (phone ? 30 : 36));
  }
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
  set('fpsPadKnife', !((FPS.knifeT || 0) > 0) && !(m.dead > 0) && !zmIsDown());
  { const b = $('fpsPadWeapon'); if (b) { const c = b.querySelector('.wn'); if (c && c.textContent !== w.n) c.textContent = w.n; } }
  { const b = $('fpsPadScope'); if (b) { b.hidden = !(w.scope || w.ads); b.classList.toggle('on', FPS.scoped); } }
  set('fpsPadLantern', m.lan); set('fpsPadView', FPS.third);
  set('fpsPadJump', !((m.jz || 0) > (m.fl || 0) + 0.02) && !(m.dead > 0) && !zmIsDown());
  set('fpsPadReload', !w.melee && m.ammo < w.mag && !(m.reload > 0) && (ZM.res[FPS.weapon] || 0) > 0);
  set('fpsPadUse', !!ZM.near);
}

// ---------- controls ----------
// E (or F) to use, V the knife, 1-3 your weapons; the rest as Wreckers' Night (FPS_KEYS in src/fps.js)
const ZM_KEYS = { KeyF: () => zmUse(), KeyE: () => zmUse(), KeyV: () => zmKnife(), KeyB: null, Digit1: () => zmSlot(0), Digit2: () => zmSlot(1), Digit3: () => zmSlot(2), KeyQ: () => zmLastWeapon(), Digit4: null, Digit5: null, Digit6: null };
{
  const kn = $('fpsPadKnife');
  if (kn) kn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); zmKnife(); });
  const use = $('fpsPadUse');
  if (use) {
    use.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); FPS.touchUse = true; zmUse(); try { use.setPointerCapture(e.pointerId); } catch (err) {} });
    for (const ev of ['pointerup', 'pointercancel']) use.addEventListener(ev, () => { FPS.touchUse = false; });
  }
  $('zmPlay').addEventListener('click', () => zmStart());
  for (const b of document.querySelectorAll('#zmMaps [data-map]')) b.addEventListener('click', () => zmPickMap(b.dataset.map));
  zmMapCard();
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
