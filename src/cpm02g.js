'use strict';
// The Chronicle of the Light: men with lanterns. The tools two missions share for the living enemies of the wrecking
// trade (src/cpm02.js, the Mooncussers' gang in the 1600s; src/cpm07.js, the wrecker gangs on the Bonded Quay in 1888),
// and for lamps a stage can light and put out while it's played.
//
// The gang (ZBT.cpgang): a man in a long coat with a lantern in his left hand and a pistol or a cutlass in his right,
// built from src/fpsbody.js's figure (fbFigure, fbPose), so he's one of Wreckers' Night's wreckers to look at. He runs on
// the bosses' framework (src/zmboss.js) as one of the drowned list (ZM.z), so everything that hurts the drowned hurts
// him (every gun, the cutlass and axe, grenades, the callings' ultimates), joined players see him through the
// drowned's own stream, and his blows land on each screen as the bosses' do. But he's quiet (T.quiet: no banner as
// he comes or goes, no salvage, no bar at the top: src/zmboss.js's [campaign] lines).
//  - Unaware (z.aware 0), he stands his post with his lantern and looks about. He wakes when he sees one of you (the
//    stage's say: CPG.sees(z, p, d), default always), when he's hurt, when a shot goes off near him (cpgNoise), or
//    when a mate near him wakes.
//  - Awake, a gunman closes to pistol range and fires: he levels the pistol for CPG.AIM s first (a red glint at the
//    muzzle, a click), so there's time to get behind something; the shot is judged on each screen for its own player
//    (along his aim, nothing solid between, a chance that falls with the range and with your moving, and rises if
//    you're lit: CPG.lit(x, y)). Close in he clubs you with the pistol butt. A cutlass man just comes on and cuts.
//  - cpgSpawn(x, y, o) (hosting or alone): one of them at (x, y) about the island's middle. o: { h (heading), gun
//    (default true), aware, hp, cols (coat, shirt, trim, lantern colours), n (his name, for the feed) }.
//  - cpgAlive(): how many are standing. cpgAll(): them.
// The lamps (cplAdd): a lantern or a fire a stage owns (a false light on a pole, a flare, a gibbet's lantern): its
// glow drawn in the stage's 3D (cplBuild3D in the stage's b3, cplTick3D in its f3), and while it's lit, one of the
// island's lights (so the nearest of them light the ground as the island's own lanterns do). cplSet(L, on).
// Hooks: src/zmboss.js (zbArrive, zbKilled, zbDeathFx and zbHud pass over a quiet kind), one line each, [campaign].

const CPG = { AIM: 0.85, RANGE: 19, HOLD: 9.5, CLUB: 2.3, HP: 1.55, SP: 3.1, SPREAD: 18, sees: null, lit: null, noiseR: 26,
  COATS: ['#3a2a1e', '#2e3438', '#4a3a26', '#2a2622', '#3e3022', '#30282e', '#3a3a2c'], TRIMS: ['#7a5a3a', '#5a4a3a', '#6a6a5a', '#8a6a3a'] };
const CPG_T = { aim: { hit: CPG.AIM, end: 1.3 }, club: { hit: 0.42, end: 0.95 }, wait: { hit: 99, end: 0.8 }, smash: { hit: 0.8, end: 1.3 } };
ZB_ACT.push('aim', 'club', 'wait');   // (the wire's list of blows, by number: these three after the bosses')

