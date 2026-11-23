'use strict';
// The Chronicle of the Light, mission 16 (The Harbour Pool): its cinematics (src/cpcine.js), flown through the parts'
// own worlds: the pool at dusk (src/cpm16x.js), and the fog off the Hound. Their cameras are given in the sea's frame
// (m16Cs: [x, y, height over the water], turned into the deck's frame as each shot begins, the cutter's pose held
// still while a cinematic plays), or on the cutter's deck (deck: true, the deck's own frame). Actors: Holm on the
// cutter's deck, Maren on the wall (src/cpm03.js cplWoman, living, 1885), Skipper Dunn on the Patience's quarterdeck,
// Kittow at the Rook's tiller; the Rook herself and a boat of Orange's crew where the part's world doesn't have them.
//  - m16_intro: the title; the pool from over the cliffs at dusk; Maren on the wall; Dunn on his mark; Holm aboard.
//  - m16_turn (after I): the last goal, Orange's light flashing; a rocket out in the fog; the Hound's buoy gone;
//    Kittow named; Orange's boat hauls the boom aside.
//  - m16_rook (after II): the buoy on the chain; the Rook out of the fog; Kittow; the grapnel.
//  - m16_board (in III, the Rook broken): she lays alongside and Kittow comes over the rail.
//  - m16_outro: Kittow in irons on the hatch; the Sorrel's lamps going by the marked Hound; Dunn; the next evening;
//    the harbour board's minutes, and the log.

// ---------- shots in the sea's frame ----------
function m16Cs(def) {
  const s = Object.assign({}, def), e0 = def.enter;
  const cv = p => { if (!p) return p; if (def.deck) return p; const [u, v] = m16Loc(p[0], p[1]); return [u, v, p[2] - FPSC.GROUND]; };
  s.enter = C => { const D = def.dyn ? Object.assign({}, def, def.dyn(RAID.st.m16 || {}, C)) : def; for (const k of ['cam', 'to', 'look', 'lookTo']) s[k] = D[k] ? cv(D[k]) : undefined; if (e0) e0(C); };
  if (def.cam) s.cam = [0, 0, 10];
  return s;
}
// the people
const C16Z = { holm: ['#1e2430', '#d8d0bc', '#a08a50', '#ffd88a'], dunn: ['#5a3418', '#d8c8a8', '#ff8c3a', '#ffd88a'], kittow: ['#1a1614', '#6a5a48', '#4a2a1a', '#ff9050'], crew: ['#2a3a4a', '#d8d0bc', '#4aa8ff', '#ffd88a'] };
function m16zPeople(grp, C, who) {
  C.grp = grp; C.sg = new THREE.Group(); if (GW3.SG) GW3.SG.add(C.sg);
  for (const k of who) { if (k === 'maren') { C.maren = cplWoman({ dress: 0x2a3a5a }); if (C.maren) grp.add(C.maren.root); } else C[k] = cpkNpc(C16Z[k] || C16Z.crew, k === 'holm' ? 'oc_gansey' : k === 'kittow' ? 'oc_whaler' : ''); }
}
function m16zFree(C) { for (const k of ['holm', 'dunn', 'kittow', 'crew', 'crew2']) if (C[k]) { cpkNpcFree(C[k]); C[k] = null; } if (C.sg) { if (C.sg.parent) C.sg.parent.remove(C.sg); cpcDispose(C.sg); C.sg = null; } }
// (a figure at a point of the sea's, facing a bearing of the sea's, jz over the water)
function m16zPose(F, x, y, h, jz, o) { if (!F) return; const V = m16V(), [wx, wy] = m16Wd(x, y, V); cpkNpcPose(F, Object.assign({ x: wx, y: wy, h: wrapPi(h - (V ? V.h : 0)), jz: (jz || 0) - FPSC.GROUND, spd: 0, noGun: true, lan: true }, o || {})); }
// (on the cutter's deck: her own frame)
function m16zDeck(F, u, v, h, o) { if (!F) return; cpkNpcPose(F, Object.assign({ x: FPSC.CX + u, y: FPSC.CY + v, h, jz: GWS.D, spd: 0, noGun: true, lan: false }, o || {})); }
function m16zMaren(C, x, y, h, jz, o) { if (!C.maren) return; const V = m16V(), [wx, wy] = m16Wd(x, y, V); cplWomanPose(C.maren, Object.assign({ x: wx, y: wy, h: wrapPi(h - (V ? V.h : 0)), z: jz - FPSC.GROUND }, o || {})); }
const C16_TOP = C16.WALLH + 0.7;   // (the walk along the wall's top, over the water)
// a lugger for a cinematic, in the sea's group: the Rook, her sails tarred black
function m16zRook(C) { try { const R = cplBrig({ lug: true }); R.scale.setScalar(1.25); R.traverse(o => { if (o.material && o.material.color && o.material.side === THREE.DoubleSide) o.material.color.set(0x2a2622); }); C.sg.add(R); const lan = GW3.glowSp(0xff9050, 5, { opacity: 0.85 }); R.add(lan); lan.position.set(-6, 4, 0); return R; } catch (e) { return null; } }
const m16zAt = (o, x, y, h) => { if (!o) return; o.position.set(x, 0, -y); o.rotation.y = Math.PI / 2 - h; };

