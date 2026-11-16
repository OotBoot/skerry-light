'use strict';
// The Chronicle of the Light, mission 5, Parts II and III: the Wren coming in through the skerries (cp_m05outer,
// cp_m05inner). The Gannet's Wake's sail (src/gwsail.js) through GWS_LEG, as Fog Run's and Freebooters' Sea's are,
// with a sea of this mission's own and Maren and Plimsoll both out on it. Her sailing is never touched: the
// Brig's top speed and the Brig's way of gathering it, always.
//  - The sea: the warm green water of 9 January 1888 (the Coral Lagoon's look: src/biomes.js 'lagoon', palms on the
//    cliffs and the wake glowing), inbound from the north to the harbour under the Light. Its rocks lie thick on
//    both sides of one winding channel of deep water (CPM5B.OUT and .IN: the channel's bends), the channel itself
//    kept clear (CPM5B.HW either side of it, narrower through the Narrows): Plimsoll walks it, a step at a time.
//    Keep inside his ring and Maren holds where she is; fall behind and he waits only a few seconds.
//  - The Wren: the cutter's deck dressed as a schooner (a foremast with its gaff foresail and a staysail, her name
//    on the transom and her bows), and her bow lantern: whoever stands lookout at it (CPM5B.LOOK) shows everyone the
//    rocks close ahead of her bow, dimly, between the sweeps of the beam.
//  - Part II, the Outer Skerries: at the Hulks (old wrecks on the rocks, the drowned climbing out of them onto her
//    rails) he stops, looks back, and goes under (a cinematic). Till he's up again, further on, there's no cover:
//    the bell's all you have. Then out between the two stacks of the Gate, and the part is done.
//  - Part III, the Inner Skerries: the Narrows, then the last reach (within CPM5B.FIN of the harbour, a cinematic):
//    he walks on ahead to the pier and waits there, Maren comes on two stages nearer, and the drowned come over
//    every rail. Make the harbour, between the pier heads, and the mission is won.
// Together it's the Gannet's Wake's word (g* keys) as it is, and this file's own (m5w: Plimsoll under, who's on
// lookout, the last reach).

const CPM5B = {
  // the channel's bends (the sea's frame: the Light at 0, 0; north +y), its half width, and how many rocks
  OUT: [[-380, 2380], [-330, 2200], [-420, 2000], [-470, 1800], [-360, 1640], [-220, 1500], [-160, 1330], [-70, 1180], [-60, 1050]],
  IN: [[-60, 1040], [10, 930], [-30, 800], [60, 660], [140, 540], [90, 400], [170, 260], [230, 150], [230, 64]],
  HW: 25, NARROW: 17, ROCKS_OUT: 190, ROCKS_IN: 170,
  HULKS: [-470, 1800], DIVE_AT: 3, UP_AT: 5, UP_R: 120,   // (the Hulks: where he goes under, the bend where he comes up)
  GATE: [-64, 1110], GATE_W: 25, GATE_Y: 1080,             // (the Gate: its two stacks either side of the channel)
  HARB: [230, 64], IN_R: 46, FIN: 440,                     // (the harbour mouth: in once she's this near; the last reach)
  LOOK: [0, 9.3], LOOK_R: 1.8, LOOK_SEE: 110, LOOK_A: 0.6, // (the bow lantern: where the lookout stands, how far and wide it shows)
  FORE: 7.6, FORE_H: 11.2,                                 // (her foremast: where it stands, how tall)
};