// ---------- spawning, and who's left ----------
function cpgSpawn(x, y, o) {
  o = o || {};
  const n = Math.max(1, ZM.hum.length), hp = o.hp || zmHp(RAIDC.ROUND + 2) * CPG.HP * (1 + 0.22 * (n - 1));
  const zn = ++ZM.zc, wx = FPSC.CX + x, wy = FPSC.CY + y, T = ZBT.cpgang;
  const z = {
    drowned: true, zm: true, boss: true, bt: 'cpgang', zn, id: 'z' + zn.toString(36), n: o.n || 'a wrecker', kind: 'boss',
    x: wx, y: wy, jz: 0, fl: 0, hp, max: hp, sp: CPG.SP * (0.9 + Math.random() * 0.2),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: o.h || 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy,
    gun: o.gun !== false, aware: o.aware ? 1 : 0, h0: o.h || 0, aimCd: 1 + Math.random() * 1.5, wakeT: 0, strafe: Math.random() < 0.5 ? -1 : 1,
  };
  T.init(z);
  zbMake(z, 'cpgang');
  ZM.z.push(z); FPS.drowned = ZM.z;
  ZB.seen.add(zn);
  return z;
}
const cpgAll = () => ZM.z.filter(z => z.bt === 'cpgang' && !z.dead && !z.gone);
const cpgAlive = () => cpgAll().length;
// (hosting or alone) a noise at (x, y), world coordinates: every one of them within r wakes
function cpgNoise(x, y, r) { for (const z of cpgAll()) if (!z.aware && Math.hypot(z.x - x, z.y - y) < (r || CPG.noiseR)) cpgWake(z); }
// (a shot of yours, from a stage's shot hook: the gang near it hear it; a joined player tells the host, now and then)
function cpgShot(x, y) { if (ZM.net !== 'client') { cpgNoise(x, y); return; } const t = performance.now(); if (t - (CPG.shotAt || 0) < 700) return; CPG.shotAt = t; raidAsk('noise', [Math.round(x - FPSC.CX), Math.round(y - FPSC.CY)]); }
// (hosting: a stage's q hook passes 'noise' asks here)
function cpgAsk(k, a) { if (k === 'noise' && Array.isArray(a)) { cpgNoise(FPSC.CX + (+a[0] || 0), FPSC.CY + (+a[1] || 0)); return true; } return false; }
// a night with no moon (a mission's begin and stop): the moon put down under the sea, and back
function cpgMoonless(on) { if (typeof MOON === 'undefined') return; if (on) { if (CPG.moon0 == null) CPG.moon0 = MOON.e; MOON.e = -0.4; } else if (CPG.moon0 != null) { MOON.e = CPG.moon0; CPG.moon0 = null; } }
function cpgWake(z) { if (z.aware) return; z.aware = 1; z.wakeT = 0; z.aimCd = Math.max(z.aimCd, 0.6 + Math.random() * 0.6); }
// where his pistol's muzzle is (the world)
function cpgMuzzle(z) { return [z.x + Math.sin(z.h) * 0.62 + Math.cos(z.h) * 0.22, z.y + Math.cos(z.h) * 0.62 - Math.sin(z.h) * 0.22, FPSC.GROUND + (z.jz || 0) + 1.42]; }
// nothing solid from his muzzle to (px, py) at height ez
function cpgLos(z, px, py, ez) {
  const [mx, my, mz] = cpgMuzzle(z), d = Math.hypot(px - mx, py - my); if (d < 0.4) return true;
  const r = fpsRay(mx, my, mz, bearingOf(px - mx, py - my), Math.atan2(ez - mz, d), null, [], d);
  return !(r.kind !== 'none' && r.t < d - 0.4);
}
function cpgSound(k, x, y) {
  try {
    if (soundOff()) return;
    const d = Math.hypot(x - FPS.me.x, y - FPS.me.y), v = Math.max(0.05, 1 - d / 60), P = fpsEar(x, y);
    if (k === 'shot') { fpsWeaponSound('p', d, P); return; }
    if (k === 'click') { tone(1300, 'square', 0.001, 0.06 * v, 0.03, { pan: P }); tone(900, 'square', 0.001, 0.05 * v, 0.03, { delay: 0.07, pan: P }); return; }
    if (k === 'die') { noise('lowpass', 420, 0.8, 0.01, 0.35 * v, 0.35, { pan: P }); tone(140, 'triangle', 0.01, 0.15 * v, 0.3, { to: 80, pan: P }); return; }
    if (k === 'whoosh') { fpsSwishSound(d, P); return; }
    if (k === 'shout') { noise('bandpass', 700, 2.5, 0.02, 0.12 * v, 0.25, { pan: P }); return; }
  } catch (e) {}
}