// ---------- the intro ----------
cpCineDef('m16_intro', {
  music: 'cpm16eve',
  b3(grp, C) { m16zPeople(grp, C, ['maren', 'dunn', 'holm']); },
  exit(C) { m16zFree(C); },
  shots: [
    cpTitleShot(CP_BY.m16),
    m16Cs({ d: 6.2, cam: [380, 300, 70], to: [440, 250, 52], look: [560, 60, 0], lookTo: [580, 50, 2], fade: [1.2, 0],
      lines: [[0.6, 'log', 'Summer, 1885. Between voyages, the harbour crews have found a use for the unfinished basin under the cliffs.', 'cp_m16_01']] }),
    m16Cs({ d: 5.6, cam: [648, 178, 10], to: [636, 172, 9], look: [605, 140, 8.2],
      lines: [[0.4, 'maren', 'Every lamp on the wall lit, and half the town on top of it. You’d think it was a launching.', 'cp_m16_02']],
      f(t, k, C) { m16zMaren(C, 605, 140.6, Math.PI * 0.95, C16_TOP, { lift: 0.4 }); } }),
    m16Cs({ d: 5.2, cam: [C16.PC[0] + 104, C16.PC[1] - 22, 9], to: [C16.PC[0] + 96, C16.PC[1] - 16, 7.4], look: [C16.PC[0] + 82, C16.PC[1], 4.2],
      lines: [[0.4, 'dunn', 'Blue against Orange, keeper. Your cutter against my Patience, first to three.', 'cp_m16_03']],
      f(t, k, C) { m16zPose(C.dunn, C16.PC[0] + 84, C16.PC[1], -Math.PI / 2 + 0.6, 2.75); } }),
    m16Cs({ d: 5.2, deck: true, cam: [2.6, -12.5, 4.2], to: [1.8, -9.6, 3.6], look: [0, 12, 2.4], lookTo: [0, 30, 2.4],
      lines: [[0.4, 'holm', 'First to three, then. And the harbour clock to keep us honest.', 'cp_m16_04']],
      f(t, k, C) { m16zDeck(C.holm, -0.7, 4.4, -0.2); } }),
    m16Cs({ d: 5.4, cam: [C16.PC[0] - 34, C16.PC[1] - 26, 2.6], to: [C16.PC[0] - 22, C16.PC[1] - 20, 3.2], look: [C16.PC[0], C16.PC[1], 4], lookTo: [C16.PC[0] + 20, C16.PC[1], 6], fade: [0, 1],
      lines: [[0.5, 'log', 'Nobody is quite sure who played it first, and every crew says it was theirs.', 'cp_m16_05']] }),
  ],
});

