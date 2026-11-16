'use strict';
// The Chronicle of the Light, mission 5, Part I: The Strand (cp_m05sand). 2 January 1888, at dawn, on the strand
// across the water from the Light: a spit of sand with the surf all round it, the Light on its rock to the south,
// the sky red over the headland as if the hills were burning, and the rocks in the bay warm, steaming where the
// surf runs over them. The keeper is down at the tide line with his lantern.
//  - The prints. A line of small shoe prints comes up out of the surf in the north-west and wanders south along the
//    tide line, each glowing faintly blue. Walk up to the next and the one after shows; the drowned come up out of
//    the warm sand by the steaming rocks as you go, and now and then right where the prints lead.
//  - At the last print, on the south point, he's standing on the sand looking up at the Light: Plimsoll, in the
//    Gannet's cabin boy's blue shoes (a cinematic, m05_plim). He walks back into the sea, and the surf boils.
//  - Then hold the strand until the sun is up (CPM5S.HOLD seconds, the dawn bar): the drowned come up out of the
//    surf all round the south shore, more of you more of them. The old fog bell on its frame by the point (Use:
//    CPM5S.BELL_CD to swing again) sends every one of them within CPM5S.BELL_R back under the sand. At sunrise
//    they sink away, and the part is done.
// Laid out by FPI_GEN.cpm05sand (its look FPS_ISLES.cpm05sand: Smugglers' Cove's sand, its sky and fog the dawn's);
// the Light far off over the water is src/zombies.js's (Z.far). Host-authoritative: the host runs the prints, the
// drowned, the hold and the bell, and sends them in m5s; a joined player asks to ring the bell (raidAsk 'm5bell').
// Lines through cpSay (cp_m05_23 on), events through cpEvent ('m5bell', 'm5print').

const CPM5S = {
  R: 56, START: [-14, 34], HOLM: [-13, 40], PLIM: [10, -46], BELL: [-2, -24], BELL_CD: 14, BELL_R: 24, HOLD: 55, NEAR: 3.2,
  // the prints, from the surf in the north-west round to the south point
  PRINTS: [[-40, 24], [-37, 12], [-38, -2], [-31, -14], [-20, -25], [-8, -33], [3, -40]],
  // the warm rocks: where the drowned come up while you follow the prints
  WARM: [[-24, 10], [-12, -10], [14, -16], [22, 8], [-28, -32], [4, 14], [-44, 0], [18, -34]],
  LEVEL: 4,
};
const CPM5S_PH = ['trail', 'plim', 'surge', 'dawn'];

// ---------- its look, and laying it out ----------
FPS_ISLES.cpm05sand = Object.assign({}, FPS_ISLES.cove, { name: 'the strand under the Light', rocks: [0, 3, 6, 1], wrecks: [0], sky: '255,104,64', skyA: 0.2,
  fog: ['#2a140e', 40, 420], mist: '140,70,44', mistA: 0.12, birds: ['gull', 3], tufts: ['#7a6a40', 30], pebbles: 120, pools: 5, wrack: 90, indoor: false, keep: false, arena: false, noGround: false, nLights: 4 });
