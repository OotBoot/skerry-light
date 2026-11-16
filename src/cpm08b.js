'use strict';
// The Chronicle of the Light, mission 8, Part II: Her Lantern (cp_m08out). Down the slip and out from the north side
// of the Light, the keeper's cutter goes out after the Gannet's bell, on the Gannet's Wake's own sail (src/gwsail.js,
// through GWS_LEG) and the raid's own sea: the same skerries, the same rocks from the same seed, the same ring of her
// spars a mile out. Her sailing is never touched. What's new is who goes ahead of you, and what you do out there.
//  - Nobody walks ahead tonight. Ahead, low on the water, a skiff with a hand lantern in it, and a woman at the oars:
//    Maren, rowing out to where the Gannet went down, as she did a year ago tonight to warn her. She keeps to the
//    deep water (the raid's own channel), a little ahead of the cutter, and waits while you come up; her lantern
//    shows the rocks round her skiff to everyone. She's not out for you tonight.
//  - The Gannet's bell tolls every so often, louder nearer her. Answer it: ring the cutter's bell within a few
//    seconds of the toll and the water goes quiet for a while (no drowned come up the sides); miss it and a wave of
//    them comes up the rails at once, more of you more of them.
//  - The ring of her spars (a cinematic, m08_ring): the skiff stops in the middle of it and Maren speaks. Four of the
//    broken masts in the ring still carry their tops and rigging: sail in close to each and fire a flare into it
//    from the forward deck. With all four burning, the Gannet comes up alongside (gwsail's own rising, driven by this
//    stage), and the part is done; the next part's cinematic (m08_board) takes you up her side.
// Host-authoritative: the skiff, the bell's answering, the spars and the rising are the host's, sent in m8s with the
// Gannet's Wake's own word; a joined player asks to fire into a spar ('m8spar'). Lines through cpSay (cp_m08_15 on).

const CPM8B = {
  START: [-26, 104], TOLL: [22, 16], WIN: 7, CALM: 13, SPARS: [1, 5, 9, 13], SPAR_R: 26, RING_SEE: 120,
  SKIFF: [60, 170], SKIFF_LAN: 46, FWD: [0, 6.2],
};

