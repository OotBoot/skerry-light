'use strict';
// The Chronicle of the Light, mission 12 (Maren's End), part III: Maren's End (cp_m12end). Up the old drain and out of
// its mouth at the foot of the Spanish fort's sea wall (the fort laid out as src/raidfort.js has it, rfLay: its sea
// wall, the Sea Battery's parapet and guns over it, its garitas), not inside it: on the bed below, where the sea
// used to break, among the wrecks and the rocks the hanged men looked down on. It's the last pool here, under the
// wall, that Maren comes up out of (m12_rise). She's the raid's own (ZBT.maren: her sweep, the sea called up under
// you), and she can't be hurt while her ward is on her (RF.vul, here this stage's to keep). Three ways in, one after
// another as she weakens:
//  I.   The bells: three wrecks on the bed still have their bells. Ring one (hold Use) while she's near it and her
//       ward breaks for a while, and she's driven back; then it wants a while before it'll ring true again. Rung
//       with her far off it only sinks the drowned near it.
//  II.  The tide (from two thirds of her strength; m12_tide): the sea is coming back, in surges over the bed. In
//       one, you're in it up to your knees and it drains you, unless you're up on something (a wreck's deck, the
//       rocks, the drain's stone apron). Her soul rises out of each surge, a yellow light over the water: shoot it
//       till it bursts and she can be hurt.
//  III. All the bells (from a third): rung all three together, close enough in time (the fewer of you, the longer
//       you have), they hold her open. The surges keep coming, further apart.
// Her fall: m12_rest, the sea comes back over the bed for good (C12.seaK), and on to the outro.
// The host's word: c12m [phase, her ward's time left, the tide's start, her soul up, its place, its strength,
// each bell's wait, the bells rung in phase III (bits)]. Places are about the island's middle.

const C12M = {
  R: 100, START: [0, -27.5], POOL: [0, -64], BOX: [-55, 55, -92, -25],
  BELLS: [[-30, -46, 0.3], [30, -51, 2.8], [2, -82, 1.57]], BELL_R: 2.3, RING_T: 1.4, NEAR: 17, VUL1: 10, CD1: 15, CD_FAR: 6, SINK_R: 10, SHOVE: 7,
  // the tide: a surge every PER seconds (phase III: PER3): up to TOP over UP, held HOLD, down over DOWN (the rest dry)
  PER: 21, PER3: 30, UP: 4.5, HOLD: 4.5, DOWN: 5.5, TOP: 0.85, KNEE: 0.25, TDRAIN: 0.55, TSLOW: 0.68, WALL: -22.6,
  ORB_HP: 14, ORB_Z: 6.5, VUL2: 13, WIN: [22, 14, 9, 9], VUL3: 16, HP_K: 0.62,
};
const c12mLoc = (x, y) => [x - FPSC.CX, y - FPSC.CY];
// the tide's height now (from the shared clock: every screen floods together)
function c12mTide(S, ct) {
  const ph = S.c12ph | 0; if (ph < 2 || ph > 3) return 0;
  const P = ph === 3 ? C12M.PER3 : C12M.PER, t = (((ct - S.tide0) % P) + P) % P, { UP, HOLD, DOWN, TOP } = C12M;
  return t < UP ? TOP * Math.sin(t / UP * Math.PI / 2) : t < UP + HOLD ? TOP : t < UP + HOLD + DOWN ? TOP * (1 - (t - UP - HOLD) / DOWN) : 0;
}
const c12mMaren = () => ZM.z.find(z => z.bt === 'maren' && !z.dead) || null;
const c12mWin = () => C12M.WIN[Math.min(3, c12N() - 1)];

