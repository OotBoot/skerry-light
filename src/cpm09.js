'use strict';
// The Chronicle of the Light, mission 9: Keeper's Last Light (Winter 1888 to 1889). After the Gannet rose, the drowned
// stopped waiting for ships and came up out of the sea for the keeper's station itself, night after night. Three of
// those nights, at the station laid out as the Lighthouse has it (src/cpm09x.js has the stages and the tools):
//   I.   The First Night: dusk on the jetty, the courtyard's windows boarded before dark, three waves and the first
//        Diver, with the keeper Holm to keep alive in his own yard.
//   II.  The Ninth Night: the lamp drinking the last of its oil; casks carried up the tower's ninety steps while a
//        crab tide pours in below.
//   III. The Worst Night: the lantern room under siege in a winter storm, the drowned over the gallery's rail; the
//        Mooncusser's false light against the true one, and the Light let burn full till dawn.
// Its cinematics are here: the intro, the dark coming down, the Diver, the nights between (cards), the oil, the crab
// tide, the false light on the rocks, the storm, the Mooncusser over the rail, the Light let burn, and dawn.
cpMission({ id: 'm09', act: 4, n: "Keeper's Last Light", when: 'Winter 1888 to 1889', where: "The keeper's station",
  blurb: 'The drowned stop waiting for ships and come for the station itself. Hold it through the worst nights of the winter, and keep the lamp lit.',
  stages: ['cp_m09dusk', 'cp_m09oil', 'cp_m09worst'], intro: 'm09_intro', outro: 'm09_outro',
  cut: { 1: 'm09_oil', 2: 'm09_storm' }, after: { 0: 'm09_nights', 1: 'm09_false' },
  music: { default: 'cpm09night' }, lives: 2,
  stop() { c9Tower(false); c9NpcFreeAll(); c9SkyBack(); } });
// the music it would have, and what plays until it's made (src/cp.js CP_MUSIC_FALL)
Object.assign(CP_MUSIC_FALL, { cpm09dusk: 'raidpier', cpm09night: 'cpfight', cpm09diver: 'bossdiver', cpm09oil: 'cptense', cpm09tide: 'bosscrab', cpm09storm: 'raidmaren2', cpm09moon: 'bossmoon', cpm09dawn: 'gwwin' });

// ---------- the cinematics ----------
// (the tower's middle, and its lantern's floor, about the island's middle)
const C9C = { TX: 0, TY: 1.5, TOP: 25 };
cpCineDef('m09_intro', { music: 'cpm09dusk', shots: [
  cpTitleShot(CP_BY.m09),
  { d: 6.5, cam: [-30, -96, 7], to: [-15, -80, 4.5], look: [0, 1.5, 18], lookTo: [0, -10, 14], fade: [1, 0],
    lines: [[0.5, 'log', 'Winter, 1888. Since the Gannet rose, the drowned no longer wait for ships to come to them.', 'cp_m09_01']], sfx: [[0.2, 'sea', 0.5], [3.5, 'gull', 0.3]] },
  { d: 5.5, cam: [1.6, -52, 2.0], to: [0.6, -44, 1.9], look: [-0.4, -37.6, 1.5],
    lines: [[0.4, 'holm', 'You came, then. Good. They will be up out of the water by full dark.', 'cp_m09_02']] },
  { d: 5.5, cam: [-10, -26, 6.5], to: [9, -27, 6.5], look: [0, -36, 1.2],
    lines: [[0.3, 'holm', 'Every window you leave open is a door for them. Every one.', 'cp_m09_03'], [3.4, 'log', 'He had not slept a night through since the fourteenth.', 'cp_m09_04']] },
] });
cpCineDef('m09_dark', { music: 'cpm09night',
  b3(grp, C) { C.a = [[-6, -66.7], [0.5, -66.7], [6.5, -66.7]].map(([x, y], i) => c9Act(i === 1 ? 'jog' : 'walk', x, y, -1.8, 0, 11 + i)); },
  exit(C) { c9ActFree(C.a); },
  shots: [
    { d: 5.5, cam: [0, -58.6, 2.7], to: [0, -60.4, 2.3], look: [0, -66.6, 0.3], lookTo: [0, -66, 1.0], fade: [0.6, 0],
      sfx: [[0.4, 'splash', 0.6], [2.2, 'moan', 0.6]], lines: [[0.6, 'holm', 'Listen. On the ladders.', 'cp_m09_20']],
      f(t, k, C) { C.a.forEach((z, i) => { const q = clamp((t - i * 1.1) / 2.2, 0, 1); c9ActAt(z, [-6, 0.5, 6.5][i], -66.7 + (q > 0.8 ? (q - 0.8) * 5 : 0), -1.8 + 2.7 * Math.min(1, q * 1.15), 0, q > 0 && q < 1); c9ActPose(z); }); } },
    { d: 4.5, cam: [0.4, -27.5, 2.1], to: [0.2, -30, 2.0], look: [0, -39, 2.3], shake: 0.15, fade: [0, 0.6],
      sfx: [[0.3, 'tear', 0.7], [1.6, 'moan', 0.7], [2.8, 'tear', 0.6]], lines: [[0.3, 'holm', 'Here they come. Up the ladders, same as every night.', 'cp_m09_21']],
      f(t, k, C) { C.a.forEach(z => { if (z.mdl) z.mdl.root.visible = false; }); } },
  ] });
