'use strict';
// The Chronicle of the Light: the campaign's own four callings, in place of Maren's End's three (src/rclass.js) while
// a mission is played. Each has two weapons, a trait that's always on, its own jump, a grenade that comes back (G) and
// an ultimate that fills as you fight (X). They're built to cover each other: a crew of four is strongest with one of
// each, but each can carry a mission alone.
//  - Keeper: carries the Light. Fresnel Lamp and Pepperbox. Lantern-Bearer: you, and friends within 9 m of you, mend
//    a knock every five seconds. Lamp Step: jump again in the air and a ring of light bursts under you, lighting them
//    (hurt half again as hard, by anyone) and pushing them off. Storm Lantern: it stands where it lands for twelve
//    seconds, and everything within 7 m of it is lit, slowed and scorched. Rekindle: a flash of the Light 14 m round
//    you that burns and hurls back every one of them, mends every friend in it to full, and gets the fallen up.
//  - Wrecker: fights close and dirty. Punt Gun and Cutlass. Hard as Nails: knocks land a quarter lighter. Lunge: jump
//    again in the air to hurl yourself forward through them. Grapple-Chain: everything within 8 m of where it lands is
//    dragged into a heap, and then it bursts. Wreckers' Fury: twelve seconds when every pull of the trigger is a wide
//    cleave that throws them back, knocks are halved, and every one dropped mends a knock.
//  - Riding Officer (the Coastguard's man): picks them off from far away. Longarm and Pepperbox. Dead Eye: head shots
//    hit a third harder and every gun loads a quarter quicker. Hang Fire: jump again in the air to hang there, steady,
//    for up to two seconds. Rescue Rocket: flies fast and nearly flat, and bursts where it strikes, lighting what it
//    doesn't kill. Rocket Barrage: twelve rockets fall over four seconds about the spot you're looking at.
//  - Lampwright: brass and glass. Avtomat and Harpoon gun. Gunsmith: guns hit 15% harder. Grapnel Line: jump again in
//    the air to fire a line at what you're looking at (up to 22 m) and be hauled to it. Lens Sentry: a little brass lamp
//    on a tripod that burns the nearest of them within 16 m for fourteen seconds. The Great Lens: for sixteen seconds,
//    a great lens that burns three of them at a time within 20 m, slows them, and halves the knocks on friends near it.
// Balance (in the drowned's strength, rclHp, against five of them in reach): every grenade does about 0.5 to 0.8 a
// second over its wait, as Maren's End's do (the Keeper's less, for the light it throws on them), and every ultimate
// about 50 to 100, against the Brute's Bulwark's 75 (the Keeper's less, for the mending and the fallen got up).
// The grenades and ultimates are on the same budget as the three callings the missions were first tuned with
// (a blast's worth of damage every fifteen to twenty-two seconds, an ultimate about every two minutes, sooner with
// kills); each trait is the calling's own edge. Rekindle, which does most, fills a little slower (uk).
// Together: as for the callings (src/rclass.js), everything is judged on the thrower's screen and the hits go to the
// host through zmHurt and zmpStatus; the others see what's thrown and set down through the presence's events
// (rclEvent: 'g' a grenade, 'l' a Lamp Step, 'k' a Rekindle, 'b' a barrage, 'L' a Great Lens). Each player mends
// themselves near a Keeper or in a Rekindle; the Keeper who calls a Rekindle gets the fallen near them up (zmnRevive).
// The pick is kept on this browser (localStorage 'skerry-cp-class'), and each calling's missions seen through are in
// the campaign's progress (src/cp.js CPS.cls, in the save, merged: the higher count wins).
// Nothing here touches a boat: the callings are on foot only.

const CPCL_ORDER = ['keeper', 'wrecker', 'officer', 'lampw'];
const CPCLC = { AURA: 9, AURA_T: 5, LAN_R: 7, LAN_T: 12, STEP_R: 4.5, STEP_CD: 4, REK_R: 14, CHAIN_R: 8, DASH_V: 15, DASH_T: 0.28, DASH_CD: 2.4,
  FURY: 12, CLEAVE_R: 4, HOVER: 2, ROCK_R: 6, BAR_N: 12, BAR_T: 4, BAR_R: 7, HOOK_R: 22, HOOK_V: 24, HOOK_CD: 3.5, SEN_R: 16, SEN_T: 14, LENS_R: 20, LENS_T: 16, LENS_SAFE: 6 };
