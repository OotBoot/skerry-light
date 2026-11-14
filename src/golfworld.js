'use strict';
// Skerry Links: the whole course in view from every hole.
// Each hole is played in its own frame (src/golfcourse.js), so the nine are laid out on one map here (GF_WORLD): the
// first three run south down the inland side, then the 4th to the 9th run north along the cliffs, one after another,
// each tee a little beyond the last green. From any hole the other eight are drawn at low detail (gf3dCourse): their
// fairways, rough, greens, tees and bunkers as a coarse coloured mesh laid over this hole's land, their trees, and a
// flag on each green. Only what lies outside this hole's own ground and on dry land in this hole's frame is drawn.

let GF_WORLD = null;
// (bearing r: the hole's +y points that way on the map, 0 north; a hole point (x, y) is at T + x(cos r, -sin r) + y(sin r, cos r))
function gfWorld() {
  if (GF_WORLD) return GF_WORLD;
  const Hs = gfHoles(), W = [];
  // the 4th to the 9th: north along the cliffs
  let T = [0, 0];
  for (let i = 3; i < 9; i++) { W[i] = { r: 0, t: T.slice() }; const p = Hs[i].pin; T = [T[0] + p[0], T[1] + p[1] + 45]; }
  // the 1st to the 3rd: south down the inland side, the 3rd's green a little west of the 4th tee
  let pinW = [-270, -70];
  for (let i = 2; i >= 0; i--) { const p = Hs[i].pin, t = [pinW[0] + p[0], pinW[1] + p[1]]; W[i] = { r: Math.PI, t }; pinW = [t[0], t[1] + 45]; }
  return GF_WORLD = W;
}
function gfToWorld(i, x, y) { const w = gfWorld()[i], c = Math.cos(w.r), s = Math.sin(w.r); return [w.t[0] + x * c + y * s, w.t[1] - x * s + y * c]; }
function gfFromWorld(i, X, Y) { const w = gfWorld()[i], c = Math.cos(w.r), s = Math.sin(w.r), dx = X - w.t[0], dy = Y - w.t[1]; return [dx * c - dy * s, dx * s + dy * c]; }

// a hole's playing ground at low detail, in its own frame, worked out once: a 5 m grid over the line of play (within
// 55 m of it, round the green and the tee), each point's colour from what's underfoot there
const GF_LOD = [];
const GF_LOD_COL = { fairway: 0x6fa64a, tee: 0x80c05a, green: 0x92d46c, fringe: 0x7cbc58, rough: 0x4f7a3b, deep: 0x41662f, sand: 0xe2d3a2 };
function gfLod(j) {
  if (GF_LOD[j]) return GF_LOD[j];
  const H = gfHoles()[j], st = 5, [x0, y0, x1, y1] = H.box, nx = Math.ceil((x1 - x0) / st) + 1, ny = Math.ceil((y1 - y0) / st) + 1, P = [H.pts[0]].concat(H.pts.slice(1));
  const keep = new Uint8Array(nx * ny), col = new Uint32Array(nx * ny);
  for (let b = 0; b < ny; b++) for (let a = 0; a < nx; a++) {
    const x = x0 + a * st, y = y0 + b * st; let d = Math.hypot(x, y) - 25;
    for (let i = 1; i < P.length; i++) d = Math.min(d, gfSegD(x, y, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]) - 55);
    d = Math.min(d, (gfEll(H.gr, x, y) - 2.4) * 10);
    if (d > 0) continue;
    const s = gfSurf(H, x, y), c = GF_LOD_COL[s]; if (c == null) continue;
    keep[b * nx + a] = 1; col[b * nx + a] = c;
  }
  const trees = H.trees.filter(t => { let d = 1e9; for (let i = 1; i < P.length; i++) d = Math.min(d, gfSegD(t.x, t.y, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1])); return d < 80; });
  return GF_LOD[j] = { x0, y0, st, nx, ny, keep, col, trees };
}

