'use strict';
// The Chronicle of the Light, mission 15 (The Nine Holes): its three stages, and its boss. The course, the ball, the
// swing and the keepers are src/cpm15.js's; each stage here is wired to them by m15Stage (the ball's use, its word in
// the host's, its 3D and HUD), and adds its own:
//  - The Laying Out (cp_m15lay): the 1st, the 2nd and the 3rd, in the afternoon sun. On the 3rd, once the tee shot
//    is down, men stand up in the cove's shallows (m15_cove), and come up the shingle: the ball waits (G.lock) until
//    every one of them is put back (6 + 3 a head, a few at a time). Hole the 3rd and the stage is done.
//  - The Chasm (cp_m15chasm): dusk into moonlight on the 7th and the 8th. Now and then one comes up over the south
//    cliffs. The first strike over the gully on the 8th wakes it (m15_gully): the lost balls shine in the water and
//    the drowned climb out of both lips, quicker as the night comes on, until the 8th is holed. And they want the
//    ball: the first two times it comes to rest after that, one comes up beside it, takes it, and makes for the
//    nearest lip of the gully with it (a thief, C15T). Put it down and the ball drops where it falls; let it reach
//    the chasm and it goes in with the ball, and a new one is dropped on the green side for a stroke.
//  - Homeward Cliff (cp_m15home): night by the tar pot on the 9th. Three barrels on the ledges under the east cliff,
//    out of anyone's reach; burning balls struck from the pot light them (one coming down within C15F.HIT of a
//    barrel), and kill any of the drowned they come down on. The brig closes on the point the whole time (S.brig, 0
//    to 1: full and the mission is lost), slower for every barrel alight. All three lit, she goes about (m15_turn),
//    and the Chasm Crab comes up out of the gully. A burning ball on it hurts it badly. Once it's down, Pellow
//    reaches the Light and it comes on, and the stage is done.
// Together: host-authoritative, each stage's state in its word (m15s), the ball's in src/cpm15.js's (m15g).

const C15F = { TEE: [47.6, -9.6], POT: [47.2, -7.2], HIT: 4.6, BURN_R: 3.4, BOSS_R: 3.6, BRIG_T: 170, BARRELS: [[80, -36], [87, 2], [77, 42]], LEVEL: 4 };
const C15T = { N: 2, SP: 2.1, HP: 2.2, AT: 0.8 };   // (the thieves on the 8th: how many, their pace, strength, and how soon after the ball stops)
const C15_COVE = [[-78, -40], [-72, -32], [-66, -29], [-60, -31], [-55, -38]];   // (where they come up the cove's shingle)

// ---------- every stage's wiring to the course ----------
function m15Stage(key, D) {
  const S0 = () => RAID.st;
  return cpStage(key, Object.assign({}, D, {
    mend: true,
    block(x, y) { return m15Block(x, y) || (D.block ? D.block(x, y) : false); },
    enter() {
      M15SW.hold = M15SW.pw = 0; M15SW.was = false; M15SW.aim = null; M15SW.pend = 0;
      Object.assign(RAID.st, { m15: key, lit: 0, said: {}, spT: 4, pend: 0 });
      if (D.face != null) FPS.me.h = D.face;
      ZM.round = Math.max(ZM.round, C15F.LEVEL);
      if (D.enter) D.enter();
    },
    tick(dt) { if (S0().m15 !== key) return; if (!cpCineOn()) m15GolfTick(dt); if (D.tick) D.tick(dt); },
    me(dt) { if (S0().m15 !== key) return; m15SwingMe(dt); if (S0().pend > 0) S0().pend -= dt; if (D.me) D.me(dt); },
    q(sid, k, a) { if (m15GolfQ(sid, k, a)) return; if (D.q) D.q(sid, k, a); },
    pack(o) { m15GolfPack(o); o.m15lit = S0().lit ? 1 : 0; if (D.pack) D.pack(o); },
    apply(o) { m15GolfApply(o); S0().lit = o.m15lit | 0; if (D.apply) D.apply(o); },
    consider(c) { m15GolfConsider(c); if (D.consider) D.consider(c); },
    prompt(o) { return m15GolfPrompt(o) || (D.prompt ? D.prompt(o) : null); },
    use(o) { return m15GolfUse(o) || (D.use ? D.use(o) : false); },
    hud(phone, mono, fell) { m15GolfHud(phone, mono, 0); if (D.hud) D.hud(phone, mono, fell); },
    b3(grp) { m15Course3d(grp, D.c3); m15NpcBuild(grp, D.ppl || []); if (D.b3) D.b3(grp); },
    f3(dt) { const k = M15SKY.over != null && cpCineOn() ? M15SKY.over : D.sky ? D.sky() : 0; m15Sky(k); m15Course3dTick(dt, clamp((k - 0.45) * 2.2, 0, 1)); m15NpcTick(dt, D.spots ? D.spots() : m15NpcSpots(m15G()), k > 0.6); if (D.f3) D.f3(dt); },
    exit() { m15NpcFree(); M15_3D.on = false; if (D.exit) D.exit(); },
  }));
}
const m15N = () => Math.max(1, ZM.hum.length);
const m15Alive = () => ZM.z.filter(z => !z.dead && !z.boss).length;
// (hosting) one of them up out of the ground at local (x, y)
function m15Rise(x, y, kind, k) {
  const [wx, wy] = cpkW(x, y), n = m15N(), u = Math.random();
  const z = raidSpawnAt(wx, wy, { kind: kind || (u < 0.14 ? 'run' : u < 0.7 ? 'jog' : 'walk'), hp: zmHp(C15F.LEVEL) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)) * (k || 1), rise: 1.4 });
  if (z) zmSound('moan', Math.hypot(wx - FPS.me.x, wy - FPS.me.y), fpsEar(wx, wy), z.kind);
  return z;
}
// (hosting) a spot on the cliff top, somewhere on the arc a0..a1 (radians, 0 east, anticlockwise), clear of anyone
function m15CliffSpot(a0, a1) {
  for (let t = 0; t < 14; t++) { const a = a0 + Math.random() * (a1 - a0), r = CP15.R - 4, x = Math.cos(a) * r, y = Math.sin(a) * r; if (m15Wet(x, y) && m15Wet(x, y) !== 'sea') continue; const [wx, wy] = cpkW(x, y); if (cpkNear(wx, wy, 9)) continue; return [x, y]; }
  return null;
}
function m15Flash() { for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); }
function m15Say(S, k, ...L) { if (S.said[k]) return; S.said[k] = 1; cpSay(...L); }
// (hosting) the objective for the ball as it lies
function m15GolfObj(extra) {
  const G = m15G(); if (!G) return;
  const Hh = C15_HOLES[G.hi], h = `The ${m15Ord(G.hi + 1)}, ${Hh.n} (par ${Hh.par})`;
  cpObjective(extra || (G.st === 'green' ? `${h}: putt out` : G.st === 'holed' ? `${h}: holed` : G.lie === 'tee' ? `${h}: drive at the flag (hold Use at the ball, let go to strike)` : `${h}: play on to the green`));
}

