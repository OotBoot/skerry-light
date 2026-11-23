'use strict';
// The Chronicle of the Light, mission 17: The Reef Board (c. 1886, a long winter night at Skerry Light). A tale added
// later, from Skerry Chess (src/chess.js, src/chessui.js): the keepers' game, played by lamplight on the board Holm cut
// from a ship's hatch cover, and on the second board with the reef on it. The log says nothing of this night. The
// keepers told it to each other, and to nobody else.
//   I.   The Middle Watch (cp_m17watch, here): the station in a winter gale, laid out as mission 4 has it (src/cpm04x.js
//        FPI_GEN.cplstation). Holm and his assistant, Silas Venn, at the reef board in the Keeper's Study under the
//        lantern, Silas an age over his move. The lamp must be kept while they play: she smokes, and must be trimmed
//        (hold Use at the lamp, up in the lantern room) before she runs down. And from the gallery, the Wreckers'
//        lanterns out on the skerries, three of them, laid out on the reef like men on a board: count each (look at it
//        from the gallery and hold Use), for the log. Then sit down to the board: it's Holm's move.
//   Holm falls asleep over it (m17_dream), and the game goes on without him.
//   II.  The Gold Squares (cp_m17reef, src/cpm17x.js): the reef board as he dreamt it, the size of a harbour. Each of
//        you takes up one of the Light's pieces and moves by its rules; the Wreckers move on the beat. Light the four
//        gold squares.
//   III. The Wreckers' Keeper (cp_m17keep, src/cpm17x.js): their keeper comes up with a false light on a pole (m17_bk).
//        Holm walks the board as the Light's keeper; see him onto the gold while the lamp lasts.
//   The outro: a keeper on the Light, and Silas shaking him awake an hour before dawn, the lamp burning, and gold
//   paint on Holm's fingers.
// Cinematics: the intro, the dream (after I), the board (as II begins), their keeper (as III begins), the outro.
// Lines: cp_m17_01 on (the table in campaign-sound/m17.md).
cpCast('venn', { n: 'Silas Venn', c: '#c8d8a8' });
cpCast('m17bk', { n: 'The Wreckers’ Keeper', c: '#e07060' });
cpMission({ id: 'm17', o: 'm03c', side: true, act: 2, n: 'The Reef Board', when: 'c. 1886', where: 'The lamp room of Skerry Light',
  blurb: 'A long winter night, and the keepers at the board Holm carved with the reef on it. Keep the lamp through the middle watch, and then play the game out, wherever it takes you.',
  stages: ['cp_m17watch', 'cp_m17reef', 'cp_m17keep'], intro: 'm17_intro', outro: 'm17_outro',
  cut: { 1: 'm17_board', 2: 'm17_bk' }, after: { 0: 'm17_dream' },
  music: { default: 'cpm17board' }, lives: 2,
  begin() { cpgMoonless(true); },
  stop() { cpgMoonless(false); m3PeopleFree(); m17NpcFree(); M17W.board = null; } });
Object.assign(CP_MUSIC_FALL, { cpm17night: 'raidpier', cpm17watch: 'raidpier', cpm17dream: 'cpfog', cpm17board: 'cpfight', cpm17keeper: 'cpboss', cpm17low: 'cpboss', cpm17dawn: 'cphope' });

