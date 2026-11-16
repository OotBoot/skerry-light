'use strict';
// The Chronicle of the Light, mission 12 (Maren's End), part II: the Old Drain (cp_m12drain). Down the lodged
// wreck's mast, partway into the Swallow, a hole in its side where some of the water went another way: a drain the
// Spanish garrison cut under the bed three hundred years ago, from the fort's cistern out to the sea. Not the Deep
// Path and not the Black Water: a low stone gallery, rooms where the old sluices were, and the cistern hall under
// the fort at its end.
//  - The dark: out of the light it drains you, as on the Deep Path; in the light you get back what it took. Light is
//    a lit brazier, a lit lamp in the cistern hall, or Maren's Lantern, which one of you carries (whoever came down
//    first: anyone can take it up where it falls, if its carrier goes down). Only the lantern lights the braziers
//    (hold Use at one, carrying it).
//  - The cistern hall: the grate up into the fort opens to nine lamps lit all together, set in three rows of three
//    in front of it. Turn a lamp with the lantern (hold Use) and the lamps beside it in its row and column turn too.
//    The drowned come up out of the cistern the whole while.
//  - The grate: open, the lantern won't go through it (src/lore.js: it would not go through the door at the end).
//    Set it down on the ledge beside it (a cutscene, m12_lantern), and through: up the drain to the fort's sea wall.
// The host's word: c12d [lamps (bits), braziers lit (bits), the gate, the lantern's carrier ('' lying, '@' on the
// ledge), where it lies]. Places are about the island's middle.

const C12D = {
  START: [0, -75], ROOF: 4.2, ROOF2: 6.2, WH: 4.6, LIT_R: 8, LAMP_R: 3.6, LAN_R: 6.5, DRAIN: 0.22, MEND: 1.1, USE: 1.0, TURN: 0.6,
  // rooms and corridors [x0, x1, y0, y1]: the landing, the gallery, the sluice room, three legs round, the cistern hall, the way up
  RECTS: [[-8, 8, -80, -66], [-2.5, 2.5, -66, -36], [-9, 9, -36, -20], [9, 30, -30, -25], [25, 30, -25, 10], [12, 30, 10, 15], [-16, 12, 6, 40], [-4.5, 0.5, 40, 54]],
  BRAZ: [[5, -77], [1.5, -51], [-6.5, -33], [6.5, -22.5], [27.5, -27.5], [27.5, -6], [22, 12.5], [-13.5, 8.5], [9.5, 37.5]],
  CIS: [-2, 15, 3.6], LAMPS: [-10, -2, 6].flatMap(x => [24, 30, 36].map(y => [x, y])), GATE: [-4.5, 0.5, 40], LEDGE: [0.9, 39.5],
  SPAWN: [[0, -72], [0, -58], [0, -44], [-6, -25], [6, -33], [18, -27.5], [27.5, -14], [27.5, 2], [18, 12.5], [-13, 30], [9, 22], [-13, 12], [8, 8], [-2, 15]],
  NAV: [-20, 34, -84, 58],
};
// (lamps in rows of three: i = column * 3 + row, as LAMPS is laid; turning one turns those beside it)
function c12dFlip(v, i) { const c = (i / 3) | 0, r = i % 3; let m = 1 << i; if (r > 0) m |= 1 << (i - 1); if (r < 2) m |= 1 << (i + 1); if (c > 0) m |= 1 << (i - 3); if (c < 2) m |= 1 << (i + 3); return v ^ m; }
const c12dBits = v => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };
const c12dLoc = (x, y) => [x - FPSC.CX, y - FPSC.CY];

