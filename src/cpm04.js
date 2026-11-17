'use strict';
// The Chronicle of the Light, mission 4: The Night of the Gannet (14 December 1887). The night everything follows from.
// The keeper Holm and his wife Maren, the brig Gannet coming in through the skerries in a gale, and the lamp that
// failed in the second hour. It ends as the log says it ends, whatever anyone does: the brig breaks up with all hands,
// and in the morning the skiff comes back to the harbour steps empty, Maren's lantern still lit; that night the sea
// freezes from the steps to the horizon, the first of the six seas. Nothing in it is drowned: there are no drowned yet.
//
// Its stages are in src/cpm04x.js; it lays out the keeper's station as it stood in 1887, whole and lived in (the
// Lighthouse's own station, src/zombies.js FPI_GEN.light, without its night's furniture: src/cpm04x.js cplstation),
// with the Light's kit from src/cpm03.js.
//  I.   The First Hour (cp_m04watch): the lantern room and the gallery. The Gannet stands in from the north-east through
//       the skerries, and her master can see the rocks only while the beam is on her. Holm takes the lens off its
//       clockwork; one of you takes the turning bar and the beam follows your eye. Her master's sight of the rocks
//       fades whenever the beam is off her; let it go and stay gone among the rocks and she strikes (the mission is
//       lost). The fog bell on the gallery makes her shorten sail for a while (and has to swing still before it's rung
//       again). Squalls of sleet crust the lantern's glass on the weather side, and a crusted pane dims the beam that
//       goes out through it: wipe it clear from the gallery.
//  The lamp fails (m04_fail).
//  II.  The Second Hour (cp_m04dark): relight it. Oil from the Oil Room (four floors down), a new wick from the Service
//       Room (one down), the clockwork wound in the Clock Room (two down); then the lamp lit. Maren takes the skiff and
//       a hand lantern out to the brig (m04_maren); her light can be watched going out across the water. Lit, it is too
//       late (m04_late): the beam finds the Gannet in the breakers, Maren's lantern under her bow, and she strikes.
//  III. The Harbour Steps (cp_m04dawn): the grey morning of 15 December. Down through the station to the courtyard,
//       ring the fog bell for her, and go down to the harbour steps; the skiff drifts in, empty, the lantern still lit.
//  The outro (m04_outro): the log's own words; that night the sea freezes from the steps to the horizon, and there are
//  white mountains behind the headland.
// Lines: cp_m04_01 on (campaign-sound/m04.md).

// ---------- the night's sea: the Gannet's way in, and the skerries ----------
// her course, from far out north-north-east, down the east side of the rock through the skerries towards the harbour
// mouth under the cliffs; she never gets there. GS.FAIL: how far along it she is when the lamp fails; GS.STRIKE: where
// she strikes
var M4 = { PATH: [[330, 720], [252, 470], [204, 300], [172, 170], [152, 62], [142, -34], [128, -96], [100, -150], [52, -196]], FAIL: 0, STRIKE: 0, LEN: 0,
  ROCKS: [[236, 330, 9], [168, 300, 7], [214, 222, 8], [140, 210, 6], [196, 118, 10], [124, 120, 7], [176, 20, 8], [118, 40, 6], [168, -60, 9], [110, -40, 7], [122, -108, 11], [150, -130, 7], [86, -120, 8], [92, -175, 9]],
  ov: null };
{ let L = 0; M4.SEG = M4.PATH.slice(1).map((p, i) => { const q = M4.PATH[i], l = Math.hypot(p[0] - q[0], p[1] - q[1]); L += l; return l; }); M4.LEN = L; }
M4.FAIL = M4.SEG.slice(0, 4).reduce((a, b) => a + b, 0) + M4.SEG[4] * 0.4;   // (between P4 and P5: inside the skerries)
M4.STRIKE = M4.SEG.slice(0, 5).reduce((a, b) => a + b, 0) + M4.SEG[5] * 0.82;   // (on the rock at P6's shoulder)
M4.DANGER = M4.SEG.slice(0, 2).reduce((a, b) => a + b, 0);   // (past here she's among the rocks)
// where she is, s metres along her course: [x, y, heading (bearing, radians)]
function m4At(s) {
  let i = 0; s = clamp(s, 0, M4.LEN - 0.01);
  while (i < M4.SEG.length - 1 && s > M4.SEG[i]) { s -= M4.SEG[i]; i++; }
  const a = M4.PATH[i], b = M4.PATH[i + 1], k = s / M4.SEG[i];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[0] - a[0], b[1] - a[1])];
}
cpCast('sea', { n: 'A voice off the sea', c: '#c0c8d0' });
Object.assign(CP_MUSIC_FALL, { cpm04watch: 'cptense', cpm04dark: 'cptense', cpm04maren: 'cpsad', cpm04late: 'cpsad', cpm04dawn: 'cpsad', cpm04ice: 'cpsad' });
Object.assign(RM_LOOP, { cpm04late: false, cpm04ice: false });   // (the strike, and the freezing: played once)
cpMission({ id: 'm04', act: 2, n: 'The Night of the Gannet', when: '14 December 1887', where: 'Skerry Light',
  blurb: 'Keep the beam on the brig Gannet as she comes in. In the second hour the lamp fails.',
  stages: ['cp_m04watch', 'cp_m04dark', 'cp_m04dawn'], intro: 'm04_intro', outro: 'm04_outro', after: { 0: 'm04_fail', 1: 'm04_late' }, music: { default: 'cpm04watch' },
  stop() { ZM_MAPS.campaign.tower = false; M4.ov = null; } });

