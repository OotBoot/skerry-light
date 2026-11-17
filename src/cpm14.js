'use strict';
// The Chronicle of the Light, mission 14: The Drowned Reach (Act V, the years after). The last mission, and the end
// of the campaign. When the sea came back it brought the people of every sea and every year, and they went to war for
// the islands round the Light (src/lore.js ch_reach, reachwars). Whoever holds the Light's rock is called the Keeper;
// none of the nations has lit it. You land in the middle of the war, cross the drying shoals to the rock at low water,
// take it from the Ember Isles' garrison, carry the oil up, and light the Light: and so become its Keepers. Then the
// last page of the log, the tales out of their order, and Maren still rowing out to the Gannet.
//
// Four parts (src/cpm14x.js, src/cpm14y.js) and the cinematics (src/cpm14z.js):
//  I.   The Landing (cp_rchland). Dusk on a holm at the edge of the Reach, held by the Ember Isles: up the beach
//       through their gabions, light their dead beacon, then keep it fed with tarred faggots through the first dark
//       while the drowned rise on every shore it doesn't reach, until the tide goes out (m14_tide).
//  II.  The Shoal Road (cp_rchshoal). Night, low water. The shoal dries into a road across the Reach to the Light,
//       and Plimsoll walks it ahead of you. He won't walk on into the dark: light each cairn for him. The flood comes
//       back over the road behind you, the drowned rise out of the wet sand, an old bell lies on the shoal, and the
//       Ice-folk hold a stranded hulk across the way.
//  III. The Keeper's Rock (cp_rchrock). The Light's rock from its north side, the back of the keeper's station (the
//       Store Hall's long wall, the two walled yards, the tower over them all), which the Ember Isles have made a
//       battery (m14_rock). Take it; their Commodore comes out to hold it himself; then carry the Light's oil, which
//       they hoarded in the west yard, to the station's back door while the drowned climb the dark rock.
//  IV.  The Light (cp_rchlamp). Up the ninety treads (m14_climb) to the lantern room and its gallery (m14_lens), where
//       the Lampwright waits by his lens. Light it, then keep it lit: pump the oil, wind the clockwork, and the beam
//       turns, burning the drowned that climb over the gallery rail and showing the nations' fire-ships the rocks
//       until they sheer off. Then m14_keepers, and the epilogue (m14_outro).
//
// This file: the mission, its people, the shared world (the looks, the props, the authentic tower and lantern laid
// where a part asks, the Reach on the horizon, the night), the soldiers of the nations (their muskets, telegraphed,
// fair), the beacons, the drowned rising on dark shores, carrying, holding Use, the HUD, and every part's defaults.
// Places stay as the rest of the game has them: the tower and lantern are src/zombies.js's own (zm3dTower,
// zm3dLantern), laid at their height or lifted; the station round it is laid on src/zombies.js's own room plan
// (ZM_ZONES), seen from its unseen north side.
// Together it's host-authoritative: the host runs the soldiers, beacons, Plimsoll, the flood, the fire-ships and
// the drowned, and sends them in the part's word (o.rch, o.rchs); joined players ask with raidAsk.
// Voice lines: cp_m14_01 to cp_m14_99 (campaign-sound/m14.md).

cpMission({ id: 'm14', act: 5, n: 'The Drowned Reach', when: 'The years after', where: 'The Light, in the middle of the Reach',
  blurb: "The sea came back with the people of every sea and year, and they went to war for the islands round the Light. Cross the Reach at low water, take the Light's rock, and light it.",
  stages: ['cp_rchland', 'cp_rchshoal', 'cp_rchrock', 'cp_rchlamp'], intro: 'm14_intro', outro: 'm14_outro',
  cut: { 2: 'm14_rock', 3: 'm14_lens' }, after: { 0: 'm14_tide', 2: 'm14_climb', 3: 'm14_keepers' },
  music: { default: 'cpm14war' }, lives: 2,
  stop() { rchFreeAll(); } });

cpCast('rchmate', { n: 'The Wren’s Mate', c: '#c8d8a0' });
cpCast('rchember', { n: 'An Ember Isles Captain', c: '#ff9a6a' });
cpCast('rchcomm', { n: 'The Ember Commodore', c: '#ff7a4a' });
cpCast('rchice', { n: 'An Ice-folk Sergeant', c: '#b8e0ff' });
// (music not yet recorded plays one that is)
Object.assign(CP_MUSIC_FALL, { cpm14war: 'frisle', cpm14dark: 'raidcave', cpm14shoal: 'frsail', cpm14rock: 'frboss', cpm14lamp: 'frboss2', cpm14keep: 'gwwin', cpm14end: 'raidpier' });

// BEA_R: a lit beacon's reach at its fullest; BEA_USE: seconds to light one; SOL_AIM: a musket's aim before it
// fires (it tracks you for the first 70%: then step aside); SOL_DMG: what a ball does (you can take three);
// SOL_RANGE: how far they'll shoot; CARRY_K: how quick you are with a load
var RCHC = { BEA_R: 10, BEA_USE: 3, SOL_AIM: 1.45, SOL_DMG: 2, SOL_RANGE: 40, SOL_MISS: 0.95, CARRY_K: 0.78, PLIM_R: 6 };
var RCH = { on: false, F: [], npc: null, said: {} };
var RCH3 = { on: false };
const rchN = () => Math.max(1, (ZM.hum || []).length);
const rchW = (x, y) => [FPSC.CX + x, FPSC.CY + y];
const rchL = (x, y) => [x - FPSC.CX, y - FPSC.CY];
const rchNick = sid => sid === FPS.me.id ? (ZM.net ? ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'You' : 'You') : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'A shipmate';
function rchLine(s) { fpsFeed(s); if (ZM.net === 'host' && typeof zmnEvent === 'function') zmnEvent('feed', s); }
// (hosting or alone) a line said once only this part
const rchSay = (k, who, text, vo) => { const S = RAID.st; if (!S.said) S.said = {}; if (S.said[k]) return false; S.said[k] = 1; cpSay(who, text, vo); return true; };
// everyone standing (hosting: from zmPlayers): { sid, x, y, down }
function rchCrew() {
  const P = typeof zmPlayers === 'function' ? zmPlayers() : [{ sid: FPS.me.id, x: FPS.me.x, y: FPS.me.y }];
  return P.filter(p => p && isFinite(p.x)).map(p => { const r = p.sid === FPS.me.id ? null : FPS.remote && FPS.remote.get(p.sid); return { sid: p.sid, x: p.x, y: p.y, down: p.sid === FPS.me.id ? zmIsDown() || FPS.me.dead > 0 : !!(r && (r.down || r.dead)) }; });
}

// =====================================================================================================================
// the world: two looks (the islands' own ground, or none, out on the shoals), laid out by the part
// =====================================================================================================================
FPS_ISLES.cprch = Object.assign({}, FPS_ISLES.shingle, { name: 'the Reach', rocks: [5, 2.5, 5, 0.9], wrecks: [0], birds: ['gull', 0], tufts: ['#4e5a3e', 40], pebbles: 120, pools: 4, wrack: 40, fog: ['#10141c', 60, 700] });
FPS_ISLES.cprchw = Object.assign({}, FPS_ISLES.shingle, { name: 'the shoals of the Reach', noGround: true, rocks: [0, 3, 6, 1], wrecks: [0], birds: ['gull', 0], tufts: ['#4e5a3e', 0], pebbles: 0, pools: 0, wrack: 0, fog: ['#0c1018', 60, 600] });
FPS_ISLES.cprchg = Object.assign({}, FPS_ISLES.shingle, { name: 'the Light’s gallery', noGround: true, rocks: [0, 3, 6, 1], wrecks: [0], birds: ['gull', 0], tufts: ['#4e5a3e', 0], pebbles: 0, pools: 0, wrack: 0, fog: ['#0c1018', 200, 1400] });
function rchGen() {
  return { built: true, decor() {},
    set(H) {
      const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [], glass: [] };
      const St = raidStage() || {};
      // the Light's tower and lantern, src/zombies.js's own, wherever the part puts them (zm3dTower, zm3dLantern draw
      // them about ZM_TC; rch3d moves them to St.rchTower once they're built)
      if (St.rchTower) { Z.tower = { x: FPSC.CX + ZMT.X, y: FPSC.CY + ZMT.Y, r: ZMT.R, L: ZMT.L.slice(), open: {} }; Z.top = { x: FPSC.CX + ZMT.X, y: FPSC.CY + ZMT.Y, r: ZMT.GLASS - 0.2, z: ZMT.L[5] }; }
      if (St.rchSet) St.rchSet(H, zmKit(H, Z), Z);
    } };
}
FPI_GEN.cprch = rchGen(); FPI_GEN.cprchw = rchGen(); FPI_GEN.cprchg = rchGen();

