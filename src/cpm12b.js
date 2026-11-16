'use strict';
// The Chronicle of the Light, mission 12 (Maren's End), part I: the Dry Bed (cp_m12bed). The night the sea went out,
// on foot across the bed from the foot of Skerry Light's rock (a pillar now, standing out of the salt, still lit and
// turning) to the Swallow, round its south side and up its east: not the Long Pier's way (the pier is off to the
// west, its lamps lit, running out over the hole), but among the wrecks the sea left bare.
//  - The runnels: three channels where the last of the sea still runs down into the Swallow. Shallow and slow to
//    wade in, and every few seconds a surge comes down each, white, from upstream: caught in one, it takes half your
//    health and throws you down the channel. It sweeps the drowned away too. Each of us judges our own (the surges
//    come from the shared clock, RAID.ct, so they come at the same moment on every screen).
//  - Maren, at the rim: she stands on the Swallow's lip by the one way down that isn't a fall, the wreck lodged in
//    it, and nothing touches her (src/raidfort.js's boss, held at her post, her soul nowhere to be shot). Within her
//    reach she calls the sea up under you, as in the fort. Ring the bells of three wrecks on the bed (hold Use) and
//    each one drives her back over the hole; the first brings a cutscene of her hearing it (m12_rim), the third sinks
//    her into the Swallow (m12_sink). Each bell sinks the drowned near it, and wakes more all over the bed.
//  - Then down the lodged wreck's mast (hold Use at its foot): the stage is done, and the mission's 'after'
//    cutscene (m12_down, in src/cpm12.js) takes you over the lip.
// The host's word: c12b [bells rung (bits), phase, Maren's number]. Places are about the island's middle.

const C12B = {
  R: 100, START: [-30, -70], LIGHT: [-46, -88, 14], SW: [0, 40, 18], WRECK: [13.5, 56.5], WRECK_A: 0.87,
  // the runnels: [A (upstream) x, y, B (at the rim) x, y, width, period, phase]
  RUN: [[-6, -100, -2, 21, 6.5, 7.4, 0], [86, -70, 12, 27, 6, 6.6, 2.1], [100, 26, 18, 38, 6, 5.9, 4.3]],
  V: 21, BAND: 26, HIT: 3, SHOVE: 9, WADE: 0.78,
  BELLS: [[28, -40, 2.4], [64, 4, -2.2], [46, 62, 3.6]], BELL_R: 2.3, RING_T: 2.4, SINK_R: 11,
  POSTS: [[10, 50], [7, 47], [4.5, 44]], PIER: [-80, -4],
};
const c12bRun = C12B.RUN.map(r => { const [ax, ay, bx, by, w, T, ph] = r, L = Math.hypot(bx - ax, by - ay); return { ax, ay, bx, by, w, T, ph, L, ux: (bx - ax) / L, uy: (by - ay) / L }; });
// (local x, y) in runnel i: how far down it (t) and across (o), or null
function c12bIn(R, x, y) { const px = x - R.ax, py = y - R.ay, t = px * R.ux + py * R.uy, o = -px * R.uy + py * R.ux; return t >= -1 && t <= R.L + 1 && Math.abs(o) < R.w / 2 ? { t, o } : null; }
// the surge in runnel R now: its front, down the channel (the band runs back up from it)
const c12bFront = (R, ct) => (((ct + R.ph) % R.T) + R.T) % R.T * C12B.V;
const c12bHit = (R, t, ct) => { const f = c12bFront(R, ct); return t <= f && t >= f - C12B.BAND && f - C12B.BAND < R.L; };
const c12bBellsN = () => { let n = 0, v = RAID.st.bells | 0; while (v) { n += v & 1; v >>= 1; } return n; };
const c12bLoc = (x, y) => [x - FPSC.CX, y - FPSC.CY];

