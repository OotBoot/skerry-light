'use strict';
// The Chronicle of the Light, mission 1: The First Fire (c. 1200s, Lantern Rock). Its stages and the tools it shares
// with mission 11 (src/cpm11*.js, Fog Run, which comes back to the same rock six hundred years on). Its cinematics are
// in src/cpm01x.js.
//
// Lantern Rock (FPS_ISLES.frrock's look, as Fog Run's src/frboss.js lays it out): the bare outermost skerry, crags round
// its north shore, the landing to the south, and in its middle the place where the fire-keepers' tower will one day
// stand. In the 1200s there is no tower yet: there the family's beehive bothy stands, and the three cairns round it
// that will later carry iron braziers. The fire itself, the first light on this coast, is kept on the Fire Step, a
// stone hearth on the rock's north side under the crags (CPA.FIRE), which nobody in 1889 has looked at for fifty years.
//
// The fire-keeping kit (CPK, in RAID.st.kp, for any stage of either mission that keeps a fire):
//  - The fire: lit or not, its fuel (0 to 100), and embers (it burned down to nothing: CPA.EMBER seconds to feed it
//    before it's out for good, and the mission's lost). It burns its fuel away (cfg.drain a second, more with more of
//    you); a bundle of driftwood fed to it gives CPA.WOOD. Unlit, the bundles are stacked (stack, of need).
//  - Driftwood on the strand: CPA_SPOTS round the shore, each with a bundle or not (the host's word). Use picks one up
//    (your arms full: no gun, a little slower); Use at the fire feeds it. Going down drops it, lost.
//  - Brands: Use at a lit fire with nothing in your arms takes a burning brand from it, CPA.BRAND seconds of it (in
//    your left hand; you can still shoot). A brand burns fog off.
//  - Fog banks: the haar rolling in off the sea in banks, each headed for the fire. A bank that reaches the fire
//    smothers it (CPA.BANK_HIT of its fuel). Walk into one with a brand and it burns away (CPA.BURN seconds of one
//    brand; two brands, twice as quick).
//  - The drowned of the old wrecks, crowding the fire, kick it apart (CPA.KICK of fuel a second each).
// Together it's host-authoritative: the host runs the fire, the strand, the banks and who carries what, and sends it in
// the stage's word (ka); a joined player asks (raidAsk 'take' i, 'feed', 'brand', 'light').
//
// The mission (three stages, through the night of the haar):
//  I.   Driftwood (cp_m01wood): dusk. Carry driftwood up from the strand and stack it on the Fire Step (3 + one for each
//       of you), then hold Use at it to light the fire. The first of the drowned come up as the light goes.
//  II.  The Haar (cp_m01haar): the night. Keep the fire fed through it (CPA.NIGHT seconds) while the haar rolls in
//       in banks and the drowned of the old wrecks come up the strand for it; wood washes up as the sea breaks
//       something up out there. Let it go out and the mission's lost.
//  III. The Ship (cp_m01ship): a ship's lantern in the fog to the west, standing in for the rock. Build the fire high
//       (fuel at CPA.HIGH or over) long enough for her to see it (CPA.SEE seconds in all) before she's on the rock
//       (CPA.SHIP seconds). Partway through, the Old Keel comes up out of the sea by the wreck: a crab of old keels
//       (the Keelback, src/zmboss2.js, its oldest kind) that charges along the rock.
// Cinematics: the intro, the fire catching (after I), the ship's lantern (as III begins), the Old Keel (an event in
// III), and the outro (the ship going about; then 1841, and the last fire-keeper staying with the fire).

// ---------- the rock ----------
var CPA = {
  R: 36, TOWER: [0, 3], CAIRN: [[10.4, 9], [-10.4, 9], [0, -9]], LAND: [0, -30], FIRE: [0, 22], FIRE_USE: 3.1, WRECK1: [25, -6], WRECK2: [-23, 17],
  WOOD: 22, BRAND: 30, EMBER: 14, BANK_R: 3.4, BANK_SP: 2.1, BANK_HIT: 30, BURN: 1.3, KICK: 2.2, KICK_R: 2.8, LIGHT: 3,
  NIGHT: 150, HIGH: 55, SEE: 42, SHIP: 160, KEEL_AT: 26,
  FOGC: '#1d242b',
};
// the strand: where driftwood comes ashore (local x, y), round the shore but the landing and the crags
var CPA_SPOTS = (() => {
  const out = [], R = seeded(0xf1e5), A = [2.35, 2.75, 3.1, 3.45, 3.8, 4.1, 0.0, 0.35, 0.7, 5.35, 5.7, 1.0];
  for (const a of A) { const d = CPA.R - 4.2 - R() * 1.6; out.push([Math.cos(a) * d, Math.sin(a) * d]); }
  return out;
})();
const cpaW = (p) => [FPSC.CX + p[0], FPSC.CY + p[1]];
const cpaN = () => Math.max(1, (ZM.hum || []).length);
const cpaNick = sid => !ZM.net ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
// (is someone standing: you, or (hosting) one of the others)
function cpaUp(sid) {
  if (sid === FPS.me.id) return !(FPS.me.dead > 0) && !zmIsDown();
  const r = FPS.remote.get(sid); return !!(r && !r.dead && !r.down && r.x != null);
}
function cpaAt(sid) { if (sid === FPS.me.id) return FPS.me; const r = FPS.remote.get(sid); return r && r.x != null ? r : null; }
// a line on everyone's screen (the feed), and a banner
cpOn('cpafeed', t => fpsFeed(String(t || '')));
cpOn('cpaban', a => { if (Array.isArray(a)) ZM.banner = { text: String(a[0] || ''), t: 3.2, sub: String(a[1] || ''), col: a[2] || '#ffe2a8', small: !a[1] }; });
const cpaFeed = t => cpEvent('cpafeed', t);
const cpaBan = (t, sub, col) => cpEvent('cpaban', [t, sub || '', col || '']);
// a voiced line, once (by its key, within the stage)
function cpaOnce(k, who, text, vo) { const S = RAID.st; S.said = S.said || {}; if (S.said[k]) return false; S.said[k] = 1; cpSay(who, text, vo); return true; }

