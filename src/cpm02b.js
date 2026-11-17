'use strict';
// The Chronicle of the Light, mission 2, Part III: the Sea Wall (cp_m02wall). The top of the sea fort's sea wall
// (src/raidfort.js's fort: its Sea Battery is just to the west, through the gate by the garita), a long stone walk
// between a crenellated parapet over the sea and the low wall over the fort's roofs, with the round bastion at its
// east end. Along the parapet stand the gibbets where the governors hang the wreckers in chains, so the ships can see.
//  - The Watch (ph 'guard'): Black Jago hangs in his cage on the third gibbet, and his gang comes up the wall on lines
//    to cut him down. Hold the wall: CP2W.GUARD of them put down (more with more of you). Any of them who stands at
//    the foot of his gibbet for CP2W.CUT seconds cuts him down, and the mission is lost.
//  - The tide turns (a cutscene, m02_return): the gibbets' lanterns kindle by themselves, his cage hangs open, and the
//    Mooncusser comes up over the parapet (src/zmboss2.js's, much stronger here: CP2W.HP).
//  - The Mooncusser (ph 'boss'): while any lantern on the gibbets burns, nothing touches him. Hold Use at a gibbet's
//    foot to put its lantern out. All of them dark: he can be hurt, for CP2W.OPEN seconds; then he lifts his pole and
//    some of them kindle again (all of them, once he's at half his strength, and he's quicker). The hanged on the
//    other gibbets come down after you all the while (the drowned, up at the gibbets' feet). He falls: the outro.
// Together, as the rest: the host runs it and sends it as m2w (phase, which lanterns burn, the time open, the half,
// how near the cage is to being cut); a joined player asks the host to put a lantern out (raidAsk 'lan').

const CP2W = { R: 44, X: 36, Y: 6.1, GUARD: 7, CUT: 5, HP: 3.2, OPEN: 17, LAN: 1.2, GIB: [-24, -8, 8, 24], JAGO: 2, GY: -4.9, START: [-31, 2] };
FPS_ISLES.cpm02w = Object.assign({}, FPS_ISLES.raid, { name: 'the sea wall', ground: '#6a6458', ground2: '#5a554a', path: '#625c50', fog: ['#06090d', 40, 300], sky: '50,60,90', skyA: 0.05,
  indoor: true, noGround: true, keep: true, nLights: 6, birds: ['bat', 0] });
