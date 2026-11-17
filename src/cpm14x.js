'use strict';
// The Chronicle of the Light, mission 14, The Drowned Reach: its first two parts (the mission, its soldiers, beacons
// and shared world are src/cpm14.js).
//  I.  The Landing (cp_rchland). Dusk on a holm at the edge of the Reach. The Ember Isles hold it: a line of gabions
//      across the beach, a camp behind, and their beacon on the rise to the north, cold (they won't waste the wood).
//      Up the beach and through them (a second section comes down from the beacon once the first breaks), light
//      the beacon, and keep it fed with tarred faggots from their woodpile while night comes down and the drowned
//      rise on every shore it doesn't reach. When the tide's gone out far enough (RCHX.TIDE seconds), m14_tide.
//  II. The Shoal Road (cp_rchshoal). Low water: the shoal dried into a road across the Reach to the Light, dark on
//      its rock at the far end. Plimsoll walks it ahead of you and stops at each cairn on the way: he won't go on
//      into the dark until it's lit (hold Use). The flood comes back over the road behind you (stand in it and it
//      drags at you; fall far behind and it throws you up the road, hurt). The drowned rise out of the wet sand
//      wherever no light reaches; an old buoy's bell lies on the shoal (ring it: they sink back, for a while); and the
//      Ice-folk hold a stranded hulk across the way, and Plimsoll won't walk into their muskets.
// Voice lines: cp_m14_10 to cp_m14_49.

const RCHX = { TIDE: 80, FAGGOT: 0.42, BURN: 1 / 32, ROAD: 4.2, PLIM_V: 3.1, FLOOD_V: 0.95, FLOOD_V2: 1.35, GRACE: 22, BELL: 22, BELL_CD: 40, BELL_R: 24 };

