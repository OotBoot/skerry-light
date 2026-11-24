// The San Telmo: the Corposant, her chest's wonder weapon (only aboard her: ZM_MAPS noBox, src/zombies.js, keeps it
// out of the Lighthouse's chest and Wrackhaven's, as theirs keep the Fresnel Lamp and the Hermit's Claw out of hers).
// St Elmo's fire, the blue-white fire sailors saw burning on the mastheads and yardarms in a storm, the saint's sign
// that the worst was past, caught in a navigator's brass armillary sphere and set on a pistol grip. The rings of the
// sphere turn slowly about it, and the fire crackles inside. Each pull of the trigger:
//  - a globe of the fire is thrown out of the sphere, straight ahead, and drifts on slowly (FPSW.corposant.pv metres
//    a second) for a few seconds, or until it strikes a wall or the floor;
//  - as it drifts it lashes arcs of blue lightning down into the drowned near it (ZLC.ARCS at a time, every
//    ZLC.PULSE seconds, out to ZLC.REACH metres): each arc hurts the one it strikes and drags it in towards the globe;
//  - and at the end it bursts in a flash that hurts everything round it.
// Reforged at the Lampwright's Bench, the Saint's Crown: a bigger, brighter globe that lasts longer, more arcs and
// quicker, a wider reach; and when it bursts it splits into smaller globes (2 + t, up to 6) that drift on outwards and
// lash out again, each bursting in its turn.
// The arcs and the bursts are a fixed fraction of a drowned man's strength that round (like the Fresnel Lamp's), so
// it stays a wonder weapon as the rounds go up; a boss takes half of it, and is never dragged. On the Saint's Crown,
// zmpK makes them hit harder still. The crabs of a crab round are arced and dragged like the drowned.
// Together (src/zmnet.js): the globes are worked out on the thrower's screen; the arcs and the bursts go to the host
// through zmHurt, and the dragging through zmpStatus ('kb'). The others see their own copy of the globe drifting the
// same way and lashing at the drowned near it, only to look at.

Object.assign(ZM_AMMO, { corposant: 20 });
Object.assign(ZM_DMG, { e: 1 });
ZM_BOXW.push(['corposant', 9]);
ZX_ID.e = 'corposant';
ZM_PAP_W.corposant = { n: "Saint's Crown", mag: 6, res: 36, k: 2, fx: 'A bigger, brighter globe with more arcs and a wider reach, that splits as it bursts into smaller globes that lash out again.' };
VM_PLAIN.corposant = { metal: '#3a3630', dark: '#1a1714', wood: '#3e2818', brass: '#b8913e', accent: '#8ab8e8', glow: null };

const ZLC = {
  LIFE: 3.2, LIFE_T: 0.4,      // how long a globe drifts (and more each reforging, up to 1.2 s more)
  REACH: 6, REACH_T: 0.75,     // how far its arcs reach (and more each reforging, up to 3 m more)
  ARCS: 3,                     // arcs at a time: plain, and reforged (4 + t, up to 8)
  PULSE: 0.3, PULSE_T: 0.24,   // how often it lashes out: plain, and reforged
  ARC: 0.12,                   // each arc: that much of a drowned man's strength
  DRAG: 0.7,                   // and it drags them this far in towards the globe
  BURST: 0.5, BURST_R: 3,      // the burst at the end, and how far it reaches
  BOSS: 0.5,                   // a boss takes this share of it all
  SPLIT: [2, 6], SMALL: 1.6,   // the Saint's Crown's splitting (2 + t, up to 6), and how long the small ones drift
  MAX: 24,                     // globes out at once
};
const ZL = { orbs: [], arcs: [], booms: [], n: 0 };
function zlReset() { ZL.orbs = []; ZL.arcs = []; ZL.booms = []; if (ZL3.pool) for (const M of ZL3.pool) M.g.visible = false; }
const zlDist = (x, y) => Math.hypot(x - FPS.me.x, y - FPS.me.y);