// ---------- I. The Laying Out ----------
m15Stage('m15lay', {
  n: 'The Laying Out', map: m15Map([-19, 60]), face: Math.atan2(-30, -18), ppl: ['holm', 'pell', 'maren'],
  music: () => RAID.st.ph === 'cove' ? 'cpm15gully' : 'cpm15links',
  sky() { const G = m15G(), S = RAID.st; return clamp((G ? G.hi * 0.12 : 0) + (S.ph === 'cove' || S.ph === 'end' ? 0.12 : 0) + (S.endT || 0) * 0.02, 0, 0.42); },
  enter() {
    Object.assign(RAID.st, { ph: 'golf', cove: 0, coveN: 0, coveDone: false, nextT: 0, endT: 0 });
    if (ZM.net === 'client') return;
    m15GolfNew(0); m15GolfObj(); m15GolfWay();
    if ((CP.debug ? CP.debug.stage | 0 : CP.from | 0) > 0) return;   // (a checkpoint further on: this stage is only passed through)
    cpSay('holm', 'The first tee. One ball between the lot of us, as keepers play it. Strike when you are ready.', 'cp_m15_10');
  },
  tick(dt) {
    const S = RAID.st, G = m15G(), n = m15N(); if (!G || cpCineOn()) return;
    if (S.ph === 'golf') { m15GolfWay(); m15GolfObj(); }
    if (S.nextT > 0) { S.nextT -= dt; if (S.nextT <= 0) m15LayNext(); }
    if (G.hi === 1 && G.n >= 1 && G.st === 'rest' && G.lie !== 'tee') m15Say(S, 'creek', 'm15pell', 'Mind the creek. It takes a ball as quick as the sea does, and gives it back as seldom.', 'cp_m15_13');
    if (S.ph === 'cove') {
      // (the cove's men: up the shingle a few at a time, until every one of them is put back)
      const tot = 6 + 3 * n, alive = m15Alive();
      S.spT -= dt;
      if (S.coveN < tot && S.spT <= 0 && alive < 3 + 2 * n) { S.spT = (2.6 + Math.random()) / Math.sqrt(n); const [x, y] = C15_COVE[(Math.random() * C15_COVE.length) | 0]; m15Rise(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 2, Math.random() < 0.6 ? 'walk' : 'jog'); S.coveN++; }
      if (S.coveN >= 4 && alive > 0) m15Say(S, 'cove2', 'holm', 'Keep them off the green! Back into the water with them!', 'cp_m15_17');
      if (S.coveN >= tot && alive === 0) {
        S.ph = 'golf'; S.coveDone = true; G.lock = false; m15GolfObj(); cpEvent('m15covedone');
        cpSay('maren', 'They went back in the way they came. Holm, they went back in walking.', 'cp_m15_18');
        cpSay('holm', 'We will finish the hole. I want to be off this side of the headland before the sun is down.', 'cp_m15_19');
      }
    }
    if (S.ph === 'end') { S.endT += dt; if (S.endT > 2.5) cpDone(); }
  },
  m15landed(G) { const S = RAID.st; if (G.hi === 2 && !S.cove && S.ph === 'golf') m15LayCove(); if (G.hi === 0 && G.n === 1 && G.lie !== 'green') m15Say(S, 'first', 'm15pell', 'Struck! Not far off a keeper’s drive, that.', 'cp_m15_11'); },
  m15holed(G) {
    const S = RAID.st;
    if (G.hi === 2 && !S.cove) { m15LayCove(); return; }
    if (G.hi === 2 && !S.coveDone) return;
    S.nextT = 2.2; m15GolfObj();
  },
  pack(o) { const S = RAID.st; o.m15s = [['golf', 'cove', 'end'].indexOf(S.ph), S.coveN | 0, S.coveDone ? 1 : 0, Math.round((S.endT || 0) * 10)]; },
  apply(o) { const S = RAID.st, a = o.m15s; if (!Array.isArray(a)) return; S.ph = ['golf', 'cove', 'end'][a[0]] || 'golf'; S.coveN = a[1] | 0; S.coveDone = !!a[2]; S.endT = (a[3] | 0) / 10; },
  hud(phone, mono) { const S = RAID.st, tot = 6 + 3 * m15N(); if (S.ph === 'cove') cplBar(phone, mono, `UP OUT OF THE COVE · PUT BACK ${Math.max(0, S.coveN - m15Alive())} OF ${tot}`, (S.coveN - m15Alive()) / tot, 1.4, '#9fc8d8'); },
});
// (host) on to the next hole, or, the 3rd holed, the stage's end
function m15LayNext() {
  const S = RAID.st, G = m15G(); if (!G) return;
  if (G.hi >= 2) { if (S.coveDone) { S.ph = 'end'; S.endT = 0; cpObjective(''); cpWaypoint(null); cpSay('holm', 'Three holes laid out, and the light going. Come on. The rest of them are along the cliffs.', 'cp_m15_20'); } return; }
  const hi = G.hi + 1; m15GolfNew(hi); m15GolfObj(); m15GolfWay();
  if (hi === 1) cpSay('holm', 'The Long Road. Five to the green if you play it like a Christian, and the creek across the middle of it.', 'cp_m15_12');
  if (hi === 2) cpSay('maren', 'Down to the cove, this one. Keep it left, and keep it out of the water.', 'cp_m15_14');
}
function m15LayCove() {
  const S = RAID.st, G = m15G(); S.cove = 1; S.ph = 'cove'; S.coveN = 0; S.spT = 1.5; if (G) G.lock = true;
  cpObjective(''); cpWaypoint(null);
  cpCine('m15_cove', () => { cpObjective('Men up out of the cove: put them back in it'); cpWaypoint(-64, -34, 'The cove', 0.6); ZM.banner = { text: 'Up out of the cove', t: 3.6, sub: 'with the sun still in the sky', col: '#cfe0e8' }; });
}
cpOn('m15covedone', () => { ZM.banner = { text: 'The cove is still', t: 3, sub: 'finish the hole', col: '#e8f0c0' }; });

