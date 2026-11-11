// Wreckers' Night: the island itself.
//
// Each round the island is the next of three (Pilchard Row, the Bonded Quay, the Flensing Yard; the other six are
// still here, for ?isle=... and the Lighthouse's builder), picked from the round number, and everything on it is
// laid out from the round's seed, so every player builds the very same island without anything being
// sent over the network:
//  - the Shingle Skerry: grey shingle, tide pools, upturned boats, lobster pots, a fish-drying rack,
//    the remains of a bonfire still glowing, driftwood and cairns
//  - Wreckers' Reef: dark wet rock and weed, several broken hulks, timbers, spilled cargo, old cannon,
//    an anchor and a salvage fire
//  - Chapel Islet: turf, a roofless chapel with a tall gable and a lantern on the altar, a graveyard
//    inside a low broken wall, headstones and a cross, a well, a ring of standing stones, dead trees
//  - Smugglers' Cove: sand, a jetty out into the sea, a boathouse, stacks of crates and barrels,
//    lantern posts, upturned boats, nets drying
//  - Signal Head: heather, crags along one shore with a stair cut up them, a ruined round signal
//    tower with its beacon lit, drystone field walls, standing stones, a sheep fence
//  - the Salt Marsh: mud and pools, reed beds, boardwalks, a fowler's hut, eel traps, peat stacks,
//    fences, a punt, and marsh lights over the water
//  - Pilchard Row: two cottages facing across a lane, gardens behind, a lugger beached across the street
//  - the Bonded Quay: a small walled customs yard packed with a grid of cargo stacks, a crane in the middle
//  - the Flensing Yard: a derelict whaling station's fenced yard on the sand, oil tanks, pipes on trestles, sheds,
//    the try-works, and a timber lookout in the middle whose stair and platform are floors you can stand on
// and on the first six, two or three more buildings (cottages, huts, sheds, some roofless) for cover
// Props are made of simple solids (boxes and upright cylinders). The same solids block walking
// (fpsBlocked), stop shots (fpsRay) and hide the painted figures behind them (the occluders that
// gl3dClip uses), so cover works exactly as it does behind rocks. Some solids only block walking
// (fences you can shoot through) or only stop shots (a roof overhead).
// After laying out, a flood fill from the middle finds every place you can walk to; respawns and the
// wreckers' wanderings only use those, and props are thinned out if less than 60% is left walkable.
// The 3D island (fpsIsle3D, called from syncIsland in gl3d.js) is merged into a handful of meshes:
// the ground, all solid props, glowing bits, water, marks on the ground, and the foam at the shore.
// The Classic renderer draws each solid as a flat-shaded block (fpsIsleDrawSolid).

const FPI_FORCE = (() => { try { const m = location.search.match(/[?&]isle=(\w+)/); return m ? m[1] : null; } catch (e) { return null; } })();
// the rotation: every round is the next of these three, in turn (the other six islands are still laid out for
// ?isle=..., and by the Lighthouse, which builds its station with the same builder)
const FPS_ISLE_ORDER = ['quay', 'row', 'yard'];
// ground colours are laid over the sea's own (so the island still belongs to its sea); rocks: [count, min r, max r, height]
const FPS_ISLES = {
  shingle: { name: 'the Shingle Skerry', ground: '#a29e94', ground2: '#76736c', wet: '#3c3f44', path: '#6a665e', tint: 0.3, mound: 0.16, dune: 0.07,
    rocks: [12, 3, 8, 1], wrecks: [1, 8, 10], tintRock: null, sky: '150,165,195', skyA: 0.08, fog: ['#141a24', 200, 1700], mist: '60,72,92', mistA: 0.10, birds: ['gull', 7], tufts: ['#5e6a48', 30], pebbles: 300, pools: 10, wrack: 70 },
  reef: { name: "Wreckers' Reef", ground: '#7c8486', ground2: '#4e6450', wet: '#2c3236', path: '#5a5e5c', tint: 0.28, mound: -0.12, dune: 0.1,
    rocks: [9, 3, 7, 1.25], wrecks: [5, 6, 11], tintRock: ['#2e3a34', 0.35], sky: '90,125,140', skyA: 0.1, fog: ['#0f171c', 150, 1300], mist: '50,70,80', mistA: 0.14, birds: ['gull', 9], tufts: ['#3e5a3a', 0], pebbles: 140, pools: 12, wrack: 110 },
  chapel: { name: 'Chapel Islet', ground: '#6e8e54', ground2: '#4c6238', wet: '#34362e', path: '#6a5e48', tint: 0.32, mound: 0.22, dune: 0.05,
    rocks: [6, 2.5, 5, 0.7], wrecks: [0], tintRock: ['#4a5a40', 0.25], sky: '120,150,125', skyA: 0.08, fog: ['#121a14', 130, 1100], mist: '60,80,66', mistA: 0.16, birds: ['bat', 7], tufts: ['#4e6a38', 260], pebbles: 40, pools: 0, wrack: 20 },
  cove: { name: "Smugglers' Cove", ground: '#c4ac80', ground2: '#9a8560', wet: '#4e4638', path: '#7a6a50', tint: 0.28, mound: -0.18, dune: 0.12,
    rocks: [8, 3, 7, 1], wrecks: [1, 7, 9], tintRock: ['#6a5a44', 0.2], sky: '180,140,110', skyA: 0.07, fog: ['#1c1714', 170, 1500], mist: '90,78,66', mistA: 0.10, birds: ['gull', 5], tufts: ['#7a7a4a', 50], pebbles: 90, pools: 3, wrack: 60 },
  cliff: { name: 'Signal Head', ground: '#8a7a5c', ground2: '#5e7048', wet: '#3a3630', path: '#6e6450', tint: 0.3, mound: 0.24, dune: 0.06,
    rocks: [7, 3, 6, 1], wrecks: [0], tintRock: null, sky: '140,160,205', skyA: 0.1, fog: ['#10141c', 220, 1900], mist: '70,80,100', mistA: 0.08, birds: ['gull', 5], tufts: ['#6a5a44', 300], pebbles: 80, pools: 0, wrack: 10 },
  marsh: { name: 'the Salt Marsh', ground: '#7e7c4c', ground2: '#565a34', wet: '#2a2c22', path: '#5a5238', tint: 0.34, mound: -0.1, dune: 0.05,
    rocks: [4, 2, 4, 0.6], wrecks: [0], tintRock: ['#4a4a30', 0.3], sky: '130,150,100', skyA: 0.12, fog: ['#141810', 80, 760], mist: '70,80,60', mistA: 0.24, birds: ['bat', 8], tufts: ['#6a7040', 120], pebbles: 20, pools: 14, wrack: 0 },
};
// the two built-up stages: Pilchard Row (two cottages facing each other across a lane, gardens behind, a boat
// beached on its side in the middle of the street) and the Bonded Quay (a small walled customs yard packed with a
// grid of cargo stacks: close, quick and loud)
Object.assign(FPS_ISLES, {
  row: { name: 'Pilchard Row', ground: '#8e8a7c', ground2: '#6c6a5e', wet: '#3c3f44', path: '#5e5a50', tint: 0.3, mound: 0.04, dune: 0.03,
    rocks: [0, 3, 6, 1], wrecks: [0], tintRock: null, sky: '160,150,170', skyA: 0.07, fog: ['#15161e', 180, 1500], mist: '70,70,86', mistA: 0.09, birds: ['gull', 6], tufts: ['#5a6a44', 80], pebbles: 120, pools: 0, wrack: 50 },
  quay: { name: 'the Bonded Quay', ground: '#6e6a62', ground2: '#56534c', wet: '#33363a', path: '#5c5852', tint: 0.36, mound: 0, dune: 0.01,
    rocks: [0, 3, 6, 1], wrecks: [0], tintRock: null, sky: '150,140,120', skyA: 0.08, fog: ['#16140f', 160, 1300], mist: '80,72,60', mistA: 0.1, birds: ['gull', 4], tufts: ['#4a5038', 0], pebbles: 30, pools: 0, wrack: 40, arena: true },
  // the Flensing Yard: a derelict whaling station's fenced yard on a spit of sand, a climbable lookout in the middle
  // (floors: the stair and the platform can be stood on, src/fps.js fpsMove)
  yard: { name: 'the Flensing Yard', ground: '#bca57a', ground2: '#9a8660', wet: '#4e4638', path: '#7a6a50', tint: 0.3, mound: 0, dune: 0.05,
    rocks: [0, 3, 6, 1], wrecks: [0], tintRock: null, sky: '175,140,110', skyA: 0.08, fog: ['#1c1714', 170, 1500], mist: '90,78,66', mistA: 0.1, birds: ['gull', 6], tufts: ['#7a7a4a', 40], pebbles: 60, pools: 0, wrack: 30, arena: true, floors: true, keep: true },
});
function fpsIsleFor(round) {
  if (FPI_FORCE && FPS_ISLES[FPI_FORCE]) return FPI_FORCE;
  // (shifted one every six rounds, so each map comes round in every one of the six seas in turn)
  const n = FPS_ISLE_ORDER.length, k = (round | 0) + Math.floor((round | 0) / 6);
  return FPS_ISLE_ORDER[((k % n) + n) % n];
}
const FPI_C = {
  stone: '#62645f', stone2: '#4e504c', stone3: '#73716a', moss: '#3e4c30', wood: '#4a3a2b', wood2: '#5e4a34', wood3: '#35281d', drift: '#7c7464',
  iron: '#2e3034', rope: '#7a6a4c', straw: '#7a6a42', turf: '#3c4a2c', fish: '#9ca8ac', net: '#48524a', tar: '#16130f', brass: '#8a6a2c',
  peat: '#3a2a1c', bone: '#a8a08a', paint: ['#34465a', '#6a3428', '#2e4434', '#6a6252', '#5a4a6a'],
};

// ---------- small helpers ----------
function fpiHash(a, b) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function fpiNoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = fpiHash(xi + s, yi), b = fpiHash(xi + 1 + s, yi), c = fpiHash(xi + s, yi + 1), d = fpiHash(xi + 1 + s, yi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
// the 3D ground's height above the flat plane people walk on (gentle: never more than a quarter metre)
function fpsIsleH(I, x, y) {
  if (!I) return 0;
  const T = I.T, d = Math.hypot(x - FPSC.CX, y - FPSC.CY) / FPSC.R;
  let h = T.mound * (1 - Math.min(1, d * d * 1.3)) + T.dune * (fpiNoise(x / 13, y / 13, I.seed) * 2 - 1) + T.dune * 0.5 * (fpiNoise(x / 6, y / 6, I.seed + 31) * 2 - 1);
  h *= clamp((1 - d) * FPSC.R / 9, 0, 1);
  return clamp(h, -0.25, 0.25);
}
// a solid's distance from a point (negative inside)
function fpiDist(s, x, y) {
  const dx = x - s.x, dy = y - s.y;
  if (s.s === 'c') return Math.hypot(dx, dy) - s.r;
  const c = Math.cos(s.ang), n = Math.sin(s.ang), u = Math.abs(dx * c + dy * n) - s.hw, v = Math.abs(-dx * n + dy * c) - s.hd;
  return u > 0 || v > 0 ? Math.hypot(Math.max(u, 0), Math.max(v, 0)) : Math.max(u, v);
}
// solids, placed in a prop's own frame (u along its angle, v across it); heights are above the ground
function fpiBox(p, u, v, hw, hd, top, o) {
  const c = Math.cos(p.ang), s = Math.sin(p.ang);
  const b = Object.assign({ s: 'b', x: p.x + u * c - v * s, y: p.y + u * s + v * c, ang: p.ang, hw, hd, z1: FPSC.GROUND + top, br: Math.hypot(hw, hd), p }, o || {});
  if (o && o.ra) b.ang = p.ang + o.ra;
  if (o && o.z0 != null) b.z0 = FPSC.GROUND + o.z0;
  return b;
}
function fpiCirc(p, u, v, r, top, o) {
  const c = Math.cos(p.ang), s = Math.sin(p.ang);
  return Object.assign({ s: 'c', x: p.x + u * c - v * s, y: p.y + u * s + v * c, ang: 0, r, z1: FPSC.GROUND + top, br: r, p }, o || {});
}

// ---------- laying out the island ----------
// (id: lay out that one instead of the round's; the Lighthouse, src/zombies.js, uses this)
function fpsIsleGen(G, round, rng, id) {
  id = id || fpsIsleFor(round); const T = FPS_ISLES[id];
  const CX = FPSC.CX, CY = FPSC.CY, IR = FPSC.R, TAU = Math.PI * 2;
  const R = (a, b) => a + rng() * (b - a), RI = (a, b) => Math.floor(R(a, b + 0.999)), pick = a => a[Math.floor(rng() * a.length)];
  const I = { id, T, name: T.name, seed: (round * 7919) & 0xfffff, props: [], solids: [], decor: [], lights: [], tracks: [], birds: [], key: id + ':' + round, floors: !!T.floors };
  G.isle = I;
  const rocks = G.rocks = [], wrecks = G.wrecks = [];
  const polar = (a, d) => [CX + Math.cos(a) * d, CY + Math.sin(a) * d];
  const inside = (x, y, r) => Math.hypot(x - CX, y - CY) < IR - r - 3;
  // nothing within (r + gap) of a point: rocks, wrecks and every solid placed so far
  const clear = (x, y, r, gap) => {
    for (const o of rocks) if (Math.hypot(o.x - x, o.y - y) < o.r + r + gap) return false;
    for (const o of wrecks) if (Math.hypot(o.x - x, o.y - y) < o.r * 0.8 + r + gap) return false;
    for (const s of I.solids) if (s.mv !== false && fpiDist(s, x, y) < r + gap) return false;
    return true;
  };
  const spot = (r, dmin, dmax, gap, tries) => {
    for (let i = 0; i < (tries || 150); i++) {
      const a = R(0, TAU), d = Math.sqrt(R((dmin / IR) ** 2, (Math.min(dmax, IR) / IR) ** 2)) * IR, [x, y] = polar(a, d);
      if (inside(x, y, r) && clear(x, y, r, gap == null ? 2.6 : gap)) return [x, y];
    }
    return null;
  };
  const near = (x0, y0, r, dmin, dmax, gap, tries) => {
    for (let i = 0; i < (tries || 60); i++) {
      const a = R(0, TAU), d = R(dmin, dmax), x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d;
      if (inside(x, y, r) && clear(x, y, r, gap == null ? 2.6 : gap)) return [x, y];
    }
    return null;
  };
  const put = (k, x, y, ang, o, opt) => {
    const p = Object.assign({ k, x, y, ang, sd: Math.floor(rng() * 1e6) }, o || {});
    p.opt = !!opt;
    const K = FPI_K[k];
    if (K.gen) K.gen(p, rng);
    p.sol = K.sol ? K.sol(p) : [];
    for (const s of p.sol) if (!s.col) s.col = K.col || FPI_C.stone;
    // (lift: the prop stands on a floor that high, as in the Lighthouse's tower; everything about it goes up)
    if (p.lift) for (const s of p.sol) { s.z1 += p.lift; s.z0 = (s.z0 != null ? s.z0 : FPSC.GROUND) + p.lift; }
    I.props.push(p); for (const s of p.sol) I.solids.push(s);
    return p;
  };
  // a straight wall from (x0, y0) to (x1, y1), less any gaps (as fractions along it)
  const wall = (x0, y0, x1, y1, o, gaps) => {
    const L = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), cuts = [0];
    for (const [a, b] of (gaps || []).slice().sort((p, q) => p[0] - q[0])) cuts.push(a, b);
    cuts.push(1);
    const out = [];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1], len = (b - a) * L; if (len < 0.6) continue;
      const m = (a + b) / 2;
      out.push(put('wall', x0 + (x1 - x0) * m, y0 + (y1 - y0) * m, ang, Object.assign({ len, th: 0.7, hh: 1.1, jag: 0, mat: 'stone' }, o), o && o.opt));
    }
    return out;
  };
  const light = (x, y, z, c, r, k) => I.lights.push({ x, y, z: FPSC.GROUND + z, c, r, k, ph: rng() * 6.28 });
  const decor = (k, x, y, o) => { const d = Object.assign({ k, x, y, ang: rng() * TAU, sd: Math.floor(rng() * 1e6) }, o || {}); I.decor.push(d); return d; };
  const track = pts => { if (pts.length > 1) I.tracks.push(pts); };
  const H = { R, RI, pick, rng, polar, inside, clear, spot, near, put, wall, light, decor, track, rocks, wrecks, I, CX, CY, IR, TAU };
  const GEN = FPI_GEN[id];
  // the set piece first (the chapel, the tower, the boathouse), then the hulks, then the rocks, then everything else
  if (GEN.set) GEN.set(H);
  for (let t = 0; wrecks.length < T.wrecks[0] && t < 600; t++) {
    const r = R(T.wrecks[1], T.wrecks[2]), at = spot(r * 0.8, 20, IR - 22, 5, 1);
    if (!at) continue;
    wrecks.push({ x: at[0], y: at[1], r, ang: R(0, TAU), lean: R(-1, 1), name: 'a wreck', ribs: RI(4, 7) });
  }
  const tint = T.tintRock;
  for (let t = 0; rocks.length < T.rocks[0] + (H.extraRocks || 0) && t < 2000; t++) {
    const r = R(T.rocks[1], T.rocks[2]), at = spot(r, 0, IR - 10, 5, 1);
    if (!at) continue;
    const prof = []; for (let i = 0; i < 7; i++) prof.push(R(0.35, 1)); prof[0] = R(0.15, 0.45); prof[6] = R(0.15, 0.45);
    rocks.push({ x: at[0], y: at[1], r, prof, ph: R(0, 6.28), rk: { h: T.rocks[3], tint } });
  }
  if (GEN.props) GEN.props(H);
  if (!GEN.built) fpiExtraCover(H);
  if (T.arena) I.arena = true;
  // (indoors, nothing of the shore: the building's own decor instead)
  if (T.indoor) { if (GEN.decor) GEN.decor(H); } else fpiCommonDecor(H);
  if (id === 'marsh') fpiMarshDecor(H);
  // shadows under things, and a few tracks across the island
  fpiFinish(G, H);
  return I;
}

