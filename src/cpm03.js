'use strict';
// The Chronicle of the Light, mission 3: Lighting the Light (1841). And, first, the Light's own kit, which mission 4
// (src/cpm04.js) uses too.
//
// The Light's kit (cpl...): the keeper's station as the missions at the Light lay it out, in the Lighthouse's own look
// (src/zombies.js, map 'light': the same whitewashed tower on its granite plinth, the same lantern and red dome, the
// same jetty to the south and the harbour round it, the open sea to the north), but with none of its night's furniture:
// no wall buys, no tonics, no wreck chest, no gates on the stair.
//  - FPS_ISLES.cplight / FPI_GEN.cplight: the look, and the stage's set(H, K, Z) laying itself out in it (map.isle
//    'cplight'; map.shore CPL_SHORE, the Lighthouse's own harbour line; Z.bay for its water).
//  - cplTower(H, K, Z, o): the tower, as the Lighthouse's (ninety treads round the newel, five floors, the lantern of
//    glass on top, the gallery round it), its windows glazed, open archways between each floor's two rooms. o.lamps:
//    false for no lamps in its rooms (1841, half fitted out); o.top: a lamp for the lantern room.
//  - cplLensSet(k, ang, o): the great lens (src/zombies.js zm3dLantern builds it) lit (k, 0 to 1) and turned to
//    bearing ang (radians, 0 north, clockwise, the way the beam points); o.flicker, o.dim. Each frame, from a stage's f3.
//  - cplBrig(o): a brig for the sea (the Gannet; in 1841 a supply lugger with o.lug), a THREE.Group, bow along +x.
//  - cplLanternRock(grp): Lantern Rock, far out to the north, the stump of its fire tower and the fire on it;
//    cplFireSet(k) each frame: how high the fire burns (0: out). CPL.LR: where it is.
//  - cplWoman(o): a living woman of the 1880s (Maren), from Maren's End's model of her (src/raidfort.js), at a
//    woman's height, warm, without the sea's light about her; cplWomanPose(M, o) each frame.
//  - cplCarry*: something carried in both arms (a crate, a panel of the lens, an oil can): drawn in front of you, and
//    in front of each of the others who carries one; no gun in your hands while you carry (src/fbsea.js fbNoGun,
//    wrapped here as src/fbvoy.js wraps it).
//  - cplSky(o): the evening, night or dawn: the light, the fog, its colour, each frame from a stage's f3.
//  - cplHold(k, dt, need): holding Use at one of a stage's things, k, for need seconds: true once it's done (your own
//    screen; the stage then asks the host).
//
// Mission 3, Lighting the Light (1841): the Light is built on its rock, and the Lampwright has ground its great lens.
//  I.   The Landing (cp_m03land, src/cpm03x.js): the supply lugger at the half-built jetty; carry the lens's crates of
//       prisms up from her to the hoist at the tower's foot, and wind them up to the gallery, while the seas break
//       over the outer pier.
//  II.  The Haar (cp_m03haar): night, and a fog off Lantern Rock with things in it. The last crate, the lens's heart,
//       went over the side; it's out on the north rocks. Light the work braziers out to it, and carry it back.
//  III. The Lantern (cp_m03lamp): up in the lantern room, the panels of the lens seated in its frame, the lamp filled
//       and its wick trimmed, and the lamp lit for the first time. The outro: the beam sweeps out over the sea, and far
//       off the fire on Lantern Rock goes out.
// Lines: cp_m03_01 on (campaign-sound/m03.md).

