// Freebooters' Sea: voyages. The voyage board at Saltcote, the three companies that post on it, and what each of
// their voyages asks of the crew out on the Wide Water: hoard charts and the spade, the drowned captains' camps and
// their bells, and the wrecks on the sea bed. Also the chart table on the cutter's deck, and the charts in your coat.
//
//  - The board (FPI_K.fbboard, src/fbisle.js, at FPS.g.isle.zm.fb.board): Use opens it (keys 1 to 3 or a click or
//    a tap to take a notice, the D-pad and A on a controller, Esc or B to put it away). Each of the three companies
//    pins one notice, drawn at random by the host: the Gilt & Gull Company (hoards), the Bellmen (bounties) and the
//    Tidewrights (salvage), each in one of three waters (FV_TIER: the near, the middle and the far water, by how far
//    north its islands lie) and paying so many sovereigns on top of what the loot fetches. One voyage at a time:
//    whatever anyone takes is the crew's, and it can be abandoned at the board (fresh notices go up). Done, the
//    company's purse goes to the crew's (FB.gold), its standing (FB.voy.stand) goes up by one, and the board is
//    pinned afresh.
//  - Hoard charts (the Gilt & Gull Company): two or three charts, each naming one island. Every island but Saltcote
//    has its own hoard spot (fvIslePlan, fixed: from the island's seed), laid out with the island (the hook's set) at
//    that spot if it's clear (else the nearest clear spot, fbIsleSpot at worst), with three landmarks about it (a
//    dead tree, a standing stone, a cairn, an old anchor, a cannon, a cross: of the island's look) and a flat marker
//    under the sand (FPI_K.fvx) so nothing else is put on it. The chart (fvDrawIsle, on a canvas) is the island's
//    outline as the ground is drawn (fpsIsleGround's edge), hand-inked, its landmarks, the X, a compass rose and how
//    many paces from the nearest landmark. M opens your charts (on a controller, hold View; on a phone, the chart
//    button at the top). Ashore, with a hoard voyage in hand, there's a spade: hold Use where you stand (FVC.DIG_T
//    seconds, a spade and the dirt flying) and within FVC.DIG_R of the true X a chest comes up out of the ground
//    (fbLootAdd: a sea chest, ironbound or gilded by the voyage's water); anywhere else, a hole, and one time in
//    FVC.TRINKET a trinket. Every chart dug: the voyage is done.
//  - Bounties (the Bellmen): a drowned captain holds a camp on an island (tents, a fire, the drowned's flags, laid
//    out with the island while the bounty's on). Come within FVC.WAKE of the camp and the drowned come up round it in
//    FVC.WAVES waves (more the more of you there are); then the captain, one of the Lighthouse's bosses (the Diver,
//    the Mooncusser or the Keelback) at FVC.K of its strength by the water (zbHpOf, with the players, as Fog Run's
//    Elite islands have them: src/frisle.js friBoss). Down, he drops his bell (loot 'bell'); the voyage is done.
//  - Salvage (the Tidewrights): a wreck on the sea bed, marked on its chart, a broken mast standing out of the water
//    over her. Within FVC.WRECK_R of it, Use at the capstan forward lets go the anchor (she's held there: her way off,
//    never her speed), and from the port rail you dive: hold Use and you go down the line and haul, the breath bar
//    draining; the line snags now and then (let go until it frees, or it drags you back and your breath goes twice as
//    fast); hauled, a cargo crate comes up over the rail and into the hold (fbStowKind). FVC.CRATES of them and the
//    voyage is done, and the anchor's weighed.
//  - The chart table on deck, port side aft of the mast (Use): the whole sea, Saltcote, the islands, the rocks the
//    charts know, the ship as she lies, and the voyage's marks; then the voyage's own charts.
// What happens, for anyone (fbOn): 'voyage' (cb(done, company, reward): done, how many voyages done this session;
// company 'gilt', 'bell' or 'tide'; reward, the sovereigns paid, already in FB.gold), 'voydone' (cb(kind, company,
// reward, tier)), 'voytake' (cb(kind, company, tier)) and 'voyquit' (cb(kind, company)). FB.voy is the state (below),
// the same on every screen.
// Together it's the host's: the notices, the voyage and its progress, the holes, the camp's waves and the captain, the
// anchor and the crates. The session-wide word is fvw (packAll), the island's fvb (the camp) and fvu (a chest coming
// up), the sea's fvs (the anchor). A joined player asks raidAsk('voyage', ['pick', board, n] | ['quit']), raidAsk('dig',
// [x, y]) (from the island's middle) and raidAsk('dive', 'anchor' | 'weigh' | 'crate').
// For tests: fbVoyDebug(kind) ('board', 'hoard', 'dig', 'bounty', 'captain', 'salvage', 'table', 'chart').
// Hooks in shared files, marked [fbsea voyages]: src/fps.js keydown (fvKey), src/fbsea.js fbEventHere ('voyage' and
// 'voydone' heard with their say spread), index.html (this script).

const FVC = { DIG_T: 2.6, DIG_R: 3.4, HOLE: 1.3, TRINKET: 0.12, UP_T: 1.6, WAKE: 15, WAVES: 3, WAVE_GAP: 3, K: [0, 0.5, 0.65, 0.8],
  WRECK_R: 40, HAUL: 4.2, BREATH: 7, SNAG: 0.9, CRATES: 3, TABLE: [-1.9, -5.4], DIVE: [-2.85, -2.4], CAP: [2.35, 7.4], PAD_HOLD: 0.45 };
const FV_CO = {
  gilt: { n: 'the Gilt & Gull Company', N: 'Gilt & Gull Company', s: 'hoards', k: 'hoard', col: '#d8a840' },
  bell: { n: 'the Bellmen', N: 'The Bellmen', s: 'bounties', k: 'bounty', col: '#c8664a' },
  tide: { n: 'the Tidewrights', N: 'The Tidewrights', s: 'salvage', k: 'salvage', col: '#5aa8c0' },
};
const FV_KCO = { hoard: 'gilt', bounty: 'bell', salvage: 'tide' };
const FV_TIER = ['', 'the near water', 'the middle water', 'the far water'];
const FV_PAY = { hoard: 70, bounty: 220, salvage: 130 };
const FV_CAPS = ['Captain Elias Mourne', 'Captain Hester Vane', 'Captain Absalom Crake', 'Captain Tobias Rennick', 'Captain Judith Saltash', 'Captain Ezra Pellow', 'Captain Silas Quarle', 'Captain Mercy Treloar'];
const FV_WRECKS = ['the brig Kittiwake', 'the barque Constant Hope', 'the schooner Ellen Trevose', 'the packet Morwenna', 'the collier Brotherly Love', 'the lugger Patience', 'the ketch Sea Pink', 'the snow Amity'];
const FV_BOSS = ['diver', 'moon', 'crab'];
// the landmarks a chart can draw, and which an island's look has
const FV_LM = {
  tree: { n: 'dead tree', r: 0.6, put: (H, x, y, R) => H.put('tree', x, y, R() * 6.28, { hh: 4.5 + R() * 1.5, bent: R() < 0.5 }) },
  stone: { n: 'standing stone', r: 0.6, put: (H, x, y, R) => H.put('stone', x, y, R() * 6.28, { w: 0.9, d: 0.5, hh: 2.2 + R() * 0.5, lean: (R() - 0.5) * 0.2 }) },
  cairn: { n: 'cairn', r: 1, put: (H, x, y, R) => H.put('cairn', x, y, 0, { r: 0.85, hh: 1.5 }) },
  anchor: { n: 'old anchor', r: 1.1, put: (H, x, y, R) => H.put('anchor', x, y, R() * 6.28, {}) },
  cannon: { n: 'cannon', r: 1.4, put: (H, x, y, R) => H.put('cannon', x, y, R() * 6.28, { len: 2.4 }) },
  cross: { n: 'stone cross', r: 0.7, put: (H, x, y, R) => H.put('cross', x, y, R() * 6.28, {}) },
};
const FV_LOOKLM = { shingle: ['cairn', 'anchor', 'stone', 'tree'], reef: ['anchor', 'cannon', 'cairn', 'stone'], chapel: ['cross', 'tree', 'stone', 'cairn'],
  cove: ['cannon', 'tree', 'anchor', 'cairn'], cliff: ['cairn', 'stone', 'tree', 'cross'], marsh: ['tree', 'stone', 'cairn', 'anchor'] };

// the state, the same on every screen: the notices (board: their number), the voyage in hand (cur), the companies'
// standings this session, voyages done, holes dug (by island, from its middle)
var FV = { open: '', page: 0, pages: [], padWas: null, padCur: 0, viewT: 0, digT: 0, digAt: null, pend: 0, haul: 0, breath: FVC.BREATH, snag: 0, snagT: 2, diving: false, upT: 0, act: {} };
const fvFresh = () => ({ offers: [], board: 0, cur: null, stand: { gilt: 0, bell: 0, tide: 0 }, n: 0, holes: {} });
FB.voy = fvFresh();
const fvHost = () => ZM.net !== 'client';
const fvCur = () => FB.voy && FB.voy.cur;
const fvEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fvN = () => Math.max(1, ZM.hum ? ZM.hum.length : 1);
const fvR = v => Math.round(v * 10) / 10;
const fvHold = () => !!(FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse);
const fvAble = () => { const m = FPS.me; return !(m.dead > 0) && !zmIsDown() && !ZM.over; };
const fvCompass = a => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((a % 6.2832) + 6.2832) % 6.2832 / 0.7854) % 8];

// ---------- the session ----------
// (fbBegin, wrapped) a fresh board for a fresh session
{ const b0 = fbBegin; fbBegin = function () { b0.apply(this, arguments); FB.voy = fvFresh(); fvCloseAll(); }; }
// (fbNoGun, wrapped) no gun in your hands while you dig or haul
{ const g0 = fbNoGun; fbNoGun = function () { return g0() || FV.digT > 0 || FV.diving; }; }
// (fbStop, wrapped) the board and the charts put away, the phone's chart button hidden
{ const s0 = fbStop; fbStop = function () { s0.apply(this, arguments); fvCloseAll(); const b = $('fvPadChart'); if (b) b.hidden = true; }; }

// ---------- the islands' hoard spots ----------
// an island's hoard spot and its landmarks, as planned from its seed (from the island's middle, metres; x east, y north)
const FV_PLAN = {}, FV_ACT = {};
function fvIslePlan(i) {
  if (FV_PLAN[i]) return FV_PLAN[i];
  const I = FB_ISLES[i], R = seeded((I.seed ^ 0xf5d1) >>> 0), IR = FBI.R;
  const a = R() * 6.2832, d = 12 + R() * (IR - 30), x = Math.cos(a) * d, y = Math.sin(a) * d;
  const kinds = (FV_LOOKLM[I.look] || FV_LOOKLM.shingle).slice(); for (let k = kinds.length - 1; k > 0; k--) { const j = (R() * (k + 1)) | 0; [kinds[k], kinds[j]] = [kinds[j], kinds[k]]; }
  const lm = [], a0 = R() * 6.2832;
  for (let k = 0; k < 3; k++) { const b = a0 + k * 2.094 + (R() - 0.5) * 0.6, e = 5 + R() * 4.5; let lx = x + Math.cos(b) * e, ly = y + Math.sin(b) * e; const r = Math.hypot(lx, ly); if (r > IR - 8) { lx *= (IR - 8) / r; ly *= (IR - 8) / r; } lm.push({ k: kinds[k], x: lx, y: ly }); }
  return FV_PLAN[i] = { x, y, lm };
}
// where it really is (as laid out here, once it has been), else as planned
const fvIsleSpot = i => FV_ACT[i] || fvIslePlan(i);

// ---------- the props ----------
// the hoard's marker, flat under the sand: keeps the wrecks and rocks laid out after it off the spot (you walk on it)
FPI_K.fvx = { col: FPI_C.stone, sol(p) { return [fpiCirc(p, 0, 0, 1.4, 0.01, { fl: true, ray: false })]; }, b3() {} };
// a drowned man's tent: a ridge of rotten sailcloth on two poles, weed hanging off it
FPI_K.fvtent = {
  col: '#3e463c',
  sol(p) { return [fpiBox(p, 0, 0, 1.25, 0.95, 1.6)]; },
  b3(p, A) {
    const c = p.c || '#4a5246', c2 = '#2e342c';
    for (const s of [-1, 1]) A.part('box', s > 0 ? c : '#3e463a', 0, s * 0.47, 0.66, 2.5, 1.55, 0.05, 0, s * 0.62, 0);
    for (const u of [-1.2, 1.2]) A.cyl(FPI_C.wood3, u, 0, 0, 0.05, 1.42, 0, 0, 0, 'cyl6');
    A.log(FPI_C.wood3, 0, 0, 1.36, 0.04, 2.6, 0);
    for (let k = 0; k < 5; k++) A.box(c2, -1 + k * 0.5, 0.9 * (k % 2 ? 1 : -1), 0.1, 0.12, 0.03, 0.4 + A.r() * 0.3, 0, k % 2 ? 0.5 : -0.5);
    A.part('disc', '#1e221e', 0, 0, 0.03, 2.2, 1, 1.4);
  },
};
// the drowned's flag: a black rag on a spar, a pale bell sewn on it, and weed knotted to the spar
FPI_K.fvflag = {
  col: FPI_C.wood3,
  sol(p) { return [fpiCirc(p, 0, 0, 0.12, 3.6)]; },
  b3(p, A) {
    A.cyl(FPI_C.wood3, 0, 0, -0.2, 0.06, 3.8, 0, 0, 0, 'cyl6');
    A.box('#161a18', 0.62, 0, 2.6, 1.15, 0.03, 0.85, 0, 0, 0.08);
    A.box('#c8c4b0', 0.6, -0.025, 2.88, 0.3, 0.01, 0.28); A.box('#c8c4b0', 0.6, -0.025, 2.78, 0.42, 0.01, 0.06);
    for (let k = 0; k < 4; k++) A.box('#161a18', 0.2 + k * 0.28, 0, 2.38 - A.r() * 0.2, 0.14, 0.03, 0.25, 0, 0, (A.r() - 0.5) * 0.5);
    A.box('#2c3a24', 0, 0, 1.2, 0.18, 0.18, 0.6);
  },
};

