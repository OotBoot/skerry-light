'use strict';
// The Chronicle of the Light, mission 13: The Fall of Wrackhaven (Winter 1891). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm13', act: 4, n: 'The Fall of Wrackhaven', when: 'Winter 1891', where: 'Wrackhaven',
  blurb: 'One night the sea comes up Fish Street and does not go back. Get the townsfolk to the town hall and hold the Belfry until dawn.',
  stages: ['cp_wip'], intro: 'm13_intro', outro: 'm13_outro', music: { default: 'cptense' } });
cpCineDef('m13_intro', { shots: [cpTitleShot(CP_BY.m13), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m13_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'The Fall of Wrackhaven', sub: 'Winter 1891' } }] });