// ---------- the Light's kit ----------
var CPL = { LR: [70, 430], TX: ZMT.X, TY: ZMT.Y, ov: null };   // (ov: a cinematic's say over the lens and the fire, while it plays)
const CPL_SHORE = lx => -41.5 + Math.max(0, Math.abs(lx) - 22) * 0.4;
FPS_ISLES.cplight = Object.assign({}, FPS_ISLES.light, { name: 'Skerry Light', nLights: 8 });
FPI_GEN.cplight = {
  built: true,
  set(H) {
    const S = RAID_STAGES[RAID_ORDER[RAID.stage]] || RAID_STAGES[RAID_ORDER[0]];
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    S.set(H, zmKit(H, Z), Z);
  },
  decor() {},
};
// the tower, as the Lighthouse lays it out (src/zombies.js FPI_GEN.light), without its night's furniture
function cplTower(H, K, Z, o) {
  o = o || {};
  const { put, light, lamp, wall } = K, OX = FPSC.CX, OY = FPSC.CY, TX = ZMT.X, TY = ZMT.Y, RT = ZMT.R, L5 = ZMT.L[5];
  const TW = (rx, ry) => [TX + rx, TY + ry], tput = (k, rx, ry, ang, oo) => put(k, TX + rx, TY + ry, ang || 0, oo || {});
  Z.glass = Z.glass || [];
  // (every window glazed; the archway at the foot, north, onto where the Lamp Passage is or will be)
  const OPEN = o.open || { 0: { 8: 'a', 0: 'g', 16: 'g', 24: 'g', 4: 'g', 12: 'g', 20: 'g', 28: 'g' },
    1: { 4: 'g', 12: 'g', 20: 'g', 28: 'g' }, 2: { 4: 'g', 12: 'g', 20: 'g', 28: 'g' }, 3: { 4: 'g', 12: 'g', 20: 'g', 28: 'g' }, 4: { 4: 'g', 12: 'g', 20: 'g', 28: 'g' } };
  Z.tower = { x: OX + TX, y: OY + TY, r: RT, L: ZMT.L.slice(), open: OPEN };
  const RC = RT + ZMT.TH / 2, SEG = 2 * RC * Math.sin(Math.PI / ZMT.N) * 1.04;
  for (let i = 0; i < ZMT.N; i++) {
    const a = i / ZMT.N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ang = a + Math.PI / 2, px = TX + ca * RC, py = TY + sa * RC;
    for (let k = 0; k < 6; k++) {
      const z0 = k === 0 ? 0 : ZMT.L[k] - 0.3, z1 = k < 5 ? ZMT.L[k + 1] - 0.3 : L5 + 1.05, Lk = ZMT.L[k];
      const op = (OPEN[k] || {})[i], piece = (zz0, zz1) => put('zwall', px, py, ang, { len: SEG, th: ZMT.TH, z0: zz0, z1: zz1, ring: true });
      if (!op) { piece(z0, z1); continue; }
      if (op === 'a') { piece(Lk + 2.9, z1); continue; }
      piece(z0, Lk + 1.0); piece(Lk + 2.35, z1);
      const hw = (RC - ZMT.TH / 2) * Math.tan(ZM_SKIN.HA), jl = SEG / 2 - hw;
      for (const s of [-1, 1]) put('zjamb', px - sa * s * (hw + jl / 2), py + ca * s * (hw + jl / 2), ang, { len: jl, th: ZMT.TH, z0: Lk + 1.0, z1: Lk + 2.35, ring: true, jamb: true });
      Z.glass.push({ x: OX + px, y: OY + py, ang, w: SEG * 0.92, z0: Lk + 1.0, z1: Lk + 2.35, frame: true });
    }
  }
  // the floors, round the stairwell, and its railing
  const HO = ZMT.HOLE;
  for (let k = 1; k <= 5; k++) {
    const top = ZMT.L[k], strips = [];
    for (let y = -RT; y < -HO - 0.01; y += 1) strips.push([y, Math.min(y + 1, -HO)]);
    strips.push([-HO, HO]);
    for (let y = HO; y < RT - 0.01; y += 1) strips.push([y, Math.min(y + 1, RT)]);
    for (const [y0, y1] of strips) {
      const ym = Math.min(Math.abs(y0), Math.abs(y1)) * (y0 < 0 && y1 > 0 ? 0 : 1), xm = Math.sqrt(Math.max(0, (RT + 0.25) ** 2 - ym * ym));
      const pieces = y0 >= -HO && y1 <= HO ? [[-xm, -HO], [HO, xm]] : [[-xm, xm]];
      for (const [x0, x1] of pieces) if (x1 - x0 > 0.2) tput('slab', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0, top, clip: RT + 0.3, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
    }
    tput('zrail', 0, -HO, 0, { w: 2 * HO, base: top });
    tput('zrail', HO, 0, Math.PI / 2, { w: 2 * HO, base: top });
    tput('zrail', -HO, 0, Math.PI / 2, { w: 2 * HO, base: top });
    for (const sx of [-1, 1]) tput('zrail', sx * (HO + 1.3) / 2, HO, 0, { w: HO - 1.3, base: top });
  }
  // the newel, and the spiral stair round it
  tput('newel', 0, 0, 0, { r: ZMT.NEWEL, hh: L5 + 0.9 });
  for (let n = 1; n <= ZMT.PER * 5; n++) {
    const a = Math.PI / 2 + n / ZMT.PER * Math.PI * 2, rm = (ZMT.R0 + ZMT.R1) / 2, near = n % ZMT.PER;
    tput('tread', Math.cos(a) * rm, Math.sin(a) * rm, a, { w: ZMT.R1 - ZMT.R0, d: 1.25, hh: n * ZMT.RISE, rail: !(near <= 1 || near >= ZMT.PER - 1) });
  }
  // each floor's two rooms: a wall across, an archway in its east half
  for (let k = 1; k <= 4; k++) {
    const Lk = ZMT.L[k], hh = ZMT.L[k + 1] - 0.3 - Lk;
    wall(TX + HO + 0.1, TY, TX + RT + 0.05, TY, { mat: 'plaster', col2: '#d8d2c0', hh, lift: Lk }, [{ at: TX + 7, k: 'arch', w: 2.2 }]);
    wall(TX - RT - 0.05, TY, TX - HO - 0.1, TY, { mat: 'plaster', col2: '#d8d2c0', hh, lift: Lk });
  }
  // the lantern: its ring of glass, a door east and west onto the gallery
  const GR = ZMT.GLASS, NG = 24;
  for (let i = 0; i < NG; i++) {
    const a = (i + 0.5) / NG * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), w = 2 * GR * Math.sin(Math.PI / NG) * 1.02;
    if (i === 0 || i === NG - 1 || i === NG / 2 || i === NG / 2 - 1) continue;
    tput('glasspane', ca * GR, sa * GR, a + Math.PI / 2, { w, z0: L5 + 0.05, z1: L5 + 4.4 });
  }
  Z.top = { x: OX + TX, y: OY + TY, r: GR - 0.2, z: L5 };
  (Z.keep = Z.keep || []).push({ c: [OX + TX, OY + TY], r: RT + 0.1, z0: L5 + 0.5 });
  // the lights: the lens's own glow, and lamps on the floors
  light(...TW(0, 0), L5 + 1.8, '#fff0c0', o.top === false ? 4 : 14, 'lens');
  if (o.lamps !== false) for (let k = 0; k <= 4; k++) {
    const top = k < 4 ? ZMT.L[k + 1] - 0.3 : ZMT.L[5] - 0.3, z = ZMT.L[k] + 3.0;
    lamp(...TW(-6.5, 5.5), z, '#ffc070', top); lamp(...TW(6.5, -5.5), z, '#ffc070', top);
  }
  return { TW, tput, onFloor: (k, kind, x, y, ang, oo) => put(kind, x, y, ang || 0, Object.assign({ lift: ZMT.L[k] }, oo || {})), atWall: (a, r) => [TX + Math.cos(a) * r, TY + Math.sin(a) * r, a + Math.PI / 2] };
}
// the great lens: lit or dark, turned to a bearing (0 north, clockwise); each frame from a stage's f3 (zmScene3D sets
// it from the Lighthouse's lever first, src/zmlamp.js, which is never pulled here)
function cplLensSet(k, ang, o) {
  const Q = typeof Z3 !== 'undefined' && Z3.lens; if (!Q) return;
  o = o || {};
  if (CPL.ov && cpCineOn()) { const v = CPL.ov; if (v.k != null) k = v.k; if (v.ang != null) ang = v.ang; o = Object.assign({}, o, v.o || {}); }
  const fl = o.flicker ? 0.75 + 0.25 * Math.sin(g.t * 23) * Math.sin(g.t * 7.3) : 1, kk = clamp(k * fl, 0, 1), on = kk > 0.002;
  // (zmScene3D turns the lens by Math.PI / 2 - ang for a beam pointing at ang east of north, the far light's way;
  // the beam runs along the lens's +x, so a bearing b (from north, clockwise) is a turn of b - PI/2 the other way)
  Q.lens.rotation.y = Math.PI / 2 - ang;
  // (the eye in the lantern room by it, yours or a cutscene's: its beam and glow turned down, or they fill the eye)
  const cam = typeof GL3D !== 'undefined' && GL3D.camera && GL3D.camera.position, ex = cam ? cam.x - FPSC.CX : 0, ey = cam ? -cam.z - FPSC.CY : 0, ez = cam ? cam.y - FPSC.GROUND : 0;
  const inside = !!cam && Math.hypot(ex - ZMT.X, ey - ZMT.Y) < ZMT.GLASS + 0.4 && ez > ZMT.L[5] - 0.2 && ez < ZMT.L[5] + 5, bk = (o.beamK == null ? 1 : o.beamK) * (inside ? 0.3 : 1);
  Q.beam.visible = on && !o.noBeam; Q.beamM.opacity = kk * bk; Q.coreBM.opacity = kk * bk;
  Q.glow.visible = on; Q.glow.material.opacity = kk * (inside ? 0.3 : 1); Q.glow.scale.setScalar(inside ? 1.2 + kk : 2 + 4 * kk);
  Q.lensM.color.setRGB(0.3 + 0.7 * kk, 0.34 + 0.6 * kk, 0.38 + 0.4 * kk); Q.lensM.opacity = 0.3 + 0.55 * kk;
  Q.coreM.color.setRGB(0.1 + 0.9 * kk, 0.1 + 0.9 * kk, 0.11 + 0.87 * kk);
  Q.L.intensity = 0.2 + (inside ? 1.2 : 2.8) * kk;
  // (the lens's rings: o.rings, how many of its eleven are in their frame, 1841's lens going together)
  if (o.rings != null) Q.lens.children.forEach((c, i) => { if (i < 11) c.visible = i < o.rings; });
}
// is bearing b (radians, from north, clockwise) inside a beam pointing at ang, w either side?
const cplInBeam = (b, ang, w) => Math.abs(angDiff(b, ang)) < (w || 0.12);
const cplBearing = (x, y) => Math.atan2(x - (FPSC.CX + CPL.TX), y - (FPSC.CY + CPL.TY));