const CPCL = { lan: [], rings: [], chains: [], bar: [], sen: [], lens: [], dash: null, dashCd: 0, stepCd: 0, hover: 0, hook: null, hookCd: 0, mendT: 0, cleaves: [] };
Object.assign(ZM_DMG, { K: 1, W: 1, R: 1, S: 1, E: 1 });
const cpclWon = k => () => { const n = typeof CPS !== 'undefined' && CPS.cls ? CPS.cls[k] | 0 : 0; return n ? `${n} mission${n === 1 ? '' : 's'} seen through as one` : 'Not yet taken into a mission'; };
Object.assign(RCL_CLASSES, {
  keeper: { n: 'Keeper', c: '#ffd88a', rgb: '255,216,138', tag: 'Carries the Light: burns them where they stand, and keeps the crew on its feet.',
    w: ['fresnel', 'pepperbox'], gcd: 20, uk: 0.85, won: cpclWon('keeper'),
    trait: ['Lantern-Bearer', 'You, and friends within 9 m of you, mend a knock every five seconds.'],
    jump: ['Lamp Step', 'Jump again in the air: a ring of light bursts under you, lighting them and pushing them off.'],
    gren: ['Storm Lantern', 'It stands where it lands for twelve seconds: all near it are lit, slowed and scorched.'],
    ult: ['Rekindle', 'A flash 14 m round you: burns and hurls them back, mends friends to full, and the fallen get up.'] },
  wrecker: { n: 'Wrecker', c: '#e06a50', rgb: '224,106,80', tag: 'Fights close and dirty: drags them in, and carves through the crowd.',
    w: ['puntgun', 'cutlass'], gcd: 18, won: cpclWon('wrecker'),
    trait: ['Hard as Nails', 'Every knock on you lands a quarter lighter.'],
    jump: ['Lunge', 'Jump again in the air to hurl yourself forward, through any in the way.'],
    gren: ['Grapple-Chain', 'All within 8 m of where it lands are dragged into a heap, and then it bursts.'],
    ult: ['Wreckers’ Fury', 'Twelve seconds: every shot a wide cleave, knocks halved, every one dropped mends a knock.'] },
  officer: { n: 'Riding Officer', c: '#8ab4ff', rgb: '138,180,255', tag: 'The Coastguard’s man: picks them off from far away, and calls the rockets down.',
    w: ['longarm', 'pepperbox'], gcd: 15, won: cpclWon('officer'),
    trait: ['Dead Eye', 'Head shots hit a third harder, and every gun loads a quarter quicker.'],
    jump: ['Hang Fire', 'Jump again in the air to hang there, steady, for up to two seconds.'],
    gren: ['Rescue Rocket', 'Flies fast and nearly flat, and bursts where it strikes, lighting what it doesn’t kill.'],
    ult: ['Rocket Barrage', 'Twelve rockets fall over four seconds about the spot you’re looking at.'] },
  lampw: { n: 'Lampwright', c: '#c09aff', rgb: '192,154,255', tag: 'Brass and glass: sets down lenses that fight beside the crew.',
    w: ['avtomat', 'harpoon'], gcd: 22, won: cpclWon('lampw'),
    trait: ['Gunsmith', 'Your guns hit 15% harder.'],
    jump: ['Grapnel Line', 'Jump again in the air to fire a line at what you look at, and be hauled to it.'],
    gren: ['Lens Sentry', 'A brass lamp on a tripod that burns the nearest of them for fourteen seconds.'],
    ult: ['The Great Lens', 'Sixteen seconds: burns three at a time, slows them, halves the knocks on friends near it.'] },
});
RCL_ORDER.push(...CPCL_ORDER);
Object.assign(RCL_ICON, {
  keeper: '<path d="M9 21h6M10 21V11h4v10M8 11h8l-1-3H9zM12 8V5"/><path d="M4 7l3 1.5M20 7l-3 1.5M4 12h3M20 12h-3"/>',
  wrecker: '<path d="M5 19L15 9M13 7l4 4M15 5l4 4-2 2-4-4z"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M14 18c2 0 4-1 5-3"/>',
  officer: '<path d="M12 2l2 5h-4zM10 7h4v9h-4zM9 16l-2 4M15 16l2 4M12 16v5"/><path d="M5 11c2 1 3 3 3 5M19 11c-2 1-3 3-3 5"/>',
  lampw: '<circle cx="12" cy="8" r="4"/><path d="M12 12v4M12 16l-5 5M12 16l5 5M12 16v5"/><path d="M10 8h4M12 6v4"/>',
});

