'use strict';
// The Chronicle of the Light, mission 10 (Freebooters' Sea): its two stages at sea, out to Crowsnest Rock and home.
// Both are the Gannet's Wake's cutter (src/gwsail.js) on Freebooters' Sea's Wide Water, through GWS_LEG as
// src/fbsail.js does it: the same fixed sea and its islands (FB_ISLES, fbSea, fbs3dBuild, and src/fbdress.js's looks),
// the same deck, helm, holes and flood, and her sailing never touched. The four swivel guns and the black sloops are
// src/fbguns.js's own (its hook, FA_HOOK, called from here: the stages say fbGuns, so its faOn counts them), with the
// sea's own few sloops left out (no faStock): the only sloops are the ones these stages put there.
//  - Out of Saltcote (cp_m10out): the chart's course, two legs. First north to Beacon Knoll (the mark on the strip is
//    the Knoll; pass it to starboard), then north-west to Crowsnest Rock. As the second leg begins a black sloop is
//    seen lying under the Knoll, watching (m10_watch): the Gallows Bird. She doesn't come on; this stage moves her
//    itself (c10ghost) and she sails off north. Run up on Crowsnest's beach and it's done.
//  - The Black Sloops (cp_m10home): from Crowsnest's landing, home. Some way out the sloops come out from under St
//    Brannoc's Isle (m10_ambush): the Gallows Bird (the quarry, gold on the strip, more planks, the other half of the
//    hoard aboard) and one or two more with her, more the more of you there are. Sink her (m10_down), haul the hoard
//    in from the water (the guns' own haul, into FB.hold), then run for Saltcote: inside its light the sloops bear
//    away and give it up. She can't beach at Saltcote until the hoard's aboard. If she sinks, the mission's lost.
// Together it's the Gannet's Wake's word (g* keys) and the guns' (fa* keys), as is, and the stages' own (c10: the leg,
// the phase, the quarry's id). Everything here runs on the host (or alone); joined screens follow the word.

const C10S = { KNOLL: [-370, 1985], KNOLL_R: 150, CROW: 7, BRANNOC: 3, AMBUSH_D: 330, AMBUSH_T: 40, CALM: 820, GHOST_T: 55 };
const C10_A0 = Math.atan2(FB_ISLES[0].y - FB_ISLES[7].y, FB_ISLES[0].x - FB_ISLES[7].x);   // (Crowsnest's landing: the side facing Saltcote)
fbLootKind('c10chest', { n: 'the Crowsnest hoard (what was left of it)', N: 'Crowsnest hoard', v: 900, shape: 'chest', col: '#4a3420', gilt: true });
fbLootKind('c10half', { n: 'the other half of the Crowsnest hoard', N: 'hoard strongbox', v: 1100, shape: 'box', col: '#2a2a2e' });

