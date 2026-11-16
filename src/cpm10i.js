'use strict';
// The Chronicle of the Light, mission 10 (Freebooters' Sea): its two stages ashore, Crowsnest Rock and Saltcote.
// Each island is laid out as Freebooters' Sea lays it out (src/fbisle.js: the island's own look of Wreckers' Night's,
// small, from its own seed: Crowsnest Rock is Signal Head's crags, their stair and the ruined signal tower; Saltcote
// is Smugglers' Cove's jetty and boathouse, with the factor's table and the voyage board by the landing), so it's the
// same place, with this mission's own things set on it (FPI_GEN.cpm10isle).
//  - Crowsnest Rock (cp_m10crow): the hoarder's three marks, each a stone post with a brass sight on it that turns
//    an eighth of a circle at a Use: the Crow (a carved stone at the stair's foot), the Tower (by the tower's door)
//    and the Hanged Man (a gibbet, its cage still occupied). The chart (on the HUD) says the Crow looks to the Tower,
//    the Tower to the Hanged Man and the Hanged Man to the Crow; a sight turned true shines a thin beam to its mark.
//    All three true and they agree on a spot (m10_agree): hold Use there to dig (two of you dig quicker), with the
//    drowned coming up out of the shore the whole time. The spade finds the chest, opened before you (m10_open), and
//    a Mooncusser comes up out of the pit (src/zmboss2.js's ZBT.moon). Put him down; carry the chest (arms full, no
//    gun, a little slower) to the landing boat (Use), and it's done. Down with it in your arms, and it drops.
//  - Saltcote (cp_m10port): the two halves of the hoard lie in the landing boat; carry each up to the factor's table
//    (the factor stands behind it; the Gilt & Gull clerk by the voyage board) and Use, and he weighs it. Both weighed
//    (and whatever else is in the hold sold with them), the mission's won. The drowned never come up at Saltcote.
// Together it's host-authoritative: the host has the sights, the dig, the boss and the loot (who carries what, where it
// lies), in the stage's word (c10i); a joined player asks ('c10turn' i, 'c10dig', 'c10take', 'c10drop' [x, y],
// 'c10stow', 'c10sell') and sees it on their own side as the word comes back.

const C10I = { R: 44, PORT_R: 52, CROW: 7, DIG_T: 20, USE_R: 1.8, BOAT_R: 2.8, TABLE_R: 2.4, CARRY_K: 0.82, PORT_A: Math.atan2(2720 - 1060, -1250 + 40) };
const C10_DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const C10_MARKS = [{ k: 'crow', n: 'the Crow', to: 1 }, { k: 'tower', n: 'the Tower', to: 2 }, { k: 'hang', n: 'the Hanged Man', to: 0 }];