// ---------- props of its own ----------
// a brazier: the descent's (src/raid.js rdbrazier) is borrowed as it is; the lamp: a squat stone post, an iron cage
// on it, a cup of oil in the cage (it's lit in 3D)
FPI_K.c12lamp = {
  col: '#4a4640',
  sol(p) { return [fpiCirc(p, 0, 0, 0.35, 1.1)]; },
  b3(p, A) { A.cyl('#4a4640', 0, 0, -0.1, 0.35, 0.9); A.cyl('#3a3632', 0, 0, 0.78, 0.42, 0.1); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.78; A.box('#1e1c1a', Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0.86, 0.05, 0.05, 0.5); } A.cyl('#1e1c1a', 0, 0, 1.34, 0.3, 0.06); A.cyl('#2a2622', 0, 0, 0.9, 0.14, 0.1); },
};
// the cistern: a low round kerb of dressed stone, black water inside it, an iron bar across
FPI_K.c12cistern = {
  col: '#6a6458',
  sol(p) { return [fpiCirc(p, 0, 0, p.r + 0.4, 0.9)]; },
  b3(p, A) {
    for (let k = 0; k < 3; k++) A.cyl('#6a6458', 0, 0, -0.1, p.r + 0.4, 1.0, k * 0.26);
    for (let k = 0; k < 3; k++) A.cyl('#05080a', 0, 0, 0.82, p.r - 0.05, 0.06, k * 0.26);
    A.box('#2a2622', 0, 0, 0.95, p.r * 2 + 0.6, 0.12, 0.12);
  },
};
// the grate up into the fort's drain: its frame of dressed stone (the bars are drawn in 3D, so they can rise), and
// the ledge beside it where the lantern is left
FPI_K.c12grate = {
  noShadow: true,
  sol(p) { return [fpiBox(p, 2.9, -0.4, 0.5, 0.4, 1.0)]; },
  b3(p, A) { const w = 5; for (const s of [-1, 1]) A.box('#7a7262', s * (w / 2 + 0.3), 0, -0.1, 0.6, 0.8, 3.6); A.box('#7a7262', 0, 0, 3.2, w + 1.2, 0.8, 0.6); A.box('#6a6458', 2.9, -0.4, -0.1, 1.0, 0.8, 1.1); for (let i = 0; i < 7; i++) A.glow('#7ac8b0', -w / 2 + i * w / 6, -0.42, 3.5, 0.06); },
};
// the old sluice gates in their slots, rusted open (only to look at), and a dribble of water down the gallery
FPI_K.c12sluice = {
  noShadow: true,
  b3(p, A) { A.box('#5a5650', -2.2, 0, -0.1, 0.5, 0.6, C12D.ROOF); A.box('#5a5650', 2.2, 0, -0.1, 0.5, 0.6, C12D.ROOF); A.box('#2e2a26', 0, 0, 2.6, 4.0, 0.2, 1.5); for (let u = -1.8; u < 1.9; u += 0.45) A.box('#22201e', u, 0, 2.5, 0.08, 0.3, 1.7); A.box('#1e2a30', 0, 0, -0.08, 4.4, 9, 0.04); },
};

// ---------- laying it out ----------
function c12dSet(H, K, Z) {
  const { put, light, wall } = K, ST = { mat: 'stone', hh: C12D.WH, cap: false }, w = (x0, y0, x1, y1) => wall(x0, y0, x1, y1, ST);
  // R0 the landing
  w(-8, -80, 8, -80); w(-8, -80, -8, -66); w(8, -80, 8, -66); w(-8, -66, -2.5, -66); w(2.5, -66, 8, -66);
  // C1 the gallery
  w(-2.5, -66, -2.5, -36); w(2.5, -66, 2.5, -36);
  // R1 the sluice room
  w(-9, -36, -2.5, -36); w(2.5, -36, 9, -36); w(-9, -36, -9, -20); w(-9, -20, 9, -20); w(9, -36, 9, -30); w(9, -25, 9, -20);
  // C2, C3, C4: round to the hall
  w(9, -30, 30, -30); w(9, -25, 25, -25); w(30, -30, 30, 15); w(25, -25, 25, 10); w(12, 10, 25, 10); w(12, 15, 30, 15);
  // R2 the cistern hall
  w(12, 6, 12, 10); w(12, 15, 12, 40); w(-16, 6, 12, 6); w(-16, 6, -16, 40); w(-16, 40, -4.5, 40); w(0.5, 40, 12, 40);
  // C5 the way up
  w(-4.5, 40, -4.5, 54); w(0.5, 40, 0.5, 54); w(-4.5, 54, 0.5, 54);
  // the roofs: low over the galleries, higher over the hall
  C12D.RECTS.forEach(([x0, x1, y0, y1], i) => put('ceil', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0 + 0.6, d: y1 - y0 + 0.6, z0: i === 6 ? C12D.ROOF2 : C12D.ROOF, col: '#2a2826', beams: false }));
  // where we came in: the mast's foot through a hole in the landing's roof, the rope down it, a little night above
  put('block', -4.5, -77, 0.4, { w: 0.42, d: 0.42, hh: C12D.ROOF + 0.4, col: '#3e3024' });
  light(-4.5, -77, 3.6, '#7a9ab8', 7, 'wisp');
  // the sluices in the gallery and the sluice room
  put('c12sluice', 0, -58, 0, {}); put('c12sluice', 0, -44, 0, {}); put('c12sluice', 0, -28, 0, {});
  // the braziers (dark until lit), the cistern, the lamps, the grate
  for (const [x, y] of C12D.BRAZ) put('rdbrazier', x, y, 0, {});
  put('c12cistern', C12D.CIS[0], C12D.CIS[1], 0, { r: C12D.CIS[2] });
  for (const [x, y] of C12D.LAMPS) put('c12lamp', x, y, 0, {});
  put('c12grate', (C12D.GATE[0] + C12D.GATE[1]) / 2, C12D.GATE[2], 0, {});
  // drifts of old wrack along the walls: bones, broken oars, a canoe turned over (what the water brought down)
  const R = seeded(0x12d0);
  for (let i = 0; i < 40; i++) {
    const Rc = C12D.RECTS[(R() * C12D.RECTS.length) | 0], side = R() < 0.5, x = side ? (R() < 0.5 ? Rc[0] + 0.7 : Rc[1] - 0.7) : Rc[0] + R() * (Rc[1] - Rc[0]), y = side ? Rc[2] + R() * (Rc[3] - Rc[2]) : (R() < 0.5 ? Rc[2] + 0.7 : Rc[3] - 0.7);
    if (C12D.BRAZ.some(b => Math.hypot(b[0] - x, b[1] - y) < 2) || C12D.LAMPS.some(b => Math.hypot(b[0] - x, b[1] - y) < 2) || Math.hypot(x - C12D.START[0], y - C12D.START[1]) < 3 || (y > 36 && x > -6 && x < 4)) continue;
    put('block', x, y, R() * 3, { w: 0.4 + R() * 1.4, d: 0.2 + R() * 0.5, hh: 0.12 + R() * 0.3, col: ['#cfc6b0', '#4a3a2a', '#3a2e22', '#5a5048'][(R() * 4) | 0] });
  }
  light(-2, 15, 1.4, '#5ab8a8', 9, 'wisp');
}

