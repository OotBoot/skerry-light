'use strict';
// The Chronicle of the Light, mission 7: Wreckers' Night (1888). Not the Wreckers' Night of the islands (everyone
// for himself), but a night of it seen from the other side: the Receiver of Wreck's boat crew, together, against the
// wrecker gangs and the drowned, on a dark night on the Bonded Quay (src/fpsisle.js's customs yard, the same high
// walls, the same grid of tarpaulined stacks and the crane on its plinth, and here also the waterfront outside it:
// the quay's edge and its steps, the warehouse fronts, the Customs House, the quay bell). The Gannet's dead sent their
// sea chests ashore the night she struck; they're in the yard, and they belong to the widows.
//  I.   The Waterfront (cp_m07quay): the lamp is out. Land at the quay steps from the Receiver's gig. Kittow's men
//       hold the quay with a lantern each: they see you only close to, or if you're lit (a flare), or hear your shots
//       (src/cpm02g.js's gang, with CPG.sees and CPG.lit set here). Clear the quay, then lift the bar on the yard
//       gate (hold Use).
//  II.  The Bonded Quay (cp_m07yard): the Light is lit again (a cutscene first). Its beam comes round every six
//       and a half seconds (CP7.PERIOD) and for a moment shows everything it crosses that isn't in the shadow of a
//       wall or a stack: you to the wreckers, the wreckers to you, and the Gannet's three sea chests, hidden among the
//       stacks (they glint, and are marked). Black Nell's gang hold the yard. Carry each chest (Use to lift it,
//       slow under it) out of the gate to the gig at the steps. Once one is aboard, the drowned come up the steps.
//  III. Black Nell (cp_m07nell, src/cpm07b.js): she comes along the quay for what she thinks is hers, with her
//       longarm and her flares. Put her down.
// Light, everywhere: the flare lockers (hold Use: a flare goes up and lights a wide circle for everyone, for a while),
// and the quay bell (hold Use: every wrecker on the quay is shown to everyone for a few seconds, every one of them
// knows where you are, and the drowned near it sink; then it must be let quiet a while).
// Cinematics (src/cpm07c.js): the intro, the Light relit (after I), Black Nell (as III begins), the outro.
// Together: host-authoritative as the rest (m7: the light's state, flares, the bell, chests and who carries them);
// a joined player asks the host (raidAsk 'gate', 'flare', 'bell', 'lift', 'noise').

cpCast('recv', { n: 'Mr Tregear, the Receiver', c: '#b8d0e0' });
cpCast('nell', { n: 'Black Nell', c: '#e88070' });
Object.assign(CP_MUSIC_FALL, { cpm07dark: 'raidcave', cpm07yard: 'gwhold', cpm07nell: 'frboss', cpm07sad: 'raidpier' });

cpMission({ id: 'm07', act: 3, n: "Wreckers' Night", when: '1888', where: 'The Bonded Quay',
  blurb: 'A night the lamp is dark. The Gannet’s dead sent their sea chests ashore, and the wrecker gangs hold the quay. Go in with the Receiver of Wreck’s crew, in the dark, and bring the chests out to the gig for the widows.',
  stages: ['cp_m07quay', 'cp_m07yard', 'cp_m07nell'], intro: 'm07_intro', outro: 'm07_outro',
  after: { 0: 'm07_lamp' }, cut: { 2: 'm07_nell' }, music: { default: 'cpm07dark' }, lives: 2,
  begin() { cplReset(); CPG.sees = null; CPG.lit = null; CPG.atGoal = null; cpgMoonless(true); },
  stop() { cplReset(); CPG.sees = null; CPG.lit = null; CPG.atGoal = null; CPG.onFlare = null; cpgMoonless(false); if (typeof GL3D !== 'undefined' && GL3D.sea) GL3D.sea.visible = true; },
});

const CP7 = { R: 72, EDGE: -30, YC: 22, S: 22, GATE: 3, STEPS: [12, -28.6], START: [12, -26.5], PERIOD: 6.5, HALF: 0.16, LIGHT: [0, -640 + 0], FLARE_T: 20, FLARE_R: 30, BELL_CD: 30, BELL_T: 6, LIFT: 0.8, GATE_T: 3, CARRY_K: 0.72,
  BELL: [-37, -17], LOCKERS: [[33, -7], [-15, 39], [-8, -22]], SEE: 9, SEE_LIT: 30 };
// where the chests might be: in the lanes between the stacks (three of these, chosen by the host)
const CP7_SPOTS = [[-10.4, 32.4], [10.6, 11.5], [-15.6, 13.6], [15.5, 32.6], [-5.4, 38.5], [19.2, 20.6], [-19.3, 30.4], [5.2, 4.3], [0, 40.6], [-11, 5.5]];