// what every island has: wet stones at the shore, pebbles, grass, seaweed on the tideline, tide pools, tracks
function fpiCommonDecor(H) {
  const { R, rng, polar, I, IR, TAU } = H, T = I.T;
  const free = (x, y, r) => { for (const s of I.solids) if (fpiDist(s, x, y) < r) return false; for (const o of H.rocks) if (Math.hypot(o.x - x, o.y - y) < o.r + r) return false; return true; };
  for (let i = 0; i < 46; i++) { const a = R(0, TAU), [x, y] = polar(a, IR + R(-2, 3)); H.decor('wetstone', x, y, { s: R(0.25, 0.75) }); }
  for (let i = 0; i < T.wrack; i++) { const a = R(0, TAU), [x, y] = polar(a, IR + R(-4.5, -0.5)); H.decor('wrack', x, y, { s: R(0.5, 1.4), ang: a + Math.PI / 2 + R(-0.6, 0.6) }); }
  for (let i = 0, n = 0; i < T.pools * 6 && n < T.pools; i++) {
    const big = I.id === 'marsh', rx = big ? R(2.5, 6) : R(0.9, 2.4), ry = rx * R(0.5, 0.9), a = R(0, TAU), [x, y] = polar(a, Math.sqrt(R(big ? 0.02 : 0.3, 0.92)) * (IR - 5));
    if (!free(x, y, rx + 0.4) || I.decor.some(d => d.k === 'pool' && Math.hypot(d.x - x, d.y - y) < d.rx + rx + 2)) continue;
    H.decor('pool', x, y, { rx, ry }); n++;
  }
  for (let i = 0; i < T.pebbles; i++) { const [x, y] = polar(R(0, TAU), Math.sqrt(rng()) * (IR - 1)); if (free(x, y, 0.2)) H.decor('pebble', x, y, { s: R(0.08, 0.32) }); }
  for (let i = 0; i < T.tufts[1]; i++) { const [x, y] = polar(R(0, TAU), Math.sqrt(R(0, 0.95)) * (IR - 3)); if (free(x, y, 0.3) && !I.decor.some(d => d.k === 'pool' && Math.hypot(d.x - x, d.y - y) < d.rx)) H.decor('tuft', x, y, { s: R(0.6, 1.3), c: T.tufts[0] }); }
  // wanderings: from the middle down to the shore, here and there
  for (let k = 0; k < 2; k++) {
    let a = R(0, TAU), d = R(0, 15); const pts = [];
    for (let i = 0; i < 14 && d < IR - 4; i++) { pts.push(polar(a, d)); a += R(-0.12, 0.12); d += R(4, 7); }
    H.track(pts);
  }
}
function fpiFinish(G, H) {
  const I = H.I;
  // footprints along the tracks, side by side, a stride apart
  for (const pts of I.tracks) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
      for (let t = 0, k = 0; t < L; t += 0.75, k++) {
        const x = x0 + (x1 - x0) * t / L, y = y0 + (y1 - y0) * t / L, side = k % 2 ? 0.16 : -0.16;
        const px = x - Math.sin(ang) * side, py = y + Math.cos(ang) * side;
        if (Math.hypot(px - FPSC.CX, py - FPSC.CY) > FPSC.R - 1) continue;
        if (I.solids.some(s => s.mv !== false && fpiDist(s, px, py) < 0.15)) continue;
        I.decor.push({ k: 'print', x: px, y: py, ang: ang + H.R(-0.15, 0.15) });
      }
    }
  }
  fpiIndex(I);
  // can you walk everywhere? Thin out the extras until at least 60% of the island is reachable
  // (not in the Flensing Yard: its fence shuts out most of the island on purpose, and it keeps its barrels)
  for (let it = 0; it < 12 && !I.T.indoor; it++) {
    if (I.T.keep) { fpiReach(G); break; }
    fpiReach(G);
    if (I.reach.nReach >= I.reach.nDisc * 0.6) break;
    const extra = I.props.filter(p => p.opt);
    if (!extra.length) break;
    for (const p of extra.slice(-4)) fpiDrop(I, p);
    fpiIndex(I);
  }
  // birds: gulls wheel over the shore, bats flit round the lights
  const [kind, n] = I.T.birds;
  for (let i = 0; i < n; i++) {
    const L = kind === 'bat' && I.lights.length ? I.lights[i % I.lights.length] : null;
    const [cx, cy] = L ? [L.x, L.y] : H.polar(H.R(0, H.TAU), H.R(20, FPSC.R + 20));
    I.birds.push({ k: kind, cx, cy, rad: L ? H.R(2.5, 6) : H.R(10, 30), z: L ? L.z + H.R(1, 4) : FPSC.GROUND + H.R(9, 24), sp: (H.rng() < 0.5 ? -1 : 1) * (L ? H.R(0.9, 1.6) : H.R(0.12, 0.3)), ph: H.R(0, 6.28) });
  }
}
function fpiDrop(I, p) {
  I.props = I.props.filter(q => q !== p);
  I.solids = I.solids.filter(s => s.p !== p);
  I.lights = I.lights.filter(l => l.p !== p);
}
// a coarse grid of the solids that block walking, so blocking checks only look at what's close
function fpiIndex(I) {
  const sh = I.sh = new Map(), C = 6;
  for (const s of I.solids) {
    if (s.mv === false) continue;
    const m = s.br + 2.2, i0 = Math.floor((s.x - m) / C), i1 = Math.floor((s.x + m) / C), j0 = Math.floor((s.y - m) / C), j1 = Math.floor((s.y + m) / C);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = i * 65536 + j; let l = sh.get(k); if (!l) sh.set(k, l = []); l.push(s); }
  }
}
// (feet: on an island with floors, the height of the feet over the ground: whatever is lifted clear over your head
// is walked under, and whatever is no higher than your feet is walked over; with climb, so is a floor no more than a
// step above them, to step up onto)
const FPI_STEP = 0.6;
function fpsIsleBlocked(G, x, y, pad, z, feet, climb) {
  const I = G && G.isle; if (!I || !I.sh) return false;
  const l = I.sh.get(Math.floor(x / 6) * 65536 + Math.floor(y / 6)); if (!l) return false;
  for (const s of l) {
    if (z != null && s.z1 < z - 0.15) continue;
    if (feet != null) { const bot = s.z0 != null ? s.z0 - FPSC.GROUND : 0, top = s.z1 - FPSC.GROUND; if (bot >= feet + 1.9 || top <= feet + (climb && s.fl ? FPI_STEP : 0.05)) continue; }
    if (fpiDist(s, x, y) < pad) return true;
  }
  return false;
}
// the height of the floor under a place, for someone standing at feet (the Flensing Yard's stair and lookout)
function fpsIsleFloorAt(G, x, y, feet, pad) {
  const I = G && G.isle; if (!I || !I.sh) return 0;
  const l = I.sh.get(Math.floor(x / 6) * 65536 + Math.floor(y / 6)); if (!l) return 0;
  let fl = 0;
  for (const s of l) {
    if (!s.fl) continue;
    const top = s.z1 - FPSC.GROUND;
    if (top > fl && top <= feet + FPI_STEP && fpiDist(s, x, y) < (pad == null ? 0.22 : pad)) fl = top;
  }
  return fl;
}
// ---------- under a roof ----------
// Indoors is wherever there's a roof or a ceiling over you: solids lifted off the ground (z0 set: a roof, a
// ceiling, the floor above, a stair overhead) higher than the point, covering it and the ground half a metre round
// it on at least three sides (so a lintel over a door, a beam, or a wall standing on the floor above isn't a roof,
// and a floor laid in strips is). The Lighthouse's lantern room, with its dome (only in the 3D scene), is indoors too
// (the map's I.zm.top); the gallery round it is out. So it works for anything built from props with roofs, on any
// island. The weather, the sea's painted shimmer and the outdoor sounds go by it (src/fps.js).
function fpsRoofIndex(I) {
  if (I.roofIx && I.roofIx.src === I.solids && I.roofIx.n === I.solids.length) return I.roofIx.m;
  const m = new Map(), C = 6;
  for (const s of I.solids) {
    if (s.z0 == null) continue;
    const r = s.br + 0.6, i0 = Math.floor((s.x - r) / C), i1 = Math.floor((s.x + r) / C), j0 = Math.floor((s.y - r) / C), j1 = Math.floor((s.y + r) / C);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = i * 65536 + j; let l = m.get(k); if (!l) m.set(k, l = []); l.push(s); }
  }
  I.roofIx = { src: I.solids, n: I.solids.length, m };
  return m;
}
// is there a roof over this point (x, y, z: a world height, as camH is)?
function fpsUnderRoof(G, x, y, z) {
  const I = G && G.isle; if (!I || !I.solids) return false;
  const top = I.zm && I.zm.top;
  if (top && z > FPSC.GROUND + top.z && z < FPSC.GROUND + top.z + 4.4 && Math.hypot(x - top.x, y - top.y) < top.r) return true;
  const l = fpsRoofIndex(I).get(Math.floor(x / 6) * 65536 + Math.floor(y / 6)); if (!l) return false;
  const over = [];
  for (const s of l) if (s.z0 > z && s.z0 < z + 40 && fpiDist(s, x, y) < 0.7) over.push(s);
  if (!over.length) return false;
  const covered = (px, py) => over.some(s => fpiDist(s, px, py) < 0.02);
  if (!covered(x, y)) return false;
  let n = 0, R = 0.5;
  for (const [dx, dy] of [[R, 0], [-R, 0], [0, R], [0, -R]]) if (covered(x + dx, y + dy)) n++;
  return n >= 3;
}
// a flood fill from the middle over a 0.6 m grid: which places can be walked to
function fpiReach(G) {
  const I = G.isle, S = 0.6, N = Math.ceil(FPSC.R * 2 / S) + 2, x0 = FPSC.CX - FPSC.R, y0 = FPSC.CY - FPSC.R;
  const free = new Uint8Array(N * N), grid = new Uint8Array(N * N);
  let nDisc = 0, nFree = 0, start = -1, sd = 1e9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = x0 + i * S, y = y0 + j * S, d = Math.hypot(x - FPSC.CX, y - FPSC.CY);
    if (d > FPSC.R - 1.5) continue;
    nDisc++;
    if (fpsBlockedIn(G, x, y, 0.5, null, I.floors ? 0 : null, false)) continue;
    free[j * N + i] = 1; nFree++;
    if (d < sd) { sd = d; start = j * N + i; }
  }
  let nReach = 0;
  if (start >= 0) {
    const q = [start]; grid[start] = 1;
    while (q.length) {
      const k = q.pop(); nReach++;
      const i = k % N, j = (k - i) / N;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const n = b * N + a; if (free[n] && !grid[n]) { grid[n] = 1; q.push(n); }
      }
    }
  }
  I.reach = { S, N, x0, y0, grid, nDisc, nFree, nReach };
}
// can this place be walked to from the middle of the island?
function fpsReachable(x, y, G) {
  const I = (G || FPS.g).isle, r = I && I.reach; if (!r) return true;
  const i = Math.round((x - r.x0) / r.S), j = Math.round((y - r.y0) / r.S);
  if (i < 0 || j < 0 || i >= r.N || j >= r.N) return false;
  return r.grid[j * r.N + i] === 1;
}
// a random place that can be walked to
function fpsIsleSpot(rand) {
  rand = rand || Math.random;
  for (let i = 0; i < 300; i++) {
    const a = rand() * 6.283, d = Math.sqrt(rand()) * (FPSC.R - 20), x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (fpsReachable(x, y) && !fpsBlocked(x, y, 1)) return [x, y];
  }
  return null;
}
// the first prop a shot runs into, if it's nearer than best.t (heights are checked over the whole crossing,
// so a shot that drops onto the top of a low wall stops there)
function fpsIsleRay(G, x, y, z, sx, sy, tp, best) {
  const I = G && G.isle; if (!I) return best;
  for (const s of I.solids) {
    if (s.ray === false) continue;
    const ox = s.x - x, oy = s.y - y, along = ox * sx + oy * sy;
    if (along < -s.br || along - s.br > best.t) continue;
    const side = ox * sy - oy * sx; if (Math.abs(side) > s.br) continue;
    let t0, t1;
    if (s.s === 'c') { const h = Math.sqrt(s.r * s.r - side * side); t0 = along - h; t1 = along + h; }
    else {
      const c = Math.cos(s.ang), n = Math.sin(s.ang);
      const lx = -(ox * c + oy * n), ly = -(-ox * n + oy * c), dx = sx * c + sy * n, dy = -sx * n + sy * c;
      t0 = -1e9; t1 = 1e9;
      if (Math.abs(dx) < 1e-9) { if (Math.abs(lx) > s.hw) continue; } else { const a = (-s.hw - lx) / dx, b = (s.hw - lx) / dx; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); }
      if (Math.abs(dy) < 1e-9) { if (Math.abs(ly) > s.hd) continue; } else { const a = (-s.hd - ly) / dy, b = (s.hd - ly) / dy; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); }
      if (t0 > t1) continue;
    }
    if (t1 < 0 || t0 > best.t) continue;
    t0 = Math.max(0, t0); t1 = Math.min(t1, best.t);
    const za = z + tp * t0, zb = z + tp * t1, lo = s.z0 != null ? s.z0 : -99;
    let th = null;
    if (za <= s.z1 && za >= lo) th = t0;
    else if (za > s.z1 && zb <= s.z1) th = t0 + (s.z1 - za) / (zb - za) * (t1 - t0);
    else if (za < lo && zb >= lo) th = t0 + (lo - za) / (zb - za) * (t1 - t0);
    if (th != null && th < best.t) best = { t: th, kind: 'prop' };
  }
  return best;
}
// how much the island's own lights (lanterns, fires, marsh lights) light a place
function fpsIsleLightAt(x, y) {
  const I = FPS.g && FPS.g.isle; if (!I) return 0;
  let b = 0;
  for (const l of I.lights) { const d = Math.hypot(l.x - x, l.y - y); if (d < l.r) b = Math.max(b, (1 - d / l.r) * 0.9); }
  return b;
}

// ---------- the kinds of island ----------
// a building: walls with doorways and windows, an inside wall, a pitched roof, a lamp inside.
// In its own frame: u along its length (w), v across (d), the front at v = -d/2.
//   o.doors:   [[side, u], ...]  a doorway (2 m, room to pass) in a side: 'f' front, 'b' back, 'l' left end, 'r' right end
//   o.windows: [[side, u0, u1], ...]  a window: a sill you can shoot over and a lintel above
//   o.inner:   u of a wall across the inside, with a doorway in it
//   o.roof (default true), o.mat 'stone' or 'wood', o.hh wall height, o.lamp (default true), o.opt
function fpiCottage(H, cx, cy, ang, o) {
  const w = o.w, d = o.d, hh = o.hh || 2.7, c = Math.cos(ang), sn = Math.sin(ang), opt = !!o.opt;
  const L = (u, v) => [cx + u * c - v * sn, cy + u * sn + v * c];
  const ww = { mat: o.mat || 'stone', hh, th: 0.45, jag: o.ruin ? 0.3 : 0, cap: !o.ruin && (o.mat || 'stone') === 'stone', opt, dark: o.dark };
  const sides = { f: [[-w / 2, -d / 2], [w / 2, -d / 2]], b: [[-w / 2, d / 2], [w / 2, d / 2]], l: [[-w / 2, -d / 2], [-w / 2, d / 2]], r: [[w / 2, -d / 2], [w / 2, d / 2]] };
  const lens = { f: w, b: w, l: d, r: d };
  const lintel = (u, v, len, alongU, z0) => H.put('block', ...L(u, v), ang + (alongU ? 0 : Math.PI / 2), { w: len, d: 0.47, hh, z0, col: o.mat === 'wood' ? FPI_C.wood3 : FPI_C.stone3 }, opt);
  for (const k of ['f', 'b', 'l', 'r']) {
    const [[u0, v0], [u1, v1]] = sides[k], len = lens[k], gaps = [];
    const along = k === 'f' || k === 'b';
    for (const [sd, u] of o.doors || []) if (sd === k) gaps.push([(u - (along ? u0 : v0)) / len - 1.0 / len, (u - (along ? u0 : v0)) / len + 1.0 / len]);
    for (const [sd, a, b] of o.windows || []) if (sd === k) gaps.push([(a - (along ? u0 : v0)) / len, (b - (along ? u0 : v0)) / len]);
    H.wall(...L(u0, v0), ...L(u1, v1), ww, gaps);
    // over each doorway a lintel; under and over each window, a sill and a lintel
    for (const [sd, u] of o.doors || []) if (sd === k) lintel(along ? u : u0, along ? v0 : u, 2.0, along, 2.15);
    for (const [sd, a, b] of o.windows || []) if (sd === k) {
      const m = (a + b) / 2, len2 = b - a;
      lintel(along ? m : u0, along ? v0 : m, len2, along, 2.0);
      H.put('block', ...L(along ? m : u0, along ? v0 : m), ang + (along ? 0 : Math.PI / 2), { w: len2, d: 0.5, hh: 0.95, col: o.mat === 'wood' ? FPI_C.wood : FPI_C.stone3, trim: FPI_C.wood3 }, opt);
    }
  }
  if (o.inner != null) H.wall(...L(o.inner, -d / 2), ...L(o.inner, d / 2), Object.assign({}, ww, { th: 0.3 }), [[0.5 - 1.0 / d, 0.5 + 1.0 / d]]);
  if (o.roof !== false && !o.ruin) H.put('roof', cx, cy, ang + Math.PI / 2, { w: d + 0.8, d: w + 0.8, z0: hh, rise: o.rise || Math.min(2.2, d * 0.28), mat: o.mat === 'wood' ? 'wood' : (o.thatch ? 'straw' : 'wood') }, opt);
  if (o.lamp !== false) { const [lx, ly] = L(o.inner != null ? (o.inner - w / 2) / 2 : 0, 0); H.light(lx, ly, 2.2, '#ffc070', 7, 'lantern'); }
  return L;
}
// more cover on the open islands: a cottage or two and a shed, some of them roofless ruins
function fpiExtraCover(H) {
  const { R, IR, TAU, rng } = H;
  const n = H.RI(2, 3);
  for (let i = 0; i < n; i++) {
    const big = i === 0, w = big ? R(8, 10) : R(4.5, 6), d = big ? R(5.5, 6.5) : R(3.6, 4.4), at = H.spot(Math.hypot(w, d) / 2 + 1, 12, IR - 18, 4);
    if (!at) continue;
    const ruin = rng() < 0.4, mat = big ? 'stone' : (rng() < 0.6 ? 'wood' : 'stone');
    fpiCottage(H, at[0], at[1], R(0, TAU), { w, d, mat, ruin, opt: true, dark: !big,
      doors: [['f', R(-w / 4, w / 4)]].concat(big ? [['b', R(-w / 3, w / 3)]] : []),
      windows: big ? [['f', w / 4, w / 4 + 1.4], ['r', -0.8, 0.8]] : [['l', -0.6, 0.6]], inner: big && w > 8.5 ? R(-1, 1) : null, lamp: !ruin });
  }
}
// a long stack of cargo (bales and chests under a tarpaulin and lashings), one or two high
function fpiCargo(H, x, y, ang, len, two) {
  return H.put('cargo', x, y, ang, { len, wd: 2.5, hh: two ? 5.0 : 2.5, two, tarp: H.pick(['#4a5a4a', '#5a4a3a', '#3a4a5a', '#6a5a3a', '#5a3a34']) });
}

