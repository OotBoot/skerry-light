'use strict';
// The Chronicle of the Light, mission 8: The Gannet's Wake (14 December 1888). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm08', act: 3, n: "The Gannet's Wake", when: '14 December 1888', where: 'Off the Skerries, and aboard the risen Gannet',
  blurb: "A year to the night, the Gannet's bell. Sail out to where she went down, go aboard, and face Knock, the Bosun and Captain Crane.",
  stages: ['cp_wip'], intro: 'm08_intro', outro: 'm08_outro', music: { default: 'cptense' } });
cpCineDef('m08_intro', { shots: [cpTitleShot(CP_BY.m08), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m08_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: "The Gannet's Wake", sub: '14 December 1888' } }] });
