// The raid, part two: the bridge. Through the glowing door at the end of the descent (src/raid.js) you come out on
// the near bank of a black river underground, too wide to jump and too fast to swim. Across it, the stumps of an old
// bridge's piers and nothing between them. Either side of the bridge's foot is a ring of old stones, a circle: kill
// the drowned inside the circles and the bridge builds itself out across the water, plank by plank. But a circle
// only works while someone stands in it: leave one empty and the bridge starts to fall back into the river, from
// the far end in, plank after plank (anyone on a plank that goes is swept back to the near bank).
// So two hold the circles while the third takes the Cutlass of Plimsoll from its stone at the bridge's foot and
// crosses. On the far bank, one after another, three Divers come up out of the river. Nothing hurts them but the
// Cutlass. Each one drops his brass helmet when he goes down; carry each to one of the three stands on the far bank.
// With the third helmet on its stand the bridge sets fast for good: the circles can be left, everyone can cross, and
// a door in the rock opens back on the near bank, on to the third part.
// The crew's size (rbNeed): both circles have to be held with three or more of you (a fourth is free to guard the
// circles, or cross too); with two, one of them; alone, the circle you leave holds for a minute and a half.
//
// The Cutlass of Plimsoll (FPSW.plimsoll, code 'P'): a heavy cutlass with a sea-blue blade, its edge set with a
// row of the shark's own teeth and a grip of his skin. There is one: it lies on its stone until someone takes it
// (Use), and goes back to the stone if its bearer goes down, leaves, or lays it back there. In hand it's quicker and
// hits harder than the ordinary cutlass, and it's the only thing the Divers here can feel.
//
// Laid out in the island's own frame (x east, y north, from its middle): the river runs east-west across the middle
// (RBC.RY, RBC.RW wide), the bridge crosses it north at x = 0, the near bank is the south. Walls of rock all round.
// Together it's all the host's (host-authoritative, as the rest of the Lighthouse's co-op, src/zmnet.js): what the
// bridge has built, who holds the Cutlass, the Divers and the helmets go out in the stage's snapshot (rbPack /
// rbApply: `rb`), and a joined player asks the host to take or lay down the Cutlass, pick up a helmet, set one on a
// stand, or go through the door (rbReq). The Divers are the Lighthouse's own (src/zmboss.js), streamed with the
// rest of the drowned. The river itself is a row of solids that don't stop shots or show (ray, occ false), with one
// for each plank's span of the bridge that's taken away as the plank goes down and put back when it falls.

const RBC = {
  RY: 0, RW: 18, X0: -44, X1: 44, Y0: -54, Y1: 40,   // the river's middle and width; the cavern's walls
  BW: 3.4, SEG: 9,                                    // the bridge: its width, its planks' spans (each RW / SEG)
  CR: 3.2, CX: 6.8, CY: -13.5,                        // the circles: radius, either side of the bridge's foot
  KILLS: 22, KILLS1: 16,                               // kills in the circles to build the bridge (alone: fewer)
  GRACE: 1.2, SOLO: 90, FALL: 1.4,                     // a circle empty that long (alone: SOLO), then a plank goes every FALL s
  STONE: [0, -19.5],                                   // the Cutlass's stone
  STANDS: [[-7, 27], [0, 30], [7, 27]],                // the helmets' stands, on the far bank
  DOOR: [0, -53.2],                                    // the way on, in the rock behind the near bank
  START: [0, -40],                                     // where you come out (from the descent's door)
  LEVEL: 8, ALIVE: 8, ALIVE_MORE: 3,                   // the drowned here: as strong as round LEVEL's, how many at once
  DHP: 14, DGAP: 5,                                    // a Diver: cuts of the Cutlass to put down; the wait between them
};
RBC.SL = RBC.RW / RBC.SEG;
// the Cutlass of Plimsoll
FPSW.plimsoll = { n: 'Cutlass of Plimsoll', code: 'P', mag: 0, rate: 0.42, reload: 1.4, dmg: 3, head: 3, reach: 3.0, arc: 0.9, melee: true, kick: 0 };
FPSW_BY_CODE.P = 'plimsoll';
ZM_AMMO.plimsoll = 0; ZM_DMG.P = 2.5;

const RB = { on: false };
// how many of the circles have to be held, for a crew this size
const rbNeed = () => ((ZM.hum || []).length || 1) >= 3 ? 2 : 1;
// (alone, the circle you leave holds a good while before the bridge starts to go)
const rbGrace = () => ((ZM.hum || []).length || 1) > 1 ? RBC.GRACE : RBC.SOLO;
const rbW = (x, y) => [FPSC.CX + x, FPSC.CY + y];
const rbL = (x, y) => [x - FPSC.CX, y - FPSC.CY];
const rbNick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
const rbHumIx = sid => (ZM.hum || []).findIndex(h => h[0] === sid);
const rbHumAt = i => ((ZM.hum || [])[i] || [])[0] || null;

function rbReset() {
  Object.assign(RB, {
    on: true, p: 0, kills: 0, held: [false, false], emptyT: 0, fallT: 0, done: false, open: false, cut: null, wait: 0,
    phase: 'build', dn: 0, dWait: 0, diver: null, helms: [], placed: [-1, -1, -1], carry: -1, hseq: 0, navT: 0, spawnT: 2,
    built: 0, falls: [], splash: [], crossed: false, warnT: 0, said: {},
  });
}