cpCineDef('m09_diver', { music: 'cpm09diver',
  b3(grp, C) { C.d = c9Act('diver', 0, -67.2, -2.6, 0, 7); },
  exit(C) { c9ActFree([C.d]); },
  shots: [
    { d: 5, cam: [6.5, -56, 3.6], to: [4.2, -57.5, 3.0], look: [0, -65, 2.0], lookTo: [0, -63.5, 2.6],
      sfx: [[0.3, 'splash', 0.9], [0.9, 'bossdiver', 0.9], [3.0, 'slam', 0.6]],
      f(t, k, C) { const q = clamp(t / 3.2, 0, 1); c9ActAt(C.d, 0, -67.2 + 3.4 * q, -2.6 + 3.5 * Math.min(1, q * 1.3), 0, q < 1); c9ActPose(C.d); } },
    { d: 4.5, cam: [0.3, -37.6, 1.5], look: [0, -58, 2.6], shake: 0.1,
      lines: [[0.3, 'holm', 'A salvage diver’s helmet. God keep the men who wore them down.', 'cp_m09_28']],
      f(t, k, C) { c9ActAt(C.d, 0, -63.8 + 4.2 * k, 0.9, 0, true); c9ActPose(C.d); } },
  ] });
cpCineDef('m09_nights', { music: 'cpm09dusk', shots: [
  { d: 4.2, card: { eye: 'The keeper’s log', t: 'Night after night', sub: 'They came again the next night, and the next. The keeper set down every one.' } },
  { d: 7, cam: [-6.5, -34.5, 1.8], to: [-3, -30, 2.3], look: [0, 1.5, 24], fade: [0.8, 0.8],
    lines: [[0.4, 'log', 'Fourth night. Up the shingle again, and in at the Fog-Signal House. We held.', 'cp_m09_29'], [3.8, 'log', 'Seventh night. Crabs the size of dogs, in at every window at once.', 'cp_m09_30']] },
  { d: 4.6, card: { eye: 'Winter 1888', t: 'The ninth night', sub: 'The oil boat from Wrackhaven has not come. The lamp is burning the last of its casks.' } },
] });
cpCineDef('m09_oil', { music: 'cpm09oil', shots: [
  { d: 5.4, cam: [-3.2, -3.4, C9C.TOP + 2.1], to: [-1.8, -2.4, C9C.TOP + 1.7], look: [4.4, 2.6, C9C.TOP + 1.2], fade: [0.6, 0],
    lines: [[0.3, 'holm', 'She is drinking the last of it. Hear that cough? That is the wick running dry.', 'cp_m09_34']], sfx: [[0.2, 'wind', 0.4]] },
  { d: 5, cam: [0.9, 0.6, C9C.TOP + 2.4], to: [0.4, 1.2, C9C.TOP + 2.0], look: [0, 1.5, 1],
    lines: [[0.3, 'holm', 'Casks in the Oil Store, the Boathouse, and two by the well. Bring them up to me.', 'cp_m09_35']] },
] });
cpCineDef('m09_tide', { music: 'cpm09tide',
  b3(grp, C) { C.c = []; for (let i = 0; i < 16; i++) C.c.push(c9Act('skit', (i % 4 - 1.5) * 1.3, -66 + (i >> 2) * 1.6, 0.9, 0, 40 + i)); },
  exit(C) { c9ActFree(C.c); },
  shots: [
    { d: 4.6, cam: [0, -37.8, 4.6], look: [0, -54, 0.6], fade: [0.4, 0],
      lines: [[0.3, 'holm', 'Crabs. The whole harbour floor has got up and come.', 'cp_m09_39']], sfx: [[0.2, 'splash', 0.6], [1.5, 'splash', 0.4]],
      f(t, k, C) { C.c.forEach((z, i) => { c9ActAt(z, (i % 4 - 1.5) * 1.3 + Math.sin(t * 3 + i) * 0.4, -66 + (i >> 2) * 1.6 + t * 4.2, 0.9, 0, true); c9ActPose(z); }); } },
    { d: 3.6, cam: [5.5, -29.5, 2.4], look: [0, -38.5, 0.4], fade: [0, 0.5], shake: 0.1,
      f(t, k, C) { C.c.forEach((z, i) => { const s = (i % 4 - 1.5) * 1.6 * (0.3 + t * 0.4); c9ActAt(z, s, -41 + (i >> 2) * -1.6 + t * 3.6, 0, Math.sin(i) * 0.6, true); c9ActPose(z); }); } },
  ] });
