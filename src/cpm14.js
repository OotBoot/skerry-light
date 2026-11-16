'use strict';
// The Chronicle of the Light, mission 14: The Drowned Reach (The years after). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm14', act: 5, n: 'The Drowned Reach', when: 'The years after', where: 'The Light, in the middle of the Reach',
  blurb: "The sea came back with the people of every sea and year. Take the Light's rock through the war for the islands, and light it.",
  stages: ['cp_wip'], intro: 'm14_intro', outro: 'm14_outro', music: { default: 'cptense' } });
cpCineDef('m14_intro', { shots: [cpTitleShot(CP_BY.m14), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m14_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'The Drowned Reach', sub: 'The years after' } }] });