// ---------- the sea: the raid's own (its rocks and its ring of spars, from its seed), with the skiff's way out ----------
var CPM8_SEA = null;
function cpm8Sea() {
  if (CPM8_SEA) return CPM8_SEA;
  const L0 = GWS_LEG; GWS_LEG = null; const base = gwsSea(); GWS_LEG = L0;
  const [sx, sy] = CPM8B.START, [mx, my] = GWS.MARK;
  let path = typeof findPath === 'function' ? findPath(sx, sy + 20, mx, my, base.rocks) : null;
  if (!path || !path.length) path = [{ x: sx, y: sy + 20 }, { x: mx, y: my }];
  const out = [{ x: path[0].x, y: path[0].y }]; for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12)); for (let j = 1; j <= n; j++) out.push({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n }); }
  for (const r of base.rocks) { r.seen = -99; r.lit = 0; r.flare = 0; }
  return CPM8_SEA = { rocks: base.rocks, path: out, spars: base.spars, len: Math.hypot(mx - sx, my - sy) };
}
function cpm8Leg() {
  const sea = cpm8Sea(), s0 = CPM8B.START, p1 = sea.path[Math.min(3, sea.path.length - 1)];
  for (const r of sea.rocks) { r.seen = -99; r.lit = 0; r.flare = 0; }
  GWS_LEG = { key: 'cpm08out', start: s0.slice(), h0: bearingOf(p1.x - s0[0], p1.y - s0[1]), mark: GWS.MARK.slice(), markIn: -1, isleR: 0, maren: false, plim: false, sea,
    line: (S, dm) => cpm8Line(S, dm), markLab: () => 'HER SPARS', prog: () => cpm8Prog(), row: () => cpm8Row(),
    spawnOk: () => !(RAID.st.m8b && RAID.st.m8b.calm > 0),
    sunk: () => cpFail('The keeper’s cutter went down on the skerries'),
    b3: (SG, G) => cpm8b3d(SG, G), f3: (dt, V) => cpm8f3d(dt, V), amb: [0.36, 0.17] };
  return GWS_LEG;
}
function cpm8Prog() { const S = RAID.st, B = S.B; if (!B) return 0; return clamp(0.15 + 0.5 * (1 - Math.hypot(GWS.MARK[0] - B.x, GWS.MARK[1] - B.y) / cpm8Sea().len) + (S.ph === 'rise' ? 0.35 : 0), 0, 1); }
const cpm8Lit = () => { const S = RAID.st; return CPM8B.SPARS.filter((_, i) => (S.m8lit | 0) & (1 << i)).length; };
function cpm8Line(S, dm) {
  if (S.ph === 'sunk') return 'She’s going down.';
  if (S.ph === 'rise') return `Hold her inside the ring of spars: the Gannet is coming up (${Math.round(S.riseT / GWS.RISE * 100)}%)`;
  if (S.ph === 'ladder') return 'The Gannet is alongside.';
  if (S.m8ring) return `Sail in close to each of her four tall spars and fire a flare into it, from the forward deck (${cpm8Lit()} of 4 burning)`;
  return `Follow Maren’s lantern out to the Gannet’s spars: ${Math.round(dm).toLocaleString('en')} m · answer her bell with ours`;
}
function cpm8Row() {
  const B = RAID.st.m8b; if (!B) return ['BELL', '…'];
  if (B.win > 0) return ['HER BELL', `TOLLED · ANSWER IT · ${Math.ceil(B.win)} s`, '#ffb070'];
  if (B.calm > 0) return ['HER BELL', `ANSWERED · QUIET ${Math.ceil(B.calm)} s`, '#9ad8c0'];
  return ['HER BELL', 'LISTEN FOR IT', 'rgba(236,228,207,0.6)'];
}

// ---------- the stage ----------
FPS_ISLES.cpm08sea = Object.assign({}, FPS_ISLES.gwsail, { name: 'the Skerries' });
FPI_GEN.cpm08sea = FPI_GEN.gwsail;
const CPM8_MAP = Object.assign({}, GWS_MAP, { isle: 'cpm08sea' });
(function () {
  const G0 = RAID_STAGES.gwsail;
  cpStage('m08out', Object.assign({}, G0, {
    n: 'Her Lantern', map: CPM8_MAP, gws: true,
    music: () => RAID.st.ph === 'rise' || RAID.st.ph === 'ladder' ? 'cpm08rise' : 'cpm08sail',
    prep() { cpm8Leg(); },
    enter() {
      if (!GWS_LEG || GWS_LEG.key !== 'cpm08out') cpm8Leg();
      G0.enter();
      const sea = cpm8Sea(), p = sea.path[Math.min(6, sea.path.length - 1)];
      Object.assign(RAID.st, { m8k: { k: 7, x: p.x, y: p.y, h: 0, row: 0 }, m8b: { t: 9, win: 0, n: 0, calm: 0 }, m8lit: 0, m8ring: 0, m8said: {}, m8riseSaid: 0, m8doneT: 0, m8pend: 0 });
      ZM.banner = { text: 'Her Lantern', t: 4.5, sub: '14 December 1888 · out from the north side of the Light', col: '#ffe0a8' };
      fpsFeed('Take the wheel (Use) and follow the skiff’s lantern out. When the Gannet’s bell tolls, ring ours at the mast to answer it.');
      if (ZM.net !== 'client') { cpObjective(''); cpWaypoint(null); }
    },
    tick(dt) { G0.tick(dt); cpm8Tick(dt); },
    me(dt) { G0.me(dt); cpm8Me(dt); },
    q(sid, k, a) { if (k === 'm8spar') return cpm8Spar(sid, a | 0); return G0.q(sid, k, a); },
    pack(o) { G0.pack(o); const S = RAID.st, K = S.m8k, B = S.m8b; o.m8s = [Math.round(K.x), Math.round(K.y), Math.round(K.h * 100), S.m8lit | 0, Math.round(B.win * 10), Math.round(B.calm * 10), S.m8ring | 0]; },
    apply(o) { G0.apply(o); const S = RAID.st, a = o.m8s; if (!Array.isArray(a) || !S.m8k) return; const K = S.m8k; K.tx = +a[0] || 0; K.ty = +a[1] || 0; K.h = (+a[2] || 0) / 100; S.m8lit = a[3] | 0; S.m8b.win = (+a[4] || 0) / 10; S.m8b.calm = (+a[5] || 0) / 10; S.m8ring = a[6] | 0; },
    consider(c) { G0.consider(c); const S = RAID.st; if (S.B && S.m8ring && S.ph === 'sail') { const [x, y] = gwsW(...CPM8B.FWD); c({ k: 'm8spar' }, x, y, GWS.D, 2.6, false); } },
    prompt(o) {
      if (o.k === 'm8spar') { const i = cpm8NearSpar(); return i < 0 ? { text: 'Bring her in close to one of the four tall spars, then fire into it from here' } : { text: 'Fire a flare into the spar’s rigging', free: true }; }
      return G0.prompt(o);
    },
    use(o) {
      if (o.k === 'm8spar') { const S = RAID.st, i = cpm8NearSpar(); if (i < 0 || S.m8pend > 0) { zmSound('no'); return true; } S.m8pend = 1; raidAsk('m8spar', i); return true; }
      return G0.use(o);
    },
    hud(phone, mono, fell) { G0.hud(phone, mono, fell); cpm8Hud(phone, mono, fell); },
    exit() { G0.exit(); GWS_LEG = null; CPM8B3.on = false; },
  }));
})();