// ---------- the sky: evening, night, dawn ----------
// o: { amb, moon, fog: [r, g, b], near, far }; each frame from a stage's f3 (after zmScene3D's own night)
function cplSky(o) {
  if (typeof GL3D === 'undefined' || !GL3D.scene) return;
  if (o.amb != null) GL3D.amb.intensity = o.amb;
  if (o.moon != null) GL3D.moon.intensity = o.moon;
  if (o.ambC) GL3D.amb.color.setRGB(...o.ambC); else GL3D.amb.color.setRGB(1, 1, 1);
  const F = GL3D.scene.fog;
  if (F && o.fog) { F.color.setRGB(o.fog[0], o.fog[1], o.fog[2]); if (o.near != null) F.near = o.near; if (o.far != null) F.far = o.far; RAID.fog0 = true; }
}

// ---------- holding Use ----------
const CPLH = { k: null, t: 0 };
const cplHeld = () => !!(FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse);
// (your own screen) holding Use at thing k: true once you've held it need seconds
function cplHold(k, dt, need) {
  const o = ZM.near, ok = cplHeld() && o && o.k === k && !(FPS.me.dead > 0) && !zmIsDown() && !cpCineOn();
  if (!ok) { if (CPLH.k === k) { CPLH.k = null; CPLH.t = 0; } return false; }
  if (CPLH.k !== k || CPLH.o !== o.id) { CPLH.k = k; CPLH.o = o.id; CPLH.t = 0; }
  CPLH.t += dt; CPLH.need = need;
  if (CPLH.t >= need) { CPLH.k = null; CPLH.t = 0; return true; }
  return false;
}
// (a stage's hud) the ring filling round the sights while Use is held
function cplHoldHud() {
  if (!CPLH.k || !CPLH.need || !(CPLH.t > 0)) return;
  const k = Math.min(1, CPLH.t / CPLH.need);
  ctx.strokeStyle = 'rgba(255,192,112,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = '#ffc070'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
}
// a bar on the HUD (under the objective): label, share done
function cplBar(phone, mono, label, k, row, col) {
  const L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 72 : 96) + (row || 0) * (phone ? 26 : 32), w = phone ? 150 : 220, h = phone ? 6 : 8;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(8,10,14,0.5)'; ctx.fillRect(L - 6, top - 4, w + 12, h + (phone ? 20 : 24));
  ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText(label, L, top, w);
  ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(L, top + (phone ? 12 : 15), w, h);
  ctx.fillStyle = col || '#ffc070'; ctx.fillRect(L, top + (phone ? 12 : 15), w * clamp(k, 0, 1), h);
  ctx.textBaseline = 'alphabetic';
}