// ---------- props of its own ----------
// the sea wall's foot, from outside: the drain's mouth, a round arch in a stone apron (two steps up onto it), weed
// and barnacles to the old high-water mark, and down the wall's face the chains the governors hanged Mooncussers in,
// two of them still with something in them
FPI_K.c12wallfoot = {
  noShadow: true,
  sol(p) { return [fpiBox(p, 0, -1.4, 6, 1.2, 1.0, { fl: true }), fpiBox(p, 0, -3.1, 4.5, 0.5, 0.5, { fl: true })]; },
  b3(p, A) {
    const R = seeded(0x12f0);
    A.box('#6a6250', 0, -1.4, -0.1, 12, 2.4, 1.1); A.box('#5e5848', 0, -3.1, -0.1, 9, 1.0, 0.6);
    // (the arch: dark mouth, voussoirs round it)
    A.box('#050608', 0, 0.02, 0.9, 2.6, 0.2, 2.6);
    for (let i = 0; i < 9; i++) { const a = Math.PI * i / 8; A.box('#8a7e66', Math.cos(a) * 1.6, -0.1, 2.2 + Math.sin(a) * 1.4, 0.6, 0.4, 0.5, 0, 0, a); }
    // (weed and barnacles along the whole foot of the wall)
    for (let u = -24; u <= 24; u += 2) A.box(R() < 0.5 ? '#1e2a20' : '#2a3424', u, 0.05, -0.1, 2.1, 0.35, 1.4 + R() * 0.8);
    // the chains: from the parapet's top down the face, iron hoops, and the hanged in two of them
    for (const [u, who] of [[-17, 1], [-9, 0], [9, 1], [17, 0]]) {
      A.box('#2a2a2a', u, 0.15, 2.0, 0.05, 0.05, 2.25);
      for (const z of [0.9, 1.5, 2.1]) A.box('#222224', u, 0.4, z, 0.5, 0.5, 0.05);
      if (who) { A.box('#cfc6b0', u, 0.4, 1.95, 0.18, 0.16, 0.22); A.box('#4a3e32', u, 0.4, 1.2, 0.3, 0.2, 0.7); A.box('#cfc6b0', u - 0.07, 0.4, 0.75, 0.06, 0.06, 0.45); A.box('#cfc6b0', u + 0.07, 0.4, 0.75, 0.06, 0.06, 0.45); }
    }
  },
};
// the last pool, under the wall, where she comes up: black water in a hollow of the bed, rocks round it
FPI_K.c12pool = {
  noShadow: true,
  b3(p, A) { const R = seeded(0x12f1); for (let k = 0; k < 3; k++) A.cyl('#04080a', 0, 0, -0.05, 6, 0.08, k * 0.26); for (let k = 0; k < 3; k++) A.cyl('#1e2a2c', 0, 0, -0.07, 7, 0.06, k * 0.26 + 0.13); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + R() * 0.3, r = 7 + R() * 1.5; A.box(['#4e4a42', '#5a554c'][i % 2], Math.cos(a) * r, Math.sin(a) * r, -0.2, 1 + R() * 1.6, 0.8 + R(), 0.4 + R() * 0.6, a); } },
};

// ---------- laying it out: the fort as it is, and the bed below its sea wall ----------
function c12mSet(H, K, Z) {
  rfLay(H, K, Z);
  const { put, light } = K;
  put('c12far', 0, -60, 0, { r: C12M.R + 30, sd: 9 });
  put('c12salt', 0, 0, 0, { r: [-60, 60, -96, -26], n: 70, skip: [[C12M.POOL[0], C12M.POOL[1], 9]], sd: 12 });
  put('c12wallfoot', 0, C12M.WALL - 0.2, 0, {});
  light(0, -25, 2.6, '#7a9ab8', 7, 'wisp');
  put('c12pool', C12M.POOL[0], C12M.POOL[1], 0, {});
  light(C12M.POOL[0], C12M.POOL[1], 1.2, '#6ac0b8', 14, 'wisp');
  // the wrecks with bells, and decks to stand on (with a stone or two to climb by)
  C12M.BELLS.forEach(([x, y, a], i) => { put('c12hulk', x - Math.cos(a) * 3, y - Math.sin(a) * 3, a + Math.PI / 2, { L: 14, deck: 1.4, sd: 70 + i }); put('c12bellpost', x, y, a, {}); light(x + Math.cos(a), y + Math.sin(a), 3.4, '#ffb868', 8, 'lantern'); });
  for (const [x, y, a, L, dk] of [[-46, -70, 0.9, 15, 1.5], [44, -74, 2.3, 13, 1.4], [-14, -40, 2.9, 11, 0], [20, -86, 0.4, 12, 0], [52, -34, 1.6, 12, 1.3]]) put('c12hulk', x, y, a, { L, deck: dk, sd: Math.round(x * 3 - y) });
  // (to get up onto each deck: stones at its side)
  const decks = C12M.BELLS.map(([x, y, a]) => [x - Math.cos(a) * 3, y - Math.sin(a) * 3, a + Math.PI / 2]).concat([[-46, -70, 0.9], [44, -74, 2.3], [52, -34, 1.6]]);
  for (const [x, y, a] of decks) { const ox = -Math.sin(a) * -1.6, oy = Math.cos(a) * -1.6, nx = Math.sin(a), ny = -Math.cos(a); put('step', x + ox + nx * 3.4, y + oy + ny * 3.4, a, { w: 2.2, d: 1.2, hh: 0.5, col: '#5a554c' }); put('step', x + ox + nx * 2.4, y + oy + ny * 2.4, a, { w: 2.2, d: 1.0, hh: 0.95, col: '#625c52' }); }
  // rocks the sea left, a few to stand on
  const R = seeded(0x12f2);
  for (let i = 0; i < 18; i++) {
    const x = (R() - 0.5) * 110, y = -30 - R() * 62;
    if (Math.hypot(x - C12M.POOL[0], y - C12M.POOL[1]) < 10 || Math.hypot(x - C12M.START[0], y - C12M.START[1]) < 7 || C12M.BELLS.some(b => Math.hypot(x - b[0], y - b[1]) < 8) || decks.some(d => Math.hypot(x - d[0], y - d[1]) < 9)) continue;
    const big = R() < 0.4, h = big ? 1.1 : 0.45 + R() * 0.3;
    put('step', x, y, R() * 6, { w: 1.8 + R() * 2.2, d: 1.6 + R() * 2, hh: h, col: ['#5a554c', '#6a6458', '#4e4a42'][(R() * 3) | 0] });
    if (big) put('step', x + 1.9, y, 0, { w: 1.2, d: 1.2, hh: 0.5, col: '#4e4a42' });
  }
}

