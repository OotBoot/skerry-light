// Wrackhaven: the Hermit's Claw, its chest's wonder weapon (in place of the Lighthouse's Fresnel Lamp, which isn't in
// Wrackhaven's chest: ZM_MAPS noBox, src/zombies.js). A great crab's claw, the size of a man's forearm, set on a
// brass gauntlet, and on the back of the gauntlet a whelk shell with crabs living in it. Each pull of the trigger:
//  - the claw snaps shut, with a crack like a pistol, and the snap throws a burst of water off the claw's tip: it
//    knocks back and hurts all of them right in front of you (FPSW.hermit.snap metres, a wide cone);
//  - and a hermit crab is flung out of the shell. It lands, scuttles sideways to the nearest of them it can see, and
//    clamps onto its leg: that one is held where it stands and nipped, three times a second, until it falls or the
//    crab's had enough; then the crab goes on to the next (two in all), and at the end burrows into the floor.
// Reforged at the Lampwright's Bench, the Crab King's Claw: the snap reaches further, each pull throws a brood of
// crabs (2 + t of them, up to 6), red-gold and quicker, each goes on to more of them (3 + t, up to 8), and when it's
// done each one bursts in a scald of boiling brine that hurts all round it.
// The nips and the scald are a fixed fraction of a drowned man's strength that round (like the Fresnel Lamp's), so
// it stays a wonder weapon as the rounds go up; on the Crab King's Claw, zmpK makes them hit harder still.
// Together (src/zmnet.js): the crabs are worked out on the thrower's screen; their nips go to the host through zmHurt,
// and the holding through zmpStatus ('pin'). The others see the snap and their own copy of the crabs (plain ones),
// scuttling after the same drowned, only to look at.

Object.assign(ZM_AMMO, { hermit: 18 });
Object.assign(ZM_DMG, { r: 1 });
ZM_BOXW.push(['hermit', 9]);
ZX_ID.r = 'hermit';
ZM_PAP_W.hermit = { n: "Crab King's Claw", mag: 6, res: 36, k: 2, fx: 'A brood of red-gold crabs each pull, that go on to more of them, and burst in boiling brine when they are done.' };
VM_PLAIN.hermit = { metal: '#3a3430', dark: '#1e1612', wood: '#4a2e1c', brass: '#b08a3c', accent: '#a8442a', glow: null };

const ZRC = {
  SP: 6.5, SP_T: 8.2,          // how quick a crab scuttles (you sprint at 9.8)
  SEE: 18,                     // how far it looks for one of them
  NIP: 0.13, NIP_T: 0.32,       // each nip: that much of a drowned man's strength, this often
  HOLD: 3.6,                   // how long it hangs on to one, at most
  GO: [2, 3],                  // how many it goes on to: plain, and reforged (3 + t, up to 8)
  SCALD: 0.35, SCALD_R: 2.4,   // the Crab King's crabs' burst of brine
  MAX: 24,                     // crabs out at once
};
const ZR = { crabs: [], snaps: [], n: 0 };
function zrReset() { ZR.crabs = []; ZR.snaps = []; if (ZR3.pool) for (const M of ZR3.pool) { M.used = false; M.root.visible = false; } }
const zrFoot = C => C.jz || 0;

