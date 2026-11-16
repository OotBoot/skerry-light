'use strict';
// The Chronicle of the Light, mission 10: Freebooters' Sea (Spring 1889). The first crew out of Saltcote with a hoard
// chart of Gilt & Gull's, after the Gannet's wrecks drifted north onto the Wide Water. The sea, its islands and
// Saltcote are Freebooters' Sea's own (src/fbsail.js FB_ISLES, fbSea; src/fbisle.js's look of each island; the cutter,
// her swivel guns and the Mooncussers' black sloops, src/fbguns.js), but the voyage is the mission's own:
//  I.   Out of Saltcote (cp_m10out, src/cpm10s.js): the chart's course, north by Beacon Knoll's tower and on to
//       Crowsnest Rock, the drowned over the rail on the way; under the Knoll a black sloop is seen watching (a
//       cutscene), and she does not come on.
//  II.  Crowsnest Rock (cp_m10crow, src/cpm10i.js): the island as Freebooters' Sea lays it out (its crags and their
//       stair, its ruined signal tower), with the hoarder's three marks set on it: the Crow at the stair head, the
//       Tower at the tower's door and the Hanged Man on a gibbet. Each has a brass sight on a stone post; the chart
//       says where each must look. Turn them true and the sights agree on a spot (a cutscene): dig there, holding the
//       drowned off, until the spade strikes the chest. The chest has been opened before you, and what keeps it comes up
//       out of the pit (a cutscene, then a Mooncusser). Carry what's left of the hoard down to the landing boat.
//  III. The Black Sloops (cp_m10home, src/cpm10s.js): home with it, and the black sloops come out from under St
//       Brannoc's Isle (a cutscene), the Gallows Bird at their head with the other half of the hoard aboard. Sink her
//       with the swivel guns, haul the hoard in from the water, and run for Saltcote's light; the sloops will not
//       follow you into it. She goes down and the mission's lost with her.
//  IV.  Saltcote (cp_m10port, src/cpm10i.js): ashore at the quay, the two halves of the hoard carried up from the
//       landing boat to the factor's table, and weighed (the outro).
// This file: the mission, its people, its music's fallbacks, and the cinematics that aren't a stage's own.
// Lines are cp_m10_01 onwards (the sound notes: campaign-sound/m10.md).

cpCast('gilt', { n: 'The Gilt & Gull Clerk', c: '#d8c890' });
cpCast('mate', { n: 'The Mate', c: '#b8d0a8' });
Object.assign(CP_MUSIC_FALL, { cpm10sail: 'gwsail', cpm10isle: 'frisle', cpm10dig: 'cptense', cpm10fight: 'cpfight', cpm10port: 'frsail', cpm10cine: 'cpsail' });

cpMission({ id: 'm10', act: 4, n: "Freebooters' Sea", when: 'Spring 1889', where: 'The Wide Water, out of Saltcote',
  blurb: "A Gilt & Gull chart, true one time in three. Sail it north to Crowsnest Rock, dig where its sights agree, and bring the hoard home past the Black Sloops to the factor's table.",
  stages: ['cp_m10out', 'cp_m10crow', 'cp_m10home', 'cp_m10port'],
  intro: 'm10_intro', outro: 'm10_outro', cut: { 1: 'm10_crow', 3: 'm10_quay' }, after: { 1: 'm10_away' },
  music: { default: 'cpm10sail' }, lives: 1,
  begin() { if (typeof FB !== 'undefined') FB.hold = []; C10.gold = 0; C10.kept = []; },
  stop() { if (typeof FB !== 'undefined' && !FB.on) FB.hold = []; },
});
// the mission's own, across its stages (hosting or alone; the host's word carries what the others need)
var C10 = { gold: 0, kept: [] };