// ---------- laying out an island ----------
fbHook('isle', {
  set(H, K, Z) {
    const p = fbPlanNow(); if (!p || !Z.fb) return;
    const i = p.i, P = fvIslePlan(i), R = seeded((FB_ISLES[i].seed ^ 0x1a2d) >>> 0), { CX, CY } = H;
    // the hoard's spot: as planned if it's clear, else the nearest clear spot
    let at = [CX + P.x, CY + P.y];
    if (!(H.inside(at[0], at[1], 1.5) && H.clear(at[0], at[1], 1.5, 0.8))) at = H.near(at[0], at[1], 1.5, 1, 8, 0.8) || fbIsleSpot(1.5, 8, H.IR - 14) || at;
    H.put('fvx', at[0], at[1], 0, {});
    const act = { x: at[0] - CX, y: at[1] - CY, lm: [] };
    for (const L of P.lm) {
      const D = FV_LM[L.k]; let q = [at[0] + (L.x - P.x), at[1] + (L.y - P.y)];
      if (!(H.inside(q[0], q[1], D.r) && H.clear(q[0], q[1], D.r, 0.5))) q = H.near(q[0], q[1], D.r, 0.5, 3.5, 0.5);
      if (!q) continue;
      D.put(H, q[0], q[1], R); act.lm.push({ k: L.k, x: q[0] - CX, y: q[1] - CY });
    }
    FV_ACT[i] = act; Z.fb.fvX = [act.x, act.y];
    // the drowned captain's camp, while the bounty's on for this island
    const c = fvCur();
    if (c && c.k === 'bounty' && c.is[0] === i && !c.got[0]) {
      const cs = H.spot(7, 10, H.IR - 14, 2) || fbIsleSpot(5, 8, H.IR - 12);
      if (cs) {
        const [x0, y0] = cs, a0 = R() * 6.28;
        const f = H.put('fire', x0, y0, 0, {}); H.light(x0, y0, 0.5, '#ff8a3a', 11, 'fire'); H.I.lights[H.I.lights.length - 1].p = f;
        for (let k = 0; k < 3; k++) { const a = a0 + k * 2.1 + (R() - 0.5) * 0.4, [tx, ty] = [x0 + Math.cos(a) * 4.6, y0 + Math.sin(a) * 4.6]; if (H.clear(tx, ty, 1.3, 0.2)) H.put('fvtent', tx, ty, a + Math.PI / 2, { c: ['#4a5246', '#46423a', '#3e4a44'][k] }); }
        for (let k = 0; k < 3; k++) { const a = a0 + 1.05 + k * 2.1, [fx, fy] = [x0 + Math.cos(a) * 6.4, y0 + Math.sin(a) * 6.4]; if (H.clear(fx, fy, 0.2, 0.2)) H.put('fvflag', fx, fy, a, {}); }
        { const q = H.near(x0, y0, 0.7, 2.4, 3.2, 0.2); if (q) fpiBarrels(H, q[0], q[1]); }
        Z.fb.fvCamp = [x0 - CX, y0 - CY];
      }
    }
  },
});

// ---------- the notices ----------
function fvBand(t) { return FB_ISLES.map((I, i) => ({ I, i })).filter(o => !o.I.port && (t === 1 ? o.I.y < 1900 : t === 2 ? o.I.y >= 1900 && o.I.y < 3000 : o.I.y >= 3000)).map(o => o.i); }
const fvPick = L => L[(Math.random() * L.length) | 0];
function fvShuffle(L) { L = L.slice(); for (let k = L.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [L[k], L[j]] = [L[j], L[k]]; } return L; }
// a wreck's spot in that water, clear of the islands and the rocks
function fvWreckAt(t) {
  const y0 = [0, 1250, 1900, 3000][t], y1 = [0, 1900, 3000, 3850][t], sea = fbSea();
  for (let n = 0; n < 400; n++) {
    const x = -1350 + Math.random() * 2700, y = y0 + Math.random() * (y1 - y0);
    if (FB_ISLES.some(I => Math.hypot(I.x - x, I.y - y) < I.r + (I.port ? 320 : 110))) continue;
    if (sea.rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + 38)) continue;
    return [Math.round(x), Math.round(y)];
  }
  return [300, y0 + 200];
}
function fvMake(k, t) {
  const o = { k, co: FV_KCO[k], t, is: [], got: [], rw: 0 };
  if (k === 'hoard') { let L = fvShuffle(fvBand(t)); const n = 2 + (Math.random() < 0.5 ? 1 : 0); if (L.length < n) L = L.concat(fvShuffle(fvBand(t === 3 ? 2 : t + 1))); o.is = L.slice(0, n).sort((a, b) => FB_ISLES[a].y - FB_ISLES[b].y); o.got = o.is.map(() => 0); o.rw = FV_PAY.hoard * t * o.is.length; }
  else if (k === 'bounty') { o.is = [fvPick(fvBand(t))]; o.got = [0]; o.bk = fvPick(FV_BOSS); o.cap = fvPick(FV_CAPS); o.rw = FV_PAY.bounty * t; }
  else { const w = fvWreckAt(t); o.wx = w[0]; o.wy = w[1]; o.wn = fvPick(FV_WRECKS); o.got = [0]; o.rw = FV_PAY.salvage * t; }
  return o;
}
// (hosting or alone) three fresh notices, one from each company, each in a water of its own if it can be
function fvDraw() {
  const V = FB.voy, ts = fvShuffle([1, 2, 3]);
  V.board++; V.offers = ['hoard', 'bounty', 'salvage'].map((k, n) => fvMake(k, Math.random() < 0.7 ? ts[n] : 1 + ((Math.random() * 3) | 0)));
  fvPaint();
}
function fvEnsure() { if (FB.on && fvHost() && !FB.voy.offers.length) fvDraw(); }
// a voyage in words
function fvWhat(o, short) {
  if (!o) return '';
  if (o.k === 'hoard') return short ? `Hoard · ${o.got.filter(Boolean).length} of ${o.is.length} dug` : `${['', 'One', 'Two', 'Three'][o.is.length]} hoard charts: ${o.is.map(i => FB_ISLES[i].n).join(', ')}`;
  if (o.k === 'bounty') return short ? `Bounty · ${o.cap}` : `${o.cap}, drowned, holds a camp on ${FB_ISLES[o.is[0]].n}. Bring back his bell.`;
  return short ? `Salvage · ${o.got[0] | 0} of ${FVC.CRATES} crates` : `${o.wn[0].toUpperCase() + o.wn.slice(1)}, sunk ${fvWreckWhere(o)}. Bring up ${FVC.CRATES} cargo crates.`;
}
function fvWreckWhere(o) { const n = fbNearest(o.wx, o.wy), I = FB_ISLES[n.i]; return `${Math.round(Math.hypot(o.wx - I.x, o.wy - I.y) / 10) * 10} m ${fvCompass(Math.atan2(o.wx - I.x, o.wy - I.y))} of ${I.n}`; }
function fvTitle(o) { return o.k === 'hoard' ? 'Hoard charts' : o.k === 'bounty' ? 'A bounty' : 'Salvage'; }

// ---------- taking one, giving it up, done ----------
function fvQVoyage(sid, a) {
  if (!Array.isArray(a)) return;
  const V = FB.voy;
  if (a[0] === 'pick') {
    if (V.cur || (a[1] | 0) !== V.board) return;
    const o = V.offers[clamp(a[2] | 0, 0, V.offers.length - 1)]; if (!o) return;
    V.cur = JSON.parse(JSON.stringify(o)); V.holes = {};
    fbEvent('voytake', `${fbNick(sid) === 'You' ? 'You take' : fbNick(sid) + ' takes'} a voyage for ${FV_CO[o.co].n}: ${fvWhat(o)} (${FV_TIER[o.t]}, ${fbSov(o.rw)}). M shows the charts.`, [o.k, o.co, o.t]);
  } else if (a[0] === 'quit') {
    const c = V.cur; if (!c) return;
    V.cur = null; V.holes = {};
    fbEvent('voyquit', `${fbNick(sid) === 'You' ? 'You give up' : fbNick(sid) + ' gives up'} the voyage for ${FV_CO[c.co].n}. Fresh notices on the board.`, [c.k, c.co]);
    fvDraw();
  }
  fvPaint();
}
// (hosting or alone) the voyage done: the company pays, its standing goes up, fresh notices
function fvDone() {
  const V = FB.voy, c = V.cur; if (!c) return;
  V.cur = null; V.n++; V.stand[c.co] = (V.stand[c.co] | 0) + 1; FB.gold += c.rw;
  fbEvent('voyage', `Voyage done: ${FV_CO[c.co].n} pay ${fbSov(c.rw)} into the crew’s purse, and think the better of you (standing ${V.stand[c.co]}).`, [V.n, c.co, c.rw]);
  fbEvent('voydone', '', [c.k, c.co, c.rw, c.t]);
  ZM.banner = { text: 'Voyage done', t: 3.5, sub: `${FV_CO[c.co].N} · ${fbSov(c.rw)}`, col: FV_CO[c.co].col };
  fvDraw();
}

// ---------- the word ----------
const FV_WORD = {
  packAll(z) { const V = FB.voy; z.fvw = [V.board, V.offers, V.cur, [V.stand.gilt, V.stand.bell, V.stand.tide], V.n, V.holes]; },
  applyAll(hz) {
    const a = hz.fvw; if (!Array.isArray(a)) return;
    const V = FB.voy, ok = o => o && typeof o === 'object' && FV_KCO[o.k] ? o : null;
    const clean = o => { o = ok(o); if (!o) return null; return { k: o.k, co: FV_KCO[o.k], t: clamp(o.t | 0, 1, 3), is: Array.isArray(o.is) ? o.is.map(i => clamp(i | 0, 1, FB_ISLES.length - 1)).slice(0, 3) : [], got: Array.isArray(o.got) ? o.got.map(v => v | 0) : [0], rw: Math.max(0, o.rw | 0), bk: FV_BOSS.includes(o.bk) ? o.bk : 'diver', cap: znClean(o.cap || '', 40), wx: +o.wx || 0, wy: +o.wy || 0, wn: znClean(o.wn || '', 40) }; };
    const was = JSON.stringify([V.board, V.cur]);
    V.board = a[0] | 0; V.offers = Array.isArray(a[1]) ? a[1].map(clean).filter(Boolean).slice(0, 3) : [];
    V.cur = clean(a[2]);
    if (Array.isArray(a[3])) V.stand = { gilt: a[3][0] | 0, bell: a[3][1] | 0, tide: a[3][2] | 0 };
    V.n = a[4] | 0;
    if (a[5] && typeof a[5] === 'object') { const H = {}; for (const k of Object.keys(a[5]).slice(0, 13)) if (Array.isArray(a[5][k])) H[k | 0] = a[5][k].slice(0, 40).filter(Array.isArray).map(h => [+h[0] || 0, +h[1] || 0]); V.holes = H; }
    if (JSON.stringify([V.board, V.cur]) !== was) fvPaint();
  },
};
fbHook('port', FV_WORD);

// ---------- Saltcote: the board ----------
fbHook('port', {
  tick() { fvEnsure(); },
  me(dt) { fvMeAll(dt); },
  consider(c) { const F = fbiFb(); if (F && F.board) { const [x, y] = fbiW(F.board); c({ k: 'fvboard' }, x, y, FPS.me.jz || 0, 2.2, false); } },
  prompt(o) { if (o.k === 'fvboard') return { text: fvCur() ? 'Read the voyage board (a voyage in hand)' : 'Read the voyage board: take a voyage', free: true }; return null; },
  use(o) { if (o.k === 'fvboard') { fvBoardOpen(); return true; } return null; },
  q(sid, k, a) { if (k === 'voyage') { fvQVoyage(sid, a); return true; } return null; },
  hud(phone, mono) { fvHud(phone, mono); },
  exit() { fvCloseAll(); },
});

