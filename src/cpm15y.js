'use strict';
// The Chronicle of the Light, mission 15 (The Nine Holes): its cinematics. The intro (the headland in the afternoon
// sun, the keepers at their hut with the nine flags, the Light dark out past the point as it always is by day), the
// cove (men standing up in the shallows), the sunset (the 4th to the 6th go by in a card; from the 6th the sun goes
// down and the Light stays dark, and its duty keeper runs for the harbour), the gully (the lost balls shining in the
// chasm, and hands coming up over its lips), the ship (a brig standing in for the point by moonlight, Pellow's
// lantern only half way out), the turn (the barrels alight, the brig going about, the chasm heaving up the crab),
// and the outro (the Light lit at last, the round played on by moonlight, and the coal book's twelve balls).
// Actors are src/cpm09x.js's (c9Act, c9Fig) and src/cpm03.js's (cplWoman, cplBrig), built in each b3 and freed in
// each exit. The sky through each is the stage's own (src/cpm15.js m15Sky), held where the shot wants it (M15SKY.over).

const C15C = { holm: C15_PPL.holm, pell: C15_PPL.pell };
// (cinematic helpers) a keeper, Maren, and the sky held for the length of it
function m15cMaren(grp, C, x, y, h) { const M = cplWoman({ lantern: false, dress: 0x2a3a5a }); if (M) { grp.add(M.root); M.m15 = { x, y, h }; m15cMarenPose(M); } return M; }
function m15cMarenPose(M, x, y, h, lift) { if (!M) return; const P = M.m15; if (x != null) { P.x = x; P.y = y; } if (h != null) P.h = h; const [wx, wy] = cpkW(P.x, P.y); cplWomanPose(M, { x: wx, y: wy, h: P.h, lift: lift || 0 }); }
function m15cFree(C) { for (const k of ['holm', 'pell', 'pell2']) if (C[k]) cpkNpcFree(C[k]); if (C.z) c9ActFree(C.z); if (C.crab) c9ActFree([C.crab]); M15SKY.over = null; }
const m15cFace = (x, y, tx, ty) => Math.atan2(tx - x, ty - y);

cpCineDef('m15_intro', { music: 'cpm15links',
  b3(grp, C) {
    M15SKY.over = 0.08;
    C.holm = c9Fig(C15C.holm, -6.5, 66.5, 0, m15cFace(-6.5, 66.5, -14, 62));
    C.pell = c9Fig(C15C.pell, -9.2, 64.4, 0, m15cFace(-9.2, 64.4, -6, 67));
    C.maren = m15cMaren(grp, C, -12.4, 66.2, m15cFace(-12.4, 66.2, -7, 66));
    // (the bundle of flags on the cart, carried out one by one)
    const stick = z3Lam('#f4efe2'), red = new THREE.MeshLambertMaterial({ color: 0xd8452f, side: THREE.DoubleSide });
    C.bundle = new THREE.Group(); for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 5), stick); s.position.set((i % 3) * 0.08 - 0.08, 1.2, Math.floor(i / 3) * 0.08); s.rotation.z = 0.5 + i * 0.03; C.bundle.add(s); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), red); f.position.set(-0.55 + (i % 3) * 0.08, 2.15, Math.floor(i / 3) * 0.08); f.rotation.z = 0.5; C.bundle.add(f); }
    { const [x, y] = cpkW(-5.2, 68.6); C.bundle.position.copy(z3v(x, y, FPSC.GROUND + 0.9)); } grp.add(C.bundle);
  },
  exit(C) { m15cFree(C); },
  shots: [
    cpTitleShot(CP_BY.m15),
    { d: 7, cam: [-78, 92, 24], to: [-50, 84, 15], look: [-40, 30, 0], lookTo: [-30, 40, 0], fade: [1.2, 0],
      lines: [[0.6, 'log', 'A still summer evening, and the keepers off watch.', 'cp_m15_01'], [3.6, 'log', 'That year they laid out nine holes along the headland, from the gate down to the cliffs and home again.', 'cp_m15_02']], sfx: [[0.3, 'gull', 0.4], [3, 'wind', 0.3]] },
    { d: 6, cam: [-10.5, 57.5, 2.0], to: [-9.8, 58.6, 1.9], look: [-9.4, 66, 1.3],
      lines: [[0.4, 'holm', 'Nine flags, nine holes. The Board would call it idleness, so the Board will not be told.', 'cp_m15_03'], [3.6, 'm15pell', 'A dozen new balls from the chandler in Wrackhaven, and I mean to keep a few of them.', 'cp_m15_04']],
      f(t, k, C) { c9FigPose(C.holm); c9FigPose(C.pell); m15cMarenPose(C.maren); } },
    { d: 5, cam: [-9.6, 64.2, 1.7], look: [-12.4, 66.2, 1.45], lookTo: [-12.2, 66.3, 1.55],
      lines: [[0.4, 'maren', 'You will keep one, Mr Pellow. There is always the sea.', 'cp_m15_05']],
      f(t, k, C) { c9FigPose(C.holm); c9FigPose(C.pell); m15cMarenPose(C.maren); } },
    { d: 6.5, cam: [30, -52, 5], to: [42, -60, 4], look: [230, -300, 30], fade: [0, 0.8],
      lines: [[0.5, 'log', 'From every hole you could see the Light, out on its rock. Dark while the sun was up, as a light should be.', 'cp_m15_06'], [4.2, 'holm', 'First tee. Mind the gate.', 'cp_m15_07']], sfx: [[0.4, 'sea', 0.5]] },
  ] });