// ---------- the island's look (prep, every screen): Freebooters' Sea's, small ----------
const C10I_MAP = { start: [0, -(C10I.R - 7)], top: 0, R: C10I.R, seed: 0, isle: 'cpm10isle', shore: () => -999, nav: [-C10I.R, C10I.R, -C10I.R, C10I.R], zones: { isle: { n: 'the island', r: [-C10I.R, C10I.R, -C10I.R, C10I.R], sky: true } } };
var C10I_AT = 7;   // (which of FB_ISLES is being laid out)
function c10IsleLook(i) {
  C10I_AT = i; const I = FB_ISLES[i], B = FPS_ISLES[I.look] || FPS_ISLES.shingle;
  FPS_ISLES.cpm10isle = Object.assign({}, B, {
    name: I.n, look: I.look,
    rocks: [Math.ceil(B.rocks[0] * 0.35), B.rocks[1], Math.min(B.rocks[2], 5), B.rocks[3]],
    wrecks: [Math.min(1, B.wrecks[0]), B.wrecks[1] || 6, Math.min(B.wrecks[2] || 8, 7)],
    fog: [B.fog[0], Math.round(B.fog[1] * 0.5), Math.round(Math.min(B.fog[2], 700))],
    birds: [B.birds[0], Math.min(3, B.birds[1])], pebbles: Math.round(B.pebbles * 0.3), tufts: [B.tufts[0], Math.round(B.tufts[1] * 0.3)], pools: Math.round(B.pools * 0.3), wrack: Math.round(B.wrack * 0.5),
    indoor: false, keep: false, arena: false, noGround: false,
  });
  const R = I.port ? C10I.PORT_R : C10I.R;
  Object.assign(C10I_MAP, { R, seed: I.seed, nav: [-R, R, -R, R], start: [0, -(R - 7)] });
  C10I_MAP.zones.isle.r = [-R, R, -R, R]; C10I_MAP.zones.isle.n = I.n;
}
FPS_ISLES.cpm10isle = Object.assign({}, FPS_ISLES.cliff, { look: 'cliff' });
FPI_GEN.cpm10isle = {
  built: true,
  set(H) {
    const T = H.I.T, L = FPI_GEN[T.look] || {}, { CX, CY, IR } = H, I = FB_ISLES[C10I_AT], port = !!I.port;
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    if (L.set) L.set(H);
    const loc = p => [p[0] - CX, p[1] - CY];
    // the landing: the clearest stretch of shore on the side she came in from, the boat drawn up, a lamp
    const a0 = port ? C10I.PORT_A : C10_A0;
    let land = null;
    for (let k = 0; k < 24 && !land; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.22, [x, y] = H.polar(a, IR - 7); if (H.clear(x, y, 3, 1)) land = [x, y, a]; }
    if (!land) { const [x, y] = H.polar(a0, IR - 7); land = [x, y, a0]; }
    const [bx, by] = H.polar(land[2] + 0.1, IR - 3);
    H.put('boat', bx, by, land[2] + Math.PI / 2 + 0.25, { len: 4.4, beam: 1.6, paint: '#5a3a26', upright: true });
    { const [lx, ly] = H.polar(land[2] - 0.12, IR - 5); fpiLanternPost(H, lx, ly, land[2]); }
    const [sx, sy] = H.polar(land[2], IR - 9);
    const C = Z.c10 = { land: [sx - CX, sy - CY], landA: land[2], boat: [bx - CX, by - CY] };
    if (port) {
      // Saltcote: the factor's table near the landing, the voyage board beside it, cargo about (as src/fbisle.js)
      const near = (da, d, r) => { for (let k = 0; k < 16; k++) { const [x, y] = H.polar(land[2] + da + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.06, d - Math.floor(k / 4) * 2); if (H.clear(x, y, r, 1.2)) return [x, y]; } return H.polar(land[2] + da, d); };
      const tb = near(0.32, IR - 13, 2.2); H.put('fbtable', tb[0], tb[1], land[2] + Math.PI / 2, {}); C.table = loc(tb); C.tableA = land[2] + Math.PI / 2;
      H.light(tb[0], tb[1], 2.6, '#ffc070', 9, 'lantern');
      const vb = near(-0.32, IR - 13, 1.6); H.put('fbboard', vb[0], vb[1], land[2] + Math.PI / 2, {}); C.board = loc(vb);
      for (let k = 0; k < 3; k++) { const at = H.near(tb[0], tb[1], 1.6, 3.5, 7, 1.6); if (at) fpiCrates(H, at[0], at[1], k === 0); }
      { const at = H.near(vb[0], vb[1], 1.2, 3, 6, 1.6); if (at) fpiBarrels(H, at[0], at[1]); }
      for (const da of [0.6, -0.6]) { const [x, y] = H.polar(land[2] + da, IR - 8); if (H.clear(x, y, 0.5, 1)) fpiLanternPost(H, x, y, land[2]); }
    } else {
      // Crowsnest: the hoarder's marks. The Crow at the stair's foot; the Tower by its door; the Hanged Man on his
      // gibbet, as far from both as the rock allows; and where the sights agree, between them
      const st = H.I.props.find(p => p.k === 'stair'), bz = H.I.props.find(p => p.k === 'brazier');
      const stA = st ? Math.atan2(st.y - CY, st.x - CX) : land[2] + 2;
      const crow = H.near(...H.polar(stA, IR - 13), 1.4, 0, 6, 1.6) || H.spot(1.4, 18, IR - 10, 2) || H.polar(stA, IR - 13);
      const tw = bz ? (H.near(bz.x, bz.y, 0.6, 2.2, 4.5, 1.2) || [bz.x + 2.5, bz.y]) : (H.spot(1, 10, 30, 2) || [CX, CY + 10]);
      let hang = null, best = -1;
      for (let k = 0; k < 40; k++) { const s = H.spot(1.6, 10, IR - 9, 2.2); if (!s) continue; const d = Math.min(Math.hypot(s[0] - crow[0], s[1] - crow[1]), Math.hypot(s[0] - tw[0], s[1] - tw[1]), Math.hypot(s[0] - sx, s[1] - sy) + 6); if (d > best) { best = d; hang = s; } }
      hang = hang || H.polar(land[2] + Math.PI, IR - 14);
      H.put('c10crow', crow[0] + 0.9, crow[1] + 0.4, stA + Math.PI / 2, {});
      H.put('c10gibbet', hang[0] + 1.1, hang[1] - 0.6, R0(H), {});
      for (const [p, kind] of [[crow, 0], [tw, 1], [hang, 2]]) H.put('c10post', p[0], p[1], 0, { mark: kind });
      const mx = (crow[0] + tw[0] + hang[0]) / 3, my = (crow[1] + tw[1] + hang[1]) / 3;
      const xs = H.near(mx, my, 1.2, 0, 9, 1.8) || H.spot(1.2, 4, 26, 1.8) || [mx, my];
      Object.assign(C, { crow: loc(crow), tower: loc(tw), hang: loc(hang), x: loc(xs) });
    }
    ZMD.START = C.land.slice(); C10I_MAP.start = C.land.slice();
  },
  props(H) { const L = FPI_GEN[H.I.T.look] || {}; if (L.props) L.props(H); },
  decor() {},
};
const R0 = H => H.R(0, 6.283);
// the posts the sights stand on: a squared stone post, a carved plate on its face for its mark (the sight's brass
// tube on top is drawn by the stage, so it can turn)
FPI_K.c10post = {
  col: '#7a7468',
  sol(p) { return [fpiCirc(p, 0, 0, 0.3, 1.2)]; },
  b3(p, A) {
    A.box('#7a7468', 0, 0, -0.1, 0.5, 0.5, 1.28); A.box('#6a645a', 0, 0, 1.18, 0.62, 0.62, 0.08);
    const c = ['#2a2a2c', '#5a564e', '#3a2a22'][p.mark | 0];
    for (const [u, v] of [[0, 0.26], [0, -0.26], [0.26, 0], [-0.26, 0]]) A.box(c, u, v, 0.55, Math.abs(u) > 0 ? 0.02 : 0.3, Math.abs(v) > 0 ? 0.02 : 0.3, 0.4);
    // (its emblem, in brass on each face: a bird's spread wings, a tower's crenels, a hanging man)
    for (const s of [-1, 1]) {
      if (p.mark === 0) { A.box('#b08a3a', 0, s * 0.265, 0.82, 0.24, 0.01, 0.04, 0, 0, 0.35); A.box('#b08a3a', 0, s * 0.265, 0.82, 0.24, 0.01, 0.04, 0, 0, -0.35); }
      else if (p.mark === 1) { A.box('#b08a3a', 0, s * 0.265, 0.62, 0.1, 0.01, 0.28); for (const u of [-0.06, 0.06]) A.box('#b08a3a', u, s * 0.265, 0.9, 0.04, 0.01, 0.05); }
      else { A.box('#b08a3a', 0, s * 0.265, 0.95, 0.02, 0.01, 0.1); A.box('#b08a3a', 0, s * 0.265, 0.66, 0.05, 0.01, 0.24); A.glow('#b08a3a', 0, s * 0.27, 0.92, 0.05); }
    }
  },
};
// the Crow: a tall standing stone at the stair's foot, a crow cut deep in its face
FPI_K.c10crow = {
  col: '#6a665c',
  sol(p) { return [fpiBox(p, 0, 0, 0.55, 0.3, 2.7)]; },
  b3(p, A) {
    A.box('#6a665c', 0, 0, -0.2, 1.1, 0.6, 2.9, 0, 0.04, 0.03); A.box('#5e5a50', 0.1, 0, 2.6, 0.8, 0.5, 0.35, 0, 0.1, 0);
    for (const s of [-1, 1]) { A.box('#2a2622', 0, s * 0.31, 1.9, 0.5, 0.02, 0.08, 0, 0, 0.45); A.box('#2a2622', 0, s * 0.31, 1.9, 0.5, 0.02, 0.08, 0, 0, -0.45); A.box('#2a2622', 0, s * 0.31, 1.75, 0.08, 0.02, 0.3); A.glow('#c8a868', 0.05, s * 0.32, 2.0, 0.05); }
  },
};
// the Hanged Man: a gibbet, a cage swinging from its arm, a long-dead wrecker in it
FPI_K.c10gibbet = {
  col: '#3a2e22',
  sol(p) { return [fpiCirc(p, 0, 0, 0.22, 4.4)]; },
  b3(p, A) {
    A.box('#3a2e22', 0, 0, -0.2, 0.3, 0.3, 4.6); A.box('#3a2e22', 0.8, 0, 4.1, 1.9, 0.22, 0.22); A.box('#3a2e22', 0.35, 0, 3.6, 0.9, 0.12, 0.12, 0, 0, 0.8);
    A.box('#2a2a2a', 1.55, 0, 3.0, 0.04, 0.04, 1.1);
    for (const [u, v] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) A.box('#222224', 1.55 + u, v, 1.2, 0.04, 0.04, 1.8);
    for (const z of [1.2, 2.0, 2.95]) A.box('#222224', 1.55, 0, z, 0.56, 0.56, 0.05);
    A.box('#cfc6b0', 1.55, 0, 2.55, 0.18, 0.16, 0.22); A.box('#5a4a3a', 1.55, 0, 1.75, 0.3, 0.2, 0.75); A.box('#cfc6b0', 1.48, 0.05, 1.25, 0.06, 0.06, 0.5); A.box('#cfc6b0', 1.62, -0.05, 1.25, 0.06, 0.06, 0.5);
    for (const s of [-1, 1]) A.box('#cfc6b0', 1.55 + s * 0.2, 0, 1.9, 0.05, 0.05, 0.5, 0, 0, s * 0.3);
  },
};

