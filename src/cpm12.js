'use strict';
// The Chronicle of the Light, mission 12: Maren's End (the Dry Night, 1890). The raid of that name tells it down the
// Long Pier, the Swallow's throat, the Deep Path, the Black Water and up into the fort; this tells the same night
// another way, by the ways the raid never went:
//  I.   The Dry Bed (cp_m12bed, src/cpm12b.js): from the foot of Skerry Light's rock, now a pillar standing out of the
//       drained bed, across the salt to the Swallow, round its south side and up its east, among the wrecks the sea
//       left bare. The last of the water is still running down three runnels into the hole, in surges; and Maren
//       stands at the rim by the wreck lodged in the Swallow's lip, the only way down that isn't a fall. Lead won't
//       touch her: ring the bells of three wrecks on the bed and she's driven back over the hole, and down (a
//       cutscene). Then down the lodged wreck's mast.
//  II.  The Old Drain (cp_m12drain, src/cpm12d.js): partway down, the water found an older way: a Spanish drain
//       under the bed, running to the fort's cistern. Dark, and the dark drains you; one of you carries Maren's
//       Lantern, which lights the braziers and keeps the dark off whoever's near it. The cistern's grate opens to its
//       nine lamps all lit together (a puzzle: each lamp turned turns its neighbours). The lantern won't pass the grate
//       (as the lore has it): it's left on the ledge (a cutscene), still burning.
//  III. Maren's End (cp_m12end, src/cpm12m.js): out of the drain's mouth at the foot of the fort's sea wall, on the
//       bed where the sea used to break, under the Sea Battery's guns and the chains of the hanged. Maren comes up out
//       of the last pool (a cutscene) and is fought in three ways: the wrecks' bells break her ward while she's near
//       them; the tide turns (a cutscene) and the sea floods back over the bed in surges, her soul rising out of
//       them to be shot while you keep to high ground; and at the last, all three bells rung together hold her open.
//       She's laid to rest (a cutscene) and the sea comes back over the bed. And yet (the outro): a woman, standing on
//       the water when the lamp turns.
// This file: the mission, its people, the music's fallbacks, what the stages share (the bed's look, the bell, the
// Light on its rock, Maren as an actor in a cinematic, the returning water) and the intro and outro. Lines are
// cp_m12_01 onwards (the sound notes: campaign-sound/m12.md).

cpCast('ruth', { n: 'Ruth Carrow', c: '#d8c8a8' });
Object.assign(CP_MUSIC_FALL, { cpm12bed: 'raidpier', cpm12drain: 'raidcave', cpm12maren: 'raidmaren', cpm12tide: 'raidmaren2', cpm12cine: 'cpsad', cpm12rest: 'raidwin' });

cpMission({ id: 'm12', act: 4, n: "Maren's End", when: 'The Dry Night, 1890', where: 'The dry bed of the sea, and the fort on the headland',
  blurb: "The sea drains away down the Swallow. Cross the bed with Maren's lantern, go down by the wreck in its lip, and up the old drain to the fort, where she is waiting.",
  stages: ['cp_m12bed', 'cp_m12drain', 'cp_m12end'],
  intro: 'm12_intro', outro: 'm12_outro', cut: { 1: 'm12_drain', 2: 'm12_rise' }, after: { 0: 'm12_down' },
  music: { default: 'cpm12bed' }, lives: 1,
  begin() { C12.seaK = 0; C12.lanLeft = false; },
  stop() { if (typeof RF !== 'undefined') RF.vul = 0; if (typeof GL3D !== 'undefined' && GL3D.sea) GL3D.sea.visible = true; },
});
// the mission's own, across its stages: how far the sea has come back (0 to 1, the last stage's end), the lantern left
var C12 = { seaK: 0, lanLeft: false };
const c12N = () => Math.max(1, (ZM.hum || []).length);
const c12W = (x, y) => [FPSC.CX + x, FPSC.CY + y];
const c12Able = () => { const m = FPS.me; return !(m.dead > 0) && !zmIsDown() && !ZM.over; };
const c12Nick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
const c12Mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const c12Hold = () => !!(FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse);