// ---------- hosting or alone ----------
// the target spar nearest her, if she's close enough to fire into it (-1: none)
function cpm8NearSpar() {
  const S = RAID.st, V = S.V || S.B, sea = cpm8Sea(); if (!V) return -1;
  let best = -1, bd = CPM8B.SPAR_R;
  CPM8B.SPARS.forEach((si, i) => { if ((S.m8lit | 0) & (1 << i)) return; const p = sea.spars[si]; if (!p) return; const d = Math.hypot(p.x - V.x, p.y - V.y); if (d < bd) { bd = d; best = i; } });
  return best;
}
function cpm8Spar(sid, i) {
  const S = RAID.st; if (!S.m8ring || S.ph !== 'sail' || i < 0 || i >= CPM8B.SPARS.length || ((S.m8lit | 0) & (1 << i))) return;
  const p = cpm8Sea().spars[CPM8B.SPARS[i]], B = S.B; if (!p || Math.hypot(p.x - B.x, p.y - B.y) > CPM8B.SPAR_R + 6) return;
  S.m8lit = (S.m8lit | 0) | (1 << i); const n = cpm8Lit();
  cpEvent('m8spar', [i, sid, n]);
  if (n === 2) cpSay('m8cox', 'Two of them burning. Bring her round for the others.', 'cp_m08_20');
  if (n >= CPM8B.SPARS.length) { S.ph = 'rise'; S.riseT = 0; for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); cpSay('m8cox', 'All four alight. God help us: something’s coming up under us.', 'cp_m08_21'); cpEvent('m8rise'); }
}
function cpm8Tick(dt) {
  const S = RAID.st, B = S.B, K = S.m8k, Bl = S.m8b, sea = cpm8Sea(), n = Math.max(1, ZM.hum.length); if (!B || !K || S.ph === 'sunk') return;
  const dm = Math.hypot(GWS.MARK[0] - B.x, GWS.MARK[1] - B.y);
  // the skiff: on ahead along the deep water, waiting while you come up
  { const d = Math.hypot(K.x - B.x, K.y - B.y), P = sea.path, end = K.k >= P.length;
    const sp = end ? 0 : d < CPM8B.SKIFF[0] ? Math.max(7, B.v + 3) : d < CPM8B.SKIFF[1] ? Math.max(3.5, B.v * 0.8) : 0;
    K.row = sp > 0 ? 1 : 0;
    if (!end && sp > 0) { const t = P[K.k], dx = t.x - K.x, dy = t.y - K.y, dd = Math.hypot(dx, dy), s = sp * dt; if (dd <= s) { K.x = t.x; K.y = t.y; K.k++; } else { K.x += dx / dd * s; K.y += dy / dd * s; K.h += angDiff(bearingOf(dx, dy), K.h) * Math.min(1, dt * 2); } }
    if (d > CPM8B.SKIFF[1] + 60 && !S.m8said.lost && !S.m8ring) { S.m8said.lost = 1; cpSay('m8cox', 'We’re losing her lantern. Crack on, or we’ll lose her in the rocks!', 'cp_m08_17'); } }
  // the ring: the first time she's close, a word from the water
  if (!S.m8ring && dm < GWS.MARK_R + CPM8B.RING_SEE && S.ph === 'sail') {
    S.m8ring = 1; for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash');
    // (and the skiff, there before you: stopped in the middle of the ring)
    K.k = sea.path.length; K.x = GWS.MARK[0] - 6; K.y = GWS.MARK[1] + 4; K.row = 0;
    cpCine('m08_ring', () => { cpEvent('m8ring'); });
  }
  // her bell: tolls, a window to answer it, quiet after; unanswered, they come up the sides
  if (Bl.calm > 0) Bl.calm = Math.max(0, Bl.calm - dt);
  if (S.ph === 'sail' || S.ph === 'rise') {
    if (Bl.win > 0) {
      if ((S.bellN | 0) > Bl.n) { Bl.win = 0; Bl.calm = CPM8B.CALM; cpEvent('m8ans', 1); if (!S.m8said.ans) { S.m8said.ans = 1; cpSay('m8cox', 'Answered. Hear how the water goes quiet.', 'cp_m08_15'); } }
      else { Bl.win -= dt; if (Bl.win <= 0) { Bl.win = 0; cpEvent('m8ans', 0); if (!S.m8said.miss) { S.m8said.miss = 1; cpSay('m8cox', 'Too slow! Here they come, up over the rails!', 'cp_m08_16'); } Bl.calm = 0; for (let k = 0; k < 2 + n; k++) gwsSpawn(S); } }
    } else { Bl.t -= dt; if (Bl.t <= 0) { const k = clamp(1 - dm / cpm8Sea().len, 0, 1); Bl.t = CPM8B.TOLL[0] + (CPM8B.TOLL[1] - CPM8B.TOLL[0]) * k; Bl.win = CPM8B.WIN; Bl.n = S.bellN | 0; cpEvent('m8toll2', Math.round(clamp(1 - dm / 1700, 0.15, 1) * 100)); } }
  }
  // the rising: held in the ring, she comes up alongside; then up her side (the next part)
  if (S.ph === 'rise') { if (dm < GWS.MARK_IN + 30) S.riseT += dt; if (S.riseT >= GWS.RISE) { S.ph = 'ladder'; S.m8doneT = 0; cpEvent('m8up'); } }
  if (S.ph === 'ladder') { S.m8doneT += dt; if (S.m8doneT > 2.2) cpDone(); }
}
cpOn('m8toll2', v => { try { if (!soundOff()) sfxBellFar(0, clamp((v | 0) / 100, 0.15, 1)); } catch (e) {} ZM.banner = { text: 'The Gannet’s bell', t: 2.6, small: true, sub: 'answer it: ring ours at the mast', col: '#ffc890' }; });
cpOn('m8ans', ok => { if (ok) { fpsFeed('Her bell answered. The water round the cutter goes still.'); CPM8B3.calm = 1; } else fpsFeed('Her bell unanswered: the drowned come up the cutter’s sides.'); });
cpOn('m8ring', () => { ZM.banner = { text: 'The ring of her spars', t: 4.5, sub: 'fire a flare into each of the four tall spars · from the forward deck', col: '#ffd8a0' }; if (typeof raidRespawn === 'function') raidRespawn(); });
cpOn('m8spar', a => { try { if (!soundOff()) { sfxFlare(); sfxSplash(0, 0.3); } } catch (e) {} const n = Array.isArray(a) ? a[2] | 0 : 0, sid = Array.isArray(a) ? a[1] : ''; fpsFeed(`${gwsNick(sid)} ${sid === FPS.me.id ? 'fire' : 'fires'} a flare into the spar’s old rigging, and it takes. ${n} of 4 burning.`); CPM8B3.flash = 1; });
cpOn('m8rise', () => { ZM.banner = { text: 'Something is coming up', t: 4.5, sub: 'hold her inside the ring of spars', col: '#bfe0d8' }; });
cpOn('m8up', () => { try { if (!soundOff()) sfxBell(); } catch (e) {} fpsFeed('The Gannet lies alongside, her bell ringing, the water pouring off her.'); });

