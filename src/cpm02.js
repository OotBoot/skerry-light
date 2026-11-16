'use strict';
// The Chronicle of the Light, mission 2: The Mooncussers (The 1600s). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm02', act: 1, n: 'The Mooncussers', when: 'The 1600s', where: 'The headland below the sea fort',
  blurb: 'The wrecking years. Mooncussers hang false lights on the rocks to draw ships in. Put the lights out before the ship strikes, and take the Mooncusser who hung them.',
  stages: ['cp_wip'], intro: 'm02_intro', outro: 'm02_outro', music: { default: 'cptense' } });
cpCineDef('m02_intro', { shots: [cpTitleShot(CP_BY.m02), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m02_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'The Mooncussers', sub: 'The 1600s' } }] });