// ---------- the Keeper's Study, under the lantern: the table, the board on it, and the two of them ----------
const M17T = { X: ZMT.X + 5.6, Y: ZMT.Y - 5.4, A: -0.6, Z: ZMT.L[4], TOP: 0.8 };
M17T.U = [Math.cos(M17T.A), Math.sin(M17T.A)]; M17T.V = [-Math.sin(M17T.A), Math.cos(M17T.A)];
const m17T = (u, v) => [M17T.X + M17T.U[0] * u + M17T.V[0] * v, M17T.Y + M17T.U[1] * u + M17T.V[1] * v];
// the Wreckers' lanterns out on the skerries (about the island's middle), for counting from the gallery
const M17L = [[118, 152], [176, 92], [62, 196]];
var M17W = { board: null, spot: null };
// the reef board on the table, as Holm carved it: 8 by 8, four rocks, the gold, and its pieces (src/cpm17x.js m17Piece)
function m17SmallBoard(grp) {
  const B = new THREE.Group(), [x, y] = m17T(0, 0), q = 0.075;
  B.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + M17T.Z + M17T.TOP)); B.rotation.y = M17T.A; grp.add(B);
  const base = new THREE.Mesh(new THREE.BoxGeometry(q * 8 + 0.08, 0.04, q * 8 + 0.08), z3Lam('#5a3a20')); base.position.y = 0.02; B.add(base);
  const lt = z3Lam('#c8b088'), dk = z3Lam('#4a3020'), gold = new THREE.MeshLambertMaterial({ color: 0xc89a38, emissive: 0x2a1a04 }), rock = z3Lam('#3a3a38');
  const at = s => [((s & 7) - 3.5) * q, ((s >> 3) - 3.5) * q];
  for (let s = 0; s < 64; s++) { const [u, v] = at(s), m = new THREE.Mesh(new THREE.BoxGeometry(q, 0.01, q), m17LightSq(s) ? gold : ((s & 7) + (s >> 3)) % 2 ? lt : dk); m.position.set(u, 0.045, -v); B.add(m); if (m17Rock(s)) { const r = new THREE.Mesh(new THREE.IcosahedronGeometry(q * 0.48, 0), rock); r.position.set(u, 0.075, -v); r.scale.y = 1.3; B.add(r); } }
  // the game as it stands, a few moves in
  const pos = { 0: 4, 1: 2, 2: 3, 3: 5, 4: 6, 5: 3, 7: 4, 8: 1, 9: 1, 18: 1, 11: 1, 12: 1, 21: 2, 14: 1, 15: 1, 56: -4, 57: -2, 58: -3, 59: -5, 60: -6, 61: -3, 63: -4, 48: -1, 49: -1, 50: -1, 43: -1, 52: -1, 45: -2, 53: -1, 55: -1, 30: -1 };
  const P = [];
  for (const k in pos) { const s = +k, t = Math.abs(pos[k]), pc = m17Piece(t, pos[k] > 0, 0.075 * (t === 1 ? 0.75 : t === 6 ? 1.15 : 1)), [u, v] = at(s); pc.position.set(u, 0.05, -v); pc.rotation.y = pos[k] > 0 ? Math.PI : 0; B.add(pc); P.push({ pc, s, light: pos[k] > 0 }); }
  return { B, P, at, hop: null, t: 6 };
}
// (each frame) now and then a piece is moved, while they play
function m17SmallTick(W, dt, still) {
  if (!W) return;
  if (W.hop) { const H = W.hop; H.t += dt / 0.55; const k = Math.min(1, H.t), [u0, v0] = W.at(H.f), [u1, v1] = W.at(H.to); H.p.pc.position.set(u0 + (u1 - u0) * k, 0.05 + Math.sin(k * Math.PI) * 0.06, -(v0 + (v1 - v0) * k)); if (k >= 1) { H.p.s = H.to; W.hop = null; m17Knock(0.25, 420); } return; }
  if (still) return;
  W.t -= dt; if (W.t > 0) return; W.t = 7 + Math.random() * 6;
  const used = new Set(W.P.map(p => p.s)), p = W.P[(Math.random() * W.P.length) | 0];
  const opts = M17K.map(([a, b]) => m17Step(p.s, a, p.light ? Math.abs(b) : -Math.abs(b))).filter(q => q >= 0 && !used.has(q) && !m17Rock(q));
  if (opts.length) W.hop = { p, f: p.s, to: opts[(Math.random() * opts.length) | 0], t: 0 };
}
const M17C = { holm: ['#1e2430', '#d8d0bc', '#a08a50', '#ffd88a'], venn: ['#2e3a2a', '#d0c8b0', '#6a5a3a', '#ffd88a'] };
// (every screen) Holm and Silas at the table, either side of it, facing over the board
function m17Players3D() {
  const [hx, hy] = m17T(0.05, 0.95), [vx, vy] = m17T(-0.05, -0.95);
  M3N.npc = []; m3People([['holm', M17C.holm, hx, hy, bearingOf(-M17T.V[0], -M17T.V[1]), { z: M17T.Z, p: -0.35 }], ['venn', M17C.venn, vx, vy, bearingOf(M17T.V[0], M17T.V[1]), { z: M17T.Z, p: -0.4 }]]);
}
// (their figures sit: lowered as they'd be on a stool, and Holm's head down once he's asleep)
function m17PlayersPose(dt, asleep) {
  for (const P of M3N.npc) if (P.F) { cpkNpcPose(P.F, { x: FPSC.CX + P.x, y: FPSC.CY + P.y, h: P.h, jz: P.z || 0, spd: 0, dt, lan: false, noGun: true, p: P.k === 'holm' && asleep ? -0.9 : P.p, cr: 0.75 }); cplGunAway(P.F); }
}