// ---------- props of its own ----------
// the Swallow's mouth: the hole, black, its lip of tipped slabs, the water still pouring over it in three falls, and
// the wreck lodged in its north-east lip with her mast standing up out of it (the way down). Nothing to stand on.
FPI_K.c12swallow = {
  noShadow: true,
  sol(p) { return [fpiCirc(p, 0, 0, C12B.SW[2] - 1, 2.4)]; },
  b3(p, A) {
    const r = C12B.SW[2], R = seeded(23), RK = ['#57514a', '#4c4741', '#625b52', '#45413c'];
    for (let k = 0; k < 3; k++) { A.cyl('#030405', 0, 0, -0.1, r, 0.16, k * 0.26); A.cyl('#0c0e10', 0, 0, -0.08, r + 0.9, 0.12, k * 0.26 + 0.13); }
    // (the funnel's first fall of rock, seen over the lip)
    for (let i = 0; i < 44; i++) { const a = i / 44 * 6.283, rr = r - 0.6 - R() * 1.2; A.box(RK[(R() * 4) | 0], Math.cos(a) * rr, Math.sin(a) * rr, -0.4 - R() * 0.4, 2.8, 1.4, 0.7, a + Math.PI / 2, 0, -0.5); }
    for (let i = 0; i < 40; i++) { const a = R() * 6.283, rr = r + 0.8 + R() * 4; A.box(RK[(R() * 4) | 0], Math.cos(a) * rr, Math.sin(a) * rr, -0.3, 1 + R() * 2.5, 0.8 + R() * 1.6, 0.4 + R() * 0.8, R() * 6.28, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4); }
    // the lodged wreck: her bow out over the hole and dipping into it, her stern on the lip, her mast up
    const a = C12B.WRECK_A, cx = Math.cos(a) * (r - 2), cy = Math.sin(a) * (r - 2);
    A.box('#3a2e24', cx, cy, -1.4, 12, 3.4, 2.2, a + Math.PI, 0.32, 0);
    for (let u = -5; u < 5; u += 1.2) A.box('#463628', cx - Math.cos(a) * u, cy - Math.sin(a) * u, -1.6 - u * 0.3, 0.25, 3.6, 2.8, a, 0, 0);
    const mx = Math.cos(a) * (r - 0.8), my = Math.sin(a) * (r - 0.8);
    A.box('#3e3024', mx, my, -0.4, 0.42, 0.42, 9, 0, 0.12, 0); A.box('#3e3024', mx, my, 6.5, 4, 0.22, 0.22, a + Math.PI / 2);
    for (let z = 0.4; z < 8; z += 0.55) A.box('#2a2622', mx + Math.cos(a) * 0.3, my + Math.sin(a) * 0.3, z, 0.6, 0.06, 0.06, a + Math.PI / 2);
  },
};
// the Long Pier, off to the west: its deck and rails high over the bed, its piles, its lamps lit; the round platform
// at its end over the middle of the hole. Drawn along +u from that platform (u 0) to its quay end (L)
FPI_K.c12pier = {
  noShadow: true,
  sol(p) { const o = []; for (let u = C12B.SW[2] + 2; u < p.L; u += 8) for (const s of [-1, 1]) o.push(fpiCirc(p, u, s * 3.2, 0.3, 3)); return o; },
  b3(p, A) {
    const D = 3, W = 7, L = p.L, R = seeded(p.sd || 41), PL = ['#5a4430', '#634b35', '#4e3b2a', '#6a5038'];
    for (let u = 4.5; u < L; u += 0.6) A.box(PL[(R() * 4) | 0], u, 0, D - 0.14, 0.55, W, 0.14);
    for (const s of [-1, 1]) {
      A.box('#5c4632', L / 2 + 2, s * (W / 2 + 0.08), D + 0.95, L - 4, 0.12, 0.1);
      for (let u = 5; u < L; u += 2.2) A.box('#4e3c2a', u, s * (W / 2 + 0.08), D, 0.12, 0.12, 1.0);
      for (let u = 5; u < L; u += 4) A.cyl('#3a2e24', u, s * (W / 2 - 0.3), -0.2, 0.24, D);
      for (let u = 10, k = 0; u < L; u += 13, k++) if ((k % 2 ? 1 : -1) === s) { A.box('#2a2622', u, s * (W / 2 + 0.1), D, 0.14, 0.14, 2.6); A.box('#1c1a18', u, s * (W / 2 - 0.55), D + 2.0, 0.22, 0.22, 0.34); A.glow('#ffd88a', u, s * (W / 2 - 0.55), D + 2.17, 0.16); }
    }
    A.cyl('#5a4430', 0, 0, D, 4.5, 0.35); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; A.cyl('#3a2e24', Math.cos(a) * 4.2, Math.sin(a) * 4.2, D - 6, 0.22, 6); }
  },
};