// ---------- shared on both islands: what's carried ----------
const c10iW = a => [FPSC.CX + a[0], FPSC.CY + a[1]];
const c10iZ = () => FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.c10 || null;
const c10iGround = (x, y) => FPSC.GROUND + (typeof fpsIsleH === 'function' && FPS.g ? fpsIsleH(FPS.g.isle, x, y) : 0);
const c10iAble = () => { const m = FPS.me; return !(m.dead > 0) && !zmIsDown() && !ZM.over; };
const c10Mine = () => { const L = RAID.st && RAID.st.loot; return L ? L.find(o => o.by === FPS.me.id) || null : null; };
const c10Nick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
// (hosting or alone) loot asks: take, drop
function c10LootQ(sid, k, a) {
  const S = RAID.st, L = S.loot || [];
  if (k === 'c10take') { const o = L.find(q => q.id === String(a)); if (o && !o.by && !L.some(q => q.by === sid)) o.by = sid; return true; }
  if (k === 'c10drop') { if (!Array.isArray(a)) return true; const o = L.find(q => q.by === sid); if (o) { const R = FPSC.R - 2; o.by = ''; o.x = FPSC.CX + clamp(+a[0] || 0, -R, R); o.y = FPSC.CY + clamp(+a[1] || 0, -R, R); } return true; }
  return false;
}
// (hosting) anyone carrying who's gone: it falls where they were
function c10LootKeep() {
  for (const o of RAID.st.loot || []) if (o.by && o.by !== FPS.me.id) { const r = FPS.remote.get(o.by); if (!r || !ZM.hum.some(h => h[0] === o.by)) { o.by = ''; if (r && r.x != null) { o.x = r.x; o.y = r.y; } } else if (r.down || r.dead > 0) { o.by = ''; o.x = r.x; o.y = r.y; } }
}
function c10Drop(x, y) {
  const o = c10Mine(); if (!o) return;
  raidAsk('c10drop', [Math.round((x - FPSC.CX) * 10) / 10, Math.round((y - FPSC.CY) * 10) / 10]);
  if (ZM.net === 'client') { o.by = ''; o.x = x; o.y = y; RAID.st.pend = 0.9; }
}
const c10LootPack = () => (RAID.st.loot || []).map(q => [q.id, q.k, Math.round((q.x - FPSC.CX) * 10) / 10, Math.round((q.y - FPSC.CY) * 10) / 10, q.by || '']);
function c10LootApply(a) {
  const S = RAID.st; if (!Array.isArray(a) || S.pend > 0) return;
  S.loot = a.filter(e => Array.isArray(e) && FB_LOOT[e[1]]).map(e => ({ id: String(e[0]), k: String(e[1]), x: FPSC.CX + (+e[2] || 0), y: FPSC.CY + (+e[3] || 0), by: String(e[4] || '') }));
}
function c10LootConsider(c) {
  const S = RAID.st, m = FPS.me; if (c10Mine()) { c({ k: 'c10drop' }, m.x, m.y, m.jz || 0, 0.01, false); return; }
  for (const q of S.loot || []) if (!q.by) c({ k: 'c10take', id: q.id }, q.x, q.y, m.jz || 0, C10I.USE_R, false);
}
function c10LootUse(o) {
  const S = RAID.st, m = FPS.me;
  if (o.k === 'c10take') { const q = (S.loot || []).find(x => x.id === o.id); if (!q || q.by || c10Mine()) { zmSound('no'); return true; } raidAsk('c10take', q.id); if (ZM.net === 'client') { q.by = m.id; S.pend = 0.9; } fpsFeed(`You take up ${fbLootOf(q.k).n}. Your arms are full.`); try { if (!soundOff()) tone(220, 'triangle', 0.01, 0.12, 0.08, { to: 330 }); } catch (e) {} return true; }
  if (o.k === 'c10drop') { const x = m.x + Math.sin(m.h) * 1.1, y = m.y + Math.cos(m.h) * 1.1, bl = zmBlockedAt(x, y, 0.4, 0); c10Drop(bl ? m.x : x, bl ? m.y : y); return true; }
  return false;
}
function c10LootPrompt(o) {
  const S = RAID.st, mine = c10Mine();
  if (o.k === 'c10take') { const q = (S.loot || []).find(x => x.id === o.id); return q ? { text: `Take up ${fbLootOf(q.k).n}`, free: true } : null; }
  if (o.k === 'c10drop') return mine ? { text: `Put down ${fbLootOf(mine.k).n}`, free: true } : null;
  return null;
}
// (every screen) going down drops it where you fall
function c10LootMe(dt) { const S = RAID.st; if (S.pend > 0) S.pend -= dt; const o = c10Mine(); if (o && !c10iAble()) c10Drop(FPS.me.x, FPS.me.y); }
// the drowned up out of the shore, more the more of you there are (src/fbisle.js fbIsleSpawn), at the stage's own pace
function c10Spawn(S, dt, gap, cap) {
  S.spT = (S.spT || 3) - dt; if (S.spT > 0) return;
  const n = Math.max(1, ZM.hum.length); S.spT = gap * (0.75 + Math.random() * 0.5) / Math.sqrt(n);
  if (ZM.z.filter(z => !z.dead && !z.boss).length >= cap + 2 * n) return;
  const u = Math.random(), kind = u < 0.12 ? 'run' : u < 0.7 ? 'jog' : 'walk';
  fbIsleSpawn({ kind, hp: zmHp(RAIDC.ROUND + 1) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)) });
}
// (hosting or alone) one of the bosses, already in at (x, y) (the world), rising out of the ground
function c10Boss(kind, x, y) {
  const T = ZBT[kind]; if (!T) return null;
  const n = Math.max(1, ZM.hum.length), zn = ++ZM.zc, hp = zbHpOf(kind, RAIDC.ROUND + 3, n) * 0.85;
  const z = { drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x, y, jz: -1.9, fl: 0, rr: 1.6, rr0: 1.6,
    hp, max: hp, sp: T.sp(RAIDC.ROUND + 4), st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 4, swCd: 1, ix: x, iy: y, ax: 0, ay: 0, lx: x, ly: y, raid: true };
  if (T.init) T.init(z);
  zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z;
  if (typeof ZB !== 'undefined' && ZB.seen) ZB.seen.add(zn);
  try { if (T.sound) T.sound('arrive'); } catch (e) {}
  return z;
}
const c10Hold = () => !!(FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse);

