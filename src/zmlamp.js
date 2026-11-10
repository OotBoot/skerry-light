// The Lighthouse: the Light itself. Every night it starts dark: the great lens stands still in the lantern room and
// no beam goes out. Up the iron stair from the lantern, in the windowless Roof Room under the dome, a big lever on
// the wall lights it. 5000 points the first time each night, 2500 more each time after (zmlCost); it can't be thrown
// again while the lamp burns.
// Thrown, the lamp lights and the lens turns, sweeping its one beam round the station once every ZML.TURN seconds for
// ZML.TIME seconds, and then it fades out. Whatever the beam passes over burns: every one of the drowned (and the
// crabs) anywhere on the island and on every floor of the tower, its stairs included, whose bearing from the tower's
// middle the beam crosses (within ZML.HALF of its line). Each is an ordinary kill for whoever threw the lever. A boss
// isn't burned outright: each pass takes ZML.BOSS of its strength.
// Together (src/zmnet.js): the host runs the lamp and the burning. A joined player pays for the lever from their own
// points and asks the host (a `lamp` request with what they paid); the host lights it, or gives the points back if it
// was already lit (or the price had gone up). The host sends `lp`: the times it's been thrown tonight, the seconds it
// has left to burn, and the beam's bearing, so everyone sees the same beam and the same price.
// The stair, the Roof Room and the lantern are built in src/zombies.js (the tower in FPI_GEN.light.set, the drum and
// the beam in zm3dLantern, the beam turning in zmScene3D); everything else hangs off a few marked hook lines
// (// [lamp]) in src/zombies.js and src/zmnet.js.

const ZML = { COST: 5000, STEP: 2500, TIME: 15, TURN: 3, HALF: 8 * Math.PI / 180, BOSS: 0.2, UP: 0.6, FADE: 1.4, NAME: 'the Light' };
const zmlCost = () => ZML.COST + ZML.STEP * ((ZM.lamp && ZM.lamp.uses) | 0);   // 5000, 7500, 10000, ...
const zmlAt = () => FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.lever;

// ---------- the lever (a prop: its solid and its heavy static parts; the arm, the quadrant, the plate and the
// telltale are zml3d's) ----------
// Cast-iron, on a backplate bolted to the Roof Room's wall: a brass-edged iron panel, the gearbox at its foot with
// the rod that runs down through the floor to the lamp's clockwork, and the brass plate over it all. +v is its front.
FPI_K.zmlever = {
  col: '#2a2e30', noShadow: true,
  sol(p) { return [fpiBox(p, 0, -0.02, 0.72, 0.2, 2.7)]; },
  b3(p, A) {
    const IR = '#23272a', IR2 = '#33383b', BR = '#a8823e', BR2 = '#7e602c';
    // the backplate, with a brass edge and a row of rivets round it
    A.box(IR, 0, -0.15, 0.1, 1.36, 0.06, 2.62);
    for (const [u, w, h0, hh] of [[0, 1.42, 0.07, 0.06], [0, 1.42, 2.69, 0.06]]) A.box(BR2, u, -0.11, h0, w, 0.04, hh);
    for (const s of [-1, 1]) A.box(BR2, s * 0.69, -0.11, 0.07, 0.05, 0.04, 2.68);
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) A.part('sph', BR, s * 0.62, -0.1, 0.25 + i * 0.29, 0.045, 0.045, 0.03);
    // a cast frame standing off it, for the quadrant and the arm's pivot
    for (const s of [-1, 1]) { A.box(IR2, s * 0.42, -0.06, 0.55, 0.08, 0.14, 1.35); A.box(BR, s * 0.42, 0.015, 0.55, 0.09, 0.02, 1.35); }
    A.box(IR2, 0, -0.06, 1.85, 0.92, 0.14, 0.1);
    // the gearbox at its foot, two wheels showing through its side, and the rod down through the floor
    A.box(IR, 0, -0.02, 0, 0.9, 0.3, 0.52); A.box(IR2, 0, -0.02, 0.5, 0.96, 0.34, 0.06);
    for (const s of [-1, 1]) A.part('cyl8', BR2, s * 0.22, 0.14, 0.27, 0.3, 0.04, 0.3, 0, Math.PI / 2, 0);
    A.cyl(IR, 0.3, -0.04, -0.45, 0.04, 0.5); A.cyl(BR, 0.3, -0.04, -0.06, 0.07, 0.08);
    // the chain up to the ceiling, where the old weight-drive hung
    for (let i = 0; i < 7; i++) A.part('torus', IR2, -0.5, -0.06, 2.75 + i * 0.08, 0.06, 0.06, 0.06, i % 2 ? Math.PI / 2 : 0, 0, 0);
    // the plate's mount: a brass-framed board over the lever
    A.box(IR, 0, -0.1, 2.1, 1.2, 0.05, 0.5); A.box(BR2, 0, -0.08, 2.07, 1.26, 0.03, 0.56);
  },
};
// (from FPI_GEN.light.set) the lever on the Roof Room's south wall, facing in across the room to the stair's head
function zmlPlace(put, light, W, Z, onRoof) {
  const a = -Math.PI / 2, r = ZMT.RW - 0.2, x = ZMT.X + Math.cos(a) * r, y = ZMT.Y + Math.sin(a) * r;
  onRoof('zmlever', x, y, a + Math.PI / 2, {});
  const [wx, wy] = W(x, y);
  Z.lever = { x: wx, y: wy, z: ZMT.RF, nx: -Math.cos(a), ny: -Math.sin(a) };
}

