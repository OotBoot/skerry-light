'use strict';
// Skerry Links: the course. Nine holes laid out after the front nine at Pebble Beach (the real pars, the yardages near
// enough, the doglegs, the barranca short of the second green, the run out to the sea at the fourth, the cliffs from
// the fourth to the ninth, the little par 3 out on the point and the carry over the chasm at the eighth), drawn in the
// game's own look and given names of our own. The rest of the mode is src/golf.js (the round), src/golf3d.js (the 3D
// view) and src/golfnet.js (playing together).
//
// Each hole has its own frame: the tee at (0, 0), y running out towards the green, x to the right, in metres; up is z.
// A hole is written below roughly to size and then scaled (every place, not the sizes of things) so that the walk from
// the tee down the middle of the fairway to the middle of the green is its yardage. Its parts:
//   pts      the line of play, tee to the middle of the green (a fairway follows it from fw0 metres out, fw wide each side)
//   gr       the green: [x, y, rx, ry, turn] (an ellipse), gt its tilt [down x, down y] (metres of fall a metre), gb a
//            bump on it [x, y, height, spread], pin the cup [x, y] from the green's middle
//   bk       bunkers, [x, y, rx, ry, turn]          sea   the sea, as polygons; land: instead, the land as one polygon
//            and the sea all round it            ck    a creek (the barranca), as polygons, below its banks
//   el       the height of the land along the hole, evenly from tee to green       tl  the fairway's fall to the sea (x)
//   trees    [seed, how many, keep off the right]  (the trees are scattered in the rough from the seed)
// gfSurf(H, x, y) says what's underfoot there ('tee', 'fairway', 'fringe', 'green', 'rough', 'deep', 'sand', 'rock',
// 'water' or 'out'), gfH(H, x, y) how high the ground is, gfNorm the slope. The 3D view and the ball both use them, so
// what you see is what the ball meets.

