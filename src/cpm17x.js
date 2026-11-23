'use strict';
// The Chronicle of the Light, mission 17, Skerry Chess: the reef board, and the two parts played on it (the mission
// itself, its first part in the lamp room and its cinematics are in src/cpm17.js).
//
// The board (FPS_ISLES.cpm17reef / FPI_GEN.cpm17reef): the reef board as Holm dreamt it over his move, the size of a
// harbour, cut out of the skerries at low water. Sixty-four granite ledges in black water, six metres a side, light and
// dark; four rocks standing up out of it where the skerries are (c4, f4, c5, f5: nothing stands on them or passes
// through them, and they stop a shot); the four squares between them painted gold for the Light (d4, e4, d5, e5). To
// the south, behind the Light's rank, the Light itself, its beam going round over the board. Squares as src/chess.js
// numbers them: s = rank * 8 + file, a1 = 0 (south-west), h8 = 63; the Light's rank is rank 1, the Wreckers' rank 8.
// Pieces by number, as src/chess.js has them: 1 hand, 2 gannet, 3 cutter, 4 tower, 5 lantern, 6 keeper.
//
// The rules of it, for you (each of you is one of the Light's pieces):
//  - You walk where you like on your own ledge, but the channels between are too wide to step: you cross only by
//    your piece's move. Look at a square (the ones your piece can reach are marked gold) and press Use: you're carried
//    there. The gannet leaps (over rocks and pieces, in its L); the cutter runs the diagonals, the tower the straight
//    lines and the lantern both, as far as the way is clear (a rock stops them; a Wrecker stops them on his own square).
//    Land on a Wrecker's square and he's taken. Before you take up a piece you're on foot: one step any way.
//  - The Light's pieces stand carved on their plinths along rank 1: stand on one's square and hold Use to take it up
//    (one of you to a piece; your old one goes back to its plinth). The keeper on e1 is Holm's.
//  - The Wreckers move on the beat (M17.BEAT seconds, the Light's beam going over): a square they mean to land on is
//    shown red a couple of seconds before. Be on it when they land and you're taken: hurt, and set back on your rank.
//    Their hands carry cutlasses; their great pieces carry pistols, and use them.
// The parts:
//  II.  The Reef Board (cp_m17reef): light the four gold squares. A square is lit while one of you stands on it, and
//       stays lit until a Wrecker lands on it. All four lit at once, and the Wreckers fall back.
//  III. The Wreckers' Keeper (cp_m17keep): their keeper comes up on e8 with a false light on a pole, and while it
//       burns the gold is dark and the lamp (the real one, in the lamp room, where Holm sleeps) runs down. He walks for
//       the Light a square every second beat, and as a keeper must, he won't step into a square one of you attacks,
//       nor move while you have him in check. Holm walks the board too, as the Light's keeper: a square every beat
//       towards the gold, never into a square a Wrecker attacks. Shoot out the false light (the lantern at the top of
//       its pole) and for a while the gold is lit, the lamp mends, and Holm may step onto it. Holm on the gold: the
//       game is won. Their keeper on it, or the lamp run dry: lost. Put him down and his light is out for good.
// Together: the host keeps the board (RAID.st: the Wreckers' pieces, the plan for the next beat, who holds which
// piece, the gold, Holm, their keeper, the lamp) and sends it in the stage's word (m17); each screen moves its own
// player by the rules from that, and asks the host ('pick', 'take', 'douse', and 'noise' for the pistols to hear).

const M17 = { S: 6, GAP: 0.45, BEAT: 5.2, WARN: 2.2, CD: 0.55, CD5: 1.3, TAKEN: 1.5, BK_EVERY: 2, DOUSE: 9, LAMP_DRAIN: 115, LAMP_MEND: 22, POOL: [5, 3], OV: 0.05,
  ROCKS: [26, 29, 34, 37], LIGHT: [27, 28, 35, 36], HOME: [3, 2, 5, 6], TOWER: [0, -74], NAMES: ['on foot', 'hand', 'gannet', 'cutter', 'tower', 'lantern', 'keeper'],
  HOW: ['one step any way', 'one step forward', 'leaps in an L, over anything', 'the diagonals, as far as is clear', 'the straight lines, as far as is clear', 'every line, as far as is clear', 'one step any way'],
  RANK1: [4, 2, 3, 5, 6, 3, 2, 4] };
var M17S = { arc: null, cd: 0, aim: -1, legal: [], prev: {}, emb: null, anim: {}, home: -1, said: {} };   // (this screen's own: my move, what I'm aiming at, the pieces' slides)

// ---------- squares ----------
const m17SqXY = s => [-21 + (s & 7) * M17.S, -21 + (s >> 3) * M17.S];
function m17SqAt(lx, ly) { const f = Math.floor((lx + 24) / M17.S), r = Math.floor((ly + 24) / M17.S); return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1; }
const m17W = s => { const [x, y] = m17SqXY(s); return [FPSC.CX + x, FPSC.CY + y]; };
const m17Name = s => 'abcdefgh'[s & 7] + (1 + (s >> 3));
const m17Rock = s => M17.ROCKS.includes(s);
const m17LightSq = s => M17.LIGHT.includes(s);
const m17KD = (a, b) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 3) - (b >> 3)));
const m17LD = s => Math.min(...M17.LIGHT.map(l => m17KD(s, l)));
const M17K = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], M17N = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const m17Step = (s, df, dr) => { const f = (s & 7) + df, r = (s >> 3) + dr; return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1; };
// where a piece of type t on s can go. occ(s2): 0 empty, 1 its own side's, 2 the other side's (taken by landing), 3 not
// to be landed on (a keeper); att: the squares it attacks instead (for a hand, only its diagonals). dir: a hand's
// forward (+1 the Light's, -1 the Wreckers')
function m17Moves(t, s, occ, dir, att) {
  const out = [], push = q => { if (q >= 0 && !m17Rock(q)) out.push(q); };
  if (t === 1) {
    for (const df of [-1, 1]) { const q = m17Step(s, df, dir); if (q < 0 || m17Rock(q)) continue; if (att || occ(q) === 2) out.push(q); }
    if (!att) { const q = m17Step(s, 0, dir); if (q >= 0 && !m17Rock(q) && occ(q) === 0) { out.push(q); const q2 = m17Step(q, 0, dir); if ((s >> 3) === (dir > 0 ? 1 : 6) && q2 >= 0 && !m17Rock(q2) && occ(q2) === 0) out.push(q2); } }
    return out;
  }
  if (t === 0 || t === 6 || t === 2) { for (const [a, b] of t === 2 ? M17N : M17K) { const q = m17Step(s, a, b); if (q < 0 || m17Rock(q)) continue; const o = occ(q); if (att || o === 0 || o === 2) out.push(q); } return out; }
  const dirs = t === 3 ? M17K.filter((d, i) => i % 2) : t === 4 ? M17K.filter((d, i) => !(i % 2)) : M17K;
  for (const [a, b] of dirs) { let q = s; for (;;) { q = m17Step(q, a, b); if (q < 0 || m17Rock(q)) break; const o = occ(q); if (o === 0) { out.push(q); continue; } if (att || o === 2) out.push(q); break; } }
  return out;
}

// ---------- the look of it ----------
FPS_ISLES.cpm17reef = Object.assign({}, FPS_ISLES.light, { name: 'the reef board', ground: '#0a1216', ground2: '#0a1216', wet: '#0a1216', path: '#0a1216', fog: ['#06080c', 30, 300], mist: '40,50,60', mistA: 0.05, nLights: 10, noGround: true });
FPI_GEN.cpm17reef = { built: true, set(H) { const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [], glass: [] }; const S = raidStage(); if (S && S.set) S.set(H, zmKit(H, Z), Z); }, decor() {} };
Object.assign(FPI_K, {
  // a skerry standing up out of the board: a heap of black granite, weed at its foot
  m17rock: { col: '#3a3c3a', sol(p) { return [fpiCirc(p, 0, 0, 2.55, 6.5)]; },
    b3(p, A) { A.part('ico', '#3e403c', 0, 0, 1.4, 5.4, 3.4, 5.0, 0.3); A.part('ico', '#4a4c46', 0.6, -0.4, 3.4, 3.6, 3.4, 3.4, 1.1, 0.2); A.part('ico', '#35373a', -0.7, 0.5, 5.0, 2.2, 2.6, 2.0, 0.6, 0.1, 0.2); A.part('taper', '#2e3a26', 0, 0, 0.15, 5.6, 0.5, 5.4, 0); } },
});
// (every screen) the board's own lights: the four gold squares' glow, off until they're lit
function m17Lay(H, K) {
  cplReset();
  for (const s of M17.ROCKS) { const [x, y] = m17SqXY(s); K.put('m17rock', x, y, (s * 1.3) % 6.28, {}); }
  M17S.gold = M17.LIGHT.map(s => { const [x, y] = m17SqXY(s); return cplAdd(x, y, 1.2, '#ffd070', 11, { on: false, s: 0.01 }); });
  for (const [x, y] of [[-27, -27], [27, -27], [-27, 27], [27, 27]]) K.light(x, y, 2.5, '#7a8aa0', 14, 'lantern');
}
// (the board's own: keeping you on your ledge) true where nobody can stand: the channels, the rocks, off the board, a plinth
function m17Block(x, y, pad) {
  if (M17S.arc) return false;
  const lx = x - FPSC.CX, ly = y - FPSC.CY, p = (pad || 0.3) + M17.GAP;
  if (Math.abs(lx) > 24 - p || Math.abs(ly) > 24 - p) return true;
  const u = ((lx + 24) % M17.S + M17.S) % M17.S, v = ((ly + 24) % M17.S + M17.S) % M17.S;
  if (u < p || u > M17.S - p || v < p || v > M17.S - p) return true;
  const s = m17SqAt(lx, ly); if (m17Rock(s)) return true;
  if (s >= 0 && s < 8) { const [px, py] = m17Plinth(s); if (Math.hypot(lx - px, ly - py) < 0.85 + (pad || 0.3)) return true; }
  return false;
}
const m17Plinth = s => { const [x, y] = m17SqXY(s); return [x, y - 1.6]; };