// ---------- the sea, as each stage wants it ----------
// (prep, every screen) GWS_LEG for a stage: the Wide Water, and what's particular to it
function c10Leg(o) {
  const sea = fbSea();
  GWS_LEG = Object.assign({ key: 'c10', n: 0, seed: FBS.SEED, rocks: sea.rocks.length, fog: FBS.SEE, maren: false, plim: false, sea, amb: FBS.AMB,
    look: 'cove', ground: FPS_ISLES.cove.ground, ground2: FPS_ISLES.cove.ground2, markIn: -1, isleR: 0, b3: fbs3dBuild, f3: fbs3d,
    prog: () => 0.25, spawnOk: () => { const B = RAID.st.B; return !B || Math.hypot(B.x - FB_ISLES[0].x, B.y - FB_ISLES[0].y) > FBS.CALM; },
    sunk: () => cpFail('She went down, and the hoard with her.'),
    row: () => ['HOLD', FB.hold.length ? `${FB.hold.length} · ${fbHoldValue().toLocaleString('en')} SOV` : 'EMPTY', FB.hold.length ? '#ffd88a' : null] }, o);
  FPS_ISLES.fbsail.fog = [FBS.FOGC, 600, 4200];
}
const c10V = () => { const S = RAID.st; return S && (S.V || S.B); };
const c10N = () => Math.max(1, (ZM.hum || []).length);
const c10Isle = i => FB_ISLES[i];
const c10Dist = (V, I) => Math.hypot(I.x - V.x, I.y - V.y) - I.r;
// the shared shape of both stages: the Gannet's Wake's cutter, with the guns' hooks after hers
function c10SeaStage(def) {
  const G = RAID_STAGES.gwsail;
  return Object.assign({}, G, {
    map: FBS_MAP, gws: true, fbGuns: true, mend: true,
    enter() {
      if (!GWS_LEG) def.prep();
      G.enter();
      // (the guns' state, fresh: no sloops but ours)
      Object.assign(FA, { sid: FB.sid, sl: [], fl: [], balls: [], ev: [], eseq: 0, evSeen: -1, seq: 0, bseq: 0, spT: 0, init: true, my: -1, fx: [], pend: 0, hauled: null });
      FA_HOOK.enter();
      def.enter();
    },
    tick(dt) { gwsTick(dt); c10Guns(dt); def.tick(dt); },
    me(dt) { gwsMe(dt); FA_HOOK.me(dt); if (def.me) def.me(dt); },
    q(sid, k, a) { if (FA_HOOK.q(sid, k, a)) return; gwsQ(sid, k, a); },
    pack(o) { gwsPack(o); FA_HOOK.pack(o); def.pack(o); },
    apply(o) { gwsApply(o); FA_HOOK.apply(o); def.apply(o); },
    consider(c) { gwsConsider(c); FA_HOOK.consider(c); },
    prompt(o) { return FA_HOOK.prompt(o) || gwsPrompt(o); },
    use(o) { return !!FA_HOOK.use(o) || gwsUse(o); },
    hud(phone, mono, fell) { gwsHud(phone, mono, fell); FA_HOOK.hud(phone, mono, fell); },
    b3(grp) { gws3dBuild(grp); try { if (typeof fbdDressSea === 'function') fbdDressSea(); } catch (e) { console.warn('c10 dress', e); } FA_HOOK.b3(grp); },
    f3(dt) { gws3d(dt); try { if (typeof fbdSeaTick === 'function') fbdSeaTick(); } catch (e) {} FA_HOOK.f3(dt); },
    exit() { FA_HOOK.exit(); FA.sl = []; FA.fl = []; gwsExit(); GWS_LEG = null; if (typeof GL3D !== 'undefined' && GL3D.scene) GL3D.scene.fog = null; },
    banner() { return { text: def.n, t: 4.5, sub: def.sub, col: '#ffd88a' }; },
  }, { n: def.n, music: def.music, prep: def.prep });
}
// (hosting or alone) the guns' own tick (src/fbguns.js FA_HOOK.tick) less the sea's own stock of sloops; a sloop this
// stage sails itself (c10ghost) is left to it
function c10Guns(dt) {
  const S = RAID.st, B = S.B; if (!B) return;
  for (const g of faGuns()) { if (g.rl > 0) g.rl = Math.max(0, g.rl - dt); if (g.by && (!ZM.hum.some(h => h[0] === g.by) || gwsIsDown(g.by))) g.by = ''; }
  for (const s of FA.sl) if (!s.c10ghost) { if (s.c10q && s.st === 0) s.st = 1; faSloopTick(s, dt, B, S); }
  FA.sl = FA.sl.filter(s => !(s.st === 2 && s.sinkT > FAC.SINK));
  FA.balls = FA.balls.filter(b => faBallHost(b, dt, B));
  for (const f of FA.fl) { f.t += dt; f.x += Math.sin(f.ph + f.t * 0.05) * 0.15 * dt; f.y += 0.1 * dt; }
  FA.fl = FA.fl.filter(f => f.t < FAC.FLOAT_T || f.k === 'c10half');
}

