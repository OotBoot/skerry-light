'use strict';
// The Chronicle of the Light, mission 4: The Night of the Gannet (14 December 1887). A placeholder until the mission is written: its place in
// the campaign (src/cp.js cpMission), a title card, and the stage still being written (src/cpkit.js 'cp_wip').
cpMission({ id: 'm04', act: 2, n: 'The Night of the Gannet', when: '14 December 1887', where: 'Skerry Light',
  blurb: 'Keep the beam on the brig Gannet as she comes in. In the second hour the lamp fails.',
  stages: ['cp_wip'], intro: 'm04_intro', outro: 'm04_outro', music: { default: 'cptense' } });
cpCineDef('m04_intro', { shots: [cpTitleShot(CP_BY.m04), { d: 4, cam: [0, -70, 6], to: [0, -55, 4], look: [0, 0, 1], lines: [[0.3, 'log', 'This page of the log is still being written.', '']] }] });
cpCineDef('m04_outro', { shots: [{ d: 3, card: { eye: 'Mission complete', t: 'The Night of the Gannet', sub: '14 December 1887' } }] });