// ---------- ashore: the spade, the hoards, the camp ----------
fbHook('isle', {
  enter() { Object.assign(RAID.st, { fvb: [0, 0, 0], fvbT: 0, fvu: null, fvPend: 0 }); FV.digT = 0; const c = fvCur(), p = fbPlanNow(); if (c && p) { const j = c.is.indexOf(p.i); if (c.k === 'hoard' && j >= 0 && !c.got[j]) fpsFeed(`This is the island on one of your charts. Find the X by its landmarks (M) and dig: hold Use with the spade.`); if (c.k === 'bounty' && j >= 0 && !c.got[0]) fpsFeed(`${c.cap}’s camp is on this island, by its fire. Clear it, and take his bell.`); } },
  tick(dt) { fvEnsure(); fvCampTick(dt); const S = RAID.st; if (S.fvu) { S.fvu[1] -= dt; if (S.fvu[1] <= 0) S.fvu = null; } },
  me(dt) { fvMeAll(dt); fvDigMe(dt); },
  consider(c) {
    if (!fvDigOk()) return;
    const S = RAID.st, m = FPS.me, F = fbiFb();
    if (F && Math.hypot(fbiW(F.boat)[0] - m.x, fbiW(F.boat)[1] - m.y) < FBI.BOAT_R + 0.6) return;
    if (ZM.net && [...FPS.remote.values()].some(r => r.down && !r.dead && Math.hypot(r.x - m.x, r.y - m.y) < 2.4)) return;
    // (put a little way off, so anything nearer to hand than the ground under you is used first)
    c({ k: 'fvdig' }, m.x - Math.sin(m.h) * 1.2, m.y - Math.cos(m.h) * 1.2, m.jz || 0, 1.25, false);
  },
  prompt(o) { if (o.k !== 'fvdig') return null; const at = fvDigPoint(); return fvHoleNear(at[0], at[1]) ? { text: 'Dug here already' } : { text: 'Hold to dig here with the spade', hold: true }; },
  use(o) { return o.k === 'fvdig' ? true : null; },
  q(sid, k, a) { if (k === 'dig') { fvQDig(sid, a); return true; } return null; },
  kill(d) { fvCampKill(d); },
  pack(o) { const S = RAID.st; o.fvb = S.fvb; o.fvu = S.fvu ? [S.fvu[0], fvR(S.fvu[1])] : 0; },
  apply(o) { const S = RAID.st; if (Array.isArray(o.fvb)) S.fvb = o.fvb.map(v => v | 0).slice(0, 3); if (Array.isArray(o.fvu)) { if (!S.fvu || S.fvu[0] !== String(o.fvu[0])) S.fvu = [String(o.fvu[0]), +o.fvu[1] || 0]; } else S.fvu = null; },
  hud(phone, mono, fell) { fvHud(phone, mono); fvIsleHud(phone, mono, fell); },
  b3(grp) { fv3Build(grp); },
  f3(dt) { fv3Isle(dt); },
  exit() { fvCloseAll(); FV.digT = 0; },
});
const fvIdx = () => { const p = fbPlanNow(); return p ? p.i : -1; };
// a spade, with a hoard voyage in hand, on any island, empty-handed
function fvDigOk() { const c = fvCur(); return !!(c && c.k === 'hoard' && fvAble() && !fbCarrying() && !(RAID.st.away)); }
function fvDigPoint() { const m = FPS.me; return [m.x + Math.sin(m.h) * 0.9, m.y + Math.cos(m.h) * 0.9]; }
function fvHoleNear(x, y) { const L = FB.voy.holes[fvIdx()] || []; return L.some(h => Math.hypot(FPSC.CX + h[0] - x, FPSC.CY + h[1] - y) < FVC.HOLE); }
// (each of us, our own) holding Use at the spade: the dirt flies, and done, the host's told where
function fvDigMe(dt) {
  const S = RAID.st, o = ZM.near; if (S.fvPend > 0) S.fvPend -= dt;
  if (o && o.k === 'fvdig' && fvHold() && fvDigOk() && !(S.fvPend > 0)) {
    const at = fvDigPoint(); if (fvHoleNear(at[0], at[1])) { FV.digT = 0; return; }
    if (!FV.digT) { FV.digAt = at; fpsFeed('You dig…'); }
    FV.digT += dt;
    if (Math.floor(FV.digT * 2.6) !== Math.floor((FV.digT - dt) * 2.6)) { fv3Dirt(FV.digAt[0], FV.digAt[1], 5); try { if (!soundOff()) noise('lowpass', 700, 1, 0.005, 0.12, 0.18); } catch (e) {} }
    if (FV.digT >= FVC.DIG_T) { FV.digT = 0; S.fvPend = 0.8; raidAsk('dig', [fvR(FV.digAt[0] - FPSC.CX), fvR(FV.digAt[1] - FPSC.CY)]); }
  } else FV.digT = 0;
}
// (hosting or alone) a hole dug at (x, y) from the island's middle: the hoard if it's by the X, else little or nothing
function fvQDig(sid, a) {
  if (!Array.isArray(a)) return;
  const c = fvCur(), i = fvIdx(), F = fbiFb(), S = RAID.st; if (!c || c.k !== 'hoard' || i < 1 || !F) return;
  const R = FPSC.R - 2, x = clamp(+a[0] || 0, -R, R), y = clamp(+a[1] || 0, -R, R), H = FB.voy.holes[i] = FB.voy.holes[i] || [];
  if (H.some(h => Math.hypot(h[0] - x, h[1] - y) < FVC.HOLE * 0.8)) return;
  const j = c.is.indexOf(i), X = F.fvX;
  if (j >= 0 && !c.got[j] && X && Math.hypot(X[0] - x, X[1] - y) < FVC.DIG_R) {
    H.push([fvR(X[0]), fvR(X[1])]); if (H.length > 40) H.shift();
    c.got[j] = 1;
    const k = ['chest', 'chest', 'chest2', 'chest3'][c.t] || 'chest', q = fbLootAdd(k, FPSC.CX + X[0], FPSC.CY + X[1]);
    if (q) S.fvu = [q.id, FVC.UP_T];
    const left = c.got.filter(v => !v).length;
    fbIsleSay(`${fbNick(sid) === 'You' ? 'You strike' : fbNick(sid) + ' strikes'} wood: ${fbLootOf(k).n}, up out of the ground!${left ? ` ${left} ${left === 1 ? 'chart' : 'charts'} still to dig.` : ''}`, true);
    try { zmSound('open'); } catch (e) {}
    if (!left) fvDone();
    return;
  }
  H.push([fvR(x), fvR(y)]); if (H.length > 40) H.shift();
  if (Math.random() < FVC.TRINKET) { const tr = Object.keys(FB_LOOT).filter(t => FB_LOOT[t].trinket), k = fvPick(tr); fbLootAdd(k, FPSC.CX + x, FPSC.CY + y); fbIsleSay(`Nothing buried there but ${fbLootOf(k).n}.`); }
  else if (sid === FPS.me.id) fpsFeed(j >= 0 && !c.got[j] ? 'Nothing but sand and stones. Look at the chart again (M): the X is by its landmarks.' : 'Nothing here but sand and stones.');
  else fbIsleSay(`${fbNick(sid)} digs, and finds nothing.`);
}

// ---------- the camp ----------
const fvCampHere = () => { const c = fvCur(), i = fvIdx(), F = fbiFb(); return c && c.k === 'bounty' && c.is[0] === i && !c.got[0] && F && F.fvCamp ? c : null; };
// (hosting or alone) the camp wakes when you come near, its waves, then its captain
function fvCampTick(dt) {
  const c = fvCampHere(), S = RAID.st; if (!c) return;
  const [cx0, cy0] = fbiW(fbiFb().fvCamp), b = S.fvb;
  if (b[0] === 0) { if ((ZM.players || []).some(p => !(p.dead > 0) && Math.hypot(p.x - cx0, p.y - cy0) < FVC.WAKE)) { b[0] = 1; b[1] = 0; S.fvbT = 0.5; fbIsleSay(`The fire flares green: ${c.cap}’s crew is up.`, true); } return; }
  if (b[0] === 1) {
    const alive = ZM.z.filter(z => !z.dead && z.fvc).length;
    if (alive) return;
    S.fvbT -= dt; if (S.fvbT > 0) return;
    if (b[1] >= FVC.WAVES) { b[0] = 2; const z = fvBoss(c.bk, cx0 + 2, cy0 + 2, c); b[2] = z.zn; return; }
    b[1]++; S.fvbT = FVC.WAVE_GAP;
    const n = 2 + b[1] + 2 * fvN();
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, d = 3 + Math.random() * 6, x = cx0 + Math.cos(a) * d, y = cy0 + Math.sin(a) * d; if (zmBlockedAt(x, y, 0.5, 0)) continue; const z = raidSpawnAt(x, y, { kind: Math.random() < 0.15 ? 'run' : 'jog', hp: fbIsleHp() }); if (z) z.fvc = 1; }
    if (b[1] > 1) fbIsleSay(`Another wave of ${c.cap}’s crew (${b[1]} of ${FVC.WAVES}).`, true);
    return;
  }
  if (b[0] === 2 && !ZM.z.some(z => z.zn === b[2] && !z.dead)) fvCampDown(null);
}
function fvCampKill(d) { const S = RAID.st; if (fvHost() && d && d.boss && S.fvb && S.fvb[0] === 2 && d.zn === S.fvb[2]) fvCampDown(d); }
function fvCampDown(d) {
  const c = fvCampHere(), S = RAID.st; if (!c || S.fvb[0] === 3) return;
  S.fvb[0] = 3; c.got[0] = 1;
  const [cx0, cy0] = fbiW(fbiFb().fvCamp), R = FPSC.R - 6;
  let x = d ? d.x : cx0, y = d ? d.y : cy0; const r = Math.hypot(x - FPSC.CX, y - FPSC.CY); if (r > R) { x = FPSC.CX + (x - FPSC.CX) * R / r; y = FPSC.CY + (y - FPSC.CY) * R / r; }
  fbLootAdd('bell', x, y);
  fbIsleSay(`${c.cap} goes down into the sand for good. His bell lies where he fell: carry it home.`, true);
  fvDone();
}
// (hosting or alone) the drowned captain: one of the Lighthouse's bosses at a part of its strength, as Fog Run's Elite
function fvBoss(kind, x, y, c) {
  const T = ZBT[kind] || ZBT.diver, hp = zbHpOf(kind, RAIDC.ROUND + c.t * 2, fvN()) * FVC.K[c.t], zn = ++ZM.zc;
  const z = {
    drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss',
    x, y, jz: 0, fl: 0, hp, max: hp, sp: T.sp(ZM.round),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: Math.random() * 6.28, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: x, iy: y, ax: 0, ay: 0, lx: x, ly: y,
  };
  if (T.init) T.init(z);
  zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z;
  if (ZB.seen) ZB.seen.add(zn);
  fbIsleSay(`${c.cap} rises out of the fire: ${T.n}, drowned. Put him down.`, true);
  ZM.banner = { text: c.cap, t: 3.6, col: T.col, sub: `${T.N}, drowned captain · the Bellmen’s bounty` };
  try { T.sound('arrive'); } catch (e) {}
  return z;
}
function fvIsleHud(phone, mono, fell) {
  const S = RAID.st, c = fvCampHere(), b = S.fvb || [0];
  if (c && b[0] >= 1 && b[0] < 3) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = fell(phone ? 14 : 18); ctx.fillStyle = '#ffb090';
    ctx.fillText(b[0] === 1 ? `${c.cap}’s camp · wave ${Math.max(1, b[1])} of ${FVC.WAVES}` : `${c.cap} · put him down`, cx, H * (phone ? 0.2 : 0.16));
    ctx.textBaseline = 'alphabetic';
  }
  if (FV.digT > 0) fvRing(FV.digT / FVC.DIG_T, '#c8a060', 'DIGGING', mono);
}
function fvRing(k, col, lab, mono) {
  ctx.strokeStyle = 'rgba(8,10,14,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + clamp(k, 0, 1) * 6.283); ctx.stroke();
  if (lab) { ctx.font = mono(10); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,228,207,0.85)'; ctx.fillText(lab, cx, H / 2 + 46); }
}

