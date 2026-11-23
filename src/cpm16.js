'use strict';
// The Chronicle of the Light, mission 16: The Harbour Pool (c. 1885, a summer evening; the Harbour Pool under the cliffs
// by the harbour, and the Hound off the harbour mouth). Skerry League's world (src/league.js: the walled basin, its two
// goals and the little lighthouses behind them, the great striped buoy, the gale buoys and the Gale in a bottle) as a
// story on the campaign's sailing engine: the keeper's cutter (src/gwsail.js, through its GWS_LEG hook) is Blue's ship,
// sailed from her own deck, and the buoy is shoved with her own shoulder. There are no drowned yet in 1885: the
// threat is the living, Kittow's wrecking gang, who no longer light false lights but take away the true ones and wait.
//  I.   The Match (cp_m16match, here): the summer evening's match, Blue against Orange, the keeper's cutter against
//       Skipper Dunn's collier brig Patience (a bot of this mission's own, m16Bot), in the unfinished fitting-out basin.
//       Knock the buoy into Orange's goal (east) with the cutter; first to three. The Gale in a bottle is a cask lashed
//       aft (Use at it, or Shift at the wheel): a burst of wind that drives her on harder for a moment, never slower.
//       The yellow gale buoys moored about the pool fill it again. If Orange gets to three first Dunn calls it the best
//       of seven, and the match goes on (his brig eases off if Blue has gone long without scoring). A goal rings the
//       bell and sets the lighthouse behind it flashing; both ships go back to their marks for a count of three.
//  II.  Out through the Gap (cp_m16tow, src/cpm16y.js): the marker on the Hound is gone, its chain cut, the packet
//       Sorrel is due in the fog, and the old buoy is the only mark big enough. Shove it out of the gap where the gates
//       were never hung and north through the fog to the Hound's mooring, against the packet's clock, while Kittow's
//       gigs come out of the fog to put a line on it (ram them, or shoot their oarsmen) and to board the cutter.
//  III. The Rook (cp_m16rook, src/cpm16y.js): Kittow's lugger tears the buoy off the chain and tows it into the dark.
//       Ram her and break her (the Gale hits hardest), under her muskets, until she slips it; Dunn's Patience comes out
//       of the fog to take the buoy back to the Hound, and the Rook comes about to ram the cutter. Broken, she lays
//       alongside and Kittow comes over the rail himself: take him alive.
// The 3D (the pool, the ships, the gigs, the Rook) is src/cpm16x.js; the cinematics src/cpm16z.js.
// The sea's frame is the sailing game's (the Light at its origin, x east, y north; headings from north, clockwise),
// as gwsail's is. The pool lies with its goals east and west along the cliff, its north wall to the open sea.
// Together it's host-authoritative: the cutter is the Gannet's Wake's own word (g* keys), and this mission's state is
// RAID.st.m16 (the ball, the score and phase, the Gale, the gale buoys, the other ships, the gigs, the Rook), sent as
// m16* keys. A joined player asks the host to let the Gale go (raidAsk 'm16gale'); their shots at a gig or at the Rook
// go to the host as raidAsk 'm16hit'. Everything a screen draws between the host's words it runs on from them.
// Lines: cp_m16_01 on (campaign-sound/m16.md).

cpCast('dunn', { n: 'Skipper Dunn', c: '#ffb070' });
cpCast('kittow', { n: 'Kittow', c: '#c89878' });
Object.assign(CP_MUSIC_FALL, { cpm16match: 'gwsail', cpm16fog: 'frsail', cpm16rook: 'gwcapt', cpm16kittow: 'cpfight', cpm16eve: 'gwwin' });

var C16 = {
  PC: [560, 60], AL: 135, AW: 78, CH: 22, GW: 50, GD: 16, BAR: 16, WALLH: 6, TH: 5, GAP: [538, 582],
  R: 6, FLOAT: 3.4, GRAV: 26, HIT: 0.45, VMAX: 90,
  GOALS: 3, COUNT: 3, CELEB: 3.6,
  GALE_V: 17, GALE_T: 1.5, GALE_COST: 34, GALE_MAX: 100,
  CASK: [-2.15, -7.2], CASK_R: 1.25,
  HOUND: [470, 610], MOOR: [470, 548], MOOR_R: 15, MOOR_HOLD: 2.4,
  BRIG: { L: 13.5, R: 4.3, m: 2.2, turn: 1.15 }, ROOK: { L: 8.5, R: 3.3, m: 1.4, turn: 1.3 }, GIG: { L: 3.2, R: 1.4 },
};
var C16_PH = ['count', 'play', 'goal', 'won', 'tow', 'moor', 'rook', 'slip', 'board', 'taken'];
// (the pool's corners and its goal mouths)
const m16X0 = () => C16.PC[0] - C16.AL, m16X1 = () => C16.PC[0] + C16.AL, m16Y0 = () => C16.PC[1] - C16.AW, m16Y1 = () => C16.PC[1] + C16.AW;
const m16N = () => Math.max(1, (ZM.hum || []).length);
const m16Nick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
// the gale buoys: two big at the middle of each long side, four small about the pool
var C16_PADS = [[0, -1, 1], [0, 1, 1], [-0.55, -0.45, 0], [0.55, -0.45, 0], [-0.55, 0.45, 0], [0.55, 0.45, 0]].map(([a, b, big]) => ({ x: C16.PC[0] + a * C16.AL, y: C16.PC[1] + b * (C16.AW - 12), big: !!big, amt: big ? 100 : 40, back: big ? 12 : 6 }));

// ---------- the pool: its walls as segments (for the eye) and as a row of stones (for everything that hits them) ----------
// The outline runs anticlockwise round the pool, so each segment's left (its normal) points in. Its gap in the north
// wall (GAP) is where the gates were never hung; the goal boxes stand out from each end.
var C16_POOL = null;
function m16Pool() {
  if (C16_POOL) return C16_POOL;
  const { CH, GW, GD, GAP } = C16, X0 = m16X0(), X1 = m16X1(), Y0 = m16Y0(), Y1 = m16Y1(), gy0 = C16.PC[1] - GW / 2, gy1 = C16.PC[1] + GW / 2, segs = [];
  const chain = (P, kind) => { for (let i = 0; i < P.length - 1; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1], L = Math.hypot(bx - ax, by - ay); segs.push({ ax, ay, bx, by, L, nx: -(by - ay) / L, ny: (bx - ax) / L, kind }); } };
  chain([[X0, gy0], [X0, Y0 + CH], [X0 + CH, Y0], [X1 - CH, Y0], [X1, Y0 + CH], [X1, gy0]], 'wall');
  chain([[X1, gy1], [X1, Y1 - CH], [X1 - CH, Y1], [GAP[1], Y1]], 'wall');
  chain([[GAP[0], Y1], [X0 + CH, Y1], [X0, Y1 - CH], [X0, gy1]], 'wall');
  chain([[X1, gy0], [X1 + GD, gy0], [X1 + GD, gy1], [X1, gy1]], 'goal');
  chain([[X0, gy1], [X0 - GD, gy1], [X0 - GD, gy0], [X0, gy0]], 'goal');
  // the stones: along every run, set back into the wall's thickness
  const circ = [], TH = C16.TH;
  for (const s of segs) { const n = Math.max(1, Math.ceil(s.L / 2.6)); for (let i = 0; i <= n; i++) { const t = i / n; circ.push({ x: s.ax + (s.bx - s.ax) * t - s.nx * TH / 2, y: s.ay + (s.by - s.ay) * t - s.ny * TH / 2, r: TH / 2 + 0.6, wall: 1 }); } }
  // (the goal posts)
  for (const x of [X0, X1]) for (const y of [gy0, gy1]) circ.push({ x, y, r: 1.1, post: 1 });
  // the boom of spars across the gap while the match is on
  const boom = []; for (let x = GAP[0]; x <= GAP[1] + 0.1; x += 2.4) boom.push({ x, y: Y1 - 0.5, r: 1.6, boom: 1 });
  // the two little lighthouses on their rocks behind the goals: Blue's west, Orange's east
  const houses = [[X0 - GD - 30, C16.PC[1]], [X1 + GD + 30, C16.PC[1]]];
  for (const [x, y] of houses) circ.push({ x, y, r: 17, house: 1 });
  return (C16_POOL = { segs, circ, boom, houses, gy0, gy1 });
}
// the coast under the cliffs, east and west of the pool: land she's pushed off
function m16Cliffs() { const out = []; for (let x = 330; x <= 1100; x += 9) if (x < m16X0() - C16.GD - 52 || x > m16X1() + C16.GD + 52) out.push({ x, y: -44 + Math.sin(x * 0.07) * 4, r: 13, cliff: 1 }); return out; }

