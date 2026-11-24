'use strict';
// The Lamp Road: the map, Gullhaven, as data and the sums every part of the mode uses on it: where the ground is, what
// stands in the way of a body, and what a shot or a look runs into first. The 3D dressing of it is src/lr3d.js's.
//
// Gullhaven is a harbour town on a headland, laid out east to west along the quay. The Lamp Wain (the payload: the
// great lens of the Gullhaven Light on a heavy iron carriage) starts at the west end, outside the Lamplighters' boat
// house, and has to be pushed through the town, down the fish market, past the chandlery and the Mermaid tavern and
// out along the headland to the foot of the Light (east), where the lens goes back up and the Light is lit again.
// The Wreckers, who put the Light out, hold the town against it.
// Units are metres. x runs east (towards the Light), y up, z south (three.js's own axes). The ground is y = 0 except
// where a box or a ramp stands. A heading (yaw) is three.js's rotation.y with rotation.order 'YXZ': you face
// (-sin yaw, 0, -cos yaw), so yaw -PI/2 faces east (+x) and PI/2 faces west.
//
// LR_MAP.boxes: solid blocks [x0, y0, z0, x1, y1, z1, kind]; their tops can be stood on. kind names what the view
//   draws there ('wall', 'house', 'shed', 'crate', 'stall', 'hulk', 'rock', 'tower', 'spawn').
// LR_MAP.ramps: [x0, z0, x1, z1, h0, h1, axis]: a slope over that rectangle, h0 at the low edge of the axis ('x' or 'z')
//   rising to h1 at the high edge; walkable, and solid under its surface.
// LR_MAP.path: the Lamp Wain's road, a line of [x, z] on the ground; LR_MAP.cps: the checkpoints, as fractions of
//   its length (the last is the end of the road).
// LR_MAP.spawns: where each side comes back, by stage (the stage is how many checkpoints the Wain has passed): a for
//   the attackers (the Lamplighters), d for the defenders (the Wreckers), each [x, z, yaw].

var LR_MAP = {
  bounds: { x0: -106, x1: 111, z0: -36, z1: 36 },
  path: [[-85, 0], [-50, 0], [-35, 14], [-5, 14], [10, 0], [35, -12], [60, -12], [75, 0], [92, 0]],
  cps: [0.34, 0.68, 1],
  spawns: {
    a: [[-97, 0, -Math.PI / 2], [-42, -6, -Math.PI / 2], [-4, 19, -Math.PI / 2], [-4, 19, -Math.PI / 2]],
    d: [[-5, 28, Math.PI / 2], [86, 28, Math.PI / 2], [101, 20, Math.PI / 2], [101, 20, Math.PI / 2]],
  },
  // the oil cans and the medicine chests: [x, z, big]; walked over, they mend you (a can 75, a chest 250), and come back
  packs: [[-64, -8, 0], [-50, 14, 1], [-24, 20, 0], [-6, -6, 1], [27, 6, 0], [33, -22, 1], [56, 16, 0], [72, -16, 1], [84, 4, 0]],
  boxes: [
    // the sea walls and the cliff round the town
    [-110, 0, -40, 115, 6, -36, 'wall'], [-110, 0, 36, 115, 6, 40, 'wall'], [-110, 0, -40, -106, 6, 40, 'wall'], [111, 0, -40, 115, 6, 40, 'wall'],
    // the Lamplighters' boat house (their first spawn), open to the east
    [-106, 0, -12, -88, 5, -10, 'spawn'], [-106, 0, 10, -88, 5, 12, 'spawn'], [-90, 0, -12, -88, 5, -4, 'spawn'], [-90, 0, 4, -88, 5, 12, 'spawn'],
    // the west quay: warehouses, a boat shed, the old sail loft (its roof reached by the ramp on its east side)
    [-80, 0, 8, -60, 7, 26, 'house'], [-55, 0, 20, -40, 6, 32, 'house'], [-82, 0, -30, -60, 6, -10, 'shed'], [-55, 0, -30, -42, 4, -14, 'shed'],
    [-70, 0, -6, -67, 1.5, -3, 'crate'], [-60, 0, 4, -57, 2.4, 7, 'crate'], [-46, 0, -10, -43, 1.2, -7, 'crate'],
    // the fish market: the market hall to the south of the street, the row of houses to the north, stalls in the street
    [-28, 0, -14, -8, 5.5, 6, 'house'], [-30, 0, 22, -10, 6, 34, 'house'], [-22, 0, 9, -19, 1.2, 11, 'stall'], [-14, 0, 17, -11, 1.2, 19, 'stall'],
    // the chandlery (a low roof, a ramp up its east end), the net loft, the customs house
    [12, 0, 8, 24, 4, 18, 'house'], [0, 0, 22, 25, 7, 34, 'house'], [-2, 0, -30, 20, 5, -10, 'house'], [26, 0, 0, 29, 1.5, 3, 'crate'],
    // the Mermaid tavern, the old hulk on the hard (her deck reached from the ramp at her east end), cover on the road
    [38, 0, -2, 58, 6, 12, 'house'], [40, 0, -34, 62, 3, -24, 'hulk'], [48, 0, -21, 51, 1.4, -18, 'crate'], [66, 0, 6, 69, 1.6, 9, 'crate'],
    // the headland: rocks either side of the road, and the Light
    [80, 0, 10, 90, 3, 22, 'rock'], [80, 0, -22, 90, 2.5, -12, 'rock'], [96, 0, -5, 106, 30, 5, 'tower'],
  ],
  ramps: [
    [-42, -24, -34, -18, 4, 0, 'x'],    // up to the boat shed's roof from the east
    [-36, 24, -30, 30, 0, 6, 'x'],      // up to the market houses' roofs from the west
    [24, 10, 30, 16, 4, 0, 'x'],        // up to the chandlery's roof from the east
    [62, -30, 68, -26, 3, 0, 'x'],      // up onto the hulk's deck from the east
    [90, 12, 94, 20, 3, 0, 'x'],        // up onto the north rock from the east
  ],
};
const LR_G = 20, LR_STEP = 0.55;

