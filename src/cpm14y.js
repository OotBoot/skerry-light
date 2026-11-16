'use strict';
// The Chronicle of the Light, mission 14, The Drowned Reach: its last two parts (the mission and its shared world
// are src/cpm14.js).
//  III. The Keeper's Rock (cp_rchrock). The Light's rock from the north, its side nobody lands on: the reef, the
//       bare granite up to the back of the keeper's station (the Store Hall's long north wall, the East Passage and
//       the Net Loft, the Boathouse and the Wreck Store, all laid on src/zombies.js's own plan, ZM_ZONES) with the two
//       walled yards between them, and the tower over it all, dark. The Ember Isles have made it a battery: cannon and
//       gabions on the north rock, tents in the yards. Take it. Their Commodore comes out of the station's back door
//       with his guards (m14_comm) and holds it himself, throwing fire-pots; then the Light's own oil, which they
//       hoarded in the west yard, has to go to the back door, a cask at a time, while the drowned climb the dark
//       rock: the Light's own rock is a shore the light doesn't reach. All three in, m14_climb.
//  IV.  The Light (cp_rchlamp). The lantern room and the gallery round it (the tower's top, src/zombies.js's own,
//       lifted down to stand on: rchTower [x, y, -25]). Light the lamp at the lens; then keep it lit: pump the oil up
//       (it runs down, and faster with the drowned at the lens) and wind the clockwork (the beam stops when it runs
//       down). The beam turns once in six and a half seconds, burns the drowned it sweeps (they climb the tower and
//       come over the gallery rail), and shows the nations' fire-ships the rocks: three passes and a ship sheers
//       off. Three that reach the rock and the Light is lost. All of them turned, m14_keepers.
// Voice lines: cp_m14_50 to cp_m14_79.

const RCHY = { OIL: 3, POT: 2.3, POT_T: 1.4, POT_BURN: 4.2, POT_EVERY: 6.5, DOOR: [0, 26.6], HOARD: [-35, 13], LAMP_USE: 4, OIL_V: 1 / 24, WIND_V: 1 / 28, PUMP: 2.4, WINDUP: 2.8, SHIP_V: 7.5, SHIP_D: 430, SHIP_RAM: 58, TURN: 6.5, HALF: 0.16 };