// ---------- the sea for each part (GWS_LEG.sea): rocks, the shore she's pushed off, and a grid of both ----------
function m16SeaOf(k) {
  const P = m16Pool(), R = seeded(0xc16 + (k === 'match' ? 0 : 77)), rnd = (a, b) => a + R() * (b - a), rocks = [];
  const add = (x, y, r) => { const prof = []; for (let i = 0; i < 7; i++) prof.push(rnd(0.35, 1)); prof[0] = rnd(0.15, 0.45); prof[6] = rnd(0.15, 0.45); rocks.push({ x, y, r, prof, ph: rnd(0, 6.28), seen: -99, lit: 0, i: rocks.length }); };
  if (k !== 'match') {
    // the Hound: a knot of black rock off the harbour mouth, its mooring on the landward side
    const [hx, hy] = C16.HOUND;
    add(hx, hy + 6, 9); add(hx + 17, hy + 14, 6); add(hx - 18, hy + 12, 7); add(hx + 6, hy + 30, 6); add(hx - 8, hy + 26, 5);
    // and the rest of the approach: kept clear of the pool, of the way from the gap to the mooring (a lane), and of the mooring
    const ok = (x, y, r) => { if (y < m16Y1() + 30) return false; const t = clamp((y - m16Y1()) / (C16.MOOR[1] - m16Y1()), 0, 1), lx = 560 + (C16.MOOR[0] - 560) * t; if (y < C16.MOOR[1] + 10 && Math.abs(x - lx) < 34 + r) return false; if (Math.hypot(x - C16.MOOR[0], y - C16.MOOR[1]) < 40 + r) return false; return !rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 16); };
    for (let n = 0; n < 4000 && rocks.length < 46; n++) { const x = rnd(300, 860), y = rnd(m16Y1() + 30, 820), r = rnd(4, 11); if (ok(x, y, r)) add(x, y, r); }
  }
  const shore = [...P.circ, ...(k === 'match' ? P.boom : []), ...m16Cliffs()];
  return { rocks, shore, path: [{ x: C16.PC[0], y: C16.PC[1] }, { x: C16.PC[0], y: C16.PC[1] + 1 }], spars: [], len: 600 };
}
// (a grid of everything solid on the water, for the ball and the other ships: 24 m cells)
function m16Grid(sea) {
  if (sea.grid) return sea.grid;
  const G = new Map(), put = o => { const x0 = Math.floor((o.x - o.r) / 24), x1 = Math.floor((o.x + o.r) / 24), y0 = Math.floor((o.y - o.r) / 24), y1 = Math.floor((o.y + o.r) / 24); for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) { const k = i * 4096 + j; (G.get(k) || G.set(k, []).get(k)).push(o); } };
  for (const o of sea.shore) put(o); for (const o of sea.rocks) put(o);
  return (sea.grid = G);
}
function m16Solid(x, y, r, cb) {
  const sea = gwsSeaOf(), G = m16Grid(sea), x0 = Math.floor((x - r) / 24), x1 = Math.floor((x + r) / 24), y0 = Math.floor((y - r) / 24), y1 = Math.floor((y + r) / 24), seen = new Set();
  for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) for (const o of G.get(i * 4096 + j) || []) { if (seen.has(o)) continue; seen.add(o); if (o.boom && RAID.st.m16 && RAID.st.m16.boomOff) continue; cb(o); }
}

// ---------- the leg (GWS_LEG), for each part ----------
var C16_LOOK = { match: { fog: '#5a4a5e', far: 1400, amb: [0.86, 0.5] }, tow: { fog: '#2b3440', far: 95, amb: [0.5, 0.26] }, rook: { fog: '#252d38', far: 110, amb: [0.46, 0.24] } };
function m16Leg(k) {
  const L = C16_LOOK[k], st = k === 'match' ? [C16.PC[0] - 70, C16.PC[1]] : k === 'tow' ? [C16.PC[0] - 2, m16Y1() - 46] : [C16.MOOR[0] + 30, C16.MOOR[1] - 70];
  GWS_LEG = { key: 'cp_m16' + k, m16: k, n: 1, seed: 0xc16, start: st, h0: k === 'match' ? Math.PI / 2 : k === 'tow' ? 0 : -0.3, mark: C16.PC.slice(), isleR: 10, markIn: -1, rocks: 0, fog: k === 'match' ? 600 : L.far, maren: false, plim: false,
    look: 'shingle', ground: FPS_ISLES.shingle ? FPS_ISLES.shingle.ground : '#555', ground2: FPS_ISLES.shingle ? FPS_ISLES.shingle.ground2 : '#444', sea: null, amb: L.amb.slice(),
    spawnOk: () => false, prog: () => 0,
    enter: S => { S.B.sail = k === 'match' ? 0.15 : 0.3; S.B.v = 3 + S.B.sail * 12; S.V = Object.assign({}, S.B); },
    sunk: () => cpFail(k === 'match' ? 'The cutter went down in the Harbour Pool' : 'The cutter went down in the fog'),
    line: (S, dm) => m16Line(S), row: () => m16Row(), markLab: () => m16MarkLab(),
    b3: (SG, G) => m16Build(SG, G, k), f3: (dt, V) => m16F3(dt, V, k) };
  GWS_LEG.sea = m16SeaOf(k); GWS_LEG.rocks = GWS_LEG.sea.rocks.length;
  FPS_ISLES.cpm16sea.fog = [L.fog, Math.round(L.far * 0.2), Math.round(L.far)];
  return GWS_LEG;
}
FPS_ISLES.cpm16sea = Object.assign({}, FPS_ISLES.gwsail, { name: 'the Harbour Pool', fog: ['#5a4a5e', 300, 1400], sky: '150,110,130', skyA: 0.08 });
FPI_GEN.cpm16sea = FPI_GEN.gwsail;
var C16_MAP = Object.assign({}, GWS_MAP, { isle: 'cpm16sea' });