// ---------- the dry bed's look (stages I and III lay themselves out on it: src/raid.js FPI_GEN.raid's way) ----------
// Flat, cracked salt the colour of old bone, darker where it's still wet; no beach, no sea under it (the stage hides
// the sea while it's gone: c12Sea); the fog close and blue-black.
FPS_ISLES.cpm12bed = Object.assign({}, FPS_ISLES.quay, { name: 'the Dry Bed', ground: '#8a8272', ground2: '#6e675a', wet: '#4a463e', path: '#968e7e', tint: 0.22, mound: 0, dune: 0.015,
  rocks: [0, 3, 6, 1], wrecks: [0], tintRock: null, sky: '70,78,104', skyA: 0.06, fog: ['#090b10', 40, 330], mist: '46,52,66', mistA: 0.1,
  birds: ['bat', 2], tufts: ['#4a4a38', 0], pebbles: 80, pools: 0, wrack: 40, arena: false, indoor: false, nLights: 8 });
FPI_GEN.cpm12bed = FPI_GEN.raid;
// (the fort's: the Lighthouse's look, as src/raidfort.js has it, with the bed south of the sea wall dry)
FPS_ISLES.cpm12fort = Object.assign({}, FPS_ISLES.fort || FPS_ISLES.cpm12bed, { name: 'Maren’s End', mound: 0, dune: 0.01, tufts: ['#4a4a38', 0], fog: ['#080a10', 50, 360], pools: 0, wrack: 30, rocks: [0, 3, 6, 1], wrecks: [0] });
FPI_GEN.cpm12fort = FPI_GEN.raid;

// (every screen, each frame of a stage on the bed) the sea is gone: hidden, as the Gannet's cabin hides it
function c12Sea(on) { if (typeof GL3D !== 'undefined' && GL3D.sea && GL3D.sea.visible !== on) GL3D.sea.visible = on; }