// ---------- II. The Chasm ----------
m15Stage('m15chasm', {
  n: 'The Chasm', map: m15Map([-16, -52]), face: Math.atan2(15, -18), ppl: ['holm', 'maren'], c3: { gully: true },
  music: () => RAID.st.ph === 'gully' ? 'cpm15gully' : 'cpm15dusk',
  sky() { return 0.62 + 0.34 * clamp((RAID.ct || RAID.t) / 160, 0, 1); },
  enter() {
    Object.assign(RAID.st, { ph: 'point', woke: 0, endT: 0, gT: 0, nextT: 0, th: '', thN: 0, thT: 0, thTo: null });
    if (ZM.net === 'client') return;
    m15GolfNew(6); m15GolfObj(); m15GolfWay();
    cpSay('holm', 'The Point. A little three, and the sea on every side of it but the one you stand on.', 'cp_m15_30');
  },
  tick(dt) {
    const S = RAID.st, G = m15G(), n = m15N(); if (!G || cpCineOn()) return;
    if (S.ph !== 'end') { m15GolfWay(); m15GolfObj(G.st === 'held' ? 'One of them has the ball: put it down before it reaches the chasm' : S.ph === 'gully' && G.st !== 'green' ? 'The 8th, The Chasm: get it holed while they come up out of the gully' : null); }
    if (S.nextT > 0) { S.nextT -= dt; if (S.nextT <= 0) { m15GolfNew(7); m15GolfObj(); m15GolfWay(); S.ph = 'chasm'; cpSay('holm', 'The Chasm. Over the gully with your second, and do not go looking for what goes in.', 'cp_m15_33'); } }
    // (now and then, one up over the south cliffs; then out of the chasm itself, quicker as the night comes on)
    S.spT -= dt;
    if (S.ph === 'point' || S.ph === 'chasm') {
      if (S.spT <= 0) { S.spT = (10 + Math.random() * 4) / Math.sqrt(n); if (m15Alive() < 1 + n) { const at = m15CliffSpot(-2.4, -0.9); if (at) m15Rise(...at, 'walk'); } }
      if ((RAID.t > 25 || m15Alive()) && S.ph === 'point') m15Say(S, 'rocks', 'maren', 'Something is climbing the rocks below the point. I can hear it on the weed.', 'cp_m15_31');
    } else if (S.ph === 'gully') {
      S.gT += dt; const k = clamp(S.gT / 120, 0, 1);
      if (S.spT <= 0) {
        S.spT = (2.4 - 1.0 * k) * (0.75 + Math.random() * 0.5) / Math.sqrt(1 + 0.5 * (n - 1));
        if (m15Alive() < Math.round(4 + 2 * n + 2 * k)) { const side = Math.random() < 0.5, [g0, g1] = CP15.GULLY, y = -76 + Math.random() * 50, x = side ? g0 - 1.8 : g1 + 1.8, [wx, wy] = cpkW(x, y); if (!cpkNear(wx, wy, 5)) m15Rise(x, y, Math.random() < 0.15 + 0.2 * k ? 'run' : 'jog'); }
      }
      if (S.gT > 30) m15Say(S, 'g1', 'holm', 'Round the head of the gully! You will not jump it, and you will not want to swim it.', 'cp_m15_37');
      if (S.gT > 75) m15Say(S, 'g2', 'maren', 'There are more of them every time it surges. Finish it, love. Finish the hole.', 'cp_m15_38');
    }
    if (S.ph === 'gully') m15ThiefTick(dt);
    if (S.ph === 'end') { S.endT += dt; if (S.endT > 3) cpDone(); }
  },
  m15struck(G) { const S = RAID.st; if (G.hi === 7 && !S.woke) S.woke = 1; },
  // (the first ball into the 8th's cup before the gully has woken comes back out of it, wet)
  m15cup(G) { const S = RAID.st; if (G.hi !== 7 || S.woke >= 2) return true; cpSay('maren', 'It went in. It went in, and it has come up out of the cup again. Wet.', 'cp_m15_75'); return false; },
  m15landed(G, x, y, wet) {
    const S = RAID.st;
    if (wet === 'chasm' || wet === 'sea') m15Say(S, 'lost' + G.hi, 'holm', wet === 'chasm' ? 'Leave it. Nobody goes looking for a ball on the 8th.' : 'Gone. The sea keeps what it is given.', wet === 'chasm' ? 'cp_m15_34' : 'cp_m15_32');
    if (G.hi === 7 && S.woke === 1) { S.woke = 2; m15Wake(); return; }
    if (G.hi === 7 && S.ph === 'gully' && !wet && S.thN < C15T.N && (G.st === 'rest' || G.st === 'green')) { S.thT = C15T.AT; G.lock = true; }
  },
  m15holed(G) {
    const S = RAID.st;
    if (G.hi === 6) { S.nextT = 2.4; return; }
    if (G.hi === 7 && S.woke === 1) { S.woke = 2; }
    if (G.hi === 7) { S.ph = 'end'; S.endT = 0; m15Flash(); cpObjective(''); cpWaypoint(null); cpEvent('m15gullydone'); cpSay('holm', 'Holed. And listen: they have gone back down. Every one of them, like a tide going out.', 'cp_m15_39'); }
  },
  pack(o) { const S = RAID.st; o.m15s = [['point', 'chasm', 'gully', 'end'].indexOf(S.ph), Math.round((S.gT || 0) * 10), S.th || '']; },
  apply(o) { const S = RAID.st, a = o.m15s; if (!Array.isArray(a)) return; S.ph = ['point', 'chasm', 'gully', 'end'][a[0]] || 'point'; S.gT = (a[1] | 0) / 10; S.th = String(a[2] || ''); },
  hud(phone, mono) { const z = m15ThiefZ(); if (z) { c9Mark(z.x, z.y, 2.2, 'It has the ball', phone, mono); cplBar(phone, mono, 'ONE OF THEM HAS THE BALL · PUT IT DOWN', z.hp / z.max, 1.4, '#ff9a7a'); } },
  f3(dt) { m15Skiff(clamp((RAID.ct || RAID.t) / 400, 0, 0.3)); },
  b3(grp) { m15Skiff3d(grp); },
});
// (host) the first strike over the gully: it wakes
function m15Wake() {
  const S = RAID.st, G = m15G(); if (G) G.lock = true; cpObjective(''); cpWaypoint(null);
  cpCine('m15_gully', () => { S.ph = 'gully'; S.gT = 0; S.spT = 1; if (G) { G.lock = false; if (G.st === 'rest' && G.lie !== 'tee' || G.st === 'green') { S.thT = 0.3; G.lock = true; } } m15GolfObj(); m15GolfWay(); ZM.banner = { text: 'Up out of the chasm', t: 3.6, sub: 'hole the 8th: go round the head of the gully', col: '#9fe8d8' }; });
}
// (host) a thief: up beside the ball, takes it, and makes for the nearest lip of the gully
const m15ThiefZ = () => { const id = RAID.st && RAID.st.th; return id ? ZM.z.find(z => z.id === id && !z.dead) || null : null; };
function m15ThiefTick(dt) {
  const S = RAID.st, G = m15G(); if (!G) return;
  if (S.thT > 0 && !S.th) { S.thT -= dt; if (S.thT <= 0) { if ((G.st === 'rest' || G.st === 'green') && G.lie !== 'tee') m15ThiefUp(); else G.lock = false; } }
  if (!S.th) return;
  const z = ZM.z.find(q => q.id === S.th);
  if (!z || z.dead) {
    // (put down: the ball drops where it fell, back from the water if need be)
    let x = z ? z.x - FPSC.CX : G.x, y = z ? z.y - FPSC.CY : G.y; for (let k = 0; k < 10 && m15Wet(x, y); k++) x += x > 19.5 ? 0.8 : -0.8;
    S.th = ''; G.x = x; G.y = y; G.lie = m15Lie(G.hi, x, y); G.st = G.lie === 'green' ? 'green' : 'rest'; G.lock = false;
    cpEvent('m15thief', 0); m15Say(S, 'thd' + S.thN, 'holm', 'Down! And it dropped the ball. Play it where it lies.', 'cp_m15_71'); m15GolfWay(); return;
  }
  // (running for the lip: our own pace, not theirs)
  const [tx, ty] = cpkW(...S.thTo), dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy);
  z.sp = 0.01; z.h = Math.atan2(dx, dy);
  if (d > 0.4) { const v = Math.min(d, C15T.SP * dt); z.x += dx / d * v; z.y += dy / d * v; }
  G.x = z.x - FPSC.CX; G.y = z.y - FPSC.CY;
  cpWaypoint(G.x, G.y, 'It has the ball', 2.2);
  if (d <= 0.4) {
    // (into the chasm with it: a stroke, and a new ball dropped on the green side)
    zmKill(z, false, '', 'flash'); S.th = ''; CP15.lost++; G.n++;
    G.x = CP15.GULLY[1] + 3.2; G.y = clamp(S.thTo[1], -70, -30); G.lie = m15Lie(G.hi, G.x, G.y); G.st = 'rest'; G.lock = false;
    cpEvent('m15thief', 1); m15Say(S, 'thl' + S.thN, 'holm', 'Gone down with it. Leave it! Nobody goes looking for a ball on the 8th. Drop another.', 'cp_m15_72'); m15GolfWay();
  }
}
function m15ThiefUp() {
  const S = RAID.st, G = m15G(), [g0, g1] = CP15.GULLY, side = G.x > 19.5 ? g1 + 0.8 : g0 - 0.8;
  const z = m15Rise(G.x + 1.2, G.y + 0.8, 'run', C15T.HP); if (!z) return;
  z.rr = z.rr0 = 0.6; S.th = z.id; S.thN++; G.st = 'held'; G.lock = true;
  S.thTo = [side, clamp(G.y + (Math.random() - 0.5) * 6, -74, -28)];
  cpEvent('m15thief', 2); m15Say(S, 'thu' + S.thN, S.thN === 1 ? 'maren' : 'holm', ...(S.thN === 1 ? ['It has the ball! It is taking it back to the gully. Stop it!', 'cp_m15_73'] : ['Another one after the ball! Shoot it before it gets to the edge!', 'cp_m15_74']));
}
cpOn('m15thief', k => { if (k === 2) { ZM.banner = { text: 'It has the ball', t: 2.6, sub: 'put it down before it reaches the chasm', col: '#ff9a7a' }; try { if (!soundOff()) sfxPlay('snarl', { vol: 0.6 }); } catch (e) {} } else if (k === 1) { fpsFeed('Into the chasm with the ball. A stroke, and another dropped on the green side.'); try { if (!soundOff()) sfxPlay('splash', { vol: 0.5 }); } catch (e) {} } else fpsFeed('Put down. The ball drops where it fell.'); });
cpOn('m15gullydone', () => { ZM.banner = { text: 'The 8th is holed', t: 3.2, sub: 'they slide back down into the chasm', col: '#e8f0c0' }; try { if (!soundOff()) sfxPlay('wavesweep', { vol: 0.5 }); } catch (e) {} });