// helpers for clusters of small things
function fpiCrates(H, x, y, big) {
  const { R, rng } = H, items = [], n = big ? H.RI(3, 5) : H.RI(1, 3), s0 = R(0.85, 1.1);
  const slots = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0]];
  for (let i = 0; i < n; i++) { const [a, b] = slots[i], s = s0 * R(0.85, 1.05); items.push({ u: (a - 0.5) * s0 * 1.05, v: (b - 0.3) * s0 * 1.05, s, h0: 0, ry: R(-0.15, 0.15) }); }
  for (const it of items.slice(0, n)) if (rng() < 0.45) { const s = it.s * R(0.75, 0.95); items.push({ u: it.u + R(-0.1, 0.1), v: it.v + R(-0.1, 0.1), s, h0: it.s, ry: R(-0.4, 0.4), up: it }); }
  return H.put('crates', x, y, R(0, H.TAU), { items }, true);
}
function fpiBarrels(H, x, y) {
  const { R, rng } = H, items = [], n = H.RI(2, 4);
  for (let i = 0; i < n; i++) {
    const a = i / n * H.TAU + R(-0.3, 0.3), d = n > 1 ? 0.62 : 0;
    if (rng() < 0.25) items.push({ u: Math.cos(a) * (d + 0.4), v: Math.sin(a) * (d + 0.4), r: 0.36, hh: 0.95, lie: true, ry: R(0, H.TAU) });
    else items.push({ u: Math.cos(a) * d, v: Math.sin(a) * d, r: R(0.33, 0.38), hh: R(0.85, 1.0) });
  }
  return H.put('barrels', x, y, R(0, H.TAU), { items }, true);
}
function fpiPots(H, x, y) {
  const { R } = H, items = [], n = H.RI(3, 6);
  for (let i = 0; i < n; i++) { const lvl = i < 3 ? 0 : 1, k = lvl ? i - 3 : i; items.push({ u: (k - 1) * 0.72 + (lvl ? 0.36 : 0), v: R(-0.08, 0.08), h0: lvl * 0.5, ry: R(-0.12, 0.12) }); }
  return H.put('pots', x, y, R(0, H.TAU), { items, hw: 1.2, hd: 0.35, top: n > 3 ? 1.0 : 0.5 }, true);
}
function fpiLanternPost(H, x, y, ang) { const p = H.put('post', x, y, ang, { r: 0.13, hh: 2.5, lamp: true }); const [lx, ly] = fpiLocal(p, 0.5, 0); H.light(lx, ly, 2.15, '#ffc070', 9, 'lantern'); H.I.lights[H.I.lights.length - 1].p = p; return p; }
function fpiLocal(p, u, v) { const c = Math.cos(p.ang), s = Math.sin(p.ang); return [p.x + u * c - v * s, p.y + u * s + v * c]; }
function fpiScatter(H, n, r, dmin, dmax, gap, fn) { for (let i = 0; i < n; i++) { const at = H.spot(r, dmin, dmax, gap); if (at) fn(at[0], at[1]); } }