// ---------- a pull of the trigger: the snap, and the crabs out of the shell ----------
function zrShot(x, y, z, h, p, by, mine, t) {
  const w = FPSW.hermit, R = w.snap + (t ? Math.min(2, 0.4 * t) : 0);
  zrSound('snap', mine ? 0 : Math.hypot(x - FPS.me.x, y - FPS.me.y));
  ZR.snaps.push({ x: x + Math.sin(h) * 0.9, y: y + Math.cos(h) * 0.9, z: z - 0.3, h, R, t: 0, gold: !!t });
  for (let i = 0; i < 14; i++) { const a = h + (Math.random() - 0.5) * 1.2, sp = 3 + Math.random() * R * 2; FPS.parts.push({ x: x + Math.sin(h) * 0.8, y: y + Math.cos(h) * 0.8, z: z - 0.3, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp, vz: (Math.random() - 0.3) * 2, t: 0.35, c: '200,225,230' }); }
  if (mine) {
    if (typeof zeShot === 'function') zeShot(x, y, z, h, p, by);   // [egg hook] src/zmegg.js
    if (typeof zhShot === 'function') zhShot(x, y, z, h, p, by);   // [egg2 hook] src/zmegg2.js
    // the snap's burst of water: all of them in front, near, hurt and thrown back
    let any = false;
    for (const o of ZM.z) {
      if (o.dead) continue;
      const d = Math.hypot(o.x - x, o.y - y), b = bearingOf(o.x - x, o.y - y), rad = o.rad || FPSC.BODY;
      if (d > R + rad || Math.abs(angDiff(b, h)) > 0.75 || Math.abs((o.jz || 0) - (FPS.me.jz || 0)) > 1.3) continue;
      if (d > rad + 0.35 && fpsRay(x, y, z - 0.4, b, Math.atan2(zmMid(o) - (z - FPSC.GROUND - 0.4), Math.max(0.3, d - rad * 0.8)), FPS.me.id, [o], R + 1.5).kind !== 'body') continue;
      zmHurt(o, w.dmg * (t ? 1.5 : 1), false, 'r', FPS.me.id); o.hitT = 0.2; any = true;
      if (d > 0.05) zmpStatus(o, 'kb', Math.sin(b) * (t ? 1.8 : 1.2), Math.cos(b) * (t ? 1.8 : 1.2), 0.7);
    }
    if (any) zxMark(false);
  }
  // the crabs, flung out in a lob (a brood of them fanned out, reforged)
  const n = t ? Math.min(6, 2 + t) : 1, cp = Math.cos(p + 0.22);
  let ox = x + Math.sin(h) * 0.6, oy = y + Math.cos(h) * 0.6, oz = z - 0.25;
  if (fpsRay(x, y, z, h, p, by, [], 0.8).kind !== 'none') { ox = x; oy = y; oz = z - 0.1; }
  for (let i = 0; i < n; i++) {
    const lh = h + (n > 1 ? (i / (n - 1) - 0.5) * 0.7 : 0), sp = w.pv * (0.85 + Math.random() * 0.3);
    ZR.crabs.push({ id: ++ZR.n, by, mine, tier: t, st: 'fly', t: 0, x: ox, y: oy, z: oz, vx: Math.sin(lh) * cp * sp, vy: Math.cos(lh) * cp * sp, vz: Math.sin(p + 0.22) * sp + 1.5,
      jz: 0, zpad: 0.18, left: t ? Math.min(8, ZRC.GO[1] + t) : ZRC.GO[0], seek: 0, idle: 0, stuck: 0, on: null, hold: 0, nip: 0, bad: null, badT: 0, h: lh, ph: Math.random() * 6, seed: (Math.random() * 1000) | 0, gone: 0 });
  }
  while (ZR.crabs.length > ZRC.MAX) ZR.crabs.shift();
}

