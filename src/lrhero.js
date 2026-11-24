'use strict';
// The Lamp Road: the three heroes' own figures, their hands and weapons in first person, what they throw, what they set
// down and the flashes and smoke of a fight. Built from three.js's plain shapes with src/lrdress.js's lrBatch (each limb
// one mesh), in the crews' colours: the Lamplighters gold and sea blue, the Wreckers rust and tar.
//   lrHeroModel(heroId, team) -> { group, update(pose, dt), muzzle, height }   feet at the origin, facing -z
//   lrViewModel(heroId)       -> { group, update(st, dt), muzzle }             a child of the camera (which looks -z)
//   lrMuzzle(model)           -> THREE.Vector3   where a shot or a bolt leaves (world), for either of the above
//   lrProjMesh(kind, team)    -> Object3D for 'bolt', 'tar', 'lantern' (each points itself along its flight and trails)
//   lrWallMesh(team)          -> Object3D, Bollard's bulkhead, 6 x 3 m, centred at its bottom middle, faces +-z
//   lrZoneMesh(kind, team)    -> { group, update(zone, dt) } for 'tar', 'lantern', 'beacon', 'broadside'
//   lrFx(scene)               -> { spawn(kind, o), update(dt) }   pooled: nothing is made after it starts
//   lrHeroPortrait(heroId, team) -> a data URL (a head-and-shoulders picture, rendered once and kept)

const LRH = { pr: null, cache: {}, tex: {} };
const LRH_TEAM = [
  { main: 0xf2c14e, trim: 0x3d7fb8, deep: 0x2c5a86, cloth: 0x34628c, glow: 0xffd27a, flame: 0xffc060 },   // the Lamplighters
  { main: 0xc8463a, trim: 0x2a2522, deep: 0x8a2e26, cloth: 0x2a2522, glow: 0xff6a48, flame: 0xff7a40 },   // the Wreckers
];
const LRH_SPEC = {
  bollard: { h: 2.3, hipY: 1.0, stride: 2.1, spd: 4.8 },
  razorbill: { h: 1.8, hipY: 0.95, stride: 1.7, spd: 6.0 },
  linnet: { h: 1.7, hipY: 0.88, stride: 1.6, spd: 5.6 },
};
const LRH_SKIN = 0xd8a888, LRH_IRON = 0x3c3e44, LRH_BRASS = 0xc89a40, LRH_WOOD = 0x5a3c24, LRH_LEATH = 0x5a3a22;

function lrhNode(parent, x, y, z, name) { const n = new THREE.Group(); n.position.set(x || 0, y || 0, z || 0); if (name) n.name = name; parent.add(n); return n; }
const lrhSm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lrhLerp = (a, b, f) => a + (b - a) * f;
const lrhClamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- two bones to a point ----------
// arm and fore are bones hanging down their own -y (fore at (0, -a, 0) in arm), arm.position the shoulder in its parent's
// space; T the target and pole (which way the elbow goes) in that space too
let LRH_V = null;
function lrhIK(arm, fore, T, pole, a, b) {
  if (!LRH_V) LRH_V = { d: new THREE.Vector3(), n: new THREE.Vector3(), u: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(), q: new THREE.Quaternion(), dn: new THREE.Vector3(0, -1, 0), p: new THREE.Vector3() };
  const V = LRH_V, S = arm.position;
  V.d.copy(T).sub(S); let D = V.d.length();
  D = lrhClamp(D, Math.abs(a - b) + 1e-3, a + b - 1e-3); if (V.d.lengthSq() < 1e-9) V.d.set(0, -1, 0); V.d.normalize();
  const cA = lrhClamp((a * a + D * D - b * b) / (2 * a * D), -1, 1), sA = Math.sqrt(1 - cA * cA);
  V.p.copy(pole).normalize();
  V.n.copy(V.p).addScaledVector(V.d, -V.d.dot(V.p)); if (V.n.lengthSq() < 1e-6) V.n.set(0, 0, 1).addScaledVector(V.d, -V.d.z); V.n.normalize();
  V.u.copy(V.d).multiplyScalar(cA).addScaledVector(V.n, sA);
  arm.quaternion.setFromUnitVectors(V.dn, V.u);
  V.e.copy(S).addScaledVector(V.u, a);
  V.f.copy(S).addScaledVector(V.d, D).sub(V.e).normalize();
  V.q.copy(arm.quaternion).invert(); V.f.applyQuaternion(V.q);
  fore.quaternion.setFromUnitVectors(V.dn, V.f);
}

// ---------- a figure's rig ----------
function lrhRig(id, team) {
  const S = LRH_SPEC[id], TC = LRH_TEAM[team ? 1 : 0];
  const g = new THREE.Group(); g.name = 'lrHero:' + id;
  const lit = new THREE.MeshLambertMaterial({ vertexColors: true }), glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  const body = lrhNode(g, 0, 0, 0, 'body'), hips = lrhNode(body, 0, S.hipY, 0, 'hips');
  const parts = new Map();
  const P = n => { let p = parts.get(n); if (!p) { p = { L: lrBatch(), G: lrBatch() }; parts.set(n, p); } return p; };
  const m = { id, team: team ? 1 : 0, TC, S, g, body, hips, lit, glow, P, parts, st: { ph: 0, run: 0, air: 0, last: 0 }, pose: {} };
  m.finish = () => {
    for (const [n, p] of parts) { const a = p.L.mesh(lit), b = p.G.mesh(glow); if (a) n.add(a); if (b) n.add(b); }
    parts.clear();
    return m;
  };
  return m;
}
// legs: from hip joints at (+-hx, 0, 0) of the hips, thigh a, shin b; each gets its own cloth, boot
function lrhLegs(m, hx, a, b, draw) {
  for (const s of [-1, 1]) {
    const leg = lrhNode(m.hips, s * hx, 0, 0), shin = lrhNode(leg, 0, -a, 0);
    draw(m.P(leg), m.P(shin), s, a, b);
    if (s < 0) { m.legL = leg; m.shinL = shin; } else { m.legR = leg; m.shinR = shin; }
  }
  m.legA = a; m.legB = b;
}
function lrhArms(m, sx, sy, sz, a, b, draw) {
  for (const s of [-1, 1]) {
    const arm = lrhNode(m.spine, s * sx, sy, sz), fore = lrhNode(arm, 0, -a, 0), hand = lrhNode(fore, 0, -b, 0);
    draw(m.P(arm), m.P(fore), m.P(hand), s, a, b);
    if (s < 0) { m.armL = arm; m.foreL = fore; m.handL = hand; } else { m.armR = arm; m.foreR = fore; m.handR = hand; }
  }
  m.armA = a; m.armB = b;
}

// ---------- Bollard: the harbourmaster in his diving dress ----------
function lrhBollard(team) {
  const m = lrhRig('bollard', team), TC = m.TC, t = m.team;
  const suit = t ? 0x2e2824 : 0x2f5f8c, suit2 = t ? 0x241f1c : 0x264e74, band = TC.main, plate = t ? 0x4a3a34 : 0x4a5058, rivet = 0x7a7c80;
  // the legs: canvas, patched, laced; weighted boots with brass toes and lead soles
  lrhLegs(m, 0.27, 0.48, 0.46, (L, S, s, a, b) => {
    L.L.add('cyl:10:1.15', suit, 0, -a / 2, 0, 0, 0, 0, 0.17, a, 0.17);
    L.L.add('box', band, 0, -0.04, 0, 0, 0, 0, 0.4, 0.1, 0.4);
    S.L.add('cyl:10:1.1', suit2, 0, -b * 0.35, 0, 0, 0, 0, 0.15, b * 0.7, 0.15);
    S.L.add('box', 0x3a3a3e, 0, -b + 0.16, -0.03, 0, 0, 0, 0.32, 0.3, 0.42);
    S.L.add('box', 0x55585e, 0, -b + 0.03, -0.04, 0, 0, 0, 0.36, 0.08, 0.5);       // lead sole
    S.L.add('box', LRH_BRASS, 0, -b + 0.14, -0.23, 0, 0, 0, 0.3, 0.2, 0.08);          // brass toecap
    S.L.add('box', 0x6a4a2a, 0, -b + 0.32, 0, 0, 0, 0, 0.34, 0.06, 0.38);
  });
  m.spine = lrhNode(m.hips, 0, 0.08, 0, 'spine');
  const sp = m.P(m.spine);
  // the dress: a barrel of canvas, an iron corselet over the shoulders riveted to it, a belt of lead weights
  sp.L.add('sph:12', suit, 0, 0.3, 0, 0, 0, 0, 0.5, 0.5, 0.4);
  sp.L.add('cyl:12', suit, 0, 0.12, 0, 0, 0, 0, 0.44, 0.3, 0.36);
  sp.L.add('cyl:12:0.75', plate, 0, 0.58, 0, 0, 0, 0, 0.56, 0.22, 0.45);
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; sp.L.add('sph:4', rivet, Math.sin(a) * 0.53, 0.5, Math.cos(a) * 0.43, 0, 0, 0, 0.03); }
  sp.L.add('cyl:12', band, 0, 0.47, 0, 0, 0, 0, 0.57, 0.06, 0.46);     // a painted band round the corselet: the crew's colour
  sp.L.add('cyl:12', 0x3a3026, 0, -0.02, 0, 0, 0, 0, 0.47, 0.14, 0.39);
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * Math.PI * 2; sp.L.add('box', 0x6a6c70, Math.sin(a) * 0.47, -0.02, Math.cos(a) * 0.39, 0, a, 0, 0.14, 0.18, 0.06); }
  // a big painted plate on the chest (gold sun-lamp / rust hook) and his back plate
  sp.L.add('box', plate, 0, 0.3, -0.38, 0, 0, 0, 0.42, 0.34, 0.06);
  sp.L.add('box', band, 0, 0.3, -0.415, 0, 0, 0, 0.3, 0.22, 0.02);
  sp.L.add('box', TC.trim === 0x2a2522 ? 0x1a1614 : TC.trim, 0, 0.3, -0.43, 0, 0, Math.PI / 4, 0.1, 0.1, 0.02);
  // the helmet's three ports glow; the helmet sits on the corselet
  m.head = lrhNode(m.spine, 0, 0.72, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('sph:14', LRH_BRASS, 0, 0.2, 0, 0, 0, 0, 0.3, 0.31, 0.3);
  hd.L.add('cyl:14', 0xa07a30, 0, -0.02, 0, 0, 0, 0, 0.3, 0.1, 0.3);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; hd.L.add('sph:4', 0xe0c070, Math.sin(a) * 0.3, -0.02, Math.cos(a) * 0.3, 0, 0, 0, 0.03); }
  for (const [a, r] of [[0, 0.14], [Math.PI / 2, 0.1], [-Math.PI / 2, 0.1]]) {
    const dx = -Math.sin(a), dz = -Math.cos(a);
    hd.L.add('cyl:14', 0x8a6a28, dx * 0.27, 0.2, dz * 0.27, Math.PI / 2, a, 0, r + 0.04, 0.1, r + 0.04);
    hd.G.add('cyl:14', TC.glow, dx * 0.31, 0.2, dz * 0.31, Math.PI / 2, a, 0, r, 0.02, r);
    for (const o of [-1, 1]) hd.L.add('box', 0x6a5020, dx * 0.33 + (a === 0 ? o * r * 0.45 : 0), 0.2, dz * 0.33 + (a !== 0 ? o * r * 0.45 : 0), 0, a, 0, 0.02, r * 2, 0.02);
  }
  hd.L.add('cyl:8', LRH_BRASS, 0, 0.5, 0.06, 0, 0, 0, 0.06, 0.06, 0.06);
  hd.L.add('cyl:8', 0x8a6a28, 0.12, 0.38, 0.22, 0.6, 0, 0, 0.05, 0.12, 0.05);   // the air valve at the back
  // the arms: canvas sleeves, iron gauntlets
  lrhArms(m, 0.6, 0.48, 0, 0.42, 0.42, (A, F, H, s, a, b) => {
    A.L.add('sph:10', plate, 0, -0.02, 0, 0, 0, 0, 0.2, 0.17, 0.2);
    A.L.add('box', band, 0, 0.06, 0, 0, 0, 0, 0.3, 0.06, 0.3);
    A.L.add('cyl:10:1.1', suit, 0, -a / 2, 0, 0, 0, 0, 0.13, a, 0.13);
    F.L.add('cyl:10:1.0', suit2, 0, -b * 0.35, 0, 0, 0, 0, 0.12, b * 0.7, 0.12);
    F.L.add('cyl:10:0.85', LRH_IRON, 0, -b * 0.78, 0, 0, 0, 0, 0.16, b * 0.4, 0.16);
    for (let k = 0; k < 6; k++) { const q = k / 6 * Math.PI * 2; F.L.add('sph:4', rivet, Math.sin(q) * 0.15, -b * 0.62, Math.cos(q) * 0.15, 0, 0, 0, 0.025); }
    H.L.add('box', LRH_IRON, 0, -0.06, 0, 0, 0, 0, 0.18, 0.16, 0.2);
    H.L.add('box', 0x2c2e32, 0, -0.14, -0.04, 0, 0, 0, 0.17, 0.08, 0.14);
  });
  // the capstan bar, held from its grip at the origin, running up its +y
  m.bar = lrhNode(m.spine, 0, 0, 0, 'bar');
  const br = m.P(m.bar);
  br.L.add('cyl:8:1.25', LRH_WOOD, 0, 0.62, 0, 0, 0, 0, 0.06, 1.5, 0.06);
  for (const y of [0.02, 0.5, 1.0, 1.3]) br.L.add('cyl:8', LRH_IRON, 0, y, 0, 0, 0, 0, 0.085, 0.07, 0.085);
  br.L.add('cyl:8', LRH_IRON, 0, 1.38, 0, 0, 0, 0, 0.095, 0.06, 0.095);
  br.L.add('cyl:8', band, 0, 0.75, 0, 0, 0, 0, 0.078, 0.12, 0.078);
  m.muzzle = lrhNode(m.bar, 0, 1.3, 0, 'muzzle');
  // the anchor: on his back on a chain; and the same anchor in his hands for the Spring Tide
  const anchor = (B, y0, col) => {
    B.add('cyl:8', col, 0, y0 - 0.5, 0, 0, 0, 0, 0.055, 1.0, 0.055);                 // shank
    B.add('tor:12:0.22', col, 0, y0 + 0.06, 0, 0, Math.PI / 2, 0, 0.1);              // ring
    B.add('box', 0x6a4a2a, 0, y0 - 0.14, 0, 0, 0, Math.PI / 2, 0.08, 0.8, 0.08);     // the stock, wood
    B.add('arc:16:0.16', col, 0, y0 - 0.7, 0, 0, 0, Math.PI, 0.34, 0.34, 0.4);       // the arms, curving up from the crown
    for (const s of [-1, 1]) B.add('cone:4', col, s * 0.36, y0 - 0.62, 0, 0, 0, -s * 0.45, 0.12, 0.26, 0.05);   // the flukes
    B.add('cone:6', col, 0, y0 - 1.08, 0, Math.PI, 0, 0, 0.07, 0.1, 0.07);
  };
  m.anchorBack = lrhNode(m.spine, 0.05, 0.62, 0.44, 'anchorBack'); m.anchorBack.rotation.set(0.12, 0, 0.18);
  anchor(m.P(m.anchorBack).L, 0, 0x4a4c52);
  { const B = m.P(m.spine).L; for (let k = 0; k < 9; k++) { const f = k / 8; B.add('tor:6:0.3', 0x5a5c62, 0.3 - f * 0.55, 0.66 - Math.sin(f * Math.PI) * 0.1 - f * 0.4, 0.38 - f * 0.78 + Math.max(0, f - 0.5) * 0.2, k % 2 ? Math.PI / 2 : 0, 0.6, 0, 0.05); } }
  m.anchorHand = lrhNode(m.spine, 0, 0, 0, 'anchorHand'); anchor(m.P(m.anchorHand).L, 0, 0x4a4c52); m.anchorHand.visible = false;
  // a soft glow at the ports (so a Bollard reads by his lights at a distance)
  m.portGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.portGlow.position.set(0, 0.2, -0.38); m.portGlow.scale.setScalar(0.7); m.head.add(m.portGlow);
  m.anim = lrhAnimBollard;
  return m.finish();
}