// ---------- the Wain's road ----------
var LR_PATH = null;
function lrPathInit() {
  if (LR_PATH) return LR_PATH;
  const P = LR_MAP.path, seg = []; let L = 0;
  for (let i = 0; i < P.length - 1; i++) { const dx = P[i + 1][0] - P[i][0], dz = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dz); seg.push({ x: P[i][0], z: P[i][1], dx: dx / l, dz: dz / l, l, s: L }); L += l; }
  return (LR_PATH = { seg, len: L });
}
function lrPathLen() { return lrPathInit().len; }
// where the road is s metres along it, and which way it runs there (yaw as above, facing along the road)
function lrPathAt(s) {
  const P = lrPathInit(); s = Math.max(0, Math.min(P.len, s));
  let g = P.seg[P.seg.length - 1];
  for (const q of P.seg) if (s <= q.s + q.l) { g = q; break; }
  const u = s - g.s;
  return { x: g.x + g.dx * u, z: g.z + g.dz * u, yaw: Math.atan2(-g.dx, -g.dz) };
}

// ---------- the ground and the solid ----------
function lrRampH(r, x, z) {
  if (x < r[0] || x > r[2] || z < r[1] || z > r[3]) return -1;
  const f = r[6] === 'x' ? (x - r[0]) / (r[2] - r[0]) : (z - r[1]) / (r[3] - r[1]);
  return r[4] + (r[5] - r[4]) * f;
}
// the highest surface under (x, z) that a body with its feet at y could stand on (box tops and ramps no higher than a
// step above its feet); 0 is the ground
function lrGround(x, z, y) {
  let h = 0; const lim = (y == null ? 1e9 : y + LR_STEP);
  for (const b of LR_MAP.boxes) if (x >= b[0] && x <= b[3] && z >= b[2] && z <= b[5] && b[4] <= lim && b[4] > h) h = b[4];
  for (const r of LR_MAP.ramps) { const v = lrRampH(r, x, z); if (v > h && v <= lim) h = v; }
  return h;
}
// a body: { x, y (its feet), z, vx, vy, vz, r (radius), h (height), gnd (on the ground) }. Moves it by its speed for dt:
// slides along anything in the way (stepping up onto anything a step high or lower), falls, and lands.
function lrMove(p, dt) {
  const r = p.r || 0.45, h = p.h || 1.8;
  const n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vz) * dt / (r * 0.8)));
  for (let k = 0; k < n; k++) {
    p.x += p.vx * dt / n; p.z += p.vz * dt / n;
    for (const b of LR_MAP.boxes) {
      if (b[4] <= p.y + LR_STEP || b[1] >= p.y + h) continue;
      const cx = Math.max(b[0], Math.min(b[3], p.x)), cz = Math.max(b[2], Math.min(b[5], p.z)), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), push = r - d; p.x += dx / d * push; p.z += dz / d * push; const vn = (p.vx * dx + p.vz * dz) / d; if (vn < 0) { p.vx -= vn * dx / d; p.vz -= vn * dz / d; } }
      else { // inside: out by the nearest face
        const o = [p.x - b[0] + r, b[3] - p.x + r, p.z - b[2] + r, b[5] - p.z + r], m = Math.min(...o), i = o.indexOf(m);
        if (i === 0) { p.x = b[0] - r; p.vx = Math.min(0, p.vx); } else if (i === 1) { p.x = b[3] + r; p.vx = Math.max(0, p.vx); } else if (i === 2) { p.z = b[2] - r; p.vz = Math.min(0, p.vz); } else { p.z = b[5] + r; p.vz = Math.max(0, p.vz); }
      }
    }
    // a ramp's high side is a wall to anyone below it
    for (const rp of LR_MAP.ramps) { const v = lrRampH(rp, p.x, p.z); if (v > p.y + LR_STEP && v > 0) { p.x -= p.vx * dt / n; p.z -= p.vz * dt / n; break; } }
  }
  const B = LR_MAP.bounds; p.x = Math.max(B.x0 + r, Math.min(B.x1 - r, p.x)); p.z = Math.max(B.z0 + r, Math.min(B.z1 - r, p.z));
  // ceilings: a box overhead stops a jump
  p.vy -= LR_G * dt; p.y += p.vy * dt;
  const g = lrGround(p.x, p.z, Math.max(p.y, p.y - p.vy * dt));
  if (p.y <= g) { p.y = g; if (p.vy < 0) p.vy = 0; p.gnd = true; }
  else p.gnd = p.y - g < 0.05 && p.vy <= 0;
  return p;
}
// the first solid a line from (ox, oy, oz) along (dx, dy, dz) (a unit vector) runs into within max metres: the
// distance, or max if nothing. The ground counts, and so do the ramps (roughly, as their boxes).
function lrRay(ox, oy, oz, dx, dy, dz, max) {
  let best = max;
  if (dy < 0) { const t = -oy / dy; if (t >= 0 && t < best) best = t; }
  const slab = (x0, y0, z0, x1, y1, z1) => {
    let t0 = 0, t1 = best;
    for (const [o, d, a, b] of [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]]) {
      if (Math.abs(d) < 1e-9) { if (o < a || o > b) return; continue; }
      let ta = (a - o) / d, tb = (b - o) / d; if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return;
    }
    if (t0 < best) best = t0;
  };
  for (const b of LR_MAP.boxes) slab(b[0], b[1], b[2], b[3], b[4], b[5]);
  for (const r of LR_MAP.ramps) slab(r[0], 0, r[1], r[2], Math.max(r[4], r[5]) * 0.5, r[3]);
  return best;
}
// can a eye at a see b (both {x, y, z})?
// (and no zone of a kind that blinds, such as a cloud of smoke, is in the way: src/lr.js lrSightCut)
function lrSees(a, b) { const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz); if (d < 1e-6) return true; if (typeof lrSightCut === 'function' && lrSightCut(a, b, d)) return false; return lrRay(a.x, a.y, a.z, dx / d, dy / d, dz / d, d) >= d - 0.05; }