// Pellow's skiff, rowing out to the Light with its lantern (every screen; p: 0 the harbour, 1 the Light)
const M15K = { s: null };
function m15Skiff3d(grp) { const T = M15_3D; M15K.s = T.glow(0xffd88a, 3.2, 0.8); M15K.s.material.fog = false; grp.add(M15K.s); }
function m15Skiff(p) { if (!M15K.s) return; const a = [-30, -120], b = [222, -296], [x, y] = cpkW(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p); M15K.s.position.copy(z3v(x, y, 0.6)); M15K.s.material.opacity = p < 0.98 ? 0.55 + 0.25 * Math.sin(g.t * 3) : 0; }

// ---------- III. Homeward Cliff ----------
m15Stage('m15home', {
  n: 'Homeward Cliff', map: m15Map([45, -13]), face: Math.atan2(32, -26), ppl: ['holm', 'maren'],
  music: () => { const p = RAID.st.ph; return p === 'boss' ? 'cpm15boss' : p === 'won' ? 'cpm15home' : 'cpm15fire'; },
  sky: () => 1,
  spots: () => ({ holm: [45.2, -6.2], maren: [49.6, -5.4] }),
  lay(H, K) { K.put('block', C15F.POT[0], C15F.POT[1], 0, { w: 0.9, d: 0.9, hh: 0.55, col: '#2a2826' }); K.light(C15F.POT[0], C15F.POT[1], 1.2, '#ff8a30', 9, 'fire'); },
  enter() {
    Object.assign(RAID.st, { ph: 'fire', brig: 0, bar: [0, 0, 0], boss: 0, wonT: 0, away: 0 });
    if (ZM.net === 'client') return;
    m15GolfNew(8, { lit: true, x: C15F.TEE[0], y: C15F.TEE[1], tee: C15F.TEE.slice(), lie: 'tee' });
    cpObjective('Strike burning balls from the tar pot onto the three barrels under the cliff'); cpWaypoint(C15F.TEE[0], C15F.TEE[1], 'The tar pot', 0.6);
    cpSay('holm', 'Dip it, light it, strike it. Each barrel you put a ball into is a fire she can see.', 'cp_m15_50');
  },
  tick(dt) {
    const S = RAID.st, G = m15G(), n = m15N(); if (!G || cpCineOn()) return;
    const lit = S.bar.filter(Boolean).length;
    S.spT -= dt;
    if (S.ph === 'fire') {
      // the brig closes on the point; every barrel alight slows her
      S.brig = Math.min(1, S.brig + dt / C15F.BRIG_T * (1 - 0.3 * lit));
      if (S.brig > 0.5) m15Say(S, 'half', 'holm', 'She is still standing in. She cannot see them yet. More fire!', 'cp_m15_53');
      if (S.brig > 0.8) m15Say(S, 'near', 'maren', 'I can hear her canvas. She is that close.', 'cp_m15_54');
      if (S.brig >= 1) { cpFail('The brig went onto the point in the dark'); return; }
      // (and they come up over the east cliffs, and out of the chasm)
      if (S.spT <= 0) { S.spT = (5.5 + Math.random() * 2) / Math.sqrt(n); if (m15Alive() < 3 + 2 * n) { const at = Math.random() < 0.7 ? m15CliffSpot(-0.9, 0.9) : [CP15.GULLY[1] + 1.8, -30 - Math.random() * 30]; if (at) m15Rise(...at); } }
      if (RAID.t > 14 && m15Alive()) m15Say(S, 'up', 'maren', 'Holm, they are coming up the cliff. Up the bare rock, like flies up a window.', 'cp_m15_52');
      if (lit === 3) { S.ph = 'turn'; G.lock = true; m15Flash(); cpObjective(''); cpWaypoint(null); cpCine('m15_turn', () => m15BossUp()); }
    } else if (S.ph === 'boss') {
      const B = ZM.z.find(z => z.zn === S.boss);
      S.away = Math.min(1, S.away + dt / 60);
      if (S.spT <= 0) { S.spT = (8 + Math.random() * 3) / Math.sqrt(n); if (m15Alive() < 2 + n) { const at = m15CliffSpot(-0.9, 0.9); if (at) m15Rise(...at); } }
      if (B && B.hp < B.max * 0.5) m15Say(S, 'bhalf', 'holm', 'It feels the fire! Keep them coming from the pot!', 'cp_m15_57');
      if (!B || B.dead) { S.ph = 'won'; S.wonT = 0; G.lock = true; m15Flash(); cpObjective(''); cpWaypoint(null); cpEvent('m15crabdown'); cpSay('maren', 'It has gone to pieces. Look, Holm: the balls. All eleven of them, all over the fairway.', 'cp_m15_58'); }
    } else if (S.ph === 'won') {
      S.wonT += dt; S.away = Math.min(1, S.away + dt / 30);
      if (S.wonT > 3 && !S.lit) { S.lit = 1; cpEvent('m15lit'); cpSay('holm', 'There. There she is. Pellow is in the lamp room at last.', 'cp_m15_59'); }
      if (S.wonT > 8) cpDone();
    } else if (S.ph === 'turn') S.away = Math.min(1, S.away + dt / 60);
  },
  // (host) where a burning ball came down: a barrel lit, any of the drowned it fell on burned, the crab hurt
  m15landed(G, x, y) {
    const S = RAID.st, [wx, wy] = cpkW(x, y);
    C15F.BARRELS.forEach((b, i) => { if (!S.bar[i] && Math.hypot(x - b[0], y - b[1]) < C15F.HIT) { S.bar[i] = 1; cpEvent('m15barrel', i); const lit = S.bar.filter(Boolean).length; if (lit === 1) cpSay('holm', 'One! Into the tar and alight. Now the next.', 'cp_m15_51'); if (lit === 2) cpSay('maren', 'Two. She must see two fires on a dark coast.', 'cp_m15_55'); } });
    let hit = 0;
    for (const z of ZM.z) {
      if (z.dead) continue; const d = Math.hypot(z.x - wx, z.y - wy);
      if (z.boss && d < C15F.BOSS_R + (z.rad || 1)) { zmHurt(z, z.max * 0.2 / Math.sqrt(m15N()), false, 'm15fire', G.by || FPS.me.id, ''); hit = 2; }
      else if (!z.boss && d < C15F.BURN_R) { zmHurt(z, z.max * 2, false, 'm15fire', G.by || FPS.me.id, 'burn'); hit = hit || 1; }
    }
    cpEvent('m15burst', [Math.round(x * 10) / 10, Math.round(y * 10) / 10, hit]);
  },
  pack(o) { const S = RAID.st; o.m15s = [['fire', 'turn', 'boss', 'won'].indexOf(S.ph), Math.round(S.brig * 1000), S.bar.slice(), Math.round(S.away * 100), Math.round(S.wonT * 10)]; },
  apply(o) { const S = RAID.st, a = o.m15s; if (!Array.isArray(a)) return; S.ph = ['fire', 'turn', 'boss', 'won'][a[0]] || 'fire'; S.brig = (a[1] | 0) / 1000; if (Array.isArray(a[2])) S.bar = a[2].map(v => v | 0); S.away = (a[3] | 0) / 100; S.wonT = (a[4] | 0) / 10; },
  hud(phone, mono) {
    const S = RAID.st; if (S.ph !== 'fire') return;
    const lit = (S.bar || []).filter(Boolean).length;
    cplBar(phone, mono, `THE BRIG CLOSING ON THE POINT · BARRELS ALIGHT ${lit} OF 3`, S.brig, 1.4, S.brig > 0.75 ? '#ff8a6a' : '#e8c890');
    // (each barrel's own marker, unlit ones only)
    C15F.BARRELS.forEach((b, i) => { if (!S.bar[i]) { const [x, y] = cpkW(...b); c9Mark(x, y, 1.6, 'Barrel', phone, mono); } });
  },
  b3(grp) { m15Home3d(grp); m15Skiff3d(grp); },
  f3(dt) { m15Home3dTick(dt); const S = RAID.st; m15Skiff(S.lit ? 1 : clamp(0.3 + (RAID.ct || RAID.t) / 300, 0.3, 0.93)); },
  exit() { M15H.on = false; M15K.s = null; },
});
// (host) the brig goes about, and up comes the thing in the chasm
function m15BossUp() {
  const S = RAID.st, G = m15G(), z = m15Boss(19.5, -27); if (z) S.boss = z.zn;
  S.ph = 'boss'; if (G) { G.lock = false; G.st = 'rest'; G.x = G.tee[0]; G.y = G.tee[1]; }
  cpObjective('Put down the Chasm Crab: burning balls from the pot hurt it worst'); cpWaypoint(C15F.TEE[0], C15F.TEE[1], 'The tar pot', 0.6);
  ZM.banner = { text: 'The Chasm Crab', t: 3.8, sub: 'the eleven lost balls in its shell', col: '#9fe8d8' };
}
cpOn('m15barrel', i => { M15H.flare[i | 0] = 1; ZM.banner = { text: 'A barrel alight', t: 2.6, sub: 'a fire on the ledges she can see', col: '#ffc890' }; try { if (!soundOff() && !sfxPlay('beaconcatch', { vol: 0.8 })) sfxPlay('fireroar', { vol: 0.6 }); } catch (e) {} });
cpOn('m15burst', a => { if (!Array.isArray(a)) return; M15H.burst.push({ x: +a[0] || 0, y: +a[1] || 0, t: 0 }); try { if (!soundOff()) noise('lowpass', 600, 0.8, 0.01, 0.45, 0.5); } catch (e) {} if (a[2] === 2) fpsFeed('The burning ball bursts on the Chasm Crab’s shell.'); });
cpOn('m15crabdown', () => { M15H.scatter = 1; });
cpOn('m15lit', () => { ZM.banner = { text: 'The Light', t: 4, sub: 'lit at last, and turning', col: '#ffe8b0' }; try { if (!soundOff()) sfxPlay('beam', { vol: 0.7 }); } catch (e) {} });

