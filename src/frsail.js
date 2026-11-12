// Fog Run: the sail (RAID_STAGES.frsail). The Gannet's Wake's Part I (src/gwsail.js) out of its own shed: the same
// cutter, deck, helm, holes and flood, bell, flare locker, and the drowned over the rail, on a shorter leg (FRS.LEN,
// 400 to 600 m) to the next island instead of the Gannet's mark, with no Maren and no Plimsoll out there.
//  - The way. Each leg sets out from the far side of the last island (the first from the foot of the Light), and its
//    island lies a little either side of north (frLegGeo, from the run's seed: the same on every screen). The island
//    shows on the bearing strip, with how far it is.
//  - The rocks, from the run's seed: thick along the way, thinner off it. They show inside the fog's distance (frFog:
//    55 m in the first reach, 38 in the second, 24 in the last), and in the Light's beam and a flare's, as in the
//    Gannet's Wake; past it there's only the fog. The fog only cuts how far you see. Her speed is the Brig's, always.
//  - She runs up on the island's beach once she's within FRS.IN of it (its radius and a little), and a moment after
//    you're all ashore: the island's stage (src/frisle.js).
// It's done through gwsail's GWS_LEG: this file's prep (from src/raid.js raidMapFor, before the world's laid out)
// fills it in from the run's plan, and its exit clears it. Together it's the Gannet's Wake's word (g* keys), as is.

const FRS = { LEN: [400, 600], SWING: 0.42, IN: 18, ROCKS: 70, FOGC: '#29323b' };
// leg n (from 1): where she sets out from (start, and her heading h0, straight at the island) and the island (mark)
function frLegGeo(n) {
  let sx = GWS.START[0], sy = GWS.START[1];
  for (let k = 1; ; k++) {
    const R = frRng(1000 + k), len = FRS.LEN[0] + R() * (FRS.LEN[1] - FRS.LEN[0]), b = (R() - 0.5) * 2 * FRS.SWING;
    const mx = sx + Math.sin(b) * len, my = sy + Math.cos(b) * len;
    if (k >= n) return { start: [sx, sy], h0: b, mark: [mx, my], len };
    // (the next leg sets out from the far side of this island)
    sx = mx + Math.sin(b) * (FRI.R + 30); sy = my + Math.cos(b) * (FRI.R + 30);
  }
}
// (prep) the leg for plan entry i, into GWS_LEG; and the fog on the sea, before the world's laid out
function frsLeg(i) {
  const p = FR.plan[i] || { n: 1, reach: 1, look: 'shingle' }, G = frLegGeo(p.n), fog = frFog(p.reach), T = FPS_ISLES[p.look] || FPS_ISLES.shingle;
  GWS_LEG = { key: 'frsail', n: p.n, seed: frSeedOf(i) ^ 0x51a, start: G.start, h0: G.h0, mark: G.mark, isleR: FRI.R, markIn: FRI.R + FRS.IN, rocks: FRS.ROCKS, fog, maren: false, plim: false,
    look: p.look, ground: T.ground, ground2: T.ground2, sea: null,
    landSay: `She runs up on the beach of ${T.name}. Ashore!`,
    line: (S, dm) => S.ph === 'beach' ? `She’s run up on the beach of ${T.name}. Ashore…` : S.ph === 'sunk' ? 'She’s going down.' : `Through the fog to the next island (${T.name}): ${Math.round(Math.max(0, dm - FRI.R)).toLocaleString('en')} m`,
    arrive: () => raidNextStage(), b3: frs3dBuild, f3: frs3d };
  if (typeof frcLeg === 'function') frcLeg(GWS_LEG, p);   // [fogrun cards] a fair wind: half as far to go
  FPS_ISLES.frsail.fog = [FRS.FOGC, Math.round(fog * 0.25), Math.round(fog)];
}
FPS_ISLES.frsail = Object.assign({}, FPS_ISLES.gwsail, { name: 'the haar', fog: [FRS.FOGC, 35, 140] });
FPI_GEN.frsail = FPI_GEN.gwsail;
const FRS_MAP = Object.assign({}, GWS_MAP, { isle: 'frsail' });