cpCineDef('m15_cove', { music: 'cpm15gully',
  b3(grp, C) { M15SKY.over = 0.32; C.z = C15_COVE.map(([x, y], i) => c9Act(i % 2 ? 'walk' : 'jog', x - 3, y - 4, -1.8, m15cFace(x, y, -34, -30), 70 + i)); C.maren = m15cMaren(grp, C, -38, -24, m15cFace(-38, -24, -66, -34)); },
  exit(C) { m15cFree(C); },
  shots: [
    { d: 5.5, cam: [-36, -22, 2.4], to: [-38, -23, 2.3], look: [-66, -36, 0.6], fade: [0.4, 0], sfx: [[0.4, 'splash', 0.5], [2.6, 'moan', 0.5]],
      lines: [[0.4, 'maren', 'Holm. There are men standing in the cove. Up to their waists, and not moving.', 'cp_m15_15']],
      f(t, k, C) { m15cMarenPose(C.maren, null, null, null, 0); C.z.forEach((z, i) => { const [x, y] = C15_COVE[i], q = clamp((t - i * 0.5) / 3, 0, 1); c9ActAt(z, x - 3 + 1.6 * q, y - 4 + 2.2 * q, -1.8 + 1.5 * q, m15cFace(x, y, -34, -30), q > 0 && q < 1); c9ActPose(z); }); } },
    { d: 4.5, cam: [-60, -24, 1.6], look: [-70, -34, 1.2], shake: 0.08, sfx: [[0.3, 'moan', 0.7]],
      lines: [[0.3, 'holm', 'Fishermen? No. No man stands in the sea like that. Get your clubs up.', 'cp_m15_16']],
      f(t, k, C) { C.z.forEach((z, i) => { const [x, y] = C15_COVE[i], q = clamp(t / 4, 0, 1); c9ActAt(z, x - 1.4 + 1.4 * q, y - 1.8 + 1.8 * q, -0.3 + 0.3 * q, m15cFace(x, y, -34, -30), true); c9ActPose(z); }); } },
  ] });