// ---------- laying out the place ----------
// (from the raid's stage switch: H as FPI_GEN's set(H) gets it; the river, its banks and the cavern round them)
function rbSet(H, K, Z) {
  const { I, put, light } = H; Z = Z || I.zm;
  const P = (k, x, y, a, o) => { const [wx, wy] = rbW(x, y); return put(k, wx, wy, a || 0, o || {}); };
  const L = (x, y, z, c, r) => { const [wx, wy] = rbW(x, y); light(wx, wy, z, c, r, 'lantern'); };
  const { RY, RW, X0, X1, Y0, Y1, BW, SEG, SL } = RBC, h = RW / 2;
  // the cavern's walls, of rough rock, high
  const rock = { mat: 'stone', hh: 17, th: 1.2, jag: 0 };
  H.wall(...rbW(X0, Y0), ...rbW(X1, Y0), rock); H.wall(...rbW(X0, Y1), ...rbW(X1, Y1), rock);
  H.wall(...rbW(X0, Y0), ...rbW(X0, Y1), rock); H.wall(...rbW(X1, Y0), ...rbW(X1, Y1), rock);
  // the river: solid to walk (not to shoot), all but the bridge's line; the bridge's line, one span to each plank
  const sol = [], seg = [], S = (x, y, hw, hd) => { const [wx, wy] = rbW(x, y); return { s: 'b', x: wx, y: wy, ang: 0, hw, hd, z1: FPSC.GROUND + 1.6, br: Math.hypot(hw, hd), ray: false, occ: false, col: '#0a1418', rb: true }; };
  const wL = (BW / 2 - X0) / 2, wR = (X1 - BW / 2) / 2;
  sol.push(S(X0 + wL, RY, wL, h), S(BW / 2 + wR, RY, wR, h));
  for (let i = 0; i < SEG; i++) seg.push(S(0, RY - h + (i + 0.5) * SL, BW / 2, SL / 2));
  for (const s of sol.concat(seg)) I.solids.push(s);
  I.rb = { seg, on: seg.slice() };
  // the piers' stumps either side of the bridge's line, and the stone abutments at each end
  for (const y of [RY - h, RY + h]) for (const s of [-1, 1]) P('block', s * (BW / 2 + 0.45), y, 0, { w: 0.8, d: 1.4, hh: 1.0, col: '#4a4842' });
  // the circles' stones, the Cutlass's stone and the stands (their solids: low, round)
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3; P('stone', s * RBC.CX + Math.cos(a) * (RBC.CR + 0.45), RBC.CY + Math.sin(a) * (RBC.CR + 0.45), a, { w: 0.5, d: 0.4, hh: 0.9 + 0.3 * (i % 2) }); }
  // the far bank's stands, the near bank's door, rocks and the drowned's ways up out of the water
  for (const [x, y] of RBC.STANDS) L(x, y, 2.2, '#8affd0', 6);
  L(0, RBC.STONE[1], 1.6, '#7fd8ff', 7);
  for (const s of [-1, 1]) { L(s * RBC.CX, RBC.CY, 2.4, '#ffb070', 9); P('brazier', s * (RBC.CX + RBC.CR + 1.6), RBC.CY + 1.5, 0, {}); }
  L(0, RBC.DOOR[1] + 2, 2.6, '#c8a0ff', 8);
  L(0, -36, 3, '#ffc070', 12); L(-24, -30, 3, '#ffb060', 10); L(24, -30, 3, '#ffb060', 10); L(0, 22, 3, '#8affd0', 12); L(-20, 20, 3, '#6ad8c0', 9); L(20, 20, 3, '#6ad8c0', 9);
  for (const [x, y, r] of [[-30, -40, 2.2], [31, -44, 1.8], [-36, -20, 1.6], [37, -24, 2.0], [-18, -46, 1.4], [16, -48, 1.5], [-30, 30, 2.0], [28, 33, 2.4], [-38, 18, 1.6], [38, 14, 1.8], [-14, 34, 1.3], [17, 16, 1.2]]) P('stone', x, y, x * y, { w: r * 1.4, d: r, hh: r * 1.3 });
  // the door in the rock: its frame (the door itself is drawn and solid while it's shut: rbDoorSolid)
  for (const s of [-1, 1]) P('block', s * 2.1, RBC.DOOR[1], 0, { w: 1.0, d: 1.2, hh: 3.6, col: '#3a3640' });
  P('block', 0, RBC.DOOR[1], 0, { w: 5.2, d: 1.2, hh: 0.8, z0: 3.4, col: '#3a3640' });
  const [dx, dy] = rbW(...RBC.DOOR), door = { s: 'b', x: dx, y: dy + 0.2, ang: 0, hw: 1.6, hd: 0.3, z1: FPSC.GROUND + 3.4, br: 1.7, col: '#2a2430', rb: true };
  I.solids.push(door); I.rb.door = door;
  Z.decks = Z.decks || [];
}
// the bridge's spans: solid where there's no plank, gone where there is (n built, from the near bank out)
function rbSpans(n) {
  const I = FPS.g && FPS.g.isle; if (!I || !I.rb) return;
  const want = I.rb.seg.slice(n), now = I.rb.on;
  if (want.length === now.length) return;
  I.solids = I.solids.filter(s => !I.rb.seg.includes(s)).concat(want); I.rb.on = want; fpiIndex(I);
  if (typeof zmNavBuild === 'function') { zmNavBuild(); ZM.navT = 0; }
}
function rbDoorSolid(open) {
  const I = FPS.g && FPS.g.isle; if (!I || !I.rb || !I.rb.door) return;
  const has = I.solids.includes(I.rb.door);
  if (open === !has) return;
  I.solids = open ? I.solids.filter(s => s !== I.rb.door) : I.solids.concat([I.rb.door]); fpiIndex(I);
  if (typeof zmNavBuild === 'function') { zmNavBuild(); ZM.navT = 0; }
}
// where things are, in the island's frame
const rbInRiver = (lx, ly) => Math.abs(ly - RBC.RY) < RBC.RW / 2 && lx > RBC.X0 && lx < RBC.X1;
const rbOnBridge = (lx, ly) => Math.abs(lx) < RBC.BW / 2 + 0.1 && rbInRiver(lx, ly);
const rbSegAt = ly => Math.floor((ly - (RBC.RY - RBC.RW / 2)) / RBC.SL);
const rbFar = ly => ly > RBC.RY + RBC.RW / 2;
const rbInCircle = (i, lx, ly) => Math.hypot(lx - (i ? RBC.CX : -RBC.CX), ly - RBC.CY) < RBC.CR;