// ---------- a pull of the trigger: a globe of the fire, thrown straight ahead ----------
function zlShot(x, y, z, h, p, by, mine, t) {
  const w = FPSW.corposant;
  sndFrom(mine ? 0 : fpsEar(x, y), () => zlSound('throw', mine ? 0 : zlDist(x, y)));
  if (mine) {
    if (typeof zeShot === 'function') zeShot(x, y, z, h, p, by);   // [egg hook] src/zmegg.js
    if (typeof zhShot === 'function') zhShot(x, y, z, h, p, by);   // [egg2 hook] src/zmegg2.js
  }
  const cp = Math.cos(p);
  let ox = x + Math.sin(h) * cp * 0.8, oy = y + Math.cos(h) * cp * 0.8, oz = z - 0.2 + Math.sin(p) * 0.8;
  if (fpsRay(x, y, z, h, p, by, [], 0.9).kind !== 'none') { ox = x; oy = y; oz = z - 0.1; }
  zlOrb({ by, mine, tier: t | 0, small: false, x: ox, y: oy, z: oz, vx: Math.sin(h) * cp * w.pv, vy: Math.cos(h) * cp * w.pv, vz: Math.sin(p) * w.pv });
  for (let i = 0; i < 10; i++) { const a = h + (Math.random() - 0.5) * 1.4, sp = 1 + Math.random() * 3; FPS.parts.push({ x: ox, y: oy, z: oz, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp, vz: (Math.random() - 0.4) * 2, t: 0.3, c: '190,225,255' }); }
}
function zlOrb(o) {
  const t = o.tier, small = o.small;
  Object.assign(o, { id: ++ZL.n, t: 0, seed: Math.random() * 100, pulse: 0.15,
    life: small ? ZLC.SMALL : ZLC.LIFE + (t ? Math.min(1.2, ZLC.LIFE_T * t) : 0),
    reach: (t ? ZLC.REACH + Math.min(3, ZLC.REACH_T * t) : ZLC.REACH) * (small ? 0.7 : 1),
    arcs: small ? 2 : t ? Math.min(8, 4 + t) : ZLC.ARCS,
    every: t ? ZLC.PULSE_T : ZLC.PULSE,
    R: (t ? 0.42 + Math.min(0.2, 0.05 * t) : 0.32) * (small ? 0.6 : 1) });
  ZL.orbs.push(o);
  while (ZL.orbs.length > ZLC.MAX) ZL.orbs.shift();
  return o;
}

