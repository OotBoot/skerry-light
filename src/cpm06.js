'use strict';
// The Chronicle of the Light, mission 6: The Kittiwake (28 February 1888). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm06', act: 3, n: 'The Kittiwake', when: '28 February 1888', where: 'Aboard the Kittiwake',
  blurb: 'The first account of Verity, from a hand off the Kittiwake. Something sat down in front of the last flare on board.',
  stages: ['cp_wip'], intro: 'm06_intro', outro: 'm06_outro', music: { default: 'cptense' } });
cpCineDef('m06_intro', { shots: [cpTitleShot(CP_BY.m06), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m06_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'The Kittiwake', sub: '28 February 1888' } }] });
