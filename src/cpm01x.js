'use strict';
// The Chronicle of the Light, mission 1 (The First Fire): its cinematics (src/cp.js cpMission's intro, after, cut and
// outro, and the Old Keel's coming, played with src/cpcine.js). They're flown through the stage's own world: Lantern
// Rock at dusk and in the haar, the bothy, the Fire Step and its fire (src/cpm01.js), with actors of their own (the
// Fire-Keeper and his daughter Wenna, the haar coming in as a wall, the ship and her lantern, the Old Keel, and for
// the outro the tower of 1841 and the Light's beam far off to the south).
//  - m01_intro: the title; the rock from the sea at dusk; the Fire-Keeper and Wenna at the cold hearth; the strand.
//  - m01_lit (after I): the fire catching; the haar standing up off the sea like a wall, against the wind.
//  - m01_ship (as III begins): a light low in the fog to the west; the cog standing in for the rock.
//  - m01_keel (an event in III): the water heaving by the old wreck; the Old Keel coming up out of it.
//  - m01_outro: the ship going about; the Fire-Keeper's word on it; then 1841: the tower, the new Light's beam over the
//    water, and the last fire-keeper staying with the fire as the fog comes in. He is remembered as the Fog-Keeper.

// ---------- actors ----------
const CP1X = {};
// a figure: the Fire-Keeper (old, a grey gansey), Wenna (a red-brown smock), or the last fire-keeper (oilskins)
function cp1xFig(C, k, cols, outfit) { const F = cpkNpc(cols, outfit); if (F) (C.figs || (C.figs = {}))[k] = F; return F; }
function cp1xFree(C) { for (const k in C.figs || {}) cpkNpcFree(C.figs[k]); C.figs = {}; CPK3.over = null; CPK3.hideNpc = false; CP1S.hide = false; }
function cp1xPose(C, k, x, y, h, o) { const F = C.figs && C.figs[k]; if (!F) return; cpkNpcPose(F, Object.assign({ x: FPSC.CX + x, y: FPSC.CY + y, h, spd: 0, noGun: true, lan: false }, o || {})); if (F.root) F.root.visible = !(o && o.hide); }
// a wall of fog: a long band of soft grey puffs
function cp1xFogWall(grp, n, len) {
  const W = new THREE.Group(), tex = z3Soft('rgba(196,204,212,0.9)', 'rgba(170,180,190,0)');
  W.puffs = [];
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.8, fog: false })); s.userData = { u: (i / (n - 1) - 0.5) * len, h: 1 + (i % 5) * 1.6, s: 7 + (i % 4) * 3, ph: i * 1.3 }; W.add(s); W.puffs.push(s); }
  grp.add(W); return W;
}
function cp1xFogPose(W, x, y, ang, op, t) {
  if (!W) return;
  W.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND)); W.rotation.y = -ang;
  for (const s of W.puffs) { const u = s.userData; s.position.set(u.u, u.h + Math.sin(t * 0.6 + u.ph) * 0.5, Math.sin(t * 0.4 + u.ph) * 2); s.scale.setScalar(u.s * (1 + 0.1 * Math.sin(t + u.ph))); s.material.opacity = op * 0.8; }
}
// a glow (a lantern far off)
function cp1xGlow(grp, col, s) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft(col, 'rgba(0,0,0,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.scale.setScalar(s); grp.add(sp); return sp; }
// the tower of 1841: the fire-keepers' stone tower whole, round, a little tapered, an iron gallery and a lantern room on
// top with its lamp burning low; it stands where the bothy stood
function cp1xTower(grp) {
  const T = new THREE.Group(), st = z3Lam('#6a6c66'), st2 = z3Lam('#585a55'), iron = z3Lam('#2a2c30'), [x, y] = cpaW(CPA.TOWER);
  T.position.copy(z3v(x, y, FPSC.GROUND));
  for (let c = 0; c < 6; c++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(3.3 - (c + 1) * 0.12, 3.4 - c * 0.12, 2.2, 18), c % 2 ? st : st2); m.position.y = 1.1 + c * 2.2; T.add(m); }
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.25, 18), iron); gal.position.y = 13.3; T.add(gal);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), iron); r.position.set(Math.cos(a) * 3.1, 13.8, Math.sin(a) * 3.1); T.add(r); }
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); lan.position.y = 14.6; T.add(lan);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.4, 10), iron); cap.position.y = 16.4; T.add(cap);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x050607 })); door.position.set(0, 1.1, -3.3); T.add(door);
  const g = cp1xGlow(T, 'rgba(255,220,160,0.8)', 7); g.position.y = 14.6; T.glow = g;
  grp.add(T); return T;
}
// the Light, far to the south over the water: its beam sweeping round (as src/frboss.js draws it)
function cp1xBeam(grp) {
  const fade = z3Fade([[0, 'rgba(255,236,180,0.4)'], [0.5, 'rgba(255,226,160,0.12)'], [1, 'rgba(255,220,150,0)']]);
  const geo = new THREE.CylinderGeometry(1, 0.05, 1, 32, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(-Math.PI / 2);
  const B = new THREE.Group(); B.position.copy(z3v(FPSC.CX, FPSC.CY - 820, FPSC.GROUND + 34)); grp.add(B);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
  m.scale.set(200, 10, 900); m.frustumCulled = false; B.add(m);
  const lamp = cp1xGlow(grp, 'rgba(255,236,180,0.9)', 50); lamp.position.copy(B.position);
  return B;
}
// the Old Keel itself (the Keelback's own model, src/zmboss2.js), posed by hand for its coming
function cp1xKeel(grp, C) {
  try { const M = ZBT.crab.build(); grp.add(M.root); C.keel = M; C.kz = { x: 0, y: 0, jz: -2, h: -Math.PI / 2, act: null, at: 0, dead: 0, walk: true, seed: 7, ph: 0, zn: -1, bt: 'crab', rad: 1.05 }; } catch (e) { C.keel = null; }
}
function cp1xKeelPose(C, x, y, jz, h, dt) { const M = C.keel; if (!M) return; const z = C.kz; z.x = FPSC.CX + x; z.y = FPSC.CY + y; z.jz = jz; z.h = h; z.walk = true; try { ZBT.crab.pose(z, M, dt); } catch (e) {} }

// ---------- the intro ----------
cpCineDef('m01_intro', {
  music: 'cpm01dusk', fogFar: 150, amb: 0.42,
  b3(grp, C) { cp1xFig(C, 'keeper', ['#4a3a28', '#b8a888', '#6a4a2a', '#ffd88a'], 'oc_gansey'); cp1xFig(C, 'wenna', ['#7a3a24', '#d8c8a8', '#4a3020', '#ffd88a'], 'oc_brick'); },
  exit(C) { cp1xFree(C); },
  shots: [
    Object.assign(cpTitleShot(CP_BY.m01), { enter() { CPK3.hideNpc = true; } }),
    { d: 6, cam: [-70, -60, 16], to: [-48, -38, 11], look: [0, 6, 2], lookTo: [0, 14, 3], fade: [1.2, 0],
      lines: [[0.6, 'log', 'Before the Light there was a fire, and a family to keep it.', 'cp_m01_01']],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xPose(C, 'keeper', -1.5, 18.6, Math.PI * 0.85, { dt }); cp1xPose(C, 'wenna', 1.6, 18.2, Math.PI * 1.1, { dt }); } },
    { d: 4.5, cam: [5, 12, 2.4], to: [3.5, 14.5, 2.1], look: [-1.5, 18.6, 1.6], lookTo: [0, 19, 1.5],
      lines: [[0.3, 'fire', 'Haar coming. I can smell it on the wind.', 'cp_m01_02']],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xPose(C, 'keeper', -1.5, 18.6, Math.PI * 0.85 + Math.sin(t * 0.8) * 0.2, { dt }); cp1xPose(C, 'wenna', 1.6, 18.2, Math.PI * 1.1, { dt }); } },
    { d: 5, cam: [-2, 22, 3.2], to: [-6, 16, 2.8], look: [-30, -2, 0.5], lookTo: [-30, 2, 0.5],
      lines: [[0.4, 'fire', 'Down to the strand, all of you. Bring me every stick the sea has given.', 'cp_m01_03']],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xPose(C, 'keeper', -3.5, 17.5, -Math.PI / 2 - 0.6, { dt }); cp1xPose(C, 'wenna', -6 - 6 * k, 15 - 6 * k, bearingOf(-1, -1), { dt, spd: 3 }); },
      exit() { CPK3.hideNpc = false; } },
  ],
});