// ---------- at sea: the wreck, the anchor, the dive; the chart table ----------
const fvWreckCur = () => { const c = fvCur(); return c && c.k === 'salvage' && (c.got[0] | 0) < FVC.CRATES ? c : null; };
const fvWreckD = () => { const c = fvWreckCur(), S = RAID.st, V = S && (S.V || S.B); return c && V ? Math.hypot(c.wx - V.x, c.wy - V.y) : 1e9; };
fbHook('sail', {
  enter() { Object.assign(RAID.st, { fvAn: 0, fvAt: null, fvPend: 0 }); FV.diving = false; FV.haul = 0; FV.breath = FVC.BREATH; FV.upT = 0; },
  tick(dt) {
    fvEnsure();
    const S = RAID.st, B = S.B;
    // held at her anchor: her way off, where she lies
    if (S.fvAn && B && S.fvAt) { B.x = S.fvAt[0]; B.y = S.fvAt[1]; B.v = 0; if (S.ph !== 'sail') S.fvAn = 0; }
    if (S.fvAn && !fvWreckCur()) fvWeigh();
  },
  me(dt) { fvMeAll(dt); fvDiveMe(dt); if (FV.upT > 0) FV.upT -= dt; },
  q(sid, k, a) {
    if (k !== 'dive') return null;
    const S = RAID.st, c = fvWreckCur();
    if (a === 'anchor' && c && !S.fvAn && S.B && S.ph === 'sail' && Math.hypot(c.wx - S.B.x, c.wy - S.B.y) < FVC.WRECK_R + 4) { S.fvAn = 1; S.fvAt = [S.B.x, S.B.y]; S.B.v = 0; if (S.helm) { S.helm = null; S.in = [0, 0]; } gwsSay(`${sid !== FPS.me.id ? fbNick(sid) + ' lets' : 'You let'} go the anchor over ${c.wn}. Dive from the port rail (hold Use) to haul up her cargo.`, true); }
    else if (a === 'weigh' && S.fvAn) fvWeigh(sid);
    else if (a === 'crate' && c && S.fvAn) { c.got[0] = (c.got[0] | 0) + 1; fbStowKind('crate', sid); S.fvUp = (S.fvUp | 0) + 1; if (sid !== FPS.me.id) FV.upT = 1.2; if (c.got[0] >= FVC.CRATES) { gwsSay(`That’s the last of ${c.wn}’s cargo. The anchor’s weighed.`, true); fvDone(); fvWeigh(); } }
    return true;
  },
  pack(o) { const S = RAID.st; o.fvs = [S.fvAn | 0, S.fvUp | 0]; },
  apply(o) { const S = RAID.st; if (Array.isArray(o.fvs)) { S.fvAn = o.fvs[0] | 0; if ((o.fvs[1] | 0) > (S.fvUpSeen | 0)) { if (S.fvUpSeen != null) FV.upT = 1.2; S.fvUpSeen = o.fvs[1] | 0; } } },
  consider(c) {
    const S = RAID.st, D = GWS.D; if (!S.B || S.ph !== 'sail') return;
    { const [x, y] = gwsW(FVC.TABLE[0], FVC.TABLE[1]); c({ k: 'fvtable' }, x, y, D, 1.6, false); }
    if (fvWreckCur() && (S.fvAn || fvWreckD() < FVC.WRECK_R)) { const [x, y] = gwsW(FVC.CAP[0], FVC.CAP[1]); c({ k: S.fvAn ? 'fvweigh' : 'fvanchor' }, x, y, D, 1.6, false); }
    if (S.fvAn && fvWreckCur()) { const [x, y] = gwsW(FVC.DIVE[0], FVC.DIVE[1]); c({ k: 'fvdive' }, x, y, D, 1.5, false); }
  },
  prompt(o) {
    const c = fvCur();
    if (o.k === 'fvtable') return { text: 'Look at the chart table: the whole sea', free: true };
    if (o.k === 'fvanchor') return { text: `Let go the anchor over ${c ? c.wn : 'the wreck'}`, free: true };
    if (o.k === 'fvweigh') return { text: 'Weigh anchor', free: true };
    if (o.k === 'fvdive') return RAID.st.fvPend > 0 ? { text: 'Hauling it up…' } : { text: `Hold to dive on ${c ? c.wn : 'the wreck'} and haul up a crate`, hold: true };
    return null;
  },
  use(o) {
    if (o.k === 'fvtable') { fvChartOpen('sea'); return true; }
    if (o.k === 'fvanchor') { if (FPS.helm) gwsLetGo(); raidAsk('dive', 'anchor'); return true; }
    if (o.k === 'fvweigh') { raidAsk('dive', 'weigh'); return true; }
    if (o.k === 'fvdive') return true;
    return null;
  },
  block(x, y, pad) { const [u, v] = gwsL(x, y), p = Math.min(pad || 0, 0.4); return Math.abs(u - FVC.TABLE[0]) < 0.55 + p && Math.abs(v - FVC.TABLE[1]) < 0.42 + p; },
  hud(phone, mono, fell) { fvHud(phone, mono); fvSeaHud(phone, mono, fell); },
  b3(grp) { fv3Sea(); },
  f3(dt) { fv3SeaF(dt); },
  exit() { fvCloseAll(); FV.diving = false; },
});
function fvWeigh(sid) { const S = RAID.st; if (!S.fvAn) return; S.fvAn = 0; S.fvAt = null; if (sid) gwsSay(`${sid !== FPS.me.id ? fbNick(sid) + ' weighs' : 'You weigh'} anchor.`); }
// (each of us, our own) the dive: hold Use at the rail, down the line, haul; the breath bar; the line snags
function fvDiveMe(dt) {
  const S = RAID.st, o = ZM.near; if (S.fvPend > 0) S.fvPend -= dt;
  const on = o && o.k === 'fvdive' && fvHold() && fvAble() && S.fvAn && fvWreckCur() && !(S.fvPend > 0);
  FV.diving = !!on;
  if (on) {
    if (FV.snag > 0) { FV.snag -= dt; FV.haul = Math.max(0, FV.haul - dt * 0.5); FV.breath -= dt * 2; }
    else { FV.haul += dt / FVC.HAUL; FV.breath -= dt; FV.snagT -= dt; if (FV.snagT <= 0) { FV.snag = FVC.SNAG; FV.snagT = 1.1 + Math.random() * 1.6; try { if (!soundOff()) tone(140, 'sawtooth', 0.01, 0.2, 0.06, { to: 90 }); } catch (e) {} } }
    if (FV.haul >= 1) { FV.haul = 0; FV.snagT = 1 + Math.random() * 1.5; S.fvPend = 1.1; FV.upT = 1.2; raidAsk('dive', 'crate'); fpsFeed('Up she comes: a cargo crate over the rail, and into the hold.'); try { zmSound('open'); } catch (e) {} }
    else if (FV.breath <= 0) { FV.haul = 0; FV.breath = FVC.BREATH; FV.snag = 0; S.fvPend = 1.5; try { fpsHurt(1, null, null); } catch (e) {} fpsFeed('Your breath gave out: up the line, gasping. Let go while the line’s snagged.'); }
  } else {
    // (the line's snag frees itself while you're not pulling on it)
    if (FV.snag > 0) FV.snag = Math.max(0, FV.snag - dt * 2);
    FV.breath = Math.min(FVC.BREATH, FV.breath + dt * 2.5);
    if (!(o && o.k === 'fvdive')) FV.haul = Math.max(0, FV.haul - dt * 0.15);
  }
}
function fvSeaHud(phone, mono, fell) {
  const S = RAID.st, c = fvCur(), V = S.V || S.B; if (!V) return;
  // where the voyage's mark is from here
  const t = fvTarget();
  if (t && S.ph === 'sail') {
    const d = Math.max(0, Math.round(Math.hypot(t.x - V.x, t.y - V.y) - (t.r || 0)));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(255,216,138,0.85)';
    const line = S.fvAn ? `ANCHORED OVER ${c.wn.toUpperCase()} · DIVE FROM THE PORT RAIL · ${c.got[0] | 0} OF ${FVC.CRATES} CRATES`
      : `${t.lab.toUpperCase()} · ${d.toLocaleString('en')} M ${fbsSide(V, t.x, t.y).toUpperCase()}${t.wreck && d < FVC.WRECK_R ? ' · LET GO THE ANCHOR AT THE CAPSTAN' : ''}`;
    ctx.fillText(line, cx, phone ? 100 : 142, W - 40); ctx.textBaseline = 'alphabetic';
  }
  if (FV.diving || FV.haul > 0.01 && ZM.near && ZM.near.k === 'fvdive') {
    // under the water: the green dark closes in, bubbles, the haul and your breath
    if (FV.diving) { const g0 = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.15, cx, H / 2, Math.max(W, H) * 0.7); g0.addColorStop(0, 'rgba(10,40,50,0.35)'); g0.addColorStop(1, 'rgba(2,14,20,0.92)'); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(200,230,240,0.35)'; for (let k = 0; k < 14; k++) { const ph = (g.t * (0.4 + (k % 5) * 0.12) + k * 0.37) % 1; ctx.beginPath(); ctx.arc(cx + Math.sin(k * 7.1) * W * 0.3 + Math.sin(g.t * 2 + k) * 6, H * (1 - ph), 2 + (k % 3), 0, 6.283); ctx.fill(); } }
    const w = Math.min(260, W * 0.5), x = cx - w / 2, y = H / 2 - 110;
    ctx.fillStyle = 'rgba(8,10,14,0.6)'; ctx.fillRect(x - 4, y - 4, w + 8, 36);
    ctx.fillStyle = FV.snag > 0 ? '#e06a50' : '#c8a060'; ctx.fillRect(x, y, w * clamp(FV.haul, 0, 1), 10);
    ctx.fillStyle = FV.breath < 2.5 ? '#e06a50' : '#9ad0e8'; ctx.fillRect(x, y + 18, w * clamp(FV.breath / FVC.BREATH, 0, 1), 6);
    ctx.font = mono(10); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(236,228,207,0.85)'; ctx.fillText('HAUL', x, y + 44); ctx.textAlign = 'right'; ctx.fillText('BREATH', x + w, y + 44);
    if (FV.snag > 0) { ctx.textAlign = 'center'; ctx.font = fell(phone ? 18 : 24); ctx.fillStyle = '#ff9a7a'; ctx.fillText('The line’s snagged: let go!', cx, y + 76); }
  }
}
// the voyage's next mark at sea: { x, y, r, lab, wreck }
function fvTarget() {
  const c = fvCur(); if (!c) return null;
  if (c.k === 'salvage') return (c.got[0] | 0) < FVC.CRATES ? { x: c.wx, y: c.wy, r: 0, lab: c.wn, wreck: true } : null;
  const j = c.got.findIndex(v => !v); if (j < 0) return null;
  const I = FB_ISLES[c.is[j]]; return { x: I.x, y: I.y, r: I.r, lab: (c.k === 'hoard' ? 'Hoard chart: ' : 'Bounty: ') + I.n };
}

// ---------- every stage: the charts in your coat (M), the HUD's voyage ----------
function fvMeAll(dt) {
  if (!FB.on) return;
  // a controller: hold View for the charts (a tap is still the scores)
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
  if (pad && !FV.open && !FPS.menu) { const v = !!(pad.buttons[8] && pad.buttons[8].pressed); FV.viewT = v ? FV.viewT + dt : 0; if (FV.viewT >= FVC.PAD_HOLD && FV.viewT - dt < FVC.PAD_HOLD) { FPS.board = false; fvChartOpen('voy'); } }
  fvPhoneBtn();
}
function fvHud(phone, mono) {
  const c = fvCur(); if (ZM.over) return;
  const R = W - Math.max(14, FPS.safeRight || 0), y = (phone ? Math.max(10, FPS.safeTop || 0) + 70 : 118) + (phone ? 34 : FB.hold.length ? 56 : 44);
  ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11);
  ctx.fillStyle = c ? FV_CO[c.co].col : 'rgba(236,228,207,0.45)';
  ctx.fillText(c ? `VOYAGE · ${fvWhat(c, true).toUpperCase()}` : 'NO VOYAGE · THE BOARD AT SALTCOTE', R, y);
  if (c && !phone) { ctx.fillStyle = 'rgba(236,228,207,0.5)'; ctx.fillText(FPS.padLast ? 'HOLD VIEW: THE CHARTS' : 'M: THE CHARTS', R, y + 15); }
  ctx.textBaseline = 'alphabetic';
}
// a phone: a chart button among the round buttons at the top, while there's a voyage
function fvPhoneBtn() {
  const tb = document.querySelector('#fpsPad .fpstop'); if (!tb) return;
  let b = $('fvPadChart');
  if (!b) {
    b = document.createElement('button'); b.className = 'fpsico'; b.id = 'fvPadChart'; b.type = 'button'; b.setAttribute('aria-label', 'The voyage’s charts');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/></svg>';
    b.addEventListener('click', e => { e.stopPropagation(); if (FV.open) fvCloseAll(); else fvChartOpen('voy'); });
    tb.append(b);
  }
  const want = FB.on && RAID.on && !!fvCur();
  if (b.hidden === want) b.hidden = !want;
}

