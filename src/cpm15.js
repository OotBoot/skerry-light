'use strict';
// The Chronicle of the Light, mission 15: The Nine Holes (c. 1883, a side mission of Act II). The still evening the
// keepers first lay out their nine holes of golf along the headland above the harbour (src/lore.js, ch_links), and
// play the round on into the night, as the lore says it is always played. The course turns on them.
//   I.   The Laying Out (cp_m15lay, src/cpm15x.js): late afternoon on the inland holes, the 1st to the 3rd, the
//        keeper Holm, his wife Maren and the assistant keeper Pellow playing one ball between the lot of you. On the
//        3rd, Down to the Cove, men come up out of the cove's shallows with the sun still in the sky.
//  (the sunset, m15_sunset: the 4th to the 6th go by; from the 6th the sun goes down and the Light stays dark,
//   because its duty keeper is out here with a club in his hand. Pellow runs for the harbour and his skiff)
//   II.  The Chasm (cp_m15chasm): dusk into moonlight, the 7th (The Point) and the 8th (The Chasm), the second shot
//        over the sea-filled gully where eleven balls were lost that summer. They are still down there, shining, and
//        the drowned come up out of the gully after them. Get the 8th holed while they pour out of it.
//  (the ship, m15_ship: a brig standing in for the point, and the Light still dark: Pellow is only half way out)
//   III. Homeward Cliff (cp_m15home): night on the 9th. Tar barrels stand on the old wreckers' ledges under the east
//        cliff, where nobody climbs down in the dark. A ball will get there: strike balls dipped in the tar pot and
//        lit, and light all three before the brig is on the point. Then the thing in the chasm comes up for you: the
//        Chasm Crab, a Keelback of the gully's old wrecks with the eleven lost balls set in its shell. Burning balls
//        hurt it badly. Outro: the Light comes on at last, and the last three holes are played by moonlight.
// This file: the mission, its people and music, the headland's look and layout (FPI_GEN.cpm15head), and the golf kit
// every stage shares (the ball, the swing, the card, the flags and greens in 3D, the evening sky, the keepers).
// src/cpm15x.js has the three stages and the boss; src/cpm15y.js the cinematics. Lines cp_m15_01 on
// (campaign-sound/m15.md).
//
// The swing (every screen): stand at the ball and hold Use. The swing draws back and the meter fills and empties
// again (CP15.SWING seconds each way); let go to strike at the power the meter shows, along the way you face. A ring
// on the grass shows where a strike at that power lands, and an arc the ball's flight. The keepers played one ball
// between them, and so do you: anyone at it may strike it.
// The ball (host): the strike is worked out at once (m15Strike: where it carries, how far it runs, a little
// scatter), sent in the host's word (m15g) and flown on every screen from the raid's shared clock (RAID.ct).
// Into the sea, the cove, the chasm or the creek: a stroke, and play again from where you struck. On the green, Use
// putts out (one putt close in, two from further). Within a club's length of the cup it drops. Seven strokes and
// Holm picks it up and puts it by the hole. Each hole holed goes on the card (CP15.card, every screen).
// Together: the host keeps the ball, the card and every stage's state in RAID.st; a joined player asks to strike
// (raidAsk 'm15hit' [bearing, power]) or putt ('m15putt').

cpCast('m15pell', { n: 'Pellow', c: '#b8d0a0' });
cpCast('m15mast', { n: 'The Brig’s Master', c: '#c8c0a8' });

cpMission({ id: 'm15', o: 'm03a', side: true, act: 2, n: 'The Nine Holes', when: 'c. 1883', where: 'The headland above the harbour',
  blurb: 'A still evening, and the keepers lay out nine holes of golf along the cliffs. The round is always played on into the night. This one is played on into something else.',
  stages: ['cp_m15lay', 'cp_m15chasm', 'cp_m15home'], intro: 'm15_intro', outro: 'm15_outro',
  after: { 0: 'm15_sunset', 1: 'm15_ship' },
  music: { default: 'cpm15links' }, lives: 2,
  begin() { CP15.card = [0, 0, 0, 0, 0, 0, 0, 0, 0]; CP15.lost = 0; },
  stop() { m15NpcFree(); m15SkyBack(); M15_3D.on = false; } });
// the music it would have, and what plays until it's made
Object.assign(CP_MUSIC_FALL, { cpm15links: 'frpuzzle', cpm15dusk: 'raidpier', cpm15gully: 'cpfight', cpm15fire: 'cptense', cpm15boss: 'bosscrab', cpm15home: 'cphope' });
Object.assign(RM_LOOP, { cpm15home: false });

// ---------- the course ----------
// (about the island's middle: x east, y north. The inland holes run down the west side, the 4th to the 6th round the
// south-west cliffs, the 7th out to the point, the 8th east over the chasm, and the 9th home up the east cliff)
const CP15 = { R: 84, PIN_R: 5.5, CUP_R: 1.25, USE_R: 2.3, DMAX: 66, SWING: 1.25, PICK: 7, FAIR: 7.5, ROLL: 0.7,
  HUT: [-10, 72], GULLY: [15.5, 23.5], COVE: [-88, -48], card: [0, 0, 0, 0, 0, 0, 0, 0, 0], lost: 0 };