// ---------- each frame: the crabs flying, scuttling, clinging and nipping ----------
function zrTick(dt) {
  for (const S of ZR.snaps) S.t += dt;
  ZR.snaps = ZR.snaps.filter(S => S.t < 0.4);
  for (const C of ZR.crabs) { C.t += dt; zrCrab(C, dt); }
  ZR.crabs = ZR.crabs.filter(C => !C.done);
}
// the nearest of them this crab can see and get to (one another crab's on, or one it couldn't reach, counts as further)
function zrPick(C) {
  let best = null, bs = 1e9;
  const cz = FPSC.GROUND + zrFoot(C) + 0.25;
  for (const o of ZM.z) {
    if (o.dead || o.st !== 'in' || Math.abs((o.jz || 0) - zrFoot(C)) > 1.4) continue;
    const d = Math.hypot(o.x - C.x, o.y - C.y); if (d > ZRC.SEE) continue;
    const s = d + (ZR.crabs.some(q => q !== C && q.on === o) ? 5 : 0) + (C.bad === o && C.badT > 0 ? 30 : 0);
    if (s >= bs) continue;
    if (d > 1 && fpsRay(C.x, C.y, cz, bearingOf(o.x - C.x, o.y - C.y), Math.atan2(FPSC.GROUND + (o.jz || 0) + 0.5 - cz, d), C.by, [o], d + 1).kind !== 'body') continue;
    bs = s; best = o;
  }
  return best;
}
function zrCrab(C, dt) {
  const G0 = FPSC.GROUND;
  if (C.st === 'fly') {
    const steps = 3, sdt = dt / steps;
    for (let i = 0; i < steps && C.st === 'fly'; i++) {
      const ox = C.x, oy = C.y, oz = C.z;
      C.vz -= FPSW.hermit.gr * sdt; C.x += C.vx * sdt; C.y += C.vy * sdt; C.z += C.vz * sdt;
      const seg = Math.hypot(C.x - ox, C.y - oy, C.z - oz), hh = bearingOf(C.x - ox, C.y - oy), pp = Math.atan2(C.z - oz, Math.max(0.01, Math.hypot(C.x - ox, C.y - oy)));
      const r = fpsRay(ox, oy, oz, hh, pp, C.by, ZM.z.filter(q => !q.dead && q.st === 'in'), seg + 0.05);
      // (straight onto one of them: it takes hold there and then)
      if (r.kind === 'body') { C.x = r.who.x; C.y = r.who.y; C.jz = r.who.jz || 0; zrClamp(C, r.who); return; }
      if (r.kind !== 'none' && r.kind !== 'ground') { C.x = ox - Math.sin(hh) * 0.15; C.y = oy - Math.cos(hh) * 0.15; C.z = oz; C.vx *= -0.2; C.vy *= -0.2; continue; }
      const fl = zxFloor(C.x, C.y, C.z - G0);
      if (C.z <= G0 + fl || r.kind === 'ground' || C.t > 4) {
        if (zmBlockedAt(C.x, C.y, 0.15, fl)) { C.x = ox; C.y = oy; }
        C.jz = zxFloor(C.x, C.y, Math.max(0, oz - G0)); C.z = G0 + C.jz; C.st = 'run'; C.vx = C.vy = C.vz = 0;
        fpsPuff(C.x, C.y, C.z + 0.05, '150,140,120', 4);
        zrSound('land', C.mine ? 0 : zrDist(C));
      }
    }
    return;
  }
  if (C.st === 'go') {
    // into the floor (plain), or the scald (the Crab King's)
    C.gone += dt;
    if (Math.random() < dt * 25) FPS.parts.push({ x: C.x + (Math.random() - 0.5) * 0.3, y: C.y + (Math.random() - 0.5) * 0.3, z: G0 + zrFoot(C) + 0.05, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, vz: 1 + Math.random(), t: 0.4, c: '150,140,120' });
    if (C.gone > 0.7) C.done = true;
    return;
  }
  if (C.badT > 0) C.badT -= dt;
  if (C.st === 'clamp') {
    const o = C.on;
    if (!o || o.dead || o.st !== 'in' || C.hold > ZRC.HOLD + (C.tier ? Math.min(2, 0.5 * C.tier) : 0)) { zrLetGo(C); return; }
    C.hold += dt; C.nip -= dt;
    // (hanging on to its leg, on the side it came at it from)
    C.x = o.x + C.ox; C.y = o.y + C.oy; C.jz = o.jz || 0;
    if (C.nip <= 0) {
      C.nip = ZRC.NIP_T;
      fpsPuff(o.x + C.ox * 0.6, o.y + C.oy * 0.6, G0 + (o.jz || 0) + (o.skit ? 0.3 : 0.6), o.skit ? '150,60,40' : '120,40,30', 3);
      if (C.mine) { zmHurt(o, zxHp() * ZRC.NIP, false, 'r', FPS.me.id); o.hitT = 0.12; if (!o.dead) zmpStatus(o, 'pin', 0.6); }
      zrSound('nip', C.mine ? 0 : zrDist(C));
    }
    return;
  }
  // scuttling: to the nearest of them, sideways
  C.seek -= dt;
  if (C.seek <= 0 || !C.to || C.to.dead || C.to.st !== 'in') { C.seek = 0.25; C.to = zrPick(C); }
  const o = C.to;
  if (!o) { C.idle += dt; if (C.idle > 2.5) zrFinish(C); return; }
  C.idle = 0;
  const dx = o.x - C.x, dy = o.y - C.y, d = Math.hypot(dx, dy), reach = (o.rad || 0.3) + 0.3;
  if (d < reach) { zrClamp(C, o); return; }
  const sp = (C.tier ? ZRC.SP_T : ZRC.SP) * dt, step = Math.min(sp, d - reach * 0.6);
  C.h = bearingOf(dx, dy); C.ph += dt * 26;
  const bx = C.x, by = C.y;
  zmMove(C, dx / d * step, dy / d * step);
  C.z = G0 + zrFoot(C);
  // (stuck on a corner: after a while, it tries for another)
  if (Math.hypot(C.x - bx, C.y - by) < step * 0.3) { C.stuck += dt; if (C.stuck > 0.7) { C.stuck = 0; C.bad = o; C.badT = 2.5; C.seek = 0; } } else C.stuck = Math.max(0, C.stuck - dt);
  if (C.t > 22) zrFinish(C);
}
function zrClamp(C, o) {
  C.st = 'clamp'; C.on = o; C.hold = 0; C.nip = 0.12;
  const d = Math.hypot(C.x - o.x, C.y - o.y) || 1, rad = (o.rad || 0.3) * 0.8;
  C.ox = (C.x - o.x) / d * rad; C.oy = (C.y - o.y) / d * rad;
  if (!isFinite(C.ox) || (C.ox === 0 && C.oy === 0)) { C.ox = rad; C.oy = 0; }
  C.z = FPSC.GROUND + (o.jz || 0);
  zrSound('clamp', C.mine ? 0 : zrDist(C));
}
function zrLetGo(C) {
  C.on = null; C.to = null; C.left--; C.seek = 0; C.stuck = 0;
  if (C.left <= 0) { zrFinish(C); return; }
  C.st = 'run';
  // (off it, and back onto the floor beside it)
  if (zmBlockedAt(C.x, C.y, 0.15, C.jz || 0)) { C.x -= C.ox; C.y -= C.oy; }
  zmSettle(C); C.z = FPSC.GROUND + zrFoot(C);
}
function zrFinish(C) {
  C.st = 'go'; C.gone = 0; C.on = null;
  if (!C.tier) { zrSound('dig', C.mine ? 0 : zrDist(C)); return; }
  // the Crab King's: a scald of boiling brine
  const z = FPSC.GROUND + zrFoot(C) + 0.3;
  C.gone = 0.5;
  zxBoom(C.x, C.y, z, ZRC.SCALD_R, zxHp() * ZRC.SCALD, 'r', C.mine, 0.6);
  for (let i = 0; i < 18; i++) { const a = Math.random() * 6.283, sp = 1 + Math.random() * 3; FPS.parts.push({ x: C.x, y: C.y, z, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp, vz: 1 + Math.random() * 3, t: 0.8, c: Math.random() < 0.5 ? '225,235,240' : '190,210,215', up: true }); }
  zrSound('scald', C.mine ? 0 : zrDist(C));
}
const zrDist = C => Math.hypot(C.x - FPS.me.x, C.y - FPS.me.y);