// ---------- laying it out ----------
function c12bSet(H, K, Z) {
  const { put, light } = K, [lx, ly, lr] = C12B.LIGHT, [sx, sy] = C12B.SW;
  put('c12far', 0, 0, 0, { r: C12B.R });
  put('c12salt', 0, 0, 0, { r: [-96, 96, -96, 96], n: 120, skip: [[sx, sy, 24], [lx, ly, lr + 4]] });
  put('c12light', lx, ly, 0, { r: lr });
  light(lx, ly, 40, '#ffe8b0', 30, 'lantern');
  put('c12swallow', sx, sy, 0, {});
  light(sx, sy, 1.5, '#6ac0b8', 24, 'wisp');
  // the Long Pier, from the west
  const pa = Math.atan2(C12B.PIER[1] - sy, C12B.PIER[0] - sx);
  put('c12pier', sx, sy, pa, { L: Math.hypot(C12B.PIER[0] - sx, C12B.PIER[1] - sy) + 30 });
  // the wrecks with bells, and others lying about (high decks among them)
  C12B.BELLS.forEach(([x, y, a], i) => { put('c12hulk', x - Math.cos(a) * 2.5, y - Math.sin(a) * 2.5, a + Math.PI / 2, { L: 13 + i * 2, sd: 50 + i }); put('c12bellpost', x, y, a, {}); light(x + Math.cos(a), y + Math.sin(a), 3.4, '#ffb868', 8, 'lantern'); });
  for (const [x, y, a, L, dk] of [[-58, -30, 0.6, 16, 1.6], [-20, -20, 2.1, 12, 0], [44, -78, 1.0, 14, 1.4], [84, -20, 2.6, 15, 0], [-60, 34, 0.3, 18, 1.8], [78, 56, 1.9, 12, 1.5], [-12, 76, 0.2, 14, 0], [-74, -66, 1.3, 11, 0]])
    put('c12hulk', x, y, a, { L, deck: dk || 0, sd: Math.round(x * 7 + y) });
  // boulders the sea used to cover (a few to stand on)
  const R = seeded(0x12b0);
  for (let i = 0; i < 26; i++) {
    const x = (R() - 0.5) * 180, y = (R() - 0.5) * 180;
    if (Math.hypot(x - sx, y - sy) < 24 || Math.hypot(x - lx, y - ly) < lr + 5 || Math.hypot(x - C12B.START[0], y - C12B.START[1]) < 8 || c12bRun.some(Rn => c12bIn(Rn, x, y))) continue;
    if (C12B.BELLS.some(b => Math.hypot(x - b[0], y - b[1]) < 9)) continue;
    put('step', x, y, R() * 6, { w: 1.6 + R() * 2.5, d: 1.4 + R() * 2.2, hh: 0.5 + R() * 1.1, col: ['#5a554c', '#6a6458', '#4e4a42'][(R() * 3) | 0] });
  }
}