FPI_GEN.cpm05sand = {
  built: true,
  set(H) {
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }, W = (x, y) => [H.CX + x, H.CY + y], R = H.R;
    // the Light, far off across the water to the south, lit and turning
    Z.far = { X: 30, Y: -330 };
    // the warm rocks, steaming: low black boulders in the sand (their steam and glow are the stage's)
    for (const [x, y] of CPM5S.WARM) { const [wx, wy] = W(x, y); H.put('stone', wx, wy, R(0, H.TAU), { w: R(2.2, 3.4), d: R(1.6, 2.6), hh: R(0.7, 1.2) }); }
    // where the keeper came down: his boat drawn up, a lantern on a post, a coil of rope and his creel
    { const [x, y] = W(-20, 42); H.put('boat', x, y, 0.35, { len: 4.6, beam: 1.6, paint: '#34465a' }); }
    { const [x, y] = W(-22, 35); fpiLanternPost(H, x, y, 0.2); }
    // the old fog bell on its frame, by the point, and a drift of wrack and timber round the strand
    { const [x, y] = W(...CPM5S.BELL); H.put('bellframe', x, y, 0.3, {}); }
    for (const [x, y, a, l] of [[16, 26, 0.6, 4.2], [30, -10, 2.1, 3.4], [-6, 30, 1.2, 2.8], [26, 22, 2.8, 3.6], [-34, -24, 0.4, 3.2]]) { const [wx, wy] = W(x, y); H.put('log', wx, wy, a, { len: l, rad: 0.24 }); }
    // the ribs of an old wreck half buried on the east side, and a few stakes of a fish weir
    { const [x, y] = W(34, 6); H.wrecks.push({ x, y, r: 6.5, ang: 1.1, lean: 0.4, name: 'a wreck', ribs: 5 }); }
    for (let i = 0; i < 6; i++) { const [x, y] = W(38 + i * 1.6, -22 - i * 2.2); H.put('post', x, y, 0, { r: 0.1, hh: 1.1 }); }
    // a little light about the place: the keeper's lantern, and the glow off the warm rocks
    for (const [x, y] of CPM5S.WARM.slice(0, 4)) H.light(H.CX + x, H.CY + y, 0.6, '#ff7a40', 5, 'lantern');
    H.light(H.CX + CPM5S.HOLM[0] + 0.5, H.CY + CPM5S.HOLM[1], 1.2, '#ffc070', 7, 'lantern');
    ZMD.START = CPM5S.START.slice();
  },
  props(H) { fpiScatter(H, 6, 1.4, 12, H.IR - 10, 3, (x, y) => H.put('stone', x, y, H.R(0, H.TAU), { w: H.R(0.8, 1.6), d: H.R(0.6, 1.2), hh: H.R(0.3, 0.6) }, true)); },
  decor() {},
};

// ---------- the stage ----------
cpStage('m05sand', {
  n: 'The Strand', mend: true,
  map: { start: CPM5S.START.slice(), top: 0, R: CPM5S.R, isle: 'cpm05sand', shore: () => -999, nav: [-CPM5S.R, CPM5S.R, -CPM5S.R, CPM5S.R], zones: { strand: { n: 'the strand', r: [-CPM5S.R, CPM5S.R, -CPM5S.R, CPM5S.R], sky: true } } },
  music: () => 'cpm05dawn',
  prep() { cpm5Biome('ember'); },
  enter() {
    Object.assign(RAID.st, { m5: true, ph: 'trail', pi: 0, holdT: 0, bellCd: 0, spT: 5, ambT: 0, pend: 0, said: {}, dawnT: 0, ring: 0, look: 0 });
    ZM.round = Math.max(ZM.round, CPM5S.LEVEL);
    FPS.me.h = Math.PI * 0.9;
    if (ZM.net === 'client') return;
    cpm5sNext();
  },
  tick(dt) { cpm5sTick(dt); },
  me(dt) { cpm5sMe(dt); },
  q(sid, k) { if (k === 'm5bell') cpm5sBell(sid); },
  pack(o) { const S = RAID.st; o.m5s = [CPM5S_PH.indexOf(S.ph), S.pi, Math.round(S.holdT * 10), Math.round(S.bellCd * 10)]; },
  apply(o) { const S = RAID.st, a = o.m5s; if (!Array.isArray(a)) return; S.ph = CPM5S_PH[a[0] | 0] || 'trail'; S.pi = a[1] | 0; S.holdT = (a[2] | 0) / 10; S.bellCd = (a[3] | 0) / 10; },
  consider(c) { const S = RAID.st; if (S.ph === 'surge' || S.ph === 'trail') { const [x, y] = cpkW(...CPM5S.BELL); c({ k: 'm5bell' }, x, y, 0, 2.6, false); } },
  prompt(o) { if (o.k !== 'm5bell') return null; const S = RAID.st; return S.bellCd > 0 ? { text: `The old fog bell: still swinging (${Math.ceil(S.bellCd)} s)` } : S.ph === 'surge' ? { text: 'Ring the fog bell (sends the drowned near it back under)', free: true } : { text: 'The old fog bell: ring it when they come', free: true }; },
  use(o) { if (o.k !== 'm5bell') return false; const S = RAID.st; if (S.bellCd > 0 || S.pend > 0) { zmSound('no'); return true; } S.pend = 0.8; raidAsk('m5bell'); return true; },
  hud(phone, mono, fell) { cpm5sHud(phone, mono, fell); },
  b3(grp) { cpm5s3dBuild(grp); },
  f3(dt) { cpm5s3d(dt); },
  exit() { const T = CPM5S3; if (T.holm) cpkNpcFree(T.holm); CPM5S3.on = false; CPM5S3.holm = null; },
});