// ---------- the look: the Bonded Quay's own colours; its ground drawn by the stage (the quay over the water) ----------
FPS_ISLES.cpm07 = Object.assign({}, FPS_ISLES.quay, { name: 'the Bonded Quay', fog: ['#0b0a09', 30, 300], indoor: true, noGround: true, keep: true, arena: false, nLights: 6, birds: ['bat', 0], sky: '60,60,70', skyA: 0.04 });
// a warehouse: a long brick range, its front on the quay, doors and loading hatches, a slate roof
FPI_K.cp7ware = {
  col: '#4a3a30',
  sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh)]; },
  b3(p, A) {
    const w = p.w, d = p.d, hh = p.hh, brick = p.c || '#5a3e32';
    A.box(brick, 0, 0, 0, w, d, hh);
    A.box('#3a2e28', 0, 0, hh, w + 0.4, d + 0.4, 0.3);
    A.part('tri', '#2a2a30', 0, 0, hh + 1.6, d * 0.62, w + 0.2, 3.2, 0, 0, Math.PI / 2);
    // the front (along -v): doors at the foot, hatches above with a hoist beam, a painted name board
    for (let u = -w / 2 + 3.5; u < w / 2 - 2; u += 7) {
      A.box('#2a1e16', u, -d / 2 - 0.02, 0, 2.6, 0.12, 3.2);
      A.box('#3a2a1c', u, -d / 2 - 0.05, 0.05, 2.4, 0.1, 3.0);
      A.box('#1e1814', u, -d / 2 - 0.02, 4.6, 1.6, 0.1, 1.8);
      A.box(FPI_C.wood3, u, -d / 2 - 0.9, hh - 1.2, 0.2, 1.8, 0.25);
    }
    if (p.board) A.box('#2a3a2e', 0, -d / 2 - 0.06, hh - 2.6, Math.min(w * 0.5, 12), 0.08, 0.9);
  },
};
// the yard gate: two great timber leaves on iron hinges; shut, with the bar across, or swung back
FPI_K.cp7gate = {
  col: FPI_C.wood3,
  sol(p) { return p.open ? [fpiBox(p, -2.9, -1.6, 0.15, 1.5, 3.8), fpiBox(p, 2.9, -1.6, 0.15, 1.5, 3.8)] : [fpiBox(p, 0, 0, p.w / 2, 0.25, 3.8)]; },
  b3(p, A) {
    const hw = p.w / 2;
    if (p.open) for (const s of [-1, 1]) { A.box(FPI_C.wood3, s * (hw - 0.1), -1.5, 0, 0.2, 3.0, 3.8); for (const z of [0.6, 3.0]) A.box(FPI_C.iron, s * (hw - 0.1) - s * 0.12, -1.5, z, 0.04, 3.0, 0.14); }
    else {
      for (const s of [-1, 1]) { A.box(FPI_C.wood3, s * hw / 2, 0, 0, hw - 0.05, 0.3, 3.8); for (const z of [0.6, 3.0]) A.box(FPI_C.iron, s * hw / 2, -0.17, z, hw - 0.1, 0.04, 0.14); }
      A.box(FPI_C.wood2, 0, -0.32, 1.5, p.w * 0.8, 0.22, 0.3);
      for (const s of [-1, 1]) A.box(FPI_C.iron, s * p.w * 0.36, -0.36, 1.35, 0.12, 0.12, 0.6);
    }
  },
};
// a flare locker: a painted box on a post, its lid, a red band
FPI_K.cp7lock = {
  col: '#6a2a20',
  sol(p) { return [fpiBox(p, 0, 0, 0.4, 0.3, 1.3)]; },
  b3(p, A) { A.box(FPI_C.wood3, 0, 0, 0, 0.18, 0.18, 0.7); A.box('#7a2a22', 0, 0, 0.7, 0.8, 0.6, 0.6); A.box('#c8b080', 0, -0.31, 0.95, 0.8, 0.02, 0.1); A.box('#5a2018', 0, 0, 1.3, 0.85, 0.65, 0.06); },
};
// the quay bell: a ship's bell in an iron frame by the Customs House door
FPI_K.cp7bell = {
  col: FPI_C.iron,
  sol(p) { return [fpiCirc(p, 0, 0, 0.35, 2.4)]; },
  b3(p, A) { A.box(FPI_C.iron, -0.5, 0, 0, 0.1, 0.1, 2.4); A.box(FPI_C.iron, 0.5, 0, 0, 0.1, 0.1, 2.4); A.box(FPI_C.iron, 0, 0, 2.35, 1.1, 0.12, 0.12); A.part('cone', '#a8862c', 0, 0, 1.95, 0.55, 0.62, 0.55); A.part('sph', '#a8862c', 0, 0, 2.2, 0.36, 0.3, 0.36); A.box(FPI_C.rope, 0, 0, 1.1, 0.03, 0.03, 0.6); },
};
// a bollard on the quay's edge
FPI_K.cp7boll = { col: FPI_C.iron, sol(p) { return [fpiCirc(p, 0, 0, 0.32, 0.8)]; }, b3(p, A) { A.cyl('#24262a', 0, 0, 0, 0.3, 0.75, 0, 0, 0, 'cyl8'); A.cyl('#24262a', 0, 0, 0.7, 0.38, 0.12, 0, 0, 0, 'cyl8'); } };
FPI_GEN.cpm07 = {
  built: true,
  set(H) {
    const { CX, CY, R, rng } = H, YC = CP7.YC, S = CP7.S, at = (x, y) => [CX + x, CY + y];
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    const open = RAID_ORDER[RAID.stage] !== 'cp_m07quay';
    // the yard's walls: the warehouses' high backs, the gate in the south wall onto the quay
    const ww = { hh: 4.2, jag: 0.04, th: 0.9, mat: 'stone', cap: true };
    H.wall(...at(-S, YC + S), ...at(S, YC + S), ww);
    H.wall(...at(-S, YC - S), ...at(S, YC - S), ww, [[0.5 - CP7.GATE / (2 * S), 0.5 + CP7.GATE / (2 * S)]]);
    H.wall(...at(-S, YC - S), ...at(-S, YC + S), ww); H.wall(...at(S, YC - S), ...at(S, YC + S), ww);
    H.put('cp7gate', ...at(0, YC - S), 0, { w: CP7.GATE * 2, open });
    // its stacks, as ever: a four by four grid, the middle four cleared round the crane, the customs hut's corner
    const cells = [-15.5, -5.2, 5.2, 15.5];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if ((i === 1 || i === 2) && (j === 1 || j === 2)) continue;
      if (i === 0 && j === 0) continue;
      const along = (i + j) % 2 === 0, two = rng() < 0.55, [x, y] = at(cells[i] + R(-0.5, 0.5), YC + cells[j] + R(-0.5, 0.5));
      fpiCargo(H, x, y, (along ? 0 : Math.PI / 2) + R(-0.05, 0.05), R(4.8, 5.6), two);
    }
    for (const [u, v, ra] of [[-5, 0.5, Math.PI / 2], [5, -0.5, Math.PI / 2], [0.5, 5.5, 0], [-0.5, -5.5, 0]]) { const [x, y] = at(u, YC + v); H.put('cargo', x, y, ra, { len: 2.6, wd: 1.3, hh: 1.15, tarp: '#4a4a3a' }); }
    H.put('crane', ...at(0, YC), 0.6, {});
    fpiCottage(H, ...at(-S + 4.2, YC - S + 3.5), 0, { w: 6, d: 4.6, doors: [['b', 1.4]], windows: [['r', -0.8, 0.8], ['b', -2, -0.8]], mat: 'wood', dark: true });
    for (const [u, v] of [[0, S - 1.4], [S - 1.4, 0]]) fpiLanternPost(H, ...at(u, YC + v), 0);
    // the waterfront: the warehouse fronts either side of the yard, the Customs House, the quay's edge and its steps
    H.put('cp7ware', ...at(-44, 18), 0, { w: 40, d: 34, hh: 8.5, board: true, c: '#5a3e32' });
    H.put('cp7ware', ...at(44, 18), 0, { w: 40, d: 34, hh: 9.5, board: true, c: '#4e3a30' });
    H.put('cp7ware', ...at(-50, -11), 0, { w: 14, d: 9, hh: 7, c: '#6a6458' });   // (the Customs House)
    H.put('cp7bell', ...at(...CP7.BELL), 0, {});
    for (let x = -62; x <= 62; x += 8.5) if (Math.abs(x - CP7.STEPS[0]) > 4) H.put('cp7boll', ...at(x, CP7.EDGE + 1.0), 0, {});
    // what's been landed on the quay: stacks, fish boxes, a cart, barrels, the quay crane
    for (const [x, y, a, len, two] of [[-8, -15, 0, 5.4, true], [30, -18, Math.PI / 2, 4.8, false], [-28, -6, Math.PI / 2, 5, true], [44, -6, 0, 4.6, false]]) fpiCargo(H, ...at(x, y), a, len, two);
    H.put('crane', ...at(-22, -24), 2.2, {});
    fpiCrates(H, ...at(22, -9), true); fpiBarrels(H, ...at(-40, -24)); fpiBarrels(H, ...at(52, -20)); fpiCrates(H, ...at(-2, -25), false);
    H.put('cart', ...at(6, -10), 0.4, {});
    CP7.LOCKERS.forEach(([x, y]) => H.put('cp7lock', ...at(x, y), 0, {}));
    H.track([at(12, -28), at(4, -12), at(0, -2), at(0, 10)]);
    Z.cp7 = {};
  },
  decor() {},
};
const CP7_MAP = { start: CP7.START, top: 0, R: CP7.R, isle: 'cpm07', seed: 0x7b0d, shore: () => -999, nav: [-66, 66, CP7.EDGE - 2, 48], zones: { q: { n: 'the Bonded Quay', r: [-66, 66, CP7.EDGE, 48], sky: true } } };
const cp7N = () => Math.max(1, ZM.hum.length);
const cp7W = (x, y) => [FPSC.CX + x, FPSC.CY + y];
function cp7Block(x, y) { const u = x - FPSC.CX, v = y - FPSC.CY; return v < CP7.EDGE + 0.5 || v > 47 || Math.abs(u) > 65; }