const FPI_GEN = {
  // Pilchard Row: a lane between two fishermen's cottages, their gardens behind them, a lugger beached on its side
  // in the middle of the street, a handcart and barrels, lamps at each end, sheds and a net loft
  row: {
    built: true,
    set(H) {
      const { R, TAU, CX, CY } = H, a = R(0, TAU), c = Math.cos(a), sn = Math.sin(a);
      const L = (u, v) => [CX + u * c - v * sn, CY + u * sn + v * c];
      // the north cottage: front door off the lane, two rooms, windows on the lane and the garden, a back door
      fpiCottage(H, ...L(-1, 11.5), a, { w: 18, d: 8, doors: [['f', -5.5], ['b', 4.5]], windows: [['f', 1, 3.2], ['f', 5, 7], ['b', -6, -3.8], ['r', -1.2, 1.2]], inner: -1, mat: 'stone' });
      // the south cottage, across the lane and further along, its door and windows facing the other's
      fpiCottage(H, ...L(4, -11.5), a + Math.PI, { w: 18, d: 8, doors: [['f', -6], ['b', 3]], windows: [['f', -2.5, -0.3], ['f', 2, 4.2], ['b', -4, -1.8], ['l', -1.2, 1.2]], inner: 1.5, mat: 'stone' });
      // the net loft beside it, timber, open to the lane, and a garden shed behind each house
      fpiCottage(H, ...L(-14.5, -11), a + Math.PI, { w: 7, d: 6, doors: [['f', 1.5], ['f', -1.5]], windows: [['r', -0.8, 0.8]], mat: 'wood', dark: true });
      fpiCottage(H, ...L(-9, 21.5), a, { w: 4.5, d: 3.6, doors: [['r', 0]], mat: 'wood', dark: true, lamp: false });
      fpiCottage(H, ...L(12, -21.5), a, { w: 4.5, d: 3.6, doors: [['l', 0]], mat: 'wood', dark: true, lamp: false });
      // the gardens: drystone walls round the back, gaps to the shore, fences down the sides
      const gw = { hh: 1.1, jag: 0.1, th: 0.6, cap: true };
      H.wall(...L(-12, 26), ...L(14, 26), gw, [[0.42, 0.52]]);
      H.wall(...L(-10, -26), ...L(16, -26), gw, [[0.5, 0.6]]);
      for (const [u, v0, v1] of [[-12, 15.5, 26], [14, 15.5, 26], [-10, -15.5, -26], [16, -15.5, -26]]) { const [x0, y0] = L(u, v0), [x1, y1] = L(u, v1); H.put('fence', (x0 + x1) / 2, (y0 + y1) / 2, a + Math.PI / 2, { len: Math.abs(v1 - v0) }); }
      // the lane: the lugger on its side across the middle (the cover everyone fights over), a handcart, barrels,
      // pots, and a lamp at each end of the row
      H.put('boat', ...L(-1, 0.6), a + Math.PI / 2 + 0.22, { len: 8, beam: 2.4, paint: FPI_C.paint[1] });
      fpiCrates(H, ...L(10.5, 2.5), true);
      fpiBarrels(H, ...L(-12.5, 3));
      fpiPots(H, ...L(17, -4));
      H.put('cart', ...L(7.5, -3.2), a + 0.3, {});
      for (const [u, v] of [[-22, 5], [24, -5]]) fpiLanternPost(H, ...L(u, v), a);
      // the ends of the row: low walls across, with the road out through a gap, and a rock or two beyond
      H.wall(...L(-28, -9), ...L(-28, 9), gw, [[0.4, 0.6]]);
      H.wall(...L(30, -9), ...L(30, 9), gw, [[0.4, 0.6]]);
      for (const [u, v, r] of [[-40, 18, 5], [44, -16, 6], [-38, -22, 4.5], [40, 24, 5], [0, 40, 5], [-4, -40, 5.5]]) {
        const [x, y] = L(u, v), prof = []; for (let k = 0; k < 7; k++) prof.push(R(0.4, 1)); prof[0] = R(0.2, 0.4); prof[6] = R(0.2, 0.4);
        H.rocks.push({ x, y, r, prof, ph: R(0, 6.28), rk: { h: 1, tint: null } });
      }
      H.track([L(-34, 0), L(-8, -2), L(8, 2), L(34, 0)]);
    },
    props(H) {
      const { R, IR, TAU } = H;
      fpiScatter(H, 2, 2.6, IR - 26, IR - 8, 3, (x, y) => H.put('boat', x, y, Math.atan2(y - H.CY, x - H.CX) + R(-0.4, 0.4), { len: R(4.2, 5.2), beam: R(1.5, 1.8), paint: H.pick(FPI_C.paint) }, true));
      fpiScatter(H, 2, 2.4, 40, IR - 12, 3, (x, y) => H.put('rack', x, y, R(0, TAU), { len: R(3.4, 4.4), nets: true }, true));
      fpiScatter(H, 3, 2.5, 40, IR - 6, 3, (x, y) => H.put('log', x, y, R(0, TAU), { len: R(2.4, 4.5), rad: R(0.2, 0.32) }, true));
    },
  },
  // the Bonded Quay: a walled customs yard, its cargo stacked in a grid of long stacks, a crane in the middle
  quay: {
    built: true,
    set(H) {
      const { R, TAU, CX, CY, rng } = H, a = R(0, TAU) * 0 + (Math.floor(R(0, 4)) * Math.PI / 2) + R(-0.3, 0.3), c = Math.cos(a), sn = Math.sin(a);
      const L = (u, v) => [CX + u * c - v * sn, CY + u * sn + v * c];
      const S = 22;   // half the yard's width
      // the walls all round: the warehouses' backs, high, with their doors bricked up
      const ww = { hh: 4.2, jag: 0.04, th: 0.9, mat: 'stone', cap: true };
      H.wall(...L(-S, -S), ...L(S, -S), ww); H.wall(...L(-S, S), ...L(S, S), ww);
      H.wall(...L(-S, -S), ...L(-S, S), ww); H.wall(...L(S, -S), ...L(S, S), ww);
      // the stacks: a four by four grid with the middle four cleared round the crane, each long stack turned against
      // its neighbours; some two high (you go round), some one high (you can shoot over): narrow lanes everywhere
      const cells = [-15.5, -5.2, 5.2, 15.5];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const u = cells[i], v = cells[j];
        if ((i === 1 || i === 2) && (j === 1 || j === 2)) continue;
        if (i === 0 && j === 0) continue;   // (the customs hut's corner)
        const along = (i + j) % 2 === 0, two = rng() < 0.55, [x, y] = L(u + R(-0.6, 0.6), v + R(-0.6, 0.6));
        fpiCargo(H, x, y, a + (along ? 0 : Math.PI / 2) + R(-0.05, 0.05), R(4.8, 5.8), two);
      }
      // and round the crane, a few low bales to duck behind
      for (const [u, v, ra] of [[-5, 0.5, Math.PI / 2], [5, -0.5, Math.PI / 2], [0.5, 5.5, 0], [-0.5, -5.5, 0]]) { const [x, y] = L(u, v); H.put('cargo', x, y, a + ra, { len: 2.6, wd: 1.3, hh: 1.15, tarp: '#4a4a3a' }); }
      // the crane in the middle, on a stone plinth, its jib over the yard and a load hanging
      H.put('crane', ...L(0, 0), a + R(0, TAU), {});
      // the customs hut in one corner, a lamp on each wall, and odds and ends in the lanes
      fpiCottage(H, ...L(-S + 4.2, -S + 3.5), a, { w: 6, d: 4.6, doors: [['b', 1.4]], windows: [['r', -0.8, 0.8], ['b', -2, -0.8]], mat: 'wood', dark: true });
      for (const [u, v] of [[0, -S + 1.4], [0, S - 1.4], [-S + 1.4, 0], [S - 1.4, 0]]) fpiLanternPost(H, ...L(u, v), a);
      for (const [u, v] of [[10.4, 10.4], [-10.4, -10.4], [10.4, -19.5], [-19.5, 10.4], [19.5, 19.5]]) { const [x, y] = L(u + R(-0.5, 0.5), v + R(-0.5, 0.5)); if (H.clear(x, y, 1.0, 0.8)) (rng() < 0.5 ? fpiBarrels(H, x, y) : fpiCrates(H, x, y, false)); }
      H.track([L(-S + 3, -S + 8), L(-6.5, 0), L(6.5, 0), L(S - 3, S - 3)]);
    },
  },
  // the Flensing Yard: a derelict whaling station's yard on a spit of sand, fenced in. In the middle the old lookout,
  // a timber tower you can climb by its stair, with a boarded rail round the top; round it the oil tanks, pipes on
  // trestles (low ones to crouch behind and shoot over, high ones to walk under), the flensing shed, the boiler
  // house, the try-works, a whaleboat on blocks, and the jawbone arch at the gate
  yard: {
    built: true,
    set(H) {
      const { R, CX, CY, rng } = H, a = Math.floor(R(0, 4)) * Math.PI / 2 + R(-0.25, 0.25), c = Math.cos(a), sn = Math.sin(a);
      const L = (u, v) => [CX + u * c - v * sn, CY + u * sn + v * c];
      const S = 27;   // half the yard's width
      // round it: the boiling sheds' stone backs on one side, a timber palisade down two, a fence (you can shoot
      // through it) along the shore side
      H.wall(...L(-S, S), ...L(S, S), { hh: 3.2, jag: 0.05, th: 0.9, mat: 'stone', cap: true });
      for (const u of [-S, S]) H.wall(...L(u, -S), ...L(u, S), { hh: 2.6, jag: 0.08, th: 0.4, mat: 'wood', dark: true });
      { const [x0, y0] = L(-S, -S), [x1, y1] = L(S, -S); H.put('fence', (x0 + x1) / 2, (y0 + y1) / 2, a, { len: 2 * S }); }
      // the lookout in the middle, its stair coming down to the east
      const tw = H.put('tower', ...L(0, 0), a, { top: 4.5, half: 2.4, n: 10, tread: 0.75, sw: 0.8 });
      { const [lx, ly] = fpiLocal(tw, -2.2, -2.2); H.light(lx, ly, 4.5 + 2.1, '#ffc070', 11, 'lantern'); H.I.lights[H.I.lights.length - 1].p = tw; }
      // the oil tanks, and their pipes: low runs along the ground, high ones over the lanes to the tower
      H.put('tank', ...L(-17, 16), a, { r: 3.4, hh: 6 });
      H.put('tank', ...L(16, -17), a, { r: 3.0, hh: 5.2 });
      const pipe = (u0, v0, u1, v1, h, r) => { const [x0, y0] = L(u0, v0), [x1, y1] = L(u1, v1); return H.put('pipe', (x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(y1 - y0, x1 - x0), { len: Math.hypot(x1 - x0, y1 - y0), h, r }); };
      pipe(-13.3, 15.6, -3.5, 15.6, 0.8, 0.36);
      pipe(15.6, -13.8, 15.6, -4.5, 0.75, 0.32);
      pipe(-14.6, 13.6, -2.6, 2.6, 3.5, 0.25);
      pipe(12.4, 11.6, 2.6, 2.6, 3.9, 0.22);
      // the flensing shed (long and timber, open at both ends) and the stone boiler house
      fpiCottage(H, ...L(-15, -15), a, { w: 12, d: 7.5, doors: [['f', -3.5], ['b', 3.5], ['l', 0], ['r', 0]], windows: [['f', 1.5, 3.5], ['b', -4.5, -2.5]], mat: 'wood', dark: true });
      fpiCottage(H, ...L(17, 15.5), a, { w: 8, d: 6, doors: [['f', -1.5], ['l', 0]], windows: [['f', 1.4, 2.8], ['r', -0.8, 0.8]], mat: 'stone' });
      // the try-works (a brick furnace with two great iron pots, still smouldering), the whaleboat, a handcart
      { const p = H.put('trypot', ...L(-8.5, 1.5), a + Math.PI / 2, {}); const [lx, ly] = fpiLocal(p, 0, -1.3); H.light(lx, ly, 0.5, '#ff8a3a', 7, 'fire'); H.I.lights[H.I.lights.length - 1].p = p; }
      H.put('boat', ...L(6.5, -12), a + 0.12, { len: 6.2, beam: 1.9, paint: FPI_C.paint[0], upright: true });
      H.put('cart', ...L(10.5, -4.6), a - 0.25, {});
      // the jawbone arch inside the gate, and a lamp on each side of the yard
      H.put('jawbone', ...L(0, -S + 2.6), a, {});
      for (const [u, v] of [[0, S - 1.4], [-S + 1.2, 2], [S - 1.2, -2], [-4.5, -S + 1.6]]) fpiLanternPost(H, ...L(u, v), a);
      // odds and ends in the lanes: barrels of oil, crates, more barrels
      for (const [u, v] of [[8, 8.5], [-5.5, 9.5], [-21.5, 1], [21.5, 3.5], [4, -21.5], [-22.5, -23], [22.5, -23], [-8, -6]]) { const [x, y] = L(u + R(-0.5, 0.5), v + R(-0.5, 0.5)); if (H.clear(x, y, 1.0, 0.9)) (rng() < 0.6 ? fpiBarrels(H, x, y) : fpiCrates(H, x, y, false)); }
      H.track([L(0, -S + 1), L(0, -6), L(-5, 0)]); H.track([L(-14, -10), L(-4, -3)]); H.track([L(10, 0), L(17, 11)]);
    },
  },
  shingle: {
    props(H) {
      const { R, IR, TAU } = H;
      // boats drawn up near the shore, a lantern on a post beside them
      let boat = null;
      fpiScatter(H, H.RI(2, 3), 2.6, IR - 30, IR - 8, 3, (x, y) => { const a = Math.atan2(y - H.CY, x - H.CX); boat = boat || [x, y, a]; H.put('boat', x, y, a + R(-0.4, 0.4), { len: R(4.2, 5.4), beam: R(1.5, 1.8), paint: H.pick(FPI_C.paint) }, true); });
      if (boat) { const at = H.near(boat[0], boat[1], 0.4, 3.5, 6, 1.5); if (at) fpiLanternPost(H, at[0], at[1], R(0, TAU)); }
      // the bonfire, where someone's been burning wrack
      const f = H.spot(1.4, 10, 45, 4); if (f) { const p = H.put('fire', f[0], f[1], R(0, TAU), {}); H.light(f[0], f[1], 0.5, '#ff8a3a', 10, 'fire'); H.I.lights[H.I.lights.length - 1].p = p; H.track([[f[0], f[1]], ...[1, 2, 3, 4, 5, 6].map(i => H.polar(Math.atan2(f[1] - H.CY, f[0] - H.CX) + i * 0.04, Math.hypot(f[0] - H.CX, f[1] - H.CY) + i * 6))]); }
      fpiScatter(H, 3, 1.4, 20, IR - 10, 2.6, (x, y) => fpiPots(H, x, y));
      fpiScatter(H, 2, 2.4, 15, IR - 12, 2.6, (x, y) => H.put('rack', x, y, R(0, TAU), { len: R(3.2, 4.4) }, true));
      fpiScatter(H, 7, 2.5, 25, IR - 6, 2.6, (x, y) => H.put('log', x, y, R(0, TAU), { len: R(2.4, 5), rad: R(0.2, 0.35) }, true));
      fpiScatter(H, 3, 1, 10, IR - 15, 3, (x, y) => H.put('cairn', x, y, 0, { r: R(0.7, 1), hh: R(1.1, 1.7) }, true));
      fpiScatter(H, 1, 1.2, 10, IR - 20, 2.6, (x, y) => fpiBarrels(H, x, y));
      // an old sheepfold, half fallen
      const s = H.spot(6, 15, 55, 3);
      if (s) { const a = R(0, TAU), [x0, y0] = [s[0] - Math.cos(a) * 5, s[1] - Math.sin(a) * 5], [x1, y1] = [s[0] + Math.cos(a) * 5, s[1] + Math.sin(a) * 5]; H.wall(x0, y0, x1, y1, { hh: 1.15, jag: 0.35, cap: false, opt: true }, [[0.4, 0.62]]); }
    },
  },
  reef: {
    props(H) {
      const { R, IR, TAU, wrecks } = H;
      // timbers and cargo strewn round the hulks
      for (const w of wrecks) {
        for (let i = 0; i < 3; i++) { const at = H.near(w.x, w.y, 2, w.r * 0.8 + 3, w.r * 0.8 + 12, 2.4); if (at) H.put('plank', at[0], at[1], R(0, TAU), { len: R(2.5, 5), w: R(0.35, 0.6) }, true); }
        const c = H.near(w.x, w.y, 1.5, w.r * 0.8 + 4, w.r * 0.8 + 14, 2.6); if (c) (H.rng() < 0.5 ? fpiCrates(H, c[0], c[1], H.rng() < 0.4) : fpiBarrels(H, c[0], c[1]));
      }
      fpiScatter(H, 4, 1.5, 10, IR - 10, 2.6, (x, y) => fpiCrates(H, x, y, H.rng() < 0.3));
      fpiScatter(H, 3, 1.2, 10, IR - 10, 2.6, (x, y) => fpiBarrels(H, x, y));
      fpiScatter(H, 2, 1.6, 10, IR - 10, 2.6, (x, y) => H.put('cannon', x, y, R(0, TAU), { len: R(2.2, 2.8) }, true));
      fpiScatter(H, 1, 1.2, 10, IR - 12, 2.6, (x, y) => H.put('anchor', x, y, R(0, TAU), {}, true));
      fpiScatter(H, 1, 5.5, 10, IR - 14, 2.6, (x, y) => H.put('log', x, y, R(0, TAU), { len: R(9, 12), rad: 0.3, mast: true }, true));
      fpiScatter(H, 5, 2.4, 15, IR - 6, 2.6, (x, y) => H.put('plank', x, y, R(0, TAU), { len: R(2.5, 4.5), w: R(0.35, 0.6) }, true));
      // a salvage fire, and a lantern hung on a spar
      const f = H.spot(1.4, 8, 40, 4); if (f) { const p = H.put('fire', f[0], f[1], R(0, TAU), {}); H.light(f[0], f[1], 0.5, '#ff8a3a', 10, 'fire'); H.I.lights[H.I.lights.length - 1].p = p; }
      const l = H.spot(0.5, 25, IR - 12, 3); if (l) fpiLanternPost(H, l[0], l[1], R(0, TAU));
      if (wrecks[0]) H.track([[wrecks[0].x, wrecks[0].y], ...(f ? [[f[0], f[1]]] : []), [H.CX, H.CY]].map(([x, y], i, a) => [x + (i === 0 ? 6 : 0), y]));
    },
  },
  chapel: {
    set(H) {
      const { R, TAU } = H;
      const at = H.spot(19, 0, 36, 3) || [H.CX, H.CY], [cx, cy] = at, a = R(0, TAU), c = Math.cos(a), s = Math.sin(a);
      const L = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
      const W = (u0, v0, u1, v1, o, gaps) => H.wall(...L(u0, v0), ...L(u1, v1), o, gaps);
      // the chapel: a roofless nave, its door at the west end, a tall gable at the east, a breach in each side
      const ch = { hh: 3.4, jag: 0.45, th: 0.85, moss: true };
      W(-6.9, 3.8, 6.9, 3.8, ch, [[0.36, 0.53]]);
      W(-6.9, -3.8, 6.9, -3.8, ch, [[0.62, 0.79]]);
      W(-6.5, -3.4, -6.5, 3.4, Object.assign({}, ch, { hh: 3.8, jag: 0.25 }), [[0.33, 0.67]]);
      W(6.5, -3.4, 6.5, 3.4, { hh: 6.2, jag: 0.08, th: 0.95, gable: true, moss: true });
      const alt = H.put('stone', ...L(4.9, 0), a + Math.PI / 2, { w: 1.7, d: 0.8, hh: 1.0, altar: true });
      const [lx, ly] = L(4.9, 0); H.light(lx, ly, 1.35, '#ffc070', 9, 'lantern'); H.I.lights[H.I.lights.length - 1].p = alt; alt.candle = true;
      H.put('plank', ...L(-1.5, -1.6), a + 0.5, { len: 4.2, w: 0.4, beam: true }, true);
      // the graveyard wall: low and broken, with a gate in line with the door
      const gw = { hh: 1.05, jag: 0.25, th: 0.6, cap: true };
      W(-15, -11, -15, 11, gw, [[0.43, 0.57]]);
      W(15, -11, 15, 11, gw, [[0.6, 0.72]]);
      W(-15.3, 11, 15.3, 11, gw, [[0.25, 0.34]]);
      W(-15.3, -11, 15.3, -11, gw, [[0.66, 0.75]]);
      // headstones in rows either side of the nave, and a cross at the east end
      for (const side of [-1, 1]) for (let row = 0; row < 2; row++) for (let u = -12; u <= 12; u += R(2.3, 3)) {
        if (H.rng() < 0.28) continue;
        const v = side * (6.3 + row * 2.4 + R(-0.2, 0.2)), [x, y] = L(u, v);
        if (H.clear(x, y, 0.5, 1.1)) H.put('headstone', x, y, a + Math.PI / 2 + R(-0.12, 0.12), { w: R(0.5, 0.75), hh: R(0.7, 1.1), style: H.RI(0, 2), lean: R(-0.12, 0.12) });
      }
      H.put('cross', ...L(11.2, 0), a + Math.PI / 2, {});
      for (const v of [-3, 3]) { const [x, y] = L(11.5 + R(-0.5, 0.5), v + R(-0.4, 0.4)); if (H.clear(x, y, 0.5, 1.1)) H.put('headstone', x, y, a + Math.PI / 2, { w: 0.6, hh: 0.85, style: 1, lean: 0.05 }); }
      H.put('tree', ...L(-13.2, 9.2), R(0, TAU), { hh: R(4.5, 6) });
      H.track([L(-30, R(-4, 4)), L(-15, 0), L(-6.5, 0), L(3.5, 0)]);
      H.chapel = { cx, cy };
    },
    props(H) {
      const { R, IR, TAU } = H;
      const w = H.spot(1.6, 15, IR - 15, 4); if (w) H.put('well', w[0], w[1], R(0, TAU), { r: 1.1 });
      // a ring of standing stones
      const sc = H.spot(8, 25, IR - 14, 3);
      if (sc) { const n = 7, a0 = R(0, TAU); for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU + R(-0.1, 0.1), x = sc[0] + Math.cos(a) * 6.5, y = sc[1] + Math.sin(a) * 6.5; if (H.rng() < 0.85) H.put('stone', x, y, a + Math.PI / 2, { w: R(0.9, 1.3), d: R(0.45, 0.6), hh: R(1.7, 2.8), lean: R(-0.08, 0.08) }); } }
      fpiScatter(H, 2, 0.6, 20, IR - 10, 3, (x, y) => H.put('stone', x, y, R(0, TAU), { w: R(0.8, 1.1), d: 0.5, hh: R(1.6, 2.4), lean: R(-0.1, 0.1) }, true));
      fpiScatter(H, 3, 0.6, 20, IR - 8, 3, (x, y) => H.put('tree', x, y, R(0, TAU), { hh: R(3.5, 6) }, true));
      fpiScatter(H, 3, 1.2, 25, IR - 8, 2.6, (x, y) => H.put('cairn', x, y, 0, { r: R(0.7, 1), hh: R(1, 1.5) }, true));
      fpiScatter(H, 3, 2.5, 25, IR - 6, 2.6, (x, y) => H.put('log', x, y, R(0, TAU), { len: R(2.4, 4.5), rad: R(0.2, 0.3) }, true));
      if (w) { const p = H.I.props.find(q => q.k === 'well'); H.light(w[0] + 1.6, w[1], 1.0, '#ffb060', 6, 'lantern'); H.I.lights[H.I.lights.length - 1].p = p; p.lamp = true; }
    },
  },
  cove: {
    set(H) {
      const { R, IR, TAU } = H;
      const a0 = R(0, TAU), c = Math.cos(a0), s = Math.sin(a0);
      // the jetty runs out from the shore into the sea
      const [jx, jy] = H.polar(a0, IR - 1.5);
      H.put('jetty', jx, jy, a0, { len: 24, w: 2.6 });
      fpiLanternPost(H, ...H.polar(a0 - 0.035, IR - 4.5), a0);
      // the boathouse beside it, its open end to the sea
      const ba = a0 + 0.16, [bx, by] = H.polar(ba, IR - 15), bc = Math.cos(ba), bs = Math.sin(ba);
      const L = (u, v) => [bx + u * bc - v * bs, by + u * bs + v * bc];
      const ww = { mat: 'wood', hh: 2.6, th: 0.3 };
      H.wall(...L(-4.6, -3.4), ...L(-4.6, 3.4), ww, [[0.34, 0.66]]);
      H.wall(...L(-4.6, 3.3), ...L(4.6, 3.3), ww, [[0.15, 0.38]]);
      H.wall(...L(-4.6, -3.3), ...L(4.6, -3.3), ww);
      H.put('roof', bx, by, ba + Math.PI / 2, { w: 7.4, d: 10, z0: 2.6, rise: 1.9, mat: 'wood' });
      H.put('boat', ...L(1.2, -1.6), ba + Math.PI / 2 + 0.05, { len: 4.6, beam: 1.6, paint: H.pick(FPI_C.paint), upright: true });
      fpiLanternPost(H, ...L(5.3, 4.2), ba);
      H.track([H.polar(a0, IR - 2), L(6, 0), L(-1, 0)]);
      H.track([L(-5, 0), L(-12, R(-3, 3)), L(-22, R(-6, 6)), L(-34, R(-8, 8))]);
      H.cove = { bx, by, a0 };
    },
    props(H) {
      const { R, IR, TAU } = H, C = H.cove;
      // the run goods: crates and barrels stacked about, most of them near the boathouse
      for (let i = 0; i < 7; i++) { const at = (i < 4 ? H.near(C.bx, C.by, 1.6, 9, 30, 2.6) : null) || H.spot(1.6, 8, IR - 10, 2.6); if (at) fpiCrates(H, at[0], at[1], i % 2 === 0); }
      for (let i = 0; i < 5; i++) { const at = (i < 2 ? H.near(C.bx, C.by, 1.2, 8, 25, 2.6) : null) || H.spot(1.2, 8, IR - 10, 2.6); if (at) fpiBarrels(H, at[0], at[1]); }
      fpiScatter(H, 2, 2.6, IR - 30, IR - 8, 3, (x, y) => H.put('boat', x, y, Math.atan2(y - H.CY, x - H.CX) + R(-0.5, 0.5), { len: R(4.2, 5.2), beam: R(1.5, 1.8), paint: H.pick(FPI_C.paint) }, true));
      fpiScatter(H, 1, 2.4, 15, IR - 12, 2.6, (x, y) => H.put('rack', x, y, R(0, TAU), { len: R(3.4, 4.4), nets: true }, true));
      fpiScatter(H, 2, 1.4, 20, IR - 10, 2.6, (x, y) => fpiPots(H, x, y));
      fpiScatter(H, 3, 2.5, 20, IR - 6, 2.6, (x, y) => H.put('log', x, y, R(0, TAU), { len: R(2.4, 4.5), rad: R(0.2, 0.32) }, true));
      fpiScatter(H, 1, 1.6, 10, IR - 12, 2.6, (x, y) => H.put('cannon', x, y, R(0, TAU), { len: 2.4 }, true));
    },
  },
  cliff: {
    set(H) {
      const { R, IR, TAU } = H;
      // crags along one shore, a stair cut up them
      const a0 = R(0, TAU);
      for (let i = -4; i <= 4; i++) {
        const a = a0 + i * 0.13 + R(-0.03, 0.03), d = IR + R(3, 6.5) + Math.abs(i) * 0.6, r = R(8, 11) - Math.abs(i) * 0.5;
        const [x, y] = H.polar(a, d);
        const prof = []; for (let k = 0; k < 7; k++) prof.push(R(0.6, 1)); prof[0] = R(0.3, 0.5); prof[6] = R(0.3, 0.5);
        H.rocks.push({ x, y, r, prof, ph: R(0, 6.28), rk: { h: 1.9 - Math.abs(i) * 0.12, tint: ['#4a463c', 0.3] }, crag: true });
      }
      H.extraRocks = 9;
      const [sx, sy] = H.polar(a0 + 0.065, IR - 6.5);
      H.put('stair', sx, sy, a0 + 0.065, { n: 11, tread: 0.95, rise: 0.42, w: 2.1 });
      fpiLanternPost(H, ...H.polar(a0 + 0.13, IR - 7.5), a0);
      // the signal tower: a ring of broken wall with a doorway and a breach, its beacon lit at the door
      const at = H.spot(5, 18, 45, 4) || [H.CX, H.CY], n = 12, rr = 3.7, door = H.RI(0, n - 1), breach = (door + 6 + H.RI(-1, 1)) % n;
      for (let i = 0; i < n; i++) {
        if (i === door || i === (door + 1) % n || i === breach) continue;
        const a = (i + 0.5) / n * TAU, x = at[0] + Math.cos(a) * rr, y = at[1] + Math.sin(a) * rr;
        const back = Math.abs(angDiff(a, (door + 1) / n * TAU + Math.PI));
        H.put('wall', x, y, a + Math.PI / 2, { len: TAU * rr / n * 1.06, th: 0.85, hh: 2.6 + (1 - back / Math.PI) * 4.2 + R(-0.6, 0.6), jag: 0.2, mat: 'stone', moss: true, ring: true });
      }
      const da = (door + 1) / n * TAU, [bx, by] = [at[0] + Math.cos(da) * (rr + 2.6), at[1] + Math.sin(da) * (rr + 2.6)];
      const b = H.put('brazier', bx, by, 0, {}); H.light(bx, by, 1.75, '#ff9a40', 11, 'fire'); H.I.lights[H.I.lights.length - 1].p = b;
      H.track([[bx, by], H.polar(Math.atan2(by - H.CY, bx - H.CX), 6), H.polar(a0 + 0.065, IR - 7)]);
    },
    props(H) {
      const { R, IR, TAU } = H;
      // drystone field walls, each with a gap
      for (let i = 0; i < 4; i++) {
        const len = R(10, 20), at = H.spot(len / 2 + 1, 12, IR - 12, 3); if (!at) continue;
        const a = R(0, TAU), [x0, y0, x1, y1] = [at[0] - Math.cos(a) * len / 2, at[1] - Math.sin(a) * len / 2, at[0] + Math.cos(a) * len / 2, at[1] + Math.sin(a) * len / 2];
        const g0 = R(0.3, 0.6);
        H.wall(x0, y0, x1, y1, { hh: R(1.05, 1.3), jag: 0.15, th: 0.65, cap: true, opt: true }, len > 12 ? [[g0, g0 + 2.6 / len]] : []);
      }
      fpiScatter(H, 3, 0.6, 15, IR - 10, 3, (x, y) => H.put('stone', x, y, R(0, TAU), { w: R(0.8, 1.2), d: 0.5, hh: R(1.8, 3), lean: R(-0.1, 0.1) }, true));
      fpiScatter(H, 2, 0.6, 20, IR - 8, 3, (x, y) => H.put('tree', x, y, R(0, TAU), { hh: R(2.6, 3.6), bent: true }, true));
      fpiScatter(H, 2, 4, 20, IR - 10, 3, (x, y) => H.put('fence', x, y, R(0, TAU), { len: R(6, 9) }, true));
      fpiScatter(H, 3, 1.1, 15, IR - 10, 2.6, (x, y) => H.put('cairn', x, y, 0, { r: R(0.7, 1), hh: R(1.1, 1.8) }, true));
      fpiScatter(H, 1, 1.2, 15, IR - 10, 2.6, (x, y) => fpiBarrels(H, x, y));
    },
  },
  marsh: {
    props(H) {
      const { R, IR, TAU } = H;
      // the fowler's hut
      const at = H.spot(5, 8, 45, 3);
      if (at) {
        const a = R(0, TAU), c = Math.cos(a), s = Math.sin(a), L = (u, v) => [at[0] + u * c - v * s, at[1] + u * s + v * c];
        const ww = { mat: 'wood', hh: 2.1, th: 0.3, dark: true };
        H.wall(...L(-3, -2.3), ...L(-3, 2.3), ww);
        H.wall(...L(3, -2.3), ...L(3, 2.3), ww, [[0.26, 0.74]]);
        H.wall(...L(-3.15, 2.25), ...L(3.15, 2.25), ww);
        H.wall(...L(-3.15, -2.25), ...L(3.15, -2.25), ww, [[0.55, 0.85]]);
        H.put('roof', at[0], at[1], a + Math.PI / 2, { w: 5.4, d: 7, z0: 2.1, rise: 1.7, mat: 'straw' });
        const p = fpiLanternPost(H, ...L(4, 2.6), a);
        H.track([L(4, 0), L(12, R(-3, 3)), L(22, R(-6, 6)), L(32, R(-8, 8))]);
        p.hut = true;
      }
      fpiScatter(H, 3, 1.4, 15, IR - 8, 2.6, (x, y) => fpiPots(H, x, y));
      fpiScatter(H, 3, 1.2, 15, IR - 10, 2.6, (x, y) => H.put('peat', x, y, R(0, TAU), { w: R(1.6, 2.4), d: R(1, 1.4), hh: R(0.8, 1.2) }, true));
      fpiScatter(H, 3, 4, 15, IR - 10, 3, (x, y) => H.put('fence', x, y, R(0, TAU), { len: R(6, 10) }, true));
      fpiScatter(H, 2, 2.6, 20, IR - 8, 3, (x, y) => H.put('boat', x, y, R(0, TAU), { len: R(4.2, 5), beam: 1.3, paint: '#3a3428', punt: true }, true));
      fpiScatter(H, 7, 0.3, 10, IR - 6, 2.6, (x, y) => H.put('post', x, y, R(0, TAU), { r: 0.17, hh: R(1.1, 1.8) }, true));
      fpiScatter(H, 3, 0.6, 15, IR - 8, 3, (x, y) => H.put('tree', x, y, R(0, TAU), { hh: R(3, 4.5) }, true));
    },
    decor(H) {},
  },
};
// the marsh: boardwalks over its pools, reeds round them, and lights over the water (laid after the pools)
function fpiMarshDecor(H) {
  const { R, I, TAU } = H, pools = I.decor.filter(d => d.k === 'pool');
  for (const p of pools) {
    const n = Math.round(p.rx * 2.2);
    for (let i = 0; i < n; i++) { const a = R(0, TAU), k = R(0.85, 1.25), x = p.x + Math.cos(a) * p.rx * k, y = p.y + Math.sin(a) * p.ry * k; if (!I.solids.some(s => fpiDist(s, x, y) < 0.6)) H.decor('reed', x, y, { s: R(0.7, 1.2) }); }
  }
  for (let i = 0; i < 26; i++) { const [x, y] = H.polar(R(0, TAU), Math.sqrt(R(0.02, 0.95)) * (FPSC.R - 4)); if (!I.solids.some(s => fpiDist(s, x, y) < 0.8)) H.decor('reed', x, y, { s: R(0.8, 1.4) }); }
  for (const p of pools.slice(0, 5)) {
    const a = R(0, TAU), len = p.rx * 2 + R(3, 6);
    H.decor('walk', p.x, p.y, { ang: a, len, w: 1.0 });
  }
  pools.slice(0, 3).forEach(p => H.light(p.x + R(-1, 1), p.y + R(-1, 1), R(1.1, 1.7), '#9effb4', 7, 'wisp'));
}

