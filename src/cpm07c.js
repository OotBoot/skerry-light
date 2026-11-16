'use strict';
// The Chronicle of the Light, mission 7: its cinematics (src/cpcine.js), played on the waterfront of the Bonded Quay
// (src/cpm07.js), with the yard's high walls behind and the Light a long way out to the south.
//  m07_intro   the card; the dark quay from the water; the Receiver's gig at the quay steps; no lanterns tonight.
//  m07_lamp    (after Part I) the lamp is lit again and the beam comes round over the town; Black Nell in the yard.
//  m07_nell    (Part III begins) Nell along the quay from the Customs House end; she and the Receiver.
//  m07_outro   Nell on the setts; the first grey of the morning; the gig pulls off from the steps; the ledger.
// Actors are built in each cinematic's b3 (src/cpm02c.js's cp2aNpc, on src/cpkit.js cpkNpc) and freed in its exit.

const CP7A = { recv: ['#1e2634', '#e0d8c8', '#b8a060', '#ffd88a'], crew: ['#3a3a2a', '#c8c0a8', '#5a5a3a', '#ffd88a'], nell: ['#2a1416', '#d8c8b8', '#8a2a24', '#ffd88a'], gang: ['#2a2622', '#b8b0a0', '#5a4a3a', '#ffd88a'] };
// the Receiver and his boat crew at the top of the quay steps
function cp7aCrew(C, x, y, h) {
  C.recv = cp2aNpc(C, CP7A.recv, x, y, h, { noGun: true, lan: false });
  C.crew = [[-2.4, -0.6], [2.3, -0.9], [-0.8, -2.2], [1.2, 1.6]].slice(0, 3).map(([dx, dy]) => cp2aNpc(C, CP7A.crew, x + dx, y + dy, h + (Math.random() - 0.5) * 0.4, { lan: false, noGun: true }));
}

