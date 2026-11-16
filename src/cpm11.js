'use strict';
// The Chronicle of the Light, mission 11: Fog Run (Autumn 1889). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm11', act: 4, n: 'Fog Run', when: 'Autumn 1889', where: 'The outer rocks, in the haar',
  blurb: "Something in the haar is putting out the lights of the outer rocks. Light them again, and find what's doing it on Lantern Rock.",
  stages: ['cp_wip'], intro: 'm11_intro', outro: 'm11_outro', music: { default: 'cptense' } });
cpCineDef('m11_intro', { shots: [cpTitleShot(CP_BY.m11), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m11_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'Fog Run', sub: 'Autumn 1889' } }] });