// ---------- the kind ----------
ZBT.cpgang = {
  n: 'a wrecker', N: 'A wrecker', sub: '', col: '#d89070', bar: ['#8a5a3a', '#d89070'], warn: '255,120,90', big: 'aim', puff: '120,90,70', quiet: true,
  hp: 1, pts: 120, rad: 0.42, tall: 1.86, headZ: 1.52, pad: 0.3, crowd: 0.6, near: 1.4, scale: 1.6, ladder: 1.8, through: 1.2,
  sp: () => CPG.SP, win: () => true, acts: CPG_T,
  arriveLine: () => '', smashLine: () => '', killLine: (who) => `${who} put a wrecker down.`,
  init(z) { z.aimCd = z.aimCd || 1.2; },
  cool(z, dt) {
    if (z.aimCd > 0) z.aimCd -= dt;
    // (awake: in a moment, the mates near him wake too)
    if (z.aware && z.wakeT < 1.2) { z.wakeT += dt; if (z.wakeT >= 1.0) { for (const o of cpgAll()) if (o !== z && !o.aware && Math.hypot(o.x - z.x, o.y - z.y) < CPG.SPREAD) cpgWake(o); z.wakeT = 9; } }
  },
  think(z, p, d, dz, level) {
    // (sent somewhere by the stage: there first, unless one of you is close)
    if (z.goal && d > (z.goalD || 7)) return 'wait';
    if (!z.aware) {
      if (!CPG.sees || CPG.sees(z, p, d)) { cpgWake(z); cpgSound('shout', z.x, z.y); }
      else return 'wait';
    }
    if (level && d < CPG.CLUB && z.swCd <= 0) return 'club';
    const ez = FPSC.GROUND + (p.jz || 0) + 1.2;
    if (z.gun && d < CPG.RANGE && z.aimCd <= 0 && Math.abs(dz) < 3 && cpgLos(z, p.x, p.y, ez)) return 'aim';
    if (z.gun && d < CPG.HOLD && d > 3 && cpgLos(z, p.x, p.y, ez)) return 'wait';
    return null;
  },
  start(z, act) {
    if (act === 'aim') { z.aimCd = 2.2 + Math.random() * 1.8; z.swCd = Math.max(z.swCd, 0.6); }
    if (act === 'club') z.swCd = 1.3 + Math.random() * 0.4;
    if (act === 'wait') { z.aEnd = z.aware ? 0.5 + Math.random() * 0.5 : 0.9; if (Math.random() < 0.3) z.strafe = -z.strafe; }
  },
  endOf(z, act) { return act === 'wait' ? 0.7 : 0; },
  during(z, dt, nearest) {
    const p = nearest(z.x, z.y, z.jz);
    if (z.act === 'wait') {
      if (z.goal && (!p || Math.hypot(p.x - z.x, p.y - z.y) > (z.goalD || 7))) {
        const gx = FPSC.CX + z.goal[0], gy = FPSC.CY + z.goal[1], dx = gx - z.x, dy = gy - z.y, dd = Math.hypot(dx, dy);
        if (dd > 0.9) {
          const want = bearingOf(dx, dy), s = Math.min(dd, z.sp * dt);
          z.walk = false;
          for (const da of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) { const a = want + da * (z.side || 1), x0 = z.x, y0 = z.y; if (zmMove(z, Math.sin(a) * s, Math.cos(a) * s) && Math.hypot(z.x - x0, z.y - y0) > s * 0.3) { z.walk = true; if (da) z.side = Math.sign(da * (z.side || 1)) || 1; z.h += angDiff(a, z.h) * Math.min(1, dt * 6); break; } }
          z.atGoal = 0;
        } else { z.walk = false; z.atGoal = (z.atGoal || 0) + dt; if (CPG.atGoal) CPG.atGoal(z, dt); }
        return;
      }
      if (!z.aware) { z.h = z.h0 + Math.sin(g.t * 0.35 + z.seed) * 1.1; return; }
      if (p) { z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 4); const s = z.sp * 0.45 * dt * z.strafe; if (!zmMove(z, Math.cos(z.h) * s, -Math.sin(z.h) * s)) z.strafe = -z.strafe; z.walk = true; }
      return;
    }
    if ((z.act === 'aim' && z.at < CPG.AIM * 0.75) || (z.act === 'club' && z.at < 0.3)) { if (p) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 6); }
  },
  // (every screen: is it me it hits?)
  strike(z) {
    const m = FPS.me;
    if (z.act === 'club') { cpgSound('whoosh', z.x, z.y); zbMelee(z, CPG.CLUB + 0.2, 1.0, 1); return; }
    if (z.act !== 'aim') return;
    const [mx, my, mz] = cpgMuzzle(z), ez = FPSC.GROUND + (m.jz || 0) + 1.25, d = Math.hypot(m.x - mx, m.y - my);
    cpgSound('shot', z.x, z.y);
    for (let i = 0; i < 3; i++) FPS.parts.push({ x: mx, y: my, z: mz, vx: Math.sin(z.h) * 2 + (Math.random() - 0.5), vy: Math.cos(z.h) * 2 + (Math.random() - 0.5), vz: Math.random() * 0.6, t: 0.25, c: '255,200,120' });
    const off = Math.abs(angDiff(bearingOf(m.x - mx, m.y - my), z.h)), onLine = off < Math.atan2(0.9, Math.max(1, d)) + 0.07;
    const ok = zbOk() && !(typeof zmIsDown === 'function' && zmIsDown()) && onLine && d < CPG.RANGE + 4 && Math.abs((m.jz || 0) - (z.jz || 0)) < 3 && cpgLos(z, m.x, m.y, ez);
    let hit = false;
    if (ok) {
      const moving = Math.hypot(m.vx || 0, m.vy || 0) > 1 || !!(FPS.keys && (FPS.keys.KeyW || FPS.keys.KeyA || FPS.keys.KeyS || FPS.keys.KeyD));
      const lit = CPG.lit ? CPG.lit(m.x, m.y) : 0.5;
      hit = Math.random() < clamp(0.86 - d * 0.025 - (moving ? 0.22 : 0) - (FPS.crouch ? 0.12 : 0) + lit * 0.18, 0.12, 0.88);
    }
    if (hit) { fpsHurt(1, null, null); zmSound('hit'); FPS.hurtT = 0.7; FPS.tracers.push({ a: [mx, my, mz], b: [m.x, m.y, ez], t: 0.09, k: 'p' }); }
    else { const L = 24, r = fpsRay(mx, my, mz, z.h + (Math.random() - 0.5) * 0.08, -0.02, null, [], L); FPS.tracers.push({ a: [mx, my, mz], b: [r.x, r.y, r.z], t: 0.09, k: 'p' }); }
  },
  hurtK(z) { cpgWake(z); return 1; },
  actSound(z, act) { if (act === 'aim') cpgSound('click', z.x, z.y); },
  sound(k, d) { },
  build: () => cpgBuild(),
  reset(z, M) {
    const F = M.F, c = CPG.COATS[z.seed % CPG.COATS.length], tr = CPG.TRIMS[(z.seed >> 3) % CPG.TRIMS.length];
    if (F && F.M) { for (const [k, v] of [['coat', c], ['trim', tr], ['hat', z.seed % 3 ? '#1b1713' : '#2a241c']]) { const mt = F.M[k]; if (mt) { mt.userData.base.set(v); mt.color.set(v); } } }
    M.root.rotation.set(0, 0, 0); M.dead = 0;
  },
  pose: (z, M, dt) => cpgPose(z, M, dt),
};
ZB_KINDS.push('cpgang');

