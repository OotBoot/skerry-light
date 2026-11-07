// Wreckers' Night: your pepperbox pistol, in 3D, held out in the middle of the view.
//
// A six-barrel pepperbox: an iron frame with brass bands, a bird's-head walnut grip with a brass
// cap, a bar hammer, a trigger in its guard, six barrels round a fluted core with copper caps on
// their nipples, and the hand that holds it (in your skin's coat colour). The barrels turn one
// place for every shot, the hammer drops and is thumbed back, and the gun kicks.
//
// Reloading swaps the whole barrel cluster: the gun tips up and over, the catch is thumbed, the
// spent cluster slides off and drops away, your other hand brings a loaded one up and slides it
// home with a click, and the hammer is cocked as the gun comes back to aim.
//
// It's drawn by its own small WebGL renderer and copied onto the main canvas between the world
// and the HUD, so it always sits over everything in the scene. Without WebGL the old flat
// drawing is used instead.

// the resting pose: a little right of centre and canted, so you see the barrels' length and the lock
const VM = { px: 0.035, py: -0.14, pz: -0.28, rx: 0.13, ry: 0.1, rz: -0.08, tried: false, ok: false, sway: [0, 0], turn: 0, turnTo: 0, shots: 0, hammer: 0, lastP: 1, smoke: [], flashT: 0, w: 0, h: 0, skin: '' };

function vmInit() {
  if (VM.tried) return VM.ok;
  VM.tried = true;
  if (typeof THREE === 'undefined') return false;
  try {
    VM.canvas = document.createElement('canvas');
    VM.r = new THREE.WebGLRenderer({ canvas: VM.canvas, alpha: true, antialias: true, premultipliedAlpha: true });
    VM.r.setClearColor(0x000000, 0);
  } catch (e) { return false; }
  const scene = VM.scene = new THREE.Scene();
  VM.cam = new THREE.PerspectiveCamera(48, 1, 0.01, 10);
  // light: the night, a little moon from above, your lantern low on the left, and the muzzle flash
  VM.amb = new THREE.AmbientLight(0x8a94b0, 0.45); scene.add(VM.amb);
  VM.moon = new THREE.DirectionalLight(0xc8d4ff, 0.45); VM.moon.position.set(0.4, 1, 0.3); scene.add(VM.moon);
  VM.lamp = new THREE.PointLight(0xffb060, 1, 3, 1); VM.lamp.position.set(-0.5, -0.1, 0.1); scene.add(VM.lamp);
  VM.beam = new THREE.DirectionalLight(0xffe2a8, 0); VM.beam.position.set(-0.2, 0.6, -1); scene.add(VM.beam);
  VM.flashL = new THREE.PointLight(0xffd080, 0, 1.6, 2); scene.add(VM.flashL);
  vmBuild();
  VM.ok = true;
  return true;
}