// ---------- the stage ----------
cpStage('m12bed', {
  n: 'The Dry Bed', mend: true,
  map: { start: C12B.START.slice(), top: 0, R: C12B.R, isle: 'cpm12bed', shore: () => -999, nav: [-98, 98, -98, 98], zones: { bed: { n: 'the Dry Bed', r: [-100, 100, -100, 100], sky: true } } },
  music: () => (RAID.st.c12ph | 0) >= 2 ? 'cpm12cine' : 'cpm12bed',
  banner: () => ({ text: 'The Dry Bed', t: 4.5, sub: 'Maren’s End · Part I · the night the sea went out', col: '#cfe4ea' }),
  set(H, K, Z) { c12bSet(H, K, Z); },
  speedK() { const m = FPS.me, [x, y] = c12bLoc(m.x, m.y); return (m.jz || 0) < 0.3 && c12bRun.some(R => c12bIn(R, x, y)) ? C12B.WADE : 1; },
  enter() {
    const S = RAID.st;
    Object.assign(S, { bells: 0, c12ph: 0, mz: 0, spT: 4, said: 0, useT: 0, useI: -1, pend: 0, ballCd: 0, shove: null, heard: [0, 0, 0], sinkT: 0, downT: 0, wrnT: 0 });
    FPS.me.h = bearingOf(1, 0.7); ZM.open = new Set(['raid', 'bed']);
    ZM.round = Math.max(ZM.round, 8); if (typeof ZB !== 'undefined') { ZB.round = ZM.round; ZB.plan = []; }
    if (ZM.net !== 'client') {
      const [px, py] = C12B.POSTS[0], z = rfBoss('maren', px, py, bearingOf(-1, -1), 0);
      if (z) { S.mz = z.zn; z.callCd = 6; }
      cpObjective('Cross the bed to the Swallow. Ring the wrecks’ bells to drive her off the rim');
      c12bWp();
    }
  },
  tick(dt) {
    const S = RAID.st, n = c12N(), ct = RAID.ct || RAID.t || 0;
    S.t = (S.t || 0) + dt;
    if (!S.said && S.t > 3) { S.said = 1; cpSay('ruth', 'Lamp’s lit. Keep together, and watch the runnels before you cross.', 'cp_m12_11'); }
    // Maren held at her post (the boss framework walks her: she's put back)
    const M = ZM.z.find(z => z.zn === S.mz && !z.dead);
    if (M) { const k = Math.min(c12bBellsN(), C12B.POSTS.length - 1), [px, py] = C12B.POSTS[k]; M.x = FPSC.CX + px; M.y = FPSC.CY + py; M.lx = M.x; M.ly = M.y; M.walk = false; }
    // the surges sweep the drowned away
    for (const z of ZM.z) if (!z.dead && !z.boss) { const [x, y] = c12bLoc(z.x, z.y); for (const R of c12bRun) { const q = c12bIn(R, x, y); if (q && c12bHit(R, q.t, ct)) { zmKill(z, false, 0, 'sea', ''); break; } } }
    // the drowned, up out of the salt round you
    S.spT -= dt;
    if (S.spT <= 0 && (S.c12ph | 0) < 2) {
      S.spT = (2.4 - 0.25 * c12bBellsN()) * (0.75 + Math.random() * 0.5) / Math.sqrt(n);
      if (ZM.z.filter(z => !z.dead && !z.boss).length < 5 + 3 * n) c12bSpawn(1);
    }
    // the third bell: she's driven down into the Swallow
    if ((S.c12ph | 0) === 0 && c12bBellsN() >= 3) {
      S.c12ph = 1;
      cpCine('m12_sink', () => {
        const M2 = ZM.z.find(z => z.zn === S.mz && !z.dead); if (M2) { M2.dead = 1; M2.deadT = 0; }
        S.c12ph = 2; cpObjective('Down the wreck lodged in the Swallow’s lip: climb down her mast'); cpWaypoint(C12B.WRECK[0], C12B.WRECK[1], 'The lodged wreck', 2);
        cpSay('ruth', 'She’s gone down ahead of us. Then so do we. Down the mast, and mind the lamp.', 'cp_m12_12');
      });
    }
  },
  players(P) { return P; },
  q(sid, k, a) {
    const S = RAID.st;
    if (k === 'c12bell') { c12bRing(a | 0, sid); return; }
    if (k === 'c12down') { if ((S.c12ph | 0) === 2 && !S.down) { S.down = 1; cpDone(); } return; }
  },
  pack(o) { const S = RAID.st; o.c12b = [S.bells | 0, S.c12ph | 0, S.mz | 0]; },
  apply(o) {
    if (!Array.isArray(o.c12b)) return; const S = RAID.st, b = o.c12b[0] | 0;
    for (let i = 0; i < 3; i++) if ((b & (1 << i)) && !((S.bells | 0) & (1 << i))) { const [x, y] = c12W(C12B.BELLS[i][0], C12B.BELLS[i][1]); c12BellFx(x, y); C12B3.sw[i] = 1; }
    S.bells = b; S.c12ph = o.c12b[1] | 0; S.mz = o.c12b[2] | 0;
  },
  consider(c) {
    const S = RAID.st, m = FPS.me, mz = m.jz || 0;
    if ((S.c12ph | 0) === 0) C12B.BELLS.forEach(([x, y, a], i) => { if (!((S.bells | 0) & (1 << i))) { const [wx, wy] = c12W(x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.6); c({ k: 'c12bell', i }, wx, wy, mz, C12B.BELL_R, false); } });
    if ((S.c12ph | 0) === 2) { const [wx, wy] = c12W(C12B.WRECK[0], C12B.WRECK[1]); c({ k: 'c12down' }, wx, wy, mz, 3.2, false); }
  },
  prompt(o) {
    const S = RAID.st, k = S.useI === (o.i == null ? -2 : o.i) ? Math.min(1, S.useT / C12B.RING_T) : 0;
    if (o.k === 'c12bell') return { text: `Hold to ring the wreck’s bell${k > 0 ? ` (${Math.round(k * 100)}%)` : ''}`, hold: true };
    if (o.k === 'c12down') return { text: 'Hold to climb down the mast into the Swallow', hold: true };
    return null;
  },
  use(o) { return o.k === 'c12bell' || o.k === 'c12down'; },
  me(dt) {
    const S = RAID.st, m = FPS.me, ct = RAID.ct || 0, alive = c12Able();
    // caught in a surge: half your health, and thrown down the channel
    if (S.ballCd > 0) S.ballCd -= dt;
    S.wade = false; S.warn = 0;
    if (alive) {
      const [x, y] = c12bLoc(m.x, m.y), low = (m.jz || 0) < 0.6;
      for (const R of c12bRun) {
        const q = c12bIn(R, x, y); if (!q) { const px = x - R.ax, py = y - R.ay, t = px * R.ux + py * R.uy, o = Math.abs(-px * R.uy + py * R.ux); if (t > 0 && t < R.L && o < R.w / 2 + 5) { const f = c12bFront(R, ct); if (f < t && t - f < 45) S.warn = Math.max(S.warn, 1 - (t - f) / 45); } continue; }
        S.wade = true;
        const f = c12bFront(R, ct); if (f < q.t && q.t - f < 45) S.warn = Math.max(S.warn, 1 - (q.t - f) / 45);
        if (low && S.ballCd <= 0 && c12bHit(R, q.t, ct)) {
          S.ballCd = 1.4;
          if (!(m.protect > 0)) { m.iframe = 0; fpsHurt(C12B.HIT, null, null); }
          FPS.hurtT = 0.9; zmSound('hit'); fpsFeed('The last of the sea came down the runnel and took your feet from under you.');
          S.shove = [R.ux * C12B.SHOVE, R.uy * C12B.SHOVE, 0.4];
          try { if (typeof sfxPlay === 'function') sfxPlay('splash', { vol: 0.9 }); } catch (e) {}
          break;
        }
      }
    }
    if (S.shove && S.shove[2] > 0) { const k = dt / 0.4; zmMove(m, S.shove[0] * k, S.shove[1] * k); S.shove[2] -= dt; }
    // each surge heard coming, from upstream
    c12bRun.forEach((R, i) => { const cyc = Math.floor((ct + R.ph) / R.T); if (cyc !== S.heard[i]) { const [x, y] = c12bLoc(m.x, m.y), px = x - R.ax, py = y - R.ay, t = px * R.ux + py * R.uy, o = Math.abs(-px * R.uy + py * R.ux); if (o < 40 && t > -10 && t < R.L + 10 && c12bFront(R, ct) > Math.max(0, t - 40)) { S.heard[i] = cyc; try { if (!soundOff() && typeof sfxPlay === 'function') sfxPlay('sea', { vol: clamp(0.9 - o / 50, 0.2, 0.9), vary: 0.08 }); } catch (e) {} } } });
    // hold Use: a bell, or the mast
    const o = ZM.near, hold = c12Hold() && alive;
    if (hold && o && (o.k === 'c12bell' || o.k === 'c12down') && !(S.pend > 0)) {
      const id = o.k === 'c12bell' ? o.i : -1, need = o.k === 'c12bell' ? C12B.RING_T : 1.2;
      if (S.useI !== id) { S.useI = id; S.useT = 0; }
      S.useT += dt;
      if (o.k === 'c12bell' && Math.random() < dt * 4) try { tone(880 + Math.random() * 60, 'triangle', 0.002, 0.03, 0.12); } catch (e) {}
      if (S.useT >= need) { S.useT = 0; S.useI = -9; S.pend = 1.2; raidAsk(o.k, id); }
    } else if (!hold) { S.useT = 0; S.useI = -9; }
    if (S.pend > 0) S.pend -= dt;
  },
  hud(phone, mono, fell) {
    const S = RAID.st, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44), t = g.t, ph = S.c12ph | 0;
    const line = ph === 0 ? `Bells rung: ${c12bBellsN()} of 3. Lead won’t touch her; the bells will.` : ph === 1 ? 'She’s going down.' : 'Climb down the lodged wreck’s mast.';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = 'rgba(236,228,207,0.82)';
    ctx.fillText(line, L, top, W * 0.5); fpsHudNote(top + (phone ? 14 : 18));
    if (ZM.over || !c12Able()) return;
    if (S.warn > 0.05) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 11 : 14); ctx.fillStyle = `rgba(190,230,255,${0.45 + 0.5 * S.warn * (0.6 + 0.4 * Math.sin(t * 14))})`; ctx.fillText(S.wade ? 'A SURGE IS COMING DOWN THE RUNNEL: GET OUT' : 'A SURGE IS COMING', cx, H - (phone ? 150 : 100)); }
    else if (S.wade) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(170,210,230,0.7)'; ctx.fillText('WADING', cx, H - (phone ? 150 : 100)); }
  },
  b3(grp) { c12b3dBuild(grp); },
  f3(dt) { c12b3d(dt); },
  exit() { c12Sea(true); C12B3.on = false; },
});
// (hosting) the next bell to make for, or the wreck
function c12bWp() { const S = RAID.st, i = C12B.BELLS.findIndex((b, j) => !((S.bells | 0) & (1 << j))); if (i < 0) { cpWaypoint(null); return; } cpWaypoint(C12B.BELLS[i][0], C12B.BELLS[i][1], 'A wreck’s bell', 3.4); }
// (hosting) n of the drowned up out of the salt, out of sight of you but not far off, never in the hole or a runnel
function c12bSpawn(n) {
  const P = ZM.players || [], np = c12N();
  for (let k = 0; k < n; k++) for (let tr = 0; tr < 16; tr++) {
    const p = P[(Math.random() * P.length) | 0]; if (!p) return;
    const a = Math.random() * 6.283, d = 16 + Math.random() * 18, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d, [lx, ly] = c12bLoc(x, y);
    if (Math.hypot(lx, ly) > C12B.R - 4 || Math.hypot(lx - C12B.SW[0], ly - C12B.SW[1]) < C12B.SW[2] + 3 || c12bRun.some(R => c12bIn(R, lx, ly))) continue;
    if (P.some(q => Math.hypot(q.x - x, q.y - y) < 12) || zmBlockedAt(x, y, 0.5, 0)) continue;
    const u = Math.random(), kind = u < 0.15 ? 'run' : u < 0.7 ? 'jog' : 'walk';
    raidSpawnAt(x, y, { kind, hp: zmHp(RAIDC.ROUND + 1) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (np - 1)) });
    break;
  }
}
// (hosting) bell i rung by sid
function c12bRing(i, sid) {
  const S = RAID.st; if (i < 0 || i > 2 || ((S.bells | 0) & (1 << i)) || (S.c12ph | 0) !== 0) return;
  S.bells = (S.bells | 0) | (1 << i);
  const [bx, by] = c12W(C12B.BELLS[i][0], C12B.BELLS[i][1]); c12BellFx(bx, by); C12B3.sw[i] = 1;
  const sunk = c12BellSinks(bx, by, C12B.SINK_R), n = c12bBellsN();
  fpsFeed(`${c12Nick(sid)} rang a wreck’s bell${sunk ? ` (${sunk} of the drowned went down)` : ''}: ${n} of 3.`);
  c12bWp();
  // she answers: more of them up all over the bed
  if (n < 3) c12bSpawn(2 + c12N());
  if (n === 1) cpCine('m12_rim', () => { cpSay('ruth', 'She felt that. Two more bells, and she’ll have to give up the rim.', 'cp_m12_13'); });
  if (n === 2) cpSay('maren', 'Ring, then. They rang it for me the night I went. It did not bring me home.', 'cp_m12_14');
}

