'use strict';
// The Chronicle of the Light, mission 2: its cinematics (src/cpcine.js), played in the mission's own world: the point
// under the fort (src/cpm02.js) and the sea wall (src/cpm02b.js).
//  m02_intro   the card; the point and the fort from out at sea; a false light lit; the merchantman's lookout sees
//              it; the Governor and the Sergeant on the sea wall; down the cliff path.
//  m02_bear    (after Part I) the merchantman sees the breakers at last and bears away west.
//  m02_taken   (after Part II) soldiers with torches round the gang's fire, Black Jago on his knees, the Governor.
//  m02_hanged  (Part III begins) three nights later: the cage on the sea wall, and boats under the wall.
//  m02_return  (in Part III) the tide turns, the gibbets' lanterns kindle, the cage hangs open, and he comes up.
//  m02_outro   he goes over the wall with his light, down into the sea, still burning; dawn; the ledger.
// Actors are built in each cinematic's b3 (src/cpkit.js cpkNpc for the people, src/zmboss2.js zbBuildMoon for him) and
// freed in its exit.

// ---------- actors ----------
const CP2A = { gar: ['#8a2a20', '#d8d0bc', '#c8a050', '#ffd88a'], gov: ['#1a1a2a', '#e0d8c8', '#c8a040', '#ffd88a'], gang: ['#2a2622', '#b8b0a0', '#5a4a3a', '#ffd88a'], jago: ['#141210', '#8a8070', '#3a2a1c', '#ffd88a'] };
function cp2aNpc(C, cols, x, y, h, o) { const F = cpkNpc(cols); if (!F) return null; const a = Object.assign({ F, x, y, h, spd: 0, lan: true, jz: 0, cr: 0, noGun: false }, o || {}); (C.npcs = C.npcs || []).push(a); return a; }
function cp2aPose(C) {
  const now = g.t, dt = Math.min(0.05, Math.max(0.001, now - (C.lt || now))); C.lt = now;
  for (const a of C.npcs || []) cpkNpcPose(a.F, { x: FPSC.CX + a.x, y: FPSC.CY + a.y, h: a.h, spd: a.spd, lan: a.lan, jz: a.jz, cr: a.cr, dt, noGun: a.noGun, p: a.p || 0 });
  return dt;
}
function cp2aFree(C) { for (const a of C.npcs || []) cpkNpcFree(a.F); C.npcs = []; if (C.moon) { C.moon.M.root.parent && C.moon.M.root.parent.remove(C.moon.M.root); C.moon = null; } }
// the Mooncusser, for a cinematic: his own model, posed from a stand-in
function cp2aMoon(C, grp, x, y, h) {
  if (typeof zbBuildMoon !== 'function') return null;
  const M = zbBuildMoon(); grp.add(M.root); M.root.visible = true;
  const z = { x: FPSC.CX + x, y: FPSC.CY + y, jz: 0, h: h || 0, walk: false, act: null, at: 0, dead: 0, deadT: 0, ph: 0, sp: 2, stepS: 1, st: 'in', seed: 11, duck: 0, hitT: 0, scorch: 0, scaling: false };
  C.moon = { M, z }; return C.moon;
}
function cp2aMoonPose(C, dt) { if (C.moon) try { zbPoseMoon(C.moon.z, C.moon.M, dt); } catch (e) {} }
// a small boat with a lantern, for under the wall
function cp2aBoat(grp, x, y, z) {
  const G = new THREE.Group(), h = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 4.6), z3Lam('#2a2018')); G.add(h);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,200,120,0.9)', 'rgba(255,200,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(2.4); s.position.set(0, 1.1, 1.4); G.add(s);
  G.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + z)); grp.add(G); return G;
}
const cp2Pole = i => { const f = cp2Z().fl[i] || [0, -59, 0, -60, -Math.PI / 2]; return f; };