// ---------- shared bits ----------
const cpclG = () => FPSC.GROUND;
const cpclAlive = o => o && !o.dead;
const cpclMine = () => FPS.me;
const cpclSnd = (k, x, y) => { try { if (soundOff()) return; const v = x == null ? 1 : Math.max(0.08, 1 - Math.hypot(x - FPS.me.x, y - FPS.me.y) / 45);
  if (k === 'step') { tone(520, 'sine', 0.005, 0.12 * v, 0.4, { to: 1040 }); noise('highpass', 2500, 0.8, 0.01, 0.08 * v, 0.35); }
  else if (k === 'lan') { tone(330, 'triangle', 0.01, 0.1 * v, 0.5, { to: 660 }); noise('bandpass', 1200, 2, 0.02, 0.06 * v, 0.4); }
  else if (k === 'rek') { tone(220, 'sine', 0.02, 0.2 * v, 1.4, { to: 880 }); tone(660, 'sine', 0.05, 0.14 * v, 1.2, { to: 1320 }); noise('highpass', 1800, 0.6, 0.05, 0.14 * v, 1.0); }
  else if (k === 'chain') { for (let i = 0; i < 4; i++) tone(700 + i * 160, 'square', 0.002 + i * 0.03, 0.03 * v, 0.06); noise('bandpass', 2200, 3, 0.005, 0.08 * v, 0.3); }
  else if (k === 'dash') noise('bandpass', 900, 1, 0.01, 0.16 * v, 0.25, { to: 300 });
  else if (k === 'cleave') { noise('bandpass', 1600, 1.5, 0.005, 0.18 * v, 0.2, { to: 500 }); tone(180, 'sawtooth', 0.005, 0.06 * v, 0.15, { to: 90 }); }
  else if (k === 'hover') tone(440, 'sine', 0.05, 0.06, 0.5, { to: 470 });
  else if (k === 'rocket') noise('highpass', 1400, 0.7, 0.01, 0.12 * v, 0.6, { to: 3000 });
  else if (k === 'whistle') tone(1800, 'sine', 0.02, 0.05 * v, 0.6, { to: 600 });
  else if (k === 'hook') { tone(900, 'square', 0.002, 0.04, 0.08); noise('bandpass', 1800, 2, 0.005, 0.1, 0.4, { to: 800 }); }
  else if (k === 'zap') tone(1300 + Math.random() * 300, 'sine', 0.003, 0.025 * v, 0.07);
  else if (k === 'mend') { tone(660, 'sine', 0.02, 0.05, 0.3, { to: 880 }); }
  else if (k === 'lens') { tone(165, 'triangle', 0.05, 0.16 * v, 1.2, { to: 330 }); tone(990, 'sine', 0.1, 0.06 * v, 1.0); }
} catch (e) {} };
// those of them within r of (x, y), on about the same floor
const cpclNear = (x, y, fz, r, dz) => ZM.z.filter(o => cpclAlive(o) && Math.abs((o.jz || 0) - fz) < (dz || 1.8) && Math.hypot(o.x - x, o.y - y) < r + (o.rad || 0.3));
const cpclSees = (x, y, z, o, range) => { const hd = Math.hypot(o.x - x, o.y - y), cz = FPSC.GROUND + (o.jz || 0) + 1.1; return hd < 0.6 || fpsRay(x, y, z, bearingOf(o.x - x, o.y - y), Math.atan2(cz - z, hd), FPS.me.id, [o], (range || hd) + 2).kind === 'body'; };
const cpclKb = (o, x, y, k, stun) => { const d = Math.hypot(o.x - x, o.y - y); if (d > 0.05 && typeof zmpStatus === 'function') zmpStatus(o, 'kb', (o.x - x) / d * k, (o.y - y) / d * k, stun || 0.6); };
const cpclAir = m => (m.jz || 0) > (m.fl || 0) + 0.02 || (m.vz || 0) > 0;
const cpclMax = () => rclMax();
function cpclMend(n) { const m = FPS.me; if (m.dead > 0 || zmIsDown() || ZM.ghost || m.hp >= cpclMax()) return false; m.hp = Math.min(cpclMax(), m.hp + n); FPS.calm = 0; return true; }
// the others standing, and where
const cpclOthers = () => [...FPS.remote.values()].filter(r => r.x != null && !r.dead);