// the other eight, set out round the hole being played
function gf3dCourse(H) {
  if (G3.course) { G3.scene.remove(G3.course); gf3dDispose(G3.course); G3.course = null; }
  const c = H.i, grp = G3.course = new THREE.Group(), [bx0, by0, bx1, by1] = H.box, pos = [], cols = [], idx = [], tmp = new THREE.Color();
  const ground = (x, y) => Math.max(0, gfH(H, x, y)) + 1.1;
  const free = (x, y) => !(x > bx0 - 6 && x < bx1 + 6 && y > by0 - 6 && y < by1 + 6) && x > bx0 - 1050 && x < bx1 + 1050 && y > by0 - 850 && y < by1 + 1050 && gfSeaD(H, x, y) > 3;
  const tx = [], flags = [];
  for (let j = 0; j < 9; j++) {
    if (j === c) continue;
    const L = gfLod(j), Hj = gfHoles()[j], map = new Int32Array(L.nx * L.ny).fill(-1);
    for (let b = 0; b < L.ny; b++) for (let a = 0; a < L.nx; a++) {
      const k = b * L.nx + a; if (!L.keep[k]) continue;
      const w = gfToWorld(j, L.x0 + a * L.st, L.y0 + b * L.st), l = gfFromWorld(c, w[0], w[1]);
      if (!free(l[0], l[1])) continue;
      map[k] = pos.length / 3; pos.push(l[0], ground(l[0], l[1]), -l[1]); tmp.setHex(L.col[k]); cols.push(tmp.r, tmp.g, tmp.b);
    }
    for (let b = 0; b < L.ny - 1; b++) for (let a = 0; a < L.nx - 1; a++) {
      const k = b * L.nx + a, p = map[k], q = map[k + 1], r = map[k + L.nx], s = map[k + L.nx + 1];
      if (p >= 0 && q >= 0 && r >= 0 && s >= 0) idx.push(p, q, r, q, s, r);
    }
    for (const t of L.trees) { const w = gfToWorld(j, t.x, t.y), l = gfFromWorld(c, w[0], w[1]); if (free(l[0], l[1])) tx.push([l[0], l[1], t]); }
    const pw = gfToWorld(j, Hj.pin[0], Hj.pin[1]), pl = gfFromWorld(c, pw[0], pw[1]); if (free(pl[0], pl[1])) flags.push(pl);
  }
  if (idx.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals();
    grp.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })));
  }
  // their trees, plainly
  if (tx.length) {
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 1, 5), new THREE.MeshLambertMaterial({ color: 0x5a4330 }), tx.length);
    const tops = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), new THREE.MeshLambertMaterial({ color: 0x2f4c2c, flatShading: true }), tx.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3();
    tx.forEach(([x, y, t], k) => { const gz = ground(x, y) - 1.1; M.compose(V.set(x, gz + t.h * 0.25, -y), Q, S.set(1, t.h * 0.5, 1)); trunks.setMatrixAt(k, M); M.compose(V.set(x, gz + t.h * 0.7, -y), Q, S.set(t.r * (t.kind ? 0.8 : 1.15), t.h * (t.kind ? 0.8 : 0.5), t.r * (t.kind ? 0.8 : 1.15))); tops.setMatrixAt(k, M); });
    grp.add(trunks, tops);
  }
  // a flag on each of their greens
  const poleG = new THREE.CylinderGeometry(0.08, 0.08, 5, 5), poleM = new THREE.MeshLambertMaterial({ color: 0xf4efe2 }), flagG = new THREE.PlaneGeometry(1.8, 1.1), flagM = new THREE.MeshLambertMaterial({ color: 0xd8452f, side: THREE.DoubleSide });
  flagG.translate(0.9, 0, 0);
  for (const [x, y] of flags) { const gz = ground(x, y) - 1.1, p = new THREE.Mesh(poleG, poleM), f = new THREE.Mesh(flagG, flagM); p.position.set(x, gz + 2.5, -y); f.position.set(x, gz + 4.4, -y); grp.add(p, f); }
  G3.scene.add(grp);
}