// ---------- sounds (made here: no recordings) ----------
function zrSound(k, d) {
  try {
    if (soundOff()) return;
    const v = Math.max(0.05, 1 - (d || 0) / 120);
    if (k === 'snap') { noise('highpass', 2600, 0.7, 0.001, 0.75 * v, 0.07); tone(2200, 'square', 0.001, 0.12 * v, 0.035, { to: 500 }); tone(240, 'sine', 0.004, 0.3 * v, 0.16, { to: 1100, delay: 0.02 }); noise('lowpass', 900, 0.8, 0.003, 0.3 * v, 0.25, { delay: 0.02 }); }
    else if (k === 'land') { noise('lowpass', 700, 1, 0.002, 0.12 * v, 0.08); for (let i = 0; i < 3; i++) noise('bandpass', 3800, 6, 0.001, 0.04 * v, 0.02, { delay: 0.05 + i * 0.04 }); }
    else if (k === 'clamp') { noise('bandpass', 2000, 3, 0.001, 0.2 * v, 0.05); tone(900, 'square', 0.001, 0.05 * v, 0.03, { to: 300 }); }
    else if (k === 'nip') { if (Math.random() < 0.6) noise('bandpass', 3000 + Math.random() * 800, 5, 0.001, 0.07 * v, 0.03); }
    else if (k === 'dig') { noise('lowpass', 500, 1, 0.02, 0.12 * v, 0.4); }
    else if (k === 'scald') { noise('lowpass', 800, 0.8, 0.003, 0.4 * v, 0.3); noise('highpass', 3500, 0.7, 0.05, 0.16 * v, 1.0); }
  } catch (e) {}
}