// ---------- the stage ----------
cpStage('m12end', {
  n: 'Maren’s End', mend: true,
  map: { start: C12M.START.slice(), top: 0, R: C12M.R, isle: 'cpm12fort', shore: () => -999, nav: [-60, 60, -96, -23],
    zones: Object.assign({}, typeof RF_ZONES !== 'undefined' ? RF_ZONES : {}, { bed: { n: 'under the sea wall', r: [-62, 62, -100, -22.6], sky: true } }) },
  music: () => { const ph = RAID.st.c12ph | 0; return ph >= 4 ? 'cpm12rest' : ph >= 2 ? 'cpm12tide' : 'cpm12maren'; },
  banner: () => ({ text: 'Maren’s End', t: 4.5, sub: 'Part III · under the sea wall of the old Spanish fort', col: '#9fd8e8' }),
  set(H, K, Z) { c12mSet(H, K, Z); },
  speedK() { const S = RAID.st, m = FPS.me, L = c12mTide(S, RAID.ct || 0); return L > 0.3 && (m.jz || 0) < L - C12M.KNEE && c12mLoc(m.x, m.y)[1] < C12M.WALL ? C12M.TSLOW : 1; },
  enter() {
    const S = RAID.st;
    Object.assign(S, { c12ph: 0, vul: 0, tide0: 0, orbUp: 0, orb: [0, -60, C12M.ORB_Z], orbHp: 0, orbAcc: 0, orbSend: 0, cd: [0, 0, 0], rung: 0, ringT: [-99, -99, -99], spT: 4, useT: 0, useI: -1, pend: 0, mz: 0, said: {}, wet: 0, t: 0 });
    FPS.me.h = Math.PI;
    RF.vul = 0; RF.p2 = false; RF.storm = 0;
    ZM.open = new Set(['raid'].concat(Object.keys(ZM_ZONES)));
    ZM.round = Math.max(ZM.round, typeof RFC !== 'undefined' ? RFC.ROUND : 10); if (typeof ZB !== 'undefined') { ZB.round = ZM.round; ZB.plan = []; }
    if (ZM.net !== 'client') {
      const z = rfBoss('maren', C12M.POOL[0], C12M.POOL[1], Math.PI * 0, 0);
      if (z) { S.mz = z.zn; z.hp = z.max = z.hp * C12M.HP_K; z.jz = -7; z.callCd = 4; }
      S.c12ph = 1;
      cpObjective('Ring the wrecks’ bells while she’s near them: they break her ward');
      cpWaypoint(null);
    }
  },
  tick(dt) {
    const S = RAID.st, n = c12N(), ct = RAID.ct || RAID.t || 0, M = c12mMaren();
    S.t += dt;
    if (S.vul > 0) { S.vul = Math.max(0, S.vul - dt); if (S.vul <= 0) fpsFeed('Her ward closes over her again.'); }
    for (let i = 0; i < 3; i++) if (S.cd[i] > 0) S.cd[i] = Math.max(0, S.cd[i] - dt);
    RF.vul = S.vul;
    const ph = S.c12ph | 0;
    if (M) {
      if (M.jz < 0 && ph >= 1) M.jz = Math.min(0, M.jz + dt * 4);
      const B = C12M.BOX; M.x = clamp(M.x, FPSC.CX + B[0], FPSC.CX + B[1]); M.y = clamp(M.y, FPSC.CY + B[2], FPSC.CY + B[3]);
      const k = M.hp / M.max;
      if (ph === 1 && k < 0.66) {
        S.c12ph = 2; S.vul = 0; S.tide0 = ct + 3;
        cpCine('m12_tide', () => { cpObjective('Keep to high ground in the surges. Shoot her soul when it rises out of the water'); cpSay('ruth', 'Get up on something! The decks, the rocks, the apron by the drain!', 'cp_m12_30'); });
      } else if (ph === 2 && k < 0.33) {
        S.c12ph = 3; S.vul = 0; S.orbUp = 0; S.rung = 0; S.ringT = [-99, -99, -99]; S.cd = [0, 0, 0];
        cpObjective(`All three bells, rung together: within ${c12mWin()} seconds of each other`);
        cpSay('ruth', 'She’s failing. All the bells at once, and she’ll not stand it. Split up and ring them together!', 'cp_m12_31');
        cpSay('maren', 'They rang every bell on the coast for me. Every one. I heard them all, under the water.', 'cp_m12_32');
      }
    }
    // her soul, out of each surge (phase II)
    const L = c12mTide(S, ct);
    if (ph === 2) {
      if (!S.orbUp && !(S.vul > 0) && L > 0.45) { S.orbUp = 1; S.orbHp = C12M.ORB_HP * (1 + 0.5 * (n - 1)); S.orbPh = Math.random() * 6.28; if (!S.said.soul) { S.said.soul = 1; cpSay('ruth', 'There, over the water! That light. Shoot it!', 'cp_m12_33'); } }
      if (S.orbUp) {
        if (L <= 0.05) { S.orbUp = 0; fpsFeed('Her soul sinks back with the water.'); }
        else { const a = (S.orbPh || 0) + S.t * 0.22, r = 22 + 6 * Math.sin(S.t * 0.4); S.orb = [FPSC.CX + Math.cos(a) * r * 1.4, FPSC.CY - 58 + Math.sin(a) * r * 0.7, C12M.ORB_Z + Math.sin(S.t * 1.3) * 0.8]; }
      }
    } else S.orbUp = 0;
    // in the surge, the drowned wade on
    // the drowned
    S.spT -= dt;
    if (S.spT <= 0 && ph >= 1 && ph < 4) {
      S.spT = (ph === 1 ? 2.6 : 2.1) * (0.75 + Math.random() * 0.5) / Math.sqrt(n);
      if (ZM.z.filter(z => !z.dead && !z.boss).length < 4 + 3 * n) c12mSpawn();
    }
    if (!S.said.b1 && S.t > 6 && ph === 1) { S.said.b1 = 1; cpSay('ruth', 'Lead won’t touch her. Draw her to a bell, and ring it under her nose.', 'cp_m12_34'); }
  },
  kill(d) {
    const S = RAID.st;
    if (d && d.bt === 'maren' && (S.c12ph | 0) < 4) {
      S.c12ph = 4; S.vul = 0; RF.vul = 0; cpObjective(''); cpWaypoint(null);
      for (const z of ZM.z) if (!z.dead && !z.boss) zmKill(z, false, 0, 'bell', '');
      setTimeout(() => { if (RAID.on && raidStage() === RAID_STAGES.cp_m12end) cpCine('m12_rest', () => cpDone()); }, 1600);
    }
  },
  q(sid, k, a) {
    const S = RAID.st;
    if (k === 'c12mbell') { c12mRing(a | 0, sid); return; }
    if (k === 'c12morb') { c12mOrbHit(sid, +a || 0); return; }
  },
  shot(x, y, z, lh, lp, by, dmg) {
    const S = RAID.st; if (!S.orbUp || (S.c12ph | 0) !== 2) return;
    const [ox, oy, oz] = S.orb, cp = Math.cos(lp), dx = Math.sin(lh) * cp, dy = Math.cos(lh) * cp, dz = Math.sin(lp);
    const qx = ox - x, qy = oy - y, qz = FPSC.GROUND + oz - z, t = qx * dx + qy * dy + qz * dz;
    if (t < 0 || t > 300 || Math.hypot(qx - dx * t, qy - dy * t, qz - dz * t) > 1.6) return;
    FPS.hitT = 0.25; FPS.hitHead = true; try { fpsHitSound(true); } catch (e) {}
    const d = dmg == null ? 1 : dmg;
    if (ZM.net === 'client') { S.orbAcc = (S.orbAcc || 0) + d; S.orbHp = Math.max(0, S.orbHp - d); } else c12mOrbHit(FPS.me.id, d);
  },
  pack(o) {
    const S = RAID.st, r = v => Math.round(v * 10) / 10;
    o.c12m = [S.c12ph | 0, r(S.vul), r(S.tide0 || 0), S.orbUp ? 1 : 0, r(S.orb[0] - FPSC.CX), r(S.orb[1] - FPSC.CY), r(S.orb[2]), r(S.orbHp || 0), r(S.cd[0]), r(S.cd[1]), r(S.cd[2]), S.rung | 0, S.mz | 0];
  },
  apply(o) {
    const a = o.c12m; if (!Array.isArray(a)) return; const S = RAID.st;
    const ph = a[0] | 0, vul = +a[1] || 0;
    if (vul > 0 && !(S.vul > 0.5)) c12mBurstFx();
    S.c12ph = ph; S.vul = vul; RF.vul = vul; S.tide0 = +a[2] || 0; S.orbUp = a[3] | 0;
    S.orbS = [FPSC.CX + (+a[4] || 0), FPSC.CY + (+a[5] || 0), +a[6] || C12M.ORB_Z]; if (!S.orbUp || !S.orb) S.orb = S.orbS.slice();
    S.orbHp = Math.max(0, (+a[7] || 0) - (S.orbAcc || 0));
    const rung = a[11] | 0;
    for (let i = 0; i < 3; i++) { const c = +a[8 + i] || 0; if (c > (S.cd[i] || 0) + 1 || (((rung ^ (S.rung | 0)) >> i) & 1 && (rung >> i) & 1)) { const [bx, by] = c12W(C12M.BELLS[i][0], C12M.BELLS[i][1]); c12BellFx(bx, by); C12M3.sw[i] = 1; } S.cd[i] = c; }
    S.rung = rung; S.mz = a[12] | 0;
  },
  consider(c) {
    const S = RAID.st, m = FPS.me, mz = m.jz || 0, ph = S.c12ph | 0;
    if (ph === 1 || ph === 3) C12M.BELLS.forEach(([x, y, a], i) => { if (!(S.cd[i] > 0) && !(ph === 3 && ((S.rung | 0) >> i) & 1)) { const [wx, wy] = c12W(x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.6); c({ k: 'c12mbell', i }, wx, wy, mz, C12M.BELL_R, false); } });
  },
  prompt(o) {
    if (o.k !== 'c12mbell') return null;
    const S = RAID.st, k = S.useI === o.i ? Math.min(1, S.useT / C12M.RING_T) : 0, M = c12mMaren(), [bx, by] = c12W(C12M.BELLS[o.i][0], C12M.BELLS[o.i][1]), near = M && Math.hypot(M.x - bx, M.y - by) < C12M.NEAR;
    return { text: `Hold to ring the bell${(S.c12ph | 0) === 1 ? (near ? ': she’s near it' : ': she’s too far off to feel it') : ''}${k > 0 ? ` (${Math.round(k * 100)}%)` : ''}`, hold: true };
  },
  use(o) { return o.k === 'c12mbell'; },
  me(dt) {
    const S = RAID.st, m = FPS.me, alive = c12Able(), ct = RAID.ct || 0;
    if (ZM.net === 'client') { if (S.vul > 0) { S.vul = Math.max(0, S.vul - dt); RF.vul = S.vul; } if (S.orbS && S.orb) { const k = Math.min(1, dt * 8); for (let i = 0; i < 3; i++) S.orb[i] += (S.orbS[i] - S.orb[i]) * k; } S.orbSend -= dt; if (S.orbAcc > 0 && S.orbSend <= 0) { S.orbSend = 0.15; raidAsk('c12morb', S.orbAcc); S.orbAcc = 0; } }
    // in the surge, up to your knees: it drains you
    const L = c12mTide(S, ct); S.wet = 0;
    // each surge heard coming in over the sand (every screen, off the shared clock)
    if (L > 0.02 && !S.tideHd) { S.tideHd = 1; try { if (!soundOff() && !(typeof cpCineOn === 'function' && cpCineOn()) && !sfxPlay('c12tide', { vol: 0.85 })) sfxPlay('sea', { vol: 0.8 }); } catch (e) {} } else if (L <= 0) S.tideHd = 0;
    if (alive && L > 0.3 && (m.jz || 0) < L - C12M.KNEE && c12mLoc(m.x, m.y)[1] < C12M.WALL && !(typeof cpCineOn === 'function' && cpCineOn())) {
      S.wet = 1;
      if (!(m.protect > 0)) { m.hp -= C12M.TDRAIN * dt; FPS.calm = 0; if (m.hp <= 0) { m.hp = 0; fpsFeed('The sea came back over you.'); fpsDie(null, null); } }
      if (!S.said.wet) { S.said.wet = 1; fpsFeed('The sea is up round your knees, and cold enough to stop your heart. Get up out of it.'); }
    }
    // hold Use at a bell
    const o = ZM.near, hold = c12Hold() && alive;
    if (hold && o && o.k === 'c12mbell' && !(S.pend > 0)) {
      if (S.useI !== o.i) { S.useI = o.i; S.useT = 0; }
      S.useT += dt;
      if (S.useT >= C12M.RING_T) { S.useT = 0; S.useI = -9; S.pend = 0.8; raidAsk('c12mbell', o.i); }
    } else if (!hold) { S.useT = 0; S.useI = -9; }
    if (S.pend > 0) S.pend -= dt;
  },
  hud(phone, mono, fell) {
    const S = RAID.st, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44), t = g.t, ph = S.c12ph | 0;
    const line = ph === 1 ? 'Ring a bell while she’s near it to break her ward.' : ph === 2 ? 'The tide is turning. Keep to high ground; shoot her soul when it rises.' : ph === 3 ? `All three bells together, within ${c12mWin()} seconds: ${[0, 1, 2].map(i => ((S.rung | 0) >> i) & 1 ? '●' : '○').join(' ')}` : 'She is laid to rest.';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = 'rgba(236,228,207,0.82)';
    ctx.fillText(line, L, top, W * 0.5); fpsHudNote(top + (phone ? 14 : 18));
    if (ZM.over || ph >= 4) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y0 = H * 0.2;
    if (S.vul > 0) { ctx.font = fell(phone ? 15 : 20); ctx.fillStyle = `rgba(255,120,130,${0.8 + 0.2 * Math.sin(t * 8)})`; ctx.fillText(`Maren can be hurt: ${Math.ceil(S.vul)} s`, cx, y0); }
    else { ctx.font = fell(phone ? 14 : 18); ctx.fillStyle = 'rgba(160,240,220,0.85)'; ctx.fillText('Maren can’t be hurt', cx, y0); }
    const Lt = c12mTide(S, RAID.ct || 0);
    if (S.wet) { ctx.font = mono(phone ? 11 : 14); ctx.fillStyle = `rgba(190,230,255,${0.7 + 0.3 * Math.sin(t * 10)})`; ctx.fillText('IN THE SEA · IT DRAINS YOU · GET UP OUT OF IT', cx, H - (phone ? 150 : 100)); }
    else if (ph >= 2 && Lt > 0.02) { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(170,210,230,0.75)'; ctx.fillText('THE SEA IS OVER THE BED', cx, H - (phone ? 150 : 100)); }
    // her soul's mark, and its strength
    if (S.orbUp && ph === 2) {
      const [ox, oy, oz] = S.orb, c = cam(ox, oy, FPSC.GROUND + oz);
      if (c.f > 0.5) { const p = proj(c), bw = phone ? 44 : 60, k = clamp(S.orbHp / (C12M.ORB_HP * (1 + 0.5 * (c12N() - 1))), 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x - bw / 2, p.y - 26, bw, 4); ctx.fillStyle = '#ffe08a'; ctx.fillRect(p.x - bw / 2, p.y - 26, bw * k, 4); ctx.font = mono(phone ? 8 : 10); ctx.fillStyle = 'rgba(255,230,160,0.9)'; ctx.fillText('HER SOUL', p.x, p.y - 34); }
    }
    // each bell's state, by its place
    C12M.BELLS.forEach(([bx, by], i) => { const c = cam(FPSC.CX + bx, FPSC.CY + by, FPSC.GROUND + 4.4); if (c.f < 0.5) return; const p = proj(c), r3 = ph === 3 && ((S.rung | 0) >> i) & 1; ctx.font = mono(phone ? 8 : 10); ctx.fillStyle = S.cd[i] > 0 ? 'rgba(160,160,160,0.7)' : r3 ? '#ffd88a' : 'rgba(236,228,207,0.85)'; ctx.fillText(S.cd[i] > 0 ? `BELL · ${Math.ceil(S.cd[i])} S` : r3 ? 'BELL · RUNG' : 'BELL', p.x, p.y); });
  },
  b3(grp) { c12m3dBuild(grp); },
  f3(dt) { c12m3d(dt); },
  exit() { RF.vul = 0; C12M3.on = false; c12Sea(true); },
});
// (hosting) one of the drowned up out of the bed, out where the sea used to be (in a surge, out of the water itself)
function c12mSpawn() {
  const P = ZM.players || [], np = c12N();
  for (let tr = 0; tr < 16; tr++) {
    const x = FPSC.CX + (Math.random() - 0.5) * 108, y = FPSC.CY - 34 - Math.random() * 58;
    if (P.some(p => Math.hypot(p.x - x, p.y - y) < 14) || zmBlockedAt(x, y, 0.5, 0)) continue;
    const u = Math.random(), kind = u < 0.18 ? 'run' : u < 0.7 ? 'jog' : 'walk';
    return raidSpawnAt(x, y, { kind, hp: zmHp(RAIDC.ROUND + 3) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (np - 1)) });
  }
  return null;
}
// (hosting) bell i rung
function c12mRing(i, sid) {
  const S = RAID.st, ph = S.c12ph | 0; if (i < 0 || i > 2 || S.cd[i] > 0 || (ph !== 1 && ph !== 3)) return;
  const [bx, by] = c12W(C12M.BELLS[i][0], C12M.BELLS[i][1]), M = c12mMaren(), ct = RAID.ct || RAID.t || 0;
  c12BellFx(bx, by); C12M3.sw[i] = 1; c12BellSinks(bx, by, C12M.SINK_R);
  if (ph === 1) {
    if (M && Math.hypot(M.x - bx, M.y - by) < C12M.NEAR) {
      S.cd[i] = C12M.CD1; S.vul = C12M.VUL1; c12mBurstFx();
      const d = Math.hypot(M.x - bx, M.y - by) || 1; M.x += (M.x - bx) / d * C12M.SHOVE; M.y += (M.y - by) / d * C12M.SHOVE; M.act = null; M.at = 0;
      fpsFeed(`${c12Nick(sid)} rang the bell under her: her ward is broken.`);
      if (!S.said.hit1) { S.said.hit1 = 1; cpSay('maren', 'That bell. I know that bell.', 'cp_m12_35'); }
    } else { S.cd[i] = C12M.CD_FAR; fpsFeed(`${c12Nick(sid)} rang a bell, but she was too far off to feel it.`); }
    return;
  }
  // phase III: all three together
  S.ringT[i] = ct; S.rung = (S.rung | 0) | (1 << i); S.cd[i] = 1.5;
  const W = c12mWin();
  for (let j = 0; j < 3; j++) if (((S.rung >> j) & 1) && ct - S.ringT[j] > W) { S.rung &= ~(1 << j); }
  if ((S.rung & 7) === 7) {
    S.rung = 0; S.ringT = [-99, -99, -99]; S.vul = C12M.VUL3; c12mBurstFx();
    fpsFeed('All three bells at once: she’s held open.');
    if (!S.said.all) { S.said.all = 1; cpSay('ruth', 'All three! Now, while she’s open, everything you have!', 'cp_m12_36'); }
  } else fpsFeed(`${c12Nick(sid)} rang a bell. ${3 - [0, 1, 2].filter(j => (S.rung >> j) & 1).length} more, and quick.`);
}
// (hosting) her soul struck
function c12mOrbHit(sid, dmg) {
  const S = RAID.st; if (!S.orbUp || (S.c12ph | 0) !== 2) return;
  S.orbHp -= clamp(dmg, 0, 40); if (S.orbHp > 0) return;
  S.orbUp = 0; S.vul = C12M.VUL2; c12mBurstFx();
  fpsFeed(`${c12Nick(sid)} shot Maren’s soul: she can be hurt.`);
}
// (every screen) her ward breaking: a flash of sea-green, her cry
function c12mBurstFx() {
  const M = c12mMaren(); if (!M) return;
  for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, r = 1 + Math.random() * 2.5; fpsPuff(M.x + Math.cos(a) * r, M.y + Math.sin(a) * r, FPSC.GROUND + (M.jz || 0) + 1 + Math.random() * 5, '150,240,220', 3); }
  try { rfSound('orb', Math.hypot(M.x - FPS.me.x, M.y - FPS.me.y)); } catch (e) {}
}