// ---------- Razorbill: the marksman in the tarred longcoat ----------
function lrhRazorbill(team) {
  const m = lrhRig('razorbill', team), TC = m.TC, t = m.team;
  const coat = t ? 0x241f1c : 0x22303e, coat2 = t ? 0x1a1614 : 0x1a2632, lapel = t ? TC.main : TC.trim, scarf = TC.main, breech = t ? 0x4a3c30 : 0x5a5044;
  lrhLegs(m, 0.11, 0.47, 0.46, (L, S, s, a, b) => {
    L.L.add('cyl:8:1.2', breech, 0, -a / 2, 0, 0, 0, 0, 0.075, a, 0.075);
    S.L.add('cyl:8:1.1', 0x1c1a18, 0, -b * 0.45, 0, 0, 0, 0, 0.07, b * 0.85, 0.07);   // sea boots
    S.L.add('cyl:8', 0x2a2622, 0, -0.04, 0, 0, 0, 0, 0.085, 0.1, 0.085);
    S.L.add('box', 0x1c1a18, 0, -b + 0.04, -0.06, 0, 0, 0, 0.11, 0.08, 0.26);
  });
  m.P(m.hips).L.add('cyl:10', breech, 0, -0.03, 0, 0, 0, 0, 0.14, 0.14, 0.1);
  m.spine = lrhNode(m.hips, 0, 0.05, 0, 'spine');
  const sp = m.P(m.spine);
  sp.L.add('cyl:10:1.25', coat, 0, 0.2, 0, 0, 0, 0, 0.16, 0.42, 0.12);
  sp.L.add('box', coat, 0, 0.36, 0, 0, 0, 0, 0.42, 0.16, 0.24);
  // lapels in the crew's colour, a sash across her, the scarf, a bandolier of cartridges
  for (const s of [-1, 1]) sp.L.add('box', lapel, s * 0.07, 0.28, -0.125, 0, 0, s * 0.25, 0.08, 0.3, 0.02);
  sp.L.add('box', TC.main, 0, 0.2, -0.01, 0, 0, 0.75, 0.07, 0.62, 0.27);
  sp.L.add('box', 0x3a2a1e, 0, 0.02, 0, 0, 0, 0, 0.36, 0.06, 0.26);
  sp.L.add('box', LRH_BRASS, 0, 0.02, -0.135, 0, 0, 0, 0.06, 0.05, 0.02);
  sp.L.add('tor:12:0.4', scarf, 0, 0.46, -0.01, Math.PI / 2, 0, 0, 0.12, 0.12, 0.16);
  sp.L.add('box', scarf, 0.05, 0.36, -0.14, 0.1, 0, 0.15, 0.08, 0.2, 0.03);
  for (let k = 0; k < 6; k++) sp.L.add('cyl:5', LRH_BRASS, -0.13 + k * 0.05, 0.34 - k * 0.055, -0.135, 0, 0, 0.75, 0.012, 0.05, 0.012);
  m.head = lrhNode(m.spine, 0, 0.5, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('sph:10', LRH_SKIN, 0, 0.11, -0.01, 0, 0, 0, 0.1, 0.12, 0.11);
  hd.L.add('box', 0x2a1e18, 0, 0.1, 0.07, 0, 0, 0, 0.18, 0.14, 0.06);      // hair tied back
  hd.L.add('sph:6', 0x2a1e18, 0, 0.06, 0.12, 0, 0, 0, 0.05, 0.07, 0.05);
  hd.L.add('box', 0x1a1210, 0, 0.12, -0.105, 0, 0, 0, 0.14, 0.02, 0.01);  // a hard brow
  hd.L.add('cone:4', 0xc89878, 0, 0.08, -0.12, -Math.PI / 2, Math.PI / 4, 0, 0.025, 0.05, 0.025);
  // the tricorn: three upturned sides, a band in the crew's colour, the razorbill's black and white feathers, goggles on the brim
  const hy = 0.22;
  hd.L.add('cyl:10', 0x161412, 0, hy + 0.04, 0, 0, 0, 0, 0.11, 0.09, 0.11);
  hd.L.add('cyl:10', TC.main, 0, hy + 0.005, 0, 0, 0, 0, 0.113, 0.025, 0.113);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + Math.PI; hd.L.add('box', 0x161412, Math.sin(a) * 0.14, hy + 0.03, Math.cos(a) * 0.14, -0.55, a, 0, 0.26, 0.1, 0.03); }
  hd.L.add('cyl:3', 0x161412, 0, hy - 0.005, 0, 0, Math.PI, 0, 0.24, 0.02, 0.24);
  hd.L.add('box', 0x101010, 0.08, hy + 0.16, 0.06, -0.5, 0, -0.35, 0.04, 0.24, 0.012);
  hd.L.add('box', 0xf0f0ec, 0.115, hy + 0.17, 0.05, -0.6, 0, -0.55, 0.035, 0.2, 0.012);
  hd.L.add('box', 0x101010, 0.12, hy + 0.15, 0.04, -0.62, 0, -0.6, 0.015, 0.14, 0.014);
  for (const s of [-1, 1]) { hd.L.add('cyl:10', LRH_BRASS, s * 0.045, hy + 0.05, -0.105, Math.PI / 2 - 0.4, 0, 0, 0.035, 0.03, 0.035); hd.G.add('cyl:10', 0x9ad0e0, s * 0.045, hy + 0.05, -0.12, Math.PI / 2 - 0.4, 0, 0, 0.026, 0.01, 0.026); }
  hd.L.add('box', 0x3a2a1e, 0, hy + 0.04, -0.1, 0, 0, 0, 0.2, 0.015, 0.01);
  lrhArms(m, 0.2, 0.42, 0, 0.3, 0.28, (A, F, H, s, a, b) => {
    A.L.add('sph:8', coat, 0, -0.01, 0, 0, 0, 0, 0.075, 0.07, 0.075);
    A.L.add('cyl:8:1.15', coat, 0, -a / 2, 0, 0, 0, 0, 0.055, a, 0.055);
    F.L.add('cyl:8:1.0', coat, 0, -b * 0.4, 0, 0, 0, 0, 0.05, b * 0.8, 0.05);
    F.L.add('cyl:8', lapel, 0, -b * 0.78, 0, 0, 0, 0, 0.068, 0.07, 0.068);     // turned-back cuffs
    H.L.add('box', 0x3a2a1e, 0, -0.04, 0, 0, 0, 0, 0.06, 0.09, 0.08);
  });
  // the coat's skirts, hung from the hips, that swing and flare
  m.coat = [];
  for (const [x, z, ry, w] of [[0, 0.09, 0, 0.3], [-0.12, -0.02, -Math.PI / 2 + 0.3, 0.2], [0.12, -0.02, Math.PI / 2 - 0.3, 0.2], [-0.07, -0.09, Math.PI - 0.15, 0.13], [0.07, -0.09, Math.PI + 0.15, 0.13]]) {
    const pv = lrhNode(m.hips, x, 0.06, z); pv.rotation.y = ry; const panel = lrhNode(pv, 0, 0, 0); const B = m.P(panel);
    B.L.add('box', coat2, 0, -0.33, 0.02, 0, 0, 0, w, 0.68, 0.025);
    B.L.add('box', lapel, 0, -0.66, 0.02, 0, 0, 0, w, 0.04, 0.03);
    m.coat.push(panel);
  }
  // the fowling piece: along -z, the butt at the shoulder (the origin), a long octagonal barrel, a brass sight-glass
  m.gun = lrhNode(m.spine, 0.1, 0.38, -0.05, 'gun');
  const gn = m.P(m.gun);
  gn.L.add('box', LRH_WOOD, 0, -0.04, 0.0, 0.12, 0, 0, 0.05, 0.11, 0.3);
  gn.L.add('box', LRH_WOOD, 0, -0.035, -0.34, 0, 0, 0, 0.045, 0.06, 0.48);
  gn.L.add('box', 0x2a2420, 0, -0.06, -0.14, 0.4, 0, 0, 0.04, 0.12, 0.05);
  gn.L.add('cyl:8', LRH_IRON, 0, 0.0, -0.75, Math.PI / 2, 0, 0, 0.018, 1.0, 0.018);
  gn.L.add('cyl:8', LRH_BRASS, 0, 0.0, -1.24, Math.PI / 2, 0, 0, 0.024, 0.04, 0.024);
  for (const z of [-0.2, -0.5]) gn.L.add('cyl:8', LRH_BRASS, 0, -0.01, z, Math.PI / 2, 0, 0, 0.032, 0.03, 0.032);
  gn.L.add('cyl:8', LRH_BRASS, 0, 0.05, -0.3, Math.PI / 2, 0, 0, 0.022, 0.32, 0.022);
  gn.L.add('box', LRH_BRASS, 0, -0.02, 0.14, 0, 0, 0, 0.055, 0.11, 0.02);
  gn.L.add('box', TC.main, 0, -0.03, 0.04, 0, 0, 0, 0.052, 0.04, 0.06);
  m.muzzle = lrhNode(m.gun, 0, 0, -1.28, 'muzzle');
  // the pot of tar (her left hand, while she throws) and the flare she calls the broadside with
  m.pot = lrhNode(m.handL, 0, -0.1, 0); { const B = m.P(m.pot); B.L.add('sph:8', 0x8a4a2a, 0, 0, 0, 0, 0, 0, 0.09, 0.1, 0.09); B.L.add('cyl:6', 0x6a3a22, 0, 0.09, 0, 0, 0, 0, 0.04, 0.05, 0.04); B.G.add('cone:5', 0xff8030, 0, 0.15, 0, 0, 0, 0, 0.035, 0.08, 0.035); } m.pot.visible = false;
  m.flare = lrhNode(m.handL, 0, -0.08, 0); { const B = m.P(m.flare); B.L.add('cyl:6', 0x8a2a1a, 0, 0, 0, 0, 0, 0, 0.022, 0.26, 0.022); B.G.add('sph:6', 0xff5030, 0, -0.15, 0, 0, 0, 0, 0.05); } m.flare.visible = false;
  m.flareGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xff5a30, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.flareGlow.position.set(0, -0.15, 0); m.flareGlow.scale.setScalar(0.9); m.flare.add(m.flareGlow);
  m.anim = lrhAnimRazorbill;
  return m.finish();
}