// the look: Lantern Rock's own, at dusk or in the haar
FPS_ISLES.cpm01rock = Object.assign({}, FPS_ISLES.frrock, { name: 'Lantern Rock', rocks: [4, 2, 3.5, 1.1], wrecks: [0], pebbles: 110, wrack: 80, fog: ['#2a3038', 20, 140], birds: ['gull', 3] });
const CP1_MAP = { start: [0, -26], top: 0, R: CPA.R, isle: 'cpm01rock', seed: 0x1201, shore: () => -999, nav: [-CPA.R, CPA.R, -CPA.R, CPA.R], zones: { isle: { n: 'Lantern Rock', r: [-CPA.R, CPA.R, -CPA.R, CPA.R], sky: true } } };
// the north crags (both eras: as src/frboss.js lays them), and the ridge the Fire Step is set under
function cpaCrags(H) {
  for (let i = -5; i <= 5; i++) {
    const a = Math.PI / 2 + i * 0.2 + H.R(-0.04, 0.04), d = H.IR + H.R(2, 5), r = H.R(5, 8) - Math.abs(i) * 0.3, [x, y] = H.polar(a, d);
    const prof = []; for (let k = 0; k < 7; k++) prof.push(H.R(0.6, 1)); prof[0] = H.R(0.3, 0.5); prof[6] = H.R(0.3, 0.5);
    H.rocks.push({ x, y, r, prof, ph: H.R(0, 6.28), rk: { h: 1.5 - Math.abs(i) * 0.08, tint: ['#2a3034', 0.4] }, crag: true });
  }
  // (the ridge behind the hearth: three humps of rock, the middle one tallest)
  for (const [x, y, r, h] of [[-6.5, 28.5, 3.6, 1.3], [0, 30, 4.4, 1.7], [6.8, 28.2, 3.4, 1.2]]) {
    const prof = []; for (let k = 0; k < 7; k++) prof.push(H.R(0.7, 1)); prof[0] = 0.4; prof[6] = 0.4;
    H.rocks.push({ x: H.CX + x, y: H.CY + y, r, prof, ph: H.R(0, 6.28), rk: { h, tint: ['#2a3034', 0.4] }, crag: true });
  }
}
// (after the rocks are laid: none left lying on a strand spot or the Fire Step's approach)
function cpaClearSpots(H) {
  const keep = (x, y, r) => !CPA_SPOTS.some(p => Math.hypot(H.CX + p[0] - x, H.CY + p[1] - y) < r + 2.2) && Math.hypot(H.CX + CPA.FIRE[0] - x, H.CY + CPA.FIRE[1] - 3 - y) > r + 3;
  for (let i = H.rocks.length - 1; i >= 0; i--) { const o = H.rocks[i]; if (!o.crag && !keep(o.x, o.y, o.r)) H.rocks.splice(i, 1); }
}
FPI_GEN.cpm01rock = {
  built: true,
  set(H) {
    H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    const { CX, CY } = H;
    // the bothy where the tower will be, its door to the north, a woodstack against it
    H.put('cpabothy', CX + CPA.TOWER[0], CY + CPA.TOWER[1], Math.PI / 2, {});
    H.put('log', CX + 4.4, CY + 2.2, 1.2, { len: 2.6, rad: 0.22 });
    H.put('log', CX - 4.2, CY + 5.0, 2.1, { len: 2.2, rad: 0.2 });
    // the three cairns
    for (const [x, y] of CPA.CAIRN) H.put('cairn', CX + x, CY + y, 0, { r: 0.9, hh: 1.5 });
    // the Fire Step: the hearth under the crags
    H.put('cpahearth', CX + CPA.FIRE[0], CY + CPA.FIRE[1], 0, { old: false });
    cpaCrags(H);
    // the landing: a skin boat drawn up, and a hide-wrapped bundle of nets by it
    H.put('boat', CX + CPA.LAND[0] - 2.4, CY + CPA.LAND[1] - 3.0, Math.PI / 2 + 0.25, { len: 4.2, beam: 1.5, paint: '#4a3a2a' });
    H.put('cairn', CX + CPA.LAND[0] + 2.6, CY + CPA.LAND[1] - 1.2, 0, { r: 0.5, hh: 0.9 });
    // an old wreck on the east shore: a hull older than anyone's grandmother, ribs out of the shingle
    H.wrecks.push({ x: CX + CPA.WRECK1[0], y: CY + CPA.WRECK1[1], r: 6.5, ang: 1.9, lean: 0.4, name: 'an old wreck', ribs: 4 });
    H.track([cpaW(CPA.LAND), [CX + 1, CY - 14], [CX + 3.4, CY + 7], [CX, CY + 18.5]]);
    ZMD.START = [0, -26]; CP1_MAP.start = [0, -26];
  },
  props(H) { cpaClearSpots(H); },
  decor() {},
};
// the fire-keepers' bothy: a beehive hut of dry-laid stone, corbelled in to a cap, a low door with a lintel, turf on
// its shoulders
FPI_K.cpabothy = {
  col: FPI_C.stone, noShadow: false,
  sol(p) { return [fpiCirc(p, 0, 0, 3.0, 3.4)]; },
  b3(p, A) {
    const n = 16;
    for (let c = 0; c < 8; c++) {
      const z = c * 0.42, rr = 3.0 * Math.cos(c / 8 * 1.25) + 0.1;
      for (let i = 0; i < n; i++) {
        const a = (i + (c % 2) * 0.5) / n * Math.PI * 2;
        if (Math.abs(angDiff(a, 0)) < 0.3 && c < 3) continue;   // (the door)
        A.part('box', (i + c) % 3 ? FPI_C.stone : FPI_C.stone2, Math.cos(a) * rr, Math.sin(a) * rr, z + 0.21, 0.55, 0.44, rr * 6.283 / n + 0.12, -a, 0, 0);
      }
    }
    A.part('ico', FPI_C.stone3, 0, 0, 3.35, 1.1, 0.5, 1.1, 0.3);
    A.box('#050607', 2.9, 0, 0, 0.3, 1.0, 1.15);
    A.box(FPI_C.stone3, 3.05, 0, 1.15, 0.5, 1.5, 0.28);
    for (let i = 0; i < 9; i++) { const a = A.r() * 6.283; A.part('ico', FPI_C.turf, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 2.3 + A.r() * 0.4, 0.9, 0.3, 0.9, A.r() * 3); }
  },
};
// the Fire Step's hearth: a broad ring of fire-blackened stones, a flagged floor, a kerb on the seaward side (the fire
// is the stage's own 3D). old: as it is in 1889, cold for fifty years, weed in the cracks, an iron grate left on it
FPI_K.cpahearth = {
  col: FPI_C.stone2,
  sol(p) { return [fpiCirc(p, 0, 0, 1.55, 0.75)]; },
  b3(p, A) {
    A.cyl(p.old ? '#3e4644' : '#3a3632', 0, 0, 0, 2.2, 0.18, 0, 0, 0, 'cyl8');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + A.r() * 0.2, d = 1.45 + A.r() * 0.15; A.part('ico', i % 3 ? '#2a2826' : FPI_C.stone2, Math.cos(a) * d, Math.sin(a) * d, 0.35, 0.62, 0.55, 0.6, A.r() * 3); }
    A.cyl('#1a1612', 0, 0, 0.18, 1.2, 0.2, 0, 0, 0, 'cyl8');
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.32, d = 2.7; A.part('box', FPI_C.stone3, Math.cos(a) * d, Math.sin(a) * d, 0.3, 0.9, 0.6, 0.5, -a, 0, 0); }
    if (p.old) {
      for (let i = 0; i < 5; i++) A.part('box', FPI_C.iron, -0.9 + i * 0.45, 0, 0.45, 0.08, 0.08, 2.0, 0, 0, 0);
      for (let i = 0; i < 8; i++) { const a = A.r() * 6.283; A.part('ico', FPI_C.moss, Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0.22, 0.4, 0.12, 0.4, 0); }
    } else for (let i = 0; i < 4; i++) A.log(FPI_C.tar, (A.r() - 0.5) * 0.6, (A.r() - 0.5) * 0.6, 0.5, 0.12, 1.4, i * 0.8, 0.1);
  },
};