// ---------- each frame: the globes drifting and lashing out, the arcs and the bursts fading ----------
function zlTick(dt) {
  for (const O of ZL.orbs) zlDrift(O, dt);
  ZL.orbs = ZL.orbs.filter(O => !O.done);
  for (const A of ZL.arcs) A.t += dt;
  ZL.arcs = ZL.arcs.filter(A => A.t < A.life);
  for (const B of ZL.booms) B.t += dt;
  ZL.booms = ZL.booms.filter(B => B.t < 0.6);
}
function zlDrift(O, dt) {
  O.t += dt;
  // (it slows a little as it goes, as if the air were thick with the storm)
  const k = Math.exp(-dt * 0.25); O.vx *= k; O.vy *= k; O.vz *= k;
  const ox = O.x, oy = O.y, oz = O.z, nx = ox + O.vx * dt, ny = oy + O.vy * dt, nz = oz + O.vz * dt;
  const hd = Math.hypot(nx - ox, ny - oy), hh = bearingOf(nx - ox, ny - oy), pp = Math.atan2(nz - oz, Math.max(0.001, hd));
  const r = fpsRay(ox, oy, oz, hh, pp, O.by, [], hd + O.R * 0.5 + 0.02);
  if (r.kind !== 'none') { O.x = ox - Math.sin(hh) * 0.1; O.y = oy - Math.cos(hh) * 0.1; O.z = oz; zlBurst(O); return; }
  O.x = nx; O.y = ny; O.z = nz;
  const G0 = FPSC.GROUND, fl = zxFloor(O.x, O.y, oz - G0);
  if (O.z <= G0 + fl + 0.12) { O.z = G0 + fl + 0.15; zlBurst(O); return; }
  if (Math.random() < dt * 30) FPS.parts.push({ x: O.x + (Math.random() - 0.5) * O.R, y: O.y + (Math.random() - 0.5) * O.R, z: O.z + (Math.random() - 0.5) * O.R, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, vz: 0.4 + Math.random() * 0.6, t: 0.35, c: Math.random() < 0.5 ? '200,230,255' : '140,190,255' });
  O.pulse -= dt;
  if (O.pulse <= 0) { O.pulse = O.every * (0.85 + Math.random() * 0.3); zlLash(O); }
  if (O.t >= O.life) zlBurst(O);
}
// the drowned it can reach and see, the nearest first (a boss last of all)
function zlNear(O) {
  const L = [];
  for (const o of ZM.z) {
    if (o.dead || o.st === 'out') continue;
    const tz = FPSC.GROUND + zmMid(o), hd = Math.hypot(o.x - O.x, o.y - O.y), d = Math.hypot(hd, tz - O.z);
    if (d > O.reach + (o.rad || 0.3)) continue;
    if (hd > 0.4 && fpsRay(O.x, O.y, O.z, bearingOf(o.x - O.x, o.y - O.y), Math.atan2(tz - O.z, hd), O.by, [o], hd + 1.5).kind !== 'body') continue;
    L.push({ o, d: d + (o.boss ? 3 : 0), tz });
  }
  return L.sort((a, b) => a.d - b.d).slice(0, O.arcs);
}
function zlLash(O) {
  const L = zlNear(O), G0 = FPSC.GROUND;
  for (const { o, tz } of L) {
    const jit = (o.tall || FPSC.TALL) * 0.25;
    ZL.arcs.push({ a: O, b: [o.x, o.y, tz + (Math.random() - 0.5) * jit], t: 0, life: 0.13 + Math.random() * 0.05, w: O.tier ? 1.4 : 1, small: O.small, seed: Math.random() * 1000 });
    for (let i = 0; i < 4; i++) FPS.parts.push({ x: o.x + (Math.random() - 0.5) * 0.4, y: o.y + (Math.random() - 0.5) * 0.4, z: tz + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: Math.random() * 2, t: 0.25, c: '180,220,255' });
    if (!O.mine) continue;
    zmHurt(o, zxHp() * ZLC.ARC * (O.small ? 0.7 : 1) * (o.boss ? ZLC.BOSS : 1), false, 'e', FPS.me.id); o.hitT = 0.15;
    // (drawn in towards it, and staggered: never past it, and never a boss)
    const dx = O.x - o.x, dy = O.y - o.y, d = Math.hypot(dx, dy), pull = Math.min(ZLC.DRAG * (O.tier ? 1.25 : 1), d - 0.9);
    if (!o.dead && !o.boss && pull > 0.05) zmpStatus(o, 'kb', dx / d * pull, dy / d * pull, 0.25);
  }
  // (nothing near: it crackles down to the floor or out into the dark round it, only to look at)
  if (!L.length && Math.random() < 0.6) {
    const a = Math.random() * 6.283, rr = 0.8 + Math.random() * 1.6, fx = O.x + Math.sin(a) * rr, fy = O.y + Math.cos(a) * rr, fz = G0 + zxFloor(fx, fy, O.z - G0);
    if (O.z - fz < 3.2) ZL.arcs.push({ a: O, b: [fx, fy, fz + 0.02], t: 0, life: 0.1, w: 0.6, small: true, seed: Math.random() * 1000 });
  }
  if (L.length || Math.random() < 0.3) sndFrom(O.mine ? 0 : fpsEar(O.x, O.y), () => zlSound(L.length ? 'zap' : 'tick', zlDist(O.x, O.y)));
}
// the burst at the end: a flash that hurts all round it (and the Saint's Crown's splits into smaller globes)
function zlBurst(O) {
  if (O.done) return;
  O.done = true;
  const R = (O.tier ? ZLC.BURST_R + Math.min(1, 0.25 * O.tier) : ZLC.BURST_R) * (O.small ? 0.65 : 1);
  ZL.booms.push({ x: O.x, y: O.y, z: O.z, R, t: 0, tier: O.tier });
  sndFrom(O.mine ? 0 : fpsEar(O.x, O.y), () => zlSound(O.small ? 'pop' : 'burst', zlDist(O.x, O.y)));
  for (let i = 0; i < (O.small ? 12 : 26); i++) { const a = Math.random() * 6.283, sp = 1.5 + Math.random() * R * 1.6; FPS.parts.push({ x: O.x, y: O.y, z: O.z, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp, vz: (Math.random() - 0.3) * 4, t: 0.35 + Math.random() * 0.3, c: Math.random() < 0.5 ? '220,240,255' : '130,180,255' }); }
  // (a last lash out at all those near, the arcs with it)
  for (const o of ZM.z) {
    if (o.dead || o.st === 'out') continue;
    const tz = FPSC.GROUND + zmMid(o), hd = Math.hypot(o.x - O.x, o.y - O.y), d = Math.hypot(hd, tz - O.z);
    if (d > R + (o.rad || 0.3)) continue;
    if (hd > 0.5 && fpsRay(O.x, O.y, O.z, bearingOf(o.x - O.x, o.y - O.y), Math.atan2(tz - O.z, hd), O.by, [o], hd + 1.5).kind !== 'body') continue;
    ZL.arcs.push({ a: { x: O.x, y: O.y, z: O.z }, b: [o.x, o.y, tz], t: 0, life: 0.2, w: 1.6, small: false, seed: Math.random() * 1000 });
    if (!O.mine) continue;
    zmHurt(o, zxHp() * ZLC.BURST * (O.small ? 0.6 : 1) * (1 - 0.5 * Math.min(1, d / R)) * (o.boss ? ZLC.BOSS : 1), false, 'e', FPS.me.id); o.hitT = 0.3;
    if (!o.dead && !o.boss && hd > 0.05) zmpStatus(o, 'kb', (o.x - O.x) / hd * 0.6, (o.y - O.y) / hd * 0.6, 0.5);
    O.hit = true;
  }
  if (O.mine && O.hit) zxMark(false);
  if (!O.tier || O.small) return;
  // the Saint's Crown: it splits, and the smaller globes drift on outwards and lash out again
  const n = Math.min(ZLC.SPLIT[1], ZLC.SPLIT[0] + O.tier), a0 = Math.random() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = a0 + i / n * 6.283, sp = 2.4 + Math.random() * 0.8;
    zlOrb({ by: O.by, mine: O.mine, tier: O.tier, small: true, x: O.x, y: O.y, z: O.z, vx: Math.sin(a) * sp + O.vx * 0.2, vy: Math.cos(a) * sp + O.vy * 0.2, vz: 0.3 + Math.random() * 0.4 }).pulse = 0.2 + i * 0.05;
  }
}