// ---------- Linnet: the lamp-keeper's apprentice ----------
function lrhLinnet(team) {
  const m = lrhRig('linnet', team), TC = m.TC, t = m.team;
  const gansey = t ? TC.main : TC.trim, gansey2 = t ? 0xa83a30 : 0x346ea4, cape = t ? 0x2a2522 : TC.main, capeEdge = t ? TC.main : 0xd8a838, cap = t ? 0x2a2522 : 0x2c4a6a, trou = 0x3a3a40;
  lrhLegs(m, 0.1, 0.44, 0.42, (L, S, s, a, b) => {
    L.L.add('cyl:8:1.25', trou, 0, -a / 2, 0, 0, 0, 0, 0.072, a, 0.072);
    S.L.add('cyl:8', trou, 0, -b * 0.3, 0, 0, 0, 0, 0.062, b * 0.6, 0.062);
    S.L.add('cyl:8:1.15', 0x5a3e28, 0, -b * 0.75, 0, 0, 0, 0, 0.066, b * 0.5, 0.066);   // leather boots, rolled
    S.L.add('cyl:8', 0x6a4a30, 0, -b * 0.5, 0, 0, 0, 0, 0.076, 0.05, 0.076);
    S.L.add('box', 0x4a3220, 0, -b + 0.035, -0.05, 0, 0, 0, 0.1, 0.07, 0.22);
  });
  m.spine = lrhNode(m.hips, 0, 0.05, 0, 'spine');
  const sp = m.P(m.spine);
  // the gansey: knitted ribs across the chest
  sp.L.add('cyl:10:1.2', gansey, 0, 0.17, 0, 0, 0, 0, 0.15, 0.48, 0.115);
  m.P(m.hips).L.add('cyl:10', trou, 0, -0.02, 0, 0, 0, 0, 0.16, 0.14, 0.11);
  for (let k = 0; k < 4; k++) sp.L.add('cyl:10', gansey2, 0, 0.26 + k * 0.035, 0, 0, 0, 0, 0.162 + k * 0.006, 0.014, 0.128 + k * 0.004);
  sp.L.add('cyl:10', gansey2, 0, -0.06, 0, 0, 0, 0, 0.155, 0.06, 0.118);
  // the short cape over the shoulders, its hem in the crew's colour
  sp.L.add('cyl:12:0.42', cape, 0, 0.3, 0.02, 0, 0, 0, 0.25, 0.3, 0.19);
  sp.L.add('cyl:12', capeEdge, 0, 0.15, 0.02, 0, 0, 0, 0.252, 0.035, 0.192);
  sp.L.add('box', cape, 0, 0.27, -0.17, 0, 0, 0, 0.06, 0.26, 0.04);
  for (const s of [-1, 1]) sp.L.add('sph:4', LRH_BRASS, s * 0.03, 0.4, -0.12, 0, 0, 0, 0.018);
  sp.L.add('cyl:10', cape, 0, 0.45, 0, 0, 0, 0, 0.085, 0.06, 0.08);
  // the satchel strap and the satchel of wicks on her left hip
  sp.L.add('box', LRH_LEATH, 0, 0.2, -0.002, 0, 0, -0.75, 0.04, 0.55, 0.245);
  m.satchel = lrhNode(m.hips, -0.17, 0.0, 0); { const B = m.P(m.satchel); B.L.add('box', LRH_LEATH, 0, 0, 0, 0, 0, 0, 0.08, 0.2, 0.24); B.L.add('box', 0x4a2e1a, -0.01, 0.06, 0, 0, 0, 0, 0.085, 0.09, 0.245); for (let k = 0; k < 4; k++) B.L.add('cyl:5', 0xe8e0c8, -0.02, 0.13, -0.08 + k * 0.05, 0, 0, 0, 0.012, 0.08, 0.012); B.L.add('box', LRH_BRASS, -0.045, 0.04, 0, 0, 0, 0, 0.01, 0.03, 0.03); }
  m.head = lrhNode(m.spine, 0, 0.47, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('sph:10', LRH_SKIN, 0, 0.11, 0, 0, 0, 0, 0.105, 0.115, 0.105);
  hd.L.add('sph:8', 0xb87a40, 0, 0.1, 0.03, 0, 0, 0, 0.11, 0.1, 0.1);      // copper hair under the cap
  hd.L.add('sph:8', 0xb87a40, 0, 0.02, 0.08, 0, 0, 0, 0.09, 0.08, 0.05);
  for (const s of [-1, 1]) hd.L.add('sph:6', 0xb87a40, s * 0.09, 0.07, 0.0, 0, 0, 0, 0.03, 0.07, 0.05);
  hd.L.add('cone:4', 0xc89878, 0, 0.09, -0.11, -Math.PI / 2, Math.PI / 4, 0, 0.02, 0.04, 0.02);
  for (const s of [-1, 1]) hd.L.add('sph:4', 0x201814, s * 0.04, 0.13, -0.098, 0, 0, 0, 0.012);
  // a knitted watch cap, a bobble on top
  hd.L.add('hemi:10', cap, 0, 0.15, 0.005, 0, 0, 0, 0.115, 0.12, 0.115);
  hd.L.add('cyl:10', t ? TC.main : TC.main, 0, 0.16, 0.005, 0, 0, 0, 0.118, 0.04, 0.118);
  hd.L.add('sph:6', t ? TC.main : TC.main, 0, 0.28, 0.0, 0, 0, 0, 0.04);
  lrhArms(m, 0.18, 0.4, 0, 0.28, 0.27, (A, F, H, s, a, b) => {
    A.L.add('sph:8', cape, 0, 0, 0, 0, 0, 0, 0.07, 0.065, 0.07);
    A.L.add('cyl:8:1.1', gansey, 0, -a / 2, 0, 0, 0, 0, 0.048, a, 0.048);
    F.L.add('cyl:8', gansey, 0, -b * 0.4, 0, 0, 0, 0, 0.045, b * 0.8, 0.045);
    F.L.add('cyl:8', gansey2, 0, -b * 0.85, 0, 0, 0, 0, 0.05, 0.06, 0.05);
    H.L.add('box', 0x6a4a30, 0, -0.035, 0, 0, 0, 0, 0.055, 0.08, 0.07);   // mittens
  });
  // the staff: iron, a crook at the top the storm lantern hangs from (its own node, to swing)
  m.staff = lrhNode(m.spine, 0, 0, 0, 'staff');
  const sf = m.P(m.staff);
  sf.L.add('cyl:6', 0x2e3034, 0, 0.35, 0, 0, 0, 0, 0.018, 1.9, 0.018);
  sf.L.add('cone:6', 0x2e3034, 0, -0.65, 0, Math.PI, 0, 0, 0.025, 0.1, 0.025);
  sf.L.add('tor:10:0.15', 0x2e3034, 0, 1.36, -0.08, 0, Math.PI / 2, 0, 0.08, 0.08, 0.08);
  sf.L.add('cyl:6', TC.main, 0, 0.06, 0, 0, 0, 0, 0.026, 0.14, 0.026);
  sf.L.add('cyl:6', LRH_BRASS, 0, 1.28, 0, 0, 0, 0, 0.026, 0.05, 0.026);
  m.lantern = lrhNode(m.staff, 0, 1.36, -0.16, 'lantern');
  const ln = m.P(m.lantern);
  ln.L.add('tor:8:0.2', LRH_BRASS, 0, -0.02, 0, 0, 0, 0, 0.035, 0.035, 0.035);
  ln.L.add('cone:8', LRH_BRASS, 0, -0.08, 0, 0, 0, 0, 0.085, 0.07, 0.085);
  ln.G.add('cyl:8', TC.glow, 0, -0.18, 0, 0, 0, 0, 0.07, 0.14, 0.07);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; ln.L.add('box', LRH_BRASS, Math.sin(a) * 0.078, -0.18, Math.cos(a) * 0.078, 0, a, 0, 0.015, 0.16, 0.015); }
  ln.L.add('cyl:8', LRH_BRASS, 0, -0.27, 0, 0, 0, 0, 0.085, 0.04, 0.085);
  m.lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.lanternGlow.position.set(0, -0.18, 0); m.lanternGlow.scale.setScalar(1.1); m.lantern.add(m.lanternGlow);
  m.muzzle = lrhNode(m.lantern, 0, -0.18, 0, 'muzzle');
  // the little lantern she throws (Kindle), in her left hand while she does
  m.kindle = lrhNode(m.handL, 0, -0.1, 0); { const B = m.P(m.kindle); B.L.add('cone:6', LRH_BRASS, 0, 0.06, 0, 0, 0, 0, 0.05, 0.05, 0.05); B.G.add('cyl:6', TC.glow, 0, -0.02, 0, 0, 0, 0, 0.04, 0.09, 0.04); } m.kindle.visible = false;
  m.anim = lrhAnimLinnet;
  return m.finish();
}

// ---------- what every figure does: walk, run, jump, fall, flinch, die ----------
function lrhBase(m, pose, dt) {
  const S = m.S, st = m.st, spd = pose.spd || 0, gnd = pose.gnd !== false;
  st.run += (lrhClamp(spd / S.spd, 0, 1.3) - st.run) * Math.min(1, dt * 10);
  st.air += ((gnd ? 0 : 1) - st.air) * Math.min(1, dt * 12);
  st.ph += dt * spd / S.stride * Math.PI * 2;
  const r = Math.min(1, st.run) * (1 - st.air), ph = st.ph;
  const sw = Math.sin(ph) * 0.72 * r;
  const up = (pose.vy || 0) > 0 ? 1 : 0.6;
  m.legL.rotation.set(lrhLerp(sw, 0.65 * up, st.air), 0, 0); m.legR.rotation.set(lrhLerp(-sw, -0.15, st.air), 0, 0);
  m.shinL.rotation.set(lrhLerp(-Math.max(0, Math.cos(ph)) * 1.1 * r - 0.04, -1.1 * up, st.air), 0, 0);
  m.shinR.rotation.set(lrhLerp(-Math.max(0, Math.cos(ph + Math.PI)) * 1.1 * r - 0.04, -0.55, st.air), 0, 0);
  m.hips.position.set(0, S.hipY + Math.abs(Math.sin(ph)) * 0.045 * r - 0.02 * r, 0);
  m.hips.rotation.set(0, Math.sin(ph) * 0.12 * r, 0);
  m.spine.rotation.set(-0.12 * r, -Math.sin(ph) * 0.1 * r, 0);
  m.head.rotation.set(0, 0, 0);
  m.body.rotation.set(0, 0, 0); m.body.position.set(0, 0, 0);
  // a hit: a flinch and a flash
  const hk = pose.hurt != null && pose.hurt >= 0 && pose.hurt < 0.3 ? 1 - pose.hurt / 0.3 : 0;
  m.spine.rotation.x += hk * 0.22; m.head.rotation.x += hk * 0.25;
  m.lit.emissive.setRGB(0.4 * hk, 0.08 * hk, 0.04 * hk);
  return { r, ph, hk };
}
function lrhDead(m, pose, dir) {
  if (!(pose.dead != null && pose.dead >= 0)) return 0;
  const f = lrhSm(0, 0.75, pose.dead), k = lrhSm(0, 0.3, pose.dead);
  m.legL.rotation.x = 0.3 * k; m.legR.rotation.x = -0.1 * k; m.shinL.rotation.x = -1.2 * k * (1 - f * 0.7); m.shinR.rotation.x = -0.9 * k * (1 - f * 0.6);
  m.hips.position.y = m.S.hipY - 0.25 * k * (1 - f);
  m.body.rotation.x = dir * 1.5 * f; m.body.position.y = 0.12 * f; m.body.position.z = -dir * 0.25 * f;
  m.spine.rotation.x = dir * 0.2 * f; m.head.rotation.x = dir * 0.4 * f;
  return f;
}
// sets both hands to targets (spine space) with elbows out and down
const LRH_POLE_L = typeof THREE !== 'undefined' ? new THREE.Vector3(-0.8, -0.8, 0.4) : null, LRH_POLE_R = typeof THREE !== 'undefined' ? new THREE.Vector3(0.8, -0.8, 0.4) : null;
function lrhHands(m, TL, TR, poleL, poleR) {
  if (TL) lrhIK(m.armL, m.foreL, TL, poleL || LRH_POLE_L, m.armA, m.armB);
  if (TR) lrhIK(m.armR, m.foreR, TR, poleR || LRH_POLE_R, m.armA, m.armB);
}
// a point given in a node's own space, in its parent's (the node's matrix brought up to date)
function lrhAt(node, x, y, z, out) { node.updateMatrix(); return out.set(x, y, z).applyMatrix4(node.matrix); }