// ---------- II. Crowsnest Rock ----------
// the sights: which way each looks (0 to 7, an eighth of a circle each, from north round by east), and which way it
// should (to its mark)
function c10True(i) { const C = c10iZ(); if (!C) return 0; const a = C[C10_MARKS[i].k], b = C[C10_MARKS[C10_MARKS[i].to].k]; return ((Math.round(bearingOf(b[0] - a[0], b[1] - a[1]) / (Math.PI / 4)) % 8) + 8) % 8; }
const c10Right = i => ((RAID.st.vane || [])[i] | 0) === c10True(i);
const c10AllRight = () => [0, 1, 2].every(c10Right);
cpStage('m10crow', {
  n: 'Crowsnest Rock', map: C10I_MAP, mend: true, open: true,
  music: () => (RAID.st.c10ph | 0) === 2 ? 'cpboss' : (RAID.st.c10ph | 0) === 1 ? 'cpm10dig' : 'cpm10isle',
  prep() { c10IsleLook(C10I.CROW); },
  noGun: () => !!c10Mine(),
  speedK: () => c10Mine() ? C10I.CARRY_K : 1,
  banner: () => ({ text: 'Crowsnest Rock', t: 4.5, sub: 'Freebooters’ Sea · crags, and a stair cut in them', col: '#ffe2a8' }),
  enter() {
    const S = RAID.st;
    Object.assign(S, { c10ph: 0, vane: [0, 0, 0], dig: 0, dgr: {}, digT: 0, loot: [], pend: 0, spT: 6, said: 0, myDig: 0, sent: 0, bossId: '', c10T: 0 });
    if (ZM.net !== 'client') {
      for (let i = 0; i < 3; i++) S.vane[i] = (c10True(i) + 2 + ((Math.random() * 5) | 0)) % 8;
      cpObjective('Turn the three sights true, as the chart says');
      const C = c10iZ(); if (C) cpWaypoint(C.crow[0], C.crow[1], 'The Crow', 1.6);
    }
    { const C = c10iZ(); if (C) FPS.me.h = bearingOf(-C.land[0], -C.land[1]); }
  },
  tick(dt) {
    const S = RAID.st, C = c10iZ(); if (!C) return;
    S.c10T += dt;
    c10LootKeep();
    const ph = S.c10ph | 0;
    if (!S.said && S.c10T > 3) { S.said = 1; cpSay('mate', 'The chart says the Crow looks to the Tower, the Tower to the Hanged Man, and the Hanged Man back to the Crow.', 'cp_m10_32'); }
    if (ph === 0) {
      c10Spawn(S, dt, 6.5, 2);
      // (the next sight that isn't true, for the marker)
      const i = [0, 1, 2].find(j => !c10Right(j)); if (i == null) { S.c10ph = 1; cpWaypoint(C.x[0], C.x[1], 'Dig here', 0.4); cpCine('m10_agree', () => { cpObjective('Dig where the sights agree (hold Use), and keep the drowned off'); cpSay('mate', 'Spades! And somebody watch the shore. They’ll have heard us.', 'cp_m10_33'); }); }
      else if (S.wpI !== i) { S.wpI = i; const p = C[C10_MARKS[i].k]; cpWaypoint(p[0], p[1], C10_MARKS[i].n.replace(/^the /, 'The '), 1.6); }
    } else if (ph === 1) {
      // the dig: every one of you holding Use at the spot (heard from within the last half second), two at most
      const now = RAID.t; let n = 0; for (const k in S.dgr) if (now - S.dgr[k] < 0.5) n++; else delete S.dgr[k];
      if (n) S.dig = Math.min(1, S.dig + dt * Math.min(2, n) / C10I.DIG_T * (n > 1 ? 0.75 : 1));
      c10Spawn(S, dt, 2.2, 5);
      if (S.dig > 0.45 && !S.said2) { S.said2 = 1; cpSay('crew', 'Wood! There’s wood under here!', 'cp_m10_34'); }
      if (S.dig >= 1) {
        S.c10ph = 2; cpWaypoint(null);
        const [wx, wy] = c10iW(C.x);
        cpCine('m10_open', () => { const z = c10Boss('moon', wx + 1.5, wy + 1.5); if (z) S.bossId = z.id; cpObjective('Put down the Mooncusser'); });
      }
    } else if (ph === 2) {
      c10Spawn(S, dt, 5, 2);
      if (S.bossId && !ZM.z.some(z => z.id === S.bossId && !z.dead) && !cpCineOn()) {
        S.c10ph = 3; const [wx, wy] = c10iW(C.x);
        S.loot = [{ id: 'h', k: 'c10chest', x: wx, y: wy, by: '' }];
        cpObjective('Carry the hoard down to the landing boat'); cpWaypoint(C.boat[0], C.boat[1], 'The landing boat', 0.8);
        cpSay('mate', 'He’s down. Take up the chest, and the rest of you keep them off whoever carries it.', 'cp_m10_35');
      }
    } else if (ph === 3) {
      c10Spawn(S, dt, 3, 4);
      const o = S.loot.find(q => q.by), w = o ? (o.by === FPS.me.id ? FPS.me : FPS.remote.get(o.by)) : null;
      if (S.sent !== (o ? o.by : '')) { S.sent = o ? o.by : ''; if (o) cpWaypoint(C.boat[0], C.boat[1], 'The landing boat', 0.8); else if (S.loot[0]) cpWaypoint(S.loot[0].x - FPSC.CX, S.loot[0].y - FPSC.CY, 'The hoard', 0.6); }
      void w;
    }
  },
  me(dt) {
    const S = RAID.st, C = c10iZ(), m = FPS.me; if (!C) return;
    c10LootMe(dt);
    // digging: hold Use at the spot
    const o = ZM.near, hold = c10Hold() && o && o.k === 'c10dig' && c10iAble() && (S.c10ph | 0) === 1;
    S.myDig = hold ? 1 : 0;
    if (hold) { if (ZM.net === 'client') { S.digAsk = (S.digAsk || 0) - dt; if (S.digAsk <= 0) { S.digAsk = 0.25; raidAsk('c10dig'); } } else S.dgr[m.id] = RAID.t; S.digSnd = (S.digSnd || 0) - dt; if (S.digSnd <= 0) { S.digSnd = 0.55; try { if (!soundOff()) noise('lowpass', 700, 1, 0.005, 0.22, 0.25, { to: 200 }); } catch (e) {} } }
  },
  q(sid, k, a) {
    const S = RAID.st, C = c10iZ(); if (!C) return;
    if (c10LootQ(sid, k, a)) return;
    if (k === 'c10turn') { const i = a | 0; if ((S.c10ph | 0) === 0 && i >= 0 && i < 3) { S.vane[i] = ((S.vane[i] | 0) + 1) % 8; } return; }
    if (k === 'c10dig') { if ((S.c10ph | 0) === 1) S.dgr[sid] = RAID.t; return; }
    if (k === 'c10stow') { const o = (S.loot || []).find(q => q.by === sid); if (o && (S.c10ph | 0) === 3) { S.loot = []; S.c10ph = 4; FB.hold.push('c10chest'); cpWaypoint(null); cpObjective(''); cpSay('mate', 'In the boat with it. Back aboard, all of you, and quick.', 'cp_m10_36'); cpDone(); } return; }
  },
  pack(o) { const S = RAID.st; o.c10i = [S.c10ph | 0, S.vane.slice(), Math.round(S.dig * 100) / 100, S.bossId || '']; o.c10l = c10LootPack(); },
  apply(o) {
    const S = RAID.st;
    if (Array.isArray(o.c10i)) { S.c10ph = o.c10i[0] | 0; if (Array.isArray(o.c10i[1]) && !(S.turnP > 0)) S.vane = o.c10i[1].map(v => (v | 0) % 8); S.dig = +o.c10i[2] || 0; S.bossId = String(o.c10i[3] || ''); }
    c10LootApply(o.c10l);
  },
  consider(c) {
    const S = RAID.st, C = c10iZ(), m = FPS.me, mz = m.jz || 0; if (!C) return;
    const ph = S.c10ph | 0;
    if (ph === 0) C10_MARKS.forEach((M, i) => { const [x, y] = c10iW(C[M.k]); c({ k: 'c10vane', i }, x, y, mz, 2.0, false); });
    if (ph === 1) { const [x, y] = c10iW(C.x); c({ k: 'c10dig' }, x, y, mz, 2.4, false); }
    if (ph === 3) { const mine = c10Mine(); if (mine) { const [bx, by] = c10iW(C.boat); if (Math.hypot(bx - m.x, by - m.y) < C10I.BOAT_R + 0.5) { c({ k: 'c10stow' }, bx, by, mz, C10I.BOAT_R + 0.5, false); return; } } c10LootConsider(c); }
  },
  prompt(o) {
    const S = RAID.st;
    if (o.k === 'c10vane') { const M = C10_MARKS[o.i], v = (S.vane[o.i] | 0); return { text: c10Right(o.i) ? `${cap1(M.n)}’s sight is true: it looks ${C10_DIRS[v]}, to ${C10_MARKS[M.to].n}` : `Turn ${M.n}’s sight (it looks ${C10_DIRS[v]}; the chart says to ${C10_MARKS[M.to].n})`, free: true }; }
    if (o.k === 'c10dig') return { text: `Hold to dig where the sights agree (${Math.round(S.dig * 100)}%)`, hold: true };
    if (o.k === 'c10stow') return { text: 'Stow the hoard in the landing boat, and back aboard', free: true };
    return c10LootPrompt(o);
  },
  use(o) {
    const S = RAID.st;
    if (o.k === 'c10vane') { raidAsk('c10turn', o.i); if (ZM.net === 'client') { S.vane[o.i] = ((S.vane[o.i] | 0) + 1) % 8; S.turnP = 0.6; setTimeout(() => { S.turnP = 0; }, 600); } try { if (!soundOff()) { tone(520, 'triangle', 0.005, 0.06, 0.08, { to: 640 }); noise('bandpass', 2400, 3, 0.002, 0.05, 0.06); } } catch (e) {} return true; }
    if (o.k === 'c10dig') return true;
    if (o.k === 'c10stow') { raidAsk('c10stow'); return true; }
    return c10LootUse(o);
  },
  kill(d) {},
  hud(phone, mono, fell) {
    const S = RAID.st, ph = S.c10ph | 0;
    // the chart, in the corner, while the sights want turning
    if (ph === 0 && !ZM.over) {
      const R = Math.max(14, FPS.safeRight || 0), w = phone ? 190 : 260, x0 = W - R - w, y0 = fpsHudTop() + (phone ? 70 : 96), lh = phone ? 15 : 19;
      ctx.fillStyle = 'rgba(40,32,22,0.72)'; ctx.fillRect(x0 - 8, y0 - 8, w + 16, lh * 4 + 16);
      ctx.strokeStyle = 'rgba(216,190,140,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 8, y0 - 8, w + 16, lh * 4 + 16);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = '#e8d8b0'; ctx.fillText('THE CHART · GILT & GULL', x0, y0);
      ctx.font = fell(phone ? 12 : 15);
      C10_MARKS.forEach((M, i) => { const ok = c10Right(i); ctx.fillStyle = ok ? '#ffd88a' : 'rgba(232,220,192,0.85)'; ctx.fillText(`${ok ? '✓' : '·'} ${cap1(M.n)} looks to ${C10_MARKS[M.to].n}`, x0, y0 + lh * (i + 1)); });
    }
    // the dig's progress
    if (ph === 1 && !ZM.over) {
      const bw = phone ? 160 : 240, x0 = cx - bw / 2, y0 = H - (phone ? 150 : 104);
      ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x0 - 4, y0 - 4, bw + 8, 14);
      ctx.fillStyle = '#c8a068'; ctx.fillRect(x0, y0, bw * S.dig, 6);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.85)';
      ctx.fillText(`DUG · ${Math.round(S.dig * 100)}%${S.myDig ? ' · DIGGING' : ''}`, cx, y0 + 10);
    }
    ctx.textBaseline = 'alphabetic';
  },
  b3(grp) {
    fbi3dBuild(grp);
    const C = c10iZ(); if (!C) return;
    const brass = z3Lam('#b08a3a', { emissive: 0x1a1206 }), dark = z3Lam('#2a2622'), G = C10I3;
    G.v = C10_MARKS.map(M => {
      const [x, y] = c10iW(C[M.k]), g0 = new THREE.Group(); g0.position.copy(z3v(x, y, c10iGround(x, y) + 1.22)); grp.add(g0);
      const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8), dark); piv.position.y = 0.06; g0.add(piv);
      const R = new THREE.Group(); R.position.y = 0.16; g0.add(R);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.72, 10), brass); tube.rotation.x = Math.PI / 2; tube.position.z = -0.12; R.add(tube);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12), brass); ring.position.z = -0.48; R.add(ring);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      R.add(beam);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,220,140,0.9)', 'rgba(255,220,140,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); gl.scale.setScalar(1.1); gl.position.z = -0.5; R.add(gl);
      return { g0, R, beam, gl, a: 0 };
    });
    // the spot: unmarked until the sights agree, then a glow on the ground, a hole as it's dug
    const [x, y] = c10iW(C.x), z0 = c10iGround(x, y);
    G.x = new THREE.Group(); G.x.position.copy(z3v(x, y, z0)); grp.add(G.x);
    G.hole = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.7, 0.1, 18), new THREE.MeshBasicMaterial({ color: 0x0c0a08 })); G.hole.position.y = 0.03; G.x.add(G.hole);
    G.heap = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, 6.283, 0, Math.PI / 2), z3Lam('#5a4a36')); G.heap.position.set(1.7, 0, 0.6); G.x.add(G.heap);
    G.xg = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,216,138,0.9)', 'rgba(255,216,138,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); G.xg.scale.setScalar(3); G.xg.position.y = 0.4; G.x.add(G.xg);
    G.lid = new THREE.Group(); G.x.add(G.lid);
    { const ch = fbLootMesh('c10chest'); ch.position.y = -0.25; G.lid.add(ch); const lan = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.2), z3Lam('#2a3a28')); lan.position.set(0.1, 0.45, 0); G.lid.add(lan); const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(110,255,140,0.9)', 'rgba(110,255,140,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lg.scale.setScalar(1.6); lg.position.set(0.1, 0.5, 0); G.lid.add(lg); }
  },
  f3(dt) {
    fbi3d(dt);
    const S = RAID.st, C = c10iZ(), G = C10I3; if (!C || !G.v) return;
    const t = g.t, ph = S.c10ph | 0;
    G.v.forEach((o, i) => {
      const want = -(S.vane[i] | 0) * Math.PI / 4; o.a += angDiff(want, o.a) * Math.min(1, dt * 8); o.R.rotation.y = o.a;
      const ok = c10Right(i), M = C10_MARKS[i], a = C[M.k], b = C[C10_MARKS[M.to].k], L = Math.hypot(b[0] - a[0], b[1] - a[1]) - 0.6;
      o.beam.scale.z = L; o.beam.position.z = -L / 2 - 0.5; o.beam.material.opacity = ok && ph <= 1 ? 0.28 + 0.12 * Math.sin(t * 3 + i) : 0;
      o.gl.material.opacity = ok ? 0.8 : 0.15 + 0.1 * Math.sin(t * 2 + i);
    });
    const dg = S.dig || 0;
    G.hole.visible = ph >= 1 && dg > 0.02; G.hole.scale.set(0.4 + dg * 0.9, 1, 0.4 + dg * 0.9);
    G.heap.visible = dg > 0.02; G.heap.scale.set(0.3 + dg * 0.8, 0.15 + dg * 0.55, 0.3 + dg * 0.6);
    G.xg.material.opacity = ph === 1 ? 0.55 + 0.25 * Math.sin(t * 3) : 0;
    G.lid.visible = ph === 2 || (CPN.on && CPN.on.id === 'm10_open');
  },
  exit() { C10I3.v = null; FBI3.on = false; },
});
const C10I3 = { v: null };
const cap1 = s => s.replace(/^the /, 'The ');
// the sights agree: the beams swing down to the spot
cpCineDef('m10_agree', { music: 'cpm10cine', shots: [
  c10Live(5.5, (t, k) => { const M = c10Marks(), X = M.x, c = [(M.crow[0] + M.tower[0] + M.hang[0]) / 3, (M.crow[1] + M.tower[1] + M.hang[1]) / 3]; return { cam: c10Mix([c[0] + 18, c[1] - 18, 16], [X[0] + 7, X[1] - 7, 5], k), look: [X[0], X[1], 0.5] }; },
    { lines: [[0.3, 'crew', 'All three true! And look where they’re pointing now.', 'cp_m10_37'], [2.8, 'log', 'Where the hoarder’s sights agreed, the turf was older than the rest.', 'cp_m10_38']], sfx: [[0.2, 'powerup', 0.5]],
      f(t, k) { const G = C10I3; if (!G.v) return; const C = c10iZ(); if (!C) return; for (const o of G.v) { o.beam.material.opacity = 0.4 * (1 - k); } if (G.xg) G.xg.material.opacity = 0.9 * k; } }),
] });
// the chest, opened before you, and what keeps it
cpCineDef('m10_open', { music: 'cpboss', shots: [
  c10Live(4.5, (t, k) => { const X = c10Marks().x; return { cam: c10Mix([X[0] + 2.6, X[1] - 2.6, 2.6], [X[0] + 1.6, X[1] - 1.6, 1.8], k), look: [X[0], X[1], 0] }; },
    { lines: [[0.3, 'mate', 'Somebody’s had the lid off before us. Half of it’s gone.', 'cp_m10_39'], [2.6, 'crew', 'And a green lamp left on top. Mooncussers.', 'cp_m10_40']], sfx: [[0.2, 'chest', 0.8]] }),
  c10Live(4, (t, k) => { const X = c10Marks().x; return { cam: c10Mix([X[0] + 8, X[1] - 7, 3], [X[0] + 9, X[1] - 9, 4.5], k), look: [X[0], X[1], 1.6 + k] }; },
    { lines: [[0.4, 'log', 'Gilt and Gull’s charts are true one time in three. The other times there is something worse than nothing under them. This time there was both.', 'cp_m10_41']], sfx: [[0.3, 'bossmoon', 0.9]], shake: 0.4 }),
] });