const C15_HOLES = [
  { n: 'The Gate', par: 4, tee: [-22, 64], pin: [-52, 46] },
  { n: 'The Long Road', par: 5, tee: [-58, 39], pin: [-60, 2] },
  { n: 'Down to the Cove', par: 4, tee: [-54, -6], pin: [-34, -30] },
  { n: 'First Sight of the Sea', par: 4, tee: [-28, -38], pin: [-46, -50] },
  { n: 'Cliff’s Edge', par: 3, tee: [-52, -57], pin: [-36, -69] },
  { n: 'The Climb', par: 4, tee: [-32, -63], pin: [-21, -50] },
  { n: 'The Point', par: 3, tee: [-13, -57], pin: [2, -75] },
  { n: 'The Chasm', par: 4, tee: [6, -63], pin: [37, -49] },
  { n: 'Homeward Cliff', par: 4, tee: [42, -40], pin: [58, 14] },
];
const C15_SAND = [[-40, 58, 3.2], [-55, 12, 2.6], [31, -45, 2.4], [53, 4, 3]];
const C15_CREEK = [-82, -36, 18, 21];   // (the creek across the Long Road: x0, x1, y0, y1)
// the sea line: the cove in the south-west, and the chasm, a narrow gully cut in from the south (water south of it)
function m15Shore(lx) {
  const [g0, g1] = CP15.GULLY, gm = (g0 + g1) / 2, gw = (g1 - g0) / 2;
  if (lx > g0 && lx < g1) { const u = (lx - gm) / gw; return -21 - 10 * u * u * u * u; }
  if (lx > CP15.COVE[0] && lx < CP15.COVE[1]) { const u = (lx + 68) / 20; return -27 - 58 * u * u; }
  return -999;
}
// what's at a spot (local): 'sea' off the cliffs, 'cove', 'chasm', 'creek', or null on dry ground
function m15Wet(x, y) {
  if (Math.hypot(x, y) > CP15.R - 2.6) return 'sea';
  if (y < m15Shore(x) + 0.4) return x > 0 ? 'chasm' : 'cove';
  const C = C15_CREEK; if (x > C[0] && x < C[1] && y > C[2] && y < C[3]) return 'creek';
  return null;
}
const m15Seg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, k = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L, 0, 1); return Math.hypot(p[0] - a[0] - dx * k, p[1] - a[1] - dy * k); };
// the lie at a dry spot on hole hi: 'green', 'sand', 'tee', 'fairway' or 'rough'
function m15Lie(hi, x, y) {
  const Hh = C15_HOLES[hi]; if (!Hh) return 'rough';
  if (Math.hypot(x - Hh.pin[0], y - Hh.pin[1]) < CP15.PIN_R) return 'green';
  if (C15_SAND.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r)) return 'sand';
  if (Math.hypot(x - Hh.tee[0], y - Hh.tee[1]) < 2.2) return 'tee';
  return m15Seg([x, y], Hh.tee, Hh.pin) < CP15.FAIR ? 'fairway' : 'rough';
}
const C15_LIE = { tee: 1, fairway: 1, rough: 0.84, sand: 0.6, green: 0.3 };
const C15_LIEN = { tee: 'on the tee', fairway: 'on the fairway', rough: 'in the rough', sand: 'in the bunker', green: 'on the green' };

// ---------- the headland's look, and laying it out ----------
FPS_ISLES.cpm15head = Object.assign({}, FPS_ISLES.chapel, { name: 'the headland', ground: '#6a8a4a', ground2: '#4e6a38', wet: '#3a3e34', path: '#7a7058', tint: 0.3, mound: 0, dune: 0.012,
  rocks: [0, 3, 6, 1], wrecks: [0], tintRock: ['#5a5e50', 0.2], sky: '200,170,130', skyA: 0.1, fog: ['#3a3428', 160, 900], mist: '120,110,90', mistA: 0.06,
  birds: ['gull', 6], tufts: ['#5a7040', 140], pebbles: 30, pools: 0, wrack: 0, indoor: false, keep: false, arena: false, noGround: false, nLights: 6 });