// ---------- the fire-keeping kit ----------
// (any stage, everyone, as it's entered) cfg: { lit, fuel, need, piles (true: every spot has a bundle), drain,
//   bankEvery: [min, max] seconds between banks (0: none), wash: seconds between bundles washing up (0: none) }
function cpkEnter(cfg) {
  const S = RAID.st;
  S.kcfg = cfg;
  S.kp = { lit: cfg.lit ? 1 : 0, fuel: cfg.fuel == null ? 0 : cfg.fuel, emb: 0, stack: 0, need: cfg.need || 0, piles: CPA_SPOTS.map(() => cfg.piles ? 1 : 0), carry: {}, brand: {}, banks: [], bid: 0, bankT: cfg.bankFirst || 10, washT: cfg.wash || 0, fed: 0, burnt: 0, hits: 0, out: 0 };
  S.kpSeen = { fed: 0, hits: 0, burnt: 0, lit: S.kp.lit };
  S.kpPend = 0; S.kpUseT = 0;
  S.fire = cpaW(cfg.at || CPA.FIRE);
}
const cpkS = () => RAID.st && RAID.st.kp;
const cpkMine = () => { const K = cpkS(); return K ? { carry: !!K.carry[FPS.me.id], brand: K.brand[FPS.me.id] || 0 } : { carry: false, brand: 0 }; };
// (hosting or alone, each tick)
function cpkTick(dt) {
  const S = RAID.st, K = S.kp, cfg = S.kcfg; if (!K) return;
  const n = cpaN(), [fx, fy] = S.fire;
  // who's carrying or holding a brand and isn't standing: dropped, lost
  for (const sid of Object.keys(K.carry)) if (!cpaUp(sid) || !(ZM.hum || []).some(h => h[0] === sid) && sid !== FPS.me.id) delete K.carry[sid];
  for (const sid of Object.keys(K.brand)) { K.brand[sid] -= dt; if (K.brand[sid] <= 0 || !cpaUp(sid)) delete K.brand[sid]; }
  // the fire burning its fuel away; kicked apart by the drowned crowding it
  if (K.lit) {
    let kick = 0; for (const z of ZM.z) if (!z.dead && !z.boss && !(z.rr > 0) && Math.hypot(z.x - fx, z.y - fy) < CPA.KICK_R) kick++;
    K.kick = kick;
    const was = K.fuel;
    K.fuel = Math.max(0, K.fuel - (cfg.drain || 0) * (1 + 0.22 * (n - 1)) * dt - kick * CPA.KICK * dt);
    if (kick && was > 0 && Math.random() < dt * 0.6) cpaFeed('The drowned are kicking the fire apart!');
    if (K.fuel <= 0 && was > 0) { K.emb = CPA.EMBER; if (cfg.onEmbers) cfg.onEmbers(); }
    if (K.fuel <= 0) { K.emb -= dt; if (K.emb <= 0 && cfg.onOut) { K.emb = 0; cfg.onOut(); } }
  }
  // the sea gives up more wood
  if (cfg.wash) { K.washT -= dt; if (K.washT <= 0) { K.washT = cfg.wash * (0.8 + Math.random() * 0.4) / (1 + 0.15 * (n - 1)); const free = K.piles.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (free.length) { K.piles[free[(Math.random() * free.length) | 0]] = 1; K.wash = (K.wash | 0) + 1; if (cfg.onWash) cfg.onWash(); } } }
  // the haar: banks rolling in off the sea for the fire
  if (cfg.bankEvery && cfg.bankEvery[0] > 0) {
    K.bankT -= dt;
    if (K.bankT <= 0) {
      const [a0, a1] = cfg.bankEvery; K.bankT = (a0 + Math.random() * (a1 - a0)) / (1 + 0.2 * (n - 1));
      const many = cfg.bankTwo && Math.random() < cfg.bankTwo ? 2 : 1;
      for (let j = 0; j < many; j++) cpkBank(cfg);
    }
  }
  for (let i = K.banks.length - 1; i >= 0; i--) {
    const B = K.banks[i], dx = fx - B.x, dy = fy - B.y, d = Math.hypot(dx, dy) || 1, sp = (cfg.bankSp || CPA.BANK_SP);
    B.x += dx / d * sp * dt; B.y += dy / d * sp * dt; B.age = (B.age || 0) + dt;
    // burned off by brands in it
    let k = 0; for (const sid of Object.keys(K.brand)) { const p = cpaAt(sid); if (p && Math.hypot(p.x - B.x, p.y - B.y) < CPA.BANK_R + 0.9) k++; }
    if (k) { B.hp -= dt * k / CPA.BURN; if (B.hp <= 0) { K.banks.splice(i, 1); K.burnt++; continue; } }
    if (d < 2.6) {
      K.banks.splice(i, 1); K.hits++;
      if (K.lit && K.fuel > 0) { const was = K.fuel; K.fuel = Math.max(0, K.fuel - (cfg.bankHit || CPA.BANK_HIT)); if (K.fuel <= 0 && was > 0) { K.emb = CPA.EMBER; if (cfg.onEmbers) cfg.onEmbers(); } }
      if (cfg.onSmother) cfg.onSmother();
    }
  }
}
// (hosting or alone) a bank of fog off the sea, from a side away from the crags
function cpkBank(cfg) {
  const K = RAID.st.kp, [fx, fy] = RAID.st.fire;
  let a = 0;
  for (let t = 0; t < 12; t++) { a = Math.random() * Math.PI * 2; if (Math.abs(angDiff(a, Math.PI / 2)) > 0.8) break; }
  const d = CPA.R + 4;
  K.banks.push({ id: ++K.bid % 1000, x: FPSC.CX + Math.cos(a) * d, y: FPSC.CY + Math.sin(a) * d, hp: 1, age: 0 });
  if (cfg.onBank) cfg.onBank(K.banks[K.banks.length - 1]);
  void fx; void fy;
}
// (hosting or alone) what a player asked of the fire
function cpkQ(sid, k, a) {
  const S = RAID.st, K = S.kp, cfg = S.kcfg; if (!K) return false;
  if (k === 'take') { const i = a | 0; if (K.piles[i] && !K.carry[sid] && cpaUp(sid)) { K.piles[i] = 0; K.carry[sid] = 1; delete K.brand[sid]; } return true; }
  if (k === 'feed') {
    if (!K.carry[sid]) return true;
    delete K.carry[sid]; K.fed++;
    if (K.lit) { K.fuel = Math.min(100, K.fuel + (cfg.wood || CPA.WOOD)); K.emb = 0; } else K.stack++;
    if (cfg.onFeed) cfg.onFeed(sid);
    return true;
  }
  if (k === 'brand') { if (K.lit && K.fuel > 0 && !K.carry[sid] && cpaUp(sid)) K.brand[sid] = CPA.BRAND; return true; }
  if (k === 'light') { if (!K.lit && K.stack >= K.need) { K.lit = 1; K.fuel = Math.max(K.fuel, Math.min(100, 30 + K.stack * 12)); if (cfg.onLight) cfg.onLight(sid); } else if (K.lit && K.fuel <= 0 && cfg.relight) { K.fuel = cfg.relight; K.emb = 0; if (cfg.onLight) cfg.onLight(sid); } return true; }
  if (k === 'drop') { delete K.carry[sid]; return true; }
  return false;
}
// (hosting) ka: [lit, fuel (tenths), embers (tenths), stack, need, the strand (bits), carrying, brands, banks, counts]
function cpkPack(o) {
  const K = cpkS(); if (!K) return;
  let bits = 0; K.piles.forEach((v, i) => { if (v) bits |= 1 << i; });
  o.ka = [K.lit, Math.round(K.fuel * 10), Math.round(K.emb * 10), K.stack, K.need, bits, Object.keys(K.carry).join(','), Object.entries(K.brand).map(([s, t]) => [s, Math.round(t)]),
    K.banks.map(B => [B.id, Math.round((B.x - FPSC.CX) * 10), Math.round((B.y - FPSC.CY) * 10), Math.round(B.hp * 100)]), [K.fed, K.hits, K.burnt, K.kick | 0, K.wash | 0]];
}
function cpkApply(o) {
  const K = cpkS(), a = o.ka; if (!K || !Array.isArray(a)) return;
  K.lit = a[0] ? 1 : 0; K.fuel = (+a[1] || 0) / 10; K.emb = (+a[2] || 0) / 10; K.stack = a[3] | 0; K.need = a[4] | 0;
  const bits = a[5] | 0; K.piles = CPA_SPOTS.map((_, i) => (bits >> i) & 1);
  K.carry = {}; for (const s of String(a[6] || '').split(',')) if (s) K.carry[s] = 1;
  K.brand = {}; if (Array.isArray(a[7])) for (const e of a[7]) if (Array.isArray(e)) K.brand[String(e[0])] = +e[1] || 0;
  // (while I've just asked, what I asked stands)
  if (RAID.st.kpPend > 0 && RAID.st.kpMine) { const m = RAID.st.kpMine; if (m.carry != null) { if (m.carry) K.carry[FPS.me.id] = 1; else delete K.carry[FPS.me.id]; } if (m.brand) K.brand[FPS.me.id] = K.brand[FPS.me.id] || CPA.BRAND; }
  const old = new Map(K.banks.map(B => [B.id, B]));
  K.banks = Array.isArray(a[8]) ? a[8].filter(Array.isArray).map(e => { const B = old.get(e[0] | 0) || { id: e[0] | 0 }; B.tx = FPSC.CX + (+e[1] || 0) / 10; B.ty = FPSC.CY + (+e[2] || 0) / 10; if (B.x == null) { B.x = B.tx; B.y = B.ty; } B.hp = (+e[3] || 0) / 100; return B; }) : [];
  if (Array.isArray(a[9])) { K.fed = a[9][0] | 0; K.hits = a[9][1] | 0; K.burnt = a[9][2] | 0; K.kick = a[9][3] | 0; K.wash = a[9][4] | 0; }
}
// (everyone, each frame) my side: holding Use to light it, dropping what I carry if I go down, the banks eased to the
// host's word, and the sound of what's happened
function cpkMe(dt) {
  const S = RAID.st, K = S.kp; if (!K) return;
  if (S.kpPend > 0) { S.kpPend -= dt; if (S.kpPend <= 0) S.kpMine = null; }
  const m = FPS.me, alive = !(m.dead > 0) && !zmIsDown() && !ZM.over && !cpCineOn();
  if (K.carry[m.id] && !alive && !cpCineOn()) { cpkAsk('drop', 0, { carry: false }); }
  for (const B of K.banks) B.age = ZM.net === 'client' ? (B.age || 0) + dt : B.age;
  if (ZM.net === 'client') { for (const B of K.banks) if (B.tx != null) { const k = Math.min(1, dt * 4); B.x += (B.tx - B.x) * k; B.y += (B.ty - B.y) * k; } for (const s in K.brand) K.brand[s] = Math.max(0, K.brand[s] - dt); }
  // hold Use at the stacked fire to light it
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
  if (hold && o && o.k === 'cpalight' && alive && !(S.kpPend > 0)) { S.kpUseT += dt; if (S.kpUseT >= CPA.LIGHT) { S.kpUseT = 0; cpkAsk('light', 0, {}); } } else S.kpUseT = 0;
  const Sn = S.kpSeen, [fx, fy] = S.fire, df = Math.hypot(fx - m.x, fy - m.y);
  if (K.fed !== Sn.fed) { if (K.fed > Sn.fed) cpaSound('feed', df); Sn.fed = K.fed; }
  if (K.hits !== Sn.hits) { if (K.hits > Sn.hits) { cpaSound('smother', df); fpsPuff(fx, fy, FPSC.GROUND + 1.6, '150,160,170', 16); } Sn.hits = K.hits; }
  if (K.burnt !== Sn.burnt) { if (K.burnt > Sn.burnt) cpaSound('burn', 0); Sn.burnt = K.burnt; }
  if (K.lit !== Sn.lit) { if (K.lit) cpaSound('catch', df); Sn.lit = K.lit; }
}
// ask the host (and, joined, do it on my side at once)
function cpkAsk(k, a, mine) {
  const S = RAID.st; raidAsk(k, a);
  if (ZM.net === 'client') { S.kpPend = 0.9; S.kpMine = mine; const K = S.kp; if (mine.carry != null) { if (mine.carry) K.carry[FPS.me.id] = 1; else delete K.carry[FPS.me.id]; } if (mine.brand) K.brand[FPS.me.id] = CPA.BRAND; if (k === 'take') K.piles[a | 0] = 0; }
}
// (stage hooks) what's in reach, its prompt, and Use
function cpkConsider(c) {
  const K = cpkS(); if (!K) return;
  const m = FPS.me, mz = m.jz || 0, me = cpkMine(), [fx, fy] = RAID.st.fire;
  if (!me.carry) CPA_SPOTS.forEach((p, i) => { if (K.piles[i]) { const [x, y] = cpaW(p); c({ k: 'cpawood', i }, x, y, mz, 2.2, false); } });
  if (me.carry) c({ k: 'cpafeed' }, fx, fy, mz, CPA.FIRE_USE, false);
  else if (!K.lit && K.stack >= K.need && K.need > 0) c({ k: 'cpalight' }, fx, fy, mz, CPA.FIRE_USE, false);
  else if (K.lit && K.fuel <= 0 && RAID.st.kcfg.relight) c({ k: 'cpalight' }, fx, fy, mz, CPA.FIRE_USE, false);
  else if (K.lit && K.fuel > 0) c({ k: 'cpabrand' }, fx, fy, mz, CPA.FIRE_USE, false);
}
function cpkPrompt(o) {
  const K = cpkS(); if (!K) return null;
  if (o.k === 'cpawood') return { text: 'Pick up the driftwood', free: true };
  if (o.k === 'cpafeed') return { text: K.lit ? `Feed the fire (+${RAID.st.kcfg.wood || CPA.WOOD})` : `Stack the wood on the hearth (${K.stack} of ${K.need})`, free: true };
  if (o.k === 'cpalight') return { text: K.lit ? 'Hold to blow the embers back to flame' : 'Hold to light the fire', hold: true };
  if (o.k === 'cpabrand') { const b = cpkMine().brand; return { text: b > 0 ? `A fresh brand from the fire (yours has ${Math.ceil(b)} s left)` : 'Take a burning brand from the fire (it burns fog off)', free: true }; }
  return null;
}
function cpkUse(o) {
  if (o.k === 'cpawood') { const K = cpkS(); if (!K.piles[o.i]) { zmSound('no'); return true; } cpkAsk('take', o.i, { carry: true }); cpaSound('take', 0); fpsFeed('Driftwood in your arms. Carry it up to the fire.'); return true; }
  if (o.k === 'cpafeed') { cpkAsk('feed', 0, { carry: false }); return true; }
  if (o.k === 'cpalight') return true;
  if (o.k === 'cpabrand') { cpkAsk('brand', 0, { brand: true }); cpaSound('brand', 0); return true; }
  return false;
}
// the drowned go for the fire too while it burns
function cpkPlayers(P) { const K = cpkS(); if (!K || !K.lit || K.fuel <= 0) return P; const [x, y] = RAID.st.fire; return P.concat([{ sid: '', x, y, jz: 0, beacon: true }]); }
// arms full: no gun (Freebooters' Sea's own rule, src/fbsea.js fbNoGun, wrapped), and a little slower
{ const g0 = fbNoGun; fbNoGun = function () { return g0() || (CP.on && RAID.on && !!(RAID.st.kp && RAID.st.kp.carry[FPS.me.id])); }; }
const cpkSpeedK = () => cpkMine().carry ? 0.84 : 1;