// ---------- the Keeper ----------
RCL_EXT.keeper = {
  sticky: true, fuse: 3, trail: '255,220,150', ball: '#ffe2a0',
  reset() { CPCL.lan = []; CPCL.rings = []; CPCL.mendT = 0; CPCL.stepCd = 0; },
  jump(m, air) {
    if (!air) return false;
    if (RCL.air >= 1 || CPCL.stepCd > 0) return true;
    RCL.air = 1; CPCL.stepCd = CPCLC.STEP_CD; m.vz = Math.max(m.vz, FPSC.JUMP * 0.8);
    cpclStep(m.x, m.y, m.jz || 0, true);
    rclEvent('l', m.x - FPSC.CX, m.y - FPSC.CY, m.jz || 0);
    return true;
  },
  burst(P, fz) { CPCL.lan.push({ x: P.x, y: P.y, fz, t: CPCLC.LAN_T, T: CPCLC.LAN_T, k: 0, mine: P.mine }); fpsPuff(P.x, P.y, P.z, '255,220,150', 12); cpclSnd('lan', P.x, P.y); },
  ult(m) { cpclRekindle(m.x, m.y, m.fl || 0, true); rclEvent('k', m.x - FPSC.CX, m.y - FPSC.CY, m.fl || 0); },
  tick(dt, mine, down, dead) {
    if (mine && CPCL.stepCd > 0) CPCL.stepCd -= dt;
    for (const L of CPCL.lan) {
      L.t -= dt; L.k -= dt;
      if (!L.mine || L.k > 0) continue;
      L.k = 0.5;
      for (const o of cpclNear(L.x, L.y, L.fz, CPCLC.LAN_R)) { if (typeof zmpStatus === 'function') { zmpStatus(o, 'mark', 1.2); zmpStatus(o, 'slow', 0.8); } zmHurt(o, rclHp() * 0.06, false, 'K', FPS.me.id); }
    }
    CPCL.lan = CPCL.lan.filter(L => L.t > 0);
    for (const q of CPCL.rings) q.t += dt; CPCL.rings = CPCL.rings.filter(q => q.t < q.T);
    // Lantern-Bearer: near a Keeper (or one yourself), a knock mended every few seconds
    const m = FPS.me;
    const near = (RCL.cls === 'keeper' && !down && !dead) || cpclOthers().some(r => r.rc === 'keeper' && !r.down && Math.hypot(r.x - m.x, r.y - m.y) < CPCLC.AURA);
    if (near && !down && !dead && m.hp < cpclMax()) { CPCL.mendT += dt; if (CPCL.mendT >= CPCLC.AURA_T) { CPCL.mendT = 0; if (cpclMend(1)) cpclSnd('mend'); } } else CPCL.mendT = Math.min(CPCL.mendT, CPCLC.AURA_T * 0.6);
  },
  heard(r, k, a) {
    if (k === 'l' && a.length >= 3) cpclStep(FPSC.CX + a[0], FPSC.CY + a[1], a[2], false);
    else if (k === 'k' && a.length >= 3) { cpclRekindle(FPSC.CX + a[0], FPSC.CY + a[1], a[2], false); fpsFeed(`${r.n}: Rekindle.`); }
  },
  draw(stroke, ring, tm) {
    const G0 = cpclG();
    for (const L of CPCL.lan) {
      const f = Math.min(1, L.t / 1.2) * Math.min(1, (L.T - L.t) / 0.3), z = G0 + L.fz, fl = 0.8 + 0.2 * Math.sin(tm * 9 + L.x);
      stroke(ring(L.x, L.y, z + 0.04, CPCLC.LAN_R, 32), `rgba(255,220,140,${0.7 * f})`, 2, `rgba(255,200,110,${0.09 * f * fl})`);
      stroke([[L.x, L.y, z], [L.x, L.y, z + 1.1]], `rgba(60,48,36,${f})`, 3);
      cpclGlow(L.x, L.y, z + 1.2, '255,220,140', 0.16 * fl, f);
    }
    for (const q of CPCL.rings) { const k = q.t / q.T; stroke(ring(q.x, q.y, G0 + q.fz + 0.06, q.R * (0.15 + 0.85 * k), 40), `rgba(255,226,150,${0.9 * (1 - k)})`, q.R > 8 ? 5 : 3, q.R > 8 ? `rgba(255,230,160,${0.12 * (1 - k)})` : null); }
  },
};
function cpclStep(x, y, fz, mine) {
  CPCL.rings.push({ x, y, fz, R: CPCLC.STEP_R, t: 0, T: 0.6 });
  fpsPuff(x, y, cpclG() + fz + 0.2, '255,226,150', 14); cpclSnd('step', x, y);
  if (!mine) return;
  let any = false;
  for (const o of cpclNear(x, y, fz, CPCLC.STEP_R, 2.6)) { if (typeof zmpStatus === 'function') zmpStatus(o, 'mark', 5); cpclKb(o, x, y, 2.6, 0.7); any = true; }
  if (any) rclMark();
}
function cpclRekindle(x, y, fz, mine) {
  CPCL.rings.push({ x, y, fz, R: CPCLC.REK_R, t: 0, T: 1.1 });
  fpsPuff(x, y, cpclG() + fz + 1, '255,230,160', 40); cpclSnd('rek', x, y);
  const m = FPS.me;
  if (!(m.dead > 0) && !zmIsDown() && Math.hypot(m.x - x, m.y - y) < CPCLC.REK_R) { m.hp = cpclMax(); FPS.calm = 0; if (!mine) ZM.banner = { text: 'Rekindled', t: 2, small: true, col: '#ffd88a' }; }
  if (!mine) return;
  let any = false;
  for (const o of cpclNear(x, y, fz, CPCLC.REK_R, 3)) { if (!cpclSees(x, y, cpclG() + fz + 1.2, o, CPCLC.REK_R)) continue; zmHurt(o, rclHp() * 2.5, false, 'K', m.id, 'burn'); cpclKb(o, x, y, 3, 1.1); if (typeof zmpStatus === 'function') zmpStatus(o, 'mark', 4); any = true; }
  if (any) rclMark();
  // the fallen near me get up
  if (ZM.net) for (const r of cpclOthers()) if (r.down && Math.hypot(r.x - x, r.y - y) < CPCLC.REK_R) zmnRevive(r.id);
}