cpCineDef('m15_sunset', { music: 'cpm15dusk',
  b3(grp, C) {
    M15SKY.over = 0.5;
    C.holm = c9Fig(C15C.holm, -22, -47.5, 0, m15cFace(-22, -47.5, 120, -200));
    C.pell = c9Fig(C15C.pell, -19, -48.5, 0, m15cFace(-19, -48.5, 120, -200));
    C.maren = m15cMaren(grp, C, -24.5, -49.5, m15cFace(-24.5, -49.5, 120, -200));
    C.sun = M15_3D.glow(0xff7a40, 140, 0.8); if (C.sun) { C.sun.material.fog = false; const [x, y] = cpkW(380, -300); C.sun.position.copy(z3v(x, y, 8)); grp.add(C.sun); }
  },
  exit(C) { m15cFree(C); },
  shots: [
    { d: 4.4, card: { eye: 'The 4th, the 5th and the 6th', t: 'Along the cliffs', sub: 'First Sight of the Sea, Cliff’s Edge, and the Climb up to the headland, with the sun going down into the sea.' } },
    { d: 6.5, cam: [-28, -40, 3.5], to: [-26, -44, 2.6], look: [230, -300, 20], fade: [0.8, 0], sfx: [[0.3, 'gull', 0.3], [2, 'sea', 0.4]],
      lines: [[0.5, 'log', 'From the sixth the sun goes down into the sea, and the Light should be turning by then.', 'cp_m15_21'], [4.2, 'holm', 'Pellow. Is that the Light?', 'cp_m15_22']],
      f(t, k, C) { M15SKY.over = 0.5 + 0.08 * k; if (C.sun) C.sun.position.y = 8 - 10 * k; c9FigPose(C.holm); c9FigPose(C.pell); m15cMarenPose(C.maren); } },
    { d: 5, cam: [-17, -45, 1.8], look: [-19, -48.5, 1.6],
      lines: [[0.3, 'm15pell', 'Lord. It is past lighting time. I am the duty keeper, and I am stood on a golf links.', 'cp_m15_23']],
      f(t, k, C) { M15SKY.over = 0.58; c9FigPose(C.holm); c9FigPose(C.pell, null, null, null, m15cFace(-19, -48.5, -22, -47.5)); m15cMarenPose(C.maren); } },
    { d: 5.5, cam: [-23, -44, 2.0], look: [-21, -49, 1.5],
      lines: [[0.3, 'holm', 'Then run. Take the skiff from the harbour steps. We will play the round in and follow you down.', 'cp_m15_24'], [3.6, 'maren', 'Run, Mr Pellow. Ships do not wait on golf.', 'cp_m15_25']],
      f(t, k, C) { M15SKY.over = 0.6; c9FigPose(C.holm, null, null, null, m15cFace(-22, -47.5, -19, -48.5)); m15cMarenPose(C.maren); const q = clamp((t - 2.6) / 3, 0, 1); c9FigPose(C.pell, -19 + (-10 + 19) * q, -48.5 + (-74 + 48.5) * q, 0, m15cFace(-19, -48.5, -10, -74), q > 0 && q < 1 ? 4.5 : 0); } },
    { d: 5, cam: [-14, -52, 9], to: [-10, -58, 11], look: [-8, -80, 0], fade: [0, 0.8],
      lines: [[0.3, 'log', 'He went down the harbour path at a run, and we walked on to the seventh, and the light went out of the sky.', 'cp_m15_26']],
      f(t, k, C) { M15SKY.over = 0.62 + 0.12 * k; c9FigPose(C.pell, -10 + 4 * k, -74 - 6 * k, 0, m15cFace(-10, -74, -6, -80), 4.5); c9FigPose(C.holm); m15cMarenPose(C.maren); } },
  ] });