// ---------- the fire on the screen ----------
function cpkHud(phone, mono, fell, o) {
  const K = cpkS(); if (!K || ZM.over) return;
  o = o || {};
  const L = Math.max(14, FPS.safeLeft || 0), t = g.t, me = cpkMine();
  let y = fpsHudTop() + (phone ? 68 : 92);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const w = phone ? 150 : 214, h = phone ? 7 : 9;
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(L - 4, y - 4, w + 8, h + (phone ? 22 : 28));
  if (K.lit) {
    const k = clamp(K.fuel / 100, 0, 1), hi = o.high != null && K.fuel >= o.high;
    ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(L, y, w, h);
    ctx.fillStyle = K.fuel <= 0 ? `rgba(220,90,60,${0.6 + 0.4 * Math.sin(t * 9)})` : k < 0.25 ? `rgba(240,140,70,${0.75 + 0.25 * Math.sin(t * 6)})` : hi ? '#ffe08a' : '#ff9a4a';
    ctx.fillRect(L, y, w * k, h);
    if (o.high != null) { ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.fillRect(L + w * o.high / 100 - 1, y - 2, 2, h + 4); }
    ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = K.fuel <= 0 ? '#ff9a7a' : 'rgba(236,228,207,0.8)';
    ctx.fillText(K.fuel <= 0 ? `EMBERS · FEED IT IN ${Math.ceil(K.emb)} S OR IT'S OUT` : `THE FIRE · ${Math.round(K.fuel)}%${hi ? ' · BLAZING' : ''}${K.kick ? ' · KICKED AT!' : ''}`, L, y + h + 5);
  } else {
    ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(L, y, w, h);
    ctx.fillStyle = '#c8a070'; ctx.fillRect(L, y, w * clamp(K.stack / Math.max(1, K.need), 0, 1), h);
    ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.8)';
    ctx.fillText(`WOOD ON THE HEARTH · ${K.stack} OF ${K.need}`, L, y + h + 5);
  }
  y += h + (phone ? 26 : 32);
  if (K.banks.length) { ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = `rgba(200,212,224,${0.75 + 0.25 * Math.sin(t * 5)})`; ctx.fillText(`${K.banks.length} BANK${K.banks.length > 1 ? 'S' : ''} OF FOG ROLLING IN FOR THE FIRE`, L, y); y += phone ? 13 : 16; }
  fpsHudNote(y); const yEnd = y;
  // what's in your hands
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = mono(phone ? 10 : 12);
  if (me.carry) { ctx.fillStyle = '#ffd88a'; ctx.fillText('DRIFTWOOD IN YOUR ARMS · CARRY IT TO THE FIRE (USE)', cx, H - (phone ? 150 : 110), W - 40); }
  else if (me.brand > 0) { ctx.fillStyle = '#ffb070'; ctx.fillText(`A BRAND · ${Math.ceil(me.brand)} S · WALK INTO THE FOG TO BURN IT OFF`, cx, H - (phone ? 150 : 110), W - 40); }
  // lighting it: a ring round the sights filling
  if (RAID.st.kpUseT > 0) {
    const k = Math.min(1, RAID.st.kpUseT / CPA.LIGHT);
    ctx.strokeStyle = 'rgba(255,192,112,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#ffc070'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
  }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  return yEnd;
}
// the sounds: the recordings where there's one, else the synth
function cpaSound(k, d) {
  const v = clamp(1 - (d || 0) / 50, 0.15, 1), play = (n, vol) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, { vol: vol * v, vary: 0.08 }); } catch (e) { return false; } };
  const syn = f => { try { if (!soundOff() && AUD.ctx) f(); } catch (e) {} };
  if (k === 'take') { play('pickup', 0.5); syn(() => noise('lowpass', 500, 1, 0.005, 0.12, 0.25)); return; }
  if (k === 'feed') { play('debris', 0.5); syn(() => { noise('bandpass', 900, 1, 0.01, 0.1, 0.5); noise('lowpass', 300, 1, 0.05, 0.1, 0.9); }); return; }
  if (k === 'brand') { syn(() => { noise('highpass', 1800, 1, 0.01, 0.08, 0.4); tone(180, 'triangle', 0.01, 0.03, 0.3, { to: 260 }); }); return; }
  if (k === 'catch') { try { if (!soundOff() && typeof sfxFlare === 'function') sfxFlare(); } catch (e) {} syn(() => noise('lowpass', 700, 1, 0.2, 0.12, 2.2)); return; }
  if (k === 'smother') { play('foghorn', 0.5); syn(() => { noise('highpass', 2400, 1, 0.01, 0.1, 0.9); tone(200, 'sine', 0.01, 0.04, 0.6, { to: 110 }); }); return; }
  if (k === 'burn') { syn(() => { noise('bandpass', 1400, 1, 0.01, 0.1, 0.6); tone(520, 'sine', 0.01, 0.02, 0.4, { to: 760 }); }); return; }
  if (k === 'horn') { play('frhorn', 0.9); return; }
}