// ---------- the match won, and the turn (after I) ----------
cpCineDef('m16_turn', {
  music: 'cpfog',
  b3(grp, C) { m16zPeople(grp, C, ['maren', 'dunn', 'holm', 'crew', 'crew2']); const M = RAID.st.m16; if (M) M.goalFx = [0, g.t];
    // a boat of Orange's crew at the boom, and the rocket over the harbour mouth
    C.boat = m16GigMesh(); C.sg.add(C.boat.g); C.boat.g.position.set(C16.PC[0] - 4, 0, -(m16Y1() + 8)); C.boat.g.rotation.y = -Math.PI / 2;
    C.rk = GW3.glowSp(0xffe0b0, 9, { opacity: 0 }); C.sg.add(C.rk); C.rkL = new THREE.PointLight(0xffd8a0, 0, 500, 1.2); C.sg.add(C.rkL); },
  exit(C) { m16zFree(C); if (M16G.boom) { M16G.boom.position.set(0, 0, 0); } const M = RAID.st.m16; if (M) M.boomOff = 1; },
  shots: [
    m16Cs({ d: 4.4, cam: [m16X1() - 34, C16.PC[1] - 26, 8], to: [m16X1() - 26, C16.PC[1] - 20, 7], look: [m16X1() + 8, C16.PC[1], 5], lookTo: [m16X1() + 40, C16.PC[1], 14],
      lines: [[0.3, 'holm', 'That’s the match! Blue has it!', 'cp_m16_17']], sfx: [[0.2, 'gallerybell', 0.7]] }),
    m16Cs({ d: 5.2, cam: [560, 132, 12], to: [556, 128, 11], look: [470, 420, 30], fogFar: 520,
      lines: [[1.6, 'maren', 'Holm! The Hound’s buoy is gone. Its chain’s been cut clean through.', 'cp_m16_18']], sfx: [[0.3, 'flare', 0.8]],
      f(t, k, C) { const z = 10 + Math.min(1, t / 1.6) * 70 - Math.max(0, t - 1.6) * 4, a = t < 4.5 ? 1 : 0; if (C.rk) { C.rk.position.set(470, z, -440); C.rk.material.opacity = a; C.rkL.position.copy(C.rk.position); C.rkL.intensity = 2.5 * a; }
        m16zMaren(C, 585 - k * 22, 140.6, -Math.PI / 2, C16_TOP, { spd: 4, lift: 0.8 }); } }),
    m16Cs({ d: 5.4, cam: [C16.PC[0] + 104, C16.PC[1] - 22, 8], to: [C16.PC[0] + 98, C16.PC[1] - 18, 7.4],
      dyn: M => { const N = M.ships && M.ships[0] || { x: C16.PC[0] + 70, y: C16.PC[1], h: -Math.PI / 2 }; C16Z.dunnAt = [N.x - Math.sin(N.h) * 10, N.y - Math.cos(N.h) * 10, N.h]; return { cam: [N.x + 26, N.y - 20, 9], to: [N.x + 20, N.y - 16, 8], look: [C16Z.dunnAt[0], C16Z.dunnAt[1], 4] }; },
      lines: [[0.4, 'dunn', 'Kittow’s lot. They don’t light false lights now. They take away the true ones, and wait.', 'cp_m16_19']],
      f(t, k, C) { const a = C16Z.dunnAt; if (a) m16zPose(C.dunn, a[0], a[1], a[2] + Math.PI * 0.8, 2.75); } }),
    m16Cs({ d: 5, deck: true, cam: [2.4, 6.8, 3.6], to: [2.0, 5.4, 3.4], look: [-0.6, 0, 3.0],
      lines: [[0.3, 'holm', 'And the packet due on the tide, in that fog. She’ll be on the Hound before she sees it.', 'cp_m16_20']],
      f(t, k, C) { m16zDeck(C.holm, -0.6, -0.4, Math.PI * 0.9); } }),
    m16Cs({ d: 4.8, deck: true, cam: [-2.2, -2.6, 3.0], to: [-1.8, -1.8, 3.2], look: [0.4, 6, 2.6],
      lines: [[0.3, 'holm', 'Then she’ll have ours. The old marker, lads. Out through the gap with it.', 'cp_m16_21']],
      f(t, k, C) { m16zDeck(C.holm, -0.6, 1.4, 0.15); } }),
    m16Cs({ d: 5.4, cam: [C16.PC[0] - 34, m16Y1() - 30, 9], to: [C16.PC[0] - 24, m16Y1() - 24, 8], look: [C16.PC[0], m16Y1(), 1.5], fade: [0, 0.8],
      lines: [[0.5, 'dunn', 'Orange will clear the boom. Go!', 'cp_m16_22']],
      f(t, k, C) { const e = clamp((t - 0.8) / 4, 0, 1); if (M16G.boom) M16G.boom.position.set(-e * 6, 0, -e * 26); if (C.boat) C.boat.g.position.set(C16.PC[0] - 4 - e * 6, 0, -(m16Y1() + 8 + e * 24));
        if (C.boat) for (const O of C.boat.oars) O.g.rotation.set(0, Math.sin(t * 3.4 + O.ph) * 0.5, O.s * 0.3);
        m16zPose(C.crew, C16.GAP[0] - 1.5, m16Y1() + 2.4, 0.4, C16_TOP, { cr: 0.4 }); m16zPose(C.crew2, C16.GAP[1] + 1.5, m16Y1() + 2.4, -0.4, C16_TOP, { cr: 0.4 }); } }),
  ],
});