// ---------- the pieces, whittled ----------
// a piece (t 1 to 6) of the Light's side (lamplit brass-coloured wood) or the Wreckers' (tarred black, red trim), about
// s metres tall: a THREE.Group standing on its base
function m17Piece(t, light, s) {
  const G = new THREE.Group(), body = new THREE.MeshLambertMaterial({ color: light ? 0xc89a58 : 0x2a1e1a }), trim = new THREE.MeshLambertMaterial({ color: light ? 0x7a5428 : 0x9a2a22 });
  const glow = new THREE.MeshBasicMaterial({ color: light ? 0xffd88a : 0xff6a3a });
  const add = (geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); if (sx) m.scale.set(sx, sy, sz); G.add(m); return m; };
  const lathe = (pts, mat, y) => add(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 14), mat, 0, y || 0, 0);
  add(new THREE.CylinderGeometry(0.4, 0.44, 0.1, 16), trim, 0, 0.05, 0); add(new THREE.CylinderGeometry(0.33, 0.38, 0.08, 16), body, 0, 0.14, 0);
  if (t === 1) { lathe([[0.001, 0], [0.24, 0.02], [0.2, 0.3], [0.13, 0.5], [0.001, 0.52]], body, 0.16); add(new THREE.SphereGeometry(0.14, 12, 9), body, 0, 0.78, 0); add(new THREE.CylinderGeometry(0.25, 0.25, 0.025, 14), trim, 0, 0.86, 0.02, 0.12); add(new THREE.SphereGeometry(0.13, 10, 6, 0, 6.3, 0, 1.6), trim, 0, 0.86, 0); }
  else if (t === 2) { add(new THREE.SphereGeometry(0.24, 12, 9), body, 0, 0.5, 0, 0, 0, 0, 1, 1.25, 0.85); add(new THREE.SphereGeometry(0.12, 10, 8), body, 0, 0.9, -0.08); add(new THREE.ConeGeometry(0.05, 0.36, 8), trim, 0, 0.88, -0.32, -Math.PI / 2 - 0.15); add(new THREE.SphereGeometry(0.03, 6, 5), glow, 0.08, 0.95, -0.13); add(new THREE.BoxGeometry(0.06, 0.3, 0.32), trim, 0.21, 0.52, 0.05, 0.3); add(new THREE.BoxGeometry(0.06, 0.3, 0.32), trim, -0.21, 0.52, 0.05, 0.3); }
  else if (t === 3) { add(new THREE.BoxGeometry(0.62, 0.16, 0.24), trim, 0, 0.28, 0); add(new THREE.ConeGeometry(0.12, 0.2, 4), trim, 0.38, 0.28, 0, 0, Math.PI / 4, -Math.PI / 2, 1, 1, 0.9); add(new THREE.CylinderGeometry(0.02, 0.025, 0.95, 6), body, 0, 0.8, 0); const sail = add(new THREE.ConeGeometry(0.3, 0.74, 3), body, 0.08, 0.78, 0, 0, 0, 0, 1, 1, 0.12); sail.rotation.y = Math.PI / 6; }
  else if (t === 4) { add(new THREE.CylinderGeometry(0.17, 0.25, 0.8, 14), body, 0, 0.58, 0); for (const y of [0.4, 0.68]) add(new THREE.CylinderGeometry(0.21 - (y - 0.4) * 0.13, 0.22 - (y - 0.4) * 0.13, 0.07, 14), trim, 0, y, 0); add(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), trim, 0, 0.99, 0); add(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 10), glow, 0, 1.09, 0); add(new THREE.ConeGeometry(0.15, 0.14, 10), trim, 0, 1.24, 0); }
  else if (t === 5) { add(new THREE.BoxGeometry(0.34, 0.44, 0.34), body, 0, 0.44, 0); add(new THREE.SphereGeometry(0.1, 10, 8), glow, 0, 0.44, 0, 0, 0, 0, 1, 1.4, 1); for (const [x, z] of [[0.17, 0.17], [-0.17, 0.17], [0.17, -0.17], [-0.17, -0.17]]) add(new THREE.BoxGeometry(0.04, 0.46, 0.04), trim, x, 0.44, z); add(new THREE.ConeGeometry(0.28, 0.16, 4), trim, 0, 0.74, 0, 0, Math.PI / 4); add(new THREE.TorusGeometry(0.07, 0.018, 6, 12), trim, 0, 0.88, 0); }
  else { lathe([[0.001, 0], [0.3, 0.02], [0.24, 0.3], [0.16, 0.56], [0.001, 0.58]], body, 0.16); add(new THREE.SphereGeometry(0.15, 12, 9), body, 0, 0.86, 0); add(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14), trim, 0, 0.99, 0); add(new THREE.BoxGeometry(0.22, 0.02, 0.12), trim, 0, 0.955, -0.17); add(new THREE.SphereGeometry(0.035, 6, 5), glow, 0, 1.0, -0.16); }
  G.scale.setScalar(s / 1.15);
  return G;
}