// ---------- carrying ----------
// RAID.st.carry: { sid: what } in the host's word (each stage packs it); what: 'crate', 'heart', 'panel3', 'oil', 'wick'...
const cplCarryOf = sid => { const C = RAID.on && RAID.st && RAID.st.carry; return C ? C[sid] || null : null; };
const cplCarrying = () => !!(CP.on && RAID.on && cplCarryOf(FPS.me.id));
if (typeof fbNoGun === 'function') { const g0 = fbNoGun; fbNoGun = function () { return g0() || cplCarrying() || cplNoGunStage(); }; }
// (a stage marked noGun: a keeper's night, nobody armed; src/cpm04x.js)
// (a figure posed with noGun: its weapons' roots hidden too, which cpkNpcPose's noGun misses)
function cplGunAway(F) { if (F && F.wpn) for (const k in F.wpn) if (F.wpn[k] && F.wpn[k].root) F.wpn[k].root.visible = false; }
function cplNoGunStage() { return !!(typeof CP !== 'undefined' && CP.on && RAID.on && RAID_ORDER && (RAID_STAGES[RAID_ORDER[RAID.stage]] || {}).noGun); }
// (each stage's f3) what everyone carries, in front of them: a model for each kind (made once, kept)
const CPLC = { grp: null, mine: null, theirs: new Map(), mk: {} };
function cplCarryBuild(grp) { CPLC.grp = new THREE.Group(); grp.add(CPLC.grp); CPLC.mine = null; CPLC.theirs = new Map(); }
function cplCarryModel(kind) {
  const g3 = new THREE.Group(), wood = z3Lam('#7a5a38'), dark = z3Lam('#3a2a1c'), brass = z3Lam('#b08a3c'), glass = new THREE.MeshPhongMaterial({ color: 0xd8f0ff, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.6 });
  const box = (m, x, y, z, w, h, d) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g3.add(b); return b; };
  if (kind === 'crate' || kind === 'heart') {
    const s = kind === 'heart' ? 0.75 : 0.6;
    box(wood, 0, 0, 0, s, s * 0.8, s); for (const y of [-s * 0.3, s * 0.3]) box(dark, 0, y, 0, s * 1.02, 0.05, s * 1.02);
    // (the lens's heart: its crate stencilled with a sunburst, and a glint at its slats)
    if (kind === 'heart') { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,236,180,0.8)', 'rgba(255,236,180,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(0.7); sp.position.set(0, 0, s * 0.52); g3.add(sp); }
  } else if (/^panel/.test(kind)) {
    box(brass, 0, 0, 0, 0.62, 0.9, 0.06); const p = box(glass, 0, 0, 0.02, 0.54, 0.82, 0.05);
    for (let i = 0; i < 5; i++) box(brass, 0, -0.36 + i * 0.18, 0.05, 0.56, 0.02, 0.03);
  } else if (kind === 'oil') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.45, 12), z3Lam('#4a5a4a')); g3.add(c);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 6), brass); sp.position.set(0.14, 0.18, 0); sp.rotation.z = -0.9; g3.add(sp);
  } else if (kind === 'wick') {
    box(z3Lam('#e8e0c8'), 0, 0, 0, 0.3, 0.12, 0.3); box(brass, 0, 0.1, 0, 0.18, 0.1, 0.18);
  } else box(wood, 0, 0, 0, 0.4, 0.4, 0.4);
  return g3;
}
function cplCarry3d() {
  if (!CPLC.grp) return;
  const m = FPS.me, G0 = FPSC.GROUND, mine = cplCarryOf(m.id), cine = cpCineOn();
  // mine: low in front of me, in my view
  if (!mine || cine || m.dead > 0 || zmIsDown()) { if (CPLC.mine) CPLC.mine.visible = false; }
  else {
    if (!CPLC.mine || CPLC.mine.kind !== mine) { if (CPLC.mine) CPLC.grp.remove(CPLC.mine); CPLC.mine = cplCarryModel(mine); CPLC.mine.kind = mine; CPLC.grp.add(CPLC.mine); }
    const h = m.h, ez = G0 + FPSC.EYE + (m.jz || 0) - (FPS.crouchEye || 0), fx = Math.sin(h), fy = Math.cos(h), sw = reduceMotion ? 0 : Math.sin((FPS.step || 0) * 0.5) * 0.02;
    CPLC.mine.visible = true; CPLC.mine.position.copy(z3v(m.x + fx * 0.75, m.y + fy * 0.75, ez - 0.62 + sw)); CPLC.mine.rotation.set(0, -h, 0);
  }
  // theirs
  const seen = new Set();
  for (const r of FPS.remote.values()) {
    const what = cplCarryOf(r.id); if (!what || r.dead || r.x == null) continue;
    seen.add(r.id);
    let M = CPLC.theirs.get(r.id);
    if (!M || M.kind !== what) { if (M) CPLC.grp.remove(M); M = cplCarryModel(what); M.kind = what; CPLC.grp.add(M); CPLC.theirs.set(r.id, M); }
    const h = r.h || 0; M.visible = !cine || true; M.position.copy(z3v(r.x + Math.sin(h) * 0.55, r.y + Math.cos(h) * 0.55, G0 + (r.jz || 0) + 1.05)); M.rotation.set(0, -h, 0);
  }
  for (const [id, M] of CPLC.theirs) if (!seen.has(id)) { CPLC.grp.remove(M); CPLC.theirs.delete(id); }
}
// (the host) who's standing where: [sid, x, y, jz] for you and every other living player
function cplPeople() {
  const out = [], m = FPS.me;
  if (!(m.dead > 0)) out.push([m.id, m.x, m.y, m.jz || 0, zmIsDown()]);
  if (ZM.net === 'host') for (const o of FPS.remote.values()) if (!o.dead && o.x != null) out.push([o.id, o.x, o.y, o.jz || 0, !!o.down]);
  return out;
}