// ---------- everyone ----------
function cpm8Me(dt) {
  const S = RAID.st, K = S.m8k, sea = cpm8Sea(); if (!K) return;
  if (S.m8pend > 0) S.m8pend -= dt;
  if (ZM.net === 'client') { if (K.tx != null) { const k = Math.min(1, dt * 4); K.x += (K.tx - K.x) * k; K.y += (K.ty - K.y) * k; } if (S.m8b.win > 0) S.m8b.win = Math.max(0, S.m8b.win - dt); if (S.m8b.calm > 0) S.m8b.calm = Math.max(0, S.m8b.calm - dt); }
  // her lantern shows the rocks round the skiff, for everyone
  for (const r of sea.rocks) { const dx = r.x - K.x, dy = r.y - K.y; if (Math.abs(dx) > 80 || Math.abs(dy) > 80) continue; const d = Math.hypot(dx, dy) - r.r; if (d < CPM8B.SKIFF_LAN) r.lit = Math.max(r.lit, 0.3 + 0.5 * (1 - Math.max(0, d) / CPM8B.SKIFF_LAN)); }
  // the oars in the rowlocks, faint over the water
  S.m8oarT = (S.m8oarT || 0) - dt; if (S.m8oarT <= 0 && K.row) { S.m8oarT = 2.6 + Math.random(); const V = S.V || S.B; if (V && Math.hypot(K.x - V.x, K.y - V.y) < 160) try { if (!soundOff()) sfxRowlock(gwsPan(K.x, K.y)); } catch (e) {} }
}
function cpm8Hud(phone, mono, fell) {
  const S = RAID.st; if (!S.m8k || !S.B) return;
  if (S.m8ring && S.ph === 'sail') { const i = cpm8NearSpar(); if (i >= 0) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = `rgba(255,200,140,${0.75 + 0.25 * Math.sin(g.t * 6)})`; ctx.fillText('A TALL SPAR CLOSE ALONGSIDE · FIRE INTO IT FROM THE FORWARD DECK', cx, H - (phone ? 130 : 96)); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; } }
}