ZB_KINDS.push('cpm15crab');   // (so a joined player's screen knows it by its place in the list: src/zmboss.js zbPack)
// the boss: a Keelback of the chasm's old wrecks, the eleven lost balls set in its shell, shining
ZBT.cpm15crab = Object.assign({}, ZBT.crab, {
  n: 'the Chasm Crab', N: 'The Chasm Crab', sub: 'up out of the 8th', col: '#9fe8d8', bar: ['#2a5a50', '#9fe8d8'],
  arriveLine: () => 'Something vast heaves itself up out of the chasm: the Chasm Crab.',
  killLine: (who, pts) => `${who} broke the Chasm Crab apart (+${pts}).`,
  build() {
    const M = ZBT.crab.build(), soft = z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
    M.m15b = [];
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2 + 0.3, r = 0.35 + (i % 3) * 0.22, b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf0f8f0 }));
      b.position.set(Math.cos(a) * r, 1.32 + (i % 2) * 0.08, Math.sin(a) * r * 1.4); M.root.add(b);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0x9fe8d8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); s.scale.setScalar(0.7); s.position.copy(b.position); M.root.add(s); M.m15b.push(s);
    }
    return M;
  },
});
function m15Boss(x, y) {
  const kind = 'cpm15crab', T = ZBT[kind]; if (!T) return null;
  const [wx, wy] = cpkW(x, y), n = m15N(), zn = ++ZM.zc, hp = zbHpOf('crab', RAIDC.ROUND + 3, n) * 0.95;
  const z = { drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x: wx, y: wy, jz: -1.9, fl: 0, rr: 1.8, rr0: 1.8,
    hp, max: hp, sp: T.sp(RAIDC.ROUND + 4), st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: Math.PI / 2, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 4, swCd: 1, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy, raid: true };
  if (T.init) T.init(z);
  zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z;
  if (typeof ZB !== 'undefined' && ZB.seen) ZB.seen.add(zn);
  try { if (T.sound) T.sound('arrive'); } catch (e) {}
  return z;
}