// ---------- the fire catching, and the haar (after I) ----------
cpCineDef('m01_lit', {
  music: 'cpm01haar', fogFar: 130, amb: 0.3,
  b3(grp, C) { C.wall = cp1xFogWall(grp, 40, 150); CPK3.hideNpc = true; cp1xFig(C, 'keeper', ['#4a3a28', '#b8a888', '#6a4a2a', '#ffd88a'], 'oc_gansey'); cp1xFig(C, 'wenna', ['#7a3a24', '#d8c8a8', '#4a3020', '#ffd88a'], 'oc_brick'); },
  exit(C) { cp1xFree(C); },
  shots: [
    { d: 4.2, cam: [2.6, 18.2, 0.9], to: [3.6, 17.2, 1.6], look: [0, 22, 1.2], lookTo: [0, 22, 2.4],
      lines: [[0.8, 'fire', 'There. Let the ships see it, and keep off.', 'cp_m01_08']],
      enter() { CPK3.over = 0.2; }, f(t, k, C) { CPK3.over = 0.2 + 0.8 * k; const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xPose(C, 'keeper', -2.6, 19.8, bearingOf(2.6, 2.2), { dt }); cp1xPose(C, 'wenna', 2.8, 20.2, bearingOf(-2.8, 1.8), { dt }); cp1xFogPose(C.wall, -120, -40, 1.2, 0, t); }, exit() { CPK3.over = null; } },
    { d: 6.5, cam: [-4, 16, 6], to: [-8, 10, 9], look: [-60, -20, 6], lookTo: [-50, -14, 8],
      lines: [[0.3, 'wenna', 'Father. The fog’s coming in against the wind.', 'cp_m01_09'], [3.4, 'fire', 'That’s no common haar. Take brands from the fire, and burn it back.', 'cp_m01_10']],
      sfx: [[0.5, 'foghorn', 0.5]],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xFogPose(C.wall, zbL(-130, -62, k), zbL(-44, -22, k), 1.2, Math.min(1, t / 1.5), t); cp1xPose(C, 'keeper', -2.6, 19.8, bearingOf(-1, -0.6), { dt }); cp1xPose(C, 'wenna', -6, 17.5, bearingOf(-1, -0.4), { dt }); } },
  ],
});

