// Freebooters' Sea: going ashore (RAID_STAGES.fb_isle, any of the twelve islands, and RAID_STAGES.fb_port, Saltcote).
//
// Each island is a small one (FBI.R across its radius; Saltcote FBI.PORT_R) in its own look of Wreckers' Night's
// (FPS_ISLES: the Shingle Skerry, Wreckers' Reef, Chapel Islet, Smugglers' Cove, Signal Head, the Salt Marsh), with
// its own rocks, wrecks and props as that look lays them out, laid out from the island's own seed (FB_ISLES[i].seed,
// through the stage's map.seed), so it's the same island at every visit and on every screen.
//  - The landing: the clearest stretch of shore on the side she's anchored off (where the ship lies, FB.ship), a
//    landing boat drawn up there and a lamp on a post. It's the stage's start (where you come ashore, and where you're
//    back on your feet after bleeding out).
//  - What's lying about (FB_LOOT, src/fbsea.js): a chest (better the further north the island) and a trinket or two
//    on every island, now and then a cargo crate washed up by the shore, laid out with the island; what's left when
//    you go is still there next time (FB.left). Use picks one up and you carry it in your arms (no gun while you do),
//    Use again puts it down in front of you; going down drops it where you fall. Use at the landing boat with it in
//    your arms stows it in the hold (FB.hold). With nothing in your arms, Use at the boat takes everyone back aboard
//    FBC.AWAY seconds later (anything still in someone's arms goes aboard with them), and you're at sea where she lay.
//  - The drowned come up out of the shore a few at a time, more the more of you there are (fbIsleSpawn). Not at
//    Saltcote.
//  - Saltcote (fb_port) is the outpost: its quay (Smugglers' Cove's jetty and boathouse), the factor's table on the
//    shore near the landing (Use: the hold sold for sovereigns, src/fbsea.js fbSell), a voyage board beside it (for
//    voyages, to come), crates and lamps about. The spot kept for its chapel is FPS.g.isle.zm.fb.chapel.
// Together it's host-authoritative: the host has the loot (who carries what, where it lies), the clock to go back
// aboard and the drowned, and sends them in the stage's word (fl: the loot, fa: the clock, fsy: a line). A joined
// player asks the host (raidAsk 'carry' id, 'drop' [id, x, y], 'stow' id, 'aboard', 'sell'), and sees it done at once
// on their own side meanwhile.
// For the parts to come: fbHook('isle', h) and fbHook('port', h) (src/fbsea.js), with set(H, K, Z) laying out their
// own things with the island; fbIsleNow(), fbIsleSpot(r, dmin, dmax), fbIsleSpawn(o), FBI.land(), fbLootAdd() here.

const FBI = { R: 44, PORT_R: 52, USE_R: 1.7, BOAT_R: 2.6, CAP: 2, GAP: 8, FIRST: 8, land: () => fbiLand() };