// ---------- hosting or alone ----------
// the next print to make for (or, past the last, the point where he stands)
function cpm5sNext() {
  const S = RAID.st, i = S.pi, P = CPM5S.PRINTS;
  if (i < P.length) { cpObjective(i ? 'Follow the blue prints along the tide line' : 'Something came up out of the surf: follow the prints'); cpWaypoint(P[i][0], P[i][1], 'The prints', 0.3); }
  else { cpObjective('Go to the south point'); cpWaypoint(CPM5S.PLIM[0], CPM5S.PLIM[1], 'The point', 1.5); }
}
function cpm5sTick(dt) {
  const S = RAID.st, n = Math.max(1, ZM.hum.length); if (!S.m5) return;
  if (S.bellCd > 0) S.bellCd = Math.max(0, S.bellCd - dt);
  const alive = ZM.z.filter(z => !z.dead).length;
  if (S.ph === 'trail') {
    const P = CPM5S.PRINTS;
    if (S.pi < P.length) {
      const [x, y] = cpkW(...P[S.pi]);
      if (cpkNear(x, y, CPM5S.NEAR)) {
        S.pi++; cpEvent('m5print', S.pi);
        const L = { 2: ['holm', 'Small feet, and turned in a little. A boy’s, by the stride.', 'cp_m05_23'], 4: ['holm', 'Look how the sand’s glazed round them, as if something hot had stood here.', 'cp_m05_24'], 6: ['holm', 'They go on to the point. Whatever it is, it’s still here.', 'cp_m05_25'] }[S.pi];
        if (L) cpSay(...L);
        // (now and then, right where the prints lead: one up out of the sand ahead of you)
        if (S.pi % 2 === 1 && S.pi < P.length) { const [ax, ay] = cpkW(...P[S.pi]); cpm5sRise(ax + (Math.random() - 0.5) * 6, ay + (Math.random() - 0.5) * 6, 'jog'); }
        cpm5sNext();
      }
    } else {
      const [x, y] = cpkW(...CPM5S.PLIM);
      if (cpkNear(x, y, 14)) {
        S.ph = 'plim'; cpWaypoint(null); cpObjective('');
        for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash');
        cpCine('m05_plim', () => { S.ph = 'surge'; S.holdT = 0; S.spT = 1.5; cpObjective('Hold the strand until the sun is up'); cpWaypoint(CPM5S.BELL[0], CPM5S.BELL[1], 'The fog bell', 2.2); cpEvent('m5surge'); });
      }
    }
    // the drowned, up out of the warm sand by the steaming rocks: a few at a time
    S.spT -= dt;
    if (S.spT <= 0) { S.spT = (6 + Math.random() * 4) / Math.sqrt(n); if (alive < 2 + n) { const [wx, wy] = CPM5S.WARM[(Math.random() * CPM5S.WARM.length) | 0], [x, y] = cpkW(wx + (Math.random() - 0.5) * 4, wy + (Math.random() - 0.5) * 4); if (!cpkNear(x, y, 9)) cpm5sRise(x, y); } }
  } else if (S.ph === 'surge') {
    S.holdT += dt;
    const k = S.holdT / CPM5S.HOLD;
    if (S.holdT > 20 && !S.said.half) { S.said.half = 1; cpSay('holm', 'Look east: the hills are going grey. Hold on!', 'cp_m05_26'); }
    if (S.holdT > 42 && !S.said.sun) { S.said.sun = 1; cpSay('holm', 'There’s the rim of the sun. They hate it. Hold!', 'cp_m05_27'); }
    S.spT -= dt;
    if (S.spT <= 0) {
      S.spT = (2.6 - 1.0 * k) * (0.75 + Math.random() * 0.5) / Math.sqrt(1 + 0.5 * (n - 1));
      if (alive < Math.round(4 + 2 * n + k * 3)) for (let t = 0; t < 12; t++) { const a = -Math.PI * (0.05 + Math.random() * 0.9), d = CPM5S.R - 4 - Math.random() * 5, [x, y] = cpkW(Math.cos(a) * d, Math.sin(a) * d); if (cpkNear(x, y, 10)) continue; cpm5sRise(x, y, Math.random() < 0.15 + 0.2 * k ? 'run' : 'jog'); break; }
    }
    if (S.holdT >= CPM5S.HOLD) { S.ph = 'dawn'; S.dawnT = 0; cpWaypoint(null); cpObjective(''); for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); cpEvent('m5dawn'); cpSay('holm', 'Sunrise. They’re gone back under. And so is he, whatever he was.', 'cp_m05_28'); }
  } else if (S.ph === 'dawn') { S.dawnT += dt; if (S.dawnT > 6) cpDone(); }
}
function cpm5sRise(x, y, kind) {
  const n = Math.max(1, ZM.hum.length), u = Math.random();
  const z = raidSpawnAt(x, y, { kind: kind || (u < 0.12 ? 'run' : u < 0.7 ? 'jog' : 'walk'), hp: zmHp(CPM5S.LEVEL) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)), rise: 1.3 });
  if (z) zmSound('moan', Math.hypot(x - FPS.me.x, y - FPS.me.y), fpsEar(x, y), z.kind);
  return z;
}
// (hosting or alone) the fog bell rung: every one of them near it back under the sand
function cpm5sBell(sid) {
  const S = RAID.st; if (S.bellCd > 0 || S.ph === 'plim' || S.ph === 'dawn') return;
  S.bellCd = CPM5S.BELL_CD; const [bx, by] = cpkW(...CPM5S.BELL); let n = 0;
  for (const z of ZM.z) if (!z.dead && Math.hypot(z.x - bx, z.y - by) < CPM5S.BELL_R) { zmKill(z, false, '', 'flash'); n++; }
  cpEvent('m5bell', [sid === FPS.me.id ? '' : String(sid || ''), n]);
}
cpOn('m5bell', a => {
  CPM5S3.ring = 1;
  try { if (!soundOff()) sfxBell(); } catch (e) {}
  const who = Array.isArray(a) && a[0] ? ((ZM.hum || []).find(h => h[0] === a[0]) || [])[1] || 'Someone' : '', n = Array.isArray(a) ? a[1] | 0 : 0;
  fpsFeed((who ? `${who} rang the old fog bell` : 'The old fog bell rings out over the strand') + (n ? `, and ${n} of them sink back under the sand.` : '.'));
});
cpOn('m5print', i => { try { if (!soundOff()) sfxSqueak(0, 0.35); } catch (e) {} if (i === 1) fpsFeed('A print in the wet sand, glowing faintly blue. Another beyond it.'); });
cpOn('m5surge', () => { ZM.banner = { text: 'Hold the strand', t: 4, sub: 'until the sun is up · the old fog bell by the point sends them back', col: '#ffd0a0' }; try { if (!soundOff()) sfxSplash(0, 0.8); } catch (e) {} });
cpOn('m5dawn', () => { ZM.banner = { text: 'Sunrise', t: 4, sub: 'they sink away into the sand', col: '#ffe2a8' }; if (typeof raidRespawn === 'function') raidRespawn(); });