// ---------- helpers for the cinematics ----------
// out at sea: a place on the sea (its frame) as the deck's own local [u, v], from the ship as she lies now
function c10Deck(x, y) { const S = RAID.st, V = S && (S.V || S.B); if (!V || typeof faToDeck !== 'function') return [0, 40]; return faToDeck(V, x, y); }
// a shot whose camera and look are worked out as it plays: f(t, k, C) returns { cam, look } (local [u, v, h])
function c10Live(d, f, o) {
  const s = Object.assign({ d, cam: [0, 0, 5], look: [0, 10, 3] }, o || {});
  const of = s.f;
  s.f = (t, k, C) => { const r = f(t, k, C); if (r) { if (r.cam) s.cam = r.cam; if (r.look) s.look = r.look; s.to = null; s.lookTo = null; } if (of) of(t, k, C); };
  return s;
}
const c10Mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ---------- the intro: the cutter lying off Saltcote, the chart, and away ----------
cpCineDef('m10_intro', { music: 'cpm10cine', shots: [
  cpTitleShot(CP_BY.m10),
  { d: 4.5, card: { eye: 'Spring, 1889', t: 'The Wide Water', sub: 'A hundred years of wrecks came up with the Gannet, and the tide took them north.' }, lines: [[0.6, 'log', 'Every rock beyond the Near Skerries has something on it now. Saltcote has never been so busy.', 'cp_m10_01']] },
  c10Live(6.5, (t, k) => { const [u, v] = c10Deck(FB_ISLES[0].x, FB_ISLES[0].y); return { cam: c10Mix([-14, -26, 14], [-9, -18, 8], k), look: [u * 0.5, v * 0.5, 4] }; }, { fade: [1, 0],
    lines: [[0.4, 'gilt', 'Crowsnest Rock, gentlemen. A Gilt and Gull chart, and a true one, by my oath.', 'cp_m10_02'], [3.6, 'factor', 'True one time in three. Bring it home to my table and I weigh it honest.', 'cp_m10_03']] }),
  c10Live(5.5, (t, k) => { const [u, v] = c10Deck(FB_ISLES[0].x, FB_ISLES[0].y), n = Math.hypot(u, v) || 1; return { cam: c10Mix([u / n * 30 + 6, v / n * 30, 3], [u / n * 22 + 2, v / n * 22, 5], k), look: [0, -2, 2.5] }; },
    { lines: [[0.3, 'mate', 'Four guns on her rails and a hold as empty as a parson’s purse. She’ll do.', 'cp_m10_04']], sfx: [[0.2, 'creak', 0.5]] }),
  { d: 5, cam: [0, -14, 4.5], to: [0, -9.5, 3.4], look: [0, 6, 2.6], lookTo: [0, 30, 3], fade: [0, 0.6],
    lines: [[0.3, 'mate', 'North by the Knoll, then. And keep an eye out for sails with no lamps.', 'cp_m10_05']] },
] });

// ---------- ashore on Crowsnest (stage II's own cut): the rock as the chart draws it ----------
// (C10I: the island's marks as laid out, src/cpm10i.js; in the island's own frame)
cpCineDef('m10_crow', { music: 'cpm10cine', shots: [
  { d: 3.2, card: { eye: 'Crowsnest Rock', t: 'The Chart', sub: 'Three sights, each set to the next mark. Where the sights agree, dig.' } },
  c10Live(5.5, (t, k) => { const M = c10Marks(); const a = M.crow, b = M.tower; return { cam: c10Mix([a[0] * 1.6, a[1] * 1.6, 16], [a[0] * 1.3, a[1] * 1.3, 9], k), look: [a[0], a[1], 2] }; },
    { lines: [[0.4, 'mate', 'There’s the stair cut in the crags, and a stone at its head with a crow on it.', 'cp_m10_06']] }),
  c10Live(5, (t, k) => { const M = c10Marks(), b = M.tower; return { cam: c10Mix([b[0] + 14, b[1] - 12, 7], [b[0] + 9, b[1] - 8, 4], k), look: [b[0], b[1], 2.5] }; },
    { lines: [[0.3, 'mate', 'The old tower. Another sight on a post by its door.', 'cp_m10_07']] }),
  c10Live(5.5, (t, k) => { const M = c10Marks(), c = M.hang; return { cam: c10Mix([c[0] - 10, c[1] + 10, 5], [c[0] - 6, c[1] + 6, 3.4], k), look: [c[0], c[1], 2.8] }; },
    { lines: [[0.3, 'mate', 'And a gibbet, with somebody still in it. The Hanged Man.', 'cp_m10_08'], [3.2, 'log', 'Turn each sight to the mark the chart gives it.', 'cp_m10_09']] }),
] });
function c10Marks() { const Z = FPS.g && FPS.g.isle && FPS.g.isle.zm, c = Z && Z.c10; return c || { crow: [10, 10], tower: [-10, 5], hang: [0, -15], x: [0, 0], land: [0, -30] }; }