// =====================================================================================================================
// I. The Landing
// =====================================================================================================================
const RCH_LAND_MAP = { start: [0, -33], top: 0, R: 46, isle: 'cprch', seed: 0x14a01, shore: () => -999, nav: [-46, 46, -46, 46], zones: { isle: { n: 'the holm', r: [-46, 46, -46, 46], sky: true } } };
const RCHL = { BEA: [0, 19], WOOD: [-7.5, 1.5], MATE0: [1.8, -31], MATE1: [-2.6, 15.5] };
cpStage('rchland', rchStage({
  n: 'The Landing', map: RCH_LAND_MAP, rchHolds: ['rchlight', 'rchwood'], rchSeed: 1,
  rchSet(H, K) {
    const { put, light } = K, IR = H.IR;
    RCHL.IR = IR;
    // the landing: your boat drawn up on the shingle, and the Mate's lantern
    put('boat', 2.5, -IR + 3.5, 0.3, { len: 4.6, beam: 1.6, paint: '#34465a' });
    // the Ember Isles' line across the beach: gabions, with two gaps through
    for (let x = -17; x <= 17; x += 1.25) { if (Math.abs(x + 8) < 1.3 || Math.abs(x - 6) < 1.3) continue; put('rchgab', x, -14 + Math.sin(x * 0.7) * 0.4, 0, { hh: 1.25 }); }
    for (const [x, y] of [[-20, -12], [20, -12], [-12, -9], [11, -9]]) put('rchgab', x, y, 0, { hh: 1.4 });
    // their camp: tents, crates, the woodpile, their banner
    for (const [x, y, a] of [[-12, -1, 0.2], [10, 0, -0.3], [-3, 6, 1.4]]) put('fvtent', x, y, a, { c: '#6a3a22' });
    put('rchwood', RCHL.WOOD[0], RCHL.WOOD[1], 0.1, {});
    put('crates', 5, -4, 0.4, { items: [{ u: 0, v: 0, s: 0.9, ry: 0 }, { u: 1.0, v: 0.1, s: 0.8, ry: 0.3 }] });
    put('barrels', -4, -5, 0, { items: [{ u: 0, v: 0, r: 0.35, hh: 0.9 }, { u: 0.75, v: 0.2, r: 0.35, hh: 0.9 }] });
    put('rchflag', 2.5, 2, 0, { c: RCHP.ember, c2: RCHP.ember2 });
    // the beacon on the rise, gabions round its north side, and its ladder of cut turf
    put('frbeacon', RCHL.BEA[0], RCHL.BEA[1], 0, {});
    for (let i = 0; i < 9; i++) { const a = Math.PI * 0.15 + i * Math.PI * 0.7 / 8; put('rchgab', RCHL.BEA[0] + Math.cos(a) * 7, RCHL.BEA[1] + Math.sin(a) * 6, 0, { hh: 1.3 }); }
    for (const [x, y] of [[-6, 12], [6, 12.5], [-9, 22], [9, 22]]) put('rchgab', x, y, 0, { hh: 1.35 });
    light(0, -IR + 5, 1.2, '#ffc070', 8, 'lantern');
  },
  enter() {
    rchState({ ph: 'beach', night: 0.15, tide: 0, wB: 0 });
    const S = RAID.st;
    S.bc = [[RCHL.BEA[0], RCHL.BEA[1], 1, 0]];
    S.mate = { x: RCHL.MATE0[0], y: RCHL.MATE0[1], h: 0 };
    FPS.me.h = 0;
    if (ZM.net === 'client') return;
    // the first section behind the gabions, the second up by the beacon (quiet till the first breaks)
    const n = rchN(), A = [[-13, -11], [-4, -11.5], [3.5, -11.5], [13, -11], [-9, -8], [8.5, -8], [0, -7.5]], B = [[-4, 16], [4, 16.5], [-8, 20], [8, 20], [0, 24]];
    rchMuster(A.slice(0, Math.min(A.length, 3 + n)).map(([x, y]) => ({ k: 'ember', x, y, h: Math.PI, wan: 1.2 })));
    rchMuster(B.slice(0, Math.min(B.length, 2 + n)).map(([x, y], i) => ({ k: i === 0 ? 'guard' : 'ember', x, y, h: Math.PI, wan: 2.5, quiet: true })));
    S.wA = S.so.filter(s => !s.quiet).length;
    cpObjective('Take the beach from the Ember Isles'); cpWaypoint(0, -11, 'Their line');
  },
  tick(dt) {
    const S = RAID.st, n = rchN(); S.t += dt;
    rchSolTick(dt); rchCarryTick();
    if (S.t > 2) rchSay('a', 'rchmate', 'Ember Isles. They’ve held this holm since the last pact broke. Up the beach and through them.', 'cp_m14_10');
    if (S.ph === 'beach') {
      const A = S.so.filter(s => !s.quiet && s.st !== 3).length, B = S.so.filter(s => s.quiet);
      // (the first section broken: the second comes down off the rise)
      if (A <= 1 && B.length) { for (const s of B) { s.quiet = false; s.t = 1 + Math.random() * 2; s.px -= 0; s.py -= 6; s.wan = 4; } rchSay('cap', 'rchember', 'Second section, down! Hold the beacon. No lamp-man sets foot on it!', 'cp_m14_11'); cpObjective('Take their beacon on the rise'); cpWaypoint(RCHL.BEA[0], RCHL.BEA[1], 'The beacon'); }
      if (!rchSolLive().length) { S.ph = 'light'; S.mate = { x: RCHL.MATE1[0], y: RCHL.MATE1[1] }; cpObjective('Light their beacon before full dark (hold Use at it)'); cpWaypoint(RCHL.BEA[0], RCHL.BEA[1] - 1.5, 'The beacon'); rchSay('won', 'rchmate', 'Their beacon’s cold. They won’t burn the wood, and the drowned have the shore every night for it. Light it.', 'cp_m14_12'); }
      S.night = Math.min(0.55, S.night + dt / 300);
    } else if (S.ph === 'light') {
      S.night = Math.min(0.85, S.night + dt / 60);
      const b = S.bc[0]; b[2] = 1;
      S.useT = (S.useT || 0) + rchTake('rchlight', 0);
      if (S.useT >= RCHC.BEA_USE) { b[3] = 1; S.ph = 'hold'; S.hold0 = S.t; cpObjective('Keep the beacon burning till the tide goes out'); cpWaypoint(null); rchSay('lit', 'rchmate', 'There. Now keep it fed. Their woodpile’s in the camp. When the tide’s out, the shoal’s a road.', 'cp_m14_13'); setTimeout(() => { if (RAID.st === S) rchSay('dark', 'rchmate', 'And here they come. Every shore the light doesn’t reach is theirs at night.', 'cp_m14_14'); }, 5000); }
      if (S.t > 60) rchSay('lh', 'rchmate', 'It’s getting dark. Light that beacon.', 'cp_m14_15');
      rchTrickle(dt, [9, 13], 2, { lvl: 1 });
    } else if (S.ph === 'hold') {
      S.night = Math.min(1, S.night + dt / 40);
      const T = RCHX.TIDE + 10 * (n - 1);
      S.tide = clamp((S.t - S.hold0) / T, 0, 1);
      rchBeaconTick(dt, RCHX.BURN * (1 + 0.1 * (n - 1)));
      const b = S.bc[0];
      if (b[3] && b[2] < 0.3) rchSay('low' + Math.floor(S.t / 25), 'rchmate', 'The beacon’s low. Feed it!', 'cp_m14_16');
      if (!b[3]) rchSay('out' + Math.floor(S.t / 20), 'rchmate', 'It’s out! Bring wood, and light it again!', 'cp_m14_17');
      if (S.tide > 0.5) rchSay('half', 'rchmate', 'She’s ebbing. I can see the shoal under the water.', 'cp_m14_18');
      rchTrickle(dt, b[3] ? [2.4, 4] : [1.6, 2.6], b[3] ? 6 : 8, { lvl: 2, run: 0.15 });
      if (S.tide >= 1 && !S.endT) { S.endT = 1; for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'burn'); rchSay('tide', 'rchmate', 'Low water. Down to the north beach, all of you.', 'cp_m14_19'); setTimeout(() => { if (RAID.st === S) cpDone(); }, 2500); }
    }
  },
  rchq(sid, k, a) {
    const S = RAID.st;
    if (k === 'take' && S.ph === 'hold' && !S.cy[sid]) { S.cy[sid] = 'wood'; return; }
    if (k === 'feed' && S.cy[sid] === 'wood') { const b = S.bc[0]; delete S.cy[sid]; b[2] = Math.min(1, (b[3] ? b[2] : 0) + RCHX.FAGGOT); if (!b[3]) { b[3] = 1; rchLine(`${rchNick(sid)} lit the beacon again.`); } }
    if (k === 'pick' && Array.isArray(a)) { const d = S.drop[a[0] | 0]; if (d && !S.cy[sid]) { S.cy[sid] = d[2]; S.drop.splice(a[0] | 0, 1); } }
  },
  me(dt) { rchMe(dt); },
  rchConsider(c) {
    const S = RAID.st, b = S.bc[0];
    if (S.ph === 'light' && b) rchC(c, { k: 'rchlight', i: 0 }, b[0], b[1] - 1.4, 1.8);
    if (S.ph === 'hold') { rchC(c, { k: 'rchtake' }, RCHL.WOOD[0], RCHL.WOOD[1] - 1.2, 1.8); if (rchMine() === 'wood') rchC(c, { k: 'rchfeed' }, b[0], b[1] - 1.4, 2.0); S.drop.forEach((d, i) => rchC(c, { k: 'rchpick', i }, d[0], d[1], 1.5)); }
  },
  rchPrompt(o) {
    if (o.k === 'rchlight') return { text: 'Hold to light the beacon', hold: true };
    if (o.k === 'rchtake') return rchMine() ? { text: 'Your hands are full' } : { text: 'Take a faggot of tarred wood', free: true };
    if (o.k === 'rchfeed') return { text: RAID.st.bc[0][3] ? 'Feed the beacon' : 'Light the beacon again', free: true };
    if (o.k === 'rchpick') return rchMine() ? { text: 'Your hands are full' } : { text: 'Pick it up', free: true };
    return null;
  },
  rchUse(o) {
    if (o.k === 'rchlight') return true;
    if (o.k === 'rchtake') { if (!rchMine()) raidAsk('take'); return true; }
    if (o.k === 'rchfeed') { raidAsk('feed'); try { if (!soundOff() && !sfxPlay('rchfeed', { vol: 0.8, gap: 1 })) sfxPlay('flare', { vol: 0.4, rate: 0.7 }); } catch (e) {} return true; }
    if (o.k === 'rchpick') { if (!rchMine()) raidAsk('pick', [o.i]); return true; }
    return false;
  },
  rchSolDown(s, sid) { if (s.k === 'guard') rchSay('capd', 'rchember', 'Oath-breakers! The Commodore will hear of this!', 'cp_m14_20'); },
  rchPack() { const S = RAID.st; return [Math.round(S.tide * 1000), Math.round(((S.t - (S.hold0 || 0)) | 0))]; },
  rchApply(a) { if (!Array.isArray(a)) return; RAID.st.tide = (a[0] | 0) / 1000; },
  // (where the drowned rise: the holm's shore, all round)
  rchShore() { const a = Math.random() * 6.283, r = (RCHL.IR || 40) - 2.5 - Math.random() * 3; return [Math.cos(a) * r, Math.sin(a) * r]; },
  rchNight() { return RAID.st.night; },
  rchLit() { const b = RAID.st.bc[0]; return b && b[3] ? 0.3 * clamp(b[2], 0, 1) : 0; },
  // (the sea: high water, going out over the hold, and out of sight in the tide's cinematic)
  rchSea() { const S = RAID.st; return 0.3 - 0.42 * (RCH.tideK != null ? RCH.tideK : S.tide || 0); },
  rchTower: [0, 300, 0],
  rchB3(grp) {
    // the shoal running north off the holm, under the water at high tide: a pale ribbon out to the Light
    const pts = [[0, 30], [-6, 60], [8, 100], [-4, 150], [6, 210], [0, 280]], m = new THREE.MeshLambertMaterial({ color: 0x8a8270 }), G0 = FPSC.GROUND;
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], l = Math.hypot(x1 - x0, y1 - y0), s = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, l + 6), m); s.position.copy(z3v(FPSC.CX + (x0 + x1) / 2, FPSC.CY + (y0 + y1) / 2, G0 - 0.25)); s.rotation.y = -Math.atan2(x1 - x0, y1 - y0); grp.add(s); }
    // (the Light's rock under the tower, far off to the north)
    const rk = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshLambertMaterial({ color: 0x3a3c40 })); rk.scale.set(40, 6, 34); rk.position.copy(z3v(FPSC.CX, FPSC.CY + 300, G0 - 3)); grp.add(rk);
  },
  rchClear: a => Math.abs(angDiff(a, Math.PI / 2)) < 0.25,
  hud(phone, mono, fell) {
    const S = RAID.st, extra = [], b = S.bc[0];
    if (S.ph === 'beach') extra.push([`The Ember Isles: ${rchSolLive().length} standing`, 'rgba(255,190,150,0.9)']);
    if (S.ph === 'hold' && b) { const T = RCHX.TIDE + 10 * (rchN() - 1), left = Math.max(0, Math.ceil(T * (1 - S.tide))); extra.push([`The beacon: ${b[3] ? Math.round(b[2] * 100) + '%' : 'OUT'}  ·  the tide: ebbing, ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} to low water`, b[3] && b[2] > 0.3 ? 'rgba(255,214,150,0.95)' : 'rgba(255,140,110,0.95)']); }
    rchHud(phone, mono, fell, extra);
  },
  music() { const S = RAID.st; return S.ph === 'hold' ? 'cpm14dark' : 'cpm14war'; },
}));