RAID_STAGES.frsail = Object.assign({}, RAID_STAGES.gwsail, {
  n: 'At sea', map: FRS_MAP, gws: true,
  music: () => FR_MUSIC.sail,
  prep(i) { frsLeg(i); },
  enter() {
    if (!GWS_LEG) frsLeg(RAID.stage);
    frEnterStage();
    RAID_STAGES.gwsail.enter();
    const T = FPS_ISLES[GWS_LEG.look] || FPS_ISLES.shingle;
    ZM.banner = this.banner();
    fpsFeed(RAID.stage === 0 ? 'The keeper’s cutter, at the foot of the Light. Take the wheel (Use) and sail her out into the fog.' : 'Back aboard. Take the wheel (Use): the next island is out there in the fog.');
    fpsFeed(`The fog lets you see ${Math.round(GWS_LEG.fog)} m. Beach her on ${T.name} (its mark is on the strip at the top).`);
  },
  banner() { const p = frPlanNow() || { n: 1 }, R = FR_REACH[FR.reach] || FR_REACH[1]; return { text: 'Into the fog', t: 4.5, sub: `${R.n} · to stop ${p.n}`, col: '#c8d4e0' }; },
  exit() { gwsExit(); GWS_LEG = null; if (typeof GL3D !== 'undefined' && GL3D.scene) GL3D.scene.fog = null; },
});

// ---------- the island out there, in 3D (in the sea's group: GWS_LEG.b3 and f3) ----------
function frs3dBuild(SG, G) {
  const L = GWS_LEG, [mx, my] = L.mark, lam = c => z3Lam(c);
  const I = G.frI = new THREE.Group(); I.position.set(mx, 0, -my); SG.add(I);
  // a low hump of the island's own ground, a beach round it, a few rocks
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10), lam(L.ground)); mound.scale.set(L.isleR, 3.2, L.isleR); mound.position.y = -0.8; I.add(mound);
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(L.isleR + 3, L.isleR + 6, 0.8, 32), lam(L.ground2)); beach.position.y = -0.2; I.add(beach);
  const R = seeded(L.seed ^ 0x15e);
  for (let i = 0; i < 9; i++) { const a = R() * 6.283, d = L.isleR * (0.3 + R() * 0.75), r = 1.5 + R() * 3; const k = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lam('#4e5052')); k.position.set(Math.cos(a) * d, r * 0.3 + 1.2, Math.sin(a) * d); k.rotation.set(R() * 3, R() * 3, R() * 3); I.add(k); }
  // its beacon in the middle, dark: a cairn and its iron cresset
  const cairn = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 2.2, 7), lam('#5a5c58')); cairn.position.y = 3.2; I.add(cairn);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6), lam('#2e3034')); post.position.y = 5.2; I.add(post);
  const cres = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.8, 8, 1, true), lam('#2e3034')); cres.rotation.x = Math.PI; cres.position.y = 6.4; I.add(cres);
  // a faint cold glow where it stands, so there's something to steer for once it's in sight
  G.frGlow = G.glowSp(0xa8c0d8, 14, { opacity: 0 }); G.frGlow.position.y = 6.5; I.add(G.frGlow);
}
function frs3d(dt, V) {
  const L = GWS_LEG, G = GW3; if (!L || !G.frI) return;
  const d = Math.hypot(L.mark[0] - V.x, L.mark[1] - V.y) - L.isleR;
  if (G.frGlow) G.frGlow.material.opacity = clamp(1.3 - d / Math.max(30, L.fog * 1.4), 0, 0.5) * (0.8 + 0.2 * Math.sin(g.t * 1.4));
  // the fog: as far as the reach lets you see (pushed back by what's been lit)
  if (GL3D.scene && GL3D.scene.fog) { const F = GL3D.scene.fog; F.near = L.fog * 0.25; F.far = L.fog; frDome(L.fog, FRS.FOGC); }
}
