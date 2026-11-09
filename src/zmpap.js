// The Lighthouse: the Lampwright's Bench. A brass-and-glass bench in the Store Hall where the keepers once ground and
// mended the great lens's prisms; 5000 points and it takes the weapon in your hand, turns it through the Light's own
// fire behind its spinning lens for a few seconds, and gives it back reforged: a new name, a bigger magazine and
// reserve, a warm glow along its metal, and it hits the drowned three times as hard (the Fresnel Lamp twice).
//  - Per player, like what you carry (ZM.own, ZM.res): the reforged weapons are ZM.pap[id]. Lose the weapon (a wall
//    buy or the chest replaces it, or you bleed out) and the reforging goes with it. A reforged weapon can't be
//    reforged again; the knife can't be reforged at all.
//  - Damage: scaled where the hit is made (zmHurt, before a joined player's hit goes to the host), so it works alone,
//    hosting and joined alike; the host's ZM_DMG multiplier still applies on top, as for any hit.
//  - Magazines: FPSW is shared with Wreckers' Night, so it's never changed. fpsW() (src/fps.js) asks zmpW() for the
//    reforged weapon's own copy of its entry (more rounds in the magazine, its new name) while you're in the
//    Lighthouse; reloading, the ammunition count and the reload prompt all go through fpsW().
//  - Wall ammunition for a reforged weapon costs ZM_PAP.AMMO_COST and fills the reforged reserve.
// Everything here hangs off a few marked hook lines (// [pap]) in src/zombies.js and src/fps.js.

// where the bench stands: relative to the island's middle (as ZM_ZONES), against a wall, nx/ny the way its front faces
// (into the room). The Store Hall's south wall, between the Lamp Passage door and the east window.
const ZM_PAP_AT = { x: 4.6, y: 14.8, nx: 0, ny: 1, zone: 'hall' };
const ZM_PAP = { COST: 5000, AMMO_COST: 4500, TIME: 4.6, NAME: "the Lampwright's Bench" };
// what each weapon becomes: its new name, magazine and reserve, and how much harder it hits the drowned
const ZM_PAP_W = {
  pepperbox: { n: 'Twelve Bells', mag: 12, res: 120, k: 3 },
  blunderbuss: { n: 'Spring Tide', mag: 2, res: 48, k: 3 },
  longarm: { n: 'Leading Light', mag: 3, res: 60, k: 3 },
  harpoon: { n: 'Whale-Road', mag: 3, res: 40, k: 3 },
  cutlass: { n: 'Keel-Splitter', mag: 0, res: 0, k: 3 },
  avtomat: { n: 'Equinox Gale', mag: 50, res: 400, k: 3 },
  fresnel: { n: 'First-Order Lamp', mag: 90, res: 450, k: 2 },
};
const ZM_PAP_GLOW = 0xffa838;