// ---------- props the stages share ----------
// what lies on the bed out past the island's edge, sheet after sheet into the haze (so the hidden sea never shows a
// hole); r: where to begin
FPI_K.c12far = {
  noShadow: true,
  b3(p, A) {
    const R = seeded(p.sd || 7), r0 = p.r || 96, at = (x, y, a) => A.at(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND, a || 0);
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      const x = i * 90, y = j * 90; if (Math.hypot(x, y) < r0 - 50) continue;
      at(x, y, 0); A.box(['#7e7768', '#867e6e', '#787062'][(i * 7 + j * 3 + 33) % 3], 0, 0, -0.62, 92, 92, 0.55);
    }
    // hulks and boulders out in the haze
    for (let i = 0; i < 26; i++) { const a = R() * 6.283, d = r0 + 10 + R() * 220, x = Math.cos(a) * d, y = Math.sin(a) * d; at(x, y, R() * 6.28); if (R() < 0.35) { A.box('#3a2e24', 0, 0, -0.2, 10 + R() * 12, 0.6, 0.6); for (let u = -4; u <= 4; u += 1.6) A.box('#463628', u, 0.8, 0, 0.25, 0.25, 2.6, 0, 0.5, 0); } else A.box(['#5a554c', '#4e4a42'][(R() * 2) | 0], 0, 0, -0.3, 2 + R() * 5, 2 + R() * 4, 1 + R() * 3); }
  },
};
// salt pans and cracks in the bed, and the odd pool left behind, over a region [x0, x1, y0, y1] (skip: [x, y, r] list)
FPI_K.c12salt = {
  noShadow: true,
  b3(p, A) {
    const R = seeded(p.sd || 3), [x0, x1, y0, y1] = p.r, skip = p.skip || [], at = (x, y, a) => A.at(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND, a || 0);
    for (let i = 0; i < (p.n || 80); i++) {
      const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0); if (skip.some(s => Math.hypot(x - s[0], y - s[1]) < s[2])) continue;
      at(x, y, R() * 3.14); const k = R();
      if (k < 0.45) A.box('#c8c2b2', 0, 0, 0.0, 3 + R() * 8, 2 + R() * 6, 0.05);
      else if (k < 0.6) A.box('#2e3a40', 0, 0, 0.0, 2 + R() * 5, 1.5 + R() * 4, 0.04);
      else for (let j = 0, cx = 0, cy = 0, a = R() * 6.28; j < 5; j++) { const l = 2 + R() * 4; A.box('#4a463e', cx + Math.cos(a) * l / 2, cy + Math.sin(a) * l / 2, 0.0, l, 0.12, 0.05, -a); cx += Math.cos(a) * l; cy += Math.sin(a) * l; a += (R() - 0.5) * 1.4; }
    }
  },
};
// a wreck the sea left bare: a keel heeled over in the salt, ribs, a few strakes, a stump of mast; with its deck a
// stand of planking (high ground: you can stand on it, deck high), L long
FPI_K.c12hulk = {
  col: '#3a2e24',
  sol(p) { const L = p.L || 14, o = [fpiBox(p, 0, 0, L / 2, 0.5, 1.0)]; if (p.deck) o.push(fpiBox(p, 0, -1.6, L * 0.32, 1.2, p.deck, { fl: true })); return o; },
  b3(p, A) {
    const L = p.L || 14, R = seeded(p.sd || 5), lean = 0.5;
    A.box('#3a2e24', 0, 0, -0.2, L, 0.5, 0.6);
    for (let u = -L / 2 + 1; u < L / 2 - 1; u += 1.3) { const k = 1 - Math.pow(Math.abs(u) / (L / 2), 2) * 0.6; A.box('#463628', u, 0.9 * k, 0, 0.25, 0.25, 3.2 * k, 0, lean, 0); A.box('#463628', u, -0.9 * k, 0, 0.25, 0.25, 2.6 * k, 0, -lean * 0.6, 0); }
    for (let j = 0; j < 4; j++) A.box('#53402e', (R() - 0.5) * 2, 1.2 + j * 0.5, 0.3 + j * 0.6, L * (0.4 + R() * 0.4), 0.12, 0.35, 0, lean, 0);
    if (p.deck) { A.box('#5a4632', 0, -1.6, p.deck - 0.18, L * 0.64, 2.4, 0.18); for (let u = -L * 0.3; u < L * 0.3; u += 1.6) A.box('#3a2e22', u, -1.6, -0.1, 0.22, 0.22, p.deck); }
    A.box('#3e3024', L * 0.18, 0.3, 0, 0.32, 0.32, 5.5, 0, 0.35, 0);
  },
};
// a ship's bell the sea left hanging: on a stump of mast or a davit, a frame and the bell in it (it swings in 3D when
// rung: c12Bell3)
FPI_K.c12bellpost = {
  col: '#3a2e24',
  sol(p) { return [fpiCirc(p, 0, 0, 0.3, 3.4)]; },
  b3(p, A) { A.box('#3a2e24', 0, 0, -0.2, 0.34, 0.34, 3.6); A.box('#3a2e24', 0.55, 0, 3.2, 1.3, 0.22, 0.22); A.box('#2a2a2a', 1.0, 0, 2.95, 0.06, 0.06, 0.3); },
};
// the Light on its skerry: since the sea went, a pillar of black rock standing out of the bed, the white tower with
// its red band on top, lit (its beam is drawn turning: c12Beam). r: the rock's reach
FPI_K.c12light = {
  col: '#3a3833',
  sol(p) { return [fpiCirc(p, 0, 0, (p.r || 14) * 0.9, 16)]; },
  b3(p, A) {
    const r = p.r || 14, R = seeded(11);
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, rr = r * (0.75 + R() * 0.3); A.box(['#3a3833', '#2e2c28', '#45423b'][i % 3], Math.cos(a) * rr * 0.6, Math.sin(a) * rr * 0.6, -0.4, r * 0.7, r * 0.6, 12 + R() * 5, a); }
    A.box('#3a3833', 0, 0, -0.4, r * 1.3, r * 1.2, 15); A.box('#44413a', 0, 0, 14.6, r * 0.9, r * 0.8, 1.6);
    // weed and barnacles where the sea was, a dark band to the old waterline
    A.box('#1e2a20', 0, 0, -0.3, r * 1.36, r * 1.26, 3.2);
    // the tower, its gallery, the lantern room
    A.cyl('#d8d4c8', 0, 0, 16, 2.6, 22); A.cyl('#a8382c', 0, 0, 26, 2.65, 3); A.cyl('#2a2a2a', 0, 0, 38, 3.3, 0.4);
    A.cyl('#1c1c1c', 0, 0, 38.4, 2.1, 3.2); A.glow('#ffe8b0', 0, 0, 40, 3.0); A.cyl('#2a2a2a', 0, 0, 41.6, 2.4, 0.6);
    // the landing stage, high and dry, and its ladder down the rock
    A.box('#4a3a2a', r * 0.62, -r * 0.3, 12, 3, 4, 0.3); for (let z = 1; z < 12; z += 0.7) A.box('#2a2622', r * 0.7, -r * 0.3 - 1.4, z, 0.08, 0.08, 0.08);
  },
};