// ---------- the island's look, small ----------
const fbIsleNow = () => { const p = fbPlanNow(); return p && p.key !== 'fbsail' ? FB_ISLES[p.i] || null : null; };
function fbIsleLook(i) {
  const p = FB.plan[i] || { i: 1 }, I = FB_ISLES[p.i] || FB_ISLES[1], B = FPS_ISLES[I.look] || FPS_ISLES.shingle;
  FPS_ISLES.fbisle = Object.assign({}, B, {
    name: I.n, look: FPS_ISLES[I.look] ? I.look : 'shingle',
    rocks: [Math.ceil(B.rocks[0] * 0.35), B.rocks[1], Math.min(B.rocks[2], 5), B.rocks[3]],
    wrecks: [Math.min(1, B.wrecks[0]), B.wrecks[1] || 6, Math.min(B.wrecks[2] || 8, 7)],
    fog: [B.fog[0], Math.round(B.fog[1] * 0.5), Math.round(Math.min(B.fog[2], 700))],
    birds: [B.birds[0], Math.min(3, B.birds[1])], pebbles: Math.round(B.pebbles * 0.3), tufts: [B.tufts[0], Math.round(B.tufts[1] * 0.3)], pools: Math.round(B.pools * 0.3), wrack: Math.round(B.wrack * 0.5),
    indoor: false, keep: false, arena: false, noGround: false,
  });
  const R = I.port ? FBI.PORT_R : FBI.R;
  Object.assign(FBI_MAP, { R, seed: I.seed, nav: [-R, R, -R, R], start: [0, -(R - 7)] });
  FBI_MAP.zones.isle.r = [-R, R, -R, R]; FBI_MAP.zones.isle.n = I.n;
}
FPS_ISLES.fbisle = Object.assign({}, FPS_ISLES.shingle, { look: 'shingle' });
const FBI_MAP = { start: [0, -(FBI.R - 7)], top: 0, R: FBI.R, seed: 0, isle: 'fbisle', shore: () => -999, nav: [-FBI.R, FBI.R, -FBI.R, FBI.R], zones: { isle: { n: 'the island', r: [-FBI.R, FBI.R, -FBI.R, FBI.R], sky: true } } };
var FBI_H = null;   // (the island's laying-out tools, while it's being laid out: fbIsleSpot)
// a clear spot on the island as it's laid out (r across, between dmin and dmax from the middle), or null
function fbIsleSpot(r, dmin, dmax) { return FBI_H ? FBI_H.spot(r, dmin == null ? 6 : dmin, dmax == null ? FBI_H.IR - 8 : dmax, 2.4) : null; }
FPI_GEN.fbisle = {
  built: true,
  set(H) {
    const T = H.I.T, L = FPI_GEN[T.look] || {}, { CX, CY, IR } = H, I = fbIsleNow() || FB_ISLES[1], port = !!I.port;
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    FBI_H = H;
    if (L.set) L.set(H);
    // the landing: the clearest stretch of shore on the side she's anchored off, the boat drawn up, a lamp
    const Sh = FB.ship, a0 = Sh ? Math.atan2(Sh.y - I.y, Sh.x - I.x) : -Math.PI / 2;
    let land = null;
    for (let k = 0; k < 24 && !land; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.22, [x, y] = H.polar(a, IR - 7); if (H.clear(x, y, 3, 1)) land = [x, y, a]; }
    if (!land) { const [x, y] = H.polar(a0, IR - 7); land = [x, y, a0]; }
    const [bx, by] = H.polar(land[2] + 0.1, IR - 3);
    H.put('boat', bx, by, land[2] + Math.PI / 2 + 0.25, { len: 4.4, beam: 1.6, paint: '#5a3a26', upright: true });
    { const [lx, ly] = H.polar(land[2] - 0.12, IR - 5); fpiLanternPost(H, lx, ly, land[2]); }
    const [sx, sy] = H.polar(land[2], IR - 9);
    Z.fb = { land: [sx - CX, sy - CY], landA: land[2], boat: [bx - CX, by - CY], loot: [] };
    // Saltcote: the factor's table near the landing, the voyage board beside it, cargo about, and room for a chapel
    if (port) {
      const near = (da, d, r) => { for (let k = 0; k < 16; k++) { const [x, y] = H.polar(land[2] + da + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.06, d - Math.floor(k / 4) * 2); if (H.clear(x, y, r, 1.2)) return [x, y]; } return H.polar(land[2] + da, d); };
      const tb = near(0.32, IR - 13, 2.2); H.put('fbtable', tb[0], tb[1], land[2] + Math.PI / 2, {}); Z.fb.table = [tb[0] - CX, tb[1] - CY];
      H.light(tb[0], tb[1], 2.6, '#ffc070', 9, 'lantern');
      const vb = near(-0.32, IR - 13, 1.6); H.put('fbboard', vb[0], vb[1], land[2] + Math.PI / 2, {}); Z.fb.board = [vb[0] - CX, vb[1] - CY];
      for (let k = 0; k < 3; k++) { const at = H.near(tb[0], tb[1], 1.6, 3.5, 7, 1.6); if (at) fpiCrates(H, at[0], at[1], k === 0); }
      { const at = H.near(vb[0], vb[1], 1.2, 3, 6, 1.6); if (at) fpiBarrels(H, at[0], at[1]); }
      for (const da of [0.6, -0.6]) { const [x, y] = H.polar(land[2] + da, IR - 8); if (H.clear(x, y, 0.5, 1)) fpiLanternPost(H, x, y, land[2]); }
      const ch = H.spot(6, 8, IR - 18, 3); Z.fb.chapel = ch ? [ch[0] - CX, ch[1] - CY] : [0, 0];
    } else {
      // what's lying about: a chest (better the further out), a trinket or two, now and then a cargo crate
      const R = seeded(I.seed ^ 0x10a7), far = (I.y - FB_ISLES[0].y) / 2700, u = R();
      const chest = u < 0.25 + far * 0.5 ? (R() < far * 0.6 ? 'chest3' : 'chest2') : 'chest';
      const kinds = [chest], tr = Object.keys(FB_LOOT).filter(k => FB_LOOT[k].trinket);
      for (let k = 0, n = 1 + (R() < 0.5 ? 1 : 0); k < n; k++) kinds.push(tr[(R() * tr.length) | 0]);
      if (R() < 0.35) kinds.push('crate');
      for (const k of kinds) { const at = k === 'crate' ? H.spot(1, IR - 16, IR - 6, 2.4) : H.spot(1, 6, IR - 9, 2.4); if (at) Z.fb.loot.push([k, at[0] - CX, at[1] - CY]); }
    }
    // (where you come ashore: the landing, a little up the beach)
    ZMD.START = Z.fb.land.slice(); FBI_MAP.start = Z.fb.land.slice();
    fbHooks(port ? 'port' : 'isle', 'set', H, zmKit(H, Z), Z);
  },
  props(H) { const L = FPI_GEN[H.I.T.look] || {}; if (L.props) L.props(H); FBI_H = null; },
  decor() {},
};
// the factor's table: a trestle table under an awning, his ledger, scales and stacks of coin on it, a stool
FPI_K.fbtable = {
  col: FPI_C.wood2,
  sol(p) { return [fpiBox(p, 0, 0, 1.1, 0.45, 0.85)]; },
  b3(p, A) {
    A.box('#5e4a34', 0, 0, 0.78, 2.2, 0.9, 0.08);
    for (const [u, v] of [[-0.95, -0.35], [0.95, -0.35], [-0.95, 0.35], [0.95, 0.35]]) A.box(FPI_C.wood3, u, v, 0, 0.08, 0.08, 0.78);
    A.box('#2e2a22', -0.5, 0.05, 0.86, 0.5, 0.36, 0.05); A.box('#d8ccb0', -0.5, 0.05, 0.91, 0.46, 0.32, 0.01);   // (the ledger, open)
    A.cyl(FPI_C.brass, 0.4, 0.1, 0.86, 0.03, 0.4); A.box(FPI_C.brass, 0.4, 0.1, 1.26, 0.5, 0.03, 0.03);   // (the scales)
    for (const du of [-0.25, 0.25]) A.cyl(FPI_C.brass, 0.4 + du, 0.1, 1.1, 0.09, 0.02);
    for (let i = 0; i < 4; i++) A.cyl('#d8b050', 0.85 - i * 0.12, -0.25, 0.86, 0.035, 0.03 + i * 0.03);   // (sovereigns, stacked)
    A.cyl(FPI_C.wood3, 0, 0.85, 0, 0.2, 0.5);   // (his stool)
    // the awning: four poles and a canvas
    for (const [u, v] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.9], [1.3, 0.9]]) A.cyl(FPI_C.wood3, u, v, 0, 0.05, v < 0 ? 2.3 : 2.6);
    A.box('#8a7a5a', 0, 0.05, 2.45, 2.8, 1.9, 0.05, 0, 0.12);
    A.glow('#ffd08a', 1.2, 0.85, 2.3, 0.2);
  },
};
// the voyage board: two posts and a board with papers pinned to it (voyages: to come)
FPI_K.fbboard = {
  col: FPI_C.wood3,
  sol(p) { return [fpiBox(p, 0, 0, 0.75, 0.12, 2.1)]; },
  b3(p, A) {
    for (const u of [-0.7, 0.7]) A.box(FPI_C.wood3, u, 0, 0, 0.1, 0.1, 2.2);
    A.box('#4a3a2a', 0, 0, 1.0, 1.5, 0.06, 1.0);
    for (const [u, z, c] of [[-0.4, 1.55, '#d8ccb0'], [0.15, 1.6, '#cfc2a2'], [0.45, 1.25, '#d8ccb0'], [-0.2, 1.2, '#c8b890']]) A.box(c, u, -0.04, z, 0.34, 0.01, 0.42);
    A.box('#3a2e22', 0, 0, 2.05, 1.7, 0.2, 0.08);
  },
};
const fbiFb = () => { const Z = FPS.g && FPS.g.isle && FPS.g.isle.zm; return Z && Z.fb || null; };
const fbiW = a => [FPSC.CX + a[0], FPSC.CY + a[1]];
function fbiLand() { const F = fbiFb(); return F ? fbiW(F.boat) : [FPSC.CX, FPSC.CY - FBI.R + 3]; }
const fbiGround = (x, y) => FPSC.GROUND + (typeof fpsIsleH === 'function' && FPS.g ? fpsIsleH(FPS.g.isle, x, y) : 0);
const fbiAble = () => { const m = FPS.me; return !(m.dead > 0) && !zmIsDown() && !ZM.over; };
const fbiN = () => Math.max(1, ZM.hum.length);