// ---------- the brig (and in 1841 the lugger) ----------
// o: { lug: a two-masted lugger with brown lugsails, smaller; sails: 0 to 1 how much canvas she shows; lights: her side
// lights and stern lantern }. Bow along +x, her waterline at y 0. Kept: g.userData { sails: [meshes], lights: [sprites] }
function cplBrig(o) {
  o = o || {};
  const g3 = new THREE.Group(), L = o.lug ? 14 : 30, B = o.lug ? 4.2 : 7.4, D = o.lug ? 1.8 : 3.4;
  const hullM = z3Lam(o.lug ? '#3a2a1e' : '#1e1c1a'), trimM = z3Lam(o.lug ? '#6a4a2a' : '#c8b878'), deckM = z3Lam('#6a5a44'), mastM = z3Lam('#4a3a28');
  const sailM = new THREE.MeshLambertMaterial({ color: o.lug ? 0x8a5a3a : 0xd8d0b8, side: THREE.DoubleSide });
  // the hull: stations from stern to bow, a lofted shell
  const st = [[-0.5, 0.78, 0.25], [-0.38, 0.95, 0.12], [-0.15, 1, 0], [0.15, 1, 0], [0.32, 0.86, 0.05], [0.44, 0.52, 0.18], [0.5, 0.04, 0.32]];
  const pos = [], idx = [];
  st.forEach(([u, w, sh], i) => { const x = u * L, hw = w * B / 2, top = D * 0.55 + sh * D * 0.5, bot = -D * 0.45;
    pos.push(x, top, -hw, x, bot * 0.7, -hw * 0.75, x, bot, 0, x, bot * 0.7, hw * 0.75, x, top, hw); });
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < 4; j++) { const a = i * 5 + j, b = a + 1, c = a + 5, d = c + 1; idx.push(a, c, b, b, c, d); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setIndex(idx); hg.computeVertexNormals();
  g3.add(new THREE.Mesh(hg, new THREE.MeshLambertMaterial({ color: hullM.color, side: THREE.DoubleSide })));
  const deck = new THREE.Mesh(new THREE.BoxGeometry(L * 0.86, 0.12, B * 0.86), deckM); deck.position.set(-L * 0.04, D * 0.5, 0); g3.add(deck);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, 0.12, B * 1.0), trimM); rail.position.set(-L * 0.02, D * 0.58, 0); rail.scale.z = 1.0; g3.add(rail);
  const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, L * 0.35, 6), mastM); bs.rotation.z = -Math.PI / 2 + 0.25; bs.position.set(L * 0.58, D * 0.9, 0); g3.add(bs);
  const sails = [], masts = o.lug ? [[-0.15, 9], [0.25, 11]] : [[-0.18, 21], [0.16, 23]];
  for (const [u, hh] of masts) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, hh, 8), mastM); m.position.set(u * L, D * 0.5 + hh / 2, 0); g3.add(m);
    if (o.lug) { const s = new THREE.Mesh(new THREE.PlaneGeometry(hh * 0.62, hh * 0.7), sailM); s.position.set(u * L - 0.4, D * 0.5 + hh * 0.5, 0); s.rotation.y = Math.PI / 2 + 0.25; g3.add(s); sails.push(s); }
    else for (let k = 0; k < 3; k++) {
      const y = D * 0.5 + hh * (0.32 + k * 0.24), w = B * (2.0 - k * 0.42), h2 = hh * 0.2;
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, w * 1.1, 6), mastM); yard.rotation.x = Math.PI / 2; yard.position.set(u * L, y + h2 / 2, 0); g3.add(yard);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h2), sailM); s.position.set(u * L + 0.15, y, 0); s.rotation.y = Math.PI / 2; g3.add(s); sails.push(s);
    }
  }
  if (!o.lug) { const sp = new THREE.Mesh(new THREE.PlaneGeometry(9, 12), sailM); sp.position.set(-L * 0.38, D * 0.5 + 8, 0); g3.add(sp); sails.push(sp);
    const jib = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), sailM); jib.position.set(L * 0.42, D * 0.5 + 7, 0); jib.rotation.y = 0.0; g3.add(jib); sails.push(jib); }
  // her lights: red to port, green to starboard, a lantern at the stern
  const lights = [];
  if (o.lights !== false) for (const [x, z, c] of [[L * 0.12, -B / 2 - 0.1, 'rgba(255,70,50,0.95)'], [L * 0.12, B / 2 + 0.1, 'rgba(80,255,120,0.95)'], [-L * 0.5, 0, 'rgba(255,220,150,0.95)']]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft(c, 'rgba(0,0,0,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.scale.setScalar(3.2); sp.position.set(x, D + 1.5, z); g3.add(sp); lights.push(sp);
  }
  g3.userData = { sails, lights, L, B, D };
  return g3;
}