// ---------- the sea ----------
// a bend list laid off every dozen metres (Plimsoll's steps), and how far a point is from it
function cpm5Steps(C) { const out = [{ x: C[0][0], y: C[0][1] }]; for (let i = 1; i < C.length; i++) { const [ax, ay] = C[i - 1], [bx, by] = C[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 12)); for (let j = 1; j <= n; j++) out.push({ x: ax + (bx - ax) * j / n, y: ay + (by - ay) * j / n, b: j === n ? i : -1 }); } return out; }
function cpm5Off(path, x, y) { let b = 1e9; for (let i = 1; i < path.length; i++) { const a = path[i - 1], c = path[i], dx = c.x - a.x, dy = c.y - a.y, L = dx * dx + dy * dy || 1, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / L, 0, 1); b = Math.min(b, Math.hypot(a.x + dx * t - x, a.y + dy * t - y)); } return b; }
const CPM5_SEAS = {};
function cpm5Sea(which) {
  if (CPM5_SEAS[which]) return CPM5_SEAS[which];
  const out = which === 'outer', C = out ? CPM5B.OUT : CPM5B.IN, R = seeded(out ? 0x5e1a9 : 0x5e2b7), rnd = (a, b) => a + R() * (b - a);
  const path = cpm5Steps(C), rocks = [];
  const hw = (x, y) => !out && y < 700 && y > 500 ? CPM5B.NARROW : CPM5B.HW;
  const ok = (x, y, r) => y > 120 && Math.hypot(x, y) > 110 && Math.hypot(x - SK.HARBOUR.x, y - SK.HARBOUR.y) > 70 + r && Math.hypot(x - C[0][0], y - C[0][1]) > 40 + r && cpm5Off(path, x, y) > hw(x, y) + r + 3 && !rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 4);
  const add = (x, y, r) => { const prof = []; for (let i = 0; i < 7; i++) prof.push(rnd(0.35, 1)); prof[0] = rnd(0.15, 0.45); prof[6] = rnd(0.15, 0.45); rocks.push({ x, y, r, prof, ph: rnd(0, 6.28), seen: -99, lit: 0, i: rocks.length }); };
  // the Gate's two stacks, either side of the channel
  if (out) for (const s of [-1, 1]) { const x = CPM5B.GATE[0] + s * (CPM5B.GATE_W + 14), y = CPM5B.GATE[1]; add(x, y, 13); }
  // thick along the channel's edges: most within a hundred metres of it, either side
  const N = out ? CPM5B.ROCKS_OUT : CPM5B.ROCKS_IN;
  for (let n = 0; n < 30000 && rocks.length < N * 0.8; n++) { const p = path[(R() * path.length) | 0], a = R() * 6.283, d = rnd(20, 120), x = p.x + Math.sin(a) * d, y = p.y + Math.cos(a) * d, r = rnd(4, 12); if (ok(x, y, r)) add(x, y, r); }
  // and scattered further out, so nobody cuts the corner
  const xs = C.map(c => c[0]), ys = C.map(c => c[1]), x0 = Math.min(...xs) - 380, x1 = Math.max(...xs) + 380, y0 = Math.min(...ys), y1 = Math.max(...ys) + 120;
  for (let n = 0; n < 20000 && rocks.length < N; n++) { const x = rnd(x0, x1), y = rnd(y0, y1), r = rnd(5, 15); if (ok(x, y, r)) add(x, y, r); }
  // (the Hulks: a few more rocks close round where the old wrecks lie)
  if (out) for (let n = 0; n < 4000; n++) { const a = R() * 6.283, d = rnd(30, 90), x = CPM5B.HULKS[0] + Math.sin(a) * d, y = CPM5B.HULKS[1] + Math.cos(a) * d, r = rnd(4, 8); if (ok(x, y, r)) add(x, y, r); if (rocks.length > N + 16) break; }
  const len = path.reduce((a, p, i) => i ? a + Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) : 0, 0);
  return CPM5_SEAS[which] = { rocks, path, spars: [], len };
}
// how far along the channel a point is (0 to 1)
function cpm5Along(sea, x, y) { let b = 0, bd = 1e9; sea.path.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = i; } }); return b / Math.max(1, sea.path.length - 1); }