// ---------- in 3D: the bells, the sea coming back, her soul ----------
const C12M3 = { on: false, bells: [], sw: [0, 0, 0], W: null, orb: null };
function c12m3dBuild(grp) {
  Object.assign(C12M3, { on: true, bells: [], sw: [0, 0, 0] });
  for (const [x, y, a] of C12M.BELLS) { const [wx, wy] = c12W(x, y); C12M3.bells.push(c12Bell3(grp, wx, wy, a)); }
  // the sea, over the bed below the wall (not over the fort: it stops at the wall's foot)
  const mat = new THREE.MeshPhongMaterial({ color: 0x0e2a36, specular: 0x5a7a90, shininess: 55, transparent: true, opacity: 0.84 });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(700, 600), mat); w.rotation.x = -Math.PI / 2; grp.add(w); C12M3.W = w;
  const tex = z3Soft('rgba(255,240,170,1)', 'rgba(255,220,120,0)');
  const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); orb.scale.set(3.2, 3.2, 1); grp.add(orb); C12M3.orb = orb;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff4c0 })); orb.add(core);
}
function c12m3d(dt) {
  if (!C12M3.on) return;
  c12Sea(false);
  const S = RAID.st, G0 = FPSC.GROUND, t = g.t;
  C12M3.bells.forEach((B, i) => { if (C12M3.sw[i] > 0) C12M3.sw[i] = Math.max(0, C12M3.sw[i] - dt * 0.35); B.g.rotation.x = Math.sin(t * 7) * 0.6 * C12M3.sw[i]; });
  // the water: the surge's height, or the sea come back for good
  const L = Math.max(c12mTide(S, RAID.ct || 0), (C12.seaK || 0) * 2.6);
  if (C12M3.W) { C12M3.W.visible = L > 0.02; C12M3.W.position.copy(z3v(FPSC.CX, FPSC.CY + C12M.WALL - 300, G0 + L - 0.06 + Math.sin(t * 0.9) * 0.03)); }
  if (C12M3.orb) { const up = !!S.orbUp && (S.c12ph | 0) === 2; C12M3.orb.visible = up; if (up) { const [ox, oy, oz] = S.orb, p = 1 + 0.12 * Math.sin(t * 6); C12M3.orb.position.copy(z3v(ox, oy, G0 + oz)); C12M3.orb.scale.set(3.2 * p, 3.2 * p, 1); } }
}