// ---------- each tick (hosting, or alone) ----------
function rbTick(dt) {
  if (!RB.on) return;
  const need = rbNeed(), pl = ZM.players || [];
  // who stands in the circles (only those on their feet)
  RB.held = [0, 1].map(i => pl.some(p => { const [lx, ly] = rbL(p.x, p.y); return rbInCircle(i, lx, ly) && (p.jz || 0) < 1; }));
  const held = RB.held.filter(Boolean).length;
  // the bridge: built by the kills; falling back while a circle's empty, until the helmets set it fast
  if (!RB.done) {
    const total = (ZM.hum || []).length > 1 ? RBC.KILLS : RBC.KILLS1;
    const want = Math.min(RBC.SEG, RB.kills / total * RBC.SEG);
    if (want > RB.p) RB.p = want;
    if (held < need && RB.p > 0) {
      RB.emptyT += dt;
      if (RB.emptyT > rbGrace()) {
        RB.fallT -= dt;
        if (RB.fallT <= 0) {
          RB.fallT = RBC.FALL;
          const n = Math.ceil(RB.p) - 1;
          RB.p = Math.max(0, n); RB.kills = Math.round(RB.p / RBC.SEG * total);
          rbEvent('fall', n);
        }
      }
    } else { RB.emptyT = 0; RB.fallT = 0.4; }
  }
  RB.falling = !RB.done && RB.p > 0 && held < need && RB.emptyT > rbGrace();
  RB.holdT = !RB.done && RB.p > 0 && held < need && !RB.falling ? Math.ceil(rbGrace() - RB.emptyT) : 0;
  const built = Math.floor(RB.p + 1e-6);
  if (built !== RB.built) { if (built > RB.built) rbEvent('plank', built); RB.built = built; rbSpans(built); }
  // the Cutlass back on its stone if its bearer's gone down or away
  if (RB.cut) {
    const r = RB.cut === FPS.me.id ? null : FPS.remote.get(RB.cut);
    const gone = RB.cut === FPS.me.id ? (FPS.me.dead > 0 || zmIsDown()) : (!r || r.left || r.dead || r.down);
    if (gone) { RB.cut = null; rbEvent('stone'); }
  }
  // the Divers: once the bridge has first reached the far bank and the Cutlass has crossed it, one after another
  if (RB.phase === 'build' && RB.cut && built >= RBC.SEG) {
    const c = RB.cut === FPS.me.id ? FPS.me : FPS.remote.get(RB.cut);
    if (c && rbFar(rbL(c.x, c.y)[1])) { RB.phase = 'divers'; RB.dWait = 2.5; rbEvent('divers'); }
  }
  if (RB.phase === 'divers') {
    if (RB.diver && (RB.diver.dead || !ZM.z.includes(RB.diver))) RB.diver = null;
    if (!RB.diver && RB.dn < 3) { RB.dWait -= dt; if (RB.dWait <= 0) rbDiverUp(); }
  }
  // the helmets: a carried one dropped where its bearer went down
  for (const hm of RB.helms) if (hm.st === 1) {
    const c = hm.by === FPS.me.id ? FPS.me : FPS.remote.get(hm.by), down = hm.by === FPS.me.id ? (FPS.me.dead > 0 || zmIsDown()) : (!c || c.left || c.dead || c.down);
    if (c) { hm.x = c.x; hm.y = c.y; }
    if (down) { hm.st = 0; hm.by = null; rbClampHelm(hm); }
  }
  // the drowned: up out of the river onto the near bank, and out of the dark at its ends, until the bridge holds
  if (!RB.done) {
    const alive = ZM.z.filter(z => !z.dead && !z.boss).length, cap = RBC.ALIVE + RBC.ALIVE_MORE * Math.max(0, (ZM.hum || []).length - 1);
    RB.spawnT -= dt;
    if (alive < cap && RB.spawnT <= 0) { RB.spawnT = rbSpawnOne() ? 1.1 + Math.random() * 0.9 : 0.5; }
  }
  if (RB.warnT > 0) RB.warnT -= dt;
}
// (everyone, every frame) what happens to me: a plank gone from under my feet; the Cutlass in my hands or not
function rbMe(dt) {
  if (!RB.on) return;
  const m = FPS.me, [lx, ly] = rbL(m.x, m.y);
  if (!(m.dead > 0) && rbInRiver(lx, ly) && (m.jz || 0) < 0.6) {
    const onPlank = rbOnBridge(lx, ly) && rbSegAt(ly) < Math.floor(RB.p + 1e-6);
    if (!onPlank) rbSwept();
  }
  // the Cutlass: in my hands while it's mine, gone from them when it isn't
  const mine = RB.cut === FPS.me.id, have = ZM.own.includes('plimsoll');
  if (mine && !have && !(m.dead > 0) && !zmIsDown()) { ZM.own.push('plimsoll'); m.mags.plimsoll = 0; fpsSwitch('plimsoll'); fpsFeed('You take up the Cutlass of Plimsoll. Nothing else will touch the Divers.'); }
  else if (!mine && have) rbLetGo();
  // in a circle, the brazier's fire keeps your powder dry: your ammunition made up a little at a time
  if (!RB.done && !(m.dead > 0) && (rbInCircle(0, lx, ly) || rbInCircle(1, lx, ly))) {
    RB.ammoT = (RB.ammoT || 0) + dt;
    if (RB.ammoT >= 1) { RB.ammoT = 0; for (const id of ZM.own) { const max = ZM_AMMO[id] || 0; if (max > 0) ZM.res[id] = Math.min(max, (ZM.res[id] || 0) + Math.ceil(max * 0.06)); } }
  }
  if (RB.wait > 0) RB.wait -= dt;
  for (const f of RB.falls) f.t += dt; RB.falls = RB.falls.filter(f => f.t < 2.5);
}
// the Cutlass out of my hands (back to whatever I held before it)
function rbLetGo() {
  const m = FPS.me; if (!ZM.own.includes('plimsoll')) return;
  const was = FPS.weapon === 'plimsoll'; ZM.own = ZM.own.filter(id => id !== 'plimsoll'); if (!ZM.own.length) ZM.own = ['pepperbox'];
  if (was) { FPS.weapon = FPS.last && ZM.own.includes(FPS.last) ? FPS.last : ZM.own[0]; m.ammo = m.mags[FPS.weapon] || 0; FPS.drawT = 0.45; m.cd = 0; }
}
// in the river: it carries you back down to the near bank, and knocks you about doing it
function rbSwept() {
  const m = FPS.me, sx = (Math.random() - 0.5) * 6;
  const [x, y] = rbW(sx, RBC.RY - RBC.RW / 2 - 3.5);
  rbSplash(m.x, m.y, 26);
  m.x = x; m.y = y; m.jz = m.fl = 0; m.vz = 0; zmSettle(m);
  if (!(m.protect > 0)) { m.hp = Math.max(1, m.hp - 1); FPS.hurtT = 0.6; }
  rbSound('splash');
  fpsFeed('The river takes you, and throws you up on the near bank.');
}
function rbSplash(x, y, n) {
  for (let i = 0; i < n; i++) FPS.parts.push({ x: x + (Math.random() - 0.5) * 1.2, y: y + (Math.random() - 0.5) * 1.2, z: FPSC.GROUND + 0.2, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 2 + Math.random() * 3, t: 0.8, c: '150,200,210' });
}