// ---------- the Rook (after II) ----------
cpCineDef('m16_rook', {
  music: 'cpm16rook', fogFar: 140,
  b3(grp, C) { m16zPeople(grp, C, ['holm', 'kittow']); C.rook = m16zRook(C); C.line = m16Line3(); C.line.visible = false; C.sg.add(C.line); },
  exit(C) { m16zFree(C); },
  shots: [
    m16Cs({ d: 5.6, cam: [C16.MOOR[0] + 28, C16.MOOR[1] - 26, 3.2], to: [C16.MOOR[0] + 22, C16.MOOR[1] - 22, 3.8], look: [C16.MOOR[0], C16.MOOR[1], 5], lookTo: [C16.MOOR[0] + 30, C16.MOOR[1] + 20, 5], fade: [0.8, 0],
      lines: [[1.2, 'kittow', 'That’s a fine mark you’ve hung on my Hound, keeper.', 'cp_m16_31']],
      f(t, k, C) { m16zAt(C.rook, C16.MOOR[0] + 80 - k * 42, C16.MOOR[1] + 46 - k * 24, bearingOf(-42, -24)); } }),
    m16Cs({ d: 4.8, deck: true, cam: [2.4, 6.8, 3.6], to: [2.0, 5.6, 3.4], look: [-0.6, 0, 3.0],
      lines: [[0.3, 'holm', 'It’s the Crown’s mark, Kittow, and the Sorrel’s coming in by it.', 'cp_m16_32']],
      f(t, k, C) { m16zDeck(C.holm, -0.6, -0.4, Math.PI * 0.9); } }),
    m16Cs({ d: 5.2, cam: [C16.MOOR[0] + 30, C16.MOOR[1] - 4, 6], to: [C16.MOOR[0] + 26, C16.MOOR[1] - 2, 5.5], look: [C16.MOOR[0] + 36, C16.MOOR[1] + 20, 3.5], lookTo: [C16.MOOR[0], C16.MOOR[1], 4],
      lines: [[0.3, 'kittow', 'Then she’ll come in by nothing.', 'cp_m16_33']], sfx: [[2.2, 'grapnel', 0.9]],
      f(t, k, C) { const rx = C16.MOOR[0] + 38, ry = C16.MOOR[1] + 22, h = bearingOf(-42, -24); m16zAt(C.rook, rx, ry, h);
        m16zPose(C.kittow, rx - Math.sin(h) * 7.5, ry - Math.cos(h) * 7.5, h, 2.3, { lan: true });
        const b = (RAID.st.m16 || {}).ball; if (b && t > 2.2) { C.line.visible = true; const f = Math.min(1, (t - 2.2) / 0.5); m16LineSet(C.line, [rx - Math.sin(h) * 8, ry - Math.cos(h) * 8, 2], [rx + (b.x - rx) * f, ry + (b.y - ry) * f, 4 + Math.sin(f * Math.PI) * 6], 0.5); } } }),
    m16Cs({ d: 4.6, deck: true, cam: [-2.2, -2.6, 3.0], to: [-1.8, -1.8, 3.2], look: [0.4, 6, 2.6], fade: [0, 0.6],
      lines: [[0.3, 'holm', 'Ram her. Break that lugger before she drags it into the dark.', 'cp_m16_34']],
      f(t, k, C) { m16zDeck(C.holm, -0.6, 1.4, 0.15); } }),
  ],
});