// ---------- the model: Wreckers' Night's figure, his lantern's glow, and a glint at the muzzle as he aims ----------
function cpgBuild() {
  const F = fbFigure(['#3a2a1e', '#d8d0bc', '#7a5a3a', '#ffd88a'], '');
  const soft = c => new THREE.SpriteMaterial({ map: z3Soft(c, c.replace(/[\d.]+\)$/, '0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const halo = new THREE.Sprite(soft('rgba(255,214,140,0.75)')); halo.scale.setScalar(0.9); F.lan.add(halo);
  const glint = new THREE.Sprite(soft('rgba(255,90,60,0.95)')); glint.scale.setScalar(0.01); F.root.add(glint);
  return { root: F.root, F, halo, glint };
}
function cpgPose(z, M, dt) {
  const F = M.F, act = z.act, at = z.at || 0, dead = !!z.dead;
  const spd = z.walk && !dead ? z.sp * (act === 'wait' ? 0.45 : 1) : 0;
  F.ph = (F.ph || 0) + dt * spd * 8 / FPSC.SPEED;
  const aimK = act === 'aim' ? clamp(at / 0.3, 0, 1) : 0, rec = act === 'aim' && at > CPG.AIM ? Math.max(0, 1 - (at - CPG.AIM) / 0.3) : 0;
  const gun = z.gunId || (z.gun ? 'pepperbox' : 'cutlass');
  try { fbPose(F, { dt, x: z.x, y: z.y, jz: z.jz || 0, vz: 0, h: z.h, p: dead ? 0 : (act === 'aim' ? -0.05 : 0.25 - aimK * 0.3), spd, ph: F.ph, cr: 0, id: gun, plain: true, pap: 0, rec, draw: 0, rl: 0,
    slash: act === 'club' ? clamp(at / CPG_T.club.end, 0, 0.99) : -1, lan: !dead, t: g.t, see: 1, op: 1 }); } catch (e) {}
  M.halo.material.opacity = dead ? 0 : 0.7 + 0.15 * Math.sin(g.t * 9 + z.seed);
  // the glint: the pistol coming level at you
  const gk = act === 'aim' && at < CPG.AIM ? clamp(at / CPG.AIM, 0, 1) : 0;
  M.glint.visible = gk > 0; if (gk > 0) { M.glint.scale.setScalar(0.12 + gk * 0.35 + 0.05 * Math.sin(g.t * 30)); M.glint.position.set(0.22, 1.42, -0.62); M.glint.material.opacity = 0.4 + gk * 0.6; }
  // down: he falls back and lies still, and after a while is gone
  if (dead) {
    const k = clamp((z.deadT || 0) * 2.4, 0, 1);
    M.root.rotation.x = 0; M.root.rotateX(-k * 1.45);
    M.root.position.y -= Math.max(0, (z.deadT || 0) - 3) * 0.4;
    if ((z.deadT || 0) > 5) M.root.visible = false;
    if (!M.dead) { M.dead = 1; cpgSound('die', z.x, z.y); }
  }
}

// ---------- lamps a stage owns ----------
// cplAdd(x, y, z, col, r, o): about the island's middle (x, y), z metres up; o: { on (default true), k ('lantern' or
// 'fire'), s (the glow's size) }. Call it in the stage's set or enter (every screen), and cplBuild3D(grp) in its b3.
var CPL = { list: [] };
function cplReset() { CPL.list = []; }
function cplAdd(x, y, z, col, r, o) {
  o = o || {};
  const L = { x: FPSC.CX + x, y: FPSC.CY + y, z, col, r: r || 9, on: o.on !== false, k: o.k || 'lantern', s: o.s || 0.9, spr: null, lt: null, k1: o.on !== false ? 1 : 0 };
  CPL.list.push(L); if (L.on) cplLight(L, true);
  return L;
}
function cplLight(L, on) {
  const I = FPS.g && FPS.g.isle; if (!I) return;
  if (on && !L.lt) { L.lt = { x: L.x, y: L.y, z: FPSC.GROUND + L.z, c: L.col, r: L.r, k: L.k, ph: Math.random() * 6 }; I.lights.push(L.lt); }
  if (!on && L.lt) { I.lights = I.lights.filter(q => q !== L.lt); L.lt = null; }
}
function cplSet(L, on) { if (!L || L.on === !!on) return; L.on = !!on; cplLight(L, L.on); }
function cplBuild3D(grp) {
  for (const L of CPL.list) {
    const c = new THREE.Color(L.col), css = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},`;
    L.spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft(css + '0.95)', css + '0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    L.spr.scale.setScalar(L.s * 2.4); L.spr.position.copy(z3v(L.x, L.y, FPSC.GROUND + L.z)); grp.add(L.spr);
    L.core = new THREE.Mesh(new THREE.SphereGeometry(0.09 * L.s / 0.9, 8, 6), new THREE.MeshBasicMaterial({ color: c })); L.core.position.copy(L.spr.position); grp.add(L.core);
  }
}
function cplTick3D(dt) {
  for (const L of CPL.list) {
    L.k1 += ((L.on ? 1 : 0) - L.k1) * Math.min(1, dt * (L.on ? 3 : 6));
    if (!L.spr) continue;
    const fl = L.k === 'fire' ? 0.8 + 0.2 * Math.sin(g.t * 11 + L.x) : 0.92 + 0.08 * Math.sin(g.t * 7 + L.y);
    L.spr.material.opacity = L.k1 * fl; L.spr.visible = L.k1 > 0.01; L.core.visible = L.k1 > 0.3;
  }
}

// ---------- holding Use at something (a stage's me(dt), every screen) ----------
// cphTick(dt, o, need, done): o is what's in front of you (ZM.near), need the seconds to hold it (0: not now), done(o)
// once it's held long enough (a joined player then asks the host). cphHud() draws the ring filling round the sights.
const CPH = { t: 0, key: '', pend: 0, need: 1 };
function cphTick(dt, o, need, done) {
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, m = FPS.me;
  const alive = !(m.dead > 0) && !zmIsDown() && !ZM.over && !(typeof cpCineOn === 'function' && cpCineOn());
  if (CPH.pend > 0) CPH.pend -= dt;
  const key = o ? o.k + ':' + (o.i == null ? '' : o.i) : '';
  if (hold && o && need > 0 && alive && !(CPH.pend > 0)) {
    if (key !== CPH.key) { CPH.key = key; CPH.t = 0; }
    CPH.t += dt; CPH.need = need;
    if (CPH.t >= need) { CPH.t = 0; CPH.pend = 0.8; try { done(o); } catch (e) { console.warn('cph', e); } }
  } else { CPH.t = 0; CPH.key = ''; }
}
function cphHud(col) {
  if (!(CPH.t > 0)) return;
  const k = Math.min(1, CPH.t / CPH.need);
  ctx.strokeStyle = 'rgba(255,216,138,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = col || '#ffd88a'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
}
// a line under the objective, top left (n: which line, from 0)
function cpkLine(text, n, col) {
  const phone = FPS.touch, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 70 : 92) + (n || 0) * (phone ? 15 : 19);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = `600 ${phone ? 10 : 12}px "Courier Prime", monospace`;
  ctx.fillStyle = col || 'rgba(236,228,207,0.85)'; ctx.fillText(text, L, top, W * 0.6); ctx.textBaseline = 'alphabetic';
  return top + (phone ? 15 : 19);
}
// a bar under the objective lines (k 0..1)
function cpkBar(label, k, n, col, warn) {
  const phone = FPS.touch, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 70 : 92) + (n || 0) * (phone ? 15 : 19) + 2, w = phone ? 150 : 220, h = phone ? 6 : 8;
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(L - 4, top - 4, w + 8, h + 8);
  ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(L, top, w, h);
  ctx.fillStyle = warn ? `rgba(230,100,70,${0.75 + 0.25 * Math.sin(g.t * 8)})` : col || '#ffc070'; ctx.fillRect(L, top, w * clamp(k, 0, 1), h);
  if (label) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `600 ${phone ? 9 : 11}px "Courier Prime", monospace`; ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText(label, L + w + 10, top + h / 2); ctx.textBaseline = 'alphabetic'; }
}