// ---------- in 3D: the skiff and her lantern, the four tall spars (and their fires), the quiet when answered ----------
const CPM8B3 = { on: false, flash: 0, calm: 0 };
function cpm8Skiff(lam, glowSp) {
  const S = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam('#3a3226')); hull.scale.set(0.75, 0.45, 2.1); hull.position.y = 0.32; S.add(hull);
  const gun = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 4, 20), lam('#5a4a36')); gun.rotation.x = Math.PI / 2; gun.scale.set(0.75, 2.1, 1); gun.position.y = 0.32; S.add(gun);
  const oars = []; for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 5), lam('#6a5a40')); o.rotation.z = s * 1.25; o.position.set(s * 1.3, 0.4, 0); S.add(o); oars.push(o); }
  const lan = new THREE.Group(); lan.position.set(0, 0.95, 1.4); S.add(lan);
  lan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })));
  const halo = glowSp(0xffc070, 3.2); lan.add(halo); const big = glowSp(0xffb060, 16, { opacity: 0.18 }); lan.add(big);
  const light = new THREE.PointLight(0xffc070, 1.4, 40, 1.6); lan.add(light);
  return { S, oars, halo, big, light, lan };
}
function cpm8b3d(SG, G) {
  const T = CPM8B3, sea = cpm8Sea(); T.on = true; T.flash = 0; T.calm = 0;
  const lam = c => z3Lam(c);
  // the skiff: Maren at the oars, her back to her bow, the lantern on the thwart
  T.sk = cpm8Skiff(lam, G.glowSp); SG.add(T.sk.S);
  T.mar = typeof cpm5MarenActor === 'function' ? cpm5MarenActor(T.sk.S, 1.5) : null; if (T.mar) { T.mar.P.position.set(0, 0.35, -0.2); T.mar.g0.material.opacity = 0.18; }
  // the four tall spars: a top and a little rigging on each, a pale glow till lit, then fire
  T.sp = CPM8B.SPARS.map(si => {
    const p = sea.spars[si], g3 = new THREE.Group(), h = Math.max(9, p.h + 4); g3.position.copy(gsv(p.x, p.y, 0)); SG.add(g3);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, h, 7), lam('#2a2420')); mast.position.y = h / 2 - 1; mast.rotation.set(p.lx * 0.4, 0, p.ly * 0.4); g3.add(mast);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 5), lam('#2a2420')); yard.rotation.z = Math.PI / 2 + 0.2; yard.position.y = h - 2; g3.add(yard);
    const rag = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.6), new THREE.MeshLambertMaterial({ color: 0x4a463c, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); rag.position.y = h - 3.4; g3.add(rag);
    const mark = G.glowSp(0x9ad0e0, 7, { opacity: 0.25 }); mark.position.y = h - 1.6; g3.add(mark);
    const fire = G.glowSp(0xff8a3a, 9, { opacity: 0 }); fire.position.y = h - 2.2; g3.add(fire);
    const fl = new THREE.PointLight(0xff8a40, 0, 70, 1.5); fl.position.y = h - 2; g3.add(fl);
    return { g3, mark, fire, fl, rag, h };
  });
}
function cpm8f3d(dt, V) {
  const T = CPM8B3, S = RAID.st, K = S.m8k; if (!T.on || !K) return;
  const t = g.t;
  T.sk.S.position.copy(gsv(K.x, K.y, 0)); T.sk.S.position.y = Math.sin(t * 1.1) * 0.08; T.sk.S.rotation.y = -K.h; T.sk.S.rotation.z = Math.sin(t * 0.9) * 0.05;
  const st = K.row ? Math.sin(t * 2.4) : 0; T.sk.oars.forEach((o, i) => { o.rotation.y = st * 0.5; o.position.y = 0.4 + (i ? 1 : 1) * Math.max(0, st) * 0.1; });
  const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.7); T.sk.halo.material.opacity = 0.75 * fl; T.sk.light.intensity = 1.4 * fl;
  if (T.mar) T.mar.sp.material.rotation = Math.sin(t * 1.2) * 0.03;
  T.sp.forEach((P, i) => { const lit = ((S.m8lit | 0) & (1 << i)) !== 0, f = 0.8 + 0.2 * Math.sin(t * 11 + i) * Math.sin(t * 5.3 + i * 2); P.mark.material.opacity = lit ? 0 : S.m8ring ? 0.2 + 0.12 * Math.sin(t * 2.6 + i) : 0.05; P.fire.material.opacity = lit ? 0.9 * f : 0; P.fire.scale.setScalar(lit ? 9 + 2 * f : 1); P.fl.intensity = lit ? 2.2 * f : 0; P.rag.visible = !lit || Math.sin(t * 3 + i) > -2; });
  if (T.flash > 0) T.flash = Math.max(0, T.flash - dt);
  void V;
}