// ---------- light: the beam, the flares, the bell ----------
// the Light's beam: round every CP7.PERIOD seconds from the Light (a long way south of the quay), on the shared clock;
// lit: in it, and not in the shadow of anything solid between you and the Light
function cp7BeamA() { return wrapPi((RAID.ct || RAID.t || 0) / CP7.PERIOD * Math.PI * 2); }
function cp7BeamOn() { return !!RAID.st.beam || !!CP7.cineBeam; }   // (cineBeam: lit in a cinematic, src/cpm07c.js)
function cp7InBeam(x, y) { if (!cp7BeamOn()) return 0; const L = CP7.LIGHT, b = bearingOf(x - FPSC.CX - L[0], y - FPSC.CY - L[1]); const d = Math.abs(angDiff(b, cp7BeamA())); return d < CP7.HALF ? 1 - d / CP7.HALF : 0; }
function cp7Shadow(x, y) { const L = CP7.LIGHT, h = bearingOf(FPSC.CX + L[0] - x, FPSC.CY + L[1] - y), r = fpsRay(x, y, FPSC.GROUND + 1.2, h, 0.25, null, [], 40); return r.kind !== 'none' && r.t < 40; }
// (the beam comes in over the walls, steeply enough that a wall's shadow is a dozen metres deep and a stack's a few)
function cp7FlareAt(x, y) { let b = 0; for (const f of RAID.st.fl || []) { if (!(f[2] > 0)) continue; const d = Math.hypot(x - FPSC.CX - f[0], y - FPSC.CY - f[1]); if (d < CP7.FLARE_R) b = Math.max(b, (1 - d / CP7.FLARE_R) * Math.min(1, f[2] / 1.5) * 1.4); } return Math.min(1, b); }
// how lit a place is now (0 to 1): the beam (unless shadowed), a flare, the bell's ringing
function cp7Lit(x, y) { let k = cp7FlareAt(x, y); const b = cp7InBeam(x, y); if (b > 0 && !cp7Shadow(x, y)) k = Math.max(k, b); if ((RAID.st.bellT || 0) > 0) k = Math.max(k, 0.6);
  // (and a wrecker's lantern lights whoever stands close by it)
  for (const z of cp7Gang()) if (Math.hypot(z.x - x, z.y - y) < 4.5) { k = Math.max(k, 0.45); break; }
  return k; }
function cp7Gang() { return ZM.z.filter(z => (z.bt === 'cpgang' || z.bt === 'cpnell') && !z.dead && !z.gone); }
// (the gang's eyes) close to, or lit and in range
function cp7Sees(z, p, d) { return d < CP7.SEE || (d < CP7.SEE_LIT && cp7Lit(p.x, p.y) > 0.3); }
// (hosting) a flare up from a locker (or from Nell, over whoever she likes): [x, y, seconds left]
function cp7Flare(x, y, t) { const S = RAID.st; S.fl = (S.fl || []).filter(f => f[2] > 0); S.fl.push([x, y, t || CP7.FLARE_T]); S.flN = (S.flN | 0) + 1; S.flSeen = S.flN; try { if (!sfxPlay('flare_rocket', { vol: 0.85, out: true })) sfxFlare(); } catch (e) {} for (const z of cp7Gang()) if (Math.hypot(z.x - FPSC.CX - x, z.y - FPSC.CY - y) < CP7.FLARE_R) z.shownT = CP7.FLARE_T; }
// (hosting) the bell rung: every wrecker shown and knowing where it was rung; the drowned near it sink
function cp7Bell(sid) {
  const S = RAID.st; if ((S.bellCd || 0) > 0) return;
  S.bellCd = CP7.BELL_CD; S.bellT = CP7.BELL_T; S.bellN = (S.bellN | 0) + 1; S.bellSeen = S.bellN; try { sfxBell(); } catch (e) {}
  const [bx, by] = cp7W(...CP7.BELL);
  for (const z of cp7Gang()) { cpgWake(z); z.goal = null; }
  for (const z of ZM.z) if (!z.dead && !z.boss && Math.hypot(z.x - bx, z.y - by) < 16) { z.dead = 1; z.deadT = 0; zmKillFx(z); }
  if (!S.said.bell) { S.said.bell = 1; cpSay('recv', 'The bell! Every soul on the quay heard that.', 'cp_m07_16'); }
  cp7Feed(`${cp7Nick(sid)} rang the quay bell.`);
}
const cp7Nick = sid => !ZM.net ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
function cp7Feed(text) { fpsFeed(text); if (ZM.net === 'host' && typeof zmnEvent === 'function') zmnEvent('feed', text); }
// (every screen, each frame) the light's own clocks: flares burning down, the bell's echo, the gang shown
function cp7LightTick(dt) {
  const S = RAID.st;
  for (const f of S.fl || []) f[2] -= dt;
  if (S.bellT > 0) S.bellT -= dt; if (S.bellCd > 0) S.bellCd -= dt;
  // (what the beam shows: the gang, for a moment; and, hosting, whoever it shows to them)
  const bk = cp7BeamOn() ? cp7InBeam(FPSC.CX, FPSC.CY + 10) : 0;
  if (bk > 0 && !CP7.pass) { CP7.pass = true; for (const z of cp7Gang()) if (!cp7Shadow(z.x, z.y)) z.shownT = Math.max(z.shownT || 0, 1.6); if (ZM.net !== 'client') cp7BeamPass(); }
  if (bk <= 0) CP7.pass = false;
  for (const z of ZM.z) if (z.shownT > 0) z.shownT -= dt;
  if (S.bellT > 0) for (const z of cp7Gang()) z.shownT = Math.max(z.shownT || 0, 0.3);
}
// (hosting) the beam passes: each of you it shows, the gang near you see
function cp7BeamPass() { for (const p of ZM.players || []) { if (cp7Shadow(p.x, p.y)) continue; for (const z of cp7Gang()) if (!z.aware && Math.hypot(z.x - p.x, z.y - p.y) < CP7.SEE_LIT) cpgWake(z); } if (RAID.stage === 1) cp7ChestPass(); }
// the light's state into the word, and out
function cp7LightPack(o) { const S = RAID.st; o.m7l = [S.beam ? 1 : 0, (S.fl || []).filter(f => f[2] > 0).map(f => [Math.round(f[0]), Math.round(f[1]), Math.round(f[2] * 10)]), Math.round((S.bellT || 0) * 10), Math.round((S.bellCd || 0) * 10), S.bellN | 0, cp7Gang().filter(z => z.shownT > 0).map(z => z.zn), S.flN | 0]; }
function cp7LightApply(o) {
  const S = RAID.st, a = o.m7l; if (!Array.isArray(a)) return;
  S.beam = !!a[0]; S.fl = Array.isArray(a[1]) ? a[1].map(f => [+f[0] || 0, +f[1] || 0, (+f[2] || 0) / 10]) : []; S.bellT = (a[2] | 0) / 10; S.bellCd = (a[3] | 0) / 10;
  if ((a[4] | 0) > (S.bellSeen | 0)) { S.bellSeen = a[4] | 0; try { sfxBell(); } catch (e) {} }
  if ((a[6] | 0) > (S.flSeen | 0)) { S.flSeen = a[6] | 0; try { if (!sfxPlay('flare_rocket', { vol: 0.85, out: true })) sfxFlare(); } catch (e) {} }
  if (Array.isArray(a[5])) for (const zn of a[5]) { const z = ZM.z.find(q => q.zn === zn); if (z) z.shownT = Math.max(z.shownT || 0, 0.4); }
}
// (every screen) the lockers and the bell, to use; the gate, in Part I
function cp7Consider(c) {
  const S = RAID.st;
  CP7.LOCKERS.forEach(([x, y], i) => { if (!((S.lk || [])[i] > 0)) c({ k: 'cp7lk', i }, ...cp7W(x, y - 0.6), 0, 2.2, false); });
  if (!((S.bellCd || 0) > 0)) c({ k: 'cp7bell' }, ...cp7W(CP7.BELL[0], CP7.BELL[1] - 0.8), 0, 2.4, false);
}
function cp7Prompt(o) {
  if (o.k === 'cp7lk') return { text: 'Hold to send up a flare', hold: true };
  if (o.k === 'cp7bell') return { text: 'Hold to ring the quay bell', hold: true };
  return null;
}
function cp7UseTick(dt, extra) {
  const o = ZM.near, k = o && o.k;
  const need = k === 'cp7lk' ? 0.8 : k === 'cp7bell' ? 0.8 : extra && o ? extra(o) : 0;
  cphTick(dt, o, need, o => { if (o.k === 'cp7lk') raidAsk('flare', o.i); else if (o.k === 'cp7bell') raidAsk('bell'); else if (CP7.useDone) CP7.useDone(o); });
}
// (hosting) the asks every part shares
function cp7Q(sid, k, a) {
  const S = RAID.st;
  if (cpgAsk(k, a)) return true;
  if (k === 'flare') { const i = a | 0; S.lk = S.lk || [0, 0, 0]; if (S.lk[i] > 0 || !CP7.LOCKERS[i]) return true; S.lk[i] = 45; const [x, y] = CP7.LOCKERS[i], m = [0, 18]; cp7Flare(x + (m[0] - x) * 0.25, y + (m[1] - y) * 0.25); cp7Feed(`${cp7Nick(sid)} sent up a flare.`); return true; }
  if (k === 'bell') { cp7Bell(sid); return true; }
  return false;
}
function cp7LockTick(dt) { const S = RAID.st; if (S.lk) for (let i = 0; i < S.lk.length; i++) if (S.lk[i] > 0) S.lk[i] -= dt; }
const cp7LockPack = o => { o.m7k = (RAID.st.lk || [0, 0, 0]).map(v => Math.round(Math.max(0, v))); };
const cp7LockApply = o => { if (Array.isArray(o.m7k)) RAID.st.lk = o.m7k.map(v => +v || 0); };

