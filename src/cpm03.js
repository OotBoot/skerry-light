'use strict';
// The Chronicle of the Light, mission 3: Lighting the Light (1841). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm03', act: 2, n: 'Lighting the Light', when: '1841', where: 'Skerry Light',
  blurb: "The Light is built on its rock. Carry the Lampwright's lens up the tower, set it, and light it for the first time.",
  stages: ['cp_wip'], intro: 'm03_intro', outro: 'm03_outro', music: { default: 'cptense' } });
cpCineDef('m03_intro', { shots: [cpTitleShot(CP_BY.m03), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m03_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'Lighting the Light', sub: '1841' } }] });