// ---------- the loot, on land ----------
// (hosting or alone) an item of kind lying at (x, y) on this stage (world coordinates)
function fbLootAdd(kind, x, y) {
  const S = RAID.st; if (!S.loot || ZM.net === 'client' || !FB_LOOT[kind]) return null;
  S.lseq = (S.lseq | 0) + 1;
  const o = { id: 'a' + RAID.stage + '.' + S.lseq, k: kind, x, y, by: '' }; S.loot.push(o); return o;
}
// (hosting or alone) what a player asked of the loot: carry (a: its id), drop ([id, x, y], from the island's middle),
// stow (id: at the landing boat)
function fbLootQ(sid, k, a) {
  const S = RAID.st, L = S.loot; if (!L) return false;
  if (k === 'carry') { const o = L.find(q => q.id === String(a)); if (o && !o.by && !L.some(q => q.by === sid)) o.by = sid; return true; }
  if (k === 'drop') { if (!Array.isArray(a)) return true; const o = L.find(q => q.id === String(a[0])); if (o && o.by === sid) { const R = FPSC.R - 2, x = clamp(+a[1] || 0, -R, R), y = clamp(+a[2] || 0, -R, R); o.by = ''; o.x = FPSC.CX + x; o.y = FPSC.CY + y; } return true; }
  if (k === 'stow') { const o = L.find(q => q.id === String(a)); if (o && o.by === sid) { L.splice(L.indexOf(o), 1); fbStowKind(o.k, sid); } return true; }
  return false;
}
// (hosting or alone) going back aboard: what's in anyone's arms goes with them, and what's lying is left for next time
function fbIsleKeep() {
  const S = RAID.st, p = fbPlanNow(); if (!S.loot || !p || ZM.net === 'client') return;
  FB.left[p.i] = S.loot.filter(o => !o.by).map(o => ({ id: o.id, k: o.k, x: o.x - FPSC.CX, y: o.y - FPSC.CY }));
}
function fbIsleLeave() {
  const S = RAID.st, p = fbPlanNow(); if (!p || ZM.net === 'client' || ZM.over) return;
  for (const o of S.loot.filter(o => o.by)) { S.loot.splice(S.loot.indexOf(o), 1); fbStowKind(o.k, o.by); }
  fbIsleKeep(); S.kept = 1;
  fbEvent('aboard', '', p.i);
  fbGo('fbsail', 0);
}