// ---------- the kinds of prop: their solids, and how they're built in 3D ----------
// b3(p, A): A builds in the prop's own frame: u along it, v across, h up from the ground
const FPI_K = {
  // the Flensing Yard's lookout: four legs, a planked platform (a floor: you stand on it) with a boarded rail round
  // it, open where the stair comes up, and a straight stair (each tread a floor) down one side; a lamp and a flag
  tower: {
    col: FPI_C.wood2, noShadow: true,
    sol(p) {
      const T = p.top, h = p.half, n = p.n, rise = T / n, out = [];
      out.push(fpiBox(p, 0, 0, h, h, T, { z0: T - 0.3, fl: true, col: FPI_C.wood2 }));
      for (const [u, v] of [[-h + 0.3, -h + 0.3], [h - 0.3, -h + 0.3], [-h + 0.3, h - 0.3], [h - 0.3, h - 0.3]]) out.push(fpiCirc(p, u, v, 0.24, T - 0.3, { col: FPI_C.wood3 }));
      // the rail: three sides whole, the stair's side in two pieces either side of the top of the stair
      const rail = (u, v, hw, hd) => out.push(fpiBox(p, u, v, hw, hd, T + 1.05, { z0: T, col: FPI_C.wood3 }));
      rail(-h + 0.08, 0, 0.08, h); rail(0, -h + 0.08, h, 0.08); rail(0, h - 0.08, h, 0.08);
      const gap = p.sw + 0.15, seg = (h - gap) / 2;
      rail(h - 0.08, -(gap + seg), 0.08, seg); rail(h - 0.08, gap + seg, 0.08, seg);
      for (let i = 0; i < n; i++) out.push(fpiBox(p, h + (n - i - 0.5) * p.tread, 0, p.tread / 2, p.sw, (i + 1) * rise, { fl: true, col: FPI_C.wood }));
      return out;
    },
    b3(p, A) {
      const T = p.top, h = p.half, n = p.n, rise = T / n, W = FPI_C.wood, W2 = FPI_C.wood2, W3 = FPI_C.wood3;
      const beam = (col, u0, v0, z0, u1, v1, z1, t) => { const du = u1 - u0, dv = v1 - v0, dz = z1 - z0, hz = Math.hypot(du, dv); A.part('box', col, (u0 + u1) / 2, (v0 + v1) / 2, (z0 + z1) / 2, Math.hypot(hz, dz), t, t, Math.atan2(dv, du), 0, Math.atan2(dz, hz)); };
      const k = h - 0.3;
      for (const [u, v] of [[-k, -k], [k, -k], [-k, k], [k, k]]) A.cyl(W3, u, v, -0.3, 0.22, T, 0, 0, 0, 'cyl8');
      // cross-bracing on every side, in two storeys, and a ring of beams under the platform and half way up
      for (const s of [-1, 1]) for (const [z0, z1] of [[0.3, T / 2], [T / 2, T - 0.4]]) {
        beam(W3, -k, s * k, z0, k, s * k, z1, 0.14); beam(W3, k, s * k, z0, -k, s * k, z1, 0.14);
        beam(W3, s * k, -k, z0, s * k, k, z1, 0.14); beam(W3, s * k, k, z0, s * k, -k, z1, 0.14);
      }
      for (const z of [T / 2, T - 0.4]) for (const s of [-1, 1]) { A.box(W3, 0, s * k, z - 0.1, 2 * k + 0.4, 0.2, 0.2); A.box(W3, s * k, 0, z - 0.1, 0.2, 2 * k + 0.4, 0.2); }
      // the platform: planks, each a little different
      const np = Math.round(2 * h / 0.32);
      for (let i = 0; i < np; i++) A.box(i % 3 ? W : W2, -h + (i + 0.5) * 2 * h / np, (A.r() - 0.5) * 0.04, T - 0.12, 2 * h / np * 0.92, 2 * h + 0.1, 0.12);
      A.box(W3, 0, 0, T - 0.3, 2 * h, 2 * h, 0.18);
      // the boarded rail, on posts
      const rail = (u, v, len, along) => {
        const nb = Math.max(1, Math.round(len / 0.5));
        for (let i = 0; i < nb; i++) { const o = -len / 2 + (i + 0.5) * len / nb; A.box(i % 2 ? W3 : W, along ? u + o : u, along ? v : v + o, T, along ? len / nb * 0.94 : 0.1, along ? 0.1 : len / nb * 0.94, 0.9 - A.r() * 0.12); }
        A.box(W3, u, v, T + 0.92, along ? len + 0.1 : 0.16, along ? 0.16 : len + 0.1, 0.12);
      };
      rail(0, -h + 0.08, 2 * h, true); rail(0, h - 0.08, 2 * h, true); rail(-h + 0.08, 0, 2 * h, false);
      const gap = p.sw + 0.15, seg = (h - gap) / 2;
      rail(h - 0.08, -(gap + seg), 2 * seg, false); rail(h - 0.08, gap + seg, 2 * seg, false);
      for (const [u, v] of [[-h, -h], [h, -h], [-h, h], [h, h], [h, -gap], [h, gap]]) A.cyl(W3, u * 0.97, v * 0.97, T - 0.1, 0.09, 1.2, 0, 0, 0, 'cyl6');
      // the stair: treads on a timber crib, stringers either side and a hand rope
      for (let i = 0; i < n; i++) {
        const u = h + (n - i - 0.5) * p.tread, z = (i + 1) * rise;
        A.box(i % 2 ? W2 : W, u, 0, z - 0.1, p.tread * 1.02, p.sw * 2, 0.1);
        A.box(W3, u, 0, -0.2, p.tread * 0.98, p.sw * 2 - 0.1, z + 0.1);
      }
      for (const s of [-1, 1]) {
        beam(W3, h + n * p.tread + 0.1, s * (p.sw + 0.06), 0.05, h, s * (p.sw + 0.06), T, 0.18);
        A.cyl(W3, h + n * p.tread - 0.2, s * (p.sw + 0.1), -0.2, 0.07, 1.2, 0, 0, 0, 'cyl6');
        beam(FPI_C.rope, h + n * p.tread - 0.2, s * (p.sw + 0.1), 0.95, h, s * (p.sw + 0.1), T + 0.95, 0.05);
      }
      // the lamp on a post at one corner, and a flag on a pole at the other
      A.cyl(W3, -h + 0.2, -h + 0.2, T, 0.08, 2.4, 0, 0, 0, 'cyl6');
      A.box(W3, -h + 0.2, -h + 0.2, T + 2.3, 0.08, 0.08, 0.08);
      A.box(FPI_C.iron, -h + 0.2, -h + 0.2, T + 1.92, 0.26, 0.26, 0.05); A.part('cone', FPI_C.iron, -h + 0.2, -h + 0.2, T + 2.42, 0.3, 0.16, 0.3);
      A.glow('#ffd08a', -h + 0.2, -h + 0.2, T + 2.12, 0.24);
      A.cyl(W3, -h + 0.2, h - 0.2, T, 0.06, 4.2, 0, 0, 0, 'cyl6');
      A.box('#7a2a22', -h + 0.75, h - 0.2, T + 3.55, 1.1, 0.03, 0.6, 0, 0, -0.08);
    },
  },
  // an oil tank: riveted iron, rusted, with bands, a shallow roof, a ladder up its side and a valve at its foot
  tank: {
    col: '#5a4434',
    sol(p) { return [fpiCirc(p, 0, 0, p.r, p.hh)]; },
    b3(p, A) {
      const r = p.r, rust = ['#5a4434', '#4e3c2e', '#6a4a34'];
      A.cyl('#3a3634', 0, 0, -0.2, r + 0.25, 0.45, 0, 0, 0, 'cyl8');
      const nr = Math.round(p.hh / 1.2);
      for (let i = 0; i < nr; i++) A.part('cyl8', A.r() < 0.5 ? rust[0] : rust[1 + (i % 2)], 0, 0, (i + 0.5) * p.hh / nr, r * 2, p.hh / nr * 1.01, r * 2, 0.39 * (i % 2));
      for (let i = 1; i < nr; i++) A.cyl('#2e2a28', 0, 0, i * p.hh / nr - 0.04, r + 0.04, 0.08, 0.2, 0, 0, 'cyl8');
      A.part('cone', '#4a3a2e', 0, 0, p.hh + 0.35, r * 2.06, 0.7, r * 2.06, 0.2);
      // rust streaks down the side
      for (let i = 0; i < 6; i++) { const t = A.r() * 6.28, len = 1 + A.r() * p.hh * 0.5; A.box('#7a4a2a', Math.cos(t) * (r + 0.01), Math.sin(t) * (r + 0.01), p.hh - len, 0.12, 0.12, len, -t); }
      // the ladder
      for (const s of [-1, 1]) A.box(FPI_C.iron, r + 0.18, s * 0.26, 0, 0.06, 0.06, p.hh + 0.6);
      for (let z = 0.3; z < p.hh + 0.4; z += 0.4) A.box(FPI_C.iron, r + 0.18, 0, z, 0.05, 0.52, 0.04);
      A.cyl(FPI_C.iron, -r - 0.1, 0, 0.5, 0.28, 0.5, 0, 0, Math.PI / 2, 'cyl8');
      A.cyl(FPI_C.brass, -r - 0.45, 0, 0.95, 0.22, 0.06, 0, 0, 0, 'cyl8');
    },
  },
  // a pipe on trestles: low ones block you and stop a shot at the body (crouch behind them, shoot over them), high
  // ones carry over a lane (walk under them; they stop shots)
  pipe: {
    col: '#4a3e34', noShadow: true,
    sol(p) {
      const high = p.h - p.r > 2.0;
      return [fpiBox(p, 0, 0, p.len / 2, p.r + 0.08, p.h + p.r, high ? { z0: p.h - p.r, mv: false } : {})];
    },
    b3(p, A) {
      A.log('#4a3e34', 0, 0, p.h, p.r, p.len, 0);
      for (let u = -p.len / 2 + 0.4; u <= p.len / 2 - 0.3; u += 2.4) A.log('#2e2a26', u, 0, p.h, p.r + 0.06, 0.16, 0);
      for (let u = -p.len / 2 + 1.0; u < p.len / 2 - 0.4; u += 3.2) {
        for (const s of [-1, 1]) A.box(FPI_C.wood3, u, s * (p.r + 0.12), -0.2, 0.14, 0.14, p.h - p.r + 0.2);
        A.box(FPI_C.wood3, u, 0, p.h - p.r - 0.12, 0.18, p.r * 2 + 0.5, 0.14);
      }
    },
  },
  // the try-works: a brick furnace with two great iron pots set in it, its fire-holes still glowing
  trypot: {
    col: '#6a3e30',
    sol(p) { return [fpiBox(p, 0, 0, 2.2, 1.15, 1.3)]; },
    b3(p, A) {
      for (let z = 0; z < 1.2; z += 0.3) for (let i = 0; i < 6; i++) A.box(A.r() < 0.5 ? '#6a3e30' : '#5a342a', -1.85 + i * 0.74 + (z * 3.3 % 2 ? 0.2 : 0), 0, z - 0.1, 0.72, 2.3, 0.3);
      A.box('#4a3a32', 0, 0, 1.2, 4.5, 2.4, 0.12);
      for (const s of [-1, 1]) {
        A.part('sph', FPI_C.iron, s * 1.1, 0, 1.3, 1.9, 0.9, 1.9);
        A.cyl('#1a1612', s * 1.1, 0, 1.55, 0.82, 0.04, 0, 0, 0, 'cyl8');
        A.box('#140e0a', s * 1.1, -1.16, 0.15, 0.6, 0.06, 0.45);
        A.glow('#ff7a30', s * 1.1, -1.2, 0.35, 0.3);
      }
      A.cyl('#3a2a22', 1.9, 0.8, 1.3, 0.25, 1.6, 0, 0, 0, 'cyl8');
    },
  },
  // the jawbone arch: two great whale's jawbones, set in the sand and leaning in to meet over the way through
  jawbone: {
    col: FPI_C.bone,
    sol(p) { return [fpiCirc(p, -1.9, 0, 0.32, 5), fpiCirc(p, 1.9, 0, 0.32, 5)]; },
    b3(p, A) {
      const beam = (col, u0, z0, u1, z1, t) => { const du = u1 - u0, dz = z1 - z0; A.part('box', col, (u0 + u1) / 2, 0, (z0 + z1) / 2, Math.hypot(du, dz), t, t * 0.8, 0, 0, Math.atan2(dz, du)); };
      for (const s of [-1, 1]) {
        let pu = s * 1.9, pz = -0.2;
        for (let i = 1; i <= 6; i++) { const t = i / 6 * Math.PI / 2, u = s * (1.9 * Math.cos(t) + 0.12), z = 5.4 * Math.sin(t); beam(i % 2 ? FPI_C.bone : '#988f7a', pu, pz, u, z, 0.42 - i * 0.03); pu = u; pz = z; }
        A.part('ico', '#988f7a', s * 1.9, 0, 0.1, 0.9, 0.5, 0.8, A.r() * 3);
      }
    },
  },
  // a plain block of stone or timber (a sill, a lintel over a doorway: one with z0 is walked under)
  block: {
    col: FPI_C.stone3,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, Object.assign({ col: p.col || FPI_C.stone3 }, p.z0 ? { z0: p.z0, mv: false } : {}))]; },
    b3(p, A) { const z0 = p.z0 || -0.2; A.box(p.col || FPI_C.stone3, 0, 0, z0, p.w, p.d, p.hh - z0); if (p.trim) A.box(p.trim, 0, 0, p.hh - 0.06, p.w * 1.01, p.d * 1.12, 0.1); },
  },
  // cargo, stacked long and lashed under a tarpaulin: one or two high
  cargo: {
    col: '#5a4a34',
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.wd / 2, p.hh)]; },
    b3(p, A) {
      const lv = p.two ? 2 : 1, h = p.hh / lv;
      for (let k = 0; k < lv; k++) {
        const z = k * h, n = Math.max(2, Math.round(p.len / 1.3));
        // bales and chests side by side, each a little different
        for (let i = 0; i < n; i++) { const u = -p.len / 2 + (i + 0.5) * p.len / n; A.box(A.r() < 0.5 ? '#6a5438' : '#5a4630', u, (A.r() - 0.5) * 0.08, z, p.len / n * 0.96, p.wd * (0.94 + A.r() * 0.05), h * 0.97); A.box(FPI_C.wood3, u, 0, z + h * 0.48, p.len / n * 0.98, p.wd * 0.99, 0.08); }
        A.box(FPI_C.wood3, 0, 0, z, p.len * 1.01, p.wd * 1.01, 0.1);
      }
      // the tarpaulin over the top and down the ends, and its lashings
      A.box(p.tarp, 0, 0, p.hh - 0.02, p.len * 1.03, p.wd * 1.04, 0.1);
      for (const e of [-1, 1]) A.box(p.tarp, e * (p.len / 2 + 0.03), 0, p.hh - Math.min(1.2, p.hh * 0.35), 0.06, p.wd * 1.04, Math.min(1.2, p.hh * 0.35));
      for (let u = -p.len / 2 + 0.8; u < p.len / 2; u += 1.6) for (const s of [-1, 1]) A.box(FPI_C.rope, u, s * (p.wd / 2 + 0.02), 0.1, 0.06, 0.04, p.hh - 0.05);
    },
  },
  // a handcart, tipped on its legs, with a load of fish boxes
  cart: {
    col: FPI_C.wood2,
    sol(p) { return [fpiBox(p, 0, 0, 1.3, 0.75, 1.1)]; },
    b3(p, A) {
      A.box(FPI_C.wood2, 0, 0, 0.5, 2.6, 1.5, 0.12, 0, 0, 0.08);
      for (const s of [-1, 1]) { A.box(FPI_C.wood3, 0, s * 0.72, 0.6, 2.6, 0.08, 0.4); A.cyl(FPI_C.wood3, 0.3, s * 0.85, 0.45, 0.45, 0.08, 0, 0, 0, 'cyl8'); }
      for (const s of [-1, 1]) A.box(FPI_C.wood3, -1.9, s * 0.45, 0.5, 1.4, 0.08, 0.08, 0, 0, -0.25);
      for (let i = 0; i < 3; i++) A.box(i % 2 ? '#7a6a50' : FPI_C.wood, -0.7 + i * 0.7, 0, 0.62, 0.6, 1.2, 0.35);
    },
  },
  // the quay's crane: a stone plinth, a timber post, a long jib and a hanging load
  crane: {
    col: FPI_C.stone3,
    sol(p) { return [fpiBox(p, 0, 0, 1.6, 1.6, 1.3), fpiCirc(p, 0, 0, 0.45, 7.5), fpiBox(p, 5.2, 0, 0.75, 0.75, 3.4, { z0: 2.0, col: FPI_C.wood2 })]; },
    b3(p, A) {
      A.box(FPI_C.stone, 0, 0, -0.2, 3.2, 3.2, 1.5); A.box(FPI_C.stone3, 0, 0, 1.25, 3.3, 3.3, 0.12);
      A.cyl(FPI_C.wood3, 0, 0, 1.3, 0.4, 6.4, 0, 0, 0, 'cyl8');
      A.box(FPI_C.wood3, 2.8, 0, 7.0, 6.6, 0.35, 0.35, 0, 0, -0.08);
      A.box(FPI_C.wood3, 1.2, 0, 5.4, 3.0, 0.22, 0.22, 0, 0, 0.6);
      A.box(FPI_C.rope, 5.2, 0, 3.4, 0.05, 0.05, 3.5);
      A.box('#6a5438', 5.2, 0, 2.0, 1.4, 1.4, 1.4); A.box(FPI_C.rope, 5.2, 0, 2.0, 1.45, 0.06, 1.45); A.box(FPI_C.rope, 5.2, 0, 2.0, 0.06, 1.45, 1.45);
      A.cyl(FPI_C.iron, 0.6, 0, 2.4, 0.3, 0.5, 0, 0, Math.PI / 2, 'cyl8');
    },
  },
  wall: {
    col: FPI_C.stone,
    gen(p) {
      const n = Math.max(1, Math.round(p.len / 2.2)), cl = p.len / n; p.ch = [];
      for (let i = 0; i < n; i++) {
        const uc = -p.len / 2 + (i + 0.5) * cl;
        let h = p.hh;
        if (p.gable) h = p.hh * (0.55 + 0.45 * (1 - Math.abs(uc) / (p.len / 2)));
        h *= 1 - (p.jag || 0) * fpiHash(p.sd, i);
        p.ch.push(Math.max(0.55, h));
      }
    },
    sol(p) {
      const n = p.ch.length, cl = p.len / n, out = [];
      for (let i = 0; i < n; i++) out.push(fpiBox(p, -p.len / 2 + (i + 0.5) * cl, 0, cl / 2, p.th / 2, p.ch[i], { col: p.mat === 'wood' ? (p.dark ? FPI_C.wood3 : FPI_C.wood) : FPI_C.stone }));
      return out;
    },
    b3(p, A) {
      const n = p.ch.length, cl = p.len / n;
      for (let i = 0; i < n; i++) {
        const uc = -p.len / 2 + (i + 0.5) * cl, top = p.ch[i];
        if (p.mat === 'plaster') {
          // whitewashed: one face of lime, a tarred skirting at the foot, a painted dado rail
          A.box(p.col2 || '#b4ae9e', uc, 0, -0.2, cl * 1.002, p.th, top + 0.2);
          A.box('#26221c', uc, 0, -0.2, cl * 1.004, p.th + 0.04, 0.42);
          A.box(p.dado || '#4a5a50', uc, 0, 1.05, cl * 1.004, p.th + 0.04, 0.08);
          continue;
        }
        if (p.mat === 'wood') {
          const k = Math.max(2, Math.round(cl / 0.3));
          for (let j = 0; j < k; j++) A.box(p.dark ? (j % 2 ? FPI_C.wood3 : FPI_C.wood) : (j % 2 ? FPI_C.wood : FPI_C.wood2), uc - cl / 2 + (j + 0.5) * cl / k, 0, -0.2, cl / k * 0.94, p.th, top + 0.2 - A.r() * 0.1);
          A.box(FPI_C.wood3, uc, 0, top * 0.45, cl, p.th + 0.12, 0.16);
          A.box(FPI_C.wood3, uc, 0, top - 0.25, cl, p.th + 0.12, 0.14);
          continue;
        }
        const nc = Math.max(1, Math.round((top + 0.2) / 0.5)), chh = (top + 0.2) / nc;
        for (let j = 0; j < nc; j++) {
          const c = j === 0 && p.moss ? FPI_C.moss : A.r() < 0.5 ? FPI_C.stone : A.r() < 0.5 ? FPI_C.stone2 : FPI_C.stone3;
          A.box(c, uc + (A.r() - 0.5) * 0.14, (A.r() - 0.5) * 0.08, -0.2 + j * chh, cl * (0.97 + A.r() * 0.06), p.th * (0.9 + A.r() * 0.16), chh * 1.03);
        }
        if (p.cap) A.box(FPI_C.stone3, uc, 0, top, cl * 1.01, p.th * 1.18, 0.13);
        else if (p.jag && A.r() < 0.55) A.part('ico', FPI_C.stone2, uc + (A.r() - 0.5) * cl * 0.5, 0, top + 0.08, 0.55, 0.35, 0.45, A.r() * 3);
        // slit windows high in the chapel and the tower
        if (top > 3.2 && i % 2 === 1 && !p.noslit) A.box(FPI_C.tar, uc, 0, top * 0.5, Math.min(0.35, cl * 0.3), p.th * 1.04, Math.min(1.4, top * 0.3));
        // fallen stones at the foot of a broken wall
        if (p.jag > 0.2 && A.r() < 0.4) A.part('ico', FPI_C.stone2, uc + (A.r() - 0.5) * cl, (A.r() < 0.5 ? -1 : 1) * (p.th / 2 + 0.35), 0.12, 0.5, 0.35, 0.45, A.r() * 3);
      }
    },
  },
  crates: {
    col: FPI_C.wood2,
    sol(p) { return p.items.filter(it => !it.up).map(it => { const above = p.items.find(q => q.up === it); return fpiBox(p, it.u, it.v, it.s / 2, it.s / 2, it.s + (above ? above.s : 0), { ra: it.ry }); }); },
    b3(p, A) {
      for (const it of p.items) {
        const s = it.s, h0 = it.up ? it.up.s : 0;
        A.box(A.r() < 0.5 ? FPI_C.wood2 : '#6a5438', it.u, it.v, h0, s, s, s, it.ry);
        for (const f of [0.08, 0.92]) A.box(FPI_C.wood3, it.u, it.v, h0 + s * f - 0.05, s * 1.03, s * 1.03, 0.1, it.ry);
        A.box(FPI_C.wood3, it.u, it.v, h0 + s * 0.45, s * 1.02, s * 0.12, s * 0.1, it.ry + 0.0, 0, 0.7);
      }
    },
  },
  barrels: {
    col: '#5a4430',
    sol(p) { return p.items.map(it => it.lie ? fpiBox(p, it.u, it.v, it.hh / 2, it.r, it.r * 2, { ra: it.ry }) : fpiCirc(p, it.u, it.v, it.r, it.hh)); },
    b3(p, A) {
      for (const it of p.items) {
        if (it.lie) {
          A.log('#5a4430', it.u, it.v, it.r, it.r * 1.05, it.hh, it.ry, 0, 'cyl8');
          for (const f of [-0.35, 0, 0.35]) { const du = Math.cos(it.ry) * f * it.hh, dv = Math.sin(it.ry) * f * it.hh; A.log(FPI_C.iron, it.u + du, it.v + dv, it.r, it.r * 1.1, 0.05, it.ry, 0, 'cyl8'); }
          continue;
        }
        A.cyl('#5a4430', it.u, it.v, 0, it.r, it.hh, 0, 0, 0, 'cyl8');
        for (const f of [0.12, 0.5, 0.86]) A.cyl(FPI_C.iron, it.u, it.v, it.hh * f - 0.025, it.r * 1.06, 0.05, 0, 0, 0, 'cyl8');
        A.cyl(FPI_C.wood3, it.u, it.v, it.hh, it.r * 0.9, 0.02, 0, 0, 0, 'cyl8');
      }
    },
  },
  boat: {
    col: '#3a3a3a',
    sol(p) { return [fpiBox(p, 0, 0, p.beam / 2, p.len / 2, p.upright ? 0.75 : 0.9, { col: p.paint && p.paint.length === 7 ? p.paint : '#3a3a3a' })]; },
    b3(p, A) {
      const c = p.paint || '#34465a';
      if (p.upright) {
        // sitting the right way up on the floor of the boathouse
        A.part('half', c, 0, 0, 0.62, p.beam, p.len, 1.2, -Math.PI / 2, 0, -Math.PI / 2);
        A.box(FPI_C.wood3, 0, 0, 0.35, p.beam * 0.9, 0.25, 0.08); A.box(FPI_C.wood3, 0, p.len * 0.25, 0.35, p.beam * 0.9, 0.25, 0.08);
        A.log(FPI_C.wood2, 0.25, 0, 0.5, 0.04, p.len * 0.7, Math.PI / 2 + 0.05);
        return;
      }
      if (p.punt) { A.box(c, 0, 0, 0, p.beam, p.len, 0.45); A.box(FPI_C.wood3, 0, 0, 0.45, p.beam * 0.4, p.len * 0.98, 0.06); return; }
      // upturned: the hull as a long half-barrel, keel uppermost, an oar or two beside it
      A.part('boathull', c, 0, 0, 0.02, 1.6, p.len, p.beam, Math.PI / 2, 0, Math.PI / 2);
      A.box(FPI_C.wood3, 0, 0, 0.78, 0.1, p.len * 0.92, 0.1);
      A.box('#8a8272', 0, 0, 0.02, p.beam * 1.02, p.len * 0.95, 0.1);
      A.log(FPI_C.wood2, p.beam / 2 + 0.3, 0, 0.06, 0.04, 2.8, Math.PI / 2 + 0.1);
      A.box(FPI_C.wood2, p.beam / 2 + 0.3, 1.3, 0.02, 0.14, 0.6, 0.04, 0.1);
    },
  },
  post: {
    col: FPI_C.wood3,
    sol(p) { return [fpiCirc(p, 0, 0, p.r + 0.05, p.hh)]; },
    b3(p, A) {
      A.cyl(FPI_C.wood3, 0, 0, -0.2, p.r, p.hh + 0.2, 0, 0, 0, 'cyl6');
      if (!p.lamp) { A.cyl(FPI_C.rope, 0, 0, p.hh * 0.7, p.r * 1.15, 0.12, 0, 0, 0, 'cyl6'); return; }
      A.box(FPI_C.wood3, 0.28, 0, p.hh - 0.08, 0.62, 0.08, 0.08);
      A.box(FPI_C.iron, 0.5, 0, 1.92, 0.24, 0.24, 0.04); A.box(FPI_C.iron, 0.5, 0, 2.28, 0.26, 0.26, 0.05);
      A.part('cone', FPI_C.iron, 0.5, 0, 2.38, 0.28, 0.14, 0.28);
      A.glow('#ffd08a', 0.5, 0, 2.12, 0.22);
      for (const [du, dv] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) A.box(FPI_C.iron, 0.5 + du, dv, 1.94, 0.025, 0.025, 0.34);
    },
  },
  stone: {
    col: '#5a5c58',
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh)]; },
    b3(p, A) {
      if (p.altar) {
        A.box(FPI_C.stone3, 0, 0, 0, p.w, p.d, p.hh - 0.12); A.box(FPI_C.stone, 0, 0, p.hh - 0.12, p.w * 1.12, p.d * 1.15, 0.12);
        A.cyl('#d8cfb8', -0.35, 0, p.hh, 0.05, 0.22, 0, 0, 0, 'cyl6'); A.cyl('#d8cfb8', 0.3, 0.1, p.hh, 0.05, 0.16, 0, 0, 0, 'cyl6');
        A.glow('#ffe0a0', -0.35, 0, p.hh + 0.27, 0.07); A.glow('#ffe0a0', 0.3, 0.1, p.hh + 0.21, 0.07);
        return;
      }
      A.part('taper', '#5a5c58', 0, 0, p.hh / 2 - 0.15, p.w, p.hh + 0.3, p.d, 0, 0, p.lean || 0);
      A.part('taper', FPI_C.moss, 0, 0, 0.12, p.w * 1.04, 0.4, p.d * 1.06, 0, 0, (p.lean || 0) * 0.3);
      A.part('ico', '#6a6c66', 0, 0, p.hh - 0.05, p.w * 0.75, 0.3, p.d * 0.8, 0, 0, p.lean || 0);
    },
  },
  headstone: {
    col: '#6a6a64',
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.11, p.hh)]; },
    b3(p, A) {
      const c = A.r() < 0.5 ? '#6a6a64' : '#585a56';
      if (p.style === 2) { A.box(c, 0, 0, -0.2, 0.16, 0.16, p.hh + 0.2, 0, p.lean); A.box(c, 0, 0, p.hh * 0.62, p.w, 0.15, 0.15, 0, p.lean); return; }
      A.box(c, 0, 0, -0.2, p.w, 0.16, p.hh + 0.2 - (p.style === 0 ? p.w / 2 : 0), 0, p.lean);
      if (p.style === 0) A.part('cyl8', c, 0, 0, p.hh - p.w / 2, p.w, 0.16, p.w, 0, Math.PI / 2 + (p.lean || 0));
      A.box(FPI_C.moss, 0, 0, -0.05, p.w * 1.05, 0.18, 0.18, 0, p.lean);
    },
  },
  cross: {
    col: '#6a6a64',
    sol(p) { return [fpiBox(p, 0, 0, 0.55, 0.35, 2.9)]; },
    b3(p, A) {
      A.box(FPI_C.stone2, 0, 0, 0, 1.1, 0.7, 0.45);
      A.box('#6a6a64', 0, 0, 0.45, 0.32, 0.22, 2.45);
      A.box('#6a6a64', 0, 0, 2.05, 1.2, 0.22, 0.3);
      A.part('torus', '#6a6a64', 0, 0, 2.2, 0.85, 0.85, 1.6);
    },
  },
  well: {
    col: FPI_C.stone,
    sol(p) { return [fpiCirc(p, 0, 0, p.r + 0.1, 0.9)]; },
    b3(p, A) {
      A.cyl(FPI_C.stone, 0, 0, -0.2, p.r, 1.05, 0, 0, 0, 'cyl8');
      A.part('disc', FPI_C.tar, 0, 0, 0.86, p.r * 1.6, 1, p.r * 1.6);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; A.box(i % 2 ? FPI_C.stone3 : FPI_C.stone2, Math.cos(a) * p.r * 0.9, Math.sin(a) * p.r * 0.9, 0.82, 0.62, 0.36, 0.16, a + Math.PI / 2); }
      for (const s of [-1, 1]) A.box(FPI_C.wood3, s * (p.r + 0.05), 0, 0, 0.14, 0.14, 2.2);
      A.log(FPI_C.wood2, 0, 0, 1.75, 0.08, p.r * 2 + 0.4, 0);
      for (const s of [-1, 1]) A.box(FPI_C.wood, 0, s * 0.42, 2.12, p.r * 2 + 0.6, 0.95, 0.06, 0, -s * 0.55);   // (each side sloping down and away from the ridge)
      A.box(FPI_C.rope, 0, 0, 1.0, 0.02, 0.02, 0.75);
      A.cyl(FPI_C.wood2, 0, 0, 0.88, 0.14, 0.22, 0, 0, 0, 'cyl6');
      if (p.lamp) { A.box(FPI_C.iron, p.r + 0.5, 0, 0.6, 0.2, 0.2, 0.32); A.glow('#ffc070', p.r + 0.5, 0, 0.78, 0.17); }
    },
  },
  pots: {
    col: FPI_C.net,
    sol(p) { return [fpiBox(p, 0, 0, p.hw, p.hd, p.top)]; },
    b3(p, A) {
      for (const it of p.items) {
        A.box(FPI_C.wood2, it.u, it.v, it.h0, 0.7, 0.5, 0.06, it.ry);
        A.part('half', FPI_C.net, it.u, it.v, it.h0 + 0.06, 0.8, 0.68, 0.5, it.ry, 0, Math.PI / 2);
        A.part('sph', '#8a3a2a', it.u + 0.2, it.v, it.h0 + 0.48, 0.14, 0.14, 0.14);
      }
      A.cyl(FPI_C.rope, p.hw + 0.4, 0.1, 0, 0.35, 0.12, 0, 0, 0, 'cyl8');
    },
  },
  rack: {
    col: FPI_C.wood3,
    sol(p) { return [fpiCirc(p, -p.len / 2, 0, 0.3, 1.9), fpiCirc(p, p.len / 2, 0, 0.3, 1.9), fpiBox(p, 0, 0, p.len / 2, 0.08, 1.9, { mv: false, ray: false, occ: false })]; },
    b3(p, A) {
      for (const s of [-1, 1]) for (const d of [-1, 1]) A.part('cyl6', FPI_C.wood3, s * p.len / 2, d * 0.3, 0.9, 0.1, 2.0, 0.1, 0, d * 0.32, 0);
      A.log(FPI_C.wood2, 0, 0, 1.78, 0.06, p.len + 0.4, 0);
      const n = Math.floor(p.len / 0.3);
      for (let i = 0; i < n; i++) {
        const u = -p.len / 2 + 0.25 + i * (p.len - 0.5) / Math.max(1, n - 1);
        if (p.nets) continue;
        A.box(FPI_C.rope, u, 0, 1.55, 0.015, 0.015, 0.24);
        A.box(A.r() < 0.5 ? FPI_C.fish : '#7c8a8e', u, 0, 1.05, 0.16, 0.04, 0.5, 0, A.r() * 0.2 - 0.1);
      }
      if (p.nets) { A.box(FPI_C.net, 0, 0.06, 0.4, p.len, 0.04, 1.35, 0, 0.12); A.box(FPI_C.net, 0, -0.08, 0.7, p.len * 0.8, 0.04, 1.05, 0, -0.1); }
    },
  },
  fire: {
    col: FPI_C.stone2,
    sol(p) { return [fpiCirc(p, 0, 0, 1.0, 0.4)]; },
    b3(p, A) {
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + A.r() * 0.3; A.part('ico', i % 2 ? FPI_C.stone2 : FPI_C.stone, Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0.08, 0.4, 0.32, 0.36, A.r() * 3); }
      A.part('disc', '#2a2622', 0, 0, 0.05, 1.5, 1, 1.5);
      for (let i = 0; i < 4; i++) A.log(FPI_C.tar, (A.r() - 0.5) * 0.3, (A.r() - 0.5) * 0.3, 0.2, 0.08, 1.2, i * 0.8 + A.r() * 0.3, (A.r() - 0.5) * 0.4);
      for (let i = 0; i < 7; i++) A.glow(i % 2 ? '#ff7a2a' : '#ffaa50', (A.r() - 0.5) * 0.9, (A.r() - 0.5) * 0.9, 0.12, 0.1 + A.r() * 0.1);
    },
  },
  brazier: {
    col: FPI_C.iron,
    sol(p) { return [fpiCirc(p, 0, 0, 0.6, 1.75)]; },
    b3(p, A) {
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; A.part('cyl6', FPI_C.iron, Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0.75, 0.07, 1.6, 0.07, a, 0, 0.22); }
      A.part('cone', FPI_C.iron, 0, 0, 1.45, 0.9, -0.5, 0.9);
      A.glow('#ff8a30', 0, 0, 1.6, 0.55); A.glow('#ffc060', 0, 0, 1.68, 0.32);
    },
  },
  log: {
    col: FPI_C.drift,
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.rad + 0.05, p.rad * 2)]; },
    b3(p, A) {
      const c = p.mast ? '#4a3c2c' : FPI_C.drift;
      A.log(c, 0, 0, p.rad * 0.9, p.rad, p.len, 0, 0, 'cyl6');
      if (p.mast) { A.log(c, p.len * 0.2, 0, 0.25, 0.14, 3.2, Math.PI / 2 + 0.2); A.cyl(FPI_C.iron, p.len * 0.42, 0, 0.3 - 0.33, 0.34, 0.12, 0, 0, Math.PI / 2); A.box(FPI_C.rope, p.len * 0.1, 0.8, 0.02, 2.2, 0.06, 0.06, 0.4); return; }
      A.part('ico', c, p.len / 2, 0, p.rad, p.rad * 3.2, p.rad * 2.6, p.rad * 3.2, A.r() * 3);
      A.log(c, -p.len * 0.15, p.rad * 1.6, p.rad, p.rad * 0.4, p.len * 0.3, 0.7);
    },
  },
  plank: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.w / 2 + 0.05, p.beam ? 0.5 : 0.32)]; },
    b3(p, A) {
      if (p.beam) { A.box(FPI_C.wood3, 0, 0, 0, p.len, p.w, p.w, 0, 0, 0.12); return; }
      A.box(FPI_C.wood3, 0, 0, 0, p.len, p.w, 0.12, 0.05);
      A.box(FPI_C.wood, p.len * 0.1, p.w * 0.2, 0.12, p.len * 0.7, p.w * 0.7, 0.1, -0.08);
      A.box(FPI_C.iron, -p.len * 0.3, 0, 0.12, 0.05, p.w * 1.02, 0.06);
    },
  },
  cannon: {
    col: FPI_C.iron,
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, 0.4, 0.62)]; },
    b3(p, A) {
      A.part('cannon', FPI_C.iron, 0, 0, 0.3, 0.6, p.len, 0.6, 0, 0, Math.PI / 2 + 0.06);
      A.part('sph', FPI_C.iron, -p.len / 2 - 0.1, 0, 0.36, 0.3, 0.3, 0.3);
      A.log(FPI_C.iron, p.len / 2 - 0.05, 0, 0.27, 0.22, 0.12, 0);
      A.log(FPI_C.iron, -p.len * 0.08, 0, 0.32, 0.08, 0.75, Math.PI / 2);
      A.box(FPI_C.wood3, 0.1, 0, 0, p.len * 0.6, 0.75, 0.16, 0.08);
    },
  },
  anchor: {
    col: FPI_C.iron,
    sol(p) { return [fpiBox(p, 0, 0, 1.0, 0.3, 1.3)]; },
    b3(p, A) {
      A.box(FPI_C.iron, 0, 0, 0, 0.16, 0.16, 2.0, 0, 0, -0.55);
      A.part('half', FPI_C.iron, 0.45, 0, 0.1, 0.25, 1.6, 0.16, 0, 0, 0);
      A.log(FPI_C.wood3, -0.62, 0, 1.15, 0.08, 1.6, Math.PI / 2, 0.6);
      A.part('torus', FPI_C.iron, -0.92, 0, 1.55, 0.35, 0.35, 0.6);
    },
  },
  cairn: {
    col: '#5e605a',
    sol(p) { return [fpiCirc(p, 0, 0, p.r, p.hh)]; },
    b3(p, A) {
      const tiers = 4;
      for (let t = 0; t < tiers; t++) { const k = 1 - t / tiers, n = Math.max(1, 6 - t * 2); for (let i = 0; i < n; i++) { const a = i / n * 6.28 + t; A.part('ico', A.r() < 0.5 ? FPI_C.stone : FPI_C.stone3, Math.cos(a) * p.r * 0.55 * k, Math.sin(a) * p.r * 0.55 * k, t * p.hh / tiers + 0.15, p.r * 0.8 * k + 0.2, p.hh / tiers * 1.4, p.r * 0.8 * k + 0.2, A.r() * 3); } }
    },
  },
  roof: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.z0 + p.rise, { z0: p.z0, mv: false })]; },
    b3(p, A) {
      const pitch = Math.atan2(p.rise, p.w / 2), sl = Math.hypot(p.w / 2, p.rise) + 0.3, c = p.mat === 'straw' ? FPI_C.straw : FPI_C.wood3, segs = 4;
      for (const side of [-1, 1]) for (let k = 0; k < segs; k++) {
        if (p.mat !== 'straw' && side > 0 && k === 1) { for (let r = 0; r < 4; r++) A.part('box', FPI_C.wood, side * p.w / 4, -p.d / 2 + (k + 0.15 + r * 0.23) * p.d / segs, p.z0 + p.rise / 2, sl, 0.1, 0.1, 0, 0, -side * pitch); continue; }
        A.part('box', c, side * (p.w / 4 + 0.05), -p.d / 2 + (k + 0.5) * p.d / segs, p.z0 + p.rise / 2 + 0.05, sl, p.mat === 'straw' ? 0.32 : 0.1, p.d / segs + 0.02, 0, 0, -side * pitch);
      }
      A.log(FPI_C.wood3, 0, 0, p.z0 + p.rise + 0.05, 0.1, p.d + 0.3, Math.PI / 2);
      for (const e of [-1, 1]) A.part('tri', p.mat === 'straw' ? FPI_C.wood3 : FPI_C.wood, 0, e * (p.d / 2 - 0.15), p.z0 + p.rise / 3, p.w / 0.866, 0.15, p.rise / 0.75, 0, -Math.PI / 2, 0);
    },
  },
  jetty: {
    col: FPI_C.wood,
    sol(p) { return [fpiBox(p, p.len / 2 + 0.5, 0, p.len / 2, p.w / 2, 0.85, { z0: 0.6, mv: false, ray: false, occ: false }), fpiBox(p, -0.4, 0, 0.9, p.w / 2 + 0.3, 0.5, { col: FPI_C.stone })]; },
    b3(p, A) {
      const n = Math.floor(p.len / 0.55);
      A.box(FPI_C.stone, -0.4, 0, -0.3, 1.8, p.w + 0.6, 0.8); A.box(FPI_C.stone2, -1.4, 0, -0.3, 1.0, p.w + 0.2, 0.5);
      for (let i = 0; i < n; i++) A.box(i % 3 ? FPI_C.wood : FPI_C.wood2, 0.5 + (i + 0.5) * p.len / n, (A.r() - 0.5) * 0.06, 0.72, p.len / n * 0.88, p.w, 0.09, (A.r() - 0.5) * 0.03);
      for (const s of [-1, 1]) A.box(FPI_C.wood3, 0.5 + p.len / 2, s * (p.w / 2 - 0.15), 0.55, p.len, 0.2, 0.18);
      for (let u = 1.5; u <= p.len + 0.5; u += 3) for (const s of [-1, 1]) A.cyl(FPI_C.wood3, u, s * (p.w / 2 + 0.05), -2.6, 0.15, 3.6 + (u > p.len - 1 ? 0.5 : 0), 0, 0, 0, 'cyl6');
      A.cyl(FPI_C.iron, p.len - 0.2, p.w / 2 - 0.3, 0.8, 0.12, 0.35, 0, 0, 0, 'cyl6');
      A.cyl(FPI_C.rope, p.len - 0.2, p.w / 2 - 0.3, 0.92, 0.17, 0.1, 0, 0, 0, 'cyl8');
      // a rowing boat moored alongside, the right way up
      const bu = p.len - 4, bv = p.w / 2 + 1.3;
      A.part('half', FPI_C.paint[0], bu, bv, -FPSC.GROUND + 0.35, 1.4, 4.2, 0.85, -Math.PI / 2 + 0.06, 0, -Math.PI / 2);
      A.box(FPI_C.wood3, bu, bv, -FPSC.GROUND + 0.18, 0.25, 1.3, 0.08, 0.06);
      A.box(FPI_C.rope, bu + 1.9, bv - 0.6, 0.0, 1.4, 0.04, 0.04, 0.6);
    },
  },
  stair: {
    col: FPI_C.stone3,
    sol(p) { const out = []; for (let i = 0; i < p.n; i++) { const u = (i + 0.5) * p.tread; if (u > 5) break; out.push(fpiBox(p, u, 0, p.tread / 2, p.w / 2, (i + 1) * p.rise)); } return out; },
    b3(p, A) {
      for (let i = 0; i < p.n; i++) {
        const u = (i + 0.5) * p.tread, h = (i + 1) * p.rise;
        A.box(i % 2 ? FPI_C.stone3 : FPI_C.stone, u, (A.r() - 0.5) * 0.08, -0.4, p.tread * 1.04, p.w, h + 0.4);
        for (const s of [-1, 1]) A.box(FPI_C.stone2, u, s * (p.w / 2 + 0.25), -0.4, p.tread * 1.02, 0.5, h + 0.4 + 0.45 + A.r() * 0.2);
      }
    },
  },
  tree: {
    col: '#3a3028',
    sol(p) { return [fpiCirc(p, 0, 0, 0.42, p.hh)]; },
    b3(p, A) {
      const lean = p.bent ? 0.32 : 0.06;
      A.part('trunk', '#3a3028', 0, 0, p.hh * 0.32, 0.75, p.hh * 0.7, 0.75, 0, 0, lean);
      const tx = -Math.sin(lean) * p.hh * 0.62, ty = p.hh * 0.66;
      const n = p.bent ? 4 : 6;
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.28 + A.r(), len = p.hh * (0.3 + A.r() * 0.25), up = 0.5 + A.r() * 0.6;
        const dx = Math.cos(a) * Math.sin(up), dz = Math.cos(up), dy = Math.sin(a) * Math.sin(up);
        A.part('trunk', '#3a3028', tx + dx * len / 2 - (p.bent ? len * 0.3 : 0), dy * len / 2, ty + dz * len / 2, 0.16, len, 0.16, a, 0, up);
        A.part('trunk', '#3a3028', tx + dx * len * 0.95, dy * len * 0.95, ty + dz * len + 0.2, 0.06, len * 0.5, 0.06, a + 1, 0, up + 0.5);
      }
      if (p.bent) A.part('ico', '#2c3a24', tx - 0.8, 0, ty + 0.5, 2.2, 1.0, 1.6, 0.3);
    },
  },
  fence: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, 0.12, 1.1, { ray: false, occ: false })]; },
    b3(p, A) {
      const n = Math.max(2, Math.round(p.len / 2));
      for (let i = 0; i <= n; i++) A.cyl(FPI_C.wood3, -p.len / 2 + i * p.len / n, 0, -0.2, 0.07, 1.35, 0, 0, (A.r() - 0.5) * 0.12, 'cyl6');
      for (let i = 0; i < n; i++) for (const h of [0.45, 0.95]) { if (A.r() < 0.12) continue; A.box(FPI_C.wood, -p.len / 2 + (i + 0.5) * p.len / n, 0.06, h, p.len / n, 0.04, 0.1, 0, (A.r() - 0.5) * 0.06); }
    },
  },
  peat: {
    col: FPI_C.peat,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh)]; },
    b3(p, A) {
      const rows = Math.round(p.hh / 0.2);
      for (let r = 0; r < rows; r++) { const k = 1 - r * 0.08; for (let i = 0; i < 3; i++) A.box(A.r() < 0.5 ? FPI_C.peat : '#2e2216', (i - 1) * p.w / 3 * k, 0, r * 0.2, p.w / 3 * k * 0.96, p.d * k, 0.19, A.r() * 0.08); }
    },
  },
};
// things that don't stand in the way: pools, reeds, grass, stones, seaweed, boardwalks, footprints
const FPI_D = {
  pool(d, A) {
    A.part('disc', '#1a2a34', 0, 0, 0.03, d.rx * 2, 1, d.ry * 2, 0, 0, 0, 'water');
    A.part('disc', '#000', 0, 0, 0.025, d.rx * 2.3, 1, d.ry * 2.4, 0, 0, 0, 'decal');
    const n = Math.round(d.rx * 3);
    for (let i = 0; i < n; i++) { const a = i / n * 6.28 + A.r() * 0.4; A.part('ico', A.r() < 0.5 ? '#3a3e40' : '#4a4c48', Math.cos(a) * d.rx, Math.sin(a) * d.ry, 0.04, 0.3 + A.r() * 0.4, 0.18, 0.3 + A.r() * 0.3, A.r() * 3); }
    if (A.I.id !== 'marsh') for (let i = 0; i < 3; i++) A.part('ico', '#2e3a2c', (A.r() - 0.5) * d.rx, (A.r() - 0.5) * d.ry, -0.02, 0.4, 0.1, 0.3, A.r() * 3);
  },
  reed(d, A) {
    const n = 9 + Math.floor(A.r() * 7);
    for (let i = 0; i < n; i++) {
      const a = A.r() * 6.28, r = A.r() * 0.45 * d.s, h = (1.0 + A.r() * 0.9) * d.s;
      A.part('blade', A.r() < 0.4 ? '#7a7444' : '#5a6236', Math.cos(a) * r, Math.sin(a) * r, 0, 0.07, h, 1, A.r() * 3, (A.r() - 0.5) * 0.3, (A.r() - 0.5) * 0.3);
      if (A.r() < 0.3) A.part('box', '#3a2a1a', Math.cos(a) * r, Math.sin(a) * r, h * 0.9, 0.05, 0.22, 0.05);
    }
  },
  tuft(d, A) { const n = 3 + Math.floor(A.r() * 3); for (let i = 0; i < n; i++) A.part('blade', d.c, (A.r() - 0.5) * 0.25, (A.r() - 0.5) * 0.25, 0, 0.12, (0.25 + A.r() * 0.3) * d.s, 1, A.r() * 3, (A.r() - 0.5) * 0.8, (A.r() - 0.5) * 0.8); },
  pebble(d, A) { A.part('ico', A.r() < 0.5 ? '#6a6862' : '#55534e', 0, 0, d.s * 0.2, d.s, d.s * 0.6, d.s * 0.85, A.r() * 3); },
  wetstone(d, A) { A.part('ico', '#26292c', 0, 0, -0.1, d.s * 1.6, d.s, d.s * 1.3, A.r() * 3, 0, 0, 'wet'); },
  wrack(d, A) { A.box(A.r() < 0.5 ? '#2a2e1c' : '#3a321e', 0, 0, 0.01, d.s, 0.18 + A.r() * 0.2, 0.04, 0); },
  print(d, A) { A.part('disc', '#000', 0, 0, 0.05, 0.28, 1, 0.12, 0, 0, 0, 'decal'); },
  walk(d, A) {
    const n = Math.floor(d.len / 0.4);
    for (let i = 0; i < n; i++) A.box(i % 2 ? FPI_C.wood : FPI_C.wood2, -d.len / 2 + (i + 0.5) * d.len / n, (A.r() - 0.5) * 0.05, 0.06, d.len / n * 0.85, d.w, 0.06, (A.r() - 0.5) * 0.06);
    for (let u = -d.len / 2 + 0.4; u < d.len / 2; u += 2) for (const s of [-1, 1]) A.cyl(FPI_C.wood3, u, s * d.w * 0.45, -0.3, 0.06, 0.45, 0, 0, 0, 'cyl6');
  },
};

