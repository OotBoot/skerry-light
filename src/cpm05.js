'use strict';
// The Chronicle of the Light, mission 5: The Wren Comes In (2 and 9 January 1888). The week the shark came: first
// on foot on the strand across the water from the Light, the morning he walked up out of the surf in the Gannet's
// cabin boy's blue shoes; then a week on, at night, aboard the schooner Wren as she comes in through the skerries
// with him walking ahead of her on the water, and the voyages of 1888 begin.
//  I.   The Strand (cp_m05sand, src/cpm05a.js): 2 January, dawn, under a red sky, the rocks in the bay warm. Follow
//       the blue prints along the tide line to where he stands looking up at the Light; then hold the strand, with
//       the old fog bell there, until the sun is up.
//  II.  The Outer Skerries (cp_m05outer, src/cpm05b.js): 9 January, night. Crew the Wren (the keeper's cutter's
//       deck, dressed as a schooner: a foremast, her foresail, her name on the transom) on the FPS engine's sail
//       (src/gwsail.js through GWS_LEG), on a sea of this mission's own: the warm green water of that night, its
//       rocks thick either side of the one channel Plimsoll walks. Keep up with him and you're covered; the bow
//       lantern shows the rocks close ahead to whoever stands lookout there; at the Hulks he goes under and you're
//       on your own with the bell till he's up again; out through the Gate.
//  III. The Inner Skerries (cp_m05inner): past the Gate to the harbour, palms on the cliffs, and in the last reach
//       he walks on ahead to the pier while Maren comes on and the drowned climb every rail. Make the harbour.
// Cinematics: the intro (the strand at dawn), Plimsoll on the sand (in Part I), the Wren at sea (Part II's start),
// Plimsoll going under (Part II), the palms (Part III's start), Maren in the last reach (Part III), and the outro.
// Lines: cp_m05_01 on (the table in campaign-sound/m05.md).

cpCast('wren', { n: 'The Wren’s Master', c: '#c8d8a0' });
cpCast('hand', { n: 'A Hand off the Wren', c: '#d8c8a8' });
CP_MUSIC_FALL.cpm05dawn = 'cpsad';   // (the strand at dawn: its own, till it's recorded)
CP_MUSIC_FALL.cpm05sail = 'gwsail';  // (the Wren coming in)
CP_MUSIC_FALL.cpm05last = 'gwsail';  // (the last reach)
const CPM5 = { biome0: null };
// (the night's sea: the 2 January sky red over the headland, the 9 January water warm and green; put back after)
function cpm5Biome(id) {
  if (typeof g === 'undefined' || !g) return;
  if (CPM5.biome0 === null) CPM5.biome0 = g.biome || 'skerry';
  g.biome = id;
}
function cpm5BiomeBack() { if (typeof g !== 'undefined' && g && CPM5.biome0 !== null) g.biome = CPM5.biome0; CPM5.biome0 = null; }

cpMission({ id: 'm05', act: 3, n: 'The Wren Comes In', when: '9 January 1888', where: 'The Skerries',
  blurb: 'A boy in blue shoes walks ahead through the deep water. Sail the Wren in behind Plimsoll, with Maren coming nearer every turn of the lamp.',
  stages: ['cp_m05sand', 'cp_m05outer', 'cp_m05inner'], intro: 'm05_intro', outro: 'm05_outro',
  cut: { 1: 'm05_wren', 2: 'm05_palms' }, music: { default: 'cpm05sail' }, lives: 1,
  begin() { CPM5.biome0 = null; },
  stop() { cpm5BiomeBack(); if (typeof GWS_LEG !== 'undefined' && GWS_LEG && /^cpm05/.test(GWS_LEG.key || '')) GWS_LEG = null; } });