// ---------- in 3D: the crabs (a pool of models, kept with the scene they were made in) ----------
// a hermit crab the size of a cat: a small rust-red body, six legs, one big claw and one small, its eyes up on
// stalks, and on its back the whelk shell it lives in. The Crab King's are red-gold, larger, and glow like embers.
const ZR3 = { grp: null, pool: [], geo: null };
function zrGeo() {
  const G = {};
  G.body = new THREE.SphereGeometry(0.11, 10, 6); G.body.scale(1.25, 0.6, 1);
  G.whelk = new THREE.ConeGeometry(0.11, 0.26, 12, 1); G.whelk.rotateX(Math.PI / 2 + 0.35);
  G.coil = new THREE.TorusGeometry(0.085, 0.022, 6, 14);
  G.leg = new THREE.CylinderGeometry(0.014, 0.01, 0.17, 4); G.leg.translate(0, -0.085, 0);
  G.big = new THREE.SphereGeometry(0.06, 8, 5); G.big.scale(1.6, 0.8, 0.9);
  G.small = new THREE.SphereGeometry(0.035, 6, 4); G.small.scale(1.5, 0.8, 0.9);
  G.pin = new THREE.BoxGeometry(0.08, 0.018, 0.022); G.pin.translate(0.04, 0, 0);
  G.stalk = new THREE.CylinderGeometry(0.007, 0.007, 0.06, 4); G.stalk.translate(0, 0.03, 0);
  G.eye = new THREE.SphereGeometry(0.016, 6, 4);
  return G;
}
function zrModel() {
  if (ZR3.grp !== Z3.grp) { ZR3.grp = Z3.grp; ZR3.pool = []; ZR3.geo = zrGeo(); }
  let M = ZR3.pool.find(p => !p.used);
  if (!M) {
    const G = ZR3.geo, root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 0.12;
    const shell = z3Lam('#9a3a22'), leg = z3Lam('#6a2618'), whelkM = z3Lam('#d8c6a4'), eyeM = new THREE.MeshBasicMaterial({ color: 0xffe6a0 });
    body.add(new THREE.Mesh(G.body, shell));
    // (its sides are local ±x, its front -z: it walks along x, as a crab does)
    const wk = new THREE.Group(); wk.position.set(0, 0.07, 0.1); body.add(wk);
    wk.add(new THREE.Mesh(G.whelk, whelkM));
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(G.coil, whelkM); c.position.set(0, 0.03 * i - 0.02, 0.05 - i * 0.06); c.scale.setScalar(1 - i * 0.28); c.rotation.x = 0.35; wk.add(c); }
    const legs = [];
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const p = new THREE.Group(); p.position.set(s * 0.12, 0, -0.05 + i * 0.07); p.rotation.z = s * 1.3; p.rotation.y = (i - 1) * 0.3 * s;
      p.add(new THREE.Mesh(G.leg, leg));
      const k = new THREE.Group(); k.position.y = -0.16; k.rotation.z = -s * 1.2; k.add(new THREE.Mesh(G.leg, leg)); p.add(k);
      body.add(p); legs.push({ p, s, i });
    }
    const claws = [[1, G.big, 1.0], [-1, G.small, 0.7]].map(([s, geo, k]) => {
      const p = new THREE.Group(); p.position.set(s * 0.08, 0.01, -0.12); p.rotation.x = 1.2; p.rotation.z = -s * 0.3;
      p.add(new THREE.Mesh(G.leg, leg));
      const c = new THREE.Group(); c.position.y = -0.15; c.scale.setScalar(k); p.add(c);
      c.add(new THREE.Mesh(geo, shell));
      const pin = new THREE.Mesh(G.pin, leg); pin.position.set(0.03 * s, -0.03, 0); pin.rotation.y = s > 0 ? 0 : Math.PI; c.add(pin);
      body.add(p); return { p, pin, s };
    });
    for (const s of [-1, 1]) { const st = new THREE.Mesh(G.stalk, leg); st.position.set(s * 0.04, 0.05, -0.1); body.add(st); const e = new THREE.Mesh(G.eye, eyeM); e.position.set(s * 0.04, 0.11, -0.1); body.add(e); }
    M = { root, body, legs, claws, shell, leg, eyeM, used: false };
    ZR3.pool.push(M); Z3.grp.add(root);
  }
  M.used = true; M.root.visible = true;
  return M;
}
function zr3d(dt) {
  if (!Z3.grp) return;
  if (ZR3.grp !== Z3.grp) { ZR3.grp = Z3.grp; ZR3.pool = []; ZR3.geo = zrGeo(); for (const C of ZR.crabs) C.mdl = null; }
  for (const M of ZR3.pool) M.used = false;
  const t = g.t;
  for (const C of ZR.crabs) {
    const M = ZR3.pool.find(p => p === C.mdl && !p.used) || zrModel();
    C.mdl = M; M.used = true; M.root.visible = true;
    const gold = !!C.tier, z = C.st === 'fly' ? C.z : FPSC.GROUND + zrFoot(C) + (C.st === 'clamp' && C.on ? (C.on.skit ? 0.15 : 0.35) : 0);
    M.root.position.copy(z3v(C.x, C.y, z));
    M.root.scale.setScalar((gold ? 1.25 : 1) * (C.st === 'go' && !C.tier ? Math.max(0.01, 1 - C.gone / 0.7) : 1));
    if (C.st === 'go' && C.tier) M.root.visible = false;
    M.shell.color.set(gold ? '#c8642a' : '#9a3a22').multiplyScalar(0.62);
    const ember = gold ? 0.35 + 0.2 * Math.sin(t * 7 + C.seed) : 0;
    M.shell.emissive.setRGB(ember, ember * 0.45, ember * 0.08); M.leg.emissive.setRGB(ember * 0.5, ember * 0.2, 0);
    M.eyeM.color.set(gold ? 0xffa040 : 0xffe6a0);
    // (sideways to the way it goes; clinging, it faces what it holds; flying, it tumbles)
    const face = C.st === 'clamp' && C.on ? bearingOf(C.on.x - C.x, C.on.y - C.y) : C.h;
    M.root.rotation.set(C.st === 'fly' ? C.t * 9 : 0, -face + (C.st === 'clamp' ? 0 : Math.PI / 2 * (C.seed % 2 ? 1 : -1)), C.st === 'fly' ? C.t * 5 : 0);
    const run = C.st === 'run' ? 1 : C.st === 'fly' ? 0.6 : 0.2;
    for (const L of M.legs) L.p.rotation.x = Math.sin(C.ph + L.i * 1.9 + (L.s > 0 ? Math.PI : 0)) * 0.5 * run;
    M.body.position.y = 0.12 + Math.abs(Math.sin(C.ph)) * 0.015 * run;
    const nip = C.st === 'clamp' ? Math.max(0, Math.sin((C.nip / ZRC.NIP_T) * Math.PI)) : 0;
    for (const K of M.claws) { K.p.rotation.x = 1.2 + nip * 0.5 + Math.sin(t * 3 + C.seed + K.s) * 0.1; K.pin.rotation.z = (C.st === 'clamp' ? 0.1 + nip * 0.5 : 0.25 + 0.2 * Math.sin(t * 4 + K.s)) * -K.s; }
  }
  for (const M of ZR3.pool) if (!M.used) M.root.visible = false;
}