// ---------- the drowned ----------
// (hosting or alone) one of the drowned up out of the shore, at least 12 m from everyone; o: raidSpawnAt's
function fbIsleSpawn(o) {
  const P = ZM.players || [];
  for (let t = 0; t < 20; t++) {
    const a = Math.random() * 6.283, d = FPSC.R - 3 - Math.random() * 5, x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (P.some(p => Math.hypot(p.x - x, p.y - y) < 12)) continue;
    if (zmBlockedAt(x, y, 0.5, 0)) continue;
    return raidSpawnAt(x, y, o);
  }
  return null;
}
const fbIsleHp = () => zmHp(RAIDC.ROUND + 1) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (fbiN() - 1));
const fbIsleKind = () => { const u = Math.random(); return u < 0.08 ? 'run' : u < 0.6 ? 'jog' : 'walk'; };

// ---------- the word on land ----------
function fbIsleSay(text, warn) { if (ZM.net !== 'client') { const S = RAID.st; S.say = [((S.say || [0])[0] | 0) + 1, text, warn ? 1 : 0]; } fbIsleHear(text, warn); }
function fbIsleHear(text, warn) { fpsFeed(text); if (warn) ZM.banner = { text, t: 2.8, small: true, col: '#ffe2a8' }; }

// ---------- the stage, for an island or for Saltcote ----------
function fbIsleStage(port) {
  const W = port ? 'port' : 'isle', call = (k, ...a) => fbHooks(W, k, ...a);
  return {
    get n() { const I = fbIsleNow(); return I ? I.n : port ? 'Saltcote' : 'an island'; },
    map: FBI_MAP, mend: true, open: true, fbIsle: true, port,
    music: () => call('music') || (port ? FB_MUSIC.port : FB_MUSIC.isle),
    prep(i) { fbIsleLook(i); call('prep', i); },
    enter() {
      const p = fbPlanNow() || { i: port ? 0 : 1 }, I = FB_ISLES[p.i], F = fbiFb();
      Object.assign(RAID.st, { loot: [], lseq: 0, away: 0, awayT: 0, say: [0, '', 0], seenSay: 0, pend: 0, pendId: '', spT: FBI.FIRST, kept: 0 });
      if (ZM.net !== 'client') {
        const left = FB.left[p.i] || (F ? F.loot.map((e, n) => ({ id: 'i' + p.i + '.' + n, k: e[0], x: e[1], y: e[2] })) : []);
        RAID.st.loot = left.map(o => ({ id: o.id, k: o.k, x: FPSC.CX + o.x, y: FPSC.CY + o.y, by: '' }));
      }
      ZM.banner = this.banner();
      fpsFeed(port ? 'Ashore at Saltcote. The factor’s table by the landing buys what’s in the hold (Use at it). Use at the landing boat to go back aboard.'
        : `Ashore on ${I.n}. Find what’s lying about and carry it to the landing boat (Use) to stow it in the hold. With nothing in your arms, Use at the boat takes everyone back aboard.`);
      call('enter');
    },
    banner() { const I = fbIsleNow(); return { text: I ? I.n : 'Ashore', t: 4.5, sub: port ? 'Freebooters’ Sea · the outpost' : `Freebooters’ Sea · ${I ? I.say : ''}`, col: '#ffe2a8' }; },
    tick(dt) {
      const S = RAID.st;
      // the drowned: a few at a time, more the more of you there are (none at Saltcote)
      if (!port && !S.away) { S.spT -= dt; if (S.spT <= 0) { S.spT = FBI.GAP * (0.75 + Math.random() * 0.5) / Math.sqrt(fbiN()); if (ZM.z.filter(z => !z.dead && !z.boss).length < FBI.CAP + 2 * fbiN()) fbIsleSpawn({ kind: fbIsleKind(), hp: fbIsleHp() }); } }
      if (S.away) { S.awayT -= dt; if (S.awayT <= 0) { S.away = 0; fbIsleLeave(); return; } }
      call('tick', dt);
    },
    me(dt) {
      const S = RAID.st, m = FPS.me;
      if (S.pend > 0) S.pend -= dt;
      // going down drops what you're carrying, where you fall
      const c = fbCarrying(); if (c && !fbiAble()) fbiDrop(c, m.x, m.y);
      if (Array.isArray(S.say) && S.say[0] > (S.seenSay | 0)) { if (ZM.net === 'client' && S.seenSay) fbIsleHear(String(S.say[1] || ''), !!S.say[2]); S.seenSay = S.say[0] | 0; }
      call('me', dt);
    },
    q(sid, k, a) {
      const S = RAID.st;
      if (fbLootQ(sid, k, a)) return;
      if (k === 'aboard') { if (!S.away) { S.away = 1; S.awayT = FBC.AWAY; fbIsleSay(`${sid !== FPS.me.id || ZM.net ? fbNick(sid) + ' calls everyone' : 'Everyone'} back to the boat: back aboard in ${FBC.AWAY} seconds.`, true); } return; }
      if (k === 'sell' && port) { if (!fbSell(sid) && sid === FPS.me.id) fpsFeed('There’s nothing in the hold to sell.'); return; }
      call('q', sid, k, a);
    },
    pack(o) {
      const S = RAID.st, r = v => Math.round(v * 10) / 10;
      o.fl = S.loot.map(q => [q.id, q.k, r(q.x - FPSC.CX), r(q.y - FPSC.CY), q.by || '']);
      o.fa = S.away ? Math.ceil(S.awayT * 10) / 10 : -1; o.fsy = S.say;
      call('pack', o);
    },
    apply(o) {
      const S = RAID.st;
      if (Array.isArray(o.fl)) {
        const mine = S.pend > 0 ? S.loot.find(q => q.id === S.pendId) : null;
        S.loot = o.fl.filter(e => Array.isArray(e) && FB_LOOT[e[1]]).map(e => ({ id: String(e[0]), k: String(e[1]), x: FPSC.CX + (+e[2] || 0), y: FPSC.CY + (+e[3] || 0), by: String(e[4] || '') }));
        // (what I've just asked for: as I asked, until the host's word catches up)
        if (S.pend > 0) { const i = S.loot.findIndex(q => q.id === S.pendId); if (mine && i >= 0) S.loot[i] = mine; else if (!mine && i >= 0) S.loot.splice(i, 1); }
      }
      S.away = +o.fa >= 0 ? 1 : 0; S.awayT = Math.max(0, +o.fa || 0);
      if (Array.isArray(o.fsy)) S.say = o.fsy;
      call('apply', o);
    },
    consider(c) {
      const S = RAID.st, m = FPS.me, mz = m.jz || 0, F = fbiFb(), mine = fbCarrying(); if (!F) return;
      if (!mine) for (const q of S.loot) if (!q.by) c({ k: 'fbloot', id: q.id }, q.x, q.y, mz, FBI.USE_R, false);
      const [bx, by] = fbiW(F.boat); c({ k: 'fbboat' }, bx, by, mz, FBI.BOAT_R, false);
      if (port && F.table) { const [tx, ty] = fbiW(F.table); c({ k: 'fbtable' }, tx, ty, mz, 2.3, false); }
      call('consider', c);
      // (in your arms, and nothing else to hand: Use puts it down)
      if (mine && Math.hypot(bx - m.x, by - m.y) > FBI.BOAT_R && !(port && F.table && Math.hypot(fbiW(F.table)[0] - m.x, fbiW(F.table)[1] - m.y) < 2.3)) c({ k: 'fbdrop', id: mine.id }, m.x, m.y, mz, 0.01, false);
    },
    prompt(o) {
      const S = RAID.st, mine = fbCarrying();
      if (o.k === 'fbloot') { const q = S.loot.find(x => x.id === o.id); return q ? { text: `Pick up ${fbLootOf(q.k).n} (${fbLootOf(q.k).v} sovereigns)`, free: true } : null; }
      if (o.k === 'fbdrop') return mine ? { text: `Put down ${fbLootOf(mine.k).n}`, free: true } : null;
      if (o.k === 'fbboat') return mine ? { text: `Stow ${fbLootOf(mine.k).n} in the boat, for the hold`, free: true } : S.away ? { text: `Back aboard in ${Math.ceil(S.awayT)} s` } : { text: 'Back aboard (everyone)', free: true };
      if (o.k === 'fbtable') return FB.hold.length || mine ? { text: `Sell the hold to the factor: ${fbSov(fbHoldValue() + (mine ? fbLootOf(mine.k).v : 0))}`, free: true } : { text: 'The factor’s table: nothing in the hold to sell' };
      return call('prompt', o) || null;
    },
    use(o) {
      const S = RAID.st, mine = fbCarrying();
      if (o.k === 'fbloot') {
        const q = S.loot.find(x => x.id === o.id); if (!q || q.by || mine) { zmSound('no'); return true; }
        raidAsk('carry', q.id); if (ZM.net === 'client') { q.by = FPS.me.id; S.pend = 0.9; S.pendId = q.id; }
        fpsFeed(`You pick up ${fbLootOf(q.k).n}. Carry it to the landing boat to stow it.`);
        try { if (!soundOff()) tone(220, 'triangle', 0.01, 0.12, 0.08, { to: 330 }); } catch (e) {}
        return true;
      }
      if (o.k === 'fbdrop') { if (mine) { const m = FPS.me, x = m.x + Math.sin(m.h) * 1.1, y = m.y + Math.cos(m.h) * 1.1; fbiDrop(mine, zmBlockedAt(x, y, 0.4, 0) ? m.x : x, zmBlockedAt(x, y, 0.4, 0) ? m.y : y); } return true; }
      if (o.k === 'fbboat') {
        if (mine) { raidAsk('stow', mine.id); if (ZM.net === 'client') { S.loot = S.loot.filter(q => q !== mine); S.pend = 0.9; S.pendId = mine.id; } try { if (!soundOff()) noise('lowpass', 500, 1, 0.005, 0.2, 0.3); } catch (e) {} return true; }
        if (!S.away) raidAsk('aboard'); return true;
      }
      if (o.k === 'fbtable') { if (FB.hold.length || mine) { raidAsk('sell'); try { if (!soundOff()) for (let i = 0; i < 4; i++) tone(1400 + i * 120, 'triangle', 0.002, 0.08, 0.05, { delay: i * 0.07 }); } catch (e) {} } else zmSound('no'); return true; }
      return !!call('use', o);
    },
    hud(phone, mono, fell) { fbIsleHud(phone, mono); call('hud', phone, mono, fell); },
    kill(d, how, by) { call('kill', d, how, by); },
    hurt(d, dmg, code, by) { return fbHookHurt(W, d, dmg, code, by); },
    players(P) { return fbHookPlayers(W, P); },
    block(x, y, pad, feet) { return !!call('block', x, y, pad, feet); },
    shot(...a) { call('shot', ...a); },
    b3(grp) { fbi3dBuild(grp); call('b3', grp); },
    f3(dt) { fbi3d(dt); call('f3', dt); },
    exit() { const S = RAID.st; if (!S.kept) fbIsleKeep(); FBI3.on = false; call('exit'); },
  };
}
// put down what you carry at (x, y) (asked of the host; at once on my side)
function fbiDrop(o, x, y) {
  const S = RAID.st; raidAsk('drop', [o.id, Math.round((x - FPSC.CX) * 10) / 10, Math.round((y - FPSC.CY) * 10) / 10]);
  if (ZM.net === 'client') { o.by = ''; o.x = x; o.y = y; S.pend = 0.9; S.pendId = o.id; }
}
RAID_STAGES.fb_isle = fbIsleStage(false);
RAID_STAGES.fb_port = fbIsleStage(true);