// ---------- the lantern: who has it, where it is ----------
// S.lan: the carrier's id, '' lying at S.lanAt, '@' left on the ledge
function c12dLanXY() {
  const S = RAID.st;
  if (S.lan === '@') return c12W(C12D.LEDGE[0], C12D.LEDGE[1]);
  if (!S.lan) return S.lanAt ? [S.lanAt[0], S.lanAt[1]] : c12W(C12D.START[0], C12D.START[1]);
  if (S.lan === FPS.me.id) return [FPS.me.x, FPS.me.y];
  const r = FPS.remote && FPS.remote.get(S.lan); return r && r.x != null ? [r.x, r.y] : null;
}
const c12dMine = () => RAID.st.lan === FPS.me.id;
// in the light? (a world place)
function c12dInLight(x, y) {
  const S = RAID.st;
  for (let i = 0; i < C12D.BRAZ.length; i++) if ((S.braz | 0) & (1 << i)) { const [bx, by] = c12W(C12D.BRAZ[i][0], C12D.BRAZ[i][1]); if (Math.hypot(bx - x, by - y) < C12D.LIT_R) return true; }
  for (let i = 0; i < 9; i++) if ((S.lamps | 0) & (1 << i)) { const [bx, by] = c12W(C12D.LAMPS[i][0], C12D.LAMPS[i][1]); if (Math.hypot(bx - x, by - y) < C12D.LAMP_R) return true; }
  const L = c12dLanXY(); return !!(L && Math.hypot(L[0] - x, L[1] - y) < C12D.LAN_R);
}
// (every screen) the island's own lights for what's lit: braziers and lamps
function c12dLights() {
  const S = RAID.st, I = FPS.g && FPS.g.isle; if (!I || !I.lights) return;
  I.lights = I.lights.filter(L => L.c12 == null);
  for (let i = 0; i < C12D.BRAZ.length; i++) if ((S.braz | 0) & (1 << i)) { const [x, y] = c12W(C12D.BRAZ[i][0], C12D.BRAZ[i][1]); I.lights.push({ x, y, z: FPSC.GROUND + 1.6, c: '#ff9a48', r: C12D.LIT_R * 1.5, k: 'fire', ph: i * 1.7, c12: 'b' + i }); }
  for (let i = 0; i < 9; i++) if ((S.lamps | 0) & (1 << i)) { const [x, y] = c12W(C12D.LAMPS[i][0], C12D.LAMPS[i][1]); I.lights.push({ x, y, z: FPSC.GROUND + 1.5, c: '#ffc070', r: C12D.LAMP_R * 1.6, k: 'fire', ph: i * 2.3, c12: 'l' + i }); }
}