// ---------- the props ----------
const RCHP = { white: '#e6e0d2', white2: '#cfc8b8', slate: '#2e3236', slate2: '#3a3f44', gran: '#5e6064', ember: '#b8401c', ember2: '#ffb050', ice: '#a8c8dc', ice2: '#e8f4ff', earth: '#4a3e30' };
Object.assign(FPI_K, {
  // a gabion: a wicker basket of earth, waist high (cover from muskets: chest-high ones block a ball)
  rchgab: { col: '#5a4a30', sol(p) { return [fpiCirc(p, 0, 0, 0.55, p.hh || 1.25)]; },
    b3(p, A) { const hh = p.hh || 1.25; A.cyl('#6a5636', 0, 0, 0, 0.55, hh, 0, 0, 0, 'cyl8'); A.cyl(RCHP.earth, 0, 0, hh - 0.05, 0.5, 0.12, 0, 0, 0, 'cyl8'); for (let i = 0; i < 4; i++) A.part('torus', '#4a3c24', 0, 0, 0.2 + i * (hh - 0.3) / 3, 0.56, 0.56, 0.4, 0, Math.PI / 2, 0); } },
  // a nation's banner on a pole
  rchflag: { col: FPI_C.wood3, sol(p) { return [fpiCirc(p, 0, 0, 0.12, 5)]; },
    b3(p, A) { A.cyl(FPI_C.wood3, 0, 0, -0.2, 0.07, 5.4, 0, 0, 0, 'cyl6'); A.box(p.c || RCHP.ember, 0.85, 0, 4.4, 1.6, 0.03, 1.0, 0, 0, 0.06); A.box(p.c2 || RCHP.ember2, 0.85, -0.02, 4.4, 0.5, 0.01, 0.5, Math.PI / 4); A.part('sph', FPI_C.brass, 0, 0, 5.25, 0.12, 0.12, 0.12); } },
  // a whitewashed building (the station's rooms, seen from outside): walls, a slate roof, its windows dark or lit
  rchhouse: { col: RCHP.white, sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh + 2)]; },
    b3(p, A) {
      const w = p.w, d = p.d, hh = p.hh, rh = Math.min(w, d) * 0.22 + 0.6;
      A.box(p.wall || RCHP.white, 0, 0, 0, w, d, hh); A.box(RCHP.gran, 0, 0, 0, w + 0.12, d + 0.12, 0.45);
      // (the roof along its longer side: two slopes)
      const along = w >= d, L = (along ? w : d) + 0.3, S = (along ? d : w) / 2 + 0.25, ang = Math.atan2(rh, S), sl = Math.hypot(rh, S);
      for (const s of [-1, 1]) { if (along) A.box(s > 0 ? RCHP.slate : RCHP.slate2, 0, s * S / 2, hh + rh / 2 - 0.05, L, sl, 0.12, 0, -s * ang, 0); else A.box(s > 0 ? RCHP.slate : RCHP.slate2, s * S / 2, 0, hh + rh / 2 - 0.05, sl, L, 0.12, 0, 0, s * ang); }
      if (along) for (const s of [-1, 1]) A.box(p.wall || RCHP.white, s * (w / 2 - 0.05), 0, hh, 0.1, d * 0.98, rh * 0.95); else for (const s of [-1, 1]) A.box(p.wall || RCHP.white, 0, s * (d / 2 - 0.05), hh, w * 0.98, 0.1, rh * 0.95);
      // (windows along its faces, where the part asks: p.win [[side, at], ...]: side 0 +y, 1 -y, 2 +x, 3 -x)
      for (const [side, at, lit] of p.win || []) { const c = lit ? '#ffd890' : '#1a1e22', yy = side < 2 ? (side ? -d / 2 - 0.03 : d / 2 + 0.03) : at, xx = side < 2 ? at : (side === 2 ? w / 2 + 0.03 : -w / 2 - 0.03); if (side < 2) { A.box(c, xx, yy, 1.0, 1.1, 0.04, 1.3); A.box(RCHP.gran, xx, yy, 0.92, 1.3, 0.12, 0.08); } else { A.box(c, xx, yy, 1.0, 0.04, 1.1, 1.3); A.box(RCHP.gran, xx, yy, 0.92, 0.12, 1.3, 0.08); } }
      for (const [side, at] of p.door || []) { const yy = side ? -d / 2 - 0.04 : d / 2 + 0.04; A.box('#3a2a1c', at, yy, 0, 1.3, 0.08, 2.3); A.box(RCHP.gran, at, yy, 2.3, 1.7, 0.16, 0.25); for (const s of [-1, 1]) A.box(RCHP.gran, at + s * 0.75, yy, 0, 0.2, 0.16, 2.3); }
      if (p.chim) A.box(RCHP.white2, w * 0.3, 0, hh, 0.7, 0.7, rh + 1.1);
    } },
  // a drystone wall run (the yards' walls; low enough to see over, high enough to stop you)
  rchdry: { col: FPI_C.stone2, sol(p) { return [fpiBox(p, 0, 0, p.len / 2, 0.35, p.hh || 1.3)]; },
    b3(p, A) { const hh = p.hh || 1.3, n = Math.max(2, Math.round(p.len / 0.8)); A.box(FPI_C.stone2, 0, 0, 0, p.len, 0.62, hh - 0.15); for (let i = 0; i < n; i++) A.part('ico', i % 3 ? FPI_C.stone : FPI_C.stone3, -p.len / 2 + (i + 0.5) * p.len / n, (A.r() - 0.5) * 0.2, hh - 0.12, 0.42, 0.18, 0.36, A.r() * 3); } },
  // the oil the garrison hoarded: casks under a tarpaulin (Z: what's left is the part's to draw)
  rchoil: { col: '#4a3626', sol(p) { return [fpiBox(p, 0, 0, 1.4, 0.9, 1.3)]; },
    b3(p, A) { for (let i = 0; i < 6; i++) A.cyl(i % 2 ? '#5a4430' : '#4a3626', -1 + (i % 3) * 1, i < 3 ? -0.45 : 0.45, 0, 0.42, 1.1, 0, 0, 0, 'cyl8'); A.box('#2c3a2c', 0, 0, 1.1, 2.9, 1.9, 0.08, 0, 0.05); A.box('#c8b080', 0, 0.97, 0.7, 1.2, 0.02, 0.35); } },
  // a woodpile of tarred faggots for the beacon
  rchwood: { col: FPI_C.tar, sol(p) { return [fpiBox(p, 0, 0, 1.2, 0.8, 1.0)]; },
    b3(p, A) { for (let i = 0; i < 9; i++) A.log(i % 2 ? FPI_C.tar : FPI_C.wood3, -0.8 + (i % 3) * 0.8, (A.r() - 0.5) * 0.3, 0.2 + Math.floor(i / 3) * 0.3, 0.16, 1.5, Math.PI / 2 + (A.r() - 0.5) * 0.3, 0); A.cyl(FPI_C.wood3, 1.1, 0.6, 0, 0.05, 1.2, 0, 0, 0, 'cyl6'); } },
  // a stranded hulk on the shoal: a long black hull on its bilge, her masts gone
  rchhulk: { col: '#1c1e20', sol(p) { return [fpiBox(p, 0, 0, 2.6, 9, 2.2)]; },
    b3(p, A) { A.part('boathull', '#1c1e20', 0, 0, 0.1, 5.6, 2.6, 19, 0, 0, 0.18); A.box('#3a2e22', 0, 0, 2.15, 4.6, 17, 0.12, 0, 0, 0.18); A.cyl(FPI_C.wood3, 0.4, 3, 2.2, 0.25, 3.5, 0, 0.2, 0.3); A.cyl(FPI_C.wood3, -0.2, -4, 2.2, 0.22, 2.4, 0, -0.3, 0.2); for (let i = 0; i < 6; i++) A.box('#2a2e2a', (A.r() - 0.5) * 4, -8 + i * 3, 0.05, 1.2, 0.6, 0.15, A.r() * 3); } },
  // the old bell on the shoal: a buoy's bell frame on its side in the sand
  rchbell: { col: '#3a2e22', sol(p) { return [fpiCirc(p, 0, 0, 1.0, 1.6)]; },
    b3(p, A) { A.part('cone', '#6a5020', 0, 0, 0.5, 0.65, 1.0, 0.65, 0, 0.5, 0.2); A.part('torus', '#8a6a2c', 0, 0, 0.25, 0.7, 0.7, 0.5, 0, Math.PI / 2 + 0.5, 0); for (const s of [-1, 1]) A.cyl('#2a2e30', s * 0.9, 0, 0, 0.06, 1.8, 0, s * 0.2, 0, 'cyl6'); A.box('#2a2e30', 0, 0, 1.75, 2.0, 0.12, 0.12); A.part('cyl8', '#b84030', 0, -0.9, 0.3, 1.0, 0.6, 1.0, 0, 0.4, 0); } },
  // an invisible edge: where the shoal drops into the sea, a rail at the gallery's edge or round the lantern's glass
  rchedge: { col: '#000000', sol(p) { return [fpiBox(p, 0, 0, p.len / 2, 0.25, p.hh || 1.2, { ray: false, occ: false })]; }, b3() {} },
  // a cairn for a beacon (the frbeacon's cairn and cresset, src/frisle.js, smaller)
  rchcairn: { col: FPI_C.stone, sol(p) { return [fpiCirc(p, 0, 0, 0.9, 1.3)]; },
    b3(p, A) { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + A.r() * 0.3, d = 0.6 + A.r() * 0.3; A.part('ico', i % 3 ? FPI_C.stone : FPI_C.stone2, Math.cos(a) * d, Math.sin(a) * d, 0.2 + A.r() * 0.3, 0.45, 0.4, 0.45, A.r() * 3); } A.cyl(FPI_C.stone3, 0, 0, 0, 0.7, 1.0, 0, 0, 0, 'cyl8'); A.cyl(FPI_C.iron, 0, 0, 0.9, 0.07, 1.2, 0, 0, 0, 'cyl6'); A.part('cone', FPI_C.iron, 0, 0, 2.3, 0.6, -0.4, 0.6); for (let i = 0; i < 4; i++) A.log(FPI_C.tar, (A.r() - 0.5) * 0.3, (A.r() - 0.5) * 0.3, 2.25, 0.06, 0.6, i * 0.8, 0.3); } },
});
// a line of invisible edges from point to point (local coords)
function rchEdgeLine(put, pts, hh, closed) { const n = pts.length; for (let i = 0; i < (closed ? n : n - 1); i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n], len = Math.hypot(x1 - x0, y1 - y0); if (len < 0.05) continue; put('rchedge', (x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(y1 - y0, x1 - x0), { len: len + 0.3, hh: hh || 1.2 }); } }