FPI_GEN.cpm15head = {
  built: true,
  set(H) {
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }, K = zmKit(H, Z);
    m15Lay(H, K, Z);
    const S = RAID_STAGES[RAID_ORDER[RAID.stage]]; if (S && S.lay) S.lay(H, K, Z);
  },
  props(H) {},
  decor() {},
};
// (every stage) the course and the headland round it
function m15Lay(H, K, Z) {
  const { put } = K, R = H.R;
  Z.bay = true;   // (the cove's and the chasm's water: src/zombies.js zm3dWater lays it south of m15Shore)
  // the Light, out across the water to the south-east, past the point
  Z.far = { X: 230, Y: -300 };
  // the keepers' hut by the 1st tee: a shed, a bench, the cart the flags came up in, a lantern on a post
  { const [x, y] = CP15.HUT; put('shed', x, y, 0.1, { w: 4.2, d: 3.4, door: 1.0 }); put('bench', x - 4.2, y - 2.6, 0.1, { w: 2.2 }); put('cart', x + 4.6, y - 3.2, -0.5, {}); fpiLanternPost(H, FPSC.CX + x - 2.6, FPSC.CY + y - 2.8, 0.1); }
  // drystone walls along the inland side, and a gate in them (the 1st's name)
  const sw = (x0, y0, x1, y1, hh) => put('wall', (x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(y1 - y0, x1 - x0), { len: Math.hypot(x1 - x0, y1 - y0), th: 0.6, hh: hh || 1.1, mat: 'stone', cap: true, jag: 0.25 });
  sw(-4, 78, 12, 66); sw(-36, 74, -24, 76); sw(-66, 60, -48, 70); sw(-74, 36, -68, 52, 0.9);
  put('post', -30.5, 75.2, 0, { r: 0.12, hh: 1.4 }); put('post', -29.2, 75.4, 0, { r: 0.12, hh: 1.4 });
  // the creek across the Long Road: low stones along its banks
  { const C = C15_CREEK; for (let x = C[0] + 2; x < C[1]; x += 3.4) for (const y of [C[2] - 0.4, C[3] + 0.4]) if (R(0, 1) < 0.7) put('stone', x + R(-0.8, 0.8), y, R(0, 6.28), { w: R(0.6, 1.1), d: R(0.4, 0.8), hh: R(0.15, 0.35) }); }
  // rocks along the lips of the chasm (with gaps where the drowned come up), round the cove, and along the cliff tops
  const [g0, g1] = CP15.GULLY;
  for (let y = -80; y < -24; y += 2.6) for (const s of [0, 1]) { if (R(0, 1) < 0.3) continue; const x = s ? g1 + 0.7 : g0 - 0.7; put('gullrock', x + R(-0.3, 0.3), y + R(-0.8, 0.8), R(0, 6.28), { w: R(0.9, 1.6), d: R(0.7, 1.2), hh: R(0.35, 0.9), gull: R(0, 1) < 0.1 }); }
  for (let a = 0; a < 6.283; a += 0.07) { const r = CP15.R - 1.2 + R(-0.6, 0.6), x = Math.cos(a) * r, y = Math.sin(a) * r; if (y < m15Shore(x) + 3 || R(0, 1) < 0.45) continue; put('stone', x, y, R(0, 6.28), { w: R(1.2, 2.6), d: R(0.8, 1.8), hh: R(0.3, 1.0) }); }
  for (let lx = CP15.COVE[0] + 4; lx < CP15.COVE[1] - 2; lx += 2.2) { const y = m15Shore(lx) + 1.4; if (Math.hypot(lx, y) > CP15.R - 3 || R(0, 1) < 0.5) continue; put('stone', lx, y + R(0, 1.5), R(0, 6.28), { w: R(0.6, 1.2), d: R(0.5, 0.9), hh: R(0.15, 0.4) }); }
  // a few wind-bent thorn trees inland, and boulders in the rough
  for (const [x, y] of [[-70, 22], [-30, 30], [-8, 50], [10, 30], [30, 52], [-74, -14], [24, -6], [60, 40]]) put('tree', x, y, R(0, 6.28), { hh: R(3, 4.5) });
  for (const [x, y] of [[-40, 30], [-20, 12], [0, -10], [-10, -30], [30, 10], [44, 30], [10, 60], [-46, -16], [64, -14]]) put('stone', x + R(-2, 2), y + R(-2, 2), R(0, 6.28), { w: R(1.4, 2.6), d: R(1, 2), hh: R(0.5, 1.3) });
  // the head of the harbour path, south-west, a lantern post at the top of the steps
  fpiLanternPost(H, FPSC.CX - 6, FPSC.CY - 80, 0);
  const St = RAID_STAGES[RAID_ORDER[RAID.stage]];
  ZMD.START = (St && St.map && St.map.start || [-20, 60]).slice();
}
// (a stage's map, from where it starts)
function m15Map(start) {
  return { start, top: 0, R: CP15.R, isle: 'cpm15head', shore: m15Shore, nav: [-CP15.R, CP15.R, -CP15.R, CP15.R], seed: 0x15a1,
    zones: { links: { n: 'the links', r: [-CP15.R, CP15.R, -CP15.R, CP15.R], sky: true } } };
}
// (every stage) nobody walks into the cove's water or the chasm's
function m15Block(x, y) { const lx = x - FPSC.CX, ly = y - FPSC.CY; return ly < m15Shore(lx) + 0.5; }

// ---------- the ball (hosting or alone) ----------
// RAID.st.g: { on, hi (the hole), st ('rest', 'fly', 'green', 'holed', 'spent'), x, y (local), n (strokes), fl (the
// flight: [x0, y0, cx, cy, ex, ey, T, h, t0, wet, what]), lit (a burning ball), lie, lock (no strikes), tee }
function m15GolfNew(hi, o) {
  const Hh = C15_HOLES[hi], G = Object.assign({ on: true, hi, st: 'rest', x: Hh.tee[0], y: Hh.tee[1], n: 0, fl: null, lit: false, lie: 'tee', lock: false, tee: Hh.tee.slice(), back: 0 }, o || {});
  RAID.st.g = G; return G;
}
const m15G = () => RAID.st && RAID.st.g && RAID.st.g.on ? RAID.st.g : null;
// where someone stands (hosting: anyone)
function m15Who(sid) { if (!sid || sid === FPS.me.id) return FPS.me; const r = FPS.remote && FPS.remote.get(sid); return r && r.x != null ? r : null; }
// (host) a strike from sid along bearing h at power pw (0 to 1)
function m15Strike(sid, h, pw) {
  const G = m15G(); if (!G || G.st !== 'rest' || G.lock || cpCineOn()) return;
  const p = m15Who(sid); if (!p || Math.hypot(p.x - FPSC.CX - G.x, p.y - FPSC.CY - G.y) > CP15.USE_R + 1.2) return;
  pw = clamp(+pw || 0, 0.04, 1); h = +h || 0;
  const lie = G.lie || 'rough', D = pw * CP15.DMAX * (C15_LIE[lie] || 0.84) * (1 + (Math.random() - 0.5) * 0.08), a = h + (Math.random() - 0.5) * 0.06;
  const carry = D * (G.lit ? 1 : 0.86), cx = G.x + Math.sin(a) * carry, cy = G.y + Math.cos(a) * carry;
  let wet = G.lit ? null : m15Wet(cx, cy), ex = cx, ey = cy;
  // (it runs on along the ground, unless it's in sand, wet or burning; into the water if it runs that far)
  if (!wet && !G.lit && m15Lie(G.hi, cx, cy) !== 'sand') { const run = D * 0.14; for (let k = 1; k <= 8; k++) { const x = cx + Math.sin(a) * run * k / 8, y = cy + Math.cos(a) * run * k / 8; if (m15Wet(x, y)) { wet = m15Wet(x, y); ex = x; ey = y; break; } ex = x; ey = y; } }
  const T = 0.8 + carry / 42, hh = 0.6 + carry * 0.2;
  G.fl = [G.x, G.y, cx, cy, ex, ey, T, hh, RAID.t, wet ? 1 : 0, wet || '']; G.st = 'fly'; G.n++; G.by = String(sid || '');
  cpEvent('m15hit', [sid === FPS.me.id ? '' : String(sid || ''), Math.round(pw * 100), G.lit ? 1 : 0]);
  const St = raidStage(); if (St && St.m15struck) St.m15struck(G);
}
// where the ball is at the raid's clock t: [x, y, z (over the ground), still going]
function m15BallAt(G, t) {
  const f = G.fl;
  if (G.st !== 'fly' || !f) return [G.x, G.y, 0, false];
  const k = (t - f[8]) / f[6];
  if (k < 1) { const q = Math.max(0, k); return [f[0] + (f[2] - f[0]) * q, f[1] + (f[3] - f[1]) * q, 4 * f[7] * q * (1 - q), true]; }
  const r = clamp((t - f[8] - f[6]) / CP15.ROLL, 0, 1), e = 1 - (1 - r) * (1 - r);
  if (f[9] && f[2] === f[4] && f[3] === f[5]) return [f[4], f[5], -0.3 * r, r < 1];
  return [f[2] + (f[4] - f[2]) * e, f[3] + (f[5] - f[3]) * e, f[9] ? -0.3 * Math.max(0, r * 2 - 1) : 0, r < 1];
}
// (host, each frame) the flight's end, and a spent burning ball's next
function m15GolfTick(dt) {
  const G = m15G(); if (!G) return;
  if (G.st === 'fly' && G.fl && RAID.t >= G.fl[8] + G.fl[6] + CP15.ROLL) m15Land(G);
  if (G.back > 0) { G.back -= dt; if (G.back <= 0 && G.lit) { G.x = G.tee[0]; G.y = G.tee[1]; G.st = 'rest'; G.lie = 'tee'; G.fl = null; } }
}
function m15Land(G) {
  const f = G.fl, St = raidStage(), wet = f[10] || '', x = f[4], y = f[5];
  // (a burning ball: the stage has its say where it came down, then it's spent and another is lit at the pot)
  if (G.lit) { G.x = x; G.y = y; G.st = 'spent'; G.back = 1.1; if (St && St.m15landed) St.m15landed(G, x, y, m15Wet(x, y) || ''); return; }
  if (wet) {
    if (wet !== 'creek') CP15.lost++;
    G.n++; G.x = f[0]; G.y = f[1]; G.st = 'rest'; G.fl = null; G.lie = m15Lie(G.hi, G.x, G.y);
    cpEvent('m15wet', [wet, G.n]);
    if (St && St.m15landed) St.m15landed(G, x, y, wet);
    m15PickUp(G); return;
  }
  const Hh = C15_HOLES[G.hi], dp = Math.hypot(x - Hh.pin[0], y - Hh.pin[1]);
  G.x = x; G.y = y; G.fl = null;
  if (dp < CP15.CUP_R && !(St && St.m15cup && St.m15cup(G) === false)) { G.x = Hh.pin[0]; G.y = Hh.pin[1]; m15Holed(G, true); return; }
  if (dp < CP15.CUP_R) { G.x = Hh.pin[0] + 2.2; G.y = Hh.pin[1] - 1.4; G.st = 'green'; G.lie = 'green'; if (St && St.m15landed) St.m15landed(G, G.x, G.y, ''); return; }
  G.lie = m15Lie(G.hi, x, y); G.st = G.lie === 'green' ? 'green' : 'rest';
  cpEvent('m15lie', [G.lie, Math.round(dp)]);
  if (St && St.m15landed) St.m15landed(G, x, y, '');
  m15PickUp(G);
}
// (host) seven strokes and still not on: Holm picks it up and puts it by the hole
function m15PickUp(G) {
  if (G.st === 'green' || G.st === 'holed' || G.n < CP15.PICK) return;
  const Hh = C15_HOLES[G.hi]; G.x = Hh.pin[0] - 2.2; G.y = Hh.pin[1] - 1.2; G.st = 'green'; G.lie = 'green';
  cpSay('holm', 'Pick it up. I will put it by the hole for you, and we will say no more about it.', 'cp_m15_70');
}
// (host) a putt: one close in, two from further
function m15Putt(sid) {
  const G = m15G(); if (!G || G.st !== 'green' || G.lock) return;
  const p = m15Who(sid); if (!p || Math.hypot(p.x - FPSC.CX - G.x, p.y - FPSC.CY - G.y) > CP15.USE_R + 1.8) return;
  const Hh = C15_HOLES[G.hi], d = Math.hypot(G.x - Hh.pin[0], G.y - Hh.pin[1]);
  G.n += d < 1.8 ? 1 : 2; G.x = Hh.pin[0]; G.y = Hh.pin[1]; m15Holed(G, false, d < 1.8 ? 1 : 2);
}
function m15Holed(G, outright, putts) {
  G.st = 'holed'; CP15.card[G.hi] = G.n;
  cpEvent('m15holed', [G.hi, G.n, outright ? 1 : 0, putts || 0]);
  const St = raidStage(); if (St && St.m15holed) St.m15holed(G);
}
// (host) what a joined player asks of the ball
function m15GolfQ(sid, k, a) {
  if (k === 'm15hit') { if (Array.isArray(a)) m15Strike(sid, a[0], a[1]); return true; }
  if (k === 'm15putt') { m15Putt(sid); return true; }
  return false;
}
// the host's word: the ball and the card
const C15_ST = ['rest', 'fly', 'green', 'holed', 'spent', 'held'];
function m15GolfPack(o) {
  const G = m15G(); o.m15c = [CP15.card.slice(), CP15.lost];
  if (!G) { o.m15g = null; return; }
  const r = v => Math.round(v * 100) / 100;
  o.m15g = [G.hi, C15_ST.indexOf(G.st), r(G.x), r(G.y), G.n, G.fl ? G.fl.slice(0, 10).map(r) : null, G.fl ? G.fl[10] : '', G.lit ? 1 : 0, G.lie || '', G.lock ? 1 : 0, G.tee.map(r)];
}
function m15GolfApply(o) {
  if (Array.isArray(o.m15c)) { const c = o.m15c[0]; if (Array.isArray(c)) CP15.card = c.map(v => v | 0).slice(0, 9); CP15.lost = o.m15c[1] | 0; }
  const a = o.m15g, S = RAID.st;
  if (!Array.isArray(a)) { if (S.g) S.g.on = false; return; }
  const G = S.g && S.g.on ? S.g : (S.g = { on: true });
  G.hi = clamp(a[0] | 0, 0, 8); G.st = C15_ST[a[1]] || 'rest'; G.x = +a[2] || 0; G.y = +a[3] || 0; G.n = a[4] | 0;
  G.fl = Array.isArray(a[5]) ? a[5].map(v => +v || 0).concat([String(a[6] || '')]) : null; G.lit = !!a[7]; G.lie = String(a[8] || ''); G.lock = !!a[9];
  G.tee = Array.isArray(a[10]) ? [+a[10][0] || 0, +a[10][1] || 0] : C15_HOLES[G.hi].tee.slice();
}
// what every screen hears and reads as the ball goes
cpOn('m15hit', a => {
  M15SW.thock = 1;
  try { if (!soundOff()) { if (!sfxPlay('swish', { vol: 0.5 })) noise('highpass', 1800, 0.7, 0.005, 0.2, 0.12); tone(a && a[2] ? 260 : 620, 'triangle', 0.002, 0.25, 0.08, { to: a && a[2] ? 180 : 420 }); } } catch (e) {}
  const who = Array.isArray(a) && a[0] ? ((ZM.hum || []).find(h => h[0] === a[0]) || [])[1] || 'Someone' : '';
  if (who) fpsFeed(`${who} strikes the ball${a[1] >= 90 ? ', and gives it everything' : ''}.`);
});
cpOn('m15wet', a => {
  const w = Array.isArray(a) ? a[0] : 'sea', n = { sea: 'Over the cliff and into the sea', cove: 'Into the cove', chasm: 'Down into the chasm', creek: 'Into the creek' }[w] || 'Lost';
  fpsFeed(`${n}. A stroke, and play again from where you struck.`);
  try { if (!soundOff() && !sfxPlay('splash', { vol: 0.35 })) sfxSplash(0, 0.4); } catch (e) {}
});
cpOn('m15lie', a => { const l = Array.isArray(a) ? a[0] : ''; if (!C15_LIEN[l]) return; fpsFeed(`It comes to rest ${C15_LIEN[l]}${l !== 'green' ? `, ${a[1] | 0} m from the pin` : ''}.`); });
cpOn('m15holed', a => {
  if (!Array.isArray(a)) return;
  const Hh = C15_HOLES[a[0] | 0] || C15_HOLES[0], n = a[1] | 0, d = n - Hh.par, w = d <= -2 ? 'an eagle' : d === -1 ? 'a birdie' : d === 0 ? 'par' : d === 1 ? 'a bogey' : `${n} strokes`;
  ZM.banner = { text: a[2] ? 'In the hole!' : 'Holed', t: 3.2, sub: `${m15Rom((a[0] | 0) + 1)} · ${Hh.n} · ${n} (par ${Hh.par}): ${w}`, col: '#e8f0c0' };
  try { if (!soundOff()) { tone(880, 'sine', 0.002, 0.12, 0.25); tone(660, 'sine', 0.02, 0.1, 0.3); } } catch (e) {}
});

// ---------- the swing (every screen) ----------
const M15SW = { hold: 0, pw: 0, was: false, pend: 0, thock: 0, aim: null };
const m15SwPow = t => { const k = (t % (2 * CP15.SWING)) / CP15.SWING; return k < 1 ? k : 2 - k; };
// (a stage's me) holding Use at the ball draws the swing back; letting go strikes
function m15SwingMe(dt) {
  const G = m15G(), o = ZM.near; if (M15SW.pend > 0) M15SW.pend -= dt;
  if (M15SW.thock > 0) M15SW.thock = Math.max(0, M15SW.thock - dt * 2);
  const at = !!(G && o && o.k === 'm15ball' && G.st === 'rest' && !G.lock && !(FPS.me.dead > 0) && !zmIsDown() && !cpCineOn() && M15SW.pend <= 0), held = at && cplHeld();
  if (held) { M15SW.hold += dt; M15SW.pw = Math.max(0.04, m15SwPow(M15SW.hold)); M15SW.was = true; }
  else if (M15SW.was) {
    M15SW.was = false;
    if (at && M15SW.pw > 0.06) { const h = FPS.me.h, pw = M15SW.pw; M15SW.pend = 1.2; raidAsk('m15hit', [Math.round(h * 1000) / 1000, Math.round(pw * 1000) / 1000]); }
    M15SW.hold = 0; M15SW.pw = 0;
  }
  // (where a strike at this power would carry: the ring and the arc in 3D)
  if (held) { const D = M15SW.pw * CP15.DMAX * (C15_LIE[G.lie] || 0.84) * (G.lit ? 1 : 0.86), h = FPS.me.h; M15SW.aim = [G.x, G.y, G.x + Math.sin(h) * D, G.y + Math.cos(h) * D, D]; }
  else M15SW.aim = null;
}
// the ball and the cup, as things to use
function m15GolfConsider(c) {
  const G = m15G(); if (!G || G.lock) return;
  const [x, y] = cpkW(G.x, G.y);
  if (G.st === 'rest') c({ k: 'm15ball' }, x, y, 0, CP15.USE_R, false);
  else if (G.st === 'green') c({ k: 'm15putt' }, x, y, 0, CP15.USE_R + 0.6, false);
}
function m15GolfPrompt(o) {
  const G = m15G(); if (!G) return null;
  if (o.k === 'm15ball') return { text: G.lit ? 'Hold Use to swing, let go to strike the burning ball (face where it should go)' : `Hold Use to swing, let go to strike (${C15_LIEN[G.lie] || 'in the rough'}: face the way it should go)`, free: true };
  if (o.k === 'm15putt') { const Hh = C15_HOLES[G.hi], d = Math.hypot(G.x - Hh.pin[0], G.y - Hh.pin[1]); return { text: `Putt out (${d < 1.8 ? 'a tap in' : Math.round(d * 3.28) + ' feet: two putts'})`, free: true }; }
  return null;
}
function m15GolfUse(o) {
  if (o.k === 'm15ball') return true;   // (the swing is held: m15SwingMe)
  if (o.k === 'm15putt') { if (M15SW.pend > 0) { zmSound('no'); return true; } M15SW.pend = 1; raidAsk('m15putt'); try { if (!soundOff()) tone(520, 'triangle', 0.002, 0.15, 0.06); } catch (e) {} return true; }
  return false;
}
// the hole, the card, and the swing's meter
function m15GolfHud(phone, mono, row) {
  const G = m15G(); if (!G) return;
  const Hh = C15_HOLES[G.hi], L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 72 : 96) + (row || 0) * (phone ? 26 : 32);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const w = phone ? 190 : 260;
  ctx.fillStyle = 'rgba(8,10,14,0.5)'; ctx.fillRect(L - 6, top - 4, w + 12, phone ? 34 : 42);
  ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(232,240,200,0.9)';
  ctx.fillText(G.lit ? 'THE TAR POT · BURNING BALLS' : `${m15Rom(G.hi + 1)} · ${Hh.n.toUpperCase()} · PAR ${Hh.par} · STROKE ${G.n + (G.st === 'holed' ? 0 : 1)}`, L, top, w);
  // (the card: each hole's score, the one being played marked)
  ctx.font = mono(phone ? 8 : 10);
  let tot = 0, par = 0;
  for (let i = 0; i < 9; i++) { const v = CP15.card[i] | 0, x = L + i * (phone ? 15 : 20); ctx.fillStyle = i === G.hi && !G.lit ? '#ffe2a0' : v ? 'rgba(236,228,207,0.85)' : 'rgba(236,228,207,0.3)'; ctx.fillText(v ? String(v) : i === G.hi && !G.lit ? '•' : '·', x, top + (phone ? 13 : 17)); if (v) { tot += v; par += C15_HOLES[i].par; } }
  if (tot) { const d = tot - par; ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText(`${tot} (${d > 0 ? '+' + d : d === 0 ? 'E' : d})`, L + (phone ? 140 : 186), top + (phone ? 13 : 17)); }
  fpsHudNote(top + (phone ? 34 : 42));
  // the swing meter, under the sights
  if (M15SW.pw > 0) {
    const bw = phone ? 140 : 200, bh = phone ? 8 : 10, bx = W / 2 - bw / 2, by = H * 0.5 + (phone ? 46 : 64), k = M15SW.pw;
    ctx.fillStyle = 'rgba(8,10,14,0.6)'; ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 22);
    ctx.fillStyle = 'rgba(80,80,60,0.7)'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = k > 0.92 ? '#ffe2a0' : G.lit ? '#ff9a50' : '#cfe8a0'; ctx.fillRect(bx, by, bw * k, bh);
    ctx.textAlign = 'center'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.9)';
    ctx.fillText(`${Math.round(k * 100)}% · ${Math.round(k * CP15.DMAX * (C15_LIE[G.lie] || 0.84))} M · LET GO TO STRIKE`, W / 2, by + bh + 4);
  }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
}
// (a stage's waypoint, hosting) to the ball, or the cup
function m15GolfWay() {
  const G = m15G(); if (!G) return;
  if (G.st === 'rest' && !G.lit) cpWaypoint(G.x, G.y, G.lie === 'tee' ? `The ${m15Ord(G.hi + 1)} tee` : 'The ball', 0.4);
  else if (G.st === 'green') cpWaypoint(G.x, G.y, 'Putt out', 0.4);
}
const m15Rom = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][n] || String(n);
const m15Ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