// ---------- the state ----------
// uses: thrown how many times tonight; t: seconds left to burn; ang: the beam's bearing from the tower's middle (as
// bearingOf); k: how bright it is (0 dark, 1 alight: it comes up and fades away); by: who threw it (for the kills);
// arm: the lever's arm (0 up, 1 thrown); wait: (joined) asked the host, waiting for its word
function zmlReset() { ZM.lamp = { uses: 0, t: 0, ang: 0, k: 0, by: null, arm: 0, wait: 0, humT: 0 }; }
const zmlLit = () => !!(ZM.lamp && ZM.lamp.t > 0);
// (for zmScene3D) how bright the Light is, and where its beam points
function zmlBeam() { const L = ZM.lamp; return L ? { k: L.k, ang: L.ang } : { k: 0, ang: 0 }; }

// ---------- each tick ----------
function zmlTick(dt) {
  if (!ZM.lamp) zmlReset();
  const L = ZM.lamp, TAU = Math.PI * 2, on = L.t > 0;
  if (L.wait > 0) L.wait -= dt;
  L.arm = on || L.wait > 0 ? Math.min(1, L.arm + dt / 0.3) : Math.max(0, L.arm - dt / 1.5);
  L.k = on ? Math.min(1, L.k + dt / ZML.UP) : Math.max(0, L.k - dt / ZML.FADE);
  if (L.k > 0) L.ang = (L.ang + dt * TAU / ZML.TURN) % TAU;
  if (!on) return;
  // (joined: the host says when it's out)
  if (ZM.net === 'client') L.t = Math.max(0.01, L.t - dt);
  else { L.t = Math.max(0, L.t - dt); if (L.t <= 0) { zmlOff(); return; } }
  L.humT -= dt; if (L.humT <= 0) { L.humT = 1.5; zmlSound('hum'); }
  // (joined: the host does the burning)
  if (ZM.net === 'client') return;
  const cx = FPSC.CX + ZMT.X, cy = FPSC.CY + ZMT.Y;
  for (const z of ZM.z) {
    if (z.dead || z.gone) continue;
    if (Math.abs(angDiff(bearingOf(z.x - cx, z.y - cy), L.ang)) > ZML.HALF) continue;
    if (z.boss) {
      // once a pass: a fifth of its strength (whatever its own armour makes of it, so it's always a fifth)
      if (z.lampU === L.uses && z.lampT - L.t < ZML.TURN * 0.5) continue;
      z.lampU = L.uses; z.lampT = L.t;
      const k = typeof zbHurtK === 'function' ? zbHurtK(z, 1, 'lamp') : 1;
      zmHurt(z, (z.max || 1) * ZML.BOSS / Math.max(0.05, k) / (z.mark > 0 ? 1.5 : 1), false, 'L', L.by, 'lamp');
      z.scorch = 1; z.hitT = 0.3;
      zmlFlash(z, 10);
      continue;
    }
    zmKill(z, false, 'L', 'lamp', L.by);
    zmlFlash(z, 6);
  }
}
function zmlOff() { zmlSound('off'); fpsFeed('The lamp gutters, and the Light goes dark.'); }
// a white-hot flash where the beam caught one
function zmlFlash(z, n) {
  for (let i = 0; i < n; i++) FPS.parts.push({ x: z.x + (Math.random() - 0.5) * 0.5, y: z.y + (Math.random() - 0.5) * 0.5, z: FPSC.GROUND + (z.jz || 0) + 0.3 + Math.random() * 1.5,
    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 0.5 + Math.random() * 1.5, t: 0.7, c: '255,246,214', up: true });
}
// (alone, or hosting) the lamp lit, by sid
function zmlLight(by) {
  const L = ZM.lamp;
  L.uses++; L.t = ZML.TIME; L.by = by || FPS.me.id; L.humT = 0.9; L.wait = 0;
  zmlLit0(L.by);
}
// what everyone sees and hears as it lights
function zmlLit0(by) {
  const L = ZM.lamp, who = !by || by === FPS.me.id ? 'You light' : `${(ZM.hum.find(h => h[0] === by) || [])[1] || 'Someone'} lights`;
  if (by !== FPS.me.id || ZM.net !== 'client') zmlSound('throw');
  zmlSound('light');
  ZM.banner = { text: 'The Light is lit', t: 3, col: '#ffe2a0' };
  fpsFeed(`${who} the lamp: its beam sweeps the station for ${ZML.TIME} seconds.`);
  L.arm = Math.max(L.arm, 0.01);
}