function lrhAnimBollard(m, pose, dt) {
  const b = lrhBase(m, pose, dt), act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3() });
  const bar = m.bar;
  // ready: the bar held slanting up across him, both gauntlets on it
  bar.position.set(0.32, 0.05, -0.42); bar.rotation.set(-0.5 + p * 0.3, 0, 0.75);
  let two = true, portK = 1;
  const sweep = pose.fire != null && pose.fire >= 0 && pose.fire < 0.6 ? pose.fire : -1;
  if (sweep >= 0 && k !== 'ult') {
    // the sweep: from out on his right, round in front, to his left, then back to ready
    const f = lrhSm(0, 0.28, sweep), back = lrhSm(0.32, 0.6, sweep);
    const a = lrhLerp(lrhLerp(-1.5, 1.3, f), 0, back);
    bar.position.set(lrhLerp(0.1, 0.32, back), lrhLerp(0.3, 0.05, back), lrhLerp(-0.25, -0.42, back));
    bar.rotation.set(lrhLerp(-Math.PI / 2 + 0.15, -0.5, back), a * (1 - back), lrhLerp(0, 0.75, back), 'YXZ');
    m.spine.rotation.y += lrhLerp(lrhLerp(-0.5, 0.5, f), 0, back);
  }
  if (k === 'a1' && t < 1.1) {
    // the rush: bent low, the bar held across him like a ram
    const f = lrhSm(0, 0.12, t) * (1 - lrhSm(0.9, 1.1, t));
    m.spine.rotation.x -= 0.45 * f; m.head.rotation.x += 0.4 * f;
    bar.position.lerp(V.a.set(-0.05, 0.25, -0.55), f); bar.rotation.set(lrhLerp(bar.rotation.x, -Math.PI / 2, f), lrhLerp(bar.rotation.y, Math.PI / 2, f), lrhLerp(bar.rotation.z, 0, f), 'YXZ');
    m.st.ph += dt * 6 * f;
  }
  if (k === 'a2' && t < 3.2) {
    // the brace: feet planted wide, low, the bar stood up before him, his ports blazing
    const f = lrhSm(0, 0.2, t) * (1 - lrhSm(3.0, 3.2, t));
    m.legL.rotation.z = -0.32 * f; m.legR.rotation.z = 0.32 * f; m.shinL.rotation.z = 0.3 * f; m.shinR.rotation.z = -0.3 * f;
    m.hips.position.y -= 0.14 * f; m.spine.rotation.x -= 0.15 * f;
    bar.position.lerp(V.a.set(0.0, -0.35, -0.6), f); bar.rotation.set(lrhLerp(bar.rotation.x, 0.08, f), 0, lrhLerp(bar.rotation.z, 0, f));
    portK = 1 + f * 1.2;
  }
  // the Spring Tide: the anchor off his back, swung up over his head and down into the ground before him
  const ult = k === 'ult' && t < 1.6;
  m.anchorBack.visible = !ult; m.anchorHand.visible = ult;
  let TL = null, TR = null;
  if (ult) {
    const up = lrhSm(0, 0.45, t), slam = lrhSm(0.45, 0.62, t), rise = lrhSm(1.25, 1.6, t);
    const ah = m.anchorHand;
    ah.position.set(0, lrhLerp(lrhLerp(0.6, 1.05, up), 0.05, slam), lrhLerp(lrhLerp(0.3, 0.05, up), -0.62, slam));
    ah.rotation.set(lrhLerp(lrhLerp(2.6, 3.78, up), 0.8, slam) * (1 - rise), 0, 0);
    m.spine.rotation.x += lrhLerp(lrhLerp(0, 0.2, up), -0.55, slam) * (1 - rise);
    m.hips.position.y -= 0.28 * slam * (1 - rise);
    m.legL.rotation.x += 0.5 * slam * (1 - rise); m.shinL.rotation.x -= 0.6 * slam * (1 - rise); m.legR.rotation.x -= 0.35 * slam * (1 - rise);
    bar.position.set(0.55, -0.2, 0.1); bar.rotation.set(0.2, 0, 0.1);
    TL = lrhAt(ah, -0.11, -0.02, 0, V.a); TR = lrhAt(ah, 0.11, -0.02, 0, V.b);
    two = false;
  } else {
    TR = lrhAt(bar, 0, 0.0, 0, V.b); TL = lrhAt(bar, 0, 0.42, 0, V.a);
    if (pose.alt) TL = V.a.set(-0.3, 0.42, -0.72);   // setting down the bulkhead: his left hand flat out
  }
  if (lrhDead(m, pose, -1)) { TL = V.a.set(-0.7, 0.2, -0.3); TR = V.b.set(0.7, 0.1, -0.2); m.anchorBack.visible = true; m.anchorHand.visible = false; portK = Math.max(0, 1 - pose.dead); }
  lrhHands(m, TL, TR);
  m.glow.color.setScalar(portK); m.portGlow.material.opacity = 0.35 * portK;
  void two;
}
function lrhAnimRazorbill(m, pose, dt) {
  const b = lrhBase(m, pose, dt), act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3() }), st = m.st;
  const gun = m.gun, rec = pose.fire != null && pose.fire >= 0 && pose.fire < 0.12 ? 1 - pose.fire / 0.12 : 0;
  // shouldered and aimed, lowered a little while she runs
  const low = Math.min(1, st.run) * 0.4 * (pose.alt ? 0 : 1);
  gun.position.set(pose.alt ? 0.06 : 0.1, 0.38 - low * 0.12, -0.05 + rec * 0.05);
  gun.rotation.set(p - low * 0.6 + rec * 0.12, low * 0.35, 0, 'YXZ');
  m.spine.rotation.x += p * 0.2;
  m.head.rotation.x = p * 0.6 - m.spine.rotation.x;
  if (pose.alt) { m.head.rotation.z = -0.25; m.head.rotation.x -= 0.1; m.spine.rotation.y -= 0.12; }
  let TL = lrhAt(gun, 0, -0.04, -0.42, V.a), TR = lrhAt(gun, 0.0, -0.08, -0.1, V.b);
  if (pose.reload > 0) {
    const w = Math.sin(pose.reload * 9) * 0.04;
    gun.rotation.set(-0.5, 0.25, 0.55, 'YXZ'); gun.position.set(0.12, 0.3, -0.12);
    TR = lrhAt(gun, 0, -0.08, -0.1, V.b); TL = V.a.set(0.02 + w, 0.26, -0.3);
  }
  // the coat swings as she runs, flares as she glides
  let flare = 0;
  if ((k === 'a1' && !(pose.gnd !== false)) || pose.glide) flare = 1;
  st.flare = lrhLerp(st.flare || 0, flare, Math.min(1, dt * 6));
  const r = Math.min(1, st.run);
  m.coat.forEach((c, i) => {
    // (out is -x for a panel: its bottom swings away from her)
    const sw = i === 0 ? 0.35 * r + Math.abs(Math.sin(st.ph)) * 0.12 * r : i < 3 ? 0.1 * r : Math.max(0, i === 3 ? m.legL.rotation.x : m.legR.rotation.x) * 0.8;
    c.rotation.set(-(0.1 + sw + st.flare * (i === 0 ? 1.2 : 1.0) + st.air * 0.3), 0, 0);
  });
  if (k === 'a1' && t < 0.3) { const f = Math.sin(t / 0.3 * Math.PI); m.hips.position.y -= 0.18 * f; m.shinL.rotation.x -= 0.6 * f; m.shinR.rotation.x -= 0.6 * f; m.legL.rotation.x += 0.4 * f; m.legR.rotation.x += 0.4 * f; }
  if (st.flare > 0.05) {
    // gliding: arms out like wings, the piece held down in her right hand
    const f = st.flare;
    m.legL.rotation.x = lrhLerp(m.legL.rotation.x, -0.15, f); m.legR.rotation.x = lrhLerp(m.legR.rotation.x, -0.3, f); m.shinL.rotation.x = lrhLerp(m.shinL.rotation.x, -0.3, f); m.shinR.rotation.x = lrhLerp(m.shinR.rotation.x, -0.5, f);
    m.spine.rotation.x -= 0.25 * f;
    gun.position.lerp(V.b.set(0.45, 0.0, -0.1), f); gun.rotation.set(lrhLerp(gun.rotation.x, -1.2, f), 0, lrhLerp(0, 0.2, f), 'YXZ');
    TR = lrhAt(gun, 0, -0.08, -0.1, V.b);
    TL = V.a.set(-0.62, 0.42, 0.02);
  }
  // the tar pot: back over her shoulder, then lobbed
  m.pot.visible = k === 'a2' && t < 0.3;
  if (k === 'a2' && t < 0.6) {
    const w = lrhSm(0, 0.18, t), th = lrhSm(0.18, 0.32, t), back = lrhSm(0.35, 0.6, t);
    TL = V.a.set(lrhLerp(lrhLerp(-0.28, -0.3, w), -0.18, th), lrhLerp(lrhLerp(0.2, 0.62, w), 0.55, th), lrhLerp(lrhLerp(-0.1, 0.25, w), -0.5, th));
    if (back > 0) TL.lerp(lrhAt(gun, 0, -0.04, -0.42, V.b.clone()), back);
    m.spine.rotation.y += lrhLerp(lrhLerp(0, 0.35, w), -0.25, th) * (1 - back);
    TR = lrhAt(gun, 0.0, -0.08, -0.1, V.b);
  }
  // the broadside: the flare thrown up and pointed at the strip
  m.flare.visible = k === 'ult' && t < 1.4;
  if (m.flare.visible) {
    const f = lrhSm(0, 0.25, t) * (1 - lrhSm(1.2, 1.4, t));
    TL.lerp(V.a.set(-0.32, 0.85, -0.42), f);
    gun.position.lerp(V.b.set(0.3, 0.05, -0.1), f); gun.rotation.x = lrhLerp(gun.rotation.x, -1.0, f);
    TR = lrhAt(gun, 0, -0.08, -0.1, V.b);
    m.head.rotation.x += 0.25 * f;
  }
  if (lrhDead(m, pose, 1)) { TL = V.a.set(-0.5, 0.3, 0.1); TR = V.b.set(0.5, 0.2, 0.2); m.coat.forEach(c => c.rotation.set(0, 0, 0)); }
  lrhHands(m, TL, TR);
}
function lrhAnimLinnet(m, pose, dt) {
  const b = lrhBase(m, pose, dt), act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3() }), st = m.st;
  const sf = m.staff;
  // held upright before her, the lantern hung out in front; a flick of the staff for each bolt
  const fl = pose.fire != null && pose.fire >= 0 && pose.fire < 0.28 ? Math.sin(pose.fire / 0.28 * Math.PI) : 0;
  sf.position.set(0.24, -0.02 - fl * 0.02, -0.28 - fl * 0.12);
  sf.rotation.set(-0.22 - p * 0.35 - fl * 0.7, 0, 0.06);
  m.spine.rotation.x += p * 0.15; m.head.rotation.x = p * 0.6 - m.spine.rotation.x;
  let TR = lrhAt(sf, 0, 0, 0, V.b), TL = V.a.set(-0.2, 0.02, -0.12);
  let glowK = 1;
  if (Math.min(1, st.run) > 0.3) TL = V.a.set(-0.2, 0.05 + Math.sin(st.ph) * 0.05, -0.05 + Math.sin(st.ph) * 0.12);
  if (pose.alt) {
    // the mending light: staff levelled at whoever she's mending, both hands on it
    sf.position.set(0.12, 0.25, -0.2); sf.rotation.set(p - Math.PI / 2 + 0.08, 0, 0);
    TR = lrhAt(sf, 0, 0, 0, V.b); TL = lrhAt(sf, 0, 0.32, 0, V.a); glowK = 1.6;
  }
  if (pose.reload > 0) { sf.rotation.z = 0.4; sf.rotation.x = -0.1; TR = lrhAt(sf, 0, 0, 0, V.b); TL = lrhAt(sf, 0, 1.05, 0, V.a); glowK = 0.5 + Math.abs(Math.sin(pose.reload * 6)) * 0.4; }
  // Kindle: the little lantern tossed underarm
  m.kindle.visible = k === 'a1' && t < 0.32;
  if (k === 'a1' && t < 0.6) {
    const w = lrhSm(0, 0.18, t), th = lrhSm(0.18, 0.34, t), back = lrhSm(0.4, 0.6, t);
    TL = V.a.set(-0.22, lrhLerp(lrhLerp(0.0, -0.18, w), 0.38, th), lrhLerp(lrhLerp(-0.1, 0.22, w), -0.48, th)).lerp(V.b.clone().set(-0.2, 0.02, -0.12), back);
    TR = lrhAt(sf, 0, 0, 0, V.b);
  }
  // the wisp: a moment of light where she was
  if (k === 'a2' && t < 0.35) { const f = Math.sin(t / 0.35 * Math.PI); m.body.scale.set(1 - f * 0.25, 1 + f * 0.15, 1 - f * 0.25); glowK = 1 + f * 2; } else m.body.scale.set(1, 1, 1);
  // the Beacon: the staff raised high and driven into the ground before her, and she kneels to it
  if (k === 'ult' && t < 1.4) {
    const up = lrhSm(0, 0.35, t), dn = lrhSm(0.35, 0.55, t), off = lrhSm(1.15, 1.4, t);
    const hy = -(m.S.hipY + 0.05) + 0.62;
    sf.position.set(lrhLerp(0.12, 0.05, dn), lrhLerp(lrhLerp(0.0, 0.62, up), hy + 0.38 + 0.18, dn), lrhLerp(-0.2, -0.5, dn));
    sf.rotation.set(lrhLerp(lrhLerp(-0.2, 0.05, up), 0, dn), 0, 0);
    if (off > 0) { sf.position.lerp(V.a.set(0.24, -0.02, -0.28), off); }
    m.hips.position.y -= 0.36 * dn * (1 - off); m.legL.rotation.x += 1.3 * dn * (1 - off); m.shinL.rotation.x -= 1.45 * dn * (1 - off); m.legR.rotation.x -= 0.2 * dn * (1 - off); m.shinR.rotation.x -= 1.5 * dn * (1 - off);
    m.spine.rotation.x += 0.1 * dn;
    TR = lrhAt(sf, 0, 0.0, 0, V.b); TL = lrhAt(sf, 0, 0.2, 0, V.a); glowK = 1 + dn * 1.5;
  }
  // the lantern hangs plumb, swinging a little
  sf.updateMatrixWorld(true);
  const sx = sf.rotation.x + m.spine.rotation.x, sz = sf.rotation.z;
  st.sw = (st.sw || 0) + dt; m.lantern.rotation.set(-sx + Math.sin(st.sw * 3) * 0.08 * (0.3 + Math.min(1, st.run)), 0, -sz + Math.sin(st.sw * 2.3) * 0.05);
  if (lrhDead(m, pose, 1)) { TL = V.a.set(-0.45, 0.2, 0.1); TR = V.b.set(0.45, 0.25, 0.1); sf.position.set(0.55, -0.4, -0.2); sf.rotation.set(-1.3, 0, 0.3); glowK = Math.max(0.15, 1 - pose.dead * 0.5); }
  lrhHands(m, TL, TR);
  m.glow.color.setScalar(Math.min(1.4, glowK)); m.lanternGlow.material.opacity = Math.min(1, 0.6 * glowK); m.lanternGlow.scale.setScalar(0.9 + 0.35 * glowK);
}