// ---------- painted over the view: the snap's burst of water going out ----------
function zrDrawOver() {
  if (!ZR.snaps.length) return;
  ctx.save(); ctx.lineCap = 'round';
  for (const S of ZR.snaps) {
    const k = S.t / 0.4, rr = 0.3 + S.R * 0.8 * Math.sqrt(k), pts = [];
    for (let i = -6; i <= 6; i++) { const a = S.h + i / 6 * 0.75; pts.push([S.x + Math.sin(a) * rr, S.y + Math.cos(a) * rr, S.z + Math.cos(i / 6 * 1.4) * 0.25]); }
    const p = polyProj(pts); if (p.length < 2) continue;
    ctx.strokeStyle = S.gold ? `rgba(255,200,140,${0.55 * (1 - k)})` : `rgba(205,235,245,${0.6 * (1 - k)})`; ctx.lineWidth = 4 * (1 - k) + 1;
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); ctx.stroke();
    const c = cam(S.x, S.y, S.z);
    if (c.f > 0.4 && k < 0.5) { const q = proj(c), s = Math.max(6, 0.5 * q.s * (1 - k)), gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s); gr.addColorStop(0, `rgba(235,250,255,${0.7 * (1 - k * 2)})`); gr.addColorStop(1, 'rgba(200,230,240,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, 6.283); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- in your hand: the claw on its gauntlet ----------
// A brass grip and cuff on the hand, and out in front a great red claw, knobbled and banded in brass, its upper
// finger hinged to snap down on the lower; on the cuff, the whelk shell, a crab looking out of its mouth. Firing, the
// claw snaps shut and slowly opens again. Reloading: the claw tipped over to the left, a crab brought up in the left
// hand and pushed into the shell's mouth, and the claw worked twice to wake them.
function zrvCone(r, h, mat) { const geo = new THREE.ConeGeometry(r, h, 10); geo.translate(0, h / 2, 0); geo.rotateX(-Math.PI / 2); return new THREE.Mesh(geo, mat); }
function zrvCrab(M) {
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), M.claw); b.scale.set(1.3, 0.7, 1); g.add(b);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.004, 5, 4), M.eye); e.position.set(s * 0.006, 0.012, -0.012); g.add(e); const c = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), M.claw); c.scale.set(1.4, 0.8, 1); c.position.set(s * 0.016, 0, -0.016); g.add(c); }
  return g;
}
VM_BUILD.hermit = (M) => {
  const root = new THREE.Group();
  M.eye = new THREE.MeshBasicMaterial({ color: 0xffe6a0 });
  // (the claw's own red, whatever the gauntlet's metal is painted)
  M.claw = new THREE.MeshPhongMaterial({ color: 0xa8442a, specular: 0x804030, shininess: 45 });
  M.shellW = new THREE.MeshPhongMaterial({ color: 0xd8c6a4, specular: 0x605040, shininess: 30 });
  // the grip, the trigger, the cuff
  root.add(profile([[0.0, 0.01], [0.03, -0.06], [0.025, -0.11], [0.06, -0.12], [0.075, -0.06], [0.05, 0.02]], 0.036, M.wood, 0.004));
  root.add(zcyl(0.03, 0.034, 0.08, M.brass, 18, 0.03, 0, 0.035));
  for (const z of [0.02, -0.04]) root.add(zcyl(0.037, 0.037, 0.008, M.iron, 18, z, 0, 0.035));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 6, 18, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.005, 0.005); root.add(guard);
  const trig = box(0.005, 0.022, 0.007, M.dark, 0, 0.0, 0.004); root.add(trig);
  // the claw: a tall, flat palm, the lower finger fixed, the upper on its hinge, knobs along the top, dark tips. It's
  // rolled a touch to the left, so you see the fingers opening
  const claw = new THREE.Group(); claw.position.set(0, 0.04, -0.07); claw.rotation.z = 0.2; root.add(claw);
  claw.add(zcyl(0.036, 0.04, 0.025, M.brass, 16, 0.02));
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), M.claw); palm.scale.set(0.5, 1.0, 1.35); palm.position.set(0, 0.005, -0.08); claw.add(palm);
  for (let i = 0; i < 6; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), M.claw); k.position.set((i % 2 ? 1 : -1) * 0.012, 0.055 - Math.abs(i - 2.5) * 0.004, -0.02 - i * 0.02); claw.add(k); }
  const lowF = new THREE.Group(); lowF.position.set(0, -0.03, -0.14); lowF.rotation.x = -0.22; claw.add(lowF);
  { const f = zrvCone(0.026, 0.17, M.claw); f.scale.set(0.6, 1.2, 1); lowF.add(f); const tp = zrvCone(0.011, 0.04, M.dark); tp.position.set(0, 0.012, -0.16); tp.rotation.x = 0.45; lowF.add(tp); }
  const jaw = new THREE.Group(); jaw.position.set(0, 0.035, -0.13); claw.add(jaw);
  const up = zrvCone(0.028, 0.18, M.claw); up.scale.set(0.6, 1.2, 1); up.rotation.x = -0.12; jaw.add(up);
  const upTip = zrvCone(0.01, 0.035, M.dark); upTip.position.set(0, -0.022, -0.165); upTip.rotation.x = -0.4; jaw.add(upTip);
  for (let i = 0; i < 4; i++) { jaw.add(box(0.006, 0.012, 0.007, M.shellW, 0, -0.022 - i * 0.002, -0.035 - i * 0.03)); lowF.add(box(0.006, 0.012, 0.007, M.shellW, 0, 0.02, -0.03 - i * 0.03)); }
  // the whelk shell on the cuff, its mouth forward, a crab looking out
  const whelk = new THREE.Group(); whelk.position.set(0.055, 0.045, 0.06); whelk.scale.setScalar(0.6); whelk.rotation.z = -0.9; root.add(whelk);
  { const c = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.13, 14), M.shellW); c.rotation.x = Math.PI / 2 + 0.3; c.position.z = 0.05; whelk.add(c); }
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.034 * (1 - i * 0.22), 0.008, 6, 16), M.shellW); t.position.set(0, 0.006 * i, 0.012 + i * 0.03); whelk.add(t); }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16), M.brass); lip.position.z = -0.012; whelk.add(lip);
  const peek = zrvCrab(M); peek.position.set(0, 0.0, -0.012); whelk.add(peek);
  const fresh = zrvCrab(M); fresh.visible = false; root.add(fresh);
  const hand = vmHand(VM.H, false); hand.position.set(0.01, -0.045, 0.045); root.add(hand);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.035, -0.37); root.add(muzzle);
  return { root, M, hand, claw, jaw, whelk, peek, fresh, trig, muzzle, pose: { x: 0.1, y: -0.17, z: -0.46, rx: 0.1, ry: 0.32, rz: -0.06 }, smoke: 0, flashK: 0.35 };
};
VM_ANIM.hermit = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) w.snapT = 1;
  w.snapT = Math.max(0, (w.snapT || 0) - S.dt * 2.6);
  const tip = vmSeg(p, 0, 0.14) - vmSeg(p, 0.86, 1), bring = vmSeg(p, 0.14, 0.42), push = vmSeg(p, 0.42, 0.56), work = S.reloading && p > 0.62 && p < 0.84 ? (p - 0.62) / 0.22 : -1;
  w.steps = w.steps || [[0.5, () => vmNoise(2600, 0.04, 0.08)], [0.56, () => vmClick(1500, 0.03)], [0.68, () => vmClick(2400, 0.05)], [0.79, () => vmClick(2400, 0.05)]];
  vmPlace(w, S, 0, { x: -tip * 0.04, y: tip * 0.02, z: -tip * 0.03, rx: -tip * 0.15, ry: -tip * 0.3, rz: tip * 0.7 });
  // the upper finger: open, snapped shut, opening again; worked twice on the reload
  const breathe = S.still ? 0 : 0.03 * Math.sin(S.t * 2.2);
  w.jaw.rotation.x = work >= 0 ? 0.55 * Math.abs(Math.cos(work * Math.PI * 2)) : (0.55 + breathe) * (1 - w.snapT * w.snapT) - 0.2 * w.snapT;
  // (the crab in the shell's mouth ducks in at the snap)
  w.peek.position.z = -0.012 + w.snapT * 0.03; w.peek.visible = !(S.reloading && p > 0.1 && p < 0.56);
  w.fresh.visible = S.reloading && bring > 0.01 && p < 0.56;
  if (w.fresh.visible) {
    const mouth = zrvV(0.055, 0.045, 0.05), home = zrvV(-0.2, -0.26, 0.02);
    w.fresh.position.copy(home).lerp(mouth.clone().add(zrvV(0, 0.03, -0.04)), bring).lerp(mouth, push); w.fresh.rotation.set(0, 0, (1 - bring) * 0.8 + Math.sin(S.t * 30) * 0.15);
    w.fresh.scale.setScalar(1 - push * 0.6);
    vmLeftAt(w, w.fresh.position.clone().add(zrvV(-0.01, -0.035, 0.03)), [0.4, 0, -0.5]);
  }
  w.trig.rotation.x = S.trigger ? 0.35 : 0;
};
const zrvV = (x, y, z) => new THREE.Vector3(x, y, z);