// ---------- the fire, the strand, the fog and what you carry, in 3D ----------
const CPK3 = { on: false };
function cpk3dBuild(grp, o) {
  o = o || {};
  const G0 = FPSC.GROUND, Q = CPK3;
  Q.on = true; Q.grp = grp; Q.o = o;
  Q.soft = Q.soft || z3Soft('rgba(255,214,150,0.95)', 'rgba(255,150,70,0)');
  Q.fogT = Q.fogT || z3Soft('rgba(196,204,212,0.85)', 'rgba(170,180,190,0)');
  Q.coal = Q.coal || z3Soft('rgba(255,110,50,0.9)', 'rgba(200,60,20,0)');
  const spr = (map, op, add) => new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: add === false ? THREE.NormalBlending : THREE.AdditiveBlending, fog: add === false, opacity: op == null ? 1 : op }));
  const [fx, fy] = RAID.st.fire || cpaW(CPA.FIRE), fz = G0 + fpsIsleH(FPS.g.isle, fx, fy) + (o.fireZ || 0.9);
  Q.fz = fz;
  // the fire: tongues of flame, a halo, embers, and its light
  Q.flames = []; for (let i = 0; i < 5; i++) { const s = spr(Q.soft); s.position.copy(z3v(fx + (i - 2) * 0.25, fy + ((i * 7) % 3 - 1) * 0.2, fz + 0.6)); grp.add(s); Q.flames.push(s); }
  Q.halo = spr(Q.soft, 0.3); Q.halo.position.copy(z3v(fx, fy, fz + 1)); grp.add(Q.halo);
  Q.coalS = spr(Q.coal, 0); Q.coalS.position.copy(z3v(fx, fy, fz + 0.15)); Q.coalS.scale.set(2.4, 0.9, 1); grp.add(Q.coalS);
  Q.L = new THREE.PointLight(0xffa050, 0, 40, 1.3); Q.L.position.copy(z3v(fx, fy, fz + 1.6)); grp.add(Q.L);
  // the stack (unlit): logs piled on the hearth, one more for each bundle
  const lam = z3Lam(FPI_C.drift), lam2 = z3Lam('#5a4a38');
  Q.stack = []; for (let i = 0; i < 10; i++) { const g2 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.6, 6), i % 2 ? lam : lam2); const a = i * 1.1; g2.rotation.set(0.9 + (i % 3) * 0.2, a, 0); g2.position.copy(z3v(fx + Math.cos(a) * 0.35, fy + Math.sin(a) * 0.35, fz + 0.35 + Math.floor(i / 3) * 0.22)); g2.visible = false; grp.add(g2); Q.stack.push(g2); }
  // the strand's bundles
  Q.piles = CPA_SPOTS.map(p => {
    const g2 = new THREE.Group(), [x, y] = cpaW(p); g2.position.copy(z3v(x, y, G0 + fpsIsleH(FPS.g.isle, x, y)));
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09 + i * 0.01, 0.11, 1.4 + (i % 2) * 0.4, 6), i % 2 ? lam : lam2); l.rotation.set(Math.PI / 2, 0, 0); l.rotation.y = i * 0.5 - 0.7; l.position.set((i - 1.5) * 0.18, 0.12 + (i % 2) * 0.12, 0); g2.add(l); }
    const gl = spr(Q.soft, 0.12); gl.scale.setScalar(1.6); gl.position.y = 0.4; g2.add(gl);
    grp.add(g2); return g2;
  });
  // fog banks: a pool of them, each a cluster of soft grey puffs
  Q.banks = new Map(); Q.bankPool = [];
  // what's in your hands: a bundle of wood, low in front; a burning brand at your left
  { const H2 = Q.held = new THREE.Group(); grp.add(H2); for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.8, 6), i % 2 ? lam : lam2); l.rotation.set(0, 0, Math.PI / 2 + (i - 1) * 0.1); l.position.set(0, i * 0.06, (i - 1) * 0.05); H2.add(l); } H2.visible = false; }
  { const B = Q.brand = new THREE.Group(); grp.add(B); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.42, 6), lam2); B.add(st); const f = Q.brandF = spr(Q.soft); f.material.fog = false; f.position.y = 0.26; f.scale.set(0.18, 0.3, 1); B.add(f); B.visible = false;
    Q.brandL = new THREE.PointLight(0xffa860, 0, 9, 1.4); grp.add(Q.brandL); }
  // the others' bundles and brands
  Q.theirs = [];
}
function cpkBankMesh(B) {
  const Q = CPK3;
  let M = Q.bankPool.pop();
  if (!M) {
    M = new THREE.Group(); M.puffs = [];
    for (let i = 0; i < 11; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.fogT, transparent: true, depthWrite: false, opacity: 0.8 })); const a = i / 11 * 6.283; s.userData = { a, r: 0.6 + (i % 3) * 0.9, h: 0.7 + (i % 4) * 0.5, s: 2.6 + (i % 3) * 0.9, ph: i * 1.7 }; M.add(s); M.puffs.push(s); }
    Q.grp.add(M);
  }
  M.visible = true; Q.banks.set(B.id, M); return M;
}
function cpk3d(dt) {
  const Q = CPK3, K = cpkS(); if (!Q.on || !K) return;
  const t = g.t, G0 = FPSC.GROUND, [fx, fy] = RAID.st.fire, m = FPS.me;
  // the fire, by its fuel
  const want = Q.over != null ? Q.over : K.lit ? (K.fuel > 0 ? 0.35 + 0.75 * K.fuel / 100 : 0.06) : 0;
  Q.k = (Q.k == null ? want : Q.k) + (want - (Q.k == null ? want : Q.k)) * Math.min(1, dt * 2);
  const k = Q.k, fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3);
  Q.flames.forEach((s, i) => { const w = reduceMotion ? 0 : Math.sin(t * (6 + i) + i * 2); s.visible = k > 0.08; s.scale.set((1.1 + 0.3 * w) * k * 1.6, (2.2 + 0.8 * w) * k * 1.8 * fl, 1); s.position.y = Q.fz + 0.4 + 0.9 * k + 0.25 * w * k; });
  Q.halo.visible = k > 0.02; Q.halo.scale.setScalar(6 + 14 * k); Q.halo.material.opacity = 0.18 + 0.2 * k * fl;
  Q.coalS.material.opacity = K.lit ? 0.5 + 0.3 * Math.sin(t * 3) : 0;
  Q.L.intensity = (K.lit ? 0.4 + 3.4 * k : 0) * fl; Q.L.distance = 18 + 34 * k;
  Q.stack.forEach((s, i) => { s.visible = !K.lit ? i < Math.ceil(K.stack * 10 / Math.max(1, K.need)) : K.fuel > i * 10; });
  // sparks up off it
  if (k > 0.1 && Math.random() < dt * 14 * k) FPS.parts.push({ x: fx + (Math.random() - 0.5) * 0.8, y: fy + (Math.random() - 0.5) * 0.8, z: Q.fz + 0.8, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, vz: 2 + Math.random() * 2.5 * k, t: 1.1, c: '255,180,90', up: true });
  // the strand
  Q.piles.forEach((g2, i) => { g2.visible = !!K.piles[i]; });
  // the banks
  const live = new Set();
  for (const B of K.banks) {
    live.add(B.id); const M = Q.banks.get(B.id) || cpkBankMesh(B);
    M.position.copy(z3v(B.x, B.y, G0 + 0.2));
    const burning = B.hp < 0.999, grow = clamp((B.age == null ? 1 : B.age) / 2, 0.2, 1) * (0.35 + 0.65 * B.hp);
    for (const s of M.puffs) { const u = s.userData, a = u.a + t * 0.25; s.position.set(Math.cos(a) * u.r * CPA.BANK_R / 2.4, u.h + Math.sin(t * 0.7 + u.ph) * 0.2, Math.sin(a) * u.r * CPA.BANK_R / 2.4); s.scale.setScalar(u.s * grow * 1.3); s.material.opacity = 0.75 * grow; s.material.color.setRGB(1, burning ? 0.85 + 0.15 * B.hp : 1, burning ? 0.7 + 0.3 * B.hp : 1); }
    if (burning && Math.random() < dt * 20) FPS.parts.push({ x: B.x + (Math.random() - 0.5) * 4, y: B.y + (Math.random() - 0.5) * 4, z: G0 + 0.5 + Math.random() * 2, vx: 0, vy: 0, vz: 1.2, t: 0.7, c: '255,170,90', up: true });
    if (Math.random() < dt * 6) FPS.parts.push({ x: B.x + (Math.random() - 0.5) * 5, y: B.y + (Math.random() - 0.5) * 5, z: G0 + 0.3 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, vz: 0.15, t: 2, c: '160,170,180' });
  }
  for (const [id, M] of Q.banks) if (!live.has(id)) { M.visible = false; Q.banks.delete(id); Q.bankPool.push(M); }
  // what's in my hands
  const me = cpkMine(), show = !(m.dead > 0) && !zmIsDown() && !fpsThird() && !cpCineOn();
  const h = m.h, p = m.p, ez = G0 + FPSC.EYE + (m.jz || 0) - (FPS.crouchEye || 0), fx2 = Math.sin(h), fy2 = Math.cos(h), cp = Math.cos(p), sp = Math.sin(p);
  const F = [fx2 * cp, fy2 * cp, sp], Rt = [fy2, -fx2, 0], U = [-fx2 * sp, -fy2 * sp, cp], at = (f, r, u) => z3v(m.x + F[0] * f + Rt[0] * r + U[0] * u, m.y + F[1] * f + Rt[1] * r + U[1] * u, ez + F[2] * f + U[2] * u);
  const sw = reduceMotion ? 0 : Math.sin((FPS.step || 0) * 0.5) * 0.02;
  // (held in the same place in your view at any field of view and screen shape, as Maren's Lantern is: src/raid.js)
  const Cm = GL3D.camera, D = 0.9, hh = D * Math.tan((Cm.fov || 50) * Math.PI / 360), hw = hh * (Cm.aspect || 1.6), sc = hh / 0.345 * 0.6;
  Q.held.visible = show && me.carry; if (Q.held.visible) { Q.held.scale.setScalar(sc); Q.held.position.copy(at(D, 0.05 * sc, -hh + (0.1 + sw) * sc)); Q.held.rotation.set(0, -h, 0); Q.held.rotateX(-p * 0.6); }
  Q.brand.visible = show && me.brand > 0 && !me.carry; Q.brandL.intensity = me.brand > 0 && !(m.dead > 0) ? 1.6 * fl : 0;
  if (Q.brand.visible) { Q.brand.scale.setScalar(sc * 0.8); Q.brand.position.copy(at(D, -hw + (0.16 + sw) * sc, -hh + 0.12 * sc)); Q.brand.rotation.set(0, -h, 0); Q.brand.rotateX(-p * 0.6 - 0.25); Q.brandF.scale.set(0.16 * fl, 0.26 * (2 - fl), 1); }
  Q.brandL.position.copy(z3v(m.x + fx2 * 0.4 - fy2 * 0.3, m.y + fy2 * 0.4 + fx2 * 0.3, ez - 0.2));
  if (me.brand > 0 && show && Math.random() < dt * 10) { const v = Q.brand.position; FPS.parts.push({ x: v.x, y: -v.z, z: v.y + 0.3, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, vz: 0.8, t: 0.5, c: '255,170,90', up: true }); }
  // the others: a bundle over the arms, or a brand's glow
  const list = [...FPS.remote.values()].filter(r => !r.dead && r.x != null && (K.carry[r.id] || K.brand[r.id] > 0));
  while (Q.theirs.length < list.length) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.soft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); const b = Q.held.clone(); b.visible = false; Q.grp.add(s); Q.grp.add(b); Q.theirs.push({ s, b }); }
  Q.theirs.forEach((T, i) => { const r = list[i]; T.s.visible = !!r && K.brand[r.id] > 0; T.b.visible = !!r && !!K.carry[r.id]; if (!r) return; const hh = r.h || 0; T.s.position.copy(z3v(r.x - Math.cos(hh) * 0.4, r.y + Math.sin(hh) * 0.4, G0 + (r.jz || 0) + 1.5)); T.s.scale.set(0.5 * fl, 0.9, 1); T.b.position.copy(z3v(r.x + Math.sin(hh) * 0.45, r.y + Math.cos(hh) * 0.45, G0 + (r.jz || 0) + 1.05)); T.b.rotation.set(0, -hh, 0); });
}
function cpk3dExit() { CPK3.on = false; CPK3.grp = null; if (CPK3.banks) CPK3.banks.clear(); }