// ---------- the sea's frame and the deck's ----------
const m16V = () => { const S = RAID.st; return S.V || S.B; };
// a point of the sea's, about the island's middle (the deck's frame), as her pose has it now
function m16Loc(x, y, V) { V = V || m16V(); if (!V) return [0, 0]; const c = Math.cos(V.h), s = Math.sin(V.h), dx = x - V.x, dy = y - V.y; return [dx * c - dy * s, dx * s + dy * c]; }
function m16Wd(x, y, V) { const [u, v] = m16Loc(x, y, V); return [FPSC.CX + u, FPSC.CY + v]; }
// a point in the world (the deck's frame), in the sea's
function m16SeaAt(wx, wy, V) { V = V || m16V(); const c = Math.cos(V.h), s = Math.sin(V.h), u = wx - FPSC.CX, v = wy - FPSC.CY; return [V.x + u * c + v * s, V.y - u * s + v * c]; }
// how fast she turns (as gwsSail turns her), radians a second
function m16Turn(B) { const b = gwsBrig(); return B.rudder * 0.55 * b.turn * (0.35 + 0.65 * Math.min(1, B.v / 10)); }

// ---------- the ball ----------
function m16Ball(x, y) { return { x, y, z: C16.FLOAT, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, moor: 0, tow: 0 }; }
// (everyone) its flight, the water, the stones; hosting, the ships too
function m16BallStep(b, dt, host) {
  const R = C16.R, M = RAID.st.m16;
  if (b.moor) { const [mx, my] = C16.MOOR; b.vx = (mx - b.x) * 2; b.vy = (my - b.y) * 2; b.z = C16.FLOAT; b.vz = 0; }
  // (out at the Hound: the set of the tide round the old spar takes a slow buoy in and holds it, so it settles)
  else if (M && M.ph !== 'count' && C16_PH.indexOf(M.ph) > 3 && !b.tow) { const [mx, my] = C16.MOOR, dx = mx - b.x, dy = my - b.y, d = Math.hypot(dx, dy); if (d < C16.MOOR_R * 1.8) { const k = Math.exp(-dt * 1.4); b.vx = b.vx * k + dx * 0.5 * dt; b.vy = b.vy * k + dy * 0.5 * dt; } }
  if (b.z > C16.FLOAT + 0.05 || b.vz > 0) { b.vz -= C16.GRAV * dt; const k = Math.exp(-dt * 0.08); b.vx *= k; b.vy *= k; }
  else { const k = Math.exp(-dt * 0.32); b.vx *= k; b.vy *= k; b.vz = 0; b.z = C16.FLOAT; }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.z < C16.FLOAT) { b.z = C16.FLOAT; if (b.vz < -3) { if (b.vz < -9 && host) m16Ev('splash', [Math.round(b.x), Math.round(b.y)]); b.vz = -b.vz * 0.42; } else b.vz = 0; }
  if (b.z > 60) { b.z = 60; b.vz = -Math.abs(b.vz) * 0.5; }
  // the walls, the posts, the rocks, the lighthouses' rocks: high enough that it never goes over
  m16Solid(b.x, b.y, R + 2, o => { const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy), rr = R + o.r; if (d >= rr || d < 1e-4) return; const nx = dx / d, ny = dy / d; b.x = o.x + nx * rr; b.y = o.y + ny * rr; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { const e = o.post ? 0.8 : 0.72; b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; if (host && -vn > 7) m16Ev(o.post ? 'post' : 'wall', Math.round(Math.min(1, -vn / 40) * 100)); } });
  if (host) {
    const S = RAID.st; if (S.B) m16BallCutter(b, S.B);
    for (const N of (M && M.ships) || []) if (N && !N.gone) m16BallShip(b, N);
  }
  const sp = Math.hypot(b.vx, b.vy); if (sp > C16.VMAX) { b.vx *= C16.VMAX / sp; b.vy *= C16.VMAX / sp; }
  if (sp > 0.01) { b.rx += b.vy * dt / R; b.ry += b.vx * dt / R; }
}
// (hosting) the cutter strikes it: the nearest point of her keel, her beam round it, her speed there (her way, the
// Gale, and her swing as she turns), and a little more, so a clean hit flies; she never notices it
function m16BallCutter(b, B) {
  const R = C16.R, sh = Math.sin(B.h), ch = Math.cos(B.h), ox = b.x - B.x, oy = b.y - B.y, t = clamp(ox * sh + oy * ch, GWS.STERN + 0.3, GWS.BOW - 0.3);
  if (b.z - R > 4.5) return;
  const cx = B.x + sh * t, cy = B.y + ch * t, dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), rr = R + Math.max(0.6, gwsHw(t)) + 0.15;
  if (d >= rr || d < 1e-4) return;
  const nx = dx / d, ny = dy / d; b.x = cx + nx * rr; b.y = cy + ny * rr;
  const M = RAID.st.m16, gv = M && M.galeT > 0 ? C16.GALE_V : 0, V = B.v + gv, w = m16Turn(B), svx = sh * V + ch * w * t, svy = ch * V - sh * w * t;
  const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny; if (vn >= 0) return;
  const mb = 0.35, J = -(1 + 0.55) * vn / (1 / mb + 1 / 1.6), push = Math.max(0, svx * nx + svy * ny) * C16.HIT;
  b.vx += nx * (J / mb + push); b.vy += ny * (J / mb + push);
  const hard = -vn; if (hard > 10) b.vz = Math.max(b.vz, Math.min(24, (hard - 10) * 0.45 + (gv ? 4 : 0)));
  if (M) { M.lastHit = 'blue'; M.lastHitT = RAID.t; if (hard > 3) m16Ev('hit', Math.round(Math.min(1, hard / 45) * 100)); }
}
// (hosting) one of the other ships strikes it
function m16BallShip(b, N) {
  const R = C16.R, sh = Math.sin(N.h), ch = Math.cos(N.h), ox = b.x - N.x, oy = b.y - N.y, t = clamp(ox * sh + oy * ch, -N.L, N.L);
  if (b.z - R > 4.5) return;
  const cx = N.x + sh * t, cy = N.y + ch * t, dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), r = N.R * (1 - 0.45 * Math.max(0, t / N.L)), rr = R + r;
  if (d >= rr || d < 1e-4) return;
  const nx = dx / d, ny = dy / d; b.x = cx + nx * rr; b.y = cy + ny * rr;
  const V = N.v + (N.gale > 0 ? 12 : 0), svx = sh * V + N.px + ch * N.w * t, svy = ch * V + N.py - sh * N.w * t;
  const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny; if (vn >= 0) return;
  const mb = 0.35, J = -(1 + 0.55) * vn / (1 / mb + 1 / N.m), push = Math.max(0, svx * nx + svy * ny) * C16.HIT;
  b.vx += nx * (J / mb + push); b.vy += ny * (J / mb + push);
  const hard = -vn; if (hard > 10) b.vz = Math.max(b.vz, Math.min(22, (hard - 10) * 0.4));
  const M = RAID.st.m16; if (M) { M.lastHit = N.k; M.lastHitT = RAID.t; if (hard > 3) m16Ev('hit', Math.round(Math.min(1, hard / 45) * 70)); }
}