// a gibbet: a tall post braced to the parapet, its arm out over the sea, the cage on its chain, a lantern at the arm
FPI_K.cp2gib = {
  col: FPI_C.wood3,
  sol(p) { return [fpiCirc(p, 0, 0, 0.3, 5.2)]; },
  b3(p, A) {
    A.box(FPI_C.stone2, 0, 0, 0, 0.9, 0.9, 0.35);
    A.cyl(FPI_C.wood3, 0, 0, 0.3, 0.17, 5.1, 0, 0, 0, 'cyl6');
    A.box(FPI_C.wood3, 0, -1.25, 5.0, 0.2, 2.9, 0.22);
    A.box(FPI_C.wood3, 0, -0.55, 4.25, 0.12, 1.5, 0.12, 0, 0.75);
    A.box(FPI_C.iron, 0, -2.5, 4.0, 0.04, 0.04, 1.0);
    if (!p.empty) {
      // the cage: iron bands and bars, a shape in it bowed over its chains (kept dark)
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; A.box(FPI_C.iron, Math.cos(a) * 0.36, -2.5 + Math.sin(a) * 0.36, 2.0, 0.035, 0.035, 2.0); }
      for (const z of [2.0, 2.7, 3.4, 4.0]) A.part('torus', FPI_C.iron, 0, -2.5, z, 0.75, 0.6, 0.75, 0, Math.PI / 2);
      if (p.held) { A.box('#141210', 0, -2.5, 2.25, 0.36, 0.28, 0.9); A.part('sph', '#141210', 0, -2.48, 3.3, 0.24, 0.26, 0.24); }
    }
    A.box(FPI_C.iron, 0, -0.3, 3.6, 0.22, 0.22, 0.04); A.box(FPI_C.iron, 0, -0.3, 3.95, 0.24, 0.24, 0.05); A.part('cone', FPI_C.iron, 0, -0.3, 4.03, 0.26, 0.12, 0.26);
  },
};
// a garita, the stone sentry box on a corner of the wall, with its little dome
FPI_K.cp2garita = {
  col: FPI_C.stone3,
  sol(p) { return [fpiCirc(p, 0, 0, 1.15, 3.2)]; },
  b3(p, A) { A.cyl('#8a7e66', 0, 0, 0, 1.15, 2.6, 0, 0, 0, 'cyl8'); A.part('sph', '#8a7e66', 0, 0, 2.6, 2.4, 1.6, 2.4); A.part('cone', '#a29274', 0, 0, 3.5, 0.3, 0.7, 0.3); A.box('#1a1714', 0, -1.1, 0.4, 0.6, 0.1, 1.6); },
};
FPI_GEN.cpm02w = {
  built: true,
  set(H) {
    const { CX, CY } = H, X = CP2W.X, Y = CP2W.Y;
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    // the parapet over the sea: merlons and embrasures; the low wall over the fort's roofs
    for (let x = -X; x < X; x += 2.4) {
      H.put('wall', CX + x + 0.6, CY - Y - 0.5, 0, { len: 1.2, th: 0.9, hh: 1.95, jag: 0, mat: 'stone' });
      H.put('wall', CX + x + 1.8, CY - Y - 0.5, 0, { len: 1.2, th: 0.9, hh: 1.05, jag: 0, mat: 'stone' });
    }
    H.wall(CX - X, CY + Y + 0.5, CX + X, CY + Y + 0.5, { hh: 1.15, th: 0.8, jag: 0, cap: true, mat: 'stone' });
    // the ends: the Battery's gate and its garita to the west, the bastion's wall to the east
    H.put('wall', CX - X - 0.5, CY, Math.PI / 2, { len: Y * 2 + 2, th: 1, hh: 3.2, jag: 0, mat: 'stone' });
    H.put('wall', CX + X + 0.5, CY, Math.PI / 2, { len: Y * 2 + 2, th: 1, hh: 4.5, jag: 0, mat: 'stone' });
    H.put('cp2garita', CX - X + 1.2, CY - Y + 1.3, 0, {});
    // the gibbets along the parapet, Jago's the third
    CP2W.GIB.forEach((x, i) => H.put('cp2gib', CX + x, CY + CP2W.GY, 0, { held: i === CP2W.JAGO, empty: false }));
    // the battery's guns at the west end, a pyramid of shot, a powder tub
    for (const x of [-27, -16]) H.put('cannon', CX + x, CY - 3.2, Math.PI / 2, { len: 2.6 });
    fpiBarrels(H, CX - 12, CY + 4.2); fpiCrates(H, CX + 15, CY + 4.4, false);
    H.put('cannon', CX + 31, CY - 3.0, Math.PI / 2 + 0.2, { len: 2.4 });
    // its lanterns: at the gate, and at the bastion (the fort's own, always lit)
    H.light(CX - X + 1, CY + 3, 2.4, '#ffc070', 10, 'lantern'); H.light(CX + X - 1, CY + 2, 2.4, '#ffc070', 9, 'lantern');
    Z.cp2w = {};
  },
  decor() {},
};
const CP2W_MAP = { start: CP2W.START, top: 0, R: CP2W.R, isle: 'cpm02w', seed: 0x2c0df, shore: () => -999, nav: [-CP2W.X - 2, CP2W.X + 2, -CP2W.Y - 2, CP2W.Y + 2], zones: { wall: { n: 'the sea wall', r: [-CP2W.X, CP2W.X, -CP2W.Y, CP2W.Y], sky: true } } };
const CP2W_PH = ['guard', 'rise', 'boss', 'done'];
const cp2wLanAt = i => [FPSC.CX + CP2W.GIB[i], FPSC.CY + CP2W.GY - 0.3];
const cp2wShield = () => (RAID.st.lan || []).some(Boolean);
// (hosting) the Mooncusser, up over the parapet at x
function cp2wBoss(x) {
  const n = cp2N(), T = ZBT.moon, hp = zbHpOf('moon', ZM.round, n) * CP2W.HP;
  const zn = ++ZM.zc, wx = FPSC.CX + x, wy = FPSC.CY - CP2W.Y + 1;
  const z = {
    drowned: true, zm: true, boss: true, bt: 'moon', zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss',
    x: wx, y: wy, jz: 0, fl: 0, hp, max: hp, sp: T.sp(ZM.round) * 1.05,
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy, cp2m: 1,
  };
  T.init(z); zbMake(z, 'moon'); ZM.z.push(z); FPS.drowned = ZM.z; ZB.seen.add(zn);
  return z;
}