// ---------- the bench itself (a prop: its solid and its static parts) ----------
FPI_K.zmpap = {
  col: FPI_C.wood3,
  sol(p) { return [fpiBox(p, 0, 0, 1.15, 0.5, 2.5)]; },
  // (the prop's front is -v; the lens wheel, the furnace's mouth and the tray are drawn by zmp3d)
  b3(p, A) {
    // the bench: a heavy oak top on four legs, a shelf under it with ingots of brass and a box of prisms
    A.box(FPI_C.wood2, 0, 0, 0.86, 2.3, 0.95, 0.1);
    for (const su of [-1, 1]) for (const sv of [-1, 1]) A.box(FPI_C.wood3, su * 1.06, sv * 0.4, -0.1, 0.1, 0.1, 0.98);
    A.box(FPI_C.wood3, 0, 0, 0.22, 2.12, 0.86, 0.05);
    for (let i = 0; i < 4; i++) A.box(ZMP.brass, -0.8 + i * 0.13, -0.1, 0.27, 0.1, 0.32, 0.06);
    A.box(FPI_C.wood, 0.55, 0, 0.27, 0.6, 0.5, 0.22);
    for (let i = 0; i < 4; i++) A.part('ico', '#cfe0e8', 0.35 + i * 0.13, -0.05, 0.52, 0.12, 0.14, 0.1, i, 0, 0, 'glow');
    // the furnace on the bench: a brick firebox under the lens, a brass lid, and its flue back into the wall
    A.box('#4a2e24', 0, 0.12, 0.96, 1.0, 0.6, 0.42);
    A.box('#2a1c18', 0, -0.19, 1.02, 0.5, 0.02, 0.24);
    A.box(ZMP.brass, 0, 0.12, 1.38, 1.06, 0.66, 0.05);
    A.part('cyl8', ZMP.iron, 0.36, 0.42, 1.2, 0.16, 0.3, 0.16, 0, Math.PI / 2, 0);
    // the frame the lens wheel turns in: two iron uprights and a brass crossbar, a sign board over it
    for (const s of [-1, 1]) { A.box(ZMP.iron, s * 0.82, 0.18, 0.96, 0.1, 0.12, 1.66); A.cyl(ZMP.brass, s * 0.82, 0.18, 2.6, 0.08, 0.1); }
    A.box(ZMP.brass, 0, 0.18, 2.36, 1.74, 0.12, 0.1);
    A.box('#2a2622', 0, 0.36, 2.66, 1.9, 0.06, 0.5); A.box(FPI_C.wood3, 0, 0.36, 2.62, 2.0, 0.08, 0.05); A.box(FPI_C.wood3, 0, 0.36, 3.15, 2.0, 0.08, 0.05);
    // a grindstone on its frame at one end, the bellows at the other
    A.part('cyl8', '#8a8478', 0.92, -0.18, 1.22, 0.55, 0.09, 0.55, 0, 0, Math.PI / 2);
    A.box(FPI_C.wood3, 0.92, -0.18, 0.96, 0.06, 0.06, 0.28);
    A.box('#5a3a24', -0.9, -0.05, 0.96, 0.32, 0.5, 0.16, 0.2); A.box(FPI_C.wood3, -0.9, -0.35, 0.98, 0.06, 0.25, 0.04, 0.2);
    // two small lamps at the front corners
    for (const s of [-1, 1]) { A.cyl(ZMP.iron, s * 1.0, -0.36, 0.96, 0.05, 0.18); A.glow('#ffc070', s * 1.0, -0.36, 1.22, 0.11); }
  },
};
// (from FPI_GEN.light.set) put the bench in its room, with a lamp of its own
function zmpPlace(put, light, W, Z) {
  const P = ZM_PAP_AT, a = Math.atan2(P.nx, -P.ny);
  put('zmpap', P.x, P.y, a, {});
  light(P.x + P.nx * 1.2, P.y + P.ny * 1.2, 1.9, '#ffc070', 6, 'lantern');
  const [wx, wy] = W(P.x, P.y);
  Z.pap = { x: wx, y: wy, nx: P.nx, ny: P.ny, z: 0, zone: P.zone };
}
const zmpAt = () => FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.pap;

// ---------- the state ----------
function zmpReset() { ZM.pap = {}; ZM.forge = { st: 'idle', id: null, t: 0 }; }
// the weapon as it is in your hands: its reforged copy, if it's been reforged (else null)
const ZM_PAP_CACHE = {};
function zmpW(id) {
  if (!ZM.on || !ZM.pap || !ZM.pap[id] || !ZM_PAP_W[id] || !FPSW[id]) return null;
  let w = ZM_PAP_CACHE[id];
  if (!w || w.base !== FPSW[id]) { const U = ZM_PAP_W[id]; w = ZM_PAP_CACHE[id] = Object.assign({}, FPSW[id], { n: U.n, mag: FPSW[id].melee ? FPSW[id].mag : U.mag, pap: true, base: FPSW[id] }); }
  return w;
}
const zmpName = id => (zmpW(id) || FPSW[id]).n;
const zmpMag = id => (zmpW(id) || FPSW[id]).mag;
const zmpAmmo = id => ZM.pap && ZM.pap[id] && ZM_PAP_W[id] ? ZM_PAP_W[id].res : ZM_AMMO[id];
// (from zmHurt) my own hit with a reforged weapon hits harder; anyone else's was scaled where they made it
function zmpDmg(dmg, code, by) {
  if (by && by !== FPS.me.id) return dmg;
  if (!ZM.pap || code === 'k') return dmg;
  const id = FPSW_BY_CODE[code];
  return id && ZM.pap[id] && ZM_PAP_W[id] ? dmg * ZM_PAP_W[id].k : dmg;
}