// ---------- the leg (gwsail's GWS_LEG) ----------
function cpm5Leg(which) {
  const out = which === 'outer', sea = cpm5Sea(which), C = out ? CPM5B.OUT : CPM5B.IN;
  for (const r of sea.rocks) { r.seen = -99; r.flare = 0; r.lit = 0; }
  const s0 = C[0], s1 = C[1];
  GWS_LEG = { key: 'cpm05' + which, which, start: s0.slice(), h0: bearingOf(s1[0] - s0[0], s1[1] - s0[1]), mark: out ? CPM5B.GATE.slice() : CPM5B.HARB.slice(), markIn: -1, isleR: 0,
    maren: true, plim: true, sea,
    line: (S, dm) => cpm5Line(S, dm),
    markLab: () => out ? 'THE GATE' : 'HARBOUR',
    prog: () => cpm5Prog(),
    sunk: () => cpFail('The Wren went down on the skerries, with all hands'),
    b3: (SG, G) => cpm5b3d(SG, G), f3: (dt, V) => cpm5f3d(dt, V), amb: [0.42, 0.2] };
  FPS_ISLES.cpm05sea.fog = ['#06141a', 400, 4200];
  return GWS_LEG;
}
// how hard the drowned come over the rail: further in, harder; round the Hulks and in the last reach, hardest
function cpm5Prog() {
  const S = RAID.st, B = S.B, L = GWS_LEG; if (!B || !L) return 0;
  const a = cpm5Along(L.sea, B.x, B.y);
  if (L.which === 'outer') return clamp(0.15 + a * 0.4 + (Math.hypot(B.x - CPM5B.HULKS[0], B.y - CPM5B.HULKS[1]) < 260 ? 0.45 : 0), 0, 1);
  return S.m5fin ? 1 : clamp(0.4 + a * 0.4, 0, 1);
}
function cpm5Line(S, dm) {
  const L = GWS_LEG; if (S.ph === 'sunk') return 'She’s going down.';
  if (L.which === 'outer') return S.m5dv === 1 ? 'Plimsoll has gone under at the Hulks: hold her in the channel, and ring if Maren comes' : `Follow Plimsoll through the outer skerries, out through the Gate: ${Math.round(dm).toLocaleString('en')} m`;
  return S.m5fin ? `The last reach: make the harbour between the pier heads · ${Math.round(dm).toLocaleString('en')} m` : `Follow Plimsoll in through the inner skerries to the harbour: ${Math.round(dm).toLocaleString('en')} m`;
}

// ---------- the look, and the deck ----------
FPS_ISLES.cpm05sea = Object.assign({}, FPS_ISLES.gwsail, { name: 'the Skerries' });
FPI_GEN.cpm05sea = { built: true, set(H) { const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }, K = zmKit(H, Z); gwsLay(H, K, Z); K.put('cpm5fore', 0, 0, 0, {}); }, decor() {} };
// her foremast, through the deck forward of the main (its sails are the stage's)
FPI_K.cpm5fore = {
  col: '#6a5440', noShadow: true,
  sol(p) { return [fpiCirc(p, 0, CPM5B.FORE, 0.2, GWS.D + CPM5B.FORE_H)]; },
  b3(p, A) {
    const D = GWS.D, v = CPM5B.FORE;
    A.cyl('#6a5440', 0, v, D - 0.1, 0.19, CPM5B.FORE_H, 0, 0, 0, 'cyl8'); A.cyl('#4a3a2a', 0, v, D, 0.34, 0.22);
    for (const z of [2.4, 4.6, 6.8]) A.part('torus', '#4a3a2a', 0, v, D + z, 0.8, 0.8, 0.8, 0, Math.PI / 2, 0);
    A.box('#4a3826', 0, v - 0.45, D + 0.72, 1.1, 0.1, 0.1); for (let i = 0; i < 4; i++) A.cyl('#6a5440', -0.42 + i * 0.28, v - 0.45, D + 0.6, 0.025, 0.3);
    A.box('#4a3826', 0, v, D + CPM5B.FORE_H - 2.2, 1.8, 0.1, 0.1);
  },
};
const CPM5_MAP = Object.assign({}, GWS_MAP, { isle: 'cpm05sea', zones: { deck: { n: 'the Wren', r: [-4, 4, -12, 12], sky: true } } });