// =====================================================================================================================
// every part's hooks (each part's own go over these)
// =====================================================================================================================
function rchStage(def) {
  return Object.assign({
    mend: true, noBars: true,
    set: (H, K, Z) => {},
    consider: c => rchConsider(c), prompt: o => rchPrompt(o), use: o => rchUse(o),
    q: (sid, k, a) => rchQ(sid, k, a),
    pack: o => rchPack(o), apply: o => rchApply(o),
    shot: (x, y, z, lh, lp, by, dmg) => rchShot(x, y, z, lh, lp, dmg),
    speedK: () => (RAID.st.cy || {})[FPS.me.id] ? RCHC.CARRY_K : 1,
    b3: grp => rch3dBuild(grp), f3: dt => rch3d(dt),
    exit() { rchFreeAll(); RCH.on = false; },
  }, def);
}

// ---------- the part's state (hosting or alone it's kept here; joined, it comes in the host's word) ----------
function rchState(o) {
  Object.assign(RAID.st, {
    rch: true, hold: {}, holdAcc: 0, holdK: '', holdI: 0, holdNow: '', said: {}, so: [], bc: [], cy: {}, drop: [], fseen: {}, night: 1, ph: '', t: 0, spT: 3,
    pl: null, fl: -1e9, bell: 0, lamp: null, ships: [], dmg: 0, mate: null,
  }, o || {});
  RCH.on = true; RCH.fseen = {};
}

// ---------- holding Use (every screen asks the host for what it's held, every quarter second) ----------
function rchHoldTick(dt) {
  const S = RAID.st, o = ZM.near, hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse;
  const St = raidStage() || {}, ok = o && St.rchHolds && St.rchHolds.includes(o.k) && !(FPS.me.dead > 0) && !zmIsDown();
  if (hold && ok) { S.holdAcc += dt; S.holdNow = o.k + ':' + (o.i | 0); } else S.holdNow = '';
  if (S.holdAcc > 0 && (S.holdAcc >= 0.25 || !(hold && ok))) { if (ok || S.holdK) raidAsk('h', [ok ? o.k : S.holdK, ok ? o.i | 0 : S.holdI | 0, S.holdAcc]); S.holdAcc = 0; }
  if (ok) { S.holdK = o.k; S.holdI = o.i | 0; }
}
// (hosting) how much of k (item i) has been held since last asked (max: no more than that this frame; what's left
// over waits for the next frame, up to one ask's worth)
function rchTake(k, i, max) { const S = RAID.st, key = k + ':' + (i | 0), n = S.hold[key] || 0, t = max == null ? n : Math.min(n, max); S.hold[key] = Math.min(0.6, n - t); return t; }
// (hosting) a joined player's (or my own) ask
function rchQ(sid, k, a) {
  const S = RAID.st; if (!S.rch) return;
  if (k === 'h' && Array.isArray(a)) { const key = String(a[0]) + ':' + (a[1] | 0); S.hold[key] = (S.hold[key] || 0) + clamp(+a[2] || 0, 0, 0.6); S.holdBy = S.holdBy || {}; S.holdBy[key] = sid; return; }
  if (k === 'sh' && Array.isArray(a)) { const s = S.so[a[0] | 0]; if (s && s.st !== 3) rchSolHurt(s, clamp(+a[1] || 0, 0, 12), sid); return; }
  const St = raidStage() || {}; if (St.rchq) St.rchq(sid, k, a);
}
// what's in reach to Use (every screen): the part says (St.rchConsider)
function rchConsider(c) { const St = raidStage() || {}; if (St.rchConsider && !ZM.over) St.rchConsider(c); }
function rchPrompt(o) { const St = raidStage() || {}; return St.rchPrompt ? St.rchPrompt(o) : null; }
function rchUse(o) { const St = raidStage() || {}; return St.rchUse ? St.rchUse(o) : false; }
// a place in reach (local coords): c(obj, x, y, z, range)
const rchC = (c, o, x, y, r, z) => { const [wx, wy] = rchW(x, y); c(o, wx, wy, z || 0, r || 1.6, false); };