// ---------- each tick ----------
function zmpTick(dt) {
  if (!ZM.pap) zmpReset();
  const m = FPS.me, F = ZM.forge;
  // bled out: everything you carried, and its reforging, is gone; and anything no longer carried loses it
  if (ZM.ghost) ZM.pap = {};
  for (const id in ZM.pap) if (!ZM.own.includes(id) && !(F.st === 'work' && F.id === id)) delete ZM.pap[id];
  if (F.st === 'work') {
    F.t += dt;
    // the weapon's on the bench: not in your hands
    if (FPS.weapon === F.id) { FPS.drawT = 0.45; m.reload = 0; FPS.scoped = false; }
    F.sT = (F.sT || 0) - dt;
    if (F.sT <= 0) { F.sT = 0.55; zmpSound('grind'); }
    if (F.t >= ZM_PAP.TIME) zmpDone();
  }
  zmpTint();
}
function zmpDone() {
  const m = FPS.me, F = ZM.forge, id = F.id, U = ZM_PAP_W[id];
  F.st = 'idle'; F.id = null; F.t = 0;
  if (!ZM.own.includes(id)) {
    // (it went from your hands while it was on the bench: the points come back)
    ZM.pts += ZM_PAP.COST; ZM.spent -= ZM_PAP.COST;
    fpsFeed('The bench has nothing to give back to you. The points are returned.');
    return;
  }
  ZM.pap[id] = true;
  const w = zmpW(id);
  if (!w.melee) { m.mags[id] = w.mag; ZM.res[id] = U.res; }
  if (FPS.weapon === id) { if (!w.melee) m.ammo = w.mag; m.reload = 0; m.cd = 0; FPS.drawT = 0.45; }
  else if (!(m.dead > 0)) fpsSwitch(id);
  ZM.banner = { text: U.n, t: 3, col: '#ffc070' };
  fpsFeed(`The ${FPSW[id].n} comes back out of the fire as the ${U.n}.`);
  zmpSound('done');
}

// ---------- using it ----------
// (from zmNearest) the bench, if you're in front of it and its room is open
function zmpConsider(consider) {
  const P = zmpAt(); if (!P || !zmOpen(P.zone)) return;
  consider({ k: 'pap' }, P.x + P.nx * 1.05, P.y + P.ny * 1.05, 0, 1.8, true);
}
// (from zmPrompt) what the bench says, and what a wall buy says for a reforged weapon; null for anything else
function zmpPrompt(o) {
  if (o.k === 'buy' && ZM.pap && ZM.pap[o.b.id] && ZM.own.includes(o.b.id)) {
    const w = zmpW(o.b.id); if (w.melee) return { text: `${w.n}: in hand` };
    return { text: `${w.n} ammunition`, cost: ZM_PAP.AMMO_COST };
  }
  if (o.k !== 'pap') return null;
  const F = ZM.forge, id = FPS.weapon;
  if (F.st === 'work') return { text: `The bench is at work on your ${FPSW[F.id].n}…` };
  if (!ZM_PAP_W[id]) return { text: `${ZM_PAP.NAME}: nothing it can reforge` };
  if (ZM.pap[id]) return { text: `The ${ZM_PAP_W[id].n} has been through the fire already` };
  return { text: `Reforge the ${FPSW[id].n} at ${ZM_PAP.NAME}`, cost: ZM_PAP.COST };
}
// (from zmUse) true if it was the bench (or a reforged weapon's ammunition) that was used
function zmpUse(o) {
  const m = FPS.me;
  const pay = c => { if (ZM.pts < c) { zmSound('no'); fpsFeed('Not enough points.'); return false; } ZM.pts -= c; ZM.spent += c; return true; };
  if (o.k === 'buy' && ZM.pap && ZM.pap[o.b.id] && ZM.own.includes(o.b.id)) {
    const id = o.b.id, w = zmpW(id), U = ZM_PAP_W[id];
    if (w.melee) return true;
    if ((ZM.res[id] || 0) >= U.res && (FPS.weapon !== id || m.ammo >= w.mag)) { fpsFeed('You can’t carry any more.'); return true; }
    if (!pay(ZM_PAP.AMMO_COST)) return true;
    ZM.res[id] = U.res; m.mags[id] = w.mag; if (FPS.weapon === id) m.ammo = w.mag;
    zmSound('buy');
    return true;
  }
  if (o.k !== 'pap') return false;
  const F = ZM.forge, id = FPS.weapon;
  if (F.st === 'work' || !ZM_PAP_W[id] || ZM.pap[id] || !ZM.own.includes(id)) { zmSound('no'); return true; }
  if (!pay(ZM_PAP.COST)) return true;
  F.st = 'work'; F.id = id; F.t = 0; F.sT = 0.6;
  m.mags[id] = m.ammo;
  // (your other weapon comes to hand while this one's on the bench)
  const other = ZM.own.find(k => k !== id);
  if (other) fpsSwitch(other); else { FPS.drawT = 0.45; m.reload = 0; }
  zmpSound('start');
  fpsFeed(`The ${FPSW[id].n} goes into the Light’s fire…`);
  return true;
}