const GF_YD = 0.9144;   // (metres in a yard)
const GF_RAW = [
  { n: 'The Gate', par: 4, yd: 377, pts: [[0, 0], [0, 215], [38, 330]], fw: 17, fw0: 55,
    gr: [38, 330, 13, 11, 0.5], gt: [0.004, -0.018], gb: [4, 4, 0.25, 5], pin: [3, -2],
    bk: [[24, 205, 9, 5.5, 0.4], [24, 322, 5, 4, 0.2], [53, 338, 4, 6, 0.3]], el: [16, 17, 19, 21], trees: [11, 70, 0] },
  { n: 'The Long Road', par: 5, yd: 511, pts: [[0, 0], [-8, 240], [-2, 467]], fw: 18, fw0: 50,
    gr: [-2, 467, 12, 14, 0], gt: [-0.006, -0.02], gb: [-4, 5, 0.3, 4], pin: [-4, 4],
    bk: [[-26, 200, 8, 5, 0.2], [15, 292, 7, 5, -0.3], [-17, 459, 5, 4, 0.4], [14, 471, 6, 4, -0.4]],
    ck: [[[-200, 392], [-20, 395], [0, 398], [30, 394], [200, 392], [200, 400], [30, 403], [0, 406], [-20, 403], [-200, 401]]],
    el: [21, 22, 22, 20, 21], trees: [22, 90, 0] },
  { n: 'Down to the Cove', par: 4, yd: 404, pts: [[0, 0], [4, 215], [-88, 330]], fw: 16, fw0: 50,
    gr: [-88, 330, 12, 10, -0.6], gt: [0.012, -0.012], gb: [-5, 3, 0.25, 4], pin: [-4, 2],
    bk: [[-18, 226, 10, 6, 0.6], [-77, 321, 5, 4, -0.5], [-97, 341, 6, 4, -0.6]],
    sea: [[[-2400, 380], [-170, 400], [-150, 520], [-160, 2400], [-2400, 2400]]],
    el: [24, 21, 17, 14], trees: [33, 80, 0] },
  { n: 'First Sight of the Sea', par: 4, yd: 331, pts: [[0, 0], [-4, 170], [6, 303]], fw: 15, fw0: 40, tl: 0.02,
    gr: [6, 303, 9, 10, 0], gt: [-0.008, -0.022], gb: [2, -3, 0.2, 3], pin: [-2, 3],
    bk: [[-13, 192, 6, 9, 0.1], [-10, 300, 5, 4, 0.3], [14, 296, 4, 5, -0.3]],
    sea: [[[44, -300], [40, 60], [46, 150], [37, 240], [31, 310], [35, 360], [60, 430], [2400, 430], [2400, -300]]],
    el: [12, 11, 10, 10], trees: [44, 60, 1] },
  { n: "Cliff's Edge", par: 3, yd: 192, pts: [[0, 0], [4, 176]], fw: 14, fw0: 110, tl: 0.02,
    gr: [4, 176, 10, 12, 0.2], gt: [0.01, -0.016], gb: [-3, 4, 0.2, 3], pin: [2, 3],
    bk: [[-12, 168, 5, 6, 0.2], [-6, 190, 6, 3, 0.4]],
    sea: [[[36, -300], [32, 80], [24, 150], [21, 200], [34, 250], [2400, 250], [2400, -300]]],
    el: [14, 13], trees: [55, 50, 1] },
  { n: 'The Climb', par: 5, yd: 506, pts: [[0, 0], [-6, 250], [12, 463]], fw: 18, fw0: 45, tl: 0.015,
    gr: [12, 463, 13, 12, 0.3], gt: [0.004, -0.024], gb: [-4, 2, 0.3, 4], pin: [3, 3],
    bk: [[-21, 240, 9, 6, 0.1], [-5, 332, 6, 5, 0.4], [0, 454, 5, 4, 0.3], [25, 470, 4, 5, -0.2]],
    sea: [[[38, -300], [36, 120], [42, 250], [36, 360], [44, 470], [40, 560], [2400, 560], [2400, -300]]],
    el: [12, 10, 9, 14, 24, 29, 30], trees: [66, 70, 1] },
  { n: 'The Point', par: 3, yd: 109, pts: [[0, 0], [0, 100]], fw: 0, fw0: 999,
    gr: [0, 100, 8, 10, 0.1], gt: [0.006, 0.02], gb: [-2, -3, 0.15, 3], pin: [-1, -2],
    bk: [[-10, 96, 4, 5, 0.2], [10, 92, 4, 4, 0], [-4, 111, 5, 2.5, 0.2], [9, 107, 3, 3, 0]],
    land: [[-2400, -2400], [2400, -2400], [2400, -40], [40, -20], [30, 40], [22, 72], [16, 106], [4, 117], [-12, 115], [-21, 98], [-26, 62], [-60, 30], [-2400, 20]],
    el: [16, 10, 5], trees: [77, 30, 1] },
  { n: 'The Chasm', par: 4, yd: 427, pts: [[0, 0], [0, 240], [-8, 390]], fw: 17, fw0: 50,
    gr: [-8, 390, 10, 9, 0.2], gt: [-0.01, 0.018], gb: [2, 2, 0.25, 3], pin: [2, -2],
    bk: [[-20, 384, 4, 6, 0.1], [5, 399, 5, 4, -0.3], [-14, 404, 6, 3, 0.2]],
    sea: [[[40, -300], [34, 100], [38, 255], [12, 262], [-16, 272], [-23, 296], [-12, 320], [14, 326], [30, 342], [22, 382], [18, 420], [30, 520], [2400, 520], [2400, -300]]],
    el: [18, 24, 25, 24, 20], trees: [88, 60, 1] },
  { n: 'Homeward Cliff', par: 4, yd: 481, pts: [[0, 0], [-6, 240], [-22, 440]], fw: 17, fw0: 45, tl: 0.03,
    gr: [-22, 440, 12, 13, -0.2], gt: [0.012, -0.016], gb: [-3, 3, 0.25, 4], pin: [-3, 2],
    bk: [[-25, 236, 8, 6, 0.1], [-37, 432, 5, 6, 0.3], [-10, 450, 5, 3, -0.2]],
    sea: [[[34, -300], [30, 120], [26, 260], [16, 380], [8, 470], [10, 560], [2400, 560], [2400, -300]]],
    el: [20, 18, 16, 15], trees: [99, 60, 1] },
];