// ---------- the ship's lantern (as III begins) ----------
cpCineDef('m01_ship', {
  music: 'cpm01ship', fogFar: 110, amb: 0.26,
  b3(grp, C) { CPK3.hideNpc = true; cp1xFig(C, 'keeper', ['#4a3a28', '#b8a888', '#6a4a2a', '#ffd88a'], 'oc_gansey'); cp1xFig(C, 'wenna', ['#7a3a24', '#d8c8a8', '#4a3020', '#ffd88a'], 'oc_brick'); C.lan = cp1xGlow(grp, 'rgba(255,214,150,0.95)', 9); },
  exit(C) { cp1xFree(C); },
  shots: [
    { d: 4.2, cam: [-6, 24, 2.2], to: [-8, 25, 2.6], look: [-12, 16, 1.8], lookTo: [-60, 6, 2],
      lines: [[0.3, 'wenna', 'A light! Out to the west, low on the water.', 'cp_m01_17']],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xPose(C, 'wenna', -11, 17, bearingOf(-1, -0.15), { dt }); cp1xPose(C, 'keeper', -3, 19.5, bearingOf(-1, -0.3), { dt }); C.lan.position.copy(z3v(FPSC.CX - 95, FPSC.CY + 4, FPSC.GROUND + 3)); C.lan.material.opacity = 0.5 + 0.4 * Math.sin(t * 2.5); } },
    { d: 5.4, cam: [-26, 6, 3.5], to: [-30, 5, 3], look: [-90, 0, 4], lookTo: [-86, 4, 6],
      lines: [[0.4, 'fire', 'A ship’s lantern. She’s standing in for the rock, and doesn’t know it.', 'cp_m01_18']],
      f(t, k, C) { C.lan.position.copy(z3v(FPSC.CX - 95 + 4 * k, FPSC.CY + 4, FPSC.GROUND + 3)); C.lan.material.opacity = 0.6 + 0.3 * Math.sin(t * 2.5); } },
    { d: 4.4, cam: [3.5, 16.5, 1.9], to: [2.8, 17.4, 1.8], look: [-2.6, 19.8, 1.6],
      lines: [[0.3, 'fire', 'Build the fire high. Higher than ever it’s been.', 'cp_m01_19']],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xPose(C, 'keeper', -2.6, 19.8, bearingOf(5, -3), { dt }); cp1xPose(C, 'wenna', -6.5, 18.6, bearingOf(-1, -0.2), { dt }); C.lan.material.opacity = 0; },
      exit() { CPK3.hideNpc = false; } },
  ],
});