// ---------- the course in 3D (every stage, every screen) ----------
const M15_3D = { on: false, flags: [], ball: null, ring: null, arc: null, foam: [], gullyBalls: [], trail: [] };
function m15Course3d(grp, o) {
  o = o || {};
  const T = M15_3D, G0 = FPSC.GROUND; T.on = true; T.flags = []; T.foam = []; T.gullyBalls = [];
  const soft = z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const flat = (geo, col, z, op) => { const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: col, transparent: op != null, opacity: op == null ? 1 : op, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: op == null })); m.position.y = z; grp.add(m); return m; };
  T.glow = (c, s, op) => { const g3 = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op == null ? 0.6 : op })); g3.scale.setScalar(s); return g3; };
  C15_HOLES.forEach((Hh, i) => {
    const [tx, ty] = cpkW(...Hh.tee), [px, py] = cpkW(...Hh.pin), a = Math.atan2(Hh.pin[0] - Hh.tee[0], Hh.pin[1] - Hh.tee[1]), L = Math.hypot(Hh.pin[0] - Hh.tee[0], Hh.pin[1] - Hh.tee[1]);
    // the fairway, mown a shade lighter, from the tee to the green
    { const f = flat(new THREE.PlaneGeometry(CP15.FAIR * 1.7, Math.max(4, L - 3)), 0x5e7e40, G0 + 0.015, 0.45); f.position.x = (tx + px) / 2; f.position.z = -(ty + py) / 2; f.rotation.y = -a; }
    // the green, and its fringe
    { const f = flat(new THREE.CircleGeometry(CP15.PIN_R + 1.2, 32), 0x587a3a, G0 + 0.02); f.position.x = px; f.position.z = -py; const gm = flat(new THREE.CircleGeometry(CP15.PIN_R, 32), 0x6a9244, G0 + 0.025); gm.position.x = px; gm.position.z = -py; }
    // the tee: a mown box and its two white markers
    { const f = flat(new THREE.PlaneGeometry(3.4, 3.4), 0x6a8a48, G0 + 0.02); f.position.x = tx; f.position.z = -ty; f.rotation.y = -a; for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), new THREE.MeshLambertMaterial({ color: 0xe8e4d8 })); m.position.copy(z3v(tx + Math.cos(a) * s * 1.3, ty - Math.sin(a) * s * 1.3, G0 + 0.07)); grp.add(m); } }
    // the pin: a white stick, its flag, the cup, and a little lantern at the top (lit after dark)
    const pin = new THREE.Group(); pin.position.copy(z3v(px, py, G0));
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0xf4efe2 })); stick.position.y = 1.2; pin.add(stick);
    const fg = new THREE.PlaneGeometry(0.62, 0.4, 4, 1); fg.translate(0.31, 0, 0);
    const flag = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ color: 0xd8452f, side: THREE.DoubleSide })); flag.position.y = 2.15; pin.add(flag);
    const cup = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x14180f })); cup.position.y = 0.03; pin.add(cup);
    const lan = T.glow(0xffd88a, 1.4, 0); lan.position.y = 2.5; pin.add(lan);
    grp.add(pin); T.flags.push({ pin, flag, lan, i });
  });
  // the bunkers and the creek
  for (const [x, y, r] of C15_SAND) { const s = flat(new THREE.CircleGeometry(r, 24), 0xb0a070, G0 + 0.03); const [wx, wy] = cpkW(x, y); s.position.x = wx; s.position.z = -wy; }
  { const C = C15_CREEK, c = flat(new THREE.PlaneGeometry(C[1] - C[0], C[3] - C[2]), 0x34506a, G0 + 0.03, 0.85); const [wx, wy] = cpkW((C[0] + C[1]) / 2, (C[2] + C[3]) / 2); c.position.x = wx; c.position.z = -wy; T.creek = c; }
  // foam in the chasm and the cove, rising and falling with the swell
  for (let i = 0; i < 26; i++) { const s = T.glow(0xe8f0f0, 2.2, 0); const [wx, wy] = cpkW(19.5 + (Math.random() - 0.5) * 4, -82 + i * 2.3); s.position.copy(z3v(wx, wy, G0 + 0.2)); grp.add(s); T.foam.push({ s, ph: Math.random() * 6 }); }
  for (let i = 0; i < 16; i++) { const lx = -84 + Math.random() * 32, y = m15Shore(lx) - 0.8 - Math.random() * 3; if (Math.hypot(lx, y) > CP15.R) continue; const s = T.glow(0xe8f0f0, 2.6, 0); const [wx, wy] = cpkW(lx, y); s.position.copy(z3v(wx, wy, G0 + 0.2)); grp.add(s); T.foam.push({ s, ph: Math.random() * 6 }); }
  // the lost balls, down in the chasm's water, shining (stage II on)
  if (o.gully) for (let i = 0; i < 11; i++) { const s = T.glow(0x9fe8d8, 0.9, 0); const [wx, wy] = cpkW(17.6 + Math.random() * 3.8, -76 + i * 4.6 + Math.random() * 2); s.position.copy(z3v(wx, wy, G0 + 0.05)); grp.add(s); T.gullyBalls.push({ s, ph: Math.random() * 6 }); }
  // the ball itself, its glow and its fire, and the trail it leaves; the ring where a strike would carry, and its arc
  T.ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf8f6ee })); grp.add(T.ball);
  T.bGlow = T.glow(0xfff6e0, 0.9, 0.5); grp.add(T.bGlow);
  T.fire = T.glow(0xff8a30, 2.2, 0); grp.add(T.fire);
  T.ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); grp.add(T.ring);
  { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(25 * 3), 3)); T.arc = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false })); T.arc.frustumCulled = false; grp.add(T.arc); }
  T.trail = []; for (let i = 0; i < 10; i++) { const s = T.glow(0xfff0d0, 0.5, 0); grp.add(s); T.trail.push(s); }
}
// (each frame) the flags in the wind, the ball, the ring, the foam; night (0 to 1) lights the pins' lanterns
function m15Course3dTick(dt, night) {
  const T = M15_3D; if (!T.on || !T.ball) return;
  const t = g.t, G0 = FPSC.GROUND, G = m15G(), now = RAID.ct || RAID.t;
  for (const F of T.flags) {
    F.flag.rotation.y = Math.sin(t * 2.2 + F.i) * 0.35 - 0.3;
    const cur = G && G.hi === F.i && !G.lit; F.flag.material.color.setHex(cur ? 0xd8452f : 0xe8e0c8);
    F.lan.material.opacity = night * (cur ? 0.9 : 0.35) * (0.85 + 0.15 * Math.sin(t * 7 + F.i));
  }
  for (const q of T.foam) { const k = 0.5 + 0.5 * Math.sin(t * 0.9 + q.ph); q.s.material.opacity = 0.05 + 0.18 * k; q.s.scale.setScalar(1.6 + 1.4 * k); }
  for (const q of T.gullyBalls) q.s.material.opacity = (0.35 + 0.25 * Math.sin(t * 1.7 + q.ph)) * clamp(night * 1.5, 0.15, 1);
  if (T.creek) T.creek.material.opacity = 0.75 + 0.1 * Math.sin(t * 1.3);
  // the ball
  if (G) {
    const [x, y, z] = m15BallAt(G, now), [wx, wy] = cpkW(x, y), v = z3v(wx, wy, G0 + 0.08 + (G.st === 'held' ? 1.05 : Math.max(-0.4, z)));
    const show = G.st !== 'holed' && G.st !== 'spent';
    T.ball.visible = show; T.ball.position.copy(v); T.bGlow.position.copy(v); T.bGlow.material.opacity = show ? (G.st === 'fly' ? 0.8 : 0.35 + 0.15 * Math.sin(t * 3)) : 0;
    T.bGlow.scale.setScalar(G.st === 'fly' ? 1.4 : G.st === 'held' ? 1.8 : 0.9); if (G.st === 'held') T.bGlow.material.opacity = 0.75 + 0.2 * Math.sin(t * 8);
    T.fire.position.copy(v); T.fire.material.opacity = show && G.lit ? 0.75 + 0.2 * Math.sin(t * 17) : 0; T.fire.scale.setScalar(G.st === 'fly' ? 2.8 : 1.6);
    T.ball.material.color.setHex(G.lit ? 0xffa050 : 0xf8f6ee);
    // (its trail: where it was a little while ago)
    T.trail.forEach((s, i) => { if (G.st !== 'fly') { s.material.opacity = 0; return; } const [tx, ty, tz] = m15BallAt(G, now - (i + 1) * 0.05), [ux, uy] = cpkW(tx, ty); s.position.copy(z3v(ux, uy, G0 + 0.08 + Math.max(0, tz))); s.material.color.setHex(G.lit ? 0xff9040 : 0xfff0d0); s.material.opacity = (G.lit ? 0.6 : 0.35) * (1 - i / 10); s.scale.setScalar((G.lit ? 1.2 : 0.4) * (1 - i / 14)); });
  } else { T.ball.visible = false; T.bGlow.material.opacity = 0; T.fire.material.opacity = 0; T.trail.forEach(s => s.material.opacity = 0); }
  // the ring and the arc of the swing being drawn
  const A = M15SW.aim;
  if (A && A[4] > 0.5) {
    const [rx, ry] = cpkW(A[2], A[3]), wet = m15Wet(A[2], A[3]); T.ring.position.copy(z3v(rx, ry, G0 + 0.06)); T.ring.scale.setScalar(0.8 + A[4] / 60); T.ring.material.opacity = 0.65 + 0.2 * Math.sin(t * 6);
    T.ring.material.color.setHex(G && G.lit ? 0xff9a50 : wet && wet !== 'creek' ? 0x8ac8ff : 0xffe2a0);
    const P = T.arc.geometry.attributes.position, hh = 0.6 + A[4] * 0.2, [ax, ay] = cpkW(A[0], A[1]);
    for (let i = 0; i < 25; i++) { const k = i / 24, x = ax + (rx - ax) * k, y = ay + (ry - ay) * k, z = G0 + 0.1 + 4 * hh * k * (1 - k); P.setXYZ(i, x, z, -y); }
    P.needsUpdate = true; T.arc.material.opacity = 0.55;
  } else { T.ring.material.opacity = 0; T.arc.material.opacity = 0; }
  // the Light, far off: dark until its keeper reaches it (the stage's st.lit says)
  m15FarLight(RAID.st && RAID.st.lit ? 1 : 0);
}
// the Light far off over the water (src/zombies.js zm3dFarLight's): lit, or dark
function m15FarLight(k) {
  const F = typeof Z3 !== 'undefined' && Z3.far; if (!F) return;
  if (!F.m15) F.m15 = F.g.children.filter(c => c.isSprite || (c.material && c.material.color && c.material.color.getHex && c.material.color.getHex() === 0xffe2a0));
  F.beam.visible = k > 0.5;
  for (const c of F.m15) { if (c.isSprite) c.visible = k > 0.5; else c.material.color.setHex(k > 0.5 ? 0xffe2a0 : 0x2a2826); }
}