// ---------- the quay in 3D: its ground and the water, the Light far out with its beam, the flares, the gig ----------
const CP73 = { ok: false };
function cp7Build3D(grp) {
  CP73.ok = true;
  const CX = FPSC.CX, CY = FPSC.CY, G0 = FPSC.GROUND, E = CP7.EDGE;
  const box = (c, x, y, z0, w, d, h) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? z3Lam(c) : c); b.position.copy(z3v(CX + x, CY + y, G0 + z0 + h / 2)); grp.add(b); return b; };
  // the quay's setts and the yard's flags; the edge's coping stones and the face of the quay wall, the steps
  box('#4e4a44', 0, 10, -1, 150, 80, 1);
  box('#5a554c', 0, CP7.YC, -0.98, CP7.S * 2, CP7.S * 2, 1);
  for (let x = -66; x < 66; x += 2.2) box(fpiHash(x * 3 | 0, 7) < 0.5 ? '#6a645a' : '#5e5a52', x + 1.1, E + 0.5, -0.95, 2.1, 1.0, 1.0);
  box('#3a3632', 0, E - 0.6, -5, 150, 1.2, 5);
  for (let i = 0; i < 7; i++) box('#5e5a52', CP7.STEPS[0], E - 0.6 - i * 0.55, -0.4 - i * 0.42, 3.6, 0.55, 0.42);
  // the water: dark, lapping at the quay wall
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshPhongMaterial({ color: 0x050a10, specular: 0x5a6878, shininess: 70, emissive: 0x010204 }));
  sea.rotation.x = -Math.PI / 2; sea.position.copy(z3v(CX, CY + E - 2000, G0 - 3.2)); grp.add(sea);
  CP73.foam = new THREE.Mesh(new THREE.PlaneGeometry(150, 1.2), new THREE.MeshBasicMaterial({ color: 0x8a9aa0, transparent: true, opacity: 0.15, depthWrite: false })); CP73.foam.rotation.x = -Math.PI / 2; CP73.foam.position.copy(z3v(CX, CY + E - 1.8, G0 - 3.15)); grp.add(CP73.foam);
  // the lamp standards along the quay, unlit
  for (const x of [-50, -20, 26, 50]) { box('#1e2024', x, E + 3.5, 0, 0.16, 0.16, 3.6); box('#1e2024', x, E + 3.5, 3.6, 0.42, 0.42, 0.55); }
  // the Receiver's gig at the steps
  { const G = CP73.gig = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 6.5), z3Lam('#2a3a4a')); G.add(hull); const rim = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 6.6), z3Lam('#c8c0a8')); rim.position.y = 0.38; G.add(rim); for (const z of [-1.5, 0, 1.5]) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.3), z3Lam('#4a3a2a')); t.position.set(0, 0.25, z); G.add(t); }
    G.position.copy(z3v(CX + CP7.STEPS[0] + 2.4, CY + E - 3.8, G0 - 3.0)); G.rotation.y = 0.15; grp.add(G); CP73.gigChests = []; }
  // the Light, far out to the south, and its beam
  {
    const L = CP7.LIGHT, T = new THREE.Group(); T.position.copy(z3v(CX + L[0], CY + L[1], G0 - 3)); grp.add(T);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 26, 12), new THREE.MeshLambertMaterial({ color: 0xd8d4c8 })); tw.position.y = 13 + 4; T.add(tw);
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(10, 16, 6, 9), z3Lam('#2a2a28')); rock.position.y = 2; T.add(rock);
    CP73.lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,236,190,0.95)', 'rgba(255,236,190,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); CP73.lamp.position.y = 32; CP73.lamp.scale.setScalar(30); T.add(CP73.lamp);
    const bm = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(150, 2, 1400, 20, 1, true), bm); cone.rotation.x = Math.PI / 2; cone.position.z = -700;
    CP73.beam = new THREE.Group(); CP73.beam.position.y = 32; CP73.beam.add(cone); T.add(CP73.beam); CP73.beamM = bm;
    CP73.sun = new THREE.DirectionalLight(0xfff0d0, 0); CP73.sun.position.copy(z3v(CX + L[0], CY + L[1], G0 + 60)); CP73.sun.target.position.copy(z3v(CX, CY, G0)); grp.add(CP73.sun); grp.add(CP73.sun.target);
  }
  // the flares: up to three burning at once, each a glare in the sky and a light on the ground
  CP73.fl = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,120,90,0.95)', 'rgba(255,120,90,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(6); s.visible = false; grp.add(s); const l = new THREE.PointLight(0xff8a6a, 0, CP7.FLARE_R * 1.6, 1.2); grp.add(l); return { s, l }; });
  // the chests (Part II): built by the stage
  if (typeof cp7ChestBuild === 'function') cp7ChestBuild(grp);
}
function cp7Frame3D(dt) {
  if (!CP73.ok || typeof GL3D === 'undefined') return;
  const t = g.t, S = RAID.st, CX = FPSC.CX, CY = FPSC.CY, G0 = FPSC.GROUND;
  if (GL3D.sea && GL3D.sea.visible) GL3D.sea.visible = false;
  // the beam: turning, and lighting the quay for the moment it's across it
  const on = cp7BeamOn(), bk = on ? cp7InBeam(CX, CY + 10) : 0;
  CP73.beam.visible = on; CP73.beam.rotation.y = -cp7BeamA(); CP73.lamp.material.opacity = on ? 0.9 : 0.12; CP73.lamp.scale.setScalar(on ? 30 : 8);
  CP73.sun.intensity = bk * 1.6;
  let fk = 0;
  CP73.fl.forEach((F, i) => {
    const f = (S.fl || []).filter(q => q[2] > 0)[i];
    F.s.visible = !!f; F.l.intensity = 0;
    if (!f) return;
    const left = f[2], up = Math.min(1, (CP7.FLARE_T - left) / 1.2), zz = 4 + up * 22 - Math.max(0, CP7.FLARE_T - left - 1.2) * 0.6, k = Math.min(1, left / 1.5) * (0.85 + 0.15 * Math.sin(t * 23 + i));
    F.s.position.copy(z3v(CX + f[0], CY + f[1], G0 + zz)); F.s.scale.setScalar(5 + 3 * k); F.s.material.opacity = k;
    F.l.position.copy(F.s.position); F.l.intensity = 2.2 * k; fk = Math.max(fk, k * Math.max(0, 1 - Math.hypot(FPS.me.x - CX - f[0], FPS.me.y - CY - f[1]) / 60));
  });
  // (CP7.dawn: the grey of the morning coming up, in the outro)
  const dw = CP7.dawn || 0;
  GL3D.amb.intensity = 0.26 + 0.3 * bk + 0.22 * fk + ((S.bellT || 0) > 0 ? 0.05 : 0) + dw * 0.5; GL3D.moon.intensity = 0.03;
  if (GL3D.scene.fog) { const F = GL3D.scene.fog, k = Math.max(bk * 0.7, fk * 0.5, dw); F.color.setRGB(0.02 + 0.06 * k + dw * 0.12, 0.02 + 0.055 * k + dw * 0.12, 0.025 + 0.05 * k + dw * 0.15); F.near = 20; F.far = 260 + 300 * k; RAID.fog0 = true; }
  CP73.foam.material.opacity = 0.1 + 0.06 * Math.sin(t * 1.4);
  if (CP73.gig) { CP73.gig.position.y = G0 - 3.0 + Math.sin(t * 1.2) * 0.08; CP73.gig.rotation.z = Math.sin(t * 0.9) * 0.03; }
  cplTick3D(dt);
}
// (on top) the gang the light shows: a mark over each, as the bell's pings on the islands
function cp7ShownHud(phone) {
  for (const z of ZM.z) {
    if (!(z.shownT > 0) || z.dead || (z.bt !== 'cpgang' && z.bt !== 'cpnell')) continue;
    const c = cam(z.x, z.y, FPSC.GROUND + (z.jz || 0) + 2.25); if (c.f < 0.5) continue;
    const p = proj(c), a = clamp(z.shownT / 0.6, 0, 1), s = phone ? 5 : 7;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = z.bt === 'cpnell' ? '#ff8070' : '#ffb070'; ctx.strokeStyle = 'rgba(8,10,14,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y + s); ctx.lineTo(p.x - s, p.y - s); ctx.lineTo(p.x + s, p.y - s); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
  }
}
// the beam's next pass, and the light about you, as a line
function cp7LightHud(n) {
  const S = RAID.st, m = FPS.me;
  if (cp7BeamOn()) {
    const L = CP7.LIGHT, toQ = bearingOf(-L[0], 10 - L[1]), w = 2 * Math.PI / CP7.PERIOD, d = ((toQ - CP7.HALF - cp7BeamA()) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI), next = d / w;
    const lit = cp7InBeam(m.x, m.y) > 0, sh = lit && cp7Shadow(m.x, m.y);
    cpkLine(lit ? (sh ? 'The beam passes over: you are in the shadow' : 'The beam is on you: they can see you') : `The beam comes round in ${next.toFixed(1)} s`, n, lit && !sh ? '#ffd27a' : 'rgba(236,228,207,0.7)');
  }
  if ((S.bellT || 0) > 0) cpkLine('The bell: every one of them is shown', n + 1, '#ffd27a');
}