// ---------- the look in your hands: reforged weapons glow along their metal ----------
const ZMP_TINT = new Map();
function zmpTint() {
  if (typeof VM === 'undefined' || !VM.weapons) return;
  const t = FPS.g ? FPS.g.t : 0;
  for (const id in VM.weapons) {
    const M = VM.weapons[id].M; if (!M) continue;
    const want = ZM.on && ZM.pap && ZM.pap[id];
    for (const k of ['iron', 'brass', 'accent', 'dark', 'blade']) {
      const mt = M[k]; if (!mt || !mt.emissive) continue;
      if (want) {
        if (!ZMP_TINT.has(mt)) ZMP_TINT.set(mt, [mt.emissive.getHex(), mt.emissiveIntensity]);
        const base = k === 'accent' || k === 'brass' ? 0.75 : k === 'dark' ? 0.25 : 0.4;
        mt.emissive.setHex(ZM_PAP_GLOW); mt.emissiveIntensity = base * (0.8 + 0.2 * Math.sin(t * 3 + (k.length)));
      } else if (ZMP_TINT.has(mt)) { const [h, i] = ZMP_TINT.get(mt); mt.emissive.setHex(h); mt.emissiveIntensity = i; ZMP_TINT.delete(mt); }
    }
  }
}
// (from zmStop) back to how they were, for Wreckers' Night
function zmpStop() {
  for (const [mt, [h, i]] of ZMP_TINT) { mt.emissive.setHex(h); mt.emissiveIntensity = i; }
  ZMP_TINT.clear();
  if (ZM.forge) ZM.forge.st = 'idle';
  ZM.pap = {};
}

// ---------- sounds ----------
function zmpSound(k) {
  try {
    if (soundOff()) return;
    if (k === 'start') { noise('bandpass', 260, 3, 0.05, 0.25, 0.9, { to: 900 }); tone(110, 'sawtooth', 0.2, 0.06, 1.2, { to: 220 }); }
    else if (k === 'grind') { noise('bandpass', 1800 + Math.random() * 600, 6, 0.02, 0.07, 0.35); tone(140 + Math.random() * 30, 'triangle', 0.05, 0.05, 0.4); }
    else if (k === 'done') { sfxBellFar(0, 0.7); for (let i = 0; i < 4; i++) tone(392 * Math.pow(1.26, i), 'triangle', 0.005, 0.1, 0.5, { delay: i * 0.09 }); noise('highpass', 3000, 1, 0.01, 0.12, 0.6, { delay: 0.1 }); }
  } catch (e) {}
}