// ---------- the Old Keel (an event in III) ----------
cpCineDef('m01_keel', {
  music: 'cpm01keel', fogFar: 70,
  b3(grp, C) { cp1xKeel(grp, C); },
  exit(C) { if (C.keel && C.keel.root.parent) C.keel.root.parent.remove(C.keel.root); C.keel = null; },
  shots: [
    { d: 3.6, cam: [8, -12, 3], to: [10, -10, 2.6], look: [18, -4, 0], shake: 0.3,
      lines: [[0.3, 'wenna', 'The water’s heaving by the old wreck.', 'cp_m01_22']], sfx: [[0.2, 'splash', 0.8], [1.6, 'creak', 0.9]],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xKeelPose(C, CPA.WRECK1[0] - 4 - 3 * k, CPA.WRECK1[1] + 2, -2 + 1.2 * k, -Math.PI / 2, dt); if (Math.random() < 0.5) fpsPuff(FPSC.CX + 19 + Math.random() * 3, FPSC.CY - 4 + Math.random() * 3, FPSC.GROUND + 0.2, '150,170,180', 2); } },
    { d: 3.8, cam: [12, -9, 1.2], to: [11, -9.5, 1.0], look: [CPA.WRECK1[0] - 7, CPA.WRECK1[1] + 2, 1.2],
      lines: [[0.3, 'fire', 'The keels. The old keels, walking. Mind your legs!', 'cp_m01_23']], sfx: [[0.3, 'bosscrab', 0.9]],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); cp1xKeelPose(C, CPA.WRECK1[0] - 7, CPA.WRECK1[1] + 2, -0.8 + 0.8 * Math.min(1, k * 2), -Math.PI / 2 + Math.sin(t * 2) * 0.2, dt); } },
  ],
});