// ---------- the board's 3D: the ledges, the gold, the marks on them, the carved pieces, the Light to the south ----------
function m17Build3D(grp) {
  const G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, B = M17S.b3 = { ov: [], plin: [], emb: new Map(), grp };
  const lists = { a: [], b: [], gold: [], weed: [] }, rr = seeded(0x17c4);
  for (let s = 0; s < 64; s++) {
    if (m17Rock(s)) continue;
    const [x, y] = m17SqXY(s), w = M17.S - M17.GAP * 2 + (rr() - 0.5) * 0.12, gold = m17LightSq(s), dark = ((s & 7) + (s >> 3)) % 2 === 0;
    const geo = new THREE.BoxGeometry(w, 2.2, w); geo.rotateY((rr() - 0.5) * 0.03); geo.translate(CX + x, G0 - 1.1 + (gold ? 0 : -0.01), -(CY + y)); (dark ? lists.a : lists.b).push(geo);
    const wg = new THREE.BoxGeometry(w + 0.16, 0.25, w + 0.16); wg.translate(CX + x, 0.1, -(CY + y)); lists.weed.push(wg);
    if (gold) { const gg = new THREE.PlaneGeometry(w - 0.5, w - 0.5); gg.rotateX(-Math.PI / 2); gg.translate(CX + x, G0 + 0.012, -(CY + y)); lists.gold.push(gg); }
  }
  const mk = (L, mat) => { const g3 = z3Merge(L); if (g3) { const m = new THREE.Mesh(g3, mat); grp.add(m); return m; } return null; };
  mk(lists.a, z3Lam('#3e423f')); mk(lists.b, z3Lam('#7a7a70')); mk(lists.weed, z3Lam('#24301e'));
  B.goldMat = new THREE.MeshLambertMaterial({ color: 0xb08a38, emissive: 0x3a2a08 }); mk(lists.gold, B.goldMat);
  // the marks laid over each ledge: what your piece can reach, what you're looking at, where they mean to land
  for (let s = 0; s < 64; s++) {
    const [x, y] = m17SqXY(s), m = new THREE.Mesh(new THREE.PlaneGeometry(M17.S - M17.GAP * 2 - 0.3, M17.S - M17.GAP * 2 - 0.3), new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.copy(z3v(CX + x, CY + y, G0 + M17.OV)); m.visible = false; grp.add(m); B.ov.push(m);
  }
  // a ring for the square you're aiming at
  B.ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.5, 40), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.85, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  B.ring.rotation.x = -Math.PI / 2; B.ring.visible = false; grp.add(B.ring);
  // the Light's pieces on their plinths along rank 1
  for (let f = 0; f < 8; f++) {
    const [px, py] = m17Plinth(f), P = new THREE.Group(); P.position.copy(z3v(CX + px, CY + py, G0));
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.35, 16), z3Lam('#5a5a54')); st.position.y = 0.17; P.add(st);
    const pc = m17Piece(M17.RANK1[f], true, 2.1); pc.position.y = 0.35; pc.rotation.y = Math.PI; P.add(pc);
    grp.add(P); B.plin.push({ P, pc });
  }
  // the Light, to the south: the tower on its rock, its lantern, and the beam going round
  const [tx, ty] = M17.TOWER, T = new THREE.Group(); T.position.copy(z3v(CX + tx, CY + ty, 0)); grp.add(T);
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.4, 30, 20), z3Lam('#d8d4c8')); tw.position.y = 17; T.add(tw);
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(9, 12, 3, 12), z3Lam('#3a3c38')); rock.position.y = 1; T.add(rock);
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 3, 16), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); lan.position.y = 33.5; T.add(lan); B.lan = lan;
  const dome = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2, 16), z3Lam('#8a2a22')); dome.position.y = 36; T.add(dome);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,224,150,0.9)', 'rgba(255,210,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.scale.setScalar(16); halo.position.y = 33.5; T.add(halo); B.halo = halo;
  const beamG = new THREE.ConeGeometry(7, 170, 24, 1, true); beamG.translate(0, -85, 0); beamG.rotateZ(Math.PI / 2);
  const beam = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  const pivot = new THREE.Group(); pivot.position.y = 33.5; pivot.add(beam); T.add(pivot); B.beam = beam; B.pivot = pivot;
  // skerries round the board's edge, and a few far off, so it's the reef and not a floor
  for (let i = 0; i < 30; i++) { const a = rr() * 6.283, d = 36 + rr() * 40, r = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + rr() * 2.6, 0), z3Lam('#2e302e')); r.position.copy(z3v(CX + Math.cos(a) * d, CY + Math.sin(a) * d, -0.4 + rr() * 0.6)); r.scale.y = 0.5 + rr() * 0.6; r.rotation.y = rr() * 6; if (Math.abs(Math.cos(a) * d - tx) < 14 && Math.abs(Math.sin(a) * d - ty) < 14) continue; grp.add(r); }
  cplBuild3D(grp);
  M17S.snow = typeof m4Sleet === 'function' ? m4Sleet(grp) : null;
  return B;
}
// an emblem over a piece on the board: a small carved piece, floating, turning (made as it's first wanted)
function m17Emblem(key, t, light) {
  const B = M17S.b3; if (!B) return null;
  let e = B.emb.get(key);
  if (e && (e.t !== t || e.light !== light)) { B.grp.remove(e.g); cpcDispose(e.g); B.emb.delete(key); e = null; }
  if (!e) { e = { g: m17Piece(t, light, 0.62), t, light, seen: 0 }; B.grp.add(e.g); B.emb.set(key, e); }
  e.seen = 1; return e;
}
function m17EmblemsSweep() { const B = M17S.b3; if (!B) return; for (const [k, e] of B.emb) { if (!e.seen) { B.grp.remove(e.g); cpcDispose(e.g); B.emb.delete(k); } else e.seen = 0; } }

// ---------- who's where (every screen) ----------
// everyone standing: [sid, x, y] (world; hosting, everyone; joined, me and the others as I see them)
function m17People() {
  const out = [], m = FPS.me;
  // (one of you in the air, being carried, is on no square yet)
  if (!(m.dead > 0) && !ZM.ghost && !((m.jz || 0) > 0.6)) out.push([m.id, m.x, m.y, zmIsDown()]);
  for (const r of FPS.remote.values()) if (!r.dead && r.x != null && !((r.jz || 0) > 0.6)) out.push([r.id, r.x, r.y, !!r.down]);
  return out;
}
const m17SqOf = (x, y) => m17SqAt(x - FPSC.CX, y - FPSC.CY);
// what's on each square: { w: Wrecker piece index, k: their keeper, h: Holm, p: [sids] }
function m17Occ() {
  const S = RAID.st, o = new Array(64).fill(null).map(() => ({ w: -1, k: 0, h: 0, p: [] }));
  (S.wp || []).forEach((p, i) => { if (p[2] && p[1] >= 0) o[p[1]].w = i; });
  if (S.bk >= 0 && !S.bkDown) o[S.bk].k = 1;
  if (S.holm >= 0) o[S.holm].h = 1;
  for (const [sid, x, y, down] of m17People()) { const s = m17SqOf(x, y); if (s >= 0 && !down) o[s].p.push(sid); }
  return o;
}
// the squares the Wreckers attack (their pieces, and their keeper's ring), and the ones you do
function m17WreckAtt(O) {
  const S = RAID.st, A = new Uint8Array(64);
  const occ = q => O[q].w >= 0 || O[q].k ? 1 : O[q].h ? 3 : O[q].p.length ? 2 : 0;
  (S.wp || []).forEach(p => { if (p[2]) for (const q of m17Moves(p[0], p[1], occ, -1, true)) A[q] = 1; });
  if (S.bk >= 0 && !S.bkDown) for (const q of m17Moves(6, S.bk, occ, -1, true)) A[q] = 1;
  return A;
}
function m17LightAtt(O) {
  const S = RAID.st, A = new Uint8Array(64);
  const occ = q => O[q].w >= 0 || O[q].k ? 2 : O[q].h ? 1 : 0;
  for (const [sid, x, y, down] of m17People()) { if (down) continue; const s = m17SqOf(x, y); if (s < 0) continue; for (const q of m17Moves((S.pc || {})[sid] | 0, s, occ, 1, true)) A[q] = 1; }
  if (S.holm >= 0) for (const q of m17Moves(6, S.holm, occ, 1, true)) A[q] = 1;
  return A;
}
// where my piece can go from where I stand (the ledges I may be carried to)
function m17MyLegal() {
  const S = RAID.st, m = FPS.me, s = m17SqOf(m.x, m.y); if (s < 0) return [];
  const O = m17Occ(), occ = q => O[q].w >= 0 ? 2 : O[q].k || O[q].h ? 3 : 0;
  return m17Moves((S.pc || {})[m.id] | 0, s, occ, 1, false);
}

// ---------- the Wreckers' pieces (hosting or alone) ----------
// S.wp: [[type, square, alive], ...]; M17S.z[i]: the man standing for it (one of src/cpm02g.js's gang)
function m17WSpawn(t, s) {
  const S = RAID.st, n = Math.max(1, ZM.hum.length), [x, y] = m17SqXY(s);
  const z = cpgSpawn(x, y, { h: Math.PI, gun: t !== 1, aware: true, hp: t === 1 ? zmHp(5) * 1.3 * (1 + 0.2 * (n - 1)) : undefined, n: t === 1 ? 'a Wrecker’s hand' : 'a Wrecker' });
  z.sp = 0.001; z.m17 = 1;
  S.wp.push([t, s, 1]); M17S.z[S.wp.length - 1] = z;
  return z;
}
function m17WTick(dt) {
  const S = RAID.st;
  S.wp.forEach((p, i) => {
    const z = M17S.z[i]; if (!z || !p[2]) return;
    if (z.dead) { p[2] = 0; if (p[0] === 1) S.lostH = (S.lostH | 0) + 1; return; }
    const A = M17S.anim['w' + i], [x, y] = m17SqXY(p[1]);
    let wx = FPSC.CX + x, wy = FPSC.CY + y;
    if (A && A.t < 1) { const [ax, ay] = m17SqXY(A.f), k = A.t * A.t * (3 - 2 * A.t); wx = FPSC.CX + ax + (x - ax) * k; wy = FPSC.CY + ay + (y - ay) * k; }
    z.x = wx; z.y = wy; z.lx = wx; z.ly = wy; z.walk = !!(A && A.t < 1);
  });
}
// (each screen) a piece's slide from one square to the next, as the host's word moves it
function m17AnimTick(dt) {
  const S = RAID.st;
  (S.wp || []).forEach((p, i) => { const k = 'w' + i, A = M17S.anim[k]; if (!A) { M17S.anim[k] = { s: p[1], f: p[1], t: 1 }; return; } if (A.s !== p[1]) { A.f = A.s; A.s = p[1]; A.t = 0; } A.t = Math.min(1, A.t + dt / 0.55); });
  for (const k of ['bk', 'holm']) { const s = S[k], A = M17S.anim[k]; if (s == null || s < 0) continue; if (!A) { M17S.anim[k] = { s, f: s, t: 1 }; continue; } if (A.s !== s) { A.f = A.s; A.s = s; A.t = 0; } A.t = Math.min(1, A.t + dt / 0.8); }
}
const m17AnimXY = (k, s) => { const A = M17S.anim[k], [x, y] = m17SqXY(s); if (!A || A.t >= 1 || A.s !== s) return [x, y]; const [ax, ay] = m17SqXY(A.f), q = A.t * A.t * (3 - 2 * A.t); return [ax + (x - ax) * q, ay + (y - ay) * q]; };