// ---------- the Wrecker ----------
RCL_EXT.wrecker = {
  sticky: true, fuse: 3, sp: 15, trail: '200,120,90', ball: '#4a3a30',
  reset() { CPCL.chains = []; CPCL.dash = null; CPCL.dashCd = 0; CPCL.cleaves = []; },
  jump(m, air) {
    if (!air) return false;
    if (CPCL.dash || CPCL.dashCd > 0) return true;
    CPCL.dash = { vx: Math.sin(m.h) * CPCLC.DASH_V, vy: Math.cos(m.h) * CPCLC.DASH_V, t: CPCLC.DASH_T, hit: new Set() }; CPCL.dashCd = CPCLC.DASH_CD;
    m.vz = Math.max(m.vz, 2.2); cpclSnd('dash'); fpsPuff(m.x, m.y, cpclG() + (m.jz || 0) + 0.6, '224,140,110', 8);
    return true;
  },
  burst(P, fz) {
    const C = { x: P.x, y: P.y, fz, t: 0, mine: P.mine, done: false };
    CPCL.chains.push(C); cpclSnd('chain', P.x, P.y);
    if (!P.mine) return;
    for (const o of cpclNear(P.x, P.y, fz, CPCLC.CHAIN_R, 2.4)) {
      if (o.boss) continue;
      const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < 0.9) continue;
      if (typeof zmpStatus === 'function') zmpStatus(o, 'kb', (P.x - o.x) / d * Math.min(7, d - 0.8), (P.y - o.y) / d * Math.min(7, d - 0.8), 1.0);
      o.hitT = 0.2;
    }
  },
  ult(m) { RCL.ultT = CPCLC.FURY; rclEvent('u'); FPS.scoped = false; },
  shoot(m) {
    m.cd = 0.5; FPS.recoil = 1.0;
    const x = m.x, y = m.y, fz = m.jz || 0;
    CPCL.cleaves.push({ x, y, z: cpclG() + fz + 1.1, h: m.h, t: 0 }); cpclSnd('cleave');
    let any = false;
    for (const o of cpclNear(x, y, fz, CPCLC.CLEAVE_R, 2)) {
      const d = Math.hypot(o.x - x, o.y - y);
      if (d > 0.8 && Math.abs(angDiff(bearingOf(o.x - x, o.y - y), m.h)) > 1.4) continue;
      zmHurt(o, rclHp() * 1.1, false, 'W', m.id); o.hitT = 0.3; cpclKb(o, x, y, 2.4, 0.8); any = true;
      fpsPuff(o.x, o.y, cpclG() + (o.jz || 0) + 1.1, '224,120,90', 5);
    }
    if (any) rclMark();
    if (typeof zmnShot === 'function') zmnShot('c', m.h, m.p);
  },
  // (rclTick: kills since the last frame) in the Fury, every one dropped mends a knock
  kill(n) { if (RCL.cls === 'wrecker' && RCL.ultT > 0) cpclMend(n); },
  hurt(n, mine) { if (!mine) return n; return n * (RCL.ultT > 0 ? 0.5 : 0.75); },
  tick(dt, mine) {
    if (!mine) return;
    if (CPCL.dashCd > 0) CPCL.dashCd -= dt;
    const m = FPS.me, D = CPCL.dash;
    if (D) {
      D.t -= dt; fpsMove(m, D.vx * dt, D.vy * dt);
      for (const o of cpclNear(m.x, m.y, m.jz || 0, 1.7, 2)) if (!D.hit.has(o)) { D.hit.add(o); zmHurt(o, rclHp() * 0.8, false, 'W', m.id); o.hitT = 0.25; cpclKb(o, m.x - D.vy * 0.05, m.y + D.vx * 0.05, 2, 0.7); rclMark(); }
      if (D.t <= 0) CPCL.dash = null;
    }
    for (const C of CPCL.chains) { C.t += dt; if (!C.done && C.t > 0.5) { C.done = true; zxBoom(C.x, C.y, cpclG() + C.fz + 0.4, 5.4, rclHp() * 2.5, 'W', C.mine, 0.5); } }
    CPCL.chains = CPCL.chains.filter(C => C.t < 0.9);
    for (const c of CPCL.cleaves) c.t += dt; CPCL.cleaves = CPCL.cleaves.filter(c => c.t < 0.25);
  },
  draw(stroke, ring, tm) {
    const G0 = cpclG();
    for (const C of CPCL.chains) { const k = Math.min(1, C.t / 0.5); stroke(ring(C.x, C.y, G0 + C.fz + 0.05, CPCLC.CHAIN_R * (1 - 0.85 * k), 36), `rgba(224,120,90,${0.85 * (1 - 0.6 * k)})`, 3); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + C.x, r = CPCLC.CHAIN_R * (1 - 0.85 * k); stroke([[C.x + Math.sin(a) * r, C.y + Math.cos(a) * r, G0 + C.fz + 0.3], [C.x, C.y, G0 + C.fz + 0.3]], `rgba(150,130,120,${0.6 * (1 - k)})`, 2); } }
    for (const c of CPCL.cleaves) { const k = c.t / 0.25, pts = []; for (let i = 0; i <= 14; i++) { const a = c.h - 1.4 + 2.8 * i / 14; pts.push([c.x + Math.sin(a) * CPCLC.CLEAVE_R * (0.6 + 0.4 * k), c.y + Math.cos(a) * CPCLC.CLEAVE_R * (0.6 + 0.4 * k), c.z]); } stroke(pts, `rgba(255,170,130,${0.9 * (1 - k)})`, 4); }
  },
};