cpCineDef('m09_false', { music: 'cpm09storm',
  b3(grp, C) {
    C.m = c9Act('moon', -38, -43.5, 0, 0.6, 3);
    C.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,214,140,0.95)', 'rgba(255,200,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    grp.add(C.glow);
  },
  exit(C) { c9ActFree([C.m]); },
  shots: [
    { d: 5.6, cam: [-8.6, -2.4, C9C.TOP + 1.6], look: [-38, -43.5, 2], fade: [0.5, 0],
      lines: [[0.8, 'holm', 'A light on the rocks. That is no ship’s lamp.', 'cp_m09_40']], sfx: [[0.2, 'wind', 0.5]],
      f(t, k, C) { C.m.act = 'lure'; C.m.at = Math.min(1.5, t * 0.4); c9ActPose(C.m); const s = 2 + 5 * k + Math.sin(t * 5) * 0.4; C.glow.scale.setScalar(s); C.glow.position.copy(z3v(...c9L(-37.6, -43.2), FPSC.GROUND + 3.4)); } },
    { d: 4.2, cam: [-31, -36, 2.8], to: [-32.5, -37.8, 2.6], look: [-38, -43.5, 2.4],
      lines: [[0.3, 'holm', 'They used to hang his kind in chains on the sea wall for that.', 'cp_m09_42']], sfx: [[0.5, 'mooncusser', 0.8]],
      f(t, k, C) { C.m.act = 'lure'; C.m.at = 0.6 + k * 0.9; c9ActPose(C.m); C.glow.scale.setScalar(3 + k * 6); C.glow.position.copy(z3v(...c9L(-37.6, -43.2), FPSC.GROUND + 3.4)); } },
    { d: 4.8, card: { eye: 'Winter 1888 to 1889', t: 'The worst night of the winter', sub: 'A storm out of the north-east, and every one of them in the harbour coming up for the lamp.' } },
  ] });
cpCineDef('m09_storm', { music: 'cpm09storm',
  b3(grp, C) { C.a = [0.6, 2.2, 4.0].map((a, i) => c9Act(i ? 'jog' : 'walk', C9C.TX + Math.cos(a) * 9.3, C9C.TY + Math.sin(a) * 9.3, C9C.TOP - 1.9, a + Math.PI, 60 + i)); },
  exit(C) { c9ActFree(C.a); },
  shots: [
    { d: 5.4, cam: [15, -11, C9C.TOP - 1], to: [12, -13, C9C.TOP + 2.5], look: [0, 1.5, C9C.TOP + 1.8], shake: 0.3, fade: [0.6, 0],
      sfx: [[0.3, 'thunder', 0.8], [0.4, 'stormwind', 0.6]], lines: [[0.6, 'holm', 'Whatever comes over that rail, the lamp stays lit. That is the whole of the job.', 'cp_m09_43']],
      f(t, k, C) { C.a.forEach(z => { if (z.mdl) z.mdl.root.visible = false; }); } },
    { d: 4.2, cam: [C9C.TX + 6.6, C9C.TY + 5.6, C9C.TOP + 1.6], look: [C9C.TX + 7.5, C9C.TY + 7.3, C9C.TOP + 0.4], shake: 0.15, sfx: [[0.6, 'moan', 0.7]],
      f(t, k, C) { C.a.forEach((z, i) => { const a = [0.6, 2.2, 4.0][i], q = clamp((t - i * 0.5) / 2, 0, 1); c9ActAt(z, C9C.TX + Math.cos(a) * 9.3, C9C.TY + Math.sin(a) * 9.3, C9C.TOP - 1.9 + 1.9 * q, a + Math.PI, false); c9ActPose(z); }); } },
  ] });