// ---------- the people on the quay, and the parts' shared hooks ----------
// where a player is now (world): you, or one of the others as your screen has them
function cp7At(sid) { const m = FPS.me; if (!sid || sid === m.id) return m; const r = FPS.remote && (FPS.remote.get(sid) || [...FPS.remote.values()].find(q => q.id === sid)); return r || null; }
// (hosting) one of the gang standing watch at (x, y), facing h, walking his beat to (bx, by) and back if he has one
function cp7Watch(x, y, h, beat) { const z = cpgSpawn(x, y, { h, aware: 0, gun: Math.random() < 0.7 }); if (z && beat) { z.pat = [[x, y], beat]; z.pi = 1; z.goal = beat; z.goalD = 0; } return z; }
// (hosting) a watchman at the end of his beat turns back, after a look about him
function cp7AtGoal(z, dt) { if (!z.pat || z.aware) { z.goal = null; return; } if (z.atGoal > 2.6) { z.pi ^= 1; z.goal = z.pat[z.pi]; z.atGoal = 0; } }
// (hosting, each tick) the awake leave their beats and fight
function cp7Beats() { for (const z of cpgAll()) if (z.aware && z.pat) { z.pat = null; z.goal = null; } }
// (hosting) out of a warehouse door, awake: x is the door's, along the front at y 1
function cp7FromDoor(x) { return cpgSpawn(x + (Math.random() - 0.5) * 1.2, -0.4 - Math.random(), { aware: 1, gun: Math.random() < 0.65, h: Math.PI }); }
const CP7_DOORS = [-60.5, -53.5, -46.5, -39.5, -32.5, 27.5, 34.5, 41.5, 48.5, 55.5];
function cp7Door(far) { const P = ZM.players || []; let best = CP7_DOORS[0], bd = far ? -1 : 1e9; for (const x of CP7_DOORS) { let d = 1e9; for (const p of P) d = Math.min(d, Math.hypot(p.x - FPSC.CX - x, p.y - FPSC.CY)); if (d < 9) continue; if (far ? d > bd : d < bd) { bd = d; best = x; } } return best; }
// what every part of the night shares: the light's clocks, the lockers and the bell, their asks, their word
const CP7_HOOKS = {
  shot(x, y) { cpgShot(x, y); },
  block(x, y) { return cp7Block(x, y); },
  speedK() { return 1; },
};
function cp7MeAll(dt, extra) { cp7LightTick(dt); cp7LockTick(dt); cp7UseTick(dt, extra); }
function cp7PackAll(o) { cp7LightPack(o); cp7LockPack(o); }
function cp7ApplyAll(o) { cp7LightApply(o); cp7LockApply(o); }
// (every screen, enter) the light's state made fresh
function cp7Fresh(S, beam) { Object.assign(S, { beam: beam ? 1 : 0, fl: [], lk: [0, 0, 0], bellT: 0, bellCd: 0, bellN: 0, bellSeen: 0, said: {} }); CPG.sees = cp7Sees; CPG.lit = cp7Lit; CPG.atGoal = cp7AtGoal; CP7.useDone = null; CP7.pass = false; }