// ---------- the bell, rung (every screen, as the host says) ----------
// B: { x, y } (world); the sound from where it hangs, the bed shaking a little near it, and a ring in the air
function c12BellFx(x, y) {
  const d = Math.hypot(x - FPS.me.x, y - FPS.me.y);
  try { if (d < 14) sfxBell(); else if (typeof fpsBellSound === 'function') fpsBellSound(d, bearingOf(x - FPS.me.x, y - FPS.me.y) - FPS.me.h); } catch (e) {}
  for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; fpsPuff(x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4, FPSC.GROUND + 3 + Math.random() * 0.4, '255,230,170', 2); }
}
// (hosting) a rung bell sinks the drowned near it (src/lore.js: the bell)
function c12BellSinks(x, y, r) { let n = 0; for (const z of ZM.z) if (!z.dead && !z.boss && Math.hypot(z.x - x, z.y - y) < r) { zmKill(z, false, 0, 'bell', ''); n++; } return n; }
// a bell's 3D: the bell itself, hung from its frame, swinging when it's rung (w: the world place; the frame is the prop)
function c12Bell3(grp, x, y, a) {
  const g0 = new THREE.Group(); g0.position.copy(z3v(x + Math.cos(a) * 1.0, y + Math.sin(a) * 1.0, FPSC.GROUND + 3.1)); grp.add(g0);
  const m = new THREE.MeshPhongMaterial({ color: 0x9a7a3a, specular: 0x6a5a30, shininess: 60 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.62, 12, 1, true), m); b.position.y = -0.4; g0.add(b);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, 6.283, 0, 1.6), m); top.position.y = -0.1; g0.add(top);
  return { g: g0, sw: 0 };
}

// ---------- Maren as an actor (cinematics): her model from src/raidfort.js, posed where it's put ----------
function c12MarenActor(grp, x, y, h) {
  try { const M = rfBuildMaren(); grp.add(M.root); const z = { x, y, jz: 0, h: h || 0, seed: 1.3, ph: 0, act: null, at: 0 }; return { M, z }; } catch (e) { console.warn('c12 maren', e); return null; }
}
function c12MarenPose(A, dt, o) { if (!A) return; Object.assign(A.z, o || {}); try { rfPoseMaren(A.z, A.M, dt || 0.016); } catch (e) {} }

// ---------- the water: the sea going out (the intro) and coming back (stage III's end) ----------
// a great flat sheet of sea at height h (above the ground), drawn over everything beneath it
function c12Water(grp) {
  const mat = new THREE.MeshPhongMaterial({ color: 0x0e2230, specular: 0x4a6a80, shininess: 50, transparent: true, opacity: 0.86, depthWrite: true });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 1, 1), mat); w.rotation.x = -Math.PI / 2; grp.add(w);
  const foam = new THREE.Mesh(new THREE.RingGeometry(0, 1, 48, 1), new THREE.MeshBasicMaterial({ color: 0xcfe0e8, transparent: true, opacity: 0, depthWrite: false })); foam.rotation.x = -Math.PI / 2; grp.add(foam);
  return { w, foam, mat };
}
function c12WaterAt(W, cx, cy, h) { if (!W) return; W.w.position.copy(z3v(cx, cy, FPSC.GROUND + h)); W.w.visible = h > -0.6; }