function lrHeroModel(heroId, team) {
  const m = heroId === 'bollard' ? lrhBollard(team) : heroId === 'razorbill' ? lrhRazorbill(team) : lrhLinnet(team);
  const api = {
    group: m.g, muzzle: m.muzzle, height: m.S.h, rig: m,
    update(pose, dt) { m.anim(m, pose || {}, Math.min(0.1, dt || 0)); },
  };
  api.update({ spd: 0, gnd: true, pitch: 0, act: {}, dead: -1, hurt: -1 }, 0.016);
  return api;
}
// where a shot leaves from (world): the muzzle of the piece, the lantern on the staff, the end of the capstan bar
function lrMuzzle(model, out) {
  out = out || new THREE.Vector3();
  const mz = model && (model.muzzle || (model.rig && model.rig.muzzle));
  if (!mz) return model && model.group ? model.group.getWorldPosition(out) : out.set(0, 0, 0);
  mz.updateWorldMatrix(true, false);
  return mz.getWorldPosition(out);
}

// ---------- first person ----------
// The hands and the weapon, a child of the camera (which looks down -z): resting low on the right. Small and close (within
// 0.7 m of the eye), so the camera's near plane should be 0.05 or less.
function lrViewModel(heroId) {
  const g = new THREE.Group(); g.name = 'lrView:' + heroId;
  const lit = new THREE.MeshLambertMaterial({ vertexColors: true }), glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  const root = lrhNode(g, 0, 0, 0), st = { ph: 0, run: 0, sw: 0, t: 0, lastFire: 9, sweepSide: 1 };
  const mk = (parent, x, y, z) => { const n = lrhNode(parent, x, y, z); return n; };
  const fin = [];
  const B = n => { const o = { n, L: lrBatch(), G: lrBatch() }; fin.push(o); return o; };
  const done = () => { for (const o of fin) { const a = o.L.mesh(lit), b = o.G.mesh(glow); if (a) { a.frustumCulled = false; o.n.add(a); } if (b) { b.frustumCulled = false; o.n.add(b); } } };
  let muzzle, anim, flash = null;
  const flashSpr = (col, s) => { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); f.scale.setScalar(s); return f; };
  if (heroId === 'bollard') {
    // two great iron gauntlets, the capstan bar in the right; the bar's grip pivot is low right
    const bar = mk(root, 0.2, -0.24, -0.38), b = B(bar);
    b.L.add('cyl:8:1.2', LRH_WOOD, 0, 0.42, 0, 0, 0, 0, 0.035, 0.95, 0.035);
    for (const y of [0.0, 0.3, 0.62, 0.86]) b.L.add('cyl:8', LRH_IRON, 0, y, 0, 0, 0, 0, 0.05, 0.04, 0.05);
    b.L.add('cyl:8', 0x4a3a2a, 0, 0.45, 0, 0, 0, 0, 0.045, 0.06, 0.045);
    // an iron gauntlet round the grip: knuckle plates, fingers curled, a riveted cuff running back towards the eye
    const gauntlet = (o, sx) => {
      o.L.add('box', LRH_IRON, 0, 0, 0.02, 0, 0, 0, 0.1, 0.09, 0.1);
      for (let k = 0; k < 4; k++) o.L.add('box', k % 2 ? 0x4a4c52 : LRH_IRON, sx * -0.06, 0.035 - k * 0.025, 0.0, 0, 0, 0, 0.04, 0.022, 0.09);
      o.L.add('box', 0x55585e, sx * 0.0, 0.0, -0.035, 0, 0, 0, 0.11, 0.1, 0.025);
      o.L.add('box', LRH_IRON, sx * 0.05, 0.05, 0.0, 0, 0, sx * 0.5, 0.035, 0.07, 0.04);
      o.L.add('cyl:10:0.85', 0x3a3c42, 0, -0.03, 0.1, 2.0, 0, 0, 0.07, 0.12, 0.07);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; o.L.add('sph:4', 0x9a9ca0, Math.sin(a) * 0.066, -0.03 + Math.cos(a) * 0.03, 0.1 + Math.cos(a) * 0.055, 0, 0, 0, 0.01); }
    };
    const gR = mk(bar, 0, 0.02, 0), r = B(gR); gauntlet(r, 1);
    const gL = mk(root, -0.2, -0.26, -0.4), l = B(gL); gauntlet(l, -1);
    muzzle = mk(bar, 0, 0.9, 0);
    anim = (s, dt) => {
      const f = s.fire != null && s.fire >= 0 && s.fire < 0.55 ? s.fire : -1, k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
      bar.position.set(0.24, -0.25, -0.36); bar.rotation.set(-0.95, 0, 0.42, 'YXZ'); gL.position.set(-0.24, -0.27, -0.42); gL.rotation.set(0.2, 0, 0.3);
      if (f >= 0) {
        const a = lrhSm(0, 0.2, f), back = lrhSm(0.28, 0.55, f);
        bar.position.set(lrhLerp(lrhLerp(0.34, -0.12, a), 0.2, back), lrhLerp(-0.1, -0.24, back), lrhLerp(-0.36, -0.38, back));
        bar.rotation.set(lrhLerp(-1.4, -0.35, back), lrhLerp(lrhLerp(-0.6, 0.9, a), 0, back), lrhLerp(lrhLerp(1.3, 1.6, a), 0.55, back), 'YXZ');
      }
      if (k === 'a1' && t < 1) { const q = lrhSm(0, 0.1, t) * (1 - lrhSm(0.85, 1, t)); bar.position.y -= 0.08 * q; bar.rotation.z += 0.9 * q; gL.position.set(-0.12 * q - 0.22 * (1 - q), -0.2, -0.42); }
      if (k === 'a2' && t < 3.1) { const q = lrhSm(0, 0.15, t) * (1 - lrhSm(2.9, 3.1, t)); bar.position.lerp(new THREE.Vector3(0.16, -0.34, -0.42), q); bar.rotation.set(-0.25, 0, lrhLerp(0.42, 0.12, q)); gL.position.lerp(new THREE.Vector3(-0.08, -0.12, -0.36), q); gL.rotation.set(0.9 * q, 0, 0.6 * q); }
      if (s.alt) { gL.position.set(-0.12, -0.14, -0.5); gL.rotation.set(1.3, 0, 0); }
      if (k === 'ult' && t < 1.2) { const u = lrhSm(0, 0.4, t), d = lrhSm(0.45, 0.6, t), o = lrhSm(1.0, 1.2, t); const y = lrhLerp(lrhLerp(-0.24, 0.1, u), -0.45, d) * (1 - o) + -0.24 * o; bar.position.y = y; gL.position.y = y - 0.02; gL.position.x = -0.1; }
    };
  } else if (heroId === 'razorbill') {
    // the fowling piece, from low right out towards the middle; her right hand at the wrist of the stock, left under the barrel
    const gun = mk(root, 0.14, -0.15, -0.26), b = B(gun);
    b.L.add('box', LRH_WOOD, 0, -0.035, 0.1, 0.12, 0, 0, 0.045, 0.09, 0.28);
    b.L.add('box', LRH_WOOD, 0, -0.03, -0.22, 0, 0, 0, 0.04, 0.05, 0.42);
    b.L.add('cyl:8', LRH_IRON, 0, 0.0, -0.55, Math.PI / 2, 0, 0, 0.016, 0.82, 0.016);
    for (const z of [-0.08, -0.36]) b.L.add('cyl:8', LRH_BRASS, 0, -0.008, z, Math.PI / 2, 0, 0, 0.028, 0.025, 0.028);
    b.L.add('cyl:8', LRH_BRASS, 0, 0.0, -0.95, Math.PI / 2, 0, 0, 0.021, 0.03, 0.021);
    b.L.add('box', 0x2a2420, 0, -0.05, 0.0, 0.4, 0, 0, 0.035, 0.08, 0.04);
    b.L.add('box', LRH_IRON, 0.02, 0.02, -0.02, 0, 0, 0, 0.02, 0.04, 0.06);   // the lock
    // the sight-glass on top: brass tube, a ring at each end
    b.L.add('cyl:10', LRH_BRASS, 0, 0.045, -0.2, Math.PI / 2, 0, 0, 0.017, 0.3, 0.017);
    for (const z of [-0.06, -0.34]) b.L.add('cyl:10', 0x8a6a28, 0, 0.045, z, Math.PI / 2, 0, 0, 0.022, 0.015, 0.022);
    b.G.add('cyl:10', 0x9ad0e0, 0, 0.045, -0.052, Math.PI / 2, 0, 0, 0.014, 0.004, 0.014);
    const hR = mk(gun, 0.0, -0.06, 0.02), r = B(hR);
    r.L.add('box', 0x3a2a1e, 0.01, 0, 0, 0, 0, 0, 0.05, 0.07, 0.08); r.L.add('cyl:8', 0x22303e, 0.02, -0.03, 0.12, 1.1, 0, 0, 0.04, 0.2, 0.04);
    r.L.add('cyl:8', 0x3d7fb8, 0.02, -0.0, 0.05, 1.1, 0, 0, 0.045, 0.04, 0.045);
    const hL = mk(gun, -0.02, -0.06, -0.36), l = B(hL);
    l.L.add('box', 0x3a2a1e, -0.01, 0.0, 0, 0, 0, 0, 0.06, 0.05, 0.09); l.L.add('cyl:8', 0x22303e, -0.07, -0.08, 0.1, 1.0, 0.5, 0, 0.04, 0.24, 0.04);
    muzzle = mk(gun, 0, 0, -0.98);
    flash = flashSpr(0xffc070, 0.22); flash.position.set(0, 0, -1.02); gun.add(flash);
    anim = (s, dt) => {
      const rec = s.fire != null && s.fire >= 0 && s.fire < 0.12 ? 1 - s.fire / 0.12 : 0, aim = st.aim = lrhLerp(st.aim || 0, s.alt ? 1 : 0, Math.min(1, dt * 12));
      gun.position.set(lrhLerp(0.14, 0.0, aim), lrhLerp(-0.15, -0.088, aim), lrhLerp(-0.26, -0.12, aim) + rec * 0.045);
      gun.rotation.set(rec * 0.08 + lrhLerp(0.04, 0, aim), lrhLerp(0.06, 0, aim), lrhLerp(0.04, 0, aim));
      hL.position.set(-0.02, -0.06, -0.36); hL.visible = true;
      if (s.reload > 0) { const w = Math.sin(s.reload * 8) * 0.03; gun.rotation.set(-0.35, 0.3, 0.6); gun.position.set(0.16, -0.2, -0.3); hL.position.set(-0.02 + w, -0.06 - Math.abs(w), -0.08); }
      const k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
      if ((k === 'a2' && t < 0.5) || (k === 'ult' && t < 1.3)) { const q = k === 'a2' ? Math.sin(Math.min(1, t / 0.5) * Math.PI) : lrhSm(0, 0.2, t) * (1 - lrhSm(1.1, 1.3, t)); gun.position.y -= 0.12 * q; gun.rotation.x -= 0.4 * q; hL.visible = q < 0.3; }
      flash.material.opacity = rec > 0.6 ? (rec - 0.6) * 2.5 : 0; flash.material.rotation = Math.random() * 6;
    };
  } else {
    // the lantern staff, up from the bottom right, the lantern hung out ahead of her; her mitten on it
    const sf = mk(root, 0.2, -0.32, -0.42), b = B(sf);
    b.L.add('cyl:6', 0x2e3034, 0, 0.32, 0, 0, 0, 0, 0.012, 0.9, 0.012);
    b.L.add('tor:10:0.15', 0x2e3034, 0, 0.76, -0.05, 0, Math.PI / 2, 0, 0.05, 0.05, 0.05);
    b.L.add('cyl:6', LRH_BRASS, 0, 0.7, 0, 0, 0, 0, 0.017, 0.03, 0.017);
    const lan = mk(sf, 0, 0.76, -0.1), ln = B(lan);
    ln.L.add('tor:8:0.2', LRH_BRASS, 0, -0.01, 0, 0, 0, 0, 0.022, 0.022, 0.022);
    ln.L.add('cone:8', LRH_BRASS, 0, -0.05, 0, 0, 0, 0, 0.055, 0.045, 0.055);
    ln.G.add('cyl:8', 0xffd27a, 0, -0.115, 0, 0, 0, 0, 0.045, 0.09, 0.045);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; ln.L.add('box', LRH_BRASS, Math.sin(a) * 0.05, -0.115, Math.cos(a) * 0.05, 0, a, 0, 0.01, 0.1, 0.01); }
    ln.L.add('cyl:8', LRH_BRASS, 0, -0.17, 0, 0, 0, 0, 0.055, 0.025, 0.055);
    const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xffd27a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    lg.position.set(0, -0.115, 0); lg.scale.setScalar(0.35); lan.add(lg);
    const hR = mk(sf, 0, 0.05, 0), r = B(hR);
    r.L.add('box', 0x6a4a30, 0.0, 0, 0, 0, 0, 0, 0.06, 0.07, 0.07); r.L.add('cyl:8', 0x3d7fb8, 0.015, -0.06, 0.1, 2.1, 0, 0, 0.038, 0.2, 0.038); r.L.add('cyl:8', 0x346ea4, 0.01, -0.02, 0.035, 2.1, 0, 0, 0.042, 0.03, 0.042);
    const hL = mk(root, -0.22, -0.3, -0.4), l = B(hL);
    l.L.add('box', 0x6a4a30, 0, 0, 0, 0, 0, 0, 0.06, 0.07, 0.07); l.L.add('box', 0x6a4a30, 0.035, 0.01, -0.01, 0, 0, -0.5, 0.025, 0.05, 0.03); l.L.add('cyl:8', 0x3d7fb8, -0.01, -0.06, 0.1, 2.1, 0, 0, 0.038, 0.2, 0.038);
    const kin = mk(hL, 0, 0.06, -0.02), kb = B(kin); kb.L.add('cone:6', LRH_BRASS, 0, 0.04, 0, 0, 0, 0, 0.03, 0.03, 0.03); kb.G.add('cyl:6', 0xffd27a, 0, -0.01, 0, 0, 0, 0, 0.025, 0.05, 0.025);
    muzzle = mk(lan, 0, -0.115, 0);
    anim = (s, dt) => {
      const fl = s.fire != null && s.fire >= 0 && s.fire < 0.25 ? Math.sin(s.fire / 0.25 * Math.PI) : 0, aim = st.aim = lrhLerp(st.aim || 0, s.alt ? 1 : 0, Math.min(1, dt * 10));
      const k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
      sf.position.set(lrhLerp(0.2, 0.13, aim), lrhLerp(-0.32, -0.26, aim) - fl * 0.02, lrhLerp(-0.42, -0.48, aim) - fl * 0.08);
      sf.rotation.set(lrhLerp(-0.15, -0.85, aim) - fl * 0.55, 0, lrhLerp(0.12, 0.08, aim));
      hL.position.set(lrhLerp(-0.22, -0.04, aim), lrhLerp(-0.3, -0.2, aim), lrhLerp(-0.4, -0.38, aim)); hL.rotation.set(0.2 + aim * 0.6, 0, 0.3);
      kin.visible = false;
      let gk = 1 + aim * 0.6;
      if (s.reload > 0) { sf.rotation.z = 0.35; sf.rotation.x = -0.05; gk = 0.4 + Math.abs(Math.sin(s.reload * 6)) * 0.5; }
      if (k === 'a1' && t < 0.6) { kin.visible = t < 0.32; const w = lrhSm(0, 0.18, t), th = lrhSm(0.18, 0.34, t), back = lrhSm(0.4, 0.6, t); hL.position.set(-0.2, lrhLerp(lrhLerp(-0.3, -0.42, w), -0.1, th) * (1 - back) - 0.3 * back, lrhLerp(lrhLerp(-0.4, -0.3, w), -0.62, th) * (1 - back) - 0.4 * back); }
      if (k === 'a2' && t < 0.35) gk += Math.sin(t / 0.35 * Math.PI) * 2;
      if (k === 'ult' && t < 1.3) { const u = lrhSm(0, 0.35, t), d = lrhSm(0.35, 0.55, t), o = lrhSm(1.1, 1.3, t); sf.position.y += (0.22 * u - 0.32 * d) * (1 - o); sf.rotation.x = lrhLerp(sf.rotation.x, 0.0, (u) * (1 - o)); gk += 1.5 * d * (1 - o); }
      const sx = sf.rotation.x; st.sw += dt; lan.rotation.set(-sx + Math.sin(st.sw * 3) * 0.06, 0, -sf.rotation.z);
      glow.color.setScalar(Math.min(1.3, gk)); lg.material.opacity = Math.min(1, 0.55 * gk); lg.scale.setScalar(0.3 + 0.12 * gk);
    };
  }
  done();
  const api = {
    group: g, muzzle,
    update(s, dt) {
      s = s || {}; dt = Math.min(0.1, dt || 0);
      const spd = s.spd || 0; st.run = lrhLerp(st.run, s.gnd === false ? 0 : Math.min(1, spd / 6), Math.min(1, dt * 8)); st.ph += dt * spd * 1.9;
      root.position.set(Math.sin(st.ph) * 0.012 * st.run, -Math.abs(Math.cos(st.ph)) * 0.014 * st.run + (s.gnd === false ? 0.01 : 0), 0);
      root.rotation.set(0, 0, Math.sin(st.ph) * 0.015 * st.run);
      anim(s, dt);
    },
  };
  api.update({}, 0.016);
  return api;
}