// (hosting) the Wreckers' moves for the next beat: [[piece index (or -1, their keeper), to], ...], best first
function m17Plan(o) {
  const S = RAID.st, O = m17Occ(), LA = o.bk ? m17LightAtt(O) : null, plan = [], used = new Set(), n = Math.max(1, ZM.hum.length);
  const ppl = m17People().filter(p => !p[3]).map(p => m17SqOf(p[1], p[2])).filter(s => s >= 0);
  const occW = q => O[q].w >= 0 || O[q].k ? 1 : O[q].h ? 3 : O[q].p.length ? 2 : 0;
  const near = q => ppl.length ? Math.min(...ppl.map(p => m17KD(p, q))) : 4;
  const way = S.holm >= 0 ? m17Moves(6, S.holm, () => 0, 1, true).filter(q => m17LD(q) < m17LD(S.holm)) : [];
  const cands = [];
  S.wp.forEach((p, i) => {
    if (!p[2] || (M17S.anim['w' + i] && M17S.anim['w' + i].t < 1)) return;
    for (const q of m17Moves(p[0], p[1], occW, -1, false)) {
      let v = Math.random() * 4;
      if (O[q].p.length) v += o.cap || 90;
      if (o.lit && m17LightSq(q) && S.lit[M17.LIGHT.indexOf(q)]) v += 55;
      if (p[0] === 1) v += 6;
      v += 3 * (near(p[1]) - near(q));
      if (way.length) { const occ2 = r => r === p[1] ? 0 : r === q ? 1 : occW(r); const now = m17Moves(p[0], q, occ2, -1, true); v += 9 * way.filter(r => now.includes(r)).length; }
      if (p[0] !== 1 && near(q) <= 1) v -= 6;   // (a great piece keeps its distance, and uses its pistol)
      cands.push([v, i, q]);
    }
  });
  cands.sort((a, b) => b[0] - a[0]);
  const N = (o.n || 1) + (n >= 3 ? 1 : 0);
  for (const [v, i, q] of cands) { if (plan.length >= N) break; if (used.has(q) || plan.some(P => P[0] === i)) continue; plan.push([i, q]); used.add(q); }
  // their keeper: a step towards the gold, every second beat; never into a square you attack, nor beside Holm, nor while in check
  if (o.bk && S.bk >= 0 && !S.bkDown && S.dark <= 0 && S.beatN >= 2 && S.beatN % M17.BK_EVERY === 0) {
    if (LA[S.bk]) S.bkHeld = 2;
    else {
      const occK = q => O[q].w >= 0 ? 1 : O[q].h ? 3 : O[q].p.length ? 2 : 0;
      const opts = m17Moves(6, S.bk, occK, -1, false).filter(q => !LA[q] && !used.has(q) && !(S.holm >= 0 && m17KD(q, S.holm) <= 1)).sort((a, b) => m17LD(a) - m17LD(b) || Math.random() - 0.5);
      if (opts.length && m17LD(opts[0]) < m17LD(S.bk)) { plan.push([-1, opts[0]]); S.bkHeld = 0; } else S.bkHeld = 1;
    }
  }
  return plan;
}
// (hosting) the beat: the plan carried out
function m17Beat(o) {
  const S = RAID.st, O = m17Occ();
  for (const [i, q] of S.plan || []) {
    if (i >= 0) { const p = S.wp[i]; if (!p || !p[2] || O[q].w >= 0 || O[q].h) continue; p[1] = q; }
    else { if (O[q].w >= 0 || O[q].h) continue; S.bk = q; }
    for (const sid of O[q].p) cpEvent('m17take', [sid, i < 0 ? 6 : S.wp[i][0]]);
    if (O[q].p.length) S.takes = (S.takes | 0) + 1;
    const li = M17.LIGHT.indexOf(q); if (li >= 0 && S.lit) { if (S.lit[li]) cpEvent('m17dark', li); S.lit[li] = 0; }
  }
  cpEvent('m17beat', S.beatN);
  S.plan = null; S.beatN++;
}
// (hosting, each frame) the beat's clock: the plan made M17.WARN seconds before it, carried out on it
function m17BeatTick(dt, o) {
  const S = RAID.st;
  S.beatT -= dt;
  if (!S.plan && S.beatT <= M17.WARN) S.plan = m17Plan(o);
  if (S.beatT <= 0) { m17Beat(o); S.beatT += M17.BEAT * (o.slow || 1); }
}
// (hosting) more of their hands, onto an empty square of rank 7 or 8, while the pool lasts
function m17Reinforce(want) {
  const S = RAID.st, alive = S.wp.filter(p => p[2]).length; if (alive >= want || S.pool <= 0) return;
  const O = m17Occ(), free = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63].filter(q => O[q].w < 0 && !O[q].k && !O[q].p.length && !O[q].h);
  if (!free.length) return;
  S.pool--; m17WSpawn(1, free[(Math.random() * free.length) | 0]);
}

// ---------- the board state, each part's ----------
function m17Enter(o) {
  const S = RAID.st, n = Math.max(1, ZM.hum.length || 1);
  Object.assign(S, { m17: 1, wp: [], pc: {}, plan: null, beatT: M17.BEAT + 3, beatN: 0, lit: [0, 0, 0, 0], pool: M17.POOL[0] + M17.POOL[1] * n, holm: -1, bk: -1, bkDown: 0, bkHeld: 0, dark: 0, lamp: 1, t: 0, said: {}, takes: 0, n }, o || {});
  M17S.z = []; M17S.anim = {}; M17S.arc = null; M17S.cd = 0; M17S.aim = -1; M17S.said = {}; M17S.seenEv = {};
  // (my own ledge to start on, and to be set back on: one each along rank 1, beside the plinths)
  const slot = Math.max(0, (ZM.hum || []).findIndex(h => h[0] === FPS.me.id));
  M17S.home = M17.HOME[slot % 4];
  m17Home();
}
function m17Home() { const m = FPS.me, [x, y] = m17W(M17S.home); m.x = x + 0.5; m.y = y + 1.2; m.jz = m.fl = 0; m.vz = 0; m.h = 0; m.p = -0.12; }
// (hosting) a player's ask
function m17Q(sid, k, a) {
  const S = RAID.st; if (!S.m17) return false;
  // (where they stand as the host last heard, in the air or not: a joined player's word runs a little behind)
  const r = sid === FPS.me.id ? FPS.me : FPS.remote.get(sid); if (!r || r.x == null) return true;
  const s = m17SqOf(r.x, r.y);
  if (k === 'pick') {
    const f = a | 0; if (f < 0 || f > 7 || s !== f) return true;
    const t = M17.RANK1[f]; if (t === 6) return true;
    const held = Object.keys(S.pc).find(q => S.pc[q] === t && S.pcF && S.pcF[q] === f);
    if (held && held !== sid) return true;
    S.pc[sid] = t; (S.pcF = S.pcF || {})[sid] = f;
    cpEvent('m17pick', [sid, t]);
    return true;
  }
  if (k === 'take') {
    const q = a | 0, i = S.wp.findIndex(p => p[2] && p[1] === q);
    if (i < 0) return true;
    const z = M17S.z[i]; if (z && !z.dead) zmKill(z, false, '', 'take', sid);
    S.wp[i][2] = 0; if (S.wp[i][0] === 1) S.lostH = (S.lostH | 0) + 1; S.caps = (S.caps | 0) + 1;
    cpEvent('m17cap', [q, S.wp[i][0]]);
    return true;
  }
  if (k === 'noise' || k === 'douse') return false;
  return false;
}
function m17Pack(o) {
  const S = RAID.st;
  o.m17 = [S.wp.map(p => [p[0], p[1], p[2]]), Math.round(S.beatT * 10) / 10, (S.plan || []).map(p => [p[0], p[1]]), S.lit.join(''), S.pc, S.pcF || {}, S.holm, S.bk, S.bkDown ? 1 : 0, Math.round(S.dark * 10) / 10, Math.round(S.lamp * 1000) / 1000, S.bkHeld | 0, S.hplan == null ? -1 : S.hplan, S.beatN, Math.round((S.bkHp == null ? 1 : S.bkHp) * 100) / 100];
}
function m17Apply(o) {
  const S = RAID.st, a = o.m17; if (!Array.isArray(a)) return;
  S.wp = Array.isArray(a[0]) ? a[0].map(p => [p[0] | 0, p[1] | 0, p[2] | 0]) : [];
  S.beatT = +a[1] || 0; S.plan = Array.isArray(a[2]) ? a[2].map(p => [p[0] | 0, p[1] | 0]) : null;
  S.lit = String(a[3] || '0000').split('').map(c => +c ? 1 : 0);
  S.pc = a[4] && typeof a[4] === 'object' ? a[4] : {}; S.pcF = a[5] && typeof a[5] === 'object' ? a[5] : {};
  S.holm = a[6] == null ? -1 : a[6] | 0; S.bk = a[7] == null ? -1 : a[7] | 0; S.bkDown = a[8] | 0; S.dark = +a[9] || 0; S.lamp = +a[10] || 0; S.bkHeld = a[11] | 0; S.hplan = a[12] == null ? -1 : a[12] | 0; S.beatN = a[13] | 0; S.bkHp = a[14] == null ? 1 : +a[14];
}