// ---------- I. Out of Saltcote ----------
function c10OutLeg() {
  const P = FB_ISLES[0], Sh = fbFreshShip(), K = c10Isle(5), C = c10Isle(C10S.CROW);
  c10Leg({ start: [Sh.x, Sh.y], h0: Sh.h, mark: C10S.KNOLL.slice(), isleR: 0, markIn: -1,
    landSay: 'She runs up on the shingle under Crowsnest Rock. Ashore!',
    arrive: () => cpDone(),
    markLab: () => { const S = RAID.st, V = c10V(); if (!V) return ''; return (S.c10leg | 0) ? `${C.n} · ${Math.max(0, Math.round(c10Dist(V, C)))} m` : `${K.n} · ${Math.max(0, Math.round(Math.hypot(C10S.KNOLL[0] - V.x, C10S.KNOLL[1] - V.y)))} m`; },
    line: (S, dm) => { const V = S.V || S.B;
      if (S.ph === 'beach') return 'She runs up on the shingle. Ashore…';
      if (S.ph === 'sunk') return 'She’s going down.';
      return (S.c10leg | 0) ? `The chart: north-west from the Knoll to ${C.n}, ${Math.max(0, Math.round(c10Dist(V, C))).toLocaleString('en')} m ${fbsSide(V, C.x, C.y)}`
        : `The chart: north by ${K.n}, its tower to starboard · ${Math.round(Math.hypot(C10S.KNOLL[0] - V.x, C10S.KNOLL[1] - V.y)).toLocaleString('en')} m ${fbsSide(V, C10S.KNOLL[0], C10S.KNOLL[1])}`; } });
  void P;
}
// (every screen) the strip's mark and the beach, from the leg
function c10OutMark() {
  const S = RAID.st, L = GWS_LEG; if (!L) return;
  if (S.c10leg | 0) { const C = c10Isle(C10S.CROW); L.mark = [C.x, C.y]; L.isleR = C.r; L.markIn = C.r + 34; } else { L.mark = C10S.KNOLL.slice(); L.isleR = 0; L.markIn = -1; }
}
cpStage('m10out', c10SeaStage({
  n: 'Out of Saltcote', sub: 'The keeper’s cutter, off Saltcote’s quay', music: () => 'cpm10sail',
  prep: c10OutLeg,
  enter() {
    Object.assign(RAID.st, { c10leg: 0, c10T: 0, c10ghost: 0, c10gT: 0, c10said: 0 });
    c10OutMark();
    if (ZM.net !== 'client') { cpObjective('Take the wheel and sail north for Beacon Knoll'); cpWaypoint(null); }
  },
  tick(dt) {
    const S = RAID.st, B = S.B; if (!B) return;
    S.c10T += dt;
    if (!S.c10said && S.c10T > 6) { S.c10said = 1; cpSay('mate', 'The rocks only show close to, or in a flare. Steer by the strip at the top, and patch what we hit.', 'cp_m10_18'); }
    if (!(S.c10leg | 0) && (Math.hypot(C10S.KNOLL[0] - B.x, C10S.KNOLL[1] - B.y) < C10S.KNOLL_R || B.y > C10S.KNOLL[1] + 40)) {
      S.c10leg = 1; c10OutMark();
      cpObjective('North-west for Crowsnest Rock, and run her up on its beach');
      // the Gallows Bird, lying under the Knoll's lee and watching
      const s = fbSloopSpawn(-300, 2245, { n: 'the Gallows Bird', hp: 99, h: 0.4, extra: true });
      if (s) { s.c10ghost = 1; s.v = 0.5; s.st = 0; S.c10ghost = s.id; S.c10gT = 0; }
      cpCine('m10_watch', () => { cpSay('mate', 'Let her watch. We’ve a chart to dig, and she hasn’t.', 'cp_m10_19'); });
    }
    // the watcher: she lies a while, then makes sail north, away; gone in a while
    const g = FA.sl.find(q => q.id === S.c10ghost);
    if (g) { S.c10gT += dt; if (S.c10gT > 8) { g.v = Math.min(9, g.v + dt * 0.8); g.h = wrapPi(g.h + angDiff(0.15, g.h) * Math.min(1, dt * 0.2)); } g.x += Math.sin(g.h) * g.v * dt; g.y += Math.cos(g.h) * g.v * dt; if (S.c10gT > C10S.GHOST_T) FA.sl.splice(FA.sl.indexOf(g), 1); }
  },
  pack(o) { const S = RAID.st; o.c10 = [S.c10leg | 0]; },
  apply(o) { if (Array.isArray(o.c10)) { const S = RAID.st, l = o.c10[0] | 0; if (l !== (S.c10leg | 0)) { S.c10leg = l; c10OutMark(); } } },
}));
// the watcher under the Knoll
const c10Ghost = () => FA.sl.find(s => s.n === 'the Gallows Bird') || null;
cpCineDef('m10_watch', { music: 'cpm10cine', shots: [
  c10Live(5.5, (t, k) => { const s = c10Ghost(), [u, v] = s ? c10Deck(s.x, s.y) : [120, 200], n = Math.hypot(u, v) || 1; return { cam: c10Mix([clamp(u / n * 4, -2.4, 2.4), clamp(v / n * 4, -6, 6) + 1, 3.4], [clamp(u / n * 9, -2.8, 2.8), clamp(v / n * 9, -8, 9), 3], k), look: [u, v, 3] }; },
    { lines: [[0.3, 'crew', 'Sail, under the Knoll. No lights.', 'cp_m10_20'], [2.4, 'mate', 'Not one. Only that green lamp at her stern. A black sloop, and she’s seen us.', 'cp_m10_21']] }),
  c10Live(5, (t, k) => { const s = c10Ghost(), [u, v] = s ? c10Deck(s.x, s.y) : [120, 200], n = Math.hypot(u, v) || 1, d = Math.min(Math.hypot(u, v) * 0.82, 260); return { cam: c10Mix([u / n * d - 20, v / n * d - 10, 6], [u / n * d - 14, v / n * d + 4, 4], k), look: [u, v, 4] }; },
    { lines: [[0.4, 'log', 'Nobody aboard one has ever been taken alive. In Saltcote they say the hanged men came down out of their chains to go back to sea.', 'cp_m10_22']], fade: [0.4, 0.6] }),
] });

