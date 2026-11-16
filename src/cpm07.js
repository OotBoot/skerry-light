'use strict';
// The Chronicle of the Light, mission 7: Wreckers' Night (1888). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm07', act: 3, n: "Wreckers' Night", when: '1888', where: 'The Bonded Quay',
  blurb: 'A dark night ashore. The wreckers fight over what the sea has left, and the drowned wade in to take it back.',
  stages: ['cp_wip'], intro: 'm07_intro', outro: 'm07_outro', music: { default: 'cptense' } });
cpCineDef('m07_intro', { shots: [cpTitleShot(CP_BY.m07), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m07_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: "Wreckers' Night", sub: '1888' } }] });