// ---------- small geometry ----------
function gfSegD(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function gfInPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function gfPolyD(P, x, y) { let d = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) d = Math.min(d, gfSegD(x, y, P[j][0], P[j][1], P[i][0], P[i][1])); return d; }
function gfPathLen(P) { let l = 0; for (let i = 1; i < P.length; i++) l += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return l; }
// the part of a line from d0 metres along it to d1
function gfSlice(P, d0, d1) {
  const out = []; let s = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const at = d => [a[0] + (b[0] - a[0]) * (d - s) / l, a[1] + (b[1] - a[1]) * (d - s) / l];
    if (s + l >= d0 && s <= d1) { if (!out.length) out.push(at(Math.max(d0, s))); out.push(at(Math.min(d1, s + l))); }
    s += l;
  }
  return out;
}
const gfSmooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// where (x, y) sits in an ellipse [cx, cy, rx, ry, turn]: under 1 inside
function gfEll(E, x, y, grow) { const c = Math.cos(E[4] || 0), s = Math.sin(E[4] || 0), u = (x - E[0]) * c + (y - E[1]) * s, v = -(x - E[0]) * s + (y - E[1]) * c, g = grow || 0; return Math.hypot(u / (E[2] + g), v / (E[3] + g)); }
// a seeded random number run (the trees: the same on every screen)
function gfRng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- the holes, made ready ----------
function gfBuildHole(i) {
  const R = GF_RAW[i], k = R.yd * GF_YD / gfPathLen(R.pts), S = p => [p[0] * k, p[1] * k];
  const H = { i, n: R.n, par: R.par, yd: R.yd, k, pts: R.pts.map(S), fw: R.fw, fw0: R.fw0 * k, tl: R.tl || 0, el: R.el };
  H.len = gfPathLen(H.pts);
  H.fwy = R.fw ? gfSlice(H.pts, H.fw0, H.len - 8) : [];
  const g = R.gr; H.gr = [g[0] * k, g[1] * k, g[2], g[3], g[4]]; H.gt = [R.gt[0] * 0.75, R.gt[1] * 0.75]; H.gb = [H.gr[0] + R.gb[0], H.gr[1] + R.gb[1], R.gb[2], R.gb[3]];
  H.pin = [H.gr[0] + R.pin[0], H.gr[1] + R.pin[1]];
  H.bk = (R.bk || []).map(b => [b[0] * k, b[1] * k, b[2], b[3], b[4]]);
  // (big polygons scale too, which only matters near the hole)
  H.sea = (R.sea || []).map(P => P.map(S)); H.land = R.land ? R.land.map(S) : null; H.ck = (R.ck || []).map(P => P.map(S));
  H.dir = Math.atan2(H.pin[0], H.pin[1]);   // (tee to pin, as a bearing: 0 is straight up the frame)
  H.tl2 = Math.hypot(H.pin[0], H.pin[1]);
  // how far the course runs: everything within this box is drawn in detail and in play
  let x0 = 1e9, x1 = -1e9, y0 = -40, y1 = -1e9;
  for (const p of H.pts.concat([H.pin])) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  H.box = [Math.floor(x0 - 110), Math.floor(y0), Math.ceil(x1 + 110), Math.ceil(y1 + 70)];
  H.greenH = 0; H.greenH = gfBase(H, H.gr[0], H.gr[1]) + 0.35;
  H.teeH = gfBase(H, 0, 0) + 0.25;
  gfTrees(H, R.trees || [i, 50, 0]);
  return H;
}
// the land's run along the hole, before the greens, tees, bunkers and cliffs shape it
function gfBase(H, x, y) {
  const t = Math.max(0, Math.min(1, (x * Math.sin(H.dir) + y * Math.cos(H.dir)) / H.tl2)), E = H.el, f = t * (E.length - 1), a = Math.min(E.length - 2, Math.floor(f)), u = f - a;
  const b = E.length > 1 ? E[a] + (E[a + 1] - E[a]) * (u * u * (3 - 2 * u)) : E[0];
  const wav = Math.sin(x * 0.031 + y * 0.017) * 0.7 + Math.sin(-x * 0.023 + y * 0.041 + 1.3) * 0.55 + Math.sin(x * 0.07 - y * 0.05 + 2.1) * 0.25;
  return b + wav - x * H.tl;
}
// how far from the sea (below 0: in it)
function gfSeaD(H, x, y) {
  if (H.land) { const d = gfPolyD(H.land, x, y); return gfInPoly(H.land, x, y) ? d : -d; }
  let d = 1e9, inn = false;
  for (const P of H.sea) { d = Math.min(d, gfPolyD(P, x, y)); if (gfInPoly(P, x, y)) inn = true; }
  return inn ? -d : d;
}
const GF_CLIFF = 5;   // (how wide the drop from the turf to the sea is)
function gfH(H, x, y) {
  let h = gfBase(H, x, y);
  // the green: a tilted plane with a bump on it, blended into the land round it
  const e = gfEll(H.gr, x, y);
  if (e < 1.9) {
    const gh = H.greenH - H.gt[0] * (x - H.gr[0]) - H.gt[1] * (y - H.gr[1]) + H.gb[2] * Math.exp(-((x - H.gb[0]) ** 2 + (y - H.gb[1]) ** 2) / (H.gb[3] * H.gb[3]));
    h += (gh - h) * (1 - gfSmooth(1.05, 1.9, e));
  }
  // the tee: flat
  const td = Math.hypot(x, y); if (td < 14) h += (H.teeH - h) * (1 - gfSmooth(5, 14, td));
  // bunkers: dished
  for (const b of H.bk) { const q = gfEll(b, x, y); if (q < 1.25) h -= 0.55 * (1 - gfSmooth(0.55, 1.2, q)); }
  // the creek: cut down below its banks
  for (const P of H.ck) { if (gfInPoly(P, x, y)) { h -= 1.8; break; } const d = gfPolyD(P, x, y); if (d < 3) h -= 1.8 * (1 - d / 3); }
  // the cliffs and the sea
  const sd = gfSeaD(H, x, y);
  if (sd < GF_CLIFF) { const f = gfSmooth(-1, GF_CLIFF, sd); h = -3.5 - Math.max(0, -sd) * 0.04 + (h + 3.5) * f; }
  return h;
}
function gfNorm(H, x, y) { const e = 0.3, dx = (gfH(H, x + e, y) - gfH(H, x - e, y)) / (2 * e), dy = (gfH(H, x, y + e) - gfH(H, x, y - e)) / (2 * e), l = Math.hypot(dx, dy, 1); return [-dx / l, -dy / l, 1 / l]; }
function gfInCreek(H, x, y) { for (const P of H.ck) if (gfInPoly(P, x, y)) return true; return false; }
function gfFwD(H, x, y) { let d = 1e9; for (let i = 1; i < H.fwy.length; i++) d = Math.min(d, gfSegD(x, y, H.fwy[i - 1][0], H.fwy[i - 1][1], H.fwy[i][0], H.fwy[i][1])); return d; }
function gfSurf(H, x, y) {
  const b = H.box; if (x < b[0] - 40 || x > b[2] + 40 || y < b[1] - 30 || y > b[3] + 60) return 'out';
  const sd = gfSeaD(H, x, y);
  if (sd < 0 || gfInCreek(H, x, y)) return 'water';
  if (sd < GF_CLIFF - 1) return 'rock';
  for (const k of H.bk) if (gfEll(k, x, y) < 1) return 'sand';
  const e = gfEll(H.gr, x, y); if (e < 1) return 'green';
  if (gfEll(H.gr, x, y, 1.8) < 1) return 'fringe';
  if (Math.abs(x) < 4 && y > -6 && y < 6) return 'tee';
  const fd = gfFwD(H, x, y);
  if (fd < H.fw) return 'fairway';
  if (fd < H.fw + 26 || e < 3.2) return 'rough';
  let ld = 1e9; for (let i = 1; i < H.pts.length; i++) ld = Math.min(ld, gfSegD(x, y, H.pts[i - 1][0], H.pts[i - 1][1], H.pts[i][0], H.pts[i][1]));
  return ld < Math.max(H.fw, 14) + 26 ? 'rough' : 'deep';
}
// the trees: scattered in the rough, clear of the fairway, the green, the tee and the cliffs; rt: none on the right
function gfTrees(H, T) {
  const r = gfRng(T[0] * 7919 + 13), b = H.box, out = [];
  for (let n = 0; n < T[1] * 6 && out.length < T[1]; n++) {
    const x = b[0] + r() * (b[2] - b[0]), y = b[1] + 20 + r() * (b[3] - b[1] - 20);
    if (T[2] && x > gfLineX(H, y) + 8) continue;
    if (gfFwD(H, x, y) < H.fw + 14 || gfEll(H.gr, x, y) < 3.0 || Math.hypot(x, y) < 22 || gfSeaD(H, x, y) < 12) continue;
    if (gfSegD(x, y, 0, 0, H.pts[1][0], H.pts[1][1]) < 16) continue;
    if (out.some(t => Math.hypot(t.x - x, t.y - y) < 5)) continue;
    const s = 0.75 + r() * 0.6; out.push({ x, y, r: 3.6 * s, h: 8 + r() * 6 * s, lean: (r() - 0.5) * 0.5, kind: r() < 0.65 ? 0 : 1 });
  }
  H.trees = out;
}
// the middle of the line of play at a given y (for keeping trees off the sea side)
function gfLineX(H, y) { const P = H.pts; for (let i = 1; i < P.length; i++) if (y <= P[i][1] || i === P.length - 1) { const a = P[i - 1], b = P[i], t = Math.max(0, Math.min(1, (y - a[1]) / ((b[1] - a[1]) || 1))); return a[0] + (b[0] - a[0]) * t; } return 0; }

var GF_HOLES = null;
function gfHoles() { if (!GF_HOLES) GF_HOLES = GF_RAW.map((_, i) => gfBuildHole(i)); return GF_HOLES; }
const GF_PAR = GF_RAW.reduce((a, h) => a + h.par, 0);