// =====================================================================================================================
// II. The Shoal Road
// =====================================================================================================================
const RCHS = {
  P: [[0, -94], [0, -76], [-10, -58], [6, -38], [16, -16], [-2, 6], [-18, 28], [-8, 50], [8, 68], [0, 84], [0, 94]],
  PADS: [[0, -86, 9], [6, -38, 6.5], [16, -16, 6.5], [-2, 6, 6.5], [-17, 28, 11], [-8, 50, 6.5], [0, 86, 9]],
  CAIRN: [[8.6, -37], [0.8, 7.5], [-10.8, 51]], BELL: [19, -16], HULK: [-22, 29, 0.35], END: [0, 86, 8],
};
RCHS.path = rchPath(RCHS.P);
// (on the shoal: within the road's width of its line, or on one of its broader banks)
function rchsIn(lx, ly, pad) { pad = pad || 0; if (RCHS.path.near(lx, ly)[0] < RCHX.ROAD - pad) return true; for (const [x, y, r] of RCHS.PADS) if (Math.hypot(lx - x, ly - y) < r - pad) return true; return false; }
const RCH_SHOAL_MAP = { start: [0, -88], top: 0, R: 98, isle: 'cprchw', seed: 0x14a02, shore: () => -999, nav: [-34, 34, -98, 98], zones: { isle: { n: 'the shoal road', r: [-34, 34, -98, 98], sky: true } } };
cpStage('rchshoal', rchStage({
  n: 'The Shoal Road', map: RCH_SHOAL_MAP, rchHolds: ['rchcairn', 'rchbell'], rchPlim: true, rchSeed: 2,
  block(x, y, pad) { const [lx, ly] = rchL(x, y); return !rchsIn(lx, ly, Math.max(0, (pad || 0) - 0.1)); },
  rchSet(H, K) {
    const { put, light } = K, P = RCHS.path;
    // the edges, where the shoal drops into the sea (for the drowned's way-finding as much as yours)
    const keep = (x, y) => !rchsIn(x, y, -0.2);
    for (const q of P.seg) { const n = Math.max(1, Math.round(q.l / 2.4)), ux = (q.x1 - q.x0) / q.l, uy = (q.y1 - q.y0) / q.l; for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, cx = q.x0 + (q.x1 - q.x0) * k, cy = q.y0 + (q.y1 - q.y0) * k; for (const s of [-1, 1]) { const ex = cx - uy * s * (RCHX.ROAD + 0.5), ey = cy + ux * s * (RCHX.ROAD + 0.5); if (keep(ex, ey)) put('rchedge', ex, ey, Math.atan2(uy, ux), { len: q.l / n + 0.6 }); } } }
    for (const [px, py, r] of RCHS.PADS) { const n = Math.ceil(2 * Math.PI * r / 2.4); for (let i = 0; i < n; i++) { const a = i / n * 6.283, ex = px + Math.cos(a) * (r + 0.5), ey = py + Math.sin(a) * (r + 0.5); if (keep(ex, ey)) put('rchedge', ex, ey, a + Math.PI / 2, { len: 2 * Math.PI * r / n + 0.6 }); } }
    // the cairns, the bell, the hulk, a few rocks and ribs of old wrecks on the banks
    for (const [x, y] of RCHS.CAIRN) put('rchcairn', x, y, 0, {});
    put('rchbell', RCHS.BELL[0], RCHS.BELL[1], 0.4, {});
    put('rchhulk', RCHS.HULK[0], RCHS.HULK[1], RCHS.HULK[2], {});
    for (const [x, y] of [[-12, 25], [-11, 33], [-23, 20], [-22, 38]]) put('rchgab', x, y, 0, { hh: 1.35 });
    put('rchflag', -24, 33, 0, { c: RCHP.ice, c2: RCHP.ice2 });
    for (const [x, y, s] of [[-4, -84, 1], [5, -90, 0.8], [10, -40, 0.9], [-3, 3, 0.7], [-11, 47, 0.8], [3, 83, 1], [-5, 90, 0.9]]) put('stone', x, y, x * 0.3, { w: 1.4 * s, d: 1.1 * s, hh: 0.7 * s });
  },
  enter() {
    rchState({ ph: 'road', night: 1, fl: -30, lastS: 0, bellCd: 0, qT: 0 });
    const S = RAID.st, P = RCHS.path;
    S.bc = RCHS.CAIRN.map(([x, y]) => [x, y, 1, 0]);
    const [px, py, ph] = P.at(16), [wx, wy] = rchW(px, py);
    S.pl = { x: wx, y: wy, h: ph, s: 16, w: 0, on: 1, stop: -1 };
    S.mate = null;
    FPS.me.h = 0;
    if (ZM.net === 'client') return;
    rchMuster([[-15, 24], [-12.5, 31], [-16, 19.5], [-15, 36], [-11, 27]].slice(0, 2 + rchN()).map(([x, y]) => ({ k: 'ice', x, y, h: Math.PI * 0.9, wan: 1.5, quiet: true })));
    cpObjective('Follow Plimsoll across the shoal to the Light'); cpWaypoint(px, py, 'Plimsoll');
  },
  tick(dt) {
    const S = RAID.st, P = RCHS.path, n = rchN(), crew = rchCrew(); S.t += dt;
    rchSolTick(dt);
    if (S.t > 1.5) rchSay('a', 'rchmate', 'There’s the road. And there’s the one who knows it. Keep him close.', 'cp_m14_21');
    // where you are along the road: the hindmost and the foremost standing
    const ss = crew.filter(p => !p.down).map(p => P.near(...rchL(p.x, p.y))[1]); const lo = ss.length ? Math.min(...ss) : 0, hi = ss.length ? Math.max(...ss) : 0;
    // ---- Plimsoll: on to the next place he'll stop at, and he waits there till it's safe on ----
    const pl = S.pl, stops = [];
    RCHS.CAIRN.forEach(([x, y], i) => { if (!S.bc[i][3]) stops.push(P.near(x, y)[1] - 7); });
    if (rchSolLive().length) stops.push(P.near(-12, 22)[1] - 18);
    stops.push(P.L - 9);
    const stop = Math.min(...stops), wait = pl.s >= stop - 0.05 || pl.s > hi + 26;
    if (!wait) { pl.s = Math.min(stop, pl.s + RCHX.PLIM_V * dt); pl.w = 1; } else pl.w = 0;
    { const [px, py, h] = P.at(pl.s), [wx, wy] = rchW(px, py); pl.x = wx; pl.y = wy; pl.h = h; }
    // (he snaps up any of the drowned who come in his way)
    for (const z of ZM.z) if (!z.dead && z.rr <= 0.05 && Math.hypot(z.x - pl.x, z.y - pl.y) < 1.6) { zmKill(z, false, '', 'flash'); if (!reduceMotion) for (let i = 0; i < 6; i++) fpsPuff(z.x, z.y, FPSC.GROUND + 1, '160,210,255', 1); }
    // ---- the lines on the way ----
    const nextC = RCHS.CAIRN.findIndex((c, i) => !S.bc[i][3]);
    if (wait && pl.s < P.L - 10) {
      if (nextC >= 0 && Math.abs(pl.s - (P.near(...RCHS.CAIRN[nextC])[1] - 7)) < 0.2) { rchSay('c' + nextC, 'rchmate', ['He’s stopped. He won’t walk on into the dark. Light the cairn for him.', 'Another cairn. Light it, quick.', 'The last cairn before the rock.'][nextC], ['cp_m14_22', 'cp_m14_23', 'cp_m14_24'][nextC]); cpObjective(`Light the cairn for Plimsoll (hold Use) · ${S.bc.filter(b => b[3]).length} of 3 lit`); cpWaypoint(RCHS.CAIRN[nextC][0], RCHS.CAIRN[nextC][1], 'The cairn'); }
      else if (rchSolLive().length && pl.s > P.near(-12, 22)[1] - 19) { rchSay('ice', 'rchmate', 'Ice-folk, on that hulk. He won’t walk into their muskets, and neither should we. Clear them.', 'cp_m14_25'); cpObjective('Clear the Ice-folk off the hulk'); cpWaypoint(RCHS.HULK[0], RCHS.HULK[1], 'The hulk'); }
    } else if (S.pl.w) { cpObjective('Follow Plimsoll across the shoal to the Light'); cpWaypoint(...rchL(pl.x, pl.y), 'Plimsoll'); }
    // (the Ice-folk wake when you come in sight of them)
    const q = S.so.filter(s => s.quiet); if (q.length && crew.some(p => Math.hypot(...rchL(p.x, p.y).map((v, i) => v - [-18, 28][i])) < 34)) { for (const s of q) { s.quiet = false; s.t = 0.6 + Math.random() * 1.5; } rchSay('icew', 'rchice', 'Lamp-men on the shoal! Make ready! Present!', 'cp_m14_26'); }
    // ---- the flood: back over the road behind you, quicker after the second cairn ----
    if (S.t > RCHX.GRACE) { S.fl = Math.min(P.L - 12, S.fl + dt * (S.bc[1][3] ? RCHX.FLOOD_V2 : RCHX.FLOOD_V)); if (S.fl > 0) rchSay('fl', 'rchmate', 'The flood’s turned. It’s coming up the road behind us. Don’t dawdle.', 'cp_m14_27'); }
    if (S.fl > lo - 12 && S.fl > 0) rchSay('fl2' + Math.floor(S.t / 30), 'rchmate', 'The water’s at your heels!', 'cp_m14_28');
    // ---- the cairns ----
    RCHS.CAIRN.forEach((c, i) => { const b = S.bc[i]; if (b[3]) return; S.cU = S.cU || [0, 0, 0]; S.cU[i] += rchTake('rchcairn', i); if (S.cU[i] >= RCHC.BEA_USE) { b[3] = 1; rchLine('The cairn is lit.'); for (const z of ZM.z) if (!z.dead && rchLitAt(z.x, z.y)) zmKill(z, false, '', 'burn'); if (i === 1) rchSay('c1d', 'rchmate', 'Good. He’s walking again. Keep up with him.', 'cp_m14_29'); } });
    // ---- the bell ----
    S.bellCd = Math.max(0, S.bellCd - dt); S.bell = Math.max(0, S.bell - dt);
    S.bU = (S.bU || 0) + rchTake('rchbell', 0);
    if (S.bU >= 2 && S.bellCd <= 0) { S.bU = 0; S.bell = RCHX.BELL; S.bellCd = RCHX.BELL_CD; S.bellN = (S.bellN | 0) + 1; cpEvent('rchbell', 1); const [bx, by] = rchW(...RCHS.BELL); for (const z of ZM.z) if (!z.dead && Math.hypot(z.x - bx, z.y - by) < RCHX.BELL_R + 10) zmKill(z, false, '', 'flash'); rchSay('bell', 'rchmate', 'That’s it. Ring it! They’ll not abide a bell.', 'cp_m14_30'); }
    else if (S.bU >= 2) S.bU = 2;
    if (!S.said.bellh && Math.hypot(...rchL(pl.x, pl.y).map((v, i) => v - RCHS.BELL[i])) < 20) rchSay('bellh', 'rchmate', 'An old buoy’s bell, there on the bank. Keep the bell ready, the keeper wrote.', 'cp_m14_31');
    // ---- the drowned: out of the wet sand, wherever no light reaches (not while the bell's still in the air) ----
    if (S.bell <= 0) rchTrickle(dt, [2.6, 4.4], 5 + Math.floor(S.t / 60), { lvl: 3, run: 0.12, near: 8 });
    // ---- the end: everyone standing up on the rock's reef ----
    const up = crew.filter(p => !p.down), at = up.filter(p => Math.hypot(...rchL(p.x, p.y).map((v, i) => v - [RCHS.END[0], RCHS.END[1]][i])) < RCHS.END[2]);
    if (up.length && at.length === up.length && !S.endT) { S.endT = 1; for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); rchSay('end', 'rchmate', 'The Light’s rock. We’re over. Look behind you: the road’s gone.', 'cp_m14_32'); setTimeout(() => { if (RAID.st === S) cpDone(); }, 2200); }
    if (pl.s >= P.L - 9.1) { cpObjective('Up onto the Light’s rock'); cpWaypoint(RCHS.END[0], RCHS.END[1], 'The rock'); }
  },
  rchSolDown(s) { if (!rchSolLive().length) rchSay('iced', 'rchmate', 'That’s the last of them. On, after him.', 'cp_m14_33'); },
  me(dt) {
    rchMe(dt);
    const S = RAID.st, m = FPS.me, P = RCHS.path;
    // (the flood: standing in it drags at you; far behind it, it throws you up the road)
    const [lx, ly] = rchL(m.x, m.y), sv = P.near(lx, ly)[1];
    if (sv < S.fl - 0.5 && !(m.dead > 0) && !cpCineOn()) {
      RCH.flT = (RCH.flT || 0) - (typeof FPS.dtLast === 'number' ? FPS.dtLast : 0.016);
      if (RCH.flT <= 0) { RCH.flT = 1.3; if (!zmIsDown()) fpsHurt(1, '', 'The flood'); try { if (!soundOff()) sfxSplash(0, 0.5); } catch (e) {} }
      if (sv < S.fl - 7) { const [px, py] = P.at(S.fl + 4), [wx, wy] = rchW(px, py); m.x = wx; m.y = wy; fpsFeed('The flood threw you up the road.'); }
    }
    // (the flood coming up the road behind you, heard the nearer it is: laid again about every take's length)
    if (S.fl > -25 && !cpCineOn() && sv - S.fl < 30) try { if (!soundOff()) sfxPlay('rchflood', { vol: clamp(0.85 - (sv - S.fl) / 36, 0.12, 0.85), gap: 3.5 }); } catch (e) {}
    // (the bell, heard: the buoy's own, recorded; else three far strokes of the synth's)
    if (S.bellSeen !== S.bellN && S.bellN) { S.bellSeen = S.bellN; const [bx, by] = rchW(...RCHS.BELL); let rec = false; try { rec = sfxPlay('rchbell', { vol: clamp(1 - Math.hypot(bx - m.x, by - m.y) / 120, 0.3, 0.95), pan: fpsEar(bx, by), vary: 0.05 }); } catch (e) {} if (!rec) for (let i = 0; i < 3; i++) setTimeout(() => { try { if (!soundOff()) sfxBellFar(fpsEar(bx, by), 0.9 - i * 0.2); } catch (e) {} }, i * 700); }
    // (Plimsoll's shoes squeaking as he walks)
    if (S.pl && S.pl.w) { RCH.sq = (RCH.sq || 0) + (FPS.dtLast || 0.016) * 3; if (RCH.sq > 1) { RCH.sq = 0; const d = Math.hypot(S.pl.x - m.x, S.pl.y - m.y); if (d < 40) try { if (!soundOff() && typeof sfxSqueak === 'function') sfxSqueak(fpsEar(S.pl.x, S.pl.y), clamp(0.5 - d / 80, 0.05, 0.5)); } catch (e) {} } }
  },
  rchConsider(c) {
    const S = RAID.st;
    RCHS.CAIRN.forEach(([x, y], i) => { if (!S.bc[i][3]) rchC(c, { k: 'rchcairn', i }, x, y - 1.2, 2.0); });
    if (S.bellCd <= 0) rchC(c, { k: 'rchbell', i: 0 }, RCHS.BELL[0] - 1.4, RCHS.BELL[1], 2.0);
  },
  rchPrompt(o) {
    if (o.k === 'rchcairn') return { text: 'Hold to light the cairn', hold: true };
    if (o.k === 'rchbell') return { text: 'Hold to ring the bell', hold: true };
    return null;
  },
  rchUse(o) { return o.k === 'rchcairn' || o.k === 'rchbell'; },
  rchPack() { const S = RAID.st; return [Math.round(S.fl * 10), Math.round(S.bell * 10), Math.round(S.bellCd * 10), S.bellN | 0]; },
  rchApply(a) { if (!Array.isArray(a)) return; const S = RAID.st; S.fl = (a[0] | 0) / 10; S.bell = (a[1] | 0) / 10; S.bellCd = (a[2] | 0) / 10; S.bellN = a[3] | 0; },
  // (the drowned rise on the road near you, ahead or behind, or out of the flood's edge)
  rchShore() {
    const S = RAID.st, P = RCHS.path, crew = rchCrew().filter(p => !p.down); if (!crew.length) return null;
    const p = crew[(Math.random() * crew.length) | 0], s0 = P.near(...rchL(p.x, p.y))[1], s = clamp(s0 + (Math.random() < 0.35 ? -14 - Math.random() * 10 : 12 + Math.random() * 22), Math.max(2, S.fl + 2), P.L - 4);
    const [x, y, h] = P.at(s), off = (Math.random() - 0.5) * 2 * (RCHX.ROAD - 1); return [x + Math.cos(h) * off, y - Math.sin(h) * off];
  },
  rchNight: () => 1,
  rchLit() { const S = RAID.st; return S.bell > 0 ? 0.1 : 0; },
  rchSeaY: 0,
  rchFogFar: 150,
  rchTower: [0, 150, 0],
  rchClear: a => Math.abs(angDiff(a, Math.PI / 2)) < 0.3,
  rchB3(grp) {
    const P = RCHS.path, G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY;
    // the road: a ribbon of wet sand along its line, a little lower at its edges
    const ribbon = (s0, s1, w, y, col, step) => {
      const pos = [], idx = [], N = Math.ceil((s1 - s0) / (step || 2));
      for (let i = 0; i <= N; i++) { const s = s0 + (s1 - s0) * i / N, [x, yy, h] = P.at(s), nx = Math.cos(h), ny = -Math.sin(h); for (const k of [-1, -0.7, 0.7, 1]) { const e = Math.abs(k) > 0.9 ? -0.18 : 0; pos.push(CX + x + nx * w * k, G0 + y + e, -(CY + yy + ny * w * k)); } }
      for (let i = 0; i < N; i++) for (let j = 0; j < 3; j++) { const a = i * 4 + j, b = a + 4; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
    };
    grp.add(ribbon(-30, P.L + 2, RCHX.ROAD + 1.4, -0.04, 0x7a7262));
    for (const [x, y, r] of RCHS.PADS) { const d = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.6, r + 2.2, 0.4, 28), new THREE.MeshLambertMaterial({ color: 0x7e7666 })); d.position.copy(z3v(CX + x, CY + y, G0 - 0.24)); grp.add(d); }
    // (weed and shells along it, and pools where it's lowest)
    const r = seeded(0x5a0a1), weed = new THREE.MeshLambertMaterial({ color: 0x2e3a26 }), pool = new THREE.MeshBasicMaterial({ color: 0x18242c });
    for (let i = 0; i < 60; i++) { const s = r() * P.L, [x, y, h] = P.at(s), off = (r() - 0.5) * 2 * RCHX.ROAD, m = new THREE.Mesh(new THREE.CircleGeometry(0.4 + r() * 0.9, 7), i % 3 ? weed : pool); m.rotation.x = -Math.PI / 2; m.position.copy(z3v(CX + x + Math.cos(h) * off, CY + y - Math.sin(h) * off, G0 - 0.025 + i * 0.0002)); grp.add(m); }
    // the flood: water over the road from behind, up to its edge, with a line of foam along its front
    RCH3.flood = ribbon(-34, P.L, RCHX.ROAD + 2.2, 0.12, 0x1e3a44, 1);
    RCH3.flood.material = new THREE.MeshPhongMaterial({ color: 0x18323c, transparent: true, opacity: 0.88, shininess: 80, specular: 0x6a8a98, side: THREE.DoubleSide }); grp.add(RCH3.flood);
    RCH3.floodN = Math.ceil((P.L + 34) / 1);
    RCH3.foam = new THREE.Mesh(new THREE.BoxGeometry((RCHX.ROAD + 2.2) * 2, 0.1, 0.8), new THREE.MeshBasicMaterial({ color: 0xa8c0c8, transparent: true, opacity: 0.55 })); grp.add(RCH3.foam);
    // the Light's rock ahead, under the tower (src/zombies.js's own, laid at St.rchTower)
    const rk = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 9), new THREE.MeshLambertMaterial({ color: 0x3e4044 })); rk.scale.set(46, 5, 40); rk.position.copy(z3v(CX, CY + 150, G0 - 2.2)); grp.add(rk);
    // the ice-folk's hulk's lantern, and the shoal's far banks
    for (let i = 0; i < 18; i++) { const a = r() * 6.283, d = 40 + r() * 140, x = Math.cos(a) * d * 0.6, y = Math.sin(a) * d; if (rchsIn(x, y, -3)) continue; const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshLambertMaterial({ color: 0x6a6456 })); b.scale.set(4 + r() * 8, 0.5, 3 + r() * 6); b.position.copy(z3v(CX + x, CY + y, G0 - 0.45)); grp.add(b); }
  },
  rchF3(dt) {
    const S = RAID.st, P = RCHS.path;
    // (the flood drawn up to its front: the ribbon's quads in order along the road)
    const n = clamp(Math.floor(S.fl + 34), 0, RCH3.floodN); RCH3.flood.geometry.setDrawRange(0, n * 18); RCH3.flood.visible = n > 0;
    const [fx, fy, fh] = P.at(Math.max(-30, S.fl)), [wx, wy] = rchW(fx, fy); RCH3.foam.visible = S.fl > -30; RCH3.foam.position.copy(z3v(wx, wy, FPSC.GROUND + 0.14)); RCH3.foam.rotation.y = -fh; RCH3.foam.material.opacity = reduceMotion ? 0.5 : 0.4 + 0.2 * Math.sin(g.t * 3);
  },
  hud(phone, mono, fell) {
    const S = RAID.st, extra = [], lit = S.bc.filter(b => b[3]).length;
    extra.push([`The cairns: ${lit} of 3 lit`, 'rgba(255,214,150,0.9)']);
    if (S.bell > 0) extra.push([`The bell: they’re sunk back, ${Math.ceil(S.bell)} s`, 'rgba(200,230,255,0.95)']); else if (S.bellCd > 0) extra.push([`The bell: still humming (${Math.ceil(S.bellCd)} s)`, 'rgba(236,228,207,0.6)']);
    const sv = RCHS.path.near(...rchL(FPS.me.x, FPS.me.y))[1], gap = sv - S.fl; if (S.fl > -25) extra.push([gap < 0 ? 'THE FLOOD HAS YOU · GET UP THE ROAD' : `The flood: ${Math.round(gap)} m behind you`, gap < 12 ? 'rgba(255,140,110,0.95)' : 'rgba(170,210,230,0.85)']);
    rchHud(phone, mono, fell, extra);
  },
  music() { return 'cpm14shoal'; },
}));
cpOn('rchbell', () => {});