// ---------- projectiles ----------
// each turns itself along the way it's going (from where it was the frame before) and keeps a short trail
function lrhTrailer(g, head, n, mat, step) {
  const pts = [], trail = [];
  for (let k = 0; k < n; k++) { const s = new THREE.Sprite(mat.clone()); s.visible = false; g.add(s); trail.push(s); }
  const v = new THREE.Vector3(), w = new THREE.Vector3(), inv = new THREE.Matrix4();
  let last = null;
  head.onBeforeRender = () => {
    g.updateWorldMatrix(true, false); v.setFromMatrixPosition(g.matrixWorld);
    if (last && v.distanceToSquared(last) > 1e-6) {
      w.copy(v).sub(last).normalize();
      if (g.userData.point !== false) { const p = g.parent; g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), w); if (p) { const q = new THREE.Quaternion(); p.getWorldQuaternion(q); g.quaternion.premultiply(q.invert()); } g.updateMatrixWorld(true); }
    }
    if (!last || v.distanceToSquared(last) > (step || 0.3) * (step || 0.3)) { pts.unshift(v.clone()); if (pts.length > n) pts.pop(); last = last || new THREE.Vector3(); last.copy(v); }
    inv.copy(g.matrixWorld).invert();
    for (let k = 0; k < n; k++) { const s = trail[k]; if (k < pts.length) { s.visible = true; s.position.copy(pts[k]).applyMatrix4(inv); s.material.opacity = (1 - k / n) * 0.5; s.updateMatrixWorld(); } else s.visible = false; }
  };
}
function lrProjMesh(kind, team) {
  const TC = LRH_TEAM[team ? 1 : 0], g = new THREE.Group(); g.name = 'lrProj:' + kind;
  const add = (o) => { g.add(o); return o; };
  if (kind === 'bolt') {
    const core = add(new THREE.Mesh(lrProto('sph:8'), new THREE.MeshBasicMaterial({ color: 0xfff4d0 }))); core.scale.set(0.07, 0.07, 0.5);
    const sh = add(new THREE.Mesh(lrProto('sph:8'), new THREE.MeshBasicMaterial({ color: TC.glow, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }))); sh.scale.set(0.16, 0.16, 0.9); sh.position.z = 0.2;
    const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))); s.scale.setScalar(1.1);
    lrhTrailer(g, core, 4, new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }), 0.5);
    g.children.forEach(c => { if (c.isSprite && c !== s) c.scale.setScalar(0.6); });
  } else if (kind === 'tar') {
    const B = lrBatch();
    B.add('sph:10', 0x9a5a34, 0, 0, 0, 0, 0, 0, 0.16, 0.18, 0.16); B.add('cyl:8:1.3', 0x7a4228, 0, 0.18, 0, 0, 0, 0, 0.07, 0.08, 0.07); B.add('tor:10:0.3', 0x5a3020, 0, 0.0, 0, Math.PI / 2, 0, 0, 0.165);
    B.add('box', 0x1a1612, 0, 0.24, 0, 0, 0, 0.3, 0.1, 0.06, 0.04);
    const pot = add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
    const fl = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xff8030, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }))); fl.position.y = 0.26; fl.scale.setScalar(0.5);
    const smoke = new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0x3a3430, transparent: true, opacity: 0.5, depthWrite: false });
    lrhTrailer(g, pot, 7, smoke, 0.35); g.userData.point = false;
    g.children.forEach((c, i) => { if (c.isSprite && c !== fl) c.scale.setScalar(0.35 + i * 0.06); });
    const t0 = performance.now(); const ob = pot.onBeforeRender; pot.onBeforeRender = (...a) => { pot.rotation.set((performance.now() - t0) / 120, 0, (performance.now() - t0) / 200); ob(...a); };
  } else {
    const B = lrBatch(), G2 = lrBatch();
    B.add('cone:8', LRH_BRASS, 0, 0.12, 0, 0, 0, 0, 0.11, 0.08, 0.11); B.add('tor:8:0.2', LRH_BRASS, 0, 0.2, 0, 0, 0, 0, 0.04);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; B.add('box', LRH_BRASS, Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1, 0, a, 0, 0.018, 0.2, 0.018); }
    B.add('cyl:8', LRH_BRASS, 0, -0.11, 0, 0, 0, 0, 0.11, 0.03, 0.11);
    G2.add('cyl:8', TC.glow, 0, 0, 0, 0, 0, 0, 0.085, 0.18, 0.085);
    const body = add(new THREE.Group()); body.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); body.add(G2.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
    const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }))); s.scale.setScalar(1.4);
    const t0 = performance.now(); s.onBeforeRender = () => { const t = (performance.now() - t0) / 1000; body.rotation.set(t * 9, t * 3, 0); body.updateMatrixWorld(true); };
  }
  return g;
}

// ---------- Bollard's bulkhead ----------
function lrWallMesh(team) {
  const TC = LRH_TEAM[team ? 1 : 0], B = lrBatch(), G2 = lrBatch(), g = new THREE.Group(); g.name = 'lrWall';
  const W = 6, H = 3, T = 0.22, iron = team ? 0x3e3634 : 0x40464e, iron2 = team ? 0x342e2c : 0x363c44, rv = 0x8a8c90;
  B.box(-W / 2, 0, -T / 2, W / 2, H, T / 2, iron2);
  // plates, two rows of three, each a little proud and riveted round
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x0 = -W / 2 + i * 2 + 0.04, x1 = x0 + 1.92, y0 = 0.04 + j * 1.48, y1 = y0 + 1.42;
    for (const s of [-1, 1]) {
      B.box(x0, y0, s > 0 ? T / 2 : -T / 2 - 0.03, x1, y1, s > 0 ? T / 2 + 0.03 : -T / 2, lrJ(iron, Math.random, 0.06));
      for (let k = 0; k <= 8; k++) for (const [x, y] of [[x0 + 0.08 + k * (x1 - x0 - 0.16) / 8, y0 + 0.08], [x0 + 0.08 + k * (x1 - x0 - 0.16) / 8, y1 - 0.08]]) B.add('sph:4', rv, x, y, s * (T / 2 + 0.035), 0, 0, 0, 0.03);
      for (let k = 1; k < 6; k++) for (const x of [x0 + 0.08, x1 - 0.08]) B.add('sph:4', rv, x, y0 + 0.08 + k * (y1 - y0 - 0.16) / 6, s * (T / 2 + 0.035), 0, 0, 0, 0.03);
    }
  }
  // a band of the crew's colour along the top and bottom, a round port, braces and feet behind
  for (const s of [-1, 1]) {
    B.box(-W / 2, H - 0.22, s > 0 ? T / 2 + 0.03 : -T / 2 - 0.05, W / 2, H - 0.04, s > 0 ? T / 2 + 0.05 : -T / 2 - 0.03, TC.main);
    B.box(-W / 2, 0.0, s > 0 ? T / 2 + 0.03 : -T / 2 - 0.05, W / 2, 0.12, s > 0 ? T / 2 + 0.05 : -T / 2 - 0.03, team ? TC.trim : TC.trim);
    B.add('tor:16:0.18', LRH_BRASS, 0, 1.55, s * (T / 2 + 0.05), 0, 0, 0, 0.26);
    for (const x of [-2, 0, 2]) { B.rod([x, 0, s * 0.9], [x, 2.2, s * (T / 2)], 0.06, iron2, 6); B.box(x - 0.18, 0, s * 0.8 - 0.25, x + 0.18, 0.08, s * 0.8 + 0.25, iron2); }
  }
  G2.add('cyl:16', TC.glow, 0, 1.55, 0, Math.PI / 2, 0, 0, 0.22, T + 0.06, 0.22);
  B.box(-W / 2 - 0.08, 0, -T / 2 - 0.08, -W / 2 + 0.08, H + 0.1, T / 2 + 0.08, iron); B.box(W / 2 - 0.08, 0, -T / 2 - 0.08, W / 2 + 0.08, H + 0.1, T / 2 + 0.08, iron);
  g.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); g.add(G2.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  return g;
}