// ---------- using it ----------
// (from zmNearest) the lever, if you're in front of it and the way up has been opened
function zmlConsider(consider) {
  const P = zmlAt(); if (!P || !zmOpen('top')) return;
  consider({ k: 'lamp' }, P.x + P.nx * 0.95, P.y + P.ny * 0.95, P.z, 1.8, true);
}
function zmlPrompt(o) {
  if (o.k !== 'lamp') return null;
  const L = ZM.lamp;
  if (L.t > 0) return { text: `The lamp is lit: ${Math.ceil(L.t)} s left` };
  if (L.wait > 0) return { text: 'The lever is thrown…' };
  return { text: 'Light the Lamp', cost: zmlCost() };
}
// (from zmUse) true if it was the lever
function zmlUse(o) {
  if (o.k !== 'lamp') return false;
  const L = ZM.lamp; if (L.t > 0 || L.wait > 0) return true;
  const c = zmlCost();
  if (ZM.pts < c) { zmSound('no'); fpsFeed('Not enough points.'); return true; }
  ZM.pts -= c; ZM.spent += c;
  if (ZM.net === 'client') { zmnRequest('lamp', c); L.wait = 2.5; zmlSound('throw'); return true; }
  zmlLight(FPS.me.id);
  return true;
}

// ---------- together ----------
// (host) a joined player threw it, having paid a
function zmlRequest(sid, a) {
  const paid = clamp(a | 0, 0, 1e7), c = zmlCost();
  if (zmlLit() || paid < c) { if (paid) zmPoints(paid, true, sid); return; }
  if (paid > c) zmPoints(paid - c, true, sid);
  zmlLight(sid);
}
// (host) the lamp's state, while there's anything to say: [thrown tonight, tenths left to burn, bearing (hundredths),
// who threw it last (their place in ZM.hum)]
function zmlHostSend(z) {
  const L = ZM.lamp; if (!L || (!L.uses && !(L.t > 0))) return;
  z.lp = [L.uses, Math.round(L.t * 10), Math.round(L.ang * 100), Math.max(0, ZM.hum.findIndex(h => h[0] === L.by))];
}
// (joined) as the host has it
function zmlApply(hz) {
  if (!ZM.lamp) zmlReset();
  if (!Array.isArray(hz.lp)) return;   // (not thrown yet tonight)
  const L = ZM.lamp, a = hz.lp.map(v => +v || 0);
  const uses = clamp(a[0] | 0, 0, 999), t = clamp(a[1] / 10, 0, ZML.TIME), ang = a[2] / 100;
  const was = L.t > 0;
  if (t > 0 && !was && uses > L.uses) { L.t = t; L.ang = ang; L.humT = 0.9; L.by = (ZM.hum[clamp(a[3] | 0, 0, ZM.hum.length - 1)] || [])[0] || null; zmlLit0(L.by); }
  if (uses !== L.uses) L.wait = 0;
  L.uses = uses;
  if (t > 0) { L.t = t; L.ang += angDiff(ang, L.ang) * 0.5; }
  else if (was) { L.t = 0; zmlOff(); }
}

