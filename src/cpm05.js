'use strict';
// The Chronicle of the Light, mission 5: The Wren Comes In (9 January 1888). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm05', act: 3, n: 'The Wren Comes In', when: '9 January 1888', where: 'The Skerries',
  blurb: 'A boy in blue shoes walks ahead through the deep water. Sail the cutter in behind Plimsoll, with Maren coming nearer every turn of the lamp.',
  stages: ['cp_wip'], intro: 'm05_intro', outro: 'm05_outro', music: { default: 'cptense' } });
cpCineDef('m05_intro', { shots: [cpTitleShot(CP_BY.m05), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m05_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'The Wren Comes In', sub: '9 January 1888' } }] });
