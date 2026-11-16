'use strict';
// The Chronicle of the Light, mission 1: The First Fire (c. 1200s). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm01', act: 1, n: 'The First Fire', when: 'c. 1200s', where: 'Lantern Rock',
  blurb: "Before there was a lighthouse there was a fire. Keep the fire-keepers' beacon burning on Lantern Rock through a night of haar, against what comes out of the fog.",
  stages: ['cp_wip'], intro: 'm01_intro', outro: 'm01_outro', music: { default: 'cptense' } });
cpCineDef('m01_intro', { shots: [cpTitleShot(CP_BY.m01), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m01_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'The First Fire', sub: 'c. 1200s' } }] });