// =====================================================================================================================
// the board, and the charts, on screen
// =====================================================================================================================
function fvStyle() {
  if ($('fvStyle')) return;
  const s = document.createElement('style'); s.id = 'fvStyle';
  s.textContent = `
.fvov { background: rgba(6, 9, 13, 0.55); }
.fvov .card { max-width: 60rem; width: min(60rem, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow-y: auto; gap: 10px; }
.fvov h1 { color: #e8d6a0; margin: 0 0 2px; font-size: clamp(1.9rem, 5vw, 2.8rem); }
.fvtop { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.fvnotes { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 14px; padding: 14px; border-radius: 6px; background: #3a2c1e; box-shadow: inset 0 0 0 6px #2a2016, inset 0 0 30px rgba(0,0,0,0.5); }
.fvnote { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 5px; text-align: left; padding: 16px 14px 12px; border: 0; border-radius: 2px; cursor: pointer; font: inherit; color: #2e2214; min-height: 44px;
  background: linear-gradient(180deg, #e6d8b4, #d4c298); box-shadow: 0 3px 8px rgba(0,0,0,0.45); transform: rotate(var(--rot, 0deg)); transition: transform .12s ease; }
.fvnote::before { content: ''; position: absolute; top: 6px; left: 50%; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: #8a2a1a; box-shadow: 0 1px 2px rgba(0,0,0,0.6); }
.fvnote:hover:not(:disabled), .fvnote:focus-visible { transform: rotate(0deg) scale(1.03); outline: 3px solid #ffd890; outline-offset: 2px; }
.fvnote:disabled { cursor: default; filter: saturate(0.4) brightness(0.75); }
.fvnote.taken { outline: 3px solid var(--co); }
.fvnote .co { display: flex; align-items: center; gap: 6px; font: 600 11px "Courier Prime", monospace; letter-spacing: 0.08em; text-transform: uppercase; color: var(--co); filter: brightness(0.6); }
.fvnote .co svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.fvnote .nm { font-family: "IM Fell English SC", serif; font-size: 23px; line-height: 1.05; }
.fvnote .tg { font-size: 14px; line-height: 1.3; }
.fvnote .pay { font: 600 12px "Courier Prime", monospace; letter-spacing: 0.04em; color: #5a3a14; }
.fvnote .key { position: absolute; top: 8px; right: 10px; font: 600 11px "Courier Prime", monospace; opacity: 0.55; }
.fvcur { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; border: 1px solid rgba(232,214,160,0.3); border-radius: 8px; background: rgba(232,214,160,0.06); }
.fvcur p { margin: 0; } .fvcur b { color: #e8d6a0; }
.fvstand { display: flex; flex-wrap: wrap; gap: 8px 18px; font: 600 12px "Courier Prime", monospace; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(236,228,207,0.75); }
.fvstand span b { color: var(--co); }
.fvhint { font-size: 13px; margin: 0; }
.fvchwrap { position: relative; }
#fvChart h1 { font-size: clamp(1.3rem, 3vw, 1.8rem); }
#fvChart .card { gap: 6px; padding-top: 16px; padding-bottom: 12px; }
.fvov canvas { width: auto; height: auto; max-width: 100%; max-height: calc(100vh - 205px); display: block; margin: 0 auto; border-radius: 4px; box-shadow: 0 6px 20px rgba(0,0,0,0.5); }
.fvchnav { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.fvchnav button { min-width: 44px; min-height: 40px; }
.fvchnav span { font: 600 12px "Courier Prime", monospace; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(236,228,207,0.8); }
.fvchtabs { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.fvchtabs button { font: 600 12px "Courier Prime", monospace; padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(232,214,160,0.35); background: rgba(232,214,160,0.06); color: #ece4cf; cursor: pointer; min-height: 36px; }
.fvchtabs button.on, .fvchtabs button:focus-visible { border-color: #ffd890; background: rgba(255,216,144,0.2); outline: none; }
@media (max-width: 720px), (max-height: 520px) {
  .fvov .card { padding: 12px; }
  .fvnotes { grid-template-columns: 1fr; padding: 10px; gap: 10px; }
  .fvnote { padding: 12px 12px 10px; } .fvnote .nm { font-size: 19px; } .fvnote .tg { font-size: 13px; }
  .fvov canvas { max-height: calc(100vh - 190px); }
}`;
  document.head.append(s);
}
const FV_ICON = {
  gilt: '<path d="M3 13c3-3 6-3 9 0 3-3 6-3 9 0"/><path d="M8 19h8l1-5H7z"/><circle cx="12" cy="7" r="2.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  tide: '<path d="M12 3v15M8 7h8M5 13a7 7 0 0 0 14 0"/><path d="M3 21c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>',
};
function fvOverlay(id, inner) {
  fvStyle();
  let o = $(id); if (o) return o;
  o = document.createElement('div'); o.className = 'overlay pausecard fvov'; o.id = id; o.hidden = true;
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', id + 'Head');
  o.innerHTML = `<div class="card">${inner}</div>`; document.body.append(o);
  return o;
}
function fvShow(kind) {
  FV.open = kind; FPS.menu = true; FV.padWas = null; FV.padCur = 0;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
  const id = FV.loopId = (FV.loopId | 0) + 1, loop = () => { if (!FV.open || FV.loopId !== id) return; fvLoop(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
function fvCloseAll(relock) {
  const was = FV.open; FV.open = '';
  for (const id of ['fvBoard', 'fvChart']) { const o = $(id); if (o) o.hidden = true; }
  if (was) { FPS.menu = false; if (FPS.me) FPS.me.protect = Math.max(FPS.me.protect || 0, 1); if (relock === true && FPS.on && !FPS.touch) try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
}
function fvLoop() {
  if (!FPS.on || !FB.on || !RAID.on || ZM.over) { fvCloseAll(); return; }
  if (!FPS.menu) FPS.menu = true;
  if (FPS.me) FPS.me.protect = Math.max(FPS.me.protect || 0, 0.5);
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null; if (!pad) return;
  const now = pad.buttons.map(x => !!(x && x.pressed)), was = FV.padWas, ax = pad.axes[0] || 0;
  FV.padWas = now; now.dir = ax > 0.6 ? 1 : ax < -0.6 ? -1 : 0; if (!was) return;
  const dn = i => now[i] && !was[i], d = dn(15) || (now.dir === 1 && was.dir !== 1) ? 1 : dn(14) || (now.dir === -1 && was.dir !== -1) ? -1 : 0;
  if (dn(1) || dn(9)) { fvCloseAll(); return; }
  if (FV.open === 'chart') { if (d) fvPage(FV.page + d); return; }
  const bs = [...document.querySelectorAll('#fvBoard button:not(:disabled):not(.closebtn)')]; if (!bs.length) return;
  if (d) { FV.padCur = (FV.padCur + d + bs.length) % bs.length; bs[FV.padCur].focus(); }
  if (dn(0)) { const b = bs[clamp(FV.padCur, 0, bs.length - 1)]; if (b) b.click(); }
}
// (src/fps.js keydown, first of all) the keys while the board or a chart is open, and M for the charts
function fvKey(e) {
  if (!(typeof FB !== 'undefined' && FB.on && RAID.on)) return false;
  if (!FV.open) {
    if (e.code === 'KeyM' && !FPS.menu && !e.repeat) { e.preventDefault(); fvChartOpen('voy'); return true; }
    return false;
  }
  if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'KeyF' || (e.code === 'KeyM' && FV.open === 'chart')) { e.preventDefault(); if (!e.repeat) fvCloseAll(true); return true; }
  if (FV.open === 'chart') { if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); fvPage(FV.page - 1); } else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); fvPage(FV.page + 1); } else { const m = /^(Digit|Numpad)([1-9])$/.exec(e.code); if (m) fvPage(+m[2] - 1); } return true; }
  const m = /^(Digit|Numpad)([1-3])$/.exec(e.code);
  if (m) { e.preventDefault(); const b = document.querySelectorAll('#fvNotes .fvnote')[+m[2] - 1]; if (b && !b.disabled) b.click(); return true; }
  if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) return false;
  return true;
}

// ---------- the board ----------
function fvBoardOpen() {
  if (!FB.on) return;
  const o = fvOverlay('fvBoard', `<div class="fvtop"><div><p class="eyebrow">Saltcote · the voyage board</p><h1 id="fvBoardHead">Voyages</h1></div><button class="tool closebtn" id="fvBoardX" type="button" aria-label="Step away from the board">✕</button></div>`
    + `<p class="muted" id="fvBoardSub"></p><div class="fvnotes" id="fvNotes"></div><div class="fvcur" id="fvCurBox"></div><div class="fvstand" id="fvStand"></div><p class="muted fvhint" id="fvBoardHint"></p>`);
  if (!o.dataset.wired) { o.dataset.wired = 1; $('fvBoardX').addEventListener('click', () => fvCloseAll(true)); }
  fvEnsure(); o.hidden = false; fvShow('board'); fvPaint();
  setTimeout(() => { const b = o.querySelector('.fvnote:not(:disabled)') || o.querySelector('#fvCurBox button'); if (b && !FPS.touch) b.focus({ preventScroll: true }); }, 30);
}
function fvPaint() {
  if (FV.open === 'chart') fvChartPaint();
  FV.texKey = '';
  const o = $('fvBoard'); if (!o || o.hidden) return;
  const V = FB.voy, c = V.cur;
  $('fvBoardSub').textContent = c ? 'One voyage at a time. Finish the one in hand, or give it up here, and fresh notices go up.' : `Each company pins a notice. Take one${ZM.net ? ' for the whole crew' : ''}: it pays on top of what the loot fetches.`;
  const box = $('fvNotes'); box.textContent = '';
  if (!V.offers.length) box.innerHTML = '<p class="muted">The board is bare. The host pins the notices.</p>';
  V.offers.forEach((n, i) => {
    const C = FV_CO[n.co], b = document.createElement('button'); b.type = 'button'; b.className = 'fvnote'; b.disabled = !!c;
    b.style.setProperty('--co', C.col); b.style.setProperty('--rot', [-1.6, 1.1, -0.6][i] + 'deg');
    b.innerHTML = `<span class="co"><svg viewBox="0 0 24 24" aria-hidden="true">${FV_ICON[n.co]}</svg>${fvEsc(C.N)}</span><span class="nm">${fvEsc(fvTitle(n))}</span>`
      + `<span class="tg">${fvEsc(fvWhat(n))}</span><span class="tg"><i>${fvEsc(FV_TIER[n.t][0].toUpperCase() + FV_TIER[n.t].slice(1))}</i></span>`
      + `<span class="pay">PAYS ${fvEsc(fbSov(n.rw).toUpperCase())} · STANDING +1</span>${FPS.touch ? '' : `<span class="key">${i + 1}</span>`}`;
    b.addEventListener('click', () => { if (FB.voy.cur) return; raidAsk('voyage', ['pick', FB.voy.board, i]); try { if (!soundOff()) tone(520, 'triangle', 0.01, 0.12, 0.06, { to: 780 }); } catch (e) {} setTimeout(() => { fvPaint(); }, 120); });
    box.append(b);
  });
  const cb = $('fvCurBox');
  if (c) {
    cb.hidden = false;
    cb.innerHTML = `<p><b>In hand:</b> ${fvEsc(fvTitle(c))} for ${fvEsc(FV_CO[c.co].n)} · ${fvEsc(fvWhat(c, true))} · ${fvEsc(fbSov(c.rw))}</p><span><button type="button" class="secondary" id="fvCharts">The charts</button> <button type="button" class="secondary" id="fvQuit">Give it up</button></span>`;
    $('fvQuit').addEventListener('click', () => { raidAsk('voyage', ['quit']); setTimeout(fvPaint, 120); });
    $('fvCharts').addEventListener('click', () => { fvCloseAll(); fvChartOpen('voy'); });
  } else cb.hidden = true;
  $('fvStand').innerHTML = Object.keys(FV_CO).map(k => `<span style="--co:${FV_CO[k].col}">${fvEsc(FV_CO[k].N)}: <b>${V.stand[k] | 0}</b></span>`).join('') + `<span>Voyages done: <b style="color:#ffd890">${V.n | 0}</b></span>`;
  $('fvBoardHint').textContent = FPS.touch ? 'Tap a notice to take it; ✕ to step away.' : FPS.padLast ? 'D-pad to choose, A to take, B to step away.' : 'Keys 1 to 3 or a click to take a notice · Esc to step away.';
}