// ---------- the stage ----------
cpStage('m12drain', {
  n: 'The Old Drain', zSpeed: 0.95,
  get lantern() { return RAID.on && !!RAID.st && RAID.st.lan === FPS.me.id; },
  map: { start: C12D.START.slice(), top: 0, nav: C12D.NAV, zones: { drain: { n: 'the Old Drain', r: [-20, 34, -84, 40] }, hall: { n: 'the Cistern Hall', r: [-16, 12, 6, 40] }, up: { n: 'the Way Up', r: [-5, 1, 40, 56] } } },
  music: () => 'cpm12drain',
  banner: () => ({ text: 'The Old Drain', t: 4.5, sub: 'Maren’s End · Part II · under the bed, to the fort', col: '#bfe4ff' }),
  set(H, K, Z) { c12dSet(H, K, Z); },
  enter() {
    const S = RAID.st;
    Object.assign(S, { lamps: 0, braz: 0, gate: 0, lan: '', lanAt: null, dark: 0, spT: 5, useT: 0, useI: '', pend: 0, said: {}, thru: false, inLight: true });
    FPS.me.h = 0; ZM.open = new Set(['raid', 'drain', 'hall', 'up']);
    if (ZM.net !== 'client') {
      // the lamps scrambled from all lit by a few turns (so a few turns put them right), never all lit to begin with
      let v = 511; const n = 3 + ((Math.random() * 3) | 0), done = new Set();
      while (done.size < n) done.add((Math.random() * 9) | 0);
      for (const i of done) v = c12dFlip(v, i);
      if (v === 511) v = c12dFlip(v, 4);
      S.lamps = v;
      S.lan = (ZM.hum && ZM.hum[0] && ZM.hum[0][0]) || FPS.me.id;
      cpObjective('Follow the drain to the fort. Light the braziers with the lantern; keep to the light');
      cpWaypoint(C12D.BRAZ[1][0], C12D.BRAZ[1][1], 'The gallery', 1.2);
    }
    c12dLights();
  },
  tick(dt) {
    const S = RAID.st, n = c12N(), P = ZM.players || [];
    // the lantern's carrier gone or down: it falls where they were
    if (S.lan && S.lan !== '@') {
      const me = S.lan === FPS.me.id, r = me ? FPS.me : FPS.remote && FPS.remote.get(S.lan), here = me || (ZM.hum || []).some(h => h[0] === S.lan);
      const down = me ? (FPS.me.dead > 0 || zmIsDown()) : !!(r && (r.down || r.dead > 0));
      if (!here || !r || down) { S.lanAt = r && r.x != null ? [r.x, r.y] : (S.lanAt || c12W(C12D.START[0], C12D.START[1])); S.lan = ''; fpsFeed('Maren’s Lantern is down on the stones. Take it up!'); }
    }
    // the drowned, out of the dark
    S.spT -= dt;
    const inHall = P.some(p => { const [x, y] = c12dLoc(p.x, p.y); return x > -16 && x < 12 && y > 6 && y < 40; });
    if (S.spT <= 0 && !S.thru) {
      S.spT = (inHall && !S.gate ? 1.5 : 2.4) * (0.75 + Math.random() * 0.5) / Math.sqrt(n);
      if (ZM.z.filter(z => !z.dead && !z.boss).length < (inHall ? 6 : 4) + 3 * n) c12dSpawn(inHall);
    }
    // the waypoint, and what's said as you go
    const far = P.reduce((a, p) => Math.max(a, c12dLoc(p.x, p.y)[1] + (c12dLoc(p.x, p.y)[0] > 9 ? 40 : 0)), -99);
    if (!S.said.hall && inHall) { S.said.hall = 1; cpWaypoint(C12D.LAMPS[4][0], C12D.LAMPS[4][1], 'The lamps', 1.4); cpObjective('Light all nine lamps before the grate. Each one turned turns its neighbours'); cpSay('ruth', 'Nine lamps, and a grate. Turn one and the ones beside it turn too. Bring the lantern.', 'cp_m12_20'); }
    else if (!S.said.leg && !S.said.hall && far > -28) { S.said.leg = 1; cpWaypoint(27.5, 0, 'The drain goes on', 1.2); cpSay('ruth', 'The water went this way. There’s an old Spanish drain under the bed, running for the fort.', 'cp_m12_21'); }
    if (!S.said.cist && inHall && c12dBits(S.lamps | 0) >= 7 && !S.gate) { S.said.cist = 1; cpSay('ruth', 'Nearly. Think before you turn the next.', 'cp_m12_22'); }
    S.t = (S.t || 0) + dt;
    // through: anyone up the way past the grate
    if (S.gate && S.lan === '@' && !S.thru && P.some(p => c12dLoc(p.x, p.y)[1] > 49)) { S.thru = true; cpDone(); }
  },
  q(sid, k, a) {
    const S = RAID.st;
    if (k === 'c12lit') { const i = a | 0; if (S.lan === sid && i >= 0 && i < C12D.BRAZ.length && !((S.braz | 0) & (1 << i))) { S.braz |= 1 << i; c12dLitFx(i, sid); c12dLights(); } return; }
    if (k === 'c12turn') { const i = a | 0; if (S.lan === sid && !S.gate && i >= 0 && i < 9) { S.lamps = c12dFlip(S.lamps | 0, i); c12dTurnFx(i); c12dLights(); if (S.lamps === 511) c12dOpen(); } return; }
    if (k === 'c12take') { if (!S.lan) { S.lan = sid; S.lanAt = null; fpsFeed(`${c12Nick(sid)} took up Maren’s Lantern.`); } return; }
    if (k === 'c12ledge') { if (S.lan === sid && S.gate) { S.lan = '@'; C12.lanLeft = true; cpCine('m12_lantern', () => { cpObjective('Through the grate, and up the drain to the fort'); cpWaypoint(-2, 50, 'Up to the fort', 1.2); }); } return; }
  },
  block(x, y, pad, feet) {
    const S = RAID.st, [lx, ly] = c12dLoc(x, y), [g0, g1, gy] = C12D.GATE;
    return !S.gate && lx > g0 - 0.2 && lx < g1 + 0.2 && ly > gy - pad - 0.2 && ly < gy + pad + 0.2;
  },
  pack(o) { const S = RAID.st, r = v => Math.round((v - FPSC.CX) * 10) / 10; o.c12d = [S.lamps | 0, S.braz | 0, S.gate | 0, S.lan || '', S.lanAt ? r(S.lanAt[0]) : 0, S.lanAt ? Math.round((S.lanAt[1] - FPSC.CY) * 10) / 10 : 0]; },
  apply(o) {
    const a = o.c12d; if (!Array.isArray(a)) return; const S = RAID.st;
    const L = a[0] | 0, B = a[1] | 0, ch = L !== (S.lamps | 0) || B !== (S.braz | 0);
    for (let i = 0; i < C12D.BRAZ.length; i++) if ((B & (1 << i)) && !((S.braz | 0) & (1 << i))) c12dLitFx(i, null);
    if (L !== (S.lamps | 0)) { for (let i = 0; i < 9; i++) if (((L ^ (S.lamps | 0)) >> i) & 1) { C12D3.flash[i] = 1; } try { if (!soundOff()) tone(520, 'triangle', 0.005, 0.06, 0.12, { to: 660 }); } catch (e) {} }
    S.lamps = L; S.braz = B;
    if ((a[2] | 0) && !S.gate) c12dOpen(); S.gate = a[2] | 0;
    if (!(S.pend > 0)) S.lan = String(a[3] || '');
    S.lanAt = S.lan ? null : [FPSC.CX + (+a[4] || 0), FPSC.CY + (+a[5] || 0)];
    if (ch) c12dLights();
  },
  consider(c) {
    const S = RAID.st, m = FPS.me, mz = m.jz || 0, mine = c12dMine();
    if (!S.lan) { const L = c12dLanXY(); if (L) c({ k: 'c12take' }, L[0], L[1], mz, 2.0, false); }
    if (!mine) return;
    if (S.gate) { const [x, y] = c12W(C12D.LEDGE[0], C12D.LEDGE[1]); c({ k: 'c12ledge' }, x, y, mz, 2.4, false); }
    C12D.BRAZ.forEach(([bx, by], i) => { if (!((S.braz | 0) & (1 << i))) { const [x, y] = c12W(bx, by); c({ k: 'c12b', i }, x, y, mz, 2.0, false); } });
    if (!S.gate) C12D.LAMPS.forEach(([lx, ly], i) => { const [x, y] = c12W(lx, ly); c({ k: 'c12l', i }, x, y, mz, 1.6, false); });
  },
  prompt(o) {
    const S = RAID.st, key = o.k + (o.i == null ? '' : o.i), k = S.useI === key ? Math.min(1, S.useT / (o.k === 'c12l' ? C12D.TURN : C12D.USE)) : 0, pc = k > 0 ? ` (${Math.round(k * 100)}%)` : '';
    if (o.k === 'c12take') return { text: 'Take up Maren’s Lantern', free: true };
    if (o.k === 'c12ledge') return { text: 'Set the lantern down on the ledge by the grate', free: true };
    if (o.k === 'c12b') return { text: `Hold to light the brazier from the lantern${pc}`, hold: true };
    if (o.k === 'c12l') return { text: `Hold to turn the lamp (it’s ${((S.lamps | 0) >> o.i) & 1 ? 'lit' : 'dark'})${pc}`, hold: true };
    return null;
  },
  use(o) {
    const S = RAID.st;
    if (o.k === 'c12take') { raidAsk('c12take'); if (ZM.net === 'client') { S.lan = FPS.me.id; S.pend = 1; } return true; }
    if (o.k === 'c12ledge') { raidAsk('c12ledge'); return true; }
    return o.k === 'c12b' || o.k === 'c12l';
  },
  me(dt) {
    const S = RAID.st, m = FPS.me, alive = c12Able();
    if (S.noPass > 0) S.noPass -= dt;
    // carrying the lantern, the open grate won't let you by: held back on the hall's side of it
    if (c12dMine() && S.gate) { const [lx, ly] = c12dLoc(m.x, m.y), [g0, g1, gy] = C12D.GATE; if (lx > g0 - 0.6 && lx < g1 + 0.6 && ly > gy - 0.7) { m.y = FPSC.CY + gy - 0.7; if (!(S.noPass > 0)) { S.noPass = 3; fpsFeed('The lantern will not go through the grate. Set it down on the ledge beside it.'); } } }
    S.inLight = c12dInLight(m.x, m.y);
    if (alive) {
      const max = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
      if (m.hp >= max) S.dark = 0;
      if (S.inLight) { const up = Math.min(C12D.MEND * dt, S.dark || 0, max - m.hp); if (up > 0) { m.hp += up; S.dark -= up; } }
      const cap = max - (S.dark || 0);
      if (m.hp < cap && FPS.calm > (ZM.perks.grog ? 1.6 : 3.2) * RAIDC.CALM) m.hp = Math.min(cap, m.hp + 2 * dt);
      if (!S.inLight && !(m.protect > 0) && !(typeof cpCineOn === 'function' && cpCineOn())) { const dn = Math.min(m.hp, C12D.DRAIN * dt); m.hp -= dn; S.dark = (S.dark || 0) + dn; if (m.hp <= 0) { m.hp = 0; fpsFeed('The dark took the last of you.'); fpsDie(null, null); } }
    }
    // hold Use: a brazier lit, a lamp turned (only with the lantern)
    const o = ZM.near, hold = c12Hold() && alive;
    if (hold && o && (o.k === 'c12b' || o.k === 'c12l') && c12dMine() && !(S.pend > 0)) {
      const key = o.k + o.i, need = o.k === 'c12l' ? C12D.TURN : C12D.USE;
      if (S.useI !== key) { S.useI = key; S.useT = 0; }
      S.useT += dt;
      if (S.useT >= need) { S.useT = 0; S.useI = ''; S.pend = 0.5; raidAsk(o.k === 'c12b' ? 'c12lit' : 'c12turn', o.i); }
    } else if (!hold) { S.useT = 0; S.useI = ''; }
    if (S.pend > 0) S.pend -= dt;
  },
  hud(phone, mono, fell) {
    const S = RAID.st, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44), t = g.t;
    const line = S.gate ? (S.lan === '@' ? 'The lantern is on the ledge. Through the grate, and up.' : 'The grate is open. The lantern won’t go through: set it on the ledge.') : `Braziers lit: ${c12dBits(S.braz | 0)} of ${C12D.BRAZ.length} · lamps lit: ${c12dBits(S.lamps | 0)} of 9`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = 'rgba(236,228,207,0.82)';
    ctx.fillText(line, L, top, W * 0.5);
    const who = S.lan === '@' ? '' : !S.lan ? 'THE LANTERN IS DOWN: TAKE IT UP' : S.lan === FPS.me.id ? 'YOU CARRY MAREN’S LANTERN' : `${c12Nick(S.lan).toUpperCase()} CARRIES THE LANTERN`;
    if (who) { ctx.fillStyle = !S.lan ? `rgba(255,200,120,${0.7 + 0.3 * Math.sin(t * 6)})` : 'rgba(255,216,138,0.8)'; ctx.font = mono(phone ? 9 : 11); ctx.fillText(who, L, top + (phone ? 14 : 18)); }
    fpsHudNote(top + (phone ? 28 : 36));
    // the lamps, as a little board of nine
    const inHall = (() => { const [x, y] = c12dLoc(FPS.me.x, FPS.me.y); return x > -16 && x < 12 && y > 6 && y < 40; })();
    if (inHall && !S.gate) {
      const s = phone ? 9 : 12, x0 = W - Math.max(14, FPS.safeRight || 0) - s * 3.6, y0 = fpsHudTop() + (phone ? 70 : 96);
      for (let i = 0; i < 9; i++) { const c = (i / 3) | 0, r = i % 3, on = ((S.lamps | 0) >> i) & 1; ctx.fillStyle = on ? '#ffd88a' : 'rgba(60,70,80,0.8)'; ctx.beginPath(); ctx.arc(x0 + c * s * 1.2, y0 + (2 - r) * s * 1.2, s * 0.42, 0, 6.283); ctx.fill(); }
      ctx.textAlign = 'center'; ctx.font = mono(phone ? 8 : 10); ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText('THE LAMPS', x0 + s * 1.2, y0 + s * 3.6);
    }
    if (ZM.over || !c12Able()) return;
    if (!S.inLight) { const a = 0.18 + 0.06 * Math.sin(t * 2.2), gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.3, cx, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(10,20,40,0)'); gr.addColorStop(1, `rgba(10,20,40,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 10 : 12);
    ctx.fillStyle = S.inLight ? '#ffd88a' : `rgba(150,200,255,${0.6 + 0.3 * Math.sin(t * 4)})`;
    ctx.fillText(S.inLight ? (S.dark > 0.005 ? 'IN THE LIGHT · MENDING WHAT THE DARK TOOK' : 'IN THE LIGHT') : 'IN THE DARK · IT DRAINS YOU', cx, H - (phone ? 150 : 96));
  },
  b3(grp) { c12d3dBuild(grp); },
  f3(dt) { c12d3d(dt); },
  exit() { C12D3.on = false; },
});
// (hosting) one of the drowned up out of the dark: at a place in the drain out of anyone's light and sight, not far
function c12dSpawn(inHall) {
  const P = ZM.players || [], np = c12N(), pts = C12D.SPAWN.slice().sort(() => Math.random() - 0.5);
  for (const [lx, ly] of pts) {
    const [x, y] = c12W(lx, ly), d = P.reduce((a, p) => Math.min(a, Math.hypot(p.x - x, p.y - y)), 999);
    if (d < 10 || d > (inHall ? 30 : 40)) continue;
    if (!(lx === C12D.CIS[0] && ly === C12D.CIS[1]) && c12dInLight(x, y)) continue;
    const sx = x + (Math.random() - 0.5) * 2, sy = y + (Math.random() - 0.5) * 2;
    if (lx === C12D.CIS[0] && ly === C12D.CIS[1]) { const a = Math.random() * 6.283, r = C12D.CIS[2] + 1.2; return raidSpawnAt(x + Math.cos(a) * r, y + Math.sin(a) * r, { kind: Math.random() < 0.3 ? 'run' : 'jog', hp: zmHp(RAIDC.ROUND + 2) * (1 + 0.25 * (np - 1)) }); }
    if (zmBlockedAt(sx, sy, 0.5, 0)) continue;
    const u = Math.random(), kind = u < 0.15 ? 'run' : u < 0.7 ? 'jog' : 'walk';
    return raidSpawnAt(sx, sy, { kind, hp: zmHp(RAIDC.ROUND + 2) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (np - 1)) });
  }
  return null;
}
// (every screen) a brazier lit: its roar, and the word
function c12dLitFx(i, by) {
  const S = RAID.st; S.braz = (S.braz | 0) | (1 << i); C12D3.lit[i] = 1;
  const [x, y] = c12W(C12D.BRAZ[i][0], C12D.BRAZ[i][1]), d = Math.hypot(x - FPS.me.x, y - FPS.me.y);
  try { if (!soundOff()) { const v = Math.max(0.15, 1 - d / 45); noise('lowpass', 420, 1, 0.01, 0.55 * v, 0.9, { to: 140 }); tone(196, 'triangle', 0.02, 0.1 * v, 1.6, { to: 220 }); } } catch (e) {}
  if (by) fpsFeed(`${c12Nick(by)} lit a brazier from Maren’s Lantern.`);
  if (ZM.net !== 'client') { const n = c12dBits(S.braz); if (n === 1) cpSay('ruth', 'It takes. Stay in its light while you can.', 'cp_m12_23'); raidRespawn(); }
}
// (hosting) a lamp turned
function c12dTurnFx(i) { const S = RAID.st, v = S.lamps | 0; for (let j = 0; j < 9; j++) if (((v ^ c12dFlip(v, i)) >> j) & 1) C12D3.flash[j] = 1; try { if (!soundOff()) tone(520, 'triangle', 0.005, 0.06, 0.12, { to: 660 }); } catch (e) {} }
// (every screen) all nine lit: the grate goes up
function c12dOpen() {
  const S = RAID.st; if (S.gateFx) return; S.gate = 1; S.gateFx = 1; C12D3.gateT = 0.001;
  try { if (!soundOff()) { noise('lowpass', 300, 1, 0.05, 0.6, 2.2, { to: 90 }); tone(98, 'sawtooth', 0.1, 0.12, 2.0, { to: 130 }); } } catch (e) {}
  if (ZM.net !== 'client') {
    cpObjective('The grate is up. Set the lantern down on the ledge beside it: it will not go through');
    cpWaypoint(C12D.LEDGE[0], C12D.LEDGE[1], 'The ledge', 1.3);
    cpSay('ruth', 'All nine. There, it’s lifting. Bring the lamp up to it.', 'cp_m12_24');
  }
}