// ---------- in 3D: the runnels' water and their surges, the bells, the Light's beam ----------
const C12B3 = { on: false, run: [], bells: [], sw: [0, 0, 0], beam: null };
function c12b3dBuild(grp) {
  C12B3.on = true; C12B3.run = []; C12B3.bells = []; C12B3.sw = [0, 0, 0];
  const G0 = FPSC.GROUND, shallow = new THREE.MeshPhongMaterial({ color: 0x163040, specular: 0x6a8aa0, shininess: 60, transparent: true, opacity: 0.72, depthWrite: false });
  const surgeM = new THREE.MeshPhongMaterial({ color: 0x3a6a80, specular: 0xaaccdd, shininess: 40, transparent: true, opacity: 0.85 });
  const foamM = new THREE.MeshBasicMaterial({ color: 0xe0f0f4, transparent: true, opacity: 0.9 });
  for (const R of c12bRun) {
    const ang = Math.atan2(R.uy, R.ux), [mx, my] = c12W((R.ax + R.bx) / 2, (R.ay + R.by) / 2);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(R.L, 0.08, R.w + 0.6), new THREE.MeshLambertMaterial({ color: 0x2a2a28 })); bed.position.copy(z3v(mx, my, G0 - 0.02)); bed.rotation.y = ang; grp.add(bed);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(R.L, R.w), shallow); w.rotation.set(-Math.PI / 2, 0, ang); w.position.copy(z3v(mx, my, G0 + 0.08)); grp.add(w);
    const s = new THREE.Group(); grp.add(s);
    const body = new THREE.Mesh(new THREE.BoxGeometry(C12B.BAND, 0.9, R.w + 0.4), surgeM); body.position.set(-C12B.BAND / 2, 0.45, 0); s.add(body);
    const front = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, R.w + 0.8), foamM); front.position.set(0, 0.7, 0); s.add(front);
    C12B3.run.push({ R, s, ang, front });
  }
  for (const [x, y, a] of C12B.BELLS) { const [wx, wy] = c12W(x, y); C12B3.bells.push(c12Bell3(grp, wx, wy, a)); }
  // the Light's beam, turning: a long pale cone from the lantern
  const [lx, ly] = c12W(C12B.LIGHT[0], C12B.LIGHT[1]), bm = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(14, 260, 16, 1, true), bm); cone.rotation.z = Math.PI / 2; cone.position.x = 130;
  const piv = new THREE.Group(); piv.position.copy(z3v(lx, ly, G0 + 40)); piv.add(cone); grp.add(piv); C12B3.beam = piv;
}
function c12b3d(dt) {
  if (!C12B3.on) return;
  c12Sea(false);
  const ct = RAID.ct || 0, G0 = FPSC.GROUND, t = g.t;
  for (const Q of C12B3.run) {
    const f = c12bFront(Q.R, ct), vis = f - C12B.BAND < Q.R.L, ff = Math.min(f, Q.R.L);
    Q.s.visible = vis; if (!vis) continue;
    const [x, y] = c12W(Q.R.ax + Q.R.ux * ff, Q.R.ay + Q.R.uy * ff); Q.s.position.copy(z3v(x, y, G0)); Q.s.rotation.y = Q.ang;
    Q.s.scale.x = clamp(Math.min(f, C12B.BAND) / C12B.BAND, 0.05, 1) * (f > Q.R.L ? clamp(1 - (f - Q.R.L) / C12B.BAND, 0.05, 1) : 1);
    Q.front.visible = f < Q.R.L; Q.front.scale.y = 0.8 + 0.3 * Math.sin(t * 9);
    if (Math.random() < dt * 14 && f < Q.R.L) fpsPuff(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3, G0 + 1 + Math.random(), '220,236,240', 2);
  }
  C12B3.bells.forEach((B, i) => { if (C12B3.sw[i] > 0) C12B3.sw[i] = Math.max(0, C12B3.sw[i] - dt * 0.35); B.g.rotation.x = Math.sin(t * 7) * 0.6 * C12B3.sw[i]; });
  if (C12B3.beam) C12B3.beam.rotation.y = reduceMotion ? 0.6 : t * 0.45;
}