// ---------- the charts ----------
// mode 'voy': the voyage's own charts; 'sea': the chart table, the whole sea first
function fvChartOpen(mode) {
  if (!FB.on) return;
  const o = fvOverlay('fvChart', `<div class="fvtop"><div><p class="eyebrow" id="fvChEye"></p><h1 id="fvChartHead"></h1></div><button class="tool closebtn" id="fvChX" type="button" aria-label="Put the chart away">✕</button></div>`
    + `<div class="fvchtabs" id="fvChTabs"></div><div class="fvchwrap"><canvas id="fvChCv" width="900" height="640" role="img" aria-label="A chart"></canvas></div>`
    + `<div class="fvchnav"><button type="button" class="secondary" id="fvChPrev" aria-label="The chart before">‹</button><span id="fvChPage"></span><button type="button" class="secondary" id="fvChNext" aria-label="The next chart">›</button></div><p class="muted fvhint" id="fvChHint"></p>`);
  if (!o.dataset.wired) { o.dataset.wired = 1; $('fvChX').addEventListener('click', () => fvCloseAll(true)); $('fvChPrev').addEventListener('click', () => fvPage(FV.page - 1)); $('fvChNext').addEventListener('click', () => fvPage(FV.page + 1)); }
  FV.mode = mode; FV.page = 0; o.hidden = false; fvShow('chart'); fvChartPaint();
}
function fvPages() {
  const c = fvCur(), P = [];
  if (FV.mode === 'sea') P.push({ k: 'sea', n: 'The Wide Water' });
  if (c) { if (c.k === 'salvage') P.push({ k: 'wreck', n: c.wn }); else c.is.forEach((i, j) => P.push({ k: c.k, i, j, n: FB_ISLES[i].n })); }
  return P;
}
function fvPage(n) { const P = fvPages(); if (!P.length) return; FV.page = (n + P.length) % P.length; fvChartPaint(); }
function fvChartPaint() {
  const o = $('fvChart'); if (!o || o.hidden) return;
  const P = fvPages(), c = fvCur(), cvs = $('fvChCv'); FV.page = clamp(FV.page, 0, Math.max(0, P.length - 1));
  const pg = P[FV.page];
  $('fvChEye').textContent = FV.mode === 'sea' ? 'The cutter · the chart table' : c ? `${FV_CO[c.co].N} · ${fvTitle(c).toLowerCase()} · ${FV_TIER[c.t]}` : 'Your charts';
  $('fvChartHead').textContent = pg ? (pg.k === 'sea' ? 'The Wide Water' : pg.n) : 'No charts';
  const tabs = $('fvChTabs'); tabs.innerHTML = '';
  if (P.length > 1) P.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = i === FV.page ? 'on' : ''; b.textContent = `${i + 1}. ${p.n}${(p.k === 'hoard' || p.k === 'bounty') && c && c.got[p.j] ? ' ✓' : ''}`; b.addEventListener('click', () => fvPage(i)); tabs.append(b); });
  $('fvChPrev').hidden = $('fvChNext').hidden = P.length < 2; $('fvChPage').textContent = P.length > 1 ? `${FV.page + 1} of ${P.length}` : '';
  if (!pg) { fvDrawEmpty(cvs); }
  else if (pg.k === 'sea') fvDrawSea(cvs);
  else if (pg.k === 'wreck') fvDrawWreck(cvs, c);
  else fvDrawIsle(cvs, pg.i, c, pg.j);
  $('fvChHint').textContent = (pg && pg.k === 'hoard' ? 'Find the landmarks, pace it out from the nearest, and hold Use with the spade on the X. ' : '')
    + (FPS.touch ? 'Tap ✕ to put it away.' : FPS.padLast ? 'D-pad left and right for the next chart, B to put it away.' : 'Arrows for the next chart · Esc or M to put it away.');
}