// ---------- your own side of it (every screen, each frame) ----------
// where you're looking on the board: the legal square nearest your line of sight
function m17Aim(legal) {
  const m = FPS.me; if (!legal.length) return -1;
  const ez = (m.jz || 0) + FPSC.EYE, dx = Math.sin(m.h) * Math.cos(m.p), dy = Math.cos(m.h) * Math.cos(m.p), dz = Math.sin(m.p);
  if (dz < -0.02) { const t = ez / -dz, gx = m.x + dx * t - FPSC.CX, gy = m.y + dy * t - FPSC.CY, s = m17SqAt(gx, gy); if (legal.includes(s)) return s; }
  let best = -1, bd = 0.16;
  for (const s of legal) { const [wx, wy] = m17W(s), vx = wx - m.x, vy = wy - m.y, vz = -ez, L = Math.hypot(vx, vy, vz), c = (vx * dx + vy * dy + vz * dz) / L, a = Math.acos(clamp(c, -1, 1)); if (a < bd) { bd = a; best = s; } }
  return best;
}
// carried to square s (by the rules, from where you stand)
function m17Go(s) {
  const m = FPS.me, S = RAID.st; if (M17S.arc || M17S.cd > 0 || s < 0) return;
  const t = (S.pc || {})[m.id] | 0, [tx, ty] = m17W(s), d = Math.hypot(tx - m.x, ty - m.y);
  M17S.arc = { fx: m.x, fy: m.y, tx: tx + (Math.random() - 0.5) * 0.6, ty: ty + (Math.random() - 0.5) * 0.6, t: 0, d: t === 2 ? 0.8 : clamp(0.32 + d * 0.022, 0.35, 0.95), h: t === 2 ? 3.2 : 0.7 + d * 0.02, s, ty0: t };
  m17Knock(0.6, 380); M17S.aim = -1;
}
function m17ArcTick(dt) {
  const A = M17S.arc, m = FPS.me; if (!A) return;
  A.t += dt; const k = clamp(A.t / A.d, 0, 1), e = k * k * (3 - 2 * k);
  m.x = A.fx + (A.tx - A.fx) * e; m.y = A.fy + (A.ty - A.fy) * e; m.jz = 4 * A.h * k * (1 - k); m.vz = 0; m.protect = Math.max(m.protect || 0, 0.25);
  if (k >= 1) {
    M17S.arc = null; m.jz = 0; m.fl = 0; M17S.cd = A.ty0 === 5 ? M17.CD5 : M17.CD;
    m17Knock(0.9, 240); FPS.shake = Math.max(FPS.shake || 0, 0.25);
    const S = RAID.st; if ((S.wp || []).some(p => p[2] && p[1] === A.s)) raidAsk('take', A.s);
  }
}
// a carved piece set down on wood: the sound of the game
function m17Knock(v, f) { try { if (soundOff()) return; tone(f || 300, 'triangle', 0.002, 0.18 * v, 0.09, { to: (f || 300) * 0.7 }); noise('bandpass', 1800, 3, 0.001, 0.08 * v, 0.05); } catch (e) {} }
// (every screen) the board's part of the stage's me(dt)
function m17Me(dt) {
  const S = RAID.st, m = FPS.me;
  m17AnimTick(dt);
  if (cpCineOn()) { M17S.arc = null; return; }
  if (M17S.cd > 0) M17S.cd -= dt;
  m17ArcTick(dt);
  // (somehow off the ledges, or in a channel: back to my own)
  if (!M17S.arc && !(m.dead > 0) && !ZM.ghost && m17Block(m.x, m.y, 0.05)) { const s = m17SqOf(m.x, m.y); if (s >= 0 && !m17Rock(s)) { const [x, y] = m17W(s); m.x = x; m.y = y + 0.4; } else m17Home(); }
  M17S.legal = M17S.arc || M17S.cd > 0 || zmIsDown() || m.dead > 0 ? [] : m17MyLegal();
  M17S.aim = m17Aim(M17S.legal);
}
// (the stage's speedK) still while you're carried
const m17SpeedK = () => M17S.arc ? 0.001 : 1;
function m17Consider(c) {
  const S = RAID.st, m = FPS.me, s = m17SqOf(m.x, m.y);
  if (s >= 0 && s < 8 && M17.RANK1[s] !== 6) {
    const t = M17.RANK1[s], F = S.pcF || {}, P = S.pc || {}, other = Object.keys(F).some(q => q !== m.id && (F[q] | 0) === s && P[q] === t), mine = (F[m.id] | 0) === s && P[m.id] === t;
    const [px, py] = m17Plinth(s); if (!other && !mine) c({ k: 'm17pick', id: 'pl' + s, f: s }, FPSC.CX + px, FPSC.CY + py, 0, 2.6, false);
  }
  if (M17S.aim >= 0) c({ k: 'm17mv', id: 'mv' + M17S.aim, sq: M17S.aim }, m.x + Math.sin(m.h) * 2.25, m.y + Math.cos(m.h) * 2.25, m.jz || 0, 3, false);
}
function m17Prompt(o) {
  const S = RAID.st;
  if (o.k === 'm17mv') { const cap = (S.wp || []).some(p => p[2] && p[1] === o.sq); return { text: `${cap ? 'Take the Wrecker on' : 'Move to'} ${m17Name(o.sq)}` }; }
  if (o.k === 'm17pick') { const t = M17.RANK1[o.f]; return { text: `Take up the ${M17.NAMES[t]}: ${M17.HOW[t]}` }; }
  return null;
}
function m17Use(o) {
  if (o.k === 'm17mv') { m17Go(o.sq); return true; }
  if (o.k === 'm17pick') { raidAsk('pick', o.f); m17Knock(0.7, 520); return true; }
  return false;
}
// what the board says to every screen
cpOn('m17take', a => {
  if (!Array.isArray(a)) return;
  const [sid, t] = a, m = FPS.me;
  if (sid === m.id && !(m.dead > 0) && !zmIsDown()) {
    M17S.arc = null; m.protect = 0; m.iframe = 0; fpsHurt(M17.TAKEN, null, null);
    if (!zmIsDown() && !(m.dead > 0)) { m17Home(); m.protect = 1.6; }
    FPS.shake = 1; ZM.banner = { text: 'Taken', t: 2.2, sub: `A Wrecker’s ${M17.NAMES[t | 0] || 'piece'} landed on your square. Back to your rank.`, col: '#ff9a7a' };
  }
  m17Knock(1, 160);
});
cpOn('m17cap', a => { m17Knock(1.1, 200); if (Array.isArray(a)) { const [x, y] = m17W(a[0] | 0); for (let i = 0; i < 10; i++) FPS.parts.push({ x: x + (Math.random() - 0.5), y: y + (Math.random() - 0.5), z: FPSC.GROUND + 0.4 + Math.random(), vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 1 + Math.random() * 2, t: 0.8, c: '255,214,140' }); } });
cpOn('m17pick', a => { if (Array.isArray(a) && a[0] === FPS.me.id) { fpsFeed(`You took up the ${M17.NAMES[a[1] | 0]}: ${M17.HOW[a[1] | 0]}.`); } });
cpOn('m17beat', () => { m17Knock(0.8, 210); });
cpOn('m17dark', () => { try { sfxPlay('wind', { vol: 0.4 }); } catch (e) {} });