// ---------- the other ships (the Patience; the Rook): a hull, a helm, way on her ----------
// { k, x, y, h, v, w (her swing), px, py (a knock), L (half her length), R (her beam), m (her weight), gale }
function m16Ship(k, x, y, h, D) { return { k, x, y, h, v: 2, w: 0, px: 0, py: 0, L: D.L, R: D.R, m: D.m, turn: D.turn, gale: 0, galeCd: 6, stuckT: 0, backT: 0, lx: x, ly: y, gone: 0 }; }
// her hull as three circles along her
const m16ShipPts = N => { const sh = Math.sin(N.h), ch = Math.cos(N.h); return [[N.x + sh * N.L * 0.62, N.y + ch * N.L * 0.62, N.R * 0.78], [N.x, N.y, N.R], [N.x - sh * N.L * 0.62, N.y - ch * N.L * 0.62, N.R * 0.92]]; };
// (hosting) sail her: steer -1..1 and the way she wants; then the stones
function m16ShipStep(N, steer, vWant, dt) {
  N.v += (vWant - N.v) * Math.min(1, dt * 1.6);
  if (N.gale > 0) N.gale -= dt;
  N.w = clamp(steer, -1, 1) * N.turn * (0.35 + 0.65 * Math.min(1, Math.abs(N.v) / 10)) * (N.v < 0 ? -1 : 1);
  N.h = wrapPi(N.h + N.w * dt);
  const V = N.v + (N.gale > 0 ? 12 : 0);
  N.x += (Math.sin(N.h) * V + N.px) * dt; N.y += (Math.cos(N.h) * V + N.py) * dt;
  const k = Math.exp(-dt * 2.2); N.px *= k; N.py *= k;
  for (const p of m16ShipPts(N)) m16Solid(p[0], p[1], p[2] + 1, o => {
    const dx = p[0] - o.x, dy = p[1] - o.y, d = Math.hypot(dx, dy), rr = p[2] + o.r; if (d >= rr || d < 1e-4) return;
    const nx = dx / d, ny = dy / d, pen = rr - d; N.x += nx * pen; N.y += ny * pen; p[0] += nx * pen; p[1] += ny * pen;
    const ux = Math.sin(N.h) * V + N.px, uy = Math.cos(N.h) * V + N.py, vn = ux * nx + uy * ny;
    if (vn < -0.5) { N.v = N.v >= 0 ? Math.max(2, N.v + vn * 0.5) : Math.min(-2, N.v - vn * 0.5); N.px += nx * -vn * 0.3; N.py += ny * -vn * 0.3; const tx = -ny, ty = nx, al = ux * tx + uy * ty; if (V > 0) N.h = wrapPi(N.h + angDiff(bearingOf(al >= 0 ? tx : -tx, al >= 0 ? ty : -ty), N.h) * 0.25); }
  });
}
// (hosting) the cutter and another ship: she's shouldered off, never the cutter slowed; if she's pinned (a wall
// behind her) the cutter's put clear instead, her speed as it was. The closing speed each way, for a ram.
function m16ShipVsCutter(N, B) {
  let ram = 0, rammed = 0, at = null;
  const pts = gwsHullPts(B), np = m16ShipPts(N), M = RAID.st.m16, gv = M && M.galeT > 0 ? C16.GALE_V : 0;
  for (const p of pts) for (const q of np) {
    const dx = q[0] - p.x, dy = q[1] - p.y, d = Math.hypot(dx, dy), rr = p.w + q[2]; if (d >= rr || d < 1e-4) continue;
    const nx = dx / d, ny = dy / d, pen = rr - d;
    N.x += nx * pen; N.y += ny * pen; q[0] += nx * pen; q[1] += ny * pen;
    const cv = (B.v + gv), cvx = Math.sin(B.h) * cv, cvy = Math.cos(B.h) * cv, NV = N.v + (N.gale > 0 ? 12 : 0), nvx = Math.sin(N.h) * NV + N.px, nvy = Math.cos(N.h) * NV + N.py;
    const into = cvx * nx + cvy * ny, back = -(nvx * nx + nvy * ny), rel = into + back;
    if (rel > 0) { const J = rel * 1.1 / (N.m * 0.9); N.px += nx * J; N.py += ny * J; N.v *= 0.7; }
    if (into > ram) { ram = into; at = { off: (p.x - B.x) * Math.sin(B.h) + (p.y - B.y) * Math.cos(B.h), side: -Math.sign(angDiff(bearingOf(q[0] - B.x, q[1] - B.y), B.h)) || 1 }; }
    if (back > rammed) { rammed = back; at = { off: (p.x - B.x) * Math.sin(B.h) + (p.y - B.y) * Math.cos(B.h), side: -Math.sign(angDiff(bearingOf(q[0] - B.x, q[1] - B.y), B.h)) || 1 }; }
  }
  // (pinned: still in her after she's been put back against the stones)
  for (const p of pts) for (const q of m16ShipPts(N)) { const dx = p.x - q[0], dy = p.y - q[1], d = Math.hypot(dx, dy), rr = p.w + q[2]; if (d < rr && d > 1e-4) { B.x += dx / d * (rr - d) * 0.5; B.y += dy / d * (rr - d) * 0.5; } }
  return { ram, rammed, at };
}

// ---------- the Gale in a bottle, and the gale buoys ----------
// (hosting) let it go: a burst, if there's enough in the cask
function m16GaleGo(sid) {
  const M = RAID.st.m16; if (!M || !M.galeOn || M.galeT > 0 || ZM.over) return;
  if (M.gale < C16.GALE_COST) { if (sid === FPS.me.id) { zmSound('no'); fpsFeed('The cask is nearly empty: fill it at a yellow gale buoy.'); } return; }
  M.gale -= C16.GALE_COST; M.galeT = C16.GALE_T; M.galeN = (M.galeN | 0) + 1; M.galeBy = sid || '';
  m16GaleFx(M);
}
function m16GaleFx(M) { m16Snd('gale'); M.galeFx = g.t; if (M.galeBy && M.galeBy !== FPS.me.id) fpsFeed(`${m16Nick(M.galeBy)} let the Gale go.`); }
// (hosting, each tick) the burst driving her on, on top of her own way (never in place of it); the gale buoys
function m16GaleTick(dt) {
  const S = RAID.st, M = S.m16, B = S.B; if (!M || !B || S.ph === 'sunk') return;
  if (M.galeT > 0) { M.galeT = Math.max(0, M.galeT - dt); const d = C16.GALE_V * dt, n = Math.max(1, Math.ceil(d / 1.5)); for (let i = 0; i < n; i++) { B.x += Math.sin(B.h) * d / n; B.y += Math.cos(B.h) * d / n; if (gwsCollide(B)) break; } }
  if (!M.pads || !M.galeOn) return;
  C16_PADS.forEach((P, i) => { if (M.pads[i] > 0) { M.pads[i] = Math.max(0, M.pads[i] - dt); return; } if (M.gale >= C16.GALE_MAX - 1) return;
    for (const p of gwsHullPts(B)) if (Math.hypot(P.x - p.x, P.y - p.y) < p.w + (P.big ? 5 : 3.5)) { M.gale = Math.min(C16.GALE_MAX, M.gale + P.amt); M.pads[i] = P.back; m16Ev('pad', i); break; } });
}
// (everyone) joined: the burst on this screen's pose too, from the host's word, so she doesn't lag behind it
function m16GaleMe(dt) {
  const S = RAID.st, M = S.m16; if (!M || ZM.net !== 'client' || !(M.galeT > 0)) return;
  M.galeT = Math.max(0, M.galeT - dt); const d = C16.GALE_V * dt;
  for (const P of [S.V, S.G]) if (P) { P.x += Math.sin(P.h) * d; P.y += Math.cos(P.h) * d; }
}