// =====================================================================================================================
// III. The Keeper's Rock
// =====================================================================================================================
FPS_ISLES.cprchr = Object.assign({}, FPS_ISLES.light, { name: 'the Light’s rock', indoor: false, rocks: [7, 2.5, 5, 0.9], tufts: ['#4a5038', 50], pebbles: 90, pools: 6, wrack: 30, birds: ['gull', 0], fog: ['#0c0e12', 60, 600] });
FPI_GEN.cprchr = rchGen();
const RCH_ROCK_MAP = { start: [0, 50], top: 0, R: 60, isle: 'cprchr', seed: 0x14a03, shore: () => -999, nav: [-58, 58, -4, 60], zones: { isle: { n: 'the Light’s rock', r: [-60, 60, -60, 60], sky: true } } };
// (the station's own plan, whatever map the raid last laid: ZM_ZONES is swapped for each stage's map)
function rchZone(k) { return ((typeof ZM_MAPS !== 'undefined' && ZM_MAPS.light && ZM_MAPS.light.zones) || ZM_ZONES)[k]; }
// the station's rooms seen from outside (ZM_ZONES' own rects): which, how high, and their north faces' windows
const RCHR_HOUSES = [['hall', 4.4, [[0, -20, 1], [0, -12], [0, -6, 1], [0, 6], [0, 12, 1], [0, 20]], [[0, 0]]], ['east', 3.8], ['west', 3.8], ['boat', 4.6, [[0, -4], [0, 4, 1]]], ['wreck', 4.2, [[0, -4, 1], [0, 4]]], ['quarters', 3.8, 0, 0, true], ['oil', 3.6], ['fog', 3.8], ['lamp', 3.6]];
cpStage('rchrock', rchStage({
  n: 'The Keeper’s Rock', map: RCH_ROCK_MAP, rchHolds: [], rchSeed: 3,
  // (the station's south side, its courtyard and jetty, are another night's: here, the rock's north half)
  block(x, y, pad) { const [lx, ly] = rchL(x, y); return ly < 3 && Math.abs(lx) < 46 || ly < -2; },
  rchSet(H, K) {
    const { put, light } = K;
    RCHR.IR = H.IR;
    for (const [k, hh, win, door, chim] of RCHR_HOUSES) { const r = rchZone(k).r, w = r[1] - r[0], d = r[3] - r[2]; put('rchhouse', (r[0] + r[1]) / 2, (r[2] + r[3]) / 2, 0, { w, d, hh, win: (win || []).map(([s, at, l]) => [s, at, l]), door: door || [], chim }); }
    // the two walled yards between the wings: drystone round them, a gate in each north wall
    for (const s of [-1, 1]) { put('rchdry', s * 45, 14, Math.PI / 2, { len: 24 }); put('rchdry', s * 30.5, 26, 0, { len: 9 }); put('rchdry', s * 41, 26, 0, { len: 6 }); }
    // the garrison's battery on the north rock: cannon over the reef, gabions round them, tents, their banner
    for (const s of [-1, 1]) { put('cannon', s * 10, 39, Math.PI / 2 - s * 0.25, { len: 2.4 }); for (let i = 0; i < 5; i++) { const a = Math.PI / 2 - 0.9 + i * 0.45; put('rchgab', s * 10 + Math.cos(a) * 3.4, 39 + Math.sin(a) * 3.2, 0, { hh: 1.3 }); } }
    for (const [x, y] of [[-4, 31], [4, 31.5], [-17, 32], [17, 33], [0, 44], [-24, 40], [24, 40]]) put('rchgab', x, y, 0, { hh: 1.35 });
    for (const [x, y, a] of [[-36, 20, 0.3], [36, 6, -0.2], [-21, 47, 1.2]]) put('fvtent', x, y, a, { c: '#6a3a22' });
    put('rchflag', 2, 35, 0, { c: RCHP.ember, c2: RCHP.ember2 });
    put('rchoil', RCHY.HOARD[0], RCHY.HOARD[1], 0, {});
    put('crates', 34, 18, 0.2, { items: [{ u: 0, v: 0, s: 0.9, ry: 0 }, { u: 1.0, v: 0.2, s: 0.8, ry: 0.4 }] });
    light(0, 27.5, 2.6, '#ffc070', 9, 'lantern');
  },
  rchTower: [ZMT.X, ZMT.Y, 0],
  enter() {
    rchState({ ph: 'battery', night: 1, oil: 0, pots: [], potT: 4, called: 0 });
    const S = RAID.st; S.mate = { x: 3, y: 49 };
    FPS.me.h = Math.PI;
    if (ZM.net === 'client') return;
    const n = rchN(), A = [[-10, 36.5], [10, 36.5], [-4, 29], [4, 29.5], [-36, 18], [36, 10], [-17, 30], [17, 31]];
    rchMuster(A.slice(0, Math.min(A.length, 4 + n)).map(([x, y]) => ({ k: 'ember', x, y, h: 0, wan: 1.5 })));
    cpObjective('Take the north battery'); cpWaypoint(0, 36, 'The battery');
  },
  tick(dt) {
    const S = RAID.st, n = rchN(); S.t += dt;
    rchSolTick(dt); rchCarryTick();
    if (S.ph === 'battery') {
      if (S.t > 1.5) rchSay('a', 'rchmate', 'Ember guns on the north rock. They’ve been shelling the shoal with them. Take the battery.', 'cp_m14_50');
      if (!rchSolLive().length && !S.commT) {
        S.commT = 1; S.ph = 'comm';
        const g = [[-3, 28.5], [3, 28.5]].map(([x, y]) => ({ k: 'guard', x, y, h: 0, wan: 3 }));
        rchMuster([{ k: 'comm', x: 0, y: 28, h: 0, wan: 5, boss: true }].concat(g));
        S.boss = S.so[S.so.length - 3];
        cpCine('m14_comm', () => { cpObjective('Bring down the Ember Commodore'); cpWaypoint(null); });
      }
    } else if (S.ph === 'comm') {
      const b = S.so.find(s => s.boss);
      // ---- his fire-pots: thrown where one of you stands, a ring on the ground first, then burning ----
      S.potT -= dt;
      if (b && b.st !== 3 && S.potT <= 0) { const P = rchCrew().filter(p => !p.down); if (P.length) { const p = P[(Math.random() * P.length) | 0], [lx, ly] = rchL(p.x, p.y); S.pots.push([lx + (Math.random() - 0.5) * 1.2, ly + (Math.random() - 0.5) * 1.2, -RCHY.POT_T, (S.potN = (S.potN | 0) + 1)]); rchSay('pot', 'rchcomm', 'Fire-pots! Burn them off my rock!', 'cp_m14_52'); } S.potT = RCHY.POT_EVERY * (b.hp < b.max / 2 ? 0.65 : 1) / (1 + 0.15 * (n - 1)); }
      for (const p of S.pots) p[2] += dt; S.pots = S.pots.filter(p => p[2] < RCHY.POT_BURN);
      if (b && b.hp < b.max / 2 && !S.called) { S.called = 1; rchMuster([[-38, 22], [38, 8], [-6, 46]].slice(0, 1 + Math.ceil(n / 2)).map(([x, y]) => ({ k: 'guard', x, y, h: 0, wan: 4 }))); rchSay('half', 'rchcomm', 'Guards! To me! If the Ember Isles can’t keep it, nobody keeps it!', 'cp_m14_53'); }
      if (b && b.st === 3 && !S.downT) { S.downT = 1; S.pots = []; rchSay('down', 'rchcomm', 'Light it, then. Light it, if you can. We never could.', 'cp_m14_54'); }
      if (S.downT && !rchSolLive().length) {
        S.ph = 'oil';
        cpObjective(`Carry the Light’s oil to the station’s back door · 0 of ${RCHY.OIL}`); cpWaypoint(RCHY.HOARD[0] + 2, RCHY.HOARD[1], 'The oil');
        S.mate = { x: 2.2, y: 28.5 };
        setTimeout(() => { if (RAID.st === S) rchSay('oil', 'rchmate', 'They hoarded the Light’s oil in the west yard. A cask at a time, to the back door. I’ll hold it open.', 'cp_m14_55'); }, 1500);
        setTimeout(() => { if (RAID.st === S) rchSay('dark', 'rchmate', 'Mind the rock. The Light’s dark, so the drowned have this shore too. Even this one.', 'cp_m14_56'); }, 9000);
      }
    } else if (S.ph === 'oil') {
      rchTrickle(dt, [1.9, 3.4], 6, { lvl: 3, run: 0.18 });
      if (S.oil >= RCHY.OIL && !S.endT) { S.endT = 1; for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'burn'); rchSay('in', 'rchmate', 'That’s the last of it. Ninety treads to the lantern. Up you go.', 'cp_m14_57'); setTimeout(() => { if (RAID.st === S) cpDone(); }, 2200); }
    }
  },
  rchq(sid, k, a) {
    const S = RAID.st;
    if (k === 'take' && S.ph === 'oil' && !S.cy[sid]) { S.cy[sid] = 'oil'; return; }
    if (k === 'give' && S.cy[sid] === 'oil') { delete S.cy[sid]; S.oil++; rchLine(`${rchNick(sid)} brought a cask in · ${S.oil} of ${RCHY.OIL}`); cpObjective(S.oil < RCHY.OIL ? `Carry the Light’s oil to the station’s back door · ${S.oil} of ${RCHY.OIL}` : ''); if (S.oil === 1) rchSay('o1', 'rchmate', 'One in. It smells like the station always did.', 'cp_m14_58'); return; }
    if (k === 'pick' && Array.isArray(a)) { const d = S.drop[a[0] | 0]; if (d && !S.cy[sid]) { S.cy[sid] = d[2]; S.drop.splice(a[0] | 0, 1); } }
  },
  rchSolDown(s) { if (s.k === 'ember' && rchSolLive().filter(q => !q.boss).length === 2) rchSay('few', 'rchember', 'Fall back to the station! Fetch the Commodore!', 'cp_m14_51'); },
  me(dt) {
    rchMe(dt);
    // (a fire-pot burning where I stand)
    const S = RAID.st, m = FPS.me, [lx, ly] = rchL(m.x, m.y);
    if (S.pots && S.pots.some(p => p[2] > 0 && Math.hypot(lx - p[0], ly - p[1]) < RCHY.POT) && !(m.dead > 0) && !zmIsDown() && !cpCineOn()) { RCH.potT = (RCH.potT || 0) - (FPS.dtLast || 0.016); if (RCH.potT <= 0) { RCH.potT = 0.8; fpsHurt(1, '', 'A fire-pot'); } }
    for (const p of S.pots || []) if (p[3] !== RCH.potSeen && p[2] > 0) { RCH.potSeen = p[3]; const [wx, wy] = rchW(p[0], p[1]); try { if (!soundOff()) sfxPlay('explode', { vol: clamp(0.8 - Math.hypot(wx - m.x, wy - m.y) / 60, 0.1, 0.7), pan: fpsEar(wx, wy), rate: 1.3 }); } catch (e) {} }
  },
  rchConsider(c) {
    const S = RAID.st;
    if (S.ph === 'oil') { rchC(c, { k: 'rchtake' }, RCHY.HOARD[0] + 1.9, RCHY.HOARD[1], 1.9); if (rchMine() === 'oil') rchC(c, { k: 'rchgive' }, RCHY.DOOR[0], RCHY.DOOR[1] + 0.6, 2.2); S.drop.forEach((d, i) => rchC(c, { k: 'rchpick', i }, d[0], d[1], 1.5)); }
  },
  rchPrompt(o) {
    if (o.k === 'rchtake') return rchMine() ? { text: 'Your hands are full' } : { text: 'Shoulder a cask of the Light’s oil', free: true };
    if (o.k === 'rchgive') return { text: 'Hand the cask in at the door', free: true };
    if (o.k === 'rchpick') return rchMine() ? { text: 'Your hands are full' } : { text: 'Pick the cask up', free: true };
    return null;
  },
  rchUse(o) {
    if (o.k === 'rchtake') { if (!rchMine()) raidAsk('take'); return true; }
    if (o.k === 'rchgive') { raidAsk('give'); return true; }
    if (o.k === 'rchpick') { if (!rchMine()) raidAsk('pick', [o.i]); return true; }
    return false;
  },
  rchPack() { const S = RAID.st; return [S.oil | 0, (S.pots || []).map(p => [Math.round(p[0] * 10), Math.round(p[1] * 10), Math.round(p[2] * 10), p[3]])]; },
  rchApply(a) { if (!Array.isArray(a)) return; const S = RAID.st; S.oil = a[0] | 0; S.pots = (a[1] || []).map(p => [p[0] / 10, p[1] / 10, p[2] / 10, p[3]]); },
  // (where the drowned rise: the rock's edge all round its north half, and up out of the yards' gullies)
  rchShore() { const a = 0.15 + Math.random() * (Math.PI - 0.3), r = (RCHR.IR || 55) - 2 - Math.random() * 3; return Math.random() < 0.2 ? [(Math.random() < 0.5 ? -1 : 1) * (36 + Math.random() * 6), 6 + Math.random() * 16] : [Math.cos(a) * r, Math.sin(a) * r]; },
  rchNight: () => 1,
  rchFogFar: 200,
  rchB3(grp) {
    // the fire-pots: a ring on the ground while it's in the air, then flames
    RCH3.pots = [0, 1, 2, 3, 4, 5].map(() => {
      const g2 = new THREE.Group(); g2.visible = false; grp.add(g2);
      const ring = new THREE.Mesh(new THREE.RingGeometry(RCHY.POT - 0.15, RCHY.POT, 32), new THREE.MeshBasicMaterial({ color: 0xff5a30, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g2.add(ring);
      const fl = new THREE.Sprite(rchSoft('rgba(255,160,70,0.9)', 'rgba(255,90,30,0)')); fl.scale.set(RCHY.POT * 2.2, 2.4, 1); fl.position.y = 1; g2.add(fl);
      const L = new THREE.PointLight(0xff8a40, 0, 10, 1.4); L.position.y = 1; g2.add(L);
      return { g: g2, ring, fl, L };
    });
    // the tower's windows, dark (lit one by one as you climb: m14_climb)
    const S = ZM_SKIN, G0 = FPSC.GROUND; RCH3.win = [];
    for (let k = 0; k < 5; k++) for (const a of [Math.PI / 2 + 0.35, Math.PI / 2 - 0.35]) { const z = ZMT.L[k] + 1.6, r = S.RB + (S.RT - S.RB) * (z - S.Z0) / (S.Z1 - S.Z0) + 0.06, m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.35), new THREE.MeshBasicMaterial({ color: 0x14181c })); const x = FPSC.CX + ZMT.X + Math.cos(a) * r, y = FPSC.CY + ZMT.Y + Math.sin(a) * r; m.position.copy(z3v(x, y, G0 + z)); m.rotation.y = a - Math.PI / 2 + Math.PI; grp.add(m); RCH3.win.push(m); }
  },
  rchF3(dt) {
    const S = RAID.st, G0 = FPSC.GROUND, t = g.t;
    RCH3.pots.forEach((P, i) => { const p = (S.pots || [])[i]; P.g.visible = !!p; P.L.intensity = 0; if (!p) return; const [x, y] = rchW(p[0], p[1]); P.g.position.copy(z3v(x, y, G0)); const air = p[2] < 0; P.ring.visible = air; P.ring.material.opacity = 0.4 + 0.4 * Math.sin(t * 12); P.fl.visible = !air; if (!air) { const f = reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 19 + i); P.fl.material.opacity = f * clamp((RCHY.POT_BURN - p[2]) / 0.8, 0, 1); P.L.intensity = 2 * f; if (!reduceMotion && Math.random() < dt * 14) FPS.parts.push({ x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 3, z: G0 + 0.3, vx: 0, vy: 0, vz: 2, t: 0.6, c: '255,140,60' }); } });
    // (the windows up the tower, as the climb lights them: RCH.climb 0 to 5 floors)
    if (RCH3.win) RCH3.win.forEach((m, i) => { const on = (RCH.climb || 0) > i / 2; m.material.color.setHex(on ? 0xffd890 : 0x14181c); });
  },
  hud(phone, mono, fell) {
    const S = RAID.st, extra = [];
    if (S.ph === 'battery') extra.push([`The Ember Isles: ${rchSolLive().length} standing`, 'rgba(255,190,150,0.9)']);
    if (S.ph === 'oil') extra.push([`The oil: ${S.oil} of ${RCHY.OIL} casks in`, 'rgba(255,214,150,0.95)']);
    rchHud(phone, mono, fell, extra);
    const b = S.so.find(s => s.boss); if (S.ph === 'comm' && b && b.st !== 3) rchBossBar(phone, mono, fell, 'The Ember Commodore', b.hp / b.max);
  },
  music() { const S = RAID.st; return S.ph === 'comm' ? 'cpm14rock' : S.ph === 'oil' ? 'cpm14dark' : 'cpm14war'; },
}));
var RCHR = {};