cpCineDef('m15_gully', { music: 'cpm15gully',
  b3(grp, C) { M15SKY.over = null; C.z = [[CP15.GULLY[0] - 0.6, -40], [CP15.GULLY[1] + 0.6, -46], [CP15.GULLY[0] - 0.6, -54], [CP15.GULLY[1] + 0.6, -60]].map(([x, y], i) => { const z = c9Act(i % 2 ? 'walk' : 'jog', x, y, -2.2, x < 19.5 ? -Math.PI / 2 : Math.PI / 2, 90 + i); z.m15 = [x, y]; return z; }); },
  exit(C) { m15cFree(C); },
  shots: [
    { d: 5.5, cam: [19.5, -30, 7], to: [19.5, -36, 5.5], look: [19.5, -58, 0], fade: [0.4, 0], sfx: [[0.3, 'wavesweep', 0.6], [2.5, 'splash', 0.4]],
      lines: [[0.4, 'maren', 'Holm, the water down there is full of lights. Little ones, all along the bottom.', 'cp_m15_35']],
      f(t, k, C) { C.z.forEach(z => { if (z.mdl) z.mdl.root.visible = false; }); } },
    { d: 5.5, cam: [10.8, -50.6, 1.5], look: [14.6, -54, 0.4], lookTo: [14.4, -53.6, 1.3], shake: 0.1, sfx: [[0.5, 'moan', 0.7], [2.2, 'moan', 0.6]],
      lines: [[0.3, 'holm', 'Balls. Every one we have knocked into that gully since the spring, down there shining. And something come up holding each.', 'cp_m15_36']],
      f(t, k, C) { C.z.forEach((z, i) => { if (z.mdl) z.mdl.root.visible = true; const [x, y] = z.m15, q = clamp((t - (i === 2 ? 0.2 : 0.6 + i * 0.4)) / 2.4, 0, 1), s = x < 19.5 ? -1 : 1; c9ActAt(z, x + s * 1.6 * q, y, -2.2 + 2.2 * Math.min(1, q * 1.2), s < 0 ? -Math.PI / 2 : Math.PI / 2, q > 0.8); c9ActPose(z); }); } },
  ] });

cpCineDef('m15_ship', { music: 'cpm15dusk',
  b3(grp, C) {
    M15SKY.over = 0.95;
    C.brig = cplBrig({}); grp.add(C.brig);
    C.bl = [[0, 15, 0xfff0d0], [8, 4, 0xff4030], [-8, 4, 0x40ff60]].map(([u, h, c]) => { const s = M15_3D.glow(c, 3.2, 0.9); s.material.fog = false; s.position.set(0, h, u); C.brig.add(s); return s; });
    C.sk = M15_3D.glow(0xffd88a, 3.2, 0.8); C.sk.material.fog = false; grp.add(C.sk);
    C.holm = c9Fig(C15C.holm, 38, -46, 0, m15cFace(38, -46, 200, -40)); C.maren = m15cMaren(grp, C, 40.4, -47.2, m15cFace(40.4, -47.2, 200, -40));
  },
  exit(C) { m15cFree(C); },
  shots: [
    { d: 6, cam: [34, -44, 2.6], to: [36, -45, 2.4], look: [200, -30, 6], fade: [0.6, 0], sfx: [[0.3, 'wind', 0.4], [3, 'ropecreak', 0.3]],
      lines: [[0.4, 'maren', 'A ship. There, past the 9th. Standing in for the point under all plain sail.', 'cp_m15_40'], [3.6, 'holm', 'A brig, and she thinks she has sea room. With the Light dark, why would she not?', 'cp_m15_41']],
      f(t, k, C) { const [x, y] = cpkW(240 - 10 * k, 10 - 6 * k); C.brig.position.copy(z3v(x, y, 0)); C.brig.rotation.y = -Math.atan2(-160, -120) + Math.PI / 2; const [sx, sy] = cpkW(46, -180); C.sk.position.copy(z3v(sx, sy, 0.6)); c9FigPose(C.holm); m15cMarenPose(C.maren); } },
    { d: 5.5, cam: [60, -70, 14], look: [46, -180, 0], lookTo: [140, -260, 10],
      lines: [[0.4, 'log', 'Pellow’s lantern was only half way out to the rock. He would never have the lamp lit in time.', 'cp_m15_42']],
      f(t, k, C) { const [sx, sy] = cpkW(46 + 4 * k, -180 - 3 * k); C.sk.position.copy(z3v(sx, sy, 0.6)); C.sk.material.opacity = 0.6 + 0.3 * Math.sin(g.t * 3); } },
    { d: 5.5, cam: [40, -44, 1.9], look: [38.4, -46.2, 1.6],
      lines: [[0.3, 'maren', 'The tar barrels on the ledges under the east cliff. The ones the wreckers left. Light those.', 'cp_m15_43']],
      f(t, k, C) { c9FigPose(C.holm, null, null, null, m15cFace(38, -46, 40.4, -47.2)); m15cMarenPose(C.maren, null, null, m15cFace(40.4, -47.2, 38, -46)); } },
    { d: 6, cam: [42.6, -44.4, 1.9], look: [38.8, -46.6, 1.6],
      lines: [[0.3, 'holm', 'Nobody climbs down there in the dark, love. Nobody living.', 'cp_m15_44'], [2.8, 'holm', 'But a ball would get there. There is tar in the pot on the 9th. Dip them, light them, and strike them.', 'cp_m15_45']],
      f(t, k, C) { c9FigPose(C.holm); m15cMarenPose(C.maren); } },
    { d: 4.4, card: { eye: 'The 9th', t: 'Homeward Cliff', sub: 'A long four leaning towards the sea, and a brig standing in for the point in the dark.' } },
  ] });