// ---------- the stages ----------
function cpm5SailStage(which) {
  const G0 = RAID_STAGES.gwsail, out = which === 'outer';
  return Object.assign({}, G0, {
    n: out ? 'The Outer Skerries' : 'The Inner Skerries', map: CPM5_MAP, gws: true,
    music: () => RAID.st.m5fin ? 'cpm05last' : 'cpm05sail',
    prep() { cpm5Biome('lagoon'); cpm5Leg(which); },
    enter() {
      if (!GWS_LEG || GWS_LEG.which !== which) { cpm5Biome('lagoon'); cpm5Leg(which); }
      G0.enter();
      Object.assign(RAID.st, { m5w: which, m5dv: 0, m5lk: '', m5fin: 0, m5said: {}, m5spT: 3, m5up: 0 });
      if (!out) RAID.st.mar.st = 1;
      ZM.banner = { text: out ? 'The Outer Skerries' : 'The Inner Skerries', t: 4.5, sub: out ? '9 January 1888 · follow the shark in' : 'past the Gate · the harbour under the Light', col: '#c8f0d8' };
      fpsFeed(out ? 'Aboard the Wren. Take the wheel (Use) and follow Plimsoll: keep inside his ring and Maren holds where she is.' : 'Through the Gate. Follow him on in: the channel narrows ahead.');
      if (out) fpsFeed('Stand lookout at the bow lantern and the rocks close ahead show for everyone. The bell at the mainmast drives Maren back.');
      if (ZM.net !== 'client') { cpObjective(''); cpWaypoint(null); }
    },
    tick(dt) { G0.tick(dt); cpm5Tick(dt); },
    me(dt) { G0.me(dt); cpm5Me(dt); },
    pack(o) { G0.pack(o); const S = RAID.st; o.m5w = [S.m5dv, S.m5lk || '', S.m5fin | 0]; },
    apply(o) { G0.apply(o); const S = RAID.st, a = o.m5w; if (!Array.isArray(a)) return; S.m5dv = +a[0] || 0; S.m5lk = String(a[1] || ''); S.m5fin = a[2] | 0; if (GWS_LEG) GWS_LEG.plim = S.m5dv !== 1; },
    consider(c) { G0.consider(c); const S = RAID.st; if (S.B && S.ph !== 'sunk') { const [x, y] = gwsW(...CPM5B.LOOK); c({ k: 'm5look' }, x, y, GWS.D, 1.6, false); } },
    prompt(o) { if (o.k === 'm5look') { const S = RAID.st; return { text: S.m5lk === FPS.me.id ? 'On lookout at the bow lantern: the rocks close ahead show for everyone' : S.m5lk ? `${gwsNick(S.m5lk)} is on lookout at the bow lantern` : 'Stand here on lookout: the bow lantern shows the rocks close ahead' }; } return G0.prompt(o); },
    use(o) { if (o.k === 'm5look') return true; return G0.use(o); },
    hud(phone, mono, fell) { G0.hud(phone, mono, fell); cpm5Hud(phone, mono, fell); },
    b3(grp) { G0.b3(grp); },
    f3(dt) { G0.f3(dt); cpm5PlimF3(); },
    exit() { G0.exit(); GWS_LEG = null; CPM5B3.on = false; },
  });
}
cpStage('m05outer', cpm5SailStage('outer'));
cpStage('m05inner', cpm5SailStage('inner'));