// ---------- actors ----------
// Plimsoll on foot: his picture standing upright (it faces left: flipped to face right), his shoes glowing blue
function cpm5PlimActor(grp, tall, flip) {
  const P = new THREE.Group(); grp.add(P);
  const tex = typeof gwsImgTex === 'function' && typeof IMG !== 'undefined' ? gwsImgTex(IMG.plim, false, !!flip) : null;
  const asp = typeof SK !== 'undefined' && SK.PLIM_ASPECT || 0.6;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: tex ? 0xffffff : 0x3a5a7a, transparent: true, depthWrite: false }));
  sp.scale.set(tall * asp, tall, 1); sp.position.y = tall / 2; P.add(sp);
  const soft = z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const glow = (c, s, o) => { const g0 = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o == null ? 0.8 : o })); g0.scale.setScalar(s); P.add(g0); return g0; };
  const shoes = [glow(0x6ed7ff, 0.6), glow(0x6ed7ff, 0.6)]; shoes.forEach((s, i) => s.position.set(i ? 0.22 : -0.22, 0.08, 0));
  const halo = glow(0x5fd3ff, tall * 1.6, 0.16); halo.position.y = tall * 0.5;
  return { P, sp, shoes, halo };
}
// Maren, standing on the water: her picture, pale as moonlight, and a cold glow
function cpm5MarenActor(grp, tall) {
  const P = new THREE.Group(); grp.add(P);
  const tex = typeof gwsImgTex === 'function' && typeof IMG !== 'undefined' ? gwsImgTex(IMG.maren, true) : null;
  const asp = typeof SK !== 'undefined' && SK.MAREN_ASPECT || 0.5;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: tex ? 0xffffff : 0x9fb8d8, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
  sp.scale.set(tall * asp, tall, 1); sp.position.y = tall / 2; P.add(sp);
  const g0 = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'), color: 0xc8dcff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3, fog: false }));
  g0.scale.setScalar(tall * 2); g0.position.y = tall / 2; P.add(g0);
  return { P, sp, g0 };
}
// (a sail stage, frozen for a cinematic) a point of the sea's, into deck coordinates about the island's middle
function cpm5SeaL(sx, sy) {
  const S = RAID.st, V = S && (S.V || S.B); if (!V) return [0, 0];
  const c = Math.cos(V.h), s = Math.sin(V.h), dx = sx - V.x, dy = sy - V.y;
  return [dx * c - dy * s, dx * s + dy * c];
}