// ---------- the night: the fog on the rock, the dark ----------
// (each frame) the fog as far as you see (and a wall of it, src/frrun.js frDome), the night's light
function cpaNight(far, col, amb, dt) {
  if (typeof GL3D === 'undefined' || !GL3D.scene) return;
  // (a cinematic, or one of its shots, can see further: fogFar, and its own light: amb)
  if (cpCineOn()) { const D = CPN.on, Sh = D.shots[CPN.shot] || {}; const ff = Sh.fogFar != null ? Sh.fogFar : D.fogFar; if (ff != null) { far = ff; dt = 1; } const am = Sh.amb != null ? Sh.amb : D.amb; if (am != null) amb = am; }
  const F = GL3D.scene.fog;
  if (F) { F.far += (far - F.far) * Math.min(1, dt * 1.5); F.near = F.far * 0.18; F.color.set(col); RAID.fog0 = true; }
  if (typeof frDome === 'function') frDome(F ? F.far : far, col);
  if (GL3D.amb && amb != null) GL3D.amb.intensity = amb;
}
function cpaNightOff() { try { if (typeof FRD !== 'undefined' && FRD.m) FRD.m.visible = false; } catch (e) {} }
// (hosting or alone) one of the drowned of the old wrecks up out of the shore, away from all of you
function cpaSpawn(o) {
  const P = ZM.players || [];
  for (let t = 0; t < 24; t++) {
    let a = Math.random() * 6.283; if (o && o.from != null) a = o.from + (Math.random() - 0.5) * 1.6;
    const d = CPA.R - 3 - Math.random() * 4, x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (Math.abs(angDiff(a, Math.PI / 2)) < 0.55) continue;   // (not up the crags)
    if (P.some(p => !p.beacon && Math.hypot(p.x - x, p.y - y) < 10)) continue;
    if (zmBlockedAt(x, y, 0.5, 0)) continue;
    const z = raidSpawnAt(x, y, o); if (z) fpsPuff(x, y, FPSC.GROUND + 0.5, '120,140,150', 5); return z;
  }
  return null;
}
const cpaKind = (run) => { const u = Math.random(); return u < run ? 'run' : u < run + 0.5 ? 'jog' : 'walk'; };
const cpaHp = (r) => zmHp(RAIDC.ROUND + r) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (cpaN() - 1));
// the Fire-Keeper by his fire: a figure at the hearth (everyone's 3D)
function cpaKeeperB3() { const F = RAID.st.npc = cpkNpc(['#4a3a28', '#b8a888', '#6a4a2a', '#ffd88a'], 'oc_gansey'); return F; }
function cpaKeeperF3(dt) {
  const F = RAID.st.npc; if (!F) return;
  const [fx, fy] = RAID.st.fire, x = fx - 3.2, y = fy - 1.6, m = FPS.me;
  if (CPK3.hideNpc) { if (F.root) F.root.visible = false; return; }
  cpkNpcPose(F, { x, y, h: bearingOf(m.x - x, m.y - y) * 0.3 + bearingOf(fx - x, fy - y) * 0.7, spd: 0, dt, noGun: true, lan: false });
}
function cpaKeeperExit() { const S = RAID.st; if (S && S.npc) { cpkNpcFree(S.npc); S.npc = null; } }

// =====================================================================================================================
// the mission's stages
// =====================================================================================================================
cpCast('wenna', { n: 'Wenna', c: '#f0b890' });
cpCast('lastfire', { n: 'The Last Fire-Keeper', c: '#ffb070' });
cpCast('m01mast', { n: 'The Shipmaster', c: '#c8c0a8' });
CP_MUSIC_FALL.cpm01dusk = 'raidpier'; CP_MUSIC_FALL.cpm01haar = 'frsail'; CP_MUSIC_FALL.cpm01ship = 'frisle'; CP_MUSIC_FALL.cpm01keel = 'frboss';

// the hooks every stage of the mission shares (the fire, the strand, the fog), over its own
function cp1Stage(def) {
  return Object.assign({
    map: CP1_MAP, mend: true, open: true,
    banner: () => ({ text: def.n, t: 4.5, sub: 'Part ' + raidNumeral((RAID.stage | 0) + 1) + ' · ' + (def.sub || 'Lantern Rock'), col: '#ffd8a0' }),
    set() {},
    me(dt) { cpkMe(dt); if (def.me2) def.me2(dt); },
    q(sid, k, a) { if (cpkQ(sid, k, a)) return; if (def.q2) def.q2(sid, k, a); },
    pack(o) { cpkPack(o); if (def.pack2) def.pack2(o); },
    apply(o) { cpkApply(o); if (def.apply2) def.apply2(o); },
    consider: c => cpkConsider(c), prompt: o => cpkPrompt(o), use: o => cpkUse(o),
    players: P => cpkPlayers(P), speedK: () => cpkSpeedK(),
    b3(grp) { cpk3dBuild(grp); cpaKeeperB3(); if (def.b32) def.b32(grp); },
    f3(dt) { cpk3d(dt); cpaKeeperF3(dt); if (def.f32) def.f32(dt); },
    exit() { cpk3dExit(); cpaKeeperExit(); cpaNightOff(); if (def.exit2) def.exit2(); },
  }, def);
}