// ---------- Kittow comes over the rail (in III) ----------
cpCineDef('m16_board', {
  music: 'cpm16kittow', fogFar: 120,
  b3(grp, C) { m16zPeople(grp, C, ['kittow']); },
  exit(C) { m16zFree(C); },
  shots: [
    m16Cs({ d: 4.6, deck: true, cam: [2.2, -4.5, 3.4], to: [1.8, -3.6, 3.2], look: [-5, 1.5, 2.4], lookTo: [-2.4, 1.2, 2.6], shake: 0.3,
      lines: [[0.6, 'kittow', 'Then I’ll take her myself!', 'cp_m16_43']], sfx: [[0.2, 'shipstrike', 0.8], [1.6, 'grapnel', 0.8]],
      f(t, k, C) { const e = clamp((t - 1.2) / 1.4, 0, 1), u = -6.8 + e * 5.2, jz = GWS.D + 0.6 + Math.sin(e * Math.PI) * 1.4 - (1 - e) * 0.2; if (C.kittow) cpkNpcPose(C.kittow, { x: FPSC.CX + u, y: FPSC.CY + 1.0, h: Math.PI / 2, jz, spd: e > 0 && e < 1 ? 5 : 0, noGun: false, lan: true }); } }),
  ],
});

// ---------- the outro ----------
cpCineDef('m16_outro', {
  music: 'cphope', fogFar: 220,
  b3(grp, C) { m16zPeople(grp, C, ['holm', 'kittow', 'dunn']); const M = RAID.st.m16; if (M) { M.sorP = Math.max(M.sorP || 0, 0.3); if (M.ball) { M.ball.moor = 1; M.ball.x = C16.MOOR[0]; M.ball.y = C16.MOOR[1]; } } },
  exit(C) { m16zFree(C); },
  shots: [
    m16Cs({ d: 5.6, deck: true, cam: [2.4, -6.2, 3.2], to: [2.0, -5.0, 3.0], look: [0, -2.2, 1.8],
      lines: [[0.4, 'holm', 'That’s the Hound marked, and the Sorrel in. And Kittow for the magistrate.', 'cp_m16_46']],
      f(t, k, C) { m16zDeck(C.holm, 1.0, -0.8, -Math.PI * 0.6); if (C.kittow) cpkNpcPose(C.kittow, { x: FPSC.CX - 0.2, y: FPSC.CY - 2.2, h: Math.PI * 0.4, jz: GWS.D + 0.34, spd: 0, noGun: true, lan: false, cr: 1 }); } }),
    m16Cs({ d: 6, cam: [C16.MOOR[0] - 46, C16.MOOR[1] - 30, 7], to: [C16.MOOR[0] - 40, C16.MOOR[1] - 24, 6], look: [C16.MOOR[0], C16.MOOR[1], 4], lookTo: [C16.MOOR[0] - 30, C16.MOOR[1] + 60, 6],
      enter(C) { const M = RAID.st.m16; if (M) M.sorP = 0.45; },
      f(t, k, C) { const M = RAID.st.m16; if (M) M.sorP = 0.45 + k * 0.35; const N = M && M.ships && M.ships[0]; if (N && !N.gone) m16zPose(C.dunn, N.x - Math.sin(N.h) * 10, N.y - Math.cos(N.h) * 10, N.h + Math.PI, 2.75); },
      lines: [[0.8, 'dunn', 'Blue had the match, keeper. I’ll own it, this once.', 'cp_m16_47']] }),
    { d: 6, card: { eye: 'The next evening', t: 'The Harbour Pool', sub: 'The old buoy was towed home at first light, and the match was played again.' },
      lines: [[0.6, 'maren', 'Bring the old buoy home in the morning. The Pool won’t be the same without it.', 'cp_m16_48']] },
    { d: 6.2, card: { eye: 'The harbour board’s minutes', t: 'A new marker for the Hound', sub: 'And two small lighthouses, for the amusement of the crews, and a great deal of new net.' },
      lines: [[0.6, 'log', 'The harbour board’s minutes record the cost of a new marker for the Hound, and of a great deal of new net.', 'cp_m16_49']] },
    { d: 4.8, card: { eye: 'c. 1885', t: 'The Chronicle of the Light', sub: 'The keeper’s log never mentions the game.' },
      lines: [[0.5, 'log', 'The keeper’s log never mentions the game.', 'cp_m16_50']] },
  ],
});