// =====================================================================================================================
// the soldiers of the nations (hosting or alone: their aim and fire; every screen: their figures, flashes, hits)
// A soldier: { i, k: 'ember' | 'ice' | 'comm' | 'guard', x, y (world), h, hp, max, px, py (his post), st (0 at his post,
// 1 aiming, 2 reloading, 3 down), t, tg (whom he's aiming at), ax, ay (where), fs (shots fired: each screen flashes
// once per), wan (how far he roams from his post), boss }
// =====================================================================================================================
var RCH_NAT = {
  ember: { cols: ['#7a2412', '#e8c890', '#ffb050', '#ffd88a'], fit: 'oc_smuggler', hp: 4.5, n: 'an Ember Isles musketeer' },
  guard: { cols: ['#5a1a0c', '#e8c890', '#d8a040', '#ffd88a'], fit: 'oc_customs', hp: 7, n: 'an Ember guard' },
  comm: { cols: ['#3a0e08', '#f0d8a0', '#ffd34d', '#ffd88a'], fit: 'oc_bosun', hp: 34, n: 'the Ember Commodore' },
  ice: { cols: ['#c8dce8', '#2a3a4a', '#6a8aa8', '#ffd88a'], fit: 'oc_petrel', hp: 5, n: 'an Ice-folk marine' },
};
// (hosting) muster them: list of { k, x, y (local), wan, h, wake (seen before they'll fire: a part can keep them quiet) }
function rchMuster(list) {
  const S = RAID.st, n = rchN();
  for (const d of list) {
    const N = RCH_NAT[d.k] || RCH_NAT.ember, hp = N.hp * (1 + 0.45 * (n - 1)) * (d.hpK || 1), [x, y] = rchW(d.x, d.y);
    S.so.push({ i: S.so.length, k: d.k, x, y, h: d.h == null ? Math.PI : d.h, hp, max: hp, px: x, py: y, st: 0, t: 1 + Math.random() * 2.5, tg: '', ax: x, ay: y, fs: 0, wan: d.wan == null ? 2 : d.wan, boss: !!d.boss, quiet: !!d.quiet, rec: 0, dT: 0, wx: x, wy: y });
  }
}
const rchSolLive = () => (RAID.st.so || []).filter(s => s.st !== 3);
// a clear line between two points at chest height (nothing solid standing across it)
function rchLos(x0, y0, x1, y1, zz) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.6), z = zz == null ? 1.3 : zz;
  for (let k = 2; k < n - 1; k++) {
    const px = x0 + (x1 - x0) * k / n, py = y0 + (y1 - y0) * k / n;
    for (const s of zmNear(px, py)) { if (s.ray === false) continue; const bot = s.z0 != null ? s.z0 - FPSC.GROUND : 0, top = s.z1 - FPSC.GROUND; if (bot > z || top < z) continue; if (fpiDist(s, px, py) < 0.02) return false; }
  }
  return true;
}
function rchSolTick(dt) {
  const S = RAID.st, n = rchN(); if (!S.so || !S.so.length) return;
  const P = rchCrew().filter(p => !p.down), aimed = {};
  for (const s of S.so) if (s.st === 1) aimed[s.tg] = (aimed[s.tg] || 0) + 1;
  for (const s of S.so) {
    if (s.st === 3) { s.dT += dt; continue; }
    s.t -= dt; s.rec = Math.max(0, s.rec - dt * 3);
    if (s.st === 0) {
      // (at his post, shifting about it a little; a roamer comes on towards the nearest of you)
      if (Math.hypot(s.wx - s.x, s.wy - s.y) < 0.3 || !isFinite(s.wx)) { const a = Math.random() * 6.283, r = Math.random() * s.wan; s.wx = s.px + Math.cos(a) * r; s.wy = s.py + Math.sin(a) * r; }
      const dx = s.wx - s.x, dy = s.wy - s.y, d = Math.hypot(dx, dy), sp = 1.6 * dt;
      if (d > 0.05) { const nx = s.x + dx / d * Math.min(sp, d), ny = s.y + dy / d * Math.min(sp, d); if (!zmBlockedAt(nx, ny, 0.35, 0)) { s.x = nx; s.y = ny; s.h = bearingOf(dx, dy); } else { s.wx = s.x; s.wy = s.y; } }
      if (s.t <= 0 && !s.quiet) {
        // whom: the nearest of you he can see, if he can; fewer at a time on someone already aimed at
        let best = null, bd = 1e9;
        for (const p of P) { const dd = Math.hypot(p.x - s.x, p.y - s.y) * (1 + 0.6 * (aimed[p.sid] || 0)); if (dd < bd && Math.hypot(p.x - s.x, p.y - s.y) < RCHC.SOL_RANGE && rchLos(s.x, s.y, p.x, p.y)) { bd = dd; best = p; } }
        if (best) { s.st = 1; s.t = RCHC.SOL_AIM * (s.boss ? 0.8 : 1) * (0.9 + Math.random() * 0.3); s.tg = best.sid; s.ax = best.x; s.ay = best.y; aimed[best.sid] = (aimed[best.sid] || 0) + 1; }
        else s.t = 0.5 + Math.random() * 0.5;
      }
    } else if (s.st === 1) {
      const p = P.find(q => q.sid === s.tg);
      if (p && s.t > RCHC.SOL_AIM * 0.3) { s.ax = p.x; s.ay = p.y; }
      s.h = bearingOf(s.ax - s.x, s.ay - s.y);
      if (s.t <= 0) {
        s.fs = (s.fs + 1) % 1000; s.rec = 1;
        // the ball: where he aimed, and whoever's still on that line and in sight there
        const L = Math.hypot(s.ax - s.x, s.ay - s.y) || 1, ux = (s.ax - s.x) / L, uy = (s.ay - s.y) / L;
        for (const q of P) { const qx = q.x - s.x, qy = q.y - s.y, along = qx * ux + qy * uy; if (along < 0.5 || along > RCHC.SOL_RANGE + 4) continue; const off = Math.abs(qx * uy - qy * ux); if (off < RCHC.SOL_MISS && rchLos(s.x, s.y, q.x, q.y)) { cpEvent('rchhit', [q.sid, s.boss ? RCHC.SOL_DMG + 1 : RCHC.SOL_DMG, s.k]); break; } }
        s.st = 2; s.t = (s.boss ? 1.1 : 2.2 + Math.random() * 1.6) * (1 + 0.35 / n);
      }
    } else if (s.st === 2) { if (s.t <= 0) { s.st = 0; s.t = 0.2 + Math.random() * 0.8; } }
  }
}
// (hosting) a soldier hurt (by sid)
function rchSolHurt(s, dmg, sid) {
  s.hp -= dmg; s.hitT = 0.25;
  if (s.st !== 1 && s.st !== 2 && !s.quiet) { s.t = Math.min(s.t, 0.3); }
  if (s.hp <= 0) { s.st = 3; s.hp = 0; s.dT = 0; const St = raidStage() || {}; if (St.rchSolDown) St.rchSolDown(s, sid); }
}
cpOn('rchhit', a => { if (!Array.isArray(a) || a[0] !== FPS.me.id || cpCineOn()) return; fpsHurt(a[1] | 0 || 2, '', a[2] === 'ice' ? 'An Ice-folk musket' : 'An Ember musket'); RCH.hitT = 0.5; });
// (every screen) my own shot: did it find one of them? (body and head, nothing solid in front)
function rchShot(x, y, z, lh, lp, dmg) {
  const S = RAID.st; if (!S.rch || !S.so || !S.so.length) return;
  const cp = Math.cos(lp), dx = Math.sin(lh) * cp, dy = Math.cos(lh) * cp, dz = Math.sin(lp), G0 = FPSC.GROUND;
  let best = null, bt = 1e9, head = false;
  for (const s of S.so) {
    if (s.st === 3) continue;
    const sx = s.dx == null ? s.x : s.dx, sy = s.dy == null ? s.y : s.dy;
    for (const [hz, r, hd] of [[1.68, 0.2, true], [1.25, 0.36, false], [0.75, 0.36, false]]) {
      const qx = sx - x, qy = sy - y, qz = G0 + hz - z, t = qx * dx + qy * dy + qz * dz; if (t < 0 || t > 160) continue;
      const miss = Math.hypot(qx - dx * t, qy - dy * t, qz - dz * t); if (miss < r && t < bt) { bt = t; best = s; head = hd; }
    }
  }
  if (!best) return;
  const r = fpsRay(x, y, z, lh, lp, FPS.me.id, [], bt); if (r.kind !== 'none' && r.kind !== 'zm' && r.t < bt - 0.5) return;
  FPS.hitT = 0.25; FPS.hitHead = head; try { fpsHitSound(head); } catch (e) {}
  const d = (dmg == null ? 1 : dmg) * (head ? 1.6 : 1);
  best.hitT = 0.25;
  if (ZM.net === 'client') { best.hpShow = Math.max(0, (best.hpShow == null ? best.hp : best.hpShow) - d); RCH.acc = RCH.acc || {}; RCH.acc[best.i] = (RCH.acc[best.i] || 0) + d; }
  else rchSolHurt(best, d, FPS.me.id);
}
// (joined) what I've done to them goes to the host every few frames
function rchAccSend() { if (ZM.net !== 'client' || !RCH.acc) return; for (const i in RCH.acc) if (RCH.acc[i] > 0) raidAsk('sh', [i | 0, RCH.acc[i]]); RCH.acc = {}; }