// ---------- zones ----------
function lrhRingMesh(r0, r1, col, op) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 48, 1), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.05; return m;
}
function lrhStripeTex() {
  if (LRH.tex.stripe) return LRH.tex.stripe;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff';
  for (let k = -64; k < 128; k += 32) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 16, 0); x.lineTo(k + 16 + 64, 64); x.lineTo(k + 64, 64); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (LRH.tex.stripe = t);
}
function lrZoneMesh(kind, team) {
  const TC = LRH_TEAM[team ? 1 : 0], g = new THREE.Group(); g.name = 'lrZone:' + kind;
  const spr = (col, s, op, add) => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: col, transparent: true, opacity: op, blending: add === false ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false })); o.scale.setScalar(s); g.add(o); return o; };
  let T = 0, upd;
  const place = z => { if (z.x != null) g.position.x = z.x; if (z.z != null) g.position.z = z.z; g.position.y = z.y != null ? z.y : (typeof lrGround === 'function' && z.x != null ? lrGround(z.x, z.z) : g.position.y); };
  if (kind === 'tar') {
    // a pool of burning tar: black and glossy, flames licking round it, smoke going up
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshPhongMaterial({ color: 0x0e0c0a, specular: 0x6a5040, shininess: 80 }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.04; g.add(pool);
    const rim = lrhRingMesh(0.85, 1.0, 0xff6a20, 0.5); g.add(rim);
    const fl = [], sm = [];
    for (let k = 0; k < 16; k++) { const s = spr(k % 2 ? 0xff7a20 : 0xffb040, 1, 0.8); fl.push({ s, a: k / 16 * Math.PI * 2 + Math.random(), r: 0.2 + Math.random() * 0.75, p: Math.random() * 6 }); }
    for (let k = 0; k < 5; k++) { const s = spr(0x2a2420, 1, 0.4, false); sm.push({ s, p: k / 5 }); }
    upd = (z, dt) => {
      const R = z.r || 4, life = z.t != null ? lrhClamp(z.t / 0.6, 0, 1) : 1;
      pool.scale.setScalar(R); rim.scale.setScalar(R);
      rim.material.opacity = (0.35 + Math.sin(T * 8) * 0.1) * life;
      for (const f of fl) { const h = (0.8 + Math.abs(Math.sin(T * 7 + f.p)) * 0.9) * (0.6 + R * 0.12); f.s.position.set(Math.cos(f.a) * f.r * R, h * 0.5, Math.sin(f.a) * f.r * R); f.s.scale.set(0.9 * h, 1.6 * h, 1); f.s.material.opacity = 0.75 * life; }
      for (const q of sm) { const u = (T * 0.35 + q.p) % 1; q.s.position.set(Math.sin(q.p * 9) * R * 0.3, 0.5 + u * 4, Math.cos(q.p * 7) * R * 0.3); q.s.scale.setScalar(1 + u * 2.5); q.s.material.opacity = 0.35 * (1 - u) * life; }
    };
  } else if (kind === 'lantern') {
    // the lantern hung from three iron legs, its mending light on the ground in a ring of 5 m
    const B = lrBatch(), G2 = lrBatch();
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; B.rod([Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7], [0, 1.9, 0], 0.025, 0x2e3034, 5); }
    B.add('tor:8:0.2', LRH_BRASS, 0, 1.85, 0, 0, 0, 0, 0.04);
    const lanN = new THREE.Group(); lanN.position.y = 1.82; g.add(lanN);
    const L2 = lrBatch();
    L2.add('cone:8', LRH_BRASS, 0, -0.08, 0, 0, 0, 0, 0.11, 0.08, 0.11);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; L2.add('box', LRH_BRASS, Math.sin(a) * 0.1, -0.24, Math.cos(a) * 0.1, 0, a, 0, 0.018, 0.22, 0.018); }
    L2.add('cyl:8', LRH_BRASS, 0, -0.36, 0, 0, 0, 0, 0.11, 0.03, 0.11);
    G2.add('cyl:8', TC.glow, 0, -0.24, 0, 0, 0, 0, 0.085, 0.2, 0.085);
    g.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); lanN.add(L2.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); lanN.add(G2.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
    const halo = spr(TC.glow, 2.2, 0.85); halo.position.y = 1.58;
    const ring = lrhRingMesh(4.75, 5.0, TC.glow, 0.6); g.add(ring);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshBasicMaterial({ color: TC.glow, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.04; g.add(fill);
    const motes = []; for (let k = 0; k < 8; k++) { const s = spr(TC.glow, 0.25, 0.7); motes.push({ s, a: Math.random() * 6, r: 1 + Math.random() * 3.5, p: Math.random() }); }
    upd = (z, dt) => {
      const life = z.t != null ? lrhClamp(z.t / 0.5, 0, 1) : 1, pu = 0.8 + Math.sin(T * 4) * 0.2;
      lanN.rotation.set(Math.sin(T * 1.7) * 0.06, 0, Math.sin(T * 2.1) * 0.06);
      halo.material.opacity = 0.8 * pu * life; ring.material.opacity = 0.55 * pu * life; fill.material.opacity = 0.08 * pu * life;
      for (const q of motes) { const u = (T * 0.4 + q.p) % 1; q.s.position.set(Math.cos(q.a) * q.r, u * 2.2, Math.sin(q.a) * q.r); q.s.material.opacity = 0.8 * Math.sin(u * Math.PI) * life; }
    };
  } else if (kind === 'beacon') {
    // the staff planted, the lantern on it blazing, rays turning, the ring of 12 m
    const B = lrBatch(), G2 = lrBatch();
    B.add('cyl:6', 0x2e3034, 0, 1.1, 0, 0, 0, 0, 0.03, 2.2, 0.03); B.add('tor:10:0.15', 0x2e3034, 0, 2.2, -0.1, 0, Math.PI / 2, 0, 0.12);
    B.add('cone:8', LRH_BRASS, 0, 2.08, -0.2, 0, 0, 0, 0.13, 0.1, 0.13); B.add('cyl:8', LRH_BRASS, 0, 1.78, -0.2, 0, 0, 0, 0.13, 0.04, 0.13);
    G2.add('cyl:8', 0xfff0c0, 0, 1.93, -0.2, 0, 0, 0, 0.1, 0.24, 0.1);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; B.add('ico', 0x6a6458, Math.sin(a) * 0.3, 0.05, Math.cos(a) * 0.3, 0, a, 0, 0.18, 0.1, 0.14); }
    g.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))); g.add(G2.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
    const core = spr(0xfff0c0, 2.5, 1); core.position.set(0, 1.93, -0.2);
    const big = spr(TC.glow, 7, 0.5); big.position.set(0, 1.93, -0.2);
    const rays = new THREE.Group(); rays.position.set(0, 1.93, -0.2); g.add(rays);
    const rayG = new THREE.ConeGeometry(0.5, 9, 6, 1, true); rayG.translate(0, 4.5, 0);
    { const p = rayG.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const f = 1 - p.getY(i) / 9; c.push(f, f, f); } rayG.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
    const rayM = new THREE.MeshBasicMaterial({ color: TC.glow, vertexColors: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(rayG, rayM); r.rotation.set(Math.PI / 2 - 0.15, k / 6 * Math.PI * 2, 0, 'YXZ'); rays.add(r); }
    const ring = lrhRingMesh(11.6, 12, TC.glow, 0.7); g.add(ring);
    const ring2 = lrhRingMesh(0.2, 0.6, 0xfff0c0, 0.6); g.add(ring2);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshBasicMaterial({ color: TC.glow, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false })); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.04; g.add(fill);
    upd = (z, dt) => {
      const life = z.t != null ? lrhClamp(z.t / 0.6, 0, 1) : 1, pu = 0.85 + Math.sin(T * 9) * 0.1 + Math.sin(T * 23) * 0.05;
      rays.rotation.y = T * 0.8; rayM.opacity = 0.3 * pu * life; core.material.opacity = pu * life; big.material.opacity = 0.45 * pu * life; big.scale.setScalar(6 + Math.sin(T * 3) * 0.8);
      ring.material.opacity = (0.5 + Math.sin(T * 5) * 0.2) * life; fill.material.opacity = 0.07 * life;
      const u = (T * 0.6) % 1; ring2.scale.setScalar(1 + u * 18); ring2.material.opacity = 0.5 * (1 - u) * life;
    };
  } else {
    // the broadside's strip: 6 m by 22 m along zone.yaw, ahead of the point; warning stripes that pulse faster as it falls
    const strip = new THREE.Group(); g.add(strip);
    const tex = lrhStripeTex().clone(); tex.needsUpdate = true; tex.repeat.set(3, 11);
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: TC.main, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 22), mat); pl.rotation.x = -Math.PI / 2; pl.position.set(0, 0.06, -11); strip.add(pl);
    const edgeM = new THREE.MeshBasicMaterial({ color: TC.main, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const [x, z, w, d] of [[-3, -11, 0.18, 22], [3, -11, 0.18, 22], [0, 0, 6, 0.18], [0, -22, 6, 0.18]]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(w, d), edgeM); e.rotation.x = -Math.PI / 2; e.position.set(x, 0.07, z); strip.add(e); }
    const markers = []; for (let k = 0; k < 6; k++) { const s = spr(TC.main, 1.4, 0.6); s.position.set((k % 2 ? 1 : -1) * 3, 0.5, -2 - k * 3.6); markers.push(s); }
    upd = (z, dt) => {
      if (z.yaw != null) strip.rotation.y = z.yaw;
      const left = z.t != null ? z.t : 1, rate = 3 + 14 * (1 - lrhClamp(left / 1.4, 0, 1)), pu = 0.5 + 0.5 * Math.sin(T * rate);
      mat.opacity = 0.25 + 0.35 * pu; edgeM.opacity = 0.6 + 0.4 * pu; tex.offset.y = T * 0.8;
      for (const s of markers) { s.material.opacity = 0.3 + 0.6 * pu; s.position.y = 0.4 + pu * 0.3; }
    };
  }
  return { group: g, update(z, dt) { z = z || {}; T += dt || 0; place(z); upd(z, dt || 0); } };
}