// ---------- drawing a chart, by hand ----------
const FV_INK = '#3a2614', FV_RED = '#8e2a18';
function fvParch(x, W, H, seed) {
  const R = seeded(seed >>> 0);
  const g0 = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
  g0.addColorStop(0, '#e8d8b0'); g0.addColorStop(0.7, '#d6c08e'); g0.addColorStop(1, '#a8885a');
  x.fillStyle = g0; x.fillRect(0, 0, W, H);
  // stains, foxing and the grain of it
  for (let k = 0; k < 16; k++) { const r = 20 + R() * 90; const s = x.createRadialGradient(0, 0, 0, 0, 0, r); s.addColorStop(0, 'rgba(120,84,40,0.13)'); s.addColorStop(1, 'rgba(120,84,40,0)'); x.save(); x.translate(R() * W, R() * H); x.fillStyle = s; x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.fill(); x.restore(); }
  x.fillStyle = 'rgba(90,60,30,0.08)'; for (let k = 0; k < 900; k++) x.fillRect(R() * W, R() * H, 1 + R() * 2, 1);
  // a ragged, darkened edge
  x.strokeStyle = 'rgba(70,44,20,0.55)'; x.lineWidth = 10; x.beginPath();
  for (let k = 0; k <= 80; k++) { const t = k / 80, [px, py] = t < 0.25 ? [t * 4 * W, 0] : t < 0.5 ? [W, (t - 0.25) * 4 * H] : t < 0.75 ? [W - (t - 0.5) * 4 * W, H] : [0, H - (t - 0.75) * 4 * H]; const j = R() * 6; k ? x.lineTo(px + (px < 1 ? j : px > W - 1 ? -j : 0), py + (py < 1 ? j : py > H - 1 ? -j : 0)) : x.moveTo(px + j, py + j); }
  x.stroke();
  x.strokeStyle = 'rgba(58,38,20,0.6)'; x.lineWidth = 1.5; x.strokeRect(22, 22, W - 44, H - 44); x.strokeRect(27, 27, W - 54, H - 54);
}
// an inked line through points, shaky as a hand's
function fvInk(x, pts, R, close, w, col) {
  for (let pass = 0; pass < 2; pass++) {
    x.strokeStyle = col || FV_INK; x.lineWidth = (w || 2) * (pass ? 0.55 : 1); x.globalAlpha = pass ? 0.55 : 0.9; x.beginPath();
    pts.forEach((p, k) => { const jx = (R() - 0.5) * 1.6, jy = (R() - 0.5) * 1.6; k ? x.lineTo(p[0] + jx, p[1] + jy) : x.moveTo(p[0] + jx, p[1] + jy); });
    if (close) x.closePath(); x.stroke();
  }
  x.globalAlpha = 1;
}
function fvRose(x, px, py, r) {
  x.save(); x.translate(px, py); x.strokeStyle = FV_INK; x.fillStyle = FV_INK; x.lineWidth = 1.2;
  x.beginPath(); x.arc(0, 0, r * 0.62, 0, 6.283); x.stroke(); x.beginPath(); x.arc(0, 0, r * 0.7, 0, 6.283); x.stroke();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, L = k % 2 ? r * 0.55 : r; x.beginPath(); x.moveTo(Math.sin(a) * L, -Math.cos(a) * L); x.lineTo(Math.sin(a + 0.35) * r * 0.16, -Math.cos(a + 0.35) * r * 0.16); x.lineTo(Math.sin(a - 0.35) * r * 0.16, -Math.cos(a - 0.35) * r * 0.16); x.closePath(); k === 0 ? x.fill() : x.stroke(); }
  x.font = `400 ${Math.round(r * 0.42)}px "IM Fell English SC", serif`; x.textAlign = 'center'; x.textBaseline = 'bottom'; x.fillText('N', 0, -r - 2);
  x.restore();
}
function fvTitleOn(x, W, t, sub) {
  x.fillStyle = FV_INK; x.textAlign = 'center'; x.textBaseline = 'top';
  x.font = '400 38px "IM Fell English SC", serif'; x.fillText(t, W / 2, 40);
  if (sub) { x.font = 'italic 400 17px "IM Fell English", "IM Fell English SC", serif'; x.globalAlpha = 0.8; x.fillText(sub, W / 2, 82); x.globalAlpha = 1; }
}
// a landmark, small, in ink
function fvGlyph(x, k, px, py, s) {
  x.save(); x.translate(px, py); x.scale(s, s); x.strokeStyle = FV_INK; x.fillStyle = FV_INK; x.lineWidth = 1.4; x.lineCap = 'round';
  const L = (a, b, c, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
  if (k === 'tree') { L(0, 6, 0, -10); L(0, -4, -6, -10); L(0, -7, 5, -12); L(-3, -7, -7, -6); L(0, 0, 6, -5); }
  else if (k === 'stone') { x.beginPath(); x.moveTo(-4, 6); x.lineTo(-3, -9); x.lineTo(3, -10); x.lineTo(4, 6); x.closePath(); x.stroke(); L(-6, 6, 6, 6); }
  else if (k === 'cairn') { for (const [u, v, r] of [[-4, 3, 3.4], [3, 3, 3.4], [0, -2.5, 3], [0, -7.5, 2.2]]) { x.beginPath(); x.ellipse(u, v, r, r * 0.75, 0, 0, 6.283); x.stroke(); } }
  else if (k === 'anchor') { L(0, -9, 0, 7); L(-4, -5, 4, -5); x.beginPath(); x.arc(0, -10.5, 1.8, 0, 6.283); x.stroke(); x.beginPath(); x.arc(0, 1, 7, 0.3, Math.PI - 0.3); x.stroke(); }
  else if (k === 'cannon') { x.beginPath(); x.moveTo(-9, -2); x.lineTo(8, -4); x.lineTo(8, 1); x.lineTo(-9, 2); x.closePath(); x.stroke(); x.beginPath(); x.arc(-3, 4, 3, 0, 6.283); x.stroke(); }
  else if (k === 'cross') { L(0, 7, 0, -10); L(-5, -5, 5, -5); x.beginPath(); x.arc(0, -5, 3, 0, 6.283); x.stroke(); }
  else if (k === 'tent') { x.beginPath(); x.moveTo(-8, 5); x.lineTo(0, -7); x.lineTo(8, 5); x.closePath(); x.stroke(); L(0, -7, 0, 5); }
  else if (k === 'flag') { L(-4, 7, -4, -10); x.beginPath(); x.moveTo(-4, -10); x.lineTo(7, -8); x.lineTo(4, -5); x.lineTo(7, -2); x.lineTo(-4, -3); x.closePath(); x.fill(); }
  else if (k === 'fire') { x.beginPath(); x.moveTo(0, -8); x.quadraticCurveTo(6, -1, 0, 5); x.quadraticCurveTo(-6, -1, 0, -8); x.stroke(); L(-6, 6, 6, 4); L(-6, 4, 6, 6); }
  else if (k === 'mast') { L(0, 6, 2, -14); L(-5, -8, 7, -10); x.beginPath(); x.moveTo(2, -8); x.lineTo(7, -6); x.lineTo(3, -2); x.stroke(); for (let w = -1; w <= 1; w++) { x.beginPath(); x.arc(w * 8, 8, 4, Math.PI, 0); x.stroke(); } }
  else if (k === 'boat') { x.beginPath(); x.moveTo(-7, 0); x.quadraticCurveTo(0, 7, 7, 0); x.closePath(); x.stroke(); }
  x.restore();
}
function fvX(x, px, py, s, done) {
  x.save(); x.strokeStyle = FV_RED; x.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) { x.lineWidth = pass ? 2 : 4.5; x.globalAlpha = pass ? 0.5 : 0.92; x.beginPath(); x.moveTo(px - s, py - s); x.lineTo(px + s * 1.05, py + s * 0.95); x.moveTo(px + s, py - s * 1.05); x.lineTo(px - s * 0.95, py + s); x.stroke(); }
  if (done) { x.globalAlpha = 0.85; x.lineWidth = 2.5; x.beginPath(); x.arc(px, py, s * 2.1, 0, 6.283); x.stroke(); x.font = '400 18px "IM Fell English SC", serif'; x.fillStyle = FV_RED; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillText('Taken up', px, py + s * 2.4); }
  x.restore();
}
// sea round an island, in rings of ripples
function fvWaves(x, R, pts, cxp, cyp, rings) {
  for (let k = 1; k <= rings; k++) {
    x.setLineDash([6 + k * 2, 7 + k * 3]); x.globalAlpha = 0.45 - k * 0.08;
    fvInk(x, pts.map(([px, py]) => [cxp + (px - cxp) * (1 + k * 0.07), cyp + (py - cyp) * (1 + k * 0.07)]), R, true, 1.2);
  }
  x.setLineDash([]); x.globalAlpha = 1;
}
// an island's outline as its ground is drawn (src/fpsisle.js fpsIsleGround's edge), centred at (px, py), s px a metre
function fvCoast(i, px, py, s, R) {
  const IR = FB_ISLES[i].port ? FBI.PORT_R : FBI.R, pts = [];
  for (let k = 0; k < 120; k++) { const a = k / 120 * 6.2832, r = IR * (1 + 0.035 * Math.sin(a * 5 + 1) + 0.02 * Math.sin(a * 13)) * s; pts.push([px + Math.cos(a) * r, py - Math.sin(a) * r]); }
  return pts;
}
function fvDrawIsle(cvs, i, c, j) {
  const x = cvs.getContext('2d'), W = cvs.width, H = cvs.height, I = FB_ISLES[i], R = seeded((I.seed ^ 0xc4a7) >>> 0);
  fvParch(x, W, H, I.seed);
  const s = 5.2, ox = W / 2 - 40, oy = H / 2 + 34, pts = fvCoast(i, ox, oy, s, R);
  // the land: a wash of colour, the coast inked twice, the sea in ripples about it, a little hatching inland
  x.fillStyle = 'rgba(150,120,60,0.2)'; x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill();
  fvWaves(x, R, pts, ox, oy, 3); fvInk(x, pts, R, true, 2.6);
  x.save(); x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.clip();
  x.strokeStyle = 'rgba(58,38,20,0.18)'; x.lineWidth = 1; for (let k = 0; k < 70; k++) { const a = R() * 6.28, d = R() * FBI.R * s * 0.85, hx = ox + Math.cos(a) * d, hy = oy + Math.sin(a) * d; x.beginPath(); x.moveTo(hx - 4, hy + 2); x.lineTo(hx + 4, hy - 2); x.stroke(); }
  x.restore();
  const sp = fvIsleSpot(i), P = (u, v) => [ox + u * s, oy - v * s];
  // the landmarks, the camp, the X
  for (const L of sp.lm) { const [lx, ly] = P(L.x, L.y); fvGlyph(x, L.k, lx, ly, 2.1); x.font = 'italic 400 18px "IM Fell English", "IM Fell English SC", serif'; x.fillStyle = FV_INK; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillText(FV_LM[L.k].n, lx, ly + 18); }
  const got = c && j != null ? c.got[j] : 0;
  if (c && c.k === 'bounty') {
    const F = fvIdx() === i ? fbiFb() : null, cp = F && F.fvCamp ? F.fvCamp : [sp.x * -0.6, sp.y * -0.6], [kx, ky] = P(cp[0], cp[1]);
    for (let k = 0; k < 3; k++) fvGlyph(x, 'tent', kx + Math.cos(k * 2.1) * 26, ky + Math.sin(k * 2.1) * 26, 1.4);
    fvGlyph(x, 'fire', kx, ky, 1.4); fvGlyph(x, 'flag', kx + 34, ky - 30, 1.5);
    x.strokeStyle = FV_RED; x.lineWidth = 2; x.setLineDash([4, 4]); x.beginPath(); x.arc(kx, ky, 50, 0, 6.283); x.stroke(); x.setLineDash([]);
    x.fillStyle = FV_RED; x.font = 'italic 400 18px "IM Fell English", "IM Fell English SC", serif'; x.textAlign = 'center'; x.fillText(got ? 'His bell is taken' : `${c.cap}’s camp`, kx, ky + 58);
    x.textBaseline = 'alphabetic'; x.font = 'italic 400 15px "IM Fell English", "IM Fell English SC", serif'; x.fillStyle = FV_INK; x.textAlign = 'left';
    x.fillText(`${ZBT[c.bk] ? ZBT[c.bk].N : 'The Diver'} in his time. The Bellmen pay for his bell.`, 44, H - 44);
  } else {
    const [xx, xy] = P(sp.x, sp.y); fvX(x, xx, xy, 14, got);
    // the clue: from the nearest landmark, so many paces, which way
    let best = null; for (const L of sp.lm) { const d = Math.hypot(L.x - sp.x, L.y - sp.y); if (!best || d < best.d) best = { L, d }; }
    if (best) {
      const [lx, ly] = P(best.L.x, best.L.y); x.strokeStyle = FV_RED; x.lineWidth = 1.5; x.setLineDash([3, 5]); x.beginPath(); x.moveTo(lx, ly); x.lineTo(xx, xy); x.stroke(); x.setLineDash([]);
      x.textBaseline = 'alphabetic'; x.font = 'italic 400 19px "IM Fell English", "IM Fell English SC", serif'; x.fillStyle = FV_INK; x.textAlign = 'left';
      x.fillText(`From the ${FV_LM[best.L.k].n}, ${Math.max(3, Math.round(best.d / 0.76))} paces ${fvCompass(Math.atan2(sp.x - best.L.x, sp.y - best.L.y))}, and dig.`, 44, H - 44);
    }
  }
  fvRose(x, W - 104, 150, 46);
  // where she lies, off the island, if she's anchored by it
  const Sh = FB.ship; if (Sh && Math.hypot(Sh.x - I.x, Sh.y - I.y) < I.r + 120) { const a = Math.atan2(Sh.y - I.y, Sh.x - I.x), r = (FBI.R + 9) * s; const bx = clamp(ox + Math.cos(a) * r, 50, W - 50), by = clamp(oy - Math.sin(a) * r, 120, H - 70); fvGlyph(x, 'boat', bx, by, 1.6); x.font = 'italic 400 14px "IM Fell English", serif'; x.fillStyle = FV_INK; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillText('the cutter', bx, by + 9); }
  fvTitleOn(x, W, I.n, c ? `${FV_CO[c.co].N} · chart ${j + 1} of ${c.is.length}` : '');
  // a scale of paces
  x.strokeStyle = FV_INK; x.lineWidth = 2; const sx0 = W - 230, sy0 = H - 56; x.beginPath(); x.moveTo(sx0, sy0); x.lineTo(sx0 + 15.2 * s, sy0); x.stroke(); for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(sx0 + k * 3.8 * s, sy0 - (k % 2 ? 4 : 7)); x.lineTo(sx0 + k * 3.8 * s, sy0); x.stroke(); }
  x.font = 'italic 400 13px "IM Fell English", serif'; x.fillStyle = FV_INK; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText('twenty paces', sx0, sy0 + 5);
}
function fvDrawEmpty(cvs) {
  const x = cvs.getContext('2d'), W = cvs.width, H = cvs.height; fvParch(x, W, H, 0x51);
  fvTitleOn(x, W, 'No voyage in hand', 'The voyage board at Saltcote has notices: take one, and its charts are yours.');
  fvRose(x, W / 2, H / 2 + 40, 90);
}
// the sea's frame onto the canvas: FBS.SEA, north up
function fvSeaMap(W, H, pad) { const [x0, x1, y0, y1] = FBS.SEA, s = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2 - 60) / (y1 - y0)), ox = W / 2 - (x0 + x1) / 2 * s, oy = H / 2 + 30 + (y0 + y1) / 2 * s; return { s, P: (x, y) => [ox + x * s, oy - y * s] }; }
function fvDrawSea(cvs) {
  const x = cvs.getContext('2d'), W = cvs.width, H = cvs.height, R = seeded(0xfb5e1), { s, P } = fvSeaMap(W, H, 50), c = fvCur();
  fvParch(x, W, H, 0x5ea);
  // a faint grid of bearings, the rocks the charts know
  x.strokeStyle = 'rgba(58,38,20,0.12)'; x.lineWidth = 1; for (let gx = -1500; gx <= 1500; gx += 500) { const [a, b] = P(gx, 900), [, d] = P(gx, 3900); x.beginPath(); x.moveTo(a, b); x.lineTo(a, d); x.stroke(); } for (let gy = 1000; gy <= 3900; gy += 500) { const [a, b] = P(-1500, gy), [e] = P(1500, gy); x.beginPath(); x.moveTo(a, b); x.lineTo(e, b); x.stroke(); }
  x.fillStyle = 'rgba(58,38,20,0.45)'; for (const o of fbSea().rocks) { const [px, py] = P(o.x, o.y); x.font = '10px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+', px, py); }
  FB_ISLES.forEach((I, i) => {
    const [px, py] = P(I.x, I.y), pts = fvCoast(i, px, py, s * I.r / (I.port ? FBI.PORT_R : FBI.R), R);
    x.fillStyle = I.port ? 'rgba(150,110,50,0.35)' : 'rgba(150,120,60,0.22)'; x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill();
    fvWaves(x, R, pts, px, py, 1); fvInk(x, pts, R, true, 1.8);
    x.font = I.port ? '400 20px "IM Fell English SC", serif' : 'italic 400 14px "IM Fell English", "IM Fell English SC", serif'; x.fillStyle = FV_INK; x.textAlign = 'center'; x.textBaseline = 'top';
    x.fillText(I.n, px, py + I.r * s + 4);
    if (I.port) { x.font = 'italic 400 12px "IM Fell English", serif'; x.fillText('the outpost', px, py + I.r * s + 24); }
  });
  // the voyage's marks
  if (c) {
    if (c.k === 'salvage') { const [px, py] = P(c.wx, c.wy); fvGlyph(x, 'mast', px, py, 1.3); fvX(x, px, py + 14, 6, (c.got[0] | 0) >= FVC.CRATES); x.font = 'italic 400 14px "IM Fell English", serif'; x.fillStyle = FV_RED; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillText(c.wn, px, py + 24); }
    else c.is.forEach((i, j) => { const I = FB_ISLES[i], [px, py] = P(I.x, I.y); x.strokeStyle = FV_RED; x.lineWidth = 2.5; x.globalAlpha = c.got[j] ? 0.45 : 0.9; x.beginPath(); x.arc(px, py, I.r * s + 9, 0, 6.283); x.stroke(); x.globalAlpha = 1; if (c.k === 'hoard') fvX(x, px, py, 6, false); else fvGlyph(x, 'flag', px, py, 1.2); if (c.got[j]) { x.fillStyle = FV_RED; x.font = '400 14px "IM Fell English SC", serif'; x.textAlign = 'center'; x.textBaseline = 'bottom'; x.fillText('done', px, py - I.r * s - 10); } });
  }
  // the cutter, as she lies
  const S = RAID.st, V = (S && (S.V || S.B)) || FB.ship;
  if (V) { const [px, py] = P(V.x, V.y); x.save(); x.translate(px, py); x.rotate(V.h || 0); x.fillStyle = FV_RED; x.beginPath(); x.moveTo(0, -12); x.lineTo(6, 8); x.lineTo(0, 4); x.lineTo(-6, 8); x.closePath(); x.fill(); x.restore(); x.font = 'italic 400 13px "IM Fell English", serif'; x.fillStyle = FV_RED; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('the cutter', px + 11, py); }
  fvRose(x, W - 96, 150, 42);
  fvTitleOn(x, W, 'The Wide Water', c ? `${FV_CO[c.co].N}: ${fvWhat(c, true)}` : 'No voyage in hand: the board at Saltcote has notices');
  x.font = 'italic 400 13px "IM Fell English", serif'; x.fillStyle = FV_INK; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('+ rocks, as the charts know them', 44, H - 40);
}
function fvDrawWreck(cvs, c) {
  const x = cvs.getContext('2d'), W = cvs.width, H = cvs.height, R = seeded((c.wx * 31 + c.wy) >>> 0);
  fvParch(x, W, H, c.wx ^ c.wy);
  // a box of sea 1.4 km across round the wreck, north up, with whatever islands are in it
  const span = 1400, s = Math.min(W - 100, H - 180) / span, ox = W / 2 - c.wx * s, oy = H / 2 + 40 + c.wy * s, P = (u, v) => [ox + u * s, oy - v * s];
  x.save(); x.beginPath(); x.rect(30, 30, W - 60, H - 60); x.clip();
  for (const o of fbSea().rocks) { const [px, py] = P(o.x, o.y); if (px < 30 || px > W - 30 || py < 30 || py > H - 30) continue; x.fillStyle = 'rgba(58,38,20,0.55)'; x.font = '13px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+', px, py); }
  FB_ISLES.forEach((I, i) => { const [px, py] = P(I.x, I.y); if (Math.hypot(I.x - c.wx, I.y - c.wy) > span) return; const pts = fvCoast(i, px, py, s * I.r / (I.port ? FBI.PORT_R : FBI.R), R); x.fillStyle = 'rgba(150,120,60,0.22)'; x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); fvWaves(x, R, pts, px, py, 2); fvInk(x, pts, R, true, 2); x.font = 'italic 400 17px "IM Fell English", serif'; x.fillStyle = FV_INK; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillText(I.n, px, py + I.r * s + 6); });
  x.restore();
  const [wx, wy] = P(c.wx, c.wy), n = fbNearest(c.wx, c.wy), I = FB_ISLES[n.i], [ix, iy] = P(I.x, I.y);
  x.strokeStyle = FV_RED; x.lineWidth = 1.5; x.setLineDash([3, 6]); x.beginPath(); x.moveTo(ix, iy); x.lineTo(wx, wy); x.stroke(); x.setLineDash([]);
  x.strokeStyle = FV_INK; x.globalAlpha = 0.5; x.lineWidth = 1.2; x.beginPath(); x.arc(wx, wy, FVC.WRECK_R * s, 0, 6.283); x.stroke(); x.globalAlpha = 1;
  fvGlyph(x, 'mast', wx, wy - 6, 2.2); fvX(x, wx, wy + 22, 9, (c.got[0] | 0) >= FVC.CRATES);
  x.font = 'italic 400 19px "IM Fell English", "IM Fell English SC", serif'; x.fillStyle = FV_INK; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.fillText(`Sunk ${fvWreckWhere(c)}. Her mast stands out of the water. Anchor by it, and dive.`, 44, H - 44);
  fvRose(x, W - 96, 150, 42);
  fvTitleOn(x, W, c.wn[0].toUpperCase() + c.wn.slice(1), `The Tidewrights · ${c.got[0] | 0} of ${FVC.CRATES} crates brought up`);
}

