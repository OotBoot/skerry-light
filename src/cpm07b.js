'use strict';
// The Chronicle of the Light, mission 7, Part III: Black Nell (cp_m07nell). The same waterfront (src/cpm07.js), the
// yard gate standing open behind you and the three chests in the gig at the steps. Nell comes along the quay from the
// Customs House end for what she thinks is hers, with a few of her men and a long gun.
//  - Nell (ZBT.cpnell, a kind of src/cpm02g.js's gang): she keeps her distance, and her longarm reaches the length of
//    the quay. Before she fires she lays it on one of you, a red line from the muzzle that everyone can see, and then
//    holds it still for the last moment: be off that line, or behind something, when it goes (CPN7.SNIPE_DMG).
//    Now and then she sends up a flare over one of you (src/cpm07.js's flares: her men see whoever is in its light).
//  - At half her strength the drowned come over the quay's edge as well, and she fires quicker.
//  - Put her down: the outro.
// Together, as the rest: the host runs it and sends it as nz (phase, which one she is, her strength, the half).

const CPN7 = { HP: 2.2, SNIPE: 1.75, LOCK: 0.42, SNIPE_END: 2.3, SNIPE_DMG: 3, RANGE: 46, KEEP: 14, FLARE_T: 11, START: [10, -24], FROM: [-63, -3] };
const CPN7_T = Object.assign({}, CPG_T, { snipe: { hit: CPN7.SNIPE, end: CPN7.SNIPE_END }, flare: { hit: 0.7, end: 1.3 } });
ZB_ACT.push('snipe', 'flare');   // (the wire's list of blows: Nell's two after the gang's)
ZBT.cpnell = Object.assign({}, ZBT.cpgang, {
  n: 'Black Nell', N: 'Black Nell', col: '#e88070', bar: ['#8a3a30', '#e88070'], acts: CPN7_T, pts: 1500,
  killLine: (who) => `${who} put Black Nell down.`,
  init(z) { z.aimCd = 1.5; z.snCd = 2.5; z.flCd = 9; },
  cool(z, dt) { ZBT.cpgang.cool(z, dt); if (z.snCd > 0) z.snCd -= dt; if (z.flCd > 0) z.flCd -= dt; },
  think(z, p, d, dz, level) {
    if (!z.aware) cpgWake(z);
    const ez = FPSC.GROUND + (p.jz || 0) + 1.2;
    if (level && d < CPG.CLUB && z.swCd <= 0) return 'club';
    if (z.flCd <= 0 && d < CPN7.RANGE) return 'flare';
    if (z.snCd <= 0 && d < CPN7.RANGE && d > 3 && Math.abs(dz) < 3 && cpgLos(z, p.x, p.y, ez)) return 'snipe';
    // (she keeps her distance: back off from whoever comes close, and hold where she can see you)
    if (d < CPN7.KEEP || (d < CPN7.RANGE && cpgLos(z, p.x, p.y, ez))) return 'wait';
    return null;
  },
  start(z, act) {
    if (act === 'snipe') { z.snCd = (RAID.st.p2 ? 3.2 : 4.6) + Math.random() * 1.4; z.swCd = Math.max(z.swCd, 0.8); z.lockH = null; }
    else if (act === 'flare') { z.flCd = 16 + Math.random() * 6; const P = ZM.players || []; const p = P[(Math.random() * P.length) | 0]; z.ftx = p ? [p.x - FPSC.CX, p.y - FPSC.CY] : null; }
    else ZBT.cpgang.start(z, act);
  },
  during(z, dt, nearest) {
    const p = nearest(z.x, z.y, z.jz);
    if (z.act === 'snipe') { if (p && z.at < CPN7.SNIPE - CPN7.LOCK) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 5); return; }
    if (z.act === 'flare') { if (z.ftx) z.h += angDiff(bearingOf(FPSC.CX + z.ftx[0] - z.x, FPSC.CY + z.ftx[1] - z.y), z.h) * Math.min(1, dt * 5); return; }
    if (z.act === 'wait' && p) {
      const d = Math.hypot(p.x - z.x, p.y - z.y);
      z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 4);
      // (too close: she backs away; otherwise she sidesteps along the quay)
      const back = d < CPN7.KEEP ? -1 : 0, s = z.sp * 0.55 * dt;
      const mx = back ? -Math.sin(z.h) * s : Math.cos(z.h) * s * z.strafe, my = back ? -Math.cos(z.h) * s : -Math.sin(z.h) * s * z.strafe;
      if (!zmMove(z, mx, my)) z.strafe = -z.strafe;
      z.walk = true; return;
    }
    ZBT.cpgang.during(z, dt, nearest);
  },
  // (every screen: the longarm along her line, at whichever of you is on it; the flare, the host's to send up)
  strike(z) {
    if (z.act === 'flare') { cpgSound('whoosh', z.x, z.y); try { sfxFlare(); } catch (e) {} if (ZM.net !== 'client' && z.ftx) { cp7Flare(z.ftx[0], z.ftx[1], CPN7.FLARE_T); if (!RAID.st.said.nf) { RAID.st.said.nf = 1; cpSay('nell', 'Light them up! Let us see them.', 'cp_m07_27'); } } return; }
    if (z.act !== 'snipe') { ZBT.cpgang.strike(z); return; }
    const m = FPS.me, [mx, my, mz] = cpgMuzzle(z), ez = FPSC.GROUND + (m.jz || 0) + 1.25, d = Math.hypot(m.x - mx, m.y - my);
    cpgSound('shot', z.x, z.y); try { fpsWeaponSound('b', d, fpsEar(z.x, z.y)); } catch (e) {}
    for (let i = 0; i < 6; i++) FPS.parts.push({ x: mx, y: my, z: mz, vx: Math.sin(z.h) * 3 + (Math.random() - 0.5), vy: Math.cos(z.h) * 3 + (Math.random() - 0.5), vz: Math.random() * 0.8, t: 0.35, c: '255,200,120' });
    const off = Math.abs(angDiff(bearingOf(m.x - mx, m.y - my), z.h)), onLine = off < Math.atan2(0.55, Math.max(1, d));
    const ok = zbOk() && !(typeof zmIsDown === 'function' && zmIsDown()) && onLine && d < CPN7.RANGE + 4 && Math.abs((m.jz || 0) - (z.jz || 0)) < 3 && cpgLos(z, m.x, m.y, ez);
    if (ok) { fpsHurt(CPN7.SNIPE_DMG, null, null); zmSound('hit'); FPS.hurtT = 1.0; FPS.tracers.push({ a: [mx, my, mz], b: [m.x, m.y, ez], t: 0.14, k: 'p' }); }
    else { const r = fpsRay(mx, my, mz, z.h, 0, null, [], CPN7.RANGE); FPS.tracers.push({ a: [mx, my, mz], b: [r.x, r.y, r.z], t: 0.14, k: 'p' }); }
  },
  actSound(z, act) { if (act === 'snipe') cpgSound('click', z.x, z.y); },
  reset(z, M) {
    const F = M.F;
    if (F && F.M) for (const [k, v] of [['coat', '#2a1416'], ['trim', '#8a2a24'], ['hat', '#141010']]) { const mt = F.M[k]; if (mt) { mt.userData.base.set(v); mt.color.set(v); } }
    M.root.rotation.set(0, 0, 0); M.dead = 0;
  },
  // (posed as one of the gang: her longarm, coming up slowly as she lays it)
  pose(z, M, dt) {
    const q = Object.create(z);
    if (z.act === 'snipe') { q.act = z.at < CPN7.SNIPE ? 'aim' : null; q.at = z.at / CPN7.SNIPE * CPG.AIM; }
    else if (z.act === 'flare') { q.act = 'aim'; q.at = Math.min(CPG.AIM * 0.9, z.at); }
    cpgPose(q, M, dt);
  },
});
ZB_KINDS.push('cpnell');