// ---------- the cinematics ----------
// the opening: the strand at dawn, the sky red, the keeper down at the tide line with his lantern
cpCineDef('m05_intro', {
  music: 'cpm05dawn',
  b3(grp, C) {
    C.holm = cpkNpc(['#1e2436', '#d8d0bc', '#8a7a4a', '#ffd88a']);
    C.prints = CPM5S.PRINTS.slice(0, 3);
  },
  exit(C) { cpkNpcFree(C.holm); },
  shots: [
    cpTitleShot(CP_BY.m05),
    { d: 4.2, card: { eye: 'The keeper’s log', t: '2 January 1888', sub: 'Dawn, on the strand across the water from the Light' } },
    { d: 6.5, cam: [40, -60, 14], to: [18, -30, 6], look: [-6, 10, 1], lookTo: [-10, 30, 1.5], fade: [1, 0],
      lines: [[0.4, 'log', 'All night the sky over the headland had been red, as if the hills were burning.', 'cp_m05_01']] },
    { d: 5.5, cam: [-4, 30, 2.4], to: [-8, 34, 2.0], look: [-14, 40, 1.6],
      f(t, k, C) { const [x, y] = cpkW(-13, 40); cpkNpcPose(C.holm, { x, y, h: 2.6, lan: true }); },
      lines: [[0.3, 'holm', 'The rocks in the bay are warm to the touch. In January.', 'cp_m05_02']] },
    { d: 6, cam: [-30, 30, 3.2], to: [-34, 16, 2.4], look: [-38, 22, 0], lookTo: [-34, 6, 0],
      f(t, k, C) { const [x, y] = cpkW(-13, 40); cpkNpcPose(C.holm, { x, y, h: 2.6, lan: true }); },
      lines: [[0.3, 'holm', 'Something came up out of the surf in the night. Small prints. Shoes.', 'cp_m05_03'], [3.4, 'holm', 'Follow them along the tide line, and keep your irons ready.', 'cp_m05_04']] },
  ],
});
// Plimsoll on the sand, looking up at the Light; then back into the sea, and the surf boiling after him
cpCineDef('m05_plim', {
  music: 'cpm05dawn',
  b3(grp, C) {
    const [px, py] = cpkW(...CPM5S.PLIM);
    C.p = cpm5PlimActor(grp, 2.7, false); C.p.P.position.copy(z3v(px, py, FPSC.GROUND));
    C.x0 = px; C.y0 = py;
  },
  shots: [
    { d: 5.5, cam: [0, -28, 4.6], to: [4, -35, 3.4], look: [12, -50, 1.6], lookTo: [16, -62, 1.2], fade: [0.6, 0],
      lines: [[0.3, 'log', 'A shark walked up out of the surf at dawn, wearing the blue shoes of the Gannet’s cabin boy.', 'cp_m05_05']] },
    { d: 5, cam: [4, -50, 1.4], to: [6, -51, 1.5], look: [10, -46, 2.0],
      f(t, k, C) { C.p.sp.material.rotation = Math.sin(t * 1.3) * 0.03; C.p.shoes.forEach((s, i) => s.material.opacity = 0.7 + 0.3 * Math.sin(t * 4 + i)); },
      lines: [[0.6, 'holm', 'Blue shoes. The Gannet’s boy went down in blue shoes.', 'cp_m05_06']] },
    { d: 6.5, cam: [2, -30, 3.0], to: [6, -34, 3.4], look: [10, -48, 1.2], lookTo: [16, -62, 0.4],
      f(t, k, C) { const e = Math.min(1, t / 5.5), x = C.x0 + 6 * e, y = C.y0 - 16 * e, sink = Math.max(0, e - 0.45) * 2.4; C.p.P.position.copy(z3v(x, y, FPSC.GROUND - sink)); C.p.sp.material.rotation = Math.sin(t * 8) * 0.06; C.p.shoes.forEach((s, i) => s.position.y = 0.08 + Math.max(0, Math.sin(t * 8 + i * Math.PI)) * 0.15); },
      sfx: [[0.5, 'squeak', 0.4], [1.3, 'squeak', 0.35], [2.1, 'squeak', 0.3], [4.4, 'splash', 0.5]],
      lines: [[0.4, 'log', 'He stood on the sand and looked at me, then walked back into the sea.', 'cp_m05_07']] },
    { d: 4.5, cam: [-10, -20, 4.5], to: [-12, -16, 5.5], look: [0, -50, 0], shake: 0.25,
      enter(C) { C.p.P.visible = false; },
      lines: [[0.4, 'holm', 'The surf is full of them. Get to the old fog bell, and hold till the sun’s up!', 'cp_m05_08']] },
  ],
});
// a week on: the Wren at sea, at night, coming in, and the shark on the water ahead of her
cpCineDef('m05_wren', {
  music: 'cpm05sail',
  b3(grp, C) {
    const S = RAID.st, P = S && S.pl;
    if (P) { const [u, v] = cpm5SeaL(P.x, P.y); C.pl = [u, v, 1.6]; } else C.pl = [0, 120, 1.6];
    this.shots[2].look = C.pl; this.shots[2].lookTo = C.pl; this.shots[3].look = C.pl;
  },
  shots: [
    { d: 4.2, card: { eye: 'One week on', t: '9 January 1888', sub: 'Night, off the Skerries. The schooner Wren, coming in' } },
    { d: 6, cam: [2.4, -10.6, 3.6], to: [1.6, -6.5, 3.2], look: [0, 6, 4.5], lookTo: [0, 12, 3.5], fade: [0.8, 0],
      lines: [[0.4, 'wren', 'Keeper’s word, by the pilot cutter: follow the shark in, and ring if she comes.', 'cp_m05_09'], [3.8, 'hand', 'The shark, he says. As if there were a choice of them.', 'cp_m05_10']] },
    { d: 5.5, cam: [0, 9.6, 3.1], to: [0, 10.4, 3.0], look: [0, 120, 1.6],
      sfx: [[1.0, 'squeak', 0.3], [2.2, 'squeak', 0.3]],
      lines: [[0.5, 'wren', 'There. Walking on the water, ahead of the bowsprit, and his shoes alight.', 'cp_m05_11']] },
    { d: 5, cam: [-2.6, 2, 2.8], to: [-2.2, 5, 3.2], look: [0, 120, 1.6],
      lines: [[0.3, 'wren', 'Keep him close and keep a hand forward with the bow lantern. The rocks show only in the beam.', 'cp_m05_12']] },
  ],
});
// at the Hulks: he stops, looks back once, and goes down under the water
cpCineDef('m05_dive', {
  b3(grp, C) {
    const S = RAID.st, P = S && S.pl; const [u, v] = P ? cpm5SeaL(P.x, P.y) : [0, 80];
    C.pl = [u, v, 1.4]; this.shots[0].look = C.pl; this.shots[1].look = [u, v, 0.6];
  },
  shots: [
    { d: 4, cam: [0, 9.8, 3.2], to: [0.4, 10.2, 3.0], look: [0, 80, 1.4],
      lines: [[0.3, 'hand', 'He’s stopped. He’s looking back at us.', 'cp_m05_13']] },
    { d: 4.5, cam: [1.2, 10.0, 3.0], look: [0, 80, 0.6], sfx: [[2.4, 'splash', 0.6]],
      lines: [[0.4, 'wren', 'He’s gone under, among the hulks. Every man to his post: we’re on our own till he comes up.', 'cp_m05_14']] },
  ],
});
// through the Gate: the inner skerries, the Light ahead, and palms on the cliffs
cpCineDef('m05_palms', {
  music: 'cpm05sail',
  b3(grp, C) {
    const [lu, lv] = cpm5SeaL(0, 0), [hu, hv] = cpm5SeaL(SK.HARBOUR.x, SK.HARBOUR.y);
    this.shots[0].look = [lu, lv, 40]; this.shots[1].look = [hu * 0.5, hv * 0.5, 20]; this.shots[1].lookTo = [hu, hv, 10];
  },
  shots: [
    { d: 5.5, cam: [0, 10, 4], to: [0, 11, 3.4], look: [0, 900, 40], fade: [0.6, 0],
      lines: [[0.4, 'hand', 'Through the Gate, and the Light right ahead of us.', 'cp_m05_15']] },
    { d: 6, cam: [-2.8, 4, 3.2], to: [-2.8, 6, 3.4], look: [0, 600, 20],
      lines: [[0.3, 'hand', 'Master. Those are palm trees on the cliffs.', 'cp_m05_16'], [3.4, 'wren', 'And the wake’s gone green behind us. Mind your helm, and never mind the trees.', 'cp_m05_17']] },
  ],
});
// the last reach: he walks on to the harbour, and she's on the water close astern
cpCineDef('m05_last', {
  music: 'cpm05last',
  b3(grp, C) {
    const S = RAID.st, M = S && S.mar, V = S && (S.V || S.B);
    let [mu, mv] = [0, -60]; if (V) { const a = V.h + Math.PI; [mu, mv] = cpm5SeaL(V.x + Math.sin(a) * 70, V.y + Math.cos(a) * 70); }
    C.m = cpm5MarenActor(grp, 4.4); const [wx, wy] = cpkW(mu, mv); C.m.P.position.copy(z3v(wx, wy, FPSC.GROUND)); C.mw = [wx, wy];
    this.shots[0].look = [mu, mv, 2.2]; this.shots[1].look = [mu * 0.6, mv * 0.6, 2.6];
    void M;
  },
  shots: [
    { d: 4.5, cam: [0.6, -10.4, 2.9], to: [0.3, -10.8, 3.1], look: [0, -70, 2.2], fade: [0.4, 0],
      f(t, k, C) { C.m.sp.material.rotation = Math.sin(t * 1.3) * 0.04; C.m.P.position.y = FPSC.GROUND + Math.sin(t * 0.9) * 0.08; },
      sfx: [[0.3, 'whisper', 0.6]],
      lines: [[0.4, 'hand', 'Master, she’s on the water astern. A woman, and her lantern.', 'cp_m05_18']] },
    { d: 5, cam: [0, -9, 3.6], to: [0, -9.6, 3.4], look: [0, -42, 2.6],
      f(t, k, C) { const V = RAID.st.V || RAID.st.B; void V; C.m.sp.material.rotation = Math.sin(t * 1.3) * 0.04; const kk = Math.min(1, t / 4); C.m.P.position.x = C.mw[0] + (FPSC.CX - C.mw[0]) * kk * 0.35; C.m.P.position.z = -(C.mw[1] + (FPSC.CY - 10 - C.mw[1]) * kk * 0.35); },
      lines: [[0.3, 'wren', 'The shark’s walked on to the pier. Ring that bell, and ring it again, and crack on all she’ll carry!', 'cp_m05_19']] },
  ],
});
// in: the Wren alongside the pier, the shark sitting on its end with his shoes off, and the keeper's page
cpCineDef('m05_outro', {
  music: 'cphope',
  b3(grp, C) {
    // (the shark, on the pier head ahead of her bow)
    const [u, v] = cpm5SeaL(SK.HARBOUR.x - 20, SK.HARBOUR.y + 40);
    C.p = cpm5PlimActor(grp, 2.4, true); const [wx, wy] = cpkW(u, v); C.p.P.position.copy(z3v(wx, wy, FPSC.GROUND + 2.2));
    this.shots[0].look = [u, v, 3.4]; this.shots[1].look = [u, v, 3.2];
  },
  shots: [
    { d: 6, cam: [0, 9.4, 3.2], to: [0.6, 10.2, 3.6], look: [0, 40, 3.4], fade: [0.5, 0],
      lines: [[0.4, 'hand', 'Not a scratch on her. And look at him: sat down on the pier, taking his shoes off.', 'cp_m05_20']] },
    { d: 6, cam: [-2.8, 6, 3.0], to: [-2.6, 8, 3.2], look: [0, 40, 3.2],
      lines: [[0.3, 'hand', 'Blue plimsolls, on a shark.', 'cp_m05_21'], [2.8, 'wren', 'Then that’s his name, and he’s earned it. Plimsoll.', 'cp_m05_22']] },
    { d: 9, card: { eye: 'The keeper’s log · 9 January 1888', t: 'The Wren Comes In', sub: 'The schooner Wren came through the skerries last night without a scratch. Her master swears a shark in shoes walked ahead of her the whole way in. The men call him Plimsoll now.' } },
  ],
});