// ---------- after Crowsnest (stage II's 'after'): away with half a hoard ----------
cpCineDef('m10_away', { music: 'cpm10cine', shots: [
  c10Live(5, (t, k) => { const M = c10Marks(), L = M.land; return { cam: c10Mix([L[0] * 0.7, L[1] * 0.7, 6], [L[0] * 0.85, L[1] * 0.85, 3], k), look: [L[0] * 1.6, L[1] * 1.6, 1] }; },
    { lines: [[0.3, 'mate', 'Half a hoard, and the Mooncussers’ lamp left on the lid to tell us whose the other half is.', 'cp_m10_10'], [3.2, 'crew', 'The Gallows Bird. Green lamp, black sails.', 'cp_m10_11']], fade: [0, 0.8] }),
] });

// ---------- Saltcote (stage IV's own cut): home under its light ----------
cpCineDef('m10_quay', { music: 'cpm10cine', shots: [
  c10Live(5.5, (t, k) => { const P = c10Port(); return { cam: c10Mix([P.land[0] * 1.5, P.land[1] * 1.5, 9], [P.land[0] * 1.15, P.land[1] * 1.15, 4], k), look: [P.table[0], P.table[1], 1.6] }; },
    { fade: [0.8, 0], lines: [[0.4, 'log', 'Saltcote’s lamps, and not a black sail behind us. They keep off its light, and nobody here will say why.', 'cp_m10_12']] }),
  c10Live(4.5, (t, k) => { const P = c10Port(), T = P.table; return { cam: c10Mix([T[0] + 4, T[1] + 5, 2.6], [T[0] + 2.6, T[1] + 3.4, 2], k), look: [T[0], T[1], 1.4] }; },
    { lines: [[0.3, 'factor', 'You’re back, and with something heavy. Bring it up to the table.', 'cp_m10_13']] }),
] });
function c10Port() { const Z = FPS.g && FPS.g.isle && FPS.g.isle.zm, c = Z && Z.c10; return c && c.table ? c : { land: [20, -30], table: [12, -26], boat: [24, -36] }; }

// ---------- the outro: weighed and paid ----------
cpCineDef('m10_outro', { music: 'cpm10cine', shots: [
  c10Live(5.5, (t, k) => { const P = c10Port(), T = P.table; return { cam: c10Mix([T[0] + 3.4, T[1] - 3, 2.2], [T[0] + 2.2, T[1] - 1.8, 1.8], k), look: [T[0], T[1], 1.0] }; },
    { lines: [[0.3, 'factor', 'Spanish gold, and English, and a little Dutch. It was somebody’s, once.', 'cp_m10_14'], [3.4, 'factor', 'Weighed, and written down, and paid.', 'cp_m10_15']], sfx: [[3.6, 'buy', 0.8], [0.8, 'chest', 0.6]] }),
  c10Live(5, (t, k) => { const P = c10Port(), T = P.table; return { cam: c10Mix([T[0] - 2, T[1] - 4, 3], [T[0] - 6, T[1] - 9, 7], k), look: [T[0], T[1], 1.4] }; },
    { lines: [[0.4, 'gilt', 'The chart was true, then. Gilt and Gull will remember the crew that proved it.', 'cp_m10_16']], f(t, k) { C10.paidShow = 1; } }),
  { d: 5, card: { eye: 'Mission complete', t: "Freebooters' Sea", sub: 'Spring 1889. The first crew out of Saltcote came home with the hold full.' },
    lines: [[0.5, 'log', 'They went out again, and others after them, all that summer, until the haar came down in the autumn.', 'cp_m10_17']] },
] });