// ---------- the sky ----------
// Four skies of its own (src/biomes.js: the painted sky, the sea's colours, the haze), a bright afternoon, a sunset, a
// dusk and a moonlit night, and the light and fog in the 3D between them. m15Sky(k), k: 0 the afternoon, 0.5 the
// sunset, 0.75 dusk, 1 moonlight (every screen, each frame); m15SkyBack puts the sea's own sky back.
BIOMES.cpm15day = Object.assign({}, BIOMES.skerry, { name: 'the headland, afternoon', sky: ['#4a6a98', '#7c98bc', '#b8bcb0', '#e2cc9c'], sea: ['#4a6a7c', '#36566a', '#264458', '#183242'],
  glitter: '255,240,210', haze: '220,196,150', dust: '255,255,255', cloud: '255,240,220', halo: '255,244,210', waves: '230,240,250', beam: '255,240,200', noStars: true, fx: 'calm' });
BIOMES.cpm15sunset = Object.assign({}, BIOMES.skerry, { name: 'the headland, sunset', sky: ['#22264a', '#5a4466', '#b8644a', '#eea062'], sea: ['#5a4450', '#3a2e40', '#241e30', '#140f1c'],
  glitter: '255,190,130', haze: '230,140,90', cloud: '255,190,150', halo: '255,200,160', waves: '255,200,170', beam: '255,190,140', noStars: true, fx: 'calm' });