cpCineDef('m09_moon', { music: 'cpm09moon',
  b3(grp, C) { C.m = c9Act('moon', C9C.TX - 9.25, C9C.TY, C9C.TOP - 2.6, Math.PI / 2, 5); },
  exit(C) { c9ActFree([C.m]); },
  shots: [
    { d: 5, cam: [C9C.TX - 4.6, C9C.TY - 7.0, C9C.TOP + 1.3], to: [C9C.TX - 5.4, C9C.TY - 6.2, C9C.TOP + 1.5], look: [C9C.TX - 9.3, C9C.TY, C9C.TOP + 0.6], lookTo: [C9C.TX - 9.0, C9C.TY, C9C.TOP + 1.8], shake: 0.12,
      sfx: [[0.2, 'thunder', 0.7], [0.9, 'bossmoon', 0.9]], lines: [[1.2, 'holm', 'Him. In his chains, on my own gallery.', 'cp_m09_44']],
      f(t, k, C) { const q = clamp(t / 3, 0, 1); c9ActAt(C.m, C9C.TX - 9.25 + q * 1.2, C9C.TY, C9C.TOP - 2.6 + 2.6 * Math.min(1, q * 1.2), Math.PI / 2, false); c9ActPose(C.m); } },
    { d: 4.4, cam: [C9C.TX - 5.8, C9C.TY + 5.8, C9C.TOP + 1.0], to: [C9C.TX - 6.4, C9C.TY + 4.8, C9C.TOP + 1.1], look: [C9C.TX - 8.05, C9C.TY, C9C.TOP + 1.9],
      sfx: [[0.4, 'mooncusser', 0.8]], lines: [[0.3, 'holm', 'Do not look into his light. Look at him, and shoot.', 'cp_m09_45']],
      f(t, k, C) { C.m.act = 'lure'; C.m.at = k * 1.5; c9ActAt(C.m, C9C.TX - 8.05, C9C.TY, C9C.TOP, Math.PI / 2, false); c9ActPose(C.m); } },
  ] });
cpCineDef('m09_burn', { music: 'cpm09dawn',
  enter(C) {}, shots: [
    { d: 3.8, cam: [2.2, -2.6, C9C.TOP + 1.7], look: [4.6, 1.6, C9C.TOP + 1.3],
      lines: [[0.3, 'holm', 'Now. Turn her up, and let her burn.', 'cp_m09_46']], sfx: [[0.6, 'beam', 0.8]] },
    { d: 6.4, cam: [-22, -42, 6], to: [-13, -34, 3.6], look: [0, 1.5, 26], fade: [0, 0.6],
      lines: [[0.6, 'log', 'Lit her full. She burned them off the tower like moths off a lamp glass.', 'cp_m09_47']] },
  ] });
cpCineDef('m09_outro', { music: 'cpm09dawn',
  b3(grp, C) {
    const H = RAID.st && RAID.st.npc && RAID.st.npc[0]; if (H) H.hide = 1;
    C.h = c9Fig(['#23303c', '#d8d0bc', '#9a7a34', '#ffd88a'], 0.4, -6.4, C9C.TOP, Math.PI);
    C.a = [-1, 0.6, -0.4, 1.2].map((x, i) => c9Act('walk', x, -46 - i * 2.6, 0.9, Math.PI, 80 + i));
  },
  exit(C) { cpkNpcFree(C.h); c9ActFree(C.a); const H = RAID.st && RAID.st.npc && RAID.st.npc[0]; if (H) H.hide = 0; },
  shots: [
    { d: 6.4, cam: [0, -38.2, 2.5], to: [0, -39.5, 2.4], look: [0, -62, 0.8], fade: [0.8, 0], sfx: [[0.2, 'gull', 0.5], [2, 'sea', 0.5]],
      lines: [[0.5, 'log', 'Dawn. They went back down the ladders as though the tide had called them home.', 'cp_m09_48']],
      f(t, k, C) { C.a.forEach((z, i) => { const y = -46 - i * 2.6 - t * 1.6, sink = Math.max(0, -(y + 63) * 1.4); c9ActAt(z, [-1, 0.6, -0.4, 1.2][i], Math.max(-67.5, y), 0.9 - Math.min(2.8, sink), Math.PI, true); c9ActPose(z); }); } },
    { d: 6.4, cam: [3.2, -14.5, C9C.TOP + 2.2], to: [2.2, -12.4, C9C.TOP + 1.9], look: [0.4, -6.4, C9C.TOP + 1.3],
      lines: [[0.5, 'holm', 'Kept her lit. Write that down, whoever comes after me.', 'cp_m09_49']],
      f(t, k, C) { c9FigPose(C.h); C.a.forEach(z => { if (z.mdl) z.mdl.root.visible = false; }); } },
    { d: 4.8, card: { eye: 'Mission complete', t: "Keeper's Last Light", sub: 'He kept the lamp lit through everything in between, as a keeper should.' } },
  ] });