// ---------- the drowned and the Divers ----------
// one of the drowned up onto the near bank: out of the river's edge (away from the bridge), or out of the dark at
// the cavern's sides; never right beside any of you
function rbSpawnOne() {
  const pl = ZM.players || [], h = RBC.RW / 2;
  for (let t = 0; t < 12; t++) {
    const u = Math.random();
    let lx, ly, fromRiver = u < 0.6;
    if (fromRiver) { lx = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 36); ly = RBC.RY - h - 0.9; }
    else if (u < 0.85) { lx = (Math.random() < 0.5 ? -1 : 1) * (RBC.X1 - 2.5); ly = -14 - Math.random() * 34; }
    else { lx = (Math.random() - 0.5) * 60; ly = RBC.Y0 + 2.5; if (Math.abs(lx) < 5) continue; }
    const [x, y] = rbW(lx, ly);
    if (pl.some(p => Math.hypot(p.x - x, p.y - y) < 9)) continue;
    if (typeof zmBlockedAt === 'function' && zmBlockedAt(x, y, 0.5, 0)) continue;
    const z = rbSpawnAt(x, y, fromRiver ? 1.0 : 0.8);
    if (z && fromRiver) rbSplash(x, y + 0.6, 8);
    return !!z;
  }
  return false;
}
// one of the drowned up out of the ground (or the water) at (x, y), already after you: as strong as round LEVEL's,
// quicker than up the Swallow (src/raid.js's helper)
function rbSpawnAt(x, y, rise) {
  const u = Math.random(), kind = u < 0.3 ? 'run' : u < 0.8 ? 'jog' : 'walk';
  return raidSpawnAt(x, y, { kind, hp: zmHp(RBC.LEVEL) * (0.9 + Math.random() * 0.2), rise: rise == null ? 0.8 : rise });
}
// a Diver up out of the river on the far bank, near whoever has the Cutlass
function rbDiverUp() {
  const c = RB.cut === FPS.me.id ? FPS.me : RB.cut ? FPS.remote.get(RB.cut) : null;
  const near = c ? rbL(c.x, c.y)[0] : 0, lx = clamp(near + (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8), RBC.X0 + 4, RBC.X1 - 4);
  if (Math.abs(lx) < RBC.BW) return;
  const [x, y] = rbW(lx, RBC.RY + RBC.RW / 2 + 1.6);
  const T = ZBT.diver, zn = ++ZM.zc, hp = RBC.DHP;
  const z = {
    drowned: true, zm: true, boss: true, bt: 'diver', zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x, y, jz: 0, fl: 0,
    hp, max: hp, sp: T.sp(14), st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 4, swCd: 1, ix: 0, iy: 0, ax: 0, ay: 0, rbd: RB.dn + 1, lx: x, ly: y,
  };
  if (T.init) T.init(z);
  zbMake(z, 'diver');
  z.hp = z.max = RBC.DHP * zbHurtK(z, ZM_DMG.P, null);   // (each cut of the Cutlass takes one of DHP off him: rbHurt)
  ZM.z.push(z); FPS.drowned = ZM.z;
  if (typeof ZB !== 'undefined' && ZB.seen) ZB.seen.add(zn);
  RB.diver = z; RB.dn++;
  rbSplash(x, y - 1, 40);
  rbEvent('diver', RB.dn);
  T.sound('arrive');
}
// (the raid's hurt, on the shooter's side) the Divers here feel nothing but the Cutlass, and every cut of it the
// same (one of RBC.DHP); everything else as it was
function rbHurt(d, dmg, code, by) {
  if (!RB.on || !d.rbd) return dmg;
  if (code !== 'P') {
    if (by === FPS.me.id && RB.warnT <= 0) { RB.warnT = 4; fpsFeed('It glances off his brass. Only the Cutlass of Plimsoll will bite.'); }
    return 0;
  }
  // (a joined player's cuts come to the host already counted, one each, perhaps several together)
  if (by !== FPS.me.id) return dmg;
  if (typeof raidBossDamage === 'function') raidBossDamage(Math.round(d.max / RBC.DHP));
  return 1;
}
// (from zmKill, through the raid's kill hook) a kill in a circle builds the bridge; a Diver drops his helmet
function rbKill(d, by) {
  if (!RB.on) return;
  if (d.rbd) {
    const [lx, ly] = rbL(d.x, d.y), hm = { id: ++RB.hseq, st: 0, x: d.x, y: d.y, by: null, stand: -1 };
    rbClampHelm(hm); RB.helms.push(hm);
    RB.dWait = RBC.DGAP;
    rbEvent('helm', RB.dn);
    return;
  }
  if (RB.done || d.boss) return;
  const [lx, ly] = rbL(d.x, d.y);
  let inC = rbInCircle(0, lx, ly) || rbInCircle(1, lx, ly);
  if (!inC && by) { const k = by === FPS.me.id ? FPS.me : FPS.remote.get(by); if (k) { const [kx, ky] = rbL(k.x, k.y); inC = rbInCircle(0, kx, ky) || rbInCircle(1, kx, ky); } }
  if (inC) { RB.kills++; for (let i = 0; i < 10; i++) FPS.parts.push({ x: d.x, y: d.y, z: FPSC.GROUND + 0.5 + Math.random(), vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, vz: 1 + Math.random() * 2, t: 0.9, c: '255,190,110', up: true }); }
}
// a helmet on the ground: on the far bank, clear of the water
function rbClampHelm(hm) {
  const [lx, ly] = rbL(hm.x, hm.y), [x, y] = rbW(clamp(lx, RBC.X0 + 2, RBC.X1 - 2), Math.max(ly, RBC.RY + RBC.RW / 2 + 1.2));
  hm.x = x; hm.y = y;
}

// ---------- using things ----------
// (from zmNearest) the Cutlass's stone, a helmet to pick up, a stand to set one on, the door
function rbConsider(consider) {
  if (!RB.on) return;
  const [sx, sy] = rbW(...RBC.STONE), mine = RB.cut === FPS.me.id;
  if (!RB.cut || mine) consider({ k: 'rbcut' }, sx, sy, 0, 2.0, false);
  const carrying = RB.helms.some(h => h.st === 1 && h.by === FPS.me.id);
  if (!carrying) for (const hm of RB.helms) if (hm.st === 0) consider({ k: 'rbhelm', id: hm.id }, hm.x, hm.y, 0, 1.9, false);
  if (carrying) RBC.STANDS.forEach(([x, y], i) => { if (RB.placed[i] < 0) { const [wx, wy] = rbW(x, y); consider({ k: 'rbstand', i }, wx, wy, 0, 2.0, false); } });
  if (RB.open) { const [dx, dy] = rbW(...RBC.DOOR); consider({ k: 'rbdoor' }, dx, dy - 1.2, 0, 2.6, false); }
}
function rbPrompt(o) {
  if (o.k === 'rbcut') return RB.wait > 0 ? { text: '…' } : RB.cut === FPS.me.id ? { text: 'Lay the Cutlass of Plimsoll back on its stone', free: true } : { text: 'Take up the Cutlass of Plimsoll', free: true };
  if (o.k === 'rbhelm') return { text: 'Pick up the Diver’s helmet', free: true };
  if (o.k === 'rbstand') return { text: 'Set the helmet on its stand', free: true };
  if (o.k === 'rbdoor') return { text: 'Go through the door, all of you, to the third part', free: true };
  return null;
}
// (from zmUse) true if it was one of these
function rbUse(o) {
  if (!o || !/^rb/.test(o.k)) return false;
  if (RB.wait > 0) return true;
  const a = o.k === 'rbcut' ? (RB.cut === FPS.me.id ? 'drop' : 'take') : o.k === 'rbhelm' ? 'h' + o.id : o.k === 'rbstand' ? 's' + o.i : 'door';
  if (ZM.net === 'client') { RB.wait = 0.6; rbSound('use'); }
  raidAsk(a);
  return true;
}
// (hosting, or alone) what someone asked: the Cutlass taken or laid down, a helmet picked up, one set on a stand,
// the door gone through
function rbReq(sid, a) {
  if (!RB.on) return;
  a = String(a || '');
  const who = sid === FPS.me.id ? FPS.me : FPS.remote.get(sid); if (!who) return;
  const nearTo = (x, y, r) => Math.hypot(who.x - x, who.y - y) < r;
  if (a === 'take') { const [x, y] = rbW(...RBC.STONE); if (!RB.cut && nearTo(x, y, 3)) { RB.cut = sid; rbEvent('take', sid); } return; }
  if (a === 'drop') { if (RB.cut === sid) { RB.cut = null; rbEvent('stone'); } return; }
  if (a[0] === 'h') { const hm = RB.helms.find(h => h.id === (+a.slice(1) | 0)); if (hm && hm.st === 0 && !RB.helms.some(h => h.st === 1 && h.by === sid) && nearTo(hm.x, hm.y, 2.6)) { hm.st = 1; hm.by = sid; rbEvent('pick', sid); } return; }
  if (a[0] === 's') {
    const i = clamp(+a.slice(1) | 0, 0, 2), hm = RB.helms.find(h => h.st === 1 && h.by === sid), [x, y] = rbW(...RBC.STANDS[i]);
    if (!hm || RB.placed[i] >= 0 || !nearTo(x, y, 2.8)) return;
    hm.st = 2; hm.by = null; hm.stand = i; hm.x = x; hm.y = y; RB.placed[i] = hm.id;
    const n = RB.placed.filter(v => v >= 0).length;
    rbEvent('set', n);
    if (n >= 3) rbHolds();
    return;
  }
  if (a === 'door') { if (RB.open) rbOnward(); return; }
}
// the third helmet: the bridge set fast, the door open
function rbHolds() {
  RB.done = true; RB.open = true; RB.p = RBC.SEG; RB.phase = 'done';
  rbSpans(RBC.SEG); rbDoorSolid(true);
  rbEvent('holds');
}
// through the door: on to the raid's next part (src/raid.js), or (with nothing past it yet) the raid's end
function rbOnward() {
  if (RB.gone) return; RB.gone = true;
  if (typeof raidNextStage === 'function') raidNextStage();
  else if (typeof zmEnd === 'function') zmEnd();
}