// =====================================================================================================================
// beacons: [x, y (local), fuel 0..1, lit 0/1]. While lit, the drowned won't rise inside its reach and those that walk
// into it smoulder and sink; the reach shrinks as the fuel burns down
// =====================================================================================================================
const rchBeaR = b => b && b[3] ? 3.5 + (RCHC.BEA_R - 3.5) * clamp(b[2], 0, 1) : 0;
function rchLitAt(x, y, pad) {
  const S = RAID.st, [lx, ly] = rchL(x, y);
  for (const b of S.bc || []) if (b[3] && Math.hypot(lx - b[0], ly - b[1]) < rchBeaR(b) + (pad || 0)) return true;
  if (S.pl && S.pl.on && Math.hypot(x - S.pl.x, y - S.pl.y) < RCHC.PLIM_R + (pad || 0)) return true;
  return false;
}
function rchBeaconTick(dt, burn) {
  const S = RAID.st;
  for (const b of S.bc) if (b[3]) { b[2] = Math.max(0, b[2] - dt * (burn == null ? 0 : burn)); if (b[2] <= 0 && burn) { b[3] = 0; rchLine('A beacon has burned out.'); } }
  // (the drowned in a lit beacon's reach smoulder and sink)
  for (const z of ZM.z) { if (z.dead || z.boss || z.rr > 0.05) continue; if (rchLitAt(z.x, z.y)) { z.smoul = (z.smoul || 0) + dt; if (z.smoul > 0.9) zmKill(z, false, '', 'burn'); } else z.smoul = Math.max(0, (z.smoul || 0) - dt); }
}
// (hosting) one of the drowned up out of a dark shore: tries St.rchShore() for a spot, away from all of you and out
// of every light
function rchRise(o) {
  const St = raidStage() || {}, P = rchCrew(), n = rchN(); o = o || {};
  for (let t = 0; t < 16; t++) {
    const q = St.rchShore ? St.rchShore(o) : null; if (!q) return null;
    const [x, y] = rchW(q[0], q[1]);
    if (P.some(p => Math.hypot(p.x - x, p.y - y) < (o.near || 9))) continue;
    if (rchLitAt(x, y, 1.5) || zmBlockedAt(x, y, 0.45, 0)) continue;
    const u = Math.random(), kind = o.kind || (u < (o.run || 0.12) ? 'run' : u < 0.6 ? 'jog' : 'walk');
    const z = raidSpawnAt(x, y, { kind, rise: 1.2, hp: zmHp(RAIDC.ROUND + (o.lvl || 2)) * (0.9 + Math.random() * 0.2) * (1 + 0.3 * (n - 1)) });
    if (z && Math.random() < 0.5) zmSound('moan', Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y), fpsEar(z.x, z.y), z.kind);
    return z;
  }
  return null;
}
const rchAlive = () => ZM.z.filter(z => !z.dead).length;
// (hosting) the drowned, a few at a time: every [a, b] seconds (quicker with more of you), no more than cap at once
function rchTrickle(dt, every, cap, o) {
  const S = RAID.st, n = rchN(); S.spT = (S.spT == null ? 3 : S.spT) - dt;
  if (S.spT > 0) return; S.spT = (every[0] + Math.random() * (every[1] - every[0])) / (1 + 0.35 * (n - 1));
  if (rchAlive() < cap + 2 * (n - 1)) rchRise(o);
}

// =====================================================================================================================
// carrying (a faggot of wood, a cask of oil): S.cy[sid] = kind; dropped where you go down (S.drop [[x, y, kind]])
// =====================================================================================================================
const rchMine = () => (RAID.st.cy || {})[FPS.me.id] || '';
function rchCarryTick() {
  const S = RAID.st; if (!S.cy) return;
  for (const p of rchCrew()) if (p.down && S.cy[p.sid]) { const [lx, ly] = rchL(p.x, p.y); const k = S.cy[p.sid]; S.drop.push([lx, ly, k]); delete S.cy[p.sid]; rchLine(`${rchNick(p.sid)} dropped the ${k === 'oil' ? 'cask' : 'load'}.`); }
}

// =====================================================================================================================
// together: the part's word
// =====================================================================================================================
function rchPack(o) {
  const S = RAID.st; if (!S.rch) return;
  const r10 = v => Math.round(v * 10), CX = FPSC.CX, CY = FPSC.CY;
  o.rch = {
    ph: S.ph, n: Math.round(S.night * 100), t: Math.round(S.t),
    so: S.so.map(s => [r10(s.x - CX), r10(s.y - CY), Math.round(s.h * 100), s.st, Math.round(s.hp / s.max * 100), r10(s.ax - CX), r10(s.ay - CY), s.fs, s.k === 'comm' ? 2 : s.k === 'guard' ? 3 : s.k === 'ice' ? 1 : 0, s.boss ? 1 : 0]),
    bc: S.bc.map(b => [r10(b[0]), r10(b[1]), Math.round(b[2] * 100), b[3]]),
    cy: S.cy, dr: S.drop.map(d => [r10(d[0]), r10(d[1]), d[2]]),
    pl: S.pl ? [r10(S.pl.x - CX), r10(S.pl.y - CY), Math.round(S.pl.h * 100), S.pl.w ? 1 : 0, S.pl.on ? 1 : 0] : null,
    mt: S.mate ? [r10(S.mate.x), r10(S.mate.y), Math.round((S.mate.h || 0) * 100), S.mate.spd ? 1 : 0] : null,
  };
  const St = raidStage() || {}; if (St.rchPack) o.rchs = St.rchPack();
}
function rchApply(o) {
  const S = RAID.st, R = o.rch; if (!R) return;
  if (!S.rch) rchState({});
  const d = v => v / 10, CX = FPSC.CX, CY = FPSC.CY, K = ['ember', 'ice', 'comm', 'guard'];
  S.ph = R.ph; S.night = (R.n | 0) / 100; S.t = R.t | 0;
  const so = R.so || [];
  while (S.so.length > so.length) S.so.pop();
  so.forEach((a, i) => {
    let s = S.so[i]; const k = K[a[8] | 0] || 'ember';
    if (!s) { s = S.so[i] = { i, k, x: CX + d(a[0]), y: CY + d(a[1]), dx: CX + d(a[0]), dy: CY + d(a[1]), h: a[2] / 100, max: 100, fs: a[7] | 0, rec: 0, dT: 0 }; }
    s.k = k; s.x = CX + d(a[0]); s.y = CY + d(a[1]); s.h = a[2] / 100; if (s.st !== 3 && a[3] === 3) s.dT = 0; s.st = a[3] | 0; s.hp = a[4] | 0; s.max = 100; s.hpShow = null; s.ax = CX + d(a[5]); s.ay = CY + d(a[6]); s.boss = !!a[9];
    if ((a[7] | 0) !== s.fs) { s.fs = a[7] | 0; s.rec = 1; }
  });
  S.bc = (R.bc || []).map(b => [d(b[0]), d(b[1]), (b[2] | 0) / 100, b[3] | 0]);
  S.cy = R.cy || {}; S.drop = (R.dr || []).map(e => [d(e[0]), d(e[1]), e[2]]);
  if (R.pl) { const p = S.pl || (S.pl = { x: CX + d(R.pl[0]), y: CY + d(R.pl[1]), h: 0 }); p.tx = CX + d(R.pl[0]); p.ty = CY + d(R.pl[1]); p.h = R.pl[2] / 100; p.w = !!R.pl[3]; p.on = !!R.pl[4]; } else S.pl = null;
  S.mate = R.mt ? { x: d(R.mt[0]), y: d(R.mt[1]), h: R.mt[2] / 100, spd: R.mt[3] } : null;
  const St = raidStage() || {}; if (St.rchApply && o.rchs != null) St.rchApply(o.rchs);
}