// ---------- III in 3D: the barrels on their ledges, the tar pot, the brig, the bursts ----------
const M15H = { on: false, bar: [], flare: [0, 0, 0], burst: [], scatter: 0, brig: null };
function m15Home3d(grp) {
  const T = M15H, G0 = FPSC.GROUND, gl = M15_3D.glow; T.on = true; T.bar = []; T.flare = [0, 0, 0]; T.burst = []; T.scatter = 0;
  const rock = z3Lam('#4a4c48'), tar = z3Lam('#1e1a16'), iron = z3Lam('#2a2a2c');
  for (const [bx, by] of C15F.BARRELS) {
    const [x, y] = cpkW(bx, by), g3 = new THREE.Group(); g3.position.copy(z3v(x, y, 0)); grp.add(g3);
    const L = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 3.4), rock); L.position.y = 0.2; L.rotation.y = Math.atan2(by, bx); g3.add(L);
    const B = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.0, 12), tar); B.position.y = 1.4; g3.add(B);
    for (const h of [1.05, 1.75]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 4, 14), iron); r.rotation.x = Math.PI / 2; r.position.y = h; g3.add(r); }
    const f = gl(0xff8a30, 7, 0); f.position.y = 2.6; f.material.fog = false; g3.add(f);
    const c = gl(0xffd890, 3, 0); c.position.y = 2.0; c.material.fog = false; g3.add(c);
    const mark = gl(0xffc890, 1.6, 0.35); mark.position.y = 2.1; g3.add(mark);
    T.bar.push({ g3, f, c, mark });
  }
  // the tar pot on its fire
  { const [x, y] = cpkW(...C15F.POT), p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.32, 0.5, 12), iron); p.position.copy(z3v(x, y, G0 + 0.8)); grp.add(p); T.pot = gl(0xff8a30, 2.8, 0.7); T.pot.position.copy(z3v(x, y, G0 + 0.7)); grp.add(T.pot); }
  // the brig, far out to the east, standing in for the point, her lights lit
  T.brig = cplBrig({}); grp.add(T.brig);
  T.blights = [[0, 15, 0xfff0d0], [8, 4, 0xff4030], [-8, 4, 0x40ff60]].map(([u, h, c]) => { const s = gl(c, 3.2, 0.9); s.material.fog = false; s.position.set(0, h, u); T.brig.add(s); return s; });
  // the bursts of burning balls, and the eleven balls scattered at the end
  T.bs = []; for (let i = 0; i < 4; i++) { const s = gl(0xff9040, 6, 0); grp.add(s); T.bs.push(s); }
  T.balls = []; for (let i = 0; i < 11; i++) { const s = gl(0x9fe8d8, 0.8, 0); grp.add(s); T.balls.push(s); }
}
function m15Home3dTick(dt) {
  const T = M15H, S = RAID.st; if (!T.on || !S.bar) return;
  const t = g.t, G0 = FPSC.GROUND;
  T.bar.forEach((b, i) => { const on = !!S.bar[i]; if (T.flare[i] > 0) T.flare[i] = Math.max(0, T.flare[i] - dt / 1.5); const fl = 0.85 + 0.15 * Math.sin(t * 11 + i * 2) + 0.1 * Math.sin(t * 23 + i); b.f.material.opacity = on ? 0.7 * fl : 0; b.f.scale.setScalar(on ? (6 + 6 * T.flare[i]) * fl : 1); b.c.material.opacity = on ? 0.9 : 0; b.mark.material.opacity = on ? 0 : 0.25 + 0.15 * Math.sin(t * 3 + i); });
  if (T.pot) T.pot.material.opacity = 0.55 + 0.2 * Math.sin(t * 9);
  // the brig: in from the east towards the point as S.brig grows; going about once the fires are seen
  if (T.brig) {
    const p = clamp(S.brig || 0, 0, 1), a = [300, 30], b = [112, -98], x0 = a[0] + (b[0] - a[0]) * p, y0 = a[1] + (b[1] - a[1]) * p, w = clamp(S.away || 0, 0, 1);
    const hd = Math.atan2(b[0] - a[0], b[1] - a[1]) + w * 2.4, x = x0 + Math.sin(hd) * w * 60, y = y0 + Math.cos(hd) * w * 60, [wx, wy] = cpkW(x, y);
    T.brig.position.copy(z3v(wx, wy, 0)); T.brig.rotation.y = -hd + Math.PI / 2; T.brig.rotation.z = Math.sin(t * 0.7) * 0.03;
  }
  T.burst = T.burst.filter(q => (q.t += dt) < 0.9);
  T.bs.forEach((s, i) => { const q = T.burst[i]; if (!q) { s.material.opacity = 0; return; } const [x, y] = cpkW(q.x, q.y); s.position.copy(z3v(x, y, G0 + 0.6 + q.t)); s.material.opacity = 0.8 * (1 - q.t / 0.9); s.scale.setScalar(3 + q.t * 8); });
  // (the boss's shell balls shine; at the end the eleven lie scattered over the fairway)
  for (const z of ZM.z) if (z.boss && z.mdl && z.mdl.m15b) z.mdl.m15b.forEach((s, i) => { s.material.opacity = z.dead ? 0 : 0.45 + 0.3 * Math.sin(t * 2 + i); });
  if (T.scatter) T.balls.forEach((s, i) => { const [x, y] = cpkW(20 + (i % 4) * 4 + Math.sin(i * 7) * 3, -26 + Math.floor(i / 4) * 4 + Math.cos(i * 5) * 2); s.position.copy(z3v(x, y, G0 + 0.1)); s.material.opacity = 0.5 + 0.2 * Math.sin(t * 2 + i); });
}