// ---------- what happened, for everyone ----------
// (hosting or alone) said here, and (hosting) passed on in the snapshot's event list for the others to say the same
function rbEvent(k, a) {
  RB.ev = RB.ev || []; RB.eseq = (RB.eseq || 0) + 1; RB.ev.push([RB.eseq, k, typeof a === 'string' ? rbHumIx(a) : a == null ? -1 : a]); if (RB.ev.length > 8) RB.ev.shift();
  rbSay(k, typeof a === 'string' ? rbHumIx(a) : a);
}
function rbSay(k, a) {
  const nick = rbNick(rbHumAt(a));
  if (k === 'plank') { rbSound('plank'); if (a >= RBC.SEG) { ZM.banner = { text: 'The bridge reaches the far bank', t: 3.2, small: true, col: '#ffd88a' }; fpsFeed('The bridge is across. Take the Cutlass of Plimsoll over, and keep the circles held.'); } }
  else if (k === 'fall') { rbSound('fall'); RB.falls.push({ i: a, t: 0 }); if (!RB.said.fall || g.t - RB.said.fall > 6) { RB.said.fall = g.t; fpsFeed('A circle stands empty: the bridge is falling back into the river!'); } }
  else if (k === 'take') { rbSound('cut'); if (nick !== 'You') fpsFeed(`${nick} takes up the Cutlass of Plimsoll.`); }
  else if (k === 'stone') { rbSound('use'); fpsFeed('The Cutlass of Plimsoll lies back on its stone.'); }
  else if (k === 'divers') { ZM.banner = { text: 'The Divers', t: 3.6, col: '#8affd0', sub: 'only the Cutlass of Plimsoll will hurt them' }; fpsFeed('Something heavy moves in the river by the far bank.'); }
  else if (k === 'diver') { fpsFeed(`The ${['first', 'second', 'third'][clamp(a - 1, 0, 2)]} Diver comes up out of the river, dragging his anchor.`); }
  else if (k === 'helm') { rbSound('helm'); fpsFeed('The Diver goes down, and his brass helmet rolls free. Set it on a stand.'); }
  else if (k === 'pick') rbSound('use');
  else if (k === 'set') { rbSound('set'); ZM.banner = { text: `Helmet ${a} of 3`, t: 2.6, small: true, col: '#8affd0' }; }
  else if (k === 'holds') { rbSound('holds'); ZM.banner = { text: 'The bridge holds', t: 4, col: '#ffd88a', sub: 'the circles can be left: a door has opened on the near bank' }; fpsFeed('The bridge sets fast. Behind the near bank, a door in the rock grinds open.'); }
  else if (k === 'glance') { /* (someone else's shot off a Diver: they're told on their side) */ }
}

// ---------- together ----------
// (host) the stage's snapshot: [hundredths built, circles held (bits), the Cutlass's bearer (place in ZM.hum, -1 on
// its stone), Divers up so far, phase (0 build, 1 divers, 2 done), the door open], the helmets [id, state, x*10,
// y*10, bearer, stand], and what's just happened
function rbPack(z) {
  if (!RB.on || !z) return;
  z.rb = [Math.round(RB.p * 100), (RB.held[0] ? 1 : 0) | (RB.held[1] ? 2 : 0) | (RB.falling ? 4 : 0), RB.cut ? rbHumIx(RB.cut) : -1, RB.dn, ['build', 'divers', 'done'].indexOf(RB.phase), RB.open ? 1 : 0, Math.round(RB.kills)];
  z.rbh = RB.helms.map(h => [h.id, h.st, Math.round(h.x * 10), Math.round(h.y * 10), h.by ? rbHumIx(h.by) : -1, h.stand]);
  if (RB.ev && RB.ev.length) z.rbe = RB.ev.slice(-6);
}
// (joined) as the host has it
function rbApply(hz) {
  if (!RB.on || !Array.isArray(hz.rb)) return;
  const a = hz.rb.map(v => +v || 0);
  RB.p = clamp(a[0] / 100, 0, RBC.SEG); RB.held = [!!(a[1] & 1), !!(a[1] & 2)]; RB.falling = !!(a[1] & 4); RB.holdT = 0;
  RB.cut = a[2] >= 0 ? rbHumAt(a[2]) : null; RB.dn = a[3] | 0; RB.phase = ['build', 'divers', 'done'][a[4]] || 'build';
  RB.kills = a[6] | 0;
  if (a[5] && !RB.open) { RB.open = true; RB.done = true; rbDoorSolid(true); }
  const built = Math.floor(RB.p + 1e-6); if (built !== RB.built) { RB.built = built; rbSpans(built); }
  if (Array.isArray(hz.rbh)) RB.helms = hz.rbh.filter(Array.isArray).slice(0, 3).map(h => ({ id: h[0] | 0, st: h[1] | 0, x: h[2] / 10, y: h[3] / 10, by: h[4] >= 0 ? rbHumAt(h[4]) : null, stand: h[5] | 0 }));
  RB.placed = [-1, -1, -1]; for (const h of RB.helms) if (h.st === 2 && h.stand >= 0) RB.placed[h.stand] = h.id;
  if (Array.isArray(hz.rbe)) for (const e of hz.rbe) if (Array.isArray(e) && e[0] > (RB.evSeen || 0)) { RB.evSeen = e[0]; rbSay(String(e[1]), e[2] | 0); }
}