// ---------- hosting or alone ----------
function cpm5Tick(dt) {
  const S = RAID.st, B = S.B, L = GWS_LEG; if (!B || !L || S.ph === 'sunk' || ZM.over) return;
  const n = Math.max(1, ZM.hum.length);
  // who's on lookout at the bow lantern (the first of you there)
  { let lk = ''; const [x, y] = gwsW(...CPM5B.LOOK); for (const p of ZM.players || []) if (Math.hypot(p.x - x, p.y - y) < CPM5B.LOOK_R && !gwsIsDown(p.sid)) { lk = p.sid; break; } if (lk && lk !== S.m5lk && !S.m5said.look) { S.m5said.look = 1; cpSay('wren', 'Good. Sing out what you see from the bow, lad.', 'cp_m05_29'); } S.m5lk = lk; }
  if (L.which === 'outer') {
    // at the Hulks, he goes under (once she's close behind him), and comes up again a bend or two on
    const up = L.sea.path.findIndex(p => p.b === CPM5B.UP_AT), dive = L.sea.path.findIndex(p => p.b === CPM5B.DIVE_AT);
    if (S.m5dv === 0 && S.pl.k >= dive && Math.hypot(S.pl.x - B.x, S.pl.y - B.y) < 160) {
      S.m5dv = 0.5;
      cpCine('m05_dive', () => { S.m5dv = 1; const q = L.sea.path[up]; Object.assign(S.pl, { x: q.x, y: q.y, k: up + 1, w: 0, wait: 0 }); L.plim = false; gwsSay('Plimsoll has gone under. No cover till he’s up again: keep her in the channel, and ring if she comes.', true); });
    }
    if (S.m5dv === 1) { const q = L.sea.path[up]; if (Math.hypot(q.x - B.x, q.y - B.y) < CPM5B.UP_R) { S.m5dv = 2; L.plim = true; cpSay('hand', 'There! He’s up again, ahead of us, and walking on.', 'cp_m05_30'); cpEvent('m5up'); } }
    if (!S.m5said.hulks && Math.hypot(B.x - CPM5B.HULKS[0], B.y - CPM5B.HULKS[1]) < 300) { S.m5said.hulks = 1; cpSay('wren', 'The Hulks. Old wrecks on the rocks, and things coming out of them. Repel boarders!', 'cp_m05_31'); }
    // out through the Gate
    if (B.y < CPM5B.GATE_Y && Math.abs(B.x - CPM5B.GATE[0]) < 140) { S.m5gate = 1; cpDone(); }
  } else {
    if (!S.m5said.narrow && B.y < 720) { S.m5said.narrow = 1; cpSay('wren', 'The Narrows. Hold her in his wake, a ship’s length either side and no more.', 'cp_m05_32'); }
    const dh = Math.hypot(CPM5B.HARB[0] - B.x, CPM5B.HARB[1] - B.y);
    if (!S.m5fin && dh < CPM5B.FIN) {
      S.m5fin = 1;
      cpCine('m05_last', () => { S.mar.st = Math.min(SK.MAREN_STAGES.length - 1, Math.max(S.mar.st, 2)); S.m5spT = 1; gwsSay('He has walked on to the pier. Maren is coming: ring the bell, and make the harbour!', true); });
    }
    // the last reach: he walks straight on to the pier and waits there; the drowned over every rail
    if (S.m5fin && !cpCineOn()) {
      const P = S.pl, path = L.sea.path, q = path[path.length - 1], d = Math.hypot(q.x - P.x, q.y - P.y);
      if (d > 0.5) { const sp = Math.min(d, 16 * dt); P.x += (q.x - P.x) / d * sp; P.y += (q.y - P.y) / d * sp; P.dx = (q.x - P.x) / d; P.dy = (q.y - P.y) / d; P.w = 1; P.k = path.length; } else P.w = 0;
      S.m5spT -= dt; if (S.m5spT <= 0) { S.m5spT = 2.4 / Math.sqrt(n); gwsSpawn(S); }
    }
    if (dh < CPM5B.IN_R) cpDone();
  }
}
cpOn('m5up', () => { try { if (!soundOff()) sfxSplash(0, 0.6); } catch (e) {} });

// ---------- everyone ----------
function cpm5Me(dt) {
  const S = RAID.st, V = S.V || S.B, L = GWS_LEG; if (!V || !L) return;
  // the bow lantern: with someone on lookout, the rocks close ahead of her bow show (dimly) for everyone
  if (S.m5lk) {
    const now = RAID.ct || 0;
    for (const r of L.sea.rocks) {
      const dx = r.x - V.x, dy = r.y - V.y; if (Math.abs(dx) > CPM5B.LOOK_SEE + 20 || Math.abs(dy) > CPM5B.LOOK_SEE + 20) continue;
      const d = Math.hypot(dx, dy) - r.r; if (d > CPM5B.LOOK_SEE) continue;
      if (Math.abs(angDiff(bearingOf(dx, dy), V.h)) > CPM5B.LOOK_A + r.r / Math.max(10, d)) continue;
      r.lit = Math.max(r.lit, 0.25 + 0.6 * (1 - Math.max(0, d) / CPM5B.LOOK_SEE)); void now;
    }
  }
}
function cpm5Hud(phone, mono, fell) {
  const S = RAID.st, L = GWS_LEG; if (!L || !S.B) return;
  const x = Math.max(14, FPS.safeLeft || 0), y = fpsHudTop() + (phone ? 32 : 44) + (phone ? 20 : 28) + (phone ? 14 : 18) * 5 + (phone ? 12 : 16);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11);
  const lk = S.m5lk ? (S.m5lk === FPS.me.id ? 'YOU' : gwsNick(S.m5lk).toUpperCase()) : 'NOBODY · STAND AT THE BOW LANTERN';
  const pl = S.m5dv === 1 ? 'GONE UNDER · NO COVER' : S.m5fin ? 'AT THE PIER · NO COVER' : gwsGuarded(S, S.V || S.B) ? 'CLOSE · SHE HOLDS' : 'AHEAD · KEEP UP';
  ctx.fillStyle = 'rgba(8,10,14,0.5)'; ctx.fillRect(x - 6, y - 4, phone ? 162 : 226, phone ? 30 : 36);
  ctx.fillStyle = S.m5lk ? 'rgba(236,228,207,0.85)' : 'rgba(232,176,128,0.85)'; ctx.fillText('LOOKOUT · ' + lk, x, y, phone ? 150 : 214);
  ctx.fillStyle = S.m5dv === 1 || S.m5fin ? `rgba(255,170,140,${0.75 + 0.25 * Math.sin(g.t * 5)})` : '#8fd8ff'; ctx.fillText('PLIMSOLL · ' + pl, x, y + (phone ? 13 : 16), phone ? 150 : 214);
  fpsHudNote(y + (phone ? 28 : 34)); ctx.textBaseline = 'alphabetic';
}