// ---------- the intro ----------
cpCineDef('m02_intro', {
  music: 'cpm02sad',
  b3(grp, C) {
    const f = cp2Pole(2), a = f[4];
    C.lamper = cp2aNpc(C, CP2A.gang, f[0] - Math.cos(a) * 1.6 + 0.8, f[1] - Math.sin(a) * 1.6, bearingOf(Math.cos(a), Math.sin(a)), { noGun: true });
    C.mate = cp2aNpc(C, CP2A.gang, f[0] - Math.cos(a) * 3.5 - 1.5, f[1] - Math.sin(a) * 3.2, bearingOf(Math.cos(a) + 0.4, Math.sin(a)), { noGun: false });
    C.gov = cp2aNpc(C, CP2A.gov, -31, CPM2.R + 13.9, Math.PI, { jz: 20.7, noGun: true, lan: false });
    C.sarg = cp2aNpc(C, CP2A.gar, -29.4, CPM2.R + 13.7, Math.PI + 0.2, { jz: 20.7, lan: true });
    CPM2.cineLamps = true;
    const L = CPL.list; if (L[2]) cplSet(L[2], false);
  },
  exit(C) { cp2aFree(C); CPM2.cineLamps = false; },
  shots: [
    cpTitleShot(CP_BY.m02),
    { d: 6.5, cam: [70, -150, 20], to: [30, -118, 13], look: [0, 30, 8], lookTo: [0, 10, 6], fade: [1, 0],
      lines: [[0.4, 'log', 'The parish ledgers call them the wrecking years. On a night with no moon, a lantern on the rocks could look like a harbour.', 'cp_m02_01']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 4.5, cam: [5.5, -51, 2.0], to: [4, -53, 2.6], look: [0, -60, 2.6],
      sfx: [[1.6, 'flare', 0.6]],
      f(t, k, C) { cp2aPose(C); const L = CPL.list[2]; if (L) cplSet(L, t > 1.6); if (C.lamper) C.lamper.p = t < 1.6 ? 0.4 : 0.1; } },
    { d: 5.5, cam: [200, -282, 9], to: [206, -292, 8], look: [240, -330, 7], lookTo: [236, -326, 9],
      lines: [[0.6, 'look', 'Lights under the headland! Red and green, a harbour mouth. Bring her round!', 'cp_m02_02']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 10, cam: [-36, CPM2.R + 9, 23], to: [-35, CPM2.R + 10.5, 23.3], look: [-30, CPM2.R + 13.8, 22], lookTo: [-10, -40, 4],
      lines: [[0.3, 'gov', 'Lights on the point again. Red and green, as if there were a harbour there.', 'cp_m02_03'], [4.0, 'sarg', 'There is a merchantman standing in, Excellency. She has seen them.', 'cp_m02_04'], [7.2, 'gov', 'Then put them out, Sergeant. Every one. And bring me the man who hung them.', 'cp_m02_05']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 3.6, cam: [-30, 66, 22], to: [-22, 44, 2.6], look: [-10, 20, 4], lookTo: [0, -30, 1.5], ease: 'in', fade: [0, 0.4],
      f(t, k, C) { cp2aPose(C); } },
  ],
});

// ---------- she bears away ----------
cpCineDef('m02_bear', {
  music: 'cphope',
  b3(grp, C) { C.ship = cp2Ship(); grp.add(C.ship); if (CP2_3D.ship) CP2_3D.ship.visible = false; C.from = cp2ShipAt(Math.max(0.15, RAID.st.c || 0.3)); },
  exit(C) { if (CP2_3D.ship) CP2_3D.ship.visible = true; },
  shots: [
    { d: 6.5, cam: [20, -96, 3], to: [10, -100, 4], look: [80, -170, 8], lookTo: [20, -200, 8], fade: [0.6, 0],
      sfx: [[0.3, 'sea', 0.5]],
      lines: [[0.6, 'look', 'Breakers! Breakers under the point! Hard over, hard over!', 'cp_m02_12']],
      f(t, k, C) { const [x0, y0] = C.from, a = bearingOf(-1, -0.15) * k + bearingOf(CPM2.SHIPX[0] - CPM2.SHIP0[0], CPM2.SHIPX[1] - CPM2.SHIP0[1]) * (1 - k); cp2ShipPose(C.ship, FPSC.CX + x0 - k * k * 40, FPSC.CY + y0 - k * 14, a, g.t, -0.1 * Math.sin(k * Math.PI)); } },
    { d: 7, cam: [-34, CPM2.R + 9, 24], to: [-30, CPM2.R + 8, 24], look: [0, -60, 2], lookTo: [-80, -200, 4], fade: [0, 1.2],
      lines: [[0.4, 'log', 'She bore away to the west with her yards braced round, and never knew how near it had been.', 'cp_m02_13']],
      f(t, k, C) { const [x0, y0] = C.from; cp2ShipPose(C.ship, FPSC.CX + x0 - 40 - k * 90, FPSC.CY + y0 - 14 - k * 30, bearingOf(-1, -0.15), g.t, 0); } },
  ],
});

// ---------- Jago taken ----------
cpCineDef('m02_taken', {
  music: 'cpm02sad',
  b3(grp, C) {
    const [fx, fy] = cp2Z().fire;
    C.jago = cp2aNpc(C, CP2A.jago, fx - 3, fy + 0.5, bearingOf(-1, 0), { cr: 1, noGun: true, lan: false });
    C.gov = cp2aNpc(C, CP2A.gov, fx - 7.5, fy + 0.2, bearingOf(1, 0), { noGun: true, lan: false });
    C.sold = [[-4.5, 2.6], [-4.8, -2.2], [-1.2, 3.1], [-1.4, -2.6]].map(([dx, dy]) => cp2aNpc(C, CP2A.gar, fx + dx - 8, fy + dy, bearingOf(1, 0), { lan: true }));
    C.fx = fx; C.fy = fy;
  },
  exit(C) { cp2aFree(C); },
  shots: [
    { d: 4.5, cam: [CPM2.R - 32, -10, 2.2], to: [CPM2.R - 31, -6, 2.4], look: [CPM2.R - 22, 2, 1.2], fade: [0.8, 0],
      sfx: [[0.2, 'door', 0.3]],
      f(t, k, C) { cp2aPose(C); C.sold.forEach((a, i) => { if (!a) return; const s = [[-4.5, 2.6], [-4.8, -2.2], [-1.2, 3.1], [-1.4, -2.6]][i]; a.x = C.fx + s[0] - 8 * (1 - k); a.spd = k < 0.95 ? 3 : 0; }); if (C.gov) { C.gov.x = C.fx - 7.5 - 6 * (1 - k); C.gov.spd = k < 0.95 ? 2.5 : 0; } } },
    { d: 8, cam: [CPM2.R - 25, 6, 1.3], to: [CPM2.R - 24.5, 5, 1.4], look: [CPM2.R - 27.5, 2.5, 1.2],
      lines: [[0.3, 'gov', 'Jago Penhallow. You have hung your last light.', 'cp_m02_19'], [3.6, 'jago', 'Hang me where the ships can see, then. I will show them a light yet.', 'cp_m02_20']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 6, cam: [CPM2.R - 21, -3, 0.9], to: [CPM2.R - 21.5, -2, 1.1], look: [CPM2.R - 30, 3, 2], lookTo: [-10, CPM2.R + 14, 24], fade: [0, 1.2],
      lines: [[0.4, 'gov', 'In chains, on the sea wall. Let every master who passes count the price.', 'cp_m02_21']],
      f(t, k, C) { cp2aPose(C); } },
  ],
});

// ---------- three nights later: the sea wall ----------
cpCineDef('m02_hanged', {
  music: 'cpm02sad',
  b3(grp, C) {
    C.boats = [cp2aBoat(grp, -6, -16, -19.7), cp2aBoat(grp, 14, -14.5, -19.7)];
    C.watch = [cp2aNpc(C, CP2A.gar, -27, 2.5, bearingOf(1, -0.3), { lan: true }), cp2aNpc(C, CP2A.gar, -23, -2, bearingOf(1, 0.2), { lan: true })];
  },
  exit(C) { cp2aFree(C); },
  shots: [
    { d: 4, card: { eye: 'The sea wall', t: 'Three nights later', sub: 'At the turn of the tide' } },
    { d: 7, cam: [-2, -14, 1], to: [4, -13, 2], look: [8, -7.4, 3], lookTo: [8, -7.4, 3.4], fade: [0.6, 0],
      sfx: [[0.5, 'creak', 0.5], [4, 'creak', 0.4]],
      lines: [[0.6, 'log', 'They hanged him in chains on the sea wall, where the ships could see. Three nights after, his gang came for him.', 'cp_m02_22']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 5.5, cam: [-4, -4.2, 2.4], to: [-2, -4.6, 2.2], look: [4, -15, -19], lookTo: [10, -15, -19],
      lines: [[0.4, 'sarg', 'Boats under the wall! They are coming up on lines. Keep them off the gibbet!', 'cp_m02_23']],
      f(t, k, C) { cp2aPose(C); if (C.boats) C.boats.forEach((b, i) => { b.position.y = FPSC.GROUND - 19.7 + Math.sin(g.t * 1.3 + i) * 0.15; }); } },
  ],
});

// ---------- he comes back ----------
cpCineDef('m02_return', {
  music: 'cpm02boss',
  b3(grp, C) { CPM2.cineLamps = true; for (const L of CPL.list) cplSet(L, false); cp2aMoon(C, grp, CP2W.GIB[CP2W.JAGO] + 3, -CP2W.Y - 1.5, 0); },
  exit(C) { cp2aFree(C); CPM2.cineLamps = false; },
  shots: [
    { d: 5.5, cam: [-6, 3, 2.2], to: [-3, 2, 2.6], look: [8, -5, 3.6], lookTo: [16, -5, 3.6],
      sfx: [[0.2, 'sea', 0.6], [1.2, 'flare', 0.3], [2.2, 'flare', 0.3], [3.2, 'flare', 0.3], [4.2, 'flare', 0.3]],
      lines: [[0.8, 'sarg', 'The tide has turned. The lanterns... who lit the lanterns?', 'cp_m02_26']],
      f(t, k, C) { CPL.list.forEach((L, i) => cplSet(L, t > 1.2 + i)); if (C.moon) { C.moon.z.jz = -6; C.moon.M.root.visible = false; } } },
    { d: 6.5, cam: [CP2W.GIB[CP2W.JAGO] + 3, -1, 1.6], to: [CP2W.GIB[CP2W.JAGO] + 3, 0, 1.4], look: [CP2W.GIB[CP2W.JAGO] + 3, -6.5, 1.2], lookTo: [CP2W.GIB[CP2W.JAGO] + 3, -6, 2.6],
      sfx: [[0.4, 'mooncusser', 0.8]],
      lines: [[3.6, 'moon', 'I said I would show them a light.', 'cp_m02_27']],
      f(t, k, C) {
        const now = g.t, dt = Math.min(0.05, Math.max(0.001, now - (C.lt || now))); C.lt = now;
        const m = C.moon; if (!m) return; m.M.root.visible = true;
        const q = clamp(t / 3, 0, 1); m.z.y = FPSC.CY - CP2W.Y - 1.5 + q * 1.8; m.z.jz = -3.2 + q * 3.2; m.z.scaling = q < 1; m.z.h = 0;
        if (t > 4) { m.z.act = 'lure'; m.z.at = Math.min(1.2, (t - 4) * 0.6); }
        cp2aMoonPose(C, dt);
      } },
  ],
});

// ---------- the outro ----------
cpCineDef('m02_outro', {
  music: 'cpm02sad',
  b3(grp, C) { cp2aMoon(C, grp, 2, -CP2W.Y + 0.4, Math.PI); C.gov = cp2aNpc(C, CP2A.gov, -10, 1.5, bearingOf(1, -0.6), { noGun: true, lan: false }); C.sarg = cp2aNpc(C, CP2A.gar, -11.5, 0, bearingOf(1, -0.3), { lan: true }); },
  exit(C) { cp2aFree(C); },
  shots: [
    { d: 5, cam: [2, 3.5, 1.5], to: [2, 2.5, 1.7], look: [2, -5.7, 2.2],
      lines: [[0.5, 'moon', 'There will be lights on these rocks long after your fort is fallen.', 'cp_m02_32']],
      f(t, k, C) { const dt = cp2aPose(C), m = C.moon; if (!m) return; m.z.h = Math.PI; m.z.act = null; m.z.walk = false; m.z.y = FPSC.CY - CP2W.Y + 0.4 - k * 0.6; cp2aMoonPose(C, dt); } },
    { d: 6, cam: [5, -4.2, 2.6], to: [5, -4.6, 3], look: [2, -8, -2], lookTo: [2, -12, -19],
      sfx: [[1.4, 'splash', 0.7]],
      f(t, k, C) {
        const dt = cp2aPose(C), m = C.moon; if (!m) return;
        const q = clamp(t / 2.2, 0, 1); m.z.y = FPSC.CY - CP2W.Y - 0.2 - q * 3; m.z.jz = 0.5 * Math.sin(q * Math.PI) - q * q * 20; m.z.dead = t > 2.2 ? 0 : 0;
        m.M.root.rotation.x = 0; cp2aMoonPose(C, dt); m.M.root.rotateX(-q * 1.6);
        if (t > 2.2) { m.z.jz = -20 - (t - 2.2) * 0.4; m.M.halo.scale.setScalar(Math.max(0.6, 2.4 - (t - 2.2) * 0.4)); }
      } },
    { d: 7.5, cam: [-20, -60, 4], to: [-10, -54, 6], look: [0, 0, 2], lookTo: [4, 0, 4], fade: [0.5, 0],
      lines: [[0.5, 'log', 'He went over the wall with his light, and it went down into the sea still burning. It has been seen on the rocks ever since.', 'cp_m02_33']],
      f(t, k, C) { cp2aPose(C); if (C.moon) C.moon.M.root.visible = false; if (typeof GL3D !== 'undefined' && GL3D.scene.fog) { GL3D.amb.intensity = 0.32 + 0.25 * k; GL3D.scene.fog.color.setRGB(0.02 + 0.08 * k, 0.026 + 0.08 * k, 0.04 + 0.09 * k); } } },
    { d: 5.5, cam: [-6, -2, 1.8], to: [-6.5, -1.5, 1.8], look: [-10.5, 1, 1.7],
      lines: [[0.4, 'gov', 'Write it in the ledger, Sergeant. And double the watch on the wall.', 'cp_m02_34']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 3.5, card: { eye: 'Mission complete', t: 'The Mooncussers', sub: 'Some of them came back. Their lights still burn on the water.' } },
  ],
});