// ---------- effects ----------
// Pools made once: glow sprites (sparks, smoke, flashes), rods (tracers, healing beams, blink trails), flat rings, the
// sweep's arc, the wave's sector, light columns. A spawn takes the oldest free one; nothing is added to the scene later.
function lrFx(scene) {
  const root = new THREE.Group(); root.name = 'lrFx'; scene.add(root);
  const tex = lrGlowTex(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  const pool = (n, make) => { const a = []; for (let k = 0; k < n; k++) { const o = make(k); o.obj.visible = false; root.add(o.obj); o.life = 0; o.max = 1; a.push(o); } return a; };
  const take = a => { let best = a[0]; for (const o of a) { if (o.life <= 0) return o; if (o.life < best.life) best = o; } return best; };
  const SP = pool(160, () => ({ obj: new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), v: new THREE.Vector3() }));
  const rodG = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); rodG.translate(0, 0.5, 0);
  const RD = pool(40, () => ({ obj: new THREE.Mesh(rodG, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })) }));
  const ringG = new THREE.RingGeometry(0.85, 1, 48, 1); ringG.rotateX(-Math.PI / 2);
  const RG = pool(24, () => ({ obj: new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })) }));
  const arcG = new THREE.RingGeometry(1.2, 4, 24, 1, Math.PI / 2 - 0.87, 1.75); arcG.rotateX(-Math.PI / 2);
  { const p = arcG.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)), f = lrhClamp((r - 1.2) / 2.8, 0, 1); c.push(f, f, f); } arcG.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
  const SW = pool(6, () => ({ obj: new THREE.Mesh(arcG, new THREE.MeshBasicMaterial({ color: 0xe8f0ff, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })) }));
  // the wave: a 70 degree sector whose front edge is a crest of foam
  const waveG = new THREE.RingGeometry(0.75, 1, 24, 1, Math.PI / 2 - 0.61, 1.22); waveG.rotateX(-Math.PI / 2);
  const WV = pool(4, () => { const g = new THREE.Group(); const body = new THREE.Mesh(waveG, new THREE.MeshBasicMaterial({ color: 0x4a9ac8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); const crest = new THREE.Mesh(waveG, new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); crest.position.y = 0.5; g.add(body); g.add(crest); return { obj: g, body, crest }; });
  const colG = new THREE.CylinderGeometry(0.7, 0.9, 1, 16, 1, true); colG.translate(0, 0.5, 0);
  { const p = colG.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const f = 1 - p.getY(i); c.push(f, f, f); } colG.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
  const CL = pool(6, () => ({ obj: new THREE.Mesh(colG, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })) }));
  const later = [];   // things set to happen after a moment: [time left, fn]
  const TCol = t => LRH_TEAM[t ? 1 : 0];

  // a glow sprite: at p, colour, size s (grows by grow a second), life, velocity, gravity, normal (smoke) or additive
  const sprite = (x, y, z, col, s, life, vx, vy, vz, grow, grav, smoke) => {
    const o = take(SP), m = o.obj.material;
    o.obj.position.set(x, y, z); o.obj.scale.setScalar(s); o.obj.visible = true;
    m.color.setHex(col); m.opacity = smoke ? 0.55 : 1; m.blending = smoke ? THREE.NormalBlending : THREE.AdditiveBlending; m.rotation = Math.random() * 6;
    o.v.set(vx || 0, vy || 0, vz || 0); o.s = s; o.grow = grow || 0; o.grav = grav || 0; o.life = o.max = life; o.op = m.opacity; o.beam = false;
    return o;
  };
  const rod = (x, y, z, x2, y2, z2, r, col, life, op, beam) => {
    const o = take(RD); V.set(x2 - x, y2 - y, z2 - z); const L = V.length() || 1e-3;
    o.obj.position.set(x, y, z); Q.setFromUnitVectors(UP, V.multiplyScalar(1 / L)); o.obj.quaternion.copy(Q); o.obj.scale.set(r, L, r);
    o.obj.material.color.setHex(col); o.obj.material.opacity = op; o.op = op; o.obj.visible = true; o.life = o.max = life; o.r = r; o.beam = !!beam; o.drawn = false;
    if (beam) o.obj.onAfterRender = () => { o.drawn = true; }; else o.obj.onAfterRender = () => {};
    return o;
  };
  const ring = (x, y, z, r0, r1, col, life, op) => { const o = take(RG); o.obj.position.set(x, y, z); o.obj.scale.setScalar(r0); o.obj.material.color.setHex(col); o.obj.material.opacity = op; o.op = op; o.r0 = r0; o.r1 = r1; o.obj.visible = true; o.life = o.max = life; return o; };
  const burst = (x, y, z, col, n, sp, s, life, up) => { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, e = Math.random() * 2 - 1, q = Math.sqrt(1 - e * e); sprite(x, y, z, col, s * (0.6 + Math.random() * 0.6), life * (0.6 + Math.random() * 0.6), Math.cos(a) * q * sp, e * sp + (up || 0), Math.sin(a) * q * sp, -s / life * 0.5, 9); } };
  const smoke = (x, y, z, n, s, life, col) => { for (let k = 0; k < n; k++) sprite(x + (Math.random() - 0.5) * s, y + Math.random() * s * 0.5, z + (Math.random() - 0.5) * s, col || 0x3a3430, s * (0.6 + Math.random() * 0.5), life * (0.7 + Math.random() * 0.5), (Math.random() - 0.5) * 0.8, 0.8 + Math.random(), (Math.random() - 0.5) * 0.8, s * 0.9, 0, true); };
  const gy = (x, z) => typeof lrGround === 'function' ? lrGround(x, z) : 0;

  const K = {
    tracer(o) { const c = TCol(o.team); rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.025, c.glow, 0.09, 0.9); rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.008, 0xfff8e0, 0.06, 1); sprite(o.x, o.y, o.z, 0xffd080, 0.5, 0.06); },
    hit(o) { burst(o.x, o.y, o.z, 0xffd090, 7, 3.5, 0.18, 0.25); sprite(o.x, o.y, o.z, 0xfff0c0, 0.6, 0.08); smoke(o.x, o.y, o.z, 1, 0.3, 0.5, 0x5a5450); },
    heal(o) { for (let k = 0; k < 6; k++) sprite(o.x + (Math.random() - 0.5) * 0.8, o.y + Math.random() * 0.6, o.z + (Math.random() - 0.5) * 0.8, k % 2 ? 0xffe08a : 0xb8ff9a, 0.22, 0.8, 0, 1.4 + Math.random(), 0, -0.1); ring(o.x, (o.y || 0) - 0.8 + 0.06, o.z, 0.4, 1.2, 0xffe08a, 0.5, 0.5); },
    beam(o) { const b = rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.07, 0xffd27a, 0.25, 0.55, true); const c = rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.022, 0xfff8e0, 0.25, 0.9, true); void b; void c; if (Math.random() < 0.5) sprite(o.x2, o.y2, o.z2, 0xffe08a, 0.5, 0.15, 0, 0.6, 0); },
    blast(o) { const r = o.r || 3; sprite(o.x, o.y, o.z, 0xffe0a0, r * 1.2, 0.15, 0, 0, 0, r * 6); burst(o.x, o.y, o.z, 0xff9a40, 12, r * 2.5, 0.4, 0.5, 2); smoke(o.x, o.y, o.z, 6, r * 0.6, 1.4); ring(o.x, gy(o.x, o.z) + 0.08, o.z, 0.3, r * 1.2, 0xffb060, 0.4, 0.7); },
    sweep(o) {
      const s = take(SW); s.obj.position.set(o.x, o.y, o.z); s.obj.rotation.set(0, o.yaw || 0, 0); s.obj.scale.setScalar(1); s.obj.material.opacity = 0.7; s.op = 0.7; s.obj.visible = true; s.life = s.max = 0.25;
      for (let k = 0; k < 6; k++) { const a = (o.yaw || 0) + (k / 5 - 0.5) * 1.75, d = 3.2; sprite(o.x - Math.sin(a) * d, o.y, o.z - Math.cos(a) * d, 0xd8e8ff, 0.35, 0.2, -Math.sin(a) * 2, 0, -Math.cos(a) * 2); }
    },
    rush(o) { const y = gy(o.x, o.z); for (let k = 0; k < 4; k++) sprite(o.x + (Math.random() - 0.5) * 1.2, y + 0.2 + Math.random() * 0.4, o.z + (Math.random() - 0.5) * 1.2, 0x8a8478, 0.5 + Math.random() * 0.4, 0.6, (Math.random() - 0.5), 0.6, (Math.random() - 0.5), 1.2, 0, true); sprite(o.x, (o.y || y) + 1.2, o.z, 0xd8e8ff, 1.4, 0.12); },
    wave(o) {
      const w = take(WV), y = gy(o.x, o.z); w.obj.position.set(o.x, y + 0.05, o.z); w.obj.rotation.set(0, o.yaw || 0, 0); w.obj.visible = true; w.life = w.max = 0.8; w.obj.scale.setScalar(1);
      for (let k = 0; k < 14; k++) { const a = (o.yaw || 0) + (Math.random() - 0.5) * 1.2, d = 2 + Math.random() * 11; later.push([d / 17, () => { sprite(o.x - Math.sin(a) * d, y + 0.3, o.z - Math.cos(a) * d, 0xd8ecff, 0.8, 0.6, -Math.sin(a) * 2, 3, -Math.cos(a) * 2, 1.5, 9, true); }]); }
    },
    blink(o) { burst(o.x, o.y, o.z, 0xb8e8ff, 10, 1.6, 0.3, 0.5); burst(o.x2, o.y2, o.z2, 0xffe8a0, 10, 1.6, 0.3, 0.5); rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.15, 0xb8d8ff, 0.3, 0.4); sprite(o.x2, o.y2, o.z2, 0xfff0c0, 1.8, 0.25); },
    death(o) { const c = TCol(o.team); smoke(o.x, o.y + 0.6, o.z, 6, 0.9, 1.6, 0x3a3634); burst(o.x, o.y + 1, o.z, c.glow, 12, 3, 0.25, 0.7, 1.5); ring(o.x, gy(o.x, o.z) + 0.06, o.z, 0.3, 2.2, c.main, 0.6, 0.6); },
    spawn(o) { const c = TCol(o.team), cl = take(CL); cl.obj.position.set(o.x, o.y || 0, o.z); cl.obj.scale.set(1, 3.2, 1); cl.obj.material.color.setHex(c.glow); cl.obj.material.opacity = 0.8; cl.obj.visible = true; cl.life = cl.max = 0.8; burst(o.x, (o.y || 0) + 1, o.z, c.glow, 10, 1.5, 0.2, 0.8, 1.5); ring(o.x, (o.y || 0) + 0.06, o.z, 0.4, 1.6, c.main, 0.6, 0.8); },
    broadside(o) {
      // shells whistling in from the sea along the strip, landing as it falls
      const t = o.t != null ? o.t : 1.4, yaw = o.yaw || 0, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx;
      for (let k = 0; k < 8; k++) {
        const d = 1.5 + k * 2.7 + (Math.random() - 0.5), lx = o.x + fx * d + rx * (Math.random() - 0.5) * 4, lz = o.z + fz * d + rz * (Math.random() - 0.5) * 4, ly = gy(lx, lz);
        const lead = 0.5, when = Math.max(0, t - lead) + k * 0.04;
        later.push([when, () => { rod(lx + rx * 30, ly + 22, lz + rz * 30, lx, ly, lz, 0.05, 0xffc080, lead, 0.5); sprite(lx + rx * 30, ly + 22, lz + rz * 30, 0xffe0a0, 0.8, lead, -rx * 60, -44, -rz * 60); }]);
        later.push([t + k * 0.04, () => K.blast({ x: lx, y: ly + 0.4, z: lz, r: 2.4 })]);
      }
    },
    volley(o) {
      const yaw = o.yaw || 0, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx;
      for (let k = 0; k < 8; k++) { const d = 1.5 + k * 2.7, lx = o.x + fx * d + rx * (Math.random() - 0.5) * 4, lz = o.z + fz * d + rz * (Math.random() - 0.5) * 4; later.push([k * 0.05, () => K.blast({ x: lx, y: gy(lx, lz) + 0.4, z: lz, r: 2.6 })]); }
    },
  };
  return {
    root,
    spawn(kind, o) { const f = K[kind]; if (f && o) f(o); },
    update(dt) {
      dt = Math.min(0.1, dt || 0);
      for (let i = later.length - 1; i >= 0; i--) { later[i][0] -= dt; if (later[i][0] <= 0) { const f = later[i][1]; later.splice(i, 1); f(); } }
      for (const o of SP) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = o.life / o.max; o.v.y -= o.grav * dt; o.obj.position.addScaledVector(o.v, dt); o.s = Math.max(0.01, o.s + o.grow * dt); o.obj.scale.setScalar(o.s); o.obj.material.opacity = o.op * Math.min(1, f * 2); }
      for (const o of RD) { if (o.life <= 0) continue; o.life -= dt; if (o.beam ? o.drawn : o.life <= 0) { o.life = 0; o.obj.visible = false; continue; } if (o.life <= 0) { o.obj.visible = false; continue; } if (!o.beam) { const f = o.life / o.max; o.obj.material.opacity = o.op * f; o.obj.scale.x = o.obj.scale.z = o.r * (0.5 + f * 0.5); } }
      for (const o of RG) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = 1 - o.life / o.max; o.obj.scale.setScalar(o.r0 + (o.r1 - o.r0) * Math.sqrt(f)); o.obj.material.opacity = o.op * (1 - f); }
      for (const o of SW) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = 1 - o.life / o.max; o.obj.scale.setScalar(1 + f * 0.15); o.obj.material.opacity = o.op * (1 - f); }
      for (const o of WV) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = 1 - o.life / o.max, R = 1 + 13 * Math.sqrt(f); o.obj.scale.set(R, 1, R); o.crest.scale.set(1, 1, 1); o.crest.position.y = 0.6 * (1 - f) + 0.1; o.body.material.opacity = 0.55 * (1 - f); o.crest.material.opacity = 0.9 * (1 - f); }
      for (const o of CL) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = 1 - o.life / o.max; o.obj.scale.set(1 - f * 0.6, 3.2 + f * 2, 1 - f * 0.6); o.obj.material.opacity = 0.8 * (1 - f); }
    },
  };
}

// ---------- portraits ----------
function lrHeroPortrait(heroId, team) {
  const key = heroId + (team ? 1 : 0);
  if (LRH.cache[key]) return LRH.cache[key];
  let url = '';
  try {
    if (!LRH.pr) {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setClearColor(0x000000, 0);
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xc8d0f0, 0x5a4a40, 1.0));
      const k = new THREE.DirectionalLight(0xffd0a0, 0.9); k.position.set(-1, 1.2, -1.5); sc.add(k);
      const rim = new THREE.DirectionalLight(0x8aa8ff, 0.6); rim.position.set(1.5, 0.5, 1); sc.add(rim);
      LRH.pr = { c, r, sc, cam: new THREE.PerspectiveCamera(30, 1, 0.05, 20) };
    }
    const P = LRH.pr, TC = LRH_TEAM[team ? 1 : 0];
    const m = lrHeroModel(heroId, team); m.update({ spd: 0, gnd: true, pitch: 0.05, act: {}, dead: -1, hurt: -1 }, 0.016);
    m.group.rotation.y = 0.45; P.sc.add(m.group);
    const h = m.height, hy = h - (heroId === 'bollard' ? 0.38 : 0.25);
    P.cam.position.set(-0.55 * h / 1.8, hy + 0.05, -1.75 * h / 1.8); P.cam.lookAt(0, hy - 0.12 * h / 1.8, 0);
    P.r.setClearColor(TC.deep, 1);
    P.r.render(P.sc, P.cam);
    // a ring in the crew's colour round it
    const out = document.createElement('canvas'); out.width = out.height = 160; const x = out.getContext('2d');
    x.drawImage(P.c, 0, 0);
    const gr = x.createRadialGradient(80, 80, 50, 80, 80, 80); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)'); x.fillStyle = gr; x.fillRect(0, 0, 160, 160);
    x.lineWidth = 8; x.strokeStyle = '#' + TC.main.toString(16).padStart(6, '0'); x.strokeRect(4, 4, 152, 152);
    url = out.toDataURL('image/png');
    P.sc.remove(m.group);
    m.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } else if (o.isSprite) o.material.dispose(); });
  } catch (e) {
    // no WebGL: a drawn badge
    const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), TC = LRH_TEAM[team ? 1 : 0];
    x.fillStyle = '#' + TC.deep.toString(16).padStart(6, '0'); x.fillRect(0, 0, 160, 160);
    x.fillStyle = '#' + TC.main.toString(16).padStart(6, '0'); x.font = 'bold 90px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((heroId || '?')[0].toUpperCase(), 80, 86);
    url = c.toDataURL('image/png');
  }
  return (LRH.cache[key] = url);
}