// ---------- on screen ----------
// top middle: the bridge (a row of planks, lit as they're built), the circles under it (held or empty), and once
// the Divers are up, the three stands
function rbHud(phone0, mono0, fell0) {
  if (!RB.on || ZM.over) return;
  const phone = FPS.touch, s = phone ? 0.75 : 1, cx = W / 2, boss = ZM.z.some(z => z.boss && !z.dead), top = (phone ? Math.max(10, FPS.safeTop || 0) + 52 : 64) + (boss ? 46 * s : 0);
  const fell = px => `400 ${px * s}px "IM Fell English SC", serif`, mono = px => `600 ${px * s}px "Courier Prime", monospace`;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const need = rbNeed(), falling = !!RB.falling;
  const pw = 22 * s, gap = 3 * s, n = RBC.SEG, x0 = cx - (n * pw + (n - 1) * gap) / 2, y = top;
  ctx.font = fell(18); ctx.fillStyle = falling ? `rgba(255,110,80,${0.7 + 0.3 * Math.sin(g.t * 10)})` : 'rgba(236,228,207,0.92)';
  ctx.fillText(RB.done ? 'The bridge holds' : falling ? 'The bridge is falling!' : RB.holdT > 3 && (ZM.hum || []).length <= 1 ? `The circle holds ${RB.holdT} s` : RB.p >= n ? 'The bridge is across' : 'Kill them in the circles', cx, y - 8 * s);
  for (let i = 0; i < n; i++) {
    const f = clamp(RB.p - i, 0, 1), x = x0 + i * (pw + gap);
    ctx.fillStyle = 'rgba(20,24,28,0.7)'; ctx.fillRect(x, y, pw, 10 * s);
    if (f > 0) { ctx.fillStyle = RB.done ? '#ffd88a' : f >= 1 ? '#b8905a' : 'rgba(184,144,90,0.55)'; ctx.fillRect(x, y, pw * f, 10 * s); }
  }
  // the circles
  if (!RB.done && need > 0) {
    for (let i = 0; i < 2; i++) {
      const x = cx + (i ? 1 : -1) * 34 * s, yy = y + 30 * s, on = RB.held[i];
      ctx.beginPath(); ctx.arc(x, yy, 9 * s, 0, 6.283); ctx.lineWidth = 3 * s;
      ctx.strokeStyle = on ? '#ffb070' : 'rgba(255,110,80,0.8)'; ctx.stroke();
      if (on) { ctx.fillStyle = 'rgba(255,176,112,0.5)'; ctx.fill(); }
    }
    ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText(need === 1 ? 'hold a circle' : 'hold both circles', cx, y + 54 * s);
  }
  // the helmets
  if (RB.phase !== 'build' && !RB.done) {
    const yy = y + (need > 0 ? 80 : 32) * s;
    for (let i = 0; i < 3; i++) { const x = cx + (i - 1) * 26 * s; ctx.beginPath(); ctx.arc(x, yy, 8 * s, 0, 6.283); ctx.fillStyle = RB.placed[i] >= 0 ? '#c8a050' : 'rgba(20,24,28,0.7)'; ctx.fill(); ctx.strokeStyle = '#8affd0'; ctx.lineWidth = 1.5 * s; ctx.stroke(); }
    const mine = RB.helms.some(h => h.st === 1 && h.by === FPS.me.id);
    ctx.font = mono(11); ctx.fillStyle = '#8affd0'; ctx.fillText(mine ? 'carrying a helmet' : `Divers ${RB.dn} of 3`, cx, yy + 22 * s);
  }
  ctx.restore();
}

// ---------- sounds ----------
function rbSound(k) {
  try {
    if (soundOff()) return;
    if (k === 'plank') { noise('lowpass', 600, 1, 0.002, 0.25, 0.18); tone(140, 'triangle', 0.003, 0.08, 0.2, { to: 90 }); }
    else if (k === 'fall') { noise('lowpass', 400, 1, 0.01, 0.3, 0.5, { to: 120 }); if (!sfxPlay('splash', { vol: 0.5, vary: 0.1 })) noise('bandpass', 1400, 1, 0.05, 0.2, 0.6, { delay: 0.3 }); }
    else if (k === 'splash') { if (!sfxPlay('splash', { vol: 0.9, vary: 0.05 })) noise('bandpass', 1200, 0.8, 0.01, 0.4, 0.8); }
    else if (k === 'cut') { noise('highpass', 5000, 1, 0.002, 0.12, 0.35, { to: 9000 }); tone(880, 'sine', 0.01, 0.05, 0.9, { to: 1320 }); tone(1320, 'sine', 0.05, 0.03, 0.8); }
    else if (k === 'use') noise('lowpass', 900, 1, 0.002, 0.15, 0.1);
    else if (k === 'helm') { tone(320, 'triangle', 0.002, 0.15, 0.6, { to: 300 }); tone(640, 'sine', 0.002, 0.06, 0.8); }
    else if (k === 'set') { tone(260, 'triangle', 0.002, 0.18, 0.9); tone(390, 'sine', 0.01, 0.08, 1.2); tone(520, 'sine', 0.05, 0.05, 1.4); }
    else if (k === 'holds') { tone(130, 'sawtooth', 0.4, 0.06, 2.4, { to: 196 }); tone(196, 'sine', 0.5, 0.1, 2.6); tone(262, 'sine', 0.9, 0.07, 2.4); noise('lowpass', 250, 1, 0.2, 0.25, 1.6); }
  } catch (e) {}
}