// ---------- events in the host's word (sounds and sights on every screen) ----------
function m16Ev(k, a) { const M = RAID.st.m16; if (!M || ZM.net === 'client') return; M.ev.push([++M.evN, k, a == null ? 0 : a]); if (M.ev.length > 10) M.ev.shift(); m16EvHere(k, a); }
function m16EvHere(k, a) {
  const M = RAID.st.m16;
  if (k === 'hit') m16Snd('hit', (a | 0) / 100);
  else if (k === 'wall' || k === 'post') m16Snd(k, (a | 0) / 100);
  else if (k === 'splash') m16Snd('splash');
  else if (k === 'pad') { if (M) M.padFx = [a | 0, g.t]; m16Snd('pad'); }
  else if (k === 'goal') { if (M) M.goalFx = [a | 0, g.t]; m16Snd('goal'); setTimeout(() => m16Snd('cheer'), 300); }
  else if (k === 'go') m16Snd('go');
  else if (k === 'tick') m16Snd('tick');
  else if (k === 'ram') { m16Snd('ram', (a | 0) / 100); FPS.hurtT = Math.max(FPS.hurtT || 0, 0.2); RAID.st.jolt = 1; if (typeof padRumble === 'function') padRumble(0.7, 0.4, 220); }
  else if (typeof m16EvMore === 'function') m16EvMore(k, a);   // (the later parts' own: src/cpm16y.js)
}
function m16EvApply(M, ev) { if (!Array.isArray(ev)) return; if (M.evSeen < 0) { M.evSeen = 0; for (const e of ev) M.evSeen = Math.max(M.evSeen, e[0] | 0); return; } for (const e of ev) { if (!Array.isArray(e) || (e[0] | 0) <= M.evSeen) continue; M.evSeen = e[0] | 0; m16EvHere(String(e[1]), e[2]); } }
// sounds: each its recording where there's one, else a stand-in made here
function m16Snd(k, v) {
  v = v == null ? 1 : v;
  const play = (n, vol) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, { vol: vol, vary: 0.06 }); } catch (e) { return false; } };
  const syn = f => { try { if (!soundOff() && AUD.ctx) f(); } catch (e) {} };
  const lg = (n, vv) => syn(() => { if (typeof lgSnd === 'function') lgSnd(n, vv); });
  if (k === 'hit') { if (play('buoyknock', 0.5 + 0.5 * v)) return; lg('hit', v); return; }
  if (k === 'wall') { lg('wall', v); return; }
  if (k === 'post') { lg('post', v); return; }
  if (k === 'splash') { lg('splash', 1); return; }
  if (k === 'pad') { if (play('galebuoy', 0.8)) return; lg('pad', 1); return; }
  if (k === 'goal') { if (play('poolgoal', 0.9)) return; try { if (!soundOff()) sfxBell(); } catch (e) {} syn(() => { if (typeof sfxHorn === 'function') sfxHorn(0, 0.7); for (const [f, d] of [[523, 0.2], [659, 0.45], [784, 0.7]]) tone(f, 'sine', 0.02, 0.04, 1.2, { delay: d }); }); return; }
  if (k === 'go') { lg('go'); return; }
  if (k === 'tick') { lg('tick'); return; }
  if (k === 'gale') { if (play('galecask', 0.9)) return; syn(() => { noise('bandpass', 700, 0.6, 0.05, 0.22, 1.4, { to: 1800 }); noise('highpass', 2400, 1, 0.02, 0.06, 0.9); tone(220, 'sine', 0.02, 0.05, 0.6, { to: 440 }); }); return; }
  if (k === 'ram') { if (play('shipstrike', 0.5 + 0.5 * v)) return; syn(() => { noise('lowpass', 260, 1, 0.005, 0.5 * v + 0.2, 0.8, { to: 70 }); tone(60, 'sine', 0.01, 0.3, 0.7, { to: 35 }); }); return; }
  if (k === 'cheer') { if (play('poolcheer', 0.7)) return; syn(() => { for (let i = 0; i < 4; i++) noise('bandpass', 900 + i * 300, 1.2, 0.2, 0.05, 1.6, { delay: i * 0.08 }); }); return; }
  if (k === 'rocket') { if (play('flare', 0.8)) return; try { if (!soundOff()) sfxFlare(); } catch (e) {} return; }
  if (typeof m16SndMore === 'function') m16SndMore(k, v, play, syn);
}

// ---------- the HUD ----------
// a marker over something on the water (the sea's x, y, h above the water): a ring, its label and its distance; held
// at the edge of the screen when it's behind you
function m16Marker(x, y, h, label, col, phone, mono) {
  const V = m16V(); if (!V || ZM.over || cpCineOn()) return;
  const [wx, wy] = m16Wd(x, y, V), Z = h, m = FPS.me, c = cam(wx, wy, Z), d = Math.hypot(wx - m.x, wy - m.y);
  let px, py, edge = false;
  if (c.f > 0.3) { const p = proj(c); px = p.x; py = p.y; } else { px = c.r >= 0 ? W - 30 : 30; py = H * 0.5; edge = true; }
  const mg = 30; if (px < mg || px > W - mg || py < mg + 40 || py > H - mg - 60) edge = true;
  px = clamp(px, mg, W - mg); py = clamp(py, mg + 40, H - mg - 60);
  const s = (phone ? 7 : 9) * (1 + 0.12 * Math.sin(g.t * 4));
  ctx.save(); ctx.translate(px, py); ctx.strokeStyle = col || 'rgba(255,216,138,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.283); ctx.stroke(); ctx.fillStyle = col || 'rgba(255,216,138,0.9)'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 6.283); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(255,236,190,0.95)';
  ctx.fillText((label ? label.toUpperCase() + ' · ' : '') + Math.round(d) + ' M' + (edge ? (c.r >= 0 ? ' ›' : ' ‹') : ''), 0, s + 4);
  ctx.restore();
}
function m16Line(S) {
  const M = S.m16; if (!M) return '';
  if (S.ph === 'sunk') return 'She’s going down.';
  const ph = M.ph;
  if (ph === 'count') return `Back on your marks · ${Math.max(1, Math.ceil(M.phT))}`;
  if (ph === 'play') return `The match: knock the buoy into Orange’s goal (east) · first to ${M.need}`;
  if (ph === 'goal') return M.lastGoal === 0 ? 'Goal to Blue! The bell, and Orange’s light flashing' : 'Goal to Orange. Back to your marks';
  if (ph === 'won') return 'Blue has the match!';
  if (typeof m16LineMore === 'function') return m16LineMore(S, M);
  return '';
}
function m16Row() {
  const M = RAID.st.m16 || { gale: 0 }, k = clamp(M.gale / C16.GALE_MAX, 0, 1), bars = Math.round(k * 10);
  return ['GALE', `${'■'.repeat(bars)}${'·'.repeat(10 - bars)} ${M.galeT > 0 ? 'BLOWING' : M.gale >= C16.GALE_COST ? 'CASK AFT · SHIFT' : 'EMPTY'}`, M.galeT > 0 ? '#fff0b0' : M.gale >= C16.GALE_COST ? '#ffd860' : 'rgba(236,228,207,0.5)'];
}
function m16MarkLab() { const M = RAID.st.m16, V = m16V(); if (!M || !V) return ''; const mk = gwsMark(); return `${M.markN || 'THE BUOY'} ${Math.round(Math.hypot(mk[0] - V.x, mk[1] - V.y))} m`; }
// the score, under the bearing strip
function m16ScoreHud(phone, mono, fell) {
  const M = RAID.st.m16; if (!M || ZM.over || cpCineOn()) return;
  const y = phone ? 40 : 46, w = phone ? 190 : 240, hh = phone ? 30 : 34, my = y + (phone ? 11 : 13);   // (between the stage banner and the compass)
  ctx.fillStyle = 'rgba(6,10,20,0.62)'; ctx.fillRect(cx - w / 2, y, w, hh);
  ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 16 : 20);
  ctx.textAlign = 'right'; ctx.fillStyle = '#7cc0ff'; ctx.fillText(`Blue ${M.score[0]}`, cx - 12, my);
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffa060'; ctx.fillText(`${M.score[1]} Orange`, cx + 12, my);
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,228,207,0.6)'; ctx.fillText('·', cx, my);
  ctx.font = mono(phone ? 7 : 9); ctx.fillStyle = 'rgba(236,228,207,0.6)'; ctx.fillText(`FIRST TO ${M.need} · ${raidClock(M.clock || 0)}`, cx, y + hh - (phone ? 6 : 7));
  if (M.ph === 'count' && M.phT > 0 && M.phT <= C16.COUNT) { ctx.font = fell(phone ? 44 : 72); ctx.fillStyle = '#ffe2a8'; ctx.fillText(String(Math.max(1, Math.ceil(M.phT))), cx, H * 0.36); }
  ctx.textBaseline = 'alphabetic';
}