// =====================================================================================================================
// each frame, every screen: holding Use, a soldier's shots heard and seen, what I've done to them sent, the part's me
// =====================================================================================================================
function rchMe(dt) {
  const S = RAID.st; if (!S.rch) return;
  rchHoldTick(dt);
  RCH.accT = (RCH.accT || 0) - dt; if (RCH.accT <= 0) { RCH.accT = 0.2; rchAccSend(); }
  if (RCH.hitT > 0) RCH.hitT -= dt;
  // (their muskets: one bang for each shot fired, and the pan's flash before it for whoever he's aiming at)
  for (const s of S.so) {
    const seen = RCH.fseen[s.i] == null ? s.fs : RCH.fseen[s.i];
    if (s.fs !== seen) { const d = Math.hypot(s.x - FPS.me.x, s.y - FPS.me.y); try { if (!soundOff()) { const o = { vol: clamp(1.1 - d / 70, 0.15, 0.9), pan: fpsEar(s.x, s.y), rate: s.k === 'ice' ? 1.1 : 0.95 }; if (s.boss || !sfxPlay('rchmusket', o)) sfxPlay(s.boss ? 'blunderbuss' : 'longarm', o); } } catch (e) {} }
    RCH.fseen[s.i] = s.fs;
    if (s.st === 1 && s.tg === FPS.me.id && !s.aimSaid) { s.aimSaid = 1; try { if (!soundOff()) sfxPlay('reload', { vol: 0.35, pan: fpsEar(s.x, s.y), rate: 1.3 }); } catch (e) {} }
    if (s.st !== 1) s.aimSaid = 0;
  }
  // (a beacon or a cairn catching, and fed, heard from where it stands: off the host's word, so every screen)
  { const B = S.bc || []; if (!RCH.bcW || RCH.bcW.st !== RAID.stage || RCH.bcW.length !== B.length) { RCH.bcW = B.map(b => [b[2], b[3]]); RCH.bcW.st = RAID.stage; }
    else B.forEach((b, i) => { const w = RCH.bcW[i], [x, y] = rchW(b[0], b[1]), o = { vol: clamp(1 - Math.hypot(x - FPS.me.x, y - FPS.me.y) / 80, 0.12, 0.9), pan: fpsEar(x, y) }; try { if (!soundOff()) { if (b[3] && !w[1]) sfxPlay('rchbeacon', o); else if (b[3] && b[2] > w[0] + 0.2) sfxPlay('rchfeed', Object.assign(o, { gap: 1 })); } } catch (e) {} w[0] = b[2]; w[1] = b[3]; }); }
  const St = raidStage() || {}; if (St.rchMe) St.rchMe(dt);
}
RCH.fseen = {};

// =====================================================================================================================
// the HUD: lines down the left (what you carry, the part's own), a warning when a musket's on you, beacons' fuel
// =====================================================================================================================
function rchHud(phone, mono, fell, extra) {
  const S = RAID.st; if (!S.rch || ZM.over) return;
  const L = Math.max(14, FPS.safeLeft || 0), dy = phone ? 14 : 17; let y = fpsHudTop() + (phone ? 70 : 92);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
  const line = (s, c) => { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = c; ctx.fillText(s, L, y, W * 0.5); y += dy; if (typeof fpsHudNote === 'function') fpsHudNote(y); };
  const cy = rchMine(); if (cy) line(cy === 'oil' ? 'Carrying a cask of oil (slower; you’ll drop it if you go down)' : 'Carrying a faggot of tarred wood for the beacon', 'rgba(255,214,150,0.95)');
  for (const e of extra || []) line(e[0], e[1]);
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  // (a musket levelled at you: a mark at the edge of the screen towards him, brighter as he's about to fire)
  for (const s of S.so) {
    if (s.st !== 1 || s.tg !== FPS.me.id) continue;
    const m = FPS.me, b = bearingOf(s.x - m.x, s.y - m.y), rel = angDiff(b, m.h), k = 1 - clamp(s.t == null ? 0.5 : s.t / RCHC.SOL_AIM, 0, 1);
    const R = Math.min(W, H) * 0.36, px = W / 2 + Math.sin(rel) * R, py = H / 2 - Math.cos(rel) * R * 0.8;
    ctx.save(); ctx.translate(px, py); ctx.rotate(rel); ctx.fillStyle = `rgba(255,${120 - 80 * k | 0},70,${0.55 + 0.4 * Math.sin(g.t * 14)})`;
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(9, 6); ctx.lineTo(-9, 6); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  if (S.so.some(s => s.st === 1 && s.tg === FPS.me.id)) { ctx.textAlign = 'center'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = `rgba(255,150,110,${0.7 + 0.3 * Math.sin(g.t * 10)})`; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6; ctx.fillText('A MUSKET IS ON YOU · STEP ASIDE OR GET BEHIND COVER', W / 2, H * 0.7); ctx.shadowBlur = 0; }
  if (RCH.hitT > 0) { ctx.fillStyle = `rgba(160,20,10,${RCH.hitT * 0.5})`; ctx.fillRect(0, 0, W, H); }
}
// a boss's bar along the top (the Commodore's): hp 0..1
function rchBossBar(phone, mono, fell, name, k) {
  const bw = Math.min(420, W * 0.5), x = (W - bw) / 2, y = fpsHudTop() + (phone ? 34 : 44);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 2, y - 2, bw + 4, 12); ctx.fillStyle = 'rgba(220,90,40,0.9)'; ctx.fillRect(x, y, bw * clamp(k, 0, 1), 8);
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = fell(phone ? 13 : 16); ctx.fillStyle = 'rgba(255,214,170,0.95)'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6; ctx.fillText(name, W / 2, y - 3); ctx.shadowBlur = 0;
}