// (hosting) Nell, along the quay from the Customs House end
function cpn7Spawn(x, y) {
  const n = cp7N(), hp = zbHpOf('moon', ZM.round, n) * CPN7.HP, T = ZBT.cpnell;
  const z = cpgSpawn(x, y, { aware: 1, gun: true, hp, h: Math.PI / 2 });
  zbMake(z, 'cpnell'); T.init(z);
  Object.assign(z, { gunId: 'longarm', sp: CPG.SP * 1.05, nell: 1 });
  return z;
}
const CPN7_PH = ['fight', 'done'];
const CPN7_MAP = Object.assign({}, CP7_MAP, { start: CPN7.START });
const cpn7Nell = () => ZM.z.find(z => z.bt === 'cpnell' && z.zn === RAID.st.nz) || null;
cpStage('m07nell', Object.assign({}, CP7_HOOKS, {
  n: 'Black Nell',
  map: CPN7_MAP,
  set(H, K, Z) {},
  banner: () => ({ text: 'Black Nell', t: 4, sub: 'Part III' }),
  music: () => 'cpm07nell',
  enter() {
    const S = RAID.st;
    cp7Fresh(S, true); Object.assign(S, { ph: 'fight', nz: 0, hk: 1, p2: 0, spT: 12, dT: 6 });
    if (ZM.net === 'client') return;
    const n = cp7N(), z = cpn7Spawn(...CPN7.FROM); S.nz = z.zn;
    for (let i = 0; i < 1 + n; i++) cpgSpawn(CPN7.FROM[0] + (i % 2) * 2.2, CPN7.FROM[1] - 2 - i * 1.8, { aware: 1, gun: Math.random() < 0.6, h: Math.PI / 2 });
    cpObjective('Put Black Nell down');
    S.go = [1.4, 'recv', 'Mind her long gun. When she lays it on you, get out of the line of it!', 'cp_m07_23'];
  },
  tick(dt) {
    const S = RAID.st, n = cp7N(), B = cpn7Nell();
    cp7Beats(); cpgGo(S, dt);
    if (S.ph !== 'fight') return;
    S.hk = B ? clamp(B.hp / B.max, 0, 1) : 0;
    if (!B || B.dead) { S.ph = 'done'; for (const z of ZM.z) if (!z.dead) { z.dead = 1; z.deadT = 0; } cpObjective(''); setTimeout(() => { if (RAID.st === S && !ZM.over) cpDone(); }, 2200); return; }
    if (!S.p2 && S.hk < 0.5) { S.p2 = 1; cpSay('nell', 'Let the sea have the lot of you!', 'cp_m07_25'); ZM.banner = { text: 'The drowned come over the edge', t: 3, col: '#9fd8e8' }; setTimeout(() => { if (RAID.st === S && !ZM.over) cpSay('recv', 'The drowned are coming up the steps! Keep on her!', 'cp_m07_26'); }, 2600); }
    // her men, out of the warehouse doors
    S.spT -= dt;
    if (S.spT <= 0) { S.spT = (S.p2 ? 13 : 17) / Math.sqrt(1 + 0.4 * (n - 1)); if (cpgAlive() < 1 + n) cp7FromDoor(cp7Door(true)); }
    // (from half her strength) the drowned, over the quay's edge
    if (S.p2) {
      S.dT -= dt;
      const live = ZM.z.filter(z => !z.dead && !z.boss).length;
      if (S.dT <= 0) { S.dT = 7 / Math.sqrt(1 + 0.4 * (n - 1)); if (live < 2 + n) raidSpawnAt(FPSC.CX + (Math.random() * 2 - 1) * 50, FPSC.CY + CP7.EDGE + 1.4, { kind: Math.random() < 0.35 ? 'run' : 'jog', hp: zmHp(RAIDC.ROUND + 3) * (1 + 0.3 * (n - 1)), rise: 1.4 }); }
    }
  },
  hurt(d, dmg) { if (d.bt === 'cpnell' && !RAID.st.said.hit) { RAID.st.said.hit = 1; cpSay('nell', 'Stand still, Receiver, and I will make it quick.', 'cp_m07_24'); } return dmg; },
  q(sid, k, a) { cp7Q(sid, k, a); },
  pack(o) { const S = RAID.st; cp7PackAll(o); o.nz = [CPN7_PH.indexOf(S.ph), S.nz, Math.round(S.hk * 1000), S.p2]; },
  apply(o) { const S = RAID.st; cp7ApplyAll(o); const a = o.nz; if (!Array.isArray(a)) return; S.ph = CPN7_PH[a[0] | 0] || 'fight'; S.nz = a[1] | 0; S.hk = (a[2] | 0) / 1000; S.p2 = a[3] | 0; },
  me(dt) { cp7MeAll(dt); },
  consider(c) { cp7Consider(c); },
  prompt(o) { return cp7Prompt(o); },
  use(o) { return /^cp7/.test(o.k); },
  hud(phone, mono, fell) {
    const S = RAID.st;
    if (S.ph === 'fight') cpkBar('BLACK NELL', S.hk, 0, '#e88070');
    const B = cpn7Nell(); if (B && B.act === 'snipe' && B.at < CPN7.SNIPE) cpkLine('She has the longarm laid: get off her line!', 1, B.at > CPN7.SNIPE - CPN7.LOCK ? '#ff8070' : '#ffd27a');
    cp7LightHud(2);
    cp7ShownHud(phone); cphHud();
  },
  b3(grp) { cp7Build3D(grp); cpn7Build3D(grp); },
  f3(dt) { cp7Frame3D(dt); cpn7Frame3D(dt); },
  exit() { cplReset(); CP73.ok = false; CPN73.line = null; },
  mend: false,
}));