// ---------- Lantern Rock: the stump of its fire tower, and the fire ----------
const CPLR = { g: null, fire: null, glow: null, L: null, k: 1 };
function cplLanternRock(grp) {
  const g3 = new THREE.Group(), [lx, ly] = CPL.LR; g3.position.copy(z3v(FPSC.CX + lx, FPSC.CY + ly, FPSC.GROUND - 0.6)); grp.add(g3);
  const rock = new THREE.MeshLambertMaterial({ color: 0x2e3034, fog: false }), stone = new THREE.MeshLambertMaterial({ color: 0x4a4844, fog: false });
  const rr = seeded(0x1a77);
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(4 + rr() * 7, 0), rock); m.position.set((rr() - 0.5) * 22, -1 + rr() * 3, (rr() - 0.5) * 16); m.scale.y = 0.45 + rr() * 0.4; m.rotation.set(rr(), rr() * 3, rr()); g3.add(m); }
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 9, 14), stone); tw.position.y = 6; g3.add(tw);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.4, 1.2, 10), new THREE.MeshLambertMaterial({ color: 0x1e1a16, fog: false })); bowl.position.y = 11.1; g3.add(bowl);
  const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,170,80,0.95)', 'rgba(255,90,30,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  fire.position.y = 13; fire.scale.set(7, 10, 1); g3.add(fire);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,140,60,0.5)', 'rgba(255,100,40,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.position.y = 12; glow.scale.setScalar(60); g3.add(glow);
  const L = new THREE.PointLight(0xff9a50, 2.4, 60, 1.4); L.position.y = 13; g3.add(L);
  Object.assign(CPLR, { g: g3, fire, glow, L, k: 1 });
  return g3;
}
// how high the fire burns (0 out, 1 as it always has), flickering
function cplFireSet(k) {
  if (!CPLR.fire) return;
  if (CPL.ov && cpCineOn() && CPL.ov.fire != null) k = CPL.ov.fire;
  const t = g.t, fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 9.3) * Math.sin(t * 3.1);
  CPLR.k = k; const kk = clamp(k, 0, 1) * fl;
  CPLR.fire.visible = kk > 0.01; CPLR.fire.scale.set(7 * (0.4 + 0.6 * kk), 10 * kk, 1); CPLR.fire.material.opacity = Math.min(1, kk * 1.3);
  CPLR.glow.material.opacity = kk * 0.9; CPLR.L.intensity = 2.4 * kk;
}

// ---------- a living woman of the 1880s (Maren) ----------
// from Maren's End's model of her (src/raidfort.js rfBuildMaren), at a woman's height: warm skin, a dark blue dress, no
// sea-light about her, her eyes not lit
function cplWoman(o) {
  if (typeof rfBuildMaren !== 'function') return null;
  o = o || {};
  const M = rfBuildMaren();
  M.body.scale.setScalar(o.s || 1.0);
  M.dress.color.setHex(o.dress || 0x1e2a44); M.dress.emissive.setRGB(0, 0, 0);
  M.skin.color.setHex(0xc89a80); M.skin.emissive.setRGB(0.04, 0.02, 0.01);
  M.eyeM.color.setHex(0x2a2018); M.shell.visible = M.shell2.visible = false; M.glow.visible = false; M.foot.visible = false;
  M.hips.children.forEach(c => { if (c.geometry === RFMG.weed) c.visible = false; });
  // a shawl over her shoulders, and in her hand the lantern
  if (o.lantern !== false) { const lan = cplLantern(1); lan.position.set(0, -0.38, 0); M.arms[1].el.add(lan); M.lan = lan; M.lanHalo = lan.userData.halo; }
  return M;
}
// a hand lantern, lit: brass and glass, a flame, a glow (s: its glow's size)
function cplLantern(s) {
  const lan = new THREE.Group(), brass = z3Lam('#9a7a34');
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), new THREE.MeshBasicMaterial({ color: 0xffe6a8 })); lan.add(gl);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.06, 10), brass); cap.position.y = 0.11; lan.add(cap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.03, 10), brass); base.position.y = -0.09; lan.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 5, 10), brass); ring.position.y = 0.16; lan.add(ring);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,226,160,0.8)', 'rgba(255,226,160,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.scale.setScalar(1.2 * (s || 1)); lan.add(halo);
  lan.userData.halo = halo;
  return lan;
}
// o: { x, y, h (bearing she faces), z (her feet over the ground), sit: 0 to 1, row: the oars' phase, lift: her lantern
// raised, look: her head turned }
function cplWomanPose(M, o) {
  if (!M) return;
  const t = g.t, sw = reduceMotion ? 0 : 1;
  M.root.position.copy(z3v(o.x, o.y, FPSC.GROUND + (o.z || 0)));
  M.root.rotation.set(0, -(o.h || 0), 0);
  M.body.position.y = -(o.sit || 0) * 0.55;
  M.torso.rotation.set(0.05 + (o.row != null ? Math.sin(o.row) * 0.35 : Math.sin(t * 0.7) * 0.02 * sw), o.look || 0, 0);
  M.head.rotation.set(0.05, (o.look || 0) * 0.5, 0);
  M.hair.rotation.set(-0.08 + Math.sin(t * 1.4) * 0.08 * sw, 0, Math.sin(t * 1.1) * 0.06 * sw);
  let R = [0.1, 0.16, -0.2], Lf = [0.1, -0.16, 0.2];
  if (o.row != null) { const k = Math.sin(o.row); R = [-0.9 - k * 0.5, 0.25, -0.5]; Lf = [-0.9 - k * 0.5, -0.25, 0.5]; }
  if (o.lift) Lf = [-1.2 * o.lift + 0.1, -0.3, 0.4 + 0.6 * o.lift];
  M.arms[0].sh.rotation.set(R[0], 0, R[1]); M.arms[0].el.rotation.set(0, 0, R[2]);
  M.arms[1].sh.rotation.set(Lf[0], 0, Lf[1]); M.arms[1].el.rotation.set(0, 0, Lf[2]);
  if (M.lan) M.lan.rotation.set(-(Lf[0] + Lf[2] * 0), 0, -Lf[1] - Lf[2]);
  if (M.lanHalo) M.lanHalo.material.opacity = o.lanK == null ? 0.9 : o.lanK;
  M.skirt.rotation.y = Math.sin(t * 0.9) * 0.05 * sw;
}
// a skiff (a rowing boat), bow along +x: a THREE.Group, with its oars (g.userData.oars)
function cplSkiff() {
  const g3 = new THREE.Group(), wood = z3Lam('#5a4028'), dark = z3Lam('#2a1e14');
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.5, 4.2, 10, 1, true, 0, Math.PI), new THREE.MeshLambertMaterial({ color: wood.color, side: THREE.DoubleSide }));
  hull.rotation.z = Math.PI / 2; hull.rotation.y = 0; hull.scale.set(1, 1, 0.8); hull.position.y = 0.45; hull.rotation.x = Math.PI; g3.add(hull);
  const th = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 1.3), dark); th.position.set(-0.2, 0.3, 0); g3.add(th);
  const oars = [];
  for (const s of [-1, 1]) { const oar = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5), dark); sh.rotation.x = Math.PI / 2; sh.position.z = s * 1.1; oar.add(sh); oar.position.set(-0.1, 0.55, 0); g3.add(oar); oars.push(oar); }
  g3.userData = { oars };
  return g3;
}