// ---------- the island in 3D ----------
let FPI_TPL = null;
const FPI_DIM = 0.5;
function fpiTpl() {
  if (FPI_TPL) return FPI_TPL;
  const ni = geo => { const n = geo.index ? geo.toNonIndexed() : geo; if (n !== geo) geo.dispose(); for (const a of ['normal', 'uv']) if (n.attributes[a]) n.deleteAttribute(a); return n; };
  const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0], 3));
  const taper = new THREE.CylinderGeometry(0.36, 0.5, 1, 4); taper.rotateY(Math.PI / 4); taper.scale(Math.SQRT2, 1, Math.SQRT2);
  const trunk = new THREE.CylinderGeometry(0.3, 0.5, 1, 6);
  const disc = new THREE.CircleGeometry(0.5, 12); disc.rotateX(-Math.PI / 2);
  const hull = new THREE.CylinderGeometry(0.32, 0.5, 1, 10, 1, true, 0, Math.PI);
  const cannon = new THREE.CylinderGeometry(0.32, 0.5, 1, 8);
  FPI_TPL = {
    box: ni(new THREE.BoxGeometry(1, 1, 1)), cyl6: ni(new THREE.CylinderGeometry(0.5, 0.5, 1, 6)), cyl8: ni(new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),
    taper: ni(taper), trunk: ni(trunk), cone: ni(new THREE.ConeGeometry(0.5, 1, 7)), ico: ni(new THREE.IcosahedronGeometry(0.5, 0)), sph: ni(new THREE.SphereGeometry(0.5, 6, 4)),
    half: ni(new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, false, 0, Math.PI)), boathull: ni(hull), cannon: ni(cannon), torus: ni(new THREE.TorusGeometry(0.5, 0.07, 4, 10)),
    tri: ni(new THREE.CylinderGeometry(0.5, 0.5, 1, 3)), disc: ni(disc), blade,
  };
  return FPI_TPL;
}
function FpiMerge() { this.p = []; this.c = []; }
FpiMerge.prototype.add = function (geo, m, col, k) {
  const P = geo.attributes.position, e = m.elements, r = col.r * k, gg = col.g * k, b = col.b * k;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    this.p.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
    this.c.push(r, gg, b);
  }
};
FpiMerge.prototype.mesh = function (mat) {
  if (!this.p.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
  geo.computeVertexNormals(); geo.computeBoundingSphere();
  return new THREE.Mesh(geo, mat);
};
function fpiBuilder(M, I) {
  const T = fpiTpl(), PM = new THREE.Matrix4(), LM = new THREE.Matrix4(), WM = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const pv = new THREE.Vector3(), sv = new THREE.Vector3(), cols = new Map(), rnd = seeded((I.seed * 31 + 7) >>> 0);
  // (props are coloured as by day and darkened here for the night, so they sit with the ground; glows aren't)
  const col = (s, lit) => { const k = s + (lit ? '!' : ''); let c = cols.get(k); if (!c) { c = new THREE.Color(s); if (!lit) c.multiplyScalar(FPI_DIM); cols.set(k, c); } return c; };
  const A = {
    I, r: rnd,
    at(x, y, z, ang) { e.set(0, ang || 0, 0); q.setFromEuler(e); PM.compose(pv.set(x, z, -y), q, sv.set(1, 1, 1)); },
    part(tpl, c, u, v, hc, sx, sy, sz, ry, rx, rz, into) {
      e.set(rx || 0, ry || 0, rz || 0); q.setFromEuler(e);
      LM.compose(pv.set(u, hc, -v), q, sv.set(sx, sy, sz)); WM.multiplyMatrices(PM, LM);
      const k = into === 'decal' ? 1 : 0.88 + 0.24 * rnd();
      M[into || (tpl === 'blade' ? 'leaf' : 'solid')].add(T[tpl], WM, col(c, into === 'glow'), k);
    },
    box(c, u, v, h0, w, d, hh, ry, rx, rz) { A.part('box', c, u, v, h0 + hh / 2, w, hh, d, ry, rx, rz); },
    cyl(c, u, v, h0, r, hh, ry, rx, rz, tpl) { A.part(tpl || 'cyl8', c, u, v, h0 + hh / 2, r * 2, hh, r * 2, ry, rx, rz); },
    log(c, u, v, hc, r, len, ry, tilt, tpl) { A.part(tpl || 'cyl6', c, u, v, hc, r * 2, len, r * 2, ry || 0, 0, Math.PI / 2 + (tilt || 0)); },
    glow(c, u, v, hc, s) { A.part('sph', c, u, v, hc, s, s, s, 0, 0, 0, 'glow'); },
  };
  return A;
}
// the ground: a disc with gentle rises, patches of its two colours, worn tracks, a wet band at the shore,
// the beach running down under the water
function fpsIsleGround(I, B) {
  const T = I.T, X = FPSC.CX, Y = FPSC.CY, IR = FPSC.R, Z = FPSC.GROUND;
  const head = new THREE.Color(B.head[1]), mixc = (c, k) => head.clone().lerp(new THREE.Color(c), k);
  const c0 = mixc(T.ground, T.tint), c1 = mixc(T.ground2, T.tint), cw = mixc(T.wet, T.tint + 0.1), cp = mixc(T.path, T.tint), cs = mixc(T.ground, T.tint * 0.6);
  const SEG = 144, RINGS = 38, BEACH = [[2.5, -0.15], [7, -0.6], [14, -1.2]], pos = [], col = [], idx = [];
  const edge = a => IR * (1 + 0.035 * Math.sin(a * 5 + 1) + 0.02 * Math.sin(a * 13));
  const segs = []; for (const t of I.tracks) for (let i = 0; i < t.length - 1; i++) segs.push([t[i], t[i + 1]]);
  const trackD = (x, y) => { let best = 9; for (const [[ax, ay], [bx, by]] of segs) { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y)); } return best; };
  const cover = (x, y) => { let k = 0; for (const s of I.solids) { if (s.mv === false && s.ray === false) continue; const d = fpiDist(s, x, y); if (d < 1.4) k = Math.max(k, 1 - d / 1.4); } return k; };
  const tmp = new THREE.Color();
  const colAt = (x, y, r, e, i, j) => {
    const n = fpiNoise(x / 8, y / 8, I.seed + 5), n2 = fpiNoise(x / 2.5, y / 2.5, I.seed + 9);
    tmp.copy(c0).lerp(c1, clamp((n - 0.35) / 0.4, 0, 1) * 0.85 + n2 * 0.15);
    const wet = clamp((r - (e - 6)) / 6, 0, 1); if (wet > 0) tmp.lerp(cw, wet * 0.85);
    if (r > e) tmp.copy(cs).lerp(cw, 0.7);
    const td = trackD(x, y); if (td < 1.6) tmp.lerp(cp, (1 - td / 1.6) * 0.6);
    const cv = cover(x, y); if (cv > 0) tmp.multiplyScalar(1 - cv * 0.3);
    const k = 0.92 + 0.16 * fpiHash(i * 977 + j, I.seed);
    return [tmp.r * k, tmp.g * k, tmp.b * k];
  };
  pos.push(X, Z + fpsIsleH(I, X, Y), -Y); col.push(...colAt(X, Y, 0, IR, 0, 0));
  for (let i = 1; i <= RINGS + BEACH.length; i++) for (let j = 0; j < SEG; j++) {
    const a = j / SEG * Math.PI * 2, e = edge(a), r = i <= RINGS ? e * i / RINGS : e + BEACH[i - RINGS - 1][0];
    const x = X + Math.cos(a) * r, y = Y + Math.sin(a) * r;
    const z = i <= RINGS ? Z + fpsIsleH(I, x, y) + 0.04 * Math.sin(a * 7 + i) * (i / RINGS) : Z + BEACH[i - RINGS - 1][1];
    pos.push(x, z, -y); col.push(...colAt(x, y, r, e, i, j));
  }
  const at = (i, j) => 1 + (i - 1) * SEG + (j % SEG);
  for (let j = 0; j < SEG; j++) idx.push(0, at(1, j), at(1, j + 1));
  for (let i = 1; i < RINGS + BEACH.length; i++) for (let j = 0; j < SEG; j++) { const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j), d = at(i + 1, j + 1); idx.push(a, c, d, a, d, b); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  // the surf: a band of foam where the beach meets the sea, added on top so it only ever brightens
  const fp = [], fc = [], fi = [], FS = 3, FR = [[0.6, 0], [2.6, 1], [5.2, 0]];
  for (let k = 0; k < FS; k++) for (let j = 0; j < SEG; j++) {
    const a = j / SEG * Math.PI * 2, e = edge(a), r = e + FR[k][0], z = Z - 0.15 * Math.min(1, FR[k][0] / 2.5) - Math.max(0, FR[k][0] - 2.5) * 0.1 + 0.16;
    fp.push(X + Math.cos(a) * r, z, -(Y + Math.sin(a) * r));
    const v = FR[k][1] * (0.45 + 0.55 * fpiNoise(j / 3, k, I.seed)); fc.push(v, v, v);
  }
  for (let k = 0; k < FS - 1; k++) for (let j = 0; j < SEG; j++) { const a = k * SEG + j, b = k * SEG + (j + 1) % SEG, c = a + SEG, d = b + SEG; fi.push(a, c, d, a, d, b); }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3)); fg.setIndex(fi);
  const foamM = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const foam = new THREE.Mesh(fg, foamM); foam.renderOrder = 2;
  return { ground, foam, foamM };
}
// everything on the island, merged by material into a few meshes; three small lights for the nearest lanterns and fires
function fpsIsle3D(grp, B) {
  const I = g.isle; if (!I) return;
  const M = { solid: new FpiMerge(), leaf: new FpiMerge(), glow: new FpiMerge(), water: new FpiMerge(), decal: new FpiMerge(), wet: new FpiMerge() };
  const A = fpiBuilder(M, I), Z = FPSC.GROUND;
  const { ground, foam, foamM } = fpsIsleGround(I, B);
  grp.add(ground); grp.add(foam);
  for (const p of I.props) {
    const K = FPI_K[p.k]; if (!K || !K.b3) continue;
    A.at(p.x, p.y, Z + fpsIsleH(I, p.x, p.y) - 0.03 + (p.lift || 0), p.ang);
    K.b3(p, A);
    // a soft shadow underneath
    if (p.k !== 'jetty' && p.k !== 'roof' && !K.noShadow) for (const s of p.sol) {
      if (s.mv === false) continue;
      A.at(s.x, s.y, Z + fpsIsleH(I, s.x, s.y) + (p.lift || 0), s.ang);
      if (s.s === 'c') A.part('disc', '#000', 0, 0, 0.04, s.r * 2.6, 1, s.r * 2.6, 0, 0, 0, 'decal');
      else A.part('disc', '#000', 0, 0, 0.04, s.hw * 2 + 0.9, 1, s.hd * 2 + 0.9, 0, 0, 0, 'decal');
    }
  }
  for (const d of I.decor) {
    const f = FPI_D[d.k]; if (!f) continue;
    A.at(d.x, d.y, Z + fpsIsleH(I, d.x, d.y), d.ang || 0);
    f(d, A);
  }
  const mats = {
    solid: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    leaf: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    water: new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, opacity: 0.86, shininess: 90, specular: 0x5a6878, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    decal: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    wet: new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 60, specular: 0x3a4248, flatShading: true }),
  };
  for (const k in M) { const m = M[k].mesh(mats[k]); if (m) { if (k === 'decal' || k === 'water') m.renderOrder = 1; grp.add(m); } else mats[k].dispose(); }
  const lights = [];
  for (let i = 0; i < (I.T.nLights || 3); i++) { const L = new THREE.PointLight(0xffb060, 0, 10, 1); grp.add(L); lights.push(L); }
  GL3D.isleState = { I, lights, foamM, glowM: mats.glow };
}
// each frame: the three lights go to the island's lanterns and fires nearest you, flickering; the surf breathes
function fpsIsleFrame3D() {
  const S = GL3D.isleState; if (!S || !g.isle || S.I.key !== g.isle.key) return;
  const I = g.isle, t = reduceMotion ? 0 : g.t;
  // (by height too: in the Lighthouse's tower the floors are stacked, and a lamp a floor away is no use)
  const dd = l => Math.hypot(l.x - camX, l.y - camY, (l.z - camH) * 1.6);
  const near = I.lights.slice().sort((a, b) => dd(a) - dd(b));
  S.lights.forEach((L, i) => {
    const l = near[i]; if (!l) { L.intensity = 0; L.visible = false; return; }
    L.visible = true; L.color.set(l.c); L.distance = l.r * 1.5;
    const fl = l.k === 'fire' ? 0.8 + 0.2 * Math.sin(t * 11 + l.ph) * Math.sin(t * 3.7 + l.ph) : l.k === 'wisp' ? 0.6 + 0.3 * Math.sin(t * 1.3 + l.ph) : 0.95 + 0.05 * Math.sin(t * 8 + l.ph);
    L.intensity = (l.k === 'fire' ? 1.6 : l.k === 'wisp' ? 0.9 : 1.2) * fl;
    L.position.set(l.x, l.z + (l.k === 'wisp' ? 0.3 * Math.sin(t * 0.9 + l.ph) : 0.1), -l.y);
  });
  S.foamM.color.setScalar(0.22 + 0.1 * Math.sin(t * 1.25));
  S.glowM.color.setScalar(0.85 + 0.15 * Math.sin(t * 7.3));
}
// the painted outlines of the props, so the figures drawn over the 3D view hide behind them as behind rocks
// Each solid's outline on screen, for hiding the people and lights painted over the 3D island. A solid that
// reaches behind the camera (a wall you stand beside, the room you're in) is cut at a plane just in front of
// it rather than left out; and what counts as behind it is decided in gl3dClip by whether your line of sight
// to the thing actually crosses the solid (see fpsIsleBehind), not by comparing the solid's middle.
const FPI_CUT = 0.25;
function fpsIsleOccluders(out) {
  const I = g.isle; if (!I || I.T.indoor) return;   // (the Lighthouse paints nothing over its 3D rooms that walls need to hide)
  for (const s of I.solids) {
    if (s.occ === false || (s.ray === false && s.occ !== true)) continue;
    const c0 = cam(s.x, s.y, FPSC.GROUND), reach = s.s === 'c' ? s.r : Math.hypot(s.hw, s.hd);
    if (c0.f + reach + (s.z1 - FPSC.GROUND) < FPI_CUT || c0.f - reach > 260) continue;
    const ring = fpiCorners(s), z0 = s.z0 != null ? s.z0 : FPSC.GROUND - 0.05, n = ring.length;
    const V = []; for (const z of [z0, s.z1]) for (const [x, y] of ring) V.push([x, y, z]);
    const E = []; for (let i = 0; i < n; i++) { const j = (i + 1) % n; E.push([i, j], [i + n, j + n], [i, i + n]); }
    const C = V.map(v => cam(v[0], v[1], v[2])), sc = [];
    let fmin = 1e9, fmax = -1e9;
    const put = c => { const q = proj(c); sc.push([clamp(q.x, -1e5, 1e5), clamp(q.y, -1e5, 1e5)]); if (c.f < fmin) fmin = c.f; if (c.f > fmax) fmax = c.f; };
    for (const c of C) if (c.f >= FPI_CUT) put(c);
    for (const [a, b] of E) {
      const A = C[a], B = C[b]; if ((A.f >= FPI_CUT) === (B.f >= FPI_CUT)) continue;
      const t = (FPI_CUT - A.f) / (B.f - A.f);
      put({ r: A.r + (B.r - A.r) * t, f: FPI_CUT, z: A.z + (B.z - A.z) * t });
    }
    if (sc.length < 3) continue;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of sc) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < -50 || x0 > W + 50 || y1 < -50 || y0 > H + 50 || x1 - x0 < 2) continue;
    const h = hull(sc), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    out.push({ f: Math.max(FPI_CUT, fmin), fmax, solid: s, pts: h.map(q => [mx + (q[0] - mx) * 0.985, my + (q[1] - my) * 0.99]), x0, x1, y0, y1 });
  }
}
// is (x, y) behind solid s, seen from the camera: does the line from the camera to it cross the solid's footprint
// (and not end inside it, as a light on a crate's top does)?
function fpsIsleBehind(s, x, y) {
  if (s.s === 'c') {
    const dx = x - camX, dy = y - camY, L2 = dx * dx + dy * dy || 1;
    if (Math.hypot(x - s.x, y - s.y) < s.r + 0.3) return false;
    const t = clamp(((s.x - camX) * dx + (s.y - camY) * dy) / L2, 0, 1);
    return Math.hypot(camX + dx * t - s.x, camY + dy * t - s.y) < s.r;
  }
  // into the solid's own frame, then a slab test on the segment
  const c = Math.cos(s.ang), n = Math.sin(s.ang);
  const loc = (px, py) => { const u = px - s.x, v = py - s.y; return [u * c + v * n, -u * n + v * c]; };
  const [ax, ay] = loc(camX, camY), [bx, by] = loc(x, y);
  if (Math.abs(bx) < s.hw + 0.3 && Math.abs(by) < s.hd + 0.3) return false;
  let t0 = 0, t1 = 1;
  for (const [p, d, h] of [[ax, bx - ax, s.hw], [ay, by - ay, s.hd]]) {
    if (Math.abs(d) < 1e-9) { if (Math.abs(p) > h) return false; continue; }
    let ta = (-h - p) / d, tb = (h - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
  }
  return true;
}
function fpiCorners(s) {
  if (s.s === 'c') { const out = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; out.push([s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r]); } return out; }
  const c = Math.cos(s.ang), n = Math.sin(s.ang), out = [];
  for (const [u, v] of [[-s.hw, -s.hd], [s.hw, -s.hd], [s.hw, s.hd], [-s.hw, s.hd]]) out.push([s.x + u * c - v * n, s.y + u * n + v * c]);
  return out;
}