// ---------- Part I: the Waterfront ----------
const CP7Q_PH = ['quay', 'gate', 'open'];
const CP7_WATCH = [[-36, -14, 0.4, [-36, -24]], [-16, -9, 2.6, null], [-4, -19, 1.2, [-12, -19]], [24, -23, -0.6, [38, -23]], [40, -12, -2.0, null], [55, -11, 3.0, [55, -24]], [-57, -21, 0.9, null], [3.2, -2.6, 3.1, null], [-3.4, -2.8, 3.3, null]];
cpStage('m07quay', Object.assign({}, CP7_HOOKS, {
  n: 'The Waterfront',
  map: CP7_MAP,
  set(H, K, Z) {},
  banner: () => ({ text: 'The Waterfront', t: 4, sub: 'Part I' }),
  music: () => cpgAll().some(z => z.aware) ? 'cpfight' : 'cpm07dark',
  enter() {
    const S = RAID.st;
    cp7Fresh(S, false); Object.assign(S, { ph: 'quay', spawned: 0, need: 0, gate: 0, rf: 0, gateHeard: 0 });
    CP7.useDone = o => { if (o.k === 'cp7gate') raidAsk('gate'); };
    if (ZM.net === 'client') return;
    const n = cp7N(), list = CP7_WATCH.slice(0, 7 + Math.min(2, n - 1));
    for (const [x, y, h, beat] of list) cp7Watch(x, y, h, beat);
    for (let k = 1; k < n; k++) { const [x, y, h] = CP7_WATCH[(k * 3) % 7]; cp7Watch(x + 2, y + 1.5, h + 0.6, null); }
    S.spawned = cpgAll().length;
    cpObjective('Clear the quay of Kittow’s men. Keep out of their lanterns’ light');
    cpWaypoint(0, -1, 'The yard gate', 2.5);
    S.go = [0.9, 'recv', 'Keep to the dark, gentlemen. They have lanterns, and we have none.', 'cp_m07_05'];
  },
  tick(dt) {
    const S = RAID.st, n = cp7N();
    cp7Beats(); cpgGo(S, dt);
    if (S.ph === 'quay') {
      // the first of them to see you shouts; out of the warehouses come more
      if (!S.rf && cpgAll().some(z => z.aware)) {
        S.rf = 1; cpSay('wreck', 'There! On the quay! Out, lads, out!', 'cp_m07_06');
        const k = 1 + Math.ceil(n / 2); for (let i = 0; i < k; i++) cp7FromDoor(cp7Door(true)); S.spawned += k;
        cp7Feed('Doors bang along the warehouse fronts.');
      }
      if (S.rf && cpgAlive() === 0) {
        S.ph = 'gate'; cpObjective('Lift the bar on the yard gate'); cpWaypoint(0, -1, 'The yard gate', 2.5);
        cpSay('recv', 'The quay is ours. Now the bar on that gate, quick, before Nell hears of it.', 'cp_m07_08');
      } else if (!S.rf && cpgAlive() === 0) S.rf = 1;
    }
  },
  kill(d) { const S = RAID.st; if (d.bt === 'cpgang' && !S.said.k1) { S.said.k1 = 1; cpSay('recv', 'One down. Quietly, now. The rest have not heard.', 'cp_m07_07'); } },
  q(sid, k, a) {
    const S = RAID.st;
    if (cp7Q(sid, k, a)) return;
    if (k === 'gate' && S.ph === 'gate') {
      S.ph = 'open'; cp7Feed(`${cp7Nick(sid)} lifted the bar on the yard gate.`); cpWaypoint(null); cpObjective('');
      cpSay('recv', 'The gate is open. And look there, to the south.', 'cp_m07_09');
      setTimeout(() => { if (RAID.st === S && !ZM.over) cpDone(); }, 1800);
    }
  },
  pack(o) { const S = RAID.st; cp7PackAll(o); o.m7q = [CP7Q_PH.indexOf(S.ph)]; },
  apply(o) { const S = RAID.st; cp7ApplyAll(o); if (Array.isArray(o.m7q)) S.ph = CP7Q_PH[o.m7q[0] | 0] || 'quay'; },
  me(dt) {
    cp7MeAll(dt, o => o.k === 'cp7gate' ? CP7.GATE_T : 0);
    // the bar out of its keeps and the gate swinging back, on every screen
    const S = RAID.st; if (S.ph === 'open' && !S.gateHeard) { S.gateHeard = 1; try { sfxPlay('gate_bar', { vol: 0.9, pan: fpsEar(...cp7W(0, -0.9)), out: true }); } catch (e) {} }
  },
  consider(c) { cp7Consider(c); if (RAID.st.ph === 'gate') c({ k: 'cp7gate' }, ...cp7W(0, -0.9), 0, 2.6, false); },
  prompt(o) { return o.k === 'cp7gate' ? { text: 'Hold to lift the bar on the gate', hold: true } : cp7Prompt(o); },
  use(o) { return /^cp7/.test(o.k); },
  hud(phone, mono, fell) {
    const S = RAID.st;
    if (S.ph === 'quay') cpkLine(`Kittow’s men on the quay: ${cpgAlive()}`, 0, '#ffb090');
    else if (S.ph === 'gate') cpkLine('The quay is clear: lift the bar on the yard gate', 0, '#ffe2a8');
    cpkLine(cp7Lit(FPS.me.x, FPS.me.y) > 0.3 ? 'You are in the light: they can see you' : 'You are in the dark', 1, cp7Lit(FPS.me.x, FPS.me.y) > 0.3 ? '#ffd27a' : 'rgba(236,228,207,0.6)');
    cp7ShownHud(phone); cphHud();
  },
  b3(grp) { cp7Build3D(grp); },
  f3(dt) { cp7Frame3D(dt); },
  exit() { cplReset(); CP73.ok = false; },
  mend: false,
}));