// =====================================================================================================================
// the 3D: the night, the Reach on the horizon, the beacons' fires, the soldiers, Plimsoll, the Mate, the tower moved
// to where the part wants it (St.rchTower: [x, y, up] local, up: metres to lift it, -25 to stand on its gallery)
// =====================================================================================================================
function rchSoft(c0, c1, o) { const t = z3Soft(c0, c1); return new THREE.SpriteMaterial(Object.assign({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }, o || {})); }
function rch3dBuild(grp) {
  RCH3.on = false;
  const St = raidStage() || {}, G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, M = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k == null ? 0.3 : k), fog: false });
  RCH3.grp = grp; RCH3.n0 = Z3.grp ? Z3.grp.children.length : 0; RCH3.moved = false; RCH3.T = {};
  // ---- the Reach on the horizon: islands, the nations' beacons and towns on them, fire-ships burning far off ----
  {
    const g2 = RCH3.far = new THREE.Group(); grp.add(g2); const r = seeded(0x14ea7 + (St.rchSeed || 0)), FY = St.rchFarY || 0;
    const fire = rchSoft('rgba(255,170,80,0.95)', 'rgba(255,120,40,0)'), town = rchSoft('rgba(255,220,150,0.9)', 'rgba(255,200,120,0)');
    RCH3.fires = [];
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.283, d = 520 + r() * 520, x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (St.rchClear && St.rchClear(a)) continue;
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), M(i % 3 ? '#20242a' : '#262a2e', 0.4)); const sx = 40 + r() * 90, sy = 6 + r() * 16; h.scale.set(sx, sy, 22 + r() * 40); h.position.copy(z3v(CX + x, CY + y, G0 - 3 + FY)); h.rotation.y = r() * 3; g2.add(h);
      // (a beacon on its top, a town's lights along its shore: one in three)
      const b = new THREE.Sprite(fire.clone()); b.scale.setScalar(14 + r() * 8); b.position.copy(z3v(CX + x, CY + y, G0 + sy * 0.9 + FY)); g2.add(b); RCH3.fires.push({ s: b, k: 0.7 + r() * 0.3, ph: r() * 6, nat: i % 4 });
      if (i % 3 === 0) for (let k = 0; k < 7; k++) { const s = new THREE.Sprite(town); s.scale.setScalar(3 + r() * 3); s.position.copy(z3v(CX + x + (r() - 0.5) * sx * 1.4, CY + y + (r() - 0.5) * 30, G0 + 1 + r() * 4 + FY)); g2.add(s); }
    }
    // (fire-ships burning far out: a hull's glow and its smoke)
    RCH3.burn = [];
    for (let i = 0; i < 4; i++) { const a = r() * 6.283, d = 300 + r() * 300; if (St.rchClear && St.rchClear(a)) continue; const s = new THREE.Sprite(fire.clone()); s.scale.set(26, 18, 1); s.position.copy(z3v(CX + Math.cos(a) * d, CY + Math.sin(a) * d, G0 + 4 + FY)); g2.add(s); RCH3.burn.push(s); }
  }
  // ---- the beacons' fires (up to five) ----
  RCH3.bea = [0, 1, 2, 3, 4].map(() => {
    const g2 = new THREE.Group(); g2.visible = false; grp.add(g2);
    const core = new THREE.Sprite(rchSoft('rgba(255,236,190,1)', 'rgba(255,150,60,0)')); core.scale.set(1.6, 2.2, 1); g2.add(core);
    const haze = new THREE.Sprite(rchSoft('rgba(255,150,70,0.45)', 'rgba(255,110,40,0)')); haze.scale.setScalar(9); g2.add(haze);
    const L = new THREE.PointLight(0xffa860, 0, 24, 1.2); g2.add(L);
    return { g: g2, core, haze, L };
  });
  // ---- dropped loads on the ground (a cask, a faggot) ----
  RCH3.drop = [0, 1, 2, 3].map(() => { const g2 = new THREE.Group(); g2.visible = false; grp.add(g2); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.9, 10), z3Lam('#5a4430')); c.rotation.z = Math.PI / 2; c.position.y = 0.36; g2.add(c); const hl = new THREE.Sprite(rchSoft('rgba(255,220,150,0.5)', 'rgba(255,220,150,0)')); hl.scale.setScalar(2); hl.position.y = 0.6; g2.add(hl); return g2; });
  // ---- what I carry, in front of me: a cask or a faggot ----
  { const g2 = RCH3.held = new THREE.Group(); g2.visible = false; grp.add(g2); const c = RCH3.heldCask = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), z3Lam('#5a4430')); c.rotation.z = Math.PI / 2; g2.add(c); const f = RCH3.heldWood = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8), z3Lam('#1a1610')); f.rotation.x = Math.PI / 2 - 0.3; g2.add(f); }
  // ---- the musket flashes: one per soldier, brief ----
  RCH3.mf = new THREE.Sprite(rchSoft('rgba(255,240,200,1)', 'rgba(255,160,60,0)')); RCH3.mf.visible = false; grp.add(RCH3.mf);
  RCH3.flash = [];
  RCH3.pan = rchSoft('rgba(255,200,150,1)', 'rgba(255,80,40,0)');
  // ---- Plimsoll (his drawing, walking upright on the shoal, his blue shoes glowing) ----
  if (St.rchPlim) {
    const P = RCH3.plim = new THREE.Group(); grp.add(P); P.visible = false;
    RCH3.plimS = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false, alphaTest: 0.05 })); RCH3.plimS.scale.set(2.6 * (SK.PLIM_ASPECT || 0.6), 2.6, 1); RCH3.plimS.position.y = 1.3; P.add(RCH3.plimS);
    const gl = new THREE.Sprite(rchSoft('rgba(95,211,255,0.4)', 'rgba(95,211,255,0)')); gl.scale.setScalar(4.5); gl.position.y = 0.4; P.add(gl);
    RCH3.plimRing = new THREE.Mesh(new THREE.RingGeometry(RCHC.PLIM_R - 0.25, RCHC.PLIM_R, 48), new THREE.MeshBasicMaterial({ color: 0x5fd3ff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); RCH3.plimRing.rotation.x = -Math.PI / 2; RCH3.plimRing.position.y = 0.06; P.add(RCH3.plimRing);
  }
  // ---- the Wren's Mate ----
  RCH.npc = { mate: cpkNpc(['#3a4a3a', '#d8d0b8', '#8a6a3a', '#ffd88a'], 'oc_pea') };
  if (St.rchB3) St.rchB3(grp);
  RCH3.on = true;
}
function rchFreeAll() { if (RCH.npc) for (const k in RCH.npc) cpkNpcFree(RCH.npc[k]); RCH.npc = null; for (const F of RCH.F) if (F) cpkNpcFree(F); RCH.F = []; RCH3.on = false; }
// (cpkNpcPose's noGun looks for .visible on the weapon; its model is .root)
function rchNoGun(F) { if (F && F.wpn) for (const k in F.wpn) if (F.wpn[k] && F.wpn[k].root) F.wpn[k].root.visible = false; }
// the sea at a part's own level (the tide out on the holm, far below the lantern): called by src/gl3d.js just before
// it draws, after it has laid the sea at 0; the sea's shading reckons the horizon from the eye's height over it
function rchGL(u) {
  const St = typeof RAID !== 'undefined' && RAID.on && RCH3.on && raidStage(); if (!St || (St.rchSeaY == null && !St.rchSea)) return;
  const y = St.rchSea ? St.rchSea() : St.rchSeaY; if (!isFinite(y)) return;
  GL3D.sea.position.y = y; if (u && u.uCamH) u.uCamH.value = Math.max(0.3, u.uCamH.value - y);
}
function rch3d(dt) {
  if (!RCH3.on || !RAID.st.rch) return;
  const S = RAID.st, St = raidStage() || {}, t = g.t, G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, m = FPS.me;
  // ---- the tower and lantern (src/zombies.js's own), moved once to where the part wants them ----
  if (!RCH3.moved && Z3.grp && St.rchTower) {
    RCH3.moved = true; const [tx, ty, up] = St.rchTower;
    for (const o of Z3.grp.children.slice(RCH3.n0)) { if (o.userData.rchMv) continue; o.userData.rchMv = true; o.position.x += tx - ZMT.X; o.position.z -= ty - ZMT.Y; o.position.y += up || 0; }
  }
  // ---- the night: St.rchNight() 0 dusk to 1 the dead of night; flares and the beam brighten it ----
  const night = St.rchNight ? St.rchNight() : S.night, lit = St.rchLit ? St.rchLit() : 0;
  GL3D.amb.intensity = 0.42 - 0.24 * night + 0.18 * lit; GL3D.moon.intensity = 0.2 - 0.1 * night + 0.06 * lit;
  const d = 1 - night, sky = St.rchSky ? St.rchSky() : [0.03 + 0.1 * d, 0.035 + 0.08 * d, 0.06 + 0.1 * d];
  if (GL3D.scene.fog) { const F = GL3D.scene.fog; F.color.setRGB(sky[0], sky[1], sky[2]); F.near = St.rchFogNear || 30; F.far = (St.rchFogFar || 260) + 340 * d + 120 * lit; RAID.fog0 = true; }
  if (GL3D.scene.background && GL3D.scene.background.isColor) GL3D.scene.background.setRGB(sky[0], sky[1], sky[2]);
  // ---- the Reach: its beacons flicker, the fire-ships burn ----
  for (const f of RCH3.fires) f.s.material.opacity = f.k * (reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(t * 3 + f.ph) * Math.sin(t * 1.3 + f.ph * 2)) * (St.rchFarDip ? St.rchFarDip(f) : 1);
  for (const [i, s] of RCH3.burn.entries()) s.material.opacity = reduceMotion ? 0.8 : 0.6 + 0.3 * Math.sin(t * 5 + i) * Math.sin(t * 2.1 + i);
  // ---- the beacons ----
  RCH3.bea.forEach((B, i) => { const b = S.bc[i]; B.g.visible = !!(b && b[3]); B.L.intensity = 0; if (!B.g.visible) return; const [x, y] = rchW(b[0], b[1]), f = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 17 + i) * Math.sin(t * 7.3 + i * 2), k = 0.35 + 0.65 * clamp(b[2], 0, 1); B.g.position.copy(z3v(x, y, G0 + (St.rchBeaZ ? St.rchBeaZ(i) : 2.5))); B.core.scale.set(1.4 * k * f + 0.4, 2.1 * k * f + 0.5, 1); B.haze.material.opacity = 0.5 * k * f; B.L.intensity = 2.2 * k * f; B.L.distance = 6 + 2.2 * rchBeaR(b); if (!reduceMotion && Math.random() < dt * 10 * k) FPS.parts.push({ x: x + (Math.random() - 0.5) * 0.5, y: y + (Math.random() - 0.5) * 0.5, z: G0 + 3, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, vz: 1.5 + Math.random(), t: 0.8, c: '255,170,80' }); });
  // ---- dropped loads ----
  RCH3.drop.forEach((g2, i) => { const d0 = S.drop[i]; g2.visible = !!d0; if (d0) { const [x, y] = rchW(d0[0], d0[1]); g2.position.copy(z3v(x, y, G0)); } });
  // ---- what I carry ----
  { const cy = rchMine(), show = !!cy && !(m.dead > 0) && !zmIsDown() && !fpsThird() && !cpCineOn(); RCH3.held.visible = show; if (show) { const h = m.h, ez = G0 + FPSC.EYE + (m.jz || 0) - (FPS.crouchEye || 0); RCH3.held.position.copy(z3v(m.x + Math.sin(h) * 0.55 + Math.cos(h) * 0.25, m.y + Math.cos(h) * 0.55 - Math.sin(h) * 0.25, ez - 0.55)); RCH3.held.rotation.y = -h; RCH3.heldCask.visible = cy === 'oil'; RCH3.heldWood.visible = cy !== 'oil'; } }
  // ---- the soldiers ----
  rchSol3d(dt);
  // ---- Plimsoll ----
  if (RCH3.plim) {
    const P = S.pl; RCH3.plim.visible = !!(P && P.on);
    if (P && P.on) {
      if (ZM.net === 'client' && P.tx != null) { const k = Math.min(1, dt * 6); P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k; }
      if (!RCH3.T.plim && typeof gwsImgTex === 'function') { RCH3.T.plim = gwsImgTex(IMG.plim, false); RCH3.T.plimF = gwsImgTex(IMG.plim, false, true); }
      const right = Math.sin(angDiff(P.h, m.h)) > 0, want = right ? RCH3.T.plimF : RCH3.T.plim;
      if (want && RCH3.plimS.material.map !== want) { RCH3.plimS.material.map = want; RCH3.plimS.material.needsUpdate = true; }
      RCH3.plim.position.copy(z3v(P.x, P.y, G0 + (reduceMotion ? 0 : Math.abs(Math.sin(t * 5)) * 0.05 * (P.w ? 1 : 0))));
      RCH3.plimS.material.rotation = reduceMotion ? 0 : P.w ? Math.sin(t * 5) * 0.06 : Math.sin(t * 0.7) * 0.015;
      RCH3.plimRing.material.opacity = reduceMotion ? 0.12 : 0.1 + 0.05 * Math.sin(t * 2.4);
    }
  }
  // ---- the Mate ----
  if (RCH.npc && RCH.npc.mate) { const F = RCH.npc.mate, o = (RCH.cineAt && RCH.cineAt.mate) || S.mate; if (!o) F.root.visible = false; else { F.root.visible = true; const [x, y] = rchW(o.x, o.y); cpkNpcPose(F, { x, y, h: o.h == null ? bearingOf(m.x - x, m.y - y) : o.h, spd: o.spd || 0, noGun: true, lan: true }); rchNoGun(F); } }
  if (St.rchF3) St.rchF3(dt);
}
// the soldiers: a figure each (built as they're mustered), aiming, firing, falling
function rchSol3d(dt) {
  const S = RAID.st, G0 = FPSC.GROUND, t = g.t, m = FPS.me;
  while (RCH.F.length < S.so.length) { const s = S.so[RCH.F.length], N = RCH_NAT[s.k] || RCH_NAT.ember; RCH.F.push(cpkNpc(N.cols, N.fit)); }
  let fi = 0;
  S.so.forEach((s, i) => {
    const F = RCH.F[i]; if (!F) return;
    // (joined: eased towards the host's word)
    if (s.dx == null) { s.dx = s.x; s.dy = s.y; } const k = ZM.net === 'client' ? Math.min(1, dt * 8) : 1; s.dx += (s.x - s.dx) * k; s.dy += (s.y - s.dy) * k;
    if (s.st === 3) { s.dT = (s.dT || 0) + dt; F.root.visible = s.dT < 6; if (!F.root.visible) return; try { cpkNpcPose(F, { x: s.dx, y: s.dy, h: s.h, spd: 0, id: s.boss ? 'blunderbuss' : 'longarm', lan: false }); } catch (e) {} const fall = Math.min(1, s.dT * 2.2); F.root.rotation.x = -fall * Math.PI / 2 * 0.95; F.root.position.y = G0 + 0.15 * fall - Math.max(0, s.dT - 3.5) * 0.25; return; }
    F.root.rotation.x = 0;
    const tgt = s.st === 1 ? [s.ax, s.ay] : null, pitch = tgt ? -0.05 : 0;
    try { fbPose(F, { dt, x: s.dx, y: s.dy, jz: 0, vz: 0, h: s.h, p: pitch, spd: s.st === 0 && Math.hypot(s.x - s.dx, s.y - s.dy) > 0.02 ? 1.4 : 0, ph: (F.ph = (F.ph || 0) + dt * 3), cr: 0, id: s.boss ? 'blunderbuss' : 'longarm', plain: true, pap: 0, rec: s.rec || 0, draw: s.st === 1 ? 1 : 0.4, rl: 0, slash: -1, lan: false, t, see: 1, op: 1 }); } catch (e) {}
    if (s.hitT > 0) s.hitT -= dt;
    // (the pan's flash while he aims at you: the warning; the muzzle's when he fires)
    if (s.st === 1 || (s.rec || 0) > 0.6) {
      let sp = RCH3.flash[fi]; if (!sp) { sp = RCH3.flash[fi] = new THREE.Sprite(RCH3.pan.clone()); RCH3.grp.add(sp); } fi++;
      const mx = s.dx + Math.sin(s.h) * 0.75, my = s.dy + Math.cos(s.h) * 0.75; sp.visible = true; sp.position.copy(z3v(mx, my, G0 + 1.45));
      if (s.st === 1) { const tk = 1 - clamp((s.t == null ? 0.7 : s.t) / RCHC.SOL_AIM, 0, 1), mine = s.tg === m.id; sp.scale.setScalar((mine ? 0.5 : 0.3) + tk * 0.4 + (reduceMotion ? 0 : 0.08 * Math.sin(t * 30))); sp.material.opacity = (mine ? 0.9 : 0.45); sp.material.color.setRGB(1, 0.5, 0.35); }
      else { sp.scale.setScalar(2.4 * s.rec); sp.material.opacity = s.rec; sp.material.color.setRGB(1, 0.95, 0.8); if (!reduceMotion && Math.random() < 0.6) fpsPuff(mx, my, G0 + 1.45, '200,200,200', 1); }
    }
  });
  for (let j = fi; j < RCH3.flash.length; j++) RCH3.flash[j].visible = false;
}