cpStage('m02wall', {
  n: 'The Sea Wall',
  map: CP2W_MAP,
  set(H, K, Z) {},
  banner: () => ({ text: 'The Sea Wall', t: 4, sub: 'Part III · three nights later' }),
  music: () => RAID.st.ph === 'boss' ? 'cpm02boss' : 'cpm02wall',
  block(x, y) { return Math.abs(x - FPSC.CX) > CP2W.X - 0.3 || Math.abs(y - FPSC.CY) > CP2W.Y - 0.3; },
  enter() {
    const S = RAID.st;
    Object.assign(S, { ph: 'guard', kills: 0, need: 0, spT: 2, cut: 0, lan: [0, 0, 0, 0], open: 0, p2: 0, bz: 0, dT: 6, said: {}, hk: 1 });
    cplReset();
    CP2W.GIB.forEach((x, i) => cplAdd(x, CP2W.GY - 0.3, 3.8, '#ffb24a', 13, { on: false, s: 1.0 }));
    CPG.sees = null; CPG.atGoal = cp2wAtGoal; CPG.lit = null;
    if (ZM.net === 'client') return;
    S.need = CP2W.GUARD + 2 * (cp2N() - 1);
    cpObjective('Keep the gang off Jago’s gibbet');
    cpWaypoint(CP2W.GIB[CP2W.JAGO], CP2W.GY, 'Jago’s gibbet', 2.5);
  },
  tick(dt) {
    const S = RAID.st, n = cp2N();
    if (S.ph === 'guard') {
      // up the wall on their lines, over the parapet, and for his gibbet
      S.spT -= dt;
      const alive = cpgAlive(), left = S.need - S.kills;
      if (S.spT <= 0 && alive < Math.min(left, 2 + n)) {
        S.spT = (5.5 - Math.min(2, S.kills * 0.2)) / Math.sqrt(1 + 0.4 * (n - 1)) * (0.8 + Math.random() * 0.4);
        let x = 0; for (let t = 0; t < 8; t++) { x = (Math.random() * 2 - 1) * (CP2W.X - 4); if (Math.abs(x - CP2W.GIB[CP2W.JAGO]) > 7 && !(ZM.players || []).some(p => Math.hypot(p.x - FPSC.CX - x, p.y - FPSC.CY + CP2W.Y) < 5)) break; }
        const z = cpgSpawn(x, -CP2W.Y + 0.9, { aware: 1, gun: Math.random() < 0.55, h: 0 });
        if (z) { z.goal = [CP2W.GIB[CP2W.JAGO] + (Math.random() - 0.5) * 1.2, CP2W.GY + 1.1]; z.goalD = 4.5; for (let k = 0; k < 6; k++) fpsPuff(z.x, z.y - 0.6, FPSC.GROUND + 1.2, '150,150,140', 2); cp2Feed('A line comes up over the parapet.'); }
      }
      // at his gibbet: cutting him down
      const at = cpgAll().filter(z => z.goal && Math.hypot(z.x - FPSC.CX - CP2W.GIB[CP2W.JAGO], z.y - FPSC.CY - CP2W.GY - 1.1) < 1.6);
      if (at.length) { S.cut = Math.min(CP2W.CUT, S.cut + dt * at.length); if (!S.said.cut) { S.said.cut = 1; cpSay('sarg', 'One is at the cage! Shoot him off it!', 'cp_m02_25'); } } else S.cut = Math.max(0, S.cut - dt * 0.5);
      if (S.cut >= CP2W.CUT) { cpFail('They cut Black Jago down and carried him off into the dark'); return; }
      if (S.kills >= S.need && !alive) {
        S.ph = 'rise'; cpWaypoint(null); cpObjective('');
        cpCine('m02_return', () => cp2wRise());
      }
    } else if (S.ph === 'boss') {
      const B = ZM.z.find(z => z.zn === S.bz);
      S.hk = B ? clamp(B.hp / B.max, 0, 1) : 0;
      if (!B || B.dead) { S.ph = 'done'; cpObjective(''); for (const z of ZM.z) if (!z.dead) { z.dead = 1; z.deadT = 0; } setTimeout(() => { if (RAID.st === S && !ZM.over) cpDone(); }, 2200); return; }
      // half his strength: every lantern kindles, and he's quicker
      if (!S.p2 && S.hk < 0.5) { S.p2 = 1; S.lan = [1, 1, 1, 1]; S.open = 0; B.sp *= 1.2; cpSay('sarg', 'He is calling them up again! Every lamp on the wall!', 'cp_m02_31'); ZM.banner = { text: 'The false lights kindle', t: 3, col: '#ffc860' }; }
      if (S.open > 0) {
        S.open -= dt;
        if (S.open <= 0) {
          const k = S.p2 ? 4 : Math.min(4, 2 + (n > 2 ? 1 : 0)), idx = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, k);
          for (const i of idx) S.lan[i] = 1;
          B.act = null; cpSay('moon', 'Burn, my lights. Burn.', 'cp_m02_30');
        }
      } else if (!cp2wShield()) { S.open = CP2W.OPEN; if (!S.said.open) { S.said.open = 1; cpSay('sarg', 'The lamps are dark! Now, while he is open!', 'cp_m02_29'); } }
      // the hanged come down off the other gibbets
      S.dT -= dt;
      const live = ZM.z.filter(z => !z.dead && !z.boss).length;
      if (S.dT <= 0) { S.dT = (S.p2 ? 9 : 13) / Math.sqrt(1 + 0.4 * (n - 1)); if (live < 1 + n + S.p2) { const i = [0, 1, 3][(Math.random() * 3) | 0]; raidSpawnAt(FPSC.CX + CP2W.GIB[i] + (Math.random() - 0.5) * 2, FPSC.CY + CP2W.GY + 1.6, { kind: Math.random() < 0.3 ? 'run' : 'jog', hp: zmHp(RAIDC.ROUND + 3) * (1 + 0.3 * (n - 1)), rise: 1.4 }); } }
    }
  },
  kill(d) { const S = RAID.st; if (S.ph === 'guard' && d.bt === 'cpgang') { S.kills++; if (S.kills === 1) cpSay('sarg', 'They mean to cut him down. Not one of them reaches that cage.', 'cp_m02_24'); } },
  // (his false lights shield him: nothing touches him while one burns)
  hurt(d, dmg) { if (d.cp2m || (d.boss && d.bt === 'moon' && RAID.st.ph === 'boss')) { if (cp2wShield()) { CP2W.shT = 0.6; return 0; } } return dmg; },
  q(sid, k, a) {
    const S = RAID.st, i = a | 0;
    if (k === 'lan' && S.ph === 'boss' && S.lan[i]) { S.lan[i] = 0; const left = S.lan.filter(Boolean).length; cp2Feed(`${cp2Nick(sid)} put out a lantern on the gibbets. ${left ? left + ' still burning.' : 'He stands in the dark.'}`); }
  },
  players(P) { return P; },
  pack(o) { const S = RAID.st; o.m2w = [CP2W_PH.indexOf(S.ph), S.lan.join(''), Math.round(S.open * 10), S.p2, Math.round(S.cut * 10), S.kills, S.need, Math.round(S.hk * 1000)]; },
  apply(o) {
    const S = RAID.st, a = o.m2w; if (!Array.isArray(a)) return;
    S.ph = CP2W_PH[a[0] | 0] || 'guard'; S.lan = String(a[1] || '').split('').map(v => v === '1' ? 1 : 0); S.open = (a[2] | 0) / 10; S.p2 = a[3] | 0; S.cut = (a[4] | 0) / 10; S.kills = a[5] | 0; S.need = a[6] | 0; S.hk = (a[7] | 0) / 1000;
  },
  me(dt) {
    const S = RAID.st, L = CPL.list;
    if (!CPM2.cineLamps) (S.lan || []).forEach((v, i) => { if (L[i]) cplSet(L[i], !!v); });
    if (CP2W.shT > 0) CP2W.shT -= dt;
    // the cages creaking on their chains in the wind, all the while; a gibbet's lantern put out, on every screen
    try { sfxPlay('gibbet_chain', { vol: 0.35, gap: 6 + Math.random() * 3 }); } catch (e) {}
    const lanN = (S.lan || []).filter(Boolean).length; if (S.ph === 'boss' && CP2W.lanN != null && lanN < CP2W.lanN) try { sfxPlay('lantern_douse', { vol: 0.7 }); } catch (e) {} CP2W.lanN = lanN;
    cphTick(dt, ZM.near, ZM.near && ZM.near.k === 'cp2lan' ? CP2W.LAN : 0, o => raidAsk('lan', o.i));
  },
  consider(c) { const S = RAID.st; if (S.ph !== 'boss') return; S.lan.forEach((v, i) => { if (v) c({ k: 'cp2lan', i }, FPSC.CX + CP2W.GIB[i], FPSC.CY + CP2W.GY + 0.6, 0, 2.4, false); }); },
  prompt(o) { return o.k === 'cp2lan' ? { text: 'Hold to put out the gibbet’s lantern', hold: true } : null; },
  use(o) { return o.k === 'cp2lan'; },
  hud(phone, mono, fell) {
    const S = RAID.st;
    if (S.ph === 'guard') { cpkLine(`The gang on the wall: ${Math.max(0, S.need - S.kills)} still to put down`, 0); if (S.cut > 0) cpkBar('CUTTING HIM DOWN', S.cut / CP2W.CUT, 1, null, true); }
    else if (S.ph === 'boss') {
      const n = S.lan.filter(Boolean).length;
      if (n) cpkLine(`His false lights burn on ${n} of the gibbets: put them out`, 0, '#ffc860');
      else cpkLine(`He stands in the dark: ${Math.max(0, Math.ceil(S.open))} s before he lights them again`, 0, '#ffe2a8');
      if (CP2W.shT > 0) { ctx.textAlign = 'center'; ctx.font = fell(phone ? 16 : 22); ctx.fillStyle = `rgba(255,200,110,${clamp(CP2W.shT / 0.6, 0, 1)})`; ctx.fillText('The false lights shield him', cx, H * 0.6); }
    }
    cphHud();
  },
  b3(grp) { cp2wBuild3D(grp); },
  f3(dt) { cp2wFrame3D(dt); },
  exit() { cplReset(); CP2W.lanN = null; if (typeof GL3D !== 'undefined' && GL3D.sea) GL3D.sea.visible = true; },
  mend: false,
});
// (hosting) a gang man stood at the foot of the gibbet: the tick counts it
function cp2wAtGoal() {}
// (hosting, after the cutscene) up he comes
function cp2wRise() {
  const S = RAID.st; if (S.ph !== 'rise') return;
  S.ph = 'boss'; S.lan = [1, 1, 1, 1]; S.open = 0;
  const z = cp2wBoss(CP2W.GIB[CP2W.JAGO] + 3); S.bz = z.zn; z.h = 0;
  cpObjective('Put out his lanterns, then put him down');
  setTimeout(() => { if (RAID.st === S && !ZM.over) cpSay('sarg', 'Lead will not touch him while those lamps burn. Put them out!', 'cp_m02_28'); }, 1500);
}

