'use strict';
// The Chronicle of the Light, mission 12: Maren's End (The Dry Night, 1890). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm12', act: 4, n: "Maren's End", when: 'The Dry Night, 1890', where: 'The Swallow, and the sea fort',
  blurb: "The sea drains away down the Swallow. Go down after it with Maren's lantern, cross the black river, and face Maren in her fort.",
  stages: ['cp_wip'], intro: 'm12_intro', outro: 'm12_outro', music: { default: 'cptense' } });
cpCineDef('m12_intro', { shots: [cpTitleShot(CP_BY.m12), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m12_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: "Maren's End", sub: 'The Dry Night, 1890' } }] });