// ---------- the Gale cask on the deck (Use at it), and the Shift key at the wheel ----------
function m16Consider(c) { const S = RAID.st, M = S.m16; if (!M || !M.galeOn) return; const [x, y] = gwsW(C16.CASK[0], C16.CASK[1] - 0.2); c({ k: 'm16gale' }, x, y, GWS.D, C16.CASK_R, false); }
function m16Prompt(o) { if (o.k !== 'm16gale') return null; const M = RAID.st.m16 || { gale: 0 }; return M.galeT > 0 ? { text: 'The Gale is blowing' } : M.gale >= C16.GALE_COST ? { text: 'Let the Gale out of its bottle', free: true } : { text: 'The Gale cask is empty: fill it at a yellow gale buoy' }; }
function m16Use(o) { if (o.k !== 'm16gale') return false; raidAsk('m16gale'); return true; }
function m16GaleKeys() {
  const S = RAID.st, M = S.m16; if (!M) return;
  if (!M.galeOn || !FPS.helm || cpCineOn()) { M.shiftW = false; return; }
  const k = !!(FPS.keys.ShiftLeft || FPS.keys.ShiftRight || FPS.keys.KeyG || FPS.padRun);
  if (k && !M.shiftW) raidAsk('m16gale');
  M.shiftW = k; if (FPS.padRun) FPS.padRun = false;
}
// (the cask: in the way, as gwsail's deck gear is)
function m16Block(x, y, pad) { const [u, v] = gwsL(x, y); return Math.hypot(u - C16.CASK[0], v - C16.CASK[1]) < 0.45 + (pad || 0); }
// (every part's hooks that sit on top of gwsail's)
function m16Hooks(o) {
  return Object.assign({}, RAID_STAGES.gwsail, {
    map: C16_MAP, gws: true,
    q(sid, k, a) { if (k === 'm16gale') { m16GaleGo(sid); return; } if (o.qq && o.qq(sid, k, a)) return; gwsQ(sid, k, a); },
    block(x, y, pad, feet) { return RAID_STAGES.gwsail.block(x, y, pad, feet) || m16Block(x, y, pad); },
    consider(c) { gwsConsider(c); m16Consider(c); },
    prompt(o2) { return m16Prompt(o2) || gwsPrompt(o2); },
    use(o2) { return m16Use(o2) || gwsUse(o2); },
    b3(grp) { gws3dBuild(grp); m16Deck3d(); },
    f3(dt) { gws3d(dt); },
    exit() { m16Exit(); },
  }, o);
}