// ---------- I. Driftwood ----------
cpStage('m01wood', cp1Stage({
  n: 'Driftwood', sub: 'dusk on Lantern Rock',
  music: () => 'cpm01dusk',
  enter() {
    const n = cpaN();
    cpkEnter({ lit: false, need: 3 + n, piles: true, drain: 0, onFeed: sid => cp1WoodFed(sid), onLight: sid => cp1Lit(sid) });
    Object.assign(RAID.st, { spT: 30, t: 0 });
    if (ZM.net !== 'client') { cpObjective(`Carry driftwood up from the strand to the Fire Step (0 of ${3 + n})`); cpWaypoint(CPA_SPOTS[3][0], CPA_SPOTS[3][1], 'Driftwood'); }
    ZM.round = Math.max(ZM.round, 4);
  },
  tick(dt) {
    const S = RAID.st, K = S.kp, n = cpaN(); S.t += dt;
    if (S.doneT > 0) { S.doneT -= dt; if (S.doneT <= 0) cpDone(); return; }
    cpkTick(dt);
    if (S.t > 3) cpaOnce('w1', 'fire', 'Wet wood smokes. Dry wood burns. Bring me the dry.', 'cp_m01_04');
    if (S.t > 16) cpaOnce('w2', 'wenna', 'There’s a deal of wrack on the west strand, and it’s dry above the weed.', 'cp_m01_05');
    // the first of the drowned, as the light goes
    S.spT -= dt;
    if (S.spT <= 0) { S.spT = (12 + Math.random() * 6) / Math.sqrt(n); if (ZM.z.filter(z => !z.dead).length < 1 + n) { const z = cpaSpawn({ kind: 'walk', hp: cpaHp(0) }); if (z) cpaOnce('w3', 'fire', 'Something moved on the strand. Keep your eyes to the water.', 'cp_m01_07'); } }
    // the waypoint: the nearest bundle, or the fire once you're carrying or there's enough
    const me = cpkMine(), m = FPS.me;
    if (K.stack >= K.need) cpWaypoint(CPA.FIRE[0], CPA.FIRE[1], 'Light the fire', 1.4);
    else if (me.carry) cpWaypoint(CPA.FIRE[0], CPA.FIRE[1], 'The Fire Step', 1.4);
    else { let b = -1, bd = 1e9; K.piles.forEach((v, i) => { if (!v) return; const [x, y] = cpaW(CPA_SPOTS[i]), d = Math.hypot(x - m.x, y - m.y); if (d < bd) { bd = d; b = i; } }); if (b >= 0) cpWaypoint(CPA_SPOTS[b][0], CPA_SPOTS[b][1], 'Driftwood'); }
  },
  hud(phone, mono, fell) { cpkHud(phone, mono, fell); },
  f32(dt) { const S = RAID.st; S.dusk = Math.min(1, (S.dusk || 0) + dt / 140); cpaNight(140 - 60 * S.dusk, '#2a3038', 0.42 - 0.14 * S.dusk, dt); },
}));
function cp1WoodFed() {
  const K = RAID.st.kp;
  if (K.stack >= K.need) { cpObjective('Light the fire: hold Use at the Fire Step'); cpaOnce('w4', 'fire', 'Enough. Put a flame to it and let her catch.', 'cp_m01_06'); }
  else cpObjective(`Carry driftwood up from the strand to the Fire Step (${K.stack} of ${K.need})`);
}
function cp1Lit(sid) { cpaFeed(`${cpaNick(sid)} lit the fire on the Fire Step.`); cpObjective(''); cpWaypoint(null); RAID.st.doneT = 0.6; }

// ---------- II. The Haar ----------
cpStage('m01haar', cp1Stage({
  n: 'The Haar', sub: 'the night',
  music: () => 'cpm01haar',
  enter() {
    const n = cpaN();
    cpkEnter({ lit: true, fuel: 85, piles: false, drain: 0.62, wash: 7.5, bankEvery: [13, 19], bankFirst: 9, bankTwo: 0.25,
      onEmbers: () => { cpaOnce('h5', 'fire', 'She’s down to embers! Wood, now!', 'cp_m01_15'); cpaBan('Embers', 'feed the fire before it goes out', '#ff9a7a'); },
      onOut: () => cpFail('The fire went out, and the haar came in over the rock'),
      onBank: () => { if (cpaOnce('h2', 'fire', 'Fog on the rock! Meet it with fire before it reaches her.', 'cp_m01_12')) cpaBan('The haar rolls in', 'take a brand from the fire (Use) and walk into the fog to burn it off'); },
      onSmother: () => cpaFeed('A bank of fog rolled over the fire and smothered half of it.'),
      onWash: () => { if (RAID.st.kp.wash === 1) cpaOnce('h4', 'fire', 'Fresh wood on the strand. The sea’s breaking something up out there.', 'cp_m01_14'); } });
    // (some wood on the strand to start with)
    { const K = RAID.st.kp; for (const i of [1, 4, 7, 10]) K.piles[i] = 1; }
    Object.assign(RAID.st, { t: 0, spT: 5, half: 0 });
    if (ZM.net !== 'client') { cpObjective(`Keep the fire burning through the night`); cpWaypoint(null); }
    ZM.round = Math.max(ZM.round, 6); void n;
  },
  tick(dt) {
    const S = RAID.st, K = S.kp, n = cpaN(); S.t += dt;
    cpkTick(dt);
    const left = Math.max(0, CPA.NIGHT - S.t);
    if (ZM.net !== 'client') cpObjective(`Keep the fire burning till the night turns · ${raidClock(left)}`);
    if (S.t > 4) cpaOnce('h1', 'fire', 'Feed her, or she’ll starve before morning.', 'cp_m01_11');
    if (S.t > 30) cpaOnce('h3', 'wenna', 'The dead from the old wrecks. They want the fire out.', 'cp_m01_13');
    if (S.t > CPA.NIGHT / 2) cpaOnce('h6', 'fire', 'Hold her. Dawn’s a long way yet.', 'cp_m01_16');
    // the drowned of the old wrecks, up the strand all night, more as it goes on
    S.spT -= dt;
    const prog = S.t / CPA.NIGHT, cap = Math.round(3 + 2 * n + prog * 3);
    if (S.spT <= 0) { S.spT = (5.5 - 2.5 * prog) * (0.75 + Math.random() * 0.5) / Math.sqrt(1 + 0.5 * (n - 1)); if (ZM.z.filter(z => !z.dead).length < cap) cpaSpawn({ kind: cpaKind(0.08 + 0.15 * prog), hp: cpaHp(1 + prog * 3) }); }
    // the waypoint: wood when the fire's low and nobody's carrying, else the nearest bank
    const m = FPS.me;
    if (K.banks.length) { let b = null, bd = 1e9; for (const B of K.banks) { const d = Math.hypot(B.x - m.x, B.y - m.y); if (d < bd) { bd = d; b = B; } } cpWaypoint(b.x - FPSC.CX, b.y - FPSC.CY, 'Fog', 1.5); }
    else if (K.fuel < 60) { let b = -1, bd = 1e9; K.piles.forEach((v, i) => { if (!v) return; const [x, y] = cpaW(CPA_SPOTS[i]), d = Math.hypot(x - m.x, y - m.y); if (d < bd) { bd = d; b = i; } }); if (b >= 0) cpWaypoint(CPA_SPOTS[b][0], CPA_SPOTS[b][1], 'Driftwood'); else cpWaypoint(null); }
    else cpWaypoint(null);
    if (S.t >= CPA.NIGHT && K.fuel > 0) { S.t = -999; cpObjective(''); cpWaypoint(null); for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); K.banks.length = 0; cpDone(); }
  },
  hud(phone, mono, fell) { cpkHud(phone, mono, fell); },
  f32(dt) { cpaNight(52, CPA.FOGC, 0.26, dt); },
}));