// ---------- the model ----------
function vmMats() {
  const skin = fpsSkin();
  const sleeve = String(skin.hull).length === 7 ? skin.hull : '#3a2a1e', cuff = String(skin.rail).length === 7 ? skin.rail : '#7a5a3a';
  return {
    iron: new THREE.MeshPhongMaterial({ color: 0x3a3c42, specular: 0x8a8c96, shininess: 70 }),
    dark: new THREE.MeshPhongMaterial({ color: 0x1c1d22, specular: 0x50525a, shininess: 50 }),
    bore: new THREE.MeshBasicMaterial({ color: 0x050506 }),
    brass: new THREE.MeshPhongMaterial({ color: 0x8a6a2c, specular: 0xb09060, shininess: 60 }),
    copper: new THREE.MeshPhongMaterial({ color: 0xa8542c, specular: 0xffb080, shininess: 60 }),
    wood: new THREE.MeshPhongMaterial({ color: 0x5a3620, specular: 0x3a2414, shininess: 25 }),
    flesh: new THREE.MeshLambertMaterial({ color: 0x9a7058 }),
    sleeve: new THREE.MeshLambertMaterial({ color: sleeve }),
    cuff: new THREE.MeshLambertMaterial({ color: cuff }),
  };
}
// six barrels round a fluted core, bores at the front, caps at the back (z: muzzle is at -L)
function vmCluster(M) {
  const g = new THREE.Group(), L = 0.2;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 18), M.iron);
  core.rotation.x = Math.PI / 2; core.position.z = -L / 2; g.add(core);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, x = Math.cos(a) * 0.026, y = Math.sin(a) * 0.026;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, L, 14), [M.iron, M.iron, M.bore]);
    b.rotation.x = Math.PI / 2; b.position.set(x, y, -L / 2); g.add(b);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0022, 6, 14), M.iron); ring.position.set(x, y, -L); g.add(ring);
    // the nipple and its copper cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.0055, 0.012, 8), M.copper);
    cap.rotation.x = Math.PI / 2; cap.position.set(x * 0.8, y * 0.8, 0.008); g.add(cap);
  }
  // a brass band near the muzzle and one at the breech
  for (const z of [-0.035, -0.17]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0405, 0.0405, 0.008, 24), M.brass); band.rotation.x = Math.PI / 2; band.position.z = z; g.add(band); }
  return g;
}
function vmHand(M, left) {
  const h = new THREE.Group();
  // the forearm runs from the wrist down, back and out to the side, off the bottom of the screen
  const dir = new THREE.Vector3(left ? -0.4 : 0.4, -0.88, 0.25).normalize(), up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.4, 14), M.sleeve);
  sleeve.quaternion.copy(q); sleeve.position.copy(dir.clone().multiplyScalar(0.25)); h.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 14), M.cuff);
  cuff.quaternion.copy(q); cuff.position.copy(dir.clone().multiplyScalar(0.05)); h.add(cuff);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), M.flesh);
  palm.scale.set(0.85, 1, 1.15); palm.position.set(0, 0.0, 0.0); h.add(palm);
  // four fingers curled round (or under), and the thumb
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), M.flesh);
    f.rotation.z = Math.PI / 2; f.position.set((left ? 1 : -1) * 0.01, -0.015 - i * 0.022 + 0.03, -0.04); h.add(f);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.045, 4, 8), M.flesh);
  thumb.rotation.x = -1.35; thumb.position.set((left ? -1 : 1) * 0.024, 0.04, -0.02); h.add(thumb);
  h.userData.thumb = thumb;
  return h;
}
function vmBuild() {
  const M = VM.M = vmMats();
  const gun = VM.gun = new THREE.Group();     // origin: where the hand grips
  const body = VM.body = new THREE.Group(); gun.add(body);
  // the frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.11), M.iron); frame.position.set(0, 0.035, -0.02); body.add(frame);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.11), M.dark); top.position.set(0, 0.066, -0.02); body.add(top);
  { const b = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.059, 0.008), M.brass); b.position.set(0, 0.035, -0.075); body.add(b); }
  // the arbor the barrels turn on, and the barrels
  VM.clusterMount = new THREE.Group(); VM.clusterMount.position.set(0, 0.035, -0.078); body.add(VM.clusterMount);
  VM.cluster = vmCluster(M); VM.clusterMount.add(VM.cluster);
  // the bar hammer, pivoting at the back of the frame
  VM.hammerPivot = new THREE.Group(); VM.hammerPivot.position.set(0, 0.07, 0.03); body.add(VM.hammerPivot);
  const ham = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.09), M.dark); ham.position.set(0, 0.004, -0.045); VM.hammerPivot.add(ham);
  const spur = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.02), M.dark); spur.position.set(0, 0.008, 0.005); spur.rotation.x = -0.4; VM.hammerPivot.add(spur);
  // trigger and guard
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.008, -0.02); body.add(guard);
  VM.trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.026, 0.008), M.dark); VM.trigger.position.set(0, 0.0, -0.02); body.add(VM.trigger);
  // the bird's-head grip, curving down and back
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(0.012, -0.05, 0.002, -0.1); s.quadraticCurveTo(0.02, -0.125, 0.05, -0.11);
  s.quadraticCurveTo(0.06, -0.06, 0.06, 0.0); s.lineTo(0, 0);
  const grip = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.034, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 10 }), M.wood);
  grip.rotation.y = -Math.PI / 2; grip.position.set(-0.017 + 0.034, 0.02, 0.015); body.add(grip);
  const capB = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M.brass); capB.scale.set(1.2, 0.7, 1.4); capB.position.set(0, -0.098, 0.05); body.add(capB);
  // the hand
  VM.hand = vmHand(M, false); VM.hand.position.set(0.012, -0.045, 0.04); gun.add(VM.hand);
  VM.scene.add(gun);
  // the left hand and the loaded cluster it brings up on a reload, and the spent one falling away
  VM.lhand = vmHand(M, true); VM.lhand.visible = false; VM.scene.add(VM.lhand);
  VM.fresh = vmCluster(M); VM.fresh.visible = false; VM.scene.add(VM.fresh);
  VM.spent = vmCluster(M); VM.spent.visible = false; VM.scene.add(VM.spent);
  // the flash at the muzzle: two crossed soft cards
  const fc = document.createElement('canvas'); fc.width = fc.height = 64;
  const q = fc.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.25, 'rgba(255,200,100,0.9)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
  const ft = new THREE.CanvasTexture(fc);
  VM.flash = new THREE.Group();
  for (const r of [0, Math.PI / 2]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ map: ft, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); p.rotation.z = r; p.rotation.y = Math.PI / 2; VM.flash.add(p); }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ map: ft, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  VM.flash.add(front);
  VM.flash.visible = false; VM.scene.add(VM.flash);
  // a few puffs of smoke after each shot
  VM.smokeMat = new THREE.MeshBasicMaterial({ map: ft, color: 0x9a9a9a, transparent: true, depthWrite: false, opacity: 0 });
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), VM.smokeMat.clone()); m.visible = false; VM.scene.add(m); VM.smoke.push({ m, t: 0 }); }
  VM.skin = JSON.stringify(fpsColours());
}

