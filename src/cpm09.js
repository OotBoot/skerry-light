'use strict';
// The Chronicle of the Light, mission 9: Keeper's Last Light (Winter 1888 to 1889). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm09', act: 4, n: "Keeper's Last Light", when: 'Winter 1888 to 1889', where: "The keeper's station",
  blurb: 'The drowned stop waiting for ships and come for the station itself. Hold it through the worst night of the winter.',
  stages: ['cp_wip'], intro: 'm09_intro', outro: 'm09_outro', music: { default: 'cptense' } });
cpCineDef('m09_intro', { shots: [cpTitleShot(CP_BY.m09), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m09_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: "Keeper's Last Light", sub: 'Winter 1888 to 1889' } }] });