// ---------- III. The Ship ----------
cpStage('m01ship', cp1Stage({
  n: 'The Ship', sub: 'a light in the fog',
  music: () => RAID.st.keel ? 'cpm01keel' : 'cpm01ship',
  enter() {
    cpkEnter({ lit: true, fuel: 70, piles: false, drain: 0.85, wash: 5.2, bankEvery: [11, 16], bankFirst: 8, bankTwo: 0.35,
      onEmbers: () => cpaBan('Embers', 'feed the fire before it goes out', '#ff9a7a'),
      onOut: () => cpFail('The fire went out, and the ship came on in the dark'),
      onSmother: () => cpaFeed('Fog over the fire: it’s lost its height. Feed it!') });
    { const K = RAID.st.kp; for (const i of [0, 2, 5, 6, 9, 11]) K.piles[i] = 1; }
    Object.assign(RAID.st, { t: 0, see: 0, spT: 4, keel: 0, keelT: CPA.KEEL_AT, ship: 0, turned: 0, seenLast: 0 });
    if (ZM.net !== 'client') { cpObjective('Build the fire high, so the ship sees it'); cpWaypoint(null); }
    ZM.round = Math.max(ZM.round, 8);
  },
  tick(dt) {
    const S = RAID.st, K = S.kp, n = cpaN(); S.t += dt;
    cpkTick(dt);
    if (S.turned) { S.turnT -= dt; if (S.turnT <= 0 && S.turnT > -50) { S.turnT = -99; cpDone(); } return; }
    // she sees it only while it blazes
    const high = K.fuel >= CPA.HIGH;
    if (high) { S.see += dt; S.seenLast = S.t; } else S.see = Math.max(0, S.see - dt * 0.15);
    S.ship = clamp(S.t / CPA.SHIP, 0, 1);
    if (S.t > 6 && !high) cpaOnce('s1', 'fire', 'Higher! She can’t see a glimmer through this.', 'cp_m01_20');
    if (S.see > CPA.SEE * 0.45) cpaOnce('s2', 'fire', 'She’s seen us. She’s going about. Keep it high!', 'cp_m01_21');
    if (S.said && S.said.s2 && !high && S.t - S.seenLast > 3) cpaOnce('s3', 'fire', 'She’s lost us! Feed the fire!', 'cp_m01_24');
    if (ZM.net !== 'client') cpObjective(high ? `The ship sees the fire: keep it blazing · ${Math.round(S.see / CPA.SEE * 100)}%` : `Build the fire up past ${CPA.HIGH}% so the ship sees it · ${Math.round(S.see / CPA.SEE * 100)}%`);
    // the Old Keel
    if (!S.keel) { S.keelT -= dt; if (S.keelT <= 0) { S.keel = 1; cpCine('m01_keel', () => cp1Keel()); } }
    // the drowned
    S.spT -= dt;
    if (S.spT <= 0) { S.spT = (4.2 + Math.random() * 2) / Math.sqrt(1 + 0.5 * (n - 1)); if (ZM.z.filter(z => !z.dead && !z.boss).length < 4 + 2 * n) cpaSpawn({ kind: cpaKind(0.2), hp: cpaHp(4) }); }
    // waypoints
    const m = FPS.me;
    if (K.banks.length) { let b = null, bd = 1e9; for (const B of K.banks) { const d = Math.hypot(B.x - m.x, B.y - m.y); if (d < bd) { bd = d; b = B; } } cpWaypoint(b.x - FPSC.CX, b.y - FPSC.CY, 'Fog', 1.5); }
    else { let b = -1, bd = 1e9; K.piles.forEach((v, i) => { if (!v) return; const [x, y] = cpaW(CPA_SPOTS[i]), d = Math.hypot(x - m.x, y - m.y); if (d < bd) { bd = d; b = i; } }); if (b >= 0 && K.fuel < 85) cpWaypoint(CPA_SPOTS[b][0], CPA_SPOTS[b][1], 'Driftwood'); else cpWaypoint(null); }
    if (S.see >= CPA.SEE) { S.turned = 1; S.turnT = 3.5; cpObjective('She’s going about!'); cpWaypoint(null); cpaBan('She’s seen the fire', 'the ship is going about, clear of the rock', '#ffe08a'); cpaSound('horn', 0); for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); K.banks.length = 0; return; }
    if (S.t >= CPA.SHIP) cpFail('The ship never saw the fire, and came down on the rock in the haar');
  },
  pack2(o) { const S = RAID.st; o.k1 = [Math.round(S.see * 10), Math.round(S.t * 10), S.keel ? 1 : 0, S.turned ? 1 : 0]; },
  apply2(o) { const S = RAID.st; if (Array.isArray(o.k1)) { S.see = (+o.k1[0] || 0) / 10; S.t = (+o.k1[1] || 0) / 10; S.keel = o.k1[2] | 0; S.turned = o.k1[3] | 0; } },
  hud(phone, mono, fell) {
    const y0 = cpkHud(phone, mono, fell, { high: CPA.HIGH });
    const S = RAID.st; if (ZM.over || y0 == null) return;
    // the ship: how near she is to seeing it, and to the rock
    const L = Math.max(14, FPS.safeLeft || 0), w = phone ? 150 : 214, h = phone ? 6 : 8, y = y0 + 6;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(L - 4, y - 4, w + 8, h * 2 + (phone ? 30 : 36));
    ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(L, y, w, h); ctx.fillStyle = '#ffe08a'; ctx.fillRect(L, y, w * clamp(S.see / CPA.SEE, 0, 1), h);
    ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(L, y + h + 16, w, h * 0.7); ctx.fillStyle = S.ship > 0.75 ? `rgba(220,90,70,${0.75 + 0.25 * Math.sin(g.t * 8)})` : '#8aa0b8'; ctx.fillRect(L, y + h + 16, w * clamp(S.t / CPA.SHIP, 0, 1), h * 0.7);
    ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText('THE SHIP SEES THE FIRE', L, y + h + 3); ctx.fillText(`SHE’S ON THE ROCK IN ${raidClock(Math.max(0, CPA.SHIP - S.t))}`, L, y + h * 1.7 + 19);
    fpsHudNote(y + h * 2 + 34);
  },
  b32(grp) { cp1Ship3dBuild(grp); },
  f32(dt) { cpaNight(46, CPA.FOGC, 0.24, dt); cp1Ship3d(dt); },
}));
// (hosting or alone) the Old Keel comes up out of the sea by the old wreck
function cp1Keel() {
  const kind = 'crab', T = ZBT[kind], n = cpaN();
  const hp = zmHp(12) * 7 * ZBC.BOOST * (1 + ZBC.HP_MORE * (n - 1)) * zbRaidK();
  const zn = ++ZM.zc, [wx, wy] = cpaW([CPA.WRECK1[0] - 7, CPA.WRECK1[1] + 2]);
  const z = { drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: 'the Old Keel', kind: 'boss', x: wx, y: wy, jz: 0, fl: 0, hp, max: hp, sp: T.sp(14),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: -Math.PI / 2, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 2, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy };
  if (T.init) T.init(z); zbMake(z, kind); z.n = 'the Old Keel';
  ZM.z.push(z); FPS.drowned = ZM.z; ZB.seen.add(zn);
  zbArrive(z);
  ZM.banner = { text: 'The Old Keel', t: 3.6, col: '#ff8a6a', sub: 'a crab of old keels, out of the sea' };
  for (let i = 0; i < 20; i++) fpsPuff(wx + (Math.random() - 0.5) * 4, wy + (Math.random() - 0.5) * 4, FPSC.GROUND + 0.3, '140,160,170', 3);
}
// the ship in the fog: a cog under one square sail, her lantern on the sterncastle, standing in from the west and,
// once she's seen the fire, going about
const CP1S = {};
function cp1ShipModel(grp) {
  const G = new THREE.Group(), wood = z3Lam('#3a2c20'), wood2 = z3Lam('#4e3c2a'), sail = z3Lam('#b8aa8a', { side: THREE.DoubleSide });
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, false, 0, Math.PI), wood); hull.scale.set(3.2, 18, 2.6); hull.rotation.set(Math.PI / 2, 0, Math.PI); hull.position.y = 1.4; G.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.3, 17), wood2); deck.position.y = 1.4; G.add(deck);
  for (const z of [-7.5, 7.5]) { const c = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.8, 3.2), wood2); c.position.set(0, 2.4, z); G.add(c); }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 16, 8), wood); mast.position.y = 9; G.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 11, 6), wood); yard.rotation.z = Math.PI / 2; yard.position.y = 15; G.add(yard);
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 9, 6, 6), sail); sl.position.set(0, 10.4, 0.4); G.add(sl);
  { const P = sl.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, 1.4 * Math.cos(x / 10.4 * Math.PI) * (0.6 + 0.4 * (y + 4.5) / 9)); } sl.geometry.computeVertexNormals(); }
  const lan = new THREE.Sprite(new THREE.SpriteMaterial({ map: CPK3.soft || z3Soft('rgba(255,214,150,0.95)', 'rgba(255,150,70,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  lan.scale.setScalar(5); lan.position.set(0, 4.6, -9.2); G.add(lan); G.lan = lan;
  const L = new THREE.PointLight(0xffc880, 1.2, 30, 1.5); L.position.copy(lan.position); G.add(L);
  grp.add(G); return G;
}
function cp1Ship3dBuild(grp) { CP1S.G = cp1ShipModel(grp); }
// where she is: from far off to the west, closing on the rock as the time runs, then away to the south-west
function cp1ShipAt(S) {
  const k = clamp(S.t / CPA.SHIP, 0, 1), d = 230 - 175 * k, a = Math.PI * 0.92;
  let x = Math.cos(a) * d, y = Math.sin(a) * d, h = bearingOf(-x, -y);
  if (S.turned) { const q = clamp((S.tt || 0) / 14, 0, 1); h += -1.6 * zbE(q); x += Math.sin(h) * (S.tt || 0) * 4; y += Math.cos(h) * (S.tt || 0) * 4; }
  return [x, y, h];
}
function cp1Ship3d(dt) {
  const S = RAID.st, G = CP1S.G; if (!G) return;
  if (S.turned) S.tt = (S.tt || 0) + dt;
  const [x, y, h] = cp1ShipAt(S);
  G.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND - 1.6 + Math.sin(g.t * 0.7) * 0.25)); G.rotation.set(Math.sin(g.t * 0.6) * 0.03, -h, Math.sin(g.t * 0.9) * 0.04);
  G.lan.material.opacity = 0.7 + 0.3 * Math.sin(g.t * 3.1); G.visible = !CP1S.hide;
}

// ---------- the mission ----------
cpMission({ id: 'm01', act: 1, n: 'The First Fire', when: 'c. 1200s', where: 'Lantern Rock',
  blurb: "Before there was a lighthouse there was a fire. Keep the fire-keepers' beacon burning on Lantern Rock through a night of haar, against what comes out of the fog.",
  stages: ['cp_m01wood', 'cp_m01haar', 'cp_m01ship'], intro: 'm01_intro', outro: 'm01_outro', after: { 0: 'm01_lit' }, cut: { 2: 'm01_ship' },
  music: { default: 'cpm01haar' }, lives: 1,
  stop() { cpaNightOff(); },
});