// ---------- in 3D: the Wren's rig and lantern, the green wake, the Hulks and the Gate ----------
const CPM5B3 = { on: false };
function cpm5b3d(SG, G) {
  const T = CPM5B3, D = GWS.D, L = GWS_LEG; T.on = true;
  const lam = c => z3Lam(c), canvas = z3Lam('#d8ccb0', { side: THREE.DoubleSide }), DG = G.DG;
  // the foresail on its gaff, aft of the foremast, and the fore staysail to the bowsprit (the cutter's jib is struck)
  if (G.jibS) G.jibS.visible = false;
  T.fore = gwsSailMesh(canvas, 9); DG.add(T.fore); T.stay = gwsSailMesh(canvas, 7); DG.add(T.stay);
  { const v = CPM5B.FORE, gaff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.4, 6).rotateX(Math.PI / 2), lam('#5a4632')); gaff.position.copy(gdv(0, v - 2.0, D + 10.0)); gaff.rotation.x = -0.35; DG.add(gaff);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 4.0, 6).rotateX(Math.PI / 2), lam('#5a4632')); boom.position.copy(gdv(0, v - 2.0, D + 2.0)); DG.add(boom);
    const pts = [gdv(0, v, D + CPM5B.FORE_H - 0.3), gdv(0, GWS.SPRIT - 0.2, D + 1.25), gdv(0, v, D + CPM5B.FORE_H - 0.3), gdv(0, GWS.MAST[1], D + GWS.MAST_H - 1)];
    for (const s of [-1, 1]) pts.push(gdv(0, v, D + CPM5B.FORE_H - 0.5), gdv(s * (gwsHw(v - 0.5) - 0.1), v - 0.5, D + 0.95));
    DG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x4a4236, transparent: true, opacity: 0.85 }))); }
  // her name, on the transom and on each bow
  { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); x.font = 'bold 42px "IM Fell English SC", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(232,220,180,0.92)'; x.fillText('WREN', 128, 34);
    const tex = new THREE.CanvasTexture(cv), mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xb8b098 });
    const tr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), mat); tr.position.copy(gdv(0, GWS.STERN - 0.2, D - 0.62)); tr.rotation.y = Math.PI; DG.add(tr);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.32), mat); const v = GWS.BOW - 2.6; b.position.copy(gdv(s * (gwsHw(v) + 0.13), v, D - 0.4)); b.rotation.y = s > 0 ? Math.PI / 2 + 0.25 : -Math.PI / 2 - 0.25; DG.add(b); } }
  // the bow lantern, on its bracket at the stem: brighter, and its light thrown ahead, while someone's on lookout
  { const B = T.bow = new THREE.Group(); B.position.copy(gdv(0, GWS.BOW - 0.9, D + 1.45)); DG.add(B);
    B.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 10), lam('#9a7a34')));
    T.bowGl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); T.bowGl.position.y = 0.15; B.add(T.bowGl);
    T.bowH = G.glowSp(0xffd890, 1.4); T.bowH.position.y = 0.15; B.add(T.bowH);
    T.bowL = new THREE.PointLight(0xffd090, 0.6, 14, 1.4); T.bowL.position.y = 0.2; B.add(T.bowL);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), lam('#2a2a2c')); post.position.y = -0.3; B.add(post);
    T.cone = G.glowSp(0xffe0a0, 30, { opacity: 0 }); T.cone.position.copy(gdv(0, GWS.BOW + 24, D + 0.8)); T.cone.scale.set(34, 4, 1); DG.add(T.cone); }
  // the wake glows green tonight
  for (const F of G.foam || []) F.m.material.color.setHex(0x7affc8);
  // the Hulks: the ribs of old wrecks on the rocks there, weed on them, a green glow among them
  T.hulks = null;
  if (L && L.which === 'outer') {
    const H = T.hulks = new THREE.Group(); H.position.copy(gsv(CPM5B.HULKS[0], CPM5B.HULKS[1], 0)); SG.add(H);
    const rib = lam('#2a2018'), R = seeded(0x4b1c);
    for (let w = 0; w < 4; w++) { const a = R() * 6.283, d = 30 + R() * 50, g3 = new THREE.Group(); g3.position.set(Math.sin(a) * d, 0, -Math.cos(a) * d); g3.rotation.set((R() - 0.5) * 0.4, R() * 6.283, (R() - 0.5) * 0.5); H.add(g3);
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 4, 10, Math.PI * 0.55), rib); m.position.set(s * 0.2, -0.6, -6 + i * 2.2); m.rotation.set(0, Math.PI / 2, s > 0 ? -0.2 : Math.PI + 0.2); g3.add(m); }
      const keel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 14), rib); keel.position.y = -0.8; g3.add(keel); }
    T.hulkG = G.glowSp(0x7affc0, 120, { opacity: 0.08 }); T.hulkG.position.y = 4; H.add(T.hulkG);
  }
  // the Gate's two stacks: tall black pillars of rock, always to be seen against the sky
  T.gate = [];
  if (L && L.which === 'outer') for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(6, 12, 34, 9), lam('#1a2422')); m.position.copy(gsv(CPM5B.GATE[0] + s * (CPM5B.GATE_W + 14), CPM5B.GATE[1], 14)); SG.add(m); T.gate.push(m); }
}
function cpm5f3d(dt, V) {
  const T = CPM5B3, S = RAID.st, D = GWS.D, t = g.t; if (!T.on || !T.fore) return;
  const fill = clamp(0.25 + V.sail * 0.55, 0.25, 1.15), v = CPM5B.FORE;
  gwsSailShape(T.fore, [[0, v - 0.15, D + 2.1], [0, v - 3.9, D + 2.1], [0, v - 0.15, D + 9.6], [0, v - 3.9, D + 10.9]], 1, fill * 0.75, t + 2);
  gwsSailShape(T.stay, [[0, GWS.SPRIT - 0.4, D + 1.3], [0.7 + 0.3 * fill, v + 1.2, D + 1.6], [0, v + 0.2, D + CPM5B.FORE_H - 0.6], [0, v + 0.2, D + CPM5B.FORE_H - 0.6]], 1, fill * 0.5, t + 3);
  const on = !!S.m5lk, f = reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 13);
  T.bowH.material.opacity = (on ? 0.95 : 0.5) * f; T.bowL.intensity = (on ? 1.4 : 0.5) * f; T.cone.material.opacity = on ? 0.06 + 0.02 * Math.sin(t * 2) : 0;
  if (T.hulkG) T.hulkG.material.opacity = 0.06 + 0.04 * Math.sin(t * 0.8);
  for (const m of T.gate) m.visible = true;
}
// (each frame, after gwsail's 3D) Plimsoll going under, in the cinematic
function cpm5PlimF3() {
  if (!GW3.plim) return;
  if (CPN.on && CPN.on.id === 'm05_dive' && CPN.shot === 1) { const k = clamp(((CPN.st || 0) - 1.6) / 1.4, 0, 1); GW3.plim.position.y -= k * 4.5; if (GW3.ring) GW3.ring.visible = false; }
}
