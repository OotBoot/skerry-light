'use strict';
// The Chronicle of the Light, mission 13: The Fall of Wrackhaven (Winter 1891). The night the sea came up Fish Street
// and did not go back. Wrackhaven as the Lighthouse lays it out, the quay, Fish Street, the Square and the town hall,
// with the flood coming up through it and, for the last stand, the town hall's leads (src/cpm13x.js has the stages):
//   I.   Fish Street: knock up the houses and bring their people to the town hall, a line of them behind you, wading,
//        as the sea comes up the street after you.
//   II.  The Moot Hall: bar the hall's windows, then the Keelback comes up Fish Street and stoves in the great door.
//        Put it down, and get everyone up the stair.
//   III. The Belfry: hold the Council Chamber, the Belfry and the leads until first light, then ring the old bell for
//        the Light's boats, with a Diver come up onto the roof for it.
// Its cinematics are here: the intro, the doors shut on the flooded Square, the Keelback, the water up the stair and
// the leads, first light and the Diver, and the boats taking them off, with the last look back at the Light.
cpMission({ id: 'm13', act: 4, n: 'The Fall of Wrackhaven', when: 'Winter 1891', where: 'Wrackhaven',
  blurb: 'One night the sea comes up Fish Street and does not go back. Get the townsfolk to the town hall and hold the Belfry until dawn.',
  stages: ['cp_m13flood', 'cp_m13hall', 'cp_m13belfry'], intro: 'm13_intro', outro: 'm13_outro',
  cut: { 2: 'm13_leads' }, after: { 0: 'm13_shut', 1: 'm13_up' },
  music: { default: 'cpm13flood' }, lives: 2,
  stop() { c9NpcFreeAll(); c9SkyBack(); C13.saved = null; C13F.front = -44; C13F.max = 0.3; } });
// the townsfolk who speak (src/cpm13x.js C13P has them as people)
cpCast('chand', { n: 'The chandler', c: '#d8c09a' });
cpCast('wife', { n: 'A fishwife', c: '#e0a8a0' });
cpCast('smoke', { n: 'The smokehouse hand', c: '#c8b8a0' });
cpCast('cooper', { n: 'The cooper', c: '#d0b080' });
cpCast('pascoe', { n: 'Old Pascoe', c: '#a8c0d0' });
cpCast('school', { n: 'The schoolmaster', c: '#d8d8e8' });
cpCast('chap', { n: 'The chaplain', c: '#e8e4d8' });
cpCast('smith', { n: 'The smith', c: '#d89870' });
// the music it would have, and what plays until it's made (src/cp.js CP_MUSIC_FALL)
Object.assign(CP_MUSIC_FALL, { cpm13flood: 'raidcave', cpm13hall: 'cptense', cpm13keel: 'bosscrab', cpm13belfry: 'cpfight', cpm13bell: 'cpboss', cpm13dawn: 'gwwin', cpm13fall: 'cpsad' });
Object.assign(RM_LOOP, { cpm13fall: false });   // (the boats going, played once on into the end card)