// ---------- mission 3 ----------
cpCast('fore', { n: 'The Foreman', c: '#c8b48a' });
cpCast('lastfire', { n: 'The Last Fire-Keeper', c: '#ff9a5a' });
Object.assign(CP_MUSIC_FALL, { cpm03work: 'cpsail', cpm03haar: 'cpfog', cpm03lamp: 'cptense', cpm03light: 'cphope' });
Object.assign(RM_LOOP, { cpm03light: false });   // (the lighting, played once on into the end card)
cpMission({ id: 'm03', act: 2, n: 'Lighting the Light', when: '1841', where: 'Skerry Light',
  blurb: "The Light is built on its rock. Carry the Lampwright's lens up the tower, set it, and light it for the first time.",
  stages: ['cp_m03land', 'cp_m03haar', 'cp_m03lamp'], intro: 'm03_intro', outro: 'm03_outro', cut: { 1: 'm03_haar' }, after: { 1: 'm03_up' }, music: { default: 'cpm03work' } });

// ---------- mission 3's cinematics ----------
// (the old fire-keeper, on top of the stump of his tower on Lantern Rock, by his fire)
const M3OLD = ['#1e1a18', '#5a5248', '#2a2420', '#ff9a5a'];
const m3OldAt = () => [FPSC.CX + CPL.LR[0] + 1.9, FPSC.CY + CPL.LR[1] - 1.5];
function m3CineOld(C) { C.old = cpkNpc(M3OLD); }
function m3CineOldPose(C, h, p) { const [x, y] = m3OldAt(); cpkNpcPose(C.old, { x, y, h: h == null ? Math.PI * 0.95 : h, jz: 9.95, noGun: true, lan: false, p: p || 0 }); cplGunAway(C.old); }
const m3CineFree = C => { for (const k of ['old', 'lamp', 'fore']) if (C[k]) cpkNpcFree(C[k]); CPL.ov = null; };
cpCineDef('m03_intro', {
  music: 'cpm03work',
  b3(grp, C) { m3CineOld(C); },
  exit(C) { m3CineFree(C); },
  shots: [
    cpTitleShot(CP_BY.m03),
    { d: 7, cam: [70, -125, 16], to: [38, -96, 9], look: [0, -14, 13], lookTo: [0, -10, 11], fade: [1, 0],
      lines: [[0.6, 'lamp', 'Forty years they have talked of a light on this rock. Tonight she has her tower.', 'cp_m03_01'], [4, 'lamp', 'Tomorrow, if the sea allows, she has her eye.', 'cp_m03_02']] },
    { d: 7.5, cam: [104, 392, 7], to: [92, 404, 11], look: [72, 429, 11], lookTo: [71, 429, 11.5], f(t, k, C) { m3CineOldPose(C, Math.PI * 0.85); },
      lines: [[0.5, 'lastfire', 'Six hundred years my fathers kept a fire on this rock.', 'cp_m03_03'], [3.8, 'lastfire', 'Let them build their tower. We will see whose light the sea minds.', 'cp_m03_04']] },
    { d: 6, cam: [8, -57, 2.4], to: [5, -59, 2.2], look: [-5.6, -64, 1.6], lookTo: [-7, -66, 1.2],
      lines: [[0.4, 'fore', 'Sea’s getting up, sir. We want her unloaded before dark.', 'cp_m03_05']] },
    { d: 6.5, cam: [-6, -21, 1.8], to: [-4.5, -19, 2.4], look: [-2.8, -13.6, 1.7], lookTo: [0, -9, 9], fade: [0, 0.6],
      lines: [[0.3, 'lamp', 'Every prism in those crates I ground with my own hands.', 'cp_m03_06'], [3.4, 'lamp', 'Carry them as you would carry a child.', 'cp_m03_07']] },
  ] });