// ---------- in 3D: the lens wheel turning in its frame, the furnace's mouth, the weapon on the tray ----------
const ZMP3 = { grp: null };
function zmp3dBuild() {
  const P = zmpAt(); if (!P) return null;
  const g = new THREE.Group(); g.position.copy(z3v(P.x, P.y, FPSC.GROUND)); g.rotation.y = Math.atan2(P.ny, P.nx) - Math.PI / 2; Z3.grp.add(g);
  // (in the group, -z is the bench's front)
  const brass = z3Lam('#b08a3a', { emissive: 0x201004 }), iron = z3Lam('#24262a');
  const add = (glow, a) => new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: a, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const wheel = new THREE.Group(); wheel.position.set(0, 1.86, 0.12); g.add(wheel);
  const rings = [];
  for (let i = 0; i < 5; i++) { const r = 0.14 + i * 0.1, ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 28), add(0xffe0a0, 0.55 - i * 0.06)); wheel.add(ring); rings.push(ring); }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.045, 6, 32), brass); wheel.add(rim);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.18, 0.03), brass); s.rotation.z = i / 6 * Math.PI; wheel.add(s); }
  const bull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), add(0xfff2c8, 0.9)); bull.scale.z = 0.5; wheel.add(bull);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.75, 8), iron); axle.rotation.z = Math.PI / 2; axle.position.copy(wheel.position); g.add(axle);
  // the furnace's mouth, under the lens
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.22), add(0xff8a30, 0.8)); mouth.position.set(0, 1.14, -0.215); mouth.rotation.y = Math.PI; g.add(mouth);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,190,90,0.9)', 'rgba(255,190,90,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  halo.position.set(0, 1.86, -0.05); halo.scale.setScalar(1.6); g.add(halo);
  // the weapon, on its way in and out
  const show = new THREE.Group(); g.add(show);
  // its name and price, chalked on the board over it
  const ch = z3Chalk([["LAMPWRIGHT'S BENCH", 21], [String(ZM_PAP.COST), 40]], 1.8, 0.46); ch.position.set(0, 2.9, 0.32); ch.rotation.y = Math.PI; g.add(ch);
  const light = new THREE.PointLight(0xffb860, 0.8, 8, 1.5); light.position.set(0, 1.7, -0.9); g.add(light);
  // sparks thrown off the wheel while it works
  const sparks = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 3), add(0xffd080, 1)); s.visible = false; g.add(s); sparks.push({ m: s, t: 0, v: new THREE.Vector3() }); }
  return { grp: Z3.grp, g, wheel, rings, bull, mouth, halo, show, light, sparks, wpn: {}, spin: 0 };
}
// (from zmScene3D) each frame
function zmp3d(dt) {
  if (!ZMP3.b || ZMP3.b.grp !== Z3.grp) ZMP3.b = zmp3dBuild();
  const B = ZMP3.b; if (!B) return;
  const F = ZM.forge || { st: 'idle', t: 0 }, t = g.t, work = F.st === 'work', k = work ? Math.min(1, F.t / 0.8) * Math.min(1, (ZM_PAP.TIME - F.t) / 0.6 + 0.3) : 0;
  B.spin += dt * (0.4 + k * 9);
  B.wheel.rotation.z = B.spin;
  B.rings.forEach((r, i) => { r.material.opacity = (0.35 - i * 0.05) + k * 0.3 + 0.05 * Math.sin(t * 2 + i); });
  B.bull.material.opacity = 0.6 + 0.4 * k;
  B.mouth.material.opacity = 0.55 + 0.25 * Math.sin(t * 7) * (reduceMotion ? 0 : 1) + k * 0.2;
  B.halo.material.opacity = 0.25 + k * 0.35; B.halo.scale.setScalar(1.3 + k * 0.7);
  B.light.intensity = 0.45 + k * 1.1 + (work && !reduceMotion ? 0.15 * Math.sin(t * 23) : 0);
  // the weapon: on the tray, slid in under the lens, turned in the fire, and out again glowing
  for (const id in B.wpn) if (B.wpn[id]) B.wpn[id].visible = false;
  if (work && F.id) {
    let w = B.wpn[F.id];
    if (w === undefined) { w = B.wpn[F.id] = z3Weapon(F.id); if (w) { w.scale.setScalar(1.25); B.show.add(w); w.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const mt of ms) if (mt && mt.emissive) mt.emissive.setHex(ZM_PAP_GLOW); } }); } }
    if (w) {
      w.visible = true;
      const p = F.t / ZM_PAP.TIME, inn = Math.min(1, p / 0.18), out = Math.max(0, (p - 0.82) / 0.18);
      B.show.position.set(0, 1.5 + Math.sin(Math.min(1, p) * Math.PI) * 0.12, -0.75 + inn * 0.55 - out * 0.55);
      B.show.rotation.set(0, Math.PI / 2 + (p > 0.18 && p < 0.82 ? (p - 0.18) * 14 : 0), 0);
      w.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const mt of ms) if (mt && mt.emissive) mt.emissiveIntensity = Math.min(1, p * 1.6); } });
    }
  }
  for (const s of B.sparks) {
    if (s.t > 0) { s.t -= dt; s.m.position.addScaledVector(s.v, dt); s.v.y -= dt * 4; s.m.visible = s.t > 0; continue; }
    if (work && !reduceMotion && Math.random() < dt * 14) { const a = Math.random() * Math.PI * 2; s.t = 0.5 + Math.random() * 0.4; s.m.position.set(Math.cos(a) * 0.6, 1.86 + Math.sin(a) * 0.6, 0.05); s.v.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5 + 0.8, -0.8 - Math.random()); s.m.visible = true; }
  }
}