// ---------- sounds ----------
function zmlSound(k) {
  try {
    if (soundOff()) return;
    const P = zmlAt(), m = FPS.me, d = P ? Math.hypot(P.x - m.x, P.y - m.y) + Math.abs((m.jz || 0) - P.z) : 0, near = Math.max(0.15, 1 - d / 45);
    // the lever: iron on iron, a heavy clank and the gear-train taking up
    if (k === 'throw') {
      if (!sfxPlay('slam', { vol: 0.75 * near, rate: 0.7, vary: 0.05 })) noise('lowpass', 300, 1, 0.002, 0.5 * near, 0.35);
      tone(70, 'square', 0.002, 0.12 * near, 0.25, { to: 45 }); noise('bandpass', 1800, 6, 0.002, 0.12 * near, 0.12, { delay: 0.05 });
      for (let i = 0; i < 6; i++) noise('bandpass', 900 + i * 120, 8, 0.002, 0.07 * near, 0.06, { delay: 0.18 + i * 0.07 });
    }
    // the lamp catching: a soft roar, and a hum rising under it
    else if (k === 'light') {
      noise('bandpass', 420, 1.5, 0.25, 0.22, 1.4, { to: 900, delay: 0.25 });
      tone(55, 'sawtooth', 0.8, 0.06, 2.6, { to: 110, delay: 0.2 }); tone(110, 'sine', 0.9, 0.09, 2.8, { to: 220, delay: 0.2 }); tone(330, 'sine', 1.2, 0.03, 2.2, { to: 440, delay: 0.4 });
    }
    // burning: the hum of the lamp and the lens's clockwork
    else if (k === 'hum') { tone(110, 'sine', 0.4, 0.05, 1.5); tone(165, 'triangle', 0.4, 0.018, 1.3); noise('bandpass', 2600, 10, 0.01, 0.025, 0.08); }
    else if (k === 'off') { tone(220, 'sine', 0.05, 0.07, 1.8, { to: 70 }); noise('lowpass', 500, 1, 0.05, 0.12, 0.9, { to: 150 }); }
  } catch (e) {}
}