// ---------- everyone ----------
function cpm5sMe(dt) {
  const S = RAID.st; if (!S.m5) return;
  if (S.pend > 0) S.pend -= dt;
  if (ZM.net === 'client' && S.bellCd > 0) S.bellCd = Math.max(0, S.bellCd - dt);
  // the surf, and now and then a hiss off the warm rocks
  S.ambT -= dt; if (S.ambT <= 0) { S.ambT = 3 + Math.random() * 4; try { if (!soundOff()) noise('bandpass', 2400, 1.2, 0.3, 0.9, 0.05, { pan: (Math.random() - 0.5) * 1.4 }); } catch (e) {} }
}
function cpm5sHud(phone, mono, fell) {
  const S = RAID.st; if (!S.m5 || S.ph !== 'surge') return;
  const L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 72 : 96), w = phone ? 150 : 214, h = phone ? 6 : 8, k = clamp(S.holdT / CPM5S.HOLD, 0, 1);
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(L - 4, top - 4, w + 8, h + 22);
  ctx.fillStyle = 'rgba(80,60,50,0.6)'; ctx.fillRect(L, top, w, h); ctx.fillStyle = '#ffb070'; ctx.fillRect(L, top, w * k, h);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(255,220,180,0.85)';
  ctx.fillText(`SUNRISE · ${Math.max(0, Math.ceil(CPM5S.HOLD - S.holdT))} s   BELL · ${S.bellCd > 0 ? Math.ceil(S.bellCd) + ' s' : 'READY'}`, L, top + h + 4);
  fpsHudNote(top + h + 20); ctx.textBaseline = 'alphabetic';
}