// ---------- its cinematics ----------
const M4C = { holm: ['#1e2430', '#d8d0bc', '#a08a50', '#ffd88a'], lamp: '#ffd88a' };
// (the keeper and his wife, for a cinematic: built in b3, posed in its shots, freed at its exit)
function m4CinePeople(C, maren, holm) { if (holm !== false) C.holm = cpkNpc(M4C.holm); if (maren !== false) { C.maren = cplWoman({}); if (C.maren && C.grp) C.grp.add(C.maren.root); } }
function m4CineFree(C) { if (C.holm) cpkNpcFree(C.holm); if (C.maren && C.maren.root.parent) C.maren.root.parent.remove(C.maren.root); CPL.ov = null; M4.ov = null; }
const m4HolmPose = (C, x, y, h, z, o) => { cpkNpcPose(C.holm, Object.assign({ x: FPSC.CX + x, y: FPSC.CY + y, h, jz: z || 0, noGun: true, lan: false }, o || {})); cplGunAway(C.holm); };
const m4MarenPose = (C, x, y, h, z, o) => cplWomanPose(C.maren, Object.assign({ x: FPSC.CX + x, y: FPSC.CY + y, h, z: z || 0 }, o || {}));
var M4L5 = ZMT.L[5], M4TY = ZMT.Y;
cpCineDef('m04_intro', {
  music: 'cpm04watch',
  b3(grp, C) { C.grp = grp; m4CinePeople(C); CPL.ov = { k: 1, ang: 0 }; },
  exit(C) { m4CineFree(C); },
  shots: [
    cpTitleShot(CP_BY.m04),
    { d: 7, cam: [-60, -95, 12], to: [-44, -70, 18], look: [0, M4TY, 22], lookTo: [0, M4TY, 26], fade: [1, 0], shake: 0.15,
      f(t, k) { CPL.ov = { k: 1, ang: (t * 0.97 + 2) % 6.283 }; },
      lines: [[0.8, 'holm', 'Wind’s gone round east-north-east. A full gale before midnight, and sleet with it.', 'cp_m04_01']] },
    { d: 6.5, cam: [3.6, M4TY - 4.4, M4L5 + 1.75], to: [3.2, M4TY - 3.6, M4L5 + 1.7], look: [-2.2, M4TY - 1.2, M4L5 + 1.5],
      f(t, k, C) { CPL.ov = { k: 1, ang: (t * 0.97 + 4) % 6.283 }; m4HolmPose(C, -2.6, M4TY - 0.8, Math.PI * 0.75, M4L5); m4MarenPose(C, -1.4, M4TY - 3.2, -0.3, M4L5, { lantern: true }); },
      lines: [[0.3, 'maren', 'There’s a sail, Holm. North-east, standing in for the harbour.', 'cp_m04_02'], [3.6, 'holm', 'In this? Who would bring a ship in, in this?', 'cp_m04_03']] },
    { d: 6, cam: [180, 520, 14], to: [196, 500, 12], look: [M4.PATH[0][0] - 20, M4.PATH[0][1] - 60, 6], shake: 0.25,
      f(t, k) { CPL.ov = { k: 1, ang: 0.4 }; M4.ov = { s: 60 + t * 6 }; },
      lines: [[0.4, 'holm', 'A brig, by her lights. The Gannet. That’s Crane, bringing his cargo in early again.', 'cp_m04_04']] },
    { d: 7, cam: [-3.4, M4TY - 2.4, M4L5 + 1.8], to: [-2.8, M4TY - 1.6, M4L5 + 1.9], look: [1, M4TY + 0.6, M4L5 + 1.4], fade: [0, 0.6],
      f(t, k, C) { CPL.ov = { k: 1, ang: (t * 0.97 + 1) % 6.283 }; m4HolmPose(C, 1.6, M4TY + 1.2, Math.PI * 1.2, M4L5); m4MarenPose(C, -0.8, M4TY + 2.4, Math.PI * 0.8, M4L5); },
      lines: [[0.3, 'holm', 'Take the lens off the clockwork. We’ll hand her in, as I did in the old days.', 'cp_m04_05'], [3.8, 'maren', 'I’ll stand by the bell.', 'cp_m04_06']] },
  ] });