// ---------- the intro ----------
cpCineDef('m07_intro', {
  music: 'cpm07dark',
  b3(grp, C) { cp7aCrew(C, 12, -27.4, 0); C.recv.h = 0.2; },
  exit(C) { cp2aFree(C); },
  shots: [
    cpTitleShot(CP_BY.m07),
    { d: 7, cam: [46, -120, 12], to: [34, -88, 7], look: [0, 0, 4], lookTo: [6, -10, 3], fade: [1, 0],
      sfx: [[0.3, 'sea', 0.5]],
      lines: [[0.4, 'log', 'On the nights the lamp was out, the wreckers came down to the Bonded Quay as if they owned it.', 'cp_m07_01']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 7, cam: [22, -38, 0.6], to: [19, -35, 1.0], look: [13, -29, 0.6], lookTo: [12, -27, 1.5],
      sfx: [[0.6, 'splash', 0.3], [3.5, 'creak', 0.3]],
      lines: [[0.5, 'recv', 'The Gannet’s dead sent their sea chests ashore the night she struck. Those chests belong to the widows, not to Kittow’s gang.', 'cp_m07_02']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 5.5, cam: [12.8, -22.6, 1.7], to: [12.6, -23.6, 1.7], look: [12, -27.4, 1.6],
      lines: [[0.3, 'recv', 'No lanterns, gentlemen. A lantern on this quay tonight is a target.', 'cp_m07_03']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 6.5, cam: [14, -31, 2.4], to: [12.5, -27, 2.2], look: [4, -8, 2.0], lookTo: [0, 0, 2.6],
      lines: [[0.3, 'recv', 'The keeper swears he will have the lamp lit before two. Get the yard gate open by then.', 'cp_m07_04']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 2.6, cam: [12.5, -27, 2.2], to: [12, -25.5, 1.65], look: [0, 0, 2.6], lookTo: [2, 0, 1.8], fade: [0, 0.6],
      f(t, k, C) { cp2aPose(C); } },
  ],
});

// ---------- the lamp lit again ----------
cpCineDef('m07_lamp', {
  music: 'cphope',
  b3(grp, C) {
    C.nell = cp2aNpc(C, CP7A.nell, 2.2, 15.6, Math.PI, { noGun: false, lan: true });
    C.men = [[-1.5, 14.2], [4.6, 14.5]].map(([x, y]) => cp2aNpc(C, CP7A.gang, x, y, Math.PI + (x > 0 ? 0.4 : -0.4), { lan: true }));
    C.recv = cp2aNpc(C, CP7A.recv, 1.8, -4.2, -0.2, { noGun: true, lan: false });
  },
  exit(C) { cp2aFree(C); CP7.cineBeam = false; },
  shots: [
    { d: 7.5, cam: [6, -20, 1.6], to: [5, -21, 1.8], look: [0, -640, 20], lookTo: [0, -640, 30], fade: [0.6, 0],
      sfx: [[2.2, 'flare', 0.3]],
      lines: [[0.4, 'log', 'At twenty past one the lamp was lit again, and the beam came round over the town.', 'cp_m07_10']],
      f(t, k, C) { cp2aPose(C); CP7.cineBeam = t > 2.2; } },
    { d: 6, cam: [-6, 6, 7], to: [-4, 8, 6], look: [2, 15.6, 1.6], lookTo: [2.2, 15.6, 1.8],
      lines: [[0.4, 'nell', 'Receiver’s men on the quay. Douse your lanterns, lads, and let the beam find them for us.', 'cp_m07_11']],
      f(t, k, C) { cp2aPose(C); CP7.cineBeam = true; } },
    { d: 6, cam: [5.5, -8.5, 1.8], to: [4.8, -8, 1.8], look: [1.8, -4.2, 1.6], lookTo: [0, 10, 3], fade: [0, 0.8],
      lines: [[0.3, 'recv', 'The Light is lit. When the beam comes round it shows them to us, and us to them. Keep to the shadows.', 'cp_m07_12']],
      f(t, k, C) { cp2aPose(C); CP7.cineBeam = true; } },
  ],
});

// ---------- Black Nell ----------
cpCineDef('m07_nell', {
  music: 'cpm07nell',
  b3(grp, C) {
    cp7aCrew(C, 12.4, -26.2, -Math.PI / 2);
    C.nell = cp2aNpc(C, CP7A.nell, -56, -21, Math.PI / 2, { noGun: false, lan: false });
    C.men = [[-58, -18.6], [-59, -23.2]].map(([x, y]) => cp2aNpc(C, CP7A.gang, x, y, Math.PI / 2, { lan: true }));
  },
  exit(C) { cp2aFree(C); },
  shots: [
    { d: 6.5, cam: [-30, -25, 1.8], to: [-32, -24, 1.9], look: [-54, -21, 1.6], lookTo: [-46, -21, 1.7], fade: [0.6, 0],
      lines: [[0.8, 'nell', 'You took what was mine, Receiver.', 'cp_m07_20']],
      f(t, k, C) { cp2aPose(C); const x = -56 + k * 9; if (C.nell) { C.nell.x = x; C.nell.spd = k < 0.97 ? 2.2 : 0; } (C.men || []).forEach((a, i) => { if (a) { a.x = x - 2.2 - i * 0.8; a.spd = C.nell.spd; } }); } },
    { d: 5.5, cam: [8.4, -23, 1.7], to: [8.8, -23.4, 1.7], look: [12.4, -26.2, 1.6],
      lines: [[0.3, 'recv', 'It was never yours, Nell. It belongs to the widows of the Gannet.', 'cp_m07_21']],
      f(t, k, C) { cp2aPose(C); } },
    { d: 5, cam: [-41, -19.6, 1.6], to: [-41.5, -20, 1.6], look: [-47, -21, 1.65], fade: [0, 0.6],
      lines: [[0.4, 'nell', 'Then let them come and fetch it.', 'cp_m07_22']],
      f(t, k, C) { cp2aPose(C); if (C.nell) C.nell.p = t > 2 ? -0.05 : 0.25; } },
  ],
});

// ---------- the outro ----------
cpCineDef('m07_outro', {
  music: 'cpm07sad',
  b3(grp, C) {
    cp7aCrew(C, 12, -27.6, Math.PI);
    // (Nell on her knees on the setts, and two of the crew over her)
    C.nell = cp2aNpc(C, CP7A.nell, -40, -20, Math.PI / 2, { cr: 1, noGun: true, lan: false });
    C.hold = [[-37.6, -19.2], [-37.8, -21.4]].map(([x, y]) => cp2aNpc(C, CP7A.crew, x, y, -Math.PI / 2, { lan: true }));
    C.gig0 = CP73.gig ? CP73.gig.position.clone() : null;
  },
  exit(C) { cp2aFree(C); CP7.dawn = 0; if (C.gig0 && CP73.gig) CP73.gig.position.copy(C.gig0); },
  shots: [
    { d: 6.5, cam: [-30, -22, 1.5], to: [-28, -21, 2.4], look: [-40, -20, 0.4], lookTo: [-40, -20, 0.3], fade: [0.8, 0],
      lines: [[0.5, 'nell', 'Take them, then. The sea will have them back one day.', 'cp_m07_28']],
      f(t, k, C) { cp2aPose(C); CP7.dawn = 0.15 + k * 0.15; } },
    { d: 7, cam: [20, -36, 1.2], to: [24, -44, 3], look: [14, -34, -2], lookTo: [14, -40, -2.4],
      sfx: [[0.6, 'splash', 0.3], [3, 'splash', 0.3]],
      lines: [[0.4, 'recv', 'Pull, gentlemen. Easy, now. Mind the chests.', 'cp_m07_29']],
      f(t, k, C) { cp2aPose(C); CP7.dawn = 0.3 + k * 0.2; if (C.gig0 && CP73.gig) { CP73.gig.position.x = C.gig0.x + k * 4; CP73.gig.position.z = C.gig0.z + k * 9; } C.crew && C.crew.forEach(a => { if (a) a.F && a.F.root && (a.F.root.visible = false); }); if (C.recv && C.recv.F && C.recv.F.root) C.recv.F.root.visible = false; } },
    { d: 8, cam: [0, -70, 12], to: [-6, -80, 16], look: [0, 10, 3], lookTo: [0, 0, 6], fade: [0, 1.4],
      lines: [[0.5, 'log', 'The chests were opened at the Customs House on the Monday. The widows signed for them, and the fourth made her mark.', 'cp_m07_30']],
      f(t, k, C) { cp2aPose(C); CP7.dawn = 0.5 + k * 0.3; if (C.gig0 && CP73.gig) { CP73.gig.position.x = C.gig0.x + 4 + k * 6; CP73.gig.position.z = C.gig0.z + 9 + k * 14; } } },
  ],
});