// =====================================================================================================================
// in 3D
// =====================================================================================================================
const FV3 = { grp: null, holes: new Map(), dirt: [], spade: null, mats: null };
function fv3Reset() { FV3.grp = null; FV3.holes = new Map(); FV3.dirt = []; FV3.spade = null; }
function fv3Mats() { if (!FV3.mats) FV3.mats = { pit: new THREE.MeshLambertMaterial({ color: 0x1c1610 }), dirt: z3Lam('#6a543a'), wood: z3Lam('#5a4630'), iron: z3Lam('#6a6c70'), geo: new THREE.DodecahedronGeometry(0.07, 0) }; return FV3.mats; }
function fv3Build(grp) {
  fv3Reset(); FV3.grp = new THREE.Group(); grp.add(FV3.grp);
  const M = fv3Mats(), sp = new THREE.Group();
  const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), M.wood); hd.position.y = 0.5; sp.add(hd);
  const gr = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.035), M.wood); gr.position.y = 1.0; sp.add(gr);
  const bl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.025), M.iron); bl.position.y = -0.13; sp.add(bl);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.12, 4), M.iron); tip.rotation.set(Math.PI, Math.PI / 4, 0); tip.scale.set(1, 1, 0.15); tip.position.y = -0.33; sp.add(tip);
  sp.visible = false; FV3.grp.add(sp); FV3.spade = sp;
}
function fv3Dirt(x, y, n) {
  if (!FV3.grp) return; const M = fv3Mats(), z0 = fbiGround(x, y);
  for (let k = 0; k < n; k++) { const m = new THREE.Mesh(M.geo, M.dirt); m.position.copy(z3v(x, y, z0 + 0.05)); const a = Math.random() * 6.28, v = 1 + Math.random() * 1.5; FV3.grp.add(m); FV3.dirt.push({ m, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 2.5 + Math.random() * 2, t: 1.2 }); }
}
function fv3Isle(dt) {
  if (!FV3.grp) return;
  const M = fv3Mats(), L = FB.voy.holes[fvIdx()] || [], seen = new Set(), m = FPS.me;
  // the holes dug: a dark pit and its spoil heaped beside it
  for (const h of L) {
    const key = h[0] + ',' + h[1]; seen.add(key); if (FV3.holes.has(key)) continue;
    const x = FPSC.CX + h[0], y = FPSC.CY + h[1], z = fbiGround(x, y), g0 = new THREE.Group(); g0.position.copy(z3v(x, y, z + 0.02));
    const pit = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), M.pit); pit.rotation.x = -Math.PI / 2; g0.add(pit);
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, 6.283, 0, Math.PI / 2), M.dirt); sp.scale.set(1, 0.4, 0.8); sp.position.set(0.8, 0, 0.2); g0.add(sp);
    g0.rotation.y = (h[0] * 13.7 + h[1]) % 6.28; FV3.grp.add(g0); FV3.holes.set(key, g0);
    fv3Dirt(x, y, 12);
  }
  for (const [k, g0] of FV3.holes) if (!seen.has(k)) { FV3.grp.remove(g0); FV3.holes.delete(k); }
  // the clods in the air
  for (let i = FV3.dirt.length - 1; i >= 0; i--) { const d = FV3.dirt[i], p = d.m.position; d.t -= dt; d.vz -= 9 * dt; p.x += d.vx * dt; p.z -= d.vy * dt; p.y += d.vz * dt; const gz = fbiGround(p.x, -p.z) ; if (p.y < gz) { p.y = gz; d.vx *= 0.3; d.vy *= 0.3; d.vz = 0; } if (d.t <= 0) { FV3.grp.remove(d.m); FV3.dirt.splice(i, 1); } }
  // the spade, in my hands while I dig
  const sp = FV3.spade;
  if (sp) {
    sp.visible = FV.digT > 0;
    if (sp.visible) {
      const ph = FV.digT * 2.6 % 1, dip = Math.sin(ph * Math.PI) * 0.35, at = FV.digAt || fvDigPoint();
      if (fpsThird() || zmSpecOn()) { sp.position.copy(z3v(m.x + Math.sin(m.h) * 0.6, m.y + Math.cos(m.h) * 0.6, fbiGround(m.x, m.y) + 0.35 - dip)); sp.rotation.set(0, -m.h, 0.5); }
      else { const ez = FPSC.GROUND + FPSC.EYE + (m.jz || 0) - (FPS.crouchEye || 0), f = 0.85 + dip * 0.3, r = 0.22; sp.position.copy(z3v(m.x + Math.sin(m.h) * f + Math.cos(m.h) * r, m.y + Math.cos(m.h) * f - Math.sin(m.h) * r, ez - 1.05 - dip * 0.9)); sp.rotation.set(0, -m.h, 0); sp.rotateX(0.75 - dip * 0.8); sp.rotateZ(0.15); }
    }
  }
  // a chest coming up: out of the ground, the dirt thrown off it
  const S = RAID.st;
  if (S.fvu && typeof FBI3 !== 'undefined') {
    const Mm = FBI3.m.get(S.fvu[0]); if (Mm) { const k = clamp(1 - S.fvu[1] / FVC.UP_T, 0, 1), e = 1 - Math.pow(1 - k, 3); Mm.position.y -= (1 - e) * 0.9; Mm.rotation.z = Math.sin(k * 18) * 0.06 * (1 - k); if (Math.random() < 0.4 * (1 - k)) fv3Dirt(Mm.position.x, -Mm.position.z, 2); }
    if (ZM.net === 'client') { S.fvu[1] -= dt; if (S.fvu[1] < -1) S.fvu = null; }
  }
}
// at sea: the chart table on deck, the wreck's mast out of the water, a crate coming up over the rail
function fv3Sea() {
  if (typeof THREE === 'undefined' || !GW3.DG) return;
  const lam = c => z3Lam(c), D = GWS.D, [u, v] = FVC.TABLE, T = new THREE.Group(); T.position.copy(gdv(u, v, D)); GW3.DG.add(T);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.8), lam('#5a4632')); top.position.y = 0.86; T.add(top);
  for (const [a, b] of [[-0.48, -0.33], [0.48, -0.33], [-0.48, 0.33], [0.48, 0.33]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.84, 0.07), lam('#4a3826')); l.position.set(a, 0.42, b); T.add(l); }
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 512; FV.tex = new THREE.CanvasTexture(cvs); FV.texKey = '';
  const map = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.74), new THREE.MeshLambertMaterial({ map: FV.tex, emissive: 0x2a2010 })); map.rotation.x = -Math.PI / 2; map.position.y = 0.895; T.add(map);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.08, 10), lam('#9a7a34')); st.position.set(0.46, 0.93, -0.3); T.add(st);
  const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), lam('#e8dcc0')); cd.position.set(0.46, 1.04, -0.3); T.add(cd);
  if (GW3.glowSp) { const f = GW3.glowSp(0xffd890, 0.35); f.position.set(0.46, 1.14, -0.3); T.add(f); }
  // the wreck's mast, out of the water, a yard across it and rags of sail, and wreckage about it
  const wk = new THREE.Group(), wood = lam('#3e3226'), rag = lam('#8a8270');
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 12, 8), wood); mast.position.y = 3.5; wk.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), wood); yard.rotation.z = Math.PI / 2 + 0.18; yard.position.y = 7.2; wk.add(yard);
  const top2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.4), wood); top2.position.y = 8.8; wk.add(top2);
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.4), new THREE.MeshLambertMaterial({ color: 0x6a6456, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); sl.position.set(1.0, 5.4, 0.1); sl.rotation.set(0, 0.2, 0.15); wk.add(sl);
  for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6 + k * 0.4, 0.04), rag); r.position.set(-1.6 + k * 0.5, 6.1 - k * 0.2, 0); r.rotation.z = (k - 1.5) * 0.15; wk.add(r); }
  for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 2, 0.15, 0.35), wood); const a = Math.random() * 6.28, d = 3 + Math.random() * 9; p.position.set(Math.cos(a) * d, 0.05, Math.sin(a) * d); p.rotation.y = Math.random() * 3; wk.add(p); }
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 10), lam('#5a4630')); const a = Math.random() * 6.28, d = 4 + Math.random() * 6; b.position.set(Math.cos(a) * d, 0.1, Math.sin(a) * d); b.rotation.x = Math.PI / 2; b.rotation.z = Math.random() * 3; wk.add(b); }
  if (GW3.glowSp) { const g1 = GW3.glowSp(0xc8f0ff, 5, { opacity: 0.3 }); g1.position.y = 0.6; wk.add(g1); wk.userData.g = g1; }
  wk.rotation.set(0.32, Math.random() * 6.28, 0.12); wk.visible = false; GW3.SG.add(wk); FV.wreck3 = wk;
  // a crate, for coming up over the port rail
  const cr = new THREE.Group(), cb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), lam('#7a6040')); cr.add(cb);
  for (const y of [-0.3, 0.3]) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.84), lam('#4a3a28')); s2.position.y = y; cr.add(s2); }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4, 4), lam('#a89070')); rope.position.y = 2.3; cr.add(rope);
  cr.visible = false; GW3.DG.add(cr); FV.crate3 = cr;
}
function fv3SeaF(dt) {
  const c = fvWreckCur();
  if (FV.wreck3) { FV.wreck3.visible = !!c; if (c) { FV.wreck3.position.set(c.wx, Math.sin(g.t * 0.7) * 0.15 - 0.5, -c.wy); if (FV.wreck3.userData.g) FV.wreck3.userData.g.material.opacity = 0.18 + 0.12 * Math.sin(g.t * 1.6); } }
  if (FV.crate3) { FV.crate3.visible = FV.upT > 0; if (FV.upT > 0) { const k = clamp(1 - FV.upT / 1.2, 0, 1); FV.crate3.position.copy(gdv(FVC.DIVE[0] - 1.0 + k * 0.6, FVC.DIVE[1], -1.4 + k * (GWS.D + 2.2))); FV.crate3.rotation.set(Math.sin(g.t * 5) * 0.1, k * 0.8, 0); } }
  // the table's chart, kept up with the voyage
  if (FV.tex) { const key = JSON.stringify(fvCur()); if (FV.texKey !== key) { FV.texKey = key; try { fvDrawSea(FV.tex.image); FV.tex.needsUpdate = true; } catch (e) {} } }
}

// =====================================================================================================================
// for tests
// =====================================================================================================================
// fbVoyDebug(kind): straight to it, alone or hosting. 'board' Saltcote and the board open; 'hoard' a hoard voyage and
// ashore on its first island; 'dig' and stood by its X; 'bounty' a bounty and ashore by the camp; 'captain' and the
// captain up at once; 'salvage' a salvage and at sea by the wreck; 'table' at sea, the chart table open; 'chart' the
// charts open. Call it again after each stage has started (it says what it did, or false).
function fbVoyDebug(kind, t) {
  if (!(FPS.on && FB.on && RAID.on)) { if (FPS.on) return false; fbDebug(kind === 'salvage' || kind === 'table' ? 'fbsail' : 'fb_port', 0); return 'starting: call again'; }
  if (ZM.net === 'client') return false;
  const V = FB.voy, here = RAID_ORDER[RAID.stage], p = fbPlanNow();
  const take = k => { if (!V.cur || V.cur.k !== k) { V.cur = fvMake(k, t || 2); V.holes = {}; fvPaint(); } return V.cur; };
  if (kind === 'board') { if (here !== 'fb_port') { fbGo('fb_port', 0); return 'to Saltcote: call again'; } V.cur = null; fvEnsure(); const F = fbiFb(); if (F && F.board) { const [x, y] = fbiW(F.board); FPS.me.x = x + 1.5; FPS.me.y = y - 1.5; } fvBoardOpen(); return 'board'; }
  if (kind === 'hoard' || kind === 'dig') {
    const c = take('hoard'), i = c.is[c.got.findIndex(v => !v)] || c.is[0];
    if (here !== 'fb_isle' || p.i !== i) { fbGo('fb_isle', i); return 'ashore: call again'; }
    if (kind === 'dig') { const F = fbiFb(), X = F.fvX; FPS.me.x = FPSC.CX + X[0]; FPS.me.y = FPSC.CY + X[1] - 0.9; FPS.me.h = 0; }
    return kind;
  }
  if (kind === 'bounty' || kind === 'captain') {
    const c = take('bounty'), i = c.is[0];
    if (here !== 'fb_isle' || p.i !== i) { fbGo('fb_isle', i); return 'ashore: call again'; }
    const F = fbiFb(); if (!F.fvCamp) return 'no camp';
    const [x, y] = fbiW(F.fvCamp); FPS.me.x = x; FPS.me.y = y - 9; FPS.me.h = 0;
    if (kind === 'captain') { const S = RAID.st; for (const z of ZM.z) if (z.fvc) z.dead = true; S.fvb = [1, FVC.WAVES, 0]; S.fvbT = 0; }
    return kind;
  }
  if (kind === 'salvage') {
    const c = take('salvage');
    if (here !== 'fbsail' || !RAID.st.B || Math.hypot(RAID.st.B.x - c.wx, RAID.st.B.y - c.wy) > FVC.WRECK_R) { FB.ship = Object.assign(fbFreshShip(), { x: c.wx - 18, y: c.wy - 22, h: 0.6 }); fbGo('fbsail', 0); return 'to the wreck: call again'; }
    return 'salvage';
  }
  if (kind === 'table') { if (here !== 'fbsail') { fbGo('fbsail', 0); return 'to sea: call again'; } fvChartOpen('sea'); return 'table'; }
  if (kind === 'chart') { fvChartOpen('voy'); return 'chart'; }
  return false;
}