// ---------- the painted (Classic) island, and what both renderers paint over the top ----------
function fpsIsleGroundCss(B) { const I = g.isle; return I ? mix(B.head[1].length === 7 ? B.head[1] : '#0a0d0c', I.T.ground, I.T.tint + 0.05) : null; }
// flat things on the ground: pools and boardwalks (the Classic renderer only; 3D has its own)
function fpsIsleDrawFlat(B) {
  const I = g.isle; if (!I) return;
  const water = mix('#0a1620', I.T.wet, 0.3), wood = '#3a2c20';
  for (const d of I.decor) {
    if (d.k !== 'pool' && d.k !== 'walk') continue;
    if (Math.hypot(d.x - camX, d.y - camY) > 150) continue;
    const c = Math.cos(d.ang), s = Math.sin(d.ang), pts = [];
    if (d.k === 'pool') for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, u = Math.cos(a) * d.rx, v = Math.sin(a) * d.ry; pts.push([d.x + u * c - v * s, d.y + u * s + v * c, FPSC.GROUND + 0.02]); }
    else for (const [u, v] of [[-d.len / 2, -d.w / 2], [d.len / 2, -d.w / 2], [d.len / 2, d.w / 2], [-d.len / 2, d.w / 2]]) pts.push([d.x + u * c - v * s, d.y + u * s + v * c, FPSC.GROUND + 0.12]);
    fillPoly(pts, d.k === 'pool' ? water : wood);
  }
}
// one solid as a flat-shaded block: its sides that face you, then its top
function fpsIsleDrawSolid(s) {
  const vis = Math.max(0.5, Math.min(1, visibility(s.x, s.y) + fpsIsleLightAt(s.x, s.y)));
  const pts = fpiCorners(s), z0 = s.z0 != null ? s.z0 : FPSC.GROUND, n = pts.length, base = s.col && s.col.length === 7 ? s.col : '#55524a';
  const shade = k => mix(base, '#06080c', clamp(1 - (0.25 + 0.75 * vis) * k * 0.62, 0, 1));
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const nx = mx - s.x, ny = my - s.y;
    if (nx * (camX - mx) + ny * (camY - my) <= 0) continue;
    const lit = 0.72 + 0.2 * (nx * 0.6 + ny * 0.8) / (Math.hypot(nx, ny) || 1);
    fillPoly([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], s.z1], [a[0], a[1], s.z1]], shade(lit));
  }
  if (camH > s.z1) fillPoly(pts.map(([x, y]) => [x, y, s.z1]), shade(1));
}
// the sky a little tinted, and a low mist lying on the water (both renderers)
function fpsIsleSkyTint(c) {
  const I = g.isle; if (!I) return;
  const T = I.T, gr = c.createLinearGradient(0, 0, 0, Math.max(1, hy));
  gr.addColorStop(0, `rgba(${T.sky},${T.skyA})`); gr.addColorStop(1, `rgba(${T.sky},${T.skyA * 0.35})`);
  c.fillStyle = gr; c.fillRect(-W, -H, W * 3, hy + H);
}
function fpsIsleMist() {
  const I = g.isle; if (!I) return;
  const T = I.T, h = H * 0.07, gr = ctx.createLinearGradient(0, hy - h, 0, hy + h * 0.8);
  gr.addColorStop(0, `rgba(${T.mist},0)`); gr.addColorStop(0.55, `rgba(${T.mist},${T.mistA})`); gr.addColorStop(1, `rgba(${T.mist},0)`);
  ctx.fillStyle = gr; ctx.fillRect(-W, hy - h, W * 3, h * 1.8);
}
// the lights' glow, painted over the scene (an item, so walls in front hide it)
function fpsIsleDrawGlow(l, c) {
  const q = proj(c), t = reduceMotion ? 0 : g.t;
  const fl = l.k === 'fire' ? 0.85 + 0.15 * Math.sin(t * 13 + l.ph) * Math.sin(t * 5 + l.ph) : l.k === 'wisp' ? 0.6 + 0.4 * Math.sin(t * 1.3 + l.ph) : 1;
  const r = Math.max(1.5, (l.k === 'fire' ? 0.55 : l.k === 'wisp' ? 0.4 : 0.3) * q.s) * fl;
  ctx.globalCompositeOperation = 'lighter';
  lamp(q.x, q.y, l.c, r);
  if (l.k === 'fire' && !reduceMotion) for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3 + l.ph) % 1, s = cam(l.x + Math.sin(t + i * 2) * 0.3, l.y + Math.cos(t * 0.7 + i) * 0.3, l.z + k * 2.2); if (s.f < SK.NEAR) continue;
    const p = proj(s); ctx.globalAlpha = (1 - k) * 0.8; ctx.fillStyle = '#ffb060'; ctx.fillRect(p.x - 1, p.y - 1, 2, 2); ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
}
// gulls wheeling over the shore, pale where light catches them; bats flitting round the lights
function fpsIsleDrawBirds() {
  const I = g.isle; if (!I || !I.birds.length) return;
  const t = g.t;
  for (const b of I.birds) {
    const a = b.ph + t * b.sp, x = b.cx + Math.cos(a) * b.rad + (b.k === 'bat' ? Math.sin(t * 3.1 + b.ph) * 0.8 : 0), y = b.cy + Math.sin(a) * b.rad;
    const z = b.z + Math.sin(t * (b.k === 'bat' ? 2.3 : 0.5) + b.ph) * (b.k === 'bat' ? 0.7 : 2);
    const c = cam(x, y, z); if (c.f < SK.NEAR + 1 || c.f > 220) continue;
    const q = proj(c); if (q.x < -40 || q.x > W + 40) continue;
    const span = (b.k === 'bat' ? 0.45 : 1.3) * q.s, flap = Math.sin(t * (b.k === 'bat' ? 19 : 5) + b.ph * 3), dir = Math.sign(-b.sp * Math.cos(a - yaw)) || 1;
    if (span < 0.8) continue;
    if (b.k === 'gull') {
      const lit = Math.min(1, litAt(x, y) * 1.3 + flareAt(x, y) + 0.25);
      ctx.strokeStyle = `rgba(205,210,215,${0.35 + 0.5 * lit})`; ctx.lineWidth = Math.max(1, span * 0.08);
      ctx.beginPath(); ctx.moveTo(q.x - span / 2, q.y - flap * span * 0.22); ctx.quadraticCurveTo(q.x - span * 0.2, q.y - span * 0.14, q.x, q.y); ctx.quadraticCurveTo(q.x + span * 0.2, q.y - span * 0.14, q.x + span / 2, q.y - flap * span * 0.22); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(14,10,12,0.9)';
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - span / 2, q.y - flap * span * 0.3); ctx.lineTo(q.x - span * 0.25, q.y + span * 0.08); ctx.lineTo(q.x, q.y + span * 0.12 * dir * 0 + span * 0.1);
      ctx.lineTo(q.x + span * 0.25, q.y + span * 0.08); ctx.lineTo(q.x + span / 2, q.y - flap * span * 0.3); ctx.closePath(); ctx.fill();
    }
  }
}