// ---------- painted on top ----------
function fbIsleHud(phone, mono) {
  const S = RAID.st, I = fbIsleNow(); if (!I) return;
  const L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44), lying = S.loot.filter(q => !q.by).length;
  const line = S.away ? `Back to the boat: back aboard in ${Math.ceil(S.awayT)} s`
    : I.port ? `Saltcote · the factor’s table buys the hold (${FB.hold.length ? fbSov(fbHoldValue()) : 'empty'}) · the landing boat takes you back aboard`
    : `${I.n} · ${lying ? `${lying} ${lying === 1 ? 'thing' : 'things'} lying about` : 'nothing left lying about'} · carry them to the landing boat`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = S.away ? '#ffd88a' : 'rgba(236,228,207,0.8)';
  ctx.fillText(line, L, top, W * 0.55); fpsHudNote(top + (phone ? 14 : 18));
  ctx.textBaseline = 'alphabetic';
}

// ---------- in 3D: what's lying about, and what's carried ----------
const FBI3 = { on: false, grp: null, m: new Map() };
// a piece of loot, about life size, with a faint glint over it so it's found in the dark
function fbLootMesh(k) {
  const D = fbLootOf(k), g0 = new THREE.Group(), lam = c => z3Lam(c), iron = lam('#2a2a2c'), brass = lam('#b08a3a');
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); g0.add(m); return m; };
  if (D.shape === 'chest') { add(new THREE.BoxGeometry(0.9, 0.42, 0.56), lam(D.col), 0, 0.21); add(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), lam(D.col), 0, 0.42); for (const x of [-0.32, 0, 0.32]) add(new THREE.BoxGeometry(0.05, 0.72, 0.6), D.gilt ? brass : iron, x, 0.36); add(new THREE.BoxGeometry(0.12, 0.14, 0.04), brass, 0, 0.38, 0.29); }
  else if (D.shape === 'bell') { add(new THREE.CylinderGeometry(0.2, 0.36, 0.5, 14), lam(D.col), 0, 0.3); add(new THREE.TorusGeometry(0.08, 0.025, 6, 10), lam(D.col), 0, 0.6); add(new THREE.SphereGeometry(0.06, 8, 6), iron, 0, 0.06); }
  else if (D.shape === 'crate') { add(new THREE.BoxGeometry(0.8, 0.7, 0.8), lam(D.col), 0, 0.35); for (const y of [0.06, 0.64]) add(new THREE.BoxGeometry(0.84, 0.08, 0.84), lam('#4a3a28'), 0, y); add(new THREE.BoxGeometry(0.84, 0.08, 0.1).rotateZ(0.7), lam('#4a3a28'), 0, 0.35, 0.41); }
  else if (D.shape === 'box') { add(new THREE.BoxGeometry(0.6, 0.36, 0.42), lam(D.col), 0, 0.18); for (const x of [-0.24, 0.24]) add(new THREE.BoxGeometry(0.04, 0.38, 0.44), brass, x, 0.19); add(new THREE.BoxGeometry(0.1, 0.12, 0.03), brass, 0, 0.2, 0.22); }
  else { add(new THREE.SphereGeometry(0.11, 10, 8), lam(D.col), 0, 0.1); add(new THREE.TorusGeometry(0.12, 0.02, 6, 12).rotateX(Math.PI / 2), brass, 0, 0.06); }
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,220,140,0.8)', 'rgba(255,220,140,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
  gl.scale.setScalar(D.shape === 'small' ? 0.9 : 1.6); gl.position.y = D.shape === 'small' ? 0.25 : 0.6; g0.add(gl); g0.userData.gl = gl;
  return g0;
}
function fbi3dBuild(grp) { FBI3.on = true; FBI3.grp = new THREE.Group(); grp.add(FBI3.grp); FBI3.m = new Map(); }
function fbi3d(dt) {
  if (!FBI3.on || !FBI3.grp) return;
  const S = RAID.st, m = FPS.me, t = g.t, seen = new Set();
  for (const q of S.loot || []) {
    let M = FBI3.m.get(q.id); if (!M || M.userData.k !== q.k) { if (M) FBI3.grp.remove(M); M = fbLootMesh(q.k); M.userData.k = q.k; FBI3.grp.add(M); FBI3.m.set(q.id, M); }
    seen.add(q.id); M.visible = true;
    if (!q.by) { M.position.copy(z3v(q.x, q.y, fbiGround(q.x, q.y))); M.rotation.set(0, (q.id.length * 1.7) % 6.28, 0); M.scale.setScalar(1); M.userData.gl.material.opacity = 0.35 + 0.2 * Math.sin(t * 2.2 + q.x); continue; }
    M.userData.gl.material.opacity = 0;
    if (q.by === m.id) {
      // in my arms: low in front of me, as I look (not tipping with the look up and down)
      if (fpsThird() || zmSpecOn()) { M.position.copy(z3v(m.x + Math.sin(m.h) * 0.45, m.y + Math.cos(m.h) * 0.45, fbiGround(m.x, m.y) + (m.jz || 0) + 0.9)); M.rotation.set(0, -m.h, 0); M.scale.setScalar(0.8); continue; }
      const sw = reduceMotion ? 0 : Math.sin((FPS.step || 0) * 0.5) * 0.02, ez = FPSC.GROUND + FPSC.EYE + (m.jz || 0) - (FPS.crouchEye || 0);
      M.position.copy(z3v(m.x + Math.sin(m.h) * 1.05, m.y + Math.cos(m.h) * 1.05, ez - 0.72 + sw)); M.rotation.set(0, -m.h, 0); M.scale.setScalar(0.55);
      continue;
    }
    const r = FPS.remote.get(q.by); if (!r || r.x == null) { M.visible = false; continue; }
    M.position.copy(z3v(r.x + Math.sin(r.h || 0) * 0.45, r.y + Math.cos(r.h || 0) * 0.45, FPSC.GROUND + (r.jz || 0) + 0.85)); M.rotation.set(0, -(r.h || 0), 0); M.scale.setScalar(0.8);
  }
  for (const [id, M] of FBI3.m) if (!seen.has(id)) { FBI3.grp.remove(M); FBI3.m.delete(id); }
}