// ---------- Part II: the Bonded Quay ----------
// the sea chests: [x, y] about the island's middle, s (0 hidden, 1 found, 2 carried, 3 aboard), by (who carries it)
const CP7_YMAP = Object.assign({}, CP7_MAP, { start: [3, -5] });
const CP7_GIG = [CP7.STEPS[0], CP7.STEPS[1] + 1.6];
function cp7ChestPass() { const S = RAID.st; let any = 0; for (const c of S.ch || []) if (c.s === 0 && !cp7Shadow(FPSC.CX + c.x, FPSC.CY + c.y)) { c.s = 1; any = 1; } if (any) cp7Found(); }
// (hosting) a chest shown: by the beam, a flare, or one of you close by it
function cp7Found() { const S = RAID.st; if (!S.said.found) { S.said.found = 1; cpSay('recv', 'There, by the stacks: a sea chest, brass on the corners. That is one of hers.', 'cp_m07_14'); } cp7YWay(); }
function cp7YWay() {
  const S = RAID.st, m = FPS.me, C = (S.ch || []).filter(c => c.s === 1);
  if ((S.ch || []).some(c => c.s === 2)) { cpWaypoint(CP7_GIG[0], CP7_GIG[1], 'The gig', 1.2); return; }
  let best = null, bd = 1e9; for (const c of C) { const d = Math.hypot(FPSC.CX + c.x - m.x, FPSC.CY + c.y - m.y); if (d < bd) { bd = d; best = c; } }
  if (best) cpWaypoint(best.x, best.y, 'A sea chest', 1.2); else cpWaypoint(0, CP7.YC, 'The yard', 2);
}
const cp7Aboard = () => (RAID.st.ch || []).filter(c => c.s === 3).length;
const cp7Mine = () => (RAID.st.ch || []).findIndex(c => c.s === 2 && c.by === FPS.me.id);
cpStage('m07yard', Object.assign({}, CP7_HOOKS, {
  n: 'The Bonded Quay',
  map: CP7_YMAP,
  set(H, K, Z) {},
  banner: () => ({ text: 'The Bonded Quay', t: 4, sub: 'Part II' }),
  music: () => cpgAll().filter(z => z.aware).length > 1 ? 'cpfight' : 'cpm07yard',
  speedK() { return cp7Mine() >= 0 ? CP7.CARRY_K : 1; },
  enter() {
    const S = RAID.st;
    cp7Fresh(S, true); Object.assign(S, { ch: [], chSeen: [], spT: 16, dT: 8, wave: 0 });
    CP7.useDone = o => { if (o.k === 'cp7ch') raidAsk('lift', o.i); else if (o.k === 'cp7drop') raidAsk('drop'); };
    if (ZM.net === 'client') return;
    // three of the spots, at random; Nell's men among the stacks (the rest of the spots, and the crane)
    const spots = CP7_SPOTS.map(p => p.slice()).sort(() => Math.random() - 0.5);
    S.ch = spots.slice(0, 3).map(([x, y]) => ({ x, y: y, s: 0, by: '' }));
    const n = cp7N(), men = 4 + Math.round(1.5 * (n - 1));
    spots.slice(3, 3 + men).forEach(([x, y], i) => { const z = cpgSpawn(x + 1.2, y + 0.6, { h: Math.random() * 6.28, aware: 0, gun: Math.random() < 0.7 }); if (z && i % 2) { z.pat = [[x + 1.2, y + 0.6], [x + 1.2, y + 0.6 + (y > CP7.YC ? -8 : 8)]]; z.pi = 1; z.goal = z.pat[1]; z.goalD = 0; } });
    cpgSpawn(0, CP7.YC - 3.2, { h: Math.PI, aware: 0, gun: true });
    cpObjective('Find the Gannet’s three sea chests in the stacks, and carry them to the gig');
    cp7YWay();
    S.go = [1.2, 'recv', 'Three chests, somewhere in the stacks. The beam will show them, and it will show you. Mind the shadows.', 'cp_m07_13'];
  },
  tick(dt) {
    const S = RAID.st, n = cp7N(), P = ZM.players || [];
    cp7Beats(); cpgGo(S, dt);
    // the chests: one of you close by finds it; whoever carries one takes it with them, and drops it if they go down
    for (const c of S.ch) {
      if (c.s === 0 && P.some(p => Math.hypot(p.x - FPSC.CX - c.x, p.y - FPSC.CY - c.y) < 3.2 || cp7FlareAt(FPSC.CX + c.x, FPSC.CY + c.y) > 0.3)) { c.s = 1; cp7Found(); }
      if (c.s === 2) {
        const p = P.find(q => q.sid === c.by);
        if (!p) { c.s = 1; c.by = ''; cp7Feed('A sea chest fell on the setts.'); if (!S.said.drop) { S.said.drop = 1; cpSay('recv', 'The chest is down! Somebody get it up again!', 'cp_m07_18'); } cp7YWay(); continue; }
        c.x = p.x - FPSC.CX; c.y = p.y - FPSC.CY;
        if (Math.hypot(c.x - CP7_GIG[0], c.y - CP7_GIG[1]) < 3.4) {
          c.s = 3; c.by = ''; const k = cp7Aboard();
          cp7Feed(`A sea chest is aboard the gig. ${3 - k ? 3 - k + ' to go.' : 'That is all three.'}`);
          if (k === 1) { cpSay('recv', 'One aboard. Two more, and mind your backs on those steps.', 'cp_m07_15'); S.dT = 3; }
          cp7YWay();
          if (k === 3) { S.ph = 'done'; cpSay('recv', 'All three aboard. Get down to the boat, every one of you.', 'cp_m07_19'); cpObjective(''); cpWaypoint(null); setTimeout(() => { if (RAID.st === S && !ZM.over) cpDone(); }, 2200); }
        }
      }
    }
    if (S.ph === 'done') return;
    // more of Nell's men, along the quay from the warehouses, now and then
    S.spT -= dt;
    const alive = cpgAlive(), cap = 3 + Math.round(1.5 * n);
    if (S.spT <= 0) { S.spT = (17 - Math.min(5, S.wave)) / Math.sqrt(1 + 0.4 * (n - 1)) * (0.8 + Math.random() * 0.4); if (alive < cap) { S.wave++; const k = 1 + (S.wave > 2 && n > 1 ? 1 : 0); for (let i = 0; i < k; i++) cp7FromDoor(cp7Door(true)); } }
    // once a chest is aboard, the drowned come up the quay steps after it
    if (cp7Aboard() > 0) {
      S.dT -= dt;
      const live = ZM.z.filter(z => !z.dead && !z.boss).length;
      if (S.dT <= 0) { S.dT = 9 / Math.sqrt(1 + 0.4 * (n - 1)); if (live < 2 + n) { raidSpawnAt(FPSC.CX + CP7.STEPS[0] + (Math.random() - 0.5) * 5, FPSC.CY + CP7.EDGE + 1.4, { kind: Math.random() < 0.3 ? 'run' : 'jog', hp: zmHp(RAIDC.ROUND + 3) * (1 + 0.3 * (n - 1)), rise: 1.4 }); if (!S.said.dr) { S.said.dr = 1; cpSay('recv', 'The drowned are on the steps! They want the chests back.', 'cp_m07_17'); } } }
    }
  },
  q(sid, k, a) {
    const S = RAID.st;
    if (cp7Q(sid, k, a)) return;
    if (k === 'lift') { const c = S.ch[a | 0]; if (!c || c.s > 1 || S.ch.some(q => q.s === 2 && q.by === sid)) return; c.s = 2; c.by = sid; cp7Feed(`${cp7Nick(sid)} has a sea chest on their shoulder.`); cp7YWay(); }
    if (k === 'drop') { const c = S.ch.find(q => q.s === 2 && q.by === sid); if (c) { c.s = 1; c.by = ''; cp7YWay(); } }
  },
  pack(o) { const S = RAID.st; cp7PackAll(o); o.m7c = S.ch.map(c => [Math.round(c.x * 10), Math.round(c.y * 10), c.s, c.by || '']); },
  apply(o) { const S = RAID.st; cp7ApplyAll(o); if (Array.isArray(o.m7c)) S.ch = o.m7c.map(a => ({ x: (a[0] | 0) / 10, y: (a[1] | 0) / 10, s: a[2] | 0, by: String(a[3] || '') })); },
  me(dt) {
    cp7MeAll(dt, o => o.k === 'cp7ch' ? CP7.LIFT : o.k === 'cp7drop' ? 0.5 : 0);
    // a chest up onto somebody's shoulder, wherever it is
    const S = RAID.st, seen = S.chSeen || (S.chSeen = []);
    (S.ch || []).forEach((c, i) => { if (c.s === 2 && seen[i] !== 2) { const [x, y] = cp7W(c.x, c.y), d = Math.hypot(x - FPS.me.x, y - FPS.me.y); try { sfxPlay('chest_lift', { vol: 0.85 * Math.max(0.1, 1 - d / 50), pan: fpsEar(x, y), out: true }); } catch (e) {} } seen[i] = c.s; });
  },
  consider(c) {
    cp7Consider(c);
    const S = RAID.st, mine = cp7Mine();
    if (mine >= 0) { c({ k: 'cp7drop' }, FPS.me.x + Math.sin(FPS.me.h) * 0.8, FPS.me.y + Math.cos(FPS.me.h) * 0.8, 0, 1.6, false); return; }
    (S.ch || []).forEach((q, i) => { if (q.s <= 1) c({ k: 'cp7ch', i }, ...cp7W(q.x, q.y), 0, 2.2, false); });
  },
  prompt(o) { return o.k === 'cp7ch' ? { text: 'Hold to lift the sea chest', hold: true } : o.k === 'cp7drop' ? { text: 'Hold to set the chest down', hold: true } : cp7Prompt(o); },
  use(o) { return /^cp7/.test(o.k); },
  hud(phone, mono, fell) {
    const S = RAID.st, k = cp7Aboard();
    cpkLine(`The Gannet’s sea chests aboard the gig: ${k} of 3`, 0, '#ffe2a8');
    if (cp7Mine() >= 0) cpkLine('You carry a sea chest: to the gig at the quay steps', 1, '#ffd27a');
    cp7LightHud(cp7Mine() >= 0 ? 2 : 1);
    cp7ShownHud(phone); cp7ChestHud(phone); cphHud();
  },
  b3(grp) { cp7Build3D(grp); },
  f3(dt) { cp7Frame3D(dt); cp7ChestFrame(dt); },
  exit() { cplReset(); CP73.ok = false; CP73.ch = null; },
  mend: false,
}));
// the chests in 3D: an iron-bound sea chest, and its glint once it's been found
function cp7ChestBuild(grp) {
  if (RAID_ORDER[RAID.stage] !== 'cp_m07yard') { CP73.ch = null; return; }
  CP73.ch = [0, 1, 2].map(i => {
    const G = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.62), z3Lam(['#5a3a22', '#4a3020', '#3a3a3a'][i])); body.position.y = 0.3; G.add(body);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.14, 0.66), z3Lam('#3a2416')); lid.position.y = 0.66; G.add(lid);
    for (const x of [-0.42, 0.42]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.76, 0.66), z3Lam('#a8862c')); b.position.set(x, 0.38, 0); G.add(b); }
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,226,150,0.95)', 'rgba(255,226,150,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); gl.scale.setScalar(0.8); gl.position.set(0.42, 0.7, -0.33); G.add(gl);
    grp.add(G); return { G, gl };
  });
}
function cp7ChestFrame(dt) {
  if (!CP73.ch) return;
  const S = RAID.st, t = g.t, G0 = FPSC.GROUND;
  CP73.ch.forEach((M, i) => {
    const c = (S.ch || [])[i]; M.G.visible = !!c; if (!c) return;
    let x = FPSC.CX + c.x, y = FPSC.CY + c.y, z = G0, h = 0.4 + i;
    if (c.s === 2) { const p = cp7At(c.by); if (p) { const me = p === FPS.me; h = p.h || 0; x = p.x + Math.sin(h) * (me ? 0.9 : 0.1) + Math.cos(h) * (me ? 0.25 : 0); y = p.y + Math.cos(h) * (me ? 0.9 : 0.1) - Math.sin(h) * (me ? 0.25 : 0); z = G0 + (p.jz || 0) + (me ? 0.9 : 1.55); } }
    else if (c.s === 3) { const gp = CP73.gig ? CP73.gig.position : null; M.G.position.set(gp ? gp.x + (i - 1) * 0.5 : 0, gp ? gp.y + 0.35 : 0, gp ? gp.z + (i - 1) * 1.4 : 0); M.G.rotation.y = 0.15; M.gl.visible = false; return; }
    M.G.position.copy(z3v(x, y, z)); M.G.rotation.y = h;
    const lit = c.s === 1 ? 0.6 + 0.4 * Math.max(0, Math.sin(t * 3 + i)) : cp7InBeam(x, y) > 0 ? 1 : 0;
    M.gl.visible = lit > 0 && c.s !== 2; M.gl.material.opacity = lit; M.gl.scale.setScalar(0.5 + lit * 0.6);
  });
}
// a mark over each chest found and lying loose
function cp7ChestHud(phone) {
  for (const c of RAID.st.ch || []) {
    if (c.s !== 1) continue;
    const q = cam(FPSC.CX + c.x, FPSC.CY + c.y, FPSC.GROUND + 1.3); if (q.f < 0.5) continue;
    const p = proj(q), s = phone ? 5 : 7;
    ctx.save(); ctx.fillStyle = '#ffe2a8'; ctx.strokeStyle = 'rgba(8,10,14,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s, p.y); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
  }
}