// ---------- in 3D: the braziers' fire, the lamps, the grate's bars, the lantern lying or on its ledge ----------
const C12D3 = { on: false, fire: [], lamp: [], lit: [], flash: [], bars: null, gateT: 0, lan: null };
function c12d3dBuild(grp) {
  Object.assign(C12D3, { on: true, fire: [], lamp: [], lit: [], flash: [], gateT: RAID.st.gate ? 1 : 0 });
  const G0 = FPSC.GROUND, tex = z3Soft('rgba(255,190,110,1)', 'rgba(255,120,40,0)'), tex2 = z3Soft('rgba(255,226,160,0.95)', 'rgba(255,200,120,0)');
  const spr = (t, s) => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); o.scale.set(s, s * 1.4, 1); grp.add(o); return o; };
  C12D.BRAZ.forEach(([x, y]) => { const [wx, wy] = c12W(x, y), f = spr(tex, 1.3); f.position.copy(z3v(wx, wy, G0 + 1.55)); C12D3.fire.push(f); });
  C12D.LAMPS.forEach(([x, y]) => { const [wx, wy] = c12W(x, y), f = spr(tex2, 0.7); f.position.copy(z3v(wx, wy, G0 + 1.08)); C12D3.lamp.push(f); });
  // the grate's bars, in the gateway, to rise
  const bars = new THREE.Group(), bm = z3Lam('#2a2622'), [g0, g1, gy] = C12D.GATE, [bx, by] = c12W((g0 + g1) / 2, gy);
  for (let u = -2.3; u <= 2.31; u += 0.38) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.3, 0.09), bm); b.position.set(u, 1.65, 0); bars.add(b); }
  for (const h of [0.4, 1.7, 3.0]) { const b = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 0.12), bm); b.position.set(0, h, 0); bars.add(b); }
  bars.position.copy(z3v(bx, by, G0)); grp.add(bars); C12D3.bars = bars;
  // the lantern, lying or left (its own small model: an iron frame, glass, the flame)
  const lan = new THREE.Group(), im = z3Lam('#1e1c1a');
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.22), new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.55 })); cage.position.y = 0.2; lan.add(cage);
  for (const h of [0.03, 0.38]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.28), im); b.position.y = h; lan.add(b); }
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 4, 10, Math.PI), im); hd.position.y = 0.45; lan.add(hd);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.set(1.2, 1.2, 1); gl.position.y = 0.2; lan.add(gl);
  grp.add(lan); C12D3.lan = lan;
}
function c12d3d(dt) {
  if (!C12D3.on) return;
  const S = RAID.st, G0 = FPSC.GROUND, t = g.t;
  C12D3.fire.forEach((f, i) => { const on = !!(((S.braz | 0) >> i) & 1); f.visible = on; if (on) { const fl = 0.85 + 0.15 * Math.sin(t * 13 + i) * Math.sin(t * 4.7 + i * 2); f.scale.set(1.3 * fl, 1.9 * fl, 1); } });
  C12D3.lamp.forEach((f, i) => { const on = !!(((S.lamps | 0) >> i) & 1); if (C12D3.flash[i] > 0) C12D3.flash[i] = Math.max(0, C12D3.flash[i] - dt * 2.5); f.visible = on || C12D3.flash[i] > 0; const s = 0.7 * (on ? 0.92 + 0.08 * Math.sin(t * 11 + i) : 0.4) + C12D3.flash[i] * 0.6; f.scale.set(s, s * 1.3, 1); });
  if (C12D3.gateT > 0 && C12D3.gateT < 1) C12D3.gateT = Math.min(1, C12D3.gateT + dt / 2.4);
  if (C12D3.bars) C12D3.bars.position.y = G0 + 3.1 * (S.gate ? Math.max(C12D3.gateT, 0.001) : 0);
  if (C12D3.lan) {
    const on = S.lan === '@' || !S.lan, L = on ? c12dLanXY() : null;
    C12D3.lan.visible = !!L;
    if (L) C12D3.lan.position.copy(z3v(L[0], L[1], G0 + (S.lan === '@' ? 1.0 : 0.02)));
  }
}