// ---------- the intro: the sea goes out, and the keeper gives up the lantern ----------
// (on the bed as stage I lays it out: the Light's rock to the south-west, the Swallow north of the middle)
cpCineDef('m12_intro', { music: 'cpm12cine',
  b3(grp, C) {
    C.W = c12Water(grp);
    C.holm = cpkNpc(['#2a3442', '#d8d0bc', '#8a7a5a', '#ffd88a']);
  },
  exit(C) { cpkNpcFree(C.holm); C.holm = null; },
  shots: [
    cpTitleShot(CP_BY.m12),
    { d: 4.8, card: { eye: 'The fourth of March, 1890', t: 'The Dry Night', sub: 'Three years after the Gannet, the sea round the Light went out, and did not come in again.' },
      lines: [[0.6, 'log', 'At the turn of the tide it went on going out. By midnight there was no sea at all.', 'cp_m12_01']] },
    { d: 7, cam: [-40, -40, 26], to: [-20, -10, 20], look: [0, 40, 0], lookTo: [0, 44, -2], fade: [1, 0],
      f(t, k, C) { c12Sea(false); const h = 2.4 - 3.2 * Math.min(1, k * 1.15); c12WaterAt(C.W, FPSC.CX, FPSC.CY, h); },
      lines: [[0.5, 'log', 'It ran north across the bed faster than a horse could gallop, and down a hole that had not been there the night before.', 'cp_m12_02']], sfx: [[0.2, 'sea', 0.9], [2.5, 'wind', 0.6]] },
    { d: 6.5, cam: [-30, -67, 2.2], to: [-31.2, -68.6, 2.0], look: [-35, -74, 1.6],
      f(t, k, C) { c12Sea(false); c12WaterAt(C.W, 0, 0, -9); if (C.holm) { const [x, y] = c12W(-35, -74); cpkNpcPose(C.holm, { x, y, h: bearingOf(5, 7), lan: true, noGun: true, p: 0.1 }); } },
      lines: [[0.3, 'holm', 'She rowed out with this. The skiff came back without her, and it was still lit.', 'cp_m12_03'], [3.6, 'holm', 'It has not gone out since. Take it down after the water.', 'cp_m12_04']] },
    { d: 5.5, cam: [-36, -78, 4.5], to: [-33, -72, 6], look: [0, 38, 1], lookTo: [6, 46, 0],
      f(t, k, C) { c12Sea(false); if (C.holm) { const [x, y] = c12W(-35, -74); cpkNpcPose(C.holm, { x, y, h: bearingOf(5, 7), lan: false, noGun: true }); } },
      lines: [[0.3, 'holm', 'Mind the runnels. The last of the sea is still going down them, and it goes in a rush.', 'cp_m12_05']] },
  ] });

// ---------- the outro: the sea back, the fort renamed, and the woman on the water ----------
// (at the foot of the sea wall, stage III's world, with the sea come back over it: C12.seaK 1)
cpCineDef('m12_outro', { music: 'cpm12rest',
  b3(grp, C) { C.mar = c12MarenActor(grp, 30, -150, Math.PI); },
  shots: [
    { d: 6, cam: [0, -70, 2.4], to: [0, -58, 3.2], look: [0, -22, 6], lookTo: [0, -20, 8], fade: [0.8, 0],
      f(t, k, C) { if (C.mar) C.mar.M.root.visible = false; },
      lines: [[0.4, 'log', 'The sea came back before morning, quietly, as if it had only stepped out.', 'cp_m12_06'], [3.4, 'log', 'The fort on the headland has been called Maren’s End ever since.', 'cp_m12_07']] },
    { d: 7, cam: [-6, -40, 4], to: [-4, -46, 3.4], look: [30, -150, 4], lookTo: [30, -150, 5],
      f(t, k, C) { if (C.mar) { C.mar.M.root.visible = true; c12MarenPose(C.mar, 0.016, { x: FPSC.CX + 30, y: FPSC.CY - 150, jz: (C12.seaK || 1) * 2.6 - 0.2, h: Math.PI * 0.96 }); } },
      lines: [[0.5, 'ruth', 'There. Out on the water, when the lamp turns.', 'cp_m12_08'], [3.2, 'log', 'Whether they ended her, or only one of her, is the oldest argument in Wrackhaven’s inn.', 'cp_m12_09']] },
    { d: 5, card: { eye: 'Mission complete', t: 'Maren’s End', sub: 'The Dry Night, 1890. The sea came back, and so, some say, did she.' },
      lines: [[0.5, 'log', 'She is still seen, on every sea, a little nearer every time.', 'cp_m12_10']] },
  ] });