// ---------- the 3D, each frame (every screen) ----------
function m17Draw3D(dt, o) {
  const S = RAID.st, B = M17S.b3; if (!B) return;
  const t = g.t, m = FPS.me, myT = (S.pc || {})[m.id] | 0;
  if (GL3D.sea && !GL3D.sea.visible) GL3D.sea.visible = true;
  cplSky({ amb: 0.34, moon: 0.12, ambC: [0.8, 0.86, 1], fog: [0.025, 0.032, 0.045], near: 30, far: 300 });
  // the marks: red where they mean to land, a faint red where they attack (with Holm on the board), gold where I can go
  const O = m17Occ(), WA = S.holm >= 0 ? m17WreckAtt(O) : null, plan = new Set((S.plan || []).map(p => p[1])), legal = new Set(M17S.legal || []);
  const lit = sq => { const i = M17.LIGHT.indexOf(sq); return i >= 0 && (M17S.blaze || (o.goldAll ? o.goldAll() : S.lit[i])); };
  for (let s = 0; s < 64; s++) {
    const ov = B.ov[s], M = ov.material; let a = 0, col = 0xffd88a;
    if (plan.has(s)) { col = 0xff4a30; a = 0.32 + 0.22 * Math.sin(t * 10); }
    else if (legal.has(s)) { col = 0xffd88a; a = s === M17S.aim ? 0.45 : 0.2 + 0.05 * Math.sin(t * 3); }
    else if (WA && WA[s] && !m17Rock(s)) { col = 0xc03020; a = 0.1; }
    else if (S.hplan === s) { col = 0xfff0b0; a = 0.22 + 0.1 * Math.sin(t * 6); }
    ov.visible = a > 0.01; if (ov.visible) { M.color.setHex(col); M.opacity = a; }
  }
  if (M17S.aim >= 0) { const [x, y] = m17W(M17S.aim); B.ring.visible = true; B.ring.position.copy(z3v(x, y, FPSC.GROUND + 0.06)); B.ring.rotation.z = t * 0.6; B.ring.material.opacity = 0.65 + 0.25 * Math.sin(t * 7); } else B.ring.visible = false;
  // the gold: brighter where it's lit
  const nl = M17.LIGHT.filter(lit).length;
  B.goldMat.emissive.setRGB(0.2 + 0.5 * nl / 4, 0.14 + 0.36 * nl / 4, 0.03 + 0.06 * nl / 4);
  M17.LIGHT.forEach((q, i) => { const L = M17S.gold && M17S.gold[i]; if (L) cplSet(L, !!lit(q)); });
  cplTick3D(dt);
  // the carved pieces on their plinths: gone from a plinth while one of you holds it
  const heldF = new Set(Object.keys(S.pcF || {}).filter(q => S.pc[q] === M17.RANK1[S.pcF[q] | 0]).map(q => S.pcF[q] | 0));
  B.plin.forEach((P, f) => { P.pc.visible = !heldF.has(f) && !(f === 4 && S.holm >= 0); P.pc.rotation.y = Math.PI + Math.sin(t * 0.4 + f) * 0.06; });
  // emblems: over each Wrecker's piece, over each of the others of you, over Holm
  (S.wp || []).forEach((p, i) => { if (!p[2]) return; const e = m17Emblem('w' + i, p[0], false); if (!e) return; const [x, y] = m17AnimXY('w' + i, p[1]); e.g.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + 2.55 + 0.12 * Math.sin(t * 2 + i))); e.g.rotation.y = t * 0.8 + i; });
  for (const r of FPS.remote.values()) { if (r.dead || r.x == null) continue; const pt = (S.pc || {})[r.id] | 0; if (!pt) continue; const e = m17Emblem('p' + r.id, pt, true); if (e) { e.g.position.copy(z3v(r.x, r.y, FPSC.GROUND + (r.jz || 0) + 2.45 + 0.1 * Math.sin(t * 2))); e.g.rotation.y = t; } }
  if (S.holm >= 0) { const [x, y] = m17AnimXY('holm', S.holm), e = m17Emblem('holm', 6, true); if (e) { e.g.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + 2.6 + 0.1 * Math.sin(t * 1.6))); e.g.rotation.y = t * 0.6; } }
  if (S.bk >= 0 && !S.bkDown) { const [x, y] = m17AnimXY('bk', S.bk), e = m17Emblem('bk', 6, false); if (e) { e.g.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + 4.7 + 0.12 * Math.sin(t * 1.3))); e.g.rotation.y = -t * 0.5; e.g.scale.setScalar(0.85); } }
  m17EmblemsSweep();
  // the Light: its beam round (dimmed as the lamp runs down), its lantern
  const lk = M17S.blaze ? 1.5 : o.lampK ? o.lampK() : 1;
  B.pivot.rotation.y = -t * (Math.PI * 2 / M17.BEAT);
  B.beam.material.opacity = 0.03 + 0.08 * lk; B.halo.material.opacity = 0.3 + 0.7 * lk; B.lan.material.color.setRGB(0.4 + 0.6 * lk, 0.35 + 0.53 * lk, 0.25 + 0.38 * lk);
  if (M17S.snow) m4SleetTick(M17S.snow, 0.5, dt);
}
function m17Exit() {
  M17S.b3 = null; M17S.arc = null; M17S.snow = null; m17NpcFree();
}

// ---------- the HUD (every screen) ----------
function m17Hud(phone, mono, fell, o) {
  const S = RAID.st, m = FPS.me, myT = (S.pc || {})[m.id] | 0, t = g.t;
  let row = 0;
  cpkLine(`${myT ? 'YOUR PIECE: THE ' + M17.NAMES[myT].toUpperCase() : 'NO PIECE YET: ON FOOT'} · ${M17.HOW[myT].toUpperCase()}${M17S.cd > 0 ? ' · STEADYING' : ''}`, row++, '#ffe0a0');
  cpkBar(`THE WRECKERS MOVE IN ${Math.max(0, S.beatT).toFixed(1)} S`, 1 - clamp(S.beatT / M17.BEAT, 0, 1), row++, S.beatT < M17.WARN ? '#e86a50' : '#c8b890');
  if (o && o.rows) row = o.rows(row);
  // my square marked for them
  const mine = m17SqOf(m.x, m.y);
  if ((S.plan || []).some(p => p[1] === mine) && !M17S.arc && !(m.dead > 0)) { ctx.textAlign = 'center'; ctx.font = fell(phone ? 20 : 30); ctx.fillStyle = `rgba(255,120,90,${0.75 + 0.25 * Math.sin(t * 12)})`; ctx.fillText('They mean to land on your square! Move!', cx, H * 0.3); }
  else if (!M17S.legal.length && !M17S.arc && M17S.cd <= 0 && !(m.dead > 0) && !zmIsDown()) { ctx.textAlign = 'center'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText('Your piece has nowhere to go from here', cx, H - (phone ? 120 : 100)); }
  else if (M17S.legal.length && M17S.aim < 0 && !M17S.arc && S.t < 40) { ctx.textAlign = 'center'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(236,228,207,0.75)'; ctx.fillText('Look at a gold-marked square and press Use to move there', cx, H - (phone ? 120 : 100)); }
}

// ---------- Holm on the board, and their keeper ----------
// (every screen) Holm's figure, in his cap with his lantern, on his square
var M17P = { holm: null };
function m17NpcDraw(dt) {
  const S = RAID.st;
  if (S.holm >= 0) {
    if (!M17P.holm) M17P.holm = cpkNpc(['#1e2430', '#d8d0bc', '#a08a50', '#ffd88a'], '');
    const [x, y] = m17AnimXY('holm', S.holm), A = M17S.anim.holm, mv = A && A.t < 1;
    cpkNpcPose(M17P.holm, { x: FPSC.CX + x, y: FPSC.CY + y - 0.8, h: 0, spd: mv ? 2.2 : 0, dt, lan: true, noGun: true });
  } else m17NpcFree();
}
function m17NpcFree() { if (M17P.holm) { cpkNpcFree(M17P.holm); M17P.holm = null; } }

// their keeper: one of the gang, half as big again, with his false light on a pole
const M17B = { SC: 1.45, POLE: 3.9 };
ZBT.m17bk = Object.assign({}, ZBT.cpgang, {
  n: 'the Wreckers’ keeper', N: 'The Wreckers’ Keeper', rad: 0.62, tall: 2.7, headZ: 2.2, pad: 0.45,
  killLine: who => `${who} put down the Wreckers’ keeper.`,
  build() {
    const M = cpgBuild(), pole = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, M17B.POLE / M17B.SC, 6), z3Lam('#3a2a1c')); p.position.y = M17B.POLE / M17B.SC / 2; pole.add(p);
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), z3Lam('#2a2420')); cage.position.y = M17B.POLE / M17B.SC + 0.05; pole.add(cage);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9a50 })); fl.position.copy(cage.position); pole.add(fl);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,150,80,0.95)', 'rgba(255,120,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.scale.setScalar(2.4); halo.position.copy(cage.position); pole.add(halo);
    pole.position.set(-0.42, 0, -0.1); M.root.add(pole);
    return Object.assign(M, { pole, fl, fhalo: halo });
  },
  pose(z, M, dt) {
    cpgPose(z, M, dt);
    const cr = M.root.scale.y; M.root.scale.set(M17B.SC, M17B.SC * cr, M17B.SC);
    const out = (RAID.st.dark > 0) || z.dead;
    M.fl.visible = !out; M.fhalo.material.opacity = out ? 0 : 0.75 + 0.2 * Math.sin(g.t * 13);
    M.pole.rotation.z = Math.sin(g.t * 1.1) * 0.05;
  },
});
ZB_KINDS.push('m17bk');
// (hosting) him, on square s
function m17BkSpawn(s) {
  const n = Math.max(1, ZM.hum.length), [x, y] = m17SqXY(s), zn = ++ZM.zc, wx = FPSC.CX + x, wy = FPSC.CY + y;
  const hp = (typeof zbHpOf === 'function' ? zbHpOf('moon', 10, n) : zmHp(10) * 20) * 1.15;
  const z = { drowned: true, zm: true, boss: true, bt: 'm17bk', zn, id: 'z' + zn.toString(36), n: 'the Wreckers’ keeper', kind: 'boss', x: wx, y: wy, jz: 0, fl: 0, hp, max: hp, sp: 0.001,
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: Math.PI, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [], act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5,
    ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy, gun: true, aware: 1, h0: Math.PI, aimCd: 2, wakeT: 9, strafe: 1, m17: 1 };
  ZBT.m17bk.init(z); zbMake(z, 'm17bk'); ZM.z.push(z); FPS.drowned = ZM.z; ZB.seen.add(zn);
  M17S.bkz = z; return z;
}
// where his false light is (the world), for a shot to find it
function m17FalseAt() {
  const S = RAID.st; if (S.bk < 0) return null;
  const z = ZM.z.find(q => q.bt === 'm17bk' && !q.dead), F = z && z.mdl && z.mdl.fl;
  if (F) { const v = new THREE.Vector3(); F.getWorldPosition(v); return [v.x, -v.z, v.y]; }
  const [x, y] = m17AnimXY('bk', S.bk); return [FPSC.CX + x - 0.55, FPSC.CY + y + 0.1, FPSC.GROUND + M17B.POLE + 0.1];
}
// (every screen: the stage's shot hook) a shot of mine, along (lh, lp) from (x, y, z): did it find the false light?
function m17Shot(x, y, z, lh, lp) {
  const S = RAID.st, P = m17FalseAt(); if (!P || S.dark > 0 || S.bkDown) return;
  const dx = Math.sin(lh) * Math.cos(lp), dy = Math.cos(lh) * Math.cos(lp), dz = Math.sin(lp), vx = P[0] - x, vy = P[1] - y, vz = P[2] - z, t = vx * dx + vy * dy + vz * dz;
  if (t < 0 || t > 70) return;
  const d = Math.hypot(vx - dx * t, vy - dy * t, vz - dz * t);
  if (d < 0.8) { const n = performance.now(); if (n - (M17S.douseAt || 0) < 500) return; M17S.douseAt = n; raidAsk('douse'); }
}