// ---------- the light the globes give (from zx3d: three lamps, given to the nearest) ----------
function zlLights(src) {
  const t = g.t;
  for (const O of ZL.orbs) src.push([O.x, O.y, O.z, (O.small ? 1.1 : O.tier ? 2.4 : 1.8) * (reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(t * 37 + O.seed) * Math.sin(t * 23)), 0x8ec4ff, O.small ? 6 : O.tier ? 11 : 9]);
  for (const B of ZL.booms) src.push([B.x, B.y, B.z, 5 * (1 - B.t / 0.6), 0xb8dcff, B.R * 4]);
}

// ---------- sounds (made here: no recordings, but the storm's own crack for the burst) ----------
function zlSound(k, d) {
  try {
    if (soundOff()) return;
    const v = Math.max(0.05, 1 - (d || 0) / 120);
    if (k === 'throw') { noise('lowpass', 600, 0.8, 0.004, 0.35 * v, 0.3); tone(160, 'sine', 0.01, 0.22 * v, 0.35, { to: 520 }); tone(55, 'sawtooth', 0.01, 0.06 * v, 0.4, { to: 110 }); for (let i = 0; i < 5; i++) noise('highpass', 3200 + Math.random() * 2000, 1.2, 0.001, 0.09 * v, 0.03, { delay: 0.04 + i * 0.035 + Math.random() * 0.02 }); }
    else if (k === 'zap') { noise('highpass', 2400, 0.9, 0.001, 0.22 * v, 0.06); tone(1400 + Math.random() * 1600, 'square', 0.001, 0.05 * v, 0.05, { to: 300 }); tone(90, 'sawtooth', 0.002, 0.05 * v, 0.08); for (let i = 0; i < 3; i++) noise('highpass', 4000, 1, 0.001, 0.07 * v, 0.015, { delay: 0.03 + i * 0.025 + Math.random() * 0.02 }); }
    else if (k === 'tick') { noise('highpass', 4500, 1, 0.001, 0.05 * v, 0.02); noise('highpass', 3800, 1, 0.001, 0.04 * v, 0.015, { delay: 0.03 }); }
    else if (k === 'burst') { if (sfxPlay('stormbolt', { vol: 0.55 * v, vary: 0.12 })) { noise('highpass', 2600, 0.8, 0.001, 0.2 * v, 0.25); return; } noise('highpass', 1800, 0.7, 0.001, 0.5 * v, 0.35); noise('lowpass', 500, 0.8, 0.003, 0.5 * v, 0.6); tone(70, 'sawtooth', 0.003, 0.25 * v, 0.5, { to: 30 }); }
    else if (k === 'pop') { noise('highpass', 2200, 0.8, 0.001, 0.25 * v, 0.18); noise('lowpass', 700, 0.8, 0.003, 0.2 * v, 0.25); }
  } catch (e) {}
}