// ---------- IV. Saltcote ----------
const C10P3 = { f: null, c: null };
cpStage('m10port', {
  n: 'Saltcote', map: C10I_MAP, mend: true, open: true,
  music: () => 'cpm10port',
  prep() { c10IsleLook(0); },
  banner: () => ({ text: 'Saltcote', t: 4.5, sub: 'Freebooters’ Sea · the outpost', col: '#ffe2a8' }),
  noGun: () => !!c10Mine(),
  speedK: () => c10Mine() ? C10I.CARRY_K : 1,
  enter() {
    const S = RAID.st, C = c10iZ();
    Object.assign(S, { loot: [], pend: 0, sold: 0, said: 0, sentWp: '' });
    if (ZM.net !== 'client' && C) {
      const [bx, by] = c10iW(C.boat);
      S.loot = [{ id: 'a', k: 'c10chest', x: bx - 1.2, y: by + 0.4, by: '' }, { id: 'b', k: 'c10half', x: bx + 1.2, y: by - 0.4, by: '' }];
      FB.hold = FB.hold.filter(k => k !== 'c10chest' && k !== 'c10half');
      cpObjective('Carry the hoard up to the factor’s table, both halves');
      cpWaypoint(C.boat[0], C.boat[1], 'The landing boat', 0.8);
    }
    if (C) FPS.me.h = bearingOf(C.table[0] - C.land[0], C.table[1] - C.land[1]);
  },
  tick(dt) {
    const S = RAID.st, C = c10iZ(); if (!C) return;
    c10LootKeep();
    // the marker: to the table while anyone's carrying, else to what's still lying
    const carrying = S.loot.some(q => q.by), key = carrying ? 't' : S.loot.length ? 'b' : '';
    if (key !== S.sentWp) { S.sentWp = key; if (key === 't') cpWaypoint(C.table[0], C.table[1], 'The factor’s table', 1.2); else if (key === 'b') cpWaypoint(S.loot[0].x - FPSC.CX, S.loot[0].y - FPSC.CY, 'The hoard', 0.6); else cpWaypoint(null); }
  },
  me(dt) { c10LootMe(dt); },
  q(sid, k, a) {
    const S = RAID.st;
    if (c10LootQ(sid, k, a)) return;
    if (k === 'c10sell') {
      const o = S.loot.find(q => q.by === sid); if (!o) return;
      S.loot.splice(S.loot.indexOf(o), 1); S.sold++; C10.gold += fbLootOf(o.k).v;
      if (S.sold === 1) cpSay('factor', o.k === 'c10half' ? 'A strongbox, and a Mooncusser’s by the look of it. I’ll not ask how.' : 'Ironbound, and heavy. Set it down gently on my table.', 'cp_m10_42');
      if (!S.loot.length) {
        const rest = FB.hold.slice(), v = rest.reduce((n, k2) => n + fbLootOf(k2).v, 0); C10.gold += v; FB.hold = [];
        cpSay('factor', rest.length ? `And the rest of your hold besides. ${fbSov(C10.gold)}, all told.` : `${fbSov(C10.gold)}, all told. A fair night’s work.`, 'cp_m10_43');
        cpObjective(''); cpWaypoint(null);
        setTimeout(() => { if (RAID.on && CP.on && raidStage() === RAID_STAGES.cp_m10port) cpDone(); }, 2600);
      }
    }
  },
  pack(o) { const S = RAID.st; o.c10l = c10LootPack(); o.c10p = [S.sold | 0, C10.gold | 0]; },
  apply(o) { c10LootApply(o.c10l); if (Array.isArray(o.c10p)) { RAID.st.sold = o.c10p[0] | 0; C10.gold = o.c10p[1] | 0; } },
  consider(c) {
    const C = c10iZ(), m = FPS.me; if (!C) return;
    const mine = c10Mine(), [tx, ty] = c10iW(C.table);
    if (mine && Math.hypot(tx - m.x, ty - m.y) < C10I.TABLE_R + 0.6) { c({ k: 'c10sell' }, tx, ty, m.jz || 0, C10I.TABLE_R + 0.6, false); return; }
    c10LootConsider(c);
  },
  prompt(o) { if (o.k === 'c10sell') { const mine = c10Mine(); return mine ? { text: `Set ${fbLootOf(mine.k).n} on the factor’s table`, free: true } : null; } return c10LootPrompt(o); },
  use(o) { if (o.k === 'c10sell') { raidAsk('c10sell'); try { if (!soundOff()) for (let i = 0; i < 4; i++) tone(1400 + i * 120, 'triangle', 0.002, 0.08, 0.05, { delay: i * 0.07 }); } catch (e) {} return true; } return c10LootUse(o); },
  hud(phone, mono) {
    const S = RAID.st; if (ZM.over) return;
    const R = Math.max(14, FPS.safeRight || 0); ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = '#ffd88a';
    ctx.fillText(`WEIGHED · ${S.sold | 0} OF 2${C10.gold ? ' · ' + fbSov(C10.gold).toUpperCase() : ''}`, W - R, fpsHudTop() + (phone ? 70 : 96));
    ctx.textBaseline = 'alphabetic';
  },
  b3(grp) {
    fbi3dBuild(grp);
    const C = c10iZ(); if (!C) return;
    // the factor behind his table, and Gilt & Gull's clerk by the voyage board
    C10P3.f = cpkNpc(['#3a3428', '#d8ccb0', '#8a6a3a', '#ffd88a']); C10P3.c = cpkNpc(['#2a2c34', '#e0d8c4', '#5a5a6a', '#ffd88a']);
  },
  f3(dt) {
    fbi3d(dt);
    const C = c10iZ(); if (!C) return;
    const m = FPS.me, [tx, ty] = c10iW(C.table), a = C.tableA || 0, fx = tx - Math.sin(a) * 0.95, fy = ty + Math.cos(a) * 0.95;
    if (C10P3.f) cpkNpcPose(C10P3.f, { x: fx, y: fy, h: bearingOf(m.x - fx, m.y - fy), noGun: true, lan: false });
    if (C10P3.c && C.board) { const [bx, by] = c10iW(C.board), cx2 = bx + 1.2, cy2 = by - 0.6; cpkNpcPose(C10P3.c, { x: cx2, y: cy2, h: bearingOf(m.x - cx2, m.y - cy2), noGun: true, lan: true }); }
  },
  exit() { cpkNpcFree(C10P3.f); cpkNpcFree(C10P3.c); C10P3.f = C10P3.c = null; FBI3.on = false; },
});