// ---------- in 3D ----------
// the river (a dark ribbon of water, running), the bridge's planks (each built one in place, the falling ones
// dropping into the water), the circles' glow, the Cutlass on its stone, the stands and the helmets, the door
const RB3 = { g: null };
function rb3dBuild(grp) {
  if (typeof THREE === 'undefined') return;
  const g = new THREE.Group(); grp.add(g); RB3.g = g;
  const G0 = FPSC.GROUND, h = RBC.RW / 2, V = (lx, ly, z) => z3v(FPSC.CX + lx, FPSC.CY + ly, G0 + z);
  // the water: a long sheet, a little under the banks, moving east
  const wg = new THREE.PlaneGeometry(RBC.X1 - RBC.X0, RBC.RW, 88, 18); wg.rotateX(-Math.PI / 2);
  const wm = new THREE.MeshPhongMaterial({ color: 0x0c2a34, specular: 0x9ac8d8, shininess: 90, emissive: 0x041418 });
  RB3.wt = { value: 0 };
  wm.onBeforeCompile = sh => {
    sh.uniforms.uT = RB3.wt;
    sh.vertexShader = 'uniform float uT;\nvarying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 w0 = modelMatrix * vec4(position, 1.0); transformed.y += 0.05 * sin(w0.x * 0.7 - uT * 3.0) + 0.03 * sin(w0.z * 1.3 + w0.x * 0.4 - uT * 4.0); }
  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = 'uniform float uT;\nvarying vec3 vWp;\n' + sh.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  { vec2 p = vWp.xz; vec2 gr = 0.12 * cos(p.x * 0.9 - uT * 3.5 + sin(p.y * 0.6) * 2.0) * vec2(0.9, 0.0) + 0.07 * cos(dot(p, vec2(1.7, 1.1)) - uT * 4.2) * vec2(1.7, 1.1) + 0.04 * cos(dot(p, vec2(-3.1, 2.3)) - uT * 5.0) * vec2(-3.1, 2.3);
    normal = normalize((viewMatrix * vec4(normalize(vec3(-gr.x, 1.0, -gr.y)), 0.0)).xyz); }`);
  };
  const water = new THREE.Mesh(wg, wm); water.position.copy(V((RBC.X0 + RBC.X1) / 2, RBC.RY, 0.05)); g.add(water);
  // the banks' edges: a dark lip of wet stone either side, and the river's bed dark under the water
  const lip = z3Lam('#2a2c2e'), wet = z3Lam('#15181a');
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(RBC.X1 - RBC.X0, 0.5, 0.7), lip); b.position.copy(V((RBC.X0 + RBC.X1) / 2, RBC.RY + s * (h + 0.1), 0.05)); g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(RBC.X1 - RBC.X0, 1.4, 0.3), wet); c.position.copy(V((RBC.X0 + RBC.X1) / 2, RBC.RY + s * (h - 0.2), -0.95)); g.add(c);
  }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(RBC.X1 - RBC.X0, 0.1, RBC.RW), z3Lam('#05090b')); bed.position.copy(V((RBC.X0 + RBC.X1) / 2, RBC.RY, -1.6)); g.add(bed);
  // the bridge's planks: each span a deck of boards on two stringers, a rope rail either side
  const wood = z3Lam('#6a4a2c'), wood2 = z3Lam('#4a3220'), rope = z3Lam('#8a7a5a');
  RB3.planks = [];
  for (let i = 0; i < RBC.SEG; i++) {
    const p = new THREE.Group(), ly = RBC.RY - h + (i + 0.5) * RBC.SL; p.position.copy(V(0, ly, 0)); g.add(p);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(RBC.BW, 0.09, RBC.SL / 4 - 0.05), k % 2 ? wood : wood2); b.position.set(0, 0.05, (k - 1.5) * RBC.SL / 4); b.rotation.z = (k % 3 - 1) * 0.015; p.add(b); }
    for (const s of [-1, 1]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, RBC.SL), wood2); st.position.set(s * (RBC.BW / 2 - 0.3), -0.1, 0); p.add(st);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), wood2); post.position.set(s * (RBC.BW / 2 - 0.05), 0.55, RBC.SL / 2 - 0.1); p.add(post);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, RBC.SL, 5), rope); r.rotation.x = Math.PI / 2; r.position.set(s * (RBC.BW / 2 - 0.05), 0.95, 0); p.add(r);
    }
    RB3.planks.push(p);
  }
  // the circles: a ring of fire-lit light on the ground, bright while someone stands in it
  RB3.rings = [];
  for (const s of [-1, 1]) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const r = new THREE.Mesh(new THREE.RingGeometry(RBC.CR - 0.18, RBC.CR, 48), m); r.rotation.x = -Math.PI / 2; r.position.copy(V(s * RBC.CX, RBC.CY, 0.04)); g.add(r);
    const fm = new THREE.MeshBasicMaterial({ color: 0xff9050, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const f = new THREE.Mesh(new THREE.CircleGeometry(RBC.CR - 0.18, 40), fm); f.rotation.x = -Math.PI / 2; f.position.copy(V(s * RBC.CX, RBC.CY, 0.035)); g.add(f);
    RB3.rings.push({ m, fm });
  }
  // the Cutlass's stone, and the Cutlass in it, point down
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), z3Lam('#4a4c50')); stone.scale.set(1.2, 0.7, 1); stone.position.copy(V(RBC.STONE[0], RBC.STONE[1], 0.35)); g.add(stone);
  RB3.cut = rb3dCutlass(); RB3.cut.position.copy(V(RBC.STONE[0], RBC.STONE[1], 1.3)); RB3.cut.rotation.set(Math.PI, 0.6, 0); g.add(RB3.cut);
  RB3.cutGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(127,216,255,0.8)', 'rgba(127,216,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
  RB3.cutGlow.scale.setScalar(2.2); RB3.cutGlow.position.copy(V(RBC.STONE[0], RBC.STONE[1], 1.4)); g.add(RB3.cutGlow);
  // the stands: an iron post on a stone foot, a cradle on top
  const iron = z3Lam('#2a2e31'), sf = z3Lam('#5a5850');
  for (const [x, y] of RBC.STANDS) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 10), sf); f.position.copy(V(x, y, 0.2)); g.add(f);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.2, 8), iron); p.position.copy(V(x, y, 1.0)); g.add(p);
    const c = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 16), iron); c.rotation.x = Math.PI / 2; c.position.copy(V(x, y, 1.62)); g.add(c);
  }
  // the helmets: built as needed
  RB3.helms = [];
  // the door: a slab of dark iron, studded, with a glow at its seams; it sinks into the floor when it opens
  const dm = z3Lam('#2a2430'), dg = new THREE.Group(); dg.position.copy(V(RBC.DOOR[0], RBC.DOOR[1] + 0.2, 0)); g.add(dg);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 0.4), dm); slab.position.y = 1.7; dg.add(slab);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const st = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), iron); st.position.set(-1.1 + j * 1.1, 0.6 + i * 0.8, 0.21); dg.add(st); }
  RB3.doorGlowM = new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.6), RB3.doorGlowM); seam.position.set(0, 1.7, 0.25); dg.add(seam);
  RB3.door = dg; RB3.doorK = 0;
  RB3.fallen = [];
  // the cavern's roof, black, high over it all, and the glow-worms hanging from it, a faint green-blue
  const W = RBC.X1 - RBC.X0 + 30, D = RBC.Y1 - RBC.Y0 + 30, roof = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: 0x030405, side: THREE.DoubleSide }));
  roof.rotation.x = Math.PI / 2; roof.position.copy(V((RBC.X0 + RBC.X1) / 2, (RBC.Y0 + RBC.Y1) / 2, 16)); g.add(roof);
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = V(RBC.X0 + Math.random() * (RBC.X1 - RBC.X0), RBC.Y0 + Math.random() * (RBC.Y1 - RBC.Y0), 9 + Math.random() * 6.5); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  RB3.worms = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7affd8, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  g.add(RB3.worms);
}
// the Cutlass of Plimsoll, as it lies on its stone and on the stands' bank (a simple model; the one in your hands is
// VM_BUILD.plimsoll)
function rb3dCutlass() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.012), new THREE.MeshPhongMaterial({ color: 0x9fc4d0, specular: 0xffffff, shininess: 120, emissive: 0x0a2a38 }));
  blade.position.y = 0.5; g.add(blade);
  for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 3), z3Lam('#e8e2d0')); t.rotation.z = -Math.PI / 2; t.position.set(0.045, 0.12 + i * 0.09, 0); g.add(t); }
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14, Math.PI), z3Lam('#b89a50')); guard.position.y = 0.02; g.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.18, 8), z3Lam('#5a6870')); grip.position.y = -0.08; g.add(grip);
  return g;
}
function rb3dHelmet() {
  const g = new THREE.Group(), brass = new THREE.MeshPhongMaterial({ color: 0xb88a3a, specular: 0xffe0a0, shininess: 80 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), brass); dome.position.y = 0.3; g.add(dome);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.12, 14), brass); collar.position.y = 0.04; g.add(collar);
  const port = new THREE.MeshBasicMaterial({ color: 0x8affd0 });
  for (const [a, y] of [[0, 0.32], [Math.PI / 2, 0.3], [-Math.PI / 2, 0.3]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), port); p.position.set(Math.sin(a) * 0.29, y, Math.cos(a) * 0.29); p.rotation.y = a; g.add(p); const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12), brass); r.position.copy(p.position); r.rotation.y = a; g.add(r); }
  return g;
}
// (each frame) the water running, the planks, the rings, the Cutlass, the helmets, the door
function rb3dTick(dt) {
  if (!RB.on || !RB3.g) return;
  RB3.wt.value += dt;
  // under the ground: dark, a little light from the braziers and the lamps, and the fog close and black
  if (typeof GL3D !== 'undefined') { GL3D.amb.intensity = 0.16; GL3D.moon.intensity = 0.03; if (GL3D.scene.fog) { const F = GL3D.scene.fog; F.color.setRGB(0.012, 0.018, 0.022); F.near = 10; F.far = 80; RAID.fog0 = true; } }
  if (RB3.worms) RB3.worms.material.opacity = reduceMotion ? 0.7 : 0.6 + 0.2 * Math.sin(g.t * 0.7);
  const built = Math.floor(RB.p + 1e-6), part = RB.p - built, t = g.t;
  RB3.planks.forEach((p, i) => {
    const f = i < built ? 1 : i === built ? part : 0;
    p.visible = f > 0.02;
    p.scale.set(1, 1, Math.max(0.02, f)); p.position.y = FPSC.GROUND + (i < built ? 0 : -0.15 * (1 - f));
    p.rotation.x = 0; p.rotation.z = 0;
  });
  // the falling ones: a copy of the plank dropping into the water and away downstream
  for (const f of RB.falls) {
    if (!f.m) { const src = RB3.planks[clamp(f.i, 0, RBC.SEG - 1)]; f.m = src.clone(); f.m.scale.set(1, 1, 1); f.m.visible = true; RB3.g.add(f.m); f.y0 = src.position.y; f.x0 = src.position.x; RB3.fallen.push(f.m); }
    const k = f.t; f.m.position.y = f.y0 - Math.min(1.8, k * k * 2.5); f.m.position.x = f.x0 + k * 3; f.m.rotation.z = k * 0.6; f.m.rotation.x = Math.sin(k * 2) * 0.3;
    if (k > 2.4) f.m.visible = false;
  }
  while (RB3.fallen.length > 12) { const m = RB3.fallen.shift(); RB3.g.remove(m); }
  // the circles: bright and flickering while held, a slow red pulse while empty and needed
  const need = rbNeed();
  RB3.rings.forEach((r, i) => {
    const on = RB.held[i], want = !RB.done && need > 0;
    r.m.color.set(on || !want ? 0xffb070 : 0xff5040);
    r.m.opacity = RB.done ? 0.15 : on ? 0.75 + 0.15 * Math.sin(t * 9 + i) : 0.25 + 0.2 * Math.sin(t * 3);
    r.fm.opacity = on && !RB.done ? 0.16 : 0.04;
  });
  // the Cutlass: on its stone while nobody has it
  RB3.cut.visible = RB3.cutGlow.visible = !RB.cut;
  RB3.cutGlow.material.opacity = 0.45 + 0.2 * Math.sin(t * 2.5);
  // the helmets: on the ground, on a stand, or carried at the bearer's side
  while (RB3.helms.length < RB.helms.length) { const m = rb3dHelmet(); RB3.g.add(m); RB3.helms.push(m); }
  RB3.helms.forEach((m, i) => {
    const hm = RB.helms[i]; m.visible = !!hm; if (!hm) return;
    let z = 0, x = hm.x, y = hm.y;
    if (hm.st === 2) z = 1.55;
    else if (hm.st === 1) { const c = hm.by === FPS.me.id ? null : FPS.remote.get(hm.by); if (!c) { m.visible = false; return; } x = c.x; y = c.y; z = (c.jz || 0) + 1.0; }
    m.position.copy(z3v(x, y, FPSC.GROUND + z)); m.rotation.y = hm.st === 2 ? Math.PI : t * 0.3 + i;
  });
  // the door: sinking into the floor once it's open
  RB3.doorK = RB.open ? Math.min(1, RB3.doorK + dt / 3) : 0;
  RB3.door.position.y = FPSC.GROUND - RB3.doorK * 3.5;
  RB3.doorGlowM.opacity = RB.open ? 0.6 + 0.3 * Math.sin(t * 3) : 0.12;
}

// ---------- the Cutlass of Plimsoll in your hands ----------
// the ordinary cutlass's blade, guard and grip in sea-blue steel, sharkskin and old brass, a row of the shark's teeth
// set along its edge, and a faint glow of the deep in its fuller
VM_PLAIN.plimsoll = { metal: '#9fc4d0', dark: '#1c3a46', wood: '#5a6870', brass: '#b89a50', accent: '#7fd8ff', glow: '#3ab8e8' };
VM_BUILD.plimsoll = (M) => {
  const w = VM_BUILD.cutlass(M);
  const tooth = new THREE.MeshPhongMaterial({ color: 0xe8e2d0, specular: 0xffffff, shininess: 60 });
  for (let i = 0; i < 11; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.024, 3), tooth), y = 0.06 + i * 0.05;
    t.rotation.z = Math.PI / 2 + 0.25; t.position.set(-0.02 - 0.012 * Math.sin(y * 4), y, 0); w.sword.add(t);
  }
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.42, 0.009), M.accent); glow.position.set(0.006, 0.26, 0); w.sword.add(glow);
  w.trail = true;
  return w;
};
VM_ANIM.plimsoll = (w, S) => VM_ANIM.cutlass(w, S);

// ---------- the raid's second part (src/raid.js) ----------
RAID_STAGES.bridge = {
  n: 'The Black Water', mend: true, map: { start: RBC.START.slice(), top: 0, zones: {}, nav: [RBC.X0 + 1, RBC.X1 - 1, RBC.Y0 + 1, RBC.Y1 - 1] },
  set: (H, K, Z) => rbSet(H, K, Z), enter() { rbReset(); }, exit() { RB.on = false; RB3.g = null; rbLetGo(); },
  tick: dt => rbTick(dt), me: dt => rbMe(dt), kill: (d, how, by) => rbKill(d, by), hurt: (d, dmg, code, by) => rbHurt(d, dmg, code, by),
  q: (sid, k) => rbReq(sid, k), pack: o => rbPack(o), apply: o => rbApply(o),
  consider: c => rbConsider(c), prompt: o => rbPrompt(o), use: o => rbUse(o),
  hud: (phone, mono, fell) => rbHud(phone, mono, fell), b3: grp => rb3dBuild(grp), f3: dt => rb3dTick(dt),
};
if (!RAID_ORDER.includes('bridge')) RAID_ORDER.splice(Math.max(0, RAID_ORDER.indexOf('descent')) + 1, 0, 'bridge');