// ---------- III. The Black Sloops ----------
function c10HomeLeg() {
  const C = c10Isle(C10S.CROW), P = FB_ISLES[0], d = C.r + 34, sx = C.x + Math.cos(C10_A0) * d, sy = C.y + Math.sin(C10_A0) * d;
  c10Leg({ start: [sx, sy], h0: bearingOf(P.x - sx, P.y - sy), mark: [P.x, P.y], isleR: P.r, markIn: -1,
    landSay: 'She comes in under Saltcote’s light. Home!',
    arrive: () => cpDone(),
    markLab: () => { const V = c10V(); return V ? `${P.n} · ${Math.max(0, Math.round(c10Dist(V, P)))} m` : ''; },
    line: (S) => { const V = S.V || S.B;
      if (S.ph === 'beach') return 'In under Saltcote’s light. Ashore…';
      if (S.ph === 'sunk') return 'She’s going down.';
      const ph = S.c10ph | 0, q = FA.sl.find(s => s.c10q);
      if (ph === 1 && q) return `${q.st === 2 ? 'She’s going down' : 'The Gallows Bird'}, ${Math.round(Math.hypot(q.x - V.x, q.y - V.y))} m ${fbsSide(V, q.x, q.y)} · ${q.st === 2 ? 'sinking' : `${q.hp} of ${q.max} planks`}`;
      if (ph === 2) { const f = FA.fl.find(x => x.k === 'c10half'); return f ? `The hoard is floating, ${Math.round(Math.hypot(f.x - V.x, f.y - V.y))} m ${fbsSide(V, f.x, f.y)}: bring her alongside and haul it in` : 'Haul in the hoard'; }
      return `Home to ${P.n}, ${Math.max(0, Math.round(c10Dist(V, P))).toLocaleString('en')} m ${fbsSide(V, P.x, P.y)}`; } });
}
// (every screen) Saltcote only takes her once the hoard's aboard
function c10HomeMark() { const S = RAID.st, L = GWS_LEG; if (!L) return; L.markIn = (S.c10ph | 0) >= 3 ? FB_ISLES[0].r + 38 : -1; }
cpStage('m10home', c10SeaStage({
  n: 'The Black Sloops', sub: 'Home from Crowsnest Rock, with half a hoard', music: () => (RAID.st.c10ph | 0) >= 1 && (RAID.st.c10ph | 0) < 3 ? 'cpm10fight' : 'cpm10sail',
  prep: c10HomeLeg,
  enter() {
    Object.assign(RAID.st, { c10ph: 0, c10T: 0, c10q: 0, c10said: 0, c10calm: 0 });
    c10HomeMark();
    if (ZM.net !== 'client') { cpObjective('Make sail for Saltcote'); cpWaypoint(null); if (!FB.hold.includes('c10chest')) FB.hold.push('c10chest'); }
  },
  tick(dt) {
    const S = RAID.st, B = S.B; if (!B) return;
    S.c10T += dt;
    const C = c10Isle(C10S.CROW), P = FB_ISLES[0], dP = c10Dist(B, P);
    if (!S.c10said && S.c10T > 5) { S.c10said = 1; cpSay('mate', 'Keep a hand on a gun. If she’s the Gallows Bird, she’ll want the rest of it.', 'cp_m10_23'); }
    // the ambush: some way out, out from under St Brannoc's
    if (!(S.c10ph | 0) && (Math.hypot(B.x - C.x, B.y - C.y) - C.r > C10S.AMBUSH_D || S.c10T > C10S.AMBUSH_T)) {
      S.c10ph = 1;
      const n = c10N(), at = (u, v) => faToSea(B, u, v);
      const [qx, qy] = at(-360, 300), q = fbSloopSpawn(qx, qy, { n: 'the Gallows Bird', quarry: 1, loot: ['c10half', 'greenlamp'], hp: 6 + 2 * (n - 1), chase: true, h: bearingOf(B.x - qx, B.y - qy) });
      if (q) { q.c10q = 1; S.c10q = q.id; }
      const ex = [[380, 240], [-120, -380], [420, -200]], names = ['the Corpse Candle', 'the Nightjar', 'the Wisp'];
      for (let i = 0; i < Math.min(3, n); i++) { const [x, y] = at(...ex[i]); fbSloopSpawn(x, y, { n: names[i], hp: 3 + (n > 2 ? 1 : 0), chase: true, h: bearingOf(B.x - x, B.y - y) }); }
      cpCine('m10_ambush', () => { cpObjective('Sink the Gallows Bird: man the swivel guns'); cpSay('mate', 'Guns! The gold-lamp ship is the Gallows Bird. Sink her and the rest is ours.', 'cp_m10_24'); });
    }
    const q = FA.sl.find(s => s.c10q);
    if ((S.c10ph | 0) === 1 && (!q || q.st === 2)) {
      S.c10ph = 2; c10HomeMark();
      cpCine('m10_down', () => { cpObjective('Bring her alongside the floating hoard and haul it in'); });
    }
    if ((S.c10ph | 0) === 2 && FB.hold.includes('c10half')) {
      S.c10ph = 3; c10HomeMark();
      cpObjective('Run for Saltcote’s light: the sloops won’t follow you in');
      cpSay('mate', 'Both halves aboard. Now run, and let them chase us into Saltcote’s light if they dare.', 'cp_m10_25');
    }
    // (the hoard, if it drifts off out of reach, never sinks: it floats where it is until it's hauled)
    // Saltcote's light: the sloops bear away and give it up
    if ((S.c10ph | 0) >= 1 && dP < C10S.CALM) {
      for (const s of FA.sl) if (s.st < 2 && !s.c10q) { s.st = 0; s.wp = [s.x + (s.x - P.x) * 3, Math.min(FBS.SEA[3] - 300, s.y + 900)]; s.wpT = 999; }
      if (!S.c10calm && FA.sl.some(s => s.st < 2)) { S.c10calm = 1; cpSay('crew', 'They’re bearing away! They won’t come near the light.', 'cp_m10_26'); }
    }
  },
  pack(o) { const S = RAID.st; o.c10 = [S.c10ph | 0, S.c10q | 0]; },
  apply(o) { if (Array.isArray(o.c10)) { const S = RAID.st, ph = o.c10[0] | 0; S.c10q = o.c10[1] | 0; if (ph !== (S.c10ph | 0)) { S.c10ph = ph; c10HomeMark(); } for (const s of FA.sl) s.c10q = s.id === S.c10q ? 1 : 0; } },
}));
const c10Quarry = () => FA.sl.find(s => s.c10q || s.id === RAID.st.c10q) || null;
cpCineDef('m10_ambush', { music: 'cpm10fight', shots: [
  c10Live(4.5, (t, k) => { const s = c10Quarry(), [u, v] = s ? c10Deck(s.x, s.y) : [-300, 300], n = Math.hypot(u, v) || 1; return { cam: c10Mix([u / n * 2, v / n * 2 - 1, 3.4], [u / n * 3.2, v / n * 3.2, 2.8], k), look: [u, v, 4] }; },
    { lines: [[0.2, 'crew', 'Sails! Out from under St Brannoc’s, black as tar.', 'cp_m10_27']], sfx: [[0.3, 'mooncusser', 0.7]] }),
  c10Live(5.5, (t, k) => { const s = c10Quarry(), [u, v] = s ? c10Deck(s.x, s.y) : [-300, 300], n = Math.hypot(u, v) || 1, d = Math.hypot(u, v); return { cam: c10Mix([u - u / n * 26 + 8, v - v / n * 26, 7], [u - u / n * 16 + 4, v - v / n * 16, 3], k), look: [u, v, 5] }; },
    { lines: [[0.3, 'moon', 'Give it back, keeper’s men. The sea only lent it you.', 'cp_m10_28'], [3.3, 'mate', 'A gold lamp at her masthead. That’s the Gallows Bird.', 'cp_m10_29']], fade: [0.3, 0] }),
] });
cpCineDef('m10_down', { music: 'cpm10cine', shots: [
  c10Live(4.5, (t, k) => { const s = c10Quarry(), [u, v] = s ? c10Deck(s.x, s.y) : [-60, 60], n = Math.hypot(u, v) || 1; return { cam: c10Mix([u - u / n * 30, v - v / n * 30, 5], [u - u / n * 22, v - v / n * 22, 3], k), look: [u, v, 1] }; },
    { lines: [[0.3, 'crew', 'She’s holed through! Down by the stern!', 'cp_m10_30'], [2.4, 'mate', 'And there it floats. Bring us alongside, and haul it in at the rail.', 'cp_m10_31']], sfx: [[0.2, 'debris', 0.8], [1.2, 'splash', 0.7]] }),
] });