// ---------- in 3D: the globes (a pool of glows, kept with the scene they were made in) ----------
// a ball of blue-white fire: a hard white heart, a blue halo round it, and a wider, fainter one that breathes
const ZL3 = { grp: null, pool: [], tex: null };
function zl3d(dt) {
  if (!Z3.grp) return;
  if (ZL3.grp !== Z3.grp) { ZL3.grp = Z3.grp; ZL3.pool = []; ZL3.tex = z3Soft('rgba(255,255,255,1)', 'rgba(255,255,255,0)'); }
  const t = g.t, sm = reduceMotion;
  ZL.orbs.forEach((O, i) => {
    let M = ZL3.pool[i];
    if (!M) {
      const sp = c => new THREE.Sprite(new THREE.SpriteMaterial({ map: ZL3.tex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      M = { g: new THREE.Group(), heart: sp(0xf4faff), halo: sp(0x5a9cff), wide: sp(0x2a5ad0) };
      M.g.add(M.wide); M.g.add(M.halo); M.g.add(M.heart); Z3.grp.add(M.g); ZL3.pool.push(M);
    }
    const fl = sm ? 1 : 0.85 + 0.15 * Math.sin(t * 41 + O.seed) * Math.sin(t * 17 + O.seed * 2), grow = Math.min(1, O.t / 0.15), fade = Math.min(1, (O.life - O.t) / 0.2 + 0.4), R = O.R * grow * fade;
    // (it bobs a little as it drifts, as a light does on a mast)
    M.g.position.copy(z3v(O.x, O.y, O.z + (sm ? 0 : Math.sin(O.t * 3 + O.seed) * 0.04)));
    M.heart.scale.setScalar(R * 1.5 * fl); M.halo.scale.setScalar(R * 4.2 * fl); M.wide.scale.setScalar(R * (O.tier ? 10 : 8) * (sm ? 1 : 0.9 + 0.1 * Math.sin(t * 5 + O.seed)));
    M.halo.material.opacity = 0.85; M.wide.material.opacity = O.tier ? 0.45 : 0.32;
    M.halo.material.color.setHex(O.tier ? 0x86b4ff : 0x5a9cff);
    M.g.visible = true;
  });
  for (let i = ZL.orbs.length; i < ZL3.pool.length; i++) ZL3.pool[i].g.visible = false;
}

// ---------- painted over the view: the arcs, the crackle round each globe, and the bursts ----------
// (a jagged line from a to b, k kinks, thrown off to the side by up to j of its length; fresh every frame, so it crackles)
function zlBolt(a, b, k, j) {
  const pts = [a], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  for (let i = 1; i < k; i++) { const u = i / k, s = L * j * Math.sin(u * Math.PI); pts.push([a[0] + (b[0] - a[0]) * u + (Math.random() - 0.5) * s, a[1] + (b[1] - a[1]) * u + (Math.random() - 0.5) * s, a[2] + (b[2] - a[2]) * u + (Math.random() - 0.5) * s]); }
  pts.push(b);
  return pts;
}
function zlDrawOver() {
  if (!ZL.arcs.length && !ZL.orbs.length && !ZL.booms.length) return;
  const sm = reduceMotion;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
  const stroke = (pts, w, k) => {
    const q = []; for (const p of pts) { const c = cam(p[0], p[1], p[2]); if (c.f < 0.35) return; q.push(proj(c)); }
    const sc = Math.max(0.7, Math.min(2.4, q[0].s / 90)) * w;
    for (const [lw, col] of [[7, `rgba(70,120,255,${0.22 * k})`], [3, `rgba(140,190,255,${0.7 * k})`], [1.2, `rgba(245,250,255,${0.95 * k})`]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw * sc; ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (const p of q.slice(1)) ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  };
  // the arcs, and now and then a fork off one
  for (const A of ZL.arcs) {
    const a = [A.a.x, A.a.y, A.a.z], k = 1 - A.t / A.life, pts = zlBolt(a, A.b, A.small ? 5 : 8, sm ? 0.12 : 0.28);
    stroke(pts, A.w * (A.small ? 0.6 : 1), k);
    if (!sm && Math.random() < 0.5) { const m = pts[2 + ((Math.random() * (pts.length - 3)) | 0)], e = [m[0] + (Math.random() - 0.5) * 1.2, m[1] + (Math.random() - 0.5) * 1.2, m[2] - Math.random() * 0.8]; stroke(zlBolt(m, e, 3, 0.4), A.w * 0.5, k * 0.8); }
  }
  // the crackle round each globe: little tongues of the fire, out and back
  for (const O of ZL.orbs) {
    const c = cam(O.x, O.y, O.z); if (c.f < 0.4) continue;
    const n = sm ? 2 : O.tier ? 5 : 3;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, b = (Math.random() - 0.5) * 2, r = O.R * (1.4 + Math.random() * 1.4); stroke(zlBolt([O.x, O.y, O.z], [O.x + Math.sin(a) * r, O.y + Math.cos(a) * r, O.z + b * r * 0.6], 3, 0.35), 0.45, 0.8); }
  }
  // the bursts: a white flash, a blue ring going out
  for (const B of ZL.booms) {
    const c = cam(B.x, B.y, B.z); if (c.f < 0.4) continue;
    const q = proj(c), k = B.t / 0.6, s = Math.max(8, B.R * q.s * (0.35 + k * 0.9)), gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s);
    gr.addColorStop(0, `rgba(250,252,255,${0.95 * (1 - k)})`); gr.addColorStop(0.35, `rgba(130,180,255,${0.55 * (1 - k)})`); gr.addColorStop(1, 'rgba(60,110,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, 6.283); ctx.fill();
    const ring = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * 6.283, r = B.R * (0.3 + k * 0.8); ring.push([B.x + Math.sin(a) * r, B.y + Math.cos(a) * r, B.z]); }
    const p = polyProj(ring); if (p.length > 2) { ctx.strokeStyle = `rgba(160,200,255,${0.6 * (1 - k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const r of p.slice(1)) ctx.lineTo(r.x, r.y); ctx.stroke(); }
  }
  ctx.restore();
}

// ---------- in your hand: the armillary sphere on its grip ----------
// A walnut pistol grip and a brass trigger guard, and on top a turned brass pillar holding the sphere out in front:
// the meridian ring standing in its fork, the horizon ring round its middle, and inside them, on the tilted pole, the
// equator, the two colures and the slanting ecliptic, marked with the signs. In the heart of it, the fire. The rings
// turn slowly; firing, the heart leaps out (the globe) and the rings spin up, and the fire creeps back from nothing.
// Reloading: the sphere tipped back, the left hand brings up a lead-glass phial of storm-light and pours it in at the
// top, puts it away, and gives the rings a spin with a finger till the fire catches. The Saint's Crown: a crown of
// little flames burns at the tips of the pole and round the horizon ring.
function zlvRing(r, tube, mat, seg) { return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, seg || 40), mat); }
function zlvPhial(M) {
  const g = new THREE.Group();
  g.scale.setScalar(1.3);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.06, 12), M.glass));
  const fire = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.045, 10), M.fireM); fire.position.y = -0.006; g.add(fire);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.018, 10), M.glass); neck.position.y = 0.038; g.add(neck);
  const stop = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.012, 8), M.dark); stop.position.y = 0.052; g.add(stop);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: VM.softTex, color: 0x6aa8ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(0.07); fire.add(gl);
  g.userData.fire = fire;
  return g;
}
VM_BUILD.corposant = (M) => {
  const root = new THREE.Group(), C = new THREE.Vector3(0, 0.1, -0.1);
  // (the fire: plain light, never painted by a weapon's finish or the Bench's)
  M.fireM = new THREE.MeshBasicMaterial({ color: 0xcfe6ff });
  M.glass = new THREE.MeshPhongMaterial({ color: 0x9ab0b8, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.35 }); M.glass.userData.zmpSkip = true;
  const soft = VM.softTex;
  const spr = (c, s, o) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.setScalar(s); return m; };
  // the grip, its cap, the guard and the trigger
  root.add(profile([[0.0, 0.01], [0.03, -0.06], [0.025, -0.11], [0.06, -0.12], [0.075, -0.06], [0.05, 0.02]], 0.034, M.wood, 0.004));
  root.add(zcyl(0.024, 0.026, 0.07, M.brass, 16, 0.04, 0, 0.03));
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), M.brass); pom.position.set(0, -0.118, 0.07); root.add(pom);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 6, 18, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.005, 0.005); root.add(guard);
  const trig = box(0.005, 0.022, 0.007, M.dark, 0, 0.0, 0.004); root.add(trig);
  // the pillar, turned, up from the front of the grip to the sphere
  const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.045, 12), M.brass); pil.position.set(0, 0.045, -0.06); pil.rotation.x = -0.6; root.add(pil);
  for (const [y, z, r] of [[0.03, -0.05, 0.016], [0.06, -0.075, 0.012]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6), M.brass); k.scale.y = 0.5; k.position.set(0, y, z); root.add(k); }
  const sph = new THREE.Group(); sph.position.copy(C); sph.scale.setScalar(0.88); root.add(sph);
  // the meridian ring in its fork (fixed), the horizon ring round it (turning slowly one way)
  const mer = zlvRing(0.07, 0.0035, M.brass); mer.rotation.y = Math.PI / 2; sph.add(mer);
  const fork = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.003, 6, 20, Math.PI * 0.5), M.iron); fork.rotation.set(0, Math.PI / 2, -Math.PI * 0.75); sph.add(fork);
  const hor = new THREE.Group(); sph.add(hor);
  { const r = zlvRing(0.076, 0.005, M.brass); r.rotation.x = Math.PI / 2; hor.add(r); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, t = box(0.003, 0.004, 0.008, M.dark, Math.sin(a) * 0.076, 0.005, Math.cos(a) * 0.076); t.rotation.y = a; hor.add(t); } }
  // the pole, tilted, and the rings that turn on it
  const pole = new THREE.Group(); pole.rotation.x = 0.41; pole.rotation.z = -0.2; sph.add(pole);
  pole.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.16, 6), M.iron));
  const spin = new THREE.Group(); pole.add(spin);
  { const eq = zlvRing(0.06, 0.003, M.brass); eq.rotation.x = Math.PI / 2; spin.add(eq); }
  for (const a of [0, Math.PI / 2]) { const c = zlvRing(0.062, 0.0026, M.brass); c.rotation.y = a; spin.add(c); }
  const ecl = new THREE.Group(); ecl.rotation.x = Math.PI / 2 + 0.41; spin.add(ecl);
  ecl.add(zlvRing(0.058, 0.0055, M.accent));
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, s = box(0.006, 0.006, 0.002, M.brass, Math.cos(a) * 0.058, Math.sin(a) * 0.058, 0.004); s.rotation.z = a; ecl.add(s); }
  for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), M.brass); k.position.y = s * 0.08; pole.add(k); }
  // the fire in the heart: a white ball, its blue halo, and crackling threads out to the rings
  const heart = new THREE.Group(); sph.add(heart);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 10), M.fireM); heart.add(core);
  const halo = spr(0x6aa8ff, 0.15, 0.95), wide = spr(0x3a6ae0, 0.3, 0.45); heart.add(halo); heart.add(wide);
  const N = 10, lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 2 * 3 * 3), 3));
  const threads = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xa8d0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); threads.frustumCulled = false; sph.add(threads);
  // the Saint's Crown: little flames at the pole's tips and round the horizon ring
  const crown = new THREE.Group(); crown.visible = false; sph.add(crown);
  const tips = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, f = spr(0x8ac0ff, 0.03, 0.9); f.position.set(Math.sin(a) * 0.076, 0.012, Math.cos(a) * 0.076); crown.add(f); tips.push(f); }
  for (const s of [-1, 1]) { const f = spr(0xb8d8ff, 0.04, 0.9); f.position.set(0, s * 0.084, 0); f.position.applyEuler(pole.rotation); crown.add(f); tips.push(f); }
  const fresh = zlvPhial(M); fresh.visible = false; root.add(fresh);
  const hand = vmHand(VM.H, false); hand.position.set(0.01, -0.045, 0.045); root.add(hand);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, C.y, C.z - 0.09); root.add(muzzle);
  return { root, M, hand, trig, muzzle, sph, hor, spin, heart, core, halo, wide, threads, crown, tips, fresh, C, pose: { x: 0.13, y: -0.205, z: -0.46, rx: 0.12, ry: 0.3, rz: -0.05 }, smoke: 0, flashK: 0.5, beam: true };
};
VM_ANIM.corposant = (w, S) => {
  const p = S.p, t = S.t, dt = S.dt, sm = S.still;
  VM.lhand.visible = false;
  const tier = FPS.zm && typeof zmpTier === 'function' ? zmpTier('corposant') : 0;
  // the fire: gone with each globe thrown, and creeping back while there's a charge in it; out when it's empty
  if (S.fired) { w.out = 1; w.whirl = 1; }
  const empty = !(FPS.me && FPS.me.ammo > 0) && !S.reloading;
  w.out = Math.max(0, (w.out || 0) - dt * 1.7);
  const tip = vmSeg(p, 0, 0.12) - vmSeg(p, 0.86, 1), bring = vmSeg(p, 0.12, 0.36), pour = S.reloading ? vmSeg(p, 0.38, 0.5) - vmSeg(p, 0.58, 0.64) : 0, away = vmSeg(p, 0.6, 0.7), flick = S.reloading && p > 0.68 && p < 0.86 ? (p - 0.68) / 0.18 : -1;
  // (while reloading: out till the storm-light's poured in, then it grows as it's spun)
  let lit = S.reloading ? (p < 0.44 ? Math.max(0, 1 - p / 0.1) * 0.2 : p < 0.7 ? 0.25 * vmSeg(p, 0.44, 0.6) : 0.25 + 0.75 * vmSeg(p, 0.7, 0.88)) : empty ? 0.12 : 1 - w.out * w.out;
  if (flick >= 0 && flick < 0.2) w.whirl = Math.max(w.whirl || 0, 0.8);
  w.whirl = Math.max(0, (w.whirl || 0) - dt * 0.9);
  w.steps = w.steps || [[0.2, () => vmClick(2400, 0.03)], [0.42, () => vmNoise(4200, 0.05, 0.3)], [0.66, () => vmClick(1800, 0.03)], [0.72, () => vmClick(900, 0.05)], [0.78, () => vmClick(1000, 0.04)], [0.86, () => { vmNoise(3500, 0.08, 0.2); vmClick(2600, 0.03); }]];
  vmPlace(w, S, 0, { x: -tip * 0.03, y: tip * 0.03, z: -tip * 0.02, rx: -tip * 0.5, ry: -tip * 0.2, rz: tip * 0.25 });
  // the rings: the horizon one way, the inner rings the other on their pole, spinning up at a throw or a flick
  const sp = sm ? 0 : 0.35 + 7 * (w.whirl || 0) * (w.whirl || 0);
  w.hor.rotation.y -= dt * sp * 0.4; w.spin.rotation.y += dt * sp;
  const big = tier ? 1.3 + Math.min(0.3, 0.08 * tier) : 1, fl = sm ? 1 : 0.85 + 0.15 * Math.sin(t * 43) * Math.sin(t * 19);
  const k = Math.max(0.02, lit) * big;
  w.core.scale.setScalar(k * fl); w.halo.scale.setScalar(0.15 * k * fl); w.wide.scale.setScalar(0.3 * k * (sm ? 1 : 0.9 + 0.1 * Math.sin(t * 6)));
  w.halo.material.color.setHex(tier ? 0x8ab8ff : 0x6aa8ff);
  // (the threads of fire, out from the heart to the rings: new ones every few frames)
  w.thrT = (w.thrT || 0) - dt;
  if (w.thrT <= 0) {
    w.thrT = sm ? 0.3 : 0.05;
    const P = w.threads.geometry.attributes.position, A = P.array, n = Math.round((lit > 0.2 ? (tier ? 10 : 6) : 1) * (sm ? 0.5 : 1));
    A.fill(0);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * 6.283, ph = Math.acos(Math.random() * 2 - 1), R = 0.055 + Math.random() * 0.012, ex = Math.sin(ph) * Math.cos(th) * R, ey = Math.cos(ph) * R, ez = Math.sin(ph) * Math.sin(th) * R;
      let px = 0, py = 0, pz = 0;
      for (let j = 1; j <= 3; j++) { const u = j / 3, jt = j < 3 ? 0.012 : 0, qx = ex * u + (Math.random() - 0.5) * jt, qy = ey * u + (Math.random() - 0.5) * jt, qz = ez * u + (Math.random() - 0.5) * jt, o = (i * 3 + j - 1) * 6; A[o] = px; A[o + 1] = py; A[o + 2] = pz; A[o + 3] = qx; A[o + 4] = qy; A[o + 5] = qz; px = qx; py = qy; pz = qz; }
    }
    P.needsUpdate = true;
  }
  w.threads.material.opacity = Math.min(1, 0.2 + lit) * 0.9;
  // the Saint's Crown's flames
  w.crown.visible = !!tier;
  if (tier) w.tips.forEach((f, i) => { const s = 0.025 + 0.012 * (sm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 13 + i * 2.1)); f.scale.set(s, s * 1.6, s); f.material.opacity = 0.5 + 0.4 * lit; });
  // the phial: up from below, tipped over the top of the sphere to pour, and away
  w.fresh.visible = S.reloading && bring > 0.01 && away < 0.99;
  if (w.fresh.visible) {
    const home = zlvV(-0.22, -0.3, 0.02), over = w.C.clone().add(zlvV(-0.02, 0.11, 0.0)), gone = zlvV(-0.25, -0.32, 0.05);
    w.fresh.position.copy(home).lerp(over, bring).lerp(gone, away);
    w.fresh.rotation.set(0, 0, (1 - bring) * 0.5 - pour * 2.1);
    w.fresh.userData.fire.scale.y = Math.max(0.05, 1 - vmSeg(p, 0.42, 0.58));
    vmLeftAt(w, w.fresh.position.clone().add(zlvV(-0.03, -0.065, 0.045)), [0.3, 0, -0.6 - pour * 0.5]);
  } else if (flick >= 0) vmLeftAt(w, w.C.clone().add(zlvV(-0.075, -0.01 + Math.sin(flick * Math.PI * 3) * 0.012, 0.02)), [0.2, 0.3, -1.0]);
  w.trig.rotation.x = S.trigger ? 0.35 : 0;
};
const zlvV = (x, y, z) => new THREE.Vector3(x, y, z);