// ---------- the cinematics ----------
// (where things are, local: the quay's edge, the foot of Fish Street, the great door, the leads, the far Light)
const C13K = { QY: -44, DOOR: [0, -9], F1: 4.4, F2: 8.8, LIGHT: [-70, -330, 37] };
// (a cinematic's own flood: set while it plays, put back after)
function c13cFlood(C, front, max) { if (C.fl == null) C.fl = [C13F.front, C13F.max]; C13F.front = front; C13F.max = max; c13WaterTick(); }
function c13cFloodBack(C) { if (C.fl) { C13F.front = C.fl[0]; C13F.max = C.fl[1]; c13WaterTick(); C.fl = null; } }
cpCineDef('m13_intro', { music: 'cpm13flood',
  b3(grp, C) { C.m = c9Fig(C13_MAYOR, 0.6, -40.4, 0, Math.PI); C.a = [-6, 5].map((x, i) => c9Act('walk', x, -52 - i * 1.6, -1.2, 0, 21 + i)); },
  exit(C) { cpkNpcFree(C.m); c9ActFree(C.a); c13cFloodBack(C); },
  shots: [
    cpTitleShot(CP_BY.m13),
    { d: 6.5, cam: [-14, -56, 5.5], to: [-6, -52, 3.4], look: C13K.LIGHT, lookTo: [0, -20, 4], fade: [1, 0],
      lines: [[0.5, 'log', 'Winter, 1891. The tide came into Wrackhaven at dusk, and at the turn it did not go out.', 'cp_m13_01']],
      sfx: [[0.2, 'sea', 0.6], [2.5, 'rain', 0.4]], enter(C) { c13cFlood(C, -38, 0.5); },
      f(t, k, C) { C.a.forEach((z, i) => { c9ActAt(z, [-6, 5][i], -52 - i * 1.6 + t * 0.9, -1.2 + Math.min(1.6, t * 0.5), 0, true); c9ActPose(z); }); } },
    { d: 5.5, cam: [2.4, -46.5, 1.7], to: [1.8, -45, 1.8], look: [0.6, -40.4, 1.6],
      lines: [[0.4, 'mayor', 'You came across from the Light. God bless you for it.', 'cp_m13_02'], [3.0, 'mayor', 'They are still in their houses. Knock them up and bring them to the hall.', 'cp_m13_03']],
      f(t, k, C) { c9FigPose(C.m); C.a.forEach(z => { if (z.mdl) z.mdl.root.visible = false; }); } },
    { d: 5.5, cam: [0, -40, 7], to: [0, -30, 9], look: [0, -12, 4], lookTo: [0, -4, 8], fade: [0, 0.6],
      lines: [[0.3, 'mayor', 'Fish Street first. The houses by the quay will be under before the hour is out.', 'cp_m13_04'], [3.4, 'log', 'Eight households, and the water already over the cobbles.', 'cp_m13_05']],
      sfx: [[0.6, 'splash', 0.4]], f(t, k, C) { c9FigPose(C.m, 0.6, -40.4 + t * 1.2, 0, 0, 1.2); } },
  ] });
cpCineDef('m13_shut', { music: 'cpm13hall',
  b3(grp, C) { C.a = [[-5, -18], [3, -20], [9, -15], [-12, -13]].map(([x, y], i) => c9Act(i & 1 ? 'jog' : 'walk', x, y, -1.6, 0, 31 + i)); },
  exit(C) { c9ActFree(C.a); c13cFloodBack(C); },
  shots: [
    { d: 5.4, cam: [0, -7.4, 2.0], to: [0, -6.4, 2.1], look: [0, -16, 1.0], fade: [0.6, 0], enter(C) { c13cFlood(C, 30, 0.9); },
      sfx: [[0.3, 'slam', 0.8], [1.4, 'moan', 0.5]], lines: [[0.4, 'mayor', 'Bar it. Every window too. They will come up out of that water for us.', 'cp_m13_06']],
      f(t, k, C) { C.a.forEach((z, i) => { const [x, y] = [[-5, -18], [3, -20], [9, -15], [-12, -13]][i], q = clamp((t - i * 0.6) / 2.4, 0, 1); c9ActAt(z, x, y + q * 1.2, -1.6 + 1.6 * q, 0, q > 0); c9ActPose(z); }); } },
    { d: 4.4, card: { eye: 'Wrackhaven, past midnight', t: 'The Moot Hall', sub: 'The Square is a sea. The town hall stands up out of it, and every soul left in the town is inside.' } },
  ] });
cpCineDef('m13_keel', { music: 'cpm13keel',
  b3(grp, C) { C.k = c9Act('crab', 0, -34, -1, 0, 9); },
  exit(C) { c9ActFree([C.k]); c13cFloodBack(C); },
  shots: [
    { d: 5, cam: [3.4, -20, 2.4], to: [2.6, -18, 2.6], look: [0, -32, 1.4], lookTo: [0, -26, 2.0], enter(C) { c13cFlood(C, 30, 0.9); },
      sfx: [[0.2, 'keelback', 0.9], [1.2, 'splash', 0.7], [2.6, 'splash', 0.6]], lines: [[0.6, 'mayor', 'Something in the street. Big as a boat, and coming.', 'cp_m13_29']],
      f(t, k, C) { c9ActAt(C.k, Math.sin(t * 1.3) * 0.6, -34 + t * 2.6, -1 + Math.min(1, t * 0.4), 0, true); c9ActPose(C.k); } },
    { d: 4.2, cam: [0.4, -1.6, 2.0], look: [0, -9, 1.8], shake: 0.5,
      sfx: [[0.6, 'slam', 1], [0.9, 'tear', 0.8], [1.6, 'bosscrab', 0.9]], lines: [[1.4, 'pascoe', 'The Keelback. A whole wreck walking. Keep out of its road.', 'cp_m13_30']],
      f(t, k, C) { c9ActAt(C.k, 0, -14 + Math.min(3, t * 2.2), 0, 0, true); c9ActPose(C.k); } },
  ] });