BIOMES.cpm15dusk = Object.assign({}, BIOMES.skerry, { name: 'the headland, dusk', sky: ['#060a18', '#141c36', '#2e3252', '#5c4e62'], sea: ['#1e263a', '#141c2e', '#0c1222', '#060a14'],
  glitter: '210,200,220', haze: '90,80,110', cloud: '140,130,160', halo: '220,220,235', fx: 'calm' });
BIOMES.cpm15night = Object.assign({}, BIOMES.skerry, { name: 'the headland, moonlight', fx: 'calm' });
var M15SKY = { bg: null, b0: null, over: null };
function m15Sky(k) {
  if (typeof GL3D === 'undefined' || !GL3D.scene) return;
  k = clamp(k, 0, 1);
  const L = (a, b, q) => a + (b - a) * q;
  // (the painted sky, by the time of day)
  const bi = k < 0.3 ? 'cpm15day' : k < 0.64 ? 'cpm15sunset' : k < 0.88 ? 'cpm15dusk' : 'cpm15night';
  if (typeof g !== 'undefined' && g && g.biome !== bi) { if (M15SKY.b0 === null) M15SKY.b0 = g.biome || 'skerry'; g.biome = bi; }
  // (keyframes: afternoon gold, sunset red, dusk blue, moonlit night: the fog's colour, the ambient, the moon's)
  const K = [[0, [0.86, 0.78, 0.6], 0.95, 0.75], [0.5, [0.9, 0.6, 0.38], 0.78, 0.45], [0.75, [0.34, 0.29, 0.36], 0.55, 0.28], [1, [0.09, 0.12, 0.2], 0.42, 0.24]];
  let i = 0; while (i < K.length - 2 && k > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], q = clamp((k - a[0]) / (b[0] - a[0]), 0, 1), c = [0, 1, 2].map(j => L(a[1][j], b[1][j], q));
  GL3D.amb.intensity = L(a[2], b[2], q); GL3D.moon.intensity = L(a[3], b[3], q);
  GL3D.amb.color.setRGB(1, L(0.95, 0.9, k), L(0.86, 1, k));
  const F = GL3D.scene.fog; if (F) { F.color.setRGB(c[0], c[1], c[2]); F.near = L(140, 50, k); F.far = L(1100, 480, k); RAID.fog0 = true; }
  const B = GL3D.scene.background; if (B && B.isColor) { if (!M15SKY.bg) M15SKY.bg = B.clone(); B.setRGB(c[0], c[1], c[2]); }
}
function m15SkyBack() {
  if (M15SKY.bg && typeof GL3D !== 'undefined' && GL3D.scene && GL3D.scene.background && GL3D.scene.background.isColor) GL3D.scene.background.copy(M15SKY.bg); M15SKY.bg = null;
  if (M15SKY.b0 !== null && typeof g !== 'undefined' && g) g.biome = M15SKY.b0; M15SKY.b0 = null;
  try { if (GL3D.amb) GL3D.amb.color.setRGB(1, 1, 1); } catch (e) {}
}