// the lamp fails
cpCineDef('m04_fail', {
  music: 'cpm04dark',
  b3(grp, C) { C.grp = grp; m4CinePeople(C, false); CPL.ov = { k: 1, ang: 1.2, o: { flicker: true } }; },
  exit(C) { m4CineFree(C); },
  shots: [
    { d: 4.5, cam: [1.4, M4TY - 2.3, M4L5 + 1.6], to: [1.2, M4TY - 2.0, M4L5 + 1.55], look: [0, M4TY, M4L5 + 1.2],
      f(t, k) { CPL.ov = { k: k < 0.75 ? 1 - k * 0.6 : Math.max(0, 0.55 - (k - 0.75) * 2.4), ang: 1.2, o: { flicker: true } }; },
      enter() { try { if (!sfxPlay('lampout', { vol: 0.8 }) && !soundOff()) sfxLightsOut(); } catch (e) {} },
      lines: [[1.6, 'holm', 'No. No, no, no.', 'cp_m04_07']] },
    { d: 5.5, cam: [-70, -40, 10], to: [-62, -30, 12], look: [0, M4TY, 22], shake: 0.2,
      f() { CPL.ov = { k: 0, ang: 1.2 }; },
      lines: [[0.8, 'maren', 'Holm! The light!', 'cp_m04_08']] },
    { d: 6.5, cam: [2.8, M4TY - 3.6, M4L5 + 1.7], to: [2.4, M4TY - 3.0, M4L5 + 1.65], look: [-0.6, M4TY - 0.6, M4L5 + 1.3], fade: [0, 0.5],
      f(t, k, C) { CPL.ov = { k: 0, ang: 1.2 }; m4HolmPose(C, -0.9, M4TY - 1.2, Math.PI * 0.8, M4L5); },
      lines: [[0.2, 'holm', 'There’s oil in her. The wick is sound. She simply went out.', 'cp_m04_09'], [3.4, 'holm', 'Oil from below, a new wick, and wind the clock. Go!', 'cp_m04_10']] },
  ] });