// ---------- in 3D ----------
// the lever's moving parts: its arm on the pivot, the toothed brass quadrant it rides in, the brass plate with the
// price engraved, and a telltale glass that glows while the lamp burns
const ZML3 = { b: null, OFF: -0.62, ON: 1.85 };
function zml3dBuild() {
  const P = zmlAt(); if (!P || typeof THREE === 'undefined') return null;
  const g = new THREE.Group(); g.position.copy(z3v(P.x - P.nx * 0.2, P.y - P.ny * 0.2, FPSC.GROUND + P.z)); g.rotation.y = Math.atan2(P.ny, P.nx) - Math.PI / 2; Z3.grp.add(g);
  // (in the group, -z is the lever's front, +y up; the backplate's face is at z = 0.12)
  const brass = z3Lam('#a8803e', { emissive: 0x140c02 }), iron = z3Lam('#2a2e31'), iron2 = z3Lam('#3a4044'), wood = z3Lam('#5a3420');
  // the quadrant: a toothed brass arc on a dark iron web, its notches marked OFF and LIT
  // (the arm swings across the wall's face, from up on the left to out and down on the right, as you face it: from
  // ZML3.OFF to ZML3.ON about z; the group's +x is on your left)
  const PY = 1.2, PZ = -0.25, F0 = Math.min(ZML3.ON, ZML3.OFF) + Math.PI / 2 - 0.08, FL = Math.abs(ZML3.OFF - ZML3.ON) + 0.16;
  { const q = new THREE.Group(); q.position.set(0, PY, PZ + 0.035); g.add(q);
    const web = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.5, 24, 1, F0, FL), z3Lam('#3a4044', { side: THREE.DoubleSide })); q.add(web);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.03, 5, 28, FL), brass); arc.rotation.z = F0; q.add(arc);
    const arc2 = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 4, 16, FL), brass); arc2.rotation.z = F0; q.add(arc2);
    for (let i = 0; i <= 12; i++) { const a = F0 + i / 12 * FL, t = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.04), brass); t.position.set(Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0); t.rotation.z = a; q.add(t); }
    // (the stops, at each end)
    for (const a of [F0 + 0.04, F0 + FL - 0.04]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.07), iron); t.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, -0.01); t.rotation.z = a; q.add(t); }
  }
  // the arm: an iron bar from the pivot boss, a spring catch on it, a turned wooden grip at its end
  const arm = new THREE.Group(); arm.position.set(0, PY, PZ - 0.04); g.add(arm);
  { const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 14), brass); boss.rotation.x = Math.PI / 2; arm.add(boss);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), iron); cap.position.z = -0.09; arm.add(cap);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), iron); axle.rotation.x = Math.PI / 2; axle.position.z = 0.12; arm.add(axle);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.86, 0.05), iron); bar.position.y = 0.43; arm.add(bar);
    const catchR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03), brass); catchR.position.set(0.05, 0.45, -0.02); arm.add(catchR);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 10), wood); grip.position.y = 0.97; arm.add(grip);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), brass); knob.position.y = 1.1; arm.add(knob);
    const ferr = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), brass); ferr.position.y = 0.86; arm.add(ferr);
  }
  // the telltale: a bull's-eye of red glass in a brass ring, dark until the lamp burns
  const tellM = new THREE.MeshBasicMaterial({ color: 0x401810 });
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.02, 6, 16), brass); ring.position.set(0.52, 1.72, -0.12); g.add(ring);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), tellM); eye.scale.z = 0.5; eye.position.set(0.52, 1.72, -0.12); g.add(eye); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,200,120,0.9)', 'rgba(255,160,80,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.scale.setScalar(0.5); glow.position.set(0.52, 1.72, -0.2); g.add(glow);
  // the plate: brass, its words engraved and blacked
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.41), new THREE.MeshBasicMaterial({ map: tex, color: 0xa89c86 }));
  plate.position.set(0, 2.355, -0.14); plate.rotation.y = Math.PI; g.add(plate);
  return { g, arm, tellM, glow, cv, tex, said: '' };
}
function zmlDrawPlate(B, lit, cost) {
  const key = lit ? 'lit' : String(cost); if (B.said === key) return; B.said = key;
  const x = B.cv.getContext('2d'), W = 512, H = 192;
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d8b060'); gr.addColorStop(0.5, '#b88a38'); gr.addColorStop(1, '#8a6424');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(60,36,10,0.85)'; x.lineWidth = 5; x.strokeRect(12, 12, W - 24, H - 24); x.lineWidth = 2; x.strokeRect(22, 22, W - 44, H - 44);
  x.fillStyle = 'rgba(70,44,14,0.9)'; for (const [u, v] of [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]]) { x.beginPath(); x.arc(u, v, 6, 0, 6.283); x.fill(); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#2a1a08';
  x.font = '54px "IM Fell English SC", Georgia, serif'; x.fillText('LIGHT THE LAMP', W / 2, 74);
  x.font = '40px "IM Fell English SC", Georgia, serif'; x.fillText(lit ? '— THE LAMP IS LIT —' : `${cost.toLocaleString('en')} points`, W / 2, 136);
  B.tex.needsUpdate = true;
}
// (from zmScene3D) each frame
function zml3d(dt) {
  if (!ZML3.b || ZML3.b.g.parent !== Z3.grp) ZML3.b = zml3dBuild();
  const B = ZML3.b; if (!B || !ZM.lamp) return;
  const L = ZM.lamp, m = FPS.me, near = Math.hypot(B.g.position.x - m.x, -B.g.position.z - m.y) < 40;
  B.g.visible = near; if (!near) return;
  // (up on the left; thrown across and down to the right, with a little kick as it goes)
  const k = L.arm, e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
  B.arm.rotation.z = ZML3.OFF + (ZML3.ON - ZML3.OFF) * e + (k >= 1 || k <= 0 ? 0 : Math.sin(e * Math.PI) * 0.05);
  const lit = L.t > 0;
  const f = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(g.t * 9);
  B.tellM.color.setRGB(0.25 + 0.75 * L.k * f, 0.1 + 0.5 * L.k * f, 0.06 + 0.2 * L.k * f);
  B.glow.material.opacity = 0.8 * L.k * f;
  zmlDrawPlate(B, lit, zmlCost());
}