// ---------- the Riding Officer ----------
RCL_EXT.officer = {
  sticky: true, fuse: 2.5, gr: 2.5, sp: 36, flat: true, trail: '255,160,90', ball: '#d8d0c0', reload: 0.75,
  reset() { CPCL.bar = []; CPCL.hover = 0; },
  dmg(d, dmg, head, code) { return head && /^[a-z]$/.test(code || '') ? dmg * 1.35 : dmg; },
  jump(m, air) {
    if (!air) return false;
    if (CPCL.hover > 0) { CPCL.hover = 0; return true; }
    if (RCL.air >= 1) return true;
    RCL.air = 1; CPCL.hover = CPCLC.HOVER; m.vz = Math.max(m.vz, 0.4); cpclSnd('hover');
    return true;
  },
  burst(P, fz) {
    zxBoom(P.x, P.y, P.z + 0.2, CPCLC.ROCK_R, rclHp() * 3, 'R', P.mine, 1.2);
    if (P.mine) for (const o of cpclNear(P.x, P.y, fz, CPCLC.ROCK_R, 2.5)) if (typeof zmpStatus === 'function') zmpStatus(o, 'mark', 4);
  },
  ult(m) {
    const ez = cpclG() + FPSC.EYE + (m.jz || 0), r = fpsRay(m.x, m.y, ez, m.h, m.p, m.id, [], 90);
    const t = r.kind === 'none' ? 40 : Math.max(6, r.t), x = m.x + Math.sin(m.h) * t, y = m.y + Math.cos(m.h) * t, fz = rclFloor(x, y, Math.max(0, ez + Math.tan(m.p) * t - cpclG() + 0.5));
    cpclBarrage(x, y, fz, true); rclEvent('b', x - FPSC.CX, y - FPSC.CY, fz);
  },
  tick(dt, mine) {
    if (mine) {
      const m = FPS.me;
      if (CPCL.hover > 0) { if (!cpclAir(m)) CPCL.hover = 0; else { CPCL.hover -= dt; if (m.vz < 0) m.vz = -0.12; if (!reduceMotion && Math.random() < dt * 14) FPS.parts.push({ x: m.x + (Math.random() - 0.5) * 0.5, y: m.y + (Math.random() - 0.5) * 0.5, z: cpclG() + (m.jz || 0) + 0.1, vx: 0, vy: 0, vz: -0.6, t: 0.5, c: '170,200,255', up: false }); } }
    }
    for (const B of CPCL.bar) { B.t += dt; for (const s of B.s) if (!s.done && B.t >= s.at) { s.done = true; zxBoom(s.x, s.y, cpclG() + s.fz + 0.3, 5, rclHp() * 2.4, 'R', B.mine, 1); } }
    CPCL.bar = CPCL.bar.filter(B => B.t < CPCLC.BAR_T + 1.5);
  },
  heard(r, k, a) { if (k === 'b' && a.length >= 3) { cpclBarrage(FPSC.CX + a[0], FPSC.CY + a[1], a[2], false); fpsFeed(`${r.n}: Rocket Barrage.`); } },
  draw(stroke, ring, tm) {
    const G0 = cpclG();
    for (const B of CPCL.bar) {
      const f = Math.min(1, (CPCLC.BAR_T + 1.5 - B.t) / 1);
      stroke(ring(B.x, B.y, G0 + B.fz + 0.05, CPCLC.BAR_R, 36), `rgba(138,180,255,${0.6 * f * (0.7 + 0.3 * Math.sin(tm * 8))})`, 2, `rgba(138,180,255,${0.06 * f})`);
      for (const s of B.s) { const k = (B.t - (s.at - 0.6)) / 0.6; if (s.done || k < 0) continue; const z = G0 + s.fz + 40 * (1 - k); stroke([[s.x - 3 * (1 - k), s.y, z + 3], [s.x - 3 * (1 - k) * 0.9, s.y, z]], 'rgba(255,190,120,0.95)', 3); cpclGlow(s.x - 3 * (1 - k) * 0.9, s.y, z, '255,180,110', 0.1, 1); }
    }
  },
};
function cpclBarrage(x, y, fz, mine) {
  const s = [];
  for (let i = 0; i < CPCLC.BAR_N; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * CPCLC.BAR_R, px = x + Math.sin(a) * r, py = y + Math.cos(a) * r; s.push({ x: px, y: py, fz: rclFloor(px, py, fz + 0.5), at: 0.6 + CPCLC.BAR_T * i / CPCLC.BAR_N, done: false }); }
  CPCL.bar.push({ x, y, fz, t: 0, s, mine }); cpclSnd('whistle', x, y);
}