cpCineDef('m13_up', { music: 'cpm13belfry',
  b3(grp, C) { C.a = [[-6, -2], [3, -5], [7, 2]].map(([x, y], i) => c9Act('walk', x, y, -1.8, Math.PI * 0.8, 51 + i)); },
  exit(C) { c9ActFree(C.a); c13cFloodBack(C); },
  shots: [
    { d: 4.4, card: { eye: 'Near four in the morning', t: 'The water came up the stair after them', sub: 'The Moot Hall went under to its windowsills. What was left of Wrackhaven was on the floors above it.' } },
    { d: 5, cam: [-8.6, 5.6, C13K.F1 + 1.8], to: [-8.4, 3.4, C13K.F1 + 1.6], look: [0, -2, 0.6], enter(C) { c13cFlood(C, 80, 3.7); },
      sfx: [[0.3, 'moan', 0.6], [1.8, 'splash', 0.5]], lines: [[0.4, 'school', 'They are standing in the hall. Under the water, standing in rows, like a congregation.', 'cp_m13_35']],
      f(t, k, C) { C.a.forEach((z, i) => { const [x, y] = [[-6, -2], [3, -5], [7, 2]][i]; c9ActAt(z, x - t * 0.3, y + t * 0.2, -1.8 + Math.min(0.9, t * 0.3), Math.PI * 0.8, true); c9ActPose(z); }); } },
  ] });
cpCineDef('m13_leads', { music: 'cpm13belfry', shots: [
  { d: 5.6, cam: [2.6, 6.2, C13K.F2 + 1.8], to: [-2, -2, C13K.F2 + 3.2], look: [0, -40, 1.5], lookTo: C13K.LIGHT, fade: [0.6, 0.4],
    sfx: [[0.2, 'wind', 0.6], [1.8, 'rain', 0.4]], lines: [[0.5, 'mayor', 'The leads are open. Up there you will see them come, and see the Light.', 'cp_m13_39']] },
] });
cpCineDef('m13_dawn', { music: 'cpm13bell',
  b3(grp, C) { C.d = c9Act('diver', -11.6, 10.5, C13K.F2 - 3, Math.PI / 2, 13); },
  exit(C) { c9ActFree([C.d]); },
  shots: [
    { d: 5, cam: [3.6, -6.6, C13K.F2 + 2.2], to: [1.6, -7.6, C13K.F2 + 2.6], look: C13K.LIGHT, fade: [0.5, 0], sfx: [[0.3, 'gull', 0.4], [1.4, 'wind', 0.4]],
      lines: [[0.4, 'school', 'There. Grey over the harbour. It is first light.', 'cp_m13_40'], [2.9, 'mayor', 'Ring the bell! Ring it, so the Light knows we are alive!', 'cp_m13_41']] },
    { d: 4.8, cam: [-5.2, 7.2, C13K.F2 + 1.4], look: [-10.8, 10.5, C13K.F2 + 1.6], shake: 0.15,
      sfx: [[0.3, 'splash', 0.6], [0.8, 'bossdiver', 0.9]], lines: [[1.6, 'pascoe', 'Up the wall, the old salvage diver. The bell has woken him.', 'cp_m13_42']],
      f(t, k, C) { const q = clamp(t / 3, 0, 1); c9ActAt(C.d, -11.6 + q * 1.6, 10.5, C13K.F2 - 3 + 3 * Math.min(1, q * 1.2), Math.PI / 2, false); c9ActPose(C.d); } },
  ] });