// ---------- in 3D: the prints, the steam off the warm rocks, the keeper, the shark on the point, the dawn ----------
const CPM5S3 = { on: false, holm: null, ring: 0 };
function cpm5s3dBuild(grp) {
  const T = CPM5S3; T.on = true; T.ring = 0;
  const G0 = FPSC.GROUND, soft = z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const glow = (c, s, o) => { const g0 = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o == null ? 0.6 : o })); g0.scale.setScalar(s); return g0; };
  // the prints: a pair of small shoe shapes each, pressed into the sand, faintly blue, in the walk's direction
  const shoe = new THREE.Shape(); shoe.moveTo(0, -0.13); shoe.quadraticCurveTo(0.06, -0.12, 0.055, 0); shoe.quadraticCurveTo(0.06, 0.14, 0, 0.14); shoe.quadraticCurveTo(-0.06, 0.14, -0.055, 0); shoe.quadraticCurveTo(-0.06, -0.12, 0, -0.13);
  const sg = new THREE.ShapeGeometry(shoe).rotateX(-Math.PI / 2);
  T.prints = CPM5S.PRINTS.map((p, i) => {
    const q = CPM5S.PRINTS[i + 1] || CPM5S.PLIM, a = Math.atan2(q[0] - p[0], q[1] - p[1]), g3 = new THREE.Group(), [x, y] = cpkW(...p);
    g3.position.copy(z3v(x, y, G0 + 0.03)); g3.rotation.y = -a; grp.add(g3);
    const mat = new THREE.MeshBasicMaterial({ color: 0x6ed7ff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
    // (a few steps leading into it, and out)
    for (let k = -2; k <= 1; k++) for (const s of [-1, 1]) { const m = new THREE.Mesh(sg, mat); m.position.set(s * 0.12, 0, -(k * 0.62 + (s > 0 ? 0.31 : 0))); g3.add(m); }
    const gl = glow(0x5fd3ff, 2.6, 0.35); gl.position.y = 0.3; g3.add(gl);
    return { g3, mat, gl };
  });
  // steam off the warm rocks, and their glow
  T.steam = [];
  for (const [x0, y0] of CPM5S.WARM) for (let k = 0; k < 4; k++) { const s = glow(0xd8c8b8, 1.6, 0); const [x, y] = cpkW(x0 + (Math.random() - 0.5) * 2, y0 + (Math.random() - 0.5) * 2); s.position.copy(z3v(x, y, G0 + 0.8)); grp.add(s); T.steam.push({ s, x, y, ph: Math.random() }); }
  T.warm = CPM5S.WARM.map(([x0, y0]) => { const s = glow(0xff6a30, 4.5, 0.25); const [x, y] = cpkW(x0, y0); s.position.copy(z3v(x, y, G0 + 0.5)); grp.add(s); return s; });
  // the keeper, at the foot of the path by his boat, his lantern lifted
  T.holm = cpkNpc(['#1e2436', '#d8d0bc', '#8a7a4a', '#ffd88a']);
  // the shark, standing on the point (far off at first), looking up at the Light
  T.plim = cpm5PlimActor(grp, 2.7, false); { const [x, y] = cpkW(...CPM5S.PLIM); T.plim.P.position.copy(z3v(x, y, G0)); } T.plim.P.visible = false;
  // the bell's ring, spreading over the sand; and the sun coming up out of the east
  T.ringM = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  { const [x, y] = cpkW(...CPM5S.BELL); T.ringM.position.copy(z3v(x, y, G0 + 0.2)); } grp.add(T.ringM);
  T.sun = glow(0xffa860, 260, 0); { const [x, y] = cpkW(420, 40); T.sun.position.copy(z3v(x, y, -20)); } T.sun.material.fog = false; grp.add(T.sun);
}
function cpm5s3d(dt) {
  const T = CPM5S3, S = RAID.st; if (!T.on || !S.m5) return;
  const t = g.t, G0 = FPSC.GROUND;
  T.prints.forEach((P, i) => { const shown = i < S.pi + 1 && S.ph === 'trail' || (S.ph !== 'trail' && i < CPM5S.PRINTS.length), next = i === S.pi && S.ph === 'trail'; P.g3.visible = shown; P.mat.opacity = next ? 0.55 + 0.35 * Math.sin(t * 3) : 0.35; P.gl.material.opacity = next ? 0.3 + 0.15 * Math.sin(t * 3) : 0.06; });
  for (const q of T.steam) { const k = (t * 0.25 + q.ph) % 1; q.s.position.y = G0 + 0.5 + k * 2.6; q.s.material.opacity = 0.16 * Math.sin(k * Math.PI); q.s.scale.setScalar(1 + k * 2.2); }
  T.warm.forEach((s, i) => { s.material.opacity = 0.18 + 0.08 * Math.sin(t * 1.3 + i); });
  if (T.holm) { const [x, y] = cpkW(...CPM5S.HOLM); cpkNpcPose(T.holm, { x, y, h: Math.atan2(FPS.me.x - x, FPS.me.y - y), lan: true, dt }); }
  // the shark: on the point once you're most of the way along the prints, gone once he's walked into the sea
  T.plim.P.visible = S.ph === 'trail' && S.pi >= 3 && !cpCineOn(); T.plim.sp.material.rotation = Math.sin(t * 1.2) * 0.03; T.plim.shoes.forEach((s, i) => s.material.opacity = 0.6 + 0.3 * Math.sin(t * 4 + i));
  if (T.ring > 0) { T.ring = Math.max(0, T.ring - dt / 1.6); const k = 1 - T.ring; T.ringM.scale.setScalar(1 + k * CPM5S.BELL_R); T.ringM.material.opacity = T.ring * 0.7; } else T.ringM.material.opacity = 0;
  // the dawn: the sun's glow coming up over the east as you hold, and the fog going from red to gold
  const dawn = S.ph === 'surge' ? clamp(S.holdT / CPM5S.HOLD, 0, 1) : S.ph === 'dawn' ? 1 : 0;
  T.sun.material.opacity = dawn * dawn * 0.75; T.sun.position.y = -30 + dawn * 50;
  if (GL3D.scene && GL3D.scene.fog) { const F = GL3D.scene.fog; F.color.setRGB(0.16 + 0.2 * dawn, 0.08 + 0.12 * dawn, 0.055 + 0.05 * dawn); RAID.fog0 = true; }
  if (GL3D.amb) GL3D.amb.intensity = Math.max(GL3D.amb.intensity, 0.3 + 0.35 * dawn);
}