// =====================================================================================================================
// the parts
// =====================================================================================================================
const M17MAP = { start: [-3, -19.8], top: 0, isle: 'cpm17reef', shore: () => -999, nav: [-30, 30, -30, 30], R: 88, zones: { board: { n: 'the reef board', r: [-40, 40, -40, 40], sky: true } } };
// the hooks both parts share
function m17Stage(def) {
  return Object.assign({
    map: M17MAP, mend: true,
    set: (H, K) => m17Lay(H, K),
    block: (x, y, pad) => m17Block(x, y, pad),
    speedK: () => m17SpeedK(),
    consider: c => m17Consider(c), prompt: o => m17Prompt(o), use: o => m17Use(o),
    shot: (x, y, z, lh, lp) => { cpgShot(x, y); m17Shot(x, y, z, lh, lp); },
    pack: o => m17Pack(o), apply: o => m17Apply(o),
    b3: grp => m17Build3D(grp),
    exit: () => m17Exit(),
  }, def);
}
// (hosting) a line once, when it's time
function m17Say(k, ok, who, text, vo) { const S = RAID.st; if (!S.said[k] && ok) { S.said[k] = 1; cpSay(who, text, vo); return true; } return false; }

// ---------- II. The Reef Board ----------
cpStage('m17reef', m17Stage({
  n: 'The Gold Squares',
  enter() {
    m17Enter();
    if (ZM.net === 'client') return;
    const n = Math.max(1, ZM.hum.length);
    for (const s of [40, 41, 35, 36, 46, 47]) m17WSpawn(1, s);
    // their great pieces: more of them the more of you there are
    [[57, 2], [61, 3], [59, 5], [63, 4], [58, 3], [62, 2], [56, 4]].slice(0, Math.min(7, 3 + n)).forEach(([s, t]) => m17WSpawn(t, s));
    cpObjective('Take up one of the Light’s pieces from its plinth on your rank');
    cpWaypoint(-3, -22.6, 'The lantern', 2.6);
  },
  tick(dt) {
    const S = RAID.st; if (cpCineOn() || !S.m17) return;
    S.t += dt;
    m17WTick(dt);
    const b0 = S.beatN; m17BeatTick(dt, { lit: true, cap: 90 }); if (S.beatN !== b0) m17Reinforce(5 + 2 * S.n);
    // the gold: lit by one of you standing on it
    const O = m17Occ();
    M17.LIGHT.forEach((q, i) => { if (!S.lit[i] && O[q].p.length && O[q].w < 0) { S.lit[i] = 1; S.litN = (S.litN | 0) + 1; cpEvent('m17lit', i); } });
    const nl = S.lit.filter(Boolean).length, anyPc = Object.keys(S.pc).length > 0;
    if (nl >= 4) { cpObjective(''); cpWaypoint(null); cpDone(); return; }
    if (!anyPc && S.t < 50) { cpObjective('Take up one of the Light’s pieces from its plinth on your rank'); cpWaypoint(-3, -22.6, 'The lantern', 2.6); }
    else { cpObjective(`Light the four gold squares: stand a piece on each · ${nl} of 4 lit`); const q = M17.LIGHT.find((r, i) => !S.lit[i]); if (q != null) { const [x, y] = m17SqXY(q); cpWaypoint(x, y, 'The gold', 0.5); } }
    // what's said
    m17Say('a', S.t > 2, 'holm', 'Take up a piece. Stand on its square and lay hold of it. The keeper is mine.', 'cp_m17_20');
    m17Say('b', anyPc && S.t > 6, 'holm', 'Look where you would go, and go. You cannot walk the water between.', 'cp_m17_21');
    m17Say('c', S.beatN >= 1, 'holm', 'Every time the beam goes over, they move. Watch for the red. It is where they mean to land.', 'cp_m17_22');
    m17Say('d', (S.takes | 0) >= 1, 'holm', 'Taken. Back to your rank, and think before you stand in a man’s line.', 'cp_m17_23');
    m17Say('e', (S.caps | 0) >= 1, 'wreck', 'That was my brother’s piece, keeper. You will answer for it.', 'cp_m17_24');
    m17Say('f', nl >= 1, 'holm', 'There. One gold square lit. They will want it back.', 'cp_m17_25');
    m17Say('g', (S.darkN | 0) >= 1, 'holm', 'They have put the gold out again. Stand on it while it is yours.', 'cp_m17_26');
    m17Say('h', nl >= 3, 'holm', 'Three lit. One more, and the Light holds the middle of the board.', 'cp_m17_27');
    m17Say('i', S.t > 70 && nl < 2, 'venn', 'Your move, Holm. You have been an age about it.', 'cp_m17_28');
  },
  q(sid, k, a) { if (m17Q(sid, k, a)) return; cpgAsk(k, a); },
  me(dt) { m17Me(dt); },
  hud(phone, mono, fell) {
    const S = RAID.st;
    m17Hud(phone, mono, fell, { rows: r => { const nl = S.lit.filter(Boolean).length; cpkBar(`THE GOLD · ${nl} OF 4 LIT`, nl / 4, r, '#ffd070'); return r + 1; } });
  },
  f3(dt) { m17Draw3D(dt, {}); m17NpcDraw(dt); },
  music() { return 'cpm17board'; },
}));
cpOn('m17lit', () => { try { sfxPlay('beam', { vol: 0.55 }); } catch (e) {} m17Knock(0.9, 660); });
cpOn('m17dark', () => { if (ZM.net !== 'client' && RAID.st.m17) RAID.st.darkN = (RAID.st.darkN | 0) + 1; });