// (the outro's boats: a hull, two oarsmen's shapes and a lantern, rowed in from the Light)
function c13Boat(grp) {
  const g = new THREE.Group(), M = c => new THREE.MeshLambertMaterial({ color: c });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 4.6), M(0x2a2420)); hull.position.y = 0.2; g.add(hull);
  for (const z of [-1.8, 1.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), M(0x2a2420)); p.position.set(0, 0.2, z * 1.12); p.rotation.y = Math.PI / 4; p.scale.set(0.8, 1, 0.8); g.add(p); }
  for (const z of [-0.6, 0.7]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.4), M(0x3a3a44)); m.position.set(0, 0.8, z); g.add(m); }
  const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,214,140,0.95)', 'rgba(255,200,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  l.scale.setScalar(2.2); l.position.set(0, 1.4, 2.0); g.add(l);
  grp.add(g); return g;
}
cpCineDef('m13_outro', { music: 'cpm13fall',
  b3(grp, C) {
    C.b = [0, 1, 2].map(() => c13Boat(grp));
    C.a = [[-4, -24], [2, -28], [6, -20], [-2, -14], [10, -6], [-9, 2]].map(([x, y], i) => c9Act(i % 3 ? 'walk' : 'jog', x, y, -0.4, Math.random() * 6, 71 + i));
  },
  exit(C) { c9ActFree(C.a); c13cFloodBack(C); },
  shots: [
    { d: 6, cam: [0.4, -36, 3.4], to: [0, -27, 4.0], look: [0, -8, 2.4], fade: [0.8, 0], enter(C) { c13cFlood(C, 80, 1.5); }, sfx: [[0.2, 'sea', 0.5], [2.4, 'gull', 0.4]],
      lines: [[0.5, 'log', 'Dawn. The boats from the Light came in across the Square, over the tops of the market stalls.', 'cp_m13_43']],
      f(t, k, C) {
        C.b.forEach((b, i) => { const [x, y] = c9L(-3 + i * 3, -19 + t * 1.0 - i * 2.6); b.position.copy(z3v(x, y, FPSC.GROUND + 1.55)); b.rotation.y = Math.sin(t + i) * 0.05; });
        C.a.forEach((z, i) => { const [x, y] = [[-4, -24], [2, -28], [6, -20], [-2, -14], [10, -6], [-9, 2]][i]; c9ActAt(z, x + Math.sin(t * 0.4 + i) * 0.8, y + Math.cos(t * 0.3 + i), -0.4, null, true); c9ActPose(z); });
      } },
    { d: 5.4, cam: [-6, -6.4, C13K.F2 + 2.0], to: [-3, -7.2, C13K.F2 + 1.8], look: [0, -14, 1.2],
      lines: [[0.4, 'mayor', 'Look at it once. Then do not look again. It is theirs now.', 'cp_m13_44']],
      f(t, k, C) { C.b.forEach((b, i) => { const [x, y] = c9L(-4 + i * 4, -13.5 - i * 0.6); b.position.copy(z3v(x, y, FPSC.GROUND + 1.55)); b.rotation.y = 0.1 * i; }); C.a.forEach((z, i) => { c9ActAt(z, z.x - FPSC.CX, z.y - FPSC.CY + 0.01, -0.4, null, true); c9ActPose(z); }); } },
    { d: 7, cam: [1.5, -54, 3.2], to: [0, -58, 3.0], look: [0, -20, 4], lookTo: C13K.LIGHT, fade: [0, 0.8], sfx: [[0.6, 'sea', 0.5]],
      lines: [[0.6, 'log', 'Out past the quay we looked back. And across the harbour the Light was still lit.', 'cp_m13_45']],
      f(t, k, C) { C.b.forEach((b, i) => { const [x, y] = c9L(-3 + i * 3.4, -62 - t * 1.2 - i * 2.5); b.position.copy(z3v(x, y, FPSC.GROUND + 1.55)); b.rotation.y = Math.PI + Math.sin(t + i) * 0.05; }); C.a.forEach(z => { if (z.mdl) z.mdl.root.visible = false; }); } },
    { d: 5, card: { eye: 'Mission complete', t: 'The Fall of Wrackhaven', sub: 'The sea came up Fish Street one night and did not go back. The drowned live there now.' } },
  ] });