// ---------- its cutscenes: she hears the first bell; she's driven down ----------
const c12bM = () => { const z = ZM.z.find(q => q.bt === 'maren' && !q.dead); return z ? c12bLoc(z.x, z.y) : C12B.POSTS[0]; };
cpCineDef('m12_rim', { music: 'cpm12cine', shots: [
  { d: 4.5, cam: [22, 24, 3], to: [20, 30, 4.2], look: [10, 50, 4.5], lookTo: [9, 49, 5.5],
    f(t, k, C) { const [x, y] = c12bM(); this.look = [x, y, 4.5]; this.lookTo = [x, y, 5.5]; },
    lines: [[0.3, 'ruth', 'There, on the lip, by the wreck. That’s no one of ours.', 'cp_m12_15']], sfx: [[0.2, 'wind', 0.5]] },
  { d: 5.5, cam: [16, 36, 2.2], to: [15, 40, 2.6], look: [10, 50, 5], lookTo: [10, 50, 5.6],
    f(t, k, C) { const [x, y] = c12bM(); this.cam = [x + 6, y - 14, 2.2]; this.to = [x + 5, y - 10, 2.6]; this.look = [x, y, 5]; this.lookTo = [x, y, 5.6]; },
    lines: [[0.4, 'maren', 'You’ve brought my lamp. Bring it to me, then.', 'cp_m12_16'], [3.3, 'log', 'They had heard the bell carry, and so had she. She gave a step.', 'cp_m12_17']], sfx: [[0.3, 'sea', 0.5]] },
] });
cpCineDef('m12_sink', { music: 'cpm12cine', shots: [
  { d: 6, cam: [24, 30, 5], to: [20, 26, 9], look: [5, 44, 3], lookTo: [0, 40, -2],
    f(t, k, C) { const z = ZM.z.find(q => q.bt === 'maren' && !q.dead); if (z) { const [px, py] = C12B.POSTS[2]; z.x = FPSC.CX + px * (1 - k); z.y = FPSC.CY + C12B.SW[1] + (py - C12B.SW[1]) * (1 - k); z.jz = -k * k * 7; } },
    lines: [[0.4, 'maren', 'Down, then. Come down to me.', 'cp_m12_18'], [3.2, 'log', 'She went back over the lip of the Swallow, and down, and the last of the water went with her.', 'cp_m12_19']], sfx: [[0.2, 'sea', 0.8], [2.8, 'thunder', 0.4]] },
] });