// ---------- her line: a thin red thread from the muzzle, as far as it reaches, while she lays the longarm ----------
const CPN73 = { line: null };
function cpn7Build3D(grp) {
  const m = new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const L = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1), m); L.visible = false; grp.add(L); CPN73.line = L;
  // (the chests in the gig, as they were left)
  CPN73.ch = [0, 1, 2].map(i => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.62), z3Lam(['#5a3a22', '#4a3020', '#3a3a3a'][i])); grp.add(b); return b; });
}
function cpn7Frame3D(dt) {
  const L = CPN73.line; if (!L) return;
  if (CP73.gig && CPN73.ch) CPN73.ch.forEach((b, i) => { const p = CP73.gig.position; b.position.set(p.x + (i - 1) * 0.5, p.y + 0.6, p.z + (i - 1) * 1.4); b.rotation.y = 0.15; });
  const B = cpn7Nell();
  if (!B || B.dead || B.act !== 'snipe' || B.at >= CPN7.SNIPE) { L.visible = false; return; }
  const [mx, my, mz] = cpgMuzzle(B), r = fpsRay(mx, my, mz, B.h, 0, null, [], CPN7.RANGE), len = Math.max(1, Math.hypot(r.x - mx, r.y - my));
  const a = z3v(mx, my, mz), b = z3v(mx + Math.sin(B.h) * len, my + Math.cos(B.h) * len, mz);
  L.position.copy(a).add(b).multiplyScalar(0.5); L.lookAt(b); L.scale.set(1, 1, len);
  const lock = B.at > CPN7.SNIPE - CPN7.LOCK;
  L.material.opacity = lock ? 0.85 + 0.15 * Math.sin(g.t * 40) : 0.25 + 0.35 * (B.at / CPN7.SNIPE); L.scale.x = L.scale.y = lock ? 1.8 : 1; L.visible = true;
}