// ---------- I. The Middle Watch ----------
const M17I = { SMOKE: 38, DRAIN: 48, TRIM: 2.4, SPOT: 1.2, GAL: 7.2 };
cpStage('m17watch', {
  n: 'The Middle Watch',
  map: M4MAP([ZMT.X + 3.4, ZMT.Y - 3.3], ZMT.L[4]),
  prep: m4Prep,
  set(H, K, Z) {
    const { put } = K, Z4 = M17T.Z;
    for (const v of [1.0, -1.0]) { const [x, y] = m17T(0, v); put('block', x, y, M17T.A, { w: 0.5, d: 0.45, hh: Z4 + 0.45, z0: Z4, col: '#5a4028' }); }
    K.light(M17T.X, M17T.Y, Z4 + 1.6, '#ffc070', 6, 'lantern');
  },
  enter() {
    m4OpenAll();
    Object.assign(RAID.st, { m17w: 1, lamp: 0.85, smoke: 1, smokeT: 0, trims: 0, spot: [0, 0, 0], ready: 0, said: {}, t: 0 });
    if (ZM.net !== 'client') { cpObjective('The lamp is smoking: trim the wick, up in the lantern room'); cpWaypoint(ZMT.X, ZMT.Y, 'The lamp', ZMT.L[5] + 1.2); }
  },
  noGun: true,
  tick(dt) {
    const S = RAID.st; if (cpCineOn() || !S.m17w) return;
    S.t += dt;
    // the lamp: smoking, it runs down; trimmed, it burns clean a while, and then smokes again
    if (S.smoke) { S.lamp = Math.max(0, S.lamp - dt / M17I.DRAIN); if (S.lamp <= 0) { cpFail('The lamp went out on the middle watch'); return; } }
    else { S.smokeT -= dt; if (S.smokeT <= 0) { S.smoke = 1; cpEvent('m17smoke', 1); m17Say1('smoke2', true, 'venn', 'She is smoking again, Mr Holm.', 'cp_m17_13'); } }
    const n = S.spot.filter(Boolean).length;
    S.ready = S.trims >= 1 && n >= 3 ? 1 : 0;
    if (S.smoke && (S.trims < 1 || S.ready)) { cpObjective('The lamp is smoking: trim the wick, up in the lantern room'); cpWaypoint(ZMT.X, ZMT.Y, 'The lamp', ZMT.L[5] + 1.2); }
    else if (!S.ready) { cpObjective(`From the gallery, count the lights out on the reef for the log · ${n} of 3${S.smoke ? ' · and the lamp is smoking' : ''}`); const i = S.spot.findIndex(v => !v); const a = Math.atan2(M17L[i][1] - ZMT.Y, M17L[i][0] - ZMT.X); cpWaypoint(ZMT.X + Math.cos(a) * 8.2, ZMT.Y + Math.sin(a) * 8.2, 'The gallery', ZMT.L[5] + 1.2); }
    else { cpObjective('Sit down to the board: it is Holm’s move'); cpWaypoint(M17T.X, M17T.Y, 'The board', M17T.Z + 1.2); }
    m17Say1('a', S.t > 1.5, 'holm', 'She is smoking. Trim her for me, will you, while Silas makes up his mind.', 'cp_m17_10');
    m17Say1('b', S.t > 12 && !S.trims, 'venn', 'I would sooner trim the lamp than lose this game, Mr Holm.', 'cp_m17_11');
    m17Say1('c', S.t > 40 && n === 0 && S.trims >= 1, 'holm', 'Out on the gallery. There are lights on the reef tonight that I do not like.', 'cp_m17_12');
  },
  q(sid, k, a) {
    const S = RAID.st; if (!S.m17w) return;
    if (k === 'trim' && S.smoke) { S.smoke = 0; S.lamp = 1; S.smokeT = M17I.SMOKE; S.trims++; cpEvent('m17trim', 1);
      if (S.trims === 1) cpSay('holm', 'That is better. She burns clean when she is minded to.', 'cp_m17_14'); }
    else if (k === 'spot') { const i = a | 0; if (i < 0 || i > 2 || S.spot[i]) return; S.spot[i] = 1; const n = S.spot.filter(Boolean).length;
      cpSay(...[['holm', 'One, off the Hulks. A lantern on a pole, where a cutter would stand on the board.', 'cp_m17_15'], ['holm', 'Two, on the Near Skerries. Waiting for the rocks to do their work for them.', 'cp_m17_16'], ['holm', 'Three. Laid out on the reef like men on a board. Wreckers. Write it down.', 'cp_m17_17']][n - 1]); }
    else if (k === 'sit' && S.ready) { cpObjective(''); cpWaypoint(null); cpSay('venn', 'There. Your move, Mr Holm. Take all night if you like.', 'cp_m17_18'); cpDone(); }
  },
  me(dt) {
    const S = RAID.st, m = FPS.me; if (!S.spot) return;
    if (cplHold('m17trim', dt, M17I.TRIM)) raidAsk('trim');
    if (cplHold('m17spot', dt, M17I.SPOT) && M17W.spot != null) raidAsk('spot', M17W.spot);
    // which light I'm looking at from the gallery, if any
    M17W.spot = null;
    const r = Math.hypot(m.x - FPSC.CX - ZMT.X, m.y - FPSC.CY - ZMT.Y);
    if (r > M17I.GAL && Math.abs((m.jz || 0) - ZMT.L[5]) < 1.5 && Math.abs(m.p) < 0.3) M17L.forEach(([x, y], i) => { if (!S.spot[i] && Math.abs(angDiff(bearingOf(FPSC.CX + x - m.x, FPSC.CY + y - m.y), m.h)) < 0.075) M17W.spot = i; });
    if (S.smoke && !cpCineOn() && Math.random() < dt * 6) FPS.parts.push({ x: FPSC.CX + ZMT.X + (Math.random() - 0.5) * 0.3, y: FPSC.CY + ZMT.Y + (Math.random() - 0.5) * 0.3, z: FPSC.GROUND + ZMT.L[5] + 2.6, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, vz: 0.5, t: 2.4, c: '60,56,52', up: true });
  },
  consider(c) {
    const S = RAID.st, X = FPSC.CX, Y = FPSC.CY, m = FPS.me; if (!S.spot) return;
    if (S.smoke) c({ k: 'm17trim', id: 'lamp' }, X + ZMT.X, Y + ZMT.Y, ZMT.L[5], 3.2, false);
    if (M17W.spot != null) c({ k: 'm17spot', id: 'sp' + M17W.spot, i: M17W.spot }, m.x + Math.sin(m.h) * 1.2, m.y + Math.cos(m.h) * 1.2, m.jz || 0, 2, false);
    if (S.ready) c({ k: 'm17sit', id: 'sit' }, X + M17T.X, Y + M17T.Y, M17T.Z, 2.4, false);
  },
  prompt(o) {
    if (o.k === 'm17trim') return { text: 'Hold to trim the wick', hold: true };
    if (o.k === 'm17spot') return { text: 'Hold to count this light for the log', hold: true };
    if (o.k === 'm17sit') return { text: 'Sit down to the board' };
    return null;
  },
  use(o) { if (o.k === 'm17sit') { raidAsk('sit'); return true; } return o.k === 'm17trim' || o.k === 'm17spot'; },
  pack(o) { const S = RAID.st; if (!S.spot) return; o.m17w = [Math.round(S.lamp * 1000) / 1000, S.smoke, S.trims, S.spot.join(''), S.ready]; },
  apply(o) { const S = RAID.st, a = o.m17w; if (!Array.isArray(a)) return; S.m17w = 1; S.lamp = +a[0] || 0; S.smoke = a[1] | 0; S.trims = a[2] | 0; S.spot = String(a[3] || '000').split('').map(c => +c ? 1 : 0); S.ready = a[4] | 0; },
  hud(phone, mono, fell) {
    const S = RAID.st; if (!S.spot) return;
    cplBar(phone, mono, S.smoke ? 'THE LAMP · SMOKING: TRIM THE WICK' : 'THE LAMP · BURNING CLEAN', S.lamp, 0, S.smoke && S.lamp < 0.35 ? `rgba(230,110,90,${0.7 + 0.3 * Math.sin(g.t * 8)})` : '#ffe0a0');
    cplBar(phone, mono, `LIGHTS ON THE REEF · ${S.spot.filter(Boolean).length} OF 3 COUNTED`, S.spot.filter(Boolean).length / 3, 1, '#c8b890');
    if (M17W.spot != null) { ctx.textAlign = 'center'; ctx.font = fell(phone ? 15 : 20); ctx.fillStyle = 'rgba(255,214,150,0.9)'; ctx.fillText('A lantern on the reef', cx, H * 0.42); }
    cplHoldHud();
  },
  b3(grp) {
    const S = RAID.st;
    S.g3 = { sleet: m4Sleet(grp), lans: [] };
    M17W.board = m17SmallBoard(grp);
    m17Players3D();
    // the Wreckers' lanterns, far out on the skerries
    for (const [x, y] of M17L) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,190,110,0.95)', 'rgba(255,170,90,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(5); s.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, 2.2)); grp.add(s); S.g3.lans.push(s); }
  },
  f3(dt) {
    const S = RAID.st, G = S.g3; if (!G) return;
    const cine = cpCineOn(), asleep = cine && CPN.on && CPN.on.id === 'm17_dream' && CPN.shot >= 1;
    cplSky({ amb: 0.26, moon: 0.06, fog: [0.03, 0.04, 0.055], near: 25, far: 480 });
    cplLensSet(0.55 + 0.45 * (S.lamp == null ? 1 : S.lamp), (g.t * Math.PI * 2 / 6.5) % (Math.PI * 2), { flicker: !!S.smoke });
    m4SleetTick(G.sleet, 0.6, dt);
    G.lans.forEach((s, i) => { s.material.opacity = 0.75 + 0.25 * Math.sin(g.t * (1.3 + i * 0.4) + i); s.scale.setScalar(4.5 + Math.sin(g.t * 3 + i)); });
    m17PlayersPose(dt, asleep);
    m17SmallTick(M17W.board, dt, asleep);
  },
  exit() { m4Exit(); M17W.board = null; },
  music() { return 'cpm17watch'; },
  mend: true,
});
function m17Say1(k, ok, who, text, vo) { const S = RAID.st; if (!S.said[k] && ok) { S.said[k] = 1; cpSay(who, text, vo); } }
cpOn('m17trim', () => { try { sfxPlay('lampcatch', { vol: 0.6 }); } catch (e) {} });
cpOn('m17smoke', () => { try { sfxPlay('wickcough', { vol: 0.5 }); } catch (e) {} });