// ---------- its cutscenes: she comes up; the tide turns; she's laid to rest ----------
cpCineDef('m12_rise', { music: 'cpm12maren', shots: [
  { d: 4.2, card: { eye: 'At the foot of the sea wall', t: 'Maren’s End', sub: 'The old Spanish fort on the headland, where the sea used to break.' } },
  { d: 5, cam: [-8, -30, 2.2], to: [-5, -36, 3.2], look: [0, -22, 4], lookTo: [0, -64, 1.5], fade: [0.6, 0],
    lines: [[0.4, 'ruth', 'Out under the fort. Mind the chains; there’s men still in them.', 'cp_m12_37']] },
  { d: 6.5, cam: [10, -44, 2.4], to: [7, -48, 3.0], look: [0, -64, 1], lookTo: [0, -64, 5],
    f(t, k, C) { const M = c12mMaren(); if (M) { M.jz = -7 + 7 * Math.min(1, k * 1.3); M.h = Math.PI * 0.05; M.act = k < 0.8 ? 'call' : null; M.at = Math.min(0.6, t); } },
    lines: [[0.6, 'maren', 'I rowed out to warn them. Nobody rowed out for me.', 'cp_m12_38'], [3.8, 'maren', 'Give me back my light.', 'cp_m12_39']], sfx: [[0.3, 'thunder', 0.7], [0.5, 'splash', 0.9]], shake: 0.3 },
] });
cpCineDef('m12_tide', { music: 'cpm12tide', exit() { const M = c12mMaren(); if (M) { M.act = null; M.at = 0; } }, shots: [
  { d: 5.5, cam: [0, -30, 4.5], to: [0, -34, 6], look: [0, -120, 1], lookTo: [0, -140, 0.5],
    f(t, k, C) { const M = c12mMaren(); if (M) { M.act = 'call'; M.at = Math.min(0.6, t); } },
    enter() { try { if (!sfxPlay('c12tide', { vol: 1, delay: 0.2 })) sfxPlay('sea', { vol: 1, delay: 0.2 }); } catch (e) {} },
    lines: [[0.4, 'crew', 'Listen. Out past the wrecks. That roar.', 'cp_m12_40'], [2.8, 'ruth', 'The tide’s turned. The sea’s coming back.', 'cp_m12_41']], sfx: [[1.6, 'wind', 0.6]] },
  { d: 5, cam: [14, -50, 2.4], to: [12, -54, 3.2], look: [0, -64, 5],
    f(t, k, C) { const M = c12mMaren(); if (M) { this.look = [M.x - FPSC.CX, M.y - FPSC.CY, 5]; M.act = 'call'; M.at = Math.min(0.6, 0.6 + t); } },
    exit() { const M = c12mMaren(); if (M) { M.act = null; M.at = 0; } },
    lines: [[0.3, 'maren', 'The sea is coming home. So am I.', 'cp_m12_42']], sfx: [[0.2, 'thunder', 0.6]] },
] });
cpCineDef('m12_rest', { music: 'cpm12rest', exit() { C12.seaK = 1; }, shots: [
  { d: 6, cam: [8, -40, 3], to: [6, -44, 2.4], look: [0, -56, 3], lookTo: [0, -58, 1],
    f(t, k, C) { const z = ZM.z.find(q => q.bt === 'maren'); if (z) { this.look = [z.x - FPSC.CX, z.y - FPSC.CY, 3]; this.lookTo = [z.x - FPSC.CX, z.y - FPSC.CY, 1]; } },
    lines: [[0.5, 'maren', 'Tell him I saw the light. Tell him I was nearly home.', 'cp_m12_43'], [3.6, 'log', 'She went down on her knees in the last pool, and the sea took her back.', 'cp_m12_44']], sfx: [[0.3, 'sea', 0.7]] },
  { d: 7, cam: [0, -26, 5.5], to: [0, -26, 7.5], look: [0, -80, 1], lookTo: [0, -60, 1.5],
    f(t, k, C) { C12.seaK = Math.max(C12.seaK || 0, Math.min(1, k * 1.1)); },
    enter() { try { if (!sfxPlay('c12tide', { vol: 1, delay: 0.2 })) sfxPlay('sea', { vol: 1, delay: 0.2 }); } catch (e) {} },
    lines: [[0.5, 'log', 'Then the sea came back. It came in over the bed without a sound, and it did not stop at the wrecks.', 'cp_m12_45'], [4.2, 'ruth', 'Up the wall! Up, before it has us too!', 'cp_m12_46']], sfx: [[3, 'wind', 0.5]] },
] });
