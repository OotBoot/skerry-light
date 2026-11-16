'use strict';
// The Chronicle of the Light, mission 10: Freebooters' Sea (Spring 1889). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm10', act: 4, n: "Freebooters' Sea", when: 'Spring 1889', where: 'The Wide Water, out of Saltcote',
  blurb: 'Beyond the Near Skerries lies a sea the charts gave up on. Take a voyage off the Saltcote board and bring the hoard home past the Black Sloops.',
  stages: ['cp_wip'], intro: 'm10_intro', outro: 'm10_outro', music: { default: 'cptense' } });
cpCineDef('m10_intro', { shots: [cpTitleShot(CP_BY.m10), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m10_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: "Freebooters' Sea", sub: 'Spring 1889' } }] });