// ---------- the keepers on the course (every screen: cosmetic, each walks after the ball by itself) ----------
// Holm (the keeper, in his uniform coat), Maren (his wife, alive and warm in 1883), Pellow (the assistant keeper)
const C15_PPL = { holm: ['#1e2430', '#d8d0bc', '#a08a50', '#ffd88a'], pell: ['#2a3428', '#d8d0bc', '#7a6a3a', '#ffd88a'] };
var M15N = { holm: null, pell: null, maren: null, at: {} };
function m15NpcBuild(grp, who) {
  m15NpcFree(); M15N.at = {};
  if (who.includes('holm')) M15N.holm = cpkNpc(C15_PPL.holm);
  if (who.includes('pell')) M15N.pell = cpkNpc(C15_PPL.pell);
  if (who.includes('maren')) { M15N.maren = cplWoman({ lantern: false, dress: 0x2a3a5a }); if (M15N.maren) grp.add(M15N.maren.root); }
}
function m15NpcFree() { if (M15N.holm) cpkNpcFree(M15N.holm); if (M15N.pell) cpkNpcFree(M15N.pell); M15N.holm = M15N.pell = null; if (M15N.maren && M15N.maren.root && M15N.maren.root.parent) M15N.maren.root.parent.remove(M15N.maren.root); M15N.maren = null; }
// (each frame) each walks towards where they should stand (local), and faces the ball
function m15NpcTick(dt, spots, lan) {
  const G = m15G(), [bx, by] = G ? cpkW(...m15BallAt(G, RAID.ct || RAID.t)) : cpkW(0, 0), hide = cpCineOn();
  for (const k of ['holm', 'pell', 'maren']) {
    const F = M15N[k], sp = spots && spots[k]; if (!F) continue;
    const P = M15N.at[k] || (M15N.at[k] = sp ? sp.slice() : [0, 0]);
    let spd = 0;
    if (sp) { const dx = sp[0] - P[0], dy = sp[1] - P[1], d = Math.hypot(dx, dy); if (d > 45) { P[0] = sp[0]; P[1] = sp[1]; } else if (d > 0.3) { const v = Math.min(d, (d > 6 ? 3.6 : 1.6) * dt); P[0] += dx / d * v; P[1] += dy / d * v; spd = v / Math.max(dt, 1e-3); P.h = Math.atan2(dx, dy); } }
    const [wx, wy] = cpkW(P[0], P[1]), h = spd > 0.2 ? P.h : Math.atan2(bx - wx, by - wy);
    if (k === 'maren') { cplWomanPose(F, { x: wx, y: wy, h, lift: lan ? 0.4 : 0 }); F.root.visible = !hide; }
    else { cpkNpcPose(F, { x: wx, y: wy, h, spd, noGun: true, lan: !!lan }); try { if (F.root) F.root.visible = !hide; } catch (e) {} }
  }
}
// (where the keepers stand: back from the ball, a little off to each side)
function m15NpcSpots(G) {
  if (!G) return null;
  const Hh = C15_HOLES[G.hi], [x, y] = G.st === 'fly' && G.fl ? [G.fl[0], G.fl[1]] : [G.x, G.y], a = Math.atan2(Hh.pin[0] - x, Hh.pin[1] - y), b = (u, v) => [x - Math.sin(a) * u + Math.cos(a) * v, y - Math.cos(a) * u - Math.sin(a) * v];
  return { holm: b(3.2, -2.6), pell: b(2.4, 3.0), maren: b(4.6, 0.6) };
}