// =====================================================================================================================
// small shared pieces
// =====================================================================================================================
// a polyline: its length, the point and heading at distance s along it, and the nearest distance along it to (x, y)
function rchPath(P) {
  const seg = []; let L = 0;
  for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1], l = Math.hypot(x1 - x0, y1 - y0); seg.push({ x0, y0, x1, y1, l, s0: L }); L += l; }
  const at = s => { s = clamp(s, 0, L); for (const q of seg) if (s <= q.s0 + q.l + 1e-6) { const k = (s - q.s0) / q.l; return [q.x0 + (q.x1 - q.x0) * k, q.y0 + (q.y1 - q.y0) * k, bearingOf(q.x1 - q.x0, q.y1 - q.y0)]; } const q = seg[seg.length - 1]; return [q.x1, q.y1, bearingOf(q.x1 - q.x0, q.y1 - q.y0)]; };
  const near = (x, y) => { let best = 1e9, bs = 0; for (const q of seg) { const dx = q.x1 - q.x0, dy = q.y1 - q.y0, k = clamp(((x - q.x0) * dx + (y - q.y0) * dy) / (q.l * q.l), 0, 1), px = q.x0 + dx * k, py = q.y0 + dy * k, d = Math.hypot(x - px, y - py); if (d < best) { best = d; bs = q.s0 + k * q.l; } } return [best, bs]; };
  return { L, at, near, seg };
}