cpCineDef('m03_haar', {
  music: 'cpm03haar',
  exit(C) { m3CineFree(C); },
  shots: [
    { d: 5.5, cam: [30, 120, 22], to: [16, 92, 15], look: [0, 0, 10], fade: [0.8, 0],
      lines: [[0.6, 'lamp', 'Haar. Off Lantern Rock, and quick with it.', 'cp_m03_08']] },
    { d: 5, cam: [6, 52, 2.4], to: [4, 56, 2.6], look: [CPL.LR[0], CPL.LR[1], 14],
      lines: [[0.2, 'fore', 'Sir! The big crate, the heart of her. The last sea had it off the lugger.', 'cp_m03_09']] },
    { d: 6, cam: [-5, -21, 2.2], to: [-4.2, -19.5, 2.2], look: [-2.8, -13.6, 1.7],
      lines: [[0.2, 'fore', 'It fetched up on the north rocks. Something’s out there with it.', 'cp_m03_10'], [3.2, 'lamp', 'Then we fetch it. Light the braziers as you go, and keep together.', 'cp_m03_11']] },
  ] });
cpCineDef('m03_up', {
  music: 'cpm03lamp',
  b3(grp, C) { C.crate = cplCarryModel('heart'); grp.add(C.crate); },
  shots: [
    { d: 5, cam: [3.4, -17, 1.0], look: [0, -11.4, 6], lookTo: [0, -11.4, 22],
      f(t, k, C) { C.crate.position.copy(z3v(FPSC.CX, FPSC.CY + ZMT.Y - 12.9, FPSC.GROUND + 2 + k * 22)); C.crate.rotation.y = t * 0.4; },
      lines: [[0.5, 'lamp', 'Steady. Steady. There she goes.', 'cp_m03_12']] },
    { d: 6, cam: [8, -12, 27.2], to: [6, -13, 27.6], look: [0, ZMT.Y, 26.5], fade: [0, 0.8],
      f(t, k, C) { C.crate.position.copy(z3v(FPSC.CX + 0.8, FPSC.CY + ZMT.Y - 8.2, FPSC.GROUND + ZMT.L[5] + 0.38)); },
      lines: [[0.4, 'lamp', 'The fog is lifting. As if it knew.', 'cp_m03_13'], [3.2, 'lamp', 'Up, all of you. We set her tonight.', 'cp_m03_14']] },
  ] });
// the first light: the lamp catches, the lens turns, the beam goes out over the sea; far off, the old fire goes out
cpCineDef('m03_outro', {
  music: 'cpm03light',
  b3(grp, C) { m3CineOld(C); CPL.ov = { k: 0, ang: 0.4, fire: 1, o: { rings: 11 } }; },
  exit(C) { m3CineFree(C); },
  shots: [
    { d: 4, cam: [1.3, ZMT.Y - 2.4, 26.5], to: [1.5, ZMT.Y - 2.6, 26.6], look: [0, ZMT.Y, 26.1],
      f(t, k, C) { CPL.ov.k = k < 0.4 ? 0.02 : 0.02 + (k - 0.4) * 0.5; CPL.ov.ang = 0.4; CPL.ov.o = { rings: 11, noBeam: true, flicker: true }; },
      enter() { try { if (!soundOff()) sfxChime(); } catch (e) {} },
      lines: [[0.4, 'lamp', 'Gently, now. Let her take it.', 'cp_m03_15']] },
    { d: 4.5, cam: [3.8, ZMT.Y - 3.2, 26.8], to: [5.4, ZMT.Y - 4.8, 27.4], look: [0, ZMT.Y, 26.2],
      f(t, k, C) { CPL.ov.k = 0.32 + 0.68 * Math.min(1, k * 1.6); CPL.ov.ang = 0.4 + k * 0.9; CPL.ov.o = { rings: 11 }; },
      lines: [[0.8, 'lamp', 'There she is.', 'cp_m03_16']] },
    { d: 7, cam: [-80, -150, 9], to: [-58, -118, 13], look: [0, ZMT.Y, 23], lookTo: [0, ZMT.Y, 25], fade: [0.3, 0],
      f(t, k, C) { CPL.ov.k = 1; CPL.ov.ang = 1.3 + t * 0.97; },
      lines: [[1, 'lamp', 'Let every master on this coast see her, and steer by her.', 'cp_m03_17'], [4.2, 'fore', 'You can see her from Wrackhaven, sir. I’d stake my wages on it.', 'cp_m03_18']] },
    { d: 8, cam: [36, 318, 7], to: [48, 352, 9], look: [70, 430, 11],
      f(t, k, C) { CPL.ov.k = 1; CPL.ov.ang = (0.1 + t * 0.97) % 6.283; CPL.ov.fire = clamp(1 - Math.max(0, t - 2.2) / 4.2, 0, 1); m3CineOldPose(C, Math.PI * 1.05); },
      lines: [[2.8, 'lastfire', 'There. You have no more need of me.', 'cp_m03_19']] },
    { d: 6.5, cam: [CPL.LR[0] + 5.5, CPL.LR[1] - 6.5, 13.4], to: [CPL.LR[0] + 4.6, CPL.LR[1] - 5.6, 13.0], look: [CPL.LR[0] + 1.9, CPL.LR[1] - 1.5, 11.2], fade: [0, 1.2],
      f(t, k, C) { CPL.ov.k = 1; CPL.ov.ang = (2.2 + t * 0.97) % 6.283; CPL.ov.fire = 0; m3CineOldPose(C, Math.PI * 1.08 + Math.min(1, t / 3) * 0.12, -0.05); if (Math.random() < 0.3) fpsPuff(FPSC.CX + CPL.LR[0] + (Math.random() - 0.5), FPSC.CY + CPL.LR[1] + (Math.random() - 0.5), FPSC.GROUND + 11.2, '80,80,80', 1.2); },
      lines: [[0.8, 'lastfire', 'Then I will keep it cold. Someone must.', 'cp_m03_20']] },
    { d: 6.5, card: { eye: '1841', t: 'The Light is lit', sub: 'The fire on Lantern Rock was put out for good, and its keeper with it.' } },
  ] });