// ---------- the Lampwright ----------
RCL_EXT.lampw = {
  sticky: true, fuse: 3, sp: 14, trail: '200,170,255', ball: '#b08a40',
  reset() { CPCL.sen = []; CPCL.lens = []; CPCL.hook = null; CPCL.hookCd = 0; },
  dmg(d, dmg, head, code) { return /^[a-z]$/.test(code || '') ? dmg * 1.15 : dmg; },
  jump(m, air) {
    if (!air) return false;
    if (CPCL.hook) { CPCL.hook = null; return true; }
    if (CPCL.hookCd > 0) return true;
    const ez = cpclG() + FPSC.EYE + (m.jz || 0), r = fpsRay(m.x, m.y, ez, m.h, m.p, m.id, [], CPCLC.HOOK_R);
    if (r.kind === 'none' || r.kind === 'body' || r.t < 2) { rclTone('tink'); return true; }
    const t = r.t - 0.8;
    CPCL.hook = { x: m.x + Math.sin(m.h) * t, y: m.y + Math.cos(m.h) * t, z: ez + Math.tan(m.p) * t, t: 1.1 }; CPCL.hookCd = CPCLC.HOOK_CD; cpclSnd('hook');
    return true;
  },
  burst(P, fz) { CPCL.sen.push({ x: P.x, y: P.y, fz, t: CPCLC.SEN_T, T: CPCLC.SEN_T, k: 0.3, tg: [], beam: 0, mine: P.mine, r: CPCLC.SEN_R, n: 1, dmg: 0.3, ev: 0.3 }); cpclSnd('lan', P.x, P.y); },
  // (set down a few steps ahead, where it's clear, so it isn't stood in your eyes)
  ult(m) {
    let x = m.x, y = m.y; for (let d = 3; d > 0.4; d -= 0.5) { const tx = m.x + Math.sin(m.h) * d, ty = m.y + Math.cos(m.h) * d; if (!zmBlockedAt(tx, ty, 0.4, m.fl || 0)) { x = tx; y = ty; break; } }
    const fz = rclFloor(x, y, (m.fl || 0) + 0.4); cpclLens(x, y, fz, true); rclEvent('L', x - FPSC.CX, y - FPSC.CY, fz);
  },
  hurt(n) { const m = FPS.me; return CPCL.lens.some(L => Math.hypot(m.x - L.x, m.y - L.y) < CPCLC.LENS_SAFE && Math.abs((m.jz || 0) - L.fz) < 2) ? n * 0.5 : n; },
  tick(dt, mine) {
    const m = FPS.me;
    if (mine) {
      if (CPCL.hookCd > 0) CPCL.hookCd -= dt;
      const H = CPCL.hook;
      if (H) {
        H.t -= dt;
        const dx = H.x - m.x, dy = H.y - m.y, d = Math.hypot(dx, dy), dz = H.z - (cpclG() + (m.jz || 0) + 1);
        if (d < 1 || H.t <= 0) CPCL.hook = null;
        else {
          const st = Math.min(d, CPCLC.HOOK_V * dt);
          if (!fpsMove(m, dx / d * st, dy / d * st) && d > 2) CPCL.hook = null;
          if (dz > -0.5) { m.vz = clamp(dz * 5, 2, 12); if (!((m.jz || 0) > (m.fl || 0))) m.jz = (m.fl || 0) + 0.001; }
        }
      }
    }
    for (const S of [...CPCL.sen, ...CPCL.lens]) {
      S.t -= dt; S.k -= dt; S.beam -= dt;
      if (S.k > 0) continue;
      S.k = S.ev;
      const top = cpclG() + S.fz + (S.big ? 2.4 : 1.0);
      const c = cpclNear(S.x, S.y, S.fz, S.r, 4).sort((a, b) => Math.hypot(a.x - S.x, a.y - S.y) - Math.hypot(b.x - S.x, b.y - S.y)).filter(o => cpclSees(S.x, S.y, top, o, S.r)).slice(0, S.n);
      S.tg = c; if (c.length) { S.beam = S.ev * 0.8; if (Math.random() < 0.5) cpclSnd('zap', S.x, S.y); }
      if (S.mine) for (const o of c) { o.scorch = Math.min(1, (o.scorch || 0) + 0.3); zmHurt(o, rclHp() * S.dmg, false, S.big ? 'E' : 'S', m.id, 'burn'); if (S.big && typeof zmpStatus === 'function') zmpStatus(o, 'slow', 0.6); }
    }
    CPCL.sen = CPCL.sen.filter(S => S.t > 0); CPCL.lens = CPCL.lens.filter(S => S.t > 0);
  },
  heard(r, k, a) { if (k === 'L' && a.length >= 3) { cpclLens(FPSC.CX + a[0], FPSC.CY + a[1], a[2], false); fpsFeed(`${r.n} set down the Great Lens.`); } },
  draw(stroke, ring, tm) {
    const G0 = cpclG(), m = FPS.me;
    if (CPCL.hook && RCL.cls === 'lampw') stroke([[m.x + Math.sin(m.h + 0.5) * 0.4, m.y + Math.cos(m.h + 0.5) * 0.4, G0 + (m.jz || 0) + 1.2], [CPCL.hook.x, CPCL.hook.y, CPCL.hook.z]], 'rgba(200,190,170,0.9)', 2);
    for (const S of [...CPCL.sen, ...CPCL.lens]) {
      const f = Math.min(1, S.t / 1.2) * Math.min(1, (S.T - S.t) / 0.3), z = G0 + S.fz, h = S.big ? 2.4 : 1.0, w = S.big ? 0.9 : 0.4;
      for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283; stroke([[S.x + Math.sin(a) * w, S.y + Math.cos(a) * w, z], [S.x, S.y, z + h]], `rgba(176,138,64,${f})`, S.big ? 4 : 2); }
      if (S.big) stroke(ring(S.x, S.y, z + 0.05, CPCLC.LENS_SAFE, 32), `rgba(192,154,255,${0.6 * f * (0.75 + 0.25 * Math.sin(tm * 4))})`, 2, `rgba(192,154,255,${0.08 * f})`);
      cpclGlow(S.x, S.y, z + h, '210,180,255', S.big ? 0.4 : 0.16, f);
      if (S.beam > 0) for (const o of S.tg) if (!o.dead) stroke([[S.x, S.y, z + h], [o.x, o.y, G0 + (o.jz || 0) + 1.1]], `rgba(230,210,255,${0.9 * f})`, S.big ? 4 : 2);
    }
  },
};
function cpclLens(x, y, fz, mine) { CPCL.lens.push({ x, y, fz, t: CPCLC.LENS_T, T: CPCLC.LENS_T, k: 0.25, tg: [], beam: 0, mine, r: CPCLC.LENS_R, n: 3, dmg: 0.3, ev: 0.25, big: true }); cpclSnd('lens', x, y); fpsPuff(x, y, cpclG() + fz + 1.5, '210,180,255', 20); }

// a glow at a point in the world: r, its size in metres
function cpclGlow(x, y, z, rgb, r, f) {
  const c = cam(x, y, z); if (c.f < 0.4) return;
  const q = proj(c), s = Math.max(3, r * q.s);
  const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s * 3); gr.addColorStop(0, `rgba(${rgb},${0.9 * f})`); gr.addColorStop(0.3, `rgba(${rgb},${0.35 * f})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, s * 3, 0, 6.283); ctx.fill();
}