// ---------- the cinematics ----------
// (the table, from the side: where a camera looks at the board from)
const m17TC = (u, v, h) => { const [x, y] = m17T(u, v); return [x, y, M17T.Z + h]; };
cpCineDef('m17_intro', { music: 'cpm17night', shots: [
  cpTitleShot(CP_BY.m17),
  { d: 6.2, cam: [46, -74, 9], to: [34, -58, 14], look: [0, 1.5, 24], lookTo: [0, 1.5, 27], fade: [1, 0], sfx: [[0.2, 'stormwind', 0.5], [2.5, 'sea', 0.4]],
    lines: [[0.5, 'log', 'Winter, 1886. A gale out of the north, and the long nights, and nothing to do on them but keep the lamp.', 'cp_m17_01']] },
  { d: 6.4, cam: m17TC(1.9, -1.3, 1.5), to: m17TC(1.5, -0.9, 1.35), look: m17TC(0, 0, 0.85),
    lines: [[0.4, 'holm', 'Your move, Silas. It has been your move since the second hour.', 'cp_m17_02'], [3.6, 'venn', 'I am thinking, Mr Holm. A man may think.', 'cp_m17_03']] },
  { d: 6.6, cam: m17TC(0.5, -0.45, 1.35), to: m17TC(0.32, -0.28, 1.1), look: m17TC(-0.05, 0.05, 0.84),
    lines: [[0.3, 'holm', 'Four rocks where the skerries stand, and the gold between them for the Light. I cut it from the chart myself.', 'cp_m17_04'], [4.4, 'venn', 'And the gold paint?', 'cp_m17_05']] },
  { d: 4.8, cam: m17TC(-1.4, 1.6, 1.6), to: m17TC(-1.1, 1.3, 1.5), look: m17TC(0, 0.8, 1.1),
    lines: [[0.3, 'holm', 'Found it. A keeper on the Light wins outright, mind. As is only right.', 'cp_m17_06']] },
] });
cpCineDef('m17_dream', { music: 'cpm17dream', shots: [
  { d: 5.6, cam: m17TC(1.6, 1.4, 1.4), to: m17TC(1.3, 1.1, 1.3), look: m17TC(0, 0.6, 1.0), fade: [0.5, 0],
    lines: [[0.3, 'holm', 'Take your time, Silas. The night is long, and the lamp is trimmed.', 'cp_m17_07'], [3.6, 'log', 'He waited on his move, and the room went quiet.', 'cp_m17_08']] },
  { d: 5.4, cam: m17TC(0.06, 0.06, 1.6), to: m17TC(0.02, 0.02, 1.0), look: m17TC(0, 0, 0.82), fade: [0, 1.4], sfx: [[0.5, 'wind', 0.4], [3.2, 'sea', 0.6]],
    lines: [[0.6, 'venn', 'Holm? Mr Holm. Well, then. I shall move for you.', 'cp_m17_09']] },
  { d: 4.8, card: { eye: 'The middle watch', t: 'The reef board', sub: 'The board was the reef, and the reef was the board, and the Wreckers were waiting on their side of it.' } },
] });
cpCineDef('m17_board', { music: 'cpm17dream', shots: [
  { d: 6.0, cam: [0, -46, 15], to: [0, -26, 10], look: [0, 6, 0], lookTo: [0, 12, 1], fade: [1.2, 0], sfx: [[0.3, 'sea', 0.6], [3.5, 'gull', 0.2]],
    lines: [[0.6, 'holm', 'Four rocks. The gold between. A keeper who reaches the Light wins outright.', 'cp_m17_50']] },
  { d: 5.2, cam: [-22, 15, 3.4], to: [20, 15, 3.4], look: [-6, 22, 1.6], lookTo: [8, 22, 1.6],
    lines: [[0.5, 'wreck', 'Come and take it, keepers. Mind the water between.', 'cp_m17_51']] },
  { d: 5.4, cam: [-9, -12, 2.6], to: [8, -13, 2.4], look: [-6, -22.6, 1.6], lookTo: [6, -22.6, 1.6],
    lines: [[0.4, 'holm', 'Your pieces are on the rank. Take one up. The keeper is mine. Light the gold for me.', 'cp_m17_52']] },
] });
cpCineDef('m17_bk', { music: 'cpm17keeper', shots: [
  { d: 5.6, cam: [3, 6, 2.2], to: [3, 9, 2.8], look: [3, 21, 2.6], lookTo: [3, 21, 3.6], fade: [0.8, 0], sfx: [[0.4, 'mooncusser', 0.8], [1.6, 'thunder', 0.5]],
    lines: [[0.8, 'm17bk', 'You have lit your gold, keepers. Now watch it go out.', 'cp_m17_53']] },
  { d: 4.6, cam: [-10, -30, 4], to: [-6, -34, 6], look: [0, -74, 30], sfx: [[0.6, 'wind', 0.5]],
    lines: [[0.4, 'holm', 'A false light. The gold goes dark under it, and the lamp with it.', 'cp_m17_54']] },
  { d: 5.4, cam: [3, -13, 2.4], to: [3, -15.5, 2.0], look: [3, -21, 1.6],
    lines: [[0.3, 'holm', 'I will walk it myself, then. Keep me out of their lines, and put his lantern out.', 'cp_m17_55']] },
] });
cpCineDef('m17_outro', { music: 'cpm17dawn', enter() { M17S.blaze = 1; }, exit() { M17S.blaze = 0; }, shots: [
  { d: 5.6, cam: [-7, -9, 2.2], to: [-6, -7, 2.8], look: [0, 0, 1.4], fade: [0.4, 0], sfx: [[0.3, 'beam', 0.9]],
    lines: [[0.5, 'holm', 'A keeper on the Light.', 'cp_m17_60'], [2.6, 'm17bk', 'Next winter, keeper. Next winter.', 'cp_m17_61']] },
  { d: 6.2, cam: [0, -20, 12], to: [0, -34, 40], look: [0, 0, 0], fade: [0, 1.6],
    lines: [[0.4, 'log', 'Silas Venn found him asleep over the board an hour before dawn, the lamp trimmed and burning.', 'cp_m17_62']] },
  { d: 5.8, card: { eye: 'An hour before dawn', t: 'The lamp room', sub: 'Silas shook him awake. The game stood as Holm had left it, and his fingers were gold to the knuckle.' },
    lines: [[0.4, 'venn', 'You were asleep on your move, Mr Holm.', 'cp_m17_63'], [2.8, 'holm', 'Was I, Silas. Then I won it in my sleep. Why is there gold on my hands?', 'cp_m17_64']] },
  { d: 5.2, card: { eye: 'Mission complete', t: 'The Reef Board', sub: 'The station’s stores list records one set of chessmen (spare), whittled, and two pots of gold paint nobody could account for.' } },
] });