// Maren goes (played as an event in the second hour, src/cpm04x.js)
cpCineDef('m04_maren', {
  music: 'cpm04maren',
  b3(grp, C) { C.grp = grp; m4CinePeople(C); C.skiff = cplSkiff(); grp.add(C.skiff); C.lan = cplWoman({}); if (C.lan) grp.add(C.lan.root); CPL.ov = { k: 0, ang: 1.2 }; },
  exit(C) { m4CineFree(C); if (C.lan && C.lan.root.parent) C.lan.root.parent.remove(C.lan.root); },
  shots: [
    { d: 6, cam: [-2.2, M4TY - 5.6, M4L5 + 1.7], to: [-2.0, M4TY - 5.0, M4L5 + 1.7], look: [1.4, M4TY - 2.2, M4L5 + 1.5],
      f(t, k, C) { m4MarenPose(C, 1.6, M4TY - 2.0, Math.PI * 1.25, M4L5, { lift: 0.5 }); m4HolmPose(C, -1.4, M4TY - 3.4, Math.PI * 0.2, M4L5); if (C.lan) C.lan.root.visible = false; if (C.skiff) C.skiff.visible = false; },
      lines: [[0.3, 'maren', 'She’s in among the rocks, and blind. I’ll take the skiff out with a lantern.', 'cp_m04_11'], [4.0, 'holm', 'Maren. Not in this sea.', 'cp_m04_12']] },
    { d: 5.5, cam: [-1.6, M4TY - 5.2, M4L5 + 1.6], look: [1.6, M4TY - 2.0, M4L5 + 1.6],
      f(t, k, C) { m4MarenPose(C, 1.6 + k * 0.6, M4TY - 2.0 + k * 1.4, Math.PI * 1.25, M4L5, { lift: 0.4 }); m4HolmPose(C, -1.4, M4TY - 3.4, Math.PI * 0.25, M4L5); },
      lines: [[0.3, 'maren', 'You light the lamp. I’ll be back before you’ve trimmed it.', 'cp_m04_13'], [3.4, 'maren', 'I row better than any man in Wrackhaven. You’ve said so yourself.', 'cp_m04_14']] },
    { d: 7, cam: [10, -50, 3.5], to: [14, -56, 4.5], look: [6, -66, 0.6], lookTo: [14, -82, 0.6], shake: 0.2, fade: [0.4, 0.8],
      f(t, k, C) { if (C.maren) C.maren.root.visible = false; if (C.skiff) { C.skiff.visible = true; const x = 4 + k * 12, y = -64 - k * 18; C.skiff.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND - 0.2 + Math.sin(t * 2) * 0.3)); C.skiff.rotation.set(Math.sin(t * 1.7) * 0.12, Math.PI / 2 + 0.6, Math.sin(t * 2.1) * 0.1);
          C.skiff.userData.oars.forEach(o => { o.rotation.y = Math.sin(t * 3) * 0.5; }); if (C.lan) { C.lan.root.visible = true; cplWomanPose(C.lan, { x: FPSC.CX + x, y: FPSC.CY + y, h: Math.PI / 2 + 0.6 + Math.PI, z: -0.1, sit: 0.9, row: t * 3 }); } } },
      enter() { try { if (!soundOff()) sfxRowlock(0); } catch (e) {} },
      lines: [[4.6, 'holm', 'Maren.', 'cp_m04_15']] },
  ] });