// ---------- the outro ----------
cpCineDef('m01_outro', {
  music: 'cphope', fogFar: 120, amb: 0.3,
  b3(grp, C) {
    CPK3.hideNpc = true;
    cp1xFig(C, 'keeper', ['#4a3a28', '#b8a888', '#6a4a2a', '#ffd88a'], 'oc_gansey'); cp1xFig(C, 'wenna', ['#7a3a24', '#d8c8a8', '#4a3020', '#ffd88a'], 'oc_brick');
    cp1xFig(C, 'last', ['#2a2c26', '#a8a090', '#4a4a3a', '#ffd88a'], 'oc_whaler');
    C.tower = cp1xTower(grp); C.tower.visible = false; C.beam = cp1xBeam(grp); C.beam.visible = false; C.wall = cp1xFogWall(grp, 34, 110);
    C.lan = cp1xGlow(grp, 'rgba(255,214,150,0.95)', 8);
  },
  exit(C) { cp1xFree(C); },
  shots: [
    { d: 5, cam: [-24, 4, 3], to: [-27, 1, 3.4], look: [-70, -30, 4], lookTo: [-80, -50, 4],
      lines: [[0.5, 'm01mast', 'Light on the rock! Hard over! Hard over!', 'cp_m01_25']], sfx: [[0.2, 'frhorn', 0.7]],
      f(t, k, C) { cp1xFogPose(C.wall, -200, 0, 0, 0, t); C.lan.position.copy(z3v(FPSC.CX - 72 - 14 * k, FPSC.CY - 28 - 26 * k, FPSC.GROUND + 3)); C.lan.material.opacity = 0.8; } },
    { d: 4.6, cam: [3.2, 17, 1.9], to: [2.6, 17.8, 2.0], look: [-2.6, 19.8, 1.6],
      lines: [[0.4, 'fire', 'That’s what the fire’s for. Six hundred years, if it takes it.', 'cp_m01_26']],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); C.lan.material.opacity = 0; cp1xPose(C, 'keeper', -2.6, 19.8, bearingOf(4, -2.4), { dt }); cp1xPose(C, 'wenna', 2.6, 20.2, bearingOf(-3, -1), { dt }); } },
    { d: 4.4, card: { eye: 'Six hundred years on', t: '1841', sub: 'Across the water, Skerry Light is lit for the first time' },
      exit(C) { CP1S.hide = true; CPK3.over = 0.18; C.tower.visible = true; C.beam.visible = true; } },
    { d: 7.5, cam: [-30, -34, 9], to: [-22, -20, 7], look: [0, 6, 6], lookTo: [0, 14, 3], fade: [1, 0], fogFar: 160, amb: 0.34,
      lines: [[0.5, 'log', '1841. A light is lit on the Skerry rock, and the fire on Lantern Rock is no longer wanted.', 'cp_m01_27'], [4.4, 'lastfire', 'They say the new light sees further. I dare say it does.', 'cp_m01_28']],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); C.beam.rotation.y = -t * 0.9 + 1.2; cp1xPose(C, 'last', -2.2, 19.4, bearingOf(0, -1), { dt }); cp1xPose(C, 'keeper', 0, 0, 0, { dt, hide: true }); cp1xPose(C, 'wenna', 0, 0, 0, { dt, hide: true }); cp1xFogPose(C.wall, 0, -70, 0, 0.6, t); } },
    { d: 6, cam: [2.4, 16.6, 1.6], to: [3, 15.5, 2.2], look: [-2.2, 19.4, 1.5], lookTo: [-1, 20.5, 1.4], fogFar: 60,
      lines: [[0.4, 'lastfire', 'Go on, then. I’ll keep it a while longer.', 'cp_m01_29']],
      f(t, k, C) { const dt = Math.min(0.05, FPS.dtLast || 0.016); C.beam.rotation.y = -t * 0.9 + 4; CPK3.over = 0.18 * (1 - k * 0.7); cp1xPose(C, 'last', -2.2, 19.4, bearingOf(2.2, 2.6) + Math.sin(t * 0.5) * 0.1, { dt, cr: 0.6 * Math.min(1, t / 2) }); cp1xFogPose(C.wall, 0, zbL(-40, -4, k), 0, 0.8, t); } },
    { d: 6, card: { eye: 'He would not leave the rock', t: 'The Fog-Keeper', sub: 'Their last keeper is remembered only as the Fog-Keeper.' },
      lines: [[0.6, 'log', 'He would not leave the rock. He is remembered only as the Fog-Keeper.', 'cp_m01_30']] },
    { d: 3, card: { eye: 'Mission complete', t: 'The First Fire', sub: 'c. 1200s · Lantern Rock' } },
  ],
});