// ---------- the sea wall's 3D: the floor and the wall's face, the sea far below, the fort behind, the night ----------
const CP2W3 = { ok: false };
function cp2wBuild3D(grp) {
  CP2W3.ok = true;
  const CX = FPSC.CX, CY = FPSC.CY, G0 = FPSC.GROUND, X = CP2W.X, Y = CP2W.Y, st = z3Lam('#7a7262'), st2 = z3Lam('#5a5448'), flag = z3Lam('#6e6758');
  const box = (m, x, y, z0, w, d, h) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.copy(z3v(CX + x, CY + y, G0 + z0 + h / 2)); grp.add(b); return b; };
  // the walk's flagstones, and the wall's face going down to the sea; the inner face down to the roofs
  box(flag, 0, 0, -0.6, X * 2 + 2, Y * 2 + 2, 0.6);
  for (let x = -X; x < X; x += 1.8) for (let y = -Y; y < Y; y += 1.4) if (fpiHash(x * 7 | 0, y * 9 | 0) < 0.35) box(z3Lam(fpiHash(x | 0, y | 0) < 0.5 ? '#625c50' : '#746c5c'), x + 0.9, y + 0.7, -0.58, 1.7, 1.3, 0.6);
  box(st2, 0, -Y - 1.4, -22, X * 2 + 4, 1.8, 22);
  box(st2, 0, Y + 6, -9, X * 2 + 4, 10, 8.6);
  box(st, X + 7, 0, -22, 14, 22, 26.5);   // (the bastion)
  for (let x = -X; x < X + 2; x += 2.4) box(st, X + 7, -11 + 0, 4.5, 1.2, 1.2, 1.0);
  box(st, -X - 7, 0, -22, 14, 26, 25.2);   // (the Sea Battery's terrace beyond the gate)
  // the fort behind: the Plaza's ranges, the chapel's tower, a lit window or two
  box(z3Lam('#4a4438'), -6, Y + 22, -9, 60, 16, 14); box(z3Lam('#4a4438'), 18, Y + 26, -9, 12, 10, 24);
  for (const [x, z] of [[-14, -1], [0, 1], [18, 9]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), new THREE.MeshBasicMaterial({ color: 0xffb860, fog: false })); w.position.copy(z3v(CX + x, CY + Y + 13.9 + (x > 10 ? 7 : 0), G0 + z)); w.rotation.y = Math.PI; grp.add(w); }
  // the sea, far down: a dark sheet that catches the lanterns, and surf breaking at the wall's foot
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1), new THREE.MeshPhongMaterial({ color: 0x03080e, specular: 0x6a7888, shininess: 60, emissive: 0x010306 }));
  sea.rotation.x = -Math.PI / 2; sea.position.copy(z3v(CX, CY - 1000, G0 - 20)); grp.add(sea);
  CP2W3.foam = new THREE.Mesh(new THREE.PlaneGeometry(X * 2 + 30, 3), new THREE.MeshBasicMaterial({ color: 0x8a9aa0, transparent: true, opacity: 0.2, depthWrite: false }));
  CP2W3.foam.rotation.x = -Math.PI / 2; CP2W3.foam.position.copy(z3v(CX, CY - Y - 3.5, G0 - 19.9)); grp.add(CP2W3.foam);
  // Lantern Rock's fire, far out on the water
  CP2W3.rock = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,150,70,0.95)', 'rgba(255,150,70,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  CP2W3.rock.scale.setScalar(30); CP2W3.rock.position.copy(z3v(CX - 600, CY - 1500, G0 - 10)); grp.add(CP2W3.rock);
  cplBuild3D(grp);
}
function cp2wFrame3D(dt) {
  if (!CP2W3.ok || typeof GL3D === 'undefined') return;
  const t = g.t, S = RAID.st;
  if (GL3D.sea && GL3D.sea.visible) GL3D.sea.visible = false;
  const lit = (S.lan || []).filter(Boolean).length;
  GL3D.amb.intensity = 0.32 + 0.04 * lit; GL3D.moon.intensity = 0.05;
  if (GL3D.scene.fog) { const F = GL3D.scene.fog; F.color.setRGB(0.02 + 0.006 * lit, 0.026 + 0.004 * lit, 0.04); F.near = 30; F.far = 900; RAID.fog0 = true; }
  CP2W3.foam.material.opacity = 0.14 + 0.08 * Math.sin(t * 1.2);
  CP2W3.rock.material.opacity = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 3.1);
  cplTick3D(dt);
}