// ---------- I. The Match ----------
function m16MatchFresh() {
  return { ph: 'count', phT: C16.COUNT + 1.5, score: [0, 0], need: C16.GOALS, ball: m16Ball(C16.PC[0], C16.PC[1]), gale: 60, galeT: 0, galeN: 0, galeBy: '', galeOn: 1, pads: C16_PADS.map(() => 0),
    ships: [m16Ship('patience', C16.PC[0] + 70, C16.PC[1], -Math.PI / 2, C16.BRIG)], ev: [], evN: 0, evSeen: -1, clock: 0, sinceBlue: 0, lastGoal: -1, lastHit: '', lastHitT: -9, t: 0, cn: 0, markN: 'THE BUOY', boomOff: 0 };
}
// (hosting) everyone and the ball back on their marks, for a count of three
function m16Kickoff(M) {
  const S = RAID.st, B = S.B;
  M.ph = 'count'; M.phT = C16.COUNT; M.cn = 0;
  Object.assign(M.ball, m16Ball(C16.PC[0], C16.PC[1]));
  B.x = C16.PC[0] - 70; B.y = C16.PC[1]; B.h = Math.PI / 2; B.rudder = 0;
  const N = M.ships[0]; Object.assign(N, { x: C16.PC[0] + 70, y: C16.PC[1], h: -Math.PI / 2, v: 2, px: 0, py: 0, gale: 0, stuckT: 0, backT: 0 });
}
// (hosting) Orange's brig: the bot. She lines up behind the ball on the line to Blue's goal (west) and drives through
// it; she keeps clear of the ball's wrong side; she backs off a wall she's stuck on; now and then she lets her own Gale go.
function m16Bot(N, M, dt, goal) {
  const b = M.ball, gx = goal ? goal[0] : m16X0() - C16.GD * 0.5, gy = goal ? goal[1] : C16.PC[1];
  let ux = gx - b.x, uy = gy - b.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  const behind = (b.x - N.x) * ux + (b.y - N.y) * uy, lat = Math.abs((b.x - N.x) * -uy + (b.y - N.y) * ux);
  let tx, ty, vw;
  // (her pace: steady, a little quicker with more of you aboard, easing off when Blue's gone long without a goal)
  const ease = goal ? 0.8 : clamp(1 - Math.max(0, M.sinceBlue - 50) / 120, 0.66, 1) * (M.score[0] > M.score[1] ? 1.06 : M.score[1] > M.score[0] ? 0.88 : 1) * (1 + 0.04 * (m16N() - 1));
  const vFast = 15 * ease, vSlow = 8 * ease;
  if (behind > C16.R + N.L * 0.4 && lat < C16.R + 3) { tx = b.x + ux * 4; ty = b.y + uy * 4; vw = vFast; if (!goal && N.galeCd <= 0 && behind < 60 && Math.random() < dt * 0.6) { N.gale = 1.2; N.galeCd = 11 + Math.random() * 6; } }
  else {
    // (round behind it: a point back along the line, swung wide of the ball if she's on its far side)
    const back = C16.R + N.L + 10; tx = b.x - ux * back; ty = b.y - uy * back;
    if (behind < 0) { const sx = -uy, sy = ux, sd = Math.sign((N.x - b.x) * sx + (N.y - b.y) * sy) || 1; tx += sx * sd * (C16.R + N.R + 14); ty += sy * sd * (C16.R + N.R + 14); }
    vw = Math.hypot(tx - N.x, ty - N.y) > 40 ? vFast : vSlow;
  }
  // (kept inside the pool, in the match)
  if (!goal) { tx = clamp(tx, m16X0() + 14, m16X1() - 14); ty = clamp(ty, m16Y0() + 14, m16Y1() - 14); }
  if (N.galeCd > 0) N.galeCd -= dt;
  m16Helm(N, tx, ty, vw, dt);
}
// (hosting) steer for (tx, ty) at vw; stuck on something, astern a moment with the helm hard over
function m16Helm(N, tx, ty, vw, dt) {
  const mv = Math.hypot(N.x - N.lx, N.y - N.ly); N.lx = N.x; N.ly = N.y;
  if (N.backT > 0) { N.backT -= dt; m16ShipStep(N, N.backS || 1, -7, dt); return; }
  if (mv < 1.2 * dt && vw > 5) { N.stuckT += dt; if (N.stuckT > 1.6) { N.stuckT = 0; N.backT = 1.4; N.backS = Math.random() < 0.5 ? -1 : 1; } } else N.stuckT = Math.max(0, N.stuckT - dt);
  const want = bearingOf(tx - N.x, ty - N.y), err = angDiff(want, N.h);
  m16ShipStep(N, clamp(err * 2.2, -1, 1), vw * (Math.abs(err) > 1.6 ? 0.55 : 1), dt);
}
cpStage('m16match', m16Hooks({
  n: 'The Match',
  banner: () => ({ text: 'The Match', t: 4.5, sub: 'Part I · Blue against Orange, in the Harbour Pool', col: '#ffd88a' }),
  music: () => { const M = RAID.st.m16; return M && M.ph === 'won' ? 'cpm16eve' : 'cpm16match'; },
  prep() { m16Leg('match'); },
  enter() {
    if (!GWS_LEG) m16Leg('match');
    RAID_STAGES.gwsail.enter();
    RAID.st.m16 = m16MatchFresh();
    if (ZM.net !== 'client') { cpObjective(''); cpWaypoint(null); }
    ZM.banner = this.banner();
    fpsFeed('The keeper’s cutter, Blue’s ship, on her mark in the Harbour Pool. Take the wheel (Use) and knock the buoy into Orange’s goal.');
  },
  tick(dt) {
    const S = RAID.st, M = S.m16, B = S.B; if (!M || !B) return;
    gwsTick(dt); m16GaleTick(dt);
    M.t += dt;
    if (M.t > 1.5) cpaOnce('a1', 'holm', 'Take the wheel. Put her shoulder to the buoy and knock it into Orange’s goal.', 'cp_m16_06');
    if (M.t > 12) cpaOnce('a2', 'holm', 'That cask aft is the Gale in a bottle. Let it go when she’s lined up, and fill it again at the yellow buoys.', 'cp_m16_07');
    if (M.ph === 'count') {
      M.phT -= dt; B.x = C16.PC[0] - 70; B.y = C16.PC[1]; B.h = Math.PI / 2;
      const N = M.ships[0]; N.x = C16.PC[0] + 70; N.y = C16.PC[1]; N.h = -Math.PI / 2; N.v = 2;
      const n = Math.ceil(M.phT); if (n !== M.cn && n <= C16.COUNT && n > 0) { M.cn = n; m16Ev('tick'); }
      if (M.phT <= 0) { M.ph = 'play'; m16Ev('go'); }
      return;
    }
    if (M.ph === 'play') { M.clock += dt; M.sinceBlue += dt; }
    const step = Math.min(dt, 0.05), n = Math.max(1, Math.ceil(step / (1 / 90)));
    for (let k = 0; k < n; k++) {
      const h = step / n, N = M.ships[0];
      if (M.ph === 'play' || M.ph === 'goal') { m16Bot(N, M, h); const r = m16ShipVsCutter(N, B); if (r.ram > 9 && !(M.bumpT > 0)) { M.bumpT = 0.8; m16Ev('ram', Math.round(Math.min(1, r.ram / 30) * 60)); } }
      m16BallStep(M.ball, h, true);
    }
    if (M.bumpT > 0) M.bumpT -= dt;
    // a goal: the whole ball over the line, in the mouth
    if (M.ph === 'play') {
      const b = M.ball, inMouth = Math.abs(b.y - C16.PC[1]) < C16.GW / 2;
      if (inMouth && b.x > m16X1() + C16.R) m16Goal(M, 0); else if (inMouth && b.x < m16X0() - C16.R) m16Goal(M, 1);
    } else if (M.ph === 'goal') { M.phT -= dt; if (M.phT <= 0) m16Kickoff(M); }
    else if (M.ph === 'won') { M.phT -= dt; if (M.phT <= 0 && !M.doneSent) { M.doneSent = 1; cpDone(); } }
    // a word from the wall now and then
    if (M.score[0] >= 2) { cpaOnce('f1', 'maren', 'Holm! There’s fog standing off the harbour mouth. Thick as wool.', 'cp_m16_10'); if (!M.f1T) M.f1T = M.t; if (M.t - M.f1T > 7) cpaOnce('f2', 'holm', 'Fog on a summer’s evening. Play on. It’ll not come in before dark.', 'cp_m16_11'); }
    if (M.ph === 'play' && M.score[0] === M.need - 1 && M.t - (M.goalAt || 0) > 16) cpaOnce('bellout', 'maren', 'There’s a ship’s bell out in the fog. Someone’s coming in.', 'cp_m16_16');
  },
  pack(o) { gwsPack(o); m16PackCommon(o); const M = RAID.st.m16; if (M) o.m16m = [M.score[0], M.score[1], M.need, Math.round(M.clock), M.lastGoal]; },
  apply(o) { gwsApply(o); m16ApplyCommon(o); const M = RAID.st.m16, a = o.m16m; if (M && Array.isArray(a)) { M.score = [a[0] | 0, a[1] | 0]; M.need = a[2] | 0 || C16.GOALS; M.clock = +a[3] || 0; M.lastGoal = a[4] | 0; } },
  me(dt) { gwsMe(dt); m16GaleMe(dt); m16GaleKeys(); m16MeCommon(dt); },
  hud(phone, mono, fell) { gwsHud(phone, mono, fell); const M = RAID.st.m16; if (!M) return; m16ScoreHud(phone, mono, fell); if (M.ph === 'play') m16Marker(M.ball.x, M.ball.y, 9, 'The buoy', null, phone, mono); },
}));
// (hosting) a goal: the bell, the light behind it flashing, and both crews back to their marks
function m16Goal(M, team) {
  M.score[team]++; M.ph = 'goal'; M.phT = C16.CELEB; M.lastGoal = team; M.goalAt = M.t;
  m16Ev('goal', team);
  if (team === 0) {
    M.sinceBlue = 0;
    if (M.score[0] >= M.need) { M.ph = 'won'; M.phT = 2.4; cpaBan('Blue has the match', `${M.score[0]} to ${M.score[1]}`, '#9fd0ff'); return; }
    if (M.score[0] === 1) cpaOnce('g1', 'holm', 'In it goes! One to Blue.', 'cp_m16_09');
    else if (M.score[0] === 2) cpaOnce('g2', 'dunn', 'Two? The Patience is only warming her timbers.', 'cp_m16_12');
    if (M.score[0] === M.need - 1) setTimeout(() => { if (RAID.st.m16 === M && !ZM.over) cpaOnce('mp', 'holm', 'One more and it’s ours. Line her up.', 'cp_m16_15'); }, 3600);
  } else {
    if (M.score[1] === 1) cpaOnce('o1', 'dunn', 'One to Orange! Shall I lend you a chart of your own pool, keeper?', 'cp_m16_08');
    if (M.score[1] >= M.need && M.need >= 4) fpsFeed(`Orange has ${M.score[1]}. Dunn waves it off: play on till Blue has ${M.need}, it’s a summer evening.`);
    else if (M.score[1] >= M.need) {
      M.need++;
      if (cpaOnce('o3', 'dunn', 'That’s three to Orange! Call it the best of seven, keeper, if your crew has the stomach.', 'cp_m16_13')) setTimeout(() => { if (RAID.st.m16 === M && !ZM.over) cpaOnce('o4', 'holm', 'We have. Best of seven.', 'cp_m16_14'); }, 5200);
      else fpsFeed(`Orange has ${M.score[1]}: the match goes on, first to ${M.need}.`);
    }
  }
}
// ---------- the word: what every part shares (the ball, the Gale, the pads, the ships, the events) ----------
function m16PackCommon(o) {
  const M = RAID.st.m16; if (!M) return;
  const r1 = v => Math.round(v * 10) / 10, b = M.ball;
  o.m16 = [C16_PH.indexOf(M.ph), r1(M.phT), r1(b.x), r1(b.y), r1(b.z), r1(b.vx), r1(b.vy), r1(b.vz), b.moor | 0, Math.round(M.gale), r1(M.galeT), M.galeN | 0, M.galeBy || '', (M.pads || []).reduce((a, t, i) => a | (t > 0 ? 1 << i : 0), 0), M.boomOff | 0, b.tow | 0, M.galeOn | 0];
  o.m16s = (M.ships || []).map(N => N ? [r1(N.x), r1(N.y), Math.round(N.h * 1000) / 1000, r1(N.v), Math.round(N.w * 1000) / 1000, N.gale > 0 ? 1 : 0, N.gone | 0] : 0);
  o.m16e = M.ev;
}
function m16ApplyCommon(o) {
  const M = RAID.st.m16; if (!M) return;
  const a = o.m16;
  if (Array.isArray(a)) {
    M.ph = C16_PH[a[0] | 0] || M.ph; M.phT = +a[1] || 0;
    const b = M.ball, tx = +a[2], ty = +a[3], e = Math.hypot(tx - b.x, ty - b.y);
    if (e > 6) { b.x = tx; b.y = ty; } else { b.x += (tx - b.x) * 0.5; b.y += (ty - b.y) * 0.5; }
    b.z = +a[4] || C16.FLOAT; b.vx = +a[5] || 0; b.vy = +a[6] || 0; b.vz = +a[7] || 0; b.moor = a[8] | 0;
    M.gale = +a[9] || 0; const gn = a[11] | 0; if (gn > (M.galeN | 0)) { M.galeBy = String(a[12] || ''); M.galeT = +a[10] || 0; if (M.galeSeen) m16GaleFx(M); } M.galeN = gn; M.galeSeen = 1;
    const pm = a[13] | 0; M.pads = C16_PADS.map((P, i) => (pm >> i) & 1 ? 1 : 0);
    M.boomOff = a[14] | 0; b.tow = a[15] | 0; M.galeOn = a[16] | 0;
  }
  if (Array.isArray(o.m16s)) o.m16s.forEach((s, i) => { if (!Array.isArray(s)) return; const N = M.ships[i] || (M.ships[i] = m16Ship(i ? 'rook' : 'patience', +s[0], +s[1], +s[2], i ? C16.ROOK : C16.BRIG)); const tx = +s[0], ty = +s[1]; if (Math.hypot(tx - N.x, ty - N.y) > 8) { N.x = tx; N.y = ty; } else { N.x += (tx - N.x) * 0.5; N.y += (ty - N.y) * 0.5; } N.h = wrapPi(N.h + angDiff(+s[2] || 0, N.h) * 0.6); N.v = +s[3] || 0; N.w = +s[4] || 0; N.gale = s[5] ? 0.3 : 0; N.gone = s[6] | 0; });
  m16EvApply(M, o.m16e);
}
// (everyone) joined: the ball and the ships run on between the host's words
function m16MeCommon(dt) {
  const M = RAID.st.m16; if (!M) return;
  // (the bearing strip's mark: what matters now: the buoy, the Rook while she's afloat, the Hound once it's on the chain)
  if (GWS_LEG && GWS_LEG.m16) { const R = M.ships && M.ships[1], rk = R && !R.gone && (M.ph === 'rook' || M.ph === 'slip'); GWS_LEG.mark = rk ? [R.x, R.y] : M.ball.moor ? C16.MOOR.slice() : [M.ball.x, M.ball.y]; M.markN = rk ? 'THE ROOK' : M.ball.moor ? 'THE HOUND' : 'THE BUOY'; }
  if (ZM.net !== 'client') return;
  if (M.ph === 'count') return;
  const step = Math.min(dt, 0.05), n = Math.max(1, Math.ceil(step / (1 / 60)));
  for (let k = 0; k < n; k++) m16BallStep(M.ball, step / n, false);
  for (const N of M.ships || []) if (N && !N.gone) { const V = N.v + (N.gale > 0 ? 12 : 0); N.h = wrapPi(N.h + N.w * dt); N.x += Math.sin(N.h) * V * dt; N.y += Math.cos(N.h) * V * dt; }
}
function m16Exit() { gwsExit(); GWS_LEG = null; cpaNightOff(); try { if (typeof GL3D !== 'undefined' && GL3D.scene) { GL3D.scene.fog = null; if (GL3D.amb) GL3D.amb.color.setRGB(1, 1, 1); } } catch (e) {} if (typeof m16x3dExit === 'function') m16x3dExit(); }

cpMission({ id: 'm16', o: 'm03b', side: true, act: 2, n: 'The Harbour Pool', when: 'c. 1885', where: 'The Harbour Pool, under the cliffs by the harbour',
  blurb: 'A summer evening’s match in the Harbour Pool, Blue against Orange, the keeper’s cutter against the Patience. Then the fog comes in, the Hound’s marker is gone, and the packet is due.',
  stages: ['cp_m16match', 'cp_m16tow', 'cp_m16rook'], intro: 'm16_intro', outro: 'm16_outro', after: { 0: 'm16_turn', 1: 'm16_rook' },
  music: { default: 'cpm16match' }, lives: 2,
  stop() { GWS_LEG = null; cpaNightOff(); },
});