// ---------- its cutscenes: into the drain; the lantern left ----------
cpCineDef('m12_drain', { music: 'cpm12cine', shots: [
  { d: 3.6, card: { eye: 'Partway down the Swallow', t: 'The Old Drain', sub: 'Some of the water had found another way: a Spanish drain under the bed, running for the fort.' } },
  { d: 5.5, cam: [-3, -78, 3.2], to: [-1, -74, 2.2], look: [0, -60, 1.6], lookTo: [0, -48, 1.8], fade: [0.6, 0],
    lines: [[0.4, 'ruth', 'Dry stone, cut square. Somebody built this, and long ago.', 'cp_m12_25'], [3.0, 'log', 'Out of the light the dark took the strength out of them, a little at a time.', 'cp_m12_26']], sfx: [[0.3, 'creak', 0.4]] },
] });
cpCineDef('m12_lantern', { music: 'cpm12cine', shots: [
  { d: 6, cam: [3.6, 35.2, 1.9], to: [2.8, 36.8, 1.6], look: [0.9, 39.5, 1.1], lookTo: [0.8, 39.6, 1.25],
    lines: [[0.4, 'log', 'They tried it at the grate, and the lantern would not go. It was not a weight, or a wind. It would not.', 'cp_m12_27'], [3.8, 'ruth', 'Then it stays. Leave it lit for her.', 'cp_m12_28']], sfx: [[0.3, 'creak', 0.3]] },
  { d: 4, cam: [-2, 30, 2.4], to: [-2, 36, 2.6], look: [-2, 48, 2.2],
    lines: [[0.3, 'log', 'Where it is now, nobody will say.', 'cp_m12_29']] },
] });