// =====================================================================================================================
// IV. The Light
// =====================================================================================================================
// (the gallery: round the lantern's glass, out to the rail; the lantern room inside the glass, round the lens; the
// two doors through the glass, east and west)
const RCHG = { C: [ZMT.X, ZMT.Y], GLASS: ZMT.GLASS, RAIL: 9.9, PED: 1.4, PUMP: [-3.1, 0], WIND: [0, 3.1], LENS: [1.9, 0], LW: [2.6, -1.6] };
const rchgR = (lx, ly) => [Math.hypot(lx - RCHG.C[0], ly - RCHG.C[1]), bearingOf(lx - RCHG.C[0], ly - RCHG.C[1])];
function rchgIn(lx, ly, pad) {
  const [r, b] = rchgR(lx, ly), door = Math.min(Math.abs(angDiff(b, Math.PI / 2)), Math.abs(angDiff(b, -Math.PI / 2))) * r < 1.0 - pad;
  if (r > RCHG.RAIL - 0.3 - pad) return false;
  if (r < RCHG.PED + pad) return false;
  if (r > RCHG.GLASS - 0.35 - pad && r < RCHG.GLASS + 0.35 + pad && !door) return false;
  return true;
}
const RCH_LAMP_MAP = { start: [0, ZMT.Y - 8.2], top: 0, R: 40, isle: 'cprchg', seed: 0x14a04, shore: () => -999, nav: [-12, 12, -10.5, 13.5], zones: { isle: { n: 'the Light’s gallery', r: [-12, 12, -10.5, 13.5], sky: true } } };
cpStage('rchlamp', rchStage({
  n: 'The Light', map: RCH_LAMP_MAP, rchHolds: ['rchlampL', 'rchpump', 'rchwind'], rchSeed: 4,
  block(x, y, pad) { const [lx, ly] = rchL(x, y); return !rchgIn(lx, ly, Math.max(0, (pad || 0) - 0.1)); },
  rchSet(H, K) {
    const { put } = K, C = RCHG.C, ring = (r, n, skip) => { const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * 6.283; pts.push([C[0] + Math.sin(a) * r, C[1] + Math.cos(a) * r, a]); } for (let i = 0; i < n; i++) { const [x0, y0, a0] = pts[i], [x1, y1] = pts[i + 1]; if (skip && skip(a0 + Math.PI / n)) continue; put('rchedge', (x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(y1 - y0, x1 - x0), { len: Math.hypot(x1 - x0, y1 - y0) + 0.2, hh: 1.2 }); } };
    ring(RCHG.RAIL + 0.1, 48); ring(RCHG.GLASS, 36, a => Math.min(Math.abs(angDiff(a, Math.PI / 2)), Math.abs(angDiff(a, -Math.PI / 2))) < 0.16); ring(RCHG.PED - 0.1, 10);
  },
  rchTower: [ZMT.X, ZMT.Y, -ZMT.L[5]],
  enter() {
    rchState({ ph: 'light', night: 1, lamp: { lit: 0, oil: 1, wind: 1, ang: Math.PI, k: 0, use: 0, pumpU: 0, windU: 0 }, ships: [], dmg: 0, shipT: 9, shipN: 0, passT: 0 });
    FPS.me.h = 0;
    if (ZM.net === 'client') return;
    cpObjective('Light the lamp (hold Use at the lens)'); cpWaypoint(RCHG.C[0] + RCHG.LENS[0], RCHG.C[1] + RCHG.LENS[1], 'The lens');
  },
  tick(dt) {
    const S = RAID.st, L = S.lamp, n = rchN(), C = rchW(RCHG.C[0], RCHG.C[1]); S.t += dt;
    // the drowned climb the tower and come over the rail
    if (S.ph === 'light') {
      L.use += rchTake('rchlampL', 0);
      if (S.t > 4) rchSay('a', 'lamp', 'The wick’s trimmed and the oil’s in. Put a light to it, and stand back.', 'cp_m14_60');
      if (L.use >= RCHY.LAMP_USE) { L.lit = 1; S.ph = 'keep'; cpEvent('rchlit', 1); cpObjective('Keep the Light lit: pump the oil and wind the clockwork'); cpWaypoint(null); rchSay('lit', 'lamp', 'There she is. Now keep her. Oil to the lamp, and wind the clock, or she stops turning.', 'cp_m14_61'); setTimeout(() => { if (RAID.st === S) rchSay('see', 'rchmate', 'They’ve seen it. Every nation in the Reach has seen it. Fire-ships, coming in.', 'cp_m14_62'); }, 6000); }
      rchTrickle(dt, [6, 9], 2, { lvl: 3 });
    } else if (S.ph === 'keep') {
      // ---- the lamp: the oil runs down (faster with the drowned at the lens); the clock runs down ----
      const crowd = ZM.z.filter(z => !z.dead && Math.hypot(z.x - C[0], z.y - C[1]) < RCHG.PED + 1.6).length;
      L.oil = clamp(L.oil - dt * RCHY.OIL_V * (1 + 0.8 * crowd) + rchTake('rchpump', 0) / RCHY.PUMP, 0, 1);
      L.wind = clamp(L.wind - dt * RCHY.WIND_V + rchTake('rchwind', 0) / RCHY.WINDUP, 0, 1);
      if (L.oil < 0.25) rchSay('oil' + Math.floor(S.t / 20), 'lamp', 'She’s starving for oil! Pump!', 'cp_m14_63');
      if (L.wind <= 0) rchSay('wind' + Math.floor(S.t / 20), 'lamp', 'The clock’s run down. She’s stopped turning. Wind her!', 'cp_m14_64');
      if (crowd) rchSay('crowd' + Math.floor(S.t / 25), 'lamp', 'They’re at the lens! Get them off my glass!', 'cp_m14_65');
      // ---- the fire-ships: one at a time, then more ----
      const total = Math.min(8, 4 + (n - 1));
      S.shipT -= dt;
      if (S.shipN < total && S.shipT <= 0) { S.shipN++; const a = (S.shipN * 2.39 + Math.random() * 0.6) % 6.283 - Math.PI; S.ships.push({ a, d: RCHY.SHIP_D, hp: 3, st: 0, cd: 0, id: S.shipN, t: 0 }); S.shipT = (S.shipN < 3 ? 20 : 15) / (1 + 0.1 * (n - 1)); if (S.shipN === 1) rchSay('s1', 'rchmate', 'There’s the first. Burning, and coming straight for the rock.', 'cp_m14_66'); if (S.shipN === Math.ceil(total / 2) + 1) rchSay('s2', 'rchmate', 'More of them. Every nation’s sent one.', 'cp_m14_67'); }
      for (const sh of S.ships) {
        sh.t += dt; sh.cd = Math.max(0, sh.cd - dt);
        if (sh.st === 0) {
          sh.d -= dt * RCHY.SHIP_V;
          // (in the beam: three passes and she sees the rocks)
          if (L.k > 0.5 && Math.abs(angDiff(sh.a, L.ang)) < RCHY.HALF && sh.cd <= 0) { sh.hp--; sh.cd = 2.5; cpEvent('rchsee', sh.id); if (sh.hp <= 0) { sh.st = 1; sh.t = 0; rchSay('turn' + (S.turnN = (S.turnN | 0) + 1) % 3, 'rchmate', ['She’s seen the rocks! She’s going about!', 'Another one sheering off!', 'She’s turned! In its light they see what’s really there.'][(S.turnN - 1) % 3], ['cp_m14_68', 'cp_m14_69', 'cp_m14_70'][(S.turnN - 1) % 3]); } }
          if (sh.d < RCHY.SHIP_RAM) { sh.st = 3; sh.t = 0; S.dmg++; cpEvent('rchram', [sh.id, S.dmg]); if (S.dmg < 3) rchSay('ram' + S.dmg, 'lamp', ['She’s struck the rock! The whole tower shook!', 'Another! The glass won’t take a third!'][S.dmg - 1] || '', ['cp_m14_71', 'cp_m14_72'][S.dmg - 1] || ''); if (S.dmg >= 3) cpFail('Three fire-ships broke on the rock, and the Light went dark again'); }
        } else if (sh.st === 1) { sh.d += dt * RCHY.SHIP_V * 0.6; sh.a += dt * 0.03; }
      }
      // ---- the beam: it burns the drowned it sweeps ----
      if (L.k > 0.5) for (const z of ZM.z) { if (z.dead || z.rr > 0.05) continue; if (Math.abs(angDiff(bearingOf(z.x - C[0], z.y - C[1]), L.ang)) < RCHY.HALF * 1.4) zmKill(z, false, 'L', 'lamp'); }
      rchTrickle(dt, [1.5, 2.6], 6 + Math.floor(S.t / 50), { lvl: 4, run: 0.18, near: 4 });
      // ---- all of them turned, or broken: done ----
      if (S.shipN >= total && S.ships.every(s => s.st !== 0) && !S.endT && S.dmg < 3) { S.endT = 1; for (const z of ZM.z) if (!z.dead) zmKill(z, false, 'L', 'lamp'); rchSay('end', 'lamp', 'That’s the last of them. Look at it. Every shore in the Reach, lit.', 'cp_m14_73'); setTimeout(() => { if (RAID.st === S) cpDone(); }, 3000); }
    }
  },
  me(dt) {
    rchMe(dt);
    const S = RAID.st, L = S.lamp; if (!L) return;
    // (every screen: the lamp coming up and turning, from the host's word; the Lighthouse's own lens shows it)
    const want = L.lit && L.oil > 0 ? 1 : 0; L.k = clamp((L.k || 0) + (want ? dt / 2.2 : -dt / 1.2), 0, 1);
    if (L.k > 0 && L.wind > 0) L.ang = wrapPi((L.ang || 0) + dt * 2 * Math.PI / RCHY.TURN);
    if (ZM.lamp) { ZM.lamp.k = RCH.lensK != null ? RCH.lensK : L.k; ZM.lamp.ang = RCH.lensA != null ? RCH.lensA : L.ang; ZM.lamp.t = 0; }
    // (the hum of it, the clock's tick)
    if (L.k > 0.3) { RCH.humT = (RCH.humT || 0) - dt; if (RCH.humT <= 0) { RCH.humT = 1.6; try { if (!soundOff() && typeof zmlSound === 'function') zmlSound('hum'); } catch (e) {} } }
  },
  rchConsider(c) {
    const S = RAID.st, C = RCHG.C;
    if (S.ph === 'light') rchC(c, { k: 'rchlampL', i: 0 }, C[0] + RCHG.LENS[0], C[1] + RCHG.LENS[1], 1.5);
    if (S.ph === 'keep') { rchC(c, { k: 'rchpump', i: 0 }, C[0] + RCHG.PUMP[0], C[1] + RCHG.PUMP[1], 1.6); rchC(c, { k: 'rchwind', i: 0 }, C[0] + RCHG.WIND[0], C[1] + RCHG.WIND[1], 1.6); }
  },
  rchPrompt(o) {
    const L = RAID.st.lamp;
    if (o.k === 'rchlampL') return { text: 'Hold to light the lamp', hold: true };
    if (o.k === 'rchpump') return { text: `Hold to pump the oil up (${Math.round(L.oil * 100)}%)`, hold: true };
    if (o.k === 'rchwind') return { text: `Hold to wind the clockwork (${Math.round(L.wind * 100)}%)`, hold: true };
    return null;
  },
  rchUse(o) { return o.k === 'rchlampL' || o.k === 'rchpump' || o.k === 'rchwind'; },
  rchPack() { const S = RAID.st, L = S.lamp; return [L.lit, Math.round(L.oil * 100), Math.round(L.wind * 100), Math.round(L.ang * 100), S.dmg, S.ships.map(s => [Math.round(s.a * 100), Math.round(s.d), s.hp, s.st, s.id, Math.round(s.t * 10)])]; },
  rchApply(a) { if (!Array.isArray(a)) return; const S = RAID.st, L = S.lamp || (S.lamp = { k: 0 }); L.lit = a[0] | 0; L.oil = (a[1] | 0) / 100; L.wind = (a[2] | 0) / 100; const ang = (a[3] | 0) / 100; if (Math.abs(angDiff(ang, L.ang || 0)) > 0.5) L.ang = ang; S.dmg = a[4] | 0; const old = S.ships || []; S.ships = (a[5] || []).map(s => ({ a: s[0] / 100, d: s[1], hp: s[2], st: s[3], id: s[4], t: s[5] / 10, flash: ((old.find(o => o.id === s[4]) || {}).flash) || 0 })); },
  // (where the drowned come over: anywhere round the rail)
  rchShore() { const a = Math.random() * 6.283, r = RCHG.RAIL - 0.75; return [RCHG.C[0] + Math.sin(a) * r, RCHG.C[1] + Math.cos(a) * r]; },
  rchNight: () => 1,
  rchLit() { const L = RAID.st.lamp; return L ? L.k * 0.6 : 0; },
  rchSeaY: -ZMT.L[5],
  rchFarY: -ZMT.L[5],
  rchFogFar: 420,
  rchFogNear: 60,
  rchBeaZ: () => 0,
  rchFarDip(f) { return RCH.dip != null ? clamp(1 - RCH.dip * (1 + f.nat * 0.4), 0.05, 1) : 1; },
  rchB3(grp) {
    const G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, C = rchW(RCHG.C[0], RCHG.C[1]), D = -ZMT.L[5];
    // the floors: the lantern room's (brass-edged plates round the pedestal) and the gallery's iron deck
    const fl = new THREE.Mesh(new THREE.CircleGeometry(RCHG.GLASS, 48), z3Lam('#4a4a46')); fl.rotation.x = -Math.PI / 2; fl.position.copy(z3v(C[0], C[1], G0 + 0.005)); grp.add(fl);
    const dk = new THREE.Mesh(new THREE.RingGeometry(RCHG.GLASS, 10.1, 64), z3Lam('#24282b', { side: THREE.DoubleSide })); dk.rotation.x = -Math.PI / 2; dk.position.copy(z3v(C[0], C[1], G0 + 0.01)); grp.add(dk);
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 10.1 - RCHG.GLASS), z3Lam('#1a1d20')); b.position.copy(z3v(C[0] + Math.sin(a) * (RCHG.GLASS + 10.1) / 2, C[1] + Math.cos(a) * (RCHG.GLASS + 10.1) / 2, G0 + 0.016)); b.rotation.y = -a; grp.add(b); }
    // the pump and the clockwork: a brass pump on its stand by the west door, the clock's drum and handle by the north
    const brass = new THREE.MeshPhongMaterial({ color: 0x8a6a2c, specular: 0xb09060, shininess: 60 }), iron = z3Lam('#22262a');
    { const [x, y] = rchW(RCHG.C[0] + RCHG.PUMP[0], RCHG.C[1] + RCHG.PUMP[1]); const g2 = RCH3.pump = new THREE.Group(); g2.position.copy(z3v(x, y, G0)); grp.add(g2); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.0, 12), brass); b.position.y = 0.5; g2.add(b); const h = RCH3.pumpH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), iron); h.position.y = 1.1; g2.add(h); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), brass); p.rotation.z = Math.PI / 2; p.position.set(1.1, 0.25, 0); g2.add(p); }
    { const [x, y] = rchW(RCHG.C[0] + RCHG.WIND[0], RCHG.C[1] + RCHG.WIND[1]); const g2 = RCH3.wind = new THREE.Group(); g2.position.copy(z3v(x, y, G0)); grp.add(g2); const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.6), z3Lam('#2e5a5a')); box.position.y = 0.5; g2.add(box); const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 14), brass); dr.rotation.z = Math.PI / 2; dr.position.y = 1.15; g2.add(dr); const cr = RCH3.crank = new THREE.Group(); cr.position.set(0.45, 1.15, 0); g2.add(cr); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), iron); arm.position.y = 0.22; cr.add(arm); const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), z3Lam('#4a3626')); hd.rotation.z = Math.PI / 2; hd.position.set(0.1, 0.45, 0); cr.add(hd); }
    // Holm's log on the desk by the east door, open at the last page
    { const [x, y] = rchW(RCHG.C[0] + 4.3, RCHG.C[1] + 2.0); const g2 = new THREE.Group(); g2.position.copy(z3v(x, y, G0)); g2.rotation.y = -0.9; grp.add(g2); const tb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.7), z3Lam('#4e3826')); tb.position.y = 0.85; g2.add(tb); for (const [a, b] of [[-0.5, -0.28], [0.5, -0.28], [-0.5, 0.28], [0.5, 0.28]]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), z3Lam('#3a2a1c')); lg.position.set(a, 0.42, b); g2.add(lg); } const bk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.42), z3Lam('#e8dcc0')); bk.position.y = 0.9; g2.add(bk); const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.44), z3Lam('#5a2a1a')); sp.position.y = 0.91; g2.add(sp); RCH3.log = g2; }
    // far below: the sea (the world's own, lowered), the rock, the station round the foot of the tower
    { const rk = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), new THREE.MeshLambertMaterial({ color: 0x4a4a46 })); rk.scale.set(62, 6, 66); rk.position.copy(z3v(CX, CY - 8, G0 + D - 3.2)); grp.add(rk);
      const wm = new THREE.MeshLambertMaterial({ color: 0xc8c2b4 }), rm = new THREE.MeshLambertMaterial({ color: 0x2e3236 });
      for (const [k, hh] of RCHR_HOUSES) { const r = rchZone(k).r, w = r[1] - r[0], d = r[3] - r[2], b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), wm); b.position.copy(z3v(CX + (r[0] + r[1]) / 2, CY + (r[2] + r[3]) / 2, G0 + D + hh / 2)); grp.add(b); const rf = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), rm); rf.position.copy(z3v(CX + (r[0] + r[1]) / 2, CY + (r[2] + r[3]) / 2, G0 + D + hh + 0.25)); grp.add(rf); }
      for (const k of ['yard', 'dock']) { const r = rchZone(k).r, b = new THREE.Mesh(new THREE.BoxGeometry(r[1] - r[0], 0.4, r[3] - r[2]), new THREE.MeshLambertMaterial({ color: 0x6c6a62 })); b.position.copy(z3v(CX + (r[0] + r[1]) / 2, CY + (r[2] + r[3]) / 2, G0 + D + 0.4)); grp.add(b); }
    }
    // the fire-ships: a hull, a sail, burning
    RCH3.ships = [];
    for (let i = 0; i < 8; i++) {
      const g2 = new THREE.Group(); g2.visible = false; grp.add(g2);
      const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 16), z3Lam('#1c1a18')); hull.position.y = 0.6; g2.add(hull);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 13, 6), z3Lam('#2a2018')); mast.position.y = 7.6; g2.add(mast);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshLambertMaterial({ color: 0x6a5a44, side: THREE.DoubleSide })); sail.position.set(0, 8, 0.4); g2.add(sail);
      const fire = new THREE.Sprite(rchSoft('rgba(255,170,80,0.95)', 'rgba(255,100,30,0)')); fire.scale.set(16, 14, 1); fire.position.y = 5; g2.add(fire);
      const glow = new THREE.Sprite(rchSoft('rgba(255,120,50,0.4)', 'rgba(255,90,30,0)')); glow.scale.setScalar(40); glow.position.y = 3; g2.add(glow);
      const seen = new THREE.Sprite(rchSoft('rgba(255,255,240,0.9)', 'rgba(255,255,220,0)')); seen.scale.setScalar(30); seen.position.y = 4; seen.visible = false; g2.add(seen);
      RCH3.ships.push({ g: g2, fire, glow, sail, seen, flashT: 0 });
    }
    // the Lampwright, by his lens
    RCH.npc.lamp = cpkNpc(['#5a3a22', '#d8ccb0', '#3a2a1a', '#ffd88a'], 'oc_tar');
    RCH.npc.holm = null;
  },
  rchF3(dt) {
    const S = RAID.st, G0 = FPSC.GROUND, t = g.t, C = rchW(RCHG.C[0], RCHG.C[1]), D = -ZMT.L[5], L = S.lamp || {};
    // (the fire-ships out on the sea, at their bearings)
    RCH3.ships.forEach((M, i) => {
      const sh = S.ships[i]; M.g.visible = !!sh && !(sh.st === 3 && sh.t > 3) && !(sh.st === 1 && sh.t > 30); if (!M.g.visible) return;
      const x = C[0] + Math.sin(sh.a) * sh.d, y = C[1] + Math.cos(sh.a) * sh.d; M.g.position.copy(z3v(x, y, G0 + D + (sh.st === 3 ? -sh.t * 1.5 : 0)));
      M.g.rotation.y = -(sh.a + Math.PI) + (sh.st === 1 ? Math.min(1, sh.t / 6) * 2.4 : 0);
      const f = reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 9 + i) * Math.sin(t * 4 + i * 2), fade = sh.st === 1 ? clamp(1 - sh.t / 25, 0, 1) : 1;
      M.fire.material.opacity = f * fade * (sh.st === 3 ? clamp(1 - sh.t / 3, 0, 1) : 1); M.glow.material.opacity = 0.4 * f * fade; M.fire.scale.set(16 + (sh.st === 3 ? sh.t * 20 : 0), 14 + (sh.st === 3 ? sh.t * 18 : 0), 1);
      if (sh.flash > 0) { sh.flash -= dt; } M.seen.visible = (sh.flash || 0) > 0; if (M.seen.visible) M.seen.material.opacity = sh.flash / 0.6;
    });
    // (the pump's handle and the clock's crank, moving while someone works them)
    if (RCH3.pumpH) RCH3.pumpH.rotation.z = (S.holdNow === 'rchpump:0' || RCH.pumpVis > 0) ? Math.sin(t * 9) * 0.5 : 0;
    if (RCH3.crank && (S.holdNow === 'rchwind:0' || RCH.windVis > 0)) RCH3.crank.rotation.x -= dt * 7;
    // (the Lampwright: tending the lens, turning to watch you)
    if (RCH.npc && RCH.npc.lamp) { const F = RCH.npc.lamp, o = (RCH.cineAt && RCH.cineAt.lamp) || { x: RCHG.C[0] + RCHG.LW[0], y: RCHG.C[1] + RCHG.LW[1] }, [x, y] = rchW(o.x, o.y); cpkNpcPose(F, { x, y, h: o.h == null ? bearingOf(FPS.me.x - x, FPS.me.y - y) : o.h, spd: o.spd || 0, noGun: true, lan: false }); rchNoGun(F); }
  },
  hud(phone, mono, fell) {
    const S = RAID.st, L = S.lamp || {}, extra = [];
    if (S.ph === 'keep') {
      extra.push([`The oil: ${Math.round(L.oil * 100)}%   ·   the clockwork: ${Math.round(L.wind * 100)}%${L.wind <= 0 ? ' (STOPPED)' : ''}`, L.oil < 0.25 || L.wind < 0.2 ? 'rgba(255,150,110,0.95)' : 'rgba(255,224,170,0.95)']);
      const left = S.ships.filter(s => s.st === 0).length, total = Math.min(8, 4 + (rchN() - 1)); extra.push([`Fire-ships: ${S.ships.filter(s => s.st === 1).length} turned, ${left} coming, ${Math.max(0, total - S.shipN)} still to show  ·  the rock struck ${S.dmg} of 3`, S.dmg ? 'rgba(255,170,130,0.95)' : 'rgba(236,228,207,0.85)']);
    }
    rchHud(phone, mono, fell, extra);
    if (S.ph === 'keep') rchShipStrip(phone, mono);
  },
  music() { const S = RAID.st; return S.ph === 'keep' ? 'cpm14lamp' : 'cpm14dark'; },
}));
cpOn('rchsee', id => { const sh = (RAID.st.ships || []).find(s => s.id === id); if (sh) sh.flash = 0.6; try { if (!soundOff()) sfxPlay('beam', { vol: 0.5, rate: 0.8 }); } catch (e) {} });
cpOn('rchram', a => { try { if (!soundOff()) { sfxPlay('explode', { vol: 1, rate: 0.6 }); sfxPlay('debris', { vol: 0.7 }); } } catch (e) {} if (typeof FPS !== 'undefined') FPS.shake = Math.max(FPS.shake || 0, 0.8); });
cpOn('rchlit', () => { try { if (!soundOff()) { sfxPlay('flare', { vol: 0.6, rate: 0.6 }); sfxPlay('foghorn', { vol: 0.5 }); } } catch (e) {} });
// a strip along the top: where the fire-ships are, round you, and where the beam points
function rchShipStrip(phone, mono) {
  const S = RAID.st, L = S.lamp || {}, m = FPS.me, w = Math.min(520, W * 0.6), x0 = (W - w) / 2, y = fpsHudTop() + (phone ? 30 : 40), C = rchW(RCHG.C[0], RCHG.C[1]);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x0, y, w, 14);
  const X = b => x0 + w / 2 + angDiff(b, m.h) / Math.PI * w / 2;
  if (L.k > 0.3) { ctx.fillStyle = 'rgba(255,240,190,0.55)'; const bx = X(L.ang); ctx.fillRect(bx - 4, y, 8, 14); }
  for (const sh of S.ships) { if (sh.st !== 0) continue; const k = clamp(1 - sh.d / RCHY.SHIP_D, 0, 1), bx = X(sh.a); ctx.fillStyle = `rgba(255,${150 - 100 * k | 0},60,0.95)`; ctx.beginPath(); ctx.arc(bx, y + 7, 3 + 4 * k, 0, 6.283); ctx.fill(); for (let i = 0; i < sh.hp; i++) ctx.fillRect(bx - 6 + i * 5, y + 16, 3, 3); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 8 : 10); ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText('FIRE-SHIPS · THE BEAM', W / 2, y + 22);
}