// ---------- III. The Wreckers' Keeper ----------
cpStage('m17keep', m17Stage({
  n: 'The Wreckers’ Keeper',
  enter() {
    m17Enter({ holm: 4, bk: 60, hT: M17.BEAT * 1.5, hplan: null, hHeld: 0, bkHp: 1 });
    if (ZM.net === 'client') return;
    const n = Math.max(1, ZM.hum.length);
    for (const s of [42, 43, 44, 45, 49, 54]) m17WSpawn(1, s);
    [[59, 5], [58, 3], [61, 3], [62, 2], [57, 2], [56, 4], [63, 4]].slice(0, Math.min(7, 3 + n)).forEach(([s, t]) => m17WSpawn(t, s));
    m17BkSpawn(60);
    cpObjective('See Holm to the gold: clear his way, and shoot out the false light');
  },
  tick(dt) {
    const S = RAID.st; if (cpCineOn() || !S.m17) return;
    S.t += dt;
    m17WTick(dt);
    // their keeper: kept on his square, and down for good once he's down
    const z = M17S.bkz;
    if (z && !S.bkDown) {
      if (z.dead) { S.bkDown = 1; S.dark = 0; cpEvent('m17bkdown', 1); cpSay('holm', 'He is down, and his light with him. The gold is ours. Now let me through.', 'cp_m17_40'); }
      else { const [x, y] = m17AnimXY('bk', S.bk); z.x = z.lx = FPSC.CX + x; z.y = z.ly = FPSC.CY + y; S.bkHp = z.hp / Math.max(1, z.max); }
    }
    const b0 = S.beatN; m17BeatTick(dt, { bk: true, cap: 80 }); if (S.beatN !== b0) m17Reinforce(4 + 2 * S.n);
    // the false light, and the lamp
    const lit = S.dark > 0 || S.bkDown;
    if (S.dark > 0) { S.dark -= dt; if (S.dark <= 0) { S.dark = 0; cpEvent('m17relit', 1); m17Say('relit', true, 'holm', 'His light is up again. The gold is dark. Put it out!', 'cp_m17_41'); } }
    S.lamp = clamp(S.lamp + (lit ? dt / M17.LAMP_MEND : -dt / M17.LAMP_DRAIN), 0, 1);
    if (S.lamp <= 0) { cpFail('The lamp ran dry while Holm slept over the board'); return; }
    if (S.bk >= 0 && !S.bkDown && m17LightSq(S.bk)) { cpFail('The Wreckers’ keeper stood on the Light'); return; }
    // Holm's own beat, half a beat after theirs: a step towards the gold, never into a square they attack
    S.hT -= dt;
    if (S.hplan == null && S.hT <= 1.4) S.hplan = m17HolmPlan(lit);
    if (S.hT <= 0) {
      S.hT += M17.BEAT;
      const q = S.hplan; S.hplan = null;
      if (q != null && q >= 0 && m17HolmOk(q, S.dark > 0.2 || S.bkDown)) { S.holm = q; S.hHeld = 0; cpEvent('m17step', q); if (m17LightSq(q)) { cpObjective(''); cpWaypoint(null); cpDone(); return; } }
      else { S.hHeld = (S.hHeld | 0) + 1; }
    }
    // the objective
    const [hx, hy] = m17SqXY(S.holm);
    if (!lit) { cpObjective('Shoot out the false light on their keeper’s pole · the gold is dark while it burns'); const [bx, by] = m17SqXY(S.bk); cpWaypoint(bx, by, 'The false light', M17B.POLE); }
    else { cpObjective(`The gold is lit! Clear Holm’s way to it${S.bkDown ? '' : ` · ${Math.ceil(S.dark)} s`}`); cpWaypoint(hx, hy, 'Holm', 2.4); }
    // what's said
    m17Say('a', S.t > 2, 'm17bk', 'The board is mine, keeper. It always was. Your lamp is going down.', 'cp_m17_30');
    m17Say('b', S.t > 7, 'holm', 'His light puts the gold out. Shoot the lantern off his pole, and I will walk.', 'cp_m17_31');
    m17Say('c', S.t > 14, 'holm', 'He is a keeper. He will not step where you can take him. Stand in his way.', 'cp_m17_32');
    m17Say('d', (S.dsN | 0) >= 1, 'holm', 'Out! Now, while it is dark on him.', 'cp_m17_33');
    m17Say('e', (S.hHeld | 0) >= 2 && lit, 'holm', 'Every square in front of me is covered. Clear me a line.', 'cp_m17_34');
    m17Say('f', S.bkHeld === 2, 'm17bk', 'Check, is it? Clever little pieces.', 'cp_m17_35');
    m17Say('g', S.lamp < 0.4, 'venn', 'Holm. The lamp is smoking. Holm, wake up.', 'cp_m17_36');
    m17Say('h', S.lamp < 0.2, 'holm', 'I hear him. Silas, by the lamp. Not yet. Not yet.', 'cp_m17_37');
    m17Say('i', S.bk >= 0 && m17LD(S.bk) <= 1 && !S.bkDown, 'holm', 'He is one step from the gold! Stand where he would go!', 'cp_m17_38');
    m17Say('j', m17LD(S.holm) <= 1, 'holm', 'One more square.', 'cp_m17_39');
  },
  q(sid, k, a) {
    const S = RAID.st;
    if (k === 'douse') { if (S.m17 && !S.bkDown && !(S.dark > 0)) { S.dark = M17.DOUSE; S.dsN = (S.dsN | 0) + 1; cpEvent('m17douse', 1); } return; }
    if (m17Q(sid, k, a)) return; cpgAsk(k, a);
  },
  me(dt) { m17Me(dt); },
  hud(phone, mono, fell) {
    const S = RAID.st;
    m17Hud(phone, mono, fell, { rows: r => {
      cpkBar('THE LAMP · RUNNING DOWN WHILE HIS FALSE LIGHT BURNS', S.lamp, r++, S.lamp < 0.3 ? null : '#ffc070', S.lamp < 0.3);
      if (!S.bkDown) cpkBar(S.dark > 0 ? `THE FALSE LIGHT IS OUT · ${Math.ceil(S.dark)} S` : S.bkHeld === 2 ? 'THEIR KEEPER · IN CHECK' : S.bkHeld === 1 ? 'THEIR KEEPER · HELD' : 'THEIR KEEPER', S.bkHp, r++, '#d86a50');
      return r;
    } });
  },
  f3(dt) { m17Draw3D(dt, { goldAll: () => RAID.st.dark > 0 || RAID.st.bkDown, lampK: () => 0.35 + 0.65 * RAID.st.lamp }); m17NpcDraw(dt); },
  music() { return RAID.st.lamp < 0.3 ? 'cpm17low' : 'cpm17keeper'; },
}));
// (hosting) Holm's next square, or -1: towards the gold, never into a square they attack (nor beside their keeper)
function m17HolmOk(q, lit) {
  const S = RAID.st, O = m17Occ(), WA = m17WreckAtt(O);
  if (q < 0 || m17Rock(q) || O[q].w >= 0 || O[q].k || WA[q]) return false;
  if (S.bk >= 0 && !S.bkDown && m17KD(q, S.bk) <= 1) return false;
  if (m17LightSq(q) && !lit) return false;
  return m17KD(q, S.holm) === 1;
}
function m17HolmPlan(lit) {
  const S = RAID.st, O = m17Occ(), WA = m17WreckAtt(O), cur = S.holm;
  const opts = m17Moves(6, cur, () => 0, 1, false).filter(q => m17HolmOk(q, lit)).sort((a, b) => m17LD(a) - m17LD(b) || (Math.abs((a & 7) - 3.5) - Math.abs((b & 7) - 3.5)));
  if (!opts.length) return -1;
  if (m17LD(opts[0]) < m17LD(cur) || WA[cur]) return opts[0];
  return -1;
}
cpOn('m17douse', () => { try { sfxPlay('lantern_douse', { vol: 0.9 }); } catch (e) {} try { if (!soundOff()) noise('highpass', 3000, 1, 0.001, 0.25, 0.25); } catch (e) {} const P = m17FalseAt(); if (P) for (let i = 0; i < 14; i++) FPS.parts.push({ x: P[0], y: P[1], z: P[2], vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: Math.random() * 3, t: 0.9, c: '255,170,90' }); });
cpOn('m17relit', () => { try { sfxPlay('mooncusser', { vol: 0.5 }); } catch (e) {} });
cpOn('m17step', () => m17Knock(1, 330));
cpOn('m17bkdown', () => { try { sfxPlay('thunder', { vol: 0.5 }); } catch (e) {} });