cpCineDef('m15_turn', { music: 'cpm15boss',
  b3(grp, C) {
    C.brig = cplBrig({}); grp.add(C.brig);
    C.bl = [[0, 15, 0xfff0d0], [8, 4, 0xff4030], [-8, 4, 0x40ff60]].map(([u, h, c]) => { const s = M15_3D.glow(c, 3.2, 0.9); s.material.fog = false; s.position.set(0, h, u); C.brig.add(s); return s; });
    if (M15H.brig) M15H.brig.visible = false;
    C.crab = c9Act('crab', 19.5, -29, -2.6, 0, 11);
    try { if (C.crab.mdl) { zmFreeModel(C.crab); C.crab.mdl = null; } zbMake(C.crab, 'cpm15crab'); zmModel(C.crab); } catch (e) {}
  },
  exit(C) { m15cFree(C); if (M15H.brig) M15H.brig.visible = true; },
  shots: [
    { d: 5.5, cam: [66, -20, 5], to: [69, -17, 5.5], look: [118, -58, 3], fade: [0.4, 0], sfx: [[0.4, 'fireroar', 0.5], [2.6, 'ropecreak', 0.6]],
      lines: [[0.4, 'm15mast', 'Fires on the cliff! Hard a-port! Hard a-port, and haul your yards!', 'cp_m15_47'], [3.6, 'maren', 'She has seen them. Holm, she is going about!', 'cp_m15_48']],
      f(t, k, C) { const b = [140, -70], hd = Math.atan2(-188, -128) + k * 1.6, [x, y] = cpkW(b[0] + Math.sin(hd) * k * 10, b[1] + Math.cos(hd) * k * 10); C.brig.position.copy(z3v(x, y, 0)); C.brig.rotation.y = -hd + Math.PI / 2; C.brig.rotation.x = Math.sin(t * 0.8) * 0.04 + k * 0.06; if (C.crab.mdl) C.crab.mdl.root.visible = false; } },
    { d: 5.5, cam: [24, -16, 2.8], to: [23, -18, 3.2], look: [19.5, -30, 1.0], lookTo: [19.5, -28, 2.2], shake: 0.35, sfx: [[0.2, 'wavesweep', 0.8], [0.8, 'keelback', 0.9], [3, 'bosscrab', 0.8]],
      lines: [[1.2, 'holm', 'The chasm. Something is coming up the gully, as big as a boat.', 'cp_m15_56']],
      f(t, k, C) { const q = clamp(t / 3.6, 0, 1); if (C.crab.mdl) C.crab.mdl.root.visible = true; c9ActAt(C.crab, 19.5, -29 + 3 * q, -2.6 + 2.6 * Math.min(1, q * 1.15), 0, q < 1); c9ActPose(C.crab); } },
    { d: 4.2, cam: [30, -14, 1.6], look: [20, -25, 1.4], shake: 0.15, sfx: [[0.4, 'keelback', 0.8]],
      lines: [[0.3, 'maren', 'There are balls in its shell. Our balls. It has been collecting them.', 'cp_m15_49']],
      f(t, k, C) { if (C.crab.mdl) C.crab.mdl.root.visible = true; c9ActAt(C.crab, 19.5 + 2 * k, -26 + 2 * k, 0, Math.atan2(26, 14), true); c9ActPose(C.crab); } },
  ] });