// too late: the lamp comes back, the beam finds the Gannet in the breakers, Maren's lantern under her bow, and she strikes
cpCineDef('m04_late', {
  music: 'cpm04late',
  b3(grp, C) { C.grp = grp; m4CinePeople(C, false); C.skiff = cplSkiff(); grp.add(C.skiff); C.lan = cplWoman({}); if (C.lan) grp.add(C.lan.root); C.s0 = M4.STRIKE - 70; },
  exit(C) { m4CineFree(C); if (C.lan && C.lan.root.parent) C.lan.root.parent.remove(C.lan.root); },
  shots: [
    { d: 4, cam: [1.3, M4TY - 2.3, M4L5 + 1.6], to: [2.4, M4TY - 3.4, M4L5 + 1.9], look: [0, M4TY, M4L5 + 1.2],
      f(t, k) { CPL.ov = { k: Math.min(1, 0.1 + k * 1.4), ang: 3.5 + k * 0.4, o: { flicker: k < 0.5 } }; },
      lines: [[1.4, 'holm', 'She’s lit. She’s lit! Swing her round, east, east!', 'cp_m04_16']] },
    { d: 6, cam: [8, M4TY - 2, M4L5 + 2.6], to: [9, M4TY - 3, M4L5 + 2.8], look: [142, -40, 4], lookTo: [130, -80, 3],
      f(t, k, C) { CPL.ov = { k: 1, ang: 1.9 + k * 0.45 }; M4.ov = { s: C.s0 + t * 7, lan: 1 }; m4CineSkiff(C, t); },
      lines: [[1.2, 'holm', 'There! There she is!', 'cp_m04_17'], [3.6, 'maren', 'Gannet! Gannet! Bear away! Rocks!', 'cp_m04_18']] },
    { d: 7.5, cam: [96, -46, 7], to: [100, -54, 6], look: [124, -86, 4], shake: 0.3,
      f(t, k, C) { CPL.ov = { k: 1, ang: 2.3 + Math.sin(t * 0.8) * 0.05 }; const hit = Math.max(0, t - 2.4); M4.ov = { s: Math.min(M4.STRIKE, C.s0 + 42 + t * 7), heel: Math.min(0.42, hit * 0.16), sink: hit * 0.25, lan: 1 }; m4CineSkiff(C, t + 6);
        if (hit > 0 && !C.bell) { C.bell = 1; try { const rec = sfxPlay('shipstrike', { vol: 0.9 }); if (!soundOff()) { if (!rec) sfxSmash(1, 0); sfxBell(); } } catch (e) {} } if (hit > 1.4 && !C.bell2) { C.bell2 = 1; try { if (!soundOff()) sfxBellFar(0, 0.8); } catch (e) {} } },
      lines: [[3.0, 'sea', 'She’s struck! She’s on the rocks!', 'cp_m04_19']] },
    { d: 6, cam: [-9.6, M4TY + 1.2, M4L5 + 1.7], to: [-9.8, M4TY + 1.6, M4L5 + 1.8], look: [60, -40, 6], shake: 0.15, fade: [0, 1.5],
      f(t, k, C) { CPL.ov = { k: 1, ang: (2.3 + t * 0.6) % 6.283 }; M4.ov = { s: M4.STRIKE, heel: 0.5, sink: 1 + t * 0.2, lan: 0 }; m4HolmPose(C, -8.6, M4TY + 0.4, 0.9, M4L5); if (C.skiff) C.skiff.visible = false; if (C.lan) C.lan.root.visible = false; },
      lines: [[0.6, 'holm', 'Maren! Maren!', 'cp_m04_20']] },
    { d: 6, card: { eye: '14 December 1887 · The second hour', t: 'The Gannet', sub: 'She broke up on the skerries with all hands. Her bell was heard ringing as she went.' } },
  ] });