// ---------- each frame ----------
const vmSeg = (p, a, b) => { const t = Math.max(0, Math.min(1, (p - a) / (b - a))); return t * t * (3 - 2 * t); };
function vmClick(f, v) { try { tone(f, 'square', 0.001, v || 0.05, 0.03); } catch (e) {} }
function vmDraw(dt) {
  const m = FPS.me;
  if (m.dead > 0) return true;
  if (!vmInit()) return false;
  // a different skin since last time: dress the sleeves again
  const sk = JSON.stringify(fpsColours());
  if (sk !== VM.skin) { VM.skin = sk; const c = fpsColours(); for (const h of [VM.hand, VM.lhand]) h.traverse(o => { if (o.material === VM.M.sleeve) o.material.color.set(c[0]); }); }
  // size the gun's canvas to the screen
  const pr = Math.min(dpr, 1.5);
  if (VM.w !== W || VM.h !== H || VM.pr !== pr) { VM.w = W; VM.h = H; VM.pr = pr; VM.r.setPixelRatio(pr); VM.r.setSize(W, H, false); VM.cam.aspect = W / H; VM.cam.updateProjectionMatrix(); }
  // portrait phones: the gun drawn a touch smaller so it doesn't fill the screen
  const narrow = W < H, sc = narrow ? 0.78 : 1;
  const t = g.t, still = reduceMotion;
  // sway: the gun lags behind your turns, bobs as you walk, breathes when you stand
  VM.sway[0] += ((FPS.lastLook ? -FPS.lastLook[0] : 0) * 0.0009 - VM.sway[0]) * Math.min(1, dt * 8);
  VM.sway[1] += ((FPS.lastLook ? FPS.lastLook[1] : 0) * 0.0009 - VM.sway[1]) * Math.min(1, dt * 8);
  const walk = m.walk ? 1 : 0, bobX = still ? 0 : Math.sin(FPS.step * 0.5) * 0.012 * walk, bobY = still ? 0 : (Math.abs(Math.cos(FPS.step * 0.5)) * 0.01 * walk + Math.sin(t * 1.6) * 0.002);
  // the barrels: one place round for every shot fired
  if (FPS.vmShots !== undefined && FPS.vmShots !== VM.shots) { VM.turnTo += Math.PI / 3 * (FPS.vmShots - VM.shots); VM.shots = FPS.vmShots; VM.hammer = 0; VM.flashT = 0.06; vmPuff(); }
  VM.turn += (VM.turnTo - VM.turn) * Math.min(1, dt * 18);
  VM.cluster.rotation.z = VM.turn;
  // the hammer falls with the shot and the thumb brings it back
  VM.hammer = Math.min(1, VM.hammer + dt * 6);
  // the reload
  const R = FPSC.RELOAD, p = m.reload > 0 ? 1 - m.reload / R : 1;
  const tip = vmSeg(p, 0, 0.16) - vmSeg(p, 0.86, 1);
  const off = vmSeg(p, 0.16, 0.28);               // the spent cluster slides forward off the arbor
  const fall = p >= 0.28 && p < 0.62 ? (p - 0.28) / 0.34 : -1;
  const reach = vmSeg(p, 0.36, 0.58) - vmSeg(p, 0.76, 0.9);   // the other hand comes up, then goes
  const seat = vmSeg(p, 0.58, 0.74);              // sliding the loaded one home
  const cock = m.reload > 0 ? vmSeg(p, 0.8, 0.9) : 1;
  // sounds as each step happens
  if (m.reload > 0) {
    const crossed = x => VM.lastP < x && p >= x;
    if (crossed(0.16)) vmClick(520, 0.04);
    if (crossed(0.42)) { try { noise('bandpass', 1800, 2, 0.002, 0.08, 0.12); } catch (e) {} }
    if (crossed(0.74)) vmClick(700, 0.07);
    if (crossed(0.88)) { vmClick(900, 0.05); vmClick(600, 0.04); }
    if (p < VM.lastP - 0.5) VM.turnTo = VM.turn = 0;   // a fresh cluster starts on its first barrel
  }
  VM.lastP = m.reload > 0 ? p : 1;
  // where the gun sits: low in the middle, pointing straight out, and kicking up with each shot
  const rec = FPS.recoil;
  const gun = VM.gun;
  // (the barrels run straight out, so they point at the crosshair; a little to the right of centre,
  // so you see along the top and down the left side of the gun)
  gun.position.set((VM.px + bobX + VM.sway[0] - tip * 0.05) * sc, (VM.py - bobY - VM.sway[1] + tip * 0.03 - rec * 0.01) * sc, (VM.pz - tip * 0.06 + rec * 0.04) * (narrow ? 1.12 : 1));
  gun.rotation.set(VM.rx + rec * 0.3 + tip * 0.35, VM.ry + VM.sway[0] * 1.5 - tip * 0.15, VM.rz + tip * 0.65);
  gun.scale.setScalar(sc);
  VM.hammerPivot.rotation.x = (m.reload > 0 ? cock : VM.hammer) * -0.55;
  VM.hand.userData.thumb.rotation.x = -1.35 + (m.reload > 0 ? (1 - cock) * 0.5 : (1 - VM.hammer) * 0.35);
  VM.trigger.rotation.x = FPS.mouseDown || FPS.touchFire ? 0.35 : 0;
  // during a reload the gun's own cluster is off; the spent one falls and the fresh one comes in
  const swapping = m.reload > 0 && p >= 0.16 && p < 0.74;
  VM.cluster.visible = !swapping;
  VM.cluster.position.z = m.reload > 0 && p < 0.28 ? -off * 0.09 : 0;
  gun.updateMatrixWorld(true);
  const mountW = new THREE.Vector3(), mountQ = new THREE.Quaternion();
  VM.clusterMount.getWorldPosition(mountW); VM.clusterMount.getWorldQuaternion(mountQ);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(mountQ);
  VM.spent.visible = swapping && fall < 1;
  if (VM.spent.visible) {
    const f = Math.max(0, fall);
    VM.spent.position.copy(mountW).addScaledVector(fwd, 0.09 * (p < 0.28 ? off : 1) + f * 0.05);
    VM.spent.position.y -= f * f * 0.7; VM.spent.position.x += f * 0.08;
    VM.spent.quaternion.copy(mountQ); VM.spent.rotateX(f * 2.5); VM.spent.rotateZ(VM.turn + f * 3);
  }
  VM.lhand.visible = VM.fresh.visible = m.reload > 0 && reach > 0.001;
  if (VM.lhand.visible) {
    // in from below left, lining up in front of the arbor, then pushing it home
    const ahead = 0.11 * (1 - seat);
    const target = mountW.clone().addScaledVector(fwd, ahead);
    const from = new THREE.Vector3(-0.35 * sc, -0.45 * sc, -0.3);
    const at = from.lerp(target, p < 0.76 ? reach : 1);
    if (p >= 0.74) at.copy(mountW).add(new THREE.Vector3(-0.35 * sc, -0.45 * sc, -0.3).sub(mountW).multiplyScalar(1 - reach));
    VM.fresh.position.copy(at); VM.fresh.quaternion.copy(mountQ);
    VM.fresh.visible = p < 0.74;
    VM.lhand.position.copy(at).add(new THREE.Vector3(-0.02, -0.05, 0.02).applyQuaternion(mountQ));
    VM.lhand.quaternion.copy(mountQ); VM.lhand.rotateZ(-0.6); VM.lhand.rotateX(0.4);
  }
  // the flash and the smoke, from the barrel at the top
  const muzzle = mountW.clone().addScaledVector(fwd, 0.21).add(new THREE.Vector3(0, 0.026 * sc, 0).applyQuaternion(mountQ));
  VM.flashT -= dt;
  VM.flash.visible = VM.flashT > 0 && !still;
  if (VM.flash.visible) { VM.flash.position.copy(muzzle); VM.flash.quaternion.copy(mountQ); VM.flash.rotateZ(Math.random() * 3); VM.flash.scale.setScalar(0.8 + Math.random() * 0.5); }
  VM.flashL.position.copy(muzzle); VM.flashL.intensity = VM.flashT > 0 ? 3 * flashK() : 0;
  for (const s of VM.smoke) {
    if (s.t <= 0) { s.m.visible = false; continue; }
    s.t -= dt; s.m.visible = true;
    s.m.position.addScaledVector(s.v, dt); s.v.y += dt * 0.05;
    const k = s.t / s.T; s.m.material.opacity = 0.35 * k; s.m.scale.setScalar(1 + (1 - k) * 2.5);
    s.m.lookAt(VM.cam.position);
  }
  VM.muzzle = muzzle;
  // lit by your lantern when it burns, and warm when the beam is on you
  VM.lamp.intensity = m.lan ? 0.9 + (still ? 0 : 0.08 * Math.sin(t * 13)) : 0.05;
  VM.beam.intensity = litAt(m.x, m.y) > 0 ? 0.9 : 0;
  VM.amb.intensity = 0.35 + Math.min(0.4, flareAt(m.x, m.y) * 0.4);
  VM.r.render(VM.scene, VM.cam);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(VM.canvas, 0, 0, cv.width, cv.height);
  ctx.restore();
  return true;
}
function vmPuff() {
  if (!VM.muzzle) return;
  let n = 0;
  for (const s of VM.smoke) {
    if (s.t > 0) continue;
    s.T = s.t = 0.8 + Math.random() * 0.5; s.m.position.copy(VM.muzzle);
    s.v = new THREE.Vector3((Math.random() - 0.5) * 0.06, 0.03 + Math.random() * 0.04, -0.05 - Math.random() * 0.08);
    if (++n >= 3) break;
  }
}