cpCineDef('m15_outro', { music: 'cpm15home',
  b3(grp, C) {
    M15SKY.over = 1; RAID.st.lit = 1;
    C.holm = c9Fig(C15C.holm, 44, -38, 0, 0); C.maren = m15cMaren(grp, C, 46.5, -39, 0);
    C.balls = []; for (let i = 0; i < 3; i++) { const s = M15_3D.glow(0xfff6e0, 0.6, 0.6); grp.add(s); C.balls.push(s); }
  },
  exit(C) { m15cFree(C); },
  shots: [
    { d: 6.5, cam: [100, -150, 30], to: [60, -110, 18], look: [230, -300, 30], lookTo: [50, -40, 0], fade: [1, 0], sfx: [[0.6, 'beam', 0.6], [3, 'sea', 0.4]],
      lines: [[0.5, 'log', 'The lamp was lit at a quarter to ten, an hour and a half late. It is the only late lighting in the book.', 'cp_m15_61'], [4, 'log', 'The brig stood off, and came in safe at first light.', 'cp_m15_62']] },
    { d: 6.5, cam: [47, -44, 1.9], to: [47, -40, 2.0], look: [52, -20, 1.2], lookTo: [56, 0, 1.4],
      lines: [[0.4, 'holm', 'Well. That is the 8th holed, and a ship saved, and the 9th still to play.', 'cp_m15_63'], [3.6, 'maren', 'By moonlight, then. Nobody will find a lost ball on this course in the dark.', 'cp_m15_64']],
      f(t, k, C) { const q = clamp(t / 6, 0, 1); c9FigPose(C.holm, 44 + 2 * q, -38 + 9 * q, 0, m15cFace(44, -38, 50, -20), 1.4); m15cMarenPose(C.maren, 46.5 + 2 * q, -39 + 9 * q, m15cFace(46.5, -39, 52, -20)); } },
    { d: 6, cam: [60, -10, 8], to: [62, 2, 10], look: [50, -24, 0],
      lines: [[0.4, 'log', 'The round is always played on into the night, and the last three holes by moonlight. The keepers said it kept the game honest.', 'cp_m15_65']],
      f(t, k, C) { c9FigPose(C.holm, 46 + 2 * k, -29 + 6 * k, 0, 0, 1.4); m15cMarenPose(C.maren, 48.5 + 2 * k, -30 + 6 * k, 0); C.balls.forEach((s, i) => { const [x, y] = cpkW(50 + i * 2, -18 + i * 5); s.position.copy(z3v(x, y, FPSC.GROUND + 0.1)); }); } },
    { d: 5.2, card: { eye: 'The station’s coal book', t: 'Twelve golf balls', sub: 'Bought from a Wrackhaven chandler in 1884, and eleven of them lost by the end of that summer. The keeper’s log never mentions the course.' } },
    { d: 4.6, card: { eye: 'Mission complete', t: 'The Nine Holes', sub: 'On a still evening you can still play it.' } },
  ] });