// (the skiff in the breakers by the Gannet's bow, her lantern raised)
function m4CineSkiff(C, t) {
  const [gx, gy] = m4At(M4.STRIKE - 18), x = gx - 14 + Math.sin(t * 0.4) * 2, y = gy + 10;
  if (C.skiff) { C.skiff.visible = true; C.skiff.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND - 0.2 + Math.sin(t * 2.2) * 0.45)); C.skiff.rotation.set(Math.sin(t * 1.7) * 0.2, 0.4, Math.sin(t * 2.3) * 0.16); }
  if (C.lan) { C.lan.root.visible = true; cplWomanPose(C.lan, { x: FPSC.CX + x, y: FPSC.CY + y, h: 2.2, z: 0, sit: 0.35, lift: 1 }); }
}
// the morning, and the night after: the sea freezes, and there are mountains
cpCineDef('m04_outro', {
  music: 'cpm04ice',
  b3(grp, C) {
    C.grp = grp; m4CinePeople(C, false);
    // the ice: a white sheet out from the harbour steps, growing to the horizon
    const ice = C.ice = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshPhongMaterial({ color: 0xdfe8ee, specular: 0xffffff, shininess: 60, emissive: 0x18202a, transparent: true, opacity: 0.96 }));
    ice.rotation.x = -Math.PI / 2; ice.position.copy(z3v(FPSC.CX, FPSC.CY - 41, FPSC.GROUND + 0.16)); ice.scale.setScalar(0.01); grp.add(ice);
    // the mountains behind the headland: white to the top
    C.mts = [];
    const snow = new THREE.MeshLambertMaterial({ color: 0xe8eef4, emissive: 0x2a3440, fog: false }), rock = new THREE.MeshLambertMaterial({ color: 0x4a5058, fog: false }), rr = seeded(0x77e1);
    for (let i = 0; i < 9; i++) { const m = new THREE.Group(), h = 260 + rr() * 320, r = 220 + rr() * 200; const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rock); c.position.y = h / 2; m.add(c); const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.55, 7), snow); s.position.y = h * 0.725 + 1; m.add(s); m.position.copy(z3v(FPSC.CX - 1500 + i * 380 + rr() * 120, FPSC.CY - 1700 - rr() * 500, -h)); m.userData.h = h; grp.add(m); C.mts.push(m); }
    C.lantern = cplLantern(1.6); C.lantern.position.copy(z3v(FPSC.CX + 1.5, FPSC.CY - 41.9, FPSC.GROUND + 0.6 + 0.12)); C.lantern.visible = false; grp.add(C.lantern);
  },
  exit(C) { m4CineFree(C); },
  shots: [
    { d: 7.5, cam: [9, -50, 1.3], to: [7, -48, 1.5], look: [1.6, -42.2, 1.1], fade: [0.8, 0],
      f(t, k, C) { m4HolmPose(C, 1.4, -41.6, Math.PI * 1.1, 0.6, { cr: 0.6, lan: true }); },
      lines: [[0.6, 'log', 'The Gannet is on the skerries with all hands.', 'cp_m04_21'], [3.6, 'log', 'The skiff came ashore at the harbour steps this morning, empty.', 'cp_m04_22']] },
    { d: 5.5, cam: [2.6, -43.4, 1.5], to: [2.4, -43.0, 1.4], look: [1.5, -41.9, 1.15],
      f(t, k, C) { m4HolmPose(C, 1.4, -41.6, Math.PI * 1.1, 0.6, { cr: 0.6, lan: true }); },
      lines: [[0.8, 'log', 'Maren’s lantern was still lit.', 'cp_m04_23']] },
    { d: 3.5, card: { eye: '15 December 1887', t: 'That night' } },
    { d: 9, cam: [0, -36, 9], to: [0, -30, 30], look: [0, -120, 0], lookTo: [0, -400, 20], fade: [0.6, 0],
      f(t, k, C) { const r = 2 + Math.pow(k, 1.6) * 1400; C.ice.scale.setScalar(r); if (Math.random() < 0.25) fpsPuff(FPSC.CX + (Math.random() - 0.5) * 30, FPSC.CY - 50 - Math.random() * 40, FPSC.GROUND + 0.4, '230,240,250', 1.4); if (!C.crk && t > 1) { C.crk = 1; try { if (!sfxPlay('icefreeze', { vol: 0.8 }) && !soundOff()) sfxCreak(); } catch (e) {} } },
      lines: [[1.2, 'log', 'That night the sea froze from the steps to the horizon,', 'cp_m04_24']] },
    { d: 9, cam: [0, -30, 30], to: [0, -24, 34], look: [0, -400, 20], lookTo: [0, -900, 160],
      f(t, k, C) { C.ice.scale.setScalar(1400); C.mts.forEach((m, i) => { const h = m.userData.h, u = clamp(k * 1.5 - i * 0.05, 0, 1); m.position.y = FPSC.GROUND - h * (1 - u * u * (3 - 2 * u)); }); },
      lines: [[1.0, 'log', 'and there were mountains behind the headland, white to the top.', 'cp_m04_25'], [5.6, 'log', 'We have no mountains.', 'cp_m04_26']] },
    { d: 8, cam: [-14, -52, 2.2], to: [-10, -60, 6], look: [0, M4TY, 24], lookTo: [0, M4TY, 26], fade: [0, 1.6],
      f(t, k, C) { C.ice.scale.setScalar(1400); C.mts.forEach(m => { m.position.y = FPSC.GROUND; }); CPL.ov = { k: 1, ang: (t * 0.97 + 2.5) % 6.283 };
        C.lantern.visible = true; },
      enter() { try { if (!soundOff()) sfxBellFar(0, 0.5); } catch (e) {} } },
    { d: 7, card: { eye: '15 December 1887', t: 'The first of the six seas', sub: 'And she is still rowing out to the Gannet.' } },
  ] });
